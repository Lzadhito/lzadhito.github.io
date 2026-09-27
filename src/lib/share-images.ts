import { noteStamp, shortDate } from './format';
import { ogImage, storyImage, type ImagePost } from './images';
import { plainText, postExcerpt, postLabel, type Post } from './posts';

export function imagePost(post: Post): ImagePost {
  if (post.data.type === 'essay') {
    return {
      type: 'essay',
      text: post.data.title ?? '',
      excerpt: postExcerpt(post, 400),
      dateLine: shortDate(post.data.published),
    };
  }
  return {
    type: 'note',
    text: plainText(post.body ?? ''),
    dateLine: noteStamp(post.data.created, true),
  };
}

export const storyPng = (post: Post) => storyImage(imagePost(post));
export const ogPng = (post: Post) => ogImage({ title: postLabel(post) });

export const png = (data: Uint8Array) =>
  new Response(data as BodyInit, { headers: { 'Content-Type': 'image/png' } });
