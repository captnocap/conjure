import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { arc, ball, cone, cyl, horn, paint, type V3 } from './parts';

export default defineThing({
  questions: {
    tail: choice('What kind of tail is it?', {
      plume: 'A feathered setter plume with a long silky fringe hanging from it.',
      whip: 'A long thin whip that stings shins and clears coffee tables.',
      curl: 'A tight curl carried over the back like a cinnamon roll.',
      stub: 'A docked stub that takes the whole rump with it when it wags.',
      rat: 'A bald pink rat-tail with a few stray hairs.',
    }),
    signal: choice('What is the tail saying?', {
      high: 'Held high and wagging fast: pure delight.',
      low: 'A slow low sweep along the floor: hopeful, unsure.',
      tucked: 'Tucked hard between the back legs: frightened.',
      flag: 'A stiff, still flag straight out behind: on alert.',
    }),
    hiding: choice('What is the rest of the dog hidden by?', {
      chair: 'A plastic waiting-room chair it has crawled under, back legs splayed out behind.',
      flap: 'A pet flap in a door: jammed halfway through, flap resting on its back.',
      blanket: 'A rumpled blanket it has burrowed head-first into.',
      carrier: 'A plastic pet carrier far too small for it, back half sticking out of the door.',
    }),
    motion: choice('How is the movement drawn?', {
      still: 'Not at all: a clean still tail.',
      arcs: 'Comic-strip speed arcs either side of the tip.',
      ghosts: 'Faint after-images of the tail fanned out through its swing.',
    }),
    knocked: choice('What has the tail knocked over?', {
      nothing: 'Nothing.',
      treats: 'A glass jar of biscuit treats, on its side and spilling.',
      cup: 'A paper coffee cup in a brown puddle.',
      leaflets: 'A stack of clinic leaflets, fanned across the floor.',
    }),
    bandage: noul('Is the tip of the tail wrapped in a bright bandage?'),
    coat: choice('What colour is the dog?', {
      golden: 'Honey gold.',
      red: 'Deep red setter mahogany.',
      black: 'Black.',
      spotted: 'White with black spots.',
      grey: 'Wiry grey.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const coatHex = { golden: '#d6a655', red: '#8f3d1e', black: '#2a2726', spotted: '#eeeae0', grey: '#8a8d90' }[a.coat];
    const coat = s.material(coatHex, { roughness: 0.92 });
    const fringe = paint(new THREE.Color(coatHex).lerp(new THREE.Color('#fff3da'), a.coat === 'black' ? 0.12 : 0.3), { roughness: 0.95 });
    const padMat = paint(a.coat === 'spotted' ? '#d98f96' : '#2b2224', { roughness: 0.6 });
    const lying = a.hiding === 'chair' || a.hiding === 'blanket';

    const dog = new THREE.Group();
    s.root.add(dog);
    const spot = paint('#1f1d1d', { roughness: 0.92 });
    const spots = (list: [V3, V3][]) => { if (a.coat === 'spotted') for (const [at, size] of list) ball(dog, spot, at, size, [0, 0, 0], 10); };

    // Hindquarters. The dog faces away, down -z, into whatever hides it.
    const rumpY = lying ? 0.13 : 0.4;
    const rump = new THREE.Group();
    rump.position.set(0, rumpY, 0);
    dog.add(rump);
    if (lying) {
      ball(rump, coat, [0, 0, -0.02], [0.15, 0.12, 0.17]);
      ball(dog, coat, [0, 0.125, -0.3], [0.14, 0.12, 0.3]);
      for (const x of [-1, 1]) {
        // The sploot: thighs out sideways, shanks and paws trailing back, pads up.
        ball(dog, coat, [x * 0.15, 0.07, 0.03], [0.075, 0.065, 0.12], [0, x * 0.35, 0]);
        ball(dog, coat, [x * 0.19, 0.035, 0.2], [0.035, 0.03, 0.1], [0, x * 0.15, 0]);
        ball(dog, coat, [x * 0.2, 0.03, 0.31], [0.04, 0.026, 0.055]);
        ball(dog, padMat, [x * 0.2, 0.05, 0.3], [0.02, 0.008, 0.022], [0.2, 0, 0], 10);
        for (let i = -1; i <= 1; i++) ball(dog, padMat, [x * 0.2 + i * 0.018, 0.047, 0.34], [0.008, 0.006, 0.01], [0, 0, 0], 8);
      }
      spots([[[0.07, 0.2, 0.02], [0.05, 0.03, 0.06]], [[-0.08, 0.2, -0.14], [0.04, 0.03, 0.05]], [[-0.18, 0.1, 0.06], [0.03, 0.03, 0.04]]]);
    } else {
      ball(rump, coat, [0, 0, -0.03], [0.14, 0.15, 0.17]);
      ball(dog, coat, [0, 0.41, -0.3], [0.13, 0.14, 0.3]);
      for (const x of [-1, 1]) {
        ball(dog, coat, [x * 0.1, 0.33, 0.0], [0.065, 0.13, 0.1], [0.25, 0, 0]);
        cyl(dog, coat, 0.034, 0.026, 0.17, [x * 0.105, 0.15, 0.075], [-0.45, 0, 0], 12);
        cyl(dog, coat, 0.025, 0.024, 0.1, [x * 0.105, 0.055, 0.035], [0.25, 0, 0], 12);
        ball(dog, coat, [x * 0.105, 0.02, 0.02], [0.038, 0.022, 0.055]);
      }
      spots([[[0.09, 0.47, 0.03], [0.05, 0.05, 0.06]], [[-0.1, 0.4, 0.07], [0.04, 0.05, 0.05]], [[-0.02, 0.53, -0.15], [0.06, 0.02, 0.06]]]);
    }

    // The tail on its pivot.
    const pivot = new THREE.Group();
    const base: V3 = lying ? [0, 0.19, 0.13] : [0, 0.5, 0.1];
    pivot.position.set(...base);
    dog.add(pivot);
    const kind = a.tail;
    const len = { plume: 1.2, whip: 1.25, curl: 1.15, stub: 0.22, rat: 1.1 }[kind];
    let signal = a.signal;
    let pts: V3[];
    if (kind === 'curl' && signal !== 'tucked') {
      pts = [];
      const tight = signal === 'high' ? 1 : signal === 'low' ? 0.55 : 0.8;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12, ang = -Math.PI / 2 + t * Math.PI * 2 * (0.75 + tight * 0.75), r = mix(0.085, 0.03, t * tight);
        pts.push([0, 0.085 + Math.sin(ang) * r, -0.01 - Math.cos(ang) * r]);
      }
    } else {
      const shapes: Record<string, V3[]> = {
        high: [[0, 0, 0], [0, 0.12, 0.07], [0, 0.26, 0.085], [0, 0.38, 0.04]],
        low: [[0, 0, 0], [0, -0.03, 0.14], [0, -0.1, 0.27], [0, -0.14, 0.38]],
        tucked: [[0, 0, 0], [0, -0.09, 0.05], [0, -0.22, 0.02], [0, -0.33, -0.07]],
        flag: [[0, 0, 0], [0, 0.04, 0.13], [0, 0.085, 0.27], [0, 0.12, 0.41]],
      };
      pts = shapes[signal].map(([x, y, z]) => [x, y * len, z * len] as V3);
    }
    // Keep it above the floor when the dog is lying down.
    pts = pts.map(([x, y, z]) => [x, Math.max(y, 0.016 - base[1] + (kind === 'plume' ? 0.02 : 0)), z] as V3);
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
    const r0 = { plume: 0.034, whip: 0.028, curl: 0.04, stub: 0.045, rat: 0.021 }[kind];
    const r1 = { plume: 0.012, whip: 0.008, curl: 0.022, stub: 0.036, rat: 0.006 }[kind];
    const tailMat = kind === 'rat' ? paint('#dba39c', { roughness: 0.55 }) : coat;
    const tailMesh = horn(pivot, tailMat, pts, (t) => (kind === 'stub' ? Math.sqrt(Math.max(0, 1 - t * t)) * r0 : mix(r0, r1, t) * (t > 0.97 ? 0.6 : 1)), 1, 24, 10);
    const dressing = new THREE.Group();
    pivot.add(dressing);
    if (kind === 'plume') {
      for (let i = 0; i < 26; i++) {
        const t = 0.08 + (i / 26) * 0.9, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
        const down = new THREE.Vector3(0, -tan.z, tan.y).normalize();
        const l = Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.17 + 0.04;
        const dir = down.clone().addScaledVector(tan, 0.45).normalize();
        const strand = cone(dressing, i % 2 ? fringe : coat, 0.02, l, [p.x + dir.x * l * 0.5 + (random() - 0.5) * 0.008, p.y + dir.y * l * 0.5, p.z + dir.z * l * 0.5], [0, 0, 0], [1, 1, 0.35], 5);
        strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
    } else if (kind === 'rat') {
      for (let i = 0; i < 9; i++) {
        const t = 0.15 + random() * 0.8, p = curve.getPointAt(t);
        const dir = new THREE.Vector3((random() - 0.5), random() * 0.6 + 0.4, (random() - 0.5)).normalize();
        const hair = cyl(dressing, fringe, 0.0003, 0.0009, 0.035, [p.x + dir.x * 0.017, p.y + dir.y * 0.017, p.z + dir.z * 0.017], [0, 0, 0], 4);
        hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      }
      for (let i = 1; i < 12; i++) { const p = curve.getPointAt(i / 12.5); arc(dressing, paint('#c58a84'), mix(r0, r1, i / 12.5) + 0.0006, 0.0012, Math.PI * 2, [p.x, p.y, p.z]).lookAt(pivot.localToWorld(p.clone().add(curve.getTangentAt(i / 12.5)))); }
    } else if (kind === 'whip' && a.coat !== 'black') {
      const p = curve.getPointAt(0.97);
      ball(dressing, paint('#f4efe2', { roughness: 0.9 }), [p.x, p.y, p.z], [0.007, 0.007, 0.007], [0, 0, 0], 8);
    }
    if (a.bandage) {
      const wrap = s.material(new THREE.Color().setHSL((0.92 + mood.cheer * 0.5) % 1, 0.75, 0.58), { roughness: 0.95 });
      const from = kind === 'stub' ? 0.3 : 0.68;
      const sub: V3[] = [];
      for (let i = 0; i <= 6; i++) { const p = curve.getPointAt(mix(from, 1, i / 6)); sub.push([p.x, p.y, p.z]); }
      horn(dressing, wrap, sub, (t) => (kind === 'stub' ? r0 * 1.05 : mix(mix(r0, r1, from), r1, t)) + 0.007 - (t > 0.9 ? 0.004 : 0), 1, 10, 10);
      const p = curve.getPointAt(from);
      arc(dressing, paint('#f6f3ea'), mix(r0, r1, from) + 0.008, 0.003, Math.PI * 2, [p.x, p.y, p.z]).lookAt(pivot.localToWorld(p.clone().add(curve.getTangentAt(from))));
    }

    // Swing geometry: upright tails sweep in the x-y plane, level ones in x-z.
    const upright = signal === 'high' || (kind === 'curl' && signal !== 'tucked');
    const amp = { high: 0.6, low: 0.38, tucked: 0.04, flag: 0.02 }[signal] * (kind === 'stub' ? 1.3 : 1);
    const phase = random() * Math.PI * 2;
    const setSwing = (group: THREE.Object3D, w: number) => { if (upright) group.rotation.set(0, 0, w); else group.rotation.set(0, w, 0); };
    if (amp > 0.1) {
      const tip = pts[pts.length - 1];
      const reach = Math.hypot(tip[1], tip[2]);
      if (a.motion === 'ghosts') {
        const ghost = new THREE.MeshStandardMaterial({ color: kind === 'rat' ? '#dba39c' : coatHex, transparent: true, opacity: 0.2, depthWrite: false });
        for (const w of [-1, -0.5, 0.5, 1]) {
          const g = new THREE.Group();
          g.position.set(...base);
          const m = new THREE.Mesh(tailMesh.geometry, ghost);
          g.add(m);
          setSwing(g, w * amp * 1.15);
          dog.add(g);
        }
      } else if (a.motion === 'arcs') {
        const ink = paint('#2a2a2c', { roughness: 0.9 });
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
          const r = reach * (1.02 - i * 0.17), span = 0.5 - i * 0.1;
          const start = Math.PI / 2 + side * (amp + 0.16 + i * 0.05) - (side > 0 ? 0 : span);
          const mesh = arc(dog, ink, r, 0.0045, span, base, upright ? [0, 0, start] : [-Math.PI / 2, 0, start]);
          if (!upright) mesh.rotation.set(Math.PI / 2, 0, -start - span + Math.PI);
        }
      }
    }
    setSwing(pivot, Math.sin(phase) * amp);

    // What hides the rest of the dog.
    const plastic = s.material(new THREE.Color().setHSL(mix(0.56, 0.06, mood.warmth), 0.42, mix(0.42, 0.62, mood.cheer)), { roughness: 0.5 });
    const steel = paint('#aeb3b7', { metalness: 0.75, roughness: 0.35 });
    if (a.hiding === 'chair') {
      s.box([0.5, 0.035, 0.46], [0, 0.44, -0.26], plastic);
      const back = s.box([0.5, 0.36, 0.03], [0, 0.72, -0.5], plastic); back.rotation.x = -0.12;
      for (const x of [-1, 1]) {
        s.rod([x * 0.22, 0, -0.03], [x * 0.2, 0.43, -0.08], 0.012, steel);
        s.rod([x * 0.22, 0, -0.52], [x * 0.2, 0.9, -0.5], 0.012, steel);
        s.rod([x * 0.22, 0.012, -0.03], [x * 0.22, 0.012, -0.52], 0.01, steel);
      }
      // A coat left over the seat hangs down and hides the front of the dog.
      const drape = s.material('#5a5f6b', { roughness: 1 });
      s.box([0.46, 0.03, 0.3], [0, 0.468, -0.33], drape);
      s.box([0.44, 0.34, 0.025], [0, 0.29, -0.19], drape).rotation.x = 0.06;
      for (const x of [-1, 1]) s.box([0.025, 0.4, 0.3], [x * 0.235, 0.26, -0.33], drape);
      s.box([0.46, 0.4, 0.025], [0, 0.26, -0.49], drape);
    } else if (a.hiding === 'flap') {
      const doorMat = s.material(new THREE.Color().setHSL(mix(0.52, 0.07, mood.warmth), 0.3, mix(0.5, 0.72, mood.cheer)), { roughness: 0.6 });
      const trim = s.material('#f1eee5', { roughness: 0.6 });
      const z = -0.2, w = 0.8, h = 1.15, ow = 0.34, oh = 0.6;
      for (const x of [-1, 1]) s.box([(w - ow) / 2, h, 0.045], [x * (ow / 2 + (w - ow) / 4), h / 2, z], doorMat);
      s.box([ow, h - oh, 0.045], [0, oh + (h - oh) / 2, z], doorMat);
      // Flap frame, the lifted flap resting on its back, a recessed panel and a kick plate.
      for (const x of [-1, 1]) s.box([0.03, oh + 0.03, 0.06], [x * (ow / 2 + 0.015), (oh + 0.03) / 2, z], trim);
      s.box([ow + 0.06, 0.03, 0.06], [0, oh + 0.015, z], trim);
      const flap = s.box([ow - 0.01, 0.3, 0.008], [0, oh - 0.07, z + 0.12], new THREE.MeshStandardMaterial({ color: '#5a6168', transparent: true, opacity: 0.55, roughness: 0.2 }));
      flap.rotation.x = 1.05;
      for (const x of [-1, 1]) s.box([0.17, 0.3, 0.012], [x * 0.285, 0.9, z + 0.026], s.material(new THREE.Color().setHSL(mix(0.52, 0.07, mood.warmth), 0.3, mix(0.44, 0.64, mood.cheer))));
      s.box([w, 0.12, 0.008], [0, 0.06, z + 0.027], steel).scale.x = 1;
      s.box([ow + 0.07, 0.125, 0.012], [0, 0.06, z + 0.027], doorMat);
      for (let i = 0; i < 3 + mood.wear * 8; i++) s.box([0.004, 0.03 + random() * 0.06, 0.003], [(random() < 0.5 ? -1 : 1) * (ow / 2 + 0.05 + random() * 0.08), 0.2 + random() * 0.3, z + 0.025], paint('#8f8a80'));
    } else if (a.hiding === 'blanket') {
      const wool = s.material(new THREE.Color().setHSL(mix(0.6, 0.04, mood.warmth), 0.4, mix(0.45, 0.66, mood.cheer)), { roughness: 1 });
      ball(s.root, wool, [0, 0.1, -0.33], [0.3, 0.2, 0.3]);
      ball(s.root, wool, [0.05, 0.16, -0.5], [0.16, 0.17, 0.15]);
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * (0.05 + (i / 6) * 0.9) + Math.PI;
        ball(s.root, wool, [Math.cos(ang) * 0.3 * (i % 2 ? 1 : 0.92), 0.02, -0.33 + Math.sin(ang) * -0.28 - 0.06], [0.09, 0.022, 0.08], [0, random() * 3, 0]);
      }
      for (const x of [-1, 1]) ball(s.root, wool, [x * 0.26, 0.03, -0.14], [0.1, 0.035, 0.1], [0, x * 0.4, 0]);
      const stripe = paint('#f3eedf', { roughness: 1 });
      for (let i = 0; i < 4; i++) arc(s.root, stripe, 0.3, 0.006, Math.PI, [0, 0.1, -0.5 + i * 0.1], [0, 0, 0]).scale.set(Math.sqrt(Math.max(0.05, 1 - ((-0.17 + i * 0.1) / 0.3) ** 2)) * 1.01, 0.68 * Math.sqrt(Math.max(0.05, 1 - ((-0.17 + i * 0.1) / 0.3) ** 2)), 1);
    } else {
      const shell = plastic, trim = s.material('#e9e6dc', { roughness: 0.6 });
      s.box([0.4, 0.24, 0.52], [0, 0.15, -0.42], trim);
      s.box([0.4, 0.24, 0.52], [0, 0.39, -0.42], shell);
      s.box([0.42, 0.03, 0.54], [0, 0.27, -0.42], s.material('#3a3d42'));
      s.box([0.36, 0.03, 0.1], [0, 0.03, -0.42], trim);
      for (const x of [-1, 1]) for (let i = 0; i < 5; i++) s.box([0.006, 0.09, 0.03], [x * 0.201, 0.4, -0.6 + i * 0.085], s.material('#2c2e33'));
      s.tube([[-0.07, 0.51, -0.42], [-0.06, 0.56, -0.42], [0.06, 0.56, -0.42], [0.07, 0.51, -0.42]], 0.012, s.material('#3a3d42'));
      // Door frame, and the wire door swung wide.
      for (const x of [-1, 1]) s.box([0.03, 0.4, 0.02], [x * 0.17, 0.27, -0.155], s.material('#3a3d42'));
      s.box([0.37, 0.03, 0.02], [0, 0.47, -0.155], s.material('#3a3d42'));
      const door = new THREE.Group();
      for (let i = 0; i <= 5; i++) cyl(door, steel, 0.004, 0.004, 0.36, [0.03 + i * 0.058, 0, 0], [0, 0, 0], 6);
      for (const y of [-0.18, 0, 0.18]) cyl(door, steel, 0.004, 0.004, 0.32, [0.175, y, 0], [0, 0, Math.PI / 2], 6);
      door.position.set(0.19, 0.27, -0.15); door.rotation.y = -1.9 - random() * 0.4;
      s.root.add(door);
      s.label('LIVE ANIMAL', 0.22, 0.05, [0.203, 0.15, -0.42], '#b23a2a', '#f4f1e6').rotation.y = Math.PI / 2;
    }

    // What the tail knocked over, lying inside its swing.
    const side = random() < 0.5 ? -1 : 1;
    const kx = side * (lying ? 0.42 : 0.4), kz = lying ? 0.3 : 0.22;
    if (a.knocked === 'treats') {
      const jar = new THREE.Group();
      const glass = new THREE.MeshPhysicalMaterial({ color: '#d9eef2', transparent: true, opacity: 0.32, roughness: 0.08, depthWrite: false });
      cyl(jar, glass, 0.055, 0.055, 0.14, [0, 0, 0], [0, 0, 0], 20).castShadow = false;
      arc(jar, paint('#cfe3e6', { roughness: 0.2 }), 0.055, 0.004, Math.PI * 2, [0, 0.07, 0], [Math.PI / 2, 0, 0]);
      arc(jar, paint('#cfe3e6', { roughness: 0.2 }), 0.055, 0.004, Math.PI * 2, [0, -0.07, 0], [Math.PI / 2, 0, 0]);
      cyl(jar, paint('#cfe3e6', { roughness: 0.2 }), 0.055, 0.055, 0.004, [0, -0.07, 0]);
      jar.rotation.set(0, random() * 3, Math.PI / 2); jar.position.set(kx, 0.057, kz);
      s.root.add(jar);
      cyl(s.root, steel, 0.058, 0.058, 0.015, [kx - side * 0.13, 0.0075, kz + 0.14], [0, 0, 0], 20);
      const n = 8 + Math.floor(random() * 5 + mood.density * 10);
      for (let i = 0; i < n; i++) {
        const bone = new THREE.Group();
        cyl(bone, paint('#b8834a'), 0.006, 0.006, 0.028, [0, 0, 0], [0, 0, Math.PI / 2], 6);
        for (const x of [-1, 1]) for (const z of [-1, 1]) ball(bone, paint('#b8834a'), [x * 0.015, 0, z * 0.006], [0.008, 0.007, 0.008], [0, 0, 0], 6);
        bone.position.set(kx + (random() - 0.5) * 0.24, 0.007, kz + 0.02 + random() * 0.2); bone.rotation.y = random() * 6;
        s.root.add(bone);
      }
    } else if (a.knocked === 'cup') {
      const cup = cyl(s.root, paint('#f2efe6', { roughness: 0.8 }), 0.042, 0.03, 0.1, [kx, 0.04, kz], [0, 0.6 + random(), Math.PI / 2 - 0.12], 18);
      cup.scale.set(1, 1, 1);
      const p = new THREE.Vector3(0, 0.03, 0).applyEuler(cup.rotation).add(cup.position);
      arc(s.root, paint('#8a5a3a'), 0.039, 0.005, Math.PI * 2, [p.x, p.y, p.z]).rotation.copy(cup.rotation).reorder('XYZ');
      const lidAt = new THREE.Vector3(0, 0.11, 0).applyEuler(cup.rotation).add(cup.position);
      ball(s.root, paint('#5b3a22', { roughness: 0.25 }), [lidAt.x, 0.003, lidAt.z], [0.11 + random() * 0.05, 0.003, 0.08 + random() * 0.04], [0, random() * 3, 0]);
      ball(s.root, paint('#5b3a22', { roughness: 0.25 }), [lidAt.x + side * 0.1, 0.003, lidAt.z + 0.06], [0.04, 0.003, 0.03]);
      cyl(s.root, paint('#2b2b2e'), 0.044, 0.044, 0.01, [kx - side * 0.12, 0.005, kz + 0.16], [0, 0, 0], 18);
    } else if (a.knocked === 'leaflets') {
      const n = 6 + Math.floor(random() * 4 + mood.density * 6);
      for (let i = 0; i < n; i++) {
        const hue = [0.55, 0.33, 0.08, 0.95][i % 4];
        const sheet = s.box([0.1, 0.002, 0.2], [kx + (random() - 0.5) * 0.12 + i * side * 0.012, 0.002 + i * 0.0022, kz + (random() - 0.5) * 0.1 + i * 0.012], paint(new THREE.Color().setHSL(hue, 0.45, 0.82)));
        sheet.rotation.y = (random() - 0.5) * 1.6;
        const head2 = s.box([0.08, 0.0022, 0.035], [0, 0, 0], paint(new THREE.Color().setHSL(hue, 0.6, 0.45)));
        sheet.add(head2); head2.position.set(0, 0.0004, -0.07); head2.rotation.set(0, 0, 0);
      }
    }

    const speed = { high: mix(7, 22, mood.energy), low: mix(1.2, 4, mood.energy), tucked: mix(18, 34, mood.energy), flag: mix(20, 30, mood.energy) }[signal];
    const wiggle = kind === 'stub' || signal === 'high' ? 0.06 * (0.4 + mood.energy) : 0;
    return s.finish({
      update: (_dt, time) => {
        const w = Math.sin(phase + time * speed);
        setSwing(pivot, w * amp);
        rump.rotation.y = w * wiggle;
      },
    });
  },
});
