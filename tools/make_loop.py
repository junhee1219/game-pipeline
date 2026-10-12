#!/usr/bin/env python3
"""make_loop.py — 긴 음악(Gemini 음악 등)에서 이음새 없는 BGM 루프를 잘라 만든다.

usage: make_loop.py <in(mp3/mp4/wav)> <out.mp3> [--start 8] [--len 60] [--xfade 1.5] [--kbps 96] [--lufs -20]
원리: [start, start+len+xfade] 구간을 꺼내, 끝의 xfade초를 시작 xfade초 위에 등전력 크로스페이드로 겹친다.
결과 길이 = len. 루프 재생 시 끝→시작이 원래 음악처럼 이어진다. 앞뒤 무음이 없어 kit의 패딩 제거와도 충돌 없음.
"""
import argparse, subprocess, tempfile, os, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--start", type=float, default=8); ap.add_argument("--len", type=float, default=60)
ap.add_argument("--xfade", type=float, default=1.5); ap.add_argument("--kbps", type=int, default=96)
ap.add_argument("--lufs", type=float, default=-20)
a = ap.parse_args()

SR = 44100
tmp = tempfile.mkdtemp(prefix="loop_")
raw = os.path.join(tmp, "seg.wav")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(a.start), "-t", str(a.len + a.xfade), "-i", a.inp,
                "-vn", "-ac", "2", "-ar", str(SR), "-f", "wav", raw], check=True)
with wave.open(raw) as w:
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32)
n, xf = int(a.len * SR), int(a.xfade * SR)
if len(x) < n + xf:
    raise SystemExit("입력이 짧다")
body, tail = x[:n].copy(), x[n:n + xf]
t = np.linspace(0, np.pi / 2, xf)[:, None]
body[:xf] = body[:xf] * np.sin(t) + tail * np.cos(t)  # 등전력 크로스페이드
out_wav = os.path.join(tmp, "loop.wav")
with wave.open(out_wav, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(np.clip(body, -32768, 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", out_wav, "-af", f"loudnorm=I={a.lufs}:TP=-1.5",
                "-ar", str(SR), "-b:a", f"{a.kbps}k", a.out], check=True)
print(f"RESULT {a.out} {a.len}s {os.path.getsize(a.out)} bytes")
