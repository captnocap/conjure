import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PALETTES = {
  basalt: { plain: '#4b3f35', dome: '#5d4c3d', crack: '#1c1510', bright: '#a88a66', flow: '#3c3129' },
  magellan: { plain: '#b06a28', dome: '#d8953a', crack: '#55250a', bright: '#ffd47e', flow: '#8f5220' },
  radar: { plain: '#56564f', dome: '#8c8b84', crack: '#1a1a18', bright: '#ecebe2', flow: '#3e3e39' },
  sulfur: { plain: '#9c8246', dome: '#c3a95c', crack: '#55421f', bright: '#f2e3a6', flow: '#7e6936' },
} as const;

interface Dome { x: number; z: number; r: number; turn: number; rings: number[]; pit: number }

/** Dome height (0..1) at normalised radius u, with low terraces where the fracture rings run. */
function profile(u: number, dome: Dome) {
  const top = 1 - 0.07 * Math.min(1, u / 0.8) ** 2;
  let y = u < 0.78 ? top : (1 - 0.07 * (0.78 / 0.8) ** 2) * Math.max(0, 1 - ((u - 0.78) / 0.24) ** 2.4);
  y = Math.max(y, u < 1.12 ? 0.05 * Math.min(1, (1.12 - u) / 0.17) : 0);
  for (const ring of dome.rings) y -= 0.022 * THREE.MathUtils.smoothstep(u, ring - 0.006, ring + 0.006) * (u < 0.85 ? 1 : 0);
  if (u < dome.pit) y -= 0.06 * Math.sqrt(1 - u / dome.pit);
  return Math.max(0, y);
}

