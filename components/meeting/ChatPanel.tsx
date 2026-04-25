'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MoreVertical, Pencil, Trash2, Reply, Paperclip, Lock, FileText, Download, Loader2 } from 'lucide-react';
import { useParticipants } from '@livekit/components-react';
import type { ChatMsg } from '../MeetingRoom';

export function ChatPanel({ messages, localIdentity, onSend, onEdit, onDelete, onClose, disabled }: {
  messages: ChatMsg[]; localIdentity: string;
  onSend: (text: string, opts?: Partial<ChatMsg>) => void; onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void; onClose: () => void; disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{id: string, text: string, sender: string} | null>(null);
  const [targetIdentity, setTargetIdentity] = useState<string>('all');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const participants = useParticipants();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() && !isUploading) return;
    if (editingId) { 
      onEdit(editingId, input.trim()); 
      setEditingId(null); 
    } else { 
      onSend(input.trim(), { 
        replyToId: replyTo?.id, 
        replyToText: replyTo?.text, 
        replyToSender: replyTo?.sender,
        isPrivate: targetIdentity !== 'all',
        targetIdentity: targetIdentity !== 'all' ? targetIdentity : undefined
      }); 
    }
    setInput('');
    setReplyTo(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Check size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      alert("Ukuran file maksimal 20MB.");
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        onSend(input.trim() || 'Mengirim berkas', {
          fileUrl: data.url,
          fileName: data.name,
          replyToId: replyTo?.id, 
          replyToText: replyTo?.text, 
          replyToSender: replyTo?.sender,
          isPrivate: targetIdentity !== 'all',
          targetIdentity: targetIdentity !== 'all' ? targetIdentity : undefined
        });
        setInput('');
        setReplyTo(null);
      } else {
        alert("Gagal mengunggah file: " + data.error);
      }
    } catch (err) {
      alert("Terjadi kesalahan saat mengunggah.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = (msg: ChatMsg) => { setEditingId(msg.id); setInput(msg.text); setReplyTo(null); setMenuId(null); };
  const cancelEdit = () => { setEditingId(null); setInput(''); };
  const startReply = (msg: ChatMsg) => { setReplyTo({ id: msg.id, text: msg.text, sender: msg.senderName }); setEditingId(null); setMenuId(null); };
  const cancelReply = () => { setReplyTo(null); };
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Filter messages based on private chat logic
  const visibleMessages = messages.filter(m => {
    if (!m.isPrivate) return true;
    return m.senderIdentity === localIdentity || m.targetIdentity === localIdentity;
  });

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#8ab4f8]" /> Pesan
        </h2>
        <button onClick={onClose} className="glass-button rounded-full p-1.5"><X className="h-4 w-4 text-white/70" /></button>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto meet-scrollbar p-4 space-y-3 relative">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" /><p>Belum ada pesan</p>
          </div>
        )}
        {visibleMessages.map(msg => {
          const isMe = msg.senderIdentity === localIdentity;
          return (
            <div key={msg.id} className={`group relative ${isMe ? 'pl-8 flex justify-end' : 'pr-8'}`}>
              <div className={`rounded-2xl px-3.5 py-2.5 text-sm text-left ${
                msg.deleted ? 'bg-white/[0.03] border border-white/[0.04]'
                : msg.isPrivate ? 'bg-purple-500/20 border border-purple-500/30'
                : isMe ? 'bg-[#8ab4f8]/15' : 'bg-white/[0.06]'
              }`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <p className={`text-[11px] font-semibold ${isMe ? 'text-[#8ab4f8]' : 'text-[#81c995]'}`}>
                    {msg.senderName} {isMe && '(Anda)'}
                  </p>
                  {msg.isPrivate && <span className="text-[9px] bg-purple-500/40 text-white px-1.5 rounded-full flex items-center gap-1"><Lock className="w-2 h-2"/> Privat</span>}
                </div>
                
                {msg.deleted ? (
                  <p className="italic text-white/25 text-[13px]">Pesan dihapus · {msg.deletedAt && fmtTime(msg.deletedAt)}</p>
                ) : (
                  <>
                    {msg.replyToId && (
                      <div className="border-l-2 border-white/20 pl-2 mb-1.5 bg-white/[0.03] rounded-r p-1 text-[11px]">
                        <span className="font-semibold text-white/60">{msg.replyToSender}</span>
                        <p className="text-white/40 truncate">{msg.replyToText}</p>
                      </div>
                    )}
                    {msg.fileUrl ? (
                      <div className="mt-1 mb-2">
                        {msg.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer"><img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg max-h-40 object-cover border border-white/10" /></a>
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-all text-white/80">
                            <FileText className="w-6 h-6 text-[#8ab4f8] shrink-0" />
                            <span className="truncate text-xs flex-1">{msg.fileName}</span>
                            <Download className="w-4 h-4 text-white/50" />
                          </a>
                        )}
                        {msg.text !== 'Mengirim berkas' && <p className="text-white/85 text-[13px] break-words whitespace-pre-wrap mt-2">{msg.text}</p>}
                      </div>
                    ) : (
                      <p className="text-white/85 text-[13px] break-words whitespace-pre-wrap">{msg.text}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/25">
                      <span>{fmtTime(msg.ts)}</span>
                      {msg.edited && <span>· diedit {msg.editedAt && fmtTime(msg.editedAt)}</span>}
                    </div>
                  </>
                )}
              </div>
              
              {!msg.deleted && (
                <div className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setMenuId(menuId === msg.id ? null : msg.id)} className="p-1 rounded-full hover:bg-white/10">
                    <MoreVertical className="h-3.5 w-3.5 text-white/40" />
                  </button>
                  {menuId === msg.id && (
                    <div className="absolute right-0 top-full mt-1 bg-[#121218] border border-white/[0.08] rounded-xl shadow-lg z-50 py-1 min-w-[140px] animate-scale-in">
                      <button onClick={() => startReply(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]">
                        <Reply className="h-3.5 w-3.5" /> Balas
                      </button>
                      {isMe && (
                        <>
                          <button onClick={() => startEdit(msg)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button onClick={() => { onDelete(msg.id); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10">
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-3 border-t border-white/[0.06] bg-black/20">
        {editingId && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#8ab4f8]/10 rounded-lg text-xs">
            <span className="text-[#8ab4f8] flex items-center gap-1.5"><Pencil className="w-3 h-3"/> Mengedit pesan</span>
            <button onClick={cancelEdit} className="text-white/40 hover:text-white/70">Batal</button>
          </div>
        )}
        {replyTo && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-white/5 rounded-lg text-xs">
            <div className="flex flex-col flex-1 min-w-0 mr-2">
              <span className="text-[#81c995] font-semibold flex items-center gap-1"><Reply className="w-3 h-3"/> Membalas {replyTo.sender}</span>
              <span className="text-white/40 truncate">{replyTo.text}</span>
            </div>
            <button onClick={cancelReply} className="text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5"/></button>
          </div>
        )}
        
        {disabled ? (
          <p className="text-center text-xs text-white/25 py-2">Chat dinonaktifkan oleh host</p>
        ) : (
          <div className="flex flex-col gap-2">
            <select 
              value={targetIdentity} 
              onChange={e => setTargetIdentity(e.target.value)}
              className="bg-transparent text-xs text-white/60 outline-none w-full border border-white/10 rounded-lg px-2 py-1 focus:border-white/30"
            >
              <option value="all" className="bg-[#121218]">Ke: Semua Orang</option>
              {participants.filter(p => p.identity !== localIdentity).map(p => (
                <option key={p.identity} value={p.identity} className="bg-[#121218]">Ke: {p.name || 'Anonim'} (Privat)</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all shrink-0">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Ketik pesan..." className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#8ab4f8]/30 transition-all" />
              <button onClick={handleSend} disabled={(!input.trim() && !isUploading)}
                className={`p-2.5 rounded-full transition-all ${input.trim() ? 'bg-[#8ab4f8] text-black' : 'bg-white/[0.05] text-white/20'}`}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
