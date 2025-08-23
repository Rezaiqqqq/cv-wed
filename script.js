// حفظ السمة في localStorage — نجعل الافتراضي داكن
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  root.classList.add('light');
} else {
  root.classList.remove('light'); // افتراضي داكن
}

// زر تبديل السمة + تحديث الأيقونة و meta theme-color
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeToggle = document.getElementById('themeToggle');

function applyThemeUI() {
  const isLight = root.classList.contains('light');
  if (themeToggle) themeToggle.innerHTML = isLight ? '<i class="ri-sun-line"></i>' : '<i class="ri-moon-clear-line"></i>';
  if (themeMeta) themeMeta.setAttribute('content', isLight ? '#f1f5f9' : '#0b0f19');
}

applyThemeUI();

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    root.classList.toggle('light');
    const isLight = root.classList.contains('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    applyThemeUI();
  });
}

// تأثير تموج على الأزرار/الكروت
function attachRipples() {
  document.querySelectorAll('.ripple').forEach(el => {
    el.addEventListener('pointerdown', e => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100 + '%';
      const y = ((e.clientY - rect.top) / rect.height) * 100 + '%';
      el.style.setProperty('--x', x);
      el.style.setProperty('--y', y);
      el.classList.add('active');
    });
    el.addEventListener('pointerup', () => el.classList.remove('active'));
    el.addEventListener('pointerleave', () => el.classList.remove('active'));
  });
}
attachRipples();

// نسخ الرابط
const copyBtn = document.getElementById('copyLink');
if (copyBtn) {
  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(location.href);
      const title = copyBtn.querySelector('.meta h3');
      if (title) {
        const prev = title.textContent;
        title.textContent = 'تم النسخ';
        setTimeout(() => (title.textContent = prev || 'نسخ الرابط'), 1600);
      }
    } catch {}
  });
}

// عرض QR للرابط الحالي
const showQR = document.getElementById('showQR');
const qrModal = document.getElementById('qrModal');
const qrImg = document.getElementById('qrImg');
const closeQR = document.getElementById('closeQR');
const qrBackdrop = document.getElementById('qrBackdrop');

function buildQR(url){
  // نستخدم API مجاني سريع لعرض QR بدون تبعيات
  const encoded = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encoded}`;
}
function openQR(){
  if (!qrModal) return;
  qrImg.src = buildQR(location.href);
  qrModal.setAttribute('aria-hidden','false');
}
function hideQR(){ if(qrModal) qrModal.setAttribute('aria-hidden','true'); }

showQR?.addEventListener('click', (e) => { e.preventDefault(); openQR(); });
closeQR?.addEventListener('click', hideQR);
qrBackdrop?.addEventListener('click', hideQR);

// خلفية جزيئات كانفاس + Parallax بسيط
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let w, h, particles = [];
const N = 60;

function resize() {
  w = canvas.width = innerWidth; h = canvas.height = innerHeight;
}
addEventListener('resize', resize); resize();

function create() {
  particles = Array.from({ length: N }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - .5) * .6,
    vy: (Math.random() - .5) * .6,
    r: Math.random() * 2 + 1
  }));
}
create();

let mx = 0, my = 0;
addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; });

function step() {
  ctx.clearRect(0,0,w,h);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > w) p.vx *= -1;
    if (p.y < 0 || p.y > h) p.vy *= -1;

    // parallax جذب خفيف تجاه المؤشر
    const dx = (mx - p.x) * 0.0008;
    const dy = (my - p.y) * 0.0008;
    p.vx += dx; p.vy += dy;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r*6);
    grad.addColorStop(0, 'rgba(124,92,255,.9)');
    grad.addColorStop(1, 'rgba(124,92,255,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }
  requestAnimationFrame(step);
}
step();

// تأثير خفيف خلف الاسم على كانفاس داخل .goo-filter-container
function initNameCanvas() {
  const container = document.querySelector('.goo-filter-container');
  const cnv = container?.querySelector('.pixel-canvas');
  if (!container || !cnv) return;

  const ctx = cnv.getContext('2d');
  ctx.globalCompositeOperation = 'lighter';
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let w = 0, h = 0;

  function resize() {
    const r = container.getBoundingClientRect();
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));
    cnv.style.width = w + 'px';
    cnv.style.height = h + 'px';
    cnv.width = Math.floor(w * dpr);
    cnv.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // جسيمات توهج ناعم
  const blobs = Array.from({ length: 12 }, () => ({
    x: Math.random() * 1,
    y: Math.random() * 1,
    r: 20 + Math.random() * 36,
    a: Math.random() * Math.PI * 2,
    s: 0.4 + Math.random() * 1.0,
    hue: 250 + Math.random() * 80 // ألوان بنفسجية/سماوية
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const b of blobs) {
      b.a += 0.006 * b.s;
      const px = (0.15 + b.x * 0.7) * w + Math.cos(b.a) * 8;
      const py = (0.35 + b.y * 0.4) * h + Math.sin(b.a * 1.2) * 6;
      const grad = ctx.createRadialGradient(px, py, 0, px, py, b.r);
      grad.addColorStop(0, `hsla(${b.hue}, 95%, 65%, 0.75)`);
      grad.addColorStop(1, `hsla(${b.hue}, 90%, 65%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  // ملاحظة: نحافظ على الأداء منخفض التأثير
  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => resize()) : null;
  if (ro) ro.observe(container);
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(draw);
}

// شاشة ترحيب: إخفاء بعد 5 ثوانٍ أو عند النقر/الضغط
let welcomeSplitTL = null;

function initWelcomeOverlay() {
  const overlay = document.getElementById('welcomeOverlay');
  if (!overlay) return;
  // شغّل حركة SplitText إن وُجد العنوان
  initWelcomeSplitText();

  const hide = () => {
    if (!overlay || overlay.classList.contains('hide')) return;
    overlay.classList.add('hide');
    // إزالة من DOM بعد انتهاء الانتقال حتى لا يؤثر على إمكانية الوصول
    overlay.addEventListener('transitionend', () => {
      // أوقف تحريك GSAP إن كان موجودًا
      if (welcomeSplitTL) {
        try { welcomeSplitTL.kill(); } catch(_) {}
        welcomeSplitTL = null;
      }
      overlay.remove();
    }, { once: true });
  };

  // انقر في أي مكان أو على زر التخطي
  overlay.addEventListener('click', hide);

  // مؤقت 5 ثوانٍ
  setTimeout(hide, 10000);
}

// SplitText بديل بدون React/Plugin: تقسيم النص لأحرف وتحريكها عبر GSAP
function initWelcomeSplitText() {
  const title = document.getElementById('welcomeSplitText');
  if (!title || !window.gsap) return;
  const text = title.textContent;
  title.textContent = '';
  const frag = document.createDocumentFragment();
  const chars = [];
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'split-char';
    span.textContent = ch;
    frag.appendChild(span);
    chars.push(span);
  }
  title.appendChild(frag);
  // أنيميشن دخول
  welcomeSplitTL = gsap.timeline({ smoothChildTiming: true });
  welcomeSplitTL.set(chars, { opacity: 0, y: 40, willChange: 'transform,opacity' });
  welcomeSplitTL.to(chars, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06, clearProps: 'willChange' });
}

// شغّل بعد تحميل DOM
function boot() {
  initWelcomeOverlay();
  initNameCanvas();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
