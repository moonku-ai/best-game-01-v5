// LUMEN — Keeper of the Night Garden. Entry program for best-game-01.
// It hands the game in: copies this repository's game/ (the playable game
// as plain static files) and screenshots/ (real renders of the game) into
// the output directory, then writes /output/dossier.json with the vendored
// make.fun library, the summary the AI judge reads.
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader runs it with /output as the target instead.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

const shotsDir = join(outDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), shotsDir, { recursive: true });
}

// The scorer's own caps (from the kit's gate): text is capped so the
// dossier stays readable; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; game/ over 993 files or
// 48 MiB in all; a path under game/ over 1000 bytes).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`LUMEN entry written to ${outDir}`);
