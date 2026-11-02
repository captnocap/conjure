import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type P = [number, number, number];

/** Big ashlar courses with rain streaks running down from the cornices. */
function ashlarMap(wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) {
    let x = -random() * 30;
    while (x < 256) { const w = 26 + random() * 26; g.fillStyle = `rgba(110,85,50,${0.03 + random() * 0.1})`; g.fillRect(x + 1, row * 21.3 + 1, w - 2, 19); x += w; }
    g.fillStyle = 'rgba(90,70,45,0.3)'; g.fillRect(0, row * 21.3, 256, 1.5);
  }
  for (let i = 0; i < 6 + wear * 30; i++) {
    const x = random() * 256, len = 40 + random() * 160;
    const grad = g.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, `rgba(60,55,50,${0.15 + wear * 0.35})`); grad.addColorStop(1, 'rgba(60,55,50,0)');
    g.fillStyle = grad; g.fillRect(x, 0, 3 + random() * 8, len);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** Studded plank doors. */
function doorMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(60,35,15,0.25)'; g.fillRect(i * 16, 0, 1.5, 256); }
  g.fillStyle = '#2a2a2a';
  for (let y = 12; y < 256; y += 18) for (let x = 10; x < 128; x += 18) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
  for (const y of [40, 128, 216]) g.fillRect(0, y - 3, 128, 6);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    doors: choice('Are the great doors open?', {
      open: 'Thrown open against the passage walls, the street running through.',
      shut: 'Shut: two tall planked leaves studded with iron bosses.',
    }),
    life: choice('What is happening at the gate?', {
      quiet: 'A quiet hour: a cat, a few passers-by in the shade.',
      market: 'A market under the arch: hanging brass lanterns, carpets draped on the towers, stalls of goods.',
      procession: 'A festival procession passing through, banners and strings of pennants between the minarets.',
      gallows: 'The memory of 1517: a beam and a hangman\'s rope over the arch, a hushed crowd below.',
    }),
    lit: noul('Are the minaret balconies lit with rings of lamps?'),
    lamp: paint('If the minarets are lit, what colour are the lamps?', ['amber', 'white', 'green', 'gold', 'turquoise', 'red', 'cream']),
    carpets: paint('If carpets or banners hang there, what is their main colour?', ['crimson', 'red', 'indigo', 'navy', 'green', 'amber', 'rust', 'purple']),
    caps: choice('What do the minaret tops look like?', {
      bulbs: 'Ribbed bulb caps on open pavilions of slender columns, like incense burners.',
      plain: 'Plain stone bulbs worn smooth, the pavilions closed in.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));
    const wear = mood.wear;

    const map = ashlarMap(wear, random);
    map.repeat.set(0.12, 0.12);
    const stoneTint = new THREE.Color('#d6bf96').lerp(new THREE.Color('#a8957a'), wear * 0.5);
    const stone = new THREE.MeshStandardMaterial({ color: stoneTint, map, roughness: 0.93 });
    const pale = s.material(new THREE.Color('#e4d4b4').lerp(new THREE.Color('#b0a088'), wear * 0.5), { roughness: 0.9 });
    const dark = s.material('#2a2520', { roughness: 0.9 });
    const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a4f2e').lerp(new THREE.Color('#4a3a2c'), wear * 0.5), map: doorMap(), roughness: 0.8 });
    const lampHex = paintHex(a.lamp), clothHex = paintHex(a.carpets);
    const lampMat = new THREE.MeshStandardMaterial({ color: a.lit ? lampHex : '#cfc2a6', emissive: a.lit ? lampHex : '#000000', emissiveIntensity: a.lit ? mix(0.9, 2.2, glow) : 0 });

    // Two D-shaped towers: square at the back, a half-round face to the street.
    const TH = 21, TW = 10.5, TX = 8.6, TD = 9;
    const towerShape = new THREE.Shape();
    towerShape.moveTo(-TW / 2, -TD); towerShape.lineTo(TW / 2, -TD); towerShape.lineTo(TW / 2, 0);
    towerShape.absarc(0, 0, TW / 2, 0, Math.PI, false);
    towerShape.lineTo(-TW / 2, -TD);
    for (const x of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(towerShape, { depth: TH, bevelEnabled: false, curveSegments: 20 });
      geo.rotateX(-Math.PI / 2);
      geo.scale(1, 1, -1);
      const t = s.mesh(geo, stone, [x * TX, 0, 0]);
      t.geometry.computeVertexNormals();
      // Cornice bands and a crenellated parapet.
      for (const y of [TH * 0.42, TH]) {
        const band = new THREE.ExtrudeGeometry(towerShape, { depth: 0.7, bevelEnabled: false, curveSegments: 20 });
        band.rotateX(-Math.PI / 2); band.scale(1.06, 1, -1.06);
        s.mesh(band, pale, [x * TX, y - 0.35, 0]).geometry.computeVertexNormals();
      }
      for (let i = 0; i <= 8; i++) { const t2 = Math.PI - (i / 8) * Math.PI; s.box([0.9, 1.2, 0.9], [x * TX + Math.cos(t2) * (TW / 2 - 0.4), TH + 0.9, Math.sin(t2) * (TW / 2 - 0.4)], pale); }
      // Keel-arched niches on the round face.
      for (let i = 0; i < 3; i++) {
        const t2 = Math.PI * (0.3 + i * 0.2);
        const nx = x * TX + Math.cos(t2) * (TW / 2 + 0.02), nz = Math.sin(t2) * (TW / 2 + 0.02);
        const niche = s.box([1.4, 3.4, 0.2], [nx, TH * 0.65, nz], dark);
        niche.rotation.y = Math.PI / 2 - t2;
        const hood = s.mesh(new THREE.ConeGeometry(0.8, 1.2, 4), pale, [nx, TH * 0.65 + 2.2, nz]);
        hood.rotation.y = Math.PI / 4 - t2;
      }
    }
    // The gate block between, with its tall round arch and passage.
    const GW = TX * 2 - TW + 0.4;
    s.box([GW, TH - 1, TD], [0, (TH - 1) / 2, -TD / 2 - 1.2], stone);
    s.box([GW + 0.4, 0.8, 0.6], [0, TH - 1, -0.9], pale);
    const AW = 4.6, AH = 9;
    const arch = new THREE.Shape();
    arch.moveTo(-AW / 2, 0); arch.lineTo(-AW / 2, AH - AW / 2); arch.absarc(0, AH - AW / 2, AW / 2, Math.PI, 0, true); arch.lineTo(AW / 2, 0); arch.closePath();
    const archFace = s.mesh(new THREE.ShapeGeometry(arch, 16), dark, [0, 0, -1.15]);
    void archFace;
    const frame = new THREE.Shape();
    frame.moveTo(-AW / 2 - 1, 0); frame.lineTo(-AW / 2 - 1, AH - AW / 2); frame.absarc(0, AH - AW / 2, AW / 2 + 1, Math.PI, 0, true); frame.lineTo(AW / 2 + 1, 0); frame.lineTo(AW / 2, 0);
    frame.lineTo(AW / 2, AH - AW / 2); frame.absarc(0, AH - AW / 2, AW / 2, 0, Math.PI, false); frame.lineTo(-AW / 2, 0); frame.closePath();
    s.mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.4, bevelEnabled: false, curveSegments: 16 }), pale, [0, 0, -1.2]);
    // Doors: shut across the arch, or swung back.
    if (a.doors === 'shut') {
      for (const x of [-1, 1]) s.box([AW / 2 - 0.05, AH - AW / 2 + 0.8, 0.3], [x * AW / 4, (AH - AW / 2 + 0.8) / 2, -0.95], wood);
      const top = new THREE.Shape(); top.moveTo(-AW / 2, 0); top.absarc(0, 0, AW / 2, Math.PI, 0, true); top.closePath();
      s.mesh(new THREE.ShapeGeometry(top, 12), wood, [0, AH - AW / 2 + 0.8, -0.92]);
    } else {
      for (const x of [-1, 1]) { const leaf = s.box([AW / 2, AH - AW / 2, 0.3], [x * (AW / 2 + 0.05), (AH - AW / 2) / 2, -2.2], wood); leaf.rotation.y = x * Math.PI / 2; leaf.position.z = -1.2 - AW / 4; }
      // A glimpse of the street beyond: a bright slot of sky and a far house front.
      s.box([AW - 0.4, AH * 0.75, 0.1], [0, AH * 0.38, -1.1], s.material('#d9c9a8', { emissive: '#f0d9a8', emissiveIntensity: 0.25 }));
    }

    // The two minarets of al-Muayyad standing on the towers.
    const minaret = (mx: number, mz: number) => {
      let y = TH;
      s.box([4, 4.5, 4], [mx, y + 2.25, mz], stone); y += 4.5;
      s.box([4.4, 0.5, 4.4], [mx, y, mz], pale);
      s.cylinder(1.75, 1.85, 7, [mx, y + 3.5, mz], stone, 8); y += 7;
      for (let tier = 0; tier < 2; tier++) {
        s.cylinder(2.5, 1.7, 1.4, [mx, y + 0.7, mz], pale, 16); y += 1.4;
        s.cylinder(2.5, 2.5, 0.25, [mx, y, mz], pale, 16);
        for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; s.box([0.12, 0.9, 0.12], [mx + Math.sin(t) * 2.4, y + 0.5, mz + Math.cos(t) * 2.4], pale); }
        s.mesh(new THREE.TorusGeometry(2.42, 0.13, 5, 24), lampMat, [mx, y + 0.95, mz]).rotation.x = Math.PI / 2;
        const r = tier === 0 ? 1.4 : 1.15;
        s.cylinder(r, r + 0.1, tier === 0 ? 5.5 : 4, [mx, y + (tier === 0 ? 2.75 : 2), mz], stone, tier === 0 ? 16 : 8);
        y += tier === 0 ? 5.5 : 4;
      }
      // The pavilion and its bulb.
      if (a.caps === 'bulbs') {
        for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; s.rod([mx + Math.sin(t) * 1.05, y, mz + Math.cos(t) * 1.05], [mx + Math.sin(t) * 1.05, y + 3, mz + Math.cos(t) * 1.05], 0.14, pale); }
        s.cylinder(0.5, 0.5, 3, [mx, y + 1.5, mz], dark, 8);
      } else s.cylinder(1.1, 1.1, 3, [mx, y + 1.5, mz], stone, 8);
      y += 3;
      s.cylinder(1.4, 1.4, 0.4, [mx, y + 0.2, mz], pale, 16); y += 0.4;
      const bulb = s.lathe([[0, 0], [1.15, 0.1], [1.45, 0.9], [1.3, 1.8], [0.8, 2.6], [0.3, 3.2], [0.1, 3.5], [0, 3.6]], a.caps === 'bulbs' ? pale : stone, [mx, y, mz]);
      if (a.caps === 'bulbs') for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; s.tube([[mx + Math.sin(t) * 1.2, y + 0.1, mz + Math.cos(t) * 1.2], [mx + Math.sin(t) * 1.48, y + 0.9, mz + Math.cos(t) * 1.48], [mx + Math.sin(t) * 1.32, y + 1.8, mz + Math.cos(t) * 1.32], [mx + Math.sin(t) * 0.82, y + 2.6, mz + Math.cos(t) * 0.82], [mx, y + 3.5, mz]], 0.06, dark); }
      void bulb;
      s.rod([mx, y + 3.5, mz], [mx, y + 5.4, mz], 0.08, s.material('#a08a5a', { metalness: 0.6, roughness: 0.4 }));
      s.ball([0.22, 0.22, 0.22], [mx, y + 4.6, mz], s.material('#a08a5a', { metalness: 0.6, roughness: 0.4 }), 8);
      return new THREE.Vector3(mx, y + 0.5, mz);
    };
    const tops = [minaret(-TX, -TD / 2), minaret(TX, -TD / 2)];

    // The street in front: worn paving.
    s.box([34, 0.2, 18], [0, 0.1, 3], s.material(new THREE.Color('#bfae90').lerp(new THREE.Color('#8f8270'), wear * 0.4), { roughness: 1 }));

    const cloth = (hex: string) => s.material(hex, { roughness: 0.95, side: THREE.DoubleSide });
    const skins = ['#c9956a', '#a8724b', '#e2b894', '#7c5236'];
    const robes = ['#efe9dc', '#3a3a3e', '#6a5a48', '#c9c2b2', '#4a5a6a', '#7a3a2a'];
    const people = (n: number, x0: number, x1: number, z0: number, z1: number, poses: ('standing' | 'walking' | 'carrying' | 'arms-crossed' | 'pointing')[]) => {
      for (let i = 0; i < n; i++) {
        const p = figure(s, { height: 1.6 + random() * 0.25, style: 'doll', pose: poses[i % poses.length], hair: (['hood', 'cap', 'short', 'hat'] as const)[i % 4], top: robes[Math.floor(random() * robes.length)], bottom: robes[Math.floor(random() * robes.length)], skin: skins[i % 4], mirror: random() < 0.5 });
        s.root.add(p.root);
        p.root.position.set(mix(x0, x1, random()), 0.2, mix(z0, z1, random()));
        p.root.rotation.y = (random() - 0.5) * 2.4;
      }
    };

    if (a.life === 'market') {
      // Carpets draped down the towers, brass lanterns under the arch, stalls.
      for (const x of [-1, 1]) for (let i = 0; i < 2; i++) {
        const c = s.box([2.2, 4.5, 0.08], [x * TX + x * (i ? 2.2 : -0.6), 5.5, TW / 2 + 0.1 - (i ? 1.4 : 0)], s.material(i ? clothHex : '#c9a24a', { roughness: 0.95 }));
        c.rotation.y = -x * (i ? 0.7 : 0.1);
      }
      const brass = s.material('#c9962e', { metalness: 0.6, roughness: 0.35, emissive: '#ffb040', emissiveIntensity: mix(0.3, 1.6, glow) });
      for (let i = 0; i < 5; i++) {
        const lx = -1.6 + i * 0.8, ly = AH - 2.5 - (i % 2) * 0.7;
        s.rod([lx, AH - 1.2, 0.2], [lx, ly + 0.5, 0.2], 0.02, dark);
        s.lathe([[0, 0], [0.25, 0.1], [0.32, 0.4], [0.22, 0.7], [0.05, 0.9], [0, 0.95]], brass, [lx, ly - 0.45, 0.2]);
      }
      for (const x of [-4.6, 4.2]) {
        s.box([2.6, 0.9, 1.4], [x, 0.65, 5.5], s.material('#7a5a3a'));
        s.box([2.8, 0.06, 1.8], [x, 2.6, 5.5], cloth(clothHex)).rotation.x = 0.15;
        for (const dx of [-1.3, 1.3]) s.rod([x + dx, 0.2, 4.8], [x + dx, 2.6, 4.8], 0.05, dark);
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff'), Array.from({ length: 12 }, () => ({ at: [x + (random() - 0.5) * 2.2, 1.2, 5.5 + (random() - 0.5) * 1] as P, size: 0.15 + random() * 0.08, color: ['#e8a02a', '#c23a2a', '#7a9a3a', '#e8d8a8'][Math.floor(random() * 4)] })));
      }
      people(6, -6, 6, 3, 9, ['standing', 'walking', 'carrying', 'pointing']);
    }
    if (a.life === 'procession') {
      // Pennant strings between the minarets and down to the towers, banners, a crowd.
      const pennants: { at: P; color: string }[] = [];
      const swag = (from: THREE.Vector3, to: THREE.Vector3, sag: number, n: number) => {
        const pts: P[] = [];
        for (let i = 0; i <= n; i++) { const t = i / n; const p = from.clone().lerp(to, t); p.y -= Math.sin(t * Math.PI) * sag; pts.push([p.x, p.y, p.z]); if (i % 2) pennants.push({ at: [p.x, p.y - 0.35, p.z], color: i % 4 === 1 ? clothHex : '#f2e6c8' }); }
        s.tube(pts, 0.03, dark);
      };
      swag(tops[0], tops[1], 5, 30);
      for (const t of tops) swag(t, new THREE.Vector3(t.x * 1.3, 2.5, 10), 3, 26);
      s.scatter(new THREE.ConeGeometry(0.35, 0.8, 3), cloth('#ffffff'), pennants.map(({ at, color }) => ({ at, size: 1, color })));
      for (const x of [-3, 3]) { s.rod([x, 0.2, 6], [x, 5.5, 6], 0.05, dark); s.box([1.4, 2, 0.05], [x + 0.7, 4.4, 6], cloth(clothHex)); }
      people(7, -5, 5, 1, 10, ['walking', 'walking', 'carrying', 'standing']);
    }
    if (a.life === 'gallows') {
      s.box([GW + 1, 0.5, 0.5], [0, AH + 2.6, 1.2], s.material('#4a3a2a'));
      for (const x of [-1, 1]) s.box([0.4, 0.4, 2.6], [x * (GW / 2), AH + 2.6, 0], s.material('#4a3a2a'));
      s.rod([0.6, AH + 2.4, 1.2], [0.6, AH - 0.6, 1.2], 0.03, s.material('#8a7a5a'));
      s.ring(0.25, 0.04, [0.6, AH - 0.85, 1.2], s.material('#8a7a5a'));
      people(8, -6, 6, 6, 11, ['standing', 'arms-crossed', 'standing']);
    }
    if (a.life === 'quiet') {
      people(2, -5, 5, 4, 9, ['walking', 'standing']);
      s.ball([0.25, 0.18, 0.4], [3.2, 0.38, 2.5], s.material('#c98a3a'), 10);
      s.ball([0.12, 0.12, 0.12], [3.2, 0.55, 2.85], s.material('#c98a3a'), 8);
    }

    return s.finish();
  },
});
