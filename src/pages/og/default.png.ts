// Shared preview for the home page and blog list, with the site intro line.
import { ogImage } from '../../lib/images';
import { png } from '../../lib/share-images';

export async function GET() {
  return png(await ogImage({ title: 'My own space, outside social media.' }));
}
