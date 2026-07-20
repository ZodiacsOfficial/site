import type { SavedChart } from '../profile/schema';

export type DailyEmailTier = 'sun_sign' | 'chart';

interface RecipientBase {
  email: string;
  timezone: string;
}

export interface SunSignRecipient extends RecipientBase {
  tier: 'sun_sign';
  sign: string;
  contactId: string;
  timezone: 'UTC';
}

export interface ChartRecipient extends RecipientBase {
  tier: 'chart';
  userId: string;
  chartId: string;
  chart: SavedChart;
}

export type DailyEmailRecipient = SunSignRecipient | ChartRecipient;

export interface DailyEmailMessage {
  subject: string;
  preheader: string;
  text: string;
  html: string;
  unsubscribeUrl: string;
}

export interface DeliveryReport {
  considered: number;
  reserved: number;
  sent: number;
  failed: number;
  duplicate: number;
  dryRun: number;
}
