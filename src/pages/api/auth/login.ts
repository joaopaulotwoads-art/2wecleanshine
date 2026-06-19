export const prerender = false;
import type { APIRoute } from 'astro';
import { checkCredentials, createSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const user = (form.get('user') as string)?.trim() ?? '';
  const pass = (form.get('pass') as string) ?? '';
  const next = (form.get('next') as string) || '/admin';

  if (!checkCredentials(user, pass)) {
    return redirect('/login?error=invalid');
  }

  const token = createSession();
  const cookie = `admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24}`;

  return new Response(null, {
    status: 302,
    headers: { Location: next, 'Set-Cookie': cookie },
  });
};
