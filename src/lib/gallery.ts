import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { fetchBlobJson, invalidateBlobCache, primeBlobCache } from './blob-cache';

export interface GalleryPhoto {
  id: string;
  src: string;
  label: string;
  caption: string;
}

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'gallery.json');
const TMP_FILE = '/tmp/weclean-gallery.json';
const BLOB_KEY = 'gallery-data.json';

const IS_VERCEL = !!process.env.VERCEL;
const HAS_BLOB = !!(process.env.VERCEL && process.env.BLOB_STORE_ID);

function readLocal(): GalleryPhoto[] {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function readTmp(): GalleryPhoto[] {
  try {
    if (!existsSync(TMP_FILE)) copyFileSync(LOCAL_FILE, TMP_FILE);
    return JSON.parse(readFileSync(TMP_FILE, 'utf-8'));
  } catch {
    return readLocal();
  }
}

function writeTmp(photos: GalleryPhoto[]): void {
  writeFileSync(TMP_FILE, JSON.stringify(photos, null, 2));
}

async function readPhotos(): Promise<GalleryPhoto[]> {
  if (HAS_BLOB) {
    try {
      const data = await fetchBlobJson<GalleryPhoto[]>(BLOB_KEY);
      if (data) return data;
      return readLocal();
    } catch {
      return IS_VERCEL ? readTmp() : readLocal();
    }
  }
  if (IS_VERCEL) return readTmp();
  return readLocal();
}

async function writePhotos(photos: GalleryPhoto[]): Promise<void> {
  if (HAS_BLOB) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_KEY, JSON.stringify(photos, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    primeBlobCache(BLOB_KEY, photos);
    return;
  }
  if (IS_VERCEL) { writeTmp(photos); return; }
  writeFileSync(LOCAL_FILE, JSON.stringify(photos, null, 2));
}

export async function getPhotos(): Promise<GalleryPhoto[]> {
  return readPhotos();
}

export async function addPhoto(photo: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  const photos = await readPhotos();
  const newPhoto: GalleryPhoto = { id: `g${Date.now()}`, ...photo };
  photos.push(newPhoto);
  invalidateBlobCache(BLOB_KEY);
  await writePhotos(photos);
  return newPhoto;
}

export async function updatePhoto(
  id: string,
  data: Partial<Omit<GalleryPhoto, 'id'>>
): Promise<GalleryPhoto | null> {
  const photos = await readPhotos();
  const idx = photos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  photos[idx] = { ...photos[idx], ...data };
  invalidateBlobCache(BLOB_KEY);
  await writePhotos(photos);
  return photos[idx];
}

export async function deletePhoto(id: string): Promise<boolean> {
  const photos = await readPhotos();
  const filtered = photos.filter(p => p.id !== id);
  if (filtered.length === photos.length) return false;
  invalidateBlobCache(BLOB_KEY);
  await writePhotos(filtered);
  return true;
}
