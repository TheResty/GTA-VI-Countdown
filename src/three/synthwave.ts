/**
 * Hero-Szene: Synthwave-Fahrt nach Vice City.
 * Neon-Gitter-Landschaft mit Bergen, Straße, Palmen, gestreifter Sonne
 * und Sternenhimmel. Die Geschwindigkeit steigt mit der Eskalationsstufe.
 */
import * as THREE from 'three';

export interface SynthScene {
  setIntensity(v: number): void;
  setActive(active: boolean): void;
  setReducedMotion(v: boolean): void;
  hitSun(clientX: number, clientY: number): boolean;
  flash(): void;
  dispose(): void;
}

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}`;

function palmTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 384;
  const g = c.getContext('2d')!;
  g.fillStyle = '#12041f';
  g.strokeStyle = '#12041f';
  // Stamm: leicht gebogen, segmentiert
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const t = i / 25;
    const x = 128 + Math.sin(t * 2.2) * 26 * t;
    const y = 384 - t * 250;
    const w = 15 - t * 7;
    g.beginPath();
    g.ellipse(x, y, w, 7, 0, 0, Math.PI * 2);
    g.fill();
  }
  const topX = 128 + Math.sin(2.2) * 26;
  const topY = 134;
  // Wedel
  const fronds = [
    [-2.6, 120], [-2.15, 135], [-1.7, 120], [-1.25, 90], [-0.75, 95],
    [-0.35, 125], [0.2, 128], [0.55, 110], [-3.0, 95], [0.95, 85],
  ];
  for (const [ang, len] of fronds) {
    g.beginPath();
    g.moveTo(topX, topY);
    const ex = topX + Math.cos(ang) * len;
    const ey = topY + Math.sin(ang) * len * 0.55 + len * 0.45;
    const cx = topX + Math.cos(ang) * len * 0.5;
    const cy = topY + Math.sin(ang) * len * 0.5 - 22;
    g.quadraticCurveTo(cx, cy, ex, ey);
    g.lineWidth = 12;
    g.stroke();
    // Blattfiedern
    for (let k = 1; k < 9; k++) {
      const t = k / 9;
      const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * cx + t * t * ex;
      const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * cy + t * t * ey;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(ang + 1.3) * 18 * (1 - t * 0.5), py + 16);
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(ang - 1.3) * 18 * (1 - t * 0.5), py + 16);
      g.lineWidth = 4;
      g.stroke();
    }
  }
  g.beginPath();
  g.arc(topX, topY + 4, 12, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSynthwave(container: HTMLElement): SynthScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x07020f, 1);
  renderer.domElement.className = 'synth-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0x3a0b4a);
  scene.fog = new THREE.Fog(fogColor, 60, 270);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
  camera.position.set(0, 3.4, 14);

  /* Himmel ------------------------------------------------------------ */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uIntensity: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uIntensity; uniform float uFlash;
      varying vec3 vPos;
      void main(){
        float h = normalize(vPos).y;
        vec3 top = vec3(0.025, 0.008, 0.07);
        vec3 mid = vec3(0.24, 0.03, 0.34);
        vec3 hor = vec3(1.0, 0.34, 0.42);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.16, h));
        col = mix(col, top, smoothstep(0.14, 0.55, h));
        col = mix(vec3(0.05, 0.0, 0.09), col, smoothstep(-0.04, 0.0, h));
        col = mix(col, col * vec3(1.25, 0.75, 0.65), uIntensity * 0.55);
        col += vec3(1.0, 0.75, 0.45) * uFlash * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), skyMat));

  /* Sterne ------------------------------------------------------------ */
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 0.85);
    const r = 600;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 30;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    starPhase[i] = Math.random() * 6.28;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('phase', new THREE.BufferAttribute(starPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float phase; uniform float uTime; uniform float uPixel; varying float vA;
      void main(){
        vA = 0.45 + 0.55 * sin(uTime * 1.7 + phase);
        gl_PointSize = (1.2 + 1.3 * fract(phase * 3.1)) * uPixel;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vA;
      void main(){ vec2 c = gl_PointCoord - 0.5; if (length(c) > 0.5) discard; gl_FragColor = vec4(1.0, 0.92, 1.0, vA); }`,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* Sonne ------------------------------------------------------------- */
  const sunMat = new THREE.ShaderMaterial({
    transparent: true,
    fog: false,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uIntensity; varying vec2 vUv;
      void main(){
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        if (r > 1.0) discard;
        float y = vUv.y;
        vec3 top = vec3(1.0, 0.88, 0.3);
        vec3 mid = vec3(1.0, 0.45, 0.25);
        vec3 bot = vec3(1.0, 0.12, 0.55);
        vec3 col = mix(bot, mid, smoothstep(0.05, 0.5, y));
        col = mix(col, top, smoothstep(0.45, 0.95, y));
        float bands = 11.0;
        float t = fract(y * bands + uTime * (0.12 + uIntensity * 0.5));
        float gap = smoothstep(0.58, 0.02, y) * 0.62;
        if (y < 0.58 && t < gap) discard;
        float edge = smoothstep(1.0, 0.985, r);
        gl_FragColor = vec4(col * (1.0 + uIntensity * 0.25), edge);
      }`,
  });
  const SUN_SIZE = 120;
  const sun = new THREE.Mesh(new THREE.PlaneGeometry(SUN_SIZE, SUN_SIZE), sunMat);
  sun.position.set(0, 34, -420);
  scene.add(sun);
  const glowTex = glowTexture('rgba(255,120,150,0.85)', 'rgba(255,60,140,0.28)');
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  sunGlow.scale.set(380, 380, 1);
  sunGlow.position.set(0, 34, -430);
  scene.add(sunGlow);

  /* Landschaft -------------------------------------------------------- */
  const terrainGeo = new THREE.PlaneGeometry(260, 320, 130, 160);
  terrainGeo.rotateX(-Math.PI / 2);
  terrainGeo.translate(0, 0, -140);
  const terrainMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: {
      uOffset: { value: 0 },
      uIntensity: { value: 0 },
      uFog: { value: fogColor },
      uLineA: { value: new THREE.Color(0xff2e97) },
      uLineB: { value: new THREE.Color(0x19f0ff) },
    },
    vertexShader: /* glsl */ `
      uniform float uOffset;
      varying vec2 vGrid; varying float vH; varying float vDepth; varying float vX;
      ${NOISE_GLSL}
      void main(){
        vec3 pos = position;
        vec2 q = vec2(pos.x, pos.z - uOffset);
        float ax = abs(pos.x);
        float side = smoothstep(10.0, 34.0, ax);
        float n = noise(q * 0.045) * 0.62 + noise(q * 0.11) * 0.28 + noise(q * 0.27) * 0.1;
        float hgt = side * pow(n, 1.35) * (14.0 + ax * 0.28);
        pos.y += hgt;
        vGrid = q; vH = hgt; vX = pos.x;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform vec3 uLineA; uniform vec3 uLineB; uniform float uIntensity;
      varying vec2 vGrid; varying float vH; varying float vDepth; varying float vX;
      void main(){
        vec2 g = vGrid / 4.0;
        vec2 w = fwidth(g);
        vec2 grid = abs(fract(g - 0.5) - 0.5) / max(w, vec2(0.0001));
        float line = 1.0 - min(min(grid.x, grid.y), 1.0);
        float hN = clamp(vH / 16.0, 0.0, 1.0);
        vec3 base = mix(vec3(0.035, 0.0, 0.07), vec3(0.16, 0.02, 0.22), hN);
        vec3 lc = mix(uLineB, uLineA, smoothstep(0.0, 0.5, hN) * 0.85 + 0.15);
        vec3 col = base + lc * line * (0.9 + uIntensity * 0.9);
        float ax = abs(vX);
        if (ax < 3.4) {
          col = vec3(0.025, 0.0, 0.05);
          float edge = 1.0 - smoothstep(0.0, 0.14, abs(ax - 3.1));
          col += uLineB * edge * 1.6;
          float dash = step(0.55, fract(vGrid.y * 0.09)) * (1.0 - smoothstep(0.0, 0.12, ax));
          col += vec3(1.0, 0.78, 0.3) * dash;
        }
        float f = smoothstep(55.0, 270.0, vDepth);
        col = mix(col, uFog, f);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(terrainGeo, terrainMat));

  /* Palmen ------------------------------------------------------------ */
  const palmTex = palmTexture();
  const palms: { sprite: THREE.Sprite; base: number }[] = [];
  const PALM_SPACING = 21;
  const PALM_COUNT = 12;
  const PALM_RANGE = PALM_SPACING * PALM_COUNT;
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < PALM_COUNT; i++) {
      const mat = new THREE.SpriteMaterial({ map: palmTex, transparent: true, fog: true, depthWrite: false });
      const sp = new THREE.Sprite(mat);
      sp.center.set(0.5, 0);
      const s = 8 + Math.random() * 4;
      sp.scale.set(s * 0.67 * (side < 0 ? -1 : 1), s, 1);
      sp.position.x = side * (6.5 + Math.random() * 2.5);
      palms.push({ sprite: sp, base: i * PALM_SPACING + (side > 0 ? PALM_SPACING / 2 : 0) });
      scene.add(sp);
    }
  }

  /* Zustand & Loop ---------------------------------------------------- */
  let intensity = 0;
  let active = true;
  let reduced = false;
  let raf = 0;
  let last = performance.now();
  let offset = 0;
  let time = 0;
  let flash = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Auf schmalen Bildschirmen weiter herauszoomen, damit die Sonne sichtbar bleibt
    camera.fov = w / h < 0.8 ? 78 : w / h < 1.2 ? 68 : 60;
    camera.updateProjectionMatrix();
    if (reduced) render(0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function render(dt: number): void {
    time += dt;
    const speed = 7 + intensity * 38;
    offset += dt * speed;
    flash = Math.max(0, flash - dt * 1.4);
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.5);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.5);
    camera.position.x = pointer.x * 2.2;
    camera.position.y = 3.4 - pointer.y * 0.9 + Math.sin(time * 0.6) * 0.08;
    camera.lookAt(pointer.x * 4, 9.5, -120);

    terrainMat.uniforms.uOffset.value = offset;
    terrainMat.uniforms.uIntensity.value = intensity;
    sunMat.uniforms.uTime.value = time;
    sunMat.uniforms.uIntensity.value = intensity;
    skyMat.uniforms.uIntensity.value = intensity;
    skyMat.uniforms.uFlash.value = flash;
    starMat.uniforms.uTime.value = time;
    const pulse = 1 + Math.sin(time * (1.2 + intensity * 5)) * 0.04 * (0.4 + intensity);
    sunGlow.scale.set(380 * pulse, 380 * pulse, 1);

    for (const p of palms) {
      const z = -250 + ((p.base + offset) % PALM_RANGE);
      p.sprite.position.z = z;
      // Kurz vor der Kamera ausblenden, damit keine riesigen Silhouetten das Bild verdecken
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, (2 - z) / 14));
    }
    renderer.render(scene, camera);
  }

  function loop(t: number): void {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    render(dt);
    raf = requestAnimationFrame(loop);
  }

  function startLoop(): void {
    cancelAnimationFrame(raf);
    if (!active) return;
    if (reduced) {
      render(0);
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const onVis = () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else startLoop();
  };
  document.addEventListener('visibilitychange', onVis);

  resize();
  render(0.016);
  startLoop();

  return {
    setIntensity(v) {
      intensity = Math.max(0, Math.min(1, v));
      if (reduced) render(0);
    },
    setActive(a) {
      if (a === active) return;
      active = a;
      if (a) startLoop();
      else cancelAnimationFrame(raf);
    },
    setReducedMotion(v) {
      reduced = v;
      startLoop();
    },
    hitSun(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect();
      const v = sun.position.clone().project(camera);
      const sx = rect.left + ((v.x + 1) / 2) * rect.width;
      const sy = rect.top + ((1 - v.y) / 2) * rect.height;
      const dist = camera.position.distanceTo(sun.position);
      const radiusPx = (SUN_SIZE / 2 / (dist * Math.tan((camera.fov * Math.PI) / 360))) * (rect.height / 2);
      return Math.hypot(clientX - sx, clientY - sy) < radiusPx;
    },
    flash() {
      flash = 1;
      if (reduced) render(0);
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
