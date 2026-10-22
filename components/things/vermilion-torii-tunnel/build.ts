import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

/** A made-up brush character: a handful of strokes in a square cell. No fonts needed. */
function glyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, random: () => number) {
  ctx.lineWidth = size * 0.11;
  ctx.lineCap = 'round';
  const strokes = 4 + Math.floor(random() * 4);
  for (let i = 0; i < strokes; i++) {
    const kind = random();
    const a = x + (random() - 0.5) * size * 0.7, b = y + (random() - 0.5) * size * 0.7;
    ctx.beginPath();
    if (kind < 0.4) { ctx.moveTo(x - size * 0.4, b); ctx.lineTo(x + size * 0.4, b + (random() - 0.5) * size * 0.1); }
    else if (kind < 0.7) { ctx.moveTo(a, y - size * 0.42); ctx.lineTo(a, y + size * 0.42); }
    else if (kind < 0.85) { ctx.moveTo(a, b - size * 0.2); ctx.quadraticCurveTo(a, b + size * 0.2, a - size * 0.35, b + size * 0.35); }
    else { ctx.moveTo(a, b - size * 0.2); ctx.quadraticCurveTo(a, b + size * 0.2, a + size * 0.35, b + size * 0.35); }
    ctx.stroke();
  }
}

const PAINTS = {
  vermilion: 'Fresh glossy vermilion, the orange-red of new lacquer.',
  crimson: 'A deeper blood red, older and more solemn.',
  faded: 'Sun-bleached to salmon and chalky pink, paint flaking off grey wood.',
  bare: 'Unpainted weathered cedar, silver-grey, a poor mountain shrine.',
  white: 'Bone-white posts with black bases, ghostly and strange.',
} as const;
const PAINT_HEX: Record<keyof typeof PAINTS, string> = {
  vermilion: '#e2441c', crimson: '#b3201f', faded: '#d98f76', bare: '#9a8f80', white: '#e9e3d6',
};

