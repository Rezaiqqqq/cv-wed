// Light Rays background using OGL (vanilla JS)
// Renders full-screen shader behind content. Hidden in light mode.

(async function initLightRays() {
  // Load OGL
  const { Renderer, Program, Triangle, Mesh } = await import('https://cdn.skypack.dev/ogl');

  // Helper: hex to [r,g,b]
  function hexToRgb(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
        ]
      : [1, 1, 1];
  }

  // Defaults (can be tweaked later if needed)
  const params = {
    raysOrigin: 'top-center',
    raysColor: '#ffffff',
    raysSpeed: 1,
    lightSpread: 1,
    rayLength: 2,
    pulsating: false,
    fadeDistance: 1.0,
    saturation: 1.0,
    followMouse: true,
    mouseInfluence: 0.1,
    noiseAmount: 0.0,
    distortion: 0.0,
  };

  // Compute origin and direction
  function getAnchorAndDir(origin, w, h) {
    const outside = 0.2;
    switch (origin) {
      case 'top-left':
        return { anchor: [0, -outside * h], dir: [0, 1] };
      case 'top-right':
        return { anchor: [w, -outside * h], dir: [0, 1] };
      case 'left':
        return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
      case 'right':
        return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
      case 'bottom-left':
        return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
      case 'bottom-center':
        return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
      case 'bottom-right':
        return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
      default: // 'top-center'
        return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
    }
  }

  // Create container
  let wrap = document.getElementById('light-rays-bg');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'light-rays-bg';
    Object.assign(wrap.style, {
      position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none'
    });
    document.body.prepend(wrap);
  }

  // Create renderer
  const renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio, 2), alpha: true });
  const gl = renderer.gl;
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';
  wrap.appendChild(gl.canvas);

  // Shaders (ported from the provided React component)
  const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  rayPos;
uniform vec2  rayDir;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform vec2  mousePos;
uniform float mouseInfluence;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                  float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  vec2 dirNorm = normalize(sourceToCoord);
  float cosAngle = dot(dirNorm, rayRefDirection);

  float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
  float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

  float distance = length(sourceToCoord);
  float maxDistance = iResolution.x * rayLength;
  float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

  float baseStrength = clamp(
    (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
    0.0, 1.0
  );

  return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  
  vec2 finalRayDir = rayDir;
  if (mouseInfluence > 0.0) {
    vec2 mouseScreenPos = mousePos * iResolution.xy;
    vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
    finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
  }

  vec4 rays1 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                           1.5 * raysSpeed);
  vec4 rays2 = vec4(1.0) *
               rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                           1.1 * raysSpeed);

  fragColor = rays1 * 0.5 + rays2 * 0.4;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  float brightness = 1.0 - (coord.y / iResolution.y);
  fragColor.x *= 0.1 + brightness * 0.8;
  fragColor.y *= 0.3 + brightness * 0.6;
  fragColor.z *= 0.5 + brightness * 0.5;

  if (saturation != 1.0) {
    float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
    fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
  }

  fragColor.rgb *= raysColor;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor  = color;
}`;

  const uniforms = {
    iTime: { value: 0 },
    iResolution: { value: [1, 1] },

    rayPos: { value: [0, 0] },
    rayDir: { value: [0, 1] },

    raysColor: { value: hexToRgb(params.raysColor) },
    raysSpeed: { value: params.raysSpeed },
    lightSpread: { value: params.lightSpread },
    rayLength: { value: params.rayLength },
    pulsating: { value: params.pulsating ? 1.0 : 0.0 },
    fadeDistance: { value: params.fadeDistance },
    saturation: { value: params.saturation },
    mousePos: { value: [0.5, 0.5] },
    mouseInfluence: { value: params.mouseInfluence },
    noiseAmount: { value: params.noiseAmount },
    distortion: { value: params.distortion },
  };

  const geometry = new Triangle(gl);
  const program = new Program(gl, { vertex: vert, fragment: frag, uniforms });
  const mesh = new Mesh(gl, { geometry, program });

  function updatePlacement() {
    const wCSS = wrap.clientWidth;
    const hCSS = wrap.clientHeight;
    renderer.setSize(wCSS, hCSS);

    const dpr = renderer.dpr;
    const w = wCSS * dpr;
    const h = hCSS * dpr;
    uniforms.iResolution.value = [w, h];

    const { anchor, dir } = getAnchorAndDir(params.raysOrigin, w, h);
    uniforms.rayPos.value = anchor;
    uniforms.rayDir.value = dir;
  }

  const mouse = { x: 0.5, y: 0.5 };
  const smooth = { x: 0.5, y: 0.5 };
  if (params.followMouse) {
    window.addEventListener('mousemove', (e) => {
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouse.x = x; mouse.y = y;
    });
  }

  function loop(t) {
    uniforms.iTime.value = t * 0.001;

    if (params.followMouse && params.mouseInfluence > 0.0) {
      const smoothing = 0.92;
      smooth.x = smooth.x * smoothing + mouse.x * (1 - smoothing);
      smooth.y = smooth.y * smoothing + mouse.y * (1 - smoothing);
      uniforms.mousePos.value = [smooth.x, smooth.y];
    }

    try {
      renderer.render({ scene: mesh });
      requestAnimationFrame(loop);
    } catch (err) {
      console.warn('WebGL error:', err);
    }
  }

  window.addEventListener('resize', updatePlacement);
  updatePlacement();
  requestAnimationFrame(loop);

  // Theme binding: hide in light mode
  function applyTheme() {
    const isLight = document.documentElement.classList.contains('light');
    wrap.style.display = isLight ? 'none' : 'block';
  }
  const mo = new MutationObserver(applyTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  applyTheme();
})();
