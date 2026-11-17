# LUMEN — Keeper of the Night Garden

A complete, original arcade survival game for the
[make.fun](https://make.fun) **best-game-01** bounty ("Make the best game",
$1,000). Written from scratch in plain JavaScript + Canvas 2D — no engine,
no assets, no network requests. Open it in a desktop browser and it just plays.

## The game

You are **Lumen**, the last firefly guarding a night garden. Shadow wisps —
the **Glooms** — swarm in to snuff the garden's light. Your lantern's glow
burns any Gloom that comes close, but every dash spends light, and every hit
snuffs some of it out. Gather **dew-light orbs** from the flowers to keep the
lantern lit. Survive **10 waves** until dawn breaks.

- **Move** — WASD / arrow keys. **Dash** — Space or mouse click (toward the
  cursor); dashing costs light.
- **Light is everything**: it is your weapon, your range and your second
  health bar. Spend it boldly or hoard it — the choice is the game.
- **Enemies**: Drifters, Darts (telegraphed lunges), Splitters (break into
  wisps), Spitters (ranged globs), and the boss **The Hollow Owl** on waves
  5 and 10.
- **Between waves**, pick 1 of 3 upgrade cards (lantern, burn, speed,
  magnet, hearts, frost…).
- **Bloom events**: a flower blooms every ~26 s — reach it before it wilts
  for a big bonus and a heal.
- **Combo multiplier** up to x8 for chained kills. Score, best score
  (localStorage), pause (P), mute (M), restart (R).
- **Sound**: fully synthesized with WebAudio — no audio files.
- **Deterministic screenshots**: `?shot=start|play|boss|end&seed=7`.

## Play it

```sh
node serve.ts            # serves game/ on http://localhost:8080
# or just open game/index.html in Chrome/Firefox
```

## Hand in (the make.fun entry program)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-game.ts` library (copied from the competition kit, unchanged).

## Layout

```
main.ts            entry program (Node 22)
serve.ts           tiny static server for local play-testing
shots.json         the four screenshot states
screenshots/      real renders of the game's own code
game/
  index.html       canvas + loader
  src/
    config.js      tuning + palette
    random.js      seeded RNG
    input.js       keyboard + mouse
    audio.js       synthesized WebAudio SFX + ambient pad
    particles.js   sparks, rings, floating text, screen shake
    entities.js    player, glooms, orbs, bloom, shots
    waves.js       wave composition, spawning, boss, upgrades
    render.js      garden, actors, HUD, all screens
    game.js        state machine, loop, collisions, scoring
    shots.js       deterministic screenshot staging
    main.js        bootstrap
vendor/
  makefun-game.ts  kit library, unchanged
```

## License

MIT — see [LICENSE](LICENSE).
