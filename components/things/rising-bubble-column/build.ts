import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    source: choice('Where do the bubbles come from?', {
      hole: 'A small dark hole in a low sand mound, like something breathing under the sand.',
      vent: 'A craggy rock chimney, a little volcanic vent.',
      pipe: 'A rusty iron pipe elbow sticking up out of the sand, leaking.',
      bottle: 'A green glass bottle lying on its side, fizzing from the neck.',
    }),
    count: score('How many bubbles?', ['A few lazy bubbles', 'A steady stream', 'A roaring column']),
    size: choice('How big are the bubbles?', {
      fizz: 'Tiny fizz, like soda.',
      marble: 'Marble sized, evenly spaced.',
      wobbly: 'Big wobbly bubbles, cartoon sized.',
      mixed: 'All sizes jumbled together.',
    }),
    pace: choice('How do they rise?', {
      lazy: 'Slowly, one at a time, drifting.',
      steady: 'A steady trickle in a neat line.',
      gush: 'A rushing gush, bubbles tumbling over each other and spreading.',
    }),
    reach: score('How high does the column reach before it scatters?', ['Knee high', 'Head high', 'Up out of sight']),
    tint: choice('What colour catches in the bubbles?', {
      clear: 'Plain clear water glass.',
      pearl: 'Pearly white, like soap.',
      blue: 'A cool blue sheen.',
      pink: 'A warm pink shimmer.',
    }),
    around: choice('What is going on at the source?', {
      bare: 'Nothing, just sand.',
      pebbles: 'A ring of pebbles someone arranged round it.',
      fish: 'A small orange fish hovering in the stream, enjoying the tickle.',
      sign: 'A hand-painted warning sign on a stick.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = s.material('#dccb98', { roughness: 0.95 });
    const dark = s.material('#2a2622', { roughness: 0.9 });
    const rock = s.material('#5f6163', { roughness: 0.85, flatShading: true });
    const rust = s.material(mood.wear > 0.5 ? '#7a4a2a' : '#8f6a4a', { metalness: 0.5, roughness: 0.6 });

    // The source: a solid thing standing on the sand that the bubbles start from.
    let origin: [number, number, number] = [0, 0.05, 0];
    if (a.source === 'hole') {
      s.lathe([[0, 0.012], [0.18, 0.012], [0.3, 0.14], [0.55, 0.09], [0.85, 0.015], [0.9, 0]], sand);
      const hole = s.cylinder(0.17, 0.17, 0.02, [0, 0.03, 0], dark, 20);
      hole.castShadow = false;
      origin = [0, 0.08, 0];
    }
    if (a.source === 'vent') {
      s.cylinder(0.16, 0.5, 0.6, [0, 0.3, 0], rock, 9);
      s.cylinder(0.11, 0.11, 0.04, [0, 0.6, 0], dark, 12);
      for (let i = 0; i < 5; i++) {
        const angle = random() * Math.PI * 2;
        s.ball([0.12 + random() * 0.1, 0.08 + random() * 0.06, 0.1 + random() * 0.08], [Math.sin(angle) * 0.55, 0.05, Math.cos(angle) * 0.55], rock, 6);
      }
      origin = [0, 0.62, 0];
    }
    if (a.source === 'pipe') {
      s.cylinder(0.2, 0.22, 0.06, [0, 0.03, 0], rust, 12);
      s.cylinder(0.08, 0.08, 0.9, [0, 0.48, 0], rust, 12);
      s.ring(0.085, 0.03, [0, 0.93, 0], rust).rotation.x = Math.PI / 2;
      s.ring(0.085, 0.03, [0, 0.5, 0], rust).rotation.x = Math.PI / 2;
      s.cylinder(0.065, 0.065, 0.04, [0, 0.95, 0], dark, 12);
      s.rod([0, 0.25, 0], [-0.45, 0.12, 0.15], 0.07, rust);
      origin = [0, 0.97, 0];
    }
    if (a.source === 'bottle') {
      const glass = s.material('#2f8f4a', { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });
      const bottle = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 16), glass);
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.11, 0.12, 16), glass);
      shoulder.position.y = 0.31;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12), glass);
      neck.position.y = 0.46;
      for (const part of [body, shoulder, neck]) { part.castShadow = part.receiveShadow = true; bottle.add(part); }
      bottle.rotation.z = Math.PI / 2 + 0.12;
      bottle.rotation.y = 0.5;
      bottle.position.set(0.05, 0.11, 0);
      s.root.add(bottle);
      s.lathe([[0, 0.005], [0.5, 0.01], [0.7, 0.03], [0.8, 0]], sand);
      origin = [-0.48, 0.17, 0.26];
    }

    // The bubbles: one instanced sphere, seen through, with a darker shell behind it for a cartoon rim.
    const count = Math.round(mix(7, 60, a.count) * mix(0.8, 1.2, random()));
    const reach = mix(1.2, 4.6, a.reach);
    const sizeRange = { fizz: [0.03, 0.05], marble: [0.07, 0.1], wobbly: [0.1, 0.18], mixed: [0.03, 0.17] }[a.size] as [number, number];
    const spread = { lazy: 0.18, steady: 0.1, gush: 0.42 }[a.pace];
    const speed = { lazy: 0.25, steady: 0.5, gush: 1.1 }[a.pace] * mix(0.5, 1.6, mood.energy);
    const tint = { clear: '#e6f6ff', pearl: '#fdfaf0', blue: '#9ad2ff', pink: '#ffc4dc' }[a.tint];
    const rim = { clear: '#2a6f9a', pearl: '#8c8a7a', blue: '#1f4f8a', pink: '#a04a6a' }[a.tint];
    const film = new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.15, transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0.15 });
    const shell = new THREE.MeshStandardMaterial({ color: rim, transparent: true, opacity: 0.5, side: THREE.BackSide, depthWrite: false, roughness: 0.6 });
    const sphere = new THREE.SphereGeometry(1, 12, 10);
    const bubbles = new THREE.InstancedMesh(sphere, film, count);
    const rims = new THREE.InstancedMesh(sphere, shell, count);
    bubbles.castShadow = false;
    rims.castShadow = false;
    s.root.add(bubbles, rims);
    const seeds = Array.from({ length: count }, () => ({
      phase: random(),
      size: mix(sizeRange[0], sizeRange[1], random()),
      angle: random() * Math.PI * 2,
      wob: 0.5 + random(),
      drift: (random() - 0.5) * spread,
    }));
    const matrix = new THREE.Matrix4();
    const pose = (time: number) => {
      for (const [i, b] of seeds.entries()) {
        const t = (b.phase + time * speed * 0.18) % 1;
        const y = origin[1] + t * reach;
        const r = (0.02 + t * spread) * (1 + 0.3 * Math.sin(time * 1.3 * b.wob + b.angle));
        const x = origin[0] + Math.sin(b.angle + time * 0.7 * b.wob) * r + b.drift * t;
        const z = origin[2] + Math.cos(b.angle + time * 0.7 * b.wob) * r;
        const grow = b.size * (0.7 + t * 0.6);
        matrix.makeScale(grow, grow * 1.08, grow).setPosition(x, y, z);
        bubbles.setMatrixAt(i, matrix);
        matrix.makeScale(grow * 1.1, grow * 1.18, grow * 1.1).setPosition(x, y, z);
        rims.setMatrixAt(i, matrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      rims.instanceMatrix.needsUpdate = true;
    };
    pose(0);

    // Around the source.
    if (a.around === 'pebbles') {
      const pebble = s.material('#8e8a80', { roughness: 0.9 });
      const n = 10 + Math.floor(random() * 5);
      const ring = a.source === 'bottle' ? 0.95 : 0.85;
      s.scatter(new THREE.SphereGeometry(1, 8, 6), pebble, Array.from({ length: n }, (_, i) => {
        const angle = i / n * Math.PI * 2 + (random() - 0.5) * 0.3;
        return { at: [Math.sin(angle) * ring, 0.04, Math.cos(angle) * ring] as [number, number, number], size: 0.05 + random() * 0.04, color: random() < 0.3 ? '#c9c2b4' : '#8e8a80' };
      }));
    }
    let fish: THREE.Group | null = null;
    if (a.around === 'fish') {
      fish = new THREE.Group();
      const orange = s.material('#ff8a2a', { roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), orange);
      body.scale.set(0.16, 0.1, 0.07);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 3), orange);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.18;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), dark);
      eye.position.set(0.08, 0.03, 0.06);
      body.castShadow = tail.castShadow = true;
      fish.add(body, tail, eye);
      fish.position.set(origin[0] + 0.1, origin[1] + reach * 0.35, origin[2] + 0.12);
      s.root.add(fish);
    }
    if (a.around === 'sign') {
      s.cylinder(0.02, 0.025, 0.7, [0.65, 0.35, 0.3], s.material('#6b4a2e'), 8);
      s.box([0.5, 0.22, 0.03], [0.65, 0.72, 0.3], s.material('#d8c48c'));
      s.label('DO NOT POP', 0.46, 0.18, [0.65, 0.72, 0.317], '#b02020', '#e8d8a8');
    }

    return s.finish({
      footprint: 0.9,
      update: (_dt, time) => {
        pose(time);
        if (fish) {
          fish.position.y = origin[1] + reach * 0.35 + Math.sin(time * 1.6) * 0.12;
          fish.rotation.y = Math.sin(time * 0.8) * 0.4;
          fish.rotation.z = Math.sin(time * 1.6) * 0.15;
        }
      },
    });
  },
});
