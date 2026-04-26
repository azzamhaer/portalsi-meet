import bcrypt from 'bcryptjs';
import redis from './redis';

export interface RoomPermissions {
  allowChat: boolean;
  allowScreenShare: boolean;
  allowJoin: boolean;
  allowReactions: boolean;
  lobbyMode: boolean;
  allowRename: boolean;
}

export interface RoomRecord {
  id: string;
  hostIdentity: string;
  passwordHash?: string;
  lobby: boolean;
  createdAt: number;
  hostName: string;
  permissions: RoomPermissions;
  scheduledFor?: number;
}

export interface WaitingUser {
  waitingId: string;
  name: string;
  ts: number;
}

const ROOM_TTL = 24 * 60 * 60;
const WAITING_TTL = 30 * 60; // 30 min

function roomKey(id: string) { return `room:${id}`; }
function waitKey(id: string) { return `waiting:${id}`; }
function waitStatusKey(waitingId: string) { return `wstatus:${waitingId}`; }

export async function createRoom(opts: {
  id: string; hostIdentity: string; hostName: string; password?: string; lobby?: boolean; scheduledFor?: number;
}): Promise<RoomRecord> {
  const record: RoomRecord = {
    id: opts.id, hostIdentity: opts.hostIdentity, hostName: opts.hostName,
    passwordHash: opts.password ? await bcrypt.hash(opts.password, 10) : undefined,
    lobby: opts.lobby ?? false, createdAt: Date.now(), scheduledFor: opts.scheduledFor,
    permissions: { allowChat: true, allowScreenShare: true, allowJoin: true, allowReactions: true, lobbyMode: false, allowRename: true },
  };
  await redis.setex(roomKey(opts.id), ROOM_TTL, JSON.stringify(record));
  return record;
}

export async function getRoom(id: string): Promise<RoomRecord | null> {
  const raw = await redis.get(roomKey(id));
  if (!raw) return null;
  try { return JSON.parse(raw) as RoomRecord; } catch { return null; }
}

export async function saveRoom(room: RoomRecord) {
  await redis.setex(roomKey(room.id), ROOM_TTL, JSON.stringify(room));
}

export async function verifyRoomPassword(room: RoomRecord, password?: string): Promise<boolean> {
  if (!room.passwordHash) return true;
  if (!password) return false;
  return bcrypt.compare(password, room.passwordHash);
}

export async function refreshRoomTtl(id: string) { await redis.expire(roomKey(id), ROOM_TTL); }
export async function deleteRoom(id: string) { await redis.del(roomKey(id)); }

// === Waiting / Lobby ===
export async function addWaiting(roomId: string, user: WaitingUser) {
  await redis.hset(waitKey(roomId), user.waitingId, JSON.stringify(user));
  await redis.expire(waitKey(roomId), WAITING_TTL);
  await redis.setex(waitStatusKey(user.waitingId), WAITING_TTL, 'waiting');
}

export async function getWaiting(roomId: string): Promise<WaitingUser[]> {
  const all = await redis.hgetall(waitKey(roomId));
  if (!all) return [];
  return Object.values(all).map(v => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
}

export async function approveWaiting(roomId: string, waitingId: string, token: string) {
  await redis.hdel(waitKey(roomId), waitingId);
  await redis.setex(waitStatusKey(waitingId), WAITING_TTL, JSON.stringify({ status: 'approved', token }));
}

export async function rejectWaiting(roomId: string, waitingId: string) {
  await redis.hdel(waitKey(roomId), waitingId);
  await redis.setex(waitStatusKey(waitingId), WAITING_TTL, 'rejected');
}

export async function getWaitingStatus(waitingId: string): Promise<{ status: 'waiting' | 'approved' | 'rejected'; token?: string }> {
  const raw = await redis.get(waitStatusKey(waitingId));
  if (!raw) return { status: 'rejected' };
  if (raw === 'waiting') return { status: 'waiting' };
  if (raw === 'rejected') return { status: 'rejected' };
  try { const d = JSON.parse(raw); return { status: 'approved', token: d.token }; } catch { return { status: 'rejected' }; }
}
