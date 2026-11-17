// game.js — the state machine and the loop: title → playing → upgrade → …
// → over / won. Collisions, scoring, combo and the burn live here; drawing
// lives in render.js, actors in entities.js.

import { VIEW, PLAYER, ORB, BLOOM, WAVES, COMBO, SCORE } from './config.js';
import { makeRng } from './random.js';
import {
  createPlayer, createOrb, createBloom, updatePlayer, tryDash, hurtPlayer,
  updateGloom, splitGloom, updateOrb, updateBloom,
} from './entities.js';
import {
  createWaveManager, startWave, updateWaves, waveCleared,
  rollUpgrades, applyUpgrade, upgradeName,
} from './waves.js';
import { createScenery, render } from './render.js';
import { createParticles } from './particles.js';
import { createAudio } from './audio.js';

export function createGame(canvas, input, opts = {}) {
  const ctx = canvas.getContext('2d');
  const seed = opts.seed ?? (Date.now() % 2147483647);
  const rng = makeRng(seed);
  const audio = createAudio();
  const particles = createParticles();
  const scenery = createScenery(makeRng(seed ^ 0x9e3779b9));

  const best = Number(window.localStorage?.getItem('lumen-best') || 0);

  const s = {
    canvas, ctx, input, rng, audio, particles, scenery,
    time: 0,
    phase: 'title', // title | playing | upgrade | paused | over | won
    player: createPlayer(VIEW.W / 2, VIEW.H / 2 + 60),
    glooms: [], orbs: [], shots: [], bloom: null,
    waves: createWaveManager(rng),
    score: 0, kills: 0, best,
    combo: 0, comboMult: 1, comboTimer: 0,
    orbT: 0, bloomT: BLOOM.everySec - 8,
    upgradeCards: [],
    banner: '', bannerSub: '', bannerT: 0, bannerColor: null,
    muted: false,
    endAt: 0,
    onPhase: opts.onPhase || null,
  };

  function setPhase(p) {
    s.phase = p;
    if (s.onPhase) s.onPhase(p);
  }

  function showBanner(text, sub, color) {
    s.banner = text; s.bannerSub = sub || ''; s.bannerColor = color || null; s.bannerT = 0;
  }

  function startGame() {
    s.player = createPlayer(VIEW.W / 2, VIEW.H / 2 + 60);
    s.glooms = []; s.orbs = []; s.shots = []; s.bloom = null;
    s.waves = createWaveManager(rng);
    s.score = 0; s.kills = 0;
    s.combo = 0; s.comboMult = 1; s.comboTimer = 0;
    s.orbT = 0.6; s.bloomT = BLOOM.everySec - 8;
    s.upgradeCards = [];
    particles.clear();
    startWave(s.waves, 1, rng);
    audio.startPad();
    audio.sfx.waveHorn();
    showBanner('WAVE 1', 'Para Gloom datang — jaga cahayamu!');
    setPhase('playing');
  }

  function beginUpgrade() {
    s.upgradeCards = rollUpgrades(rng, s.player);
    setPhase('upgrade');
    audio.sfx.waveClear();
  }

  function pickUpgrade(i) {
    const u = s.upgradeCards[i];
    if (!u) return;
    applyUpgrade(s.player, u.id);
    audio.sfx.upgrade();
    particles.burst(s.player.x, s.player.y, { count: 26, color: '#ffe9a3', speed: 200 });
    particles.floatText(s.player.x, s.player.y - 30, u.name + '!', '#ffd166', 20);
    const next = s.waves.wave + 1;
    if (next > WAVES.total) { winGame(); return; }
    startWave(s.waves, next, rng);
    audio.sfx.waveHorn();
    showBanner(`WAVE ${next}`, next === WAVES.total ? 'Wave terakhir — bertahanlah sampai fajar!' : 'Musuh makin banyak dan cepat…');
    setPhase('playing');
  }

  function endGame(won) {
    s.endAt = s.time;
    if (s.score > s.best) {
      s.best = s.score;
      try { window.localStorage?.setItem('lumen-best', String(s.best)); } catch { /* storage may be unavailable */ }
    }
    setPhase(won ? 'won' : 'over');
    if (won) audio.sfx.victory(); else audio.sfx.gameOver();
  }

  function winGame() {
    s.score += SCORE.waveClear;
    endGame(true);
  }

  function addScore(base, x, y) {
    const pts = base * s.comboMult;
    s.score += pts;
    particles.floatText(x, y, `+${pts}`, '#ffe9a3', 15);
  }

  function killGloom(g, idx) {
    s.kills += 1;
    s.combo += 1;
    s.comboTimer = COMBO.window;
    s.comboMult = Math.min(COMBO.maxMult, 1 + Math.floor(s.combo / 4));
    addScore(g.score, g.x, g.y);
    const col = g.kind === 'owl' ? '#ffb347' : '#b79cff';
    particles.burst(g.x, g.y, { count: g.kind === 'owl' ? 60 : 16, color: col, speed: 220 });
    particles.ring(g.x, g.y, col);
    particles.addShake(g.kind === 'owl' ? 10 : 2.5);
    audio.sfx.kill(s.comboMult);
    if (g.kind === 'splitter') {
      for (const w of splitGloom(g, rng)) s.glooms.push(w);
    }
    if (g.kind === 'owl') {
      s.score += SCORE.bossBonus;
      particles.floatText(g.x, g.y - 40, `BOSS KALAH! +${SCORE.bossBonus}`, '#ffb347', 24);
      // The owl drops a shower of dew.
      for (let i = 0; i < 5; i++) {
        s.orbs.push(createOrb(g.x + rng.range(-60, 60), g.y + rng.range(-40, 40), rng));
      }
    }
    s.glooms.splice(idx, 1);
  }

  // --- per-frame updates ---

  function updatePlaying(dt) {
    const p = s.player;

    // Dash on Space or mouse click.
    if (input.wasPressed(' ', 'Space') || input.wasClicked()) {
      if (tryDash(p, input)) {
        audio.sfx.dash();
        particles.burst(p.x, p.y, { count: 10, color: '#ffe9a3', speed: 120, dir: p.facing, spread: 1.2 });
      }
    }
    updatePlayer(p, input, dt, VIEW);

    // Waves & spawning.
    updateWaves(s.waves, s.glooms, dt, rng, () => {
      showBanner('🦉 THE HOLLOW OWL', 'Boss datang! Jaga jarak dan bakar dari tepi cahaya.', '#ffb347');
      audio.sfx.boss();
    });

    // Glooms: move, burn, touch.
    const glowR = PLAYER.glowMinRadius + (PLAYER.glowRadius + p.glowBonus - PLAYER.glowMinRadius) * (p.light / p.maxLight);
    let burning = false;
    for (let i = s.glooms.length - 1; i >= 0; i--) {
      const g = s.glooms[i];
      updateGloom(g, p, dt, rng, s.shots);
      const d = Math.hypot(g.x - p.x, g.y - p.y);
      // Lantern burn.
      if (p.light > 0.5 && d < glowR + g.radius * 0.6 && g.spawnT <= 0) {
        const dmg = PLAYER.burnDps * p.burnMul * dt;
        g.hp -= dmg;
        g.flash = 0.12;
        burning = true;
        p.light = Math.max(0, p.light - PLAYER.burnTickLight * dt);
        if (Math.random() < dt * 8) {
          particles.burst(g.x, g.y, { count: 1, color: '#ffd166', speed: 60, size: 2, life: 0.4 });
        }
        if (g.hp <= 0) { killGloom(g, i); continue; }
      }
      // Touch damage.
      if (d < g.radius + p.radius - 4 && g.spawnT <= 0) {
        if (hurtPlayer(p)) {
          audio.sfx.hurt();
          particles.burst(p.x, p.y, { count: 22, color: '#ff5d73', speed: 240 });
          particles.addShake(8);
          particles.floatText(p.x, p.y - 30, '-1 ♥', '#ff5d73', 20);
          // The gloom that hit is knocked back and takes a little burn.
          g.hp -= 12;
          g.x += ((g.x - p.x) / (d || 1)) * 26;
          g.y += ((g.y - p.y) / (d || 1)) * 26;
          if (g.hp <= 0) killGloom(g, i);
          if (p.dead) { endGame(false); return; }
        }
      }
    }
    if (burning && Math.random() < dt * 6) audio.sfx.burn();

    // Enemy shots.
    for (let i = s.shots.length - 1; i >= 0; i--) {
      const sh = s.shots[i];
      sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt;
      const d = Math.hypot(sh.x - p.x, sh.y - p.y);
      if (d < sh.radius + p.radius - 2) {
        if (hurtPlayer(p)) {
          audio.sfx.hurt();
          particles.burst(p.x, p.y, { count: 18, color: '#c77dff', speed: 200 });
          particles.addShake(6);
          s.shots.splice(i, 1);
          if (p.dead) { endGame(false); return; }
          continue;
        }
        s.shots.splice(i, 1); continue;
      }
      if (sh.life <= 0 || sh.x < -20 || sh.x > VIEW.W + 20 || sh.y < -20 || sh.y > VIEW.H + 20) s.shots.splice(i, 1);
    }

    // Dew orbs.
    s.orbT -= dt;
    if (s.orbT <= 0) {
      s.orbT = ORB.spawnInterval * rng.range(0.8, 1.3);
      if (s.orbs.length < ORB.maxOnField) {
        s.orbs.push(createOrb(rng.range(70, VIEW.W - 70), rng.range(90, VIEW.H - 90), rng));
      }
    }
    for (let i = s.orbs.length - 1; i >= 0; i--) {
      const o = s.orbs[i];
      updateOrb(o, p, dt);
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < ORB.collectRadius + p.radius * 0.5) {
        p.light = Math.min(p.maxLight, p.light + PLAYER.orbLight + p.orbBonus);
        s.score += 10 * s.comboMult;
        audio.sfx.pickup(s.combo);
        particles.burst(o.x, o.y, { count: 6, color: '#ffe9a3', speed: 90, size: 2.5, life: 0.4 });
        s.orbs.splice(i, 1);
      } else if (o.life <= 0) {
        s.orbs.splice(i, 1);
      }
    }

    // Bloom flower.
    s.bloomT -= dt;
    if (!s.bloom && s.bloomT <= 0) {
      s.bloom = createBloom(rng.range(120, VIEW.W - 120), rng.range(120, VIEW.H - 160));
      audio.sfx.bloom();
      showBanner('🌸 BUNGA MEKAR!', 'Raih bunganya sebelum layu: +400 & cahaya penuh.', '#ff9ecf');
    }
    if (s.bloom) {
      updateBloom(s.bloom, dt);
      const d = Math.hypot(s.bloom.x - p.x, s.bloom.y - p.y);
      if (d < BLOOM.radius + p.radius) {
        s.score += BLOOM.bonus * s.comboMult;
        p.light = Math.min(p.maxLight, p.light + BLOOM.healLight);
        p.hearts = Math.min(p.maxHearts, p.hearts + 1);
        audio.sfx.bloom();
        particles.burst(s.bloom.x, s.bloom.y, { count: 30, color: '#ff9ecf', speed: 200 });
        particles.floatText(s.bloom.x, s.bloom.y - 30, `BLOOM! +${BLOOM.bonus * s.comboMult}`, '#ff9ecf', 20);
        s.bloom = null;
        s.bloomT = BLOOM.everySec;
      } else if (s.bloom.life <= 0) {
        s.bloom = null;
        s.bloomT = BLOOM.everySec;
      }
    }

    // Combo decay.
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) { s.combo = 0; s.comboMult = 1; }
    }

    // Banner clock.
    if (s.bannerT < 2.3) s.bannerT += dt;

    // Wave cleared?
    if (waveCleared(s.waves, s.glooms)) {
      s.score += SCORE.waveClear;
      if (s.waves.wave >= WAVES.total) { winGame(); return; }
      beginUpgrade();
    }
  }

  function updateTitle(dt) {
    if (input.wasPressed('Enter', ' ', 'Space') || input.wasClicked()) {
      const m = input.mouse;
      // The click anywhere starts, so the title is one tap away.
      if (m.y > 420 || input.wasPressed('Enter', ' ', 'Space')) {
        audio.sfx.click();
        startGame();
      }
    }
  }

  function updateUpgrade(dt) {
    const m = input.mouse;
    const cw = 250, ch = 210, gap = 30;
    const x0 = 640 - (cw * 3 + gap * 2) / 2;
    if (input.wasPressed('1')) { pickUpgrade(0); return; }
    if (input.wasPressed('2')) { pickUpgrade(1); return; }
    if (input.wasPressed('3')) { pickUpgrade(2); return; }
    if (input.wasClicked()) {
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cw + gap);
        if (m.x >= x && m.x <= x + cw && m.y >= 210 && m.y <= 210 + ch) { pickUpgrade(i); return; }
      }
    }
  }

  function updateEnd(dt) {
    if (input.wasPressed('r', 'R', 'Enter', ' ', 'Space') || input.wasClicked()) {
      audio.sfx.click();
      startGame();
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - s.last) / 1000 || 0.016);
    s.last = now;
    s.time += dt;

    // Global keys.
    if (input.wasPressed('m', 'M')) { s.muted = audio.toggleMute(); }
    if (input.wasPressed('p', 'P', 'Escape')) {
      if (s.phase === 'playing') setPhase('paused');
      else if (s.phase === 'paused') setPhase('playing');
    }
    if (input.wasPressed('r', 'R') && (s.phase === 'playing' || s.phase === 'paused')) {
      startGame();
    }

    if (s.phase === 'title') updateTitle(dt);
    else if (s.phase === 'playing') updatePlaying(dt);
    else if (s.phase === 'upgrade') updateUpgrade(dt);
    else if (s.phase === 'paused') { /* frozen, but particles still shimmer */ }
    else if (s.phase === 'over' || s.phase === 'won') updateEnd(dt);

    particles.update(dt);
    render(ctx, s);
    input.endFrame();
  }

  let raf = 0;
  s.last = performance.now();
  function loop(now) { frame(now); raf = requestAnimationFrame(loop); }
  raf = requestAnimationFrame(loop);

  return {
    state: s,
    startGame,
    destroy() { cancelAnimationFrame(raf); input.destroy(); },
  };
}
