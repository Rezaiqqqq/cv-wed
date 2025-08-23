// Letter Glitch background (vanilla JS)
// Renders a full-screen canvas of random letters with color glitches.
// Visible in both light and dark modes. Adapts palette on theme changes.

(function () {
  const ROOT = document.documentElement;

  // Palettes for each theme
  const PALETTE_DARK = ['#2b4539', '#61dca3', '#61b3dc'];
  const PALETTE_LIGHT = ['#6b7280', '#7c5cff', '#22d3ee'];

  // Config
  const FONT_SIZE = 16; // px
  const CHAR_W = 10;
  const CHAR_H = 20;
  let GLITCH_MS = 60; // speed
  let SMOOTH = true;
  const USE_OUTER_VIGNETTE = true;
  const USE_CENTER_VIGNETTE = false;

  const LETTERS = (
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '!@#$&*()-_+=/[]{};:<>,' +
    '0123456789'
  ).split('');

  const getRandomChar = () => LETTERS[(Math.random() * LETTERS.length) | 0];

  function pickPalette() {
    const isLight = ROOT.classList.contains('light');
    return isLight ? PALETTE_LIGHT : PALETTE_DARK;
  }

  function getRandomColor(palette) {
    return palette[(Math.random() * palette.length) | 0];
  }

  function hexToRgb(hex) {
    const shorthand = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthand, (m, r, g, b) => r + r + g + g + b + b);
    const res = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return res
      ? { r: parseInt(res[1], 16), g: parseInt(res[2], 16), b: parseInt(res[3], 16) }
      : null;
  }

  function interpolateColor(start, end, factor) {
    const r = Math.round(start.r + (end.r - start.r) * factor);
    const g = Math.round(start.g + (end.g - start.g) * factor);
    const b = Math.round(start.b + (end.b - start.b) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Create wrapper and canvas
  const wrap = document.createElement('div');
  wrap.id = 'letter-glitch-bg';
  Object.assign(wrap.style, {
    position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none',
  });

  const canvas = document.createElement('canvas');
  canvas.id = 'letter-glitch-canvas';
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  wrap.appendChild(canvas);

  // Optional vignette overlays via DOM
  function addVignettes() {
    if (USE_OUTER_VIGNETTE) {
      const outer = document.createElement('div');
      Object.assign(outer.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,0,0,0.9) 100%)',
      });
      wrap.appendChild(outer);
    }
    if (USE_CENTER_VIGNETTE) {
      const center = document.createElement('div');
      Object.assign(center.style, {
        position: 'absolute', inset: '0', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 55%)',
      });
      wrap.appendChild(center);
    }
  }

  addVignettes();
  document.body.prepend(wrap);

  const ctx = canvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let width = 0, height = 0;
  let columns = 0, rows = 0;
  let palette = pickPalette();
  let letters = []; // { char, color, targetColor, progress }
  let raf = 0;
  let lastGlitch = Date.now();

  function calcGrid(w, h) {
    columns = Math.ceil(w / CHAR_W);
    rows = Math.ceil(h / CHAR_H);
  }

  function initLetters() {
    const total = columns * rows;
    letters = new Array(total).fill(0).map(() => ({
      char: getRandomChar(),
      color: getRandomColor(palette),
      targetColor: getRandomColor(palette),
      progress: 1,
    }));
  }

  function resize() {
    const rectW = window.innerWidth;
    const rectH = window.innerHeight;
    width = Math.max(1, rectW);
    height = Math.max(1, rectH);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    calcGrid(width, height);
    initLetters();
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textBaseline = 'top';

    for (let i = 0; i < letters.length; i++) {
      const l = letters[i];
      const x = (i % columns) * CHAR_W;
      const y = Math.floor(i / columns) * CHAR_H;
      ctx.fillStyle = l.color;
      ctx.fillText(l.char, x, y);
    }
  }

  function updateLetters() {
    if (!letters.length) return;
    const count = Math.max(1, Math.floor(letters.length * 0.05));
    for (let i = 0; i < count; i++) {
      const idx = (Math.random() * letters.length) | 0;
      const l = letters[idx];
      if (!l) continue;
      l.char = getRandomChar();
      l.targetColor = getRandomColor(palette);
      l.progress = SMOOTH ? 0 : 1;
      if (!SMOOTH) l.color = l.targetColor;
    }
  }

  function stepSmooth() {
    let need = false;
    for (const l of letters) {
      if (l.progress < 1) {
        l.progress += 0.05;
        if (l.progress > 1) l.progress = 1;
        const startRgb = hexToRgb(l.color) || hexToRgb('#000000');
        const endRgb = hexToRgb(l.targetColor) || hexToRgb('#ffffff');
        if (startRgb && endRgb) {
          l.color = interpolateColor(startRgb, endRgb, l.progress);
          need = true;
        }
      }
    }
    if (need) draw();
  }

  function animate() {
    const now = Date.now();
    if (now - lastGlitch >= GLITCH_MS) {
      updateLetters();
      draw();
      lastGlitch = now;
    }
    if (SMOOTH) stepSmooth();
    raf = requestAnimationFrame(animate);
  }

  // Theme observer: adapt palette on change
  const mo = new MutationObserver(() => {
    palette = pickPalette();
  });
  mo.observe(ROOT, { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    animate();
  });

  resize();
  animate();
})();
