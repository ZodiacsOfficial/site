import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import mdx from '@astrojs/mdx';

function interactionDirective() {
  return {
    name: 'zodiacs-interaction-directive',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({
          name: 'interaction',
          entrypoint: './src/client-directives/interaction.ts',
        });
      },
    },
  };
}

// Static output on Vercel. No @astrojs/sitemap: the sitemap must also cover
// the legacy wing served verbatim from public/, so it is composed by the
// custom endpoint at src/pages/sitemap.xml.ts instead.
export default defineConfig({
  site: 'https://zodiacs.org',
  trailingSlash: 'ignore',
  i18n: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [interactionDirective(), preact(), mdx()],
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // The default CSS minifier collapses standard + -webkit- property
      // pairs down to the -webkit- spelling, which current Chromium no
      // longer aliases — that silently kills every backdrop-filter
      // (nav blur, glass chrome). esbuild minifies without merging.
      cssMinify: 'esbuild',
    },
  },
});
