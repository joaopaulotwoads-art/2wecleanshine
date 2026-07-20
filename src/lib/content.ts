import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchBlobJson, invalidateBlobCache, primeBlobCache } from './blob-cache';

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
      const data = await fetchBlobJson<Record<string, any>>(BLOB_KEY);
      if (data) return data;
      return readLocal();
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
      allowOverwrite: true,
    });
    primeBlobCache(BLOB_KEY, data);
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
  invalidateBlobCache(BLOB_KEY);
  await writeContent(merged);
  return merged;
}
