import { NextResponse } from 'next/server';
import { getRoom, getWaiting, approveWaiting, rejectWaiting } from '@/lib/rooms';
import { normalizeRoomId } from '@/lib/room-id';
import { createAccessToken, LIVEKIT_WS_URL } from '@/lib/livekit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET: list waiting users (host only)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const url = new URL(req.url);
  const hostId = url.searchParams.get('hostIdentity');
  if (hostId !== room.hostIdentity) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const waiting = await getWaiting(id);
  return NextResponse.json({ waiting });
}

// POST: approve or reject
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad body' }, { status: 400 }); }

  if (body.hostIdentity !== room.hostIdentity) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { action, waitingId, userName } = body;

  if (action === 'approve') {
    const identity = `user-${randomUUID()}`;
    const token = await createAccessToken({ roomId: id, identity, name: userName || 'Peserta', isHost: false });
    await approveWaiting(id, waitingId, token);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    await rejectWaiting(id, waitingId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
