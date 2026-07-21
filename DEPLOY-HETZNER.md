# Deploy BTOP Rentals — Hetzner + Node 24 + PM2 + Caddy

Stack: **Node 24 (NodeSource) · PM2 · Caddy (TLS automático) · deploy vía GitHub Actions (SSH)**.
La app es una SPA estática de Vite; un pequeño servidor Express (`deploy/server.mjs`) sirve
`dist/` en `localhost:3000` bajo PM2, y **Caddy** hace `reverse_proxy` con HTTPS automático.

- Servidor: Hetzner CX22, Ubuntu, IP pública `SERVER_IP`.
- Dominio: **btop-rentals.com** (DNS en Spaceship).
- Repo: `https://github.com/NebulaTechLabs-Prueba/btop-rentals`.

> Sustituye `SERVER_IP` por la IP real del server en los comandos DNS y en los GitHub Secrets.

---

## 1. DNS en Spaceship

Spaceship → dominio → **Advanced DNS** → añade (a la IP del server):

| Type | Host | Value       | TTL  |
|------|------|-------------|------|
| A    | `@`  | `SERVER_IP` | Auto |
| A    | `www`| `SERVER_IP` | Auto |

Verifica antes de emitir el certificado: `dig +short btop-rentals.com` → `SERVER_IP`.

## 2. SSH inicial + hardening

Entra como root (Hetzner te dio la contraseña por email):

```bash
ssh root@SERVER_IP
```

### 2a. Crear usuario de deploy y darle tu llave

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy   # sudo sin password (para PM2 startup / caddy)
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Desde **tu máquina local**, copia tu llave pública (crea una con `ssh-keygen -t ed25519` si no tienes):

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@SERVER_IP
# o pega tu clave pública manualmente en /home/deploy/.ssh/authorized_keys
```

**Prueba** que entras sin password antes de seguir: `ssh deploy@SERVER_IP`.

### 2b. Endurecer SSH (solo cuando la llave ya funcione)

```bash
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2c. Firewall UFW

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 3. Instalar Node 24, PM2, Caddy

```bash
# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git

# PM2
sudo npm install -g pm2

# Caddy (repo oficial)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

## 4. Primer deploy manual

Como usuario **deploy**:

```bash
sudo mkdir -p /opt/btop && sudo chown -R deploy:deploy /opt/btop
git clone https://github.com/NebulaTechLabs-Prueba/btop-rentals.git /opt/btop
cd /opt/btop

# Secrets del frontend (Vite los hornea en build). Estos son públicos (anon/publishable).
cat > .env.local <<'EOF'
VITE_SUPABASE_URL=https://onpvhedeinpsggdanylg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Ra9k4PKwOv5qRiyTwGO26Q_kDvIWdCc
EOF

npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH pm2 startup systemd -u deploy --hp /home/deploy   # arranque en boot
```

Verifica el proceso: `pm2 status` y `curl -I localhost:3000` (debe dar `200`).

## 5. Configurar Caddy

```bash
sudo cp /opt/btop/deploy/Caddyfile /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy emite el certificado automáticamente (necesita que el DNS ya apunte y los puertos 80/443 abiertos).
Prueba: `https://btop-rentals.com`.

## 6. Deploy continuo (GitHub Actions)

El workflow `.github/workflows/deploy.yml` (ya en el repo) hace SSH → `git pull` → escribe
`.env.local` desde Secrets → `npm ci` → `npm run build` → `pm2 restart btop-rentals --update-env`.

### Secrets a crear en GitHub (repo → Settings → Secrets and variables → Actions)

| Secret | Valor |
|--------|-------|
| `HETZNER_HOST` | `SERVER_IP` |
| `HETZNER_USER` | `deploy` |
| `HETZNER_SSH_KEY` | La **llave privada** ed25519 cuyo `.pub` está en `authorized_keys` de deploy |
| `VITE_SUPABASE_URL` | `https://onpvhedeinpsggdanylg.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_Ra9k4PKwOv5qRiyTwGO26Q_kDvIWdCc` |

> Genera una llave dedicada para CI: `ssh-keygen -t ed25519 -f deploy_ci -N ""`, añade `deploy_ci.pub`
> a `/home/deploy/.ssh/authorized_keys` en el server, y pega el contenido de `deploy_ci` (privada)
> en `HETZNER_SSH_KEY`. (Si el server usa un puerto SSH distinto de 22, añade el secret `HETZNER_PORT`
> y la línea `port:` al workflow.)

A partir de ahí, cada push a `main` despliega solo. Redeploy manual en el server: `bash deploy/deploy.sh`.

---

## Notas
- **`--update-env`**: PM2 relee el entorno en cada restart. En una SPA estática los `VITE_*` se hornean
  en el build; el flag queda correcto para cuando agregues backend en runtime.
- **Persistencia:** el backend Supabase (`btop-rentals`, us-east-2) ya está provisionado y con datos.
  El frontend aún usa localStorage; el "flip" de la capa de datos + Auth es el siguiente paso.
- **Rollback:** `cd /opt/btop && git checkout <commit> && npm ci && npm run build && pm2 restart btop-rentals --update-env`.
