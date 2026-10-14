/**
 * Zeittunnel 2.0: Jeder verbleibende Tag ist ein Ring aus 24 leuchtenden
 * Stundensegmenten (Schlaf, Schule, Freizeit), platziert am Ende des Tages.
 * Eine Lichtwelle läuft durch den Tunnel, die aktuelle Stunde pulsiert,
 * Tore markieren Schulstart, Zeitumstellung und Preload, am Ende wartet das
 * Release-Portal mit Partikelwirbel. Ohne Eingriff fliegt ein Autopilot.
 */
import * as THREE from 'three';

export interface TunnelDay {
  start: number;
  end: number;
  color: string;
  label: string;
  sub: string;
  /** Farbe je Stunde (24 Einträge, Wanduhrzeit) */
  hourColors: string[];
}

export interface TunnelGate {
  at: number;
  label: string;
  color: string;
  kind: 'school' | 'preload' | 'dst';
}

export interface TunnelScene {
  setData(days: TunnelDay[], gates: TunnelGate[], release: number): void;
  setNow(now: number): void;
  setFlight(days: number): void;
  getFlight(): number;
  setAutopilot(on: boolean): void;
  flyTo(days: number, ms?: number): void;
  onPick(cb: (day: number, hour: number) => void): void;
  setActive(active: boolean): void;
  setReducedMotion(v: boolean): void;
  dispose(): void;
}

const SPACING = 7;
const DAY = 86_400_000;
const R = 4;
const SEG_ARC = ((Math.PI * 2) / 24) * 0.8;

function pathAt(z: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(Math.sin(z * 0.03) * 2.2, Math.cos(z * 0.021) * 1.4, z);
}

function portalTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,248,220,1)');
  grad.addColorStop(0.3, 'rgba(255,170,90,0.95)');
  grad.addColorStop(0.65, 'rgba(255,46,151,0.55)');
  grad.addColorStop(1, 'rgba(255,46,151,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.font = '400 230px Anton, Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(30, 6, 40, 0.92)';
  g.fillText('VI', 256, 272);
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
  const small = window.innerWidth < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'tunnel-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const fogA = new THREE.Color(0x0a0318);
  const fogB = new THREE.Color(0x2a0a1e);
  scene.fog = new THREE.Fog(fogA.clone(), 18, 140);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);

  /* Ringe (Instanced) --------------------------------------------- */
  const MAX_DAYS = 400;
  const segGeo = new THREE.TorusGeometry(R, 0.09, 5, 10, SEG_ARC);
  const haloGeo = new THREE.TorusGeometry(R, 0.32, 5, 10, SEG_ARC);
  const baseGeo = new THREE.TorusGeometry(R + 0.55, 0.03, 4, 120);
  const segMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  const baseMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, fog: true });
  const segMesh = new THREE.InstancedMesh(segGeo, segMat, MAX_DAYS * 24);
  const haloMesh = new THREE.InstancedMesh(haloGeo, haloMat, MAX_DAYS * 24);
  const baseMesh = new THREE.InstancedMesh(baseGeo, baseMat, MAX_DAYS);
  for (const m of [segMesh, haloMesh, baseMesh]) {
    m.count = 0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
  }
  // Unsichtbare, dicke Trefferfläche für Klicks – Matrizen werden erst beim Klick übernommen
  const pickMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(R, 0.95, 4, 6, (Math.PI * 2) / 24), new THREE.MeshBasicMaterial({ visible: false }), MAX_DAYS * 24);
  pickMesh.count = 0;
  // Die Ringe schauen zur Kamera: 00 Uhr oben, die Stunden laufen im Uhrzeigersinn
  const rotZ = Array.from({ length: 24 }, (_, hIdx) => new THREE.Matrix4().makeRotationZ(Math.PI / 2 - ((hIdx + 0.5) / 24) * Math.PI * 2 - SEG_ARC / 2));
  const pickRot = new THREE.Matrix4().makeRotationZ((SEG_ARC - (Math.PI * 2) / 24) / 2);

  /* Tore ----------------------------------------------------------- */
  const gateGroup = new THREE.Group();
  scene.add(gateGroup);
  const gateMeshes: { gate: TunnelGate; obj: THREE.Group; tag: HTMLElement; beam?: THREE.Points }[] = [];

  function buildGate(gate: TunnelGate): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(gate.color), fog: true });
    const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(gate.color), transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
    const s = 5.6;
    const bar = (w: number, hgt: number, x: number, y: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hgt, 0.12), mat);
      m.position.set(x, y, 0);
      const gl = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, hgt + 0.5, 0.05), glow);
      gl.position.set(x, y, 0);
      g.add(m, gl);
    };
    if (gate.kind === 'dst') {
      // Raute für die Zeitumstellung
      const ring = new THREE.Mesh(new THREE.TorusGeometry(s, 0.1, 4, 4), mat);
      ring.rotation.z = Math.PI / 4;
      g.add(ring);
    } else {
      bar(s * 2, 0.16, 0, s);
      bar(s * 2, 0.16, 0, -s);
      bar(0.16, s * 2, s, 0);
      bar(0.16, s * 2, -s, 0);
      if (gate.kind === 'preload') {
        bar(s * 2, 0.08, 0, s - 0.6);
        bar(s * 2, 0.08, 0, -s + 0.6);
      }
    }
    return g;
  }

  /* Portal --------------------------------------------------------- */
  const portal = new THREE.Group();
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(4.75, 0.3, 12, 160), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
  const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(4.4, 64), new THREE.MeshBasicMaterial({ map: portalTexture(), transparent: true, depthWrite: false }));
  const orbit: THREE.Mesh[] = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(6 + i * 1.1, 0.05, 6, 140), new THREE.MeshBasicMaterial({ color: i === 1 ? 0x19f0ff : 0xff2e97, transparent: true, opacity: 0.7 }));
    portal.add(m);
    return m;
  });
  portal.add(portalRing, portalDisc);
  const vCount = small ? 260 : 600;
  const vPos = new Float32Array(vCount * 3);
  const vState = Array.from({ length: vCount }, () => ({ a: Math.random() * Math.PI * 2, r: 2 + Math.random() * 9, s: 0.3 + Math.random() * 0.8 }));
  const vGeo = new THREE.BufferGeometry();
  vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  const vortex = new THREE.Points(vGeo, new THREE.PointsMaterial({ color: 0xffc070, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  portal.add(vortex);
  scene.add(portal);

  /* Strom-Partikel -------------------------------------------------- */
  const pCount = small ? 260 : 520;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.2 + Math.random() * 7;
    pPos[i * 3] = Math.cos(a) * r;
    pPos[i * 3 + 1] = Math.sin(a) * r;
    pPos[i * 3 + 2] = -Math.random() * 260;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xff8fd0, size: 0.06, transparent: true, opacity: 0.75 }));
  scene.add(particles);

  /* Zustand -------------------------------------------------------- */
  let days: (TunnelDay & { base: THREE.Color; hours: THREE.Color[]; tag: HTMLElement })[] = [];
  let release = Date.now() + 30 * DAY;
  let now = Date.now();
  let flight = 0;
  let autopilot = true;
  let apPhase: 'cruise' | 'hold' | 'rewind' = 'cruise';
  let apTimer = 0;
  let flyAnim: { from: number; to: number; t0: number; dur: number } | null = null;
  let active = true;
  let reduced = false;
  let raf = 0;
  let last = performance.now();
  let time = 0;
  let pickCb: ((d: number, h: number) => void) | null = null;
  const maxFlight = () => Math.max(0.01, (release - now) / DAY - 0.35);

  const zFor = (t: number) => -((t - now) / DAY) * SPACING;
  const tmpV = new THREE.Vector3();
  const tmpV2 = new THREE.Vector3();
  const dayMat = new THREE.Matrix4();
  const segM = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const lookM = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  const dim = new THREE.Color(0x1a0f2a);

  function resize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 84 : 70;
    camera.updateProjectionMatrix();
    if (reduced || !active) render(0);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function orient(pos: THREE.Vector3, z: number): void {
    pathAt(z + 1, tmpV2);
    lookM.lookAt(tmpV2, pos, up);
    quat.setFromRotationMatrix(lookM);
  }

  function updateAutopilot(dt: number): void {
    if (flyAnim) {
      const k = Math.min(1, (performance.now() - flyAnim.t0) / flyAnim.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      flight = flyAnim.from + (flyAnim.to - flyAnim.from) * e;
      if (k >= 1) flyAnim = null;
      return;
    }
    if (!autopilot || reduced) return;
    const mf = maxFlight();
    if (apPhase === 'cruise') {
      // langsamer in der Nähe von heute, schneller dazwischen, langsam vor dem Portal
      const nearEnd = Math.min(1, (mf - flight) / 3);
      const speed = 0.43 + 0.9 * Math.max(0, Math.min(1, flight / 2)) * Math.max(0, nearEnd);
      flight = Math.max(0, Math.min(mf, flight + dt * speed));
      if (flight >= mf - 0.001) {
        apPhase = 'hold';
        apTimer = 3.2;
      }
    } else if (apPhase === 'hold') {
      apTimer -= dt;
      if (apTimer <= 0) {
        apPhase = 'rewind';
        flyAnim = { from: flight, to: 0, t0: performance.now(), dur: 2600 };
        apPhase = 'cruise';
      }
    }
  }

  function render(dt: number): void {
    time += dt;
    updateAutopilot(dt);
    const camZ = 5 - flight * SPACING;
    pathAt(camZ, camera.position);
    pathAt(camZ - 14, tmpV);
    camera.lookAt(tmpV);
    camera.rotation.z += Math.sin(time * 0.25) * 0.02;

    const fogT = Math.min(1, flight / Math.max(1, maxFlight()));
    (scene.fog as THREE.Fog).color.copy(fogA).lerp(fogB, fogT);

    // Lichtwelle läuft von der Kamera Richtung Portal
    const waveZ = camZ - ((time * 22) % 160);
    const portalZ = zFor(release);

    let si = 0;
    days.forEach((d, di) => {
      const z = zFor(d.end);
      pathAt(z, tmpV);
      orient(tmpV, z);
      dayMat.compose(tmpV, quat, one);
      baseMesh.setMatrixAt(di, dayMat);
      const ahead = camZ - z;
      baseMesh.setColorAt(di, col.copy(d.base).multiplyScalar(ahead < -2 ? 0.15 : 1));
      const wave = Math.exp(-((z - waveZ) ** 2) / 18);
      for (let hr = 0; hr < 24; hr++) {
        segM.multiplyMatrices(dayMat, rotZ[hr]);
        segMesh.setMatrixAt(si, segM);
        haloMesh.setMatrixAt(si, segM);
        const hStart = d.start + hr * 3_600_000;
        const past = hStart + 3_600_000 <= now;
        const current = now >= hStart && now < hStart + 3_600_000;
        if (past) col.copy(dim);
        else {
          col.copy(d.hours[hr]);
          const pulse = current ? 0.55 + 0.45 * Math.sin(time * 6) : 0.75;
          col.multiplyScalar(pulse + wave * 0.9);
        }
        segMesh.setColorAt(si, col);
        haloMesh.setColorAt(si, col.multiplyScalar(past ? 0.2 : 0.35 + wave * 0.6));
        si++;
      }
    });
    segMesh.count = haloMesh.count = si;
    baseMesh.count = days.length;
    segMesh.instanceMatrix.needsUpdate = haloMesh.instanceMatrix.needsUpdate = baseMesh.instanceMatrix.needsUpdate = true;
    if (segMesh.instanceColor) segMesh.instanceColor.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;
    if (baseMesh.instanceColor) baseMesh.instanceColor.needsUpdate = true;

    // Tore
    for (const g of gateMeshes) {
      const z = zFor(g.gate.at);
      pathAt(z, g.obj.position);
      orient(g.obj.position, z);
      g.obj.quaternion.copy(quat);
      g.obj.rotation.z += Math.sin(time * 0.8 + z) * 0.03;
      if (g.beam) {
        const arr = g.beam.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] -= dt * 4;
          if (arr[i + 1] < -5) arr[i + 1] = 5;
        }
        g.beam.geometry.attributes.position.needsUpdate = true;
      }
    }

    // Portal
    pathAt(portalZ - 0.6, portal.position);
    orient(portal.position, portalZ);
    portal.quaternion.copy(quat);
    portalRing.rotation.z += dt * 0.5;
    orbit.forEach((m, i) => {
      m.rotation.x = Math.sin(time * (0.4 + i * 0.2)) * 0.6;
      m.rotation.y = Math.cos(time * (0.3 + i * 0.15)) * 0.6;
    });
    for (let i = 0; i < vCount; i++) {
      const v = vState[i];
      v.a += dt * v.s * (2 + 6 / v.r);
      v.r -= dt * v.s * 1.6;
      if (v.r < 0.4) v.r = 9 + Math.random() * 2;
      vPos[i * 3] = Math.cos(v.a) * v.r;
      vPos[i * 3 + 1] = Math.sin(v.a) * v.r;
      vPos[i * 3 + 2] = Math.sin(v.a * 2) * 0.3 - (9 - v.r) * 0.15;
    }
    vGeo.attributes.position.needsUpdate = true;

    // Partikel
    const arr = pGeo.attributes.position.array as Float32Array;
    const speed = autopilot && !flyAnim ? 26 : 12;
    for (let i = 0; i < pCount; i++) {
      arr[i * 3 + 2] += dt * speed;
      if (arr[i * 3 + 2] > camZ + 3) arr[i * 3 + 2] = camZ - 180 - Math.random() * 60;
      if (arr[i * 3 + 2] < camZ - 260) arr[i * 3 + 2] = camZ - Math.random() * 200;
    }
    pGeo.attributes.position.needsUpdate = true;
    pathAt(camZ - 40, tmpV);
    particles.position.set(tmpV.x * 0.5, tmpV.y * 0.5, 0);

    renderer.render(scene, camera);
    placeLabels(camZ);
  }

  const proj = new THREE.Vector3();
  function placeLabels(camZ: number): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const placed: { x: number; y: number }[] = [];
    const place = (tag: HTMLElement, z: number, yOff: number, maxAhead: number): boolean => {
      const ahead = camZ - z;
      if (ahead < 2.5 || ahead > maxAhead) {
        tag.hidden = true;
        return false;
      }
      pathAt(z, proj);
      proj.y += yOff;
      proj.project(camera);
      if (proj.z > 1) {
        tag.hidden = true;
        return false;
      }
      const x = ((proj.x + 1) / 2) * w;
      const y = ((1 - proj.y) / 2) * h;
      if (placed.some((p) => Math.abs(p.y - y) < 44 && Math.abs(p.x - x) < 130)) {
        tag.hidden = true;
        return false;
      }
      placed.push({ x, y });
      tag.hidden = false;
      const scale = Math.max(0.6, Math.min(1.1, 14 / ahead));
      tag.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${scale})`;
      tag.style.opacity = String(Math.max(0, Math.min(1, 1.5 - ahead / 45)));
      return true;
    };
    for (const g of gateMeshes) place(g.tag, zFor(g.gate.at), -6.6, 70);
    let shown = 0;
    for (const d of days) {
      if (shown >= 4) {
        d.tag.hidden = true;
        continue;
      }
      if (place(d.tag, zFor(d.end), 5.1, 40)) shown++;
    }
  }

  function loop(t: number): void {
    // rAF-Zeitstempel können älter sein als performance.now() beim Start → nie negativ
    const dt = Math.max(0, Math.min(0.05, (t - last) / 1000));
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

  // Klick auf einen Ring
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = { x: 0, y: 0 };
  renderer.domElement.addEventListener('pointerdown', (e) => (downAt = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const n = haloMesh.count;
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      haloMesh.getMatrixAt(i, m);
      pickMesh.setMatrixAt(i, m.multiply(pickRot));
    }
    pickMesh.count = n;
    pickMesh.boundingSphere = null;
    const hit = ray.intersectObject(pickMesh, false).sort((a, b) => a.distance - b.distance)[0];
    if (hit && hit.instanceId !== undefined && pickCb) {
      pickCb(Math.floor(hit.instanceId / 24), hit.instanceId % 24);
    }
  });

  resize();

  return {
    setData(list, gates, rel) {
      release = rel;
      for (const d of days) d.tag.remove();
      days = list.slice(0, MAX_DAYS).map((d) => {
        const tag = document.createElement('div');
        tag.className = 'tunnel__label';
        tag.hidden = true;
        tag.style.setProperty('--c', d.color);
        const b = document.createElement('b');
        b.textContent = d.label;
        const sm = document.createElement('small');
        sm.textContent = d.sub;
        tag.append(b, sm);
        labelLayer.appendChild(tag);
        return { ...d, base: new THREE.Color(d.color), hours: d.hourColors.map((c) => new THREE.Color(c)), tag };
      });
      for (const g of gateMeshes) {
        gateGroup.remove(g.obj);
        g.tag.remove();
      }
      gateMeshes.length = 0;
      for (const gate of gates) {
        const obj = buildGate(gate);
        let beam: THREE.Points | undefined;
        if (gate.kind === 'preload') {
          const n = 160;
          const pos = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * 3.2;
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = Math.random() * 10 - 5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          beam = new THREE.Points(geo, new THREE.PointsMaterial({ color: new THREE.Color(gate.color), size: 0.12, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
          obj.add(beam);
        }
        gateGroup.add(obj);
        const tag = document.createElement('div');
        tag.className = 'tunnel__label tunnel__label--gate';
        tag.hidden = true;
        tag.style.setProperty('--c', gate.color);
        const b = document.createElement('b');
        b.textContent = gate.label;
        tag.append(b);
        labelLayer.appendChild(tag);
        gateMeshes.push({ gate, obj, tag, beam });
      }
      render(0);
    },
    setNow(n) {
      now = n;
    },
    setFlight(d) {
      flyAnim = null;
      flight = Math.max(0, Math.min(maxFlight(), d));
      if (reduced || !active) render(0);
    },
    getFlight() {
      return flight;
    },
    setAutopilot(on) {
      autopilot = on;
      apPhase = 'cruise';
    },
    flyTo(d, ms = 1600) {
      flyAnim = { from: flight, to: Math.max(0, Math.min(maxFlight(), d)), t0: performance.now(), dur: reduced ? 1 : ms };
      if (reduced) {
        flight = flyAnim.to;
        flyAnim = null;
        render(0);
      }
    },
    onPick(cb) {
      pickCb = cb;
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
      days.forEach((d) => d.tag.remove());
      gateMeshes.forEach((g) => g.tag.remove());
    },
  };
}
