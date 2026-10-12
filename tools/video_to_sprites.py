#!/usr/bin/env python3
"""video_to_sprites.py — 영상(Gemini/Veo, 흰 배경) → 투명 스프라이트 시트(WebP) + 메타 JSON.

usage:
  video_to_sprites.py <video> <out_prefix> [--fps 12] [--max 384] [--start 0] [--end 0]
                      [--loop auto|none|pingpong] [--thresh 30] [--cols 8]
출력: <out_prefix>.webp (시트), <out_prefix>.json ({frameWidth, frameHeight, frames, fps, loop})

- 배경: 프레임 가장자리에서 '흰색에 가까운' 픽셀을 flood fill → 투명. 가장자리와 안 이어진 순백 덩어리도 --hole-min 면적 이상이면 투명(날개 사이 등). 작은 흰 하이라이트는 보존.
- 정렬: 전 프레임의 합집합 bbox로 동일 크롭 → 캐릭터가 시트 안에서 흔들리지 않는다.
- 루프: auto면 첫 프레임과 가장 닮은 뒤쪽 프레임에서 자른다(이음새 최소화). pingpong이면 왕복.
- 소리는 쓰지 않는다(프레임만 추출).
"""
import argparse, json, os, subprocess, tempfile, glob
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("out")
ap.add_argument("--fps", type=float, default=12); ap.add_argument("--max", type=int, default=384)
ap.add_argument("--start", type=float, default=0); ap.add_argument("--end", type=float, default=0)
ap.add_argument("--loop", default="auto", choices=["auto", "none", "pingpong"])
ap.add_argument("--thresh", type=float, default=30); ap.add_argument("--cols", type=int, default=8)
ap.add_argument("--min-loop", type=float, default=1.5, help="auto 루프 최소 길이(초)")
ap.add_argument("--hole-min", type=float, default=0.0015, help="가장자리와 안 이어진 흰 영역도 이 면적비(프레임 대비) 이상이면 배경으로 제거(날개 사이 등). 0이면 끔")
a = ap.parse_args()

tmp = tempfile.mkdtemp(prefix="v2s_")
cmd = ["ffmpeg", "-loglevel", "error", "-y"]
if a.start: cmd += ["-ss", str(a.start)]
cmd += ["-i", a.video]
if a.end: cmd += ["-t", str(a.end - a.start)]
cmd += ["-an", "-vf", f"fps={a.fps}", os.path.join(tmp, "f_%04d.png")]
subprocess.run(cmd, check=True)
paths = sorted(glob.glob(os.path.join(tmp, "f_*.png")))
if not paths:
    raise SystemExit("프레임 없음")


def cutout(path):
    img = Image.open(path).convert("RGB")
    arr = np.asarray(img).astype(np.float32)
    h, w, _ = arr.shape
    white = np.sqrt(((255 - arr) ** 2).sum(axis=2)) < a.thresh
    bg = np.zeros((h, w), bool); q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True; q.append((ny, nx))
    if a.hole_min > 0:
        # 갇힌 흰 영역(날개·팔 사이로 둘러싸인 배경): 아주 하얀(순백에 가까운) 덩어리만, 일정 면적 이상이면 제거.
        pure = np.sqrt(((255 - arr) ** 2).sum(axis=2)) < a.thresh * 0.6
        seen = bg.copy(); minA = a.hole_min * h * w
        for sy, sx in zip(*np.nonzero(pure & ~seen)):
            if seen[sy, sx]: continue
            comp = [(sy, sx)]; seen[sy, sx] = True; i = 0
            while i < len(comp):
                y, x = comp[i]; i += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and pure[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; comp.append((ny, nx))
            if len(comp) >= minA:
                ys, xs = zip(*comp); bg[list(ys), list(xs)] = True
    alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.0))
    out = img.convert("RGBA"); out.putalpha(alpha)
    return out


frames = [cutout(p) for p in paths]

# 루프 지점 선택
if a.loop == "auto" and len(frames) > 4:
    ref = np.asarray(frames[0].resize((96, 96))).astype(np.float32)
    minI = max(2, int(a.min_loop * a.fps))
    best, bestD = len(frames) - 1, 1e18
    for i in range(minI, len(frames)):
        d = np.abs(np.asarray(frames[i].resize((96, 96))).astype(np.float32) - ref).mean()
        if d < bestD: best, bestD = i, d
    frames = frames[:best]  # best 프레임은 첫 프레임과 거의 같으므로 제외 → 끊김 없는 루프
    print(f"[loop] {best}프레임에서 자름 (첫 프레임과 차이 {bestD:.2f})")
elif a.loop == "pingpong":
    frames = frames + frames[-2:0:-1]

# 합집합 bbox로 동일 크롭
box = None
for f in frames:
    b = f.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
pad = 4
W0, H0 = frames[0].size
box = (max(0, box[0] - pad), max(0, box[1] - pad), min(W0, box[2] + pad), min(H0, box[3] + pad))
frames = [f.crop(box) for f in frames]
fw, fh = frames[0].size
s = min(1.0, a.max / max(fw, fh))
fw, fh = max(1, round(fw * s)), max(1, round(fh * s))
frames = [f.resize((fw, fh), Image.LANCZOS) for f in frames]

cols = min(a.cols, len(frames)); rows = (len(frames) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * fw, rows * fh), (0, 0, 0, 0))
for i, f in enumerate(frames):
    sheet.paste(f, ((i % cols) * fw, (i // cols) * fh))
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
sheet.save(a.out + ".webp", "WEBP", quality=85, method=6)
meta = {"frameWidth": fw, "frameHeight": fh, "frames": len(frames), "fps": a.fps, "loop": a.loop}
json.dump(meta, open(a.out + ".json", "w"))
print("RESULT " + json.dumps({**meta, "sheet": a.out + ".webp", "bytes": os.path.getsize(a.out + ".webp")}))
