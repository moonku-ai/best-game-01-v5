// entities.js — the actors: the player (Lumen), the Glooms, dew orbs, bloom
// flowers and enemy shots. Each factory returns a plain object; update
// functions live here, rendering lives in render.js.

import { PLAYER, ENEMY, ORB, BLOOM, VIEW } from './config.js';

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    radius: PLAYER.radius,
    hearts: PLAYER.maxHearts,
    maxHearts: PLAYER.maxHearts,
    light: PLAYER.maxLight,
    maxLight: PLAYER.maxLight,
    facing: 0,             // angle the firefly points at
    moving: false,
    dashTime: 0, dashCd: 0, dashDirX: 1, dashDirY: 0,
    invuln: 0,
    // upgrade-derived stats (base values, modified by upgrades)
    speedMul: 1,
    burnMul: 1,
    glowBonus: 0,
    magnetMul: 1,
    orbBonus: 0,
    dashCostMul: 1,
    frost: false,
    invulnBonus: 0,
    dead: false,
    bob: 0,                // wing-bob animation clock
  };
}

export function createGloom(kind, x, y, rng, wave) {
  const base = ENEMY[kind];
  const hpScale = 1 + (wave - 1) * 0.12;
  return {
    kind, x, y,
    vx: 0, vy: 0,
    hp: base.hp * hpScale,
    maxHp: base.hp * hpScale,
    speed: base.speed * (1 + (wave - 1) * 0.03) * rng.range(0.9, 1.1),
    radius: base.radius,
    score: base.score,
    touch: base.touch,
    // behaviour clocks
    state: 'chase',        // chase | telegraph | lunge | spit | swoop
    stateT: rng.range(0, 1),
    angle: rng.angle(),
    wobble: rng.range(0, Math.PI * 2),
    flash: 0,              // white flash when burned
    slowT: 0,              // frost slow timer
    spawnT: 0.35,         // fade-in so spawns never feel unfair
    shootCd: rng.range(1.2, 2.2),
  };
}

export function createOrb(x, y, rng) {
  return {
    x, y,
    radius: ORB.radius,
    life: ORB.life,
    maxLife: ORB.life,
    phase: rng.range(0, Math.PI * 2),
    vx: rng.range(-12, 12), vy: rng.range(-18, -4),
  };
}

export function createBloom(x, y) {
  return { x, y, radius: BLOOM.radius, life: BLOOM.windowSec, maxLife: BLOOM.windowSec, phase: 0 };
}

export function createShot(x, y, vx, vy) {
  return { x, y, vx, vy, radius: 6, life: 5 };
}

// --- player ---

export function updatePlayer(p, input, dt, bounds) {
  p.bob += dt * 10;
  if (p.invuln > 0) p.invuln -= dt;
  if (p.dashCd > 0) p.dashCd -= dt;

  const ax = input.axis();
  p.moving = ax.x !== 0 || ax.y !== 0;

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
  } else {
    const sp = PLAYER.speed * p.speedMul;
    p.vx += ax.x * PLAYER.accel * dt;
    p.vy += ax.y * PLAYER.accel * dt;
    const damp = Math.exp(-PLAYER.friction * dt);
    p.vx *= damp; p.vy *= damp;
    const v = Math.hypot(p.vx, p.vy);
    if (v > sp) { p.vx = (p.vx / v) * sp; p.vy = (p.vy / v) * sp; }
  }

  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.x = Math.max(p.radius + 6, Math.min(bounds.W - p.radius - 6, p.x));
  p.y = Math.max(p.radius + 6, Math.min(bounds.H - p.radius - 6, p.y));

  // Face movement, or the mouse when idle.
  if (Math.hypot(p.vx, p.vy) > 30) p.facing = Math.atan2(p.vy, p.vx);
  else p.facing = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);

  // Passive light trickle, so an empty lantern can always recover.
  if (p.light < p.maxLight) p.light = Math.min(p.maxLight, p.light + PLAYER.lightRegen * dt);
}

export function tryDash(p, input) {
  if (p.dashCd > 0 || p.dashTime > 0) return false;
  const cost = PLAYER.dashLightCost * p.dashCostMul;
  if (p.light < cost) return false;
  let dx = input.mouse.x - p.x;
  let dy = input.mouse.y - p.y;
  const d = Math.hypot(dx, dy);
  if (d < 8) { dx = Math.cos(p.facing); dy = Math.sin(p.facing); }
  else { dx /= d; dy /= d; }
  p.dashDirX = dx; p.dashDirY = dy;
  p.dashTime = PLAYER.dashTime;
  p.dashCd = PLAYER.dashCooldown;
  p.light -= cost;
  p.facing = Math.atan2(dy, dx);
  return true;
}

