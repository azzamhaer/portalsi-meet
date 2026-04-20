import { notFound } from 'next/navigation';
import { RoomClient } from '@/components/RoomClient';
import { normalizeRoomId, isValidRoomId } from '@/lib/room-id';

export const dynamic = 'force-dynamic';

export default function RoomPage({ params }: { params: { id: string } }) {
  const id = normalizeRoomId(params.id);
  if (!isValidRoomId(id)) return notFound();
  return <RoomClient roomId={id} />;
}
