import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { SAND, bed, lump, rest, strew, type Speck } from './grains';

const TINTS = {
  clear: 'Water-clear rock crystal, almost colourless.',
  milky: 'Milky white, clouded like frozen breath.',
  rosy: 'Rose quartz, a soft flesh pink.',
  iron: 'Iron-stained, honey orange and rust in the cracks.',
  smoky: 'Smoky grey-brown, like tea-coloured glass.',
  citrine: 'Pale lemon yellow.',
  amethyst: 'Faint violet, a rare find.',
} as const;
const TINT: Record<keyof typeof TINTS, string> = { clear: '#e9f1f0', milky: '#f5f1e8', rosy: '#f2b3ae', iron: '#e0984c', smoky: '#93877a', citrine: '#eed473', amethyst: '#b796dc' };

export default defineThing({
  questions: {
    tint: choice('What colour is the quartz?', TINTS),
    shape: choice('What shape has the sea left it?', {
      tumbled: 'A well-rounded egg, tumbled for a million years.',
      angular: 'Sharp and blocky, freshly broken from its rock, all facets and edges.',
      elongated: 'A long prism with softened ends, like a worn standing stone.',
      tabular: 'A flat tablet, a skipping stone at the scale of a flea.',
      sphere: 'A near-perfect frosted bead, rolled by desert wind before it reached the sea.',
    }),
    chips: score('How chipped is it?', ['Unbroken and smooth', 'One or two shell-shaped scars', 'Chipped on every side']),
    inclusion: choice('What is trapped inside it?', {
      nothing: 'Nothing: it is flawless all the way through.',
      needles: 'Dark golden needles of another mineral crossing its heart.',
      bubbles: 'A trail of tiny bubbles, fluid sealed in before there were animals.',
      crack: 'A rusty healed crack, a flat stained veil through the middle.',
      crystal: 'One small green crystal, a stowaway.',
      cloud: 'A dark smoky ghost of its own younger shape.',
    }),
    pose: choice('How does it sit?', {
      lying: 'Lying on its broadest side, at rest.',
      standing: 'Stood on end like a monolith.',
      perched: 'Balanced on three smaller grains, a dolmen.',
      sunk: 'Sitting in a film of water that clings up around its base.',
    }),
    company: choice('What surrounds it?', {
      alone: 'Nothing. It is the only grain in the world.',
      few: 'A handful of smaller grains scattered at its foot.',
      beach: 'A patch of beach: it is the largest among hundreds.',
      strandline: 'A patch of beach with dark mineral specks and white chips of broken shell.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.03); // modelled in millimetres, shown magnified: a specimen under the lens
    const R = 0.62;
    const form = {
      tumbled: { stretch: [1.1, 0.78, 0.9], amp: 0.14, detail: 3, chips: 0 },
      angular: { stretch: [1, 0.85, 0.9], amp: 0.34, detail: 1, chips: 5 },
      elongated: { stretch: [1.75, 0.66, 0.72], amp: 0.16, detail: 2, chips: 1 },
      tabular: { stretch: [1.25, 0.42, 1.05], amp: 0.12, detail: 2, chips: 1 },
      sphere: { stretch: [1, 0.96, 1], amp: 0.04, detail: 3, chips: 0 },
    }[a.shape] as { stretch: [number, number, number]; amp: number; detail: number; chips: number };
    const chips = form.chips + Math.round(a.chips * 7 + mood.wear * 2);
    const tint = new THREE.Color(TINT[a.tint]).offsetHSL((mood.warmth - 0.5) * 0.03, 0, mix(-0.05, 0.04, mood.cheer));
    const shell = new THREE.MeshStandardMaterial({
      color: tint, transparent: true, opacity: a.tint === 'milky' ? 0.9 : a.tint === 'clear' ? 0.66 : 0.78, side: THREE.DoubleSide,
      roughness: mix(0.16, 0.5, mood.wear) + (a.shape === 'sphere' ? 0.25 : 0), metalness: 0.05,
      emissive: tint, emissiveIntensity: mix(0.1, 0.24, mood.cheer),
    });

    const grain = new THREE.Group();
    const body = new THREE.Mesh(lump(random, { detail: form.detail, amp: form.amp, chips, stretch: form.stretch }), shell);
    body.castShadow = body.receiveShadow = true;
    body.renderOrder = 2;
    grain.add(body);
    grain.scale.setScalar(R);

    // What the grain swallowed while it was still molten rock.
    const inside = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); grain.add(m); return m; };
    const [ix, iy, iz] = form.stretch;
    if (a.inclusion === 'needles') {
      const gold = new THREE.MeshStandardMaterial({ color: '#5a3b12', metalness: 0.6, roughness: 0.3, emissive: '#3a2206', emissiveIntensity: 0.4 });
      for (let i = 0; i < 5 + Math.floor(random() * 4); i++) {
        const needle = inside(new THREE.CylinderGeometry(0.022, 0.022, 0.9 + random() * 0.5, 5), gold);
        needle.rotation.set(random() * 3, random() * 3, random() * 3);
        needle.scale.set(1, Math.min(ix, iy, iz) * 1.2, 1);
        needle.position.set((random() - 0.5) * 0.3 * ix, (random() - 0.5) * 0.2 * iy, (random() - 0.5) * 0.3 * iz);
      }
    } else if (a.inclusion === 'bubbles') {
      const air = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.5 });
      const lean = random() * 6.283;
      for (let i = 0; i < 9; i++) {
        const t = i / 8 - 0.5;
        const bubble = inside(new THREE.SphereGeometry(0.035 + random() * 0.05, 10, 8), air);
        bubble.position.set(Math.cos(lean) * t * 1.1 * ix, (t * 0.5 + (random() - 0.5) * 0.12) * iy, Math.sin(lean) * t * 1.1 * iz);
      }
    } else if (a.inclusion === 'crack') {
      const veil = inside(new THREE.CircleGeometry(0.72, 14), new THREE.MeshStandardMaterial({ color: '#b5541c', side: THREE.DoubleSide, transparent: true, opacity: 0.75, roughness: 0.8, emissive: '#7a2f0a', emissiveIntensity: 0.35 }));
      veil.scale.set(ix, iy * 1.05, 1);
      veil.rotation.set((random() - 0.5) * 0.5, 0.5 + random() * 0.8, (random() - 0.5) * 0.6);
    } else if (a.inclusion === 'crystal') {
      const stowaway = inside(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: '#2f8f55', roughness: 0.2, emissive: '#1d6b3a', emissiveIntensity: 0.6, flatShading: true }));
      stowaway.scale.set(1, 1.7 * Math.min(1, iy * 1.2), 1);
      stowaway.rotation.set(random(), random(), random());
      stowaway.position.set((random() - 0.5) * 0.3 * ix, 0, (random() - 0.5) * 0.3 * iz);
    } else if (a.inclusion === 'cloud') {
      const ghost = inside(lump(random, { detail: 1, amp: 0.3, chips: 3, stretch: form.stretch }), new THREE.MeshStandardMaterial({ color: '#4d443d', roughness: 0.7, transparent: true, opacity: 0.8 }));
      ghost.scale.setScalar(0.5);
    }

    // Pose: quartz prisms and tablets lie along x; stood on end they become monoliths.
    if (a.pose === 'standing') grain.rotation.z = Math.PI / 2 + (random() - 0.5) * 0.16;
    else grain.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.14);
    grain.rotation.y = (random() - 0.5) * 0.8;
    s.root.add(grain);
    const palette = SAND.tan;
    const loose: Speck[] = [];
    let lift = 0;
    if (a.pose === 'perched') {
      lift = R * 0.42;
      for (let i = 0; i < 3; i++) {
        const t = i * 2.094 + random() * 0.5, r = R * 0.5;
        loose.push({ x: Math.cos(t) * r, y: lift * 0.42, z: Math.sin(t) * r, size: lift * 0.62, color: palette[i % palette.length], flat: 0.8 });
      }
    }
    const tall = rest(grain, a.pose === 'sunk' ? -R * 0.12 : lift * 0.92);

    const reach = R * 1.9;
    if (a.company === 'few' || a.company === 'alone') {
      const n = a.company === 'alone' ? 0 : 5 + Math.round(mood.density * 9);
      for (let i = 0; i < n; i++) {
        const t = random() * 6.283, r = R * (1.15 + random() * 0.8), size = R * (0.1 + random() * 0.16);
        loose.push({ x: Math.cos(t) * r, y: size * 0.55, z: Math.sin(t) * r, size, color: palette[Math.floor(random() * palette.length)] });
      }
    } else {
      const strand = a.company === 'strandline';
      s.root.add(bed(random, { radius: reach, grain: R * 0.17, count: 300 + Math.round(mood.density * 260), palette, specks: strand ? SAND.dark : undefined, speckShare: 0.16, wet: a.pose === 'sunk' ? 0.7 : 0 }));
      if (strand) {
        const chalk = s.material('#f6f1e8', { roughness: 0.5, side: THREE.DoubleSide });
        for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
          const t = random() * 6.283, r = R * (1.1 + random() * 0.7);
          const chip = s.mesh(new THREE.SphereGeometry(R * (0.16 + random() * 0.16), 10, 6, random() * 3, 1.2 + random(), 0.5, 0.9), chalk, [Math.cos(t) * r, R * 0.05, Math.sin(t) * r]);
          chip.rotation.set(random() * 6, random() * 6, random() * 6);
        }
      }
    }
    if (loose.length) s.root.add(strew(random, loose, lump(random, { detail: 1, amp: 0.3, chips: 2 }), new THREE.MeshStandardMaterial({ roughness: 0.55 })));

    if (a.pose === 'sunk') {
      // The film of water: a dark wet lens with a bright meniscus climbing the grain.
      const water = new THREE.MeshStandardMaterial({ color: '#9fc4cc', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3, depthWrite: false });
      const pool = s.mesh(new THREE.CylinderGeometry(R * 1.55, R * 1.7, R * 0.08, 40), water, [0, R * 0.06, 0]);
      pool.castShadow = false;
      const rim = s.mesh(new THREE.TorusGeometry(R * 1.02, R * 0.12, 8, 40), new THREE.MeshStandardMaterial({ color: '#eaf6f7', transparent: true, opacity: 0.5, roughness: 0.05, depthWrite: false }), [grain.position.x, R * 0.12, grain.position.z]);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(form.stretch[0] * (a.shape === 'elongated' ? 0.85 : 0.95), form.stretch[2], 1);
      rim.rotation.z = -grain.rotation.y;
      rim.castShadow = false;
      if (a.company === 'alone') s.cylinder(R * 1.55, R * 1.68, R * 0.05, [0, R * 0.025, 0], s.material('#c9bfa6', { roughness: 0.4 }), 40);
    }

    // A glint that drifts across the grain as the light moves.
    const base = shell.emissiveIntensity;
    return s.finish({
      footprint: Math.max(R * 1.3, tall * 0.4) * 0.03,
      update: (_dt, time) => { shell.emissiveIntensity = base * (1 + 0.35 * mood.energy * Math.sin(time * (0.6 + mood.energy * 2))); },
    });
  },
});