export default defineThing({
  questions: {
    run: choice('How long is the run of gates?', {
      pair: 'Only three gates, a brief threshold.',
      short: 'Five gates, a short tunnel.',
      long: 'Eight gates packed post against post, a real corridor of red.',
      dense: 'Eleven gates so tight almost no light comes between them.',
    }),
    path: choice('How does the tunnel run?', {
      straight: 'Dead straight on level flagstones.',
      curve: 'Bending gently away so you cannot see the far end.',
      climb: 'Climbing a flight of stone steps, each gate higher than the last.',
      sink: 'Shrinking with distance: each gate a little smaller, a forced perspective into another world.',
    }),
    paint: choice('What colour are the gates?', PAINTS),
    lintel: choice('What shape are the top beams?', {
      myojin: 'Upswept at the ends like a slow smile, with a black cap beam.',
      shinmei: 'Plain straight logs, austere and ancient.',
    }),
    inscriptions: choice('What is written on the posts?', {
      donors: 'Black brush characters running down every post: donor names and dates.',
      gold: 'Gilded characters, expensive, from companies and rich patrons.',
      none: 'Nothing; the posts are blank.',
    }),
    story: choice('What has happened along the tunnel?', {
      tended: 'Swept and cared for, every gate standing true.',
      leaning: 'One gate has slumped sideways against its neighbour and nobody has righted it.',
      fallen: 'One gate has rotted through and collapsed across the path.',
      newest: 'The last gate is brand new, raw pale timber not yet painted.',
      snow: 'Snow lies on every beam and drifts along the path.',
      leaves: 'Autumn leaves have blown in and banked against the post bases.',
    }),
    lanterns: noul('Do lit paper lanterns hang inside the tunnel?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { pair: 3, short: 5, long: 8, dense: 11 }[a.run];
    const pitch = a.run === 'dense' ? 0.56 : a.run === 'long' ? 0.62 : 0.8;
    const base = new THREE.Color(PAINT_HEX[a.paint]);
    const grey = new THREE.Color('#8d8679');

    // One inscription texture per variant: a column of characters on each face of the post.
    const postTexture = (tint: THREE.Color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${tint.getHexString()}`;
      ctx.fillRect(0, 0, 64, 512);
      // Flaking and grain.
      for (let i = 0; i < 60 * mood.wear + 6; i++) {
        ctx.fillStyle = random() < 0.5 ? 'rgba(120,110,100,0.35)' : 'rgba(40,20,10,0.18)';
        ctx.fillRect(random() * 64, random() * 512, 1 + random() * 3, 6 + random() * 40);
      }
      if (a.inscriptions !== 'none') {
        ctx.strokeStyle = a.inscriptions === 'gold' ? '#f1c75a' : '#17120f';
        const n = 5 + Math.floor(random() * 4);
        for (let i = 0; i < n; i++) glyph(ctx, 32, 110 + i * 44, 34, random);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = 2;
      texture.offset.x = 0.5;
      return texture;
    };

    const black = s.material('#1b1a1c', { roughness: 0.55 });
    const stone = s.material('#9b9a90', { roughness: 0.95 });
    const snow = new THREE.MeshStandardMaterial({ color: '#f4f6f8', roughness: 0.9 });
    const postGeometry = new THREE.CylinderGeometry(0.105, 0.125, 1, 14);
    const baseGeometry = new THREE.CylinderGeometry(0.15, 0.16, 0.34, 14);
    const footGeometry = new THREE.CylinderGeometry(0.22, 0.25, 0.1, 14);

    const beam = (half: number, rise: number, thick: number, depth: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-half, rise);
      shape.quadraticCurveTo(0, -rise * 0.35, half, rise);
      shape.lineTo(half + thick * 0.35, rise + thick);
      shape.quadraticCurveTo(0, thick - rise * 0.35, -half - thick * 0.35, rise + thick);
      shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    };

    const special = count > 2 ? 1 + Math.floor(random() * (count - 2)) : 0;
    const lanterns: THREE.Object3D[] = [];
    const gates: { z: number; x: number; y: number; scale: number }[] = [];

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1);
      const z = (count - 1) * pitch / 2 - i * pitch;
      const x = a.path === 'curve' ? Math.sin(t * 1.25) * (count * pitch) * 0.3 : 0;
      const yaw = a.path === 'curve' ? -Math.cos(t * 1.25) * 1.25 * 0.3 * 1 : 0;
      const y = a.path === 'climb' ? i * 0.2 : 0;
      const scale = (a.path === 'sink' ? mix(1.12, 0.6, t) : 1) * mix(0.94, 1.06, random());
      gates.push({ z, x, y, scale });

      const raw = a.story === 'newest' && i === count - 1;
      const tint = raw ? new THREE.Color('#e3c797') : base.clone().offsetHSL((random() - 0.5) * 0.025, 0, (random() - 0.5) * 0.08).lerp(grey, mood.wear * random() * 0.6);
      const post = new THREE.MeshStandardMaterial({ map: raw ? null : postTexture(tint), color: raw ? tint : '#ffffff', roughness: mix(0.4, 0.9, mood.wear) });
      const paint = new THREE.MeshStandardMaterial({ color: tint, roughness: mix(0.4, 0.9, mood.wear) });
      const cap = raw ? paint : a.lintel === 'myojin' ? black : paint;

      const gate = new THREE.Group();
      const height = 2.75, half = 1.02;
      for (const side of [-1, 1]) {
        const column = new THREE.Mesh(postGeometry, post);
        column.scale.y = height;
        column.position.set(side * half, height / 2, 0);
        column.rotation.z = a.lintel === 'myojin' ? side * 0.035 : 0;
        const foot = new THREE.Mesh(baseGeometry, raw ? paint : black);
        foot.position.set(side * (half + 0.045), 0.17, 0);
        const plinth = new THREE.Mesh(footGeometry, stone);
        plinth.position.set(side * (half + 0.045), 0.02, 0);
        gate.add(column, foot, plinth);
      }
      // Tie beam passing through the posts, with wedges, and the short strut above it.
      const tie = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 0.5, 0.15, 0.1), paint);
      tie.position.y = height - 0.52;
      gate.add(tie);
      if (a.lintel === 'myojin') {
        const top = new THREE.Mesh(beam(half + 0.3, 0.13, 0.16, 0.2), paint);
        top.position.y = height - 0.06;
        const capBeam = new THREE.Mesh(beam(half + 0.4, 0.15, 0.085, 0.26), cap);
        capBeam.position.y = height + 0.1;
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.08), paint);
        strut.position.y = height - 0.27;
        gate.add(top, capBeam, strut);
      } else {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, half * 2 + 0.75, 12), paint);
        log.rotation.z = Math.PI / 2;
        log.position.y = height + 0.08;
        gate.add(log);
      }
      if (a.story === 'snow') {
        const drift = new THREE.Mesh(beam(half + 0.36, a.lintel === 'myojin' ? 0.15 : 0, 0.1, 0.24), snow);
        drift.position.y = height + (a.lintel === 'myojin' ? 0.18 : 0.17);
        gate.add(drift);
      }
      if (a.lanterns && i % 2 === 1) {
        const glow = mix(1.6, 0.5, Math.abs(mood.daylight - 0.5) < 0.25 ? 1 : 0);
        const lantern = new THREE.Group();
        const paper = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: '#fff0c9', emissive: new THREE.Color().setHSL(mix(0.13, 0.06, mood.warmth), 0.9, 0.55), emissiveIntensity: glow, roughness: 0.8 }));
        paper.scale.y = 1.25;
        paper.position.y = -0.36;
        const rims = [-0.17, -0.55].map((ry) => { const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 12), black); rim.position.y = ry; return rim; });
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.17, 5), black);
        cord.position.y = -0.085;
        lantern.add(paper, cord, ...rims);
        lantern.position.set((random() - 0.5) * 0.5, height - 0.6, 0);
        gate.add(lantern);
        lanterns.push(lantern);
      }

      gate.scale.setScalar(scale);
      gate.position.set(x, y, z);
      gate.rotation.y = yaw + (random() - 0.5) * 0.03;
      if (i === special && a.story === 'leaning') { gate.rotation.z = 0.2; gate.rotation.x = -0.12; gate.position.x += 0.12; }
      if (i === special && a.story === 'fallen') {
        gate.rotation.set(-Math.PI / 2 + 0.12, yaw + 0.35, 0.08);
        gate.position.set(x + 0.2, y + 0.2, z + 0.2);
      }
      gate.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(gate);
    }

    // The path underneath: flagstones, steps or a curve of paving.
    const flag = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 });
    const flagTint = new THREE.Color('#a3a297');
    const stones: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    for (const [i, gate] of gates.entries()) {
      const next = gates[Math.min(i + 1, gates.length - 1)];
      if (a.path === 'climb') {
        s.box([2.7, 0.2 + gate.y, pitch + 0.02], [gate.x, gate.y / 2 - 0.1, gate.z], stone);
        s.box([1.5, 0.03, pitch * 0.9], [gate.x, gate.y + 0.012, gate.z], s.material('#b3b2a6', { roughness: 0.95 }));
      } else {
        for (const column of [-1, 0, 1]) {
          stones.push({ at: [mix(gate.x, next.x, 0.5) + column * 0.5 + (random() - 0.5) * 0.04, 0, gate.z - pitch * 0.1 + (column === 0 ? pitch * 0.4 : 0)], size: 1, color: flagTint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1) });
        }
      }
    }
    if (stones.length) {
      const paving = s.scatter(new THREE.BoxGeometry(0.47, 0.06, pitch * 0.92), flag, stones);
      paving.castShadow = false;
      const ends = gates[0].z - gates[gates.length - 1].z;
      // An earth and moss bed so the gates stand on something.
      const bed = s.box([3.1, 0.08, ends + pitch + 0.5], [gates[Math.floor(count / 2)].x * 0.9, -0.05, 0], s.material(new THREE.Color('#5f6b45').lerp(new THREE.Color('#77705f'), mood.wear * 0.5), { roughness: 1 }));
      if (a.path === 'curve') bed.scale.x = 1 + count * 0.05;
    }

    if (a.story === 'leaves' || a.story === 'snow') {
      const litter: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
      const n = Math.round(mix(60, 220, mood.density));
      for (let i = 0; i < n; i++) {
        const gate = gates[Math.floor(random() * gates.length)];
        const side = random() < 0.75 ? (random() < 0.5 ? -1 : 1) * (0.75 + random() * 0.55) : (random() - 0.5) * 1.4;
        litter.push({
          at: [gate.x + side * gate.scale, gate.y + 0.03, gate.z + (random() - 0.5) * pitch],
          size: a.story === 'snow' ? 0.5 + random() * 1.3 : 0.5 + random() * 0.8,
          color: a.story === 'snow' ? new THREE.Color('#f3f5f7') : new THREE.Color().setHSL(0.02 + random() * 0.1, 0.8, 0.35 + random() * 0.2),
        });
      }
      const geometry = a.story === 'snow' ? new THREE.SphereGeometry(0.14, 7, 5) : new THREE.CircleGeometry(0.06, 5);
      if (a.story === 'snow') geometry.scale(1, 0.35, 1); else geometry.rotateX(-Math.PI / 2);
      s.scatter(geometry, new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }), litter);
    }

    const sway = mix(0.02, 0.16, mood.energy);
    const phases = lanterns.map(() => random() * 6);
    return s.finish({
      update: (_dt, time) => { for (const [i, lantern] of lanterns.entries()) lantern.rotation.z = Math.sin(time * 1.3 + phases[i]) * sway; },
    });
  },
});
