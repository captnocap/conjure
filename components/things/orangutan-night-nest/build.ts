import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Blob, type V, clump, fuse, instances, limb, v } from './parts';

export default defineThing({
  questions: {
    sleeper: choice('Who is in the nest right now?', {
      empty: 'Nobody: an empty bowl with a body-shaped hollow pressed into it.',
      arm: 'Only one long shaggy red arm is visible, hanging slack over the rim.',
      curled: 'A big orange back curled up asleep, an arm trailing over the edge.',
      mother: 'A mother curled round an infant whose small pale-eyed face looks out.',
      watching: 'A domed head and two dark eyes peering over the rim, fingers hooked on the edge.',
      stretching: 'Lying on its back with one arm reaching straight up to hold a branch.',
    }),
    age: choice('When was it built?', {
      tonight: 'This evening: every leaf still fresh and glossy green.',
      yesterday: 'A day or two ago: leaves dulling and curling, going yellow.',
      old: 'Weeks ago: a brown, flattened raft of dead leaves and bare sticks, half fallen apart.',
    }),
    site: choice('Where in the tree is it?', {
      fork: 'Cradled in an upright three-way fork of the trunk.',
      limb: 'Out along a big horizontal limb, built where it branches.',
      treetop: 'At the very top of a slender tree, its bent-over tips tied into the bowl.',
    }),
    size: score('How big is the nest?', ['A snug juvenile bowl', 'A proper adult bed', 'A huge sprawling platform a flanged male has piled up']),
    extras: choice('What has the builder added?', {
      plain: 'Nothing more than the bowl.',
      roof: 'A roof: leafy branches bent over the top against the rain.',
      pillow: 'A pillow of twigs bundled at one end and a blanket of big leaves.',
      umbrella: 'One enormous leaf held or propped overhead like an umbrella.',
    }),
    leftovers: choice('What is lying in or under it?', {
      nothing: 'Nothing.',
      durian: 'Split spiky durian husks, a late supper.',
      figs: 'A scatter of red and orange figs.',
      tool: 'A stripped stick tool wedged into the rim.',
      bark: 'Long strips of peeled bark dangling from the edge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();

    const Rn = mix(0.55, 1.05, a.size) * rnd(0.94, 1.06);
    const freshness = { tonight: 1, yesterday: 0.5, old: 0 }[a.age] * mix(1, 0.75, mood.wear);
    const hue = mix(0.35, 0.27, mood.warmth);
    const green = new THREE.Color().setHSL(hue, 0.55, mix(0.2, 0.3, mood.cheer));
    const yellow = new THREE.Color('#a39a3c'), brown = new THREE.Color('#7a5a36');
    const leafColour = () => {
      const c = freshness > 0.5 ? yellow.clone().lerp(green, (freshness - 0.5) * 2) : brown.clone().lerp(yellow, freshness * 2);
      return c.offsetHSL(rnd(-0.02, 0.02), rnd(-0.05, 0.05), rnd(-0.06, 0.06));
    };
    const bark = s.material(new THREE.Color('#6f5f4c').lerp(new THREE.Color('#8a6a48'), mood.warmth * 0.4), { roughness: 0.95 });
    const stick = s.material(new THREE.Color('#8a7355').lerp(new THREE.Color('#a59c8a'), 1 - freshness * 0.6), { roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true });

    // The tree that holds it.
    const wood: THREE.BufferGeometry[] = [];
    const treeLeaves: Blob[] = [];
    const treeGreen = new THREE.Color().setHSL(hue, 0.5, mix(0.17, 0.26, mood.cheer));
    const tuft = (p: V, size: number) => treeLeaves.push({ at: p, size: v(size, size * 0.6, size), color: treeGreen.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.04, 0.05)), turn: rnd(0, 6) });
    let nestAt = v(0, 2, 0);
    const holds: V[] = [];
    if (a.site === 'fork') {
      const forkY = rnd(0.8, 1.05);
      nestAt = v(0, forkY + Rn * 0.75, 0);
      wood.push(limb([v(rnd(-0.1, 0.1), -0.4, 0), v(0, forkY * 0.5, 0), v(0, forkY, 0)], 0.3, 0.24, 10));
      const n = 3;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * 6.28 + 0.5 + rnd(-0.2, 0.2), out = Rn * 1.12, tall = nestAt.y + rnd(0.8, 1.2);
        const pts = [v(0, forkY - 0.1, 0), v(Math.cos(ang) * out * 0.7, forkY + Rn * 0.45, Math.sin(ang) * out * 0.7), v(Math.cos(ang) * out, nestAt.y + 0.2, Math.sin(ang) * out), v(Math.cos(ang) * out * 1.25, tall, Math.sin(ang) * out * 1.25)];
        wood.push(limb(pts, 0.17, 0.05, 8));
        holds.push(pts[3]);
        for (let k = 0; k < 2 + Math.round(mood.density * 2); k++) tuft(pts[3].clone().add(v(Math.cos(ang) * 0.3 + rnd(-0.2, 0.2), rnd(0, 0.4), Math.sin(ang) * 0.3 + rnd(-0.2, 0.2))), rnd(0.28, 0.42));
      }
    } else if (a.site === 'limb') {
      const tx = -Rn - 0.75, y = rnd(1.15, 1.4);
      nestAt = v(0.1, y + 0.22, 0);
      wood.push(limb([v(tx + rnd(-0.1, 0.1), -0.4, 0), v(tx, y * 0.6, 0), v(tx + 0.05, y + 0.6, 0), v(tx + 0.25, y + 1.5, 0)], 0.3, 0.12, 10));
      wood.push(limb([v(tx, y - 0.25, 0), v(tx + 0.6, y - 0.02, 0), v(0, y, 0), v(Rn * 0.9, y + 0.1, 0.1)], 0.2, 0.1, 8));
      for (const z of [-1, 1]) {
        const end = v(Rn * 1.75, y + rnd(0.35, 0.6), z * Rn * rnd(1.1, 1.4));
        wood.push(limb([v(Rn * 0.6, y + 0.05, 0), v(Rn * 1.2, y + 0.25, z * Rn * 0.6), end], 0.1, 0.03, 6));
        holds.push(end);
        tuft(end.clone().add(v(rnd(0.1, 0.4), rnd(-0.1, 0.2), z * rnd(0, 0.3))), rnd(0.26, 0.36));
      }
      holds.push(v(tx + 0.25, y + 1.5, 0));
      for (let k = 0; k < 3 + Math.round(mood.density * 3); k++) tuft(v(tx + rnd(-0.5, 0.5), y + rnd(1.45, 1.9), rnd(-0.5, 0.5)), rnd(0.35, 0.5));
    } else {
      const y = rnd(1.4, 1.7);
      nestAt = v(0, y, 0);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * 6.28 + rnd(-0.3, 0.3), out = Rn * rnd(1.3, 1.8);
        const tip = v(Math.cos(ang + 2.4) * Rn * 0.8, y + 0.1, Math.sin(ang + 2.4) * Rn * 0.8);
        wood.push(limb([v(Math.cos(ang) * out, -0.4, Math.sin(ang) * out), v(Math.cos(ang) * out * 0.9, y * 0.55, Math.sin(ang) * out * 0.9), v(Math.cos(ang) * Rn * 0.85, y + 0.25, Math.sin(ang) * Rn * 0.85), tip], 0.1, 0.03, 7));
        holds.push(v(Math.cos(ang) * Rn * 0.85, y + 0.3, Math.sin(ang) * Rn * 0.85));
        for (let k = 0; k < 2; k++) tuft(v(Math.cos(ang) * out * rnd(0.7, 1.0), y * rnd(0.45, 0.8), Math.sin(ang) * out * rnd(0.7, 1.0)), rnd(0.22, 0.34));
      }
    }
    s.mesh(fuse(wood), bark);
    if (treeLeaves.length) s.root.add(instances(clump(), leafMaterial, treeLeaves));

    // The nest: a rim of bent branches, a lattice beneath, and a mattress of leaves.
    const nest = new THREE.Group();
    nest.position.copy(nestAt);
    nest.rotation.z = rnd(-0.06, 0.06);
    s.root.add(nest);
    const sticks: THREE.BufferGeometry[] = [];
    const collapse = a.age === 'old' ? 0.55 : 1;
    const rimH = Rn * 0.42 * collapse;
    const arcs = Math.round(mix(22, 38, a.size) * mix(0.8, 1.15, mood.density));
    for (let i = 0; i < arcs; i++) {
      const a0 = rnd(0, 6.28), sweep = rnd(0.7, 1.9), r = Rn * rnd(0.82, 1.08), y = rnd(0.05, 1) * rimH, pts: V[] = [];
      for (let k = 0; k <= 4; k++) {
        const ang = a0 + sweep * (k / 4), flare = k === 0 || k === 4 ? 1.18 : 1;
        pts.push(v(Math.cos(ang) * r * flare * (0.72 + 0.28 * (y / rimH)), y + (k === 0 || k === 4 ? rnd(-0.05, 0.14) : 0), Math.sin(ang) * r * flare * (0.72 + 0.28 * (y / rimH))));
      }
      sticks.push(limb(pts, rnd(0.02, 0.04), 0.012, 5));
    }
    for (let i = 0; i < 12; i++) {
      const a0 = rnd(0, 6.28), a1 = a0 + Math.PI + rnd(-0.7, 0.7), r = Rn * rnd(0.75, 1.05);
      sticks.push(limb([v(Math.cos(a0) * r, rnd(0, 0.12), Math.sin(a0) * r), v(rnd(-0.1, 0.1), -0.06, rnd(-0.1, 0.1)), v(Math.cos(a1) * r, rnd(0, 0.12), Math.sin(a1) * r)], 0.035, 0.018, 5));
    }
    const nestMesh = new THREE.Mesh(fuse(sticks), stick);
    nestMesh.castShadow = nestMesh.receiveShadow = true;
    nest.add(nestMesh);

    const bed: Blob[] = [{ at: v(0, rimH * 0.2, 0), size: v(Rn * 0.9, rimH * 0.42, Rn * 0.9), color: leafColour().offsetHSL(0, 0, -0.04) }];
    const dented = a.sleeper === 'empty';
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * 6.28 + rnd(-0.2, 0.2), size = Rn * rnd(0.28, 0.4);
      bed.push({ at: v(Math.cos(ang) * Rn * 0.78, rimH * rnd(0.55, 0.85), Math.sin(ang) * Rn * 0.78), size: v(size, size * 0.5 * collapse, size), color: leafColour(), turn: rnd(0, 6) });
    }
    nest.add(instances(clump(), leafMaterial, bed));
    const leafBits: Blob[] = [];
    const leafCount = Math.round(mix(150, 320, mood.density) * (a.age === 'old' ? 0.5 : 1));
    for (let i = 0; i < leafCount; i++) {
      const ang = rnd(0, 6.28), rr = Math.sqrt(random()) * 1.22, inner = rr < (dented ? 0.5 : 0.2);
      if (inner && random() < 0.6) continue;
      const len = rnd(0.11, 0.2);
      leafBits.push({ at: v(Math.cos(ang) * Rn * rr, rimH * (0.35 + 0.6 * Math.min(1, rr)) + rnd(-0.04, 0.1) - (rr > 1.05 ? (rr - 1.05) * 0.9 : 0), Math.sin(ang) * Rn * rr), size: v(len, 0.012, len * 0.42), color: leafColour(), tilt: new THREE.Euler(rnd(-0.7, 0.7), rnd(0, 6.28), rnd(-0.7, 0.7)) });
    }
    nest.add(instances(new THREE.OctahedronGeometry(1, 0), leafMaterial, leafBits));

    // The ape.
    const hairTone = new THREE.Color('#9a4518').lerp(new THREE.Color('#7a3414'), 1 - mood.warmth * 0.7).offsetHSL(0, 0, mix(-0.03, 0.05, mood.cheer));
    const hair = new THREE.MeshStandardMaterial({ color: hairTone, roughness: 1, flatShading: true });
    const skinMat = new THREE.MeshStandardMaterial({ color: '#3a302c', roughness: 0.8 });
    const ape = new THREE.Group();
    nest.add(ape);
    const addApe = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = ape) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; };
    const shaggy = (pts: V[], r0: number, r1: number, parent: THREE.Object3D = ape) => {
      addApe(limb(pts, r0, r1, 7), hair, parent);
      // Long hair hangs off the underside of the arm.
      const curve = new THREE.CatmullRomCurve3(pts), strands: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 16; i++) {
        const p = curve.getPointAt(rnd(0.05, 0.85)), len = rnd(0.16, 0.34);
        const c = new THREE.ConeGeometry(0.03, len, 4);
        c.rotateX(Math.PI);
        c.translate(p.x + rnd(-0.04, 0.04), p.y - len * 0.5, p.z + rnd(-0.04, 0.04));
        strands.push(c);
      }
      addApe(fuse(strands), hair, parent);
    };
    const hand = (p: V, down: boolean, parent: THREE.Object3D = ape) => {
      const fingers: THREE.BufferGeometry[] = [new THREE.SphereGeometry(0.055, 8, 6).translate(p.x, p.y, p.z)];
      for (let i = 0; i < 4; i++) {
        const dz = (i - 1.5) * 0.028;
        fingers.push(limb(down ? [p.clone().add(v(0, 0, dz)), p.clone().add(v(0.02, -0.09, dz)), p.clone().add(v(-0.01, -0.17, dz))] : [p.clone().add(v(0, 0, dz)), p.clone().add(v(0.05, 0.08, dz)), p.clone().add(v(0.1, 0.02, dz))], 0.016, 0.011, 5));
      }
      addApe(fuse(fingers), skinMat, parent);
    };
    const hangArm = (ang: number) => {
      const dir = v(Math.cos(ang), 0, Math.sin(ang)), rim = dir.clone().multiplyScalar(Rn * 1.05).setY(rimH + 0.06);
      const grp = new THREE.Group();
      grp.rotation.y = -ang;
      ape.add(grp);
      const drop = rnd(0.75, 0.95);
      shaggy([v(Rn * 0.45, rimH * 0.9, 0), v(Rn * 0.9, rimH + 0.1, 0), v(Rn * 1.12, rimH - 0.12, 0), v(Rn * 1.16, rimH - drop * 0.6, 0), v(Rn * 1.14, rimH - drop, 0)], 0.11, 0.065, grp);
      hand(v(Rn * 1.14, rimH - drop - 0.03, 0), true, grp);
      return { grp, rim };
    };
    let breather: THREE.Object3D | null = null, swinger: THREE.Object3D | null = null;
    const front = rnd(0.9, 1.8);
    if (a.sleeper === 'arm') swinger = hangArm(front).grp;
    if (a.sleeper === 'curled' || a.sleeper === 'mother') {
      const back = addApe(clump(2, 0.12), hair);
      back.scale.set(Rn * 0.62, Rn * 0.4, Rn * 0.5);
      back.position.set(-Rn * 0.05, rimH * 0.9, 0);
      back.rotation.y = rnd(-0.5, 0.5);
      breather = back;
      const head = addApe(new THREE.SphereGeometry(Rn * 0.19, 12, 9), hair);
      head.position.set(Rn * 0.5, rimH * 0.95, Rn * 0.2);
      addApe(new THREE.SphereGeometry(Rn * 0.12, 10, 8), skinMat).position.set(Rn * 0.6, rimH * 0.93, Rn * 0.27);
      swinger = hangArm(front).grp;
      if (a.sleeper === 'mother') {
        const baby = new THREE.MeshStandardMaterial({ color: hairTone.clone().offsetHSL(0.01, 0, 0.1), roughness: 1, flatShading: true });
        addApe(clump(1, 0.25), baby).scale.setScalar(Rn * 0.16);
        ape.children[ape.children.length - 1].position.set(Rn * 0.2, rimH + Rn * 0.36, Rn * 0.36);
        const face = addApe(new THREE.SphereGeometry(Rn * 0.085, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9b8a0', roughness: 0.8 }));
        face.position.set(Rn * 0.24, rimH + Rn * 0.36, Rn * 0.47);
        for (const dx of [-1, 1]) addApe(new THREE.SphereGeometry(Rn * 0.02, 6, 5), skinMat).position.set(Rn * (0.24 + dx * 0.035), rimH + Rn * 0.38, Rn * 0.545);
        // Wispy baby hair standing straight up.
        for (let i = 0; i < 5; i++) addApe(new THREE.ConeGeometry(0.012, 0.12, 4), baby).position.set(Rn * 0.2 + rnd(-0.06, 0.06), rimH + Rn * 0.36 + Rn * 0.17 + 0.04, Rn * 0.36 + rnd(-0.05, 0.05));
      }
    }
    if (a.sleeper === 'watching') {
      const ang = Math.PI / 2 + rnd(-0.4, 0.4), dir = v(Math.cos(ang), 0, Math.sin(ang)), side = v(-dir.z, 0, dir.x);
      const hp = dir.clone().multiplyScalar(Rn * 0.62).setY(rimH + Rn * 0.2);
      const head = addApe(clump(2, 0.1), hair);
      head.scale.set(Rn * 0.26, Rn * 0.3, Rn * 0.26);
      head.position.copy(hp);
      const face = addApe(new THREE.SphereGeometry(1, 12, 9), skinMat);
      face.scale.set(Rn * 0.17, Rn * 0.2, Rn * 0.1);
      face.position.copy(hp).addScaledVector(dir, Rn * 0.2).add(v(0, -Rn * 0.04, 0));
      for (const k of [-1, 1]) {
        const eye = addApe(new THREE.SphereGeometry(Rn * 0.035, 8, 6), new THREE.MeshStandardMaterial({ color: '#f1e6d0', roughness: 0.4 }));
        eye.position.copy(hp).addScaledVector(dir, Rn * 0.285).addScaledVector(side, k * Rn * 0.07).add(v(0, Rn * 0.03, 0));
        const pupil = addApe(new THREE.SphereGeometry(Rn * 0.02, 6, 5), new THREE.MeshStandardMaterial({ color: '#120e0c' }));
        pupil.position.copy(eye.position).addScaledVector(dir, Rn * 0.025);
        const grip = dir.clone().multiplyScalar(Rn * 1.0).addScaledVector(side, k * Rn * 0.42).setY(rimH + 0.08);
        addApe(new THREE.SphereGeometry(0.07, 8, 6), hair).position.copy(grip);
        const fingers: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 4; i++) { const p = grip.clone().addScaledVector(side, (i - 1.5) * 0.03); fingers.push(limb([p, p.clone().addScaledVector(dir, 0.07).add(v(0, 0.03, 0)), p.clone().addScaledVector(dir, 0.1).add(v(0, -0.09, 0))], 0.017, 0.012, 5)); }
        addApe(fuse(fingers), skinMat);
      }
      breather = head;
    }
    if (a.sleeper === 'stretching') {
      const belly = addApe(clump(2, 0.1), hair);
      belly.scale.set(Rn * 0.6, Rn * 0.3, Rn * 0.42);
      belly.position.set(0, rimH * 0.85, 0);
      breather = belly;
      addApe(new THREE.SphereGeometry(Rn * 0.18, 12, 9), hair).position.set(-Rn * 0.6, rimH + 0.05, 0);
      addApe(new THREE.SphereGeometry(Rn * 0.12, 10, 8), skinMat).position.set(-Rn * 0.62, rimH + Rn * 0.13, 0);
      const local = (holds[0] ?? v(0, nestAt.y + 1.4, 0)).clone().sub(nestAt);
      const grab = v(local.x * 0.5, Math.max(rimH + 0.9, Math.min(local.y, rimH + 1.5)), local.z * 0.5);
      shaggy([v(-Rn * 0.3, rimH * 0.95, 0.1), grab.clone().multiplyScalar(0.5).add(v(-0.1, 0.1, 0.1)), grab], 0.08, 0.05);
      hand(grab, false);
      // The twig it is holding on to.
      addApe(limb([grab.clone().add(v(-0.35, 0.02, -0.05)), grab.clone().add(v(0.02, 0.07, 0)), grab.clone().add(v(0.4, 0.3, 0.1))], 0.022, 0.012, 5), stick);
      addApe(limb([v(Rn * 0.4, rimH, -0.1), v(Rn * 0.8, rimH + 0.3, -0.15), v(Rn * 1.1, rimH + 0.1, -0.1)], 0.075, 0.05, 6), hair);
    }

    // Additions.
    if (a.extras === 'roof') {
      const roofSticks: THREE.BufferGeometry[] = [], roofLeaves: Blob[] = [];
      const apex = v(rnd(-0.1, 0.1), rimH + Rn * 1.05, rnd(-0.1, 0.1));
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI + (i / 6 - 0.5) * 3.6, foot = v(Math.cos(ang) * Rn * 1.02, rimH, Math.sin(ang) * Rn * 1.02);
        const over = apex.clone().add(v(-Math.cos(ang) * Rn * 0.35, rnd(-0.08, 0.05), -Math.sin(ang) * Rn * 0.35));
        roofSticks.push(limb([foot, foot.clone().lerp(over, 0.5).add(v(Math.cos(ang) * Rn * 0.3, Rn * 0.35, Math.sin(ang) * Rn * 0.3)), over], 0.03, 0.012, 5));
        for (let k = 0; k < 3; k++) { const size = Rn * rnd(0.26, 0.38); roofLeaves.push({ at: foot.clone().lerp(over, rnd(0.45, 1)).add(v(Math.cos(ang) * Rn * 0.18, Rn * rnd(0.22, 0.32), Math.sin(ang) * Rn * 0.18)), size: v(size, size * 0.32, size), color: leafColour(), turn: rnd(0, 6) }); }
      }
      addApe(fuse(roofSticks), stick, nest);
      nest.add(instances(clump(), leafMaterial, roofLeaves));
    }
    if (a.extras === 'pillow') {
      const bundle: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) bundle.push(limb([v(-Rn * 0.62 + rnd(-0.05, 0.05), rimH + rnd(0, 0.14), -Rn * 0.35 + rnd(-0.05, 0.05)), v(-Rn * 0.66 + rnd(-0.05, 0.05), rimH + rnd(0.04, 0.18), rnd(-0.05, 0.05)), v(-Rn * 0.62 + rnd(-0.05, 0.05), rimH + rnd(0, 0.14), Rn * 0.35 + rnd(-0.05, 0.05))], 0.022, 0.014, 5));
      addApe(fuse(bundle), stick, nest);
      const big: Blob[] = [];
      for (let i = 0; i < 5; i++) big.push({ at: v(Rn * rnd(-0.1, 0.5), rimH * 1.0 + Rn * 0.3 + i * 0.015, Rn * rnd(-0.35, 0.35)), size: v(Rn * 0.45, 0.014, Rn * 0.22), color: leafColour(), tilt: new THREE.Euler(rnd(-0.25, 0.25), rnd(0, 6.28), rnd(-0.25, 0.25)) });
      nest.add(instances(new THREE.SphereGeometry(1, 10, 6), leafMaterial, big));
    }
    if (a.extras === 'umbrella') {
      const base = v(-Rn * 0.2, rimH * 0.9, -Rn * 0.2), topAt = v(Rn * 0.05, rimH + Rn * 1.2, 0);
      addApe(limb([base, base.clone().lerp(topAt, 0.6).add(v(-0.12, 0, -0.05)), topAt], 0.028, 0.016, 6), stick, nest);
      const blade = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
      const leafMesh = addApe(blade, new THREE.MeshStandardMaterial({ color: leafColour(), roughness: 0.6, side: THREE.DoubleSide, flatShading: true }), nest);
      leafMesh.scale.set(Rn * 0.95, Rn * 0.35, Rn * 0.6);
      leafMesh.position.copy(topAt).add(v(0, -Rn * 0.3, 0));
      leafMesh.rotation.set(rnd(-0.15, 0.15), rnd(0, 3), rnd(-0.2, 0.2));
    }

    if (a.leftovers === 'durian') {
      const husk = s.material('#8f9a3c', { roughness: 0.9, flatShading: true }), flesh = s.material('#f1e2a0');
      for (let i = 0; i < 3; i++) {
        const ang = front + 1.6 + i * 0.9, p = nestAt.clone().add(v(Math.cos(ang) * Rn * 0.7, rimH + 0.1, Math.sin(ang) * Rn * 0.7));
        const shell = s.mesh(new THREE.IcosahedronGeometry(0.13, 1), husk, [p.x, p.y, p.z]);
        const pos = shell.geometry.attributes.position;
        for (let k = 0; k < pos.count; k += 3) { const m = 1.35; pos.setXYZ(k, pos.getX(k) * m, pos.getY(k) * m, pos.getZ(k) * m); }
        shell.geometry.computeVertexNormals();
        shell.scale.set(1, 0.6, 1.2);
        shell.rotation.set(rnd(-0.5, 0.5), rnd(0, 6), rnd(-0.5, 0.5));
        s.ball([0.07, 0.04, 0.09], [p.x, p.y + 0.06, p.z], flesh, 8);
      }
    }
    if (a.leftovers === 'figs') {
      const figs: Blob[] = [];
      for (let i = 0; i < 26; i++) { const ang = rnd(0, 6.28), rr = rnd(0.3, 1.0); figs.push({ at: v(Math.cos(ang) * Rn * rr, rimH * (0.5 + 0.5 * rr) + 0.08, Math.sin(ang) * Rn * rr), size: v(0.04, 0.04, 0.04), color: random() < 0.6 ? '#d24a2c' : '#e3a02e' }); }
      nest.add(instances(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.5 }), figs));
    }
    if (a.leftovers === 'tool') {
      const ang = front - 1.2, p = v(Math.cos(ang) * Rn * 0.9, rimH, Math.sin(ang) * Rn * 0.9);
      addApe(limb([p.clone().add(v(0, -0.1, 0)), p.clone().add(v(Math.cos(ang) * 0.25, 0.45, Math.sin(ang) * 0.25)), p.clone().add(v(Math.cos(ang) * 0.45, 1.0, Math.sin(ang) * 0.45))], 0.02, 0.012, 5), new THREE.MeshStandardMaterial({ color: '#e6d9b0', roughness: 0.7 }), nest);
    }
    if (a.leftovers === 'bark') {
      const strips: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 6; i++) { const ang = rnd(0, 6.28), p = v(Math.cos(ang) * Rn * 1.05, rimH * 0.8, Math.sin(ang) * Rn * 1.05), len = rnd(0.5, 1.2); strips.push(limb([p, p.clone().add(v(Math.cos(ang) * 0.12, -len * 0.5, Math.sin(ang) * 0.12)), p.clone().add(v(Math.cos(ang) * 0.06, -len, Math.sin(ang) * 0.06))], 0.03, 0.02, 4)); }
      addApe(fuse(strips), new THREE.MeshStandardMaterial({ color: '#c9a877', roughness: 0.9 }), nest);
    }

    const energy = mood.energy;
    return s.finish({
      footprint: Math.max(0.6, Rn * 0.9),
      update: (_dt, time) => {
        if (breather) breather.scale.y = breather.scale.y * 0 + (a.sleeper === 'watching' ? Rn * 0.3 : a.sleeper === 'stretching' ? Rn * 0.3 : Rn * 0.4) * (1 + Math.sin(time * mix(0.8, 2.4, energy)) * 0.04);
        if (swinger) swinger.rotation.z = Math.sin(time * 0.9) * 0.03 * (0.3 + energy);
      },
    });
  },
});
