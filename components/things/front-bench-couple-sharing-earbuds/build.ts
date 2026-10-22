import * as THREE from 'three';
import { type Figure, Sculpture, choice, defineThing, figure, mix, score } from '@conjure/kit';
import { SKINS, anatomy, at, busSeat, closeEyes, garment, joints, openMouth, pick, poseLeg, reachArm, seatPalette } from './bus';

const GLOWS = {
  white: 'A white feed: cold white light on both faces.',
  blue: 'A video playing: blue light.',
  warm: 'Old photos: warm orange light.',
  green: 'A map or a game: green light.',
} as const;
const GLOW_COLOUR: Record<keyof typeof GLOWS, string> = { white: '#e8eeff', blue: '#5b8dff', warm: '#ffa860', green: '#7dff9c' };

export default defineThing({
  questions: {
    who: choice('Who are they?', {
      teens: 'Two teenagers in hoodies and caps, all elbows.',
      old: 'An old couple in cardigans, grey-haired, leaning into each other out of long habit.',
      workmates: 'Two friends in matching work polo shirts with name badges, straight off a shift.',
      nightout: 'Two friends in going-out clothes, sequins and satin, make-up fading.',
    }),
    coats: choice('What coats are they wearing?', {
      puffers: 'Fat glossy puffer jackets.',
      wool: 'Long wool coats with turned-up collars.',
      denim: 'One in denim, one in a leather jacket.',
      none: 'No coats: sleeves and bare arms.',
    }),
    feeling: choice('Laughing or silent?', {
      laughing: 'Laughing, mouths open, heads tipping together and apart.',
      silent: 'Silent, eyes closed, foreheads resting together.',
    }),
    floor: choice('What lies on the floor at their feet?', {
      nothing: 'Nothing: just their shoes.',
      shopping: 'A carrier bag of shopping.',
      flowers: 'A bunch of flowers wrapped in paper.',
      pizza: 'A flat pizza box.',
    }),
    close: score('How close do they sit?', ['A hand\'s width apart', 'Shoulders touching', 'Pressed together, one shape']),
    glow: choice('What is on the phone screen?', GLOWS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glow = GLOW_COLOUR[a.glow];
    type Look = { H: number; build: 'slight' | 'average' | 'heavy'; hair: 'none' | 'short' | 'long' | 'bun' | 'cap'; hairColor: string; top: string; bottom: string; shoes: string; sleeves: 'long' | 'short'; stoop: number };
    const greys = ['#c9c6c0', '#e8e6e0', '#9a9892'];
    const polo = pick(random, ['#1f7a3a', '#1f4aa8', '#e8701a', '#8a1f2a']);
    const table: Record<typeof a.who, [Look, Look]> = {
      teens: [
        { H: mix(1.58, 1.66, random()), build: 'slight', hair: 'cap', hairColor: '#2a2a2e', top: pick(random, ['#1c1d21', '#8d8f93', '#9a3a34']), bottom: '#3b4f72', shoes: '#f1f1ee', sleeves: 'long', stoop: 0 },
        { H: mix(1.66, 1.76, random()), build: 'slight', hair: 'short', hairColor: pick(random, ['#2a1d18', '#6b4a2e']), top: pick(random, ['#263556', '#2f5a3e', '#b7a2cf']), bottom: '#1f2024', shoes: '#1c1c1e', sleeves: 'long', stoop: 0 },
      ],
      old: [
        { H: mix(1.52, 1.62, random()), build: 'average', hair: 'bun', hairColor: pick(random, greys), top: pick(random, ['#9a7aa8', '#c9b89a', '#7a9aa8']), bottom: '#3a3540', shoes: '#2a211b', sleeves: 'long', stoop: 0.14 },
        { H: mix(1.62, 1.72, random()), build: random() < 0.5 ? 'heavy' : 'average', hair: random() < 0.5 ? 'none' : 'short', hairColor: pick(random, greys), top: pick(random, ['#6b5a3a', '#4a5a4a', '#5a4a5a']), bottom: '#4a4238', shoes: '#2a211b', sleeves: 'long', stoop: 0.18 },
      ],
      workmates: [
        { H: mix(1.58, 1.7, random()), build: 'average', hair: pick(random, ['bun', 'short', 'long']), hairColor: pick(random, ['#2a1d18', '#6b4a2e', '#c89a5a']), top: polo, bottom: '#1f2024', shoes: '#1c1c1e', sleeves: 'short', stoop: 0.04 },
        { H: mix(1.64, 1.8, random()), build: random() < 0.4 ? 'heavy' : 'average', hair: pick(random, ['short', 'none', 'cap']), hairColor: pick(random, ['#2a1d18', '#3b2a22', '#8a8a86']), top: polo, bottom: '#1f2024', shoes: '#1c1c1e', sleeves: 'short', stoop: 0.06 },
      ],
      nightout: [
        { H: mix(1.58, 1.7, random()), build: 'slight', hair: 'long', hairColor: pick(random, ['#2a1d18', '#c89a5a', '#8a2a2a']), top: pick(random, ['#c8a030', '#c0c4cc', '#d93a6a']), bottom: '#1a1a1e', shoes: '#1a1a1e', sleeves: 'short', stoop: 0 },
        { H: mix(1.6, 1.72, random()), build: 'slight', hair: pick(random, ['bun', 'long']), hairColor: pick(random, ['#2a1d18', '#3b2a22', '#6b4a2e']), top: pick(random, ['#6a1a3a', '#1f3a7a', '#2a6a5a']), bottom: '#1a1a1e', shoes: '#1a1a1e', sleeves: 'short', stoop: 0 },
      ],
    };
    const looks = table[a.who];
    const skins = [pick(random, SKINS), pick(random, SKINS)];
    const gap = mix(0.5, 0.36, a.close);
    const people: Figure[] = [];
    const heads: THREE.Vector3[] = [];
    const sizes: number[] = [];

    looks.forEach((look, index) => {
      const sign = index === 0 ? -1 : 1;
      const person = figure(s, {
        height: look.H, build: look.build, style: 'doll', pose: 'sitting', gaze: 'down', skin: skins[index],
        hair: look.hair, hairColor: look.hairColor, top: look.top, bottom: look.bottom, shoes: look.shoes, sleeves: look.sleeves,
        mirror: index === 1,
      });
      s.root.add(person.root);
      const { torsoL, headR, chestR, spine, shoulderW } = anatomy(person, look.H, look.build);
      // Coats over the tops.
      if (a.coats === 'puffers') {
        const colour = pick(random, ['#1c1c20', '#b8202a', '#223a6a', '#c9ccd2', '#5a7a3a']);
        garment(person, look.H, look.build, s.material(colour, { roughness: 0.3 }), { grow: 1.3, length: 1.02 });
      } else if (a.coats === 'wool') {
        const colour = pick(random, ['#b8905a', '#4a4a4e', '#1f2024', '#2f4a3a', '#6a2a2a']);
        const wool = s.material(colour, { roughness: 1 });
        garment(person, look.H, look.build, wool, { grow: 1.16, length: 1.04, open: 40 });
        const collar = new THREE.Mesh(new THREE.TorusGeometry(chestR * 1.15, chestR * 0.22, 6, 16, Math.PI * 1.4), wool);
        collar.position.set(0, torsoL * 1.0, -chestR * 0.1);
        collar.rotation.set(Math.PI / 2, 0, Math.PI * 0.8);
        collar.scale.x = shoulderW / chestR * 0.8;
        spine.add(collar);
      } else if (a.coats === 'denim') {
        const material = index === 0 ? s.material('#4d6a9c', { roughness: 0.9 }) : s.material('#1d1b1e', { roughness: 0.25 });
        garment(person, look.H, look.build, material, { grow: 1.14, length: 1.0, open: 50 });
        for (const side of ['left', 'right'] as const) {
          const { shoulder, elbow } = joints(person, side);
          for (const node of [shoulder, elbow]) for (const child of node.children) if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).material = material;
        }
      }
      if (a.who === 'workmates') {
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.022, 0.004), s.material('#f4f4f0', { roughness: 0.5 }));
        badge.position.set(sign * -shoulderW * 0.45, torsoL * 0.8, chestR + 0.004);
        spine.add(badge);
      }
      // The lean: toward each other through the spine and the neck, heads down to the screen.
      const { neck } = joints(person, 'left');
      const tilt = 0.3;
      spine.rotation.set(look.stoop, 0, -sign * 0.1);
      neck.rotation.set(0.42, sign * 0.3, -sign * tilt);
      if (a.feeling === 'laughing') {
        neck.rotation.x = index === 0 ? -0.15 : 0.3;
        neck.rotation.z = -sign * (tilt - 0.12);
        openMouth(person, headR, s.material('#3a2320', { roughness: 0.8 }), 1.2);
      } else closeEyes(person, headR);
      poseLeg(person, 'left', { forward: 86, knee: 84, out: a.who === 'old' && index === 1 ? 16 : 4 });
      poseLeg(person, 'right', { forward: 88, knee: 86, out: a.who === 'old' && index === 1 ? 12 : 2 });
      person.settle();
      person.root.position.x = sign * gap / 2;
      person.root.updateMatrixWorld(true);
      people.push(person);
      heads.push(at(person.head));
      sizes.push(headR);
    });

    // Bring the foreheads together: lean each spine until the heads sit a finger apart.
    const wantedGap = sizes[0] + sizes[1] + (a.feeling === 'laughing' ? 0.06 : 0.015);
    const current = heads[1].x - heads[0].x;
    people.forEach((person, index) => {
      const sign = index === 0 ? -1 : 1;
      const { spine } = joints(person, 'left');
      const reach = looks[index].H * 0.42;
      spine.rotation.z += sign * Math.asin(Math.min(0.6, Math.max(-0.3, (current - wantedGap) / 2 / reach)));
      person.root.updateMatrixWorld(true);
    });
    const hipsA = at(people[0].pelvis), hipsB = at(people[1].pelvis);
    const hipsY = (hipsA.y + hipsB.y) / 2, hipsZ = (hipsA.z + hipsB.z) / 2;
    const seatTop = hipsY - 0.045 * (looks[0].H + looks[1].H) / 2;

    // ---- four hands cup one phone between them.
    const phoneAt = new THREE.Vector3(0, hipsY + 0.3, hipsZ + 0.26);
    people.forEach((person, index) => {
      const inner = index === 0 ? 'left' : 'right';
      const outer = index === 0 ? 'right' : 'left';
      const shoulderIn = at(joints(person, inner).shoulder);
      reachArm(person, inner, looks[index].H, phoneAt.y - 0.03 - shoulderIn.y, phoneAt.z - shoulderIn.z, 4, 55);
      const shoulderOut = at(joints(person, outer).shoulder);
      reachArm(person, outer, looks[index].H, hipsY + 0.08 - shoulderOut.y, hipsZ + 0.16 - shoulderOut.z, 6, 35);
      person.root.updateMatrixWorld(true);
    });
    const handA = at(people[0].hands.left), handB = at(people[1].hands.right);
    const mid = handA.clone().add(handB).multiplyScalar(0.5);
    mid.y += 0.02;
    const screenMat = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: mix(0.9, 2.0, 1 - mood.daylight), roughness: 0.3 });
    const phone = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.009), s.material('#15161a', { roughness: 0.3 }));
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.148, 0.002), screenMat);
    screen.position.z = -0.005;
    body.castShadow = true;
    phone.add(body, screen);
    phone.position.copy(mid);
    phone.rotation.x = 0.95;
    s.root.add(phone);
    // One wire from the phone, splitting between the two ears.
    const wire = s.material('#f4f4f0', { roughness: 0.6 });
    const earA = people[0].head.localToWorld(new THREE.Vector3(sizes[0] * 0.98, 0, sizes[0] * 0.1));
    const earB = people[1].head.localToWorld(new THREE.Vector3(-sizes[1] * 0.98, 0, sizes[1] * 0.1));
    const split = new THREE.Vector3(mid.x, mid.y + 0.16, mid.z - 0.04);
    s.tube([[mid.x, mid.y + 0.07, mid.z - 0.01], [split.x - 0.01, split.y - 0.08, split.z + 0.02], [split.x, split.y, split.z]], 0.0025, wire);
    s.tube([[split.x, split.y, split.z], [(split.x + earA.x) / 2, (split.y + earA.y) / 2 - 0.02, (split.z + earA.z) / 2 + 0.03], [earA.x, earA.y, earA.z]], 0.0025, wire);
    s.tube([[split.x, split.y, split.z], [(split.x + earB.x) / 2, (split.y + earB.y) / 2 - 0.02, (split.z + earB.z) / 2 + 0.03], [earB.x, earB.y, earB.z]], 0.0025, wire);
    for (const [person, ear, r] of [[people[0], earA, sizes[0]], [people[1], earB, sizes[1]]] as const) {
      const bud = s.ball([r * 0.14, r * 0.14, r * 0.14], [ear.x, ear.y, ear.z], wire, 8);
      void person;
      void bud;
    }
    // The screen lights both faces.
    for (const person of people) {
      const skull = person.head.children.find((child) => (child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry.type === 'SphereGeometry' && Math.abs(child.position.x) < 0.001) as THREE.Mesh | undefined;
      if (skull) {
        const lit = (skull.material as THREE.MeshStandardMaterial).clone();
        lit.emissive = new THREE.Color(glow);
        lit.emissiveIntensity = mix(0.1, 0.3, 1 - mood.daylight);
        skull.material = lit;
      }
    }

    // ---- the bench and what lies at their feet.
    const palette = seatPalette(s, random);
    busSeat(s, palette, { x: 0, z: hipsZ + 0.06, seatTop, width: 1.36, aisle: 'right' });
    const feetZ = hipsZ + 0.5;
    if (a.floor === 'shopping') {
      const bagMat = s.material(pick(random, ['#f4f4f0', '#e8702a', '#2a6a3a', '#3a6ad4']), { roughness: 0.9 });
      const bx = (random() - 0.5) * 0.5;
      s.box([0.3, 0.3, 0.2], [bx, 0.15, feetZ], bagMat).rotation.y = (random() - 0.5) * 0.6;
      s.ring(0.06, 0.008, [bx, 0.32, feetZ], bagMat, Math.PI);
      s.cylinder(0.03, 0.03, 0.3, [bx + 0.08, 0.36, feetZ - 0.02], s.material('#d9a85a', { roughness: 0.9 }), 10).rotation.z = 0.25;
    } else if (a.floor === 'flowers') {
      const paper = s.material(pick(random, ['#e8dcc0', '#d8c0d0', '#f4f0e6']), { roughness: 0.95 });
      const fx = (random() - 0.5) * 0.4, angle = 0.3 + random() * 0.6;
      const cone = s.cylinder(0.11, 0.025, 0.42, [fx, 0.06, feetZ], paper, 12);
      cone.rotation.set(Math.PI / 2, 0, angle);
      cone.rotation.x = Math.PI / 2 + 0.1;
      const headAt = new THREE.Vector3(fx + Math.sin(angle) * 0.2, 0.08, feetZ + Math.cos(angle) * 0.2 * 0);
      const petals: { at: [number, number, number]; size: number; color: string }[] = [];
      const colour = pick(random, ['#e84d6a', '#f4d35e', '#f29e4c', '#e6e6f0', '#9b5de5']);
      for (let i = 0; i < 9; i++) petals.push({ at: [headAt.x + (random() - 0.5) * 0.12, headAt.y + random() * 0.08, headAt.z + 0.14 + (random() - 0.5) * 0.1], size: 0.025 + random() * 0.015, color: i % 3 === 2 ? '#3a7a3a' : colour });
      s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.9 }), petals);
    } else if (a.floor === 'pizza') {
      const box = s.box([0.34, 0.04, 0.34], [(random() - 0.5) * 0.4, 0.02, feetZ + 0.05], s.material('#d9b78a', { roughness: 0.95 }));
      box.rotation.y = (random() - 0.5) * 0.8;
      s.box([0.2, 0.002, 0.08], [box.position.x, 0.041, box.position.z], s.material('#b8302a', { roughness: 0.8 })).rotation.y = box.rotation.y;
    }
    if (a.who === 'old') {
      // A walking stick hooked over the bench end.
      const stick = s.material('#3a2a20', { roughness: 0.6 });
      s.rod([0.62, 0.02, hipsZ + 0.3], [0.56, seatTop + 0.1, hipsZ - 0.1], 0.012, stick);
      s.ring(0.04, 0.012, [0.56, seatTop + 0.12, hipsZ - 0.1], stick, Math.PI).rotation.y = Math.PI / 2;
    }

    const pulse = mix(0.2, 1.4, mood.energy);
    return s.finish({
      update(dt, time) {
        for (const person of people) person.update(dt, time);
        screenMat.emissiveIntensity = mix(0.9, 2.0, 1 - mood.daylight) * (1 + Math.sin(time * 2.9 * pulse) * 0.07);
      },
    });
  },
});
