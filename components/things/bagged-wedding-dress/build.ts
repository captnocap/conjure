import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const ERAS = {
  twenties: '1920s: a straight drop-waisted shift, heavy with beads and a fringed hem.',
  fifties: '1950s: a nipped waist, long lace sleeves and a full tea-length skirt over net petticoats.',
  seventies: '1970s: high lace neck, bell sleeves, a long soft cream column.',
  eighties: '1980s: enormous puff sleeves, a bow at the waist and a train that will not stay in the bag.',
  nineties: '1990s: a plain strapless satin sheath, long and narrow.',
} as const;

export default defineThing({
  questions: {
    era: choice('When is the dress from?', ERAS),
    state: choice('What state is the dress in?', {
      preserved: 'Professionally preserved: spotless, packed with tissue, a lavender sachet on the hanger.',
      'never-worn': 'Never worn: the shop tag still hangs from it.',
      'moth-eaten': 'Moth-eaten: holes through the lace, dead moths on the floor beneath.',
      stained: 'Worn hard on the day: a grey trodden hem and a wine stain on the bodice.',
    }),
    unzip: score('How far has the bag been unzipped?', ['Barely, a glimpse at the collar', 'To the waist', 'All the way down, hanging open']),
    bag: choice('What is the garment bag made of?', {
      vinyl: 'Clear vinyl gone yellow and cloudy.',
      cotton: 'An opaque white cotton bridal bag.',
      black: 'A black suit carrier, anonymous.',
      film: 'Thin blue dry-cleaner film, torn and knotted at the bottom.',
    }),
    shoes: choice('What is in the shoe box underneath?', {
      heels: 'A pair of satin heels side by side in tissue.',
      kicked: 'One shoe in the box and the other lying on the floor.',
      veil: 'The folded veil and the dried bouquet.',
      empty: 'Only tissue paper. The shoes are gone.',
    }),
    beside: choice('What else hangs on the rail?', {
      alone: 'Nothing: the dress hangs alone.',
      hangers: 'A few empty wire hangers.',
      suit: 'A dark suit in its own zipped carrier.',
      bridesmaid: 'A pastel bridesmaid dress with no bag at all.',
    }),
    rail: choice('What kind of rail is it?', {
      chrome: 'A chrome shop rail on casters.',
      black: 'A black tubular rail, the folding kind.',
      brass: 'An old brass rail with ball finials.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };
    const BAR = 1.74, RW = 1.12;

    // ---- rail
    const railHex = { chrome: '#c9ced2', black: '#232326', brass: '#b9954a' }[a.rail];
    const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color(railHex).lerp(new THREE.Color('#7a4a2c'), mood.wear * (a.rail === 'chrome' ? 0.35 : 0.2)), metalness: a.rail === 'black' ? 0.4 : 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const tubeR = 0.017;
    for (const x of [-1, 1]) {
      s.rod([x * RW / 2, 0.085, 0], [x * RW / 2, BAR, 0], tubeR, metal);
      s.rod([x * RW / 2, 0.085, -0.27], [x * RW / 2, 0.085, 0.27], tubeR, metal);
      for (const z of [-0.25, 0.25]) { s.cylinder(0.008, 0.008, 0.04, [x * RW / 2, 0.065, z], metal, 6); const wheel = s.cylinder(0.03, 0.03, 0.022, [x * RW / 2, 0.03, z + 0.012], s.material('#1c1c1e'), 12); wheel.rotation.z = Math.PI / 2; }
      if (a.rail === 'brass') s.ball([0.032, 0.032, 0.032], [x * RW / 2, BAR + 0.03, 0], metal, 12); else s.ball([tubeR, tubeR, tubeR], [x * RW / 2, BAR, 0], metal, 8);
    }
    s.rod([-RW / 2, BAR, 0], [RW / 2, BAR, 0], tubeR, metal);
    s.rod([-RW / 2, 0.14, 0], [RW / 2, 0.14, 0], tubeR * 0.9, metal);

    /** A group that swings from the bar; build inside it in world heights. */
    const swingers: { group: THREE.Group; amount: number; phase: number }[] = [];
    const hung = (x: number, amount: number) => {
      const pivot = new THREE.Group(); pivot.position.set(x, BAR, 0); s.root.add(pivot);
      const inner = new THREE.Group(); inner.position.y = -BAR; pivot.add(inner);
      swingers.push({ group: pivot, amount, phase: random() * 6.283 });
      return inner;
    };
    const hanger = (g: THREE.Group, top: number, material: THREE.Material, half = 0.21) => {
      for (const side of [-1, 1]) { const arm = new THREE.Vector3(side * half, top - 0.085, 0), mid = new THREE.Vector3(0, top, 0); const m = put(g, new THREE.CylinderGeometry(0.011, 0.011, arm.distanceTo(mid), 8), material, arm.clone().add(mid).multiplyScalar(0.5).toArray() as P3); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arm.clone().sub(mid).normalize()); }
      put(g, new THREE.CylinderGeometry(0.004, 0.004, BAR - top - 0.02, 6), metal, [0, (BAR + top) / 2 - 0.01, 0]);
      const hook = put(g, new THREE.TorusGeometry(0.026, 0.004, 6, 16, Math.PI * 1.4), metal, [0, BAR + 0.004, 0]); hook.rotation.y = Math.PI / 2; hook.rotation.z = -0.5;
    };

    // ---- the dress
    const dressX = a.beside === 'alone' ? 0 : -0.18;
    const g = hung(dressX, a.era === 'eighties' ? 0.25 : 1);
    const yT = 1.6, yB = 0.52, BW = 0.62, ZF = 0.085, ZB = -0.06;
    const yellowing = clamp01(mood.wear * 0.6 + (a.state === 'moth-eaten' ? 0.3 : 0) - (a.state === 'preserved' ? 0.2 : 0));
    const dressHex = new THREE.Color({ twenties: '#eee3c6', fifties: '#f6f3ea', seventies: '#efe6cf', eighties: '#fbfaf5', nineties: '#f3efe4' }[a.era]).lerp(new THREE.Color('#cdb27a'), yellowing * 0.6);
    const lace = paint(256, 256, (ctx) => {
      ctx.fillStyle = `#${dressHex.getHexString()}`; ctx.fillRect(0, 0, 256, 256);
      const shade = `#${dressHex.clone().multiplyScalar(0.78).getHexString()}`;
      ctx.strokeStyle = shade; ctx.lineWidth = 2.5;
      for (let i = 0; i < 16; i++) { const x = (i % 4) * 64 + 32 + (Math.floor(i / 4) % 2) * 32, y = Math.floor(i / 4) * 64 + 32; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(k * 1.047) * 13, y + Math.sin(k * 1.047) * 13, 10, 5, k * 1.047, 0, 7); ctx.stroke(); } ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); }
      if (a.era === 'twenties') { ctx.fillStyle = '#ffffff'; for (let y = 6; y < 256; y += 14) for (let x = (y % 28 ? 4 : 11); x < 256; x += 14) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); } }
      if (a.state === 'moth-eaten') for (let i = 0; i < 16; i++) { ctx.fillStyle = '#3a3024'; ctx.beginPath(); const x = random() * 256, y = random() * 256, r = 4 + random() * 11; for (let k = 0; k < 8; k++) ctx.lineTo(x + Math.cos(k * 0.785) * r * (0.6 + random() * 0.7), y + Math.sin(k * 0.785) * r * (0.6 + random() * 0.7)); ctx.fill(); }
      if (a.state === 'stained') { const grd = ctx.createRadialGradient(150, 140, 4, 150, 140, 60); grd.addColorStop(0, 'rgba(120,20,50,0.85)'); grd.addColorStop(0.8, 'rgba(120,20,50,0.5)'); grd.addColorStop(1, 'rgba(120,20,50,0)'); ctx.fillStyle = grd; ctx.fillRect(80, 70, 140, 140); }
    });
    lace.wrapS = lace.wrapT = THREE.RepeatWrapping; lace.repeat.set(a.state === 'stained' ? 1 : 3, a.state === 'stained' ? 1 : 2);
    const laceMaterial = new THREE.MeshStandardMaterial({ map: lace, roughness: 0.85, side: THREE.DoubleSide });
    const satinTexture = paint(64, 256, (ctx) => {
      ctx.fillStyle = `#${dressHex.getHexString()}`; ctx.fillRect(0, 0, 64, 256);
      if (a.state === 'stained') { const grd = ctx.createLinearGradient(0, 150, 0, 256); grd.addColorStop(0, 'rgba(90,80,66,0)'); grd.addColorStop(1, 'rgba(70,62,52,0.85)'); ctx.fillStyle = grd; ctx.fillRect(0, 0, 64, 256); }
      if (a.state === 'moth-eaten') for (let i = 0; i < 9; i++) { ctx.fillStyle = '#3a3024'; ctx.beginPath(); ctx.ellipse(random() * 64, random() * 256, 1.5 + random() * 2.5, 4 + random() * 7, 0, 0, 7); ctx.fill(); }
    });
    const satin = new THREE.MeshStandardMaterial({ map: satinTexture, roughness: a.era === 'seventies' ? 0.8 : 0.36, side: THREE.DoubleSide });
    const pearl = new THREE.MeshStandardMaterial({ color: '#fffdf6', roughness: 0.25, metalness: 0.1 });

    const SQ = 0.3;
    const body = new THREE.Group(); body.scale.z = SQ; g.add(body);
    const waistY = a.era === 'twenties' ? yT - 0.72 : yT - 0.46, waistR = a.era === 'twenties' ? 0.165 : a.era === 'nineties' || a.era === 'seventies' ? 0.14 : 0.12;
    const high = a.era === 'seventies' || a.era === 'fifties' || a.era === 'eighties';
    const bodice: [number, number][] = high
      ? [[waistR, waistY], [0.15, yT - 0.32], [0.175, yT - 0.22], [0.185, yT - 0.12], [0.17, yT - 0.07], [0.09, yT - 0.035], [a.era === 'seventies' ? 0.05 : 0.085, yT + (a.era === 'seventies' ? 0.03 : -0.03)]]
      : [[waistR, waistY], [0.165, yT - 0.4], [0.175, yT - 0.26], [0.178, yT - 0.15], [0.172, yT - 0.13]];
    put(body, new THREE.LatheGeometry(bodice.map(([r, y]) => new THREE.Vector2(r, y)), 28), a.era === 'nineties' ? satin : laceMaterial);
    if (!high) for (const side of [-1, 1]) put(g, new THREE.CylinderGeometry(0.006, 0.006, 0.12, 5), satin, [side * 0.12, yT - 0.085, 0]).rotation.z = side * 0.35;
    // skirt: squeezed flat where the bag holds it, spreading where it escapes
    const hem = { twenties: 0.42, fifties: 0.36, seventies: 0.2, eighties: 0.03, nineties: 0.1 }[a.era];
    const fullness = { twenties: 0.19, fifties: 0.29, seventies: 0.24, eighties: 0.3, nineties: 0.17 }[a.era];
    const escape = { twenties: 0.2, fifties: 0.42, seventies: 0.3, eighties: 0.52, nineties: 0.2 }[a.era];
    const skirtPoints: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) { const y = mix(waistY, hem, i / 20); const inBag = clamp01((waistY - y) / Math.max(waistY - yB, 0.01)); const r = y >= yB ? mix(waistR, fullness, Math.sin(inBag * Math.PI / 2)) : mix(fullness, escape, ((yB - y) / Math.max(yB - hem, 0.01)) ** 0.7); skirtPoints.push(new THREE.Vector2(r, y)); }
    const skirtGeometry = new THREE.LatheGeometry(skirtPoints, 56);
    const sp = skirtGeometry.getAttribute('position'), k1 = random() * 6, ragged = a.state === 'moth-eaten' ? 0.05 : 0.012;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), phi = Math.atan2(x, z), t = clamp01((waistY - y) / (waistY - hem)), free = clamp01((yB - y) / 0.2);
      const fold = 1 + 0.07 * t * Math.sin(phi * 13 + k1);
      sp.setXYZ(i, x * fold, y + t * t * ragged * Math.sin(phi * 5 + k1), z * fold * (1 + free * 1.4));
    }
    skirtGeometry.computeVertexNormals();
    put(body, skirtGeometry, a.era === 'twenties' || a.era === 'seventies' ? laceMaterial : satin);
    if (a.era === 'twenties') { const n = 40, fringe = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.11, 0.004), pearl, n); const m4 = new THREE.Matrix4(); for (let i = 0; i < n; i++) { const phi = i / n * 6.283; m4.makeTranslation(Math.sin(phi) * 0.2, hem - 0.04 - random() * 0.015, Math.cos(phi) * 0.2 * 1.4); fringe.setMatrixAt(i, m4); } fringe.castShadow = true; body.add(fringe); }
    if (a.era === 'fifties') for (let i = 0; i < 3; i++) { const net = put(body, new THREE.CylinderGeometry(0.3 + i * 0.03, 0.44 + i * 0.02, 0.1, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.75 }), [0, hem - 0.02 - i * 0.025, 0]); net.scale.z = 2.2; net.castShadow = false; }
    if (a.era === 'eighties') {
      const train = put(g, new THREE.CircleGeometry(0.78, 28, -0.1, 1.9), new THREE.MeshStandardMaterial({ color: dressHex, roughness: 0.36, side: THREE.DoubleSide }), [0.02, 0.012, 0.06]); train.rotation.x = -Math.PI / 2; train.rotation.z = -0.9;
      const edge = put(g, new THREE.RingGeometry(0.72, 0.8, 28, 1, -0.1, 1.9), laceMaterial, [0.02, 0.016, 0.06]); edge.rotation.x = -Math.PI / 2; edge.rotation.z = -0.9; edge.castShadow = false;
      const bow = satin; for (const side of [-1, 1]) { const loop = put(g, new THREE.SphereGeometry(1, 12, 8), bow, [side * 0.075, waistY, 0.055]); loop.scale.set(0.07, 0.04, 0.02); loop.rotation.z = side * 0.3; } put(g, new THREE.SphereGeometry(0.024, 10, 8), bow, [0, waistY, 0.065]);
    }
    if (a.era === 'fifties') { const sash = put(body, new THREE.CylinderGeometry(waistR + 0.012, waistR + 0.012, 0.055, 24, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#a9c6e6' : '#d9b9b0', roughness: 0.4, side: THREE.DoubleSide }), [0, waistY + 0.01, 0]); sash.castShadow = false; }
    // sleeves hang straight down inside the bag
    const sleeveTop = yT - 0.1;
    if (a.era === 'eighties') for (const side of [-1, 1]) { const puff = put(g, new THREE.SphereGeometry(1, 16, 12), satin, [side * 0.215, sleeveTop - 0.04, 0.005]); puff.scale.set(0.105, 0.13, 0.065); const cuff = put(g, new THREE.CylinderGeometry(0.035, 0.028, 0.34, 10), laceMaterial, [side * 0.235, sleeveTop - 0.32, 0.005]); cuff.scale.z = 0.6; }
    if (a.era === 'fifties') for (const side of [-1, 1]) { const sleeve = put(g, new THREE.CylinderGeometry(0.045, 0.028, 0.56, 10), laceMaterial, [side * 0.215, sleeveTop - 0.27, 0]); sleeve.scale.z = 0.5; sleeve.rotation.z = side * 0.06; }
    if (a.era === 'seventies') for (const side of [-1, 1]) { const sleeve = put(g, new THREE.CylinderGeometry(0.04, 0.1, 0.6, 14, 1, true), laceMaterial, [side * 0.225, sleeveTop - 0.29, 0]); sleeve.scale.z = 0.35; sleeve.rotation.z = side * 0.05; }
    // pearls along the neckline and waist
    const pearlSpots: P3[] = [];
    const neckY = high ? yT - 0.07 : yT - 0.135, neckR = high ? 0.17 : 0.176;
    for (let i = -7; i <= 7; i++) { const phi = i * 0.13; pearlSpots.push([Math.sin(phi) * neckR, neckY - (high ? Math.cos(phi) * 0.02 - 0.02 : 0), Math.cos(phi) * neckR * SQ + 0.006]); }
    for (let i = -6; i <= 6; i++) { const phi = i * 0.15; pearlSpots.push([Math.sin(phi) * (waistR + 0.004), waistY + 0.002, Math.cos(phi) * (waistR + 0.004) * SQ + 0.006]); }
    if (a.era === 'twenties' || a.era === 'seventies') for (let i = 0; i < 9; i++) pearlSpots.push([0, yT - 0.16 - i * 0.045, radiusFront(bodice, yT - 0.16 - i * 0.045) * SQ + 0.006]);
    const pearls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0085, 8, 6), pearl, pearlSpots.length); const pm = new THREE.Matrix4();
    pearlSpots.forEach((at, index) => { pm.makeTranslation(...at); pearls.setMatrixAt(index, pm); }); g.add(pearls);

    // ---- the bag
    const bagTint = new THREE.Color({ vinyl: '#e6dca2', cotton: '#ece8dc', black: '#1e1e22', film: '#9fc4e0' }[a.bag]).lerp(new THREE.Color(a.bag === 'black' ? '#3a3830' : '#bfa55a'), mood.wear * (a.bag === 'film' ? 0.2 : 0.45));
    const clear = a.bag === 'vinyl' || a.bag === 'film';
    const bagMaterial = new THREE.MeshStandardMaterial({ color: bagTint, roughness: clear ? 0.25 : 0.9, side: THREE.DoubleSide, transparent: clear, opacity: clear ? (a.bag === 'vinyl' ? mix(0.5, 0.72, mood.wear) : 0.42) : 1, depthWrite: !clear });
    const edgeMaterial = new THREE.MeshStandardMaterial({ color: bagTint.clone().multiplyScalar(a.bag === 'black' ? 1.8 : 0.72), roughness: 0.8 });
    const topY = (x: number) => yT + 0.045 - Math.abs(x) / (BW / 2) * 0.11;
    const poly = (points: [number, number][], z: number, material: THREE.Material, shadow = true) => {
      const shape = new THREE.Shape(); points.forEach(([x, y], index) => (index ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const mesh = put(g, new THREE.ShapeGeometry(shape), material, [0, 0, z]); mesh.castShadow = shadow && !clear; return mesh;
    };
    const u = a.unzip;
    const zipY = mix(yT - 0.2, yB + 0.06, u), gapL = mix(0.05, 0.15, u) + random() * 0.02, gapR = mix(0.07, 0.25, u) + random() * 0.03;
    poly([[-BW / 2, yB], [BW / 2, yB], [BW / 2, topY(BW / 2)], [0, topY(0)], [-BW / 2, topY(BW / 2)]], ZB, bagMaterial);
    poly([[-BW / 2, yB], [0, yB], [0, zipY], [-gapL, topY(gapL)], [-BW / 2, topY(BW / 2)]], ZF, bagMaterial);
    poly([[BW / 2, yB], [0, yB], [0, zipY], [gapR, topY(gapR)], [BW / 2, topY(BW / 2)]], ZF, bagMaterial);
    for (const side of [-1, 1]) {
      put(g, new THREE.BoxGeometry(0.004, topY(BW / 2) - yB, ZF - ZB), clear ? bagMaterial : edgeMaterial, [side * BW / 2, (topY(BW / 2) + yB) / 2, (ZF + ZB) / 2]).castShadow = !clear;
      // the flap folded back on itself
      const gap = side < 0 ? gapL : gapR, fold = Math.min(gap * mix(0.5, 0.9, u), BW / 2 - 0.03 - gap);
      poly([[side * gap, topY(gap)], [0, zipY], [side * (gap + fold), topY(gap + fold) - 0.03 - u * 0.12]], ZF + 0.004, new THREE.MeshStandardMaterial({ color: bagTint.clone().lerp(new THREE.Color('#ffffff'), a.bag === 'black' ? 0.25 : 0.4), roughness: 0.6, side: THREE.DoubleSide }));
      const teeth = new THREE.Vector3(side * gap, topY(gap), ZF + 0.003), foot = new THREE.Vector3(0, zipY, ZF + 0.003);
      const strip = put(g, new THREE.CylinderGeometry(0.005, 0.005, teeth.distanceTo(foot), 5), new THREE.MeshStandardMaterial({ color: '#8f8a78', metalness: 0.6, roughness: 0.4 }), teeth.clone().add(foot).multiplyScalar(0.5).toArray() as P3);
      strip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), teeth.clone().sub(foot).normalize()); strip.castShadow = false;
    }
    put(g, new THREE.BoxGeometry(0.01, zipY - yB, 0.004), new THREE.MeshStandardMaterial({ color: '#8f8a78', metalness: 0.6, roughness: 0.4 }), [0, (zipY + yB) / 2, ZF + 0.002]).castShadow = false;
    put(g, new THREE.BoxGeometry(0.022, 0.05, 0.008), new THREE.MeshStandardMaterial({ color: '#c9c4b0', metalness: 0.8, roughness: 0.3 }), [0.004, zipY - 0.03, ZF + 0.008]);
    put(g, new THREE.BoxGeometry(BW + 0.006, 0.012, ZF - ZB + 0.006), edgeMaterial, [0, yB, (ZF + ZB) / 2]).castShadow = !clear;
    if (a.bag === 'film') { const knot = put(g, new THREE.SphereGeometry(0.035, 10, 8), bagMaterial, [0.1, yB - 0.03, 0.02]); knot.castShadow = false; }
    const words = { vinyl: 'KEEP DRY', cotton: 'BRIDAL CARE', black: 'TAILORING', film: 'DRY CLEANED' }[a.bag];
    const badge = s.label(words, 0.2, 0.07, [0, 0, 0], a.bag === 'black' ? '#e9e2cf' : '#3a4a6a', a.bag === 'black' ? '#2c2c31' : '#f1ead6'); g.add(badge); badge.position.set(-BW / 4, yB + 0.16, ZF + 0.004); badge.rotation.z = (random() - 0.5) * 0.08; badge.castShadow = false;
    hanger(g, yT + 0.05, a.state === 'preserved' ? s.material('#f1e9e0', { roughness: 0.4 }) : s.material('#9a6a3c', { roughness: 0.5 }));

    // state details
    if (a.state === 'preserved') {
      const tissue = new THREE.MeshStandardMaterial({ color: '#cfe0ee', roughness: 1 });
      for (let i = 0; i < 4; i++) { const wad = put(g, new THREE.SphereGeometry(1, 8, 6), tissue, [(i - 1.5) * 0.06, yT - 0.07 + random() * 0.03, 0.03]); wad.scale.set(0.05, 0.035, 0.03); wad.rotation.z = random() * 3; }
      put(g, new THREE.CylinderGeometry(0.002, 0.002, 0.12, 4), s.material('#8a6fae'), [-0.12, yT - 0.03, ZF + 0.015]);
      const sachet = put(g, new THREE.SphereGeometry(1, 10, 8), s.material('#a48fc9', { roughness: 1 }), [-0.12, yT - 0.12, ZF + 0.02]); sachet.scale.set(0.035, 0.045, 0.02);
    } else if (a.state === 'never-worn') {
      const tagTexture = paint(128, 192, (ctx) => { ctx.fillStyle = '#f4efdc'; ctx.fillRect(0, 0, 128, 192); ctx.fillStyle = '#b3261f'; ctx.fillRect(0, 0, 128, 44); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(pick(['SALE', 'NEW', 'PAID']), 64, 33); ctx.fillStyle = '#26262c'; ctx.font = 'bold 34px serif'; ctx.fillText(`£${150 + Math.floor(random() * 80) * 10}`, 64, 100); ctx.font = '18px serif'; ctx.fillText(`size ${8 + Math.floor(random() * 6) * 2}`, 64, 140); ctx.fillText('no returns', 64, 170); });
      put(g, new THREE.CylinderGeometry(0.0015, 0.0015, 0.16, 4), s.material('#efe9da'), [0.13, yT - 0.06, ZF + 0.02]).castShadow = false;
      const tag = put(g, new THREE.PlaneGeometry(0.085, 0.128), new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 0.8, side: THREE.DoubleSide }), [0.135, yT - 0.2, ZF + 0.024]); tag.rotation.z = -0.12 + random() * 0.2;
    } else if (a.state === 'moth-eaten') {
      const husk = s.material('#8f8672', { roughness: 1 });
      for (let i = 0; i < 9; i++) { const moth = s.box([0.026, 0.003, 0.016], [dressX + (random() - 0.5) * 0.6, 0.002, (random() - 0.3) * 0.5], husk); moth.rotation.y = random() * 6; moth.castShadow = false; }
    }

    // ---- what hangs beside it
    if (a.beside === 'hangers') {
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const h = hung(0.2 + i * (0.3 / n) + random() * 0.03, 3);
        const wire = new THREE.CatmullRomCurve3([[0, BAR - 0.05, 0], [-0.2, BAR - 0.16, 0], [-0.19, BAR - 0.175, 0], [0.19, BAR - 0.175, 0], [0.2, BAR - 0.16, 0], [0, BAR - 0.05, 0]].map((p) => new THREE.Vector3(...(p as P3))), false, 'catmullrom', 0.05);
        put(h, new THREE.TubeGeometry(wire, 40, 0.0035, 5), metal);
        const hook = put(h, new THREE.TorusGeometry(0.024, 0.0035, 5, 14, Math.PI * 1.4), metal, [0, BAR + 0.004, 0]); hook.rotation.y = Math.PI / 2; hook.rotation.z = -0.5;
        put(h, new THREE.CylinderGeometry(0.0035, 0.0035, 0.04, 5), metal, [0, BAR - 0.035, 0]);
        h.parent!.rotation.y = (random() - 0.5) * 0.7;
      }
    } else if (a.beside === 'suit') {
      const h = hung(0.3, 1), carrier = s.material('#1d1e24', { roughness: 0.7 });
      const shape = new THREE.Shape(); ([[-0.24, 0.72], [0.24, 0.72], [0.24, yT - 0.06], [0.05, yT + 0.04], [-0.05, yT + 0.04], [-0.24, yT - 0.06]] as [number, number][]).forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      const bagShape = put(h, new THREE.ExtrudeGeometry(shape, { depth: 0.09, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), carrier, [0, 0, -0.045]);
      bagShape.castShadow = true;
      put(h, new THREE.BoxGeometry(0.008, yT - 0.78, 0.004), new THREE.MeshStandardMaterial({ color: '#8f8a78', metalness: 0.6, roughness: 0.4 }), [0, (yT + 0.72) / 2, 0.06]);
      const ticket = s.label(String(100 + Math.floor(random() * 899)), 0.08, 0.05, [0, 0, 0], '#26262c', '#f2c94c'); h.add(ticket); ticket.position.set(0.1, yT - 0.2, 0.061); ticket.rotation.z = 0.15; ticket.castShadow = false;
      hanger(h, yT + 0.05, s.material('#2a2a2e'), 0.2);
      h.parent!.rotation.y = -0.12;
    } else if (a.beside === 'bridesmaid') {
      const h = hung(0.3, 1.6), colour = new THREE.MeshStandardMaterial({ color: pick(['#f2b6a8', '#c9b3e6', '#a8dcc4', '#f1d38a', '#9cc4e6']), roughness: 0.4, side: THREE.DoubleSide });
      const frock = new THREE.Group(); frock.scale.z = 0.28; h.add(frock);
      put(frock, new THREE.LatheGeometry([[0.2, 0.7], [0.19, 0.9], [0.12, yT - 0.42], [0.155, yT - 0.24], [0.16, yT - 0.12]].map(([r, y]) => new THREE.Vector2(r, y)), 24), colour);
      for (const side of [-1, 1]) put(h, new THREE.CylinderGeometry(0.008, 0.008, 0.11, 5), colour, [side * 0.1, yT - 0.07, 0]).rotation.z = side * 0.4;
      const sashBow = put(h, new THREE.SphereGeometry(1, 10, 8), colour, [0.06, yT - 0.42, 0.04]); sashBow.scale.set(0.06, 0.03, 0.015);
      hanger(h, yT + 0.05, s.material('#9a6a3c'), 0.17);
      h.parent!.rotation.y = 0.15;
    }

    // ---- the shoe box
    const box = new THREE.Group(); box.position.set(dressX + (a.era === 'eighties' ? -0.3 : 0.05), 0, 0.34 + random() * 0.05); box.rotation.y = 0.3 + (random() - 0.5) * 0.5; s.root.add(box);
    const BXW = 0.33, BXD = 0.2, BXH = 0.11, t = 0.004;
    const cardboard = s.material(pick(['#e9e4d6', '#d8c9c0', '#b9c7d6', '#efe9da']), { roughness: 0.8 });
    put(box, new THREE.BoxGeometry(BXW, t, BXD), cardboard, [0, t / 2, 0]);
    for (const z of [-1, 1]) put(box, new THREE.BoxGeometry(BXW, BXH, t), cardboard, [0, BXH / 2, z * (BXD - t) / 2]);
    for (const x of [-1, 1]) put(box, new THREE.BoxGeometry(t, BXH, BXD), cardboard, [x * (BXW - t) / 2, BXH / 2, 0]);
    const lid = new THREE.Group(); lid.position.set(0.02, 0.012, -BXD / 2 - 0.035); lid.rotation.x = -1.15; box.add(lid);
    put(lid, new THREE.BoxGeometry(BXW + 0.012, t, BXD + 0.012), cardboard, [0, 0, -BXD / 2]);
    put(lid, new THREE.BoxGeometry(BXW + 0.012, 0.03, t), cardboard, [0, -0.015, -BXD - 0.004]);
    const tissuePaper = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 1 });
    put(box, new THREE.BoxGeometry(BXW - 0.02, 0.045, BXD - 0.02), tissuePaper, [0, 0.03, 0]);
    for (let i = 0; i < 5; i++) { const wad = put(box, new THREE.SphereGeometry(1, 8, 6), tissuePaper, [(random() - 0.5) * (BXW - 0.06), 0.06, (random() - 0.5) * (BXD - 0.05)]); wad.scale.set(0.05 + random() * 0.03, 0.022, 0.04 + random() * 0.02); wad.rotation.y = random() * 3; }
    const shoeMaterial = new THREE.MeshStandardMaterial({ color: dressHex.clone().lerp(new THREE.Color(a.state === 'stained' ? '#7a705f' : '#ffffff'), 0.3), roughness: 0.3 });
    const shoe = (parent: THREE.Object3D, at: P3, turn: number, onSide = false) => {
      const sh = new THREE.Group(); sh.position.set(...at); sh.rotation.y = turn; if (onSide) sh.rotation.z = Math.PI / 2 - 0.1; parent.add(sh);
      const toe = put(sh, new THREE.SphereGeometry(1, 12, 8), shoeMaterial, [0, 0.018, 0.07]); toe.scale.set(0.036, 0.02, 0.055);
      const arch = put(sh, new THREE.BoxGeometry(0.05, 0.008, 0.12), shoeMaterial, [0, 0.045, -0.02]); arch.rotation.x = -0.48;
      const cup = put(sh, new THREE.CylinderGeometry(0.03, 0.026, 0.045, 12, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: shoeMaterial.color, roughness: 0.3, side: THREE.DoubleSide }), [0, 0.092, -0.075]);
      cup.rotation.y = Math.PI / 2;
      put(sh, new THREE.CylinderGeometry(0.013, 0.005, 0.075, 8), shoeMaterial, [0, 0.038, -0.088]).rotation.x = 0.08;
      if (a.era === 'twenties') put(sh, new THREE.BoxGeometry(0.066, 0.008, 0.008), shoeMaterial, [0, 0.06, 0.0]);
      if (a.era === 'eighties') { const bowTie = put(sh, new THREE.SphereGeometry(1, 8, 6), shoeMaterial, [0, 0.036, 0.085]); bowTie.scale.set(0.03, 0.01, 0.012); }
    };
    if (a.shoes === 'heels') { shoe(box, [-0.05, 0.062, 0], Math.PI / 2 + 0.1); shoe(box, [0.045, 0.062, 0.01], Math.PI / 2 - 0.05); }
    else if (a.shoes === 'kicked') { shoe(box, [-0.03, 0.062, 0], Math.PI / 2 + 0.2); shoe(s.root, [box.position.x + 0.3, 0.03, box.position.z + 0.12], random() * 6, true); }
    else if (a.shoes === 'veil') {
      const tulle = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const fold = put(box, new THREE.BoxGeometry(BXW * 0.55 - i * 0.02, 0.012, BXD * 0.8 - i * 0.015), tulle, [-BXW * 0.18, 0.066 + i * 0.013, 0]); fold.rotation.y = (random() - 0.5) * 0.12; }
      const dried = ['#b98a7a', '#9a6a5a', '#c9a98a', '#8a7a5a'];
      for (let i = 0; i < 7; i++) put(box, new THREE.SphereGeometry(0.022 + random() * 0.01, 8, 6), s.material(pick(dried), { roughness: 1 }), [BXW * 0.24 + (random() - 0.5) * 0.07, 0.09 + random() * 0.03, 0.03 + (random() - 0.5) * 0.07]);
      const stems = put(box, new THREE.CylinderGeometry(0.012, 0.016, 0.13, 6), s.material('#6a6a3a', { roughness: 1 }), [BXW * 0.24, 0.085, -0.05]); stems.rotation.x = Math.PI / 2 - 0.2;
      put(box, new THREE.TorusGeometry(0.016, 0.006, 5, 12), s.material(mood.cheer > 0.5 ? '#a9c6e6' : '#e9e2cf'), [BXW * 0.24, 0.088, -0.04]);
    }

    // ---- motion
    const swing = mix(0.003, 0.045, mood.energy), rate = mix(0.8, 2.2, mood.energy);
    const pose = (time: number) => { for (const item of swingers) { item.group.rotation.z = swing * item.amount * Math.sin(item.phase + time * rate * (0.8 + item.amount * 0.15)); item.group.rotation.x = swing * 0.3 * item.amount * Math.sin(item.phase * 2 + time * rate * 0.7); } };
    pose(0);
    return s.finish({ footprint: 0.6, update: (_dt, time) => pose(time) });
  },
});

/** Front radius of a lathe profile at a given height, for laying beads down the bodice. */
function radiusFront(profile: readonly (readonly [number, number])[], y: number) {
  for (let i = 1; i < profile.length; i++) { const [r0, y0] = profile[i - 1], [r1, y1] = profile[i]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
  return y < profile[0][1] ? profile[0][0] : profile[profile.length - 1][0];
}
