#!/usr/bin/env python3
"""콘택트 시트: manifest 이미지를 체커보드 위에 격자로 깔아 한 장으로 본다(투명 정리 상태 확인용).

usage: contact_sheet.py games/<id> [--keys k1,k2] [--out path] [--cell 256]
"""
import argparse, json, os
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument("game"); ap.add_argument("--keys"); ap.add_argument("--out"); ap.add_argument("--cell", type=int, default=256)
a = ap.parse_args()
G = os.path.abspath(a.game)
man = json.load(open(os.path.join(G, "manifest.json")))
keys = set(a.keys.split(",")) if a.keys else None
items = [im for im in man.get("images", []) if (not keys or im["key"] in keys) and os.path.exists(os.path.join(G, im["file"]))]
C = a.cell; cols = 6; rows = max(1, (len(items) + cols - 1) // cols)
sheet = Image.new("RGB", (cols * C, rows * (C + 28)), (255, 255, 255))
chk = Image.new("RGB", (C, C))
d = ImageDraw.Draw(chk)
for y in range(0, C, 16):
    for x in range(0, C, 16):
        d.rectangle([x, y, x + 15, y + 15], fill=(205, 205, 215) if (x // 16 + y // 16) % 2 else (240, 240, 245))
dr = ImageDraw.Draw(sheet)
for i, im in enumerate(items):
    x, y = (i % cols) * C, (i // cols) * (C + 28)
    sheet.paste(chk, (x, y))
    img = Image.open(os.path.join(G, im["file"])).convert("RGBA")
    img.thumbnail((C - 8, C - 8))
    tile = Image.new("RGBA", (C, C), (0, 0, 0, 0))
    tile.paste(img, ((C - img.width) // 2, (C - img.height) // 2), img)
    sheet.paste(tile, (x, y), tile)
    dr.text((x + 6, y + C + 6), im["key"], fill=(20, 20, 20))
out = a.out or os.path.join(G, "build", "sheet.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
sheet.save(out)
print(out, len(items))
