#!/usr/bin/env python3
"""Rebuild tools/sound_lib from raw downloads in tools/sound_lib/_downloads.

Usage: python3 -I tools/sound_lib/_build/build.py
Requires ffmpeg/ffprobe (/opt/homebrew/bin). Stdlib only.

Processing:
  SFX: trim leading (-55 dB) and trailing (-65 dB) silence, 3 ms fade-in /
       10 ms fade-out, gain to ~-16 LUFS (short clips: RMS proxy), peak
       capped at -1.5 dBFS with up to 4 dB of brickwall limiting allowed, mono 44.1 kHz MP3 96 kbps.
  BGM: linear gain to ~-20 LUFS integrated (no dynamic processing, so loops
       stay intact), peak cap -1.5 dBFS, stereo 44.1 kHz MP3 128 kbps.
"""
import json, os, re, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import manifest as M  # noqa: E402

LIB = os.path.dirname(HERE)
DL = os.path.join(LIB, "_downloads")
FF, FP = "/opt/homebrew/bin/ffmpeg", "/opt/homebrew/bin/ffprobe"
SFX_TARGET, BGM_TARGET, PEAK_CAP, LIMIT_HEADROOM = -16.0, -20.0, -2.0, 4.0

TRIM = ("silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.004,"
        "areverse,silenceremove=start_periods=1:start_threshold=-65dB:start_silence=0.03,"
        "afade=t=in:d=0.01,areverse,afade=t=in:d=0.003")


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


_index = None


def resolve(key, name):
    global _index
    if _index is None:
        _index = []
        for root, _, files in os.walk(DL):
            if "__MACOSX" in root:
                continue
            for f in files:
                _index.append(os.path.join(root, f))
    base = os.path.join(DL, M.SOURCES[key][0])
    hits = [p for p in _index if p.startswith(base + os.sep) and p.endswith(os.sep + name)]
    if len(hits) != 1:
        raise SystemExit(f"resolve {key}:{name} -> {hits}")
    return hits[0]


def measure(path, pre):
    """Return (integrated LUFS, rms dB, peak dB, duration) after the `pre` filter chain."""
    af = (pre + "," if pre else "") + "asplit[a][b];[a]astats=measure_overall=RMS_level+Peak_level:measure_perchannel=none[a1];" \
        "[b]apad=pad_dur=0.5,ebur128=peak=none[b1];[a1][b1]amix=inputs=2"
    r = run([FF, "-hide_banner", "-nostats", "-i", path, "-filter_complex", af, "-f", "null", "-"]).stderr
    rms = re.findall(r"RMS level dB: (-?[\d.]+|-inf)", r)
    pk = re.findall(r"Peak level dB: (-?[\d.]+|-inf)", r)
    li = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    f = lambda v: -120.0 if (not v or v[-1] == "-inf") else float(v[-1])
    return f(li), f(rms), f(pk)


def duration(p):
    return round(float(run([FP, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).stdout.strip()), 3)


def build_sfx(item):
    key, name, oid, tags = item
    src = resolve(key, name)
    out = os.path.join(LIB, "sfx", oid + ".mp3")
    ch = int(run([FP, "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels",
                  "-of", "csv=p=0", src]).stdout.strip() or 1)
    # explicit average downmix (ffmpeg's default stereo->mono matrix adds ~+3 dB)
    mono = "pan=mono|c0=0.5*c0+0.5*c1," if ch == 2 else ("pan=mono|c0=c0," if ch > 2 else "")
    chain = f"{mono}aresample=44100,{TRIM}"
    lufs, rms, peak = measure(src, chain)
    # Integrated loudness is unreliable below ~0.4 s; fall back to RMS proxy.
    loud = lufs if lufs > -70 else rms
    # spectral balance: level above 3 kHz relative to full-band RMS
    _, hi_rms, _ = measure(src, chain + ",highpass=f=3000,highpass=f=3000")
    bal = hi_rms - rms
    # Allow up to LIMIT_HEADROOM dB of transparent-ish peak limiting so
    # percussive sounds are not left far below target by their crest factor.
    gain = min(SFX_TARGET - loud, PEAK_CAP - peak + LIMIT_HEADROOM)
    lim = ",alimiter=limit=0.79:attack=1:release=40:level=0" if gain > PEAK_CAP - peak else ""
    r = run([FF, "-y", "-v", "error", "-i", src, "-af", f"{chain},volume={gain:.2f}dB{lim}",
             "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", out])
    if r.returncode:
        raise SystemExit(r.stderr)
    # post-check true peak of the encoded MP3; pull down if it overshoots -1 dBTP
    tp = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", run([FF, "-hide_banner", "-nostats", "-i", out, "-af",
                    "ebur128=peak=true", "-f", "null", "-"]).stderr)
    if tp and float(tp[-1]) > -1.0:
        trim_db = float(tp[-1]) + 1.3
        r = run([FF, "-y", "-v", "error", "-i", src, "-af", f"{chain},volume={gain:.2f}dB{lim},volume=-{trim_db:.2f}dB",
                 "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", out])
        gain -= trim_db
    return dict(id=oid, src=src, out=out, gain=round(gain, 1), loud_in=round(loud, 1), peak_in=peak, hi_bal=round(bal, 1))


