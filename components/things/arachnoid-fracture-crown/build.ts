import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P2 = [number, number];

const PALETTES = {
  magellan: { plain: '#a8642a', high: '#d99a40', crack: '#4a1f08', bright: '#ffd884', flow: '#8a4c1e' },
  radar: { plain: '#55554f', high: '#93928a', crack: '#151513', bright: '#f0efe6', flow: '#3a3a35' },
  basalt: { plain: '#4a3e34', high: '#63523f', crack: '#17110c', bright: '#b09070', flow: '#3a3028' },
  sulfur: { plain: '#9a8044', high: '#c6ab5e', crack: '#4e3c1a', bright: '#f4e6aa', flow: '#7a6634' },
} as const;

interface Crown { x: number; z: number; r: number; centre: 'dome' | 'pit' | 'double' | 'nova' }

/** A raised ridge along a path on the ground, triangular in section, with width and height varying along it. */
function ridgeGeometry(path: readonly P2[], width: (t: number) => number, height: (t: number) => number, base: number) {
  const position: number[] = [], index: number[] = [];
  path.forEach(([x, z], i) => {
    const [px, pz] = path[Math.max(0, i - 1)], [nx, nz] = path[Math.min(path.length - 1, i + 1)];
    const length = Math.hypot(nx - px, nz - pz) || 1, ox = -(nz - pz) / length, oz = (nx - px) / length;
    const t = i / (path.length - 1), w = width(t), h = height(t);
    position.push(x + ox * w, base, z + oz * w, x, base + h, z, x - ox * w, base, z - oz * w);
    if (i) {
      const a = (i - 1) * 3, b = i * 3;
      index.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    legs: choice('What are its fracture legs like?', {
      spider: 'Six to nine long legs reaching far across the plain, unmistakably spidery.',
      sunburst: 'Twenty or more short straight cracks all round, like a sunburst or a crown of thorns.',
      branching: 'Legs that fork and fork again at their ends, like cracked glass.',
      webbed: 'Legs tied together by curving cross-fractures into a web.',
    }),
    centre: choice('What is at its heart?', {
      dome: 'A raised dome swelling up inside the ring.',
      pit: 'A sunken caldera, the ground fallen in inside the ring.',
      double: 'Two nested rings of fractures around a small knob.',
      nova: 'No centre at all: the cracks run right in to a single point, a star.',
    }),
    look: choice('How is it seen?', {
      magellan: 'As in the famous radar renderings: false-colour orange and gold.',
      radar: 'As a raw radar mosaic: grey, the fractures bright as chalk.',
      basalt: 'As it really is: dark basalt under an ochre haze.',
      sulfur: 'Pale and dusty, sulphur-yellow.',
    }),
    relief: choice('How strongly does it stand out?', {
      faint: 'Barely: a pattern pressed into the plain, best seen from orbit.',
      raised: 'Clearly: a raised crown and ridged legs.',
      dramatic: 'Exaggerated like a NASA render: a high crown and knife-edge ridges.',
    }),
    activity: choice('Is it alive?', {
      dormant: 'Long dead and still.',
      fresh: 'Freshly cracked: the fractures still glow with heat from below.',
      ancient: 'Ancient: softened, its legs half buried by younger flows.',
    }),
    company: choice('Is it alone?', {
      alone: 'Alone on the plain.',
      linked: 'A smaller sibling nearby, the two joined by shared cracks.',
      flows: 'Alone, but with dark lava flows spilling out between its legs.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.look];
    const R = 1000;
    const lift = { faint: 0.1, raised: 0.26, dramatic: 0.5 }[a.relief] * R;
    const fresh = a.activity === 'fresh', ancient = a.activity === 'ancient';
    const crowns: Crown[] = [{ x: 0, z: 0, r: R, centre: a.centre }];
    if (a.company === 'linked') {
      const t = random() * Math.PI * 2;
      crowns.push({ x: Math.cos(t) * R * 2.3, z: Math.sin(t) * R * 1.4, r: R * 0.55, centre: random() < 0.5 ? 'dome' : 'pit' });
    }
    const reach = { spider: 2.1, sunburst: 1.55, branching: 1.8, webbed: 1.7 }[a.legs];
    const minX = Math.min(...crowns.map((c) => c.x - c.r * reach)), maxX = Math.max(...crowns.map((c) => c.x + c.r * reach));
    const minZ = Math.min(...crowns.map((c) => c.z - c.r * reach)), maxZ = Math.max(...crowns.map((c) => c.z + c.r * reach));
    const half = Math.max(maxX - minX, maxZ - minZ) / 2 * 1.04, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;

    // ---- Legs: paths across the plain ------------------------------------------------------------
    interface Leg { path: P2[]; width: number; crown: Crown }
    const legs: Leg[] = [];
    const wander = (from: P2, angle: number, length: number, steps: number, sway: number): P2[] => {
      const path: P2[] = [from];
      let [x, z] = from, heading = angle;
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * sway;
        x += Math.cos(heading) * length / steps; z += Math.sin(heading) * length / steps;
        path.push([x, z]);
      }
      return path;
    };
    for (const crown of crowns) {
      const count = { spider: 6 + Math.floor(random() * 4), sunburst: 20 + Math.floor(random() * 8), branching: 8 + Math.floor(random() * 3), webbed: 9 + Math.floor(random() * 3) }[a.legs];
      const inner = crown.centre === 'nova' ? 0.04 : 0.62;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (random() - 0.5) * (Math.PI * 2 / count) * 0.6;
        const length = crown.r * (a.legs === 'sunburst' ? mix(0.55, 0.9, random()) : mix(0.9, reach - 0.65, random())) + crown.r * (0.62 - inner);
        const from: P2 = [crown.x + Math.cos(angle) * crown.r * inner, crown.z + Math.sin(angle) * crown.r * inner];
        const path = wander(from, angle, length, 12, a.legs === 'sunburst' ? 0.04 : 0.22);
        legs.push({ path, width: crown.r * (a.legs === 'sunburst' ? 0.04 : 0.06), crown });
        if (a.legs === 'branching') {
          for (const side of [-1, 1]) {
            const fork = path[8 + Math.floor(random() * 3)];
            const twig = wander(fork, angle + side * mix(0.35, 0.7, random()), crown.r * mix(0.35, 0.6, random()), 6, 0.3);
            legs.push({ path: twig, width: crown.r * 0.028, crown });
          }
        }
      }
    }
    if (a.company === 'linked') {
      const [m, n] = crowns;
      for (let k = 0; k < 3; k++) {
        const t = Math.atan2(n.z - m.z, n.x - m.x) + (k - 1) * 0.25;
        const from: P2 = [m.x + Math.cos(t) * m.r * 0.65, m.z + Math.sin(t) * m.r * 0.65];
        const distance = Math.hypot(n.x - from[0], n.z - from[1]) - n.r * 0.6;
        legs.push({ path: wander(from, Math.atan2(n.z - from[1], n.x - from[0]), distance, 10, 0.12), width: R * 0.04, crown: m });
      }
    }

    // ---- The top-down painting -------------------------------------------------------------------
    const size = 1536;
    const px = (x: number) => ((x - cx) / (2 * half) + 0.5) * size, pz = (z: number) => ((z - cz) / (2 * half) + 0.5) * size;
    const k = size / (2 * half);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d')!;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = fresh ? size : 4;
    const glow = glowCanvas.getContext('2d')!;
    glow.fillStyle = '#000'; glow.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
    g.fillStyle = pal.plain;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 6000; i++) {
      g.fillStyle = random() < 0.5 ? 'rgba(255,240,220,0.05)' : 'rgba(0,0,0,0.07)';
      g.fillRect(random() * size, random() * size, 2 + random() * 7, 2 + random() * 7);
    }
    if (a.company === 'flows' || ancient) {
      for (let i = 0; i < (ancient ? 10 : 7); i++) {
        const t = random() * Math.PI * 2, r0 = R * mix(0.8, 1.2, random());
        const x0 = px(Math.cos(t) * r0), y0 = pz(Math.sin(t) * r0), spread = R * k * mix(0.4, 0.9, random());
        g.fillStyle = a.company === 'flows' ? pal.crack : pal.flow;
        g.globalAlpha = a.company === 'flows' ? 0.6 : 0.5;
        g.beginPath();
        for (let j = 0; j <= 16; j++) { const u = t - 0.6 + (j / 16) * 1.2, rr = spread * Math.sin((j / 16) * Math.PI) * (0.6 + random() * 0.5); const x = x0 + Math.cos(u) * rr, y = y0 + Math.sin(u) * rr; j ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
    }
    const stroke = (points: readonly P2[], width: number, lit: boolean) => {
      for (const [w, colour, shift, alpha] of [[width, pal.crack, 0, 0.9], [Math.max(1.5, width * 0.35), pal.bright, width * 0.7, 0.55]] as const) {
        g.strokeStyle = colour; g.lineWidth = w; g.globalAlpha = alpha; g.lineCap = 'round';
        g.beginPath(); points.forEach(([x, z], i) => (i ? g.lineTo(px(x) + shift, pz(z) + shift) : g.moveTo(px(x) + shift, pz(z) + shift))); g.stroke();
      }
      g.globalAlpha = 1;
      if (fresh && lit) {
        glow.strokeStyle = '#ff7c22'; glow.lineWidth = width * 0.7; glow.lineCap = 'round';
        glow.beginPath(); points.forEach(([x, z], i) => (i ? glow.lineTo(px(x), pz(z)) : glow.moveTo(px(x), pz(z)))); glow.stroke();
      }
    };
    const crackScale = ancient ? 0.6 : 1;
    for (const crown of crowns) {
      // Raised crown: a lighter disc fading out at the ring.
      const disc = g.createRadialGradient(px(crown.x), pz(crown.z), crown.r * k * 0.1, px(crown.x), pz(crown.z), crown.r * k * 0.95);
      disc.addColorStop(0, crown.centre === 'pit' ? pal.flow : pal.high);
      disc.addColorStop(0.75, pal.high);
      disc.addColorStop(1, pal.plain);
      g.fillStyle = disc;
      g.beginPath(); g.arc(px(crown.x), pz(crown.z), crown.r * k * 0.95, 0, Math.PI * 2); g.fill();
      // Concentric ring fractures.
      const ringRadii = crown.centre === 'double' ? [0.32, 0.4, 0.62, 0.7, 0.78] : crown.centre === 'nova' ? [0.7] : [0.58, 0.66, 0.74, 0.82];
      for (const ring of ringRadii) {
        const points: P2[] = [];
        const wobble = random() * 6;
        for (let j = 0; j <= 80; j++) { const t = (j / 80) * Math.PI * 2, rr = crown.r * ring * (1 + Math.sin(t * 4 + wobble) * 0.02); points.push([crown.x + Math.cos(t) * rr, crown.z + Math.sin(t) * rr]); }
        stroke(points, Math.max(4, crown.r * k * 0.03 * crackScale), true);
      }
      if (crown.centre === 'pit') {
        g.fillStyle = pal.crack; g.globalAlpha = 0.55;
        g.beginPath(); g.arc(px(crown.x), pz(crown.z), crown.r * k * 0.4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      }
    }
    for (const leg of legs) stroke(leg.path, Math.max(3, leg.width * k * 0.75 * crackScale), true);
    if (a.legs === 'webbed') {
      // Cross-fractures between neighbouring legs of the main crown.
      const main = legs.filter((leg) => leg.crown === crowns[0] && leg.path.length === 13);
      main.forEach((leg, i) => {
        const next = main[(i + 1) % main.length];
        for (const step of [6, 10]) {
          const p = leg.path[step], q = next.path[step];
          const mid: P2 = [(p[0] + q[0]) / 2 * 1.06, (p[1] + q[1]) / 2 * 1.06];
          stroke([p, mid, q], Math.max(2, R * 0.02 * k), step === 6);
        }
      });
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const glowMap = new THREE.CanvasTexture(glowCanvas);
    glowMap.colorSpace = THREE.SRGBColorSpace;
    const surface = new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 3, roughness: 0.92, emissive: fresh ? '#ffffff' : '#000000', emissiveMap: fresh ? glowMap : null, emissiveIntensity: fresh ? mix(0.8, 1.6, mood.energy) : 0 });
    const planar = (geometry: THREE.BufferGeometry) => {
      const position = geometry.attributes.position;
      const uv = new Float32Array(position.count * 2);
      for (let i = 0; i < position.count; i++) {
        uv[i * 2] = (position.getX(i) - cx) / (2 * half) + 0.5;
        uv[i * 2 + 1] = 1 - ((position.getZ(i) - cz) / (2 * half) + 0.5);
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return geometry;
    };

    // ---- Ground patch ------------------------------------------------------------------------------
    const plateH = half * 0.012;
    const outline = new THREE.Shape();
    const w = (maxX - minX) / 2, d = (maxZ - minZ) / 2, bumps = [random() * 6, random() * 6];
    for (let i = 0; i < 72; i++) {
      const t = (i / 72) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const wobble = 1 + 0.05 * Math.sin(t * 3 + bumps[0]) + 0.03 * Math.sin(t * 7 + bumps[1]);
      const x = cx + Math.sign(c) * Math.abs(c) ** 0.7 * w * wobble, z = cz + Math.sign(sn) * Math.abs(sn) ** 0.7 * d * wobble;
      i ? outline.lineTo(x, -z) : outline.moveTo(x, -z);
    }
    outline.closePath();
    const plate = new THREE.ExtrudeGeometry(outline, { depth: plateH, bevelEnabled: false });
    plate.rotateX(-Math.PI / 2);
    planar(plate);
    s.mesh(plate, [surface, new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.flow).multiplyScalar(0.7), roughness: 1 })] as unknown as THREE.Material);

    // ---- The crown: a lathe of dome, ring ridges and moat ----------------------------------------------
    for (const crown of crowns) {
      const points: THREE.Vector2[] = [];
      const steps = 80;
      for (let i = steps; i >= 0; i--) {
        const u = (i / steps) * 1.05;
        let y = 0;
        if (crown.centre === 'dome') y += 0.75 * Math.max(0, 1 - (u / 0.55) ** 2) ** 0.8;
        else if (crown.centre === 'pit') y += 0.28 * THREE.MathUtils.smoothstep(u, 0.3, 0.5) - 0.12 * (1 - THREE.MathUtils.smoothstep(u, 0, 0.42));
        else if (crown.centre === 'double') y += 0.3 * Math.exp(-((u / 0.14) ** 2)) + 0.22 * Math.exp(-(((u - 0.36) / 0.05) ** 2));
        else y += 0.1 * Math.max(0, 1 - u / 0.3);
        // The raised ring: a band of ridges, dropping to a shallow moat.
        if (crown.centre !== 'nova') for (const ring of [0.6, 0.68, 0.76]) y += 0.34 * Math.exp(-(((u - ring) / 0.03) ** 2));
        y += 0.22 * THREE.MathUtils.smoothstep(u, 0.45, 0.6) * (1 - THREE.MathUtils.smoothstep(u, 0.78, 0.92));
        y -= 0.05 * Math.exp(-(((u - 0.92) / 0.05) ** 2));
        y *= 1 - THREE.MathUtils.smoothstep(u, 0.95, 1.05);
        if (ancient) y *= 0.7;
        points.push(new THREE.Vector2(Math.max(0.5, u * crown.r), plateH + Math.max(-0.02 * lift, y * lift * (crown.r / R) ** 0.5) + 0.002 * half));
      }
      points.push(new THREE.Vector2(0, points[points.length - 1].y));
      const geometry = new THREE.LatheGeometry(points, 96);
      geometry.translate(crown.x, 0, crown.z);
      planar(geometry);
      s.mesh(geometry, surface);
    }

    // ---- Leg ridges ----------------------------------------------------------------------------------
    const ridgeLift = lift * (ancient ? 0.3 : 0.5);
    const merged: THREE.BufferGeometry[] = [];
    for (const leg of legs) {
      const geometry = ridgeGeometry(leg.path, (t) => leg.width * (1 - t * 0.6), (t) => ridgeLift * (leg.crown.r / R) * Math.sin(Math.min(1, t * 4 + 0.15) * Math.PI / 2) * (1 - t * 0.85), plateH);
      merged.push(geometry);
    }
    // Merge all ridges into one mesh: positions and indices concatenated.
    let vertexTotal = 0;
    const position: number[] = [], index: number[] = [];
    for (const geometry of merged) {
      const p = geometry.attributes.position.array as ArrayLike<number>;
      for (let i = 0; i < p.length; i++) position.push(p[i]);
      const idx = geometry.index!.array as ArrayLike<number>;
      for (let i = 0; i < idx.length; i++) index.push(idx[i] + vertexTotal);
      vertexTotal += p.length / 3;
      geometry.dispose();
    }
    const ridges = new THREE.BufferGeometry();
    ridges.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    ridges.setIndex(index);
    ridges.computeVertexNormals();
    planar(ridges);
    s.mesh(ridges, surface);

    const model = 680 / half;
    s.root.scale.setScalar(model);
    const base = surface.emissiveIntensity, pace = mix(0.2, 1.5, mood.energy);
    return s.finish({
      footprint: half * 0.85 * model,
      update(_dt, time) {
        if (fresh) surface.emissiveIntensity = base * (0.7 + 0.3 * Math.sin(time * pace));
      },
    });
  },
});
