import { requireReleasedLocale, type Locale } from '../core';
import type { ClientUiPayload, UiCatalog, UiKey } from './schema';

type ClientUiGlobal = typeof globalThis & { __ZDX_UI__?: ClientUiPayload };

export function clientUi(locale: Locale): UiCatalog {
  const releasedLocale = requireReleasedLocale(locale);
  const payload = (globalThis as ClientUiGlobal).__ZDX_UI__;
  if (!payload || payload.locale !== releasedLocale || !payload.messages) {
    throw new Error(`Missing client UI catalog for ${releasedLocale}`);
  }
  return payload.messages;
}

export function clientUiMessage(locale: Locale, key: UiKey): string {
  const message = clientUi(locale)[key];
  if (typeof message !== 'string') {
    throw new Error(`Missing client UI message ${locale}.${String(key)}`);
  }
  return message;
}
