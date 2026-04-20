import { randomBytes } from 'crypto';

// base32 alphabet without ambiguous chars (no 0/O/1/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomId(length = 6): string {
  const bytes = randomBytes(length);
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}

export function normalizeRoomId(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/[O]/g, '0')
    .slice(0, 6);
}

export function isValidRoomId(id: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(id);
}
