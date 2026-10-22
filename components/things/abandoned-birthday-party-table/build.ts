import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const PALETTES = {
  rainbow: ['#e23b3b', '#f2a81d', '#f4d93a', '#3fae5a', '#2f8fd8', '#8a4fc8'],
  pink: ['#f27aa8', '#f7b6cf', '#c95a9a', '#f4e3a0', '#b48ad8', '#ffffff'],
  blue: ['#2f6fd0', '#58b6e8', '#1f3f8a', '#f4d93a', '#e8eef2', '#3fae8a'],
  pizzeria: ['#d02b2b', '#f4f0e4', '#2f8f4a', '#d02b2b', '#f2a81d', '#f4f0e4'],
} as const;

export default defineThing({
  questions: {
    when: choice('How long ago did the party end?', {
      'just-finished': 'Minutes ago: candles still burning, balloons up, crumbs and confetti fresh.',
      'morning-after': 'The morning after: everything where it was dropped, cake sunk, cups tipped over.',
      'weeks': 'Weeks ago: nobody came to clear it; food dried out, colours fading.',
      decades: 'Decades ago: the whole table under a grey blanket of dust.',
    }),
    places: choice('How many places are set?', {
      four: 'Four, a small party.', six: 'Six.', eight: 'Eight, a full class row.', ten: 'Ten, a long banquet of paper plates.',
    }),
    candles: choice('How old was the child, by the candles?', {
      one: 'One: a single candle.', three: 'Three.', five: 'Five.', seven: 'Seven.', ten: 'Ten, a crowded ring of candles.',
    }),
    cake: choice('What state is the cake in?', {
      uncut: 'Whole and uncut, as if the moment never came.',
      'half-eaten': 'Half gone, cut in wedges.',
      collapsed: 'Collapsed in on itself, frosting slumped, candles leaning.',
      smashed: 'Smashed flat, a hand or a face went into it.',
    }),
    absence: choice('What is out of place among the seats?', {
      nothing: 'Nothing: every chair is pushed in the same.',
      'pulled-out': 'One chair is pulled out and turned, as if someone just stood up.',
      'unopened-present': 'One place is untouched, with a wrapped present still sitting on the plate.',
      'knocked-over': 'One chair lies knocked over on the floor.',
    }),
    banner: choice('What does the banner say?', {
      generic: 'HAPPY BIRTHDAY', danny: 'HAPPY BIRTHDAY DANNY', sarah: 'HAPPY BIRTHDAY SARAH', mikey: 'HAPPY 7TH MIKEY',
      torn: 'It has torn: only HAPPY BIR is left, one end on the floor.',
      none: 'There is no banner.',
    }),
    balloons: choice('What state are the balloons in?', {
      floating: 'Floating taut on their strings above the table.',
      sagging: 'Half deflated, hanging at chair height or resting on the table.',
      shrivelled: 'Shrivelled to wrinkled fists on the floor.',
      popped: 'Popped: only strings and rubber scraps.',
    }),
    colours: choice('What are the party colours?', {
      rainbow: 'Loud primary rainbow.', pink: 'Pinks and lilac.', blue: 'Blues with yellow.', pizzeria: 'Red, white and green pizzeria check.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dust = Math.min(0.85, { 'just-finished': 0, 'morning-after': 0.05, weeks: 0.25, decades: 0.68 }[a.when] + mood.wear * 0.2);
    const fresh = a.when === 'just-finished';
    const grey = new THREE.Color('#a8a397');
    const tint = (hex: string) => new THREE.Color(hex).lerp(grey, dust);
    const mat = (hex: string, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: tint(hex), roughness: mix(0.55, 0.98, dust), ...options });
    const palette = PALETTES[a.colours];
    const pick = () => palette[Math.floor(random() * palette.length)];
    const places = { four: 4, six: 6, eight: 8, ten: 10 }[a.places];
    const perSide = places / 2, pitch = 0.58;
    const L = perSide * pitch + 0.5, Wt = 0.76, H = 0.62;

    // Table: laminate top, steel folding legs, paper cloth with an overhang.
    s.box([L, 0.035, Wt], [0, H - 0.018, 0], mat('#c9b48f'));
    s.box([L + 0.01, 0.02, Wt + 0.01], [0, H - 0.03, 0], mat('#5a4a3a'));
    const steel = mat('#8e949a', { metalness: 0.6, roughness: 0.4 });
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) s.rod([x * (L / 2 - 0.18), H - 0.04, z * (Wt / 2 - 0.08)], [x * (L / 2 - 0.12), 0, z * (Wt / 2 - 0.05)], 0.016, steel);
      s.rod([x * (L / 2 - 0.13), 0.12, -(Wt / 2 - 0.06)], [x * (L / 2 - 0.13), 0.12, Wt / 2 - 0.06], 0.012, steel);
    }
    const clothTint = a.colours === 'pizzeria' ? '#f4f0e4' : palette[4];
    const cc = document.createElement('canvas'); cc.width = cc.height = 128; const cx = cc.getContext('2d')!;
    cx.fillStyle = `#${tint(clothTint).getHexString()}`; cx.fillRect(0, 0, 128, 128);
    if (a.colours === 'pizzeria') { cx.fillStyle = `#${tint('#d02b2b').getHexString()}`; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) cx.fillRect(i * 16, j * 16, 16, 16); }
    else for (let i = 0; i < 26; i++) { cx.fillStyle = `#${tint(pick()).getHexString()}`; cx.beginPath(); cx.arc(random() * 128, random() * 128, 3 + random() * 3, 0, 6.3); cx.fill(); }
    for (let i = 0; i < dust * 500; i++) { cx.fillStyle = 'rgba(120,114,104,0.35)'; cx.fillRect(random() * 128, random() * 128, 2, 2); }
    const clothMap = new THREE.CanvasTexture(cc); clothMap.colorSpace = THREE.SRGBColorSpace; clothMap.wrapS = clothMap.wrapT = THREE.RepeatWrapping; clothMap.repeat.set(Math.round(L / 0.4), 2);
    const cloth = new THREE.MeshStandardMaterial({ map: clothMap, roughness: 0.9, side: THREE.DoubleSide });
    s.box([L + 0.04, 0.008, Wt + 0.04], [0, H + 0.004, 0], cloth);
    for (const z of [-1, 1]) s.box([L + 0.04, 0.16, 0.006], [0, H - 0.075, z * (Wt / 2 + 0.02)], cloth);
    const top = H + 0.009;

    // Chairs and place settings.
    const chairMats = palette.slice(0, 4).map((hex) => mat(hex, { roughness: 0.5 }));
    const odd = Math.floor(random() * places);
    const anchors: P3[] = [];
    const chair = (x: number, side: number, index: number) => {
      const g = new THREE.Group();
      const shell = chairMats[index % chairMats.length];
      const add = (m: THREE.Mesh) => { g.add(m); return m; };
      add(s.box([0.34, 0.025, 0.32], [0, 0.36, 0], shell));
      const back = add(s.box([0.34, 0.26, 0.022], [0, 0.6, -0.16], shell)); back.rotation.x = -0.12;
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) add(s.rod([lx * 0.14, 0.36, lz * 0.13], [lx * 0.16, 0, lz * 0.15], 0.011, steel));
      for (const lx of [-1, 1]) add(s.rod([lx * 0.14, 0.36, -0.14], [lx * 0.14, 0.5, -0.165], 0.011, steel));
      let cz = side * (Wt / 2 + 0.2), rot = side === 1 ? Math.PI : 0, cx2 = x;
      if (index === odd && a.absence === 'pulled-out') { cz = side * (Wt / 2 + 0.62); rot += 0.7; cx2 += 0.12; }
      if (index === odd && a.absence === 'knocked-over') { cz = side * (Wt / 2 + 0.7); g.rotation.x = side * -Math.PI / 2 * 0.98; g.position.y = 0.17; rot += 0.4; }
      else { rot += (random() - 0.5) * (fresh ? 0.5 : 0.25); cz += random() * 0.12 * side; }
      g.rotation.y = rot; g.rotation.order = 'YXZ';
      g.position.x = cx2; g.position.z = cz;
      s.root.add(g);
      if (!(index === odd && a.absence === 'knocked-over')) anchors.push([cx2, 0.72, cz + side * 0.16]);
    };
    const flames: THREE.Mesh[] = [];
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 2.4 });
    for (let i = 0; i < places; i++) {
      const side = i < perSide ? 1 : -1, k = i % perSide;
      const x = (k - (perSide - 1) / 2) * pitch, z = side * (Wt / 2 - 0.17);
      chair(x, side, i);
      const untouched = i === odd && a.absence === 'unopened-present';
      s.cylinder(0.105, 0.085, 0.012, [x, top + 0.006, z], mat('#f6f3ea'), 18);
      s.cylinder(0.035, 0.028, 0.085, [x + 0.15, top + 0.043, z - side * 0.07], mat(palette[(i + 2) % palette.length]), 12).rotation.z = 0;
      if (untouched) {
        const wrap = mat(palette[1], { roughness: 0.35 }), ribbon = mat(palette[0], { roughness: 0.3 });
        s.box([0.15, 0.1, 0.12], [x, top + 0.062, z], wrap).rotation.y = 0.3;
        s.box([0.155, 0.102, 0.025], [x, top + 0.062, z], ribbon).rotation.y = 0.3;
        s.box([0.025, 0.102, 0.125], [x, top + 0.062, z], ribbon).rotation.y = 0.3;
        for (const r of [-0.6, 0.6]) { const loop = s.mesh(new THREE.TorusGeometry(0.022, 0.007, 6, 12), ribbon, [x + Math.sin(r) * 0.02, top + 0.125, z]); loop.rotation.y = r; }
        const hat = s.mesh(new THREE.ConeGeometry(0.06, 0.17, 14), mat(palette[i % palette.length]), [x - 0.16, top + 0.085, z]);
        hat.castShadow = true;
        continue;
      }
      // Hat: worn hats are gone, left ones stand on the plate, lie on the table or have rolled to the floor.
      const fate = random();
      const hatMat = mat(palette[i % palette.length], { roughness: 0.6 });
      if (fate < 0.45) {
        s.mesh(new THREE.ConeGeometry(0.06, 0.17, 14), hatMat, [x - 0.15, top + 0.085, z + side * 0.03]);
        s.ball([0.014, 0.014, 0.014], [x - 0.15, top + 0.175, z + side * 0.03], mat('#ffffff'), 6);
      } else if (fate < 0.85) {
        const hat = s.mesh(new THREE.ConeGeometry(0.06, 0.17, 14), hatMat, [x - 0.14 + random() * 0.05, top + 0.058, z]);
        hat.rotation.set(Math.PI / 2 - 0.34, 0, 0); hat.rotation.order = 'YXZ'; hat.rotation.y = random() * 6.283;
      } else {
        const hat = s.mesh(new THREE.ConeGeometry(0.06, 0.17, 14), hatMat, [x + (random() - 0.5) * 0.3, 0.058, side * (Wt / 2 + 0.6 + random() * 0.3)]);
        hat.rotation.set(Math.PI / 2 - 0.34, 0, 0); hat.rotation.order = 'YXZ'; hat.rotation.y = random() * 6.283;
      }
      // Leftovers on the plate.
      const left = random();
      if (left < 0.4) {
        const slice = s.mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 3, 1, false, 0, 1.1), mat('#e2a94a'), [x, top + 0.018, z]);
        slice.rotation.y = random() * 6;
      } else if (left < 0.75) {
        s.box([0.05, 0.04, 0.07], [x + 0.01, top + 0.03, z], mat('#7a4a2a')).rotation.y = random() * 3;
        s.box([0.052, 0.012, 0.072], [x + 0.01, top + 0.055, z], mat('#f6e9ee'));
      }
      if (!fresh && random() < 0.3 + dust * 0.3) {
        const cup = s.cylinder(0.035, 0.028, 0.085, [x - 0.02, top + 0.03, z - side * 0.19], mat(palette[(i + 3) % palette.length]), 12);
        cup.rotation.z = Math.PI / 2; cup.rotation.y = random() * 3;
        s.cylinder(0.07, 0.07, 0.002, [x + 0.06, top + 0.002, z - side * 0.19], mat('#9a5a3a', { roughness: 0.3 }), 14).scale.set(1.4, 1, 0.8);
      }
    }

    // The cake on its board, candles by age.
    const cakeX = perSide > 2 ? -pitch * 0.5 * ((perSide + 1) % 2) : 0;
    const cake = new THREE.Group();
    cake.position.set(cakeX, top, 0);
    s.root.add(cake);
    const cadd = <T extends THREE.Object3D>(m: T) => { cake.add(m); return m; };
    const sponge = mat('#7a4a2a'), frosting = mat(a.colours === 'pink' ? '#f7b6cf' : a.colours === 'blue' ? '#cfe6f6' : '#f6efe2', { roughness: 0.45 });
    cadd(s.cylinder(0.2, 0.2, 0.012, [0, 0.006, 0], mat('#d9d9d9', { metalness: 0.5, roughness: 0.4 }), 24));
    const n = { one: 1, three: 3, five: 5, seven: 7, ten: 10 }[a.candles];
    const arc = a.cake === 'half-eaten' ? Math.PI * 1.1 : Math.PI * 2;
    let cakeH = 0.11, cakeR = 0.15, lean = 0.06;
    if (a.cake === 'collapsed') { cakeH = 0.06; cakeR = 0.175; lean = 0.6; }
    if (a.cake === 'smashed') { cakeH = 0.035; cakeR = 0.19; lean = 1.2; }
    if (a.when === 'weeks' || a.when === 'decades') cakeH *= 0.8;
    cadd(s.mesh(new THREE.CylinderGeometry(cakeR, cakeR * 1.03, cakeH, 28, 1, false, 0.4, arc), sponge, [0, 0.012 + cakeH / 2, 0]));
    cadd(s.mesh(new THREE.CylinderGeometry(cakeR * 1.02, cakeR * 1.02, 0.018, 28, 1, false, 0.4, arc), frosting, [0, 0.012 + cakeH + 0.006, 0]));
    if (a.cake !== 'smashed') {
      const blobs: { at: P3; size: number }[] = [];
      for (let i = 0; i < 14; i++) { const t = 0.4 + (i / 14) * arc; blobs.push({ at: [Math.sin(t) * cakeR * 0.95, 0.012 + cakeH + 0.02, Math.cos(t) * cakeR * 0.95], size: 0.02 }); }
      cadd(s.scatter(new THREE.SphereGeometry(1, 8, 6), mat(palette[0], { roughness: 0.4 }), blobs));
    } else {
      for (let i = 0; i < 9; i++) cadd(s.ball([0.04 + random() * 0.04, 0.02, 0.04 + random() * 0.03], [(random() - 0.5) * 0.5, 0.02, (random() - 0.5) * 0.4], random() < 0.5 ? frosting : sponge, 8));
      cadd(s.ball([0.07, 0.012, 0.09], [0.02, 0.012 + cakeH + 0.012, 0], sponge, 10));
    }
    if (a.cake === 'collapsed') cadd(s.ball([0.1, 0.03, 0.09], [0.02, 0.012 + cakeH + 0.004, 0.02], sponge, 10));
    const lit = fresh && a.cake === 'uncut';
    for (let i = 0; i < n; i++) {
      const t = 0.5 + (i / n) * (arc - 0.3), r = n === 1 ? 0 : cakeR * 0.6;
      const g = new THREE.Group();
      g.position.set(Math.sin(t) * r, 0.012 + cakeH + 0.014, Math.cos(t) * r);
      g.rotation.set((random() - 0.5) * lean * 2, 0, (random() - 0.5) * lean * 2);
      const stick = s.cylinder(0.007, 0.007, 0.075, [0, 0.037, 0], mat(palette[i % palette.length], { roughness: 0.4 }), 6);
      g.add(stick);
      g.add(s.cylinder(0.0015, 0.0015, 0.012, [0, 0.08, 0], mat('#1c1a18'), 4));
      if (lit) { const f = s.mesh(new THREE.ConeGeometry(0.01, 0.035, 6), flameMat, [0, 0.1, 0]); f.castShadow = false; g.add(f); flames.push(f); }
      cake.add(g);
    }

    // Pizza trays.
    const trays = perSide >= 4 ? 2 : 1;
    for (let i = 0; i < trays; i++) {
      const x = cakeX + (i === 0 ? 0.52 : -0.55), eaten = fresh ? random() * 0.5 : 0.35 + random() * 0.6;
      if (Math.abs(x) > L / 2 - 0.22) continue;
      s.cylinder(0.2, 0.19, 0.014, [x, top + 0.008, 0.02], mat('#c9ccd0', { metalness: 0.7, roughness: 0.35 }), 28);
      const remaining = Math.PI * 2 * (1 - eaten);
      if (remaining > 0.5) {
        const start = random() * 6;
        s.mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.014, 24, 1, false, start, remaining), mat('#d9a04a'), [x, top + 0.022, 0.02]);
        s.mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.016, 24, 1, false, start + 0.03, remaining - 0.06), mat('#e8c25a'), [x, top + 0.023, 0.02]);
        const dots: { at: P3; size: number }[] = [];
        for (let k = 0; k < 16; k++) { const t = start + 0.15 + random() * (remaining - 0.3), r = 0.03 + random() * 0.11; dots.push({ at: [x + Math.sin(t) * r, top + 0.031, 0.02 + Math.cos(t) * r], size: 0.016 }); }
        const pep = new THREE.SphereGeometry(1, 8, 4); pep.scale(1, 0.25, 1);
        s.scatter(pep, mat('#b0352a'), dots);
      }
      for (let k = 0; k < 3; k++) s.ball([0.012, 0.004, 0.02], [x + (random() - 0.5) * 0.3, top + 0.018, 0.02 + (random() - 0.5) * 0.3], mat('#d9a04a'), 6);
    }

    // Confetti while it is fresh; dust clumps and cobweb threads when it is old.
    if (dust < 0.3) {
      const bits: { at: P3; size: number; color: THREE.Color }[] = [];
      const count = Math.round(mix(30, 140, mood.density) * (fresh ? 1 : 0.5));
      for (let i = 0; i < count; i++) {
        const onTable = random() < 0.6;
        bits.push({ at: onTable ? [(random() - 0.5) * L, top + 0.003, (random() - 0.5) * Wt] : [(random() - 0.5) * (L + 0.8), 0.004, (random() - 0.5) * (Wt + 1.6)], size: 0.7 + random() * 0.8, color: tint(pick()) });
      }
      s.scatter(new THREE.BoxGeometry(0.018, 0.002, 0.018), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), bits);
    } else if (dust > 0.5) {
      const web = new THREE.MeshStandardMaterial({ color: '#d8d6cf', roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const x = (random() - 0.5) * (L - 0.3), z = (random() - 0.5) * 0.4;
        s.rod([x, top + 0.17, z], [x + (random() - 0.5) * 0.5, top + 0.01 + random() * 0.1, z + (random() - 0.5) * 0.4], 0.0015, web);
      }
      for (const x of [-1, 1]) s.tube([[x * (L / 2 - 0.18), H - 0.05, Wt / 2 - 0.08], [x * (L / 2 - 0.25), H - 0.22, Wt / 2 - 0.02], [x * (L / 2 - 0.13), H - 0.38, Wt / 2 - 0.06]], 0.002, web);
    }

    // Banner on two poles taped to the table ends.
    if (a.banner !== 'none') {
      const text = { generic: 'HAPPY BIRTHDAY', danny: 'HAPPY BIRTHDAY DANNY', sarah: 'HAPPY BIRTHDAY SARAH', mikey: 'HAPPY 7TH MIKEY', torn: 'HAPPY BIR' }[a.banner];
      const poleTop = H + 1.05, px = L / 2 + 0.02;
      const pole = mat('#b9a27a');
      for (const x of [-1, 1]) s.rod([x * px, 0, -Wt / 2 - 0.02], [x * px, poleTop + 0.05, -Wt / 2 - 0.02], 0.014, pole);
      const cell = 64, bc = document.createElement('canvas'); bc.width = text.length * cell; bc.height = 80; const bx = bc.getContext('2d')!;
      bx.clearRect(0, 0, bc.width, bc.height);
      bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.font = 'bold 46px monospace';
      [...text].forEach((ch, i) => {
        if (ch === ' ') return;
        bx.fillStyle = `#${tint(palette[i % palette.length]).getHexString()}`;
        bx.beginPath(); bx.moveTo(i * cell + 4, 4); bx.lineTo(i * cell + cell - 4, 4); bx.lineTo(i * cell + cell - 4, 58); bx.lineTo(i * cell + cell / 2, 78); bx.lineTo(i * cell + 4, 58); bx.closePath(); bx.fill();
        bx.fillStyle = a.colours === 'pink' || palette[i % palette.length] === '#f4f0e4' || palette[i % palette.length] === '#ffffff' || palette[i % palette.length] === '#f4d93a' || palette[i % palette.length] === '#e8eef2' ? '#3a2a30' : '#ffffff';
        bx.fillText(ch, i * cell + cell / 2, 32);
      });
      const bmap = new THREE.CanvasTexture(bc); bmap.colorSpace = THREE.SRGBColorSpace;
      const span = px * 2, torn = a.banner === 'torn';
      const width = torn ? span * 0.75 : span;
      const geometry = new THREE.PlaneGeometry(width, width * 80 / bc.width, 24, 1);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const sag = mix(0.08, 0.2, dust) + (fresh ? 0 : 0.04);
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / width + 0.5;
        if (torn) pos.setXYZ(i, -px + Math.sin(u * 1.25) * width * 0.52, pos.getY(i) * 1 + poleTop - 0.1 - (1 - Math.cos(u * 1.45)) * (poleTop - 0.2), pos.getZ(i) + u * 0.25);
        else pos.setXYZ(i, pos.getX(i), pos.getY(i) + poleTop - 0.1 - Math.sin(u * Math.PI) * sag, 0);
      }
      geometry.computeVertexNormals();
      const banner = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: bmap, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), [0, 0, -Wt / 2 - 0.02]);
      banner.castShadow = true;
      if (!torn) s.tube([[-px, poleTop, -Wt / 2 - 0.02], [0, poleTop - sag, -Wt / 2 - 0.02], [px, poleTop, -Wt / 2 - 0.02]], 0.003, mat('#f0ece0'));
    }

    // Balloons.
    const bobbers: { mesh: THREE.Object3D; y: number; phase: number }[] = [];
    const string = mat('#e8e4d8');
    const count = Math.max(3, Math.round(mix(3, 7, mood.density) * (places / 8 + 0.4)));
    for (let i = 0; i < count; i++) {
      const anchor: P3 = anchors.length ? anchors[Math.floor(random() * anchors.length)] : [0, H, 0];
      const rubber = mat(palette[i % palette.length], { roughness: a.balloons === 'floating' ? 0.25 : 0.6 });
      if (a.balloons === 'floating') {
        const bx2 = anchor[0] + (random() - 0.5) * 0.5, by = 1.55 + random() * 0.55, bz = anchor[2] + (random() - 0.5) * 0.4;
        const g = new THREE.Group(); g.position.set(bx2, by, bz); s.root.add(g);
        g.add(s.ball([0.14, 0.175, 0.14], [0, 0, 0], rubber, 16));
        g.add(s.mesh(new THREE.ConeGeometry(0.02, 0.03, 6), rubber, [0, -0.18, 0]));
        s.rod(anchor, [bx2, by - 0.19, bz], 0.002, string);
        bobbers.push({ mesh: g, y: by, phase: random() * 6 });
      } else if (a.balloons === 'sagging') {
        const onTable = random() < 0.4;
        const at: P3 = onTable ? [(random() - 0.5) * (L - 0.4), top + 0.1, (random() - 0.5) * 0.3] : [anchor[0] + (random() - 0.5) * 0.3, anchor[1] - 0.25 - random() * 0.2, anchor[2] + Math.sign(anchor[2]) * 0.14];
        const b = s.ball([0.1, 0.125, 0.1], at, rubber, 14); b.rotation.z = onTable ? 1.3 : Math.PI + (random() - 0.5) * 0.5;
        if (!onTable) s.rod(anchor, [at[0], at[1] + 0.12, at[2]], 0.002, string);
      } else if (a.balloons === 'shrivelled') {
        const at: P3 = [anchor[0] + (random() - 0.5) * 0.6, 0.035, anchor[2] + Math.sign(anchor[2]) * (0.2 + random() * 0.4)];
        s.ball([0.05, 0.035, 0.065], at, rubber, 8).rotation.y = random() * 3;
        s.tube([anchor, [anchor[0], 0.2, (anchor[2] + at[2]) / 2], [at[0], 0.01, at[2]]], 0.002, string);
      } else {
        const at: P3 = [anchor[0] + (random() - 0.5) * 0.7, 0.006, anchor[2] + Math.sign(anchor[2]) * (0.2 + random() * 0.5)];
        s.ball([0.045, 0.004, 0.025], at, rubber, 6).rotation.y = random() * 3;
        s.ball([0.02, 0.004, 0.035], [at[0] + 0.08, 0.006, at[2] + 0.05], rubber, 6);
        s.tube([anchor, [anchor[0] + 0.02, 0.25, anchor[2] + Math.sign(anchor[2]) * 0.05], [at[0], 0.01, at[2]]], 0.002, string);
      }
    }

    const phase = random() * 7;
    return s.finish({
      update: (_dt, time) => {
        const t = time * mix(0.6, 3, mood.energy) + phase;
        for (const b of bobbers) { b.mesh.position.y = b.y + Math.sin(t + b.phase) * 0.03; b.mesh.rotation.z = Math.sin(t * 0.7 + b.phase) * 0.08; }
        flames.forEach((f, i) => { f.scale.y = 0.85 + Math.sin(t * 9 + i * 2.1) * 0.2; f.rotation.z = Math.sin(t * 6 + i) * 0.2; });
        flameMat.emissiveIntensity = 2.2 + Math.sin(t * 11) * 0.5;
      },
    });
  },
});
