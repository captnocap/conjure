import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const FUR = { golden: '#c8963e', chocolate: '#70492f', grey: '#9c9690', cream: '#e3d8be', pink: '#d9a3a6' } as const;
type P3 = readonly [number, number, number];

export default defineThing({
  questions: {
    loved: score('How loved is the bear?', ['Shop-new, plush and stiff', 'Well hugged, a little flattened', 'Worn thin on the nose, ears and paws', 'Loved to the weave, nearly bald and floppy']),
    fur: choice('What colour was its fur?', {
      golden: 'Classic golden mohair.',
      chocolate: 'Chocolate brown.',
      grey: 'Soft grey, perhaps once white.',
      cream: 'Cream.',
      pink: 'Faded pink.',
    }),
    pose: choice('How is it sitting?', {
      slumped: 'Slumped forward, chin on chest, as if asleep or sad.',
      upright: 'Propped upright, arms open, looking straight out.',
      toppled: 'Fallen over onto its side where it was dropped.',
    }),
    eye: choice('What about its eyes?', {
      matched: 'Both original black glass eyes.',
      button: 'One eye replaced with a big mismatched coat button.',
      cross: 'One eye replaced by a stitched cross of thread.',
      socket: 'One eye simply gone, a pale patch and loose threads.',
    }),
    missing: choice('What else is missing or coming apart?', {
      nothing: 'Nothing: it is all there.',
      ear: 'An ear has gone.',
      arm: 'An arm is off, stuffing showing at the shoulder.',
      stuffing: 'A side seam has split and stuffing is leaking out.',
    }),
    repair: choice('What mending has been done?', {
      none: 'None.',
      seam: 'A belly seam restitched in thick red thread.',
      patch: 'A square gingham patch sewn over the tummy.',
      paws: 'New felt pads on the paws, a different colour from the old ones.',
    }),
    ribbon: choice('What does it wear round its neck?', {
      none: 'Nothing.',
      red: 'A red satin bow.',
      blue: 'A faded blue ribbon bow, frayed.',
      scarf: 'A hand-knitted striped scarf.',
      tag: 'A paper luggage tag on string with a name written on it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const love = clamp01(a.loved * 0.8 + mood.wear * 0.3);
    const base = new THREE.Color(FUR[a.fur]);
    const grey = (base.r + base.g + base.b) / 3;
    base.lerp(new THREE.Color(grey, grey * 0.97, grey * 0.9), love * 0.45);
    const weave = base.clone().lerp(new THREE.Color('#cdb894'), 0.75);

    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    const css = (c: THREE.Color, k = 1) => `rgb(${Math.round(c.r ** (1 / 2.2) * 255 * k)},${Math.round(c.g ** (1 / 2.2) * 255 * k)},${Math.round(c.b ** (1 / 2.2) * 255 * k)})`;
    g.fillStyle = css(base); g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { g.fillStyle = css(base, 0.8 + random() * 0.35); g.fillRect(random() * 256, random() * 256, 2, 4 + random() * 4); }
    // Bald patches where the pile has rubbed away to the backing cloth.
    const tile = document.createElement('canvas'); tile.width = tile.height = 5;
    const tg = tile.getContext('2d')!;
    tg.fillStyle = css(weave); tg.fillRect(0, 0, 5, 5);
    tg.fillStyle = css(weave, 0.8); tg.fillRect(0, 0, 5, 1); tg.fillRect(0, 0, 1, 5);
    const cloth = g.createPattern(tile, 'repeat')!;
    for (let i = 0; i < love * 16; i++) {
      const x = random() * 256, y = random() * 256, r = 14 + random() * 30 * love, squash = 0.5 + random() * 0.5, turn = random() * 3;
      g.fillStyle = cloth;
      for (const [dx, dy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) {
        g.beginPath(); g.ellipse(x + dx, y + dy, r, r * squash, turn, 0, Math.PI * 2); g.fill();
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 1);
    const fur = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    const padColour = a.repair === 'paws' ? '#7d8fa6' : `#${weave.clone().lerp(new THREE.Color('#8a6a4a'), 0.35).getHexString()}`;
    const pad = s.material(padColour, { roughness: 0.95 });
    const dark = s.material('#1d1a19', { roughness: 0.25 });
    const thread = s.material('#3a2d25', { roughness: 1 });
    const fluff = s.material('#f5f1e6', { roughness: 1 });

    const bear = new THREE.Group();
    s.root.add(bear);
    const into = (parent: THREE.Object3D) => (size: P3, at: P3, material: THREE.Material, segments = 20) => { const m = s.ball(size, at, material, segments); parent.add(m); return m; };
    const sag = mix(1, 0.86, love);

    // Body.
    const torso = new THREE.Group(); bear.add(torso);
    const t = into(torso);
    t([0.088, 0.102 * sag, 0.078], [0, 0.102 * sag, 0], fur, 24);
    const shoulderY = 0.165 * sag;

    // Head, hung on its own joint so it can loll.
    const head = new THREE.Group(); head.position.set(0, 0.2 * sag, 0.005); torso.add(head);
    const h = into(head);
    h([0.07, 0.066, 0.066], [0, 0.055, 0], fur, 24);
    h([0.036, 0.029, 0.034], [0, 0.04, 0.048], s.material(weave.clone().lerp(base, 1 - love * 0.8), { roughness: 1 }), 16);
    h([0.014, 0.01, 0.009], [0, 0.052, 0.08], love > 0.75 ? thread : dark, 12);
    const smile = mix(-0.006, 0.006, mood.cheer);
    for (const side of [-1, 1]) { const m = s.rod([0, 0.043, 0.082], [side * 0.014, 0.03 + smile, 0.076], 0.0016, thread); head.add(m); }
    head.add(s.rod([0, 0.052, 0.082], [0, 0.043, 0.082], 0.0016, thread));
    for (const side of [-1, 1]) {
      if (a.missing === 'ear' && side === 1) {
        for (let i = 0; i < 4; i++) head.add(s.rod([0.05, 0.1, 0], [0.05 + (random() - 0.3) * 0.03, 0.1 + random() * 0.025, (random() - 0.5) * 0.02], 0.001, thread));
        continue;
      }
      const ear = h([0.027, 0.027, 0.012], [side * 0.052, 0.108, -0.004], fur, 14);
      ear.rotation.z = -side * (0.35 + love * 0.3 * random());
      h([0.017, 0.017, 0.006], [side * 0.051, 0.106, 0.006], pad, 12).rotation.z = ear.rotation.z;
    }
    const eyeAt = (side: number): P3 => [side * 0.027, 0.07, 0.056];
    h([0.0085, 0.0085, 0.006], eyeAt(-1), dark, 12);
    const [ex, ey, ez] = eyeAt(1);
    if (a.eye === 'matched') h([0.0085, 0.0085, 0.006], [ex, ey, ez], dark, 12);
    else if (a.eye === 'button') {
      const button = s.cylinder(0.015, 0.015, 0.004, [ex, ey - 0.002, ez + 0.003], s.material(new THREE.Color().setHSL(random(), 0.55, 0.5), { roughness: 0.3 }), 18);
      button.rotation.set(Math.PI / 2 - 0.2, 0, 0.35); head.add(button);
      for (const q of [0.4, -0.4]) { const m = s.rod([ex - 0.005, ey - 0.002 + q * 0.012, ez + 0.0065], [ex + 0.005, ey - 0.002 - q * 0.012, ez + 0.0055], 0.001, fluff); head.add(m); }
    } else if (a.eye === 'cross') {
      for (const q of [1, -1]) head.add(s.rod([ex - 0.009, ey + q * 0.009, ez + 0.002], [ex + 0.009, ey - q * 0.009, ez], 0.0017, thread));
    } else {
      h([0.01, 0.01, 0.003], [ex, ey, ez], s.material(weave, { roughness: 1 }), 10);
      head.add(s.rod([ex, ey, ez + 0.003], [ex + 0.008, ey - 0.03, ez + 0.012], 0.0009, thread));
      head.add(s.rod([ex, ey, ez + 0.003], [ex - 0.006, ey - 0.02, ez + 0.014], 0.0009, thread));
    }

    // Arms on disc joints.
    for (const side of [-1, 1]) {
      const sx = side * 0.086;
      if (a.missing === 'arm' && side === -1) {
        const hole = s.cylinder(0.022, 0.022, 0.004, [sx * 0.94, shoulderY, 0.01], s.material('#4a382c', { roughness: 1 }), 14);
        hole.rotation.z = Math.PI / 2 - 0.3; torso.add(hole);
        for (let i = 0; i < 5; i++) t([0.012 + random() * 0.008, 0.012, 0.012], [sx * (1 + random() * 0.12), shoulderY + (random() - 0.5) * 0.02, 0.01 + (random() - 0.5) * 0.02], fluff, 8);
        continue;
      }
      const arm = new THREE.Group(); arm.position.set(sx, shoulderY, 0.012); torso.add(arm);
      const droop = a.pose === 'upright' ? mix(0.9, 0.55, love) : mix(0.35, 0.12, love);
      arm.rotation.set(a.pose === 'upright' ? -0.5 : -0.25 - random() * 0.2, 0, side * droop, 'ZXY');
      const ar = into(arm);
      ar([0.029, 0.075, 0.031], [side * 0.004, -0.058, 0], fur, 16);
      ar([0.02, 0.022, 0.008], [side * 0.004, -0.108, 0.02], pad, 12).rotation.x = 0.5;
      const disc = s.cylinder(0.014, 0.014, 0.005, [side * 0.026, -0.004, 0], pad, 12); disc.rotation.z = Math.PI / 2; arm.add(disc);
      if (a.missing === 'nothing' && a.repair === 'seam' && side === 1) for (let i = 0; i < 7; i++) { const q = i / 7 * Math.PI * 2; arm.add(s.rod([0.02, Math.cos(q) * 0.024 - 0.012, Math.sin(q) * 0.026], [0.03, Math.cos(q) * 0.03 - 0.012, Math.sin(q) * 0.032], 0.0017, s.material('#b3262b'))); }
    }
    // Legs stuck out in front.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * 0.052, 0.036, 0.04); bear.add(leg);
      leg.rotation.y = side * (0.3 + random() * 0.25 + love * 0.2); leg.rotation.x = -0.05;
      const l = into(leg);
      l([0.034, 0.035, 0.078], [0, 0, 0.06], fur, 16);
      l([0.035, 0.042, 0.03], [0, 0.012, 0.125], fur, 14);
      l([0.026, 0.032, 0.008], [0, 0.013, 0.152], pad, 12);
    }

    // Mending.
    const red = s.material('#b3262b', { roughness: 1 });
    if (a.repair === 'seam') {
      for (let i = 0; i < 8; i++) {
        const y = (0.04 + i * 0.016) * sag, z = Math.sqrt(Math.max(0, 1 - ((y - 0.102 * sag) / (0.102 * sag)) ** 2)) * 0.078 + 0.001;
        torso.add(s.rod([-0.008, y, z], [0.008, y + 0.008, z], 0.0018, red));
      }
    } else if (a.repair === 'patch') {
      const check = document.createElement('canvas'); check.width = check.height = 64;
      const c = check.getContext('2d')!; c.fillStyle = '#f3ecdc'; c.fillRect(0, 0, 64, 64);
      c.fillStyle = 'rgba(60,110,170,0.55)'; for (let i = 0; i < 64; i += 16) { c.fillRect(i, 0, 8, 64); c.fillRect(0, i, 64, 8); }
      const tex = new THREE.CanvasTexture(check); tex.colorSpace = THREE.SRGBColorSpace;
      const patch = s.mesh(new THREE.SphereGeometry(1, 12, 8, Math.PI / 2 - 0.42, 0.84, Math.PI / 2 - 0.36, 0.72), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }), [0.01, 0.098 * sag, 0]);
      patch.scale.set(0.0895, 0.1035 * sag, 0.0795); patch.rotation.z = 0.12; torso.add(patch);
    }
    if (a.missing === 'stuffing') {
      for (let i = 0; i < 7; i++) t([0.012 + random() * 0.01, 0.012 + random() * 0.006, 0.012], [0.078 + random() * 0.02, 0.07 * sag + (random() - 0.5) * 0.05, 0.02 + (random() - 0.5) * 0.03], fluff, 8);
      for (let i = 0; i < 3; i++) s.ball([0.014, 0.01, 0.013], [0.14 + random() * 0.06, 0.008, 0.04 + random() * 0.08], fluff, 8);
    }

    // Neckwear sits on the torso under the chin.
    const ny = 0.193 * sag;
    if (a.ribbon === 'red' || a.ribbon === 'blue') {
      const satin = s.material(a.ribbon === 'red' ? '#c2272d' : '#8fa9c6', { roughness: a.ribbon === 'red' ? 0.3 : 0.9 });
      const band = s.ring(0.05, 0.007, [0, ny, 0.004], satin); band.rotation.x = Math.PI / 2; band.scale.set(1, 0.95, 1.4); torso.add(band);
      const fray = a.ribbon === 'blue' ? 0.75 : 1;
      for (const side of [-1, 1]) {
        const loop = t([0.028 * fray, 0.016 * fray, 0.008], [side * 0.03, ny + 0.002, 0.056], satin, 12); loop.rotation.z = side * (a.ribbon === 'blue' ? -0.5 : 0.25);
        const tail = s.box([0.014, 0.055 * fray, 0.003], [side * 0.014, ny - 0.03, 0.062], satin); tail.rotation.z = side * 0.3; torso.add(tail);
      }
      t([0.01, 0.01, 0.008], [0, ny, 0.06], satin, 10);
    } else if (a.ribbon === 'scarf') {
      const hue = random();
      const wool = [s.material(new THREE.Color().setHSL(hue, 0.5, 0.45), { roughness: 1 }), s.material('#efe7d4', { roughness: 1 })];
      const band = s.ring(0.052, 0.014, [0, ny, 0.004], wool[0]); band.rotation.x = Math.PI / 2; band.scale.set(1, 0.95, 1.2); torso.add(band);
      for (let i = 0; i < 6; i++) { const piece = s.box([0.032, 0.0145, 0.01], [0.03 + i * 0.002, ny - 0.012 - i * 0.0145, 0.066 - i * 0.001], wool[i % 2]); piece.rotation.z = 0.12; torso.add(piece); }
    } else if (a.ribbon === 'tag') {
      const band = s.ring(0.05, 0.0018, [0, ny, 0.004], s.material('#b89b6a')); band.rotation.x = Math.PI / 2; torso.add(band);
      const name = ['TED', 'BRUNO', 'BEAR', 'MR B', 'OLD TED', 'HONEY'][Math.floor(random() * 6)];
      const tag = s.label(name, 0.062, 0.034, [0.022, ny - 0.045, 0.079], '#3b3027', '#e2cfa0');
      tag.rotation.z = -0.3 + random() * 0.2; tag.rotation.x = -0.15; torso.add(tag);
      torso.add(s.rod([0.004, ny - 0.004, 0.058], [0.012, ny - 0.03, 0.079], 0.001, s.material('#b89b6a')));
    }

    // Pose.
    const tilt = (random() - 0.5) * 0.3;
    if (a.pose === 'slumped') {
      torso.rotation.x = mix(0.2, 0.42, love); head.rotation.set(mix(0.3, 0.55, love), tilt * 0.6, tilt + 0.15);
    } else if (a.pose === 'upright') {
      torso.rotation.x = -0.06; head.rotation.set(0.05, tilt * 0.5, tilt * love);
    } else {
      torso.rotation.x = 0.12; head.rotation.set(0.2, 0, tilt);
      bear.rotation.set(0, 0.3 + random() * 0.4, (random() < 0.5 ? -1 : 1) * 1.38, 'YZX');
    }
    bear.rotation.y += (random() - 0.5) * 0.25;
    // Tiny overlapping balls self-shadow in black rings under a low key light; let the bear only cast.
    bear.traverse((node) => { node.receiveShadow = false; });
    return s.finish();
  },
});
