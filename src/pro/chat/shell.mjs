import {
  PRO_CHAT_PHASE,
  PRO_CHAT_ROOM,
  PRO_CHAT_RULES,
  PRO_CHAT_SHELL_COPY,
  PRO_CHAT_SYSTEM_STATES,
} from './contracts.mjs';

let shellSequence = 0;

function appendNode(document, parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent.appendChild(node);
  return node;
}

export function createReadOnlyTrollbox({ host } = {}) {
  const document = host?.ownerDocument;
  if (!host || typeof host.appendChild !== 'function' || !document?.createElement) {
    throw new TypeError('A DOM host is required to mount the read-only Trollbox.');
  }

  shellSequence += 1;
  const titleId = `rp-chat-title-${shellSequence}`;
  const explanationId = `rp-chat-explanation-${shellSequence}`;

  const shell = document.createElement('aside');
  shell.className = 'rp-chat';
  shell.setAttribute('data-chat-mode', PRO_CHAT_PHASE);
  shell.setAttribute('aria-labelledby', titleId);

  const header = appendNode(document, shell, 'header', 'rp-chat__header');
  appendNode(document, header, 'p', 'rp-chat__room', PRO_CHAT_ROOM.label);
  const title = appendNode(document, header, 'h2', 'rp-chat__title', PRO_CHAT_SHELL_COPY.title);
  title.id = titleId;
  appendNode(document, header, 'p', 'rp-chat__status', PRO_CHAT_SHELL_COPY.status)
    .setAttribute('role', 'status');

  const log = appendNode(document, shell, 'div', 'rp-chat__log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-label', `${PRO_CHAT_ROOM.label} system notices`);
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-relevant', 'additions text');

  for (const state of PRO_CHAT_SYSTEM_STATES) {
    const message = appendNode(document, log, 'article', 'rp-chat__message rp-chat__message--system');
    message.setAttribute('data-system-state', state.id);
    appendNode(document, message, 'p', 'rp-chat__message-label', state.label);
    appendNode(document, message, 'p', 'rp-chat__message-body', state.body);
  }

  const rules = appendNode(document, shell, 'section', 'rp-chat__rules');
  rules.setAttribute('aria-label', PRO_CHAT_SHELL_COPY.rulesLabel);
  appendNode(document, rules, 'p', 'rp-chat__rules-label', PRO_CHAT_SHELL_COPY.rulesLabel);
  appendNode(document, rules, 'p', 'rp-chat__rules-list', PRO_CHAT_RULES.join(' · '));

  const composer = appendNode(document, shell, 'div', 'rp-chat__composer');
  composer.setAttribute('aria-disabled', 'true');
  const label = appendNode(document, composer, 'label', 'rp-chat__composer-label', PRO_CHAT_SHELL_COPY.composerLabel);
  const input = appendNode(document, composer, 'textarea', 'rp-chat__composer-input');
  input.id = `rp-chat-input-${shellSequence}`;
  input.disabled = true;
  input.rows = 2;
  input.maxLength = 280;
  input.placeholder = PRO_CHAT_SHELL_COPY.composerPlaceholder;
  input.setAttribute('aria-describedby', explanationId);
  label.setAttribute('for', input.id);

  const explanation = appendNode(
    document,
    composer,
    'p',
    'rp-chat__composer-explanation',
    PRO_CHAT_SHELL_COPY.composerExplanation,
  );
  explanation.id = explanationId;

  const submit = appendNode(document, composer, 'button', 'rp-chat__submit', PRO_CHAT_SHELL_COPY.submitLabel);
  submit.type = 'button';
  submit.disabled = true;

  host.appendChild(shell);

  return Object.freeze({
    destroy() {
      shell.remove();
    },
  });
}