export default defineThing({
  questions: {
    cluster: choice('How many domes are there?', {
      single: 'One perfect dome alone on the plain, a cake on a table.',
      pair: 'Two overlapping, the younger one spilling over the edge of the older.',
      chain: 'A chain of four or five in a row, overlapping like coins, like the Seven Sisters of Alpha Regio.',
      collapsed: 'One dome with a great scalloped bite out of its side where the edge slumped into a landslide.',
    }),
    look: choice('How is it seen?', {
      basalt: 'As it really is: dark basalt under an ochre haze.',
      magellan: 'As in the famous radar renderings: glowing false-colour orange and gold.',
      radar: 'As a raw radar mosaic: grey, with fractures bright as chalk.',
      sulfur: 'Pale and dusty, sulphur-yellow, washed out by the clouds.',
    }),
    relief: choice('How tall does it stand?', {
      true: 'True to life: barely a swelling, a pancake you could miss from the ground.',
      raised: 'Gently exaggerated, a clear flat-topped dome with steep sides.',
      dramatic: 'Exaggerated tenfold like a NASA render: a steep, monumental mesa.',
    }),
    summit: choice('What is on the flat top?', {
      pit: 'A small central pit where the lava welled up.',
      smooth: 'Nothing: smooth and level as a griddle.',
      rift: 'A straight rift splitting the top in two.',
      craters: 'A few small impact craters peppering it.',
    }),
    activity: choice('Is it alive?', {
      dormant: 'Long dead and quiet.',
      fresh: 'Freshly formed: fractures still glowing dull orange with heat.',
      ancient: 'Ancient: rims softened, cracks widened, half buried in younger flows.',
    }),
    plain: choice('What is the plain around it like?', {
      lobes: 'Lobed lava flows spreading out like spilled batter.',
      graben: 'Crossed by long parallel fractures running to the horizon.',
      bare: 'Bare featureless plain.',
      dark: 'Dark radar-smooth flows pooled around the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.look];
    const R = 12000;
    const H = { true: 750, raised: 2400, dramatic: 6500 }[a.relief];

    // ---- Where the domes stand -----------------------------------------------------------------
    const rings = () => {
      const count = 2 + Math.floor(random() * 3);
      return Array.from({ length: count }, (_unused, i) => 0.22 + (i + random() * 0.6) * (0.55 / count));
    };
    const dome = (x: number, z: number, r: number): Dome => ({ x, z, r, turn: random() * Math.PI * 2, rings: rings(), pit: a.summit === 'pit' ? 0.07 + random() * 0.04 : 0 });
    const domes: Dome[] = [];
    if (a.cluster === 'pair') {
      domes.push(dome(-0.5 * R, -0.1 * R, R), dome(0.75 * R, 0.25 * R, 0.78 * R));
    } else if (a.cluster === 'chain') {
      const count = 4 + Math.floor(random() * 2);
      let x = 0;
      for (let i = 0; i < count; i++) {
        const r = R * mix(0.55, 0.85, random());
        if (i) x += (domes[i - 1].r + r) * 0.82;
        domes.push(dome(x, (random() - 0.5) * 0.5 * R + i * 0.12 * R, r));
      }
      const mid = (domes[0].x + domes[count - 1].x) / 2;
      for (const d of domes) d.x -= mid;
    } else {
      domes.push(dome(0, 0, R));
    }
    const minX = Math.min(...domes.map((d) => d.x - d.r)) - 0.45 * R, maxX = Math.max(...domes.map((d) => d.x + d.r)) + 0.45 * R;
    const minZ = Math.min(...domes.map((d) => d.z - d.r)) - 0.45 * R, maxZ = Math.max(...domes.map((d) => d.z + d.r)) + 0.45 * R;
    const half = Math.max(maxX - minX, maxZ - minZ) / 2, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const collapse = random() * Math.PI * 2;

    // ---- One top-down painting for the whole patch ---------------------------------------------
    const size = 1536;
    const toPx = (x: number, z: number): [number, number] => [((x - cx) / (2 * half) + 0.5) * size, ((z - cz) / (2 * half) + 0.5) * size];
    const scale = size / (2 * half);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d')!;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = a.activity === 'fresh' ? size : 4;
    const glow = glowCanvas.getContext('2d')!;
    glow.fillStyle = '#000';
    glow.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
    const fresh = a.activity === 'fresh';
    g.fillStyle = pal.plain;
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = random() < 0.5 ? 'rgba(255,240,220,0.05)' : 'rgba(0,0,0,0.07)';
      g.fillRect(random() * size, random() * size, 2 + random() * 6, 2 + random() * 6);
    }
    // The plain.
    if (a.plain === 'lobes' || a.plain === 'dark') {
      const lobes = a.plain === 'lobes' ? 16 : 7;
      for (let i = 0; i < lobes; i++) {
        const d = domes[Math.floor(random() * domes.length)], angle = random() * Math.PI * 2;
        const [px, pz] = toPx(d.x + Math.cos(angle) * d.r * 1.05, d.z + Math.sin(angle) * d.r * 1.05);
        const reach = d.r * scale * mix(0.35, 0.8, random());
        g.fillStyle = a.plain === 'dark' ? pal.crack : i % 2 ? pal.flow : pal.bright;
        g.globalAlpha = a.plain === 'dark' ? 0.55 : i % 2 ? 0.55 : 0.18;
        g.beginPath();
        for (let k = 0; k <= 14; k++) {
          const t = angle - 0.5 + (k / 14) * 1.0, rr = reach * (0.6 + random() * 0.5) * Math.sin((k / 14) * Math.PI);
          const x = px + Math.cos(t) * rr, y = pz + Math.sin(t) * rr;
          k ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
    } else if (a.plain === 'graben') {
      const angle = random() * Math.PI, along = [Math.cos(angle), Math.sin(angle)], across = [-Math.sin(angle), Math.cos(angle)];
      const count = 7 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const off = (i / (count - 1) - 0.5) * size * 0.9 + (random() - 0.5) * size * 0.05;
        const start = (random() - 0.5) * size * 0.6 - size * 0.5, length = size * mix(0.5, 1.1, random());
        const points: [number, number][] = [];
        for (let k = 0; k <= 12; k++) {
          const t = start + (k / 12) * length, bend = Math.sin(k * 0.7 + i) * size * 0.01;
          points.push([size / 2 + along[0] * t + across[0] * (off + bend), size / 2 + along[1] * t + across[1] * (off + bend)]);
        }
        for (const [width, colour, shift, alpha] of [[5 + random() * 4, pal.crack, 0, 0.8], [2, pal.bright, 5, 0.45]] as const) {
          g.strokeStyle = colour; g.lineWidth = width; g.globalAlpha = alpha;
          g.beginPath(); points.forEach(([x, y], k) => (k ? g.lineTo(x + shift, y + shift) : g.moveTo(x + shift, y + shift))); g.stroke();
        }
        g.globalAlpha = 1;
      }
    }
    // Each dome, oldest first, so the younger one paints over.
    const crackLine = (points: [number, number][], width: number, lit: boolean) => {
      g.strokeStyle = pal.crack; g.lineWidth = width;
      g.beginPath(); points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      g.strokeStyle = pal.bright; g.lineWidth = Math.max(1, width * 0.35); g.globalAlpha = 0.6;
      g.beginPath(); points.forEach(([x, y], i) => (i ? g.lineTo(x + width * 0.6, y + width * 0.6) : g.moveTo(x + width * 0.6, y + width * 0.6))); g.stroke();
      g.globalAlpha = 1;
      if (fresh && lit) {
        glow.strokeStyle = '#ff8a2a'; glow.lineWidth = width * 0.8;
        glow.beginPath(); points.forEach(([x, y], i) => (i ? glow.lineTo(x, y) : glow.moveTo(x, y))); glow.stroke();
      }
    };
    const wear = mix(0.6, 1.6, mood.wear) * (a.activity === 'ancient' ? 1.6 : 1);
    for (const d of domes) {
      const [px, pz] = toPx(d.x, d.z), pr = d.r * scale;
      const body = g.createRadialGradient(px, pz, pr * 0.2, px, pz, pr * 1.08);
      body.addColorStop(0, pal.dome);
      body.addColorStop(0.72, pal.dome);
      body.addColorStop(0.86, pal.flow);
      body.addColorStop(1, pal.plain);
      g.fillStyle = body;
      g.beginPath(); g.arc(px, pz, pr * 1.08, 0, Math.PI * 2); g.fill();
      // The steep flank catches the radar: a bright scalloped band.
      g.strokeStyle = pal.bright; g.globalAlpha = 0.45; g.lineWidth = pr * 0.06;
      g.beginPath(); g.arc(px, pz, pr * 0.9, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      // Concentric fracture rings, wobbling slightly.
      for (const ring of d.rings) {
        const points: [number, number][] = [];
        const wobble = random() * 6;
        for (let k = 0; k <= 72; k++) { const t = (k / 72) * Math.PI * 2, rr = pr * ring * (1 + Math.sin(t * 5 + wobble) * 0.012 + (random() - 0.5) * 0.008); points.push([px + Math.cos(t) * rr, pz + Math.sin(t) * rr]); }
        crackLine(points, Math.max(3, pr * 0.022 * wear), true);
      }
      // Radial fractures from the centre toward the shoulder.
      const radials = 10 + Math.floor(random() * 10);
      for (let i = 0; i < radials; i++) {
        const t = random() * Math.PI * 2, from = pr * (0.05 + random() * 0.2), to = pr * (0.45 + random() * 0.4);
        const points: [number, number][] = [];
        for (let k = 0; k <= 6; k++) { const rr = mix(from, to, k / 6), tt = t + (random() - 0.5) * 0.06; points.push([px + Math.cos(tt) * rr, pz + Math.sin(tt) * rr]); }
        crackLine(points, Math.max(2, pr * 0.01 * wear), i % 3 === 0);
      }
      // A polygonal network of fine cracks on the top.
      g.strokeStyle = pal.crack; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, pr * 0.003 * wear);
      for (let i = 0; i < 60; i++) {
        const t = random() * Math.PI * 2, rr = Math.sqrt(random()) * pr * 0.75;
        let x = px + Math.cos(t) * rr, y = pz + Math.sin(t) * rr;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 3; k++) { x += (random() - 0.5) * pr * 0.12; y += (random() - 0.5) * pr * 0.12; g.lineTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1;
      if (d.pit) {
        g.fillStyle = pal.crack; g.beginPath(); g.arc(px, pz, pr * d.pit, 0, Math.PI * 2); g.fill();
        g.strokeStyle = pal.bright; g.lineWidth = pr * 0.012; g.beginPath(); g.arc(px + 2, pz + 2, pr * d.pit, Math.PI * 0.1, Math.PI * 1.1); g.stroke();
        if (fresh) { glow.fillStyle = '#ff7a1a'; glow.beginPath(); glow.arc(px, pz, pr * d.pit * 0.8, 0, Math.PI * 2); glow.fill(); }
      }
      if (a.summit === 'rift') {
        const t = random() * Math.PI;
        crackLine([[px - Math.cos(t) * pr * 0.8, pz - Math.sin(t) * pr * 0.8], [px + Math.cos(t) * pr * 0.8, pz + Math.sin(t) * pr * 0.8]], pr * 0.035, true);
      } else if (a.summit === 'craters') {
        for (let i = 0; i < 5; i++) {
          const t = random() * Math.PI * 2, rr = Math.sqrt(random()) * pr * 0.7, cr = pr * mix(0.025, 0.07, random());
          const x = px + Math.cos(t) * rr, y = pz + Math.sin(t) * rr;
          g.fillStyle = pal.crack; g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.fill();
          g.strokeStyle = pal.bright; g.lineWidth = cr * 0.35; g.beginPath(); g.arc(x, y, cr * 1.1, 0, Math.PI * 2); g.stroke();
        }
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const glowMap = new THREE.CanvasTexture(glowCanvas);
    glowMap.colorSpace = THREE.SRGBColorSpace;
    const surface = new THREE.MeshStandardMaterial({
      map, bumpMap: map, bumpScale: 3, roughness: 0.92, metalness: 0,
      emissive: fresh ? '#ffffff' : '#000000', emissiveMap: fresh ? glowMap : null, emissiveIntensity: fresh ? mix(0.8, 1.6, mood.energy) : 0,
    });
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

    // ---- The ground patch: a thin rounded slab of plain ----------------------------------------
    const plateH = 0.012 * half;
    const plate = new THREE.Shape();
    const w = (maxX - minX) / 2, d = (maxZ - minZ) / 2;
    const lumps = [random() * 6, random() * 6, random() * 6];
    for (let i = 0; i < 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      const wobble = 1 + 0.05 * Math.sin(t * 3 + lumps[0]) + 0.035 * Math.sin(t * 5 + lumps[1]) + 0.02 * Math.sin(t * 9 + lumps[2]);
      // A superellipse: rounder than a tray, fuller than an ellipse, so the domes keep their margin.
      const c = Math.cos(t), sn = Math.sin(t);
      const x = cx + Math.sign(c) * Math.abs(c) ** 0.6 * w * wobble, z = cz + Math.sign(sn) * Math.abs(sn) ** 0.6 * d * wobble;
      i ? plate.lineTo(x, -z) : plate.moveTo(x, -z);
    }
    plate.closePath();
    const plateGeometry = new THREE.ExtrudeGeometry(plate, { depth: plateH, bevelEnabled: false });
    plateGeometry.rotateX(-Math.PI / 2);
    planar(plateGeometry);
    s.mesh(plateGeometry, [surface, new THREE.MeshStandardMaterial({ color: new THREE.Color(pal.flow).multiplyScalar(0.7), roughness: 1 })] as unknown as THREE.Material);

    // ---- The domes ------------------------------------------------------------------------------
    const steps = 70;
    domes.forEach((dm, index) => {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= steps; i++) {
        const u = 1.12 * (1 - (1 - i / steps) ** 1.6);
        points.push(new THREE.Vector2(Math.max(1, u * dm.r), profile(u, dm) * H * (dm.r / R) ** 0.5));
      }
      points.unshift(new THREE.Vector2(0, points[0].y));
      // Outer foot first, so the lathe's faces point outward.
      points.reverse();
      const geometry = new THREE.LatheGeometry(points, 96);
      const position = geometry.attributes.position;
      const ancient = a.activity === 'ancient';
      for (let i = 0; i < position.count; i++) {
        let x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const t = Math.atan2(z, x), r = Math.hypot(x, z) / dm.r;
        if (a.cluster === 'collapsed' && index === 0) {
          // Slump: inside a sector the shoulder is carved back into a scalloped amphitheatre.
          const off = Math.abs(Math.atan2(Math.sin(t - collapse), Math.cos(t - collapse)));
          if (off < 0.75) {
            const bite = Math.cos((off / 0.75) * Math.PI / 2) ** 1.5;
            const edge = 1 - bite * 0.42;
            if (r > edge * 0.8) y *= Math.max(0.08, 1 - (r - edge * 0.8) / (edge * 0.25 + 0.0001) * bite);
          }
        }
        if (ancient) y *= 1 - 0.18 * Math.max(0, r - 0.6);
        x += dm.x; z += dm.z;
        position.setXYZ(i, x, y + plateH, z);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      planar(geometry);
      s.mesh(geometry, surface);
    });

    // Landslide debris spilling from the bite.
    if (a.cluster === 'collapsed') {
      const blocks = Array.from({ length: 70 }, () => {
        const t = collapse + (random() - 0.5) * 1.2, rr = R * mix(0.75, 1.45, random() ** 0.7);
        return { at: [Math.cos(t) * rr, plateH + H * 0.02, Math.sin(t) * rr] as [number, number, number], size: H * mix(0.03, 0.09, random()) * (1.5 - rr / R * 0.6) + R * 0.008 };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material(pal.flow, { roughness: 1, flatShading: true }), blocks);
    }

    // Modelled at true size in kilometres, then shrunk to a model under two kilometres across:
    // the stage refuses anything larger, and the world scales it to its slot anyway.
    const model = 680 / half;
    s.root.scale.setScalar(model);
    const base = surface.emissiveIntensity, pace = mix(0.2, 1.4, mood.energy);
    return s.finish({
      footprint: half * 0.9 * model,
      update(_dt, time) {
        if (fresh) surface.emissiveIntensity = base * (0.75 + 0.25 * Math.sin(time * pace));
      },
    });
  },
});
