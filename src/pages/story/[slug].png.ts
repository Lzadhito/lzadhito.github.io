import type { APIContext } from 'astro';
import { getPosts } from '../../lib/posts';
import { png, storyPng } from '../../lib/share-images';

export async function getStaticPaths() {
  return (await getPosts()).map((post) => ({ params: { slug: post.data.slug }, props: { post } }));
}

export async function GET({ props }: APIContext) {
  return png(await storyPng(props.post));
}
