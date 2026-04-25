import { NextResponse } from 'next/server';
import { getRoom, saveRoom } from '@/lib/rooms';
import bcrypt from 'bcryptjs';
import { normalizeRoomId } from '@/lib/room-id';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { password, hostIdentity } = await req.json();
    const id = normalizeRoomId(params.id);
    
    const room = await getRoom(id);
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Only host can change the password
    if (room.hostIdentity !== hostIdentity) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (password) {
      room.passwordHash = await bcrypt.hash(password, 10);
    } else {
      room.passwordHash = undefined;
    }
    
    await saveRoom(room);
    return NextResponse.json({ success: true, password: password || undefined });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
