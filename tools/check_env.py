#!/usr/bin/env python3
"""키·환경 점검 — 키 값은 출력하지 않는다."""
import json, os, re, shutil, sys, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = {}
p = os.path.join(ROOT, ".env")
if os.path.exists(p):
    for line in open(p):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)\s*$", line)
        if m: env[m.group(1)] = m.group(2).strip().strip('"\'')
ok = True
def chk(name, cond, hint=""):
    global ok
    print(("✅ " if cond else "❌ ") + name + ("" if cond else f" — {hint}"))
    ok = ok and cond
chk(".env 존재", os.path.exists(p), "cp .env.example .env")
key = env.get("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
chk("OPENAI_API_KEY 설정", bool(key), ".env에 키를 넣으세요")
chk("node_modules", os.path.isdir(os.path.join(ROOT, "node_modules")), "bash tools/setup.sh")
chk(".venv", os.path.isdir(os.path.join(ROOT, ".venv")), "bash tools/setup.sh")
chk("ffmpeg", bool(shutil.which("ffmpeg")), "brew install ffmpeg")
if key:
    model = env.get("IMAGE_MODEL", "gpt-image-2.5-sunburst")
    try:
        req = urllib.request.Request("https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})
        ids = [m["id"] for m in json.loads(urllib.request.urlopen(req, timeout=20).read())["data"]]
        chk(f"이미지 모델 접근 ({model})", model in ids, f"이 키로 {model}에 접근할 수 없습니다 — IMAGE_MODEL을 바꾸세요 (예: gpt-image-2)")
    except Exception as e:
        chk("OpenAI API 연결", False, str(e)[:120])
sys.exit(0 if ok else 1)
