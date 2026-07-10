import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'site-content.json');
const BLOB_KEY = 'site-content.json';
const IS_VERCEL = !!(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);

function readLocal(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function readContent(): Promise<Record<string, any>> {
  if (IS_VERCEL) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: BLOB_KEY });
      const meta = blobs.find(b => b.pathname === BLOB_KEY);
      if (!meta) return readLocal();
      const res = await fetch(meta.url, { cache: 'no-store' });
      return await res.json();
    } catch {
      return readLocal();
    }
  }
  return readLocal();
}

async function writeContent(data: Record<string, any>): Promise<void> {
  if (IS_VERCEL) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_KEY, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return;
  }
  writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
}

export async function getContent(): Promise<Record<string, any>> {
  return readContent();
}

export async function updateContent(data: Record<string, any>): Promise<Record<string, any>> {
  const current = await readContent();
  const merged = { ...current, ...data };
  await writeContent(merged);
  return merged;
}
