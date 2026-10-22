import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Kind = 'ring' | 'clicker' | 'horseshoe' | 'stud';

export default defineThing({
  questions: {
    metal: choice('What are the pieces made of?', {
      steel: 'Bright surgical steel, cool and clinical.',
      gold: 'Warm yellow gold, some set with small stones.',
      rainbow: 'Anodised titanium in oil-slick rainbow: purple, teal, gold and pink.',
      bone: 'Carved bone and dark horn, matte and tribal.',
      black: 'Matte black with blood-red stones, goth and severe.',
      rose: 'Soft rose gold with opal and pearl, dainty and bridal.',
    }),
    dominant: choice('Which kind of piece dominates the tray?', {
      mixed: 'An even spread, one row of each kind.',
      ring: 'Plain seamless nose hoops, row after row.',
      clicker: 'Hinged septum clickers with ornamental fans along the bottom edge.',
      horseshoe: 'Open horseshoe bars with a ball on each end.',
      stud: 'Straight lip studs and labret bars lying in a line.',
    }),
    ornate: score('How ornate are the pieces?', ['Bare minimal wire', 'A bead or two', 'Jewelled', 'Dripping with filigree fans and stones']),
    lining: choice('What colour is the velvet lining?', {
      black: 'Black velvet, so the metal jumps out.',
      burgundy: 'Deep burgundy, an old jeweller.',
      royal: 'Royal blue, mall counter bright.',
      cream: 'Cream suede, boutique and pale.',
      emerald: 'Emerald green, a little theatrical.',
    }),
    frame: choice('What kind of tray is it?', {
      wood: 'A dark walnut shop tray with a mitred frame.',
      brass: 'A brass-rimmed case with a glass lid propped open behind it.',
      steel: 'A stainless surgical tray with a rolled rim.',
      plastic: 'A cheap pink plastic kiosk tray with a price sticker.',
    }),
    empty: noul('Is one slot conspicuously empty, its piece just taken?'),
    handled: choice('What state has the tray been left in?', {
      neat: 'Every piece squared up in its slot.',
      rummaged: 'Picked through: pieces knocked askew and a couple lying out of place.',
      tweezers: 'A pair of steel tweezers left lying across the corner, mid-selection.',
      tagged: 'Tiny handwritten price tags tied on here and there.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const into = <T extends THREE.Object3D>(g: THREE.Object3D, o: T) => { g.add(o); return o; };
    const W = 0.3, D = 0.2, tilt = 0.6;
    const bed = new THREE.Group();
    bed.rotation.x = tilt;
    bed.position.y = Math.sin(tilt) * D / 2 + 0.02;
    s.root.add(bed);

    const velvetColour = { black: '#17161a', burgundy: '#5c1226', royal: '#1d3aa3', cream: '#e6dcc4', emerald: '#0f5a3c' }[a.lining];
    const velvet = s.material(velvetColour, { roughness: 1 });
    const slit = s.material(new THREE.Color(velvetColour).multiplyScalar(a.lining === 'cream' ? 0.6 : 0.4), { roughness: 1 });
    const dent = s.material(new THREE.Color(velvetColour).lerp(new THREE.Color('#ffffff'), a.lining === 'cream' ? -0.25 : 0.28), { roughness: 1 });
    const frameMat = {
      wood: s.material('#4a2c1a', { roughness: 0.55 }),
      brass: s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 }),
      steel: s.material('#cfd5d8', { metalness: 0.9, roughness: 0.25 }),
      plastic: s.material('#ff7fb0', { roughness: 0.35 }),
    }[a.frame];

    // Tray body and rim.
    into(bed, s.mesh(new RoundedBoxGeometry(W + 0.03, 0.022, D + 0.03, 3, a.frame === 'wood' ? 0.004 : 0.01), frameMat, [0, -0.008, 0]));
    into(bed, s.box([W, 0.006, D], [0, 0.004, 0], velvet));
    const rimH = a.frame === 'steel' ? 0.012 : 0.018;
    for (const z of [-1, 1]) into(bed, s.mesh(new RoundedBoxGeometry(W + 0.03, rimH, 0.015, 2, 0.005), frameMat, [0, 0.006, z * (D / 2 + 0.0075)]));
    for (const x of [-1, 1]) into(bed, s.mesh(new RoundedBoxGeometry(0.015, rimH, D + 0.03, 2, 0.005), frameMat, [x * (W / 2 + 0.0075), 0.006, 0]));
    // Prop leg so it leans toward the customer.
    s.box([W * 0.7, Math.sin(tilt) * D * 0.82, 0.012], [0, Math.sin(tilt) * D * 0.41, -Math.cos(tilt) * D * 0.36], frameMat);
    if (a.frame === 'brass') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff3ff', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      const lid = new THREE.Group(); lid.position.set(0, 0.012, -D / 2 - 0.012); lid.rotation.x = -1.75 + random() * 0.2; bed.add(lid);
      into(lid, s.box([W, 0.003, D], [0, 0, D / 2], glass));
      for (const z of [0, D]) into(lid, s.box([W + 0.02, 0.008, 0.008], [0, 0, z], frameMat));
      for (const x of [-1, 1]) into(lid, s.box([0.008, 0.008, D], [x * (W / 2 + 0.006), 0, D / 2], frameMat));
    }
    if (a.frame === 'plastic') {
      const sticker = into(bed, s.label(mood.cheer > 0.5 ? '2 FOR $10' : '$4.99 EA', 0.09, 0.03, [W / 2 - 0.06, 0.0165, D / 2 + 0.0075], '#c2132f', '#fff36b'));
      sticker.rotation.x = -Math.PI / 2;
    }

    // Metals.
    const metalFor = (hue: number) => {
      switch (a.metal) {
        case 'steel': return s.material('#e3e8ec', { metalness: 0.95, roughness: 0.16, emissive: '#8fa3b5', emissiveIntensity: 0.25 });
        case 'gold': return s.material('#f3c33a', { metalness: 0.95, roughness: 0.2, emissive: '#c98400', emissiveIntensity: 0.4 });
        case 'rose': return s.material('#f0a58c', { metalness: 0.9, roughness: 0.22, emissive: '#c0604a', emissiveIntensity: 0.35 });
        case 'black': return s.material('#3a3b42', { metalness: 0.6, roughness: 0.45, emissive: '#5a5c6a', emissiveIntensity: 0.25 });
        case 'bone': return hue < 0.5 ? s.material('#efe4c8', { roughness: 0.8, emissive: '#b8a880', emissiveIntensity: 0.2 }) : s.material('#6a4424', { roughness: 0.55, emissive: '#3a2412', emissiveIntensity: 0.3 });
        default: {
          const c = new THREE.Color().setHSL([0.78, 0.5, 0.13, 0.92, 0.6, 0.33][Math.floor(hue * 6)], 0.9, 0.58);
          return s.material(c, { metalness: 0.85, roughness: 0.2, emissive: c, emissiveIntensity: 0.4 });
        }
      }
    };
    const metals = Array.from({ length: 6 }, (_u, i) => metalFor((i + 0.5) / 6));
    const gemColours = { steel: ['#bfe6ff', '#ffffff'], gold: ['#e0193a', '#18b56a', '#ffffff'], rainbow: ['#ffffff', '#9bf6ff'], bone: ['#27b7b0', '#d9482b'], black: ['#e01020'], rose: ['#f4fbff', '#bfe9e2', '#ffd9ec'] }[a.metal];
    const gemGlow = mix(0.5, 1.3, mood.cheer);
    const gems = gemColours.map((c) => s.material(c, { roughness: 0.08, emissive: c, emissiveIntensity: gemGlow }));
    const gemPoints: { at: [number, number, number]; size: number; color: string }[] = [];
    const lift = 0.0105;

    const piece = (kind: Kind, x: number, z: number, size: number, turn: number, flourish: number) => {
      const g = new THREE.Group();
      g.position.set(x, lift, z); g.rotation.y = turn; g.scale.setScalar(size); bed.add(g);
      const m = metals[Math.floor(random() * metals.length)];
      const r = 0.0085, t = 0.0011 + flourish * 0.0005;
      const world = (lx: number, lz: number, ly = 0): [number, number, number] => {
        const c = Math.cos(turn), sn = Math.sin(turn);
        return [x + (lx * c + lz * sn) * size, lift + ly * size, z + (-lx * sn + lz * c) * size];
      };
      const gem = (lx: number, lz: number, sz: number) => gemPoints.push({ at: world(lx, lz, 0.0008), size: sz * size, color: gemColours[Math.floor(random() * gemColours.length)] });
      const flat = (o: THREE.Mesh, rz = 0) => { o.rotation.set(-Math.PI / 2, 0, rz); return into(g, o); };
      if (kind === 'ring') {
        flat(s.ring(r, t, [0, 0, 0], m));
        if (flourish > 0.25) into(g, s.ball([t * 2.2, t * 2.2, t * 2.2], [0, 0, r], m, 10));
        if (flourish > 0.55) gem(0, r, 0.0019);
        if (flourish > 0.8) for (const k of [-1, 1]) gem(Math.sin(k * 0.5) * r, Math.cos(k * 0.5) * r, 0.0014);
      } else if (kind === 'horseshoe') {
        flat(s.ring(r, t * 1.15, [0, 0, 0], m, Math.PI * 1.5), Math.PI * 0.75);
        for (const k of [-1, 1]) {
          const bx = k * r * 0.707, bz = -r * 0.707;
          if (flourish > 0.6) into(g, s.rod([bx, 0, bz], [bx * 1.5, 0, bz * 1.9], t * 1.9, m, 0.0002));
          else into(g, s.ball([t * 2.6, t * 2.6, t * 2.6], [bx, 0, bz], m, 10));
          if (flourish > 0.4 && flourish <= 0.6) gem(bx, bz, 0.0017);
        }
        if (flourish > 0.8) gem(0, r, 0.002);
      } else if (kind === 'clicker') {
        flat(s.ring(r, t, [0, 0, 0], m, Math.PI * 1.36), Math.PI * 0.82);
        into(g, s.rod([-r * 0.86, 0, -r * 0.52], [r * 0.86, 0, -r * 0.52], t * 0.7, m));
        const beads = Math.round(flourish * 7);
        for (let i = 0; i < beads; i++) {
          const an = (i - (beads - 1) / 2) * 0.3;
          const rr = r + t * 2.4;
          if (flourish > 0.7) into(g, s.rod([Math.sin(an) * r, 0, Math.cos(an) * r], [Math.sin(an) * (r + 0.0045), 0, Math.cos(an) * (r + 0.0045)], t * 1.3, m, 0.0002));
          if (i % 2 === 0 || flourish < 0.7) gem(Math.sin(an) * rr, Math.cos(an) * rr, flourish > 0.4 ? 0.0015 : 0.001);
        }
        if (flourish > 0.85) flat(s.ring(r + 0.003, t * 0.6, [0, 0, 0], m, Math.PI * 0.7), Math.PI * 1.15);
      } else {
        into(g, s.rod([0, 0, -r * 0.9], [0, 0, r * 0.7], t * 0.95, m));
        into(g, s.cylinder(t * 3.6, t * 3.6, t * 0.9, [0, 0, -r * 0.9], m, 14)).rotation.x = Math.PI / 2;
        if (flourish > 0.7) into(g, s.rod([0, 0, r * 0.7], [0, 0, r * 1.5], t * 2.4, m, 0.0002));
        else into(g, s.ball([t * 2.8, t * 2.8, t * 2.8], [0, 0, r * 0.75], m, 10));
        if (flourish > 0.35 && flourish <= 0.7) gem(0, r * 0.75, 0.0022);
      }
    };

    // Rows.
    const cols = 7, rows = 4;
    const others: Kind[] = ['ring', 'clicker', 'horseshoe', 'stud'];
    const rowKinds: Kind[] = a.dominant === 'mixed' ? ['ring', 'clicker', 'horseshoe', 'stud']
      : [a.dominant, a.dominant, a.dominant, others.filter((k) => k !== a.dominant)[Math.floor(random() * 3)]];
    const heroKind: Kind = a.dominant === 'mixed' ? 'clicker' : a.dominant;
    const emptyAt = a.empty ? [random() < 0.5 ? 1 : 5, 1 + Math.floor(random() * 2)] : [-1, -1];
    const messy = a.handled === 'rummaged' ? 1 : 0.12 + mood.energy * 0.12;
    const strays: [number, number][] = [];
    const tagPoints: [number, number][] = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = (col - (cols - 1) / 2) * 0.039, z = (row - (rows - 1) / 2) * 0.044;
      const inHero = col === 3 && (row === 1 || row === 2);
      if (inHero) continue;
      into(bed, s.box([0.024, 0.002, 0.0022], [x, 0.0071, z + 0.012], slit));
      if (col === emptyAt[0] && row === emptyAt[1]) {
        const d = into(bed, s.ring(0.0085, 0.0011, [x, 0.0074, z], dent));
        d.rotation.x = -Math.PI / 2; d.scale.z = 0.3;
        continue;
      }
      if (random() > mix(0.72, 1.05, mood.density)) continue;
      if (a.handled === 'rummaged' && random() < 0.16) { strays.push([x, z]); continue; }
      const flourish = Math.min(1, Math.max(0, a.ornate + (random() - 0.5) * 0.3));
      piece(rowKinds[row], x + (random() - 0.5) * 0.006 * messy, z + (random() - 0.5) * 0.006 * messy, 1, (random() - 0.5) * 1.6 * messy, flourish);
      if (a.handled === 'tagged' && random() < 0.3) tagPoints.push([x, z]);
    }
    // The hero piece on a raised velvet pad.
    into(bed, s.mesh(new RoundedBoxGeometry(0.05, 0.006, 0.09, 2, 0.0028), dent, [0, 0.0085, 0]));
    const liftSave = lift;
    piece(heroKind, 0, heroKind === 'stud' ? 0 : -0.004, heroKind === 'stud' ? 2.6 : 2.15, 0, Math.min(1, a.ornate + 0.2));
    void liftSave;
    for (const [x, z] of strays) piece(rowKinds[Math.floor(random() * 4)], x + (random() - 0.5) * 0.03, z + 0.018 + random() * 0.012, 1, random() * 6.3, a.ornate);
    if (gemPoints.length) {
      const gm = into(bed, s.scatter(new THREE.IcosahedronGeometry(1, 1), gems[0], gemPoints.map((p) => ({ at: [p.at[0], p.at[1] + (p.at[0] === 0 ? 0.003 : 0), p.at[2]] as [number, number, number], size: p.size, color: p.color }))));
      (gm.material as THREE.MeshStandardMaterial).color.set('#ffffff');
      (gm.material as THREE.MeshStandardMaterial).emissive.set('#8899aa');
    }
    for (const [x, z] of tagPoints) {
      const tag = into(bed, s.box([0.012, 0.0006, 0.008], [x + 0.012, 0.0085, z - 0.014], s.material('#f6efd8')));
      tag.rotation.y = (random() - 0.5) * 1.2;
      into(bed, s.rod([x + 0.004, 0.0085, z - 0.006], [x + 0.01, 0.0085, z - 0.012], 0.0003, s.material('#b33')));
    }
    if (a.handled === 'tweezers') {
      const steel = s.material('#dfe5e8', { metalness: 0.95, roughness: 0.18 });
      const tz = new THREE.Group(); tz.position.set(W / 2 - 0.035, 0.022, D / 2 - 0.03); tz.rotation.y = 0.7 + random() * 0.5; bed.add(tz);
      for (const k of [-1, 1]) into(tz, s.rod([0, 0, -0.06], [k * 0.006, 0, 0.06], 0.0022, steel, 0.0007));
      into(tz, s.ball([0.004, 0.003, 0.004], [0, 0, -0.06], steel, 8));
    }

    // Front card naming the stock.
    const card = s.label({ steel: 'SURGICAL STEEL', gold: '14K GOLD', rainbow: 'TITANIUM', bone: 'BONE & HORN', black: 'BLACKLINE', rose: 'ROSE GOLD' }[a.metal], 0.1, 0.028, [-W / 2 + 0.06, 0.016, Math.cos(tilt) * D / 2 + 0.03], '#22201c', '#f4efdf');
    card.rotation.x = -0.5;
    s.box([0.1, 0.004, 0.02], [-W / 2 + 0.06, 0.002, Math.cos(tilt) * D / 2 + 0.036], frameMat);

    const pulse = mix(0.05, 0.5, mood.energy);
    return s.finish({ update: (_dt, time) => { for (const [i, g] of gems.entries()) g.emissiveIntensity = gemGlow * (1 + Math.sin(time * 2.2 + i) * pulse); } });
  },
});
