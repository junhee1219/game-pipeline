import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
await p.goto('file://' + process.cwd() + '/games/bonfire/dist/index.html');
await p.waitForFunction(() => window.__test && window.__test.ready, null, { timeout: 30000 });
await p.waitForTimeout(1200);
await p.evaluate(() => { Kit.save.del('resume'); __test.startGame(true); });
await p.waitForTimeout(1500);
const toScreen = (wx, wy) => p.evaluate(([wx, wy]) => { const sc = Kit.game.scene.getScene('Play'), cam = sc.cameras.main, r = Kit.game.canvas.getBoundingClientRect();
  return { x: r.left + (wx - cam.worldView.x) * cam.zoom * r.width / Kit.W, y: r.top + (wy - cam.worldView.y) * cam.zoom * r.height / Kit.H }; }, [wx, wy]);
// 첫 탭: 손가락 힌트가 가리키는 가장 가까운 적
const first = await p.evaluate(() => { const sc = Kit.game.scene.getScene('Play'); const h = sc.knight; let best=null,bd=1e9; for (const v of sc.views.values()) { const d=Math.hypot(v.cont.x-h.x,v.cont.y-h.y); if (d<bd){bd=d;best={x:v.cont.x,y:v.cont.y};} } return best; });
let taps = 0, t0 = Date.now(), last = 0, i = 0;
if (first) { const s = await toScreen(first.x, first.y); await p.touchscreen.tap(s.x, s.y); taps++; }
while (Date.now() - t0 < 200000) {
  if (await p.evaluate(() => __test.isOver())) break;
  // 안내가 가리키는 곳만 탭(같은 안내는 8초에 한 번), 아니면 아무것도 안 함
  const gd = await p.evaluate(() => { const sc = Kit.game.scene.getScene('Play'); return sc.guideAt ? { x: sc.guideAt.x, y: sc.guideAt.y, k: sc.guideKey } : null; });
  if (gd && Date.now() - last > 8000) { const s = await toScreen(gd.x, gd.y); if (s.x > 0 && s.x < 390 && s.y > 0 && s.y < 844) { await p.touchscreen.tap(s.x, s.y); taps++; last = Date.now(); } }
  if (i % 15 === 0) await p.screenshot({ path: `/tmp/bfplay/l${String(i).padStart(3,'0')}.png` });
  i++; await p.waitForTimeout(1000);
}
const secs = (Date.now() - t0) / 1000;
const fin = await p.evaluate(() => ({ over: __test.isOver(), score: __test.score(), tier: __test.tier(), t: __test.state().time, towers: __test.state().towers, smith: __test.state().smith }));
console.log(JSON.stringify({ ...fin, taps, secs, tapsPerMin: (taps / secs * 60).toFixed(1) }));
await p.screenshot({ path: '/tmp/bfplay/zz_end.png' });
await b.close();
