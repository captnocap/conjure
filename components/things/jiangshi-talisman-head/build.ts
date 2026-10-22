import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, score } from '@conjure/kit';
import { type Bit, limb, many, mottled, paint, put, shade } from './grave';

export default defineThing({
  questions: {
    talisman: choice('What state is the paper talisman on its forehead in?', {
      on: 'Pasted flat and firm, hanging down over the face: the corpse is safely held.',
      peeling: 'One corner has lifted and the strip hangs crooked, about to come away.',
      fluttering: 'Stuck only at the top and flapping forward in a draught.',
      torn: 'Torn off: a ragged stub on the brow and the rest lying on its sleeve.',
    }),
    rank: choice('What rank are the hat and robe?', {
      clerk: 'A minor clerk: a plain black winter cap with a brass knob and an undecorated dark robe.',
      magistrate: 'A magistrate: fur-brimmed hat with a red silk crown and crystal knob, a rank square on the chest.',
      mandarin: 'A high mandarin: conical summer hat with red fringe, ruby knob and peacock feather, court beads and a gold square.',
      general: 'A military official: red-crowned hat with a tall plume, dark red robe studded with brass.',
    }),
    expression: choice('What is the face doing?', {
      blank: 'Frozen blank: eyes shut, mouth closed, nobody home.',
      awake: 'Awake: eyes wide and glowing, mouth open on its fangs.',
      sniffing: 'Sniffing for breath: chin lifted, head turned, nostrils flared, eyes still shut.',
      cross: 'Awake and going cross-eyed trying to read the paper on its own forehead.',
    }),
    arms: choice('How are the arms held?', {
      out: 'Stiff and straight out in front, hands hanging limp.',
      reaching: 'Straight out and raised, fingers spread to grab.',
      sleeves: 'Straight out with the hands lost inside long horseshoe cuffs.',
      bound: 'Tied down against the body with red cord and copper coins.',
    }),
    fangs: score('How long are its fangs?', ['None showing', 'Small points', 'Long curved fangs past the lip']),
    nails: score('How long are its fingernails?', ['Trimmed short', 'Long and dark', 'Curling black talons as long as the fingers']),
    queue: choice('What has become of its hair?', {
      queue: 'A long neat queue plait hanging down the back.',
      loose: 'The plait has come undone into lank strands round the shoulders.',
      white: 'A stiff white queue and long white eyebrows, a very old corpse.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const dust = mood.wear;
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const ball = (w = 16, h = 12) => new THREE.SphereGeometry(1, w, h);

    // Flesh: blue-white, greener when warm, with livid patches.
    const skinTone = shade(shade('#c9dde6', mood.warmth > 0.5 ? '#bcd3a4' : '#a9c4ea', Math.abs(mood.warmth - 0.5) * 0.9), '#6a7a70', dust * 0.25);
    const skin = paint('#ffffff', { roughness: 0.6, map: mottled(random, skinTone, [{ color: '#6f7fb0', count: 14, size: 0.06, alpha: 0.22 }, { color: '#5a6a8a', count: 10, size: 0.015, alpha: 0.4, line: true }, { color: '#4a5a44', count: Math.round(dust * 26), size: 0.05, alpha: 0.4 }]) });
    const dark = paint('#14101a', { roughness: 1 });
    const nailMat = paint(shade('#3a3a52', '#101018', a.nails), { roughness: 0.3 });

    // Robe.
    const robeBase = { clerk: '#22283a', magistrate: mood.cheer > 0.5 ? '#1f3a8a' : '#1c2a55', mandarin: mood.cheer > 0.5 ? '#16307a' : '#141c40', general: '#6a1c22' }[a.rank];
    const robeTone = shade(robeBase, '#6a6458', dust * 0.4);
    const robe = paint('#ffffff', { roughness: 0.85, side: THREE.DoubleSide, map: mottled(random, robeTone, [{ color: '#000000', count: 20, size: 0.02, alpha: 0.2, line: true }, { color: '#8a8470', count: Math.round(dust * 40), size: 0.05, alpha: 0.35 }]) });
    const trim = paint(shade('#3d7fd0', '#6a6458', dust * 0.4), { roughness: 0.7, side: THREE.DoubleSide });
    const gold = paint('#dcae3a', { metalness: 0.8, roughness: 0.3, emissive: '#5a3c05', emissiveIntensity: 0.45 });
    const red = paint(shade('#c8202a', '#6a3a30', dust * 0.4), { roughness: 0.7, emissive: '#5a0a0e', emissiveIntensity: 0.3 });

    // Bust: chest, shoulders and a stiff collar.
    const chest = new THREE.CylinderGeometry(0.19, 0.215, 0.3, 24, 1);
    put(body, chest, robe, [0, 0.15, 0], [0, 0, 0], [1, 1, 0.66]);
    put(body, ball(22, 12), robe, [0, 0.3, 0], [0, 0, 0], [0.235, 0.085, 0.135]);
    for (let i = 0; i < 9; i++) {
      const t = i / 9 * Math.PI * 2;
      put(body, new THREE.ConeGeometry(0.03, 0.05 + random() * 0.05 * (0.4 + dust), 4), robe, [Math.cos(t) * 0.2, 0.012, Math.sin(t) * 0.135], [Math.PI, random() * 3, 0], [1, 1, 0.5]);
    }
    put(body, new THREE.CylinderGeometry(0.058, 0.068, 0.1, 14), skin, [0, 0.385, 0.004]);
    put(body, new THREE.CylinderGeometry(0.074, 0.11, 0.045, 18, 1, true), trim, [0, 0.36, 0.004]);
    // The front opening and toggles.
    put(body, new THREE.BoxGeometry(0.012, 0.3, 0.008), trim, [0, 0.16, 0.142], [0.02, 0, 0]);
    if (a.rank !== 'general') for (let i = 0; i < 4; i++) put(body, ball(8, 6), gold, [0, 0.07 + i * 0.07, 0.148], [0, 0, 0], 0.01);

    // Rank square on the chest.
    if (a.rank === 'magistrate' || a.rank === 'mandarin') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const rich = a.rank === 'mandarin';
      ctx.fillStyle = rich ? '#0e1a44' : '#182a5a'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = rich ? '#e8c04a' : '#c8d0e0'; ctx.lineWidth = 6; ctx.strokeRect(6, 6, 116, 116);
      ctx.lineWidth = 3;
      for (let i = 0; i < 5; i++) { ctx.strokeStyle = ['#3a8ad0', '#e8c04a', '#58b08a', '#d04a4a', '#e8e8f0'][i]; ctx.beginPath(); ctx.arc(64, 150 + i * 9, 60, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.fillStyle = '#d83a2e'; ctx.beginPath(); ctx.arc(100, 26, 10, 0, 7); ctx.fill();
      // A crane, more or less.
      ctx.fillStyle = '#f2f2f6';
      ctx.beginPath(); ctx.ellipse(60, 66, 26, 14, -0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, 60); ctx.quadraticCurveTo(20, 30, 46, 22); ctx.lineTo(50, 28); ctx.quadraticCurveTo(34, 36, 52, 58); ctx.fill();
      ctx.beginPath(); ctx.moveTo(74, 60); ctx.lineTo(112, 46); ctx.lineTo(96, 70); ctx.fill();
      ctx.fillStyle = '#16161c'; ctx.beginPath(); ctx.moveTo(84, 72); ctx.lineTo(108, 84); ctx.lineTo(80, 80); ctx.fill();
      ctx.fillStyle = '#d83a2e'; ctx.fillRect(44, 18, 8, 6);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      put(body, new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map, roughness: 0.7, emissive: rich ? '#3a2a05' : '#000000', emissiveIntensity: 0.5 }), [0, 0.16, 0.149], [0.02, 0, 0]).castShadow = false;
    }
    if (a.rank === 'mandarin') {
      // Court beads.
      const beads: Bit[] = [];
      for (let i = 0; i < 30; i++) {
        const t = i / 30 * Math.PI * 2, y = 0.22 + Math.cos(t) * 0.14, x = Math.sin(t) * 0.1;
        beads.push({ p: [x, y, 0.1 + Math.sqrt(Math.max(0, 1 - (x / 0.2) ** 2)) * 0.05 + (y > 0.3 ? -(y - 0.3) * 0.9 : 0)], s: i % 10 === 5 ? 0.016 : 0.01, c: i % 10 === 5 ? '#d83a2e' : i % 2 ? '#e8b84a' : '#8a5a2a' });
      }
      many(body, ball(8, 6), paint('#ffffff', { roughness: 0.35 }), beads);
    }
    if (a.rank === 'general') {
      const studs: Bit[] = [];
      for (let r = 0; r < 4; r++) for (let i = -3; i <= 3; i++) {
        if (i === 0) continue;
        const x = i * 0.05;
        studs.push({ p: [x, 0.05 + r * 0.065, 0.066 * 2.15 * Math.sqrt(Math.max(0.05, 1 - (x / 0.21) ** 2))], s: 0.009 });
      }
      many(body, ball(6, 5), gold, studs);
      for (const x of [-1, 1]) put(body, ball(12, 8), gold, [x * 0.215, 0.335, 0], [0, 0, 0], [0.075, 0.03, 0.09]);
    }

    // Head.
    const head = new THREE.Group();
    head.position.set(0, 0.54, 0.012);
    head.scale.setScalar(1.2);
    const lift = a.expression === 'sniffing' ? -0.3 : a.expression === 'cross' ? -0.05 : 0;
    head.rotation.set(lift, a.expression === 'sniffing' ? (random() < 0.5 ? 0.45 : -0.45) : (random() - 0.5) * 0.1, a.expression === 'sniffing' ? 0.08 : 0);
    body.add(head);
    put(head, ball(26, 18), skin, [0, 0.008, 0], [0, 0, 0], [0.102, 0.12, 0.108]);
    put(head, ball(18, 12), skin, [0, -0.07, 0.02], [0, 0, 0], [0.078, 0.062, 0.076]);
    const open = a.expression === 'awake' || a.expression === 'cross';
    const glow = paint('#ff5a3a', { emissive: '#ff2a1a', emissiveIntensity: 1.6, roughness: 0.4 });
    const browTone = a.queue === 'white' ? '#e8e8e4' : '#16141a';
    for (const x of [-1, 1]) {
      put(head, ball(10, 8), skin, [x * 0.102, -0.008, 0], [0, 0, x * -0.2], [0.014, 0.032, 0.02]);
      // Sunken livid sockets.
      put(head, ball(12, 8), paint(shade(skinTone, '#3a2a5a', 0.6), { roughness: 0.9 }), [x * 0.041, 0.012, 0.088], [0, 0, 0], [0.033, 0.03, 0.018]);
      if (open) {
        put(head, ball(12, 10), paint('#f4f2e6', { roughness: 0.25 }), [x * 0.041, 0.012, 0.093], [0, 0, 0], 0.021);
        const cx = a.expression === 'cross' ? -x * 0.009 : 0, cy = a.expression === 'cross' ? 0.01 : 0;
        put(head, ball(8, 6), a.expression === 'awake' ? glow : paint('#16121a'), [x * 0.041 + cx, 0.012 + cy, 0.111], [0, 0, 0], 0.008);
      } else {
        put(head, ball(12, 8), skin, [x * 0.041, 0.012, 0.094], [0, 0, 0], [0.022, 0.018, 0.016]);
        put(head, new THREE.TorusGeometry(0.017, 0.0028, 4, 12, Math.PI), dark, [x * 0.041, 0.016, 0.107], [0.25, 0, Math.PI]);
      }
      const tilt = a.expression === 'awake' ? 0.45 : a.expression === 'cross' ? -0.3 : 0.1;
      put(head, new THREE.CapsuleGeometry(0.006, a.queue === 'white' ? 0.05 : 0.036, 3, 8), paint(browTone), [x * (a.queue === 'white' ? 0.048 : 0.041), 0.052 + (a.expression === 'cross' ? 0.01 : 0), 0.101], [0, 0, Math.PI / 2 + x * tilt]);
      if (a.queue === 'white') limb(head, [x * 0.074, 0.046, 0.094], [x * 0.092, -0.04, 0.09], 0.004, 0.002, paint(browTone), 4);
      // Rouge.
      put(head, ball(10, 8), paint(shade('#d86a7a', hex(skinTone), 0.75 - mood.cheer * 0.6), { roughness: 0.8 }), [x * 0.062, -0.034, 0.083], [0, x * 0.5, 0], [0.022, 0.022, 0.008]);
    }
    put(head, ball(10, 8), skin, [0, -0.02, 0.108], [0, 0, 0], a.expression === 'sniffing' ? [0.022, 0.024, 0.022] : [0.017, 0.024, 0.02]);
    if (a.expression === 'sniffing') for (const x of [-1, 1]) put(head, ball(6, 5), dark, [x * 0.01, -0.036, 0.118], [0, 0, 0], [0.007, 0.006, 0.006]);
    // Mouth, fangs, a thin moustache.
    const gape = a.expression === 'awake' ? 0.03 : a.expression === 'cross' ? 0.012 : 0.005;
    put(head, ball(12, 8), dark, [0, -0.078, 0.086], [0, 0, 0], [0.036, gape, 0.016]);
    put(head, new THREE.TorusGeometry(0.036, 0.004, 4, 14, Math.PI), paint(shade('#5a3a6a', hex(skinTone), 0.3)), [0, -0.078 + gape * 0.2, 0.094], [0.2, 0, a.expression === 'awake' ? 0 : Math.PI], [1, a.expression === 'awake' ? 0.9 : 0.3, 1]);
    if (a.fangs > 0.15) for (const x of [-1, 1]) {
      const len = mix(0.01, 0.055, a.fangs);
      put(head, new THREE.ConeGeometry(0.007, len, 6), paint('#f4f0dc', { roughness: 0.3 }), [x * 0.02, -0.074 - len / 2, 0.1], [Math.PI + 0.12, 0, x * 0.08]);
    }
    for (const x of [-1, 1]) limb(head, [x * 0.012, -0.056, 0.104], [x * 0.05, -0.1 - random() * 0.03, 0.094], 0.004, 0.0015, paint(browTone), 4);

    // Hair.
    const hairTone = a.queue === 'white' ? '#e6e6e0' : '#15131a';
    const hair = paint(hairTone, { roughness: 0.9 });
    put(head, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.5), hair, [0, 0.008, -0.014], [-1.0, 0, 0], [0.104, 0.12, 0.108]);
    if (a.queue === 'loose') {
      for (let i = 0; i < 12; i++) {
        const t = Math.PI * (0.15 + 0.7 * i / 11), x = Math.cos(t) * 0.1, z = -Math.sin(t) * 0.1;
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0.02, z), new THREE.Vector3(x * 1.2, -0.1, z * 1.1), new THREE.Vector3(x * 1.5 + (random() - 0.5) * 0.05, -0.22 - random() * 0.12, z * 1.2 + 0.03)]);
        put(head, new THREE.TubeGeometry(path, 8, 0.007, 4), hair);
      }
    } else {
      const sway = (random() - 0.5) * 0.12;
      const pts = [new THREE.Vector3(0, 0.0, -0.105), new THREE.Vector3(sway * 0.3, -0.12, -0.135), new THREE.Vector3(sway, -0.3, -0.125), new THREE.Vector3(sway * 1.6, -0.47, -0.14)];
      put(head, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.018, 7), hair);
      for (let i = 1; i < 9; i++) { const p = new THREE.CatmullRomCurve3(pts).getPoint(i / 9); put(head, new THREE.TorusGeometry(0.018, 0.005, 4, 8), hair, [p.x, p.y, p.z], [Math.PI / 2 + 0.3 * (i % 2 ? 1 : -1), 0, 0]); }
      put(head, ball(8, 6), red, [pts[3].x, pts[3].y, pts[3].z], [0, 0, 0], [0.016, 0.026, 0.016]);
    }

    // Hat.
    const hat = new THREE.Group();
    hat.position.set(0, 0.085, -0.008);
    hat.rotation.set(-0.1, 0, (random() - 0.5) * (0.06 + dust * 0.5));
    head.add(hat);
    const black = paint(shade('#16151a', '#5a564e', dust * 0.4), { roughness: 1, side: THREE.DoubleSide });
    const knob = { clerk: gold, magistrate: paint('#eef6fa', { roughness: 0.1, metalness: 0.2 }), mandarin: paint('#d81a3a', { roughness: 0.15, emissive: '#7a0a1a', emissiveIntensity: 0.6 }), general: gold }[a.rank];
    let top = 0.11;
    const strand = (t: number, from: readonly [number, number, number], slope: readonly [number, number], len: number, width: number, c: string): Bit => {
      const dir = new THREE.Vector3(Math.sin(t) * slope[0], slope[1], Math.cos(t) * slope[0]).normalize();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
      return { p: [from[0] + dir.x * len / 2, from[1] + dir.y * len / 2, from[2] + dir.z * len / 2], r: [e.x, e.y, e.z], s: [width, len, 0.004], c };
    };
    if (a.rank === 'mandarin') {
      // Conical summer hat with a red silk fringe.
      top = 0.115;
      put(hat, new THREE.ConeGeometry(0.19, 0.115, 28, 1, true), paint(shade('#e8dcb4', '#7a705a', dust * 0.5), { side: THREE.DoubleSide, roughness: 0.8 }), [0, 0.057, 0]);
      const fringe: Bit[] = [];
      for (let i = 0; i < 64; i++) { const t = i / 64 * Math.PI * 2 + random() * 0.05, len = 0.15 + random() * 0.04; fringe.push(strand(t, [0, 0.122, 0], [0.19, -0.115], len, 0.01, i % 3 ? '#c8202a' : '#a81822')); }
      many(hat, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.6, emissive: '#3a0508', emissiveIntensity: 0.6 }), fringe);
    } else {
      // Winter hat: a round crown inside an upturned brim.
      const brim = [[0.098, 0.0], [0.142, 0.012], [0.15, 0.075], [0.132, 0.082], [0.112, 0.03], [0.1, 0.025]].map(([x, y]) => new THREE.Vector2(x, y));
      put(hat, new THREE.LatheGeometry(brim, 28), black);
      put(hat, new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), a.rank === 'clerk' ? black : red, [0, 0.02, 0], [0, 0, 0], [0.112, 0.088, 0.112]);
      if (a.rank !== 'clerk') {
        const tassel: Bit[] = [];
        for (let i = 0; i < 40; i++) { const t = i / 40 * Math.PI * 2 + random() * 0.1; tassel.push(strand(t, [0, 0.128, 0], [0.95, -0.32], 0.09 + random() * 0.02, 0.007, i % 3 ? '#e02a34' : '#a81822')); }
        many(hat, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.6, emissive: '#3a0508', emissiveIntensity: 0.6 }), tassel);
      }
    }
    put(hat, new THREE.CylinderGeometry(0.012, 0.018, 0.02, 10), gold, [0, top + 0.006, 0]);
    put(hat, ball(12, 10), knob, [0, top + 0.03, 0], [0, 0, 0], a.rank === 'clerk' ? 0.014 : 0.02);
    if (a.rank === 'mandarin') {
      // Peacock feather trailing behind.
      const quill = new THREE.Group();
      quill.position.set(0, top + 0.01, -0.01);
      quill.rotation.set(-1.9, 0, (random() - 0.5) * 0.3);
      hat.add(quill);
      limb(quill, [0, 0, 0], [0, 0.3, 0], 0.004, 0.002, paint('#e8e2c8'), 4);
      put(quill, ball(12, 8), paint('#2a8a5a', { roughness: 0.5 }), [0, 0.24, 0], [0, 0, 0], [0.034, 0.09, 0.005]);
      put(quill, ball(10, 8), paint('#1a3a9a', { emissive: '#0a1a6a', emissiveIntensity: 0.6 }), [0, 0.27, 0.004], [0, 0, 0], [0.018, 0.024, 0.004]);
      put(quill, ball(8, 6), gold, [0, 0.27, 0.007], [0, 0, 0], [0.009, 0.012, 0.003]);
    }
    if (a.rank === 'general') {
      const plume: Bit[] = [];
      for (let i = 0; i < 14; i++) plume.push({ p: [(random() - 0.5) * 0.02, top + 0.06 + i * 0.012, -0.004 - i * i * 0.0012], r: [-0.3 - i * 0.07, random() * 0.6, (random() - 0.5) * 0.6], s: [0.02 + (i % 3) * 0.006, 0.05, 0.006], c: i % 2 ? '#f2f0e8' : '#d8d4c8' });
      many(hat, ball(6, 5), paint('#ffffff', { roughness: 0.9 }), plume);
    }

    // Arms.
    const hands: THREE.Group[] = [];
    const armGroups: THREE.Group[] = [];
    const bound = a.arms === 'bound';
    for (const x of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(x * 0.2, 0.3, 0.02);
      // Local +y runs down the arm from the shoulder.
      arm.rotation.set(bound ? Math.PI - 0.12 : Math.PI / 2 - (a.arms === 'reaching' ? 0.32 : 0.04) + (random() - 0.5) * 0.06, 0, bound ? x * -0.08 : x * 0.03);
      body.add(arm);
      armGroups.push(arm);
      const L = bound ? 0.3 : 0.5;
      const sleeve = new THREE.CylinderGeometry(a.arms === 'sleeves' ? 0.085 : 0.066, 0.062, L, 14, 1, true);
      put(arm, sleeve, robe, [0, L / 2, 0], [0, 0, 0], [1, 1, 0.85]);
      put(arm, ball(12, 8), robe, [0, 0, 0], [0, 0, 0], [0.066, 0.06, 0.06]);
      // Horseshoe cuff.
      const cuff = new THREE.CylinderGeometry(a.arms === 'sleeves' ? 0.1 : 0.074, a.arms === 'sleeves' ? 0.085 : 0.068, a.arms === 'sleeves' ? 0.13 : 0.05, 14, 1, true);
      put(arm, cuff, trim, [0, L + (a.arms === 'sleeves' ? 0.05 : 0.01), 0], [0, 0, 0], [1, 1, 0.85]);
      if (a.arms !== 'sleeves' && !bound) {
        const hand = new THREE.Group();
        hand.position.set(0, L + 0.03, 0);
        // Limp hands droop from the wrist; grabbing hands lift.
        hand.rotation.x = a.arms === 'reaching' ? -0.5 : 0.9;
        arm.add(hand);
        hands.push(hand);
        put(hand, ball(12, 8), skin, [0, 0.05, 0], [0, 0, 0], [0.042, 0.055, 0.02]);
        for (let f = 0; f < 5; f++) {
          const thumb = f === 0, fx = thumb ? -x * 0.045 : (f - 2.5) * 0.021;
          const spread = a.arms === 'reaching' ? (f - 2.5) * 0.16 : (f - 2.5) * 0.04;
          const base: [number, number, number] = [fx, thumb ? 0.03 : 0.095, 0];
          const len = thumb ? 0.045 : 0.07 - Math.abs(f - 2.5) * 0.006;
          const curl = a.arms === 'reaching' ? 0.5 : 0.25;
          const tip: [number, number, number] = [fx + Math.sin(spread + (thumb ? -x * 0.7 : 0)) * len, base[1] + Math.cos(spread) * len * Math.cos(curl), len * Math.sin(curl)];
          limb(hand, base, tip, 0.0105, 0.0085, skin, 6);
          const n = mix(0.012, 0.085, a.nails) * (thumb ? 0.7 : 1);
          const nail = put(hand, new THREE.ConeGeometry(0.0075, n, 5), nailMat, [tip[0], tip[1] + n * 0.42, tip[2] + n * 0.12 * a.nails], [0.3 * a.nails + curl * 0.5, 0, -spread * 0.6], [1, 1, 0.6]);
          nail.castShadow = n > 0.03;
        }
      }
    }
    if (bound) {
      // Red cord wound round the chest and arms, strung with copper coins.
      for (let i = 0; i < 4; i++) put(body, new THREE.TorusGeometry(0.265, 0.008, 5, 28), red, [0, 0.08 + i * 0.05, 0.005], [Math.PI / 2 + (random() - 0.5) * 0.14, 0, (random() - 0.5) * 0.1], [1, 0.62, 1]);
      const coins: Bit[] = [];
      for (let i = 0; i < 7; i++) { const x = (i - 3) * 0.06; coins.push({ p: [x, 0.13 + (i % 2) * 0.05, 0.164 * Math.sqrt(Math.max(0.1, 1 - (x / 0.27) ** 2)) + 0.006], r: [Math.PI / 2, 0, 0], s: [0.02, 0.003, 0.02] }); }
      many(body, new THREE.CylinderGeometry(1, 1, 1, 10), paint('#b87a3a', { metalness: 0.8, roughness: 0.35 }), coins);
    }

    // The talisman: yellow paper, cinnabar script.
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = hex(shade('#f2d23a', '#b8a060', dust * 0.5)); ctx.fillRect(0, 0, 64, 192);
    ctx.strokeStyle = ctx.fillStyle = '#b8161a'; ctx.lineCap = 'round'; ctx.lineWidth = 4;
    const stroke = (pts: number[]) => { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.stroke(); };
    for (const x of [20, 32, 44]) stroke([x, 10, x - 3, 20]);
    stroke([14, 30, 50, 30]); stroke([32, 24, 32, 58]); stroke([16, 44, 48, 44]); stroke([18, 58, 46, 58]);
    ctx.strokeRect(18, 68, 28, 22); stroke([18, 79, 46, 79]); stroke([32, 68, 32, 90]);
    stroke([14, 100, 50, 100, 20, 116, 48, 130, 18, 146, 46, 160]);
    stroke([32, 100, 32, 176]); stroke([22, 176, 42, 176]);
    ctx.beginPath(); ctx.arc(32, 184, 3, 0, 7); ctx.fill();
    const script = new THREE.CanvasTexture(canvas);
    script.colorSpace = THREE.SRGBColorSpace;
    const paper = new THREE.MeshStandardMaterial({ map: script, side: THREE.DoubleSide, roughness: 0.9, emissive: '#3a2a00', emissiveIntensity: 0.5 });
    const strip = (length: number, v0: number, v1: number, curl: number) => {
      const g = new THREE.PlaneGeometry(0.066, length, 2, 10);
      g.translate(0, -length / 2, 0);
      const pos = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const t = -pos.getY(i) / length;
        pos.setZ(i, Math.sin(t * Math.PI) * 0.012 + t * t * curl + Math.abs(pos.getX(i)) * 0.06);
        uv.setY(i, mix(v1, v0, t));
      }
      g.computeVertexNormals();
      return g;
    };
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.075, 0.094);
    hinge.rotation.x = -0.12;
    head.add(hinge);
    let flap: THREE.Group | null = null;
    if (a.talisman === 'torn') {
      const stub = strip(0.05, 1, 0.76, 0.0);
      const pos = stub.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.045) pos.setY(i, pos.getY(i) + (random() - 0.3) * 0.022);
      put(hinge, stub, paper);
      const rest = put(body, strip(0.16, 0.74, 0, 0.01), paper, [0.19, 0.345, 0.2], [-Math.PI / 2 + 0.1, 0, 0.9 + random()]);
      rest.castShadow = false;
    } else {
      flap = new THREE.Group();
      hinge.add(flap);
      put(flap, strip(0.21, 1, 0, a.talisman === 'on' ? 0.012 : 0.05), paper);
      if (a.talisman === 'peeling') { flap.rotation.set(-0.25, 0.3, 0.42); flap.position.set(0.012, 0, 0.004); }
      if (a.talisman === 'fluttering') flap.rotation.set(-0.95, 0, 0.1);
      put(hinge, new THREE.BoxGeometry(0.07, 0.012, 0.003), paint('#e8dca0'), [0, -0.004, 0.002]);
    }

    const energy = mood.energy;
    const flapRest = flap ? flap.rotation.x : 0;
    const rests = armGroups.map((arm) => arm.rotation.x);
    return {
      object: root,
      footprint: 0.34,
      update(_dt, time) {
        // A stiff little hop: up sharply, down flat.
        const beat = (time * (0.9 + energy * 1.6)) % 1;
        const hop = beat < 0.45 ? Math.sin(beat / 0.45 * Math.PI) : 0;
        body.position.y = hop * 0.05 * (0.25 + energy);
        armGroups.forEach((arm, i) => { arm.rotation.x = rests[i] + hop * 0.05 * (0.25 + energy); });
        for (const hand of hands) hand.rotation.z = Math.sin(time * 2 + hand.position.y) * 0.03;
        if (flap && a.talisman !== 'on') flap.rotation.x = flapRest + Math.sin(time * (3 + energy * 8)) * (a.talisman === 'fluttering' ? 0.35 : 0.08) * (0.4 + energy);
      },
      dispose: () => disposeTree(root),
    };
  },
});
