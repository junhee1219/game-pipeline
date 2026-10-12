#!/usr/bin/env node
// bundle.mjs — games/<id>를 단일 dist/index.html로 묶는다 (엔진·kit·코드·이미지·사운드·폰트 전부 인라인).
// usage: node tools/bundle.mjs <id>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id) { console.error('usage: node tools/bundle.mjs <id>'); process.exit(1); }
const G = path.join(ROOT, 'games', id);
const PY = path.join(ROOT, '.venv/bin/python');
const manifest = JSON.parse(fs.readFileSync(path.join(G, 'manifest.json'), 'utf8'));
const BUILD = path.join(G, 'build');
fs.mkdirSync(BUILD, { recursive: true });

const b64 = (p) => fs.readFileSync(p).toString('base64');
const esc = (js) => js.replace(/<\/script/gi, '<\\/script');

// ── 이미지: PNG → WebP (리사이즈) ──
const imgs = (manifest.images || []).filter((im) => fs.existsSync(path.join(G, im.file)));
const missing = (manifest.images || []).filter((im) => !fs.existsSync(path.join(G, im.file)));
if (missing.length) console.warn('[bundle] 누락 이미지:', missing.map((m) => m.key).join(', '));
const jobs = imgs.map((im) => ({
  src: path.join(G, im.file),
  dst: path.join(BUILD, 'img', im.key + '.webp'),
  max: im.max || (im.role === 'bg' ? 1280 : im.role === 'logo' ? 1024 : 512),
  quality: im.quality_webp || (im.role === 'bg' ? 80 : 85),
  trim: im.role !== 'bg',
}));
const jobsFile = path.join(BUILD, 'img-jobs.json');
fs.writeFileSync(jobsFile, JSON.stringify(jobs));
execFileSync(PY, [path.join(ROOT, 'tools/img_prep.py'), jobsFile], { stdio: 'inherit' });
const images = {};
// kit 공용 이미지(튜토리얼 손 등) — 모든 게임에 자동 포함
for (const f of fs.existsSync(path.join(ROOT, 'kit/assets')) ? fs.readdirSync(path.join(ROOT, 'kit/assets')).filter((x) => x.endsWith('.png')) : []) {
  fs.mkdirSync(path.join(BUILD, 'img'), { recursive: true });
  const dst = path.join(BUILD, 'img', 'kit_' + f.replace('.png', '') + '.webp');
  execFileSync(PY, ['-c', `from PIL import Image; Image.open(${JSON.stringify(path.join(ROOT, 'kit/assets', f))}).save(${JSON.stringify(dst)}, 'WEBP', quality=90)`]);
  images['kit_' + f.replace('.png', '')] = 'data:image/webp;base64,' + b64(dst);
}
for (const im of imgs) images[im.key] = 'data:image/webp;base64,' + b64(path.join(BUILD, 'img', im.key + '.webp'));

// ── 오디오 ──
const audio = {};
for (const a of manifest.audio || []) {
  const p = path.join(G, a.file);
  if (!fs.existsSync(p)) { console.warn('[bundle] 누락 오디오:', a.key); continue; }
  const ext = path.extname(p).slice(1);
  audio[a.key] = `data:audio/${ext === 'mp3' ? 'mpeg' : ext};base64,` + b64(p);
}

// ── 스프라이트 시트 (영상 → video_to_sprites.py 산출물) ──
const sheets = {};
for (const sh of manifest.sheets || []) {
  const p = path.join(G, sh.file), mp = path.join(G, sh.meta || sh.file.replace(/\.webp$/, '.json'));
  if (!fs.existsSync(p) || !fs.existsSync(mp)) { console.warn('[bundle] 누락 시트:', sh.key); continue; }
  const meta = JSON.parse(fs.readFileSync(mp, 'utf8'));
  sheets[sh.key] = { uri: 'data:image/webp;base64,' + b64(p), fw: meta.frameWidth, fh: meta.frameHeight, frames: meta.frames, fps: sh.fps || meta.fps, loop: (sh.loop || meta.loop) !== 'none', meta };
}

// ── 코드 ──
const srcFiles = manifest.src || fs.readdirSync(path.join(G, 'src')).filter((f) => f.endsWith('.js')).sort().map((f) => 'src/' + f);
const gameJs = srcFiles.map((f) => `// ── ${f}\n` + fs.readFileSync(path.join(G, f), 'utf8')).join('\n');
const kitJs = fs.readFileSync(path.join(ROOT, 'kit/kit.js'), 'utf8');
const phaserJs = fs.readFileSync(path.join(ROOT, 'node_modules/phaser/dist/phaser.min.js'), 'utf8');

// ── 폰트: 한글은 실제로 쓰인 글자만 서브셋 ──
const usedText = gameJs + kitJs + JSON.stringify(manifest);
const chars = new Set(usedText.match(/[ㄱ-힝]/g) || []);
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');
const subsetText = ascii + [...chars].join('') + '·…!?%×';
const krOut = path.join(BUILD, 'kr.woff2');
fs.writeFileSync(path.join(BUILD, 'kr-chars.txt'), subsetText);
execFileSync(path.join(ROOT, '.venv/bin/pyftsubset'), [
  path.join(ROOT, 'kit/fonts/Jua-Regular.ttf'), `--text-file=${path.join(BUILD, 'kr-chars.txt')}`,
  '--flavor=woff2', `--output-file=${krOut}`, '--layout-features=*',
]);
const fontCss = `@font-face{font-family:"KitDisplay";src:url(data:font/ttf;base64,${b64(path.join(ROOT, 'kit/fonts/LilitaOne-Regular.ttf'))}) format("truetype");font-display:block}
@font-face{font-family:"KitKR";src:url(data:font/woff2;base64,${b64(krOut)}) format("woff2");font-display:block}`;

const letterbox = (manifest.style && manifest.style.letterbox) || '#1b1233';
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="theme-color" content="${letterbox}">
<title>${manifest.title || id}</title>
<style>${fontCss}
html,body{margin:0;padding:0;height:100%;background:${letterbox};overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
#game{position:fixed;inset:0}
.kit-fontwarm{position:absolute;left:-999px;top:0;font-size:8px;opacity:0}
</style></head>
<body><div id="game"></div><div class="kit-fontwarm"><span style="font-family:KitDisplay">0</span><span style="font-family:KitKR">가</span></div>
<script>${esc(phaserJs)}</script>
<script>window.__ASSETS__=${JSON.stringify({ images, audio, sheets })};</script>
<script>${esc(kitJs)}</script>
<script>${esc(gameJs)}</script>
</body></html>`;

const DIST = path.join(G, 'dist');
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'index.html'), html);
const mb = (Buffer.byteLength(html) / 1048576).toFixed(2);
console.log(`[bundle] ${id} → dist/index.html  ${mb}MB  (img ${imgs.length}, audio ${Object.keys(audio).length}, sheet ${Object.keys(sheets).length}, 한글 ${chars.size}자)`);
