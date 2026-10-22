import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { crew, rbox, slab, wheel } from './parts';

const LIVERY = {
  meridian: 'MERIDIAN: deep navy with a gold stripe, a dignified flag carrier.',
  solara: 'SOLARA: hot orange and yellow, a sunshine holiday charter.',
  polar: 'POLAR AIR: ice blue on white, clean and northern.',
  aerolux: 'AEROLUX: burgundy and silver, first class only.',
  transocean: 'TRANSOCEAN: teal and coral, the 1960s jet set.',
  republic: 'REPUBLIC: green and red state colours, official and stern.',
  plain: 'No airline at all: bare yellow airport equipment with hazard stripes.',
} as const;
const COLOURS: Record<keyof typeof LIVERY, [string, string, string, string]> = {
  // panel, stripe, accent, name
  meridian: ['#f1f1ec', '#1d2f5f', '#c9a23a', 'MERIDIAN'], solara: ['#fbf3df', '#ee6d1c', '#f3c81a', 'SOLARA'], polar: ['#f4f7f8', '#5fa8d8', '#1d4f7a', 'POLAR AIR'],
  aerolux: ['#ecebe8', '#7a1f2e', '#aeb4b8', 'AEROLUX'], transocean: ['#f3efe2', '#1f8f8c', '#ef7a5c', 'TRANSOCEAN'], republic: ['#f0efe6', '#1f6a3c', '#c62d2a', 'REPUBLIC'], plain: ['#eebb1a', '#222428', '#eebb1a', ''],
};

