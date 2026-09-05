import { afterEach, describe, expect, it, vi } from 'vitest';
import CalculationReload, { calculationError, calculationLoadMessage } from './CalculationReload';
import { ModuleLoadError } from '../lib/module-load';
import { CATALOG_LOCALES } from '../lib/i18n/core';

afterEach(() => { vi.unstubAllGlobals(); });

describe('calculation load failure recovery', () => {
  it.each(CATALOG_LOCALES)('uses localized file-load copy and offers an explicit reload in %s', (locale) => {
    const error = calculationError(new ModuleLoadError('offline'), locale, 'invalid input');
    expect(error).toBe(calculationLoadMessage(locale));
    expect(error).not.toBe('invalid input');
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    const view = CalculationReload({ error, locale });
    expect(view).not.toBeNull();
    const [button, , warning] = view!.props.children;
    expect(button.type).toBe('button');
    expect(button.props.type).toBe('button');
    expect(button.props.children.length).toBeGreaterThan(3);
    expect(warning.length).toBeGreaterThan(10);
    expect(reload).not.toHaveBeenCalled();
    button.props.onClick();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not mislabel input or calculation failures as missing files', () => {
    expect(calculationError(new RangeError('date'), 'en', 'Check the date.')).toBe('Check the date.');
    expect(CalculationReload({ error: 'Check the date.', locale: 'en' })).toBeNull();
    expect(CalculationReload({ error: '', locale: 'en' })).toBeNull();
    expect(CalculationReload({ error: null, locale: 'en' })).toBeNull();
  });
});
