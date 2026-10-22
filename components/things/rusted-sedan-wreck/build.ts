import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];
const PAINTS = { red: '#a8392e', blue: '#3d5f8c', white: '#d9d8cf', gold: '#b59a62', green: '#49664d', yellow: '#d8a920' } as const;
const MESSAGES = { none: '', north: 'GONE NORTH', checked: 'X  EMPTY', sorry: 'SORRY', waited: 'WE WAITED' } as const;

export default defineThing({
  questions: {
    stopped: choice('How did the car come to stop here?', {
      queued: 'Stopped dead in a queue that never moved again, straight in its lane.',
      crashed: 'Crashed: the nose is crumpled, the bonnet folded up and the windscreen starred.',
      parked: 'Parked neatly and locked, as if the owner meant to come back.',
      burned: 'Burned out long ago: a bare orange-black shell with no glass and no tyres.',
    }),
    doors: choice('Which doors were left open?', {
      shut: 'None: every door is shut.',
      driver: 'Only the driver\'s door, swung wide.',
      all: 'All four doors flung open, everyone got out at once.',
      boot: 'The driver\'s door and the boot lid, someone grabbed what they could carry.',
    }),
    inside: choice('What is still inside or on it?', {
      luggage: 'Suitcases strapped to the roof and one spilled open on the road.',
      'child-seat': 'A child seat in the back doorway and a soft toy dropped beside it.',
      nothing: 'Nothing at all, stripped to the metal.',
      nest: 'A great stick nest on the roof with a long-legged bird standing in it.',
      garden: 'Soil and leaf mould: ferns and grass spill out of the windows.',
    }),
    growth: choice('What is growing through it?', {
      sapling: 'A sapling pushing up through the bonnet.',
      'roof-tree': 'A young birch that has gone straight up through the roof.',
      ivy: 'Ivy climbing over one whole side.',
      flowers: 'Wild flowers thick around the wheels and in the engine bay.',
      bare: 'Only moss and lichen.',
    }),
    body: choice('What shape of car is it?', {
      saloon: 'A three-box saloon with a boot.',
      estate: 'A long-roofed family estate.',
      hatchback: 'A small stubby hatchback.',
    }),
    paint: choice('What colour was it?', {
      red: 'Red.', blue: 'Mid blue.', white: 'White.', gold: 'Champagne gold.', green: 'Dark green.', yellow: 'Taxi yellow.',
    }),
    message: choice('Did someone paint a message on the side?', {
      none: 'No message.',
      north: 'GONE NORTH, for whoever came looking.',
      checked: 'A searcher\'s X and the word EMPTY.',
      sorry: 'SORRY.',
      waited: 'WE WAITED.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const burned = a.stopped === 'burned', crashed = a.stopped === 'crashed';
    const wear = burned ? 1 : Math.max(0.3, mood.wear) * (a.stopped === 'parked' ? 0.8 : 1);
    const paintColour = burned ? new THREE.Color('#6b3d24') : new THREE.Color(PAINTS[a.paint]).lerp(new THREE.Color('#b9a48c'), wear * 0.25);

    // Body paint with rust blooming from the edges.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${paintColour.getHexString()}`;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70 + wear * 26; i++) {
      const big = i >= 70;
      const x = random() * 256, y = random() * 256, r = big ? 22 + random() * 44 : 2 + random() * 4;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const tone = burned ? (random() < 0.4 ? '30,24,20' : '150,78,34') : random() < 0.5 ? '122,62,30' : '92,46,26';
      g.addColorStop(0, `rgba(${tone},${big ? 0.3 + wear * 0.35 : 0.6})`); g.addColorStop(1, `rgba(${tone},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(0.3, 0.3);
    const paint = new THREE.MeshStandardMaterial({ map: tex, roughness: mix(0.5, 0.95, wear), metalness: 0.2 });
    const glass = new THREE.MeshStandardMaterial({ color: burned ? '#0e0d0c' : new THREE.Color('#34474b').lerp(new THREE.Color('#7f8573'), wear * 0.55), roughness: burned ? 1 : 0.3, metalness: 0.2 });
    const hollow = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 1 });
    const rubber = s.material('#1a1a1b', { roughness: 0.95 });
    const trim = s.material(burned ? '#4a3324' : '#8e9190', { metalness: 0.6, roughness: 0.5 });
    const rustMat = s.material('#6e3f24', { roughness: 1 });
    const seatMat = s.material('#8a7359', { roughness: 0.95 });

    const rear = { saloon: 2.2, estate: 2.25, hatchback: 1.75 }[a.body];
    const front = crashed ? 1.82 : 2.2;
    const W = 1.7;
    const sit = burned ? -0.1 : 0; // no tyres: down on its rims
    const roofBack = { saloon: -0.85, estate: -1.8, hatchback: -1.15 }[a.body];
    const tailTop: [number, number] = a.body === 'saloon' ? [-1.45, 0.92] : a.body === 'estate' ? [-2.12, 0.95] : [-1.68, 0.95];
    const profile: [number, number][] = [
      [-rear + 0.06, 0.2], [-rear, 0.46], [-rear + 0.04, a.body === 'saloon' ? 0.84 : 0.9], tailTop, [1.05, 0.93],
      ...(crashed ? ([[1.45, 1.02], [1.7, 0.74], [front, 0.6]] as [number, number][]) : ([[2.02, 0.79], [front, 0.58]] as [number, number][])),
      [front - 0.04, 0.2],
    ];
    const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
    // Wheel arches bitten out of the sill.
    const axles = [1.36, -rear + 0.82];
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: W - 0.12, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
    bodyGeo.rotateY(-Math.PI / 2);
    bodyGeo.translate((W - 0.12) / 2, sit, 0);
    const car = new THREE.Group();
    s.root.add(car);
    const put = <T extends THREE.Object3D>(m: T, g: THREE.Object3D = car) => { g.add(m); return m; };
    put(s.mesh(bodyGeo, paint));
    const Y = (y: number) => y + sit;
    const gutted = burned || a.inside === 'garden';
    // The cabin: a narrower glasshouse under a painted roof, held up by pillars.
    const CW = W - 0.22;
    const cabGeo = new THREE.ExtrudeGeometry(new THREE.Shape([tailTop, [roofBack, 1.36], [0.35, 1.38], [1.05, 0.93]].map(([z, y]) => new THREE.Vector2(z, y))), { depth: CW, bevelEnabled: false });
    cabGeo.rotateY(-Math.PI / 2);
    cabGeo.translate(CW / 2, sit, 0);
    put(s.mesh(cabGeo, gutted ? hollow : glass));
    put(s.box([CW + 0.06, 0.05, 0.35 - roofBack + 0.12], [0, Y(1.385), (0.35 + roofBack) / 2], paint));
    for (const sx of [-1, 1]) {
      const px = sx * (CW / 2 + 0.005);
      put(s.rod([px, Y(0.93), 1.07], [px, Y(1.39), 0.36], 0.035, paint));
      put(s.rod([px, Y(tailTop[1]), tailTop[0] - 0.02], [px, Y(1.37), roofBack - 0.01], a.body === 'saloon' ? 0.06 : 0.04, paint));
      for (const z of [-0.15, ...(a.body === 'estate' ? [-1.15] : [])]) put(s.box([0.05, 0.44, 0.08], [px, Y(1.15), z], paint));
    }

    if (crashed) for (let i = 0; i < 7; i++) { const t = i * 0.9; put(s.rod([0.25, Y(1.19), 0.7], [0.25 + Math.cos(t) * 0.36, Y(1.19 + Math.sin(t) * 0.16), 0.7 - Math.sin(t) * 0.24], 0.006, s.material('#dfe7e6'))); }

    // Wheels: sagged on flats, or bare rims if it burned.
    axles.forEach((z) => [-1, 1].forEach((sx) => {
      put(s.cylinder(0.4, 0.4, 0.03, [sx * (W / 2 - 0.005), Y(0.36), z], hollow, 20)).rotation.z = Math.PI / 2;
      if (!burned) {
        const flat = 0.72 + random() * 0.2;
        const tyre = put(s.cylinder(0.31, 0.31, 0.2, [sx * (W / 2 - 0.1), 0.31 * flat, z], rubber, 20));
        tyre.rotation.z = Math.PI / 2; tyre.scale.x = flat; // local x is world y after the turn
        tyre.rotation.y = (random() - 0.5) * 0.1;
      }
      const missing = random() < wear * 0.4;
      put(s.cylinder(0.19, 0.19, 0.215, [sx * (W / 2 - 0.1), burned ? 0.2 : 0.26, z], missing || burned ? rustMat : trim, 14)).rotation.z = Math.PI / 2;
    }));

    // Lamps, grille, bumpers, plates, mirrors.
    const lampY = Y(crashed ? 0.6 : 0.66);
    if (!crashed) {
      put(s.box([W - 0.5, 0.14, 0.03], [0, lampY, front + 0.055], hollow));
      for (let i = 0; i < 5; i++) put(s.box([W - 0.55, 0.012, 0.035], [0, lampY - 0.05 + i * 0.026, front + 0.06], trim));
    }
    for (const sx of [-1, 1]) {
      if (!(crashed && sx < 0)) put(s.box([0.3, 0.15, 0.04], [sx * 0.64, lampY, front + 0.05 - (crashed ? 0.05 : 0)], s.material(burned ? '#2a2420' : '#d9dccf', { roughness: 0.25 })));
      put(s.box([0.34, 0.14, 0.04], [sx * 0.62, Y(0.72), -rear - 0.055], s.material(burned ? '#2a2420' : '#9c2a22', { roughness: 0.35 })));
      if (!burned) put(s.box([0.07, 0.1, 0.16], [sx * (W / 2 + 0.1), Y(0.98), 0.85], paint));
    }
    const fb = put(s.box([W + 0.04, 0.13, 0.12], [0, Y(0.36), front + 0.03], trim));
    if (crashed) { fb.rotation.z = 0.16; fb.rotation.y = 0.12; fb.position.y -= 0.08; }
    put(s.box([W + 0.04, 0.13, 0.12], [0, Y(0.38), -rear - 0.02], trim)).rotation.z = wear > 0.7 ? -0.05 : 0;
    if (!burned) put(s.label(`${String.fromCharCode(65 + Math.floor(random() * 26))}${Math.floor(100 + random() * 899)} ${['KLM', 'RTV', 'OAK', 'ELM'][Math.floor(random() * 4)]}`, 0.46, 0.11, [0, Y(0.37), front + 0.095], '#22262a', '#e3ddc4'));
    if (crashed) {
      // The bonnet has folded into a tent.
      const fold = put(s.box([W - 0.16, 0.03, 0.6], [0, Y(1.06), 1.5], paint));
      fold.rotation.x = 0.55;
    }

    // Doors.
    const openFront = a.doors !== 'shut', openAll = a.doors === 'all';
    const door = (sx: number, zHinge: number, len: number, open: number, back: boolean) => {
      const zc = zHinge - len / 2;
      if (open > 0) {
        put(s.box([0.03, 0.72, len - 0.06], [sx * (W / 2 + 0.006), Y(0.68), zc], hollow));
        put(s.box([0.03, 0.34, len - 0.2], [sx * (CW / 2 + 0.008), Y(1.14), zc - (back ? 0.03 : -0.1)], hollow));
        if (a.inside !== 'nothing' && !burned) {
          put(s.box([0.04, 0.12, len * 0.55], [sx * (W / 2 + 0.014), Y(0.56), zc - 0.05], seatMat));
          put(s.box([0.04, 0.5, 0.14], [sx * (W / 2 + 0.014), Y(0.82), zc - len * 0.3], seatMat)).rotation.x = -0.15;
        }
        if (!back) { const wheel = put(s.ring(0.15, 0.016, [sx * (W / 2 + 0.02), Y(0.93), zc + 0.22], hollow)); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = 0.3; }
      } else {
        // Shut-lines and a handle.
        put(s.box([0.012, 0.6, 0.012], [sx * (W / 2 + 0.003), Y(0.66), zHinge - len], hollow));
        put(s.box([0.02, 0.025, 0.11], [sx * (W / 2 + 0.008), Y(0.88), zHinge - len + 0.12], trim));
      }
      if (open <= 0) return;
      const g = new THREE.Group();
      g.position.set(sx * (W / 2 + 0.02), sit, zHinge);
      g.rotation.y = -sx * open;
      g.rotation.z = sx * wear * 0.05; // hinges sagging
      put(s.box([0.07, 0.66, len - 0.04], [0, 0.63, -len / 2], paint), g);
      put(s.box([0.03, 0.6, len - 0.1], [-sx * 0.04, 0.63, -len / 2], seatMat), g);
      put(s.box([0.04, 0.035, len - 0.04], [0, 1.3, -len / 2 - 0.05], paint), g);
      put(s.box([0.04, 0.36, 0.04], [0, 1.13, -len + 0.04], paint), g);
      const fr = put(s.box([0.04, 0.44, 0.04], [0, 1.12, -0.16], paint), g); fr.rotation.x = back ? 0 : 0.75;
      if (wear < 0.7 && !gutted) put(s.box([0.012, 0.3, len - 0.3], [0, 1.12, -len / 2 - 0.06], glass), g);
      car.add(g);
    };
    for (const sx of [-1, 1]) {
      const driver = sx > 0;
      door(sx, 0.95, 1.08, openAll ? 0.95 + random() * 0.3 : openFront && driver ? 1.15 + random() * 0.2 : 0, false);
      door(sx, -0.17, 0.95, openAll ? 0.7 + random() * 0.4 : a.inside === 'child-seat' && driver ? 0.9 : 0, true);
    }
    if (a.doors === 'boot') {
      const g = new THREE.Group();
      if (a.body === 'saloon') {
        g.position.set(0, Y(0.93), -1.45);
        put(s.box([W - 0.14, 0.04, 0.72], [0, 0, -0.36], paint), g);
        put(s.box([W - 0.24, 0.02, 0.6], [0, -0.05, -1.8 + 1.45], hollow));
        g.rotation.x = -1.0;
        put(s.box([W - 0.2, 0.03, 0.62], [0, Y(0.87), -1.8], hollow));
      } else {
        g.position.set(0, Y(1.37), roofBack);
        const len = Math.hypot(tailTop[0] - roofBack, 0.42) + 0.4;
        put(s.box([W - 0.14, 0.05, len], [0, 0, -len / 2], paint), g);
        put(s.box([W - 0.4, 0.03, len * 0.5], [0, -0.03, -len * 0.4], glass), g);
        g.rotation.x = -0.35;
        put(s.box([W - 0.2, 0.62, 0.03], [0, Y(0.82), -rear - 0.07], hollow));
      }
      car.add(g);
    }

    // Painted message along the passenger-side flank facing the viewer.
    if (a.message !== 'none' && !burned) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 128;
      const x2 = c.getContext('2d')!;
      x2.font = 'bold 76px sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle';
      x2.fillStyle = a.paint === 'white' || a.paint === 'yellow' || a.paint === 'gold' ? '#b3261e' : '#f2efe4';
      x2.translate(256, 66); x2.rotate(-0.04);
      x2.fillText(MESSAGES[a.message], 0, 0, 490);
      for (let i = 0; i < 5; i++) x2.fillRect(-200 + random() * 400, 30, 5, 10 + random() * 26);
      const t2 = new THREE.CanvasTexture(c); t2.colorSpace = THREE.SRGBColorSpace;
      const bonnetWrite = !crashed && a.growth !== 'sapling' && a.growth !== 'flowers';
      const plane = put(s.mesh(new THREE.PlaneGeometry(bonnetWrite ? 1.4 : 1.2, bonnetWrite ? 0.4 : 0.3), new THREE.MeshStandardMaterial({ map: t2, transparent: true, alphaTest: 0.3, roughness: 0.9, side: THREE.DoubleSide })));
      plane.castShadow = false;
      if (bonnetWrite) { plane.position.set(0, Y(0.94), 1.55); plane.rotation.x = -Math.PI / 2 + 0.144; }
      else { plane.position.set(W / 2 + 0.012, Y(0.64), -0.72); plane.rotation.y = Math.PI / 2; }
    }

    // Green things.
    const leaves: { at: P; size: number; color: string }[] = [];
    const greens = mood.warmth > 0.72 ? ['#8f9a3a', '#b8962e', '#6f8f3a', '#c97a2a'] : ['#4d7a34', '#5f8f3e', '#3f6a30', '#79a04a'];
    const clump = (at: P, r: number, n: number, size = 0.11) => { for (let i = 0; i < n; i++) { const u = random() * 6.28, v = Math.acos(2 * random() - 1), d = r * Math.cbrt(random()); leaves.push({ at: [at[0] + Math.sin(v) * Math.cos(u) * d, at[1] + Math.cos(v) * d * 0.8, at[2] + Math.sin(v) * Math.sin(u) * d], size: size * (0.6 + random() * 0.8), color: greens[Math.floor(random() * greens.length)] }); } };
    const bark = s.material('#5d4a38', { roughness: 1 });
    const birch = s.material('#d9d6c8', { roughness: 0.9 });
    const tree = (base: P, h: number, mat: THREE.Material, r: number) => {
      const bend = (random() - 0.5) * 0.3;
      const mid: P = [base[0] + bend, base[1] + h * 0.5, base[2] + (random() - 0.5) * 0.2], topP: P = [base[0] + bend * 0.4, base[1] + h, base[2] + (random() - 0.5) * 0.3];
      s.rod(base, mid, r, mat, r * 0.7); s.rod(mid, topP, r * 0.7, mat, r * 0.25);
      for (let i = 0; i < 5; i++) {
        const t = 0.35 + i * 0.13, from: P = [mix(base[0], topP[0], t) + bend * 0.3, base[1] + h * t, mix(base[2], topP[2], t)];
        const ang = i * 2.4 + random(), len = h * (0.34 - i * 0.03);
        const to: P = [from[0] + Math.cos(ang) * len, from[1] + len * 0.6, from[2] + Math.sin(ang) * len];
        s.rod(from, to, r * 0.35, mat, r * 0.12);
        clump(to, h * 0.17, 16, h * 0.05);
      }
      clump(topP, h * 0.2, 22, h * 0.05);
    };
    const mossy = burned ? 0.3 : wear;
    if (!burned || a.growth !== 'bare') {
      const mossGeo = new THREE.SphereGeometry(1, 8, 6); mossGeo.scale(1, 0.3, 1);
      const pads: { at: P; size: number; color: string }[] = [];
      const n = Math.round(10 + mossy * 34);
      for (let i = 0; i < n; i++) {
        const z = mix(roofBack + 0.1, 0.25, random()), onBoot = a.body === 'saloon' && random() < 0.3;
        pads.push({ at: onBoot ? [(random() - 0.5) * 1.3, Y(0.94), -1.5 - random() * 0.55] : [(random() - 0.5) * 1.4, Y(1.41), z], size: 0.07 + random() * 0.14, color: ['#56753a', '#6c8a3f', '#44602f', '#8c9a4a'][Math.floor(random() * 4)] });
      }
      s.scatter(mossGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), pads);
    }
    if (a.growth === 'sapling') {
      put(s.box([0.4, 0.03, 0.4], [0.15, Y(0.9), 1.5], hollow)).rotation.y = 0.4;
      const flap = put(s.box([0.3, 0.02, 0.3], [0.38, Y(0.98), 1.38], paint)); flap.rotation.z = 0.7;
      tree([0.15, Y(0.86), 1.5], 1.9 + random() * 0.8, bark, 0.055);
    } else if (a.growth === 'roof-tree') {
      put(s.box([0.5, 0.03, 0.5], [0, Y(1.42), -0.3], hollow)).rotation.y = 0.3;
      for (let i = 0; i < 4; i++) { const f = put(s.box([0.24, 0.02, 0.2], [Math.cos(i * 1.57 + 0.3) * 0.3, Y(1.5), -0.3 + Math.sin(i * 1.57 + 0.3) * 0.3], paint)); f.rotation.set(Math.sin(i * 1.57) * 0.7, 0.3, -Math.cos(i * 1.57) * 0.7); }
      tree([0, Y(1.3), -0.3], 2.6 + random(), birch, 0.07);
      for (let i = 0; i < 6; i++) s.box([0.1, 0.012, 0.03], [0.04 * Math.sin(i * 2), Y(1.5) + i * 0.2, -0.3 + 0.05 * Math.cos(i * 2)], hollow);
    } else if (a.growth === 'ivy') {
      const sx = -1;
      for (let i = 0; i < 9; i++) {
        const z = mix(-rear + 0.2, front - 0.3, i / 8) + (random() - 0.5) * 0.2, top = z > roofBack && z < 0.4 ? 1.42 : z > 1 ? 0.84 : 0.95;
        s.tube([[sx * (W / 2 + 0.04), 0, z + 0.1], [sx * (W / 2 + 0.03), Y(top * 0.55), z - 0.08], [sx * (W / 2 - 0.05), Y(top), z + 0.04], [sx * (W / 2 - 0.5 - random() * 0.5), Y(top) + 0.02, z]], 0.012, bark);
        clump([sx * (W / 2 + 0.05), Y(top * 0.5), z], 0.3, 26, 0.06); clump([sx * (W / 2 - 0.3), Y(top) + 0.04, z], 0.3, 20, 0.06);
      }
      for (let i = 0; i < 4; i++) clump([(random() - 0.5) * W, Y(1.44), mix(roofBack, 0.3, random())], 0.3, 14, 0.06);
    } else if (a.growth === 'flowers') {
      const petals = ['#f2d43a', '#e96aa8', '#f4f1e6', '#7c6fe0', '#ee7a2c'];
      const blooms: { at: P; size: number; color: string }[] = [];
      const stalks: { at: P; size: number; color: string }[] = [];
      const patch = (cx: number, cz: number, y0: number, n: number) => { for (let i = 0; i < n; i++) { const x = cx + (random() - 0.5) * 0.9, z = cz + (random() - 0.5) * 0.9, h = 0.2 + random() * 0.4; stalks.push({ at: [x, y0, z], size: h, color: greens[i % greens.length] }); blooms.push({ at: [x, y0 + h, z], size: 0.035 + random() * 0.03, color: petals[Math.floor(random() * petals.length)] }); } };
      for (const z of axles) for (const sx of [-1, 1]) patch(sx * (W / 2 + 0.2), z, 0, 16);
      patch(0, 1.5, Y(0.8), 26);
      put(s.box([1.0, 0.03, 0.7], [0, Y(0.86), 1.5], hollow));
      const stalkGeo = new THREE.CylinderGeometry(0.02, 0.03, 1, 4); stalkGeo.translate(0, 0.5, 0);
      s.scatter(stalkGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), stalks);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), blooms);
    }
    // Grass in the lee of the wheels whatever else grows.
    for (const z of axles) for (const sx of [-1, 1]) clump([sx * (W / 2 + 0.1), 0.06, z + (random() - 0.5) * 0.5], 0.22, Math.round(4 + mossy * 10), 0.05);

    // What they left.
    if (a.inside === 'luggage') {
      for (const z of [roofBack + 0.2, 0.2]) put(s.rod([-W / 2 + 0.1, Y(1.47), z], [W / 2 - 0.1, Y(1.47), z], 0.018, trim));
      const cases = ['#7b4a2e', '#2f4a5f', '#8a2f3a', '#4f5a3a', '#b08f4a'];
      let z = roofBack + 0.35;
      for (let i = 0; i < 3 && z < 0.1; i++) { const len = 0.5 + random() * 0.25; const b = put(s.box([0.7 + random() * 0.5, 0.2 + random() * 0.12, len], [(random() - 0.5) * 0.3, Y(1.6), z + len / 2 - 0.2], s.material(cases[Math.floor(random() * 5)]))); b.rotation.y = (random() - 0.5) * 0.25; b.position.y = Y(1.49) + 0.14; z += len + 0.04; }
      put(s.rod([-W / 2 + 0.1, Y(1.47), -0.3], [0, Y(1.8), -0.3], 0.008, s.material('#d9c27a')));
      put(s.rod([W / 2 - 0.1, Y(1.47), -0.3], [0, Y(1.8), -0.3], 0.008, s.material('#d9c27a')));
      const gx = W / 2 + 0.9, gz = -0.5;
      s.box([0.7, 0.1, 0.48], [gx, 0.05, gz], s.material(cases[0])).rotation.y = 0.5;
      const lid = s.box([0.7, 0.04, 0.48], [gx - 0.24, 0.24, gz - 0.42], s.material(cases[0])); lid.rotation.set(1.0, 0.5, 0);
      for (let i = 0; i < 5; i++) s.ball([0.14 + random() * 0.1, 0.04, 0.1 + random() * 0.08], [gx + (random() - 0.3) * 0.5, 0.12, gz + (random() - 0.2) * 0.6], s.material(['#d9d2c0', '#b84a3a', '#3f5f8a', '#e3b84a'][i % 4]), 8);
    } else if (a.inside === 'child-seat') {
      const zc = -0.17 - 0.48, x = W / 2 + 0.1;
      const shell = s.material('#3a3f4a'), pad = s.material(mood.cheer > 0.5 ? '#e9a03a' : '#b84a4a', { roughness: 0.95 });
      put(s.box([0.3, 0.14, 0.4], [x, Y(0.62), zc], shell)); put(s.box([0.3, 0.5, 0.12], [x, Y(0.9), zc - 0.2], shell)).rotation.x = -0.2;
      put(s.box([0.24, 0.05, 0.3], [x + 0.01, Y(0.7), zc + 0.02], pad)); put(s.box([0.22, 0.36, 0.05], [x + 0.01, Y(0.92), zc - 0.13], pad)).rotation.x = -0.2;
      for (const dz of [-0.12, 0.12]) put(s.box([0.32, 0.26, 0.04], [x, Y(0.82), zc + dz - 0.06], shell));
      // The dropped toy: a small bear on its back.
      const bear = s.material('#b98a54', { roughness: 1 });
      const bx = W / 2 + 0.75, bz = -0.2;
      s.ball([0.09, 0.07, 0.11], [bx, 0.07, bz], bear, 10); s.ball([0.07, 0.07, 0.07], [bx, 0.09, bz + 0.15], bear, 10);
      for (const dx of [-1, 1]) { s.ball([0.03, 0.03, 0.03], [bx + dx * 0.055, 0.14, bz + 0.18], bear, 8); s.ball([0.035, 0.03, 0.07], [bx + dx * 0.11, 0.05, bz + 0.03], bear, 8); s.ball([0.04, 0.035, 0.07], [bx + dx * 0.07, 0.05, bz - 0.13], bear, 8); }
    } else if (a.inside === 'nest') {
      const twig = s.material('#6a5238', { roughness: 1 });
      const ny = Y(1.42), nz = (roofBack + 0.35) / 2;
      const twigs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4), twig, 150);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 150; i++) { const t = random() * 6.28, r = 0.2 + random() * 0.42, h = random() * 0.26 * (r / 0.6 + 0.4); e.set(Math.PI / 2 + (random() - 0.5) * 0.5, t + Math.PI / 2 + (random() - 0.5) * 0.9, 0, 'YXZ'); m.compose(new THREE.Vector3(Math.cos(t) * r, ny + 0.03 + h, nz + Math.sin(t) * r), q.setFromEuler(e), new THREE.Vector3(1, 0.4 + random() * 0.5, 1)); twigs.setMatrixAt(i, m); }
      twigs.castShadow = true; car.add(twigs);
      put(s.cylinder(0.5, 0.56, 0.14, [0, ny + 0.07, nz], twig, 14));
      const white = s.material('#eeeae0', { roughness: 0.8 }), dark = s.material('#1f1f22'), red = s.material('#d8482a', { roughness: 0.5 });
      const bx = 0.05, bz = nz;
      for (const dx of [-0.04, 0.04]) put(s.rod([bx + dx, ny + 0.2, bz], [bx + dx, ny + 0.68, bz], 0.012, red));
      put(s.ball([0.13, 0.15, 0.24], [bx, ny + 0.82, bz - 0.02], white, 12)).rotation.x = -0.35;
      put(s.ball([0.1, 0.06, 0.16], [bx, ny + 0.78, bz - 0.2], dark, 10));
      put(s.rod([bx, ny + 0.9, bz + 0.14], [bx, ny + 1.22, bz + 0.22], 0.04, white, 0.03));
      put(s.ball([0.05, 0.05, 0.06], [bx, ny + 1.24, bz + 0.23], white, 10));
      put(s.rod([bx, ny + 1.24, bz + 0.27], [bx, ny + 1.14, bz + 0.52], 0.018, red, 0.004));
    } else if (a.inside === 'garden') {
      for (const sx of [-1, 1]) for (const z of [0.45, -0.6]) {
        if (z < roofBack + 0.2) continue;
        for (let i = 0; i < 6; i++) { const ang = (i / 5 - 0.5) * 2.2; const tip: P = [sx * (W / 2 + 0.35 + random() * 0.3), Y(1.0 + Math.cos(ang) * 0.35), z + Math.sin(ang) * 0.5]; s.rod([sx * (W / 2 - 0.1), Y(1.0), z], tip, 0.012, s.material('#4d7a34'), 0.004); clump([mix(sx * W / 2, tip[0], 0.6), mix(Y(1.05), tip[1], 0.6), mix(z, tip[2], 0.6)], 0.14, 8, 0.05); }
        clump([sx * (W / 2 + 0.05), Y(1.02), z], 0.25, 18, 0.06);
      }
      clump([0, Y(1.15), 0.72], 0.4, 26, 0.07);
    }

    const leafGeo = new THREE.IcosahedronGeometry(1, 0);
    const foliage = leaves.length ? s.scatter(leafGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), leaves) : null;

    car.rotation.y = a.stopped === 'queued' ? (random() - 0.5) * 0.06 : 0;
    if (crashed) car.rotation.z = 0.03;
    const sway = mix(0.002, 0.012, mood.energy);
    return s.finish({ footprint: 2.4, update: (_dt, time) => { if (foliage) foliage.rotation.z = Math.sin(time * 1.1) * sway; } });
  },
});
