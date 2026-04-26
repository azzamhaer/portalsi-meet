import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getRoom, verifyRoomPassword } from '@/lib/rooms';
import { normalizeRoomId } from '@/lib/room-id';
import { createAccessToken, LIVEKIT_WS_URL } from '@/lib/livekit';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ip = getClientIp(req);

  // Rate limit: 30 join attempts per minute per IP
  const rl = await rateLimit({
    key: `join:${ip}`,
    max: 30,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Terlalu banyak percobaan. Tunggu sebentar.' },
      { status: 429, headers: { 'Retry-After': String(rl.resetSeconds) } }
    );
  }

  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);

  if (!room) {
    return NextResponse.json(
      { error: 'Ruang tidak ditemukan atau sudah kedaluwarsa.' },
      { status: 404 }
    );
  }

  // Check if host has blocked new joins
  if (room.permissions && !room.permissions.allowJoin) {
    return NextResponse.json(
      { error: 'Host telah menonaktifkan akses masuk ke ruangan ini.' },
      { status: 403 }
    );
  }

  // Check if meeting is scheduled for the future
  if (room.scheduledFor && Date.now() < room.scheduledFor) {
    const timeStr = new Date(room.scheduledFor).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    return NextResponse.json(
      { error: `Rapat baru dimulai jam ${timeStr} WIB. Silakan refresh atau kembali.` },
      { status: 403 }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim().slice(0, 40);
  const password = body.password ? String(body.password) : undefined;

  if (!name) {
    return NextResponse.json({ error: 'Nama wajib diisi.' }, { status: 400 });
  }

  let pwRemaining = -1;

  // Rate limit password attempts per room per IP
  if (room.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: 'Ruangan ini membutuhkan password.', requiresPassword: true },
        { status: 401 }
      );
    }

    const pwRl = await rateLimit({
      key: `pw:${id}:${ip}`,
      max: 10,
      windowSeconds: 300,
    });
    
    if (!pwRl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan password. Tunggu 5 menit.' },
        { status: 429 }
      );
    }
    pwRemaining = pwRl.remaining;
  }

  const valid = await verifyRoomPassword(room, password);
  if (!valid) {
    let errorMsg = 'Password salah.';
    if (pwRemaining >= 0 && pwRemaining <= 5) {
      errorMsg += ` Peringatan: Sisa ${pwRemaining} percobaan sebelum diblokir.`;
    }
    return NextResponse.json(
      { error: errorMsg, requiresPassword: true },
      { status: 401 }
    );
  }

  const browserId = body.browserId ? String(body.browserId).slice(0, 64) : '';

  // Lobby mode: put user in waiting room (unless they've joined before)
  if (room.permissions?.lobbyMode && browserId) {
    const { default: redis } = await import('@/lib/redis');
    const knownKey = `known:${id}`;
    const isKnown = await redis.sismember(knownKey, browserId);
    if (!isKnown) {
      const { addWaiting } = await import('@/lib/rooms');
      const waitingId = `w-${randomUUID()}`;
      await addWaiting(id, { waitingId, name, ts: Date.now() });
      return NextResponse.json({
        status: 'waiting',
        waitingId,
        roomId: id,
      }, { status: 202 });
    }
  }

  const identity = `user-${randomUUID()}`;

  const token = await createAccessToken({
    roomId: id,
    identity,
    name,
    isHost: false,
  });

  // Remember this browser as known for this room
  if (browserId) {
    const { default: redis } = await import('@/lib/redis');
    await redis.sadd(`known:${id}`, browserId);
    await redis.expire(`known:${id}`, 24 * 60 * 60);
  }

  return NextResponse.json({
    roomId: id,
    token,
    wsUrl: LIVEKIT_WS_URL,
    isHost: false,
  });
}
