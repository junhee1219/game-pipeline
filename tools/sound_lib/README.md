# sound_lib — curated CC0 game-audio library

A local, tagged library of **297 SFX + 20 BGM** for the casual mobile HTML game
pipeline. Every file is **CC0 (public domain)**: you can use it commercially and
don't need to credit anyone. The license and source page for each file are in
`index.json`.

```
tools/sound_lib/
  index.json        machine-readable catalog (array, schema below)
  query.py          tag search CLI (stdlib only)
  sfx/*.mp3         mono 44.1 kHz 96 kbps, ~-16 LUFS, leading/trailing silence trimmed
  bgm/*.mp3         stereo 44.1 kHz 128 kbps, ~-20 LUFS, untrimmed (loop points preserved)
  _build/           manifest.py (curation + tags) and build.py (ffmpeg processing)
```

## Querying

```bash
python3 tools/sound_lib/query.py merge bright            # entries that have ALL of these tags
python3 tools/sound_lib/query.py --any win fanfare       # entries that have ANY of these tags
python3 tools/sound_lib/query.py coin -retro --max-dur 0.5   # "-tag" (or "no:tag") excludes a tag
python3 tools/sound_lib/query.py --kind bgm --mood calm --loopable
python3 tools/sound_lib/query.py pop --json              # full JSON entries
python3 tools/sound_lib/query.py --tags                  # all tags with counts
```
The command exits with code 1 when nothing matches. An `id` also works as a tag.

From code, load `index.json` and filter on `tags`, `kind`, `mood`, `duration`.

### index.json schema
```json
{ "id": "pop_bright_01", "path": "sfx/pop_bright_01.mp3", "kind": "sfx",
  "duration": 0.21, "tags": ["pop","merge","match","bubble","bright","cartoon"],
  "mood": null, "bpm": null, "loopable": false,
  "source": "Pop sounds (OpenGameArt)", "source_url": "https://opengameart.org/content/pop-sounds",
  "author": "cogitollc", "license": "CC0", "original_file": "pop1.ogg" }
```
BGM entries have `mood` set to `cheerful`, `calm`, `energetic`, `tense` or `victory`, plus a real `loopable` value. Some also have `bpm` and `notes`.
`duration` is the length of the processed file in seconds.

## Tag vocabulary
- **Game events:** tap, click, ui_open, ui_close, pop, merge, match, combo, coin, collect, reward, chime, sparkle, level_up, win, fanfare, new_record, fail, lose, error, whoosh, swipe, drop, land, impact, hit, break, glass, explosion, bounce, jump, slide, tick, countdown, powerup, unlock, magic.
- **Material and character:** bubble, water, wood, metal, paper, ceramic, stone, soft, heavy, bright, low, cute, cartoon.
- **Style:** ui, synth, retro / 8bit (chiptune-style; exclude with `-retro` for a polished look), voice, jingle, stinger, scifi.
- **Helpers:** confirm, notify, positive, negative, toggle, select, popup, timer, warning, start, game_over, one / two / three / go.

How the tags were assigned:
- Most tags were set by hand from filenames, pack descriptions and the pack context (see `_build/manifest.py`).
- `bright` / `low` were also added automatically from spectral balance: the energy above 3 kHz compared with the full band. This was not applied to noisy sounds such as paper, whooshes or breaks.
- For the Kenney *Music Jingles*, `win` vs `lose` comes from an automatic pitch-contour estimate: rising (≥ +4 semitones) is `win`, falling (≤ -5) is `lose`, and anything in between is `notify`. This is accurate for clear rises and falls but it is still a heuristic. Listen before you rely on it for important moments.
- Nothing was checked by ear. Treat the tags as strong hints.

## Sources and licenses

