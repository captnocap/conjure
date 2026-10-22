import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const COLOURS = {
  tan: 'Desert tan, the colour the land office asks for so it hides in the scrub.',
  white: 'Bright white, to keep the crude cool.',
  silver: 'Aluminium silver paint, older and glaring in the sun.',
  green: 'Dark company green.',
  black: 'Old black bolted tanks from an earlier boom.',
} as const;
const HEX: Record<keyof typeof COLOURS, string> = { tan: '#c9b48a', white: '#ecebe4', silver: '#b4b9bb', green: '#3f6b4b', black: '#2b2c2e' };
const NAMES = {
  permian: 'PERMIAN BASIN OIL CO., a big faceless operator.',
  lonestar: 'LONE STAR OPERATING, with a painted star.',
  family: 'COWDEN & SONS, a family outfit three generations on the same lease.',
  baku: 'CASPIAN PETROLEUM, far from Texas.',
  stencil: 'No company name, just a hand-stencilled lease and tank number.',
  ghost: 'A name painted over in a mismatched patch: sold, and sold again.',
} as const;
const TEXT: Record<keyof typeof NAMES, string> = { permian: 'PERMIAN BASIN OIL CO.', lonestar: 'LONE STAR OPERATING', family: 'COWDEN & SONS', baku: 'CASPIAN PETROLEUM', stencil: '', ghost: '' };

