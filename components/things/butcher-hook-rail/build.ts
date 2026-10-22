import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Piece = 'goose' | 'chicken' | 'charsiu' | 'siuyuk' | 'sausage' | 'belly' | 'ribs' | 'leg' | 'liver' | 'head' | 'duck';

export default defineThing({
  questions: {
    shop: choice('What kind of meat stall is it?', {
      raw: 'A raw pork butcher: pink slabs, ribs, trotters and offal hanging in the open air under red lamps.',
      siumei: 'A siu mei roast shop: glossy mahogany geese, red char siu and crackling pork belly behind a steamed-up glass window.',
      laapmei: 'A cured meat stall: strings of dark wind-dried sausage and flattened waxed ducks, dry and winter-smelling.',
      both: 'A stall that does both, raw cuts at one end and roast meats at the other.',
    }),
    full: score('How full is the rail?', ['Bare hooks swinging, sold out or closing', 'Two or three pieces left', 'Half the hooks taken', 'Well stocked', 'Crowded shoulder to shoulder, a wall of meat']),
    pride: choice('What hangs in pride of place in the middle?', {
      goose: 'A whole roast goose, neck and head still on, dripping.',
      head: 'A whole pig head, pale and smiling faintly.',
      belly: 'A long slab of pork belly, layered fat and lean.',
      ribs: 'A wide rack of ribs like a ladder.',
      nothing: 'Nothing special: just the run of the rail.',
    }),
    cleaver: choice('Where is the cleaver?', {
      sunk: 'Sunk upright into the round chopping block.',
      flat: 'Laid flat on the block, wiped.',
      mid: 'Mid-job: resting across a piece half chopped into slices.',
      hung: 'Hung up on the rail on its own hook, done for the day.',
    }),
    counter: choice('What sits on the counter?', {
      order: 'A takeaway box of rice with sliced meat laid across it, waiting to be closed.',
      offcuts: 'A heap of bones and trimmings pushed to one side.',
      tray: 'A steel tray catching drips, and a pot of sauce with a ladle.',
      wiped: 'Nothing. Wiped down, a folded cloth.',
    }),
    front: choice('What is the counter front like?', {
      tile: 'Small white tiles with dark grout, splashed.',
      green: 'Old green and cream mosaic tile.',
      steel: 'Plain stainless sheet with a dented kick plate.',
      red: 'Red painted board with a price list in white.',
    }),
    board: choice('If there is a price board, what does it promise?', {
      rice: 'RICE BOX $38',
      goose: 'ROAST GOOSE $168',
      catty: 'PORK $52 / CATTY',
      sold: 'SOLD OUT',
      none: 'There is no board.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 2.0, D = 0.62, TOP = 0.9, RAIL = 2.02, RZ = -0.02;
    const steel = s.material('#c5cbcd', { metalness: 0.7, roughness: mix(0.25, 0.5, mood.wear) });
    const dark = s.material('#34393c', { roughness: 0.6 });
    const wood = s.material('#b88a54', { roughness: 0.85 });
    const gloss = mix(0.18, 0.4, mood.wear);
    const paint = (color: string, options: THREE.MeshStandardMaterialParameters = {}) => s.material(color, { roughness: gloss, ...options });
    const roast = paint('#8e3a12', { emissive: '#5a1c05', emissiveIntensity: 0.25 });
    const roastDark = paint('#5e230c');
    const lacquer = paint('#a81d1a', { emissive: '#6a0a08', emissiveIntensity: 0.3 });
    const crackle = paint('#d99a2e', { roughness: 0.55 });
    const pale = paint('#e8d3a0');
    const pink = paint('#e39a92', { roughness: 0.45 });
    const lean = paint('#c2504e', { roughness: 0.45 });
    const fat = paint('#f3e6d6', { roughness: 0.5 });
    const offal = paint('#6e2424', { roughness: 0.25 });
    const cured = paint('#7a2a22', { roughness: 0.5 });
    const waxed = paint('#b5772e', { roughness: 0.45 });
    const bone = paint('#ece2c8', { roughness: 0.7 });

    // Counter.
    const frontTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      if (a.front === 'steel') { ctx.fillStyle = '#b9c0c2'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 60; i++) ctx.fillRect(0, random() * 256, 512, 1); ctx.fillStyle = '#8f9698'; ctx.fillRect(0, 206, 512, 50); }
      else if (a.front === 'red') {
        ctx.fillStyle = '#b3211f'; ctx.fillRect(0, 0, 512, 256); ctx.fillStyle = '#f6efe0'; ctx.font = '900 30px sans-serif';
        ['PORK  $52', 'RIBS  $68', 'LIVER $30', 'FEET  $24'].forEach((line, i) => ctx.fillText(line, 40 + (i % 2) * 250, 90 + Math.floor(i / 2) * 80));
        ctx.lineWidth = 6; ctx.strokeStyle = '#f6efe0'; ctx.strokeRect(14, 14, 484, 228);
      } else {
        const size = a.front === 'green' ? 16 : 32;
        ctx.fillStyle = a.front === 'green' ? '#5a6a58' : '#5d6163'; ctx.fillRect(0, 0, 512, 256);
        for (let y = 0; y < 256; y += size) for (let x = 0; x < 512; x += size) {
          ctx.fillStyle = a.front === 'green' ? pick(['#4f8d6a', '#4f8d6a', '#e9e2c6', '#3f7a5c', '#6aa27e']) : pick(['#f2f1ea', '#eceae0', '#f6f5ef']);
          ctx.fillRect(x + 1.5, y + 1.5, size - 3, size - 3);
        }
      }
      // Splashes low down, worse with wear.
      for (let i = 0; i < mood.wear * 40; i++) { ctx.fillStyle = `rgba(110,30,25,${0.2 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * 512, 150 + random() * 106, 2 + random() * 5, 4 + random() * 14, 0, 0, 7); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const body = s.material('#d9d6cc');
    s.box([W, TOP - 0.06, D], [0, (TOP - 0.06) / 2, 0], body);
    const face = s.mesh(new THREE.PlaneGeometry(W, TOP - 0.06), new THREE.MeshStandardMaterial({ map: frontTexture, roughness: a.front === 'steel' ? 0.35 : 0.5, metalness: a.front === 'steel' ? 0.5 : 0 }), [0, (TOP - 0.06) / 2, D / 2 + 0.003]);
    face.castShadow = false;
    s.box([W + 0.06, 0.06, D + 0.08], [0, TOP - 0.03, 0.01], a.front === 'steel' || a.shop === 'siumei' ? steel : wood);

    // Posts and rail.
    for (const x of [-1, 1]) s.box([0.05, RAIL + 0.1 - TOP, 0.05], [x * (W / 2 - 0.03), (RAIL + 0.1 + TOP) / 2, -D / 2 + 0.05], steel);
    for (const x of [-1, 1]) s.rod([x * (W / 2 - 0.03), RAIL, -D / 2 + 0.05], [x * (W / 2 - 0.03), RAIL, RZ], 0.016, steel);
    s.rod([-W / 2 + 0.02, RAIL, RZ], [W / 2 - 0.02, RAIL, RZ], 0.02, steel);
    s.box([W, 0.05, 0.05], [0, RAIL + 0.1, -D / 2 + 0.05], steel);

    // Hooks.
    const swinging: { group: THREE.Group; phase: number; amount: number }[] = [];
    const hookArc = new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI * 1.25);
    const hang = (x: number) => {
      const group = new THREE.Group();
      group.position.set(x, RAIL - 0.02, RZ);
      const top = new THREE.Mesh(hookArc, steel); top.position.y = 0.0; top.rotation.z = -0.4;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), steel); stem.position.y = -0.06;
      const bottom = new THREE.Mesh(hookArc, steel); bottom.position.y = -0.12; bottom.rotation.z = Math.PI - 0.4;
      group.add(top, stem, bottom);
      s.root.add(group);
      swinging.push({ group, phase: random() * 6, amount: 1 });
      return group;
    };
    const add = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1], turn: [number, number, number] = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale); mesh.rotation.set(...turn);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const ball = new THREE.SphereGeometry(1, 16, 10), can = new THREE.CylinderGeometry(1, 1, 1, 12), cube = new THREE.BoxGeometry(1, 1, 1);
    const H = -0.15; // where a piece meets its hook

    const bird = (g: THREE.Group, skin: THREE.Material, shade: THREE.Material, size: number, longNeck: boolean) => {
      const neck = longNeck ? 0.2 : 0.09;
      // Hung by the neck: head at the hook, body below, legs trussed up.
      add(g, ball, shade, [0, H - 0.01, 0.01], [0.032 * size, 0.04 * size, 0.035 * size]);
      add(g, new THREE.ConeGeometry(0.018 * size, 0.07 * size, 8), paint('#c98a2a'), [0, H + 0.0, 0.055 * size], [1, 1, 1], [1.9, 0, 0]);
      add(g, can, skin, [0, H - 0.03 - neck / 2, 0], [0.022 * size, neck, 0.022 * size]);
      const top = H - 0.03 - neck;
      add(g, ball, skin, [0, top - 0.15 * size, 0], [0.105 * size, 0.18 * size, 0.085 * size]);
      add(g, ball, skin, [0, top - 0.2 * size, 0.01], [0.12 * size, 0.13 * size, 0.09 * size]);
      for (const side of [-1, 1]) {
        add(g, ball, shade, [side * 0.1 * size, top - 0.13 * size, -0.01], [0.03 * size, 0.1 * size, 0.05 * size], [0, 0, side * 0.2]);
        add(g, ball, skin, [side * 0.06 * size, top - 0.3 * size, 0.02], [0.04 * size, 0.07 * size, 0.04 * size], [0, 0, side * -0.3]);
        add(g, can, shade, [side * 0.075 * size, top - 0.37 * size, 0.02], [0.012 * size, 0.07 * size, 0.012 * size], [0, 0, side * -0.25]);
      }
    };
    const make: Record<Piece, (g: THREE.Group) => void> = {
      goose: (g) => bird(g, roast, roastDark, 1.25, true),
      chicken: (g) => bird(g, pale, paint('#d8bd7a'), 1, false),
      duck: (g) => {
        // Waxed duck pressed flat like a paddle.
        add(g, can, waxed, [0, H - 0.08, 0], [0.018, 0.14, 0.014]);
        add(g, ball, waxed, [0, H - 0.3, 0], [0.13, 0.17, 0.018]);
        for (const side of [-1, 1]) add(g, ball, cured, [side * 0.1, H - 0.42, 0], [0.035, 0.09, 0.014], [0, 0, side * 0.5]);
      },
      charsiu: (g) => {
        const strips = 1 + Math.floor(random() * 3);
        for (let i = 0; i < strips; i++) {
          const x = (i - (strips - 1) / 2) * 0.075, length = mix(0.3, 0.45, random());
          const points = Array.from({ length: 5 }, (_u, k) => new THREE.Vector3(x + (random() - 0.5) * 0.03, H - 0.01 - (k / 4) * length, (random() - 0.5) * 0.03));
          const strip = add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 10, 0.034, 7), lacquer, [0, 0, 0], [1, 1, 0.65]);
          strip.rotation.y = (random() - 0.5) * 0.6;
          add(g, ball, roastDark, [x, H - 0.02 - length, 0], [0.03, 0.03, 0.022]);
        }
      },
      siuyuk: (g) => {
        const length = mix(0.36, 0.5, random());
        add(g, cube, pale, [0, H - 0.03 - length / 2, 0], [0.2, length, 0.05]);
        add(g, cube, crackle, [0, H - 0.03 - length / 2, 0.03], [0.205, length + 0.005, 0.014]);
        add(g, cube, fat, [0, H - 0.03 - length / 2, 0.012], [0.203, length + 0.002, 0.012]);
        for (let k = 1; k < 5; k++) add(g, cube, roastDark, [0, H - 0.03 - (k / 5) * length, 0.038], [0.205, 0.006, 0.004]);
      },
      sausage: (g) => {
        const pairs = 2 + Math.floor(random() * 3);
        for (let i = 0; i < pairs; i++) for (const side of [-1, 1]) {
          const x = (i - (pairs - 1) / 2) * 0.05;
          add(g, new THREE.CapsuleGeometry(0.013, 0.17, 3, 8), pick([cured, cured, paint('#5a1e1c', { roughness: 0.5 })]), [x, H - 0.13 - (i % 2) * 0.03, side * 0.022], [1, 1, 1], [side * 0.12, 0, (random() - 0.5) * 0.15]);
        }
        add(g, can, bone, [0, H - 0.02, 0], [0.003, 0.05, 0.003]);
      },
      belly: (g) => {
        const length = mix(0.42, 0.62, random()), width = mix(0.2, 0.26, random());
        add(g, cube, pink, [0, H - 0.03 - length / 2, 0], [width, length, 0.05]);
        add(g, cube, fat, [0, H - 0.03 - length / 2, -0.03], [width + 0.004, length + 0.004, 0.014]);
        for (let k = 0; k < 3; k++) add(g, cube, k % 2 ? fat : lean, [0, H - 0.03 - length / 2, 0.012 + k * 0.007], [width * (0.96 - k * 0.14), length * 0.98, 0.012]);
      },
      ribs: (g) => {
        const length = mix(0.4, 0.55, random()), width = 0.3;
        add(g, cube, lean, [0, H - 0.03 - length / 2, 0], [width, length, 0.03]);
        const count = Math.round(length / 0.055);
        for (let k = 0; k < count; k++) add(g, can, bone, [0, H - 0.06 - (k / count) * length, 0.014], [0.012, width + 0.03, 0.012], [0, 0, Math.PI / 2 + 0.08]);
      },
      leg: (g) => {
        add(g, can, fat, [0, H - 0.06, 0], [0.028, 0.14, 0.028]);
        add(g, ball, pink, [0, H - 0.02, 0.01], [0.04, 0.035, 0.045]);
        add(g, ball, pink, [0, H - 0.3, 0], [0.1, 0.2, 0.085]);
        add(g, can, lean, [0, H - 0.49, 0], [0.085, 0.012, 0.07]);
        add(g, can, bone, [0, H - 0.5, 0], [0.025, 0.012, 0.025]);
      },
      liver: (g) => {
        add(g, ball, offal, [-0.03, H - 0.16, 0], [0.085, 0.15, 0.03], [0, 0, 0.15]);
        add(g, ball, offal, [0.05, H - 0.2, 0.01], [0.07, 0.16, 0.028], [0, 0, -0.2]);
        const points = Array.from({ length: 7 }, (_u, k) => new THREE.Vector3(0.11 + Math.sin(k * 2.1) * 0.03, H - 0.02 - k * 0.06, Math.cos(k * 1.7) * 0.02));
        add(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 20, 0.014, 6), fat, [0, 0, 0]);
      },
      head: (g) => {
        const skin = paint('#edc3b0', { roughness: 0.5 });
        add(g, ball, skin, [0, H - 0.2, 0], [0.15, 0.17, 0.13]);
        add(g, can, skin, [0, H - 0.25, 0.14], [0.06, 0.1, 0.05], [Math.PI / 2, 0, 0]);
        add(g, can, pink, [0, H - 0.25, 0.192], [0.057, 0.008, 0.047], [Math.PI / 2, 0, 0]);
        for (const side of [-1, 1]) {
          add(g, ball, dark, [side * 0.02, H - 0.25, 0.197], [0.009, 0.014, 0.004]);
          add(g, new THREE.ConeGeometry(0.06, 0.13, 4), skin, [side * 0.11, H - 0.06, 0.02], [1, 1, 0.3], [0.3, 0, side * -0.5]);
          add(g, cube, dark, [side * 0.06, H - 0.16, 0.115], [0.04, 0.006, 0.006], [0, 0, side * -0.25]);
        }
      },
    };

    const raws: Piece[] = ['belly', 'ribs', 'leg', 'liver', 'belly', 'ribs'];
    const roasts: Piece[] = ['goose', 'charsiu', 'siuyuk', 'chicken', 'charsiu', 'goose'];
    const cureds: Piece[] = ['sausage', 'sausage', 'duck', 'sausage', 'duck'];
    const hooks = 9;
    const filled = Math.round(mix(0, hooks, a.full) * mix(0.85, 1, mood.density));
    const order = Array.from({ length: hooks }, (_u, i) => i).sort(() => random() - 0.5).slice(0, filled);
    const middle = Math.floor(hooks / 2);
    const cleaverHook = a.cleaver === 'hung' ? hooks - 1 : -1;
    for (let i = 0; i < hooks; i++) {
      const x = mix(-W / 2 + 0.16, W / 2 - 0.16, i / (hooks - 1));
      const g = hang(x);
      if (i === cleaverHook) continue;
      const here = order.includes(i);
      let piece: Piece | null = null;
      if (i === middle && a.pride !== 'nothing' && a.full > 0.08) piece = a.pride;
      else if (here) piece = a.shop === 'raw' ? pick(raws) : a.shop === 'siumei' ? pick(roasts) : a.shop === 'laapmei' ? pick(cureds) : i < middle ? pick(raws) : pick(roasts);
      if (!piece) { swinging.at(-1)!.amount = 2.5; continue; }
      make[piece](g);
      g.rotation.y = (random() - 0.5) * 0.5;
    }

    // Lamps: red shades for raw meat, bare heat bulbs for roast.
    const warm = new THREE.Color().setHSL(mix(0.12, 0.06, mood.warmth), 1, 0.6);
    const lampCount = 3;
    for (let i = 0; i < lampCount; i++) {
      const x = mix(-0.62, 0.62, i / (lampCount - 1));
      const y = RAIL - 0.1, z = D / 2 + 0.02;
      s.rod([x, RAIL + 0.1, -D / 2 + 0.05], [x, RAIL + 0.12, z], 0.01, steel);
      s.rod([x, RAIL + 0.12, z], [x, y + 0.12, z], 0.006, dark);
      if (a.shop === 'raw' || a.shop === 'both' && i === 0) s.lathe([[0.03, 0.15], [0.05, 0.14], [0.18, 0], [0.185, -0.01]], s.material('#d3202a', { roughness: 0.4, emissive: '#b0141c', emissiveIntensity: mix(0.25, 0.6, mood.cheer), side: THREE.DoubleSide }), [x, y - 0.02, z]);
      else s.cylinder(0.03, 0.04, 0.06, [x, y + 0.1, z], steel, 10);
      s.ball([0.05, 0.06, 0.05], [x, y + 0.02, z], new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: warm, emissiveIntensity: mix(1.5, 3, mood.cheer), roughness: 0.3 }), 12);
    }

    // The roast shop window: a pane with a steel frame, fogged at the bottom.
    if (a.shop === 'siumei') {
      const zf = D / 2 - 0.02;
      s.box([W - 0.06, RAIL - TOP - 0.3, 0.01], [0, TOP + (RAIL - TOP - 0.3) / 2, zf], new THREE.MeshStandardMaterial({ color: '#e6f0ee', transparent: true, opacity: 0.14, roughness: 0.05, depthWrite: false }));
      s.box([W - 0.06, 0.25, 0.012], [0, TOP + 0.125, zf + 0.002], new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
      s.box([W, 0.035, 0.035], [0, RAIL - 0.3, zf], steel);
      for (const x of [-1, 1]) s.box([0.035, RAIL - TOP - 0.3, 0.035], [x * (W / 2 - 0.03), TOP + (RAIL - TOP - 0.3) / 2, zf], steel);
    }

    // Price board on the back bar.
    if (a.board !== 'none') {
      const text = { rice: 'RICE BOX $38', goose: 'ROAST GOOSE $168', catty: 'PORK $52 / CATTY', sold: 'SOLD OUT' }[a.board];
      const label = s.label(text, 0.95, 0.22, [W / 2 - 0.55, RAIL + 0.26, -D / 2 + 0.08], a.board === 'sold' ? '#f4efe0' : '#c21f1f', a.board === 'sold' ? '#22262a' : '#f6efd4');
      label.rotation.z = a.board === 'sold' ? -0.06 : (random() - 0.5) * 0.05;
      s.box([0.97, 0.24, 0.015], [W / 2 - 0.55, RAIL + 0.26, -D / 2 + 0.07], dark).rotation.z = label.rotation.z;
    }

    // Chopping block and cleaver.
    const bx = -W / 2 + 0.42, by = TOP + 0.11;
    s.cylinder(0.2, 0.2, 0.11, [bx, TOP + 0.055, 0.05], s.material('#c79a62', { roughness: 0.9 }), 24);
    s.cylinder(0.202, 0.202, 0.025, [bx, TOP + 0.06, 0.05], steel, 24);
    s.cylinder(0.17, 0.17, 0.004, [bx, by, 0.05], s.material(mood.wear > 0.4 ? '#a9764c' : '#d8b27c', { roughness: 0.95 }), 20);
    const cleaver = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.005), s.material('#d4d9da', { metalness: 0.85, roughness: 0.25 }));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.12, 8), s.material('#4f3320'));
    handle.rotation.z = Math.PI / 2; handle.position.set(0.17, 0.03, 0);
    blade.castShadow = handle.castShadow = true;
    cleaver.add(blade, handle);
    s.root.add(cleaver);
    if (a.cleaver === 'sunk') { cleaver.position.set(bx, by + 0.045, 0.05); cleaver.rotation.set(0, 0.5, 0.3); }
    else if (a.cleaver === 'flat') { cleaver.position.set(bx, by + 0.006, 0.05); cleaver.rotation.set(Math.PI / 2, 0, 0.4); }
    else if (a.cleaver === 'hung') { cleaver.position.set(mix(-W / 2 + 0.16, W / 2 - 0.16, 1), RAIL - 0.3, RZ); cleaver.rotation.set(0, 0.2, Math.PI / 2); }
    else {
      cleaver.position.set(bx + 0.02, by + 0.07, 0.05); cleaver.rotation.set(0.25, 0.9, 0.15);
      const meat = a.shop === 'raw' ? lean : a.shop === 'laapmei' ? cured : lacquer;
      for (let i = 0; i < 6; i++) s.box([0.02, 0.03, 0.07], [bx - 0.12 + i * 0.028, by + 0.017, 0.08 + (random() - 0.5) * 0.01], meat).rotation.z = i < 3 ? 0.5 : 0;
    }

    // Counter business.
    const cx = 0.35;
    if (a.counter === 'order') {
      const foam = s.material('#f5f3ea', { roughness: 0.9 });
      s.box([0.24, 0.045, 0.17], [cx, TOP + 0.022, 0.1], foam);
      s.box([0.22, 0.012, 0.15], [cx, TOP + 0.048, 0.1], s.material('#fbfaf2'));
      for (let i = 0; i < 5; i++) s.box([0.022, 0.014, 0.08], [cx - 0.06 + i * 0.026, TOP + 0.06, 0.1], i % 2 ? lacquer : roast).rotation.z = 0.4;
      s.ball([0.03, 0.012, 0.03], [cx + 0.085, TOP + 0.058, 0.13], s.material('#3f8a3a'), 8);
      const lid = s.box([0.24, 0.01, 0.17], [cx, TOP + 0.12, 0.0], foam);
      lid.rotation.x = -1.1;
      s.ball([0.1, 0.12, 0.05], [cx + 0.4, TOP + 0.12, 0.1], s.material('#dc2a30', { roughness: 0.3 }), 10);
    } else if (a.counter === 'offcuts') {
      for (let i = 0; i < 14; i++) {
        const piece = s.rod([cx + (random() - 0.5) * 0.4, TOP + 0.015 + random() * 0.05, 0.05 + (random() - 0.5) * 0.25], [cx + (random() - 0.5) * 0.4, TOP + 0.015 + random() * 0.07, 0.05 + (random() - 0.5) * 0.25], 0.012 + random() * 0.012, pick([bone, bone, lean, fat]));
        piece.castShadow = true;
      }
    } else if (a.counter === 'tray') {
      s.box([0.5, 0.03, 0.32], [cx, TOP + 0.015, 0.02], steel);
      s.box([0.46, 0.006, 0.28], [cx, TOP + 0.031, 0.02], paint('#6a2a10', { roughness: 0.1 }));
      s.cylinder(0.09, 0.075, 0.13, [cx + 0.45, TOP + 0.065, 0.08], steel, 16);
      s.cylinder(0.08, 0.08, 0.006, [cx + 0.45, TOP + 0.12, 0.08], paint('#4a1a0a', { roughness: 0.1 }), 14);
      s.rod([cx + 0.45, TOP + 0.1, 0.08], [cx + 0.56, TOP + 0.3, 0.02], 0.008, steel);
    } else {
      s.box([0.18, 0.02, 0.13], [cx, TOP + 0.01, 0.12], s.material(pick(['#e9e4d2', '#d9a8a0', '#a9c4d0']), { roughness: 0.95 })).rotation.y = 0.2;
    }
    // Drips under the hanging meat on a busy day.
    if (a.full > 0.3) for (let i = 0; i < 6; i++) s.cylinder(0.02 + random() * 0.03, 0.02, 0.003, [(random() - 0.5) * 1.2, TOP + 0.002, -0.12 + random() * 0.14], a.shop === 'raw' ? paint('#8e1a1e') : paint('#6a2a10', { roughness: 0.1 }), 10);

    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        for (const one of swinging) one.group.rotation.z = Math.sin(time * 1.6 + one.phase) * 0.02 * one.amount * mix(0.3, 1.6, energy);
      },
    });
  },
});
