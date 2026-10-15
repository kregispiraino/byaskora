#!/bin/sh
set -eu
node /app/server/index.js &
api_pid=$!
/docker-entrypoint.sh nginx -g 'daemon off;' &
web_pid=$!
trap 'kill "$api_pid" "$web_pid" 2>/dev/null || true' EXIT INT TERM
wait -n "$api_pid" "$web_pid"
