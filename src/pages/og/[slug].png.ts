import type { APIContext } from 'astro';
import { getPosts } from '../../lib/posts';
import { ogPng, png } from '../../lib/share-images';

export async function getStaticPaths() {
  return (await getPosts()).map((post) => ({ params: { slug: post.data.slug }, props: { post } }));
}

export async function GET({ props }: APIContext) {
  return png(await ogPng(props.post));
}
