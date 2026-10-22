import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type P2, concrete, extrudeX, lampGlow, plate, ribbon } from './util';

const PAINTS = {
  'oxide-red': 'Red lead oxide primer, the colour of old bridges.',
  'utility-green': 'Dull grey-green, a mid-century public works standard.',
  aluminium: 'Silvery aluminium paint that flashes in the sun.',
  'sky-blue': 'Cheerful sky blue, repainted for a tourist brochure.',
  bitumen: 'Black bitumen coating, tarry and industrial.',
  'safety-orange': 'Bright safety orange, impossible to miss.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = {
  'oxide-red': '#9c4130', 'utility-green': '#6f8672', aluminium: '#c2c8c9', 'sky-blue': '#4f9fd0', bitumen: '#2b2d30', 'safety-orange': '#e8742a',
};
const SIGNS = {
  none: ['', ''],
  danger: ['DANGER', 'KEEP OFF'],
  siren: ['SIREN MEANS', 'RISING WATER'],
  cyrillic: ['ОПАСНО', 'ВОДОСБРОС'],
  'no-swimming': ['NO SWIMMING', 'NO FISHING'],
  number: ['GATE', 'Nº 4'],
} as const;

// The spillway in section, [z, y]: reservoir at -z, the ogee crest, the chute, the apron.
const SURFACE: readonly P2[] = [[-3, 2.6], [-2.4, 2.9], [-1.5, 3], [-0.5, 3], [0.5, 2.85], [1.5, 2.45], [2.5, 1.85], [3.5, 1.2], [4.5, 0.65], [5.5, 0.3], [6.5, 0.15], [7.5, 0.15]];
const CHUTE = SURFACE.slice(3);
const PIVOT: P2 = [3.2, 5.2];
const R = 4.3, LOW = -0.537, HIGH = 0.43;

