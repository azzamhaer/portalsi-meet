import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const pong = await redis.ping();
    return NextResponse.json({
      ok: true,
      redis: pong === 'PONG',
      livekit: Boolean(process.env.NEXT_PUBLIC_LIVEKIT_URL),
      uptime: process.uptime(),
      ts: Date.now(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? 'unknown' },
      { status: 503 }
    );
  }
}
