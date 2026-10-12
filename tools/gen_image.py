#!/usr/bin/env python3
"""gen_image.py — 게임 에셋 이미지 생성 (OpenAI gpt-image, 레퍼런스 주입으로 스타일 고정).

  # 한 장
  gen_image.py one --prompt "..." --out a.png [--refs r1.png r2.png] [--quality low] [--size 1024x1024] [--n 3] [--opaque]
  # manifest의 images 전부(없는 것만) 생성
  gen_image.py manifest games/<id> [--only k1,k2] [--force] [--jobs 4]

설정: 모델·퀄리티 기본값은 환경변수 IMAGE_MODEL(기본 gpt-image-2.5-sunburst) / IMAGE_QUALITY(기본 low).
키: 레포 루트 .env 의 OPENAI_API_KEY.
투명 스프라이트는 API 투명 배경 + 정리(본체 덩어리만 남기고 글로우·바닥 그림자 제거)를 거친다.
"""
import argparse, base64, json, os, re, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def _provider_defaults():
    """우선순위: 환경변수 > .pipeline/providers.json(image) > .env > 기본값."""
    d = {}
    try:
        d = json.load(open(os.path.join(ROOT, ".pipeline", "providers.json"))).get("image", {})
    except Exception:
        pass
    envf = {}
    try:
        for line in open(os.path.join(ROOT, ".env")):
            m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)\s*$", line)
            if m: envf[m.group(1)] = m.group(2).strip().strip('"\'')
    except Exception:
        pass
    model = os.environ.get("IMAGE_MODEL") or d.get("model") or envf.get("IMAGE_MODEL") or "gpt-image-2.5-sunburst"
    quality = os.environ.get("IMAGE_QUALITY") or d.get("quality") or envf.get("IMAGE_QUALITY") or "low"
    return model, quality


MODEL, QUALITY = _provider_defaults()

OUTLINE_TEXT = " Thick clean dark outline around the whole silhouette."
SPRITE_SUFFIX = (
    " Isolated single game sprite on a fully transparent background." + OUTLINE_TEXT + " "
    "No glow, no aura, no ground shadow, no cast shadow, no background lighting, no floor, no text, no letters, no watermark."
)


def sprite_suffix(outline=True):
    """manifest style.outline=false (3D 렌더 스타일 등)이면 외곽선 문구를 뺀다."""
    return SPRITE_SUFFIX if outline else SPRITE_SUFFIX.replace(OUTLINE_TEXT, "")
REF_PREFIX = (
    "Draw a NEW asset in the EXACT same art style as the reference images (same outline weight, shading, palette, "
    "lighting direction, level of detail and rendering finish), so it looks like it belongs to the same game. "
    "Do not copy the reference subjects. Subject: "
)


def load_key():
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    p = os.path.join(ROOT, ".env")
    if os.path.exists(p):
        m = re.search(r"OPENAI_API_KEY\s*=\s*[\"']?([^\"'\n]+)", open(p).read())
        if m:
            return m.group(1).strip()
    sys.exit("OPENAI_API_KEY not found (.env)")


def _post(url, body, ctype, retries=3):
    for i in range(retries):
        req = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Authorization": f"Bearer {load_key()}", "Content-Type": ctype})
        try:
            return json.loads(urllib.request.urlopen(req, timeout=300).read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:600]
            if e.code in (429, 500, 502, 503) and i < retries - 1:
                time.sleep(4 * (i + 1)); continue
            raise RuntimeError(f"HTTP {e.code}: {msg}")
        except (urllib.error.URLError, TimeoutError) as e:
            if i < retries - 1:
                time.sleep(4 * (i + 1)); continue
            raise


def generate(prompt, refs=None, size="1024x1024", quality=None, transparent=True, n=1):
    """→ list[bytes] (PNG)"""
    quality = quality or QUALITY
    if refs:
        boundary = "----kit" + base64.b16encode(os.urandom(8)).decode()
        parts = []
        def field(k, v):
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
        field("model", MODEL); field("prompt", REF_PREFIX + prompt); field("size", size)
        field("quality", quality); field("n", str(n))
        if transparent:
            field("background", "transparent"); field("output_format", "png")
        for p in refs[:8]:
            parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"{os.path.basename(p)}\"\r\nContent-Type: image/png\r\n\r\n".encode())
            parts.append(open(p, "rb").read()); parts.append(b"\r\n")
        parts.append(f"--{boundary}--\r\n".encode())
        d = _post("https://api.openai.com/v1/images/edits", b"".join(parts), f"multipart/form-data; boundary={boundary}")
    else:
        body = {"model": MODEL, "prompt": prompt, "size": size, "quality": quality, "n": n, "output_format": "png"}
        if transparent:
            body["background"] = "transparent"
        d = _post("https://api.openai.com/v1/images/generations", json.dumps(body).encode(), "application/json")
    return [base64.b64decode(x["b64_json"]) for x in d["data"]]


