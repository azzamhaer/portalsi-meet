import { NextResponse } from 'next/server';
import { getRoom, saveRoom } from '@/lib/rooms';
import { normalizeRoomId } from '@/lib/room-id';

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

  const p = room.permissions || {} as any;
  room.permissions = {
    allowChat: permissions?.allowChat ?? p.allowChat ?? true,
    allowScreenShare: permissions?.allowScreenShare ?? p.allowScreenShare ?? true,
    allowJoin: permissions?.allowJoin ?? p.allowJoin ?? true,
    allowReactions: permissions?.allowReactions ?? p.allowReactions ?? true,
    lobbyMode: permissions?.lobbyMode ?? p.lobbyMode ?? false,
    allowRename: permissions?.allowRename ?? p.allowRename ?? true,
  };

  await saveRoom(room);
  return NextResponse.json({ ok: true, permissions: room.permissions });
}
