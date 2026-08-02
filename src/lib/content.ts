import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getGithubFile, putGithubFile } from './github';

const LOCAL_FILE = join(process.cwd(), 'src', 'data', 'site-content.json');
const REPO_PATH = 'src/data/site-content.json';

const HAS_GITHUB = !!(process.env.VERCEL && process.env.GITHUB_TOKEN);

function readLocal(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(LOCAL_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export async function getContent(): Promise<Record<string, any>> {
  return readLocal();
}

export async function updateContent(data: Record<string, any>): Promise<Record<string, any>> {
  if (!HAS_GITHUB) {
    const merged = { ...readLocal(), ...data };
    writeFileSync(LOCAL_FILE, JSON.stringify(merged, null, 2));
    return merged;
  }

  const file = await getGithubFile(REPO_PATH);
  const current = file ? JSON.parse(Buffer.from(file.content, 'base64').toString('utf-8')) : readLocal();
  const merged = { ...current, ...data };

  const ok = await putGithubFile(
    REPO_PATH,
    Buffer.from(JSON.stringify(merged, null, 2)).toString('base64'),
    'Update site content via admin',
    file?.sha
  );
  if (!ok) throw new Error('Failed to commit content to GitHub');
  return merged;
}
