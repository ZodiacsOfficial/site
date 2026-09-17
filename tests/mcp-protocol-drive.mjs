/**
 * Protocol acceptance for the local MCP adapter, using the official SDK client
 * against the real server process.
 *
 *   node tests/mcp-protocol-drive.mjs
 *
 * Nothing here is mocked: the drive spawns `examples/mcp-server/server.mjs` as
 * a child process, speaks MCP over its stdio, and reads what comes back. It
 * initializes, lists the tools, calls all three, drives fourteen malformed or
 * refused requests, checks that a valid request still works after every one of
 * them, and closes the process.
 *
 * Every chart in here is synthetic: round coordinates for well-known cities on
 * dates chosen for what they exercise. No real person's birth details are used
 * in any demonstration or test of this adapter.
 *
 * Two things this drive can establish and one it cannot. It establishes
 * interoperability with the official SDK client, and — through the raw wire
 * probe at the end — which protocol revisions the server actually negotiates.
 * It establishes nothing about any particular end-user host: that is a separate
 * recording, because a client library agreeing with a server is not a host
 * agreeing with it.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { LATEST_PROTOCOL_VERSION, SUPPORTED_PROTOCOL_VERSIONS } from '@modelcontextprotocol/client';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SERVER = resolve(ROOT, 'examples/mcp-server/server.mjs');
const OUT = resolve(ROOT, 'docs/platform/evidence/mcp-adapter');

/** Synthetic birth details, reused so the drive is deterministic. */
const LONDON = { utc: '1990-06-15T13:30:00Z', latitude: 51.5074, longitude: -0.1278 };
/** The same instant written with an offset instead of Z. */
const LONDON_OFFSET = { ...LONDON, utc: '1990-06-15T19:00:00+05:30' };
/** Longyearbyen: far enough north that Placidus cannot be computed. */
const POLAR = { utc: '1990-12-15T09:00:00Z', latitude: 78.2232, longitude: 15.6267 };

const results = [];
const check = (name, ok, detail = null) => {
  results.push({ name, ok: Boolean(ok), ...(detail === null ? {} : { detail }) });
  if (!ok) console.error(`FAIL ${name}${detail === null ? '' : `: ${JSON.stringify(detail)}`}`);
};

let stderrText = '';
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [SERVER],
  cwd: ROOT,
  stderr: 'pipe',
});
const client = new Client({ name: 'zodiacs-mcp-protocol-drive', version: '1.0.0' });

/**
 * A call's outcome, whichever layer refused it. A schema violation comes back
 * as a JSON-RPC error and rejects; a refusal the handler decided comes back as
 * a result with isError set. Both are failures the caller must see, and the
 * drive records which layer caught each one rather than flattening them.
 */
async function attempt(name, args) {
  try {
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) return { layer: 'tool', text: result.content?.[0]?.text ?? '' };
    return { layer: 'ok', result };
  } catch (error) {
    return { layer: 'protocol', text: error instanceof Error ? error.message : String(error) };
  }
}

async function ok(name, args) {
  const outcome = await attempt(name, args);
  assert.equal(outcome.layer, 'ok', `${name} should have succeeded: ${outcome.text ?? ''}`);
  return outcome.result.structuredContent;
}

/** A valid call, used after every refusal to show the session survived it. */
async function recovers(label) {
  const chart = await ok('calculate_natal_chart', LONDON);
  check(`recovers after ${label}`, chart?.bodies?.length === 12 && chart.angles !== null);
}

/**
 * A raw wire probe. The SDK client only ever offers its own latest revision, so
 * the versions a host might actually ask for are exercised by hand here,
 * outside the client library.
 */
