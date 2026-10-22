import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { chevrons, halo, lamp, paint, skin, weather } from './paint';

type P3 = [number, number, number];
const LAMP = { sodium: '#ff9a2e', mercury: '#aef0e2', led: '#f2f7ff' } as const;

export default defineThing({
  questions: {
    mast: choice('How is the mast built?', {
      tubular: 'A tapering galvanised steel tube in bolted sections.',
      lattice: 'An open lattice tower of angle iron, criss-crossed with bracing.',
      concrete: 'A thick spun-concrete column, grey and stained.',
      guyed: 'A thin pole held up by guy wires to anchor blocks.',
    }),
    head: choice('What shape is the lamp head?', {
      ring: 'A circular crown of lamps facing outward all round.',
      rack: 'A flat rectangular rack of lamps all aimed one way, like a stadium.',
      arms: 'A long cross-arm with clusters of lamps at each end.',
      lowered: 'A ring that has been winched half way down the mast for maintenance and left there.',
      double: 'Two rings, one above the other, a blaze of lamps.',
    }),
    colour: choice('What colour is the light?', {
      sodium: 'Deep orange sodium, everything underneath turned amber.',
      mercury: 'Cold blue-green mercury vapour.',
      led: 'Hard white LED.',
      mixed: 'Mostly old sodium with a few lamps replaced by white LED.',
    }),
    failed: score('How many lamps have failed?', ['All burning', 'One or two dark', 'Half of them dead', 'Only one or two still alight']),
    doing: choice('What are the lamps doing right now?', {
      steady: 'Burning steadily.',
      flicker: 'One lamp stuttering on and off.',
      warming: 'Just switched on, still dim and pinkish as they warm up.',
      off: 'Switched off: grey glass in daylight.',
    }),
    birds: choice('What birds are on it?', {
      none: 'None.',
      gulls: 'A row of gulls roosting on the head.',
      cormorants: 'A few black cormorants hunched along the frame.',
      starlings: 'A swirling cloud of starlings round the light.',
      nest: 'A huge untidy stick nest on top, with a stork standing in it.',
    }),
    extras: choice('What else is fixed to the mast?', {
      nothing: 'Nothing.',
      cameras: 'CCTV cameras watching the ground.',
      horns: 'Tannoy loudspeaker horns.',
      antennas: 'Mobile-phone antennas and a small dish.',
      beacon: 'A red aircraft warning light at the very top.',
    }),
    height: score('How tall is it?', ['A modest eighteen metres', 'Twenty-five metres', 'Thirty metres', 'A forty-metre giant']),
    foot: choice('What stands at its foot?', {
      bare: 'Just the concrete footing.',
      cabinet: 'A control cabinet with its door hanging open.',
      barriers: 'Concrete crash barriers striped yellow and black.',
      ladder: 'A caged ladder running up the mast.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const H = mix(18, 40, a.height);
    const galv = s.material('#9aa3a6', { metalness: 0.55, roughness: 0.45 });
    const dark = s.material('#2c3033');
    const on = a.doing !== 'off';
    const brightness = (a.doing === 'warming' ? 0.6 : 1) * mix(0.9, 1.6, dusk);

    // Many struts in one draw call.
    const struts = (list: [P3, P3, number][], material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach(([from, to, radius], i) => {
        const p = new THREE.Vector3(...from), d = new THREE.Vector3(...to).sub(p), len = d.length();
        q.setFromUnitVectors(up, d.normalize());
        m.compose(p.addScaledVector(d, len / 2), q, new THREE.Vector3(radius, len, radius));
        mesh.setMatrixAt(i, m);
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };

    // Footing.
    const footTex = paint(256, 64, (ctx, w, h) => { chevrons(ctx, w, h); weather(ctx, w, h, random, mood.wear); });
    const footSide = skin(footTex), concrete = s.material('#a5a39a');
    const fw = a.mast === 'lattice' ? 4.6 : 2.6;
    s.mesh(new THREE.BoxGeometry(fw, 0.7, fw), [footSide, footSide, concrete, concrete, footSide, footSide] as unknown as THREE.Material, [0, 0.35, 0]);

    // The mast.
    let topR = 0.22;
    let radiusAt = (_y: number) => 0.3;
    if (a.mast === 'lattice') {
      const half = (y: number) => mix(1.9, 0.55, Math.pow(y / H, 0.8));
      radiusAt = half;
      const list: [P3, P3, number][] = [];
      const corners = (y: number): P3[] => [[-half(y), y, half(y)], [half(y), y, half(y)], [half(y), y, -half(y)], [-half(y), y, -half(y)]];
      const bays = Math.round(H / 3.2);
      for (let b = 0; b < bays; b++) {
        const y0 = 0.7 + (b / bays) * (H - 0.7), y1 = 0.7 + ((b + 1) / bays) * (H - 0.7);
        const c0 = corners(y0), c1 = corners(y1);
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          list.push([c0[i], c1[i], 0.09], [c1[i], c1[j], 0.045], b % 2 ? [c0[i], c1[j], 0.04] : [c0[j], c1[i], 0.04]);
        }
      }
      struts(list, galv);
      topR = 0.55;
    } else {
      const r0 = a.mast === 'concrete' ? 0.75 : a.mast === 'guyed' ? 0.2 : 0.55, r1 = a.mast === 'concrete' ? 0.42 : a.mast === 'guyed' ? 0.16 : 0.2;
      radiusAt = (y) => mix(r0, r1, y / H);
      topR = r1;
      const poleTex = paint(128, 1024, (ctx, w, h) => {
        ctx.fillStyle = a.mast === 'concrete' ? '#a9a59a' : '#a3acb0'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,45,50'},0.12)`; ctx.fillRect(random() * w, random() * h, 3 + random() * 12, 3 + random() * 30); }
        weather(ctx, w, h, random, mood.wear * 0.9, a.mast === 'concrete' ? '#4d4a40' : '#8a4a24');
      });
      s.cylinder(r1, r0, H - 0.7, [0, 0.7 + (H - 0.7) / 2, 0], skin(poleTex, { metalness: a.mast === 'concrete' ? 0 : 0.45, roughness: 0.6 }), a.mast === 'concrete' ? 24 : 12);
      s.cylinder(r0 + 0.25, r0 + 0.25, 0.08, [0, 0.74, 0], galv, 16);
      if (a.mast !== 'concrete') {
        const sections = Math.round(H / 9);
        for (let i = 1; i < sections; i++) { const y = (i / sections) * H; s.cylinder(radiusAt(y) + 0.07, radiusAt(y) + 0.07, 0.14, [0, y, 0], galv, 12); }
        s.box([0.34, 0.9, 0.04], [0, 1.6, r0 - 0.03], dark);
      }
      if (a.mast === 'guyed') {
        const list: [P3, P3, number][] = [];
        for (let i = 0; i < 3; i++) {
          const t = i * 2.094 + 0.5, gx = Math.cos(t) * H * 0.3, gz = Math.sin(t) * H * 0.3;
          list.push([[gx, 0.4, gz], [0, H * 0.62, 0], 0.03], [[gx, 0.4, gz], [0, H * 0.93, 0], 0.03]);
          s.box([1.1, 0.6, 1.1], [gx, 0.3, gz], concrete);
        }
        struts(list, dark).castShadow = false;
      }
    }

    // Lamp heads.
    const keys = ['sodium', 'mercury', 'led'] as const;
    const housings: [P3, P3, number][] = [];
    const litByColour: Record<string, { at: P3; normal: THREE.Vector3 }[]> = { sodium: [], mercury: [], led: [] };
    const dead: { at: P3; normal: THREE.Vector3 }[] = [];
    let total = 0;
    const lampAt = (at: P3, aim: THREE.Vector3) => {
      total++;
      const n = aim.clone().normalize();
      housings.push([[at[0] - n.x * 0.45, at[1] - n.y * 0.45, at[2] - n.z * 0.45], at, 0.42]);
      const isDead = !on || random() < mix(0, 0.9, a.failed) + (a.failed > 0.2 ? 0.05 : 0);
      const key = a.colour === 'mixed' ? (random() < 0.3 ? 'led' : 'sodium') : a.colour;
      (isDead ? dead : litByColour[key]).push({ at: [at[0] + n.x * 0.03, at[1] + n.y * 0.03, at[2] + n.z * 0.03], normal: n });
    };
    const perch: P3[] = [];
    const frame: [P3, P3, number][] = [];
    const ringHead = (y: number, R: number, count: number) => {
      s.ring(R, 0.07, [0, y, 0], galv).rotation.x = Math.PI / 2;
      s.ring(R * 0.55, 0.05, [0, y + 0.5, 0], galv).rotation.x = Math.PI / 2;
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
        lampAt([c * (R + 0.3), y - 0.3, sn * (R + 0.3)], new THREE.Vector3(c, -0.75, sn));
        if (i % 2 === 0) frame.push([[c * topR, y + 0.5, sn * topR], [c * R, y, sn * R], 0.04], [[c * R * 0.55, y + 0.5, sn * R * 0.55], [c * R, y, sn * R], 0.03]);
        perch.push([Math.cos(t + 0.3) * R, y + 0.07, Math.sin(t + 0.3) * R]);
      }
    };
    const headY = H + 0.2;
    let glowY = headY, glowR = 3;
    if (a.head === 'ring') ringHead(headY, 2.3, 10);
    else if (a.head === 'double') { ringHead(headY, 2.5, 12); ringHead(headY - 2.4, 2.0, 8); s.cylinder(0.14, 0.14, 2.6, [0, headY - 0.9, 0], galv, 8); glowR = 3.6; }
    else if (a.head === 'lowered') {
      const y = H * mix(0.38, 0.55, random());
      const off = radiusAt(y) + 0.5;
      // Lamp ring riding on a carriage down the mast, hoist ropes up to the head frame.
      const R = Math.max(2.3, off + 1.2);
      s.ring(R, 0.07, [0, y, 0], galv).rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
        lampAt([c * (R + 0.3), y - 0.3, sn * (R + 0.3)], new THREE.Vector3(c, -0.75, sn));
        if (i % 2 === 0) frame.push([[c * (off - 0.4), y + 0.3, sn * (off - 0.4)], [c * R, y, sn * R], 0.04]);
        if (i % 3 === 0) frame.push([[c * R * 0.7, y + 0.1, sn * R * 0.7], [c * 0.9, headY, sn * 0.9], 0.02]);
        perch.push([Math.cos(t + 0.3) * R, y + 0.07, Math.sin(t + 0.3) * R]);
      }
      s.ring(0.9, 0.06, [0, headY, 0], galv).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) frame.push([[0, headY + 0.3, 0], [Math.cos(i * 1.57) * 0.9, headY, Math.sin(i * 1.57) * 0.9], 0.04]);
      glowY = y;
    } else if (a.head === 'rack') {
      const W = 5.4, T = 3.0;
      for (const x of [-W / 2, W / 2]) frame.push([[x, headY - 0.4, 0.3], [x, headY + T, 0.3], 0.07]);
      for (let r = 0; r < 4; r++) frame.push([[-W / 2, headY - 0.3 + r * 1.05, 0.3], [W / 2, headY - 0.3 + r * 1.05, 0.3], 0.06]);
      frame.push([[0, headY - 1.6, 0], [-W / 2, headY - 0.3, 0.3], 0.05], [[0, headY - 1.6, 0], [W / 2, headY - 0.3, 0.3], 0.05], [[0, headY + 1, 0], [0, headY + 1, 0.3], 0.1]);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) lampAt([-W / 2 + 0.55 + c * 1.075, headY + 0.25 + r * 1.05, 0.75], new THREE.Vector3(0, -0.45, 1));
      for (let c = 0; c < 6; c++) perch.push([-W / 2 + 0.4 + c * 0.95, headY + T + 0.07, 0.3]);
      s.cylinder(topR, topR, T, [0, headY + T / 2 - 0.3, 0], galv, 8);
      glowY = headY + 1.3;
    } else {
      const W = 7.6;
      frame.push([[-W / 2, headY, 0], [W / 2, headY, 0], 0.12], [[0, headY + 1.3, 0], [-W / 2 + 0.3, headY, 0], 0.035], [[0, headY + 1.3, 0], [W / 2 - 0.3, headY, 0], 0.035], [[0, headY - 0.2, 0], [0, headY + 1.3, 0], 0.1]);
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++) for (const z of [-1, 1]) lampAt([side * (W / 2 - 0.2 - i * 0.95), headY - 0.35, z * 0.5], new THREE.Vector3(side * 0.25, -0.8, z * 0.8));
      for (let c = 0; c < 8; c++) perch.push([-W / 2 + 0.3 + c * 1.0, headY + 0.13, 0]);
      glowR = 4;
    }
    struts(frame, galv);
    struts(housings, s.material('#6a7275', { metalness: 0.4 }));
    const face = new THREE.SphereGeometry(1, 12, 8).scale(0.46, 0.46, 0.26);
    const faces = (list: { at: P3; normal: THREE.Vector3 }[], material: THREE.Material) => {
      if (!list.length) return null;
      const mesh = new THREE.InstancedMesh(face, material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), zAxis = new THREE.Vector3(0, 0, 1);
      list.forEach((item, i) => { q.setFromUnitVectors(zAxis, item.normal); m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(1, 1, 1)); mesh.setMatrixAt(i, m); });
      s.root.add(mesh);
      return mesh;
    };
    faces(dead, new THREE.MeshStandardMaterial({ color: '#59605f', roughness: 0.25, metalness: 0.3, side: THREE.DoubleSide }));
    const litMaterials: THREE.MeshStandardMaterial[] = [];
    let litCount = 0;
    const tint = new THREE.Color(0, 0, 0);
    for (const key of keys) {
      const list = litByColour[key];
      if (!list.length) continue;
      const colour = new THREE.Color(LAMP[key]);
      if (a.doing === 'warming') colour.lerp(new THREE.Color('#ff8fa0'), 0.55);
      const material = lamp(colour, brightness);
      material.side = THREE.DoubleSide;
      litMaterials.push(material);
      faces(list, material);
      tint.add(colour.clone().multiplyScalar(list.length));
      litCount += list.length;
    }
    // One lamp picked to stutter.
    let stutter: THREE.MeshStandardMaterial | null = null;
    if (a.doing === 'flicker') {
      const pool = [...litByColour.sodium, ...litByColour.mercury, ...litByColour.led, ...dead];
      const pick = pool[Math.floor(random() * pool.length)];
      stutter = lamp(LAMP[a.colour === 'mixed' ? 'sodium' : a.colour], brightness * 1.4);
      stutter.side = THREE.DoubleSide;
      const mesh = s.mesh(new THREE.SphereGeometry(1, 12, 8).scale(0.5, 0.5, 0.3), stutter, [pick.at[0] + pick.normal.x * 0.02, pick.at[1] + pick.normal.y * 0.02, pick.at[2] + pick.normal.z * 0.02]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pick.normal);
      mesh.castShadow = false;
    }
    if (litCount) {
      tint.multiplyScalar(1 / litCount);
      const share = litCount / Math.max(1, total);
      const strength = share * (a.doing === 'warming' ? 0.5 : 1);
      s.ball([glowR * 1.5, glowR * 0.8, glowR * 1.5], [0, glowY - 0.3, a.head === 'rack' ? 1 : 0], halo(tint, mix(0.1, 0.3, dusk) * mix(0.4, 1, strength)), 16).castShadow = false;
      const reach = Math.min(glowY - 1, 17);
      const cone = s.mesh(new THREE.ConeGeometry(reach * 0.62, reach, 24, 1, true), halo(tint, mix(0.05, 0.14, dusk) * mix(0.3, 1, strength)), [0, glowY - reach / 2 - 0.3, a.head === 'rack' ? reach * 0.25 : 0]);
      if (a.head === 'rack') cone.rotation.x = 0.4;
      cone.castShadow = false;
      // A pool of light on the ground at the foot.
      const pool = s.cylinder(1, 1, 0.02, [0, 0.012, a.head === 'rack' ? 3 : 0], halo(tint, mix(0.08, 0.3, dusk) * strength), 28);
      pool.scale.set(H * 0.24, 1, H * 0.24); pool.castShadow = false;
    }

    // Extras fixed to the mast.
    const midY = H * 0.55, mr = radiusAt(midY) + 0.05;
    if (a.extras === 'cameras') for (let i = 0; i < 3; i++) {
      const t = i * 2.1 + random(), c = Math.cos(t), sn = Math.sin(t);
      s.rod([c * mr, midY + i * 0.9, sn * mr], [c * (mr + 0.7), midY + i * 0.9, sn * (mr + 0.7)], 0.04, galv);
      s.rod([c * (mr + 0.7), midY + i * 0.9 - 0.05, sn * (mr + 0.7)], [c * (mr + 1.2), midY + i * 0.9 - 0.4, sn * (mr + 1.2)], 0.14, s.material('#eef0ee'));
    }
    if (a.extras === 'horns') for (let i = 0; i < 4; i++) {
      const t = i * 1.57 + 0.4, c = Math.cos(t), sn = Math.sin(t);
      s.rod([c * mr, midY, sn * mr], [c * (mr + 1.0), midY - 0.15, sn * (mr + 1.0)], 0.09, s.material('#b9bfc0'), 0.45);
    }
    if (a.extras === 'antennas') {
      for (let i = 0; i < 3; i++) { const t = i * 2.094, c = Math.cos(t), sn = Math.sin(t); s.box([0.3, 2.2, 0.16], [c * (mr + 0.45), H * 0.8, sn * (mr + 0.45)], s.material('#e9ebe8')).rotation.y = -t + Math.PI / 2; s.rod([c * mr, H * 0.8, sn * mr], [c * (mr + 0.4), H * 0.8, sn * (mr + 0.4)], 0.04, galv); }
      s.cylinder(0.5, 0.5, 0.14, [mr + 0.5, H * 0.7, 0], s.material('#e9ebe8'), 18).rotation.z = Math.PI / 2;
    }
    let beacon: THREE.MeshStandardMaterial | null = null;
    if (a.extras === 'beacon') {
      const by = (a.head === 'rack' ? headY + 3.2 : headY + 1.5);
      s.rod([0, headY, 0], [0, by, 0], 0.05, galv);
      beacon = lamp('#ff2318', 2.6);
      s.cylinder(0.2, 0.2, 0.36, [0, by + 0.18, 0], beacon, 12);
      s.ball([0.9, 0.9, 0.9], [0, by + 0.18, 0], halo('#ff2318', 0.2), 10).castShadow = false;
    }

    // At the foot.
    if (a.foot === 'cabinet') {
      const cx = fw / 2 + 0.7;
      s.box([0.9, 1.7, 0.5], [cx, 0.85, 0.3], s.material('#7f8a86'));
      const door = s.box([0.85, 1.6, 0.04], [cx + 0.62, 0.85, 0.82], s.material('#8d9894'));
      door.rotation.y = 1.15;
      s.box([0.7, 1.4, 0.02], [cx, 0.9, 0.56], dark);
      for (let i = 0; i < 6; i++) s.box([0.08, 0.12, 0.03], [cx - 0.25 + (i % 3) * 0.25, 1.2 - Math.floor(i / 3) * 0.4, 0.575], lamp(i === 1 ? '#ff3a2a' : '#3cf07a', on ? 1.6 : 0.1));
    } else if (a.foot === 'barriers') {
      const barrierTex = paint(256, 64, (ctx, w, h) => { chevrons(ctx, w, h); weather(ctx, w, h, random, mood.wear); });
      const side = skin(barrierTex);
      for (let i = 0; i < 4; i++) {
        const t = i * 1.57 + 0.78 + (random() - 0.5) * 0.25, d = fw / 2 + 1.5;
        const barrier = s.mesh(new THREE.BoxGeometry(2.6, 0.85, 0.5), [concrete, concrete, concrete, concrete, side, side] as unknown as THREE.Material, [Math.cos(t) * d, 0.42, Math.sin(t) * d]);
        barrier.rotation.y = -t + Math.PI / 2 + (random() - 0.5) * 0.3;
      }
    } else if (a.foot === 'ladder' && a.mast !== 'lattice') {
      const list: [P3, P3, number][] = [];
      const top = a.head === 'lowered' ? H * 0.3 : H - 1;
      for (const x of [-0.25, 0.25]) list.push([[x, 2.4, radiusAt(2.4) + 0.3], [x, top, radiusAt(top) + 0.3], 0.03]);
      for (let y = 2.6; y < top; y += 0.4) list.push([[-0.25, y, radiusAt(y) + 0.3], [0.25, y, radiusAt(y) + 0.3], 0.02]);
      struts(list, galv);
      for (let y = 4.5; y < top; y += 1.4) { const hoop = s.ring(0.42, 0.02, [0, y, radiusAt(y) + 0.62], s.material('#e3b11b'), Math.PI * 1.3); hoop.rotation.set(Math.PI / 2, 0, -Math.PI * 0.15 + Math.PI); }
    }
    if (a.foot === 'ladder' && a.mast === 'lattice') {
      const list: [P3, P3, number][] = [];
      for (const x of [-0.25, 0.25]) list.push([[x, 0.8, 0], [x, H - 0.5, 0], 0.03]);
      for (let y = 1; y < H - 0.5; y += 0.4) list.push([[-0.25, y, 0], [0.25, y, 0], 0.02]);
      struts(list, s.material('#e3b11b'));
    }

    // Birds.
    const flock = new THREE.Group();
    if (a.birds === 'gulls' || a.birds === 'cormorants') {
      const isGull = a.birds === 'gulls';
      const spots = perch.filter(() => random() < (isGull ? 0.75 : 0.4)).slice(0, 9);
      if (!spots.length && perch.length) spots.push(perch[0]);
      const body = s.material(isGull ? '#f1f0ea' : '#1c2022');
      s.scatter(new THREE.SphereGeometry(1, 10, 8).scale(0.55, isGull ? 0.5 : 0.9, 1), body, spots.map((at) => ({ at: [at[0], at[1] + (isGull ? 0.3 : 0.45), at[2]] as P3, size: 0.4 })));
      s.scatter(new THREE.SphereGeometry(1, 8, 6), isGull ? s.material('#f1f0ea') : body, spots.map((at) => ({ at: [at[0] + 0.12, at[1] + (isGull ? 0.58 : 0.95), at[2] + 0.2] as P3, size: 0.15 })));
    } else if (a.birds === 'starlings') {
      const dots = Array.from({ length: 90 }, () => { const t = random() * 6.283, r = 2 + random() * 6, y = (random() - 0.5) * 6 * Math.cos(r * 0.25); return { at: [Math.cos(t) * r, y, Math.sin(t) * r] as P3, size: 0.12 + random() * 0.1 }; });
      const helper = new Sculpture(context);
      helper.scatter(new THREE.SphereGeometry(1, 5, 4).scale(1, 0.5, 1.6), s.material('#1d1c22'), dots).castShadow = false;
      flock.add(helper.root);
      flock.position.set(0, glowY + 1.5, 0);
      s.root.add(flock);
    } else if (a.birds === 'nest') {
      const ny = (a.head === 'rack' ? headY + 3.1 : a.head === 'lowered' ? headY + 0.35 : headY + 0.6);
      const sticks: [P3, P3, number][] = [];
      for (let i = 0; i < 70; i++) { const t = random() * 6.283, r = random() * 1.2, t2 = t + 1.2 + random(); sticks.push([[Math.cos(t) * r, ny + random() * 0.5, Math.sin(t) * r], [Math.cos(t2) * 1.4, ny + random() * 0.55, Math.sin(t2) * 1.4], 0.03]); }
      struts(sticks, s.material('#6b5236', { roughness: 1 }));
      const white = s.material('#f1f0ea');
      s.ball([0.28, 0.36, 0.5], [0, ny + 1.55, 0], white, 12);
      s.ball([0.2, 0.3, 0.3], [0, ny + 1.5, -0.35], s.material('#1b1b1b'), 10);
      s.rod([0, ny + 1.7, 0.3], [0, ny + 2.4, 0.5], 0.07, white);
      s.ball([0.12, 0.12, 0.14], [0, ny + 2.45, 0.52], white, 10);
      s.rod([0, ny + 2.42, 0.6], [0, ny + 2.25, 1.15], 0.04, s.material('#d8402a'), 0.01);
      for (const x of [-0.1, 0.1]) s.rod([x, ny + 0.4, 0], [x, ny + 1.3, 0], 0.025, s.material('#d8402a'));
    }

    return s.finish({
      footprint: a.mast === 'guyed' ? H * 0.32 : Math.max(3.4, fw),
      update: (dt, time) => {
        if (stutter) stutter.emissiveIntensity = (Math.sin(time * 23) + Math.sin(time * 7.3) + Math.sin(time * 41)) > 0.4 ? brightness * 1.4 : 0.03;
        if (beacon) beacon.emissiveIntensity = 1.2 + 1.8 * Math.max(0, Math.sin(time * 2.2));
        flock.rotation.y += dt * mix(0.2, 1.4, mood.energy);
        flock.position.y = glowY + 1.5 + Math.sin(time * 0.6) * 0.8;
        if (a.doing === 'warming') for (const m of litMaterials) m.emissiveIntensity = brightness * (0.85 + 0.15 * Math.sin(time * 1.3));
      },
    });
  },
});
