#!/bin/bash
# Double-click to run Procurement Studio (Next.js) on this Mac.
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS version from https://nodejs.org, then double-click this file again."
  read -n 1 -s -r -p "Press any key to close"; exit 1
fi
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local — paste your OPENAI_API_KEY into it, save, then double-click start.command again."
  open -e .env.local
  read -n 1 -s -r -p "Press any key to close"; exit 0
fi
npm install --no-audit --no-fund
(sleep 4; open "http://localhost:3000") &
npm run dev
