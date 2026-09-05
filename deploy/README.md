# Deploy — Hostinger VPS (KVM 2)

Target: `srv1921909.hstgr.cloud` / `31.97.48.99` — Ubuntu 24.04, 2 vCPU, 8 GB.

## One-time server setup

```bash
# as root
adduser deploy && usermod -aG sudo deploy
mkdir -p /var/www/lombok-exotic/releases /etc/lombok-exotic
chown -R deploy:deploy /var/www/lombok-exotic

apt update && apt install -y nginx certbot python3-certbot-nginx
npm i -g pm2 pnpm

# env file — chmod 600, NEVER in git
install -m 600 /dev/null /etc/lombok-exotic/web.env
$EDITOR /etc/lombok-exotic/web.env   # copy from .env.example, real values

cp deploy/nginx.conf.example /etc/nginx/sites-available/lombok-exotic
ln -s /etc/nginx/sites-available/lombok-exotic /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d <domain> -d www.<domain>
```

## Firewall (via Hostinger MCP or panel)

Create a firewall group and attach to VM `1921909`:

| Port | Source | Note |
|---|---|---|
| 22 | admin IP only | SSH |
| 80 | any | HTTP (redirects) |
| 443 | any | HTTPS |

Everything else denied. Postgres is **not** exposed (Neon managed, or localhost only).

## GitHub Actions secrets

`VPS_HOST`, `VPS_USER` (`deploy`), `VPS_SSH_KEY` (private key for the deploy user).

## Releasing

- Tag `vX.Y.Z` and push, or run the **Deploy (VPS)** workflow manually.
- CI builds, ships `lex-build.tar.gz`, runs `deploy/deploy.sh` on the box:
  unpack → `drizzle-kit migrate` → swap `current` symlink → `pm2 startOrReload`
  → health-check `/api/health` (15 tries) → rollback to previous release on fail.

## Rollback (manual)

```bash
cd /var/www/lombok-exotic
ln -sfn "releases/<previous-ts>" current
pm2 startOrReload current/deploy/ecosystem.config.cjs --update-env
```

## Backups

- **Neon:** enable PITR; confirm restore procedure once.
- **On-VPS Postgres (if chosen):** cron `pg_dump | gzip` → `rclone` to Backblaze
  B2 daily; restore-test weekly. A backup you have never restored is not a backup.
