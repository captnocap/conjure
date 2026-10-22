import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { circleHole, engraving, gearShape, slab } from './bits';

export default defineThing({
  questions: {
    crown: choice('What shape is the crown?', {
      flat: 'A plain round knurled button, the everyday wristwatch crown.',
      onion: 'A fat fluted onion, as on a pocket watch or an old pilot watch.',
      diver: 'A big deep screw-down crown with coarse grip and a threaded tube.',
      cabochon: 'A slim dress crown tipped with a domed blue stone.',
      bow: 'A pocket-watch crown with a ring bow through its top for a chain.',
    }),
    metal: choice('What is the crown made of?', {
      steel: 'Stainless steel.',
      gold: 'Yellow gold.',
      rose: 'Rose gold, pinkish and warm.',
      plated: 'Gold plate over brass, the plating thin.',
      black: 'Blackened steel.',
    }),
    state: choice('What has happened to it?', {
      crisp: 'Nothing yet: every flute sharp, never wound.',
      worn: 'The knurling is worn almost smooth by one thumb over decades.',
      bent: 'The stem is bent where the watch was dropped on its crown.',
      snapped: 'The stem has snapped; the broken end lies a little way off.',
      rusted: 'Water got in: the stem is brown with rust though the crown still shines.',
    }),
    knurl: score('How fine is the grip on the crown?', ['A few deep flutes', 'Ordinary knurling', 'Very fine milling']),
    length: score('How long is the stem?', ['Short and stubby', 'Ordinary', 'Very long and thin']),
    pinions: noul('Are the winding pinion and sliding clutch wheel still on the stem?'),
    mark: choice('What is on the end of the crown?', {
      plain: 'Nothing, polished plain.',
      star: 'A small five-pointed star.',
      cross: 'A cross.',
      rings: 'Concentric turned rings.',
      initial: 'A single engraved initial.',
    }),
    pose: choice('How has it been put down?', {
      lying: 'Lying on its side, crown resting on its edge and the stem tip touching the bench.',
      standing: 'Stood on its crown with the stem pointing straight up like a tiny mast.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.18, 0.6, mood.wear);
    const worn = a.state === 'worn' ? 1 : mood.wear * 0.5;
    const tint = new THREE.Color({ steel: '#cfd4d8', gold: '#e6b83e', rose: '#e0a07c', plated: '#e6b83e', black: '#33363b' }[a.metal]);
    // Thin plate rubs through to the brass underneath.
    if (a.metal === 'plated') tint.lerp(new THREE.Color('#a8853f'), worn * 0.8);
    const body = s.material(tint, { metalness: 0.65, roughness: a.state === 'worn' ? 0.16 : dull });
    const steel = s.material('#c9ced3', { metalness: 0.7, roughness: dull });
    const rust = s.material('#8a4b23', { metalness: 0.1, roughness: 0.95 });
    const stemMaterial = a.state === 'rusted' ? rust : steel;
    const pinionMaterial = a.state === 'rusted' ? s.material('#9a6a3c', { metalness: 0.3, roughness: 0.85 }) : steel;

    const lower = new THREE.Group(), upper = new THREE.Group(), assembly = new THREE.Group(), stage = new THREE.Group();
    assembly.add(lower, upper);
    stage.add(assembly);
    s.root.add(stage);
    const to = <T extends THREE.Object3D>(group: THREE.Group, part: T, y: number) => { part.position.set(0, y, 0); group.add(part); return part; };

    // The crown, built standing on its outer end.
    const flutes = Math.round(mix(10, 44, a.knurl));
    const depth = mix(0.42, 0.16, a.knurl) * mix(1, 0.12, worn);
    const fluted = (radius: number, height: number, y: number) => {
      const shape = gearShape(radius, radius - depth, flutes, 0, 0.26);
      return to(lower, slab(s, shape, height, body, 0, Math.min(0.12, height * 0.2)), y);
    };
    let crownR = 3.2, crownH = 2.6;
    if (a.crown === 'flat') {
      to(lower, s.cylinder(crownR - 0.5, crownR - 0.9, 0.35, [0, 0, 0], body, 32), 0.175);
      fluted(crownR, crownH - 0.35, 0.35);
    } else if (a.crown === 'onion' || a.crown === 'bow') {
      crownR = 3.4; crownH = 4.4;
      const radii = [1.9, 2.8, 3.3, 3.4, 3.1, 2.4, 1.6];
      radii.forEach((radius, index) => fluted(radius, crownH / radii.length + 0.05, (index * crownH) / radii.length));
    } else if (a.crown === 'diver') {
      crownR = 3.7; crownH = 3.8;
      to(lower, s.cylinder(crownR - 0.3, crownR - 0.8, 0.4, [0, 0, 0], body, 32), 0.2);
      fluted(crownR, crownH - 0.4, 0.4);
    } else {
      crownR = 2.5; crownH = 3.0;
      fluted(crownR, crownH - 0.6, 0.6);
      to(lower, s.cylinder(crownR - 0.25, crownR - 0.6, 0.6, [0, 0, 0], body, 28), 0.3);
      const gem = s.ball([1.5, 1.25, 1.5], [0, 0, 0], s.material('#1f4fd0', { roughness: 0.08, emissive: '#12308f', emissiveIntensity: mix(0.3, 0.7, mood.cheer) }), 20);
      to(lower, gem, 0.1);
    }
    if (a.crown === 'bow') {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.42, 8, 40), body);
      bow.castShadow = true;
      bow.position.set(0, -2.7, 0);
      lower.add(bow);
      to(lower, s.cylinder(0.9, 1.2, 0.9, [0, 0, 0], body, 16), -0.3);
    } else if (a.crown !== 'cabochon') {
      // The mark on the end, which only shows when the crown lies down.
      const paper = `#${tint.getHexString()}`, ink = a.metal === 'black' ? '#c8ccd0' : '#3a3020';
      const letter = 'ABDEHJKLMRSTW'[Math.floor(random() * 13)];
      const art = engraving(256, paper, ink, (ctx, size) => {
        const c = size / 2;
        ctx.lineWidth = 9;
        if (a.mark === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2, radius = i % 2 ? 34 : 86;
            ctx.lineTo(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
          }
          ctx.fill();
        } else if (a.mark === 'cross') {
          ctx.fillRect(c - 16, c - 80, 32, 160);
          ctx.fillRect(c - 80, c - 16, 160, 32);
        } else if (a.mark === 'rings') {
          for (const radius of [30, 60, 90]) { ctx.beginPath(); ctx.arc(c, c, radius, 0, Math.PI * 2); ctx.stroke(); }
        } else if (a.mark === 'initial') {
          ctx.font = 'bold 170px serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(letter, c, c + 8);
        }
      });
      const face = new THREE.Mesh(new THREE.CircleGeometry(crownR - (a.crown === 'diver' ? 0.85 : 0.95), 32), new THREE.MeshStandardMaterial({ map: art, metalness: 0.5, roughness: dull }));
      face.rotation.x = Math.PI / 2;
      face.position.y = -0.012;
      lower.add(face);
    }

    // The stem, stepped: tube, thread, hub with the setting-lever groove, square, pilot.
    let y = crownH;
    const section = (group: THREE.Group, radius: number, height: number, material: THREE.Material, sides = 16, base = y) => {
      const part = to(group, s.cylinder(radius, radius, height, [0, 0, 0], material, sides), base + height / 2);
      return part;
    };
    const tubeH = a.crown === 'diver' ? 1.8 : 0.7;
    section(lower, a.crown === 'diver' ? 2.0 : 1.15, tubeH, body, 24);
    if (a.crown === 'diver') for (let i = 0; i < 4; i++) to(lower, s.mesh(new THREE.TorusGeometry(2.0, 0.09, 5, 28), body), y + 0.3 + i * 0.38).rotation.x = Math.PI / 2;
    y += tubeH;
    section(lower, 0.5, 1.6, stemMaterial);
    for (let i = 0; i < 5; i++) to(lower, s.mesh(new THREE.TorusGeometry(0.5, 0.06, 4, 14), stemMaterial), y + 0.2 + i * 0.28).rotation.x = Math.PI / 2;
    y += 1.6;
    section(lower, 0.82, 0.9, stemMaterial);
    y += 0.9;
    section(lower, 0.5, 0.45, stemMaterial);
    y += 0.45;
    section(lower, 0.82, 0.6, stemMaterial);
    y += 0.6;
    if (a.pinions) {
      // Winding pinion: gear teeth round the edge and ratchet teeth on its face.
      const pinion = gearShape(1.75, 1.3, 14, 0, 0.24);
      pinion.holes.push(circleHole(0.5));
      to(lower, slab(s, pinion, 0.9, pinionMaterial, 0, 0.06), y - 0.5);
      const crownTeeth = gearShape(1.15, 0.85, 9, 0.2, 0.1);
      to(lower, slab(s, crownTeeth, 0.35, pinionMaterial, 0, 0.02), y + 0.4);
    }
    const squareL = mix(3.2, 8.5, a.length);
    const breakAt = squareL * mix(0.45, 0.75, random());
    const square = (group: THREE.Group, length: number, base: number) => {
      const part = to(group, s.box([0.8, length, 0.8], [0, 0, 0], stemMaterial), base + length / 2);
      return part;
    };
    square(lower, breakAt, y);
    if (a.pinions) {
      // Sliding clutch, with its groove for the yoke.
      const base = y + Math.min(1.3, breakAt - 1.75);
      section(lower, 1.2, 0.5, pinionMaterial, 18, base);
      section(lower, 0.8, 0.45, pinionMaterial, 18, base + 0.5);
      section(lower, 1.2, 0.4, pinionMaterial, 18, base + 0.95);
      to(lower, slab(s, gearShape(1.3, 0.95, 10, 0.2, 0.1), 0.4, pinionMaterial, 0, 0.02), base + 1.35);
    }
    y += breakAt;
    const rest = squareL - breakAt;
    square(upper, rest, 0);
    section(upper, 0.4, 1.5, stemMaterial, 12, rest);
    to(upper, s.ball([0.4, 0.4, 0.4], [0, 0, 0], stemMaterial, 10), rest + 1.5);
    upper.position.y = y;
    const total = y + rest + 1.9;

    if (a.state === 'bent') upper.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.3, 0.6, random());
    if (a.state === 'snapped') {
      // Jagged ends where the square let go.
      to(lower, s.mesh(new THREE.ConeGeometry(0.42, 0.5, 4), stemMaterial), y + 0.2).rotation.y = 0.6;
      const stub = s.mesh(new THREE.ConeGeometry(0.42, 0.5, 4), stemMaterial);
      stub.rotation.x = Math.PI;
      to(upper, stub, -0.2);
    }

    if (a.pose === 'standing' && a.crown !== 'bow') {
      assembly.rotation.y = random() * 6;
      if (a.state === 'snapped') {
        stage.attach(upper);
        upper.rotation.set(0, random() * 6, Math.PI / 2);
        upper.position.set(crownR + 2 + random() * 2, 0.42, (random() - 0.5) * 5);
      }
    } else {
      const reach = a.state === 'snapped' ? y : total;
      const tilt = Math.asin(Math.min(0.9, (crownR - 0.45) / reach));
      const turn = mix(0.75, 1.15, random());
      if (a.state === 'snapped') {
        stage.attach(upper);
        const angle = turn + (random() - 0.5) * 1.2;
        upper.rotation.set(0, angle, Math.PI / 2);
        upper.position.set(Math.cos(turn) * (y + 2.2) + (random() - 0.5) * 2, 0.42, -Math.sin(turn) * (y + 2.2) + 2 + random() * 2);
      }
      assembly.rotation.order = 'YZX';
      assembly.rotation.z = -(Math.PI / 2 + tilt);
      assembly.rotation.y = turn;
      assembly.position.y = crownR * Math.cos(tilt);
      // Flutes turned at random so the mark on the end is never square to the bench.
      lower.rotation.y = random() * 6;
    }

    // Lint and skin caught in the grip of an old crown.
    if (mood.wear > 0.5 && a.state !== 'worn' && a.crown !== 'onion' && a.crown !== 'bow') {
      const grime = s.material('#4a3d2c', { roughness: 1 });
      const specks = [];
      for (let i = 0; i < Math.round(mood.wear * 20); i++) {
        const angle = random() * 6.3;
        specks.push({ at: [Math.cos(angle) * (crownR - depth * 0.6), 0.6 + random() * (crownH - 1.4), Math.sin(angle) * (crownR - depth * 0.6)] as [number, number, number], size: 0.06 + random() * 0.1 });
      }
      lower.add(s.scatter(new THREE.SphereGeometry(1, 5, 4), grime, specks));
    }

    s.root.scale.setScalar(0.05);
    return s.finish();
  },
});
