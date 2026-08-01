import { readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANALYTICS_EVENT_PROPS } from '../src/lib/analytics-config.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const START = '<!-- zodiacs-analytics:start -->';
const END = '<!-- zodiacs-analytics:end -->';
const BLOCK = new RegExp(`\\n?${START}[\\s\\S]*?${END}\\n?`, 'g');

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function injectLegacyAnalytics(html, config = {}) {
  const clean = html.replace(BLOCK, '');
  const scriptUrl = config.scriptUrl?.trim();
  if (!scriptUrl) return clean;
  if (!clean.includes('</head>')) throw new Error('legacy analytics target has no </head>');

  const endpoint = config.endpoint?.trim() ?? '';
  const domain = config.domain?.trim() ?? '';
  const domainAttribute = domain ? ` data-domain="${escapeAttribute(domain)}"` : '';
  const setup = `
${START}
<script>
  window.plausible = window.plausible || function () {
    (window.plausible.q = window.plausible.q || []).push(arguments);
  };
  window.plausible.init = window.plausible.init || function (options) {
    window.plausible.o = options || {};
  };
  (function () {
    var endpoint = ${JSON.stringify(endpoint)};
    var options = {
      hashBasedRouting: false,
      transformRequest: function (payload) {
        var canonical = document.querySelector('link[rel="canonical"]');
        payload.u = canonical ? canonical.href : location.origin + location.pathname;
        payload.r = null;
        if (payload.p && payload.p.url) delete payload.p.url;
        return payload;
      }
    };
    if (endpoint) options.endpoint = endpoint;
    window.plausible.init(options);
    var eventProps = Object.freeze(${JSON.stringify(ANALYTICS_EVENT_PROPS)});
    window.zodiacsAnalytics = Object.freeze({
      track: function (name, props) {
        var allowed = eventProps[name];
        if (!allowed) return;
        var safe = {};
        allowed.forEach(function (key) {
          var value = (props || {})[key];
          if (typeof value === 'number' || typeof value === 'boolean' ||
              (typeof value === 'string' && value.length <= 32)) safe[key] = value;
        });
        window.plausible(name, { props: safe });
      }
    });
  }());
</script>
<script defer${domainAttribute} src="${escapeAttribute(scriptUrl)}"></script>
${END}
`;
  return clean.replace('</head>', `${setup}</head>`);
}

async function registryHtmlFiles() {
  const directory = resolve(root, 'public/registry');
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (entry.isFile() && entry.name.endsWith('.html')) return [join(directory, entry.name)];
    if (entry.isDirectory()) return [join(directory, entry.name, 'index.html')];
    return [];
  });
}

export async function configureLegacyAnalytics(config = {}) {
  const targets = [
    ...(await registryHtmlFiles()),
    resolve(root, 'public/archive/index.html'),
    resolve(root, 'public/sdk/index.html'),
    resolve(root, 'public/thesis/index.html'),
  ];
  let changed = 0;
  for (const target of targets) {
    const before = await readFile(target, 'utf8');
    const after = injectLegacyAnalytics(before, config);
    if (after !== before) {
      await writeFile(target, after, 'utf8');
      changed += 1;
    }
  }

  // A previous configured build must not leave provider code in a later
  // environment where analytics has been deliberately disabled.
  if (!config.scriptUrl) {
    await unlink(resolve(root, 'public/assets/analytics.js')).catch(() => {});
  }
  return { targets: targets.length, changed };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await configureLegacyAnalytics({
    scriptUrl: process.env.PUBLIC_PLAUSIBLE_SCRIPT_URL,
    endpoint: process.env.PUBLIC_PLAUSIBLE_ENDPOINT,
    domain: process.env.PUBLIC_PLAUSIBLE_DOMAIN,
  });
  console.log(`Legacy analytics: ${result.changed}/${result.targets} pages updated (${process.env.PUBLIC_PLAUSIBLE_SCRIPT_URL ? 'enabled' : 'disabled'}).`);
}
