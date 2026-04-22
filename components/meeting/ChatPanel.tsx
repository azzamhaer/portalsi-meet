'use client';

import { Chat } from '@livekit/components-react';
import { MessageSquare, X } from 'lucide-react';

export function ChatPanel({ onClose }: { onClose: () => void }) {
  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-meet-accent" /> Pesan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5">
          <X className="h-4 w-4 text-white/70" />
        </button>
      </div>
      {/* Chat Body */}
      <div className="flex-1 overflow-hidden">
        <Chat className="h-full" />
      </div>
    </aside>
  );
}
