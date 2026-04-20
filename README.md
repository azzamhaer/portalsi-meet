# PortalSI Meet

Video conference web app real-time, tanpa login, production-ready. Dibangun dengan Next.js 14 + LiveKit (SFU) + Redis + coturn.

![Tech](https://img.shields.io/badge/Next.js-14-black) ![Tech](https://img.shields.io/badge/LiveKit-SFU-f59e0b) ![Tech](https://img.shields.io/badge/WebRTC-supported-10b981)

## ✨ Fitur

- 🎥 Video & audio HD real-time (simulcast 3 layer, adaptive bitrate)
- 👥 10–50 peserta per room (scalable ke ratusan)
- 🖥️ Screen sharing
- 💬 Chat real-time
- 🔒 Password & lobby (waiting room)
- 👑 Host controls (mute, kick)
- 📱 Responsive — desktop, tablet, mobile (iOS/Android)
- 🔁 Auto-reconnect saat koneksi putus
- 🎨 UI modern dengan palette orange (#f59e0b) + green (#10b981)

## 🏗️ Arsitektur

```
Browser ◄──WSS──► CyberPanel (OLS reverse proxy) ◄──► Next.js App (port 3000)
Browser ◄──WebRTC──► LiveKit SFU (port 7880/UDP 50000-50200)
                         │
                      Redis (room state)
                         │
                      coturn (TURN relay fallback)
```

**Baca dokumen arsitektur lengkap**: [`PortalSI-Meet-Architecture.md`](./PortalSI-Meet-Architecture.md)

## 🚀 Quick Start (Development)

```bash
# Clone / unzip project
cd portalsi-meet

# Install deps
npm install

# Copy env
cp .env.example .env
# Edit .env — minimal set LIVEKIT_API_KEY/SECRET dan NEXT_PUBLIC_LIVEKIT_URL

# Run LiveKit locally (via Docker, atau install binary)
docker run --rm -p 7880:7880 -p 7881:7881 -p 50000-50200:50000-50200/udp \
  -e LIVEKIT_KEYS="devkey: devsecretdevsecretdevsecretdevsecret" \
  livekit/livekit-server --dev --bind 0.0.0.0

# Run Redis
docker run -d -p 6379:6379 redis:7-alpine

# Run Next.js dev
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## 📦 Production Deployment

**Lihat [`DEPLOY.md`](./DEPLOY.md)** — panduan step-by-step deploy ke Contabo VPS + CyberPanel, lengkap dengan SSL, firewall, reverse proxy, dan troubleshooting.

## 🧩 Struktur Project

```
portalsi-meet/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # Root layout
│   ├── page.tsx               # Landing
│   ├── globals.css            # Tailwind + custom styles
│   ├── room/[id]/page.tsx     # Room entry point
│   ├── not-found.tsx
│   └── api/
│       ├── health/route.ts    # Health check
│       └── rooms/
│           ├── route.ts       # POST create room
│           └── [id]/
│               ├── route.ts   # GET room info
│               ├── join/route.ts   # POST join
│               └── kick/route.ts   # POST kick (host)
├── components/
│   ├── HomeHero.tsx           # Landing hero + form
│   ├── FeatureGrid.tsx
│   ├── RoomClient.tsx         # Room loader + name/password gate
│   └── MeetingRoom.tsx        # LiveKit room UI
├── lib/
│   ├── redis.ts               # ioredis client
│   ├── livekit.ts             # JWT + admin client
│   ├── rooms.ts               # CRUD room di Redis
│   ├── room-id.ts             # ID generator
│   └── rate-limit.ts          # Simple Redis rate limiter
├── docker/
│   └── livekit.yaml           # LiveKit config
├── Dockerfile                 # Multi-stage Next.js standalone
├── docker-compose.yml         # 4 services: web, redis, livekit, coturn
├── tailwind.config.ts
├── next.config.js
├── .env.example
├── DEPLOY.md                  # Deployment guide (WAJIB dibaca)
├── PortalSI-Meet-Architecture.md
└── README.md
```

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_LIVEKIT_URL` | ✅ | WSS URL LiveKit untuk browser client (e.g. `wss://livekit.yourdomain.com`) |
| `LIVEKIT_API_KEY` | ✅ | API key LiveKit untuk generate JWT |
| `LIVEKIT_API_SECRET` | ✅ | Secret untuk sign JWT (min 32 chars) |
| `LIVEKIT_HTTP_URL` | ✅ | HTTP URL ke LiveKit server (internal: `http://livekit:7880`) |
| `REDIS_URL` | ✅ | Connection string Redis (`redis://redis:6379`) |
| `PUBLIC_IP` | ✅ | IP publik VPS untuk coturn |
| `TURN_REALM` | ✅ | Domain TURN realm |
| `TURN_USER` / `TURN_PASSWORD` | ✅ | Credential TURN |

## 📊 Kapasitas & Resource

| Spec VPS | Capacity estimate |
|----------|-------------------|
| 4 vCPU / 8 GB RAM | ~300-500 concurrent users |
| 8 vCPU / 16 GB RAM | ~800-1200 concurrent users |
| 16 vCPU / 32 GB RAM | ~2000-3000 concurrent users |

**Bottleneck utama**: bandwidth (bukan CPU). 50 peserta @ 1.5 Mbps = 75 Mbps upload dari server.

## 📜 License

Proprietary — PortalSI. All rights reserved.

## 🙏 Credits

- [LiveKit](https://livekit.io) — SFU engine
- [Next.js](https://nextjs.org) — Framework
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Lucide Icons](https://lucide.dev) — Icons
