import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const STARS = {
  yellow: 'A steady yellow sun, ordinary and kind.',
  red: 'A small dim red dwarf, a banked fire that will last forever.',
  blue: 'A fierce blue-white star, too bright to live long.',
  orange: 'A mellow orange star, late afternoon.',
  white: 'A tiny hard white dwarf: the star already died and the planets stayed anyway.',
} as const;
const STAR_LOOK: Record<keyof typeof STARS, { colour: string; size: number }> = {
  yellow: { colour: '#f5c33a', size: 0.5 },
  red: { colour: '#e0503a', size: 0.36 },
  blue: { colour: '#6fb0ff', size: 0.6 },
  orange: { colour: '#f08c34', size: 0.55 },
  white: { colour: '#dfe8f5', size: 0.22 },
};
const WORLDS = ['#b9743c', '#c9b48a', '#8e6fb8', '#5c9bd0', '#d06a4a', '#7fa38a', '#c4a23a'];

export default defineThing({
  questions: {
    planets: choice('How many planets does it carry?', {
      three: 'Three: a small family.',
      four: 'Four.',
      five: 'Five, a full carload.',
      two: 'Only two left, close to the star.',
    }),
    lost: choice('Has one been lost on the way?', {
      none: 'No: every ring has its planet.',
      gap: 'Yes: one ring is empty, a faint broken circle where a world used to be.',
      straggler: 'One has been pulled off its ring and trails behind, still following.',
    }),
    inhabited: noul('Is one planet visibly inhabited, a blue world with city lights on its night side?'),
    star: choice('What kind of star is at the centre?', STARS),
    giant: choice('What is the outermost planet like?', {
      ringed: 'A big ringed giant, the proud one.',
      striped: 'A banded gas giant with a storm spot.',
      ice: 'A pale blue ice world, small and far out.',
      rocky: 'Just another bare rock.',
    }),
    mount: choice('How is it presented?', {
      adrift: 'Adrift and tilted, sailing through empty space with a wake streaming behind it.',
      bubble: 'Wrapped in a faint protective bubble with a bow wave at the front, like a windscreen.',
      orrery: 'As a brass orrery on a stand: arms, posts and little painted balls.',
    }),
    thrown: score('How hard was it thrown?', ['Drifting gently away', 'Travelling steadily', 'Hurled out at speed', 'Fired like a shot, orbits shaken oval']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() - 1.5) * 0.82;
    const glow = mix(0.5, 1.1, mood.cheer);
    const orrery = a.mount === 'orrery';
    const look = STAR_LOOK[a.star];
    const starColour = new THREE.Color(look.colour).offsetHSL((mood.warmth - 0.5) * -0.02, 0, 0);
    const count = { two: 2, three: 3, four: 4, five: 5 }[a.planets];
    const brass = s.material('#b58a3c', { metalness: 0.75, roughness: 0.32 });
    const darkBrass = s.material('#7a5a2a', { metalness: 0.7, roughness: 0.45 });
    const ringTint = new THREE.Color('#8791b8').lerp(starColour, 0.2);
    const ringMaterial = orrery ? brass : new THREE.MeshStandardMaterial({ color: ringTint, roughness: 0.6, emissive: ringTint, emissiveIntensity: 0.35 });

    const system = new THREE.Group();
    s.root.add(system);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = system) => {
      node.traverse((child) => { if ((child as THREE.Mesh).isMesh) child.castShadow = true; });
      parent.add(node);
      return node;
    };

    // The star.
    const star = add(new THREE.Mesh(new THREE.SphereGeometry(look.size, 32, 20), new THREE.MeshStandardMaterial({ color: starColour, roughness: 0.4, emissive: starColour, emissiveIntensity: glow })));
    if (!orrery) {
      system.add(new THREE.Mesh(new THREE.SphereGeometry(look.size * 1.14, 32, 20), new THREE.MeshBasicMaterial({ color: starColour.clone().offsetHSL(0, 0, 0.14), side: THREE.BackSide })));
      const rayMaterial = new THREE.MeshBasicMaterial({ color: starColour.clone().offsetHSL(0, 0, 0.06) });
      for (let i = 0; i < 16; i++) {
        const direction = new THREE.Vector3(gauss(), gauss(), gauss()).normalize();
        const ray = new THREE.Mesh(new THREE.ConeGeometry(look.size * 0.09, look.size * mix(0.35, 0.8, random()), 5), rayMaterial);
        ray.position.copy(direction).multiplyScalar(look.size * 1.3);
        ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        system.add(ray);
      }
    }

    // Planets on their rings.
    const shake = Math.max(0, a.thrown - 0.6) * 0.5;
    const lostIndex = a.lost === 'none' ? -1 : Math.min(count - 1, 1 + Math.floor(random() * Math.max(1, count - 2)));
    const homeIndex = a.inhabited ? (lostIndex === 1 ? 2 : 1) % count : -1;
    const pivots: { pivot: THREE.Group; speed: number }[] = [];
    let outer = 0;
    for (let i = 0; i < count; i++) {
      const radius = look.size + 0.55 + i * mix(0.62, 0.72, random()) + (i === count - 1 ? 0.25 : 0);
      outer = radius;
      const squash = 1 - shake * mix(0.3, 1, random());
      const orbit = new THREE.Group();
      orbit.rotation.y = random() * Math.PI;
      if (!orrery) orbit.rotation.x = gauss() * 0.06 + shake * gauss() * 0.3;
      orbit.scale.z = squash;
      system.add(orbit);
      const missing = i === lostIndex;
      if (missing && !orrery) {
        // A broken, dashed circle where a world used to be.
        for (let k = 0; k < 14; k++) {
          const dash = add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 5, 8, 0.16), ringMaterial), orbit);
          dash.rotation.x = Math.PI / 2;
          dash.rotation.z = (k / 14) * Math.PI * 2;
        }
      } else {
        const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(radius, orrery ? 0.014 : 0.017, 6, 96), ringMaterial), orbit);
        hoop.rotation.x = Math.PI / 2;
      }
      const pivot = new THREE.Group();
      pivot.rotation.y = random() * Math.PI * 2;
      orbit.add(pivot);
      pivots.push({ pivot, speed: 1 / Math.pow(radius, 1.5) });
      const last = i === count - 1;
      const kind = i === homeIndex ? 'home' : last ? a.giant : 'rocky';
      const size = kind === 'home' ? 0.27 : kind === 'ringed' ? 0.34 : kind === 'striped' ? 0.38 : kind === 'ice' ? 0.2 : mix(0.11, 0.2, random());
      const body = new THREE.Group();
      body.position.x = radius;
      if (missing && a.lost === 'straggler') body.position.set(radius * 1.25, mix(0.25, 0.6, random()), 0);
      pivot.add(body);
      if (orrery) {
        const height = 0.16 + (count - i) * 0.09;
        const arm = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, radius, 8), brass), pivot);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(radius / 2, -height, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, height, 8), brass), pivot).position.set(radius, -height / 2, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), darkBrass), pivot).position.set(0, -height, 0);
        if (missing && a.lost === 'gap') { add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.04, 12), darkBrass), pivot).position.set(radius, 0, 0); continue; }
      } else if (missing && a.lost === 'gap') continue;

      if (kind === 'home') {
        add(new THREE.Mesh(new THREE.SphereGeometry(size, 28, 18), new THREE.MeshStandardMaterial({ color: '#2f7fd6', roughness: 0.5, emissive: '#1b4f9a', emissiveIntensity: 0.3 })), body);
        for (let k = 0; k < 9; k++) {
          const land = new THREE.Mesh(new THREE.SphereGeometry(size * mix(0.2, 0.42, random()), 10, 8), new THREE.MeshStandardMaterial({ color: k % 4 === 0 ? '#eef2f5' : '#4f9a4c', roughness: 0.8 }));
          land.position.setFromSphericalCoords(size * 0.86, mix(0.5, 2.6, random()), mix(1.7, 4.6, random()));
          body.add(land);
        }
        // Night side: the half facing away from the star, pricked with lights.
        const night = new THREE.Mesh(new THREE.SphereGeometry(size * 1.03, 28, 18, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#101a3a', roughness: 0.7 }));
        body.add(night);
        const lamp = new THREE.MeshBasicMaterial({ color: '#ffd24a' });
        for (let k = 0; k < 26; k++) {
          const light = new THREE.Mesh(new THREE.SphereGeometry(size * mix(0.035, 0.07, random()), 6, 4), lamp);
          const cluster = k % 3;
          light.position.setFromSphericalCoords(size * 1.04, mix(0.7, 2.4, random()) + cluster * 0.05, Math.PI / 2 + gauss() * 0.75);
          body.add(light);
        }
        const moon = add(new THREE.Mesh(new THREE.SphereGeometry(size * 0.24, 12, 8), new THREE.MeshStandardMaterial({ color: '#c9c6bd', roughness: 0.8 })), body);
        moon.position.set(size * 0.6, size * 0.9, size * 1.5);
      } else if (kind === 'ringed' || kind === 'striped') {
        const tint = new THREE.Color(kind === 'ringed' ? '#d9b46a' : '#c98a5a');
        const giant = add(new THREE.Mesh(new THREE.SphereGeometry(size, 28, 18), new THREE.MeshStandardMaterial({ color: tint, roughness: 0.6 })), body);
        for (let k = 0; k < 4; k++) {
          const lat = mix(-0.9, 0.9, (k + 0.5) / 4);
          const band = new THREE.Mesh(new THREE.TorusGeometry(size * Math.cos(lat) * 1.005, size * 0.07, 6, 40), new THREE.MeshStandardMaterial({ color: tint.clone().offsetHSL(0.02, 0, k % 2 ? -0.16 : 0.1), roughness: 0.7 }));
          band.rotation.x = Math.PI / 2;
          band.position.y = size * Math.sin(lat);
          giant.add(band);
        }
        if (kind === 'striped') {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 12, 8), new THREE.MeshStandardMaterial({ color: '#b8402c', roughness: 0.6 }));
          spot.position.set(-size * 0.2, -size * 0.25, size * 0.9);
          spot.scale.set(1.5, 0.9, 0.5);
          giant.add(spot);
        } else {
          for (const [r, w] of [[1.5, 0.11], [1.85, 0.07]] as const) {
            const belt = add(new THREE.Mesh(new THREE.TorusGeometry(size * r, size * w, 4, 56), new THREE.MeshStandardMaterial({ color: '#e7d6a6', roughness: 0.6 })), body);
            belt.scale.z = 0.12;
            belt.rotation.set(Math.PI / 2 + 0.45, 0.3, 0);
          }
        }
      } else {
        const tint = new THREE.Color(kind === 'ice' ? '#a9d4ec' : WORLDS[Math.floor(random() * WORLDS.length)]);
        add(new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), new THREE.MeshStandardMaterial({ color: tint, roughness: kind === 'ice' ? 0.3 : 0.8, emissive: tint, emissiveIntensity: 0.08 })), body);
        if (random() < mood.density * 0.7) add(new THREE.Mesh(new THREE.SphereGeometry(size * 0.3, 10, 8), new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.8 })), body).position.set(size * 1.6, size * 0.5, 0);
      }
    }

    // Rubble between the rings when the scene is crowded.
    const rubble: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    const bits: { at: [number, number, number]; size: number; color: THREE.Color }[] = [];
    if (!orrery && count > 2) {
      const belt = look.size + 0.55 + 1.5 * 0.67 + 0.0;
      for (let i = 0; i < Math.round(mood.density * 160); i++) {
        const angle = random() * 6.28, r = belt + gauss() * 0.09;
        rubble.push({ at: [Math.cos(angle) * r, gauss() * 0.05, Math.sin(angle) * r], size: mix(0.012, 0.035, random()), color: new THREE.Color('#9c8f80').offsetHSL(0, 0, (random() - 0.5) * 0.2) });
      }
    }

    const wake: THREE.Group = new THREE.Group();
    if (orrery) {
      // Stand: weighted foot, turned column, gear box.
      const lift = 1.5;
      system.position.y = lift;
      s.lathe([[0, 0], [0.75, 0], [0.78, 0.05], [0.6, 0.1], [0.22, 0.16], [0.09, 0.3], [0.07, 0.75], [0.12, 0.8], [0.07, 0.86], [0.06, lift - 0.62], [0.2, lift - 0.58], [0.2, lift - 0.5], [0, lift - 0.5]], brass);
      s.cylinder(0.035, 0.035, 0.5 + look.size, [0, lift - 0.25, 0], darkBrass, 12);
      const gear = s.cylinder(0.3, 0.3, 0.04, [0, lift - 0.54, 0], darkBrass, 20);
      for (let i = 0; i < 20; i++) s.box([0.05, 0.04, 0.05], [Math.cos((i / 20) * 6.28) * 0.31, lift - 0.54, Math.sin((i / 20) * 6.28) * 0.31], darkBrass).rotation.y = -(i / 20) * 6.28;
      void gear;
      const crank = s.rod([0.2, lift - 0.54, 0], [0.62, lift - 0.54, 0.0], 0.016, brass);
      void crank;
      s.ball([0.05, 0.05, 0.05], [0.64, lift - 0.54, 0], s.material('#3a2a20'));
      (star.material as THREE.MeshStandardMaterial).metalness = 0.5;
    } else {
      // Heading: up and to the right; everything left behind streams the other way.
      const heading = new THREE.Vector3(1, 0.22, 0.1).normalize();
      system.rotation.set(mix(0.25, 0.5, random()), random() * 0.6, mix(0.1, 0.4, a.thrown));
      const streakMaterial = new THREE.MeshStandardMaterial({ color: ringTint.clone().offsetHSL(0, 0.1, 0.1), roughness: 0.7, emissive: ringTint, emissiveIntensity: 0.4 });
      const streaks = Math.round(mix(14, 38, a.thrown) * mix(0.7, 1.3, mood.density));
      const length = mix(1.3, 4.2, a.thrown);
      for (let i = 0; i < streaks; i++) {
        const side = new THREE.Vector3(0, gauss() * outer * 0.5, gauss() * outer * 0.75);
        const from = side.clone().addScaledVector(heading, -outer * mix(0.75, 1.1, random()));
        const to = from.clone().addScaledVector(heading, -length * mix(0.4, 1.2, random()));
        const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.004, mix(0.022, 0.05, random()), 1, 5), streakMaterial);
        const span = to.clone().sub(from);
        streak.scale.y = span.length();
        streak.position.copy(from).addScaledVector(span, 0.5);
        streak.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize());
        wake.add(streak);
        if (i % 2 === 0) bits.push({ at: to.toArray(), size: mix(0.02, 0.05, random()), color: ringTint.clone().offsetHSL(0, 0, 0.1) });
      }
      s.root.add(wake);
      if (a.mount === 'bubble') {
        const shell = new THREE.Mesh(new THREE.SphereGeometry(outer * 1.22, 40, 24), new THREE.MeshBasicMaterial({ color: '#8fb4e8', transparent: true, opacity: 0.13, depthWrite: false }));
        shell.scale.set(1.12, 0.8, 1);
        s.root.add(shell);
        const bowMaterial = new THREE.MeshStandardMaterial({ color: '#6f9be0', roughness: 0.5, emissive: '#6f9be0', emissiveIntensity: 0.5 });
        for (let k = 0; k < 3; k++) {
          const bow = new THREE.Mesh(new THREE.TorusGeometry(outer * (1.28 + k * 0.13), 0.028 - k * 0.006, 6, 48, Math.PI * (0.62 - k * 0.1)), bowMaterial);
          bow.rotation.z = -Math.PI * (0.31 - k * 0.05) + 0.22;
          bow.scale.y = 0.8;
          bow.castShadow = true;
          s.root.add(bow);
          const crossBow = bow.clone();
          crossBow.rotation.x = Math.PI / 2;
          s.root.add(crossBow);
        }
      }
    }
    if (bits.length) {
      const dust = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bits);
      dust.castShadow = false;
    }
    if (rubble.length) {
      const belt = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), rubble);
      belt.castShadow = false;
      system.add(belt);
    }

    const speed = mix(0.05, 1.2, mood.energy);
    return s.finish({
      footprint: orrery ? 0.9 : outer * 0.8,
      update(dt) {
        for (const { pivot, speed: own } of pivots) pivot.rotation.y += dt * speed * own;
        star.rotation.y += dt * 0.1;
      },
    });
  },
});
