import {
  cleanupWebMCPPolyfill,
  initializeWebMCPPolyfill,
} from '@mcp-b/webmcp-polyfill';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEBMCP_SEARCH_TOOL } from './register';

let previousDocument: PropertyDescriptor | undefined;

beforeEach(() => {
  previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {},
  });
  initializeWebMCPPolyfill({ installTestingShim: 'always' });
});

afterEach(() => {
  cleanupWebMCPPolyfill();
  vi.unstubAllGlobals();
  if (previousDocument) Object.defineProperty(globalThis, 'document', previousDocument);
  else delete (globalThis as { document?: unknown }).document;
});

describe('MCP-B v4 interoperability', () => {
  it('normalizes the plain envelope into structuredContent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => [{
        path: '/aries/',
        title: 'Aries: dates and meaning',
        description: 'A plain guide to Aries.',
        kind: 'sign',
      }],
    })));
    await document.modelContext.registerTool(WEBMCP_SEARCH_TOOL);

    const testing = Reflect.get(navigator, 'modelContextTesting') as {
      listTools(): Array<{ name: string; description: string; inputSchema?: string }>;
      executeTool(name: string, input: string): Promise<string | null>;
    } | undefined;
    expect(testing).toBeDefined();
    const listed = testing!.listTools();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      name: 'zodiacs.search',
      description: WEBMCP_SEARCH_TOOL.description,
    });
    expect(JSON.parse(listed[0].inputSchema!)).toEqual(WEBMCP_SEARCH_TOOL.inputSchema);

    const wire = await testing!.executeTool(
      'zodiacs.search',
      JSON.stringify({ query: 'aries' }),
    );
    expect(wire).not.toBeNull();
    const result = JSON.parse(wire!) as {
      content: Array<{ type: string; text?: string }>;
      structuredContent?: unknown;
      isError?: boolean;
    };
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toEqual({
      ok: true,
      data: {
        results: [{
          title: 'Aries: dates and meaning',
          path: '/aries/',
          kind: 'sign',
          description: 'A plain guide to Aries.',
        }],
      },
    });
    expect(result.content[0]).toMatchObject({ type: 'text' });
  });
});
