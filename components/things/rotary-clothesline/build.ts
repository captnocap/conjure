import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = readonly [number, number, number];
type Outline = readonly (readonly [number, number])[];

const mirror = (half: Outline): Outline => [...half, ...[...half].reverse().map(([x, y]) => [-x, y] as const)];
const OUTLINES = {
  shirt: mirror([[-0.07, 0], [-0.24, -0.03], [-0.38, -0.2], [-0.32, -0.29], [-0.23, -0.2], [-0.23, -0.64], [0, -0.66]]),
  uniform: mirror([[-0.08, 0], [-0.2, -0.03], [-0.33, -0.17], [-0.27, -0.25], [-0.19, -0.19], [-0.15, -0.4], [-0.36, -0.98], [0, -1.0]]),
  trousers: [[-0.19, 0], [-0.21, -0.95], [-0.04, -0.95], [0, -0.3], [0.04, -0.95], [0.21, -0.95], [0.19, 0]],
  onesie: mirror([[-0.05, 0], [-0.11, -0.02], [-0.21, -0.08], [-0.18, -0.15], [-0.11, -0.11], [-0.12, -0.3], [-0.04, -0.37]]),
  dress: [[-0.11, 0], [-0.15, 0], [-0.2, -0.24], [-0.15, -0.4], [-0.42, -1.02], [0.42, -1.02], [0.15, -0.4], [0.2, -0.24], [0.15, 0], [0.11, 0], [0.08, -0.14], [-0.08, -0.14]],
  apron: [[-0.11, -0.38], [-0.24, -0.84], [0.24, -0.84], [0.11, -0.38], [0.09, -0.17], [-0.09, -0.17]],
  towel: [[-0.26, 0], [-0.26, -0.6], [0.26, -0.6], [0.26, 0]],
  sheet: [[-0.62, 0], [-0.64, -0.92], [0.64, -0.9], [0.62, 0]],
  nappy: [[-0.13, 0], [-0.13, -0.24], [0.13, -0.24], [0.13, 0]],
  sock: [[-0.04, 0], [-0.04, -0.2], [0.08, -0.25], [0.1, -0.18], [0.04, -0.15], [0.04, 0]],
} satisfies Record<string, Outline>;
type Garment = keyof typeof OUTLINES;
const WIDTH: Record<Garment, number> = { shirt: 0.78, uniform: 0.7, trousers: 0.46, onesie: 0.44, dress: 0.86, apron: 0.4, towel: 0.56, sheet: 1.32, nappy: 0.3, sock: 0.18 };

function pattern(kind: 'stripes' | 'checks' | 'florals', seed: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 64, 64);
  if (kind === 'stripes') { c.fillStyle = '#9a9a9a'; for (let i = 0; i < 4; i++) c.fillRect(0, i * 16, 64, 7); }
  if (kind === 'checks') { c.fillStyle = 'rgba(70,70,70,0.45)'; for (let i = 0; i < 2; i++) { c.fillRect(0, i * 32, 64, 14); c.fillRect(i * 32, 0, 14, 64); } }
  if (kind === 'florals') for (let i = 0; i < 9; i++) {
    const x = seed() * 64, y = seed() * 64;
    c.fillStyle = ['#e8405a', '#f2c230', '#f4f1e6', '#e86aa8'][i % 4];
    for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.257) * 5, y + Math.sin(p * 1.257) * 5, 4, 0, 7); c.fill(); }
    c.fillStyle = '#5a3a1a'; c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'florals' ? 4 : 7, kind === 'florals' ? 4 : 7);
  return texture;
}

