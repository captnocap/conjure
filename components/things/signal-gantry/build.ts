import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Block, type P3, blocks, canvasTexture, figure, snowOf, track } from './rail';

type Aspect = 'stop' | 'clear' | 'caution' | 'dark';

export default defineThing({
  questions: {
    signals: choice('What kind of signals does it carry, and from what era?', {
      lower: 'Victorian lower-quadrant semaphores: red arms with a white stripe that drop to clear.',
      upper: 'Upper-quadrant semaphores with pointed blades that rise to clear, steam-age main line.',
      colour: 'Three-aspect colour-light heads with long hoods, mid-century onward.',
      searchlight: 'Searchlight signals: one bright lens in a round black target.',
      position: 'Position-light signals: rows of amber lamps on big round discs.',
    }),
    aspects: choice('What are the signals showing?', {
      allred: 'Every road at danger: all red, nothing moves.',
      onegreen: 'One road cleared and green, every other held at red.',
      caution: 'Cautions: yellows across the board, proceed expecting to stop.',
      mixed: 'A busy mixture of reds, yellows and greens.',
      dark: 'Dark: lamps out, arms drooping, the line is closed or dead.',
    }),
    tracks: choice('How many tracks does it span?', {
      two: 'Two tracks, a modest double line.',
      three: 'Three tracks.',
      four: 'Four tracks, a broad main-line throat.',
    }),
    span: choice('How is the bridge built?', {
      lattice: 'Riveted lattice girder on two lattice towers, black and intricate.',
      plate: 'A plain plate girder on H-section legs, painted grey-green.',
      cantilever: 'A cantilever: one tall mast at the side with the arm reaching out on stay rods.',
    }),
    crew: choice('Is anyone up there?', {
      nobody: 'Nobody.',
      lampman: 'A lampman on the walkway reaching up to a signal.',
      climbing: 'Someone is halfway up the ladder.',
      pair: 'Two men on the walkway, one working, one watching the line.',
    }),
    perched: choice('What else is on it?', {
      nothing: 'Nothing.',
      crows: 'A row of crows along the rail.',
      banner: 'A painted banner tied across the girder.',
      nest: 'A big untidy nest built on top of one tower.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const n = { two: 2, three: 3, four: 4 }[a.tracks];
    const spacing = 4.2;
    const Wd = n * spacing + 2.2;
    const H = 6.3, depth = a.span === 'plate' ? 0.9 : 1.2, top = H + depth, gw = 0.9;
    const xs = Array.from({ length: n }, (_unused, i) => (i - (n - 1) / 2) * spacing);
    for (const x of xs) track(s, { length: 5, at: [x, 0, 0], yaw: Math.PI / 2 });

    const steelColour = new THREE.Color(a.span === 'plate' ? '#75857c' : '#34373a').lerp(new THREE.Color('#70452c'), mood.wear * 0.55);
    const steel = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0.3 });
    const black = s.material('#1a1b1d', { roughness: 0.7 });
    const members: Block[] = [];
    const strut = (from: P3, to: P3, thick: number, color: THREE.ColorRepresentation = steelColour) => {
      const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to);
      const d = vb.clone().sub(va);
      const len = d.length();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()));
      const mid = va.add(vb).multiplyScalar(0.5);
      members.push({ size: [len, thick, thick], at: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z], color });
    };
    const latticeLeg = (x: number, height: number, w: number) => {
      const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [cx, cz] of corners) strut([x + cx * w / 2, 0, cz * w / 2], [x + cx * w / 2, height, cz * w / 2], 0.1);
      const panels = Math.round(height / 1.15);
      for (let k = 0; k < panels; k++) {
        const y0 = (k / panels) * height, y1 = ((k + 1) / panels) * height;
        corners.forEach(([cx, cz], i) => {
          const [nx, nz] = corners[(i + 1) % 4];
          const p: P3 = [x + cx * w / 2, k % 2 ? y1 : y0, cz * w / 2], q: P3 = [x + nx * w / 2, k % 2 ? y0 : y1, nz * w / 2];
          strut(p, q, 0.045);
          strut([x + cx * w / 2, y1, cz * w / 2], [x + nx * w / 2, y1, nz * w / 2], 0.045);
        });
      }
      members.push({ size: [w + 0.5, 0.4, w + 0.5], at: [x, 0.1, 0], color: '#a5a39b' });
    };
    const left = -Wd / 2, right = Wd / 2;
    const gx0 = left - 0.45, gx1 = a.span === 'cantilever' ? right - 0.9 : right + 0.45;

    if (a.span === 'plate') {
      for (const x of [left, right]) {
        members.push({ size: [0.5, H, 0.12], at: [x, H / 2, 0] }, { size: [0.12, H, 0.6], at: [x - 0.19, H / 2, 0] }, { size: [0.12, H, 0.6], at: [x + 0.19, H / 2, 0] });
        members.push({ size: [1.1, 0.4, 1.1], at: [x, 0.1, 0], color: '#a5a39b' });
        strut([x + Math.sign(-x) * 0.2, H - 1.5, 0], [x + Math.sign(-x) * 1.7, H, 0], 0.16);
      }
      for (const z of [-gw / 2, gw / 2]) {
        members.push({ size: [gx1 - gx0, depth, 0.05], at: [(gx0 + gx1) / 2, H + depth / 2, z] });
        for (const y of [H, top]) members.push({ size: [gx1 - gx0, 0.07, 0.24], at: [(gx0 + gx1) / 2, y, z] });
        for (let x = gx0; x <= gx1 + 0.01; x += (gx1 - gx0) / Math.round((gx1 - gx0) / 1.3)) members.push({ size: [0.06, depth, 0.2], at: [x, H + depth / 2, z] });
      }
    } else {
      const mastTop = a.span === 'cantilever' ? top + 3.2 : top;
      latticeLeg(left, mastTop, a.span === 'cantilever' ? 1.1 : 0.85);
      if (a.span === 'lattice') latticeLeg(right, top, 0.85);
      const panels = Math.round((gx1 - gx0) / 1.35), pw = (gx1 - gx0) / panels;
      for (const z of [-gw / 2, gw / 2]) {
        for (const y of [H, top]) strut([gx0, y, z], [gx1, y, z], 0.1);
        for (let k = 0; k <= panels; k++) {
          const x = gx0 + k * pw;
          strut([x, H, z], [x, top, z], 0.05);
          if (k < panels) strut([x, k % 2 ? top : H, z], [x + pw, k % 2 ? H : top, z], 0.05);
        }
      }
      for (let k = 0; k <= panels; k++) for (const y of [H, top]) strut([gx0 + k * pw, y, -gw / 2], [gx0 + k * pw, y, gw / 2], 0.05);
      if (a.span === 'cantilever') {
        for (const z of [-gw / 2, gw / 2]) { strut([left, mastTop - 0.1, z], [gx0 + (gx1 - gx0) * 0.55, top, z], 0.045); strut([left, mastTop - 0.1, z], [gx1 - 0.2, top, z], 0.045); }
        strut([left - 0.3, 0.3, 0], [left - 2.2, 0.1, 0], 0.05);
        strut([left, H - 2.2, 0], [left + 2.0, H, 0], 0.09);
      }
    }
    // Walkway on top with a handrail on both sides, and a ladder up the left tower.
    members.push({ size: [gx1 - gx0, 0.05, gw + 0.5], at: [(gx0 + gx1) / 2, top + 0.07, 0], color: '#4d4f50' });
    const railPosts = Math.round((gx1 - gx0) / 1.35);
    for (const z of [-gw / 2 - 0.22, gw / 2 + 0.22]) {
      for (const y of [top + 0.55, top + 1.05]) strut([gx0, y, z], [gx1, y, z], 0.035);
      for (let k = 0; k <= railPosts; k++) { const x = gx0 + (k / railPosts) * (gx1 - gx0); strut([x, top + 0.07, z], [x, top + 1.05, z], 0.035); }
    }
    const ladderZ = (a.span === 'plate' ? 0.3 : a.span === 'cantilever' ? 0.55 : 0.43) + 0.1;
    for (const dx of [-0.2, 0.2]) strut([left + dx, 0.3, ladderZ], [left + dx, top + 1.1, ladderZ], 0.04, '#b9b6aa');
    for (let y = 0.6; y < top + 1; y += 0.32) strut([left - 0.2, y, ladderZ], [left + 0.2, y, ladderZ], 0.03, '#b9b6aa');
    blocks(s.root, steel, members.map((member) => ({ ...member, color: member.color ?? steelColour })));

    // Aspects, one per road.
    const cleared = Math.floor(random() * n);
    const aspects: Aspect[] = xs.map((_x, i) => {
      if (a.aspects === 'allred') return 'stop';
      if (a.aspects === 'onegreen') return i === cleared ? 'clear' : 'stop';
      if (a.aspects === 'caution') return i === cleared && n > 2 ? 'stop' : 'caution';
      if (a.aspects === 'dark') return 'dark';
      return (['stop', 'clear', 'caution', 'stop'] as const)[(i + cleared) % 4];
    });
    const lit = (hex: string) => new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 2.6, roughness: 0.3 });
    const lamps = { stop: lit('#ff2a1c'), clear: lit('#2cff7a'), caution: lit('#ffc21e') };
    const off = s.material('#2c2a28', { roughness: 0.4 });
    const halo = (hex: string) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.22, depthWrite: false });
    const halos = { stop: halo('#ff2a1c'), clear: halo('#2cff7a'), caution: halo('#ffc21e') };
    const lens = (at: P3, colour: 'stop' | 'clear' | 'caution', on: boolean, r = 0.14) => {
      const mesh = s.ball([r, r, r * 0.5], at, on ? lamps[colour] : off, 14);
      mesh.castShadow = false;
      if (on) s.ball([r * 2.6, r * 2.6, r * 1.2], at, halos[colour], 12).castShadow = false;
    };
    const zs = gw / 2 + 0.42;
    const armTexture = (yellow: boolean) => canvasTexture(256, 48, (ctx, w, h) => {
      ctx.fillStyle = yellow ? '#e6b61e' : '#c62a20'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = yellow ? '#19191b' : '#f0ede2';
      if (yellow) { ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(46, 0); ctx.lineTo(66, h / 2); ctx.lineTo(46, h); ctx.lineTo(26, h); ctx.lineTo(46, h / 2); ctx.fill(); } else ctx.fillRect(34, 0, 26, h);
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = `rgba(90,70,55,${random() * 0.5})`; ctx.fillRect(random() * w, random() * h, 6 + random() * 20, 3 + random() * 6); }
    });
    const redArm = new THREE.MeshStandardMaterial({ map: armTexture(false), roughness: 0.7, side: THREE.DoubleSide });
    const yellowArm = new THREE.MeshStandardMaterial({ map: armTexture(true), roughness: 0.7, side: THREE.DoubleSide });
    const post = s.material(a.signals === 'lower' ? '#e4e1d6' : '#3a3d40', { metalness: 0.2 });
    const snowCap = new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 });

    xs.forEach((x, i) => {
      const aspect = aspects[i];
      const number = s.label(String(i + 1), 0.55, 0.55, [x, H - 0.4, gw / 2 + 0.06], '#19191b', '#f0ede2');
      number.castShadow = false;
      if (a.signals === 'lower' || a.signals === 'upper') {
        const upper = a.signals === 'upper';
        const postTop = top + 3.5, pivot = top + 2.9;
        s.cylinder(0.07, 0.09, postTop - H, [x, (postTop + H) / 2, zs], post, 10);
        s.mesh(new THREE.ConeGeometry(0.09, 0.35, 8), black, [x, postTop + 0.17, zs]);
        s.box([0.1, 0.1, 0.45], [x, H + 0.05, zs - 0.2], black);
        const arm = (y: number, yellow: boolean, angle: number) => {
          const group = new THREE.Group();
          group.position.set(x, y, zs + 0.12);
          const shape = new THREE.Shape((upper && !yellow ? [[0.1, -0.19], [-1.85, -0.19], [-2.1, 0], [-1.85, 0.19], [0.1, 0.19]] : yellow ? [[0.1, -0.19], [-2.05, -0.19], [-1.8, 0], [-2.05, 0.19], [0.1, 0.19]] : [[0.1, -0.19], [-2.05, -0.19], [-2.05, 0.19], [0.1, 0.19]]).map(([px, py]) => new THREE.Vector2(px, py)));
          const geometry = new THREE.ShapeGeometry(shape);
          const uv = geometry.attributes.uv;
          for (let k = 0; k < uv.count; k++) uv.setXY(k, (uv.getX(k) + 2.1) / 2.2, (uv.getY(k) + 0.19) / 0.38);
          const blade = new THREE.Mesh(geometry, yellow ? yellowArm : redArm);
          blade.castShadow = true;
          const spectacle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.03), black);
          spectacle.position.set(0.28, upper ? 0.1 : -0.1, -0.02);
          group.add(blade, spectacle);
          group.rotation.z = angle;
          s.root.add(group);
          if (snow > 0.4 && Math.abs(angle) < 0.2) { const cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.08), snowCap); cap.position.set(-1.0, 0.21, 0); group.add(cap); }
        };
        const missing = aspect === 'dark' && random() < 0.3;
        const angle = aspect === 'dark' ? 0.18 + random() * 0.25 : aspect === 'stop' ? 0 : upper ? (aspect === 'clear' ? -1.15 : -0.6) : 0.8;
        if (!missing) arm(pivot, false, upper || aspect !== 'caution' ? angle : 0.8);
        if (!upper && (aspect === 'caution' || (aspect === 'stop' && i % 2 === 1))) arm(pivot - 1.25, true, 0);
        s.box([0.24, 0.3, 0.26], [x + 0.26, pivot - 0.35, zs], black);
        if (aspect !== 'dark') lens([x + 0.26, pivot - 0.35, zs + 0.14], aspect, true, 0.11);
      } else {
        const headY = top + 1.75;
        s.cylinder(0.06, 0.08, headY - H, [x, (headY + H) / 2, zs - 0.12], post, 10);
        s.box([0.1, 0.1, 0.4], [x, H + 0.05, zs - 0.3], black);
        if (a.signals === 'colour') {
          s.box([0.5, 1.45, 0.28], [x, headY, zs], black);
          s.cylinder(0.25, 0.25, 0.28, [x, headY + 0.72, zs], black, 16).rotation.x = Math.PI / 2;
          s.cylinder(0.25, 0.25, 0.28, [x, headY - 0.72, zs], black, 16).rotation.x = Math.PI / 2;
          (['clear', 'caution', 'stop'] as const).forEach((colour, k) => {
            const y = headY + 0.46 - k * 0.46;
            lens([x, y, zs + 0.15], colour, aspect === colour);
            s.box([0.34, 0.03, 0.3], [x, y + 0.19, zs + 0.27], black).rotation.x = 0.15;
          });
        } else if (a.signals === 'searchlight') {
          s.cylinder(0.55, 0.55, 0.05, [x, headY, zs], black, 24).rotation.x = Math.PI / 2;
          s.box([0.3, 0.34, 0.3], [x, headY, zs - 0.15], black);
          if (aspect === 'dark') lens([x, headY, zs + 0.04], 'stop', false, 0.17); else lens([x, headY, zs + 0.04], aspect, true, 0.17);
          s.box([0.4, 0.03, 0.3], [x, headY + 0.24, zs + 0.16], black).rotation.x = 0.15;
        } else {
          s.cylinder(0.72, 0.72, 0.05, [x, headY + 0.1, zs], black, 28).rotation.x = Math.PI / 2;
          const row = aspect === 'clear' ? Math.PI / 2 : aspect === 'caution' ? Math.PI / 4 : 0;
          for (let k = -1; k <= 1; k++) {
            const at: P3 = [x + Math.cos(row) * k * 0.45, headY + 0.1 + Math.sin(row) * k * 0.45, zs + 0.04];
            lens(at, 'caution', aspect !== 'dark', 0.1);
          }
          for (const angle of [0, Math.PI / 4, Math.PI / 2, (Math.PI * 3) / 4]) if (Math.abs(angle - row) > 0.01 || aspect === 'dark') for (const k of [-1, 1]) lens([x + Math.cos(angle) * k * 0.45, headY + 0.1 + Math.sin(angle) * k * 0.45, zs + 0.04], 'caution', false, 0.085);
        }
      }
    });

    // People.
    const walk = top + 0.1;
    const worker = (x: number, pose: 'reach' | 'stand', yaw: number, hi: boolean) => figure(s, { at: [x, walk, 0.05], yaw, pose, coat: hi ? '#e8791c' : '#2f3b4c', trousers: '#272b31', hat: hi ? 'hardhat' : 'cap', hatColour: hi ? '#f2f0e8' : '#22262c' });
    const modern = a.signals === 'colour' || a.signals === 'searchlight';
    if (a.crew === 'lampman' || a.crew === 'pair') worker(xs[Math.floor(random() * n)] - 0.5, 'reach', 0.25, modern);
    if (a.crew === 'pair') worker(xs[0] + spacing * 0.5 + (random() - 0.5), 'stand', Math.PI + (random() - 0.5), modern);
    if (a.crew === 'climbing') figure(s, { at: [left, mix(1.5, H - 1.5, random()), ladderZ + 0.22], yaw: Math.PI, pose: 'reach', coat: modern ? '#e8791c' : '#2f3b4c', hat: modern ? 'hardhat' : 'cap', hatColour: modern ? '#f2f0e8' : '#22262c' });

    // Whatever else has settled on it.
    if (a.perched === 'crows') {
      const birds: Block[] = [];
      const count = 5 + Math.round(mood.density * 8);
      for (let k = 0; k < count; k++) {
        const x = mix(gx0 + 0.5, gx1 - 0.5, random()), z = (random() < 0.7 ? 1 : -1) * (gw / 2 + 0.22), face = random() * 6;
        birds.push({ size: [0.16, 0.16, 0.32], at: [x, top + 1.17, z], rot: [0.5, face, 0] });
        birds.push({ size: [0.11, 0.11, 0.13], at: [x + Math.sin(face) * 0.12, top + 1.3, z + Math.cos(face) * 0.12] });
        birds.push({ size: [0.03, 0.03, 0.14], at: [x + Math.sin(face) * 0.2, top + 1.29, z + Math.cos(face) * 0.2], rot: [0, face, 0] });
      }
      blocks(s.root, s.material('#141418', { roughness: 0.6 }), birds, new THREE.SphereGeometry(0.5, 10, 8));
    } else if (a.perched === 'banner') {
      const texts = ['ON STRIKE', 'LINE CLOSED', 'SAFETY FIRST', 'LAST TRAIN TONIGHT', 'WELCOME HOME'];
      const width = Math.min(Wd * 0.62, 8);
      const banner = s.label(texts[Math.floor(random() * texts.length)], width, 1.0, [(gx0 + gx1) / 2 + 0.6, H + depth / 2, gw / 2 + 0.1], '#b3261d', '#efe9d6');
      banner.rotation.z = (random() - 0.5) * 0.06;
    } else if (a.perched === 'nest') {
      const twigs: Block[] = Array.from({ length: 70 }, () => { const t = random() * Math.PI * 2, r = random() * 0.6; return { size: [mix(0.4, 0.9, random()), 0.03, 0.03] as const, at: [(a.span === 'lattice' ? right : gx1 - 0.6) + Math.cos(t) * r, top + (a.span === 'lattice' ? 0.12 : 1.12) + random() * 0.3, Math.sin(t) * r] as const, rot: [random() * 0.4, random() * 3, random() * 0.4] as const, color: new THREE.Color('#5a4632').offsetHSL(0, 0, (random() - 0.5) * 0.1) }; });
      blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), twigs);
    }
    if (snow > 0.35) {
      const caps: Block[] = [{ size: [gx1 - gx0, 0.05 + snow * 0.08, gw + 0.5], at: [(gx0 + gx1) / 2, top + 0.13, 0] }];
      for (const z of [-gw / 2 - 0.22, gw / 2 + 0.22]) caps.push({ size: [gx1 - gx0, 0.03 + snow * 0.03, 0.07], at: [(gx0 + gx1) / 2, top + 1.09, z] });
      blocks(s.root, snowCap, caps);
    }

    const speed = mix(2, 9, mood.energy);
    const flashing = a.aspects === 'mixed' && mood.energy > 0.6;
    return s.finish({
      update: (_dt, time) => {
        const pulse = 2.4 + Math.sin(time * speed) * 0.3;
        lamps.stop.emissiveIntensity = pulse;
        lamps.clear.emissiveIntensity = pulse;
        lamps.caution.emissiveIntensity = flashing ? (Math.sin(time * speed) > 0 ? 2.8 : 0.2) : pulse;
      },
    });
  },
});
