import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Star = { deep: string; mid: string; bright: string };
const PAIRS = {
  goldred: { say: 'A big yellow-white sun with a small red dwarf companion.', a: { deep: '#e88a1c', mid: '#ffc93a', bright: '#fff6c8' }, b: { deep: '#8f1c12', mid: '#e2431f', bright: '#ff9a5a' } },
  blueorange: { say: 'A swollen orange giant and a small fierce blue-white star.', a: { deep: '#c2501a', mid: '#f58a2a', bright: '#ffd08a' }, b: { deep: '#3f7fe0', mid: '#8fc8ff', bright: '#ffffff' } },
  twins: { say: 'Two pale gold suns, near-identical twins.', a: { deep: '#e0a02a', mid: '#ffd95a', bright: '#fffbe0' }, b: { deep: '#e8922a', mid: '#ffcf6a', bright: '#fff4d0' } },
  lurid: { say: 'A lime-green sun and a magenta one, pure paperback-cover colour.', a: { deep: '#3f9a2a', mid: '#9be03a', bright: '#f0ffb0' }, b: { deep: '#9a1c7a', mid: '#f04fb8', bright: '#ffc8ee' } },
  pinkteal: { say: 'A rose-pink sun and a teal one, soft and strange.', a: { deep: '#d8527a', mid: '#ff9ab0', bright: '#fff0ea' }, b: { deep: '#178a8a', mid: '#4fd8c8', bright: '#d8fff6' } },
  embers: { say: 'Two dim dying suns, dark red and smoky amber.', a: { deep: '#5a120c', mid: '#b8301a', bright: '#f07a3a' }, b: { deep: '#7a4a10', mid: '#d8892a', bright: '#ffd08a' } },
  whiteviolet: { say: 'A blinding white sun with a violet companion.', a: { deep: '#e8b84a', mid: '#fff0b0', bright: '#ffffff' }, b: { deep: '#4a2a9a', mid: '#9a6aff', bright: '#e0d0ff' } },
} as const;

