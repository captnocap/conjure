import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const BIRDS = {
  singing: 'Singing: head thrown back, beak open, notes spilling out of the cage.',
  silent: 'Silent and upright on its perch, watching.',
  drooping: 'Wound down: slumped forward on the perch, head hanging, key stopped.',
  fallen: 'Fallen: lying on the cage floor with its feet in the air.',
  gone: 'Gone: the cage door hanging open, the perch empty, one feather left.',
} as const;
const METALS = {
  brass: 'Polished brass, somebody still cares for it.',
  iron: 'Blackened iron, plain and heavy.',
  verdigris: 'Copper gone green with verdigris.',
  enamel: 'Chipped red enamel, company issue.',
} as const;
const METAL_TINT: Record<keyof typeof METALS, { colour: string; metal: number; rough: number }> = {
  brass: { colour: '#c9a04a', metal: 0.85, rough: 0.3 }, iron: { colour: '#3a3c40', metal: 0.6, rough: 0.6 },
  verdigris: { colour: '#5fa890', metal: 0.4, rough: 0.7 }, enamel: { colour: '#c2382c', metal: 0.2, rough: 0.4 },
};

export default defineThing({
  questions: {
    bird: choice('What is the canary doing?', BIRDS),
    plumage: choice('What is the canary made like?', {
      yellow: 'Bright yellow enamel, like the real thing.',
      brass: 'Bare brass clockwork with visible rivets.',
      blue: 'Painted sky blue by someone homesick.',
      white: 'Bone white, ghostly.',
    }),
    flame: score('How is the flame burning?', ['Out: a cold wick', 'Guttering low', 'Steady', 'Flaring tall with a blue cap: bad air']),
    metal: choice('What is the lantern made of?', METALS),
    hung: choice('What is it hung on?', {
      crook: 'An iron crook driven into the rock.',
      tripod: 'A tripod of three drill rods lashed at the top.',
      prop: 'A timber pit prop with an iron bracket.',
      rail: 'A pipe rail between two posts, beside a tin mug and a tally board.',
    }),
    charms: noul('Are ribbons and luck tokens tied to it?'),
    spare: noul('Is a second, dead lantern set down on the ground beneath it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const metalSpec = METAL_TINT[a.metal];
    const metal = s.material(metalSpec.colour, { metalness: metalSpec.metal, roughness: metalSpec.rough });
    const iron = s.material('#34373b', { metalness: 0.6, roughness: 0.6 });
    const wire = s.material(a.metal === 'iron' ? '#5a5d62' : metalSpec.colour, { metalness: 0.8, roughness: 0.35 });
    const glowColour = new THREE.Color().setHSL(mix(0.6, 0.075, mood.warmth), 0.95, 0.6);
    const burning = a.flame > 0.12;
    const hang = 1.3;

    // What it hangs from.
    if (a.hung === 'crook') {
      s.tube([[-0.4, 0, 0], [-0.37, 0.7, 0], [-0.33, hang + 0.08, 0], [-0.18, hang + 0.26, 0], [-0.03, hang + 0.2, 0], [0, hang + 0.06, 0]], 0.022, iron);
      s.cylinder(0.06, 0.09, 0.07, [-0.4, 0.035, 0], iron, 6);
      for (let i = 0; i < 5; i++) s.mesh(new THREE.DodecahedronGeometry(mix(0.03, 0.07, random()), 0), s.material('#807b73', { flatShading: true }), [-0.4 + (random() - 0.5) * 0.3, 0.03, (random() - 0.5) * 0.3]);
    } else if (a.hung === 'tripod') {
      for (let i = 0; i < 3; i++) { const t = i * Math.PI * 2 / 3 + 2.6; s.rod([Math.cos(t) * 0.78, 0, Math.sin(t) * 0.78], [-Math.cos(t) * 0.05, hang + 0.42, -Math.sin(t) * 0.05], 0.018, iron); }
      for (let i = 0; i < 3; i++) s.ring(0.05, 0.012, [0, hang + 0.26 + i * 0.03, 0], s.material('#c7b27c')).rotation.x = Math.PI / 2 + (random() - 0.5) * 0.4;
      s.rod([0, hang + 0.28, 0], [0, hang + 0.04, 0], 0.008, iron);
    } else if (a.hung === 'prop') {
      const timber = s.material('#8a6540', { roughness: 0.95 });
      s.box([0.16, hang + 0.5, 0.16], [-0.34, (hang + 0.5) / 2, 0], timber).rotation.y = 0.2;
      s.box([0.5, 0.1, 0.22], [-0.3, hang + 0.55, 0], timber).rotation.z = 0.08;
      s.rod([-0.28, hang + 0.2, 0], [0.02, hang + 0.2, 0], 0.016, iron);
      s.rod([-0.28, hang - 0.05, 0], [-0.05, hang + 0.2, 0], 0.012, iron);
      s.rod([0, hang + 0.2, 0], [0, hang + 0.05, 0], 0.01, iron);
    } else {
      for (const x of [-0.55, 0.55]) { s.rod([x, 0, 0], [x, hang + 0.3, 0], 0.025, iron); s.cylinder(0.07, 0.09, 0.05, [x, 0.025, 0], iron, 6); }
      s.rod([-0.62, hang + 0.25, 0], [0.62, hang + 0.25, 0], 0.02, iron);
      s.rod([0, hang + 0.25, 0], [0, hang + 0.05, 0], 0.01, iron);
      s.rod([0.34, hang + 0.25, 0], [0.34, hang + 0.1, 0], 0.008, iron);
      s.cylinder(0.055, 0.05, 0.1, [0.34, hang + 0.04, 0], s.material('#d8dadc', { metalness: 0.7, roughness: 0.4 }), 10);
      s.label(`${'|'.repeat(1 + Math.floor(random() * 4))} ${Math.floor(random() * 90) + 9}`, 0.26, 0.2, [-0.34, hang, 0.012], '#f2f0e8', '#2a2c2e');
      s.rod([-0.34, hang + 0.25, 0], [-0.34, hang + 0.1, 0], 0.006, iron);
    }

    // The lantern swings as one piece from its ring.
    const lantern = new THREE.Group();
    lantern.position.set(0, hang + 0.05, 0);
    lantern.scale.setScalar(1.35);
    s.root.add(lantern);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = lantern) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
      return mesh;
    };
    const R = 0.15, cageTop = -0.12, cageFloor = -0.5, lampFloor = -0.72;
    put(new THREE.TorusGeometry(0.045, 0.012, 6, 16), wire, 0, -0.045, 0);
    put(new THREE.CylinderGeometry(0.03, 0.06, 0.05, 10), metal, 0, -0.105, 0);
    // Cage bars bend in to the crown.
    const bars = 10;
    for (let i = 0; i < bars; i++) {
      if (a.bird === 'gone' && (i === 0 || i === 1)) continue;
      const t = i / bars * Math.PI * 2 + 0.22;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(t) * 0.03, cageTop, Math.sin(t) * 0.03), new THREE.Vector3(Math.cos(t) * R * 0.8, cageTop - 0.05, Math.sin(t) * R * 0.8), new THREE.Vector3(Math.cos(t) * R, cageTop - 0.14, Math.sin(t) * R), new THREE.Vector3(Math.cos(t) * R, cageFloor, Math.sin(t) * R)]);
      put(new THREE.TubeGeometry(curve, 10, 0.006, 5), wire);
    }
    for (const y of [cageTop - 0.14, (cageTop + cageFloor) / 2 - 0.05]) put(new THREE.TorusGeometry(R, 0.007, 5, 28), wire, 0, y, 0).rotation.x = Math.PI / 2;
    put(new THREE.CylinderGeometry(R + 0.015, R + 0.015, 0.03, 24), metal, 0, cageFloor, 0);
    if (a.bird === 'gone') {
      // The little door swung out on its hinge.
      const door = new THREE.Group();
      for (let i = 0; i < 3; i++) put(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 5), wire, 0.035 * i, 0, 0, door);
      for (const y of [-0.1, 0.1]) put(new THREE.CylinderGeometry(0.005, 0.005, 0.075, 5), wire, 0.035, y, 0, door).rotation.z = Math.PI / 2;
      door.position.set(Math.cos(0.9) * R, cageFloor + 0.14, Math.sin(0.9) * R); door.rotation.y = -1.9;
      lantern.add(door);
    }
    put(new THREE.CylinderGeometry(0.007, 0.007, R * 2, 6), wire, 0, cageFloor + 0.13, 0).rotation.z = Math.PI / 2;

    // The canary.
    const plumage = { yellow: '#f2c81e', brass: '#c9a04a', blue: '#4a9ae0', white: '#ecebe2' }[a.plumage];
    const feather = s.material(plumage, { metalness: a.plumage === 'brass' ? 0.85 : 0.2, roughness: a.plumage === 'brass' ? 0.3 : 0.45 });
    const bird = new THREE.Group();
    const head = new THREE.Group();
    const notes: THREE.Object3D[] = [];
    if (a.bird !== 'gone') {
      const body = put(new THREE.SphereGeometry(0.055, 14, 10), feather, 0, 0.06, 0, bird);
      body.scale.set(0.85, 1, 1.25); body.rotation.x = -0.5;
      put(new THREE.SphereGeometry(0.036, 12, 8), feather, 0, 0, 0, head);
      const beakMaterial = s.material('#e8782a', { roughness: 0.4 });
      const upper = put(new THREE.ConeGeometry(0.014, 0.04, 6), beakMaterial, 0, 0.004, 0.045, head); upper.rotation.x = Math.PI / 2 - (a.bird === 'singing' ? 0.45 : 0);
      const lower = put(new THREE.ConeGeometry(0.011, 0.03, 6), beakMaterial, 0, -0.008, 0.04, head); lower.rotation.x = Math.PI / 2 + (a.bird === 'singing' ? 0.5 : 0.05);
      for (const x of [-1, 1]) put(new THREE.SphereGeometry(0.007, 6, 5), s.material('#101012', { roughness: 0.2 }), x * 0.026, 0.01, 0.022, head);
      head.position.set(0, 0.115, 0.045);
      head.rotation.x = { singing: -0.7, silent: 0, drooping: 1.1, fallen: 0.2 }[a.bird as Exclude<typeof a.bird, 'gone'>];
      bird.add(head);
      const tail = put(new THREE.BoxGeometry(0.03, 0.008, 0.09), feather, 0, 0.03, -0.09, bird); tail.rotation.x = 0.55;
      for (const x of [-1, 1]) { const wing = put(new THREE.SphereGeometry(0.04, 8, 6), s.material(plumage, { metalness: 0.5, roughness: 0.4 }), x * 0.04, 0.062, -0.01, bird); wing.scale.set(0.25, 0.7, 1.15); wing.rotation.x = -0.5; }
      // Wind-up key in its back.
      put(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 5), wire, 0, 0.11, -0.03, bird).rotation.x = -0.4;
      put(new THREE.TorusGeometry(0.016, 0.005, 5, 12), wire, 0, 0.135, -0.04, bird).rotation.y = Math.PI / 2;
      for (const x of [-0.015, 0.015]) put(new THREE.CylinderGeometry(0.003, 0.003, 0.05, 4), wire, x, 0.01, 0, bird);
      if (a.bird === 'fallen') { bird.rotation.set(0.2, 0.6, Math.PI * 0.9); bird.position.set(0.02, cageFloor + 0.15, 0.02); }
      else { bird.position.set(0, cageFloor + 0.13, 0); bird.rotation.y = 0.5 + (random() - 0.5) * 0.6; if (a.bird === 'drooping') bird.rotation.x = 0.45; }
      bird.scale.setScalar(1.75);
      lantern.add(bird);
      if (a.bird === 'singing') {
        const noteMaterial = new THREE.MeshStandardMaterial({ color: plumage, emissive: plumage, emissiveIntensity: 0.7 });
        for (let i = 0; i < 3; i++) {
          const note = new THREE.Group();
          put(new THREE.SphereGeometry(0.022, 8, 6), noteMaterial, 0, 0, 0, note).scale.set(1.2, 0.85, 0.6);
          put(new THREE.BoxGeometry(0.007, 0.075, 0.007), noteMaterial, 0.022, 0.038, 0, note);
          put(new THREE.BoxGeometry(0.035, 0.014, 0.007), noteMaterial, 0.038, 0.07, 0, note).rotation.z = -0.4;
          note.position.set(0.2 + i * 0.08, cageFloor + 0.2 + i * 0.1 + random() * 0.04, 0.12 + i * 0.03);
          note.rotation.z = (random() - 0.5) * 0.6;
          note.userData.base = note.position.y;
          lantern.add(note); notes.push(note);
        }
      }
    } else {
      const quill = put(new THREE.SphereGeometry(0.03, 8, 6), feather, 0.03, cageFloor + 0.022, 0.04); quill.scale.set(0.35, 0.08, 1.4); quill.rotation.y = 0.7;
    }

    // The lamp below the cage: glass, guards, flame and the fuel font.
    for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2; put(new THREE.CylinderGeometry(0.008, 0.008, cageFloor - lampFloor, 5), metal, Math.cos(t) * 0.115, (cageFloor + lampFloor) / 2, Math.sin(t) * 0.115); }
    const glassMaterial = new THREE.MeshStandardMaterial({ color: burning ? glowColour : new THREE.Color('#9fb0b8'), emissive: burning ? glowColour : new THREE.Color('#000'), emissiveIntensity: burning ? mix(0.35, 1.3, a.flame) : 0, transparent: true, opacity: burning ? 0.55 : 0.3, roughness: 0.1 });
    put(new THREE.CylinderGeometry(0.095, 0.095, cageFloor - lampFloor - 0.03, 18), glassMaterial, 0, (cageFloor + lampFloor) / 2, 0).castShadow = false;
    const flameHeight = mix(0.03, 0.17, a.flame);
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#fff4c8', emissive: glowColour, emissiveIntensity: 2.2 });
    const flame = burning ? put(new THREE.ConeGeometry(0.035, flameHeight, 8), flameMaterial, 0, lampFloor + 0.03 + flameHeight / 2, 0) : null;
    if (burning && a.flame > 0.8) put(new THREE.ConeGeometry(0.045, 0.06, 8), new THREE.MeshStandardMaterial({ color: '#6aa8ff', emissive: '#3a7aff', emissiveIntensity: 2 }), 0, lampFloor + 0.03 + flameHeight, 0);
    put(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6), iron, 0, lampFloor + 0.02, 0);
    put(new THREE.CylinderGeometry(0.125, 0.14, 0.1, 22), metal, 0, lampFloor - 0.05, 0);
    put(new THREE.CylinderGeometry(0.14, 0.125, 0.03, 22), metal, 0, lampFloor - 0.115, 0);
    put(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), iron, 0.15, lampFloor - 0.05, 0).rotation.z = Math.PI / 2;
    const halo = burning ? put(new THREE.SphereGeometry(mix(0.2, 0.42, a.flame), 14, 10), new THREE.MeshBasicMaterial({ color: glowColour, transparent: true, opacity: 0.07, depthWrite: false }), 0, (cageFloor + lampFloor) / 2, 0) : null;
    if (halo) halo.castShadow = false;

    if (a.charms) {
      const tints = ['#e84a5a', '#f2f0e8', '#4a8ae8', '#e8c040', '#5ac06a'];
      for (let i = 0; i < 4; i++) {
        const t = random() * Math.PI * 2;
        const ribbon = put(new THREE.BoxGeometry(0.022, mix(0.16, 0.34, random()), 0.003), s.material(tints[i], { side: THREE.DoubleSide }), Math.cos(t) * (R + 0.02), cageFloor - 0.12 - random() * 0.05, Math.sin(t) * (R + 0.02));
        ribbon.rotation.set((random() - 0.5) * 0.3, t, (random() - 0.5) * 0.3);
      }
      put(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12), s.material('#d8dadc', { metalness: 0.9, roughness: 0.2 }), -R - 0.03, cageFloor - 0.2, 0.03).rotation.x = Math.PI / 2;
      put(new THREE.CylinderGeometry(0.002, 0.002, 0.2, 4), iron, -R - 0.03, cageFloor - 0.1, 0.03);
      const shoe = put(new THREE.TorusGeometry(0.035, 0.009, 5, 12, Math.PI * 1.3), iron, R * 0.8, lampFloor - 0.2, 0.1); shoe.rotation.z = Math.PI * 0.85 + Math.PI;
      put(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 4), iron, R * 0.8, lampFloor - 0.13, 0.1);
    }

    if (a.spare) {
      const dead = s.material('#4a4d50', { metalness: 0.5, roughness: 0.7 });
      const x = 0.28, z = 0.3;
      s.cylinder(0.1, 0.11, 0.08, [x, 0.04, z], dead, 14);
      s.cylinder(0.075, 0.075, 0.16, [x, 0.16, z], new THREE.MeshStandardMaterial({ color: '#5c666a', roughness: 0.2, transparent: true, opacity: 0.6 }), 12);
      s.cylinder(0.06, 0.09, 0.1, [x, 0.29, z], dead, 12);
      s.ring(0.05, 0.008, [x, 0.38, z], dead);
    }

    const swing = mix(0.01, 0.07, mood.energy), phase = random() * 6;
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        lantern.rotation.z = Math.sin(time * 1.6 + phase) * swing;
        if (flame) { flame.scale.y = 1 + Math.sin(time * 17 + phase) * 0.12 * (1.3 - a.flame); flameMaterial.emissiveIntensity = 2 + Math.sin(time * 23) * 0.4; }
        if (a.bird === 'singing') { head.rotation.x = -0.7 + Math.sin(time * 9) * 0.12; bird.position.y = cageFloor + 0.13 + Math.abs(Math.sin(time * 4.5)) * 0.008; }
        for (const [index, note] of notes.entries()) note.position.y = (note.userData.base as number) + Math.sin(time * 2 + index * 1.7) * 0.02;
      },
    });
  },
});
