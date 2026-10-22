import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const LEATHER = {
  oxblood: 'Deep oxblood red leather, the classic.',
  black: 'Black leather, polished by decades of backs.',
  teal: 'Turquoise-teal vinyl, bright and tropical.',
  cream: 'Cream leather gone the colour of old piano keys.',
  mustard: 'Mustard-yellow vinyl, loud and seventies.',
  green: 'Bottle-green leather, clubby and sober.',
  tan: 'Saddle-tan leather, soft and creased.',
} as const;
const LEATHER_TINT: Record<keyof typeof LEATHER, string> = {
  oxblood: '#7a1f24', black: '#23211f', teal: '#1f9a98', cream: '#e0d3b4', mustard: '#d0a024', green: '#1f4f3a', tan: '#a8703c',
};

type V3 = [number, number, number];

export default defineThing({
  questions: {
    upholstery: choice('What colour is the upholstery?', LEATHER),
    era: choice('What era is the chair from?', {
      porcelain: 'A 1920s chair: white porcelain-enamel cast iron, solid side panels, button-tufted back.',
      chrome: 'A 1950s chair: fat rounded cushions with contrast piping and gleaming chrome tube arms.',
      boxy: 'A 1970s chair: squared-off slab cushions, a square base plate and plain steel arms.',
      modern: 'A recent chair: matte black frame, slim flat cushions, sharp and expensive.',
    }),
    dressing: choice('What is on the chair?', {
      bare: 'Nothing: the chair is bare and waiting.',
      cape: 'A pinstriped cutting cape thrown over the backrest.',
      booster: "A padded child's booster board laid across the arms for a first haircut.",
      towel: 'A white towel folded over the headrest, ready for a hot-towel shave.',
    }),
    reclined: noul('Is the chair laid back for a shave, with the leg rest raised?'),
    pumped: score('How high is the chair pumped up?', ['Sunk right down', 'Middle', 'Pumped all the way up']),
    turned: choice('Which way has it been swivelled?', {
      front: 'Square to the front, as if facing the mirror.',
      left: 'Turned a quarter to one side, as the barber left it.',
      away: 'Spun well round, facing off toward the door.',
    }),
    left: choice('What was left behind on or around it?', {
      nothing: 'Nothing at all.',
      clippings: 'Fresh hair clippings on the seat and scattered round the base.',
      newspaper: 'A folded newspaper left on the seat by whoever was waiting.',
      flowers: 'A small bunch of flowers laid on the seat, for someone who is not coming back.',
      forsale: 'A hand-lettered FOR SALE card propped on the seat.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const era = a.era;
    const leather = s.material(LEATHER_TINT[a.upholstery], { roughness: mix(0.38, 0.7, mood.wear) });
    const pipeTint = a.upholstery === 'cream' || a.upholstery === 'mustard' ? '#3a2a22' : '#efe6d2';
    const piping = s.material(pipeTint, { roughness: 0.5 });
    const chrome = s.material('#e3e7e8', { metalness: 0.95, roughness: mix(0.12, 0.4, mood.wear) });
    const frame =
      era === 'porcelain' ? s.material('#f1eee4', { roughness: 0.25, metalness: 0.05 })
      : era === 'modern' ? s.material('#26272a', { roughness: 0.55, metalness: 0.4 })
      : era === 'boxy' ? s.material('#b6b8b6', { metalness: 0.7, roughness: 0.4 })
      : chrome;
    const black = s.material('#1c1b1b', { roughness: 0.5 });
    const round = era === 'chrome' ? 0.05 : era === 'porcelain' ? 0.035 : era === 'boxy' ? 0.018 : 0.012;
    const thick = era === 'modern' ? 0.085 : era === 'chrome' ? 0.15 : 0.12;

    const upper = new THREE.Group();
    const back = new THREE.Group();
    const legs = new THREE.Group();
    const put = <T extends THREE.Object3D>(group: THREE.Group, mesh: T) => { group.add(mesh); return mesh; };
    const cushion = (group: THREE.Group, size: V3, at: V3, material: THREE.Material = leather) =>
      put(group, s.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(round, size[1] * 0.45)), material, at));
    /** A loop of contrast piping round the face of a cushion, lying in the plane given by axis. */
    const pipe = (group: THREE.Group, w: number, h: number, at: V3, axis: 'y' | 'z') => {
      const r = Math.min(round, 0.03) + 0.01, pts: V3[] = [];
      for (let i = 0; i < 16; i++) {
        const t = (i / 16) * Math.PI * 2;
        const cx = Math.sign(Math.cos(t)) * (w / 2 - r) + Math.cos(t) * r;
        const cy = Math.sign(Math.sin(t)) * (h / 2 - r) + Math.sin(t) * r;
        pts.push(axis === 'y' ? [at[0] + cx, at[1], at[2] + cy] : [at[0] + cx, at[1] + cy, at[2]]);
      }
      put(group, s.tube(pts, 0.007, piping, true));
    };

    // Base: a heavy plate, the hydraulic sleeve and the polished ram.
    const seatY = mix(0.47, 0.62, a.pumped);
    if (era === 'boxy' || era === 'modern') {
      s.mesh(new RoundedBoxGeometry(0.62, 0.035, 0.62, 3, 0.015), era === 'modern' ? s.material('#8f9396', { metalness: 0.8, roughness: 0.35 }) : frame, [0, 0.018, 0]);
      s.cylinder(0.09, 0.13, 0.1, [0, 0.085, 0], frame, 28);
    } else {
      s.lathe([[0, 0], [0.34, 0], [0.352, 0.018], [0.33, 0.04], [0.2, 0.07], [0.12, 0.1], [0.1, 0.16], [0, 0.16]], frame);
      if (era === 'porcelain') for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        s.rod([Math.cos(t) * 0.31, 0.035, Math.sin(t) * 0.31], [Math.cos(t) * 0.13, 0.098, Math.sin(t) * 0.13], 0.014, frame, 0.008);
      }
      s.ring(0.345, 0.012, [0, 0.014, 0], chrome).rotation.x = Math.PI / 2;
    }
    s.cylinder(0.09, 0.1, 0.24, [0, 0.25, 0], era === 'modern' ? frame : chrome, 24);
    s.cylinder(0.06, 0.06, seatY - 0.3, [0, (seatY + 0.34) / 2, 0], chrome, 20);
    s.ring(0.092, 0.008, [0, 0.37, 0], black).rotation.x = Math.PI / 2;

    // Seat pan, cushion and the pump lever.
    put(upper, s.box([0.5, 0.05, 0.48], [0, 0.0, 0.0], frame));
    put(upper, s.cylinder(0.12, 0.09, 0.06, [0, -0.05, 0], frame, 20));
    cushion(upper, [0.54, thick, 0.52], [0, 0.03 + thick / 2, 0.03]);
    const seatTop = 0.03 + thick;
    if (era === 'chrome' || era === 'porcelain') pipe(upper, 0.53, 0.51, [0, seatTop - 0.012, 0.03], 'y');
    put(upper, s.rod([0.2, -0.05, -0.02], [0.43, 0.13, 0.16], 0.013, chrome));
    put(upper, s.ball([0.03, 0.03, 0.03], [0.44, 0.14, 0.168], black, 12));
    put(upper, s.cylinder(0.03, 0.03, 0.06, [0.2, -0.05, -0.02], chrome, 12)).rotation.z = Math.PI / 2;

    // Arms: enamel side panels, chrome tube loops or plain flat bars.
    for (const side of [-1, 1]) {
      const x = side * 0.315;
      if (era === 'porcelain') {
        put(upper, s.mesh(new RoundedBoxGeometry(0.05, 0.27, 0.46, 3, 0.02), frame, [x, 0.14, -0.01]));
        put(upper, s.cylinder(0.035, 0.035, 0.052, [x, 0.2, 0.2], chrome, 16)).rotation.z = Math.PI / 2;
      } else if (era === 'chrome') {
        put(upper, s.tube([[x, 0, 0.2], [x, 0.2, 0.24], [x, 0.275, 0.18], [x, 0.275, -0.16], [x, 0.2, -0.23], [x, 0, -0.2]], 0.017, chrome));
      } else {
        const bar = era === 'modern' ? frame : chrome;
        put(upper, s.box([0.025, 0.28, 0.04], [x, 0.14, 0.19], bar));
        put(upper, s.box([0.025, 0.28, 0.04], [x, 0.14, -0.2], bar));
        put(upper, s.box([0.025, 0.03, 0.43], [x, 0.265, -0.005], bar));
      }
      cushion(upper, [0.085, era === 'modern' ? 0.03 : 0.05, 0.4], [x, 0.3, -0.01]);
    }

    // Backrest and headrest hinge together at the rear of the seat.
    const backH = era === 'modern' ? 0.52 : 0.6;
    cushion(back, [0.5, backH, thick * 0.85], [0, backH / 2 + 0.04, 0]);
    put(back, s.box([0.44, backH * 0.8, 0.03], [0, backH / 2 + 0.03, -thick * 0.45], frame));
    const face = thick * 0.425;
    if (era === 'chrome') pipe(back, 0.49, backH - 0.01, [0, backH / 2 + 0.04, face - 0.01], 'z');
    if (era === 'porcelain') {
      const buttons = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3 + (r % 2); c++)
        buttons.push({ at: [(c - (2 + (r % 2)) / 2) * 0.13, 0.17 + r * 0.14, face + 0.002] as V3, size: 0.012 });
      put(back, s.scatter(new THREE.SphereGeometry(1, 8, 6), piping, buttons));
    }
    if (era === 'boxy') for (const y of [0.24, 0.42]) put(back, s.box([0.5, 0.006, 0.012], [0, y, face + 0.002], black));
    const headY = backH + 0.21;
    for (const x of [-0.07, 0.07]) put(back, s.rod([x, backH - 0.05, -0.02], [x, headY - 0.03, 0.0], 0.009, chrome));
    cushion(back, [0.27, 0.13, 0.1], [0, headY, 0.02]);
    put(back, s.box([0.2, 0.05, 0.02], [0, headY - 0.02, -0.04], frame));
    back.position.set(0, 0.07, -0.25);
    back.rotation.x = a.reclined ? -mix(0.72, 0.9, random()) : -0.13;
    upper.add(back);

    // Leg rest: two bars, a calf pad and the ribbed footplate.
    for (const x of [-0.2, 0.2]) put(legs, s.rod([x, 0, 0], [x, -0.37, 0.36], 0.014, era === 'modern' ? frame : chrome));
    if (era !== 'modern') cushion(legs, [0.36, 0.045, 0.2], [0, -0.15, 0.175]).rotation.x = 0.8;
    const plate = new THREE.Group();
    put(plate, s.box([0.5, 0.025, 0.2], [0, 0, 0], era === 'porcelain' ? frame : chrome));
    for (let i = 0; i < 7; i++) put(plate, s.box([0.44, 0.012, 0.012], [0, 0.017, -0.075 + i * 0.025], black));
    plate.position.set(0, -0.38, 0.42);
    plate.rotation.x = 0.35;
    legs.add(plate);
    legs.position.set(0, -0.01, 0.27);
    legs.rotation.x = a.reclined ? -0.62 : 0;
    upper.add(legs);

    // Wear: tape over the splits, and foam showing where the tape gave up.
    const tape = s.material(random() < 0.5 ? '#b9bdbd' : '#2b2b2c', { roughness: 0.45, metalness: 0.2 });
    const splits = Math.floor(mood.wear * 5.2 + random() * 0.8);
    for (let i = 0; i < splits; i++) {
      const onSeat = i % 2 === 0 && a.left !== 'forsale';
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1 + random() * 0.1, 0.004, 0.04), tape);
      strip.castShadow = true;
      if (onSeat) {
        strip.position.set((random() - 0.5) * 0.36, seatTop + 0.001, 0.03 + (random() - 0.5) * 0.34);
        strip.rotation.y = random() * Math.PI;
        upper.add(strip);
      } else {
        strip.position.set((random() - 0.5) * 0.32, 0.12 + random() * (backH - 0.16), face + 0.001);
        strip.rotation.set(Math.PI / 2, 0, random() * Math.PI);
        back.add(strip);
      }
    }
    if (mood.wear > 0.72) {
      const foam = s.material('#d9c065', { roughness: 1 });
      put(upper, s.ball([0.05, 0.022, 0.035], [0.2 * (random() < 0.5 ? -1 : 1), seatTop - 0.005, 0.26], foam, 10));
    }

    // Cloth: a strip that follows a path and ripples toward its hanging ends.
    const drape = (group: THREE.Group, path: V3[], width: number, material: THREE.Material, ripple: number) => {
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      const nu = 28, nv = 12;
      const geometry = new THREE.PlaneGeometry(1, 1, nv, nu);
      const position = geometry.attributes.position as THREE.BufferAttribute;
      const phase = random() * 6;
      for (let i = 0; i <= nu; i++) {
        const p = curve.getPoint(i / nu);
        const end = Math.abs(i / nu - 0.5) * 2;
        for (let j = 0; j <= nv; j++) {
          const u = j / nv - 0.5;
          const wave = Math.sin(u * 15 + phase) * ripple * end;
          position.setXYZ(i * (nv + 1) + j, p.x + u * width * (1 + end * 0.12), p.y + Math.abs(u) * -0.03 * end, p.z + wave);
        }
      }
      geometry.computeVertexNormals();
      return put(group, s.mesh(geometry, material));
    };

    if (a.dressing === 'cape') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const dark = random() < 0.6;
      ctx.fillStyle = dark ? '#1d1e24' : '#f0ede4';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = dark ? '#dcdcdc' : '#2c4a8a';
      for (let x = 4; x < 128; x += 16) ctx.fillRect(x, 0, 3, 128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 1);
      const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, side: THREE.DoubleSide });
      const slide = (random() - 0.5) * 0.08;
      drape(back, [[slide, 0.1, face + 0.05], [slide, backH * 0.6, face + 0.02], [slide, backH + 0.07, 0.0], [slide, backH * 0.75, -face - 0.06], [slide, 0.02 + random() * 0.15, -face - 0.09]], 0.62, cloth, 0.022);
    }
    if (a.dressing === 'towel') {
      const cloth = s.material('#f3f1ea', { roughness: 0.95, side: THREE.DoubleSide });
      drape(back, [[0, headY - 0.17, 0.09], [0, headY + 0.02, 0.078], [0, headY + 0.075, 0.02], [0, headY + 0.02, -0.045], [0, headY - 0.2, -0.06]], 0.24, cloth, 0.008);
      put(back, s.box([0.24, 0.012, 0.004], [0, headY - 0.13, 0.092], s.material('#3f6fb4')));
    }
    if (a.dressing === 'booster') {
      const wood = s.material('#9a6a3c', { roughness: 0.6 });
      put(upper, s.box([0.74, 0.03, 0.24], [0, 0.34, 0.02], wood));
      cushion(upper, [0.36, 0.05, 0.21], [0, 0.38, 0.02], s.material(a.upholstery === 'oxblood' ? '#2a6f9a' : '#b3262b', { roughness: 0.5 }));
      for (const x of [-0.355, 0.355]) put(upper, s.box([0.02, 0.05, 0.24], [x, 0.315, 0.02], wood));
    }

    // What was left behind.
    const lift = a.dressing === 'booster' ? 0.405 : seatTop;
    if (a.left === 'clippings') {
      const tint = ['#1b1512', '#3a2618', '#6b6660', '#8a5a2a'][Math.floor(random() * 4)];
      const hair = s.material(tint, { roughness: 1 });
      const onSeat = Array.from({ length: 16 }, () => ({ at: [(random() - 0.5) * 0.4, seatTop + 0.004, 0.03 + (random() - 0.5) * 0.38] as V3, size: 0.014 + random() * 0.016 }));
      put(upper, s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.3, 0.6), hair, onSeat));
      const floor = Array.from({ length: 46 }, () => {
        const t = random() * Math.PI * 2, r = 0.3 + random() * 0.22;
        return { at: [Math.cos(t) * r, 0.006, Math.sin(t) * r] as V3, size: 0.012 + random() * 0.024 };
      });
      s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.25, 0.55), hair, floor);
    }
    if (a.left === 'newspaper') {
      const paper = put(upper, s.label('DAILY NEWS', 0.3, 0.2, [0.02, lift + 0.014, 0.04], '#2a2a2a', '#ddd6c2'));
      paper.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.9);
      put(upper, s.box([0.3, 0.012, 0.2], [0.02, lift + 0.007, 0.04], s.material('#d5cdb8'))).rotation.y = paper.rotation.z;
    }
    if (a.left === 'flowers') {
      const bunch = new THREE.Group();
      const wrap = put(bunch, s.cylinder(0.075, 0.02, 0.26, [0, 0, 0], s.material('#e9dcc0', { roughness: 0.9 }), 10));
      wrap.rotation.z = Math.PI / 2;
      const tints = mood.cheer > 0.5 ? ['#f2c230', '#e8663a', '#f4f0e6'] : ['#f4f0e6', '#c9b7d8', '#e7e2d2'];
      for (let i = 0; i < 9; i++)
        put(bunch, s.ball([0.03, 0.03, 0.03], [-0.14 - random() * 0.05, (random() - 0.3) * 0.07, (random() - 0.5) * 0.13], s.material(tints[i % 3], { roughness: 0.8 }), 8));
      for (let i = 0; i < 4; i++) put(bunch, s.ball([0.035, 0.008, 0.016], [-0.1, 0.02, (i - 1.5) * 0.04], s.material('#3f7a3c'), 8));
      bunch.position.set(0.02, lift + 0.05, 0.05);
      bunch.rotation.y = 0.5 + random() * 0.8;
      upper.add(bunch);
    }
    if (a.left === 'forsale') {
      const card = put(upper, s.label('FOR SALE', 0.36, 0.22, [0, lift + 0.12, -0.08], '#b3202a', '#f4efdc'));
      card.rotation.set(-0.3, 0, (random() - 0.5) * 0.16);
      put(upper, s.box([0.36, 0.22, 0.006], [0, lift + 0.119, -0.085], s.material('#c9b48a'))).rotation.copy(card.rotation);
    }

    upper.position.y = seatY;
    const swivel = { front: 0, left: 0.75, away: -2.1 }[a.turned] + (random() - 0.5) * 0.3;
    upper.rotation.y = swivel;
    s.root.add(upper);

    const sway = mood.energy * 0.09;
    return s.finish({ footprint: 0.5, update: (_dt, time) => { upper.rotation.y = swivel + Math.sin(time * mix(0.3, 1.4, mood.energy)) * sway; } });
  },
});
