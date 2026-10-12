// kit 검증용 샘플: 떠다니는 별을 탭해서 점수를 모은다. 10점마다 티어 상승, 30번 놓치면 끝.
// 손맛·가속 레퍼런스(docs/research/2026-10-09-feel-and-escalation.md): 닿는 순간 juice.impact, 콤보는 Kit.Combo,
// 티어가 오르면 '도우미 별똥'이 자동으로 별을 터뜨려 내 출력 속도가 빨라진다(어려워지는 게 아니라 강해지는 가속).
class Play extends Kit.PlayScene {
  build(resume) {
    Kit.ui.background(this, ['#5ac8ff', '#9b6bff']);
    this.tierIdx = 0; this.miss = 0; this.combo = new Kit.Combo(this, { window: 1400 });
    if (resume) { this.score = resume.score; this.tierIdx = resume.tier; this.miss = resume.miss; }
    this.hud = Kit.ui.text(this, Kit.CX, 120, String(this.score), { size: 110 });
    this.bar = Kit.ui.progressBar(this, Kit.CX, 250, 700, 60);
    this.spawn();
    this.helper = this.time.addEvent({ delay: 100, loop: true, callback: () => this.autoHit() }); this._autoT = 0;
    this.hint = Kit.ui.fingerHint(this, this.star.x, this.star.y, { label: '톡!' });
    Kit.test.register({
      state: () => ({ score: this.score, tier: this.tierIdx, miss: this.miss }),
      moves: () => this.over || this.paused ? [] : ['hit', 'miss'],
      act: (m) => m === 'hit' ? this.hit() : this.whiff(),
      isOver: () => this.over, score: () => this.score, tier: () => this.tierIdx,
    });
  }
  serialize() { return { score: this.score, tier: this.tierIdx, miss: this.miss }; }
  spawn() {
    this.star = this.add.image(Kit.rng.int(200, Kit.W - 200), Kit.rng.int(500, Kit.H - 500), 'kit_star').setScale(2).setTint(0xffe066);
    this.juice.rebase(this.star); this.juice.bounceIn(this.star);
    this.star.setInteractive(); this.star.on('pointerdown', () => this.hit());
  }
  hit(auto) {
    if (this.over || this.paused) return;
    if (this.hint) { this.hint.dismiss(); this.hint = null; }
    const n = this.combo.hit();
    const s = this.star;
    this.juice.impact(s, { kill: true, crit: n % 5 === 0, dmg: n, sfx: 'pop', color: [0xffe066, 0xffffff] });
    this.juice.ring(s.x, s.y); this.juice.pop(this.hud);
    if (n >= 2) this.juice.comboPop(s.x, s.y - 120, n);
    this.addScore(n, s.x, s.y - 40);
    this.hud.setText(Kit.fmt(this.score));
    s.destroy(); this.spawn();
    const t = Math.floor(this.score / 10);
    this.bar.set((this.score % 10) / 10, true);
    if (t > this.tierIdx) { this.tierIdx = t; this.celebrateTier('kit_star', '별 ' + t + '단계'); }
    this.persist();
  }
  autoHit() { // 티어마다 도우미가 더 자주 터뜨린다: 1단계 1.2s → 4단계 0.3s
    this.combo.update();
    if (this.over || this.paused || this.celebrating || this.tierIdx < 1) return;
    this._autoT += 100;
    if (this._autoT >= Math.max(300, 1200 / this.tierIdx)) { this._autoT = 0; this.hit(true); }
  }
  whiff() { if (this.over || this.paused) return; this.combo.n = 0; this.miss++; this.juice.shake(); Kit.audio.sfx('whiff'); if (this.miss >= 30) this.gameOver({ nearMiss: { label: '다음 단계까지', have: this.score % 10, need: 10 } }); }
}
Kit.boot({ id: 'sample', title: 'Kit Sample', bg: ['#5ac8ff', '#9b6bff'], play: Play,
  sfx: { ui_tap: 'sfx_tap', ui_open: 'sfx_open', pop: 'sfx_pop', new_tier: 'sfx_tier', new_record: 'sfx_record', game_over: 'sfx_over', score_tick: 'sfx_tick', whiff: 'sfx_whiff' },
  bgm: { lobby: 'bgm_lobby', play: 'bgm_play' } });
