import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { SIGN_SLUGS } from './lib/signs';

const signEnum = z.enum(SIGN_SLUGS as [string, ...string[]]);

const guides = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/guides' }),
  schema: z.object({
    sign: signEnum,
    title: z.string(),
    description: z.string().max(170),
    /** Compatibility shortlists — 3 easeful, 3 charged, by slug. */
    compat: z.object({
      easeful: z.array(signEnum).length(3),
      charged: z.array(signEnum).length(3),
    }),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).min(4),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Compatibility pair pages. Filename IS the canonical slug ({a}-{b} in
 * zodiac order); the signs tuple must match it — the pair route asserts
 * id === pairSlug(signs) at build time. Prose only: element/modality/
 * polarity facts are computed from signs.ts and rendered by the page.
 */
const pairs = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/pairs' }),
  schema: z.object({
    signs: z
      .tuple([signEnum, signEnum])
      .refine(
        ([a, b]) => SIGN_SLUGS.indexOf(a) <= SIGN_SLUGS.indexOf(b),
        { message: 'Pair signs must be in zodiac order (aries first, pisces last).' },
      ),
    title: z.string(),
    description: z.string().max(170),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

/**
 * Learn cluster pages, organized by subdirectory: planets/, houses/,
 * aspects/. The id carries the subdir ("planets/saturn") and kind is the
 * discriminator the hub + slug routes filter on.
 */
const learn = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/learn' }),
  schema: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('planet'),
      planet: z.enum(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']),
      title: z.string(),
      description: z.string().max(170),
      /** One-line function of the planet, in the house voice. */
      role: z.string(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
    z.object({
      kind: z.literal('house'),
      house: z.number().int().min(1).max(12),
      title: z.string(),
      description: z.string().max(170),
      /** One-line territory of the house. */
      theme: z.string(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
    z.object({
      kind: z.literal('aspect'),
      aspect: z.enum(['conjunction', 'sextile', 'square', 'trine', 'opposition']),
      angle: z.number(),
      title: z.string(),
      description: z.string().max(170),
      /** One-line character of the aspect. */
      theme: z.string(),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
    z.object({
      kind: z.literal('placement'),
      planet: z.enum(['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']),
      sign: signEnum,
      title: z.string(),
      description: z.string().max(170),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
    // Rising-sign profiles route at /rising-sign/{sign}/, not /learn/ —
    // the sitemap's learn loop must keep filtering this kind out.
    z.object({
      kind: z.literal('rising'),
      sign: signEnum,
      title: z.string(),
      description: z.string().max(170),
      faq: z.array(z.object({ q: z.string(), a: z.string() })).min(3),
      updated: z.coerce.date(),
      draft: z.boolean().default(false),
    }),
  ]),
});

/**
 * Monthly horoscopes. Files accumulate as YYYY-MM-{sign}.mdx; the route
 * renders the latest month present and labels it from frontmatter — the
 * wall clock never decides what displays.
 */
const horoscopes = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/horoscopes' }),
  schema: z.object({
    sign: signEnum,
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be YYYY-MM'),
    updated: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { guides, pairs, learn, horoscopes };
