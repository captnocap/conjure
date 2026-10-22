import * as THREE from 'three';
import { type Thing, choice, defineThing, disposeTree, mix, noul, score, visibleBounds } from '@conjure/kit';

type P = [number, number, number];
interface Drop { at: P; r: number; phase: number; }

const LIQUIDS = {
  tears: { colour: '#a9cdea', opacity: 0.82, emissive: '#6fa4d8', glow: 0.3, rough: 0.04 },
  water: { colour: '#8fc0e2', opacity: 0.8, emissive: '#4f98d0', glow: 0.26, rough: 0.04 },
  coffee: { colour: '#4a2a14', opacity: 0.96, emissive: '#3a1a08', glow: 0.1, rough: 0.12 },
  juice: { colour: '#ff9a1e', opacity: 1, emissive: '#ff7a00', glow: 0.18, rough: 0.3 },
  milk: { colour: '#f6f3ea', opacity: 1, emissive: '#ffffff', glow: 0.06, rough: 0.5 },
  blood: { colour: '#7a1018', opacity: 0.98, emissive: '#5a0008', glow: 0.14, rough: 0.2 },
} as const;

export default defineThing({
  questions: {
    cluster: choice('How many drops, and how are they grouped?', {
      single: 'One big trembling orb alone, with a few tiny beads that have broken off it trailing below.',
      few: 'A handful of drops, four or five, at different sizes, drifting apart.',
      string: 'A string of drops breaking off one another in a wavy line, like beads on an invisible thread.',
      scatter: 'A scatter of a dozen small drops spreading out across the space.',
      cloud: 'A cloud of dozens of tiny beads, fine as mist, hanging together.',
    }),
    size: score('How big are the drops?', ['Pinhead beads', 'Pea-sized', 'Marble-sized', 'As big as a fist']),
    liquid: choice('What is the liquid?', {
      tears: 'Clear tears, colourless, catching the light.',
      water: 'Plain drinking water, faintly blue.',
      coffee: 'Brown coffee escaped from a torn pouch.',
      juice: 'Orange juice, bright and opaque.',
      milk: 'White milk, opaque and matte.',
      blood: 'A few beads of dark red blood from a cut.',
    }),
    drift: choice('Which way are they drifting?', {
      rising: 'Rising slowly, away from whoever shed them.',
      sinking: 'Sinking slowly, as if remembering gravity.',
      sideways: 'Sliding sideways toward an air vent.',
      still: 'Hanging almost still, turning in place.',
      burst: 'Spreading apart from one point, a slow burst.',
    }),
    source: choice('Is the source drifting with them?', {
      none: 'No source in sight: the drops came from somewhere else.',
      pouch: 'A crumpled foil drink pouch with a straw, turning slowly among them.',
      tissue: 'A balled-up tissue drifting nearby.',
      glove: 'A single white glove, fingers open, floating among them.',
    }),
    wobble: noul('Are the bigger drops wobbling, not quite round?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const liquid = LIQUIDS[a.liquid];
    const sizeBase = mix(0.014, 0.08, a.size * a.size);
    const drops: Drop[] = [];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const put = (x: number, y: number, z: number, r: number) => drops.push({ at: [x, y, z], r, phase: random() * Math.PI * 2 });

    if (a.cluster === 'single') {
      const r = Math.max(0.03, sizeBase * 1.6);
      const y = mix(0.75, 1.1, random());
      put(0, y, 0, r);
      const beads = 2 + Math.floor(random() * 3);
      for (let i = 0; i < beads; i++) put(jitter(0.12) + 0.04 * i, y - r - 0.06 - i * mix(0.12, 0.2, random()), jitter(0.1), r * mix(0.12, 0.3, random()));
    } else if (a.cluster === 'few') {
      const count = 4 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) put(jitter(0.4), mix(0.2, 1.2, (i + random()) / count), jitter(0.32), Math.max(0.02, sizeBase * mix(0.7, 1.4, random())));
    } else if (a.cluster === 'string') {
      const count = 8 + Math.floor(random() * 4);
      const lean = jitter(0.5);
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        put(Math.sin(t * Math.PI * 2.2 + 1) * 0.12 + lean * t, 0.15 + t * 1.25, Math.cos(t * Math.PI * 1.7) * 0.1, Math.max(0.012, sizeBase * mix(1.2, 0.4, t) * mix(0.85, 1.15, random())));
      }
    } else if (a.cluster === 'scatter') {
      const count = 11 + Math.floor(random() * 5);
      for (let i = 0; i < count; i++) put(jitter(0.8), mix(0.15, 1.45, random()), jitter(0.6), Math.max(0.012, sizeBase * 0.65 * mix(0.6, 1.4, random())));
    } else {
      const count = 46 + Math.floor(random() * 26);
      for (let i = 0; i < count; i++) {
        // A loose ellipsoid of mist: denser toward the middle.
        const u = random(), v = random() * Math.PI * 2, w = Math.sqrt(random());
        put(Math.cos(v) * w * 0.45, 0.2 + u * 1.3, Math.sin(v) * w * 0.4, Math.max(0.007, sizeBase * 0.32 * mix(0.5, 1.6, random())));
      }
    }
    // Always hang low enough to count as standing; the lowest drop sits a hand above the floor.
    const lowest = Math.min(...drops.map((drop) => drop.at[1] - drop.r));
    const lift = 0.16 - lowest;
    for (const drop of drops) drop.at[1] += lift;

    const water = new THREE.MeshPhysicalMaterial({
      color: liquid.colour, transparent: liquid.opacity < 1, opacity: liquid.opacity, roughness: liquid.rough, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.05, emissive: liquid.emissive, emissiveIntensity: liquid.glow * mix(0.7, 1.4, mood.cheer),
    });
    const body = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), water, drops.length);
    body.castShadow = body.receiveShadow = true;
    root.add(body);
    // A glint on the upper shoulder of every drop so they read as wet in flat prints.
    const glintMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    const glint = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), glintMat, drops.length);
    glint.castShadow = glint.receiveShadow = false;
    root.add(glint);
    // A dark rim behind each see-through drop: the refracted edge that makes water read on pale paper.
    const rim = liquid.opacity < 1
      ? new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#2e4f6e', transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false }), drops.length)
      : null;
    if (rim) { rim.castShadow = rim.receiveShadow = false; root.add(rim); }

    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion();
    const middle = drops.reduce((sum, drop) => sum.add(new THREE.Vector3(...drop.at)), new THREE.Vector3()).divideScalar(drops.length);
    const pose = (time: number, spread: number) => {
      for (const [index, drop] of drops.entries()) {
        const wob = a.wobble && drop.r > 0.015 ? Math.sin(time * 3.1 + drop.phase) * 0.14 * (0.3 + mood.energy) : 0;
        scale.set(drop.r * (1 + wob), drop.r * (1 - wob * 0.8), drop.r * (1 + wob * 0.3));
        position.set(
          middle.x + (drop.at[0] - middle.x) * spread + Math.sin(time * 0.6 + drop.phase) * 0.012,
          middle.y + (drop.at[1] - middle.y) * spread + Math.cos(time * 0.5 + drop.phase * 1.3) * 0.012,
          middle.z + (drop.at[2] - middle.z) * spread + Math.sin(time * 0.45 + drop.phase * 0.7) * 0.012,
        );
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), time * 0.3 + drop.phase);
        matrix.compose(position, quaternion, scale);
        body.setMatrixAt(index, matrix);
        if (rim) { matrix.compose(position, quaternion, scale.clone().multiplyScalar(1.06)); rim.setMatrixAt(index, matrix); }
        matrix.makeScale(drop.r * 0.22, drop.r * 0.16, drop.r * 0.1).setPosition(position.x - drop.r * 0.38, position.y + drop.r * 0.5, position.z + drop.r * 0.72);
        glint.setMatrixAt(index, matrix);
      }
      body.instanceMatrix.needsUpdate = glint.instanceMatrix.needsUpdate = true;
      if (rim) rim.instanceMatrix.needsUpdate = true;
    };
    pose(0, 1);
    body.computeBoundingBox();

    // What they came from, drifting with them.
    const anchor = drops[Math.floor(random() * drops.length)].at;
    const near: P = [anchor[0] + jitter(0.3) + 0.16, Math.max(0.3, anchor[1] + jitter(0.3)), anchor[2] + jitter(0.3)];
    let prop: THREE.Object3D | null = null;
    if (a.source === 'pouch') {
      const foil = new THREE.MeshStandardMaterial({ color: a.liquid === 'coffee' ? '#8a5a2a' : a.liquid === 'juice' ? '#f08a20' : '#c9ccd4', metalness: 0.75, roughness: 0.3 });
      prop = new THREE.Group();
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.035), foil);
      bag.scale.set(1, 1, 1);
      const crumple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), foil);
      crumple.position.set(0.02, 0.03, 0.01);
      crumple.scale.set(1.2, 0.9, 0.6);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 8), new THREE.MeshStandardMaterial({ color: '#f4f4f0' }));
      straw.position.set(-0.03, 0.1, 0.02);
      straw.rotation.z = 0.5;
      prop.add(bag, crumple, straw);
    } else if (a.source === 'tissue') {
      prop = new THREE.Group();
      const paper = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const lump = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), paper);
        lump.position.set(jitter(0.05), jitter(0.05), jitter(0.05));
        lump.scale.set(mix(0.7, 1.3, random()), mix(0.6, 1.1, random()), mix(0.7, 1.3, random()));
        prop.add(lump);
      }
    } else if (a.source === 'glove') {
      prop = new THREE.Group();
      const cotton = new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.9 });
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.025), cotton);
      prop.add(palm);
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.06, 3, 8), cotton);
        finger.position.set(-0.033 + i * 0.022, 0.085, 0);
        finger.rotation.z = (i - 1.5) * 0.08;
        prop.add(finger);
      }
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 3, 8), cotton);
      thumb.position.set(0.058, 0.02, 0);
      thumb.rotation.z = -0.9;
      prop.add(thumb);
    }
    if (prop) {
      prop.position.set(...near);
      prop.rotation.set(random() * 2, random() * 6, random() * 2);
      prop.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      root.add(prop);
    }

    // Centre the cluster, but let it hang above the floor: it is weightless.
    const bounds = visibleBounds(root);
    const centre = bounds.getCenter(new THREE.Vector3());
    root.position.set(-centre.x, 0.0, -centre.z);

    // How far the cluster slides along its drift before it eases back, so it stays where the world put it.
    const reach = ({ rising: [0, 0.22, 0], sinking: [0, -0.18, 0], sideways: [0.28, 0.02, 0], still: [0, 0, 0], burst: [0, 0, 0] } as const)[a.drift];
    const speed = mix(0.25, 1.6, mood.energy);
    let travelled = 0;
    const thing: Thing = {
      object: root,
      update(dt, time) {
        travelled = (travelled + dt * speed * 0.08) % 2;
        const k = travelled < 1 ? travelled : 2 - travelled;
        const ease = k * k * (3 - 2 * k);
        pose(time * speed, a.drift === 'burst' ? 1 + ease * 0.45 : 1);
        body.position.set(reach[0] * ease, reach[1] * ease, reach[2] * ease);
        glint.position.copy(body.position);
        if (rim) rim.position.copy(body.position);
        if (prop) prop.rotation.y += dt * 0.4 * speed;
      },
      dispose: () => disposeTree(root),
    };
    return thing;
  },
});