export default defineThing({
  questions: {
    pair: choice('What colours are the two suns?', Object.fromEntries(Object.entries(PAIRS).map(([k, p]) => [k, p.say])) as Record<keyof typeof PAIRS, string>),
    sizes: choice('How do their sizes compare?', {
      unequal: 'One clearly larger, the other about half its size.',
      equal: 'Almost the same size.',
      pinprick: 'A giant and a tiny brilliant point beside it.',
    }),
    apart: choice('How close together do they hang?', {
      overlapping: 'Overlapping: the smaller one crosses the face of the larger.',
      kissing: 'Side by side, just touching.',
      close: 'Close, with a hand\'s width of sky between.',
      wide: 'Far apart across the sky.',
      stacked: 'One directly above the other.',
    }),
    time: choice('Where are they in their day?', {
      firstlight: 'First light: one already up, the other only a sliver breaking the horizon.',
      rising: 'Rising: both just clear of the horizon.',
      high: 'High in the sky at double noon.',
      setting: 'Setting: both half sunk behind the horizon.',
      lastlight: 'Last light: only two glowing arcs left.',
    }),
    rays: choice('How is their light drawn?', {
      clean: 'Clean hard discs with a soft glow.',
      burst: 'Bold wedge-shaped rays, a sunburst from a poster.',
      rings: 'Wide concentric halo rings that cross each other.',
      bridge: 'A ribbon of fire drawn from one sun to the other.',
    }),
    horizon: choice('What is the horizon beneath them?', {
      desert: 'A flat line of low dunes.',
      peaks: 'Jagged mountains.',
      jungle: 'A lumpy jungle canopy with tall fronds sticking up.',
      sea: 'A level sea with two paths of glitter running toward the viewer.',
      city: 'Domes and needle towers of a far city.',
    }),
    across: choice('What is crossing in front of them?', {
      nothing: 'Nothing.',
      clouds: 'Long thin bars of cloud.',
      flock: 'A flock of winged creatures in silhouette.',
      planet: 'A small ringed planet in silhouette.',
      rocket: 'A tiny rocket and its trail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pair = PAIRS[a.pair];
    const R1 = 2.6, R2 = R1 * { unequal: 0.52, equal: 0.9, pinprick: 0.32 }[a.sizes];
    const flip = random() < 0.5 ? -1 : 1;
    const gap = { overlapping: 0.6, kissing: 1.0, close: 1.3, wide: 2.1, stacked: 1.12 }[a.apart] * (R1 + R2);
    const lift1 = { firstlight: -0.62, rising: 1.12, high: 1.55, setting: 0.05, lastlight: -0.7 }[a.time] * R1;
    const stacked = a.apart === 'stacked';
    const rise = stacked ? gap : a.time === 'firstlight' ? R1 * 0.62 + R2 * 1.3 : a.time === 'lastlight' ? R1 * 0.7 - R2 * 0.55 : (random() - 0.2) * R2 * 0.9 + (a.time === 'setting' ? R2 * 0.2 : 0);
    const dx = stacked ? flip * R1 * 0.25 : flip * Math.sqrt(Math.max(gap * gap - Math.min(rise * rise, gap * gap * 0.6), 0));
    const x1 = -dx / 2, x2 = dx / 2, y1 = lift1, y2 = lift1 + rise;
    const dusk = a.time === 'setting' || a.time === 'lastlight' ? 1 : 0;
    const power = mix(0.8, 1.15, mood.cheer);

    // A disc that is cut flat where it meets the horizon.
    const disc = (radius: number, cx: number, cy: number, bulge: number) => {
      const segs = 64, rings = 10, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= rings; i++) for (let j = 0; j <= segs; j++) {
        const r = (i / rings) * radius, t = (j / segs) * Math.PI * 2, x = Math.cos(t) * r, y = Math.max(0, cy + Math.sin(t) * r);
        positions.push(cx + x, y, bulge * Math.sqrt(Math.max(0, 1 - (r / radius) ** 2)));
        uvs.push((x / radius + 1) / 2, ((y - cy) / radius + 1) / 2);
      }
      for (let i = 0; i < rings; i++) for (let j = 0; j < segs; j++) { const p = i * (segs + 1) + j, q = p + segs + 1; index.push(p, q, p + 1, p + 1, q, q + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(index); g.computeVertexNormals();
      return g;
    };
    const face = (star: Star) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const deep = new THREE.Color(star.deep).lerp(new THREE.Color('#b5321a'), dusk * 0.35).getStyle();
      ctx.fillStyle = deep; ctx.fillRect(0, 0, 256, 256);
      const g = ctx.createRadialGradient(118, 112, 0, 128, 128, 128);
      g.addColorStop(0, star.bright); g.addColorStop(0.5, star.mid); g.addColorStop(0.95, deep);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(128, 128, 128, 0, 7); ctx.fill();
      for (let i = 0; i < 160; i++) { const t = random() * 7, d = Math.sqrt(random()) * 120; ctx.globalAlpha = 0.18; ctx.fillStyle = i % 2 ? star.bright : deep; ctx.beginPath(); ctx.arc(128 + Math.cos(t) * d, 128 + Math.sin(t) * d, 2 + random() * 6, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < Math.round(mood.wear * 6); i++) { const t = random() * 7, d = random() * 80; ctx.fillStyle = 'rgba(40,10,5,0.75)'; ctx.beginPath(); ctx.ellipse(128 + Math.cos(t) * d, 128 + Math.sin(t) * d, 5 + random() * 9, 4 + random() * 5, 0, 0, 7); ctx.fill(); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: map, emissiveIntensity: power, roughness: 1 });
    };
    const halos: THREE.MeshBasicMaterial[] = [];
    const sun = (star: Star, radius: number, cx: number, cy: number, z: number) => {
      if (cy + radius < 0.05) return;
      const front = s.mesh(disc(radius, cx, cy, radius * 0.1), face(star), [0, 0, z]); front.castShadow = false;
      const back = s.mesh(disc(radius, -cx, cy, radius * 0.1), face(star), [0, 0, z]); back.rotation.y = Math.PI; back.castShadow = false;
      const layers = a.rays === 'rings' ? [1.5, 2.0, 2.5] : [1.18, 1.42, 1.75];
      layers.forEach((k, i) => {
        const mat = new THREE.MeshBasicMaterial({ color: i ? star.mid : star.bright, transparent: true, opacity: a.rays === 'rings' ? 0.16 : 0.24 - i * 0.06, depthWrite: false, side: THREE.DoubleSide });
        halos.push(mat);
        const halo = s.mesh(disc(radius * k, cx, cy, 0), mat, [0, 0, z - 0.06 - i * 0.02]); halo.castShadow = false;
        if (a.rays === 'rings') {
          // A thin bright edge to each ring so the crossing circles read as drawn lines.
          const pts: THREE.Vector3[] = [];
          for (let j = 0; j <= 80; j++) { const t = j / 80 * Math.PI * 2, y = cy + Math.sin(t) * radius * k; if (y > 0.02) pts.push(new THREE.Vector3(cx + Math.cos(t) * radius * k, y, z - 0.05)); }
          if (pts.length > 2) s.root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: star.mid, transparent: true, opacity: 0.9 })));
        }
      });
      if (a.rays === 'burst') {
        const positions: number[] = [], count = 16;
        for (let i = 0; i < count; i++) {
          const t = (i + 0.5) / count * Math.PI * 2 + random() * 0.05, half = Math.PI / count * 0.55, len = radius * (i % 2 ? 2.0 : 2.6);
          const tip = [cx + Math.cos(t) * len, cy + Math.sin(t) * len], l = [cx + Math.cos(t - half) * radius * 1.12, cy + Math.sin(t - half) * radius * 1.12], r = [cx + Math.cos(t + half) * radius * 1.12, cy + Math.sin(t + half) * radius * 1.12];
          if (tip[1] < 0.15) continue;
          positions.push(l[0], Math.max(0, l[1]), 0, r[0], Math.max(0, r[1]), 0, tip[0], tip[1], 0);
        }
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({ color: star.mid, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }); halos.push(mat);
        const rays = s.mesh(geo, mat, [0, 0, z - 0.04]); rays.castShadow = false;
      }
    };
    sun(pair.a, R1, x1, y1, 0);
    sun(pair.b, R2, x2, y2, a.apart === 'overlapping' ? 0.35 : 0.02);

    if (a.rays === 'bridge' && y1 + R1 > 0.4 && y2 + R2 > 0.4) {
      const fire = new THREE.MeshStandardMaterial({ color: pair.b.bright, emissive: pair.a.mid, emissiveIntensity: 1.2, roughness: 0.6 });
      const from = new THREE.Vector3(x1 + Math.sign(dx || 1) * R1 * 0.75, Math.max(0.3, y1 + R1 * 0.45), 0.3), to = new THREE.Vector3(x2 - Math.sign(dx || 1) * R2 * 0.7, Math.max(0.3, y2 + R2 * 0.4), 0.45);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, Math.max(R2, 0.6) * 0.9, 0.2));
      const curve = new THREE.QuadraticBezierCurve3(from, mid.add(new THREE.Vector3(0, Math.max(R2, 0.6) * 0.6, 0)), to);
      s.mesh(new THREE.TubeGeometry(curve, 40, R2 * 0.05 + 0.05, 8), fire).castShadow = false;
      for (let i = 0; i < 6; i++) { const p = curve.getPointAt(0.15 + i * 0.13); s.ball([0.1 + random() * 0.12, 0.1 + random() * 0.1, 0.08], [p.x + (random() - 0.5) * 0.3, p.y + 0.15 + random() * 0.25, p.z], fire, 8).castShadow = false; }
    }

    // ---- Horizon ----
    const reach = Math.max(Math.abs(x1) + R1, Math.abs(x2) + R2) * 1.18 + 0.6, W = reach * 2;
    const land = new THREE.Color({ desert: '#b8743a', peaks: '#4a3f5a', jungle: '#2f5a4a', sea: '#2f6a8a', city: '#3f3a5a' }[a.horizon]).lerp(new THREE.Color('#3a2440'), dusk * 0.4);
    const landMat = new THREE.MeshStandardMaterial({ color: land, roughness: 0.95 });
    const outline: [number, number][] = [[-reach, 0]];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const x = -reach + i / steps * W; let y = 0.22;
      if (a.horizon === 'desert') y = 0.28 + Math.sin(i * 0.5 + flip) * 0.12 + Math.sin(i * 0.17) * 0.14;
      if (a.horizon === 'peaks') y = 0.3 + Math.abs(Math.sin(i * 0.9 + random() * 0.3)) * 0.9 * (0.5 + random() * 0.8);
      if (a.horizon === 'jungle') y = 0.5 + Math.abs(Math.sin(i * 1.3)) * 0.3 + random() * 0.18;
      if (a.horizon === 'sea') y = 0.2;
      if (a.horizon === 'city') y = 0.2;
      outline.push([x, y]);
    }
    outline.push([reach, 0]);
    const ridge = new THREE.ExtrudeGeometry(new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.5, bevelEnabled: false });
    s.mesh(ridge, landMat, [0, 0, 0.45]);
    s.box([W, 0.06, 1.5], [0, 0.03, 1.2], landMat);
    if (a.horizon === 'jungle') for (let i = 0; i < 9; i++) {
      const x = (random() - 0.5) * W * 0.92, h = 1.1 + random() * 1.0, bend = (random() - 0.5) * 0.6;
      s.rod([x, 0.4, 0.7], [x + bend, h, 0.7], 0.045, landMat, 0.03);
      for (let k = 0; k < 6; k++) { const t = k / 6 * Math.PI * 2, leaf = s.ball([0.42, 0.045, 0.11], [x + bend + Math.cos(t) * 0.3, h - Math.abs(Math.sin(t)) * 0.02 - 0.08, 0.7 + Math.sin(t) * 0.15], landMat, 8); leaf.rotation.z = Math.cos(t) > 0 ? -0.5 : 0.5; }
    }
    if (a.horizon === 'city') {
      const lit = new THREE.MeshStandardMaterial({ color: '#ffe9a0', emissive: '#ffd45a', emissiveIntensity: 1.2 });
      for (let i = 0; i < 11; i++) {
        const x = (i / 10 - 0.5) * W * 0.86 + (random() - 0.5) * 0.4, kind = Math.floor(random() * 3), h = 0.5 + random() * 1.4;
        if (kind === 0) { s.ball([0.4 + random() * 0.3, 0.38 + random() * 0.2, 0.3], [x, 0.2, 0.7], landMat, 14); s.rod([x, 0.4, 0.7], [x, 0.95, 0.7], 0.02, landMat, 0.008); }
        else if (kind === 1) { s.cylinder(0.04, 0.16, h, [x, 0.2 + h / 2, 0.7], landMat, 8); s.ball([0.1, 0.1, 0.1], [x, 0.2 + h * 0.72, 0.7], landMat, 8); s.ball([0.03, 0.03, 0.03], [x, 0.22 + h, 0.7], lit, 6); }
        else { s.box([0.3, h * 0.7, 0.3], [x, 0.2 + h * 0.35, 0.7], landMat); for (let k = 0; k < 3; k++) s.box([0.05, 0.05, 0.02], [x - 0.08 + k * 0.08, 0.3 + h * 0.5 * random(), 0.86], lit); }
      }
    }
    const glitter: THREE.Mesh[] = [];
    const stripe = (star: Star, x: number, cy: number, radius: number) => {
      if (cy + radius < 0.05) return;
      const mat = new THREE.MeshStandardMaterial({ color: star.bright, emissive: star.mid, emissiveIntensity: 1.1, roughness: 0.4 });
      for (let i = 0; i < 9; i++) { const w = radius * (0.9 - i * 0.07) * (0.5 + random() * 0.6); const dash = s.mesh(new THREE.PlaneGeometry(w, 0.08), mat, [x + (random() - 0.5) * radius * 0.4, 0.065, 0.98 + i * 0.16]); dash.rotation.x = -Math.PI / 2; dash.castShadow = false; glitter.push(dash); }
    };
    if (a.horizon === 'sea') { stripe(pair.a, x1, y1, R1); stripe(pair.b, x2, y2, Math.max(R2, 0.7)); }
    if (a.horizon === 'desert' && mood.density > 0.4) for (let i = 0; i < 5; i++) { const x = (random() - 0.5) * W * 0.8; s.cylinder(0.05, 0.07, 0.5 + random() * 0.5, [x, 0.5, 0.75], landMat, 8); }

    // ---- Things crossing the discs ----
    const shade = new THREE.MeshStandardMaterial({ color: new THREE.Color(land).multiplyScalar(0.55), roughness: 1 });
    const top = Math.max(y1 + R1, y2 + R2), midY = Math.max(1.2, Math.min(top - 0.6, Math.max(y1, 0.9) + R1 * 0.2));
    const drift: { o: THREE.Object3D; x: number; speed: number; flap: boolean }[] = [];
    if (a.across === 'clouds') for (let i = 0; i < 4; i++) {
      const bar = s.ball([R1 * (0.6 + random() * 0.7), 0.13 + random() * 0.08, 0.06], [(random() - 0.5) * reach, Math.max(0.9, midY - 0.9 + i * 0.6 + random() * 0.3), 0.6], new THREE.MeshStandardMaterial({ color: new THREE.Color(pair.a.deep).lerp(new THREE.Color('#4a3a5a'), 0.75), roughness: 1 }), 12);
      bar.castShadow = false; drift.push({ o: bar, x: bar.position.x, speed: 0.05 + random() * 0.05, flap: false });
    }
    if (a.across === 'flock') for (let i = 0; i < Math.round(mix(4, 11, mood.density)); i++) {
      const bird = new THREE.Group(), span = 0.2 + random() * 0.16;
      for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.025, 0.07), shade); wing.position.x = side * span * 0.45; wing.rotation.z = side * 0.45; bird.add(wing); }
      bird.position.set(x1 + (random() - 0.5) * R1 * 1.6 + i * 0.12, midY + (random() - 0.5) * R1 * 0.9, 0.62); s.root.add(bird);
      drift.push({ o: bird, x: bird.position.x, speed: 0.12 + random() * 0.1, flap: true });
    }
    if (a.across === 'planet' && y1 + R1 > 1.2) {
      const px = x1 - R1 * 0.3, py = Math.max(1, y1 + R1 * 0.3), pr = R1 * 0.16;
      const globe = s.ball([pr, pr, pr * 0.3], [px, py, 0.5], shade, 18); globe.castShadow = false;
      const ring = s.ring(pr * 1.7, pr * 0.1, [px, py, 0.5], shade); ring.scale.set(1, 0.28, 0.3); ring.rotation.z = -0.4; ring.castShadow = false;
    }
    if (a.across === 'rocket') {
      const from = new THREE.Vector3(x1 - R1 * 0.9, Math.max(0.7, y1 - R1 * 0.2), 0.6), to = new THREE.Vector3(x1 + R1 * 0.25, Math.max(1.6, y1 + R1 * 0.55), 0.6);
      const trail = new THREE.CatmullRomCurve3([from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0.2, -0.25, 0)), to]);
      s.mesh(new THREE.TubeGeometry(trail, 20, 0.04, 6), shade).castShadow = false;
      const dir = trail.getTangentAt(1), ship = new THREE.Group(); ship.position.copy(to); ship.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); ship.scale.setScalar(2);
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.3, 4, 10), shade); hull.position.y = 0.2; ship.add(hull);
      for (const side of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.03), shade); fin.position.set(side * 0.12, 0.02, 0); fin.rotation.z = side * 0.6; ship.add(fin); }
      s.root.add(ship);
    }

    const animate = (time: number) => {
      const speed = mix(0.2, 1.6, mood.energy);
      halos.forEach((m, i) => { const base = (m.userData.base ??= m.opacity) as number; m.opacity = base * (0.85 + 0.15 * Math.sin(time * speed + i * 1.3)); });
      for (const d of drift) { d.o.position.x = d.x + ((time * d.speed * speed) % 1.5) - 0.75 * 0; if (d.flap) d.o.children.forEach((w, k) => { w.rotation.z = (k ? 1 : -1) * (0.3 + Math.sin(time * 6 * speed + d.x * 9) * 0.35); }); }
      glitter.forEach((g, i) => { g.scale.x = 0.7 + 0.3 * Math.sin(time * speed * 3 + i * 1.7); });
    };
    animate(0);
    return s.finish({ footprint: Math.min(reach, 3.2), update: (_dt, time) => animate(time) });
  },
});
