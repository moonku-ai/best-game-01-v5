// audio.js — every sound is synthesized with WebAudio, so the game ships no
// audio files and makes no network request. A tiny helper builds short
// envelopes; the ambient pad is two detuned oscillators through a lowpass.

import { AUDIO } from './config.js';

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : AUDIO.master;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone({ freq = 440, freqEnd = null, dur = 0.15, type = 'sine', vol = 0.3, delay = 0, attack = 0.005 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise({ dur = 0.2, vol = 0.2, freq = 1200, delay = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass'; filt.frequency.value = freq; filt.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t0);
  }

  const sfx = {
    pickup(combo = 1) {
      const base = 620 * Math.pow(1.059, Math.min(combo, 12));
      tone({ freq: base, freqEnd: base * 1.5, dur: 0.12, type: 'sine', vol: 0.22 });
      tone({ freq: base * 2, dur: 0.08, type: 'triangle', vol: 0.08, delay: 0.03 });
    },
    dash() { noise({ dur: 0.16, vol: 0.16, freq: 900 }); tone({ freq: 300, freqEnd: 90, dur: 0.14, type: 'sine', vol: 0.1 }); },
    burn() { noise({ dur: 0.1, vol: 0.07, freq: 2400 }); },
    kill(mult = 1) {
      tone({ freq: 220 + mult * 18, freqEnd: 60, dur: 0.18, type: 'triangle', vol: 0.22 });
      noise({ dur: 0.12, vol: 0.12, freq: 1800 });
    },
    hurt() {
      tone({ freq: 160, freqEnd: 50, dur: 0.3, type: 'sawtooth', vol: 0.25 });
      noise({ dur: 0.2, vol: 0.18, freq: 500 });
    },
    waveHorn() {
      tone({ freq: 196, dur: 0.5, type: 'triangle', vol: 0.2 });
      tone({ freq: 294, dur: 0.5, type: 'triangle', vol: 0.16, delay: 0.08 });
      tone({ freq: 392, dur: 0.55, type: 'sine', vol: 0.14, delay: 0.16 });
    },
    waveClear() {
      [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.16, delay: i * 0.09 }));
    },
    upgrade() {
      [392, 523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.14, delay: i * 0.06 }));
    },
    bloom() {
      tone({ freq: 880, freqEnd: 1320, dur: 0.35, type: 'sine', vol: 0.16 });
      tone({ freq: 1320, freqEnd: 1760, dur: 0.3, type: 'sine', vol: 0.1, delay: 0.12 });
    },
    boss() {
      tone({ freq: 98, dur: 0.7, type: 'sawtooth', vol: 0.2 });
      tone({ freq: 147, dur: 0.7, type: 'sawtooth', vol: 0.14, delay: 0.1 });
      noise({ dur: 0.5, vol: 0.1, freq: 300 });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.18, delay: i * 0.18 }));
    },
    victory() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: 0.4, type: 'triangle', vol: 0.16, delay: i * 0.12 }));
    },
    click() { tone({ freq: 700, dur: 0.05, type: 'sine', vol: 0.12 }); },
  };

  function startPad() {
    if (!ensure() || padNodes) return;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 420;
    const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.8;
    const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = 220.5;
    const g3 = ctx.createGain(); g3.gain.value = 0.25;
    o1.connect(filt); o2.connect(filt); o3.connect(g3); g3.connect(filt);
    filt.connect(g); g.connect(master);
    o1.start(); o2.start(); o3.start();
    // Slow breathing on the pad.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lg = ctx.createGain(); lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    padNodes = { o1, o2, o3, lfo, g };
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : AUDIO.master;
    return muted;
  }

  return { sfx, startPad, toggleMute, ensure, get muted() { return muted; } };
}
