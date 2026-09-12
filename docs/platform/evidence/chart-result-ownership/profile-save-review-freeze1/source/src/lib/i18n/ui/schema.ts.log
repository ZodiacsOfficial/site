import type { Locale } from '../core';
import type en from './en';

export type UiKey = keyof typeof en;
export type UiCatalog = Record<UiKey, string>;

export interface ClientUiPayload {
  locale: Locale;
  messages: UiCatalog;
}
