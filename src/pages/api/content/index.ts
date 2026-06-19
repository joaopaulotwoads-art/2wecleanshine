import type { APIRoute } from 'astro';
import { isAuthenticated } from '../../../lib/auth';
import { getContent, updateContent } from '../../../lib/content';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });
  return new Response(JSON.stringify(getContent()), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });
  const body = await request.json();
  const updated = updateContent(body);
  return new Response(JSON.stringify(updated), {
    headers: { 'Content-Type': 'application/json' },
  });
};
