#!/usr/bin/env python3
"""Query the CC0 sound library by tag (stdlib only).

Examples:
  python3 tools/sound_lib/query.py merge bright        # entries having ALL tags
  python3 tools/sound_lib/query.py --any win fanfare   # entries having ANY tag
  python3 tools/sound_lib/query.py --kind bgm --mood calm
  python3 tools/sound_lib/query.py pop --max-dur 0.3 --json
  python3 tools/sound_lib/query.py --tags              # list tag counts
Prefix a tag with "-" (or "no:") to exclude it, e.g. `coin -retro`.
"""
import argparse, collections, json, os, sys

LIB = os.path.dirname(os.path.abspath(__file__))


def load():
    with open(os.path.join(LIB, "index.json"), encoding="utf-8") as f:
        return json.load(f)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tags", nargs="*", help="tags to match (prefix with - to exclude)")
    ap.add_argument("--any", action="store_true", help="match any tag instead of all")
    ap.add_argument("--kind", choices=["sfx", "bgm"])
    ap.add_argument("--mood", help="bgm mood: cheerful|calm|energetic|tense|victory")
    ap.add_argument("--loopable", action="store_true", help="only loopable bgm")
    ap.add_argument("--max-dur", type=float)
    ap.add_argument("--min-dur", type=float)
    ap.add_argument("--json", action="store_true", help="print matching entries as JSON")
    ap.add_argument("--abs", action="store_true", help="print absolute file paths")
    ap.add_argument("--tags-list", "--tags", dest="list_tags", action="store_true", help="list all tags with counts")
    argv = sys.argv[1:] if argv is None else argv
    # "-tag" means exclude; rewrite so argparse doesn't treat it as an option
    argv = [f"no:{x[1:]}" if x.startswith("-") and not x.startswith("--") and x != "-h" else x for x in argv]
    a = ap.parse_args(argv)

    data = load()
    if a.list_tags:
        c = collections.Counter(t for e in data for t in e["tags"])
        for t, n in sorted(c.items(), key=lambda x: (-x[1], x[0])):
            print(f"{n:4d}  {t}")
        return 0

    inc = [t.lower() for t in a.tags if not t.startswith("no:")]
    exc = [t[3:].lower() for t in a.tags if t.startswith("no:")]
    out = []
    for e in data:
        tags = set(e["tags"]) | {e["id"]}
        if inc and not (any if a.any else all)(t in tags for t in inc):
            continue
        if any(t in tags for t in exc):
            continue
        if a.kind and e["kind"] != a.kind:
            continue
        if a.mood and e.get("mood") != a.mood:
            continue
        if a.loopable and not e.get("loopable"):
            continue
        if a.max_dur is not None and e["duration"] > a.max_dur:
            continue
        if a.min_dur is not None and e["duration"] < a.min_dur:
            continue
        out.append(e)

    if a.json:
        print(json.dumps(out, indent=1, ensure_ascii=False))
    else:
        for e in out:
            p = os.path.join(LIB, e["path"]) if a.abs else e["path"]
            extra = f" mood={e['mood']} loop={e['loopable']}" if e["kind"] == "bgm" else ""
            print(f"{e['id']:44s} {e['duration']:7.2f}s  {p}  [{', '.join(e['tags'])}]{extra}")
        print(f"-- {len(out)} match(es)", file=sys.stderr)
    return 0 if out else 1


if __name__ == "__main__":
    sys.exit(main())
