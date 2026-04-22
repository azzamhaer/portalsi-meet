'use client';

import { X, Grid3X3, Monitor, LayoutGrid, EyeOff, Maximize } from 'lucide-react';
import type { ViewMode } from './BottomBar';

export function ViewPanel({ viewMode, onViewModeChange, hideSelf, onToggleHideSelf, onClose }: {
  viewMode: ViewMode; onViewModeChange: (v: ViewMode) => void;
  hideSelf: boolean; onToggleHideSelf: () => void; onClose: () => void;
}) {
  const views: [ViewMode, string, React.ReactNode][] = [
    ['standard', 'Standard', <Grid3X3 key="1" className="h-4 w-4" />],
    ['speaker', 'Speaker View', <Monitor key="2" className="h-4 w-4" />],
    ['gallery', 'Gallery View', <LayoutGrid key="3" className="h-4 w-4" />],
  ];

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-[#8ab4f8]" /> Tampilan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      <div className="flex-1 overflow-y-auto meet-scrollbar p-4 space-y-2">
        <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold px-1 mb-2">Layout</p>
        {views.map(([v, label, icon]) => (
          <button key={v} onClick={() => onViewModeChange(v)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all ${viewMode === v ? 'text-[#8ab4f8] bg-[#8ab4f8]/10 border border-[#8ab4f8]/20' : 'text-white/70 hover:bg-white/[0.05] border border-transparent'}`}>
            {icon} <span className="font-medium">{label}</span>
            {viewMode === v && <span className="ml-auto text-xs font-bold">✓</span>}
          </button>
        ))}
        <hr className="border-white/[0.06] my-3" />
        <p className="text-[11px] text-white/30 uppercase tracking-wider font-semibold px-1 mb-2">Opsi</p>
        <button onClick={onToggleHideSelf}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm transition-all ${hideSelf ? 'text-[#8ab4f8] bg-[#8ab4f8]/10 border border-[#8ab4f8]/20' : 'text-white/70 hover:bg-white/[0.05] border border-transparent'}`}>
          <EyeOff className="h-4 w-4" /> <span className="font-medium">Sembunyikan Video Saya</span>
          {hideSelf && <span className="ml-auto text-xs font-bold">✓</span>}
        </button>
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-white/70 hover:bg-white/[0.05] border border-transparent transition-all">
          <Maximize className="h-4 w-4" /> <span className="font-medium">Fullscreen</span>
        </button>
      </div>
    </aside>
  );
}
