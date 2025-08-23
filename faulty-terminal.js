// Faulty Terminal background using OGL (vanilla JS, ESM)
// Renders full-screen shader behind content and adapts to theme (dark: black, light: white)

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

varying vec2 vUv;

uniform float iTime;
uniform vec3  iResolution;
uniform float uScale;

uniform vec2  uGridMul;
uniform float uDigitSize;
uniform float uScanlineIntensity;
uniform float uGlitchAmount;
uniform float uFlickerAmount;
uniform float uNoiseAmp;
uniform float uChromaticAberration;
uniform float uDither;
uniform float uCurvature;
uniform vec3  uTint;
uniform vec2  uMouse;
uniform float uMouseStrength;
uniform float uUseMouse;
uniform float uPageLoadProgress;
uniform float uUsePageLoadAnimation;
uniform float uBrightness;

float time;

float hash21(vec2 p){
  p = fract(p * 234.56);
  p += dot(p, p + 34.56);
  return fract(p.x * p.y);
}

float noise(vec2 p)
{
  return sin(p.x * 10.0) * sin(p.y * (3.0 + sin(time * 0.090909))) + 0.2; 
}

mat2 rotate(float angle)
{
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

float fbm(vec2 p)
{
  p *= 1.1;
  float f = 0.0;
  float amp = 0.5 * uNoiseAmp;
  
  mat2 modify0 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify0 * p * 2.0;
  amp *= 0.454545; // 1/2.2
  
  mat2 modify1 = rotate(time * 0.02);
  f += amp * noise(p);
  p = modify1 * p * 2.0;
  amp *= 0.454545;
  
  mat2 modify2 = rotate(time * 0.08);
  f += amp * noise(p);
  
  return f;
}

float pattern(vec2 p, out vec2 q, out vec2 r) {
  vec2 offset1 = vec2(1.0);
  vec2 offset0 = vec2(0.0);
  mat2 rot01 = rotate(0.1 * time);
  mat2 rot1 = rotate(0.1);
  
  q = vec2(fbm(p + offset1), fbm(rot01 * p + offset1));
  r = vec2(fbm(rot1 * q + offset0), fbm(q + offset0));
  return fbm(p + r);
}

float digit(vec2 p){
    vec2 grid = uGridMul * 15.0;
    vec2 s = floor(p * grid) / grid;
    p = p * grid;
    vec2 q, r;
    float intensity = pattern(s * 0.1, q, r) * 1.3 - 0.03;
    
    if(uUseMouse > 0.5){
        vec2 mouseWorld = uMouse * uScale;
        float distToMouse = distance(s, mouseWorld);
        float mouseInfluence = exp(-distToMouse * 8.0) * uMouseStrength * 10.0;
        intensity += mouseInfluence;
        
        float ripple = sin(distToMouse * 20.0 - iTime * 5.0) * 0.1 * mouseInfluence;
        intensity += ripple;
    }
    
    if(uUsePageLoadAnimation > 0.5){
        float cellRandom = fract(sin(dot(s, vec2(12.9898, 78.233))) * 43758.5453);
        float cellDelay = cellRandom * 0.8;
        float cellProgress = clamp((uPageLoadProgress - cellDelay) / 0.2, 0.0, 1.0);
        
        float fadeAlpha = smoothstep(0.0, 1.0, cellProgress);
        intensity *= fadeAlpha;
    }
    
    p = fract(p);
    p *= uDigitSize;
    
    float px5 = p.x * 5.0;
    float py5 = (1.0 - p.y) * 5.0;
    float x = fract(px5);
    float y = fract(py5);
    
    float i = floor(py5) - 2.0;
    float j = floor(px5) - 2.0;
    float n = i * i + j * j;
    float f = n * 0.0625;
    
    float isOn = step(0.1, intensity - f);
    float brightness = isOn * (0.2 + y * 0.8) * (0.75 + x * 0.25);
    
    return step(0.0, p.x) * step(p.x, 1.0) * step(0.0, p.y) * step(p.y, 1.0) * brightness;
}

float onOff(float a, float b, float c)
{
  return step(c, sin(iTime + a * cos(iTime * b))) * uFlickerAmount;
}

float displace(vec2 look)
{
    float y = look.y - mod(iTime * 0.25, 1.0);
    float window = 1.0 / (1.0 + 50.0 * y * y);
    return sin(look.y * 20.0 + iTime) * 0.0125 * onOff(4.0, 2.0, 0.8) * (1.0 + cos(iTime * 60.0)) * window;
}

vec3 getColor(vec2 p){
    float bar = step(mod(p.y + time * 20.0, 1.0), 0.2) * 0.4 + 1.0; // more efficient than ternary
    bar *= uScanlineIntensity;
    
    float displacement = displace(p);
    p.x += displacement;

    if (uGlitchAmount != 1.0) {
      float extra = displacement * (uGlitchAmount - 1.0);
      p.x += extra;
    }

    float middle = digit(p);
    
    const float off = 0.002;
    float sum = digit(p + vec2(-off, -off)) + digit(p + vec2(0.0, -off)) + digit(p + vec2(off, -off)) +
                digit(p + vec2(-off, 0.0)) + digit(p + vec2(0.0, 0.0)) + digit(p + vec2(off, 0.0)) +
                digit(p + vec2(-off, off)) + digit(p + vec2(0.0, off)) + digit(p + vec2(off, off));
    
    vec3 baseColor = vec3(0.9) * middle + sum * 0.1 * vec3(1.0) * bar;
    return baseColor;
}

vec2 barrel(vec2 uv){
  vec2 c = uv * 2.0 - 1.0;
  float r2 = dot(c, c);
  c *= 1.0 + uCurvature * r2;
  return c * 0.5 + 0.5;
}

void main() {
    time = iTime * 0.333333;
    vec2 uv = vUv;

    if(uCurvature != 0.0){
      uv = barrel(uv);
    }
    
    vec2 p = uv * uScale;
    vec3 col = getColor(p);

    if(uChromaticAberration != 0.0){
      vec2 ca = vec2(uChromaticAberration) / iResolution.xy;
      col.r = getColor(p + ca).r;
      col.b = getColor(p - ca).b;
    }

    col *= uTint;
    col *= uBrightness;

    if(uDither > 0.0){
      float rnd = hash21(gl_FragCoord.xy);
      col += (rnd - 0.5) * (uDither * 0.003922);
    }

    gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

async function initFaultyBackground() {
  // Import OGL as an ES module
  const { Renderer, Program, Mesh, Triangle, Color } = await import('https://cdn.skypack.dev/ogl');

  // Container and canvas
  let wrap = document.getElementById('faulty-bg');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'faulty-bg';
    Object.assign(wrap.style, {
      position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none'
    });
    document.body.prepend(wrap);
  }

  const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2), alpha: true });
  const gl = renderer.gl;
  wrap.appendChild(gl.canvas);
  gl.clearColor(0, 0, 0, 1);

  const geometry = new Triangle(gl);

  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      iTime: { value: 0 },
      iResolution: { value: new Color(gl.drawingBufferWidth, gl.drawingBufferHeight, gl.drawingBufferWidth / gl.drawingBufferHeight) },
      uScale: { value: 1.0 },
      uGridMul: { value: new Float32Array([2, 1]) },
      uDigitSize: { value: 1.5 },
      uScanlineIntensity: { value: 0.3 },
      uGlitchAmount: { value: 1.0 },
      uFlickerAmount: { value: 1.0 },
      uNoiseAmp: { value: 0.2 },
      uChromaticAberration: { value: 0.0 },
      uDither: { value: 0.0 },
      uCurvature: { value: 0.2 },
      uTint: { value: new Color(1, 1, 1) },
      uMouse: { value: new Float32Array([0.5, 0.5]) },
      uMouseStrength: { value: 0.2 },
      uUseMouse: { value: 1.0 },
      uPageLoadProgress: { value: 0.0 },
      uUsePageLoadAnimation: { value: 1.0 },
      uBrightness: { value: 1.0 },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });

  function resize() {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h);
    program.uniforms.iResolution.value = new Color(gl.drawingBufferWidth, gl.drawingBufferHeight, gl.drawingBufferWidth / gl.drawingBufferHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  // Theme binding: root has class 'light' for light mode
  function applyTheme() {
    const isLight = document.documentElement.classList.contains('light');
    // Light mode: hide shader and force plain white page background
    if (isLight) {
      wrap.style.display = 'none';
      document.body.style.background = '#ffffff';
      program.uniforms.uTint.value = new Color(0, 0, 0);
    } else {
      wrap.style.display = 'block';
      // restore to CSS-controlled for dark mode (do not force)
      document.body.style.background = '';
      program.uniforms.uTint.value = new Color(1, 1, 1);
      wrap.style.backgroundColor = '#000000';
    }
  }
  applyTheme();

  const mo = new MutationObserver(applyTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Mouse handling
  const mouse = { x: 0.5, y: 0.5 };
  const smooth = { x: 0.5, y: 0.5 };
  window.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = 1 - (e.clientY - rect.top) / rect.height;
  });

  let start = performance.now();
  function update(t) {
    requestAnimationFrame(update);
    const dt = (t - start) * 0.001;
    start = t;

    // Smooth mouse
    smooth.x += (mouse.x - smooth.x) * 0.08;
    smooth.y += (mouse.y - smooth.y) * 0.08;
    program.uniforms.uMouse.value[0] = smooth.x;
    program.uniforms.uMouse.value[1] = smooth.y;

    // Page load progress for 2s
    const pl = Math.min((t - performance.timing.navigationStart) / 2000, 1);
    program.uniforms.uPageLoadProgress.value = pl;

    program.uniforms.iTime.value += dt * 0.3; // timeScale

    renderer.render({ scene: mesh });
  }
  requestAnimationFrame(update);
}

// Hide the old bg canvas if present to avoid double backgrounds
(function hideOldBg(){
  const old = document.getElementById('bg');
  if (old) old.style.display = 'none';
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFaultyBackground);
} else {
  initFaultyBackground();
}
