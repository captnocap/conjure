import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { rippleTexture, sandGround, sandTone } from './sand';

type P3 = readonly [number, number, number];
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default defineThing({
  questions: {
    count: choice('How long is the file?', {
      three: 'Three camels: a family moving house.',
      five: 'Five camels, a modest train.',
      seven: 'Seven camels strung out along the crest.',
      long: 'A long caravan of nine or more, the way they used to be.',
    }),
    load: choice('What are the camels carrying?', {
      salt: 'Grey slabs of rock salt lashed upright in pairs, as on the old salt road.',
      bales: 'Hessian bales with rolled carpets across the top.',
      water: 'Dark goatskin waterbags and yellow jerrycans.',
      wood: 'Long bundles of firewood and tent poles.',
      tourists: 'Riders in bright jackets and sun hats: a trekking party.',
      empty: 'Nothing: bare saddles, the caravan coming home unladen.',
    }),
    leader: choice('Who leads them?', {
      walker: 'A robed man on foot with a staff, the lead rope over his shoulder.',
      rider: 'A rider on the first camel, turbaned, sitting very upright.',
      child: 'A child on foot, half the height of the camel behind.',
      pair: 'Two walkers, one leading and one bringing up the rear.',
      nobody: 'Nobody at all. The camels are walking on by themselves.',
    }),
    seen: choice('How are they seen?', {
      silhouette: 'As pure black silhouettes against the light, all detail gone.',
      dusty: 'In dusty natural colours, tan hides and faded cloth.',
      vivid: 'Vividly: indigo robes and bright red, orange and green saddle cloths.',
    }),
    crest: choice('What is the dune crest like under them?', {
      level: 'A long, nearly level knife edge in a gentle arc.',
      climbing: 'A ridge that climbs steadily toward a summit ahead of them.',
      winding: 'A crest that winds in an S, so the file bends back on itself.',
    }),
    story: choice('What is happening in the file?', {
      steady: 'Nothing. Every animal in step, as it has been for days.',
      straggler: 'The last camel has fallen far behind, its rope trailing.',
      calf: 'A leggy calf trots loose beside its mother.',
      couched: 'The last camel has knelt down in the sand and will not get up.',
      dropped: 'A load has slipped: bundles lie on the crest behind them.',
      dog: 'A lean pale dog trots along at the back.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = sandTone('#e2bd7e', mood.warmth);
    const count = { three: 3, five: 5, seven: 7, long: 9 + Math.round(random()) }[a.count];
    const SPACING = 3.15, L = count * SPACING + 11;
    const black = a.seen === 'silhouette';
    const inkMaterial = new THREE.MeshStandardMaterial({ color: '#201b1d', roughness: 1 });
    const tint = (colour: string, options: THREE.MeshStandardMaterialParameters = {}) => (black ? inkMaterial : s.material(colour, { roughness: 0.95, ...options }));
    const coats = ['#8f6c46', '#a8845a', '#6f5238', '#b89a6e'].map((c) => tint(c));
    const cloths = (a.seen === 'vivid' ? ['#c8322c', '#e08a1c', '#2a7a5a', '#7a2a8a', '#1f4fa8'] : ['#8a5a44', '#6f7a6a', '#9a8a6a', '#7a5a6a']).map((c) => tint(c));
    const robe = tint(a.seen === 'vivid' ? '#1f2f8a' : '#3a4660');
    const turban = tint(a.seen === 'vivid' ? '#f1ede2' : '#c9c2b0');
    const skin = tint('#6a4a36');
    const woodMaterial = tint('#6a4f38');
    const hessian = tint('#b89a66');
    const saltMaterial = tint('#c9c7c0');
    const hide = tint('#3a2a22');
    const yellow = tint('#e3b21f');
    const ropeMaterial = tint('#5a4634');

    // The crest: a curve in plan with a height along it.
    const phase = random() * 6.28, bulge = L * 0.09 * (random() < 0.5 ? -1 : 1);
    const Hc = mix(1.8, 2.5, random());
    const plan = (t: number) => {
      const x = L * (t - 0.5);
      const z = a.crest === 'winding' ? 2.7 * Math.sin(t * Math.PI * 2.4 + phase) : bulge * Math.sin(Math.PI * t);
      return [x, z] as const;
    };
    const rise = (t: number) => {
      const body = a.crest === 'climbing' ? mix(1.3, 3.5, t ** 1.2) : a.crest === 'winding' ? Hc * (1 + 0.22 * Math.sin(t * Math.PI * 2 + phase)) : Hc * (1 + 0.1 * Math.sin(t * Math.PI * 3 + phase));
      return body * smooth(0, 0.1, t) * smooth(1, 0.85, t);
    };
    const NT = 84, NW = 7, NS = 3;
    const frames = Array.from({ length: NT + 1 }, (_unused, i) => {
      const t = i / NT, [x, z] = plan(t), [x2, z2] = plan(Math.min(1, t + 0.004)), [x1, z1] = plan(Math.max(0, t - 0.004));
      const tx = x2 - x1, tz = z2 - z1, length = Math.hypot(tx, tz), h = rise(t);
      return { x, z, h, nx: -tz / length, nz: tx / length, ww: Math.min(h * 2.5, 5), sw: h * 1.54 };
    });
    const bounds = new THREE.Box2();
    for (const f of frames) { bounds.expandByPoint(new THREE.Vector2(f.x - f.nx * f.ww, f.z - f.nz * f.ww)); bounds.expandByPoint(new THREE.Vector2(f.x + f.nx * f.sw, f.z + f.nz * f.sw)); }
    const mid = bounds.getCenter(new THREE.Vector2()), size = bounds.getSize(new THREE.Vector2());
    for (const f of frames) { f.x -= mid.x; f.z -= mid.y; }
    const sheet = (cols: number, point: (f: (typeof frames)[number], k: number) => [number, number, number, number, number]) => {
      const positions: number[] = [], uvs: number[] = [], index: number[] = [];
      frames.forEach((f) => { for (let j = 0; j <= cols; j++) { const [x, y, z, u, v] = point(f, j / cols); positions.push(x, y, z); uvs.push(u, v); } });
      for (let i = 0; i < NT; i++) for (let j = 0; j < cols; j++) { const p = i * (cols + 1) + j, q = p + cols + 1; index.push(p, p + 1, q, q, p + 1, q + 1); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      return geometry;
    };
    const backMap = rippleTexture(random, sand, 0.9, 10);
    backMap.wrapS = backMap.wrapT = THREE.RepeatWrapping;
    s.mesh(sheet(NW, (f, k) => { const u = 1 - k; return [f.x - f.nx * f.ww * u, f.h * (1 - u) ** 1.25 - 0.03 * u, f.z - f.nz * f.ww * u, f.x / 6, (f.ww * u) / 6]; }), new THREE.MeshStandardMaterial({ map: backMap, bumpMap: backMap, bumpScale: 2, roughness: 1 }));
    s.mesh(sheet(NS, (f, k) => [f.x + f.nx * f.sw * k, f.h * (1 - k) - 0.03 * k, f.z + f.nz * f.sw * k, f.x / 6, k]), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.64).lerp(new THREE.Color('#6a5a66'), 0.14), roughness: 1 }));
    const ground = sandGround({ radius: size.y / 2 + 1.3, stretch: (size.x / 2 + 1.0) / (size.y / 2 + 1.3), colour: sand.clone().multiplyScalar(0.93), random, dome: 0.04, rows: 26, ripple: 0.7 });
    s.root.add(ground.mesh);

    // The walking line follows the crest.
    const line = new THREE.CatmullRomCurve3(frames.map((f) => new THREE.Vector3(f.x, f.h, f.z)));
    const total = line.getLength();
    const at = (distance: number) => {
      const u = Math.min(0.999, Math.max(0.001, distance / total));
      const p = line.getPointAt(u), tangent = line.getTangentAt(u);
      return { p, heading: Math.atan2(tangent.x, tangent.z), pitch: -Math.asin(Math.max(-0.5, Math.min(0.5, tangent.y))) };
    };

    /** Collapse a built figure into one mesh per material, so a long file stays cheap. */
    const bake = (group: THREE.Group) => {
      group.updateMatrixWorld(true);
      const byMaterial = new Map<THREE.Material, THREE.BufferGeometry[]>();
      group.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
        const material = mesh.material as THREE.Material;
        if (!byMaterial.has(material)) byMaterial.set(material, []);
        byMaterial.get(material)!.push(geometry);
        mesh.geometry.dispose();
      });
      const baked = new THREE.Group();
      for (const [material, parts] of byMaterial) {
        const mesh = new THREE.Mesh(mergeGeometries(parts)!, material);
        mesh.castShadow = mesh.receiveShadow = true;
        baked.add(mesh);
        for (const part of parts) part.dispose();
      }
      return baked;
    };

    const person = (g: THREE.Group, o: { x?: number; y?: number; z?: number; seated?: boolean; cloth: THREE.Material; head: THREE.Material; hat?: boolean; staff?: boolean; scale?: number }) => {
      const figure = new THREE.Group();
      const put = <T extends THREE.Object3D>(mesh: T) => { figure.add(mesh); return mesh; };
      const top = o.seated ? 0.62 : 1.4;
      if (o.seated) {
        put(s.cylinder(0.16, 0.22, 0.6, [0, 0.32, 0], o.cloth, 10));
        for (const side of [-1, 1]) put(s.rod([side * 0.14, 0.1, 0], [side * 0.34, -0.3, 0.42], 0.075, o.cloth, 0.055));
      } else {
        put(s.cylinder(0.16, 0.28, 1.32, [0, 0.72, 0], o.cloth, 10));
        for (const side of [-1, 1]) put(s.ball([0.07, 0.035, 0.12], [side * 0.1, 0.035, 0.05 + side * 0.12], skin, 8));
      }
      put(s.ball([0.21, 0.1, 0.14], [0, top - 0.02, 0], o.cloth, 10));
      put(s.ball([0.1, 0.115, 0.11], [0, top + 0.17, 0.01], skin, 10));
      if (o.hat) put(s.cylinder(0.26, 0.28, 0.03, [0, top + 0.26, 0], o.head, 14)), put(s.cylinder(0.1, 0.12, 0.1, [0, top + 0.31, 0], o.head, 10));
      else { put(s.ball([0.135, 0.11, 0.14], [0, top + 0.23, -0.005], o.head, 12)); put(s.ball([0.105, 0.07, 0.1], [0, top + 0.1, 0.03], o.head, 8)); }
      if (o.staff) {
        put(s.rod([0.2, top - 0.05, 0], [0.3, top - 0.42, 0.24], 0.045, o.cloth));
        put(s.rod([0.33, 0, 0.3], [0.29, top + 0.42, 0.2], 0.018, woodMaterial));
        put(s.rod([-0.2, top - 0.05, 0], [-0.24, top - 0.45, -0.18], 0.045, o.cloth));
      } else {
        put(s.rod([0.2, top - 0.05, 0], [0.2, top - 0.42, 0.2], 0.045, o.cloth));
        put(s.rod([-0.2, top - 0.05, 0], [-0.18, top - 0.42, 0.2], 0.045, o.cloth));
      }
      figure.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
      figure.scale.setScalar(o.scale ?? 1);
      g.add(figure);
    };

    const camel = (o: { coat: THREE.Material; cloth: THREE.Material; gait: number; couched?: boolean; load: typeof a.load | 'calf' | 'bare'; rider?: boolean }) => {
      const g = new THREE.Group();
      const put = <T extends THREE.Object3D>(mesh: T) => { g.add(mesh); return mesh; };
      const drop = o.couched ? -1.02 : 0;
      put(s.ball([0.37, 0.42, 0.86], [0, 1.55 + drop, 0], o.coat, 16));
      put(s.ball([0.3, 0.36, 0.44], [0, 1.98 + drop, -0.06], o.coat, 14));
      put(s.ball([0.33, 0.43, 0.4], [0, 1.5 + drop, 0.56], o.coat, 12));
      put(s.ball([0.34, 0.4, 0.4], [0, 1.54 + drop, -0.6], o.coat, 12));
      const reach = o.couched ? 0.3 : 0;
      put(s.tube([[0, 1.5 + drop, 0.75], [0, 1.42 + drop, 1.12], [0, 1.82 + drop + reach, 1.42], [0, 2.38 + drop + reach, 1.5]], 0.125, o.coat));
      const hy = 2.46 + drop + reach;
      put(s.ball([0.115, 0.125, 0.2], [0, hy, 1.6], o.coat, 10));
      put(s.ball([0.085, 0.085, 0.14], [0, hy - 0.05, 1.79], o.coat, 8));
      for (const side of [-1, 1]) put(s.ball([0.03, 0.055, 0.03], [side * 0.09, hy + 0.12, 1.5], o.coat, 6));
      put(s.rod([0, 1.62 + drop, -0.95], [0, 1.02 + drop, -1.06], 0.035, o.coat, 0.02));
      for (const side of [-1, 1]) for (const front of [1, -1]) {
        const z0 = front > 0 ? 0.56 : -0.62, x = side * 0.2;
        if (o.couched) {
          put(s.rod([x * 1.5, 0.3, z0], [x * 1.6, 0.12, z0 + front * 0.55], 0.085, o.coat, 0.07));
          put(s.rod([x * 1.6, 0.12, z0 + front * 0.55], [x * 1.5, 0.1, z0 + front * 0.05], 0.06, o.coat, 0.05));
          continue;
        }
        const swing = Math.sin(o.gait + (side > 0 ? 0 : Math.PI) + (front > 0 ? 0 : 0.5)) * 0.34;
        const knee: P3 = [x, 0.68, z0 + swing * 0.4 + (front > 0 ? 0.04 : -0.07)], footAt: P3 = [x, 0.05, z0 + swing];
        put(s.rod([x, 1.3, z0], knee, 0.085, o.coat, 0.055));
        put(s.rod(knee, footAt, 0.055, o.coat, 0.042));
        put(s.ball([0.085, 0.045, 0.11], [x, 0.045, z0 + swing + 0.03], o.coat, 8));
      }
      if (o.load !== 'calf') {
        put(s.ball([0.4, 0.2, 0.62], [0, 1.76 + drop, -0.05], o.cloth, 12));
        put(s.ball([0.33, 0.3, 0.44], [0, 2.03 + drop, -0.06], o.cloth, 12));
        for (const z of [0.36, -0.48]) { put(s.rod([-0.3, 1.9 + drop, z], [0.12, 2.42 + drop, z], 0.03, woodMaterial)); put(s.rod([0.3, 1.9 + drop, z], [-0.12, 2.42 + drop, z], 0.03, woodMaterial)); }
        put(s.rod([0, hy - 0.03, 1.6], [0, 2.0 + drop, 0.5], 0.012, ropeMaterial));
      }
      const y = 1.62 + drop;
      if (o.rider || o.load === 'tourists') {
        const jackets = ['#e2452c', '#2a8fd0', '#f0c22c', '#3aa86a', '#e06aa0'];
        person(g, { y: 2.3 + drop, z: -0.08, seated: true, cloth: o.rider ? robe : tint(jackets[Math.floor(random() * jackets.length)]), head: o.rider ? turban : tint('#e9e2cc'), hat: !o.rider });
        if (!o.rider) for (const side of [-1, 1]) put(s.box([0.14, 0.4, 0.5], [side * 0.47, y, -0.5], tint('#3a4a5a')));
      } else if (o.load === 'salt') {
        for (const side of [-1, 1]) for (let k = 0; k < 2; k++) put(s.box([0.075, 0.56, mix(0.9, 1.1, random())], [side * (0.47 + k * 0.1), y + 0.02, -0.05], saltMaterial)).rotation.z = side * -0.16;
        for (const z of [-0.35, 0.25]) put(s.ring(0.6, 0.014, [0, y + 0.05, z], ropeMaterial));
      } else if (o.load === 'bales') {
        for (const side of [-1, 1]) put(s.ball([0.27, 0.34, 0.5], [side * 0.56, y, -0.05], hessian, 10));
        const rug = put(s.cylinder(0.13, 0.13, 1.25, [0, 2.44 + drop, -0.08], cloths[Math.floor(random() * cloths.length)], 10));
        rug.rotation.z = Math.PI / 2;
        if (mood.density > 0.5) put(s.ball([0.2, 0.2, 0.2], [0.2, 2.5 + drop, -0.45], hessian, 8));
      } else if (o.load === 'water') {
        for (const side of [-1, 1]) {
          put(s.ball([0.2, 0.27, 0.36], [side * 0.52, y - 0.06, 0.18], hide, 10));
          if (side > 0 || mood.density > 0.4) put(s.box([0.18, 0.42, 0.3], [side * 0.5, y, -0.42], yellow));
          else put(s.ball([0.2, 0.25, 0.3], [side * 0.52, y - 0.04, -0.42], hide, 10));
        }
      } else if (o.load === 'wood') {
        for (const side of [-1, 1]) {
          const bundle = put(s.cylinder(0.2, 0.22, 1.7, [side * 0.55, y + 0.08, -0.15], woodMaterial, 8));
          bundle.rotation.x = Math.PI / 2 - 0.12;
          for (let k = 0; k < 5; k++) put(s.rod([side * (0.45 + random() * 0.2), y + 0.2 + random() * 0.2, 0.5], [side * (0.45 + random() * 0.25), y - 0.1 + random() * 0.3, mix(1.0, 1.5, random())], 0.02, woodMaterial));
        }
      }
      return bake(g);
    };

    // Place the file. The front of the line is toward +x.
    const front = total * 0.87 - 1.2 - (a.leader === 'nobody' || a.leader === 'rider' ? 0 : 1.6);
    const walkers: { holder: THREE.Group; baseY: number; phase: number }[] = [];
    const stand = (figure: THREE.Group, distance: number, side = 0, sink = 0.07) => {
      const { p, heading, pitch } = at(distance);
      const holder = new THREE.Group();
      holder.add(figure);
      holder.position.set(p.x + Math.cos(heading) * side, p.y - sink - Math.abs(side) * 0.3, p.z - Math.sin(heading) * side);
      holder.rotation.set(pitch, heading, 0, 'YXZ');
      s.root.add(holder);
      return holder;
    };
    const ropes: THREE.BufferGeometry[] = [];
    const tie = (from: THREE.Vector3, to: THREE.Vector3, sag: number) => {
      const curve = new THREE.CatmullRomCurve3([from, from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, -sag, 0)), to]);
      ropes.push(new THREE.TubeGeometry(curve, 8, 0.014, 4).toNonIndexed());
    };
    let previousTail: THREE.Vector3 | null = null;
    let lastDistance = front;
    for (let i = 0; i < count; i++) {
      const last = i === count - 1;
      const straggle = last && a.story === 'straggler' ? SPACING * 1.7 : 0;
      const distance = front - i * SPACING - straggle;
      const couched = last && a.story === 'couched';
      const figure = camel({ coat: coats[Math.floor(random() * coats.length)], cloth: cloths[i % cloths.length], gait: random() * 6.28, couched, load: last && a.story === 'dropped' ? 'bare' : a.load, rider: i === 0 && a.leader === 'rider' });
      figure.scale.setScalar(mix(0.92, 1.06, random()));
      const holder = stand(figure, distance);
      if (!couched) walkers.push({ holder, baseY: holder.position.y, phase: random() * 6.28 });
      holder.updateMatrixWorld(true);
      const head = holder.localToWorld(new THREE.Vector3(0, couched ? 1.7 : 2.4, 1.75));
      const tail = holder.localToWorld(new THREE.Vector3(0, 1.75, -0.9));
      if (previousTail && !straggle) tie(previousTail, head, couched ? 0.1 : 0.35);
      else if (previousTail && straggle) tie(head, at(distance + 2.2).p.clone().add(new THREE.Vector3(0, 0.03, 0)), 0.5);
      previousTail = tail;
      lastDistance = distance;
      if (i === 0 && (a.leader === 'walker' || a.leader === 'child' || a.leader === 'pair')) {
        const guide = new THREE.Group();
        person(guide, { cloth: robe, head: turban, staff: true, scale: a.leader === 'child' ? 0.66 : 1 });
        const lead = stand(bake(guide), distance + 3.3, 0, 0.04);
        walkers.push({ holder: lead, baseY: lead.position.y, phase: random() * 6.28 });
        lead.updateMatrixWorld(true);
        tie(lead.localToWorld(new THREE.Vector3(-0.24, a.leader === 'child' ? 0.65 : 0.95, -0.18)), head, 0.3);
      }
      if (i === 1 && a.story === 'calf') {
        const calf = camel({ coat: coats[3], cloth: cloths[0], gait: random() * 6.28, load: 'calf' });
        calf.scale.setScalar(0.55);
        const young = stand(calf, distance + 0.6, -1.1, 0.03);
        walkers.push({ holder: young, baseY: young.position.y, phase: random() * 6.28 });
      }
    }
    if (a.leader === 'pair') {
      const guard = new THREE.Group();
      person(guard, { cloth: tint(a.seen === 'vivid' ? '#e9e2cc' : '#8a8272'), head: turban, staff: true });
      const rear = stand(bake(guard), lastDistance - 2.4, 0, 0.04);
      walkers.push({ holder: rear, baseY: rear.position.y, phase: random() * 6.28 });
    }
    if (a.story === 'dog') {
      const dog = new THREE.Group();
      const fur = tint('#d9c7a2');
      dog.add(s.ball([0.11, 0.13, 0.36], [0, 0.5, 0], fur, 10), s.ball([0.07, 0.07, 0.13], [0, 0.66, 0.42], fur, 8), s.rod([0, 0.55, 0.3], [0, 0.64, 0.4], 0.05, fur), s.rod([0, 0.55, -0.33], [0, 0.42, -0.62], 0.02, fur, 0.01));
      for (const [x, z, swing] of [[0.07, 0.25, 0.12], [-0.07, 0.25, -0.1], [0.07, -0.25, -0.12], [-0.07, -0.25, 0.1]]) dog.add(s.rod([x, 0.45, z], [x, 0, z + swing], 0.028, fur, 0.018));
      const hound = stand(bake(dog), lastDistance - 2.3, 0.15, 0.02);
      walkers.push({ holder: hound, baseY: hound.position.y, phase: random() * 6.28 });
    }
    if (a.story === 'dropped') {
      for (let i = 0; i < 5; i++) {
        const { p, heading } = at(lastDistance - 1.6 - i * 0.9 - random() * 0.4);
        const side = (random() - 0.5) * 1.6;
        const bundle = a.load === 'salt' ? s.box([0.56, 0.08, 1.0], [0, 0, 0], saltMaterial) : a.load === 'water' ? s.box([0.3, 0.2, 0.42], [0, 0, 0], yellow) : a.load === 'wood' ? s.cylinder(0.14, 0.16, 1.4, [0, 0, 0], woodMaterial, 8).rotateX(Math.PI / 2) : s.ball([0.3, 0.2, 0.42], [0, 0, 0], hessian, 10);
        bundle.position.set(p.x + Math.cos(heading) * side, p.y - Math.abs(side) * 0.32 + 0.08, p.z - Math.sin(heading) * side);
        bundle.rotation.y = random() * 3;
      }
    }
    if (ropes.length) {
      const strings = new THREE.Mesh(mergeGeometries(ropes)!, ropeMaterial);
      strings.castShadow = true;
      s.root.add(strings);
      for (const rope of ropes) rope.dispose();
    }
    // Footprints along the crest behind the leader.
    const prints: { at: P3; size: number }[] = [];
    for (let d = total * 0.1; d < front + 2; d += 0.42) {
      const { p, heading } = at(d), side = (Math.round(d / 0.42) % 2 ? 1 : -1) * 0.2 + (random() - 0.5) * 0.08;
      prints.push({ at: [p.x + Math.cos(heading) * side, p.y - Math.abs(side) * 0.32 - 0.02, p.z - Math.sin(heading) * side], size: 0.1 });
    }
    s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.5), roughness: 1 }), prints).castShadow = false;
    // Dust kicked up when the pace is quick.
    if (mood.energy > 0.45) {
      const dust = new THREE.MeshStandardMaterial({ color: sand.clone().lerp(new THREE.Color('#fff4dc'), 0.3), transparent: true, opacity: 0.28 * mood.energy, depthWrite: false, roughness: 1 });
      for (const walker of walkers) {
        const puff = s.ball([0.9, 0.35, 0.6], [walker.holder.position.x - 0.8, walker.holder.position.y + 0.25, walker.holder.position.z + 0.2], dust, 10);
        puff.castShadow = false;
      }
    }

    const pace = mix(1.2, 4.2, mood.energy);
    return s.finish({
      footprint: Math.max(size.x, size.y) * 0.5,
      update: (_dt, time) => {
        for (const walker of walkers) {
          walker.holder.position.y = walker.baseY + Math.abs(Math.sin(time * pace + walker.phase)) * 0.035;
          walker.holder.rotation.z = Math.sin(time * pace + walker.phase) * 0.018;
        }
      },
    });
  },
});
