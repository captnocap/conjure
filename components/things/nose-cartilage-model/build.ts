import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { bump, fuse, lerp, painted, placed, smooth, strut, sweep } from './form';

const SHAPES = {
  button: { proj: 0.58, tipY: 0.24, hump: -0.05, broad: 1.02, tip: 1.25, shear: 0.07, bend: 0, nasion: 0.07 },
  aquiline: { proj: 0.90, tipY: 0.17, hump: 0.085, broad: 0.9, tip: 0.92, shear: -0.06, bend: 0, nasion: 0.13 },
  broad: { proj: 0.66, tipY: 0.2, hump: -0.02, broad: 1.5, tip: 1.35, shear: 0, bend: 0, nasion: 0.05 },
  broken: { proj: 0.77, tipY: 0.18, hump: 0.075, broad: 1.12, tip: 1.1, shear: -0.02, bend: 0.11, nasion: 0.1 },
  hooked: { proj: 1.03, tipY: 0.12, hump: 0.12, broad: 0.92, tip: 0.85, shear: -0.24, bend: 0, nasion: 0.14 },
  upturned: { proj: 0.71, tipY: 0.22, hump: -0.075, broad: 0.95, tip: 1, shear: 0.16, bend: 0, nasion: 0.08 },
} as const;

export default defineThing({
  questions: {
    shape: choice('What shape is the nose?', {
      button: 'A small round button nose.',
      aquiline: 'Aquiline: a high Roman bridge with a slight curve.',
      broad: 'Broad and flat, with wide nostrils.',
      broken: 'Broken and badly reset: a bump on the bridge and a kink to one side.',
      hooked: 'Long and hooked, the tip drooping over the lip like a witch\'s.',
      upturned: 'Upturned, a ski-slope with the nostrils showing.',
    }),
    kind: choice('What kind of nose is it?', {
      lifelike: 'A real-looking nose in skin, as if lifted off a face.',
      anatomical: 'A teaching model on a stand: one side keeps its skin, the other is opened to show white bone, blue cartilage and red muscle.',
      plaster: 'A chalk-white plaster cast, the block art students draw from.',
      clown: 'A real nose wearing a shiny red clown ball on its elastic.',
    }),
    tone: choice('If it is flesh-coloured, what is the skin like?', {
      pale: 'Pale and pink.',
      olive: 'Warm olive tan.',
      brown: 'Mid brown.',
      deep: 'Deep dark brown.',
      dead: 'Waxy grey-green.',
    }),
    state: choice('What state is it in?', {
      clean: 'Clean and dry.',
      running: 'Running: a glistening drip hangs from a nostril.',
      bleeding: 'Bleeding from one nostril, a red line down over the lip.',
      sunburnt: 'Sunburnt scarlet and peeling in pale flakes.',
      frosty: 'Frost-nipped: the tip raw red going blue.',
    }),
    jewellery: choice('What is it wearing?', {
      none: 'Nothing.',
      stud: 'A small stud in one nostril.',
      septum: 'A horseshoe ring through the septum.',
    }),
    doing: choice('What is it doing?', {
      still: 'Nothing at all.',
      sniffing: 'Sniffing a flower, nostrils flared.',
      sneezing: 'Sneezing: bridge wrinkled, a burst of droplets flying out.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const S = SHAPES[a.shape];
    const flesh = a.kind !== 'plaster';
    const proj = S.proj * (1 + jitter(0.05)), broad = S.broad * (1 + jitter(0.05));
    const flare = a.doing === 'sniffing' ? 1.22 : a.doing === 'sneezing' ? 1.1 : 1;
    const scrunch = a.doing === 'sneezing' ? 1 : 0;
    const bendSide = random() < 0.5 ? -1 : 1;
    const tipY = S.tipY + scrunch * 0.03;
    const alaX = 0.27 * broad * flare, nostrilX = 0.135 * broad * flare;

    // ---- the form: a height above the plane of the face ------------------------------------------------------
    const soft = (values: readonly number[]) => { let sum = 0; for (const v of values) sum += Math.exp(v * 24); return Math.log(sum) / 24; };
    const noseHeight = (x: number, y: number) => {
      const xc = x - bendSide * S.bend * (bump(y, 0.62, 0.2) - 0.7 * bump(y, 0.32, 0.16));
      const t = Math.min(1, Math.max(0, (1 - y) / (1 - tipY)));
      const ridgeH = (S.nasion + (proj * 0.93 - S.nasion) * t ** 1.08 + S.hump * bump(y, 0.66, 0.19) + 0.03 * smooth(1, 1.3, y)) * smooth(tipY - 0.22, tipY - 0.02, y);
      const ridgeW = lerp(0.105, 0.16, t) * Math.sqrt(broad);
      const ax = Math.abs(xc);
      const ridge = ridgeH * (Math.exp(-((ax / ridgeW) ** 2)) + 0.4 * Math.exp(-((ax / (ridgeW * 2.3)) ** 2))) / 1.4;
      const tip = proj * Math.exp(-(((xc / (0.19 * S.tip)) ** 2) + (((y - tipY) / 0.19) ** 2)));
      const ala = proj * 0.62 * Math.exp(-((((ax - alaX) / (0.13 * Math.sqrt(broad))) ** 2) + (((y - tipY + 0.05) / 0.125) ** 2)));
      const col = lerp(0.07, proj * 0.84, smooth(-0.03, tipY - 0.02, y)) * Math.exp(-((xc / 0.062) ** 2)) * (1 - smooth(tipY, tipY + 0.1, y));
      let h = soft([ridge, tip, ala, col, 0]) - Math.log(5) / 24 * Math.exp(-(ridge + tip + ala + col) * 30);
      h *= smooth(-0.085, 0.07, y);
      const pit = Math.exp(-((((ax - nostrilX) / (0.07 * flare * Math.sqrt(broad))) ** 2) + (((y - 0.015) / 0.04) ** 2)));
      h -= 0.13 * pit;
      if (scrunch) h += 0.012 * Math.sin(y * 58) * bump(y, 0.84, 0.11) * Math.exp(-((ax / 0.17) ** 2));
      return { h, pit, xc };
    };
    const faceHeight = (x: number, y: number) => {
      const ax = Math.abs(x);
      let z = -0.3 * x * x;
      z -= 0.1 * Math.exp(-((((ax - 0.46) / 0.16) ** 2) + (((y - 1.0) / 0.17) ** 2)));
      z += 0.06 * smooth(1.0, 1.18, y) * Math.exp(-((x / 0.5) ** 2));
      z += 0.05 * Math.exp(-(((x / 0.4) ** 2) + (((y + 0.27) / 0.12) ** 2)));
      z -= 0.03 * Math.exp(-((x / 0.055) ** 2)) * smooth(-0.34, -0.24, y) * (1 - smooth(-0.1, 0, y));
      return z;
    };
    const point = (x: number, y: number, lift = 0, out = new THREE.Vector3()) => {
      const n = noseHeight(x, y);
      const yy = y + S.shear * smooth(0.1, 0.95, Math.max(0, n.h) / proj) + (a.doing === 'sniffing' ? 0.03 * smooth(0.2, 0.9, n.h / proj) : 0);
      return out.set(x, yy, faceHeight(x, y) + n.h + lift);
    };
    const Y0 = -0.32, Y1 = 1.18;
    const halfWidth = (y: number) => 0.62 * (1 - 0.45 * ((y - 0.3) / 1.0) ** 2);

    // ---- colour --------------------------------------------------------------------------------------------
    const skinBase = { pale: '#eec3a8', olive: '#cfa07a', brown: '#9c6a48', deep: '#6b4431', dead: '#a9ad94' }[a.tone];
    const skinDeep = { pale: '#c9695c', olive: '#a05c42', brown: '#683a27', deep: '#3a1f17', dead: '#5f6955' }[a.tone];
    const plasterTint = new THREE.Color('#f0ede3').lerp(new THREE.Color('#b9ae97'), mood.wear * 0.5);
    const base = flesh ? new THREE.Color(skinBase) : plasterTint.clone();
    const deep = flesh ? new THREE.Color(skinDeep) : plasterTint.clone().multiplyScalar(0.6);
    const dark = new THREE.Color(flesh ? '#1c0c0b' : '#5a5344');
    const burn = new THREE.Color('#d4513c'), flake = new THREE.Color('#f3d6c6'), nip = new THREE.Color('#c0314f'), blue = new THREE.Color('#5b5fa8');
    const bone = new THREE.Color('#f1ecd6'), upper = new THREE.Color('#bcd6ee'), alar = new THREE.Color('#2f6fc7'), muscle = new THREE.Color('#b8332f'), muscleDark = new THREE.Color('#7d1d1f');
    const grime = new THREE.Color('#5b5142');
    const flakes = Array.from({ length: 16 }, () => ({ x: jitter(0.3), y: 0.15 + random() * 0.8, r: 0.025 + random() * 0.04 }));
    const chips = Array.from({ length: Math.round(mood.wear * 9) }, () => ({ x: jitter(0.5), y: Y0 + random() * 1.4, r: 0.03 + random() * 0.05 }));
    const openSide = a.kind === 'anatomical' ? 1 : 0;

    // ---- the front sheet -----------------------------------------------------------------------------------
    const ys: number[] = [];
    for (let i = 0; i < 14; i++) ys.push(lerp(Y0, -0.14, i / 14));
    for (let i = 0; i < 74; i++) ys.push(lerp(-0.14, 0.42, i / 74));
    for (let i = 0; i <= 46; i++) ys.push(lerp(0.42, Y1, i / 46));
    const NY = ys.length - 1, NX = 84;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const c = new THREE.Color(), p = new THREE.Vector3();
    for (let i = 0; i <= NY; i++) {
      const y = ys[i], hw = halfWidth(y);
      for (let j = 0; j <= NX; j++) {
        const u = j / NX * 2 - 1, x = hw * Math.sign(u) * Math.abs(u) ** 1.25;
        const n = noseHeight(x, y), on = Math.min(1, Math.max(0, n.h / proj));
        const opened = openSide !== 0 && x * openSide > 0.012 && Math.abs(u) < 0.93 && y > Y0 + 0.05 && y < Y1 - 0.06;
        point(x, y, opened ? -0.014 : 0, p);
        positions.push(p.x, p.y, p.z);
        c.copy(base);
        if (flesh) c.lerp(deep, 0.2 * smooth(0.45, 1, on) + 0.16 * Math.exp(-((((Math.abs(x) - 0.5) / 0.16) ** 2) + (((y - 0.3) / 0.3) ** 2))));
        else c.lerp(deep, 0.25 * (1 - smooth(0, 0.12, on)) * bump(Math.abs(n.xc), alaX + 0.16, 0.08) * bump(y, tipY, 0.2));
        if (flesh && !opened) {
          if (a.state === 'sunburnt') {
            const w = Math.min(1, smooth(0.08, 0.4, on) + 0.5 * smooth(0.3, 0.7, Math.abs(x)) * smooth(0, 0.5, y));
            c.lerp(burn, w * 0.85);
            for (const f of flakes) c.lerp(flake, 0.9 * w * (1 - smooth(f.r * 0.7, f.r, Math.hypot(n.xc - f.x, y - f.y))));
          }
          if (a.state === 'frosty') c.lerp(nip, 0.85 * smooth(0.3, 0.75, on) * (1 - smooth(tipY + 0.3, tipY + 0.55, y))).lerp(blue, 0.55 * smooth(0.82, 1, on));
          if (a.state === 'running' || a.state === 'bleeding') c.lerp(deep, 0.35 * smooth(0.25, 0.7, on) * (1 - smooth(tipY + 0.1, tipY + 0.3, y)));
        }
        if (opened) {
          if (on > 0.07) {
            const area = y > 0.63 ? bone : y > 0.37 ? upper : alar;
            c.copy(area);
            c.lerp(dark, 0.55 * (bump(y, 0.63, 0.014) + bump(y, 0.37, 0.014)));
            if (y < 0.37) c.lerp(new THREE.Color('#1d4f9a'), 0.5 * bump(Math.abs(n.xc), alaX * 0.55, 0.03));
          } else {
            c.copy(muscle).lerp(muscleDark, 0.5 + 0.5 * Math.sin(x * 38 * openSide + y * 46));
            if (y < -0.05) c.copy(muscle).lerp(muscleDark, 0.5 + 0.5 * Math.sin(x * 60));
          }
          c.lerp(dark, 0.5 * (1 - smooth(0.012, 0.03, x * openSide)));
        }
        c.lerp(dark, Math.min(1, n.pit * 1.5) * 0.92);
        for (const chip of chips) c.lerp(flesh ? grime : new THREE.Color('#8f8672'), 0.6 * (1 - smooth(chip.r * 0.5, chip.r, Math.hypot(x - chip.x, y - chip.y))));
        c.lerp(grime, mood.wear * 0.18);
        colours.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < NY; i++)
      for (let j = 0; j < NX; j++) {
        const v00 = i * (NX + 1) + j, v01 = v00 + 1, v10 = v00 + NX + 1, v11 = v10 + 1;
        index.push(v00, v01, v11, v00, v11, v10);
      }
    const front = new THREE.BufferGeometry();
    front.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    front.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    front.setIndex(index);
    front.computeVertexNormals();

    const G = new THREE.Group();
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = G) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const rough = { lifelike: 0.5, anatomical: 0.34, plaster: 0.93, clown: 0.5 }[a.kind] + mood.wear * 0.12;
    add(front, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough }));

    // ---- the cut edge and the back ---------------------------------------------------------------------------
    const depth = a.kind === 'plaster' ? -0.36 : -0.2;
    const loop: THREE.Vector3[] = [];
    for (let i = 0; i <= NY; i++) loop.push(point(-halfWidth(ys[i]), ys[i]));
    for (let j = 1; j <= NX; j++) { const u = j / NX * 2 - 1; loop.push(point(halfWidth(Y1) * Math.sign(u) * Math.abs(u) ** 1.25, Y1)); }
    for (let i = NY - 1; i >= 0; i--) loop.push(point(halfWidth(ys[i]), ys[i]));
    for (let j = NX - 1; j >= 1; j--) { const u = j / NX * 2 - 1; loop.push(point(halfWidth(Y0) * Math.sign(u) * Math.abs(u) ** 1.25, Y0)); }
    const rim: number[] = [], rimIndex: number[] = [];
    for (const q of loop) rim.push(q.x, q.y, q.z, q.x, q.y, depth);
    rim.push(0, 0.4, depth);
    const centre = loop.length * 2;
    for (let k = 0; k < loop.length; k++) {
      const a0 = k * 2, b0 = ((k + 1) % loop.length) * 2;
      rimIndex.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1, centre, b0 + 1, a0 + 1);
    }
    const edge = new THREE.BufferGeometry();
    edge.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
    edge.setIndex(rimIndex);
    const edgeFlat = edge.toNonIndexed();
    edge.dispose();
    edgeFlat.computeVertexNormals();
    const raw = a.kind === 'plaster' ? plasterTint.clone().multiplyScalar(0.94) : a.kind === 'anatomical' ? new THREE.Color('#e9dcc0') : new THREE.Color(a.tone === 'dead' ? '#5a3a38' : '#7c2a2a');
    add(edgeFlat, new THREE.MeshStandardMaterial({ color: raw, roughness: flesh ? 0.55 : 0.95, side: THREE.DoubleSide }));

    // ---- what is on it and coming out of it ------------------------------------------------------------------
    const metal = new THREE.MeshStandardMaterial({ color: mood.warmth > 0.45 ? '#d8ab3c' : '#d2d6d9', metalness: 0.92, roughness: 0.2 });
    const side = random() < 0.5 ? -1 : 1;
    if (a.jewellery === 'stud') {
      const q = point(side * (alaX + 0.03), tipY - 0.01, 0.004);
      add(placed(new THREE.SphereGeometry(0.03, 12, 8), [q.x, q.y, q.z]), random() < 0.5 ? metal : new THREE.MeshStandardMaterial({ color: ['#e9eef2', '#c81e3a', '#2f6fd0', '#2fa36b'][Math.floor(random() * 4)], roughness: 0.06, metalness: 0.3 }));
    }
    if (a.jewellery === 'septum') {
      const q = point(0, 0.0, 0);
      const hoop = new THREE.TorusGeometry(0.1, 0.016, 8, 26, Math.PI * 1.55);
      hoop.rotateZ(Math.PI * 0.725);
      const cz = q.z * 0.5 + 0.1, cy = q.y - 0.055;
      add(fuse([placed(hoop, [0, cy, cz]), placed(new THREE.SphereGeometry(0.03, 10, 8), [-0.066, cy + 0.076, cz]), placed(new THREE.SphereGeometry(0.03, 10, 8), [0.066, cy + 0.076, cz])], metal).geometry, metal);
    }
    const moving: ((time: number) => void)[] = [];
    if ((a.state === 'running' || a.state === 'bleeding') && flesh) {
      const fluid = new THREE.MeshStandardMaterial(a.state === 'bleeding'
        ? { color: a.tone === 'dead' ? '#3d1014' : '#a3121a', roughness: 0.12 }
        : { color: '#cfe0a0', roughness: 0.05, emissive: '#5c6a2a', emissiveIntensity: 0.25 });
      const sides = a.state === 'running' && random() < 0.4 ? [-1, 1] : [side];
      for (const which of sides) {
        const end = a.state === 'bleeding' ? Y0 : -0.1 - random() * 0.18;
        const x0 = which * nostrilX, drift = which * (0.03 + random() * 0.05);
        const run: THREE.Vector3[] = [];
        for (let k = 0; k <= 10; k++) { const f = k / 10, y = lerp(0.0, end, f); run.push(point(x0 + drift * f + 0.012 * Math.sin(f * 9 + which), y, 0.006 + (k === 0 ? 0.03 : 0))); }
        add(sweep(run, (f) => [0.024 + 0.012 * Math.sin(f * 12), 0.012], { steps: 30, sides: 8, up: new THREE.Vector3(0, 0, 1) }), fluid);
        const last = run[run.length - 1];
        const bead = add(new THREE.SphereGeometry(0.034, 12, 8), fluid);
        bead.scale.y = 1.4;
        bead.position.set(last.x, last.y - 0.02, last.z + 0.012);
        const rate = mix(0.15, 0.9, mood.energy), phase = random();
        moving.push((time) => { const f = (time * rate + phase) % 1; bead.scale.setScalar(0.7 + 0.5 * f); bead.scale.y *= 1.4; });
      }
    }
    const tipPoint = point(0, tipY, 0);
    if (a.kind === 'clown') {
      const shine = new THREE.MeshStandardMaterial({ color: mood.cheer < 0.25 ? '#9a1620' : '#e3131f', roughness: 0.16 });
      const r = 0.27 * Math.max(0.9, S.tip * 0.92);
      add(placed(new THREE.SphereGeometry(r, 28, 20), [tipPoint.x, tipPoint.y + 0.02, tipPoint.z - r * 0.45]), shine);
      add(placed(new THREE.SphereGeometry(r * 0.2, 10, 8), [tipPoint.x - r * 0.4, tipPoint.y + 0.02 + r * 0.45, tipPoint.z - r * 0.45 + r * 0.72], [1, 0.8, 0.5]), new THREE.MeshStandardMaterial({ color: '#ffe9e6', roughness: 0.1 }));
      const elastic = new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.8 });
      const cz = tipPoint.z - r * 0.45, cy = tipPoint.y + 0.02;
      const cord: THREE.Vector3[] = [];
      for (let k = 0; k <= 24; k++) {
        const t = k / 24 * Math.PI * 2;
        cord.push(new THREE.Vector3(Math.sin(t) * 0.7, cy + 0.05 * Math.cos(t * 2) - 0.12 * (1 - Math.cos(t)) / 2, lerp(cz, depth - 0.12, (1 - Math.cos(t)) / 2)));
      }
      add(sweep(cord.slice(0, 24), () => [0.011, 0.011], { closed: true, steps: 70, sides: 5 }), elastic);
    }
    if (a.doing === 'sneezing') {
      const spray = new THREE.MeshStandardMaterial({ color: '#e8f2f0', roughness: 0.1 });
      const drops = new THREE.Group();
      const count = 46 + Math.floor(mood.energy * 40);
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), spray, count);
      const m = new THREE.Matrix4(), origin = point(0, 0.0, 0);
      for (let i = 0; i < count; i++) {
        const reach = 0.12 + random() ** 0.7 * 0.85, spread = reach * 0.42;
        const size = 0.008 + random() * 0.02;
        m.makeScale(size, size, size * (1 + random() * 2)).setPosition(jitter(1) * spread + (random() < 0.5 ? -1 : 1) * nostrilX, origin.y - 0.03 - reach * 0.5 + jitter(1) * spread * 0.5, origin.z * 0.6 + reach * 0.75);
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = true;
      drops.add(mesh);
      G.add(drops);
      const rate = mix(0.5, 2.2, mood.energy);
      moving.push((time) => { const f = (time * rate) % 1; drops.position.set(0, -0.06 * f, 0.1 * f); drops.scale.setScalar(0.85 + 0.3 * f); });
    }

    // ---- presentation ----------------------------------------------------------------------------------------
    const P = new THREE.Group();
    s.root.add(P);
    P.add(G);
    const unit = { lifelike: 0.052, clown: 0.052, plaster: 0.12, anatomical: 0.15 }[a.kind];
    P.scale.setScalar(unit);
    const wood = s.material(['#5a3a22', '#2a2623', '#7a5632'][Math.floor(random() * 3)], { roughness: 0.5 });
    if (a.kind === 'anatomical') {
      G.rotation.order = 'YXZ';
      G.rotation.set(-0.14, -0.3 + jitter(0.08), 0);
      G.position.y = 0.82;
      const steel = new THREE.MeshStandardMaterial({ color: '#b9bcbd', metalness: 0.8, roughness: 0.3 });
      add(strut([0, 0.08, -0.2], [0, 0.56, -0.2], 0.03, 0.03, 10), steel, P);
      const stand = new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.52, 0.03], [0.52, 0.07], [0.44, 0.1], [0.12, 0.13], [0.06, 0.2], [0, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
      add(placed(stand, [0, 0, -0.2]), wood, P);
      const plate = painted(256, 64, (ctx, w, h) => {
        ctx.fillStyle = '#c9a955'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#2b2415'; ctx.font = 'bold 36px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('NASUS', w / 2, h / 2 + 2);
      });
      add(placed(new THREE.CylinderGeometry(0.523, 0.523, 0.045, 24, 1, true, -0.28, 0.56), [0, 0.05, -0.2]), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.4, metalness: 0.4 }), P).castShadow = false;
      // numbered flags on pins, as on a teaching model
      const pin = new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.6 });
      const pins: THREE.BufferGeometry[] = [];
      for (const y of [0.82, 0.5, 0.22]) {
        const q = point(openSide * 0.09, y, 0);
        pins.push(strut([q.x, q.y, q.z], [q.x + openSide * 0.16, q.y + 0.05, q.z + 0.14], 0.006, 0.006, 4), placed(new THREE.SphereGeometry(0.03, 8, 6), [q.x + openSide * 0.16, q.y + 0.05, q.z + 0.14]));
      }
      add(fuse(pins, pin).geometry, pin);
    } else {
      G.rotation.order = 'YXZ';
      G.rotation.set(a.kind === 'plaster' ? -0.2 : -0.4 + jitter(0.05), -0.25 + jitter(0.14), 0);
      if (a.kind === 'plaster') {
        const tag = painted(256, 96, (ctx, w, h) => {
          ctx.fillStyle = '#e9e1c8'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#3a3128'; ctx.font = 'italic 54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`No. ${10 + Math.floor(random() * 80)}`, w / 2, h / 2 + 4);
        });
        const q = point(-0.3, -0.24, 0.004);
        const label = add(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshStandardMaterial({ map: tag, roughness: 0.9 }));
        label.position.copy(q);
        label.rotation.z = jitter(0.1);
      }
    }
    if (a.doing === 'sniffing') {
      // a flower held up to the nostrils on a long stem
      G.updateMatrixWorld(true);
      P.updateMatrixWorld(true);
      const under = G.localToWorld(point(0, -0.06, 0)).clone();
      P.worldToLocal(under);
      const low = new THREE.Box3().setFromObject(G);
      const floorY = low.min.y / unit;
      const head = new THREE.Vector3(under.x, under.y - 0.22, under.z + 0.3);
      const foot = new THREE.Vector3(0.12 + jitter(0.1), Math.min(floorY, head.y - 0.3), head.z + 0.42);
      const green = new THREE.MeshStandardMaterial({ color: '#4c8a3c', roughness: 0.6 });
      add(sweep([foot, new THREE.Vector3(foot.x * 0.7, lerp(foot.y, head.y, 0.5), foot.z - 0.1), new THREE.Vector3(head.x, head.y - 0.12, head.z + 0.06), head], () => [0.016, 0.016], { steps: 20, sides: 6 }), green, P);
      const petalColour = ['#f6f3ea', '#f0c21f', '#e25a8a', '#c93434'][Math.floor(random() * 4)];
      const petals: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 11; k++) {
        const t = k / 11 * Math.PI * 2;
        petals.push(placed(new THREE.SphereGeometry(1, 8, 6), [Math.cos(t) * 0.12, 0, Math.sin(t) * 0.12], [0.085, 0.014, 0.04], [0, -t, 0]));
      }
      const bloom = new THREE.Group();
      const petalMaterial = new THREE.MeshStandardMaterial({ color: petalColour, roughness: 0.6 });
      add(fuse(petals, petalMaterial).geometry, petalMaterial, bloom);
      add(placed(new THREE.SphereGeometry(1, 12, 8), [0, 0.01, 0], [0.065, 0.035, 0.065]), new THREE.MeshStandardMaterial({ color: petalColour === '#f0c21f' ? '#6b3d17' : '#eab308', roughness: 0.8 }), bloom);
      bloom.position.copy(head);
      bloom.rotation.x = -0.75;
      P.add(bloom);
      add(placed(new THREE.SphereGeometry(1, 8, 6), [lerp(foot.x, head.x, 0.4) + 0.07, lerp(foot.y, head.y, 0.45), lerp(foot.z, head.z, 0.4)], [0.09, 0.012, 0.04], [0, 0.5, 0.5]), green, P);
    }
    return s.finish(moving.length ? { update: (_dt, time) => { for (const move of moving) move(time); } } : {});
  },
});
