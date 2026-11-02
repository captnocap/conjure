import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { Batch, archBand, canvasTexture, planarUV, pointedArch, stoneTexture, wallWithHoles, night as nightOf } from './parts';

type V3 = [number, number, number];
const TIMES = { noon: [12, 0], ten: [10, 10], three: [3, 0], quarter: [8, 45], stopped: [4, 37], six: [6, 30] } as const;

export default defineThing({
  questions: {
    time: choice('What time do the four clocks show?', {
      noon: 'Noon: both hands straight up.',
      ten: 'Ten past ten, the hands spread wide.',
      three: 'Three o\'clock in the afternoon, the exam hall emptying.',
      quarter: 'A quarter to nine, the morning lectures about to start.',
      stopped: 'Stopped at an odd minute long ago.',
      six: 'Half past six in the evening, the hands hanging down.',
    }),
    dialLit: noul('Are the clock faces lit from behind?'),
    state: choice('What state is the stone in?', {
      restored: 'Freshly restored: pale buff stone clean and sharp, the carving crisp.',
      stained: 'Green-black monsoon stain running down from every ledge and niche.',
      scaffold: 'Caged in bamboo scaffolding up the shaft, tied with rope, green netting at the base.',
    }),
    weather: choice('What is the sky doing around it?', {
      clear: 'Clear and still: hard tropical sun on the stone.',
      rain: 'Monsoon rain lashing the tower, the stone dark and glistening.',
      crows: 'A flock of crows circling the lantern and perched on the pinnacles.',
    }),
    palms: noul('Do coconut palms crowd its base?'),
    library: noul('Does the long Gothic library hall stretch out from its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const wet = a.weather === 'rain';
    const stain = a.state === 'restored' ? 0.04 + mood.wear * 0.15 : a.state === 'stained' ? 0.8 + mood.wear * 0.2 : 0.25 + mood.wear * 0.45;
    const darken = (a.state === 'stained' ? 0.84 : 1) * (wet ? 0.78 : 1);
    const tone = (hex: string) => new THREE.Color(hex).multiplyScalar(darken);
    const stoneMap = stoneTexture(random, stain, 8, 4);
    const stone = s.material(tone('#dcc89f'), { map: stoneMap, roughness: wet ? 0.35 : 0.85 });
    const trimMap = stoneTexture(random, stain * 0.8, 4, 2, 'rgba(50,40,30,0.4)');
    const trim = s.material(tone('#9d7f58'), { map: trimMap, roughness: wet ? 0.35 : 0.8 });
    const glassMap = canvasTexture(64, 128, (c) => {
      c.fillStyle = '#1f1d24'; c.fillRect(0, 0, 64, 128);
      const cols = ['#b8322a', '#2a4fa8', '#e0a020', '#2f8a4a', '#7b2fa8', '#d8c070'];
      for (let y = 0; y < 128; y += 12) for (let x = 0; x < 64; x += 12) { c.fillStyle = cols[Math.floor(random() * cols.length)]; c.beginPath(); c.moveTo(x + 6, y + 1); c.lineTo(x + 11, y + 6); c.lineTo(x + 6, y + 11); c.lineTo(x + 1, y + 6); c.fill(); }
    });
    const glass = s.material('#8a8090', { map: glassMap, emissive: '#ffffff', emissiveMap: glassMap, emissiveIntensity: mix(0.15, 1.2, night), roughness: 0.25 });
    const dark = s.material('#2c2824', { roughness: 0.95 });
    const lawn = s.material(wet ? '#466a36' : '#5f8a45', { roughness: 0.95 });
    const path = s.material(wet ? '#8a8276' : '#c4b89c', { roughness: wet ? 0.2 : 0.9 });

    const b = new Batch();
    const statues: V3[] = [];
    const pinnacleTips: V3[] = [];
    // Four pierced walls round a square stage.
    const stage = (W: number, y0: number, h: number, holes: THREE.Vector2[][], inner: THREE.Material, t = 0.6) => {
      b.box(inner, [W - 2 * t + 0.1, h, W - 2 * t + 0.1], [0, y0 + h / 2, 0]);
      for (let side = 0; side < 4; side++) {
        const an = side * Math.PI / 2, nx = Math.sin(an), nz = Math.cos(an);
        b.add(stone, wallWithHoles(W, h, t, holes), [nx * (W / 2 - t), y0, nz * (W / 2 - t)], [0, an, 0]);
        for (const hole of holes) b.add(trim, archBand(hole, 0.16, 0.1), [nx * (W / 2), y0, nz * (W / 2)], [0, an, 0]);
      }
    };
    const band = (W: number, y: number, h = 0.45) => b.box(trim, [W, h, W], [0, y, 0]);
    const pinnacle = (x: number, y: number, z: number, h: number, r: number) => {
      b.cyl(stone, r, r, h * 0.45, [x, y + h * 0.225, z], 8, Math.PI / 8);
      b.cyl(trim, 0.02, r * 1.1, h * 0.55, [x, y + h * 0.45 + h * 0.275, z], 8, Math.PI / 8);
      pinnacleTips.push([x, y + h, z]);
    };

    // Base: a broad plinth and a porch of pointed arches on every face.
    b.box(trim, [12.4, 1, 12.4], [0, 0.5, 0]);
    stage(11, 1, 11, [pointedArch(-3, 0.01, 2.2, 4, 0.8, 8), pointedArch(0, 0.01, 2.4, 4.6, 0.8, 8), pointedArch(3, 0.01, 2.2, 4, 0.8, 8)], dark, 0.7);
    band(11.6, 12, 0.7);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(stone, [1.4, 12, 1.4], [sx * 5.4, 6, sz * 5.4]);
    // Arcaded storeys with stained glass.
    stage(10, 12.4, 17.6, [
      pointedArch(-2.6, 1, 1.5, 4.2, 0.8, 6), pointedArch(0, 1, 1.5, 4.2, 0.8, 6), pointedArch(2.6, 1, 1.5, 4.2, 0.8, 6),
      pointedArch(-2.6, 9.5, 1.5, 4.8, 0.8, 6), pointedArch(0, 9.5, 1.5, 4.8, 0.8, 6), pointedArch(2.6, 9.5, 1.5, 4.8, 0.8, 6),
    ], glass);
    band(10.5, 20.5, 0.4);
    band(10.7, 30.1, 0.6);
    // Statues on brackets at the corners of the setback.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (const [dx, dz] of [[0.9, 0], [0, 0.9]] as const) {
        const x = sx * (4.95 - dx * 1.6), z = sz * (4.95 - dz * 1.6);
        b.box(trim, [0.9, 0.5, 0.9], [x, 30.65, z]);
        statues.push([x, 30.9, z]);
      }
      pinnacle(sx * 5, 30.4, sz * 5, 5, 0.38);
    }
    // The shaft: tall lancets, buttressed corners.
    stage(9, 30.4, 20, [pointedArch(-1.8, 1.5, 1.5, 12.5, 0.85, 8), pointedArch(1.8, 1.5, 1.5, 12.5, 0.85, 8)], glass);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(stone, [1.1, 20, 1.1], [sx * 4.3, 40.4, sz * 4.3]);
    for (const y of [38, 45]) band(9.3, y, 0.3);
    band(9.8, 50.6, 0.6);
    // Clock stage: dials, gablets, corner pinnacles.
    b.box(stone, [9.4, 8, 9.4], [0, 54.9, 0]);
    band(10, 59, 0.6);
    const [hour, minute] = TIMES[a.time];
    const dialMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#efe6cf'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.strokeStyle = '#2a2420'; c.fillStyle = '#2a2420'; c.lineWidth = 7; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(128, 128, 86, 0, 7); c.stroke();
      c.font = 'bold 22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((r, i) => { const an = i / 12 * Math.PI * 2; c.fillText(r, 128 + Math.sin(an) * 102, 128 - Math.cos(an) * 102); });
      const hand = (angle: number, len: number, w: number) => { c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(128 - Math.sin(angle) * 14, 128 + Math.cos(angle) * 14); c.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len); c.stroke(); };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 58, 10); hand(minute / 60 * Math.PI * 2, 84, 6);
      c.beginPath(); c.arc(128, 128, 8, 0, 7); c.fill();
    }, false);
    const dialMat = new THREE.MeshStandardMaterial({ color: '#ffffff', map: dialMap, roughness: 0.6, emissive: a.dialLit ? '#fff0c8' : '#000000', emissiveMap: dialMap, emissiveIntensity: a.dialLit ? mix(0.15, 1.3, night) : 0 });
    for (let side = 0; side < 4; side++) {
      const an = side * Math.PI / 2, nx = Math.sin(an), nz = Math.cos(an);
      const dial = s.mesh(new THREE.CircleGeometry(2.6, 40), dialMat, [nx * 4.82, 55, nz * 4.82]);
      dial.rotation.y = an; dial.castShadow = false;
      b.add(trim, new THREE.TorusGeometry(2.7, 0.22, 6, 36), [nx * 4.8, 55, nz * 4.8], [0, an, 0]);
      const g = new THREE.Shape([new THREE.Vector2(-3.6, 0), new THREE.Vector2(3.6, 0), new THREE.Vector2(0, 3.4)]);
      b.add(stone, new THREE.ExtrudeGeometry(g, { depth: 0.5, bevelEnabled: false }), [nx * 4.5, 59.2, nz * 4.5], [0, an, 0]);
      b.rod(trim, [nx * 4.95 - nz * 3.6, 59.2, nz * 4.95 + nx * 3.6], [nx * 4.95, 62.7, nz * 4.95], 0.16, 4);
      b.rod(trim, [nx * 4.95 + nz * 3.6, 59.2, nz * 4.95 - nx * 3.6], [nx * 4.95, 62.7, nz * 4.95], 0.16, 4);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { pinnacle(sx * 4.6, 59.3, sz * 4.6, 6, 0.42); statues.push([sx * 3.9, 59.3, sz * 3.9]); }
    // The open octagonal lantern: eight slender arches you can see the sky through.
    const R = 4.1, side = 2 * R * Math.sin(Math.PI / 8), lh = 11;
    b.cyl(trim, R + 0.6, R + 0.6, 0.6, [0, 59.6, 0], 8, Math.PI / 8);
    b.cyl(dark, R - 0.6, R - 0.6, 0.3, [0, 59.95, 0], 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const an = i / 8 * Math.PI * 2;
      const ap = R * Math.cos(Math.PI / 8);
      const hole = pointedArch(0, 0.9, side - 0.9, 7, 0.8, 8);
      b.add(stone, wallWithHoles(side, lh, 0.35, [hole]), [Math.sin(an) * (ap - 0.35), 60, Math.cos(an) * (ap - 0.35)], [0, an, 0]);
      b.add(trim, archBand(hole, 0.14, 0.08), [Math.sin(an) * ap, 60, Math.cos(an) * ap], [0, an, 0]);
      const va = an + Math.PI / 8;
      b.cyl(trim, 0.3, 0.3, lh + 0.6, [Math.sin(va) * R, 60 + lh / 2, Math.cos(va) * R], 8);
      pinnacle(Math.sin(va) * (R + 0.15), 60 + lh, Math.cos(va) * (R + 0.15), 3.2, 0.3);
    }
    b.cyl(trim, R + 0.4, R + 0.4, 0.6, [0, 60 + lh + 0.3, 0], 8, Math.PI / 8);
    // The spire, with crockets climbing its ribs, and the finial.
    const sp0 = 60 + lh + 0.6, spH = 12;
    b.cyl(stone, 0.05, R - 0.3, spH, [0, sp0 + spH / 2, 0], 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const an = i / 8 * Math.PI * 2;
      for (let k = 1; k < 7; k++) {
        const t = k / 7, r = (R - 0.3) * (1 - t);
        b.add(trim, new THREE.ConeGeometry(0.22, 0.6, 4), [Math.sin(an) * (r + 0.1), sp0 + t * spH, Math.cos(an) * (r + 0.1)]);
      }
    }
    b.rod(trim, [0, sp0 + spH - 0.2, 0], [0, sp0 + spH + 1.6, 0], 0.1, 6);
    b.add(trim, new THREE.TorusGeometry(0.35, 0.06, 4, 12), [0, sp0 + spH + 1.2, 0]);
    // Pinnacle finials as one draw.
    for (const [x, y, z] of pinnacleTips) b.add(trim, new THREE.SphereGeometry(0.16, 6, 4), [x, y, z]);

    // Statues: robed figures carved in the same stone.
    const statueGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.28, 0.42, 1.7, 8).translate(0, 0.85, 0).toNonIndexed(),
      new THREE.SphereGeometry(0.22, 8, 6).translate(0, 1.92, 0).toNonIndexed(),
    ]);
    s.scatter(statueGeo, s.material(tone('#e6d6b2'), { roughness: 0.8 }), statues.map((at) => ({ at, size: 1 })));

    // The grounds: lawn, a path, palms, the library hall.
    b.box(lawn, [46, 0.3, 46], [0, -0.15, 0]);
    b.box(path, [14, 0.32, 23], [0, -0.14, 17]);
    if (a.library) {
      const lib = s.material(tone('#d6c095'), { map: stoneMap, roughness: wet ? 0.35 : 0.85 });
      const holes: THREE.Vector2[][] = [];
      for (let k = 0; k < 9; k++) for (const y of [2, 9]) holes.push(pointedArch(-16 + k * 4, y, 1.6, 3.4, 0.8, 6));
      b.add(lib, wallWithHoles(36, 15, 0.6, holes), [-24, 0, 4.4]);
      b.box(glass, [35.6, 14.6, 11], [-24, 7.3, -1]);
      b.add(lib, wallWithHoles(36, 15, 0.6, holes), [-24, 0, -6.4], [0, 0, 0]);
      b.box(lib, [1, 15, 11.6], [-41.5, 7.5, -1]);
      b.box(trim, [36.6, 0.6, 12.4], [-24, 15, -1]);
      const roofShape = new THREE.Shape([new THREE.Vector2(-6, 0), new THREE.Vector2(6, 0), new THREE.Vector2(0, 6)]);
      b.add(s.material(tone('#7a6458'), { roughness: 0.8 }), new THREE.ExtrudeGeometry(roofShape, { depth: 36, bevelEnabled: false }), [-42, 15.3, -1], [0, Math.PI / 2, 0]);
      for (let k = 0; k <= 9; k++) pinnacle(-42 + k * 4, 15.3, 5.2, 2.4, 0.22);
      for (const hole of holes) b.add(trim, archBand(hole, 0.14, 0.08), [-24, 0, 5]);
    }
    const leaves = s.material('#3f7a3a', { roughness: 0.8, side: THREE.DoubleSide });
    const bark = s.material('#7a6a55', { roughness: 0.9 });
    if (a.palms) {
      const spots: [number, number][] = [[9, 9], [-9, 10], [11, -6], [-10, -9], [14, 3], [7, 14], [-13, 4]];
      for (const [px, pz] of spots) {
        const h = 11 + random() * 8, lean = (random() - 0.5) * 2.2, leanZ = (random() - 0.5) * 2.2;
        const top: V3 = [px + lean, h, pz + leanZ];
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(px, 0, pz), new THREE.Vector3(px + lean * 0.2, h * 0.5, pz + leanZ * 0.2), new THREE.Vector3(...top));
        b.add(bark, new THREE.TubeGeometry(curve, 8, 0.24, 6));
        for (let f = 0; f < 9; f++) {
          const an = f / 9 * Math.PI * 2 + random() * 0.3;
          const frond = new THREE.PlaneGeometry(4.2, 0.9, 4, 1).rotateX(-Math.PI / 2).translate(2.1, 0, 0);
          const pos = frond.attributes.position;
          for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setY(k, -0.14 * x * x + 0.3 * x); }
          frond.computeVertexNormals();
          b.add(leaves, frond, top, [0, an, 0]);
        }
      }
    }
    // Scaffolding up the shaft.
    if (a.state === 'scaffold') {
      const bamboo = s.material('#c4a066', { roughness: 0.7 });
      for (const sx of [-1, 1]) for (const k of [-1, -0.33, 0.33, 1]) {
        b.rod(bamboo, [sx * 6.4, 0, k * 6.4], [sx * 6.0, 50, k * 6.0], 0.09, 4);
        b.rod(bamboo, [k * 6.4, 0, sx * 6.4], [k * 6.0, 50, sx * 6.0], 0.09, 4);
      }
      for (let y = 2; y < 50; y += 2.2) {
        const r = 6.4 - y / 50 * 0.4;
        for (const sx of [-1, 1]) { b.rod(bamboo, [-r, y, sx * r], [r, y, sx * r], 0.07, 4); b.rod(bamboo, [sx * r, y, -r], [sx * r, y, r], 0.07, 4); }
      }
      const net = new THREE.MeshStandardMaterial({ color: '#3f8a52', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
      for (let k = 0; k < 4; k++) { const m = s.mesh(new THREE.PlaneGeometry(12.8, 11), net, [Math.sin(k * Math.PI / 2) * 6.5, 6.5, Math.cos(k * Math.PI / 2) * 6.5]); m.rotation.y = k * Math.PI / 2; m.castShadow = false; }
    }
    b.flush(s, { uv: new Map<THREE.Material, (g: THREE.BufferGeometry) => void>([[stone, (g) => planarUV(g, 3)], [trim, (g) => planarUV(g, 1.5)], [glass, (g) => planarUV(g, 2.5)], [path, (g) => planarUV(g, 4)]]) });

    // Weather.
    let crows: THREE.Group | null = null;
    if (a.weather === 'crows') {
      crows = new THREE.Group();
      const crow = new THREE.BufferGeometry();
      crow.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 0, 0.1, -0.35, 0, 0, 0.45, 1, 0, 0, 0, 0, 0.45, 0, 0.1, -0.35], 3));
      crow.computeVertexNormals();
      const birds: { at: V3; size: number }[] = [];
      for (let i = 0; i < 30 + Math.round(mood.density * 40); i++) { const an = random() * Math.PI * 2, r = 9 + random() * 14; birds.push({ at: [Math.cos(an) * r, 52 + random() * 30, Math.sin(an) * r], size: 0.55 + random() * 0.3 }); }
      const flock = new THREE.InstancedMesh(crow, new THREE.MeshStandardMaterial({ color: '#141416', side: THREE.DoubleSide }), birds.length);
      const m = new THREE.Matrix4();
      birds.forEach((bird, i) => { const an = Math.atan2(bird.at[2], bird.at[0]); m.compose(new THREE.Vector3(...bird.at), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -an, (random() - 0.5) * 0.6)), new THREE.Vector3(bird.size, bird.size, bird.size)); flock.setMatrixAt(i, m); });
      crows.add(flock);
      // Some perched on pinnacles.
      const perched = s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(0.7, 0.8, 1.2), s.material('#18181a'), pinnacleTips.filter(() => random() < 0.4).map(([x, y, z]) => ({ at: [x, y + 0.35, z] as V3, size: 0.32 })));
      perched.castShadow = false;
      s.root.add(crows);
    }
    if (wet) {
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 900; i++) drops.push({ at: [(random() - 0.5) * 50, random() * 85, (random() - 0.5) * 50], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.1, 3.5, 0.1).rotateZ(0.12), new THREE.MeshBasicMaterial({ color: '#e6edf3', transparent: true, opacity: 0.45, depthWrite: false }), drops).castShadow = false;
    }

    s.root.rotation.y = -0.7;
    const speed = mix(0.05, 0.4, mood.energy);
    return s.finish({ update: (dt) => { if (crows) crows.rotation.y += dt * speed; } });
  },
});
