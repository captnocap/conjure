import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

/** A tube that thins toward its tip: horns, tails. */
function taper(points: P3[], r0: number, r1: number, material: THREE.Material) {
  const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const seg = 28, radial = 8;
  const geometry = new THREE.TubeGeometry(path, seg, 1, radial, false);
  const pos = geometry.attributes.position;
  const centre = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    path.getPointAt(i / seg, centre);
    const rr = mix(r0, r1, Math.pow(i / seg, 0.8));
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(centre).multiplyScalar(rr).add(centre);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    pose: choice('Where is the buffalo and what is it doing?', {
      standing: 'Standing square on a bank, head level, chewing.',
      deep: 'Standing belly-deep in still water, legs hidden.',
      wallow: 'Sunk in a mud wallow to the shoulders, only back, head and horns showing.',
      grazing: 'Head down to the ground, grazing.',
      plough: 'Yoked to a wooden plough, mid-furrow.',
    }),
    horns: choice('What are its horns like?', {
      sweep: 'Wide crescent horns sweeping back like a drawn bow.',
      curled: 'Tight horns curling round toward the neck.',
      flat: 'Very long, nearly straight horns held out flat to the sides.',
      broken: 'One good horn and one snapped to a stump.',
    }),
    coat: choice('What does its hide look like?', {
      slate: 'Slate grey, dry and dusty.',
      wet: 'Black and gleaming, just out of the water.',
      muddy: 'Grey caked with pale dried mud to the belly line.',
      pale: 'A rare pinkish-white buffalo.',
    }),
    rider: choice('Who is on its back?', {
      egret: 'A white egret, standing calmly.',
      boy: 'A herd-boy in a straw hat, sitting sideways and playing a flute.',
      mynas: 'A couple of small black mynas picking at ticks.',
      nobody: 'Nobody.',
    }),
    rope: choice('What about the rope from its nose ring?', {
      trailing: 'It trails loose along the ground.',
      staked: 'It runs to a wooden stake driven in nearby.',
      looped: 'It is looped up over the horns, out of the way.',
      none: 'There is no rope: this one goes where it likes.',
    }),
    calf: noul('Is a calf standing close beside it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hide = new THREE.Color({ slate: '#5b5f63', wet: '#232629', muddy: '#5d5d5a', pale: '#d9b9ae' }[a.coat]);
    const rough = a.coat === 'wet' ? 0.3 : 0.85;
    const mud = new THREE.Color('#9a8565').lerp(new THREE.Color('#6b563c'), mood.wear * 0.5);
    const hornTone = a.coat === 'pale' ? '#c8b89a' : '#2b2a28';
    const tails: THREE.Object3D[] = [], heads: THREE.Object3D[] = [], ears: THREE.Object3D[] = [];

    const animal = (scale: number, opts: { legs: boolean; headDrop: number; adult: boolean }) => {
      const b = new Sculpture(context);
      b.root.scale.setScalar(scale);
      s.root.add(b.root);
      const skin = new THREE.MeshStandardMaterial({ color: hide.clone().offsetHSL(0, 0, (random() - 0.5) * 0.04), roughness: rough });
      const under = new THREE.MeshStandardMaterial({ color: a.coat === 'muddy' ? mud : hide.clone().multiplyScalar(0.8), roughness: 0.95 });
      const dark = new THREE.MeshStandardMaterial({ color: a.coat === 'pale' ? '#8f6f68' : '#17181a', roughness: 0.6 });
      // Barrel, shoulders, rump.
      b.ball([0.54, 0.5, 1.02], [0, 1.02, 0], skin);
      b.ball([0.5, 0.52, 0.52], [0, 1.1, 0.58], skin);
      b.ball([0.52, 0.5, 0.5], [0, 1.04, -0.62], skin);
      if (opts.legs) b.ball([0.5, 0.44, 0.82], [0, 0.86, -0.02], under);
      for (const x of [-0.2, 0.2]) b.ball([0.12, 0.06, 0.1], [x, 1.5, -0.72], skin, 8);
      b.ball([0.06, 0.05, 0.9], [0, 1.53, -0.05], skin, 8);
      if (opts.legs) for (const [x, z, fore] of [[-0.3, 0.68, 1], [0.3, 0.68, 1], [-0.3, -0.72, 0], [0.3, -0.72, 0]] as const) {
        const step = (random() - 0.5) * 0.16;
        b.ball([0.17, 0.3, fore ? 0.2 : 0.25], [x, 0.78, z], skin, 10);
        b.rod([x, 0.75, z], [x, 0.36, z + step * 0.5 - (fore ? 0 : 0.06)], 0.105, skin, 0.075);
        b.rod([x, 0.38, z + step * 0.5 - (fore ? 0 : 0.06)], [x, 0.08, z + step], 0.075, a.coat === 'muddy' ? under : skin, 0.07);
        b.cylinder(0.085, 0.1, 0.1, [x, 0.05, z + step + 0.01], dark, 10);
      }
      // Neck and head.
      const drop = opts.headDrop;
      const neck = b.ball([0.3, 0.33, 0.5], [0, 1.08 - drop * 0.3, 1.05], skin, 12);
      neck.rotation.x = 0.15 + drop * 0.8;
      const head = new Sculpture(context);
      head.root.position.set(0, 1.08 - drop * 0.78, 1.45 + drop * 0.05);
      head.root.rotation.x = 0.35 + drop * 0.75;
      b.root.add(head.root);
      heads.push(head.root);
      head.ball([0.2, 0.2, 0.3], [0, 0, 0.05], skin, 12);
      head.ball([0.15, 0.14, 0.24], [0, -0.04, 0.3], skin, 12);
      head.ball([0.16, 0.12, 0.1], [0, -0.07, 0.5], dark, 10);
      for (const x of [-0.06, 0.06]) head.ball([0.025, 0.018, 0.02], [x, -0.05, 0.595], new THREE.MeshStandardMaterial({ color: '#050505' }), 6);
      for (const x of [-0.17, 0.17]) head.ball([0.03, 0.035, 0.03], [x, 0.07, 0.13], new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.2 }), 8);
      for (const side of [-1, 1]) {
        const ear = head.ball([0.17, 0.04, 0.09], [side * 0.3, 0.02, -0.12], skin, 8);
        ear.rotation.z = side * -0.35; ear.rotation.y = side * 0.3;
        ears.push(ear);
      }
      const horn = new THREE.MeshStandardMaterial({ color: hornTone, roughness: 0.55 });
      for (const side of [-1, 1]) {
        if (!opts.adult) { head.root.add(taper([[side * 0.12, 0.16, -0.08], [side * 0.22, 0.24, -0.14], [side * 0.26, 0.34, -0.2]], 0.05, 0.015, horn)); continue; }
        const stump = a.horns === 'broken' && side === 1;
        const k = side;
        const shapes: Record<string, P3[]> = {
          sweep: [[k * 0.13, 0.16, -0.08], [k * 0.5, 0.2, -0.16], [k * 0.86, 0.34, -0.38], [k * 0.95, 0.56, -0.7], [k * 0.72, 0.74, -0.95]],
          curled: [[k * 0.13, 0.16, -0.08], [k * 0.45, 0.2, -0.2], [k * 0.6, 0.34, -0.5], [k * 0.42, 0.5, -0.72], [k * 0.2, 0.46, -0.6]],
          flat: [[k * 0.13, 0.16, -0.08], [k * 0.6, 0.18, -0.12], [k * 1.15, 0.22, -0.2], [k * 1.6, 0.32, -0.3]],
          broken: [[k * 0.13, 0.16, -0.08], [k * 0.5, 0.2, -0.16], [k * 0.86, 0.34, -0.38], [k * 0.95, 0.56, -0.7], [k * 0.72, 0.74, -0.95]],
        };
        if (stump) head.root.add(taper([[k * 0.13, 0.16, -0.08], [k * 0.32, 0.19, -0.12], [k * 0.44, 0.22, -0.16]], 0.085, 0.07, horn));
        else head.root.add(taper(shapes[a.horns], 0.085, 0.012, horn));
      }
      head.ball([0.2, 0.07, 0.1], [0, 0.17, -0.08], horn, 8);
      // Tail.
      const tail = new THREE.Group();
      tail.position.set(0, 1.38, -1.08);
      tail.add(taper([[0, 0, 0], [0, -0.3, -0.1], [0, -0.7, -0.08], [0.03, -0.95, -0.03]], 0.04, 0.018, skin));
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark); tuft.scale.set(1, 2, 1); tuft.position.set(0.03, -1.0, -0.03); tail.add(tuft);
      b.root.add(tail); tails.push(tail);
      return { b, head };
    };

    const wet = a.pose === 'wallow' || a.pose === 'deep';
    const sunk = wet ? 0.5 : 0;
    const drop = a.pose === 'grazing' ? 1 : a.pose === 'wallow' ? 0.1 : a.pose === 'plough' ? 0.3 : 0;
    const big = animal(1, { legs: !wet, headDrop: drop, adult: true });
    big.b.root.position.y = -sunk;

    // Setting patches for the wet poses.
    const waterTop = a.pose === 'deep' ? 0.27 : 0.52;
    if (a.pose === 'deep' || a.pose === 'wallow') {
      const tone = a.pose === 'deep' ? new THREE.Color('#5e8f7c').lerp(mud, 0.25 + mood.wear * 0.3) : mud.clone().multiplyScalar(0.8);
      const pool = s.cylinder(1, a.pose === 'deep' ? 1.08 : 1.3, waterTop, [0, waterTop / 2, 0.2], new THREE.MeshStandardMaterial({ color: tone, roughness: a.pose === 'deep' ? 0.15 : 0.45, metalness: 0.15 }), 40);
      pool.scale.set(a.calf ? 2.0 : 1.45, 1, 2.15);
      const ringMat = new THREE.MeshStandardMaterial({ color: tone.clone().lerp(new THREE.Color('#ffffff'), 0.4), roughness: 0.3 });
      for (const rr of [0.9, 1.1]) { const t = s.ring(rr, 0.014, [0, waterTop + 0.004, 0.1], ringMat); t.rotation.x = Math.PI / 2; t.scale.set(0.75, 1.45, 1); }
      if (a.pose === 'wallow') for (let k = 0; k < 9; k++) {
        const th = random() * 6.28;
        s.ball([0.2 + random() * 0.2, 0.05, 0.2 + random() * 0.15], [Math.sin(th) * 1.15, waterTop, 0.2 + Math.cos(th) * 1.75], new THREE.MeshStandardMaterial({ color: mud.clone().multiplyScalar(0.65), roughness: 0.5 }), 8);
      }
    }

    const ropeMat = s.material('#b79a62'), wood = s.material('#6d4c30');
    const headY = 1.08 - drop * 0.78 - sunk;
    const noseAngle = 0.35 + drop * 0.75;
    const nose: P3 = [0, headY - Math.sin(noseAngle) * 0.55 - 0.06, 1.45 + Math.cos(noseAngle) * 0.55];
    const ring = s.ring(0.055, 0.012, [nose[0], nose[1] - 0.03, nose[2] + 0.02], s.material('#b8892e', { metalness: 0.7, roughness: 0.35 }));
    ring.rotation.y = Math.PI / 2;
    const floor = wet ? waterTop + 0.015 : 0.02;
    if (a.rope === 'trailing' || a.rope === 'staked') {
      const side = random() < 0.5 ? -1 : 1;
      const end: P3 = a.rope === 'staked' ? [side * 1.5, floor + 0.35, 2.3] : [side * (1.0 + random() * 0.6), floor, 0.6 - random() * 1.2];
      const pts: P3[] = [[nose[0], nose[1] - 0.08, nose[2] + 0.02], [side * 0.15, Math.max(floor, nose[1] * 0.4), nose[2] + 0.25], [side * 0.5, floor, nose[2] + 0.3]];
      if (a.rope === 'trailing') pts.push([side * 0.95, floor, 1.5], [side * 0.7, floor, 1.0], end);
      else pts.push([side * 1.1, floor, 2.2], end);
      s.tube(pts, 0.018, ropeMat);
      if (a.rope === 'staked') { const stake = s.cylinder(0.035, 0.03, 0.75, [end[0], floor + 0.3, end[2]], wood, 8); stake.rotation.z = side * 0.15; }
    } else if (a.rope === 'looped') {
      const hy = headY + 0.2;
      s.tube([[nose[0], nose[1] - 0.08, nose[2]], [0.16, headY - 0.05, 1.6], [0.26, hy, 1.4], [0, hy + 0.06, 1.32], [-0.26, hy, 1.4], [-0.1, hy + 0.05, 1.5], [0.2, hy + 0.04, 1.36]], 0.018, ropeMat);
    }

    if (a.pose === 'plough') {
      const yoke = s.tube([[-0.5, 1.2, 0.95], [-0.3, 1.52, 0.95], [0, 1.62, 0.95], [0.3, 1.52, 0.95], [0.5, 1.2, 0.95]], 0.045, wood);
      void yoke;
      for (const x of [-0.5, 0.5]) s.tube([[x, 1.2, 0.95], [x * 1.1, 0.95, -0.4], [x * 0.5, 0.6, -1.6], [0, 0.42, -2.1]], 0.016, ropeMat);
      s.tube([[0, 0.42, -2.0], [0, 0.4, -2.5], [0, 0.22, -2.85], [0, 0.03, -2.7]], 0.05, wood);
      s.rod([0, 0.3, -2.75], [0, 1.0, -3.25], 0.035, wood);
      s.rod([-0.14, 1.0, -3.25], [0.14, 1.0, -3.25], 0.03, wood);
      const share = s.mesh(new THREE.ConeGeometry(0.12, 0.34, 4), s.material('#7d8286', { metalness: 0.6 }), [0, 0.04, -2.56]);
      share.rotation.x = Math.PI / 2 + 0.3;
      for (let k = 0; k < 8; k++) s.ball([0.1 + random() * 0.08, 0.06, 0.12], [(k % 2 ? 0.2 : -0.2) + (random() - 0.5) * 0.08, 0.03, -2.95 - k * 0.17], new THREE.MeshStandardMaterial({ color: mud, roughness: 1, flatShading: true }), 6);
    }

    // Passengers.
    const backY = 1.53 - sunk;
    const bobbers: THREE.Object3D[] = [];
    if (a.rider === 'egret') {
      const e = new Sculpture(context);
      e.root.position.set(0, backY, -0.2 + random() * 0.5); e.root.rotation.y = (random() - 0.5) * 2; e.root.scale.setScalar(1.25);
      s.root.add(e.root); bobbers.push(e.root);
      const white = new THREE.MeshStandardMaterial({ color: '#fbfbf5', roughness: 0.7 });
      const legs = new THREE.MeshStandardMaterial({ color: '#2a2b28' });
      for (const x of [-0.025, 0.025]) e.rod([x, 0, 0], [x, 0.2, -0.02], 0.007, legs);
      const body = e.ball([0.065, 0.075, 0.14], [0, 0.26, -0.03], white, 12); body.rotation.x = -0.45;
      e.root.add(taper([[0, 0.3, 0.05], [0, 0.4, 0.1], [0, 0.47, 0.03], [0, 0.55, 0.06]], 0.028, 0.018, white));
      e.ball([0.024, 0.024, 0.035], [0, 0.56, 0.075], white, 8);
      e.rod([0, 0.56, 0.1], [0, 0.545, 0.21], 0.01, new THREE.MeshStandardMaterial({ color: '#e2a41e' }), 0.002);
      e.rod([0, 0.57, 0.05], [0, 0.6, -0.06], 0.006, white, 0.001);
      const tail = e.ball([0.04, 0.01, 0.09], [0, 0.17, -0.15], white, 6); tail.rotation.x = 0.6;
    } else if (a.rider === 'mynas') {
      for (let k = 0; k < 2 + Math.floor(random() * 2); k++) {
        const z = -0.7 + k * 0.55 + random() * 0.2, x = (random() - 0.5) * 0.25;
        const blk = new THREE.MeshStandardMaterial({ color: '#1c1b1e', roughness: 0.5 });
        const g = new THREE.Group(); g.position.set(x, backY - Math.abs(x) * 0.3, z); g.rotation.y = random() * 6.28; s.root.add(g); bobbers.push(g);
        const add = (m: THREE.Mesh) => { m.removeFromParent(); g.add(m); return m; };
        add(s.ball([0.045, 0.045, 0.075], [0, 0.07, 0], blk, 8)).rotation.x = -0.3;
        add(s.ball([0.03, 0.03, 0.032], [0, 0.125, 0.05], blk, 8));
        add(s.rod([0, 0.125, 0.07], [0, 0.118, 0.115], 0.009, new THREE.MeshStandardMaterial({ color: '#f0b21e' }), 0.002));
        add(s.box([0.03, 0.006, 0.07], [0, 0.05, -0.09], blk));
        add(s.box([0.012, 0.03, 0.03], [0.046, 0.08, 0], new THREE.MeshStandardMaterial({ color: '#f4f4ee' })));
      }
    } else if (a.rider === 'boy') {
      const g = new Sculpture(context);
      g.root.position.set(0, backY - 0.03, 0.1); s.root.add(g.root); bobbers.push(g.root);
      const cloth = g.material(mood.cheer > 0.5 ? '#c2452e' : '#48607a'), flesh = g.material('#c79670'), trousers = g.material('#3b3d42');
      g.rod([0, 0.02, 0], [0, 0.42, 0], 0.12, cloth, 0.1);
      for (const z of [-0.08, 0.08]) { g.rod([0, 0.04, z], [0.3, 0.02, z + 0.02], 0.055, trousers); g.rod([0.3, 0.02, z + 0.02], [0.4, -0.32, z + 0.02], 0.04, flesh); }
      g.ball([0.095, 0.105, 0.095], [0.01, 0.56, 0], flesh, 12);
      g.mesh(new THREE.ConeGeometry(0.27, 0.14, 18), g.material('#d8bd6c'), [0.01, 0.68, 0]);
      g.rod([0.05, 0.5, 0.02], [0.28, 0.46, 0.32], 0.012, g.material('#8a6a2e'));
      g.rod([0, 0.38, 0.1], [0.16, 0.4, 0.22], 0.03, cloth); g.rod([0.16, 0.4, 0.22], [0.1, 0.5, 0.1], 0.025, flesh);
      g.rod([0.02, 0.38, -0.1], [0.22, 0.38, 0.05], 0.03, cloth); g.rod([0.22, 0.38, 0.05], [0.2, 0.47, 0.22], 0.025, flesh);
    }

    if (a.calf) {
      const small = animal(0.55, { legs: !wet, headDrop: 0.15, adult: false });
      small.b.root.position.set(1.02, a.pose === 'deep' ? -0.2 : a.pose === 'wallow' ? -0.05 : 0, 0.35 + random() * 0.5);
      small.b.root.rotation.y = -0.35 + random() * 0.3;
    }

    const speed = mix(0.25, 2.2, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        tails.forEach((t, i) => { t.rotation.z = Math.sin(time * speed * 1.7 + i) * mix(0.08, 0.6, mood.energy); });
        ears.forEach((e, i) => { e.rotation.x = Math.max(0, Math.sin(time * speed * 0.9 + i * 2.1) - 0.8) * 2.5; });
        bobbers.forEach((b, i) => { b.rotation.z = Math.sin(time * speed + i) * 0.03; });
      },
    });
  },
});
