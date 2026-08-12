import type { AssistantChartContext } from './chart.js';
import {
  MAX_FOLLOW_UPS,
  MAX_MESSAGE_CHARS,
  MAX_RECEIPTS,
  type AssistantFollowUp,
  type AssistantGuideMeta,
  type AssistantReceipt,
  type AssistantResult,
  type FollowUpRequirement,
  type ReleasedLocale,
} from './contracts.js';
import type { RetrievedKnowledge } from './retrieval.js';
import { defaultFollowUps } from './safety.js';

const REQUIREMENTS = new Set<FollowUpRequirement>(['none', 'chart', 'houses', 'transits']);
const ROUTE_RE = /\/(?!\/)[a-z0-9][a-z0-9/_-]*\//gi;
// Model prose never creates links. Absolute URLs, bare domains, and active
// URI schemes are rejected; only server-validated receipt metadata can
// become a link in the browser.
const URL_LIKE_RE = /(?:\b[a-z][a-z0-9+.-]*:\/\/|\b(?:mailto|tel|data|javascript):|\bwww\.|\b(?:[a-z0-9](?:[a-z0-9-]{0,62}\.)+)[a-z]{2,63}(?:[/:?#][^\s<>"']*)?)/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown, maxItems = 8): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const output: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item || item.length > 160) return null;
    if (!output.includes(item)) output.push(item);
  }
  return output;
}

function requirementAllowed(requirement: FollowUpRequirement, chart: AssistantChartContext): boolean {
  if (requirement === 'none') return true;
  return chart.capabilities[requirement];
}

function sanitizedAnswer(answer: string, retrieved: RetrievedKnowledge): string {
  const allowedPaths = new Set(retrieved.sources.map((source) => source.path));
  return answer.replace(ROUTE_RE, (path) => allowedPaths.has(path) ? path : 'the relevant Zodiacs guide');
}

function parseReceipt(
  value: unknown,
  chart: AssistantChartContext,
  retrieved: RetrievedKnowledge,
): AssistantReceipt | null {
  if (!isRecord(value) || typeof value.label !== 'string') return null;
  const label = value.label.trim();
  const factIds = stringList(value.factIds);
  const sourceIds = stringList(value.sourceIds);
  if (!label || label.length > 160 || !factIds || !sourceIds) return null;
  const knownFacts = factIds.filter((id) => chart.factIds.has(id));
  const knownSources = sourceIds.filter((id) => retrieved.sourceIds.has(id));
  if (!knownFacts.length && !knownSources.length) return null;
  return { label, factIds: knownFacts, sourceIds: knownSources };
}

function parseFollowUp(
  value: unknown,
  chart: AssistantChartContext,
  retrieved: RetrievedKnowledge,
): AssistantFollowUp | null {
  if (!isRecord(value)
    || typeof value.question !== 'string'
    || typeof value.requires !== 'string'
    || !REQUIREMENTS.has(value.requires as FollowUpRequirement)) return null;
  const question = value.question.trim();
  const factIds = stringList(value.factIds);
  const sourceIds = stringList(value.sourceIds);
  const requires = value.requires as FollowUpRequirement;
  if (!question || question.length > 200 || !factIds || !sourceIds || !requirementAllowed(requires, chart)) return null;
  return {
    question,
    requires,
    factIds: factIds.filter((id) => chart.factIds.has(id)),
    sourceIds: sourceIds.filter((id) => retrieved.sourceIds.has(id)),
  };
}

function fallbackReceipt(
  chart: AssistantChartContext,
  retrieved: RetrievedKnowledge,
): AssistantReceipt[] {
  const fact = chart.facts[0];
  if (fact) return [{ label: fact.label, factIds: [fact.id], sourceIds: [] }];
  const source = retrieved.sources[0];
  return source ? [{ label: source.title, factIds: [], sourceIds: [source.id] }] : [];
}

export function validateAssistantResult(
  value: unknown,
  chart: AssistantChartContext,
  retrieved: RetrievedKnowledge,
  locale: ReleasedLocale,
): AssistantResult | null {
  if (!isRecord(value) || typeof value.answer !== 'string' || !Array.isArray(value.receipts) || !Array.isArray(value.followUps)) {
    return null;
  }
  const rawAnswer = value.answer.trim();
  if (!rawAnswer || rawAnswer.length > MAX_MESSAGE_CHARS || URL_LIKE_RE.test(rawAnswer)) return null;

  const receipts = value.receipts.slice(0, MAX_RECEIPTS)
    .map((receipt) => parseReceipt(receipt, chart, retrieved))
    .filter((receipt): receipt is AssistantReceipt => receipt !== null);
  const uniqueQuestions = new Set<string>();
  const followUps = value.followUps.slice(0, MAX_FOLLOW_UPS)
    .map((followUp) => parseFollowUp(followUp, chart, retrieved))
    .filter((followUp): followUp is AssistantFollowUp => {
      if (!followUp) return false;
      const key = followUp.question.toLocaleLowerCase(locale);
      if (uniqueQuestions.has(key)) return false;
      uniqueQuestions.add(key);
      return true;
    });
  for (const fallback of defaultFollowUps(locale, chart.capabilities)) {
    if (followUps.length >= MAX_FOLLOW_UPS) break;
    const key = fallback.question.toLocaleLowerCase(locale);
    if (uniqueQuestions.has(key)) continue;
    uniqueQuestions.add(key);
    followUps.push(fallback);
  }

  return {
    answer: sanitizedAnswer(rawAnswer, retrieved),
    receipts: receipts.length ? receipts : fallbackReceipt(chart, retrieved),
    followUps,
  };
}

export function guideMeta(
  result: AssistantResult,
  retrieved: RetrievedKnowledge,
  chart: AssistantChartContext,
): AssistantGuideMeta {
  const sources = new Map(retrieved.sources.map((source) => [source.id, source]));
  return {
    capabilities: chart.capabilities,
    receipts: result.receipts.map((receipt) => ({
      ...receipt,
      sources: receipt.sourceIds.flatMap((id) => {
        const source = sources.get(id);
        return source ? [source] : [];
      }),
    })),
    followUps: result.followUps,
  };
}
