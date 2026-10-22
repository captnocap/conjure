import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type Style = 'pastel' | 'micrograph' | 'glossy';
type Cell = 'red' | 'neuron' | 'bacterium' | 'plant';

const HEADS: Record<Style, Record<Cell, [string, string]>> = {
  pastel: { red: ['#f0918f', '#f6cbbd'], neuron: ['#f0a08e', '#8fbadf'], bacterium: ['#eab874', '#b5d38a'], plant: ['#9fd39a', '#f1e2a0'] },
  micrograph: { red: ['#cfcac6', '#a19c99'], neuron: ['#cbcac4', '#9c9d99'], bacterium: ['#cdcbc2', '#a3a299'], plant: ['#c8cbc2', '#a0a399'] },
  glossy: { red: ['#e8313f', '#ff8a7a'], neuron: ['#f2553c', '#ffc93a'], bacterium: ['#ff9f1c', '#7fd13b'], plant: ['#3fbf4f', '#ffe14d'] },
};
const TAILS: Record<Style, [string, string]> = { pastel: ['#f3d98a', '#e2bf6a'], micrograph: ['#7d7d78', '#62625d'], glossy: ['#ffe6a0', '#e9b84f'] };
const CYTOPLASM: Record<Cell, string> = { red: '#f4c0b6', neuron: '#e8daf2', bacterium: '#e0ebd2', plant: '#dcefcc' };
const WATER = { clear: '#edf5f6', crowded: '#eef0e6', plasma: '#f5ecd2', sea: '#dcefec' } as const;
const PROTEIN: Record<Style, string[]> = {
  pastel: ['#a98bd6', '#7fc7a8', '#f2b36b', '#e87f9a', '#7fa9d8'],
  micrograph: ['#8e8f8a', '#b4b4ad', '#6e6f6b', '#d5d4cd', '#7d7e79'],
  glossy: ['#2f7de0', '#18b38a', '#9a4be0', '#ff8a1f', '#e8264a'],
};
const SUGARS: Record<Style, string[]> = {
  pastel: ['#6f9fdc', '#5cc48a', '#f4d65a', '#b77ac4', '#ef7f7f'],
  micrograph: ['#9a9a94', '#c4c4bc', '#75756f', '#b0b0a9', '#8a8a84'],
  glossy: ['#1f6fc2', '#14a654', '#f2cc12', '#a3439b', '#e5262c'],
};

