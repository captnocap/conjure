import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];
const COATS = { red: '#9a5a33', grey: '#7d7062', white: '#e4dccb', dark: '#4d3628', dun: '#b08a58' } as const;

export default defineThing({
  questions: {
    pose: choice('What is the stag doing?', {
      watching: 'Standing square and still with its head high, watching.',
      grazing: 'Head down, cropping the weeds that grow through the cracks.',
      'mid-step': 'Caught mid-step, one foreleg lifted, crossing without hurry.',
      bellowing: 'Neck stretched and muzzle raised, roaring at the empty air.',
    }),
    gaze: choice('Where is its head turned?', {
      viewer: 'Turned to look straight at you.',
      'over-shoulder': 'Turned far round, looking back over its shoulder at something behind.',
      ahead: 'Straight ahead down the road, ignoring you.',
    }),
    antlers: choice('What are its antlers like?', {
      royal: 'A wide twelve-point crown, a monarch in his prime.',
      young: 'Short simple forks, a young stag not yet sure of himself.',
      broken: 'One full antler and one snapped off to a stump in a fight.',
      velvet: 'Thick, blunt and furred in summer velvet.',
      huge: 'An impossibly vast many-branched rack, almost a bare tree: a stag out of myth.',
    }),
    tangled: choice('What is tangled in its antlers?', {
      nothing: 'Nothing: clean bone.',
      tape: 'Yellow and black hazard tape, trailing.',
      vines: 'A torn garland of ivy and leaves.',
      lights: 'A string of small coloured lights, somehow still lit.',
      bunting: 'A line of faded triangular party flags.',
      vest: 'A fluorescent orange safety vest hanging from one side.',
    }),
    coat: choice('What colour is its coat?', {
      red: 'Summer red-brown with a pale rump.',
      grey: 'Thick grey-brown winter coat.',
      white: 'A white hart, pale as a ghost.',
      dark: 'Nearly black, wet with rain or mud.',
      dun: 'Sandy dun, dry-country pale.',
    }),
    build: score('How big and heavy is it?', ['A lean, rangy animal with ribs showing', 'An ordinary healthy stag', 'A huge thick-necked monarch']),
    birds: noul('Are small birds riding on its back?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = new THREE.Color(COATS[a.coat]);
    if (a.coat !== 'white') base.lerp(new THREE.Color(mood.warmth > 0.5 ? '#b5622c' : '#6d6a6a'), Math.abs(mood.warmth - 0.5) * 0.3);
    const fur = new THREE.MeshStandardMaterial({ color: base, roughness: 0.92 });
    const pale = new THREE.MeshStandardMaterial({ color: base.clone().lerp(new THREE.Color('#eadfc6'), 0.6), roughness: 0.95 });
    const shade = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(a.coat === 'white' ? 0.8 : 0.58), roughness: 0.95 });
    const black = new THREE.MeshStandardMaterial({ color: '#17130f', roughness: 0.5 });
    const velvet = a.antlers === 'velvet';
    const bone = new THREE.MeshStandardMaterial({ color: velvet ? '#6e4a34' : '#d2bd98', roughness: velvet ? 1 : 0.6 });
    const boneTip = new THREE.MeshStandardMaterial({ color: velvet ? '#7d573e' : '#efe6d0', roughness: 0.6 });

    const girth = mix(0.84, 1.2, a.build);
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, mesh: T) => { group.add(mesh); return mesh; };
    const body = new THREE.Group();
    s.root.add(body);
    const ball = (g: THREE.Object3D, size: P, at: P, mat: THREE.Material, seg = 18) => into(g, s.ball(size, at, mat, seg));
    const rod = (g: THREE.Object3D, from: P, to: P, r0: number, r1: number, mat: THREE.Material) => into(g, s.rod(from, to, r0, mat, r1));
    /** A chain of tapered segments with rounded joints. */
    const limb = (g: THREE.Object3D, pts: P[], radii: number[], mat: THREE.Material) => {
      for (let i = 0; i < pts.length - 1; i++) {
        rod(g, pts[i], pts[i + 1], radii[i], radii[i + 1], mat);
        ball(g, [radii[i], radii[i], radii[i]], pts[i], mat, 10);
      }
    };

    // Torso: barrel, deep chest, haunch, belly line and the pale rump patch.
    ball(body, [0.27 * girth, 0.3 * girth, 0.72], [0, 1.13, 0], fur);
    ball(body, [0.28 * girth, 0.36 * girth, 0.36], [0, 1.1, 0.42], fur);
    ball(body, [0.29 * girth, 0.34 * girth, 0.38], [0, 1.15, -0.46], fur);
    ball(body, [0.2 * girth, 0.16, 0.55], [0, 0.93 - (girth - 1) * 0.1, 0.02], pale);
    ball(body, [0.19 * girth, 0.2, 0.09], [0, 1.2, -0.765], pale);
    ball(body, [0.1 * girth, 0.1, 0.56], [0, 1.13 + 0.3 * girth - 0.088, 0], shade); // dorsal stripe
    rod(body, [0, 1.28, -0.84], [0, 1.08, -0.93], 0.04, 0.022, pale);
    if (a.build < 0.25) for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) {
      const rib = ball(body, [0.012, 0.16, 0.02], [sx * 0.262 * girth, 1.1, 0.26 - i * 0.12], shade, 8);
      rib.rotation.x = 0.25;
    }

    // Legs.
    const step = a.pose === 'mid-step';
    const lean = a.pose === 'bellowing' ? 0.05 : 0;
    const j = () => (random() - 0.5) * 0.04;
    const foreLeg = (sx: number, lifted: boolean, reach: number) => {
      const x = sx * 0.15 * girth;
      const top: P = [x, 1.02, 0.5];
      const pts: P[] = lifted
        ? [top, [x, 0.66, 0.74], [x, 0.4, 0.6], [x, 0.3, 0.63]]
        : [top, [x, 0.56, 0.52 + reach * 0.5 + j()], [x, 0.11, 0.5 + reach + j()], [x, 0.03, 0.53 + reach]];
      limb(body, pts.slice(0, 3), [0.09 * girth, 0.056, 0.04], fur);
      ball(body, [0.058, 0.07, 0.058], pts[1], fur, 10);
      const hoof = into(body, s.cylinder(0.034, 0.048, 0.085, [pts[3][0], pts[3][1] + 0.012, pts[3][2]], black, 10));
      if (lifted) hoof.rotation.x = 0.9;
      ball(body, [0.1 * girth, 0.2, 0.13], [x, 1.02, 0.5], fur, 12);
    };
    const hindLeg = (sx: number, reach: number) => {
      const x = sx * 0.16 * girth;
      const pts: P[] = [[x, 1.08, -0.52], [x, 0.8, -0.42 + reach * 0.3], [x, 0.52, -0.74 + reach * 0.8 + j()], [x, 0.11, -0.64 + reach + j()], [x, 0.03, -0.61 + reach]];
      limb(body, pts.slice(0, 4), [0.12 * girth, 0.09 * girth, 0.052, 0.038], fur);
      ball(body, [0.05, 0.065, 0.06], pts[2], fur, 10);
      into(body, s.cylinder(0.034, 0.048, 0.085, [pts[4][0], 0.042, pts[4][2]], black, 10));
      ball(body, [0.13 * girth, 0.26, 0.2], [x * 0.95, 1.08, -0.5], fur, 12);
    };
    foreLeg(-1, step, 0);
    foreLeg(1, false, step ? -0.14 : a.pose === 'grazing' ? 0.12 : lean);
    hindLeg(-1, step ? -0.2 : 0);
    hindLeg(1, step ? 0.18 : 0.03);

    // Neck and head.
    const yaw = { viewer: 0.8, 'over-shoulder': 2.0, ahead: 0.05 }[a.gaze] + (random() - 0.5) * 0.15;
    const grazing = a.pose === 'grazing';
    const bellow = a.pose === 'bellowing';
    const root: P = [0, 1.26, 0.66];
    const turn = grazing ? yaw * 0.25 : yaw;
    const side = Math.sin(turn * 0.5);
    const poll: P = grazing ? [side * 0.2, 0.4, 1.3] : bellow ? [side * 0.2, 1.74, 1.16] : [side * 0.24, step ? 1.76 : 1.84, 1.02 - Math.abs(side) * 0.16];
    const midNeck: P = grazing ? [side * 0.08, 0.92, 1.08] : [side * 0.1, 1.54, bellow ? 0.98 : 0.9];
    const nk = mix(0.9, 1.3, a.build);
    limb(body, [root, midNeck, poll], [0.2 * nk, 0.15 * nk, 0.1], fur);
    ball(body, [0.19 * nk, 0.26 * nk, 0.2], [0, 1.2, 0.68], fur, 14);
    // Winter ruff / mane under the throat.
    if (!grazing) ball(body, [0.12 * nk, 0.28, 0.12 * nk], [midNeck[0] * 0.8, midNeck[1] - 0.14, midNeck[2] + 0.07], shade, 12).rotation.x = -0.5;

    const head = new THREE.Group();
    head.position.set(...poll);
    head.rotation.order = 'YXZ';
    head.rotation.y = turn;
    head.rotation.x = grazing ? 1.15 : bellow ? -0.75 : 0.22;
    head.scale.setScalar(1.22);
    body.add(head);
    ball(head, [0.095, 0.105, 0.14], [0, 0, 0.07], fur, 16);
    rod(head, [0, -0.015, 0.13], [0, -0.05, 0.36], 0.075, 0.046, fur);
    ball(head, [0.05, 0.042, 0.04], [0, -0.05, 0.37], pale, 10);
    ball(head, [0.036, 0.03, 0.026], [0, -0.04, 0.4], black, 10);
    const jaw = rod(head, [0, -0.07, 0.1], bellow ? [0, -0.2, 0.3] : [0, -0.09, 0.34], 0.05, 0.03, bellow ? shade : pale);
    void jaw;
    if (bellow) ball(head, [0.03, 0.02, 0.09], [0, -0.1, 0.24], new THREE.MeshStandardMaterial({ color: '#b5565a', roughness: 0.6 }), 8);
    for (const sx of [-1, 1]) {
      ball(head, [0.02, 0.022, 0.022], [sx * 0.083, 0.03, 0.13], black, 10);
      const ear = into(head, s.mesh(new THREE.ConeGeometry(0.05, 0.19, 8), fur, [sx * 0.15, 0.08, -0.02]));
      ear.scale.z = 0.45;
      ear.rotation.z = -sx * (bellow ? 1.5 : 1.05);
      ear.rotation.y = sx * 0.3;
      const inner = into(head, s.mesh(new THREE.ConeGeometry(0.03, 0.14, 6), pale, [sx * 0.15, 0.08, 0.0]));
      inner.scale.z = 0.3; inner.rotation.z = ear.rotation.z; inner.rotation.y = ear.rotation.y;
    }

    // Antlers. Built in head space so anything hung on them follows the head.
    const k = { royal: 0.72, young: 0.42, broken: 0.7, velvet: 0.6, huge: 0.82 }[a.antlers] * mix(0.9, 1.1, a.build);
    const thick = (velvet ? 0.034 : a.antlers === 'huge' ? 0.03 : 0.025) * mix(0.9, 1.15, a.build);
    const tips: THREE.Vector3[] = [];
    const tine = (from: THREE.Vector3, to: THREE.Vector3, r: number) => {
      rod(head, from.toArray() as P, to.toArray() as P, r, velvet ? r * 0.8 : r * 0.25, bone);
      if (velvet) ball(head, [r * 0.95, r * 0.95, r * 0.95], to.toArray() as P, boneTip, 8);
      else ball(head, [r * 0.3, r * 0.3, r * 0.3], to.toArray() as P, boneTip, 6);
      tips.push(to);
    };
    const antler = (sx: number, stump: boolean) => {
      const v = (x: number, y: number, z: number) => new THREE.Vector3(sx * (0.055 + x * k), 0.09 + y * k, 0.02 + z * k);
      const w = () => (random() - 0.5) * 0.05;
      const pts = [v(0, 0, 0), v(0.2 + w(), 0.22, -0.1), v(0.44 + w(), 0.46, -0.16 + w()), v(0.54 + w(), 0.74, -0.06 + w()), v(0.44 + w(), 0.96, 0.1)];
      ball(head, [thick * 1.5, thick * 0.8, thick * 1.5], pts[0].toArray() as P, bone, 10); // burr
      if (stump) {
        tine(pts[0], pts[0].clone().lerp(pts[1], 0.75), thick);
        tips.pop();
        tine(pts[0].clone().lerp(pts[1], 0.15), v(0.08, 0.1, 0.24), thick * 0.8);
        return;
      }
      const palm = false, huge = a.antlers === 'huge';
      const beamPts = a.antlers === 'young' ? pts.slice(0, 4) : palm ? pts.slice(0, 3) : pts;
      const curve = new THREE.CatmullRomCurve3(beamPts);
      into(head, s.mesh(new THREE.TubeGeometry(curve, 20, thick, 7), bone));
      const end = beamPts[beamPts.length - 1];
      const at = (t: number) => curve.getPoint(t);
      tine(at(0.06), v(0.06, 0.12, 0.3), thick * 0.85); // brow tine
      if (a.antlers === 'young') {
        tine(at(0.9), v(0.4, 0.92, -0.2), thick * 0.8);
        tine(at(0.9), v(0.3, 1.0, 0.05), thick * 0.8);
        return;
      }
      tine(at(palm ? 0.5 : 0.3), v(0.24, 0.42, 0.2), thick * 0.8); // bez
      if (palm) {
        const plate = ball(head, [0.05, 0.3 * k, 0.17 * k], v(0.36, 0.76, -0.12).toArray() as P, bone, 12);
        plate.rotation.z = -sx * 0.35; plate.rotation.y = sx * 0.5;
        for (let i = 0; i < 5; i++) tine(v(0.36 + i * 0.012, 0.72 + i * 0.06, -0.2 + i * 0.05), v(0.42 + i * 0.02 + w(), 0.86 + i * 0.09, -0.4 + i * 0.16), thick * 0.75);
        return;
      }
      tine(at(0.55), v(0.56, 0.7, 0.2 + w()), thick * 0.8); // trez
      tine(at(0.8), v(0.72 + w(), 0.98, -0.2), thick * 0.8);
      tine(at(0.92), v(0.56 + w(), 1.18, -0.06), thick * 0.75);
      tine(end, v(0.32, 1.16 + w(), 0.22), thick * 0.75);
      if (huge) {
        for (let i = 0; i < 6; i++) { const t0 = 0.25 + i * 0.13; const from = at(t0); tine(from, from.clone().add(new THREE.Vector3(sx * (0.12 + random() * 0.2) * k, (0.22 + random() * 0.2) * k, (random() - 0.5) * 0.5 * k)), thick * 0.7); }
        const fork = v(0.72, 0.98, -0.2);
        tine(fork.clone().lerp(at(0.8), 0.4), v(0.86, 0.86, -0.34), thick * 0.6);
        tine(fork.clone().lerp(at(0.8), 0.3), v(0.84, 1.2, -0.1), thick * 0.6);
      }
      tips.push(end);
    };
    const brokenSide = random() < 0.5 ? -1 : 1;
    const highTips: THREE.Vector3[][] = [];
    for (const sx of [-1, 1]) {
      const before = tips.length;
      antler(sx, a.antlers === 'broken' && sx === brokenSide);
      highTips.push(tips.slice(before).sort((p, q) => q.y - p.y));
    }

    // Whatever the road left in the antlers.
    const swing: THREE.Object3D[] = [];
    const top = (sideIndex: number, n = 0) => (highTips[sideIndex][Math.min(n, highTips[sideIndex].length - 1)] ?? new THREE.Vector3(0, 0.3, 0)).clone();
    const full = a.antlers === 'broken' ? (brokenSide === -1 ? 1 : 0) : 0;
    const A = top(full, 1), B = a.antlers === 'broken' ? top(full, 3) : top(1 - full, 1);
    const sagLine = (from: THREE.Vector3, to: THREE.Vector3, sag: number, forward = 0.06) => {
      const mid = from.clone().add(to).multiplyScalar(0.5); mid.y -= sag; mid.z += forward;
      return new THREE.CatmullRomCurve3([from, from.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -sag * 0.35, 0)), mid, to.clone().lerp(mid, 0.5).add(new THREE.Vector3(0, -sag * 0.35, 0)), to]);
    };
    const hang = (at: THREE.Vector3, build: (g: THREE.Group) => void) => { const g = new THREE.Group(); g.position.copy(at); build(g); head.add(g); swing.push(g); return g; };
    if (a.tangled === 'tape') {
      const yellow = new THREE.MeshStandardMaterial({ color: '#f2c81f', roughness: 0.6, side: THREE.DoubleSide });
      const stripe = new THREE.MeshStandardMaterial({ color: '#191919', roughness: 0.6, side: THREE.DoubleSide });
      const curve = sagLine(A, B, 0.26);
      for (let i = 0; i < 26; i++) {
        const p = curve.getPoint((i + 0.5) / 26), q = curve.getPoint((i + 1) / 26);
        const seg = into(head, s.box([0.012, 0.075, p.distanceTo(q) * 2.1], p.toArray() as P, i % 3 === 0 ? stripe : yellow));
        seg.lookAt(q);
      }
      for (const [at, len] of [[A, 0.9], [B, 0.5]] as const) hang(at, (g) => {
        for (let i = 0; i < 8; i++) { const seg = new THREE.Mesh(new THREE.BoxGeometry(0.075, len / 8, 0.01), i % 3 === 0 ? stripe : yellow); seg.position.set(Math.sin(i * 0.9) * 0.025, -len / 16 - (i * len) / 8, 0); seg.rotation.y = i * 0.35; seg.castShadow = true; g.add(seg); }
      });
    } else if (a.tangled === 'vines') {
      const green = new THREE.MeshStandardMaterial({ color: '#4f7a34', roughness: 0.9 });
      const curve = sagLine(A, B, 0.2);
      into(head, s.mesh(new THREE.TubeGeometry(curve, 24, 0.012, 5), new THREE.MeshStandardMaterial({ color: '#5a4a30', roughness: 1 })));
      const leaves: { at: P; size: number; color: string }[] = [];
      const addLeaves = (p: THREE.Vector3, n: number, spread: number) => { for (let i = 0; i < n; i++) leaves.push({ at: [p.x + (random() - 0.5) * spread, p.y + (random() - 0.5) * spread, p.z + (random() - 0.5) * spread], size: 0.03 + random() * 0.03, color: ['#4f7a34', '#3f6a2c', '#6d9440', '#8a9a3a'][Math.floor(random() * 4)] }); };
      for (let i = 0; i <= 14; i++) addLeaves(curve.getPoint(i / 14), 4, 0.12);
      for (const t of tips) if (random() < 0.5) addLeaves(t, 3, 0.1);
      const geo = new THREE.OctahedronGeometry(1, 0); geo.scale(1, 0.35, 1.3);
      into(head, s.scatter(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), leaves));
      for (const at of [A, curve.getPoint(0.4), B]) hang(at, (g) => {
        const len = 0.3 + random() * 0.5;
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, len, 5), green); strand.position.y = -len / 2; g.add(strand);
        for (let i = 0; i < 5; i++) { const leaf = new THREE.Mesh(geo, green); leaf.scale.setScalar(0.04); leaf.position.set((random() - 0.5) * 0.06, -len * (i + 1) / 5, (random() - 0.5) * 0.06); leaf.rotation.set(random() * 3, random() * 3, 0); leaf.castShadow = true; g.add(leaf); }
      });
    } else if (a.tangled === 'lights') {
      const wire = new THREE.MeshStandardMaterial({ color: '#1f3324', roughness: 0.8 });
      const colours = ['#ff4a3a', '#ffd23a', '#3ad27a', '#3a8cff', '#ff7ad2'];
      const runs = [sagLine(A, B, 0.22), sagLine(top(full, 0), top(a.antlers === 'broken' ? full : 1 - full, 2), 0.36, 0.12)];
      const bulbs = new THREE.Group();
      runs.forEach((curve, r) => {
        into(head, s.mesh(new THREE.TubeGeometry(curve, 24, 0.006, 5), wire));
        for (let i = 0; i < 12; i++) {
          const c = colours[(i + r * 2) % 5];
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: mix(0.9, 2.4, mood.cheer), roughness: 0.4 }));
          bulb.position.copy(curve.getPoint((i + 0.5) / 12)); bulb.position.y -= 0.022; bulb.scale.y = 1.4;
          bulbs.add(bulb);
        }
      });
      head.add(bulbs);
      hang(B, (g) => { const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 5), wire); tail.position.y = -0.3; g.add(tail); const plug = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), wire); plug.position.y = -0.62; g.add(plug); });
    } else if (a.tangled === 'bunting') {
      const curve = sagLine(A, B, 0.3, 0.1);
      into(head, s.mesh(new THREE.TubeGeometry(curve, 24, 0.005, 5), new THREE.MeshStandardMaterial({ color: '#e9e2cf' })));
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.06, 0, 0, 0.06, 0, 0, 0, -0.15, 0], 3));
      flagGeo.computeVertexNormals();
      const fade = mix(0.1, 0.55, mood.wear);
      const colours = ['#d8433b', '#f0c63a', '#3d8fc9', '#58a85a', '#e98bb8'];
      for (let i = 0; i < 9; i++) {
        const p = curve.getPoint((i + 0.5) / 9), q = curve.getPoint((i + 0.7) / 9);
        hang(p, (g) => { const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(colours[i % 5]).lerp(new THREE.Color('#d9d2c2'), fade), side: THREE.DoubleSide, roughness: 0.9 })); flag.castShadow = true; g.add(flag); g.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x); });
      }
      hang(B, (g) => { const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.5, 5), new THREE.MeshStandardMaterial({ color: '#e9e2cf' })); tail.position.y = -0.25; g.add(tail); });
    } else if (a.tangled === 'vest') {
      hang(A.clone().add(new THREE.Vector3(0, -0.08, 0)), (g) => {
        const orange = new THREE.MeshStandardMaterial({ color: '#ff6a13', emissive: '#ff5a00', emissiveIntensity: 0.25, roughness: 0.8, side: THREE.DoubleSide });
        const silver = new THREE.MeshStandardMaterial({ color: '#dfe3e2', metalness: 0.5, roughness: 0.35 });
        for (const dx of [-0.11, 0.11]) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.58, 0.012), orange); panel.position.set(dx, -0.33, dx * 0.5); panel.rotation.y = dx * 2.2; panel.rotation.z = dx * 0.6; panel.castShadow = true; g.add(panel);
          for (const y of [-0.3, -0.48]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.205, 0.045, 0.016), silver); band.position.set(dx, y, dx * 0.5); band.rotation.copy(panel.rotation); g.add(band); }
        }
        const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 14), orange); yoke.rotation.x = Math.PI / 2; yoke.position.y = -0.02; g.add(yoke);
      });
    }

    if (a.birds) {
      const n = 1 + Math.floor(random() * 3);
      const feather = [new THREE.MeshStandardMaterial({ color: '#3b3a3d', roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: '#e7e3d8', roughness: 0.8 })];
      for (let i = 0; i < n; i++) {
        const z = -0.5 + i * 0.36 + random() * 0.1, g = new THREE.Group();
        const m = feather[Math.floor(random() * 3)];
        ball(g, [0.045, 0.045, 0.075], [0, 0.05, 0], m, 10);
        ball(g, [0.032, 0.032, 0.034], [0, 0.1, 0.055], m, 10);
        into(g, s.mesh(new THREE.ConeGeometry(0.01, 0.035, 5), new THREE.MeshStandardMaterial({ color: '#e0a02a' }), [0, 0.1, 0.1])).rotation.x = Math.PI / 2;
        into(g, s.box([0.035, 0.008, 0.09], [0, 0.06, -0.1], m)).rotation.x = -0.35;
        g.position.set((random() - 0.5) * 0.1, 1.43 * (0.96 + girth * 0.04) + (girth - 1) * 0.3, z);
        g.rotation.y = random() * 6;
        body.add(g);
      }
    }

    body.rotation.y = -0.7;
    s.root.scale.setScalar(mix(0.9, 1.1, a.build));
    const sway = mix(0.02, 0.16, mood.energy);
    const baseX = head.rotation.x, baseY = head.rotation.y;
    return s.finish({
      footprint: 0.95,
      update: (_dt, time) => {
        swing.forEach((g, i) => { g.rotation.z = Math.sin(time * 1.6 + i * 1.3) * sway; g.rotation.x = Math.cos(time * 1.2 + i) * sway * 0.6; });
        head.rotation.y = baseY + Math.sin(time * 0.4) * 0.04 * (0.4 + mood.energy);
        head.rotation.x = baseX + (grazing ? Math.sin(time * 3) * 0.03 * mood.energy : 0);
      },
    });
  },
});
