import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { circleHole, crossings, finishTexture, ribbon, screw, slab, spiral, tile } from './bits';

export default defineThing({
  questions: {
    rim: choice('What kind of balance wheel is it?', {
      screwed: 'A gold rim studded all round with tiny timing screws, the classic pocket-watch balance.',
      smooth: 'A plain polished rim with no screws at all, modern and calm.',
      split: 'An antique cut rim in two metals, steel inside brass, split near each arm and heavy with screws.',
      weighted: 'A smooth rim carrying four little star-shaped adjusting weights.',
    }),
    arms: choice('How many arms cross the wheel?', {
      two: 'A single straight bar across the middle.',
      three: 'Three arms, like a steering wheel.',
      four: 'Four arms in a cross.',
    }),
    spring: choice('What is the hairspring made of?', {
      blue: 'Heat-blued steel, a deep cornflower blue.',
      pale: 'A pale silvery modern alloy.',
      violet: 'Silicon, an iridescent violet.',
      rust: 'Old steel gone brown with rust.',
    }),
    state: choice('What is the balance doing right now?', {
      beating: 'Swinging back and forth, alive and even.',
      frozen: 'Stopped dead mid-swing, perfectly intact.',
      tangled: 'Stopped, with the hairspring pulled into a snarl of crossed and bunched coils.',
      magnetised: 'Stopped, the coils stuck together and bunched off to one side.',
      broken: 'The pivot has snapped: the wheel has dropped and lies tilted on its rim.',
    }),
    mount: choice('Where is it?', {
      cock: 'In place under its balance cock, on a round piece of the movement plate.',
      bare: 'Lifted out and laid alone on the bench, staff pointing up.',
      dish: 'Set aside in a small brass parts dish, waiting.',
    }),
    coils: score('How many turns does the hairspring have?', ['A few open coils', 'A dozen', 'A dense, fine spiral']),
    regulator: noul('If it sits under a cock, does the cock carry a long regulator pointer with plus and minus marks?'),
    cap: noul('Is there a red ruby cap jewel at the centre?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.22, 0.6, mood.wear);
    const gold = s.material(mix(0.4, 0.7, mood.warmth) > 0.55 ? '#e0ad3c' : '#d8b65a', { metalness: 0.65, roughness: dull });
    const steel = s.material('#c5cbd0', { metalness: 0.7, roughness: dull });
    const blue = s.material('#2f55c8', { metalness: 0.55, roughness: 0.28, emissive: '#10235f', emissiveIntensity: 0.5 });
    const ruby = s.material('#d0163a', { roughness: 0.12, emissive: '#7a0018', emissiveIntensity: mix(0.4, 0.9, mood.cheer) });
    const springMaterial = s.material({ blue: '#2c5fe0', pale: '#dfe4ea', violet: '#8f5be0', rust: '#8a4a26' }[a.spring], {
      metalness: a.spring === 'rust' ? 0.2 : 0.5, roughness: a.spring === 'rust' ? 0.85 : 0.3,
      emissive: { blue: '#12338f', pale: '#44484c', violet: '#3a1a80', rust: '#2a1206' }[a.spring], emissiveIntensity: 0.55,
    });

    const R = 5, baseY = a.mount === 'cock' ? 0.9 : a.mount === 'dish' ? 0.5 : 0;
    const wheelY = baseY + (a.mount === 'cock' ? 1.3 : 0.5);

    // What it rests on.
    if (a.mount === 'cock') {
      const plateTexture = tile(finishTexture('perlage', '#c4c6c0', random, mood.wear), 3.2, 0);
      const plate = new THREE.Shape();
      plate.absarc(0, 0, 8.6, 0, Math.PI * 2, false);
      plate.holes.push(circleHole(0.35, 0, 0));
      slab(s, plate, 0.9, s.material('#ffffff', { map: plateTexture, metalness: 0.45, roughness: dull + 0.1 }), 0, 0.08);
    } else if (a.mount === 'dish') {
      s.lathe([[0, 0], [7.4, 0], [8.6, 1.5], [8.9, 1.5], [7.6, -0.25], [0, -0.25]].map(([x, y]) => [x, y + 0.25] as const), s.material('#b98f3e', { metalness: 0.55, roughness: 0.45, side: THREE.DoubleSide }));
    }

    // The wheel: rim, arms, staff, roller, timing screws.
    const wheel = new THREE.Group();
    s.root.add(wheel);
    const into = <T extends THREE.Object3D>(part: T) => { wheel.attach(part); return part; };
    const armCount = { two: 2, three: 3, four: 4 }[a.arms];
    const rimShape = new THREE.Shape();
    rimShape.absarc(0, 0, R, 0, Math.PI * 2, false);
    crossings(rimShape, 0.75, R - 0.75, armCount, 0.2);
    const rimMaterial = a.rim === 'split' ? s.material('#c9a24a', { metalness: 0.6, roughness: dull }) : gold;
    into(slab(s, rimShape, 0.62, rimMaterial, 0, 0.07));
    if (a.rim === 'split') {
      // The steel inner lamination and the cuts beside each arm.
      const inner = new THREE.Mesh(new THREE.TorusGeometry(R - 0.72, 0.12, 6, 64), steel);
      inner.rotation.x = Math.PI / 2;
      inner.position.y = 0.4;
      wheel.add(inner);
      for (let i = 0; i < armCount; i++) {
        const angle = (i / armCount) * Math.PI * 2 + 0.2;
        const cut = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.16), new THREE.MeshStandardMaterial({ color: '#15130f' }));
        cut.position.set(Math.cos(angle) * (R - 0.37), 0.33, -Math.sin(angle) * (R - 0.37));
        cut.rotation.y = angle;
        wheel.add(cut);
      }
    }
    if (a.rim === 'screwed' || a.rim === 'split') {
      const count = a.rim === 'split' ? 18 : 14 + Math.floor(random() * 5) * 2;
      const heads: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < count; i++) {
        const angle = ((i + 0.5) / count) * Math.PI * 2;
        heads.push({ at: [Math.cos(angle) * (R + 0.22), 0.31, Math.sin(angle) * (R + 0.22)], size: 1 });
      }
      into(s.scatter(new THREE.SphereGeometry(0.3, 10, 8), gold, heads));
    } else if (a.rim === 'weighted') {
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        into(s.cylinder(0.3, 0.3, 0.22, [Math.cos(angle) * (R - 0.38), 0.73, Math.sin(angle) * (R - 0.38)], blue, 6));
      }
    }
    into(s.cylinder(0.12, 0.12, 2.3, [0, 0.45, 0], steel, 10));
    into(s.cylinder(0.55, 0.55, 0.3, [0, 0.72, 0], gold, 16));
    into(s.cylinder(0.7, 0.7, 0.16, [0, -0.25, 0], steel, 16));
    into(s.cylinder(0.11, 0.11, 0.5, [0.5, -0.45, 0], ruby, 8));

    // The hairspring, pinned to a collet at the centre and a stud at its outer end.
    const turns = Math.round(mix(5, 13, a.coils));
    const outer = R - 1.35;
    const springY = 0.9;
    const snarl = a.state === 'tangled' ? 0.42 : 0;
    const points = spiral(turns, 0.6, outer, springY, random, snarl, random() * 6);
    if (a.state === 'magnetised')
      for (let i = 0; i < points.length; i++) {
        const [x, y, z] = points[i];
        const radius = Math.hypot(x, z) || 1;
        // Squeeze every coil toward one side so they touch there and gape opposite.
        const pull = 0.82 * (outer - radius);
        points[i] = [x + pull * 0.85, y, z + pull * 0.2];
      }
    const springGroup = new THREE.Group();
    s.root.add(springGroup);
    const coil = ribbon(s, points, 0.09, 0.4, springMaterial);
    springGroup.attach(coil);
    if (a.state === 'tangled') {
      // A loop thrown clear over the rim.
      const start = random() * 6;
      const loop: [number, number, number][] = [];
      for (let i = 0; i <= 10; i++) {
        const angle = start + i * 0.32, radius = outer + Math.sin((i / 10) * Math.PI) * 3.2;
        loop.push([Math.cos(angle) * radius, springY + Math.sin((i / 10) * Math.PI) * 1.4, Math.sin(angle) * radius]);
      }
      springGroup.attach(ribbon(s, loop, 0.09, 0.4, springMaterial));
    }
    const end = points[points.length - 1];
    const stud = s.cylinder(0.2, 0.2, 0.8, [end[0], springY + 0.3, end[2]], steel, 8);
    springGroup.attach(stud);
    springGroup.position.y = wheelY;
    wheel.position.y = wheelY;

    // The cock that holds the top pivot.
    if (a.mount === 'cock') {
      const cockTexture = tile(finishTexture('stripes', '#dab65e', random, mood.wear), 6, 0.6);
      const cockMaterial = s.material('#ffffff', { map: cockTexture, metalness: 0.5, roughness: dull });
      const cock = new THREE.Shape();
      cock.moveTo(-1.3, 0.2);
      cock.quadraticCurveTo(-1.5, 1.5, 0, 1.5);
      cock.lineTo(5.6, 1.1);
      cock.quadraticCurveTo(6.4, 3.4, 8.3, 2.6);
      cock.lineTo(8.5, -2.6);
      cock.quadraticCurveTo(6.4, -3.4, 5.6, -1.1);
      cock.lineTo(0, -1.5);
      cock.quadraticCurveTo(-1.5, -1.5, -1.3, 0.2);
      const top = wheelY + 2.1;
      slab(s, cock, 0.7, cockMaterial, top, 0.08);
      // Its foot stands on the plate outside the rim.
      const foot = new THREE.Shape();
      foot.moveTo(5.9, 1.4);
      foot.quadraticCurveTo(6.5, 3.3, 8.3, 2.6);
      foot.lineTo(8.5, -2.6);
      foot.quadraticCurveTo(6.5, -3.3, 5.9, -1.4);
      foot.closePath();
      slab(s, foot, top - baseY, cockMaterial, baseY, 0.05);
      screw(s, [7.3, top + 0.7, 0], 0.75, blue, random() * 3);
      s.cylinder(0.85, 0.85, 0.16, [0, top + 0.72, 0], gold, 20);
      if (a.cap) s.ball([0.5, 0.26, 0.5], [0, top + 0.8, 0], ruby, 14);
      else s.cylinder(0.4, 0.4, 0.1, [0, top + 0.82, 0], steel, 14);
      for (const side of [-1, 1]) screw(s, [0, top + 0.7, side * 1.05], 0.2, blue, random() * 3);
      if (a.regulator) {
        const lean = (random() - 0.5) * 0.7;
        const pointer = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.14, 0.34), steel);
        bar.position.x = 1.9;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 4), steel);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = 4.5;
        const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.3), steel);
        tail.position.x = -1.3;
        pointer.add(bar, tip, tail);
        pointer.position.set(0, top + 0.86, 0);
        pointer.rotation.y = lean;
        pointer.traverse((node) => { node.castShadow = true; });
        s.root.add(pointer);
        for (let i = -3; i <= 3; i++) {
          const angle = i * 0.13;
          s.box([i === 0 ? 0.5 : 0.3, 0.03, 0.06], [Math.cos(angle) * 5.2, top + 0.72, -Math.sin(angle) * 5.2], s.material('#2a2418')).rotation.y = angle;
        }
      }
    } else if (a.cap) into(s.ball([0.3, 0.2, 0.3], [0, 1.62, 0], ruby, 12));

    if (a.state === 'broken') {
      // One pivot gone: the wheel hangs off true and the staff stub lies beside it.
      wheel.rotation.set(0.22 + random() * 0.08, random() * 6, 0.1);
      wheel.position.y = wheelY - (a.mount === 'cock' ? 0.55 : 0.05);
      wheel.position.x = 0.5;
      springGroup.rotation.z = 0.08;
      const stub = s.cylinder(0.1, 0.03, 0.7, [-6.2 + random(), baseY + 0.12, 3 + random() * 2], steel, 8);
      stub.rotation.z = Math.PI / 2;
      stub.rotation.y = random() * 3;
    } else if (a.mount !== 'cock') {
      // Out of the watch it cannot stand on its pivot: it leans on the rim.
      wheel.rotation.z = 0.1;
      springGroup.rotation.z = 0.1;
    }

    const rest = (random() - 0.5) * 2.2;
    wheel.rotation.y += rest;
    const alive = a.state === 'beating';
    const swing = mix(0.5, 2.3, mood.energy), rate = mix(2.5, 9, mood.energy);
    const baseTurn = wheel.rotation.y;
    s.root.scale.setScalar(0.05);
    return s.finish({
      update: alive
        ? (_dt, time) => {
            const turn = Math.sin(time * rate) * swing;
            wheel.rotation.y = baseTurn + turn;
            // The spring winds and unwinds with the wheel, held at its stud.
            springGroup.rotation.y = turn * 0.25;
            const breath = 1 - Math.sin(time * rate) * 0.07;
            coil.scale.set(breath, coil.scale.y, breath);
          }
        : undefined,
    });
  },
});
