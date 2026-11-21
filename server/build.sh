#!/usr/bin/env bash
# Menyusun paket deploy di dist/examcbt-app dari server/ + prototype/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist/examcbt-app"
rm -rf "$OUT"
mkdir -p "$OUT/public/api" "$OUT/app/assets/js" "$OUT/app/storage"
cp "$ROOT"/server/public/index.php "$ROOT"/server/public/.htaccess "$OUT/public/"
cp "$ROOT"/server/public/api/*.php "$OUT/public/api/"
cp "$ROOT"/prototype/styles.css "$OUT/public/"
cp "$ROOT"/server/app/bootstrap.php "$ROOT"/server/app/rbac.php "$ROOT"/server/app/.htaccess "$OUT/app/"
[ -f "$ROOT/server/app/users.php" ] && cp "$ROOT/server/app/users.php" "$OUT/app/"
cp "$ROOT"/prototype/js/*.js "$OUT/app/assets/js/"
echo "Paket siap: $OUT"
# Arsip deploy: folder storage server (log & data login) tidak pernah ikut dikemas.
tar -C "$OUT" --owner=0 --group=0 --exclude='app/storage/*' -cjf "$ROOT/dist/examcbt-app.tar.bz2" public app
echo "Arsip: $ROOT/dist/examcbt-app.tar.bz2"
