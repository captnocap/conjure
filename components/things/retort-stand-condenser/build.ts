import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const COLOURS = {
  clear: 'Clear distilled water, almost invisible.',
  gold: 'Golden spirit or oil.',
  green: 'A vivid green essence, absinthe or chlorophyll.',
  violet: 'Deep violet.',
  pink: 'Indicator pink, a titration just past its end point.',
  red: 'Dark red, like wine or blood.',
  black: 'Thick black tar.',
  milk: 'A cloudy milk-white suspension.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = {
  clear: '#b5d9e6', gold: '#e2a61e', green: '#58c42e', violet: '#7a30c2', pink: '#f060a6', red: '#9c1a26', black: '#1c191d', milk: '#f0ede2',
};
const VESSELS = {
  beaker: 'A squat glass beaker with graduations.',
  conical: 'A small conical flask.',
  cylinder: 'A tall narrow measuring cylinder on a foot.',
  dish: 'A wide white porcelain evaporating basin.',
  jar: 'A stout jam jar pressed into service.',
} as const;
const SHAPE: Record<keyof typeof VESSELS, { H: number; r: (y: number) => number }> = {
  beaker: { H: 0.085, r: () => 0.036 },
  conical: { H: 0.1, r: (y) => (y < 0.075 ? mix(0.042, 0.015, y / 0.075) : 0.015) },
  cylinder: { H: 0.15, r: () => 0.015 },
  dish: { H: 0.032, r: (y) => mix(0.022, 0.055, Math.sqrt(y / 0.032)) },
  jar: { H: 0.095, r: (y) => (y < 0.078 ? 0.034 : 0.029) },
};
const NOTES = {
  none: 'No note at all.',
  touch: 'DO NOT TOUCH',
  day: 'DAY 3',
  batch: 'BATCH 12',
  wait: 'WAIT',
} as const;

