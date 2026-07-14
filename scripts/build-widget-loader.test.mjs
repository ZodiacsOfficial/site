import { describe, expect, it } from 'vitest';
import { WIDGET_EN } from '../src/strings/widgets';
import { widgetLoaderSource } from './build-widget-loader.mjs';

describe('widget script loader generator', () => {
  it('sources every fallback iframe title from the English catalogue', () => {
    const source = widgetLoaderSource();
    expect(source).toContain(JSON.stringify(WIDGET_EN.widgetTitleMoon));
    expect(source).toContain(JSON.stringify(WIDGET_EN.widgetTitleSky));
    expect(source).toContain(JSON.stringify(WIDGET_EN.widgetTitleChart));
    expect(source).toContain('script.dataset.title || titles[kind]');
    expect(source).not.toContain('script.dataset.title || kind');
  });
});
