import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { type V, add, ball, box, cyl, decal, group, hazard, paint, rod, stencil, tube } from './h';

const CARGO = {
  coolant: { tank: '#a9c0cf', band: '#2f7fc4', fluid: '#58d4f0', word: 'CRYO COOLANT' },
  fuel: { tank: '#b8442a', band: '#f1efe6', fluid: '#b9781e', word: 'FLAMMABLE' },
  hydraulic: { tank: '#8a9299', band: '#a52a55', fluid: '#b02a4a', word: 'HYD FLUID' },
  unmarked: { tank: '#4c5247', band: '#3a3f37', fluid: '#7fcf4a', word: '' },
} as const;

export default defineThing({
  questions: {
    cargo: choice('What does it carry?', {
      coolant: 'Cryogenic coolant: a white tank with a blue band, rimed with frost, breathing cold vapour.',
      fuel: 'Fuel: a red tank with flame placards and a smell you can almost see.',
      hydraulic: 'Hydraulic fluid: a grey tank banded magenta, everything near it a little slick.',
      unmarked: 'Something unmarked: placards painted over, a faint sickly green at the sight glass.',
    }),
    status: choice('What is its situation?', {
      standby: 'Standing by: full, hoses coiled on their hooks, valves shut.',
      connected: 'Connected: a hose runs out across the floor to a coupling and is pumping.',
      leaking: 'Leaking: a spreading puddle under the valves, a bucket shoved beneath, a rag tied on.',
      drained: 'Drained: top hatch open, an EMPTY tag wired to it, hoses dropped where they fell.',
    }),
    tank: choice('What shape is the tank?', {
      drum: 'One fat horizontal drum with domed ends.',
      sphere: 'A sphere held in a ring frame, like a little gas holder.',
      twin: 'Two slimmer cylinders side by side.',
    }),
    chassis: choice('What carries the tank?', {
      trailer: 'A two-axle trailer with a tow bar and jockey wheel.',
      tug: 'A self-propelled chassis with a tiny one-seat cab.',
    }),
    level: score('How full does the sight glass read?', ['Empty', 'A quarter', 'Half', 'Brim full']),
    vent: score('How hard is the relief valve venting?', ['Not at all', 'A thin wisp', 'A steady plume', 'Roaring']),
    kit: noul('Is a spill kit (bucket, gloves, cone) left by the wheel?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = s.root;
    const c = CARGO[a.cargo];
    const shell = s.material(c.tank, { roughness: 0.4, metalness: 0.3 });
    const band = s.material(c.band, { roughness: 0.5 });
    const frame = s.material('#3a3e42', { roughness: 0.6, metalness: 0.4 });
    const dark = s.material('#1f2123', { roughness: 0.8 });
    const steel = s.material('#9aa1a5', { roughness: 0.35, metalness: 0.8 });
    const rubber = s.material('#18191a', { roughness: 0.95 });
    const redPaint = s.material('#c22a1e', { roughness: 0.5 });
    const fluid = new THREE.MeshStandardMaterial({ color: c.fluid, emissive: c.fluid, emissiveIntensity: a.cargo === 'fuel' ? 0.1 : 0.45, roughness: 0.15 });
    const frostAmount = a.cargo === 'coolant' ? mix(1, 0.3, mood.warmth) : 0;
    const frost = new THREE.MeshStandardMaterial({ color: '#f4fafc', roughness: 1 });
    const hoseTone = a.cargo === 'coolant' ? '#dfeaf0' : a.cargo === 'fuel' ? '#27292b' : a.cargo === 'hydraulic' ? '#d08a1c' : '#3d4a3a';
    const hose = s.material(hoseTone, { roughness: 0.9 });
    const level = a.status === 'drained' ? 0 : a.level;

    // Chassis: ladder frame, four wheels with fenders, hazard-striped bumper.
    const tug = a.chassis === 'tug';
    box(R, [3.3, 0.16, 1.15], [0, 0.66, 0], frame);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 1.0, z = sz * 0.72;
      cyl(R, 0.37, 0.37, 0.28, [x, 0.37, z], rubber, [Math.PI / 2, 0, 0], 18);
      cyl(R, 0.19, 0.19, 0.3, [x, 0.37, z], steel, [Math.PI / 2, 0, 0], 8);
      box(R, [0.95, 0.05, 0.36], [x, 0.8, z], frame);
      box(R, [0.05, 0.22, 0.36], [x - 0.47, 0.7, z], frame); box(R, [0.05, 0.22, 0.36], [x + 0.47, 0.7, z], frame);
    }
    box(R, [0.08, 0.2, 1.5], [1.68, 0.62, 0], new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.7 }));
    if (tug) {
      box(R, [1.0, 0.16, 1.15], [-2.1, 0.66, 0], frame);
      box(R, [0.9, 0.55, 1.2], [-2.1, 1.0, 0], shell);
      box(R, [0.75, 0.75, 1.1], [-1.95, 1.65, 0], shell);
      box(R, [0.04, 0.5, 0.95], [-2.34, 1.68, 0], new THREE.MeshStandardMaterial({ color: '#28414d', roughness: 0.15, metalness: 0.6 }));
      box(R, [0.5, 0.5, 0.03], [-1.95, 1.68, 0.56], new THREE.MeshStandardMaterial({ color: '#28414d', roughness: 0.15, metalness: 0.6 }));
      box(R, [0.85, 0.06, 1.2], [-1.95, 2.05, 0], band);
      for (const sz of [-1, 1]) {
        cyl(R, 0.3, 0.3, 0.24, [-2.2, 0.3, sz * 0.66], rubber, [Math.PI / 2, 0, 0], 16);
        cyl(R, 0.07, 0.07, 0.04, [-2.56, 0.95, sz * 0.4], new THREE.MeshStandardMaterial({ color: '#fff4c9', emissive: '#fff0b0', emissiveIntensity: mix(0.2, 1.4, mood.energy) }), [0, 0, Math.PI / 2], 10);
      }
      const strobe = cyl(R, 0.07, 0.08, 0.12, [-1.95, 2.14, 0], new THREE.MeshStandardMaterial({ color: '#f19a1c', emissive: '#f19a1c', emissiveIntensity: 0.8 }), [0, 0, 0], 10);
      strobe.name = 'strobe';
    } else {
      rod(R, [-1.65, 0.62, 0.4], [-2.55, 0.55, 0], 0.045, frame); rod(R, [-1.65, 0.62, -0.4], [-2.55, 0.55, 0], 0.045, frame);
      add(R, new THREE.TorusGeometry(0.09, 0.03, 6, 14), steel, [-2.64, 0.55, 0], [Math.PI / 2, 0, 0]);
      rod(R, [-2.2, 0.6, 0], [-2.2, 0.16, 0], 0.03, steel);
      cyl(R, 0.12, 0.12, 0.08, [-2.2, 0.12, 0], rubber, [Math.PI / 2, 0, 0], 12);
      rod(R, [-2.2, 0.6, 0], [-2.2, 0.95, 0], 0.02, steel); rod(R, [-2.2, 0.95, 0], [-2.05, 0.95, 0], 0.02, steel);
    }

    // The tank itself. Each form reports where its front face and top are, for labels and fittings.
    let front = 0.74, topY = 2.3, glassX = -0.95, endX = 1.3;
    const drum = (r: number, half: number, at: V) => {
      const profile: [number, number][] = [[0.001, -half - r * 0.42], [r * 0.6, -half - r * 0.34], [r * 0.93, -half - r * 0.14], [r, -half], [r, half], [r * 0.93, half + r * 0.14], [r * 0.6, half + r * 0.34], [0.001, half + r * 0.42]];
      const g = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28);
      g.rotateZ(Math.PI / 2);
      add(R, g, shell, at);
      for (const sx of [-1, 1]) {
        cyl(R, r + 0.008, r + 0.008, 0.2, [at[0] + sx * half * 0.84, at[1], at[2]], band, [0, 0, Math.PI / 2], 28);
        cyl(R, r + 0.02, r + 0.02, 0.05, [at[0] + sx * half * 0.38, at[1], at[2]], frame, [0, 0, Math.PI / 2], 28);
        box(R, [0.18, at[1] - 0.74 - r * 0.6, r * 1.5], [at[0] + sx * half * 0.38, (at[1] - r * 0.6 + 0.74) / 2, at[2]], frame);
      }
      if (frostAmount > 0) {
        const rime = new THREE.CylinderGeometry(r + 0.024, r + 0.024, half * 2 + r * 0.2, 28, 1, true, Math.PI * 0.82 + (1 - frostAmount) * 0.7, Math.PI * 1.36 - (1 - frostAmount) * 1.4);
        rime.rotateZ(Math.PI / 2);
        const m = add(R, rime, frost, at); m.material = new THREE.MeshStandardMaterial({ color: '#f4fafc', roughness: 1, side: THREE.DoubleSide });
        const icicles = Array.from({ length: Math.round(18 * frostAmount) }, () => ({ at: [at[0] + (random() - 0.5) * half * 2, at[1] - r - 0.03, at[2] + (random() - 0.5) * r * 0.5] as V, size: 0.5 + random() }));
        s.scatter(new THREE.ConeGeometry(0.03, 0.22, 5).rotateX(Math.PI), frost, icicles);
      }
    };
    if (a.tank === 'drum') { drum(0.74, 0.95, [0, 1.62, 0]); front = 0.74; topY = 2.36; }
    else if (a.tank === 'twin') { for (const sz of [-1, 1]) drum(0.42, 1.05, [0, 1.3, sz * 0.45]); front = 0.87; topY = 1.72; endX = 1.25; box(R, [0.5, 0.06, 0.5], [0, 1.72, 0], frame); }
    else {
      const r = 1.0, cy = 1.95;
      ball(R, [r, r, r], [0, cy, 0], shell, 28);
      add(R, new THREE.TorusGeometry(r + 0.03, 0.06, 8, 36), frame, [0, cy - 0.15, 0], [Math.PI / 2, 0, 0]);
      add(R, new THREE.TorusGeometry(r * 0.9, 0.035, 6, 36), band, [0, cy + 0.42, 0], [Math.PI / 2, 0, 0]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(R, [sx * 0.74, cy - 0.15, sz * 0.74], [sx * 1.0, 0.74, sz * 0.5], 0.05, frame);
      if (frostAmount > 0) {
        add(R, new THREE.SphereGeometry(r + 0.012, 28, 10, 0, Math.PI * 2, Math.PI * (1 - 0.42 * frostAmount), Math.PI * 0.42 * frostAmount), frost, [0, cy, 0]);
        s.scatter(new THREE.ConeGeometry(0.03, 0.22, 5).rotateX(Math.PI), frost, Array.from({ length: Math.round(12 * frostAmount) }, () => ({ at: [(random() - 0.5) * 0.7, cy - r + 0.02, (random() - 0.5) * 0.7] as V, size: 0.5 + random() })));
      }
      front = 0.96; topY = 2.95; glassX = -0.3; endX = 1.02;
    }
    const frontY = a.tank === 'sphere' ? 2.1 : a.tank === 'twin' ? 1.3 : 1.62;

    // Lettering and the hazard diamond, on plates standing just proud of the curve.
    const ink = a.cargo === 'coolant' ? '#1f4f86' : '#f1efe6';
    if (c.word) {
      const label = paint(512, 96, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); stencil(ctx, c.word, w / 2, h / 2 + 4, 76, ink, 'center', w - 20); });
      decal(R, label, a.tank === 'sphere' ? 0.62 : 0.95, a.tank === 'sphere' ? 0.116 : 0.18, a.tank === 'sphere' ? [0, 2.0, 1.012] : [0.22, frontY + 0.02, front + 0.03]);
    } else box(R, a.tank === 'sphere' ? [0.6, 0.14, 0.01] : [0.9, 0.2, 0.01], a.tank === 'sphere' ? [0, 2.0, 1.004] : [0.22, frontY + 0.02, front + 0.024], s.material('#6a7064', { roughness: 0.95 }));
    const diamond = paint(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.save(); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#1d1d1b'; ctx.fillRect(-44, -44, 88, 88);
      ctx.fillStyle = { coolant: '#2f7fc4', fuel: '#d5281f', hydraulic: '#e8b21c', unmarked: '#6a6f66' }[a.cargo]; ctx.fillRect(-38, -38, 76, 76);
      ctx.restore();
      ctx.fillStyle = ctx.strokeStyle = '#f7f5ee'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      if (a.cargo === 'coolant') for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate((i * Math.PI) / 3); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); ctx.restore(); }
      else if (a.cargo === 'fuel') { ctx.beginPath(); ctx.moveTo(0, -30); ctx.bezierCurveTo(26, -4, 22, 26, 0, 26); ctx.bezierCurveTo(-24, 26, -22, 4, -8, -8); ctx.bezierCurveTo(-6, 4, 2, 0, 0, -30); ctx.fill(); }
      else if (a.cargo === 'hydraulic') { ctx.fillStyle = '#1d1d1b'; ctx.beginPath(); ctx.moveTo(0, -28); ctx.bezierCurveTo(24, 4, 18, 26, 0, 26); ctx.bezierCurveTo(-18, 26, -24, 4, 0, -28); ctx.fill(); }
      else { ctx.fillStyle = '#4c5247'; ctx.fillRect(-30, -12, 60, 24); }
    });
    decal(R, diamond, 0.36, 0.36, a.tank === 'sphere' ? [0, 1.72, 0.99] : [-0.46, frontY, front + 0.032]);

    // Sight glass: a vertical tube standing off the tank, filled to the level.
    const gh = a.tank === 'twin' ? 0.55 : 0.9;
    const gz = (a.tank === 'sphere' ? 0.9 : front) + 0.07;
    const gx = a.tank === 'sphere' ? -0.6 : glassX + (a.tank === 'drum' ? 0.02 : 0);
    box(R, [0.09, gh + 0.08, 0.03], [gx, frontY, gz - 0.03], dark);
    if (level > 0.02) box(R, [0.055, gh * level, 0.035], [gx, frontY - gh / 2 + (gh * level) / 2, gz], fluid);
    for (const t of [-1, 1]) { box(R, [0.12, 0.05, 0.1], [gx, frontY + t * (gh / 2 + 0.04), gz - 0.04], steel); }

    // Top: manway hatch and relief valve.
    const hatchX = a.tank === 'sphere' ? 0 : -0.4;
    cyl(R, 0.24, 0.26, 0.12, [hatchX, topY + 0.03, 0], frame, [0, 0, 0], 18);
    const lid = group(R, [hatchX - 0.24, topY + 0.1, 0], [0, 0, a.status === 'drained' ? 1.9 : 0]);
    cyl(lid, 0.25, 0.25, 0.05, [0.24, 0.02, 0], band, [0, 0, 0], 18);
    add(lid, new THREE.TorusGeometry(0.13, 0.02, 6, 16), steel, [0.24, 0.1, 0], [Math.PI / 2, 0, 0]);
    const ventX = a.tank === 'sphere' ? 0.45 : 0.55, ventY = a.tank === 'sphere' ? topY - 0.14 : topY;
    cyl(R, 0.06, 0.08, 0.35, [ventX, ventY + 0.15, 0], steel, [0, 0, 0], 10);
    cyl(R, 0.1, 0.1, 0.06, [ventX, ventY + 0.34, 0], redPaint, [0, 0, 0], 10);
    if (a.tank !== 'sphere') {
      // A catwalk and ladder for whoever has to dip the tank.
      box(R, [1.9, 0.04, 0.4], [0.1, topY + 0.0, -0.32], frame);
      for (const sx of [-1, 1]) rod(R, [1.05 + sx * 0.16, 0.74, -0.75], [1.05 + sx * 0.16, topY, -0.52], 0.022, steel);
      for (let y = 0.95; y < topY; y += 0.27) rod(R, [0.89, y, -0.75 + (y - 0.74) / (topY - 0.74) * 0.23], [1.21, y, -0.75 + (y - 0.74) / (topY - 0.74) * 0.23], 0.018, steel, 6);
    }
    if (a.status === 'drained') {
      const tag = paint(128, 64, (ctx, w, h) => { ctx.fillStyle = '#f1efe6'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#c22a1e'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8); stencil(ctx, 'EMPTY', w / 2, h / 2 + 2, 40, '#c22a1e'); });
      decal(R, tag, 0.5, 0.25, [0.75, frontY + (a.tank === 'twin' ? 0.3 : 0.38), front + (a.tank === 'twin' ? -0.1 : -0.06)], [-(a.tank === 'twin' ? 0.8 : 0.5), 0, -0.12], { alphaTest: 0 });
    }

    // Rear service panel: dials, valve wheels, outlets.
    const px = endX + 0.28;
    box(R, [0.3, 0.75, 1.0], [px, 1.14, 0], frame);
    const dial = (needle: number) => paint(64, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#2a2d30'; ctx.beginPath(); ctx.arc(32, 32, 31, 0, 7); ctx.fill();
      ctx.fillStyle = '#f1efe6'; ctx.beginPath(); ctx.arc(32, 32, 26, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c22a1e'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(32, 32, 21, -0.6, 0.5); ctx.stroke();
      ctx.strokeStyle = '#1d1d1b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(32, 32);
      const ang = Math.PI * (0.8 + needle * 1.4); ctx.lineTo(32 + Math.cos(ang) * 22, 32 + Math.sin(ang) * 22); ctx.stroke();
    });
    const needles = [level, a.status === 'connected' ? 0.7 + random() * 0.2 : a.vent * 0.8 + 0.1, a.status === 'drained' ? 0 : 0.3 + random() * 0.4];
    needles.forEach((n, i) => decal(R, dial(n), 0.26, 0.26, [px + 0.155, 1.33, (i - 1) * 0.31], [0, Math.PI / 2, 0]));
    for (const z of [-0.3, 0.3]) {
      cyl(R, 0.06, 0.06, 0.14, [px + 0.2, 0.98, z], steel, [0, 0, Math.PI / 2], 10);
      add(R, new THREE.TorusGeometry(0.09, 0.02, 6, 14), redPaint, [px + 0.28, 0.98, z], [0, Math.PI / 2, 0]);
    }
    const outlet: V = [px + 0.05, 0.86, 0.52];
    cyl(R, 0.07, 0.07, 0.16, outlet, steel, [Math.PI / 2, 0, 0], 10);

    // Hoses: coiled on the flank, run out to a floor coupling, or dropped.
    const coilAt = (x: number, y: number, z: number, lay = false) => {
      for (let i = 0; i < 3; i++) add(R, new THREE.TorusGeometry(0.3 - i * 0.012, 0.045, 6, 22), hose, [x, y + (lay ? i * 0.085 : 0), z + (lay ? 0 : i * 0.085)], [lay ? Math.PI / 2 : 0, 0, 0]);
      if (frostAmount > 0.5) s.scatter(new THREE.SphereGeometry(0.035, 6, 4), frost, Array.from({ length: 16 }, (_u, i) => ({ at: lay ? [x + Math.cos(i * 0.4) * 0.3, y + 0.24, z + Math.sin(i * 0.4) * 0.3] as V : [x + Math.cos(i * 0.4) * 0.3, y + Math.sin(i * 0.4) * 0.3, z + 0.24] as V, size: 0.6 + random() * 0.8 })));
    };
    const hookZ = a.tank === 'twin' ? 0.9 : 0.6;
    if (a.status === 'drained') {
      coilAt(0.3, 0.05, 1.25, true);
      tube(R, [[0.6, 0.05, 1.3], [1.2, 0.05, 1.5], [1.7, 0.05, 1.1], [outlet[0] + 0.1, 0.3, 0.8], [outlet[0], outlet[1], outlet[2] + 0.08]], 0.045, hose);
    } else {
      rod(R, [0.25, 1.02, hookZ - 0.1], [0.25, 1.02, hookZ + 0.3], 0.025, steel);
      coilAt(0.25, 0.74, hookZ + 0.02);
    }
    let pulse: THREE.Mesh | null = null;
    if (a.status === 'connected') {
      const pts: V[] = [[outlet[0], outlet[1], outlet[2] + 0.08], [outlet[0] + 0.05, 0.4, 0.95], [outlet[0] - 0.2, 0.06, 1.35], [0.9, 0.06, 1.75 + random() * 0.3], [0.2, 0.06, 1.55], [-0.5, 0.06, 1.9], [-0.95, 0.14, 1.95]];
      tube(R, pts, 0.05, hose);
      box(R, [0.5, 0.1, 0.5], [-1.2, 0.05, 1.95], frame);
      cyl(R, 0.09, 0.09, 0.3, [-1.08, 0.16, 1.95], steel, [0, 0, Math.PI / 2], 10);
      pulse = cyl(R, 0.1, 0.1, 0.07, [-0.93, 0.16, 1.95], fluid, [0, 0, Math.PI / 2], 10);
      if (frostAmount > 0.3) s.scatter(new THREE.SphereGeometry(0.04, 6, 4), frost, pts.slice(1).flatMap((p) => [0, 1, 2].map(() => ({ at: [p[0] + (random() - 0.5) * 0.3, p[1] + 0.04, p[2] + (random() - 0.5) * 0.2] as V, size: 0.5 + random() }))));
    }
    if (a.status === 'leaking') {
      const pool = new THREE.MeshStandardMaterial({ color: c.fluid, emissive: c.fluid, emissiveIntensity: a.cargo === 'fuel' ? 0.05 : 0.3, roughness: 0.05, metalness: a.cargo === 'fuel' ? 0.6 : 0.2 });
      const blobs = 5 + Math.round(mood.wear * 4);
      for (let i = 0; i < blobs; i++) {
        const m = cyl(R, 1, 1, 0.012, [px - 0.1 + (random() - 0.5) * 1.0, 0.006 + i * 0.0005, 0.5 + random() * 0.9], pool, [0, 0, 0], 16);
        m.scale.set(0.25 + random() * 0.45, 1, 0.2 + random() * 0.4);
      }
      rod(R, [outlet[0], outlet[1] - 0.06, outlet[2] + 0.06], [outlet[0], 0.36, outlet[2] + 0.06], 0.012, pool, 5);
      cyl(R, 0.17, 0.13, 0.3, [outlet[0], 0.15, outlet[2] + 0.08], s.material('#d8a21c'), [0, 0, 0], 14);
      cyl(R, 0.155, 0.155, 0.02, [outlet[0], 0.26, outlet[2] + 0.08], pool, [0, 0, 0], 14);
      box(R, [0.03, 0.3, 0.14], [px + 0.2, 0.84, 0.3], s.material('#d9d2c0', { roughness: 1 }), [0.2, 0, 0.1]);
    }
    if (a.kit) {
      const kx = -0.2 + random() * 0.4, kz = 1.2 + (a.status === 'drained' ? 0.7 : 0);
      cyl(R, 0.16, 0.12, 0.28, [kx - 0.9, 0.14, kz], s.material('#3f6fb0'), [0, 0, 0], 14);
      add(R, new THREE.TorusGeometry(0.16, 0.012, 5, 14, Math.PI), steel, [kx - 0.9, 0.28, kz]);
      cyl(R, 0.03, 0.15, 0.5, [kx - 0.45, 0.27, kz + 0.2], s.material('#e8601c'), [0, 0, 0], 10);
      box(R, [0.36, 0.03, 0.36], [kx - 0.45, 0.015, kz + 0.2], s.material('#e8601c'));
      for (const t of [0, 1]) box(R, [0.12, 0.03, 0.22], [kx - 1.25 + t * 0.14, 0.02 + t * 0.02, kz + 0.15], s.material('#d8a21c'), [0, 0.3 + t * 0.5, 0]);
    }

    // The plume: soft puffs that are not measured as solid, rising from the relief valve.
    const strength = Math.max(0, a.vent - (a.status === 'drained' ? 0.6 : 0));
    const puffs: THREE.Mesh[] = [];
    const vapour = new THREE.MeshStandardMaterial({ color: a.cargo === 'fuel' ? '#b8b2a4' : a.cargo === 'unmarked' ? '#cfe8c0' : '#f2f8fb', transparent: true, opacity: 0.2 + strength * 0.3, depthWrite: false, roughness: 1 });
    const count = strength < 0.08 ? 0 : Math.round(3 + strength * 7);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      const puff = ball(R, [1, 1, 1], [ventX + t * 0.5 * (0.5 + random()), ventY + 0.45 + t * (0.8 + strength * 1.4), (random() - 0.5) * 0.3 * t], vapour, 10);
      puff.scale.setScalar(0.1 + t * (0.2 + strength * 0.35));
      puff.castShadow = puff.receiveShadow = false;
      puff.userData = { y: puff.position.y, s: puff.scale.x, p: random() * 6 };
      puffs.push(puff);
    }
    const strobe = R.getObjectByName('strobe') as THREE.Mesh | undefined;

    return s.finish({
      update: (_dt, time) => {
        const rate = mix(0.5, 2.2, mood.energy);
        for (const puff of puffs) {
          const u = puff.userData as { y: number; s: number; p: number };
          const k = (time * rate * 0.3 + u.p) % 1;
          puff.position.y = u.y + k * 0.35;
          puff.scale.setScalar(u.s * (0.85 + k * 0.4));
        }
        if (pulse) pulse.scale.setScalar(1 + Math.sin(time * 5 * rate) * 0.12);
        if (strobe) (strobe.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * 6) > 0 ? 2 : 0.2;
      },
    });
  },
});
