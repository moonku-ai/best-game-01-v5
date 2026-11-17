// particles.js — sparks, embers, floating score text and screen shake. Pure
// presentation: nothing here changes the game state.

export function createParticles() {
  const parts = [];
  const texts = [];
  let shake = 0;
  let shakeX = 0, shakeY = 0;

  function burst(x, y, { count = 12, color = '#ffd166', speed = 160, size = 3, life = 0.6, gravity = 0, spread = Math.PI * 2, dir = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.4 + Math.random() * 0.8);
      parts.push({
        x, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.7), maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color, gravity,
      });
    }
  }

  function ring(x, y, color = '#ffe9a3') {
    parts.push({ x, y, vx: 0, vy: 0, life: 0.45, maxLife: 0.45, size: 4, color, ring: true, gravity: 0 });
  }

  function floatText(x, y, text, color = '#ffe9a3', size = 16) {
    texts.push({ x, y, text, color, size, life: 1.0, maxLife: 1.0 });
  }

  function addShake(amount) { shake = Math.min(14, shake + amount); }

  function update(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= (1 - 2.2 * dt); p.vy *= (1 - 2.2 * dt);
      if (p.ring) p.size += 260 * dt;
    }
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt; t.y -= 34 * dt;
      if (t.life <= 0) texts.splice(i, 1);
    }
    if (shake > 0.2) {
      shakeX = (Math.random() - 0.5) * shake;
      shakeY = (Math.random() - 0.5) * shake;
      shake *= Math.pow(0.02, dt); // fast decay
    } else { shake = 0; shakeX = 0; shakeY = 0; }
  }

  function draw(ctx) {
    for (const p of parts) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size * a), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of texts) {
      const a = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = a;
      ctx.font = `bold ${t.size}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  return {
    burst, ring, floatText, addShake, update, draw,
    get shakeX() { return shakeX; },
    get shakeY() { return shakeY; },
    clear() { parts.length = 0; texts.length = 0; shake = 0; },
  };
}
