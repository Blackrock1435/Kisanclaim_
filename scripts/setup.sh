#!/usr/bin/env bash
# One-shot macOS/Linux dev setup: python venv + npm install + demo accounts.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv backend/.venv && source backend/.venv/bin/activate
pip install -r backend/requirements.txt
if [ ! -f backend/.env ]; then
  cp .env.example backend/.env
  KEY=$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')
  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$KEY|" backend/.env && rm -f backend/.env.bak
fi
(cd frontend && npm install)
(cd backend && python seed.py)
echo "Done. Backend: cd backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "Frontend: cd frontend && npm run dev"
