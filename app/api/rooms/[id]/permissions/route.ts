import { NextResponse } from 'next/server';
import { getRoom } from '@/lib/rooms';
import { normalizeRoomId } from '@/lib/room-id';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  const { hostIdentity, permissions } = body;
  if (hostIdentity !== room.hostIdentity) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  room.permissions = {
    allowChat: permissions?.allowChat ?? room.permissions?.allowChat ?? true,
    allowScreenShare: permissions?.allowScreenShare ?? room.permissions?.allowScreenShare ?? true,
    allowJoin: permissions?.allowJoin ?? room.permissions?.allowJoin ?? true,
  };

  await redis.setex(`room:${id}`, 24 * 60 * 60, JSON.stringify(room));
  return NextResponse.json({ ok: true, permissions: room.permissions });
}
