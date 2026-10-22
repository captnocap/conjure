import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

const PALETTES = {
  rainbow: 'Every colour of the rainbow in order, a festival classic.',
  circus: 'Red and white, like a big top or a boiled sweet.',
  sunset: 'Orange, magenta and gold, a flame against the sky.',
  sky: 'Blues and white that almost vanish into the air.',
  earth: 'Brown, burnt orange, mustard and cream, straight from the 1970s.',
  mono: 'Black with gold, severe and expensive.',
  pastel: 'Soft pink, mint, lemon and powder blue, gentle and dreamy.',
} as const;
const COLOURS: Record<keyof typeof PALETTES, string[]> = {
  rainbow: ['#e63946', '#f4a21c', '#f7dc3a', '#3aa655', '#2f7fd1', '#7b47b5'],
  circus: ['#d42a2a', '#f7f1e3'],
  sunset: ['#ff7a1a', '#e8336d', '#ffc233', '#7a2a8c'],
  sky: ['#2f6fb5', '#8ec7ee', '#f4f8fb', '#1d3f78'],
  earth: ['#7a4a2a', '#d9822b', '#e3b93c', '#efe3c2'],
  mono: ['#1c1c22', '#d4a934', '#1c1c22', '#f1ece0'],
  pastel: ['#f6b6c8', '#b9e3d0', '#fbe7a1', '#bcd3f2'],
};
const BANNERS = { married: 'JUST MARRIED', goodbye: 'GOODBYE', marry: 'MARRY ME', festival: 'BALLOON FIESTA', up: 'UP', sale: 'EVERYTHING MUST GO' } as const;

