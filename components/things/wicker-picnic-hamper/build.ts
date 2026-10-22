import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    lid: choice('Is the hamper open?', {
      shut: 'Shut and buckled, still packed, nobody has started.',
      ajar: 'Unbuckled and propped half open, someone has been rummaging.',
      open: 'Thrown wide open, the lid standing up to show its plates and cutlery.',
      off: 'The lid taken right off and leant against the front.',
    }),
    packed: choice('What is packed inside?', {
      feast: 'A baguette, a bottle of wine, cheese and grapes: a courting couple\'s lunch.',
      family: 'Paper-wrapped sandwiches, apples, bananas and enamel mugs for a crowd.',
      tea: 'A teapot, cups, a tin of cake and jam: a proper afternoon tea.',
      empty: 'Nothing but the lining and a crumpled napkin: it has all been eaten.',
      kitten: 'A cat curled up asleep where the food was.',
    }),
    lining: choice('What is it lined with?', {
      red: 'Red and white gingham.',
      blue: 'Blue and white gingham.',
      floral: 'Faded cream chintz sprigged with small flowers.',
      green: 'Dark green tartan, a country-house hamper.',
      linen: 'Plain unbleached linen.',
    }),
    willow: choice('What colour is the wicker?', {
      honey: 'Golden honey willow, new and bright.',
      brown: 'Dark steamed brown willow.',
      white: 'Painted white, seaside and pretty.',
      grey: 'Silvery grey, weathered from years in a shed.',
    }),
    shape: choice('What shape is the hamper?', {
      suitcase: 'A wide flat suitcase hamper with a carry handle between the straps.',
      trunk: 'A deep square trunk with rope handles at the ends, a serious hamper for a party.',
      small: 'A small basket for two with a single strap.',
    }),
    beside: choice('What has come out and lies beside it?', {
      nothing: 'Nothing.',
      cloth: 'A cloth pulled half out and draped over the front edge.',
      apples: 'Apples that have rolled out onto the ground.',
      blanket: 'A rolled tartan blanket, strapped on top or set down next to it.',
      glasses: 'A bottle and two glasses, already poured.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = s.root) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const [W, Hb, D] = { suitcase: [0.48, 0.19, 0.31], trunk: [0.44, 0.29, 0.32], small: [0.34, 0.2, 0.24] }[a.shape];
    const wall = 0.014, lidThick = 0.032;
    const willow = new THREE.Color({ honey: '#c9953f', brown: '#6b4424', white: '#ece6d6', grey: '#9b958a' }[a.willow]).lerp(new THREE.Color('#8b8275'), mood.wear * 0.25);
    const weaveCanvas = canvasTexture(128, (ctx) => {
      ctx.fillStyle = `#${willow.clone().multiplyScalar(0.45).getHexString()}`; ctx.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) for (let col = -1; col < 4; col++) {
        const x = col * 32 + (row % 2) * 16, y = row * 16;
        const g = ctx.createLinearGradient(0, y, 0, y + 16);
        const tone = willow.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08);
        g.addColorStop(0, `#${tone.clone().multiplyScalar(0.7).getHexString()}`); g.addColorStop(0.4, `#${tone.clone().offsetHSL(0, 0, 0.08).getHexString()}`); g.addColorStop(1, `#${tone.clone().multiplyScalar(0.6).getHexString()}`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + 16, y + 8, 17.5, 7, 0, 0, 7); ctx.fill();
      }
    });
    const wicker = (u: number, v: number) => {
      const map = weaveCanvas.clone();
      map.needsUpdate = true;
      map.repeat.set(Math.max(1, Math.round(u / 0.075)), Math.max(1, Math.round(v / 0.075)));
      return new THREE.MeshStandardMaterial({ map, roughness: 0.75 });
    };
    const border = new THREE.MeshStandardMaterial({ color: willow.clone().multiplyScalar(0.72), roughness: 0.7 });
    const leather = s.material(mood.wear > 0.6 ? '#5a3a22' : '#8a5a2e', { roughness: 0.6 });
    const brass = s.material('#c9a14a', { metalness: 0.85, roughness: 0.3 });
    const liningTone = { red: '#cf3a36', blue: '#3b62a8', floral: '#f1e6cf', green: '#1f4a36', linen: '#d9cdb0' }[a.lining];
    const liningMap = canvasTexture(128, (ctx) => {
      ctx.fillStyle = a.lining === 'red' || a.lining === 'blue' ? '#f6f2e6' : liningTone; ctx.fillRect(0, 0, 128, 128);
      if (a.lining === 'red' || a.lining === 'blue') { ctx.fillStyle = liningTone; ctx.globalAlpha = 0.55; for (let i = 0; i < 8; i += 2) { ctx.fillRect(i * 16, 0, 16, 128); ctx.fillRect(0, i * 16, 128, 16); } }
      else if (a.lining === 'floral') for (let i = 0; i < 26; i++) { const x = random() * 128, y = random() * 128; ctx.fillStyle = ['#d8697f', '#7f9ad0', '#e3b23a'][i % 3]; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.256) * 4, y + Math.sin(p * 1.256) * 4, 3, 0, 7); ctx.fill(); } ctx.fillStyle = '#6f9a4a'; ctx.fillRect(x + 5, y + 5, 6, 2); }
      else if (a.lining === 'green') { ctx.globalAlpha = 0.55; for (const [at, wide, colour] of [[10, 26, '#15234a'], [58, 6, '#e3c23a'], [76, 26, '#15234a'], [116, 4, '#c8303a']] as const) { ctx.fillStyle = colour; ctx.fillRect(at, 0, wide, 128); ctx.fillRect(0, at, 128, wide); } }
      else { ctx.strokeStyle = 'rgba(120,100,70,0.25)'; for (let i = 0; i < 128; i += 3) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke(); } }
    });
    const lining = (u: number, v: number) => {
      const map = liningMap.clone();
      map.needsUpdate = true;
      map.repeat.set(Math.max(1, Math.round(u / 0.1)), Math.max(1, Math.round(v / 0.1)));
      return new THREE.MeshStandardMaterial({ map, roughness: 0.95, side: THREE.DoubleSide });
    };

    // Body: four woven walls, a floor, a braided rim and the cloth inside.
    const body = new THREE.Group();
    add(new THREE.Mesh(new THREE.BoxGeometry(W, Hb, wall), wicker(W, Hb)), body).position.set(0, Hb / 2, D / 2 - wall / 2);
    add(new THREE.Mesh(new THREE.BoxGeometry(W, Hb, wall), wicker(W, Hb)), body).position.set(0, Hb / 2, -D / 2 + wall / 2);
    for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(wall, Hb, D - wall * 2), wicker(D, Hb)), body).position.set(side * (W / 2 - wall / 2), Hb / 2, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.004, 0.012, D - 0.004), border), body).position.y = 0.006;
    const braid = (parent: THREE.Object3D, width: number, depth: number, y: number, zCentre: number, radius = 0.011) => {
      for (const side of [-1, 1]) {
        const front = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 10), border), parent); front.rotation.z = Math.PI / 2; front.position.set(0, y, zCentre + side * depth / 2);
        const flank = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 10), border), parent); flank.rotation.x = Math.PI / 2; flank.position.set(side * width / 2, y, zCentre);
        for (const end of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(radius * 1.15, 10, 8), border), parent).position.set(side * width / 2, y, zCentre + end * depth / 2);
      }
    };
    braid(body, W - wall, D - wall, Hb, 0);
    braid(body, W - wall, D - wall, 0.012, 0, 0.009);
    const inW = W - wall * 2 - 0.004, inD = D - wall * 2 - 0.004;
    add(new THREE.Mesh(new THREE.PlaneGeometry(inW, Hb - 0.02), lining(inW, Hb)), body).position.set(0, Hb / 2 + 0.004, -inD / 2);
    const frontLining = add(new THREE.Mesh(new THREE.PlaneGeometry(inW, Hb - 0.02), lining(inW, Hb)), body); frontLining.position.set(0, Hb / 2 + 0.004, inD / 2);
    for (const side of [-1, 1]) { const panel = add(new THREE.Mesh(new THREE.PlaneGeometry(inD, Hb - 0.02), lining(inD, Hb)), body); panel.rotation.y = Math.PI / 2; panel.position.set(side * inW / 2, Hb / 2 + 0.004, 0); }
    const empty = a.packed === 'empty';
    const bed = empty ? 0.016 : Hb * 0.6;
    add(new THREE.Mesh(new THREE.BoxGeometry(inW, 0.006, inD), lining(inW, inD)), body).position.y = bed - 0.003;
    s.root.add(body);

    // Lid: woven outside, lined inside with plates and cutlery strapped in.
    const lid = new THREE.Group();
    const slab = add(new THREE.Mesh(new THREE.BoxGeometry(W, lidThick, D), [wicker(D, lidThick), wicker(D, lidThick), wicker(W, D), border, wicker(W, lidThick), wicker(W, lidThick)]), lid);
    slab.position.set(0, lidThick / 2, D / 2);
    braid(lid, W - wall, D - wall, lidThick, D / 2, 0.009);
    const under = add(new THREE.Mesh(new THREE.PlaneGeometry(W - 0.03, D - 0.03), lining(W, D)), lid);
    under.rotation.x = Math.PI / 2; under.position.set(0, -0.001, D / 2);
    const fitted = !empty || a.lid === 'shut';
    const plateRim = s.material(a.lining === 'blue' ? '#3b62a8' : a.lining === 'green' ? '#1f4a36' : '#cf3a36', { roughness: 0.3 });
    const china = s.material('#f6f3ea', { roughness: 0.25 });
    const steel = s.material('#cfd3d4', { metalness: 0.9, roughness: 0.25 });
    const plateR = Math.min(D * 0.36, W * 0.2);
    const plateX = -W / 2 + plateR + 0.035;
    if (fitted) {
      for (let i = 0; i < 2; i++) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(plateR, plateR * 0.7, 0.008, 28), china), lid).position.set(plateX + i * 0.012, -0.008 - i * 0.008, D / 2 + i * 0.006);
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(plateR * 0.93, 0.003, 5, 32), plateRim), lid); ring.rotation.x = Math.PI / 2; ring.position.set(plateX + i * 0.012, -0.0125 - i * 0.008, D / 2 + i * 0.006);
      }
    }
    for (const turn of [0.5, -0.5]) { const strap = add(new THREE.Mesh(new THREE.BoxGeometry(plateR * 2.3, 0.003, 0.014), leather), lid); strap.position.set(plateX + 0.006, fitted ? -0.024 : -0.004, D / 2); strap.rotation.y = turn; }
    // Cutlery loops.
    const loopsFrom = plateX + plateR + 0.045, loopsTo = W / 2 - 0.035;
    const pieces = Math.max(3, Math.floor((loopsTo - loopsFrom) / 0.034) + 1);
    for (let i = 0; i < pieces && fitted; i++) {
      const x = mix(loopsFrom, loopsTo, pieces === 1 ? 0 : i / (pieces - 1)), kind = i % 3;
      const piece = new THREE.Group();
      add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, D * 0.36), kind === 2 ? s.material('#f1ead4', { roughness: 0.4 }) : steel), piece).position.z = -D * 0.12;
      if (kind === 0) { for (let t = -1; t <= 1; t++) add(new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.002, 0.045), steel), piece).position.set(t * 0.0065, 0, D * 0.12 + 0.012); add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.002, 0.02), steel), piece).position.z = D * 0.08; }
      else if (kind === 1) { const bowl = add(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), steel), piece); bowl.scale.set(0.014, 0.003, 0.024); bowl.position.z = D * 0.11; }
      else add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.002, D * 0.3), steel), piece).position.z = D * 0.14;
      piece.position.set(x, -0.006, D / 2);
      lid.add(piece);
    }
    const loopStrap = add(new THREE.Mesh(new THREE.BoxGeometry(loopsTo - loopsFrom + 0.04, 0.003, 0.02), leather), lid);
    loopStrap.position.set((loopsFrom + loopsTo) / 2, -0.009, D * 0.42);
    for (let i = 0; i < pieces + 1; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 5), brass), lid).position.set(mix(loopsFrom - 0.017, loopsTo + 0.017, i / pieces), -0.011, D * 0.42);

    // Straps and buckles on the front.
    const strapXs = a.shape === 'small' ? [0] : [-W * 0.27, W * 0.27];
    const fastened = a.lid === 'shut';
    for (const x of strapXs) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, D * 0.5), leather), lid).position.set(x, lidThick + 0.002, D * 0.76);
      const tongue = add(new THREE.Mesh(new THREE.BoxGeometry(0.03, fastened ? Hb * 0.5 : Hb * 0.34, 0.004), leather), lid);
      tongue.position.set(x, fastened ? lidThick - Hb * 0.25 : lidThick - Hb * 0.17, D + 0.004);
      if (!fastened) tongue.rotation.x = (random() - 0.5) * 0.3;
      add(new THREE.Mesh(new THREE.BoxGeometry(0.034, Hb * 0.22, 0.004), leather), body).position.set(x, Hb * 0.42, D / 2 + 0.003);
      const buckle = add(new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 5, 4), brass), body);
      buckle.rotation.z = Math.PI / 4; buckle.position.set(x, Hb * 0.52, D / 2 + 0.007);
    }
    if (a.shape === 'suitcase') {
      add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.009, 6, 18, Math.PI), leather), body).position.set(0, Hb * 0.62, D / 2 + 0.006);
    } else if (a.shape === 'trunk') {
      const rope = s.material('#cdbb92', { roughness: 0.95 });
      for (const side of [-1, 1]) { const grip = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 18, Math.PI), rope), body); grip.rotation.set(Math.PI, Math.PI / 2, 0); grip.position.set(side * (W / 2 + 0.004), Hb * 0.72, 0); grip.rotation.z = side * 0.5; }
    } else {
      const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.007, 6, 18, Math.PI), border), lid); hoop.position.set(0, lidThick, D / 2); hoop.rotation.y = Math.PI / 2;
    }

    const theta = { shut: 0, ajar: 0.5 + random() * 0.15, open: 1.78 + random() * 0.14, off: 0 }[a.lid];
    if (a.lid === 'off') {
      lid.position.set((random() - 0.5) * 0.04, 0.004, D / 2 + (Hb > 0.25 ? 0.15 : 0.11));
      lid.rotation.x = -(Math.PI - 1.12);
      lid.rotation.z = (random() - 0.5) * 0.06;
    } else {
      lid.position.set(0, Hb + 0.004, -D / 2);
      lid.rotation.x = -theta;
      if (a.lid === 'open') for (const side of [-1, 1]) s.rod([side * (W / 2 - 0.02), Hb, -D / 2 + D * 0.55], [side * (W / 2 - 0.02), Hb + Math.sin(theta) * D * 0.55, -D / 2 + Math.cos(theta) * D * 0.55], 0.002, leather);
      if (a.lid === 'ajar') s.rod([W * 0.3, Hb, D / 2 - 0.02], [W * 0.3, Hb + Math.sin(theta) * D * 0.93, -D / 2 + Math.cos(theta) * D * 0.93], 0.004, border);
    }
    s.root.add(lid);

    // Contents.
    const inside = new THREE.Group();
    inside.position.y = bed;
    const apple = (x: number, y: number, z: number, parent: THREE.Object3D) => {
      const fruit = add(new THREE.Mesh(new THREE.SphereGeometry(0.031, 14, 10), s.material(random() < 0.65 ? '#c8242c' : '#9fb83a', { roughness: 0.3 })), parent);
      fruit.scale.y = 0.9; fruit.position.set(x, y + 0.028, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.0015, 0.014, 5), s.material('#4a3018')), parent).position.set(x, y + 0.06, z);
    };
    const bottle = (colour: string, parent: THREE.Object3D) => {
      const g = new THREE.Group();
      add(new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.036, 0], [0.038, 0.01], [0.038, 0.17], [0.03, 0.2], [0.014, 0.235], [0.013, 0.29], [0.016, 0.292], [0.016, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y)), 20), s.material(colour, { roughness: 0.15, metalness: 0.2 })), g);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.0385, 0.0385, 0.07, 20, 1, true), s.material('#f1ead4', { roughness: 0.7 })), g).position.y = 0.09;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0145, 0.045, 12), s.material('#7a1f2a', { metalness: 0.5, roughness: 0.35 })), g).position.y = 0.28;
      parent.add(g);
      return g;
    };
    if (a.packed === 'feast') {
      const loaf = new THREE.Group();
      const crumb = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.03, W * 0.72, 6, 14), s.material('#cf9440', { roughness: 0.8 })), loaf); crumb.scale.z = 0.82;
      for (let i = 0; i < 5; i++) { const slash = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), s.material('#f0d9a0', { roughness: 0.9 })), loaf); slash.scale.set(0.02, 0.006, 0.005); slash.position.set(0, (i - 2) * W * 0.14, 0.023); slash.rotation.z = 0.7; }
      loaf.rotation.set(0.1, 0, -1.0 - random() * 0.15);
      loaf.position.set(W * 0.06, Hb * 0.25 + 0.03, -inD * 0.18);
      inside.add(loaf);
      const wine = bottle('#1f3b24', inside);
      wine.position.set(-inW * 0.34, -bed + 0.02 + Math.max(0, Hb - 0.2), -inD * 0.22); wine.rotation.z = 0.12;
      const cheese = new THREE.Shape(); cheese.moveTo(0, 0); cheese.lineTo(0.1, 0.028); cheese.lineTo(0.1, -0.028); cheese.closePath();
      const wedge = add(new THREE.Mesh(new THREE.ExtrudeGeometry(cheese, { depth: 0.04, bevelEnabled: false }), s.material('#f0c54a', { roughness: 0.6 })), inside);
      wedge.rotation.x = -Math.PI / 2; wedge.position.set(-inW * 0.12, 0, inD * 0.28); wedge.rotation.z = 0.5;
      const grapes = Array.from({ length: 26 }, (_u, i) => ({ at: [inW * 0.27 + (random() - 0.5) * 0.07, 0.012 + random() * 0.03, inD * 0.2 + (random() - 0.5) * 0.06 - i * 0.0005] as [number, number, number], size: 0.011 + random() * 0.003, color: random() < 0.8 ? '#5a2a6a' : '#7a3a8a' }));
      const bunch = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.25 }), grapes);
      inside.add(bunch);
    } else if (a.packed === 'family') {
      const waxed = s.material('#f1ecd9', { roughness: 0.8 }), twine = s.material('#b3262c');
      for (let i = 0; i < 3; i++) {
        const parcel = new THREE.Group();
        add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.1), waxed), parcel);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.047, 0.004), twine), parcel); add(new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.047, 0.102), twine), parcel);
        parcel.position.set(-inW * 0.28 + (i % 2) * 0.02, 0.024 + i * 0.047, -inD * 0.15 + (i % 2) * 0.012); parcel.rotation.y = (random() - 0.5) * 0.4;
        if (i < 2 || a.shape !== 'small') inside.add(parcel);
      }
      for (let i = 0; i < 4; i++) apple(inW * 0.05 + (i % 2) * 0.066, i > 1 ? 0.03 : 0, inD * 0.2 - (i > 1 ? 0.03 : 0) - (i % 2) * 0.01, inside);
      const peel = s.material('#f0cf3a', { roughness: 0.5 });
      for (let i = 0; i < 3; i++) { const banana = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.015, 6, 14, 1.7), peel), inside); banana.rotation.set(-Math.PI / 2 + 0.25 * i, 0, 0.6); banana.position.set(inW * 0.26, 0.02 + i * 0.012, -inD * 0.1 - i * 0.02); }
      const enamel = s.material('#f1eee4', { roughness: 0.3 });
      for (let i = 0; i < 2; i++) { const mug = add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.033, 0.07, 18), enamel), inside); mug.position.set(inW * 0.3 - i * 0.02, 0.035 + i * 0.05, inD * 0.26); const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.003, 5, 20), s.material('#25407c')), inside); rim.rotation.x = Math.PI / 2; rim.position.set(inW * 0.3 - i * 0.02, 0.07 + i * 0.05, inD * 0.26); }
    } else if (a.packed === 'tea') {
      const pot = new THREE.Group();
      const glaze = s.material(mood.cheer > 0.5 ? '#e8c9d0' : '#7a5a3a', { roughness: 0.25 });
      const belly = add(new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 14), glaze), pot); belly.scale.y = 0.85; belly.position.y = 0.05;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), glaze), pot).position.y = 0.106;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.01, 18), glaze), pot).position.y = 0.097;
      const spout = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.07, 10), glaze), pot); spout.position.set(0.07, 0.065, 0); spout.rotation.z = -0.9;
      const grip = add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.007, 6, 14, Math.PI), glaze), pot); grip.rotation.z = Math.PI / 2; grip.position.set(-0.055, 0.055, 0);
      pot.position.set(-inW * 0.22, 0, -inD * 0.12); pot.rotation.y = 0.5;
      inside.add(pot);
      for (let i = 0; i < 2; i++) {
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.008, 18), china), inside).position.set(inW * 0.12 + i * 0.1, 0.004, inD * 0.2 - i * 0.02);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.022, 0.04, 18), china), inside).position.set(inW * 0.12 + i * 0.1, 0.028, inD * 0.2 - i * 0.02);
        const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.0025, 5, 20), plateRim), inside); band.rotation.x = Math.PI / 2; band.position.set(inW * 0.12 + i * 0.1, 0.048, inD * 0.2 - i * 0.02);
      }
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 24), s.material('#b3262c', { metalness: 0.5, roughness: 0.35 })), inside).position.set(inW * 0.22, 0.03, -inD * 0.18);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.012, 24), s.material('#e3c23a', { metalness: 0.5, roughness: 0.35 })), inside).position.set(inW * 0.22, 0.066, -inD * 0.18);
      const jar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.06, 14), s.material('#8a1626', { roughness: 0.15 })), inside); jar.position.set(-inW * 0.02, 0.03, inD * 0.26);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 14), lining(0.05, 0.05)), inside).position.set(-inW * 0.02, 0.066, inD * 0.26);
    } else if (a.packed === 'empty') {
      const napkin = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshStandardMaterial({ color: '#f4f0e4', roughness: 0.95, flatShading: true })), inside);
      napkin.scale.set(1.2, 0.35, 1); napkin.position.set(inW * 0.2, 0.016, inD * 0.1);
      s.scatter(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#e6c98a', roughness: 0.9 }), Array.from({ length: 30 }, () => ({ at: [(random() - 0.5) * inW * 0.8, bed + 0.003, (random() - 0.5) * inD * 0.8] as [number, number, number], size: 0.002 + random() * 0.004 })));
    } else {
      const fur = s.material(['#d98a3a', '#2a2826', '#9a9a98', '#efe6d6'][Math.floor(random() * 4)], { roughness: 0.95 });
      const cat = new THREE.Group();
      const torso = add(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), fur), cat); torso.scale.set(0.105, 0.055, 0.085); torso.position.y = 0.05;
      const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), fur), cat); head.position.set(0.075, 0.05, 0.055); head.scale.y = 0.85;
      for (const side of [-1, 1]) { const ear = add(new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.024, 4), fur), cat); ear.position.set(0.075 + side * 0.022, 0.088, 0.055 - side * 0.012); }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), s.material('#e58a94')), cat).position.set(0.098, 0.046, 0.088);
      const tail = add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 18, 2.2), fur), cat); tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.02, 0.01); tail.rotation.z = 0.3;
      cat.position.set(-inW * 0.05, 0, 0); cat.rotation.y = (random() - 0.5) * 0.8;
      cat.scale.setScalar(Math.min(1.25, inD / 0.24));
      inside.add(cat);
    }
    if (a.lid !== 'shut') s.root.add(inside);

    // Outside.
    const frontZ = D / 2 + (a.lid === 'off' ? 0.3 : 0.09);
    if (a.beside === 'cloth' && a.lid !== 'shut') {
      const drape = add(new THREE.Mesh(new THREE.PlaneGeometry(W * 0.42, Hb * 0.7, 6, 5), lining(W * 0.42, Hb * 0.7)));
      const pos = drape.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 40) * 0.008 + (0.5 - pos.getY(i) / (Hb * 0.7)) * 0.012);
      drape.geometry.computeVertexNormals();
      drape.position.set(W * 0.22, Hb * 0.66, D / 2 + 0.014);
      const over = add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.42, 0.006, 0.07), lining(W * 0.42, 0.07))); over.position.set(W * 0.22, Hb + 0.012, D / 2 - 0.02);
    } else if (a.beside === 'apples') {
      for (let i = 0; i < 3 + Math.floor(mood.density * 3); i++) apple(-W * 0.4 + i * 0.09 + random() * 0.03, 0, frontZ + random() * 0.09, s.root);
    } else if (a.beside === 'blanket') {
      const plaid = canvasTexture(128, (ctx) => {
        ctx.fillStyle = '#b5202b'; ctx.fillRect(0, 0, 128, 128); ctx.globalAlpha = 0.55;
        for (const [at, wide, colour] of [[14, 22, '#16314f'], [50, 5, '#f1c62b'], [68, 22, '#17472f'], [104, 5, '#f4efe2']] as const) { ctx.fillStyle = colour; ctx.fillRect(at, 0, wide, 128); ctx.fillRect(0, at, 128, wide); }
      });
      plaid.repeat.set(3, 2);
      const roll = new THREE.Group();
      const length = Math.min(W * 0.8, 0.36);
      const tube = add(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, length, 20), new THREE.MeshStandardMaterial({ map: plaid, roughness: 0.95 })), roll); tube.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) { const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.018, 20), leather), roll); band.rotation.z = Math.PI / 2; band.position.x = side * length * 0.3; }
      if (a.lid === 'shut') roll.position.set(0, Hb + lidThick + 0.06, 0);
      else { roll.position.set(-W / 2 - 0.08, 0.055, 0.03); roll.rotation.y = Math.PI / 2 + 0.2; }
      s.root.add(roll);
    } else if (a.beside === 'glasses') {
      const wine = bottle('#1f3b24', s.root);
      wine.position.set(W / 2 + 0.07, 0, 0.02);
      const clear = new THREE.MeshPhysicalMaterial({ color: '#e4f3f4', transparent: true, opacity: 0.3, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
      const stemGlass = s.material('#cfe0e2', { roughness: 0.1 });
      for (let i = 0; i < 2; i++) {
        const x = W / 2 + 0.05 + i * 0.085, z = 0.12 + i * 0.03;
        s.cylinder(0.026, 0.028, 0.004, [x, 0.002, z], stemGlass, 16);
        s.cylinder(0.003, 0.003, 0.06, [x, 0.034, z], stemGlass, 8);
        add(new THREE.Mesh(new THREE.LatheGeometry([[0.003, 0.064], [0.03, 0.09], [0.034, 0.12], [0.03, 0.15]].map(([px, py]) => new THREE.Vector2(px, py)), 18), clear)).position.set(x, 0, z);
        s.mesh(new THREE.LatheGeometry([[0, 0.066], [0.004, 0.066], [0.029, 0.09], [0.032, 0.11], [0, 0.11]].map(([px, py]) => new THREE.Vector2(px, py)), 18), s.material('#7d1730', { roughness: 0.1 }), [x, 0, z]);
      }
    }
    return s.finish();
  },
});
