import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type P3, along, canvasTexture, card, lump, taper } from './lib';

const WHOSE = {
  elephant: 'Elephant: two long smooth curves leaning in to almost touch at the top, the classic trophy arch.',
  walrus: 'Walrus: short, thick, nearly straight pegs with blunt tips, standing like two fingers.',
  warthog: 'Warthog: small tight curls hooking in to a near circle, more comic than grand.',
  narwhal: 'Narwhal: two very long straight spiralled spears leaning into a tall narrow A.',
  mammoth: 'Mammoth: enormous sweeping tusks that swing wide and curl back until the tips cross.',
} as const;

interface Shape { path: P3[]; r0: number; power: number; tip: number; ridges?: number }
const SHAPES: Record<keyof typeof WHOSE, Shape> = {
  elephant: { path: [[0.3, 0, 0], [0.44, 0.45, 0.02], [0.43, 0.9, 0.07], [0.28, 1.3, 0.12], [0.07, 1.52, 0.15]], r0: 0.062, power: 0.6, tip: 0.05 },
  walrus: { path: [[0.13, 0, 0], [0.17, 0.25, 0.01], [0.16, 0.5, 0.03], [0.11, 0.72, 0.06]], r0: 0.04, power: 0.3, tip: 0.3 },
  warthog: { path: [[0.1, 0, 0], [0.24, 0.07, 0], [0.31, 0.21, 0.02], [0.25, 0.36, 0.03], [0.1, 0.41, 0.04], [0.03, 0.34, 0.04]], r0: 0.03, power: 0.7, tip: 0.05 },
  narwhal: { path: [[0.42, 0, 0], [0.3, 0.7, 0], [0.17, 1.4, 0], [0.04, 2.15, 0]], r0: 0.034, power: 0.9, tip: 0.06, ridges: 5 },
  mammoth: { path: [[0.3, 0, 0], [0.72, 0.42, 0.14], [0.95, 1.05, 0.3], [0.78, 1.72, 0.4], [0.3, 2.08, 0.38], [-0.14, 1.92, 0.3]], r0: 0.095, power: 0.55, tip: 0.06 },
};

