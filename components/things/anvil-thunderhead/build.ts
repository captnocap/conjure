import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score, visibleBounds, disposeTree } from '@conjure/kit';

interface Lump { x: number; y: number; z: number; sx: number; sy: number; sz: number; t: number; lit?: boolean }

function veilTexture(random: () => number, virga: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  for (let x = 0; x < 128; x++) {
    const edge = Math.sin(x / 127 * Math.PI) ** 0.6;
    const streak = 0.35 + 0.65 * random() * (0.5 + 0.5 * Math.sin(x * 0.4 + random() * 2));
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, `rgba(255,255,255,${0.95 * edge * streak})`);
    gradient.addColorStop(virga ? 0.45 : 0.8, `rgba(255,255,255,${(virga ? 0.3 : 0.85) * edge * streak})`);
    gradient.addColorStop(virga ? 0.7 : 1, `rgba(255,255,255,${virga ? 0 : 0.75 * edge * streak})`);
    gradient.addColorStop(1, `rgba(255,255,255,${virga ? 0 : 0.75 * edge * streak})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, 1, 256);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export default defineThing({
  questions: {
    stage: choice('What stage is the storm at?', {
      towering: 'A young tower still climbing: crisp cauliflower heads, no anvil yet.',
      mature: 'The classic: a thick column under a flat anvil, textbook cumulonimbus.',
      spreading: 'Old and enormous: the anvil has spread into a vast flat table over a dwindling stem.',
      supercell: 'A leaning, rotating supercell with a stacked, striated base like a hovering saucer.',
      collapsing: 'Raining itself out: ragged, hollowed, the tower dissolving into the veil.',
    }),
    anvil: choice('If it has an anvil, what shape is it?', {
      table: 'A clean flat table, sharp-edged.',
      streaming: 'Blown far out to one side in a long wedge.',
      overshoot: 'Flat with a boiling dome punching up through the middle.',
      ragged: 'Fibrous and fraying at the edges, hung with pouches underneath.',
    }),
    rain: choice('What falls from it?', {
      shaft: 'One narrow dark shaft of rain reaching the ground.',
      curtain: 'A broad grey curtain blotting out the horizon beneath.',
      virga: 'Trails of rain that evaporate before they land.',
      none: 'Nothing yet: a dry dark base and its shadow on the ground.',
    }),
    light: choice('Is it lit from inside?', {
      dark: 'No: it is only cloud.',
      glow: 'A patch of the tower glows from a flash buried inside it.',
      bolt: 'A bolt runs from the base to the ground.',
      both: 'It flickers inside and throws bolts as well.',
    }),
    tone: choice('What colour is the cloud?', {
      white: 'Brilliant white heads over a blue-grey base.',
      bruised: 'Bruised slate and indigo, heavy.',
      ember: 'Lit by a low sun: salmon and peach on violet.',
      ash: 'Flat ash grey, colourless.',
    }),
    reach: score('How much of the sky does it own?', ['A lone small cell far away', 'A big storm', 'A wall of weather with flanking towers']),
    foot: choice('What is at its foot?', {
      shadow: 'Only its own dark shadow on the ground.',
      dust: 'A rolling front of dust kicked up ahead of the rain.',
      shelf: 'A low dark shelf cloud jutting out ahead like a ledge.',
      scud: 'Torn scraps of low cloud racing under the base.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = {
      white: ['#8a95a4', '#dfe4e8', '#ffffff'], bruised: ['#434859', '#7c8297', '#d5d8e0'], ember: ['#5a4968', '#dc8d70', '#f8d9b8'], ash: ['#696c70', '#a8aaaa', '#d8d8d4'],
    }[a.tone].map((hex) => new THREE.Color(hex));
    palette[0].lerp(new THREE.Color('#b9c0c8'), mood.cheer * 0.2).lerp(new THREE.Color('#2e3140'), (1 - mood.cheer) * 0.18);
    const tint = new THREE.Color(mood.warmth > 0.5 ? '#ffc79a' : '#b9d0f0');
    for (const colour of palette.slice(1)) colour.lerp(tint, Math.abs(mood.warmth - 0.5) * 0.25);
    const shade = (t: number) => (t < 0.45 ? palette[0].clone().lerp(palette[1], Math.max(0, t) / 0.45) : palette[1].clone().lerp(palette[2], Math.min(1, (t - 0.45) / 0.55)));

    const lumps: Lump[] = [];
    const BASE = 300, TOP = a.stage === 'towering' ? 1000 : 930;
    const collapsing = a.stage === 'collapsing', supercell = a.stage === 'supercell';
    const stem = { towering: 250, mature: 240, spreading: 170, supercell: 230, collapsing: 210 }[a.stage];
    const lean = supercell ? 260 : (random() - 0.5) * 120;

    const tower = (cx: number, cz: number, k: number, base: number, top: number, radius: number, tilt: number, crown: boolean) => {
      const levels = Math.max(4, Math.round((top - base) / (95 * k)));
      for (let level = 0; level <= levels; level++) {
        const t = level / levels;
        const waist = radius * (crown ? mix(1.05, 0.55, t ** 1.4) + 0.2 * Math.sin(t * 9) : 1.0 - 0.28 * Math.sin(t * Math.PI) + (t > 0.8 ? (t - 0.8) * 1.2 : 0));
        const y = mix(base, top, t), x0 = cx + tilt * t;
        const count = Math.round(mix(7, 10, random()) * (collapsing ? 0.6 : 1));
        for (let i = 0; i < count; i++) {
          const angle = i / count * Math.PI * 2 + level * 0.7 + random() * 0.5;
          const d = waist * mix(0.55, 1, random());
          const size = radius * mix(0.42, 0.7, random()) * (crown ? mix(1, 0.75, t) : 1);
          lumps.push({ x: x0 + Math.cos(angle) * d, y: y + (random() - 0.5) * 40 * k, z: cz + Math.sin(angle) * d * 0.85, sx: size, sy: size * mix(0.75, 0.95, random()), sz: size, t: (y - BASE) / (TOP + 150 - BASE) });
        }
        lumps.push({ x: x0, y, z: cz, sx: waist * 0.8, sy: 70 * k + waist * 0.25, sz: waist * 0.75, t: (y - BASE) / (TOP + 150 - BASE) - 0.08 });
      }
      if (crown) for (let i = 0; i < 6; i++) lumps.push({ x: cx + tilt + (random() - 0.5) * radius * 0.7, y: top + mix(20, 90, random()) * k, z: cz + (random() - 0.5) * radius * 0.6, sx: radius * 0.45, sy: radius * 0.42, sz: radius * 0.45, t: 1 });
    };
    tower(0, 0, 1, BASE + 40, TOP, stem, lean, a.stage === 'towering');
    // A flat dark base under everything.
    const baseR = stem * (supercell ? 1.5 : 1.25);
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * Math.PI * 2, d = baseR * mix(0.3, 0.9, random());
      lumps.push({ x: Math.cos(angle) * d, y: BASE + 30, z: Math.sin(angle) * d * 0.8, sx: baseR * 0.5, sy: 38, sz: baseR * 0.45, t: -0.05 });
    }
    if (supercell) for (let i = 0; i < 3; i++) lumps.push({ x: lean * 0.08 * i, y: BASE + 55 + i * 62, z: 0, sx: baseR * (1.25 - i * 0.16), sy: 30, sz: baseR * (1.1 - i * 0.14), t: 0.04 + i * 0.05 });
    if (supercell) lumps.push({ x: -baseR * 0.35, y: BASE - 25, z: 40, sx: 95, sy: 50, sz: 85, t: -0.1 });

    // The anvil.
    const AY = TOP + 60;
    if (a.stage !== 'towering') {
      const Ra = { mature: 560, spreading: 760, supercell: 640, collapsing: 520 }[a.stage as 'mature'] * mix(0.92, 1.08, random());
      const downwind = a.anvil === 'streaming' ? 0.55 : supercell ? 0.35 : 0.08;
      const ax = lean + Ra * downwind;
      lumps.push({ x: ax, y: AY, z: 0, sx: Ra * (0.86 + downwind * 0.5), sy: 62, sz: Ra * 0.56, t: 0.82 });
      lumps.push({ x: lean, y: AY - 55, z: 0, sx: stem * 1.25, sy: 80, sz: stem * 1.1, t: 0.7 });
      const count = Math.round(mix(34, 52, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2 + random() * 0.3;
        const d = Math.sqrt(mix(0.25, 1, random()));
        const stretch = Math.cos(angle) > 0 ? 1 + downwind * 1.6 : 1 - downwind * 0.5;
        const size = mix(95, 150, random());
        const fray = a.anvil === 'ragged' || collapsing ? mix(0.5, 1.5, random()) : 1;
        if (a.anvil === 'table' && d > 0.9) continue;
        lumps.push({ x: ax + Math.cos(angle) * d * Ra * stretch, y: AY + (random() - 0.5) * 22, z: Math.sin(angle) * d * Ra * 0.62, sx: size * 1.5 * fray, sy: size * (a.anvil === 'table' ? 0.34 : 0.42) / fray, sz: size * 1.2, t: mix(0.8, 1, random()) });
      }
      if (a.anvil === 'overshoot') for (let i = 0; i < 7; i++) lumps.push({ x: lean + (random() - 0.5) * 220, y: AY + mix(50, 120, random()), z: (random() - 0.5) * 160, sx: mix(90, 150, random()), sy: mix(70, 110, random()), sz: mix(90, 140, random()), t: 1 });
      if (a.anvil === 'ragged') for (let i = 0; i < 22; i++) { const angle = random() * 6.3, d = mix(0.35, 0.9, random()); lumps.push({ x: ax + Math.cos(angle) * d * Ra, y: AY - 62, z: Math.sin(angle) * d * Ra * 0.55, sx: 38, sy: 30, sz: 38, t: 0.5 }); }
    }

    // Flanking towers when it owns the sky.
    const reach = Math.min(1, a.reach * 0.85 + mood.density * 0.2);
    const flanks = Math.round(reach * 4);
    for (let i = 0; i < flanks; i++) {
      const side = i % 2 ? 1 : -1, k = mix(0.3, 0.55, random());
      tower(side * mix(560, 780, random()) + lean * 0.3, mix(-120, 160, random()), k, BASE + 20, BASE + mix(260, 520, random()), stem * k * 1.1, side * 30, true);
    }
    // At its foot.
    if (a.foot === 'shelf') for (let i = 0; i < 9; i++) lumps.push({ x: mix(-baseR * 1.5, baseR * 1.5, i / 8), y: BASE - 40 + Math.abs(i - 4) * 6, z: baseR * 0.75 + (random() - 0.5) * 30, sx: baseR * 0.3, sy: 36, sz: 95, t: -0.12 });
    if (a.foot === 'scud') for (let i = 0; i < 10; i++) lumps.push({ x: (random() - 0.5) * baseR * 2.8, y: BASE - mix(40, 110, random()), z: (random() - 0.5) * baseR * 1.4, sx: mix(45, 95, random()), sy: mix(14, 26, random()), sz: mix(30, 60, random()), t: -0.02 });

    // Which lumps hold the flash.
    const glowing = a.light === 'glow' || a.light === 'both';
    if (glowing) {
      const gx = lean * 0.5 + (random() - 0.5) * stem, gy = mix(BASE + 200, TOP - 150, random()), gz = stem * 0.4;
      for (const lump of lumps) if (Math.hypot(lump.x - gx, (lump.y - gy) * 0.8, lump.z - gz) < stem * 0.95) lump.lit = true;
    }

    const sphere = new THREE.SphereGeometry(1, 14, 10);
    const dummy = new THREE.Object3D();
    const cloud = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const flashColour = new THREE.Color(mood.warmth > 0.55 ? '#ffd9a0' : '#cfc4ff');
    const litPaint = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, emissive: flashColour, emissiveIntensity: 0.9 });
    for (const [group, paint] of [[lumps.filter((lump) => !lump.lit), cloud], [lumps.filter((lump) => lump.lit), litPaint]] as const) {
      if (!group.length) continue;
      const mesh = new THREE.InstancedMesh(sphere, paint, group.length);
      group.forEach((lump, i) => {
        dummy.position.set(lump.x, lump.y, lump.z);
        dummy.rotation.set(0, random() * 6.3, 0);
        dummy.scale.set(lump.sx, lump.sy, lump.sz);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, shade(lump.t + (random() - 0.5) * 0.06));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // Shadow or wet ground beneath: also what the storm stands on.
    const wet = a.rain === 'shaft' || a.rain === 'curtain';
    const ground = s.cylinder(baseR * 1.5, baseR * 1.6, 6, [lean * 0.1, 3, 0], new THREE.MeshStandardMaterial({ color: wet ? '#8d969c' : '#a3a9ac', roughness: wet ? 0.35 : 1, metalness: wet ? 0.3 : 0 }), 40);
    ground.scale.z = 0.7;
    ground.castShadow = false;

    // Rain.
    const slant = mix(20, 260, mood.energy) * (random() < 0.5 ? -1 : 1);
    if (a.rain !== 'none') {
      const map = veilTexture(random, a.rain === 'virga');
      const width = a.rain === 'curtain' ? baseR * 3.1 : a.rain === 'virga' ? baseR * 2.0 : baseR * 1.0;
      const veil = new THREE.MeshBasicMaterial({ map, color: palette[0].clone().multiplyScalar(0.55), transparent: true, opacity: collapsing ? 1 : 0.92, depthWrite: false, side: THREE.DoubleSide });
      const sheets = a.rain === 'curtain' ? 4 : 3;
      for (let i = 0; i < sheets; i++) {
        const geometry = new THREE.PlaneGeometry(width * mix(0.8, 1.1, random()), BASE + 40, 1, 6);
        const position = geometry.attributes.position;
        for (let v = 0; v < position.count; v++) { const fall = 0.5 - position.getY(v) / (BASE + 40); position.setX(v, position.getX(v) + slant * fall * fall); }
        const sheet = new THREE.Mesh(geometry, veil);
        sheet.position.set((a.rain === 'shaft' ? (random() - 0.5) * baseR * 0.8 : 0) + (random() - 0.5) * 40, (BASE + 40) / 2, (i - (sheets - 1) / 2) * baseR * 0.55 + baseR * 0.25);
        sheet.rotation.y = (i - (sheets - 1) / 2) * 0.28;
        sheet.renderOrder = 2;
        s.root.add(sheet);
      }
    }
    // Dust front.
    if (a.foot === 'dust') {
      const dust = new THREE.MeshStandardMaterial({ color: '#cdbb9d', roughness: 1 });
      const puffs = Array.from({ length: 34 }, (_unused, i) => ({ at: [mix(-baseR * 1.7, baseR * 1.7, i / 33) + (random() - 0.5) * 40, mix(10, 55, random()), baseR * 0.8 + (random() - 0.5) * 150] as const, size: mix(28, 62, random()) }));
      s.scatter(sphere, dust, puffs);
    }

    // Bolts.
    const bolts: THREE.Mesh[] = [];
    const boltPaint = new THREE.MeshStandardMaterial({ color: '#fffdf0', emissive: flashColour.clone().lerp(new THREE.Color('#ffffff'), 0.5), emissiveIntensity: 3, roughness: 0.4 });
    if (a.light === 'bolt' || a.light === 'both') {
      const count = a.light === 'both' ? 2 : 1 + (mood.energy > 0.7 ? 1 : 0);
      for (let b = 0; b < count; b++) {
        let x = (random() - 0.5) * baseR * 1.2, z = baseR * 0.3 + random() * 60;
        const points: [number, number, number][] = [];
        for (let y = BASE + 30; y > 0; y -= 34) { points.push([x, y, z]); x += (random() - 0.5) * 55; z += (random() - 0.5) * 20; }
        points.push([x, 2, z]);
        for (let i = 0; i < points.length - 1; i++) bolts.push(s.rod(points[i], points[i + 1], 7, boltPaint));
        // One fork.
        const from = points[Math.floor(points.length * 0.4)];
        bolts.push(s.rod(from, [from[0] + 60, from[1] - 45, from[2]], 3.5, boltPaint), s.rod([from[0] + 60, from[1] - 45, from[2]], [from[0] + 75, from[1] - 95, from[2] + 10], 2.5, boltPaint));
      }
      for (const bolt of bolts) bolt.castShadow = false;
    }

    // Keep the whole storm inside a sane size, standing on the ground, centred.
    const bounds = visibleBounds(s.root);
    const size = bounds.getSize(new THREE.Vector3());
    const fit = Math.min(1, 1700 / Math.hypot(size.x, size.z), 1700 / size.y);
    const centre = bounds.getCenter(new THREE.Vector3());
    s.root.scale.setScalar(fit);
    s.root.position.set(-centre.x * fit, 0, -centre.z * fit);
    const rate = mix(0.6, 5, mood.energy), phase = random() * 10;
    const animated = glowing || bolts.length > 0;
    return {
      object: s.root,
      update: animated ? (_dt, time) => {
        const flicker = Math.max(0, Math.sin(time * rate + phase) * Math.sin(time * rate * 2.7 + phase * 2) * Math.sin(time * rate * 6.1));
        litPaint.emissiveIntensity = 0.55 + flicker * 2.2;
        boltPaint.emissiveIntensity = 2 + flicker * 4;
      } : undefined,
      dispose: () => disposeTree(s.root),
    };
  },
});