export default defineThing({
  questions: {
    tanks: choice('How many tanks stand in the battery?', {
      two: 'Two: a small marginal lease.',
      three: 'Three, the usual row.',
      four: 'Four in a long row, a good producer.',
    }),
    colour: choice('What colour are the tanks?', COLOURS),
    operator: choice('Whose name is painted on the tanks?', NAMES),
    condition: choice('What state are the tanks in?', {
      fresh: 'Freshly painted and clean, set last month.',
      streaked: 'Dark crude streaks run down from each hatch.',
      overflow: 'One tank has run over: a black sheet down its side and oil pooled inside the berm.',
      rusted: 'Rust blooming through the paint, patch plates welded on.',
    }),
    hatch: choice('What is happening on the catwalk?', {
      closed: 'Nothing: every thief hatch is shut.',
      tape: 'One hatch stands open with a gauge tape left hanging into it.',
      pumper: 'A pumper in a hard hat stands at an open hatch reading the gauge tape.',
    }),
    vessel: choice('What stands beside the tanks?', {
      treater: 'A tall vertical heater-treater with a thin fire-tube stack.',
      separator: 'A horizontal separator on saddles with a tangle of valves.',
      water: 'A squat fibreglass saltwater tank and a small separator.',
    }),
    containment: choice('What contains a spill?', {
      berm: 'A low earth berm bulldozed around the pad.',
      steel: 'A corrugated steel containment wall, new regulations.',
      none: 'Nothing: a bare gravel pad.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { two: 2, three: 3, four: 4 }[a.tanks];
    const r = 2.1, h = 4.9, pitch = 4.75;
    const base = new THREE.Color(HEX[a.colour]);
    const grime = mood.wear * 0.5 + (a.condition === 'rusted' ? 0.4 : a.condition === 'fresh' ? -0.3 : 0.1);
    const light = base.getHSL({ h: 0, s: 0, l: 0 }).l > 0.45;
    const metal = (hex: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).lerp(new THREE.Color('#70452c'), Math.max(0, grime) * 0.35), roughness: 0.7, metalness: 0.2, ...options });
    const body = metal(base), steel = metal('#8b9092'), dark = metal('#2a2c2e'), rail = metal('#d8c23a'), oil = new THREE.MeshStandardMaterial({ color: '#120e0b', roughness: 0.2, metalness: 0.4 });
    const xs = Array.from({ length: count }, (_unused, i) => (i - (count - 1) / 2) * pitch);
    const spilled = a.condition === 'overflow' ? Math.floor(random() * count) : -1;
    const opened = a.hatch === 'closed' ? -1 : Math.floor(random() * count);

    const paintTank = (index: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 384;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + base.getHexString();
      ctx.fillRect(0, 0, 1024, 384);
      // Plate courses and staggered vertical welds.
      ctx.strokeStyle = light ? 'rgba(40,30,20,0.28)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      for (let course = 0; course < 3; course++) {
        ctx.beginPath(); ctx.moveTo(0, course * 128); ctx.lineTo(1024, course * 128); ctx.stroke();
        for (let x = (course % 2) * 85; x < 1024; x += 170) { ctx.beginPath(); ctx.moveTo(x, course * 128); ctx.lineTo(x, course * 128 + 128); ctx.stroke(); }
      }
      const ink = light ? '#1e2322' : '#f0ece0';
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (a.operator === 'ghost') {
        ctx.fillStyle = '#' + base.clone().offsetHSL(0.03, -0.05, light ? -0.09 : 0.1).getHexString();
        ctx.fillRect(360, 110, 310, 74);
        ctx.fillStyle = ink; ctx.globalAlpha = 0.16; ctx.font = 'bold 40px sans-serif'; ctx.fillText('WESTEX ENERGY', 512, 148, 290); ctx.globalAlpha = 1;
      } else if (TEXT[a.operator]) {
        ctx.font = 'bold 42px sans-serif';
        ctx.fillText(TEXT[a.operator], 512, 138, 330);
        if (a.operator === 'lonestar') {
          ctx.fillStyle = '#b6262d'; ctx.beginPath();
          for (let i = 0; i < 10; i++) { const radius = i % 2 ? 11 : 28, angle = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(512 + Math.cos(angle) * radius, 82 + Math.sin(angle) * radius); }
          ctx.fill(); ctx.fillStyle = ink;
        }
      }
      ctx.font = 'bold 26px monospace';
      ctx.fillText(`TANK ${index + 1}   ${[210, 300, 400, 500][Math.floor(random() * 4)]} BBL`, 512, 198, 300);
      // Hazard diamond.
      ctx.save(); ctx.translate(690, 150); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#c8322b'; ctx.fillRect(-20, -20, 20, 20); ctx.fillStyle = '#2a5fae'; ctx.fillRect(-20, 0, 20, 20); ctx.fillStyle = '#e4c531'; ctx.fillRect(0, -20, 20, 20); ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, 20, 20);
      ctx.restore();
      // Grime rising from the ground, rust blooms, crude streaks from the hatch.
      const foot = ctx.createLinearGradient(0, 384, 0, 250);
      foot.addColorStop(0, `rgba(92,62,40,${Math.max(0.1, Math.min(0.8, 0.3 + grime))})`); foot.addColorStop(1, 'rgba(92,62,40,0)');
      ctx.fillStyle = foot; ctx.fillRect(0, 250, 1024, 134);
      if (a.condition === 'rusted' || grime > 0.4) for (let i = 0; i < (a.condition === 'rusted' ? 46 : 14); i++) {
        const x = random() * 1024, y = random() * 384, size = 8 + random() * 34;
        const bloom = ctx.createRadialGradient(x, y, 1, x, y, size);
        bloom.addColorStop(0, 'rgba(122,62,30,0.85)'); bloom.addColorStop(1, 'rgba(122,62,30,0)');
        ctx.fillStyle = bloom; ctx.fillRect(x - size, y - size, size * 2, size * 2 + 30);
      }
      if (a.condition === 'rusted') for (let i = 0; i < 3; i++) { ctx.fillStyle = '#' + base.clone().offsetHSL(0, -0.1, 0.07).getHexString(); const x = 300 + random() * 420, y = 210 + random() * 110; ctx.fillRect(x, y, 46, 34); ctx.strokeStyle = 'rgba(60,30,15,0.7)'; ctx.strokeRect(x, y, 46, 34); }
      const streaks = a.condition === 'fresh' ? 0 : a.condition === 'streaked' ? 9 : 3 + Math.round(mood.wear * 4);
      for (let i = 0; i < streaks; i++) {
        const x = i < 4 ? 455 + (random() - 0.5) * 70 : random() * 1024, wide = 4 + random() * 14, long = 90 + random() * 290;
        const run = ctx.createLinearGradient(0, 0, 0, long);
        run.addColorStop(0, 'rgba(14,10,8,0.95)'); run.addColorStop(1, 'rgba(14,10,8,0)');
        ctx.fillStyle = run; ctx.fillRect(x - wide / 2, 0, wide, long);
      }
      if (index === spilled) {
        ctx.fillStyle = '#0f0b09';
        ctx.beginPath(); ctx.moveTo(380, 0);
        for (let x = 380; x <= 560; x += 12) ctx.lineTo(x, 384);
        ctx.lineTo(560, 0); ctx.fill();
        for (let i = 0; i < 12; i++) { const x = 330 + random() * 280; ctx.fillRect(x, 0, 6 + random() * 16, 150 + random() * 234); }
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      return map;
    };

    // Pad and containment.
    const stairRun = 5.6;
    const sepX = xs[count - 1] + r + 2.3;
    const x0 = xs[0] - r - stairRun - 0.8, x1 = sepX + (a.vessel === 'water' ? 3.4 : 1.9), z0 = -r - 1.2, z1 = r + 2.4;
    const gravel = s.material(a.containment === 'none' ? '#c9c0aa' : '#b7ad98', { roughness: 1 });
    s.box([x1 - x0, 0.1, z1 - z0], [(x0 + x1) / 2, 0.05, (z0 + z1) / 2], gravel);
    if (a.containment === 'berm') {
      const earth = s.material('#8c7455', { roughness: 1 });
      const section = new THREE.Shape([new THREE.Vector2(-0.95, 0), new THREE.Vector2(-0.3, 0.62), new THREE.Vector2(0.3, 0.62), new THREE.Vector2(0.95, 0)]);
      const side = (length: number, x: number, z: number, turn: number) => {
        const geometry = new THREE.ExtrudeGeometry(section, { depth: length, bevelEnabled: false });
        geometry.translate(0, 0, -length / 2);
        const mesh = s.mesh(geometry, earth, [x, 0, z]);
        mesh.rotation.y = turn;
      };
      side(x1 - x0 + 1.9, (x0 + x1) / 2, z0, Math.PI / 2); side(x1 - x0 + 1.9, (x0 + x1) / 2, z1, Math.PI / 2);
      side(z1 - z0, x0, (z0 + z1) / 2, 0); side(z1 - z0, x1, (z0 + z1) / 2, 0);
    }
    if (a.containment === 'steel') {
      const wall = metal('#aab0b0', { metalness: 0.5, roughness: 0.4 });
      s.box([x1 - x0, 0.85, 0.06], [(x0 + x1) / 2, 0.42, z0], wall); s.box([x1 - x0, 0.85, 0.06], [(x0 + x1) / 2, 0.42, z1], wall);
      s.box([0.06, 0.85, z1 - z0], [x0, 0.42, (z0 + z1) / 2], wall); s.box([0.06, 0.85, z1 - z0], [x1, 0.42, (z0 + z1) / 2], wall);
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / Math.round((x1 - x0) / 1.6)) for (const z of [z0, z1]) s.box([0.1, 0.95, 0.12], [x, 0.47, z], steel);
    }

    // Tanks.
    const lidHinge: THREE.Object3D[] = [];
    xs.forEach((x, index) => {
      const squat = index === count - 1 && count > 2 && random() < 0.35 ? 0.8 : 1;
      const tall = h * squat;
      const shell = s.mesh(new THREE.CylinderGeometry(r, r, tall, 40, 1, true), new THREE.MeshStandardMaterial({ map: paintTank(index), roughness: 0.75, metalness: 0.15 }), [x, tall / 2 + 0.1, 0]);
      shell.rotation.y = Math.PI;
      s.mesh(new THREE.ConeGeometry(r + 0.04, 0.38, 40), body, [x, tall + 0.29, 0]);
      s.cylinder(r + 0.05, r + 0.05, 0.08, [x, tall + 0.1, 0], body, 40);
      s.cylinder(r + 0.04, r + 0.04, 0.1, [x, 0.15, 0], dark, 40);
      // Thief hatch near the catwalk, vent line at the back, clean-out plate and load valve at the foot.
      s.cylinder(0.2, 0.2, 0.22, [x, tall + 0.32, r - 0.55], steel, 14);
      const lid = new THREE.Group();
      lid.position.set(x, tall + 0.44, r - 0.75);
      const cap = s.cylinder(0.23, 0.23, 0.05, [0, 0, 0.2], index === spilled ? oil : dark, 14);
      lid.add(cap);
      if (index === opened || index === spilled) lid.rotation.x = -1.25;
      s.root.add(lid);
      lidHinge.push(lid);
      s.cylinder(0.07, 0.07, 0.7, [x - 0.9, tall + 0.6, -0.9], steel, 8);
      s.box([0.3, 0.08, 0.3], [x - 0.9, tall + 0.97, -0.9], steel);
      s.box([0.08, 0.8, 0.6], [x + Math.sin(0.5) * (r + 0.03), 0.75, Math.cos(0.5) * (r + 0.03)], dark).rotation.y = 0.5;
      s.rod([x - 0.7, 0.45, r - 0.15], [x - 0.7, 0.45, r + 0.75], 0.08, steel);
      s.cylinder(0.05, 0.05, 0.3, [x - 0.7, 0.62, r + 0.45], metal('#c8322b'), 8);
      s.cylinder(0.13, 0.13, 0.05, [x - 0.7, 0.78, r + 0.45], metal('#c8322b'), 10);
      if (index === spilled) {
        const pool = s.cylinder(2.3, 2.3, 0.02, [x - 0.3, 0.115, r + 0.9], oil, 22);
        pool.scale.set(1.3, 1, 0.75); pool.castShadow = false;
        const pool2 = s.cylinder(1.2, 1.2, 0.02, [x + 1.9, 0.118, r + 1.9], oil, 16); pool2.castShadow = false;
      }
    });
    // Equalising line along the tops at the back and the fill line from the vessel.
    s.rod([xs[0], h + 0.5, -r + 0.5], [xs[count - 1], h + 0.5, -r + 0.5], 0.07, steel);
    s.tube([[xs[count - 1], h + 0.5, -r + 0.5], [xs[count - 1] + r + 0.4, h + 0.3, -r + 0.3], [sepX - 0.4, 3.2, -0.4], [sepX, 2.2, 0]], 0.07, steel);
    s.rod([xs[0] - 0.7, 0.45, r + 0.75], [xs[count - 1] - 0.7, 0.45, r + 0.75], 0.08, steel);
    s.rod([xs[count - 1] - 0.7, 0.45, r + 0.75], [xs[count - 1] - 0.7, 0.45, z1 + 0.9], 0.08, steel);
    s.cylinder(0.14, 0.14, 0.1, [xs[count - 1] - 0.7, 0.45, z1 + 0.9], dark, 10).rotation.x = Math.PI / 2;

    // Catwalk, handrails and stairs.
    const cz = r + 0.62, cy = h + 0.12, cx0 = xs[0] - r + 0.2, cx1 = xs[count - 1] + 1.0;
    s.box([cx1 - cx0, 0.07, 0.95], [(cx0 + cx1) / 2, cy, cz], steel);
    const posts: [number, number, number, number][] = [];
    for (let x = cx0; x <= cx1 + 0.01; x += (cx1 - cx0) / Math.round((cx1 - cx0) / 1.7)) { posts.push([x, cy, cz + 0.45, 1.05]); if (!xs.some((tx) => Math.abs(tx - x) < 0.7)) posts.push([x, cy, cz - 0.45, 1.05]); }
    s.rod([cx0, cy + 1.05, cz + 0.45], [cx1, cy + 1.05, cz + 0.45], 0.035, rail);
    s.rod([cx0, cy + 0.55, cz + 0.45], [cx1, cy + 0.55, cz + 0.45], 0.028, rail);
    s.rod([cx1, cy + 1.05, cz + 0.45], [cx1, cy + 1.05, cz - 0.45], 0.035, rail);
    for (let x = cx0 + 1; x < cx1; x += 3.2) for (const z of [cz - 0.4, cz + 0.4]) if (z > r + 0.5 || !xs.some((tx) => Math.abs(tx - x) < r)) s.cylinder(0.05, 0.05, cy, [x, cy / 2, z], steel, 6);
    // Stairs run down toward -x.
    const steps = 15;
    for (let i = 0; i < steps; i++) { const t = (i + 0.5) / steps; s.box([0.3, 0.05, 0.85], [cx0 - t * stairRun, mix(cy, 0.1, t), cz], steel); }
    for (const z of [cz - 0.45, cz + 0.45]) {
      s.rod([cx0, cy - 0.05, z], [cx0 - stairRun, 0.1, z], 0.05, steel);
      s.rod([cx0, cy + 1.05, z], [cx0 - stairRun, 1.1, z], 0.035, rail);
      for (let i = 0; i <= 3; i++) { const t = i / 3; posts.push([cx0 - t * stairRun, mix(cy, 0.1, t), z, 1.0]); }
    }
    for (const x of [cx0 - stairRun * 0.33, cx0 - stairRun * 0.02]) for (const z of [cz - 0.4, cz + 0.4]) { const top = mix(cy, 0.1, (cx0 - x) / stairRun); s.cylinder(0.045, 0.045, top, [x, top / 2, z], steel, 6); }
    {
      const post = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
      post.translate(0, 0.5, 0);
      const mesh = new THREE.InstancedMesh(post, rail, posts.length), matrix = new THREE.Matrix4();
      posts.forEach(([x, y, z, tall], i) => { matrix.makeScale(1, tall, 1).setPosition(x, y, z); mesh.setMatrixAt(i, matrix); });
      mesh.castShadow = true;
      s.root.add(mesh);
    }
    // A lamp on a mast at the head of the stairs; it burns at the ends of the day.
    const lampOn = Math.abs(mood.daylight - 0.5) * 2;
    s.cylinder(0.04, 0.04, 2.4, [cx0 + 0.1, cy + 1.2, cz + 0.45], steel, 6);
    s.box([0.4, 0.1, 0.22], [cx0 + 0.25, cy + 2.4, cz + 0.45], dark);
    s.box([0.3, 0.05, 0.16], [cx0 + 0.25, cy + 2.33, cz + 0.45], new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd27a', emissiveIntensity: 0.2 + lampOn * 2 }));

    // Gauge tape and the pumper.
    if (opened >= 0) {
      const x = xs[opened];
      s.rod([x, cy + 1.0, r - 0.55], [x, h - 0.2, r - 0.55], 0.012, metal('#e6d9a0'));
      if (a.hatch === 'tape') { const reel = s.cylinder(0.14, 0.14, 0.05, [x + 0.3, cy + 0.95, cz - 0.42], metal('#d8662a'), 12); reel.rotation.x = Math.PI / 2; s.rod([x + 0.3, cy + 0.95, cz - 0.45], [x, cy + 1.0, r - 0.55], 0.012, metal('#e6d9a0')); }
      else {
        const px = x + 0.1, pz = cz + 0.05, coverall = s.material(mood.cheer > 0.5 ? '#2e5f9e' : '#5b6770'), skin = s.material('#c9976f');
        for (const d of [-0.11, 0.11]) s.box([0.15, 0.85, 0.17], [px + d, cy + 0.46, pz], coverall);
        s.box([0.42, 0.62, 0.24], [px, cy + 1.18, pz], coverall);
        s.box([0.44, 0.07, 0.25], [px, cy + 1.22, pz], rail);
        s.ball([0.115, 0.13, 0.115], [px, cy + 1.63, pz], skin, 12);
        s.mesh(new THREE.SphereGeometry(0.14, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), s.material('#f1eee4'), [px, cy + 1.68, pz]);
        s.cylinder(0.18, 0.18, 0.02, [px, cy + 1.69, pz - 0.03], s.material('#f1eee4'), 14);
        s.rod([px - 0.24, cy + 1.42, pz], [px - 0.14, cy + 1.05, pz - 0.48], 0.055, coverall);
        s.rod([px + 0.24, cy + 1.42, pz], [px + 0.05, cy + 1.02, pz - 0.5], 0.055, coverall);
        const reel = s.cylinder(0.11, 0.11, 0.05, [px - 0.05, cy + 1.02, pz - 0.52], metal('#d8662a'), 12); reel.rotation.z = Math.PI / 2;
      }
    }

    // The process vessel.
    const vesselPaint = metal(a.colour === 'black' ? '#8f9496' : base);
    let stackTop: [number, number, number] | null = null;
    if (a.vessel === 'treater') {
      s.cylinder(0.62, 0.62, 5.6, [sepX, 3.0, 0], vesselPaint, 22);
      s.ball([0.62, 0.3, 0.62], [sepX, 5.8, 0], vesselPaint, 22);
      s.cylinder(0.75, 0.8, 0.2, [sepX, 0.2, 0], s.material('#b5b0a2'), 18);
      s.rod([sepX, 1.0, 0.5], [sepX, 1.0, 1.3], 0.2, dark);
      s.cylinder(0.11, 0.11, 6.4, [sepX, 4.2, 1.3], dark, 10);
      s.mesh(new THREE.ConeGeometry(0.26, 0.2, 10), dark, [sepX, 7.5, 1.3]);
      for (const y of [2.5, 4.6]) s.rod([sepX, y, 0.6], [sepX, y, 1.3], 0.025, steel);
      s.box([0.1, 1.3, 0.06], [sepX + 0.6, 2.6, 0.2], rail);
      s.tube([[sepX, 5.9, 0], [sepX - 0.5, 6.4, -0.4], [sepX - 0.9, 5.2, -0.6]], 0.06, steel);
      stackTop = [sepX, 7.6, 1.3];
    } else {
      const sx = a.vessel === 'water' ? sepX - 0.2 : sepX, sz = a.vessel === 'water' ? 2.4 : 0.2;
      const vessel = s.mesh(new THREE.CapsuleGeometry(0.6, a.vessel === 'water' ? 1.6 : 2.6, 6, 18), vesselPaint, [sx, 1.35, sz]);
      vessel.rotation.x = Math.PI / 2;
      for (const d of [-0.8, 0.8]) s.box([1.0, 0.8, 0.22], [sx, 0.45, sz + d * (a.vessel === 'water' ? 0.6 : 1)], s.material('#b5b0a2'));
      s.cylinder(0.08, 0.08, 0.8, [sx, 2.2, sz - 0.5], steel, 8);
      s.cylinder(0.16, 0.16, 0.06, [sx, 2.6, sz - 0.5], metal('#c8322b'), 10);
      s.tube([[sx, 1.9, sz + 0.6], [sx + 0.7, 1.7, sz + 0.9], [sx + 0.8, 0.5, sz + 0.6], [sx + 0.5, 0.2, sz - 1.4]], 0.06, steel);
      s.box([0.1, 0.9, 0.06], [sx + 0.62, 1.35, sz], rail);
      if (a.vessel === 'water') {
        s.cylinder(1.55, 1.6, 3.4, [sepX + 1.3, 1.8, -0.9], new THREE.MeshStandardMaterial({ color: new THREE.Color('#c7c58d').lerp(new THREE.Color('#70452c'), Math.max(0, grime) * 0.25), roughness: 0.5 }), 26);
        s.mesh(new THREE.ConeGeometry(1.58, 0.35, 26), s.material('#b9b77f'), [sepX + 1.3, 3.67, -0.9]);
        for (const y of [1.0, 1.9, 2.8]) s.ring(1.6, 0.03, [sepX + 1.3, y, -0.9], dark).rotation.x = Math.PI / 2;
        s.label('SALT WATER', 1.5, 0.34, [sepX + 1.3, 2.3, 0.72], '#1e2322', '#c7c58d');
      }
    }

    // A windsock, because of the gas.
    const sockX = x1 - 0.6, sockZ = z0 + 0.5;
    s.cylinder(0.035, 0.045, 5.2, [sockX, 2.6, sockZ], steel, 6);
    const sock = new THREE.Group();
    sock.position.set(sockX, 5.1, sockZ);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.2, 1.2, 10, 1, true), new THREE.MeshStandardMaterial({ color: '#e8641f', roughness: 0.8, side: THREE.DoubleSide }));
    cone.rotation.z = Math.PI / 2; cone.position.x = 0.62; cone.castShadow = true;
    sock.add(cone);
    sock.rotation.z = -mix(1.1, 0.05, mood.energy);
    sock.rotation.y = random() * 0.8 - 0.4;
    s.root.add(sock);

    // Lease sign at the stairs and clutter on the pad.
    if (a.operator !== 'stencil') {
      s.label(a.operator === 'ghost' ? 'FOR SALE' : `${TEXT[a.operator].split(' ')[0]} LEASE ${1 + Math.floor(random() * 30)}`, 1.5, 0.55, [x0 + 1.6, 1.25, z1 - 0.6], '#1e2322', '#ebe5d0');
      for (const d of [-0.6, 0.6]) s.cylinder(0.035, 0.035, 1.5, [x0 + 1.6 + d, 0.75, z1 - 0.63], steel, 6);
    }
    const clutter = Math.round(mood.density * 6);
    for (let i = 0; i < clutter; i++) {
      const x = mix(x0 + 1, xs[0] - r - 0.5, random()), z = mix(z0 + 0.8, 0.8, random());
      if (i % 3 === 0) s.cylinder(0.29, 0.29, 0.88, [x, 0.54, z], metal(['#2767b0', '#c8322b', '#2a2c2e'][i % 3 + (random() < 0.5 ? 0 : 1)] ?? '#2767b0'), 14);
      else if (i % 3 === 1) { const joint = s.cylinder(0.06, 0.06, 3 + random() * 2, [x, 0.17 + (i % 2) * 0.1, z], metal('#6d4a35'), 8); joint.rotation.z = Math.PI / 2; joint.rotation.y = random() * 0.3; }
      else s.cylinder(0.14, 0.11, 0.26, [x, 0.23, z + 2.5], metal('#e9e6da'), 10);
    }
    if (mood.wear > 0.45 || a.condition === 'streaked') for (let i = 0; i < 3 + Math.round(mood.wear * 5); i++) {
      const blot = s.cylinder(0.3 + random() * 0.5, 0.3, 0.012, [xs[Math.floor(random() * count)] - 0.7 + (random() - 0.5), 0.108 + i * 0.0007, r + 0.6 + random() * 1.4], oil, 12);
      blot.scale.z = 0.6; blot.castShadow = false;
    }

    return s.finish({
      update: (_dt, time) => {
        sock.rotation.z = -mix(1.1, 0.05, mood.energy) + Math.sin(time * mix(1, 6, mood.energy)) * 0.08 * (0.3 + mood.energy);
        void lidHinge; void stackTop;
      },
    });
  },
});
