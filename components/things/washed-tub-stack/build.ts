import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
type Kind = 'tub' | 'pot' | 'jar' | 'icecream';

export default defineThing({
  questions: {
    height: score('How high are the towers?', ['A few nested on a windowsill', 'A foot high', 'Knee high and swaying', 'Waist high columns of plastic']),
    tidiness: score('How tidy is it?', ['An avalanche: towers fallen, lids everywhere', 'Leaning and mixed up', 'Mostly sorted', 'Sorted by size and colour like a shop shelf']),
    mostly: choice('What is there most of?', {
      margarine: 'Margarine and spread tubs, oval, yellow and white with gold lids.',
      yoghurt: 'Yoghurt pots, small tapered white pots nested in tall spines.',
      jars: 'Glass jam jars and coffee jars with odd lids.',
      icecream: 'Rectangular ice-cream tubs, big and pastel.',
      mixed: 'A bit of everything, all rinsed.',
    }),
    labels: choice('What has happened to the labels?', {
      soaked: 'Soaked off: everything scrubbed plain and anonymous.',
      bright: 'Still on: a wall of faded brand colours.',
      handwritten: 'Replaced with strips of masking tape and handwriting.',
    }),
    lids: choice('Where are the lids?', {
      separate: 'Kept in their own neat stack beside the tubs.',
      on: 'Snapped back on, so the tubs stack rather than nest.',
      lost: 'Long gone; nothing here has a lid.',
    }),
    bags: choice('What about the carrier bags?', {
      none: 'There are none here.',
      triangles: 'Each one folded into a tight little triangle and stacked.',
      stuffed: 'A carrier bag stuffed fat with other carrier bags.',
      flat: 'Smoothed flat and piled like linen.',
    }),
    contents: choice('Is anything actually kept in them?', {
      empty: 'No, every one is empty, waiting for a use.',
      buttons: 'One is full of buttons and another of rubber bands.',
      seedlings: 'A row of yoghurt pots has seedlings coming up in them.',
      screws: 'Jars and tubs of screws, nails and saved string.',
    }),
    stand: choice('What does it all stand on?', {
      floor: 'Straight on the floor.',
      tray: 'A flowered tin tea tray.',
      crate: 'An upturned plastic milk crate.',
      rack: 'A wire draining rack, as if still drying.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const pile = new THREE.Group();
    s.root.add(pile);
    const into = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = pile) => { node.removeFromParent(); parent.add(node); return node; };
    const fade = (tint: string) => new THREE.Color(tint).lerp(new THREE.Color('#d8d2c2'), 0.15 + mood.wear * 0.35);

    // A band of label wrapped round a vessel.
    const wrap = (tint: string, accent: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 32;
      const g = canvas.getContext('2d')!;
      if (a.labels === 'handwritten') {
        g.fillStyle = '#e9dfb9'; g.fillRect(0, 0, 128, 32);
        g.strokeStyle = '#2a3a7a'; g.lineWidth = 2;
        for (let x = 6; x < 60; x += 9) { g.beginPath(); g.moveTo(x, 20 + r(-5, 5)); g.lineTo(x + 5, 10 + r(-4, 4)); g.lineTo(x + 8, 22 + r(-4, 4)); g.stroke(); }
      } else {
        g.fillStyle = `#${fade(tint).getHexString()}`; g.fillRect(0, 0, 128, 32);
        g.fillStyle = `#${fade(accent).getHexString()}`; g.beginPath(); g.ellipse(32, 16, 22, 11, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(96, 16, 22, 11, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(18, 13, 28, 5); g.fillRect(82, 13, 28, 5);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.7 });
    };
    const BRAND: [string, string][] = [['#f2d23a', '#2f7a3d'], ['#f4f1e6', '#2d6fb7'], ['#e8762c', '#f4f1e6'], ['#7fc4e8', '#c8273a'], ['#f0b6c4', '#7a2d4f'], ['#f6e9a8', '#c8862a']];
    const band = (radius: number, height: number, at: P, squash: number, parent: THREE.Object3D) => {
      if (a.labels === 'soaked') return;
      const [tint, accent] = pick(BRAND);
      const turn = a.labels === 'handwritten';
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.96, height, 20, 1, true, turn ? r(0, 6) : 0, turn ? 1.5 : Math.PI * 2), wrap(tint, accent));
      mesh.position.set(...at);
      mesh.scale.z = squash;
      parent.add(mesh);
    };

    const PLASTICS = ['#f4f1e6', '#f2d23a', '#f6e9a8', '#eedfb8', '#f4f1e6', '#fbf7ea'];
    const PASTELS = ['#f0b6c4', '#a9d6c4', '#f6e9a8', '#bcd4ee', '#f4f1e6'];
    const glass = new THREE.MeshStandardMaterial({ color: '#cfe3df', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.55 });
    const LIDS = ['#d9b23a', '#c8273a', '#2f7a3d', '#f4f1e6', '#2d6fb7', '#17181a'];

    interface Spec { kind: Kind; rTop: number; rBottom: number; h: number; squash: number; step: number; box?: boolean }
    const specs: Record<Kind, () => Spec> = {
      tub: () => ({ kind: 'tub', rTop: 0.075, rBottom: 0.06, h: 0.07, squash: 0.72, step: 0.014 }),
      pot: () => ({ kind: 'pot', rTop: 0.036, rBottom: 0.025, h: 0.08, squash: 1, step: 0.017 }),
      jar: () => ({ kind: 'jar', rTop: 0.038, rBottom: 0.038, h: r(0.09, 0.14), squash: 1, step: 0 }),
      icecream: () => ({ kind: 'icecream', rTop: 0.1, rBottom: 0.088, h: 0.085, squash: 0.68, step: 0.016, box: true }),
    };
    const vessel = (spec: Spec, tint: THREE.Color | string, parent: THREE.Object3D, y: number, onlyRim: boolean) => {
      const material = spec.kind === 'jar' ? glass : s.material(tint, { roughness: 0.45, side: THREE.DoubleSide });
      const sides = spec.box ? 4 : 22;
      const height = onlyRim ? spec.step : spec.h;
      const lower = onlyRim ? mix(spec.rTop, spec.rBottom, spec.step / spec.h) : spec.rBottom;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(spec.rTop, lower, height, sides, 1, spec.kind !== 'jar' && !onlyRim ? false : spec.kind !== 'jar'), material);
      if (spec.box) body.rotation.y = Math.PI / 4;
      body.position.y = y + (onlyRim ? spec.h - spec.step / 2 : spec.h / 2);
      body.scale.z = spec.squash;
      if (spec.box) body.scale.set(1.25, 1, 1.25 * spec.squash), body.rotation.y = Math.PI / 4;
      body.castShadow = body.receiveShadow = true;
      const group = new THREE.Group();
      group.add(body);
      // A rolled rim catches the light on every nested pot.
      if (spec.kind !== 'jar' && !spec.box && !onlyRim) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(spec.rTop, 0.0035, 5, 22), material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = y + spec.h;
        rim.scale.y = spec.squash;
        rim.castShadow = true;
        group.add(rim);
      }
      parent.add(group);
      return group;
    };
    const lid = (spec: Spec, at: P, parent: THREE.Object3D, tilt = 0) => {
      const tint = spec.kind === 'tub' ? '#d9b23a' : pick(LIDS);
      const material = s.material(tint, { roughness: 0.4, metalness: spec.kind === 'jar' ? 0.5 : 0 });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(spec.rTop * 1.04, spec.rTop * 1.04, spec.kind === 'jar' ? 0.014 : 0.008, spec.box ? 4 : 22), material);
      mesh.position.set(...at);
      mesh.scale.z = spec.squash;
      if (spec.box) { mesh.rotation.y = Math.PI / 4; mesh.scale.set(1.25, 1, 1.25 * spec.squash); }
      mesh.rotation.z = tilt;
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    const order: Kind[] = a.mostly === 'margarine' ? ['tub', 'tub', 'tub', 'pot', 'tub', 'jar', 'tub', 'icecream']
      : a.mostly === 'yoghurt' ? ['pot', 'pot', 'pot', 'tub', 'pot', 'pot', 'jar', 'pot']
      : a.mostly === 'jars' ? ['jar', 'jar', 'jar', 'tub', 'jar', 'jar', 'pot', 'jar']
      : a.mostly === 'icecream' ? ['icecream', 'icecream', 'tub', 'icecream', 'pot', 'icecream', 'jar', 'tub']
      : ['tub', 'pot', 'jar', 'icecream', 'pot', 'tub', 'jar', 'pot'];
    const towers = Math.round(mix(4, 8, mood.density * 0.5 + a.height * 0.5));
    const tall = mix(0.24, 0.95, a.height);
    const mess = 1 - a.tidiness;
    const kinds = order.slice(0, towers);
    if (a.tidiness > 0.7) kinds.sort();
    const spilled: Spec[] = [];
    let cursor = 0, maxDepth = 0.12;
    const columns: { x: number; z: number; spec: Spec; top: number }[] = [];
    const widths = kinds.map((kind) => { const spec = specs[kind](); return { spec, width: spec.rTop * (spec.box ? 2.5 * 0.71 : 2) + 0.022 }; });
    const rowWidth = widths.reduce((sum, w) => sum + w.width, 0);
    const perRow = towers > 5 ? Math.ceil(towers / 2) : towers;

    widths.forEach(({ spec, width }, index) => {
      const row = Math.floor(index / perRow);
      if (index === perRow) cursor = 0;
      const x = cursor + width / 2 - (towers > 5 ? rowWidth / 4 : rowWidth / 2) + r(-0.02, 0.02) * mess * 2;
      const z = (towers > 5 ? (row ? 0.11 : -0.11) : 0) + r(-0.04, 0.04) * mess;
      cursor += width;
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      pile.add(group);
      const shade = spec.kind === 'icecream' ? PASTELS : PLASTICS;
      const uniform = a.tidiness > 0.75 ? fade(pick(shade)) : null;
      const lidded = a.lids === 'on' || spec.kind === 'jar';
      const each = lidded ? spec.h + (spec.kind === 'jar' ? 0.014 : 0.008) : spec.step;
      const goal = tall * r(0.6, 1.05) * (spec.kind === 'jar' ? 0.6 : 1) * (lidded && spec.kind !== 'jar' ? 0.8 : 1);
      let count = Math.max(1, Math.round((goal - (lidded ? 0 : spec.h)) / each) + (lidded ? 0 : 1));
      count = Math.min(count, lidded ? 7 : 30);
      const falls = mess > 0.62 && random() < mess * 0.6 && count > 2;
      const kept = falls ? Math.max(1, Math.floor(count * 0.35)) : count;
      for (let i = kept; i < count && spilled.length < 12; i += lidded ? 1 : 3) spilled.push(spec);
      const lean = mess * mess * r(-0.008, 0.008);
      let y = 0, dx = 0;
      for (let i = 0; i < kept; i++) {
        const item = vessel(spec, uniform ?? fade(pick(shade)), group, 0, !lidded && i > 0);
        item.position.set(dx + r(-0.004, 0.004) * mess * 2, y, r(-0.004, 0.004) * mess * 2);
        item.rotation.y = r(-0.5, 0.5) * (spec.squash < 1 ? mess * 0.5 : 1);
        if ((i === 0 || lidded) && spec.kind !== 'pot') band(spec.rTop * (spec.box ? 0.9 : 0.99) + 0.001, spec.h * 0.5, [0, spec.h * 0.48, 0], spec.box ? spec.squash : spec.squash, item);
        if (spec.box) item.children[item.children.length - 1].visible = a.labels === 'soaked' ? item.children[item.children.length - 1].visible : i === 0 || lidded;
        if (lidded) lid(spec, [dx, y + spec.h + 0.005, 0], group);
        if (spec.kind === 'jar' && a.contents === 'screws' && i === kept - 1) into(s.cylinder(0.034, 0.034, spec.h * 0.55, [dx, y + spec.h * 0.3, 0], s.material('#7d8286', { metalness: 0.7, roughness: 0.5, flatShading: true }), 9), group);
        y += each;
        dx += lean;
      }
      const top = lidded ? y : y - each + spec.h;
      group.rotation.z = mess * mess * r(-0.09, 0.09);
      columns.push({ x, z, spec, top });
      maxDepth = Math.max(maxDepth, Math.abs(z) + spec.rTop);
    });

    const left = Math.min(...columns.map((c) => c.x)) - 0.14, right = Math.max(...columns.map((c) => c.x)) + 0.14;
    // Lids, when they have a stack of their own.
    if (a.lids === 'separate') {
      const spec = specs[kinds[0] === 'jar' || kinds[0] === 'pot' ? 'tub' : kinds[0]]();
      const count = Math.round(mix(5, 26, a.height));
      for (let i = 0; i < count; i++) lid(spec, [right + 0.03 + r(-0.01, 0.01) * mess * 3, 0.004 + i * 0.0085, 0.02 + r(-0.01, 0.01) * mess * 3], pile, mess * r(-0.1, 0.1)).rotation.y += r(-0.3, 0.3);
      for (let i = 0; i < mess * 8; i++) lid(spec, [r(left, right), 0.004, maxDepth + r(0.08, 0.3)], pile).rotation.y = r(0, 3);
    }

    // Carrier bags.
    const bagTints = ['#f4f1e6', '#e8762c', '#2d6fb7', '#3c9a52', '#f2d23a', '#c8273a'];
    if (a.bags === 'triangles') {
      const shape = new THREE.Shape([new THREE.Vector2(-0.05, 0), new THREE.Vector2(0.05, 0), new THREE.Vector2(0, 0.085)]);
      const count = Math.round(mix(5, 22, a.height));
      for (let i = 0; i < count; i++) {
        const fold = into(s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), s.material(fade(pick(bagTints)), { roughness: 0.35 }), [left - 0.02 + r(-0.012, 0.012) * (1 + mess * 3), 0.001 + i * 0.0125, 0.06 + r(-0.012, 0.012) * (1 + mess * 3)]));
        fold.rotation.set(-Math.PI / 2, 0, r(-0.25, 0.25) + (i % 2 ? Math.PI : 0) * (mess > 0.5 ? 1 : 0));
      }
    } else if (a.bags === 'flat') {
      const count = Math.round(mix(5, 24, a.height));
      for (let i = 0; i < count; i++) into(s.box([0.2, 0.006, 0.26], [left - 0.07 + r(-0.012, 0.012) * (1 + mess * 3), 0.003 + i * 0.0062, r(-0.012, 0.012) * (1 + mess * 3)], s.material(fade(pick(bagTints)), { roughness: 0.35 }))).rotation.y = r(-0.1, 0.1) * (1 + mess * 3);
    } else if (a.bags === 'stuffed') {
      const size = mix(0.1, 0.16, a.height);
      const sack = s.material(fade(pick(bagTints)), { roughness: 0.4 });
      const bag = into(s.mesh(new THREE.LatheGeometry([[0.02, 0], [0.8, 0.06], [1, 0.5], [0.9, 1.0], [0.6, 1.4], [0.3, 1.62]].map(([x, y]) => new THREE.Vector2(x * size, y * size)), 11), sack, [left - 0.1, 0, 0.03]));
      bag.scale.z = 0.8;
      for (let i = 0; i < 5; i++) into(s.ball([size * 0.3, size * 0.25, size * 0.3], [left - 0.1 + r(-0.07, 0.07), size * 1.62 + r(-0.02, 0.03), 0.03 + r(-0.06, 0.06)], s.material(fade(pick(bagTints)), { roughness: 0.4, flatShading: true }), 6));
      for (const side of [-1, 1]) into(s.ring(size * 0.4, 0.006, [left - 0.1 + side * size * 0.45, size * 1.45, 0.03], sack, Math.PI)).rotation.z = side * -0.7;
    }

    // Things actually kept: placed in a short front row.
    const frontZ = maxDepth + 0.1;
    if (a.contents === 'buttons') {
      const tub = specs.tub();
      const group = new THREE.Group();
      vessel(tub, fade('#f4f1e6'), group, 0, false);
      group.position.set(-0.1, 0, frontZ);
      pile.add(group);
      const dots = Array.from({ length: 60 }, () => ({ at: [-0.1 + r(-0.055, 0.055), tub.h * 0.8 + r(0, 0.012), frontZ + r(-0.035, 0.035)] as P, size: r(0.006, 0.011), color: pick(['#c8273a', '#2d6fb7', '#f4f1e6', '#17181a', '#d9b23a', '#3c9a52', '#b05fc0']) }));
      const button = new THREE.CylinderGeometry(1, 1, 0.35, 8);
      into(s.scatter(button, new THREE.MeshStandardMaterial({ roughness: 0.4 }), dots));
      const pot = specs.pot();
      const second = new THREE.Group();
      vessel(pot, fade('#fbf7ea'), second, 0, false);
      second.position.set(0.06, 0, frontZ);
      pile.add(second);
      for (let i = 0; i < 6; i++) into(s.ring(r(0.016, 0.026), 0.0018, [0.06 + r(-0.008, 0.008), pot.h + 0.002 + i * 0.002, frontZ + r(-0.008, 0.008)], s.material(pick(['#c9a26a', '#c8273a', '#3c9a52'])))).rotation.x = Math.PI / 2 + r(-0.3, 0.3);
    } else if (a.contents === 'seedlings') {
      const pot = specs.pot();
      const sprout = s.material('#6fbf45', { roughness: 0.6 });
      for (let i = 0; i < 5; i++) {
        const group = new THREE.Group();
        vessel(pot, fade('#fbf7ea'), group, 0, false);
        const x = -0.18 + i * 0.09;
        group.position.set(x, 0, frontZ);
        pile.add(group);
        into(s.cylinder(pot.rTop * 0.92, pot.rTop * 0.9, 0.006, [x, pot.h - 0.012, frontZ], s.material('#3a2a1c', { roughness: 1 }), 12));
        const lift = r(0.03, 0.075);
        into(s.rod([x, pot.h - 0.01, frontZ], [x + r(-0.006, 0.006), pot.h + lift, frontZ], 0.002, sprout));
        for (const side of [-1, 1]) into(s.ball([0.013, 0.003, 0.008], [x + side * 0.012, pot.h + lift, frontZ], sprout, 8)).rotation.z = side * 0.4;
      }
    } else if (a.contents === 'screws') {
      const tub = specs.tub();
      const group = new THREE.Group();
      vessel(tub, fade('#f2d23a'), group, 0, false);
      group.position.set(-0.05, 0, frontZ);
      pile.add(group);
      const steel = s.material('#8a8f94', { metalness: 0.8, roughness: 0.4 });
      for (let i = 0; i < 16; i++) into(s.rod([-0.05 + r(-0.05, 0.05), tub.h * 0.75, frontZ + r(-0.03, 0.03)], [-0.05 + r(-0.05, 0.05), tub.h * 0.75 + r(0, 0.02), frontZ + r(-0.03, 0.03)], 0.002, steel, 0.0008));
      const twine = into(s.ball([0.04, 0.04, 0.04], [0.11, 0.04, frontZ + 0.01], s.material('#b89a5c', { roughness: 1, flatShading: true }), 8));
      twine.rotation.set(r(0, 3), r(0, 3), 0);
    }

    // What it stands on.
    const bounds = new THREE.Box3().setFromObject(pile, true);
    const size = bounds.getSize(new THREE.Vector3()), centre = bounds.getCenter(new THREE.Vector3());
    if (a.stand === 'tray') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#23483a'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 22; i++) { const x = random() * 128, y = random() * 128; g.fillStyle = ['#d98a9a', '#f1e3c0', '#e3b56a'][i % 3]; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 7, y + Math.sin(p * 1.26) * 7, 5, 0, 7); g.fill(); } }
      g.strokeStyle = '#d9b23a'; g.lineWidth = 6; g.strokeRect(3, 3, 122, 122);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const w = size.x + 0.08, d = size.z + 0.08;
      s.box([w, 0.012, d], [centre.x, 0.006, centre.z], new THREE.MeshStandardMaterial({ map, metalness: 0.4, roughness: 0.4 }));
      const edge = s.material('#d9b23a', { metalness: 0.7, roughness: 0.3 });
      for (const side of [-1, 1]) { s.box([w, 0.022, 0.008], [centre.x, 0.017, centre.z + side * d / 2], edge); s.box([0.008, 0.022, d], [centre.x + side * w / 2, 0.017, centre.z], edge); }
      pile.position.y = 0.012;
    } else if (a.stand === 'crate') {
      const crate = s.material(mood.cheer > 0.5 ? '#c8273a' : '#2d6fb7', { roughness: 0.5 });
      const w = Math.max(0.34, size.x + 0.04), d = Math.max(0.34, size.z + 0.04), h = 0.27;
      s.box([w, 0.02, d], [centre.x, h - 0.01, centre.z], crate);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.03, h, 0.03], [centre.x + sx * (w / 2 - 0.015), h / 2, centre.z + sz * (d / 2 - 0.015)], crate);
      for (const y of [0.02, 0.1, 0.18]) for (const side of [-1, 1]) { s.box([w, 0.035, 0.012], [centre.x, y + 0.0175, centre.z + side * (d / 2 - 0.006)], crate); s.box([0.012, 0.035, d], [centre.x + side * (w / 2 - 0.006), y + 0.0175, centre.z], crate); }
      pile.position.y = h;
    } else if (a.stand === 'rack') {
      const wire = s.material('#e9ecee', { roughness: 0.3, metalness: 0.3 });
      const w = size.x + 0.06, d = size.z + 0.06;
      const bars = Math.round(w / 0.035);
      for (let i = 0; i <= bars; i++) s.rod([centre.x - w / 2 + (i * w) / bars, 0.03, centre.z - d / 2], [centre.x - w / 2 + (i * w) / bars, 0.03, centre.z + d / 2], 0.003, wire);
      for (const side of [-1, 1]) { s.rod([centre.x - w / 2, 0.03, centre.z + side * d / 2], [centre.x + w / 2, 0.03, centre.z + side * d / 2], 0.005, wire); s.rod([centre.x - w / 2, 0.075, centre.z + side * d / 2], [centre.x + w / 2, 0.075, centre.z + side * d / 2], 0.004, wire); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.rod([centre.x + sx * w / 2, 0, centre.z + sz * d / 2], [centre.x + sx * w / 2, 0.075, centre.z + sz * d / 2], 0.005, wire);
      s.box([w + 0.06, 0.008, d + 0.06], [centre.x, 0.004, centre.z], s.material('#d8d2c2', { roughness: 0.5 }));
      pile.position.y = 0.034;
    }

    // What fell lies on its side on the floor around whatever it all stands on.
    spilled.forEach((spec, index) => {
      const group = new THREE.Group();
      vessel(spec, fade(pick(spec.kind === 'icecream' ? PASTELS : PLASTICS)), group, 0, false);
      const angle = r(0.2, 2.95), lying = random() < 0.6;
      const rx = size.x / 2 + 0.1 + r(0, 0.16) + index * 0.006, rz = size.z / 2 + 0.1 + r(0, 0.16);
      group.position.set(centre.x + Math.cos(angle) * rx, lying ? spec.rTop * spec.squash : 0, centre.z + Math.sin(angle) * rz);
      group.rotation.set(lying ? Math.PI / 2 : 0, r(0, 6), lying ? r(0, 6) : 0);
      s.root.add(group);
    });

    return s.finish();
  },
});