def build_bgm(item):
    path, oid, mood, tags, loop, bpm, *_ = item
    src = os.path.join(DL, path)
    out = os.path.join(LIB, "bgm", oid + ".mp3")
    pre = ""
    if oid == "bgm_calm_simple_menu_loop":
        pre = "atrim=end=118.56"
    lufs, rms, peak = measure(src, pre)
    gain = min(BGM_TARGET - lufs, PEAK_CAP - peak)
    af = (pre + "," if pre else "") + f"volume={gain:.2f}dB"
    r = run([FF, "-y", "-v", "error", "-i", src, "-af", af, "-ac", "2", "-ar", "44100",
             "-c:a", "libmp3lame", "-b:a", "128k", "-map_metadata", "-1", out])
    if r.returncode:
        raise SystemExit(r.stderr)
    return dict(id=oid, src=src, out=out, gain=round(gain, 1), loud_in=round(lufs, 1), peak_in=peak)


def main():
    os.makedirs(os.path.join(LIB, "sfx"), exist_ok=True)
    os.makedirs(os.path.join(LIB, "bgm"), exist_ok=True)
    resolve("ki", "click_001.ogg")  # build file index before threading
    ids = [s[2] for s in M.S] + [b[1] for b in M.B]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        raise SystemExit(f"duplicate ids: {dup}")
    with ThreadPoolExecutor(8) as ex:
        sres = list(ex.map(build_sfx, M.S))
        bres = list(ex.map(build_bgm, M.B))
    entries = []
    for (key, name, oid, tags), r in zip(M.S, sres):
        tags = list(tags)
        # auto spectral tags (only when not contradicting manual tags)
        noisy = {"paper", "cloth", "whoosh", "swipe", "slide", "explosion", "break", "card", "dice", "door", "shuffle"}
        if r["hi_bal"] >= -5 and "low" not in tags and "bright" not in tags and not noisy & set(tags):
            tags.append("bright")
        if r["hi_bal"] <= -45 and "bright" not in tags and "low" not in tags:
            tags.append("low")
        _, sname, url, author, lic = M.SOURCES[key]
        entries.append(dict(id=oid, path=f"sfx/{oid}.mp3", kind="sfx", duration=duration(r["out"]),
                            tags=tags, mood=None, bpm=None, loopable=False,
                            source=sname, source_url=url, author=author, license=lic,
                            original_file=os.path.basename(name)))
    for b, r in zip(M.B, bres):
        path, oid, mood, tags, loop, bpm, title, author, url, lic, notes = b
        e = dict(id=oid, path=f"bgm/{oid}.mp3", kind="bgm", duration=duration(r["out"]),
                 tags=["bgm", mood] + tags, mood=mood, bpm=bpm, loopable=loop,
                 source=f"{title} (OpenGameArt)" if "opengameart" in url else "Kenney Music Jingles",
                 source_url=url, author=author, license=lic, original_file=os.path.basename(path))
        if notes:
            e["notes"] = notes
        entries.append(e)
    with open(os.path.join(LIB, "index.json"), "w") as f:
        json.dump(entries, f, indent=1, ensure_ascii=False)
    with open(os.path.join(HERE, "build_log.json"), "w") as f:
        json.dump(sres + bres, f, indent=0)
    print(f"sfx={len(sres)} bgm={len(bres)}")


if __name__ == "__main__":
    main()
