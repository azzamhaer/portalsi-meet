# PortalSI Meet — Deployment Guide (Contabo VPS + CyberPanel)

Panduan lengkap deploy PortalSI Meet ke VPS Contabo yang sudah terinstall CyberPanel. Ikuti urutan — setiap step penting untuk sistem bisa jalan sempurna.

---

## 📋 Prasyarat

**Yang harus kamu siapkan:**
- VPS Contabo dengan spec minimal: **4 vCPU, 8 GB RAM, 200 GB SSD** (Cloud VPS L atau VPS M minimal)
- OS: **Ubuntu 22.04 LTS** (CyberPanel support resmi)
- CyberPanel terinstall (biasanya sudah terpasang dari template Contabo atau install manual)
- Domain aktif dengan akses ke DNS (contoh: `meet.yourdomain.com` dan `livekit.yourdomain.com`)
- Akses SSH ke VPS (root atau sudo)

**Rekomendasi Contabo:**
- Cloud VPS L (8 vCPU, 30 GB RAM, 400 GB NVMe) — **€14.99/bln** — sweet spot untuk production
- Pilih lokasi **Singapore** atau **Frankfurt** untuk user Indonesia (latency terbaik)

---

## 🌐 Step 1 — Setup DNS

Login ke provider domain kamu (Cloudflare, Namecheap, GoDaddy, dll). Tambah 3 record:

| Type | Name               | Value                       | TTL  | Proxy (Cloudflare) |
|------|--------------------|-----------------------------|------|--------------------|
| A    | `meet`             | `IP_VPS_CONTABO`            | 300  | **DNS only (grey)**|
| A    | `livekit`          | `IP_VPS_CONTABO`            | 300  | **DNS only (grey)**|
| A    | `turn`             | `IP_VPS_CONTABO`            | 300  | **DNS only (grey)**|

**⚠️ Penting**: Kalau pakai Cloudflare, **wajib matikan proxy (orange cloud → grey cloud)**. WebRTC/WebSocket tidak bisa lewat Cloudflare proxy secara default.

Test dengan:
```bash
dig +short meet.yourdomain.com
dig +short livekit.yourdomain.com
```
Harus return IP VPS kamu.

---

## 🔐 Step 2 — SSH ke VPS & Update System

```bash
# Login via SSH (ganti IP_VPS_CONTABO)
ssh root@IP_VPS_CONTABO

# Update system
apt update && apt upgrade -y

# Install tools dasar
apt install -y curl wget git ufw htop vim unzip
```

---

## 🐳 Step 3 — Install Docker & Docker Compose

CyberPanel tidak include Docker by default.

```bash
# Remove paket lama kalau ada
apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null

# Install Docker dari repo resmi
curl -fsSL https://get.docker.com | sh

# Enable & start
systemctl enable docker
systemctl start docker

# Verify
docker --version
docker compose version
```

**Note**: Docker Compose sudah jadi plugin `docker compose` (v2), bukan `docker-compose` lama.

---

## 🔥 Step 4 — Konfigurasi Firewall (UFW)

Port yang dibutuhkan:

