import { NextResponse } from 'next/server';
import { getWaitingStatus } from '@/lib/rooms';
import { LIVEKIT_WS_URL } from '@/lib/livekit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const waitingId = url.searchParams.get('waitingId');
  if (!waitingId) return NextResponse.json({ error: 'Missing waitingId' }, { status: 400 });

  const result = await getWaitingStatus(waitingId);
  if (result.status === 'approved') {
    return NextResponse.json({ status: 'approved', token: result.token, wsUrl: LIVEKIT_WS_URL });
  }
  return NextResponse.json({ status: result.status });
}
