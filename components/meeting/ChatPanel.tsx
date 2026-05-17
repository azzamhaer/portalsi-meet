'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, MoreVertical, Pencil, Trash2, Reply, Paperclip, Lock, FileText, Download, Loader2, BarChart2, PlusCircle } from 'lucide-react';
import { useParticipants } from '@livekit/components-react';
import type { ChatMsg, Poll } from '../MeetingRoom';

export function ChatPanel({ messages, localIdentity, localName, onSend, onEdit, onDelete, onClose, disabled, polls, isHost, pub, allowPolls, onPollCreate, onPollVote, onPollDelete, admins }: {
  messages: ChatMsg[]; localIdentity: string; localName: string;
  onSend: (text: string, opts?: Partial<ChatMsg>) => void; onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void; onClose: () => void; disabled?: boolean;
  polls: Poll[]; isHost: boolean; pub: (d: any) => void; allowPolls?: boolean;
  onPollCreate?: (poll: Poll) => void; onPollVote?: (pollId: string, optionIds: string[]) => void; onPollDelete?: (pollId: string) => void; admins?: Set<string>;
}) {
  const isAdmin = isHost || (admins?.has(localIdentity));
  const [activeTab, setActiveTab] = useState<'chat' | 'polls'>('chat');

  // Chat State
  const [input, setInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{id: string, text: string, sender: string} | null>(null);
  const [targetIdentity, setTargetIdentity] = useState<string>('all');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const participants = useParticipants();



  // Polls State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [showResults, setShowResults] = useState(true);

  useEffect(() => {
    if (activeTab === 'chat' && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, activeTab]);

  const handleSend = () => {
    if (!input.trim() && !isUploading) return;
    if (editingId) { onEdit(editingId, input.trim()); setEditingId(null); } 
    else { 
      onSend(input.trim(), { 
        replyToId: replyTo?.id, replyToText: replyTo?.text, replyToSender: replyTo?.sender,
        isPrivate: targetIdentity !== 'all', targetIdentity: targetIdentity !== 'all' ? targetIdentity : undefined
      }); 
    }
    setInput(''); setReplyTo(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return alert("Ukuran file maksimal 20MB.");
    
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData(); formData.append('file', file);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            onSend(input.trim() || 'Mengirim berkas', {
              fileUrl: data.url, fileName: data.name,
              replyToId: replyTo?.id, replyToText: replyTo?.text, replyToSender: replyTo?.sender,
              isPrivate: targetIdentity !== 'all', targetIdentity: targetIdentity !== 'all' ? targetIdentity : undefined
            });
            setInput(''); setReplyTo(null);
          } else { alert("Gagal: " + data.error); }
        } catch { alert("Error memproses respons."); }
      } else { alert("Error mengunggah."); }
    };
    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      alert("Error mengunggah.");
    };
    xhr.send(formData);
  };

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const privateChatIds = Array.from(new Set(messages.filter(m => m.isPrivate && (m.senderIdentity === localIdentity || m.targetIdentity === localIdentity)).map(m => m.senderIdentity === localIdentity ? m.targetIdentity! : m.senderIdentity)));
  const visibleMessages = messages.filter(m => {
    if (targetIdentity === 'all') return !m.isPrivate;
    return m.isPrivate && (m.senderIdentity === targetIdentity || m.targetIdentity === targetIdentity);
  });



  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.some(o => !o.trim())) return alert('Lengkapi pertanyaan dan opsi poll.');
    const pollId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const poll: Poll = {
      id: pollId, question: pollQuestion.trim(),
      options: pollOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt.trim(), votes: 0 })),
      createdBy: localName, voters: {}, allowMultiple, showResults
    };
    pub({ type: 'poll_create', poll });
    onPollCreate?.(poll);
    setIsCreatingPoll(false); setPollQuestion(''); setPollOptions(['', '']); setAllowMultiple(true); setShowResults(true);
  };

  return (
    <aside className="flex flex-col h-full w-full md:w-[340px] glass-panel md:rounded-2xl overflow-hidden animate-slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex bg-white/10 rounded-lg p-1 w-full max-w-[240px]">
          <button onClick={() => setActiveTab('chat')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'chat' ? 'bg-[#8ab4f8] text-black' : 'text-white/60 hover:text-white/90'}`}>
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>

          <button onClick={() => setActiveTab('polls')} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === 'polls' ? 'bg-[#8ab4f8] text-black' : 'text-white/60 hover:text-white/90'}`}>
            <BarChart2 className="w-3.5 h-3.5" /> Polls
          </button>
        </div>
        <button onClick={onClose} className="glass-button rounded-full p-1.5 ml-2"><X className="h-4 w-4 text-white/70" /></button>
      </div>

      {activeTab === 'chat' && (
        <>
          <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto meet-scrollbar whitespace-nowrap border-b border-white/[0.06]">
             <button onClick={() => setTargetIdentity('all')} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${targetIdentity === 'all' ? 'bg-[#8ab4f8] text-black' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>Semua Orang</button>
             {privateChatIds.map(id => {
                const p = participants.find(x => x.identity === id) || { name: 'Anonim', identity: id };
                return <button key={id} onClick={() => setTargetIdentity(id)} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1 ${targetIdentity === id ? 'bg-purple-500 text-white' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'}`}><Lock className="w-3 h-3"/> {p.name}</button>;
             })}
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto meet-scrollbar p-4 space-y-3 relative">
            {visibleMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm"><MessageSquare className="h-8 w-8 mb-2 opacity-50" /><p>Belum ada pesan</p></div>}
            {visibleMessages.map(msg => {
              const isMe = msg.senderIdentity === localIdentity;
              return (
                <div key={msg.id} className={`group relative ${isMe ? 'pl-8 flex justify-end' : 'pr-8'}`}>
                  <div className={`rounded-2xl px-3.5 py-2.5 text-sm text-left ${msg.deleted ? 'bg-white/[0.03] border border-white/[0.04]' : msg.isPrivate ? 'bg-purple-500/20 border border-purple-500/30' : isMe ? 'bg-[#8ab4f8]/15' : 'bg-white/[0.06]'}`}>
                    <div className="flex items-center gap-1.5 mb-1"><p className={`text-[11px] font-semibold ${isMe ? 'text-[#8ab4f8]' : 'text-[#81c995]'}`}>{msg.senderName} {isMe && '(Anda)'}</p>{msg.isPrivate && <span className="text-[9px] bg-purple-500/40 text-white px-1.5 rounded-full flex items-center gap-1"><Lock className="w-2 h-2"/> Privat</span>}</div>
                    {msg.deleted ? <p className="italic text-white/25 text-[13px]">Pesan dihapus · {msg.deletedAt && fmtTime(msg.deletedAt)}</p> : (
                      <>
                        {msg.replyToId && <div className="border-l-2 border-white/20 pl-2 mb-1.5 bg-white/[0.03] rounded-r p-1 text-[11px]"><span className="font-semibold text-white/60">{msg.replyToSender}</span><p className="text-white/40 truncate">{msg.replyToText}</p></div>}
                        {msg.fileUrl ? (
                          <div className="mt-1 mb-2">
                            {msg.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? <a href={msg.fileUrl} target="_blank" rel="noreferrer"><img src={msg.fileUrl} alt={msg.fileName} className="max-w-full rounded-lg max-h-40 object-cover border border-white/10" /></a> : <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-all text-white/80"><FileText className="w-6 h-6 text-[#8ab4f8] shrink-0" /><span className="truncate text-xs flex-1">{msg.fileName}</span><Download className="w-4 h-4 text-white/50" /></a>}
                            {msg.text !== 'Mengirim berkas' && <p className="text-white/85 text-[13px] break-words whitespace-pre-wrap mt-2">{msg.text}</p>}
                          </div>
                        ) : <p className="text-white/85 text-[13px] break-words whitespace-pre-wrap">{msg.text}</p>}
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/25"><span>{fmtTime(msg.ts)}</span>{msg.edited && <span>· diedit {msg.editedAt && fmtTime(msg.editedAt)}</span>}</div>
                      </>
                    )}
                  </div>
                  {!msg.deleted && (
                    <div className="absolute top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setMenuId(menuId === msg.id ? null : msg.id)} className="p-1 rounded-full hover:bg-white/10"><MoreVertical className="h-3.5 w-3.5 text-white/40" /></button>
                      {menuId === msg.id && (
                        <div className="absolute right-0 top-full mt-1 bg-[#121218] border border-white/[0.08] rounded-xl shadow-lg z-50 py-1 min-w-[140px] animate-scale-in">
                          <button onClick={() => { setReplyTo({ id: msg.id, text: msg.text, sender: msg.senderName }); setEditingId(null); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]"><Reply className="h-3.5 w-3.5" /> Balas</button>
                          {isMe && (
                            <button onClick={() => { setEditingId(msg.id); setInput(msg.text); setReplyTo(null); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:bg-white/[0.06]"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                          )}
                          {(isMe || isAdmin) && (
                            <button onClick={() => { onDelete(msg.id); setMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
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
            {editingId && <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-[#8ab4f8]/10 rounded-lg text-xs"><span className="text-[#8ab4f8] flex items-center gap-1.5"><Pencil className="w-3 h-3"/> Mengedit pesan</span><button onClick={() => { setEditingId(null); setInput(''); }} className="text-white/40 hover:text-white/70">Batal</button></div>}
            {replyTo && <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-white/5 rounded-lg text-xs"><div className="flex flex-col flex-1 min-w-0 mr-2"><span className="text-[#81c995] font-semibold flex items-center gap-1"><Reply className="w-3 h-3"/> Membalas {replyTo.sender}</span><span className="text-white/40 truncate">{replyTo.text}</span></div><button onClick={() => setReplyTo(null)} className="text-white/40 hover:text-white/70"><X className="w-3.5 h-3.5"/></button></div>}
            {disabled ? <p className="text-center text-xs text-white/25 py-2">Chat dinonaktifkan oleh host</p> : (
              <div className="flex flex-col gap-2">
                <select value={targetIdentity} onChange={e => setTargetIdentity(e.target.value)} className="bg-transparent text-xs text-white/60 outline-none w-full border border-white/10 rounded-lg px-2 py-1 focus:border-white/30">
                  <option value="all" className="bg-[#121218]">Ke: Semua Orang</option>
                  {participants.filter(p => p.identity !== localIdentity).map(p => <option key={p.identity} value={p.identity} className="bg-[#121218]">Ke: {p.name || 'Anonim'} (Privat)</option>)}
                </select>
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="relative p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all shrink-0" title={isUploading ? `Mengunggah ${uploadProgress}%` : 'Kirim Berkas'}>
                    {isUploading ? (
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 24 24">
                          <circle className="text-white/20" strokeWidth="2.5" stroke="currentColor" fill="transparent" r="10" cx="12" cy="12" />
                          <circle className="text-[#8ab4f8] transition-all duration-300 ease-out" strokeWidth="2.5" strokeDasharray="62.8" strokeDashoffset={62.8 - (62.8 * (uploadProgress || 0)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="10" cx="12" cy="12" />
                        </svg>
                        <span className="absolute text-[8px] font-bold text-white" style={{ transform: 'scale(0.85)' }}>{uploadProgress}</span>
                      </div>
                    ) : <Paperclip className="w-5 h-5" />}
                  </button>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Ketik pesan..." className="flex-1 bg-white/[0.05] border border-white/[0.08] rounded-2xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#8ab4f8]/30 transition-all" />
                  <button onClick={handleSend} disabled={!input.trim() && !isUploading} className={`p-2.5 rounded-full transition-all ${input.trim() ? 'bg-[#8ab4f8] text-black' : 'bg-white/[0.05] text-white/20'}`}><Send className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}



      {activeTab === 'polls' && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto meet-scrollbar p-4 space-y-4">
            {!isCreatingPoll && polls.length === 0 && <div className="flex flex-col items-center justify-center h-full text-white/20 text-sm"><BarChart2 className="h-8 w-8 mb-2 opacity-50" /><p>Belum ada polling</p></div>}
            {isCreatingPoll ? (
              <div className="space-y-3 bg-white/[0.03] p-4 rounded-xl border border-white/10 animate-fade-in">
                <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2">Buat Polling Baru</h3>
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Pertanyaan..." className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#8ab4f8]/50" />
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }} placeholder={`Opsi ${i+1}`} className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-[#8ab4f8]/50" />
                      {pollOptions.length > 2 && <button onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== i))} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><X className="w-4 h-4"/></button>}
                    </div>
                  ))}
                </div>
                <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-[#8ab4f8] flex items-center gap-1 hover:underline"><PlusCircle className="w-3 h-3"/> Tambah Opsi</button>
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" id="allow-multi" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="accent-[#8ab4f8]" />
                  <label htmlFor="allow-multi" className="text-xs text-white/70 cursor-pointer">Izinkan memilih lebih dari satu</label>
                </div>
                <div className="flex items-center gap-2 mt-2 mb-2">
                  <input type="checkbox" id="show-res" checked={showResults} onChange={e => setShowResults(e.target.checked)} className="accent-[#8ab4f8]" />
                  <label htmlFor="show-res" className="text-xs text-white/70 cursor-pointer">Tampilkan hasil ke semua orang</label>
                </div>
                <div className="flex gap-2 mt-4 pt-2 border-t border-white/10">
                  <button onClick={() => setIsCreatingPoll(false)} className="flex-1 py-1.5 text-xs text-white/60 hover:text-white">Batal</button>
                  <button onClick={handleCreatePoll} className="flex-1 py-1.5 text-xs bg-[#8ab4f8] text-black font-bold rounded-lg hover:bg-[#8ab4f8]/80">Publikasi</button>
                </div>
              </div>
            ) : (
              polls.map(poll => {
                const activeVoters = Object.values(poll.voters).filter(opts => opts.length > 0);
                const totalVotersCount = activeVoters.length;
                const myVoteIds = poll.voters[localIdentity] || [];
                const isCreator = poll.createdBy === localName;

                const handleVote = (optId: string) => {
                  let newVoteIds = [...myVoteIds];
                  if (poll.allowMultiple) {
                    if (newVoteIds.includes(optId)) newVoteIds = newVoteIds.filter(id => id !== optId);
                    else newVoteIds.push(optId);
                  } else {
                    if (newVoteIds.includes(optId)) newVoteIds = [];
                    else newVoteIds = [optId];
                  }
                  if (onPollVote) onPollVote(poll.id, newVoteIds);
                  else pub({ type: 'poll_vote', pollId: poll.id, optionIds: newVoteIds, identity: localIdentity });
                };

                return (
                  <div key={poll.id} className="bg-white/[0.04] border border-white/10 p-4 rounded-xl relative group">
                    {(isCreator || isAdmin) && (
                      <button onClick={() => {
                        if (window.confirm('Apakah Anda yakin ingin menghapus polling ini?')) {
                          if (onPollDelete) onPollDelete(poll.id);
                          else pub({ type: 'poll_delete', pollId: poll.id });
                        }
                      }} className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20" title="Hapus Polling">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <p className="text-[10px] text-white/40 mb-1">Oleh {poll.createdBy} {!poll.showResults && <span className="text-yellow-400/70 ml-1">(Hasil Disembunyikan)</span>}</p>
                    <p className="font-semibold text-white/90 mb-3 pr-6">{poll.question}</p>
                    <div className="space-y-2">
                      {poll.options.map(opt => {
                        const pct = totalVotersCount > 0 ? Math.round((opt.votes / totalVotersCount) * 100) : 0;
                        const isMyVote = myVoteIds.includes(opt.id);
                        
                        let voterNames: string[] = [];
                        if (isCreator || isAdmin) {
                           Object.entries(poll.voters).forEach(([id, opts]) => {
                             if (opts.includes(opt.id)) {
                               const p = participants.find(x => x.identity === id);
                               if (p) voterNames.push(p.name || 'Anonim');
                               else if (id === localIdentity) voterNames.push(localName);
                             }
                           });
                        }

                        const showData = poll.showResults || isCreator || isAdmin;

                        return (
                          <div key={opt.id} onClick={() => handleVote(opt.id)} className={`relative overflow-hidden cursor-pointer border rounded-lg p-2.5 transition-all ${isMyVote ? 'border-[#8ab4f8] bg-[#8ab4f8]/10' : 'border-white/10 hover:border-white/30 bg-black/20'}`}>
                            {showData && <div className="absolute left-0 top-0 bottom-0 bg-white/10" style={{ width: `${pct}%`, transition: 'width 0.5s ease' }} />}
                            <div className="relative z-10 flex flex-col">
                              <div className="flex justify-between items-center text-sm">
                                <span className={isMyVote ? 'text-[#8ab4f8] font-bold' : 'text-white/80'}>{opt.text}</span>
                                {showData && <span className="text-white/50 text-xs">{opt.votes} ({pct}%)</span>}
                              </div>
                              {showData && voterNames.length > 0 && (
                                <p className="text-[9px] text-white/40 mt-1 font-medium">Pemilih: {voterNames.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(poll.showResults || isCreator || isAdmin) && <p className="text-[10px] text-white/30 mt-3 text-right">{totalVotersCount} orang telah memilih</p>}
                  </div>
                );
              })
            )}
          </div>
          {(isHost || allowPolls) && !isCreatingPoll && (
            <div className="p-4 border-t border-white/[0.06] bg-black/20">
              <button onClick={() => setIsCreatingPoll(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#8ab4f8] text-black hover:bg-[#8ab4f8]/90 transition-all shadow-[0_0_15px_rgba(138,180,248,0.2)]">
                <PlusCircle className="w-4 h-4" /> Buat Polling
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