export default defineThing({
  questions: {
    wash: choice('Whose washing is on the line?', {
      'work-shirts': 'Blue work shirts with name patches, a hi-vis shirt and heavy jeans.',
      'baby-clothes': 'Rows of tiny onesies and cloth nappies in pastel colours.',
      'single-uniform': 'One pressed uniform dress with a white apron, hung alone for tomorrow\'s shift.',
      'one-dress': 'A single sundress and nothing else on the whole line.',
      'family-wash': 'Everyone\'s wash at once: big shirts, small shirts, socks in pairs, loud colours.',
      linens: 'White sheets and towels, billowing.',
      bare: 'Nothing but empty cord, a few forgotten pegs and one lost sock.',
    }),
    state: choice('What is happening to the washing?', {
      'fresh-hung': 'Just pegged out, neat and evenly spaced, basket still beside it.',
      'half-in': 'Being brought in: half the lines are already empty.',
      forgotten: 'Left out for days, sun-faded and hanging limp, something fallen in the dirt.',
      'storm-coming': 'A wind has got up: everything streams out sideways and a piece has blown off.',
    }),
    pattern: choice('What pattern stands out on the fabric?', {
      plain: 'Plain solid colours.',
      stripes: 'Broad stripes.',
      checks: 'Gingham and plaid checks.',
      florals: 'Busy floral prints.',
    }),
    frame: choice('What is the hoist made of?', {
      galvanised: 'Bare galvanised steel pipe.',
      green: 'Garden-green painted steel.',
      white: 'White enamel with rust coming through at the joints.',
      aluminium: 'A light bright aluminium folding hoist.',
    }),
    basket: choice('What is on the ground beside it?', {
      nothing: 'Nothing.',
      'full-basket': 'A plastic laundry basket heaped with wet washing.',
      'empty-basket': 'An empty basket on its side.',
      'peg-bucket': 'An ice-cream tub of clothes pegs.',
    }),
    footing: choice('What does it stand in?', {
      none: 'Just the pole in the ground.',
      'dirt-circle': 'A circle of bare dirt worn into the yard by years of walking round it.',
      'concrete-pad': 'A small square of poured concrete.',
      'old-tyre': 'A tyre filled with concrete, so it can be dragged somewhere else.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const head = new Sculpture(context);
    const { mood, random } = context;
    const steelColour = { galvanised: '#aab1b3', green: '#3d6f4a', white: '#ebe8de', aluminium: '#d5dadc' }[a.frame];
    const steel = s.material(new THREE.Color(steelColour).lerp(new THREE.Color('#8a4a2a'), a.frame === 'white' ? mood.wear * 0.4 : mood.wear * 0.2), { metalness: a.frame === 'aluminium' || a.frame === 'galvanised' ? 0.7 : 0.2, roughness: 0.5 });
    const cord = s.material(a.frame === 'green' ? '#e9e6da' : '#4f8a5a', { roughness: 0.9 });
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d8d2c2'), (a.state === 'forgotten' ? 0.3 : 0) + mood.wear * 0.18).offsetHSL(0, (mood.cheer - 0.5) * 0.2, 0);

    const hubY = 1.42, tipY = 1.8, R = 1.4, arms = 4;
    s.cylinder(0.03, 0.034, 2.0, [0, 1.0, 0], steel, 12);
    s.cylinder(0.04, 0.04, 0.08, [0, 0.9, 0], steel, 12);
    s.cylinder(0.02, 0.02, 0.04, [0, 2.02, 0], s.material('#2a2a2a'), 10);
    const tip = (i: number, f: number): P => [Math.cos(Math.PI / 4 + i * Math.PI / 2) * R * f, hubY + (tipY - hubY) * f, Math.sin(Math.PI / 4 + i * Math.PI / 2) * R * f];
    for (let i = 0; i < arms; i++) {
      head.rod([0, hubY, 0], tip(i, 1), 0.021, steel);
      const mid = tip(i, 0.45);
      head.rod([0, 0.92, 0], mid, 0.013, steel);
    }
    head.cylinder(0.045, 0.045, 0.1, [0, hubY, 0], steel, 12);
    const rings = [1, 0.82, 0.64, 0.46];
    for (const f of rings) for (let i = 0; i < arms; i++) head.rod(tip(i, f), tip((i + 1) % arms, f), 0.0065, cord);

    const patterned = a.pattern === 'plain' ? null : pattern(a.pattern, random);
    const cloth = (colour: THREE.Color, withPattern: boolean) => new THREE.MeshStandardMaterial({ color: colour, map: withPattern ? patterned : null, side: THREE.DoubleSide, roughness: 0.95 });
    const shape = (outline: Outline, scale = 1) => {
      const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x * scale, y * scale)));
      return new THREE.ShapeGeometry(sh);
    };
    const sheetGeometry = () => {
      const g = new THREE.PlaneGeometry(1.26, 0.92, 10, 6);
      g.translate(0, -0.46, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 4 + 1) * 0.06 * -p.getY(i) + Math.sin(p.getY(i) * 5) * 0.03);
      g.computeVertexNormals();
      return g;
    };

    type Item = { kind: Garment; colour: string; scale?: number; patterned?: boolean };
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const next = (): Item => {
      switch (a.wash) {
        case 'work-shirts': return random() < 0.68 ? { kind: 'shirt', colour: pick(['#4f79a8', '#3d5a80', '#6d8fb3', '#e4e02a', '#7d858c']), patterned: random() < 0.25 } : { kind: 'trousers', colour: pick(['#2f4668', '#3a5074', '#4a4f55']) };
        case 'baby-clothes': return random() < 0.6 ? { kind: 'onesie', colour: pick(['#f7b8cc', '#aedcf2', '#fff0a0', '#b9ecc6', '#ffffff']), patterned: random() < 0.4 } : random() < 0.75 ? { kind: 'nappy', colour: '#f6f4ee' } : { kind: 'sock', colour: pick(['#f7b8cc', '#aedcf2']), scale: 0.5 };
        case 'family-wash': {
          const r = random();
          if (r < 0.35) return { kind: 'shirt', colour: pick(['#e8453c', '#f2b92f', '#2f9bd8', '#3fae6a', '#f4f1e6', '#8a4fc2', '#ff7a2f']), scale: pick([1, 1, 0.62, 0.5]), patterned: random() < 0.5 };
          if (r < 0.5) return { kind: 'trousers', colour: pick(['#2f4668', '#6a6f5a', '#c9b48a']), scale: pick([1, 0.6]) };
          if (r < 0.7) return { kind: 'sock', colour: pick(['#f4f1e6', '#e8453c', '#2f9bd8', '#3a3a3a']) };
          if (r < 0.85) return { kind: 'towel', colour: pick(['#f2b92f', '#2fb5b0', '#e86aa8']), patterned: true };
          return { kind: 'dress', colour: pick(['#e86aa8', '#f2b92f', '#7fc8e8']), scale: pick([0.55, 0.9]), patterned: true };
        }
        case 'linens': return random() < 0.45 ? { kind: 'sheet', colour: pick(['#f6f4ee', '#f6f4ee', '#dfeaf2']), patterned: random() < 0.2 } : { kind: 'towel', colour: pick(['#f6f4ee', '#e8e2d0', '#cfe0ea']), patterned: random() < 0.3 };
        default: return { kind: 'sock', colour: '#f4f1e6' };
      }
    };

    const swayers: { node: THREE.Object3D; base: number; phase: number; reach: number }[] = [];
    const pegs: { at: P; size: number; color: string }[] = [];
    const pegColours = ['#d9b77a', '#d9b77a', '#e8453c', '#2f9bd8', '#f2c230', '#3fae6a'];
    const storm = a.state === 'storm-coming';
    const wind = new THREE.Vector3(Math.cos(0.6), 0, Math.sin(0.6));
    const hang = (item: Item, f: number, side: number, t: number) => {
      const from = new THREE.Vector3(...tip(side, f)), to = new THREE.Vector3(...tip((side + 1) % arms, f));
      const at = from.clone().lerp(to, t);
      const along = to.clone().sub(from).normalize();
      const pivot = new THREE.Group();
      pivot.position.copy(at);
      pivot.rotation.y = Math.atan2(-along.z, along.x);
      const scale = item.scale ?? 1;
      const colour = fade(item.colour);
      const mesh = new THREE.Mesh(item.kind === 'sheet' ? sheetGeometry() : shape(OUTLINES[item.kind], scale), cloth(colour, !!item.patterned && !!patterned));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.position.y = -0.012;
      pivot.add(mesh);
      if (item.kind === 'uniform') {
        for (const z of [-0.006, 0.006]) { const apron = new THREE.Mesh(shape(OUTLINES.apron), cloth(new THREE.Color('#f1e9d2'), false)); apron.position.set(0, -0.012, z); pivot.add(apron); }
        const collar = new THREE.Mesh(shape([[-0.13, 0], [0.13, 0], [0.07, -0.1], [0, -0.05], [-0.07, -0.1]]), cloth(fade('#f8f6f0'), false));
        collar.position.set(0, -0.01, 0.008);
        pivot.add(collar);
      }
      if (a.wash === 'work-shirts' && item.kind === 'shirt') {
        const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), cloth(new THREE.Color('#f4f1e6'), false));
        patch.position.set(0.12, -0.2, 0.004);
        pivot.add(patch);
        if (item.colour === '#e4e02a') { const band = new THREE.Mesh(new THREE.PlaneGeometry(0.47, 0.05), cloth(new THREE.Color('#c9ccd0'), false)); band.position.set(0, -0.4, 0.004); pivot.add(band); }
      }
      const zLocal = new THREE.Vector3(Math.sin(pivot.rotation.y), 0, Math.cos(pivot.rotation.y));
      const base = storm ? -zLocal.dot(wind) * 0.6 - Math.sign(zLocal.dot(wind) || 1) * 0.1 : a.state === 'forgotten' ? 0 : (random() - 0.5) * 0.12;
      pivot.rotation.x = base;
      head.root.add(pivot);
      swayers.push({ node: pivot, base, phase: random() * 6.28, reach: item.kind === 'sheet' ? 0.5 : 1 });
      const half = WIDTH[item.kind] * scale * (item.kind === 'shirt' || item.kind === 'uniform' ? 0.24 : item.kind === 'dress' ? 0.15 : 0.42);
      for (const dx of item.kind === 'sock' || item.kind === 'nappy' && random() < 0.3 ? [0] : [-half, half])
        pegs.push({ at: [at.x + along.x * dx, at.y + 0.012, at.z + along.z * dx], size: 1, color: pick(pegColours) });
    };

    if (a.wash === 'single-uniform') hang({ kind: 'uniform', colour: mood.cheer > 0.5 ? '#ee7fa2' : '#5fb8a4' }, 1, 0, 0.5);
    else if (a.wash === 'one-dress') hang({ kind: 'dress', colour: pick(['#e8453c', '#f2c230', '#5a8ad8', '#f4f1e6']), patterned: true }, 1, 0, 0.48);
    else if (a.wash === 'bare') {
      hang({ kind: 'sock', colour: pick(['#f4f1e6', '#e8453c']) }, 0.82, 1, 0.3);
      for (let i = 0; i < 7; i++) { const p = new THREE.Vector3(...tip(i % 4, 1)).lerp(new THREE.Vector3(...tip((i + 1) % 4, 1)), random()); pegs.push({ at: [p.x, p.y + 0.012, p.z], size: 1, color: pick(pegColours) }); }
    } else {
      const fill = mix(0.45, 1, mood.density);
      rings.slice(0, 3).forEach((f, ring) => {
        for (let side = 0; side < arms; side++) {
          if (a.state === 'half-in' && (side === 1 || side === 2 || ring === 2)) continue;
          if (ring > 0 && random() > fill + 0.15) continue;
          const length = f * R * Math.SQRT2;
          let cursor = 0.1;
          for (let guard = 0; guard < 8; guard++) {
            const item = next();
            const w = WIDTH[item.kind] * (item.scale ?? 1) + 0.04;
            if (cursor + w > length - 0.02) { if (item.kind === 'sheet' || guard < 4) continue; break; }
            if (random() < fill || ring === 0) hang(item, f, side, (cursor + w / 2) / length);
            cursor += w * 0.88 + (a.state === 'fresh-hung' ? 0.01 : random() * 0.1);
          }
        }
      });
    }
    head.scatter(new THREE.BoxGeometry(0.014, 0.07, 0.02), head.material('#ffffff', { roughness: 0.8 }), pegs);

    const lean = (random() - 0.5) * 0.04 + mood.wear * 0.07 + (storm ? 0.04 : 0);
    head.root.rotation.y = random() * 0.5 - 0.25;
    const tilt = new THREE.Group();
    tilt.add(head.root);
    s.root.add(tilt);
    s.root.rotation.z = lean;

    // Something that came off the line.
    if ((a.state === 'forgotten' || storm) && a.wash !== 'bare') {
      const dropped = a.wash === 'single-uniform' || a.wash === 'one-dress' ? { kind: 'sock' as Garment, colour: '#f4f1e6' } : next();
      if (dropped.kind !== 'sheet') {
        const fallen = new THREE.Mesh(shape(OUTLINES[dropped.kind], dropped.scale ?? 1), cloth(fade(dropped.colour), !!patterned));
        fallen.rotation.set(-Math.PI / 2, 0, random() * 6);
        fallen.position.set(storm ? 1.3 : 0.5 + random() * 0.4, 0.012, storm ? 0.9 : 0.6);
        fallen.castShadow = fallen.receiveShadow = true;
        s.root.add(fallen);
      }
    }

    if (a.footing === 'dirt-circle') {
      const ringGeometry = new THREE.RingGeometry(0.85, 1.35, 40);
      ringGeometry.rotateX(-Math.PI / 2);
      s.mesh(ringGeometry, s.material('#a08460', { roughness: 1 }), [0, 0.006, 0]).castShadow = false;
    } else if (a.footing === 'concrete-pad') s.box([0.5, 0.06, 0.5], [0, 0.03, 0], s.material('#9d9a90', { roughness: 0.95 })).rotation.y = 0.2;
    else if (a.footing === 'old-tyre') {
      s.ring(0.24, 0.1, [0, 0.1, 0], s.material('#262626', { roughness: 0.9 })).rotation.x = Math.PI / 2;
      s.cylinder(0.22, 0.22, 0.17, [0, 0.085, 0], s.material('#b7b4aa', { roughness: 0.95 }), 20);
    }

    if (a.basket === 'full-basket' || a.basket === 'empty-basket') {
      const b = new Sculpture(context);
      const plastic = b.material(mood.cheer > 0.5 ? '#3fa0d8' : '#e9e4d2', { side: THREE.DoubleSide, roughness: 0.5 });
      const wall = b.mesh(new THREE.CylinderGeometry(0.3, 0.23, 0.28, 18, 1, true), plastic, [0, 0.14, 0]);
      wall.scale.z = 0.72;
      b.cylinder(0.23, 0.23, 0.015, [0, 0.008, 0], plastic, 18).scale.z = 0.72;
      const rim = b.ring(0.3, 0.014, [0, 0.28, 0], plastic);
      rim.rotation.x = Math.PI / 2;
      rim.scale.y = 0.72;
      const slots = Array.from({ length: 24 }, (_u, i) => ({ at: [Math.cos(i / 24 * 6.283) * 0.268, 0.15, Math.sin(i / 24 * 6.283) * 0.268 * 0.72] as P, size: 1 }));
      b.scatter(new THREE.BoxGeometry(0.018, 0.12, 0.018), new THREE.MeshStandardMaterial({ color: '#3a4a55', roughness: 1 }), slots);
      if (a.basket === 'full-basket') for (let i = 0; i < 6; i++) b.ball([0.12 + random() * 0.06, 0.07, 0.1], [(random() - 0.5) * 0.3, 0.27 + random() * 0.07, (random() - 0.5) * 0.18], cloth(fade(next().colour), false), 10);
      else { b.root.rotation.z = Math.PI / 2 - 0.15; b.root.position.y = 0.22; }
      const holder = new THREE.Group();
      holder.add(b.root);
      holder.position.set(-1.0, 0, 0.85);
      holder.rotation.y = random() * 3;
      s.root.add(holder);
    } else if (a.basket === 'peg-bucket') {
      s.cylinder(0.1, 0.085, 0.13, [-0.6, 0.065, 0.7], s.material('#f1eee4', { roughness: 0.5 }), 16);
      s.scatter(new THREE.BoxGeometry(0.014, 0.07, 0.02), s.material('#ffffff'), Array.from({ length: 12 }, () => ({ at: [-0.6 + (random() - 0.5) * 0.14, 0.14 + random() * 0.02, 0.7 + (random() - 0.5) * 0.14] as P, size: 1, color: pick(pegColours) })));
    }

    const spin = (storm ? 0.02 : mix(0.02, 0.4, mood.energy)) * (random() < 0.5 ? -1 : 1);
    const flutter = storm ? mix(0.12, 0.3, mood.energy) : a.state === 'forgotten' ? mix(0.01, 0.08, mood.energy) : mix(0.03, 0.3, mood.energy);
    const speed = storm ? 5 : 1.6;
    return s.finish({
      footprint: 0.9,
      update: (dt, time) => {
        head.root.rotation.y += dt * spin;
        for (const sw of swayers) sw.node.rotation.x = sw.base + Math.sin(time * speed + sw.phase) * flutter * sw.reach;
      },
    });
  },
});
