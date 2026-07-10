import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface GalleryPhoto {
  id: string;
  src: string;
  label: string;
  caption: string;
}

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'gallery.json');
const BLOB_KEY = 'gallery-data.json';
const IS_VERCEL = !!(process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN);

function readLocal(): GalleryPhoto[] {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLocal(photos: GalleryPhoto[]): void {
  writeFileSync(LOCAL_FILE, JSON.stringify(photos, null, 2));
}

async function readPhotos(): Promise<GalleryPhoto[]> {
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

async function writePhotos(photos: GalleryPhoto[]): Promise<void> {
  if (IS_VERCEL) {
    const { put } = await import('@vercel/blob');
    await put(BLOB_KEY, JSON.stringify(photos, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    return;
  }
  writeLocal(photos);
}

export async function getPhotos(): Promise<GalleryPhoto[]> {
  return readPhotos();
}

export async function addPhoto(photo: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  const photos = await readPhotos();
  const newPhoto: GalleryPhoto = { id: `g${Date.now()}`, ...photo };
  photos.push(newPhoto);
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
  await writePhotos(photos);
  return photos[idx];
}

export async function deletePhoto(id: string): Promise<boolean> {
  const photos = await readPhotos();
  const filtered = photos.filter(p => p.id !== id);
  if (filtered.length === photos.length) return false;
  await writePhotos(filtered);
  return true;
}
