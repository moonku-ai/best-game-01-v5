// main.js — bootstrap: size the canvas, wire input, create the game, and
// stage a deterministic screenshot state when ?shot= is present.

import { VIEW } from './config.js';
import { createInput } from './input.js';
import { createGame } from './game.js';
import { readShotParams, stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.W;
canvas.height = VIEW.H;

const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || (Date.now() % 2147483647));
const game = createGame(canvas, input, { seed });

const shot = readShotParams();
if (shot) {
  stageShot(game, shot.shot, shot.seed);
  // Freeze the staged frame for a clean capture: keep rendering, but the
  // play state is staged and the title/end states are static by design.
}

// Expose a tiny handle for play-tests and debugging.
window.__lumen = game;
