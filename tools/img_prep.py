#!/usr/bin/env python3
"""이미지 전처리: PNG → 리사이즈 + WebP(알파 유지). bundle.mjs가 호출한다.

usage: img_prep.py <jobs.json>
jobs.json = [{"src": "...png", "dst": "...webp", "max": 512, "quality": 88}]
캐시: dst가 src보다 새롭고, 같은 설정(max·quality·trim)으로 만든 것이면 건너뛴다(설정은 dst.key 사이드카에 기록).
"""
import json, os, sys
from PIL import Image

jobs = json.load(open(sys.argv[1]))
for j in jobs:
    src, dst = j["src"], j["dst"]
    key = json.dumps({k: j.get(k) for k in ("max", "quality", "trim")}, sort_keys=True)
    kf = dst + ".key"
    same = os.path.exists(kf) and open(kf).read() == key
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src) and same and not j.get("force"):
        continue
    im = Image.open(src)
    im = im.convert("RGBA") if im.mode not in ("RGBA", "RGB") else im
    # 투명 여백 자동 크롭(스프라이트만) — 히트박스·정렬이 그림 실제 크기를 따르게
    if j.get("trim") and im.mode == "RGBA":
        bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox:
            x0, y0, x1, y1 = bbox
            pad = max(2, int(min(x1 - x0, y1 - y0) * 0.02))  # 그림 영역의 짧은 변 기준(가는 스프라이트가 넓어지지 않게)
            im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
    m = j.get("max", 512)
    if max(im.size) > m:
        s = m / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst, "WEBP", quality=j.get("quality", 88), method=6)
    open(kf, "w").write(key)
print("ok", len(jobs))
