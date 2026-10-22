import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { grime, paint, panel, pick, write } from './lib';

const BANNERS = {
  revival: ['REVIVAL', 'TONIGHT'],
  'jesus-saves': ['JESUS', 'SAVES'],
  'born-again': ['YE MUST BE', 'BORN AGAIN'],
  healing: ['HEALING &', 'DELIVERANCE'],
  'old-time': ['OLD TIME', 'CAMP MEETING'],
  welcome: ['WHOSOEVER', 'WILL MAY COME'],
} as const;

export default defineThing({
  questions: {
    hour: choice('What moment has the tent been caught in?', {
      'packed-night': 'Mid-service on a hot night: every bulb burning, chairs crowded close, fans and Bibles left on the seats.',
      'altar-call': 'The altar call: front rows shoved aside, a cleared space of trampled sawdust before the pulpit, handkerchiefs dropped.',
      'empty-dawn': 'The morning after: bulbs dark, chairs in tidy rows, nobody here.',
      'setting-up': 'Being raised: chairs still stacked, a ladder, coils of rope, only a few rows set.',
      'storm-struck': 'After a storm: one end of the canvas collapsed, a pole leaning, chairs thrown over.',
    }),
    stripes: choice('What does the canvas look like?', {
      'red-white': 'Broad red and white stripes, a circus top turned to the Lord.',
      'blue-white': 'Blue and white stripes.',
      'yellow-white': 'Faded yellow and white stripes.',
      'green-white': 'Dark green and white stripes.',
      canvas: 'Plain army-surplus canvas, tan and patched.',
      white: 'Plain white rental-company vinyl.',
    }),
    sides: choice('How are the side walls?', {
      'rolled-up': 'All rolled up and tied under the eaves so the breeze and the passers-by can get in.',
      'back-down': 'Down behind the pulpit as a backdrop, rolled up everywhere else.',
      'three-down': 'Down on three sides, open only at the front.',
    }),
    seating: choice('What do people sit on?', {
      'folding-chairs': 'Borrowed metal folding chairs in rows.',
      benches: 'Rough plank benches on cinder blocks.',
      'hay-bales': 'Hay bales.',
      'lawn-chairs': 'Whatever people brought: mismatched lawn chairs in bright webbing.',
    }),
    banner: choice('What does the banner behind the pulpit say?', {
      revival: 'REVIVAL TONIGHT', 'jesus-saves': 'JESUS SAVES', 'born-again': 'YE MUST BE BORN AGAIN', healing: 'HEALING & DELIVERANCE', 'old-time': 'OLD TIME CAMP MEETING', welcome: 'WHOSOEVER WILL MAY COME',
    }),
    music: choice('What makes the music?', {
      piano: 'An upright piano hauled in on a truck.',
      organ: 'A Hammond organ and its speaker cabinet.',
      band: 'A drum kit and a guitar amplifier.',
      tambourines: 'Nothing but a crate of tambourines and a guitar on a stand.',
      none: 'No instruments at all, only voices.',
    }),
    size: score('How big is the tent?', ['A family-sized tent for thirty', 'A hundred chairs', 'A big top with three centre poles']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const storm = a.hour === 'storm-struck';
    const A = mix(3.9, 7.6, a.size), B = mix(2.9, 4.2, a.size), E = 3.0, P = E + B * 0.56;
    const R = A - B * 0.8;
    const poles = a.size > 0.72 ? [-R, 0, R] : [-R, R];
    const add = <T extends THREE.Object3D>(mesh: T, at: readonly [number, number, number], rotY = 0) => { mesh.position.set(...at); mesh.rotation.y = rotY; s.root.add(mesh); return mesh; };

    // Collapse factor: 1 standing, falling toward 0.2 at the +x end after a storm.
    const stand = (x: number) => storm ? mix(1, 0.22, clamp01((x + A * 0.1) / (A * 1.0)) ** 1.5) : 1;
    const height = (x: number, z: number) => {
      const r = clamp01(Math.max(Math.abs(z) / B, (Math.abs(x) - R) / (A - R)));
      const nearest = Math.min(...poles.map((p) => Math.hypot(x - p, z)));
      const sag = (1 - r) ** 1.55;
      return (E + (P - E) * sag + 0.55 * Math.exp(-nearest * nearest / 1.2) * (1 - r)) * stand(x);
    };

    // ---- Canvas
    const colours = { 'red-white': '#c8322e', 'blue-white': '#2f5fa8', 'yellow-white': '#e0b53a', 'green-white': '#2f5f45', canvas: '#b9a47a', white: '#f1efe8' }[a.stripes];
    const striped = a.stripes.endsWith('-white');
    const stripeMap = () => {
      const map = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = striped ? '#f1ecdc' : colours; ctx.fillRect(0, 0, w, h);
        if (striped) { ctx.fillStyle = colours; ctx.globalAlpha = mix(0.95, 0.6, wear); ctx.fillRect(0, 0, w / 2, h); ctx.globalAlpha = 1; }
        else for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(60,50,30,0.25)'; ctx.fillRect(i * w / 4, 0, 2, h); }
        if (wear > 0.35) for (let i = 0; i < wear * 7; i++) { ctx.fillStyle = pick(random, ['#8f8a78', '#a59a80', '#d9d2c0']); ctx.fillRect(random() * w, random() * h, 18 + random() * 30, 14 + random() * 22); }
        grime(ctx, w, h, wear, random, '80,70,50');
      });
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    const canvasMat = new THREE.MeshStandardMaterial({ map: stripeMap(), roughness: 0.9, side: THREE.DoubleSide });
    const NX = 44, NZ = 22;
    const roof = new THREE.PlaneGeometry(2 * A, 2 * B, NX, NZ);
    roof.rotateX(-Math.PI / 2);
    {
      const position = roof.attributes.position, uv = roof.attributes.uv;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        position.setY(i, height(x, z));
        const end = Math.abs(x) - R > Math.abs(z) * (A - R) / B;
        uv.setXY(i, (end ? z : x) / 1.3, (end ? x : z) / 3);
      }
      roof.computeVertexNormals();
    }
    add(new THREE.Mesh(roof, canvasMat), [0, 0, 0]).castShadow = true;

    // valance and walls as strips hung from the eave
    const strip = (from: readonly [number, number], to: readonly [number, number], drop: (x: number, z: number) => number, scallop: boolean, material: THREE.Material) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const n = Math.max(2, Math.round(length / 0.35));
      const vertices: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = mix(from[0], to[0], t), z = mix(from[1], to[1], t), top = height(x, z);
        const d = drop(x, z) * (scallop && i % 2 ? 0.72 : 1);
        vertices.push(x, top, z, x, Math.max(0, top - d), z);
        uvs.push(t * length / 1.3, 1, t * length / 1.3, 0);
        if (i < n) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const mesh = add(new THREE.Mesh(geometry, material), [0, 0, 0]);
      mesh.castShadow = true;
      return mesh;
    };
    const corners: (readonly [number, number])[] = [[-A, B], [A, B], [A, -B], [-A, -B]];
    const down = [false, a.sides === 'three-down', a.sides !== 'rolled-up', a.sides === 'three-down']; // front, +x end, back, -x end
    const roll = s.material(striped ? '#e6dfcc' : colours, { roughness: 0.95 });
    const rope = s.material('#c9b78a', { roughness: 1 });
    const wood = s.material('#8a6a48', { roughness: 0.9 });
    for (let side = 0; side < 4; side++) {
      const from = corners[side], to = corners[(side + 1) % 4];
      strip(from, to, () => 0.34, true, canvasMat);
      if (down[side]) strip(from, to, () => 99, false, canvasMat);
      else {
        const y0 = height(from[0] * 0.999, from[1] * 0.999) - 0.42, y1 = height(to[0] * 0.999, to[1] * 0.999) - 0.42;
        if (Math.min(y0, y1) > 0.5) s.rod([from[0] * 0.985, y0, from[1] * 0.985], [to[0] * 0.985, y1, to[1] * 0.985], 0.11, roll);
      }
      // side poles, guy ropes and stakes
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const count = Math.max(2, Math.round(length / 2.5));
      const outward: [number, number] = side === 0 ? [0, 1] : side === 1 ? [1, 0] : side === 2 ? [0, -1] : [-1, 0];
      for (let i = 0; i < count; i++) {
        const t = i / count, x = mix(from[0], to[0], t), z = mix(from[1], to[1], t);
        const top = height(x, z);
        const lean = storm ? (1 - stand(x)) * 0.9 : 0;
        s.rod([x + lean, 0, z], [x, top + 0.12, z], 0.035, wood);
        const sx = x + outward[0] * 1.5 + (i === 0 ? -outward[1] * 1.0 : 0), sz = z + outward[1] * 1.5 + (i === 0 ? outward[0] * 1.0 : 0);
        s.rod([x, top, z], [sx, 0.05, sz], 0.012, rope);
        s.rod([sx + outward[0] * 0.08, -0.1, sz + outward[1] * 0.08], [sx - outward[0] * 0.05, 0.28, sz - outward[1] * 0.05], 0.022, wood);
      }
    }

    // ---- Centre poles with pennants
    const pennants: THREE.Mesh[] = [];
    for (const px of poles) {
      const top = height(px, 0) + 0.9 * stand(px);
      const lean = storm ? (1 - stand(px)) * 2.4 : 0;
      s.rod([px - lean * 0.3, 0, lean], [px, top, 0], 0.07, wood, 0.05);
      const flag = s.mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.34, 0), new THREE.Vector3(0.8, -0.17, 0)]), new THREE.MeshStandardMaterial({ color: striped ? colours : '#c8322e', side: THREE.DoubleSide }), [px, top, 0]);
      flag.geometry.computeVertexNormals();
      pennants.push(flag);
    }

    // ---- Sawdust floor
    const dust = paint(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#d6b377'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { ctx.fillStyle = pick(random, ['#c49b5c', '#e6c98e', '#b88a4c', '#edd9a8']); ctx.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 2); }
    });
    dust.wrapS = dust.wrapT = THREE.RepeatWrapping; dust.repeat.set(A, B);
    add(new THREE.Mesh(new THREE.BoxGeometry(2 * A - 0.3, 0.04, 2 * B - 0.3), new THREE.MeshStandardMaterial({ map: dust, roughness: 1, emissive: '#ff9a3a', emissiveIntensity: a.hour === 'packed-night' || a.hour === 'altar-call' ? mix(0.05, 0.3, Math.abs(mood.daylight - 0.5) * 2) : 0 })), [0, 0.02, 0]).receiveShadow = true;

    // ---- Platform, pulpit, banner
    const ply = s.material('#c9a56c', { roughness: 0.85 });
    const pz = -B + 1.25;
    s.box([3.4, 0.25, 1.5], [0, 0.165, pz], ply);
    s.box([0.9, 0.12, 0.4], [0, 0.1, pz + 0.95], ply);
    const pulpit = new THREE.Group();
    const front = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.05, 0.05), ply); front.position.set(0, 0.525, 0.2);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.05, 0.42), ply); sideL.position.set(-0.3, 0.525, 0);
    const sideR = sideL.clone(); sideR.position.x = 0.3;
    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.04, 0.5), ply); desk.position.set(0, 1.08, 0); desk.rotation.x = -0.25;
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.02), s.material('#7a1f1f')); crossV.position.set(0, 0.6, 0.235);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.02), s.material('#7a1f1f')); crossH.position.set(0, 0.7, 0.235);
    const bible = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), s.material('#1c1a18')); bible.position.set(0, 1.12, 0.02); bible.rotation.x = -0.25;
    pulpit.add(front, sideL, sideR, desk, crossV, crossH, bible);
    pulpit.traverse((node) => { node.castShadow = true; });
    pulpit.position.set(0, 0.29, pz + 0.15);
    s.root.add(pulpit);
    const words = BANNERS[a.banner];
    const bannerY = Math.min(E + 0.25, height(0, -B + 0.5) - 0.5);
    const banner = add(panel(3.6, 0.95, (ctx, w, h) => {
      ctx.fillStyle = '#f4ecd0'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = h * 0.04; ctx.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
      write(ctx, words[0], w / 2, h * 0.32, h * 0.36, '#b3261e', { max: w * 0.88 });
      write(ctx, words[1], w / 2, h * 0.7, h * 0.3, '#1f2a4a', { max: w * 0.88 });
      grime(ctx, w, h, wear * 0.8, random);
    }, { px: 512 }), [0, bannerY, -B + 0.45]);
    banner.castShadow = true;
    for (const x of [-1.8, 1.8]) s.rod([x, bannerY + 0.45, -B + 0.45], [x * 1.15, height(x * 1.15, -B + 0.3), -B + 0.3], 0.01, rope);

    // ---- Music
    const mx = -2.6, mz = pz + 0.2;
    if (a.music === 'piano') {
      s.box([1.45, 1.15, 0.55], [mx, 0.6, mz], s.material('#3a2418', { roughness: 0.5 }));
      s.box([1.4, 0.06, 0.3], [mx, 0.72, mz + 0.4], s.material('#3a2418'));
      s.box([1.3, 0.02, 0.16], [mx, 0.76, mz + 0.42], s.material('#f4f1e6'));
      s.box([0.5, 0.45, 0.3], [mx, 0.25, mz + 0.95], s.material('#3a2418'));
    } else if (a.music === 'organ') {
      s.box([1.2, 0.95, 0.65], [mx, 0.5, mz], s.material('#5a3320', { roughness: 0.5 }));
      for (const y of [0.92, 1.0]) s.box([1.0, 0.03, 0.2], [mx, y, mz + 0.2 + (y - 0.92) * -1.2], s.material('#f4f1e6'));
      s.box([0.7, 1.05, 0.55], [mx - 1.2, 0.55, mz - 0.1], s.material('#5a3320', { roughness: 0.5 }));
      for (const y of [0.25, 0.85]) for (let i = 0; i < 4; i++) s.box([0.6, 0.03, 0.02], [mx - 1.2, y + i * 0.05, mz + 0.18], s.material('#1c1a18'));
    } else if (a.music === 'band') {
      const shell = s.material(pick(random, ['#b3261e', '#2f5fa8', '#c9cdd0']), { metalness: 0.3, roughness: 0.3 });
      const kick = s.cylinder(0.28, 0.28, 0.4, [mx, 0.3, mz], shell, 18); kick.rotation.x = Math.PI / 2;
      s.cylinder(0.18, 0.18, 0.14, [mx - 0.45, 0.7, mz + 0.2], shell, 16);
      s.cylinder(0.2, 0.2, 0.35, [mx + 0.5, 0.45, mz + 0.1], shell, 16);
      for (const x of [-0.6, 0.55]) { s.rod([mx + x, 0, mz - 0.2], [mx + x, 1.15, mz - 0.2], 0.012, s.material('#c9cdd0')); s.cylinder(0.22, 0.22, 0.01, [mx + x, 1.15, mz - 0.2], s.material('#d9b84a', { metalness: 0.5 }), 16).rotation.z = 0.15; }
      s.box([0.6, 0.55, 0.3], [mx + 1.4, 0.3, mz - 0.3], s.material('#1c1a18'));
      s.box([0.52, 0.4, 0.02], [mx + 1.4, 0.27, mz - 0.14], s.material('#8a7a5a'));
    } else if (a.music === 'tambourines') {
      s.box([0.5, 0.3, 0.36], [mx, 0.15, mz + 0.9], s.material('#b98a4a'));
      for (let i = 0; i < 4; i++) { const t = s.ring(0.12, 0.02, [mx - 0.12 + i * 0.09, 0.34 + (i % 2) * 0.03, mz + 0.9], s.material('#d9b84a', { metalness: 0.4 })); t.rotation.set(Math.PI / 2 - 0.4, 0, i); }
      const body = s.cylinder(0.19, 0.19, 0.1, [mx + 0.8, 0.5, mz + 0.5], s.material('#c98a3a', { roughness: 0.4 }), 16); body.rotation.x = Math.PI / 2 - 0.2;
      s.box([0.06, 0.7, 0.03], [mx + 0.8, 1.0, mz + 0.4], s.material('#5a3320')).rotation.x = -0.2;
    }
    // speaker horn on a pole and a microphone, because every revival has feedback
    s.rod([2.3, 0, pz + 0.4], [2.3, 2.0, pz + 0.4], 0.02, s.material('#3a3a3c'));
    s.mesh(new THREE.ConeGeometry(0.24, 0.42, 14, 1, true), s.material('#9aa0a2', { side: THREE.DoubleSide, metalness: 0.3 }), [2.3, 2.02, pz + 0.55]).rotation.x = -Math.PI / 2;
    s.rod([0.55, 0.29, pz + 0.5], [0.55, 1.6, pz + 0.5], 0.012, s.material('#3a3a3c'));
    s.ball([0.035, 0.05, 0.035], [0.55, 1.63, pz + 0.5], s.material('#c9cdd0'), 8);

    // ---- Seating
    const steelGeo = (() => {
      const seat = new THREE.BoxGeometry(0.4, 0.03, 0.4); seat.translate(0, 0.45, 0);
      const back = new THREE.BoxGeometry(0.4, 0.26, 0.03); back.translate(0, 0.78, 0.2);
      const legs = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.2], [0.18, 0.2]].map(([x, z]) => { const leg = new THREE.BoxGeometry(0.025, z > 0 ? 0.9 : 0.45, 0.025); leg.translate(x, z > 0 ? 0.45 : 0.225, z); return leg; });
      return mergeGeometries([seat, back, ...legs])!;
    })();
    const benchGeo = (() => {
      const plank = new THREE.BoxGeometry(2.3, 0.05, 0.3); plank.translate(0, 0.43, 0);
      const blocks = [-0.9, 0.9].map((x) => { const block = new THREE.BoxGeometry(0.2, 0.4, 0.38); block.translate(x, 0.2, 0); return block; });
      return mergeGeometries([plank, ...blocks])!;
    })();
    const baleGeo = new THREE.BoxGeometry(0.95, 0.42, 0.48); baleGeo.translate(0, 0.21, 0);
    const kind = a.seating;
    const geo = kind === 'benches' ? benchGeo : kind === 'hay-bales' ? baleGeo : steelGeo;
    const pitchX = kind === 'benches' ? 2.5 : kind === 'hay-bales' ? 1.05 : 0.56;
    const pitchZ = kind === 'hay-bales' ? 1.1 : 0.95;
    const palette = kind === 'folding-chairs' ? ['#8a7a5a', '#7a6f58', '#94866a', '#6f6a5a'] : kind === 'benches' ? ['#b89a6a', '#a88a5c', '#c4a878'] : kind === 'hay-bales' ? ['#d9b84a', '#c9a83e', '#e0c460'] : ['#2f8a4f', '#d8263c', '#2a6fd0', '#f0a020', '#f4f1e6', '#7a4fc0'];
    type Seat = { x: number; z: number; turn: number; tip: number; colour: string };
    const seats: Seat[] = [];
    const zStart = pz + 2.1, zEnd = B - 0.7;
    const rows = Math.max(1, Math.floor((zEnd - zStart) / pitchZ) + 1);
    const half = Math.max(1, Math.floor((A - 1.1 - 0.7) / pitchX));
    const fillChance = a.hour === 'setting-up' ? 1 : mix(0.55, 1, mood.density);
    for (let r = 0; r < rows; r++) for (const sign of [-1, 1]) for (let c = 0; c < half; c++) {
      const x = sign * (0.7 + pitchX / 2 + c * pitchX), z = zStart + r * pitchZ;
      if (a.hour === 'setting-up' && r >= 2) continue;
      if (random() > fillChance) continue;
      if (height(x, z) < 1.3) continue;
      let turn = (random() - 0.5) * (a.hour === 'empty-dawn' ? 0.05 : 0.3), tip = 0, px2 = x, pz2 = z;
      if (a.hour === 'altar-call' && r < 2) { px2 = sign * (A - 1.2 - random() * 1.2); pz2 = z + (random() - 0.5) * 1.2; turn = random() * 6; tip = random() < 0.3 ? Math.PI / 2 : 0; }
      if (storm && (random() < 0.4 || stand(x) < 0.8)) { tip = (random() < 0.5 ? 1 : -1) * Math.PI / 2; turn = random() * 6; px2 += (random() - 0.5) * 0.8; pz2 += (random() - 0.5) * 0.8; }
      seats.push({ x: px2, z: pz2, turn, tip, colour: pick(random, palette) });
    }
    if (seats.length) {
      const mesh = new THREE.InstancedMesh(geo, s.material('#ffffff', { roughness: 0.6, metalness: kind === 'folding-chairs' ? 0.3 : 0 }), seats.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      seats.forEach((seat, i) => {
        e.set(seat.tip, seat.turn, 0, 'YXZ'); q.setFromEuler(e);
        m.compose(new THREE.Vector3(seat.x, 0.04 + (seat.tip ? 0.2 : 0), seat.z), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(seat.colour));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    // what was left on the seats: fans, Bibles, hats
    if (a.hour === 'packed-night' || a.hour === 'altar-call') {
      const seatY = kind === 'hay-bales' ? 0.47 : 0.5;
      s.scatter(new THREE.BoxGeometry(1, 0.18, 0.7), s.material('#ffffff'), seats.filter((seat) => !seat.tip && random() < 0.6).map((seat) => ({
        at: [seat.x + (random() - 0.5) * 0.15, seatY + 0.02, seat.z - 0.03] as const, size: 0.17 + random() * 0.08, color: pick(random, ['#1c1a18', '#7a1f1f', '#f4ecd0', '#f4ecd0', '#2a4a7a', '#e8d9a0', '#5a2a6a']),
      })));
    }
    if (a.hour === 'altar-call') {
      s.box([2.4, 0.3, 0.25], [0, 0.19, pz + 1.55], ply);
      s.scatter(new THREE.BoxGeometry(1, 0.08, 1), s.material('#ffffff'), Array.from({ length: 9 }, () => ({ at: [(random() - 0.5) * 3.2, 0.05, pz + 1.9 + random() * 1.2] as const, size: 0.14 + random() * 0.06, color: pick(random, ['#ffffff', '#f4ecd0', '#e8d0d8']) })));
    }
    if (a.hour === 'setting-up') {
      // stacked chairs, a ladder and rope coils
      for (let k = 0; k < 3; k++) for (let i = 0; i < 9; i++) s.box([0.42, 0.05, 0.85], [A - 2 - k * 0.6, 0.08 + i * 0.055, 1 + (random() - 0.5) * 0.04], s.material(pick(random, palette)));
      for (const dx of [-0.22, 0.22]) s.rod([-A + 2 + dx, 0, 1.2], [-A + 2 + dx * 0.6, 2.6, 0.2], 0.025, s.material('#c9cdd0', { metalness: 0.4 }));
      for (let i = 1; i < 8; i++) s.rod([-A + 1.8 + 0.02 * i, i * 0.32, 1.2 - i * 0.125], [-A + 2.2 - 0.02 * i, i * 0.32, 1.2 - i * 0.125], 0.015, s.material('#c9cdd0', { metalness: 0.4 }));
      for (let i = 0; i < 3; i++) s.ring(0.28, 0.05, [-1.5 + i * 1.6, 0.08, B - 1.2], rope).rotation.x = Math.PI / 2;
    }

    // ---- The string of bare bulbs
    const on = a.hour === 'packed-night' || a.hour === 'altar-call' || (a.hour === 'setting-up' && mood.daylight > 0.7);
    const bulbGlow = on ? mix(0.9, 2.2, Math.abs(mood.daylight - 0.5) * 2) : 0;
    const bulbMat = new THREE.MeshStandardMaterial({ color: on ? '#fff0c0' : '#d8d4c4', emissive: new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, 0.6), emissiveIntensity: bulbGlow, roughness: 0.3 });
    const wire = s.material('#1c1a18');
    const bulbs: { at: readonly [number, number, number]; size: number }[] = [];
    const runs: [number, number, number][][] = [];
    const ridgeY = (x: number) => height(x, 0) - 0.9;
    const stations = [-A + 0.3, ...poles, A - 0.3];
    for (let i = 0; i < stations.length - 1; i++) {
      const x0 = stations[i], x1 = stations[i + 1];
      const y0 = Math.max(0.6, i === 0 ? height(x0, 0) - 0.3 : ridgeY(x0)), y1 = Math.max(0.6, i === stations.length - 2 ? height(x1, 0) - 0.3 : ridgeY(x1));
      const run: [number, number, number][] = [];
      const n = Math.max(4, Math.round(Math.abs(x1 - x0) / 0.5));
      for (let k = 0; k <= n; k++) { const t = k / n; run.push([mix(x0, x1, t), mix(y0, y1, t) - Math.sin(t * Math.PI) * 0.45, Math.sin(t * Math.PI) * 0.15]); }
      runs.push(run);
    }
    for (const px of poles) for (const zs of [-1, 1]) {
      const run: [number, number, number][] = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; run.push([px + t * 0.3, mix(ridgeY(px), height(px, zs * B) - 0.3, t) - Math.sin(t * Math.PI) * 0.35, zs * B * 0.98 * t]); }
      runs.push(run);
    }
    {
      // and along the front eave, where everyone driving past can see them
      const run: [number, number, number][] = [];
      const n = Math.round(2 * A / 0.5);
      for (let k = 0; k <= n; k++) { const x = -A + 0.1 + (2 * A - 0.2) * k / n; run.push([x, Math.max(0.5, height(x, B) - 0.5 - Math.abs(Math.sin(k / n * Math.PI * 4)) * 0.18), B + 0.06]); }
      runs.push(run);
    }
    for (const run of runs) {
      s.tube(run, 0.012, wire);
      run.forEach((p, i) => { if (i > 0 && i < run.length - 1 && !(storm && random() < 0.4)) bulbs.push({ at: [p[0], p[1] - 0.07, p[2]], size: 0.055 }); });
    }
    const bulbMesh = s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbMat, bulbs);
    bulbMesh.castShadow = false;

    const thing = s.finish({ footprint: Math.max(A, B) + 1 });
    const flutter = mix(0.1, 1, mood.energy);
    thing.update = (_dt, time) => {
      if (on) bulbMat.emissiveIntensity = bulbGlow * (1 + Math.sin(time * 9.3) * Math.sin(time * 2.1) * 0.12 * flutter);
      pennants.forEach((flag, i) => { flag.rotation.y = Math.sin(time * 2.2 * flutter + i) * 0.5; });
    };
    return thing;
  },
});
