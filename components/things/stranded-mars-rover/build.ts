import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    design: choice('What kind of rover is it?', {
      solar: 'A low golf-cart rover with a flat winged solar deck, earnest and insect-like.',
      nuclear: 'A car-sized boxy laboratory on tall legs with a finned power unit at the back.',
      pulp: 'A retro tin-toy rover with a glass bubble top and a striped body.',
      cart: 'A tiny skateboard-sized microrover, one flat panel on six little wheels.',
    }),
    mast: choice('What is the camera mast doing?', {
      ahead: 'Upright, looking straight ahead at where it meant to go.',
      wheel: 'Bent down, staring at its own stuck wheel.',
      sky: 'Tilted up at the sky, looking for home.',
      back: 'Turned to look back along its own tracks.',
      drooped: 'Folded forward and slack, powered down.',
    }),
    dust: score('How deep is the dust on it?', ['Freshly cleaned by the wind', 'A thin tan film', 'Panels half dulled', 'Drifts piled on the deck and against the wheels']),
    stuck: score('How badly is it stuck?', ['One wheel just starting to sink', 'A wheel buried to the hub', 'Tilted over with a whole side in the sand']),
    tracks: choice('What do its last tracks look like?', {
      straight: 'Two straight purposeful lines leading up to it.',
      wander: 'A long lazy S-curve from somewhere far off.',
      struggle: 'A tight churned zigzag where it fought to get out.',
      circle: 'A full ring where it turned on the spot before giving up.',
      none: 'No tracks at all: the wind has erased them.',
    }),
    arm: choice('What is its instrument arm doing?', {
      stowed: 'Folded neatly against the front.',
      rock: 'Stretched out to touch one last rock.',
      raised: 'Lifted high, almost a wave.',
      sand: 'Resting its tip in the sand where it scratched a small mark.',
    }),
    awake: noul('Is it still awake, with a light in its camera eyes?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const all = new THREE.Group();
    const rover = new THREE.Group();
    all.add(rover);
    s.root.add(all);
    const add = <T extends THREE.Object3D>(node: T, to: THREE.Object3D = rover) => { to.add(node); return node; };

    const dustTone = new THREE.Color('#b96a3f').lerp(new THREE.Color('#d6a064'), mood.warmth * 0.5);
    const dusted = (hex: string, amount = 1) => new THREE.Color(hex).lerp(dustTone, Math.min(a.dust * 0.55 * amount + mood.wear * 0.1, 0.68));
    const sand = s.material(dustTone, { roughness: 1 });
    const darkSand = s.material(dustTone.clone().multiplyScalar(0.62), { roughness: 1 });
    const pulp = a.design === 'pulp';
    const bodyPaint = s.material(dusted(pulp ? '#c8402f' : a.design === 'nuclear' ? '#e8e6de' : '#d9c58a'), { roughness: 0.5, metalness: pulp ? 0.5 : 0.25 });
    const metal = s.material(dusted('#b8bcc0', 0.6), { metalness: 0.7, roughness: 0.35 });
    const dark = s.material(dusted('#2b2c30', 0.5), { roughness: 0.7 });
    const cell = s.material(dusted('#1f3a78', 1.15), { metalness: 0.5, roughness: 0.3 });
    const eyeOn = a.awake;
    const eyeTone = mood.cheer > 0.5 ? '#8fe9ff' : '#ffb054';
    const lens = s.material(eyeOn ? eyeTone : '#14181c', { emissive: eyeOn ? eyeTone : '#000000', emissiveIntensity: eyeOn ? 1.6 : 0, roughness: 0.15 });

    const scale = { solar: 1, nuclear: 1.12, pulp: 1, cart: 0.42 }[a.design];
    const tall = a.design === 'nuclear' ? 1.05 : a.design === 'cart' ? 0.5 : 0.78;
    const half = a.design === 'nuclear' ? 1.05 : 0.95;
    const wheelR = a.design === 'cart' ? 0.2 : a.design === 'nuclear' ? 0.3 : 0.26;
    const wheelZ = [1.05, 0.05, -0.95];

    // Wheels with cleats, hung from rocker-bogie arms.
    const wheelGeometry = new THREE.CylinderGeometry(wheelR, wheelR, 0.3, 18);
    wheelGeometry.rotateZ(Math.PI / 2);
    const cleatGeometry = new THREE.BoxGeometry(0.32, 0.035, 0.05);
    for (const side of [-1, 1]) {
      for (const z of wheelZ) {
        const wheel = add(new THREE.Group());
        wheel.position.set(side * half, wheelR, z);
        const tyre = add(new THREE.Mesh(wheelGeometry, metal), wheel);
        tyre.castShadow = true;
        add(new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.45, wheelR * 0.45, 0.32, 10).rotateZ(Math.PI / 2), dark), wheel);
        const spin = random() * 6;
        for (let i = 0; i < 10; i++) {
          if (random() < mood.wear * 0.3) continue;
          const cleat = add(new THREE.Mesh(cleatGeometry, dark), wheel);
          const angle = spin + (i / 10) * Math.PI * 2;
          cleat.position.set(0, Math.sin(angle) * wheelR, Math.cos(angle) * wheelR);
          cleat.rotation.x = -angle;
        }
        add(s.rod([side * (half - 0.2), wheelR, z], [side * (half - 0.2), wheelR + 0.22, z], 0.035, metal));
      }
      const pivot: [number, number, number] = [side * (half - 0.2), tall - 0.08, 0.1];
      add(s.rod(pivot, [side * (half - 0.2), wheelR + 0.2, wheelZ[0]], 0.04, metal));
      add(s.rod(pivot, [side * (half - 0.2), wheelR + 0.32, -0.45], 0.04, metal));
      add(s.rod([side * (half - 0.2), wheelR + 0.32, -0.45], [side * (half - 0.2), wheelR + 0.2, wheelZ[1]], 0.035, metal));
      add(s.rod([side * (half - 0.2), wheelR + 0.32, -0.45], [side * (half - 0.2), wheelR + 0.2, wheelZ[2]], 0.035, metal));
      add(s.rod(pivot, [side * 0.4, tall, 0.1], 0.045, metal));
    }

    // Chassis and power.
    let deckY = tall + 0.2;
    let mastAt: [number, number, number] = [0.42, deckY, 0.62];
    if (a.design === 'solar') {
      add(s.box([1.15, 0.36, 1.5], [0, tall, 0], bodyPaint));
      const deck = new THREE.Shape();
      const outline: [number, number][] = [[-0.55, 1.0], [0.55, 1.0], [0.75, 0.45], [1.35, 0.25], [1.35, -0.45], [0.7, -0.65], [0.45, -1.2], [-0.45, -1.2], [-0.7, -0.65], [-1.35, -0.45], [-1.35, 0.25], [-0.75, 0.45]];
      outline.forEach(([x, y], i) => (i ? deck.lineTo(x, y) : deck.moveTo(x, y)));
      const plate = add(s.mesh(new THREE.ExtrudeGeometry(deck, { depth: 0.05, bevelEnabled: false }), cell));
      plate.rotation.x = -Math.PI / 2;
      plate.position.y = deckY;
      for (let i = -3; i <= 3; i++) add(s.box([2.7 - Math.abs(i) * 0.36, 0.012, 0.018], [0, deckY + 0.056, i * 0.3 - 0.1], metal));
      for (const x of [-0.72, 0, 0.72]) add(s.box([0.018, 0.012, 1.9], [x, deckY + 0.056, -0.1], metal));
      deckY += 0.06;
    } else if (a.design === 'nuclear') {
      add(s.box([1.5, 0.55, 2.0], [0, tall + 0.1, 0], bodyPaint));
      add(s.box([1.52, 0.06, 2.02], [0, tall + 0.4, 0], dark));
      const rtg = add(s.cylinder(0.2, 0.2, 0.95, [0, tall + 0.45, -1.3], dark, 12));
      rtg.rotation.x = -0.9;
      for (let i = 0; i < 8; i++) {
        const fin = add(s.box([0.62, 0.7, 0.025], [0, tall + 0.45, -1.3], s.material(dusted('#e9e7e0'), { roughness: 0.5 })));
        fin.rotation.set(-0.9, 0, 0);
        fin.rotateY((i / 8) * Math.PI);
      }
      deckY = tall + 0.43;
      mastAt = [0.5, deckY, 0.8];
    } else if (a.design === 'pulp') {
      const hull = add(s.mesh(new THREE.CapsuleGeometry(0.55, 1.1, 8, 18), bodyPaint, [0, tall + 0.05, 0]));
      hull.rotation.x = Math.PI / 2;
      hull.scale.set(1.15, 1, 0.75);
      for (const z of [-0.5, 0, 0.5]) add(s.ring(0.56, 0.035, [0, tall + 0.05, z], s.material(dusted('#f0e6c8')))).scale.set(1.15, 0.76, 1);
      add(s.mesh(new THREE.SphereGeometry(0.42, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#d5f2ee', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), [0, tall + 0.42, -0.25]));
      add(s.ring(0.42, 0.03, [0, tall + 0.44, -0.25], metal)).rotation.x = Math.PI / 2;
      add(s.ball([0.14, 0.18, 0.14], [0, tall + 0.6, -0.25], s.material('#e9d27a', { emissive: '#e9b040', emissiveIntensity: eyeOn ? 0.9 : 0 }), 10));
      for (const side of [-1, 1]) add(s.rod([side * 0.3, tall + 0.4, -0.9], [side * 0.55, tall + 1.0, -1.25], 0.02, metal));
      for (const side of [-1, 1]) add(s.ball([0.06, 0.06, 0.06], [side * 0.55, tall + 1.0, -1.25], s.material('#e23b2e'), 8));
      deckY = tall + 0.44;
      mastAt = [0, deckY - 0.05, 0.55];
    } else {
      add(s.box([1.5, 0.22, 1.9], [0, tall, 0], bodyPaint));
      add(s.box([1.75, 0.04, 2.1], [0, tall + 0.14, 0], cell));
      for (let i = -3; i <= 3; i++) add(s.box([1.75, 0.012, 0.02], [0, tall + 0.165, i * 0.3], metal));
      deckY = tall + 0.16;
      mastAt = [0.5, deckY, 0.85];
    }

    // Dust drifts sitting on the deck.
    const drifts = Math.round(Math.max(a.dust - 0.45, 0) * 9);
    for (let i = 0; i < drifts; i++) {
      const pile = add(s.ball([0.14 + random() * 0.2, 0.03 + random() * 0.04, 0.12 + random() * 0.18], [(random() - 0.5) * 1.6, deckY, (random() - 0.5) * 1.5 - 0.1], sand, 10));
      pile.rotation.y = random() * 3;
    }

    // Camera mast and head.
    const mastHeight = a.design === 'cart' ? 0.55 : a.design === 'nuclear' ? 0.9 : 1.0;
    const mast = add(new THREE.Group());
    mast.position.set(...mastAt);
    const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, mastHeight, 10), metal), mast);
    pole.position.y = mastHeight / 2;
    pole.castShadow = true;
    const head = add(new THREE.Group(), mast);
    head.position.y = mastHeight;
    const skull = add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.2), bodyPaint), head);
    skull.position.y = 0.1;
    skull.castShadow = true;
    for (const [x, r] of [[-0.12, 0.085], [0.13, 0.065]] as const) {
      const barrel = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 14).rotateX(Math.PI / 2), dark), head);
      barrel.position.set(x, 0.1, 0.13);
      const glass = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.13, 14).rotateX(Math.PI / 2), lens), head);
      glass.position.set(x, 0.1, 0.135);
    }
    const pose = { ahead: [0, 0, 0], wheel: [0.75, -0.75, 0], sky: [-0.8, 0.3, 0], back: [0.1, 2.75, 0], drooped: [0.5, 0.2, 1.25] }[a.mast];
    head.rotation.set(pose[0], pose[1], 0, 'YXZ');
    mast.rotation.x = pose[2] + (a.mast === 'wheel' ? 0.15 : 0);
    if (a.mast === 'drooped') mast.rotation.z = -0.25;

    // Antennas.
    if (a.design !== 'pulp') {
      const dish = add(s.cylinder(0.3, 0.3, 0.025, [-0.45, deckY + 0.45, -0.45], s.material(dusted('#e8e4d8')), 18));
      dish.rotation.set(0.9 + mood.wear * 0.5, 0.4, 0.2);
      add(s.rod([-0.45, deckY, -0.45], [-0.45, deckY + 0.42, -0.45], 0.025, metal));
      const lean = mood.wear * 0.35;
      add(s.rod([-0.5, deckY, 0.55], [-0.5 - lean, deckY + 0.7, 0.55], 0.018, metal));
    }

    // Instrument arm from the front.
    const shoulder: [number, number, number] = [-0.25, tall - 0.05, a.design === 'pulp' ? 0.95 : a.design === 'nuclear' ? 1.0 : 0.76];
    const reach = { stowed: [[-0.05, tall + 0.12, shoulder[2] + 0.2], [0.4, tall - 0.05, shoulder[2] + 0.22]], rock: [[-0.35, tall + 0.35, shoulder[2] + 0.55], [-0.4, 0.34, shoulder[2] + 1.0]], raised: [[-0.4, tall + 0.6, shoulder[2] + 0.3], [-0.75, tall + 1.25, shoulder[2] + 0.2]], sand: [[-0.3, tall + 0.3, shoulder[2] + 0.5], [-0.2, 0.1, shoulder[2] + 0.85]] }[a.arm] as [[number, number, number], [number, number, number]];
    add(s.rod(shoulder, reach[0], 0.035, metal));
    add(s.rod(reach[0], reach[1], 0.03, metal));
    add(s.ball([0.06, 0.06, 0.06], reach[0], dark, 8));
    add(s.cylinder(0.1, 0.1, 0.12, reach[1], dark, 10));

    // Sink the front right wheel: tilt the whole machine and heap sand round it.
    const tilt = mix(0.03, 0.2, a.stuck);
    rover.rotation.set(tilt * 0.55, (random() - 0.5) * 0.2, -tilt, 'YXZ');
    rover.position.y = -mix(0.02, 0.2, a.stuck) + half * Math.sin(tilt) * 0.55;
    const pit = new THREE.Vector3(half, 0, wheelZ[0]).applyEuler(new THREE.Euler(0, rover.rotation.y, 0));
    const heap = add(s.ball([0.45 + a.stuck * 0.15, 0.1 + a.stuck * 0.14, 0.55], [pit.x + 0.1, 0, pit.z + 0.15], sand, 14), all);
    heap.rotation.y = 0.3;
    add(s.ring(0.42, 0.11, [pit.x, 0.0, pit.z - 0.1], darkSand), all).rotation.x = Math.PI / 2;
    if (a.stuck > 0.6) add(s.ball([0.5, 0.2, 0.7], [pit.x, 0, wheelZ[1]], sand, 12), all);
    // Spray thrown back from the spinning wheel.
    add(s.scatter(new THREE.DodecahedronGeometry(1, 0), sand, Array.from({ length: 14 + Math.round(a.stuck * 14) }, () => ({
      at: [pit.x + (random() - 0.3) * 0.9, 0.02, pit.z - 0.5 - random() * 1.6] as const, size: 0.03 + random() * 0.06,
    }))), all);
    if (a.dust > 0.7) for (const z of [wheelZ[1], wheelZ[2]]) add(s.ball([0.3, 0.16, 0.4], [-half - 0.1, 0, z], sand, 10), all);

    // The target rock, and the scratch in the sand.
    if (a.arm === 'rock') {
      const rock = add(s.mesh(new THREE.DodecahedronGeometry(0.3, 1), s.material('#5b4037', { roughness: 1, flatShading: true }), [-0.42, 0.14, shoulder[2] + 1.05]), all);
      rock.scale.set(1.2, 0.8, 1);
      rock.rotation.set(random(), random(), random());
    }
    if (a.arm === 'sand') {
      const mark = add(s.ring(0.2, 0.03, [-0.2, 0.012, shoulder[2] + 1.05], darkSand), all);
      mark.rotation.x = Math.PI / 2;
      add(s.box([0.05, 0.02, 0.3], [-0.2, 0.012, shoulder[2] + 1.05], darkSand), all);
    }

    // Last tracks, pressed into the ground behind it.
    if (a.tracks !== 'none') {
      const path = (t: number): [number, number] => {
        const d = t * 3.6;
        if (a.tracks === 'straight') return [0, -d];
        if (a.tracks === 'wander') return [Math.sin(t * 4.2) * 1.1 * t, -d];
        if (a.tracks === 'struggle') return [Math.sin(t * 11) * 0.4 * Math.min(1, t * 5), -d * 0.75];
        const angle = t * Math.PI * 2;
        return [1.45 - Math.cos(angle) * 1.45, 1.0 - Math.sin(angle) * 1.45];
      };
      const marks: THREE.Matrix4[] = [];
      const dummy = new THREE.Object3D();
      const steps = a.tracks === 'struggle' ? 110 : 90;
      for (let i = 2; i < steps; i++) {
        const t = i / steps;
        const [x, z] = path(t), [x2, z2] = path(t + 0.004);
        const heading = Math.atan2(x2 - x, z2 - z);
        const fade = a.tracks === 'circle' ? 1 : 1 - t * mix(0.2, 0.75, a.dust);
        if (random() > fade) continue;
        for (const side of [-1, 1]) {
          dummy.position.set(x + Math.cos(heading) * side * half, 0.006, z - 1.0 - Math.sin(heading) * side * half);
          dummy.rotation.set(0, heading, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          marks.push(dummy.matrix.clone());
        }
      }
      const tread = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.012, 0.05), darkSand, marks.length);
      marks.forEach((matrix, i) => tread.setMatrixAt(i, matrix));
      tread.receiveShadow = true;
      add(tread, all);
    }

    all.scale.setScalar(scale);
    const thing = s.finish({
      update: eyeOn || mood.energy > 0.05
        ? (_dt, time) => {
            if (a.mast !== 'drooped') head.rotation.y = pose[1] + Math.sin(time * mix(0.2, 1.4, mood.energy)) * mix(0.05, 0.5, mood.energy);
            if (eyeOn) lens.emissiveIntensity = 1.3 + Math.sin(time * 2.2) * 0.4;
          }
        : undefined,
    });
    // Keep the ground at y = 0: the sunk wheel belongs under it.
    s.root.position.y = 0;
    return thing;
  },
});
