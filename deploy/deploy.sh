#!/usr/bin/env bash
# Zero-ish-downtime release on the VPS. Runs ON the server, invoked by the
# GitHub Actions deploy workflow over SSH.
#
#   /var/www/lombok-exotic/
#     releases/<timestamp>/   <- unpacked build
#     current -> releases/<timestamp>   (symlink, atomically swapped)
#     shared/web.env          <- symlinked into each release
set -euo pipefail

APP_ROOT=/var/www/lombok-exotic
RELEASES="$APP_ROOT/releases"
KEEP=5
TS=$(date +%Y%m%d%H%M%S)
NEW="$RELEASES/$TS"

echo "→ release $TS"
mkdir -p "$NEW"
tar -xzf /tmp/lex-build.tar.gz -C "$NEW"

APP="$NEW/apps/lombok-exotic"

# Next standalone output ships server + node_modules but NOT static assets.
mkdir -p "$APP/.next/standalone/apps/lombok-exotic/.next"
cp -r "$APP/.next/static" "$APP/.next/standalone/apps/lombok-exotic/.next/static"
[ -d "$APP/public" ] && cp -r "$APP/public" "$APP/.next/standalone/apps/lombok-exotic/public"

ln -sfn /etc/lombok-exotic/web.env "$APP/.next/standalone/apps/lombok-exotic/.env"

echo "→ db migrate"
cd "$NEW"
set -a; . /etc/lombok-exotic/web.env; set +a
pnpm --filter @lombok-exotic/core exec drizzle-kit migrate

echo "→ swap symlink"
ln -sfn "$NEW" "$APP_ROOT/current"

echo "→ reload pm2"
pm2 startOrReload "$APP_ROOT/current/deploy/ecosystem.config.cjs" --update-env

echo "→ health check"
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
    echo "  healthy"
    break
  fi
  if [ "$i" = "15" ]; then
    echo "  UNHEALTHY — rolling back"
    PREV=$(ls -1dt "$RELEASES"/*/ | sed -n 2p)
    ln -sfn "${PREV%/}" "$APP_ROOT/current"
    pm2 startOrReload "$APP_ROOT/current/deploy/ecosystem.config.cjs" --update-env
    exit 1
  fi
  sleep 2
done

echo "→ prune old releases"
ls -1dt "$RELEASES"/*/ | tail -n +$((KEEP + 1)) | xargs -r rm -rf

echo "✓ deployed $TS"
