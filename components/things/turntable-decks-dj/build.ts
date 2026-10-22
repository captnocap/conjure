import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { bucketHat, glow, paint, pick, pickSkin, rig, worldOf } from './rig';

const BANNERS = {
  'free-party': 'FREE PARTY in dripping red letters.',
  'no-sleep': 'NO SLEEP in white on black.',
  'dub-engine': 'DUB ENGINE in green and gold.',
  acid: 'ACID with a yellow smiley face.',
  'one-love': 'ONE LOVE in rainbow letters.',
  'hardcore': 'HARDCORE in jagged yellow.',
} as const;
const BANNER_ART: Record<keyof typeof BANNERS, { text: string; ink: string; paper: string }> = {
  'free-party': { text: 'FREE PARTY', ink: '#e62d2d', paper: '#f1e9d2' },
  'no-sleep': { text: 'NO SLEEP', ink: '#f4f4f0', paper: '#1d1d1f' },
  'dub-engine': { text: 'DUB ENGINE', ink: '#2ec24a', paper: '#f2c21c' },
  acid: { text: 'ACID', ink: '#1d1d1f', paper: '#f2e21c' },
  'one-love': { text: 'ONE LOVE', ink: '#ff3f8e', paper: '#2b6cc4' },
  hardcore: { text: 'HARDCORE', ink: '#f2e21c', paper: '#1d1d1f' },
};

