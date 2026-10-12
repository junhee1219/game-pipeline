#!/usr/bin/env bash
# 파이프라인 설치: npm 의존성, Playwright 브라우저, Python venv. 저장소 루트에서 실행.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v node >/dev/null || { echo "node가 필요합니다 (>= 20)"; exit 1; }
command -v python3 >/dev/null || { echo "python3가 필요합니다 (>= 3.11)"; exit 1; }
command -v ffmpeg >/dev/null || echo "⚠ ffmpeg가 없습니다 — 사운드 가공·영상 변환에 필요 (macOS: brew install ffmpeg)"
echo "[1/4] npm 의존성"; npm ci --silent || npm install --silent
echo "[2/4] Playwright chromium"; npx playwright install chromium >/dev/null
echo "[3/4] Python venv"; [ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip >/dev/null && .venv/bin/pip install -q -r requirements.txt
echo "[4/4] .env"; [ -f .env ] || { cp .env.example .env; echo "  .env를 만들었습니다 — OPENAI_API_KEY를 채워 넣으세요"; }
[ -f games/REGISTRY.md ] || cp games/REGISTRY.template.md games/REGISTRY.md
echo "완료. 확인: python3 tools/check_env.py && node tools/bundle.mjs _sample && node tools/qa/run.mjs _sample --bot-seconds=8"
