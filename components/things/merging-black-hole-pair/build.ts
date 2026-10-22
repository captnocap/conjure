import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const LIGHTS = {
  split: 'One ringed in cool blue, the other in warm gold: two different histories.',
  gold: 'Both ringed in furnace gold.',
  ice: 'Both ringed in thin icy white-blue.',
  red: 'Both ringed in dull red, embers.',
  violet: 'Both ringed in violet and magenta, uncanny.',
} as const;
const LIGHT_PAIR: Record<keyof typeof LIGHTS, [string, string]> = {
  split: ['#3f8cf0', '#f0a62e'],
  gold: ['#f0a62e', '#f7c95a'],
  ice: ['#7fc4f4', '#b9dcf7'],
  red: ['#d8432e', '#e8703a'],
  violet: ['#9a4be0', '#e052b4'],
};

/** A round sheet with a polar grid drawn on it, pushed down by `height`. */
function polarSheet(radius: number, height: (x: number, z: number) => number, twist: (r: number) => number, rings = 44, sectors = 96) {
  const positions: number[] = [], uvs: number[] = [], index: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const r = (i / rings) * radius;
    for (let j = 0; j <= sectors; j++) {
      const angle = (j / sectors) * Math.PI * 2 + twist(r);
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      positions.push(x, height(x, z), z);
      uvs.push(j / sectors, i / rings);
    }
  }
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < sectors; j++) {
      const a = i * (sectors + 1) + j, b = a + 1, c = a + sectors + 1, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function gridTexture(ink: string, spokes: number, hoops: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = ink;
  for (let i = 0; i < spokes; i++) ctx.fillRect(Math.round((i / spokes) * canvas.width) - 5, 0, 10, canvas.height);
  for (let i = 1; i <= hoops; i++) ctx.fillRect(0, Math.round((i / hoops) * canvas.height) - (i === hoops ? 22 : 9), canvas.width, i === hoops ? 22 : 18);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** A tube that tapers from one radius to another. */
function taper(curve: THREE.Curve<THREE.Vector3>, from: number, to: number, steps = 80, sides = 7) {
  const frames = curve.computeFrenetFrames(steps, false);
  const positions: number[] = [], index: number[] = [];
  const point = new THREE.Vector3();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, r = mix(from, to, t);
    curve.getPointAt(t, point);
    for (let j = 0; j < sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      const n = frames.normals[i].clone().multiplyScalar(Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r);
      positions.push(point.x + n.x, point.y + n.y, point.z + n.z);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j, b = i * sides + ((j + 1) % sides), c = a + sides, d = b + sides;
      index.push(a, c, b, b, c, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    closeness: choice('How close are they?', {
      wide: 'A wide, patient dance with plenty of space between them.',
      closing: 'Closing in: the spiral is visibly tightening.',
      grazing: 'Grazing: their rings of light touch.',
      joining: 'The instant of joining: two spheres fused into one peanut shape under a single ring.',
    }),
    sizes: choice('Are they equals?', {
      equal: 'Two equals, perfectly matched.',
      uneven: 'One noticeably larger than the other.',
      lopsided: 'A giant and a small companion that it will swallow.',
    }),
    light: choice('What colour are their rings of light?', LIGHTS),
    discs: choice('Does each carry a disc of glowing matter?', {
      bare: 'Bare: just darkness and a thin ring.',
      both: 'Each wears its own tilted disc.',
      one: 'Only the larger one still has a disc; the other has been stripped.',
      shared: 'One wide ring circles them both, a shared table.',
    }),
    warp: choice('How is the warping of space shown?', {
      sheet: 'A grid sheet beneath them, dimpled into two wells like weights on a trampoline.',
      arcs: 'The background stars are smeared into bright arcs around each one.',
      both: 'Both: a dimpled grid below and smeared stars around.',
      calm: 'Barely at all: the stars sit as undisturbed dots.',
    }),
    trails: noul('Do they drag visible spiral trails showing the path they have taken inward?'),
    waves: noul('Are ripples already spreading outward from them?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const glow = mix(0.5, 1.1, mood.cheer);
    const lights = LIGHT_PAIR[a.light].map((hex) => new THREE.Color(hex).offsetHSL((mood.warmth - 0.5) * -0.025, 0, (mood.cheer - 0.5) * 0.08));
    const ratio = { equal: 1, uneven: 0.68, lopsided: 0.4 }[a.sizes];
    const big = 0.78, small = big * ratio;
    const gapFactor = { wide: 2.9, closing: 1.9, grazing: 1.22, joining: 0.72 }[a.closeness];
    const separation = (big + small) * gapFactor;
    // Around the common centre of mass, the heavier one moves less.
    const mBig = big * big, mSmall = small * small;
    const radii = [separation * mSmall / (mBig + mSmall), separation * mBig / (mBig + mSmall)];
    const sizes = [big, small];
    const hasSheet = a.warp === 'sheet' || a.warp === 'both', hasArcs = a.warp === 'arcs' || a.warp === 'both';
    const sheetRadius = Math.max(2.5, separation * 0.5 + 1.7);

    const pair = new THREE.Group();
    s.root.add(pair);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = pair) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = true; });
      parent.add(node);
      return node;
    };
    const centres = [new THREE.Vector3(-radii[0], 0, 0), new THREE.Vector3(radii[1], 0, 0)];
    const well = (x: number, z: number) => {
      let y = 0;
      centres.forEach((c, i) => { y -= (sizes[i] * 1.5) / Math.sqrt(((x - c.x) ** 2 + (z - c.z) ** 2) / (sizes[i] * sizes[i]) + 0.55); });
      const edge = Math.hypot(x, z) / sheetRadius;
      return y * (1 - edge * edge * 0.55);
    };

    if (hasSheet) {
      const ink = new THREE.Color('#3a59b0').lerp(new THREE.Color('#8a5a3a'), mood.warmth * 0.5);
      const texture = gridTexture(`#${ink.getHexString()}`, 28, 11);
      const tighten = a.closeness === 'wide' ? 0.25 : a.closeness === 'closing' ? 0.5 : 0.85;
      const sheet = new THREE.Mesh(
        polarSheet(sheetRadius, well, (r) => tighten * Math.exp(-r / (separation * 0.5 + 0.6)) * 1.6),
        new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.35, transparent: false, side: THREE.DoubleSide, roughness: 0.8, emissive: ink, emissiveIntensity: 0.25 }),
      );
      sheet.receiveShadow = true;
      pair.add(sheet);
    }

    const dark = new THREE.MeshStandardMaterial({ color: '#07080d', roughness: 0.25, metalness: 0.2 });
    const holes: THREE.Group[] = [];
    centres.forEach((centre, i) => {
      const r = sizes[i], tint = lights[i];
      const hole = new THREE.Group();
      hole.position.set(centre.x, hasSheet ? well(centre.x, centre.z) + r * 1.05 : 0, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 24), dark), hole);
      // An inside-out shell shows as a thin ring of light from every side.
      const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.13, 40, 24), new THREE.MeshBasicMaterial({ color: tint.clone().offsetHSL(0, 0, 0.08), side: THREE.BackSide }));
      hole.add(halo);
      const outer = new THREE.Mesh(new THREE.SphereGeometry(r * 1.2, 40, 24), new THREE.MeshBasicMaterial({ color: tint.clone().offsetHSL(0, -0.1, -0.12), side: THREE.BackSide }));
      hole.add(outer);
      const wearsDisc = a.discs === 'both' || (a.discs === 'one' && i === 0);
      if (wearsDisc) {
        const disc = new THREE.Group();
        for (let k = 0; k < 5; k++) {
          const band = tint.clone().offsetHSL(0, 0, mix(0.15, -0.2, k / 4));
          add(new THREE.Mesh(new THREE.TorusGeometry(r * mix(1.45, 2.25, k / 4), r * 0.05, 6, 56), new THREE.MeshStandardMaterial({ color: band, roughness: 0.5, emissive: band, emissiveIntensity: glow * 0.7 })), disc).scale.z = 0.35;
        }
        disc.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.6);
        hole.add(disc);
      }
      pair.add(hole);
      holes.push(hole);
    });
    const level = Math.max(holes[0].position.y, holes[1].position.y);
    if (!hasSheet) holes.forEach((hole) => (hole.position.y = 0));

    if (a.discs === 'shared') {
      const shared = new THREE.Group();
      for (let k = 0; k < 4; k++) {
        const band = lights[k % 2].clone().offsetHSL(0, 0, mix(0.1, -0.12, k / 3));
        add(new THREE.Mesh(new THREE.TorusGeometry(separation * 0.5 + big * mix(1.7, 2.4, k / 3), 0.045, 6, 80), new THREE.MeshStandardMaterial({ color: band, roughness: 0.5, emissive: band, emissiveIntensity: glow * 0.7 })), shared).scale.z = 0.4;
      }
      shared.rotation.x = Math.PI / 2;
      shared.position.y = hasSheet ? level : 0;
      pair.add(shared);
    }

    // The paths already travelled: each trail winds outward into the past.
    if (a.trails) {
      const turns = { wide: 0.9, closing: 1.4, grazing: 1.9, joining: 2.3 }[a.closeness];
      holes.forEach((hole, i) => {
        const points = Array.from({ length: 70 }, (_unused, k) => {
          const t = k / 69, angle = (i ? 0 : Math.PI) - t * turns * Math.PI * 2;
          const r = Math.min(sheetRadius * 0.97, radii[i] * (1 + t * turns * 0.6) + sizes[i] * 0.15);
          const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
          return new THREE.Vector3(x, hasSheet ? Math.max(well(x, z) + 0.12, hole.position.y - sizes[i] * 0.9) : hole.position.y, -z);
        });
        const tint = lights[i];
        add(new THREE.Mesh(taper(new THREE.CatmullRomCurve3(points), sizes[i] * 0.17, 0.008, 140, 7), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.5, emissive: tint, emissiveIntensity: glow * 0.6 })));
      });
    }

    // Ripples leaving: a two-armed spiral of thin rings lying in the orbital plane.
    const ripples: THREE.Mesh[] = [];
    if (a.waves) {
      const rippleTint = new THREE.Color('#7a86c8').lerp(lights[1], 0.3);
      for (let arm = 0; arm < 2; arm++) {
        const points = Array.from({ length: 60 }, (_unused, k) => {
          const t = k / 59, angle = arm * Math.PI + t * Math.PI * 2.6, r = separation * 0.5 + big + 0.5 + t * (sheetRadius * 0.98 - separation * 0.5 - big - 0.5);
          const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
          return new THREE.Vector3(x, (hasSheet ? well(x, z) * (r < sheetRadius ? 1 : 0.4) : 0) + 0.08 + Math.sin(t * 20) * 0.03, z);
        });
        ripples.push(add(new THREE.Mesh(taper(new THREE.CatmullRomCurve3(points), 0.05, 0.015, 120, 6), new THREE.MeshStandardMaterial({ color: rippleTint, roughness: 0.6, emissive: rippleTint, emissiveIntensity: glow * 0.4 }))));
      }
    }

    // Stars: dots far out, arcs near the holes where the light is bent round.
    const starTints = [new THREE.Color('#3f6fd0'), new THREE.Color('#e0a030'), new THREE.Color('#7a8ad0')];
    const stars: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const count = Math.round(mix(60, 260, mood.density));
    for (let i = 0; i < count; i++) {
      const direction = new THREE.Vector3(gauss(), Math.abs(gauss()) * 0.7 + 0.08, gauss()).normalize();
      const p = direction.multiplyScalar(mix(separation * 0.5 + big * 1.6, sheetRadius * 0.95, random()));
      stars.push({ at: [p.x, p.y + (hasSheet ? level * 0.5 : 0), p.z], size: mix(0.02, 0.055, random() * random()), color: starTints[i % 3].clone().offsetHSL(0, 0, (random() - 0.4) * 0.2) });
    }
    s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), stars).castShadow = false;
    if (hasArcs) {
      const arcMaterial = [0, 1, 2].map((k) => new THREE.MeshBasicMaterial({ color: starTints[k].clone().offsetHSL(0, 0, 0.05) }));
      const arcCount = Math.round(mix(14, 30, mood.density));
      for (let i = 0; i < arcCount; i++) {
        const which = i % 2, hole = holes[which], r = sizes[which] * mix(1.45, 2.3, random());
        const between = i % 5 === 0;
        const arc = new THREE.Mesh(new THREE.TorusGeometry(between ? separation * 0.28 + 0.2 : r, mix(0.018, 0.035, random()), 5, 16, mix(0.25, 0.9, random())), arcMaterial[i % 3]);
        arc.position.copy(between ? new THREE.Vector3(0, hole.position.y, 0) : hole.position);
        arc.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI * 2);
        pair.add(arc);
      }
    }

    pair.rotation.y = random() * Math.PI;
    const speed = mix(0.04, 0.5, mood.energy) * { wide: 0.5, closing: 0.9, grazing: 1.5, joining: 2.2 }[a.closeness];
    return s.finish({
      footprint: Math.min(sheetRadius, separation * 0.5 + big + 0.6),
      update(dt, time) {
        pair.rotation.y += dt * speed;
        ripples.forEach((ripple, i) => (ripple.rotation.y = -time * speed * 0.5 + i * 0));
      },
    });
  },
});
