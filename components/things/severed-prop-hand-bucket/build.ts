import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { painted, pick, taperTube } from './fx';

const TYPES = {
  human: 'Human hands in assorted skin tones.',
  clawed: 'Monster hands, knobbly and green with long dark claws.',
  webbed: 'Webbed lagoon-creature hands, teal with membranes between the fingers.',
  skeletal: 'Skeleton hands, thin jointed bones on twin forearm bones.',
  mixed: 'A mixed lot: human, clawed, webbed and skeleton all jumbled together.',
} as const;
type HandType = Exclude<keyof typeof TYPES, 'mixed'>;

const LABELS = { hands: 'HANDS', spares: 'SPARE PARTS', 'do-not-eat': 'DO NOT EAT', latex: 'LATEX', lefts: 'LEFTS ONLY', paint: 'BLOOD RED' } as const;

export default defineThing({
  questions: {
    fill: score('How many hands are in the bucket?', ['Three lonely hands', 'Half a dozen', 'A full bouquet', 'Crammed to bursting']),
    type: choice('What kind of hands are they?', TYPES),
    paint: choice('What state is the paint job in?', {
      bare: 'Bare unpainted rubber, all the same pale latex yellow.',
      painted: 'Fully painted in skin and creature colours.',
      bloody: 'Painted, with glossy stage blood on the stumps and running down the bucket.',
      glitter: 'A joke batch: hot pink, purple and gold glitter hands.',
    }),
    pose: choice('What is the tallest hand in the middle doing?', {
      waving: 'An open-palmed friendly wave.',
      rude: 'A single raised middle finger.',
      reaching: 'Clawing forward out of the bucket, reaching for you.',
      'thumbs-up': 'A cheerful thumbs up.',
      peace: 'A two-finger peace sign.',
      horns: 'Rock-and-roll devil horns.',
    }),
    label: choice('What is lettered on the bucket?', {
      hands: 'HANDS, stencilled plainly.',
      spares: 'SPARE PARTS.',
      'do-not-eat': 'DO NOT EAT, a workshop joke.',
      latex: 'LATEX, the original contents.',
      lefts: 'LEFTS ONLY.',
      paint: 'BLOOD RED, an old paint tin label.',
    }),
    bucket: choice('What kind of bucket is it?', {
      steel: 'A dented galvanised steel pail.',
      white: 'A white plastic paint tub with coloured drips.',
      orange: 'A bright orange hardware-store bucket.',
      black: 'A black rubber builders bucket.',
    }),
    escape: noul('Is one hand escaping, hooked over the rim as if climbing out?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = Math.round(mix(3, 12, a.fill));
    const latex = '#e3cf96';
    const skins = ['#e0ac8a', '#c68863', '#8d5a3c', '#f0c9a8', '#a9714d'];
    const glitters = ['#ff3fa4', '#9b4dff', '#ffc832', '#22d3c5'];
    const colourOf = (type: HandType) => {
      if (a.paint === 'bare') return latex;
      if (a.paint === 'glitter') return pick(glitters, random);
      return { human: pick(skins, random), clawed: pick(['#5f7a3a', '#6b7f4c', '#6b5a78'], random), webbed: pick(['#3f8f8a', '#4f9a6c'], random), skeletal: '#e8dfc4' }[type];
    };
    const skinMaterial = (colour: string) => s.material(colour, a.paint === 'glitter'
      ? { metalness: 0.65, roughness: 0.3, emissive: colour, emissiveIntensity: 0.25 }
      : { roughness: a.paint === 'bare' ? 0.5 : 0.62 });
    const clawMaterial = s.material(a.paint === 'bare' ? latex : '#2a241f', { roughness: 0.3 });
    const blood = s.material('#a40e18', { roughness: 0.12 });
    const bone = s.material('#efe8d2', { roughness: 0.7 });
    const nail = s.material('#f3e3d3', { roughness: 0.3 });

    const X = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
    type Curls = readonly [number, number, number, number, number];
    const makeHand = (type: HandType, curls: Curls, spread: number, forearm: number) => {
      const g = new THREE.Group();
      const material = skinMaterial(colourOf(type));
      const bony = type === 'skeletal';
      const thick = type === 'clawed' ? 1.25 : bony ? 0.55 : type === 'webbed' ? 1.05 : 1;
      const long = type === 'clawed' ? 1.15 : type === 'webbed' ? 1.2 : bony ? 1.05 : 1;
      const parts: THREE.BufferGeometry[] = [], claws: THREE.BufferGeometry[] = [], mids: THREE.Vector3[][] = [];
      const finger = (base: THREE.Vector3, len: number, lean: number, curl: number, r: number, forward = 0) => {
        const dir = new THREE.Vector3(Math.sin(lean), Math.cos(lean), forward).normalize();
        const axis = X.crossVectors(dir, Z).normalize().clone();
        const pts = [base.clone()];
        let at = base.clone();
        [0.45, 0.31, 0.24].forEach((part, i) => {
          dir.applyAxisAngle(axis, curl * (i === 0 ? 1.1 : 1.45) + (i > 0 ? 0.08 : 0));
          at = at.clone().addScaledVector(dir, len * part);
          pts.push(at);
        });
        parts.push(taperTube(pts, (t) => r * (bony ? 0.55 + 0.5 * Math.abs(Math.cos(t * Math.PI * 3)) ** 3 : 1 - t * 0.32 + (type === 'clawed' ? 0.22 * Math.abs(Math.sin(t * Math.PI * 3)) : 0)), 14, 7));
        const tip = new THREE.ConeGeometry(r * (type === 'clawed' ? 0.75 : 0.62), type === 'clawed' ? 0.03 : 0.007, 6);
        tip.translate(0, type === 'clawed' ? 0.013 : 0.001, 0);
        tip.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
        tip.translate(at.x, at.y, at.z);
        if (type === 'clawed' || type === 'human') claws.push(tip);
        mids.push(pts);
      };
      const xs = [0.031, 0.011, -0.01, -0.03], lens = [0.078, 0.088, 0.081, 0.062];
      for (let i = 0; i < 4; i++) finger(new THREE.Vector3(xs[i] * (bony ? 0.85 : 1), 0.088, 0), lens[i] * long, (xs[i] / 0.03) * spread, curls[i + 1], 0.0093 * thick);
      finger(new THREE.Vector3(0.04, 0.03, 0.004), 0.07 * long, 0.75 + spread * 0.5 - curls[0] * 0.5, curls[0] * 0.7, 0.0105 * thick, 0.25 + curls[0] * 0.8);
      const strip = (list: THREE.BufferGeometry[]) => list.map((geo) => { const n = geo.index ? geo.toNonIndexed() : geo; n.deleteAttribute('uv'); return n; });
      g.add(new THREE.Mesh(mergeGeometries(strip(parts)), material));
      if (claws.length) g.add(new THREE.Mesh(mergeGeometries(strip(claws)), type === 'clawed' ? clawMaterial : a.paint === 'painted' || a.paint === 'bloody' ? nail : material));
      const palm = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), material);
      palm.scale.set(bony ? 0.036 : 0.045 * (type === 'clawed' ? 1.1 : 1), 0.052, bony ? 0.007 : 0.017 * thick);
      palm.position.y = 0.045;
      g.add(palm);
      if (type === 'webbed') {
        const verts: number[] = [];
        for (let i = 0; i < 3; i++) {
          const p = mids[i], q = mids[i + 1];
          for (const [u, v, w] of [[p[0], p[2], q[2]], [p[0], q[2], q[0]]]) verts.push(u.x, u.y, u.z - 0.001, v.x, v.y, v.z, w.x, w.y, w.z);
        }
        const web = new THREE.BufferGeometry();
        web.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        web.computeVertexNormals();
        const webMaterial = material.clone(); webMaterial.side = THREE.DoubleSide; webMaterial.color.offsetHSL(0.03, 0, 0.12);
        g.add(new THREE.Mesh(web, webMaterial));
      }
      if (bony) {
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(taperTube([[side * 0.012, 0.01, 0], [side * 0.014, -forearm * 0.5, 0], [side * 0.011, -forearm, 0]], (t) => 0.0065 + 0.004 * Math.abs(Math.cos(t * Math.PI)) ** 4, 10, 7), material);
          g.add(arm);
        }
      } else {
        const arm = new THREE.Mesh(taperTube([[0, 0.02, 0], [0, -forearm * 0.3, 0], [0, -forearm * 0.75, -0.003], [0, -forearm, 0]], (t) => mix(0.025, 0.04, Math.sin(t * 2.2) ** 2) * (type === 'clawed' ? 1.15 : 1), 12, 10), material);
        arm.scale.z = 0.8;
        g.add(arm);
        // The cut end: a red disc and a nub of bone.
        const cut = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.006, 12), a.paint === 'bloody' ? blood : a.paint === 'painted' ? s.material('#8c2f2f') : material);
        cut.position.y = -forearm; cut.scale.z = 0.8; g.add(cut);
        const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.018, 8), a.paint === 'bare' || a.paint === 'glitter' ? material : bone);
        nub.position.y = -forearm - 0.008; g.add(nub);
        if (a.paint === 'bloody') {
          const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.03, 12), blood);
          cuff.position.y = -forearm + 0.016; cuff.scale.z = 0.82; g.add(cuff);
        }
      }
      g.traverse((o) => { o.castShadow = o.receiveShadow = true; });
      g.rotation.order = 'YXZ';
      return g;
    };

    // Bucket.
    const H = 0.3, R = 0.155, R0 = 0.125;
    const bucketColour = { steel: '#b4bbbd', white: '#f1efe8', orange: '#f26a1b', black: '#2b2b2e' }[a.bucket];
    const shell = s.material(bucketColour, a.bucket === 'steel' ? { metalness: 0.8, roughness: 0.4 } : { roughness: a.bucket === 'black' ? 0.85 : 0.45 });
    shell.side = THREE.DoubleSide;
    s.lathe([[0, 0.006], [R0, 0.006], [R0 + 0.002, 0], [R, H], [R + 0.006, H], [R + 0.006, H - 0.012], [R - 0.004, H - 0.012], [R0 - 0.004, 0.012], [0, 0.012]], shell);
    for (const y of [0.2, 0.235]) s.ring(mix(R0, R, y / H) + 0.002, 0.003, [0, y, 0], shell).rotation.x = Math.PI / 2;
    const wire = s.material('#8f9598', { metalness: 0.8, roughness: 0.35 });
    const bail: [number, number, number][] = [];
    const flop = 0.9 + random() * 0.5;
    for (let i = 0; i <= 12; i++) { const t = (i / 12) * Math.PI; bail.push([Math.cos(t) * (R + 0.012), H - 0.03 - Math.sin(t) * 0.17 * Math.cos(flop), Math.sin(t) * 0.17 * Math.sin(flop)]); }
    s.tube(bail, 0.0035, wire);
    for (const side of [-1, 1]) s.cylinder(0.012, 0.012, 0.008, [side * (R + 0.006), H - 0.03, 0], wire, 10).rotation.z = Math.PI / 2;
    s.cylinder(0.012, 0.012, 0.09, [0, H - 0.03 - 0.17 * Math.cos(flop), 0.17 * Math.sin(flop)], s.material('#b98d5a'), 10).rotation.z = Math.PI / 2;
    const text = LABELS[a.label];
    const tin = a.label === 'paint';
    const labelTexture = painted(512, 256, (ctx, w, h) => {
      ctx.fillStyle = tin ? '#b3141f' : a.bucket === 'white' || a.bucket === 'steel' ? '#f4ecd2' : '#fff7dc';
      ctx.fillRect(0, 0, w, h);
      if (tin) { ctx.fillStyle = '#f7e9b0'; ctx.fillRect(20, 30, w - 40, h - 60); ctx.fillStyle = '#b3141f'; ctx.fillRect(20, h - 78, w - 40, 26); }
      ctx.fillStyle = tin ? '#7a0c14' : '#1e1e22';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.min(120, 760 / text.length)}px monospace`;
      ctx.save(); ctx.translate(w / 2, h / 2 - (tin ? 18 : 0)); ctx.rotate(tin ? 0 : (random() - 0.5) * 0.08); ctx.fillText(text, 0, 0, w - 60); ctx.restore();
      for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = `rgba(90,70,50,${0.15 + random() * 0.25})`; ctx.fillRect(random() * w, random() * h, 4 + random() * 40, 2 + random() * 6); }
    });
    const ly = 0.115, lh = 0.11;
    const labelMesh = s.mesh(new THREE.CylinderGeometry(mix(R0, R, (ly + lh / 2) / H) + 0.0045, mix(R0, R, (ly - lh / 2) / H) + 0.0045, lh, 24, 1, true, -0.85, 1.7), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.8 }), [0, ly, 0]);
    labelMesh.castShadow = false;
    // Drips down the outside: blood, or old paint.
    const dripColours = a.paint === 'bloody' ? ['#a40e18'] : a.bucket === 'white' ? ['#3f8f5a', '#d9372c', '#7a4dbb', '#e8b02c'] : [];
    const drips = dripColours.length ? Math.round(mix(4, 11, mood.wear * 0.5 + mood.density * 0.5)) : 0;
    for (let i = 0; i < drips; i++) {
      const ang = random() * Math.PI * 2, len = 0.04 + random() * 0.14;
      const m = s.material(pick(dripColours, random), { roughness: 0.15 });
      const pts: [number, number, number][] = [0, 0.5, 1].map((t) => { const y = H + 0.004 - t * len, r = mix(R0, R, y / H) + 0.006; return [Math.sin(ang) * r, y, Math.cos(ang) * r]; });
      s.mesh(taperTube(pts, (t) => 0.004 + 0.004 * t * t, 8, 6), m);
    }
    s.cylinder(R - 0.02, R - 0.03, 0.01, [0, 0.12, 0], s.material('#3a322c'), 20);

    const kinds: HandType[] = ['human', 'clawed', 'webbed', 'skeletal'];
    const typeOf = (): HandType => (a.type === 'mixed' ? pick(kinds, random) : a.type);
    const relaxed = (): Curls => { const c = random() * 0.45; return [random() * 0.5, c + random() * 0.15, c + random() * 0.2, c + random() * 0.25, c + random() * 0.3]; };
    const swayers: { hand: THREE.Group; base: number; phase: number; amount: number }[] = [];

    // The bouquet.
    for (let i = 0; i < count - 1; i++) {
      const ring = i < 7 ? 0 : 1;
      const perRing = ring === 0 ? Math.min(count - 1, 7) : count - 8;
      const phi = ((ring === 0 ? i : i - 7) / perRing) * Math.PI * 2 + (random() - 0.5) * 0.5 + ring * 0.4;
      const lean = ring === 0 ? mix(0.3, 0.62, random()) : mix(0.1, 0.25, random());
      const hand = makeHand(typeOf(), relaxed(), 0.1 + random() * 0.25, 0.26 + random() * 0.06);
      const r = ring === 0 ? 0.075 : 0.035;
      hand.position.set(Math.sin(phi) * r, 0.28 + ring * 0.05 + random() * 0.05, Math.cos(phi) * r);
      hand.position.x += Math.sin(phi) * lean * 0.12; hand.position.z += Math.cos(phi) * lean * 0.12;
      hand.rotation.set(lean, phi + (random() - 0.5) * 0.8, (random() - 0.5) * 0.5);
      hand.scale.setScalar(0.92 + random() * 0.2);
      if (random() < 0.5) hand.scale.x *= -1;
      s.root.add(hand);
      swayers.push({ hand, base: hand.rotation.z, phase: random() * 6, amount: 0.02 });
    }
    // The hero hand.
    const pose: Record<typeof a.pose, Curls> = {
      waving: [0, 0, 0, 0, 0.02], rude: [0.9, 1, 0, 1, 1], reaching: [0.25, 0.42, 0.4, 0.42, 0.45],
      'thumbs-up': [0, 1, 1, 1, 1], peace: [1, 0, 0, 1, 1], horns: [1, 0, 1, 1, 0],
    };
    const heroType = typeOf();
    const hero = makeHand(heroType, pose[a.pose], a.pose === 'waving' ? 0.34 : a.pose === 'peace' ? 0.5 : a.pose === 'reaching' ? 0.3 : 0.08, 0.36);
    hero.scale.setScalar(1.25);
    hero.position.set(0, count > 7 ? 0.5 : 0.45, 0);
    hero.rotation.set(a.pose === 'reaching' ? 0.6 : -0.05, a.pose === 'thumbs-up' ? -0.5 : (random() - 0.5) * 0.3, a.pose === 'waving' ? 0.2 : a.pose === 'thumbs-up' ? 0.5 : 0);
    if (a.pose === 'reaching') hero.position.z = 0.05;
    s.root.add(hero);
    if (a.pose === 'waving') swayers.push({ hand: hero, base: 0, phase: 0, amount: 0.34 });

    if (a.escape) {
      const phi = 0.75 + random() * 0.5;
      const runaway = makeHand(typeOf(), [0.3, 0.5, 0.52, 0.5, 0.48], 0.3, 0.1);
      runaway.position.set(Math.sin(phi) * (R + 0.012), H + 0.012, Math.cos(phi) * (R + 0.012));
      runaway.rotation.set(1.75, phi, 0);
      runaway.position.x -= Math.sin(phi) * 0.05; runaway.position.z -= Math.cos(phi) * 0.05;
      s.root.add(runaway);
      swayers.push({ hand: runaway, base: 0, phase: 2, amount: 0.07 });
    }
    // Loose bits on the floor when the shop is crowded.
    if (mood.density > 0.55) {
      const fallen = makeHand(typeOf(), relaxed(), 0.2, 0.12);
      fallen.rotation.set(-Math.PI / 2 + 0.12, 2.4 + random(), 0);
      fallen.position.set(-0.24, 0.02, 0.14);
      s.root.add(fallen);
    }
    if (a.paint === 'glitter') {
      const specks = Array.from({ length: 50 }, () => { const ang = random() * 6.28, r = R + 0.01 + random() * 0.16; return { at: [Math.cos(ang) * r, 0.002, Math.sin(ang) * r] as [number, number, number], size: 0.003 + random() * 0.004, color: pick(glitters, random) }; });
      s.scatter(new THREE.OctahedronGeometry(1), new THREE.MeshStandardMaterial({ metalness: 0.8, roughness: 0.2, emissive: '#ffffff', emissiveIntensity: 0.15 }), specks);
    }

    const tempo = mix(0.6, 7, mood.energy);
    return s.finish({
      update: (_dt, time) => { for (const w of swayers) w.hand.rotation.z = w.base + Math.sin(time * tempo + w.phase) * w.amount * mix(0.4, 1.3, mood.energy); },
    });
  },
});
