/**
 * Zeittunnel: Jeder verbleibende Tag ist ein Neon-Ring. Die Tiefe im Raum
 * entspricht der Zeit – am Ende wartet das Release-Portal.
 */
import * as THREE from 'three';

export interface TunnelRing {
  at: number; // Zeitpunkt (ms) des Tagesbeginns
  color: string;
  label: string;
  sub: string;
  major?: boolean;
}

export interface TunnelScene {
  setRings(rings: TunnelRing[], release: number): void;
  /** Flugposition in Tagen ab „jetzt“ */
  setFlight(days: number): void;
  setNow(now: number): void;
  setActive(active: boolean): void;
  setReducedMotion(v: boolean): void;
  dispose(): void;
}

const SPACING = 7; // Welteinheiten pro Tag
const DAY = 86_400_000;

function pathAt(z: number): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(z * 0.03) * 2.2, Math.cos(z * 0.021) * 1.4, z);
}

function portalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.35, 'rgba(255,140,80,0.9)');
  grad.addColorStop(0.7, 'rgba(255,46,151,0.55)');
  grad.addColorStop(1, 'rgba(255,46,151,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.font = '700 220px Anton, Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(30, 6, 40, 0.9)';
  g.fillText('VI', 256, 270);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createTunnel(container: HTMLElement, labelLayer: HTMLElement): TunnelScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'tunnel-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0318, 20, 150);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);

  const ringGeo = new THREE.TorusGeometry(4, 0.045, 6, 120);
  const majorGeo = new THREE.TorusGeometry(4.15, 0.11, 8, 140);
  const group = new THREE.Group();
  scene.add(group);

  // Portal
  const portalGroup = new THREE.Group();
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.28, 12, 160), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  const portalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(4.3, 64),
    new THREE.MeshBasicMaterial({ map: portalTexture(), transparent: true, depthWrite: false }),
  );
  portalGroup.add(portalRing, portalDisc);
  scene.add(portalGroup);

  // Partikel (Geschwindigkeits-Streifen)
  const pCount = 500;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.5 + Math.random() * 6;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = Math.sin(a) * r;
    pPos[i * 3 + 2] = -Math.random() * 300;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xff8fd0, size: 0.06, transparent: true, opacity: 0.7 }));
  scene.add(particles);

  let rings: (TunnelRing & { mesh: THREE.Mesh; tag: HTMLElement })[] = [];
  let release = 0;
  let now = Date.now();
  let flight = 0;
  let active = true;
  let reduced = false;
  let raf = 0;
  let last = performance.now();
  const materials = new Map<string, THREE.MeshBasicMaterial>();

  function mat(color: string): THREE.MeshBasicMaterial {
    let m = materials.get(color);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.95 });
      materials.set(color, m);
    }
    return m;
  }

  function zFor(t: number): number {
    return -((t - now) / DAY) * SPACING;
  }

  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 82 : 70;
    camera.updateProjectionMatrix();
    if (reduced || !active) render(0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const tmp = new THREE.Vector3();
  function render(dt: number): void {
    const camZ = 6 - flight * SPACING;
    const camPos = pathAt(camZ);
    camera.position.copy(camPos);
    camera.lookAt(pathAt(camZ - 14));

    for (const r of rings) {
      const z = zFor(r.at);
      r.mesh.position.copy(pathAt(z));
      r.mesh.lookAt(pathAt(z + 1));
    }
    const pz = zFor(release);
    portalGroup.position.copy(pathAt(pz));
    portalGroup.lookAt(pathAt(pz + 1));
    portalRing.rotation.z += dt * 0.4;

    // Partikel strömen auf die Kamera zu
    const arr = pGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < pCount; i++) {
      arr[i * 3 + 2] += dt * 18;
      if (arr[i * 3 + 2] > camZ + 2) arr[i * 3 + 2] = camZ - 200 - Math.random() * 60;
      if (arr[i * 3 + 2] < camZ - 260) arr[i * 3 + 2] = camZ - Math.random() * 200;
    }
    pGeo.attributes.position.needsUpdate = true;
    const center = pathAt(camZ - 40);
    particles.position.set(center.x * 0.5, center.y * 0.5, 0);

    renderer.render(scene, camera);
    placeLabels(camZ);
  }

  function placeLabels(camZ: number): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    let shown = 0;
    const placed: { x: number; y: number }[] = [];
    for (const r of rings) {
      const z = zFor(r.at);
      const ahead = camZ - z;
      if (ahead < 3 || ahead > 40 || shown >= 4) {
        r.tag.hidden = true;
        continue;
      }
      tmp.copy(pathAt(z));
      tmp.y += 4.6;
      tmp.project(camera);
      if (tmp.z > 1) {
        r.tag.hidden = true;
        continue;
      }
      const x = ((tmp.x + 1) / 2) * w;
      const y = ((1 - tmp.y) / 2) * h;
      if (placed.some((p) => Math.abs(p.y - y) < 46 && Math.abs(p.x - x) < 120)) {
        r.tag.hidden = true;
        continue;
      }
      placed.push({ x, y });
      r.tag.hidden = false;
      shown++;
      const scale = Math.max(0.55, Math.min(1.1, 14 / ahead));
      r.tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
      r.tag.style.opacity = String(Math.max(0, Math.min(1, 1.4 - ahead / 50)));
    }
  }

  function loop(t: number): void {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    render(dt);
    raf = requestAnimationFrame(loop);
  }
  function start(): void {
    cancelAnimationFrame(raf);
    if (!active) return;
    if (reduced) {
      render(0);
      return;
    }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  const onVis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
  document.addEventListener('visibilitychange', onVis);

  resize();

  return {
    setRings(list, rel) {
      release = rel;
      for (const r of rings) {
        group.remove(r.mesh);
        r.tag.remove();
      }
      rings = list.map((r) => {
        const mesh = new THREE.Mesh(r.major ? majorGeo : ringGeo, mat(r.color));
        group.add(mesh);
        const label = document.createElement('div');
        label.className = 'tunnel__label';
        label.hidden = true;
        label.style.setProperty('--c', r.color);
        label.innerHTML = '';
        const b = document.createElement('b');
        b.textContent = r.label;
        const sm = document.createElement('small');
        sm.textContent = r.sub;
        label.append(b, sm);
        labelLayer.appendChild(label);
        return { ...r, mesh, tag: label };
      });
      render(0);
    },
    setFlight(days) {
      flight = Math.max(0, days);
      if (reduced || !active) render(0);
    },
    setNow(n) {
      now = n;
    },
    setActive(a) {
      if (a === active) return;
      active = a;
      if (a) start();
      else cancelAnimationFrame(raf);
    },
    setReducedMotion(v) {
      reduced = v;
      start();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
      renderer.domElement.remove();
      rings.forEach((r) => r.tag.remove());
    },
  };
}
