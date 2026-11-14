#!/usr/bin/env bash
# Isolated demo stack for one presenter: own database, own server and client ports.
#   stack.sh <n> reset   clone the flow 1-3 video database into ucms_video_p<n> (drops the old copy)
#   stack.sh <n> up      start server :310<n> and client :518<n> in the background (logs in /tmp)
#   stack.sh <n> down    stop both
#   stack.sh <n> env     print MONGO_URI / BASE_URL for seeds and recorders
# Cloudinary is blanked on purpose: the recording never uploads to an outside service.
set -euo pipefail
n="$1"; cmd="$2"
root="$(cd "$(dirname "$0")/../.." && pwd)"
db="ucms_video_p$n"; sport="310$n"; cport="518$n"
uri="mongodb://127.0.0.1:27017/$db"
base="ucms_video_demo_20261114"
case "$cmd" in
  reset)
    docker exec clubmanagementsystem-mongo-1 sh -c \
      "mongodump --quiet --db=$base --excludeCollection=authSessions --archive | mongorestore --quiet --drop --archive --nsFrom='$base.*' --nsTo='$db.*'"
    echo "reset $db from $base" ;;
  up)
    "$0" "$n" down >/dev/null 2>&1 || true
    cd "$root/server"
    PORT="$sport" MONGO_URI="$uri" CLIENT_BASE_URL="http://localhost:$cport" APP_BASE_URL="http://localhost:$sport" \
      CLOUDINARY_CLOUD_NAME= CLOUDINARY_API_KEY= CLOUDINARY_API_SECRET= \
      nohup node --env-file=../.env --import tsx src/main.ts > "/tmp/ucms-video-p$n-server.log" 2>&1 &
    cd "$root/client"
    PORT="$sport" nohup npx vite --port "$cport" --strictPort > "/tmp/ucms-video-p$n-client.log" 2>&1 &
    for _ in $(seq 1 60); do
      if curl -sf "http://localhost:$sport/api/v1/health" >/dev/null 2>&1 && curl -sf "http://localhost:$cport/" >/dev/null 2>&1; then
        echo "up: server :$sport client :$cport db $db"; exit 0
      fi
      sleep 1
    done
    echo "stack did not come up; see /tmp/ucms-video-p$n-*.log" >&2; exit 1 ;;
  down)
    for port in "$sport" "$cport"; do
      pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN || true)"
      [ -n "$pids" ] && kill $pids || true
    done ;;
  env)
    echo "MONGO_URI='$uri'"
    echo "BASE_URL='http://localhost:$cport'" ;;
esac
