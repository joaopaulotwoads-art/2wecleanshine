import type { APIRoute } from 'astro';
import { extname } from 'node:path';
import { isAuthenticated } from '../../../lib/auth';

export const prerender = false;

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const IS_VERCEL = !!(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
  }

  const filename = `gallery/gallery-${Date.now()}${ext}`;

  if (IS_VERCEL) {
    const { put } = await import('@vercel/blob');
    const blob = await put(filename, file, { access: 'public' });
    return new Response(JSON.stringify({ url: blob.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Local dev: write to public/images/gallery/
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const localFilename = `gallery-${Date.now()}${ext}`;
  const dir = join(process.cwd(), 'public', 'images', 'gallery');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, localFilename), Buffer.from(await file.arrayBuffer()));

  return new Response(JSON.stringify({ url: `/images/gallery/${localFilename}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
