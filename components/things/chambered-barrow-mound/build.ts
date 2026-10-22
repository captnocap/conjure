import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { carvedDecal, instanced, makeNoise, sheep, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

export default defineThing({
  questions: {
    form: choice('What kind of mound is it?', {
      round: 'A round bowl of turf, a simple green dome.',
      long: 'A long barrow: a great wedge of earth, highest and widest at the entrance end, with tall facade stones.',
      platform: 'A broad flat-topped drum with a steep revetment wall, a passage tomb built to impress.',
      denuded: 'Worn almost away: a low swell of ground with the stone chamber and its capstone standing bare.',
    }),
    stature: score('How large is it?', ['A hummock a few strides across', 'The size of a house', 'A small hill that took generations to raise']),
    entrance: choice('What state is the entrance in?', {
      open: 'Open: a black doorway between upright stones, inviting and forbidding.',
      blocked: 'Sealed by a great slab leaned across the doorway.',
      gated: 'Closed by a modern iron grille and padlock.',
      collapsed: 'Fallen in: the lintel down and rubble spilling out.',
      offerings: 'Open, with candles and flowers left on the threshold.',
    }),
    glow: noul('Is there light inside the passage?'),
    kerb: choice('What rings the foot of the mound?', {
      none: 'Nothing; the turf runs straight out into the field.',
      boulders: 'A kerb of rounded boulders, some missing.',
      slabs: 'Tall slabs set edge to edge like a wall.',
      carved: 'Massive kerbstones, the one before the entrance carved with spirals.',
      quartz: 'A low dry-stone wall of white quartz and dark cobbles.',
    }),
    cover: choice('What covers it?', {
      turf: 'Close-cropped green turf.',
      meadow: 'Long grass thick with wild flowers.',
      heather: 'Heather and gorse, brown, purple and yellow.',
      chalk: 'Bare gleaming chalk: it is newly built and white as bone.',
      bracken: 'Rusty bracken and scrub.',
    }),
    crown: choice('What is on top?', {
      nothing: 'Nothing.',
      thorn: 'A lone wind-bent thorn tree nobody dares cut.',
      sheep: 'Sheep grazing.',
      pillar: 'A concrete survey pillar and a small cairn.',
      crater: 'A robbers\' crater dug down from the top long ago.',
      stone: 'A single small standing stone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(random);
    const R = mix(4.2, 11, a.stature) * mix(0.93, 1.07, random());
    const long = a.form === 'long';
    const ZS = long ? 2.1 : 1;
    const H = R * { round: 0.42, long: 0.36, platform: 0.5, denuded: 0.1 }[a.form];
    const power = { round: 2.6, long: 3, platform: 7, denuded: 2 }[a.form];
    const ease = { round: 0.75, long: 0.7, platform: 0.5, denuded: 1 }[a.form];
    const wallH = a.form === 'platform' ? H * 0.42 : 0;
    const ph = [random() * 6.3, random() * 6.3];
    const Rr = (angle: number) => R * (1 + 0.035 * Math.sin(angle * 3 + ph[0]) + 0.025 * Math.sin(angle * 5 + ph[1])) * (long ? 0.74 + 0.26 * Math.sin(angle) : 1);
    const craterR = R * 0.24;
    const heightQ = (q: number, x: number, z: number) => {
      if (q >= 1) return 0;
      let h = wallH + (H - wallH) * Math.pow(1 - Math.pow(q, power), ease);
      if (long) h *= mix(0.62, 1.12, (z / (R * ZS) + 1) / 2);
      h += noise(x * 0.22, 0, z * 0.22, 2) * H * 0.07 * (1 - q) * (1 + mood.wear);
      if (a.crown === 'crater') h -= H * 0.4 * Math.exp(-((x * x + (z / ZS) ** 2) / (craterR * craterR)) * 1.6);
      return Math.max(h, wallH);
    };
    const quotient = (x: number, z: number) => Math.hypot(x, z / ZS) / Rr(Math.atan2(z / ZS, x));
    const heightAt = (x: number, z: number) => heightQ(quotient(x, z), x, z);

    const frost = mood.warmth < 0.3 ? mix(0.85, 0, mood.warmth / 0.3) : 0;
    const grass = new THREE.Color(mood.warmth > 0.65 ? '#8d9148' : '#55773a');
    const coverTint = { turf: grass, meadow: new THREE.Color(mood.warmth > 0.65 ? '#a9a45c' : '#7c9648'), heather: new THREE.Color('#5d4b3e'), chalk: new THREE.Color('#e2ddcc'), bracken: new THREE.Color('#7a5a34') }[a.cover];
    const second = { turf: '#6b8a42', meadow: '#9aa758', heather: mood.warmth > 0.4 ? '#644a60' : '#4a4034', chalk: '#d5d0bd', bracken: '#5d6a34' }[a.cover];

    // The mound as a polar height field with painted vertices.
    const rings = 34, spokes = 120;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const c = new THREE.Color(), other = new THREE.Color(second), white = new THREE.Color('#eef3f4'), stoneWall = new THREE.Color('#ded9cc');
    const push = (x: number, y: number, z: number, q: number, wall = false) => {
      positions.push(x, y, z);
      if (wall) { c.copy(stoneWall).multiplyScalar(0.93 + noise(x * 0.4, y, z * 0.4, 2) * 0.09); }
      else {
        c.copy(coverTint).lerp(other, THREE.MathUtils.smoothstep(noise(x * 0.35, 3, z * 0.35, 3), -0.1, 0.35));
        c.multiplyScalar(0.84 + 0.2 * noise(x * 0.9, 7, z * 0.9, 2) + 0.12 * (1 - q));
        if (a.cover === 'chalk') c.lerp(grass, THREE.MathUtils.smoothstep(q + noise(x * 0.6, 5, z * 0.6, 2) * 0.25, 0.62, 1) * 0.85);
        if (a.crown === 'crater' && Math.hypot(x, z / ZS) < craterR * 0.75) c.lerp(new THREE.Color('#6a5438'), 0.6);
        c.lerp(white, frost * (0.45 + 0.4 * noise(x * 0.5, 11, z * 0.5, 2)));
      }
      colours.push(c.r, c.g, c.b);
    };
    push(0, heightQ(0, 0, 0), 0, 0);
    for (let ring = 1; ring <= rings; ring++) for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = (spoke / spokes) * Math.PI * 2, q = Math.min(1, Math.pow(ring / (rings - (wallH ? 1 : 0)), 0.85));
      const x = Math.cos(angle) * Rr(angle) * q, z = Math.sin(angle) * Rr(angle) * q * ZS;
      const foot = wallH > 0 && ring === rings;
      push(x, foot ? 0 : ring === rings - 1 && wallH > 0 ? wallH : heightQ(q, x, z) + (q >= 1 ? 0 : 0), z, q, foot || (wallH > 0 && ring === rings - 1));
    }
    for (let spoke = 0; spoke < spokes; spoke++) index.push(0, 1 + ((spoke + 1) % spokes), 1 + spoke);
    for (let ring = 1; ring < rings; ring++) for (let spoke = 0; spoke < spokes; spoke++) {
      const p0 = 1 + (ring - 1) * spokes + spoke, p1 = 1 + (ring - 1) * spokes + ((spoke + 1) % spokes), p2 = p0 + spokes, p3 = p1 + spokes;
      index.push(p0, p1, p2, p1, p3, p2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));

    // Stone for everything megalithic.
    const rock = new THREE.Color(a.cover === 'chalk' ? '#b9b5aa' : '#9a968c').lerp(new THREE.Color('#c9a878'), Math.max(0, mood.warmth - 0.6) * 0.5);
    const patches = [{ color: '#c9cdb1', amount: 0.35 + mood.wear * 0.3, scale: 2.5 }, { color: '#d39a35', amount: 0.14, scale: 4 }, { color: '#4f6a2f', amount: 0.25, scale: 1.4, up: 2 }];
    const material = stoneMaterial();
    const block = (size: readonly [number, number, number], round = 0.22, taper = 0.9) =>
      solid(stoneGeometry(random, { size, round, taper, rough: Math.max(...size) * 0.022 * mix(0.8, 1.5, mood.wear), base: rock, patches, damp: 0.6, frost, segments: 9 }), material);
    const place = (mesh: THREE.Object3D, x: number, y: number, z: number, turn: readonly [number, number, number] = [0, 0, 0]) => { mesh.position.set(x, y, z); mesh.rotation.set(...turn); s.root.add(mesh); return mesh; };

    // The doorway. It is drawn larger than life so the dark of it reads from across a field.
    const edgeZ = Rr(Math.PI / 2) * ZS;
    const doorW = Math.max(1.1, R * 0.15), doorH = Math.max(1.5, R * 0.2), jamb = doorW * 0.55;
    const exposed = a.form === 'denuded';
    const frontZ = exposed ? doorW * 1.6 : edgeZ * (a.form === 'platform' ? 1.0 : 0.97);
    const depth = exposed ? doorW * 3.2 : edgeZ * 0.42;
    const fallen = a.entrance === 'collapsed';
    for (const side of [-1, 1]) {
      const n = Math.max(2, Math.round(depth / (jamb * 1.5)));
      for (let i = 0; i < n; i++) {
        const front = i === 0;
        const h = doorH * (front ? 1.12 : mix(0.95, 1.08, random())) * (fallen && front && side === 1 ? 0.6 : 1);
        place(block([jamb * (front ? 1.15 : 0.8), h + 0.4, (depth / n) * 0.98], 0.2, 0.92), side * (doorW / 2 + jamb * 0.42), -0.4, frontZ - (i + 0.5) * (depth / n), [0, (random() - 0.5) * 0.12, side * (random() - 0.3) * 0.06]);
      }
    }
    // Roof slabs over the passage, and the big lintel over the door.
    const roofs = Math.max(2, Math.round(depth / (doorW * 1.1)));
    for (let i = 1; i < roofs; i++) place(block([doorW + jamb * 2.2, doorH * 0.24, (depth / roofs) * 1.05], 0.3, 0.95), 0, doorH * 0.98, frontZ - (i + 0.5) * (depth / roofs), [0, (random() - 0.5) * 0.1, (random() - 0.5) * 0.05]);
    const lintel = block([doorW + jamb * 2.9, doorH * 0.36, jamb * 1.5], 0.24, 0.95);
    if (fallen) place(lintel, doorW * 0.25, doorH * 0.28, frontZ + jamb * 0.6, [0.2, 0.3, -0.42]);
    else place(lintel, 0, doorH * 1.05, frontZ - jamb * 0.7, [0, (random() - 0.5) * 0.06, (random() - 0.5) * 0.05]);
    if (exposed) {
      // The bared chamber: a huge capstone riding on the passage stones.
      place(block([doorW * 3.4, doorH * 0.5, doorW * 3], 0.45, 0.8), (random() - 0.5) * 0.3, doorH * 1.2, frontZ - depth * 0.62, [(random() - 0.5) * 0.14, random() * 0.6, (random() - 0.5) * 0.14]);
      for (const side of [-1, 1]) place(block([jamb, doorH * 1.25 + 0.4, doorW * 1.2], 0.25, 0.85), side * doorW * 1.25, -0.4, frontZ - depth * 0.7, [0, side * 0.5, 0]);
    }
    // The dark inside.
    const lit = a.glow && !fallen;
    const darkness = new THREE.MeshStandardMaterial({ color: '#0b0908', roughness: 1 });
    place(solid(new THREE.BoxGeometry(doorW + jamb * 0.5, doorH * 1.02, depth * 0.96), darkness), 0, doorH * 0.5, frontZ - depth * 0.5 - jamb * 0.25);
    if (lit) {
      const ember = new THREE.MeshStandardMaterial({ color: '#ffb35a', emissive: '#ff8a2a', emissiveIntensity: mix(1.2, 3, mood.warmth) });
      const glow = place(new THREE.Mesh(new THREE.PlaneGeometry(doorW * 0.96, doorH * 0.92), ember), 0, doorH * 0.5, frontZ - jamb * 0.2);
      glow.castShadow = false;
    }
    // Facade stones flanking the door.
    const flank = long ? 4 : a.form === 'platform' ? 0 : 1;
    for (const side of [-1, 1]) for (let i = 0; i < flank; i++) {
      const h = doorH * (long ? mix(1.2, 1.75, random()) * (1 - i * 0.12) : mix(0.9, 1.15, random()));
      const x = side * (doorW / 2 + jamb * 1.5 + i * jamb * 1.9);
      place(block([jamb * 1.7, h + 0.4, jamb * 0.8], 0.2, 0.8), x, -0.4, frontZ + jamb * 0.2 - Math.abs(x) * 0.12, [(random() - 0.5) * 0.08, 0, (random() - 0.5) * 0.1]);
    }

    if (a.entrance === 'blocked') place(block([doorW * 1.5, doorH * 1.25, jamb * 0.6], 0.2, 0.85), (random() - 0.5) * 0.2, -0.1, frontZ + jamb * 0.75, [-0.14, 0, (random() - 0.5) * 0.08]);
    if (a.entrance === 'gated') {
      const iron = s.material('#23262a', { metalness: 0.7, roughness: 0.5 });
      const bars = Math.max(5, Math.round(doorW / 0.16));
      for (let i = 0; i <= bars; i++) s.rod([-doorW / 2 + (doorW * i) / bars, 0, frontZ + 0.05], [-doorW / 2 + (doorW * i) / bars, doorH, frontZ + 0.05], 0.022, iron);
      for (const y of [0.15, 0.5, 0.9]) s.rod([-doorW / 2, doorH * y, frontZ + 0.07], [doorW / 2, doorH * y, frontZ + 0.07], 0.026, iron);
      s.box([0.14, 0.17, 0.06], [doorW * 0.32, doorH * 0.5, frontZ + 0.12], s.material('#b5942e', { metalness: 0.8, roughness: 0.3 }));
      s.rod([doorW / 2 + jamb * 1.6, 0, frontZ + jamb * 1.6], [doorW / 2 + jamb * 1.6, 0.9, frontZ + jamb * 1.6], 0.04, s.material('#5a5148'));
      s.label('ANCIENT TOMB', 0.8, 0.45, [doorW / 2 + jamb * 1.6, 1.05, frontZ + jamb * 1.6 + 0.03], '#f0ead8', '#3d5c48');
    }
    if (fallen || mood.wear > 0.8) {
      const dabs: Dab[] = [];
      for (let i = 0; i < Math.round(mix(8, 22, mood.density)); i++) dabs.push({ at: [(random() - 0.5) * doorW * 2.4, -0.03, frontZ + random() * doorW * 1.8], scale: doorW * mix(0.1, 0.3, random()), turn: [random(), random() * 6, random()] });
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.6, 0.8], round: 0.3, rough: 0.08, base: rock, segments: 4 }), material, dabs));
    }
    if (a.entrance === 'offerings') {
      const wax: Dab[] = [], flames: Dab[] = [], petals: Dab[] = [];
      const u = doorW * 0.045;
      const tints = mood.cheer > 0.45 ? ['#e8c22a', '#d9486b', '#f1ede2', '#8a5bd0', '#e97a2b'] : ['#f1ede2', '#b9b4a6', '#7d5a8c'];
      for (let i = 0; i < Math.round(mix(5, 14, mood.density)); i++) {
        const x = (random() - 0.5) * doorW * 1.5, z = frontZ + doorW * 0.15 + random() * doorW * 0.9, h = u * mix(1.2, 4, random());
        wax.push({ at: [x, h / 2, z], scale: [u, h, u] });
        flames.push({ at: [x, h + u, z], scale: [u * 0.7, u * 1.7, u * 0.7] });
      }
      for (let i = 0; i < Math.round(mix(14, 50, mood.density)); i++) petals.push({ at: [(random() - 0.5) * doorW * 2, u * (0.6 + random()), frontZ + doorW * 0.2 + random() * doorW * 1.1], scale: u * mix(0.9, 1.6, random()), color: tints[Math.floor(random() * tints.length)] });
      s.root.add(instanced(new THREE.CylinderGeometry(1, 1.1, 1, 8), new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.6 }), wax));
      const fire = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9d2e', emissiveIntensity: 2.4 }), flames);
      fire.castShadow = false;
      s.root.add(fire, instanced(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), petals));
    }

    // The kerb.
    const around = (angle: number, q = 1): [number, number] => [Math.cos(angle) * Rr(angle) * q, Math.sin(angle) * Rr(angle) * q * ZS];
    const doorGap = (angle: number) => { const [x, z] = around(angle); return z > 0 && Math.abs(x) < doorW / 2 + jamb * (1.4 + flank * 1.9); };
    const girth = Math.PI * R * (1 + ZS);
    if (a.kerb === 'boulders' || a.kerb === 'slabs' || a.kerb === 'carved') {
      const unit = { boulders: Math.max(0.7, R * 0.085), slabs: Math.max(0.6, R * 0.07), carved: Math.max(1.3, R * 0.2) }[a.kerb];
      const n = Math.round(girth / (unit * (a.kerb === 'boulders' ? 1.5 : 1.02)));
      const dabs: Dab[] = [];
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + (random() - 0.5) * 0.02;
        if (doorGap(angle) || random() < (a.kerb === 'boulders' ? 0.12 : 0.03) + mood.wear * 0.22) continue;
        const [x, z] = around(angle, 1.005);
        const tall = a.kerb === 'slabs' ? mix(1.1, 1.9, random()) : a.kerb === 'carved' ? 0.55 : mix(0.6, 1, random());
        dabs.push({ at: [x, -unit * 0.12, z], scale: [unit, unit * tall, unit * (a.kerb === 'boulders' ? mix(0.7, 1, random()) : 0.5)], turn: [(random() - 0.5) * 0.12, Math.PI / 2 - Math.atan2(z / ZS, x) + (random() - 0.5) * 0.2, (random() - 0.5) * 0.1] });
      }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 1, 1], round: a.kerb === 'boulders' ? 0.7 : 0.25, rough: 0.035, base: rock, patches, damp: 0.5, frost, segments: 6 }), material, dabs));
      if (a.kerb === 'carved' && !exposed) {
        const w = doorW + jamb * 3.4, h = doorH * 0.55;
        place(block([w, h + 0.2, jamb * 1.1], 0.4, 0.92), 0, -0.2, frontZ + doorW * 1.35);
        const decal = carvedDecal(w * 0.86, h * 0.72, (ctx, cw, ch) => {
          ctx.lineWidth = 5;
          for (const [cx, cy, rr, dir] of [[0.2, 0.5, 0.42, 1], [0.44, 0.42, 0.36, -1], [0.44, 0.78, 0.2, 1], [0.7, 0.5, 0.44, 1], [0.9, 0.5, 0.3, -1]] as const) {
            ctx.beginPath();
            for (let t = 0; t < 22; t += 0.2) ctx.lineTo(cw * cx + Math.cos(t * dir) * ch * rr * (t / 22), ch * cy + Math.sin(t * dir) * ch * rr * (t / 22));
            ctx.stroke();
          }
          ctx.beginPath(); ctx.moveTo(cw * 0.57, 0); ctx.lineTo(cw * 0.57, ch * 0.3); ctx.stroke();
        }, 'rgba(24,20,18,0.85)');
        place(decal, 0, h * 0.5, frontZ + doorW * 1.35 + jamb * 0.62);
      }
    }
    if (a.kerb === 'quartz') {
      const n = Math.round(girth / Math.max(0.45, R * 0.05));
      const dabs: Dab[] = [];
      const unit = Math.max(0.45, R * 0.05);
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) {
        const angle = ((i + layer * 0.5) / n) * Math.PI * 2;
        if (doorGap(angle) || random() < mood.wear * 0.3) continue;
        const [x, z] = around(angle, 1.01);
        dabs.push({ at: [x, layer * unit * 0.62, z], scale: [unit * 1.1, unit * 0.72, unit * 0.8], turn: [0, Math.PI / 2 - Math.atan2(z / ZS, x), 0], color: random() < 0.26 ? '#3e3d3b' : random() < 0.5 ? '#f3f0e8' : '#e2ddd0' });
      }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 1, 1], round: 0.5, rough: 0.03, base: '#ffffff', segments: 4 }), material, dabs));
    }

    // Growth on the slopes.
    const onMound = (): [number, number, number] => {
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = random() * Math.PI * 2, q = Math.sqrt(random()) * (wallH ? 0.9 : 1.04);
        const [x, z] = around(angle, q);
        if (z > frontZ - depth - jamb && Math.abs(x) < doorW / 2 + jamb * 1.4) continue;
        return [x, heightAt(x, z), z];
      }
      return [0, heightAt(0, 0), 0];
    };
    const green = frost > 0.3 ? ['#a9bdb0', '#8fa894', '#c3d2cc'] : mood.warmth > 0.65 ? ['#a7a25a', '#8c9450', '#c2b56b'] : ['#5f7d3c', '#6f8a45', '#4d6b35'];
    if (a.cover !== 'chalk') {
      const blades: [number, number, number][] = [];
      const n = Math.round(mix(120, 340, mood.density) * (a.cover === 'meadow' ? 1.6 : 1));
      for (let i = 0; i < n; i++) blades.push(onMound());
      s.root.add(tufts(random, blades, a.cover === 'bracken' ? ['#9a6a3a', '#84552c', '#a27a40', '#6f7a34'] : green, R * (a.cover === 'meadow' ? 0.07 : a.cover === 'bracken' ? 0.055 : 0.045)));
    }
    if (a.cover === 'meadow' || a.cover === 'heather') {
      const dabs: Dab[] = [];
      const tints = a.cover === 'meadow' ? (mood.cheer > 0.35 ? ['#e8c22a', '#f1ede2', '#d9486b', '#8a5bd0', '#f1ede2'] : ['#f1ede2', '#d9d2bd', '#b9a4c8']) : mood.warmth > 0.4 ? ['#5f4259', '#6e4d68', '#5f4259', '#c9aa2a', '#5e4a3c', '#4e5a34'] : ['#5a4638', '#6b5340', '#8a7a2f'];
      const n = Math.round(mix(90, 300, mood.density));
      const u = R * (a.cover === 'meadow' ? 0.016 : 0.03);
      for (let i = 0; i < n; i++) { const [x, y, z] = onMound(); dabs.push({ at: [x, y + u * (a.cover === 'meadow' ? 2.4 : 0.5), z], scale: [u, u * 0.7, u], color: tints[Math.floor(random() * tints.length)] }); }
      s.root.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), dabs));
    }

    // The crown.
    const topY = heightAt(0, 0);
    const sway: THREE.Object3D[] = [];
    if (a.crown === 'thorn') {
      const tree = new THREE.Group();
      const bark = new THREE.MeshStandardMaterial({ color: '#3f342b', roughness: 1 });
      const th = Math.max(2.6, R * 0.42), lean = random() < 0.5 ? -1 : 1;
      const limb = (points: [number, number, number][], radius: number) => { const mesh = solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 14, radius, 6), bark); tree.add(mesh); };
      limb([[0, -0.2, 0], [lean * th * 0.08, th * 0.35, 0.05], [lean * th * 0.3, th * 0.62, 0], [lean * th * 0.62, th * 0.74, -0.05]], th * 0.035);
      limb([[lean * th * 0.1, th * 0.38, 0], [lean * th * 0.36, th * 0.82, th * 0.12], [lean * th * 0.72, th * 0.95, th * 0.16]], th * 0.022);
      limb([[lean * th * 0.18, th * 0.5, 0], [lean * th * 0.4, th * 0.7, -th * 0.16], [lean * th * 0.8, th * 0.8, -th * 0.2]], th * 0.02);
      const leaves: Dab[] = [];
      const bare = frost > 0.4;
      const tints = bare ? ['#4a3e34', '#5a4c40'] : mood.cheer > 0.6 && mood.warmth > 0.35 ? ['#eef0e6', '#6b8a42', '#55773a', '#dfe6d2', '#4f6f34'] : ['#4f6f34', '#5f7d3c', '#42602e'];
      for (let i = 0; i < (bare ? 30 : 60); i++) {
        const t = mix(0.3, 1.05, random());
        const u = th * (bare ? 0.035 : mix(0.09, 0.15, random()));
        leaves.push({ at: [lean * th * t * 0.8 + (random() - 0.5) * th * 0.2, th * (0.72 + 0.25 * Math.sin(t * 2.6)) + (random() - 0.5) * th * 0.16, (random() - 0.5) * th * 0.5], scale: [u * 1.5, u * 0.75, u * 1.2], color: tints[Math.floor(random() * tints.length)] });
      }
      tree.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), leaves));
      place(tree, 0, topY, 0, [0, random() * 6.28, 0]);
      sway.push(tree);
    } else if (a.crown === 'sheep') {
      for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
        const angle = random() * Math.PI * 2, q = random() * 0.55;
        const [x, z] = around(angle, q);
        const animal = sheep(random, random() < 0.3);
        animal.scale.setScalar(Math.max(1, R * 0.13));
        place(animal, x, heightAt(x, z) - 0.03, z, [0, random() * 6.28, 0]);
      }
    } else if (a.crown === 'pillar') {
      const concrete = s.material('#c9c6bc');
      s.cylinder(R * 0.025 + 0.12, R * 0.035 + 0.18, Math.max(1.2, R * 0.16), [0, topY + Math.max(0.6, R * 0.08), 0], concrete, 4).rotation.y = Math.PI / 4;
      const dabs: Dab[] = [];
      for (let i = 0; i < 24; i++) { const angle = random() * 6.28, out = random() * R * 0.07, up = (1 - out / (R * 0.07)) * R * 0.07; dabs.push({ at: [R * 0.13 + Math.cos(angle) * out, topY + up * random() - 0.05, Math.sin(angle) * out], scale: R * mix(0.02, 0.035, random()), turn: [random(), random() * 6, random()] }); }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.6, 0.8], round: 0.4, rough: 0.07, base: rock, segments: 4 }), material, dabs));
    } else if (a.crown === 'stone') {
      place(block([R * 0.08 + 0.2, Math.max(1.3, R * 0.2) + 0.3, R * 0.05 + 0.15], 0.25, 0.7), 0, topY - 0.3, 0, [0.05, random() * 3, 0.08]);
    } else if (a.crown === 'crater') {
      const dabs: Dab[] = [];
      for (let i = 0; i < 12; i++) { const angle = random() * 6.28; const [x, z] = [Math.cos(angle) * craterR * mix(0.7, 1.2, random()), Math.sin(angle) * craterR * mix(0.7, 1.2, random()) * ZS]; dabs.push({ at: [x, heightAt(x, z) - 0.05, z], scale: R * mix(0.025, 0.05, random()), turn: [random(), random() * 6, random()] }); }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.6, 0.8], round: 0.3, rough: 0.07, base: rock, segments: 4 }), material, dabs));
    }

    return s.finish({
      footprint: R * Math.max(1, ZS * 0.8),
      update: sway.length ? (_dt, time) => { for (const tree of sway) tree.rotation.z = Math.sin(time * mix(0.5, 2.5, mood.energy)) * 0.012 * (1 + mood.energy); } : undefined,
    });
  },
});
