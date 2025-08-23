'use strict';
// ASCII Welcome effect using Three.js without React
// Exposes: window.initAsciiWelcome(containerElem, options) -> disposer function

(function(){
  if (typeof window === 'undefined') return;
  const PX_RATIO = window.devicePixelRatio || 1;

  const vertexShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uEnableWaves;
  void main() {
    vUv = uv;
    float time = uTime * 5.;
    float waveFactor = uEnableWaves;
    vec3 transformed = position;
    transformed.x += sin(time + position.y) * 0.5 * waveFactor;
    transformed.y += cos(time + position.z) * 0.15 * waveFactor;
    transformed.z += sin(time + position.x) * waveFactor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }`;

  const fragmentShader = `
  varying vec2 vUv;
  uniform float uTime;
  uniform sampler2D uTexture;
  void main() {
    float time = uTime;
    vec2 pos = vUv;
    float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;
    float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;
    float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;
    float a = texture2D(uTexture, pos).a;
    gl_FragColor = vec4(r, g, b, a);
  }`;

  function map(n, start, stop, start2, stop2) {
    return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
  }

  class AsciiFilter {
    constructor(renderer, { fontSize, fontFamily, charset, invert } = {}) {
      this.renderer = renderer;
      this.domElement = document.createElement('div');
      Object.assign(this.domElement.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%'
      });
      this.pre = document.createElement('pre');
      this.domElement.appendChild(this.pre);
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.domElement.appendChild(this.canvas);
      this.deg = 0;
      this.invert = invert ?? true;
      this.fontSize = fontSize ?? 12;
      this.fontFamily = fontFamily ?? "'Courier New', monospace";
      this.charset = charset ?? " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
      this.context.imageSmoothingEnabled = false;
      this.onMouseMove = this.onMouseMove.bind(this);
      document.addEventListener('mousemove', this.onMouseMove);
    }
    setSize(width, height) {
      this.width = width; this.height = height;
      this.renderer.setSize(width, height);
      this.reset();
      this.center = { x: width / 2, y: height / 2 };
      this.mouse = { x: this.center.x, y: this.center.y };
    }
    reset() {
      this.context.font = `${this.fontSize}px ${this.fontFamily}`;
      const charWidth = this.context.measureText('A').width;
      this.cols = Math.floor(this.width / (this.fontSize * (charWidth / this.fontSize)));
      this.rows = Math.floor(this.height / this.fontSize);
      this.canvas.width = this.cols;
      this.canvas.height = this.rows;
      const p = this.pre.style;
      p.fontFamily = this.fontFamily;
      p.fontSize = `${this.fontSize}px`;
      p.margin = '0'; p.padding = '0'; p.lineHeight = '1em';
      p.position = 'absolute'; p.left = '50%'; p.top = '50%';
      p.transform = 'translate(-50%, -50%)'; p.zIndex = '9';
      p.backgroundAttachment = 'fixed'; p.mixBlendMode = 'difference';
    }
    render(scene, camera) {
      this.renderer.render(scene, camera);
      const w = this.canvas.width, h = this.canvas.height;
      this.context.clearRect(0, 0, w, h);
      if (w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
      this.asciify(this.context, w, h);
      this.hue();
    }
    onMouseMove(e) { this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO }; }
    get dx() { return this.mouse.x - this.center.x; }
    get dy() { return this.mouse.y - this.center.y; }
    hue() {
      const deg = (Math.atan2(this.dy, this.dx) * 180) / Math.PI;
      this.deg += (deg - this.deg) * 0.075;
      this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
    }
    asciify(ctx, w, h) {
      if (!(w && h)) return;
      const imgData = ctx.getImageData(0, 0, w, h).data;
      let str = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = x * 4 + y * 4 * w;
          const r = imgData[i], g = imgData[i+1], b = imgData[i+2], a = imgData[i+3];
          if (a === 0) { str += ' '; continue; }
          const gray = (0.3*r + 0.6*g + 0.1*b) / 255;
          let idx = Math.floor((1 - gray) * (this.charset.length - 1));
          if (this.invert) idx = this.charset.length - idx - 1;
          str += this.charset[idx];
        }
        str += '\n';
      }
      this.pre.innerHTML = str;
    }
    dispose() {
      document.removeEventListener('mousemove', this.onMouseMove);
    }
  }

  class CanvasTxt {
    constructor(txt, { fontSize = 200, fontFamily = 'IBM Plex Mono', color = '#fdf9f3' } = {}) {
      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
      this.txt = txt; this.fontSize = fontSize; this.fontFamily = fontFamily; this.color = color;
      this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
    }
    resize() {
      this.context.font = this.font;
      const metrics = this.context.measureText(this.txt);
      const textWidth = Math.ceil(metrics.width) + 20;
      const textHeight = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) + 20;
      this.canvas.width = textWidth; this.canvas.height = textHeight;
    }
    render() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.fillStyle = this.color; this.context.font = this.font;
      const metrics = this.context.measureText(this.txt);
      const yPos = 10 + metrics.actualBoundingBoxAscent;
      this.context.fillText(this.txt, 10, yPos);
    }
    get width(){ return this.canvas.width; }
    get height(){ return this.canvas.height; }
    get texture(){ return this.canvas; }
  }

  class CanvAscii {
    constructor({ text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves }, containerElem, width, height) {
      this.textString = text;
      this.asciiFontSize = asciiFontSize;
      this.textFontSize = textFontSize;
      this.textColor = textColor;
      this.planeBaseHeight = planeBaseHeight;
      this.container = containerElem;
      this.width = width; this.height = height;
      this.enableWaves = enableWaves;

      this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 1000);
      this.camera.position.z = 30;
      this.scene = new THREE.Scene();
      this.mouse = { x: 0, y: 0 };
      this.onMouseMove = this.onMouseMove.bind(this);
      this.setMesh();
      this.setRenderer();
    }
    setMesh() {
      this.textCanvas = new CanvasTxt(this.textString, { fontSize: this.textFontSize, fontFamily: 'IBM Plex Mono', color: this.textColor });
      this.textCanvas.resize();
      this.textCanvas.render();
      this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
      this.texture.minFilter = THREE.NearestFilter;
      const textAspect = this.textCanvas.width / this.textCanvas.height;
      const baseH = this.planeBaseHeight;
      const planeW = baseH * textAspect; const planeH = baseH;
      this.geometry = new THREE.PlaneGeometry(planeW, planeH, 36, 36);
      this.material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true, uniforms: { uTime: { value: 0 }, uTexture: { value: this.texture }, uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 } } });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
    }
    setRenderer() {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
      this.filter = new AsciiFilter(this.renderer, { fontFamily: 'IBM Plex Mono', fontSize: this.asciiFontSize, invert: true });
      this.container.appendChild(this.filter.domElement);
      this.setSize(this.width, this.height);
      this.container.addEventListener('mousemove', this.onMouseMove);
      this.container.addEventListener('touchmove', this.onMouseMove);
    }
    setSize(w, h){
      this.width = w; this.height = h;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.filter.setSize(w, h);
      this.center = { x: w/2, y: h/2 };
    }
    load(){ this.animate(); }
    onMouseMove(evt){ const e = evt.touches ? evt.touches[0] : evt; const bounds = this.container.getBoundingClientRect(); const x = e.clientX - bounds.left; const y = e.clientY - bounds.top; this.mouse = { x, y }; }
    animate(){ const animateFrame = () => { this.animationFrameId = requestAnimationFrame(animateFrame); this.render(); }; animateFrame(); }
    render(){ const time = Date.now() * 0.001; this.textCanvas.render(); this.texture.needsUpdate = true; this.mesh.material.uniforms.uTime.value = Math.sin(time); this.updateRotation(); this.filter.render(this.scene, this.camera); }
    updateRotation(){ const x = map(this.mouse.y, 0, this.height, 0.5, -0.5); const y = map(this.mouse.x, 0, this.width, -0.5, 0.5); this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05; this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05; }
    clear(){ this.scene.traverse((obj)=>{ if (obj.isMesh && obj.material) { const m=obj.material; Object.keys(m).forEach(k=>{ const v=m[k]; if (v && typeof v.dispose==='function') v.dispose(); }); m.dispose(); obj.geometry && obj.geometry.dispose(); }}); this.scene.clear(); }
    dispose(){ cancelAnimationFrame(this.animationFrameId); this.filter.dispose(); if (this.container.contains(this.filter.domElement)) this.container.removeChild(this.filter.domElement); this.container.removeEventListener('mousemove', this.onMouseMove); this.container.removeEventListener('touchmove', this.onMouseMove); this.clear(); this.renderer.dispose(); }
  }

  window.initAsciiWelcome = function(containerElem, opts){
    const options = Object.assign({
      text: "Welcome to Mohammed Reza's CV",
      asciiFontSize: 8,
      textFontSize: 200,
      textColor: '#fdf9f3',
      planeBaseHeight: 8,
      enableWaves: true
    }, opts || {});

    const rect = containerElem.getBoundingClientRect();
    const w = rect.width || containerElem.clientWidth || window.innerWidth;
    const h = rect.height || containerElem.clientHeight || window.innerHeight;

    const instance = new CanvAscii(options, containerElem, w, h);
    instance.load();

    const ro = 'ResizeObserver' in window ? new ResizeObserver((entries)=>{
      const r = entries[0]?.contentRect; if (!r) return; if (r.width>0 && r.height>0) instance.setSize(r.width, r.height);
    }) : null;
    if (ro) ro.observe(containerElem);

    return function dispose(){
      if (ro) ro.disconnect();
      instance.dispose();
    };
  };
})();
