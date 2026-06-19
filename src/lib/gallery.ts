import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface GalleryPhoto {
  id: string;
  src: string;
  label: string;
  caption: string;
}

const DATA_FILE = join(process.cwd(), 'src', 'data', 'gallery.json');

function readPhotos(): GalleryPhoto[] {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePhotos(photos: GalleryPhoto[]): void {
  writeFileSync(DATA_FILE, JSON.stringify(photos, null, 2));
}

export function getPhotos(): GalleryPhoto[] {
  return readPhotos();
}

export function addPhoto(photo: Omit<GalleryPhoto, 'id'>): GalleryPhoto {
  const photos = readPhotos();
  const newPhoto: GalleryPhoto = { id: `g${Date.now()}`, ...photo };
  photos.push(newPhoto);
  writePhotos(photos);
  return newPhoto;
}

export function updatePhoto(id: string, data: Partial<Omit<GalleryPhoto, 'id'>>): GalleryPhoto | null {
  const photos = readPhotos();
  const idx = photos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  photos[idx] = { ...photos[idx], ...data };
  writePhotos(photos);
  return photos[idx];
}

export function deletePhoto(id: string): boolean {
  const photos = readPhotos();
  const filtered = photos.filter(p => p.id !== id);
  if (filtered.length === photos.length) return false;
  writePhotos(filtered);
  return true;
}
