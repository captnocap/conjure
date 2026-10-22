import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    age: choice('How long ago did it fall?', {
      fresh: 'Last night: raw pale rock, splintered white wood, nothing grown back.',
      season: 'A season ago: the boulders have dulled and the first weeds are in.',
      old: 'Decades ago: lichen on the blocks, fireweed and young birch between them.',
      remembered: 'Long ago, and not forgotten: a small memorial with candles stands at its foot.',
    }),
    size: score('How much came down?', ['A few blocks and a streak of gravel', 'A real slide', 'Half the mountainside, a great fan of boulders']),
    hit: choice('What lay in its path?', {
      wild: 'Nothing: bare hillside and birch scrub.',
      road: 'The valley road, now buried under the fan with its guard rail torn away.',
      field: 'A hay meadow: a broken fence and white-wrapped bales.',
      cabin: 'A small red cabin, shoved off its footings and half buried.',
    }),
    sign: choice('What warns people now?', {
      triangle: 'A red-bordered triangular rockfall sign on a leaning post.',
      board: 'A hand-painted board reading RASFARE.',
      tape: 'Orange cones and a sagging line of barrier tape.',
      flattened: 'There was a sign. It lies bent under a boulder.',
    }),
    monster: noul('Did one house-sized block roll out beyond all the rest?'),
    dust: noul('Is dust still hanging over it, and gravel still trickling?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const snowy = mood.warmth < 0.22;
    const oldness = { fresh: 0, season: 0.35, old: 0.8, remembered: 1 }[a.age];
    const W = 17, D = 7.5, H = mix(6.5, 9.5, random());
    const R = mix(4.2, 8.5, a.size), fanH = mix(0.5, 1.5, a.size);
    const F = R + 1.2, foot = -1;
    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const sway = mix(0.5, 1.6, random()) * (random() < 0.5 ? -1 : 1);
    const scarHalf = (t: number) => mix(mix(1.5, 3.2, a.size), mix(0.5, 1.2, a.size), t);
    const scarX = (t: number) => Math.sin(t * 2.6 + p1) * sway * t;
    /** Height of the ground, and how much of it is slide debris (0 to 1). */
    const ground = (x: number, z: number): [number, number] => {
      const edge = clamp01(1 - Math.abs(x / (W / 2)) ** 3.2);
      const lump = Math.sin(x * 0.9 + p1) * Math.cos(z * 0.8 + p2) * 0.35 + Math.sin(x * 2.3 + z * 1.9 + p3) * 0.14;
      let y = 0, debris = 0;
      if (z < foot) {
        const t = clamp01((foot - z) / (D + foot));
        y = H * t ** 0.9 * edge + lump * t * edge * 1.6;
        const d = Math.abs(x - scarX(t)) / scarHalf(t);
        debris = clamp01((1 - d) * 3) * (t > 0.93 ? (1 - t) / 0.07 : 1);
        y -= debris * 0.5 * edge * Math.min(1, t * 4);
      }
      const r = Math.hypot(x, (z - foot) * 1.05), reach = R * (1 - Math.abs(Math.atan2(x, Math.max(0.01, z - foot + 2.5))) * 0.25);
      const fan = clamp01(1 - r / reach);
      if (z >= foot - 1.2) {
        y += fanH * fan ** 1.4 * (z < foot ? clamp01((z - foot + 1.2) / 1.2) : 1);
        debris = Math.max(debris, clamp01(fan * 2.6));
      }
      const rim = clamp01((F - z) / 1.5) * clamp01(1 - Math.abs(x / (W / 2)) ** 6);
      return [(y + 0.05 + lump * 0.12) * rim, debris];
    };

    // Terrain as one flat-shaded sheet with painted vertices.
    const nx = 56, nz = 52;
    const geometry = new THREE.PlaneGeometry(W, D + F, nx, nz).toNonIndexed();
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, (F - D) / 2);
    const pos = geometry.attributes.position;
    const colour = new Float32Array(pos.count * 3);
    const rockDark = new THREE.Color('#55595c'), scar = new THREE.Color(snowy ? '#7d7466' : '#bfb294').lerp(new THREE.Color(snowy ? '#6f6f69' : '#9d9d93'), oldness * 0.8);
    const green = new THREE.Color(snowy ? '#eef2f4' : mood.warmth > 0.7 ? '#8a8a3c' : '#56703a'), meadow = new THREE.Color(snowy ? '#f3f5f7' : a.hit === 'field' ? '#8fa64e' : '#6f8448');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 3) {
      let cx = 0, cz = 0;
      for (let k = 0; k < 3; k++) {
        const [y] = ground(pos.getX(i + k), pos.getZ(i + k));
        pos.setY(i + k, y);
        cx += pos.getX(i + k) / 3;
        cz += pos.getZ(i + k) / 3;
      }
      const debris = ground(cx, cz)[1];
      const t = clamp01((foot - cz) / (D + foot));
      const veg = Math.sin(cx * 1.7 + p2) * Math.cos(cz * 1.3 + p3) + Math.sin(cx * 4.1 + cz * 3.3) * 0.4;
      if (cz < foot) c.copy(veg > mix(0.1, 0.7, t) ? rockDark : green).offsetHSL(0, 0, (random() - 0.5) * 0.05);
      else c.copy(meadow).offsetHSL(0, 0, (random() - 0.5) * 0.04);
      if (debris > 0.3) {
        c.lerp(scar, clamp01(debris * 1.4)).offsetHSL(0, 0, (random() - 0.5) * 0.08);
        if (oldness > 0.5 && random() < 0.25) c.lerp(new THREE.Color('#6f8448'), 0.6);
      }
      for (let k = 0; k < 3; k++) colour.set([c.r, c.g, c.b], (i + k) * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3));
    geometry.computeVertexNormals();
    s.mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    // A cut face behind, so the slope reads as a block of mountain and not a sheet.
    const back = new THREE.Shape();
    back.moveTo(-W / 2, 0);
    for (let i = 0; i <= 40; i++) { const x = -W / 2 + (i / 40) * W; back.lineTo(x, ground(x, -D)[0]); }
    back.lineTo(W / 2, 0);
    s.mesh(new THREE.ShapeGeometry(back), new THREE.MeshStandardMaterial({ color: '#3f4245', roughness: 1, side: THREE.DoubleSide }), [0, 0, -D]);

    // The fan of blocks.
    const blocks: { at: [number, number, number]; size: number; color: string }[] = [];
    const pale = snowy ? ['#9a9488', '#857f74', '#aaa498', '#77726a', '#948a78'] : oldness < 0.5 ? ['#e6dfcc', '#d2cab6', '#efe9d9', '#a8a294', '#cdb48c'] : ['#a3a39a', '#8f928c', '#b3b1a6', '#7f8a78', '#9a9c8e'];
    const count = Math.round(mix(40, 240, a.size) * mix(0.7, 1.3, mood.density));
    const solids: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const onSlope = random() < 0.28;
      let x: number, z: number, size: number;
      if (onSlope) {
        const t = random() ** 1.5 * 0.9;
        z = foot - t * (D + foot);
        x = scarX(t) + (random() - 0.5) * 1.6 * scarHalf(t);
        size = 0.12 + random() * 0.22;
      } else {
        const angle = (random() - 0.5) * 2.2, r = R * (0.08 + 0.95 * random() ** 0.75) * (1 - Math.abs(angle) * 0.22);
        x = Math.sin(angle) * r;
        z = foot - 0.8 + Math.cos(angle) * r;
        size = mix(0.14, 0.75, (r / R) * random()) + random() * 0.1;
      }
      if (Math.abs(x) > W / 2 - 0.6 || z > F - 0.6) continue;
      blocks.push({ at: [x, ground(x, z)[0] + size * 0.3, z], size, color: pale[Math.floor(random() * pale.length)] });
      if (size > 0.45) solids.push([x, z, size]);
    }
    const block = new THREE.DodecahedronGeometry(1, 0);
    block.scale(1.15, 0.8, 0.95);
    const blockMesh = new THREE.InstancedMesh(block, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), blocks.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    blocks.forEach((b, i) => {
      e.set(random() * 3, random() * 3, random() * 3);
      m.compose(new THREE.Vector3(...b.at), q.setFromEuler(e), new THREE.Vector3(b.size, b.size, b.size));
      blockMesh.setMatrixAt(i, m);
      blockMesh.setColorAt(i, new THREE.Color(b.color));
    });
    blockMesh.castShadow = blockMesh.receiveShadow = true;
    s.root.add(blockMesh);
    if (snowy) s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#f3f5f7', roughness: 1 }), blocks.filter((b) => b.size > 0.42).map((b) => ({ at: [b.at[0], b.at[1] + b.size * 0.6, b.at[2]] as [number, number, number], size: b.size * 0.45 })));
    if (a.monster) {
      const mx = (random() - 0.5) * 5, mz = Math.min(F - 2.6, foot + R * 0.92), size = mix(1.5, 2.3, random());
      const giant = s.mesh(new THREE.DodecahedronGeometry(size, 0), new THREE.MeshStandardMaterial({ color: pale[1], roughness: 1, flatShading: true }), [mx, ground(mx, mz)[0] + size * 0.62, mz]);
      giant.rotation.set(random(), random(), random());
      giant.scale.set(1.15, 0.9, 1);
      // The furrow it ploughed.
      for (let i = 1; i < 6; i++) s.ball([size * 0.6, 0.12, 0.5], [mx * (1 - i * 0.12), ground(mx * (1 - i * 0.12), mz - i * 0.9)[0] + 0.02, mz - i * 0.9 - size * 0.4], s.material('#4a3f33', { roughness: 1 }), 8);
    }

    // Birches: standing at the margins, snapped along the path.
    const bark = s.material('#ecebe4', { roughness: 0.8 }), barkDark = s.material('#2b2b2b'), heart = s.material('#e3cfa0', { roughness: 0.9 });
    const leafColour = snowy ? null : mood.warmth > 0.7 ? ['#d9a82a', '#c98a22', '#e3c33a'] : ['#7fa84a', '#6a9440', '#93b85a'];
    const birch = (x: number, z: number, snapped: boolean) => {
      const y = ground(x, z)[0] - 0.1, h = mix(2.6, 4.6, random());
      const leanX = (random() - 0.5) * 0.3, leanZ = (random() - 0.5) * 0.3;
      if (!snapped) {
        s.rod([x, y, z], [x + leanX, y + h, z + leanZ], 0.075, bark, 0.03);
        for (let i = 1; i < 4; i++) s.cylinder(0.07, 0.072, 0.05, [x + leanX * i / 5, y + h * i / 5, z + leanZ * i / 5], barkDark, 6);
        if (leafColour) for (let i = 0; i < 4; i++) {
          const blob = s.mesh(new THREE.IcosahedronGeometry(mix(0.5, 0.85, random()), 0), new THREE.MeshStandardMaterial({ color: leafColour[i % 3], roughness: 1, flatShading: true }), [x + leanX + (random() - 0.5) * 0.9, y + h * mix(0.62, 1.02, random()), z + leanZ + (random() - 0.5) * 0.9]);
          blob.scale.y = 1.25;
        } else for (let i = 0; i < 4; i++) s.rod([x + leanX * 0.7, y + h * 0.7, z + leanZ * 0.7], [x + leanX + (random() - 0.5) * 1.4, y + h * mix(0.9, 1.2, random()), z + leanZ + (random() - 0.5) * 1.4], 0.02, barkDark, 0.008);
        return;
      }
      const stump = mix(0.4, 1.2, random());
      s.rod([x, y, z], [x + leanX * 0.3, y + stump, z + 0.15], 0.085, bark, 0.075);
      const splinter = s.mesh(new THREE.ConeGeometry(0.075, 0.38, 5), heart, [x + leanX * 0.3, y + stump + 0.16, z + 0.17]);
      splinter.rotation.z = 0.2;
      const along = random() * 0.9 - 0.45, fall = h * 0.8;
      const tipX = x + Math.sin(along) * fall, tipZ = z + 0.4 + Math.cos(along) * fall;
      s.rod([x + 0.15, y + stump * 0.5, z + 0.35], [tipX, ground(tipX, tipZ)[0] + 0.15, tipZ], 0.07, bark, 0.03);
      if (oldness < 0.5 && leafColour) s.mesh(new THREE.IcosahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: oldness < 0.2 ? leafColour[0] : '#8a6a3a', roughness: 1, flatShading: true }), [tipX, ground(tipX, tipZ)[0] + 0.3, tipZ]).scale.y = 0.55;
    };
    const standing = 5 + Math.round(mood.density * 5);
    for (let i = 0; i < standing; i++) {
      const side = i % 2 ? 1 : -1, t = random() * 0.5;
      const z = random() < 0.5 ? foot - t * (D + foot) : foot + random() * (F - 2);
      const x = side * mix(z < foot ? scarHalf(t) + 2 : R * 0.75 + 0.6, W / 2 - 1.2, random());
      if (Math.abs(x) < W / 2 - 0.8) birch(x, z, false);
    }
    const broken = oldness > 0.7 ? 1 : 3 + Math.round(a.size * 4);
    for (let i = 0; i < broken; i++) {
      const side = i % 2 ? 1 : -1, t = random() * 0.35;
      const z = foot - t * (D + foot) + random() * 2.5;
      birch(scarX(t) + side * (scarHalf(t) + 0.2 + random() * 1.2), z, true);
    }
    if (oldness > 0.7 && !snowy) {
      // Fireweed and saplings among the blocks.
      const flowers: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 90; i++) {
        const angle = (random() - 0.5) * 2, r = R * random() * 0.9, x = Math.sin(angle) * r, z = foot + Math.cos(angle) * r;
        if (z > F - 0.5) continue;
        flowers.push({ at: [x, ground(x, z)[0] + 0.3, z], size: 0.5 + random() * 0.5, color: random() < 0.55 && mood.cheer > 0.25 ? '#d9529a' : '#6a9440' });
      }
      s.scatter(new THREE.ConeGeometry(0.14, 0.8, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), flowers);
    }

    // What lay in the path.
    const rz = Math.min(F - 2.2, foot + Math.max(3.2, R * 0.62));
    if (a.hit === 'road') {
      const asphalt = s.material('#3d4144', { roughness: 0.9 });
      s.box([W - 0.8, 0.24, 3], [0, 0.1, rz], asphalt);
      for (let i = 0; i < 9; i++) s.box([0.9, 0.02, 0.1], [-W / 2 + 1.4 + i * 1.8, 0.225, rz], s.material('#e3b93a'));
      const steel = s.material('#b3babd', { metalness: 0.6, roughness: 0.4 });
      for (const side of [-1, 1]) {
        const x0 = side * (W / 2 - 0.6), x1 = side * mix(2.8, 4.2, random());
        s.box([Math.abs(x0 - x1), 0.28, 0.05], [(x0 + x1) / 2, 0.75, rz + 1.7], steel);
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1.5) s.box([0.08, 0.8, 0.08], [x, 0.4, rz + 1.75], steel);
        // The torn end, bent outward.
        const torn = s.box([2.2, 0.28, 0.05], [x1 - side * 0.9, 0.5, rz + 2.3], steel);
        torn.rotation.set(0.3, side * 0.7, -side * 0.25);
      }
    } else if (a.hit === 'field') {
      const post = s.material('#8a7a66', { roughness: 1 });
      for (let i = 0; i < 12; i++) {
        const x = -W / 2 + 1 + i * ((W - 2) / 11);
        const buried = ground(x, rz)[1] > 0.25;
        const fence = s.rod([x, ground(x, rz)[0] - 0.1, rz], [x + (buried ? (random() - 0.5) * 1.2 : 0), ground(x, rz)[0] + (buried ? 0.5 : 1.05), rz + (buried ? 0.6 + random() * 0.6 : 0)], 0.05, post);
        void fence;
        if (!buried && i < 11 && ground(x + (W - 2) / 11, rz)[1] <= 0.25) for (const h of [0.5, 0.9]) s.rod([x, ground(x, rz)[0] + h, rz], [x + (W - 2) / 11, ground(x + (W - 2) / 11, rz)[0] + h, rz], 0.012, s.material('#5c5f61'));
      }
      const wrap = s.material('#eef0ec', { roughness: 0.35 });
      const bales = 2 + Math.round(mood.density * 4);
      for (let i = 0; i < bales; i++) {
        const bx = (i % 2 ? 1 : -1) * (W / 2 - 1.6 - Math.floor(i / 2) * 1.5), bz = rz + 1.4 + (random() - 0.5) * 0.5;
        if (bz < F - 0.9) s.cylinder(0.62, 0.62, 1.2, [bx, ground(bx, bz)[0] + 0.6, bz], wrap, 14).rotation.set(Math.PI / 2, 0, random() * 0.6);
      }
    } else if (a.hit === 'cabin') {
      const cabin = new THREE.Group();
      const red = s.material('#9c2f22'), roof = s.material('#3f4447'), white = s.material('#eee9dc');
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 2.8), red);
      body.position.y = 1.1;
      const shape = new THREE.Shape([new THREE.Vector2(-1.9, 0), new THREE.Vector2(1.9, 0), new THREE.Vector2(0, 1.3)]);
      const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 3.1, bevelEnabled: false }), roof);
      gable.position.set(0, 2.2, -1.55);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.06), white);
      door.position.set(-0.7, 0.8, 1.42);
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.06), s.material('#27333a', { roughness: 0.2 }));
      pane.position.set(0.8, 1.3, 1.42);
      cabin.add(body, gable, door, pane);
      const cx = (random() - 0.5) * 3, cz = Math.min(F - 2.6, foot + R * 0.6);
      cabin.position.set(cx, ground(cx, cz)[0] - 0.75, cz);
      cabin.rotation.set(0.22, (random() - 0.5) * 1.2, mix(0.12, 0.3, random()) * (random() < 0.5 ? -1 : 1));
      cabin.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(cabin);
      for (let i = 0; i < 6; i++) s.box([1.6 + random(), 0.05, 0.16], [cx + (random() - 0.5) * 4, ground(cx, cz + 1.8)[0] + 0.08, cz + 1.8 + random() * 1.4], i % 2 ? red : white).rotation.y = random() * 3;
    }

    // The warning.
    const sx = (R * 0.55 + 1.6) * (sway > 0 ? -1 : 1), sz = Math.min(F - 1.2, a.hit === 'road' ? rz + 2.2 : foot + R * 0.5 + 1.5);
    const sy = ground(sx, sz)[0];
    const signGroup = new THREE.Group();
    signGroup.position.set(sx, sy - 0.15, sz);
    const galvanised = s.material('#9aa1a4', { metalness: 0.5, roughness: 0.5 });
    if (a.sign === 'triangle' || a.sign === 'flattened') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const tri = (inset: number, fill: string) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(128, 14 + inset * 1.9); ctx.lineTo(244 - inset * 1.7, 232 - inset); ctx.lineTo(12 + inset * 1.7, 232 - inset); ctx.closePath(); ctx.fill(); };
      tri(0, '#c8202f');
      tri(22, mix(0, 1, wear) > 0.7 ? '#e6dcc0' : '#f6f3ea');
      ctx.fillStyle = '#17181a';
      ctx.beginPath(); ctx.moveTo(150, 90); ctx.lineTo(192, 205); ctx.lineTo(150, 205); ctx.closePath(); ctx.fill();
      for (const [x, y, r] of [[118, 150, 9], [96, 180, 11], [128, 190, 8], [72, 200, 7], [112, 205, 6]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), galvanised);
      post.position.y = 1.3;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.6 }));
      plate.position.set(0, 2.25, 0.045);
      signGroup.add(post, plate);
      if (a.sign === 'flattened') {
        signGroup.rotation.set(-1.45, random() * 2, 0.2);
        signGroup.position.y = sy + 0.12;
        const pin = s.mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: pale[0], roughness: 1, flatShading: true }), [sx + Math.sin(signGroup.rotation.y) * 0.2, sy + 0.3, sz + 0.9]);
        pin.rotation.set(random(), random(), random());
      } else signGroup.rotation.set((random() - 0.5) * 0.2, (random() - 0.5) * 0.5, mix(0.14, 0.42, clamp01(wear + random() * 0.5)) * (random() < 0.5 ? -1 : 1));
    } else if (a.sign === 'board') {
      for (const dx of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), s.material('#8a7a66'));
        leg.position.set(dx, 0.95, 0);
        signGroup.add(leg);
      }
      const label = s.label('RASFARE', 1.7, 0.6, [0, 1.55, 0.05], '#b3261e', '#efe6c8');
      signGroup.add(label);
      signGroup.rotation.set(-0.08, (random() - 0.5) * 0.5, mix(0.1, 0.3, random()) * (random() < 0.5 ? -1 : 1));
    } else {
      const orange = s.material('#f0642a'), white = s.material('#f4f1e6');
      const span = 5.5, n = 4;
      const spots: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const cx = (i / (n - 1) - 0.5) * span + (random() - 0.5) * 0.4, cz = (random() - 0.5) * 0.8;
        const gy = ground(sx * 0 + cx, sz + cz)[0] - sy + 0.15;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 10), orange);
        cone.position.set(cx - sx, gy + 0.35, cz);
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.135, 0.14, 10), white);
        stripe.position.set(cx - sx, gy + 0.42, cz);
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), orange);
        base.position.set(cx - sx, gy + 0.02, cz);
        if (i === 1 && wear > 0.5) { cone.rotation.z = Math.PI / 2; cone.position.y = gy + 0.2; stripe.visible = false; }
        signGroup.add(cone, stripe, base);
        spots.push([cx - sx, cz]);
      }
      for (let i = 0; i < n - 1; i++) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(spots[i][0], 0.82, spots[i][1]), new THREE.Vector3((spots[i][0] + spots[i + 1][0]) / 2, 0.55, (spots[i][1] + spots[i + 1][1]) / 2), new THREE.Vector3(spots[i + 1][0], 0.82, spots[i + 1][1])]);
        const tape = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.03, 4), s.material(i % 2 ? '#f4f1e6' : '#e0312a'));
        tape.scale.y = 1;
        signGroup.add(tape);
      }
    }
    signGroup.traverse((node) => { node.castShadow = true; });
    s.root.add(signGroup);

    if (a.age === 'remembered') {
      const mx = -sx * 0.8, mz = Math.min(F - 1.2, sz + 0.3), my = ground(mx, mz)[0];
      s.box([0.7, 1.1, 0.22], [mx, my + 0.5, mz], s.material('#5a5d5f', { roughness: 0.6 })).rotation.y = -Math.sign(mx) * 0.3;
      s.label('1936', 0.5, 0.2, [mx - Math.sign(mx) * 0.03, my + 0.75, mz + 0.125], '#d9d2b8', '#5a5d5f').rotation.y = -Math.sign(mx) * 0.3;
      const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
        const cx = mx + (random() - 0.5) * 1.1, cz = mz + 0.35 + random() * 0.5;
        s.cylinder(0.06, 0.06, 0.16, [cx, my + 0.1, cz], s.material(i % 2 ? '#b3261e' : '#f4f1e6', { emissive: '#ff9a3a', emissiveIntensity: mix(0.6, 2.2, dusk) }), 8);
      }
      for (let i = 0; i < 6; i++) s.ball([0.1, 0.08, 0.1], [mx + (random() - 0.5) * 0.9, my + 0.12, mz + 0.3 + random() * 0.3], s.material(['#e8412f', '#f4f1e6', '#f2c230'][i % 3]), 6);
    }

    // Dust and trickling gravel.
    const puffs: THREE.Mesh[] = [];
    if (a.dust) {
      for (let i = 0; i < 9; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9d0bd', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 }));
        puff.userData.t = random();
        puff.userData.x = (random() - 0.5) * 3;
        s.root.add(puff);
        puffs.push(puff);
      }
    }
    const drift = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.t + time * mix(0.01, 0.05, mood.energy)) % 1;
        const z = foot - (1 - t) * (D + foot) * 0.7 + t * R * 0.5;
        const tt = clamp01((foot - z) / (D + foot));
        puff.position.set(scarX(tt) + puff.userData.x, ground(scarX(tt), z)[0] + 0.9 + t * 1.2, z);
        puff.scale.setScalar(0.9 + t * 1.8);
      }
    };
    drift(0);
    return s.finish({ footprint: W * 0.5, update: (_dt, time) => drift(time) });
  },
});