export default defineThing({
  questions: {
    era: choice('What kind of balloon is it?', {
      modern: 'A modern rip-stop nylon teardrop with a wicker basket and twin propane burners.',
      victorian: 'A Victorian gas balloon: a varnished silk sphere under a rope net, the basket slung from a wooden load ring with sandbags.',
      montgolfier: 'An eighteenth-century Montgolfier: an ornate royal paper globe with gold swags and suns over a railed gallery and a straw fire.',
      homemade: 'A home-sewn escape balloon of bedsheets and tarpaulin over a bare steel platform with gas bottles lashed to the corners.',
    }),
    pattern: choice('What is the envelope pattern?', {
      stripes: 'Bold vertical stripes running from mouth to crown.',
      spiral: 'Stepped diagonal bands that spiral around the envelope.',
      chevrons: 'Zigzag chevron bands stacked up the envelope.',
      patchwork: 'A patchwork quilt of mismatched panels.',
      plain: 'One plain colour with a single contrasting belt.',
      novelty: 'A novelty special shape: a giant cat head with ears, eyes and whiskers.',
    }),
    palette: choice('What colours is it?', PALETTES),
    burner: choice('What is the burner doing?', {
      cold: 'Off and silent: the balloon is drifting on the heat it has.',
      pilot: 'Only a small blue pilot light.',
      steady: 'A steady orange flame.',
      roar: 'A full roaring blast that lights the whole envelope from inside like a lantern.',
    }),
    crew: choice('Who is in the basket?', {
      nobody: 'Nobody: it stands or drifts unmanned.',
      pilot: 'A lone pilot with one hand up on the burner.',
      couple: 'A couple standing close together, one pointing at the view.',
      crowd: 'A packed basket of tourists.',
      aeronaut: 'A gentleman aeronaut in a top hat with a brass telescope.',
      dog: 'Only a dog, front paws up on the rim.',
    }),
    moment: choice('What is happening to it right now?', {
      aloft: 'Flying free and taut, nothing attached.',
      tethered: 'Tethered: mooring lines run out from the basket to stakes in the ground.',
      banner: 'Carrying a long message banner wrapped around its belly.',
      bunting: 'Dressed for a festival with strings of pennants and a flag at the crown.',
      slumping: 'Just landed: the envelope sagging and leaning over as the hot air spills out.',
    }),
    message: choice('If it carries a banner, what does it say?', BANNERS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = new THREE.Color('#9a968c');
    const tone = (hex: string) => {
      const c = new THREE.Color(hex);
      c.lerp(grey, (1 - mood.cheer) * 0.3 + mood.wear * 0.15);
      c.offsetHSL((mood.warmth - 0.5) * 0.03, 0, 0);
      return c;
    };
    const pal = COLOURS[a.palette].map((hex) => `#${tone(hex).getHexString()}`);
    const novelty = a.pattern === 'novelty';

    // Envelope shape: a cone from the mouth tangent to a sphere, measured from the mouth upward.
    const shape = {
      modern: { R: 8, tangent: 0.6, mouth: 1.6, y0: 3.1 },
      victorian: { R: 6.6, tangent: 1.1, mouth: 0.6, y0: 5.2 },
      montgolfier: { R: 7, tangent: 0.9, mouth: 3.2, y0: 2.3 },
      homemade: { R: 6.4, tangent: 0.45, mouth: 1.5, y0: 3.0 },
    }[a.era];
    const R = shape.R * (novelty ? 0.92 : 1), tangent = novelty ? Math.max(shape.tangent, 0.85) : shape.tangent;
    const reach = (R * Math.cos(tangent) - shape.mouth) / Math.sin(tangent);
    const centre = reach * Math.cos(tangent) + R * Math.sin(tangent);
    const profile: [number, number][] = [];
    for (let i = 0; i < 6; i++) profile.push([mix(shape.mouth, R * Math.cos(tangent), i / 6), mix(0, reach * Math.cos(tangent), i / 6)]);
    const arcPoints = 26;
    for (let i = 0; i <= arcPoints; i++) {
      const angle = mix(-tangent, Math.PI / 2, i / arcPoints);
      profile.push([Math.max(R * Math.cos(angle), 0.02), centre + R * Math.sin(angle)]);
    }
    const equatorV = (6 + (tangent / (tangent + Math.PI / 2)) * arcPoints) / (profile.length - 1);

    // Painted fabric: u runs around the gores, v from the mouth to the crown.
    const W = 1024, H = 512, gores = 24, rows = 12;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d')!;
    const cw = W / gores, ch = H / rows;
    const scraps = [...pal, '#d8d2c0', '#8aa0a8', '#c98f8f', '#a8b56e', '#e9e2d0'];
    for (let i = 0; i < gores; i++)
      for (let j = 0; j < rows; j++) {
        let colour = pal[0];
        if (a.pattern === 'stripes') colour = pal[i % pal.length];
        else if (a.pattern === 'patchwork') colour = scraps[Math.floor(random() * scraps.length)];
        else if (a.pattern === 'plain' && (j === 5 || j === 6)) colour = pal[1];
        g.fillStyle = colour;
        g.fillRect(i * cw, H - (j + 1) * ch, cw + 1, ch + 1);
      }
    const yOf = (v: number) => (1 - v) * H;
    if (a.pattern === 'spiral') {
      // Sheared bands: each climbs a third of the way round between mouth and crown.
      const band = W / 12, shear = W / 3;
      for (let i = -6; i < 13; i++) {
        g.fillStyle = pal[((i % pal.length) + pal.length) % pal.length];
        g.beginPath(); g.moveTo(i * band, H); g.lineTo((i + 1) * band + 1, H); g.lineTo((i + 1) * band + shear + 1, 0); g.lineTo(i * band + shear, 0); g.fill();
      }
    } else if (a.pattern === 'chevrons') {
      const band = H / 7, period = W / 6, amp = band * 0.9;
      for (let b = 9; b >= -1; b--) {
        g.fillStyle = pal[((b % pal.length) + pal.length) % pal.length];
        g.beginPath(); g.moveTo(0, 0);
        for (let k = 0; k <= 12; k++) g.lineTo(k * period / 2, b * band + (k % 2 ? amp : -amp));
        g.lineTo(W, 0); g.fill();
      }
    }
    if (novelty) {
      // The face sits on the front (u = 0.5) around the equator.
      const cx = W / 2, cy = yOf(equatorV) - 10;
      g.fillStyle = pal[1 % pal.length];
      g.beginPath(); g.ellipse(cx, cy + 62, 74, 52, 0, 0, Math.PI * 2); g.fill();
      for (const side of [-1, 1]) {
        g.fillStyle = '#f6f3df'; g.beginPath(); g.ellipse(cx + side * 62, cy - 22, 30, 36, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#16181c'; g.beginPath(); g.ellipse(cx + side * 62, cy - 18, 11, 30, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#16181c'; g.lineWidth = 4;
        for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(cx + side * 40, cy + 58 + k * 6); g.lineTo(cx + side * 150, cy + 50 + k * 26); g.stroke(); }
      }
      g.fillStyle = '#d6566e'; g.beginPath(); g.moveTo(cx - 18, cy + 30); g.lineTo(cx + 18, cy + 30); g.lineTo(cx, cy + 50); g.fill();
      g.strokeStyle = '#16181c'; g.lineWidth = 5; g.beginPath();
      g.moveTo(cx, cy + 50); g.quadraticCurveTo(cx - 6, cy + 84, cx - 38, cy + 74);
      g.moveTo(cx, cy + 50); g.quadraticCurveTo(cx + 6, cy + 84, cx + 38, cy + 74); g.stroke();
    }
    if (a.era === 'victorian') {
      g.fillStyle = 'rgba(214,176,98,0.38)'; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(70,52,34,0.75)'; g.lineWidth = 2;
      const top = yOf(1), bottom = yOf(equatorV - 0.12);
      for (let i = -gores; i < gores * 2; i++) {
        g.beginPath(); g.moveTo(i * cw, top); g.lineTo((i + 7) * cw, bottom); g.stroke();
        g.beginPath(); g.moveTo(i * cw, top); g.lineTo((i - 7) * cw, bottom); g.stroke();
      }
      g.lineWidth = 5; g.beginPath(); g.moveTo(0, bottom); g.lineTo(W, bottom); g.stroke();
    } else if (a.era === 'montgolfier') {
      g.fillStyle = 'rgba(28,48,128,0.34)'; g.fillRect(0, 0, W, H);
      const gold = '#e2b64a';
      g.fillStyle = gold;
      for (const v of [0.2, equatorV - 0.1, equatorV + 0.2]) g.fillRect(0, yOf(v) - 7, W, 14);
      g.strokeStyle = gold; g.lineWidth = 6;
      for (let i = 0; i < 12; i++) {
        const x = (i + 0.5) * (W / 12);
        g.beginPath(); g.arc(x, yOf(equatorV + 0.2) + 4, W / 24 - 2, 0, Math.PI); g.stroke();
        g.beginPath(); g.arc(x, yOf(equatorV + 0.05), 15, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 10; k++) { const t = k * Math.PI / 5; g.beginPath(); g.moveTo(x + Math.cos(t) * 19, yOf(equatorV + 0.05) + Math.sin(t) * 19); g.lineTo(x + Math.cos(t) * 30, yOf(equatorV + 0.05) + Math.sin(t) * 30); g.stroke(); }
      }
    } else if (a.era === 'homemade') {
      const cloth = ['#e9e4d2', '#c9d8e2', '#e6c9c0', '#6f8fae', '#b9c48a', '#d9b24c', '#7a8a6a', '#e8e8e8'];
      for (let i = 0; i < 90; i++) {
        const w = cw * (1 + Math.floor(random() * 3)), h = ch * (1 + Math.floor(random() * 2));
        const x = Math.floor(random() * gores) * cw, y = Math.floor(random() * rows) * ch;
        g.fillStyle = cloth[Math.floor(random() * cloth.length)];
        g.globalAlpha = 0.9; g.fillRect(x, y, w, h); g.globalAlpha = 1;
        if (random() < 0.4) { g.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 14; k++) g.fillRect(x + random() * w, y + random() * h, 4, 4); }
        g.setLineDash([5, 4]); g.strokeStyle = 'rgba(40,36,30,0.6)'; g.lineWidth = 1.5; g.strokeRect(x + 2, y + 2, w - 4, h - 4); g.setLineDash([]);
      }
    }
    // Gore seams, a dark fire-proof skirt, the crown cap, then weather.
    g.strokeStyle = 'rgba(20,20,20,0.28)'; g.lineWidth = 2;
    for (let i = 0; i <= gores; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, H); g.stroke(); }
    g.strokeStyle = 'rgba(20,20,20,0.12)';
    for (let j = 1; j < rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(W, j * ch); g.stroke(); }
    g.fillStyle = a.era === 'montgolfier' ? '#e2b64a' : '#2b2a2e'; g.fillRect(0, yOf(0.05), W, H);
    g.fillStyle = pal[pal.length - 1]; g.globalAlpha = 0.85; g.fillRect(0, 0, W, yOf(0.955)); g.globalAlpha = 1;
    for (let i = 0; i < mood.wear * 60; i++) {
      g.fillStyle = `rgba(${60 + random() * 40},${50 + random() * 30},${40},${0.1 + random() * 0.18})`;
      g.beginPath(); g.ellipse(random() * W, random() * H, 8 + random() * 40, 8 + random() * 30, random() * 3, 0, Math.PI * 2); g.fill();
    }
    const soot = g.createLinearGradient(0, yOf(0.3), 0, H);
    soot.addColorStop(0, 'rgba(20,16,12,0)'); soot.addColorStop(1, `rgba(20,16,12,${0.15 + mood.wear * 0.5})`);
    g.fillStyle = soot; g.fillRect(0, yOf(0.3), W, H);
    const fabricMap = new THREE.CanvasTexture(canvas);
    fabricMap.colorSpace = THREE.SRGBColorSpace;
    fabricMap.wrapS = THREE.RepeatWrapping;
    fabricMap.anisotropy = 4;

    const glow = { cold: 0, pilot: 0.04, steady: 0.22, roar: 0.6 }[a.burner];
    const fabric = new THREE.MeshStandardMaterial({ map: fabricMap, roughness: 0.72, side: THREE.DoubleSide, emissive: '#ffb066', emissiveMap: fabricMap, emissiveIntensity: glow });
    const lathe = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 96);
    // Each gore bulges slightly between its load tapes.
    const position = lathe.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const phi = Math.atan2(x, z);
      const lumpy = a.era === 'homemade' ? 1 + 0.04 * Math.sin(phi * 3 + position.getY(i) * 0.6) : 1;
      const k = (1 - 0.035 * (1 - Math.abs(Math.sin(phi * gores / 2)))) * lumpy;
      position.setX(i, x * k); position.setZ(i, z * k);
    }
    lathe.computeVertexNormals();
    const env = new THREE.Group();
    env.position.set(0, shape.y0, 0);
    s.root.add(env);
    const skin = s.mesh(lathe, fabric);
    skin.rotation.y = Math.PI;
    env.add(skin);
    const inEnv = <T extends THREE.Object3D>(node: T) => { env.add(node); return node; };

    const rope = s.material('#8a7350', { roughness: 0.95 });
    const steel = s.material('#aeb4b6', { metalness: 0.8, roughness: 0.3 });
    const dark = s.material('#2a2c30', { roughness: 0.7 });
    const leather = s.material('#5a3a22', { roughness: 0.8 });
    const wood = s.material('#8a5d38', { roughness: 0.75 });
    const cap = inEnv(s.cylinder(0.9, 1.1, 0.25, [0, centre + R - 0.05, 0], a.era === 'montgolfier' ? s.material('#e2b64a', { metalness: 0.5 }) : dark));
    cap.castShadow = true;
    if (novelty)
      for (const side of [-1, 1]) {
        const ear = inEnv(s.mesh(new THREE.ConeGeometry(R * 0.36, R * 0.62, 4), s.material(pal[0], { roughness: 0.72 }), [side * R * 0.56, centre + R * 0.86, 0]));
        ear.rotation.set(0, Math.PI / 4, -side * 0.5);
        ear.scale.z = 0.55;
      }

    // Wicker, painted once and wrapped round the basket.
    const weave = document.createElement('canvas');
    weave.width = weave.height = 128;
    const w2 = weave.getContext('2d')!;
    w2.fillStyle = '#9a6c3a'; w2.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
      w2.fillStyle = (x + y) % 2 ? '#b98a4e' : '#7d5329';
      w2.fillRect(x * 16 + (y % 2) * 8 - 8, y * 8 + 1, 14, 6);
      w2.fillRect(x * 16 + (y % 2) * 8 + 120, y * 8 + 1, 14, 6);
    }
    const weaveMap = new THREE.CanvasTexture(weave);
    weaveMap.colorSpace = THREE.SRGBColorSpace;
    weaveMap.wrapS = weaveMap.wrapT = THREE.RepeatWrapping;
    weaveMap.repeat.set(4, 3);
    const wicker = new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.9, color: tone('#ffffff') });

    const wide = a.crew === 'crowd' ? 2.9 : 1.6;
    const deep = 1.25, rim = 1.15;
    let burnerY = 2.2;
    let standRadius = 0, floorY = 0.12;
    if (a.era === 'montgolfier') {
      // A firebox drum under the neck with a railed gallery around it.
      s.cylinder(3.25, 3.4, 1.1, [0, 0.55, 0], s.material('#3a3340'), 32);
      s.cylinder(4.5, 4.5, 0.14, [0, 1.07, 0], wood, 40);
      s.mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.85, 40, 1, true), new THREE.MeshStandardMaterial({ map: weaveMap, roughness: 0.9, side: THREE.DoubleSide, color: '#f0d9a0' }), [0, 1.55, 0]);
      s.ring(4.5, 0.07, [0, 1.98, 0], s.material('#e2b64a', { metalness: 0.5 })).rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; s.rod([Math.cos(t) * 4.45, 1.1, Math.sin(t) * 4.45], [Math.cos(t) * 3.3, shape.y0 + 0.2, Math.sin(t) * 3.3], 0.04, rope); }
      inEnv(s.mesh(new THREE.CylinderGeometry(shape.mouth, shape.mouth, 1.3, 40, 1, true), s.material('#e2b64a', { side: THREE.DoubleSide, roughness: 0.6 }), [0, -0.6, 0]));
      burnerY = 1.2; standRadius = 3.9; floorY = 1.14;
      for (let i = 0; i < 9; i++) s.rod([(random() - 0.5) * 2, 1.1, (random() - 0.5) * 2], [(random() - 0.5) * 1.6, 1.5 + random() * 0.3, (random() - 0.5) * 1.6], 0.05, s.material('#c9a84e'));
    } else if (a.era === 'homemade') {
      // A welded platform with corner posts, a washing-line rail and gas bottles.
      s.box([1.5, 0.08, 1.5], [0, 0.3, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.rod([x * 0.7, 0, z * 0.7], [x * 0.7, 2.1, z * 0.7], 0.035, steel);
        s.cylinder(0.16, 0.16, 0.8, [x * 0.5, 0.74, z * 0.5], s.material(x * z > 0 ? '#b8452e' : '#8e9aa0', { metalness: 0.3 }), 14);
        s.ball([0.16, 0.1, 0.16], [x * 0.5, 1.14, z * 0.5], dark, 12);
        s.rod([x * 0.7, 2.1, z * 0.7], [x * 0.95, shape.y0 + 0.5, z * 0.95], 0.02, rope);
      }
      for (const y of [0.75, 1.15]) for (const [x1, z1, x2, z2] of [[-0.7, -0.7, 0.7, -0.7], [0.7, -0.7, 0.7, 0.7], [0.7, 0.7, -0.7, 0.7], [-0.7, 0.7, -0.7, -0.7]]) s.rod([x1, y, z1], [x2, y, z2], 0.012, rope);
      s.rod([0, 0.34, 0], [0, 2.0, 0], 0.05, dark);
      s.cylinder(0.18, 0.1, 0.25, [0, 2.1, 0], dark, 12);
      floorY = 0.34;
    } else {
      const hung = a.era === 'victorian';
      s.mesh(new THREE.BoxGeometry(wide, rim, deep), wicker, [0, rim / 2 + 0.04, 0]);
      s.box([wide - 0.12, 0.02, deep - 0.12], [0, rim + 0.045, 0], s.material('#2c2118'));
      for (const z of [-1, 1]) s.rod([-wide / 2, rim + 0.05, z * deep / 2], [wide / 2, rim + 0.05, z * deep / 2], 0.055, leather);
      for (const x of [-1, 1]) s.rod([x * wide / 2, rim + 0.05, -deep / 2], [x * wide / 2, rim + 0.05, deep / 2], 0.055, leather);
      s.box([wide + 0.06, 0.08, deep + 0.06], [0, 0.04, 0], leather);
      for (const x of [-0.4, 0.4]) s.ring(0.12, 0.018, [x * wide / 1.6, rim * 0.55, deep / 2 + 0.01], rope, Math.PI).rotation.z = Math.PI;
      if (hung) {
        const ringY = 3.3;
        s.ring(0.95, 0.07, [0, ringY, 0], wood).rotation.x = Math.PI / 2;
        for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([x * wide / 2, rim, z * deep / 2], [x * 0.67, ringY, z * 0.67], 0.02, rope);
        for (let i = 0; i < 16; i++) {
          const t = i * Math.PI / 8, top = R * Math.cos(-0.12) * 0.98;
          inEnv(s.rod([Math.cos(t) * 0.95, ringY - shape.y0, Math.sin(t) * 0.95], [Math.cos(t) * top, centre - R * 0.12, Math.sin(t) * top], 0.02, rope));
        }
        inEnv(s.rod([0, 0, 0], [0.3, -1.6, 0.2], 0.04, rope));
        // Ballast hangs outside the basket, as it should.
        for (let i = 0; i < 5; i++) {
          const x = mix(-wide / 2 + 0.2, wide / 2 - 0.2, i / 4), drop = 0.35 + random() * 0.15;
          s.rod([x, rim, deep / 2 + 0.05], [x, rim - drop, deep / 2 + 0.12], 0.012, rope);
          s.ball([0.11, 0.16, 0.1], [x, rim - drop - 0.14, deep / 2 + 0.13], s.material('#cdbf9c', { roughness: 0.95 }), 10);
        }
        s.rod([wide / 2 + 0.05, rim, 0], [wide / 2 + 0.2, 0.25, 0.1], 0.015, rope);
        s.ring(0.14, 0.025, [wide / 2 + 0.2, 0.14, 0.1], dark, Math.PI);
        burnerY = -10;
      } else {
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          s.rod([x * (wide / 2 - 0.06), rim, z * (deep / 2 - 0.06)], [x * 0.55, 2.05, z * 0.45], 0.03, leather);
          for (const k of [0.75, 1.25]) s.rod([x * 0.55, 2.05, z * 0.45], [x * shape.mouth * k * 0.8, shape.y0 + 0.2 + (k - 0.75) * 1.4, z * shape.mouth * k * 0.8], 0.012, steel);
          s.cylinder(0.15, 0.15, 0.85, [x * (wide / 2 - 0.2), 0.6, z * (deep / 2 - 0.2)], steel, 12);
        }
        s.box([1.16, 0.05, 0.96], [0, 2.05, 0], steel);
        for (const x of [-0.24, 0.24]) {
          s.cylinder(0.17, 0.12, 0.34, [x, 2.25, 0], steel, 16);
          s.cylinder(0.05, 0.05, 0.2, [x, 1.95, 0], dark, 10);
        }
        burnerY = 2.42;
      }
    }

    // Flame: see-through, so it never counts toward the measured shape.
    const flames: THREE.Mesh[] = [];
    const flameHeight = { cold: 0, pilot: 0.35, steady: 2.2, roar: 4.6 }[a.burner] * (a.era === 'montgolfier' ? 0.7 : 1);
    if (flameHeight > 0 && burnerY > 0) {
      const hot = a.burner === 'pilot' ? '#5aa8ff' : '#ff8a1e';
      const sources = a.era === 'modern' ? [-0.24, 0.24] : [0];
      for (const x of sources) for (const [width, colour, opacity] of [[1, hot, 0.75], [0.5, '#fff0a8', 0.9]] as const) {
        const base = (a.era === 'montgolfier' ? 1.1 : 0.2) * width * (a.burner === 'pilot' ? 0.4 : 1);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(base, flameHeight * (0.6 + width * 0.4), 14, 1, true), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
        flame.position.set(x, burnerY + flameHeight * (0.6 + width * 0.4) / 2, 0);
        s.root.add(flame);
        flames.push(flame);
      }
    }

    // The people (or the dog) aboard.
    const shirts = ['#c8452f', '#2f6aa8', '#e2b23a', '#3d8a5a', '#8a4a9a', '#e8e4d8', '#30343c'].map((c) => tone(c));
    const skinTones = ['#e9c4a0', '#c58c62', '#8a5a3c', '#f1d3b8'];
    const person = (x: number, z: number, turn: number, options: { hat?: 'top' | 'cap'; armUp?: boolean; point?: boolean; scope?: boolean; height?: number } = {}) => {
      const body = new THREE.Group();
      const height = options.height ?? 1.62 + random() * 0.2;
      const shirt = new THREE.MeshStandardMaterial({ color: options.hat === 'top' ? '#23232a' : shirts[Math.floor(random() * shirts.length)], roughness: 0.8 });
      const flesh = new THREE.MeshStandardMaterial({ color: skinTones[Math.floor(random() * skinTones.length)], roughness: 0.7 });
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, px: number, py: number, pz: number) => {
        const mesh = new THREE.Mesh(geometry, material); mesh.position.set(px, py, pz); mesh.castShadow = true; body.add(mesh); return mesh;
      };
      add(new THREE.CylinderGeometry(0.15, 0.17, height * 0.5, 10), new THREE.MeshStandardMaterial({ color: '#3a3f4a', roughness: 0.85 }), 0, height * 0.25, 0);
      add(new THREE.CylinderGeometry(0.2, 0.17, height * 0.34, 10), shirt, 0, height * 0.67, 0);
      add(new THREE.SphereGeometry(0.12, 12, 10), flesh, 0, height * 0.93, 0);
      for (const side of [-1, 1]) {
        const arm = add(new THREE.CylinderGeometry(0.05, 0.045, height * 0.36, 8), shirt, side * 0.25, height * 0.66, 0);
        if (side === 1 && options.armUp) { arm.position.set(0.24, height * 0.98, 0); arm.rotation.z = -0.15; }
        else if (side === 1 && (options.point || options.scope)) { arm.position.set(0.26, height * 0.8, 0.22); arm.rotation.x = -1.35; }
        else arm.rotation.z = side * 0.12;
      }
      if (options.scope) add(new THREE.CylinderGeometry(0.03, 0.045, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#c9a03c', metalness: 0.8, roughness: 0.3 }), 0.12, height * 0.93, 0.36).rotation.x = Math.PI / 2;
      if (options.hat === 'top') { add(new THREE.CylinderGeometry(0.11, 0.1, 0.24, 14), shirt, 0, height + 0.13, 0); add(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 14), shirt, 0, height + 0.02, 0); }
      if (options.hat === 'cap') add(new THREE.SphereGeometry(0.125, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), shirt, 0, height * 0.95, 0);
      body.position.set(x, floorY, z);
      body.rotation.y = turn;
      s.root.add(body);
    };
    const spot = (i: number, n: number): [number, number] => standRadius
      ? [Math.sin((i - (n - 1) / 2) * 0.28) * standRadius, Math.cos((i - (n - 1) / 2) * 0.28) * standRadius]
      : [mix(-wide / 2 + 0.3, wide / 2 - 0.3, n === 1 ? 0.5 : i / (n - 1)), 0.22 + (i % 2) * -0.35];
    if (a.crew === 'pilot') { const [x, z] = spot(0, 1); person(x, standRadius ? z : -0.2, 0, { hat: 'cap', armUp: !standRadius && a.era !== 'victorian' }); }
    else if (a.crew === 'couple') { for (let i = 0; i < 2; i++) { const [x, z] = spot(i, 2); person(standRadius ? x : (i - 0.5) * 0.5, standRadius ? z : 0.25, (0.5 - i) * 0.5, { point: i === 1, height: i ? 1.62 : 1.8 }); } }
    else if (a.crew === 'crowd') { const n = standRadius ? 8 : 7; for (let i = 0; i < n; i++) { const [x, z] = spot(i, n); person(x, z, (random() - 0.5) * 1.2, { hat: random() < 0.4 ? 'cap' : undefined, point: random() < 0.3 }); } }
    else if (a.crew === 'aeronaut') { const [x, z] = spot(0, 1); person(x, standRadius ? z : 0.2, 0.3, { hat: 'top', scope: true, height: 1.8 }); }
    else if (a.crew === 'dog') {
      const [x, z0] = spot(0, 1);
      const z = standRadius ? z0 + 0.25 : deep / 2 - 0.28, top = a.era === 'montgolfier' ? 1.98 : a.era === 'homemade' ? 1.15 : rim + 0.1;
      const fur = s.material(['#b8773a', '#e8e0d0', '#3a3028'][Math.floor(random() * 3)], { roughness: 0.95 });
      s.rod([x, floorY + 0.25, z - 0.3], [x, top + 0.05, z + 0.02], 0.15, fur, 0.13);
      s.ball([0.14, 0.13, 0.17], [x, top + 0.22, z + 0.1], fur, 12);
      s.ball([0.07, 0.06, 0.1], [x, top + 0.19, z + 0.26], fur, 10);
      s.ball([0.03, 0.03, 0.03], [x, top + 0.21, z + 0.35], dark, 8);
      for (const side of [-1, 1]) {
        s.ball([0.04, 0.1, 0.06], [x + side * 0.12, top + 0.25, z + 0.04], fur, 8);
        s.rod([x + side * 0.1, top - 0.1, z - 0.05], [x + side * 0.1, top + 0.03, z + 0.2], 0.04, fur);
      }
    }

    // What is happening to it.
    const equatorY = shape.y0 + centre;
    if (a.moment === 'tethered') {
      const hold = a.era === 'montgolfier' ? 1.98 : a.era === 'victorian' ? 3.3 : 2.05;
      for (let i = 0; i < 3; i++) {
        const t = i * Math.PI * 2 / 3 + 0.5 + random() * 0.3, far = 8 + random() * 2.5;
        const start = a.era === 'montgolfier' ? 4.5 : 0.6;
        s.rod([Math.cos(t) * start, hold, Math.sin(t) * start], [Math.cos(t) * far, 0.25, Math.sin(t) * far], 0.03, rope);
        s.rod([Math.cos(t) * (far + 0.25), 0, Math.sin(t) * (far + 0.25)], [Math.cos(t) * (far - 0.1), 0.5, Math.sin(t) * (far - 0.1)], 0.05, wood);
      }
    } else if (a.moment === 'banner') {
      const text = BANNERS[a.message];
      const banner = document.createElement('canvas');
      banner.width = 1024; banner.height = 160;
      const b = banner.getContext('2d')!;
      b.fillStyle = '#f6f1e2'; b.fillRect(0, 0, 1024, 160);
      b.strokeStyle = '#b3261e'; b.lineWidth = 10; b.strokeRect(8, 8, 1008, 144);
      b.fillStyle = '#b3261e'; b.textAlign = 'center'; b.textBaseline = 'middle';
      b.font = `bold ${Math.min(112, 1500 / text.length)}px sans-serif`;
      b.fillText(text, 512, 84, 960);
      const bannerMap = new THREE.CanvasTexture(banner);
      bannerMap.colorSpace = THREE.SRGBColorSpace;
      const arc = 1.5, radius = R * Math.cos(0.12) + 0.12;
      const wrap = inEnv(s.mesh(new THREE.CylinderGeometry(radius, radius * 0.99, arc * radius * 0.16, 40, 1, true, -arc / 2, arc), new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.8, side: THREE.DoubleSide }), [0, centre - R * 0.12, 0]));
      wrap.castShadow = false;
    } else if (a.moment === 'bunting') {
      const flags: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let line = 0; line < 6; line++) {
        const t = line * Math.PI / 3 + 0.3;
        const ax = Math.cos(t) * R * 1.0, az = Math.sin(t) * R * 1.0;
        const foot: [number, number, number] = [Math.cos(t) * 0.8, a.era === 'montgolfier' ? 2 : 1.2, Math.sin(t) * 0.8];
        s.rod(foot, [ax, equatorY - 0.5, az], 0.012, rope);
        for (let k = 1; k < 12; k++) flags.push({ at: [mix(foot[0], ax, k / 12), mix(foot[1], equatorY - 0.5, k / 12) - 0.18, mix(foot[2], az, k / 12)], size: 1, color: pal[(k + line) % pal.length] });
      }
      const pennant = new THREE.ConeGeometry(0.2, 0.42, 3);
      pennant.rotateX(Math.PI); pennant.scale(1, 1, 0.15);
      s.scatter(pennant, new THREE.MeshStandardMaterial({ roughness: 0.8 }), flags);
      const top = shape.y0 + centre + R;
      s.rod([0, top, 0], [0, top + 2.2, 0], 0.035, wood);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), new THREE.MeshStandardMaterial({ color: pal[0], side: THREE.DoubleSide, roughness: 0.8 }));
      flag.position.set(0.8, top + 1.7, 0); flag.castShadow = true; s.root.add(flag);
    } else if (a.moment === 'slumping') {
      env.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.26, 0.4, random());
      env.scale.set(1.1, 0.74, 1.1);
      for (let i = 0; i < 2; i++) { const t = random() * Math.PI * 2; s.rod([Math.cos(t) * 0.8, 1, Math.sin(t) * 0.8], [Math.cos(t) * 5, 0.03, Math.sin(t) * 5], 0.025, rope); }
    }

    const energy = mix(0.4, 2.2, mood.energy);
    const sway = clamp01(mood.energy) * 0.012;
    const baseTilt = env.rotation.z;
    return s.finish({
      footprint: a.era === 'montgolfier' ? 4.8 : 3.2,
      update: (_dt, time) => {
        flames.forEach((flame, index) => {
          const pulse = 0.88 + 0.12 * Math.sin(time * 9 * energy + index * 1.7) + 0.06 * Math.sin(time * 23 * energy + index);
          flame.scale.set(pulse, 0.9 + 0.2 * Math.sin(time * 6 * energy + index), pulse);
        });
        env.rotation.z = baseTilt + Math.sin(time * 0.5 * energy) * sway;
      },
    });
  },
});
