import redis from './redis';

export interface RateLimitOptions {
  key: string;
  max: number;
  windowSeconds: number;
}

export async function rateLimit(opts: RateLimitOptions): Promise<{
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}> {
  const rlKey = `rl:${opts.key}`;
  const current = await redis.incr(rlKey);
  if (current === 1) {
    await redis.expire(rlKey, opts.windowSeconds);
  }
  const ttl = await redis.ttl(rlKey);
  return {
    allowed: current <= opts.max,
    remaining: Math.max(0, opts.max - current),
    resetSeconds: ttl > 0 ? ttl : opts.windowSeconds,
  };
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