export default defineWorld({
  questions: {
    cell: choice('Whose surface is this?', {
      red: 'A red blood cell: rosy lipid heads, a thick sugar coat and a hexagonal net of spectrin under the cut.',
      neuron: 'A neuron: two-tone heads dotted with glowing ion-channel pores, long microtubules running beneath.',
      bacterium: 'A bacterium: a criss-cross mesh of cell-wall strands over the membrane, hairs and a whip-like flagellum.',
      plant: 'A plant cell: a thick terraced wall of layered cellulose fibres behind, green chloroplasts glowing below.',
    }),
    state: choice('What is happening to the cell?', {
      resting: 'Resting: a calm, gently rolling sea.',
      dividing: 'Dividing: a deep furrow pinches across it while the far side swells into a second cell.',
      infected: 'Under viral attack: spiky viruses landing, sinking in and drifting down from above.',
      dying: 'Dying: bleached heads, swelling blisters, torn holes and floating debris.',
    }),
    fluid: choice('What fills the space above the membrane?', {
      clear: 'Clear bright water with a few drifting ions.',
      crowded: 'Crowded: thick with drifting proteins and small molecules jostling.',
      plasma: 'Blood plasma: a straw-tinted soup carrying proteins and Y-shaped antibodies.',
      sea: 'Sea water: blue-green and glittering with little salt crystals.',
    }),
    landmarks: choice('What stands tallest in the lipid sea?', {
      towers: 'Receptor towers: tall stacks of protein beads on stalks, like lighthouses.',
      buoys: 'Buoys: squat rounded channel proteins bobbing half-submerged everywhere.',
      pumps: 'Pumps: lollipop-headed rotary engines on thin stalks.',
      mixed: 'A mix of towers, buoys and pumps, a busy harbour.',
    }),
    sugar: score('How thick is the sugar-coat forest?', ['Nearly bare', 'A scattered fuzz', 'A dense forest']),
    style: choice('How is it drawn?', {
      pastel: 'Textbook pastel: soft coral and powder-blue lipid heads, butter-yellow tails, candy-coloured proteins.',
      micrograph: 'Electron-micrograph grey: everything in silvery greys and soft charcoal, grainy and scientific.',
      glossy: 'Glossy render: saturated, shiny lipid heads and proteins, like a biotech animation.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const style = a.style as Style;
    const cell = a.cell as Cell;
    const grey = style === 'micrograph';
    const tint = (hex: THREE.ColorRepresentation, pale = 0) => {
      const c = new THREE.Color(hex);
      c.offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.2, 0);
      c.lerp(new THREE.Color('#9a958a'), mood.wear * 0.2);
      if (pale > 0) c.lerp(new THREE.Color('#f5f2ec'), pale);
      return c;
    };
    const paint = (hex: THREE.ColorRepresentation, options: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({
      color: tint(hex), roughness: (style === 'glossy' ? 0.25 : grey ? 0.8 : 0.55) + mood.wear * 0.2, clearcoat: style === 'glossy' ? 0.7 : 0, ...options,
    });

    const background = new THREE.Color(WATER[a.fluid]);
    if (grey) background.lerp(new THREE.Color('#e4e4df'), 0.85);
    if (a.state === 'dying') background.lerp(new THREE.Color('#e9e4dc'), 0.4);
    background.offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0);
    const W = 14, D = 11;
    const SLOTS: [number, number][] = [[0, 1.3], [-3.6, -1.3], [3.6, -1.1], [-3.5, 2.9], [3.4, 3.1], [0, -2.9]];
    const { art, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: null, width: W, depth: D, pitch: 30, yaw: 24,
      maxHeight: 3.2, radius: 1.5, slots: SLOTS, viewBox: [[-W / 2, -2.3, -D / 2], [W / 2, 3, D / 2]],
    });
    world.background = background;
    const root = art.root;
    const Y = new THREE.Vector3(0, 1, 0);

    // The membrane's shape: rolling dunes, the story's features, flattened into pads where the cast stands.
    const pad = (x: number, z: number) => SLOTS.reduce((m, [sx, sz], i) => Math.min(m, 1 - Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / (2 * (i === 0 ? 1.35 : 1.1) ** 2))), 1);
    const phases = [random() * 6, random() * 6, random() * 6];
    const blebs = a.state === 'dying' ? Array.from({ length: 6 }, () => ({ x: (random() - 0.5) * W * 0.85, z: (random() - 0.5) * D * 0.85, h: mix(0.4, 0.9, random()) })) : [];
    const pits = a.state === 'dying' ? Array.from({ length: 4 }, () => ({ x: (random() - 0.5) * W * 0.8, z: (random() - 0.5) * D * 0.8, r: mix(0.35, 0.6, random()) })).filter((p) => pad(p.x, p.z) > 0.7) : [];
    const shape = (x: number, z: number) => {
      let h = 0.2 * Math.sin(0.5 * x + phases[0]) * Math.cos(0.42 * z + phases[1]) + 0.1 * Math.sin(0.9 * x - 0.7 * z + phases[2]);
      if (a.state === 'dividing') {
        const zc = -0.15 + 0.08 * x;
        h -= 0.85 * Math.exp(-((z - zc) ** 2) / (2 * 0.38 ** 2));
        h += 2.3 * THREE.MathUtils.smoothstep(-z, 3.7, 5.5);
      }
      for (const b of blebs) h += b.h * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (2 * 0.5 ** 2));
      return h * pad(x, z);
    };
    const energy = mix(0.25, 1.6, mood.energy);
    const amplitude = mix(0.03, 0.12, mood.energy) * (a.state === 'dying' ? 1.5 : 1);
    // The swell, with the pad flattening worked out once per point.
    const swell = (x: number, z: number, t: number) => 0.6 * Math.sin(0.6 * x + 0.9 * t) + 0.5 * Math.sin(0.5 * z - 0.7 * t + 1.3) + 0.35 * Math.sin(0.35 * (x - z) + 0.5 * t);
    const wave = (x: number, z: number, t: number) => amplitude * pad(x, z) * swell(x, z, t);

    // The bilayer: heads over the whole sea, and a cut face of heads and tails round the edge.
    const R = 0.13, T = 1.0, step = R * 2.05, row = step * Math.sqrt(3) / 2;
    const pale = a.state === 'dying' ? 0.55 : 0;
    const colours = HEADS[style][cell].map((hex) => tint(hex, pale));
    const share = cell === 'neuron' || style === 'glossy' ? 0.35 : 0.3;
    const heads: { x: number; z: number; y: number; c: THREE.Color }[] = [];
    const tails: { x: number; z: number; y: number; up: boolean; spin: number; reach: number }[] = [];
    for (let j = 0, z = -D / 2; z <= D / 2 + 1e-6; j++, z += row) {
      for (let x = -W / 2 + (j % 2 ? step / 2 : 0); x <= W / 2 + 1e-6; x += step) {
        const jx = x + (random() - 0.5) * R * 0.2, jz = z + (random() - 0.5) * R * 0.2;
        if (pits.some((p) => Math.hypot(jx - p.x, jz - p.z) < p.r)) continue;
        const s = shape(jx, jz);
        heads.push({ x: jx, z: jz, y: -R + s, c: colours[random() < share ? 1 : 0].clone().offsetHSL(0, 0, (random() - 0.5) * 0.04) });
        const edge = Math.abs(jx) > W / 2 - step * 1.05 || Math.abs(jz) > D / 2 - row * 1.05;
        if (edge) {
          heads.push({ x: jx, z: jz, y: -T + R + s, c: colours[random() < share ? 1 : 0].clone() });
          const reach = T / 2 - R * 1.55;
          tails.push({ x: jx, z: jz, y: -R * 1.7 + s, up: true, spin: random() * 6.28, reach: reach * mix(0.92, 1.04, random()) });
          tails.push({ x: jx, z: jz, y: -T + R * 1.7 + s, up: false, spin: random() * 6.28, reach: reach * mix(0.92, 1.04, random()) });
        }
      }
    }
    const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: (style === 'glossy' ? 0.25 : grey ? 0.8 : 0.55) + mood.wear * 0.2 }), heads.length);
    const m = new THREE.Matrix4();
    heads.forEach((h, i) => {
      headMesh.setMatrixAt(i, m.makeScale(R, R * 0.92, R).setPosition(h.x, h.y, h.z));
      headMesh.setColorAt(i, h.c);
    });
    headMesh.castShadow = headMesh.receiveShadow = true;
    const membrane = new THREE.Group();
    membrane.add(headMesh);
    root.add(membrane);
    world.ground = membrane;

    const tailA = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.32, 0, 0), new THREE.Vector3(-0.38, -0.33, 0.05), new THREE.Vector3(-0.3, -0.66, -0.04), new THREE.Vector3(-0.36, -1, 0)]);
    const tailB = new THREE.CatmullRomCurve3([new THREE.Vector3(0.32, 0, 0), new THREE.Vector3(0.36, -0.42, 0), new THREE.Vector3(0.62, -0.62, 0.05), new THREE.Vector3(0.66, -1, 0)]);
    const tailGeometry = mergeGeometries([new THREE.TubeGeometry(tailA, 8, 0.17, 4), new THREE.TubeGeometry(tailB, 8, 0.17, 4)])!;
    const tailMesh = new THREE.InstancedMesh(tailGeometry, new THREE.MeshStandardMaterial({ color: tint(TAILS[style][0], pale * 0.6), roughness: 0.7 }), tails.length);
    const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
    tails.forEach((t, i) => {
      const q = new THREE.Quaternion().setFromAxisAngle(Y, t.spin);
      tailMesh.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.y, t.z), t.up ? q : down.clone().multiply(q), new THREE.Vector3(R, t.reach, R)));
    });
    tailMesh.castShadow = tailMesh.receiveShadow = true;
    membrane.add(tailMesh);

    // The oily core behind the cut, following the same shape.
    const inset = step * 0.7;
    const coreGeometry = new THREE.BoxGeometry(W - inset * 2, T - R * 2.6, D - inset * 2, 36, 1, 28);
    const corePosition = coreGeometry.attributes.position;
    const coreBase = new Float32Array(corePosition.count);
    for (let i = 0; i < corePosition.count; i++) {
      coreBase[i] = corePosition.getY(i) - T / 2 + shape(corePosition.getX(i), corePosition.getZ(i));
      corePosition.setY(i, coreBase[i]);
    }
    coreGeometry.computeVertexNormals();
    const core = new THREE.Mesh(coreGeometry, new THREE.MeshStandardMaterial({ color: tint(TAILS[style][1], pale * 0.6), roughness: 0.9 }));
    core.receiveShadow = true;
    membrane.add(core);

    // Holes torn in a dying membrane: dark wells down into the cell.
    for (const p of pits) {
      const well = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r * 0.85, T * 0.9, 24, 1, true), new THREE.MeshStandardMaterial({ color: tint('#4a3b3a'), roughness: 1, side: THREE.DoubleSide }));
      well.position.set(p.x, -T * 0.45 + shape(p.x, p.z), p.z);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(p.r * 0.86, 24), new THREE.MeshStandardMaterial({ color: tint(CYTOPLASM[cell]).multiplyScalar(0.55), roughness: 1 }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(p.x, -T * 0.88 + shape(p.x, p.z), p.z);
      root.add(well, floor);
    }

    // The cytoplasm below: a glowing block painted with the cell's insides.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    const plasm = tint(CYTOPLASM[cell]);
    if (grey) plasm.lerp(new THREE.Color('#d8d8d3'), 0.85);
    const css = (c: THREE.Color, alpha = 1) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, css(plasm.clone().multiplyScalar(0.82)));
    gradient.addColorStop(0.22, css(plasm.clone().multiplyScalar(0.92)));
    gradient.addColorStop(1, css(plasm.clone().lerp(new THREE.Color('#ffffff'), 0.45)));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 160);
    const ink = plasm.clone().multiplyScalar(0.62);
    ctx.strokeStyle = css(ink, 0.6);
    ctx.fillStyle = css(ink, 0.45);
    ctx.lineWidth = 2;
    if (cell === 'red') {
      // Spectrin: a hexagonal net in the cortex.
      for (let x = 0; x < 1024; x += 26) for (let k = 0; k < 2; k++) {
        ctx.beginPath(); ctx.moveTo(x + k * 13, 6 + k * 14); ctx.lineTo(x + 13 + k * 13, 13 + k * 14); ctx.lineTo(x + 26 + k * 13, 6 + k * 14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 13 + k * 13, 13 + k * 14); ctx.lineTo(x + 13 + k * 13, 27 + k * 14); ctx.stroke();
      }
      for (let i = 0; i < 260; i++) { ctx.beginPath(); ctx.arc(random() * 1024, 40 + random() * 115, 2 + random() * 2.5, 0, 7); ctx.fill(); }
    } else if (cell === 'neuron') {
      for (let k = 0; k < 6; k++) { const y = 40 + k * 18 + random() * 6; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.01 + k) * 3); ctx.stroke(); }
      for (let i = 0; i < 26; i++) { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(random() * 1024, 30 + random() * 120, 5 + random() * 5, 0, 7); ctx.stroke(); }
    } else if (cell === 'bacterium') {
      for (let i = 0; i < 420; i++) { ctx.beginPath(); ctx.arc(random() * 1024, 24 + random() * 130, 1.5 + random() * 1.5, 0, 7); ctx.fill(); }
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 5; k++) { ctx.beginPath(); let x = random() * 1024, y = 60 + random() * 80; ctx.moveTo(x, y); for (let s = 0; s < 30; s++) { x += 6 + random() * 6; y += (random() - 0.5) * 16; ctx.lineTo(x, Math.min(156, Math.max(30, y))); } ctx.stroke(); }
    } else {
      for (let i = 0; i < 9; i++) {
        const x = 40 + i * 112 + random() * 40, y = 70 + random() * 50;
        ctx.fillStyle = css(tint(grey ? '#8a8a84' : '#5fae4a'), 0.85);
        ctx.beginPath(); ctx.ellipse(x, y, 38, 15, random() - 0.5, 0, 7); ctx.fill();
        ctx.strokeStyle = css(tint(grey ? '#5a5a55' : '#2f7a2a'), 0.9); ctx.lineWidth = 1.5;
        for (let s = -2; s <= 2; s++) { ctx.beginPath(); ctx.moveTo(x - 26, y + s * 5); ctx.lineTo(x + 26, y + s * 5); ctx.stroke(); }
      }
    }
    // The cortex band under the membrane.
    ctx.fillStyle = css(plasm.clone().multiplyScalar(0.7), 0.35);
    ctx.fillRect(0, 0, 1024, 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const depthBelow = 1.25;
    const cyto = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, depthBelow, D - 0.1), new THREE.MeshStandardMaterial({ map: texture, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: mix(0.25, 0.45, mood.cheer), roughness: 0.95 }));
    cyto.position.y = -T - depthBelow / 2 + 0.02;
    cyto.receiveShadow = true;
    root.add(cyto);

    const free = (x: number, z: number, clear = 0.55) => pad(x, z) > clear;
    const spot = (clear = 0.55, back = false) => {
      for (let tries = 0; tries < 60; tries++) {
        const x = (random() - 0.5) * (W - 1), z = back ? mix(-D / 2 + 0.6, 0.5, random()) : (random() - 0.5) * (D - 1);
        if (free(x, z, clear)) return [x, z] as const;
      }
      return [W / 2 - 0.8, -D / 2 + 0.8] as const;
    };

    // Moving parts: things rooted in the membrane ride its waves.
    const riders: { object: THREE.Object3D; x: number; z: number; y: number }[] = [];
    const ride = (object: THREE.Object3D, x: number, z: number, y = 0) => {
      object.position.set(x, y + shape(x, z), z);
      riders.push({ object, x, z, y: y + shape(x, z) });
      root.add(object);
      return object;
    };

    // Landmark proteins: towers, buoys and pumps.
    const proteins = PROTEIN[style].map((hex) => paint(hex));
    const tower = () => {
      const g = new THREE.Group();
      const h = mix(1.6, 3.0, random());
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, h, 12), proteins[1]);
      stalk.position.y = h / 2 - 0.3;
      g.add(stalk);
      for (let k = 0; k < 3; k++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.34 - k * 0.06, 16, 12), proteins[(k + 2) % 5]);
        bead.position.set((random() - 0.5) * 0.15, h - 0.3 + k * 0.42, (random() - 0.5) * 0.15);
        bead.scale.set(1, 0.85, 1);
        g.add(bead);
      }
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: tint(PROTEIN[style][3]), emissive: tint(PROTEIN[style][3]), emissiveIntensity: mix(0.2, 0.9, mood.cheer) }));
      light.position.y = h + 0.95;
      g.add(light);
      return g;
    };
    const buoy = () => {
      const g = new THREE.Group();
      const r = mix(0.35, 0.6, random());
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, 0.7, 8), proteins[Math.floor(random() * 5)]);
      body.position.y = 0.05;
      g.add(body);
      const dome = new THREE.Mesh(new THREE.TorusGeometry(r * 0.75, r * 0.3, 10, 20), proteins[0]);
      dome.rotation.x = Math.PI / 2;
      dome.position.y = 0.42;
      g.add(dome);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 16), new THREE.MeshStandardMaterial({ color: tint(grey ? '#f4f4ee' : '#bff3ff'), emissive: tint(grey ? '#f4f4ee' : '#8fe8ff'), emissiveIntensity: 0.6 }));
      mouth.rotation.x = -Math.PI / 2;
      mouth.position.y = 0.43;
      g.add(mouth);
      return g;
    };
    const pump = () => {
      const g = new THREE.Group();
      const h = mix(1.2, 2.1, random());
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.5, 12), proteins[4]);
      g.add(base);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 8), proteins[1]);
      stalk.position.y = h / 2;
      g.add(stalk);
      const knob = new THREE.Group();
      for (let k = 0; k < 6; k++) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), proteins[k % 2 ? 2 : 3]);
        lobe.position.set(Math.cos(k * 1.047) * 0.26, 0, Math.sin(k * 1.047) * 0.26);
        knob.add(lobe);
      }
      knob.position.y = h + 0.15;
      g.add(knob);
      g.userData.spin = knob;
      return g;
    };
    const spinners: THREE.Object3D[] = [];
    const landmarkCount = Math.round(mix(5, 10, mood.density));
    for (let i = 0; i < landmarkCount; i++) {
      const kind = a.landmarks === 'mixed' ? (['towers', 'buoys', 'pumps'] as const)[i % 3] : a.landmarks;
      const tall = kind !== 'buoys';
      const [x, z] = spot(tall ? 0.85 : 0.65, tall && i % 3 !== 2);
      const g = kind === 'towers' ? tower() : kind === 'pumps' ? pump() : buoy();
      g.rotation.y = random() * 6;
      g.traverse((node) => { node.castShadow = true; node.receiveShadow = true; });
      ride(g, x, z, -0.05);
      if (g.userData.spin) spinners.push(g.userData.spin as THREE.Object3D);
    }
    if (cell === 'neuron') {
      // Ion channel pores dotted across the sea, each glowing at its mouth.
      const rings: THREE.Matrix4[] = [];
      for (let i = 0; i < Math.round(mix(10, 20, mood.density)); i++) {
        const [x, z] = spot(0.6);
        rings.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 0.02 + shape(x, z), z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)));
      }
      const ringMesh = new THREE.InstancedMesh(new THREE.TorusGeometry(0.2, 0.09, 8, 16), proteins[0], rings.length);
      const glowMesh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.13, 12), new THREE.MeshStandardMaterial({ color: tint(grey ? '#f6f6f0' : '#c4f6ff'), emissive: tint(grey ? '#f6f6f0' : '#7fe8ff'), emissiveIntensity: 0.8, side: THREE.DoubleSide }), rings.length);
      rings.forEach((matrix, i) => { ringMesh.setMatrixAt(i, matrix); glowMesh.setMatrixAt(i, matrix.clone().multiply(new THREE.Matrix4().makeRotationX(Math.PI)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.01))); });
      ringMesh.castShadow = true;
      root.add(ringMesh, glowMesh);
    }

    // The sugar-coat forest: branched bead chains rising from the membrane.
    const beads: { x: number; y: number; z: number; r: number; c: THREE.Color; rx: number; rz: number }[] = [];
    const sugarColours = SUGARS[style].map((hex) => tint(hex, pale * 0.6));
    const trees = Math.round(mix(4, 110, a.sugar) * (cell === 'red' ? 1.35 : 1) * mix(0.8, 1.2, mood.density));
    for (let t = 0; t < trees; t++) {
      const [x, z] = spot(0.5);
      const height = mix(0.35, 1.3, random()) * mix(0.7, 1.15, a.sugar);
      const r = 0.065;
      const lean = new THREE.Vector3((random() - 0.5) * 0.4, 1, (random() - 0.5) * 0.4).normalize();
      const stem = Math.max(2, Math.round(height * 0.55 / (r * 1.9)));
      let p = new THREE.Vector3(0, 0, 0);
      for (let k = 0; k < stem; k++) {
        p = p.clone().addScaledVector(lean, r * 1.9);
        beads.push({ x: p.x, y: p.y, z: p.z, r, c: sugarColours[0], rx: x, rz: z });
      }
      const forks = 2 + Math.floor(random() * 2);
      for (let f = 0; f < forks; f++) {
        const angle = random() * 6.28;
        let d = new THREE.Vector3(Math.cos(angle) * 0.7, 1, Math.sin(angle) * 0.7).normalize();
        let q = p.clone();
        const length = Math.max(2, Math.round(height * 0.45 / (r * 1.9)));
        for (let k = 0; k < length; k++) {
          d = d.lerp(Y, 0.15).normalize();
          q = q.clone().addScaledVector(d, r * 1.9);
          beads.push({ x: q.x, y: q.y, z: q.z, r: k === length - 1 ? r * 1.25 : r, c: sugarColours[k === length - 1 ? 3 + (f % 2) : 1 + (k % 2)], rx: x, rz: z });
        }
      }
    }
    const beadMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 }), Math.max(beads.length, 1));
    beads.forEach((b, i) => {
      beadMesh.setMatrixAt(i, m.makeScale(b.r, b.r, b.r).setPosition(b.rx + b.x, b.y + shape(b.rx, b.rz) - 0.05, b.rz + b.z));
      beadMesh.setColorAt(i, b.c);
    });
    beadMesh.count = beads.length;
    beadMesh.castShadow = true;
    root.add(beadMesh);

    // The cell's own architecture above the membrane.
    if (cell === 'bacterium') {
      const strands: THREE.Matrix4[] = [];
      const gap = 1.0;
      const wallY = 0.42;
      for (let x = -W / 2 + 0.5; x < W / 2; x += gap) for (let z = -D / 2 + 0.5; z < D / 2; z += gap) {
        for (const [dx, dz] of [[gap, 0], [0, gap]]) {
          const mx = x + dx / 2, mz = z + dz / 2;
          if (mx + dx / 2 > W / 2 || mz + dz / 2 > D / 2 || !free(mx, mz, 0.75)) continue;
          const dir = new THREE.Vector3(dx, 0, dz).normalize();
          strands.push(new THREE.Matrix4().compose(new THREE.Vector3(mx, wallY + shape(mx, mz) * 0.5, mz), new THREE.Quaternion().setFromUnitVectors(Y, dir), new THREE.Vector3(0.05, gap, 0.05)));
        }
      }
      const wall = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), paint(grey ? '#77776f' : style === 'glossy' ? '#d98a2b' : '#d9b77c'), strands.length);
      strands.forEach((matrix, i) => wall.setMatrixAt(i, matrix));
      wall.castShadow = true;
      root.add(wall);
      // Pili and a flagellum rising at the back.
      const hair = paint(grey ? '#5d5d58' : '#a07a4a');
      for (let i = 0; i < 9; i++) {
        const [x, z] = spot(0.7);
        const pts = [new THREE.Vector3(x, 0, z), new THREE.Vector3(x + (random() - 0.5) * 0.4, 0.7, z + (random() - 0.5) * 0.4), new THREE.Vector3(x + (random() - 0.5) * 0.8, 1.3 + random() * 0.6, z + (random() - 0.5) * 0.8)];
        const pilus = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.025, 5), hair);
        pilus.castShadow = true;
        root.add(pilus);
      }
      const whip: THREE.Vector3[] = [];
      for (let i = 0; i <= 40; i++) whip.push(new THREE.Vector3(-4.6 + i * 0.12, 0.3 + i * 0.06 + Math.sin(i * 0.5) * 0.25, -4.4 + Math.cos(i * 0.5) * 0.25));
      const flagellum = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(whip), 160, 0.05, 6), hair);
      flagellum.castShadow = true;
      root.add(flagellum);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.5, 14), proteins[2]);
      motor.position.set(-4.6, 0.05 + shape(-4.6, -4.4), -4.4);
      root.add(motor);
      spinners.push(flagellum);
    } else if (cell === 'plant') {
      // A terraced wall of cellulose fibres along the back, layers crossing at right angles.
      const fibres: THREE.Matrix4[] = [];
      const front = -D / 2 + 1.25;
      const layers = 7;
      for (let l = 0; l < layers; l++) {
        const y = 0.12 + l * 0.17;
        const reachFront = front - l * 0.08;
        if (l % 2 === 0) {
          for (let z = -D / 2 + 0.1; z < reachFront; z += 0.17)
            fibres.push(new THREE.Matrix4().compose(new THREE.Vector3(0, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(0.075, W, 0.075)));
        } else {
          const length = reachFront + D / 2 - 0.05;
          for (let x = -W / 2 + 0.1; x < W / 2; x += 0.17)
            fibres.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, -D / 2 + length / 2 + 0.05), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(0.075, length, 0.075)));
        }
      }
      const cellulose = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), paint(grey ? '#b8b8b0' : style === 'glossy' ? '#c9e86a' : '#e4dfb4'), fibres.length);
      fibres.forEach((matrix, i) => cellulose.setMatrixAt(i, matrix));
      cellulose.castShadow = cellulose.receiveShadow = true;
      root.add(cellulose);
      const lamella = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, front + D / 2 - 0.6), paint(grey ? '#8c8c86' : '#b9c27a'));
      lamella.position.set(0, 0.12 + layers * 0.17, -D / 2 + (front + D / 2 - 0.6) / 2);
      lamella.castShadow = true;
      root.add(lamella);
    }

    // The story.
    const floaters: { object: THREE.Object3D; y: number; phase: number }[] = [];
    if (a.state === 'infected') {
      const coat = paint(grey ? '#a9a9a3' : '#c9ccd3');
      const spikeMaterial = paint(grey ? '#55554f' : style === 'glossy' ? '#e8262c' : '#e8726b');
      const spikes: THREE.Matrix4[] = [];
      const n = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const r = mix(0.35, 0.55, random());
        const [x, z] = spot(0.8);
        const landed = i % 2 === 0;
        const y = landed ? r * (i % 4 === 0 ? 0.25 : 0.95) + shape(x, z) : mix(1.8, 3.2, random());
        const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), coat);
        ball.position.set(x, y, z);
        ball.castShadow = true;
        root.add(ball);
        const count = 28;
        for (let k = 0; k < count; k++) {
          const yy = 1 - (2 * (k + 0.5)) / count, rr = Math.sqrt(1 - yy * yy), tt = k * 2.39996;
          const dir = new THREE.Vector3(Math.cos(tt) * rr, yy, Math.sin(tt) * rr);
          spikes.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z).addScaledVector(dir, r * 1.12), new THREE.Quaternion().setFromUnitVectors(Y, dir), new THREE.Vector3(r * 0.09, r * 0.28, r * 0.09)));
        }
        if (landed && i % 4 === 0) {
          // The membrane lip climbing round a sinking virus.
          const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.28, 10, 28), new THREE.MeshStandardMaterial({ color: colours[0], roughness: 0.6 }));
          lip.rotation.x = Math.PI / 2;
          lip.position.set(x, shape(x, z) + 0.02, z);
          root.add(lip);
        }
      }
      const spikeMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), spikeMaterial, spikes.length);
      spikes.forEach((matrix, i) => spikeMesh.setMatrixAt(i, matrix));
      spikeMesh.castShadow = true;
      root.add(spikeMesh);
    } else if (a.state === 'dividing') {
      // The contractile ring: a thick twisted cable under the furrow, showing at the cut faces.
      const pts: THREE.Vector3[] = [];
      for (let x = -W / 2 - 0.2; x <= W / 2 + 0.2; x += 0.5) pts.push(new THREE.Vector3(x, -T - 0.25 + shape(x, -0.15 + 0.08 * x) * 0.5, -0.15 + 0.08 * x));
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.22, 10), paint(grey ? '#5a5a55' : style === 'glossy' ? '#e8264a' : '#d9667a'));
      root.add(cable);
    } else if (a.state === 'dying') {
      const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), paint(grey ? '#9a9a94' : '#d8c8b8'), 24);
      for (let i = 0; i < 24; i++) {
        const s = mix(0.06, 0.18, random());
        debris.setMatrixAt(i, m.compose(new THREE.Vector3((random() - 0.5) * W * 0.9, mix(0.6, 2.8, random()), (random() - 0.5) * D * 0.9), new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, 0)), new THREE.Vector3(s, s * 0.7, s)));
      }
      debris.castShadow = true;
      root.add(debris);
    }

    // What drifts in the water above.
    const drift: { x: number; y: number; z: number; s: number; phase: number; kind: number }[] = [];
    const driftCount = Math.round({ clear: 26, crowded: 70, plasma: 46, sea: 60 }[a.fluid] * mix(0.7, 1.3, mood.density));
    for (let i = 0; i < driftCount; i++) drift.push({ x: (random() - 0.5) * W * 0.95, y: mix(0.8, 3.6, random()), z: (random() - 0.5) * D * 0.95, s: 1, phase: random() * 6.28, kind: i % 3 });
    const driftShapes = {
      clear: [new THREE.SphereGeometry(0.07, 10, 8), new THREE.SphereGeometry(0.05, 10, 8), new THREE.SphereGeometry(0.06, 10, 8)],
      crowded: [new THREE.DodecahedronGeometry(0.16, 1), new THREE.IcosahedronGeometry(0.11, 1), new THREE.SphereGeometry(0.09, 10, 8)],
      plasma: [new THREE.DodecahedronGeometry(0.13, 1), new THREE.SphereGeometry(0.08, 10, 8), new THREE.CapsuleGeometry(0.05, 0.22, 4, 8)],
      sea: [new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.SphereGeometry(0.05, 10, 8)],
    }[a.fluid];
    const driftColours = grey ? ['#6f6f6a', '#9c9c96', '#56564f'] : {
      clear: ['#8a4fe0', '#3fcf5a', '#f08a24'], crowded: [PROTEIN[style][0], PROTEIN[style][1], PROTEIN[style][2]],
      plasma: ['#e8b04a', '#d9876a', '#6f9fdc'], sea: ['#9a6be0', '#5fd08a', '#f2f2f2'],
    }[a.fluid];
    const driftMeshes = driftShapes.map((geometry, k) => {
      const mesh = new THREE.InstancedMesh(geometry, paint(driftColours[k]), Math.max(1, drift.filter((d) => d.kind === k).length));
      mesh.castShadow = true;
      root.add(mesh);
      return mesh;
    });
    const driftIndex = drift.map((d) => drift.filter((e, i) => e.kind === d.kind && i < drift.indexOf(d)).length);
    const spin = new THREE.Quaternion(), euler = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
    const placeDrift = (time: number) => {
      drift.forEach((d, i) => {
        euler.set(d.phase + time * 0.3, d.phase * 2 + time * 0.2, 0);
        driftMeshes[d.kind].setMatrixAt(driftIndex[i], m.compose(new THREE.Vector3(d.x + Math.sin(time * 0.3 * energy + d.phase) * 0.15, d.y + Math.sin(time * 0.5 * energy + d.phase * 2) * 0.12, d.z), spin.setFromEuler(euler), one));
      });
      for (const mesh of driftMeshes) mesh.instanceMatrix.needsUpdate = true;
    };
    placeDrift(0);
    if (a.fluid === 'plasma') {
      // A few antibodies drifting by.
      const heavy = paint(grey ? '#55554f' : '#2f6fe0');
      for (let i = 0; i < 3; i++) {
        const g = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.22, 4, 8), heavy);
        g.add(stem);
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), heavy);
          arm.position.set(side * 0.13, 0.26, 0);
          arm.rotation.z = -side * 0.7;
          g.add(arm);
        }
        const y = mix(2.2, 3.4, random());
        g.position.set((random() - 0.5) * W * 0.8, y, (random() - 0.5) * D * 0.7);
        g.rotation.set(random(), random() * 6, random() - 0.5);
        g.traverse((node) => { node.castShadow = true; });
        root.add(g);
        floaters.push({ object: g, y, phase: random() * 6 });
      }
    }

    // Breathing: every frame the sea, its tails, its core and everything rooted in it rise and fall.
    const headArray = headMesh.instanceMatrix.array as Float32Array;
    const tailArray = tailMesh.instanceMatrix.array as Float32Array;
    const beadArray = beadMesh.instanceMatrix.array as Float32Array;
    const headBase = heads.map((h) => h.y);
    const tailBase = tails.map((t) => t.y);
    const beadBase = beads.map((b) => b.y + shape(b.rx, b.rz) - 0.05);
    const headPad = heads.map((h) => amplitude * pad(h.x, h.z));
    const tailPad = tails.map((h) => amplitude * pad(h.x, h.z));
    const beadPad = beads.map((b) => amplitude * pad(b.rx, b.rz));
    const corePad = Array.from({ length: corePosition.count }, (_unused, i) => amplitude * pad(corePosition.getX(i), corePosition.getZ(i)));
    const update = (_dt: number, time: number) => {
      const t = time * energy;
      for (let i = 0; i < heads.length; i++) headArray[i * 16 + 13] = headBase[i] + headPad[i] * swell(heads[i].x, heads[i].z, t);
      headMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < tails.length; i++) tailArray[i * 16 + 13] = tailBase[i] + tailPad[i] * swell(tails[i].x, tails[i].z, t);
      tailMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < beads.length; i++) beadArray[i * 16 + 13] = beadBase[i] + beadPad[i] * swell(beads[i].rx, beads[i].rz, t);
      beadMesh.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < corePosition.count; i++) corePosition.setY(i, coreBase[i] + corePad[i] * swell(corePosition.getX(i), corePosition.getZ(i), t));
      corePosition.needsUpdate = true;
      for (const r of riders) r.object.position.y = r.y + wave(r.x, r.z, t);
      for (const s of spinners) s.rotation.y = time * energy * 0.8;
      for (const f of floaters) f.object.position.y = f.y + Math.sin(time * 0.6 * energy + f.phase) * 0.15;
      placeDrift(time);
    };
    update(0, 0);
    world.update = update;
    return world;
  },
});
