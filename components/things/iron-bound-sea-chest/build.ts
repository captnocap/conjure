import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    state: choice('How does the chest stand?', {
      locked: 'Shut tight, the hasp down and a padlock through it.',
      ajar: 'Unlocked, the lid lifted a hand\'s width.',
      open: 'Thrown wide open, its contents on show.',
      ransacked: 'Broken into: the lid wrenched back, the lock smashed, things dragged out onto the ground.',
    }),
    owner: choice('If it is open, whose life is inside?', {
      rower: 'A poor rower: a folded grey cloak, a bone comb, a wooden bowl and spoon, dice.',
      warrior: 'A warrior: a red cloak, silver arm rings, hacksilver, a sheathed knife, a drinking horn.',
      trader: 'A trader: folding scales and lead weights, coins, amber beads, a blue cloak.',
      smith: 'A craftsman: hammer, tongs, files and iron bars.',
      nobody: 'No one any more: it is empty but for dust.',
    }),
    form: choice('What shape is the chest?', {
      splayed: 'A true sea chest: sides sloping in toward a flat lid, broad at the foot so it will not slide.',
      barrel: 'Straight sides and a rounded barrel lid.',
      gabled: 'A lid ridged like a little house roof.',
      plain: 'A plain square box with a flat board lid.',
    }),
    ironwork: choice('How is it bound?', {
      bands: 'Three broad iron straps running over the lid and down the front, studded with rivets.',
      lattice: 'Straps over the lid and iron bands running right round the body.',
      corners: 'Only iron corner plates and a big lock plate.',
    }),
    wood: choice('What is the wood like?', {
      oak: 'Pale golden oak.',
      tarred: 'Dark with tar and years of sea.',
      red: 'Painted ox-blood red.',
      blue: 'Painted deep blue with a yellow edge.',
    }),
    beside: choice('What is on or beside it?', {
      nothing: 'Nothing.',
      oar: 'An oar, laid across it or leaning on it.',
      fleece: 'A sheepskin, to soften the bench.',
      shield: 'A round shield leaned against one end.',
      lamp: 'A small soapstone oil lamp, burning.',
    }),
    size: score('How big is it?', ['A small casket', 'A rower\'s bench chest', 'A great chest two men would carry']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const L = mix(0.55, 1.3, a.size), h = L * 0.44, d0 = L * 0.5, d1 = a.form === 'splayed' ? d0 * 0.7 : d0, t = 0.022 + L * 0.008, foot = L * 0.07;
    const opened = a.state === 'open' || a.state === 'ransacked';

    // Materials.
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = grainCanvas.height = 128;
    const gctx = grainCanvas.getContext('2d')!;
    gctx.fillStyle = '#ffffff'; gctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) { gctx.strokeStyle = `rgba(60,40,20,${0.05 + random() * 0.13})`; gctx.lineWidth = 0.6 + random() * 1.4; const y = random() * 128; gctx.beginPath(); gctx.moveTo(0, y); gctx.bezierCurveTo(40, y + (random() - 0.5) * 8, 90, y + (random() - 0.5) * 8, 128, y + (random() - 0.5) * 5); gctx.stroke(); }
    for (const y of [42, 86]) { gctx.strokeStyle = 'rgba(30,20,10,0.55)'; gctx.lineWidth = 1.6; gctx.beginPath(); gctx.moveTo(0, y); gctx.lineTo(128, y + 1); gctx.stroke(); }
    const grain = new THREE.CanvasTexture(grainCanvas);
    grain.colorSpace = THREE.SRGBColorSpace;
    const woodColour = new THREE.Color({ oak: '#b58a55', tarred: '#584232', red: '#94352b', blue: '#2f4f7d' }[a.wood]).lerp(new THREE.Color('#8b8275'), mood.wear * 0.3);
    const wood = new THREE.MeshStandardMaterial({ map: grain, color: woodColour, roughness: 0.75, side: THREE.DoubleSide });
    const inner = new THREE.MeshStandardMaterial({ map: grain, color: new THREE.Color('#9a7447').lerp(new THREE.Color('#5a4630'), 0.3), roughness: 0.85, side: THREE.DoubleSide });
    const trim = a.wood === 'blue' ? s.material('#d9b441') : wood;
    const iron = new THREE.MeshStandardMaterial({ color: new THREE.Color('#34363a').lerp(new THREE.Color('#7d4a2c'), mood.wear * 0.75), metalness: mix(0.6, 0.2, mood.wear), roughness: mix(0.45, 0.9, mood.wear) });
    const silver = s.material('#d5d8da', { metalness: 0.85, roughness: 0.28 });
    const bone = s.material('#e6dcc0');

    // Body: two end boards that run down into feet, sloping front and back, a floor.
    const body = new Sculpture(context);
    s.root.add(body.root);
    const endShape = new THREE.Shape([[-d0 / 2, 0], [d0 / 2, 0], [d1 / 2, h], [-d1 / 2, h]].map(([z, y]) => new THREE.Vector2(z, y)));
    const notch = new THREE.Path([[-d0 * 0.22, -0.001], [d0 * 0.22, -0.001], [d0 * 0.12, foot * 0.8], [-d0 * 0.12, foot * 0.8]].map(([z, y]) => new THREE.Vector2(z, y)));
    endShape.holes.push(notch);
    for (const side of [-1, 1]) {
      const board = body.mesh(new THREE.ExtrudeGeometry(endShape, { depth: t * 1.3, bevelEnabled: false }), wood, [side * (L / 2) - (side > 0 ? 0 : -t * 1.3), 0, 0]);
      board.rotation.y = -Math.PI / 2;
    }
    const slope = Math.atan2((d0 - d1) / 2, h - foot), panelLen = Math.hypot((d0 - d1) / 2, h - foot);
    const xs = a.ironwork === 'corners' ? [] : a.ironwork === 'bands' ? [-0.3 * L, 0, 0.3 * L] : [-0.26 * L, 0.26 * L];
    const strapW = 0.045 + L * 0.02;
    const rivets = (g: Sculpture, points: P3[]) => g.scatter(new THREE.SphereGeometry(1, 6, 5), iron, points.map((at) => ({ at, size: 0.009 + L * 0.004 })));
    const frontPanels: Sculpture[] = [];
    for (const side of [1, -1]) {
      const panel = new Sculpture(context);
      panel.box([L - t * 2.4, panelLen, t], [0, 0, 0], wood);
      if (side === 1) {
        const studs: P3[] = [];
        for (const x of xs) {
          panel.box([strapW, panelLen + 0.004, 0.008], [x, 0, t / 2 + 0.004], iron);
          for (let i = 0; i < 4; i++) studs.push([x, (i / 3 - 0.5) * panelLen * 0.8, t / 2 + 0.01]);
        }
        if (a.ironwork === 'lattice') for (const y of [-panelLen * 0.32, panelLen * 0.3]) {
          panel.box([L - t * 2.4, strapW * 0.8, 0.007], [0, y, t / 2 + 0.003], iron);
          for (let i = 0; i < 9; i++) studs.push([(i / 8 - 0.5) * L * 0.86, y, t / 2 + 0.009]);
        }
        if (a.ironwork === 'corners') for (const x of [-1, 1]) for (const y of [-1, 1]) {
          panel.box([L * 0.13, panelLen * 0.3, 0.008], [x * (L / 2 - t * 1.2 - L * 0.065), y * panelLen * 0.35, t / 2 + 0.004], iron);
          studs.push([x * (L / 2 - L * 0.1), y * panelLen * 0.4, t / 2 + 0.01], [x * (L / 2 - L * 0.1), y * panelLen * 0.26, t / 2 + 0.01]);
        }
        // Lock plate with a keyhole.
        const plate = L * 0.13;
        panel.box([plate, plate, 0.01], [0, panelLen * 0.5 - plate * 0.62, t / 2 + 0.008], iron);
        panel.box([plate * 0.12, plate * 0.34, 0.004], [0, panelLen * 0.5 - plate * 0.7, t / 2 + 0.014], s.material('#0f0f10'));
        for (const x of [-1, 1]) for (const y of [-1, 1]) studs.push([x * plate * 0.38, panelLen * 0.5 - plate * 0.62 + y * plate * 0.38, t / 2 + 0.015]);
        if (studs.length) rivets(panel, studs);
      }
      panel.root.position.set(0, foot + (h - foot) / 2, side * ((d0 + d1) / 4 - t / 2));
      panel.root.rotation.x = -side * slope;
      if (side === -1) panel.root.rotation.y = Math.PI, (panel.root.rotation.x = -slope);
      body.root.add(panel.root);
      frontPanels.push(panel);
    }
    body.box([L - t * 2.4, t, d0 - t * 2], [0, foot + t / 2, 0], inner);
    // Rope handles on the ends.
    for (const side of [-1, 1]) {
      const loop = body.ring(L * 0.075, 0.011 + L * 0.004, [side * (L / 2 + t * 0.4), h * 0.62, 0], s.material('#b9a47c'), Math.PI);
      loop.rotation.set(0, Math.PI / 2, Math.PI);
      loop.rotation.order = 'YXZ';
      loop.rotation.set(side * 0.9, Math.PI / 2, Math.PI);
    }

    // Lid, hinged along the back edge.
    const lid = new Sculpture(context);
    const dl = d1 + t * 1.6, Ll = L + t * 1.2;
    const lidGeometry = (length: number, grow: number) => {
      let geometry: THREE.BufferGeometry;
      if (a.form === 'barrel') {
        geometry = new THREE.CylinderGeometry(dl / 2 + grow, dl / 2 + grow, length, 18, 1, false, 0, Math.PI);
        geometry.rotateZ(Math.PI / 2);
        geometry.scale(1, 0.55, 1);
        geometry.translate(0, 0, dl / 2);
      } else if (a.form === 'gabled') {
        const half = dl / 2 + grow, peak = dl * 0.3 + grow;
        geometry = new THREE.ExtrudeGeometry(new THREE.Shape([[-half, -grow], [half, -grow], [half, t], [0, peak], [-half, t]].map(([z, y]) => new THREE.Vector2(z, y))), { depth: length, bevelEnabled: false });
        geometry.rotateY(Math.PI / 2);
        geometry.translate(-length / 2, 0, dl / 2);
      } else {
        geometry = new THREE.BoxGeometry(length, t * 1.3 + grow * 2, dl + grow * 2);
        geometry.translate(0, t * 0.65, dl / 2);
      }
      return geometry;
    };
    lid.mesh(lidGeometry(Ll, 0), wood);
    if (a.wood === 'blue' || a.wood === 'red') lid.box([Ll + 0.004, t * 0.7, 0.012], [0, t * 0.5, dl + 0.004], trim);
    const lidStraps = a.ironwork === 'corners' ? [-Ll / 2 + strapW * 0.6, Ll / 2 - strapW * 0.6] : xs;
    for (const x of lidStraps) lid.mesh(lidGeometry(strapW, 0.007), iron, [x, 0, 0]);
    // Hasp hanging from the front edge.
    const hasp = lid.box([strapW * 0.8, L * 0.12, 0.008], [0, -L * 0.05, dl + 0.012], iron);
    if (a.state === 'ransacked') hasp.rotation.set(0.9, 0, 0.5);
    if (a.state === 'locked') {
      lid.cylinder(L * 0.022, L * 0.022, L * 0.07, [0, -L * 0.1, dl + 0.03], iron, 10).rotation.z = Math.PI / 2;
      lid.ring(L * 0.02, 0.005, [0, -L * 0.085, dl + 0.028], iron, Math.PI).rotation.y = Math.PI / 2;
    }
    const lidAngle = { locked: 0, ajar: mix(0.18, 0.35, random()), open: mix(1.75, 2.0, random()), ransacked: mix(2.0, 2.25, random()) }[a.state];
    lid.root.position.set(0, h, -d1 / 2 - t * 0.8);
    lid.root.rotation.x = -lidAngle;
    if (a.state === 'ransacked') lid.root.rotation.z = (random() - 0.5) * 0.25;
    s.root.add(lid.root);
    const lidTop = h + (a.form === 'barrel' ? dl * 0.275 : a.form === 'gabled' ? dl * 0.3 : t * 1.3);

    // Contents.
    const fill = h - L * 0.09;
    const spill = a.state === 'ransacked';
    const inX = L / 2 - t * 3, inZ = d1 / 2 - t * 2.5;
    const groundZ = () => d0 / 2 + 0.1 + random() * L * 0.45;
    const spot = (u: number, out: boolean): P3 => out ? [(u - 0.5) * L * 1.3 + (random() - 0.5) * 0.1, 0.004, groundZ()] : [(u - 0.5) * 2 * inX * 0.85, fill + 0.035, (random() - 0.5) * inZ];
    const goesOut = () => spill && random() < 0.6;
    const group = (at: P3, turn = random() * 6.3) => { const g = new Sculpture(context); g.root.position.set(...at); g.root.rotation.y = turn; g.root.scale.setScalar(mix(1.3, 1.9, a.size)); s.root.add(g.root); return g; };
    const cloak = (colour: string, out: boolean) => {
      const cloth = s.material(colour, { roughness: 1, side: THREE.DoubleSide });
      if (out) {
        // Dragged half out over the front edge, trailing onto the ground.
        const path: P3[] = [[0, fill, -inZ * 0.4], [0, h + 0.02, d1 / 2 - 0.02], [0, h * 0.8, (d0 + d1) / 4 + 0.05], [0, 0.03, d0 / 2 + 0.1], [0.05, 0.02, d0 / 2 + L * 0.4]];
        const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
        const rows = 16, width = L * 0.45, geometry = new THREE.PlaneGeometry(width, 1, 6, rows), at = geometry.attributes.position;
        const x0 = (random() - 0.5) * L * 0.3;
        for (let i = 0; i < at.count; i++) {
          const v = 0.5 - at.getY(i), p = curve.getPoint(v), across = at.getX(i);
          at.setXYZ(i, x0 + across * (1 + v * 0.4) + p.x, p.y + Math.sin(across * 30 + v * 9) * 0.012 + 0.01, p.z + Math.sin(across * 22) * 0.02 * v);
        }
        geometry.computeVertexNormals();
        s.mesh(geometry, cloth);
      } else {
        for (let i = 0; i < 3; i++) s.ball([inX * (0.9 - i * 0.06), 0.03 + L * 0.012, inZ * (0.85 - i * 0.05)], [(random() - 0.5) * 0.02, fill - 0.03 + i * 0.022, (random() - 0.5) * 0.02], cloth, 14);
        s.box([inX * 1.5, 0.012, inZ * 0.3], [0, fill + 0.035, inZ * 0.35], s.material(new THREE.Color(colour).offsetHSL(0, -0.1, 0.12)));
      }
    };
    const comb = (at: P3) => {
      const g = group(at);
      g.box([0.13, 0.012, 0.022], [0, 0.008, 0], bone);
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 32;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e6dcc0';
      for (let i = 0; i < 16; i++) ctx.fillRect(i * 4, 0, 2.6, 32);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const teeth = g.mesh(new THREE.PlaneGeometry(0.12, 0.05), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide }), [0, 0.006, 0.03]);
      teeth.rotation.x = -Math.PI / 2;
    };
    const hacksilver = (at: P3, amount: number) => {
      const g = group(at);
      const bit = new THREE.BoxGeometry(1, 0.3, 0.55);
      g.scatter(bit, silver, Array.from({ length: Math.round(amount * 26) }, () => { const angle = random() * 6.3, r = Math.sqrt(random()) * 0.1; return { at: [Math.cos(angle) * r, 0.006 + (0.1 - r) * 0.25 * random(), Math.sin(angle) * r] as P3, size: 0.012 + random() * 0.016 }; }));
      for (let i = 0; i < Math.round(amount * 6); i++) g.cylinder(0.014, 0.014, 0.003, [(random() - 0.5) * 0.2, 0.004 + random() * 0.02, (random() - 0.5) * 0.2], silver, 10).rotation.set(random() * 0.6, 0, random() * 0.6);
    };
    const armRing = (at: P3) => { const g = group(at); const ring = g.ring(0.042, 0.008, [0, 0.01, 0], silver); ring.rotation.x = Math.PI / 2 + (random() - 0.5) * 0.5; };
    const knife = (at: P3) => { const g = group(at); g.box([0.19, 0.012, 0.032], [0.05, 0.008, 0], s.material('#5a3a26')); g.cylinder(0.011, 0.013, 0.1, [-0.095, 0.01, 0], bone, 8).rotation.z = Math.PI / 2; g.box([0.02, 0.016, 0.036], [-0.04, 0.009, 0], silver); };
    const horn = (at: P3) => {
      const g = group(at);
      let from = new THREE.Vector3(0, 0.035, 0);
      for (let i = 0; i < 7; i++) { const angle = i * 0.2, to = from.clone().add(new THREE.Vector3(Math.cos(angle) * 0.04, 0, Math.sin(angle) * 0.04)); g.rod(from.toArray() as P3, to.toArray() as P3, 0.034 - i * 0.004, i === 0 ? silver : s.material('#d8cdb0'), 0.034 - (i + 1) * 0.004); from = to; }
    };
    const bowl = (at: P3) => { const g = group(at); g.lathe([[0, 0], [0.04, 0], [0.075, 0.04], [0.07, 0.04], [0.035, 0.01], [0, 0.01]], s.material('#9c7f58', { side: THREE.DoubleSide })); g.rod([0.02, 0.03, 0.01], [0.13, 0.05, 0.05], 0.006, s.material('#b79a6d')); g.ball([0.018, 0.006, 0.013], [0.02, 0.028, 0.01], s.material('#b79a6d'), 8); };
    const dice = (at: P3) => { const g = group(at); for (let i = 0; i < 3; i++) g.box([0.02, 0.02, 0.02], [(random() - 0.5) * 0.09, 0.01, (random() - 0.5) * 0.09], bone).rotation.y = random() * 3; };
    const scales = (at: P3) => {
      const g = group(at);
      const bronze = s.material('#a8843c', { metalness: 0.6, roughness: 0.4 });
      g.rod([-0.11, 0.02, 0], [0.11, 0.02, 0], 0.005, bronze);
      for (const x of [-1, 1]) g.lathe([[0, 0], [0.03, 0.003], [0.045, 0.014], [0.042, 0.014], [0.028, 0.006], [0, 0.004]], bronze, [x * 0.1, 0.002, 0.03]);
      g.scatter(new THREE.BoxGeometry(1, 0.8, 1), s.material('#70757a', { metalness: 0.3 }), Array.from({ length: 5 }, (_u, i) => ({ at: [-0.08 + i * 0.04, 0.008, -0.05] as P3, size: 0.01 + i * 0.003 })));
    };
    const amber = (at: P3) => { const g = group(at); g.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#d9861c', { roughness: 0.25, emissive: '#7a3a05', emissiveIntensity: 0.4 }), Array.from({ length: 14 }, (_u, i) => ({ at: [Math.cos(i * 0.45) * (0.04 + i * 0.003), 0.008, Math.sin(i * 0.45) * (0.04 + i * 0.003)] as P3, size: 0.007 + random() * 0.005 }))); };
    const hammer = (at: P3) => { const g = group(at); g.rod([-0.12, 0.012, 0], [0.1, 0.012, 0], 0.011, s.material('#9c7f58')); g.box([0.04, 0.035, 0.09], [0.1, 0.018, 0], iron); };
    const tongs = (at: P3) => { const g = group(at); for (const side of [-1, 1]) { g.rod([-0.16, 0.008, side * 0.03], [0.06, 0.008, -side * 0.008], 0.006, iron); g.rod([0.06, 0.008, -side * 0.008], [0.12, 0.008, side * 0.012], 0.007, iron); } };
    const bars = (at: P3) => { const g = group(at); for (let i = 0; i < 4; i++) g.box([0.2 + random() * 0.06, 0.012, 0.022], [(random() - 0.5) * 0.03, 0.006 + i * 0.012, (i - 1.5) * 0.02], iron).rotation.y = (random() - 0.5) * 0.3; };

    if (opened || a.state === 'ajar') {
      // The dark inside of the box.
      s.box([L - t * 3, 0.004, d1 - t * 2.4], [0, a.owner === 'nobody' ? foot + t + 0.004 : fill - 0.06, 0], s.material('#3a2c1f'));
    }
    if (opened && a.owner !== 'nobody') {
      const plenty = mix(0.5, 1.3, mood.density);
      if (a.owner === 'smith') s.box([L - t * 3.2, 0.03, d1 - t * 3], [0, fill, 0], s.material('#6a5843'));
      else cloak({ rower: '#8a8478', warrior: '#9c2a22', trader: '#2f4f7d' }[a.owner], spill);
      const items: ((at: P3) => void)[] = {
        rower: [comb, bowl, dice, (at: P3) => hacksilver(at, 0.2 * plenty), horn],
        warrior: [comb, (at: P3) => hacksilver(at, 1 * plenty), armRing, armRing, knife, horn],
        trader: [scales, (at: P3) => hacksilver(at, 1.2 * plenty), amber, comb, armRing],
        smith: [hammer, tongs, bars, knife, comb],
      }[a.owner];
      items.forEach((make, i) => make(spot((i + 0.5) / items.length, goesOut())));
    }
    if (a.state === 'ransacked') {
      // Splinters by the lock.
      for (let i = 0; i < 5; i++) s.box([0.01, 0.004, 0.05 + random() * 0.06], [(random() - 0.5) * 0.25, 0.003, d0 / 2 + 0.03 + random() * 0.12], s.material('#c9b28a')).rotation.y = random() * 3;
    }

    // On or beside it.
    const shut = !opened;
    const side = random() < 0.5 ? -1 : 1;
    let flame: THREE.Mesh | null = null;
    if (a.beside === 'oar') {
      const ash = s.material('#b79a6d');
      const len = Math.max(2.2, L * 2.2);
      const from: P3 = shut ? [-len / 2, lidTop + 0.03, 0.02] : [side * (L / 2 + 0.12), 0, d0 / 2 + 0.3];
      const to: P3 = shut ? [len / 2, lidTop + 0.03, -0.03] : [side * (L / 2 + 0.03), h + 0.25, -d1 / 2 - 0.25];
      const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from)), end: P3 = shut ? to : [from[0] + (dir.x / dir.length()) * len, from[1] + (dir.y / dir.length()) * len, from[2] + (dir.z / dir.length()) * len];
      const neck: P3 = [mix(from[0], end[0], 0.74), mix(from[1], end[1], 0.74), mix(from[2], end[2], 0.74)];
      s.rod(from, neck, 0.022, ash);
      const blade = s.rod(neck, end, 0.06, ash, 0.045);
      blade.scale.z = 0.25;
    }
    if (a.beside === 'fleece') {
      const onLid = shut && (a.form === 'splayed' || a.form === 'plain');
      const fleece = s.ball(onLid ? [L * 0.36, 0.03, dl * 0.46] : [L * 0.4, 0.03, L * 0.28], onLid ? [0, lidTop + 0.012, 0] : [side * (L * 0.5 + L * 0.5), 0.012, 0.1], s.material('#e9e3d2', { roughness: 1 }), 14);
      fleece.rotation.y = onLid ? 0 : (random() - 0.5) * 0.6;
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#f2eddd', { roughness: 1 }), Array.from({ length: 70 }, () => { const angle = random() * 6.3, r = Math.sqrt(random()) * 0.9; return { at: [fleece.position.x + Math.cos(angle) * r * fleece.scale.x, fleece.position.y + 0.02 * (1 - r * r), fleece.position.z + Math.sin(angle) * r * fleece.scale.z] as P3, size: 0.02 + random() * 0.014 }; }));
    }
    if (a.beside === 'shield') {
      const g = new Sculpture(context);
      const r = Math.min(0.45, Math.max(0.3, h * 0.95));
      g.cylinder(r, r, 0.025, [0, 0, 0], s.material(pick(['#b3312a', '#2f5d8c', '#d9b441', '#4d7a45'])), 24).rotation.x = Math.PI / 2;
      g.cylinder(r * 0.5, r * 0.5, 0.027, [0, 0, 0], s.material('#e6dcc0'), 24).rotation.x = Math.PI / 2;
      g.ball([0.08, 0.08, 0.06], [0, 0, 0.02], iron, 10);
      g.ring(r, 0.012, [0, 0, 0], s.material('#4a3a2a'));
      g.root.rotation.order = 'YXZ';
      g.root.rotation.set(-0.3, side * Math.PI / 2, 0);
      g.root.position.set(side * (L / 2 + 0.16), r * 0.95, 0);
      s.root.add(g.root);
    }
    if (a.beside === 'lamp') {
      const at: P3 = shut && a.form !== 'gabled' && a.form !== 'barrel' ? [L * 0.25, lidTop, 0] : [side * (L / 2 + 0.2), 0, d0 / 2 + 0.05];
      s.lathe([[0, 0], [0.04, 0], [0.065, 0.035], [0.06, 0.045], [0.045, 0.02], [0, 0.015]], s.material('#7f8480', { side: THREE.DoubleSide }), at);
      s.cylinder(0.045, 0.045, 0.004, [at[0], at[1] + 0.036, at[2]], s.material('#c9a23a', { emissive: '#a86a10', emissiveIntensity: 0.5 }), 12);
      flame = s.mesh(new THREE.ConeGeometry(0.014, 0.06 * mix(0.8, 1.3, mood.energy), 7), new THREE.MeshStandardMaterial({ color: '#ffc24a', emissive: '#ff8a1e', emissiveIntensity: 1.2 }), [at[0] + 0.03, at[1] + 0.07, at[2]]);
      flame.castShadow = false;
    }

    return s.finish({ update: flame ? (_dt, time) => { flame!.scale.set(1 + Math.sin(time * 11) * 0.12, 1 + Math.sin(time * 8) * 0.2, 1); } : undefined });
  },
});
