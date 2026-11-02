import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, figure, mix, noul, paintHex } from '@conjure/kit';

const canvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat = true) => {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
};

/** A box whose UVs are planar in metres, so one window texture runs continuously across every block. */
const planarBox = (w: number, h: number, d: number, x: number, y: number, z: number, tileW: number, tileH: number) => {
  const g = new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let u: number, v: number;
    if (Math.abs(nx) > 0.5) { u = p.getZ(i) * -Math.sign(nx); v = p.getY(i); }
    else if (Math.abs(nz) > 0.5) { u = p.getX(i) * Math.sign(nz); v = p.getY(i); }
    else { u = p.getX(i); v = p.getZ(i); }
    uv.setXY(i, u / tileW, v / tileH);
  }
  return g;
};

const FLOODS = {
  white: 'Plain white floodlights: the classic crown, pale and dignified.',
  tricolour: 'Red, white and blue in three stacked tiers: a national holiday.',
  orange: 'Orange: autumn, Halloween, a hot summer night.',
  green: 'Green: Saint Patrick\'s Day, spring, something hopeful.',
  pink: 'Pink: a soft candy glow, a cause or a celebration.',
  gold: 'Gold: a gala, an anniversary, a gilded crown over the city.',
  off: 'Dark: the floodlights off, the crown only a silhouette.',
} as const;

