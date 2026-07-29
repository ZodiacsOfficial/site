// Builds the gallery scene bundle — public/assets/gallery.js.
//
//   node scripts/build-shelf.mjs
//
// (The source folder and this script keep their original names; the public
// surface is the gallery band on /registry/. Renaming them is a follow-up,
// not a prerequisite.)
//
// The band on the registry page is the one gallery since the owner retired
// the standalone /registry/gallery/ page (2026-07-28; vercel.json 301s the
// old URL home). The twelve records are read from
// registry/zodiacs.registry.json and scripts/sign-data.mjs and baked into
// the bundle, so the band cannot disagree with the catalogue it stands for.
// Addresses are NOT baked: the card fetches them from the registry file when
// a figure is drawn out, which keeps one answer on the site to what a sign's
// mint is. The sculptures' geometry and plates come from
// scripts/build-figure-assets.mjs.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

import { readFigures } from '../src/shelf/figures.mjs';
import { MARKET_PAIRS } from './sign-data.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SCRIPT_OUT = resolve(root, 'public/assets/gallery.js');
const SCRIPT_SRC = resolve(root, 'src/shelf/main.mjs');

const figures = await readFigures();

// ---- the scene bundle --------------------------------------------------------

// Only what the scene needs to letter a plinth and a hallmark, and what the
// card needs to describe the piece. No addresses.
const figureData = figures.map((figure) => ({
  slug: figure.slug,
  order: figure.order,
  lot: figure.lot,
  name: figure.name,
  glyph: figure.glyph,
  figure: figure.figure,
  epithet: figure.epithet,
  hue: figure.hue,
  element: figure.element,
  modality: figure.modality,
  ruler: figure.ruler,
  archetype: figure.archetype,
  dates: figure.dates,
  datesShort: figure.datesShort,
  star: figure.star,
  // The Dex Screener pair is venue routing, baked here exactly as the sign
  // pages bake it. Registry identity (mints) stays out of the page — the
  // card reads those live. Cancer and Sagittarius have no indexed pair and
  // show a quiet unavailable state instead.
  market: MARKET_PAIRS[figure.slug] ?? null,
}));

await esbuild.build({
  entryPoints: [SCRIPT_SRC],
  outfile: SCRIPT_OUT,
  bundle: true,
  format: 'iife',
  target: ['es2020', 'safari15'],
  minify: true,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
    // The records ride inside the bundle so any page with the stage skeleton
    // can host the row; the standalone page's JSON island stays authoritative
    // when present, and both are stamped from the same readFigures() call.
    __GALLERY_FIGURES__: JSON.stringify(figureData),
  },
  banner: {
    js: '/* Generated from src/shelf/ by scripts/build-shelf.mjs — do not edit directly. */',
  },
});

process.stdout.write(
  `gallery: wrote assets/gallery.js (${figures.length} sculptures baked)\n`,
);
