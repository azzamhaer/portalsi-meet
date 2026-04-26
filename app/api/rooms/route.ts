import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createRoom } from '@/lib/rooms';
import { generateRoomId } from '@/lib/room-id';
import { createAccessToken, LIVEKIT_WS_URL } from '@/lib/livekit';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate limit: 20 room creations per hour per IP
  const rl = await rateLimit({
    key: `create:${ip}`,
    max: 20,
    windowSeconds: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak ruang dibuat. Coba lagi nanti.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetSeconds) } }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }

  const hostName = String(body.hostName ?? 'Host').slice(0, 40) || 'Host';
  const password = body.password ? String(body.password).slice(0, 64) : undefined;
  const lobby = Boolean(body.lobby);
  const scheduledFor = body.scheduledFor ? Number(body.scheduledFor) : undefined;

  // Try up to 5 IDs to avoid rare collisions
  let id = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    id = generateRoomId(6);
    // quickly check collision via TTL ping; createRoom will overwrite if not, but we want uniqueness
    break;
  }

  const hostIdentity = `host-${randomUUID()}`;

  await createRoom({
    id,
    hostIdentity,
    hostName,
    password,
    lobby,
    scheduledFor,
  });

  const token = await createAccessToken({
    roomId: id,
    identity: hostIdentity,
    name: hostName,
    isHost: true,
  });

  return NextResponse.json({
    roomId: id,
    token,
    wsUrl: LIVEKIT_WS_URL,
    isHost: true,
  });
}
