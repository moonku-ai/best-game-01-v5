// waves.js — wave composition, the spawn queue, the boss, and the upgrade
// draft the player picks between waves. Pure data + small state machine.

import { WAVES, UPGRADES, VIEW } from './config.js';
import { createGloom } from './entities.js';

export function createWaveManager(rng) {
  return {
    wave: 0,                 // 0 = not started, 1..10 while playing
    state: 'idle',           // idle | spawning | fighting | clearing | done
    queue: [],               // kinds waiting to spawn
    spawnT: 0,
    betweenT: 0,
    bossSpawned: false,
    bloomT: 18,              // first bloom flower arrives early
  };
}

export function spawnIntervalFor(wave) {
  const t = (wave - 1) / (WAVES.total - 1);
  return WAVES.spawnInterval + (WAVES.spawnMin - WAVES.spawnInterval) * t;
}

export function startWave(wm, wave, rng) {
  wm.wave = wave;
  wm.state = 'spawning';
  wm.spawnT = 0.5;
  wm.bossSpawned = false;
  const [d, da, s, sp] = WAVES.table[wave - 1];
  const q = [];
  for (let i = 0; i < d; i++) q.push('drifter');
  for (let i = 0; i < da; i++) q.push('dart');
  for (let i = 0; i < s; i++) q.push('splitter');
  for (let i = 0; i < sp; i++) q.push('spitter');
  // Shuffle so the wave never feels like a queue.
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [q[i], q[j]] = [q[j], q[i]];
  }
  wm.queue = q;
}

export function spawnPoint(rng) {
  // Spawn just off a random edge, never on top of the player.
  const edge = rng.int(0, 3);
  const m = 30;
  if (edge === 0) return { x: rng.range(m, VIEW.W - m), y: -m };
  if (edge === 1) return { x: rng.range(m, VIEW.W - m), y: VIEW.H + m };
  if (edge === 2) return { x: -m, y: rng.range(m, VIEW.H - m) };
  return { x: VIEW.W + m, y: rng.range(m, VIEW.H - m) };
}

export function updateWaves(wm, glooms, dt, rng, onBoss) {
  if (wm.state === 'spawning' || wm.state === 'fighting') {
    if (wm.queue.length > 0) {
      wm.spawnT -= dt;
      if (wm.spawnT <= 0) {
        wm.spawnT = spawnIntervalFor(wm.wave) * rng.range(0.8, 1.2);
        const kind = wm.queue.shift();
        const p = spawnPoint(rng);
        glooms.push(createGloom(kind, p.x, p.y, rng, wm.wave));
        if (wm.queue.length === 0) wm.state = 'fighting';
      }
    }
    // Boss arrives with the wave, a little after the first spawns.
    if (WAVES.bossWaves.includes(wm.wave) && !wm.bossSpawned && wm.state === 'fighting') {
      wm.bossSpawned = true;
      const p = spawnPoint(rng);
      glooms.push(createGloom('owl', p.x, p.y, rng, wm.wave));
      if (onBoss) onBoss();
    }
  }
}

export function waveCleared(wm, glooms) {
  return (wm.state === 'fighting' || wm.state === 'spawning') && wm.queue.length === 0 && glooms.length === 0;
}

// --- upgrades ---

export function rollUpgrades(rng, owned) {
  // Three distinct cards; 'heart' stops appearing at max hearts.
  const pool = UPGRADES.filter((u) => !(u.id === 'heart' && owned.hearts >= owned.maxHearts));
  const picks = [];
  const bag = [...pool];
  while (picks.length < 3 && bag.length > 0) {
    const i = Math.floor(rng.next() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}

export function applyUpgrade(player, id) {
  switch (id) {
    case 'lantern':
      player.maxLight += 30;
      player.light = player.maxLight;
      break;
    case 'flare':
      player.burnMul += 0.4;
      player.glowBonus += 18;
      break;
    case 'swift':
      player.speedMul += 0.18;
      player.dashCostMul = Math.max(0.4, player.dashCostMul - 0.25);
      break;
    case 'magnet':
      player.magnetMul *= 2;
      break;
    case 'heart':
      player.maxHearts = Math.min(5, player.maxHearts + 1);
      player.hearts = Math.min(player.maxHearts, player.hearts + 1);
      break;
    case 'thick':
      player.invulnBonus += 0.5;
      break;
    case 'greedy':
      player.orbBonus += 4;
      break;
    case 'frost':
      player.frost = true;
      break;
    default:
      break;
  }
}

export function upgradeName(id) {
  const u = UPGRADES.find((x) => x.id === id);
  return u ? u.name : id;
}
