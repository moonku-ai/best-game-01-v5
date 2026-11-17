// input.js — keyboard + mouse state, kept apart from game logic so the game
// can be driven by real input or by a scripted test the same way.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered: consumed once per frame
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
  }

  const onKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    if (!e.repeat) pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  };
  const onKeyUp = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  const onMouseMove = (e) => { const p = toLocal(e); mouse.x = p.x; mouse.y = p.y; };
  const onMouseDown = (e) => { const p = toLocal(e); mouse.x = p.x; mouse.y = p.y; mouse.down = true; mouse.clicked = true; };
  const onMouseUp = () => { mouse.down = false; };
  const onBlur = () => { keys.clear(); mouse.down = false; };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    keys, mouse,
    down(...names) { return names.some((n) => keys.has(n)); },
    // True once, on the frame the key went down.
    wasPressed(...names) { return names.some((n) => pressed.has(n)); },
    wasClicked() { return mouse.clicked; },
    axis() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    endFrame() { pressed.clear(); mouse.clicked = false; },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
