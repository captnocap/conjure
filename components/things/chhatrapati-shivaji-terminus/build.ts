import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul } from '@conjure/kit';
import { Batch, archBand, canvasTexture, dome, heightUV, planarUV, pointedArch, stoneTexture, wallWithHoles, washTexture, night as nightOf } from './parts';

type V3 = [number, number, number];

const TIMES = { nine: [9, 2], noon: [12, 0], six: [6, 10], ten: [10, 10], late: [11, 58] } as const;

export default defineThing({
  questions: {
    lighting: choice('How is the facade lit?', {
      golden: 'Golden heritage floodlighting picking out every turret, arch and rib of the dome.',
      tricolour: 'A tricolour projection: saffron above, white in the middle, green below.',
      dark: 'No floodlights: a dark Gothic mass with only a few windows lit.',
    }),
    state: choice('What state is the stone in?', {
      cleaned: 'Freshly cleaned: buff sandstone and blue-grey basalt bands crisp and bright.',
      sooted: 'Sooted by a century of steam and traffic: blackened streaks under every ledge.',
      scaffold: 'One wing wrapped in bamboo scaffolding and green netting for repairs.',
    }),
    time: choice('What moment is it?', {
      rush: 'Rush hour: crowds pouring out across the forecourt toward the street.',
      midnight: 'An empty midnight: the forecourt bare, one or two late figures.',
      rain: 'Monsoon rain: the forecourt shining wet, umbrellas hurrying.',
      calm: 'An ordinary hour: a scatter of travellers, porters and taxis.',
    }),
    bus: noul('Does a red BEST double-decker bus pass in front?'),
    clock: choice('What time does the gable clock show?', {
      nine: 'A little after nine: the morning peak.',
      noon: 'Noon, both hands up.',
      six: 'Ten past six: the evening crush.',
      ten: 'Ten past ten, the hands spread wide.',
      late: 'Two minutes to midnight, the last locals.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const wet = a.time === 'rain';
    const soot = a.state === 'cleaned' ? 0.05 + mood.wear * 0.15 : a.state === 'sooted' ? 0.7 + mood.wear * 0.3 : 0.25 + mood.wear * 0.4;
    const darken = (a.state === 'sooted' ? 0.8 : a.state === 'cleaned' ? 1.04 : 0.95) * (wet ? 0.8 : 1);
    const tone = (hex: string) => new THREE.Color(hex).multiplyScalar(darken);
    const glow = a.lighting === 'dark' ? 0 : mix(0.03, 0.8, night);

    // The walls: buff sandstone with pointed windows, painted over the full height so the flood wash can band it.
    const SPAN_U = 24, SPAN_V = 54, rows = 12, cols = 6;
    const W = 512, H = 1024, cw = W / cols, rh = H / rows;
    const windowPath = (c: CanvasRenderingContext2D, x: number, y: number) => {
      c.beginPath(); c.moveTo(x + cw * 0.32, y + rh * 0.86); c.lineTo(x + cw * 0.32, y + rh * 0.42);
      c.quadraticCurveTo(x + cw * 0.34, y + rh * 0.2, x + cw * 0.5, y + rh * 0.14);
      c.quadraticCurveTo(x + cw * 0.66, y + rh * 0.2, x + cw * 0.68, y + rh * 0.42); c.lineTo(x + cw * 0.68, y + rh * 0.86); c.closePath();
    };
    const wallMap = canvasTexture(W, H, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
        const x = k * cw, y = r * rh;
        c.fillStyle = 'rgba(120,110,95,0.18)'; c.fillRect(x, y, cw, 3);
        c.fillStyle = '#3a3836'; windowPath(c, x, y); c.fill();
        c.strokeStyle = '#d9d2c4'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + cw * 0.5, y + rh * 0.16); c.lineTo(x + cw * 0.5, y + rh * 0.86); c.stroke();
        c.strokeStyle = 'rgba(80,90,105,0.8)'; c.lineWidth = 4; windowPath(c, x, y); c.stroke();
      }
      for (let i = 0; i < Math.round(soot * 140); i++) {
        const x = random() * W, y = random() * H, len = 40 + random() * 160;
        const g = c.createLinearGradient(0, y, 0, y + len); g.addColorStop(0, `rgba(20,20,20,${0.3 + soot * 0.35})`); g.addColorStop(1, 'rgba(20,20,20,0)');
        c.fillStyle = g; c.fillRect(x, y, 3 + random() * 10, len);
      }
    });
    const bandOf = (v: number) => (v > 2 / 3 ? '#ff8a1e' : v > 1 / 3 ? '#f4f4f0' : '#1fa83a');
    const floodTop = 26;
    const wallGlow = canvasTexture(W, H, (c) => {
      c.fillStyle = '#000000'; c.fillRect(0, 0, W, H);
      if (a.lighting !== 'dark') for (let y = 0; y < H; y += 4) {
        const metres = (1 - y / H) * SPAN_V; // canvas top is the top of the wall
        const v = Math.min(1, metres / floodTop);
        const col = a.lighting === 'tricolour' ? new THREE.Color(bandOf(v)) : new THREE.Color('#ffb24d').multiplyScalar(mix(1, 0.45, v));
        col.multiplyScalar(0.55);
        c.fillStyle = `#${col.getHexString()}`; c.fillRect(0, y, W, 4);
      }
      const share = a.lighting === 'dark' ? 0.12 : 0.3 + mood.density * 0.35;
      for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (random() < share) { c.fillStyle = random() < 0.7 ? '#ffd08a' : '#fff2d8'; windowPath(c, k * cw, r * rh); c.fill(); }
    });
    const core = s.material(tone('#d8b98a'), { map: wallMap, emissive: '#ffffff', emissiveMap: wallGlow, emissiveIntensity: a.lighting === 'dark' ? mix(0.1, 0.9, night) : glow * 1.2, roughness: wet ? 0.4 : 0.85 });
    const washKind = a.lighting === 'tricolour' ? 'tricolour' : 'flood';
    const wash = washTexture(washKind, '#ffb24d'); wash.channel = 1;
    const trimMap = stoneTexture(random, soot * 0.8, 4, 2);
    const sandstone = s.material(tone('#e2c79a'), { map: trimMap, emissive: '#ffffff', emissiveMap: wash, emissiveIntensity: glow * 0.7, roughness: wet ? 0.4 : 0.8 });
    const basalt = s.material(tone('#5f6872'), { emissive: '#ffffff', emissiveMap: wash, emissiveIntensity: glow * 0.4, roughness: wet ? 0.35 : 0.85 });
    const domeMap = stoneTexture(random, soot, 10, 6, 'rgba(60,60,60,0.4)');
    const domeMat = s.material(tone('#b9a98c'), { map: domeMap, emissive: '#ffffff', emissiveMap: wash, emissiveIntensity: glow * 0.75, roughness: wet ? 0.35 : 0.8 });
    const roof = s.material(tone('#7a5f55'), { roughness: wet ? 0.3 : 0.8 });
    const paving = s.material(wet ? '#6f6c66' : '#aaa497', { roughness: wet ? 0.12 : 0.9, metalness: wet ? 0.3 : 0 });
    const asphalt = s.material(wet ? '#2e3032' : '#4b4c4e', { roughness: wet ? 0.15 : 0.9, metalness: wet ? 0.3 : 0 });
    const lawn = s.material('#5f7f45', { roughness: 0.95 });

    const b = new Batch();
    const pinnacles: V3[] = [];
    // A block of the station: core with windows, basalt bands wrapping it each floor, cornice, parapet and steep roof.
    const block = (x0: number, x1: number, z0: number, z1: number, h: number, roofH = 6, alongX = true) => {
      const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      b.box(core, [w, h, d], [cx, h / 2, cz]);
      b.box(basalt, [w + 0.4, 4.2, d + 0.4], [cx, 2.1, cz]);
      for (let y = 4.5; y < h - 1; y += 4.5) { b.box(basalt, [w + 0.3, 0.45, d + 0.3], [cx, y, cz]); b.box(sandstone, [w + 0.2, 0.3, d + 0.2], [cx, y + 0.9, cz]); }
      b.box(sandstone, [w + 0.8, 0.8, d + 0.8], [cx, h, cz]);
      b.box(basalt, [w + 0.5, 0.5, d + 0.5], [cx, h + 0.65, cz]);
      const L = alongX ? w : d, span = alongX ? d : w;
      const shape = new THREE.Shape([new THREE.Vector2(-span / 2 + 0.4, 0), new THREE.Vector2(span / 2 - 0.4, 0), new THREE.Vector2(0, roofH)]);
      const prism = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false });
      if (alongX) b.add(roof, prism, [x0, h + 0.9, cz], [0, Math.PI / 2, 0]); else b.add(roof, prism, [cx, h + 0.9, z0]);
      // Pinnacles along the long edges.
      for (let t = 2; t < L - 1; t += 5) for (const side of [-1, 1]) pinnacles.push(alongX ? [x0 + t, h + 0.9, cz + side * (d / 2 + 0.2)] : [cx + side * (w / 2 + 0.2), h + 0.9, z0 + t]);
    };
    const gable = (x: number, y: number, z: number, w: number, h: number, rot = 0) => {
      const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
      b.add(core, new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false }), [x, y, z - 0.6], [0, rot, 0]);
      const dx = Math.cos(rot) * w / 2, dz = -Math.sin(rot) * w / 2;
      b.rod(sandstone, [x - dx, y, z - dz], [x, y + h + 0.4, z], 0.35, 5);
      b.rod(sandstone, [x + dx, y, z + dz], [x, y + h + 0.4, z], 0.35, 5);
      for (let k = 1; k < 4; k++) b.rod(basalt, [x - dx * (1 - k * 0.2), y + h * k * 0.2, z - dz * (1 - k * 0.2) + 0.3 * Math.cos(rot)], [x + dx * (1 - k * 0.2), y + h * k * 0.2, z + dz * (1 - k * 0.2) + 0.3 * Math.cos(rot)], 0.22, 4);
      b.cyl(sandstone, 0.05, 0.5, 3, [x, y + h + 1.6, z], 6);
    };
    const turret = (x: number, z: number, top: number, r: number, spire: number) => {
      b.cyl(core, r, r * 1.05, top, [x, top / 2, z], 8, Math.PI / 8);
      b.cyl(basalt, r * 1.12, r * 1.12, 4.2, [x, 2.1, z], 8, Math.PI / 8);
      for (let y = 4.5; y < top; y += 4.5) b.cyl(basalt, r * 1.1, r * 1.1, 0.45, [x, y, z], 8, Math.PI / 8);
      b.cyl(sandstone, r * 1.25, r * 1.25, 0.8, [x, top, z], 8, Math.PI / 8);
      for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; b.cyl(sandstone, 0.02, 0.22, 1.6, [x + Math.cos(an) * r * 1.15, top + 1.2, z + Math.sin(an) * r * 1.15], 5); }
      b.cyl(domeMat, 0.05, r * 0.95, spire, [x, top + 0.4 + spire / 2, z], 8, Math.PI / 8);
      b.rod(basalt, [x, top + spire, z], [x, top + spire + 2, z], 0.08, 4);
    };

    // The U: the central block, side ranges, forward wings and their end pavilions.
    block(-22, 22, -15, 7, 24, 8);
    for (const sx of [-1, 1]) {
      const lo = (a: number, c: number) => (sx > 0 ? [a, c] : [-c, -a]) as [number, number];
      const [r0, r1] = lo(22, 70); block(r0, r1, -14, 0, 20, 6);
      const [w0, w1] = lo(48, 66); block(w0, w1, 0, 36, 20, 6, false);
      const [p0, p1] = lo(46, 68); block(p0, p1, 36, 44, 23, 7);
      gable(sx * 57, 23.9, 44.2, 16, 8);
      for (const px of [46, 68]) turret(sx * px, 44, 28, 1.9, 7);
      for (const pz of [-14, 0]) turret(sx * 70, pz, 23, 1.6, 5);
      turret(sx * 48, 0, 24, 1.6, 6);
    }
    for (const x of [-22, 22]) turret(x, 7, 32, 2.3, 9);
    // The great gable with its rose window and the clock.
    gable(0, 24.9, 7.4, 30, 13);
    const rose = b.add(basalt, new THREE.CylinderGeometry(3.4, 3.4, 0.3, 24), [0, 29.2, 8.1], [Math.PI / 2, 0, 0]);
    void rose;
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; b.rod(sandstone, [0, 29.2, 8.3], [Math.cos(an) * 3.3, 29.2 + Math.sin(an) * 3.3, 8.3], 0.14, 4); }
    b.add(sandstone, new THREE.TorusGeometry(3.4, 0.3, 6, 32), [0, 29.2, 8.25]);
    const [hour, minute] = TIMES[a.clock];
    const dialMap = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#f2ead6'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
      c.strokeStyle = '#1d1d1f'; c.fillStyle = '#1d1d1f'; c.lineWidth = 6; c.beginPath(); c.arc(128, 128, 118, 0, 7); c.stroke();
      for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; c.fillRect(128 + Math.sin(an) * 100 - 4, 128 - Math.cos(an) * 100 - 9, 8, 18); }
      const hand = (angle: number, len: number, w: number) => { c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(128, 128); c.lineTo(128 + Math.sin(angle) * len, 128 - Math.cos(angle) * len); c.stroke(); };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 62, 10); hand(minute / 60 * Math.PI * 2, 92, 6);
    }, false);
    const dial = s.mesh(new THREE.CircleGeometry(2.2, 32), new THREE.MeshStandardMaterial({ map: dialMap, roughness: 0.5, emissive: '#fff1d0', emissiveMap: dialMap, emissiveIntensity: mix(0.05, 0.9, night) }), [0, 34.3, 8.2]);
    dial.castShadow = false;
    b.add(basalt, new THREE.TorusGeometry(2.3, 0.22, 6, 32), [0, 34.3, 8.2]);
    // The entrance porch: a deep pointed arch with a striped archivolt.
    const porch = pointedArch(0, 0.01, 8, 5, 0.8, 10);
    b.add(core, wallWithHoles(14, 12.5, 2.4, [porch]), [0, 0, 7]);
    b.add(basalt, archBand(porch, 0.7, 0.3), [0, 0, 9.4]);
    b.add(sandstone, archBand(pointedArch(0, 0.01, 9.4, 5, 0.8, 10), 0.5, 0.3), [0, 0, 9.4]);
    b.box(sandstone, [14.6, 0.8, 2.8], [0, 12.5, 8.2]);
    b.box(s.material('#2c2a28'), [8, 12, 0.3], [0, 6, 7.1]);
    // Ranges of pointed windows across the front of the central block, deep and shadowed.
    for (const [x0, x1] of [[-21.5, -7.5], [7.5, 21.5]] as const) {
      const holes: THREE.Vector2[][] = [];
      for (let y = 5.2; y < 20; y += 4.5) for (let k = 0; k < 4; k++) holes.push(pointedArch(-5.25 + k * 3.5, y, 1.8, 2, 0.85, 6));
      b.add(sandstone, wallWithHoles(14, 24, 0.5, holes), [(x0 + x1) / 2, 0, 7.05]);
      for (const hole of holes) b.add(basalt, archBand(hole, 0.22, 0.12), [(x0 + x1) / 2, 0, 7.55]);
    }
    // Drum and the great ribbed dome, with Progress on its tip.
    const dz = -6, drum0 = 25, drum1 = 33;
    b.cyl(core, 9.8, 10.2, drum1 - drum0, [0, (drum0 + drum1) / 2, dz], 8, Math.PI / 8);
    for (const y of [drum0 + 0.5, drum1]) b.cyl(basalt, 10.5, 10.5, 0.6, [0, y, dz], 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2; b.cyl(sandstone, 0.5, 0.6, 7, [Math.cos(an) * 10.5, drum0 + 4, dz + Math.sin(an) * 10.5], 6); b.cyl(domeMat, 0.02, 0.7, 2.6, [Math.cos(an) * 10.5, drum0 + 8.8, dz + Math.sin(an) * 10.5], 6); }
    const profile: [number, number][] = [];
    const domeR = 10, domeH = 14.5;
    for (let i = 0; i <= 16; i++) { const t = i / 16; profile.push([Math.max(0.0001, domeR * Math.pow(Math.max(0, 1 - t ** 1.5), 0.62)), t * domeH]); }
    b.add(domeMat, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), [0, drum1 + 0.3, dz]);
    for (let i = 0; i < 8; i++) {
      const an = i / 8 * Math.PI * 2 + Math.PI / 8;
      const pts = profile.slice(0, -1).map(([r, y]) => new THREE.Vector3(Math.cos(an) * (r + 0.15), drum1 + 0.3 + y, dz + Math.sin(an) * (r + 0.15)));
      b.add(sandstone, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.3, 5));
    }
    const lantern = drum1 + 0.3 + domeH;
    b.cyl(sandstone, 1.2, 1.5, 2.6, [0, lantern + 0.8, dz], 8);
    b.add(domeMat, dome(1.4, 1.2, 12), [0, lantern + 2.1, dz]);
    b.cyl(basalt, 0.6, 0.8, 0.6, [0, lantern + 3.4, dz], 8);
    const statueBase = lantern + 3.7;
    // Pinnacles along every roof edge.
    for (const [x, y, z] of pinnacles) b.cyl(sandstone, 0.02, 0.28, 1.8, [x, y + 0.9, z], 5);

    // The forecourt, lawns, gate pillars with their lion and tiger, and the road.
    b.box(paving, [150, 0.4, 48], [0, -0.2, 22]);
    for (const sx of [-1, 1]) b.box(lawn, [18, 0.1, 18], [sx * 30, 0.05, 25]);
    b.box(asphalt, [170, 0.4, 14], [0, -0.2, 53]);
    const lion = s.material(tone('#c9a25a'), { roughness: 0.6 }), tiger = s.material(tone('#c9772e'), { roughness: 0.6 });
    for (const [sx, mat] of [[-1, lion], [1, tiger]] as const) {
      const x = sx * 13, z = 45;
      b.box(basalt, [3, 6, 3], [x, 3, z]);
      b.box(sandstone, [3.6, 0.6, 3.6], [x, 6.3, z]);
      b.add(mat, new THREE.SphereGeometry(1, 12, 8), [x, 7.4, z - 0.2], [0, 0, 0], [0.7, 0.75, 1.4]);
      b.add(mat, new THREE.SphereGeometry(1, 12, 8), [x, 8.2, z + 1], [0, 0, 0], sx < 0 ? [0.75, 0.75, 0.6] : [0.5, 0.5, 0.55]);
      for (const lx of [-0.4, 0.4]) b.box(mat, [0.3, 1.1, 0.35], [x + lx, 7.1, z + 0.8]);
    }
    // Scaffolding over the left forward wing.
    if (a.state === 'scaffold') {
      const bamboo = s.material('#c4a066', { roughness: 0.7 });
      const fx = -46.6;
      for (let z = 2; z <= 35; z += 2) b.rod(bamboo, [fx, 0, z], [fx, 21, z], 0.08, 4);
      for (let y = 2; y < 21; y += 2) b.rod(bamboo, [fx, y, 1], [fx, y, 35], 0.07, 4);
      const net = s.mesh(new THREE.PlaneGeometry(22, 20), new THREE.MeshStandardMaterial({ color: '#3f8a52', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), [fx + 0.3, 10.5, 17]);
      net.rotation.y = Math.PI / 2; net.castShadow = false;
    }
    b.flush(s, {
      uv: new Map<THREE.Material, (g: THREE.BufferGeometry) => void>([
        [core, (g) => {
          const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
          for (let i = 0; i < p.count; i++) { const along = Math.abs(n.getX(i)) > Math.abs(n.getZ(i)) ? p.getZ(i) : p.getX(i); uv[i * 2] = along / SPAN_U; uv[i * 2 + 1] = p.getY(i) / SPAN_V; }
          g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        }],
        [sandstone, (g) => { planarUV(g, 2.5); heightUV(g, floodTop); }],
        [basalt, (g) => heightUV(g, floodTop)],
        [domeMat, (g) => { planarUV(g, 4); heightUV(g, floodTop); }],
        [paving, (g) => planarUV(g, 6)],
      ]),
    });

    // Progress: a single-material figure raising her torch.
    const progress = figure(s, { height: 4.6, pose: 'reaching', style: 'silhouette', build: 'slight', hair: 'long' });
    s.root.add(progress.root);
    progress.root.position.set(0, statueBase, dz);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 8), new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff9a2a', emissiveIntensity: mix(0.4, 2.2, night) }));
    flame.position.set(0, -0.35, 0); flame.rotation.x = Math.PI;
    progress.hands.left.add(flame);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.4, 8), new THREE.MeshStandardMaterial({ color: '#3a342c' }));
    cup.position.set(0, -0.1, 0); progress.hands.left.add(cup);

    // People: a few figures near the porch, the rest of the crowd as simple instanced travellers.
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const people: ReturnType<typeof figure>[] = [];
    const crowdN = { rush: Math.round(160 + mood.density * 260), midnight: 2, rain: Math.round(40 + mood.density * 60), calm: Math.round(30 + mood.density * 60) }[a.time];
    const body = new THREE.CapsuleGeometry(0.24, 1.05, 3, 6).translate(0, 0.77, 0);
    const head = new THREE.SphereGeometry(0.15, 6, 4).translate(0, 1.6, 0);
    const traveller = mergeGeometries([body.toNonIndexed(), head.toNonIndexed()]);
    body.dispose(); head.dispose();
    const crowd: { at: V3; size: number; color: string }[] = [];
    const colours = ['#e8e2d4', '#c8324a', '#2f6fb3', '#e0a020', '#3b8a5a', '#f2f0ea', '#d65a8a', '#3a3a3a', '#7b2fa8'];
    for (let i = 0; i < crowdN; i++) {
      const t = Math.pow(random(), a.time === 'rush' ? 0.7 : 1);
      const x = (random() - 0.5) * mix(10, 60, t), z = mix(10, 50, t) + (random() - 0.5) * 3;
      if (Math.abs(x) > 26 && z < 34) continue;
      crowd.push({ at: [x, 0, z], size: 0.9 + random() * 0.2, color: pick(colours) });
    }
    if (crowd.length) s.scatter(traveller, s.material('#ffffff', { roughness: 0.8 }), crowd);
    const umbrellas: { at: V3; size: number; color: string }[] = [];
    if (wet) for (const p of crowd) if (random() < 0.8) umbrellas.push({ at: [p.at[0], 1.95, p.at[2]], size: 0.55, color: pick(['#1c1c1e', '#1f3f8a', '#c8324a', '#2a6a4a']) });
    if (umbrellas.length) s.scatter(new THREE.ConeGeometry(1, 0.35, 8), s.material('#ffffff'), umbrellas).castShadow = false;
    const figures = a.time === 'midnight' ? 1 : 4;
    for (let i = 0; i < figures; i++) {
      const p = figure(s, { height: 1.7, pose: pick(['walking', 'standing', 'carrying'] as const), style: 'doll', hair: pick(['short', 'cap', 'long'] as const), top: pick(colours), bottom: pick(['#2a2f3a', '#e8e2d4']), skin: pick(['#8a5a3c', '#a8714c', '#c08a62']), mirror: random() < 0.5 });
      s.root.add(p.root); p.root.position.set(-6 + random() * 12, 0, 13 + random() * 8); p.root.rotation.y = random() * 6.28; people.push(p);
    }
    // Rain.
    if (wet) {
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 1400; i++) drops.push({ at: [(random() - 0.5) * 160, random() * 55, -10 + random() * 70], size: 1 });
      s.scatter(new THREE.BoxGeometry(0.2, 6, 0.2).rotateZ(0.1), new THREE.MeshBasicMaterial({ color: '#e6edf3', transparent: true, opacity: 0.45, depthWrite: false }), drops).castShadow = false;
    }
    // The red double-decker.
    let bus: THREE.Group | null = null;
    if (a.bus) {
      bus = new THREE.Group();
      const red = s.material('#c8202a', { roughness: 0.5 }), glass = s.material('#2a3440', { roughness: 0.2, metalness: 0.3, emissive: '#ffe2a8', emissiveIntensity: night * 0.8 }), cream = s.material('#efe3c4');
      const add = (geo: THREE.BufferGeometry, m: THREE.Material, at: V3) => { const mesh = new THREE.Mesh(geo, m); mesh.position.set(...at); mesh.castShadow = true; bus!.add(mesh); };
      add(new THREE.BoxGeometry(11, 4.1, 2.5), red, [0, 2.45, 0]);
      for (const y of [1.9, 3.6]) add(new THREE.BoxGeometry(10.2, 0.9, 2.55), glass, [0.2, y, 0]);
      add(new THREE.BoxGeometry(11.05, 0.25, 2.55), cream, [0, 2.75, 0]);
      for (const x of [-3.6, 3.6]) for (const z of [-1.2, 1.2]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12), s.material('#1a1a1a')); wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.5, z); bus.add(wheel); }
      bus.position.set(-8 + random() * 16, 0, 51);
      s.root.add(bus);
    }

    s.root.rotation.y = -0.52;
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt, time);
        flame.scale.setScalar(1 + Math.sin(time * mix(2, 9, mood.energy)) * 0.12);
      },
    });
  },
});
