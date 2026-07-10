import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getPhotos, addPhoto } from '../../../lib/gallery';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  return new Response(JSON.stringify(await getPhotos()), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const body = await request.json();
  const { src, label, caption } = body;
  if (!src || !label) {
    return new Response(JSON.stringify({ error: 'src and label required' }), { status: 400 });
  }
  const photo = await addPhoto({ src, label: label.trim(), caption: caption?.trim() || '' });
  return new Response(JSON.stringify(photo), { status: 201, headers: { 'Content-Type': 'application/json' } });
};
