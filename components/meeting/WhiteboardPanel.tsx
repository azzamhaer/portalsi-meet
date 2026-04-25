'use client';

import { X, PenTool, ExternalLink } from 'lucide-react';

export function WhiteboardPanel({ roomId, onClose, allowWhiteboard }: { roomId: string; onClose: () => void; allowWhiteboard: boolean }) {
  return (
    <aside className="flex flex-col h-full w-full md:w-[600px] xl:w-[800px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <PenTool className="h-4 w-4 text-pink-400" /> Whiteboard
          <span className="text-[10px] text-white/40 ml-2 font-normal">
            {allowWhiteboard ? '(Everyone can view)' : '(Only admin can view)'}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <a href={`https://wbo.ophir.dev/boards/portalsi-${roomId}`} target="_blank" rel="noreferrer" className="glass-button rounded-full p-1.5" title="Buka di tab baru">
            <ExternalLink className="h-4 w-4 text-white/70" />
          </a>
          <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative bg-white">
        <iframe
          src={`https://wbo.ophir.dev/boards/portalsi-${roomId}`}
          className="w-full h-full border-none"
          title="Whiteboard"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </aside>
  );
}
