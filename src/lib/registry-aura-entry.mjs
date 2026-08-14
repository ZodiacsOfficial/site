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
const ENTRY_HIDDEN_SLOT = `<div hidden aria-hidden="true">${REGISTRY_AURA_ENTRY_SLOT}</div>`;
const ENTRY_HIDDEN_REGION = /<div hidden aria-hidden="true"><!-- registry-collection-entry:slot --><\/div>(?:\n[ \t]*<!-- registry-collection-entry:start -->[\s\S]*?<!-- registry-collection-entry:end -->)?/;
const HERO_START = '<!-- registry-collection-hero:start -->';
const HERO_END = '<!-- registry-collection-hero:end -->';
const HERO_REGION = /<!-- registry-collection-hero:slot -->(?:\n[ \t]*<!-- registry-collection-hero:start -->[\s\S]*?<!-- registry-collection-hero:end -->)?/;
const HERO_HIDDEN_SLOT = `<div hidden aria-hidden="true">${REGISTRY_AURA_HERO_SLOT}</div>`;
const HERO_HIDDEN_REGION = /<div hidden aria-hidden="true"><!-- registry-collection-hero:slot --><\/div>(?:\n[ \t]*<!-- registry-collection-hero:start -->[\s\S]*?<!-- registry-collection-hero:end -->)?/;
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

const CABINET_SAMPLE = Object.freeze([
  { slug: 'aries', symbol: '♈', finish: 'crown', numeral: 'V', count: '×12', sculpture: true },
  { slug: 'taurus', symbol: '♉' },
  { slug: 'gemini', symbol: '♊' },
  { slug: 'cancer', symbol: '♋', finish: 'pastel', numeral: 'I' },
  { slug: 'leo', symbol: '♌', finish: 'bronze', numeral: 'II' },
  { slug: 'virgo', symbol: '♍' },
  { slug: 'libra', symbol: '♎' },
  { slug: 'scorpio', symbol: '♏', finish: 'silver', numeral: 'III' },
  { slug: 'sagittarius', symbol: '♐' },
  { slug: 'capricorn', symbol: '♑' },
  { slug: 'aquarius', symbol: '♒', finish: 'gold', numeral: 'IV', count: '×3', sculpture: true },
  { slug: 'pisces', symbol: '♓' },
]);

function renderCabinetSeat(item, index) {
  const occupied = Boolean(item.finish);
  const className = `consumer-cabinet__seat ${occupied ? `is-filled is-${item.finish}` : 'is-empty'}`;
  const number = String(index + 1).padStart(2, '0');
  if (!occupied) {
    return `<span class="${className}" style="--seat-i:${index}"><span class="consumer-cabinet__number">${number}</span><span class="consumer-cabinet__glyph">${item.symbol}</span></span>`;
  }
  const imagePath = item.sculpture
    ? `/assets/cabinet-materials/gold/${item.slug}`
    : `/assets/zodiac-icons/128/${item.slug}`;
  const count = item.count ? `<span class="consumer-cabinet__count">${item.count}</span>` : '';
  return `<span class="${className}" style="--seat-i:${index}" data-cabinet-sample-finish="${item.finish}"><span class="consumer-cabinet__number">${number}</span><picture><source srcset="${imagePath}.avif" type="image/avif"><img src="${imagePath}.webp" width="128" height="128" alt="" loading="lazy" decoding="async"></picture><span class="consumer-cabinet__edition">${item.numeral}</span>${count}</span>`;
}

function renderNoJsEntry() {
  const seats = CABINET_SAMPLE.map(renderCabinetSeat).join('');
  return `${ENTRY_START}
          <article class="static-collection" data-registry-collection-entry data-registry-collection>
            <a class="static-collection__link" href="${REGISTRY_AURA_PATH}" aria-label="${REGISTRY_AURA_HERO_COPY.ariaLabel}">
              <div class="static-collection__copy">
                <small class="static-collection__eyebrow">A public collection</small>
              <h3>Cabinet of Twelve</h3>
              <p>${REGISTRY_AURA_ENTRY_COPY.description}</p>
              </div>
              <div class="static-collection__art" aria-hidden="true"><div class="consumer-cabinet"><div class="consumer-cabinet__seats">${seats}</div><span class="consumer-cabinet__plaque"><strong>5 / 12</strong><span>Curator’s sample</span></span></div></div>
              <span class="static-collection__cta">${REGISTRY_AURA_ENTRY_COPY.link}</span>
            </a>
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
    .replace(HERO_HIDDEN_REGION, HERO_HIDDEN_SLOT)
    .replace(ENTRY_HIDDEN_REGION, ENTRY_HIDDEN_SLOT)
    .replace(HERO_REGION, REGISTRY_AURA_HERO_SLOT)
    .replace(ENTRY_REGION, REGISTRY_AURA_ENTRY_SLOT)
    .replace(META, `<meta name="${REGISTRY_AURA_META_NAME}" content="${enabled ? '1' : '0'}" />`);
  if (enabled) {
    const heroTarget = output.includes(HERO_HIDDEN_SLOT) ? HERO_HIDDEN_SLOT : REGISTRY_AURA_HERO_SLOT;
    const entryTarget = output.includes(ENTRY_HIDDEN_SLOT) ? ENTRY_HIDDEN_SLOT : REGISTRY_AURA_ENTRY_SLOT;
    output = output.replace(heroTarget, `${heroTarget}\n              ${renderNoJsHeroAction()}`);
    output = output.replace(entryTarget, `${entryTarget}\n          ${renderNoJsEntry()}`);
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
