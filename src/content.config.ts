import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// One post object, two types (PRD "Content model"). Only files in content/posts/
// are published; content/drafts/ is never loaded.
const posts = defineCollection({
  // Entry id is the ULID, not the slug: the slug is a frontmatter field and only
  // decides the URL (A7).
  loader: glob({
    base: './content/posts',
    pattern: '**/*.md',
    generateId: ({ data }) => String(data.id),
  }),
  schema: z
    .object({
      id: z.coerce.string(),
      type: z.enum(['note', 'essay']),
      title: z.string().nullish(),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      created: z.coerce.date(),
      updated: z.coerce.date(),
      published: z.coerce.date(),
      excerpt: z.string().nullish(),
    })
    .refine((p) => p.type !== 'essay' || !!p.title, {
      message: 'Essays require a title',
      path: ['title'],
    }),
});

const pages = defineCollection({
  loader: glob({ base: './content/pages', pattern: '**/*.md' }),
  schema: z.object({ title: z.string().optional() }),
});

export const collections = { posts, pages };
