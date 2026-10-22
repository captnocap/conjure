import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

const STYLE = {
  temple: { bg: '#e6e2d6', wall: '#e9e4d6', column: '#f3efe4', counter: '#ebe7dc', trim: '#d0a441', floorA: '#efe9d9', floorB: '#2f3d38', dado: '#d8d2c2' },
  deco: { bg: '#e3dccb', wall: '#e2d6b8', column: '#27272c', counter: '#2b2b30', trim: '#dcae3c', floorA: '#ece2c6', floorB: '#1f1f24', dado: '#3a3a40' },
  brutalist: { bg: '#dcd9d0', wall: '#b3afa5', column: '#a9a59b', counter: '#6b4a32', trim: '#c9cdd0', floorA: '#d96a1f', floorB: '#b8520f', dado: '#a29e94' },
  soviet: { bg: '#dfe0d6', wall: '#e4e0d0', column: '#e9e5d6', counter: '#9a6a3c', trim: '#b9903c', floorA: '#cfc6b8', floorB: '#8c5a50', dado: '#8fae98' },
  gutted: { bg: '#d6d8d2', wall: '#c9c6ba', column: '#d4d1c6', counter: '#c7c3b7', trim: '#7d8266', floorA: '#cfcabb', floorB: '#3c4541', dado: '#b5b2a6' },
} as const;

