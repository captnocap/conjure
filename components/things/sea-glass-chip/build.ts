import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SAND, bed, lump, rest, strew, type Speck } from './grains';

const COLOURS = {
  green: 'Bottle green, the commonest find.',
  brown: 'Beer-bottle amber brown.',
  aqua: 'Pale seafoam aqua from old soda and medicine bottles.',
  cobalt: 'Deep cobalt blue, rare, the one you keep.',
  white: 'Frosted white that was once clear.',
  lavender: 'Faint sun-purpled lavender, very old glass.',
  red: 'Ruby red, a once-in-a-lifetime piece from a ship lantern or tail light.',
} as const;
const TINT: Record<keyof typeof COLOURS, string> = { green: '#3f9b5f', brown: '#a8662a', aqua: '#9fd9cf', cobalt: '#2748b8', white: '#e9efec', lavender: '#c7b2e0', red: '#c4283a' };
const WORDS = ['OLA', 'DAIRY', '& SONS', 'PINT', 'TONIC', 'NOT TO BE', 'RETURN', 'CO. LTD'];

/** Frost, pits and whatever the bottle once said, painted for both colour and relief. */
function frost(random: () => number, emboss: string, text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = random() < 0.5 ? '#ffffff' : '#b9b9b9';
    ctx.globalAlpha = 0.25 + random() * 0.4;
    ctx.beginPath();
    ctx.arc(random() * 256, random() * 256, 0.8 + random() * 2.4, 0, 6.283);
    ctx.fill();
  }
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = ctx.strokeStyle = '#ffffff';
  if (emboss === 'lettering' || emboss === 'numerals') {
    ctx.font = `bold ${text.length > 5 ? 54 : 84}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(128, 128);
    ctx.rotate((random() - 0.5) * 0.5);
    ctx.shadowColor = '#7c7c7c';
    ctx.shadowOffsetX = ctx.shadowOffsetY = 3;
    ctx.fillText(text, (random() - 0.5) * 60, 0);
  } else if (emboss === 'ribs') {
    ctx.lineWidth = 9;
    for (let x = 8; x < 256; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
  } else if (emboss === 'hobnail') {
    for (let x = 0; x < 9; x++) for (let y = 0; y < 9; y++) { ctx.beginPath(); ctx.arc(x * 30 + (y % 2) * 15 + 8, y * 30 + 8, 8, 0, 6.283); ctx.fill(); }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the glass?', COLOURS),
    piece: choice('What part of the bottle was it?', {
      shard: 'An irregular rounded piece of the wall, gently curved.',
      triangle: 'A soft-cornered triangle, the classic pocket piece.',
      sliver: 'A long narrow splinter worn into a smooth finger.',
      neck: 'The ring of a bottle lip, a frosted hoop.',
      base: 'A thick round bottle bottom with a stub of wall still standing.',
      marble: 'A frosted glass marble, the stopper from an antique fizzy-drink bottle.',
    }),
    emboss: choice('If it carries a ghost of raised decoration, what?', {
      none: 'Nothing: it is plain.',
      lettering: 'Part of a word, the rest lost with the bottle.',
      numerals: 'A mould number or a date.',
      ribs: 'Parallel raised ribs.',
      hobnail: 'A grid of raised dots.',
    }),
    thickness: score('How thick is the glass?', ['Thin as a window pane', 'Ordinary bottle wall', 'A heavy chunk']),
    moment: choice('How has it been found?', {
      dry: 'Dry and chalky on the sand, matte as a sugared sweet.',
      wet: 'Just licked by a wave: glossy, darker, sitting in a film of water.',
      backlit: 'Propped upright against a pebble with the low sun glowing through it.',
      buried: 'Half sunk, one corner showing above the sand.',
    }),
    company: choice('What lies with it?', {
      alone: 'Nothing else.',
      sand: 'A patch of coarse sand.',
      hoard: 'A patch of sand and two or three smaller pieces in other colours: a good day of beachcombing.',
      pebbles: 'A few smooth dark pebbles that make its colour sing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // modelled in centimetres-ish units, shown a little over life size
    const wet = a.moment === 'wet', lit = a.moment === 'backlit';
    const word = a.emboss === 'numerals' ? String(Math.floor(random() * 90) + (random() < 0.5 ? 10 : 1890)) : WORDS[Math.floor(random() * WORDS.length)];
    const glassOf = (hex: string, text = a.emboss) => {
      const tint = new THREE.Color(hex).offsetHSL(0, 0, wet ? -0.06 : mix(0.02, 0.08, mood.wear));
      const map = frost(random, text, word);
      return new THREE.MeshStandardMaterial({
        color: tint, map, bumpMap: map, bumpScale: 1.5, transparent: true, opacity: wet ? 0.74 : 0.86, side: THREE.DoubleSide,
        roughness: wet ? 0.08 : mix(0.55, 0.9, mood.wear), emissive: tint, emissiveIntensity: lit ? mix(0.5, 0.85, mood.cheer) : wet ? 0.2 : 0.14,
      });
    };
    const thick = mix(0.12, 0.42, a.thickness);

    const plate = (points: number, lenX: number, lenZ: number, t: number, wobble: number) => {
      const ring: THREE.Vector3[] = [];
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 6.283 + (random() - 0.5) * wobble;
        const r = 0.72 + random() * 0.5;
        ring.push(new THREE.Vector3(Math.cos(angle) * r * lenX, Math.sin(angle) * r * lenZ, 0));
      }
      const outline = new THREE.CatmullRomCurve3(ring, true, 'catmullrom', mix(0.25, 0.6, mood.wear)).getPoints(48);
      const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.y)));
      const bevel = t * mix(0.25, 0.48, mood.wear);
      const g = new THREE.ExtrudeGeometry(shape, { depth: t - bevel * 2 + 0.01, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
      g.rotateX(-Math.PI / 2);
      g.center();
      // Bottles are round: the wall keeps a little of that curve.
      const pos = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      g.computeBoundingBox();
      const b = g.boundingBox!, curve = 0.1 + random() * 0.14;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, pos.getY(i) - curve * x * x);
        uv.setXY(i, (x - b.min.x) / (b.max.x - b.min.x), (b.max.z - z) / (b.max.z - b.min.z));
      }
      g.computeVertexNormals();
      return g;
    };

    let geometry: THREE.BufferGeometry;
    let standsWell = true;
    if (a.piece === 'shard') geometry = plate(6 + Math.floor(random() * 2), 1.1, 0.85, thick, 0.5);
    else if (a.piece === 'triangle') geometry = plate(3, 1.15, 1.05, thick, 0.3);
    else if (a.piece === 'sliver') geometry = plate(5, 1.6, 0.4, thick * 0.9, 0.4);
    else if (a.piece === 'neck') {
      const t = 0.14 + thick * 0.35;
      const profile = [[0.5, 0], [0.5 + t, 0.02], [0.5 + t * 1.25, 0.14], [0.5 + t * 1.2, 0.3], [0.5 + t * 0.8, 0.38], [0.5 + t * 0.85, 0.62], [0.5 + t * 0.6, 0.74], [0.5, 0.72], [0.47, 0.4], [0.5, 0]];
      geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const k = random() * 6.283;
      // The break below the lip is never level.
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.5) pos.setY(i, pos.getY(i) + 0.16 * Math.sin(Math.atan2(pos.getZ(i), pos.getX(i)) * 2 + k) + 0.08 * Math.sin(Math.atan2(pos.getZ(i), pos.getX(i)) * 5 + k));
      geometry.computeVertexNormals();
    } else if (a.piece === 'base') {
      const t = 0.14 + thick * 0.4;
      const profile = [[0.001, 0.3], [0.4, 0.2], [0.72, 0.06], [0.9, 0], [1.02, 0.05], [1.06, 0.2], [1.05, 0.75], [1.05 - t, 0.75], [1.05 - t, 0.3 + t], [0.6, 0.24 + t], [0.001, 0.34 + t]];
      geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48);
      const pos = geometry.attributes.position as THREE.BufferAttribute;
      const k = random() * 6.283;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0.7) {
        const angle = Math.atan2(pos.getZ(i), pos.getX(i));
        pos.setY(i, 0.42 + t + Math.max(0, 0.75 * Math.sin(angle + k) + 0.25 * Math.sin(angle * 3 + k * 2)) * 0.8);
      }
      geometry.computeVertexNormals();
      standsWell = false;
    } else {
      geometry = lump(random, { detail: 4, amp: 0.04, smooth: true });
      geometry.scale(0.8, 0.8, 0.8);
      standsWell = false;
    }

    const glass = glassOf(TINT[a.colour], a.piece === 'marble' || a.piece === 'neck' ? 'none' : a.emboss);
    const chip = new THREE.Group();
    const body = new THREE.Mesh(geometry, glass);
    body.castShadow = body.receiveShadow = true;
    body.renderOrder = 2;
    chip.add(body);
    if (a.piece === 'marble') {
      // The swirl inside a stopper marble is rare; a seed bubble is not.
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 }));
      bubble.position.set(0.2, 0.15, 0.1);
      chip.add(bubble);
    }

    const flat = a.piece === 'shard' || a.piece === 'triangle' || a.piece === 'sliver';
    const upright = lit && standsWell;
    if (upright) chip.rotation.set(flat ? Math.PI / 2 - 0.3 : Math.PI / 2 - 0.35, 0, flat ? (random() - 0.5) * 0.5 : 0);
    else if (a.moment === 'buried') chip.rotation.set(flat ? 0.75 : 0.45, 0, flat ? 0.5 : 0.25);
    else chip.rotation.set((random() - 0.5) * 0.12, 0, (random() - 0.5) * 0.12);
    const pivot = new THREE.Group();
    pivot.add(chip);
    pivot.rotation.y = (random() - 0.5) * 0.7;
    s.root.add(pivot);
    const tall = rest(pivot);
    if (a.moment === 'buried') pivot.position.y -= tall * 0.42;
    pivot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(pivot, true);
    const centre = box.getCenter(new THREE.Vector3());
    pivot.position.x -= centre.x;
    pivot.position.z -= centre.z;
    const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);

    const stone = (x: number, z: number, size: number, colour: string) => {
      const pebble = new THREE.Mesh(lump(random, { detail: 3, amp: 0.12, smooth: true, stretch: [1.2, 0.7, 1] }), new THREE.MeshStandardMaterial({ color: colour, roughness: wet ? 0.2 : 0.7 }));
      pebble.scale.setScalar(size);
      pebble.position.set(x, size * 0.55, z);
      pebble.rotation.y = random() * 6;
      pebble.castShadow = pebble.receiveShadow = true;
      s.root.add(pebble);
    };
    if (upright) stone(0.1, -(box.max.z - box.min.z) / 2 - 0.25, Math.min(0.55, tall * 0.42), '#6d6a66');

    const reach = Math.max(1.5, span * 0.5 + 0.75);
    const sandy = a.company === 'sand' || a.company === 'hoard' || (a.moment === 'buried' && a.company !== 'pebbles');
    if (sandy || a.moment === 'buried') s.root.add(bed(random, { radius: reach, grain: 0.16, count: 320 + Math.round(mood.density * 300), palette: SAND.tan, specks: SAND.dark, speckShare: 0.05, wet: wet ? 0.7 : 0 }));
    if (a.company === 'hoard') {
      const others = (Object.keys(TINT) as (keyof typeof TINT)[]).filter((key) => key !== a.colour);
      const n = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < n; i++) {
        const angle = 0.4 + i * (5.4 / n) + random() * 0.4, r = reach * 0.72;
        const piece = new THREE.Mesh(plate(4 + Math.floor(random() * 3), 0.36, 0.3, 0.14, 0.5), glassOf(TINT[others[Math.floor(random() * others.length)]], 'none'));
        piece.position.set(Math.sin(angle) * r, 0.1, Math.cos(angle) * r);
        piece.rotation.set((random() - 0.5) * 0.3, random() * 6, (random() - 0.5) * 0.3);
        piece.castShadow = piece.receiveShadow = true;
        s.root.add(piece);
      }
    }
    if (a.company === 'pebbles') {
      const n = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < n; i++) {
        const angle = i * (6.283 / n) + random() * 0.6 + 1.2;
        stone(Math.sin(angle) * reach * (0.75 + random() * 0.15), Math.cos(angle) * reach * (0.75 + random() * 0.15), 0.2 + random() * 0.22, ['#3b3f45', '#565250', '#2f3336', '#6a625c'][i % 4]);
      }
      const dust: Speck[] = [];
      for (let i = 0; i < 40; i++) { const angle = random() * 6.283, r = Math.sqrt(random()) * reach; dust.push({ x: Math.cos(angle) * r, y: 0.03, z: Math.sin(angle) * r, size: 0.05 + random() * 0.06, color: SAND.tan[i % 6] }); }
      s.root.add(strew(random, dust, lump(random, { detail: 1, amp: 0.3 }), new THREE.MeshStandardMaterial({ roughness: 0.6 })));
    }
    if (wet) {
      const film = s.mesh(new THREE.CylinderGeometry(reach * 0.8, reach * 0.86, 0.05, 40), new THREE.MeshStandardMaterial({ color: '#a9d2d6', transparent: true, opacity: 0.4, roughness: 0.04, metalness: 0.3, depthWrite: false }), [0.1, 0.03, 0.1]);
      film.scale.z = 0.8;
      film.castShadow = false;
      if (!sandy) s.cylinder(reach * 0.8, reach * 0.84, 0.03, [0.1, 0.015, 0.1], s.material('#b9ab8e', { roughness: 0.3 }), 40).scale.z = 0.8;
    }

    const glow = glass.emissiveIntensity;
    return s.finish({
      footprint: reach * 0.03 * 0.8,
      update: (_dt, time) => { if (lit || wet) glass.emissiveIntensity = glow * (1 + 0.25 * mood.energy * Math.sin(time * (0.8 + mood.energy * 2))); },
    });
  },
});
