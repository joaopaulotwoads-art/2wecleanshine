import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getGithubFile, putGithubFile } from './github';

export interface GalleryPhoto {
  id: string;
  src: string;
  label: string;
  caption: string;
}

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'gallery.json');
const REPO_PATH = 'src/data/gallery.json';

const HAS_GITHUB = !!(process.env.VERCEL && process.env.GITHUB_TOKEN);

function readLocal(): GalleryPhoto[] {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function readLatest(): Promise<{ photos: GalleryPhoto[]; sha?: string }> {
  if (HAS_GITHUB) {
    const file = await getGithubFile(REPO_PATH);
    if (file) return { photos: JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8')), sha: file.sha };
  }
  return { photos: readLocal() };
}

async function writePhotos(photos: GalleryPhoto[], sha: string | undefined, message: string): Promise<void> {
  if (HAS_GITHUB) {
    const ok = await putGithubFile(REPO_PATH, Buffer.from(JSON.stringify(photos, null, 2)).toString('base64'), message, sha);
    if (!ok) throw new Error('Failed to commit gallery to GitHub');
    return;
  }
  writeFileSync(LOCAL_FILE, JSON.stringify(photos, null, 2));
}

export async function getPhotos(): Promise<GalleryPhoto[]> {
  return readLocal();
}

export async function addPhoto(photo: Omit<GalleryPhoto, 'id'>): Promise<GalleryPhoto> {
  const { photos, sha } = await readLatest();
  const newPhoto: GalleryPhoto = { id: `g${Date.now()}`, ...photo };
  const updated = [...photos, newPhoto];
  await writePhotos(updated, sha, `Add gallery photo: ${photo.label}`);
  return newPhoto;
}

export async function updatePhoto(
  id: string,
  data: Partial<Omit<GalleryPhoto, 'id'>>
): Promise<GalleryPhoto | null> {
  const { photos, sha } = await readLatest();
  const idx = photos.findIndex(p => p.id === id);
  if (idx === -1) return null;
  photos[idx] = { ...photos[idx], ...data };
  await writePhotos(photos, sha, `Update gallery photo: ${photos[idx].label}`);
  return photos[idx];
}

export async function deletePhoto(id: string): Promise<boolean> {
  const { photos, sha } = await readLatest();
  const filtered = photos.filter(p => p.id !== id);
  if (filtered.length === photos.length) return false;
  await writePhotos(filtered, sha, `Delete gallery photo: ${id}`);
  return true;
}
