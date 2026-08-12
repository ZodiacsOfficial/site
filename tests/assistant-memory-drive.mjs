/**
 * Authenticated Ask Zodiacs memory browser drive. Supabase auth and PostgREST
 * are fully mocked; no live account or project is used.
 *
 *   npm run build
 *   npm run test:phase6:assistant-memory-browser
 */
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const FAKE_SUPABASE_URL = 'https://assistant-memory.test';
const AUTH_STORAGE_KEY = 'sb-assistant-memory-auth-token';
const USER_A = '81000000-0000-4000-8000-000000000001';
const USER_B = '81000000-0000-4000-8000-000000000002';
const REMOTE_A = '82000000-0000-4000-8000-000000000001';
const REMOTE_B = '82000000-0000-4000-8000-000000000002';
const EXPIRY = '2026-10-31T12:00:00.000Z';
const CREATED_AT = '2026-08-02T12:00:00.000Z';
const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });

const bundleResult = await build({
  absWorkingDir: process.cwd(),
  entryPoints: ['src/lib/assistant/open-assistant.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2020'],
  write: false,
  outdir: '/tmp/zodiacs-assistant-memory-browser',
  define: {
    'import.meta.env.PUBLIC_SUPABASE_URL': JSON.stringify(FAKE_SUPABASE_URL),
    'import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('test-publishable-key'),
    'import.meta.env.PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
});
const assistantBundle = bundleResult.outputFiles.find((file) => file.path.endsWith('.js'))?.text;
if (!assistantBundle) throw new Error('Could not build the assistant memory browser fixture');

function jwtFor(userId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    aud: 'authenticated', exp: 4_102_444_800, iat: 1_775_299_200,
    iss: `${FAKE_SUPABASE_URL}/auth/v1`, role: 'authenticated', sub: userId,
  })}.test-signature`;
}

function sessionFor(userId) {
  return {
    access_token: jwtFor(userId),
    refresh_token: `refresh-${userId}`,
    expires_in: 2_147_483_647,
    expires_at: 4_102_444_800,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: `${userId === USER_A ? 'a' : 'b'}@example.test`,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      identities: [],
      created_at: CREATED_AT,
    },
  };
}

const sessionA = sessionFor(USER_A);
const sessionB = sessionFor(USER_B);

function rowThread(id, title) {
  return { id, locale: 'en', title, chart_id: null, created_at: CREATED_AT, expires_at: EXPIRY };
}

function rowTurn(id, threadId, question, answer) {
  return { id, thread_id: threadId, question, answer, completed_at: CREATED_AT };
}

function createState() {
  return {
    optIn: new Map([[USER_A, false], [USER_B, true]]),
    threads: new Map([
      [USER_A, []],
      [USER_B, [rowThread(REMOTE_B, 'B remembered thread')]],
    ]),
    turns: new Map([
      [USER_A, []],
      [USER_B, [rowTurn('83000000-0000-4000-8000-000000000002', REMOTE_B, 'B private question', 'B private answer')]],
    ]),
    calls: [],
    failNextSave: false,
    unexpected: [],
  };
}

function requestUserId(request) {
  const authorization = request.headers().authorization ?? '';
  const token = authorization.replace(/^Bearer\s+/iu, '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
    return payload.sub;
  } catch {
    return null;
  }
}

async function json(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function addImportedThread(state, userId, body) {
  const threads = state.threads.get(userId) ?? [];
  let thread = threads.find((candidate) => candidate.id === body.p_thread_id);
  if (!thread) {
    thread = rowThread(body.p_thread_id, body.p_title);
    threads.unshift(thread);
    state.threads.set(userId, threads);
  }
  const turns = state.turns.get(userId) ?? [];
  let inserted = 0;
  for (const turn of body.p_turns ?? []) {
    if (turns.some((candidate) => candidate.id === turn.id)) continue;
    turns.push(rowTurn(turn.id, body.p_thread_id, turn.question, turn.answer));
    inserted += 1;
  }
  state.turns.set(userId, turns);
  return { thread_id: body.p_thread_id, expires_at: thread.expires_at, inserted_turns: inserted };
}

async function mockSupabase(route, state) {
  const request = route.request();
  const url = new URL(request.url());
  const userId = requestUserId(request);
  if (url.pathname === '/auth/v1/user' && userId) {
    await json(route, sessionFor(userId).user);
    return;
  }
  if (!userId) {
    await json(route, { message: 'missing test user' }, 401);
    return;
  }
  if (url.pathname === '/rest/v1/profiles') {
    await json(route, { assistant_memory_opt_in: state.optIn.get(userId) === true });
    return;
  }
  if (url.pathname === '/rest/v1/assistant_threads') {
    await json(route, state.threads.get(userId) ?? []);
    return;
  }
  if (url.pathname === '/rest/v1/assistant_turns') {
    const requested = new Set((url.searchParams.get('thread_id') ?? '')
      .replace(/^in\.\(/u, '').replace(/\)$/u, '').split(',').filter(Boolean));
    const turns = state.turns.get(userId) ?? [];
    await json(route, requested.size ? turns.filter((turn) => requested.has(turn.thread_id)) : turns);
    return;
  }
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const name = url.pathname.split('/').at(-1);
    const body = request.postDataJSON() ?? {};
    state.calls.push({ name, body, userId });
    if (name === 'assistant_memory_enable_and_import_thread') {
      state.optIn.set(userId, true);
      await json(route, addImportedThread(state, userId, body));
      return;
    }
    if (name === 'assistant_memory_import_thread') {
      await json(route, addImportedThread(state, userId, body));
      return;
    }
    if (name === 'assistant_memory_save_turn') {
      if (state.failNextSave) {
        state.failNextSave = false;
        await json(route, { code: '08006', details: null, hint: null, message: 'temporary test failure' }, 503);
        return;
      }
      const turns = state.turns.get(userId) ?? [];
      const duplicate = turns.some((turn) => turn.id === body.p_turn_id);
      if (!duplicate) turns.push(rowTurn(body.p_turn_id, body.p_thread_id, body.p_question, body.p_answer));
      state.turns.set(userId, turns);
      await json(route, { outcome: duplicate ? 'duplicate' : 'saved' });
      return;
    }
    if (name === 'assistant_memory_delete_thread') {
      const before = state.threads.get(userId) ?? [];
      const existed = before.some((thread) => thread.id === body.p_thread_id);
      state.threads.set(userId, before.filter((thread) => thread.id !== body.p_thread_id));
      state.turns.set(userId, (state.turns.get(userId) ?? []).filter((turn) => turn.thread_id !== body.p_thread_id));
      await json(route, existed);
      return;
    }
    if (name === 'assistant_memory_delete_all') {
      const count = (state.threads.get(userId) ?? []).length;
      state.threads.set(userId, []);
      state.turns.set(userId, []);
      await json(route, count);
      return;
    }
    if (name === 'assistant_memory_set_opt_in') {
      state.optIn.set(userId, body.p_enabled === true);
      if (!body.p_enabled) {
        state.threads.set(userId, []);
        state.turns.set(userId, []);
      }
      await json(route, { enabled: body.p_enabled === true });
      return;
    }
  }
  state.unexpected.push(`${request.method()} ${url.pathname}${url.search}`);
  await json(route, { message: 'unhandled test route' }, 404);
}

const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
const answerStream = (answer) => [
  event('status', { stage: 'thinking' }),
  event('answer.delta', { text: answer }),
  event('guide.meta', { capabilities: { chart: false, houses: false, transits: false }, receipts: [], followUps: [] }),
  event('done', {}),
].join('');

async function broadcastAuth(page, eventName, session) {
  await page.evaluate(({ storageKey, eventName: authEvent, nextSession }) => {
    if (nextSession) localStorage.setItem(storageKey, JSON.stringify(nextSession));
    else localStorage.removeItem(storageKey);
    const channel = new BroadcastChannel(storageKey);
    channel.postMessage({ event: authEvent, session: nextSession });
    channel.close();
  }, { storageKey: AUTH_STORAGE_KEY, eventName, nextSession: session });
}

await withPreview({ port: 4410 }, async (baseURL) => {
  const browser = await chromium.launch({ executablePath: await findChromium(), args: STABLE_CHROMIUM_ARGS });
  const state = createState();
  try {
    const context = await browser.newContext({ viewport: { width: 1120, height: 900 } });
    await context.addInitScript(({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
    }, { storageKey: AUTH_STORAGE_KEY, session: sessionA });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.route('**/assets/assistant-ui.js', (route) => route.fulfill({
      status: 200, contentType: 'text/javascript; charset=utf-8', body: assistantBundle,
    }));
    await page.route(`${FAKE_SUPABASE_URL}/**`, (route) => mockSupabase(route, state));
    let answerNumber = 0;
    await page.route('**/api/assistant', async (route) => {
      answerNumber += 1;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream; charset=utf-8',
        body: answerStream(`Completed account-memory answer ${answerNumber}.`),
      });
    });

    await page.goto(`${baseURL}/ask/`, { waitUntil: 'networkidle' });
    const guide = page.locator('.zassistant--embedded');
    await guide.waitFor({ timeout: 15_000 });
    const memory = guide.locator('.zassistant__memory');
    await memory.locator('summary').click();
    const remember = memory.locator('.zassistant__memory-primary');
    await remember.waitFor({ state: 'visible' });

    const ask = async (question) => {
      await guide.locator('textarea').fill(question);
      await guide.locator('form button[type="submit"]').click();
      await guide.locator('.zassistant__status').filter({ hasText: 'Answer complete.' }).waitFor();
    };

    await ask('Keep this first completed turn.');
    await remember.click();
    await guide.locator('.zassistant__consent--memory .zassistant__consent-confirm').click();
    await page.waitForFunction(() => document.querySelector('.zassistant__memory-status')?.textContent?.includes('Remembered until'));
    const enableCall = state.calls.find((call) => call.name === 'assistant_memory_enable_and_import_thread');
    check('opt-in atomically imports completed visible turns', enableCall?.body.p_turns?.length === 1
      && state.optIn.get(USER_A) === true);
    check('fixed 90-day expiry is displayed', (await memory.locator('.zassistant__memory-status').textContent() ?? '').includes('Oct 31, 2026'));

    await ask('Save this future completed turn.');
    await page.waitForFunction(() => document.querySelectorAll('.zassistant__message--assistant').length >= 2);
    await page.waitForTimeout(50);
    check('future completed turns use the idempotent save RPC', state.calls.some((call) => (
      call.name === 'assistant_memory_save_turn' && call.body.p_question === 'Save this future completed turn.'
    )));

    state.failNextSave = true;
    await ask('Keep this turn when account storage fails.');
    await memory.locator('.zassistant__memory-retry').waitFor({ state: 'visible' });
    const sessionBeforeRetry = await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2'));
    check('storage failure preserves the completed session turn', JSON.parse(sessionBeforeRetry).turns.length === 3);
    await memory.locator('.zassistant__memory-retry').click();
    await page.waitForFunction(() => document.querySelector('.zassistant__memory-retry')?.hidden === true);
    const retryImport = state.calls.filter((call) => call.name === 'assistant_memory_import_thread').at(-1);
    check('retry imports the full visible thread idempotently', retryImport?.body.p_turns?.length === 3);

    const sessionThreadId = JSON.parse(sessionBeforeRetry).id;
    state.threads.get(USER_A).push(rowThread(REMOTE_A, 'A remembered thread'));
    state.turns.get(USER_A).push(rowTurn(
      '83000000-0000-4000-8000-000000000001', REMOTE_A, 'A private question', 'A private answer',
    ));
    await page.reload({ waitUntil: 'networkidle' });
    const reloaded = page.locator('.zassistant--embedded');
    await reloaded.waitFor({ timeout: 15_000 });
    const reloadedMemory = reloaded.locator('.zassistant__memory');
    await reloadedMemory.locator('summary').click();
    await reloadedMemory.locator(`.zassistant__memory-select option[value="${REMOTE_A}"]`).waitFor({ state: 'attached' });
    check('reload restores completed session turns', await reloaded.locator('.zassistant__message--user').count() === 3);
    check('remembered thread picker keeps fixed expiry visible', (await reloadedMemory.locator(`option[value="${sessionThreadId}"]`).textContent() ?? '').includes('Oct 31, 2026'));

    await reloadedMemory.locator('.zassistant__memory-select').selectOption(REMOTE_A);
    await reloadedMemory.getByRole('button', { name: 'Open', exact: true }).click();
    check('remembered thread opens its visible owner-scoped turns', await reloaded.getByText('A private answer', { exact: true }).count() === 1);
    const anonymousSession = await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2'));
    check('opening a remembered thread does not overwrite sessionStorage', anonymousSession === sessionBeforeRetry);

    state.threads.set(USER_A, state.threads.get(USER_A).filter((thread) => thread.id !== REMOTE_A));
    state.turns.set(USER_A, state.turns.get(USER_A).filter((turn) => turn.thread_id !== REMOTE_A));
    await page.evaluate((threadId) => dispatchEvent(new CustomEvent('zodiacs:assistant-memory', {
      detail: { mode: 'account', action: 'deleted', threadId },
    })), REMOTE_A);
    await reloaded.getByText('A private answer', { exact: true }).waitFor({ state: 'detached' });
    check('an expired or remotely deleted open thread restores the anonymous session',
      await reloaded.locator('.zassistant__message--user').count() === 3
      && await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2')) === anonymousSession);
    state.threads.get(USER_A).push(rowThread(REMOTE_A, 'A remembered thread'));
    state.turns.get(USER_A).push(rowTurn(
      '83000000-0000-4000-8000-000000000001', REMOTE_A, 'A private question', 'A private answer',
    ));
    await page.evaluate((threadId) => dispatchEvent(new CustomEvent('zodiacs:assistant-memory', {
      detail: { mode: 'account', action: 'saved', threadId },
    })), REMOTE_A);
    await reloadedMemory.locator(`.zassistant__memory-select option[value="${REMOTE_A}"]`).waitFor({ state: 'attached' });
    await reloadedMemory.locator('.zassistant__memory-select').selectOption(REMOTE_A);
    await reloadedMemory.getByRole('button', { name: 'Open', exact: true }).click();

    await broadcastAuth(page, 'SIGNED_IN', sessionB);
    await reloadedMemory.locator(`.zassistant__memory-select option[value="${REMOTE_B}"]`).waitFor({ state: 'attached' });
    check('A→B switch removes A transcript and thread choices',
      await reloaded.getByText('A private answer', { exact: true }).count() === 0
      && await reloadedMemory.locator(`option[value="${REMOTE_A}"]`).count() === 0);
    await reloadedMemory.locator('.zassistant__memory-select').selectOption(REMOTE_B);
    await reloadedMemory.getByRole('button', { name: 'Open', exact: true }).click();
    check('B can open only B remembered content', await reloaded.getByText('B private answer', { exact: true }).count() === 1);

    await broadcastAuth(page, 'SIGNED_OUT', null);
    await reloadedMemory.locator('.zassistant__memory-status').filter({ hasText: 'Sign in to remember' }).waitFor();
    check('sign-out removes account-derived content and restores anonymous session',
      await reloaded.getByText('B private answer', { exact: true }).count() === 0
      && await reloaded.locator('.zassistant__message--user').count() === 3
      && await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2')) === anonymousSession);

    await broadcastAuth(page, 'SIGNED_IN', sessionA);
    await reloadedMemory.locator(`.zassistant__memory-select option[value="${REMOTE_A}"]`).waitFor({ state: 'attached' });
    await reloadedMemory.locator('.zassistant__memory-select').selectOption(REMOTE_A);
    await reloadedMemory.getByRole('button', { name: 'Open', exact: true }).click();
    await reloadedMemory.getByRole('button', { name: 'Delete this conversation', exact: true }).click();
    await page.waitForFunction((id) => !document.querySelector(`.zassistant__memory-select option[value="${id}"]`), REMOTE_A);
    check('per-thread delete removes only the selected remembered thread',
      !state.threads.get(USER_A).some((thread) => thread.id === REMOTE_A)
      && state.threads.get(USER_A).some((thread) => thread.id === sessionThreadId));

    await reloadedMemory.getByRole('button', { name: 'Delete all remembered conversations', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.zassistant__memory-select option').length === 0);
    check('delete-all clears remembered threads without clearing the tab session',
      state.threads.get(USER_A).length === 0
      && await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2')) === anonymousSession);

    await reloadedMemory.getByRole('button', { name: 'Turn off memory and delete all', exact: true }).click();
    await remember.waitFor({ state: 'visible' });
    check('opt-out disables account memory and leaves session chat intact',
      state.optIn.get(USER_A) === false
      && await page.evaluate(() => sessionStorage.getItem('zodiacs.assistant.session.v2')) === anonymousSession);
    check('mocked account flow has no unexpected Supabase requests', state.unexpected.length === 0, state.unexpected.join(' | '));
    check('authenticated memory flow has no page errors', pageErrors.length === 0, pageErrors.join(' | '));
    await context.close();
  } finally {
    await browser.close();
  }
});

const failures = results.filter((result) => !result.ok);
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
if (failures.length) {
  console.error(`assistant-memory-drive: FAIL — ${failures.length}/${results.length}`);
  process.exit(1);
}
console.log(`assistant-memory-drive: PASS — ${results.length}/${results.length} checks`);
