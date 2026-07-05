/**
 * Typed adapter over the wing's catalogue lore (scripts/sign-data.mjs).
 * The Babylonian/Greek/heritage material is genuinely good and stays
 * single-sourced for both wings — but the final `note` paragraph of
 * each entry carries the on-chain record framing, so the guides drop it
 * (verified: all token language is confined there).
 */
// @ts-ignore — plain ESM data module shared with the wing generators.
import { SIGN_PAGES } from '../../../scripts/sign-data.mjs';

export interface Heritage {
  epithet: string;
  lede: string;
  paragraphs: string[];
  babylonianRecord: string;
  principalStar: { name: string; note: string };
  provenanceBabylon: string;
  provenanceGreece: string;
  provenancePrelude?: { era: string; place: string; body: string };
}

export function heritage(slug: string): Heritage {
  const page = (SIGN_PAGES as Record<string, any>)[slug];
  if (!page) throw new Error(`No lore for sign: ${slug}`);
  return {
    epithet: page.epithet,
    lede: page.lede,
    paragraphs: (page.note as string[]).slice(0, -1),
    babylonianRecord: page.babylonianRecord,
    principalStar: page.principalStar,
    provenanceBabylon: page.provenanceBabylon,
    provenanceGreece: page.provenanceGreece,
    provenancePrelude: page.provenancePrelude,
  };
}
