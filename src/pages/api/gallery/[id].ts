import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { updatePhoto, deletePhoto } from '../../../lib/gallery';

export const prerender = false;

export const PUT: APIRoute = async ({ request, params }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });
  const body = await request.json();
  const updated = updatePhoto(id, body);
  if (!updated) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });
  const { id } = params;
  if (!id) return new Response('Missing id', { status: 400 });
  const ok = deletePhoto(id);
  if (!ok) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify({ ok: true }));
};
