import { describe, expect, it, vi } from 'vitest';
import {
  createWebMcpSearchRegistrar,
  WEBMCP_SEARCH_TOOL,
} from './register';
import { SEARCH_INPUT_SCHEMA } from './search';

function pageHide(persisted: boolean) {
  const event = new Event('pagehide');
  Object.defineProperty(event, 'persisted', { value: persisted });
  return event;
}

describe('WebMCP search registration', () => {
  it('registers the annotated tool once for a document context', async () => {
    const registerTool = vi.fn(async () => {});
    const modelContext = { registerTool };
    const lifecycle = new EventTarget();
    const register = createWebMcpSearchRegistrar();

    const first = register(modelContext, lifecycle);
    const second = register(modelContext, lifecycle);
    expect(second).toBe(first);
    await first;

    expect(registerTool).toHaveBeenCalledOnce();
    expect(registerTool).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'zodiacs.search',
        inputSchema: SEARCH_INPUT_SCHEMA,
        annotations: { readOnlyHint: true },
        execute: expect.any(Function),
      }),
      { signal: expect.any(AbortSignal) },
    );
    expect(WEBMCP_SEARCH_TOOL).not.toHaveProperty('respond');
  });

  it('preserves registration through bfcache and aborts a real unload', async () => {
    let signal: AbortSignal | undefined;
    const modelContext = {
      registerTool: vi.fn(async (_tool, options) => { signal = options?.signal; }),
    };
    const lifecycle = new EventTarget();
    const register = createWebMcpSearchRegistrar();
    await register(modelContext, lifecycle);

    lifecycle.dispatchEvent(pageHide(true));
    expect(signal?.aborted).toBe(false);
    await register(modelContext, lifecycle);
    expect(modelContext.registerTool).toHaveBeenCalledOnce();

    lifecycle.dispatchEvent(pageHide(false));
    expect(signal?.aborted).toBe(true);
  });

  it('allows a retry if the runtime rejects registration', async () => {
    const modelContext = {
      registerTool: vi.fn()
        .mockRejectedValueOnce(new Error('not ready'))
        .mockResolvedValueOnce(undefined),
    };
    const register = createWebMcpSearchRegistrar();
    const lifecycle = new EventTarget();

    await expect(register(modelContext, lifecycle)).rejects.toThrow('not ready');
    await expect(register(modelContext, lifecycle)).resolves.toBeUndefined();
    expect(modelContext.registerTool).toHaveBeenCalledTimes(2);
  });
});
