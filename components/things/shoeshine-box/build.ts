import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const POLISH = { black: '#17171a', brown: '#5a3218', tan: '#b3752e', oxblood: '#6e1b22', white: '#efece2' } as const;
type Polish = keyof typeof POLISH;

export default defineThing({
  questions: {
    box: choice('What is the box like?', {
      plain: 'A plain nailed wooden box darkened by years of polish.',
      proud: 'Painted red and studded with brass tacks and little mirrors, a box somebody is proud of.',
      crate: 'Knocked together from a slatted fruit crate.',
      brass: 'Sheathed in beaten brass sheet with a shaped brass footrest, a showpiece.',
    }),
    polish: choice('Which polish tins are laid out?', {
      black: 'Only black: one big tin and a spare.',
      'black-brown': 'Black and brown, the two that pay.',
      range: 'A full range: black, brown, tan, oxblood and white.',
      empty: 'A few tins scraped down to bare metal, lids off.',
    }),
    tidy: score('How tidy is the layout?', ['Kicked over and scattered', 'Thrown down in a hurry', 'In working order', 'Squared up in perfect rows']),
    shoe: choice('Is there a shoe?', {
      none: 'No shoe: waiting for a customer.',
      finished: 'One finished shoe set to the side, mirror-bright, waiting for its owner.',
      working: 'One shoe up on the footrest mid-polish with the rag draped over it.',
      pair: 'A finished pair side by side, toes aligned.',
      worn: 'One split, down-at-heel shoe that no polish will save.',
    }),
    leather: choice('If there is a shoe, what kind?', {
      black: 'A black office oxford.',
      brown: 'A brown brogue.',
      tan: 'A tan loafer.',
      oxblood: 'An oxblood boot cut high at the ankle.',
    }),
    coins: choice('What is in the upturned tin lid?', {
      none: 'Nothing yet.',
      few: 'Three or four small coins.',
      heap: 'A good heap of coins and a folded note under a stone.',
    }),
    seat: choice('What does the shiner sit on?', {
      stool: 'A tiny low wooden stool.',
      tin: 'An upturned paint tin.',
      brick: 'Two bricks and a folded sack.',
      nothing: 'Nothing: he squats on his heels.',
    }),
    beside: choice('What else has been left beside the seat?', {
      nothing: 'Nothing.',
      sandals: 'A small pair of worn rubber sandals, a child\'s.',
      schoolbook: 'A school exercise book and a pencil stub.',
      tea: 'A glass of tea going cold.',
    }),
    restSurface: choice('What grips the shoe on the footrest?', { plain: 'Plain shaped wood or brass.', strips: 'Three narrow rubber grip strips.', studs: 'Two rows of small brass studs.', felt: 'A dark felt pad on the sole plate.' }),
    boxHinges: choice('What hinges are on the box lid?', { plain: 'No exposed hinges.', straps: 'Two long iron strap hinges.', brass: 'Two short bright brass hinges.', piano: 'A narrow continuous rear hinge.' }),
    carryingHandle: choice('What handle is fitted to the box side?', { none: 'Only the original shoulder strap.', leather: 'A curved leather side grip.', wire: 'A squared wire handle.', rope: 'A knotted rope loop.' }),
    brushRack: choice('Where are spare brushes stored?', { none: 'No separate brush rack.', rail: 'A small upright rack fixed to the box end.', tray: 'A shallow divided wooden tray.', pouch: 'A hanging leather tool pouch with brush handles.' }),
    waterPot: choice('What water container stands beside the kit?', { none: 'No extra water container.', tin: 'A little open galvanized tin.', bottle: 'A blue screw-cap bottle.', jug: 'A squat earthenware water jug.' }),
    laceKit: choice('What is laid out for minor shoe repairs?', { none: 'Polishing equipment only.', laces: 'Two coils of spare black laces.', nails: 'A small open tin of heel tacks.', repair: 'A rubber heel patch and a cobbler’s awl.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const mess = 1 - a.tidy;
    const stain = new THREE.Color('#2a1d14');
    const woodColour = new THREE.Color('#a57a4a').lerp(stain, 0.15 + mood.wear * 0.45);
    const wood = s.material(woodColour, { roughness: 0.8 });
    const darkWood = s.material(woodColour.clone().multiplyScalar(0.62), { roughness: 0.85 });
    const brass = s.material('#c9a23f', { metalness: 0.85, roughness: 0.28 });
    const tinMetal = s.material('#b9bcb8', { metalness: 0.8, roughness: 0.3 });
    const leatherStrap = s.material('#4a2f1d', { roughness: 0.7 });
    const turned = (mesh: THREE.Object3D, y: number) => { mesh.rotation.y = y; return mesh; };

    // ---- the mat -----------------------------------------------------------
    const matW = 0.88, matD = 0.54;
    const mat = s.box([matW, 0.008, matD], [0.1, 0.004, 0.36], s.material(mood.cheer > 0.55 ? '#b5523a' : '#8f8064', { roughness: 1 }));
    mat.rotation.y = rnd(-0.06, 0.06) * (1 + mess * 2);
    for (let i = 0; i < 1 + mood.wear * 7; i++) s.cylinder(rnd(0.012, 0.034), rnd(0.012, 0.034), 0.002, [0.1 + rnd(-0.4, 0.4), 0.0095, 0.36 + rnd(-0.23, 0.23)], s.material(pick(['#1f1a18', '#3b2416']), { roughness: 0.6 }), 10);

    // ---- the box -----------------------------------------------------------
    const bw = 0.44, bh = 0.25, bd = 0.27, bx = -0.08, bz = -0.12;
    const bodyMaterial = a.box === 'proud' ? s.material('#b3261f', { roughness: 0.5 }) : a.box === 'brass' ? brass : wood;
    if (a.box === 'crate') {
      for (let i = 0; i < 4; i++) for (const z of [-1, 1]) s.box([bw, 0.048, 0.012], [bx, 0.03 + i * 0.062, bz + z * (bd / 2 - 0.006)], wood);
      for (let i = 0; i < 4; i++) for (const x of [-1, 1]) s.box([0.012, 0.048, bd], [bx + x * (bw / 2 - 0.006), 0.03 + i * 0.062, bz], wood);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.03, bh, 0.03], [bx + x * (bw / 2 - 0.02), bh / 2, bz + z * (bd / 2 - 0.02)], darkWood);
      s.box([bw - 0.03, bh - 0.04, bd - 0.03], [bx, bh / 2 - 0.01, bz], s.material('#2a221c', { roughness: 1 }));
    } else {
      s.box([bw, bh, bd], [bx, bh / 2, bz], bodyMaterial);
      // A drawer, slightly open, and its knob.
      const open = mix(0.01, 0.07, mess);
      s.box([bw * 0.8, 0.075, 0.02], [bx, 0.07, bz + bd / 2 + open], a.box === 'plain' ? darkWood : bodyMaterial);
      s.box([bw * 0.76, 0.06, open], [bx, 0.068, bz + bd / 2 + open / 2], darkWood);
      s.ball([0.014, 0.014, 0.014], [bx, 0.07, bz + bd / 2 + open + 0.018], brass, 8);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.022, bh + 0.004, 0.022], [bx + x * bw / 2, (bh + 0.004) / 2, bz + z * bd / 2], a.box === 'plain' ? darkWood : brass);
    }
    s.box([bw + 0.02, 0.018, bd + 0.02], [bx, bh + 0.009, bz], a.box === 'brass' ? brass : darkWood);
    if (a.box === 'proud' || a.box === 'brass') {
      // Brass tacks in rows and a diamond of mirrors.
      const tacks: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 13; i++) for (const y of [0.13, 0.225]) tacks.push({ at: [bx - bw / 2 + 0.03 + i * (bw - 0.06) / 12, y, bz + bd / 2 + 0.002], size: 1 });
      for (let i = 0; i < 7; i++) for (const x of [-1, 1]) tacks.push({ at: [bx + x * (bw / 2 + 0.002), 0.03 + i * 0.032, bz + (i % 2 ? 0.06 : -0.06)], size: 1 });
      s.scatter(new THREE.SphereGeometry(0.008, 6, 4), a.box === 'brass' ? tinMetal : brass, tacks);
      const mirror = s.material('#e6f1f2', { metalness: 1, roughness: 0.05 });
      for (const x of [-0.13, 0, 0.13]) { const m = s.box([0.04, 0.04, 0.004], [bx + x, 0.178, bz + bd / 2 + 0.003], mirror); m.rotation.z = Math.PI / 4; }
    }
    // The footrest: a sole-shaped plate raked on a post.
    const sole = (length: number, width: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, -length / 2);
      shape.bezierCurveTo(width * 0.62, -length / 2, width * 0.5, -length * 0.12, width * 0.42, 0);
      shape.bezierCurveTo(width * 0.7, length * 0.2, width * 0.62, length / 2, 0, length / 2);
      shape.bezierCurveTo(-width * 0.62, length / 2, -width * 0.6, length * 0.2, -width * 0.4, 0);
      shape.bezierCurveTo(-width * 0.5, -length * 0.12, -width * 0.62, -length / 2, 0, -length / 2);
      return shape;
    };
    const restY = bh + 0.14, restX = bx + 0.02;
    s.box([0.05, 0.12, 0.07], [restX, bh + 0.075, bz + 0.02], a.box === 'brass' ? brass : darkWood);
    const restGeometry = new THREE.ExtrudeGeometry(sole(0.25, 0.095), { depth: 0.016, bevelEnabled: false });
    restGeometry.rotateX(-Math.PI / 2);
    const rest = s.mesh(restGeometry, a.box === 'plain' || a.box === 'crate' ? wood : brass, [restX, restY, bz + 0.02]);
    rest.rotation.x = 0.2; rest.name = 'shoeshine-footrest';
    s.box([0.07, 0.03, 0.012], [restX, restY + 0.005, bz - 0.095], darkWood).rotation.x = 0.2;
    // Shoulder strap slumped over the back.
    s.tube([[bx - bw / 2, bh * 0.8, bz], [bx - bw / 2 - 0.06, bh * 0.5, bz - 0.06], [bx - bw / 2 - 0.02, 0.012, bz - bd / 2 - 0.1], [bx, 0.012, bz - bd / 2 - 0.16], [bx + bw / 2 + 0.03, 0.012, bz - bd / 2 - 0.08], [bx + bw / 2 + 0.04, bh * 0.5, bz - 0.03], [bx + bw / 2, bh * 0.8, bz]], 0.012, leatherStrap);

    // ---- a shoe ------------------------------------------------------------
    const shoe = (at: [number, number, number], yaw: number, gleam: boolean, worn = false) => {
      const g = new THREE.Group();
      const colour = new THREE.Color(POLISH[a.leather as Polish]);
      if (worn) colour.lerp(new THREE.Color('#7d7468'), 0.55);
      const upper = new THREE.MeshStandardMaterial({ color: colour, roughness: gleam ? 0.12 : worn ? 0.95 : 0.5, metalness: gleam ? 0.25 : 0 });
      const soleMaterial = new THREE.MeshStandardMaterial({ color: '#2a2019', roughness: 0.8 });
      const soleGeometry = new THREE.ExtrudeGeometry(sole(0.28, 0.1), { depth: 0.014, bevelEnabled: false });
      soleGeometry.rotateX(-Math.PI / 2);
      const base = new THREE.Mesh(soleGeometry, soleMaterial);
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.022, 0.075), soleMaterial); heel.position.set(0, -0.011, 0.095);
      base.position.y = 0.022; heel.position.y = 0.011;
      const toe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), upper); toe.scale.set(0.047, 0.036, 0.075); toe.position.set(0.004, 0.058, -0.065);
      const vamp = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), upper); vamp.scale.set(0.044, 0.05, 0.085); vamp.position.set(0, 0.062, 0.02);
      const tall = a.leather === 'oxblood' ? 0.15 : 0.085;
      const quarter = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.043, tall, 16, 1, true), upper); quarter.position.set(0, 0.036 + tall / 2, 0.085);
      (quarter.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      const insideDark = new THREE.Mesh(new THREE.CircleGeometry(0.038, 14), new THREE.MeshStandardMaterial({ color: '#1a1512', roughness: 1 })); insideDark.rotation.x = -Math.PI / 2; insideDark.position.set(0, 0.03 + tall, 0.085);
      g.add(base, heel, toe, vamp, quarter, insideDark);
      if (a.leather !== 'tan') for (let i = 0; i < 3; i++) { const lace = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.006, 0.008), new THREE.MeshStandardMaterial({ color: worn ? '#8a8376' : '#1b1715' })); lace.position.set(0, 0.106 - i * 0.004, 0.02 - i * 0.026); g.add(lace); }
      if (worn) { toe.position.y += 0.012; toe.rotation.x = -0.25; const gap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.012, 0.05), new THREE.MeshStandardMaterial({ color: '#0e0c0b' })); gap.position.set(0, 0.04, -0.1); g.add(gap); }
      g.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      g.position.set(...at); g.rotation.y = yaw;
      s.root.add(g);
      return g;
    };
    const ragMaterial = s.material(mood.cheer > 0.5 ? '#e9c53a' : '#c9b98c', { roughness: 1 });
    if (a.shoe === 'working') {
      const g = shoe([restX, restY + 0.012, bz + 0.02], 0, false);
      rest.add(g); g.name = 'working-shoe';
      g.position.set(0, a.restSurface === 'strips' ? .021 : a.restSurface === 'studs' ? .024 : a.restSurface === 'felt' ? .019 : .016, 0);
      g.rotation.set(0, 0, 0);
      // The rag draped across the toe.
      s.tube([[restX - 0.09, restY + 0.03, bz - 0.03], [restX - 0.03, restY + 0.12, bz - 0.05], [restX + 0.04, restY + 0.115, bz - 0.04], [restX + 0.1, restY + 0.02, bz - 0.02], [restX + 0.13, bh + 0.03, bz + 0.02]], 0.018, ragMaterial);
    } else if (a.shoe === 'finished') shoe([0.47, 0.009, 0.14 + rnd(-0.03, 0.03)], rnd(-0.4, 0.2), true);
    else if (a.shoe === 'pair') { shoe([0.44, 0.009, 0.14], -0.08 * (1 + mess * 4), true); shoe([0.56, 0.009, 0.14 + mess * 0.06], 0.08 * (1 + mess * 3), true); }
    else if (a.shoe === 'worn') { const g = shoe([0.47, 0.009, 0.16], rnd(-0.8, 0.8), false, true); if (mess > 0.6) { g.rotation.z = Math.PI / 2; g.position.y = 0.06; } }

    // ---- tins --------------------------------------------------------------
    const colours: Polish[] = a.polish === 'black' ? ['black', 'black'] : a.polish === 'black-brown' ? ['black', 'brown', 'black'] : a.polish === 'range' ? ['black', 'brown', 'tan', 'oxblood', 'white'] : ['black', 'brown', 'black'];
    const tinR = 0.048, rowZ = 0.3;
    const lidLabel = (hex: string) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = hex; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = hex === '#efece2' ? '#b3261f' : '#e9c53a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(32, 32, 24, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.ellipse(32, 32, 13, 9, -0.4, 0, Math.PI * 2); ctx.fill();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.3 });
    };
    let spareLid: [number, number, number] | null = null;
    colours.forEach((name, i) => {
      const x = -0.3 + i * 0.105 + rnd(-0.1, 0.1) * mess, z = rowZ + rnd(-0.14, 0.2) * mess, hex = POLISH[name];
      const opened = a.polish === 'empty' || i === 0;
      s.cylinder(tinR, tinR, 0.022, [x, 0.019, z], tinMetal, 20);
      // Polish inside, dished where the brush has worked it; bare metal when scraped out.
      s.cylinder(tinR - 0.004, tinR - 0.004, 0.004, [x, 0.031, z], a.polish === 'empty' ? s.material('#8d908c', { metalness: 0.7, roughness: 0.4 }) : s.material(hex, { roughness: 0.25 }), 18);
      if (opened) {
        const lx = x + rnd(-0.02, 0.02) * (1 + mess * 4), lz = z + 0.1 + rnd(0, 0.06) * mess;
        const lid = s.cylinder(tinR + 0.002, tinR + 0.002, 0.01, [lx, 0.013, lz], tinMetal, 20);
        if (mess > 0.7 && i > 0) { lid.rotation.z = 1.2; lid.position.y = 0.04; }
        if (i === 0) spareLid = [lx, 0.013, lz];
        else { const label = s.mesh(new THREE.CircleGeometry(tinR - 0.003, 18), lidLabel(hex), [lx, 0.0185, lz]); label.rotation.x = -Math.PI / 2; label.visible = !(mess > 0.7); }
      } else {
        s.cylinder(tinR + 0.002, tinR + 0.002, 0.01, [x, 0.034, z], tinMetal, 20);
        const label = s.mesh(new THREE.CircleGeometry(tinR - 0.003, 18), lidLabel(hex), [x, 0.0395, z]); label.rotation.x = -Math.PI / 2; label.rotation.z = rnd(0, 6);
      }
    });

    // ---- the coin lid: the first tin's lid, upturned, nearest the customer --
    const cl: [number, number, number] = spareLid ?? [-0.3, 0.013, rowZ + 0.1];
    if (a.coins !== 'none') {
      const n = a.coins === 'few' ? 3 + Math.floor(random() * 2) : 11 + Math.floor(random() * 6);
      const coins: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < n; i++) { const t = random() * 6.28, r = random() * 0.024; coins.push({ at: [cl[0] + Math.cos(t) * r, 0.02 + i * 0.0022, cl[2] + Math.sin(t) * r], size: rnd(0.8, 1.2), color: random() < 0.35 ? '#c9a23f' : '#c9cdcd' }); }
      s.scatter(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 12), s.material('#ffffff', { metalness: 0.85, roughness: 0.3 }), coins);
      if (a.coins === 'heap') {
        s.box([0.065, 0.004, 0.035], [cl[0] + 0.085, 0.011, cl[2] + 0.01], s.material('#7a9a78', { roughness: 0.9 })).rotation.y = rnd(-0.5, 0.5);
        s.ball([0.02, 0.014, 0.017], [cl[0] + 0.085, 0.022, cl[2] + 0.01], s.material('#77726a', { roughness: 1 }), 8);
      }
    }

    // ---- brushes, bottle, rag ----------------------------------------------
    const brushCount = 2 + Math.round(mood.density * 2);
    for (let i = 0; i < brushCount; i++) {
      const g = new THREE.Group();
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.018, 0.16), wood); back.position.y = 0.033;
      const bristle = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.026, 0.14), new THREE.MeshStandardMaterial({ color: i % 2 ? '#1b1816' : '#6a4b2c', roughness: 1 })); bristle.position.y = 0.013;
      g.add(back, bristle); back.castShadow = bristle.castShadow = true;
      g.position.set(0.02 + i * 0.075 + rnd(-0.08, 0.08) * mess, 0.008, 0.52 + rnd(-0.2, 0.06) * mess);
      g.rotation.y = rnd(-1.5, 1.5) * mess;
      if (mess > 0.75 && i === 0) { g.rotation.z = Math.PI; g.position.y = 0.054; }
      s.root.add(g);
    }
    // Liquid polish bottle with a dauber and a dented water tin.
    const bottle = new THREE.Group(); bottle.name = 'polish-bottle-with-cap';
    bottle.add(s.cylinder(0.024, 0.026, 0.1, [0, 0.05, 0], s.material('#1c1b1d', { roughness: 0.25 }), 12));
    bottle.add(s.cylinder(0.012, 0.014, 0.03, [0, 0.115, 0], s.material('#c8281f'), 10));
    bottle.position.set(-0.36, 0.008, 0.5);s.root.add(bottle);
    if (mess > 0.8) { bottle.rotation.z = Math.PI / 2; bottle.position.x = -0.27; }
    bottle.updateMatrixWorld(true);bottle.position.y += .008 - new THREE.Box3().setFromObject(bottle, true).min.y;
    if (a.shoe !== 'working') {
      // The rag: folded square when tidy, a dropped twist when not.
      if (mess < 0.5) { s.box([0.14, 0.014, 0.1], [0.36, 0.015, 0.52], ragMaterial); s.box([0.13, 0.01, 0.09], [0.365, 0.027, 0.522], ragMaterial).rotation.y = 0.06; }
      else s.tube([[0.26, 0.02, 0.5], [0.32, 0.04, 0.56], [0.4, 0.02, 0.5], [0.43, 0.035, 0.58], [0.5, 0.02, 0.55]], 0.02, ragMaterial);
    }

    // ---- the seat and what is beside it ------------------------------------
    const seatBefore = new Set(s.root.children);
    const sx = -0.62, sz = 0.12;
    if (a.seat === 'stool') {
      const top = s.box([0.26, 0.025, 0.2], [sx, 0.19, sz], wood); turned(top, rnd(-0.2, 0.2));
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([sx + x * 0.1, 0.18, sz + z * 0.07], [sx + x * 0.125, 0, sz + z * 0.09], 0.014, darkWood);
      s.rod([sx - 0.11, 0.07, sz - 0.08], [sx + 0.11, 0.07, sz - 0.08], 0.008, darkWood);
    } else if (a.seat === 'tin') {
      s.cylinder(0.12, 0.13, 0.26, [sx, 0.13, sz], s.material(pick(['#3d7ab8', '#c9c2a8', '#b5523a']), { roughness: 0.5, metalness: 0.3 }), 18);
      s.ring(0.128, 0.006, [sx, 0.255, sz], tinMetal).rotation.x = Math.PI / 2;
      s.box([0.2, 0.012, 0.2], [sx, 0.266, sz], s.material('#8f8064', { roughness: 1 })).rotation.y = 0.3;
    } else if (a.seat === 'brick') {
      const brick = s.material('#a4553a', { roughness: 0.95 });
      s.box([0.22, 0.07, 0.105], [sx, 0.035, sz - 0.06], brick); s.box([0.22, 0.07, 0.105], [sx + 0.01, 0.035, sz + 0.06], brick).rotation.y = 0.05;
      s.box([0.26, 0.03, 0.24], [sx, 0.085, sz], s.material('#9a8a66', { roughness: 1 }));
    } else {
      s.box([0.3, 0.008, 0.26], [sx, 0.004, sz], s.material('#9a8a66', { roughness: 1 })).rotation.y = 0.2;
    }
    const seatGroup = new THREE.Group();seatGroup.name = 'shoeshiner-seat';
    for(const child of [...s.root.children])if(!seatBefore.has(child))seatGroup.add(child);
    s.root.add(seatGroup);seatGroup.updateMatrixWorld(true);seatGroup.position.y -= new THREE.Box3().setFromObject(seatGroup, true).min.y;
    const lx = sx + 0.02, lz = sz + 0.34;
    if (a.beside === 'sandals') {
      const rubber = s.material(pick(['#3a66b0', '#4a8a4c', '#8a3a3a']), { roughness: 0.9 });
      for (const d of [-1, 1]) {
        const geometry = new THREE.ExtrudeGeometry(sole(0.18, 0.07), { depth: 0.012, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2);
        const flop = s.mesh(geometry, rubber, [lx + d * 0.05, 0, lz + (d > 0 ? mess * 0.08 : 0)]);
        flop.rotation.y = d * 0.12 + rnd(-0.6, 0.6) * mess;
        const strap = s.ring(0.03, 0.005, [flop.position.x, 0.014, flop.position.z - 0.03], s.material('#f1eee4'), Math.PI);
        strap.rotation.y = flop.rotation.y;
      }
    } else if (a.beside === 'schoolbook') {
      const book = s.box([0.16, 0.012, 0.21], [lx, 0.006, lz], s.material('#8a5a36', { roughness: 0.9 })); book.rotation.y = rnd(-0.4, 0.4);
      s.label('CLASS V', 0.1, 0.045, [lx, 0.0125, lz], '#2a2a2a', '#f1ecd8').rotation.set(-Math.PI / 2, 0, book.rotation.y);
      s.rod([lx + 0.12, 0.006, lz - 0.05], [lx + 0.15, 0.006, lz + 0.03], 0.005, s.material('#e2b22e'));
    } else if (a.beside === 'tea') {
      const cup = s.cylinder(0.032, 0.024, 0.085, [lx, 0.0425, lz], new THREE.MeshStandardMaterial({ color: '#e9f4f2', transparent: true, opacity: 0.3, roughness: 0.08, depthWrite: false }), 12);
      cup.castShadow = false;
      s.cylinder(0.027, 0.022, 0.05, [lx, 0.027, lz], s.material('#a9703c', { roughness: 0.3 }), 12);
    }

    if(a.restSurface==='strips')for(const z of[-.065,0,.065]){const strip=s.box([.08,.004,.018],[0,.019,z],s.material('#33372f'));rest.add(strip);}
    else if(a.restSurface==='studs')for(const x of[-.025,.025])for(let i=0;i<5;i++)rest.add(s.ball([.004,.004,.004],[x,.02,-.09+i*.04],brass,6));
    else if(a.restSurface==='felt'){const pad=s.mesh(new THREE.ShapeGeometry(sole(.22,.08)),s.material('#46473c'));pad.rotation.x=-Math.PI/2;pad.position.y=.019;rest.add(pad);}
    if(a.boxHinges!=='plain'){
      const n=a.boxHinges==='piano'?1:2;for(let i=0;i<n;i++){const x=bx+(n===1?0:(i-.5)*.28),w=a.boxHinges==='piano'?bw*.9:a.boxHinges==='straps'?.045:.065,mat=a.boxHinges==='brass'?brass:tinMetal;s.box([w,.05,.01],[x,bh-.005,bz-bd/2-.008],mat);s.cylinder(.009,.009,w,[x,bh+.015,bz-bd/2-.01],mat,8).rotation.z=Math.PI/2;}
    }
    if(a.carryingHandle!=='none'){
      const x=bx-bw/2-.015,y=bh*.63;
      if(a.carryingHandle==='wire')s.tube([[x,y,bz-.07],[x-.045,y-.04,bz-.07],[x-.045,y-.04,bz+.07],[x,y,bz+.07]],.005,tinMetal);
      else{s.tube([[x,y,bz-.075],[x-.065,y-.06,bz],[x,y,bz+.075]],a.carryingHandle==='rope'?.008:.012,a.carryingHandle==='rope'?s.material('#b39b74'):leatherStrap);if(a.carryingHandle==='rope')for(const dz of[-.075,.075])s.ball([.012,.012,.012],[x,y,bz+dz],leatherStrap,6);}
    }
    if(a.brushRack!=='none'){
      const x=bx+bw/2+.04,z=bz;
      if(a.brushRack==='tray'){s.box([.16,.018,.26],[x+.05,.009,z],wood);for(const dz of[-.12,0,.12])s.box([.16,.06,.012],[x+.05,.03,z+dz],darkWood);}
      else if(a.brushRack==='rail'){s.box([.1,.045,.24],[x,bh*.55,z],wood);for(const dz of[-.08,.08])s.rod([bx+bw/2,bh*.3,z+dz],[x+.04,bh*.55,z+dz],.006,tinMetal);}
      else{s.box([.065,.17,.23],[x,.15,z],leatherStrap);for(const dz of[-.1,.1])s.rod([x,.225,z+dz],[bx+bw/2,bh,z+dz],.007,leatherStrap);}
      for(let i=0;i<3;i++){const y=a.brushRack==='tray'?.025:a.brushRack==='rail'?bh*.55+.025:.23;const h=a.brushRack==='tray'?.045:.11;s.box([.035,h,.05],[x+(a.brushRack==='tray'?.05:0),y+h/2,z-.08+i*.08],wood);s.box([.034,.025,.048],[x+(a.brushRack==='tray'?.05:0),y+h+.0125,z-.08+i*.08],s.material('#4b4032'));}
    }
    if(a.waterPot==='tin'){s.lathe([[0,0],[.065,0],[.075,.14]],tinMetal,[.77,0,.43]);s.ring(.074,.005,[.77,.14,.43],tinMetal).rotation.x=Math.PI/2;}
    else if(a.waterPot==='bottle'){s.cylinder(.045,.045,.18,[.77,.09,.43],s.material('#4d8195'),14);s.cylinder(.018,.04,.04,[.77,.2,.43],s.material('#4d8195'),12);s.cylinder(.021,.021,.024,[.77,.232,.43],s.material('#e2ddd0'),10);}
    else if(a.waterPot==='jug'){const clay=s.material('#ac7652');s.lathe([[.045,0],[.075,.025],[.085,.09],[.05,.15],[.033,.19]],clay,[.77,0,.43]);s.tube([[.83,.04,.43],[.9,.06,.43],[.9,.14,.43],[.82,.16,.43]],.012,clay);}
    if(a.laceKit!=='none'){
      const x=.75,z=-.15;s.box([.26,.012,.22],[x,.006,z],s.material('#b29d77'));
      if(a.laceKit==='laces')for(const dx of[-.065,.065])for(let i=0;i<4;i++)s.ring(.035-i*.005,.003,[x+dx,.015,z],s.material('#282b28')).rotation.x=Math.PI/2;
      else if(a.laceKit==='nails'){s.cylinder(.055,.055,.025,[x,.0245,z],tinMetal,16);for(let i=0;i<7;i++)s.rod([x-.04+i*.012,.04,z-.025],[x-.03+i*.01,.04,z+.03],.002,tinMetal);}
      else{s.box([.07,.009,.09],[x-.065,.0165,z],s.material('#282b28'));s.rod([x+.045,.023,z-.07],[x+.045,.023,z+.07],.003,tinMetal);s.ball([.013,.011,.035],[x+.045,.023,z+.04],wood,10);}
    }

    return s.finish();
  },
});