export function hurtPlayer(p) {
  if (p.invuln > 0 || p.dead) return false;
  p.hearts -= 1;
  p.light = Math.max(0, p.light - PLAYER.hitLightLoss);
  p.invuln = PLAYER.hurtInvuln + p.invulnBonus;
  if (p.hearts <= 0) p.dead = true;
  return true;
}

// --- glooms ---

export function updateGloom(g, player, dt, rng, shots) {
  if (g.spawnT > 0) g.spawnT -= dt;
  if (g.flash > 0) g.flash -= dt;
  if (g.slowT > 0) g.slowT -= dt;
  g.wobble += dt * 3;
  g.stateT -= dt;

  const dx = player.x - g.x;
  const dy = player.y - g.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist, ny = dy / dist;
  const slow = g.slowT > 0 ? 0.6 : 1;
  const frostSlow = player.frost && dist < 170 ? 0.75 : 1;
  const speed = g.speed * slow * frostSlow;

  let mx = 0, my = 0;
  switch (g.kind) {
    case 'drifter': {
      // Slow, weaving approach.
      const wob = Math.sin(g.wobble) * 0.5;
      mx = nx + -ny * wob * 0.4;
      my = ny + nx * wob * 0.4;
      break;
    }
    case 'dart': {
      // Telegraph, then lunge.
      if (g.state === 'chase') {
        mx = nx; my = ny;
        if (dist < 200 && g.stateT <= 0) { g.state = 'telegraph'; g.stateT = 0.45; }
      } else if (g.state === 'telegraph') {
        mx = nx * 0.15; my = ny * 0.15;
        if (g.stateT <= 0) { g.state = 'lunge'; g.stateT = 0.4; g.angle = Math.atan2(dy, dx); }
      } else {
        mx = Math.cos(g.angle) * 2.6; my = Math.sin(g.angle) * 2.6;
        if (g.stateT <= 0) { g.state = 'chase'; g.stateT = rng.range(1.2, 2.2); }
      }
      break;
    }
    case 'splitter': {
      mx = nx * 0.8; my = ny * 0.8;
      break;
    }
    case 'spitter': {
      // Keeps its distance and fires slow globs.
      if (dist < 240) { mx = -nx * 0.7; my = -ny * 0.7; }
      else if (dist > 340) { mx = nx * 0.7; my = ny * 0.7; }
      g.shootCd -= dt;
      if (g.shootCd <= 0 && dist < 460 && g.spawnT <= 0) {
        g.shootCd = rng.range(2.0, 2.8);
        const sv = 130;
        shots.push(createShot(g.x, g.y, nx * sv, ny * sv));
      }
      break;
    }
    case 'wisp': {
      mx = nx; my = ny;
      break;
    }
    case 'owl': {
      // Boss: slow chase, periodic swoop across the garden.
      if (g.state === 'chase') {
        mx = nx * 0.9; my = ny * 0.9;
        if (g.stateT <= 0) { g.state = 'swoop'; g.stateT = 0.85; g.angle = Math.atan2(dy, dx); }
      } else {
        mx = Math.cos(g.angle) * 2.4; my = Math.sin(g.angle) * 2.4;
        if (g.stateT <= 0) { g.state = 'chase'; g.stateT = rng.range(2.2, 3.4); }
      }
      break;
    }
    default: mx = nx; my = ny;
  }

  const m = Math.hypot(mx, my) || 1;
  g.vx = (mx / m) * speed;
  g.vy = (my / m) * speed;
  g.x += g.vx * dt;
  g.y += g.vy * dt;
  g.x = Math.max(g.radius, Math.min(VIEW.W - g.radius, g.x));
  g.y = Math.max(g.radius, Math.min(VIEW.H - g.radius, g.y));
}

// Split a splitter into two wisps on death; returns the children.
export function splitGloom(g, rng) {
  const kids = [];
  for (let i = 0; i < 2; i++) {
    const w = createGloom('wisp', g.x + rng.range(-14, 14), g.y + rng.range(-14, 14), rng, 1);
    w.hp = ENEMY.wisp.hp; w.maxHp = ENEMY.wisp.hp;
    kids.push(w);
  }
  return kids;
}

// --- orbs & bloom ---

export function updateOrb(o, player, dt) {
  o.life -= dt;
  o.phase += dt * 4;
  o.x += o.vx * dt; o.y += o.vy * dt;
  o.vx *= (1 - 2 * dt); o.vy *= (1 - 2 * dt);
  const dx = player.x - o.x, dy = player.y - o.y;
  const d = Math.hypot(dx, dy) || 1;
  const magnet = ORB.magnetRadius * player.magnetMul;
  if (d < magnet) {
    const pull = 420 * (1 - d / magnet);
    o.x += (dx / d) * pull * dt;
    o.y += (dy / d) * pull * dt;
  }
}

export function updateBloom(b, dt) {
  b.life -= dt;
  b.phase += dt * 2;
}
