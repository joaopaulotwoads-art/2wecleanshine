import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'site-content.json');
const TMP_FILE = '/tmp/weclean-content.json';
const BLOB_KEY = 'site-content.json';

const IS_VERCEL = !!process.env.VERCEL;
const HAS_BLOB = !!(process.env.VERCEL && process.env.BLOB_STORE_ID);

function readLocal(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function readTmp(): Record<string, any> {
  try {
    if (!existsSync(TMP_FILE)) copyFileSync(LOCAL_FILE, TMP_FILE);
    return JSON.parse(readFileSync(TMP_FILE, 'utf-8'));
  } catch {
    return readLocal();
  }
}

function writeTmp(data: Record<string, any>): void {
  writeFileSync(TMP_FILE, JSON.stringify(data, null, 2));
}

async function readContent(): Promise<Record<string, any>> {
  if (HAS_BLOB) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ prefix: BLOB_KEY });
      const meta = blobs.find(b => b.pathname === BLOB_KEY);
      if (!meta) return readLocal();
      const res = await fetch(meta.url, { cache: 'no-store' });
      return await res.json();
    } catch {
      return IS_VERCEL ? readTmp() : readLocal();
    }
  }
  if (IS_VERCEL) return readTmp();
  return readLocal();
}

async function writeContent(data: Record<string, any>): Promise<void> {
  if (HAS_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_KEY, JSON.stringify(data, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return;
  }
  if (IS_VERCEL) { writeTmp(data); return; }
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
