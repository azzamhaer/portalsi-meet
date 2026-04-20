# PortalSI Meet — Production Architecture Blueprint

> Opinionated technical design oleh AI engineer untuk video conferencing web app skala produksi.
> Target: 10–50 user/room, scalable ke ribuan concurrent users, low-latency, no-login.

---

## TL;DR — Keputusan Inti

| Area | Pilihan | Alasan Singkat |
|------|---------|---------------|
| Topology | **SFU** (Selective Forwarding Unit) | Satu-satunya yang scalable untuk 10–50 user. Mesh mati di 4 user, MCU boros CPU. |
| SFU Engine | **LiveKit** (Go, open source) | Production-grade, batteries-included, dipakai Spotify Greenroom & OpenAI Realtime. Hemat 6–12 bulan dev time vs mediasoup raw. |
| Frontend | **Next.js 14 + LiveKit React SDK + Tailwind** | App Router untuk SSR landing page; SDK menangani semua kompleksitas WebRTC. |
| Signaling/State | **LiveKit built-in + Redis** | LiveKit punya signaling sendiri via WebSocket. Redis untuk room metadata, lobby queue, presence. |
| TURN/STUN | **coturn self-hosted (multi-region)** | Vendor TURN (Twilio) mahal di skala. Hetzner unmetered bandwidth = murah drastis. |
| Codec | **VP9 + Simulcast 3 layer**, AV1 progressive rollout | VP9 universal support, AV1 hemat 30–50% bandwidth tapi belum stabil di Safari. |
| Auth Model | **Anonymous + JWT short-lived (1h)** | No-login, tapi token room-scoped untuk mencegah abuse. |
| Hosting v1 | **Hetzner CCX23 + Docker Compose** | $30/bulan, 4 vCPU dedicated, unmetered bandwidth — sweet spot media server. |
| Hosting v2 | **Kubernetes multi-region + LiveKit Distributed** | Saat traffic >5k concurrent. |

---

## 1. Architecture Decision: Kenapa SFU?

Tiga topology yang mungkin untuk WebRTC:

**Mesh (P2P penuh)** — Setiap client buat koneksi ke setiap peer. Kompleksitas O(n²). Di 5 user, satu client harus upload 4 stream simultan → bandwidth uplink saturated. **Mati di 4–5 user.** Tidak relevan.

**MCU (Multipoint Control Unit)** — Server menerima semua stream, mendecode, mixing jadi satu composite stream, lalu encode ulang. CPU bottleneck brutal (transcoding satu room 720p ≈ 2 vCPU). Cocok untuk legacy SIP interop saja. **Tidak hemat sama sekali.**

**SFU (Selective Forwarding Unit)** — Server menerima stream dari setiap publisher, lalu **meneruskan** (tanpa decode/encode) ke subscriber yang request. Setiap client upload 1x, download N-1 stream. Server cuma jadi router pintar — load CPU rendah, hanya bandwidth yang scale.

Ini yang dipakai Zoom, Google Meet, Teams, Discord, Twitch Spaces. Untuk kebutuhan PortalSI Meet (10–50 user/room, real-time, scalable, low-latency), **SFU adalah satu-satunya jawaban yang masuk akal.** Tidak ada trade-off di sini.

---

## 2. Tech Stack Final (Opinionated)

### Media Layer
- **LiveKit Server** — SFU engine (Go). Sudah include signaling, room management, simulcast, dynamic bitrate adaptation, recording, ingress/egress.
- **coturn** — TURN/STUN server self-hosted. Wajib karena ~10–15% user di belakang symmetric NAT/corporate firewall.
- **Codec stack**: Opus untuk audio (32 kbps voice, 64 kbps music mode), VP9 untuk video dengan Simulcast 3 layer (180p/360p/720p). AV1 sebagai opt-in untuk Chrome 116+.

