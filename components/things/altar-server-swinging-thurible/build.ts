import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, hem, pick, pickSkin, rig } from './pose';

export default defineThing({
  questions: {
    age: score('How old is the server?', ['A small child of seven, swamped by the cassock', 'A child of ten', 'A teenager', 'A tall sixteen-year-old']),
    swing: choice('What is the thurible doing?', {
      swinging: 'Mid-swing, out at arm\'s length, the chains taut.',
      still: 'Hanging still at the side, the server waiting for the signal.',
      raised: 'Held up at the chest with both hands, lid lifted to look inside.',
    }),
    cassock: choice('What colour is the cassock?', {
      black: 'Black, the ordinary parish cassock.',
      red: 'Scarlet, for a feast day or a cathedral.',
      white: 'Plain white alb with a rope cincture, no surplice.',
      purple: 'Purple, for Lent or Advent.',
    }),
    lit: noul('Is the incense lit, with smoke rising from the thurible?'),
    gaze: choice('Where is the server looking?', {
      censer: 'Watching the thurible, concentrating on the swing.',
      ahead: 'Straight ahead, solemn and still.',
      down: 'Down at the floor, bored or shy.',
      up: 'Up at the vault, mouth open, distracted.',
    }),
    trainers: noul('Do white trainers show under the hem of the cassock?'),
    hair: choice('What is the server\'s hair like?', {
      short: 'Short dark hair, combed for the occasion.',
      long: 'Long hair, tied back.',
      cropped: 'Cropped close, almost shaved.',
      fair: 'Fair, short and sticking up.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = mix(1.15, 1.72, a.age);
    const skin = pickSkin(random);
    const cassockColour = { black: '#1e1e22', red: '#9c1f24', white: '#efeae0', purple: '#4a2a6a' }[a.cassock];
    const alb = a.cassock === 'white';
    const cloth = s.material(cassockColour, { roughness: 0.85, side: THREE.DoubleSide });
    const linen = s.material('#f3f0e8', { roughness: 0.9, side: THREE.DoubleSide });
    const hairColour = { short: '#2a1e18', long: '#4a3222', cropped: '#1a1512', fair: '#d8b86a' }[a.hair];
    const raised = a.swing === 'raised';

    const person = figure(s, {
      height: H, build: a.age < 0.3 ? 'slight' : 'average', style: 'doll', skin,
      hair: a.hair === 'cropped' ? 'none' : a.hair === 'long' ? 'bun' : 'short', hairColor: hairColour,
      top: alb ? '#efeae0' : '#f3f0e8', bottom: cassockColour, shoes: a.trainers ? '#f2f2ee' : '#1c1a18', sleeves: 'long',
      pose: 'standing', gaze: 'ahead',
    });
    s.root.add(person.root);
    const pose = rig(person);
    // The censer hand hangs forward at arm's length; the boat hand holds its little dish to the chest.
    if (raised) {
      pose.arm('right', { forward: 60, out: 6, bend: 80, across: 25 });
      pose.arm('left', { forward: 60, out: 6, bend: 80, across: 25 });
    } else {
      pose.arm('right', { forward: a.swing === 'swinging' ? 78 : 12, out: a.swing === 'swinging' ? 18 : 10, bend: 6, across: 0 });
      pose.arm('left', { forward: 40, out: 4, bend: 105, across: 35 });
    }
    const look = { censer: [26, -24], ahead: [0, 0], down: [34, 0], up: [-28, 6] }[a.gaze] as [number, number];
    if (raised && a.gaze === 'censer') pose.look(38, 0); else pose.look(look[0], look[1]);
    pose.leg('left', { out: 4 });
    pose.leg('right', { out: 4 });
    person.settle();

    // Cassock to the ankles, surplice to the knee with wide sleeves; an alb is one white fall with a cord.
    const hip = at(s, person.pelvis);
    const shoulder = at(s, person.joints.shoulders.left);
    const neck = at(s, person.joints.neck);
    const hemTop = new THREE.Vector3(hip.x, hip.y + 0.02 * H, hip.z);
    const skirt = hem(s, cloth, hemTop, 0.075 * H, 0.15 * H, hip.y - 0.04 * H, 0.75);
    void skirt;
    if (!alb) {
      const over = hem(s, linen, new THREE.Vector3(hip.x, shoulder.y - 0.02 * H, hip.z), 0.1 * H, 0.2 * H, shoulder.y - hip.y + 0.14 * H, 0.75);
      void over;
      // Wide surplice sleeves hang from the upper arms.
      for (const side of ['left', 'right'] as const) {
        const elbow = at(s, person.joints.elbows[side]);
        const upper = at(s, person.joints.shoulders[side]);
        const mid = upper.clone().lerp(elbow, 0.55);
        const sleeve = s.mesh(new THREE.CylinderGeometry(0.03 * H, 0.075 * H, upper.distanceTo(elbow) * 1.05, 14, 1, true), linen, mid.toArray() as [number, number, number]);
        sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upper.clone().sub(elbow).normalize());
      }
    } else {
      const cord = s.ring(0.085 * H, 0.008 * H, [hip.x, hip.y + 0.06 * H, hip.z], s.material('#e9dcae', { roughness: 0.9 }));
      cord.rotation.x = Math.PI / 2;
      cord.scale.z = 0.8;
      for (const dx of [-0.02, 0.01]) s.rod([hip.x + dx * H, hip.y + 0.05 * H, hip.z + 0.08 * H], [hip.x + dx * H + 0.01 * H, hip.y - 0.22 * H, hip.z + 0.1 * H], 0.006 * H, s.material('#e9dcae', { roughness: 0.9 }));
    }
    // A small collar of the cassock colour above the surplice.
    s.ring(0.045 * H, 0.012 * H, [neck.x, neck.y + 0.01 * H, neck.z], cloth).rotation.x = Math.PI / 2;

    // The thurible: a brass bowl with a pierced dome lid on three chains from a ring in the hand.
    const brass = s.material('#c99a3a', { metalness: 0.8, roughness: 0.3 });
    const darkBrass = s.material('#7a5a22', { metalness: 0.7, roughness: 0.45 });
    const hand = at(s, person.hands.right);
    const chainLength = raised ? 0.22 * H : 0.42 * H;
    const pivot = new THREE.Group();
    pivot.position.copy(hand);
    s.root.add(pivot);
    const censer = new THREE.Group();
    censer.position.y = -chainLength;
    pivot.add(censer);
    const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.03, 0], [0.06, 0.03], [0.075, 0.08], [0.07, 0.1], [0.078, 0.105], [0, 0.105]].map(([x, y]) => new THREE.Vector2(x * H / 1.5, y * H / 1.5)), 20), brass);
    const lid = new THREE.Mesh(new THREE.LatheGeometry([[0.078, 0], [0.072, 0.03], [0.05, 0.07], [0.022, 0.095], [0.01, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x * H / 1.5, y * H / 1.5)), 20), darkBrass);
    lid.position.y = raised ? 0.16 * H / 1.5 : 0.105 * H / 1.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024 * H / 1.5, 0.005 * H / 1.5, 6, 16), brass);
    ring.position.y = 0;
    bowl.castShadow = lid.castShadow = true;
    censer.add(bowl, lid);
    pivot.add(ring);
    const chainMaterial = s.material('#b08a3a', { metalness: 0.7, roughness: 0.5 });
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + 0.5;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.0035 * H, 0.0035 * H, chainLength, 5), chainMaterial);
      chain.position.set(Math.cos(angle) * 0.03 * H / 1.5, -chainLength / 2, Math.sin(angle) * 0.03 * H / 1.5);
      chain.rotation.z = Math.cos(angle) * 0.07;
      chain.rotation.x = -Math.sin(angle) * 0.07;
      chain.castShadow = true;
      pivot.add(chain);
    }
    // Pierced lid: a ring of dark holes.
    const holes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.006 * H / 1.5, 5, 4), s.material('#2a1a08', { roughness: 1 }), 16);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) {
      const row = i < 8 ? 0 : 1;
      const angle = ((i % 8) / 8) * Math.PI * 2 + row * 0.4;
      const r = (row ? 0.048 : 0.066) * H / 1.5;
      m.makeTranslation(Math.cos(angle) * r, lid.position.y + (row ? 0.07 : 0.035) * H / 1.5, Math.sin(angle) * r);
      holes.setMatrixAt(i, m);
    }
    holes.instanceMatrix.needsUpdate = true;
    censer.add(holes);
    if (a.lit) {
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.04 * H / 1.5, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff7a1a', emissive: '#ff5a10', emissiveIntensity: mix(1.2, 2.6, mood.warmth) }));
      ember.position.y = 0.075 * H / 1.5;
      censer.add(ember);
    }
    // The incense boat: a small brass dish with a hinged lid, with a spoon, in the other hand.
    const boatHand = at(s, person.hands.left);
    const boat = s.lathe([[0, 0], [0.03, 0], [0.05, 0.02], [0.045, 0.035], [0, 0.035]].map(([x, y]) => [x * H / 1.5, y * H / 1.5] as const), brass, [boatHand.x + 0.01 * H, boatHand.y - 0.01 * H, boatHand.z + 0.03 * H]);
    boat.scale.x = 1.6;
    s.rod([boatHand.x - 0.02 * H, boatHand.y + 0.015 * H, boatHand.z + 0.02 * H], [boatHand.x + 0.06 * H, boatHand.y + 0.055 * H, boatHand.z + 0.05 * H], 0.004 * H, darkBrass);
    if (!raised) s.ball([0.012 * H, 0.009 * H, 0.014 * H], [boatHand.x - 0.008 * H, boatHand.y + 0.025 * H, boatHand.z + 0.025 * H], s.material('#d9c58a', { roughness: 0.8 }), 8);

    // Smoke: three translucent puffs that climb and fade, kept upright above wherever the censer swings.
    const puffs: { mesh: THREE.Mesh; phase: number; drift: number }[] = [];
    if (a.lit) {
      for (let i = 0; i < 3; i++) {
        const material = new THREE.MeshStandardMaterial({ color: '#8a8a90', transparent: true, opacity: 0.6, depthWrite: false, roughness: 1 });
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), material);
        puff.castShadow = false;
        s.root.add(puff);
        puffs.push({ mesh: puff, phase: i / 3, drift: (random() - 0.5) * 0.08 });
      }
    }
    const swing = a.swing === 'swinging' ? mix(0.3, 0.75, mood.energy) : a.swing === 'still' ? mix(0.01, 0.06, mood.energy) : 0.03;
    const rate = mix(1.4, 3.2, mood.energy);
    const phase = random() * Math.PI * 2;
    const censerWorld = new THREE.Vector3();
    const place = (time: number) => {
      pivot.rotation.x = Math.sin(time * rate + phase) * swing + (a.swing === 'swinging' ? 0.55 : 0);
      pivot.rotation.z = Math.sin(time * rate * 0.5 + phase) * swing * 0.15;
      if (!puffs.length) return;
      s.root.updateMatrixWorld(true);
      censer.getWorldPosition(censerWorld);
      s.root.worldToLocal(censerWorld);
      for (const puff of puffs) {
        const t = ((time * 0.22 + puff.phase) % 1 + 1) % 1;
        const size = (0.045 + t * 0.09) * H;
        puff.mesh.scale.set(size, size * 0.8, size);
        puff.mesh.position.set(censerWorld.x + Math.sin(time * 0.9 + puff.phase * 6) * 0.02 * H + puff.drift * t * H, censerWorld.y + 0.08 * H + t * 0.42 * H, censerWorld.z + Math.cos(time * 0.7 + puff.phase * 6) * 0.02 * H);
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - t * 0.75) * (0.6 + mood.density * 0.4);
      }
    };
    place(0);
    return s.finish({ update: (dt, time) => { person.update(dt, time); place(time); } });
  },
});
