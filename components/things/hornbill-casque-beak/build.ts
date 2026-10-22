import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix } from '@conjure/kit';
import { type V3, blob, bough, coat, eye, settle, skin, sweep, tufts } from './beast';

export default defineThing({
  questions: {
    casque: choice('What shape is the casque on top of the bill?', {
      ridge: 'A low smooth ridge, a young bird barely horned.',
      curl: 'A tall banana curl sweeping forward and up into a point.',
      block: 'A heavy helmeted block, blunt-fronted like a battering ram.',
      crescent: 'A broad flat saddle with two forward points, like a golden crescent.',
    }),
    holds: choice('What is in the bill?', {
      empty: 'Nothing; the bill is closed.',
      fig: 'A ripe red fig held delicately at the very tip.',
      lizard: 'A limp green lizard dangling by its middle.',
      mud: 'A wet gob of mud for sealing a mate into the nest hole.',
      call: 'Nothing, but the bill gapes wide in a barking call.',
    }),
    made: choice('Is it a living bird?', {
      living: 'A living bird: glossy black feathers on a mossy perch.',
      carved: 'A carved and painted wooden hornbill, a longhouse spirit figure on a stand, hung with beads.',
      beaded: 'A real bill and casque mounted as a ceremonial headdress piece with beads and banded tail feathers fanned behind.',
    }),
    tip: choice('What has happened to the bill tip?', {
      intact: 'Perfect, glossy and needle-fine.',
      chipped: 'Chipped and scuffed from sparring.',
      blunt: 'Broken short long ago and worn blunt.',
    }),
    tilt: choice('How is the head held?', {
      level: 'Level and regal, in profile.',
      cocked: 'Cocked sideways, one eye inspecting the viewer.',
      down: 'Dipped low, peering down under the bill.',
      tossed: 'Thrown up and back, about to toss the morsel down its throat.',
    }),
    eye: choice('What colour is the eye?', {
      red: 'A fierce ruby red, a male.',
      pale: 'A cool white-blue, a female.',
      amber: 'Warm amber.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const living = a.made === 'living', carved = a.made === 'carved';
    const worn = Math.min(1, mood.wear * 0.7 + { intact: 0, chipped: 0.45, blunt: 0.6 }[a.tip]);

    // Bill and casque are painted along their length: base to tip.
    const ramp = (stops: readonly string[], bands = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      if (bands) {
        const h = 256 / stops.length;
        stops.forEach((colour, i) => { ctx.fillStyle = colour; ctx.fillRect(0, 256 - (i + 1) * h, 64, h + 1); });
        ctx.fillStyle = '#1d1512';
        for (let i = 1; i < stops.length; i++) for (let x = 0; x < 64; x += 8) { ctx.beginPath(); ctx.moveTo(x, 256 - i * h + 5); ctx.lineTo(x + 4, 256 - i * h - 5); ctx.lineTo(x + 8, 256 - i * h + 5); ctx.fill(); }
      } else {
        const gradient = ctx.createLinearGradient(0, 256, 0, 0);
        stops.forEach((colour, i) => gradient.addColorStop(i / (stops.length - 1), colour));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 256);
      }
      ctx.strokeStyle = bands ? '#3a2616' : '#6b4a2a';
      for (let i = 0; i < worn * 46; i++) {
        ctx.globalAlpha = 0.25 + random() * 0.4; ctx.lineWidth = 0.6 + random() * 1.4;
        const x = random() * 64, y = random() * 256;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 8, y + 10 + random() * 34); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: mix(0.28, 0.75, worn) });
    };
    const billPaint = carved ? ramp(['#1d1512', '#c23a22', '#f1e4c0', '#f1e4c0', '#f1e4c0', '#e2b33a'], true) : ramp(['#1b1614', '#e0562a', '#f0a23a', '#f3dc9a', '#f5ecd0', '#f7f1dc']);
    const casquePaint = carved ? ramp(['#b8301c', '#c23a22', '#e2b33a', '#efd27a']) : ramp(['#d8321f', '#e8502a', '#f08a2e', '#f6c64a', '#f9e08a']);
    const wood = coat(context, '#6d4728', '#3f2815', { roughness: 0.7 });
    const feather = living ? coat(context, '#211f26', '#4c4963', { roughness: 0.42 }) : wood;
    const rattan = coat(context, '#b8935a', '#7c5c30');
    const bare = skin(living ? '#2b2530' : '#2a1b12');

    // Perch or stand.
    let neckBase = 0.2;
    if (living) {
      bough(root, context, [[0.01, 0, 0], [-0.01, 0.07, 0.01], [0, 0.15, 0]], (t) => mix(0.115, 0.095, t), { moss: mix(0.3, 1, mood.density), leafy: mood.density * 0.6 });
      blob(root, [0.105, 0.085, 0.105], [0, 0.2, -0.01], feather, [0, 0, 0], 22);
      const hackles = [];
      for (let i = 0; i < 26; i++) { const az = random() * Math.PI * 2; hackles.push({ at: [Math.cos(az) * 0.08, 0.2 + random() * 0.04, Math.sin(az) * 0.1 - 0.01] as V3, dir: [Math.cos(az), -2.6, Math.sin(az)] as V3, len: 0.05 + random() * 0.03, r: 0.026 }); }
      tufts(root, hackles, feather);
      neckBase = 0.26;
    } else {
      const profile: [number, number][] = [[0, 0], [0.13, 0], [0.13, 0.03], [0.08, 0.05], [0.055, 0.1], [0.07, 0.15], [0.05, 0.2], [0, 0.2]];
      const stand = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), carved ? 8 : 20), wood);
      stand.castShadow = stand.receiveShadow = true;
      root.add(stand);
      if (carved) {
        // A stylised carved body with a spiral tail.
        blob(root, [0.085, 0.07, 0.15], [0, 0.26, -0.07], wood, [0.25, 0, 0], 16);
        const curl = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 26, Math.PI * 1.6), casquePaint);
        curl.position.set(0, 0.36, -0.22);
        curl.rotation.set(0, Math.PI / 2, 0);
        curl.castShadow = true;
        root.add(curl);
      }
    }

    // Neck.
    const headAt: V3 = [0, 0.66, 0.05];
    sweep(root, [[0, neckBase - 0.05, -0.03], [0, mix(neckBase, headAt[1], 0.45), -0.055], [0, mix(neckBase, headAt[1], 0.8), -0.01], headAt], (t) => mix(0.062, 0.037, t), a.made === 'beaded' ? rattan : feather, { radial: 12 });

    const head = new THREE.Group();
    head.position.set(...headAt);
    head.rotation.order = 'YXZ';
    const turn = (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.4);
    head.rotation.set({ level: -0.12, cocked: -0.05, down: 0.35, tossed: -0.8 }[a.tilt], turn, a.tilt === 'cocked' ? Math.sign(turn) * 0.5 : (random() - 0.5) * 0.08);
    root.add(head);
    blob(head, [0.058, 0.057, 0.07], [0, 0, 0], a.made === 'beaded' ? rattan : feather, [0, 0, 0], 22);
    if (living) {
      const crest = [];
      for (let i = 0; i < 14; i++) { const u = (random() - 0.5) * 1.6; crest.push({ at: [Math.sin(u) * 0.04, 0.02 + Math.cos(u) * 0.02, -0.04 - random() * 0.02] as V3, dir: [Math.sin(u) * 0.4, -0.15, -1] as V3, len: 0.025 + random() * 0.02, r: 0.012 }); }
      tufts(head, crest, feather);
    }

    // Bill.
    const cut = a.tip === 'blunt' ? 0.82 : a.tip === 'chipped' ? 0.95 : 1;
    const upper: V3[] = [[0, 0.004, 0.035], [0, 0.008, 0.14], [0, -0.012, 0.255], [0, -0.062, 0.355]];
    const lower: V3[] = [[0, -0.012, 0.005], [0, -0.014, 0.105], [0, -0.03, 0.21], [0, -0.064, 0.3]];
    const trim = (points: V3[]) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
      return Array.from({ length: 7 }, (_u, i) => curve.getPointAt((i / 6) * cut).toArray() as V3);
    };
    const tipR = a.tip === 'blunt' ? 0.016 : a.tip === 'chipped' ? 0.01 : 0.005;
    sweep(head, trim(upper), (t) => mix(0.041, tipR, t ** 0.85), billPaint, { flat: 1.12, radial: 14, segments: 28 });
    const open = { empty: 0.02, fig: 0.13, lizard: 0.16, mud: 0.1, call: 0.42 }[a.holds];
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.022, 0.03);
    jaw.rotation.x = open;
    head.add(jaw);
    sweep(jaw, trim(lower), (t) => mix(0.03, tipR * 0.8, t ** 0.85), billPaint, { flat: 0.72, radial: 12, segments: 24 });
    if (a.tip !== 'intact') blob(head, [0.007, 0.006, 0.01], [0.004, upper[3][1] * cut * cut + 0.004, upper[3][2] * cut - 0.004], skin('#8a6a48'), [0, 0, 0], 6);
    if (a.holds === 'call') blob(jaw, [0.016, 0.006, 0.07], [0, -0.012, 0.1], skin('#d8707a', { roughness: 0.4 }), [0.2, 0, 0], 8);

    // Casque.
    const up: V3 = [0, 1, 0];
    if (a.casque === 'ridge') sweep(head, [[0, 0.045, -0.03], [0, 0.06, 0.05], [0, 0.046, 0.135]], (t) => 0.024 * Math.sin(Math.PI * mix(0.25, 0.9, t)) + 0.006, casquePaint, { flat: 0.9, up, radial: 12 });
    else if (a.casque === 'curl') sweep(head, [[0, 0.045, -0.045], [0, 0.074, 0.04], [0, 0.092, 0.125], [0, 0.135, 0.19], [0, 0.205, 0.205]], (t) => mix(0.037, 0.009, t ** 1.3), casquePaint, { flat: 1.25, up: [0, 0.6, -1], radial: 12, segments: 34 });
    else if (a.casque === 'block') {
      sweep(head, [[0, 0.052, -0.05], [0, 0.066, 0.04], [0, 0.062, 0.15]], 0.034, casquePaint, { flat: 1.12, up, radial: 14 });
      blob(head, [0.024, 0.028, 0.008], [0, 0.063, 0.153], skin('#f2dc8e', { roughness: 0.4 }), [0, 0, 0], 10);
    } else {
      blob(head, [0.05, 0.02, 0.09], [0, 0.064, 0.03], casquePaint, [0, 0, 0], 16);
      for (const side of [-1, 1]) sweep(head, [[side * 0.03, 0.068, 0.05], [side * 0.036, 0.076, 0.11], [side * 0.04, 0.094, 0.155]], (t) => mix(0.017, 0.004, t), casquePaint, { segments: 8, radial: 8 });
    }

    // Eye with its ring of bare skin and lashes.
    const iris = { red: '#c4201c', pale: '#dfeaf2', amber: '#d28a1e' }[a.eye];
    for (const side of [-1, 1]) {
      const at: V3 = [side * 0.049, 0.012, 0.03];
      blob(head, [0.008, 0.027, 0.027], [side * 0.05, 0.012, 0.03], living ? skin('#7d8ea6') : bare, [0, 0, 0], 12);
      if (living) {
        eye(head, { at, r: 0.0165, look: [side, 0.05, 0.4], iris, white: '#1a1516', irisSize: 0.8, pupil: 0.45, lid: a.holds === 'call' ? 0.25 : 0.08, lidMaterial: bare });
        const lashes = [];
        for (let i = 0; i < 9; i++) { const u = mix(-1.1, 1.1, i / 8); lashes.push({ at: [side * 0.058, 0.012 + Math.cos(u) * 0.018, 0.03 + Math.sin(u) * 0.018] as V3, dir: [side * 0.9, Math.cos(u) + 0.2, Math.sin(u)] as V3, len: 0.02, r: 0.003 }); }
        tufts(head, lashes, skin('#0e0c0d'));
      } else {
        blob(head, [0.005, 0.014, 0.014], [side * 0.057, 0.012, 0.03], skin('#f3ecd8', { roughness: 0.3 }), [0, 0, 0], 10);
        blob(head, [0.004, 0.007, 0.007], [side * 0.061, 0.012, 0.03], skin(iris, { roughness: 0.3 }), [0, 0, 0], 8);
      }
    }

    // What the bill holds, pinched between the tips.
    const pinch: V3 = [0, upper[3][1] * cut - 0.022, upper[3][2] * cut - 0.03];
    if (a.holds === 'fig') {
      blob(head, [0.025, 0.027, 0.025], pinch, skin('#b3262a', { roughness: 0.4 }), [0, 0, 0], 12);
      blob(head, [0.005, 0.008, 0.005], [pinch[0], pinch[1] + 0.026, pinch[2]], skin('#4a6a2a'), [0, 0, 0], 6);
    } else if (a.holds === 'mud') {
      const mud = skin('#5d4631', { roughness: 0.35 });
      blob(head, [0.03, 0.022, 0.034], pinch, mud, [0, 0, 0], 10);
      blob(head, [0.012, 0.03, 0.012], [pinch[0] + 0.006, pinch[1] - 0.03, pinch[2] + 0.004], mud, [0, 0, 0], 8);
      blob(head, [0.02, 0.012, 0.03], [0.012, pinch[1] + 0.03, pinch[2] - 0.04], mud, [0, 0, 0], 8);
    } else if (a.holds === 'lizard') {
      const green = skin('#5f9a3a', { roughness: 0.5 }), s = random() < 0.5 ? -1 : 1;
      sweep(head, [[s * 0.075, pinch[1] - 0.085, pinch[2] + 0.01], [s * 0.045, pinch[1] - 0.03, pinch[2]], [0, pinch[1], pinch[2]], [-s * 0.045, pinch[1] - 0.035, pinch[2]], [-s * 0.06, pinch[1] - 0.1, pinch[2] + 0.01], [-s * 0.05, pinch[1] - 0.17, pinch[2]]], (t) => mix(0.013, 0.003, Math.abs(t - 0.25) * 1.3), green, { segments: 30, radial: 8 });
      blob(head, [0.012, 0.016, 0.011], [s * 0.078, pinch[1] - 0.1, pinch[2] + 0.01], green, [0, 0, 0], 8);
      for (const k of [0.5, -0.6]) sweep(head, [[s * 0.04 * k, pinch[1] - 0.025, pinch[2]], [s * 0.04 * k, pinch[1] - 0.04, pinch[2] + 0.03], [s * 0.04 * k, pinch[1] - 0.065, pinch[2] + 0.035]], 0.003, green, { segments: 5, radial: 4 });
    }

    // Ceremony: beads and feathers.
    if (!living) {
      const palette = ['#c8312a', '#f0c23a', '#f3ecd8', '#1e4f9a', '#1d1512', '#2e8a5a'];
      const beads: { at: V3; colour: string }[] = [];
      const strands = Math.round(mix(3, 8, mood.density));
      for (let i = 0; i < strands; i++) {
        const z0 = mix(0.02, 0.2, i / Math.max(1, strands - 1)), y0 = -0.045 - z0 * 0.2, len = 0.07 + random() * 0.09, side = i % 2 ? -1 : 1;
        const n = Math.round(len / 0.011);
        for (let j = 0; j < n; j++) beads.push({ at: [side * 0.022, y0 - j * 0.011, z0], colour: palette[(i + (j >> 1)) % palette.length] });
        beads.push({ at: [side * 0.022, y0 - n * 0.011 - 0.006, z0], colour: '#f3ecd8' });
      }
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), beads.length);
      const matrix = new THREE.Matrix4();
      beads.forEach((bead, i) => { matrix.makeScale(0.0062, 0.0062, 0.0062).setPosition(...bead.at); mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, new THREE.Color(bead.colour)); });
      mesh.castShadow = true;
      jaw.add(mesh);
      if (a.made === 'beaded') {
        const canvas = document.createElement('canvas');
        canvas.width = 16; canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#e4d9bd'; ctx.fillRect(0, 0, 16, 64);
        ctx.fillStyle = '#18161a'; ctx.fillRect(0, 12, 16, 16); ctx.fillRect(0, 50, 16, 14);
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const quill = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, side: THREE.DoubleSide });
        const n = 7;
        for (let i = 0; i < n; i++) {
          const fan = mix(-0.95, 0.95, i / (n - 1)) + (random() - 0.5) * 0.08, len = 0.3 + random() * 0.05;
          const geometry = new THREE.SphereGeometry(1, 10, 8);
          geometry.scale(0.034, len / 2, 0.004);
          geometry.translate(0, len / 2, 0);
          const plume = new THREE.Mesh(geometry, quill);
          plume.position.set(0, 0.02, -0.06);
          plume.rotation.set(-0.35, 0, -fan);
          plume.castShadow = true;
          head.add(plume);
        }
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 20), skin('#c8312a'));
        band.position.set(0, -0.045, 0);
        band.rotation.x = Math.PI / 2;
        head.add(band);
      }
    }

    settle(root);
    const speed = mix(0.4, 2.2, mood.energy), restX = head.rotation.x, restY = head.rotation.y;
    return {
      object: root,
      update(_dt, time) {
        if (!living) return;
        head.rotation.y = restY + Math.sin(time * speed * 0.7) * 0.06;
        head.rotation.x = restX + Math.sin(time * speed * 1.3) * 0.02;
        if (a.holds === 'call') jaw.rotation.x = open * (0.7 + 0.3 * Math.abs(Math.sin(time * speed * 3)));
      },
      dispose: () => disposeTree(root),
    };
  },
});
