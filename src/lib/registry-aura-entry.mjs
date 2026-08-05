export const REGISTRY_COLLECTION_FLAG = 'PUBLIC_REGISTRY_COLLECTION_ENABLED';
/** Legacy flag name, still honored so existing deployments keep working. */
export const REGISTRY_AURA_FLAG = 'PUBLIC_REGISTRY_AURA_ENABLED';
export const REGISTRY_AURA_PATH = '/registry/collection/';
export const REGISTRY_AURA_RETURN_KEY = 'registry-collection';
export const REGISTRY_AURA_META_NAME = 'zodiacs-registry-collection-enabled';
export const REGISTRY_AURA_ENTRY_SLOT = '<!-- registry-collection-entry:slot -->';
export const REGISTRY_AURA_HERO_SLOT = '<!-- registry-collection-hero:slot -->';
export const REGISTRY_AURA_THESIS_SLOT = '<!-- registry-collection-thesis:slot -->';

export const REGISTRY_AURA_ENTRY_COPY = Object.freeze({
  title: 'The Cabinet of Twelve',
  description: 'Open a public collection as a Cabinet of Twelve, seal it with today’s date, then read the record behind every edition.',
  link: 'Explore the finished sample →',
});

export const REGISTRY_AURA_HERO_COPY = Object.freeze({
  cta: 'Open the Cabinet',
  ariaLabel: 'Open your Zodiac collection in the Cabinet of Twelve',
});

const ENTRY_START = '<!-- registry-collection-entry:start -->';
const ENTRY_END = '<!-- registry-collection-entry:end -->';
const ENTRY_REGION = /<!-- registry-collection-entry:slot -->(?:\n[ \t]*<!-- registry-collection-entry:start -->[\s\S]*?<!-- registry-collection-entry:end -->)?/;
const HERO_START = '<!-- registry-collection-hero:start -->';
const HERO_END = '<!-- registry-collection-hero:end -->';
const HERO_REGION = /<!-- registry-collection-hero:slot -->(?:\n[ \t]*<!-- registry-collection-hero:start -->[\s\S]*?<!-- registry-collection-hero:end -->)?/;
const THESIS_START = '<!-- registry-collection-thesis:start -->';
const THESIS_END = '<!-- registry-collection-thesis:end -->';
const THESIS_REGION = /<!-- registry-collection-thesis:slot -->(?:\n[ \t]*<!-- registry-collection-thesis:start -->[\s\S]*?<!-- registry-collection-thesis:end -->)?/;
const META = /<meta name="zodiacs-registry-collection-enabled" content="(?:0|1)" \/>/;

export function registryAuraEnabled(env = {}) {
  return (env[REGISTRY_COLLECTION_FLAG] ?? env[REGISTRY_AURA_FLAG]) === '1';
}

export function registryAuraChartLink(search = '', env = {}) {
  if (!registryAuraEnabled(env)) return null;
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  if (params.get('return') !== REGISTRY_AURA_RETURN_KEY) return null;
  return {
    href: REGISTRY_AURA_PATH,
    context: 'return',
  };
}

/** @returns {Array<{name: 'aura_entry' | 'aura_calculator', properties: Record<string, string>}>} */
export function registryAuraChartAnalytics(context) {
  const events = [{ name: 'aura_entry', properties: { source: 'birth-chart' } }];
  if (context === 'return') {
    events.unshift({ name: 'aura_calculator', properties: { direction: 'return' } });
  }
  return events;
}

export function registryAuraSitemapEntry(env = {}) {
  return registryAuraEnabled(env)
    ? { loc: REGISTRY_AURA_PATH, priority: 0.6, lastmod: '2026-07-24' }
    : null;
}

function renderNoJsEntry() {
  return `${ENTRY_START}
          <article class="static-site__card static-site__card--aura" data-registry-collection-entry>
            <div>
              <h3>${REGISTRY_AURA_ENTRY_COPY.title}</h3>
              <p>${REGISTRY_AURA_ENTRY_COPY.description}</p>
            </div>
            <div class="idctx__aura-action">
              <div class="idctx__aura-flow" aria-label="Cabinet of Twelve, dated seal, and the collection’s record">
                <span class="idctx__aura-step"><span aria-hidden="true">01</span>Cabinet of Twelve</span>
                <span class="idctx__aura-arrow" aria-hidden="true">→</span>
                <span class="idctx__aura-step"><span aria-hidden="true">02</span>Dated seal</span>
                <span class="idctx__aura-arrow" aria-hidden="true">→</span>
                <span class="idctx__aura-step"><span aria-hidden="true">03</span>The record</span>
              </div>
              <a class="idctx__card-link idctx__aura-link" href="${REGISTRY_AURA_PATH}">${REGISTRY_AURA_ENTRY_COPY.link}</a>
            </div>
          </article>
          ${ENTRY_END}`;
}

function renderNoJsHeroAction() {
  return `${HERO_START}
              <a class="btn btn--ghost" href="${REGISTRY_AURA_PATH}" aria-label="${REGISTRY_AURA_HERO_COPY.ariaLabel}" data-registry-collection><span>${REGISTRY_AURA_HERO_COPY.cta}</span><span class="cta-arr" aria-hidden="true">→</span></a>
              ${HERO_END}`;
}

function renderThesisAction() {
  return `${THESIS_START}
              <a class="thesis-close__action" data-thesis-cta="collection" href="${REGISTRY_AURA_PATH}"><span><strong>View a wallet collection</strong><small>Read-only · no signing</small></span><span class="thesis-close__arrow" aria-hidden="true">↗</span></a>
              ${THESIS_END}`;
}

export function injectRegistryAuraLanding(source, env = {}) {
  if (!META.test(source)) {
    throw new Error(`Missing ${REGISTRY_AURA_META_NAME} build marker`);
  }
  if (!source.includes(REGISTRY_AURA_ENTRY_SLOT)) {
    throw new Error('Missing Registry Collection no-JS entry slot');
  }
  if (!source.includes(REGISTRY_AURA_HERO_SLOT)) {
    throw new Error('Missing Registry Collection no-JS hero slot');
  }

  const enabled = registryAuraEnabled(env);
  let output = source
    .replace(HERO_REGION, REGISTRY_AURA_HERO_SLOT)
    .replace(ENTRY_REGION, REGISTRY_AURA_ENTRY_SLOT)
    .replace(META, `<meta name="${REGISTRY_AURA_META_NAME}" content="${enabled ? '1' : '0'}" />`);
  if (enabled) {
    output = output.replace(
      REGISTRY_AURA_HERO_SLOT,
      `${REGISTRY_AURA_HERO_SLOT}\n              ${renderNoJsHeroAction()}`,
    );
    output = output.replace(
      REGISTRY_AURA_ENTRY_SLOT,
      `${REGISTRY_AURA_ENTRY_SLOT}\n          ${renderNoJsEntry()}`,
    );
  }
  return { output, enabled };
}

export function injectRegistryAuraThesis(source, env = {}) {
  if (!source.includes(REGISTRY_AURA_THESIS_SLOT)) {
    throw new Error('Missing Registry Collection thesis slot');
  }

  const enabled = registryAuraEnabled(env);
  let output = source.replace(THESIS_REGION, REGISTRY_AURA_THESIS_SLOT);
  if (enabled) {
    output = output.replace(
      REGISTRY_AURA_THESIS_SLOT,
      `${REGISTRY_AURA_THESIS_SLOT}\n              ${renderThesisAction()}`,
    );
  }
  return { output, enabled };
}
