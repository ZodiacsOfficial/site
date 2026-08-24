#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { computeBodies } from '../src/lib/engine/full';
import { findInterAspects, type InterAspect, type MinimalBody } from '../src/lib/engine/synastry';
import { BODY_ROLE } from '../src/lib/compat';
import type { SavedChart } from '../src/lib/profile/schema';
import { signDigestUnsubscribe } from '../src/lib/server/digest-unsubscribe';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailDocument,
  type EmailSection,
} from '../src/lib/email/template';
import { SIGNS } from '../src/lib/signs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DIGEST_ORB = 3;
const DEFAULT_LIMIT = 200;
const DEFAULT_CHARTS_PER_USER = 5;
const SEND_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const TRANSIT_BODIES = new Set(['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

interface CliOptions {
  dryRun: boolean;
  fixture: boolean;
  limit: number | null;
  to: string | null;
  weekStart: Date | null;
}

interface ProfileRow {
  user_id: string;
}

interface ChartRow {
  user_id: string;
  payload: unknown;
  updated_at: string | null;
}

interface RecipientDigest {
  userId: string;
  email: string;
  charts: SavedChart[];
}

interface DigestTransit {
  date: Date;
  aspect: InterAspect;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    fixture: false,
    limit: null,
    to: null,
    weekStart: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--fixture') options.fixture = true;
    else if (arg === '--limit') options.limit = positiveInt(argv[++i], '--limit');
    else if (arg === '--to') options.to = requiredValue(argv[++i], '--to');
    else if (arg === '--week-start') options.weekStart = parseDate(requiredValue(argv[++i], '--week-start'));
    else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function requiredValue(value: string | undefined, flag: string): string {
  if (!value) throw new Error(`${flag} needs a value`);
  return value;
}

function positiveInt(value: string | undefined, flag: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${flag} needs a positive integer`);
  return n;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('--week-start must be YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('--week-start must be a real date');
  return date;
}

function mondayFor(date: Date): Date {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthDay(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

function rangeLabel(start: Date): string {
  const end = addDays(start, 6);
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${MONTHS[start.getUTCMonth()]} ${start.getUTCDate()}-${end.getUTCDate()}`;
  }
  return `${monthDay(start)}-${monthDay(end)}`;
}

function isSavedChart(value: unknown): value is SavedChart {
  const chart = value as SavedChart;
  return Boolean(
    chart &&
    typeof chart === 'object' &&
    typeof chart.id === 'string' &&
    typeof chart.name === 'string' &&
    chart.summary &&
    Array.isArray(chart.summary.bodies),
  );
}

function chartBodies(chart: SavedChart): MinimalBody[] {
  return chart.summary.bodies
    .filter((body) => typeof body.body === 'string' && typeof body.lon === 'number')
    .map((body) => ({ body: body.body, lon: body.lon }));
}

function transitBodies(date: Date): MinimalBody[] {
  return computeBodies(date)
    .filter((body) => TRANSIT_BODIES.has(body.body))
    .map((body) => ({ body: body.body, lon: body.lon }));
}

function topTransits(chart: SavedChart, weekStart: Date): DigestTransit[] {
  const natal = chartBodies(chart);
  const best = new Map<string, DigestTransit>();

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(weekStart, offset);
    const aspects = findInterAspects(transitBodies(date), natal);
    for (const aspect of aspects) {
      if (aspect.orb > DIGEST_ORB) continue;
      const key = `${aspect.a}:${aspect.type}:${aspect.b}`;
      const current = best.get(key);
      if (!current || aspect.orb < current.aspect.orb) best.set(key, { date, aspect });
    }
  }

  return [...best.values()]
    .sort((a, b) => a.aspect.orb - b.aspect.orb || a.date.getTime() - b.date.getTime())
    .slice(0, 3);
}

function transitSentence(hit: DigestTransit): string {
  const { aspect } = hit;
  const role = BODY_ROLE[aspect.b] ?? aspect.b.toLowerCase();
  const phrase: Record<string, string> = {
    conjunction: 'puts focus on',
    sextile: 'opens a workable door for',
    square: 'presses on',
    trine: 'backs up',
    opposition: 'pulls against',
  };
  const verb = phrase[aspect.type] ?? 'meets';
  return `${monthDay(hit.date)}: ${aspect.a} ${verb} your ${role}.`;
}

function receiptLine(hit: DigestTransit): string {
  const { aspect } = hit;
  return `Receipt: transiting ${aspect.a} ${aspect.type} natal ${aspect.b}, ${aspect.orb.toFixed(1)} deg orb.`;
}

function baseUrl(): string {
  return (process.env.DIGEST_BASE_URL || 'https://zodiacs.org').replace(/\/+$/, '');
}

function unsubscribeUrl(userId: string, secret: string): string {
  const sig = signDigestUnsubscribe(userId, secret);
  return `${baseUrl()}/api/unsubscribe?u=${encodeURIComponent(userId)}&sig=${encodeURIComponent(sig)}`;
}

/** The Sun's sign in a saved chart — sets the accent hue and header disc. */
function chartSunSign(chart: SavedChart): string | undefined {
  const sun = chart.summary.bodies.find((body) => body.body === 'Sun');
  if (!sun || typeof sun.lon !== 'number') return undefined;
  const index = Math.floor(((sun.lon % 360) + 360) % 360 / 30);
  return SIGNS[index]?.slug;
}

function renderDigest(
  recipient: RecipientDigest,
  weekStart: Date,
  secret: string,
  maxCharts: number,
  postalAddress: string,
): { subject: string; text: string; html: string; unsubscribe: string } {
  const label = rangeLabel(weekStart);
  const charts = recipient.charts.slice(0, maxCharts);
  const unsubscribe = unsubscribeUrl(recipient.userId, secret);

  const sections: EmailSection[] = charts.map((chart) => {
    const hits = topTransits(chart, weekStart);
    return {
      heading: chart.name,
      rows: hits.map((hit) => ({
        label: monthDay(hit.date),
        body: transitSentence(hit).replace(`${monthDay(hit.date)}: `, ''),
        receipt: receiptLine(hit).replace(/^Receipt: /, ''),
      })),
      empty: `Nothing within ${DIGEST_ORB}° of exact this week — a quiet one for this chart.`,
    };
  });

  if (recipient.charts.length > maxCharts) {
    sections.push({
      paragraphs: [`Showing ${maxCharts} of ${recipient.charts.length} saved charts this week.`],
    });
  }

  const doc: EmailDocument = {
    preheader: `Your saved charts, ${label} — the closest transits, with orbs.`,
    eyebrow: `Weekly digest · ${label}`,
    title: `Your sky, ${label}`,
    sign: charts[0] ? chartSunSign(charts[0]) : undefined,
    identity: charts.length === 1
      ? charts[0].name
      : `${charts.length} saved charts`,
    intro: 'The closest aspects to your saved charts this week, with the orb each one is measured at.',
    sections,
    cta: { label: 'Read all transits', url: `${baseUrl()}/transits/` },
    footerLines: [
      'You receive this because you asked for a Monday digest of your saved charts.',
      postalAddress,
    ],
    unsubscribeUrl: unsubscribe,
  };

  return {
    subject: `Your sky, ${label}`,
    text: renderEmailText(doc),
    html: renderEmailHtml(doc, baseUrl()),
    unsubscribe,
  };
}

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  text: string,
  html: string,
  unsubscribe: string,
): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM_EMAIL || 'Zodiacs.org <hello@zodiacs.org>',
      to: [to],
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${unsubscribe}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed with ${response.status}: ${body}`);
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[email hidden]';
  return `${local.slice(0, 2)}***@${domain}`;
}

async function loadRecipients(limit: number): Promise<RecipientDigest[]> {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required without --fixture.');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error: profileError, count } = await supabase
    .from('profiles')
    .select('user_id', { count: 'exact' })
    .eq('digest_opt_in', true)
    .limit(limit);
  if (profileError) throw profileError;

  const userIds = ((profiles ?? []) as ProfileRow[]).map((profile) => profile.user_id);
  if (count && count > limit) {
    console.log(`weekly-digest: capped ${count} opted-in users to ${limit} for this run`);
  }
  if (userIds.length === 0) return [];

  const { data: charts, error: chartsError } = await supabase
    .from('charts')
    .select('user_id,payload,updated_at')
    .in('user_id', userIds)
    .order('updated_at', { ascending: false });
  if (chartsError) throw chartsError;

  const chartsByUser = new Map<string, SavedChart[]>();
  for (const row of (charts ?? []) as ChartRow[]) {
    if (!isSavedChart(row.payload)) continue;
    const list = chartsByUser.get(row.user_id) ?? [];
    list.push(row.payload);
    chartsByUser.set(row.user_id, list);
  }

  const recipients: RecipientDigest[] = [];
  for (const userId of userIds) {
    const userResult = await supabase.auth.admin.getUserById(userId);
    if (userResult.error) throw userResult.error;
    const email = userResult.data.user?.email;
    const userCharts = chartsByUser.get(userId) ?? [];
    if (!email || userCharts.length === 0) continue;
    recipients.push({ userId, email, charts: userCharts });
  }

  return recipients;
}

function fixtureRecipient(): RecipientDigest {
  const bodies = computeBodies(new Date('1990-07-13T12:00:00.000Z')).map((body) => ({
    body: body.body,
    lon: body.lon,
    retrograde: body.retrograde,
  }));

  return {
    userId: '00000000-0000-4000-8000-000000000000',
    email: 'fixture@example.com',
    charts: [{
      id: 'fixture-chart',
      name: 'Fixture chart',
      createdAt: '2026-07-07T00:00:00.000Z',
      updatedAt: '2026-07-07T00:00:00.000Z',
      birth: {
        date: '1990-07-13',
        time: '12:00',
        timeKnown: true,
        place: null,
      },
      summary: {
        engineVersion: '1.0.0',
        utcISO: '1990-07-13T12:00:00.000Z',
        houseSystem: 'whole',
        bodies,
        angles: null,
        flags: [],
      },
    }],
  };
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const maxSends = envInt('DIGEST_MAX_SENDS', DEFAULT_LIMIT);
  const limit = Math.min(options.limit ?? maxSends, maxSends);
  const maxCharts = envInt('DIGEST_MAX_CHARTS_PER_USER', DEFAULT_CHARTS_PER_USER);
  const weekStart = options.weekStart ?? mondayFor(new Date());
  const secret = process.env.DIGEST_UNSUBSCRIBE_SECRET || (options.dryRun ? 'dry-run-secret' : '');
  if (!secret) throw new Error('DIGEST_UNSUBSCRIBE_SECRET is required when sending.');

  const resendKey = process.env.RESEND_API_KEY;
  if (!options.dryRun && !resendKey) throw new Error('RESEND_API_KEY is required when sending.');

  // Same posture as the daily pipeline: a live commercial send carries the
  // sender's physical postal address or does not go out at all.
  const postalAddress = process.env.DAILY_EMAIL_POSTAL_ADDRESS
    || (options.dryRun ? 'Zodiacs.org · Test-send postal address' : '');
  if (!postalAddress) throw new Error('DAILY_EMAIL_POSTAL_ADDRESS is required when sending.');

  const recipients = options.fixture ? [fixtureRecipient()] : await loadRecipients(limit);
  console.log(`weekly-digest: ${recipients.length} recipient(s), week ${rangeLabel(weekStart)}, dryRun=${options.dryRun}`);

  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    const rendered = renderDigest(recipient, weekStart, secret, maxCharts, postalAddress);
    const to = options.to ?? recipient.email;

    if (options.dryRun) {
      console.log(`\n--- ${maskEmail(to)} | ${rendered.subject} ---\n${rendered.text}\n`);
      continue;
    }

    // One bad address or a Resend 429 must not sink the rest of the batch.
    try {
      await sendEmail(resendKey!, to, rendered.subject, rendered.text, rendered.html, rendered.unsubscribe);
      sent += 1;
      console.log(`weekly-digest: sent ${sent}/${recipients.length} to ${maskEmail(to)}`);
    } catch (error) {
      failed += 1;
      console.error(`weekly-digest: failed for ${maskEmail(to)}: ${error instanceof Error ? error.message : error}`);
    }
    await sleep(SEND_INTERVAL_MS); // gentle pace for Resend's rate limit
  }

  console.log(`weekly-digest: done, sent=${sent}, failed=${failed}, dryRun=${options.dryRun}`);
  if (failed > 0) throw new Error(`weekly-digest: ${failed} of ${recipients.length} send(s) failed`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
