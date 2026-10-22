import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Pt, blob, ell, g, horn, human, painted, shell, shellPoint, type ShellSpec } from './face';

const RIBBONS = {
  crimson: 'Crimson theatre-curtain red.',
  purple: 'Royal purple.',
  gold: 'Gold satin.',
  black: 'Black, as for mourning or a closed show.',
  teal: 'Peacock teal.',
  white: 'White silk.',
} as const;
const RIBBON_COLOUR: Record<keyof typeof RIBBONS, string> = { crimson: '#b3172b', purple: '#5c2a86', gold: '#d9a521', black: '#1c1a1d', teal: '#167f84', white: '#efeadd' };

export default defineThing({
  questions: {
    material: choice('What are the masks made of?', {
      bronze: 'Cast bronze, brown with green patina in the hollows.',
      plaster: 'White plaster, matte and chalky, like a drama-school casting.',
      gilded: 'Gilded carved wood, bright gold with red bole showing through.',
      terracotta: 'Cracked terracotta in the ancient Greek style, with high moulded hair and mouths flared open like funnels.',
    }),
    front: choice('Which mask is in front?', { comedy: 'The laughing mask leads.', tragedy: 'The weeping mask leads.' }),
    arrangement: choice('How are the two arranged?', {
      side: 'Side by side, tilted away from each other.',
      overlapping: 'Overlapping, one half hiding behind the other.',
      fallen: 'One still up, the other fallen off and lying at the foot.',
    }),
    mount: choice('How are they shown?', {
      ribbon: 'Hung by ribbons from a brass T-shaped stand, the ribbon tails trailing.',
      plaque: 'Mounted on a dark wooden plaque propped upright, with a ribbon bow above.',
    }),
    ribbon: choice('What colour is the ribbon?', RIBBONS),
    damage: choice('Is one of the masks damaged?', {
      none: 'Both are whole.',
      comedy: 'The laughing mask is broken: a piece gone from its brow, cracks running through the grin.',
      tragedy: 'The weeping mask is broken: a piece gone from its brow, cracks running down like tears.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const greek = a.material === 'terracotta';
    const colour = { bronze: '#7d5a2c', plaster: '#ece6da', gilded: '#d6a738', terracotta: '#b9683f' }[a.material];
    const silk = s.material(RIBBON_COLOUR[a.ribbon], { roughness: 0.45, side: THREE.DoubleSide });

    const make = (kind: 'comedy' | 'tragedy') => {
      const happy = kind === 'comedy';
      const broken = a.damage === kind;
      const base = human(happy ? { cheek: 2, smile: 1.6, brow: 0.9, lips: 0, nose: 1.1, chin: 1.2 } : { cheek: 0.6, brow: 1.7, lips: 0, nose: 1.1, socket: 1.3, chin: 0.9 });
      const mouthV = happy ? -0.52 : -0.54;
      const chip = (random() < 0.5 ? -1 : 1);
      const spec: ShellSpec = {
        w: 0.2, h: 0.27, d: 0.07, taper: 0.24, round: greek ? 2.8 : 2.3, segU: 100, segV: 132,
        relief: (u, v) => {
          const au = Math.abs(u);
          let r = base(u, v);
          r += 0.12 * g(v, happy ? 0.4 + 0.1 * (1 - ((au - 0.42) / 0.3) ** 2) : 0.5 - 0.32 * au, 0.045) * sstepWindow(au);
          if (greek) {
            const dist = Math.hypot(u / 0.62, (v - mouthV) / 0.3);
            r += 0.34 * g(dist, 1, 0.3);
            if (v > 0.62) r += 0.1 * Math.abs(Math.sin(u * 11)) * Math.min(1, (v - 0.62) * 6);
          }
          return r;
        },
        hole: (u, v) => {
          const au = Math.abs(u);
          if (broken && chip * u * 0.75 + v * 0.66 > 0.72 + 0.05 * Math.sin(u * 23) + 0.04 * Math.sin(v * 31)) return true;
          if (happy) {
            const x = (au - 0.42) / 0.21;
            if (Math.abs(x) < 1 && v > 0.09 + 0.06 * (1 - x * x) && v < 0.09 + 0.17 * (1 - x * x)) return true;
            const m = u / 0.58;
            return Math.abs(m) < 1 && v < -0.38 + 0.14 * m * m && v > -0.74 + 0.5 * m * m;
          }
          if (ell(au, v, 0.42, 0.13, 0.18, 0.065, -0.5) < 1) return true;
          const m = u / 0.5;
          return Math.abs(m) < 1 && v < -0.4 - 0.3 * m * m && v > -0.62 - 0.08 * m * m;
        },
      };
      const texture = painted(384, 512, (ctx, X, Y, W, H) => {
        ctx.fillStyle = colour; ctx.fillRect(0, 0, W, H);
        const age = mood.wear;
        if (a.material === 'bronze') for (let i = 0; i < 20 + age * 50; i++) { ctx.fillStyle = `rgba(88,160,132,${0.12 + random() * 0.3})`; blob(ctx, random() * W, random() * H, 8 + random() * 34, random); ctx.fill(); }
        if (a.material === 'gilded') for (let i = 0; i < 6 + age * 40; i++) { ctx.fillStyle = `rgba(150,40,26,${0.4 + random() * 0.4})`; blob(ctx, random() * W, random() * H, 5 + random() * 18, random); ctx.fill(); }
        if (a.material === 'plaster') for (let i = 0; i < age * 30; i++) { ctx.fillStyle = `rgba(120,105,85,${0.1 + random() * 0.2})`; blob(ctx, random() * W, random() * H, 10 + random() * 40, random); ctx.fill(); }
        if (greek) {
          ctx.fillStyle = 'rgba(240,225,200,0.35)'; for (let i = 0; i < 14; i++) { blob(ctx, random() * W, random() * H, 14 + random() * 40, random); ctx.fill(); }
          ctx.fillStyle = '#6d2f1b'; ctx.fillRect(0, 0, W, Y(0.66));
        }
        // Shade the hollows so the expression carries at a distance.
        ctx.strokeStyle = 'rgba(20,12,6,0.4)'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          if (happy) { ctx.moveTo(X(side * 0.2), Y(0.36)); ctx.quadraticCurveTo(X(side * 0.42), Y(0.5), X(side * 0.68), Y(0.38)); }
          else { ctx.moveTo(X(side * 0.14), Y(0.46)); ctx.lineTo(X(side * 0.68), Y(0.26)); }
          ctx.stroke();
        }
        const cracks = (broken ? 9 : 0) + (greek ? 5 : 0) + Math.round(age * 4);
        ctx.strokeStyle = 'rgba(18,10,6,0.85)'; ctx.lineWidth = 2.5;
        for (let i = 0; i < cracks; i++) {
          let x = broken && i < 9 ? X(chip * (0.3 + random() * 0.4)) : random() * W, y = broken && i < 9 ? Y(0.5 + random() * 0.2) : random() * H;
          ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 50 - (broken ? chip * 8 : 0); y += 12 + random() * 44; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      });
      const metal = a.material === 'bronze' ? 0.75 : a.material === 'gilded' ? 0.7 : 0;
      const group = new THREE.Group();
      group.add(shell(spec, new THREE.MeshStandardMaterial({ map: texture, metalness: metal, roughness: a.material === 'gilded' ? 0.32 : a.material === 'bronze' ? 0.45 : 0.85, side: THREE.DoubleSide })));
      return { group, spec };
    };
    function sstepWindow(au: number) { return g(au, 0.42, 0.26); }

    const first = make(a.front), second = make(a.front === 'comedy' ? 'tragedy' : 'comedy');
    const plaque = a.mount === 'plaque';
    const lean = plaque ? -0.2 : 0;
    const centreY = plaque ? 0.25 : 0.3;
    const board = new THREE.Group();
    board.rotation.x = lean;
    s.root.add(board);
    const fixed = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; board.add(mesh); return mesh; };

    const sideSign = random() < 0.5 ? -1 : 1;
    const spread = a.arrangement === 'overlapping' ? 0.062 : 0.118;
    first.group.position.set(sideSign * spread, centreY + (a.arrangement === 'overlapping' ? -0.02 : 0), a.arrangement === 'overlapping' ? 0.045 : 0.012);
    first.group.rotation.z = -sideSign * (0.16 + random() * 0.08);
    second.group.position.set(-sideSign * spread, centreY + (a.arrangement === 'overlapping' ? 0.03 : 0), 0);
    second.group.rotation.z = sideSign * (0.16 + random() * 0.08);
    board.add(first.group);
    const fallen = a.arrangement === 'fallen';
    if (fallen) {
      second.group.position.set(-sideSign * 0.16, 0.085, 0.2 + random() * 0.04);
      second.group.rotation.set(-1.05, sideSign * 0.3, sideSign * (0.5 + random() * 0.6));
      s.root.add(second.group);
    } else board.add(second.group);

    const top = (m: { spec: ShellSpec; group: THREE.Group }, u: number): Pt => {
      const p = shellPoint(m.spec, u, 0.8).applyEuler(m.group.rotation).add(m.group.position);
      return [p.x, p.y, p.z - 0.01];
    };
    const band = (points: Pt[], width = 0.011) => { const r = horn(points, () => width, silk, { sides: 6, steps: 18, squash: 0.18, side: [1, 0, 0] }); board.add(r); return r; };

    if (plaque) {
      const wood = s.material('#3b2416', { roughness: 0.45 });
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 0.3, 0.215, 0, Math.PI * 2);
      const slab = fixed(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 40 }), wood));
      slab.position.set(0, 0.25, -0.05);
      const rim = fixed(new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 60), s.material('#b78a3a', { metalness: 0.7, roughness: 0.35 })));
      rim.scale.set(0.285, 0.2, 0.3); rim.position.set(0, 0.25, -0.026);
      s.rod([0, 0.28, -0.125], [0, 0, -0.27], 0.01, wood);
      s.box([0.3, 0.02, 0.05], [0, 0.01, -0.045], wood);
      // Bow at the top of the plaque.
      for (const side of [-1, 1]) {
        const loop = fixed(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 20), silk));
        loop.scale.set(1.5, 0.8, 0.5); loop.position.set(side * 0.045, 0.44, -0.015); loop.rotation.z = side * 0.3;
        band([[side * 0.01, 0.44, -0.015], [side * 0.04, 0.4, -0.012], [side * (0.06 + random() * 0.03), 0.34 + random() * 0.02, -0.012]]);
      }
      fixed(new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), silk)).position.set(0, 0.44, -0.01);
      if (fallen) fixed(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.012, 8), s.material('#b78a3a', { metalness: 0.7 }))).position.set(-sideSign * spread, centreY + 0.07, -0.02);
    } else {
      const brass = s.material('#b78a3a', { metalness: 0.8, roughness: 0.3 });
      s.cylinder(0.11, 0.125, 0.02, [0, 0.01, -0.03], brass, 32);
      s.rod([0, 0.02, -0.03], [0, 0.56, -0.03], 0.009, brass);
      s.rod([-0.25, 0.56, -0.03], [0.25, 0.56, -0.03], 0.007, brass);
      for (const x of [-0.25, 0, 0.25]) s.ball([0.014, 0.014, 0.014], [x, 0.56 + (x === 0 ? 0.012 : 0), -0.03], brass, 12);
      for (const m of fallen ? [first] : [first, second]) {
        const cx = m.group.position.x;
        for (const u of [-0.5, 0.5]) band([top(m, u), [cx + u * 0.04, 0.5, -0.02], [cx + u * 0.02, 0.565, -0.03]]);
        for (const side of [-1, 1]) band([[cx, 0.57, -0.03], [cx + side * 0.03, 0.52, -0.045], [cx + side * (0.04 + random() * 0.03), 0.4 + random() * 0.06, -0.05]]);
      }
      if (fallen) {
        const cx = -sideSign * spread;
        band([[cx, 0.57, -0.03], [cx + 0.01, 0.5, -0.035], [cx - 0.01 + random() * 0.02, mix(0.34, 0.42, random()), -0.03]]);
      }
    }
    if (fallen) {
      const g2 = second.group;
      const p = shellPoint(second.spec, 0.4, 0.8).applyEuler(g2.rotation).add(g2.position);
      s.root.add(horn([[p.x, p.y, p.z], [p.x + 0.03, 0.02, p.z + 0.03], [p.x + 0.09, 0.006, p.z + 0.05], [p.x + 0.13, 0.006, p.z + 0.01]], () => 0.011, silk, { sides: 6, steps: 16, squash: 0.18, side: [0, 1, 0] }));
      if (a.damage !== 'none') {
        const shardSkin = s.material(colour, { roughness: 0.8 });
        for (let i = 0; i < 4; i++) { const sh = s.mesh(new THREE.TetrahedronGeometry(0.012 + random() * 0.014), shardSkin, [g2.position.x + (random() - 0.5) * 0.3, 0.008, g2.position.z + 0.02 + random() * 0.12]); sh.rotation.set(random() * 3, random() * 3, random() * 3); sh.scale.y = 0.4; }
      }
    }
    return s.finish();
  },
});