function rawHandshake(version) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [SERVER], { cwd: ROOT, stdio: ['pipe', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); done({ version, error: 'timeout' }); }, 20000);
    child.stdout.on('data', (chunk) => {
      out += chunk;
      const line = out.split('\n').find((candidate) => candidate.trim().startsWith('{'));
      if (!line || !out.includes('\n')) return;
      clearTimeout(timer);
      child.stdin.end();
      child.kill('SIGTERM');
      try {
        const message = JSON.parse(line);
        done({ version, negotiated: message.result?.protocolVersion ?? null, error: message.error?.message ?? null });
      } catch (error) { done({ version, error: String(error) }); }
    });
    child.on('error', (error) => { clearTimeout(timer); done({ version, error: error.message }); });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: version, capabilities: {}, clientInfo: { name: 'raw-probe', version: '0' } },
    })}\n`);
  });
}

/**
 * The drive runs against the built artifact, so a source edit without a
 * rebuild would quietly measure the previous bundle. This already happened
 * twice while these drives were written, so it is a hard stop rather than a
 * warning.
 */
async function requireFreshBundle() {
  const { buildServerBundle } = await import('../scripts/build-mcp-server.mjs');
  const [{ bytes }, current] = await Promise.all([buildServerBundle(), readFile(SERVER)]);
  if (!current.equals(bytes)) {
    console.error('examples/mcp-server/server.mjs is stale;'
      + ' run node scripts/build-mcp-server.mjs before driving it');
    process.exit(1);
  }
}
await requireFreshBundle();

const startedAt = new Date().toISOString();
const wire = [];
let closedCleanly = null;

try {
  await client.connect(transport);
  transport.stderr?.on('data', (chunk) => { stderrText += chunk; });

  // ---- connection ----
  const info = client.getServerVersion();
  check('initialize succeeds and names the adapter', info?.name === 'zodiacs-mcp-server', info);
  check('server version is the adapter candidate', /^\d+\.\d+\.\d+-rc\.\d+$/.test(info?.version ?? ''), info?.version);
  check('server declares the tools capability', Boolean(client.getServerCapabilities()?.tools));

  // ---- tools/list ----
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  check('lists exactly the three tools', JSON.stringify(names)
    === JSON.stringify(['calculate_natal_chart', 'compare_calculation_records', 'get_capabilities']), names);
  check('every tool closes its argument object', listed.tools.every((tool) =>
    tool.inputSchema?.type === 'object' && tool.inputSchema.additionalProperties === false));
  check('every tool is annotated read-only, non-destructive and closed-world', listed.tools.every((tool) =>
    tool.annotations?.readOnlyHint === true && tool.annotations.destructiveHint === false
    && tool.annotations.openWorldHint === false));
  check('the natal schema bounds the epoch, coordinates and options', (() => {
    const schema = listed.tools.find((tool) => tool.name === 'calculate_natal_chart')?.inputSchema;
    const p = schema?.properties ?? {};
    return p.utc?.maxLength === 64 && p.latitude?.minimum === -90 && p.latitude.maximum === 90
      && p.longitude?.minimum === -180 && p.longitude.maximum === 180
      && JSON.stringify(p.houseSystem?.enum) === JSON.stringify(['placidus', 'whole'])
      && String(p.utc?.description).includes('1800-01-01');
  })());
  check('every tool description states the assistant-routing distinction', listed.tools.every((tool) =>
    /not a local AI experience|not anonymous/.test(tool.description ?? '')));

  // ---- get_capabilities ----
  const capabilities = await ok('get_capabilities', {});
  check('capabilities name the pinned engine', capabilities.engine?.name === '@zodiacs/engine'
    && /^\d+\.\d+\.\d+-rc\.\d+$/.test(capabilities.engine.version), capabilities.engine);
  check('capabilities label both releases as unpublished candidates',
    capabilities.adapter?.releaseStatus === 'unpublished-candidate'
    && capabilities.engine?.releaseStatus === 'unpublished-candidate');
  check('capabilities state the privacy distinction in full', Boolean(capabilities.privacy?.calculation)
    && /not a local AI experience/.test(capabilities.privacy?.assistant ?? '')
    && /not anonymous/.test(capabilities.privacy?.output ?? '')
    && /authenticates/.test(capabilities.privacy?.claims ?? ''));
  check('capabilities list what is unsupported, including the absent timeout',
    Array.isArray(capabilities.unsupported) && capabilities.unsupported.length >= 6
    && capabilities.unsupported.some((line) => /no timeout/.test(line))
    && capabilities.unsupported.some((line) => /listener|port/.test(line)));
  check('capabilities publish every limit the server enforces',
    capabilities.supported?.limits?.recordBytes === 65536
    && capabilities.supported.limits.requestBytes === 1048576
    && capabilities.supported.epoch?.from === '1800-01-01T00:00:00.000Z');

  // ---- calculate_natal_chart ----
  const chart = await ok('calculate_natal_chart', LONDON);
  check('a summary carries twelve bodies, four angles, twelve cusps and aspects',
    chart.bodies?.length === 12 && Object.keys(chart.angles ?? {}).length === 4
    && chart.cusps?.length === 12 && chart.aspects?.length > 0);
  check('a summary reports requested against actual house system',
    chart.houses?.requested === 'placidus' && chart.houses.actual === 'placidus'
    && chart.houses.absenceReason === null);
  check('a summary does not echo the birth details back', (() => {
    const text = JSON.stringify(chart);
    return !text.includes(LONDON.utc) && !text.includes('51.5074') && !text.includes('-0.1278');
  })());

  const unknownTime = await ok('calculate_natal_chart', { ...LONDON, timeKnown: false });
  check('an unknown time suppresses angles and houses and says why',
    unknownTime.angles === null && unknownTime.cusps === null
    && unknownTime.houses?.actual === null && unknownTime.houses.absenceReason === 'unknown-time'
    && unknownTime.resultFlags?.includes('no-time'));

  const noPlace = await ok('calculate_natal_chart', { utc: LONDON.utc });
  check('a chart with no place keeps the bodies and reports the missing location',
    noPlace.bodies?.length === 12 && noPlace.angles === null
    && noPlace.houses?.absenceReason === 'missing-location');

  const polar = await ok('calculate_natal_chart', { ...POLAR, houseSystem: 'placidus' });
  check('a polar chart reports the house system it could actually use',
    polar.houses?.requested === 'placidus' && polar.houses.actual === 'whole'
    && polar.resultFlags?.includes('polar-fallback'), polar.houses);

  const record = await ok('calculate_natal_chart', { ...LONDON, output: 'record' });
  check('record output returns a parseable envelope and nothing else',
    typeof record.record === 'string'
    && JSON.parse(record.record).schema === 'zodiacs.natal-envelope.draft-v1'
    && !('bodies' in record), Object.keys(record));

  // ---- compare_calculation_records ----
  const wholeRecord = await ok('calculate_natal_chart', { ...LONDON, houseSystem: 'whole', output: 'record' });
  const offsetRecord = await ok('calculate_natal_chart', { ...LONDON_OFFSET, output: 'record' });

  const same = await ok('compare_calculation_records', { left: record.record, right: record.record });
  check('two identical records compare identical', same.identical === true
    && same.counts?.differences === 0 && same.explanations?.length === 0, same.counts);

  const houses = await ok('compare_calculation_records', { left: record.record, right: wholeRecord.record });
  check('a house-system difference is found and every cusp moves', houses.identical === false
    && houses.differences.some((row) => row.id === 'houses-requested')
    && houses.differences.filter((row) => /^cusp-\d+$/.test(row.id)).length === 12,
    houses.counts);
  check('the house-system cause is reproduced by local recalculation',
    houses.explanations.some((row) => row.evidence === 'reproduced'),
    houses.explanations.map((row) => [row.id, row.evidence]));
  check('a comparison labels its own output as not anonymous',
    /not anonymous/.test(houses.disclosure ?? ''));

  const offset = await ok('compare_calculation_records', { left: record.record, right: offsetRecord.record });
  check('the same instant written two ways differs only in what was reported',
    offset.identical === false
    && offset.differences.every((row) => row.kind === 'metadata')
    && offset.explanations.some((row) => row.evidence === 'reported'),
    offset.differences.map((row) => row.id));

  // ---- malformed and refused requests, each followed by a valid one ----
  const refusals = [
    ['an unknown tool name', () => attempt('calculate_chart', LONDON)],
    ['a missing required argument', () => attempt('calculate_natal_chart', { latitude: 0, longitude: 0 })],
    ['an unknown extra argument', () => attempt('calculate_natal_chart', { ...LONDON, houseSystemm: 'whole' })],
    ['a wrongly typed argument', () => attempt('calculate_natal_chart', { ...LONDON, latitude: '51.5' })],
    ['an out-of-range latitude', () => attempt('calculate_natal_chart', { ...LONDON, latitude: 95 })],
    ['an unsupported house system', () => attempt('calculate_natal_chart', { ...LONDON, houseSystem: 'koch' })],
    ['a date before the supported epoch', () => attempt('calculate_natal_chart', { ...LONDON, utc: '1799-12-31T00:00:00Z' })],
    ['a date that does not exist', () => attempt('calculate_natal_chart', { ...LONDON, utc: '2001-02-29T00:00:00Z' })],
    ['a wall time with no zone', () => attempt('calculate_natal_chart', { ...LONDON, utc: '1990-06-15T13:30:00' })],
    ['one coordinate without the other', () => attempt('calculate_natal_chart', { utc: LONDON.utc, latitude: 51.5 })],
    ['a record that is not JSON', () => attempt('compare_calculation_records', { left: '{oops', right: record.record })],
    ['a record that is JSON but not an envelope', () => attempt('compare_calculation_records', { left: '{"a":1}', right: record.record })],
    ['a record declaring an unsupported schema', () => attempt('compare_calculation_records', {
      left: JSON.stringify({ ...JSON.parse(record.record), schema: 'zodiacs.natal-envelope.draft-v9' }),
      right: record.record,
    })],
    ['a record requiring an unimplemented feature', () => attempt('compare_calculation_records', {
      left: JSON.stringify({ ...JSON.parse(record.record), requiredFeatures: ['replay-v2'] }),
      right: record.record,
    })],
    ['a record whose result contradicts its receipt', () => attempt('compare_calculation_records', {
      left: (() => { const o = JSON.parse(record.record); o.result.bodies[0].lon = 1.5; return JSON.stringify(o); })(),
      right: record.record,
    })],
    ['a record over the character cap', () => attempt('compare_calculation_records', {
      left: `{"x":"${'a'.repeat(70000)}"}`, right: record.record,
    })],
    // Under the character cap and over the byte cap: the gap a length check in
    // characters would let through, which is why the byte check is the real one.
    ['a record over the byte cap but under the character cap', () => attempt('compare_calculation_records', {
      left: `{"x":"${'€'.repeat(40000)}"}`, right: record.record,
    })],
    ['an empty record', () => attempt('compare_calculation_records', { left: '', right: record.record })],
  ];

  const refusalDetail = [];
  for (const [label, run] of refusals) {
    const outcome = await run();
    check(`refuses ${label}`, outcome.layer !== 'ok', outcome.layer === 'ok' ? 'accepted' : undefined);
    refusalDetail.push({ case: label, layer: outcome.layer, message: (outcome.text ?? '').slice(0, 200) });
    await recovers(label);
  }

  // The SDK answers a schema violation with an isError result rather than a
  // JSON-RPC error, so the model that sent it reads the reason and can correct
  // itself. Only an unknown tool name reaches the protocol layer. Asserted as
  // observed: the first draft of this check expected the opposite and was wrong
  // about the SDK, not about the server.
  check('every refusal reaches the caller, and only an unknown tool name is a protocol error',
    refusalDetail.every((row) => row.layer !== 'ok')
    && refusalDetail.filter((row) => row.layer === 'protocol').length === 1
    && refusalDetail.find((row) => row.layer === 'protocol')?.case === 'an unknown tool name',
    refusalDetail.map((row) => [row.case, row.layer]));
  check('a schema violation names the field at fault so a caller can correct it',
    /latitude/.test(refusalDetail.find((row) => row.case === 'a wrongly typed argument')?.message ?? '')
    && /houseSystemm/.test(refusalDetail.find((row) => row.case === 'an unknown extra argument')?.message ?? ''),
    refusalDetail.filter((row) => /argument/.test(row.case)).map((row) => row.message));
  check('no refusal message echoes a coordinate or record content',
    refusalDetail.every((row) => !row.message.includes('51.5074')
      && !row.message.includes('-0.1278') && !row.message.includes('natal-envelope.draft-v1')),
    refusalDetail.map((row) => row.message).filter((message) => /51\.5074|-0\.1278/.test(message)));
  check('an unsupported version is refused distinctly from a malformed record',
    /does not declare a schema version/.test(refusalDetail.find((row) =>
      row.case === 'a record declaring an unsupported schema')?.message ?? '')
    && /is not valid JSON/.test(refusalDetail.find((row) =>
      row.case === 'a record that is not JSON')?.message ?? ''));

  // ---- what left the process on its diagnostic channel ----
  check('stderr carried only the adapter\'s own notes',
    stderrText.split('\n').filter(Boolean).every((line) => line.startsWith('zodiacs-mcp-server: ')),
    stderrText.slice(0, 400));
  check('stderr carried no birth detail, coordinate or record content', (() => {
    const forbidden = [LONDON.utc, '51.5074', '-0.1278', POLAR.utc, 'natal-envelope', 'bodies'];
    return forbidden.every((needle) => !stderrText.includes(needle));
  })(), stderrText.slice(0, 400));

  // ---- clean close ----
  const child = transport.pid;
  await client.close();
  await new Promise((done) => { setTimeout(done, 1500); });
  closedCleanly = child === null || child === undefined
    ? 'no pid observed'
    : !processAlive(child);
  check('the server process is gone after the client closes', closedCleanly === true || closedCleanly === 'no pid observed', closedCleanly);

  // ---- raw wire probe across every revision the SDK client supports ----
  for (const version of SUPPORTED_PROTOCOL_VERSIONS) wire.push(await rawHandshake(version));
  check('every protocol revision the SDK supports negotiates a supported revision',
    wire.every((row) => row.negotiated && SUPPORTED_PROTOCOL_VERSIONS.includes(row.negotiated)), wire);
  const unsupported = await rawHandshake('1999-01-01');
  wire.push(unsupported);
  check('an unknown protocol revision is answered rather than dropped',
    Boolean(unsupported.negotiated || unsupported.error), unsupported);
} catch (error) {
  check('the drive ran to completion', false, error instanceof Error ? error.stack : String(error));
} finally {
  await client.close().catch(() => {});
}

function processAlive(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

await mkdir(OUT, { recursive: true });
const bundle = await readFile(SERVER);
const evidence = {
  type: 'official-SDK protocol interoperability against the real server process;'
    + ' not a named end-user host, and not a model-driven demonstration',
  startedAt,
  completedAt: new Date().toISOString(),
  node: process.version,
  client: {
    package: '@modelcontextprotocol/client',
    version: JSON.parse(await readFile(resolve(ROOT, 'node_modules/@modelcontextprotocol/client/package.json'), 'utf8')).version,
    offeredProtocolVersion: LATEST_PROTOCOL_VERSION,
    supportedProtocolVersions: [...SUPPORTED_PROTOCOL_VERSIONS],
  },
  server: { path: 'examples/mcp-server/server.mjs', bytes: bundle.length, sha256: createHash('sha256').update(bundle).digest('hex') },
  wire,
  checks: results.length,
  passed: results.filter((row) => row.ok).length,
  results,
};
await writeFile(join(OUT, 'protocol-drive.json'), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`mcp-protocol-drive: ${evidence.passed}/${evidence.checks} checks passed`);
console.log(`  wire: ${wire.map((row) => `${row.version}→${row.negotiated ?? row.error}`).join(', ')}`);
if (evidence.passed !== evidence.checks) process.exitCode = 1;
