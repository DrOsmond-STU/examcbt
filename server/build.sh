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
mkdir -p "$OUT/public/assets/img"
cp "$ROOT"/prototype/assets/img/*.jpg "$OUT/public/assets/img/"
cp "$ROOT"/prototype/assets/LICENSE-soft-ui-dashboard.txt "$OUT/public/assets/"
cp "$ROOT"/server/app/*.php "$ROOT"/server/app/.htaccess "$OUT/app/"
mkdir -p "$OUT/app/vendor" && cp "$ROOT"/server/app/vendor/* "$OUT/app/vendor/"
[ -f "$ROOT/server/app/users.php" ] && cp "$ROOT/server/app/users.php" "$OUT/app/"
cp "$ROOT"/prototype/js/*.js "$OUT/app/assets/js/"
echo "Paket siap: $OUT"
# Arsip deploy: folder storage server (log & data login) tidak pernah ikut dikemas.
tar -C "$OUT" --owner=0 --group=0 --exclude='app/storage/*' -cjf "$ROOT/dist/examcbt-app.tar.bz2" public app
echo "Arsip: $ROOT/dist/examcbt-app.tar.bz2"
