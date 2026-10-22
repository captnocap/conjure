import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    load: choice('What is it carrying?', {
      cartons: 'A stack of taped cardboard boxes, moving day.',
      kegs: 'Two steel beer kegs, one on top of the other, a brewery delivery.',
      produce: 'Market crates of fruit and vegetables.',
      sacks: 'Slumped sacks of potatoes or coal.',
      cabinet: 'One tall grey filing cabinet, an office being cleared.',
      palm: 'A big potted palm, absurdly leafy.',
      bottles: 'A pair of tall gas bottles, red and black, for a welder or a pub cellar.',
      nothing: 'Nothing: the bare barrow.',
    }),
    frame: choice('What kind of barrow is it?', {
      red: 'Red tubular steel with a single looped handle.',
      blue: 'Blue steel with two curved horn grips.',
      alloy: 'Bare aluminium, light and modern, a courier truck.',
      wooden: 'An old wooden porter\'s truck with iron-rimmed wheels.',
    }),
    pose: choice('How is it standing?', {
      upright: 'Parked upright on its toe plate.',
      tilted: 'Tipped back on its wheels, mid-journey.',
      lying: 'Laid down flat on its back on the ground.',
    }),
    strap: choice('How is the load held on?', {
      none: 'It is not: balance and hope.',
      ratchet: 'A bright orange ratchet strap pulled tight.',
      bungee: 'Two crossed green bungee cords.',
      rope: 'Several turns of old rope with a knot.',
    }),
    stack: score('How carefully is it loaded?', ['Squared up and neat', 'A bit crooked', 'Teetering, about to go']),
    story: choice('What else is going on?', {
      ready: 'Nothing: it is just ready to go.',
      flat: 'One tyre is flat and the whole thing lists to one side.',
      note: 'A delivery note on a clipboard is tucked onto it.',
      fallen: 'Something has already slid off and lies on the ground in front.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const g = new THREE.Group();
    const add = <T extends THREE.Object3D>(build: () => T): T => {
      const mesh = build();
      g.add(mesh);
      return mesh;
    };
    const wooden = a.frame === 'wooden';
    const paint = s.material({ red: '#c5302b', blue: '#2a62ad', alloy: '#c3c9cb', wooden: '#8a6238' }[a.frame], { metalness: a.frame === 'alloy' ? 0.8 : 0.2, roughness: a.frame === 'alloy' ? 0.35 : wooden ? 0.85 : 0.5 });
    const dark = s.material('#1e2023', { roughness: 0.75 });
    const steel = s.material('#868c8f', { metalness: 0.8, roughness: 0.4 });
    const iron = s.material('#3a3b3c', { metalness: 0.6, roughness: 0.6 });

    // Frame.
    const railX = 0.2, topY = 1.18;
    for (const x of [-railX, railX]) {
      if (wooden) add(() => s.box([0.05, topY - 0.02, 0.04], [x, topY / 2 + 0.02, 0], paint));
      else add(() => s.rod([x, 0.03, 0], [x, topY, 0], 0.016, paint));
      add(() => s.rod([x, 0.5, -0.005], [x * 1.25, 0.14, -0.12], wooden ? 0.014 : 0.013, wooden ? iron : paint));
      add(() => s.rod([x, 0.06, 0], [x * 1.25, 0.14, -0.12], 0.013, wooden ? iron : paint));
    }
    for (const y of wooden ? [0.25, 0.55, 0.85, 1.1] : [0.3, 0.62, 0.94]) {
      if (wooden) add(() => s.box([railX * 2, 0.07, 0.025], [0, y, 0.005], paint));
      else add(() => s.tube([[-railX, y, 0], [0, y, -0.04], [railX, y, 0]], 0.012, paint));
    }
    if (a.frame === 'alloy') add(() => s.box([railX * 2, 0.5, 0.004], [0, 0.56, -0.012], paint));
    // Toe plate.
    add(() => s.box([0.46, wooden ? 0.012 : 0.008, 0.25], [0, 0.022, 0.125], wooden ? iron : a.frame === 'alloy' ? paint : steel));
    add(() => s.box([0.46, 0.06, 0.008], [0, 0.05, 0.004], wooden ? iron : paint));
    // Handles.
    if (a.frame === 'red' || a.frame === 'alloy') {
      add(() => s.tube([[-railX, topY - 0.02, 0], [-railX, topY + 0.1, -0.03], [-railX * 0.7, topY + 0.2, -0.13], [0, topY + 0.24, -0.17], [railX * 0.7, topY + 0.2, -0.13], [railX, topY + 0.1, -0.03], [railX, topY - 0.02, 0]], 0.016, paint));
      add(() => s.tube([[-0.1, topY + 0.235, -0.165], [0, topY + 0.242, -0.172], [0.1, topY + 0.235, -0.165]], 0.021, dark));
    } else {
      for (const x of [-railX, railX]) {
        add(() => s.tube([[x, topY - 0.02, 0], [x, topY + 0.1, -0.03], [x * 1.05, topY + 0.16, -0.14], [x * 1.1, topY + 0.14, -0.26]], wooden ? 0.02 : 0.016, paint));
        if (!wooden) add(() => s.rod([x * 1.06, topY + 0.158, -0.16], [x * 1.1, topY + 0.14, -0.27], 0.021, dark));
      }
      add(() => s.rod([-railX, topY, 0], [railX, topY, 0], wooden ? 0.018 : 0.014, wooden ? iron : paint));
    }
    // Axle and wheels.
    const wr = wooden ? 0.11 : 0.13;
    add(() => s.rod([-0.3, 0.14, -0.12], [0.3, 0.14, -0.12], 0.012, steel));
    const flatSide = random() < 0.5 ? -1 : 1;
    for (const x of [-1, 1]) {
      const flat = a.story === 'flat' && x === flatSide;
      const tyre = add(() => s.cylinder(wr, wr, wooden ? 0.04 : 0.075, [x * 0.285, 0.14, -0.12], wooden ? iron : dark, 22));
      tyre.rotation.z = Math.PI / 2;
      if (flat) { tyre.scale.z = 1.12; tyre.scale.x = 0.78; tyre.position.y = 0.112; }
      if (wooden) for (let i = 0; i < 4; i++) add(() => s.box([0.045, 0.02, wr * 1.9], [x * 0.285, 0.14, -0.12], paint)).rotation.x = i * Math.PI / 4;
      else add(() => s.cylinder(wr * 0.55, wr * 0.55, 0.08, [x * 0.285, 0.14, -0.12], a.frame === 'alloy' ? s.material('#2a62ad') : s.material('#e8e4d8'), 16)).rotation.z = Math.PI / 2;
    }

    // Load, built against the rails on the toe plate.
    const sway = a.stack;
    const jx = () => (random() - 0.5) * (0.02 + sway * 0.12);
    const jr = () => (random() - 0.5) * (0.04 + sway * 0.5);
    const y0 = 0.03;
    let loadH = 0, loadW = 0.44, loadD = 0.32;
    let topper: THREE.Object3D | null = null;
    const tones = ['#b98a55', '#c79a63', '#ad8250', '#bf9460'];
    if (a.load === 'cartons') {
      const count = 3 + Math.round(mood.density * 2);
      const tape = s.material('#dccba2', { roughness: 0.5 });
      let y = y0;
      for (let i = 0; i < count; i++) {
        const w = 0.5 - i * 0.03 - random() * 0.06, h = 0.2 + random() * 0.16, d = 0.36 - random() * 0.06;
        const box = new THREE.Group();
        const body = s.box([w, h, d], [0, 0, 0], s.material(tones[Math.floor(random() * 4)], { roughness: 0.9 }));
        const strip = s.box([w + 0.002, h + 0.002, 0.05], [0, 0, 0], tape);
        box.add(body, strip);
        if (i === 0 && random() < 0.6) {
          const mark = s.label(['KITCHEN', 'BOOKS', 'MISC', 'FRAGILE', 'BEDROOM 2'][Math.floor(random() * 5)], w * 0.7, 0.07, [0, h * 0.2, d / 2 + 0.002], '#22252a', '#c79a63');
          box.add(mark);
        }
        box.position.set(i ? jx() : 0, y + h / 2, 0.02 + d / 2 + (i ? Math.abs(jx()) : 0));
        box.rotation.y = i ? jr() : 0;
        g.add(box);
        y += h;
        topper = box;
      }
      loadH = y - y0; loadW = 0.5; loadD = 0.38;
    } else if (a.load === 'kegs') {
      const metal = s.material('#b9bfc2', { metalness: 0.85, roughness: 0.3 });
      for (let i = 0; i < 2; i++) {
        const keg = new THREE.Group();
        keg.add(s.cylinder(0.195, 0.195, 0.5, [0, 0.29, 0], metal, 26));
        for (const y of [0.025, 0.555]) keg.add(s.cylinder(0.2, 0.2, 0.05, [0, y, 0], metal, 26));
        for (const y of [0.2, 0.38]) { const rib = s.ring(0.197, 0.012, [0, y, 0], metal); rib.rotation.x = Math.PI / 2; keg.add(rib); }
        keg.add(s.cylinder(0.17, 0.17, 0.01, [0, 0.575, 0], dark, 20));
        keg.add(s.cylinder(0.03, 0.03, 0.03, [0, 0.58, 0], metal, 10));
        const band = s.material(['#c5302b', '#2a62ad', '#2e6a48', '#e9b21a'][Math.floor(random() * 4)], { roughness: 0.5 });
        keg.add(s.cylinder(0.198, 0.198, 0.07, [0, 0.29, 0], band, 26));
        keg.position.set(i ? jx() : 0, y0 + i * 0.585, 0.225 + (i ? Math.abs(jx()) : 0));
        g.add(keg);
        topper = keg;
      }
      loadH = 1.17; loadW = 0.4; loadD = 0.43;
    } else if (a.load === 'produce') {
      const count = 3 + Math.round(mood.density * 2);
      const kinds = [['#e8862a', 0.035], ['#c5302b', 0.033], ['#7fb03a', 0.03], ['#e9cf3a', 0.036], ['#6a3d78', 0.03]] as const;
      for (let i = 0; i < count; i++) {
        const crate = new THREE.Group();
        const wood = s.material(i % 2 ? '#c9a66e' : mood.cheer > 0.5 ? '#3f9a5a' : '#b08c58', { roughness: 0.85 });
        crate.add(s.box([0.5, 0.012, 0.32], [0, 0.006, 0], wood));
        for (const z of [-0.154, 0.154]) for (const y of [0.05, 0.13]) crate.add(s.box([0.5, 0.055, 0.012], [0, y, z], wood));
        for (const x of [-0.244, 0.244]) crate.add(s.box([0.012, 0.16, 0.32], [x, 0.08, 0], wood));
        const kind = kinds[Math.floor(random() * kinds.length)];
        const fruit = s.material(kind[0], { roughness: 0.6 });
        const points: { at: P3; size: number }[] = [];
        for (let ix = 0; ix < 6; ix++) for (let iz = 0; iz < 4; iz++) points.push({ at: [-0.2 + ix * 0.08 + (random() - 0.5) * 0.02, 0.13 + random() * 0.03, -0.115 + iz * 0.077 + (random() - 0.5) * 0.02], size: kind[1] * (0.9 + random() * 0.3) });
        const before = s.root.children.length;
        s.scatter(new THREE.SphereGeometry(1, 8, 6), fruit, points);
        crate.add(s.root.children[before]);
        crate.position.set(i ? jx() : 0, y0 + i * 0.175, 0.19 + (i ? Math.abs(jx()) * 0.6 : 0));
        crate.rotation.y = i ? jr() * 0.5 : 0;
        g.add(crate);
        topper = crate;
      }
      loadH = count * 0.175; loadW = 0.5; loadD = 0.36;
    } else if (a.load === 'sacks') {
      const count = 2 + Math.round(mood.density * 2);
      const hessian = s.material(mood.warmth > 0.5 ? '#a98658' : '#8f8672', { roughness: 1 });
      for (let i = 0; i < count; i++) {
        const sack = new THREE.Group();
        sack.add(s.ball([0.27, 0.15, 0.2], [0, 0.14, 0], hessian, 14));
        sack.add(s.ball([0.05, 0.05, 0.05], [0.27, 0.17, 0], hessian, 8));
        sack.add(s.ring(0.035, 0.008, [0.235, 0.165, 0], s.material('#d9cfae')));
        (sack.children[2] as THREE.Mesh).rotation.y = Math.PI / 2;
        sack.position.set(i ? jx() : 0, y0 + i * 0.24, 0.21);
        sack.rotation.y = (i % 2 ? Math.PI : 0) + jr() * 0.4;
        sack.rotation.z = jr() * 0.15;
        g.add(sack);
        topper = sack;
      }
      loadH = count * 0.24 + 0.05; loadW = 0.54; loadD = 0.4;
    } else if (a.load === 'cabinet') {
      const grey = s.material(mood.cheer > 0.7 ? '#6f8f8a' : '#8d9296', { metalness: 0.3, roughness: 0.5 });
      const h = 1.3;
      add(() => s.box([0.46, h, 0.5], [0, y0 + h / 2, 0.27], grey));
      const open = Math.floor(random() * 4);
      for (let i = 0; i < 4; i++) {
        const out = i === open ? 0.05 + sway * 0.2 : 0;
        add(() => s.box([0.43, 0.29, 0.02 + out], [0, y0 + 0.17 + i * 0.32, 0.525 + out / 2], grey));
        add(() => s.box([0.14, 0.022, 0.02], [0, y0 + 0.23 + i * 0.32, 0.545 + out], steel));
        add(() => s.box([0.09, 0.05, 0.004], [0, y0 + 0.14 + i * 0.32, 0.537 + out], s.material('#f0ead2')));
      }
      loadH = h; loadW = 0.46; loadD = 0.53;
    } else if (a.load === 'palm') {
      const pot = s.material('#b9623f', { roughness: 0.85 });
      add(() => s.lathe([[0, 0], [0.15, 0], [0.2, 0.3], [0.22, 0.32], [0.22, 0.37], [0.19, 0.37], [0.18, 0.33], [0, 0.33]], pot, [0, y0, 0.23]));
      add(() => s.cylinder(0.035, 0.05, 0.6, [0, y0 + 0.62, 0.23], s.material('#6b4a2e', { roughness: 1 }), 10));
      const leaf = s.material(mood.wear > 0.75 ? '#9a8a3f' : '#3f8a46', { roughness: 0.7, side: THREE.DoubleSide });
      const fronds = 7 + Math.round(mood.density * 5);
      for (let i = 0; i < fronds; i++) {
        const angle = i / fronds * Math.PI * 2 + random() * 0.4, reach = 0.45 + random() * 0.3, rise = 0.15 + random() * 0.4;
        const base = new THREE.Vector3(0, y0 + 0.9, 0.23);
        const mid = base.clone().add(new THREE.Vector3(Math.cos(angle) * reach * 0.5, rise, Math.sin(angle) * reach * 0.5));
        const tip = base.clone().add(new THREE.Vector3(Math.cos(angle) * reach, rise - 0.15 - random() * 0.2, Math.sin(angle) * reach));
        const frond = add(() => s.tube([base.toArray() as P3, mid.toArray() as P3, tip.toArray() as P3], 0.045, leaf));
        frond.scale.y = 1;
        (frond.geometry as THREE.BufferGeometry).dispose();
        frond.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, tip]), 10, 0.06, 3);
      }
      loadH = 0.6; loadW = 0.44; loadD = 0.45;
    } else if (a.load === 'bottles') {
      const colours = [['#b5332b', '#8d1f1a'], ['#2b2e31', '#e8e4d8'], ['#2a62ad', '#e8e4d8'], ['#7a2b2b', '#2b2e31']];
      const first = Math.floor(random() * colours.length);
      for (let i = 0; i < 2; i++) {
        const [bodyC, neckC] = colours[(first + i) % colours.length];
        const x = (i - 0.5) * 0.235, ht = 1.15 + i * 0.12 * random();
        const bodyM = s.material(bodyC, { metalness: 0.3, roughness: 0.45 });
        add(() => s.cylinder(0.112, 0.112, ht, [x, y0 + ht / 2, 0.14], bodyM, 20));
        add(() => s.ball([0.112, 0.09, 0.112], [x, y0 + ht, 0.14], s.material(neckC, { roughness: 0.5 }), 14));
        add(() => s.cylinder(0.035, 0.04, 0.1, [x, y0 + ht + 0.1, 0.14], s.material('#b98a2c', { metalness: 0.8, roughness: 0.3 }), 10));
        add(() => s.cylinder(0.06, 0.06, 0.03, [x, y0 + ht + 0.16, 0.14], dark, 10));
      }
      loadH = 1.15; loadW = 0.47; loadD = 0.27;
    }

    // Straps.
    if (a.strap !== 'none' && a.load !== 'nothing') {
      const loop = (y: number, thick: number, tall: number, material: THREE.Material, tiltZ = 0) => {
        const hoop = new THREE.Group();
        const hw = Math.max(loadW / 2, railX) + 0.014, front = loadD + 0.03, backZ = -0.025;
        hoop.add(s.box([hw * 2, tall, thick], [0, 0, front], material), s.box([hw * 2, tall, thick], [0, 0, backZ], material));
        for (const x of [-hw, hw]) hoop.add(s.box([thick, tall, front - backZ], [x, 0, (front + backZ) / 2], material));
        hoop.position.y = y;
        hoop.rotation.z = tiltZ;
        g.add(hoop);
        return hoop;
      };
      const mid = y0 + Math.max(0.25, Math.min(loadH * 0.62, 1.0));
      if (a.strap === 'ratchet') {
        const hoop = loop(mid, 0.006, 0.05, s.material('#f0761c', { roughness: 0.7 }));
        hoop.add(s.box([0.09, 0.07, 0.03], [0.1, 0, loadD + 0.05], steel));
      } else if (a.strap === 'rope') {
        const rope = s.material('#c8ad78', { roughness: 1 });
        for (let i = 0; i < 3; i++) loop(mid - 0.08 + i * 0.07, 0.014, 0.014, rope, (random() - 0.5) * 0.14);
        add(() => s.ball([0.035, 0.03, 0.03], [0.05, mid, loadD + 0.04], rope, 8));
        add(() => s.rod([0.05, mid, loadD + 0.04], [0.1, mid - 0.22, loadD + 0.05], 0.007, rope));
      } else {
        const cord = s.material('#3f9a3c', { roughness: 0.6 });
        const hw = Math.max(loadW / 2, railX) + 0.012;
        const lo = y0 + Math.max(0.12, loadH * 0.3), hi = y0 + Math.min(1.05, loadH * 0.85);
        for (const side of [-1, 1]) {
          add(() => s.tube([[side * railX, lo, 0], [side * hw, lo + (hi - lo) * 0.15, loadD * 0.5], [side * hw * 0.5, lo + (hi - lo) * 0.35, loadD + 0.02], [-side * hw * 0.5, lo + (hi - lo) * 0.65, loadD + 0.02], [-side * hw, lo + (hi - lo) * 0.85, loadD * 0.5], [-side * railX, hi, 0]], 0.009, cord));
          add(() => s.ball([0.016, 0.016, 0.016], [side * railX, lo, 0], steel, 8));
        }
      }
    }

    // Clipboard.
    if (a.story === 'note') {
      const board = new THREE.Group();
      board.add(s.box([0.24, 0.32, 0.008], [0, 0, 0], s.material('#7a5632', { roughness: 0.8 })));
      const sheet = s.label('DELIVERY', 0.21, 0.05, [0, 0.09, 0.006], '#22252a', '#f6f3e8');
      board.add(sheet, s.box([0.21, 0.2, 0.002], [0, -0.04, 0.005], s.material('#f6f3e8')));
      for (let i = 0; i < 5; i++) board.add(s.box([0.1 + random() * 0.08, 0.008, 0.001], [-0.02, 0.03 - i * 0.03, 0.007], dark));
      board.add(s.box([0.09, 0.03, 0.014], [0, 0.15, 0.008], steel));
      if (a.load === 'nothing') { board.position.set(0, 0.78, 0.012); board.rotation.x = -0.05; }
      else { board.position.set(0.05, y0 + Math.min(loadH * 0.5, 0.8), loadD + 0.045); board.rotation.z = (random() - 0.5) * 0.3; board.rotation.x = -0.06; }
      if (a.load === 'palm' || a.load === 'sacks') { board.position.set(0.02, 1.0, -0.03); board.rotation.y = Math.PI; }
      g.add(board);
    }

    // Pose: rotate the whole barrow about its axle.
    const pivot = new THREE.Vector3(0, 0.14, -0.12);
    for (const child of g.children) child.position.sub(pivot);
    g.position.copy(pivot);
    const tip = { upright: 0, tilted: -0.62 - random() * 0.12, lying: -(Math.PI / 2 - 0.1) }[a.pose];
    g.rotation.x = tip;
    if (a.story === 'flat') g.rotation.z = flatSide * 0.075;
    s.root.add(g);

    if (a.story === 'fallen') {
      // Take the top of the load off and leave it on the ground.
      const lost = topper ?? null;
      if (lost && a.load !== 'kegs') {
        g.remove(lost);
        lost.position.set(0.3 + random() * 0.2, a.load === 'sacks' ? 0 : 0.16, (a.pose === 'lying' ? 0.1 : 0.55) + random() * 0.2);
        lost.rotation.set(a.load === 'sacks' ? 0 : Math.PI / 2 + (random() - 0.5) * 0.3, random() * 3, 0);
        if (a.load === 'produce') { lost.rotation.set(0.5, random() * 3, 1.2); lost.position.y = 0.2; }
        s.root.add(lost);
      } else if (lost) {
        g.remove(lost);
        lost.rotation.set(Math.PI / 2, 0, random() * 0.6);
        lost.position.set(0.5 + random() * 0.2, 0.2, 0.6);
        s.root.add(lost);
      } else {
        const glove = s.material('#d8a12c', { roughness: 0.95 });
        s.ball([0.05, 0.03, 0.09], [0.25, 0.03, 0.5], glove, 10).rotation.y = random() * 3;
        s.ball([0.05, 0.03, 0.09], [0.38, 0.03, 0.42], glove, 10).rotation.y = random() * 3;
      }
      if (a.load === 'produce') {
        const spill = s.material('#e8862a', { roughness: 0.6 });
        s.scatter(new THREE.SphereGeometry(1, 8, 6), spill, Array.from({ length: 9 }, () => ({ at: [0.1 + random() * 0.8, 0.035, 0.5 + random() * 0.7] as P3, size: 0.035 })));
      }
    }

    s.root.rotation.y = -0.55 + (random() - 0.5) * 0.4;
    return s.finish();
  },
});
