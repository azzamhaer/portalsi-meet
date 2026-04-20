#!/bin/bash
# ==============================================================================
# PortalSI Meet — Deployment Automation Script (Contabo VPS + CyberPanel)
# ==============================================================================
# Skrip ini mengotomatiskan panduan deployment dari DEPLOY.md, termasuk:
# - Instalasi dependensi & Docker
# - Konfigurasi Firewall UFW
# - Setup kunci & variabel environment (.env)
# - Pembuatan Website dan Reverse Proxy di CyberPanel
# - Pendaftaran SSL Let's Encrypt
# ==============================================================================

# Pastikan dijalankan sebagai root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Skrip ini harus dijalankan sebagai root (atau pakai sudo)"
  exit 1
fi

set -e

# ==========================================
# 1. KONFIGURASI DOMAIN & DIRECTORY
# ==========================================
BASE_DOMAIN="portalsi.com"
MEET_DOMAIN="meet.portalsi.com"
LIVEKIT_DOMAIN="livekit.portalsi.com"
TURN_DOMAIN="turn.portalsi.com"
EMAIL="support@${BASE_DOMAIN}"
PROJECT_DIR="/home/${MEET_DOMAIN}/public_html"

echo "=========================================="
echo "🚀 Memulai Deployment PortalSI Meet"
echo "🌐 Domain Root: ${BASE_DOMAIN}"
echo "=========================================="

# Pindah ke directory opt 
# Note: Asumsi repository sudah di-clone ke direktorimu dan kamu run dari sana.
# Skrip akan copy isi foldernya ke /opt/portalsi-meet jika belum ada di sana.
if [ ! -d "$PROJECT_DIR" ]; then
  echo "📂 Menyalin project ke $PROJECT_DIR..."
  cp -r "$(pwd)" "$PROJECT_DIR"
fi

cd "$PROJECT_DIR"

# ==========================================
# 2. UPDATE SYSTEM & DEPENDENCIES
# ==========================================
echo "🔄 Mengupdate sistem dan menginstal dependensi dasar..."
apt update -y && DEBIAN_FRONTEND=noninteractive apt upgrade -y
apt install -y curl wget git ufw htop vim unzip openssl netcat-openbsd

# ==========================================
# 3. INSTALASI DOCKER & DOCKER COMPOSE
# ==========================================
if ! docker compose version > /dev/null 2>&1; then
  echo "🐳 Docker Compose tidak ditemukan. Menginstal ulang Docker dari repo resmi..."
  apt remove -y docker docker-engine docker.io containerd runc docker-compose docker-compose-plugin 2>/dev/null || true
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "🐳 Docker dan Docker Compose sudah terpasang."
fi

# ==========================================
# 4. SETUP FIREWALL (UFW)
# ==========================================
echo "🔥 Mengonfigurasi UFW Firewall... SKIPPING..."

# ==========================================
# 5. GENERATE KUNCI & SETUP .ENV
# ==========================================
echo "🔑 Meng-generate kunci LiveKit dan Coturn..."
LIVEKIT_API_KEY="API$(openssl rand -hex 8)"
LIVEKIT_API_SECRET=$(openssl rand -hex 32)
TURN_PASSWORD=$(openssl rand -base64 32 | tr -d /=+ | cut -c -32)
PUBLIC_IP=$(curl -s ifconfig.me)

echo "📄 Membuat file .env..."
cat <<EOF > .env
# Public URL WebSocket LiveKit (CyberPanel HTTPS proxy)
NEXT_PUBLIC_LIVEKIT_URL=wss://${LIVEKIT_DOMAIN}

# LiveKit Keys
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}

# Redis
REDIS_URL=redis://redis:6379

# TURN Server
PUBLIC_IP=${PUBLIC_IP}
TURN_REALM=${MEET_DOMAIN}
TURN_USER=portalsi
TURN_PASSWORD=${TURN_PASSWORD}
EOF

