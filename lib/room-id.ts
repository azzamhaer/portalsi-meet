import { randomBytes } from 'crypto';

// Alphabet only — no numbers, no ambiguous chars (no O/I/L)
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ';

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
    .replace(/[^A-Z]/g, '')
    .slice(0, 6);
}

export function isValidRoomId(id: string): boolean {
  return /^[A-Z]{6}$/.test(id);
}
