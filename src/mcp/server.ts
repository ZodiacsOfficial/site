/**
 * A local MCP server over the Zodiacs engine and its chart comparison.
 *
 * Transport is stdio and only stdio: this process reads requests on stdin and
 * writes protocol messages on stdout. It opens no listener, binds no port and
 * makes no outbound request. Start it with the host that will use it; it has
 * no other run mode.
 *
 * Two invariants hold the whole file together.
 *
 * Stdout carries protocol messages and nothing else. The stdio binding is
 * normative about this — a single stray `console.log` becomes a JSON parse
 * error at the client and takes the session with it — so this module never
 * writes to stdout itself, and `note` below is the only write path to stderr.
 * What `note` may say is deliberately thin: fixed strings, version numbers and
 * error class names. No birth detail, no record content, no argument value.
 *
 * Nothing thrown by a handler reaches the connection. Every tool call runs
 * inside `guard`, so a malformed request produces a refusal and leaves the
 * session able to serve the next valid one.
 */
import { Transform } from 'node:stream';
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport, serveStdio } from '@modelcontextprotocol/server/stdio';
import { ENGINE_VERSION } from '@zodiacs/engine';
import { ADAPTER_NAME, ADAPTER_VERSION, LIMITS } from './bounds';
import {
  CAPABILITIES_INPUT, COMPARE_INPUT, NATAL_INPUT, PRIVACY,
  calculateNatalChart, compareCalculationRecords, describeCapabilities, type ToolOutcome,
} from './tools';

/** The only write path off this process other than the protocol itself. */
function note(message: string): void {
  process.stderr.write(`${ADAPTER_NAME}: ${message}\n`);
}

function respond(outcome: ToolOutcome) {
  if (!outcome.ok) return { isError: true as const, content: [{ type: 'text' as const, text: outcome.refusal }] };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(outcome.value, null, 1) }],
    structuredContent: outcome.value,
  };
}

/**
 * An unexpected throw becomes a refusal on this call alone. The stderr line
 * names the error's class and not its message, because a message from an
 * unknown throw may quote the argument that caused it.
 */
function guard(run: () => ToolOutcome) {
  try {
    return respond(run());
  } catch (error) {
    note(`a tool handler failed with ${error instanceof Error ? error.name : 'a non-error throw'}`);
    return {
      isError: true as const,
      content: [{ type: 'text' as const, text: 'The adapter could not complete this call. The connection is still open and the next request is unaffected.' }],
    };
  }
}

/** Honest hints: nothing here writes, reaches the network, or varies by call. */
const READ_ONLY = Object.freeze({
  readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false,
});

function build(): McpServer {
  const server = new McpServer(
    { name: ADAPTER_NAME, version: ADAPTER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.registerTool('get_capabilities', {
    title: 'Zodiacs engine capabilities',
    description: [
      'What this adapter can calculate, the exact engine and schema versions behind it, every limit a request must respect, and what it deliberately does not do.',
      'Read this before the other two tools rather than guessing at supported options.',
      PRIVACY.assistant,
    ].join(' '),
    inputSchema: CAPABILITIES_INPUT,
    annotations: READ_ONLY,
  }, () => guard(() => describeCapabilities()));

  server.registerTool('calculate_natal_chart', {
    title: 'Calculate a natal chart',
    description: [
      'Calculate one natal chart from a birth instant and, optionally, coordinates.',
      'Returns body positions, angles, house cusps and aspects, with whether the time was known and which house system was requested against which one was actually used.',
      'Computed on this machine by the pinned Zodiacs engine.',
      PRIVACY.assistant,
    ].join(' '),
    inputSchema: NATAL_INPUT,
    annotations: READ_ONLY,
  }, (args) => guard(() => calculateNatalChart(args)));

  server.registerTool('compare_calculation_records', {
    title: 'Compare two calculation records',
    description: [
      'Read two Zodiacs calculation records and report what differs between them and how much of it is explained.',
      'Each difference is a fact read from the two records. Each proposed cause is labelled by its evidence: reproduced by a local recalculation, reported by the records themselves, a hypothesis that fits, or unresolved.',
      'Pass record content, not a path or a URL.',
      PRIVACY.output,
    ].join(' '),
    inputSchema: COMPARE_INPUT,
    annotations: READ_ONLY,
  }, (args) => guard(() => compareCalculationRecords(args)));

  return server;
}

/**
 * A line gate in front of the transport.
 *
 * A request is one JSON message on one line. When a line is longer than the
 * SDK's read buffer, that buffer throws and the stdio transport answers by
 * closing the connection — so one oversized line ended the session and the
 * process exited, with the next valid request never answered. An AI review
 * found it: 1048577 bytes in, no response, server gone. Lowering the buffer
 * from the SDK's 10 MB default had made it ten times easier to reach.
 *
 * This holds each line until it is complete and forwards it whole, or discards
 * it whole once it passes the limit and resynchronises at the next newline. A
 * partly-forwarded line would be worse than the crash: its fragment would join
 * the following line and destroy a legitimate request.
 *
 * A discarded line gets no reply. It was never parsed, so there is no request
 * id to answer with, and inventing one would be worse than silence. The only
 * thing inspected is the length: not one byte of a discarded line is parsed,
 * read or written anywhere.
 */
function lineGate(limit: number): Transform {
  let pending: Buffer[] = [];
  let pendingBytes = 0;
  let discarding = false;
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      let start = 0;
      while (start < chunk.length) {
        const newline = chunk.indexOf(0x0a, start);
        const end = newline === -1 ? chunk.length : newline + 1;
        const segment = chunk.subarray(start, end);
        start = end;
        if (discarding) {
          if (newline !== -1) discarding = false;
          continue;
        }
        if (pendingBytes + segment.length > limit) {
          pending = [];
          pendingBytes = 0;
          discarding = newline === -1;
          note(`dropped one request line over the ${limit}-byte limit; the session is unaffected`);
          continue;
        }
        pending.push(segment);
        pendingBytes += segment.length;
        if (newline !== -1) {
          this.push(Buffer.concat(pending));
          pending = [];
          pendingBytes = 0;
        }
      }
      done();
    },
    flush(done) {
      // A final line with no newline is still a message the SDK can read.
      if (pendingBytes > 0) this.push(Buffer.concat(pending));
      done();
    },
  });
}

const gate = lineGate(LIMITS.requestBytes);
process.stdin.pipe(gate);

const handle = serveStdio(build, {
  // The gate above guarantees no forwarded line exceeds LIMITS.requestBytes, so
  // this buffer — deliberately a little larger — can no longer overflow. It is
  // still set rather than left at the SDK's 10 MB default, as a second bound.
  transport: new StdioServerTransport(gate, process.stdout, { maxBufferSize: LIMITS.requestBytes + 4096 }),
  onerror: (error) => note(`transport reported ${error.name}`),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void handle.close().then(() => process.exit(0), () => process.exit(1));
  });
}

note(`ready on stdio: adapter ${ADAPTER_VERSION}, engine ${ENGINE_VERSION}, no network`);