| Port | Protokol | Fungsi |
|------|----------|--------|
| 22   | TCP      | SSH |
| 80   | TCP      | HTTP (Let's Encrypt) |
| 443  | TCP      | HTTPS (web + WSS) |
| 8090 | TCP      | CyberPanel admin |
| 7881 | TCP      | LiveKit TCP fallback |
| 50000-50200 | UDP | LiveKit media (WebRTC) |
| 3478 | UDP+TCP  | coturn STUN/TURN |
| 5349 | TCP      | coturn TLS |
| 49160-49200 | UDP | coturn relay |

```bash
ufw default deny incoming
ufw default allow outgoing

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8090/tcp
ufw allow 7881/tcp
ufw allow 50000:50200/udp
ufw allow 3478
ufw allow 5349/tcp
ufw allow 49160:49200/udp

ufw --force enable
ufw status verbose
```

---

## 📂 Step 5 — Clone/Upload Project

### Opsi A: Upload via SCP dari lokal
```bash
# Dari komputer lokal kamu:
scp -r ./portalsi-meet root@IP_VPS_CONTABO:/opt/
```

### Opsi B: Clone dari Git (recommended)
```bash
# Di VPS:
cd /opt
git clone https://github.com/USERNAME/portalsi-meet.git
cd portalsi-meet
```

### Opsi C: Manual upload via CyberPanel File Manager
- Login CyberPanel → File Manager → upload semua file ke `/opt/portalsi-meet`

---

## 🔑 Step 6 — Generate LiveKit API Keys & TURN Credentials

```bash
cd /opt/portalsi-meet

# Generate LiveKit API key & secret
echo "LIVEKIT_API_KEY=API$(openssl rand -hex 8)"
echo "LIVEKIT_API_SECRET=$(openssl rand -hex 32)"

# Generate TURN password
echo "TURN_PASSWORD=$(openssl rand -base64 32 | tr -d /=+ | cut -c -32)"

# Dapatkan public IP
curl -s ifconfig.me
```

**Copy output di atas.**

---

## ⚙️ Step 7 — Buat File `.env`

```bash
cd /opt/portalsi-meet
cp .env.example .env
nano .env
```

Isi seperti ini (ganti dengan nilai kamu):

```bash
# Public LiveKit URL (WSS via reverse proxy CyberPanel)
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.yourdomain.com

# LiveKit keys (dari Step 6)
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

REDIS_URL=redis://redis:6379

# TURN
PUBLIC_IP=123.45.67.89        # IP publik VPS
TURN_REALM=meet.yourdomain.com
TURN_USER=portalsi
TURN_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Save (`Ctrl+O`, Enter, `Ctrl+X`).

---

## 🏗️ Step 8 — Build & Start Container

```bash
cd /opt/portalsi-meet

# Build image Next.js
docker compose build

# Start semua service (redis, livekit, coturn, web)
docker compose up -d

# Cek status
docker compose ps
```

Expected output:
```
NAME                STATUS              PORTS
portalsi-web        Up (healthy)        127.0.0.1:3000->3000/tcp
portalsi-redis      Up (healthy)        6379/tcp
portalsi-livekit    Up                  7880-7881/tcp, 50000-50200/udp
portalsi-coturn     Up                  (host network)
```

**Cek logs jika ada error:**
```bash
docker compose logs -f web
docker compose logs -f livekit
docker compose logs -f coturn
```

Test health endpoint:
```bash
curl http://127.0.0.1:3000/api/health
# Expected: {"ok":true,"redis":true,"livekit":true,...}
```

---

## 🌐 Step 9 — Setup Website di CyberPanel (Reverse Proxy)

Sekarang kita sambungkan domain `meet.yourdomain.com` dan `livekit.yourdomain.com` ke container.

### 9.1 Buat Website untuk `meet.yourdomain.com`

1. Login CyberPanel: `https://IP_VPS:8090`
2. Menu kiri → **Websites** → **Create Website**
3. Isi:
   - **Package**: Default
   - **Domain Name**: `meet.yourdomain.com`
   - **Email**: email admin kamu
   - **PHP**: PHP 8.1 (tidak dipakai, tapi wajib diisi)
   - **SSL**: ✅ centang
   - **DKIM Support**: ✅
   - **Open Basedir**: ❌
4. Klik **Create Website**

### 9.2 Setup Reverse Proxy via Rewrite Rules

Di CyberPanel kita pakai OpenLiteSpeed rewrite untuk reverse proxy ke container.

1. **Websites** → **List Websites** → cari `meet.yourdomain.com` → klik **Manage**
2. Scroll → **Rewrite Rules**
3. Hapus rule bawaan yang ada, paste rule berikut:

```apacheconf
RewriteEngine On

# Proxy all requests to Next.js on localhost:3000
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

4. **Save Rewrite Rules**
5. Restart OpenLiteSpeed: `systemctl restart lsws` (via SSH)

### 9.3 Buat Website untuk `livekit.yourdomain.com`

Ulangi step 9.1 untuk domain `livekit.yourdomain.com`.

### 9.4 Reverse Proxy untuk LiveKit (dengan WebSocket support)

LiveKit butuh WebSocket upgrade. OpenLiteSpeed support ini dengan konfigurasi khusus.

1. **Websites** → **List Websites** → `livekit.yourdomain.com` → **Manage**
2. Scroll ke **vHost Conf**
3. Cari block `context /` atau tambah di atas `#PHP_` comment. Set seperti ini:

```apacheconf
context / {
  type                    proxy
  handler                 livekit_backend
  addDefaultCharset       off
  rewrite  {

  }
}
```

4. Scroll ke atas file, di bagian `extProcessor` atau `vhost` config, tambahkan:

```apacheconf
extprocessor livekit_backend {
  type                    proxy
  address                 http://127.0.0.1:7880
  maxConns                2000
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}
```

5. **Save**
6. **Graceful Restart** OpenLiteSpeed (tombol di atas kanan panel)

### 9.5 Issue SSL untuk Kedua Domain

1. **Websites** → **Manage** (pilih `meet.yourdomain.com`)
2. Scroll ke **SSL** → **Issue SSL** → centang "Issue for both www and non-www"
3. Klik **Issue SSL**
4. Ulangi untuk `livekit.yourdomain.com` dan `turn.yourdomain.com`

**Jika SSL gagal**: pastikan DNS sudah propagate (cek dengan `dig`), dan port 80 terbuka. Coba ulangi setelah 5 menit.

---

## 🎯 Step 10 — Tes End-to-End

1. Buka browser: `https://meet.yourdomain.com`
2. Landing page PortalSI Meet harus muncul
3. Klik **Buat Meeting**, isi nama, klik tombol
4. Kamu harus masuk ke ruang meeting
5. Browser akan minta permission kamera/mic → **Allow**
6. Video kamu harus muncul
7. Copy Room ID, buka di browser lain (atau incognito), join dengan ID tersebut
8. Dua peserta harus saling lihat & dengar

**Jika gagal**, cek checklist troubleshooting di bagian bawah.

---

## 📊 Step 11 — Monitoring & Logs

### Cek status service
```bash
cd /opt/portalsi-meet
docker compose ps
docker stats --no-stream
```

### Cek logs
```bash
# Live logs
docker compose logs -f web
docker compose logs -f livekit

# Last 100 lines
docker compose logs --tail=100 web
```

### Restart service
```bash
# Satu service
docker compose restart web

# Semua
docker compose restart
```

---

## 🔄 Step 12 — Update Code

```bash
cd /opt/portalsi-meet
git pull                    # jika pakai git
docker compose build web    # rebuild hanya web
docker compose up -d web    # restart web dengan image baru
```

---

## 🔧 Troubleshooting

### ❌ Video/audio tidak muncul di peserta lain

**Kemungkinan**: Port UDP media LiveKit (50000-50200) atau coturn kena firewall.

```bash
# Verifikasi port UDP terbuka dari luar
nc -u -v IP_VPS_CONTABO 3478
# di VPS:
netstat -lun | grep 50
ufw status | grep -E "(50000|3478)"
```

Cek Contabo panel — kadang ada firewall tambahan di level hypervisor.

### ❌ "Connection failed" / WebSocket error

**Kemungkinan**: Reverse proxy WebSocket upgrade tidak aktif.

```bash
# Test WebSocket langsung
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: x" -H "Sec-WebSocket-Version: 13" \
  https://livekit.yourdomain.com/

# Harus return HTTP/1.1 101 Switching Protocols
```

Kalau gagal, cek vHost config OpenLiteSpeed — pastikan `extprocessor` untuk `livekit_backend` sudah benar.

**Alternatif**: Pakai **Caddy** sebagai reverse proxy untuk LiveKit (lihat Step 13 Opsional di bawah).

### ❌ LiveKit container restart terus

```bash
docker compose logs livekit --tail=50
```

Biasa karena `LIVEKIT_KEYS` format salah atau `external_ip` tidak detect. Edit `docker/livekit.yaml` dan uncomment + isi `external_ip` manual:
```yaml
rtc:
  use_external_ip: false
  external_ip: "IP_PUBLIK_VPS"
```

Lalu `docker compose restart livekit`.

### ❌ Koneksi putus-nyambung

- Cek bandwidth VPS: `iftop` atau `vnstat`
- Contabo VPS M kadang rate-limited di 200 Mbps. Upgrade ke VPS L atau Cloud VPS L.
- Tambahkan TURN relay fallback (pastikan `NEXT_PUBLIC_LIVEKIT_URL` bisa reach coturn).

### ❌ SSL gagal di CyberPanel

```bash
# Manual issue dengan acme.sh (yang CyberPanel pakai)
/root/.acme.sh/acme.sh --issue -d meet.yourdomain.com \
  --webroot /home/meet.yourdomain.com/public_html
```

---

## 🔄 Step 13 (Opsional) — Pakai Caddy untuk Reverse Proxy LiveKit

Jika OpenLiteSpeed bermasalah dengan WebSocket, pakai Caddy (lebih sederhana, auto HTTPS).

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

Edit `/etc/caddy/Caddyfile`:
```caddy
livekit.yourdomain.com {
    reverse_proxy 127.0.0.1:7880
}
```

Di CyberPanel: **jangan buat website** untuk `livekit.yourdomain.com` (biar Caddy handle port 80/443 untuk subdomain ini saja).

**⚠️**: Ini conflict dengan OpenLiteSpeed kalau keduanya listen ke 443. Solusi: jalankan Caddy di port 8443 dan arahkan ke sana via iptables, ATAU pisahkan LiveKit ke VPS terpisah.

Cara termudah: **Tetap pakai OpenLiteSpeed** dan konfigurasi vHost seperti Step 9.4.

---

## 🚀 Step 14 — Optimasi Performa Production

### 14.1 Enable HTTP/3 (QUIC) di CyberPanel
**Websites** → Manage → **General Settings** → aktifkan HTTP/3 dan Brotli.

### 14.2 Set resource limit Docker
Edit `docker-compose.yml` tambah di service `web`:
```yaml
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### 14.3 Enable auto-restart on reboot
Sudah handled via `restart: unless-stopped`. Verifikasi:
```bash
systemctl enable docker
```

### 14.4 Backup Redis (opsional)
Redis in-memory; room state auto-expire 24 jam. Jika butuh persist, aktifkan AOF di `docker-compose.yml`:
```yaml
  redis:
    command: ['redis-server', '--appendonly', 'yes', '--maxmemory', '256mb']
```

---

## 📈 Monitoring Production (Opsional tapi Recommended)

### Install Netdata (lightweight, gratis)
```bash
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```
Dashboard di `https://IP_VPS:19999` (tambahkan ke UFW).

### LiveKit Prometheus metrics
LiveKit expose metrics di `:6789/metrics`. Setup Prometheus + Grafana jika serius scale.

---

## ✅ Checklist Final

- [ ] Domain DNS sudah pointing ke VPS (verified with `dig`)
- [ ] Firewall UFW aktif dengan port yang benar
- [ ] Docker containers semua running (`docker compose ps`)
- [ ] Health endpoint return OK (`curl /api/health`)
- [ ] SSL aktif di kedua subdomain (browser lock icon)
- [ ] Video call 2 browser berbeda works
- [ ] Test dari jaringan mobile (4G) — paling akurat untuk cek TURN
- [ ] Test screen share
- [ ] Test chat
- [ ] Test dari iPhone Safari (paling sering bermasalah)
- [ ] Set reminder untuk renew SSL (CyberPanel auto-renew via acme.sh)

---

## 🛟 Kontak & Support

Kalau stuck, cek urutan:
1. Logs container: `docker compose logs -f`
2. Logs OpenLiteSpeed: `tail -f /usr/local/lsws/logs/error.log`
3. Logs system: `journalctl -xe`
4. Network: `ss -tlnp` untuk cek port listening

**Best practice**: Ambil snapshot Contabo sebelum deploy production, jadi bisa rollback cepat kalau ada masalah.

Good luck! 🚀
