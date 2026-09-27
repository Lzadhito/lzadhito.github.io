import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { marked } from 'marked';
import { AUTHOR, SITE_DESCRIPTION } from '../consts';
import { getPosts, postExcerpt, postLabel, postUrl } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: AUTHOR,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: posts.map((post) => ({
      title: postLabel(post),
      description: postExcerpt(post),
      pubDate: post.data.published,
      link: postUrl(post),
      // Content is the author's own Markdown.
      content: marked.parse(post.body ?? '', { async: false }) as string,
    })),
  });
}