export default defineThing({
  questions: {
    mount: choice('What carries the stairs?', {
      towed: 'A towed steel frame on four small wheels with a drawbar and screw jacks.',
      truck: 'A truck: the stairs are built over a small lorry cab that peers out from underneath.',
      motor: 'A self-propelled skirted base with a tiny driving position tucked at the side.',
      pushed: 'A light tubular set on castors that two people push by hand, for small propliners.',
    }),
    height: score('How tall are the stairs?', ['A few steps, for a commuter propliner', 'Medium, for a narrow-body jet', 'Tall, for a big four-engined jet', 'Towering, for a widebody upper deck']),
    canopy: choice('Are the stairs covered?', {
      open: 'Open to the sky with plain handrails.',
      top: 'A small arched canopy over the top platform only.',
      full: 'A full tunnel canopy with windows all the way up.',
      awning: 'A striped fabric awning stretched over a frame, a little frayed.',
    }),
    livery: choice('Whose livery is on the side panels?', LIVERY),
    foot: choice('What is at the foot of the stairs?', {
      nothing: 'Bare concrete.',
      carpet: 'A red carpet rolled out across the apron.',
      ropes: 'A red carpet between brass posts and velvet ropes: somebody important is expected.',
      mat: 'A worn black rubber mat and a puddle.',
      cones: 'Two cones and a chain: these stairs are not in use.',
    }),
    top: choice('Who or what waits at the top?', {
      nothing: 'Nothing. The last step opens onto empty sky.',
      door: 'A slice of airliner fuselage with its door open, as if the rest of the aircraft had been erased.',
      figure: 'A single figure on the platform with one arm raised, waving.',
      luggage: 'Two suitcases and a hat left on the platform.',
      flowers: 'A bouquet laid on the top step.',
      closed: 'A chain across the top with a small sign: the flight has gone.',
    }),
    lights: choice('How are the step lights?', {
      on: 'Every tread edge is lit, a glowing ladder.',
      off: 'Unlit.',
      failing: 'Mostly dead, a few treads still glowing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [panelHex, stripeHex, accentHex, name] = COLOURS[a.livery];
    const panel = s.material(panelHex, { roughness: 0.5 }), stripe = s.material(stripeHex, { roughness: 0.5 }), accent = s.material(accentHex, { roughness: 0.45, metalness: a.livery === 'meridian' || a.livery === 'aerolux' ? 0.6 : 0.1 });
    const dark = s.material('#2a2d30', { roughness: 0.7 }), tyre = s.material('#1b1c1e', { roughness: 0.9 }), hub = s.material('#d9d8d0', { metalness: 0.3 });
    const steel = s.material('#aab0b2', { metalness: 0.6, roughness: 0.4 }), frame = s.material(a.livery === 'plain' ? '#eebb1a' : '#8f979a', { metalness: 0.4, roughness: 0.5 });
    const red = s.material('#b4202a', { roughness: 0.9 });
    const carpeted = a.foot === 'carpet' || a.foot === 'ropes';

    let H = mix(1.5, 5.4, a.height);
    if (a.mount === 'pushed') H = Math.min(H, 2.3);
    if (a.mount === 'truck') H = Math.max(H, 3.1);
    const run = H * 1.45, W = 1.5;
    const xf = -run / 2 - 0.8, xt = xf + run, pl = 1.5, y0 = 0.22;
    const angle = Math.atan2(H - y0, run);
    const onLine = (t: number, lift = 0): [number, number] => [mix(xf, xt, t), mix(y0, H, t) + lift];

    // ---- Stair body: solid underside, treads, side panels with the stripe.
    slab(s, [[xf, y0 - 0.14], [xt, H - 0.2], [xt + pl, H - 0.2], [xt + pl, H], [xt, H], [xf, y0]], W - 0.08, dark, 0, 0.01);
    const N = Math.max(4, Math.round((H - y0) / 0.19));
    const glowOn = a.lights !== 'off';
    const treadMat = carpeted ? red : s.material('#6f7577', { metalness: 0.5, roughness: 0.6 });
    const edgeOn = new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd98a', emissiveIntensity: mix(0.9, 2.6, Math.abs(mood.daylight - 0.5) * 2) });
    const edgeOff = s.material('#d8c98a');
    for (let i = 0; i < N; i++) {
      const [x, y] = onLine((i + 0.5) / N);
      s.box([run / N + 0.03, 0.05, W - 0.1], [x, y + (H - y0) / N / 2, 0], treadMat);
      const lit = glowOn && (a.lights === 'on' || random() < 0.3);
      s.box([0.03, 0.035, W - 0.14], [x - run / N / 2, y + (H - y0) / N / 2 + 0.01, 0], lit ? edgeOn : edgeOff);
    }
    s.box([pl, 0.06, W - 0.06], [xt + pl / 2, H + 0.01, 0], carpeted ? red : treadMat);
    s.box([0.1, 0.22, W + 0.1], [xt + pl + 0.05, H - 0.08, 0], dark);
    const guard = a.mount === 'pushed' ? 0 : 1.05;
    for (const z of [-1, 1]) {
      const zz = z * (W / 2 + 0.01);
      if (a.mount === 'pushed') {
        // Tubular handrails on posts.
        for (let i = 0; i <= 3; i++) { const [x, y] = onLine(i / 3); s.rod([x, y, zz], [x, y + 1.0, zz], 0.02, steel); }
        s.rod([xf, y0 + 1.0, zz], [xt, H + 1.0, zz], 0.022, steel); s.rod([xt, H + 1.0, zz], [xt + pl, H + 1.0, zz], 0.022, steel); s.rod([xt + pl, H, zz], [xt + pl, H + 1.0, zz], 0.02, steel);
        s.rod([xf, y0 + 0.5, zz], [xt, H + 0.5, zz], 0.014, steel);
        slab(s, [[xf, y0 - 0.1], [xt, H - 0.14], [xt + pl, H - 0.14], [xt + pl, H + 0.12], [xt, H + 0.12], [xf, y0 + 0.16]], 0.03, stripe, zz, 0.005);
        continue;
      }
      slab(s, [[xf, y0 - 0.1], [xt, H - 0.14], [xt + pl, H - 0.14], [xt + pl, H + guard], [xt, H + guard], [xf, y0 + guard]], 0.04, panel, zz, 0.008);
      slab(s, [[xf, y0 + 0.4], [xt, H + 0.4], [xt + pl, H + 0.4], [xt + pl, H + 0.66], [xt, H + 0.66], [xf, y0 + 0.66]], 0.02, stripe, zz + z * 0.022, 0.004);
      slab(s, [[xf, y0 + 0.3], [xt, H + 0.3], [xt + pl, H + 0.3], [xt + pl, H + 0.36], [xt, H + 0.36], [xf, y0 + 0.36]], 0.02, accent, zz + z * 0.022, 0.004);
      s.rod([xf, y0 + guard + 0.03, zz], [xt, H + guard + 0.03, zz], 0.03, steel); s.rod([xt, H + guard + 0.03, zz], [xt + pl, H + guard + 0.03, zz], 0.03, steel);
      if (name && H > 2.2) {
        const [lx, ly] = onLine(0.55, 0.82);
        const label = s.label(name, Math.min(run * 0.5, name.length * 0.3), 0.26, [lx, ly, zz + z * 0.04], stripeHex, panelHex);
        if (z > 0) label.rotation.z = angle; else label.rotation.set(0, Math.PI, -angle);
      }
      if (a.livery === 'plain') for (let i = 0; i < 6; i++) { const [x, y] = onLine((i + 0.5) / 6, 0.85); const d = s.box([0.5, 0.1, 0.01], [x, y, zz + z * 0.03], stripe); d.rotation.z = angle + 0.9; }
    }

    // ---- Canopy.
    const roofMat = a.canopy === 'awning' ? red : panel;
    const post = (x: number, y: number, h: number) => { for (const z of [-1, 1]) s.rod([x, y, z * (W / 2 + 0.01)], [x, y + h, z * (W / 2 + 0.01)], 0.025, steel); };
    const clear = new THREE.MeshStandardMaterial({ color: '#9fc4dc', transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const base = a.mount === 'pushed' ? 1.0 : guard;
    if (a.canopy === 'top' || (a.canopy !== 'open' && a.mount === 'pushed')) {
      post(xt + 0.1, H + base, 2.15 - base); post(xt + pl - 0.08, H + base, 2.15 - base);
      rbox(s, [pl + 0.3, 0.14, W + 0.2], [xt + pl / 2, H + 2.2, 0], roofMat, 0.06);
      s.box([pl + 0.32, 0.05, W + 0.22], [xt + pl / 2, H + 2.14, 0], stripe);
    } else if (a.canopy === 'full' || a.canopy === 'awning') {
      const top = 2.2;
      slab(s, [[xf + 0.5, y0 + top + 0.2], [xt, H + top], [xt + pl + 0.1, H + top], [xt + pl + 0.1, H + top + 0.1], [xt, H + top + 0.1], [xf + 0.5, y0 + top + 0.3]], W + 0.16, roofMat, 0, 0.03);
      const bays = Math.max(2, Math.round(run / 1.6));
      for (let i = 0; i <= bays; i++) { const t = mix(0.08, 1, i / bays); const [x, y] = onLine(t); post(x, y + base, top - base + (t < 0.2 ? 0.15 : 0)); }
      post(xt + pl - 0.05, H + base, top - base);
      if (a.canopy === 'full') for (const z of [-1, 1]) slab(s, [[xf + 0.5, y0 + base], [xt, H + base], [xt + pl, H + base], [xt + pl, H + top], [xt, H + top], [xf + 0.5, y0 + top + 0.2]], 0.01, clear, z * (W / 2 + 0.02), 0);
      else {
        // Scalloped valance in two colours.
        for (let i = 0; i < Math.round(run / 0.4); i++) { const [x, y] = onLine(mix(0.1, 1, (i + 0.5) / Math.round(run / 0.4)), top - 0.05); for (const z of [-1, 1]) { const flap = s.box([0.36, 0.26 - (random() < mood.wear ? 0.12 : 0), 0.015], [x, y, z * (W / 2 + 0.09)], i % 2 ? panel : red); flap.rotation.z = angle; } }
      }
    }

    // ---- Undercarriage.
    const cx0 = xf + Math.min(1.0, run * 0.25), cx1 = xt + pl - 0.1;
    if (a.mount === 'pushed') {
      for (const z of [-1, 1]) { const zz = z * (W / 2 - 0.05);
        s.rod([xf + 0.2, 0.2, zz], [cx1, 0.2, zz], 0.025, steel); s.rod([cx1 - 0.1, 0.2, zz], [cx1 - 0.1, H - 0.1, zz], 0.025, steel); s.rod([xt - 0.2, 0.2, zz], [xt + 0.1, H - 0.15, zz], 0.02, steel);
        s.rod([(xf + xt) / 2, 0.2, zz], [(xf + xt) / 2, (y0 + H) / 2 - 0.1, zz], 0.02, steel); s.rod([(xf + xt) / 2, 0.2, zz], [cx1 - 0.1, H * 0.6, zz], 0.014, steel);
        for (const x of [xf + 0.4, cx1 - 0.1]) { wheel(s, 0.12, 0.07, [x, 0.12, zz], tyre, hub); }
      }
      s.rod([cx1 + 0.05, 0.9, -W / 2], [cx1 + 0.05, 0.9, W / 2], 0.02, steel);
    } else {
      const skirted = a.mount === 'motor';
      if (skirted) { rbox(s, [cx1 - cx0 + 0.3, 0.75, W + 0.5], [(cx0 + cx1) / 2, 0.55, 0], frame, 0.08); s.box([cx1 - cx0 + 0.32, 0.12, W + 0.52], [(cx0 + cx1) / 2, 0.75, 0], stripe); }
      else s.box([cx1 - cx0, 0.2, W - 0.2], [(cx0 + cx1) / 2, 0.52, 0], frame);
      const axles = [cx0 + 0.55, cx1 - (a.mount === 'truck' ? 2.3 : 0.6)];
      if (a.mount === 'truck') axles.push(cx1 + 0.9);
      for (const x of axles) for (const z of [-1, 1]) wheel(s, 0.36, 0.26, [x, 0.36, z * (W / 2 + (skirted ? 0.14 : 0.05))], tyre, hub);
      // Lattice tower under the platform and a raking strut under the flight.
      for (const z of [-1, 1]) { const zz = z * (W / 2 - 0.12);
        for (const x of [xt + 0.15, xt + pl - 0.2]) s.rod([x, 0.6, zz], [x, H - 0.2, zz], 0.04, frame);
        const bays = Math.max(1, Math.round((H - 0.8) / 1.1));
        for (let i = 0; i < bays; i++) { const ya = mix(0.6, H - 0.2, i / bays), yb = mix(0.6, H - 0.2, (i + 1) / bays); s.rod([xt + 0.15, ya, zz], [xt + pl - 0.2, yb, zz], 0.02, frame); s.rod([xt + pl - 0.2, ya, zz], [xt + 0.15, yb, zz], 0.02, frame); }
        const [mx, my] = onLine(0.5, -0.15); s.rod([mx, 0.6, zz], [mx, my, zz], 0.035, frame); s.rod([mx, 0.6, zz], [xt, H - 0.3, zz], 0.025, frame);
        // Hydraulic ram.
        s.rod([cx0 + 1.0, 0.62, zz * 0.6], onLine(0.72, -0.2).concat(zz * 0.6) as unknown as [number, number, number], 0.05, s.material('#e8eaea', { metalness: 0.9, roughness: 0.15 }));
      }
      if (a.mount === 'towed') {
        s.rod([cx0, 0.5, 0], [xf - 0.9, 0.45, 0], 0.035, frame); s.ring(0.08, 0.025, [xf - 0.98, 0.45, 0], steel).rotation.x = Math.PI / 2;
        for (const x of [cx0 + 0.1, cx1 - 0.1]) for (const z of [-1, 1]) { s.cylinder(0.03, 0.03, 0.5, [x, 0.27, z * (W / 2 + 0.25)], steel, 8); s.cylinder(0.11, 0.11, 0.03, [x, 0.015, z * (W / 2 + 0.25)], dark, 12); s.box([0.06, 0.06, 0.4], [x, 0.5, z * (W / 2 + 0.08)], frame); }
      } else if (a.mount === 'truck') {
        const tx = cx1 + 0.75;
        rbox(s, [1.7, 1.55, W + 0.5], [tx, 1.3, 0], panel, 0.12);
        s.box([0.03, 0.6, W + 0.2], [tx + 0.86, 1.65, 0], new THREE.MeshStandardMaterial({ color: '#2b3d4e', roughness: 0.15, metalness: 0.5 }));
        for (const z of [-1, 1]) { s.box([0.9, 0.55, 0.03], [tx + 0.2, 1.66, z * (W / 2 + 0.255)], new THREE.MeshStandardMaterial({ color: '#2b3d4e', roughness: 0.15, metalness: 0.5 })); s.ball([0.05, 0.1, 0.12], [tx + 0.86, 0.95, z * 0.7], edgeOn, 10); }
        s.box([1.72, 0.14, W + 0.52], [tx, 1.0, 0], stripe); s.box([0.14, 0.22, W + 0.55], [tx + 0.9, 0.62, 0], dark);
        s.box([cx1 + 1.5 - cx0, 0.2, 0.8], [(cx0 + cx1 + 1.5) / 2, 0.52, 0], dark);
      } else {
        // Driving position: a seat, wheel and a small screen at the side of the base.
        const dx = cx0 + 0.5;
        rbox(s, [0.5, 0.5, 0.5], [dx, 1.15, W / 2 + 0.05], dark, 0.06); s.rod([dx + 0.35, 0.95, W / 2 + 0.05], [dx + 0.25, 1.5, W / 2 + 0.05], 0.018, steel); s.ring(0.15, 0.015, [dx + 0.24, 1.52, W / 2 + 0.05], dark).rotation.set(0, Math.PI / 2, 0.2);
      }
    }

    // ---- At the foot.
    if (carpeted) {
      const len = 4.2 + random() * 1.2;
      const carpet = s.box([len, 0.025, W - 0.15], [xf - len / 2 + 0.05, 0.013, 0], red); carpet.castShadow = false;
      const roll = s.cylinder(0.11, 0.11, W - 0.15, [xf - len + 0.05, 0.11, 0], red, 14); roll.rotation.x = Math.PI / 2;
      if (a.foot === 'ropes') {
        const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.25 });
        const rope = s.material('#8a1420', { roughness: 0.95 });
        for (const z of [-1, 1]) {
          const xs = [xf - 0.5, xf - 2.0, xf - 3.5];
          xs.forEach((x, i) => { s.cylinder(0.025, 0.025, 0.95, [x, 0.5, z * 1.0], brass, 10); s.cylinder(0.16, 0.18, 0.04, [x, 0.02, z * 1.0], brass, 16); s.ball([0.05, 0.05, 0.05], [x, 1.0, z * 1.0], brass, 10);
            if (i > 0) s.tube([[xs[i - 1], 0.93, z], [(xs[i - 1] + x) / 2, 0.72, z], [x, 0.93, z]], 0.022, rope); });
        }
      }
    } else if (a.foot === 'mat') {
      s.box([1.3, 0.02, W - 0.1], [xf - 0.65, 0.01, 0], s.material('#232527', { roughness: 0.95 })).castShadow = false;
      const puddle = s.cylinder(0.9, 0.9, 0.008, [xf - 1.6, 0.004, 0.5], new THREE.MeshStandardMaterial({ color: '#6f7f8c', roughness: 0.05, metalness: 0.6 }), 24); puddle.scale.z = 0.55; puddle.castShadow = false;
    } else if (a.foot === 'cones') {
      const orange = s.material('#f0641e');
      for (const z of [-0.8, 0.8]) { s.cylinder(0.03, 0.14, 0.5, [xf - 0.4, 0.29, z], orange, 12); s.box([0.36, 0.035, 0.36], [xf - 0.4, 0.02, z], orange); }
      s.tube([[xf - 0.4, 0.5, -0.8], [xf - 0.4, 0.36, 0], [xf - 0.4, 0.5, 0.8]], 0.015, s.material('#f1efe6'));
    }

    // ---- At the top.
    const px = xt + pl / 2, py = H + 0.04;
    if (a.top === 'door') {
      const R = 2.3, skin = new THREE.MeshStandardMaterial({ color: '#f2f3f1', roughness: 0.35, metalness: 0.25, side: THREE.DoubleSide });
      const cxF = xt + pl + 0.12 + R, cy = H + 0.75;
      const mk = (r: number, len: number, a0: number, arc: number, mat: THREE.Material, z = 0) => { const g = new THREE.CylinderGeometry(r, r, len, 28, 1, true, a0, arc); g.rotateX(Math.PI / 2); return s.mesh(g, mat, [cxF, cy, z]); };
      // After the X rotation the cylinder's axis lies along z; the arc is centred on -x, facing the stairs.
      mk(R, 5.2, -Math.PI / 2 - 0.85, 1.7, skin);
      mk(R + 0.008, 5.2, -Math.PI / 2 - 0.02, 0.13, stripe); mk(R + 0.008, 5.2, -Math.PI / 2 - 0.1, 0.05, accent);
      const hole = s.material('#15181c', { roughness: 0.9 });
      mk(R + 0.012, 0.95, -Math.PI / 2 - 0.3, 0.86, hole);
      // The door itself, swung open alongside.
      mk(R + 0.2, 0.95, -Math.PI / 2 - 0.3, 0.86, skin, 1.1);
      for (const z of [-2.2, -1.7, 1.9, 2.3]) mk(R + 0.012, 0.22, -Math.PI / 2 + 0.2, 0.14, hole, z);
    } else if (a.top === 'figure') {
      const coat = s.material(stripeHex === '#222428' ? '#2b3550' : stripeHex), skinTone = s.material('#c9a58a');
      crew(s, [px + 0.2, py, 0.1], Math.PI, coat, coat, skinTone, false);
      s.rod([px + 0.2, py + 1.32, 0.34], [px + 0.1, py + 1.95, 0.5], 0.045, coat); s.ball([0.06, 0.06, 0.06], [px + 0.09, py + 2.0, 0.51], skinTone, 10);
      rbox(s, [0.26, 0.07, 0.26], [px + 0.2, py + 1.8, 0.1], accent, 0.03);
    } else if (a.top === 'luggage') {
      rbox(s, [0.3, 0.6, 0.7], [px - 0.1, py + 0.3, -0.2], s.material('#8a5a34', { roughness: 0.7 }), 0.05);
      rbox(s, [0.5, 0.25, 0.4], [px + 0.3, py + 0.125, 0.3], s.material('#2f6f8f', { roughness: 0.6 }), 0.05);
      s.cylinder(0.12, 0.13, 0.1, [px + 0.3, py + 0.31, 0.3], s.material('#3a3d44'), 16); s.cylinder(0.23, 0.23, 0.015, [px + 0.3, py + 0.26, 0.3], s.material('#3a3d44'), 18);
    } else if (a.top === 'flowers') {
      const [bx, by] = onLine((N - 0.5) / N);
      s.cylinder(0.02, 0.07, 0.45, [bx + 0.2, by + 0.24, 0], s.material('#f1efe6'), 10).rotation.x = Math.PI / 2 - 0.15;
      for (let i = 0; i < 9; i++) s.ball([0.06, 0.06, 0.06], [bx + 0.2 + (random() - 0.5) * 0.18, by + 0.26 + random() * 0.08, 0.26 + random() * 0.14], s.material(['#e2452f', '#f2b417', '#f1efe6', '#e86fa5'][i % 4], { roughness: 0.9 }), 8);
    } else if (a.top === 'closed') {
      s.tube([[xt + 0.1, H + 0.95, -W / 2], [xt + 0.1, H + 0.78, 0], [xt + 0.1, H + 0.95, W / 2]], 0.02, s.material('#f1efe6'));
      const sign = s.label('CLOSED', 0.6, 0.2, [xt + 0.08, H + 0.62, 0], '#f1efe6', '#b4202a'); sign.rotation.y = -Math.PI / 2;
    }
    // Rust streaks under the platform edge as wear rises.
    const rust = s.material('#7a4a2a', { roughness: 1 });
    if (a.mount !== 'pushed') for (let i = 0; i < Math.round(mood.wear * 9); i++) { const [x, y] = onLine(0.1 + random() * 0.85, 0.1); const h = 0.15 + random() * 0.25; for (const z of [-1, 1]) if (random() > 0.4) s.box([0.04 + random() * 0.06, h, 0.01], [x, y - h / 2 + 0.2, z * (W / 2 + 0.036)], rust); }

    return s.finish();
  },
});
