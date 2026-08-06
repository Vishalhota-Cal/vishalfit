#!/bin/bash
# Launches VISHALXFIT's local backend (Node/Express + SQLite) on a FIXED
# port, then opens the app. Always use this file — the app now has a real
# server behind it (your workouts, meals, and photos live in SQLite, not the
# browser), so it does not work at all if this isn't running.
set -e
cd "$(dirname "$0")/server"
PORT=7417

if [ ! -d node_modules ]; then
  echo "First run — installing server dependencies…"
  npm install
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created server/.env — add your OpenAI key there to use the AI food estimator."
fi

if ! lsof -i ":$PORT" >/dev/null 2>&1; then
  (PORT="$PORT" nohup node index.js >/tmp/vishalxfit-server.log 2>&1 &)
  sleep 1
fi

open "http://localhost:$PORT/"
