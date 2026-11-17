// LUMEN — Keeper of the Night Garden
// config.js — every tunable number and the whole palette in one place, so the
// game can be tuned without touching logic. All values were picked by feel in
// play-testing, not copied from anywhere.

export const VIEW = { W: 1280, H: 720 };

export const PALETTE = {
  skyTop: '#0b1030',
  skyMid: '#141b4a',
  skyLow: '#1d2b5e',
  horizon: '#2c3f7d',
  hillFar: '#16224d',
  hillNear: '#0e1838',
  grass: '#0a241c',
  grassLight: '#0e3325',
  flowerStem: '#1d5c3a',
  flowerPetal: '#ff9ecf',
  flowerPetal2: '#ffd166',
  flowerPetal3: '#7ee8fa',
  orb: '#ffe9a3',
  orbCore: '#fff6d8',
  lumen: '#ffd166',
  lumenCore: '#fff3c4',
  lumenRing: 'rgba(255, 209, 102, 0.55)',
  gloom: '#3b2d6e',
  gloomEye: '#ff5d73',
  dart: '#5b3a8e',
  splitter: '#6e4fa3',
  spitter: '#472a7a',
  owl: '#241a4a',
  owlEye: '#ffb347',
  hudPanel: 'rgba(8, 12, 34, 0.72)',
  hudBorder: 'rgba(255, 209, 102, 0.35)',
  text: '#f4ead8',
  textDim: '#aab3d6',
  gold: '#ffd166',
  danger: '#ff5d73',
  heal: '#7dffa8',
};

export const PLAYER = {
  radius: 16,
  speed: 265,          // px/s
  accel: 2400,
  friction: 6.5,       // exponential damping per second
  dashSpeed: 720,
  dashTime: 0.16,
  dashCooldown: 0.55,
  dashLightCost: 9,    // light spent per dash
  maxHearts: 3,
  maxLight: 100,
  lightRegen: 1.2,     // slow trickle so a dry lantern is never hopeless
  glowRadius: 118,     // burn radius at full light
  glowMinRadius: 34,   // burn radius when nearly dry
  burnDps: 55,         // damage per second inside the glow
  burnTickLight: 0.9,  // light drained per second while burning a gloom
  orbLight: 7,         // light restored per dew orb
  hurtInvuln: 1.1,     // seconds of invulnerability after a hit
  hitLightLoss: 18,    // light lost when hit
};

export const ORB = {
  radius: 8,
  life: 9,             // seconds before a dew orb fades
  spawnInterval: 1.15,
  maxOnField: 14,
  magnetRadius: 90,    // orbs drift to the player inside this radius
  collectRadius: 26,
};

export const ENEMY = {
  drifter:  { hp: 30, speed: 62,  radius: 15, score: 50,  touch: 1 },
  dart:     { hp: 18, speed: 150, radius: 12, score: 80,  touch: 1 },
  splitter: { hp: 44, speed: 48,  radius: 19, score: 90,  touch: 1 },
  spitter:  { hp: 26, speed: 40,  radius: 14, score: 110, touch: 1 },
  wisp:     { hp: 12, speed: 120, radius: 9,  score: 40,  touch: 1 }, // splitter child
  owl:      { hp: 620, speed: 74, radius: 46, score: 1500, touch: 2 },
};

export const WAVES = {
  total: 10,
  betweenMs: 2600,     // breather between waves (upgrade pick happens here)
  spawnInterval: 1.35, // seconds between spawns at wave 1
  spawnMin: 0.42,      // fastest spawn interval at wave 10
  // composition per wave: [drifters, darts, splitters, spitters]
  table: [
    [5, 0, 0, 0],
    [7, 2, 0, 0],
    [8, 3, 1, 0],
    [9, 4, 2, 0],
    [10, 5, 2, 1],   // wave 5: + boss owl
    [11, 6, 3, 1],
    [12, 7, 3, 2],
    [13, 8, 4, 2],
    [14, 9, 4, 3],
    [15, 10, 5, 3],  // wave 10: + boss owl, then dawn
  ],
  bossWaves: [5, 10],
};

export const COMBO = {
  window: 3.0,         // seconds to keep the chain alive
  maxMult: 8,
};

export const BLOOM = {
  everySec: 26,        // a bloom flower appears this often
  windowSec: 12,       // seconds to reach it before it wilts
  radius: 22,
  bonus: 400,
  healLight: 30,
};

export const UPGRADES = [
  { id: 'lantern',  name: 'Lentera Besar',  desc: '+30 cahaya maks & isi penuh', icon: '◉' },
  { id: 'flare',    name: 'Nyala Terang',   desc: '+40% damage bakar & +18 jangkauan', icon: '✦' },
  { id: 'swift',    name: 'Sayap Cepat',    desc: '+18% kecepatan & dash lebih murah', icon: '➤' },
  { id: 'magnet',   name: 'Embun Magnet',   desc: 'Tarik embun dari 2x lebih jauh', icon: '◎' },
  { id: 'heart',    name: 'Hati Bunga',     desc: '+1 hati (maks 5)', icon: '♥' },
  { id: 'thick',    name: 'Kulit Kunang',   desc: 'Kebal 0,5 dtk lebih lama setelah kena', icon: '⬢' },
  { id: 'greedy',   name: 'Panen Rakus',    desc: 'Embun memberi +4 cahaya ekstra', icon: '✚' },
  { id: 'frost',    name: 'Embun Beku',     desc: 'Musuh melambat 25% saat dekat', icon: '❄' },
];

export const SCORE = {
  waveClear: 250,
  bossBonus: 1000,
};

export const AUDIO = {
  master: 0.5,
};
