import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

const LIQUIDS = {
  blue: 'The classic electric blue.',
  green: 'Mint mouthwash green.',
  pink: 'Bubblegum pink, a newer brand.',
  amber: 'Gone amber-brown: nobody has changed it in months.',
  cloudy: 'Cloudy grey-white, full of hair and soap.',
  clear: 'Almost clear, just water with a blue ghost in it.',
} as const;
const LIQUID_TINT: Record<keyof typeof LIQUIDS, string> = { blue: '#1687e0', green: '#2fc48a', pink: '#f25a9c', amber: '#b9772a', cloudy: '#b9bfc0', clear: '#cfe6f2' };

export default defineThing({
  questions: {
    liquid: choice('What colour is the liquid in the jar?', LIQUIDS),
    level: score('How full is the jar?', ['Dried to a crust at the bottom', 'A third left', 'Two thirds', 'Brimming']),
    contents: choice('What stands in the jar?', {
      empty: 'Nothing: the jar holds only liquid.',
      lone: 'One lone black comb.',
      combs: 'A handful of combs in different colours.',
      mixed: 'Combs and a pair of scissors, handles up.',
      crowded: 'A crowded bouquet: combs, two pairs of scissors, a rat-tail comb, clips.',
    }),
    lid: choice('Where is the lid?', {
      on: 'On, chrome knob and all, everything sealed inside.',
      lifted: 'Lifted: the lid is raised on its stem with the tool basket dripping beneath it.',
      beside: 'Off, lying on the towel beside the jar.',
      missing: 'Long lost: the jar stands open.',
    }),
    razor: choice('What about the straight razor?', {
      open: 'Open on the towel, blade out, ready.',
      closed: 'Folded shut in its handle.',
      stropping: 'Laid across the strop mid-sharpening.',
      absent: 'There is no razor.',
    }),
    strop: choice('How is the leather strop lying?', {
      flat: 'Stretched out flat beside the towel.',
      curled: 'Curled back on itself in a loose S.',
      none: 'There is no strop.',
    }),
    towel: choice('What is the towel like?', {
      white: 'A plain white hand towel, bleached and folded square.',
      striped: 'White with blue stripes along the edge, barber-shop standard.',
      burgundy: 'Dark burgundy, so the stains do not show.',
      checked: 'A red-checked kitchen cloth pressed into service.',
    }),
    companion: choice('What else sits with them?', {
      none: 'Nothing else.',
      mug: 'A shaving mug with a badger brush standing in the lather.',
      talc: 'A round tin of talc with a powder puff.',
      alum: 'A styptic alum block and a folded paper neck strip.',
      tips: 'A few coins and a folded banknote left as a tip.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const chrome = s.material('#e1e5e6', { metalness: 0.95, roughness: mix(0.12, 0.45, mood.wear) });
    const dark = s.material('#1c1c1d', { roughness: 0.45 });
    const tint = LIQUID_TINT[a.liquid];

    // Towel: a slab with a little life in it, painted by canvas.
    const tw = 0.36, td = 0.25;
    const cloth = document.createElement('canvas');
    cloth.width = 256; cloth.height = 168;
    const c = cloth.getContext('2d')!;
    c.fillStyle = a.towel === 'burgundy' ? '#6a1f2b' : '#f2efe6';
    c.fillRect(0, 0, 256, 168);
    if (a.towel === 'striped') { c.fillStyle = '#2f62b0'; for (const x of [14, 26, 222, 234]) c.fillRect(x, 0, 7, 168); }
    if (a.towel === 'checked') {
      c.fillStyle = 'rgba(200,40,45,0.55)';
      for (let x = 0; x < 256; x += 32) c.fillRect(x, 0, 16, 168);
      for (let y = 0; y < 168; y += 32) c.fillRect(0, y, 256, 16);
    }
    if (a.towel === 'burgundy') { c.fillStyle = '#8a3040'; c.fillRect(0, 12, 256, 6); c.fillRect(0, 150, 256, 6); }
    for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(0,0,0,${random() * 0.05})`; c.fillRect(random() * 256, random() * 168, 2, 2); }
    const stains = Math.floor(mood.wear * 7);
    for (let i = 0; i < stains; i++) {
      c.fillStyle = `rgba(${a.liquid === 'amber' ? '150,100,40' : '40,110,190'},${0.12 + random() * 0.2})`;
      c.beginPath(); c.ellipse(random() * 256, random() * 168, 8 + random() * 22, 6 + random() * 14, random() * 3, 0, 6.3); c.fill();
    }
    const clothMap = new THREE.CanvasTexture(cloth);
    clothMap.colorSpace = THREE.SRGBColorSpace;
    const towelGeo = new THREE.BoxGeometry(tw, 0.014, td, 24, 1, 16);
    const tp = towelGeo.attributes.position as THREE.BufferAttribute;
    const ph = random() * 6;
    for (let i = 0; i < tp.count; i++) {
      const x = tp.getX(i), z = tp.getZ(i);
      tp.setY(i, tp.getY(i) + Math.sin(x * 23 + ph) * Math.cos(z * 19 + ph) * 0.0025);
    }
    towelGeo.computeVertexNormals();
    const towel = s.mesh(towelGeo, new THREE.MeshStandardMaterial({ map: clothMap, roughness: 1 }), [0, 0.008, 0]);
    towel.rotation.y = (random() - 0.5) * 0.16;
    const top = 0.0165;

    // The jar.
    const jx = -0.075, jz = -0.03, R = 0.052, H = 0.26;
    s.cylinder(R + 0.008, R + 0.012, 0.014, [jx, top + 0.007, jz], chrome, 32);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const wall = s.mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, true), glass, [jx, top + 0.014 + H / 2, jz]);
    wall.castShadow = false;
    s.ring(R, 0.003, [jx, top + 0.014 + H, jz], new THREE.MeshStandardMaterial({ color: '#e8f4f6', transparent: true, opacity: 0.7, roughness: 0.1 })).rotation.x = Math.PI / 2;
    // A streak of highlight so the glass reads without a reflection.
    const streak = s.mesh(new THREE.CylinderGeometry(R + 0.0005, R + 0.0005, H * 0.86, 6, 1, true, 0.5, 0.22), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, emissive: '#ffffff', emissiveIntensity: 0.3 }), [jx, top + 0.014 + H / 2, jz]);
    streak.castShadow = false;
    const fill = a.level < 0.08 ? 0 : mix(0.2, 0.94, a.level) * H;
    const floorY = top + 0.016;
    if (fill > 0) {
      const liquid = new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: a.liquid === 'cloudy' ? 0.9 : a.liquid === 'clear' ? 0.45 : 0.86, roughness: 0.08, emissive: tint, emissiveIntensity: mix(0.1, 0.35, mood.cheer), depthWrite: false });
      s.cylinder(R - 0.003, R - 0.003, fill, [jx, floorY + fill / 2, jz], liquid, 32).castShadow = false;
      s.cylinder(R - 0.003, R - 0.003, 0.002, [jx, floorY + fill, jz], new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.45), transparent: true, opacity: 0.8, roughness: 0.05 }), 32);
    } else {
      s.cylinder(R - 0.004, R - 0.004, 0.006, [jx, floorY + 0.003, jz], s.material(tint, { roughness: 1 }), 24);
      s.mesh(new THREE.CylinderGeometry(R - 0.002, R - 0.002, 0.05, 24, 1, true), new THREE.MeshStandardMaterial({ color: tint, transparent: true, opacity: 0.35, roughness: 1, side: THREE.DoubleSide }), [jx, floorY + 0.025, jz]);
    }
    // Label wrapped on the front of the glass.
    const lc = document.createElement('canvas');
    lc.width = 256; lc.height = 128;
    const l = lc.getContext('2d')!;
    l.fillStyle = '#f6f2e6'; l.fillRect(0, 0, 256, 128);
    l.fillStyle = '#c0202a'; l.fillRect(0, 0, 256, 30); l.fillRect(0, 104, 256, 24);
    l.fillStyle = '#1c2f6a'; l.font = 'bold 34px monospace'; l.textAlign = 'center'; l.fillText('GERMICIDE', 128, 72, 236);
    l.font = 'bold 16px monospace'; l.fillText('FOR COMBS & SHEARS', 128, 95, 236);
    const labelMap = new THREE.CanvasTexture(lc);
    labelMap.colorSpace = THREE.SRGBColorSpace;
    s.mesh(new THREE.CylinderGeometry(R + 0.001, R + 0.001, 0.05, 20, 1, true, -0.75, 1.5), new THREE.MeshStandardMaterial({ map: labelMap, roughness: 0.7 }), [jx, top + 0.075, jz]);

    // Lid, stem and basket; the tools ride on the basket when it is lifted.
    const lift = a.lid === 'lifted' ? mix(0.09, 0.13, random()) : 0;
    const lidY = top + 0.014 + H + lift;
    const lidParts = (x: number, y: number, z: number, flipped: boolean) => {
      const g = new THREE.Group();
      g.add(s.cylinder(R + 0.007, R + 0.007, 0.016, [0, 0.008, 0], chrome, 32));
      g.add(s.cylinder(R * 0.5, R + 0.004, 0.012, [0, 0.022, 0], chrome, 32));
      g.add(s.cylinder(0.006, 0.006, 0.02, [0, 0.036, 0], chrome, 10));
      g.add(s.ball([0.013, 0.011, 0.013], [0, 0.05, 0], dark, 14));
      g.position.set(x, y, z);
      if (flipped) { g.rotation.x = Math.PI; g.position.y += 0.062; }
      s.root.add(g);
    };
    if (a.lid === 'on' || a.lid === 'lifted') {
      lidParts(jx, lidY, jz, false);
      s.cylinder(0.003, 0.003, H - 0.01, [jx, lidY - (H - 0.01) / 2, jz], chrome, 8);
      s.cylinder(R - 0.008, R - 0.008, 0.004, [jx, floorY + 0.004 + lift, jz], chrome, 24);
      if (lift) for (let i = 0; i < 4; i++) {
        const t = random() * 6.283, r = random() * (R - 0.012);
        s.ball([0.004, 0.009, 0.004], [jx + Math.cos(t) * r, floorY + lift - 0.012 - random() * 0.03, jz + Math.sin(t) * r], s.material(tint, { roughness: 0.1 }), 8);
      }
    } else if (a.lid === 'beside') lidParts(0.02 + random() * 0.03, top, 0.09, random() < 0.5);

    const open = a.lid === 'beside' || a.lid === 'missing';
    const tools = new THREE.Group();
    tools.position.set(jx, floorY + 0.008 + lift, jz);
    s.root.add(tools);
    // Comb teeth: one shared alpha-tested strip.
    const tc = document.createElement('canvas');
    tc.width = 16; tc.height = 256;
    const tx = tc.getContext('2d')!;
    tx.fillStyle = '#fff';
    for (let y = 2; y < 256; y += 8) tx.fillRect(0, y, 16, 4);
    const teeth = new THREE.CanvasTexture(tc);
    const COMB = ['#19191a', '#19191a', '#8a4a1e', '#e94f8a', '#f1ecdc', '#2f7fd0', '#e0b020'];
    const comb = (angle: number, radius: number, colour: string, tall: number, rat = false) => {
      const g = new THREE.Group();
      const mat = s.material(colour, { roughness: 0.35 });
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      const body = rat ? tall * 0.5 : tall;
      add(s.box([0.009, body, 0.004], [-0.011, tall - body / 2, 0], mat));
      add(s.mesh(new THREE.PlaneGeometry(0.022, body), new THREE.MeshStandardMaterial({ color: mat.color, alphaMap: teeth, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.4 }), [0.004, tall - body / 2, 0]));
      if (rat) add(s.rod([-0.011, tall - body, 0], [-0.011, 0, 0], 0.003, mat, 0.0012));
      g.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      g.rotation.set(Math.sin(angle) * 0.1 * (open ? 1.6 : 0.6), -angle + random() * 2, -Math.cos(angle) * 0.1 * (open ? 1.6 : 0.6));
      tools.add(g);
    };
    const scissors = (angle: number, radius: number) => {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      const tall = open ? 0.25 : 0.2;
      for (const side of [-1, 1]) {
        const blade = add(s.box([0.008, tall * 0.62, 0.002], [side * 0.004, tall * 0.31, side * 0.001], chrome));
        blade.rotation.z = side * 0.05;
        add(s.rod([side * 0.008, tall * 0.6, 0], [side * 0.016, tall * 0.84, 0], 0.003, chrome));
        add(s.ring(0.012, 0.003, [side * 0.02, tall * 0.9, 0], random() < 0.5 ? chrome : dark));
      }
      add(s.cylinder(0.004, 0.004, 0.006, [0, tall * 0.62, 0], dark, 8)).rotation.x = Math.PI / 2;
      g.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      g.rotation.set(Math.sin(angle) * 0.12, random() * 3, -Math.cos(angle) * 0.12);
      tools.add(g);
    };
    const maxTall = open ? 0.27 : H - 0.035;
    const tallOf = () => mix(0.16, maxTall, random());
    const n = { empty: 0, lone: 1, combs: 4 + Math.round(mood.density * 2), mixed: 3 + Math.round(mood.density * 2), crowded: 6 + Math.round(mood.density * 3) }[a.contents];
    for (let i = 0; i < n; i++) comb((i / Math.max(n, 1)) * 6.283 + random() * 0.5, n === 1 ? 0.012 : 0.018 + random() * 0.014, a.contents === 'lone' ? COMB[0] : COMB[Math.floor(random() * COMB.length)], tallOf(), a.contents === 'crowded' && i === 0);
    if (a.contents === 'mixed' || a.contents === 'crowded') scissors(random() * 6.283, 0.012);
    if (a.contents === 'crowded') {
      scissors(random() * 6.283, 0.02);
      for (let i = 0; i < 3; i++) s.box([0.05, 0.006, 0.008], [jx + 0.09 + i * 0.012, top + 0.004, jz - 0.07 + i * 0.022], chrome).rotation.y = random() * 3;
    }

    // The strop: a leather strap with a ring at one end and a handle at the other.
    const leather = s.material('#6b3d22', { roughness: 0.6, side: THREE.DoubleSide });
    let stropMid: V3 | null = null, stropTurn = 0;
    if (a.strop !== 'none') {
      const z0 = td / 2 + 0.055;
      const path: V3[] = a.strop === 'flat'
        ? [[-0.21, 0.004, z0], [-0.08, 0.004, z0 + 0.01], [0.08, 0.004, z0 - 0.006], [0.21, 0.004, z0 + 0.005]]
        : [[-0.2, 0.004, z0 + 0.025], [-0.08, 0.004, z0 - 0.015], [0.03, 0.012, z0 + 0.03], [0.12, 0.03, z0 + 0.06], [0.17, 0.05, z0 + 0.015], [0.12, 0.03, z0 - 0.025], [0.04, 0.008, z0 - 0.025]];
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      const seg = 40, width = 0.055;
      const geo = new THREE.PlaneGeometry(1, 1, 1, seg);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= seg; i++) {
        const at = curve.getPoint(i / seg), tan = curve.getTangent(i / seg);
        const nx = -tan.z, nz = tan.x, len = Math.hypot(nx, nz) || 1;
        p.setXYZ(i * 2, at.x + (nx / len) * width / 2, at.y, at.z + (nz / len) * width / 2);
        p.setXYZ(i * 2 + 1, at.x - (nx / len) * width / 2, at.y, at.z - (nz / len) * width / 2);
      }
      geo.computeVertexNormals();
      s.mesh(geo, leather);
      const first = curve.getPoint(0), last = curve.getPoint(1), t0 = curve.getTangent(0), t1 = curve.getTangent(1);
      const ring = s.ring(0.022, 0.004, [first.x - t0.x * 0.02, 0.005, first.z - t0.z * 0.02], chrome);
      ring.rotation.x = Math.PI / 2;
      const grip = s.cylinder(0.014, 0.014, 0.07, [last.x + t1.x * 0.02, last.y + 0.012, last.z + t1.z * 0.02], dark, 12);
      grip.rotation.z = Math.PI / 2; grip.rotation.y = Math.atan2(-t1.x, t1.z) + Math.PI / 2;
      const mid = curve.getPoint(0.25), mt = curve.getTangent(0.25);
      stropMid = [mid.x, mid.y, mid.z]; stropTurn = Math.atan2(-mt.z, mt.x);
    }

    // The razor.
    if (a.razor !== 'absent') {
      const g = new THREE.Group();
      const add = (m: THREE.Object3D) => { g.add(m); return m; };
      const scale = s.material(['#efe6cf', '#1c1c1d', '#7a4320', '#274a3a'][Math.floor(random() * 4)], { roughness: 0.35 });
      add(s.box([0.13, 0.012, 0.02], [0.065, 0.006, 0], scale));
      add(s.cylinder(0.01, 0.01, 0.012, [0.13, 0.006, 0], scale, 12));
      add(s.cylinder(0.004, 0.004, 0.014, [0.006, 0.006, 0], chrome, 8));
      const blade = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.004); shape.lineTo(0.03, 0.004); shape.lineTo(0.04, 0.012); shape.lineTo(0.118, 0.012); shape.quadraticCurveTo(0.128, 0, 0.118, -0.012); shape.lineTo(0.04, -0.012); shape.lineTo(0.03, -0.004); shape.lineTo(0, -0.004); shape.closePath();
      const steel = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.003, bevelEnabled: false }), chrome);
      steel.rotation.x = -Math.PI / 2;
      blade.add(steel);
      const tail = s.rod([0, 0.0015, 0], [-0.03, 0.0015, 0.012], 0.0025, chrome);
      blade.add(tail);
      blade.position.set(0.006, 0.008, 0);
      blade.rotation.y = a.razor === 'closed' ? 0.02 : Math.PI - mix(0.5, 1.1, random());
      g.add(blade);
      if (a.razor === 'stropping' && stropMid) {
        g.position.set(stropMid[0], stropMid[1] + 0.003, stropMid[2] + 0.01);
        g.rotation.y = stropTurn + 1.2;
      } else {
        g.position.set(0.0 + random() * 0.02, top, 0.045 + random() * 0.03);
        g.rotation.y = -0.25 + random() * 0.5;
      }
      {
        g.scale.setScalar(1.3);
      }
      s.root.add(g);
    }

    // Company.
    const cx = 0.095, cz = -0.055;
    if (a.companion === 'mug') {
      const china = s.material('#f1ede2', { roughness: 0.25 });
      s.lathe([[0, 0], [0.036, 0], [0.042, 0.02], [0.042, 0.065], [0.045, 0.07], [0.038, 0.07], [0.036, 0.012], [0, 0.012]], china, [cx, top, cz]);
      s.ring(0.02, 0.006, [cx + 0.05, top + 0.038, cz], china);
      s.box([0.085, 0.01, 0.001], [cx, top + 0.04, cz + 0.0425], s.material('#2f62b0'));
      s.ball([0.036, 0.016, 0.036], [cx, top + 0.064, cz], s.material('#fbfaf5', { roughness: 1 }), 14);
      const brush = new THREE.Group();
      brush.add(s.lathe([[0, 0], [0.012, 0], [0.016, 0.02], [0.01, 0.04], [0.014, 0.055], [0, 0.056]], s.material('#2a1a12', { roughness: 0.3 }), [0, 0.03, 0]));
      brush.add(s.lathe([[0.012, 0], [0.02, 0.012], [0.019, 0.026], [0, 0.03]], s.material('#b9a88a', { roughness: 1 })));
      brush.position.set(cx - 0.008, top + 0.06, cz + 0.004);
      brush.rotation.set(Math.PI + 0.35, 0, 0.3);
      brush.position.y += 0.085;
      s.root.add(brush);
    } else if (a.companion === 'talc') {
      s.cylinder(0.042, 0.042, 0.03, [cx, top + 0.015, cz], s.material('#e9d8a0', { metalness: 0.5, roughness: 0.35 }), 24);
      s.cylinder(0.043, 0.043, 0.006, [cx, top + 0.008, cz], s.material('#b3232a', { metalness: 0.4 }), 24);
      s.ball([0.036, 0.022, 0.036], [cx + 0.01, top + 0.04, cz + 0.006], s.material('#f8f4ea', { roughness: 1 }), 14);
      s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.15, 1), s.material('#fbf9f2', { roughness: 1 }),
        Array.from({ length: 14 }, () => ({ at: [cx + (random() - 0.5) * 0.16, top + 0.001, cz + (random() - 0.2) * 0.14] as V3, size: 0.004 + random() * 0.009 })));
    } else if (a.companion === 'alum') {
      s.box([0.07, 0.022, 0.045], [cx, top + 0.011, cz], new THREE.MeshStandardMaterial({ color: '#eef4f4', transparent: true, opacity: 0.85, roughness: 0.2 })).rotation.y = 0.4;
      for (let i = 0; i < 3; i++) s.box([0.12, 0.002, 0.05], [cx + 0.01, top + 0.002 + i * 0.002, cz + 0.085], s.material('#fbfaf5', { roughness: 1 })).rotation.y = -0.15 + i * 0.12;
    } else if (a.companion === 'tips') {
      const coins = Array.from({ length: 5 + Math.round(mood.density * 6) }, () => ({ at: [cx + (random() - 0.5) * 0.1, top + 0.002 + random() * 0.004, cz + (random() - 0.5) * 0.09] as V3, size: 0.009 + random() * 0.004 }));
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 14), s.material('#c9b46a', { metalness: 0.85, roughness: 0.3 }), coins);
      const note = s.box([0.075, 0.004, 0.065], [cx + 0.02, top + 0.004, cz + 0.11], s.material('#7fa886', { roughness: 0.9 }));
      note.rotation.y = random() * 1.2;
    }

    // Drips of the liquid on the towel, more when things are busy.
    if (fill > 0) {
      const drops = Math.round(mood.energy * 7) + (lift ? 4 : 0);
      for (let i = 0; i < drops; i++) {
        const t = random() * 6.283, r = R + 0.015 + random() * 0.07;
        s.cylinder(0.004 + random() * 0.006, 0.004, 0.0015, [jx + Math.cos(t) * r, top + 0.001, jz + Math.sin(t) * r * 0.8], new THREE.MeshStandardMaterial({ color: tint, roughness: 0.1, transparent: true, opacity: 0.75 }), 10);
      }
    }
    return s.finish();
  },
});
