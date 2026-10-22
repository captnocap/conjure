import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const SIDINGS = {
  white: { wall: '#e6e4dc', trim: '#8f9496', band: '' },
  beige: { wall: '#cdbd9c', trim: '#6b4f3a', band: '#6b4f3a' },
  turquoise: { wall: '#eeeadb', trim: '#3fa39b', band: '#3fa39b' },
  lodge: { wall: '#9aa1a3', trim: '#3f4648', band: '#e3b81f' },
} as const;

export default defineThing({
  questions: {
    state: choice('What is the state of the trailer?', {
      occupied: 'Occupied: a crew lives here between shifts.',
      forsale: 'Empty with a FOR RENT sign out front, the boom price still on it.',
      gutted: 'Gutted: windows broken or boarded, the door hanging, skirting gone, insulation spilling out.',
      delivered: 'Just delivered: still on its wheels with the tow hitch on, steps not built yet.',
    }),
    windows: choice('If anyone is home, what do the windows show?', {
      dark: 'All dark: everyone is on tour or asleep.',
      one: 'One window lit warm yellow.',
      tv: 'One window flickering television blue.',
      all: 'Every window lit, shift change.',
    }),
    outside: choice('What hangs or stands outside?', {
      nothing: 'Nothing at all.',
      laundry: 'A line of coveralls and work shirts drying.',
      flag: 'A Texas flag on a pole by the door.',
      chime: 'A wind chime under the eave.',
      grill: 'A kettle grill, a camp chair and a cooler.',
      lights: 'A string of coloured bulbs along the eave, left up since Christmas.',
    }),
    siding: choice('What is the trailer clad in?', {
      white: 'Ribbed white steel, anonymous and rented by the week.',
      beige: 'Beige vinyl with brown trim, a family model put to other use.',
      turquoise: 'Cream aluminium with a turquoise stripe, a 1960s survivor.',
      lodge: 'Grey modular lodge panels with a yellow stripe and a stencilled unit number.',
    }),
    steps: choice('How do you get to the door?', {
      pallet: 'Rough steps knocked together from pallet wood.',
      metal: 'Folding metal steps.',
      deck: 'A small plank deck with a rail, big enough for one chair.',
      blocks: 'A wobbling stack of cinder blocks.',
    }),
    footing: choice('What is underneath?', {
      blocks: 'Bare cinder-block piers, daylight showing under the floor.',
      skirt: 'Ribbed skirting all round, a few panels missing.',
      lattice: 'Plywood sheets leaned against the gap.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const siding = SIDINGS[a.siding];
    const gutted = a.state === 'gutted', delivered = a.state === 'delivered', home = a.state === 'occupied';
    const grime = Math.min(1, mood.wear * 0.7 + (gutted ? 0.5 : delivered ? -0.3 : 0.1));
    const L = 11, D = 3.3, x0 = -L / 2, floor = delivered ? 0.95 : 0.8, wallTop = floor + 2.55;
    const wallColour = new THREE.Color(siding.wall).lerp(new THREE.Color('#9a8c74'), Math.max(0, grime) * 0.3);
    const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(siding.trim).lerp(new THREE.Color('#7d6d58'), Math.max(0, grime) * 0.3), roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: '#232425', roughness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: '#8d9294', roughness: 0.5, metalness: 0.6 });
    const timber = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b08e5e').lerp(new THREE.Color('#857c6f'), mood.wear * 0.6), roughness: 0.95 });
    const block = new THREE.MeshStandardMaterial({ color: '#a3a39c', roughness: 1 });
    const into = <T extends THREE.Object3D>(group: THREE.Object3D, node: T) => { group.add(node); return node; };

    // Siding: ribs, a colour band, streaks under the roof edge and dirt splashed up from the ground.
    const paintWall = (length: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + wallColour.getHexString(); ctx.fillRect(0, 0, 1024, 256);
      const ribs = Math.round(length / 0.22);
      for (let i = 0; i < ribs; i++) { const x = i / ribs * 1024; ctx.fillStyle = 'rgba(0,0,0,0.13)'; ctx.fillRect(x, 0, 2, 256); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 3, 0, 2, 256); }
      if (siding.band) { ctx.fillStyle = siding.band; ctx.globalAlpha = 0.92; ctx.fillRect(0, a.siding === 'beige' ? 214 : 150, 1024, a.siding === 'beige' ? 42 : 26); ctx.globalAlpha = 1; }
      const streaks = Math.round(Math.max(0, grime) * 46);
      for (let i = 0; i < streaks; i++) {
        const x = random() * 1024, long = 40 + random() * 200, run = ctx.createLinearGradient(0, 0, 0, long);
        run.addColorStop(0, `rgba(${random() < 0.5 ? '96,62,38' : '60,58,52'},0.6)`); run.addColorStop(1, 'rgba(96,62,38,0)');
        ctx.fillStyle = run; ctx.fillRect(x, 0, 3 + random() * 9, long);
      }
      const dirt = ctx.createLinearGradient(0, 256, 0, 170);
      dirt.addColorStop(0, `rgba(134,104,70,${0.25 + Math.max(0, grime) * 0.55})`); dirt.addColorStop(1, 'rgba(134,104,70,0)');
      ctx.fillStyle = dirt; ctx.fillRect(0, 170, 1024, 86);
      if (gutted) for (let i = 0; i < 5; i++) { ctx.strokeStyle = ['#2a2a2a', '#b3261f', '#2f5fa5'][i % 3]; ctx.lineWidth = 6; ctx.beginPath(); const x = 80 + random() * 860, y = 120 + random() * 80; ctx.moveTo(x, y); for (let k = 0; k < 5; k++) ctx.lineTo(x + (k + 1) * 14, y + (k % 2 ? -1 : 1) * (10 + random() * 26)); ctx.stroke(); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.75, metalness: 0.1 });
    };
    const long = paintWall(L), short = paintWall(D), plain = new THREE.MeshStandardMaterial({ color: wallColour, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(L, wallTop - floor, D), [short, short, plain, dark, long, long]);
    body.position.set(0, (wallTop + floor) / 2, 0);
    body.castShadow = body.receiveShadow = true;
    s.root.add(body);
    // Roof: a shallow bowed cap with an overhang, vents and a stain or two.
    const roofPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9cccb').lerp(new THREE.Color('#8a7a62'), Math.max(0, grime) * 0.45), roughness: 0.6, metalness: 0.3 });
    const cap = s.cylinder(D / 2 + 0.12, D / 2 + 0.12, L + 0.2, [0, wallTop, 0], roofPaint, 20);
    cap.rotation.z = Math.PI / 2; cap.scale.set(0.13, 1, 1);
    s.box([L + 0.24, 0.07, D + 0.24], [0, wallTop + 0.01, 0], trim);
    for (const x of [-2.6, 2.2]) { s.cylinder(0.09, 0.09, 0.35, [x, wallTop + 0.3, -0.5], steel, 8); s.cylinder(0.16, 0.16, 0.04, [x, wallTop + 0.48, -0.5], steel, 10); }

    // Chassis, piers, wheels and hitch.
    for (const z of [-0.8, 0.8]) s.box([L - 0.3, 0.22, 0.1], [0, floor - 0.11, z], dark);
    const pier = (x: number, z: number) => {
      const courses = Math.floor((floor - 0.24) / 0.2);
      for (let i = 0; i < courses; i++) { const stone = s.box([0.4, 0.19, 0.2], [x, 0.1 + i * 0.2, z], block); stone.rotation.y = (i % 2) * Math.PI / 2 + (random() - 0.5) * 0.12; }
      s.box([0.36, 0.05, 0.3], [x, courses * 0.2 + 0.03, z], timber);
    };
    if (!delivered) for (let i = 0; i < 5; i++) for (const z of [-0.8, 0.8]) pier(x0 + 0.8 + i * (L - 1.6) / 4, z);
    if (delivered || a.footing === 'blocks' || gutted) for (const x of [0.3, 1.2]) for (const z of [-1.25, 1.25]) {
      const flatTyre = !delivered;
      const tyre = s.cylinder(0.36, 0.36, 0.22, [x, flatTyre ? 0.3 : 0.36, z], dark, 16);
      tyre.rotation.x = Math.PI / 2;
      if (flatTyre) tyre.scale.set(1, 1, 0.82);
      s.cylinder(0.17, 0.17, 0.24, [x, flatTyre ? 0.3 : 0.36, z], steel, 10).rotation.x = Math.PI / 2;
    }
    if (delivered || (a.footing === 'blocks' && random() < 0.6)) {
      for (const z of [-0.8, 0.8]) s.rod([L / 2 - 0.2, floor - 0.12, z], [L / 2 + 1.5, floor - 0.2, 0], 0.05, dark);
      s.cylinder(0.05, 0.05, floor - 0.1, [L / 2 + 1.35, (floor - 0.1) / 2, 0], steel, 8);
      s.box([0.2, 0.05, 0.2], [L / 2 + 1.35, 0.03, 0], steel);
      s.ball([0.07, 0.07, 0.07], [L / 2 + 1.55, floor - 0.18, 0], steel, 8);
    }
    if (!delivered && !gutted && a.footing !== 'blocks') {
      const skirtPaint = a.footing === 'skirt' ? new THREE.MeshStandardMaterial({ color: wallColour.clone().multiplyScalar(0.86), roughness: 0.85 }) : new THREE.MeshStandardMaterial({ color: '#b69a69', roughness: 1 });
      const panels = Math.round(L / 1.22);
      for (let i = 0; i < panels; i++) for (const side of [-1, 1]) {
        if (random() < 0.08 + mood.wear * 0.25) continue;
        const panel = s.box([L / panels - 0.02, floor, 0.03], [x0 + (i + 0.5) * L / panels, floor / 2, side * (D / 2 - 0.04)], skirtPaint);
        if (a.footing === 'lattice') { panel.rotation.x = side * -0.16; panel.position.z += side * 0.12; panel.rotation.z = (random() - 0.5) * 0.06; }
      }
      for (const side of [-1, 1]) if (random() > mood.wear * 0.3) s.box([0.03, floor, D - 0.1], [side * (L / 2 - 0.04), floor / 2, 0], skirtPaint);
    }

    // Windows, door and the air conditioner.
    const front = D / 2;
    const litSet = new Set<number>();
    if (home) {
      if (a.windows === 'all') [0, 1, 2, 3].forEach((i) => litSet.add(i));
      if (a.windows === 'one') litSet.add(Math.floor(random() * 3));
    }
    const tvIndex = home && a.windows === 'tv' ? 1 : -1;
    const glow = 0.9 + Math.abs(mood.daylight - 0.5) * 2.4;
    const warmGlass = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: new THREE.Color().setHSL(mix(0.14, 0.09, mood.warmth), 0.9, 0.6), emissiveIntensity: glow, roughness: 0.4 });
    const tvGlass = new THREE.MeshStandardMaterial({ color: '#9cc4ff', emissive: '#5a9bff', emissiveIntensity: glow, roughness: 0.4 });
    const darkGlass = new THREE.MeshStandardMaterial({ color: '#27323a', roughness: 0.15, metalness: 0.4 });
    const hole = new THREE.MeshStandardMaterial({ color: '#121110', roughness: 1 });
    const ply = new THREE.MeshStandardMaterial({ color: '#b3925d', roughness: 1 });
    const blind = new THREE.MeshStandardMaterial({ color: '#e9e4d4', roughness: 0.9 });
    const windowAt = (index: number, x: number, wide: number, tall: number, side: 'front' | 'end' = 'front') => {
      const group = into(s.root, new THREE.Group());
      if (side === 'front') group.position.set(x, floor + 1.55, front + 0.02); else { group.position.set(L / 2 + 0.02, floor + 1.55, x); group.rotation.y = Math.PI / 2; }
      into(group, s.box([wide + 0.14, tall + 0.14, 0.05], [0, 0, 0], trim));
      const boarded = gutted && random() < 0.45;
      const pane = gutted ? hole : index === tvIndex ? tvGlass : litSet.has(index) ? warmGlass : darkGlass;
      into(group, s.box([wide, tall, 0.06], [0, 0, 0.005], pane));
      into(group, s.box([0.04, tall, 0.07], [0, 0, 0.01], trim));
      if (boarded) { const board = into(group, s.box([wide + 0.2, tall + 0.1, 0.03], [0, 0, 0.05], ply)); board.rotation.z = (random() - 0.5) * 0.12; }
      else if (gutted) for (let i = 0; i < 3; i++) { const shard = into(group, s.mesh(new THREE.ConeGeometry(0.1, 0.3 + random() * 0.25, 3), darkGlass, [(random() - 0.5) * wide * 0.8, -tall / 2 + 0.15, 0.04])); shard.scale.z = 0.1; }
      else if (a.state !== 'forsale' && !delivered) into(group, s.box([wide, tall * mix(0.25, 0.6, random()), 0.065], [0, tall * 0.28, 0.008], blind)).position.y = tall / 2 - tall * mix(0.12, 0.3, random());
      return group;
    };
    windowAt(0, -4.0, 1.0, 0.9);
    const tvWindow = windowAt(1, 1.2, 1.5, 1.0);
    windowAt(2, 4.0, 1.0, 0.9);
    windowAt(3, 0.2, 0.9, 0.8, 'end');
    void tvWindow;
    // Air conditioner hanging out of the first window.
    if (!gutted) {
      const ac = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d8d6cc').lerp(new THREE.Color('#8f7b5e'), Math.max(0, grime) * 0.4), roughness: 0.7 });
      s.box([0.66, 0.42, 0.5], [-4.0, floor + 1.32, front + 0.24], ac);
      for (let i = 0; i < 5; i++) s.box([0.56, 0.02, 0.02], [-4.0, floor + 1.18 + i * 0.07, front + 0.495], dark);
      s.rod([-4.25, floor + 1.1, front + 0.45], [-4.25, floor + 0.7, front + 0.02], 0.015, steel);
      const drip = s.box([0.16, 0.9, 0.012], [-3.9, floor + 0.62, front + 0.012], new THREE.MeshStandardMaterial({ color: '#6f5a40', roughness: 1 }));
      drip.castShadow = false;
    } else s.box([0.7, 0.46, 0.04], [-4.0, floor + 1.32, front + 0.03], hole);
    // Door.
    const doorX = -1.5;
    s.box([1.02, 2.1, 0.05], [doorX, floor + 1.05, front + 0.02], trim);
    const doorLeaf = into(s.root, new THREE.Group());
    doorLeaf.position.set(doorX - 0.45, floor, front + 0.05);
    const doorPaint = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.siding === 'turquoise' ? '#3fa39b' : a.siding === 'lodge' ? '#3f4648' : '#f0eee6').lerp(new THREE.Color('#9a8c74'), Math.max(0, grime) * 0.4), roughness: 0.7 });
    into(doorLeaf, s.box([0.9, 2.0, 0.05], [0.45, 1.0, 0], doorPaint));
    into(doorLeaf, s.box([0.32, 0.42, 0.06], [0.45, 1.45, 0.005], gutted ? hole : litSet.size || tvIndex >= 0 ? warmGlass : darkGlass));
    into(doorLeaf, s.ball([0.04, 0.04, 0.04], [0.8, 1.0, 0.05], steel, 8));
    if (gutted) { s.box([0.9, 2.0, 0.03], [doorX, floor + 1.0, front + 0.03], hole); doorLeaf.rotation.y = -1.9; doorLeaf.rotation.z = -0.07; }
    // Porch light.
    s.box([0.12, 0.16, 0.1], [doorX + 0.75, floor + 2.05, front + 0.07], new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffd88a', emissiveIntensity: home ? glow * 0.9 : 0, roughness: 0.4 }));
    if (a.siding === 'lodge') s.label(`${'ABCD'[Math.floor(random() * 4)]}-${10 + Math.floor(random() * 80)}`, 1.0, 0.5, [-2.75, floor + 1.95, front + 0.02], '#f0eee6', '#' + wallColour.getHexString());

    // Satellite dish on the roof corner, pointed at the southern sky.
    {
      const dish = into(s.root, new THREE.Group());
      dish.position.set(L / 2 - 0.9, wallTop + 0.15, 0.9);
      into(dish, s.cylinder(0.03, 0.03, 0.7, [0, 0.35, 0], steel, 6));
      const bowl = new THREE.Group();
      bowl.position.set(0, 0.75, 0.05);
      into(bowl, s.mesh(new THREE.SphereGeometry(0.75, 20, 8, 0, Math.PI * 2, 0, 0.62), new THREE.MeshStandardMaterial({ color: '#c9cccb', roughness: 0.5, side: THREE.DoubleSide }), [0, -0.68, 0])).scale.set(1, 1, 1.15);
      into(bowl, s.rod([0, 0.05, 0.42], [0, -0.38, 0.02], 0.014, steel));
      into(bowl, s.box([0.07, 0.07, 0.12], [0, -0.38, 0.02], dark));
      bowl.rotation.set(Math.PI + 0.95, random() * 0.8 - 0.4, 0);
      dish.add(bowl);
      if (gutted) { dish.rotation.z = -1.6; dish.position.set(L / 2 + 0.1, wallTop - 0.3, 0.9); }
      s.tube([[L / 2 - 0.9, wallTop + 0.15, 0.9], [L / 2 - 0.4, wallTop + 0.12, 1.3], [L / 2 - 0.3, wallTop - 0.1, front + 0.03], [L / 2 - 0.3, floor + 0.3, front + 0.03]], 0.012, dark);
    }

    // Steps and the boots.
    let landing: [number, number, number] = [doorX, 0, front + 1.3];
    if (!delivered) {
      if (a.steps === 'pallet') {
        const rise = floor / 4;
        for (let i = 0; i < 4; i++) { const step = s.box([1.15, 0.05, 0.32], [doorX, floor - i * rise - 0.03, front + 0.2 + i * 0.3], timber); step.rotation.z = (random() - 0.5) * 0.04 * (1 + mood.wear * 2); }
        for (const side of [-1, 1]) { s.box([0.05, floor, 1.2], [doorX + side * 0.55, floor / 2 - 0.05, front + 0.62], timber).rotation.x = 0; s.rod([doorX + side * 0.56, 0, front + 1.2], [doorX + side * 0.56, floor + 0.9, front + 0.1], 0.03, timber); }
        landing = [doorX + 0.25, floor - 0.005, front + 0.2];
      }
      if (a.steps === 'metal') {
        for (let i = 0; i < 3; i++) s.box([0.9, 0.03, 0.26], [doorX, floor - (i + 0.2) * floor / 3, front + 0.16 + i * 0.26], steel);
        for (const side of [-1, 1]) { s.rod([doorX + side * 0.46, floor, front + 0.04], [doorX + side * 0.46, 0, front + 0.9], 0.02, steel); s.rod([doorX + side * 0.46, floor + 0.85, front + 0.06], [doorX + side * 0.46, 0.75, front + 0.9], 0.016, steel); s.rod([doorX + side * 0.46, 0, front + 0.9], [doorX + side * 0.46, 0.75, front + 0.9], 0.016, steel); }
        landing = [doorX + 0.75, 0, front + 0.5];
      }
      if (a.steps === 'deck') {
        s.box([2.6, 0.08, 1.7], [doorX + 0.5, floor - 0.04, front + 0.87], timber);
        for (let i = 0; i < 9; i++) s.box([0.02, 0.085, 1.7], [doorX - 0.75 + i * 0.3, floor - 0.04, front + 0.87], dark);
        for (const [x, z] of [[-0.75, 1.65], [1.75, 1.65], [1.75, 0.15], [-0.75, 0.15]] as const) s.box([0.09, floor + (z > 1 || x > 1 ? 0.95 : 0), 0.09], [doorX + x, (floor + (z > 1 || x > 1 ? 0.95 : 0)) / 2, front + z], timber);
        s.rod([doorX + 1.75, floor + 0.9, front + 0.15], [doorX + 1.75, floor + 0.9, front + 1.65], 0.04, timber);
        s.rod([doorX + 0.4, floor + 0.9, front + 1.65], [doorX + 1.75, floor + 0.9, front + 1.65], 0.04, timber);
        for (let i = 0; i < 3; i++) s.box([0.9, 0.05, 0.3], [doorX - 0.25, floor - (i + 1) * floor / 4, front + 1.85 + i * 0.3], timber);
        const web = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#3f8fbf' : '#77807c', roughness: 0.9 });
        s.box([0.5, 0.03, 0.46], [doorX + 1.25, floor + 0.42, front + 0.8], web);
        s.box([0.5, 0.5, 0.03], [doorX + 1.25, floor + 0.7, front + 0.55], web).rotation.x = -0.2;
        for (const side of [-1, 1]) { s.rod([doorX + 1.25 + side * 0.25, floor, front + 1.02], [doorX + 1.25 + side * 0.25, floor + 0.62, front + 0.6], 0.014, steel); s.rod([doorX + 1.25 + side * 0.25, floor, front + 0.58], [doorX + 1.25 + side * 0.25, floor + 0.45, front + 1.0], 0.014, steel); }
        s.cylinder(0.06, 0.06, 0.14, [doorX + 0.85, floor + 0.07, front + 0.95], new THREE.MeshStandardMaterial({ color: '#b3261f', metalness: 0.4, roughness: 0.5 }), 10);
        landing = [doorX + 0.55, floor, front + 0.25];
      }
      if (a.steps === 'blocks') {
        for (let i = 0; i < 3; i++) for (let k = 0; k < 3 - i; k++) { const stone = s.box([0.4, 0.2, 0.2], [doorX + (random() - 0.5) * 0.05, 0.1 + k * 0.2, front + 0.14 + i * 0.22], block); stone.rotation.y = (random() - 0.5) * 0.1; }
        s.box([0.4, 0.2, 0.2], [doorX + 0.42, 0.1, front + 0.2], block);
        landing = [doorX + 0.85, 0, front + 0.35];
      }
    }
    if (a.state !== 'forsale' && !delivered) {
      const leather = new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a4526').lerp(new THREE.Color('#9a8263'), 0.25 + mood.wear * 0.4), roughness: 1 });
      const pairs = gutted ? 1 : a.windows === 'all' ? 3 : 1 + Math.floor(random() * 2);
      for (let p = 0; p < pairs; p++) for (const k of gutted ? [0] : [0, 1]) {
        const boot = into(s.root, new THREE.Group());
        boot.position.set(landing[0] + p * 0.34 + k * 0.15, landing[1], landing[2] + (random() - 0.5) * 0.08 + p * 0.03);
        boot.rotation.y = (random() - 0.5) * 0.7;
        into(boot, s.cylinder(0.065, 0.055, 0.3, [0, 0.19, -0.03], leather, 8));
        into(boot, s.box([0.11, 0.085, 0.28], [0, 0.043, 0.05], leather));
        into(boot, s.box([0.115, 0.02, 0.29], [0, 0.01, 0.05], dark));
        if (gutted || (k === 1 && random() < 0.3)) { boot.rotation.z = Math.PI / 2; boot.position.y += 0.06; }
      }
    }

    // Outside.
    const flapping: { node: THREE.Object3D; phase: number; amount: number }[] = [];
    const bulbs: THREE.MeshStandardMaterial[] = [];
    if (a.outside === 'laundry') {
      const lx0 = 1.4, lx1 = 5.4, lz = front + 2.5, ly = 1.95;
      for (const x of [lx0, lx1]) { s.cylinder(0.035, 0.035, ly + 0.1, [x, (ly + 0.1) / 2, lz], steel, 6); s.box([0.05, 0.04, 0.7], [x, ly + 0.05, lz], steel); }
      s.tube([[lx0, ly, lz], [(lx0 + lx1) / 2, ly - 0.12, lz], [lx1, ly, lz]], 0.008, dark);
      const colours = ['#2e5f9e', '#c9712e', '#b9a27c', '#d9d6cc', '#8f2f2a', '#3f4a52'];
      let x = lx0 + 0.3;
      while (x < lx1 - 0.5) {
        const coverall = random() < 0.45, wide = coverall ? 0.55 : 0.4 + random() * 0.2, tall = coverall ? 1.35 : 0.5 + random() * 0.25;
        const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color(colours[Math.floor(random() * colours.length)]).lerp(new THREE.Color('#9a8c74'), mood.wear * 0.3), roughness: 1, side: THREE.DoubleSide });
        const item = into(s.root, new THREE.Group());
        const sagAt = ly - 0.12 * Math.sin((x + wide / 2 - lx0) / (lx1 - lx0) * Math.PI);
        item.position.set(x + wide / 2, sagAt, lz);
        if (coverall) {
          into(item, s.box([wide, 0.7, 0.02], [0, -0.35, 0], cloth));
          for (const side of [-1, 1]) { into(item, s.box([wide * 0.42, 0.68, 0.02], [side * wide * 0.27, -1.02, 0], cloth)); into(item, s.box([0.16, 0.5, 0.02], [side * (wide / 2 + 0.07), -0.3, 0], cloth)).rotation.z = side * 0.25; }
          into(item, s.box([wide * 0.9, 0.04, 0.025], [0, -0.42, 0], new THREE.MeshStandardMaterial({ color: '#d8dbd2', emissive: '#d8dbd2', emissiveIntensity: 0.15 })));
        } else into(item, s.box([wide, tall, 0.02], [0, -tall / 2, 0], cloth));
        flapping.push({ node: item, phase: random() * 6.28, amount: 0.25 });
        x += wide + 0.18 + random() * 0.2;
      }
    }
    if (a.outside === 'flag') {
      const canvas = document.createElement('canvas');
      canvas.width = 192; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f1efe8'; ctx.fillRect(0, 0, 192, 64); ctx.fillStyle = '#b3262c'; ctx.fillRect(0, 64, 192, 64); ctx.fillStyle = '#24418f'; ctx.fillRect(0, 0, 64, 128);
      ctx.fillStyle = '#f1efe8'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const radius = i % 2 ? 9 : 23, angle = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(32 + Math.cos(angle) * radius, 64 + Math.sin(angle) * radius); }
      ctx.fill();
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const pole = into(s.root, new THREE.Group());
      pole.position.set(doorX - 0.9, floor + 1.7, front + 0.03);
      pole.rotation.x = 0.75;
      into(pole, s.cylinder(0.02, 0.02, 1.9, [0, 0.95, 0], steel, 6));
      into(pole, s.ball([0.04, 0.04, 0.04], [0, 1.92, 0], new THREE.MeshStandardMaterial({ color: '#d9b23a', metalness: 0.7, roughness: 0.3 }), 8));
      const cloth = new THREE.PlaneGeometry(1.2, 0.8, 6, 1);
      cloth.translate(-0.6, 0, 0);
      const flag = into(pole, s.mesh(cloth, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [0, 1.45, 0]));
      flag.rotation.set(-0.75, 0, Math.PI / 2 + 0.25);
      flapping.push({ node: flag, phase: 0, amount: 0.12 });
    }
    if (a.outside === 'chime') {
      const cx = doorX + 1.6, cy = wallTop - 0.1, cz = front + 0.22;
      const chime = into(s.root, new THREE.Group());
      chime.position.set(cx, cy, cz);
      into(chime, s.rod([0, 0, 0], [0, -0.18, 0], 0.006, dark));
      into(chime, s.cylinder(0.13, 0.13, 0.025, [0, -0.19, 0], timber, 12));
      for (let i = 0; i < 5; i++) { const angle = i / 5 * 6.28, long = 0.35 + i * 0.09; into(chime, s.cylinder(0.018, 0.018, long, [Math.cos(angle) * 0.1, -0.22 - long / 2, Math.sin(angle) * 0.1], new THREE.MeshStandardMaterial({ color: '#d4d8da', metalness: 0.9, roughness: 0.2 }), 8)); }
      into(chime, s.rod([0, -0.2, 0], [0, -0.95, 0], 0.004, dark));
      into(chime, s.box([0.12, 0.2, 0.01], [0, -1.02, 0], timber));
      s.rod([cx, cy + 0.02, front], [cx, cy + 0.02, cz], 0.012, steel);
      flapping.push({ node: chime, phase: 1, amount: 0.18 });
    }
    if (a.outside === 'grill') {
      const gx = 3.2, gz = front + 1.9, enamel = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#a5261f' : '#1d1e20', roughness: 0.35, metalness: 0.3 });
      s.ball([0.3, 0.26, 0.3], [gx, 0.82, gz], enamel, 16);
      s.cylinder(0.31, 0.31, 0.02, [gx, 0.84, gz], steel, 16);
      for (let i = 0; i < 3; i++) { const angle = i * 2.1 + 0.4; s.rod([gx + Math.cos(angle) * 0.2, 0.65, gz + Math.sin(angle) * 0.2], [gx + Math.cos(angle) * 0.34, 0, gz + Math.sin(angle) * 0.34], 0.014, steel); }
      s.box([0.1, 0.03, 0.04], [gx, 1.09, gz], timber);
      const web = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#3f9a62' : '#7b8d86', roughness: 0.9 });
      const cx = gx - 1.2, cz = gz + 0.2;
      s.box([0.52, 0.03, 0.46], [cx, 0.42, cz], web);
      s.box([0.52, 0.5, 0.03], [cx, 0.7, cz - 0.27], web).rotation.x = -0.25;
      for (const side of [-1, 1]) { s.rod([cx + side * 0.26, 0, cz + 0.25], [cx + side * 0.26, 0.62, cz - 0.2], 0.014, steel); s.rod([cx + side * 0.26, 0, cz - 0.25], [cx + side * 0.26, 0.45, cz + 0.22], 0.014, steel); }
      s.box([0.55, 0.34, 0.34], [cx - 0.75, 0.17, cz + 0.1], new THREE.MeshStandardMaterial({ color: '#2f5fa5', roughness: 0.6 }));
      s.box([0.57, 0.06, 0.36], [cx - 0.75, 0.37, cz + 0.1], new THREE.MeshStandardMaterial({ color: '#f1efe8', roughness: 0.6 }));
    }
    if (a.outside === 'lights') {
      const colours = ['#ff4a3a', '#ffd23a', '#3ad16a', '#3a8bff', '#ff7ad1'];
      const count = 26;
      s.tube(Array.from({ length: 9 }, (_unused, i) => [x0 + 0.2 + i * (L - 0.4) / 8, wallTop - 0.08 - (i % 2) * 0.16, front + 0.14] as [number, number, number]), 0.008, dark);
      colours.forEach((hex, c) => {
        const material = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: home ? 1.6 : 0.1, roughness: 0.4 });
        bulbs.push(material);
        s.scatter(new THREE.SphereGeometry(0.055, 8, 6), material, Array.from({ length: count }, (_unused, i) => i).filter((i) => i % colours.length === c).map((i) => {
          const t = i / (count - 1) * 8, seg = Math.min(7, Math.floor(t)), f = t - seg;
          return { at: [x0 + 0.2 + t * (L - 0.4) / 8, wallTop - 0.08 - mix(seg % 2, (seg + 1) % 2, f) * 0.16 - 0.06, front + 0.14] as [number, number, number], size: 1 };
        }));
      });
    }

    // State dressing and yard clutter.
    if (a.state === 'forsale') {
      const sx = 3.4, sz = front + 2.2;
      for (const d of [-0.55, 0.55]) s.cylinder(0.035, 0.035, 1.5, [sx + d, 0.75, sz], timber, 6);
      const sign = s.label('FOR RENT', 1.3, 0.5, [sx, 1.25, sz + 0.03], '#f4f0e2', '#b3261f');
      sign.rotation.z = (random() - 0.5) * 0.08;
      s.label(`$${[1800, 2400, 3200][Math.floor(random() * 3)]} / MO`, 1.3, 0.34, [sx, 0.8, sz + 0.03], '#1d1d1d', '#f4f0e2').rotation.z = (random() - 0.5) * 0.12;
      s.box([0.1, 0.14, 0.05], [doorX + 0.35, floor + 0.95, front + 0.1], steel);
    }
    if (gutted) {
      const pink = new THREE.MeshStandardMaterial({ color: '#e3a1a8', roughness: 1, flatShading: true });
      for (let i = 0; i < 6; i++) { const lump = s.mesh(new THREE.IcosahedronGeometry(0.3 + random() * 0.3, 1), pink, [mix(x0 + 1, L / 2 - 1, random()), 0.12 + random() * 0.1, front + 0.2 + random() * 1.2]); lump.scale.y = 0.45; lump.rotation.y = random() * 3; }
      for (let i = 0; i < 4; i++) { const sheet = s.box([1.2, 0.03, 0.7 + random() * 0.6], [mix(x0 + 1, L / 2 - 1, random()), 0.04 + i * 0.02, front + 0.9 + random() * 1.6], i % 2 ? ply : plain); sheet.rotation.y = random() * 3; }
      const sag = s.box([2.4, 0.03, 0.9], [2.6, floor + 0.35, front + 0.25], long); sag.rotation.x = 0.9;
    }
    if (delivered) {
      s.label('OVERSIZE LOAD', 2.4, 0.42, [x0 - 0.03, floor + 0.8, 0], '#1d1d1d', '#e9c62a').rotation.y = -Math.PI / 2;
      for (const z of [-1.2, 1.2]) s.box([0.05, 0.4, 0.5], [x0 - 0.03, floor + 1.7, z], new THREE.MeshStandardMaterial({ color: '#d3241c', roughness: 0.9 }));
    }
    const clutter = gutted || delivered ? 0 : Math.round(mood.density * 5);
    for (const x of clutter > 0 ? [-L / 2 - 0.35] : []) for (const z of [0.5, 1.0]) { s.cylinder(0.16, 0.16, 0.95, [x, 0.5, z - 0.3], new THREE.MeshStandardMaterial({ color: '#e9e7df', roughness: 0.5 }), 12); s.ball([0.16, 0.12, 0.16], [x, 0.98, z - 0.3], new THREE.MeshStandardMaterial({ color: '#e9e7df', roughness: 0.5 }), 10); s.cylinder(0.05, 0.05, 0.1, [x, 1.12, z - 0.3], steel, 8); }
    for (let i = 1; i < clutter; i++) {
      const x = mix(1.5, L / 2 - 0.5, random()), z = front + 0.35 + random() * 0.5;
      if (i % 2) { const bag = s.mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: 0.4, flatShading: true }), [x, 0.2, z]); bag.scale.y = 0.8; }
      else { const tyre = s.ring(0.25, 0.1, [x, 0.1, z + 0.3], dark); tyre.rotation.x = Math.PI / 2; }
    }

    const rate = mix(0.6, 5, mood.energy), reach = mix(0.15, 1, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const item of flapping) item.node.rotation.x = (item.node.userData.base ??= item.node.rotation.x) + Math.sin(time * rate + item.phase) * item.amount * reach;
        if (tvIndex >= 0) tvGlass.emissiveIntensity = glow * (0.7 + 0.3 * Math.sin(time * 9.7) * Math.sin(time * 3.3) + (Math.sin(time * 23) > 0.9 ? 0.4 : 0));
        if (bulbs.length && home) bulbs.forEach((bulb, i) => { bulb.emissiveIntensity = 1.1 + 0.7 * Math.sin(time * rate * 0.6 + i * 1.3); });
      },
    });
  },
});
