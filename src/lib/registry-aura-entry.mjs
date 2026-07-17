export const REGISTRY_AURA_FLAG = 'PUBLIC_REGISTRY_AURA_ENABLED';
export const REGISTRY_AURA_PATH = '/registry/aura/';
export const REGISTRY_AURA_RETURN_KEY = 'registry-aura';
export const REGISTRY_AURA_META_NAME = 'zodiacs-registry-aura-enabled';
export const REGISTRY_AURA_ENTRY_SLOT = '<!-- registry-aura-entry:slot -->';

export const REGISTRY_AURA_ENTRY_COPY = Object.freeze({
  title: 'Registry Aura — where your collection meets your chart',
  description: 'For Zodiac collectors: see which official signs at one public address echo a saved birth chart and today’s sky. Start with the example — no wallet needed.',
  link: 'See how Registry Aura works →',
});

export const REGISTRY_AURA_HERO_COPY = Object.freeze({
  cta: 'See where your collection meets your chart',
  why: 'Why this exists',
});

const ENTRY_START = '<!-- registry-aura-entry:start -->';
const ENTRY_END = '<!-- registry-aura-entry:end -->';
const ENTRY_REGION = /<!-- registry-aura-entry:slot -->(?:\n[ \t]*<!-- registry-aura-entry:start -->[\s\S]*?<!-- registry-aura-entry:end -->)?/;
const META = /<meta name="zodiacs-registry-aura-enabled" content="(?:0|1)" \/>/;
const HERO_CTA_START = '<!-- registry-aura-hero:cta -->';
const HERO_CTA_END = '<!-- /registry-aura-hero:cta -->';
const HERO_CTA_REGION = /<!-- registry-aura-hero:cta -->[\s\S]*?<!-- \/registry-aura-hero:cta -->/;
const HERO_WHY_SLOT = '<!-- registry-aura-hero:why -->';
const HERO_WHY_REGION = /<!-- registry-aura-hero:why -->(?:<a class="cine__why"[\s\S]*?<\/a>)?/;

export function registryAuraEnabled(env = {}) {
  return env[REGISTRY_AURA_FLAG] === '1';
}

export function registryAuraChartLink(search = '', env = {}) {
  if (!registryAuraEnabled(env)) return null;
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  return {
    href: REGISTRY_AURA_PATH,
    context: params.get('return') === REGISTRY_AURA_RETURN_KEY ? 'return' : 'discover',
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
    ? { loc: REGISTRY_AURA_PATH, priority: 0.6, lastmod: '2026-07-16' }
    : null;
}

function renderNoJsEntry() {
  return `${ENTRY_START}
          <article class="static-site__card" data-registry-aura-entry>
            <h3>${REGISTRY_AURA_ENTRY_COPY.title}</h3>
            <p>${REGISTRY_AURA_ENTRY_COPY.description}</p>
            <p><a href="${REGISTRY_AURA_PATH}">${REGISTRY_AURA_ENTRY_COPY.link}</a></p>
          </article>
          ${ENTRY_END}`;
}

// While the flag is on, the hero's secondary button belongs to Aura and the
// thesis drops to a small text link under the CTA row; while off, the region
// restores to the committed thesis button exactly (the CI drift gate diffs
// the flag-off stamp against the committed file).
function renderHeroCta(enabled) {
  return enabled
    ? `<a class="btn" href="${REGISTRY_AURA_PATH}"><span>${REGISTRY_AURA_HERO_COPY.cta}</span></a>`
    : '<a class="btn" href="/thesis/"><span>Why this exists</span></a>';
}

function renderHeroWhy(enabled) {
  return enabled
    ? `${HERO_WHY_SLOT}<a class="cine__why" href="/thesis/">${REGISTRY_AURA_HERO_COPY.why}</a>`
    : HERO_WHY_SLOT;
}

export function injectRegistryAuraLanding(source, env = {}) {
  if (!META.test(source)) {
    throw new Error(`Missing ${REGISTRY_AURA_META_NAME} build marker`);
  }
  if (!source.includes(REGISTRY_AURA_ENTRY_SLOT)) {
    throw new Error('Missing Registry Aura no-JS entry slot');
  }
  if (!HERO_CTA_REGION.test(source)) {
    throw new Error('Missing Registry Aura hero CTA markers');
  }
  if (!source.includes(HERO_WHY_SLOT)) {
    throw new Error('Missing Registry Aura hero why-link slot');
  }

  const enabled = registryAuraEnabled(env);
  let output = source
    .replace(ENTRY_REGION, REGISTRY_AURA_ENTRY_SLOT)
    .replace(HERO_CTA_REGION, `${HERO_CTA_START}${renderHeroCta(enabled)}${HERO_CTA_END}`)
    .replace(HERO_WHY_REGION, renderHeroWhy(enabled))
    .replace(META, `<meta name="${REGISTRY_AURA_META_NAME}" content="${enabled ? '1' : '0'}" />`);
  if (enabled) {
    output = output.replace(
      REGISTRY_AURA_ENTRY_SLOT,
      `${REGISTRY_AURA_ENTRY_SLOT}\n          ${renderNoJsEntry()}`,
    );
  }
  return { output, enabled };
}
