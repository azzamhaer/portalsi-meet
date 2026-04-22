import bcrypt from 'bcryptjs';
import redis from './redis';

export interface RoomPermissions {
  allowChat: boolean;
  allowScreenShare: boolean;
  allowJoin: boolean;
}

export interface RoomRecord {
  id: string;
  hostIdentity: string;
  passwordHash?: string;
  lobby: boolean;
  createdAt: number;
  hostName: string;
  permissions: RoomPermissions;
}

const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function roomKey(id: string) {
  return `room:${id}`;
}

export async function createRoom(opts: {
  id: string;
  hostIdentity: string;
  hostName: string;
  password?: string;
  lobby?: boolean;
}): Promise<RoomRecord> {
  const record: RoomRecord = {
    id: opts.id,
    hostIdentity: opts.hostIdentity,
    hostName: opts.hostName,
    passwordHash: opts.password
      ? await bcrypt.hash(opts.password, 10)
      : undefined,
    lobby: opts.lobby ?? false,
    createdAt: Date.now(),
    permissions: { allowChat: true, allowScreenShare: true, allowJoin: true },
  };

  await redis.setex(
    roomKey(opts.id),
    ROOM_TTL_SECONDS,
    JSON.stringify(record)
  );

  return record;
}

export async function getRoom(id: string): Promise<RoomRecord | null> {
  const raw = await redis.get(roomKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomRecord;
  } catch {
    return null;
  }
}

export async function verifyRoomPassword(
  room: RoomRecord,
  password?: string
): Promise<boolean> {
  if (!room.passwordHash) return true;
  if (!password) return false;
  return bcrypt.compare(password, room.passwordHash);
}

export async function refreshRoomTtl(id: string) {
  await redis.expire(roomKey(id), ROOM_TTL_SECONDS);
}

export async function deleteRoom(id: string) {
  await redis.del(roomKey(id));
}
