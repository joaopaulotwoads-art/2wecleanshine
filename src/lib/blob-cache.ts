const CACHE_TTL_MS = 60_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
let publicHost: string | null = null;

function deriveHost(): string | null {
  const storeId = process.env.BLOB_STORE_ID;
  if (!storeId) return null;
  const id = storeId.startsWith('store_') ? storeId.slice(6) : storeId;
  return `${id}.public.blob.vercel-storage.com`;
}

async function resolveHost(pathname: string): Promise<string | null> {
  if (publicHost) return publicHost;
  const derived = deriveHost();
  if (derived) {
    publicHost = derived;
    return publicHost;
  }
  try {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: pathname });
    const meta = blobs.find(b => b.pathname === pathname);
    if (!meta) return null;
    publicHost = new URL(meta.url).host;
    return publicHost;
  } catch {
    return null;
  }
}

export async function fetchBlobJson<T>(pathname: string): Promise<T | null> {
  const cached = cache.get(pathname) as CacheEntry<T> | undefined;
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const host = await resolveHost(pathname);
  if (!host) return null;

  const url = `https://${host}/${pathname}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    // If derived host was wrong, fall back to list once and retry
    if (res.status === 404 || res.status === 403) {
      publicHost = null;
      const retryHost = await resolveHost(pathname);
      if (!retryHost || retryHost === host) return null;
      const retry = await fetch(`https://${retryHost}/${pathname}`, { cache: 'no-store' });
      if (!retry.ok) return null;
      const data = (await retry.json()) as T;
      cache.set(pathname, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    }
    return null;
  }

  const data = (await res.json()) as T;
  cache.set(pathname, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export function invalidateBlobCache(pathname: string): void {
  cache.delete(pathname);
}

export function primeBlobCache<T>(pathname: string, data: T): void {
  cache.set(pathname, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}
