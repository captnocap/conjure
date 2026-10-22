import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  'teal-rose': 'Rose-red gas near the waist fading to sea-glass teal at the tips.',
  'gold-crimson': 'Molten gold at the pinch deepening to crimson, like sand lit from behind.',
  'violet-ice': 'Pale ice blue inside a soft violet skin, cold and precise.',
  'green-amber': 'Amber at the heart and bottle green outside, old glass and lamplight.',
  'ash-pearl': 'Pearl white and dove grey with only a breath of pink, almost colourless.',
  'ink-magenta': 'Hot magenta inside a deep indigo skin, theatrical and nocturnal.',
} as const;
const TINTS: Record<keyof typeof COLOURS, [string, string]> = {
  'teal-rose': ['#e8566f', '#2fa7a0'],
  'gold-crimson': ['#f4b53a', '#b3262e'],
  'violet-ice': ['#9fd8ee', '#7a5bbf'],
  'green-amber': ['#f0a23c', '#2f8a56'],
  'ash-pearl': ['#f1d9d6', '#8d93a0'],
  'ink-magenta': ['#ee3f9c', '#343a94'],
};

/** A streaky gas skin: colour runs from the waist (bottom of the canvas) to the tip, alpha is torn into filaments. */
function gas(random: () => number, hot: THREE.Color, cool: THREE.Color, body: number, tatter: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const css = (c: THREE.Color, alpha: number) => `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${alpha})`;
  const fade = ctx.createLinearGradient(0, 512, 0, 0);
  fade.addColorStop(0, css(hot, Math.min(1, body + 0.25)));
  fade.addColorStop(0.35, css(hot.clone().lerp(cool, 0.6), body));
  fade.addColorStop(1, css(cool, body));
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 150; i++) {
    const x = random() * 512, wide = 1 + random() * 5, from = random() * 300, length = 120 + random() * 380;
    const bright = random() < 0.55;
    const tone = bright ? cool.clone().lerp(new THREE.Color('#ffffff'), 0.45) : cool.clone().multiplyScalar(0.55);
    ctx.strokeStyle = css(tone, 0.25 + random() * 0.4);
    ctx.lineWidth = wide;
    ctx.beginPath();
    ctx.moveTo(x, 512 - from);
    ctx.bezierCurveTo(x + (random() - 0.5) * 30, 512 - from - length * 0.3, x + (random() - 0.5) * 40, 512 - from - length * 0.7, x + (random() - 0.5) * 50, 512 - from - length);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'destination-out';
  const holes = Math.round(20 + tatter * 120);
  for (let i = 0; i < holes; i++) {
    const x = random() * 512, y = random() ** 1.6 * 440, radius = 8 + random() * (14 + tatter * 34);
    const hole = ctx.createRadialGradient(x, y, 0, x, y, radius);
    hole.addColorStop(0, `rgba(0,0,0,${0.35 + tatter * 0.6})`);
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole;
    ctx.save();
    ctx.translate(x, y); ctx.scale(0.5, 2.2); ctx.translate(-x, -y);
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'source-over';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    lobes: choice('What shape are the two lobes?', {
      hourglass: 'Two closed teardrop bulbs meeting point to point, an hourglass or a pair of glass ornaments.',
      butterfly: 'Two wide flat fans flaring open like butterfly wings or a bow tie.',
      jets: 'Two long narrow spindles shot out in opposite directions, a needle through a bead.',
      rings: 'Two open cones built from stacked bright hoops that widen as they go, like smoke rings or a slinky.',
      bubbles: 'Two round soap bubbles pressed together where they touch.',
    }),
    colours: choice('What colours is the gas?', COLOURS),
    waist: score('How sharp is the pinch at the waist?', ['A soft broad saddle', 'A clear narrowing', 'A tight cinch', 'Pinched to a single point']),
    tilt: score('How far is it tilted toward us?', ['Seen exactly side-on, upright', 'Leaning', 'Tipped well over', 'Almost looking down the barrel into one lobe']),
    centre: choice('What sits at the pinch, inside the ring?', {
      star: 'One tiny white-hot star, the thing that made all this.',
      band: 'A dark band of dust that hides the star, a belt drawn tight.',
      twins: 'Two small stars circling each other.',
      empty: 'Nothing visible at all: only the bright ring.',
    }),
    balance: choice('How are the two halves balanced?', {
      equal: 'Perfect twins, exactly matched.',
      draining: 'Like a running hourglass: the upper lobe is thinning and bright grains are falling through the waist into the lower one.',
      'nearly-out': 'Time is almost up: one lobe is a pale ghost and the other is heavy and full.',
      unequal: 'One lobe has simply grown larger than the other, a lopsided pair.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [hotHex, coolHex] = TINTS[a.colours];
    const shift = new THREE.Color(mood.warmth > 0.5 ? '#ff8a3c' : '#4aa8ff');
    const lean = Math.abs(mood.warmth - 0.5) * 0.36;
    const hot = new THREE.Color(hotHex).lerp(shift, lean), cool = new THREE.Color(coolHex).lerp(shift, lean);
    const glow = mix(0.35, 0.8, mood.cheer);
    const L = 1.7, W = 1;
    const w0 = mix(0.42, 0.03, a.waist) * W;
    const profile = (t: number): [number, number] => {
      switch (a.lobes) {
        case 'butterfly': return [w0 + W * 1.25 * t ** 1.3, L * 0.9 * t];
        case 'jets': return [w0 * (1 - t) ** 2 + W * 0.34 * Math.sin(Math.PI * t ** 0.6) ** 0.6, L * 1.45 * t];
        case 'rings': return [w0 + W * 0.95 * t ** 0.85, L * t];
        case 'bubbles': return [w0 * (1 - t) ** 4 + W * 0.92 * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)), L * 1.05 * t];
        default: return [w0 * (1 - t) ** 2 + W * Math.sin(Math.PI * t ** 0.85) ** 1.25, L * t];
      }
    };
    const open = a.lobes === 'butterfly' || a.lobes === 'rings';
    const flat = a.lobes === 'butterfly' ? 0.42 : 1;
    const points = Array.from({ length: 41 }, (_unused, i) => new THREE.Vector2(...profile(i / 40)));
    const shellGeometry = new THREE.LatheGeometry(points, 56);

    const body = new THREE.Group();
    s.root.add(body);
    const sizes = { equal: [1, 1], draining: [0.92, 1.05], 'nearly-out': [0.95, 1.05], unequal: [1.25, 0.78] }[a.balance];
    if (random() < 0.5 && a.balance === 'unequal') sizes.reverse();
    const strength = { equal: [1, 1], draining: [0.6, 1.15], 'nearly-out': [0.25, 1.25], unequal: [1, 1] }[a.balance];
    const tatter = mood.wear * 0.8;
    const lobes: THREE.Group[] = [];
    const knots: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    [0, 1].forEach((half) => {
      const lobe = new THREE.Group();
      const size = sizes[half], power = strength[half];
      const ghost = power < 0.5;
      const outerSkin = gas(random, hot, cool, (a.lobes === 'rings' ? 0.3 : 0.55) * Math.min(1, power + 0.15), tatter + (ghost ? 0.5 : 0));
      const outer = new THREE.Mesh(shellGeometry, new THREE.MeshStandardMaterial({
        map: outerSkin, emissiveMap: outerSkin, emissive: '#ffffff', emissiveIntensity: glow * Math.min(1, power), transparent: true, side: THREE.DoubleSide, roughness: 0.35, alphaTest: 0.03,
      }));
      outer.renderOrder = 3;
      outer.castShadow = true;
      lobe.add(outer);
      if (!ghost && a.lobes !== 'rings') {
        const innerSkin = gas(random, hot.clone().lerp(new THREE.Color('#ffffff'), 0.35), hot, 0.7, tatter);
        const inner = new THREE.Mesh(shellGeometry, new THREE.MeshStandardMaterial({
          map: innerSkin, emissiveMap: innerSkin, emissive: '#ffffff', emissiveIntensity: glow * 1.1, transparent: true, side: THREE.DoubleSide, roughness: 0.4, depthWrite: false,
        }));
        inner.scale.set(0.56, 0.7, 0.56);
        inner.renderOrder = 1;
        lobe.add(inner);
      }
      const hoopPaint = new THREE.MeshStandardMaterial({ color: cool.clone().lerp(new THREE.Color('#ffffff'), 0.35), emissive: cool, emissiveIntensity: glow * power, roughness: 0.4 });
      const hoops = a.lobes === 'rings' ? 5 : open ? 1 : 0;
      for (let i = 0; i < hoops; i++) {
        const t = hoops === 1 ? 1 : 0.28 + (i / (hoops - 1)) * 0.72;
        const [r, y] = profile(t);
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, a.lobes === 'rings' ? 0.035 : 0.022, 8, 72), hoopPaint);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.y = y;
        hoop.castShadow = true;
        lobe.add(hoop);
      }
      if (a.lobes === 'jets') {
        const tip = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), hoopPaint);
        tip.position.y = profile(1)[1];
        lobe.add(tip);
      }
      lobe.scale.set(size, size, size * flat);
      if (half === 1) lobe.rotation.x = Math.PI;
      body.add(lobe);
      lobes.push(lobe);
      // Bright knots caught in the skin.
      const count = Math.round(mix(4, 26, mood.density) * power);
      for (let i = 0; i < count; i++) {
        const [r, y] = profile(0.25 + random() * 0.75), angle = random() * Math.PI * 2;
        knots.push({ at: [Math.cos(angle) * r * size, (half ? -1 : 1) * y * size, Math.sin(angle) * r * size * flat], size: 0.02 + random() * 0.03, color: cool.clone().lerp(new THREE.Color('#ffffff'), 0.5) });
      }
    });
    // The hourglass metaphor made literal: grains falling through the waist and heaped below.
    if (a.balance === 'draining' || a.balance === 'nearly-out') {
      const grains = a.balance === 'draining' ? 40 : 12;
      for (let i = 0; i < grains; i++) knots.push({ at: [(random() - 0.5) * w0 * 0.8, mix(0.5, -1.1, random()), (random() - 0.5) * w0 * 0.8], size: 0.022 + random() * 0.02, color: hot.clone().lerp(new THREE.Color('#ffffff'), 0.5) });
      const heap = a.balance === 'draining' ? 90 : 170;
      const floor = a.lobes === 'hourglass' || a.lobes === 'bubbles' ? 0.82 : 0.6;
      for (let i = 0; i < heap; i++) {
        const t = floor - random() ** 2 * 0.3, [r, y] = profile(t), angle = random() * Math.PI * 2, inset = Math.sqrt(random()) * 0.85;
        knots.push({ at: [Math.cos(angle) * r * inset * sizes[1], -y * sizes[1], Math.sin(angle) * r * inset * sizes[1] * flat], size: 0.03 + random() * 0.03, color: hot.clone().lerp(new THREE.Color('#ffffff'), random() * 0.5) });
      }
    }
    body.add(s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: glow * 0.5, roughness: 0.6 }), knots));

    // The bright ring at the pinch, with a softer skirt around it.
    const ringRadius = w0 * 1.1 + 0.1;
    const ringPaint = new THREE.MeshStandardMaterial({ color: '#fff3d6', emissive: hot.clone().lerp(new THREE.Color('#ffffff'), 0.4), emissiveIntensity: 1.1, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadius, 0.045, 10, 80), ringPaint);
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(ringRadius + 0.12, 0.13, 8, 64), new THREE.MeshBasicMaterial({ color: hot, transparent: true, opacity: 0.3, depthWrite: false }));
    skirt.rotation.x = Math.PI / 2;
    skirt.scale.z = 0.35;
    body.add(ring, skirt);
    const stars: THREE.Mesh[] = [];
    const starPaint = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    if (a.centre === 'star') stars.push(new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), starPaint));
    if (a.centre === 'twins') for (const side of [-1, 1]) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(side < 0 ? 0.06 : 0.04, 12, 8), starPaint);
      star.position.x = side * Math.max(0.07, ringRadius * 0.45);
      stars.push(star);
    }
    const pair = new THREE.Group();
    for (const star of stars) pair.add(star);
    body.add(pair);
    if (a.centre === 'band') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(ringRadius + 0.06, 0.1, 10, 64), s.material('#241a1c', { roughness: 0.95 }));
      band.rotation.x = Math.PI / 2;
      band.scale.z = 0.8;
      band.castShadow = true;
      body.add(band);
      ring.scale.setScalar(1.28);
    }

    body.rotation.x = mix(0, a.lobes === 'butterfly' ? 0.55 : 1.0, a.tilt);
    body.rotation.z = (random() - 0.5) * 0.24;
    const spin = mix(0.02, 0.22, mood.energy);
    return s.finish({
      footprint: W * 0.7,
      update: (dt, time) => {
        for (const lobe of lobes) lobe.rotateY(dt * spin * (flat < 1 ? 0 : 1));
        pair.rotation.y += dt * spin * 6;
        ringPaint.emissiveIntensity = 1.1 + Math.sin(time * mix(0.6, 2.4, mood.energy)) * 0.25;
      },
    });
  },
});
