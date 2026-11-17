// render.js — everything the player sees: the night garden, the actors, the
// HUD and every screen. Canvas 2D only, all art drawn procedurally so the
// game needs no image files at all.

import { PALETTE, VIEW, PLAYER, BLOOM, WAVES } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.42;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function createScenery(seedRng) {
  // Fixed decorations, generated once per game so the garden feels hand-placed.
  const stars = [];
  for (let i = 0; i < 130; i++) {
    stars.push({ x: seedRng.range(0, VIEW.W), y: seedRng.range(0, 330), r: seedRng.range(0.6, 1.9), tw: seedRng.range(0, Math.PI * 2) });
  }
  const fireflies = [];
  for (let i = 0; i < 16; i++) {
    fireflies.push({ x: seedRng.range(0, VIEW.W), y: seedRng.range(120, VIEW.H), r: seedRng.range(1.5, 2.6), ph: seedRng.range(0, Math.PI * 2), sp: seedRng.range(0.4, 1.1) });
  }
  const plants = [];
  const petalColors = [PALETTE.flowerPetal, PALETTE.flowerPetal2, PALETTE.flowerPetal3];
  for (let i = 0; i < 26; i++) {
    const edge = seedRng.chance(0.5);
    plants.push({
      x: edge ? seedRng.range(0, VIEW.W) : seedRng.pick([seedRng.range(10, 90), seedRng.range(VIEW.W - 90, VIEW.W - 10)]),
      y: edge ? seedRng.pick([seedRng.range(VIEW.H - 120, VIEW.H - 14), seedRng.range(14, 120)]) : seedRng.range(0, VIEW.H),
      h: seedRng.range(26, 62),
      sway: seedRng.range(0, Math.PI * 2),
      color: petalColors[i % 3],
      lit: seedRng.chance(0.55),
    });
  }
  const grassTufts = [];
  for (let i = 0; i < 90; i++) {
    grassTufts.push({ x: seedRng.range(0, VIEW.W), y: seedRng.range(VIEW.H - 170, VIEW.H - 6), h: seedRng.range(7, 18), lean: seedRng.range(-0.4, 0.4) });
  }
  return { stars, fireflies, plants, grassTufts };
}

