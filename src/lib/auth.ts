import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_DURATION = 1000 * 60 * 60 * 24;

function secret(): string {
  return (import.meta.env.AUTH_SECRET ?? process.env.AUTH_SECRET ?? 'dev-secret-change-me') as string;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

export function createSession(): string {
  const expiry = String(Date.now() + SESSION_DURATION);
  return `${expiry}.${sign(expiry)}`;
}

export function validateSession(token: string): boolean {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const expiry = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(expiry);
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    if (!timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  return Number(expiry) > Date.now();
}

export function destroySession(_token: string): void {
  // Stateless — nothing to clear server-side
}

export function getToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const m = cookie.match(/admin_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function isAuthenticated(request: Request): boolean {
  const token = getToken(request);
  return !!token && validateSession(token);
}

export function checkCredentials(user: string, pass: string): boolean {
  const validUser = (import.meta.env.ADMIN_USER ?? process.env.ADMIN_USER) as string;
  const validPass = (import.meta.env.ADMIN_PASS ?? process.env.ADMIN_PASS) as string;
  return user === validUser && pass === validPass;
}
