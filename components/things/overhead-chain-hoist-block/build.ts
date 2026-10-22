import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { chain, hook } from './chain';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    frame: choice('What carries the beam the hoist runs on?', {
      gantry: 'A portable A-frame gantry on castor wheels, two splayed legs at each end.',
      jib: 'A floor-mounted jib: one stout column with a cantilever arm and a diagonal brace.',
      runway: 'A short runway beam bolted between two square steel columns.',
    }),
    load: choice('What is hanging from the hook?', {
      nothing: 'Nothing: a bare hook waiting for the next job.',
      crucible: 'A dark graphite crucible in a lifting ring and bail, as at a foundry.',
      engine: 'A car engine block in a two-leg chain sling.',
      mould: 'A banded plaster casting mould with a pour cup on top, in a chain sling.',
      drum: 'A steel 200-litre drum gripped by a rim clamp.',
    }),
    drop: score('How far has the hook been let down?', ['Hauled right up under the block', 'Head height', 'Waist height', 'Down to the floor, the chain slack']),
    finish: choice('How is the gear painted?', {
      yellow: 'Safety yellow block and frame, the standard hire-shop look.',
      red: 'A red hoist block on a galvanised grey frame.',
      blue: 'A dark blue frame with a black enamel block.',
      bare: 'Bare steel, rusted and scuffed, no paint left at all.',
    }),
    sign: choice('What tag hangs from the beam?', {
      swl: 'A plate reading SWL 1000 KG.',
      under: 'A warning: DO NOT STAND UNDER LOAD.',
      ooo: 'A red tag: OUT OF SERVICE.',
      none: 'No tag at all.',
    }),
    clutter: noul('Are there slings, shackles and a coil of spare chain dropped at the foot of the frame?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rusty = a.finish === 'bare';
    const frameHex = { yellow: '#e4a71c', red: '#9aa0a3', blue: '#2a4a86', bare: '#6d5b4d' }[a.finish];
    const blockHex = { yellow: '#e4a71c', red: '#b8302b', blue: '#24262a', bare: '#6d5b4d' }[a.finish];
    const frame = s.material(frameHex, { metalness: rusty ? 0.2 : 0.45, roughness: rusty ? 0.95 : 0.5 });
    const paint = s.material(blockHex, { metalness: rusty ? 0.2 : 0.3, roughness: rusty ? 0.95 : 0.45 });
    const steel = s.material(rusty ? '#7a685a' : '#8e9397', { metalness: 0.75, roughness: rusty ? 0.8 : 0.4 });
    const dark = s.material('#2b2d30', { metalness: 0.5, roughness: 0.6 });
    const chainMat = s.material(rusty ? '#6e5a48' : '#a3a7ab', { metalness: 0.8, roughness: 0.5 });
    const rubber = s.material('#1f1f21', { roughness: 0.9 });

    const BY = a.frame === 'jib' ? 2.75 : 3.0; // underside of the beam
    const half = 1.5;
    // ---- The beam: an I-section, flanges and web.
    const beamAt = (y: number) => {
      s.box([half * 2, 0.022, 0.16], [0, y + 0.011, 0], frame);
      s.box([half * 2, 0.022, 0.16], [0, y + 0.25, 0], frame);
      s.box([half * 2, 0.23, 0.012], [0, y + 0.13, 0], frame);
      for (const x of [-half, half]) s.box([0.012, 0.26, 0.16], [x, y + 0.13, 0], frame);
    };
    beamAt(BY);

    // ---- The frame that holds it up.
    if (a.frame === 'gantry') {
      for (const x of [-half + 0.12, half - 0.12]) {
        const top: P3 = [x, BY + 0.27, 0];
        s.box([0.3, 0.06, 0.2], [x, BY + 0.29, 0], frame);
        for (const z of [-1, 1]) {
          s.rod(top, [x, 0.16, z * 0.85], 0.035, frame);
          s.box([0.1, 0.05, 0.14], [x, 0.17, z * 0.78], steel);
          const wheel = s.cylinder(0.075, 0.075, 0.06, [x, 0.075, z * 0.82], rubber, 16);
          wheel.rotation.z = Math.PI / 2;
          s.cylinder(0.03, 0.03, 0.07, [x, 0.075, z * 0.82], steel, 10).rotation.z = Math.PI / 2;
        }
        s.box([0.06, 0.05, 1.56], [x, 0.17, 0], frame);
      }
    } else if (a.frame === 'jib') {
      const cx = -half + 0.1;
      s.box([0.4, 0.03, 0.4], [cx, 0.015, 0], steel);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.cylinder(0.02, 0.02, 0.03, [cx + dx * 0.16, 0.04, dz * 0.16], dark, 8);
      s.box([0.2, BY + 0.5, 0.2], [cx, (BY + 0.5) / 2, 0], frame);
      s.box([0.26, 0.04, 0.26], [cx, BY + 0.5, 0], frame);
      s.rod([cx + 0.1, BY - 1.1, 0], [cx + 1.1, BY - 0.02, 0], 0.03, frame);
      s.box([0.2, 0.08, 0.18], [cx + 0.1, BY - 1.1, 0], frame);
    } else {
      for (const x of [-half + 0.08, half - 0.08]) {
        s.box([0.36, 0.025, 0.36], [x, 0.0125, 0], steel);
        s.box([0.16, BY, 0.16], [x, BY / 2, 0], frame);
        s.box([0.24, 0.025, 0.24], [x, BY - 0.0125, 0], steel);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s.cylinder(0.018, 0.018, 0.03, [x + dx * 0.14, 0.04, dz * 0.14], dark, 8);
      }
    }

    // ---- The trolley on the bottom flange, and the pivot everything below swings from.
    const tx = a.frame === 'jib' ? mix(-0.2, 0.9, random()) : (random() - 0.5) * 1.2;
    for (const z of [-0.11, 0.11]) {
      s.box([0.3, 0.3, 0.025], [tx, BY - 0.07, z], paint);
      for (const dx of [-0.1, 0.1]) {
        const wheel = s.cylinder(0.055, 0.055, 0.03, [tx + dx, BY + 0.07, z * 0.75], steel, 14);
        wheel.rotation.x = Math.PI / 2;
      }
    }
    s.cylinder(0.025, 0.025, 0.3, [tx, BY - 0.19, 0], steel, 10).rotation.x = Math.PI / 2;
    const pivot = new THREE.Group();
    pivot.position.set(tx, BY - 0.19, 0);
    s.root.add(pivot);
    const local = (mesh: THREE.Mesh) => {
      s.root.remove(mesh);
      mesh.position.sub(pivot.position);
      pivot.add(mesh);
      return mesh;
    };

    // ---- The hoist block: a drum housing, a gear cover on one side, a hand-chain wheel on the other.
    const by = BY - 0.52; // block centre
    local(s.box([0.05, 0.16, 0.12], [tx, BY - 0.26, 0], steel));
    local(s.cylinder(0.14, 0.14, 0.26, [tx, by, 0], paint, 22)).rotation.z = Math.PI / 2;
    local(s.cylinder(0.165, 0.165, 0.05, [tx + 0.16, by, 0], paint, 22)).rotation.z = Math.PI / 2;
    local(s.cylinder(0.05, 0.05, 0.03, [tx + 0.2, by, 0], dark, 10)).rotation.z = Math.PI / 2;
    const wheelX = tx - 0.19;
    local(s.cylinder(0.1, 0.1, 0.06, [wheelX, by, 0], dark, 18)).rotation.z = Math.PI / 2;
    local(s.cylinder(0.12, 0.12, 0.02, [tx - 0.23, by, 0], paint, 18)).rotation.z = Math.PI / 2;
    local(s.box([0.22, 0.09, 0.2], [tx, by - 0.14, 0], paint));
    local(s.box([0.14, 0.02, 0.1], [tx + 0.0, by + 0.05, 0.12], s.material('#dcd8c8', { roughness: 0.7 })));

    // ---- The load, which decides how low the hook hangs.
    const hookSize = 0.32;
    const drop = a.drop;
    const bottomOfBlock = by - 0.19;
    let loadRise = 0; // from the load's lowest point up to the hook's eye
    const loadGroup = new THREE.Group();
    pivot.add(loadGroup);
    const inLoad = (mesh: THREE.Mesh) => {
      s.root.remove(mesh);
      loadGroup.add(mesh);
      return mesh;
    };
    // The load is built standing on its own y = 0; loadGroup is then placed at its base.
    if (a.load === 'crucible') {
      const graphite = s.material('#2e2b29', { roughness: 0.85, metalness: 0.1 });
      const glow = new THREE.Color().setHSL(mix(0.06, 0.1, 1 - mood.warmth), 1, mix(0.3, 0.6, mood.warmth));
      const melt = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: mix(0.2, 2.2, mood.warmth), roughness: 0.4 });
      inLoad(s.lathe([[0.14, 0], [0.21, 0.02], [0.24, 0.3], [0.23, 0.46], [0.19, 0.46], [0.2, 0.3], [0.13, 0.03]], graphite));
      inLoad(s.cylinder(0.19, 0.19, 0.01, [0, 0.42, 0], melt, 20));
      inLoad(s.ring(0.25, 0.022, [0, 0.3, 0], steel)).rotation.x = Math.PI / 2;
      inLoad(s.ring(0.27, 0.02, [0, 0.3, 0], steel, Math.PI));
      loadRise = 0.57;
    } else if (a.load === 'engine') {
      const iron = s.material('#5c5f63', { metalness: 0.6, roughness: 0.55 });
      inLoad(s.box([0.62, 0.36, 0.34], [0, 0.4, 0], iron));
      inLoad(s.box([0.5, 0.22, 0.28], [0, 0.11, 0], dark));
      for (let i = 0; i < 4; i++) inLoad(s.cylinder(0.055, 0.055, 0.03, [-0.21 + i * 0.14, 0.585, 0], dark, 14));
      inLoad(s.box([0.52, 0.12, 0.2], [0, 0.63, 0.1], iron));
      for (const x of [-0.26, 0.26]) inLoad(s.ring(0.03, 0.01, [x, 0.6, -0.1], steel)).rotation.y = Math.PI / 2;
      for (const x of [-0.26, 0.26]) chain(s, [[x, 0.6, -0.1], [0, 1.05, 0]], 0.04, chainMat, loadGroup);
      loadRise = 1.05;
    } else if (a.load === 'mould') {
      const plaster = s.material('#d9d2c2', { roughness: 0.95 });
      inLoad(s.cylinder(0.27, 0.29, 0.6, [0, 0.3, 0], plaster, 24));
      for (const y of [0.1, 0.32, 0.54]) inLoad(s.cylinder(0.3, 0.3, 0.04, [0, y, 0], steel, 24));
      inLoad(s.cylinder(0.09, 0.05, 0.1, [0, 0.65, 0], plaster, 16));
      for (const dz of [-0.14, 0.14]) inLoad(s.cylinder(0.02, 0.02, 0.1, [0, 0.65, dz], plaster, 8));
      for (const x of [-0.3, 0.3]) chain(s, [[x, 0.54, 0], [0, 1.0, 0]], 0.04, chainMat, loadGroup);
      loadRise = 1.0;
    } else if (a.load === 'drum') {
      const drumHex = ['#2d5fa3', '#a83c2f', '#3a3d41', '#c7c1ae'][Math.floor(random() * 4)];
      const drum = s.material(drumHex, { metalness: 0.3, roughness: 0.6 });
      inLoad(s.cylinder(0.29, 0.29, 0.88, [0, 0.44, 0], drum, 24));
      for (const y of [0.3, 0.58]) inLoad(s.cylinder(0.3, 0.3, 0.04, [0, y, 0], drum, 24));
      inLoad(s.cylinder(0.3, 0.3, 0.02, [0, 0.88, 0], steel, 24));
      for (const x of [-0.3, 0.3]) inLoad(s.box([0.06, 0.12, 0.04], [x, 0.9, 0], steel));
      for (const x of [-0.3, 0.3]) chain(s, [[x, 0.95, 0], [0, 1.3, 0]], 0.04, chainMat, loadGroup);
      loadRise = 1.3;
    }
    const hasLoad = a.load !== 'nothing';
    const lowestHook = hasLoad ? loadRise + hookSize : hookSize * 0.9;
    const hookTop = Math.max(lowestHook + 0.02, mix(bottomOfBlock - 0.25, lowestHook + 0.02, drop));
    const hookGroup = hook(s, [0, hookTop - (BY - 0.19), 0], hookSize, steel, pivot);
    hookGroup.rotation.y = random() * Math.PI * 2;
    chain(s, [[0, bottomOfBlock - (BY - 0.19) + 0.02, 0], [0, hookTop - (BY - 0.19) + 0.08, 0]], 0.045, chainMat, pivot);
    loadGroup.position.set(0, hookTop - hookSize - loadRise - (BY - 0.19), 0);
    // A slack loose end of load chain hangs out the other side of the block, longer the higher the hook sits.
    const spare = mix(0.9, 0.2, drop);
    chain(s, [[0.1, bottomOfBlock - (BY - 0.19), 0.06], [0.14, bottomOfBlock - (BY - 0.19) - spare, 0.08]], 0.045, chainMat, pivot);
    // The hand chain: a long loop off the wheel, down to knee height and back.
    const wx = wheelX - tx;
    const lowY = 0.55 - (BY - 0.19);
    const wy = by - (BY - 0.19);
    chain(s, [[wx, wy + 0.1, 0.02], [wx, wy, 0.1], [wx + 0.02, lowY + 0.35, 0.1], [wx + 0.03, lowY, 0.045], [wx + 0.03, lowY, -0.045], [wx + 0.02, lowY + 0.35, -0.1], [wx, wy, -0.1], [wx, wy + 0.1, -0.02]], 0.04, chainMat, pivot);

    // ---- The tag.
    if (a.sign !== 'none') {
      const text = { swl: 'SWL 1000 KG', under: 'DO NOT STAND UNDER LOAD', ooo: 'OUT OF SERVICE' }[a.sign];
      const red = a.sign === 'ooo';
      const sx = tx + (tx > 0 ? -0.75 : 0.75);
      const tag = s.label(text, 0.6, red ? 0.26 : 0.19, [sx, BY - 0.44, 0.02], red ? '#fff3ea' : '#1d1d1f', red ? '#c2231c' : '#f0d85a');
      tag.rotation.y = 0.15;
      s.rod([sx, BY - 0.31, 0.02], [sx, BY, 0], 0.004, chainMat);
    }

    // ---- Slings and shackles dumped by the frame.
    if (a.clutter) {
      const fx = -half + 0.9 + random() * 0.4, fz = 0.45 + random() * 0.3;
      const turns = 7 + Math.floor(random() * 5);
      const coil: P3[] = [];
      for (let i = 0; i <= turns * 6; i++) {
        const t = i / 6 * Math.PI * 2;
        coil.push([fx + Math.cos(t) * (0.17 + (i % 11) * 0.006), 0.02 + i * 0.0025, fz + Math.sin(t) * 0.17]);
      }
      chain(s, coil, 0.045, chainMat);
      const webbing = s.material(mood.cheer > 0.5 ? '#3a8f3a' : '#c99a2a', { roughness: 0.9 });
      const strap = s.ring(0.26, 0.018, [fx + 0.6, 0.02, fz - 0.2], webbing);
      strap.rotation.x = Math.PI / 2;
      strap.scale.z = 0.45;
      for (let i = 0; i < 2; i++) s.ring(0.045, 0.014, [fx - 0.5 + i * 0.12, 0.018, fz + 0.1 + i * 0.08], steel).rotation.x = Math.PI / 2;
    }

    const swing = mix(0.004, 0.035, mood.energy) * (hasLoad ? 0.6 : 1);
    const phase = random() * 6.28;
    return s.finish({
      update: (_dt, time) => {
        pivot.rotation.z = Math.sin(time * 0.9 + phase) * swing;
        pivot.rotation.x = Math.sin(time * 0.67 + phase * 1.3) * swing * 0.6;
      },
    });
  },
});
