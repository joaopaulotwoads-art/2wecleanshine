export const prerender = false;
import type { APIRoute } from 'astro';
import { getToken, destroySession } from '../../../lib/auth';

export const POST: APIRoute = ({ request, redirect }) => {
  const token = getToken(request);
  if (token) destroySession(token);

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Max-Age=0',
    },
  });
};
