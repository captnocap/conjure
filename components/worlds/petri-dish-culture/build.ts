import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';
import { MEDIA, MEDIA_COLOUR, TAU, dome, gloss, painted, wobble } from './plate';

const PIGMENTS = {
  cream: 'Cream-white colonies, like drops of custard.',
  gold: 'Golden-yellow colonies.',
  pink: 'Salmon-pink colonies.',
  red: 'Blood-red pigmented colonies.',
  green: 'Dark colonies with a metallic green sheen.',
  mixed: 'A mixture: several species in different colours, an unclean sample.',
} as const;
const PIGMENT_COLOUR = { cream: '#efe4c4', gold: '#f0b92a', pink: '#f09a8c', red: '#b3182a', green: '#3c9a4c' } as const;
const SLOTS = [[0, 0.9], [-4.1, -1.9, 0, 0.9], [4.1, -1.6, 0, 0.9], [-2.6, 4.5, 0, 0.7], [2.9, 4.6, 0, 0.7]] as const;

export default defineWorld({
  questions: {
    medium: choice('What gel fills the dish?', MEDIA),
    growth: choice('What has grown across the plain?', {
      streak: 'A four-quadrant streak: zigzag roads of growth that thin out into single colonies.',
      scatter: 'Separate colonies scattered everywhere, a landscape of low hills.',
      lawn: 'A solid matte lawn of growth pocked with round clear holes.',
      outbreak: 'Contamination: fuzzy mould blooms creeping in from the rim over everything else.',
      barren: 'Almost nothing: one or two lone colonies on an empty plain.',
    }),
    pigment: choice('What colour is the growth?', PIGMENTS),
    lid: choice('Where is the lid?', {
      leaning: 'Standing behind the dish, fogged with condensation, filling the sky like a huge pale moon.',
      propped: 'Tipped open and resting on the back rim like the lid of a clam.',
      cracked: 'Standing behind the dish with a crack running across it.',
      gone: 'Nowhere: the dish is open to the air.',
    }),
    note: choice('If there is a lid, what is written on it in marker?', {
      blank: 'Nothing.',
      routine: 'Initials, a date and a plate number.',
      warn: 'DO NOT THROW AWAY.',
      doubt: 'CONTAM ??',
      strain: 'A strain name and a temperature.',
      danger: 'A biohazard warning: DO NOT OPEN.',
    }),
    marks: choice('What has been drawn on the underside of the dish, showing through the gel?', {
      none: 'Nothing.',
      grid: 'A counting grid of squares.',
      sectors: 'Lines dividing the plate into lettered sectors.',
      counted: 'A dot beside every colony and a running total.',
    }),
    setting: choice('Where is the dish sitting?', {
      night: 'A dark lab at night: the lightbox is the only thing on.',
      incubator: 'Inside an incubator, in close orange warmth.',
      bench: 'On an ordinary bench in flat daylight.',
      fridge: 'In the cold blue-white of the cold room.',
    }),
    glow: score('How strongly does the lightbox under the dish shine up through the gel?', ['Switched off', 'A faint glow', 'Bright', 'Blazing, the gel lit like a lamp']),
    neighbours: noul('Are there stacks of other dishes standing nearby?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const light = {
      night: { bg: '#737d90', hemi: 0.7, key: 1.5, sky: '#b4c2e2', keyTint: '#cfd9ff' },
      incubator: { bg: '#d9b98c', hemi: 1.1, key: 2.1, sky: '#ffe2b8', keyTint: '#ffd9a2' },
      bench: { bg: '#e5e6dd', hemi: 1.4, key: 2.7, sky: '#f1f2ff', keyTint: '#fff6e6' },
      fridge: { bg: '#cfdde6', hemi: 1.3, key: 2.2, sky: '#e2f1ff', keyTint: '#dcecff' },
    }[a.setting];
    const { art: s, world } = diorama(context, { background: light.bg, floor: null, width: 15.4, depth: 15.4, pitch: 38, yaw: 20, maxHeight: 4.2, radius: 1.85, slots: SLOTS });
    const hemisphere = s.root.children.find((node) => (node as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight;
    const gelColour = new THREE.Color(MEDIA_COLOUR[a.medium]).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.12, 0);
    hemisphere.intensity = light.hemi;
    hemisphere.color.set(light.sky);
    hemisphere.groundColor.copy(gelColour).lerp(new THREE.Color('#777365'), 1 - a.glow * 0.8);
    world.keyLight!.intensity = light.key;
    world.keyLight!.color.set(light.keyTint).offsetHSL((mood.warmth - 0.5) * 0.06, 0, 0);
    const up = new THREE.DirectionalLight(gelColour.clone().lerp(new THREE.Color('#ffffff'), 0.5), a.glow * 0.9);
    up.position.set(0, -10, 2);
    s.root.add(up);

    // Lightbox: a glowing table with a dark frame.
    const boxGlow = new THREE.MeshStandardMaterial({ color: '#f4f2e6', emissive: '#fff7dc', emissiveIntensity: mix(0.02, 1.1, a.glow), roughness: 0.6 });
    s.box([18, 0.5, 17.4], [0, -1.05, 0], boxGlow);
    const frame = s.material('#3a3f45', { roughness: 0.6 });
    for (const side of [-1, 1]) { s.box([0.7, 0.9, 18.8], [side * 9.3, -0.95, 0], frame); s.box([19.3, 0.9, 0.7], [0, -0.95, side * 9.05], frame); }

    // The gel. Old plates dry out and shrink away from the wall.
    const dry = Math.max(0, mood.wear - 0.45) / 0.55;
    const wallR = 7.35, gelR = 7.15 - dry * 0.5, faceR = gelR - 0.08;
    const clear = (x: number, z: number, r: number) => Math.hypot(x, z) + r < gelR - 0.25 && SLOTS.every(([sx, sz, , size = 1]) => Math.hypot(sx - x, sz - z) > 1.95 * size + r);
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const tones = (Object.keys(PIGMENT_COLOUR) as (keyof typeof PIGMENT_COLOUR)[]);
    const pigment = () => new THREE.Color(PIGMENT_COLOUR[a.pigment === 'mixed' ? pick(tones) : a.pigment]).offsetHSL(0, (mood.cheer - 0.5) * 0.15, (random() - 0.5) * 0.06);
    const main = new THREE.Color(PIGMENT_COLOUR[a.pigment === 'mixed' ? 'cream' : a.pigment]);

    // Plan the growth before painting, so marks and stains can follow it.
    const hills: { x: number; z: number; r: number }[] = [];
    const beads: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const roads: [number, number][][] = [];
    const holes: { x: number; z: number; r: number }[] = [];
    const blooms: { x: number; z: number; r: number }[] = [];
    const sow = (count: number, rMin: number, rMax: number, bias = 1.6) => {
      for (let i = 0, tries = 0; i < count && tries < count * 40; tries++) {
        const angle = random() * TAU, d = Math.sqrt(random()) * gelR, x = Math.cos(angle) * d, z = Math.sin(angle) * d, r = mix(rMin, rMax, random() ** bias);
        if (!clear(x, z, r) || hills.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + r + 0.1) || blooms.some((b) => Math.hypot(b.x - x, b.z - z) < b.r + r + 0.5)) continue;
        hills.push({ x, z, r });
        i++;
      }
    };
    if (a.growth === 'streak') {
      for (let k = 0; k < 4; k++) {
        const theta = 2.5 + k * 1.5, cx = Math.cos(theta) * 4.4, cz = Math.sin(theta) * 4.4, tx = -Math.sin(theta), tz = Math.cos(theta);
        const strokes = 9 - k * 2, road: [number, number][] = [];
        if (k > 0) road.push([Math.cos(theta - 1.1) * 4.8, Math.sin(theta - 1.1) * 4.8]);
        for (let i = 0; i < strokes; i++) { const u = (i / (strokes - 1) - 0.5) * 5.2, v = (i % 2 ? 1 : -1) * (1.7 - k * 0.1); road.push([cx + tx * u + Math.cos(theta) * v, cz + tz * u + Math.sin(theta) * v]); }
        roads.push(road);
        const spacing = mix(0.16, 0.75, k / 3) / mix(0.7, 1.3, mood.density);
        road.slice(1).forEach(([x, z], i) => {
          const [px, pz] = road[i], steps = Math.max(1, Math.round(Math.hypot(x - px, z - pz) / spacing));
          for (let j = 0; j < steps; j++) {
            const t = (j + random() * 0.6) / steps, bx = mix(px, x, t) + (random() - 0.5) * 0.18, bz = mix(pz, z, t) + (random() - 0.5) * 0.18, r = mix(0.17, 0.4, k / 3) * (0.7 + random() * 0.7);
            if (k === 3 && random() < 0.6) { if (clear(bx, bz, r * 2)) hills.push({ x: bx, z: bz, r: r * (1.5 + random() * 1.5) }); } else if (clear(bx, bz, r)) beads.push({ at: [bx, 0, bz], size: r, color: pigment() });
          }
        });
      }
    } else if (a.growth === 'scatter') sow(Math.round(mix(16, 52, mood.density)), 0.2, 1.15);
    else if (a.growth === 'lawn') {
      for (let i = 0; i < Math.round(mix(9, 26, mood.density)); i++) { const angle = random() * TAU, d = Math.sqrt(random()) * (gelR - 0.8); holes.push({ x: Math.cos(angle) * d, z: Math.sin(angle) * d, r: 0.3 + random() * 0.6 }); }
      sow(5, 0.15, 0.35);
    } else if (a.growth === 'outbreak') {
      const count = Math.round(mix(2, 5, mood.density));
      for (let i = 0, tries = 0; i < count && tries < 200; tries++) {
        const angle = random() * TAU, r = 1.3 + random() * 1.5, d = gelR - r * (0.7 + random() * 0.5), x = Math.cos(angle) * d, z = Math.sin(angle) * d;
        if (SLOTS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.7 + r * 0.8) || blooms.some((b) => Math.hypot(b.x - x, b.z - z) < (b.r + r) * 0.8)) continue;
        blooms.push({ x, z, r });
        i++;
      }
      sow(Math.round(mix(10, 30, mood.density)), 0.18, 0.8);
    } else sow(1 + Math.floor(random() * 2), 0.45, 0.9, 1);

    const px = (v: number, size: number) => (0.5 + v / (2 * faceR)) * size;
    const mm = (v: number, size: number) => (v / (2 * faceR)) * size;
    const map = painted(1024, 1024, (ctx, w, h) => {
      const shown = gelColour.clone();
      ctx.fillStyle = `#${shown.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      // The lamp beneath is brightest in the middle.
      const lamp = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      lamp.addColorStop(0, `rgba(255,250,225,${0.1 + a.glow * 0.28})`);
      lamp.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = lamp;
      ctx.fillRect(0, 0, w, h);
      const tone = `#${main.getHexString()}`;
      ctx.lineJoin = ctx.lineCap = 'round';
      if (a.growth === 'lawn') {
        const sheet = document.createElement('canvas');
        sheet.width = w; sheet.height = h;
        const g = sheet.getContext('2d')!;
        g.fillStyle = tone;
        g.fillRect(0, 0, w, h);
        for (let i = 0; i < 7000; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(50,30,10,0.1)'; g.beginPath(); g.arc(random() * w, random() * h, 1 + random() * 3.5, 0, TAU); g.fill(); }
        g.globalCompositeOperation = 'destination-out';
        for (const hole of holes) { const fade = g.createRadialGradient(px(hole.x, w), px(hole.z, h), mm(hole.r, w) * 0.75, px(hole.x, w), px(hole.z, h), mm(hole.r, w)); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fade; g.beginPath(); g.arc(px(hole.x, w), px(hole.z, h), mm(hole.r, w), 0, TAU); g.fill(); }
        ctx.globalAlpha = 0.93;
        ctx.drawImage(sheet, 0, 0);
        ctx.globalAlpha = 1;
      }
      for (const [k, road] of roads.entries()) {
        ctx.strokeStyle = tone;
        ctx.globalAlpha = mix(0.75, 0.28, k / 3);
        ctx.lineWidth = mm(mix(0.5, 0.2, k / 3), w);
        ctx.beginPath();
        for (const [x, z] of road) ctx.lineTo(px(x, w), px(z, h));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const bloom of blooms) { const halo = ctx.createRadialGradient(px(bloom.x, w), px(bloom.z, h), mm(bloom.r, w), px(bloom.x, w), px(bloom.z, h), mm(bloom.r * 1.5, w)); halo.addColorStop(0, 'rgba(255,252,230,0.5)'); halo.addColorStop(1, 'rgba(255,252,230,0)'); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(px(bloom.x, w), px(bloom.z, h), mm(bloom.r * 1.5, w), 0, TAU); ctx.fill(); }
      // Marker on the underside of the dish.
      const pen = a.medium === 'violet' || a.medium === 'blood' || a.medium === 'chocolate' ? 'rgba(12,12,20,0.75)' : 'rgba(20,30,110,0.6)';
      ctx.strokeStyle = ctx.fillStyle = pen;
      ctx.lineWidth = 5;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (a.marks === 'grid') { for (let i = -7; i <= 7; i++) { ctx.lineWidth = i % 5 === 0 ? 6 : 2.5; ctx.beginPath(); ctx.moveTo(px(i * 1.05, w), 0); ctx.lineTo(px(i * 1.05, w), h); ctx.moveTo(0, px(i * 1.05, h)); ctx.lineTo(w, px(i * 1.05, h)); ctx.stroke(); } }
      else if (a.marks === 'sectors') {
        const count = 3 + Math.floor(random() * 3), start = random() * TAU;
        ctx.font = 'italic bold 78px sans-serif';
        for (let i = 0; i < count; i++) {
          const angle = start + (i / count) * TAU;
          ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.lineTo(w / 2 + Math.cos(angle) * w * 0.5 + (random() - 0.5) * 20, h / 2 + Math.sin(angle) * h * 0.5); ctx.stroke();
          const mid = angle + Math.PI / count;
          ctx.fillText(String.fromCharCode(65 + i), w / 2 + Math.cos(mid) * w * 0.4, h / 2 + Math.sin(mid) * h * 0.4);
        }
      } else if (a.marks === 'counted') {
        for (const hill of hills) { ctx.beginPath(); ctx.arc(px(hill.x + hill.r + 0.12, w), px(hill.z - hill.r * 0.4, h), 5.5, 0, TAU); ctx.fill(); }
        ctx.font = 'italic bold 58px sans-serif';
        ctx.save(); ctx.translate(w / 2, h * 0.9); ctx.rotate(-0.05);
        ctx.fillText(hills.length > 45 || a.growth === 'lawn' ? 'TNTC' : `n = ${Math.max(hills.length, 1)}`, 0, 0);
        ctx.restore();
      }
      // Drying cracks.
      ctx.strokeStyle = 'rgba(40,24,12,0.7)';
      for (let i = 0; i < dry * 9; i++) {
        let angle = random() * TAU, x = w / 2 + Math.cos(angle) * w * 0.49, y = h / 2 + Math.sin(angle) * h * 0.49;
        angle += Math.PI;
        ctx.lineWidth = 2 + dry * 4;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < 3 + random() * 3; k++) { angle += (random() - 0.5) * 1.2; x += Math.cos(angle) * (40 + random() * 70); y += Math.sin(angle) * (40 + random() * 70); ctx.lineTo(x, y); }
        ctx.stroke();
      }
    });
    const gel = new THREE.MeshPhysicalMaterial({ color: gelColour, roughness: 0.25, clearcoat: 0.5, emissive: gelColour, emissiveIntensity: mix(0.06, 0.7, a.glow) });
    s.lathe([[0, -0.55], [gelR, -0.55], [gelR, -0.07], [faceR, 0], [0, 0]], gel);
    const face = s.mesh(new THREE.CircleGeometry(faceR, 80), new THREE.MeshPhysicalMaterial({ map, roughness: mix(0.28, 0.7, dry), clearcoat: 0.5 * (1 - dry), emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.05, 0.6, a.glow) }), [0, 0.006, 0]);
    face.rotation.x = -Math.PI / 2;
    face.castShadow = false;
    world.ground = face;

    // The dish: mostly seen as its bright rim.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1f4', transparent: true, opacity: 0.16, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const bright = s.material('#f1fafb', { roughness: 0.15, emissive: '#cfeaf0', emissiveIntensity: 0.3 + a.glow * 0.4 });
    s.mesh(new THREE.CylinderGeometry(wallR, wallR, 2.3, 96, 1, true), glass, [0, 0.4, 0]).castShadow = false;
    const ring = (radius: number, tube: number, y: number, material: THREE.Material) => { const mesh = s.mesh(new THREE.TorusGeometry(radius, tube, 8, 120), material, [0, y, 0]); mesh.rotation.x = Math.PI / 2; return mesh; };
    ring(wallR, 0.075, 1.55, bright);
    ring(wallR, 0.06, -0.72, s.material('#a9c3c9', { roughness: 0.3 }));
    const floorGlass = s.mesh(new THREE.CircleGeometry(wallR, 80), new THREE.MeshPhysicalMaterial({ color: '#dff1f4', transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), [0, -0.74, 0]);
    floorGlass.rotation.x = -Math.PI / 2;

    // Hills.
    const smooth: { at: [number, number, number]; size: number; color: THREE.Color }[] = beads.slice();
    const metal = a.pigment === 'green';
    const skin = gloss('#ffffff', { vertexColors: true, roughness: mix(0.14, 0.5, dry), metalness: metal ? 0.5 : 0, emissive: metal ? '#1d5a22' : '#000000', emissiveIntensity: metal ? 0.3 : 0 });
    for (const hill of hills) {
      if (hill.r < 0.32) { smooth.push({ at: [hill.x, 0, hill.z], size: hill.r, color: pigment() }); continue; }
      const edge = wobble(random, 4, 3), fold = wobble(random, 3, 8), tone = pigment(), kind = Math.floor(random() * 4);
      const outline = (angle: number) => hill.r * (kind === 2 ? 0.85 + 0.22 * edge(angle) : 1 + 0.05 * edge(angle));
      const profile = (t: number, angle: number) => {
        const round = Math.sqrt(Math.max(0, 1 - t * t));
        if (kind === 0) return hill.r * 0.45 * round;
        if (kind === 1) return hill.r * (0.3 * round + 0.07 * Math.sin(t * 15 + fold(angle) * 2) * (1 - t));
        if (kind === 2) return hill.r * 0.14 * (1 - t ** 5);
        return hill.r * (0.1 * (1 - t ** 6) + 0.32 * Math.exp(-((t / 0.33) ** 2)));
      };
      s.mesh(dome(outline, profile, 8, 30, (t) => tone.clone().offsetHSL(0, 0, (t - 0.5) * 0.08)), skin, [hill.x, 0, hill.z]).rotation.y = random() * TAU;
    }
    if (smooth.length) s.scatter(new THREE.SphereGeometry(1, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.55, 1), gloss('#ffffff', { roughness: mix(0.14, 0.5, dry), metalness: metal ? 0.5 : 0 }), smooth);
    if (a.growth === 'lawn') {
      const lips = holes.filter((hole) => clear(hole.x, hole.z, 0)).map((hole) => ({ at: [hole.x, 0.012, hole.z] as [number, number, number], size: hole.r * 1.06 }));
      if (lips.length) s.scatter(new THREE.TorusGeometry(1, 0.06, 5, 28).rotateX(Math.PI / 2), s.material(main.clone().offsetHSL(0, 0, -0.08), { roughness: 0.9 }), lips).castShadow = false;
    }
    // Mould: ringed felt with a white margin and a stubble of spore heads.
    if (blooms.length) {
      const felt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
      const spores: { at: [number, number, number]; size: number }[] = [];
      for (const bloom of blooms) {
        const edge = wobble(random, 4, 3), rings = 3 + Math.floor(random() * 3);
        const green = new THREE.Color(pick(['#3f8f88', '#5f9a84', '#84a082', '#3d6f78']));
        s.mesh(dome((angle) => bloom.r * (1 + 0.07 * edge(angle)), (t) => Math.max(0.01, 0.22 * (1 - t ** 6) * (1 + 0.25 * Math.cos(t * rings * TAU))), 14, 56,
          (t) => (t > 0.8 ? '#f3f2e8' : green.clone().offsetHSL(0, 0, 0.07 * Math.cos(t * rings * TAU)))), felt, [bloom.x, 0, bloom.z]);
        for (let i = 0; i < 46; i++) { const angle = random() * TAU, d = Math.sqrt(random()) * bloom.r * 0.7; if (clear(bloom.x + Math.cos(angle) * d, bloom.z + Math.sin(angle) * d, -0.6)) spores.push({ at: [bloom.x + Math.cos(angle) * d, 0.2, bloom.z + Math.sin(angle) * d], size: 0.3 + random() * 0.45 }); }
      }
      const brush = new THREE.CylinderGeometry(0.03, 0.05, 1, 4).translate(0, 0.5, 0);
      s.scatter(brush, s.material('#e9ebdc', { roughness: 0.9 }), spores);
      s.scatter(new THREE.IcosahedronGeometry(0.2, 0), s.material('#3f7f78', { roughness: 1, flatShading: true }), spores.map((spore) => ({ at: [spore.at[0], 0.2 + spore.size, spore.at[2]] as [number, number, number], size: spore.size })));
    }

    // The lid: fog, droplets and someone's handwriting.
    if (a.lid !== 'gone') {
      const text = { blank: [], routine: [`${pick(['JP', 'A.L.', 'MK', 'RDS'])}  ${1 + Math.floor(random() * 28)}/${1 + Math.floor(random() * 12)}`, `plate ${1 + Math.floor(random() * 9)}`], warn: ['DO NOT', 'THROW AWAY'], doubt: ['CONTAM ??'], strain: [pick(['E. coli K-12', 'S. aureus', 'B. subtilis', 'unknown #7']), '37C  O/N'], danger: ['BIOHAZARD', 'DO NOT OPEN'] }[a.note] as string[];
      const fog = painted(1024, 1024, (ctx, w, h) => {
        const mist = ctx.createRadialGradient(w / 2, h * 0.55, w * 0.05, w / 2, h / 2, w / 2);
        const thick = mix(0.25, 0.6, mood.warmth * 0.5 + (a.setting === 'incubator' ? 0.5 : a.setting === 'fridge' ? 0.3 : 0.1));
        mist.addColorStop(0, `rgba(255,255,255,${thick})`);
        mist.addColorStop(1, `rgba(255,255,255,${thick * 0.35})`);
        ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2 - 2, 0, TAU); ctx.clip();
        ctx.fillStyle = mist;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 520; i++) {
          const x = random() * w, y = random() * h, r = 2 + random() ** 3 * 15;
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(90,110,125,0.5)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (r > 9 && random() < 0.4) { ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(x - r * 0.3, y, r * 0.6, 30 + random() * 120); }
        }
        ctx.fillStyle = ctx.strokeStyle = a.note === 'danger' || a.note === 'warn' ? 'rgba(190,20,30,0.92)' : 'rgba(18,20,30,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        text.forEach((line, row) => {
          let size = row === 0 ? 120 : 92;
          ctx.font = `italic bold ${size}px sans-serif`;
          const wide = ctx.measureText(line).width;
          if (wide > w * 0.7) { size *= (w * 0.7) / wide; ctx.font = `italic bold ${size}px sans-serif`; }
          ctx.save(); ctx.translate(w / 2, h * (0.3 + row * 0.15) - (text.length === 1 ? -h * 0.06 : 0)); ctx.rotate(-0.07 + (random() - 0.5) * 0.05); ctx.fillText(line, 0, 0); ctx.restore();
        });
        if (a.lid === 'cracked') {
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          let x = w * (0.1 + random() * 0.2), y = h * 0.15;
          for (const width of [7, 3]) { ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); let cx = x, cy = y; while (cy < h * 0.95) { cx += 20 + random() * 70; cy += 30 + random() * 80; ctx.lineTo(cx, cy); } ctx.stroke(); x += 180; y += 240; }
        }
      });
      const lidR = 7.6, lid = new THREE.Group();
      const pane = new THREE.Mesh(new THREE.CircleGeometry(lidR, 96), new THREE.MeshStandardMaterial({ map: fog, transparent: true, depthWrite: false, roughness: 0.4, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: fog, emissiveIntensity: 0.15 + a.glow * 0.25 }));
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(lidR, 0.09, 8, 120), bright);
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(lidR, lidR, 0.9, 96, 1, true), glass);
      lip.rotation.x = Math.PI / 2;
      lip.position.z = -0.45;
      const back = new THREE.Mesh(new THREE.TorusGeometry(lidR, 0.06, 6, 120), s.material('#a9c3c9', { roughness: 0.3 }));
      back.position.z = -0.9;
      lid.add(pane, hoop, lip, back);
      const lean = a.lid === 'propped' ? 0.62 : 0.2;
      const footY = a.lid === 'propped' ? 1.6 : -4.6, footZ = a.lid === 'propped' ? -wallR + 0.1 : -9.7;
      lid.rotation.x = -lean;
      lid.rotation.z = (random() - 0.5) * 0.12;
      lid.position.set((random() - 0.5) * 1.2, footY + Math.cos(lean) * lidR, footZ - Math.sin(lean) * lidR);
      s.root.add(lid);
    }

    // Other people's plates.
    if (a.neighbours) {
      const stacks = Math.round(mix(1, 3, mood.density));
      const shell = new THREE.MeshPhysicalMaterial({ color: '#d5ecf0', transparent: true, opacity: 0.4, roughness: 0.08 });
      for (let i = 0; i < stacks; i++) {
        const x = [-7.6, 7.7, -7.9][i], z = [6.6, 6.2, -6.4][i], tall = 2 + Math.floor(random() * 4);
        for (let k = 0; k < tall; k++) {
          const y = -0.8 + k * 0.62, ox = (random() - 0.5) * 0.18, oz = (random() - 0.5) * 0.18;
          s.cylinder(1.5, 1.5, 0.56, [x + ox, y + 0.28, z + oz], shell, 32);
          const fill = new THREE.Color(MEDIA_COLOUR[pick(Object.keys(MEDIA) as (keyof typeof MEDIA)[])]);
          s.cylinder(1.4, 1.4, 0.2, [x + ox, y + 0.14, z + oz], new THREE.MeshStandardMaterial({ color: fill, emissive: fill, emissiveIntensity: 0.15 + a.glow * 0.3, roughness: 0.4 }), 32);
        }
      }
    }

    const flicker = mood.energy * 0.12;
    const baseGlow = boxGlow.emissiveIntensity;
    world.update = (_dt, time) => { boxGlow.emissiveIntensity = baseGlow * (1 + flicker * Math.sin(time * 23) * Math.sin(time * 3.1)); };
    return world;
  },
});
