import { NextResponse } from 'next/server';
import { getRoom, deleteRoom } from '@/lib/rooms';
import { normalizeRoomId } from '@/lib/room-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  return NextResponse.json({
    exists: true,
    requiresPassword: Boolean(room.passwordHash),
    lobby: room.lobby,
    hostName: room.hostName,
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = normalizeRoomId(params.id);
  await deleteRoom(id);
  return NextResponse.json({ success: true });
}
