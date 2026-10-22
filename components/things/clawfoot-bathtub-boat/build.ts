import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SHEETS = {
  plain: 'A plain white bedsheet.',
  ticking: 'Blue-and-white striped mattress ticking.',
  floral: 'A faded floral sheet from a grandmother’s cupboard.',
  patchwork: 'A patchwork quilt in many colours.',
  stars: 'A child’s navy sheet printed with yellow stars and moons.',
  jolly: 'A black sheet with a hand-painted skull and crossbones.',
} as const;
const HULLS = { white: 'White enamel all over.', black: 'Black-painted iron.', sea: 'Sea green.', pink: 'Dusty pink.', copper: 'Polished copper.', navy: 'Navy blue.' } as const;
const HULL_TINT: Record<keyof typeof HULLS, string> = { white: '#ecebe4', black: '#2a2c2f', sea: '#4f9c8c', pink: '#d99aa0', copper: '#b8703f', navy: '#27406b' };

export default defineThing({
  questions: {
    passenger: choice('What trace has its passenger left?', {
      duck: 'A rubber duck bobbing in the water.',
      coat: 'A small raincoat draped over the rim.',
      footprints: 'Wet footprints leading away across the floor.',
      teddy: 'A teddy bear sitting in the stern as crew.',
      none: 'No trace at all: it sails empty.',
    }),
    sail: choice('What bedsheet is the sail made from?', SHEETS),
    water: score('How much water is in the tub?', ['A puddle round the plug', 'Ankle deep', 'Half full', 'Brimming and slopping over the rim']),
    hull: choice('What colour is the outside of the tub?', HULLS),
    shape: choice('What shape is the tub?', {
      rolltop: 'A level roll-top tub.',
      slipper: 'A slipper tub with one high raised back, like a prow.',
      double: 'A double-ended tub rising at both ends like a little ship.',
    }),
    oar: choice('What does it row with?', {
      oar: 'A real wooden oar.', broom: 'A kitchen broom.', spoon: 'A huge wooden spoon.', none: 'Nothing: the oar has been lost overboard.',
    }),
    masthead: choice('What flies from the top of the mast?', {
      pennant: 'A red triangular pennant.', sock: 'A single striped sock.', lantern: 'A little glowing lantern.', none: 'Nothing.',
    }),
    voyage: choice('Where is it in its voyage?', {
      anchored: 'At anchor: the bath plug thrown out on its chain.',
      underway: 'Under way, leaving ripples across the floor.',
      aground: 'Run aground and heeled over on its side.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const b = new Sculpture(context);
    s.root.add(b.root);
    const { mood, random } = context;
    const hull = b.material(HULL_TINT[a.hull], { roughness: 0.45, metalness: a.hull === 'copper' ? 0.8 : 0.1 });
    const enamel = b.material('#f3f1ea', { roughness: 0.25 });
    const brass = b.material(a.hull === 'black' || a.hull === 'navy' ? '#c9a24a' : '#55504a', { metalness: 0.8, roughness: 0.3 });
    const wood = b.material('#a57a4c');
    const rope = b.material('#cbb98f', { roughness: 1 });
    const base = 0.17, K = 2.15, rimY = 0.5;
    const rise = (x: number) => a.shape === 'slipper' ? 0.3 * THREE.MathUtils.smoothstep(-x, 0, 0.78) : a.shape === 'double' ? 0.15 * THREE.MathUtils.smoothstep(Math.abs(x), 0.25, 0.8) : 0;
    const shell = (profile: [number, number][], material: THREE.Material) => {
      const mesh = b.lathe(profile, material, [0, base, 0]);
      mesh.geometry.scale(K, 1, 1);
      const pos = mesh.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setY(i, y + rise(pos.getX(i)) * Math.max(0, y / rimY) ** 1.5); }
      mesh.geometry.computeVertexNormals();
      (material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      return mesh;
    };
    shell([[0, 0], [0.2, 0], [0.3, 0.06], [0.355, 0.25], [0.375, rimY]], hull);
    shell([[0.375, rimY], [0.33, 0.25], [0.28, 0.09], [0.19, 0.045], [0, 0.04]], enamel);
    b.tube(Array.from({ length: 40 }, (_u, i) => { const t = i / 40 * Math.PI * 2, x = Math.cos(t) * 0.385 * K; return [x, base + rimY + rise(x), Math.sin(t) * 0.385] as const; }), 0.032, enamel, true);
    // Claw feet.
    for (const x of [-0.52, 0.52]) for (const z of [-0.2, 0.2]) {
      b.ball([0.05, 0.045, 0.05], [x * 1.05, 0.045, z * 1.3], brass, 12);
      b.tube([[x * 1.05, 0.06, z * 1.3], [x * 1.1, 0.14, z * 1.35], [x, 0.2, z * 1.15], [x * 0.9, 0.27, z]], 0.028, brass);
    }
    // Taps at the stern end.
    const sternX = 0.72;
    b.rod([sternX, base + rimY + rise(sternX), 0], [sternX, base + rimY + rise(sternX) + 0.16, 0], 0.018, brass);
    b.rod([sternX, base + rimY + rise(sternX) + 0.15, 0], [sternX - 0.12, base + rimY + rise(sternX) + 0.12, 0], 0.016, brass);
    for (const z of [-0.09, 0.09]) b.ball([0.03, 0.02, 0.03], [sternX, base + rimY + rise(sternX) + 0.06, z], brass, 8);

    // Water, with a paper boat afloat.
    const level = 0.05 + a.water * 0.44;
    const waterY = base + level;
    const radius = mix(0.2, 0.36, Math.min(1, (level - 0.04) / 0.3));
    const sea = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.55, 0.47, mood.warmth), 0.45, 0.6), roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.86 });
    const surface = b.mesh(new THREE.CircleGeometry(radius, 36), sea, [0, waterY, 0]);
    surface.rotation.x = -Math.PI / 2; surface.scale.x = K; surface.castShadow = false;
    const afloat = new THREE.Group();
    afloat.position.set(-0.18, waterY, 0.02);
    b.root.add(afloat);
    const paper = b.material('#fbfaf2', { roughness: 0.9, side: THREE.DoubleSide });
    const hullShape = new THREE.Shape([new THREE.Vector2(-0.15, 0.06), new THREE.Vector2(0.15, 0.06), new THREE.Vector2(0.08, 0), new THREE.Vector2(-0.08, 0)]);
    const toy = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.07, bevelEnabled: false }), paper);
    toy.position.z = -0.035;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 4), paper);
    peak.position.y = 0.1; peak.scale.z = 0.5;
    afloat.add(toy, peak);
    afloat.rotation.y = random() * 3;
    afloat.traverse((node) => { node.castShadow = true; });
    const bobbing: THREE.Object3D[] = [afloat];

    // Mast, yard and bedsheet sail.
    const mastX = -0.22, mastTop = 2.05, yardY = 1.9, yaw = 0.95;
    b.rod([mastX, base + 0.04, 0], [mastX, mastTop, 0], 0.022, wood);
    b.box([0.12, 0.05, 0.5], [mastX, base + rimY + rise(mastX) + 0.01, 0], wood);
    const sailW = 1.05, sailH = 1.12;
    const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const end = (side: number, y: number): [number, number, number] => [mastX + dir.x * side * sailW / 2, y, dir.z * side * sailW / 2];
    b.rod(end(-1.08, yardY), end(1.08, yardY), 0.016, wood);
    const cloth = document.createElement('canvas');
    cloth.width = cloth.height = 256;
    const ctx = cloth.getContext('2d')!;
    const fade = mood.wear * 0.25;
    ctx.fillStyle = { plain: '#f6f3ea', ticking: '#f1efe6', floral: '#f3e6dc', patchwork: '#ddd', stars: '#24386e', jolly: '#222326' }[a.sail];
    ctx.fillRect(0, 0, 256, 256);
    if (a.sail === 'ticking') { ctx.fillStyle = '#47699c'; for (let i = 0; i < 16; i++) ctx.fillRect(i * 16 + 3, 0, i % 3 ? 3 : 7, 256); }
    else if (a.sail === 'floral') for (let i = 0; i < 40; i++) {
      const x = random() * 256, y = random() * 256; ctx.fillStyle = ['#d9778a', '#e5a04c', '#8e7cc3'][i % 3];
      for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p * 1.26) * 7, y + Math.sin(p * 1.26) * 7, 5, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#6e9a5a'; ctx.fillRect(x - 2, y + 9, 4, 9);
    } else if (a.sail === 'patchwork') { const cols = ['#c8553d', '#e8b54a', '#4f8a8b', '#7a5c99', '#e9d8b4', '#5b7c3a', '#d98ca0']; for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) { ctx.fillStyle = cols[Math.floor(random() * cols.length)]; ctx.fillRect(x * 43, y * 43, 41, 41); } }
    else if (a.sail === 'stars') { ctx.fillStyle = '#f3d24f'; for (let i = 0; i < 26; i++) { const x = random() * 256, y = random() * 256, r = 5 + random() * 7; ctx.beginPath(); for (let p = 0; p < 10; p++) { const rr = p % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.sin(p * 0.628) * rr, y - Math.cos(p * 0.628) * rr); } ctx.fill(); } }
    else if (a.sail === 'jolly') {
      ctx.fillStyle = '#f1eee2'; ctx.beginPath(); ctx.arc(128, 105, 46, 0, 7); ctx.fill(); ctx.fillRect(100, 130, 56, 34);
      ctx.fillStyle = '#222326'; ctx.beginPath(); ctx.arc(110, 105, 12, 0, 7); ctx.arc(146, 105, 12, 0, 7); ctx.fill(); for (let i = 0; i < 3; i++) ctx.fillRect(112 + i * 14, 146, 4, 18);
      ctx.strokeStyle = '#f1eee2'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(60, 170); ctx.lineTo(196, 226); ctx.moveTo(196, 170); ctx.lineTo(60, 226); ctx.stroke();
    }
    ctx.fillStyle = `rgba(150,140,120,${fade})`; ctx.fillRect(0, 0, 256, 256);
    const sheet = new THREE.CanvasTexture(cloth);
    sheet.colorSpace = THREE.SRGBColorSpace;
    const sailGeo = new THREE.PlaneGeometry(sailW, sailH, 12, 12);
    const rest = sailGeo.getAttribute('position').clone();
    const billow = mix(0.06, 0.3, mood.energy);
    const fill = (phase: number) => {
      const pos = sailGeo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        const u = rest.getX(i) / sailW + 0.5, v = rest.getY(i) / sailH + 0.5;
        pos.setZ(i, Math.sin(u * Math.PI) * Math.sin((1 - v) * Math.PI * 0.75) * billow * (1 + Math.sin(phase + u * 4) * 0.12) + Math.sin(u * 9 + phase) * 0.012 * (1 - v));
      }
      pos.needsUpdate = true;
      sailGeo.computeVertexNormals();
    };
    fill(0);
    const sail = b.mesh(sailGeo, new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.9, side: THREE.DoubleSide }), [mastX, yardY - sailH / 2, 0]);
    sail.rotation.y = yaw - Math.PI / 2;
    for (const side of [-1, 1]) {
      const corner = end(side, yardY - sailH);
      const cleatX = corner[0] + 0.1 * side, cz = Math.sign(corner[2] || side) * 0.37;
      b.rod(corner, [cleatX, base + rimY + rise(cleatX), cz], 0.007, rope);
      b.ball([0.02, 0.02, 0.02], corner, rope, 8);
    }
    if (a.masthead === 'pennant') {
      const tri = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, 0.16), new THREE.Vector2(0.38, 0.08)]);
      b.mesh(new THREE.ShapeGeometry(tri), b.material('#c8322f', { side: THREE.DoubleSide }), [mastX, mastTop - 0.18, 0]).rotation.y = -0.5;
    } else if (a.masthead === 'sock') {
      const knit = b.material('#d85b4a');
      b.tube([[mastX, mastTop - 0.04, 0], [mastX + 0.14, mastTop - 0.07, 0.05], [mastX + 0.26, mastTop - 0.12, 0.08], [mastX + 0.3, mastTop - 0.2, 0.09]], 0.035, knit);
      b.ball([0.04, 0.04, 0.04], [mastX + 0.3, mastTop - 0.21, 0.09], b.material('#f1eee2'), 10);
    } else if (a.masthead === 'lantern') {
      b.box([0.1, 0.14, 0.1], [mastX, mastTop + 0.07, 0], new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffd36a', emissiveIntensity: 1.2 }));
      b.cylinder(0.02, 0.075, 0.05, [mastX, mastTop + 0.165, 0], brass, 4);
      b.box([0.12, 0.015, 0.12], [mastX, mastTop, 0], brass);
    }

    // Something to row with.
    if (a.oar !== 'none') {
      const from: [number, number, number] = [0.5, base + rimY + 0.45, -0.3], lock: [number, number, number] = [0.3, base + rimY + rise(0.3) + 0.04, 0.4], to: [number, number, number] = [0.14, 0.06, 1.02];
      b.rod(from, to, a.oar === 'spoon' ? 0.022 : 0.018, wood);
      b.ring(0.04, 0.01, lock, brass).rotation.x = Math.PI / 2;
      const blade = a.oar === 'oar' ? b.box([0.16, 0.42, 0.02], to, wood) : a.oar === 'broom' ? b.box([0.3, 0.2, 0.06], to, b.material('#d6b760', { roughness: 1 })) : b.ball([0.11, 0.15, 0.03], to, wood, 14);
      blade.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize());
      blade.translateY(a.oar === 'broom' ? 0 : -0.12);
    }

    // The passenger's trace.
    if (a.passenger === 'duck') {
      const duck = new THREE.Group();
      const yellow = b.material('#f5cf2b', { roughness: 0.3 });
      const bit = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; duck.add(m); };
      const ball = new THREE.SphereGeometry(1, 14, 10);
      bit(ball, yellow, 0, 0.05, 0, 0.1, 0.065, 0.075); bit(ball, yellow, 0.07, 0.13, 0, 0.055, 0.055, 0.055); bit(ball, yellow, -0.1, 0.08, 0, 0.04, 0.03, 0.04);
      bit(new THREE.ConeGeometry(0.025, 0.05, 8), b.material('#e8762a'), 0.13, 0.12, 0, 1, 1, 1.6); duck.children[3].rotation.z = -Math.PI / 2;
      for (const z of [-0.03, 0.03]) bit(ball, b.material('#1b1b1b'), 0.105, 0.15, z, 0.01, 0.01, 0.01);
      duck.position.set(0.3, waterY - 0.01, -0.08); duck.rotation.y = random() * 6;
      b.root.add(duck); bobbing.push(duck);
    } else if (a.passenger === 'coat') {
      const coat = b.material(mood.cheer > 0.4 ? '#e9c22a' : '#6d7a86', { roughness: 0.5, side: THREE.DoubleSide });
      const cx = 0.25, top = base + rimY + rise(cx) + 0.04;
      b.tube([[cx, top - 0.5, 0.47], [cx, top - 0.2, 0.43], [cx, top, 0.385], [cx, top - 0.12, 0.3], [cx, top - 0.3, 0.27]], 0.035, coat).scale.set(6, 1, 1);
      b.mesh(new THREE.BoxGeometry(0.42, 0.5, 0.03), coat, [cx, top - 0.27, 0.45]).rotation.x = -0.12;
      for (const side of [-1, 1]) b.rod([cx + side * 0.2, top - 0.05, 0.42], [cx + side * 0.3, top - 0.48, 0.5], 0.04, coat, 0.035);
      b.ball([0.11, 0.05, 0.08], [cx, top + 0.02, 0.38], coat, 12);
    } else if (a.passenger === 'teddy') {
      const fur = b.material('#a8763e', { roughness: 1 }), tx = 0.52, ty = Math.max(waterY, base + 0.12);
      b.ball([0.13, 0.17, 0.12], [tx, ty + 0.17, 0], fur, 14); b.ball([0.11, 0.1, 0.1], [tx, ty + 0.42, 0], fur, 14);
      for (const z of [-0.08, 0.08]) { b.ball([0.04, 0.04, 0.025], [tx, ty + 0.51, z], fur, 10); b.ball([0.045, 0.1, 0.045], [tx - 0.07, ty + 0.25, z * 1.7], fur, 10).rotation.z = -0.9; b.ball([0.012, 0.012, 0.012], [tx - 0.095, ty + 0.44, z * 0.5], b.material('#1b1b1b'), 8); }
      b.ball([0.045, 0.035, 0.045], [tx - 0.09, ty + 0.4, 0], b.material('#e2c79a'), 10);
    }

    // Slopping over, and the state of the voyage. These lie on the floor, outside the heeling hull.
    const wet = new THREE.MeshStandardMaterial({ color: '#7fa9b8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.7 });
    if (a.water > 0.8) {
      for (let i = 0; i < 4; i++) { const t = random() * 6.28; b.rod([Math.cos(t) * 0.385 * K, base + rimY, Math.sin(t) * 0.4], [Math.cos(t) * 0.36 * K, base + 0.1 + random() * 0.2, Math.sin(t) * 0.385], 0.014, wet, 0.02); }
      for (let i = 0; i < 4; i++) { const t = random() * 6.28, r = 0.12 + random() * 0.16; s.cylinder(r, r, 0.008, [Math.cos(t) * 0.75, 0.004, Math.sin(t) * 0.45], wet, 20).castShadow = false; }
    }
    if (a.passenger === 'footprints') {
      const print = new THREE.MeshStandardMaterial({ color: '#6f95a6', roughness: 0.05, metalness: 0.3 });
      for (let i = 0; i < 6; i++) {
        const x = 0.15 + i * 0.13 + (i % 2) * 0.02, z = 0.55 + i * 0.16, side = i % 2 ? 0.07 : -0.07;
        const sole = s.cylinder(0.045, 0.045, 0.006, [x + side, 0.003, z], print, 14); sole.scale.z = 1.5; sole.rotation.y = 0.6; sole.castShadow = false;
        s.cylinder(0.03, 0.03, 0.006, [x + side - 0.055, 0.003, z - 0.07], print, 12).castShadow = false;
      }
    }
    if (a.voyage === 'anchored') {
      const chainMat = s.material('#b9bcbc', { metalness: 0.8, roughness: 0.3 });
      const pts: [number, number, number][] = [[0.6, base + rimY + rise(0.6), 0.36], [0.72, 0.3, 0.55], [0.8, 0.03, 0.7], [0.62, 0.02, 0.92]];
      b.tube(pts, 0.008, chainMat);
      s.scatter(new THREE.SphereGeometry(0.5, 6, 5), chainMat, Array.from({ length: 16 }, (_u, i) => { const p = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))).getPointAt(i / 15); return { at: [p.x, p.y, p.z] as const, size: 0.026 }; }));
      s.cylinder(0.05, 0.04, 0.03, [0.62, 0.015, 0.92], s.material('#1c1c1c', { roughness: 0.9 }), 16);
    } else if (a.voyage === 'underway') {
      const ripple = new THREE.MeshStandardMaterial({ color: '#8fb6c4', roughness: 0.1, metalness: 0.2 });
      for (let i = 0; i < 4; i++) {
        const wake = s.ring(0.5 + i * 0.26, 0.012, [0.55, 0.006, 0], ripple, Math.PI * 0.7);
        wake.rotation.set(-Math.PI / 2, 0, -Math.PI * 0.35); wake.scale.y = 0.75; wake.castShadow = false;
      }
      for (const z of [-1, 1]) { const bow = s.ring(0.3, 0.014, [-0.72, 0.006, z * 0.3], ripple, Math.PI * 0.5); bow.rotation.set(-Math.PI / 2, 0, z > 0 ? Math.PI * 0.55 : Math.PI * 0.95); bow.castShadow = false; }
    } else {
      b.root.rotation.x = 0.2;
      b.root.position.y = 0.035;
      b.root.rotation.z = -0.05;
    }

    const energy = mood.energy;
    return s.finish({
      footprint: 0.95,
      update: (_dt, time) => {
        fill(time * mix(0.6, 3, energy));
        bobbing.forEach((float, i) => { float.position.y = waterY + (i ? -0.01 : 0) + Math.sin(time * mix(0.8, 2.6, energy) + i * 2) * mix(0.003, 0.014, energy); float.rotation.z = Math.sin(time * 1.3 + i) * 0.08 * energy; });
      },
    });
  },
});
