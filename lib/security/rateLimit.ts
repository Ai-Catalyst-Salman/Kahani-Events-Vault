type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

function evictExpired(now: number) {
  for (const [name, bucket] of buckets) {
    if (now > bucket.reset) buckets.delete(name);
  }
  while (buckets.size > 5000) {
    const oldest = buckets.keys().next().value;
    if (!oldest) break;
    buckets.delete(oldest);
  }
}

export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now > existing.reset) {
    if (buckets.size > 4000) evictExpired(now);
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}