export default defineThing({
  questions: {
    gear: choice('What is on the table?', {
      turntables: 'Two turntables and a mixer, records on the platters.',
      cdjs: 'Two CDJs with glowing jog wheels either side of a mixer.',
      laptop: 'A laptop and a small controller, the screen lighting the face.',
      hybrid: 'One turntable, one CDJ and a mixer between them.',
    }),
    stance: choice('What is the DJ doing?', {
      hunched: 'Hunched low over the decks, headphone clamped to one ear, cueing the next record.',
      'arms-up': 'One arm thrown straight up, the other on the mixer, the drop about to land.',
      pointing: 'Pointing out into the crowd, grinning.',
      nodding: 'Both hands on the mixer, head down, nodding to the beat.',
    }),
    head: choice('What is on their head?', {
      bucket: 'A bucket hat.',
      cap: 'A cap turned backwards.',
      hood: 'A hood up, face in shadow.',
      short: 'Short hair, no hat.',
      long: 'Long hair falling over the decks.',
    }),
    extras: choice('What else is at hand?', {
      cigarette: 'A lit cigarette in the mouth, smoke curling up.',
      beer: 'A can of beer on the table beside the mixer.',
      water: 'A bottle of water on the table.',
      nothing: 'Nothing, just the records.',
    }),
    front: choice('What hangs on the front of the table?', {
      fairy: 'A string of fairy lights looped along the table edge.',
      banner: 'A painted banner stretched across the table front.',
      flag: 'A flag draped over the front.',
      bare: 'Nothing: bare trestle legs and a tangle of cables.',
    }),
    banner: choice('If there is a banner, what does it say?', BANNERS),
    crate: noul('Is a milk crate of records on the floor beside the table?'),
    monitor: noul('Is a wedge monitor speaker on the table, angled at the DJ?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.62, 1.88, random());
    const headR = H * 0.064;
    const skin = pickSkin(random);
    const dark = s.material('#1c1c1f', { roughness: 0.6 });
    const steel = s.material('#aeb3b8', { metalness: 0.7, roughness: 0.35 });
    const wood = s.material('#8a6a46', { roughness: 0.85 });
    const rubber = s.material('#111113', { roughness: 0.95 });

    // The trestle table: a top, two A-frame trestles, cables underneath.
    const TW = 1.9, TD = 0.62, TY = 0.78;
    s.box([TW, 0.035, TD], [0, TY - 0.0175, 0], wood);
    for (const sx of [-1, 1]) {
      const x = sx * (TW / 2 - 0.25);
      for (const sz of [-1, 1]) s.rod([x, 0, sz * 0.3], [x, TY - 0.04, 0], 0.016, steel);
      s.rod([x, TY * 0.45, -0.16], [x, TY * 0.45, 0.16], 0.012, steel);
    }
    const cable = s.material('#1d1d20', { roughness: 0.9 });
    s.tube([[-0.5, TY - 0.05, -0.2], [-0.6, 0.3, -0.3], [-0.2, 0.02, -0.4], [0.5, 0.02, -0.5], [0.9, 0.05, -0.3]], 0.01, cable);
    s.tube([[0.3, TY - 0.05, -0.25], [0.5, 0.25, -0.35], [0.8, 0.02, -0.25]], 0.008, cable);

    // Decks.
    const platters: THREE.Object3D[] = [];
    const jogs: THREE.MeshStandardMaterial[] = [];
    const turntable = (x: number) => {
      s.box([0.45, 0.085, 0.36], [x, TY + 0.0425, 0], s.material('#2a2b2f', { roughness: 0.5 }));
      const platter = s.cylinder(0.155, 0.155, 0.012, [x - 0.04, TY + 0.091, 0.01], steel, 32);
      const record = s.cylinder(0.15, 0.15, 0.004, [x - 0.04, TY + 0.1, 0.01], s.material('#111114', { roughness: 0.35 }), 32);
      const label = s.cylinder(0.05, 0.05, 0.005, [x - 0.04, TY + 0.101, 0.01], s.material(pick(random, ['#d8262c', '#f2c21c', '#2b6fb8', '#f4f1e8', '#2ec24a']), { roughness: 0.7 }), 20);
      platters.push(platter, record, label);
      // Tonearm from the back corner across the record.
      s.cylinder(0.02, 0.02, 0.03, [x + 0.17, TY + 0.1, -0.12], dark, 12);
      s.rod([x + 0.17, TY + 0.11, -0.12], [x - 0.05, TY + 0.105, 0.08], 0.005, steel);
      s.box([0.02, 0.01, 0.03], [x - 0.05, TY + 0.105, 0.08], dark);
      // Pitch fader and the start button.
      s.box([0.012, 0.004, 0.09], [x + 0.18, TY + 0.087, 0.06], dark);
      s.box([0.016, 0.01, 0.008], [x + 0.18, TY + 0.09, 0.06 + (random() - 0.5) * 0.06], steel);
      s.cylinder(0.012, 0.012, 0.006, [x - 0.19, TY + 0.088, 0.14], glow('#ff5a3a', 1.2), 10);
    };
    const cdj = (x: number) => {
      s.box([0.32, 0.1, 0.4], [x, TY + 0.05, 0], s.material('#232428', { roughness: 0.45 }));
      const ring = glow('#3cc8ff', 1.6);
      jogs.push(ring);
      s.cylinder(0.105, 0.105, 0.01, [x, TY + 0.105, 0.05], s.material('#3a3b40', { roughness: 0.4 }), 32);
      s.ring(0.105, 0.006, [x, TY + 0.11, 0.05], ring).rotation.x = Math.PI / 2;
      s.mesh(new THREE.PlaneGeometry(0.2, 0.08), glow('#4a9cff', 0.9), [x, TY + 0.101, -0.13]).rotation.x = -Math.PI / 2;
      for (let i = 0; i < 8; i++) s.box([0.018, 0.006, 0.012], [x - 0.11 + i * 0.03, TY + 0.103, 0.17], i < 4 ? glow(pick(random, ['#ff3f5a', '#3cff7a', '#ffd23c']), 1) : dark);
      s.box([0.01, 0.006, 0.08], [x + 0.14, TY + 0.103, -0.02], dark);
    };
    const mixer = (x: number) => {
      s.box([0.26, 0.1, 0.36], [x, TY + 0.05, 0], s.material('#2d2e33', { roughness: 0.45 }));
      for (let i = 0; i < 3; i++) {
        s.box([0.008, 0.004, 0.11], [x - 0.07 + i * 0.07, TY + 0.102, 0.06], dark);
        s.box([0.016, 0.014, 0.01], [x - 0.07 + i * 0.07, TY + 0.107, 0.06 + (random() - 0.5) * 0.08], steel);
      }
      s.box([0.1, 0.004, 0.008], [x, TY + 0.102, 0.15], dark);
      s.box([0.01, 0.014, 0.016], [x + (random() - 0.5) * 0.08, TY + 0.107, 0.15], steel);
      const knobs = Array.from({ length: 12 }, (_u, i) => ({ at: [x - 0.07 + (i % 3) * 0.07, TY + 0.106, -0.14 + Math.floor(i / 3) * 0.035] as [number, number, number], size: 0.009 }));
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.8, 8), s.material('#dcdcdc', { roughness: 0.4 }), knobs);
      // VU ladder.
      const vu = Array.from({ length: 16 }, (_u, i) => ({ at: [x - 0.012 + (i % 2) * 0.024, TY + 0.103, -0.14 + Math.floor(i / 2) * 0.02] as [number, number, number], size: 0.005, color: Math.floor(i / 2) < 5 ? '#3cff7a' : Math.floor(i / 2) < 7 ? '#ffd23c' : '#ff3f3f' }));
      s.scatter(new THREE.BoxGeometry(1.6, 0.5, 1), glow('#ffffff', 1.4), vu);
    };
    const laptop = (x: number) => {
      s.box([0.34, 0.018, 0.24], [x, TY + 0.009, -0.02], s.material('#b9bcc0', { metalness: 0.6, roughness: 0.35 }));
      const lid = s.box([0.34, 0.23, 0.01], [x, TY + 0.13, -0.17], s.material('#b9bcc0', { metalness: 0.6, roughness: 0.35 }));
      lid.rotation.x = -0.3;
      const screen = s.mesh(new THREE.PlaneGeometry(0.31, 0.2), glow('#7ab8ff', 1.3), [x, TY + 0.13, -0.163]);
      screen.rotation.x = -0.3;
      s.box([0.3, 0.012, 0.16], [x + 0.4, TY + 0.006, 0.08], s.material('#232428', { roughness: 0.5 }));
      const pads = Array.from({ length: 8 }, (_u, i) => ({ at: [x + 0.3 + (i % 4) * 0.035, TY + 0.014, 0.1 + Math.floor(i / 4) * 0.035] as [number, number, number], size: 0.013, color: pick(random, ['#ff3f8e', '#3cc8ff', '#3cff7a', '#ffd23c']) }));
      s.scatter(new THREE.BoxGeometry(1, 0.4, 1), glow('#ffffff', 1.2), pads);
      const knobs = Array.from({ length: 6 }, (_u, i) => ({ at: [x + 0.3 + (i % 3) * 0.05, TY + 0.018, 0.03 + Math.floor(i / 3) * 0.04] as [number, number, number], size: 0.009 }));
      s.scatter(new THREE.CylinderGeometry(1, 1, 1, 8), s.material('#dcdcdc', { roughness: 0.4 }), knobs);
    };
    if (a.gear === 'turntables') { turntable(-0.6); mixer(0); turntable(0.6); }
    if (a.gear === 'cdjs') { cdj(-0.55); mixer(0); cdj(0.55); }
    if (a.gear === 'hybrid') { turntable(-0.6); mixer(0); cdj(0.55); }
    if (a.gear === 'laptop') laptop(-0.3);
    if (a.monitor) {
      const wedge = s.box([0.34, 0.26, 0.28], [TW / 2 - 0.22, TY + 0.13, -0.1], s.material('#1a1a1c'));
      wedge.rotation.set(0.5, -0.4, 0);
      s.cylinder(0.06, 0.06, 0.01, [TW / 2 - 0.22, TY + 0.19, -0.1], s.material('#3a3632'), 16).rotation.set(0.5 - Math.PI / 2, -0.4, 0);
    }
    if (a.extras === 'beer') s.cylinder(0.033, 0.033, 0.12, [0.32, TY + 0.06, 0.2], s.material(pick(random, ['#d8262c', '#2b6fb8', '#f2c21c']), { metalness: 0.4, roughness: 0.4 }), 14);
    if (a.extras === 'water') {
      s.cylinder(0.032, 0.03, 0.2, [0.36, TY + 0.1, 0.2], new THREE.MeshPhysicalMaterial({ color: '#d7ecff', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }), 14);
      s.cylinder(0.033, 0.033, 0.12, [0.36, TY + 0.06, 0.2], new THREE.MeshPhysicalMaterial({ color: '#9ccfff', transparent: true, opacity: 0.6, roughness: 0.2, depthWrite: false }), 14);
      s.cylinder(0.014, 0.014, 0.02, [0.36, TY + 0.21, 0.2], s.material('#2b6cc4'), 10);
    }

    // The front of the table.
    if (a.front === 'fairy') {
      const string = s.material('#2a3a2a', { roughness: 0.9 });
      const bulbs: { at: [number, number, number]; size: number; color: string }[] = [];
      const points: [number, number, number][] = [];
      const colours = ['#ff3f5a', '#3cff7a', '#3cc8ff', '#ffd23c', '#ff3fd0'];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const x = -TW / 2 + 0.05 + t * (TW - 0.1);
        const y = TY - 0.05 - Math.abs(Math.sin(t * Math.PI * 3)) * 0.12;
        points.push([x, y, TD / 2 + 0.02]);
        if (i % 2 === 0) bulbs.push({ at: [x, y - 0.025, TD / 2 + 0.035], size: 0.024, color: colours[(i / 2) % colours.length] });
      }
      s.tube(points, 0.003, string);
      s.scatter(new THREE.SphereGeometry(1, 8, 6), glow('#ffffff', mix(1.2, 2.2, mood.cheer)), bulbs);
    }
    if (a.front === 'banner') {
      const { text, ink, paper } = BANNER_ART[a.banner];
      const map = paint(1024, 256, (c, w, h) => {
        c.fillStyle = paper; c.fillRect(0, 0, w, h);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        const size = Math.min(h * 0.7, (w * 0.9) / text.length * 1.6);
        c.font = `bold ${size}px sans-serif`;
        c.fillStyle = ink;
        c.fillText(text, w / 2, h / 2 + 6);
        if (a.banner === 'acid') { c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(w * 0.88, h / 2, h * 0.3, 0, 7); c.fill(); c.fillStyle = paper; c.beginPath(); c.arc(w * 0.88 - h * 0.1, h * 0.42, h * 0.04, 0, 7); c.arc(w * 0.88 + h * 0.1, h * 0.42, h * 0.04, 0, 7); c.fill(); c.strokeStyle = paper; c.lineWidth = 6; c.beginPath(); c.arc(w * 0.88, h * 0.5, h * 0.17, 0.3, Math.PI - 0.3); c.stroke(); }
        for (let i = 0; i < 10; i++) { c.fillStyle = ink; c.fillRect(w * 0.08 + random() * w * 0.84, h * 0.7, 4, 8 + random() * 30); }
      });
      const banner = s.mesh(new THREE.PlaneGeometry(TW - 0.1, 0.5), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [0, TY - 0.3, TD / 2 + 0.02]);
      banner.rotation.x = 0.05;
      for (const sx of [-1, 1]) s.rod([sx * (TW / 2 - 0.05), TY - 0.02, TD / 2 + 0.02], [sx * (TW / 2 - 0.08), TY - 0.06, TD / 2 + 0.02], 0.004, string(s));
    }
    if (a.front === 'flag') {
      const map = paint(512, 256, (c, w, h) => {
        const kind = Math.floor(random() * 3);
        if (kind === 0) { for (let i = 0; i < 3; i++) { c.fillStyle = ['#2ec24a', '#f2c21c', '#e62d2d'][i]; c.fillRect(0, i * h / 3, w, h / 3); } }
        else if (kind === 1) { c.fillStyle = '#1d1d1f'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2e21c'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.36, 0, 7); c.fill(); c.fillStyle = '#1d1d1f'; c.beginPath(); c.arc(w / 2 - h * 0.12, h * 0.42, h * 0.05, 0, 7); c.arc(w / 2 + h * 0.12, h * 0.42, h * 0.05, 0, 7); c.fill(); c.lineWidth = 8; c.strokeStyle = '#1d1d1f'; c.beginPath(); c.arc(w / 2, h * 0.5, h * 0.22, 0.3, Math.PI - 0.3); c.stroke(); }
        else { for (let i = 0; i < 6; i++) { c.fillStyle = ['#e62d2d', '#ff8c1a', '#f2e21c', '#2ec24a', '#2b6cc4', '#8a2be2'][i]; c.fillRect(0, i * h / 6, w, h / 6); } }
      });
      const flag = s.mesh(new THREE.PlaneGeometry(TW * 0.8, 0.62), new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide }), [0.05, TY - 0.33, TD / 2 + 0.02]);
      flag.rotation.set(0.04, 0, 0.02);
      s.box([TW * 0.8, 0.05, 0.2], [0.05, TY + 0.005, TD / 2 - 0.08], new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
    }
    if (a.crate) {
      const crate = s.material(pick(random, ['#d8262c', '#2b6fb8', '#1d1d1f', '#f2c21c']), { roughness: 0.8 });
      const cx = -TW / 2 - 0.3, cz = 0.1;
      s.box([0.36, 0.03, 0.36], [cx, 0.015, cz], crate);
      for (const sx of [-1, 1]) { s.box([0.02, 0.3, 0.36], [cx + sx * 0.17, 0.15, cz], crate); s.box([0.36, 0.3, 0.02], [cx, 0.15, cz + sx * 0.17], crate); }
      const sleeves = Array.from({ length: 14 }, (_u, i) => ({ at: [cx - 0.12 + i * 0.018 + (random() - 0.5) * 0.004, 0.17 + (random() - 0.5) * 0.01, cz] as [number, number, number], size: 1, color: pick(random, ['#f4f1e8', '#d8262c', '#2b6fb8', '#1d1d1f', '#f2c21c', '#2ec24a']) }));
      s.scatter(new THREE.BoxGeometry(0.012, 0.31, 0.31), s.material('#ffffff', { roughness: 0.9 }), sleeves);
    }

    // The DJ, behind the table, facing the crowd.
    const outfit = pick(random, [
      { top: '#1d1d1f', bottom: '#2a3a5a' }, { top: '#e8e2d0', bottom: '#1d1d1f' }, { top: '#6b2d8a', bottom: '#1d1d1f' },
      { top: '#2a6b3a', bottom: '#3a3a3c' }, { top: '#c9442a', bottom: '#2a3a5a' },
    ]);
    const hair = ({ bucket: 'none', cap: 'cap', hood: 'hood', short: 'short', long: 'long' } as const)[a.head];
    const dj = figure(s, {
      height: H, style: 'doll', skin, hair, hairColor: a.head === 'cap' ? pick(random, ['#1d1d1f', '#d8262c', '#2b6fb8']) : pick(random, ['#1d1d1f', '#3b2a22', '#c9b071', '#8a3a2a']),
      pose: 'standing', gaze: 'ahead', sleeves: random() < 0.5 ? 'long' : 'short', build: pick(random, ['slight', 'average', 'heavy'] as const), ...outfit,
    });
    s.root.add(dj.root);
    const joints = rig(dj);
    if (a.head === 'cap') for (const child of dj.head.children) if ((child as THREE.Mesh).geometry?.type === 'BoxGeometry') child.position.z = -child.position.z;
    if (a.head === 'bucket') bucketHat(s, dj, headR, pick(random, ['#e8e2d0', '#1d1d1f', '#5a7a3a', '#ff8c1a', '#2b6cc4']));
    // Headphones: a band over the head, one cup on the ear, the other pushed off.
    const phones = s.material('#161618', { roughness: 0.5 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.12, headR * 0.09, 8, 24, Math.PI), phones);
    const cups = [-1, 1].map((side) => { const cup = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.42, headR * 0.42, headR * 0.3, 16), phones); cup.rotation.z = Math.PI / 2; cup.position.set(side * headR * 1.12, 0, 0); return cup; });
    const set = new THREE.Group();
    set.add(band, ...cups);
    set.position.y = headR * 0.05;
    const earHand: 'left' | 'right' = random() < 0.5 ? 'left' : 'right';
    const earSign = earHand === 'left' ? 1 : -1;
    // Tilt the set so the cup on the free side lifts off the head.
    set.rotation.z = -earSign * 0.5;
    set.rotation.x = -0.25;
    set.position.x = earSign * headR * 0.25;
    set.position.y = headR * 0.35;
    dj.head.add(set);
    const other: 'left' | 'right' = earHand === 'left' ? 'right' : 'left';
    if (a.stance === 'hunched') {
      joints.lean(10); joints.bow(26); joints.look(22, earSign * 12);
      joints.arm(earHand, { forward: 55, out: 58, bend: 142, across: -15 });
      joints.arm(other, { forward: 48, out: 8, bend: 20, across: 10 });
    } else if (a.stance === 'arms-up') {
      joints.lean(-4); joints.bow(-8); joints.look(-18, 0);
      joints.arm(earHand, { forward: 172, out: 14, bend: 8 });
      joints.arm(other, { forward: 48, out: 8, bend: 25, across: 10 });
      set.rotation.z = -earSign * 0.1; set.position.x = 0; set.position.y = headR * 0.25;
    } else if (a.stance === 'pointing') {
      joints.lean(2); joints.bow(4); joints.look(-4, -earSign * 15);
      joints.arm(earHand, { forward: 92, out: 18, bend: 6 });
      joints.arm(other, { forward: 48, out: 8, bend: 24, across: 10 });
    } else {
      joints.lean(6); joints.bow(14); joints.look(30, 0);
      joints.arm('left', { forward: 50, out: 8, bend: 22, across: 12 });
      joints.arm('right', { forward: 50, out: 8, bend: 22, across: 12 });
    }
    joints.leg('left', { out: 6, forward: 2 });
    joints.leg('right', { out: 6, forward: -2 });
    joints.settle();
    dj.root.position.set((random() - 0.5) * 0.3, 0, -0.52);
    dj.root.updateMatrixWorld(true);
    if (a.extras === 'cigarette') {
      const cig = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 8), s.material('#f4f1e8'));
      cig.rotation.x = Math.PI / 2 - 0.3;
      cig.position.set(headR * 0.25, -headR * 0.25, headR * 1.05);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 6, 4), glow('#ff6a1a', 2));
      tip.position.y = 0.04;
      cig.add(tip);
      dj.head.add(cig);
      // A wisp of smoke above.
      const smoke = s.mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#dcdcdc', transparent: true, opacity: 0.18, depthWrite: false }), [0, 0, 0]);
      const mouth = worldOf(dj.head);
      smoke.position.set(mouth.x + headR * 0.3, mouth.y + headR * 1.2, mouth.z + headR * 0.6);
      smoke.scale.set(1, 1.8, 1);
      smoke.castShadow = false;
    }
    // Something in the pointing hand.
    if (a.stance === 'arms-up' && random() < 0.5) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 12), s.material(pick(random, ['#d8262c', '#2b6fb8', '#f2c21c'])));
      can.position.y = -0.02;
      dj.hands[earHand].add(can);
    }

    const energy = mood.energy;
    const nod = a.stance === 'nodding' ? 1 : 0.35;
    const tempo = mix(1.6, 3.2, energy);
    return s.finish({
      update: (dt, time) => {
        dj.update(dt, time);
        const beat = Math.sin(time * tempo * Math.PI);
        joints.neck.rotation.x += 0;
        dj.head.rotation.x = Math.max(0, beat) * 0.12 * nod * energy;
        for (const p of platters) p.rotation.y += dt * 3.5 * (0.3 + energy);
        for (const j of jogs) j.emissiveIntensity = 1.3 + Math.max(0, beat) * 0.8;
      },
    });
  },
});

/** A thin cord for hanging banners. */
function string(art: Sculpture) { return art.material('#e8e2d0', { roughness: 1 }); }
