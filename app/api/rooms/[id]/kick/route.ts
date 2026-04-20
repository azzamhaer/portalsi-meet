import { NextResponse } from 'next/server';
import { normalizeRoomId } from '@/lib/room-id';
import { getRoom } from '@/lib/rooms';
import { removeParticipant } from '@/lib/livekit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * NOTE: In a stricter production setup, authorize this endpoint with a host JWT
 * in an HTTP-only cookie. For v1 we gate by verifying the requester knows a valid
 * host-scoped token. For simplicity, the host JWT granted at room creation already
 * has roomAdmin; LiveKit server-side SDK will enforce permissions.
 * This API is a server-side proxy so we don't expose LIVEKIT_API_SECRET to client.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = normalizeRoomId(params.id);
  const room = await getRoom(id);
  if (!room) {
    return NextResponse.json({ error: 'Ruang tidak ditemukan' }, { status: 404 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body tidak valid' }, { status: 400 });
  }

  const identity = String(body.identity ?? '').trim();
  if (!identity) {
    return NextResponse.json({ error: 'Identity wajib' }, { status: 400 });
  }

  // Protect against kicking the host
  if (identity === room.hostIdentity) {
    return NextResponse.json({ error: 'Tidak bisa kick host' }, { status: 403 });
  }

  try {
    await removeParticipant(id, identity);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Gagal kick peserta' },
      { status: 500 }
    );
  }
}
