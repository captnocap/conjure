import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type XZ = [number, number];
const W = 16, D = 12;
const SLOTS: [number, number, number?, number?][] = [[0.6, 1.3], [-3.8, 1.2], [3.9, -1.9], [-1.6, -2.5, 0, 0.85], [-6.3, -0.3, 0, 0.8], [6.5, -4.1, 0, 0.8]];

/** A flat strip along a path on the ground, with a width that can vary along its length. */
function ribbon(points: readonly XZ[], half: (t: number) => number, y: number) {
  const position: number[] = [], index: number[] = [];
  points.forEach(([x, z], i) => {
    const [px, pz] = points[Math.max(0, i - 1)], [nx, nz] = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(nx - px, nz - pz) || 1, ox = -(nz - pz) / length, oz = (nx - px) / length, h = half(i / (points.length - 1));
    const cx = (v: number) => Math.min(W / 2 - 0.02, Math.max(-W / 2 + 0.02, v)), cz = (v: number) => Math.min(D / 2 - 0.02, Math.max(-D / 2 + 0.02, v));
    position.push(cx(x + ox * h), y, cz(z + oz * h), cx(x - ox * h), y, cz(z - oz * h));
    if (i) index.push(i * 2 - 2, i * 2 - 1, i * 2, i * 2 - 1, i * 2 + 1, i * 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineWorld({
  questions: {
    sky: choice('What is the sky like?', {
      ink: 'Airless black, hard and absolute.',
      slate: 'Deep slate blue, a long cold twilight.',
      violet: 'Dark violet, strange and radiant.',
      haze: 'A pale icy haze, as if the moon had a breath of atmosphere.',
    }),
    planet: choice('How does the parent planet hang over the horizon?', {
      banded: 'A big tan and cream gas giant with a red storm spot.',
      ringed: 'A pale gold giant with a thin tilted ring.',
      blue: 'A cold blue ice giant, faintly banded.',
      crescent: 'A thin lit crescent, the rest of the disc a dark hole in the stars.',
      looming: 'So close it fills half the sky, every stripe visible.',
      absent: 'Not in the sky at all: this is the far side, stars only.',
    }),
    lines: choice('What colour are the fracture lines?', {
      rust: 'Rust red, like dried blood on a sheet.',
      ochre: 'Ochre yellow, sulphurous.',
      umber: 'Dark umber brown, almost black.',
      green: 'A dull green stain, uncomfortably organic.',
      violet: 'Bruise violet.',
    }),
    terrain: choice('What is the ice like around the standing place?', {
      plain: 'A smooth young plain with only a few low ridges.',
      ridged: 'Double pressure ridges heaped along every crack.',
      chaos: 'Chaos terrain: tilted rafts and slabs of broken ice frozen at angles.',
      spikes: 'Fields of blade-like ice spikes leaning the same way.',
    }),
    fissure: choice('What is the widest fissure doing?', {
      venting: 'Venting: vapour rises steadily out of the dark crack.',
      glowing: 'Glowing: a blue-green light shines up from the water below.',
      refrozen: 'Refrozen: sealed over with a stripe of fresh pale ice.',
      spreading: 'Spreading: fresh hairline cracks branch from it toward the standing place.',
    }),
    beneath: choice('What can be made out under the ice?', {
      nothing: 'Nothing. Blank white ice.',
      shadow: 'A long dark shape, far too large, lying under the pan.',
      lights: 'Small cold lights, scattered and slowly pulsing.',
      rings: 'Faint concentric rings spreading from one point, like a signal.',
    }),
    traces: choice('What has been left on the surface?', {
      nothing: 'Nothing: no one has been here.',
      wands: 'A line of marker flags picking out a safe path.',
      tracks: 'Two parallel rover tracks crossing the pan.',
      beacons: 'A ring of small blinking beacons round the standing place.',
      camp: 'A small dome tent and supply crates off to one side.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const skyColour = { ink: '#0d1119', slate: '#3a475c', violet: '#2b2542', haze: '#c5d3dd' }[a.sky];
    const iceColour = new THREE.Color('#cfe3ee').lerp(new THREE.Color('#e8e2d6'), mood.warmth * 0.5);
    const { art: s, world } = diorama(context, {
      background: skyColour, floor: `#${iceColour.getHexString()}`, width: W, depth: D, maxHeight: 4.2, radius: 1.75, pitch: 27, yaw: 27, slots: SLOTS,
    });
    const darkSky = a.sky !== 'haze';
    const clearOf = (x: number, z: number, margin: number) => SLOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > margin);
    const stain = { rust: '#a8502c', ochre: '#c79a3a', umber: '#4f342a', green: '#5f8f6a', violet: '#7a4f8f' }[a.lines];
    const stainMat = new THREE.MeshStandardMaterial({ color: stain, roughness: 0.9, side: THREE.DoubleSide });
    const paleStain = new THREE.MeshStandardMaterial({ color: new THREE.Color(stain).lerp(iceColour, 0.55), roughness: 0.9, side: THREE.DoubleSide });
    const ice = s.material('#bcd9ea', { roughness: 0.35, flatShading: true });
    const flat = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const mesh = s.mesh(geometry, material); mesh.castShadow = false; return mesh; };

    const wander = (from: XZ, to: XZ, steps: number, sway: number): XZ[] => Array.from({ length: steps + 1 }, (_unused, i) => {
      const t = i / steps, edge = i === 0 || i === steps ? 0 : 1;
      const lx = -(to[1] - from[1]), lz = to[0] - from[0], length = Math.hypot(lx, lz);
      const off = (random() - 0.5) * sway * edge;
      return [mix(from[0], to[0], t) + lx / length * off, mix(from[1], to[1], t) + lz / length * off] as XZ;
    });

    // ---- Under the ice (drawn first, lowest) ----
    const pulse: THREE.MeshStandardMaterial[] = [];
    let shadow: THREE.Group | null = null;
    if (a.beneath === 'shadow') {
      shadow = new THREE.Group();
      const murk = new THREE.MeshStandardMaterial({ color: '#4a6f8e', roughness: 1 });
      const length = 11;
      for (let i = 0; i < 26; i++) {
        const t = i / 25, width = Math.sin(Math.min(1, t * 1.25) * Math.PI) ** 0.6 * 1.5 + 0.12;
        const blob = new THREE.Mesh(new THREE.CircleGeometry(1, 20), murk);
        blob.rotation.x = -Math.PI / 2; blob.scale.set(0.5, width, 1);
        blob.position.set(-length / 2 + t * length, 0.006, Math.sin(t * 5) * 0.8);
        shadow.add(blob);
        if (i === 5 || i === 9 || i === 13) for (const side of [-1, 1]) {
          const fin = new THREE.Mesh(new THREE.CircleGeometry(1, 3), murk);
          fin.rotation.x = -Math.PI / 2; fin.rotation.z = side * 0.9; fin.scale.set(0.5, 1.6, 1);
          fin.position.set(-length / 2 + t * length - 0.3, 0.006, Math.sin(t * 5) * 0.8 + side * (width + 0.5)); shadow.add(fin);
        }
      }
      shadow.position.set(-0.5, 0, -0.4); shadow.rotation.y = 0.5;
      s.root.add(shadow);
    } else if (a.beneath === 'lights') {
      const count = Math.round(mix(14, 44, mood.density));
      for (let g = 0; g < 3; g++) {
        const glow = new THREE.MeshStandardMaterial({ color: '#9ff3ff', emissive: g === 2 ? '#7dffb0' : '#4fd8ff', emissiveIntensity: 1.4, roughness: 0.4 });
        pulse.push(glow);
        const dots = Array.from({ length: Math.ceil(count / 3) }, () => { const cx = -5 + g * 4.5 + (random() - 0.5) * 5, cz = (random() - 0.5) * 9; return { at: [cx, 0.012, cz] as [number, number, number], size: 0.07 + random() * 0.13 }; });
        const mesh = s.scatter(new THREE.CylinderGeometry(1, 1, 0.08, 10), glow, dots);
        mesh.castShadow = false;
      }
    } else if (a.beneath === 'rings') {
      const glow = new THREE.MeshStandardMaterial({ color: '#8fe9ff', emissive: '#4fd8ff', emissiveIntensity: 0.9, roughness: 0.5 });
      pulse.push(glow);
      for (let r = 1; r <= 6; r++) { const ring = flat(new THREE.RingGeometry(r * 0.95, r * 0.95 + 0.07, 64), glow); ring.rotation.x = -Math.PI / 2; ring.position.set(-2.4, 0.008, -0.6); }
    }

    // ---- Fracture lines ----
    // Many faint old lineae, straight and crossing, staining the plain.
    const old = Math.round(mix(5, 12, mood.wear));
    for (let i = 0; i < old; i++) {
      const angle = random() * Math.PI, cx = (random() - 0.5) * W * 0.8, cz = (random() - 0.5) * D * 0.8, reach = 14;
      const from: XZ = [THREE.MathUtils.clamp(cx - Math.cos(angle) * reach, -W / 2 + 0.1, W / 2 - 0.1), THREE.MathUtils.clamp(cz - Math.sin(angle) * reach, -D / 2 + 0.1, D / 2 - 0.1)];
      const to: XZ = [THREE.MathUtils.clamp(cx + Math.cos(angle) * reach, -W / 2 + 0.1, W / 2 - 0.1), THREE.MathUtils.clamp(cz + Math.sin(angle) * reach, -D / 2 + 0.1, D / 2 - 0.1)];
      const width = 0.07 + random() * 0.14;
      flat(ribbon(wander(from, to, 10, 0.5), () => width, 0.004 + i * 0.0004), i % 2 ? paleStain : stainMat);
    }
    // Two live cracks bound the pan. The front one is the wide fissure beside the hero.
    const wide = wander([-2.2, D / 2 - 0.05], [W / 2 - 0.05, -1.2], 16, 0.7);
    const narrow = wander([-W / 2 + 0.05, -1.7], [2.2, -D / 2 + 0.05], 14, 0.5);
    const wideHalf = (t: number) => 0.2 + Math.sin(Math.min(1, t * 1.3) * Math.PI) * 0.42;
    flat(ribbon(wide, (t) => wideHalf(t) + 0.95, 0.012), paleStain);
    flat(ribbon(wide, (t) => wideHalf(t) + 0.4, 0.016), stainMat);
    flat(ribbon(narrow, () => 0.6, 0.012), paleStain);
    flat(ribbon(narrow, () => 0.27, 0.016), stainMat);
    flat(ribbon(narrow, (t) => 0.05 + Math.sin(t * Math.PI) * 0.07, 0.022), new THREE.MeshStandardMaterial({ color: '#0b1a26', roughness: 0.5, side: THREE.DoubleSide }));
    const glowColour = a.fissure === 'glowing' ? '#35f0c8' : '#0d5d8c';
    const abyss = new THREE.MeshStandardMaterial({
      color: a.fissure === 'refrozen' ? '#eaf6fb' : '#04121c', emissive: a.fissure === 'refrozen' ? '#000000' : glowColour,
      emissiveIntensity: a.fissure === 'glowing' ? mix(1.2, 2.2, mood.cheer) : 0.35, roughness: a.fissure === 'refrozen' ? 0.15 : 0.4, side: THREE.DoubleSide,
    });
    flat(ribbon(wide, wideHalf, 0.024), abyss);
    if (a.fissure === 'glowing') {
      pulse.push(abyss);
      const haze = new THREE.MeshStandardMaterial({ color: glowColour, emissive: glowColour, emissiveIntensity: 1, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 2; i < wide.length - 2; i++) { const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), haze); sheet.position.set(wide[i][0], 0.65, wide[i][1]); sheet.rotation.y = Math.atan2(wide[i + 1][0] - wide[i][0], wide[i + 1][1] - wide[i][1]) + Math.PI / 2; s.root.add(sheet); }
    }
    if (a.fissure === 'spreading') {
      const fresh = new THREE.MeshStandardMaterial({ color: '#0e2233', roughness: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) {
        const start = wide[4 + i], target: XZ = [SLOTS[0][0] + (random() - 0.5) * 5, SLOTS[0][1] + (random() - 0.5) * 3];
        const reach = 0.45 + random() * 0.4;
        const end: XZ = [mix(start[0], target[0], reach), mix(start[1], target[1], reach)];
        const path = wander(start, end, 5, 0.5);
        flat(ribbon(path, (t) => 0.07 * (1 - t) + 0.012, 0.026), fresh);
        const fork: XZ = [end[0] + (random() - 0.5) * 2, end[1] + (random() - 0.5) * 2];
        flat(ribbon(wander(path[3], fork, 3, 0.3), (t) => 0.04 * (1 - t) + 0.008, 0.026), fresh);
      }
    }

    // ---- Relief: blocks, ridges, rafts, spikes ----
    interface Lump { at: THREE.Vector3; turn: THREE.Euler; size: THREE.Vector3; tone: number }
    const lumps: Lump[] = [];
    const lump = (x: number, z: number, size: number, tall = 0.7, margin = 2.2) => {
      if (Math.abs(x) > W / 2 - 0.3 || Math.abs(z) > D / 2 - 0.3 || !clearOf(x, z, margin)) return;
      lumps.push({ at: new THREE.Vector3(x, size * tall * 0.35, z), turn: new THREE.Euler(random() * 0.6, random() * 6, random() * 0.6), size: new THREE.Vector3(size, size * tall, size * (0.7 + random() * 0.6)), tone: random() });
    };
    const ridgeScale = a.terrain === 'ridged' ? 1.7 : a.terrain === 'plain' ? 0.6 : 1;
    const flank = (path: XZ[], gap: (t: number) => number, per: number, size: number) => {
      for (let i = 0; i < path.length - 1; i++) for (let k = 0; k < per; k++) {
        const t = (i + random()) / (path.length - 1), [x0, z0] = path[i], [x1, z1] = path[i + 1], u = random();
        const length = Math.hypot(x1 - x0, z1 - z0), ox = -(z1 - z0) / length, oz = (x1 - x0) / length;
        for (const side of [-1, 1]) { const off = gap(t) + 0.25 + random() * 0.5 * ridgeScale; lump(mix(x0, x1, u) + ox * off * side, mix(z0, z1, u) + oz * off * side, size * (0.6 + random() * 0.8) * ridgeScale, 0.8, 1.9); }
      }
    };
    flank(wide, wideHalf, Math.round(mix(2, 4, mood.density)), 0.45);
    flank(narrow, () => 0.1, Math.round(mix(1, 3, mood.density)), 0.35);
    // A horizon ridge along the back edge, so the planet rises from behind terrain.
    for (let x = -W / 2 + 0.4; x < W / 2; x += 0.55) {
      const size = 0.7 + random() * 0.9 + Math.sin(x * 0.7) * 0.25;
      lumps.push({ at: new THREE.Vector3(x, size * 0.3, -D / 2 + 0.5 + random() * 0.5), turn: new THREE.Euler(random() * 0.5, random() * 6, random() * 0.5), size: new THREE.Vector3(size, size * 0.9, size), tone: random() });
    }
    for (let z = -D / 2 + 0.6; z < 0; z += 0.7) { const size = 0.5 + random() * 0.6; lumps.push({ at: new THREE.Vector3(-W / 2 + 0.5 + random() * 0.4, size * 0.3, z), turn: new THREE.Euler(random() * 0.5, random() * 6, 0), size: new THREE.Vector3(size, size * 0.8, size), tone: random() }); }
    // Low ridges wandering across the plain.
    const ridges = a.terrain === 'plain' ? 2 : a.terrain === 'ridged' ? 5 : 3;
    for (let r = 0; r < ridges; r++) {
      const path = wander([(random() - 0.5) * W, (random() - 0.5) * D], [(random() - 0.5) * W, (random() - 0.5) * D], 12, 0.8);
      for (const [x, z] of path) for (let k = 0; k < 2; k++) lump(x + (random() - 0.5) * 0.5, z + (random() - 0.5) * 0.5, (0.3 + random() * 0.35) * ridgeScale, 0.7, 2.4);
    }
    const blocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.7, 0), ice, Math.max(1, lumps.length));
    const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion();
    lumps.forEach((item, index) => {
      blocks.setMatrixAt(index, matrix.compose(item.at, quaternion.setFromEuler(item.turn), item.size));
      blocks.setColorAt(index, new THREE.Color().setHSL(0.56, 0.4, mix(0.7, 0.95, item.tone)));
    });
    blocks.castShadow = blocks.receiveShadow = true;
    s.root.add(blocks);

    if (a.terrain === 'chaos') {
      const rafts = Math.round(mix(7, 15, mood.density));
      for (let i = 0; i < rafts; i++) {
        const x = (random() - 0.5) * (W - 2), z = (random() - 0.5) * (D - 2), size = 1.2 + random() * 1.6;
        if (!clearOf(x, z, 2.4 + size * 0.5)) continue;
        const raft = s.box([size, 0.35 + random() * 0.3, size * (0.6 + random() * 0.5)], [x, 0.25 + random() * 0.25, z], ice);
        raft.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
        const cap = s.box([size * 0.96, 0.03, size * 0.55], [0, 0, 0], s.material('#f1f8fb', { roughness: 0.95 }));
        cap.position.copy(raft.position); cap.rotation.copy(raft.rotation); cap.translateY(0.3);
      }
    } else if (a.terrain === 'spikes') {
      const blades: { at: THREE.Vector3; h: number }[] = [];
      for (let patch = 0; patch < 9; patch++) {
        const cx = (random() - 0.5) * (W - 2), cz = (random() - 0.5) * (D - 2);
        for (let i = 0; i < 14; i++) { const x = cx + (random() - 0.5) * 2.6, z = cz + (random() - 0.5) * 2.0; if (clearOf(x, z, 2.4) && Math.abs(x) < W / 2 - 0.3 && Math.abs(z) < D / 2 - 0.3) blades.push({ at: new THREE.Vector3(x, 0, z), h: 0.5 + random() * 1.3 }); }
      }
      const spikes = new THREE.InstancedMesh(new THREE.ConeGeometry(0.22, 1, 4), s.material('#d9ecf5', { roughness: 0.3, flatShading: true }), Math.max(1, blades.length));
      blades.forEach((blade, index) => {
        spikes.setMatrixAt(index, matrix.compose(blade.at.setY(blade.h * 0.48), quaternion.setFromEuler(new THREE.Euler(0.12, 0.6, -0.3)), new THREE.Vector3(1.6, blade.h, 0.55)));
      });
      spikes.castShadow = true; s.root.add(spikes);
    }

    // ---- Vapour over the wide fissure, strongest beside the hero ----
    const puffs: THREE.Mesh[] = [];
    const vapourCount = a.fissure === 'refrozen' ? 0 : Math.round((a.fissure === 'venting' ? 16 : 6) * mix(0.6, 1.4, mood.energy));
    const vapour = new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: darkSky ? 0.16 : 0.24, depthWrite: false, roughness: 1 });
    for (let i = 0; i < vapourCount; i++) {
      const at = wide[5 + Math.floor(random() * 6)];
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), vapour);
      puff.userData = { x: at[0] + (random() - 0.5) * 0.8, z: at[1] + (random() - 0.5) * 0.8, phase: random(), drift: (random() - 0.5) * 0.8 };
      s.root.add(puff); puffs.push(puff);
    }
    const rise = a.fissure === 'venting' ? 3.4 : 1.6;
    const setVapour = (time: number) => puffs.forEach((puff) => {
      const t = (puff.userData.phase + time * mix(0.03, 0.16, mood.energy)) % 1;
      puff.position.set(puff.userData.x + puff.userData.drift * t, 0.1 + t * rise, puff.userData.z - t * 0.5);
      puff.scale.set(0.18 + t * 0.6, 0.22 + t * 0.7, 0.18 + t * 0.6);
    });
    setVapour(0);

    // ---- The sky wall: stars and the parent planet, standing behind the back ridge ----
    const skyZ = -D / 2 - 1.3;
    if (darkSky) {
      const stars = Array.from({ length: Math.round(mix(50, 150, mood.density)) }, () => ({ at: [(random() - 0.5) * (W + 1), 0.6 + random() ** 0.8 * 7.5, skyZ - 0.6 - random() * 2] as [number, number, number], size: 0.018 + random() * random() * 0.06 }));
      const mesh = s.scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 2 }), stars);
      mesh.castShadow = false;
    }
    if (a.planet !== 'absent') {
      const radius = a.planet === 'looming' ? 5.6 : a.planet === 'blue' ? 2.9 : 3.5;
      const sink = radius * (a.planet === 'looming' ? 0.45 : 0.3); // how much of the disc is below the horizon
      const width = radius * (a.planet === 'ringed' ? 4.4 : 2), height = radius * 2 - sink + (a.planet === 'ringed' ? radius * 0.3 : 0);
      const px = 96 / radius * (a.planet === 'looming' ? 0.6 : 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * px); canvas.height = Math.round(height * px);
      const ctx = canvas.getContext('2d')!;
      const cx = canvas.width / 2, cy = canvas.height + sink * px - radius * px, r = radius * px;
      const palette = a.planet === 'blue' ? ['#7fb7d9', '#a9d3e8', '#5f9cc6', '#c5e3f0', '#6aa6cc'] : a.planet === 'ringed' ? ['#e3cf9a', '#d2b877', '#efe1b8', '#c9a964', '#e8d6a6'] : ['#d9b88a', '#f0dfc0', '#b9814f', '#e8cfa5', '#a86a44', '#f4e8d0', '#c79a66'];
      const tilt = a.planet === 'ringed' ? -0.35 : -0.12 + (random() - 0.5) * 0.2;
      const drawRing = (front: boolean) => {
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
        for (const [scale, colour, line] of [[1.95, '#d9c594', 0.12], [1.7, '#f0e3bd', 0.1], [1.48, '#b79f6c', 0.05]] as const) {
          ctx.strokeStyle = colour; ctx.lineWidth = r * line; ctx.beginPath();
          ctx.ellipse(0, 0, r * scale, r * scale * 0.2, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
        }
        ctx.restore();
      };
      if (a.planet === 'ringed') drawRing(false);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      ctx.translate(cx, cy); ctx.rotate(tilt);
      let y = -r * 1.2;
      while (y < r * 1.2) {
        const band = r * (0.05 + random() * 0.16);
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.beginPath(); ctx.moveTo(-r * 1.3, y);
        for (let x = -r * 1.3; x <= r * 1.3; x += r * 0.1) ctx.lineTo(x, y + Math.sin(x * 0.02 + y) * r * 0.012);
        ctx.lineTo(r * 1.3, y + band + 2); ctx.lineTo(-r * 1.3, y + band + 2); ctx.fill();
        y += band;
      }
      if (a.planet === 'banded' || a.planet === 'looming') {
        ctx.fillStyle = '#b5482e'; ctx.beginPath(); ctx.ellipse(r * 0.3, -r * 0.34, r * 0.17, r * 0.085, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#f0dfc0'; ctx.lineWidth = r * 0.02; ctx.stroke();
      }
      ctx.restore();
      // Shading: a soft terminator, or almost total darkness for the crescent.
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
      if (a.planet === 'crescent') {
        ctx.fillStyle = a.sky === 'haze' ? '#8fa3b3' : '#05070b';
        ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.1, r * 1.02, 0, Math.PI * 2); ctx.fill();
      } else {
        const shade = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.5, cx - r * 0.2, cy - r * 0.2, r * 1.35);
        shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(8,10,25,0.75)');
        ctx.fillStyle = shade; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
      if (a.planet === 'ringed') drawRing(true);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const disc = s.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: mix(0.75, 1.0, mood.cheer), color: '#000000', alphaTest: 0.5, transparent: false, roughness: 1 }),
        [a.planet === 'looming' ? 1.0 : 2.6 + (random() - 0.5) * 3, height / 2 - 0.5, skyZ - 0.8]);
      disc.castShadow = disc.receiveShadow = false;
      // Face the camera, so the disc stays round.
      disc.rotation.set(-27 * Math.PI / 180 * 0.6, 27 * Math.PI / 180, 0, 'YXZ');
    }

    // ---- Traces ----
    const beaconMats: THREE.MeshStandardMaterial[] = [];
    const steel = s.material('#8c969b', { metalness: 0.7, roughness: 0.4 });
    if (a.traces === 'wands') {
      const path = wander([-7.2, 5.4], [-1.9, 2.9], 7, 0.6);
      path.forEach(([x, z], i) => {
        const lean = (random() - 0.5) * 0.2;
        s.rod([x, 0, z], [x + lean, 1.1, z], 0.014, steel);
        s.box([0.3, 0.2, 0.012], [x + lean + 0.15, 0.98, z], s.material(i % 2 ? '#f0331e' : '#f27c1f', { emissive: '#f0331e', emissiveIntensity: 0.35 })).rotation.y = (random() - 0.5) * 0.8;
      });
    } else if (a.traces === 'tracks') {
      const rut = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8fb0c4').lerp(iceColour, 0.2), roughness: 1, side: THREE.DoubleSide });
      const path = wander([-W / 2 + 0.1, 3.9], [W / 2 - 0.1, -4.9], 14, 0.5);
      for (const off of [-0.45, 0.45]) flat(ribbon(path.map(([x, z]) => [x + off * 0.4, z + off] as XZ), () => 0.1, 0.02), rut);
    } else if (a.traces === 'beacons') {
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2 + 0.3, x = SLOTS[0][0] + Math.cos(angle) * 2.6, z = SLOTS[0][1] + Math.sin(angle) * 2.4;
        if (Math.abs(x) > W / 2 - 0.3 || Math.abs(z) > D / 2 - 0.3) continue;
        const lamp = s.material('#ffb040', { emissive: mood.cheer > 0.5 ? '#ffb040' : '#ff3a2a', emissiveIntensity: 2 });
        beaconMats.push(lamp);
        s.cylinder(0.09, 0.13, 0.25, [x, 0.125, z], steel, 8);
        s.ball([0.07, 0.07, 0.07], [x, 0.31, z], lamp, 8);
      }
    } else if (a.traces === 'camp') {
      const tent = s.mesh(new THREE.SphereGeometry(1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#e9772a', { roughness: 0.85 }), [-6.4, 0, 4.2]);
      tent.scale.y = 0.75;
      s.mesh(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#2a2f33'), [-5.6, 0, 4.9]).scale.set(1, 0.9, 0.5);
      s.box([0.6, 0.4, 0.45], [-4.9, 0.2, 5.3], s.material('#3d6f8e')).rotation.y = 0.4;
      s.box([0.5, 0.35, 0.4], [-4.6, 0.17, 4.6], s.material('#d8d2c2')).rotation.y = -0.2;
      s.rod([-7.6, 0, 5.4], [-7.6, 1.8, 5.4], 0.02, steel);
      s.box([0.5, 0.3, 0.012], [-7.35, 1.62, 5.4], s.material('#e23b3b', { emissive: '#e23b3b', emissiveIntensity: 0.3 }));
    }

    const bases = pulse.map((material) => material.emissiveIntensity);
    world.update = (dt, time) => {
      setVapour(time);
      pulse.forEach((material, index) => { material.emissiveIntensity = bases[index] * (0.7 + 0.3 * Math.sin(time * mix(0.4, 2.2, mood.energy) + index * 1.7)); });
      beaconMats.forEach((material, index) => { material.emissiveIntensity = Math.sin(time * mix(1.5, 6, mood.energy) + index * 0.8) > 0.3 ? 2.4 : 0.15; });
      if (shadow) shadow.position.x = -0.5 + Math.sin(time * mix(0.03, 0.25, mood.energy)) * 1.2;
    };
    return world;
  },
});
