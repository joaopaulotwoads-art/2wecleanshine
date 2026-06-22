const sessions = new Map<string, number>(); // token → expiry

export function createSession(): string {
  const token = crypto.randomUUID();
  sessions.set(token, Date.now() + 1000 * 60 * 60 * 24); // 24h
  return token;
}

export function validateSession(token: string): boolean {
  const expiry = sessions.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) { sessions.delete(token); return false; }
  return true;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function getToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isAuthenticated(request: Request): boolean {
  const token = getToken(request);
  return token ? validateSession(token) : false;
}

export function checkCredentials(user: string, pass: string): boolean {
  const validUser = import.meta.env.ADMIN_USER;
  const validPass = import.meta.env.ADMIN_PASS;
  return user === validUser && pass === validPass;
}
