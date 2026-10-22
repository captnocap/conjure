import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { halo, lamp, paint, shade, skin, weather, write } from './paint';

type P3 = [number, number, number];
const PAINTS = { blue: '#2f5f9c', yellow: '#e0ae1c', oxide: '#9a4030', grey: '#8e979b', green: '#3f7a56', orange: '#e2671f' } as const;

export default defineThing({
  questions: {
    kind: choice('What kind of bin is it?', {
      stillage: 'A sheet-steel stillage with corner posts and fork pockets, the standard gear bin.',
      cage: 'A mesh-sided cage pallet, the contents visible through the wire.',
      tray: 'A long low tray, knee high, made for carrying lashing rods aboard.',
      drum: 'A cut-down oil drum pressed into service.',
    }),
    contents: choice('What is it full of?', {
      twistlocks: 'Twistlocks: fist-sized steel castings with little levers, heaped like knucklebones.',
      rods: 'Long lashing rods standing in a bristling bundle.',
      chains: 'Heavy lashing chain, piled and spilling over the side.',
      mixed: 'Everything at once: locks, rods, chain and turnbuckles.',
      dregs: 'Almost nothing: a few forgotten locks in rusty rainwater and dead leaves.',
    }),
    fill: score('How full is it?', ['A layer on the bottom', 'Half full', 'Level with the rim', 'Heaped well above the rim']),
    colour: choice('What colour is the bin painted?', {
      blue: 'Dock-company blue.',
      yellow: 'Chipped safety yellow.',
      oxide: 'Red oxide.',
      grey: 'Galvanised grey, never painted.',
      green: 'Faded machinery green.',
      orange: 'Orange, borrowed from another terminal.',
    }),
    locks: choice('If there are twistlocks, how are they marked?', {
      plain: 'Plain galvanised grey.',
      yellow: 'Yellow-painted for semi-automatic locks.',
      coded: 'Red and green daubs for left-hand and right-hand locks, all mixed together.',
      rusty: 'Uniform brown rust, seized solid.',
    }),
    left: choice('What did the last shift leave behind on it?', {
      hardhat: 'A hard hat hung on the corner post.',
      gloves: 'A pair of rigger gloves draped over the rim.',
      thermos: 'A steel thermos and its cup.',
      radio: 'A handheld radio, still switched on.',
      vest: 'A hi-vis vest thrown over the side.',
      clipboard: 'A tally clipboard hanging from a hook.',
      nothing: 'Nothing at all.',
    }),
    stencil: choice('What is stencilled on the side?', {
      twistlocks: 'TWISTLOCKS', gear: 'GEAR BIN and a number', lashing: 'LASHING', keep: 'DO NOT REMOVE', scrap: 'SCRAP', none: 'Nothing.',
    }),
    spilled: noul('Has some of it spilled onto the ground around the bin?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = PAINTS[a.colour];
    const rect = a.kind !== 'drum';
    const W = a.kind === 'tray' ? 2.3 : a.kind === 'drum' ? 0.6 : 1.25, D = a.kind === 'tray' ? 0.8 : a.kind === 'drum' ? 0.6 : 0.95;
    const H = a.kind === 'tray' ? 0.38 : a.kind === 'drum' ? 0.62 : 0.72, F = rect ? 0.13 : 0.02;
    const text = { twistlocks: 'TWISTLOCKS', gear: `GEAR BIN ${1 + Math.floor(random() * 30)}`, lashing: 'LASHING', keep: 'DO NOT REMOVE', scrap: 'SCRAP', none: '' }[a.stencil];
    const ink = a.colour === 'yellow' || a.colour === 'grey' ? '#1e1e1e' : '#f1ede0';
    const wallTex = (label: string, w = 512) => paint(w, 256, (ctx, cw, ch) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, cw, ch);
      for (let i = 0; i < 200; i++) { ctx.fillStyle = random() < 0.5 ? shade(base, -0.14) : shade(base, 0.1); ctx.fillRect(random() * cw, random() * ch, 3 + random() * 12, 2 + random() * 6); }
      ctx.strokeStyle = shade(base, -0.3); ctx.lineWidth = 6;
      for (const x of [0.33, 0.66]) { ctx.beginPath(); ctx.moveTo(cw * x, 0); ctx.lineTo(cw * x, ch); ctx.stroke(); }
      if (label) write(ctx, label, cw / 2, ch * 0.5, ch * (w > 512 ? 0.2 : 0.3), ink, 'bold SIZEpx monospace', cw * (w > 512 ? 0.27 : 0.86));
      // Chips and scrapes down to bare metal.
      for (let i = 0; i < 30 + mood.wear * 90; i++) { ctx.fillStyle = random() < 0.5 ? '#6a4a34' : '#9a9a94'; ctx.fillRect(random() * cw, random() * ch, 2 + random() * 16 * mood.wear, 2 + random() * 4); }
      weather(ctx, cw, ch, random, 0.25 + mood.wear * 0.75);
    });
    const steel = s.material('#7d8386', { metalness: 0.6, roughness: 0.45 });
    const rustMass = s.material('#3a2c24', { roughness: 1 });
    const frame = s.material(shade(base, -0.2), { metalness: 0.2 });
    const posts: P3[] = [];
    let rim = F + H;

    if (a.kind === 'drum') {
      const tex = wallTex(text, 1024);
      s.mesh(new THREE.CylinderGeometry(W / 2, W / 2, H, 28, 1, true), skin(tex, { side: THREE.DoubleSide, metalness: 0.3, roughness: 0.6 }), [0, F + H / 2, 0]).rotation.y = Math.PI;
      s.cylinder(W / 2, W / 2, 0.02, [0, 0.01, 0], frame, 28);
      for (const y of [0.22, 0.44]) s.ring(W / 2 + 0.004, 0.012, [0, y, 0], frame).rotation.x = Math.PI / 2;
      // A ragged torch-cut rim.
      s.ring(W / 2, 0.012, [0, rim, 0], s.material('#5a4a40', { metalness: 0.5 })).rotation.x = Math.PI / 2;
    } else {
      const front = skin(wallTex(text), { side: THREE.DoubleSide, metalness: 0.2, roughness: 0.65 });
      const plain = skin(wallTex(''), { side: THREE.DoubleSide, metalness: 0.2, roughness: 0.65 });
      if (a.kind === 'cage') {
        const meshTex = paint(256, 256, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          ctx.strokeStyle = '#9aa3a6'; ctx.lineWidth = 5;
          for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 0); ctx.lineTo(i * 32, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * 32); ctx.lineTo(w, i * 32); ctx.stroke(); }
        });
        const wire = new THREE.MeshStandardMaterial({ map: meshTex, alphaTest: 0.5, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 });
        for (const z of [-D / 2, D / 2]) s.mesh(new THREE.PlaneGeometry(W, H), wire, [0, F + H / 2, z]);
        for (const x of [-W / 2, W / 2]) s.mesh(new THREE.PlaneGeometry(D, H), wire, [x, F + H / 2, 0]).rotation.y = Math.PI / 2;
        for (const y of [F + 0.02, rim]) { for (const z of [-D / 2, D / 2]) s.box([W, 0.04, 0.04], [0, y, z], frame); for (const x of [-W / 2, W / 2]) s.box([0.04, 0.04, D], [x, y, 0], frame); }
        if (text) s.label(text, 0.7, 0.18, [0, F + H * 0.55, D / 2 + 0.012], ink, base).castShadow = false;
      } else {
        for (const z of [-D / 2, D / 2]) s.mesh(new THREE.PlaneGeometry(W, H), z > 0 ? front : plain, [0, F + H / 2, z]);
        for (const x of [-W / 2, W / 2]) s.mesh(new THREE.PlaneGeometry(D, H), plain, [x, F + H / 2, 0]).rotation.y = Math.PI / 2;
        for (const z of [-D / 2, D / 2]) s.box([W + 0.04, 0.035, 0.05], [0, rim, z], frame);
        for (const x of [-W / 2, W / 2]) s.box([0.05, 0.035, D + 0.04], [x, rim, 0], frame);
      }
      s.box([W, 0.03, D], [0, F, 0], frame);
      const up = a.kind === 'tray' ? 0.1 : 0.16;
      for (const x of [-W / 2, W / 2]) for (const z of [-D / 2, D / 2]) {
        s.box([0.07, H + F + up, 0.07], [x, (H + F + up) / 2, z], frame);
        s.box([0.11, 0.02, 0.11], [x, H + F + up, z], steel);
        posts.push([x, H + F + up + 0.01, z]);
      }
      for (const x of a.kind === 'tray' ? [-0.8, 0, 0.8] : [-W / 2 + 0.12, 0, W / 2 - 0.12]) s.box([0.12, F - 0.02, D], [x, (F - 0.02) / 2, 0], frame);
    }

    // What it holds.
    const inside = (m = 0.07): [number, number] => {
      if (rect) return [(random() - 0.5) * (W - m * 2), (random() - 0.5) * (D - m * 2)];
      const t = random() * 6.283, r = Math.sqrt(random()) * (W / 2 - m);
      return [Math.cos(t) * r, Math.sin(t) * r];
    };
    const dregs = a.contents === 'dregs';
    const fill = dregs ? 0.06 : mix(0.12, 1.05, a.fill);
    const level = F + 0.03 + fill * (H - 0.06);
    const mound = (x: number, z: number) => level + (dregs ? 0 : (0.05 + a.fill * 0.14) * (1 - Math.min(1, (x / (W / 2)) ** 2 + (z / (D / 2)) ** 2)));
    if (!dregs) {
      const massH = Math.min(level, rim - 0.02) - F;
      if (rect) s.box([W - 0.04, massH, D - 0.04], [0, F + massH / 2, 0], rustMass);
      else s.cylinder(W / 2 - 0.02, W / 2 - 0.02, massH, [0, F + massH / 2, 0], rustMass, 20);
      if (level > rim - 0.02) { const cap = s.ball([W * 0.42, (level - rim) + 0.1, D * 0.42], [0, rim - 0.06, 0], rustMass, 14); cap.castShadow = false; }
    } else {
      const water = new THREE.MeshStandardMaterial({ color: '#5a3d24', roughness: 0.08, metalness: 0.35 });
      if (rect) s.box([W - 0.04, 0.02, D - 0.04], [0, F + 0.06, 0], water); else s.cylinder(W / 2 - 0.02, W / 2 - 0.02, 0.02, [0, F + 0.06, 0], water, 20);
      const leaves = Array.from({ length: 9 }, () => { const [x, z] = inside(); return { at: [x, F + 0.073, z] as P3, size: 0.6 + random() * 0.8, color: ['#8a5a22', '#b07a2a', '#5f4a22'][Math.floor(random() * 3)] }; });
      s.scatter(new THREE.CircleGeometry(0.035, 5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 1 }), leaves).castShadow = false;
    }

    const lockGeometry = mergeGeometries([
      new THREE.BoxGeometry(0.15, 0.035, 0.11),
      new THREE.CylinderGeometry(0.03, 0.065, 0.085, 4).rotateY(Math.PI / 4).translate(0, 0.058, 0),
      new THREE.CylinderGeometry(0.065, 0.03, 0.085, 4).rotateY(Math.PI / 4).translate(0, -0.058, 0),
      new THREE.CylinderGeometry(0.008, 0.008, 0.17, 5).rotateZ(Math.PI / 2).translate(0.15, 0, 0),
      new THREE.SphereGeometry(0.02, 6, 5).translate(0.235, 0, 0),
    ])!;
    const lockColour = () => {
      const rusty = random() < mood.wear * 0.6;
      if (a.locks === 'rusty' || rusty) return ['#6e4630', '#7d5236', '#5f3c2a'][Math.floor(random() * 3)];
      if (a.locks === 'yellow') return random() < 0.75 ? '#e2b420' : '#9aa1a4';
      if (a.locks === 'coded') return ['#c8322a', '#2f9a55', '#a2a9ac'][Math.floor(random() * 3)];
      return ['#a8afb2', '#8d9498', '#bcc2c4'][Math.floor(random() * 3)];
    };
    type Placed = { at: P3; turn: P3; scale?: number; colour?: string };
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Placed[]) => {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((item, i) => {
        q.setFromEuler(e.set(...item.turn));
        const k = item.scale ?? 1;
        m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(k, k, k));
        mesh.setMatrixAt(i, m);
        if (item.colour) mesh.setColorAt(i, new THREE.Color(item.colour));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const anyTurn = (): P3 => [random() * 6.283, random() * 6.283, random() * 6.283];
    const ground = (reach: number): [number, number] => {
      const t = random() * 6.283, r = (rect ? Math.hypot(W, D) / 2 : W / 2) * (0.75 + random() * reach);
      let x = Math.cos(t) * r, z = Math.sin(t) * r;
      if (rect && Math.abs(x) < W / 2 + 0.1 && Math.abs(z) < D / 2 + 0.1) { if (random() < 0.5) x = Math.sign(x || 1) * (W / 2 + 0.12 + random() * 0.3); else z = Math.sign(z || 1) * (D / 2 + 0.12 + random() * 0.3); }
      return [x, z];
    };
    const area = rect ? W * D : 0.28;
    const locks: Placed[] = [];
    const lockShare = { twistlocks: 1, rods: 0.12, chains: 0, mixed: 0.5, dregs: 0.07 }[a.contents];
    const lockCount = Math.round(area * 150 * lockShare);
    for (let i = 0; i < lockCount; i++) { const [x, z] = inside(0.09); locks.push({ at: [x, mound(x, z) + random() * 0.07, z], turn: anyTurn(), colour: lockColour() }); }
    if (a.spilled && lockShare > 0.1) for (let i = 0; i < 5 + Math.round(mood.density * 10); i++) { const [x, z] = ground(0.9); locks.push({ at: [x, 0.05, z], turn: [random() < 0.5 ? 0 : Math.PI / 2, random() * 6.283, 0], colour: lockColour() }); }
    instances(lockGeometry, new THREE.MeshStandardMaterial({ metalness: 0.45, roughness: 0.5 + mood.wear * 0.3 }), locks);

    // Lashing rods: long bars with an eye at one end and a knob at the other.
    if (a.contents === 'rods' || a.contents === 'mixed') {
      const count = a.contents === 'rods' ? 8 + Math.round(a.fill * 12) : 4;
      const rods: Placed[] = [], eyes: Placed[] = [];
      const rodLen = a.kind === 'tray' ? 2.2 : 1.9;
      for (let i = 0; i < count; i++) {
        if (a.kind === 'tray') {
          const z = (random() - 0.5) * (D - 0.2), y = level + 0.04 + random() * 0.12, tilt = (random() - 0.5) * 0.12, x = (random() - 0.5) * 0.25;
          rods.push({ at: [x, y, z], turn: [0, tilt, Math.PI / 2 + (random() - 0.5) * 0.08] });
          eyes.push({ at: [x + rodLen / 2 * Math.cos(tilt), y, z - rodLen / 2 * Math.sin(tilt)], turn: [Math.PI / 2, 0, 0] });
        } else {
          const lean = 0.18 + random() * 0.3, around = random() * 6.283;
          const [bx, bz] = inside(0.2);
          const dir = new THREE.Vector3(Math.sin(lean) * Math.cos(around), Math.cos(lean), Math.sin(lean) * Math.sin(around));
          const foot = new THREE.Vector3(bx * 0.5, F + 0.05, bz * 0.5);
          const mid = foot.clone().addScaledVector(dir, rodLen / 2), tip = foot.clone().addScaledVector(dir, rodLen);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), e = new THREE.Euler().setFromQuaternion(q);
          rods.push({ at: mid.toArray() as P3, turn: [e.x, e.y, e.z] });
          eyes.push({ at: tip.toArray() as P3, turn: [e.x, e.y + random() * 3, e.z] });
        }
      }
      const rodMaterial = s.material(mood.wear > 0.6 ? '#7a5a44' : '#8f979a', { metalness: 0.6, roughness: 0.45 });
      instances(new THREE.CylinderGeometry(0.014, 0.014, rodLen, 6), rodMaterial, rods);
      instances(new THREE.TorusGeometry(0.035, 0.012, 5, 10), rodMaterial, eyes);
      if (a.spilled) { const r = s.rod([W / 2 + 0.25, 0.02, -0.5], [W / 2 + 0.5, 0.02, 1.2], 0.014, rodMaterial); r.castShadow = true; }
    }
    // Chain: heaped links, and a run of it over the rim to the ground.
    if (a.contents === 'chains' || a.contents === 'mixed') {
      const links: Placed[] = [];
      const heap = Math.round(area * (a.contents === 'chains' ? 260 : 70));
      for (let i = 0; i < heap; i++) { const [x, z] = inside(0.08); links.push({ at: [x, mound(x, z) + random() * 0.04, z], turn: anyTurn() }); }
      const run = (points: P3[]) => {
        const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
        const n = Math.round(curve.getLength() / 0.07);
        for (let i = 0; i <= n; i++) { const p = curve.getPoint(i / n), t = curve.getTangent(i / n); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), t), e = new THREE.Euler().setFromQuaternion(q); links.push({ at: p.toArray() as P3, turn: [e.x + (i % 2) * Math.PI / 2, e.y, e.z] }); }
      };
      const ex = (rect ? W / 2 : W / 2) + 0.02, cz = (random() - 0.5) * D * 0.5;
      run([[ex - 0.3, level + 0.05, cz], [ex - 0.06, rim + 0.05, cz], [ex + 0.03, rim - 0.1, cz], [ex + 0.05, 0.25, cz + 0.02], [ex + 0.12, 0.03, cz + 0.05], ...(a.spilled ? [[ex + 0.4, 0.025, cz + 0.3] as P3, [ex + 0.3, 0.025, cz + 0.7] as P3, [ex + 0.6, 0.025, cz + 0.9] as P3] : [[ex + 0.3, 0.025, cz + 0.15] as P3])]);
      instances(new THREE.TorusGeometry(0.035, 0.011, 5, 10).scale(1.35, 1, 1), s.material(mood.wear > 0.55 ? '#6b4b38' : '#70777b', { metalness: 0.65, roughness: 0.4 }), links);
      if (a.contents === 'mixed') for (let i = 0; i < 3; i++) { const [x, z] = inside(0.25); s.cylinder(0.03, 0.03, 0.42, [x, mound(x, z) + 0.05, z], steel, 8).rotation.set(1.4 + random() * 0.3, random() * 3, 0); }
    }

    // Left behind by the last shift.
    const corner: P3 = rect ? posts[1] : [0.05, rim + 0.01, W / 2 - 0.02];
    const beside: P3 = [W / 2 + 0.28, 0, D / 2 - 0.1];
    let led: THREE.MeshStandardMaterial | null = null;
    if (a.left === 'hardhat') {
      const shell = s.material(['#f2f2ee', '#f0c21c', '#e2671f', '#2f5f9c'][Math.floor(random() * 4)], { roughness: 0.35 });
      const g = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), shell); dome.scale.set(1, 0.95, 1.15);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.014, 20), shell); brim.scale.z = 1.25; brim.position.z = 0.02;
      const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.012, 5, 16, Math.PI), shell); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.15, 0.97, 1);
      for (const m of [dome, brim, ridge]) { m.castShadow = true; g.add(m); }
      g.position.set(corner[0], corner[1] - (rect ? 0.03 : 0), corner[2]);
      g.rotation.set(rect ? 0.2 : -0.5, random() * 6, rect ? -0.15 : 0);
      s.root.add(g);
    } else if (a.left === 'gloves') {
      const hide = s.material(random() < 0.5 ? '#c9a46a' : '#e2671f', { roughness: 1 });
      for (const dx of [-0.11, 0.1]) {
        const x = (rect ? 0 : 0) + dx + (random() - 0.5) * 0.04, z = rect ? D / 2 : W / 2;
        s.box([0.1, 0.03, 0.14], [x, rim + 0.03, z - 0.05], hide).rotation.y = (random() - 0.5) * 0.4;
        const palm = s.box([0.1, 0.16, 0.03], [x, rim - 0.06, z + 0.035], hide); palm.rotation.z = (random() - 0.5) * 0.3;
        for (let f = 0; f < 4; f++) s.box([0.02, 0.07, 0.025], [x - 0.036 + f * 0.024, rim - 0.17, z + 0.037], hide);
        s.box([0.025, 0.06, 0.025], [x + 0.065 * Math.sign(dx), rim - 0.08, z + 0.037], hide).rotation.z = -0.6 * Math.sign(dx);
      }
    } else if (a.left === 'thermos') {
      const at: P3 = rect ? [posts[1][0] - 0.2, rim + 0.02, posts[1][2]] : beside;
      const onRim = rect && a.kind !== 'cage';
      const p: P3 = onRim ? [W / 2 - 0.25, 0, D / 2 + 0.16] : at[1] > 0.1 ? [W / 2 + 0.2, 0, D / 2 - 0.1] : beside;
      s.cylinder(0.045, 0.045, 0.26, [p[0], 0.13, p[2]], s.material('#aeb5b8', { metalness: 0.8, roughness: 0.25 }), 14);
      s.cylinder(0.04, 0.046, 0.05, [p[0], 0.285, p[2]], s.material('#1f4f86'), 14);
      s.cylinder(0.045, 0.038, 0.06, [p[0] + 0.14, 0.03, p[2] + 0.05], s.material('#1f4f86'), 14);
      s.cylinder(0.039, 0.039, 0.004, [p[0] + 0.14, 0.058, p[2] + 0.05], s.material('#4a2a14', { roughness: 0.2 }), 14);
      for (let i = 0; i < 3; i++) s.ball([0.025 + i * 0.01, 0.035, 0.025 + i * 0.01], [p[0] + 0.14, 0.11 + i * 0.06, p[2] + 0.05], halo('#ffffff', 0.3), 8).castShadow = false;
    } else if (a.left === 'radio') {
      const p: P3 = rect ? [corner[0], corner[1], corner[2]] : [beside[0], 0, beside[2]];
      s.box([0.065, 0.14, 0.04], [p[0], p[1] + 0.07, p[2]], s.material('#1c1e20', { roughness: 0.5 }));
      s.cylinder(0.006, 0.009, 0.16, [p[0] - 0.02, p[1] + 0.22, p[2]], s.material('#1c1e20'), 6);
      s.box([0.04, 0.03, 0.005], [p[0] + 0.005, p[1] + 0.1, p[2] + 0.022], lamp('#7dff9a', 0.9));
      led = lamp('#ff3a2a', 2.5);
      s.box([0.012, 0.012, 0.012], [p[0] + 0.02, p[1] + 0.146, p[2]], led);
    } else if (a.left === 'vest') {
      const tex = paint(128, 128, (ctx, w, h) => { ctx.fillStyle = random() < 0.6 ? '#f2e21c' : '#ff7a1a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d5dada'; ctx.fillRect(0, h * 0.25, w, h * 0.1); ctx.fillRect(0, h * 0.62, w, h * 0.1); ctx.fillRect(w * 0.22, 0, w * 0.08, h); ctx.fillRect(w * 0.7, 0, w * 0.08, h); });
      const cloth = skin(tex, { side: THREE.DoubleSide, roughness: 0.95 });
      const z = rect ? D / 2 : W / 2, x = rect ? -W * 0.18 : 0;
      const outer = s.mesh(new THREE.PlaneGeometry(0.5, 0.45, 6, 1), cloth, [x, rim - 0.2, z + 0.03]);
      outer.rotation.x = 0.06; outer.rotation.z = (random() - 0.5) * 0.2;
      const over = s.mesh(new THREE.PlaneGeometry(0.5, 0.22), cloth, [x, rim + 0.035, z - 0.08]);
      over.rotation.x = -Math.PI / 2 + 0.15;
    } else if (a.left === 'clipboard') {
      const tex = paint(128, 180, (ctx, w, h) => { ctx.fillStyle = '#8a6a44'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f3efe2'; ctx.fillRect(8, 18, w - 16, h - 26); ctx.fillStyle = '#9aa1a4'; ctx.fillRect(w * 0.3, 4, w * 0.4, 20); ctx.strokeStyle = '#3a4a7a'; ctx.lineWidth = 2; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(16, 40 + i * 15); ctx.lineTo(16 + (w - 40) * (0.5 + random() * 0.5), 40 + i * 15); ctx.stroke(); if (random() < 0.6) { ctx.strokeStyle = '#b3201c'; ctx.beginPath(); ctx.moveTo(w - 24, 36 + i * 15); ctx.lineTo(w - 14, 44 + i * 15); ctx.stroke(); ctx.strokeStyle = '#3a4a7a'; } } });
      const z = rect ? D / 2 : W / 2, x = rect ? W * 0.28 : 0;
      const board = s.mesh(new THREE.PlaneGeometry(0.23, 0.32), skin(tex, { side: THREE.DoubleSide }), [x, rim - 0.2, z + 0.022]);
      board.rotation.z = (random() - 0.5) * 0.25;
      s.rod([x, rim + 0.01, z], [x, rim - 0.05, z + 0.02], 0.006, steel);
    }

    // Dunnage and stains, by how crowded the scene is.
    if (mood.density > 0.45) { const stain = s.cylinder(0.5, 0.5, 0.004, [-(W / 2) - 0.1, 0.002, D / 2 + 0.1], new THREE.MeshStandardMaterial({ color: '#221c16', roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }), 18); stain.scale.z = 0.6; stain.castShadow = false; }
    if (mood.density > 0.7) for (let i = 0; i < 2; i++) s.box([0.1, 0.1, 0.9], [-(W / 2) - 0.3 - i * 0.16, 0.05, -0.1 + i * 0.1], s.material('#a07a4a', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.4;

    return s.finish({
      footprint: Math.hypot(W, D) / 2 + 0.25,
      update: (_dt, time) => { if (led) led.emissiveIntensity = Math.sin(time * mix(1.5, 5, mood.energy)) > 0.6 ? 3 : 0.15; },
    });
  },
});