### Backend
- **Node.js 20 + Fastify** — REST API untuk room creation, lobby logic, password verify. Lebih ringan dari Express, async-native.
- **Redis 7** — Room state (`room:{id}` → {passwordHash, hostId, lobby, createdAt, ttl}), lobby queue (`room:{id}:lobby` → list), presence, rate limiting.
- **PostgreSQL** (opsional, untuk v2) — Persistent log, recording metadata, analytics. Skip di v1.
- **JWT (livekit-server-sdk)** — Token generator untuk room access. Short-lived, room+identity scoped.

### Frontend
- **Next.js 14 (App Router)** — Landing page SSR untuk SEO/perf, room page CSR.
- **LiveKit Client SDK + LiveKit React Components** — Sudah handle WebRTC negotiation, reconnection, simulcast subscription, active speaker detection.
- **TailwindCSS + shadcn/ui** — Cepat & konsisten.
- **Zustand** — State management untuk UI (chat, modals, settings). Hindari Redux untuk scope ini.

### Infrastructure
- **v1**: Single VPS (Hetzner CCX23, 4 vCPU dedicated, 16 GB RAM, 20 TB traffic) — Docker Compose dengan: livekit-server, coturn, redis, api, nginx (TLS termination via Caddy/Traefik).
- **v2**: Kubernetes (k3s atau managed EKS/GKE), LiveKit dalam mode Distributed dengan Redis sebagai coordinator, multi-region (US-East, EU-Frankfurt, Asia-Singapore).
- **CDN**: Cloudflare di depan untuk static assets, DDoS protection, dan TURN-over-TLS-443 fallback domain.
- **Observability**: Prometheus (LiveKit expose metrics), Grafana dashboard, Sentry untuk client errors, Loki untuk logs.

---

## 3. High-Level Architecture

```
                          ┌──────────────────────────┐
                          │    Cloudflare (CDN/DNS)  │
                          └────────────┬─────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │                             │
                ┌───────▼────────┐          ┌─────────▼────────┐
                │  Next.js App   │          │  Next.js App     │
                │  (Vercel/edge) │          │  (Vercel/edge)   │
                └───────┬────────┘          └─────────┬────────┘
                        │                             │
                        └──────────────┬──────────────┘
                                       │  HTTPS (REST)
                          ┌────────────▼─────────────┐
                          │  API Gateway (Fastify)   │
                          │  - POST /rooms           │
                          │  - POST /rooms/:id/join  │
                          │  - JWT issuance          │
                          └────┬─────────────────┬───┘
                               │                 │
                          ┌────▼────┐       ┌────▼────────┐
                          │  Redis  │       │ LiveKit API │
                          │  (state)│       │  (admin)    │
                          └─────────┘       └────┬────────┘
                                                 │
                                       WebSocket (signaling)
                                                 │
       ┌────────────┐      WebRTC over UDP       │
       │  Browser   │◄────────────────────┐      │
       │  Client A  │                     │      │
       └────────────┘                ┌────▼──────▼────┐
                                     │ LiveKit SFU    │
       ┌────────────┐                │ (Go, port      │
       │  Browser   │◄───────────────┤  7880/UDP)     │
       │  Client B  │                │                │
       └────────────┘                └────┬───────────┘
              ⋮                           │
       ┌────────────┐                ┌────▼───────────┐
       │  Browser   │◄───TURN relay──┤   coturn       │
       │  Client N  │                │ (3478/5349)    │
       └────────────┘                └────────────────┘
```

---

## 4. Core Flows

### 4.1 Create Room

```
User clicks "Mulai Meeting"
        │
        ▼
Frontend: POST /api/rooms { password?, lobby? }
        │
        ▼
API Gateway:
  1. Generate Room ID: 6 chars dari base32 (excl. ambiguous chars: 0/O/1/I/L)
     → 26^6 ≈ 308 juta kombinasi, collision negligible dengan TTL 24h
  2. Hash password (bcrypt, cost 10) jika ada
  3. SET di Redis:
     room:{id} = {
       passwordHash, hostIdentity, lobby: bool,
       createdAt, ttl: 24h
     }
  4. Generate host JWT via livekit-server-sdk:
     {
       roomJoin: true, roomCreate: true, roomAdmin: true,
       room: {id}, identity: "host-{uuid}",
       canPublish: true, canSubscribe: true
     }
  5. Return { roomId, token, wsUrl }
        │
        ▼
Frontend redirects to /room/{id}
LiveKit SDK connects to wsUrl with token
```

