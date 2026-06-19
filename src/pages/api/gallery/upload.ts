import type { APIRoute } from 'astro';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { isAuthenticated } from '../../../lib/auth';

export const prerender = false;

const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
  }

  const filename = `gallery-${Date.now()}${ext}`;
  const dir = join(process.cwd(), 'public', 'images', 'gallery');
  mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(join(dir, filename), buffer);

  return new Response(JSON.stringify({ url: `/images/gallery/${filename}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