export default defineThing({
  questions: {
    bays: choice('How many gate bays stand side by side?', {
      one: 'A single gate between two piers, a small weir.',
      two: 'A pair of gates, a modest dam.',
      three: 'Three gates in a row, a serious spillway.',
    }),
    open: score('How far is the gate raised?', ['Seated shut on the sill', 'Cracked a hand-width', 'Half lifted', 'Hauled right up clear of the flow']),
    water: choice('What is the water doing beneath the gate?', {
      thunder: 'A thick white sheet thundering down the chute into a boiling pool.',
      trickle: 'Thin ribbons leaking down the concrete from under the seal.',
      dry: 'Nothing: only dark stains where water used to run, the reservoir far below the crest.',
      frozen: 'Stopped in place: ribbed ice down the chute and icicles off the gate lip.',
    }),
    paint: choice('What colour is the gate steel painted?', PAINTS),
    hoist: choice('What lifts the gates?', {
      winch: 'Open winch drums, a motor and a big gear wheel sitting on the bridge.',
      house: 'A little hoist house with windows over each gate.',
      gantry: 'One travelling gantry crane straddling the bridge on rails.',
    }),
    sign: choice('What warning is posted on the pier?', {
      none: 'No sign at all.',
      danger: 'A yellow board: DANGER KEEP OFF.',
      siren: 'A white board explaining that the siren means rising water.',
      cyrillic: 'A red Soviet-era board in Cyrillic.',
      'no-swimming': 'A blue municipal board forbidding swimming and fishing.',
      number: 'Just a stencilled gate number.',
    }),
    stripes: noul('Are the pier noses painted with yellow and black hazard stripes?'),
    debris: noul('Is driftwood jammed against the piers and lying on the apron?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const bays = { one: 1, two: 2, three: 3 }[a.bays];
    const BAY = 6, PIER = 1.2;
    const width = bays * BAY + (bays + 1) * PIER;
    const wet = a.water === 'thunder' || a.water === 'trickle';
    const lift = (a.water === 'thunder' ? Math.max(a.open, 0.3) : a.open) * 0.7;

    const crete = concrete(random, mood.wear, '#b8b4a6');
    const pierCrete = concrete(random, mood.wear, '#c2bdae', 6);
    const rust = new THREE.Color('#7a4a2c');
    const paintColour = new THREE.Color(PAINT[a.paint]).lerp(rust, mood.wear * 0.55);
    const steel = s.material(paintColour, { metalness: a.paint === 'aluminium' ? 0.6 : 0.2, roughness: 0.55 });
    const dark = s.material('#33373a', { metalness: 0.4, roughness: 0.6 });
    const machine = s.material(mix(0.3, 0.7, mood.cheer) > 0.5 ? '#5d7f8f' : '#6b6f68', { metalness: 0.3 });
    const blue = new THREE.Color().setHSL(mix(0.57, 0.5, mood.warmth), 0.5, mix(0.24, 0.36, mood.cheer));
    const water = new THREE.MeshStandardMaterial({ color: a.water === 'frozen' ? '#dfeaf0' : blue, roughness: a.water === 'frozen' ? 0.5 : 0.15, metalness: 0.1 });
    const white = new THREE.MeshStandardMaterial({ color: a.water === 'frozen' ? '#eef6fa' : '#f3f8f8', roughness: 0.6 });
    const stain = new THREE.MeshStandardMaterial({ color: a.water === 'dry' ? '#5b5548' : '#4c5a4e', roughness: 1 });

    // Monolith: ogee crest and apron across the full width.
    s.mesh(extrudeX([[-3, -0.6], ...SURFACE, [7.5, -0.6]], width), crete);
    s.box([width + 0.6, 0.5, 13.6], [0, -0.85, 1.6], crete);

    // Reservoir behind the crest, and the tailwater pool.
    const level = a.water === 'thunder' ? 6.3 : a.water === 'dry' ? 2.2 : 5.7;
    s.box([width + 0.6, level + 0.6, 2.2], [0, (level - 0.6) / 2, -4.1], water);
    if (a.water !== 'dry') s.box([width - 0.1, 0.5, 2.1], [0, 0.25, 6.45], water);

    const foam: THREE.Mesh[] = [];
    const pierX = Array.from({ length: bays + 1 }, (_unused, index) => -width / 2 + PIER / 2 + index * (BAY + PIER));
    const pierProfile: P2[] = [[-5.2, -0.6], [-5.2, 8.2], [-0.8, 8.2], [0.6, 7.1], [4.6, 6], [4.6, -0.6]];
    for (const x of pierX) {
      s.mesh(extrudeX(pierProfile, PIER), pierCrete, [x, 0, 0]);
      if (a.stripes) {
        const band = plate([], PIER, 1.6, { paper: '#e9c21f', paint: (ctx, W, H) => {
          ctx.fillStyle = '#1c1c1c';
          for (let i = -4; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 120, H); ctx.lineTo(i * 120 + 60, H); ctx.lineTo(i * 120 + 60 + H, 0); ctx.lineTo(i * 120 + H, 0); ctx.fill(); }
        } });
        band.position.set(x, 1.1, 4.62);
        s.root.add(band);
      }
      if (a.debris && random() > 0.3) {
        const wood = s.material('#8a7358');
        for (let i = 0; i < 3; i++) {
          const log = s.cylinder(0.12, 0.16, 2 + random() * 2.5, [x + (random() - 0.5) * 2.4, level + 0.08, -4.6 + random() * 0.8], wood, 8);
          log.rotation.set(Math.PI / 2, 0, Math.PI / 2 + (random() - 0.5) * 1.2);
        }
      }
    }

    // Bridge deck upstream of the gates, with a parapet and a handrail.
    s.box([width + 0.4, 0.4, 4.2], [0, 8.4, -3], crete);
    s.box([width + 0.4, 0.9, 0.25], [0, 9.05, -4.95], pierCrete);
    const posts = Math.round(width / 1.5);
    s.scatter(new THREE.BoxGeometry(0.07, 1, 0.07), dark, Array.from({ length: posts + 1 }, (_unused, index) => ({ at: [-width / 2 + (index * width) / posts, 9.1, -1] as const, size: 1 })));
    for (const y of [9.6, 9.15]) s.box([width, 0.05, 0.05], [0, y, -1], dark);
    const glow = lampGlow(mood.daylight);
    const lamp = s.material('#fff3c4', { emissive: '#ffd98a', emissiveIntensity: glow });
    for (const x of pierX) {
      s.rod([x, 8.6, -4.6], [x, 11.4, -4.6], 0.06, dark);
      s.rod([x, 11.4, -4.6], [x, 11.6, -3.8], 0.05, dark);
      s.ball([0.22, 0.14, 0.3], [x, 11.52, -3.7], lamp, 10);
    }

    for (let bay = 0; bay < bays; bay++) {
      const cx = pierX[bay] + (BAY + PIER) / 2;
      const gate = new THREE.Group();
      gate.position.set(cx, PIVOT[1], PIVOT[0]);
      gate.rotation.x = lift * mix(0.92, 1, random());
      s.root.add(gate);
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; gate.add(mesh); return mesh; };
      const arc = (inner: number, outer: number) => {
        const points: P2[] = [];
        for (let i = 0; i <= 12; i++) { const f = mix(LOW, HIGH, i / 12); points.push([-outer * Math.cos(f), outer * Math.sin(f)]); }
        for (let i = 12; i >= 0; i--) { const f = mix(LOW, HIGH, i / 12); points.push([-inner * Math.cos(f), inner * Math.sin(f)]); }
        return points;
      };
      add(new THREE.Mesh(extrudeX(arc(R - 0.1, R), BAY - 0.2), steel));
      for (let i = 0; i < 5; i++) add(new THREE.Mesh(extrudeX(arc(R - 0.34, R - 0.1), 0.1), steel)).position.x = (i - 2) * (BAY - 0.5) / 4;
      for (const f of [-0.42, -0.05, 0.33]) {
        const girder = add(new THREE.Mesh(new THREE.BoxGeometry(BAY - 0.3, 0.26, 0.42), steel));
        girder.position.set(0, (R - 0.31) * Math.sin(f), -(R - 0.31) * Math.cos(f));
        girder.rotation.x = f;
        for (const side of [-1, 1]) {
          const arm = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, R - 0.5), steel));
          arm.position.set(side * (BAY / 2 - 0.42), (R / 2 - 0.2) * Math.sin(f), -(R / 2 - 0.2) * Math.cos(f));
          arm.rotation.x = f;
        }
      }
      for (const side of [-1, 1]) {
        const hub = s.cylinder(0.42, 0.42, 0.5, [cx + side * (BAY / 2 - 0.3), PIVOT[1], PIVOT[0]], dark, 16);
        hub.rotation.z = Math.PI / 2;
        s.box([0.5, 1.1, 1.3], [cx + side * (BAY / 2 - 0.1), PIVOT[1] - 0.25, PIVOT[0] + 0.1], pierCrete);
        // Hoist chain from the bridge down to the gate.
        const f = 0.12 + gate.rotation.x;
        const x = cx + side * (BAY / 2 - 0.2);
        s.rod([x, 9.3, -0.75], [x, PIVOT[1] + (R + 0.05) * Math.sin(f), PIVOT[0] - (R + 0.05) * Math.cos(f)], 0.04, dark);
      }

      // Reservoir standing against the skin plate.
      if (a.water !== 'dry') s.box([BAY, level - 3, 2.2], [cx, 3 + (level - 3) / 2, -1.95], water);

      // What runs down the chute.
      const gap = R * Math.sin(-LOW) - R * Math.sin(-LOW - gate.rotation.x);
      if (a.water === 'thunder') {
        const depth = Math.max(0.35, Math.min(gap * 0.8, 1.6));
        s.mesh(ribbon(CHUTE, (i) => (i === 0 ? depth : i < 6 ? mix(depth * 0.6, 0.3, i / 6) : mix(0.5, 1.1, (i - 6) / 2)), BAY - 0.05), water, [cx, 0, 0]);
        for (let i = 0; i < 5; i++) {
          const w = 0.3 + random() * 0.9;
          s.mesh(ribbon(CHUTE, (j) => (j === 0 ? depth : j < 6 ? mix(depth * 0.6, 0.3, j / 6) : mix(0.5, 1.1, (j - 6) / 2)) + 0.05, w), white, [cx + (random() - 0.5) * (BAY - w - 0.2), 0, 0]);
        }
        for (let i = 0; i < 9; i++) {
          const size = 0.45 + random() * 0.55;
          const blob = s.ball([size * 1.3, size * 0.8, size], [cx + (random() - 0.5) * (BAY - 1), 0.75 + random() * 0.5, 5.3 + random() * 2], white, 8);
          blob.userData.phase = random() * 6.28;
          blob.userData.base = blob.position.y;
          foam.push(blob);
        }
      } else {
        const count = a.water === 'dry' ? 3 + Math.round(mood.wear * 3) : a.water === 'frozen' ? 4 : gap > 0.05 ? 4 : 2;
        for (let i = 0; i < count; i++) {
          const w = a.water === 'frozen' ? 0.5 + random() * 1.1 : 0.2 + random() * 0.6;
          const x = cx + (random() - 0.5) * (BAY - w - 0.2);
          s.mesh(ribbon(CHUTE, 0.02, w * 1.4), stain, [x, 0, 0]);
          if (a.water === 'trickle') s.mesh(ribbon(CHUTE, 0.06, w * (gap > 0.05 ? 1 : 0.4)), white, [x, 0, 0]);
          if (a.water === 'frozen') {
            s.mesh(ribbon(CHUTE, (j) => 0.12 + 0.12 * Math.sin(j * 2.1 + i), w), white, [x, 0, 0]);
            const f = LOW + gate.rotation.x;
            const lipY = PIVOT[1] + R * Math.sin(f), lipZ = PIVOT[0] - R * Math.cos(f);
            for (let k = 0; k < 3; k++) {
              const len = Math.min(0.5 + random() * 1.2, Math.max(0.3, lipY - 2.9));
              const icicle = s.cylinder(0.09, 0.005, len, [x + (k - 1) * w * 0.3, lipY - len / 2, lipZ + 0.08], white, 6);
              icicle.rotation.x = Math.PI;
            }
          }
        }
        if (a.water === 'frozen') s.ball([BAY * 0.42, 0.45, 1], [cx, 0.3, 6.3], white, 10);
      }
      if (a.debris && a.water !== 'thunder') {
        const wood = s.material('#8a7358');
        const branch = s.cylinder(0.08, 0.13, 1.5 + random() * 2, [cx + (random() - 0.5) * 3, 0.45, 5.6 + random() * 1.2], wood, 7);
        branch.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, Math.PI / 2 + (random() - 0.5) * 1.6);
      }

      // Hoist machinery on the bridge.
      if (a.hoist === 'winch') {
        s.box([BAY - 0.6, 0.18, 1.3], [cx, 8.7, -1.4], dark);
        for (const side of [-1, 1]) {
          const drum = s.cylinder(0.38, 0.38, 0.7, [cx + side * (BAY / 2 - 0.35), 9.3, -0.95], steel, 16);
          drum.rotation.z = Math.PI / 2;
          const flange = s.cylinder(0.5, 0.5, 0.06, [cx + side * (BAY / 2 - 0.72), 9.3, -0.95], dark, 16);
          flange.rotation.z = Math.PI / 2;
        }
        s.rod([cx - BAY / 2 + 0.6, 9.3, -0.95], [cx + BAY / 2 - 0.6, 9.3, -0.95], 0.07, dark);
        s.box([1.2, 0.8, 0.9], [cx - 0.5, 9.2, -1.5], machine);
        const motor = s.cylinder(0.3, 0.3, 0.9, [cx + 0.75, 9.15, -1.5], machine, 14);
        motor.rotation.z = Math.PI / 2;
        const gear = s.cylinder(0.75, 0.75, 0.12, [cx + 0.15, 9.45, -0.95], dark, 20);
        gear.rotation.z = Math.PI / 2;
      } else if (a.hoist === 'house') {
        s.box([BAY - 1, 2.3, 1.9], [cx, 9.75, -1.75], pierCrete);
        s.box([BAY - 0.6, 0.18, 2.4], [cx, 10.98, -1.75], dark);
        const pane = s.material('#28343b', { emissive: '#ffd98a', emissiveIntensity: glow * 0.5, roughness: 0.3 });
        for (let i = 0; i < 3; i++) s.box([0.9, 1.1, 0.06], [cx + (i - 1) * 1.4, 9.95, -0.78], pane);
        for (const side of [-1, 1]) s.box([0.3, 0.3, 1.3], [cx + side * (BAY / 2 - 0.2), 9.3, -1.1], dark);
      } else {
        for (const side of [-1, 1]) s.box([0.3, 0.3, 1.3], [cx + side * (BAY / 2 - 0.2), 9.3, -1.1], dark);
      }
    }

    if (a.hoist === 'gantry') {
      const yellow = s.material(new THREE.Color('#e3b320').lerp(rust, mood.wear * 0.4), { metalness: 0.2 });
      const gx = pierX[Math.floor(random() * bays)] + (BAY + PIER) / 2;
      for (const z of [-4.3, -1.4]) {
        s.box([width, 0.1, 0.12], [0, 8.65, z], dark);
        for (const side of [-1, 1]) s.box([0.3, 3.4, 0.3], [gx + side * 2.6, 10.4, z], yellow);
      }
      s.box([6.2, 0.7, 3.6], [gx, 12.3, -2.6], yellow);
      s.box([1.6, 1, 1.4], [gx + 0.6, 11.6, -1.2], machine);
      s.box([1.5, 1.3, 1.3], [gx - 2, 11.3, -3.6], machine);
      s.rod([gx + 0.6, 11.1, -0.9], [gx + 0.6, 9.4, -0.9], 0.04, dark);
    }

    if (a.sign !== 'none') {
      const style = {
        danger: { paper: '#f0c419', ink: '#151515', border: '#151515' },
        siren: { paper: '#f6f3e8', ink: '#b3261e', border: '#b3261e' },
        cyrillic: { paper: '#b3261e', ink: '#f6f0dc', border: '#f6f0dc' },
        'no-swimming': { paper: '#2a5f9e', ink: '#ffffff', border: '#ffffff' },
        number: { paper: '#c9c5b6', ink: '#22262a' },
      }[a.sign];
      const index = bays === 1 ? 1 : 1;
      const board = plate(SIGNS[a.sign], 1.1, 1.5, style);
      board.position.set(pierX[index], 3.6, 4.63);
      board.rotation.z = (random() - 0.5) * mood.wear * 0.2;
      s.root.add(board);
      if (bays > 1) {
        const second = plate(SIGNS[a.sign], 1.1, 1.5, style);
        second.position.set(pierX[0], 3.6, 4.63);
        s.root.add(second);
      }
    }

    const speed = mix(0.6, 5, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const blob of foam) blob.position.y = blob.userData.base + Math.sin(time * speed + blob.userData.phase) * 0.12;
      },
    });
  },
});