export default defineThing({
  questions: {
    whose: choice('Whose tusks are they?', WHOSE),
    mounting: choice('How are they mounted?', {
      rock: 'Standing bare out of a rough lump of grey rock, like a natural-history display.',
      gong: 'A colonial dinner gong: carved dark wood base, silver caps on the ivory, a bronze gong hanging between the tusks.',
      crate: 'Upright in an open slatted shipping crate packed with straw, the way customs found them.',
      skull: 'Still rooted in the bleached front of the skull they grew from.',
      velvet: 'On a stepped black plinth with a velvet top, an auction-house or jeweller presentation.',
    }),
    surface: choice('What is the ivory surface like?', {
      polish: 'Buffed cream-white, glossy, handled and proud.',
      cracked: 'Yellowed and dry with long dark age cracks running the length.',
      scrimshaw: 'Engraved with inked scrimshaw: ships, whales, waves and ruled bands.',
      stained: 'Brown and mottled from the ground or from smoke, fossil-dark toward the root.',
    }),
    pair: choice('Is the pair complete?', {
      matched: 'A matched, even pair.',
      broken: 'One tusk snapped off short, its tip lying on the base.',
      uneven: 'One noticeably smaller and thinner than the other, an animal that favoured a side.',
      single: 'One tusk only; an empty socket where its partner stood.',
    }),
    story: choice('What does the label on it say about how it got here?', {
      trophy: 'An engraved brass plate with a year: a hunting trophy somebody was proud of.',
      gift: 'A presentation plaque: given to a club, a regiment or a governor.',
      museum: 'A typed museum accession card with a catalogue number.',
      evidence: 'Yellow evidence tags and a seizure number: confiscated contraband.',
      none: 'No label at all. Nobody remembers.',
    }),
    size: score('How big was the animal?', ['A young one, slight tusks', 'Ordinary adult', 'A record-book giant']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = SHAPES[a.whose];
    const size = mix(0.78, 1.22, a.size);
    const thick = mix(0.8, 1.25, a.size);
    const span = Math.max(...shape.path.map((p) => Math.abs(p[0]))) * size + shape.r0 * thick;
    const reach = Math.max(...shape.path.map((p) => p[2])) * size;
    const top = Math.max(...shape.path.map((p) => p[1])) * size;

    // Ivory, painted along the length (v) and around the girth (u).
    const wear = mood.wear;
    const base = { polish: '#f1e7cd', cracked: '#e2cf9f', scrimshaw: '#ece0c2', stained: '#b98f5c' }[a.surface];
    const ivoryMap = canvasTexture(256, 1024, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, h, 0, 0);
      const root = new THREE.Color(base).lerp(new THREE.Color(a.surface === 'stained' ? '#4f3520' : '#a98d5c'), 0.35 + wear * 0.35);
      grad.addColorStop(0, `#${root.getHexString()}`);
      grad.addColorStop(0.35, base);
      grad.addColorStop(1, a.surface === 'stained' ? '#d9bf8f' : '#fbf5e4');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Fine grain.
      ctx.strokeStyle = 'rgba(120,90,50,0.12)';
      for (let i = 0; i < 60; i++) {
        const x = random() * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - 0.5) * 20, h); ctx.stroke();
      }
      if (a.surface === 'cracked' || a.surface === 'stained' || wear > 0.6) {
        const cracks = Math.round((a.surface === 'cracked' ? 16 : 6) * (0.6 + wear));
        ctx.strokeStyle = 'rgba(58,38,20,0.85)';
        for (let i = 0; i < cracks; i++) {
          let x = random() * w, y = h - random() * h * 0.7;
          ctx.lineWidth = 1 + random() * 2.5;
          ctx.beginPath(); ctx.moveTo(x, y);
          const length = 6 + random() * 14;
          for (let k = 0; k < length; k++) { x += (random() - 0.5) * 10; y -= 14 + random() * 20; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
      if (a.surface === 'stained') {
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = `rgba(${60 + random() * 40},${35 + random() * 25},15,${0.1 + random() * 0.2})`;
          ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 8 + random() * 30, 12 + random() * 50, 0, 0, 7); ctx.fill();
        }
      }
      if (a.surface === 'scrimshaw') {
        ctx.strokeStyle = ctx.fillStyle = '#2a2622';
        ctx.lineWidth = 3;
        for (const y of [0.08, 0.1, 0.36, 0.62, 0.64, 0.86]) { ctx.beginPath(); ctx.moveTo(0, h * (1 - y)); ctx.lineTo(w, h * (1 - y)); ctx.stroke(); }
        for (const cx of [w * 0.25, w * 0.75]) {
          // A ship under sail.
          let y = h * 0.78;
          ctx.beginPath(); ctx.moveTo(cx - 40, y); ctx.quadraticCurveTo(cx, y + 26, cx + 44, y); ctx.closePath(); ctx.fill();
          for (const mx of [-18, 6, 26]) {
            ctx.beginPath(); ctx.moveTo(cx + mx, y); ctx.lineTo(cx + mx, y - 78); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx + mx + 2, y - 74); ctx.lineTo(cx + mx + 20, y - 40); ctx.lineTo(cx + mx + 2, y - 12); ctx.closePath(); ctx.stroke();
          }
          // Waves.
          ctx.lineWidth = 2;
          for (let row = 0; row < 3; row++) {
            ctx.beginPath();
            for (let x = -60; x <= 60; x += 4) ctx.lineTo(cx + x, y + 34 + row * 12 + Math.sin(x * 0.3 + row) * 4);
            ctx.stroke();
          }
          // A whale and its spout.
          y = h * 0.5;
          ctx.beginPath(); ctx.ellipse(cx, y, 44, 17, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx + 38, y); ctx.lineTo(cx + 62, y - 18); ctx.lineTo(cx + 60, y + 14); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx - 24, y - 16); ctx.quadraticCurveTo(cx - 30, y - 46, cx - 44, y - 44); ctx.moveTo(cx - 24, y - 16); ctx.quadraticCurveTo(cx - 20, y - 48, cx - 6, y - 46); ctx.stroke();
          // Cross-hatched diamond band.
          for (let k = -3; k <= 3; k++) {
            ctx.beginPath(); ctx.moveTo(cx + k * 16 - 14, h * 0.3); ctx.lineTo(cx + k * 16 + 14, h * 0.22); ctx.moveTo(cx + k * 16 + 14, h * 0.3); ctx.lineTo(cx + k * 16 - 14, h * 0.22); ctx.stroke();
          }
          // Star and anchor near the tip.
          ctx.beginPath(); ctx.arc(cx, h * 0.17, 12, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx, h * 0.17 - 22); ctx.lineTo(cx, h * 0.17 + 22); ctx.moveTo(cx - 22, h * 0.17); ctx.lineTo(cx + 22, h * 0.17); ctx.stroke();
        }
      }
    });
    const ivory = new THREE.MeshStandardMaterial({ map: ivoryMap, roughness: a.surface === 'polish' ? mix(0.22, 0.5, wear) : 0.6 });
    const pulp = s.material('#8d6f49', { roughness: 0.9 });

    // The stand.
    const wood = s.material(mix(0.3, 0.7, mood.warmth) > 0.5 ? '#4a2a1a' : '#3a2a22', { roughness: 0.45 });
    const silver = s.material('#d9dcd8', { metalness: 0.85, roughness: 0.28 });
    const brass = s.material('#b8913f', { metalness: 0.8, roughness: 0.35 });
    const half = span + 0.12 * size;
    const deep = Math.max(0.2 * size, reach * 0.5 + 0.16 * size);
    let seat = 0; // the height the tusks rise from
    let plateZ = deep, plateY = 0.06;
    if (a.mounting === 'rock') {
      seat = Math.max(0.1, Math.min(0.26, top * 0.16)) * (a.whose === 'warthog' ? 0.7 : 1);
      const rock = s.mesh(lump(random, 0.16, 3), s.material('#84857f', { roughness: 0.95, flatShading: true }), [0, seat * 0.45, reach * 0.3]);
      rock.scale.set(Math.max(half * 0.9, shape.path[0][0] * size + 0.09), seat * 1.25, Math.max(0.12, deep * 0.85));
      for (let i = 0; i < 3; i++) {
        const pebble = s.mesh(lump(random, 0.2, 1), s.material('#77786f', { roughness: 0.95, flatShading: true }), [(random() - 0.5) * half * 2.2, 0.02, deep * (0.9 + random() * 0.4)]);
        pebble.scale.setScalar(0.03 + random() * 0.04);
      }
      plateZ = deep * 1.25; plateY = 0.05;
    } else if (a.mounting === 'gong') {
      seat = 0.2 * size;
      s.box([half * 2.3, seat * 0.3, deep * 2.3], [0, seat * 0.15, reach * 0.3], wood);
      s.box([half * 2.1, seat * 0.5, deep * 2.05], [0, seat * 0.55, reach * 0.3], wood);
      s.box([half * 2.2, seat * 0.2, deep * 2.2], [0, seat * 0.9, reach * 0.3], wood);
      for (let i = 0; i < 9; i++) s.ball([half * 0.09, seat * 0.2, 0.02], [(i - 4) * half * 0.23, seat * 0.55, reach * 0.3 + deep * 1.03], brass, 10);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.ball([0.05 * size, 0.035 * size, 0.05 * size], [x * half * 1.0, 0.02, reach * 0.3 + z * deep], wood, 12);
      plateZ = reach * 0.3 + deep * 1.16; plateY = seat * 0.15;
    } else if (a.mounting === 'crate') {
      seat = 0.3 * size;
      const pine = s.material('#b79563', { roughness: 0.9 });
      const w = half * 2.1, d = deep * 2.2, cz = reach * 0.3;
      s.box([w, 0.02, d], [0, 0.01, cz], pine);
      for (let i = 0; i < 4; i++) {
        const y = 0.045 * size + i * seat * 0.26;
        s.box([w, seat * 0.2, 0.015], [0, y, cz + d / 2], pine); s.box([w, seat * 0.2, 0.015], [0, y, cz - d / 2], pine);
        s.box([0.015, seat * 0.2, d], [w / 2, y, cz], pine); s.box([0.015, seat * 0.2, d], [-w / 2, y, cz], pine);
      }
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, seat * 1.06, 0.035], [x * (w / 2 + 0.005), seat * 0.53, cz + z * (d / 2 + 0.005)], pine);
      // Straw.
      const straw: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 160; i++) straw.push({ at: [(random() - 0.5) * w * 0.92, seat * (0.78 + random() * 0.3), cz + (random() - 0.5) * d * 0.92], size: 0.5 + random(), color: random() > 0.5 ? '#d8bf78' : '#c2a55c' });
      const blades = s.scatter(new THREE.BoxGeometry(0.12 * size, 0.006, 0.006), s.material('#d8c383', { roughness: 0.9 }), straw);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      straw.forEach((blade, i) => { q.setFromEuler(e.set(random() * 0.8 - 0.4, random() * 6.3, random() * 0.8 - 0.4)); m.compose(new THREE.Vector3(...blade.at), q, new THREE.Vector3(blade.size, 1, 1)); blades.setMatrixAt(i, m); });
      const stencil = card([a.story === 'evidence' ? 'SEIZED' : 'FRAGILE', a.story === 'evidence' ? 'CUSTOMS  0412' : 'THIS WAY UP'], w * 0.6, seat * 0.42, '#7a1f18', '#b79563', 'monospace');
      stencil.position.set(0, seat * 0.5, cz + d / 2 + 0.009);
      s.root.add(stencil);
      plateZ = cz + d / 2 + 0.012; plateY = seat * 0.86;
    } else if (a.mounting === 'skull') {
      seat = 0.34 * size;
      const bone = s.material('#e4dcc6', { roughness: 0.85 });
      const dark = s.material('#2c2620', { roughness: 1 });
      const inner = shape.path[0][0] * size;
      const skull = s.mesh(lump(random, 0.07, 3), bone, [0, seat * 0.62, -0.02 * size]);
      skull.scale.set(inner * 1.25 + 0.1 * size, seat * 0.7, 0.24 * size);
      // Nasal opening and orbits.
      s.ball([inner * 0.5, seat * 0.2, 0.06 * size], [0, seat * 0.8, 0.2 * size], dark, 12);
      for (const x of [-1, 1]) {
        s.ball([0.06 * size, 0.055 * size, 0.05 * size], [x * (inner * 1.05 + 0.04 * size), seat * 0.45, 0.17 * size], dark, 12);
        // Tusk sockets: thick bone sleeves.
        s.cylinder(shape.r0 * thick * 1.7, shape.r0 * thick * 2.1, seat * 0.5, [x * inner, seat * 0.86, 0], bone, 14);
      }
      s.box([inner * 1.6, seat * 0.2, 0.2 * size], [0, seat * 0.12, 0], bone);
      for (let i = 0; i < 5; i++) for (const x of [-1, 1]) s.box([0.035 * size, 0.03 * size, 0.06 * size], [x * inner * 0.5, 0.03 * size, (-0.08 + i * 0.045) * size], s.material('#cfc3a4'));
      plateZ = 0.3 * size; plateY = 0.03;
    } else {
      seat = 0.15 * size;
      const black = s.material('#1c1a1c', { roughness: 0.3 });
      const velvet = s.material(mood.cheer > 0.5 ? '#6d1830' : '#1f2748', { roughness: 1 });
      s.box([half * 2.35, seat * 0.45, deep * 2.4], [0, seat * 0.225, reach * 0.3], black);
      s.box([half * 2.15, seat * 0.5, deep * 2.15], [0, seat * 0.7, reach * 0.3], black);
      s.box([half * 2.05, 0.012, deep * 2.05], [0, seat + 0.004, reach * 0.3], velvet);
      plateZ = reach * 0.3 + deep * 1.21; plateY = seat * 0.225;
    }

    // The tusks.
    const brokenSide = random() > 0.5 ? 1 : -1;
    const tips: P3[] = [];
    for (const side of [1, -1]) {
      if (a.pair === 'single' && side === brokenSide) {
        // An empty socket and a faded ring where it stood.
        const x = side * shape.path[0][0] * size;
        s.cylinder(shape.r0 * thick * 1.25, shape.r0 * thick * 1.3, 0.03 * size, [x, seat + 0.012 * size, 0], a.mounting === 'gong' ? silver : pulp, 16);
        s.cylinder(shape.r0 * thick * 0.95, shape.r0 * thick * 0.95, 0.032 * size, [x, seat + 0.013 * size, 0], s.material('#191512'), 16);
        continue;
      }
      const lesser = (a.pair === 'uneven' && side === brokenSide) ? 0.7 : mix(0.95, 1, random());
      const lean = (random() - 0.5) * 0.05;
      const x0 = shape.path[0][0];
      const path = shape.path.map(([x, y, z]): P3 => [side * (x0 + (x - x0) * lesser + y * lean) * size, seat - 0.03 * size + y * size * lesser, z * size * lesser]);
      const r0 = shape.r0 * thick * (lesser < 0.9 ? 0.78 : 1);
      const radius = (t: number) => r0 * Math.max(shape.tip, Math.pow(Math.max(0, 1 - t), shape.power));
      const broken = a.pair === 'broken' && side === brokenSide;
      const until = broken ? mix(0.4, 0.62, random()) : 1;
      const spiral = shape.ridges ? { ridges: shape.ridges, ridgeDepth: 0.16, spiral: side * 60 } : {};
      s.mesh(taper(path, radius, { segments: shape.ridges ? 110 : 44, sides: shape.ridges ? 20 : 14, until, ...spiral }), ivory);
      tips.push(along(path, 0.86 * until));
      if (broken) {
        // The stump shows rough pulp; the lost tip lies on the base.
        const end = along(path, until);
        s.ball([radius(until) * 0.9, radius(until) * 0.5, radius(until) * 0.9], end, pulp, 8);
        const rest = shape.path.map(([x, y, z]): P3 => [x * size, y * size, z * size]);
        const tipGeo = taper(rest.map((p): P3 => [p[0] - rest[0][0], p[1], p[2]]), radius, { segments: 30, sides: 12, ...spiral });
        // Keep only the outer part by rebuilding from the break onward.
        tipGeo.dispose();
        const from = until, pts: P3[] = [];
        for (let k = 0; k <= 5; k++) pts.push(along(rest, from + (1 - from) * (k / 5)));
        const origin = pts[0];
        const piece = s.mesh(taper(pts.map((p): P3 => [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]]), (t) => radius(from + (1 - from) * t), { segments: 24, sides: 12 }), ivory);
        piece.rotation.set(Math.PI / 2 - 0.1, 0, side * 1.2 + random());
        piece.position.set(side * half * 0.45, seat + radius(from) * 1.1 + (a.mounting === 'crate' ? seat * 0.12 : 0), reach * 0.3 + deep * 0.55);
      }
      if (a.mounting === 'gong') {
        s.cylinder(r0 * 1.12, r0 * 1.2, r0 * 2.6, [path[0][0], seat + r0 * 1.2, 0], silver, 18);
        s.ring(r0 * 1.18, r0 * 0.14, [path[0][0], seat + r0 * 2.5, 0], silver).rotation.x = Math.PI / 2;
        if (!broken) s.ball([r0 * 0.28, r0 * 0.28, r0 * 0.28], along(path, 1), silver, 10);
      }
      if (a.story === 'evidence' || (a.mounting === 'crate' && random() > 0.4)) {
        const at = along(path, 0.3 + random() * 0.15);
        const tag = card(a.story === 'evidence' ? ['EVIDENCE', `No. ${1000 + Math.floor(random() * 8999)}`] : ['LOT', `${10 + Math.floor(random() * 89)}`], 0.13 * size, 0.075 * size, '#1e1b16', a.story === 'evidence' ? '#f2c230' : '#e8dcbb', 'monospace');
        tag.position.set(at[0] + side * 0.02, at[1] - 0.07 * size, at[2] + r0 + 0.03 * size);
        tag.rotation.set(0.15, side * -0.3, (random() - 0.5) * 0.5);
        s.root.add(tag);
        s.rod([at[0], at[1], at[2] + r0 * 0.8], [tag.position.x, tag.position.y + 0.035 * size, tag.position.z], 0.002, s.material('#5b4a35'));
        s.ring(r0 * radius(0.35) / r0 + 0.004, 0.003, at, s.material('#5b4a35')).rotation.x = Math.PI / 2;
      }
    }

    // The gong itself, hung between the tusks.
    let gong: THREE.Group | null = null;
    if (a.mounting === 'gong' && tips.length === 2) {
      const [r, l] = tips;
      const gap = Math.abs(r[0] - l[0]);
      const hangY = Math.min(r[1], l[1]);
      const radius = Math.max(0.07 * size, Math.min((hangY - seat) * 0.3, span * 0.55));
      const bar = a.whose === 'narwhal' || gap < radius * 1.2;
      const centreY = Math.max(seat + radius * 1.25, hangY - radius * 1.5);
      gong = new THREE.Group();
      gong.position.set(0, hangY, (r[2] + l[2]) / 2);
      const disc = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.012], [radius * 0.22, 0.014], [radius * 0.3, 0.004], [radius * 0.9, 0.002], [radius, -0.018], [radius * 0.98, -0.02], [0, -0.006]].map(([x, y]) => new THREE.Vector2(x, y * size)), 36), s.material('#b07a2c', { metalness: 0.85, roughness: 0.32 }));
      disc.rotation.x = Math.PI / 2;
      disc.position.y = centreY - hangY;
      disc.castShadow = true;
      gong.add(disc);
      s.root.add(gong);
      const cord = s.material('#7a2d22');
      const hx = bar ? radius * 0.5 : gap / 2;
      if (bar) s.rod([r[0], hangY, r[2]], [l[0], hangY, l[2]], 0.008 * size, brass);
      for (const side of [1, -1]) {
        const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), cord);
        const from = new THREE.Vector3(side * Math.min(hx, gap / 2), 0, 0), to = new THREE.Vector3(side * radius * 0.5, centreY - hangY + radius * 0.84, 0);
        strand.position.copy(from).add(to).multiplyScalar(0.5);
        strand.scale.y = from.distanceTo(to);
        strand.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
        gong.add(strand);
      }
      // The beater rests on the base.
      s.rod([-half * 0.7, seat + 0.02 * size, reach * 0.3 + deep * 0.75], [half * 0.1, seat + 0.02 * size, reach * 0.3 + deep * 0.9], 0.008 * size, wood);
      s.ball([0.035 * size, 0.035 * size, 0.035 * size], [half * 0.1, seat + 0.035 * size, reach * 0.3 + deep * 0.9], s.material('#c9b9a0', { roughness: 1 }), 12);
    }

    // The label that tells the story.
    if (a.story !== 'none') {
      const year = 1880 + Math.floor(random() * 55);
      const lines = {
        trophy: [`${year}`, 'shot by the owner'],
        gift: ['PRESENTED', `to the Club  ${year}`],
        museum: [`Acc. No. ${year}.${1 + Math.floor(random() * 40)}`, a.whose === 'mammoth' ? 'Mammuthus  (pair)' : a.whose === 'narwhal' ? 'Monodon  (pair)' : 'ivory, pair'],
        evidence: ['EVIDENCE', 'DO NOT REMOVE'],
      }[a.story];
      const metal = a.story === 'trophy' || a.story === 'gift';
      const plate = card(lines, Math.min(half * 1.1, 0.34 * size), 0.085 * size, metal ? '#3a2a10' : '#1e1b16', metal ? '#c9a54f' : a.story === 'evidence' ? '#f2c230' : '#efe6cc', a.story === 'museum' ? 'monospace' : 'serif');
      if (a.mounting === 'rock' || a.mounting === 'skull') {
        // A little card stand in front.
        plate.position.set(half * 0.35, 0.05 * size, plateZ + 0.05 * size);
        plate.rotation.x = -0.5;
        s.box([Math.min(half * 1.1, 0.34 * size), 0.01, 0.05 * size], [half * 0.35, 0.005, plateZ + 0.06 * size], wood);
      } else {
        plate.position.set(0, Math.max(plateY, 0.05 * size), plateZ + 0.004);
        if (a.story === 'evidence') plate.rotation.z = -0.07;
      }
      (plate.material as THREE.MeshStandardMaterial).metalness = metal ? 0.6 : 0;
      s.root.add(plate);
    }

    const swing = mix(0, 0.09, mood.energy);
    const phase = random() * 6;
    return s.finish({ update: gong ? (_dt, time) => { gong!.rotation.z = Math.sin(time * 1.6 + phase) * swing; } : undefined });
  },
});