export default defineThing({
  questions: {
    base: choice('What anchors the upright stand?', {
      plate: 'A solid rectangular cast-iron plate.',
      oval: 'A broad oval iron foot.',
      fork: 'A U-shaped foot leaves room around the receiving vessel.',
      weighted: 'A rectangular base with two additional iron ballast blocks.',
    }),
    clamps: choice('How are the clamps tightened on the support rod?', {
      screw: 'Plain short screw bosses.',
      wing: 'Broad wing screws at each boss.',
      wheel: 'Small spoked tightening handwheels.',
      lever: 'Long dark quick-clamp levers.',
    }),
    receiver: choice('What supports the vessel catching the drops?', {
      direct: 'The vessel rests directly beneath the apparatus.',
      jack: 'A small scissor jack raises it toward the delivery tip.',
      stirrer: 'A compact magnetic stirrer with a front dial.',
      tray: 'A shallow drip tray surrounds the vessel.',
    }),
    backdrop: choice('What is fixed behind the receiving vessel?', {
      none: 'No comparison backing.',
      white: 'A small white comparison card on a metal bracket.',
      black: 'A dark comparison card makes the glass edge visible.',
      ruler: 'A narrow vertical scale records the height of the receiving vessel.',
    }),
    service: choice('What auxiliary fitting is on the stand?', {
      none: 'Only the working apparatus.',
      spare: 'A spare support ring is clamped on the unused side.',
      timer: 'A small round timer hangs from the lower rod.',
      thermometer: 'A protected glass thermometer is clipped alongside the rod.',
    }),
    hoses: choice('If the apparatus has a water jacket, how are its hoses arranged?', {
      trailing: 'Both water hoses trail loose across the bench.',
      clipped: 'Two clips keep the hoses close to the support rod.',
      coiled: 'Spare hose length lies in a loose loop before the ends.',
      couplings: 'Brass quick-connect couplings finish the hose ends.',
    }),
    apparatus: choice('What glassware is clamped to the stand?', {
      coil: 'An upright condenser with a glass coil spiralling inside its water jacket.',
      still: 'A small still: a round flask over a spirit lamp, with a slanted condenser running off to one side.',
      burette: 'A tall thin graduated burette with a tap, set up for a titration.',
      separating: 'A pear-shaped separating funnel hanging in an iron ring, two liquid layers inside.',
      filter: 'A glass funnel in a ring, lined with filter paper holding a dark sludge.',
    }),
    drip: score('How fast is it dripping right now?', ['Dry: it has stopped', 'One drop hanging at the tip', 'A slow steady drip', 'A thin continuous stream']),
    collected: choice('What is collecting below?', COLOURS),
    amount: score('How much has collected?', ['Nothing yet: it has only just begun', 'A film across the bottom', 'Half full', 'Brim full', 'Overflowing across the bench, left unattended']),
    vessel: choice('What catches the drops?', VESSELS),
    note: choice('What does the paper tag tied to the stand say?', NOTES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tint = TINT[a.collected];
    const liquid = s.material(tint, { roughness: 0.15, emissive: tint, emissiveIntensity: 0.1 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d8eef2', transparent: true, opacity: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const solidGlass = s.material('#e4f3f5', { roughness: 0.08 });
    const iron = s.material(new THREE.Color('#2f3235').lerp(new THREE.Color('#7a4a2e'), mood.wear * 0.6), { metalness: 0.45, roughness: 0.55 });
    const steel = s.material('#aab0b2', { metalness: 0.8, roughness: 0.3 });
    const rubber = s.material('#b3432e', { roughness: 0.8 });
    const corkMat = s.material('#b98a55', { roughness: 0.95 });

    const shape = SHAPE[a.vessel];
    const rodX = -0.075, ax = 0.035, baseTop = 0.014;
    const still = a.apparatus === 'still';
    const tipX = still ? ax + 0.3 : ax;
    const receiverFloor = still || a.base === 'fork' ? 0 : baseTop;
    const receiverLift = { direct: 0, jack: 0.055, stirrer: 0.028, tray: 0.005 }[a.receiver];
    const vesselY = receiverFloor + receiverLift;
    const tipBase = still ? 0.15 : 0.17;
    const lift = Math.max(0, vesselY + shape.H + 0.03 - tipBase);
    const tipY = tipBase + lift;
    const rodTop = (a.apparatus === 'burette' ? 0.74 : 0.62) + lift;

    // The stand.
    if (a.base === 'oval') s.cylinder(0.075, 0.075, baseTop, [0, baseTop / 2, 0], iron, 28).scale.x = 1.65;
    else if (a.base === 'fork') {
      s.box([0.035, baseTop, 0.17], [-0.092, baseTop / 2, 0], iron);
      for (const z of [-0.07, 0.07]) s.box([0.205, baseTop, 0.026], [0.01, baseTop / 2, z], iron);
    } else s.box([0.23, baseTop, 0.14], [0, baseTop / 2, 0], iron);
    if (a.base === 'weighted') for (const z of [-0.05, 0.05]) s.box([0.09, 0.02, 0.025], [-0.035, baseTop + 0.01, z], iron);
    for (const x of [-0.1, 0.1]) for (const z of [-0.055, 0.055]) s.cylinder(0.008, 0.008, 0.003, [x, 0.0005, z], iron, 8);
    s.cylinder(0.007, 0.007, rodTop, [rodX, rodTop / 2, 0], steel, 12);
    s.cylinder(0.011, 0.012, 0.012, [rodX, baseTop + 0.006, 0], iron, 12);
    const clamp = (y: number, radius: number, ring = false) => {
      s.box([0.022, 0.026, 0.022], [rodX, y, 0], iron);
      s.rod([rodX - 0.02, y, 0.006], [rodX, y, 0.006], 0.003, steel);
      s.rod([rodX, y, 0], [ax - radius - 0.002, y, 0], 0.0045, steel);
      if (a.clamps === 'wing') for (const side of [-1, 1]) s.ball([0.004, 0.008, 0.003], [rodX - 0.021, y + side * 0.008, 0.006], steel, 10);
      if (a.clamps === 'wheel') {
        s.ring(0.012, 0.002, [rodX - 0.023, y, 0.006], steel).rotation.y = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const angle = i * Math.PI * 2 / 3;
          s.rod([rodX - 0.023, y, 0.006], [rodX - 0.023, y + Math.cos(angle) * 0.012, 0.006 + Math.sin(angle) * 0.012], 0.0015, steel);
        }
      }
      if (a.clamps === 'lever') s.rod([rodX - 0.02, y, 0.006], [rodX - 0.035, y + 0.035, 0.006], 0.003, iron);
      const jaw = s.ring(radius + 0.004, 0.004, [ax, y, 0], ring ? iron : corkMat, ring ? Math.PI * 2 : Math.PI * 1.55);
      jaw.rotation.x = Math.PI / 2;
      jaw.rotation.z = ring ? 0 : Math.PI - Math.PI * 0.775;
      if (!ring) s.rod([ax - radius - 0.012, y, 0.012], [ax - radius - 0.012, y, -0.012], 0.0028, steel);
    };
    const hose = (from: P3, side: number) => {
      const end: P3 = [from[0] + (random() - 0.5) * 0.08, 0.007, -0.19];
      const route: P3[] = [from, [from[0] + 0.03 * side, from[1] - 0.01, from[2] - 0.02]];
      if (a.hoses === 'clipped') {
        route.push([rodX + side * 0.019, from[1] * 0.65, -0.023], [rodX + side * 0.019, 0.05, -0.023]);
        for (const y of [from[1] * 0.65, 0.05]) {
          s.rod([rodX, y, 0], [rodX + side * 0.019, y, -0.023], 0.0018, steel);
          s.ring(0.006, 0.0013, [rodX + side * 0.019, y, -0.023], steel).rotation.x = Math.PI / 2;
        }
      } else route.push([from[0] + 0.05 * side, Math.max(0.05, from[1] * 0.45), -0.07]);
      route.push([from[0] + 0.03 * side, 0.007, -0.11]);
      if (a.hoses === 'coiled') for (let i = 0; i <= 12; i++) { const angle = i * Math.PI * 2 / 12; route.push([from[0] + 0.04 * Math.cos(angle), 0.007 + i * 0.0005, -0.14 + 0.04 * Math.sin(angle)]); }
      route.push(end); s.tube(route, 0.005, rubber);
      if (a.hoses === 'couplings') {
        s.rod(end, [end[0], 0.007, end[2] - 0.018], 0.007, s.material('#b79b61', { metalness: 0.8 }));
        s.ring(0.007, 0.0012, [end[0], 0.007, end[2] - 0.014], steel);
      }
    };

    if (a.apparatus === 'coil') {
      const y0 = tipY + 0.05, y1 = y0 + 0.28;
      s.mesh(new THREE.CylinderGeometry(0.024, 0.024, y1 - y0, 24, 1, true), glass, [ax, (y0 + y1) / 2, 0]);
      for (const y of [y0, y1]) s.ball([0.024, 0.012, 0.024], [ax, y, 0], glass, 20);
      for (const y of [y0 + 0.004, y1 - 0.004]) s.ring(0.0245, 0.0016, [ax, y, 0], solidGlass).rotation.x = Math.PI / 2;
      const helix: P3[] = [[ax, y1 + 0.05, 0], [ax, y1 + 0.005, 0]];
      const turns = 8;
      for (let i = 0; i <= turns * 10; i++) {
        const t = i / (turns * 10), ang = t * turns * Math.PI * 2;
        helix.push([ax + Math.cos(ang) * 0.014, mix(y1 - 0.015, y0 + 0.015, t), Math.sin(ang) * 0.014]);
      }
      helix.push([ax, y0 - 0.005, 0], [ax, tipY + 0.012, 0]);
      s.tube(helix, 0.0032, s.material(new THREE.Color('#eef7f8').lerp(new THREE.Color(tint), 0.25), { roughness: 0.08 }));
      s.cylinder(0.009, 0.0065, 0.03, [ax, y1 + 0.05, 0], solidGlass, 14);
      s.rod([ax, tipY + 0.014, 0], [ax, tipY, 0], 0.0045, solidGlass, 0.002);
      for (const [y, side] of [[y0 + 0.035, 1], [y1 - 0.035, 1]] as const) {
        s.rod([ax + 0.022, y, 0], [ax + 0.04, y, 0], 0.004, solidGlass);
        hose([ax + 0.04, y, 0], side);
      }
      clamp((y0 + y1) / 2 + 0.02, 0.024);
    } else if (a.apparatus === 'still') {
      const cy = 0.21 + lift, fr = 0.055;
      const source = new THREE.Color(tint).lerp(new THREE.Color('#4a3320'), 0.55);
      s.ball([fr, fr, fr], [ax, cy, 0], glass, 24);
      s.mesh(new THREE.SphereGeometry(fr - 0.003, 24, 10, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), s.material(source, { roughness: 0.2, side: THREE.DoubleSide }), [ax, cy, 0]);
      s.cylinder(fr * 0.985, fr * 0.985, 0.0015, [ax, cy - 0.004, 0], s.material(source, { roughness: 0.2 }), 24);
      s.mesh(new THREE.CylinderGeometry(0.013, 0.014, 0.07, 16, 1, true), glass, [ax, cy + fr + 0.03, 0]);
      s.ring(0.0135, 0.0018, [ax, cy + fr + 0.065, 0], solidGlass).rotation.x = Math.PI / 2;
      s.cylinder(0.0145, 0.012, 0.018, [ax, cy + fr + 0.07, 0], corkMat, 14);
      // Thermometer through the cork.
      s.rod([ax, cy + fr + 0.02, 0], [ax, cy + fr + 0.17, 0], 0.0028, solidGlass);
      s.rod([ax, cy + fr + 0.08, 0.0005], [ax, cy + fr + 0.08 + mix(0.02, 0.075, a.drip), 0.0005], 0.0031, s.material('#d02a2a', { emissive: '#a01010', emissiveIntensity: 0.3 }));
      // Side arm, then the slanted condenser.
      const armY = cy + fr + 0.045;
      const top: P3 = [ax + 0.05, armY - 0.012, 0], end: P3 = [ax + 0.275, tipY + 0.045, 0];
      s.tube([[ax + 0.012, armY, 0], [ax + 0.03, armY - 0.002, 0], top, end, [ax + 0.295, tipY + 0.03, 0], [ax + 0.3, tipY, 0]], 0.0058, solidGlass);
      const j0 = new THREE.Vector3(...top).lerp(new THREE.Vector3(...end), 0.12), j1 = new THREE.Vector3(...top).lerp(new THREE.Vector3(...end), 0.9);
      const jacket = s.mesh(new THREE.CylinderGeometry(0.021, 0.021, j0.distanceTo(j1), 20, 1), new THREE.MeshPhysicalMaterial({ color: '#cfe8ee', transparent: true, opacity: 0.38, roughness: 0.04, depthWrite: false }), j0.clone().add(j1).multiplyScalar(0.5).toArray() as P3);
      jacket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), j1.clone().sub(j0).normalize());
      for (const j of [j0, j1]) {
        const band = s.ring(0.0215, 0.0024, j.toArray() as P3, solidGlass);
        band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), j1.clone().sub(j0).normalize());
      }
      for (const t of [0.2, 0.8]) {
        const p = j0.clone().lerp(j1, t);
        s.rod([p.x, p.y - 0.018, 0], [p.x, p.y - 0.034, 0], 0.004, solidGlass);
        hose([p.x, p.y - 0.034, 0], t < 0.5 ? -1 : 1);
      }
      clamp(cy + fr + 0.03, 0.014);
      // Spirit lamp under the flask, on a block if the still has been raised.
      if (lift > 0.004) s.box([0.08, lift, 0.08], [ax, baseTop + lift / 2, 0], s.material('#9a6b3c', { roughness: 0.8 }));
      const ly = baseTop + lift;
      s.lathe([[0, 0], [0.026, 0], [0.032, 0.012], [0.03, 0.04], [0.012, 0.052], [0.01, 0.062], [0, 0.062]], s.material('#7fb7c9', { roughness: 0.15 }), [ax, ly, 0]);
      s.cylinder(0.004, 0.004, 0.014, [ax, ly + 0.068, 0], s.material('#efe9d8'), 8);
      if (a.drip > 0.1) {
        const flame = s.lathe([[0.0001, 0], [0.009, 0.012], [0.007, 0.03], [0.0001, 0.05]], new THREE.MeshStandardMaterial({ color: '#ffcf4a', emissive: '#ffa51e', emissiveIntensity: 1.5 }), [ax, ly + 0.07, 0]);
        flame.scale.y = mix(0.6, 1.3, a.drip);
      }
    } else if (a.apparatus === 'burette') {
      const y0 = tipY + 0.06, y1 = y0 + 0.46;
      s.mesh(new THREE.CylinderGeometry(0.008, 0.008, y1 - y0, 14, 1, true), glass, [ax, (y0 + y1) / 2, 0]);
      s.ring(0.0088, 0.0014, [ax, y1, 0], solidGlass).rotation.x = Math.PI / 2;
      const full = mix(0.9, 0.25, a.amount);
      s.cylinder(0.0062, 0.0062, (y1 - y0) * full, [ax, y0 + ((y1 - y0) * full) / 2, 0], s.material(new THREE.Color(tint).lerp(new THREE.Color('#cfe4ea'), 0.6), { roughness: 0.2 }), 12);
      const white = s.material('#fbfbf6', { roughness: 0.6 });
      for (let i = 0; i < 22; i++) s.box([i % 5 === 0 ? 0.011 : 0.006, 0.001, 0.0006], [ax, y0 + 0.03 + i * 0.019, 0.0083], white);
      s.rod([ax, y0, 0], [ax, tipY, 0], 0.005, solidGlass, 0.0018);
      s.box([0.034, 0.011, 0.011], [ax, y0 - 0.014, 0], s.material('#3f78c8', { roughness: 0.4 }));
      s.box([0.008, 0.024, 0.008], [ax + 0.019, y0 - 0.014, 0], s.material('#3f78c8', { roughness: 0.4 })).rotation.x = a.drip > 0.1 ? 0 : Math.PI / 2;
      clamp(y0 + 0.3, 0.008);
      clamp(y0 + 0.12, 0.008);
    } else {
      const sep = a.apparatus === 'separating';
      const y0 = tipY + 0.075;
      if (sep) {
        const prof = (inset: number, to: number) => {
          const pts: [number, number][] = [];
          for (let i = 0; i <= 14; i++) {
            const t = (i / 14) * to;
            pts.push([Math.max(0.0001, 0.006 + 0.04 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 0.8) + (t > 0.93 ? 0.004 : 0) - inset), t * 0.17]);
          }
          return pts;
        };
        s.lathe(prof(0, 1), glass, [ax, y0, 0]);
        const lower = s.material(tint, { roughness: 0.2, emissive: tint, emissiveIntensity: 0.1 });
        const split = mix(0.5, 0.2, a.amount);
        s.lathe([[0, 0.002], ...prof(0.003, split), [0, split * 0.17]], lower, [ax, y0, 0]);
        const upper = prof(0.003, 0.7).filter((p) => p[1] >= split * 0.17);
        s.lathe([[0, split * 0.17 + 0.0005], ...upper, [0, 0.7 * 0.17]], s.material('#e8c552', { roughness: 0.2, transparent: true, opacity: 0.85 }), [ax, y0, 0]);
        s.cylinder(0.013, 0.01, 0.02, [ax, y0 + 0.178, 0], solidGlass, 12);
        s.box([0.022, 0.004, 0.008], [ax, y0 + 0.19, 0], solidGlass);
        clamp(y0 + 0.085, 0.038, true);
      } else {
        s.lathe([[0.005, 0], [0.05, 0.062], [0.052, 0.064]], glass, [ax, y0 + 0.02, 0]);
        s.ring(0.0515, 0.0016, [ax, y0 + 0.084, 0], solidGlass).rotation.x = Math.PI / 2;
        s.lathe([[0.002, 0.006], [0.049, 0.07], [0.05, 0.078]], new THREE.MeshStandardMaterial({ color: '#f6f3e8', roughness: 0.95, side: THREE.DoubleSide }), [ax, y0 + 0.02, 0]);
        const sludge = new THREE.Color(tint).lerp(new THREE.Color('#3a2a1c'), 0.6);
        s.lathe([[0, 0.012], [0.006, 0.012], [0.034, 0.05], [0.02, 0.046], [0, 0.04]], s.material(sludge, { roughness: 0.9 }), [ax, y0 + 0.02, 0]);
        clamp(y0 + 0.05, 0.03, true);
      }
      s.rod([ax, y0 + (sep ? 0.004 : 0.022), 0], [ax, tipY, 0], 0.0048, solidGlass, 0.002);
      if (sep) {
        s.box([0.03, 0.01, 0.01], [ax, y0 - 0.014, 0], solidGlass);
        s.box([0.007, 0.022, 0.007], [ax + 0.017, y0 - 0.014, 0], solidGlass).rotation.x = a.drip > 0.1 ? 0 : Math.PI / 2;
      }
    }

    // The vessel and what has collected in it.
    const porcelain = a.vessel === 'dish';
    const wall = porcelain ? new THREE.MeshStandardMaterial({ color: '#f1eee6', roughness: 0.3, side: THREE.DoubleSide }) : glass;
    const samples = (to: number, inset: number) => Array.from({ length: 13 }, (_u, i) => { const y = 0.003 + (to - 0.003) * (i / 12); return [Math.max(0.001, shape.r(y) - inset), y] as [number, number]; });
    s.lathe([[0, 0.003], ...samples(shape.H, 0)], wall, [tipX, vesselY, 0]);
    s.ring(shape.r(shape.H) + 0.0005, 0.0017, [tipX, vesselY + shape.H, 0], porcelain ? s.material('#f1eee6', { roughness: 0.3 }) : solidGlass).rotation.x = Math.PI / 2;
    if (a.vessel === 'cylinder') s.cylinder(0.03, 0.032, 0.006, [tipX, vesselY + 0.003, 0], solidGlass, 6);
    if (a.vessel === 'beaker' || a.vessel === 'cylinder') {
      const white = s.material('#fbfbf6', { roughness: 0.6 });
      const marks = a.vessel === 'beaker' ? 4 : 9;
      for (let i = 0; i < marks; i++) s.box([i % 2 ? 0.008 : 0.014, 0.0012, 0.0006], [tipX, vesselY + 0.02 + i * (shape.H - 0.035) / (marks - 1), shape.r(0.05) + 0.0006], white);
    }
    const over = a.amount > 0.86;
    const level = shape.H * mix(0, 0.95, Math.min(1, a.amount / 0.8));
    const surface = vesselY + Math.max(level, 0.005);
    if (level > 0.006) s.lathe([[0, 0.004], ...samples(level, 0.0025), [0, level]], liquid, [tipX, vesselY, 0]);
    if (over) {
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.28, d = shape.r(0.004) + random() * 0.05, w = 0.018 + random() * 0.03;
        const pool = s.cylinder(w, w, 0.0016, [tipX + Math.cos(t) * d, vesselY + 0.001, Math.sin(t) * d * 0.9 + 0.01], liquid, 16);
        if (vesselY > 0 && (Math.abs(pool.position.x) > 0.1 || Math.abs(pool.position.z) > 0.06)) pool.position.y = 0.001;
      }
      for (let i = 0; i < 3; i++) {
        const t = 0.4 + i * 1.1 + random() * 0.5;
        const pts: P3[] = [];
        for (let k = 0; k <= 5; k++) { const y = shape.H * (1 - k / 5); pts.push([tipX + Math.cos(t) * (shape.r(Math.max(0.003, y)) + 0.0015), vesselY + y, Math.sin(t) * (shape.r(Math.max(0.003, y)) + 0.0015)]); }
        s.tube(pts, 0.0028, liquid);
      }
    }

    // Drops between the tip and the surface.
    const falling: THREE.Mesh[] = [];
    if (a.drip > 0.12) {
      const drop = s.ball([0.0042, 0.006, 0.0042], [tipX, tipY - 0.004, 0], liquid, 10);
      if (a.drip > 0.85) {
        drop.visible = false;
        s.rod([tipX, tipY, 0], [tipX, surface, 0], 0.002, liquid);
        s.ring(Math.min(0.012, shape.r(0.01) * 0.6), 0.0012, [tipX, surface + 0.0005, 0], s.material('#ffffff', { roughness: 0.2 })).rotation.x = Math.PI / 2;
      } else if (a.drip > 0.42) {
        const count = 1 + Math.round((a.drip - 0.42) * 5);
        for (let i = 0; i < count; i++) falling.push(s.ball([0.0036, 0.0052, 0.0036], [tipX, mix(tipY - 0.012, surface + 0.006, (i + 0.5 + random() * 0.3) / (count + 0.3)), 0], liquid, 10));
      }
    }

    if (a.note !== 'none') {
      const text = NOTES[a.note];
      const tagY = Math.min(rodTop - 0.07, 0.5 + lift);
      const tag = s.label(text, 0.085, 0.036, [rodX - 0.03, tagY, 0.012], '#8f1f1f', mood.wear > 0.5 ? '#e2d6b4' : '#f4ecd2');
      tag.rotation.z = -0.25 + (random() - 0.5) * 0.3;
      tag.rotation.y = -0.2;
      s.rod([rodX, tagY + 0.03, 0.004], [rodX - 0.005, tagY + 0.012, 0.012], 0.0008, s.material('#d8cfae'));
      s.ring(0.0068, 0.001, [rodX, tagY + 0.03, 0], s.material('#d8cfae')).rotation.x = Math.PI / 2;
    }

    if (a.receiver !== 'direct') {
      const width = Math.max(0.11, shape.r(shape.H) * 2 + 0.035);
      s.box([width, 0.005, width], [tipX, receiverFloor + 0.0025, 0], steel);
      if (a.receiver === 'jack') {
        s.box([width, 0.005, width], [tipX, vesselY - 0.0025, 0], steel);
        for (const z of [-width * 0.3, width * 0.3]) {
          s.rod([tipX - width * 0.35, receiverFloor + 0.007, z], [tipX + width * 0.35, vesselY - 0.007, z], 0.0028, steel);
          s.rod([tipX + width * 0.35, receiverFloor + 0.007, z], [tipX - width * 0.35, vesselY - 0.007, z], 0.0028, steel);
        }
        s.rod([tipX - width * 0.45, receiverFloor + 0.027, 0], [tipX + width * 0.6, receiverFloor + 0.027, 0], 0.0025, iron);
        s.ring(0.009, 0.002, [tipX + width * 0.6, receiverFloor + 0.027, 0], iron).rotation.y = Math.PI / 2;
      } else if (a.receiver === 'stirrer') {
        s.box([width, receiverLift, width], [tipX, receiverFloor + receiverLift / 2, 0], s.material('#728882'));
        s.cylinder(0.007, 0.007, 0.006, [tipX + width * 0.2, receiverFloor + 0.013, width / 2 + 0.003], iron, 12).rotation.x = Math.PI / 2;
      } else for (const side of [-1, 1]) {
        s.box([width, 0.012, 0.003], [tipX, receiverFloor + 0.009, side * width / 2], steel);
        s.box([0.003, 0.012, width], [tipX + side * width / 2, receiverFloor + 0.009, 0], steel);
      }
    }
    if (a.backdrop !== 'none') {
      const x = tipX + (a.backdrop === 'ruler' ? 0.066 : 0), z = -0.065, y = vesselY + 0.10;
      const width = a.backdrop === 'ruler' ? 0.023 : 0.11;
      s.box([width, 0.18, 0.003], [x, y, z], s.material(a.backdrop === 'black' ? '#263b3f' : '#ebe9d9'));
      s.rod([rodX, 0.09, 0], [x, 0.09, z - 0.004], 0.0025, steel);
      s.rod([x, 0.09, z - 0.004], [x, y, z - 0.004], 0.0025, steel);
      if (a.backdrop === 'ruler') for (let i = 0; i < 14; i++) s.box([i % 5 ? 0.007 : 0.015, 0.0008, 0.0005], [x, vesselY + 0.025 + i * 0.011, z + 0.0018], iron);
    }
    if (a.service === 'spare') {
      s.rod([rodX, 0.18, 0], [rodX - 0.06, 0.18, 0], 0.003, steel);
      s.ring(0.025, 0.0025, [rodX - 0.085, 0.18, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.service === 'timer') {
      s.rod([rodX, 0.16, 0], [rodX - 0.035, 0.14, 0.009], 0.0015, steel);
      s.cylinder(0.025, 0.025, 0.009, [rodX - 0.035, 0.115, 0.009], iron, 24).rotation.x = Math.PI / 2;
      s.cylinder(0.022, 0.022, 0.001, [rodX - 0.035, 0.115, 0.014], s.material('#eee9d2'), 24).rotation.x = Math.PI / 2;
      s.rod([rodX - 0.035, 0.115, 0.015], [rodX - 0.023, 0.126, 0.015], 0.001, iron);
    } else if (a.service === 'thermometer') {
      s.box([0.021, 0.21, 0.006], [rodX - 0.027, 0.275, 0], s.material('#e6e1cb'));
      for (const y of [0.19, 0.36]) s.rod([rodX, y, 0], [rodX - 0.027, y, 0], 0.002, steel);
      s.rod([rodX - 0.027, 0.18, 0.004], [rodX - 0.027, 0.34, 0.004], 0.0015, solidGlass);
      s.rod([rodX - 0.027, 0.18, 0.006], [rodX - 0.027, 0.27, 0.006], 0.0008, rubber);
    }

    const span = Math.max(0.02, tipY - surface - 0.01);
    const speed = mix(0.25, 1.1, a.drip) * mix(0.6, 1.5, mood.energy);
    const starts = falling.map((f) => (tipY - f.position.y) / span);
    return s.finish({
      update: (_dt, time) => { falling.forEach((f, i) => { const t = (starts[i] + time * speed) % 1; f.position.y = tipY - 0.008 - t * t * span; }); },
    });
  },
});