export default defineWorld({
  questions: {
    institution: choice('What kind of bank is this hall?', {
      temple: 'A neoclassical temple of money: white marble, round columns, brass grilles.',
      deco: 'An Art Deco savings bank: black columns banded in gold, sunburst grilles, cream walls.',
      brutalist: 'A 1970s brutalist branch: raw concrete piers, orange carpet, glass-fronted counters under a concrete canopy.',
      soviet: 'A Soviet-era savings hall: green-painted dado, wooden counters behind glass, a red banner.',
      gutted: 'A gutted, roofless hall turned over to pigeons: broken columns, rubble, grilles torn out.',
    }),
    event: choice('What hour or event is it?', {
      ordinary: 'An ordinary business hour: a few customers at the windows.',
      opening: 'Opening time: every lamp lit, ropes hooked, nobody in yet.',
      closing: 'After closing: blinds down, hall dim, a mop bucket and one lamp left on.',
      run: 'A bank run: a crowd crushed against the teller wall, papers underfoot.',
      robbery: 'A robbery aftermath: banknotes trailed across the floor, a dropped bag, an alarm flashing, everyone gone.',
    }),
    floor: choice('If the floor is stone, how is it inlaid?', {
      chequer: 'Chequered squares divided by brass strips.',
      medallion: 'Pale slabs around a great brass compass medallion in the centre.',
      diamonds: 'A diagonal lattice of brass lines with dark diamonds at the crossings.',
      plain: 'Large veined slabs with a single dark border.',
    }),
    windows: choice('What are the high windows like?', {
      arched: 'Tall round-arched windows.',
      round: 'Round oculus windows high up.',
      slits: 'Narrow vertical slits in pairs.',
      stained: 'Arched stained glass that throws coloured shafts.',
    }),
    over: choice('What presides over the teller wall?', {
      clock: 'A great wall clock.',
      motto: 'A carved motto about thrift and security.',
      rates: 'A board of exchange and interest rates.',
      banner: 'A long cloth banner with a slogan.',
      nothing: 'Bare wall.',
    }),
    dressing: choice('What furnishes the open floor besides the cast?', {
      ropes: 'A line of brass posts and velvet ropes before the tellers.',
      palms: 'Potted palms at the feet of the columns.',
      benches: 'Long waiting benches along the colonnade.',
      desks: 'Standing writing desks and a guard\'s desk.',
      bare: 'Nothing: echoing empty floor.',
    }),
    serving: score('How many teller windows are serving?', ['None', 'One', 'About half', 'Every window']),
    vault: noul('Is the round vault door visible at the end of the hall?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const P = STYLE[a.institution];
    const ruin = a.institution === 'gutted';
    const dim = a.event === 'closing';
    const W = 18, D = 13, H = 8, BX = -W / 2, BZ = -D / 2;
    const bg = new THREE.Color(P.bg).lerp(new THREE.Color('#8d93a3'), dim ? 0.55 : 0);
    const { art: s, world } = diorama(context, {
      background: `#${bg.getHexString()}`, floor: P.floorA, width: W, depth: D, maxHeight: 2.5, radius: 1.45, pitch: 31, yaw: 31,
      slots: [[0.2, 1.3], [-3.3, -0.7], [3.6, -0.7], [-3.1, 3.9], [3.5, 3.9], [6.8, 1.6]],
    });
    const root = s.root;
    const hemi = root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (dim && hemi) { hemi.intensity = 0.95; hemi.color.set('#b9c4e6'); }
    if (dim && world.keyLight) world.keyLight.intensity = 1.5;
    const wall = s.material(P.wall, { roughness: 0.85 });
    const columnMat = s.material(P.column, { roughness: a.institution === 'deco' ? 0.3 : 0.6 });
    const counterMat = s.material(P.counter, { roughness: a.institution === 'temple' || a.institution === 'deco' ? 0.35 : 0.6 });
    const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.trim).lerp(new THREE.Color('#6f745a'), mood.wear * 0.5), metalness: 0.55, roughness: mix(0.3, 0.7, mood.wear) });
    const dark = s.material('#24231f');
    const glowScale = (dim ? 0.5 : 1) * mix(0.7, 1.3, mood.cheer);
    const sun = dim ? 0.25 : mix(0.55, 1, 1 - Math.abs(mood.daylight - 0.5) * 2) * mix(0.75, 1.1, mood.cheer);
    const stoneFloor = a.institution !== 'brutalist';

    // ---- Floor ----
    const fc = document.createElement('canvas');
    fc.width = 1152; fc.height = 832;
    const f = fc.getContext('2d')!;
    const fx = (x: number) => ((x - BX) / W) * fc.width, fz = (z: number) => ((z - BZ) / D) * fc.height, fu = fc.width / W;
    const brassInk = `#${new THREE.Color(P.trim).getHexString()}`;
    f.fillStyle = P.floorA; f.fillRect(0, 0, fc.width, fc.height);
    if (!stoneFloor) {
      f.fillStyle = P.floorB;
      for (let i = 0; i < 400; i++) f.fillRect(random() * fc.width, random() * fc.height, 14 + random() * 30, 2);
      f.globalAlpha = 0.5;
      for (let x = -8; x < 9; x += 2) for (let z = -5; z < 6; z += 2) { f.beginPath(); f.arc(fx(x + 0.5), fz(z + 0.5), fu * 0.55, 0, 7); f.lineWidth = 5; f.strokeStyle = '#f08a3c'; f.stroke(); }
      f.globalAlpha = 1;
      f.fillStyle = '#8f8b82'; f.fillRect(0, 0, fc.width, fu * 0.5); f.fillRect(0, 0, fu * 0.5, fc.height);
    } else {
      // Veins first, then the inlay.
      f.strokeStyle = a.institution === 'soviet' ? '#a39a8c' : '#b9b3a2';
      for (let i = 0; i < 40; i++) {
        f.globalAlpha = 0.15 + random() * 0.25; f.lineWidth = 1 + random() * 3; f.beginPath();
        let x = random() * fc.width, y = random() * fc.height; f.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += 20 + random() * 60; y += (random() - 0.5) * 70; f.lineTo(x, y); }
        f.stroke();
      }
      f.globalAlpha = 1;
      if (a.institution === 'soviet') { for (let i = 0; i < 2600; i++) { f.fillStyle = ['#8c5a50', '#5c6a66', '#efe8da'][i % 3]; f.fillRect(random() * fc.width, random() * fc.height, 3, 3); } }
      if (a.floor === 'chequer') {
        for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) if ((x + z) % 2 === 0) { f.fillStyle = P.floorB; f.globalAlpha = 0.9; f.fillRect(fx(BX + x), fz(BZ + z), fu, fu); }
        f.globalAlpha = 1; f.strokeStyle = brassInk; f.lineWidth = 3;
        for (let x = 0; x <= W; x++) { f.beginPath(); f.moveTo(fx(BX + x), 0); f.lineTo(fx(BX + x), fc.height); f.stroke(); }
        for (let z = 0; z <= D; z++) { f.beginPath(); f.moveTo(0, fz(BZ + z)); f.lineTo(fc.width, fz(BZ + z)); f.stroke(); }
      } else if (a.floor === 'medallion') {
        const cx = fx(0.5), cy = fz(1.2);
        f.strokeStyle = brassInk; f.lineWidth = 3;
        for (let x = 0; x <= W; x += 3) { f.beginPath(); f.moveTo(fx(BX + x), 0); f.lineTo(fx(BX + x), fc.height); f.stroke(); }
        for (let z = 0.5; z <= D; z += 3) { f.beginPath(); f.moveTo(0, fz(BZ + z)); f.lineTo(fc.width, fz(BZ + z)); f.stroke(); }
        f.fillStyle = P.floorA; f.beginPath(); f.arc(cx, cy, fu * 3.6, 0, 7); f.fill();
        f.fillStyle = P.floorB; f.beginPath(); f.arc(cx, cy, fu * 3.5, 0, 7); f.fill();
        f.fillStyle = P.floorA; f.beginPath(); f.arc(cx, cy, fu * 3.15, 0, 7); f.fill();
        for (let i = 0; i < 16; i++) {
          const t = (i / 16) * Math.PI * 2, r = fu * (i % 4 === 0 ? 3.1 : i % 2 === 0 ? 2.3 : 1.5);
          f.fillStyle = i % 2 ? P.floorB : brassInk;
          f.beginPath(); f.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); f.lineTo(cx + Math.cos(t + 0.2) * fu * 0.6, cy + Math.sin(t + 0.2) * fu * 0.6); f.lineTo(cx + Math.cos(t - 0.2) * fu * 0.6, cy + Math.sin(t - 0.2) * fu * 0.6); f.fill();
        }
        f.lineWidth = 6; f.strokeStyle = brassInk; f.beginPath(); f.arc(cx, cy, fu * 3.3, 0, 7); f.stroke(); f.beginPath(); f.arc(cx, cy, fu * 0.7, 0, 7); f.stroke();
      } else if (a.floor === 'diamonds') {
        f.strokeStyle = brassInk; f.lineWidth = 3;
        for (let c = -D; c < W + D; c += 1.5) for (const dir of [1, -1]) { f.beginPath(); f.moveTo(fx(BX + c), fz(BZ)); f.lineTo(fx(BX + c + dir * D), fz(BZ + D)); f.stroke(); }
        f.fillStyle = P.floorB;
        for (let i = -10; i < 24; i++) for (let j = 0; j <= 17; j++) {
          const x = BX + i * 1.5 + (j % 2) * 0.75, z = BZ + j * 0.75;
          f.save(); f.translate(fx(x), fz(z)); f.rotate(Math.PI / 4); f.fillRect(-fu * 0.16, -fu * 0.16, fu * 0.32, fu * 0.32); f.restore();
        }
      } else {
        f.strokeStyle = '#a9a391'; f.lineWidth = 2;
        for (let x = 0; x <= W; x += 2.25) { f.beginPath(); f.moveTo(fx(BX + x), 0); f.lineTo(fx(BX + x), fc.height); f.stroke(); }
        for (let z = 0; z <= D; z += 2.6) { f.beginPath(); f.moveTo(0, fz(BZ + z)); f.lineTo(fc.width, fz(BZ + z)); f.stroke(); }
      }
      f.lineWidth = fu * 0.35; f.strokeStyle = P.floorB; f.strokeRect(fu * 0.5, fu * 0.5, fc.width - fu, fc.height - fu);
      f.lineWidth = 3; f.strokeStyle = brassInk; f.strokeRect(fu * 0.8, fu * 0.8, fc.width - fu * 1.6, fc.height - fu * 1.6);
    }
    // Grime, cracks and missing slabs as the place wears.
    const grime = ruin ? 1 : mood.wear;
    for (let i = 0; i < Math.round(grime * 26); i++) {
      f.globalAlpha = 0.12 + random() * 0.2; f.fillStyle = ruin ? '#4a4a3c' : '#6a6456';
      f.beginPath(); f.ellipse(random() * fc.width, random() * fc.height, 20 + random() * 70, 14 + random() * 40, random() * 3, 0, 7); f.fill();
    }
    f.globalAlpha = 0.7; f.strokeStyle = '#2a2a26'; f.lineWidth = 2;
    for (let i = 0; i < Math.round(grime * 12); i++) {
      f.beginPath(); let x = random() * fc.width, y = random() * fc.height; f.moveTo(x, y);
      for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 90; y += (random() - 0.3) * 60; f.lineTo(x, y); }
      f.stroke();
    }
    f.globalAlpha = 1;
    const floorTex = new THREE.CanvasTexture(fc);
    floorTex.colorSpace = THREE.SRGBColorSpace;
    floorTex.anisotropy = 4;
    const floor = s.mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTex, roughness: stoneFloor ? mix(0.25, 0.85, grime) : 1 }), [0, 0.004, 0]);
    floor.rotation.x = -Math.PI / 2;
    floor.castShadow = false;

    // ---- Walls ----
    const jag = (length: number) => (ruin ? H - 0.6 - random() * 3.2 : H) * (length ? 1 : 1);
    const backSegs = 9, leftSegs = 7;
    for (let i = 0; i < backSegs; i++) { const h = jag(1), w = W / backSegs; s.box([w + 0.01, h, 0.4], [BX + (i + 0.5) * w, h / 2, BZ - 0.2], wall); }
    for (let i = 0; i < leftSegs; i++) { const h = jag(1), d = D / leftSegs; s.box([0.4, h, d + 0.01], [BX - 0.2, h / 2, BZ + (i + 0.5) * d], wall); }
    s.box([0.4, ruin ? 5 : H, 0.4], [BX - 0.2, (ruin ? 5 : H) / 2, BZ - 0.2], wall);
    const dadoMat = s.material(P.dado, { roughness: 0.6 });
    s.box([W, 1.3, 0.06], [0, 0.65, BZ + 0.03], dadoMat);
    s.box([0.06, 1.3, D], [BX + 0.03, 0.65, 0], dadoMat);
    if (!ruin) {
      s.box([W + 0.5, 0.3, 0.6], [-0.1, H + 0.05, BZ - 0.15], columnMat);
      s.box([0.6, 0.3, D + 0.5], [BX - 0.15, H + 0.05, -0.1], columnMat);
      if (a.institution !== 'brutalist') { s.box([W, 0.12, 0.1], [0, H - 0.5, BZ + 0.05], trim); s.box([0.1, 0.12, D], [BX + 0.05, H - 0.5, 0], trim); }
    }

    // ---- High windows and their shafts of light ----
    const stainedHues = ['#d8423a', '#3a6fd8', '#e0a52a', '#3fa56a', '#a04fc8'];
    const paneHex = dim ? '#5f6f9a' : a.windows === 'stained' ? '#ffffff' : '#fdf6dc';
    const paneFor = (index: number) => {
      const hex = a.windows === 'stained' ? stainedHues[index % stainedHues.length] : paneHex;
      return new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: dim ? 0.35 : mix(0.5, 1.0, sun), roughness: 0.4, side: THREE.DoubleSide });
    };
    const winShape = (w: number, h: number) => {
      const shape = new THREE.Shape();
      if (a.windows === 'round') { shape.absarc(0, h * 0.72, Math.min(w, h) * 0.52, 0, Math.PI * 2, false); return shape; }
      shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0);
      if (a.windows === 'slits') { shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); }
      else { shape.lineTo(w / 2, h - w / 2); shape.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); }
      shape.closePath();
      return shape;
    };
    const shaftGroup: THREE.Mesh[] = [];
    const addWindow = (onLeft: boolean, along: number, y0: number, w: number, h: number, index: number) => {
      const mats = paneFor(index);
      const offsets = a.windows === 'slits' ? [-w * 0.3, w * 0.3] : [0];
      const ww = a.windows === 'slits' ? w * 0.28 : w;
      for (const off of offsets) {
        const pane = s.mesh(new THREE.ShapeGeometry(winShape(ww, h), 16), mats, onLeft ? [BX + 0.012, y0, along + off] : [along + off, y0, BZ + 0.012]);
        if (onLeft) pane.rotation.y = Math.PI / 2;
        pane.castShadow = false;
        const frameMat = a.institution === 'brutalist' ? dark : trim;
        if (a.windows !== 'round') {
          for (const fy of [0.33, 0.62]) s.box(onLeft ? [0.05, 0.06, ww] : [ww, 0.06, 0.05], onLeft ? [BX + 0.04, y0 + h * fy, along + off] : [along + off, y0 + h * fy, BZ + 0.04], frameMat);
          if (a.windows !== 'slits') s.box(onLeft ? [0.05, h * 0.92, 0.06] : [0.06, h * 0.92, 0.05], onLeft ? [BX + 0.04, y0 + h * 0.46, along] : [along, y0 + h * 0.46, BZ + 0.04], frameMat);
        } else {
          const ring = s.ring(Math.min(ww, h) * 0.52, 0.06, onLeft ? [BX + 0.04, y0 + h * 0.72, along] : [along, y0 + h * 0.72, BZ + 0.04], frameMat);
          if (onLeft) ring.rotation.y = Math.PI / 2;
        }
      }
      if (!onLeft) return;
      // A slab of light from the window down to a pool on the floor.
      const top = a.windows === 'round' ? y0 + h * 0.72 + w * 0.4 : y0 + h, bottom = a.windows === 'round' ? y0 + h * 0.72 - w * 0.4 : y0;
      const reach0 = bottom * mix(1.0, 1.5, mood.daylight), reach1 = top * mix(1.0, 1.5, mood.daylight), skew = mix(1.6, -0.6, mood.daylight);
      const z0 = along - w / 2, z1 = along + w / 2;
      const v = [
        BX + 0.1, bottom, z0, BX + 0.1, bottom, z1, BX + 0.1, top, z1, BX + 0.1, top, z0,
        BX + reach0, 0.03, z0 + skew, BX + reach0, 0.03, z1 + skew, BX + reach1, 0.03, z1 + skew * 1.4, BX + reach1, 0.03, z0 + skew * 1.4,
      ];
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geo.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0]);
      const tint = a.windows === 'stained' ? stainedHues[index % stainedHues.length] : new THREE.Color().setHSL(mix(0.58, 0.11, mood.warmth), 0.7, 0.86).getStyle();
      const shaft = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.26 * sun + (ruin ? 0.04 : 0), depthWrite: false, side: THREE.DoubleSide }));
      root.add(shaft);
      shaftGroup.push(shaft);
      const pool = new THREE.BufferGeometry();
      pool.setAttribute('position', new THREE.Float32BufferAttribute(v.slice(12), 3));
      pool.setIndex([0, 1, 2, 0, 2, 3]);
      root.add(new THREE.Mesh(pool, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.55 * sun, depthWrite: false, side: THREE.DoubleSide })));
    };
    const colZ = [-4.6, -1.9, 0.8, 3.5, 6.1];
    const leftWindowZ = [-3.25, -0.55, 2.15, 4.8];
    leftWindowZ.forEach((z, index) => { if (!ruin || random() < 0.8) addWindow(true, z, 2.7, 1.5, 3.0, index); });
    for (let i = 0; i < 5; i++) { const x = -6 + i * 3; if (a.over === 'clock' && i === 2 && a.institution !== 'brutalist') continue; if (!ruin || random() < 0.7) addWindow(false, x, 4.5, 1.5, 2.8, i + 1); }

    // ---- Colonnade along the left ----
    const CX = BX + 2.6, CH = ruin ? 6.2 : 6.2;
    const drums: P3[] = [];
    colZ.forEach((z, index) => {
      const broken = ruin && random() < 0.55;
      const h = broken ? 1.2 + random() * 3 : CH;
      if (a.institution === 'brutalist') {
        s.box([0.95, h, 0.95], [CX, h / 2, z], columnMat);
        for (let k = 1; k < 6; k++) s.box([0.97, 0.03, 0.97], [CX, k * 1.03, z], s.material('#948f85'));
      } else if (a.institution === 'soviet') {
        s.box([0.8, h, 0.8], [CX, h / 2, z], columnMat);
        s.box([1.0, 0.3, 1.0], [CX, 0.15, z], dadoMat);
        s.box([0.84, 1.0, 0.84], [CX, 0.8, z], dadoMat);
        if (!broken) s.box([1.05, 0.3, 1.05], [CX, h - 0.15, z], columnMat);
      } else if (a.institution === 'deco') {
        s.cylinder(0.46, 0.46, h, [CX, h / 2, z], columnMat, 8);
        s.box([1.15, 0.35, 1.15], [CX, 0.175, z], trim);
        for (const y of [0.9, 1.1, h - 1.3, h - 1.1, h - 0.9]) if (y < h) s.cylinder(0.48, 0.48, 0.09, [CX, y, z], trim, 8);
        if (!broken) { s.box([1.2, 0.2, 1.2], [CX, h - 0.3, z], trim); s.box([1.45, 0.2, 1.45], [CX, h - 0.1, z], columnMat); }
      } else {
        s.lathe([[0, 0], [0.62, 0], [0.62, 0.16], [0.52, 0.2], [0.56, 0.3], [0.44, 0.42]], columnMat, [CX, 0, z]);
        s.cylinder(0.37, 0.44, h - 0.42 - (broken ? 0 : 0.5), [CX, 0.42 + (h - 0.42 - (broken ? 0 : 0.5)) / 2, z], columnMat, 18);
        if (!broken) { s.lathe([[0.37, 0], [0.4, 0.08], [0.62, 0.3], [0.66, 0.42], [0, 0.42]], columnMat, [CX, h - 0.5, z]); s.box([1.3, 0.14, 1.3], [CX, h - 0.03, z], columnMat); s.cylinder(0.41, 0.41, 0.07, [CX, h - 0.52, z], trim, 18); }
      }
      if (broken) for (let k = 0; k < 2; k++) drums.push([CX + 1.2 + random() * 2.2, 0.4, z + (random() - 0.5) * 1.6]);
      void index;
    });
    for (const [x, y, z] of drums) { const drum = s.cylinder(0.4, 0.4, 0.9 + random() * 0.7, [x, y, z], columnMat, 14); drum.rotation.set(Math.PI / 2, 0, random() * 3); }
    if (!ruin) {
      s.box([1.25, 0.75, D + 0.2], [CX, CH + 0.375, 0], columnMat);
      if (a.institution !== 'brutalist') s.box([1.3, 0.1, D + 0.2], [CX, CH + 0.12, 0], trim);
      s.box([2.6, 0.2, D], [BX + 1.3, CH + 0.85, 0], wall);
    } else {
      s.box([1.25, 0.75, 4.2], [CX, CH + 0.375, BZ + 2.1], columnMat);
      const fallen = s.box([1.2, 0.7, 4.6], [CX + 1.8, 0.45, 3.4], columnMat);
      fallen.rotation.set(0.12, 0.35, 0.1);
    }

    // ---- The teller wall ----
    const bays = 7, bw = 1.5, TX0 = -bays * bw / 2 + 0.4, TZ = BZ + 1.7, CTOP = 1.1, GH = 1.35;
    const tellerLen = bays * bw;
    const tcx = TX0 + tellerLen / 2;
    s.box([tellerLen + 0.3, 0.14, 0.95], [tcx, 0.07, TZ], s.material(P.floorB));
    s.box([tellerLen + 0.2, CTOP - 0.14, 0.85], [tcx, 0.14 + (CTOP - 0.14) / 2, TZ], counterMat);
    s.box([tellerLen + 0.4, 0.07, 1.05], [tcx, CTOP + 0.035, TZ + 0.03], a.institution === 'brutalist' ? s.material('#3a2a20') : counterMat);
    if (a.institution === 'brutalist') s.box([tellerLen + 0.2, 0.3, 0.02], [tcx, 0.62, TZ + 0.435], s.material('#d96a1f'));
    else s.box([tellerLen + 0.42, 0.03, 1.07], [tcx, CTOP - 0.01, TZ + 0.03], trim);
    for (let i = 0; i < bays; i++) if (a.institution !== 'brutalist') s.box([bw - 0.3, 0.62, 0.03], [TX0 + (i + 0.5) * bw, 0.6, TZ + 0.435], s.material(new THREE.Color(P.counter).multiplyScalar(0.86)));
    const top = CTOP + 0.07;
    // Grille artwork: one alpha-tested texture for every bay.
    const gc = document.createElement('canvas');
    gc.width = 256; gc.height = 256;
    const g = gc.getContext('2d')!;
    const classical = a.institution === 'temple' || a.institution === 'deco' || ruin;
    if (classical) {
      g.strokeStyle = brassInk; g.fillStyle = brassInk; g.lineCap = 'round';
      if (a.institution === 'deco') {
        g.lineWidth = 6;
        for (let i = 0; i <= 14; i++) { const t = mix(-1.25, 1.25, i / 14); g.beginPath(); g.moveTo(128, 256); g.lineTo(128 + Math.sin(t) * 330, 256 - Math.cos(t) * 330); g.stroke(); }
        g.lineWidth = 9; for (const y of [60, 110]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
      } else {
        g.lineWidth = 7;
        for (let x = 12; x < 256; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
        g.lineWidth = 9; for (const y of [50, 150]) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
        for (let x = 23; x < 256; x += 22) { g.beginPath(); g.arc(x, 100, 9, 0, 7); g.lineWidth = 4; g.stroke(); }
      }
      // Solid wicket plate with an arched hole.
      g.fillRect(78, 150, 100, 106);
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.moveTo(96, 256); g.lineTo(96, 200); g.arc(128, 200, 32, Math.PI, 0); g.lineTo(160, 256); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.lineWidth = 10; g.strokeRect(5, 5, 246, 246);
    }
    const grilleTex = new THREE.CanvasTexture(gc);
    grilleTex.colorSpace = THREE.SRGBColorSpace;
    const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.45, roughness: mix(0.35, 0.75, mood.wear), color: ruin ? '#9a9f86' : '#ffffff' });
    const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe6e4', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false });
    const wood = s.material(P.counter);
    const servingCount = a.event === 'closing' ? 0 : Math.round(a.serving * bays);
    const order = Array.from({ length: bays }, (_unused, i) => i).sort(() => random() - 0.5);
    const openBays = new Set(order.slice(0, servingCount));
    const lampMats: THREE.MeshStandardMaterial[] = [];
    const nightBay = a.event === 'closing' ? Math.floor(random() * bays) : -1;
    const smashedBay = a.event === 'robbery' ? 2 + Math.floor(random() * 3) : -1;
    for (let i = 0; i <= bays; i++) {
      const x = TX0 + i * bw;
      if (ruin && random() < 0.3) continue;
      if (classical) { s.cylinder(0.05, 0.06, GH, [x, top + GH / 2, TZ], trim, 10); s.ball([0.08, 0.1, 0.08], [x, top + GH + 0.1, TZ], trim, 10); }
      else s.box([0.09, GH, 0.09], [x, top + GH / 2, TZ], a.institution === 'soviet' ? wood : trim);
    }
    if (!ruin) s.box([tellerLen, 0.09, 0.1], [tcx, top + GH, TZ], classical ? trim : a.institution === 'soviet' ? wood : trim);
    for (let i = 0; i < bays; i++) {
      const x = TX0 + (i + 0.5) * bw;
      const serving = openBays.has(i);
      if (classical) {
        if (!(ruin && random() < 0.5) && i !== smashedBay) {
          const grille = s.mesh(new THREE.PlaneGeometry(bw - 0.1, GH), grilleMat, [x, top + GH / 2, TZ]);
          if (ruin) grille.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.3);
        } else if (i === smashedBay) {
          const grille = s.mesh(new THREE.PlaneGeometry(bw - 0.1, GH), grilleMat, [x + 0.2, top + 0.2, TZ + 0.75]);
          grille.rotation.set(-1.3, 0.3, 0.2);
        }
      } else {
        if (i !== smashedBay) s.box([bw - 0.1, GH, 0.03], [x, top + GH / 2, TZ], glassMat);
        s.ring(0.11, 0.02, [x, top + 0.75, TZ + 0.02], a.institution === 'soviet' ? wood : trim);
        s.box([0.5, 0.05, 0.3], [x, top + 0.025, TZ + 0.05], a.institution === 'soviet' ? wood : trim);
        if (a.institution === 'brutalist') {
          const lit = serving ? 1.1 * glowScale : 0.08;
          s.box([0.7, 0.26, 0.12], [x, top + GH + 0.2, TZ], new THREE.MeshStandardMaterial({ color: '#f4efe2', emissive: '#fff4d0', emissiveIntensity: lit }));
          s.label(String(i + 1), 0.24, 0.2, [x, top + GH + 0.2, TZ + 0.065], '#2a2a2a', serving ? '#fff6dc' : '#bdb8aa');
        } else s.label(serving ? 'КАССА' : 'ЗАКРЫТО', 0.8, 0.2, [x, top + GH + 0.16, TZ + 0.06], '#f2e6c0', serving ? '#7a1f1f' : '#4a463c');
      }
      if (ruin) continue;
      // Teller side: a lamp when serving, a blind when not.
      const on = serving || i === nightBay;
      if (on) {
        const lamp = new THREE.MeshStandardMaterial({ color: '#1f7a4a', emissive: '#35d880', emissiveIntensity: 0.9 * glowScale + (i === nightBay ? 0.6 : 0) });
        lampMats.push(lamp);
        const shade = s.cylinder(0.09, 0.09, 0.34, [x - 0.4, top + 0.36, TZ - 0.22], lamp, 12);
        shade.rotation.z = Math.PI / 2;
        s.rod([x - 0.4, top, TZ - 0.24], [x - 0.4, top + 0.33, TZ - 0.24], 0.015, trim);
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.4 * glowScale, depthWrite: false }));
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x - 0.3, top + 0.006, TZ - 0.12);
        root.add(pool);
      } else if (a.event !== 'robbery') {
        s.box([bw - 0.16, GH - 0.1, 0.03], [x, top + GH / 2, TZ - 0.07], s.material(a.institution === 'brutalist' ? '#8a8477' : a.institution === 'soviet' ? '#c9c2a8' : '#5f6348', { roughness: 0.95 }));
        if (a.event !== 'closing') s.label(a.institution === 'soviet' ? 'ОБЕД' : 'CLOSED', 0.5, 0.16, [x, top + 0.42, TZ + 0.03], '#f2e6c0', '#7a1f1f');
      }
    }
    if (a.institution === 'brutalist') {
      // The concrete canopy with downlights over the counters.
      s.box([tellerLen + 1.2, 0.4, 2.3], [tcx, 3.35, BZ + 1.15], columnMat);
      for (let i = 0; i < bays; i++) s.cylinder(0.14, 0.14, 0.04, [TX0 + (i + 0.5) * bw, 3.14, TZ + 0.3], new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#fff0c0', emissiveIntensity: 1.2 * glowScale }), 14);
    }

    // ---- What presides over the teller wall ----
    const OY = a.institution === 'brutalist' ? 4.35 : 3.45, OZ = BZ + 0.04;
    const mottos = { temple: 'SECURITY · INDUSTRY · THRIFT', deco: 'SAVE TODAY FOR TOMORROW', brutalist: 'YOUR MONEY · OUR PROMISE', soviet: 'ХРАНИТЕ ДЕНЬГИ В СБЕРКАССЕ', gutted: 'SECURITY · INDUS RY · THR FT' }[a.institution];
    let hands: THREE.Object3D[] = [];
    if (a.over === 'clock') {
      const cy = a.institution === 'brutalist' ? 5.6 : 5.0, r = 1.05;
      s.cylinder(r + 0.14, r + 0.14, 0.14, [0, cy, OZ + 0.06], a.institution === 'brutalist' ? dark : trim, 36).rotation.x = Math.PI / 2;
      s.cylinder(r, r, 0.16, [0, cy, OZ + 0.06], s.material('#f4efe0'), 36).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; s.box([0.07, i % 3 ? 0.16 : 0.3, 0.02], [Math.sin(t) * r * 0.82, cy + Math.cos(t) * r * 0.82, OZ + 0.15], dark).rotation.z = -t; }
      const hour = { ordinary: 11.2, opening: 9.0, closing: 19.6, run: 14.9, robbery: 12.1 }[a.event] + (ruin ? random() * 6 : 0);
      const mk = (len: number, wdt: number, angle: number) => { const pivot = new THREE.Group(); pivot.position.set(0, cy, OZ + 0.17); pivot.rotation.z = -angle; root.add(pivot); pivot.add(s.box([wdt, len, 0.02], [0, len / 2 - 0.08, 0], dark)); return pivot; };
      hands = [mk(r * 0.55, 0.09, (hour / 12) * Math.PI * 2), mk(r * 0.85, 0.06, (hour % 1) * Math.PI * 2)];
    } else if (a.over === 'motto') {
      s.box([11.4, 1.0, 0.08], [tcx, OY, OZ], columnMat);
      s.label(mottos, 11.0, 0.8, [tcx, OY, OZ + 0.05], a.institution === 'deco' ? '#8a6a14' : '#3a362c', `#${new THREE.Color(P.column).getHexString()}`);
    } else if (a.over === 'rates') {
      s.box([6.4, 1.0, 0.1], [tcx, OY + 0.05, OZ], dark);
      const cols = ['USD 1.000', 'GBP 4.86', 'FRF 0.039', 'SAVINGS 3½%'];
      cols.forEach((text, i) => s.label(text, 1.45, 0.34, [tcx - 2.33 + i * 1.55, OY + 0.24, OZ + 0.06], a.institution === 'brutalist' ? '#ffb030' : '#f2e6c0', '#1a1a18'));
      ['LOANS 6%', 'GOLD 20.67', 'BONDS 4¼%', 'TIME 5%'].forEach((text, i) => s.label(text, 1.45, 0.34, [tcx - 2.33 + i * 1.55, OY - 0.16, OZ + 0.06], a.institution === 'brutalist' ? '#ffb030' : '#f2e6c0', '#1a1a18'));
    } else if (a.over === 'banner') {
      const text = { temple: 'DEPOSITS INSURED · CONFIDENCE RESTORED', deco: 'JOIN THE CHRISTMAS CLUB', brutalist: 'NEW! 24 HOUR CASH MACHINE', soviet: 'СЛАВА ТРУДУ · ХРАНИТЕ ДЕНЬГИ В СБЕРКАССЕ', gutted: 'CLOSED BY ORDER' }[a.institution];
      const red = a.institution === 'soviet' || a.institution === 'temple' || ruin;
      const banner = s.label(text, 10.5, 0.8, [tcx, OY, OZ + 0.08], red ? '#f6e2a0' : '#1f2a44', red ? '#a51d22' : '#f2e2a8');
      banner.rotation.z = ruin ? -0.07 : 0.01;
      for (const side of [-1, 1]) s.rod([tcx + side * 5.25, OY + 0.4, OZ + 0.08], [tcx + side * 5.5, OY + 0.75, OZ + 0.02], 0.02, dark);
    }
    if (a.institution === 'soviet') {
      // The obligatory framed portrait and a wall-mounted radio point.
      s.box([1.0, 1.3, 0.08], [BX + 5.0, 3.6, OZ], s.material('#6a4a2a'));
      s.box([0.84, 1.14, 0.02], [BX + 5.0, 3.6, OZ + 0.05], s.material('#8c8a7c'));
      s.ball([0.2, 0.25, 0.03], [BX + 5.0, 3.72, OZ + 0.06], s.material('#3a3a3a'), 12);
      s.box([0.5, 0.36, 0.03], [BX + 5.0, 3.26, OZ + 0.06], s.material('#3a3a3a'));
    }

    // ---- Vault door at the right end of the back wall ----
    if (a.vault) {
      const vx = 7.2, vy = 1.75, vr = 1.35;
      const steel = new THREE.MeshStandardMaterial({ color: ruin ? '#7a6a58' : '#b9c0c4', metalness: 0.55, roughness: mix(0.25, 0.8, grime) });
      s.cylinder(vr + 0.25, vr + 0.25, 0.12, [vx, vy, BZ + 0.06], trim, 36).rotation.x = Math.PI / 2;
      s.cylinder(vr, vr, 0.14, [vx, vy, BZ + 0.07], s.material('#0d0d0f'), 36).rotation.x = Math.PI / 2;
      const door = new THREE.Group();
      door.position.set(vx - vr - 0.2, vy, BZ + 0.25);
      door.rotation.y = -(a.event === 'robbery' || ruin ? 1.25 : a.event === 'closing' ? 0.0 : 0.5);
      root.add(door);
      const slab = s.cylinder(vr + 0.12, vr + 0.12, 0.32, [vr + 0.2, 0, 0], steel, 36); slab.rotation.x = Math.PI / 2; door.add(slab);
      const hub = s.cylinder(0.16, 0.16, 0.2, [vr + 0.2, 0, 0.22], trim, 14); hub.rotation.x = Math.PI / 2; door.add(hub);
      for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; door.add(s.rod([vr + 0.2, 0, 0.26], [vr + 0.2 + Math.cos(t) * 0.6, Math.sin(t) * 0.6, 0.26], 0.035, trim)); }
      const rim = s.ring(vr * 0.82, 0.04, [vr + 0.2, 0, 0.17], trim); door.add(rim);
      door.add(s.cylinder(0.12, 0.12, 1.9, [0, 0, 0], steel, 12));
    }

    // ---- Dressing on the open floor ----
    const ropeHex = { temple: '#8f1a2a', deco: '#1f5a3c', brutalist: '#5a3a1c', soviet: '#8f1a2a', gutted: '#5a3038' }[a.institution];
    const post = (x: number, z: number, down = false) => {
      const lathe = s.lathe([[0, 0], [0.19, 0], [0.19, 0.03], [0.06, 0.1], [0.035, 0.14], [0.035, 0.92], [0.07, 0.96], [0.07, 1.04], [0, 1.08]], trim, [x, 0, z]);
      if (down) { lathe.rotation.set(0, random() * 6, Math.PI / 2 - 0.18); lathe.position.y = 0.19; }
      return lathe;
    };
    const robbed = a.event === 'robbery';
    if (a.dressing === 'ropes' || a.event === 'run') {
      const n = 6, z = TZ + 2.0, xs = Array.from({ length: n }, (_unused, i) => TX0 + 0.8 + i * ((tellerLen - 1.6) / (n - 1)));
      const downIndex = robbed || a.event === 'run' || ruin ? 1 + Math.floor(random() * (n - 2)) : -1;
      xs.forEach((x, i) => post(x, z + (i === downIndex ? 0.5 : 0), i === downIndex));
      for (let i = 0; i < n - 1; i++) {
        if (i === downIndex || i + 1 === downIndex) { if (i === downIndex) s.tube([[xs[i - 1] ?? xs[0], 0.98, z], [xs[i - 1] + 0.1, 0.4, z + 0.05], [xs[i - 1] + 0.3, 0.04, z + 0.2], [xs[i - 1] + 0.9, 0.04, z + 0.5]], 0.035, s.material(ropeHex, { roughness: 1 })); continue; }
        const pts: P3[] = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([mix(xs[i], xs[i + 1], t), 0.98 - 0.26 * 4 * t * (1 - t), z]); }
        s.tube(pts, 0.035, s.material(ropeHex, { roughness: 1 }));
      }
    }
    if (a.dressing === 'palms') {
      const leaf = s.material(ruin ? '#7a7a4a' : '#3f7a44', { roughness: 0.8 });
      for (const z of [-3.25, -0.55, 2.15, 4.8]) {
        const x = CX + 0.2 + random() * 0.2;
        s.lathe([[0, 0], [0.28, 0], [0.24, 0.1], [0.34, 0.5], [0.4, 0.62], [0.36, 0.66]], a.institution === 'brutalist' ? s.material('#f0ece2') : trim, [x, 0, z]);
        s.cylinder(0.05, 0.07, 1.0, [x, 1.1, z], s.material('#6b5236'), 8);
        for (let k = 0; k < 8; k++) {
          const t = (k / 8) * Math.PI * 2 + random() * 0.4, tilt = 0.7 + random() * 0.5;
          const frond = s.mesh(new THREE.ConeGeometry(0.2, 1.5, 4), leaf, [x + Math.cos(t) * 0.5 * Math.sin(tilt), 1.6 + 0.55 * Math.cos(tilt), z + Math.sin(t) * 0.5 * Math.sin(tilt)]);
          frond.scale.z = 0.25;
          frond.rotation.order = 'YXZ';
          frond.rotation.set(0, -t + Math.PI / 2, 0);
          frond.rotateX(tilt);
        }
      }
    }
    if (a.dressing === 'benches') {
      const seat = s.material(a.institution === 'brutalist' ? '#d96a1f' : a.institution === 'temple' || a.institution === 'deco' ? '#5a3524' : '#8a6238');
      for (const z of [-3.25, -0.55, 2.15, 4.8]) {
        const x = CX + 1.0;
        s.box([0.55, 0.1, 2.0], [x, 0.45, z], seat);
        s.box([0.1, 0.55, 2.0], [x - 0.26, 0.75, z], seat);
        for (const e of [-0.9, 0.9]) s.box([0.5, 0.42, 0.1], [x, 0.21, z + e], a.institution === 'brutalist' ? trim : seat);
      }
    }
    const checkDesk = (x: number, z: number, turn: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z); grp.rotation.y = turn; root.add(grp);
      grp.add(s.box([0.9, 1.0, 0.4], [0, 0.5, 0], counterMat));
      grp.add(s.box([1.6, 0.07, 0.8], [0, 1.04, 0], counterMat));
      grp.add(s.box([1.62, 0.03, 0.82], [0, 1.0, 0], trim));
      grp.add(s.box([1.2, 0.2, 0.2], [0, 1.18, 0], dark));
      for (let k = 0; k < 5; k++) grp.add(s.box([0.16, 0.12, 0.22], [-0.48 + k * 0.24, 1.17, 0], s.material(['#f3ecd6', '#f1cfc8', '#cfe0ec', '#efe2a4', '#d5e8cf'][k])));
    };
    if (a.dressing === 'desks' || mood.density > 0.6) {
      checkDesk(7.6, -2.4, Math.PI / 2 + (random() - 0.5) * 0.2);
      if (a.dressing === 'desks') {
        checkDesk(7.6, 4.7, Math.PI / 2 + (random() - 0.5) * 0.2);
        // Guard's desk and chair by the columns.
        const gx = CX + 1.4, gz = 5.4;
        s.box([0.8, 0.78, 1.5], [gx, 0.39, gz], s.material('#5a3524'));
        s.box([0.9, 0.05, 1.6], [gx, 0.8, gz], s.material('#3f2618'));
        s.box([0.45, 0.06, 0.45], [gx - 0.75, 0.46, gz], s.material('#3f2618'));
        s.box([0.06, 0.6, 0.45], [gx - 0.96, 0.75, gz], s.material('#3f2618'));
        for (const ex of [-0.94, -0.56]) for (const ez of [-0.19, 0.19]) s.box([0.04, 0.45, 0.04], [gx + ex, 0.22, gz + ez], dark);
        s.cylinder(0.08, 0.1, 0.12, [gx, 0.89, gz + 0.4], dark, 12);
      }
    }

    // ---- People as plain figures, only at the teller wall ----
    const people: { at: P3; size: number; color: string }[] = [];
    const coatHex = ['#2e3138', '#4a4038', '#5a5f66', '#3a3f52', '#6b5a48', '#27352f'];
    if (a.event === 'run') {
      const n = Math.round(mix(26, 60, mood.density));
      for (let i = 0; i < n; i++) {
        const row = Math.floor(random() * random() * 4);
        people.push({ at: [TX0 + 0.3 + random() * (tellerLen - 0.6), 0, TZ + 0.75 + row * 0.42 + random() * 0.15], size: 0.92 + random() * 0.16, color: coatHex[i % coatHex.length] });
      }
    } else if (a.event === 'ordinary') {
      for (const i of openBays) { if (random() < 0.75) people.push({ at: [TX0 + (i + 0.5) * bw + (random() - 0.5) * 0.3, 0, TZ + 0.8], size: 0.95 + random() * 0.1, color: coatHex[i % coatHex.length] }); if (random() < mood.density * 0.7) people.push({ at: [TX0 + (i + 0.5) * bw + (random() - 0.5) * 0.3, 0, TZ + 1.5], size: 0.95 + random() * 0.1, color: coatHex[(i + 3) % coatHex.length] }); }
    }
    if (people.length) {
      const bodyGeo = new THREE.CapsuleGeometry(0.21, 1.05, 3, 10);
      bodyGeo.translate(0, 0.74, 0);
      s.scatter(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), people);
      const headGeo = new THREE.SphereGeometry(0.14, 10, 8);
      headGeo.translate(0, 1.62, 0);
      s.scatter(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8 }), people.map((p, i) => ({ at: p.at, size: p.size, color: ['#d9b89c', '#c59a78', '#8a5f44', '#e6c9ae'][i % 4] })));
      const hatGeo = new THREE.CylinderGeometry(0.13, 0.16, 0.12, 10);
      hatGeo.translate(0, 1.78, 0);
      s.scatter(hatGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), people.filter((_p, i) => i % 3 !== 2).map((p, i) => ({ at: p.at, size: p.size, color: coatHex[(i + 2) % coatHex.length] })));
    }

    // ---- Litter, loot and wreckage ----
    const sheets: { at: P3; size: number; color: string }[] = [];
    const paperCount = a.event === 'run' ? 70 : robbed ? 20 : Math.round(mood.wear * 24) + (ruin ? 20 : 0);
    for (let i = 0; i < paperCount; i++) sheets.push({ at: [BX + 2 + random() * (W - 3), 0.012 + random() * 0.004, BZ + 2.6 + random() * (D - 3.2)], size: 0.7 + random() * 0.8, color: ['#f1ecda', '#e6dfc8', '#d9d3c2'][i % 3] });
    if (robbed) {
      // A trail of notes from the smashed window to the way out.
      for (let i = 0; i < 90; i++) {
        const t = random();
        const x = mix(TX0 + (smashedBay + 0.5) * bw, 8.2, t) + (random() - 0.5) * (0.6 + t * 1.4);
        const z = mix(TZ + 0.8, 5.8, t * t) + (random() - 0.5) * (0.6 + t * 1.2);
        sheets.push({ at: [x, 0.014 + random() * 0.004, z], size: 0.8 + random() * 0.4, color: i % 5 ? '#86a97c' : '#9dbb92' });
      }
      const bx = 5.6, bz = -2.2;
      s.ball([0.38, 0.3, 0.32], [bx, 0.28, bz], s.material('#c9b98c', { roughness: 1 }), 14);
      s.cylinder(0.12, 0.07, 0.16, [bx + 0.28, 0.42, bz], s.material('#c9b98c', { roughness: 1 }), 10).rotation.z = -1.0;
      s.label('$', 0.26, 0.26, [bx - 0.02, 0.3, bz + 0.325], '#3a3327', '#c9b98c');
      const shards = Array.from({ length: 34 }, () => ({ at: [TX0 + (smashedBay + 0.5) * bw + (random() - 0.5) * 1.6, 0.02, TZ + 0.6 + random() * 1.1] as P3, size: 0.5 + random() * 1.2 }));
      s.scatter(new THREE.TetrahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: '#d5e6e4', roughness: 0.15 }), shards);
    }
    if (sheets.length) s.scatter(new THREE.BoxGeometry(0.3, 0.006, 0.2), new THREE.MeshStandardMaterial({ roughness: 1 }), sheets);
    let alarm: THREE.MeshStandardMaterial | null = null;
    if (robbed) {
      alarm = new THREE.MeshStandardMaterial({ color: '#ff3020', emissive: '#ff2010', emissiveIntensity: 2 });
      s.cylinder(0.26, 0.26, 0.14, [tcx + tellerLen / 2 + 0.9, 3.0, BZ + 0.08], s.material('#8a1a14'), 20).rotation.x = Math.PI / 2;
      s.ball([0.16, 0.16, 0.16], [tcx + tellerLen / 2 + 0.9, 3.0, BZ + 0.2], alarm, 12);
    }
    if (dim) {
      // Mop, bucket and a wet-floor board.
      const mx = 4.6, mz = -2.6;
      s.cylinder(0.2, 0.16, 0.32, [mx, 0.16, mz], s.material('#d0b020'), 14);
      s.rod([mx + 0.05, 0.1, mz], [mx + 0.5, 1.45, mz - 0.25], 0.02, s.material('#a5743e'));
      s.ball([0.16, 0.08, 0.16], [mx + 0.05, 0.36, mz], s.material('#d9d6cc', { roughness: 1 }), 10);
      for (const side of [-1, 1]) { const board = s.box([0.36, 0.62, 0.02], [mx - 1.0, 0.3, mz + side * 0.11], s.material('#f0c020')); board.rotation.x = side * -0.35; }
    }
    const birds: { group: THREE.Group; wingA: THREE.Mesh; wingB: THREE.Mesh; phase: number; radius: number; height: number; cx: number; cz: number }[] = [];
    if (ruin) {
      // Rubble, weeds, and the pigeons.
      const rubble = s.material('#bcb8ab', { roughness: 1 });
      const piles: P3[] = [[-5.2, 0, -3], [6.6, 0, -3.6], [-5, 0, 1.6], [7.6, 0, 4.8], [1.5, 0, -3.2]];
      for (const [px, , pz] of piles) for (let k = 0; k < 9; k++) {
        const size = 0.12 + random() * 0.32;
        const rock = s.mesh(new THREE.DodecahedronGeometry(size, 0), rubble, [px + (random() - 0.5) * 1.5, size * 0.6, pz + (random() - 0.5) * 1.2]);
        rock.rotation.set(random() * 3, random() * 3, 0);
      }
      const weed = s.material('#6f8a4a', { roughness: 1 });
      const tufts = Array.from({ length: 60 }, () => ({ at: [BX + 1 + random() * (W - 2), 0.1, BZ + 1 + random() * (D - 2)] as P3, size: 0.6 + random() * 1.4 }));
      s.scatter(new THREE.ConeGeometry(0.06, 0.34, 4), weed, tufts);
      const grey = s.material('#7f8790', { roughness: 0.8 }), neck = s.material('#5a7a78', { roughness: 0.5 });
      const perches: P3[] = [];
      for (let i = 0; i < bays; i++) perches.push([TX0 + (i + 0.5) * bw + (random() - 0.5) * 0.8, top, TZ + (random() - 0.5) * 0.5]);
      for (let i = 0; i < 9; i++) perches.push([BX + 3 + random() * (W - 5), 0, BZ + 3 + random() * (D - 4.5)]);
      for (const [px, py, pz] of perches) {
        const bird = new THREE.Group();
        bird.position.set(px, py, pz); bird.rotation.y = random() * 6; bird.scale.setScalar(1.5); root.add(bird);
        bird.add(s.ball([0.07, 0.065, 0.12], [0, 0.08, 0], grey, 10));
        bird.add(s.ball([0.04, 0.04, 0.045], [0, 0.16, 0.09], neck, 8));
        bird.add(s.mesh(new THREE.ConeGeometry(0.012, 0.04, 4), s.material('#c9a23a'), [0, 0.155, 0.14])).rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 4 + Math.round(mood.energy * 5); i++) {
        const bird = new THREE.Group();
        bird.scale.setScalar(1.6); root.add(bird);
        bird.add(s.ball([0.07, 0.06, 0.13], [0, 0, 0], grey, 10));
        const wing = () => { const m = s.mesh(new THREE.ConeGeometry(0.1, 0.34, 3), grey); m.scale.z = 0.12; return m; };
        const wingA = wing(), wingB = wing();
        wingA.position.x = 0.14; wingA.rotation.z = -Math.PI / 2; wingB.position.x = -0.14; wingB.rotation.z = Math.PI / 2;
        bird.add(wingA, wingB);
        const flight = { group: bird, wingA, wingB, phase: random() * 6, radius: 1.5 + random() * 3, height: 3.4 + random() * 3.2, cx: -1 + random() * 4, cz: -1.5 + random() * 3 };
        bird.position.set(flight.cx + Math.cos(flight.phase) * flight.radius, flight.height, flight.cz + Math.sin(flight.phase) * flight.radius);
        birds.push(flight);
      }
    }

    const energy = mood.energy;
    world.update = (dt, time) => {
      if (alarm) alarm.emissiveIntensity = Math.sin(time * mix(4, 12, energy)) > 0 ? 2.6 : 0.25;
      if (hands.length) { hands[1].rotation.z -= dt * 0.02 * (ruin ? 0 : 1); hands[0].rotation.z -= dt * 0.02 / 12 * (ruin ? 0 : 1); }
      for (const [i, shaft] of shaftGroup.entries()) (shaft.material as THREE.MeshBasicMaterial).opacity = (0.26 * sun + (ruin ? 0.04 : 0)) * (1 + Math.sin(time * 0.4 + i) * 0.08);
      for (const lamp of lampMats) lamp.emissiveIntensity = 0.9 * glowScale * (1 - energy * 0.15 * Math.max(0, Math.sin(time * 19 + lampMats.indexOf(lamp))));
      for (const b of birds) {
        const t = b.phase + time * mix(0.25, 1.1, energy);
        b.group.position.set(b.cx + Math.cos(t) * b.radius, b.height + Math.sin(t * 1.7) * 0.4, b.cz + Math.sin(t) * b.radius);
        b.group.rotation.y = -t;
        const flap = Math.sin(time * 14 + b.phase) * 0.7;
        b.wingA.rotation.y = flap; b.wingB.rotation.y = -flap;
      }
    };
    return world;
  },
});
