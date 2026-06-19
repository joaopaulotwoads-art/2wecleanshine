import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_FILE = join(process.cwd(), 'src', 'data', 'site-content.json');

export function getContent(): Record<string, any> {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function updateContent(data: Record<string, any>): Record<string, any> {
  const current = getContent();
  const merged = { ...current, ...data };
  writeFileSync(DATA_FILE, JSON.stringify(merged, null, 2));
  return merged;
}
