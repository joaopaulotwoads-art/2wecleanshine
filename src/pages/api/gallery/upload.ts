import type { APIRoute } from 'astro';
import { extname, join } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { isAuthenticated } from '../../../lib/auth';
import { putGithubFile } from '../../../lib/github';

export const prerender = false;

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const MAX_SIZE = 4 * 1024 * 1024; // 4MB — GitHub Contents API practical limit for base64 uploads
const IS_VERCEL = !!process.env.VERCEL;
const HAS_GITHUB = !!(process.env.VERCEL && process.env.GITHUB_TOKEN);

export const POST: APIRoute = async ({ request }) => {
  if (!isAuthenticated(request)) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });

  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large (max 4MB)' }), { status: 400 });
  }

  const filename = `gallery-${Date.now()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (HAS_GITHUB) {
    const ok = await putGithubFile(
      `public/images/gallery/${filename}`,
      buffer.toString('base64'),
      `Add gallery image: ${filename}`
    );
    if (!ok) return new Response(JSON.stringify({ error: 'Failed to upload to GitHub' }), { status: 500 });
    return new Response(JSON.stringify({ url: `/images/gallery/${filename}` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (IS_VERCEL) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), { status: 500 });
  }

  // Local dev
  const dir = join(process.cwd(), 'public', 'images', 'gallery');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), buffer);
  return new Response(JSON.stringify({ url: `/images/gallery/${filename}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
