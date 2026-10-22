import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const LEATHER = {
  oxblood: 'Deep oxblood red, the old-shop classic.',
  black: 'Black leather, sober and smart.',
  green: 'Bottle green, a gentleman’s club colour.',
  tan: 'Saddle tan, cracked and warm.',
  cream: 'Cream white, dentist-clean.',
  turquoise: 'Turquoise vinyl, diner bright.',
  cherry: 'Glossy cherry red vinyl.',
} as const;
const LEATHER_TINT: Record<keyof typeof LEATHER, string> = {
  oxblood: '#6e1f22', black: '#1d1c1e', green: '#1f4a37', tan: '#a8703f', cream: '#e7dcc4', turquoise: '#2aa7a3', cherry: '#c81d2b',
};
const CAPE = {
  pinstripe: 'White with thin navy pinstripes.',
  candy: 'Broad red and white candy stripes.',
  black: 'Plain black nylon.',
  leopard: 'Loud leopard print.',
  sky: 'Pale blue with white checks.',
} as const;

function clothTexture(kind: keyof typeof CAPE) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'pinstripe') {
    ctx.fillStyle = '#f1efe8'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#263a6b';
    for (let x = 0; x < 256; x += 32) ctx.fillRect(x + 12, 0, 6, 256);
  } else if (kind === 'candy') {
    ctx.fillStyle = '#f4efe6'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#c4242c';
    for (let x = 0; x < 256; x += 64) ctx.fillRect(x, 0, 32, 256);
  } else if (kind === 'black') {
    ctx.fillStyle = '#1c1c21'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#2c2c34';
    for (let y = 0; y < 256; y += 16) ctx.fillRect(0, y, 256, 2);
  } else if (kind === 'leopard') {
    ctx.fillStyle = '#d6a35a'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % 256, y = (i * 61) % 256;
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.ellipse(x, y, 13, 10, i, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8f5a26'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 7, 5, i, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#a9cbe6'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#eef5fa';
    for (let x = 0; x < 256; x += 64) { ctx.fillRect(x, 0, 14, 256); ctx.fillRect(0, x, 256, 14); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    era: choice('What era and make is the chair?', {
      porcelain: 'A 1920s chair with a white porcelain-enamel base and arms, nickel trim and a round seat: heavy as a bathtub.',
      fifties: 'A 1950s chair, all rounded chrome and fat piped vinyl cushions, optimistic as a jukebox.',
      seventies: 'A boxy 1970s chair with brushed steel, tufted buttons and wood-veneer arm caps.',
      modern: 'A modern chair with a matte black frame and slim square quilted cushions, a hipster-revival shop.',
    }),
    leather: choice('What colour is the upholstery?', LEATHER),
    draped: choice('What is draped on or set on the chair?', {
      cape: 'A barber cape thrown over the backrest, hanging down both sides.',
      towel: 'A hot white towel folded over the headrest, steaming faintly.',
      booster: 'A child’s booster board laid across the armrests.',
      jacket: 'Somebody’s jacket hung on the back, sleeves dangling.',
      nothing: 'Nothing: the chair is bare.',
    }),
    cape: choice('If there is a cape, what is its pattern?', CAPE),
    justLeft: noul('Did someone just get up from it: turned aside, clippings on the seat and floor?'),
    recline: score('How far is the back reclined?', ['Bolt upright for a trim', 'Leaning back a little', 'Tilted well back', 'Laid nearly flat for a shave']),
    pumped: score('How high is the seat pumped?', ['Sunk right down', 'Middle', 'Pumped up as high as it goes']),
    footrest: choice('What is the footrest like?', {
      grille: 'A cast openwork plate with the maker’s name worn smooth.',
      bar: 'A simple round chrome bar.',
      plate: 'A broad ribbed rubber plate.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const leatherTint = new THREE.Color(LEATHER_TINT[a.leather]);
    const leather = s.material(leatherTint, { roughness: mix(0.32, 0.75, wear) });
    const piping = s.material(a.era === 'fifties' ? '#f2ecdc' : leatherTint.clone().multiplyScalar(0.6), { roughness: 0.5 });
    const chrome = s.material(a.era === 'seventies' ? '#aab0b2' : '#e3e6e8', { metalness: 0.92, roughness: mix(a.era === 'seventies' ? 0.4 : 0.14, 0.5, wear) });
    const enamel = s.material('#f1eee4', { roughness: 0.22, metalness: 0.05 });
    const black = s.material('#1b1c1f', { roughness: 0.7, metalness: 0.2 });
    const wood = s.material('#7a4a26', { roughness: 0.5 });
    const frame = a.era === 'porcelain' ? enamel : a.era === 'modern' ? black : chrome;
    const dark = s.material('#24262a', { roughness: 0.8 });

    const rounded = (to: Sculpture, size: [number, number, number], at: [number, number, number], material: THREE.Material, radius = 0.03) =>
      to.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 4, Math.min(radius, Math.min(...size) / 2 - 0.001)), material, at);

    // --- Base: a wide flared foot, a collar and the hydraulic column.
    const lift = mix(0, 0.14, a.pumped);
    const baseR = a.era === 'porcelain' ? 0.36 : a.era === 'modern' ? 0.3 : 0.33;
    if (a.era === 'modern') {
      s.cylinder(baseR, baseR, 0.025, [0, 0.0125, 0], chrome, 48);
      s.cylinder(0.075, 0.09, 0.2, [0, 0.125, 0], black, 24);
    } else {
      s.lathe([[0, 0], [baseR, 0], [baseR, 0.03], [baseR * 0.93, 0.05], [baseR * 0.62, 0.085], [baseR * 0.42, 0.14], [baseR * 0.34, 0.22], [0.12, 0.25], [0, 0.25]], a.era === 'porcelain' ? enamel : chrome);
      s.ring(baseR * 0.94, 0.012, [0, 0.045, 0], a.era === 'porcelain' ? chrome : dark).rotation.x = Math.PI / 2;
      if (a.era === 'porcelain') s.ring(baseR * 0.5, 0.01, [0, 0.118, 0], chrome).rotation.x = Math.PI / 2;
    }
    s.cylinder(0.055, 0.055, 0.22 + lift, [0, 0.25 + lift / 2, 0], chrome, 20);
    s.cylinder(0.085, 0.085, 0.05, [0, 0.245, 0], a.era === 'modern' ? black : chrome, 24);

    // --- Everything above swivels and rises together.
    const top = new Sculpture(context);
    s.root.add(top.root);
    const seatY = 0.5 + lift;
    top.root.position.y = seatY;
    top.root.rotation.y = a.justLeft ? (random() < 0.5 ? -1 : 1) * mix(0.45, 0.95, random()) : (random() - 0.5) * 0.16;

    const seatW = a.era === 'modern' ? 0.52 : 0.56, seatD = 0.52, thick = a.era === 'modern' ? 0.09 : 0.13;
    // Under-seat casting and the pump lever on the chair's right.
    top.cylinder(0.1, 0.07, 0.07, [0, -0.085, 0], frame === enamel ? chrome : frame, 20);
    rounded(top, [seatW * 0.9, 0.045, seatD * 0.86], [0, -0.03, 0], frame, 0.02);
    top.rod([seatW * 0.3, -0.07, -0.02], [seatW / 2 + 0.1, 0.0, 0.14], 0.014, chrome);
    top.rod([seatW / 2 + 0.1, 0.0, 0.14], [seatW / 2 + 0.12, 0.16, 0.2], 0.014, chrome);
    top.ball([0.032, 0.032, 0.032], [seatW / 2 + 0.122, 0.185, 0.207], a.era === 'porcelain' ? enamel : dark, 14);

    // Seat cushion.
    if (a.era === 'porcelain') {
      const cushion = top.cylinder(seatW / 2, seatW / 2 - 0.02, thick, [0, thick / 2, 0], leather, 36);
      cushion.scale.z = seatD / seatW;
      top.ring(seatW / 2 - 0.005, 0.014, [0, thick, 0], piping).rotation.x = Math.PI / 2;
      top.ring(seatW / 2 + 0.004, 0.016, [0, 0.0, 0], enamel).rotation.x = Math.PI / 2;
    } else {
      rounded(top, [seatW, thick, seatD], [0, thick / 2, 0], leather, a.era === 'modern' ? 0.022 : 0.05);
      if (a.era === 'fifties') rounded(top, [seatW + 0.012, 0.016, seatD + 0.012], [0, thick * 0.5, 0], piping, 0.008);
      if (a.era === 'modern') for (const z of [-0.12, 0, 0.12]) top.box([seatW * 0.94, 0.004, 0.006], [0, thick + 0.001, z], piping);
    }

    // Armrests: frame loop and padded top.
    const armY = 0.27, armX = seatW / 2 + 0.035;
    for (const side of [-1, 1]) {
      const x = side * armX;
      if (a.era === 'porcelain') {
        // An enamelled casting: a fat scroll with a leather pad.
        top.tube([[x, 0.0, -0.2], [x, 0.14, -0.23], [x, armY - 0.02, -0.12], [x, armY - 0.02, 0.14], [x, 0.17, 0.25], [x, 0.03, 0.2], [x * 0.92, -0.03, 0.1]], 0.03, enamel);
        top.ball([0.045, 0.045, 0.045], [x, 0.17, 0.25], enamel, 14);
      } else if (a.era === 'modern') {
        top.box([0.03, armY, 0.04], [x, armY / 2 - 0.02, -0.16], black);
        top.box([0.03, armY, 0.04], [x, armY / 2 - 0.02, 0.16], black);
        top.box([0.03, 0.03, 0.36], [x, -0.02, 0], black);
      } else {
        top.tube([[x, -0.03, -0.2], [x, armY - 0.06, -0.21], [x, armY - 0.02, -0.14], [x, armY - 0.02, 0.17], [x, armY - 0.08, 0.24], [x, 0.06, 0.2], [x, -0.03, 0.14]], a.era === 'seventies' ? 0.018 : 0.022, chrome);
        if (a.era === 'fifties') top.box([0.012, 0.16, 0.26], [x, 0.11, 0.0], leather);
      }
      const pad = rounded(top, [a.era === 'modern' ? 0.065 : 0.085, 0.045, a.era === 'modern' ? 0.36 : 0.34], [x, armY + 0.012, 0.01], a.era === 'seventies' ? wood : leather, 0.02);
      pad.castShadow = true;
    }

    // Backrest, hinged at the rear of the seat, with the headrest on two rods.
    const back = new Sculpture(context);
    top.root.add(back.root);
    back.root.position.set(0, thick * 0.6, -seatD / 2 + 0.02);
    const tilt = mix(0.14, 1.12, a.recline);
    back.root.rotation.x = -tilt;
    const backH = a.era === 'modern' ? 0.56 : 0.6, backW = seatW - 0.02, backT = a.era === 'modern' ? 0.075 : 0.11;
    if (a.era === 'porcelain') {
      // Arched back: a rounded slab topped with a half-round.
      rounded(back, [backW, backH * 0.7, backT], [0, backH * 0.37, 0], leather, 0.045);
      const arch = back.cylinder(backW / 2, backW / 2, backT, [0, backH * 0.7, 0], leather, 36);
      arch.rotation.x = Math.PI / 2; arch.scale.set(1, 1, 0.62);
      back.tube([[-backW / 2, 0.02, -0.03], [-backW / 2, backH * 0.72, -0.03], [-backW * 0.3, backH * 0.94, -0.03], [0, backH * 1.02, -0.03], [backW * 0.3, backH * 0.94, -0.03], [backW / 2, backH * 0.72, -0.03], [backW / 2, 0.02, -0.03]], 0.02, enamel);
    } else {
      rounded(back, [backW, backH, backT], [0, backH / 2 + 0.02, 0], leather, a.era === 'modern' ? 0.022 : 0.05);
      if (a.era === 'fifties') {
        rounded(back, [backW + 0.012, backH + 0.012, 0.016], [0, backH / 2 + 0.02, 0], piping, 0.008);
        for (const x of [-0.09, 0.09]) back.box([0.006, backH * 0.82, 0.006], [x, backH / 2 + 0.02, backT / 2 + 0.001], piping);
      }
      if (a.era === 'seventies') for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) back.ball([0.014, 0.014, 0.008], [(i - 1) * 0.15, 0.14 + j * 0.17, backT / 2 + 0.002], piping, 10);
      if (a.era === 'modern') for (let j = 0; j < 4; j++) back.box([backW * 0.94, 0.006, 0.004], [0, 0.12 + j * 0.12, backT / 2 + 0.001], piping);
      rounded(back, [backW * 0.96, backH * 0.96, 0.02], [0, backH / 2 + 0.02, -backT / 2 - 0.004], frame, 0.01);
    }
    const headY = backH + (a.era === 'porcelain' ? 0.2 : 0.17);
    for (const x of [-0.05, 0.05]) back.rod([x, backH * 0.75, -backT / 2 - 0.012], [x, headY, -backT / 2 - 0.012], 0.009, chrome);
    rounded(back, [0.24, 0.1, 0.075], [0, headY, 0.0], leather, 0.035);
    // Hinge brackets where back meets seat.
    for (const side of [-1, 1]) top.cylinder(0.035, 0.035, 0.03, [side * (seatW / 2 - 0.005), thick * 0.6, -seatD / 2 + 0.02], frame === enamel ? chrome : frame, 16).rotation.z = Math.PI / 2;

    // Footrest on two struts, swinging out front.
    const footZ = seatD / 2 + 0.3, footY = -0.3 + lift * -0.2;
    for (const x of [-0.14, 0.14]) top.tube([[x, -0.05, seatD / 2 - 0.08], [x, -0.1, seatD / 2 + 0.1], [x, footY + 0.01, footZ - 0.03]], 0.016, frame === enamel ? chrome : frame);
    if (a.footrest === 'bar') {
      top.rod([-0.2, footY, footZ], [0.2, footY, footZ], 0.022, chrome);
      for (const x of [-0.2, 0.2]) top.ball([0.028, 0.028, 0.028], [x, footY, footZ], chrome, 12);
    } else {
      const plate = new Sculpture(context);
      top.root.add(plate.root);
      plate.root.position.set(0, footY, footZ);
      plate.root.rotation.x = 0.5;
      if (a.footrest === 'grille') {
        rounded(plate, [0.4, 0.014, 0.03], [0, 0, -0.1], chrome, 0.006);
        rounded(plate, [0.4, 0.014, 0.03], [0, 0, 0.1], chrome, 0.006);
        for (let i = 0; i < 9; i++) plate.box([0.014, 0.012, 0.2], [-0.19 + i * 0.0475, 0, 0], chrome);
        plate.label('KOKEN', 0.2, 0.05, [0, 0.009, 0], '#3a3d40', '#c9cdce').rotation.x = -Math.PI / 2;
      } else {
        rounded(plate, [0.4, 0.02, 0.22], [0, 0, 0], frame === enamel ? chrome : frame, 0.008);
        for (let i = 0; i < 8; i++) plate.box([0.36, 0.006, 0.012], [0, 0.012, -0.085 + i * 0.024], dark);
      }
    }

    // Wear: a duct-tape patch and a split showing foam.
    if (wear > 0.55) {
      const tape = s.material('#9a9c98', { roughness: 0.6, metalness: 0.3 });
      const patch = top.box([0.16, 0.004, 0.07], [seatW * 0.15, thick + 0.002, 0.1], tape);
      patch.rotation.y = 0.5;
      if (wear > 0.8) back.box([0.02, 0.2, 0.004], [-0.12, backH * 0.5, backT / 2 + 0.002], s.material('#d9c98f')).rotation.z = 0.2;
    }

    // --- What is draped on it.
    const sheet = (to: Sculpture, path: THREE.Vector3[], width: (t: number) => number, material: THREE.Material, ripple = 0.012) => {
      const curve = new THREE.CatmullRomCurve3(path, false, 'centripetal');
      const geometry = new THREE.PlaneGeometry(1, 1, 10, 40);
      const position = geometry.attributes.position;
      const phase = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const u = position.getX(i) + 0.5, t = position.getY(i) + 0.5;
        const p = curve.getPoint(t), w = width(t);
        const fold = Math.sin(u * 9 + t * 5 + phase) * ripple * (0.3 + t * (1 - t) * 0 + Math.abs(u - 0.5) * 2);
        position.setXYZ(i, p.x + (u - 0.5) * w, p.y - Math.abs(u - 0.5) * Math.abs(u - 0.5) * 0.0, p.z + fold);
      }
      geometry.computeVertexNormals();
      const mesh = to.mesh(geometry, material);
      return mesh;
    };
    const steam: THREE.Mesh[] = [];
    if (a.draped === 'cape') {
      const cloth = new THREE.MeshStandardMaterial({ map: clothTexture(a.cape), roughness: 0.75, side: THREE.DoubleSide });
      cloth.map!.repeat.set(3, 3);
      const f = backT / 2 + 0.012, b = -backT / 2 - 0.03;
      if (a.justLeft) {
        // Flung over one arm and trailing to the floor.
        const x0 = armX;
        sheet(top, [new THREE.Vector3(0.05, thick + 0.01, 0.05), new THREE.Vector3(x0 - 0.1, thick + 0.06, 0.03), new THREE.Vector3(x0, armY + 0.05, 0.02), new THREE.Vector3(x0 + 0.07, armY - 0.08, 0.02), new THREE.Vector3(x0 + 0.1, -0.2, 0.04), new THREE.Vector3(x0 + 0.13, -seatY + 0.2, 0.06)], (t) => mix(0.42, 0.62, t), cloth, 0.03).rotation.y = 0;
      } else {
        sheet(back, [new THREE.Vector3(0, 0.06, f + 0.02), new THREE.Vector3(0, backH * 0.6, f), new THREE.Vector3(0, backH + 0.045, f - 0.01), new THREE.Vector3(0, backH + 0.05, b), new THREE.Vector3(0, backH * 0.5, b - 0.015), new THREE.Vector3(0, -0.02, b - 0.03)], (t) => mix(0.5, 0.7, Math.abs(t - 0.5) * 2), cloth, 0.02);
      }
    } else if (a.draped === 'towel') {
      const terry = s.material('#ece5d2', { roughness: 1, side: THREE.DoubleSide });
      const tf = Math.max(0.05, backT / 2 + 0.016);
      rounded(back, [0.28, 0.34, 0.016], [0, headY - 0.1, tf], terry, 0.007);
      rounded(back, [0.28, 0.3, 0.016], [0, headY - 0.08, -tf], terry, 0.007);
      rounded(back, [0.28, 0.018, tf * 2 + 0.016], [0, headY + 0.064, 0], terry, 0.008);
      const band = s.material('#3f6bb0', { roughness: 0.9 });
      for (const y of [headY - 0.2, headY - 0.225]) back.box([0.282, 0.012, 0.004], [0, y, tf + 0.007], band);
      back.box([0.282, 0.014, 0.004], [0, headY - 0.18, -tf - 0.007], band);
      const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.035 + i * 0.012, 10, 8), vapour);
        puff.position.set((random() - 0.5) * 0.16, headY + 0.12 + i * 0.07, (random() - 0.5) * 0.04);
        back.root.add(puff);
        steam.push(puff);
      }
    } else if (a.draped === 'booster') {
      const board = rounded(top, [armX * 2 + 0.14, 0.03, 0.24], [0, armY + 0.052, 0.03], s.material('#b98a4e', { roughness: 0.55 }), 0.012);
      board.rotation.y = (random() - 0.5) * 0.12;
      rounded(top, [armX * 2 - 0.1, 0.035, 0.2], [0, armY + 0.083, 0.03], s.material(mood.cheer > 0.5 ? '#d2382e' : '#3d5c8a', { roughness: 0.5 }), 0.015);
    } else if (a.draped === 'jacket') {
      const tweed = s.material(mood.warmth > 0.5 ? '#6a5132' : '#3b4656', { roughness: 0.95, side: THREE.DoubleSide });
      const f = backT / 2 + 0.014, b = -backT / 2 - 0.035;
      sheet(back, [new THREE.Vector3(0, backH * 0.55, f), new THREE.Vector3(0, backH + 0.05, f - 0.01), new THREE.Vector3(0, backH + 0.055, b), new THREE.Vector3(0, backH * 0.4, b - 0.02), new THREE.Vector3(0, 0.02, b - 0.03)], (t) => mix(0.52, 0.6, t), tweed, 0.015);
      for (const side of [-1, 1]) back.tube([[side * 0.26, backH + 0.02, b], [side * 0.31, backH * 0.6, b - 0.03], [side * 0.3, backH * 0.12, b - 0.02 + random() * 0.04]], 0.04, tweed);
    }

    // --- Someone just got up: clippings on the seat and around the base.
    const hairTint = new THREE.Color().setHSL(mix(0.06, 0.1, random()), mix(0.25, 0.6, random()), mix(0.06, 0.24, random()));
    const tufts: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const floorCount = a.justLeft ? Math.round(mix(70, 220, mood.density)) : Math.round(mood.density * mood.wear * 30);
    for (let i = 0; i < floorCount; i++) {
      const angle = random() * Math.PI * 2, r = mix(0.2, 0.62, Math.sqrt(random()));
      tufts.push({ at: [Math.cos(angle) * r, r < 0.34 ? 0.09 * (1 - (r - 0.2) / 0.14) + 0.01 : 0.006, Math.sin(angle) * r * 0.9 + 0.05], size: mix(0.008, 0.02, random()), color: hairTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1) });
    }
    if (floorCount > 0) s.scatter(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), tufts);
    if (a.justLeft) {
      const onSeat = Array.from({ length: 26 }, () => ({ at: [(random() - 0.5) * seatW * 0.7, thick + 0.006, (random() - 0.5) * seatD * 0.7] as [number, number, number], size: mix(0.008, 0.02, random()), color: hairTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12) }));
      top.scatter(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), onSeat);
    }

    const sway = a.justLeft ? mix(0.02, 0.07, mood.energy) : 0;
    const rest = top.root.rotation.y;
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        if (sway) top.root.rotation.y = rest + Math.sin(time * 1.3) * sway * Math.exp(-((time % 9) * 0.5));
        steam.forEach((puff, index) => {
          const phase = (time * mix(0.15, 0.5, mood.energy) + index * 0.25) % 1;
          puff.position.y = headY + 0.1 + phase * 0.3;
          puff.scale.setScalar(0.7 + phase * 1.3);
        });
      },
    });
  },
});
