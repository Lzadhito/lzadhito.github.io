import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts');
  return posts.sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf());
}

export const postUrl = (post: Post) => `/blog/${post.data.slug}/`;

/** Markdown → plain paragraphs (blank-line separated), for previews and images. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|\*|_|`)/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** First sentence of a body, used as a Note's label in lists and previews. */
export function firstSentence(markdown: string): string {
  const text = plainText(markdown).replace(/\s+/g, ' ');
  const m = text.match(/^.*?[.!?…](?=\s|$)/);
  return (m ? m[0] : text).trim();
}

/** What a post is called wherever a label is needed (lists, previews, images). */
export function postLabel(post: Post): string {
  return post.data.type === 'essay' && post.data.title
    ? post.data.title
    : post.data.title || firstSentence(post.body ?? '');
}

export function postExcerpt(post: Post, max = 160): string {
  if (post.data.excerpt) return post.data.excerpt;
  const text = plainText(post.body ?? '').replace(/\s+/g, ' ');
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/** Whole minutes at 230 wpm, never below 1. */
export function readingMinutes(markdown: string): number {
  const words = plainText(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
