type CachedUser = {
  id: string;
  email: string;
  until: number;
};

const verified = new Map<string, CachedUser>();
const TTL_MS = 60_000;

function tokenKey(token: string): string {
  return token.slice(-32);
}

export function readCachedUser(token: string): { id: string; email: string } | null {
  const hit = verified.get(tokenKey(token));
  if (!hit) return null;
  if (hit.until < Date.now()) {
    verified.delete(tokenKey(token));
    return null;
  }
  return { id: hit.id, email: hit.email };
}

export function rememberUser(token: string, user: { id: string; email: string }) {
  const now = Date.now();
  if (verified.size > 400) {
    for (const [key, value] of verified) {
      if (value.until < now) verified.delete(key);
    }
  }
  verified.set(tokenKey(token), { id: user.id, email: user.email, until: now + TTL_MS });
}
