/* kit.js — 공통 런타임 (Phaser 3 위에 얹는 연출·화면·오디오·저장·계측·테스트 레이어)
 *
 * 게임은 Kit.boot({...})로 시작하고, 플레이 씬은 Kit.PlayScene을 상속한다.
 * 계약: docs/GAME_CONTRACT.md. 게임 코드는 코어 로직과 그 게임 고유 연출만 쓴다.
 */
(function () {
  'use strict';
  const Kit = (window.Kit = {});

  // ───────────────────────── 화면 크기 ─────────────────────────
  // 논리 해상도: 가로 1080 고정, 세로는 기기 비율을 따라감(1620~2340). 고해상도 기기에서도 선명하게.
  Kit.W = 1080;
  (function () {
    const iw = window.innerWidth || 390, ih = window.innerHeight || 844;
    Kit.H = Math.round(Math.min(2340, Math.max(1620, (Kit.W * ih) / iw)));
  })();
  Kit.CX = Kit.W / 2;
  Kit.CY = Kit.H / 2;

  // ───────────────────────── 계측 ─────────────────────────
  const events = (window.__kitEvents = []);
  Kit.emit = function (type, name, data) {
    events.push({ t: Math.round(performance.now()), type, name, data: data === undefined ? null : data });
    if (events.length > 20000) events.splice(0, 5000);
  };

  // ───────────────────────── 시드 RNG ─────────────────────────
  Kit.rng = (function () {
    let s = (Date.now() ^ 0x9e3779b9) >>> 0;
    const r = {
      seed(n) { s = n >>> 0; },
      next() { // mulberry32
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(a, b) { return a + Math.floor(r.next() * (b - a + 1)); },
      range(a, b) { return a + r.next() * (b - a); },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      chance(p) { return r.next() < p; },
      weighted(items, wkey) {
        const w = wkey || 'w';
        let tot = 0; for (const it of items) tot += it[w];
        let x = r.next() * tot;
        for (const it of items) { x -= it[w]; if (x <= 0) return it; }
        return items[items.length - 1];
      },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
        return arr;
      },
      state() { return s; },
    };
    return r;
  })();

  // ───────────────────────── 저장 ─────────────────────────
  // localStorage가 막힌 환경(sandbox iframe 등)에선 메모리로 폴백 — 세션 동안은 이어하기·기록 유지
  const mem = {};
  let ls = null;
  try { ls = window.localStorage; ls.setItem('__kit', '1'); ls.removeItem('__kit'); } catch (e) { ls = null; }
  Kit.save = {
    _p() { return (Kit.cfg && Kit.cfg.id ? Kit.cfg.id : 'game') + '_'; },
    get(k, def) {
      try {
        const v = ls ? ls.getItem(this._p() + k) : (this._p() + k in mem ? mem[this._p() + k] : null);
        return v === null || v === undefined ? def : JSON.parse(v);
      } catch (e) { return def; }
    },
    set(k, v) {
      const s = JSON.stringify(v);
      mem[this._p() + k] = s;
      try { if (ls) ls.setItem(this._p() + k, s); } catch (e) { /* 저장 실패는 플레이를 막지 않는다 */ }
    },
    del(k) { delete mem[this._p() + k]; try { if (ls) ls.removeItem(this._p() + k); } catch (e) {} },
  };
  Kit.best = {
    get() { return Kit.save.get('best', 0); },
    submit(score) { const b = Kit.best.get(); if (score > b) { Kit.save.set('best', score); return true; } return false; },
  };

  // ───────────────────────── 폰트 / 텍스트 ─────────────────────────
  Kit.FONT_DISPLAY = '"KitDisplay", "KitKR", "Apple SD Gothic Neo", sans-serif';
  Kit.FONT_KR = '"KitKR", "KitDisplay", "Apple SD Gothic Neo", sans-serif';
  const HANGUL = /[ㄱ-힝]/;

  // ───────────────────────── 오디오 ─────────────────────────
  Kit.audio = {
    game: null,
    muted: false,
    current: null, currentKey: null,
    _lastPlay: {},
    init(game) {
      this.game = game;
      this.muted = Kit.save.get('muted', false);
      game.sound.mute = this.muted;
    },
    has(key) { return !!(key && this.game && this.game.cache.audio.exists(key)); },
    sfx(key, opt) {
      opt = opt || {};
      const k = (Kit.cfg.sfx && Kit.cfg.sfx[key]) || key;
      const keyR = Array.isArray(k) ? k[Math.floor(Math.random() * k.length)] : k;
      if (!this.has(keyR)) return;
      const now = performance.now();
      if (this._lastPlay[keyR] && now - this._lastPlay[keyR] < (opt.minGap || 30)) return; // 동시 폭주 방지
      this._lastPlay[keyR] = now;
      const pv = opt.pitchVar === undefined ? 0.06 : opt.pitchVar;
      const rate = (opt.rate || 1) * (1 + (Math.random() * 2 - 1) * pv);
      try { this.game.sound.play(keyR, { volume: opt.volume === undefined ? 0.8 : opt.volume, rate }); } catch (e) {}
      Kit.emit('sfx', key, keyR);
    },
    // 볼륨 페이드: 사운드 객체를 직접 트윈하지 않고 카운터로(파괴된 사운드에 쓰는 크래시 방지)
    _fade(scene, snd, from, to, ms, done) {
      const ok = () => snd && snd.manager && !snd.pendingRemove;
      if (!scene) { if (ok()) snd.setVolume(to); if (done) done(); return null; }
      return scene.tweens.addCounter({
        from, to, duration: ms,
        onUpdate: (tw) => { if (ok()) { try { snd.setVolume(tw.getValue()); } catch (e) {} } },
        onComplete: () => { if (done) done(); },
      });
    },
    bgm(key, opt) {
      opt = opt || {};
      const k = (Kit.cfg.bgm && Kit.cfg.bgm[key]) || key;
      if (this.currentKey === k && this.current && this.current.isPlaying) return;
      const scene = this.game.scene.getScenes(true)[0];
      const old = this.current;
      if (this._fadeIn) { this._fadeIn.stop(); this._fadeIn = null; }
      if (old) {
        const v0 = old.volume;
        this._fade(scene, old, v0, 0, 500, () => { try { old.destroy(); } catch (e) {} });
      }
      this.current = null; this.currentKey = null;
      if (!this.has(k)) return;
      const vol = opt.volume === undefined ? 0.45 : opt.volume;
      const snd = this.game.sound.add(k, { loop: true, volume: 0 });
      snd.play();
      this._fadeIn = this._fade(scene, snd, 0, vol, 700);
      this.current = snd; this.currentKey = k;
      Kit.emit('bgm', key, k);
    },
    duck(on) { if (this.current) this.current.setVolume(on ? 0.15 : 0.45); },
    toggleMute() {
      this.muted = !this.muted;
      this.game.sound.mute = this.muted;
      Kit.save.set('muted', this.muted);
      Kit.emit('ui', 'mute', this.muted);
      return this.muted;
    },
  };

  // ───────────────────────── 절차 텍스처 (UI 크롬·파티클 전용) ─────────────────────────
  function canvasTex(scene, key, w, h, draw) {
    if (scene.textures.exists(key)) return key;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    scene.textures.addCanvas(key, c);
    return key;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function shade(hex, amt) { // amt -1..1
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  Kit.shade = shade;
  Kit.hex = (s) => parseInt(s.slice(1), 16);

  Kit.PALETTE = {
    green: '#3fc94a', orange: '#ff9a1f', blue: '#2fa6ff', pink: '#ff5ea8', purple: '#9b5cff', red: '#ff4d4d', yellow: '#ffd23a', gray: '#9aa3b2',
  };

  function makeParticleTextures(scene) {
    canvasTex(scene, 'kit_dot', 64, 64, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    canvasTex(scene, 'kit_star', 96, 96, (c, w) => {
      const m = w / 2;
      c.fillStyle = '#fff'; c.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, r = i % 2 === 0 ? m * 0.95 : m * 0.22;
        c.lineTo(m + Math.cos(a) * r, m + Math.sin(a) * r);
      }
      c.closePath(); c.fill();
      const g = c.createRadialGradient(m, m, 0, m, m, m * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    canvasTex(scene, 'kit_spark', 24, 96, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; rr(c, w * 0.3, 0, w * 0.4, h, w * 0.2); c.fill();
    });
    canvasTex(scene, 'kit_confetti', 28, 16, (c, w, h) => { c.fillStyle = '#fff'; rr(c, 0, 0, w, h, 4); c.fill(); });
    canvasTex(scene, 'kit_ring', 256, 256, (c, w) => {
      c.strokeStyle = '#fff'; c.lineWidth = 14; c.beginPath(); c.arc(w / 2, w / 2, w / 2 - 10, 0, Math.PI * 2); c.stroke();
    });
    canvasTex(scene, 'kit_halo', 256, 256, (c, w) => {
      const m = w / 2;
      c.lineWidth = 10; c.strokeStyle = 'rgba(40,20,60,0.55)'; c.beginPath(); c.arc(m, m, m - 8, 0, 7); c.stroke();
      c.lineWidth = 12; c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(m, m, m - 18, 0, 7); c.stroke();
      const g = c.createRadialGradient(m, m, m * 0.55, m, m, m - 22);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.45)');
      c.fillStyle = g; c.beginPath(); c.arc(m, m, m - 22, 0, 7); c.fill();
    });
    canvasTex(scene, 'kit_hint', 160, 160, (c, w) => {
      const m = w / 2;
      c.fillStyle = 'rgba(30,15,50,0.35)'; c.beginPath(); c.arc(m, m + 6, 52, 0, 7); c.fill();
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(m, m, 50, 0, 7); c.fill();
      c.lineWidth = 8; c.strokeStyle = '#3a2a5a'; c.beginPath(); c.arc(m, m, 50, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,210,58,0.9)'; c.beginPath(); c.arc(m, m, 26, 0, 7); c.fill();
    });
    canvasTex(scene, 'kit_glow', 256, 256, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    canvasTex(scene, 'kit_rays', 512, 512, (c, w) => {
      const m = w / 2;
      for (let i = 0; i < 16; i++) {
        const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 22;
        const g = c.createRadialGradient(m, m, 0, m, m, m);
        g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(m, m); c.arc(m, m, m, a0, a1); c.closePath(); c.fill();
      }
    });
    canvasTex(scene, 'kit_px', 4, 4, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 4); });
  }

  // 캔디 버튼 텍스처 (본체 그라디언트 + 하단 립 + 상단 광택 + 외곽선)
  function buttonTex(scene, color, w, h) {
    const key = `kit_btn_${color}_${w}x${h}`;
    return canvasTex(scene, key, w + 8, h + 22, (c) => {
      const base = Kit.PALETTE[color] || color;
      const r = Math.min(h / 2, 46);
      c.fillStyle = 'rgba(0,0,0,0.22)'; rr(c, 4, 18, w, h, r); c.fill(); // 그림자
      c.fillStyle = shade(base, -0.38); rr(c, 4, 12, w, h, r); c.fill(); // 립
      const g = c.createLinearGradient(0, 4, 0, h);
      g.addColorStop(0, shade(base, 0.28)); g.addColorStop(0.55, base); g.addColorStop(1, shade(base, -0.12));
      c.fillStyle = g; rr(c, 4, 4, w, h - 4, r); c.fill();
      c.lineWidth = 5; c.strokeStyle = shade(base, -0.45); rr(c, 4, 4, w, h + 6, r); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.38)'; rr(c, 4 + r * 0.55, 10, w - r * 1.1, h * 0.3, h * 0.15); c.fill(); // 광택
    });
  }
  function circleBtnTex(scene, color, d) {
    const key = `kit_cbtn_${color}_${d}`;
    return canvasTex(scene, key, d + 8, d + 20, (c) => {
      const base = Kit.PALETTE[color] || color, m = d / 2 + 4;
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.arc(m, m + 14, d / 2, 0, 7); c.fill();
      c.fillStyle = shade(base, -0.38); c.beginPath(); c.arc(m, m + 9, d / 2, 0, 7); c.fill();
      const g = c.createLinearGradient(0, 4, 0, d);
      g.addColorStop(0, shade(base, 0.3)); g.addColorStop(1, shade(base, -0.1));
      c.fillStyle = g; c.beginPath(); c.arc(m, m, d / 2 - 2, 0, 7); c.fill();
      c.lineWidth = 5; c.strokeStyle = shade(base, -0.45); c.beginPath(); c.arc(m, m + 3, d / 2 - 1, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(m, m - d * 0.22, d * 0.3, d * 0.14, 0, 0, 7); c.fill();
    });
  }
  function panelTex(scene, w, h, color, border) {
    const key = `kit_panel_${color}_${border}_${w}x${h}`;
    return canvasTex(scene, key, w + 16, h + 28, (c) => {
      const r = 56;
      c.fillStyle = 'rgba(0,0,0,0.28)'; rr(c, 8, 22, w, h, r); c.fill();
      c.fillStyle = border; rr(c, 8, 8, w, h, r); c.fill();
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, shade(color, 0.12)); g.addColorStop(1, shade(color, -0.06));
      c.fillStyle = g; rr(c, 22, 22, w - 28, h - 28, r - 12); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; rr(c, 40, 30, w - 64, 26, 13); c.fill();
    });
  }

  // 벡터 아이콘 (UI 크롬 전용)
  function drawIcon(g, kind, s, color) {
    g.fillStyle(color, 1); g.lineStyle(s * 0.13, color, 1);
    const h = s / 2;
    switch (kind) {
      case 'pause': g.fillRoundedRect(-h * 0.55, -h * 0.6, h * 0.38, h * 1.2, h * 0.1); g.fillRoundedRect(h * 0.17, -h * 0.6, h * 0.38, h * 1.2, h * 0.1); break;
      case 'play': g.fillTriangle(-h * 0.4, -h * 0.6, -h * 0.4, h * 0.6, h * 0.62, 0); break;
      case 'retry': g.beginPath(); g.arc(0, 0, h * 0.5, Math.PI * 0.15, Math.PI * 1.75, false); g.strokePath();
        g.fillTriangle(h * 0.28, -h * 0.75, h * 0.72, -h * 0.38, h * 0.18, -h * 0.18); break;
      case 'home': g.fillTriangle(-h * 0.7, -h * 0.02, h * 0.7, -h * 0.02, 0, -h * 0.72); g.fillRect(-h * 0.48, -h * 0.05, h * 0.96, h * 0.7); break;
      case 'sound': case 'mute':
        g.fillRect(-h * 0.62, -h * 0.22, h * 0.32, h * 0.44); g.fillTriangle(-h * 0.36, -h * 0.22, -h * 0.36, h * 0.22, h * 0.08, 0);
        g.fillTriangle(-h * 0.36, -h * 0.22, h * 0.08, -h * 0.62, h * 0.08, h * 0.62);
        if (kind === 'sound') { g.beginPath(); g.arc(h * 0.1, 0, h * 0.4, -0.9, 0.9); g.strokePath(); g.beginPath(); g.arc(h * 0.1, 0, h * 0.68, -0.8, 0.8); g.strokePath(); }
        else { g.lineBetween(h * 0.25, -h * 0.3, h * 0.75, h * 0.3); g.lineBetween(h * 0.75, -h * 0.3, h * 0.25, h * 0.3); }
        break;
      case 'close': g.lineStyle(s * 0.16, color, 1); g.lineBetween(-h * 0.45, -h * 0.45, h * 0.45, h * 0.45); g.lineBetween(h * 0.45, -h * 0.45, -h * 0.45, h * 0.45); break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? h * 0.38 : h * 0.85; pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r }); }
        g.fillPoints(pts, true); break;
      }
      case 'crown':
        g.fillPoints([{ x: -h * 0.75, y: h * 0.45 }, { x: -h * 0.75, y: -h * 0.4 }, { x: -h * 0.35, y: 0 }, { x: 0, y: -h * 0.6 }, { x: h * 0.35, y: 0 }, { x: h * 0.75, y: -h * 0.4 }, { x: h * 0.75, y: h * 0.45 }], true); break;
    }
  }

  // ───────────────────────── UI ─────────────────────────
  Kit.ui = {
    text(scene, x, y, str, o) {
      o = o || {};
      const kr = HANGUL.test(String(str));
      const t = scene.add.text(x, y, String(str), {
        fontFamily: o.font || (kr ? Kit.FONT_KR : Kit.FONT_DISPLAY),
        fontSize: (o.size || 64) + 'px',
        color: o.color || '#ffffff',
        stroke: o.stroke === undefined ? '#3a2a5a' : o.stroke,
        strokeThickness: o.strokeThickness === undefined ? Math.max(4, Math.round((o.size || 64) * 0.14)) : o.strokeThickness,
        align: o.align || 'center',
        wordWrap: o.wrap ? { width: o.wrap } : undefined,
        padding: { x: 8, y: 8 },
      }).setOrigin(o.ox === undefined ? 0.5 : o.ox, o.oy === undefined ? 0.5 : o.oy);
      if (o.shadow !== false) t.setShadow(0, Math.round((o.size || 64) * 0.08), 'rgba(0,0,0,0.35)', 0, true, true);
      if (o.gradient) {
        const g = t.context.createLinearGradient(0, 0, 0, t.height);
        g.addColorStop(0, o.gradient[0]); g.addColorStop(1, o.gradient[1]);
        t.setFill(g);
      }
      return t;
    },
    // 캔디 버튼. 반환: Container (setEnabled, label)
    button(scene, x, y, label, o) {
      o = o || {};
      const w = o.w || 520, h = o.h || 150, color = o.color || 'green';
      const c = scene.add.container(x, y);
      const img = scene.add.image(0, 0, buttonTex(scene, color, w, h)).setOrigin(0.5, (h / 2 + 4) / (h + 22));
      c.add(img);
      if (o.icon) {
        const g = scene.add.graphics(); drawIcon(g, o.icon, h * 0.5, 0xffffff);
        g.x = label ? -w / 2 + h * 0.55 : 0; g.y = -2; c.add(g);
      }
      if (label) {
        const t = Kit.ui.text(scene, o.icon ? h * 0.2 : 0, -4, label, { size: o.size || Math.round(h * 0.42), stroke: shade(Kit.PALETTE[color] || color, -0.55) });
        c.add(t); c.label = t;
      }
      c.setSize(w, h);
      c.setInteractive({ useHandCursor: true });
      Kit.ui._press(scene, c, o.onClick, o.sfx);
      return c;
    },
    iconButton(scene, x, y, icon, o) {
      o = o || {};
      const d = o.d || 132, color = o.color || 'blue';
      const c = scene.add.container(x, y);
      c.add(scene.add.image(0, 0, circleBtnTex(scene, color, d)).setOrigin(0.5, (d / 2 + 4) / (d + 20)));
      const g = scene.add.graphics(); drawIcon(g, icon, d * 0.52, 0xffffff); c.add(g); c.iconG = g;
      c.setIcon = (k) => { g.clear(); drawIcon(g, k, d * 0.52, 0xffffff); };
      c.setSize(d, d);
      c.setInteractive({ useHandCursor: true });
      Kit.ui._press(scene, c, o.onClick, o.sfx);
      return c;
    },
    _press(scene, c, onClick, sfx) {
      const base = { x: c.scaleX, y: c.scaleY };
      c.on('pointerdown', () => {
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: base.x * 0.9, scaleY: base.y * 0.86, duration: 70, ease: 'Quad.easeOut' });
        Kit.audio.sfx(sfx || 'ui_tap', { pitchVar: 0.03 });
      });
      const release = (fire) => {
        scene.tweens.killTweensOf(c);
        scene.tweens.add({ targets: c, scaleX: base.x, scaleY: base.y, duration: 260, ease: 'Back.easeOut', easeParams: [3] });
        if (fire && onClick) { Kit.emit('ui', 'click'); onClick(); }
      };
      c.on('pointerup', () => release(true));
      c.on('pointerout', () => release(false));
    },
    panel(scene, x, y, w, h, o) {
      o = o || {};
      return scene.add.image(x, y, panelTex(scene, w, h, o.color || '#fff6e8', o.border || '#ffb547'));
    },
    ribbon(scene, x, y, label, o) { // 패널 상단 리본 배너
      o = o || {};
      const w = o.w || 640, h = o.h || 130, color = o.color || '#ff5ea8';
      const key = canvasTex(scene, `kit_ribbon_${color}_${w}`, w + 160, h + 30, (c) => {
        const W = w + 160;
        c.fillStyle = shade(color, -0.4);
        c.beginPath(); c.moveTo(0, 30); c.lineTo(110, 30); c.lineTo(110, h + 20); c.lineTo(0, h + 20); c.lineTo(36, h * 0.5 + 25); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(W, 30); c.lineTo(W - 110, 30); c.lineTo(W - 110, h + 20); c.lineTo(W, h + 20); c.lineTo(W - 36, h * 0.5 + 25); c.closePath(); c.fill();
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, shade(color, 0.2)); g.addColorStop(1, shade(color, -0.1));
        c.fillStyle = g; rr(c, 70, 4, w + 20, h, 26); c.fill();
        c.lineWidth = 6; c.strokeStyle = shade(color, -0.45); rr(c, 70, 4, w + 20, h, 26); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.3)'; rr(c, 100, 14, w - 40, h * 0.25, 10); c.fill();
      });
      const cont = scene.add.container(x, y);
      cont.add(scene.add.image(0, 0, key));
      cont.add(Kit.ui.text(scene, 0, -10, label, { size: o.size || 72, stroke: shade(color, -0.55) }));
      return cont;
    },
    progressBar(scene, x, y, w, h, o) {
      o = o || {};
      const c = scene.add.container(x, y);
      const bg = scene.add.graphics();
      bg.fillStyle(0x000000, 0.28); bg.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
      bg.fillStyle(Kit.hex(o.track || '#3b2b5c'), 1); bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
      const fill = scene.add.graphics();
      c.add([bg, fill]);
      const col = Kit.hex(o.fill || '#ffd23a');
      c.value = 0;
      c.draw = (p) => {
        fill.clear();
        const fw = Math.max(h, (w - 12) * Phaser.Math.Clamp(p, 0, 1));
        if (p <= 0) return;
        fill.fillStyle(col, 1); fill.fillRoundedRect(-w / 2 + 6, -h / 2 + 6, fw, h - 12, (h - 12) / 2);
        fill.fillStyle(0xffffff, 0.35); fill.fillRoundedRect(-w / 2 + 14, -h / 2 + 10, Math.max(0, fw - 16), (h - 12) * 0.32, (h - 12) * 0.16);
      };
      c.set = (p, animate) => {
        if (!animate) { c.value = p; c.draw(p); return; }
        scene.tweens.addCounter({ from: c.value, to: p, duration: 380, ease: 'Cubic.easeOut', onUpdate: (tw) => { c.value = tw.getValue(); c.draw(c.value); } });
      };
      c.draw(0);
      return c;
    },
    // 배경: 이미지 키가 있으면 cover, 없으면 세로 그라디언트
    background(scene, keyOrColors) {
      if (typeof keyOrColors === 'string' && scene.textures.exists(keyOrColors)) {
        const img = scene.add.image(Kit.CX, Kit.CY, keyOrColors);
        const s = Math.max(Kit.W / img.width, Kit.H / img.height);
        return img.setScale(s);
      }
      const cols = Array.isArray(keyOrColors) ? keyOrColors : ['#7dd3ff', '#b28cff'];
      const key = canvasTex(scene, `kit_bg_${cols.join('_')}`, 8, 512, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        cols.forEach((col, i) => g.addColorStop(i / (cols.length - 1), col));
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      return scene.add.image(Kit.CX, Kit.CY, key).setDisplaySize(Kit.W, Kit.H);
    },
    // 탭/드래그 힌트 (첫 판 온보딩)
    // 튜토리얼 손: 탭이면 눌렀다 떼기 반복, toX/toY가 있으면 눌러서 끌고 가 떼기 반복(드래그·당기기).
    // o: { toX, toY, scale(손 크기, 기본 1), angle(손 각도), label(짧은 안내 문구), labelX, labelY, labelSize }
    fingerHint(scene, x, y, o) {
      o = o || {};
      const c = scene.add.container(0, 0).setDepth(9000);
      const ring = scene.add.image(x, y, 'kit_ring').setScale(0.3).setAlpha(0).setTint(0xffe27a);
      const ring2 = scene.add.image(x, y, 'kit_ring').setScale(0.3).setAlpha(0).setTint(0x3a2a5a);
      c.add([ring2, ring]);
      const hasHand = scene.textures.exists('kit_hand');
      const hs = 0.95 * (o.scale || 1);
      const dir = o.from === 'below' ? -1 : 1; // 'below': 손이 아래에서 올라와 손끝으로 누름(대상을 가리지 않음, GAME_CONTRACT B2a ⑤)
      const hand = hasHand
        ? scene.add.image(x, y, 'kit_hand').setOrigin(0.48, 0.97).setScale(hs).setAngle(o.angle === undefined ? (dir < 0 ? 168 : -12) : o.angle)
        : scene.add.image(x, y, 'kit_hint').setScale(0.9);
      c.add(hand);
      let trail = null;
      if (o.toX !== undefined) { trail = scene.add.graphics(); c.addAt(trail, 0); }
      let label = null;
      if (o.label) {
        const lx = o.labelX !== undefined ? o.labelX : (x + (o.toX === undefined ? x : o.toX)) / 2;
        const ly = o.labelY !== undefined ? o.labelY : Math.min(y, o.toY === undefined ? y : o.toY) - 230;
        label = Kit.ui.text(scene, lx, ly, o.label, { size: o.labelSize || 64, color: '#ffffff', stroke: '#3a2a5a', strokeThickness: o.labelStroke });
        c.add(label);
        scene.tweens.add({ targets: label, scale: 1.08, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      const press = (px, py) => {
        ring.setPosition(px, py).setScale(0.22).setAlpha(1); ring2.setPosition(px, py).setScale(0.24).setAlpha(0.6);
        scene.tweens.add({ targets: ring, scale: 0.95, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
        scene.tweens.add({ targets: ring2, scale: 1.0, alpha: 0, duration: 700, ease: 'Cubic.easeOut' });
      };
      const loop = () => {
        if (!c.active) return;
        hand.setPosition(x + 30 * dir, y - 60 * dir).setAlpha(0).setScale(hs * 1.08);
        if (trail) trail.clear();
        // 내려와서 누르기
        scene.tweens.add({ targets: hand, x, y, alpha: 1, duration: 260, ease: 'Quad.easeOut' });
        scene.tweens.add({ targets: hand, scaleX: hs * 0.92, scaleY: hs * 0.92, delay: 260, duration: 120, ease: 'Quad.easeOut',
          onStart: () => press(x, y) });
        if (o.toX === undefined) {
          // 탭: 손은 계속 보인 채로 살짝 떼었다가 다시 누름(사라지지 않음)
          scene.tweens.add({ targets: hand, scaleX: hs * 1.05, scaleY: hs * 1.05, x: x + 18 * dir, y: y - 36 * dir, delay: 560, duration: 260, ease: 'Quad.easeOut' });
          scene.time.delayedCall(1150, () => { if (c.active) { hand.setPosition(x + 18 * dir, y - 36 * dir); loopTap(); } });
        } else {
          const prog = { t: 0 };
          scene.tweens.add({ targets: prog, t: 1, delay: 420, duration: 820, ease: 'Sine.easeInOut',
            onUpdate: () => {
              const hx = x + (o.toX - x) * prog.t, hy = y + (o.toY - y) * prog.t;
              hand.setPosition(hx, hy);
              trail.clear(); trail.lineStyle(14, 0xffffff, 0.55); trail.lineBetween(x, y, hx, hy);
              trail.fillStyle(0xffffff, 0.75); trail.fillCircle(x, y, 16);
            } });
          scene.tweens.add({ targets: hand, scaleX: hs * 1.08, scaleY: hs * 1.08, alpha: 0, delay: 1400, duration: 300, ease: 'Quad.easeIn',
            onStart: () => press(o.toX, o.toY) });
          scene.time.delayedCall(2000, loop);
        }
      };
      const loopTap = () => {
        if (!c.active) return;
        scene.tweens.add({ targets: hand, x, y, scaleX: hs * 0.92, scaleY: hs * 0.92, duration: 200, ease: 'Quad.easeIn', onComplete: () => press(x, y) });
        scene.tweens.add({ targets: hand, scaleX: hs * 1.05, scaleY: hs * 1.05, x: x + 18 * dir, y: y - 36 * dir, delay: 520, duration: 260, ease: 'Quad.easeOut' });
        scene.time.delayedCall(1150, loopTap);
      };
      loop();
      Kit.emit('ui', 'fingerHint');
      c.dismiss = () => scene.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => c.destroy() });
      return c;
    },
  };

  // ───────────────────────── 연출 (juice) ─────────────────────────
  class Juice {
    constructor(scene) { this.s = scene; }
    _e(name) { Kit.emit('juice', name); }
    shake(intensity, ms) { this.s.cameras.main.shake(ms || 160, intensity === undefined ? 0.006 : intensity); this._e('shake'); }
    flash(ms, color, alpha) {
      const r = this.s.add.rectangle(Kit.CX, Kit.CY, Kit.W, Kit.H, color === undefined ? 0xffffff : color, alpha === undefined ? 0.55 : alpha).setDepth(9500).setScrollFactor(0);
      this.s.tweens.add({ targets: r, alpha: 0, duration: ms || 180, onComplete: () => r.destroy() });
      this._e('flash');
    }
    _base(t) { if (t.__bx === undefined) { t.__bx = t.scaleX; t.__by = t.scaleY; } return { x: t.__bx, y: t.__by }; }
    rebase(t) { t.__bx = t.scaleX; t.__by = t.scaleY; }
    pop(t, amt, ms) {
      const b = this._base(t); amt = amt || 1.18;
      this.s.tweens.killTweensOf(t);
      t.setScale(b.x, b.y);
      this.s.tweens.add({ targets: t, scaleX: b.x * amt, scaleY: b.y * amt, duration: (ms || 160) / 2, yoyo: true, ease: 'Quad.easeOut' });
      this._e('pop');
    }
    squash(t, amt, ms) { // 착지 찌그러짐 → 복원
      const b = this._base(t); amt = amt || 0.22;
      this.s.tweens.killTweensOf(t);
      t.setScale(b.x * (1 + amt), b.y * (1 - amt));
      this.s.tweens.add({ targets: t, scaleX: b.x, scaleY: b.y, duration: ms || 380, ease: 'Elastic.easeOut', easeParams: [1.1, 0.4] });
      this._e('squash');
    }
    stretch(t, amt, ms) {
      const b = this._base(t); amt = amt || 0.2;
      this.s.tweens.killTweensOf(t);
      t.setScale(b.x * (1 - amt), b.y * (1 + amt));
      this.s.tweens.add({ targets: t, scaleX: b.x, scaleY: b.y, duration: ms || 300, ease: 'Back.easeOut' });
      this._e('stretch');
    }
    bounceIn(t, delay, ms) {
      const b = this._base(t);
      t.setScale(0);
      this.s.tweens.add({ targets: t, scaleX: b.x, scaleY: b.y, delay: delay || 0, duration: ms || 420, ease: 'Back.easeOut', easeParams: [2.2] });
      this._e('bounceIn');
    }
    wobble(t, deg) {
      const a0 = t.angle;
      this.s.tweens.add({ targets: t, angle: { from: a0 - (deg || 8), to: a0 }, duration: 420, ease: 'Elastic.easeOut' });
      this._e('wobble');
    }
    floatText(x, y, str, o) {
      o = o || {};
      const t = Kit.ui.text(this.s, x, y, str, { size: o.size || 64, color: o.color || '#ffffff', stroke: o.stroke || '#5a2a00', gradient: o.gradient }).setDepth(8000);
      t.setScale(0.4);
      this.s.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
      this.s.tweens.add({ targets: t, y: y - (o.rise || 140), alpha: 0, delay: o.hold || 380, duration: 520, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
      this._e('floatText');
      return t;
    }
    burst(x, y, o) {
      o = o || {};
      const tints = o.tint === undefined ? [0xffffff] : [].concat(o.tint);
      const em = this.s.add.particles(x, y, o.texture || 'kit_dot', {
        speed: { min: (o.speed || 520) * 0.35, max: o.speed || 520 },
        angle: { min: 0, max: 360 },
        scale: { start: o.scale || 0.6, end: 0 },
        alpha: { start: 1, end: 0.2 },
        lifespan: { min: 300, max: o.life || 700 },
        gravityY: o.gravity === undefined ? 900 : o.gravity,
        rotate: o.texture === 'kit_confetti' || o.texture === 'kit_star' ? { min: 0, max: 360 } : 0,
        tint: tints,
        blendMode: o.add ? 'ADD' : 'NORMAL',
        emitting: false,
      }).setDepth(o.depth || 7000);
      em.explode(o.count || 18);
      this.s.time.delayedCall((o.life || 700) + 200, () => em.destroy());
      this._e('burst');
      return em;
    }
    sparkle(x, y, o) { o = o || {}; return this.burst(x, y, Object.assign({ texture: 'kit_star', count: 10, speed: 360, scale: 0.45, gravity: 0, add: true, tint: [0xffffff, 0xfff3a0] }, o)); }
    ring(x, y, o) {
      o = o || {};
      const r = this.s.add.image(x, y, 'kit_ring').setDepth(o.depth || 6900).setTint(o.color === undefined ? 0xffffff : o.color).setScale(o.from || 0.15).setAlpha(0.95);
      if (o.add !== false) r.setBlendMode('ADD');
      this.s.tweens.add({ targets: r, scale: o.to || 1.2, alpha: 0, duration: o.ms || 420, ease: 'Cubic.easeOut', onComplete: () => r.destroy() });
      this._e('ring');
    }
    glow(x, y, o) {
      o = o || {};
      const g = this.s.add.image(x, y, 'kit_glow').setDepth(o.depth || 6800).setTint(o.color === undefined ? 0xfff1a8 : o.color).setBlendMode('ADD').setScale(o.from || 0.4).setAlpha(0.9);
      this.s.tweens.add({ targets: g, scale: o.to || 2.2, alpha: 0, duration: o.ms || 500, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
      this._e('glow');
    }
    comboPop(x, y, n) {
      const cols = [['#ffffff', '#ffe27a'], ['#fff7a8', '#ffb021'], ['#ffd1f0', '#ff4fa3'], ['#d8c4ff', '#8a4dff'], ['#b8fff4', '#16c6b4']];
      const c = cols[Math.min(cols.length - 1, Math.floor((n - 2) / 2))];
      const size = Math.min(150, 84 + n * 8);
      const t = Kit.ui.text(this.s, x, y, 'x' + n, { size, gradient: c, stroke: '#3a1a4a' }).setDepth(8100).setAngle(-8);
      t.setScale(0.2);
      this.s.tweens.add({ targets: t, scale: 1.15, angle: 4, duration: 200, ease: 'Back.easeOut' });
      this.s.tweens.add({ targets: t, y: y - 120, alpha: 0, scale: 0.9, delay: 520, duration: 420, ease: 'Cubic.easeIn', onComplete: () => t.destroy() });
      if (n >= 4) this.shake(0.003 + Math.min(0.006, n * 0.0007), 140);
      this._e('comboPop');
    }
    // 타격 한 번의 '묶음'(docs/research/2026-10-09-feel-and-escalation.md §1–2).
    // 공격이 '닿는 프레임'에 호출한다. 대상 플래시+찌그러짐+넉백(시각 반동)+스파크+숫자+타격음을 한 번에,
    // 초당 타격 수가 많을수록 개별 강도는 줄이고(무쌍 문제), 전역 히트스톱·흔들림은 강한 사건(크리·처치·보스)에만.
    // o: { x, y, dirX, dirY, strength(1=평타), dmg, crit, kill, color, sfx, knock(px), noKnock }
    impact(t, o) {
      o = o || {};
      const s = this.s, now = performance.now();
      const R = s.__impactT || (s.__impactT = []);
      R.push(now); while (R.length && now - R[0] > 1000) R.shift();
      const rate = R.length, damp = Math.max(0.3, Math.min(1, 4 / rate));
      const str = (o.strength || 1) * (o.crit ? 1.6 : 1) * (o.kill ? 1.4 : 1);
      const x = o.x !== undefined ? o.x : (t ? t.x : 0), y = o.y !== undefined ? o.y : (t ? t.y : 0);
      if (t && t.active) {
        if (t.setTintFill) { t.setTintFill(0xffffff); s.time.delayedCall(55, () => { if (t.active) t.clearTint(); }); }
        if (t.setScale) this.squash(t, Math.min(0.28, 0.1 * str), 260);
        if (!o.noKnock && o.dirX !== undefined) {
          const len = Math.hypot(o.dirX, o.dirY || 0) || 1, d = (o.knock || 24) * Math.min(2.2, str);
          s.tweens.add({ targets: t, x: t.x + (o.dirX / len) * d, y: t.y + ((o.dirY || 0) / len) * d, duration: 70, yoyo: true, hold: 30, ease: 'Quad.easeOut' });
        }
      }
      // 공속뽕(초당 수십 타)에서도 프레임이 버티도록 씬·색상별 공유 이미터 하나에 파티클만 뿌린다
      const tints = o.color === undefined ? [0xffffff, 0xfff3a0] : [].concat(o.color);
      const ek = tints.join(','), EM = s.__impactEm || (s.__impactEm = {});
      if (!EM[ek] || !EM[ek].active) {
        EM[ek] = s.add.particles(0, 0, 'kit_spark', { speed: { min: 150, max: 420 }, angle: { min: 0, max: 360 }, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0.2 },
          lifespan: { min: 160, max: 260 }, gravityY: 0, rotate: 0, tint: tints, blendMode: 'ADD', emitting: false }).setDepth(7000);
      }
      EM[ek].emitParticleAt(x, y, Math.round((4 + 5 * str) * damp));
      if (o.dmg !== undefined) this.floatText(x + (Math.random() - 0.5) * 40, y - 50, Kit.fmt(o.dmg), { size: o.crit ? 96 : 58, color: o.crit ? '#ffe14a' : '#ffffff', stroke: o.crit ? '#7a2a00' : '#2a1a3a', rise: 110, hold: o.crit ? 360 : 200 });
      if (o.sfx) Kit.audio.sfx(o.sfx, { pitchVar: 0.14, minGap: 28, volume: Math.min(1, 0.55 + 0.25 * str * damp) });
      if (str >= 1.5 || (o.kill && rate <= 4)) this.hitStop(Math.min(90, Math.round(34 * str * damp)));
      if (str >= 1.4) this.shake(Math.min(0.012, 0.0028 * str * damp), 110);
      Kit.emit('impact', o.kill ? 'kill' : (o.crit ? 'crit' : 'hit'), rate);
      return rate;
    }
    hitStop(ms) { // 임팩트 순간 시간 정지
      const s = this.s;
      s.tweens.timeScale = 0.05; s.time.timeScale = 0.05;
      if (s.matter && s.matter.world) s.matter.world.engine.timing.timeScale = 0.05;
      const base = Kit._ts || 1;
      const restore = () => {
        s.tweens.timeScale = base; s.time.timeScale = base;
        if (s.matter && s.matter.world) s.matter.world.engine.timing.timeScale = base;
      };
      setTimeout(restore, ms || 60);
      setTimeout(restore, (ms || 60) + 400); // 첫 타이머가 늦거나 겹친 hitStop에 덮여도 복구 보장
      this._e('hitStop');
    }
    confetti(o) {
      o = o || {};
      const cols = [0xff5ea8, 0xffd23a, 0x3fc94a, 0x2fa6ff, 0x9b5cff, 0xff9a1f];
      for (const side of [-1, 1]) {
        const em = this.s.add.particles(side < 0 ? 0 : Kit.W, Kit.H * 0.55, 'kit_confetti', {
          speed: { min: 900, max: 1700 }, angle: side < 0 ? { min: -80, max: -40 } : { min: 220, max: 260 },
          gravityY: 1300, rotate: { min: 0, max: 360 }, scale: { min: 0.8, max: 1.6 }, lifespan: 2400,
          tint: cols, emitting: false,
        }).setDepth(9200).setScrollFactor(0);
        em.explode(o.count || 60);
        this.s.time.delayedCall(2600, () => em.destroy());
      }
      this._e('confetti');
    }
    rays(x, y, o) { // 뒤에서 도는 빛줄기 (피크 연출용)
      o = o || {};
      const r = this.s.add.image(x, y, 'kit_rays').setDepth(o.depth || 8400).setTint(o.color === undefined ? 0xfff2a8 : o.color).setBlendMode('ADD').setScale(0).setAlpha(0.85);
      this.s.tweens.add({ targets: r, scale: o.scale || 2.4, duration: 400, ease: 'Back.easeOut' });
      this.s.tweens.add({ targets: r, angle: 360, duration: 9000, repeat: -1 });
      if (o.life) this.s.tweens.add({ targets: r, alpha: 0, scale: (o.scale || 2.4) * 1.15, delay: o.life, duration: 400, onComplete: () => { this.s.tweens.killTweensOf(r); r.destroy(); } });
      this._e('rays');
      return r;
    }
    // 오브젝트(또는 텍스처)를 HUD 목표 지점으로 날림 — 수집 연출
    fly(fromX, fromY, toX, toY, texture, o) {
      o = o || {};
      const n = o.count || 5;
      for (let i = 0; i < n; i++) {
        const im = this.s.add.image(fromX + Phaser.Math.Between(-40, 40), fromY + Phaser.Math.Between(-40, 40), texture).setDepth(8500).setScale(o.scale || 0.3);
        const mid = { x: (fromX + toX) / 2 + Phaser.Math.Between(-260, 260), y: Math.min(fromY, toY) - Phaser.Math.Between(80, 300) };
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(im.x, im.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(toX, toY));
        const p = { t: 0 };
        this.s.tweens.add({
          targets: p, t: 1, delay: i * 55, duration: o.ms || 620, ease: 'Cubic.easeIn',
          onUpdate: () => { const v = curve.getPoint(p.t); im.setPosition(v.x, v.y); im.setScale((o.scale || 0.3) * (1 - p.t * 0.4)); },
          onComplete: () => { im.destroy(); if (o.onEach) o.onEach(i); },
        });
      }
      this._e('fly');
    }
    idle(t, o) { // 숨쉬기 애니메이션
      o = o || {};
      const b = this._base(t);
      this.s.tweens.add({ targets: t, scaleX: b.x * (1 + (o.amt || 0.04)), scaleY: b.y * (1 - (o.amt || 0.04)), duration: o.ms || 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: o.delay || 0 });
    }
    bob(t, o) {
      o = o || {};
      this.s.tweens.add({ targets: t, y: t.y - (o.amt || 18), duration: o.ms || 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: o.delay || 0 });
    }
  }
  Kit.Juice = Juice;

  // ───────────────────────── 테스트 인터페이스 ─────────────────────────
  Kit.test = (window.__test = {
    api: null,
    ready: false,
    register(api) { this.api = api; Kit.emit('test', 'register'); },
    scene() { const s = Kit.game && Kit.game.scene.getScenes(true).map((x) => x.scene.key); return s || []; },
    startGame(fresh) {
      const g = Kit.game; if (!g) return false;
      if (fresh) Kit.save.del('resume');
      g.scene.getScenes(true).forEach((s) => { if (s.scene.key !== 'Play') g.scene.stop(s.scene.key); });
      g.scene.start('Play');
      return true;
    },
    state() { return this.api && this.api.state(); },
    moves() { return this.api ? this.api.moves() : []; },
    act(m) { Kit.emit('input', 'bot'); return this.api && this.api.act(m); },
    isOver() { return this.api ? this.api.isOver() : false; },
    score() { return this.api ? this.api.score() : 0; },
    tier() { return this.api && this.api.tier ? this.api.tier() : 0; },
    events() { return events; },
  });

  // ───────────────────────── 표준 씬 ─────────────────────────
  // MP3 인코더 패딩(앞뒤 무음) 제거 → BGM 루프 이음새 공백 없앰
  function trimBgmPadding(scene) {
    const ctx = scene.sound.context;
    if (!ctx || !Kit.cfg.bgm) return;
    for (const key of new Set(Object.values(Kit.cfg.bgm))) {
      const buf = scene.cache.audio.get(key);
      if (!buf || !buf.getChannelData) continue;
      const ch0 = buf.getChannelData(0), n = buf.length, th = 0.0015;
      let a = 0, b = n - 1;
      while (a < n && Math.abs(ch0[a]) < th) a++;
      while (b > a && Math.abs(ch0[b]) < th) b--;
      const maxCut = buf.sampleRate * 0.25; // 음악 자체의 쉼은 건드리지 않게 최대 0.25초만
      a = Math.min(a, maxCut); b = Math.max(b, n - 1 - maxCut);
      if (a < 8 && n - 1 - b < 8) continue;
      const len = b - a + 1;
      const out = ctx.createBuffer(buf.numberOfChannels, len, buf.sampleRate);
      for (let c = 0; c < buf.numberOfChannels; c++) out.copyToChannel(buf.getChannelData(c).subarray(a, b + 1), c);
      scene.cache.audio.entries.set(key, out);
    }
  }

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
      const A = window.__ASSETS__ || { images: {}, audio: {} };
      const bar = this.add.graphics();
      const W = Kit.W, H = Kit.H;
      this.cameras.main.setBackgroundColor(Kit.cfg.loadingBg || '#2a1f4a');
      this.load.on('progress', (p) => {
        bar.clear(); bar.fillStyle(0xffffff, 0.2); bar.fillRoundedRect(W * 0.2, H * 0.5, W * 0.6, 36, 18);
        bar.fillStyle(0xffd23a, 1); bar.fillRoundedRect(W * 0.2 + 5, H * 0.5 + 5, Math.max(26, (W * 0.6 - 10) * p), 26, 13);
      });
      for (const [k, uri] of Object.entries(A.images || {})) this.load.image(k, uri);
      for (const [k, sh] of Object.entries(A.sheets || {})) this.load.spritesheet(k, sh.uri, { frameWidth: sh.fw, frameHeight: sh.fh, endFrame: sh.frames - 1 });
      this._sheets = A.sheets || {};
      this._audio = Object.entries(A.audio || {}).map(([key, data]) => ({ key, data }));
    }
    create() {
      makeParticleTextures(this);
      for (const [k, sh] of Object.entries(this._sheets || {})) {
        if (!this.anims.exists(k)) this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(k, { start: 0, end: sh.frames - 1 }), frameRate: sh.fps || 12, repeat: sh.loop === false ? 0 : -1 });
      }
      const go = () => {
        trimBgmPadding(this);
        Kit.audio.init(this.game);
        if (Kit.cfg.onBoot) Kit.cfg.onBoot(this);
        Kit.test.ready = true;
        Kit.emit('scene', 'ready');
        const resume = Kit.cfg.skipTitle ? 'Play' : 'Title';
        this.scene.start(resume);
      };
      const fontsReady = document.fonts ? Promise.all([
        document.fonts.load('64px "KitDisplay"'), document.fonts.load('64px "KitKR"'),
      ]).catch(() => {}) : Promise.resolve();
      const audioReady = new Promise((res) => {
        if (!this._audio.length) return res();
        let done = false;
        const fin = () => { if (!done) { done = true; res(); } };
        this.sound.once('decodedall', fin);
        this.time.delayedCall(6000, fin); // 디코딩 실패해도 게임은 뜬다
        try { this.sound.decodeAudio(this._audio); } catch (e) { fin(); }
      });
      Promise.all([fontsReady, audioReady]).then(go);
    }
  }

  class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
      const cfg = Kit.cfg, W = Kit.W, H = Kit.H;
      this.juice = new Juice(this);
      Kit.emit('scene', 'Title');
      Kit.ui.background(this, cfg.titleBg || cfg.bg);
      if (cfg.titleDecor) cfg.titleDecor(this);
      // 로고
      let logo;
      if (cfg.logo && this.textures.exists(cfg.logo)) {
        logo = this.add.image(Kit.CX, H * 0.24, cfg.logo);
        logo.setScale(Math.min((W * 0.86) / logo.width, (H * 0.22) / logo.height));
      } else {
        logo = Kit.ui.text(this, Kit.CX, H * 0.24, cfg.title, { size: 150, gradient: ['#fff7c2', '#ffb020'], stroke: '#4a2370', strokeThickness: 26, wrap: W * 0.9 });
      }
      this.juice.bounceIn(logo, 100, 600);
      this.time.delayedCall(800, () => this.juice.bob(logo, { amt: 14, ms: 1600 }));
      // 히어로
      if (cfg.hero && this.textures.exists(cfg.hero)) {
        const glow = this.add.image(Kit.CX, H * 0.52, 'kit_glow').setScale(4).setAlpha(0.5).setTint(0xfff3c0);
        this.tweens.add({ targets: glow, alpha: 0.25, duration: 1400, yoyo: true, repeat: -1 });
        const hero = this.add.image(Kit.CX, H * 0.52, cfg.hero);
        hero.setScale(Math.min((W * 0.62) / hero.width, (H * 0.3) / hero.height));
        this.juice.rebase(hero); this.juice.bounceIn(hero, 300, 600);
        this.time.delayedCall(950, () => this.juice.idle(hero, { amt: 0.035 }));
        hero.setInteractive();
        hero.on('pointerdown', () => { this.juice.squash(hero, 0.18); this.juice.sparkle(hero.x, hero.y - 60); Kit.audio.sfx('ui_tap', { pitchVar: 0.2 }); });
      }
      // 최고 기록
      const best = Kit.best.get();
      if (best > 0) {
        const bt = Kit.ui.text(this, Kit.CX, H * 0.705, (cfg.bestLabel || '최고 기록') + '  ' + Kit.fmt(best), { size: 58, color: '#fff3c4', stroke: '#4a2370' });
        this.juice.bounceIn(bt, 500);
      }
      // 버튼
      const hasResume = !!Kit.save.get('resume', null);
      const play = Kit.ui.button(this, Kit.CX, H * 0.8, hasResume ? (cfg.resumeLabel || '이어하기') : (cfg.playLabel || '플레이'), {
        w: 600, h: 180, color: 'green', icon: 'play', size: 80,
        onClick: () => this._go(),
      });
      this.juice.rebase(play); this.juice.bounceIn(play, 600);
      this.time.delayedCall(1200, () => this.tweens.add({ targets: play, scaleX: 1.06, scaleY: 1.06, duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      if (hasResume) {
        const nb = Kit.ui.text(this, Kit.CX, H * 0.8 + 150, cfg.newGameLabel || '새로 하기', { size: 48, color: '#ffffff', stroke: '#4a2370' });
        nb.setInteractive({ useHandCursor: true });
        nb.on('pointerup', () => { Kit.save.del('resume'); this._go(); });
      }
      const snd = Kit.ui.iconButton(this, W - 110, 120 + (Kit.safeTop || 0), Kit.audio.muted ? 'mute' : 'sound', {
        d: 120, color: 'purple', onClick: () => snd.setIcon(Kit.audio.toggleMute() ? 'mute' : 'sound'),
      });
      Kit.audio.bgm('lobby');
      // 아무 곳이나 첫 터치로 오디오 잠금 해제(브라우저 정책)
      this.input.once('pointerdown', () => { if (this.sound.context && this.sound.context.state === 'suspended') this.sound.context.resume(); });
    }
    _go() {
      if (this._leaving) return; this._leaving = true;
      Kit.audio.sfx('ui_open');
      this.cameras.main.fadeOut(220, 20, 10, 40);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play'));
    }
  }

  // 게임이 상속하는 플레이 씬 베이스
  class PlayScene extends Phaser.Scene {
    constructor() { super('Play'); }
    // 서브클래스: build() 에서 판을 만들고, 진행 시 this.addScore / this.reachTier / this.gameOver 호출
    create() {
      this.juice = new Juice(this);
      this.score = 0;
      this.over = false;
      this.paused = false;
      Kit.emit('scene', 'Play');
      this.input.on('pointerdown', () => Kit.emit('input', 'tap')); // 입력 대비 출력(가속) 계측용
      this.cameras.main.fadeIn(260, 20, 10, 40);
      Kit.audio.bgm('play');
      this.build(Kit.save.get('resume', null));
      this._pauseBtn = Kit.ui.iconButton(this, 100, 110 + (Kit.safeTop || 0), 'pause', { d: 116, color: 'purple', onClick: () => this.pause() });
      this._pauseBtn.setDepth(9000).setScrollFactor(0);
      this.game.events.on('hidden', this._onHidden, this);
      this.events.once('shutdown', () => this.game.events.off('hidden', this._onHidden, this));
    }
    build() {}
    _onHidden() { if (!this.over) this.persist(); }
    // 진행 저장 — 서브클래스가 serialize()를 구현하면 자동
    persist() {
      if (this.over || !this.serialize) return;
      Kit.save.set('resume', this.serialize());
    }
    addScore(n, x, y, o) {
      this.score += n;
      if (x !== undefined) this.juice.floatText(x, y, '+' + Kit.fmt(n), Object.assign({ size: 60, gradient: ['#ffffff', '#ffe066'] }, o || {}));
      if (this.onScore) this.onScore(this.score, n);
    }
    // 새 티어 첫 등장 축하(피크 연출). key = 텍스처, name = 티어 이름
    celebrateTier(key, name, o) {
      o = o || {};
      Kit.emit('peak', 'tier', name);
      const layer = Kit.pinLayer(this.add.container(0, 0).setDepth(9300));
      const dim = this.add.rectangle(Kit.CX, Kit.CY, Kit.W, Kit.H, 0x140a28, 0).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.55, duration: 200 });
      layer.add(dim);
      const y = Kit.H * 0.42;
      const rays = this.juice.rays(Kit.CX, y, { color: o.color || 0xfff2a8, scale: 2.6 }); rays.setDepth(9301); layer.add(rays);
      const img = this.add.image(Kit.CX, y, key).setDepth(9302);
      img.setScale(Math.min(460 / img.width, 460 / img.height));
      layer.add(img);
      this.juice.rebase(img); this.juice.bounceIn(img, 80, 520);
      const rib = Kit.ui.ribbon(this, Kit.CX, y + 330, o.title || 'NEW!', { color: o.ribbon || '#ff5ea8', size: 76 }).setDepth(9303);
      layer.add(rib); this.juice.rebase(rib); this.juice.bounceIn(rib, 220);
      const nm = Kit.ui.text(this, Kit.CX, y + 480, name, { size: 84, gradient: ['#fffbe0', '#ffc93a'], stroke: '#4a2370' }).setDepth(9303);
      layer.add(nm); this.juice.rebase(nm); this.juice.bounceIn(nm, 340);
      this.juice.sparkle(Kit.CX, y, { count: 26, speed: 700 });
      this.juice.ring(Kit.CX, y, { to: 2.6, color: 0xfff2a8 });
      this.juice.flash(160, 0xffffff, 0.5);
      Kit.audio.sfx('new_tier', { pitchVar: 0 });
      Kit.audio.duck(true);
      this.paused = true;
      let closed = false;
      const close = () => {
        if (closed) return; closed = true;
        Kit.audio.duck(false);
        this.tweens.add({ targets: layer, alpha: 0, duration: 220, onComplete: () => { layer.destroy(); this.paused = false; if (o.onClose) o.onClose(); } });
      };
      this.time.delayedCall(o.ms || 1500, () => dim.once('pointerdown', close));
      this.time.delayedCall(o.auto || 2600, close);
      // 게임 시계가 멈춰도(hitStop·백그라운드 탭·과부하) 실제 시간 기준으로 반드시 닫힌다
      const hard = setTimeout(() => { // 강제 닫기는 트윈 없이 즉시(트윈 시계가 느려져 있어도 닫히게)
        if (closed) { if (layer.active) { layer.destroy(); this.paused = false; } return; }
        closed = true; Kit.audio.duck(false); this.tweens.timeScale = 1; this.time.timeScale = 1;
        layer.destroy(); this.paused = false; if (o.onClose) o.onClose();
      }, (o.auto || 2600) + 1200);
      this.celebrating = true;
      layer.once('destroy', () => { clearTimeout(hard); this.celebrating = false; });
      this.events.once('shutdown', () => clearTimeout(hard));
      return layer;
    }
    pause() {
      if (this.over || this._pauseOpen) return;
      this._pauseOpen = true;
      this.persist();
      Kit.emit('ui', 'pause');
      const L = Kit.pinLayer(this.add.container(0, 0).setDepth(9600));
      const dim = this.add.rectangle(Kit.CX, Kit.CY, Kit.W, Kit.H, 0x140a28, 0.6).setInteractive();
      L.add(dim);
      const p = Kit.ui.panel(this, Kit.CX, Kit.CY, 820, 920); L.add(p);
      L.add(Kit.ui.ribbon(this, Kit.CX, Kit.CY - 440, Kit.cfg.pauseLabel || '일시정지', { color: '#9b5cff' }));
      const close = () => { this.tweens.add({ targets: L, alpha: 0, duration: 160, onComplete: () => { L.destroy(); this._pauseOpen = false; this.tweens.resumeAll(); this.time.paused = false; if (this.physics && this.physics.world) this.physics.world.resume(); if (this.matter && this.matter.world) this.matter.world.resume(); } }); };
      L.add(Kit.ui.button(this, Kit.CX, Kit.CY - 160, Kit.cfg.continueLabel || '계속하기', { w: 600, h: 160, color: 'green', icon: 'play', onClick: close }));
      L.add(Kit.ui.button(this, Kit.CX, Kit.CY + 30, Kit.cfg.restartLabel || '다시 시작', { w: 600, h: 150, color: 'orange', icon: 'retry', onClick: () => { Kit.save.del('resume'); this.scene.restart(); } }));
      L.add(Kit.ui.button(this, Kit.CX, Kit.CY + 210, Kit.cfg.homeLabel || '처음으로', { w: 600, h: 150, color: 'blue', icon: 'home', onClick: () => { this.persist(); this.scene.start('Title'); } }));
      const snd = Kit.ui.iconButton(this, Kit.CX, Kit.CY + 380, Kit.audio.muted ? 'mute' : 'sound', { d: 120, color: 'purple', onClick: () => snd.setIcon(Kit.audio.toggleMute() ? 'mute' : 'sound') });
      L.add(snd);
      L.setAlpha(0); this.tweens.add({ targets: L, alpha: 1, duration: 140 });
      p.setScale(0.7); this.tweens.add({ targets: p, scale: 1, duration: 300, ease: 'Back.easeOut' });
      // 판 진행만 멈춘다(UI 트윈은 위에서 이미 시작)
      this.time.delayedCall(320, () => { if (this._pauseOpen) { this.time.paused = true; if (this.physics && this.physics.world) this.physics.world.pause(); if (this.matter && this.matter.world) this.matter.world.pause(); } });
    }
    // 판 종료. info: { reason, nearMiss: {label, have, need}, stats: {...} }
    gameOver(info) {
      if (this.over) return;
      this.over = true;
      info = info || {};
      Kit.save.del('resume');
      const isBest = Kit.best.submit(this.score);
      Kit.emit('scene', 'gameOver', { score: this.score, isBest });
      Kit.audio.sfx('game_over', { pitchVar: 0 });
      this.time.delayedCall(info.delay === undefined ? 700 : info.delay, () => {
        this.scene.launch('Result', { score: this.score, isBest, info, from: this.scene.key });
        this.scene.pause();
      });
    }
  }

  class ResultScene extends Phaser.Scene {
    constructor() { super('Result'); }
    create(data) {
      const W = Kit.W, H = Kit.H, cfg = Kit.cfg;
      this.juice = new Juice(this);
      Kit.emit('scene', 'Result', { score: data.score, isBest: data.isBest });
      const dim = this.add.rectangle(Kit.CX, Kit.CY, W, H, 0x140a28, 0).setInteractive();
      this.tweens.add({ targets: dim, fillAlpha: 0.62, duration: 260 });
      const py = H * 0.47;
      const panel = Kit.ui.panel(this, Kit.CX, py, 860, 1040);
      panel.setScale(0.6); this.tweens.add({ targets: panel, scale: 1, duration: 380, ease: 'Back.easeOut' });
      const ribbon = Kit.ui.ribbon(this, Kit.CX, py - 500, data.isBest ? (cfg.newBestLabel || '신기록!') : (data.info.title || cfg.resultLabel || '결과'), { color: data.isBest ? '#ff5ea8' : '#2fa6ff', size: 80 });
      this.juice.rebase(ribbon); this.juice.bounceIn(ribbon, 200);
      if (data.isBest) {
        const r = this.juice.rays(Kit.CX, py - 210, { scale: 2.2 }); r.setDepth(-1); panel.setDepth(0);
        this.children.sendToBack(r); this.children.sendToBack(dim);
      }
      // 점수 카운트업
      Kit.ui.text(this, Kit.CX, py - 330, cfg.scoreLabel || '점수', { size: 54, color: '#8a5a2a', stroke: '#fff6e8', strokeThickness: 0, shadow: false });
      const st = Kit.ui.text(this, Kit.CX, py - 210, '0', { size: 170, gradient: ['#fff7c2', '#ffaa1a'], stroke: '#6a3500', strokeThickness: 22 });
      const cnt = { v: 0 };
      this.tweens.add({
        targets: cnt, v: data.score, duration: Math.min(1400, 400 + data.score * 2), delay: 350, ease: 'Cubic.easeOut',
        onUpdate: () => { st.setText(Kit.fmt(Math.round(cnt.v))); if (Math.random() < 0.35) Kit.audio.sfx('score_tick', { volume: 0.4, minGap: 45 }); },
        onComplete: () => {
          this.juice.pop(st, 1.25);
          if (data.isBest) {
            this.juice.confetti(); this.juice.flash(200); Kit.audio.sfx('new_record', { pitchVar: 0 });
            Kit.emit('peak', 'newRecord', data.score);
          }
        },
      });
      Kit.ui.text(this, Kit.CX, py - 70, (cfg.bestLabel || '최고 기록') + '  ' + Kit.fmt(Kit.best.get()), { size: 52, color: '#ffffff', stroke: '#8a5a2a' });
      // 아쉬움/다음 목표 (정직한 니어미스: 실제 수치만)
      const nm = data.info && data.info.nearMiss;
      if (nm) {
        const box = this.add.graphics();
        box.fillStyle(0x000000, 0.08); box.fillRoundedRect(Kit.CX - 360, py + 10, 720, 220, 40);
        if (nm.key && this.textures.exists(nm.key)) {
          const im = this.add.image(Kit.CX - 250, py + 120, nm.key);
          im.setScale(Math.min(170 / im.width, 170 / im.height));
          if (nm.silhouette) im.setTint(0x4a3a6a).setAlpha(0.85); // 형태가 보이는 어두운 틴트(평평한 채움은 덩어리로 보임)
          this.juice.rebase(im); this.time.delayedCall(900, () => this.juice.idle(im));
        }
        Kit.ui.text(this, Kit.CX + 70, py + 80, nm.label, { size: 50, color: '#5a3a1a', stroke: '#fff6e8', strokeThickness: 0, shadow: false });
        if (nm.need) {
          const bar = Kit.ui.progressBar(this, Kit.CX + 70, py + 160, 440, 56, { fill: '#ff9a1f', track: '#e8d6bd' });
          this.time.delayedCall(700, () => bar.set(Math.min(1, nm.have / nm.need), true));
        }
      }
      const retry = Kit.ui.button(this, Kit.CX, py + 360, cfg.retryLabel || '한 판 더', {
        w: 600, h: 170, color: 'green', icon: 'retry', size: 76,
        onClick: () => { Kit.audio.sfx('ui_open'); this.scene.stop(); this.scene.get(data.from).scene.restart(); },
      });
      this.juice.rebase(retry); this.juice.bounceIn(retry, 900);
      this.time.delayedCall(1500, () => this.tweens.add({ targets: retry, scaleX: 1.05, scaleY: 1.05, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      const home = Kit.ui.iconButton(this, Kit.CX, py + 640, 'home', { d: 120, color: 'blue', onClick: () => { this.scene.stop(data.from); this.scene.start('Title'); } });
      this.juice.rebase(home); this.juice.bounceIn(home, 1000);
      if (cfg.onResult) cfg.onResult(this, data, { panelY: py }); // 게임별 결과 화면 장식 훅(도감 등)
    }
  }

  // 영상에서 뽑은 루프 애니메이션 스프라이트. o: { height | width (표시 크기), rate, depth }
  Kit.anim = function (scene, key, x, y, o) {
    o = o || {};
    if (!scene.textures.exists(key)) return null;
    const sp = scene.add.sprite(x, y, key, 0);
    if (o.height) sp.setScale(o.height / sp.height); else if (o.width) sp.setScale(o.width / sp.width);
    if (o.depth !== undefined) sp.setDepth(o.depth);
    sp.play(key);
    if (o.rate) sp.anims.timeScale = o.rate;
    if (o.onComplete) sp.once('animationcomplete', () => o.onComplete(sp)); // 1회성(loop none) 시트용
    Kit.emit('juice', 'anim');
    return sp;
  };

  // 테스트·배속용 시간 배율. hitStop은 끝나면 이 기준값으로 복귀한다.
  // 콤보 사슬(§6): 성공마다 hit() → 단계가 오를수록 피치·배율·연출이 커지고, window(ms) 안에 다음 성공이 없으면 끊긴다.
  // 끊기기 직전 유예(grace)를 둬서 '아슬아슬하게 이어진' 경험을 만든다.
  Kit.Combo = class {
    constructor(scene, o) { o = o || {}; this.s = scene; this.n = 0; this.window = o.window || 1600; this.grace = o.grace || 400; this.onBreak = o.onBreak; this.t = 0; }
    hit() {
      const now = this.s.time.now;
      if (this.n && now - this.t > this.window + this.grace) this.n = 0;
      this.n++; this.t = now; Kit.emit('combo', 'hit', this.n);
      return this.n;
    }
    get pitch() { return Math.min(1.9, 1 + this.n * 0.06); } // sfx rate 배수로 쓰기
    update() { if (this.n && this.s.time.now - this.t > this.window + this.grace) { const n = this.n; this.n = 0; Kit.emit('combo', 'break', n); if (this.onBreak) this.onBreak(n); } }
  };
  // 입력이 막힌 구간 계측(§5 죽은 시간): 연출·낙하 등으로 입력을 못 받는 동안 Kit.busy(true) … Kit.busy(false).
  Kit.busy = function (on) {
    const now = performance.now();
    if (on && !Kit._busyT) { Kit._busyT = now; Kit.emit('busy', 'on'); }
    else if (!on && Kit._busyT) { Kit.emit('busy', 'off', Math.round(now - Kit._busyT)); Kit._busyT = 0; }
  };
  // 카메라가 스크롤되는 게임에서 고정 UI(오버레이) 터치가 어긋나지 않게: 자식까지 재귀로 scrollFactor 0.
  Kit.pinUI = function (o) {
    if (!o) return o;
    if (o.setScrollFactor) o.setScrollFactor(0);
    if (o.list) o.list.forEach(Kit.pinUI);
    return o;
  };
  // 이후 add되는 자식도 자동으로 고정되는 컨테이너
  Kit.pinLayer = function (c) {
    Kit.pinUI(c);
    const orig = c.add.bind(c);
    c.add = (x) => { (Array.isArray(x) ? x : [x]).forEach(Kit.pinUI); return orig(x); };
    return c;
  };
  Kit.timeScale = function (scene, k) {
    Kit._ts = k;
    scene.time.timeScale = k; scene.tweens.timeScale = k;
    if (scene.matter && scene.matter.world) scene.matter.world.engine.timing.timeScale = k;
    if (scene.anims) scene.anims.globalTimeScale = k;
  };

  // 캐릭터/몬스터 클립 묶음: { idle, attack, hit, death, ... } (각각 manifest sheets 키)
  // sp.playClip(name, onDone) → 1회 재생 후 idle 복귀(death 또는 시트 meta.hold='last'면 마지막 프레임 유지). 시트가 없으면 fallback 이미지 + 코드 모션.
  Kit.animSet = function (scene, x, y, clips, o) {
    o = o || {};
    const has = (k) => k && scene.textures.exists(k);
    const firstKey = has(clips.idle) ? clips.idle : Object.values(clips).find(has);
    const sp = firstKey ? scene.add.sprite(x, y, firstKey, 0) : scene.add.image(x, y, o.fallback);
    const fit = () => { if (o.height) sp.setScale(o.height / sp.frame.height); else if (o.width) sp.setScale(o.width / sp.frame.width); };
    fit();
    if (o.depth !== undefined) sp.setDepth(o.depth);
    const juice = new Juice(scene);
    if (sp.play && has(clips.idle)) sp.play(clips.idle);
    sp.clip = 'idle';
    sp.playClip = (name, onDone) => {
      const key = clips[name];
      Kit.emit('juice', 'anim:' + name);
      if (!sp.play || !has(key)) { // 시트 없음 → 코드 모션 대체
        juice.rebase(sp);
        if (name === 'attack') { juice.stretch(sp, 0.18); scene.tweens.add({ targets: sp, x: sp.x + (o.attackDx || 40), duration: 120, yoyo: true }); }
        else if (name === 'hit') { juice.squash(sp, 0.2); sp.setTint(0xff6666); scene.time.delayedCall(140, () => sp.clearTint()); }
        else if (name === 'death') { scene.tweens.add({ targets: sp, alpha: 0, scale: 0.2, angle: 30, duration: 380 }); }
        else juice.pop(sp);
        scene.time.delayedCall(name === 'death' ? 400 : 260, () => onDone && onDone(sp));
        return sp;
      }
      sp.clip = name;
      sp.play({ key, repeat: name === 'idle' ? -1 : 0 }); fit();
      const meta = ((window.__ASSETS__ && window.__ASSETS__.sheets && window.__ASSETS__.sheets[key]) || {}).meta || {};
      const hold = name === 'death' || meta.hold === 'last'; // meta.hold='last' → 마지막 프레임 유지(예고 클립 등)
      sp.once('animationcomplete', () => {
        if (hold) { if (onDone) onDone(sp); return; }
        if (name !== 'death' && has(clips.idle)) { sp.play({ key: clips.idle, repeat: -1 }); fit(); sp.clip = 'idle'; }
        else if (name !== 'death') { sp.setTexture(key, 0); fit(); sp.clip = 'idle'; } // idle 시트 없음 → 첫 프레임(대기 자세)으로 복귀
        if (onDone) onDone(sp);
      });
      return sp;
    };
    return sp;
  };

  Kit.PlayScene = PlayScene;
  Kit.fmt = (n) => Math.round(n).toLocaleString('en-US');

  // ───────────────────────── 부팅 ─────────────────────────
  // cfg: { id, title, bg, titleBg, logo, hero, play: PlaySceneClass, sfx:{ui_tap,ui_open,new_tier,new_record,game_over,score_tick,...}, bgm:{lobby,play}, physics }
  Kit.boot = function (cfg) {
    Kit.cfg = cfg;
    const scenes = [BootScene, TitleScene, cfg.play, ResultScene].concat(cfg.extraScenes || []);
    const conf = {
      type: Phaser.AUTO,
      parent: 'game',
      backgroundColor: cfg.loadingBg || '#2a1f4a',
      width: Kit.W,
      height: Kit.H,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
      input: { activePointers: 1 },
      audio: { disableWebAudio: false },
      fps: { target: 60 },
      scene: scenes,
    };
    if (cfg.physics) conf.physics = cfg.physics;
    Kit.game = new Phaser.Game(conf);
    window.addEventListener('pagehide', () => {
      const p = Kit.game.scene.getScene('Play');
      if (p && p.scene.isActive() && p.persist) p.persist();
    });
    return Kit.game;
  };
})();