| Source | Author | License | Used for |
|---|---|---|---|
| [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney | CC0 | UI clicks, open/close, confirm, error, glass tinks, ticks |
| [Kenney UI Audio](https://kenney.nl/assets/ui-audio) | Kenney | CC0 | clicks, hovers, mechanical switches |
| [Kenney Digital Audio](https://kenney.nl/assets/digital-audio) | Kenney | CC0 | synth power-ups, chimes, jumps, fail tones, lasers |
| [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney | CC0 | wood/metal/glass/soft impacts, punches, breaks |
| [Kenney Casino Audio](https://kenney.nl/assets/casino-audio) | Kenney | CC0 | coin/chip stacks, card slides, dice |
| [Kenney RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney | CC0 | coin pouch, page flips, latches, doors |
| [Kenney Sci-fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | Kenney | CC0 | explosions, lasers, force field, slime |
| [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) | Kenney | CC0 | win/lose jingles (pizzicato, steel drum, 8-bit, sax, hits) |
| [Kenney Voiceover Pack](https://kenney.nl/assets/voiceover-pack) | Kenney | CC0 | countdown 3-2-1-go, you win, game over, new highscore… |
| [100 CC0 SFX](https://opengameart.org/content/100-cc0-sfx) | rubberduck | CC0 | springs (boing), bells, splashes, plops, glass, keys |
| [512 Sound Effects (8-bit style)](https://opengameart.org/content/512-sound-effects-8-bit-style) | Juhani Junkala | CC0 | retro coins, jumps, power-ups, fanfares, explosions |
| [Level up, power up, Coin get](https://opengameart.org/content/level-up-power-up-coin-get-13-sounds) | wobbleboxx | CC0 | rising level-up sweeps, coin, downer |
| [Pop sounds](https://opengameart.org/content/pop-sounds) | cogitollc | CC0 | bright pops |
| [Pop sounds](https://opengameart.org/content/pop-sounds-0) | EZduzziteh | CC0 | cute mouth pops |
| [3 Pop Sounds](https://opengameart.org/content/3-pop-sounds) | wubitog | CC0 | bubble pops |
| [bubbles 'pop'](https://opengameart.org/content/bubbles-pop) | farfadet46 | CC0 | bubble pop |
| [Bubble Sound Effects](https://opengameart.org/content/bubble-sound-effects) | BMacZero | CC0 | water bubbles |
| [Magic Spell SFX](https://opengameart.org/content/magic-spell-sfx) | JaggedStone | CC0 | magic / sparkle |
| [Bamboo stick swooshes](https://opengameart.org/node/2242) | qubodup | CC0 | whooshes |

The license on every OpenGameArt page was checked when the file was downloaded (2026-10-08).
*Good Morning* is offered under several licenses on OpenGameArt; this library uses its CC0 option.

### BGM
| id | mood | loopable | length | source (license page) |
|---|---|---|---|---|
| bgm_cheerful_happy_vibes | cheerful | yes | 45 s | [Happy Vibes — Ruskerdax](https://opengameart.org/node/160228) |
| bgm_cheerful_happy_clappy | cheerful | yes | 17 s | [Happy Clappy Loop — OwlishMedia](https://opengameart.org/content/happy-clappy-loop) |
| bgm_cheerful_cozy_puzzle_title | cheerful | yes (95 bpm) | 61 s | [Cozy Puzzle Title — MintoDog](https://opengameart.org/node/183286) |
| bgm_cheerful_good_morning | cheerful | yes | 121 s | [Good Morning — Cakeflaps](https://opengameart.org/node/86566) |
| bgm_cheerful_happy_menu_short | cheerful | yes | 13 s | [Happy menu song — Blocky Modeler](https://opengameart.org/content/happy-menu-song) |
| bgm_cheerful_happy_adventure_chiptune | cheerful | yes | 47 s | [Happy Adventure (Loop) — TinyWorlds](https://opengameart.org/content/happy-adventure-loop) |
| bgm_cheerful_heckin_crows_chiptune | cheerful | yes* | 62 s | [Heckin' Crows — congusbongus](https://opengameart.org/content/heckin-crows) |
| bgm_calm_heavenly_loop | calm | yes | 34 s | [Heavenly Loop — isaiah658](https://opengameart.org/node/76208) |
| bgm_calm_slow_stride | calm | yes | 131 s | [Slow Stride — isaiah658](https://opengameart.org/content/slow-stride) |
| bgm_calm_menu_chill | calm | yes | 17 s | [Menu Chill Music — etrock](https://opengameart.org/content/menu-chill-music) |
| bgm_calm_simple_menu_loop | calm | yes* | 119 s | [Simple menu/background loop — polosik](https://opengameart.org/node/186484) |
| bgm_energetic_upbeat_loop | energetic | yes | 21 s | [Upbeat short Music Loop — BenjaTheMaker](https://opengameart.org/node/54530) |
| bgm_energetic_head_in_the_sand_chiptune | energetic | yes | 38 s | [Head in the Sand — congusbongus](https://opengameart.org/content/head-in-the-sand-seamless-loop) |
| bgm_energetic_arplands_8bit | energetic | yes | 144 s | [The Arplands — LordZintick](https://opengameart.org/content/the-arplands) |
| bgm_energetic_fast_techno_loop | energetic | yes | 6 s | [Fast fun action techno loop — annandistance](https://opengameart.org/node/157883) |
| bgm_tense_tension_theme | tense | yes* | 43 s | [Tension Theme — umplix](https://opengameart.org/content/tension-theme) |
| bgm_tense_awful_great_action | tense | no (fade-out) | 154 s | [Awful great! — iamoneabe](https://opengameart.org/node/188882) |
| bgm_tense_fast_fight | tense | no | 27 s | [Fast fight / battle music — bonsaiheldin](https://opengameart.org/node/30344) |
| bgm_victory_jingle_pizzicato | victory | no | 1 s | [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) |
| bgm_victory_jingle_steeldrum | victory | no | 1.4 s | [Kenney Music Jingles](https://kenney.nl/assets/music-jingles) |

\* Loop seam not confirmed by listening (see `notes` in index.json).

**Gapless looping:** MP3 adds encoder padding of roughly 25–50 ms. To get a seamless loop:
- Decode with Web Audio (`decodeAudioData`), set `source.loop = true`, and set `loopStart` / `loopEnd` to skip the padding. Phaser's WebAudio sound manager with `loop: true` is usually close enough for music beds.
- Or crossfade two instances.

## Coverage notes (weak spots)
- `new_record`: only 2 files, both voice ("new highscore"). For a non-voice version, layer a `win` jingle with `sparkle`.
- `combo`: 5 files (retro coin doubles/clusters and hit stingers). For combo escalation, play `pop_bright_*` or `pep_blip_*` with an increasing `playbackRate`.
- `fanfare`: 7 files, all short (≤ 1.4 s). There is no long orchestral victory fanfare.
- `tick`: 7 and `countdown`: 16 (mostly voice), `explosion`: 8, `water`: 8, `error`: 8. There are only a few non-retro cartoon explosions.
- A lot of the material comes from Kenney's synth-flavored and retro packs. For a Royal Match–style polished look, prefer the non-retro tags (`-retro`) and the cute pops, pizzicato and steel-drum jingles.

## Rebuilding
`_downloads/` was deleted after the build. To rebuild:
1. Re-download each source into `_downloads/<dir>` (folder names are in `_build/manifest.py` → `SOURCES`; zips/7z archives are extracted into `<dir>/x/`, single OGA files go directly into `<dir>/`).
2. Run `python3 -I tools/sound_lib/_build/build.py`.

Processing details are in the `build.py` docstring.
