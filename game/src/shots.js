// shots.js — deterministic states for the screenshots, driven by the query
// string: ?shot=start | play | boss | end, with an optional &seed=N.
// Each state is staged so the screenshot shows the game at its best: a full
// title, a busy mid-fight, the boss, and a finished game-over screen.

import { VIEW } from './config.js';
import { makeRng } from './random.js';
import { createGloom, createOrb, createBloom } from './entities.js';
import { startWave, rollUpgrades } from './waves.js';

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  const seed = Number(q.get('seed') || 7);
  return { shot, seed };
}

// Stage the game state for one screenshot. Called once, right after the
// game is created; the render loop then draws it.
export function stageShot(game, shot, seed) {
  const s = game.state;
  const rng = makeRng(seed * 7919 + 13);
  s.time = 12; // settle the garden so stars and fireflies are mid-twinkle

  if (shot === 'start') {
    s.phase = 'title';
    s.best = 0; // clean cover: no stale best-score line
    // A few orbs and a drifting gloom behind the title panel, for life.
    for (let i = 0; i < 5; i++) s.orbs.push(createOrb(rng.range(90, 1190), rng.range(120, 600), rng));
    s.glooms.push(createGloom('drifter', 180, 520, rng, 2));
    s.glooms.push(createGloom('dart', 1100, 180, rng, 2));
    return;
  }

  if (shot === 'play') {
    s.phase = 'playing';
    startWave(s.waves, 3, rng);
    // Pre-populate a lively mid-wave-3 fight.
    const spots = [
      ['drifter', 300, 220], ['drifter', 900, 300], ['dart', 700, 180],
      ['dart', 420, 430], ['splitter', 1000, 480], ['spitter', 220, 300],
      ['drifter', 820, 520], ['wisp', 620, 260],
    ];
    for (const [kind, x, y] of spots) {
      const g = createGloom(kind, x, y, rng, 3);
      g.spawnT = 0;
      s.glooms.push(g);
    }
    for (let i = 0; i < 8; i++) s.orbs.push(createOrb(rng.range(90, 1190), rng.range(120, 600), rng));
    s.player.x = 640; s.player.y = 380;
    s.player.light = 82;
    s.score = 12450;
    s.best = 12450;
    s.combo = 9; s.comboMult = 3; s.comboTimer = 2.4;
    s.kills = 31;
    s.banner = 'WAVE 3';
    s.bannerSub = 'Musuh makin banyak dan cepat…';
    s.bannerT = 1.0;
    // A couple of burn flashes so the lantern reads as active.
    s.glooms[0].flash = 0.1;
    s.glooms[2].flash = 0.1;
    return;
  }

  if (shot === 'boss') {
    s.phase = 'playing';
    startWave(s.waves, 5, rng);
    const owl = createGloom('owl', 920, 430, rng, 5); // clear of the boss banner
    owl.spawnT = 0;
    s.glooms.push(owl);
    const spots = [
      ['drifter', 300, 220], ['dart', 700, 180], ['splitter', 420, 430],
      ['wisp', 620, 300], ['spitter', 240, 480],
    ];
    for (const [kind, x, y] of spots) {
      const g = createGloom(kind, x, y, rng, 5);
      g.spawnT = 0;
      s.glooms.push(g);
    }
    for (let i = 0; i < 6; i++) s.orbs.push(createOrb(rng.range(90, 1190), rng.range(120, 600), rng));
    s.bloom = createBloom(340, 200);
    s.player.x = 600; s.player.y = 400;
    s.player.light = 64;
    s.score = 28750;
    s.best = 28750;
    s.combo = 14; s.comboMult = 4; s.comboTimer = 2.0;
    s.kills = 58;
    s.banner = '🦉 THE HOLLOW OWL';
    s.bannerSub = 'Boss datang! Jaga jarak dan bakar dari tepi cahaya.';
    s.bannerT = 1.0;
    return;
  }

  if (shot === 'end') {
    s.phase = 'over';
    s.score = 34280;
    s.best = 34280;
    s.kills = 74;
    s.waves.wave = 6;
    s.player.hearts = 0;
    s.player.dead = true;
    // The garden behind the panel, mid-fight, so the end screen has context.
    for (let i = 0; i < 4; i++) s.orbs.push(createOrb(rng.range(90, 1190), rng.range(120, 600), rng));
    const g1 = createGloom('drifter', 300, 220, rng, 6); g1.spawnT = 0; s.glooms.push(g1);
    const g2 = createGloom('dart', 980, 420, rng, 6); g2.spawnT = 0; s.glooms.push(g2);
    return;
  }

  if (shot === 'win') {
    s.phase = 'won';
    s.score = 51800;
    s.best = 51800;
    s.kills = 121;
    s.waves.wave = 10;
    s.player.light = 96;
    return;
  }
}
