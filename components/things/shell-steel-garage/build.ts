import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const HALF = 1.3, WALL = 1.5, TOP = 2.02;

/** The loaf-shaped cross-section, left foot to right foot: [x, y, distance along it 0..1]. */
function section() {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 3; i++) pts.push([-HALF, WALL * i / 3]);
  for (let i = 1; i <= 5; i++) { const t = i / 5 * Math.PI / 2; pts.push([-HALF + 0.42 * (1 - Math.cos(t)), WALL + 0.42 * Math.sin(t)]); }
  for (let i = 1; i <= 5; i++) { const x = mix(-HALF + 0.42, 0, i / 5); pts.push([x, WALL + 0.42 + (TOP - WALL - 0.42) * (1 - Math.pow(x / (HALF - 0.42), 2))]); }
  const right = pts.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number]);
  const all = [...pts, ...right];
  let total = 0; const lengths = [0];
  for (let i = 1; i < all.length; i++) { total += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]); lengths.push(total); }
  return all.map(([x, y], i) => [x, y, lengths[i] / total] as const);
}

/** Ribbed skin from z0 to z1; the front edge leans back by `slant` at the top. y is measured down from `originY`. */
function skin(z0: number, z1: number, slant: number, originY: number, originZ: number) {
  const ring = section(), nz = Math.max(6, Math.round((z1 - z0) / 0.045));
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= nz; i++) {
    const f = i / nz;
    const rib = 1 + 0.012 * Math.max(0, Math.sin((z0 + (z1 - z0) * f) * Math.PI * 2 / 0.36)) ** 3;
    for (let j = 0; j < ring.length; j++) {
      const [x, y, d] = ring[j];
      const z = mix(z0, z1 - slant * (y / TOP), f);
      pos.push(x * rib, y * (y > 0.01 ? rib : 1) - originY, z - originZ); uv.push((z + 2.3) / 4.6, d);
      if (i < nz && j < ring.length - 1) { const p = i * ring.length + j; idx.push(p, p + ring.length, p + 1, p + 1, p + ring.length, p + ring.length + 1); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A flat end wall in the same shape, leaning back by `slant` at the top. */
function endWall(z: number, slant: number, originY: number, originZ: number) {
  const ring = section();
  const pos: number[] = [0, TOP * 0.5 - originY, z - slant * 0.5 - originZ], uv: number[] = [0.5, 0.5], idx: number[] = [];
  ring.forEach(([x, y], j) => { pos.push(x, y - originY, z - slant * (y / TOP) - originZ); uv.push(x / (HALF * 2) + 0.5, y / TOP); if (j < ring.length - 1) idx.push(0, j + 1, j + 2); });
  idx.push(0, ring.length, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    door: choice('How has the shell been left?', {
      locked: 'Down and padlocked, as it is most of the year.',
      cracked: 'Raised a hand-width, a dark slot with light leaking out.',
      open: 'Thrown right up, the owner is in there.',
    }),
    inside: choice('What is glimpsed inside when it opens?', {
      car: 'The nose of a carefully kept car, chrome bumper first.',
      jars: 'Shelves of three-litre pickling jars and sacks of potatoes, no car at all.',
      workshop: 'A workbench with a vice under a bare bulb, tools on nails.',
      junk: 'Stacked bald tyres, old skis, a bicycle wheel, boxes of things that might be needed.',
    }),
    paint: choice('What colour is the steel?', {
      oxide: 'Red-brown oxide primer.',
      green: 'Dull dark green.',
      silver: 'Aluminium silver gone chalky.',
      blue: 'Grey-blue.',
      galvanised: 'Bare galvanised zinc, spangled and streaked.',
    }),
    marking: choice('What has been painted on the front?', {
      number: 'Only its lot number in white brush strokes.',
      sale: 'ПРОДАМ and a phone number.',
      doomed: 'A stencilled demolition notice: ПОД СНОС.',
      tags: 'Spray-can tags and a football club name.',
      heart: 'A clumsy heart with two initials.',
    }),
    outside: choice('What stands outside by the door?', {
      nothing: 'Nothing.',
      stool: 'A low stool with a bottle and two glasses on a spread newspaper.',
      tyres: 'A stack of spare tyres.',
      shovel: 'A snow shovel and a bucket of sand.',
      barrel: 'A rain barrel under a bent gutter pipe.',
    }),
    row: choice('Does it stand alone?', {
      alone: 'Alone on its patch.',
      pair: 'Shoulder to shoulder with a neighbour of another colour.',
    }),
    snow: score('How much snow is on the roof?', ['None', 'Frost in the ribs', 'A white cap', 'A heavy sagging load']),
    ventilation: choice('What ventilation is cut into the fixed shell?', {
      blank: 'Unbroken sheet steel.',
      slots: 'A rectangular louvred grille on each side.',
      round: 'A round capped wall vent with a mesh face.',
      chimney: 'A short capped flue rises through the rear roof.',
    }),
    lidSupport: choice('If the shell is raised, what supports its weight?', {
      arms: 'Two simple hinged steel stay arms.',
      struts: 'Paired telescoping support struts.',
      chain: 'Chains hold the lid at its opening limit.',
      timber: 'A temporary timber prop braces the raised front corner.',
    }),
    roofCarrier: choice('What is mounted over the fixed rear roof?', {
      bare: 'The curved roof is bare.',
      rails: 'Two raised longitudinal luggage rails.',
      ladder: 'A timber ladder is tied across a pair of roof bars.',
      boards: 'Three salvaged planks are lashed to a small roof rack.',
    }),
    wallBracing: choice('What reinforces the fixed sidewalls?', {
      plain: 'Only the corrugated sheet and its low sill.',
      crossed: 'Diagonal steel straps cross both sidewalls.',
      uprights: 'Three extra vertical angle-iron stiffeners on each side.',
      belt: 'A broad horizontal reinforcing band runs around the shell.',
    }),
    floorLining: choice('What covers the floor inside?', {
      concrete: 'Bare dark concrete.',
      boards: 'Narrow timber boards run the length of the garage.',
      tracks: 'Two metal tyre tracks cross the concrete.',
      checker: 'A worn grid of light and dark workshop tiles.',
    }),
    apron: choice('How is the approach to the door finished?', {
      flat: 'A plain concrete approach.',
      tracks: 'Two short steel wheel ramps bridge the threshold.',
      slabs: 'A row of broad paving slabs forms an apron.',
      drain: 'An open metal drainage grate crosses the entrance.',
    }),
    sideStorage: choice('What hangs from the outer left side?', {
      empty: 'Nothing is stored outside.',
      hose: 'A green hose loop hangs from a wall hook.',
      broom: 'A long yard broom hangs from a bracket.',
      cable: 'A cable reel is bolted beside the rear corner.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f0f3f6', roughness: 0.95 });
    const dusk = mood.daylight > 0.7 || mood.daylight < 0.2;
    const COLOURS = { oxide: '#84402e', green: '#3f5c45', silver: '#aeb3b3', blue: '#6f8799', galvanised: '#9aa3a5' } as const;
    const Z0 = -2.2, ZH = 0.75, Z1 = 2.25, SLANT = 0.4;

    const steelTexture = (base: THREE.Color, front: boolean, number: number, marking: string | null) => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, 512, 512);
      const streaks = 8 + mood.wear * 50;
      for (let i = 0; i < streaks; i++) {
        const alpha = 0.15 + mood.wear * 0.5 * random();
        if (front) { const x = random() * 512, y = random() * 200, h = 80 + random() * 300; const grad = g.createLinearGradient(0, y, 0, y + h); grad.addColorStop(0, `rgba(112,58,30,${alpha})`); grad.addColorStop(1, 'rgba(112,58,30,0)'); g.fillStyle = grad; g.fillRect(x, y, 5 + random() * 22, h); }
        else { const x = random() * 512, w = 4 + random() * 18, len = 60 + random() * 150; for (const dir of [-1, 1]) { const y0 = 256 + dir * (60 + random() * 30); const grad = g.createLinearGradient(0, y0, 0, y0 + dir * len); grad.addColorStop(0, `rgba(112,58,30,${alpha})`); grad.addColorStop(1, 'rgba(112,58,30,0)'); g.fillStyle = grad; g.fillRect(x, Math.min(y0, y0 + dir * len), w, len); } }
      }
      g.fillStyle = `rgba(80,44,26,${0.25 + mood.wear * 0.45})`;
      if (front) g.fillRect(0, 470, 512, 42); else { g.fillRect(0, 0, 512, 22); g.fillRect(0, 490, 512, 22); }
      if (front) {
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.save(); g.translate(256, 150); g.rotate((random() - 0.5) * 0.08); g.fillStyle = '#f1eee2'; g.font = 'bold 86px sans-serif'; g.fillText(`№ ${number}`, 0, 0); g.restore();
        if (marking === 'sale') { g.fillStyle = '#f1eee2'; g.font = 'bold 60px sans-serif'; g.fillText('ПРОДАМ', 256, 270); g.font = 'bold 44px sans-serif'; g.fillText(`${20 + Math.floor(random() * 70)}-${10 + Math.floor(random() * 89)}-${10 + Math.floor(random() * 89)}`, 256, 335); }
        else if (marking === 'doomed') { g.strokeStyle = '#d6201a'; g.lineWidth = 7; g.strokeRect(96, 232, 320, 104); g.fillStyle = '#d6201a'; g.font = 'bold 64px sans-serif'; g.fillText('ПОД СНОС', 256, 286, 300); }
        else if (marking === 'tags') { const inks = ['#16161a', '#1f3f8a', '#d6201a', '#f1eee2']; for (const [word, y] of [['СПАРТАК', 270], ['ЦСКА', 340], ['ЦОЙ', 400]] as const) { g.save(); g.translate(130 + random() * 250, y); g.rotate((random() - 0.5) * 0.4); g.fillStyle = inks[Math.floor(random() * inks.length)]; g.font = `bold ${40 + random() * 24}px sans-serif`; g.fillText(word, 0, 0); g.restore(); } }
        else if (marking === 'heart') { g.strokeStyle = '#d6201a'; g.lineWidth = 9; g.beginPath(); g.moveTo(256, 380); g.bezierCurveTo(120, 290, 190, 215, 256, 275); g.bezierCurveTo(322, 215, 392, 290, 256, 380); g.stroke(); g.fillStyle = '#d6201a'; g.font = 'bold 44px sans-serif'; g.fillText('О + С', 256, 318); }
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      return texture;
    };

    let bulbGlow = 0;
    const shell = (offsetX: number, paintKey: keyof typeof COLOURS, door: 'locked' | 'cracked' | 'open', marking: string | null, hero: boolean) => {
      const g = new Sculpture(context);
      g.root.position.x = offsetX;
      s.root.add(g.root);
      const base = new THREE.Color(COLOURS[paintKey]).lerp(new THREE.Color('#7a6a5c'), mood.wear * 0.3);
      const number = 3 + Math.floor(random() * 240);
      const metal = { metalness: paintKey === 'galvanised' || paintKey === 'silver' ? 0.55 : 0.25, roughness: 0.6 + mood.wear * 0.3, side: THREE.DoubleSide };
      const side = new THREE.MeshStandardMaterial({ map: steelTexture(base, false, number, null), ...metal });
      const front = new THREE.MeshStandardMaterial({ map: steelTexture(base, true, number, marking), ...metal });
      g.mesh(skin(Z0, ZH, 0, 0, 0), side);
      g.mesh(endWall(Z0, 0, 0, 0), side);
      g.box([HALF * 2 - 0.05, 0.03, Z1 - Z0 - 0.1], [0, 0.015, (Z0 + Z1) / 2 - 0.05], new THREE.MeshStandardMaterial({ color: '#3d3a36', roughness: 1 }));
      // Inner lining so the mouth reads dark rather than as the back of the paint.
      const lining = new THREE.Mesh(skin(Z0 + 0.03, ZH, 0, 0, 0), new THREE.MeshStandardMaterial({ color: '#2b2622', roughness: 1, side: THREE.BackSide }));
      lining.scale.set(0.985, 0.985, 1); g.root.add(lining);
      const lid = new THREE.Group(); lid.position.set(0, TOP, ZH);
      const angle = { locked: 0, cracked: mix(0.24, 0.32, random()), open: mix(1.1, 1.3, random()) }[door];
      lid.rotation.x = -angle; g.root.add(lid);
      for (const [geometry, material] of [[skin(ZH, Z1, SLANT, TOP, ZH), side], [endWall(Z1, SLANT, TOP, ZH), front]] as const) { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; lid.add(m); }
      // Hasp, padlock and a lifting handle on the lid.
      const iron = new THREE.MeshStandardMaterial({ color: '#2f3133', metalness: 0.6, roughness: 0.5 });
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), iron); handle.position.set(0, 0.55 - TOP, Z1 - ZH - SLANT * 0.27 + 0.04); lid.add(handle);
      if (door === 'locked') {
        g.box([0.1, 0.13, 0.05], [0, 0.2, Z1 - SLANT * 0.1 + 0.05], g.material('#c9a23a', { metalness: 0.7, roughness: 0.4 }));
        g.ring(0.045, 0.012, [0, 0.29, Z1 - SLANT * 0.13 + 0.05], iron);
        g.box([0.2, 0.05, 0.03], [0, 0.3, Z1 - SLANT * 0.14 + 0.02], iron);
      }
      for (const x of [-HALF - 0.03, HALF + 0.03]) g.cylinder(0.05, 0.05, 0.08, [x, TOP - 0.42, ZH], iron, 10).rotation.z = Math.PI / 2;
      if (a.ventilation === 'chimney') {
        g.cylinder(0.095, 0.095, 0.52, [0.3, TOP + 0.2, -1.55], iron, 12);
        g.cylinder(0.2, 0.1, 0.12, [0.3, TOP + 0.52, -1.55], iron, 12);
      } else if (a.ventilation !== 'blank') for (const sideX of [-1, 1]) {
        const x = sideX * (HALF + 0.015), y = 1.22, z = -1.3;
        if (a.ventilation === 'slots') {
          g.box([0.035, 0.3, 0.44], [x, y, z], iron);
          for (let row = 0; row < 5; row++) g.box([0.045, 0.018, 0.37], [x + sideX * 0.024, y - 0.11 + row * 0.055, z], g.material('#9ca2a0', { metalness: 0.5 }));
        } else {
          const ring = g.ring(0.16, 0.025, [x, y, z], iron); ring.rotation.y = Math.PI / 2;
          const cap = g.cylinder(0.14, 0.14, 0.03, [x, y, z], g.material('#454c4c'), 16); cap.rotation.z = Math.PI / 2;
          for (const offset of [-0.1, -0.05, 0, 0.05, 0.1]) { const span = Math.sqrt(0.14 ** 2 - offset ** 2); g.rod([x + sideX * 0.02, y + offset, z - span], [x + sideX * 0.02, y + offset, z + span], 0.005, iron); }
        }
      }
      if (a.wallBracing !== 'plain') for (const sideX of [-1, 1]) {
        const x = sideX * (HALF + 0.02);
        if (a.wallBracing === 'crossed') {
          g.rod([x, 0.12, Z0 + 0.1], [x, 1.45, ZH - 0.1], 0.022, iron);
          g.rod([x, 1.45, Z0 + 0.1], [x, 0.12, ZH - 0.1], 0.022, iron);
        } else if (a.wallBracing === 'uprights') for (const z of [-1.9, -0.8, 0.3]) g.box([0.045, 1.46, 0.065], [x, 0.73, z], iron);
        else g.box([0.035, 0.12, ZH - Z0], [x, 0.75, (ZH + Z0) / 2], iron);
      }
      if (a.floorLining === 'boards') for (let i = 0; i < 12; i++) g.box([0.2, 0.018, 4.25], [-1.15 + i * 0.21, 0.039, 0.02], g.material(i % 3 ? '#81735b' : '#6d6352'));
      else if (a.floorLining === 'tracks') for (const x of [-0.72, 0.72]) {
        g.box([0.31, 0.018, 4.25], [x, 0.039, 0.02], iron);
        for (let j = 0; j < 16; j++) g.box([0.31, 0.01, 0.02], [x, 0.053, -1.98 + j * 0.26], iron);
      } else if (a.floorLining === 'checker') for (let i = 0; i < 6; i++) for (let j = 0; j < 10; j++) g.box([0.4, 0.015, 0.42], [-1.025 + i * 0.41, 0.0375, -1.91 + j * 0.43], g.material((i + j) % 2 ? '#938d7e' : '#535854'));
      if (a.roofCarrier !== 'bare') {
        for (const x of [-0.75, 0.75]) for (const z of [-1.8, 0.25]) g.rod([x, 1.92, z], [x, 2.18, z], 0.018, iron);
        for (const z of [-1.8, 0.25]) g.rod([-0.87, 2.18, z], [0.87, 2.18, z], 0.022, iron);
        for (const x of [-0.75, 0.75]) g.rod([x, 2.18, -1.95], [x, 2.18, 0.38], 0.022, iron);
        if (a.roofCarrier === 'ladder') {
          const timber = g.material('#b19a6b');
          for (const x of [-0.33, 0.33]) g.box([0.065, 0.06, 2.4], [x, 2.232, -0.75], timber);
          for (let j = 0; j < 9; j++) g.box([0.66, 0.045, 0.045], [0, 2.232, -1.75 + j * 0.25], timber);
          for (const z of [-1.8, 0.25]) g.tube([[-0.36, 2.18, z], [-0.36, 2.27, z], [0.36, 2.27, z], [0.36, 2.18, z]], 0.008, g.material('#c8bd9e'));
        } else if (a.roofCarrier === 'boards') {for (let i = 0; i < 3; i++) {
          g.box([0.32, 0.06, 2.25], [-0.36 + i * 0.36, 2.232, -0.75], g.material(i % 2 ? '#938464' : '#b09a73'));}
          for (const z of [-1.7, 0.15]) g.tube([[-0.54, 2.18, z], [-0.54, 2.27, z], [0.54, 2.27, z], [0.54, 2.18, z]], 0.008, iron);
        }
      }
      if (hero && a.sideStorage !== 'empty') {
        const x = -HALF - 0.12, z = -0.7;
        g.rod([-HALF, 1.4, z], [x - 0.08, 1.4, z], 0.015, iron);
        if (a.sideStorage === 'hose') {
          for (let i = 0; i < 3; i++) { const loop = g.ring(0.32 + i * 0.012, 0.014, [x - i * 0.03, 1.08 - i * 0.012, z], g.material('#3e6551')); loop.rotation.y = Math.PI / 2; }
        } else if (a.sideStorage === 'broom') {
          g.rod([x, 0.35, z], [x, 1.47, z], 0.018, g.material('#ab8755'));
          g.box([0.1, 0.25, 0.29], [x, 0.28, z], g.material('#8a7549'));
          g.ring(0.035, 0.006, [x, 1.43, z], iron).rotation.y = Math.PI / 2;
        } else {
          for (const dx of [-0.06, 0.06]) { const flange = g.cylinder(0.23, 0.23, 0.018, [x + dx, 1.15, z], iron, 14); flange.rotation.z = Math.PI / 2; }
          for (let i = 0; i < 5; i++) { const coil = g.ring(0.17, 0.012, [x - 0.05 + i * 0.025, 1.15, z], g.material('#333735')); coil.rotation.y = Math.PI / 2; }
          g.rod([-HALF, 1.15, z], [x - 0.07, 1.15, z], 0.025, iron);
        }
      }
      if (hero && a.apron !== 'flat') {
        if (a.apron === 'tracks') for (const x of [-0.72, 0.72]) {
          const ramp = g.box([0.36, 0.035, 0.85], [x, 0.023, 2.44], iron); ramp.rotation.x = 0.025;
        } else if (a.apron === 'slabs') for (let i = 0; i < 5; i++) g.box([0.49, 0.03, 0.62], [-1.0 + i * 0.5, 0.015, 2.53], g.material(i % 2 ? '#a7a293' : '#93978e'));
        else {
          g.box([2.5, 0.025, 0.28], [0, 0.0125, 2.56], g.material('#292e2c'));
          for (let i = 0; i < 35; i++) g.box([0.025, 0.012, 0.28], [-1.19 + i * 0.07, 0.031, 2.56], iron);
        }
      }
      if (door !== 'locked') {
        lid.updateMatrix();
        const joint = (x: number) => new THREE.Vector3(x, 1.2 - TOP, Z1 - ZH - SLANT * 1.2 / TOP).applyMatrix4(lid.matrix).toArray() as P3;
        for (const side of [-1, 1]) {
          const x = side * (HALF - 0.05), from: P3 = [x, 0.7, ZH - 0.15], end = joint(x);
          if (a.lidSupport === 'timber') { if (side < 0) g.rod([end[0], 0, end[2] - 0.2], end, 0.035, g.material('#ad8b59')); }
          else if (a.lidSupport === 'chain') g.tube([from, [x, (from[1] + end[1]) / 2 - 0.08, (from[2] + end[2]) / 2], end], 0.011, iron);
          else {
            g.rod(from, end, 0.016, iron);
            if (a.lidSupport === 'struts') g.rod(from, new THREE.Vector3(...from).lerp(new THREE.Vector3(...end), 0.55).toArray() as P3, 0.033, g.material('#aeb7b7', { metalness: 0.8 }));
          }
        }
      }
      if (a.snow > 0.3) {
        const depth = mix(0.02, 0.2, (a.snow - 0.3) / 0.7);
        const cap = (z0: number, z1: number, parent: THREE.Object3D, oy: number, oz: number) => { const r = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), snowMat); r.scale.set(HALF * 0.9, depth * 1.2 + 0.14, (z1 - z0) * 0.5); r.position.set(0, TOP - 0.1 - oy, (z0 + z1) / 2 - oz); r.castShadow = true; parent.add(r); };
        cap(Z0, ZH, g.root, 0, 0);
        if (door !== 'open') cap(ZH, Z1 - SLANT, lid, TOP, ZH);
      }
      if (door === 'locked' || !hero) return;

      // The glimpse inside. A bare bulb lights it.
      bulbGlow = mix(0.6, 1.8, dusk ? 1 : 0.4);
      g.rod([0, TOP - 0.05, 0.3], [0, TOP - 0.4, 0.3], 0.006, iron);
      g.ball([0.05, 0.065, 0.05], [0, TOP - 0.46, 0.3], new THREE.MeshStandardMaterial({ color: '#fff2c4', emissive: '#ffcf70', emissiveIntensity: bulbGlow }), 10);
      const glowPanel = g.box([HALF * 2 - 0.2, TOP - 0.3, 0.02], [0, (TOP - 0.3) / 2, Z0 + 0.6], new THREE.MeshStandardMaterial({ color: '#5a4630', emissive: '#ffb65a', emissiveIntensity: bulbGlow * 0.22, roughness: 1 }));
      glowPanel.castShadow = false;
      if (door === 'cracked') return;
      if (a.inside === 'car') {
        const body = g.material(['#d3c29c', '#a4252a', '#5f86a8', '#e9e7de', '#3e6b4e'][Math.floor(random() * 5)], { metalness: 0.4, roughness: 0.35 });
        const chrome = g.material('#d5d9db', { metalness: 0.9, roughness: 0.25 });
        const zf = 2.15;
        g.box([1.6, 0.55, 2.6], [0, 0.62, zf - 1.3], body);
        g.box([1.44, 0.48, 1.5], [0, 1.14, zf - 2.0], body);
        const screen = g.box([1.3, 0.44, 0.02], [0, 1.15, zf - 1.22], new THREE.MeshStandardMaterial({ color: '#27343b', roughness: 0.12, metalness: 0.5 })); screen.rotation.x = -0.45;
        g.box([1.1, 0.2, 0.03], [0, 0.66, zf + 0.01], g.material('#1c1d1f'));
        for (const x of [-0.6, 0.6]) { const lamp = g.cylinder(0.085, 0.085, 0.05, [x, 0.66, zf + 0.01], new THREE.MeshStandardMaterial({ color: '#f3f0dc', emissive: '#ffe9a8', emissiveIntensity: 0.25, roughness: 0.2 }), 14); lamp.rotation.x = Math.PI / 2; }
        g.box([1.68, 0.07, 0.08], [0, 0.42, zf + 0.06], chrome);
        for (const x of [-0.72, 0.72]) { const w = g.cylinder(0.3, 0.3, 0.19, [x, 0.3, zf - 0.75], g.material('#1b1b1d', { roughness: 0.95 }), 16); w.rotation.z = Math.PI / 2; }
      } else if (a.inside === 'jars') {
        const wood = g.material('#8a6a43', { roughness: 1 });
        const zs = 1.25;
        for (const x of [-1.1, 0, 1.1]) g.box([0.05, 1.3, 0.34], [x, 0.65, zs], wood);
        const jars: { at: P3; size: number; color: string }[] = [];
        const fills = ['#5f7d2c', '#b8301f', '#c98a1c', '#7a2a3a', '#d9c98a', '#3f5f2a'];
        for (let row = 0; row < 3; row++) {
          g.box([2.25, 0.04, 0.34], [0, 0.12 + row * 0.42, zs], wood);
          for (let i = 0; i < 12; i++) if (random() < mix(0.6, 1, mood.density)) jars.push({ at: [-1.0 + i * 0.18, 0.27 + row * 0.42, zs + (random() - 0.5) * 0.05], size: 1, color: fills[Math.floor(random() * fills.length)] });
        }
        const jar = new THREE.CylinderGeometry(0.075, 0.075, 0.25, 10);
        g.scatter(jar, new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.15 }), jars);
        g.scatter(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), g.material('#c9a23a', { metalness: 0.7 }), jars.map((j) => ({ at: [j.at[0], j.at[1] + 0.135, j.at[2]] as P3, size: 1 })));
        const sack = g.material('#a58c62', { roughness: 1 });
        for (const [x, z] of [[-0.75, 1.95], [-0.3, 2.1], [0.75, 2.0]] as const) { g.ball([0.27, 0.34, 0.22], [x, 0.32, z], sack, 12); g.ball([0.08, 0.08, 0.08], [x, 0.68, z], sack, 8); }
        for (let i = 0; i < 3; i++) g.lathe([[0, 0], [0.075, 0], [0.08, 0.2], [0.05, 0.24], [0.05, 0.27], [0, 0.27]], new THREE.MeshStandardMaterial({ color: fills[i], roughness: 0.15 }), [0.15 + i * 0.2, 0.03, 2.2 + (i % 2) * 0.12]);
      } else if (a.inside === 'workshop') {
        const wood = g.material('#7a5c3a', { roughness: 1 });
        const steel = g.material('#9da3a6', { metalness: 0.7, roughness: 0.4 });
        const zb = 1.45;
        g.box([2.0, 0.07, 0.6], [0, 0.85, zb], wood);
        for (const x of [-0.9, 0.9]) for (const z of [-0.24, 0.24]) g.box([0.07, 0.82, 0.07], [x, 0.41, zb + z], wood);
        g.box([1.9, 0.03, 0.5], [0, 0.3, zb], wood);
        g.box([0.2, 0.14, 0.14], [0.65, 0.96, zb + 0.2], g.material('#2f5d8a', { metalness: 0.4 }));
        g.box([0.06, 0.12, 0.2], [0.65, 1.02, zb + 0.3], g.material('#2f5d8a', { metalness: 0.4 }));
        g.rod([0.5, 1.0, zb + 0.38], [0.8, 1.0, zb + 0.38], 0.01, steel);
        for (let i = 0; i < 5 + Math.floor(mood.density * 5); i++) { const tool = g.box([0.2 + random() * 0.15, 0.02, 0.035], [-0.75 + random() * 1.0, 0.9, zb - 0.15 + random() * 0.35], random() < 0.5 ? steel : g.material('#b3432c')); tool.rotation.y = random() * 3; }
        g.cylinder(0.09, 0.09, 0.2, [-0.75, 0.99, zb - 0.15], g.material('#b9a23a', { metalness: 0.5 }), 10);
        g.cylinder(0.17, 0.17, 0.45, [0.2, 0.225, 2.25], wood, 10);
        g.box([0.5, 0.3, 0.3], [-0.5, 0.48, zb], g.material('#8a2f2a', { metalness: 0.3 }));
      } else {
        const rubber = g.material('#1e1e20', { roughness: 0.95 });
        for (let i = 0; i < 4 + Math.floor(mood.density * 2); i++) { const tyre = g.ring(0.25, 0.09, [-0.7 + (random() - 0.5) * 0.06, 0.12 + i * 0.185, 1.85], rubber); tyre.rotation.x = Math.PI / 2; }
        for (const [dx, c] of [[0, '#c9302b'], [0.1, '#2f62ad']] as const) g.rod([0.95 + dx, 0.03, 1.9], [1.12 + dx, 1.8, 1.2], 0.022, g.material(c)).scale.x = 2;
        const wheel = g.ring(0.31, 0.014, [0.25, 0.36, 1.75], g.material('#b9bec0', { metalness: 0.8 })); wheel.rotation.y = 0.5; wheel.rotation.x = -0.15;
        for (const [x, y, z, w] of [[0.2, 0.2, 1.2, 0.5], [0.3, 0.55, 1.2, 0.42], [-0.2, 0.17, 2.2, 0.36]] as const) g.box([w, w * 0.75, w * 0.8], [x, y, z], g.material('#a88a5c', { roughness: 1 })).rotation.y = (random() - 0.5) * 0.4;
        const sled = g.box([0.36, 0.03, 0.8], [0.75, 0.5, 2.05], g.material('#b98845')); sled.rotation.x = -1.2;
      }
    };

    const pair = a.row === 'pair';
    const others = (Object.keys(COLOURS) as (keyof typeof COLOURS)[]).filter((k) => k !== a.paint);
    shell(pair ? -1.42 : 0, a.paint, a.door, a.marking, true);
    if (pair) shell(1.42, others[Math.floor(random() * others.length)], 'locked', 'number', false);
    const cx = pair ? -1.42 : 0;

    // Outside by the door.
    const ox = cx - HALF - 0.5, oz = 2.0;
    if (a.outside === 'stool') {
      const wood = s.material('#7a5c3a', { roughness: 1 });
      s.box([0.34, 0.04, 0.34], [ox, 0.32, oz], wood);
      for (const x of [-0.13, 0.13]) for (const z of [-0.13, 0.13]) s.rod([ox + x * 1.2, 0, oz + z * 1.2], [ox + x, 0.3, oz + z], 0.018, wood);
      s.box([0.5, 0.008, 0.36], [ox + 0.55, 0.3, oz + 0.1], s.material('#dcd7c6', { roughness: 1 })).rotation.y = 0.3;
      s.box([0.5, 0.3, 0.36], [ox + 0.55, 0.15, oz + 0.1], s.material('#a88a5c', { roughness: 1 })).rotation.y = 0.3;
      s.lathe([[0, 0], [0.036, 0], [0.036, 0.16], [0.014, 0.23], [0.014, 0.29], [0, 0.29]], new THREE.MeshStandardMaterial({ color: '#e4efe9', roughness: 0.1, metalness: 0.3 }), [ox + 0.5, 0.305, oz + 0.12]);
      for (const dx of [0.12, 0.2]) s.cylinder(0.03, 0.025, 0.08, [ox + 0.5 + dx, 0.345, oz + 0.02 + dx * 0.6], new THREE.MeshStandardMaterial({ color: '#cfe0dd', roughness: 0.1, metalness: 0.3 }), 8);
    } else if (a.outside === 'tyres') {
      const rubber = s.material('#1e1e20', { roughness: 0.95 });
      for (let i = 0; i < 3 + Math.floor(mood.density * 3); i++) { const tyre = s.ring(0.25, 0.09, [ox + (random() - 0.5) * 0.08, 0.09 + i * 0.185, oz - 0.4 + (random() - 0.5) * 0.08], rubber); tyre.rotation.x = Math.PI / 2; }
    } else if (a.outside === 'shovel') {
      s.rod([ox + 0.1, 0.25, oz - 0.2], [ox + 0.45, 1.5, oz - 1.0], 0.018, s.material('#b98845'));
      s.box([0.42, 0.5, 0.02], [ox + 0.05, 0.25, oz - 0.1], s.material('#b9bec0', { metalness: 0.6 })).rotation.x = -0.5;
      s.cylinder(0.16, 0.13, 0.28, [ox - 0.2, 0.14, oz + 0.3], s.material('#7d8587', { metalness: 0.6 }), 12);
      s.cylinder(0.15, 0.15, 0.02, [ox - 0.2, 0.26, oz + 0.3], s.material('#c9a877', { roughness: 1 }), 12);
    } else if (a.outside === 'barrel') {
      s.cylinder(0.3, 0.3, 0.85, [ox + 0.1, 0.425, oz - 1.0], s.material('#3f5f8a', { metalness: 0.4 }), 16);
      for (const y of [0.25, 0.6]) s.ring(0.305, 0.012, [ox + 0.1, y, oz - 1.0], s.material('#2c4467', { metalness: 0.4 })).rotation.x = Math.PI / 2;
      s.cylinder(0.28, 0.28, 0.01, [ox + 0.1, 0.83, oz - 1.0], new THREE.MeshStandardMaterial({ color: '#3d4a52', roughness: 0.05, metalness: 0.5 }), 16);
      s.tube([[cx - HALF - 0.02, 1.75, oz - 1.4], [ox + 0.25, 1.5, oz - 1.2], [ox + 0.12, 1.0, oz - 1.02]], 0.035, s.material('#8f9698', { metalness: 0.6 }));
    }

    // Ground: a concrete pad with weeds or snow at the edges.
    const width = pair ? 6.3 : 3.9;
    const groundColour = new THREE.Color('#827e75').lerp(new THREE.Color('#e3e7ea'), Math.min(1, a.snow * 1.15));
    s.box([width, 0.05, 5.4], [pair ? -0.2 : -0.35, -0.025, 0.3], new THREE.MeshStandardMaterial({ color: groundColour, roughness: 1 }));
    if (a.snow > 0.55) for (let i = 0; i < 5; i++) s.ball([0.5 + random() * 0.3, 0.14, 0.4], [(pair ? 0 : -0.3) + (random() - 0.5) * (width - 1), 0, random() < 0.5 ? -2.2 : 2.6 + random() * 0.2], snowMat, 10);
    else {
      const tufts: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 30 + mood.wear * 50; i++) { const sideX = (random() < 0.5 ? -1 : 1) * (HALF + 0.08 + random() * 0.15); tufts.push({ at: [cx + sideX + (pair && sideX > 0 ? 2.84 : 0), 0.05, Z0 + random() * 4.2], size: 0.05 + random() * 0.07, color: random() < 0.6 ? '#5f7a3a' : '#8a8a4a' }); }
      const blade = new THREE.ConeGeometry(0.5, 2.2, 4);
      s.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    }
    return s.finish();
  },
});