# ==========================================
# 6. BUILD & START DOCKER CONTAINERS
# ==========================================
echo "🏗️ Mem-build dan menjalankan image Docker..."
docker compose build web
docker compose up -d
echo "✅ Container Docker berhasil dijalankan."

# ==========================================
# 7. INTEGRASI CYBERPANEL (CLI)
# ==========================================
if command -v cyberpanel > /dev/null; then
  echo "🌐 Menyambungkan ke CyberPanel..."
  
  # 7.1 Create Website for MEET
  echo "🔧 Membuat website di CyberPanel: ${MEET_DOMAIN}"
  # Check apakah exist (menggagalkan command cyberpanel kalau udh exist itu wajar, kita pakai || true)
  cyberpanel createWebsite --package Default --owner admin --domainName ${MEET_DOMAIN} --email ${EMAIL} --php 8.1 || true
  
  # Inject reverse proxy rules to public_html/.htaccess
  echo "🔧 Setup Reverse Proxy (OpenLiteSpeed) untuk ${MEET_DOMAIN}"
  cat <<EOF > /home/${MEET_DOMAIN}/public_html/.htaccess
RewriteEngine On
# Proxy all requests to Next.js on localhost:3005
RewriteRule ^(.*)$ http://127.0.0.1:3005/\$1 [P,L]
EOF

  # 7.2 Create Website for LIVEKIT
  echo "🔧 Membuat website di CyberPanel: ${LIVEKIT_DOMAIN}"
  cyberpanel createWebsite --package Default --owner admin --domainName ${LIVEKIT_DOMAIN} --email ${EMAIL} --php 8.1 || true
  
  # Inject VirtualHost extprocessor untuk Websocket LiveKit
  echo "🔧 Setup WebSocket Reverse Proxy (vhost) untuk ${LIVEKIT_DOMAIN}"
  VHOST_CONF="/usr/local/lsws/conf/vhosts/${LIVEKIT_DOMAIN}/vhost.conf"
  
  if [ -f "$VHOST_CONF" ]; then
    # Menghindari duplikasi blok proxy
    if ! grep -q "livekit_backend" "$VHOST_CONF"; then
      cat <<EOF >> "$VHOST_CONF"

extprocessor livekit_backend {
  type                    proxy
  address                 http://127.0.0.1:7880
  maxConns                2000
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 livekit_backend
  addDefaultCharset       off
  rewrite  {
  }
}
EOF
    fi
  else
    echo "⚠️ Peringatan: File vhost.conf untuk ${LIVEKIT_DOMAIN} tidak ditemukan."
  fi

  # 7.3 SSL Issuance
  echo "🔒 Requesting SSL untuk ${MEET_DOMAIN} dan ${LIVEKIT_DOMAIN}..."
  cyberpanel issueSSL --domainName ${MEET_DOMAIN} || true
  cyberpanel issueSSL --domainName ${LIVEKIT_DOMAIN} || true

  # 7.4 Restart OpenLiteSpeed
  echo "🔄 Merestart OpenLiteSpeed untuk mengaplikasikan aturan reverse proxy..."
  systemctl restart lsws || true
  echo "✅ Integrasi CyberPanel selesai."
else
  echo "⚠️ CyberPanel CLI tidak ditemukan di sistem, melewati automasi panel."
fi

echo "=========================================="
echo "🎉 DEPLOYMENT SELESAI!"
echo "=========================================="
echo "Kamu dapat mengakses platform pada: https://${MEET_DOMAIN}"
echo "LiveKit WSS Socket ada di: wss://${LIVEKIT_DOMAIN}"
echo "Catatan Penting: Pastikan DNS kamu untuk '${MEET_DOMAIN}' dan '${LIVEKIT_DOMAIN}' sudah mengarah ke IP publik VPS ($PUBLIC_IP) dan berstatus DNS-only (bukan proxy)."
echo "=========================================="
