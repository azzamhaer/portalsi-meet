import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_HTTP_URL = process.env.LIVEKIT_HTTP_URL; // e.g. http://livekit:7880 (internal) or https://livekit.example.com
export const LIVEKIT_WS_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL; // wss://livekit.example.com

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
  console.warn(
    '[livekit] LIVEKIT_API_KEY / LIVEKIT_API_SECRET missing — set in .env before running'
  );
}

export interface TokenOptions {
  roomId: string;
  identity: string;
  name: string;
  isHost?: boolean;
  canPublish?: boolean;
  canSubscribe?: boolean;
  ttlSeconds?: number;
}

export async function createAccessToken(opts: TokenOptions): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
    identity: opts.identity,
    name: opts.name,
    ttl: opts.ttlSeconds ?? 60 * 60, // 1h default
  });

  at.addGrant({
    room: opts.roomId,
    roomJoin: true,
    roomCreate: opts.isHost ?? false,
    roomAdmin: opts.isHost ?? false,
    canPublish: opts.canPublish ?? true,
    canSubscribe: opts.canSubscribe ?? true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });

  return await at.toJwt();
}

export function getRoomService(): RoomServiceClient | null {
  if (!LIVEKIT_HTTP_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return null;
  return new RoomServiceClient(LIVEKIT_HTTP_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

export async function removeParticipant(roomId: string, identity: string) {
  const svc = getRoomService();
  if (!svc) throw new Error('LiveKit not configured');
  await svc.removeParticipant(roomId, identity);
}

export async function mutePublishedTrack(
  roomId: string,
  identity: string,
  trackSid: string,
  muted: boolean
) {
  const svc = getRoomService();
  if (!svc) throw new Error('LiveKit not configured');
  await svc.mutePublishedTrack(roomId, identity, trackSid, muted);
}
