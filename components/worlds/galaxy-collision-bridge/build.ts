import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

const SKIES = {
  indigo: 'Deep indigo dusk, the classic night between galaxies.',
  plum: 'Plum and wine, intimate and heavy.',
  teal: 'Dark teal, cold water, a long way from anywhere.',
  slate: 'Mid grey-blue, a calm overcast neutrality.',
  ember: 'Brown-red, the whole sky warmed by the collision.',
  atlas: 'Pale paper, drawn like a plate in an astronomical atlas.',
} as const;
const SKY: Record<keyof typeof SKIES, string> = { indigo: '#2a3460', plum: '#43294c', teal: '#1e4750', slate: '#4b546c', ember: '#55302c', atlas: '#e2e5df' };

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.16)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

export default defineWorld({
  questions: {
    stage: choice('How far along is the merger?', {
      approach: 'First pass: two mostly intact discs, only just reaching for each other across a thin bridge.',
      embrace: 'Mid-embrace: both discs badly warped, a thick bridge, long tails thrown out behind.',
      tangled: 'Tangled: the cores are close, the discs are shredded and wrapped round each other.',
      afterglow: 'Nearly one: two cores inside a single shared haze, with faint shells rippling outward.',
    }),
    sky: choice('What is the surrounding sky like?', SKIES),
    balance: choice('Are the two galaxies equals?', {
      equals: 'Equals: neither will swallow the other.',
      blue: 'The cool blue one is much larger; the gold one is being absorbed.',
      gold: 'The warm gold one is much larger; the blue one is being absorbed.',
    }),
    bridge: choice('What is the bridge between them like?', {
      luminous: 'A broad luminous band, generous and unbroken.',
      beaded: 'A string of bright pink star-forming knots, like lights along a pier.',
      thread: 'A single thin thread, barely holding.',
      braided: 'Two strands twisted round each other, one from each side.',
      broken: 'Snapped in the middle: two frayed ends reaching across a gap.',
    }),
    tails: choice('What shape are the tails flung outward?', {
      sweeping: 'Long sweeping arcs, like arms thrown wide.',
      hooks: 'Tight hooks curling back toward their own galaxy.',
      stubs: 'Short stubs: little has been thrown away yet.',
      loops: 'Great loops that wind most of the way round.',
    }),
    birth: score('How much new star formation has the collision lit?', ['None: old light only', 'A few pink knots along the seam', 'Bright knots along the bridge and arms', 'Both galaxies ablaze with it']),
    witnesses: noul('Are small dwarf galaxies scattered round the edges, watching?'),
    view: choice('Where are we watching from?', {
      oblique: 'A broad oblique vista.',
      above: 'High above, a diagram of the encounter.',
      low: 'Low and close to the plane, the tails rising overhead.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const paper = a.sky === 'atlas';
    const set = { approach: { sep: 5.9, warp: 0.25, band: 0.26, tail: 0.65, shred: 0.05 }, embrace: { sep: 5.2, warp: 0.65, band: 0.42, tail: 1, shred: 0.3 }, tangled: { sep: 4.3, warp: 1, band: 0.6, tail: 1.2, shred: 0.65 }, afterglow: { sep: 3.6, warp: 0.8, band: 0.85, tail: 0.9, shred: 0.9 } }[a.stage];
    const shred = clamp01(set.shred + mood.wear * 0.2);
    const sizes = { equals: [2.5, 2.5], blue: [3.1, 1.6], gold: [1.6, 3.1] }[a.balance];
    // Blue on the left and a little behind, gold on the right and a little forward.
    const centres = [new THREE.Vector3(-set.sep, 0, -1.0), new THREE.Vector3(set.sep, 0, 1.0)];
    const toOther = [centres[1].clone().sub(centres[0]).normalize(), centres[0].clone().sub(centres[1]).normalize()];
    const spins = [1, 1];
    const across = new THREE.Vector3(-toOther[0].z, 0, toOther[0].x);

    // The bridge: an S between the two near edges, passing through the origin.
    const ends = [centres[0].clone().addScaledVector(toOther[0], sizes[0] * 0.7), centres[1].clone().addScaledVector(toOther[1], sizes[1] * 0.7)];
    const sway = mix(0.5, 1.1, random());
    const bridge = new THREE.CatmullRomCurve3([
      ends[0],
      ends[0].clone().lerp(ends[1], 0.25).addScaledVector(across, sway).setY(0.25),
      new THREE.Vector3(0, 0.4, 0),
      ends[0].clone().lerp(ends[1], 0.75).addScaledVector(across, -sway).setY(0.25),
      ends[1],
    ]);
    const tailShape = { sweeping: { sweep: 1.5, grow: 4.4, curl: 0 }, hooks: { sweep: 1.5, grow: 3.1, curl: 2.4 }, stubs: { sweep: 0.9, grow: 1.7, curl: 0 }, loops: { sweep: 4.2, grow: 2.3, curl: 0 } }[a.tails];
    const tailAt = (which: number, t: number) => {
      const base = Math.atan2(-toOther[which].z, -toOther[which].x) + 0.5 * spins[which];
      const angle = base - spins[which] * (tailShape.sweep * t + tailShape.curl * t * t * t);
      const r = sizes[which] * 0.85 + tailShape.grow * set.tail * t * (1 - 0.3 * tailShape.curl * t * t * t * 0.4) * (sizes[which] / 2.5) ** 0.5;
      return new THREE.Vector3(centres[which].x + Math.cos(angle) * r, mix(0, 1.5, t * t) * set.tail, centres[which].z + Math.sin(angle) * r * 0.8);
    };

    const slotAt = (p: THREE.Vector3, lift: number, size: number) => [p.x, p.z, lift, size] as const;
    const bridgeSlot = (t: number, side: number) => slotAt(bridge.getPoint(t).addScaledVector(across, side * 1.5), 1.1, 0.66);
    const slots = [
      [0, 0.25, 0.75, 1.12] as const,
      bridgeSlot(0.24, 1),
      bridgeSlot(0.76, -1),
      slotAt(tailAt(0, 1), 1.9 * set.tail, 0.62),
      slotAt(tailAt(1, 1), 1.9 * set.tail, 0.62),
      slotAt(tailAt(0, 0.55), 1.0, 0.5),
      slotAt(tailAt(1, 0.55), 1.0, 0.5),
    ];
    const sky = new THREE.Color(SKY[a.sky]);
    if (!paper) sky.offsetHSL(0, 0, (1 - Math.abs(mood.daylight - 0.5) * 2) * 0.05 + (mood.cheer - 0.5) * 0.04);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: null, width: set.sep * 2 + 4, depth: 6, maxHeight: 4.2, radius: 2.15,
      pitch: { oblique: 36, above: 60, low: 22 }[a.view], yaw: 14, slots,
    });
    const root = s.root;

    // On a dark sky the stars are light; on paper they are inked.
    const tone = (hex: string, lift = 0) => {
      const colour = new THREE.Color(hex);
      return paper ? colour.offsetHSL(0, 0.1, -0.16 + lift * 0.3) : colour.offsetHSL(0, (mood.cheer - 0.5) * 0.15, lift);
    };
    const cool = [tone('#6fa8ff'), tone('#a9ccff', 0.04), tone('#3f74e8')];
    const warm = [tone('#ffbf55'), tone('#ffe0a0', 0.04), tone('#f08a3a')];
    warm.forEach((colour) => colour.offsetHSL(-0.02 * mood.warmth, 0, 0));
    const pinkTone = tone('#ff5fa0');
    const families = [cool, warm];
    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const glow = mix(0.6, 1.2, mood.cheer);
    const blending = paper ? THREE.NormalBlending : THREE.AdditiveBlending;
    const halo = glowTexture();
    const haze = (at: THREE.Vector3, radius: number, colour: THREE.Color, opacity: number, squash = 1) => {
      const disc = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2 * squash), new THREE.MeshBasicMaterial({ map: halo, color: colour, transparent: true, opacity: opacity * (paper ? 0.75 : 1), depthWrite: false, blending, side: THREE.DoubleSide }));
      disc.rotation.x = -Math.PI / 2;
      disc.position.copy(at);
      root.add(disc);
      return disc;
    };
    const knots: THREE.Mesh[] = [];
    const knot = (at: THREE.Vector3, size: number, colour: THREE.Color) => {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 1), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.6, emissive: colour, emissiveIntensity: glow * 0.9 }));
      mesh.position.copy(at);
      root.add(mesh);
      knots.push(mesh);
      for (let k = 0; k < 7; k++) stars.push({ at: at.clone().add(new THREE.Vector3(gauss(), gauss() * 0.5, gauss()).multiplyScalar(size * 2.4)).toArray(), size: size * mix(0.15, 0.32, random()), color: colour.clone().offsetHSL(0, 0, 0.08) });
    };

    // The two discs. Each keeps its own spiral, bent toward the other.
    const discs: THREE.Group[] = [];
    centres.forEach((centre, which) => {
      const R = sizes[which], family = families[which];
      const disc = new THREE.Group();
      disc.position.copy(centre);
      disc.rotation.set(which ? -0.22 : 0.3, 0, which ? 0.28 : -0.24);
      const own: typeof stars = [];
      const count = Math.round(mix(700, 1900, mood.density) * (R / 2.5) ** 1.3);
      const warpToward = Math.atan2(toOther[which].z, toOther[which].x);
      for (let i = 0; i < count; i++) {
        const r = R * Math.pow(random(), 0.62), arm = (i % 2) * Math.PI;
        const angle = arm + spins[which] * Math.log(1 + r * 1.6) * 2.5 + gauss() * mix(0.35, 1.3, shred) * (0.4 + r / R);
        const pull = Math.cos(angle - warpToward);
        // The side facing the other galaxy is dragged out and lifted.
        const stretch = 1 + set.warp * 0.3 * Math.max(0, pull) * (r / R) ** 2;
        const y = gauss() * 0.07 * R * (1 - (r / R) * 0.7) + set.warp * 0.3 * R * (r / R) ** 2 * pull;
        const inner = r < R * 0.24;
        const pinkish = !inner && random() < a.birth * 0.16;
        const colour = pinkish ? pinkTone : inner ? warm[1] : family[i % 3];
        own.push({ at: [Math.cos(angle) * r * stretch, y, Math.sin(angle) * r * stretch], size: mix(0.022, 0.06, random() * random()) * (pinkish ? 1.5 : 1), color: colour.clone().offsetHSL(0, 0, (random() - 0.4) * 0.15) });
      }
      const flock = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), own.length);
      const matrix = new THREE.Matrix4();
      own.forEach((star, i) => {
        matrix.makeScale(star.size, star.size, star.size).setPosition(...star.at);
        flock.setMatrixAt(i, matrix);
        flock.setColorAt(i, star.color);
      });
      disc.add(flock);
      const coreColour = which ? tone('#ffd27a') : tone('#dfe9ff');
      const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 24, 16), new THREE.MeshStandardMaterial({ color: coreColour, roughness: 0.5, emissive: coreColour, emissiveIntensity: glow }));
      core.scale.y = 0.6;
      disc.add(core);
      // Dust lanes: two dark arcs inside the arms.
      const laneMaterial = new THREE.MeshStandardMaterial({ color: paper ? '#6b5a55' : '#2a1f2c', roughness: 0.9 });
      for (let arm = 0; arm < 2; arm++) {
        const points = Array.from({ length: 24 }, (_unused, k) => {
          const r = R * mix(0.22, 0.8, k / 23), angle = arm * Math.PI + spins[which] * Math.log(1 + r * 1.6) * 2.5 - 0.35;
          return new THREE.Vector3(Math.cos(angle) * r, 0.03 + set.warp * 0.3 * R * (r / R) ** 2 * Math.cos(angle - warpToward), Math.sin(angle) * r);
        });
        disc.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, R * 0.022, 5), laneMaterial));
      }
      root.add(disc);
      discs.push(disc);
      haze(centre.clone().setY(-0.25), R * 2.6, which ? new THREE.Color('#ffae42') : new THREE.Color('#4f8dff'), 0.5);
      haze(centre.clone().setY(-0.2), R * 1.1, which ? new THREE.Color('#ffd58a') : new THREE.Color('#a8c8ff'), 0.55);
      // Star-forming knots along the arms.
      const births = Math.round(a.birth * 9 * (R / 2.5));
      for (let i = 0; i < births; i++) {
        const r = R * mix(0.35, 0.95, random()), angle = (i % 2) * Math.PI + spins[which] * Math.log(1 + r * 1.6) * 2.5;
        const local = new THREE.Vector3(Math.cos(angle) * r, 0.08 + set.warp * 0.3 * R * (r / R) ** 2 * Math.cos(angle - warpToward), Math.sin(angle) * r);
        const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(mix(0.08, 0.17, random()), 1), new THREE.MeshStandardMaterial({ color: pinkTone, roughness: 0.6, emissive: pinkTone, emissiveIntensity: glow * 0.9 }));
        mesh.position.copy(local);
        disc.add(mesh);
        knots.push(mesh);
      }
    });
    // Where the two glows overlap.
    haze(new THREE.Vector3(0, -0.15, 0.1), mix(2.6, 3.6, set.band), paper ? new THREE.Color('#f2b8c8') : new THREE.Color('#ffd0e0'), mix(0.3, 0.6, set.band));

    // Bridge stars, blue at one end and gold at the other.
    const broken = a.bridge === 'broken', braided = a.bridge === 'braided';
    const bandWidth = set.band * { luminous: 1.5, beaded: 0.8, thread: 0.3, braided: 0.45, broken: 0.8 }[a.bridge];
    const frames = bridge.computeFrenetFrames(100, false);
    const onBridge = (t: number, strand: number) => {
      const p = bridge.getPointAt(t);
      if (!braided) return p;
      const i = Math.round(t * 100), twist = t * Math.PI * 5 + strand * Math.PI, reach = 0.42 * Math.sin(t * Math.PI);
      return p.addScaledVector(frames.normals[i], Math.cos(twist) * reach).addScaledVector(frames.binormals[i], Math.sin(twist) * reach);
    };
    const bridgeCount = Math.round(mix(500, 1400, mood.density) * mix(0.6, 1.3, set.band) * (a.bridge === 'thread' ? 0.5 : 1));
    for (let i = 0; i < bridgeCount; i++) {
      const t = random();
      if (broken && Math.abs(t - 0.5) < 0.09) continue;
      const fray = broken ? Math.max(0, 1 - Math.abs(t - 0.5) / 0.22) * 0.7 : 0;
      const waist = 1 - 0.45 * Math.sin(t * Math.PI);
      const p = onBridge(t, i % 2).add(new THREE.Vector3(gauss(), gauss() * 0.45, gauss()).multiplyScalar(bandWidth * waist + fray));
      const colour = (braided ? families[i % 2][i % 3] : cool[i % 3].clone().lerp(warm[i % 3], clamp01((t - 0.3) / 0.4)));
      stars.push({ at: p.toArray(), size: mix(0.024, 0.065, random() * random()), color: colour.clone().offsetHSL(0, 0, (random() - 0.4) * 0.15) });
    }
    const ribbonTint = paper ? new THREE.Color('#d7a8c0') : new THREE.Color('#ffc8dc');
    if (!broken) {
      for (const strand of braided ? [0, 1] : [0]) {
        const path = new THREE.CatmullRomCurve3(Array.from({ length: 40 }, (_unused, k) => onBridge(k / 39, strand)));
        const ribbon = new THREE.Mesh(new THREE.TubeGeometry(path, 80, Math.max(0.05, bandWidth * (braided ? 0.5 : 0.7)), 8), new THREE.MeshBasicMaterial({ color: braided ? families[strand][1] : ribbonTint, transparent: true, opacity: paper ? 0.3 : 0.22, depthWrite: false, blending }));
        ribbon.scale.y = 0.5;
        root.add(ribbon);
      }
    }
    const beadCount = Math.round(mix(a.bridge === 'beaded' ? 9 : 2, a.bridge === 'beaded' ? 16 : 9, a.birth) * (a.bridge === 'thread' ? 0.5 : 1));
    for (let i = 0; i < beadCount; i++) {
      const t = mix(0.06, 0.94, (i + 0.5) / beadCount) + gauss() * 0.01;
      if (Math.abs(t - 0.5) < (broken ? 0.11 : 0.07)) continue; // keep the midpoint clear for the hero
      knot(onBridge(t, i % 2).add(new THREE.Vector3(gauss() * 0.1, 0.05, gauss() * 0.1)), a.bridge === 'beaded' ? mix(0.13, 0.22, random()) : mix(0.08, 0.16, random()), i % 4 === 3 ? cool[1] : pinkTone);
    }

    // Tails.
    for (const which of [0, 1]) {
      const family = families[which], count = Math.round(mix(350, 1000, mood.density) * set.tail * (tailShape.grow / 3) * (sizes[which] / 2.5));
      for (let i = 0; i < count; i++) {
        const t = Math.pow(random(), 0.8), width = mix(0.5, 0.12, t) * (sizes[which] / 2.5) + shred * 0.2 * t;
        const p = tailAt(which, t).add(new THREE.Vector3(gauss(), gauss() * 0.4, gauss()).multiplyScalar(width));
        stars.push({ at: p.toArray(), size: mix(0.026, 0.065, random() * random()) * mix(1.1, 0.8, t), color: family[i % 3].clone().offsetHSL(0, 0, (random() - 0.4) * 0.15) });
      }
      const path = new THREE.CatmullRomCurve3(Array.from({ length: 30 }, (_unused, k) => tailAt(which, k / 29)));
      const plume = new THREE.Mesh(new THREE.TubeGeometry(path, 80, 0.28 * (sizes[which] / 2.5), 8), new THREE.MeshBasicMaterial({ color: family[paper ? 2 : 0], transparent: true, opacity: paper ? 0.26 : 0.2, depthWrite: false, blending }));
      root.add(plume);
      const clusters = Math.round(mix(2, 7, a.birth) * set.tail);
      for (let i = 0; i < clusters; i++) knot(tailAt(which, mix(0.2, 0.92, (i + random() * 0.5) / clusters)).add(new THREE.Vector3(gauss() * 0.15, 0.05, gauss() * 0.15)), mix(0.07, 0.14, random()), i % 3 === 2 ? pinkTone : family[1]);
    }

    // Shells, once the two are nearly one.
    if (a.stage === 'afterglow') {
      const shellMaterial = new THREE.MeshBasicMaterial({ color: paper ? '#9aa0b8' : '#c8cff0', transparent: true, opacity: 0.45, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const shell = new THREE.Mesh(new THREE.TorusGeometry(set.sep + 1.6 + i * 0.9, 0.035, 5, 80, mix(1.2, 2.4, random())), shellMaterial);
        shell.rotation.set(Math.PI / 2, 0, random() * Math.PI * 2);
        shell.scale.y = 0.62;
        shell.position.y = -0.1;
        root.add(shell);
      }
      haze(new THREE.Vector3(0, -0.3, 0), set.sep * 2.1, paper ? new THREE.Color('#e9d2b8') : new THREE.Color('#ffe2c2'), 0.4, 0.7);
    }

    // Witnesses.
    if (a.witnesses) {
      const posts: [number, number][] = [[-0.5, -3.9], [1.4, 3.8], [-set.sep - 2.8, -3.0], [set.sep + 2.8, 3.0], [set.sep * 0.6, -3.8]];
      const number = 2 + Math.round(mood.density * 3);
      posts.slice(0, number).forEach(([x, z], i) => {
        const at = new THREE.Vector3(x + gauss() * 0.4, mix(-0.4, 0.6, random()), z + gauss() * 0.3), size = mix(0.3, 0.55, random());
        const family = families[i % 2];
        haze(at.clone().setY(at.y - 0.05), size * 2.4, family[0], 0.5, 0.7);
        for (let k = 0; k < 70; k++) stars.push({ at: at.clone().add(new THREE.Vector3(gauss() * size, gauss() * size * 0.3, gauss() * size * 0.6)).toArray(), size: mix(0.02, 0.05, random() * random()), color: family[k % 3] });
      });
    }

    // The far field: small, and all behind the plane of the encounter.
    const far = Math.round(mix(120, 420, mood.density));
    const farTints = paper ? ['#4f6a8a', '#8a7a5a', '#6a6f8a'] : ['#c3d0f0', '#f0dcb4', '#9fb0e0'];
    for (let i = 0; i < far; i++) stars.push({ at: [(random() - 0.5) * (set.sep * 2 + 8), mix(-1.8, -0.7, random()), (random() - 0.5) * 8], size: mix(0.012, 0.034, random() * random()), color: new THREE.Color(farTints[i % 3]) });

    const field = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars);
    field.castShadow = field.receiveShadow = false;

    const pace = mix(0.004, 0.06, mood.energy);
    const sizesOfKnots = knots.map((mesh) => mesh.scale.x);
    world.update = (dt: number, time: number) => {
      discs.forEach((disc, which) => (disc.children[0].rotation.y -= dt * pace * spins[which]));
      knots.forEach((mesh, i) => mesh.scale.setScalar(sizesOfKnots[i] * (1 + Math.sin(time * (1.2 + (i % 7) * 0.3) + i) * 0.12 * (0.3 + mood.energy))));
    };
    const dispose = world.dispose.bind(world);
    world.dispose = () => { halo.dispose(); dispose(); };
    return world;
  },
});
