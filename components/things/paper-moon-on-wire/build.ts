import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PAINTS = {
  butter: 'Buttery yellow poster paint.', silver: 'Silver-white, a little chalky.', gold: 'Gold foil paper, bright and cheap.',
  blue: 'Pale powder blue.', pink: 'Peach pink.', bare: 'Unpainted plywood with pencil lines still showing.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = { butter: '#f0d369', silver: '#dfe3e6', gold: '#e2b23a', blue: '#a9c8e6', pink: '#f0b59e', bare: '#cfae7c' };
type P3 = [number, number, number];

export default defineThing({
  questions: {
    expression: choice('What expression is painted on the moon?', {
      asleep: 'Asleep, eye closed, a faint smile.',
      smiling: 'Wide awake and smiling, rosy cheeked.',
      winking: 'Winking, in on the joke.',
      sad: 'Sad, with one painted tear.',
      watchful: 'Watchful and stern, a heavy brow, a straight mouth.',
      surprised: 'Surprised, mouth a small round O.',
    }),
    seat: choice('Is a seat cut into the crescent?', {
      none: 'No seat: it is only scenery.',
      plank: 'A plank seat with a cushion in the lower curve, for sitting to be photographed.',
      hat: 'A seat, and someone has left a top hat on it.',
      ladder: 'A seat, with a little stepladder standing below it.',
    }),
    hanging: choice('How is it hanging?', {
      true: 'Level and true on two wires.',
      askew: 'Askew, one wire slipping.',
      snapped: 'One wire has snapped: it dangles from a single horn.',
    }),
    paint: choice('How is the moon finished?', PAINTS),
    company: choice('What hangs beside it?', {
      star: 'A single cardboard star.',
      pair: 'Two stars at different heights.',
      scatter: 'A scatter of small stars.',
      cloud: 'A flat cardboard cloud and one star.',
      comet: 'A comet with a streamer tail.',
    }),
    rig: choice('What are the wires hung from?', {
      pipe: 'A black pipe batten on two stands, backstage hardware.',
      timber: 'A rough timber goalpost frame weighted with sandbags.',
      theatre: 'A little proscenium arch with red curtains, like a toy theatre.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 2.6, half = 1.25;
    const wire = s.material('#3a3a3c', { metalness: 0.5, roughness: 0.4 });
    const ply = s.material('#c9a877', { roughness: 0.9 });

    // The rig.
    if (a.rig === 'pipe') {
      const steel = s.material('#2c2d30', { metalness: 0.6, roughness: 0.4 });
      s.rod([-half - 0.1, H, 0], [half + 0.1, H, 0], 0.025, steel);
      for (const x of [-half, half]) {
        s.rod([x, 0.04, 0], [x, H, 0], 0.022, steel);
        s.cylinder(0.26, 0.28, 0.04, [x, 0.02, 0], steel, 20);
        s.box([0.07, 0.07, 0.07], [x, H, 0], steel);
      }
    } else if (a.rig === 'timber') {
      const wood = s.material('#a8845a', { roughness: 0.9 });
      s.box([half * 2 + 0.3, 0.08, 0.06], [0, H, 0], wood);
      for (const x of [-half, half]) {
        s.box([0.07, H, 0.06], [x, H / 2, 0], wood);
        s.box([0.09, 0.05, 0.9], [x, 0.025, 0], wood);
        s.rod([x, 0.05, 0.42], [x, 0.9, 0.02], 0.022, wood); s.rod([x, 0.05, -0.42], [x, 0.9, -0.02], 0.022, wood);
        s.rod([x, H - 0.5, 0], [x - Math.sign(x) * 0.5, H, 0], 0.022, wood);
        s.ball([0.16, 0.07, 0.11], [x, 0.11, 0.3], s.material('#b9ab8c', { roughness: 1 }), 12);
      }
    } else {
      const gilt = s.material('#d6b458', { metalness: 0.5, roughness: 0.4 }), velvet = s.material('#a2242c', { roughness: 0.95 });
      s.box([half * 2 + 0.5, 0.1, 0.8], [0, 0.05, 0], s.material('#6a4a34'));
      for (const x of [-half, half]) {
        s.box([0.2, H, 0.14], [x, 0.1 + H / 2, 0], gilt);
        for (let i = 0; i < 4; i++) s.cylinder(0.05, 0.06, H - 0.75, [x - Math.sign(x) * (0.16 + i * 0.07), 0.1 + (H - 0.75) / 2 + 0.45 - i * 0.02 + 0.3, 0.02 + (i % 2) * 0.04], velvet, 8);
        s.ring(0.17, 0.02, [x - Math.sign(x) * 0.27, 1.25, 0.05], gilt).rotation.x = Math.PI / 2;
      }
      s.box([half * 2 + 0.5, 0.26, 0.18], [0, H + 0.2, 0], gilt);
      for (let i = 0; i < 9; i++) s.cylinder(0.14, 0.14, 0.05, [-half + 0.14 + i * (half * 2 - 0.28) / 8, H + 0.05, 0.06], velvet, 16).rotation.x = Math.PI / 2;
      s.cylinder(0.3, 0.3, 0.1, [0, H + 0.34, 0], gilt, 24).rotation.x = Math.PI / 2;
    }

    // The crescent, with a face in profile along its inner edge.
    const R = 0.6, cx = 0.28, r = 0.52, depth = 0.06;
    const shape = new THREE.Shape();
    for (let i = 0; i <= 48; i++) { const t = mix(Math.PI / 3, Math.PI * 5 / 3, i / 48); if (i) shape.lineTo(Math.cos(t) * R, Math.sin(t) * R); else shape.moveTo(Math.cos(t) * R, Math.sin(t) * R); }
    const bump = (t: number, at: number, width: number, amount: number) => amount * Math.exp(-(((t - at) / width) ** 2));
    for (let i = 1; i < 64; i++) {
      const t = mix(Math.PI * 1.512, Math.PI * 0.488, i / 64);
      const rr = r - bump(t, 3.02, 0.075, 0.1) - bump(t, 2.72, 0.12, 0.03) - bump(t, 3.33, 0.035, 0.035) - bump(t, 3.45, 0.035, 0.03) - bump(t, 3.7, 0.1, 0.045);
      shape.lineTo(cx + Math.cos(t) * rr, Math.sin(t) * rr);
    }
    const tint = PAINT[a.paint];
    const face = s.material(tint, { roughness: a.paint === 'gold' ? 0.3 : 0.75, metalness: a.paint === 'gold' ? 0.7 : 0, emissive: tint, emissiveIntensity: mix(0.04, 0.3, mood.cheer) });
    const moon = new THREE.Group();
    const board = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1, curveSegments: 4 }), [face, ply]);
    board.position.z = -depth / 2;
    board.castShadow = board.receiveShadow = true;
    moon.add(board);
    const ink = s.material(a.paint === 'bare' ? '#5a4632' : '#3b3550', { roughness: 0.8 });
    const front = depth / 2 + 0.012;
    const line = (points: [number, number][], width = 0.013) => { const m = s.tube(points.map(([x, y]) => [x, y, front] as const), width, ink); m.scale.z = 0.4; m.position.z = front * 0.6; moon.add(m); return m; };
    const dot = (x: number, y: number, radius: number, material: THREE.Material, lift = 0) => { const m = s.cylinder(radius, radius, 0.008, [x, y, front + lift], material, 20); m.rotation.x = Math.PI / 2; moon.add(m); return m; };
    const ex = -0.37, ey = 0.2, white = s.material('#fbf8ee'), e = a.expression;
    if (e === 'asleep') { line([[ex - 0.07, ey + 0.01], [ex, ey - 0.03], [ex + 0.07, ey + 0.01]]); for (const dx of [-0.05, 0, 0.05]) line([[ex + dx, ey - 0.03], [ex + dx * 1.3, ey - 0.06]], 0.007); }
    else if (e === 'winking') line([[ex - 0.07, ey - 0.02], [ex, ey + 0.03], [ex + 0.07, ey - 0.02]]);
    else { const big = e === 'surprised' || e === 'watchful' ? 0.062 : 0.05; dot(ex, ey, big, white); dot(ex + 0.012, ey + (e === 'sad' ? -0.012 : 0), big * 0.52, ink, 0.006); }
    const brow: Record<typeof e, [number, number][]> = {
      asleep: [[ex - 0.09, ey + 0.1], [ex, ey + 0.12], [ex + 0.08, ey + 0.1]], smiling: [[ex - 0.09, ey + 0.1], [ex, ey + 0.13], [ex + 0.08, ey + 0.1]],
      winking: [[ex - 0.09, ey + 0.12], [ex, ey + 0.16], [ex + 0.08, ey + 0.13]], sad: [[ex - 0.09, ey + 0.07], [ex, ey + 0.11], [ex + 0.08, ey + 0.14]],
      watchful: [[ex - 0.1, ey + 0.13], [ex, ey + 0.09], [ex + 0.09, ey + 0.06]], surprised: [[ex - 0.09, ey + 0.13], [ex, ey + 0.18], [ex + 0.08, ey + 0.14]],
    };
    line(brow[e], e === 'watchful' ? 0.02 : 0.012);
    const mx = -0.215, my = -0.2;
    if (e === 'surprised') { const o = s.ring(0.035, 0.012, [mx - 0.07, my + 0.01, front], ink); o.scale.z = 0.4; moon.add(o); }
    else line({ asleep: [[mx, my], [mx - 0.07, my - 0.012], [mx - 0.13, my + 0.02]], smiling: [[mx, my], [mx - 0.09, my - 0.03], [mx - 0.18, my + 0.06]], winking: [[mx, my], [mx - 0.09, my - 0.03], [mx - 0.17, my + 0.05]],
      sad: [[mx, my], [mx - 0.08, my + 0.02], [mx - 0.15, my - 0.04]], watchful: [[mx, my], [mx - 0.08, my], [mx - 0.15, my]] }[e] as [number, number][]);
    if (e === 'smiling' || e === 'winking' || e === 'asleep') dot(-0.44, -0.02, 0.065, s.material('#e98a7a'));
    if (e === 'sad') { const tear = s.ball([0.022, 0.034, 0.008], [ex - 0.02, ey - 0.12, front], s.material('#6fa8dc', { roughness: 0.2 }), 10); moon.add(tear); }
    // Peeling paint.
    for (let i = 0; i < Math.round(mood.wear * 9); i++) { const t = mix(2.0, 4.3, random()); const patch = s.box([0.04 + random() * 0.07, 0.03 + random() * 0.06, 0.004], [Math.cos(t) * 0.5, Math.sin(t) * 0.5, front - 0.004], ply); patch.rotation.z = random() * 3; moon.add(patch); }

    // A seat in the lower curve.
    if (a.seat !== 'none') {
      const seat = s.box([0.34, 0.03, 0.3], [-0.12, -0.42, 0.03], ply); moon.add(seat);
      const cushion = s.box([0.28, 0.05, 0.24], [-0.12, -0.385, 0.04], s.material(mood.cheer > 0.5 ? '#c8443c' : '#4d5a7a', { roughness: 1 })); moon.add(cushion);
      if (a.seat === 'hat') {
        const felt = s.material('#1f1f22', { roughness: 0.6 });
        moon.add(s.cylinder(0.075, 0.07, 0.16, [-0.1, -0.28, 0.05], felt, 20), s.cylinder(0.12, 0.12, 0.012, [-0.1, -0.355, 0.05], felt, 24), s.cylinder(0.073, 0.073, 0.03, [-0.1, -0.335, 0.05], s.material('#8c2b2b'), 20));
      }
    }

    // Hang it: attach points in moon space, wires straight up to the batten.
    const tilt = a.hanging === 'true' ? 0 : a.hanging === 'askew' ? -0.3 : 0.83;
    const attach: [number, number][] = [[0.24, 0.5], [-0.5, 0.3]];
    const MS = 1.4;
    const turn = (p: [number, number]) => new THREE.Vector2(p[0], p[1]).rotateAround(new THREE.Vector2(0, 0), tilt).multiplyScalar(MS);
    const centreY = a.hanging === 'snapped' ? 1.2 : 1.45;
    const hung = new THREE.Group();
    hung.position.set(0, H, 0);
    s.root.add(hung);
    moon.rotation.z = tilt;
    moon.scale.setScalar(MS);
    moon.position.set(a.hanging === 'snapped' ? 0 : 0.15, centreY - H, 0);
    hung.add(moon);
    const keep = (mesh: THREE.Object3D) => { hung.add(mesh); return mesh; };
    attach.forEach((point, index) => {
      const p = turn(point).add(new THREE.Vector2(moon.position.x, moon.position.y));
      if (a.hanging === 'snapped' && index === 1) {
        // The broken wire: a stub swinging from the batten and a curl still tied to the moon.
        keep(s.rod([p.x - 0.5, 0, 0], [p.x - 0.42, -0.5 - random() * 0.3, 0], 0.009, wire));
        keep(s.tube([[p.x, p.y, 0], [p.x - 0.08, p.y + 0.12, 0.03], [p.x - 0.02, p.y + 0.22, 0], [p.x + 0.06, p.y + 0.16, -0.03]], 0.009, wire));
      } else keep(s.rod([p.x, p.y, 0], [p.x, 0, 0], 0.009, wire));
      keep(s.ring(0.022, 0.007, [p.x, p.y, 0], wire));
    });
    if (a.seat === 'ladder') {
      const wood = s.material('#b58b56');
      const lx = moon.position.x - 0.12 * MS, topY = centreY - 0.47 * MS;
      for (const z of [0.2, 0.42]) { s.rod([lx - 0.14, 0, z + 0.25], [lx - 0.1, topY, z], 0.016, wood); s.rod([lx + 0.14, 0, z + 0.25], [lx + 0.1, topY, z], 0.016, wood); }
      for (let i = 1; i < 4; i++) { const u = i / 4; s.box([0.28 - u * 0.06, 0.02, 0.07], [lx, topY * u, 0.45 - u * 0.25 + 0.2], wood); }
      s.box([0.26, 0.025, 0.3], [lx, topY, 0.31], wood);
    }

    // Company: stars, a cloud or a comet, each on its own wire.
    const starShape = (radius: number) => { const st = new THREE.Shape(); for (let p = 0; p < 10; p++) { const rr = p % 2 ? radius * 0.45 : radius, x = Math.sin(p * Math.PI / 5) * rr, y = Math.cos(p * Math.PI / 5) * rr; if (p) st.lineTo(x, y); else st.moveTo(x, y); } return st; };
    const starPaint = s.material(a.paint === 'gold' ? '#dfe3e6' : '#e9c64a', { roughness: 0.6, emissive: '#e9c64a', emissiveIntensity: mix(0.03, 0.25, mood.cheer) });
    const danglers: THREE.Group[] = [];
    const dangle = (x: number, drop: number, z: number, make: (group: THREE.Group) => void) => {
      const g = new THREE.Group();
      g.position.set(x, H, z);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), wire); cord.position.y = -drop / 2; g.add(cord);
      make(g);
      g.traverse((node) => { node.castShadow = true; });
      s.root.add(g); danglers.push(g);
    };
    const star = (x: number, drop: number, radius: number, z = 0) => dangle(x, drop, z, (g) => {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(radius), { depth: 0.03, bevelEnabled: false }), [starPaint, ply]);
      m.position.set(0, -drop - radius, -0.015); m.rotation.z = (random() - 0.5) * 0.5; g.add(m);
    });
    const left = -0.72, right = 0.95;
    if (a.company === 'star') star(right - 0.1, 0.75 + random() * 0.4, 0.2);
    else if (a.company === 'pair') { star(right - 0.05, 0.5 + random() * 0.3, 0.2); star(left - 0.15, 1.1 + random() * 0.4, 0.15, 0.1); }
    else if (a.company === 'scatter') for (let i = 0; i < 6 + Math.round(mood.density * 4); i++) star(mix(-1.05, 1.05, random()), 0.25 + random() * 1.7, 0.07 + random() * 0.07, (random() < 0.5 ? -1 : 1) * (0.14 + random() * 0.14));
    else if (a.company === 'cloud') {
      star(right, 1.2 + random() * 0.3, 0.17);
      dangle(left + 0.1, 0.45, 0.16, (g) => {
        const cloud = new THREE.Shape(); cloud.moveTo(-0.4, 0);
        for (const [x, y, rad] of [[0.3, 0.02, 0.12], [0.14, 0.14, 0.17], [-0.1, 0.16, 0.15], [-0.3, 0.05, 0.11]] as const) cloud.absarc(x, y, rad, -0.6, Math.PI + 0.3, false);
        cloud.lineTo(-0.4, 0);
        const m = new THREE.Mesh(new THREE.ExtrudeGeometry(cloud, { depth: 0.03, bevelEnabled: false }), [s.material('#f4f2ea'), ply]);
        m.position.set(0, -0.45 - 0.3, 0); g.add(m);
      });
    } else dangle(right - 0.05, 0.7, 0, (g) => {
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.17), { depth: 0.03, bevelEnabled: false }), [starPaint, ply]); m.position.set(0, -0.87, -0.015); g.add(m);
      const colours = ['#e2574c', '#f0b443', '#f4f2ea', '#5b8fd6'];
      for (let i = 0; i < 4; i++) {
        const pts = Array.from({ length: 6 }, (_u, k) => new THREE.Vector3(-0.1 - k * 0.11, -0.87 + (i - 1.5) * 0.05 + k * 0.05 + Math.sin(k * 1.4 + i) * 0.03, 0.02));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.012, 5), s.material(colours[i])));
      }
    });

    const energy = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        hung.rotation.z = Math.sin(time * 0.9) * mix(0.004, 0.05, energy);
        danglers.forEach((g, i) => { g.rotation.z = Math.sin(time * (1.1 + i * 0.17) + i) * mix(0.01, 0.12, energy); g.rotation.y = Math.sin(time * 0.5 + i * 1.7) * mix(0.05, 0.6, energy); });
      },
    });
  },
});
