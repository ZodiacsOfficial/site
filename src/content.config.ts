import { defineCollection, z } from 'astro:content';
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

export const collections = { guides };
