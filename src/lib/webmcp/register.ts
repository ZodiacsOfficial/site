import { executeWebMcpSearch, SEARCH_INPUT_SCHEMA, SEARCH_TOOL_NAME } from './search';

interface ModelContextLike {
  registerTool(
    tool: WebMcpToolDescriptor,
    options?: { signal?: AbortSignal },
  ): void | Promise<void>;
}

interface WebMcpToolDescriptor {
  name: typeof SEARCH_TOOL_NAME;
  description: string;
  inputSchema: typeof SEARCH_INPUT_SCHEMA;
  annotations: { readOnlyHint: true };
  execute(input: unknown): ReturnType<typeof executeWebMcpSearch>;
}

interface LifecycleTarget {
  addEventListener(type: 'pagehide', listener: EventListener): void;
  removeEventListener(type: 'pagehide', listener: EventListener): void;
}

interface RegistrationState {
  promise: Promise<void>;
  controller: AbortController;
}

export const WEBMCP_SEARCH_TOOL: WebMcpToolDescriptor = Object.freeze({
  name: SEARCH_TOOL_NAME,
  description: 'Search English astrology tools and reference pages on zodiacs.org.',
  inputSchema: SEARCH_INPUT_SCHEMA,
  annotations: Object.freeze({ readOnlyHint: true }),
  execute: executeWebMcpSearch,
});

export function createWebMcpSearchRegistrar() {
  const registrations = new WeakMap<ModelContextLike, RegistrationState>();

  return function registerWebMcpSearch(
    modelContext: ModelContextLike,
    lifecycle: LifecycleTarget = window,
  ): Promise<void> {
    const existing = registrations.get(modelContext);
    if (existing) return existing.promise;

    const controller = new AbortController();
    const onPageHide: EventListener = (event) => {
      if ((event as PageTransitionEvent).persisted) return;
      controller.abort();
      lifecycle.removeEventListener('pagehide', onPageHide);
    };
    lifecycle.addEventListener('pagehide', onPageHide);

    const promise = Promise.resolve()
      .then(() => modelContext.registerTool(WEBMCP_SEARCH_TOOL, { signal: controller.signal }))
      .then(() => undefined)
      .catch((error) => {
        lifecycle.removeEventListener('pagehide', onPageHide);
        registrations.delete(modelContext);
        throw error;
      });
    registrations.set(modelContext, { promise, controller });
    return promise;
  };
}

export const registerWebMcpSearch = createWebMcpSearchRegistrar();

export { executeWebMcpSearch } from './search';
