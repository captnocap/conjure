import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, paint, paintHex, score } from '@conjure/kit';

type P = [number, number, number];

function puffMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

const BASE = 230, APEX = 146.6;
const half = (y: number, base = BASE, apex = APEX) => (base / 2) * (1 - y / apex);

export default defineThing({
  questions: {
    era: choice('When are we seeing the pyramid?', {
      new: 'Newly finished: smooth faces of polished white casing and a gilded capstone flashing at the apex.',
      building: 'Under construction: two-thirds built, a mud-brick ramp winding round it, gangs hauling blocks.',
      medieval: 'Half stripped: the white casing still clinging to the lower courses and the top, quarried away elsewhere.',
      today: 'Today: rough stepped courses of yellow limestone, the summit broken flat, a survey mast where the point was.',
    }),
    companions: choice('What stands beside it?', {
      alone: 'Nothing: it stands alone on the plateau.',
      queens: 'The row of three small queens\' pyramids at its east side.',
      khafre: 'The second pyramid behind it, a patch of white casing still on its tip.',
      both: 'Both the queens\' pyramids and the second pyramid behind.',
    }),
    visitors: choice('Who is at its base?', {
      none: 'Nobody: the plateau empty.',
      camels: 'A guide leading a string of camels along the base.',
      climbers: 'A line of tiny climbers scrambling up the north-east edge.',
      queue: 'Tourists queueing at the entrance in the north face.',
    }),
    show: choice('Is it lit for the sound-and-light show?', {
      off: 'No: only sunlight on stone.',
      wash: 'Yes: one face flooded in strong coloured light.',
      both: 'Yes: two faces each in their own colour.',
    }),
    showColour: paint('If it is lit, what colour is the light on the north face?', ['amber', 'gold', 'red', 'magenta', 'purple', 'blue', 'turquoise', 'green', 'white']),
    sideColour: paint('If two faces are lit, what colour is the second?', ['blue', 'purple', 'magenta', 'turquoise', 'gold', 'red', 'green']),
    storm: score('How much sand is blowing?', ['Still clear air', 'A low drift of sand along the ground', 'A sandstorm rolling across, the base lost in it']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));
    const wear = mood.wear;
    const showOn = a.show !== 'off';
    const northHex = paintHex(a.showColour), sideHex = a.show === 'both' ? paintHex(a.sideColour) : northHex;

    const limestone = s.material(new THREE.Color('#d9b878').lerp(new THREE.Color('#b0936a'), wear * 0.4), { roughness: 0.95 });
    const casing = s.material(new THREE.Color('#efe2c6').lerp(new THREE.Color('#cfc2a6'), wear * 0.5), { roughness: a.era === 'new' ? 0.35 : 0.8 });
    const gold = s.material('#d4a537', { metalness: 0.9, roughness: 0.2, emissive: '#7a5410', emissiveIntensity: mix(0.1, 0.5, glow) });
    const dark = s.material('#2a2420', { roughness: 0.9 });
    const sand = s.material(new THREE.Color('#e2c58e').lerp(new THREE.Color('#c4a57a'), wear * 0.3), { roughness: 1 });

    // The plateau of sand round the base.
    s.surface((u, v, t) => {
      const th = u * Math.PI * 2;
      const edge = 1 + Math.sin(th * 4 + random()) * 0.04;
      t.set(Math.cos(th) * v * 150 * edge, 1.2 * (1 - v * v), Math.sin(th) * v * 150 * edge);
    }, sand, { segments: [40, 6], wrap: true });

    const top = a.era === 'building' ? APEX * 0.64 : a.era === 'today' ? 138.5 : APEX;
    const stepped = a.era !== 'new';
    if (stepped) {
      // Stepped courses as one instanced stack, each with a little irregularity, eroded more at the corners with wear.
      const COURSE = 2.4;
      const courses = Math.floor(top / COURSE);
      const stack = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), limestone, courses * 2);
      const m = new THREE.Matrix4(), c = new THREE.Color();
      let n = 0;
      for (let i = 0; i < courses; i++) {
        const y = i * COURSE;
        const w = half(y + COURSE) * 2 + 1.4;
        const nibble = (random() - 0.5) * (0.8 + wear * 1.6);
        m.makeScale(w + nibble, COURSE * 0.96, w - nibble).setPosition((random() - 0.5) * 0.4, y + COURSE / 2, (random() - 0.5) * 0.4);
        stack.setMatrixAt(n, m);
        stack.setColorAt(n++, c.setHSL(0.1, 0.35 + random() * 0.1, 0.62 + random() * 0.08 + (i % 2) * 0.03));
        // A darker joint line ringing each course.
        m.makeScale(w - 0.9, COURSE * 0.08, w - 0.9).setPosition(0, y + COURSE * 0.98, 0);
        stack.setMatrixAt(n, m);
        stack.setColorAt(n++, c.setHSL(0.09, 0.3, 0.42));
      }
      stack.count = n;
      stack.instanceMatrix.needsUpdate = true;
      if (stack.instanceColor) stack.instanceColor.needsUpdate = true;
      stack.castShadow = stack.receiveShadow = true;
      s.root.add(stack);
      // Fallen and quarried blocks round the foot.
      s.scatter(new THREE.BoxGeometry(1, 0.7, 0.8), limestone, Array.from({ length: Math.round(20 + wear * 40) }, () => {
        const side = Math.floor(random() * 4), t = (random() - 0.5) * BASE;
        const d = BASE / 2 + 3 + random() * 10;
        const at: P = side === 0 ? [t, 0.8, d] : side === 1 ? [t, 0.8, -d] : side === 2 ? [d, 0.8, t] : [-d, 0.8, t];
        return { at, size: 2 + random() * 2.5 };
      }));
    }
    // Smooth casing: the whole envelope when new, or the lower courses and the cap when half stripped.
    const envelope = (y0: number, y1: number, material: THREE.Material) => {
      const r0 = half(y0) * Math.SQRT2, r1 = half(y1) * Math.SQRT2;
      const geo = new THREE.CylinderGeometry(r1, r0, y1 - y0, 4, 1).rotateY(Math.PI / 4);
      return s.mesh(geo, material, [0, (y0 + y1) / 2, 0]);
    };
    if (a.era === 'new') {
      envelope(0, APEX - 9, casing);
      const cap = envelope(APEX - 9, APEX, gold);
      void cap;
    }
    if (a.era === 'medieval') {
      envelope(0, 14, casing).scale.set(1.01, 1, 1.01);
      envelope(APEX - 32, APEX, casing).scale.set(1.02, 1, 1.02);
    }
    if (a.era === 'today') {
      // A few casing stones at the foot of the north face, and the survey mast on the broken summit.
      s.scatter(new THREE.BoxGeometry(1, 1, 1), casing, Array.from({ length: 14 }, (_u, i) => ({ at: [-30 + i * 4.4, 1.2, BASE / 2 + 1.2] as P, size: 1.8 })));
      const mast = s.material('#8a8a86', { metalness: 0.6, roughness: 0.4 });
      s.rod([0, top, 0], [0, top + 9.6, 0], 0.18, mast, 0.12);
      for (const t of [0, 2.1, 4.2]) s.rod([Math.sin(t) * 2.4, top, Math.cos(t) * 2.4], [0, top + 5, 0], 0.08, mast);
      s.scatter(new THREE.BoxGeometry(1, 1, 1), limestone, Array.from({ length: 10 }, () => ({ at: [(random() - 0.5) * 8, top + 0.6, (random() - 0.5) * 8] as P, size: 1.2 + random() })));
    }
    if (a.era === 'building') {
      // A mud-brick ramp climbing round the faces, and haulers dotted on it.
      const brick = s.material('#8e6a48', { roughness: 1 });
      const pts: { at: P; size: P; rot: number }[] = [];
      let y = 0;
      for (let lap = 0; lap < 8 && y < top - 6; lap++) {
        const face = lap % 4, rise = 10;
        const yMid = y + rise / 2, d = half(yMid) + 5;
        const rot = face * Math.PI / 2;
        pts.push({ at: [Math.sin(rot) * d, yMid / 2, Math.cos(rot) * d], size: [half(yMid) * 1.7, yMid, 9], rot });
        y += rise;
      }
      for (const p of pts) {
        const ramp = s.box(p.size, p.at, brick);
        ramp.rotation.y = p.rot;
      }
      s.scatter(new THREE.SphereGeometry(1, 5, 4), dark, Array.from({ length: 80 }, () => {
        const face = Math.floor(random() * 4), rot = face * Math.PI / 2, yy = random() * top;
        const d = half(yy) + 4, t = (random() - 0.5) * half(yy) * 1.4;
        return { at: [Math.sin(rot) * d + Math.cos(rot) * t, Math.max(1.5, yy * 0.6) + 1, Math.cos(rot) * d - Math.sin(rot) * t] as P, size: 0.9 };
      }));
      s.scatter(new THREE.BoxGeometry(1, 1, 1), s.material('#e6d6b0'), Array.from({ length: 24 }, () => ({ at: [(random() - 0.5) * half(top) * 1.6, top + 1.2, (random() - 0.5) * half(top) * 1.6] as P, size: 2.2 })));
    }

    // The entrance on the north face (+z): a dark slot under gabled chevron blocks, offset east.
    if (a.era !== 'new' && a.era !== 'building') {
      const ey = 17, ez = half(ey) + 1.2;
      s.box([2.2, 3, 4], [7, ey, ez - 1], dark);
      for (const x of [-1, 1]) { const slab = s.box([4.6, 1.3, 3], [7 + x * 1.6, ey + 3.2, ez], casing); slab.rotation.z = -x * 0.6; }
      s.box([2.4, 2.6, 4], [7, 7.5, half(7.5) + 0.8], dark);
    }

    // Light-show washes: emissive planes over the faces.
    if (showOn) {
      const washFace = (rot: number, hex: string) => {
        const shape = new THREE.Shape();
        const tilt = Math.atan2(BASE / 2, APEX);
        const slant = top / Math.cos(tilt), hw = half(top) + 0.5;
        shape.moveTo(-BASE / 2 - 1, 0); shape.lineTo(BASE / 2 + 1, 0); shape.lineTo(hw, slant); shape.lineTo(-hw, slant); shape.closePath();
        const geo = new THREE.ShapeGeometry(shape);
        const mesh = s.mesh(geo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: mix(0.25, 0.5, glow), depthWrite: false, side: THREE.DoubleSide }), [Math.sin(rot) * (BASE / 2 + 1.5), 0, Math.cos(rot) * (BASE / 2 + 1.5)]);
        mesh.rotation.set(-tilt, rot, 0, 'YXZ');
        mesh.castShadow = false;
      };
      washFace(0, northHex);
      washFace(Math.PI / 2, sideHex);
    }

    // Companions.
    const companion = (x: number, z: number, base: number, apex: number, capCasing: boolean) => {
      const courses = 14;
      for (let i = 0; i < courses; i++) {
        const y0 = (i / courses) * apex, y1 = ((i + 1) / courses) * apex;
        const geo = new THREE.CylinderGeometry(half(y1, base, apex) * Math.SQRT2, half(y0, base, apex) * Math.SQRT2 + 0.6, y1 - y0, 4, 1).rotateY(Math.PI / 4);
        s.mesh(geo, capCasing && i >= courses - 3 ? casing : limestone, [x, (y0 + y1) / 2, z]);
      }
    };
    if (a.companions === 'queens' || a.companions === 'both') for (let i = 0; i < 3; i++) companion(BASE / 2 + 45, 60 - i * 55, 46, 30, false);
    if (a.companions === 'khafre' || a.companions === 'both') companion(-170, -210, 215, 136, true);

    // People and camels at the base.
    const skins = ['#c9956a', '#a8724b', '#e2b894', '#7c5236'];
    const at = (x: number, z: number, p: ReturnType<typeof figure>, rot: number) => { s.root.add(p.root); p.root.position.set(x, 1.1, z); p.root.rotation.y = rot; };
    if (a.visitors === 'camels') {
      const hide = s.material('#b88f5e', { roughness: 0.95 }), blanket = s.material('#b0302a');
      for (let i = 0; i < 5; i++) {
        const cx = 20 + i * 3.6, cz = BASE / 2 + 14;
        s.ball([1.5, 0.75, 0.6], [cx, 2.9, cz], hide, 12);
        s.ball([0.6, 0.55, 0.45], [cx, 3.55, cz], hide, 10);
        s.box([1.1, 0.12, 0.95], [cx, 3.4, cz], blanket);
        s.rod([cx - 1.3, 3.0, cz], [cx - 1.9, 4.1, cz], 0.2, hide, 0.15);
        for (const dx of [-0.9, 0.9]) for (const dz of [-0.25, 0.25]) s.rod([cx + dx, 2.6, cz + dz], [cx + dx * 1.05, 1.2, cz + dz], 0.09, hide);
      }
      at(16, BASE / 2 + 14, figure(s, { height: 1.75, style: 'doll', pose: 'walking', hair: 'hood', top: '#efe9dc', bottom: '#efe9dc', skin: skins[1] }), -Math.PI / 2);
    }
    if (a.visitors === 'queue') for (let i = 0; i < 8; i++) at(4 + i * 1.6 + random(), BASE / 2 + 6 + random() * 2, figure(s, { height: 1.7, style: 'doll', pose: 'standing', hair: i % 2 ? 'cap' : 'short', top: ['#e24a3a', '#3a6ad4', '#f2f0e8', '#e6c43a'][i % 4], bottom: '#d8cfb6', skin: skins[i % 4] }), Math.PI + (random() - 0.5));
    if (a.visitors === 'climbers' && stepped) {
      s.scatter(new THREE.CapsuleGeometry(0.4, 1, 2, 6), s.material('#3a3a40'), Array.from({ length: 16 }, (_u, i) => {
        const y = 4 + i * (top * 0.7) / 16, d = half(y) - 1;
        return { at: [d * 0.98, y + 1.8, d * 0.98] as P, size: 1, color: ['#e24a3a', '#f2f0e8', '#3a6ad4'][i % 3] };
      }));
    }

    // Blowing sand: long low veils, rising into a storm.
    const storm = Math.min(1, a.storm + wear * 0.2);
    if (storm > 0.08) {
      const puff = puffMap();
      const veil = new THREE.MeshBasicMaterial({ map: puff, color: '#dcbb86', transparent: true, opacity: Math.min(0.58, 0.15 + storm * 0.45), depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < Math.round(6 + storm * 16); i++) {
        const w = 120 + random() * 140;
        const h = 18 + storm * 70 * random();
        s.mesh(new THREE.PlaneGeometry(w, h), veil, [(random() - 0.5) * 260, h * 0.35, BASE / 2 + 10 + random() * 60 - storm * 40 * random()]).castShadow = false;
      }
    }

    // Turned a little off square so a frontal camera sees two faces and the north-east arris, not a flat triangle.
    const turn = new THREE.Group();
    turn.add(...s.root.children);
    turn.rotation.y = -0.5;
    s.root.add(turn);
    return s.finish({ footprint: BASE / 2 });
  },
});