### 4.2 Join Room

```
User input Room ID + nama (+ password jika diminta)
        │
        ▼
Frontend: POST /api/rooms/{id}/join { name, password? }
        │
        ▼
API Gateway:
  1. GET room:{id} dari Redis → if null: 404
  2. Verify password (bcrypt.compare)
  3. Rate limit check (max 10 join/min/IP)
  4. If room.lobby == true:
     a. Push ke room:{id}:lobby = { participantId, name, joinedAt }
     b. Pub via Redis ke channel "lobby:{id}"
     c. Host frontend (subscribed) menampilkan notif → approve/reject
     d. Setelah approve, lanjut ke step 5
  5. Generate participant JWT (canPublish, canSubscribe, NO admin)
  6. Return { token, wsUrl }
        │
        ▼
LiveKit SDK:
  - Connect WebSocket → signaling
  - Negotiate ICE candidates (STUN dulu, TURN fallback)
  - DTLS handshake → SRTP keys
  - Subscribe ke published tracks dari peer existing
  - Publish own audio/video
```

### 4.3 WebRTC Signaling (di-handle LiveKit, tapi penting dipahami)

LiveKit menggunakan model **Transport Bidirectional**:

```
Client                                    LiveKit SFU
  │                                            │
  │ ── WS connect (JWT in query) ─────────────►│
  │ ◄── JoinResponse (room state, ICE) ───────│
  │                                            │
  │ ── PublishTrack(audio) ───────────────────►│
  │ ◄── ICE candidates ──────────────────────│
  │ ── SDP offer (publish transport) ─────────►│
  │ ◄── SDP answer ──────────────────────────│
  │                                            │
  │ ════ DTLS handshake ═══════════════════════│
  │ ════ SRTP packets (audio frames) ══════════│
  │                                            │
  │ ── SubscribeRequest (peer X audio) ────────►│
  │ ◄── SDP offer (subscribe transport) ──────│
  │ ── SDP answer ─────────────────────────────►│
  │ ◄════ SRTP packets (forwarded) ════════════│
```

Yang **tidak perlu kamu bangun sendiri** karena LiveKit handle:
- ICE trickle, NAT discovery, TURN failover
- Simulcast layer selection per subscriber berdasarkan bandwidth
- Receiver-side bandwidth estimation (REMB / TWCC)
- RTP retransmission (NACK), keyframe requests (PLI)
- Reconnection dengan state restore

---

## 5. Strategi Scaling (dari Kecil ke Besar)

### Phase 1 — MVP (0–500 concurrent users)

