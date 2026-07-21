#!/usr/bin/env bash
# Redeploy manual en el server (equivalente a lo que hace el workflow de GitHub Actions).
# Uso desde /opt/btop:  bash deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> git pull"
git pull --ff-only origin main

echo "==> npm ci"
npm ci

echo "==> build (Vite lee VITE_* de .env.local)"
npm run build

echo "==> PM2 restart (--update-env relee el entorno)"
pm2 restart btop-rentals --update-env || pm2 start ecosystem.config.cjs
pm2 save

echo "==> Listo. Caddy sirve https://btop-rentals.com -> localhost:3000"
