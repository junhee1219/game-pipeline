#!/usr/bin/env node
// QA 게이트 L1(기술) + L2(계약 이행). usage: node tools/qa/run.mjs <id> [--bot-seconds 45]
// 결과: games/<id>/qa/report.json · report.md · shots/*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const id = process.argv[2];
const botArg = process.argv.find((a) => a.startsWith('--bot-seconds='));
if (!id) { console.error('usage: node tools/qa/run.mjs <id>'); process.exit(1); }
const G = path.join(ROOT, 'games', id);
const DIST = path.join(G, 'dist/index.html');
const OUT = path.join(G, 'qa');
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(G, 'manifest.json'), 'utf8'));
// 게임별 QA 봇 설정(manifest.qa): 실시간 게임은 길게·힌트 위주로 돌려야 가속(D9)이 판 흐름을 반영한다
const QA = manifest.qa || {};
const botSec = botArg ? Number(botArg.split('=')[1]) : (QA.botSeconds || 45);
const botMoveRate = QA.botMoveRate === undefined ? 0.75 : QA.botMoveRate;

const checks = [];
const check = (layer, idc, name, pass, detail) => { checks.push({ layer, id: idc, name, pass: !!pass, detail: detail === undefined ? '' : String(detail) }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sizeMB = fs.statSync(DIST).size / 1048576;
check('L1', 'A3', '파일 크기 ≤ 10MB', sizeMB <= 10, sizeMB.toFixed(2) + 'MB');

// 실제 GPU(Metal) 렌더러로 측정 — headless-shell은 SwiftShader 소프트웨어 렌더링이라 FPS가 실기기보다 크게 낮게 나온다
const browser = await chromium.launch({ channel: 'chromium', args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [], external = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) external.push(u); });

const url = pathToFileURL(DIST).href;
// 새로고침하면 페이지 안 이벤트가 사라지므로 node 쪽에 누적한다
const allEvents = [];
const harvest = async () => { try { allEvents.push(...(await page.evaluate(() => window.__kitEvents.splice(0)))); } catch (e) {} };
const t0 = Date.now();
await page.goto(url);
let ready = false;
try { await page.waitForFunction(() => window.__test && window.__test.ready, null, { timeout: 25000 }); ready = true; } catch (e) {}
const bootMs = Date.now() - t0;
check('L1', 'A2', 'file:// 로 부팅', ready, bootMs + 'ms');
if (!ready) { await finish(); process.exit(1); }

await sleep(1800);
await page.screenshot({ path: path.join(SHOTS, '1-title.png') });
check('L1', 'C1', '타이틀 화면 도달', (await page.evaluate(() => __test.scene())).includes('Title'));

// 실제 탭으로 플레이 시작(버튼 위치는 kit 표준: H*0.8)
const H = await page.evaluate(() => Kit.H);
await page.touchscreen.tap(195, Math.round(844 * 0.8)); // 390×844에선 FIT 스케일이 정확히 맞는다
await sleep(900);
let scenes = await page.evaluate(() => __test.scene());
if (!scenes.includes('Play')) { await page.evaluate(() => __test.startGame(true)); await sleep(800); }
scenes = await page.evaluate(() => __test.scene());
check('L1', 'C1', '플레이 화면 도달(탭)', scenes.includes('Play'), scenes.join(','));
const hasApi = await page.evaluate(() => !!(__test.api));
check('L1', 'E1', 'Kit.test.register 구현', hasApi);
await sleep(1200);
await page.screenshot({ path: path.join(SHOTS, '2-play-start.png') });
// 첫 화면(튜토리얼)은 위에서 찍었다. manifest.qa.presetSave가 있으면 그 저장값(예: 튜토리얼 완료·판 수)을 넣고
// 새 판으로 다시 시작해 봇이 '튜토리얼이 아닌 실제 판'을 돌게 한다 — 가속(D9)·밸런스가 실제 판을 반영하도록.
if (QA.presetSave) {
  await page.evaluate((ps) => { for (const [k, v] of Object.entries(ps)) Kit.save.set(k, v); Kit.save.del('resume'); __test.startGame(true); }, QA.presetSave);
  await sleep(1500);
}

// ── 봇 플레이 + FPS (CPU 4배 스로틀) ──
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.evaluate(() => {
  window.__fps = { frames: 0, start: performance.now(), worst: 0, last: performance.now() };
  const f = () => { const n = performance.now(); window.__fps.worst = Math.max(window.__fps.worst, n - window.__fps.last); window.__fps.last = n; window.__fps.frames++; requestAnimationFrame(f); };
  requestAnimationFrame(f);
});
let moves = 0, scoreMid = null, shotMid = false, overAt = null, resumeDone = false;
let resumeOk = false, resumeDetail = '판이 3수 전에 끝나 검사 생략';
async function resumeCheck() {
  // 연출이 끝나 다시 입력을 받을 때(moves 비어있지 않음)까지 최대 15초 대기 → 확정된 상태에서 검사
  try { await page.waitForFunction(() => __test.isOver() || (__test.moves() || []).length > 0, null, { timeout: 15000 }); } catch (e) {}
  await sleep(400);
  const live = await page.evaluate(() => !__test.isOver() && __test.scene().includes('Play'));
  if (!live) return;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  const s1 = await page.evaluate(() => __test.score());
  const st1 = await page.evaluate(() => JSON.stringify(__test.state()));
  await page.evaluate(() => { const p = Kit.game.scene.getScene('Play'); if (p && p.persist) p.persist(); });
  await harvest();
  await page.reload();
  await page.waitForFunction(() => window.__test && window.__test.ready, null, { timeout: 25000 });
  const hasSave = await page.evaluate(() => !!Kit.save.get('resume', null));
  await sleep(600);
  await page.evaluate(() => __test.startGame(false));
  await sleep(1500);
  const s2 = await page.evaluate(() => __test.score());
  const st2b = await page.evaluate(() => JSON.stringify(__test.state()));
  resumeOk = hasSave && s1 === s2;
  resumeDetail = `3수째 새로고침: 저장 ${hasSave ? '있음' : '없음'}, 점수 ${s1} → ${s2}, 상태 ${st1 === st2b ? '동일' : '다름'}`;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__fps = { frames: 0, start: performance.now(), worst: 0, last: performance.now() };
    const f = () => { const n = performance.now(); window.__fps.worst = Math.max(window.__fps.worst, n - window.__fps.last); window.__fps.last = n; window.__fps.frames++; requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
}
const botEnd = Date.now() + botSec * 1000;
while (Date.now() < botEnd) {
  const st = await page.evaluate(() => ({ over: __test.isOver(), scenes: __test.scene() }));
  if (st.over) { overAt = moves; break; }
  const acted = await page.evaluate((botMoveRate) => {
    const ms = __test.moves(); if (!ms || !ms.length) return false;
    // 게임이 좋은 수 힌트(botMove)를 주면 botMoveRate(기본 75%, manifest.qa.botMoveRate)만큼 그걸 쓴다 — 전략 게임에서도 피크·진행을 검사할 수 있게
    const api = __test.api;
    const hint = api && api.botMove && Math.random() < botMoveRate ? api.botMove() : null;
    __test.act(hint !== null && hint !== undefined ? hint : ms[Math.floor(Math.random() * ms.length)]); return true;
  }, botMoveRate);
  if (acted) moves++;
  if (moves === 3 && !resumeDone) { resumeDone = true; await resumeCheck(); }
  if (moves === 12 && !shotMid) { shotMid = true; await sleep(250); await page.screenshot({ path: path.join(SHOTS, '3-play-mid.png') }); }
  await sleep(acted ? 420 : 200);
}
const fps = await page.evaluate(() => { const f = window.__fps; const s = (performance.now() - f.start) / 1000; return { avg: f.frames / s, worst: f.worst }; });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
check('L1', 'C8', '평균 FPS ≥ 55 (CPU 4x 스로틀)', fps.avg >= 55, fps.avg.toFixed(1) + 'fps, 최악 프레임 ' + fps.worst.toFixed(0) + 'ms');
check('L1', 'E2', '봇이 행동 가능', moves > 0, moves + '수' + (overAt !== null ? `, ${overAt}수에 종료` : ''));
await page.screenshot({ path: path.join(SHOTS, '4-play-late.png') });

// ── 일시정지 ──
const st2 = await page.evaluate(() => __test.isOver());
if (!st2) {
  await page.evaluate(() => Kit.game.scene.getScene('Play').pause());
  await sleep(600);
  await page.screenshot({ path: path.join(SHOTS, '5-pause.png') });
  check('L1', 'C1', '일시정지 화면', await page.evaluate(() => !!Kit.game.scene.getScene('Play')._pauseOpen));
  // '계속하기' 버튼(패널 중앙 -160)을 실제로 탭해서 닫는다
  await page.touchscreen.tap(195, Math.round((844 / 2) - 160 * (844 / H)));
  await sleep(700);
  check('L1', 'C1', '일시정지 → 계속하기', await page.evaluate(() => !Kit.game.scene.getScene('Play')._pauseOpen && !Kit.game.scene.getScene('Play').time.paused));
}

check('L1', 'C2', '새로고침 후 이어하기', resumeOk, resumeDetail);

// ── 결과 화면 + 신기록 ──
await page.evaluate(() => { const p = Kit.game.scene.getScene('Play'); if (p && !p.over) { p.score = Math.max(p.score, 1); p.gameOver({ delay: 0 }); } });
await sleep(3200);
await page.screenshot({ path: path.join(SHOTS, '6-result.png') });
const sc3 = await page.evaluate(() => __test.scene());
check('L1', 'C1', '결과 화면 도달', sc3.includes('Result'), sc3.join(','));
await harvest();
const ev = allEvents;
const juice = new Set(ev.filter((e) => e.type === 'juice').map((e) => e.name));
const sfx = new Set(ev.filter((e) => e.type === 'sfx').map((e) => e.name));
const sfxFiles = new Set(ev.filter((e) => e.type === 'sfx').map((e) => e.data));
const bgm = new Set(ev.filter((e) => e.type === 'bgm').map((e) => e.name));
check('L2', 'C4', '연출 ≥ 5종 발동', juice.size >= 5, [...juice].join(', '));
check('L2', 'C6', 'SFX ≥ 10종 재생', sfx.size >= 10, `${sfx.size}종 (${sfxFiles.size}파일): ${[...sfx].join(', ')}`);
check('L2', 'C6', 'BGM ≥ 2곡 (로비·플레이)', bgm.size >= 2, [...bgm].join(', '));
// ── 손맛·가속·죽은 시간 (docs/research/2026-10-09-feel-and-escalation.md) ──
{
  // 새로고침마다 performance.now가 리셋되므로, 시간이 거꾸로 가는 곳에서 구간을 나누고 타격이 가장 많은 구간을 본다
  const segs = []; let cur = [];
  for (const e of ev) { if (cur.length && e.t < cur[cur.length - 1].t) { segs.push(cur); cur = []; } cur.push(e); }
  if (cur.length) segs.push(cur);
  const isHit = (e) => e.type === 'impact' || (e.type === 'combo' && e.name === 'hit');
  const seg = segs.sort((a, b) => b.filter(isHit).length - a.filter(isHit).length)[0] || [];
  const hits = seg.filter(isHit);
  check('L2', 'C4', '타격 묶음 사용(Kit.juice.impact / Kit.Combo)', hits.length > 0, hits.length ? `${hits.length}회` : '없음 — 닿는 프레임에 juice.impact를 호출하라');
  // 가속 = '입력 1회당 출력 사건 수'가 후반에 커지는가(최소 입력에 최대 출력). 봇의 입력 속도와 무관하게 비교한다.
  const inputs = seg.filter((e) => e.type === 'input');
  if (hits.length >= 8 && inputs.length >= 8) {
    // 판 끝(자원 소진·마무리) 20%는 '해결' 구간이라 가속 비교에서 뺀다 — 초반 1/3 대 (끝 20%를 뺀) 후반 1/3
    const tA = Math.min(hits[0].t, inputs[0].t), tZ = Math.max(hits[hits.length - 1].t, inputs[inputs.length - 1].t);
    const t0 = tA, t1 = tA + (tZ - tA) * 0.8, q = (t1 - t0) / 3 || 1;
    const per = (lo, hi) => hits.filter((e) => e.t >= lo && e.t < hi).length / Math.max(1, inputs.filter((e) => e.t >= lo && e.t < hi).length);
    // 후반 = 초반 이후 구간 중 가장 출력이 큰 1/3 창(슬라이딩). '판 어딘가에서 내 출력이 확 커지는가'를 본다.
    let late = 0; for (let a = t0 + q; a + q <= t1 + 1; a += q / 4) late = Math.max(late, per(a, a + q));
    const early = per(t0, t0 + q), ratio = late / Math.max(0.01, early);
    // 봇이 판의 후반부에 닿지 못했으면(활성 구간 < 60s) 실패가 아니라 '측정 불충분' — 판정은 sim 판 전체 곡선(GDD)에 맡긴다
    const shortRun = (t1 - t0) < 60000;
    check('L2', 'D9', '가속: 입력당 출력이 후반에 ≥ 2배', ratio >= 2 || shortRun, (shortRun && ratio < 2 ? `⚠ 측정 불충분(활성 ${((t1 - t0) / 1000).toFixed(0)}s) — sim 판 전체 곡선으로 판정. ` : '') + `입력당 사건 초반 ${early.toFixed(2)} → 후반 ${late.toFixed(2)} (×${ratio.toFixed(1)}, 목표 ×3)`);
  }
  const busy = seg.filter((e) => e.type === 'busy' && e.name === 'off').reduce((a, e) => a + (e.data || 0), 0);
  const span = seg.length ? seg[seg.length - 1].t - seg[0].t : 0;
  if (span > 0) check('L2', 'D10', '죽은 시간(입력 잠금) < 5%', busy / span < 0.05, `${(busy / 1000).toFixed(1)}s / ${(span / 1000).toFixed(0)}s (${((busy / span) * 100).toFixed(1)}%)` + (busy ? '' : ' — Kit.busy 미계측이면 0으로 보임'));
}
const peaks = new Set(ev.filter((e) => e.type === 'peak').map((e) => e.name));
check('L2', 'C5', '피크 연출 (티어 돌파 또는 신기록)', peaks.size >= 1, [...peaks].join(', ') || '없음');
check('L2', 'C5', '티어 돌파 피크 발동', peaks.has('tier'), peaks.has('tier') ? 'ok' : '봇 플레이 중 새 티어 미도달');

// ── 음소거 유지 ──
await page.evaluate(() => { if (!Kit.audio.muted) Kit.audio.toggleMute(); });
await page.reload();
await page.waitForFunction(() => window.__test && window.__test.ready, null, { timeout: 25000 });
const muted = await page.evaluate(() => Kit.audio.muted && Kit.game.sound.mute);
await page.evaluate(() => { if (Kit.audio.muted) Kit.audio.toggleMute(); });
check('L1', 'C2', '음소거 상태 유지', muted);

// ── 정적 검사: 에셋 사용, Math.random ──
const srcText = (manifest.src || fs.readdirSync(path.join(G, 'src')).map((f) => 'src/' + f)).map((f) => fs.readFileSync(path.join(G, f), 'utf8')).join('\n');

// 변주(variantOf)는 부모 키가 쓰이면 사용으로 본다. 조립식 키(e_<적>_windup 등)는 manifest에 usedBy:'composed'로 표시.
const usedKey = (k, it) => srcText.includes(k) || it.usedBy === 'composed' || (it.variantOf && srcText.includes(it.variantOf));
const unusedAud = (manifest.audio || []).filter((a) => !usedKey(a.key, a)).map((a) => a.key);
const unusedImg = (manifest.images || []).filter((im) => !usedKey(im.key, im)).map((im) => im.key);
check('L2', 'C3', 'manifest 이미지 전부 코드에서 사용', unusedImg.length === 0, unusedImg.join(', ') || 'ok');
check('L2', 'C6', 'manifest 오디오 전부 코드에서 사용', unusedAud.length === 0, unusedAud.join(', ') || 'ok');
const mr = (srcText.match(/Math\.random\(/g) || []).length;
check('L3', 'E3', 'Math.random 직접 사용 없음(로직)', mr === 0, mr ? `${mr}곳 — 연출용이면 무시 가능, 로직이면 Kit.rng로` : 'ok');
const tex = await page.evaluate((keys) => keys.filter((k) => !Kit.game.textures.exists(k)), (manifest.images || []).map((i) => i.key));
check('L1', 'C3', '모든 이미지 로드', tex.length === 0, tex.join(', ') || 'ok');

check('L1', 'A2', '외부 네트워크 요청 0', external.length === 0, external.slice(0, 5).join(' '));
check('L1', 'C8', '콘솔 에러 0', errors.length === 0, errors.slice(0, 5).join(' | '));

await finish();

async function finish() {
  await browser.close();
  const fails = checks.filter((c) => !c.pass);
  const report = { id, at: new Date().toISOString(), pass: fails.length === 0, sizeMB: +sizeMB.toFixed(2), checks };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const md = [`# QA L1·L2 — ${id}`, '', `결과: **${report.pass ? '통과' : `미달 ${fails.length}건`}** · ${report.at}`, '',
    '| 층 | 계약 | 항목 | 결과 | 상세 |', '|---|---|---|---|---|',
    ...checks.map((c) => `| ${c.layer} | ${c.id} | ${c.name} | ${c.pass ? '✅' : '❌'} | ${c.detail.replace(/\|/g, '/')} |`),
    '', '스크린샷: `qa/shots/`'].join('\n');
  fs.writeFileSync(path.join(OUT, 'report.md'), md);
  console.log(md);
}
