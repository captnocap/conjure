import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Many copies of one small geometry, each with its own position, rotation and scale. */
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: V3; rot?: V3; size?: V3 }[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, items.length));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  items.forEach((item, index) => {
    e.set(...(item.rot ?? [0, 0, 0]));
    q.setFromEuler(e);
    matrix.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...(item.size ?? [1, 1, 1])));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.count = items.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    meal: choice('What is the main item on the tray?', {
      burger: 'A burger in an open clamshell box: sesame bun, cheese, lettuce.',
      nuggets: 'An open box of chicken nuggets with a little tub of sauce.',
      wrap: 'A long sandwich wrapped in paper, one end torn open.',
      kids: 'A kids meal: a bright carry box with a handle and a plastic toy beside it.',
    }),
    eaten: score('How far has the meal been eaten?', ['Untouched, still steaming', 'A bite or two taken', 'Half gone', 'Only the wrapper and crumbs are left']),
    fries: score('How are the fries?', ['Down to the last few cold ones', 'A fair portion', 'Heaped over the carton and spilling onto the liner']),
    drink: choice('What is there to drink?', {
      soda: 'A big lidded soda cup with a bendy straw.',
      shake: 'A milkshake under a dome lid with a thick straw and whipped cream.',
      coffee: 'A paper coffee cup with a cardboard sleeve and a sip lid.',
      none: 'No drink at all.',
    }),
    liner: choice('What is printed on the paper liner?', {
      brand: 'A chain logo in a circle and THANK YOU in big letters.',
      puzzle: 'A kids puzzle sheet: a maze, a crossword grid, a join-the-dots.',
      promo: 'A loud promo: 2 FOR $5 in heavy black type over a yellow burst.',
      plain: 'Plain cream paper, nothing printed.',
    }),
    receipt: noul('Is the receipt tucked in beside the food?'),
    mishap: choice('What has gone wrong with it?', {
      nothing: 'Nothing: a tidy meal waiting to be eaten.',
      spill: 'The drink has tipped over: lid off, a dark puddle and ice spreading across the liner.',
      fly: 'A fly circling the food.',
      ketchup: 'Ketchup squeezed into a messy heap and smeared across the liner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const brand = new THREE.Color().setHSL(mix(0.0, 0.04, random()), mix(0.55, 0.95, mood.cheer), 0.45).getStyle();
    const yellow = new THREE.Color().setHSL(0.13, mix(0.6, 1, mood.cheer), 0.55).getStyle();

    // ---- the tray: a shallow moulded dish with a rim that leans outward
    const TW = 0.46, TD = 0.34;
    const trayColour = pick(['#5a1f24', '#2b2b2e', '#4c3a2a', '#1e3a2e', '#7a2626', '#2a3550']);
    const plastic = s.material(trayColour, { roughness: 0.55 });
    s.box([TW, 0.012, TD], [0, 0.006, 0], plastic);
    for (const [w, d, x, z, rz, rx] of [
      [TW + 0.01, 0.012, 0, TD / 2, 0, 0.3], [TW + 0.01, 0.012, 0, -TD / 2, 0, -0.3],
      [0.012, TD, TW / 2, 0, -0.3, 0], [0.012, TD, -TW / 2, 0, 0.3, 0],
    ] as const) {
      const rim = s.box([w, 0.028, d], [x, 0.02, z], plastic);
      rim.rotation.set(rx, 0, rz);
    }
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.006, 0.05], [x * TW * 0.4, -0.001, z * TD * 0.4], plastic);

    // ---- the printed paper liner
    const linerArt = paint(512, 384, (ctx) => {
      ctx.fillStyle = '#f3ead6';
      ctx.fillRect(0, 0, 512, 384);
      ctx.fillStyle = 'rgba(120,100,70,0.08)';
      for (let i = 0; i < 300; i++) ctx.fillRect(random() * 512, random() * 384, 2, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (a.liner === 'brand') {
        ctx.strokeStyle = brand;
        ctx.lineWidth = 6;
        ctx.strokeRect(16, 16, 480, 352);
        ctx.fillStyle = brand;
        ctx.beginPath();
        ctx.arc(256, 150, 78, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = yellow;
        ctx.font = '900 64px sans-serif';
        ctx.fillText(pick(['B', 'R', 'K', 'J', 'W']), 256, 154);
        ctx.fillStyle = brand;
        ctx.font = '900 54px sans-serif';
        ctx.fillText('THANK YOU', 256, 290, 440);
        ctx.font = '700 20px sans-serif';
        ctx.fillText('COME AGAIN SOON', 256, 335, 440);
      } else if (a.liner === 'puzzle') {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) if (random() < 0.7) ctx.strokeRect(40 + c * 30, 60 + r * 30, 30, 30);
        ctx.beginPath();
        let x = 260, y = 70;
        ctx.moveTo(x, y);
        for (let i = 0; i < 40; i++) { x += jitter(60); y += 6 + random() * 8; ctx.lineTo(Math.max(250, Math.min(470, x)), Math.min(330, y)); }
        ctx.stroke();
        ctx.fillStyle = '#333';
        for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.arc(60 + random() * 160, 260 + random() * 90, 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.font = '900 26px sans-serif';
        ctx.fillStyle = brand;
        ctx.fillText('FUN ZONE', 130, 36);
      } else if (a.liner === 'promo') {
        ctx.fillStyle = yellow;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) { const r = i % 2 ? 150 : 115, t = (i / 24) * Math.PI * 2; ctx.lineTo(256 + Math.cos(t) * r * 1.5, 192 + Math.sin(t) * r); }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '900 88px sans-serif';
        ctx.fillText('2 FOR $5', 256, 180, 400);
        ctx.font = '900 30px sans-serif';
        ctx.fillText('LIMITED TIME', 256, 250, 400);
      }
    });
    const liner = new THREE.Mesh(new THREE.PlaneGeometry(TW - 0.04, TD - 0.04), new THREE.MeshStandardMaterial({ map: linerArt, roughness: 0.95 }));
    liner.rotation.set(-Math.PI / 2, 0, jitter(0.08));
    liner.position.set(jitter(0.01), 0.0125, jitter(0.01));
    liner.receiveShadow = true;
    s.root.add(liner);
    const TOP = 0.0135;

    const paper = s.material('#f1ebdd', { roughness: 0.95, side: THREE.DoubleSide });
    const bun = s.material('#d8a45c', { roughness: 0.8, side: THREE.DoubleSide });
    const patty = s.material('#5a3524', { roughness: 0.9, side: THREE.DoubleSide });
    const red = s.material(brand, { roughness: 0.6 });
    const fryPaint = s.material('#e9c25a', { roughness: 0.7 });

    // ---- fries: a red scoop-fronted carton, and the fries that may or may not still be in it
    const fryAt: V3 = [-0.13, TOP, 0.03];
    const cartonShape = new THREE.Shape();
    cartonShape.moveTo(-0.035, 0);
    cartonShape.lineTo(0.035, 0);
    cartonShape.lineTo(0.048, 0.1);
    cartonShape.quadraticCurveTo(0, 0.06, -0.048, 0.1);
    cartonShape.closePath();
    const carton = s.mesh(new THREE.ExtrudeGeometry(cartonShape, { depth: 0.05, bevelEnabled: false }), red, [fryAt[0], fryAt[1], fryAt[2] + 0.025]);
    carton.rotation.y = Math.PI;
    carton.rotation.z = jitter(0.1);
    s.box([0.05, 0.016, 0.004], [fryAt[0], fryAt[1] + 0.03, fryAt[2] + 0.026], s.material(yellow));
    const fryCount = Math.round(mix(3, 44, a.fries));
    const fryGeometry = new THREE.BoxGeometry(0.0065, 0.0065, 1);
    const fries: { at: V3; rot?: V3; size?: V3 }[] = [];
    for (let i = 0; i < fryCount; i++) {
      const length = mix(0.05, 0.1, random());
      const spread = a.fries > 0.5 ? 0.04 : 0.026;
      const tilt = jitter(mix(0.4, 1.1, a.fries));
      fries.push({ at: [fryAt[0] + jitter(spread), fryAt[1] + 0.045 + length * 0.4 + random() * mix(0.005, 0.03, a.fries), fryAt[2] + 0.025 + jitter(0.03)], rot: [Math.PI / 2 + tilt, random() * Math.PI * 2, jitter(0.6)], size: [1, 1, length] });
    }
    if (a.fries > 0.65) for (let i = 0; i < 4 + Math.round(random() * 4); i++) {
      const length = mix(0.04, 0.09, random());
      fries.push({ at: [fryAt[0] + jitter(0.12), TOP + 0.004, fryAt[2] + 0.06 + jitter(0.14)], rot: [0, random() * Math.PI * 2, 0], size: [1, 1, length] });
    }
    s.root.add(instances(fryGeometry, fryPaint, fries));

    // ---- the main course
    const mealAt: V3 = [0.06, TOP, -0.04];
    const gone = a.eaten > 0.78;
    const bite = a.eaten > 0.2 ? mix(0.7, 2.6, (Math.min(a.eaten, 0.78) - 0.2) / 0.58) : 0;
    const crumbs = (count: number, around: V3, spread: number) => {
      const items = Array.from({ length: count }, () => ({ at: [around[0] + jitter(spread), TOP + 0.002, around[2] + jitter(spread * 0.8)] as V3, rot: [0, random() * 3, 0] as V3, size: [mix(0.4, 1.4, random()), 1, mix(0.4, 1.4, random())] as V3 }));
      s.root.add(instances(new THREE.BoxGeometry(0.006, 0.003, 0.005), bun, items));
    };
    if (a.meal === 'burger') {
      const box = s.material(pick(['#e8dcc0', '#f1ede4', '#d9c9a8']), { roughness: 0.9 });
      s.box([0.125, 0.03, 0.125], [mealAt[0], TOP + 0.015, mealAt[2]], box);
      s.box([0.11, 0.028, 0.11], [mealAt[0], TOP + 0.016, mealAt[2]], s.material('#c9b58f'));
      const lid = new THREE.Group();
      lid.position.set(mealAt[0], TOP + 0.03, mealAt[2] - 0.0625);
      lid.rotation.x = gone ? -Math.PI * 0.95 : -mix(1.9, 2.25, random());
      s.root.add(lid);
      const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.012, 0.125), box);
      lidMesh.position.set(0, 0.006, 0.0625);
      lidMesh.castShadow = lidMesh.receiveShadow = true;
      lid.add(lidMesh);
      if (!gone) {
        const b: V3 = [mealAt[0] + jitter(0.01), TOP + 0.03, mealAt[2] + jitter(0.01)];
        const arc = Math.PI * 2 - bite;
        const start = Math.PI * 0.5 + bite / 2 + 0.3;
        s.mesh(new THREE.CylinderGeometry(0.044, 0.042, 0.018, 24, 1, false, start, arc), bun, [b[0], b[1] + 0.009, b[2]]);
        s.mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.012, 24, 1, false, start, arc), patty, [b[0], b[1] + 0.024, b[2]]);
        if (bite === 0) s.box([0.088, 0.003, 0.088], [b[0], b[1] + 0.031, b[2]], s.material('#f0b23c', { roughness: 0.5 })).rotation.y = 0.35;
        s.mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.006, 9, 1, false, start, arc), s.material('#6fa83c', { roughness: 0.9, side: THREE.DoubleSide }), [b[0], b[1] + 0.036, b[2]]);
        const top = s.mesh(new THREE.SphereGeometry(0.047, 24, 12, start, arc, 0, Math.PI / 2), bun, [b[0], b[1] + 0.039, b[2]]);
        top.scale.y = 0.6;
        const seeds = Array.from({ length: 14 }, () => {
          const t = start + random() * arc, r = random() * 0.036;
          return { at: [b[0] + Math.sin(t) * r, b[1] + 0.039 + Math.sqrt(Math.max(0, 0.047 ** 2 - r ** 2)) * 0.6, b[2] + Math.cos(t) * r] as V3, size: [1, 0.5, 1.4] as V3, rot: [0, random() * 3, 0] as V3 };
        });
        s.root.add(instances(new THREE.SphereGeometry(0.003, 6, 4), s.material('#f5ecd0'), seeds));
      }
      if (a.eaten > 0.5) crumbs(Math.round(mix(4, 16, a.eaten)), mealAt, 0.12);
      if (gone) {
        const wrapper = s.mesh(new THREE.IcosahedronGeometry(0.035, 1), paper, [mealAt[0] + 0.01, TOP + 0.022, mealAt[2] + 0.02]);
        wrapper.scale.set(1.3, 0.7, 1.1);
      }
    } else if (a.meal === 'nuggets') {
      const box = s.material(pick(['#e8dcc0', '#f1ede4']), { roughness: 0.9 });
      s.box([0.13, 0.03, 0.095], [mealAt[0], TOP + 0.015, mealAt[2]], box);
      s.box([0.118, 0.026, 0.083], [mealAt[0], TOP + 0.018, mealAt[2]], s.material('#c9b58f'));
      const lid = s.box([0.13, 0.004, 0.095], [mealAt[0], TOP + 0.03, mealAt[2] - 0.0475], box);
      lid.geometry.translate(0, 0, 0.0475);
      lid.rotation.x = -mix(1.9, 2.4, random());
      const count = gone ? 0 : Math.round(mix(10, 1, Math.min(a.eaten, 0.78) / 0.78));
      const nuggets = Array.from({ length: count }, (_, i) => ({
        at: [mealAt[0] - 0.045 + (i % 4) * 0.03 + jitter(0.008), TOP + 0.03 + (i >= 4 ? 0.016 : 0) + (i >= 8 ? 0.014 : 0), mealAt[2] - 0.02 + Math.floor(i / 4) * 0.028 + jitter(0.01)] as V3,
        rot: [jitter(0.4), random() * 3, jitter(0.4)] as V3,
        size: [mix(0.8, 1.2, random()), 1, mix(0.8, 1.3, random())] as V3,
      }));
      s.root.add(instances(new THREE.CapsuleGeometry(0.011, 0.014, 3, 8).scale(1, 0.7, 1).rotateZ(Math.PI / 2), s.material('#d9a04a', { roughness: 0.85 }), nuggets));
      const sauceAt: V3 = [mealAt[0] + 0.09, TOP, mealAt[2] + 0.02];
      s.cylinder(0.018, 0.014, 0.022, [sauceAt[0], sauceAt[1] + 0.011, sauceAt[2]], s.material('#f4f0e6', { roughness: 0.6 }), 14);
      s.cylinder(0.016, 0.016, 0.003, [sauceAt[0], sauceAt[1] + 0.022, sauceAt[2]], s.material(pick(['#c8282c', '#a8651f', '#e5c33a']), { roughness: 0.3 }), 14);
      if (a.eaten > 0.4) crumbs(Math.round(mix(3, 12, a.eaten)), mealAt, 0.1);
    } else if (a.meal === 'wrap') {
      const w = new THREE.Group();
      w.position.set(mealAt[0] + 0.02, TOP + 0.03, mealAt[2]);
      w.rotation.y = 0.4 + jitter(0.3);
      s.root.add(w);
      const length = gone ? 0 : mix(0.17, 0.05, Math.min(a.eaten, 0.78) / 0.78);
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.17, 18).rotateZ(Math.PI / 2), paper);
      roll.castShadow = roll.receiveShadow = true;
      if (gone) roll.scale.set(0.6, 0.5, 0.7);
      w.add(roll);
      if (!gone) {
        const open = 0.17 - length;
        const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, open + 0.012, 16).rotateZ(Math.PI / 2), bun);
        inner.position.x = 0.085 - open / 2 + 0.006;
        inner.castShadow = true;
        w.add(inner);
        const filling = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, open + 0.014, 12).rotateZ(Math.PI / 2), patty);
        filling.position.x = inner.position.x;
        w.add(filling);
        const torn = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.08), paper);
        torn.position.set(0.1, 0.02, -0.03);
        torn.rotation.set(-0.6, 0.4, 0.3);
        w.add(torn);
      }
      if (a.eaten > 0.5) crumbs(Math.round(mix(4, 14, a.eaten)), mealAt, 0.14);
    } else {
      // A kids meal: a carry box with a handle and the toy that came in it.
      const boxAt: V3 = [mealAt[0] + 0.02, TOP, mealAt[2] - 0.01];
      s.box([0.13, 0.11, 0.085], [boxAt[0], TOP + 0.055, boxAt[2]], red);
      s.box([0.125, 0.03, 0.08], [boxAt[0], TOP + 0.125, boxAt[2]], red);
      const handle = s.ring(0.04, 0.006, [boxAt[0], TOP + 0.14, boxAt[2]], s.material(yellow), Math.PI);
      handle.rotation.y = 0;
      const faceArt = paint(128, 96, (ctx) => {
        ctx.fillStyle = yellow;
        ctx.fillRect(0, 0, 128, 96);
        ctx.fillStyle = '#1a1a1a';
        for (const x of [40, 88]) { ctx.beginPath(); ctx.arc(x, 36, 8, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(64, 44, 30, 0.3, Math.PI - 0.3);
        ctx.stroke();
      });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.08), new THREE.MeshStandardMaterial({ map: faceArt, roughness: 0.8 }));
      face.position.set(boxAt[0], TOP + 0.055, boxAt[2] + 0.0426);
      s.root.add(face);
      const toyAt: V3 = [mealAt[0] + 0.1 + jitter(0.02), TOP, mealAt[2] + 0.06];
      const toyPaint = s.material(pick(['#2fa3e8', '#e84a8a', '#7bd13a', '#f28a1c']), { roughness: 0.4 });
      s.box([0.03, 0.008, 0.03], [toyAt[0], TOP + 0.004, toyAt[2]], toyPaint);
      s.cylinder(0.009, 0.011, 0.035, [toyAt[0], TOP + 0.026, toyAt[2]], toyPaint, 10);
      s.ball([0.016, 0.016, 0.016], [toyAt[0], TOP + 0.056, toyAt[2]], toyPaint, 12);
      s.rod([toyAt[0] - 0.01, TOP + 0.04, toyAt[2]], [toyAt[0] - 0.028, TOP + 0.058, toyAt[2] + 0.005], 0.004, toyPaint);
      s.rod([toyAt[0] + 0.01, TOP + 0.04, toyAt[2]], [toyAt[0] + 0.026, TOP + 0.03, toyAt[2] + 0.008], 0.004, toyPaint);
      if (a.eaten > 0.3) crumbs(Math.round(mix(3, 10, a.eaten)), [mealAt[0], TOP, mealAt[2] + 0.08], 0.1);
      if (a.eaten > 0.5) {
        const wrapper = s.mesh(new THREE.IcosahedronGeometry(0.025, 1), paper, [mealAt[0] - 0.06, TOP + 0.016, mealAt[2] + 0.07]);
        wrapper.scale.set(1.3, 0.7, 1);
      }
    }

    // ---- the drink
    const drinkAt: V3 = [0.15, TOP, 0.09];
    const spilt = a.mishap === 'spill' && a.drink !== 'none';
    const cupPaint = s.material(a.drink === 'coffee' ? '#f3efe6' : pick(['#f3efe6', brand, '#e9e6de']), { roughness: 0.7 });
    const lidPaint = s.material(a.drink === 'shake' ? '#f0f0f0' : '#f6f6f3', { roughness: 0.5, transparent: a.drink === 'shake', opacity: a.drink === 'shake' ? 0.4 : 1, depthWrite: a.drink !== 'shake' });
    if (a.drink !== 'none') {
      const cup = new THREE.Group();
      const tall = a.drink === 'coffee' ? 0.11 : a.drink === 'shake' ? 0.12 : 0.15;
      const rTop = a.drink === 'coffee' ? 0.038 : 0.042, rBot = 0.03;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, tall, 24), cupPaint);
      body.position.y = tall / 2;
      body.castShadow = body.receiveShadow = true;
      cup.add(body);
      if (a.drink === 'coffee') {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(rTop - 0.001, rBot + 0.006, 0.045, 24), s.material('#9c7a52', { roughness: 0.95 }));
        sleeve.position.y = tall * 0.5;
        cup.add(sleeve);
      } else {
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(rTop - 0.004, rBot + 0.003, tall * 0.35, 24), red);
        stripe.position.y = tall * 0.5;
        cup.add(stripe);
      }
      if (!spilt) {
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(rTop + 0.004, rTop + 0.004, 0.008, 24), lidPaint);
        lid.position.y = tall + 0.004;
        lid.castShadow = true;
        cup.add(lid);
        if (a.drink === 'shake') {
          const dome = new THREE.Mesh(new THREE.SphereGeometry(rTop + 0.002, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), lidPaint);
          dome.position.y = tall + 0.008;
          cup.add(dome);
          const cream = new THREE.Mesh(new THREE.SphereGeometry(rTop * 0.8, 14, 8), s.material('#fbf7ee', { roughness: 0.9 }));
          cream.position.y = tall + 0.012;
          cream.scale.y = 0.7;
          cup.add(cream);
          const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), s.material('#b2122a', { roughness: 0.3 }));
          cherry.position.y = tall + 0.044;
          cup.add(cherry);
        }
        if (a.drink !== 'coffee') {
          const straw = new THREE.Mesh(new THREE.CylinderGeometry(a.drink === 'shake' ? 0.005 : 0.0035, a.drink === 'shake' ? 0.005 : 0.0035, 0.12, 8), s.material(pick(['#f4f4f4', '#d8262c', '#2b7bd6']), { roughness: 0.5 }));
          straw.position.set(0.012, tall + 0.04, 0.008);
          straw.rotation.set(0.25, 0, -0.2);
          straw.castShadow = true;
          cup.add(straw);
        } else {
          const sip = new THREE.Mesh(new THREE.CylinderGeometry(rTop * 0.6, rTop * 0.7, 0.008, 16), lidPaint);
          sip.position.y = tall + 0.012;
          cup.add(sip);
        }
        cup.position.set(...drinkAt);
        cup.rotation.y = random() * Math.PI;
      } else {
        // Knocked over: the cup on its side at the tray edge, lid skidded away, a puddle and ice.
        cup.rotation.z = Math.PI / 2 - 0.1;
        cup.position.set(drinkAt[0] - 0.02, TOP + rBot + 0.004, drinkAt[2] + 0.02);
        cup.rotation.y = -0.6 + jitter(0.4);
        const lid = s.cylinder(rTop + 0.004, rTop + 0.004, 0.006, [drinkAt[0] + 0.02, TOP + 0.003, drinkAt[2] - 0.08], lidPaint, 24);
        lid.rotation.z = 0.08;
        const cola = new THREE.Mesh(new THREE.CircleGeometry(0.085, 28), new THREE.MeshStandardMaterial({ color: a.drink === 'shake' ? '#f1dfc8' : a.drink === 'coffee' ? '#5a3718' : '#3a1b0e', roughness: 0.15, transparent: true, opacity: 0.75, depthWrite: false }));
        cola.rotation.x = -Math.PI / 2;
        cola.position.set(drinkAt[0] - 0.05, TOP + 0.0008, drinkAt[2]);
        cola.scale.set(1.3, 1, 0.9);
        s.root.add(cola);
        if (a.drink !== 'coffee') {
          const ice = Array.from({ length: 5 + Math.round(random() * 4) }, () => ({ at: [drinkAt[0] - 0.08 + jitter(0.16), TOP + 0.007, drinkAt[2] + jitter(0.14)] as V3, rot: [0, random() * 3, 0] as V3 }));
          s.root.add(instances(new THREE.BoxGeometry(0.014, 0.012, 0.012), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }), ice));
        }
      }
      s.root.add(cup);
    }

    // ---- small stuff: sauce packets, napkins, a receipt, ketchup, a fly
    const packets = Math.round(mix(1, 5, mood.density));
    const packetKinds = [['#c8282c', '#f4f0e6'], ['#a8651f', '#3a2410'], ['#e5c33a', '#2a2a2a'], ['#f4f0e6', '#2a7a3a']];
    for (let i = 0; i < packets; i++) {
      const [face, ink] = pick(packetKinds);
      const at: V3 = [-0.03 + jitter(0.18), TOP + 0.002 + i * 0.001, 0.11 + jitter(0.06)];
      const packet = s.box([0.034, 0.003, 0.024], at, s.material(face, { roughness: 0.4 }));
      packet.rotation.y = random() * Math.PI;
      const mark = s.box([0.02, 0.0012, 0.01], [at[0], at[1] + 0.002, at[2]], s.material(ink));
      mark.rotation.y = packet.rotation.y;
    }
    const napkins = Math.round(mix(1, 3, mood.density)) + (a.eaten > 0.5 ? 1 : 0);
    const napkinPaint = s.material('#f8f6f0', { roughness: 1, flatShading: true });
    for (let i = 0; i < napkins; i++) {
      const geometry = new THREE.IcosahedronGeometry(0.018, 1);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      for (let v = 0; v < pos.count; v++) pos.setXYZ(v, pos.getX(v) * mix(0.7, 1.3, random()), pos.getY(v) * mix(0.6, 1.1, random()), pos.getZ(v) * mix(0.7, 1.3, random()));
      geometry.computeVertexNormals();
      const napkin = s.mesh(geometry, napkinPaint, [-0.17 + jitter(0.08) + (i % 2) * 0.33, TOP + 0.014, -0.1 + jitter(0.06)]);
      napkin.rotation.set(random(), random() * 3, random());
    }
    if (a.receipt) {
      const receiptArt = paint(64, 160, (ctx) => {
        ctx.fillStyle = '#fbfaf5';
        ctx.fillRect(0, 0, 64, 160);
        ctx.fillStyle = '#444';
        for (let y = 14; y < 150; y += 9) ctx.fillRect(6, y, 20 + random() * 30, 3);
        ctx.fillRect(6, 150, 40, 5);
      });
      const receipt = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.1), new THREE.MeshStandardMaterial({ map: receiptArt, roughness: 0.9, side: THREE.DoubleSide }));
      receipt.position.set(-0.2, TOP + 0.045, 0.1);
      receipt.rotation.set(-0.35, 0.5, 0.15);
      receipt.castShadow = true;
      s.root.add(receipt);
    }
    if (a.mishap === 'ketchup') {
      const ketchup = s.material('#b8161c', { roughness: 0.25 });
      const heapAt: V3 = [0.02 + jitter(0.03), TOP, 0.1 + jitter(0.03)];
      for (let i = 0; i < 4; i++) {
        const blob = s.ball([0.018, 0.009, 0.016], [heapAt[0] + jitter(0.025), heapAt[1] + 0.005, heapAt[2] + jitter(0.02)], ketchup, 10);
        blob.scale.multiplyScalar(mix(0.7, 1.3, random()));
      }
      for (let i = 0; i < 5; i++) {
        const smear = s.cylinder(0.012, 0.012, 0.0012, [heapAt[0] + jitter(0.16), TOP + 0.0006, heapAt[2] + jitter(0.1)], ketchup, 12);
        smear.scale.set(mix(0.6, 2.5, random()), 1, mix(0.4, 1, random()));
        smear.rotation.y = random() * 3;
      }
    }
    let fly: THREE.Group | null = null;
    if (a.mishap === 'fly') {
      fly = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 8, 6), s.material('#1a1a1c', { roughness: 0.5 }));
      body.scale.set(1, 0.8, 1.4);
      body.castShadow = true;
      fly.add(body);
      const wing = new THREE.MeshStandardMaterial({ color: '#dddddd', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
      for (const side of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.006), wing);
        w.position.set(side * 0.008, 0.004, -0.001);
        w.rotation.set(-Math.PI / 2, 0, side * 0.5);
        fly.add(w);
      }
      fly.position.set(mealAt[0], 0.09, mealAt[2]);
      s.root.add(fly);
    }
    if (mood.wear > 0.45) for (let i = 0; i < 6; i++) {
      const scuff = s.box([mix(0.02, 0.06, random()), 0.0008, 0.004], [jitter(TW * 0.8), 0.0126, jitter(TD * 0.8)], s.material('#8a8a86'));
      scuff.rotation.y = random() * 3;
    }

    const speed = mix(0.6, 3, mood.energy);
    const base: V3 = [mealAt[0], 0.075, mealAt[2]];
    return s.finish({
      update(_dt, time) {
        if (!fly) return;
        const t = time * speed;
        fly.position.set(base[0] + Math.sin(t * 1.7) * 0.07 + Math.sin(t * 5.3) * 0.015, base[1] + Math.sin(t * 2.9) * 0.02, base[2] + Math.cos(t * 1.3) * 0.06);
        fly.rotation.y = Math.atan2(Math.cos(t * 1.7) * 0.12, -Math.sin(t * 1.3) * 0.08);
      },
    });
  },
});