function drawBackground(ctx, scenery, time) {
  // Sky gradient.
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.H);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.45, PALETTE.skyMid);
  sky.addColorStop(0.75, PALETTE.skyLow);
  sky.addColorStop(1, PALETTE.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);

  // Moon with a soft halo, clear of the HUD panels and the title panel.
  const mx = 1080, my = 200;
  const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 120);
  halo.addColorStop(0, 'rgba(255, 240, 200, 0.5)');
  halo.addColorStop(1, 'rgba(255, 240, 200, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - 130, my - 130, 260, 260);
  ctx.fillStyle = '#ffedbe';
  ctx.beginPath(); ctx.arc(mx, my, 42, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(214, 182, 120, 0.55)';
  ctx.beginPath(); ctx.arc(mx - 14, my - 8, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 12, my + 14, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 18, my - 16, 4, 0, Math.PI * 2); ctx.fill();

  // Twinkling stars.
  for (const s of scenery.stars) {
    const a = 0.35 + 0.6 * Math.abs(Math.sin(time * 0.9 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#dfe6ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Distant hills.
  ctx.fillStyle = PALETTE.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.quadraticCurveTo(220, 400, 480, 462);
  ctx.quadraticCurveTo(760, 516, 1020, 448);
  ctx.quadraticCurveTo(1180, 420, 1280, 452);
  ctx.lineTo(1280, 560); ctx.lineTo(0, 560);
  ctx.closePath(); ctx.fill();

  // Near hill + grass floor.
  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, 560);
  ctx.quadraticCurveTo(320, 520, 640, 556);
  ctx.quadraticCurveTo(960, 592, 1280, 548);
  ctx.lineTo(1280, 720); ctx.lineTo(0, 720);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 596, VIEW.W, 124);
  ctx.fillStyle = PALETTE.grassLight;
  ctx.fillRect(0, 596, VIEW.W, 5);

  // Grass tufts.
  ctx.strokeStyle = 'rgba(46, 140, 90, 0.75)';
  ctx.lineWidth = 1.6;
  for (const t of scenery.grassTufts) {
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.quadraticCurveTo(t.x + t.lean * 8, t.y - t.h * 0.6, t.x + t.lean * 12, t.y - t.h);
    ctx.stroke();
  }

  // Garden flowers along the edges.
  for (const p of scenery.plants) {
    const sway = Math.sin(time * 0.8 + p.sway) * 3;
    ctx.strokeStyle = PALETTE.flowerStem;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + sway * 0.5, p.y - p.h * 0.6, p.x + sway, p.y - p.h);
    ctx.stroke();
    const hx = p.x + sway, hy = p.y - p.h;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.lit ? 0.95 : 0.5;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, 5, 3.4, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(hx, hy, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Drifting ambient fireflies.
  for (const f of scenery.fireflies) {
    const fx = f.x + Math.sin(time * f.sp + f.ph) * 14;
    const fy = f.y + Math.cos(time * f.sp * 0.8 + f.ph) * 9;
    const a = 0.25 + 0.55 * Math.abs(Math.sin(time * 1.4 + f.ph));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffe9a3';
    ctx.beginPath(); ctx.arc(fx, fy, f.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrb(ctx, o) {
  const blink = 0.75 + 0.25 * Math.sin(o.phase);
  const g = ctx.createRadialGradient(o.x, o.y, 1, o.x, o.y, 22);
  g.addColorStop(0, 'rgba(255, 233, 163, 0.85)');
  g.addColorStop(1, 'rgba(255, 233, 163, 0)');
  ctx.globalAlpha = blink * Math.min(1, o.life / 2);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(o.x, o.y, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.orbCore;
  ctx.beginPath(); ctx.arc(o.x, o.y, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBloom(ctx, b) {
  const pulse = 1 + 0.12 * Math.sin(b.phase);
  const g = ctx.createRadialGradient(b.x, b.y, 4, b.x, b.y, 64);
  g.addColorStop(0, 'rgba(255, 158, 207, 0.55)');
  g.addColorStop(1, 'rgba(255, 158, 207, 0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(b.x, b.y, 64, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + b.phase * 0.2;
    ctx.fillStyle = PALETTE.flowerPetal;
    ctx.beginPath();
    ctx.ellipse(b.x + Math.cos(a) * 14 * pulse, b.y + Math.sin(a) * 14 * pulse, 10, 6, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('BLOOM — kumpulkan!', b.x, b.y - 34);
  ctx.fillStyle = 'rgba(255, 233, 163, 0.9)';
  ctx.fillRect(b.x - 22, b.y + 30, 44 * Math.max(0, b.life / b.maxLife), 4);
}

function drawPlayer(ctx, p, time) {
  const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  const lightFrac = p.light / p.maxLight;
  const glowR = (PLAYER.glowMinRadius + (PLAYER.glowRadius + p.glowBonus - PLAYER.glowMinRadius) * lightFrac);

  // Lantern glow.
  if (lightFrac > 0.02) {
    const g = ctx.createRadialGradient(p.x, p.y, 6, p.x, p.y, glowR);
    g.addColorStop(0, 'rgba(255, 209, 102, 0.34)');
    g.addColorStop(0.6, 'rgba(255, 209, 102, 0.13)');
    g.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.35;
  // Wings.
  const flap = Math.sin(p.bob) * 0.55;
  ctx.fillStyle = 'rgba(255, 243, 196, 0.85)';
  ctx.save(); ctx.rotate(p.facing + Math.PI / 2);
  ctx.beginPath(); ctx.ellipse(-11, -4 - flap * 4, 10, 5.5, -0.7 - flap * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(11, -4 - flap * 4, 10, 5.5, 0.7 + flap * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Body.
  const body = ctx.createRadialGradient(-4, -5, 1, 0, 0, 17);
  body.addColorStop(0, PALETTE.lumenCore);
  body.addColorStop(0.55, PALETTE.lumen);
  body.addColorStop(1, '#c98f1b');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(60, 35, 0, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Face: eyes toward facing.
  const ex = Math.cos(p.facing), ey = Math.sin(p.facing);
  ctx.fillStyle = '#241a05';
  ctx.beginPath(); ctx.arc(ex * 6 - ey * 5, ey * 6 + ex * 5, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex * 6 + ey * 5, ey * 6 - ex * 5, 2.6, 0, Math.PI * 2); ctx.fill();
  // Antennae.
  ctx.strokeStyle = '#7a5b12';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(ex * 10, ey * 10); ctx.quadraticCurveTo(ex * 20 - ey * 6, ey * 20 + ex * 6, ex * 24 - ey * 8, ey * 24 + ex * 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex * 10, ey * 10); ctx.quadraticCurveTo(ex * 20 + ey * 6, ey * 20 - ex * 6, ex * 24 + ey * 8, ey * 24 - ex * 8); ctx.stroke();
  ctx.restore();

  // Dash cooldown pip under the player.
  if (p.dashCd > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(p.x, p.y + 26, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 26);
    ctx.arc(p.x, p.y + 26, 9, -Math.PI / 2, -Math.PI / 2 + (1 - p.dashCd / 0.55) * Math.PI * 2);
    ctx.closePath(); ctx.fill();
  }
}

function drawGloom(ctx, g, time) {
  const a = g.spawnT > 0 ? 1 - g.spawnT / 0.35 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.translate(g.x, g.y);
  const telegraph = g.state === 'telegraph';
  const wob = Math.sin(g.wobble) * 2;

  if (g.kind === 'owl') {
    // The Hollow Owl: big shadow body, horn tufts, glowing eyes.
    ctx.fillStyle = PALETTE.owl;
    ctx.beginPath(); ctx.ellipse(0, 0, 46, 40, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-34, -26); ctx.lineTo(-44, -48); ctx.lineTo(-20, -34); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(34, -26); ctx.lineTo(44, -48); ctx.lineTo(20, -34); ctx.closePath(); ctx.fill();
    // Wing sweep.
    const flap = Math.sin(time * 5) * 10;
    ctx.fillStyle = '#1a1238';
    ctx.beginPath(); ctx.ellipse(-44, 6 + flap, 22, 10, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(44, 6 - flap, 22, 10, 0.5, 0, Math.PI * 2); ctx.fill();
    // Belly + face disc.
    ctx.fillStyle = '#31245e';
    ctx.beginPath(); ctx.ellipse(0, 12, 28, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8c9ff';
    ctx.beginPath(); ctx.arc(-13, -8, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -8, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.owlEye;
    ctx.beginPath(); ctx.arc(-13, -8, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -8, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241a05';
    ctx.beginPath(); ctx.arc(-13, -8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(13, -8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.beginPath(); ctx.moveTo(-5, 2); ctx.lineTo(5, 2); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill();
    ctx.restore();
    drawHpBar(ctx, g);
    return;
  }

  // Body: smoky wisp.
  const colors = { drifter: PALETTE.gloom, dart: PALETTE.dart, splitter: PALETTE.splitter, spitter: PALETTE.spitter, wisp: PALETTE.gloom };
  ctx.fillStyle = colors[g.kind] || PALETTE.gloom;
  ctx.beginPath();
  ctx.ellipse(0, wob * 0.4, g.radius, g.radius * 0.92, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wavy tail.
  ctx.beginPath();
  ctx.moveTo(-g.radius * 0.7, 4);
  ctx.quadraticCurveTo(0, g.radius * 1.5 + Math.sin(time * 6 + g.wobble) * 4, g.radius * 0.7, 4);
  ctx.quadraticCurveTo(g.radius * 0.3, g.radius * 0.7, 0, g.radius * 0.9);
  ctx.quadraticCurveTo(-g.radius * 0.3, g.radius * 0.7, -g.radius * 0.7, 4);
  ctx.fill();
  // Outline when burning.
  if (g.flash > 0) {
    ctx.strokeStyle = `rgba(255, 240, 190, ${Math.min(1, g.flash * 4)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, g.radius + 1, 0, Math.PI * 2); ctx.stroke();
  }
  if (telegraph) {
    ctx.strokeStyle = 'rgba(255, 93, 115, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, g.radius + 5 + Math.sin(time * 18) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  // Eyes.
  const eyeY = -3;
  const look = g.state === 'lunge' ? 2 : 0;
  ctx.fillStyle = PALETTE.gloomEye;
  ctx.beginPath(); ctx.arc(-6 + look, eyeY, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6 + look, eyeY, 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a0b2e';
  ctx.beginPath(); ctx.arc(-6 + look, eyeY, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6 + look, eyeY, 1.4, 0, Math.PI * 2); ctx.fill();
  // Kind markers so each type reads at a glance.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  if (g.kind === 'splitter') {
    ctx.beginPath(); ctx.arc(-8, 9, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 9, 2.4, 0, Math.PI * 2); ctx.fill();
  } else if (g.kind === 'spitter') {
    ctx.beginPath(); ctx.arc(0, 10, 3, 0, Math.PI * 2); ctx.fill();
  } else if (g.kind === 'dart') {
    ctx.beginPath(); ctx.moveTo(0, -g.radius - 4); ctx.lineTo(-4, -g.radius + 3); ctx.lineTo(4, -g.radius + 3); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  drawHpBar(ctx, g);
}

function drawHpBar(ctx, g) {
  if (g.hp >= g.maxHp || g.kind === 'wisp') return;
  const w = g.kind === 'owl' ? 90 : 34;
  const y = g.y - g.radius - 12;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(g.x - w / 2, y, w, 5);
  ctx.fillStyle = PALETTE.danger;
  ctx.fillRect(g.x - w / 2, y, w * Math.max(0, g.hp / g.maxHp), 5);
}

function drawShot(ctx, s) {
  ctx.fillStyle = '#c77dff';
  ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9c6ff';
  ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
}

// --- HUD ---

function drawHud(ctx, s) {
  const p = s.player;
  ctx.save();
  // Top-left panel: score, wave, combo.
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 14, 12, 268, 92, 10); ctx.fill(); ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'left';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.fillText(`Skor ${s.score.toLocaleString('id-ID')}`, 28, 44);
  ctx.font = '15px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Wave ${Math.max(1, s.waves.wave)} / ${WAVES.total}   •   Terbaik ${s.best.toLocaleString('id-ID')}`, 28, 68);
  if (s.comboMult > 1) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 18px Georgia, serif';
    ctx.fillText(`COMBO x${s.comboMult}  (${s.comboTimer.toFixed(1)} dtk)`, 28, 92);
  }

  // Top-right panel: hearts + light.
  ctx.fillStyle = PALETTE.hudPanel;
  roundRect(ctx, VIEW.W - 282, 12, 268, 92, 10); ctx.fill(); ctx.stroke();
  ctx.font = '22px Georgia, serif';
  ctx.textAlign = 'left';
  let hx = VIEW.W - 268;
  for (let i = 0; i < p.maxHearts; i++) {
    ctx.fillStyle = i < p.hearts ? PALETTE.danger : 'rgba(255,255,255,0.18)';
    ctx.fillText('♥', hx, 44);
    hx += 26;
  }
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.fillText('CAHAYA LENTERA', VIEW.W - 268, 66);
  const lw = 240;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, VIEW.W - 268, 74, lw, 14, 7); ctx.fill();
  const lf = p.light / p.maxLight;
  const lg = ctx.createLinearGradient(VIEW.W - 268, 0, VIEW.W - 28, 0);
  lg.addColorStop(0, '#ff9d00');
  lg.addColorStop(1, '#ffe9a3');
  ctx.fillStyle = lf < 0.25 ? PALETTE.danger : lg;
  if (lf > 0.01) { roundRect(ctx, VIEW.W - 268, 74, lw * lf, 14, 7); ctx.fill(); }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(`${Math.ceil(p.light)} / ${p.maxLight}`, VIEW.W - 268, 100);

  // Bottom hint bar.
  ctx.fillStyle = 'rgba(8, 12, 34, 0.55)';
  ctx.fillRect(0, VIEW.H - 30, VIEW.W, 30);
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('WASD / Panah bergerak  •  Spasi / Klik = Dash (pakai cahaya)  •  P = Jeda  •  M = Suara', VIEW.W / 2, VIEW.H - 11);

  // Low-light warning.
  if (lf < 0.25 && !p.dead) {
    ctx.fillStyle = `rgba(255, 93, 115, ${0.5 + 0.4 * Math.sin(s.time * 6)})`;
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText('⚠ LENTERA HAMPIR PADAM — kumpulkan embun cahaya!', VIEW.W / 2, 132);
  }
  ctx.restore();
}

// --- screens ---

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6, 9, 28, 0.82)';
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 16); ctx.fill(); ctx.stroke();
}

function drawTitle(ctx, s) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.45)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  panel(ctx, 300, 96, 680, 500);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('LUMEN', 640, 178);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('— Keeper of the Night Garden —', 640, 214);
  ctx.font = '16px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Taman malam sedang dipadamkan oleh para Gloom.', 640, 256);
  ctx.fillText('Kamu kunang-kunang terakhir yang menjaga cahaya.', 640, 280);

  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('CARA MAIN', 360, 322);
  ctx.font = '15px Georgia, serif';
  const lines = [
    'WASD / Panah — terbang.   Spasi / Klik mouse — DASH ke arah kursor.',
    'Cahaya lenteramu MEMBAKAR Gloom di dekatmu — tapi dash menguras cahaya.',
    'Kumpulkan embun cahaya ✦ dari bunga agar lentera tetap menyala.',
    'Bertahan 10 wave sampai fajar terbit. Tiap wave selesai: pilih 1 upgrade.',
    'Hati-hati: sentuhan Gloom mengurangi 1 ♥ dan memadamkan sebagian cahaya.',
  ];
  lines.forEach((l, i) => ctx.fillText('•  ' + l, 360, 348 + i * 24));

  // Start button.
  const pulse = 1 + 0.05 * Math.sin(s.time * 3);
  ctx.save();
  ctx.translate(640, 516);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, -150, -26, 300, 52, 12); ctx.fill();
  ctx.fillStyle = '#241a05';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶  MULAI BERMAIN', 0, 8);
  ctx.restore();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('Klik tombol atau tekan ENTER / SPASI', 640, 566);
  if (s.best > 0) ctx.fillText(`Skor terbaikmu: ${s.best.toLocaleString('id-ID')}`, 640, 588);
}

function drawUpgrade(ctx, s) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.6)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(`WAVE ${s.waves.wave} SELESAI!`, 640, 130);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Pilih satu hadiah untuk wave berikutnya — klik kartu atau tekan 1 / 2 / 3', 640, 166);
  const cw = 250, ch = 210, gap = 30;
  const x0 = 640 - (cw * 3 + gap * 2) / 2;
  s.upgradeCards.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const y = 210;
    const hover = s.input.mouse.x >= x && s.input.mouse.x <= x + cw && s.input.mouse.y >= y && s.input.mouse.y <= y + ch;
    ctx.fillStyle = hover ? 'rgba(40, 48, 96, 0.95)' : 'rgba(10, 14, 40, 0.92)';
    ctx.strokeStyle = hover ? PALETTE.gold : PALETTE.hudBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, cw, ch, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '44px Georgia, serif';
    ctx.fillText(u.icon, x + cw / 2, y + 66);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px Georgia, serif';
    ctx.fillText(u.name, x + cw / 2, y + 108);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '14px Georgia, serif';
    const words = u.desc.split(' ');
    let line = '', ly = y + 140;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) { ctx.fillText(line.trim(), x + cw / 2, ly); ly += 19; line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) ctx.fillText(line.trim(), x + cw / 2, ly);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y + ch - 16);
  });
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px Georgia, serif';
  ctx.fillText(`Skor ${s.score.toLocaleString('id-ID')}  •  Wave berikutnya: ${s.waves.wave + 1} / ${WAVES.total}`, 640, 480);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 26, 0.65)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText('JEDA', 640, 330);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText('Tekan P atau Esc untuk lanjut  •  R untuk mulai ulang', 640, 372);
}

function drawEnd(ctx, s, won) {
  ctx.fillStyle = won ? 'rgba(20, 30, 8, 0.55)' : 'rgba(20, 5, 14, 0.6)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  panel(ctx, 330, 130, 620, 440);
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('☀ FAJAR TERBIT!', 640, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('Taman selamat. Cahayamu mengalahkan malam.', 640, 250);
  } else {
    ctx.fillStyle = PALETTE.danger;
    ctx.font = 'bold 52px Georgia, serif';
    ctx.fillText('TAMAN PADAM…', 640, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'italic 20px Georgia, serif';
    ctx.fillText('Para Gloom memadamkan lentera terakhir.', 640, 250);
  }
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText(`Skor akhir: ${s.score.toLocaleString('id-ID')}`, 640, 320);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`Wave tercapai: ${Math.max(1, s.waves.wave)} / ${WAVES.total}   •   Gloom dikalahkan: ${s.kills}`, 640, 352);
  ctx.fillText(`Skor terbaik: ${Math.max(s.best, s.score).toLocaleString('id-ID')}`, 640, 380);
  const pulse = 1 + 0.05 * Math.sin(s.time * 3);
  ctx.save();
  ctx.translate(640, 462);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = PALETTE.gold;
  roundRect(ctx, -170, -26, 340, 52, 12); ctx.fill();
  ctx.fillStyle = '#241a05';
  ctx.font = 'bold 21px Georgia, serif';
  ctx.fillText('↻  MAIN LAGI  (R)', 0, 8);
  ctx.restore();
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '14px Georgia, serif';
  ctx.fillText('Tekan R atau klik tombol untuk bermain lagi', 640, 530);
}

function drawWaveBanner(ctx, s) {
  if (!s.banner) return;
  const t = s.bannerT;
  const a = t < 0.3 ? t / 0.3 : t > 1.8 ? Math.max(0, (2.3 - t) / 0.5) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.fillStyle = s.bannerColor || PALETTE.gold;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText(s.banner, 640, 250);
  ctx.font = '18px Georgia, serif';
  ctx.fillStyle = PALETTE.text;
  if (s.bannerSub) ctx.fillText(s.bannerSub, 640, 284);
  ctx.restore();
}

export function render(ctx, s) {
  ctx.save();
  ctx.translate(s.particles.shakeX, s.particles.shakeY);
  drawBackground(ctx, s.scenery, s.time);
  for (const o of s.orbs) drawOrb(ctx, o);
  if (s.bloom) drawBloom(ctx, s.bloom);
  for (const g of s.glooms) drawGloom(ctx, g, s.time);
  for (const sh of s.shots) drawShot(ctx, sh);
  if (s.phase === 'playing' || s.phase === 'upgrade' || s.phase === 'paused' || s.phase === 'over' || s.phase === 'won') {
    if (!s.player.dead) drawPlayer(ctx, s.player, s.time);
  }
  s.particles.draw(ctx);

  // Vignette.
  const v = ctx.createRadialGradient(640, 360, 300, 640, 360, 760);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(2,4,16,0.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.restore();

  if (s.phase === 'playing' || s.phase === 'upgrade' || s.phase === 'paused') drawHud(ctx, s);
  if (s.phase === 'playing' || s.phase === 'upgrade') drawWaveBanner(ctx, s);
  if (s.phase === 'title') drawTitle(ctx, s);
  if (s.phase === 'upgrade') drawUpgrade(ctx, s);
  if (s.phase === 'paused') drawPaused(ctx);
  if (s.phase === 'over') drawEnd(ctx, s, false);
  if (s.phase === 'won') drawEnd(ctx, s, true);
}