export default defineThing({
  questions: {
    era: choice('When do we see it?', {
      opening: '1931, brand new: bright clean limestone, the dirigible mooring mast bare at the top, no antenna yet.',
      midcentury: 'The 1950s: a slim television antenna on the mast, the limestone greyed by coal smoke.',
      today: 'Today: the tall broadcast antenna with its platforms, LED floodlights on the crown.',
      scaffold: 'Under restoration: the upper tiers and mast wrapped in scaffolding and netting.',
    }),
    crown: choice('What colour are the crown floodlights?', FLOODS),
    visitor: choice('What is up at the mast?', {
      none: 'Nothing: only the mast and the sky.',
      biplane: 'A 1930s biplane circling the mast, close enough to read its wings.',
      ape: 'A giant dark ape-like silhouette clinging to the mast, as tall as several floors.',
      blimp: 'A silver blimp drifting past the upper tiers.',
    }),
    weather: choice('What weather is on it?', {
      clear: 'Clear air: the whole tower crisp from foot to needle.',
      cloud: 'A bank of low cloud cutting across the middle of the shaft, the crown floating above it.',
      snow: 'Snow lying white on every setback and terrace.',
      lightning: 'A thunderstorm: a bolt of lightning striking the antenna.',
      fog: 'Fog swallowing the base, the tower rising out of a white sea.',
    }),
    pattern: choice('Do the lit office windows make a picture?', {
      random: 'No: offices lit at random, the usual scatter of late workers.',
      heart: 'A big heart spelled in lit windows on the shaft, someone\'s proposal.',
      cross: 'A tall cross of lit windows, the old Christmas tradition.',
    }),
    beacon: noul('Are the red aviation beacons blinking on the mast?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const night = Math.min(1, Math.max(0, (lowSun - 0.3) / 0.7));
    const soot = Math.min(1, mood.wear + (a.era === 'midcentury' ? 0.3 : 0) - (a.era === 'opening' ? 0.25 : 0));
    const TW = 32, TH = 30; // one texture tile: 16 bays of 2 m, 8 floors of 3.75 m

    // Facade: pale stone between dark window columns, the bays divided by continuous mullion lines.
    const facade = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 512);
      for (let col = 0; col < 16; col++) {
        const x = col * 32;
        c.fillStyle = '#c9cdd0'; c.fillRect(x + 10, 0, 12, 512); // the metal strip running between windows
        for (let row = 0; row < 8; row++) {
          const y = row * 64;
          c.fillStyle = '#3f4650'; c.fillRect(x + 11, y + 10, 10, 38);
          c.fillStyle = '#8e959b'; c.fillRect(x + 11, y + 48, 10, 12); // spandrel
        }
      }
      for (let i = 0; i < Math.round(soot * 70); i++) {
        c.fillStyle = `rgba(55,48,40,${0.05 + random() * 0.14})`;
        c.fillRect(random() * 512, random() * 512, 3 + random() * 16, 40 + random() * 200);
      }
    });
    const litShare = 0.18 + mood.density * 0.35;
    const lit = canvasTexture(512, 512, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 8; row++) {
        let on = random() < litShare;
        for (let col = 0; col < 16; col++) {
          if (random() < 0.25) on = random() < litShare;
          if (!on) continue;
          c.fillStyle = random() < 0.75 ? '#ffd9a0' : '#e4efff';
          c.fillRect(col * 32 + 11, row * 64 + 10, 10, 38);
        }
      }
    });
    const stone = new THREE.Color(a.era === 'opening' ? '#e6dccb' : '#d6ccba').lerp(new THREE.Color('#77705f'), soot * 0.35).lerp(new THREE.Color('#4d5260'), night * 0.45);
    const windowGlow = mix(0.03, 2.4, night);
    const body = s.material(stone, { map: facade, emissive: '#ffd49a', emissiveMap: lit, emissiveIntensity: windowGlow, roughness: 0.85 });
    const metal = s.material('#a7afb5', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#2c3034', { metalness: 0.4, roughness: 0.5 });

    // Crown floods: the three top tiers and the mast take their own stone-coloured materials that glow.
    const floodOn = a.crown !== 'off';
    const floodHex = (k: string) => k === 'white' ? '#fff3dc' : paintHex(k);
    const floodGlow = floodOn ? mix(0.18, 2.2, night) : 0;
    const crownMat = (hex: string) => s.material(stone, { map: facade, emissive: hex, emissiveIntensity: floodGlow, roughness: 0.8 });
    const tiers = a.crown === 'tricolour' ? [crownMat('#e0283a'), crownMat('#fff6ea'), crownMat('#2f5fe0')] : [crownMat(floodHex(a.crown))];
    const tierMat = (i: number) => tiers[Math.min(i, tiers.length - 1)];
    const mastStone = a.crown === 'tricolour' ? tiers[2] : tiers[0];

    const parts: THREE.Mesh[] = [];
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = m.receiveShadow = true;
      parts.push(m);
      return m;
    };

    // Massing in true metres: base, setbacks at the 6th and 30th floors, the cross-shaped shaft, terraces 72 to 86.
    type Block = [number, number, number, number, number]; // w, d, y0, y1, material tier (-1 body)
    const blocks: Block[] = [
      [128, 56, 0, 22, -1],
      [100, 52, 22, 80, -1],
      [84, 48, 80, 112, -1],
      [58, 30, 112, 272, -1],
      [44, 42, 112, 272, -1],
      [40, 32, 272, 288, 0],
      [32, 26, 288, 304, 1],
      [24, 20, 304, 320, 2],
    ];
    const bodyGeos: THREE.BufferGeometry[] = [];
    const tierGeos: THREE.BufferGeometry[][] = [[], [], []];
    for (const [w, d, y0, y1, t] of blocks) {
      const g = planarBox(w, y1 - y0, d, 0, (y0 + y1) / 2, 0, TW, TH);
      if (t < 0) bodyGeos.push(g); else tierGeos[Math.min(t, tiers.length - 1)].push(g);
    }
    add(mergeGeometries(bodyGeos), body);
    tierGeos.forEach((list, i) => { if (list.length) add(mergeGeometries(list), tierMat(i)); });
    // Cornice bands at each setback in metal.
    const bands: THREE.BufferGeometry[] = [];
    for (const [w, d, , y1] of blocks) bands.push(new THREE.BoxGeometry(w + 0.8, 1, d + 0.8).translate(0, y1 - 0.5, 0));
    // Entrance canopy on the Fifth Avenue face.
    bands.push(new THREE.BoxGeometry(18, 1.2, 4).translate(0, 7, 29));

    // Mullion strips standing proud of the shaft and the lower blocks.
    const strips: THREE.Matrix4[] = [];
    const strip = (axis: 'x' | 'z', face: number, from: number, to: number, y0: number, y1: number, spacing = 4) => {
      for (let t = from + spacing / 2; t < to; t += spacing) {
        const m = new THREE.Matrix4();
        if (axis === 'z') m.makeScale(0.55, y1 - y0, 0.7).setPosition(t, (y0 + y1) / 2, face);
        else m.makeScale(0.7, y1 - y0, 0.55).setPosition(face, (y0 + y1) / 2, t);
        strips.push(m);
      }
    };
    for (const sgn of [-1, 1]) {
      strip('z', sgn * 21.2, -22, 22, 112, 271); // the broad face of the shaft
      strip('x', sgn * 29.2, -15, 15, 112, 271);
      strip('z', sgn * 15.2, -29, -22, 112, 271); strip('z', sgn * 15.2, 22, 29, 112, 271);
      strip('x', sgn * 22.2, -21, -15, 112, 271); strip('x', sgn * 22.2, 15, 21, 112, 271);
      strip('z', sgn * 24.2, -42, 42, 80, 111, 6); strip('x', sgn * 42.2, -24, 24, 80, 111, 6);
      strip('z', sgn * 26.2, -50, 50, 22, 79, 6); strip('x', sgn * 50.2, -26, 26, 22, 79, 6);
      strip('z', sgn * 16.2, -20, 20, 272, 287, 4); strip('x', sgn * 20.2, -16, 16, 272, 287, 4);
    }
    const stripMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), metal, strips.length);
    strips.forEach((m, i) => stripMesh.setMatrixAt(i, m));
    stripMesh.instanceMatrix.needsUpdate = true;
    stripMesh.castShadow = stripMesh.receiveShadow = true;
    parts.push(stripMesh);

    // The Art Deco mooring mast: an octagonal drum with four buttress fins, an observation ring and a cap.
    const mastGeos: THREE.BufferGeometry[] = [
      new THREE.CylinderGeometry(6.6, 9, 40, 8).rotateY(Math.PI / 8).translate(0, 340, 0),
      new THREE.CylinderGeometry(4.6, 5.8, 13, 8).rotateY(Math.PI / 8).translate(0, 366.5, 0),
    ];
    add(mergeGeometries(mastGeos.map((g) => g.toNonIndexed())), mastStone);
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.lineTo(5.5, 0); fin.lineTo(5.2, 4); fin.quadraticCurveTo(2.5, 20, 0.8, 40); fin.lineTo(0, 40); fin.closePath();
    const finGeos: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.ExtrudeGeometry(fin, { depth: 1.6, bevelEnabled: false }).translate(0, 0, -0.8);
      g.rotateY(-(Math.PI / 4 + k * Math.PI / 2)).translate(Math.cos(Math.PI / 4 + k * Math.PI / 2) * 6.5, 320, Math.sin(Math.PI / 4 + k * Math.PI / 2) * 6.5);
      finGeos.push(g);
    }
    const trim: THREE.BufferGeometry[] = [
      new THREE.CylinderGeometry(6.6, 6.6, 1.2, 16).translate(0, 373.4, 0),
      new THREE.CylinderGeometry(1.9, 4.4, 6, 12).translate(0, 377, 0),
      new THREE.SphereGeometry(1.9, 12, 8).translate(0, 380, 0),
      ...finGeos,
      ...bands,
    ];
    // Antennas by era.
    const tipY = a.era === 'opening' ? 386 : a.era === 'midcentury' ? 448 : 443;
    if (a.era === 'opening') trim.push(new THREE.CylinderGeometry(0.3, 1, 5, 8).translate(0, 383.5, 0));
    else if (a.era === 'midcentury') {
      trim.push(new THREE.CylinderGeometry(0.9, 1.6, 30, 8).translate(0, 396, 0), new THREE.CylinderGeometry(0.25, 0.9, 37, 8).translate(0, 429.5, 0));
      for (const y of [392, 402, 412]) trim.push(new THREE.BoxGeometry(7, 0.5, 0.5).translate(0, y, 0), new THREE.BoxGeometry(0.5, 0.5, 7).translate(0, y + 3, 0));
    } else {
      trim.push(
        new THREE.CylinderGeometry(2.0, 2.5, 14, 10).translate(0, 388, 0),
        new THREE.CylinderGeometry(3.4, 3.4, 1, 12).translate(0, 395.5, 0),
        new THREE.CylinderGeometry(1.0, 1.6, 25, 10).translate(0, 408, 0),
        new THREE.CylinderGeometry(2.2, 2.2, 0.8, 12).translate(0, 420.5, 0),
        new THREE.CylinderGeometry(0.15, 0.6, 23, 8).translate(0, 431.5, 0),
      );
      for (let k = 0; k < 3; k++) trim.push(new THREE.CylinderGeometry(1.2, 1.2, 0.4, 12).rotateX(Math.PI / 2).translate(Math.cos(k * 2.1) * 2.4, 390, Math.sin(k * 2.1) * 2.4));
    }
    add(mergeGeometries(trim.map((g) => (g.index ? g.toNonIndexed() : g))), metal);

    // Windows that make a picture: lit panes on the broad face and one narrow face.
    if (a.pattern !== 'random') {
      const panes: THREE.Matrix4[] = [];
      const heart = (u: number, v: number) => { const x = u * 1.25, y = v * 1.25 + 0.25; return (x * x + y * y - 1) ** 3 - x * x * y * y * y < 0; };
      const cross = (u: number, v: number) => (Math.abs(u) < 0.2 && v > -1 && v < 1) || (Math.abs(v - 0.4) < 0.17 && Math.abs(u) < 0.62);
      const shape = a.pattern === 'heart' ? heart : cross;
      const cols = 15, rows = a.pattern === 'heart' ? 13 : 24, centreY = a.pattern === 'heart' ? 215 : 190;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const u = (i - (cols - 1) / 2) / ((cols - 1) / 2), v = (j - (rows - 1) / 2) / ((rows - 1) / 2);
        if (!shape(u, v)) continue;
        const x = (i - (cols - 1) / 2) * 2, y = centreY + (j - (rows - 1) / 2) * 3.75;
        panes.push(new THREE.Matrix4().makeScale(1.3, 2.6, 0.3).setPosition(x, y, 21.05));
        panes.push(new THREE.Matrix4().makeScale(0.3, 2.6, 1.3).setPosition(29.05, y, x * 0.9));
      }
      const paneMat = new THREE.MeshStandardMaterial({ color: '#fff0c8', emissive: '#ffd27a', emissiveIntensity: mix(0.5, 2.2, night), roughness: 0.4 });
      const paneMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), paneMat, panes.length);
      panes.forEach((m, i) => paneMesh.setMatrixAt(i, m));
      paneMesh.instanceMatrix.needsUpdate = true;
      parts.push(paneMesh);
    }

    // Scaffolding and netting wrapped around the terraces and the mast.
    if (a.era === 'scaffold') {
      const grid = canvasTexture(128, 128, (c) => {
        c.clearRect(0, 0, 128, 128);
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 4; i++) { c.fillRect(i * 32, 0, 9, 128); c.fillRect(0, i * 32, 128, 8); }
        c.strokeStyle = '#ffffff'; c.lineWidth = 6; c.beginPath(); c.moveTo(0, 128); c.lineTo(128, 0); c.stroke();
      });
      grid.generateMipmaps = false; grid.minFilter = THREE.LinearFilter;
      const pipe = s.material('#b8bcbf', { map: grid, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, metalness: 0.5 });
      const net = s.material('#5e7d5a', { transparent: true, opacity: 0.45, side: THREE.DoubleSide });
      const shells: THREE.BufferGeometry[] = [], nets: THREE.BufferGeometry[] = [];
      for (const [w, d, y0, y1] of [[43, 35, 272, 290], [35, 29, 288, 306], [27, 23, 304, 322]] as const) {
        shells.push(planarBox(w, y1 - y0, d, 0, (y0 + y1) / 2, 0, 8, 8));
        if (random() < 0.7) nets.push(planarBox(w + 0.4, (y1 - y0) * 0.6, d + 0.4, 0, y0 + (y1 - y0) * 0.35, 0, 8, 8));
      }
      shells.push(new THREE.CylinderGeometry(9, 11, 54, 8, 1, true).translate(0, 347, 0));
      add(mergeGeometries(shells.map((g) => (g.index ? g.toNonIndexed() : g))), pipe);
      if (nets.length) add(mergeGeometries(nets), net);
    }

    // Snow on every setback.
    if (a.weather === 'snow') {
      const snow = s.material('#f6f8fb', { roughness: 0.95 });
      const caps: THREE.BufferGeometry[] = [];
      for (const [w, d, , y1] of blocks) caps.push(new THREE.BoxGeometry(w - 1, 0.9, d - 1).translate(0, y1 + 0.45, 0));
      caps.push(new THREE.CylinderGeometry(6.4, 6.4, 0.8, 16).translate(0, 374.4, 0));
      add(mergeGeometries(caps), snow);
    }

    const g = new THREE.Group();
    for (const m of parts) g.add(m);

    // Soft effects: cloud, fog and lightning are see-through and are not measured as solid.
    const updates: ((time: number) => void)[] = [];
    if (a.weather === 'cloud' || a.weather === 'fog') {
      const puff = new THREE.MeshStandardMaterial({ color: '#f1f2f2', transparent: true, opacity: a.weather === 'fog' ? 0.82 : 0.7, depthWrite: false, roughness: 1 });
      const pts: { at: [number, number, number]; size: number }[] = [];
      const y = a.weather === 'fog' ? 18 : 205;
      const spread = a.weather === 'fog' ? 95 : 75;
      for (let i = 0; i < 26; i++) {
        const an = random() * Math.PI * 2, r = 20 + random() * spread;
        pts.push({ at: [Math.cos(an) * r, y + (random() - 0.5) * (a.weather === 'fog' ? 30 : 22), Math.sin(an) * r], size: 18 + random() * 22 });
      }
      const cloud = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8).scale(1.4, 0.55, 1), puff, pts.length);
      pts.forEach((p, i) => cloud.setMatrixAt(i, new THREE.Matrix4().makeScale(p.size, p.size, p.size).setPosition(...p.at)));
      cloud.instanceMatrix.needsUpdate = true;
      g.add(cloud);
      updates.push((time) => { cloud.rotation.y = time * 0.01 * (0.3 + mood.energy); });
    }
    if (a.weather === 'lightning') {
      const bolt = new THREE.MeshBasicMaterial({ color: '#8fa8ff', transparent: true, opacity: 0.95, depthWrite: false });
      const pts: THREE.Vector3[] = [new THREE.Vector3(0, tipY, 0)];
      let p = new THREE.Vector3(0, tipY, 0);
      for (let i = 0; i < 9; i++) { p = p.clone().add(new THREE.Vector3(-4 - random() * 9, 9 + random() * 8, (random() - 0.5) * 8)); pts.push(p); }
      const zig = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 60, 1.8, 6), bolt);
      const fork: THREE.Vector3[] = [pts[4]];
      let q = pts[4].clone();
      for (let i = 0; i < 4; i++) { q = q.clone().add(new THREE.Vector3(5 + random() * 6, 6 + random() * 6, (random() - 0.5) * 6)); fork.push(q); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fork), 24, 1.1, 5), bolt));
      const glow = new THREE.Mesh(new THREE.SphereGeometry(7, 12, 8), new THREE.MeshBasicMaterial({ color: '#a9bcff', transparent: true, opacity: 0.5, depthWrite: false }));
      glow.position.set(0, tipY, 0);
      g.add(zig, glow);
      updates.push((time) => { const on = Math.sin(time * (3 + mood.energy * 9)) > -0.3; zig.visible = on; glow.visible = on; });
    }
    if (a.beacon) {
      const red = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
      const beacons: THREE.Mesh[] = [];
      for (const y of [tipY, 381, 360]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(y === tipY ? 1.6 : 1.3, 10, 8), red);
        b.position.set(y === tipY ? 0 : 7, y, y === tipY ? 0 : 0);
        g.add(b); beacons.push(b);
      }
      updates.push((time) => { const on = Math.sin(time * 2.2) > 0; for (const b of beacons) b.visible = on; });
    }

    // Visitors at the mast.
    let visitor: THREE.Object3D | null = null;
    if (a.visitor === 'biplane') {
      const plane = new THREE.Group();
      const skin = s.material('#5b5f3a'), wing = s.material('#c9b77a');
      const piece = (geo: THREE.BufferGeometry, mat: THREE.Material, at: [number, number, number]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...at); m.castShadow = true; plane.add(m); };
      piece(new THREE.CylinderGeometry(0.7, 0.35, 8, 10).rotateZ(Math.PI / 2), skin, [0, 0, 0]);
      piece(new THREE.BoxGeometry(2.2, 0.18, 11), wing, [0.8, 1.2, 0]);
      piece(new THREE.BoxGeometry(2.2, 0.18, 10), wing, [0.6, -0.6, 0]);
      piece(new THREE.BoxGeometry(1.2, 0.12, 3.6), wing, [-3.8, 0.2, 0]);
      piece(new THREE.BoxGeometry(1.0, 1.6, 0.12), skin, [-3.8, 0.9, 0]);
      piece(new THREE.CylinderGeometry(1.4, 1.4, 0.05, 16).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#222', transparent: true, opacity: 0.4, depthWrite: false }), [4.1, 0, 0]);
      for (const z of [-4, 4]) piece(new THREE.BoxGeometry(0.15, 1.8, 0.15), skin, [0.7, 0.3, z]);
      plane.scale.setScalar(1.6);
      const orbit = new THREE.Group();
      plane.position.set(0, 0, 44);
      plane.rotation.z = 0.25;
      plane.rotation.x = -0.35;
      orbit.add(plane);
      orbit.position.y = 352;
      g.add(orbit);
      visitor = orbit;
      updates.push((time) => { orbit.rotation.y = 0.8 + time * 0.12 * (0.4 + mood.energy); });
    } else if (a.visitor === 'blimp') {
      const blimp = new THREE.Group();
      const silver = s.material('#c3c7cc', { metalness: 0.4, roughness: 0.45 });
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14).scale(27, 7.5, 7.5), silver); hull.castShadow = true; blimp.add(hull);
      const car = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 3), dark); car.position.set(3, -8, 0); blimp.add(car);
      for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 6), silver); f.position.set(-23, 0, 0); f.rotation.x = k * Math.PI / 2; f.translateY(0); f.translateZ(4); blimp.add(f); }
      blimp.position.set(18, 300, 46);
      blimp.rotation.y = -0.4;
      g.add(blimp);
      visitor = blimp;
      updates.push((time) => { blimp.position.y = 300 + Math.sin(time * 0.4) * 1.5; });
    } else if (a.visitor === 'ape') {
      const ape = figure(s, { height: 36, build: 'heavy', style: 'silhouette', pose: 'reaching', hair: 'none', face: 'blank' });
      s.root.remove(ape.root);
      const { joints } = ape;
      joints.spine.rotation.x = 0.35;
      joints.shoulders.right.rotation.x = -1.2;
      ape.settle();
      ape.root.position.set(0, 0, 0);
      const holder = new THREE.Group();
      holder.add(ape.root);
      holder.position.set(0, 322, 10);
      g.add(holder);
      holder.updateMatrixWorld(true);
      ape.reach('left', new THREE.Vector3(0, 372, 5), { space: g });
      ape.reach('right', new THREE.Vector3(-5, 352, 7), { space: g });
      visitor = holder;
      updates.push((time) => { holder.rotation.z = Math.sin(time * 0.8) * 0.03 * (0.3 + mood.energy); });
    }
    void visitor;

    g.rotation.y = 35 * Math.PI / 180;
    s.root.add(g);
    return s.finish({ footprint: 62, update: (_dt, time) => { for (const fn of updates) fn(time); } });
  },
});
