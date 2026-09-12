export interface PostChartContext {
  mode: 'full';
  sunSign: string | null;
  chartId: string | null;
  contextId: number;
}

type PostChartWindow = Window & {
  zodiacsPostChartContext?: PostChartContext;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPostChartContext(value: unknown): value is PostChartContext {
  if (!value || typeof value !== 'object') return false;
  const context = value as Partial<PostChartContext>;
  return context.mode === 'full'
    && Number.isSafeInteger(context.contextId)
    && (context.sunSign === null || typeof context.sunSign === 'string')
    && (context.chartId === null
      || (typeof context.chartId === 'string' && UUID.test(context.chartId)));
}

export function clearPostChartContext(): void {
  if (typeof window === 'undefined') return;
  delete (window as PostChartWindow).zodiacsPostChartContext;
}

export function publishPostChartContext(context: PostChartContext): void {
  if (typeof window === 'undefined') return;
  (window as PostChartWindow).zodiacsPostChartContext = context;
  window.dispatchEvent(new CustomEvent<PostChartContext>('zodiacs:chart-context', {
    detail: context,
  }));
}

export function currentPostChartContext(): PostChartContext | null {
  if (typeof window === 'undefined') return null;
  const context = (window as PostChartWindow).zodiacsPostChartContext;
  return isPostChartContext(context) ? context : null;
}
