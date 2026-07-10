import type { APIRoute } from 'astro';
import { extname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { isAuthenticated } from '../../../lib/auth';

export const prerender = false;

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const IS_VERCEL = !!process.env.VERCEL;
const HAS_BLOB = !!(process.env.VERCEL && process.env.BLOB_STORE_ID);

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

  if (HAS_BLOB) {
    const { put } = await import('@vercel/blob');
    const blob = await put(filename, file, { access: 'public' });
    return new Response(JSON.stringify({ url: blob.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (IS_VERCEL) {
    // No Blob token: store in /tmp and serve via data URL (temporary)
    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpPath = `/tmp/gallery-${Date.now()}${ext}`;
    writeFileSync(tmpPath, buffer);
    const base64 = buffer.toString('base64');
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
    };
    const dataUrl = `data:${mimeMap[ext] ?? 'image/jpeg'};base64,${base64}`;
    return new Response(JSON.stringify({ url: dataUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Local dev
  const localFilename = `gallery-${Date.now()}${ext}`;
  const dir = join(process.cwd(), 'public', 'images', 'gallery');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, localFilename), Buffer.from(await file.arrayBuffer()));
  return new Response(JSON.stringify({ url: `/images/gallery/${localFilename}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
