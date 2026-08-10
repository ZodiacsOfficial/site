export const PRO_CHAT_PHASE = 'preview';

export const PRO_CHAT_ROOM = Object.freeze({
  id: 'global',
  label: 'All markets',
});

export const PRO_CHAT_RULES = Object.freeze([
  'No links',
  'No wallet or contract addresses',
  'No images',
  'No direct messages',
]);

export const PRO_CHAT_SYSTEM_STATES = Object.freeze([
  Object.freeze({
    id: 'connection',
    label: 'System',
    body: 'Market Chat is not connected in this build.',
  }),
  Object.freeze({
    id: 'approval',
    label: 'System',
    body: 'Posting remains closed until wallet sign-in, moderation, retention and privacy controls are separately approved.',
  }),
]);

// These closed values reserve the future server contract. The preview does not submit them.
export const PRO_CHAT_REPORT_REASONS = Object.freeze([
  'spam',
  'scam',
  'manipulation',
  'harassment',
  'impersonation',
  'privacy',
  'threats',
  'unlawful_content',
]);

export const PRO_CHAT_MODERATION_ACTIONS = Object.freeze([
  'quarantine',
  'remove',
  'restore',
  'mute',
  'ban',
  'revoke_session',
  'pause_posting',
]);

export const PRO_CHAT_SHELL_COPY = Object.freeze({
  title: 'Market Chat',
  status: 'Read-only design preview',
  rulesLabel: 'Room rules',
  composerLabel: 'Message',
  composerPlaceholder: 'Posting is not available in this preview.',
  composerExplanation: 'The composer is disabled. This preview makes no wallet, network or storage request.',
  submitLabel: 'Post',
});