**Setup**: Single Hetzner CCX23 (4 vCPU dedicated AMD, 16 GB RAM, 20 TB traffic), Docker Compose:
- livekit-server (port 7880 TCP signaling, 50000–60000 UDP media)
- coturn (3478 UDP, 5349 TCP/TLS)
- redis (internal)
- api (Node.js)
- caddy (TLS auto via Let's Encrypt)

**Capacity estimate**: ~500 concurrent participants total (assumsi rata-rata 10/room, 50 room aktif). Bandwidth ~500 × 1.5 Mbps = 750 Mbps peak — masih nyaman di unmetered Hetzner.

**Cost**: ~$30–50/bulan. Sweet spot.

### Phase 2 — Horizontal Scale (500–5,000 concurrent)

- Pisah API + Redis ke node sendiri.
- LiveKit running di cluster (3+ nodes) dengan **room-affinity routing**: hash Room ID → konsisten ke node yang sama. Redis sebagai service discovery.
- Multiple coturn behind Layer 4 LB (HAProxy / cloud LB).
- Cloudflare di depan untuk static + DDoS.
- Add Prometheus + Grafana untuk monitoring.

**Cost**: ~$300–800/bulan tergantung region.

### Phase 3 — Multi-region (5,000–50,000+ concurrent)

- Deploy di 3 region: US-East, EU-Frankfurt, AP-Singapore.
- DNS GeoSteering (Cloudflare Load Balancing) → user routing ke region terdekat.
- LiveKit Distributed mode: room bisa lintas-node dalam satu region; untuk room cross-region (jarang), gunakan LiveKit Cascade (SFU-to-SFU forwarding).
- Redis cluster per region + global metadata di Upstash global atau Cloudflare KV.
- Recording (jika perlu) → S3-compatible storage (R2 untuk no-egress-fee).

### Phase 4 — Massive rooms (300+ in single room)

- Cascading SFU: publisher kirim ke "edge SFU", yang fan-out ke "relay SFU" lain → setiap subscriber connect ke relay terdekat. Mengurangi bandwidth per node dari O(N) ke O(√N).
- Aktifkan adaptive subscription aggressively: hanya 9 video high-res (active speakers), sisanya audio-only atau thumbnail 90p.

**Rule of thumb cost media**: ~$0.001 per participant-minute jika TURN-relay, ~$0.0003 jika P2P-via-SFU. Hetzner ratio ~5x lebih baik dari AWS.

---

## 6. Bagian Paling Sulit + Cara Mengatasinya

Ini yang sering bikin proyek video conferencing **gagal di production** padahal demo lancar:

### A. NAT Traversal (~10–15% user butuh TURN)

**Masalah**: Symmetric NAT (corporate firewall, beberapa carrier mobile) memblokir P2P-style hole punching. Tanpa TURN, user ini tidak bisa connect sama sekali.

**Solusi**:
- Self-host coturn di **setiap region** (latency-sensitive).
- Aktifkan **TURN over TCP/443 dengan TLS** sebagai fallback — port 443 hampir tidak pernah diblok firewall (terlihat seperti HTTPS biasa).
- Budget bandwidth: TURN-relayed traffic ≈ 1.5x media bandwidth normal (round-trip via server). Pakai provider unmetered.

### B. Adaptive Bitrate untuk Network Buruk

**Masalah**: User di 3G/WiFi spotty akan freeze frame, audio cut, atau drop koneksi → UX hancur.

**Solusi**:
- **Simulcast wajib aktif** (3 layer: 180p@150kbps, 360p@500kbps, 720p@1.5Mbps). Setiap publisher kirim 3 versi. SFU pilih layer paling cocok per subscriber berdasarkan bandwidth estimation.
- Implement **client-side adaptive logic**: kalau outgoing bitrate <200 kbps selama 5 detik berturut, auto-downgrade ke audio-only + tampilkan banner "Koneksi lemah, video dimatikan".
- Pakai **Opus DTX** (Discontinuous Transmission) — kirim packet hanya saat ada suara. Hemat 50% audio bandwidth.

### C. Reconnection Otomatis

**Masalah**: Browser tab di-background, network switch (WiFi→4G), TCP RST dari middlebox → user disconnect dan harus refresh manual.

**Solusi**:
- LiveKit SDK punya **built-in reconnect** dengan state restore (track subscriptions, mute state, dll). Aktifkan: `reconnectPolicy: { maxRetries: 10, nextRetryDelayInMs: exponential backoff }`.
- Server keep participant slot **selama 30 detik** setelah disconnect — token JWT-nya masih valid, jadi rejoin instant tanpa user klik apapun.
- ICE Restart untuk recover transport-level failure tanpa full reconnect.
- Tampilkan UI indicator "Menyambung ulang..." dengan blur pada video grid.

### D. Echo, Noise, Audio Quality

**Masalah**: Echo dari speaker phone, noise AC kantor, suara mengetik.

**Solusi**:
- Aktifkan WebRTC built-in: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
- Untuk noise suppression advanced, integrate **RNNoise WASM** (open source, free, 1MB) di client. Latency <10ms.
- Premium option: **Krisp.ai SDK** — better tapi berbayar.
- Opus codec di 32 kbps mono untuk voice, 64 kbps stereo kalau "music mode".

### E. Active Speaker & UI Scaling

**Masalah**: Render 50 video tile @ 720p akan bunuh GPU + bandwidth client.

**Solusi**:
- LiveKit emit `activeSpeakers` event berdasarkan audio energy → re-rank UI realtime.
- Subscribe high-res hanya untuk **top 9 speakers + pinned users**. Sisanya subscribe layer 180p atau audio-only.
- Implement **lazy subscribe**: video di luar viewport (scrolled-off) auto-unsubscribe.
- Default view "Active Speaker" mode untuk room >12 user, "Grid" untuk ≤12.

### F. Security tanpa Authentication

**Masalah**: Siapa pun yang tahu Room ID bisa join → potensi Zoom bombing.

**Solusi (defense in depth)**:
1. **Room ID 6 chars** dari base32 (exclude 0/O/1/I/L) → ~308 juta kombinasi. Brute force impractical kalau dikombinasi dengan rate limit.
2. **Optional password** (bcrypt) — host bisa wajibkan.
3. **Lobby/waiting room** — host approve setiap joiner (recommended default).
4. **JWT short-lived** (1 jam, room+identity scoped) — tidak bisa dipakai ulang.
5. **Rate limit**: max 10 join/menit/IP, max 20 room-create/jam/IP.
6. **DTLS-SRTP** mengenkripsi semua media client↔SFU. Untuk paranoid mode: **End-to-End Encryption (E2EE)** via Insertable Streams API — SFU jadi hanya forwarder packet terenkripsi (LiveKit support out-of-the-box).
7. **Host controls**: kick, mute-all, lock room (no new joiner).
8. **Audit log** ke Loki: siapa join kapan, dari IP mana (untuk forensics).

### G. Bandwidth Cost (#1 hidden expense)

**Masalah**: Cloud provider seperti AWS charge $0.09/GB egress. Satu room 50 user @ 1.5 Mbps × 60 menit = ~30 GB. Itu $2.70 untuk satu meeting 1 jam. **Tidak sustainable.**

**Solusi**:
- Pakai provider dengan **bandwidth murah/unmetered**: Hetzner (€0 sampai 20TB), OVH, Scaleway. AWS hanya untuk control plane.
- Rollout AV1 codec progresif → hemat 30–50% bandwidth.
- Audio-only mode untuk room besar atau koneksi lemah.
- Cascading SFU di phase 4 (lihat scaling).

### H. Browser/Device Heterogeneity

**Masalah**: iOS Safari punya quirks (tidak boleh autoplay media tanpa user gesture, prefer H.264 over VP9, PiP terbatas). Android WebView berbeda lagi.

**Solusi**:
- Test matrix wajib: Chrome, Firefox, Safari (macOS + iOS), Edge, Samsung Internet.
- **Codec preference list**: VP9 → VP8 → H.264 (selalu include H.264 untuk iOS).
- Click-to-start: jangan auto-publish, selalu butuh tombol "Join with Camera".
- Mobile UI: gesture-friendly, controls auto-hide, bottom sheet untuk participant list.
- PWA manifest agar bisa "Add to Home Screen" — feels native.

---

## 7. Kenapa LiveKit, Bukan Alternatif?

| Kandidat | Verdict |
|----------|---------|
| **mediasoup** (Node.js, low-level) | Powerful & flexible tapi kamu harus bangun sendiri: signaling, room mgmt, SDK, simulcast logic, reconnect. Tambah 6–12 bulan dev. **Pilih jika butuh customization ekstrim.** |
| **Janus** (C) | Battle-tested tapi config ribet, plugin C-based, komunitas lebih kecil. Better untuk WebRTC gateway use-cases (SIP bridging, RTSP). |
| **Jitsi Meet** | Excellent end-product, tapi UI tightly coupled — sulit di-customize jadi brand "PortalSI Meet" tanpa effort besar. Forking Jitsi = nightmare maintenance. |
| **OpenVidu** | Wrapper di atas Kurento (deprecated, no longer maintained actively). Skip. |
| **Daily.co / Twilio Video / Agora** (managed) | Cepat ke production, tapi $0.004–0.01/participant-minute → $200/jam untuk room 50 user. Vendor lock-in. **Pilih jika punya budget dan tidak mau infra.** |
| **LiveKit** ✅ | Open source (Apache 2.0), Go-native (cepat & efisien memori), batteries-included (signaling, SDK 6 bahasa, recording, ingress/egress, distributed mode), production proven (OpenAI, Spotify, dll), dokumentasi excellent, tim responsive. **Sweet spot untuk PortalSI Meet.** |

---

## 8. Suggested Roadmap (8 Minggu ke Production)

**Week 1–2 — MVP Functional**
- Setup LiveKit + coturn + Next.js di single VPS
- Landing page: input Room ID + nama
- Create room, join room flow (no password, no lobby)
- Video grid basic, mute toggle

**Week 3 — Core Features**
- Chat real-time (LiveKit Data Channel, no extra infra)
- Screen sharing (LiveKit `createScreenShareTracks`)
- Mute/kick controls (host-only)
- Active speaker detection + UI

**Week 4 — Polish & Edge Cases**
- Password protection + lobby
- Reconnect UX
- Mobile responsive (test iOS Safari thoroughly)
- Settings: device picker (kamera/mic), bitrate manual

**Week 5 — Performance & Reliability**
- Load test pakai `lk load-test` — target 500 concurrent
- Add monitoring (Prometheus, Grafana, Sentry)
- Optimize: lazy subscribe, simulcast tuning
- Error recovery flows

**Week 6 — Hardening**
- Rate limiting, abuse prevention
- E2EE opt-in (Insertable Streams)
- Audit logging
- Security review (pen-test ringan)

**Week 7–8 — Scale Out**
- Multi-region deploy (kalau perlu)
- Recording feature → S3
- Analytics dashboard sederhana
- Public launch + monitoring 24/7 minggu pertama

---

## 9. Anti-Patterns yang Harus Dihindari

1. ❌ **Pakai Socket.IO untuk media signaling** — overhead overkill, bukan tujuan socket.io. Pakai native WebSocket atau LiveKit signaling.
2. ❌ **Build sendiri SFU dari WebRTC raw** — solved problem, jangan reinvent.
3. ❌ **Skip TURN** — 10–15% user akan complain "tidak bisa join", root cause-nya susah debug.
4. ❌ **Host di Vercel/Netlify untuk media server** — serverless tidak cocok untuk long-lived UDP connections. Frontend boleh di Vercel, media WAJIB di VPS/dedicated.
5. ❌ **Pakai database SQL untuk room state** — overkill, latency tinggi. Redis cukup dengan TTL.
6. ❌ **Render semua participant video full-res** — destroys client GPU & bandwidth. Lazy + adaptive subscribe.
7. ❌ **Tidak punya plan untuk symmetric NAT** — pasti ada user yang kena.

---

## 10. Final Recommendation

**Mulai dari Phase 1 setup (single Hetzner VPS + LiveKit + Next.js)**, fokus pada UX yang solid untuk 10–50 user use-case dulu. LiveKit memberi runway scaling sampai puluhan ribu user tanpa rewrite arsitektur — kamu hanya tambah node, switch ke distributed mode, dan deploy multi-region saat traffic justify.

Hindari godaan untuk over-engineer di awal (Kubernetes, microservices, Kafka). MVP solid di single beefy VPS bisa serve ribuan user dan kamu punya ruang iterasi cepat.

**Total estimate untuk production-ready v1: 6–8 minggu dengan 1–2 engineer.**

Kalau butuh, bagian berikut yang bisa kita drill-down lebih dalam:
- Code skeleton Next.js + LiveKit React SDK untuk room page
- Docker Compose file + coturn config production-ready
- Load testing setup dengan `lk load-test`
- E2EE implementation detail
- Recording pipeline (LiveKit Egress → S3)
