import { afterEach, describe, expect, it } from 'vitest';
import pt from './pt';
import { clientUi, clientUiMessage } from './client';
import type { ClientUiPayload, UiKey } from './schema';

type ClientUiGlobal = typeof globalThis & { __ZDX_UI__?: ClientUiPayload };
const clientGlobal = globalThis as ClientUiGlobal;

afterEach(() => {
  Reflect.deleteProperty(clientGlobal, '__ZDX_UI__');
});

describe('client UI catalog', () => {
  it('reads the synchronously installed catalog for the requested locale', () => {
    clientGlobal.__ZDX_UI__ = { locale: 'pt', messages: pt };

    expect(clientUi('pt')).toBe(pt);
    expect(clientUiMessage('pt', 'birthChart')).toBe('Mapa astral');
  });

  it('fails loudly when no catalog has been installed', () => {
    expect(() => clientUi('pt')).toThrowError('Missing client UI catalog for pt');
  });

  it('fails loudly when the installed catalog belongs to another locale', () => {
    clientGlobal.__ZDX_UI__ = { locale: 'pt', messages: pt };

    expect(() => clientUi('es')).toThrowError('Missing client UI catalog for es');
  });

  it('fails loudly when an installed catalog is missing a requested key', () => {
    clientGlobal.__ZDX_UI__ = {
      locale: 'pt',
      messages: { ...pt, birthChart: undefined } as unknown as typeof pt,
    };

    expect(() => clientUiMessage('pt', 'birthChart' as UiKey)).toThrowError(
      'Missing client UI message pt.birthChart',
    );
  });
});
