import type { PositionsShareChart } from '../share-positions';
import type { SignSlug } from '../scene/types';

export type InviteState = 'waiting' | 'opened' | 'completed' | 'revoked' | 'expired';
export type InviteOpenState = 'ready' | 'unavailable';

export interface InvitePublicPayload {
  version: 1;
  label: string;
  sunSign: SignSlug;
  positions: PositionsShareChart;
  timeKnown: boolean;
  expiresAt: string;
}

export interface InviteStatusRow {
  id: string;
  label: string;
  sunSign: SignSlug;
  state: InviteState;
  createdAt: string;
  expiresAt: string;
  openedAt: string | null;
  closedAt: string | null;
  hiddenAt: string | null;
}

export interface CreateInviteInput {
  chartId: string;
  consent: true;
  notify: boolean;
}

export interface CreateInviteResult {
  id: string;
  url: string;
  expiresAt: string;
}

export type InviteAnalyticsState =
  | 'ready'
  | 'invalid'
  | 'closed'
  | 'used'
  | 'unavailable'
  | 'offline';
