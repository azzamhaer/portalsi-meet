'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { ChatMsg } from '../MeetingRoom';

export function ChatPanel({ messages, localIdentity, onSend, onEdit, onDelete, onClose }: {
  messages: ChatMsg[]; localIdentity: string;
  onSend: (text: string) => void; onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void; onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (editingId) { onEdit(editingId, input.trim()); setEditingId(null); }
    else onSend(input.trim());
    setInput('');
  };

  const startEdit = (msg: ChatMsg) => { setEditingId(msg.id); setInput(msg.text); setMenuId(null); };
  const cancelEdit = () => { setEditingId(null); setInput(''); };
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#8ab4f8]" /> Pesan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto meet-scrollbar p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" /><p>Belum ada pesan</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.senderIdentity === localIdentity;
          return (
            <div key={msg.id} className={`group relative ${isMe ? 'pl-8' : 'pr-8'}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.deleted ? 'bg-white/[0.03] border border-white/[0.04]'
                : isMe ? 'bg-[#8ab4f8]/15 ml-auto' : 'bg-white/[0.06]'
              } ${isMe ? 'text-right' : ''}`}>
                <p className={`text-[11px] font-semibold mb-1 ${isMe ? 'text-[#8ab4f8]' : 'text-[#81c995]'}`}>
                  {msg.senderName} {isMe && '(Anda)'}
                </p>
                {msg.deleted ? (
                  <p className="italic text-white/25 text-[13px]">Pesan dihapus · {msg.deletedAt && fmtTime(msg.deletedAt)}</p>
                ) : (
                  <>
                    <p className="text-white/85 text-[13px] break-words whitespace-pre-wrap">{msg.text}</p>
                    <div className={`flex items-center gap-1.5 mt-1 text-[10px] text-white/25 ${isMe ? 'justify-end' : ''}`}>
                      <span>{fmtTime(msg.ts)}</span>
                      {msg.edited && <span>· diedit {msg.editedAt && fmtTime(msg.editedAt)}</span>}
                    </div>
                  </>
                )}
              </div>
              {isMe && !msg.deleted && (
                <div className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setMenuId(menuId === msg.id ? null : msg.id)} className="p-1 rounded-full hover:bg-white/10">
                    <MoreVertical className="h-3.5 w-3.5 text-white/40" />
                  </button>
                  {menuId === msg.id && (
                    <div className="absolute right-0 top-full mt-1 bg-[#121218] border border-white/[0.08] rounded-xl shadow-lg z-50 py-1 min-w-[140px] animate-scale-in">
                      <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button onClick={() => { onDelete(msg.id); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10">
                        <Trash2 className="h-3.5 w-3.5" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="p-3 border-t border-white/[0.06]">
        {editingId && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#8ab4f8]/10 rounded-lg text-xs">
            <span className="text-[#8ab4f8]">✏️ Mengedit pesan</span>
            <button onClick={cancelEdit} className="text-white/40 hover:text-white/70">Batal</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Ketik pesan..." className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#8ab4f8]/30 transition-all" />
          <button onClick={handleSend} disabled={!input.trim()}
            className={`p-2.5 rounded-full transition-all ${input.trim() ? 'bg-[#8ab4f8] text-black' : 'bg-white/[0.05] text-white/20'}`}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