def clean_sprite(path):
    """본체(가장 큰 불투명 덩어리 + 내부 구멍)만 남기고 떨어진 글로우·그림자·부스러기 제거, 가장자리 반투명 헤일로 정리."""
    im = Image.open(path).convert("RGBA")
    a = np.array(im.getchannel("A"))
    h, w = a.shape
    s = 4  # 다운샘플해서 연결 성분 계산
    small = (a[::s, ::s] >= 170)
    sh, sw = small.shape
    lab = np.zeros((sh, sw), dtype=np.int32); best, best_n, cur = 0, 0, 0
    for y in range(sh):
        for x in range(sw):
            if small[y, x] and lab[y, x] == 0:
                cur += 1; q = deque([(y, x)]); lab[y, x] = cur; cnt = 0
                while q:
                    cy, cx = q.popleft(); cnt += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < sh and 0 <= nx < sw and small[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = cur; q.append((ny, nx))
                if cnt > best_n:
                    best, best_n = cur, cnt
    if best == 0:
        return
    # 큰 덩어리 여럿(예: 분리된 파츠)은 본체의 8% 이상이면 유지
    sizes = np.bincount(lab.ravel())
    keep = np.isin(lab, [i for i in range(1, len(sizes)) if sizes[i] >= best_n * 0.08])
    # 내부 구멍 채우기: 바깥에서 flood fill 안 되는 곳 = 내부
    outside = np.zeros_like(keep); q = deque()
    for x in range(sw):
        for y in (0, sh - 1):
            if not keep[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
    for y in range(sh):
        for x in (0, sw - 1):
            if not keep[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < sh and 0 <= nx < sw and not keep[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True; q.append((ny, nx))
    mask_small = Image.fromarray((~outside * 255).astype(np.uint8), "L")
    mask = mask_small.resize((w, h), Image.NEAREST).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.2))
    m = np.array(mask).astype(np.float32) / 255.0
    na = (a.astype(np.float32) * m)
    na[na < 24] = 0  # 남은 옅은 헤일로 제거
    im.putalpha(Image.fromarray(na.clip(0, 255).astype(np.uint8), "L"))
    im.save(path)


def write_outputs(blobs, out, transparent, clean=True):
    files = []
    base, ext = os.path.splitext(out)
    for i, b in enumerate(blobs):
        p = out if len(blobs) == 1 else f"{base}-{i + 1}{ext}"
        os.makedirs(os.path.dirname(os.path.abspath(p)), exist_ok=True)
        open(p, "wb").write(b)
        if transparent and clean:
            clean_sprite(p)
        files.append(p)
    return files


def cmd_one(a):
    t = time.time()
    blobs = generate(a.prompt + ("" if a.opaque else SPRITE_SUFFIX), a.refs, a.size, a.quality, not a.opaque, a.n)
    files = write_outputs(blobs, a.out, not a.opaque, not a.no_clean)
    print("RESULT " + json.dumps({"files": files, "sec": round(time.time() - t, 1), "model": MODEL}))


def cmd_manifest(a):
    G = os.path.abspath(a.game)
    man = json.load(open(os.path.join(G, "manifest.json")))
    style = man.get("style", {})
    sp = style.get("prompt", "")
    anchors = [os.path.join(G, p) for p in style.get("anchors", []) if os.path.exists(os.path.join(G, p))]
    only = set(a.only.split(",")) if a.only else None
    todo = []
    for im in man.get("images", []):
        if only and im["key"] not in only:
            continue
        out = os.path.join(G, im["file"])
        if os.path.exists(out) and not a.force:
            continue
        todo.append(im)
    print(f"[gen] {len(todo)}장 생성 (모델 {MODEL}, 앵커 {len(anchors)}장)")

    def run(im):
        role = im.get("role", "sprite")
        transparent = im.get("transparent", role not in ("bg",))
        refs = None
        r = im.get("refs", "anchors")
        if r == "anchors":
            refs = anchors or None
        elif isinstance(r, list):
            refs = [os.path.join(G, p) for p in r]
        size = im.get("size", "1536x1024" if role == "bg_wide" else "1024x1536" if role == "bg" else "1024x1024")
        prompt = (sp + " " if sp else "") + im["prompt"] + (sprite_suffix(im.get("outline", style.get("outline", True))) if transparent else "")
        t = time.time()
        try:
            blobs = generate(prompt, refs, size, im.get("quality"), transparent, 1)
            write_outputs(blobs, os.path.join(G, im["file"]), transparent, im.get("clean", True))
            return (im["key"], "ok", round(time.time() - t, 1))
        except Exception as e:
            return (im["key"], "ERR " + str(e)[:300], 0)

    with ThreadPoolExecutor(max_workers=a.jobs) as ex:
        for key, st, sec in ex.map(run, todo):
            print(f"  {key}: {st} {sec}s", flush=True)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    o = sub.add_parser("one")
    o.add_argument("--prompt", required=True); o.add_argument("--out", required=True)
    o.add_argument("--refs", nargs="*"); o.add_argument("--quality"); o.add_argument("--size", default="1024x1024")
    o.add_argument("--n", type=int, default=1); o.add_argument("--opaque", action="store_true")
    o.add_argument("--no-clean", action="store_true")
    m = sub.add_parser("manifest")
    m.add_argument("game"); m.add_argument("--only"); m.add_argument("--force", action="store_true")
    m.add_argument("--jobs", type=int, default=4)
    a = ap.parse_args()
    cmd_one(a) if a.cmd == "one" else cmd_manifest(a)


if __name__ == "__main__":
    main()
