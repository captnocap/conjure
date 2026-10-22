import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    size: choice('How big is the pot?', {
      one: 'A tiny one-cup pot, coffee for a person alone.',
      three: 'The ordinary three-cup pot.',
      six: 'A six-cup pot for a household.',
      twelve: 'A huge twelve-cup pot for a crowd or a long night.',
    }),
    finish: choice('What is its finish?', {
      aluminium: 'Plain cast aluminium, soft grey, the classic.',
      polished: 'Mirror-polished stainless steel.',
      red: 'Glossy red enamel over the upper half.',
      black: 'Matt black all over, modern.',
      copper: 'Warm copper plate.',
      mint: 'Pale mint-green enamel, 1950s.',
    }),
    state: choice('What is the pot doing right now?', {
      brewing: 'Just finishing: lid down, steam curling from the spout.',
      poured: 'Just poured: lid flipped open, still steaming, the cup full.',
      over: 'Boiled over: coffee spat down the sides and pooled around it.',
      cold: 'Gone cold: no steam, a ring of dregs in the cup.',
      apart: 'Unscrewed in pieces to dry: base, funnel of spent grounds and top set out separately.',
    }),
    cup: choice('What cup is beside it?', {
      espresso: 'A small thick white espresso cup on a saucer.',
      glass: 'A little glass tumbler.',
      enamel: 'A chipped blue enamel mug.',
      bowl: 'A wide café-au-lait bowl.',
      none: 'No cup.',
    }),
    stand: choice('What is it standing on?', {
      bare: 'Straight on the table.',
      cork: 'A round cork mat.',
      burner: 'A single iron gas ring.',
      towel: 'A folded striped tea towel.',
    }),
    beside: choice('What else is there?', {
      none: 'Nothing else.',
      sugar: 'A sugar bowl and a few scattered cubes.',
      biscotti: 'Two almond biscotti.',
      second: 'A second cup set out, clean and unused.',
      tin: 'An open tin of ground coffee with a scoop.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const k = { one: 0.72, three: 1, six: 1.28, twelve: 1.62 }[a.size];
    const tall = { one: 0.95, three: 1, six: 1.08, twelve: 1.16 }[a.size];
    const hot = a.state === 'brewing' || a.state === 'poured' || a.state === 'over';

    const raw = { aluminium: '#c5c9ca', polished: '#e6e9ea', red: '#c5c9ca', black: '#26272a', copper: '#c77a48', mint: '#c5c9ca' }[a.finish];
    const metalParams = { flatShading: true, metalness: a.finish === 'black' ? 0.3 : a.finish === 'copper' ? 0.45 : 0.85, roughness: a.finish === 'polished' ? 0.1 : a.finish === 'copper' ? 0.25 : 0.4 + mood.wear * 0.25 };
    const lower = new THREE.MeshStandardMaterial({ color: new THREE.Color(raw).lerp(new THREE.Color('#4a3a2c'), mood.wear * 0.45), ...metalParams });
    const upperTint = a.finish === 'red' ? '#c2261f' : a.finish === 'mint' ? '#a9d9c2' : raw;
    const upper = new THREE.MeshStandardMaterial({ color: upperTint, ...metalParams, ...(a.finish === 'red' || a.finish === 'mint' ? { metalness: 0.1, roughness: 0.25 } : {}) });
    const band = new THREE.MeshStandardMaterial({ color: raw, metalness: 0.85, roughness: 0.35 });
    const bakelite = s.material('#17171a', { roughness: 0.35 });
    const brass = s.material('#c9a544', { metalness: 0.9, roughness: 0.3 });
    const coffee = new THREE.MeshStandardMaterial({ color: '#2a160c', roughness: 0.15 });
    const china = s.material('#f5f2ea', { roughness: 0.28, side: THREE.DoubleSide });

    // Stand.
    let lift = 0;
    const flames: THREE.Mesh[] = [];
    if (a.stand === 'cork') {
      s.cylinder(0.075 * k, 0.075 * k, 0.006, [0, 0.003, 0], s.material('#c79a63', { roughness: 1 }), 32);
      lift = 0.006;
    } else if (a.stand === 'towel') {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#f2ede0'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = mood.cheer > 0.5 ? '#c8322c' : '#35558c';
      for (const x of [10, 22, 100, 112]) g.fillRect(x, 0, 6, 128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const cloth = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
      s.box([0.2 * k, 0.005, 0.15 * k], [0, 0.0025, 0], cloth).rotation.y = 0.2;
      s.box([0.2 * k, 0.005, 0.075 * k], [0.008, 0.0075, 0.03 * k], cloth).rotation.y = 0.2;
      lift = 0.01;
    } else if (a.stand === 'burner') {
      const iron = s.material('#232426', { roughness: 0.7, metalness: 0.4 });
      s.cylinder(0.062 * k, 0.07 * k, 0.022, [0, 0.011, 0], iron, 24);
      s.cylinder(0.03 * k, 0.034 * k, 0.012, [0, 0.028, 0], s.material('#8a8d8f', { metalness: 0.8, roughness: 0.4 }), 20);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const arm = s.box([0.012, 0.012, 0.062 * k], [Math.sin(angle) * 0.052 * k, 0.04, Math.cos(angle) * 0.052 * k], iron);
        arm.rotation.y = angle;
        s.box([0.012, 0.03, 0.012], [Math.sin(angle) * 0.076 * k, 0.03, Math.cos(angle) * 0.076 * k], iron).rotation.y = angle;
      }
      const knob = s.cylinder(0.011, 0.011, 0.014, [0.03, 0.012, 0.068 * k], bakelite, 14);
      knob.rotation.x = Math.PI / 2;
      if (hot) {
        const flame = new THREE.MeshStandardMaterial({ color: '#3a7cff', emissive: '#2f6bff', emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false });
        for (let i = 0; i < 14; i++) {
          const angle = (i / 14) * Math.PI * 2;
          const tongue = s.mesh(new THREE.ConeGeometry(0.0045, 0.016, 6), flame, [Math.sin(angle) * 0.036 * k, 0.038, Math.cos(angle) * 0.036 * k]);
          tongue.castShadow = false;
          flames.push(tongue);
        }
      }
      lift = 0.046;
    }

    // The pot, built at three-cup size and scaled.
    const pot = new Sculpture(context);
    const eighth = Math.PI / 8;
    const hBase = 0.066 * tall, hTop = 0.072 * tall, collar = 0.012;
    const yWaist = hBase + collar, yRim = yWaist + hTop;
    const baseGroup = new Sculpture(context), topGroup = new Sculpture(context);
    const part = (group: Sculpture, top: number, bottom: number, height: number, y: number, skin: THREE.Material) => {
      const mesh = group.mesh(new THREE.CylinderGeometry(top, bottom, height, 8), skin, [0, y, 0]);
      mesh.rotation.y = eighth;
      return mesh;
    };
    part(baseGroup, 0.047, 0.047, 0.005, 0.0025, lower);
    part(baseGroup, 0.034, 0.047, hBase - 0.005, 0.005 + (hBase - 0.005) / 2, lower);
    baseGroup.cylinder(0.036, 0.036, collar, [0, hBase + collar / 2, 0], band, 28);
    for (let i = 0; i < 3; i++) baseGroup.ring(0.0365, 0.0009, [0, hBase + 0.003 + i * 0.003, 0], band).rotation.x = Math.PI / 2;
    const valve = baseGroup.cylinder(0.0048, 0.0048, 0.009, [0, hBase * 0.62, 0.04], brass, 12);
    valve.rotation.x = Math.PI / 2;
    baseGroup.ball([0.0032, 0.0032, 0.0032], [0, hBase * 0.62, 0.0455], brass, 8);

    // Top section, origin at the waist.
    part(topGroup, 0.047, 0.035, hTop, hTop / 2, upper);
    part(topGroup, 0.049, 0.049, 0.004, hTop, upper);
    const spout = topGroup.mesh(new THREE.CylinderGeometry(0.017, 0.006, 0.03, 3), upper, [0.046, hTop - 0.013, 0]);
    spout.rotation.set(0, -Math.PI / 2, 0);
    spout.scale.set(1, 1, 0.9);
    // Handle: a bakelite "7" opposite the spout.
    const outline = new THREE.Shape();
    const points: [number, number][] = [[-0.036, hTop - 0.002], [-0.094, hTop + 0.002], [-0.101, hTop - 0.012], [-0.096, hTop * 0.08], [-0.08, hTop * 0.06], [-0.08, hTop - 0.02], [-0.036, hTop - 0.018]];
    points.forEach(([x, y], i) => (i ? outline.lineTo(x, y) : outline.moveTo(x, y)));
    outline.closePath();
    const handleGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.014, bevelEnabled: true, bevelSize: 0.0015, bevelThickness: 0.0015, bevelSegments: 2 });
    handleGeometry.translate(0, 0, -0.007);
    topGroup.mesh(handleGeometry, bakelite);
    // Lid on a hinge at the handle side.
    const lid = new Sculpture(context);
    const dome = lid.mesh(new THREE.CylinderGeometry(0.012, 0.048, 0.016, 8), upper, [0.046, 0.008, 0]);
    dome.rotation.y = eighth;
    lid.cylinder(0.006, 0.0085, 0.008, [0.046, 0.02, 0], bakelite, 12);
    lid.ball([0.0095, 0.007, 0.0095], [0.046, 0.028, 0], bakelite, 12);
    lid.root.position.set(-0.046, hTop + 0.002, 0);
    const openLid = a.state === 'poured' || a.state === 'apart' || (a.state === 'over' && random() > 0.5);
    lid.root.rotation.z = openLid ? 1.75 : 0;
    topGroup.root.add(lid.root);
    if (openLid) {
      // Looking down the chimney: the centre column and the coffee that is left.
      topGroup.cylinder(0.005, 0.007, hTop * 0.8, [0, hTop * 0.5, 0], band, 10);
      if (a.state !== 'apart') topGroup.cylinder(0.04, 0.04, 0.002, [0, hTop * (a.state === 'poured' ? 0.35 : 0.8), 0], coffee, 8).rotation.y = eighth;
    }

    pot.root.add(baseGroup.root);
    if (a.state === 'apart') {
      // Funnel basket full of spent grounds sits in the base; the top stands apart.
      pot.cylinder(0.033, 0.033, 0.004, [0, yWaist + 0.001, 0], band, 24);
      pot.cylinder(0.03, 0.03, 0.003, [0, yWaist + 0.003, 0], s.material('#3a2415', { roughness: 1 }), 24);
      topGroup.root.position.set(0.105, 0, 0.065);
      topGroup.root.rotation.y = -0.5 + wobble(0.3);
      // The rubber gasket and filter plate, left out.
      pot.ring(0.03, 0.004, [-0.03, 0.004, 0.105], s.material('#e8e2d2', { roughness: 0.8 })).rotation.x = Math.PI / 2;
      pot.cylinder(0.028, 0.028, 0.002, [-0.03, 0.002, 0.105], band, 20);
    } else {
      topGroup.root.position.y = yWaist;
      topGroup.root.rotation.y = wobble(0.03);
    }
    pot.root.add(topGroup.root);

    if (a.state === 'over') {
      const spat = new THREE.MeshStandardMaterial({ color: '#3a1e0e', roughness: 0.25 });
      for (let i = 0; i < 6; i++) {
        const angle = wobble(Math.PI), from = yRim - random() * 0.01, to = from - (0.04 + random() * 0.09);
        const radiusAt = (y: number) => (y > yWaist ? mix(0.035, 0.047, (y - yWaist) / hTop) : y > hBase ? 0.037 : mix(0.047, 0.034, y / hBase)) * Math.cos(eighth) + 0.0012;
        const path: [number, number, number][] = [];
        for (let j = 0; j <= 5; j++) { const y = Math.max(mix(from, to, j / 5), 0.004); path.push([Math.sin(angle) * radiusAt(y), y, Math.cos(angle) * radiusAt(y)]); }
        pot.tube(path, 0.0022, spat);
      }
      pot.ball([0.016, 0.006, 0.012], [0.058, yRim - 0.004, 0], spat, 10);
      const pool = pot.ball([0.075, 0.0012, 0.062], [0.012, 0.0006, 0.01], spat, 20);
      pool.rotation.y = random() * 3;
    } else if (a.state === 'brewing') {
      pot.ball([0.004, 0.006, 0.004], [0.062, yRim - 0.012, 0], coffee, 8);
    }

    pot.root.scale.setScalar(k);
    pot.root.position.y = a.state === 'apart' && a.stand === 'burner' ? 0 : lift;
    if (a.state === 'apart' && a.stand === 'burner') pot.root.position.x = 0.15 * k;
    pot.root.rotation.y = 0.35;
    s.root.add(pot.root);

    // Steam.
    const puffs: THREE.Mesh[] = [];
    if (hot) {
      const vapour = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false });
      const count = a.state === 'over' ? 9 : 6;
      const sx = Math.cos(0.35) * 0.052 * k, sz = -Math.sin(0.35) * 0.052 * k;
      for (let i = 0; i < count; i++) {
        const puff = s.ball([0.012 + i * 0.004, 0.014 + i * 0.004, 0.012 + i * 0.004], [sx + wobble(0.01), lift + yRim * k + 0.012 + i * 0.022, sz + wobble(0.01)], vapour, 12);
        puff.castShadow = puff.receiveShadow = false;
        puff.userData.home = puff.position.clone();
        puff.userData.phase = random() * 6;
        puffs.push(puff);
      }
    }

    // Cups.
    const cupAt = (x: number, z: number, kind: typeof a.cup, fill: number, ring: boolean) => {
      const cup = new Sculpture(context);
      let top = 0, r = 0.02;
      if (kind === 'espresso') {
        cup.lathe([[0, 0.004], [0.03, 0.004], [0.05, 0.009], [0.051, 0.0075], [0.031, 0], [0, 0]], china);
        cup.lathe([[0, 0.006], [0.016, 0.006], [0.02, 0.012], [0.027, 0.038], [0.0285, 0.05], [0.026, 0.05], [0.0245, 0.038], [0.0175, 0.012], [0, 0.01]], china);
        cup.ring(0.011, 0.0032, [0.034, 0.03, 0], china).rotation.y = 0;
        top = 0.05; r = 0.0255;
      } else if (kind === 'glass') {
        const glass = new THREE.MeshPhysicalMaterial({ color: '#e9f3f0', transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide });
        cup.lathe([[0, 0.002], [0.022, 0.002], [0.023, 0.005], [0.029, 0.068]], glass);
        cup.cylinder(0.0225, 0.0225, 0.004, [0, 0.002, 0], glass, 20);
        top = 0.068; r = 0.027;
      } else if (kind === 'enamel') {
        const blue = cup.material('#2f5aa0', { roughness: 0.3, side: THREE.DoubleSide });
        cup.lathe([[0, 0.002], [0.034, 0.002], [0.036, 0.006], [0.036, 0.078], [0.034, 0.078], [0.034, 0.006], [0, 0.004]], blue);
        cup.ring(0.036, 0.002, [0, 0.078, 0], cup.material('#16203a', { roughness: 0.3 })).rotation.x = Math.PI / 2;
        cup.ring(0.02, 0.004, [0.05, 0.042, 0], blue, Math.PI * 1.1).rotation.z = -Math.PI * 0.55;
        if (mood.wear > 0.3) for (let i = 0; i < 4; i++) cup.ball([0.005, 0.004, 0.002], [Math.sin(i * 1.9) * 0.0362, 0.074 - (i % 2) * 0.05, Math.cos(i * 1.9) * 0.0362], cup.material('#1a1a1c'), 6).rotation.y = i * 1.9;
        top = 0.078; r = 0.033;
      } else if (kind === 'bowl') {
        cup.lathe([[0, 0.012], [0.02, 0.012], [0.024, 0], [0.028, 0], [0.03, 0.012], [0.058, 0.05], [0.062, 0.068], [0.059, 0.068], [0.055, 0.05], [0.028, 0.016], [0, 0.014]], china);
        cup.ring(0.0615, 0.0012, [0, 0.062, 0], cup.material(mood.cheer > 0.5 ? '#c8322c' : '#35558c')).rotation.x = Math.PI / 2;
        top = 0.068; r = 0.057;
      } else return;
      const wallIn = kind === 'espresso' ? 0.012 : kind === 'bowl' ? 0.02 : 0.006;
      if (fill > 0.02) {
        const y = mix(wallIn + 0.003, top - 0.006, fill);
        const rr = kind === 'enamel' ? 0.034 : mix(r * 0.62, r * 0.97, fill);
        cup.cylinder(rr, rr, 0.0012, [0, y, 0], coffee, 24);
        if (fill > 0.6 && hot) cup.ring(rr * 0.82, 0.0015, [0, y + 0.0008, 0], cup.material('#b8834a', { roughness: 0.4 })).rotation.x = Math.PI / 2;
      } else if (ring) {
        cup.ring(r * 0.6, 0.0016, [0, wallIn + 0.004, 0], cup.material('#4a2c16', { roughness: 0.6 })).rotation.x = Math.PI / 2;
      }
      cup.root.position.set(x, 0, z);
      cup.root.rotation.y = -0.6 + wobble(0.4);
      s.root.add(cup.root);
    };
    const reach = 0.07 * k + 0.07;
    const fill = { brewing: 0, poured: 0.9, over: 0.35, cold: 0.12, apart: 0 }[a.state];
    cupAt(reach * 0.75, reach * 0.8, a.cup, fill, a.state === 'cold' || a.state === 'apart');

    // Company.
    const bx = -reach * 0.78, bz = reach * 0.85;
    if (a.beside === 'second') cupAt(bx, bz, a.cup === 'none' ? 'espresso' : a.cup, 0, false);
    else if (a.beside === 'sugar') {
      s.lathe([[0, 0.004], [0.022, 0.004], [0.026, 0], [0.03, 0], [0.038, 0.02], [0.04, 0.044], [0.037, 0.044], [0.035, 0.02], [0, 0.008]], china, [bx, 0, bz]);
      const cube = s.material('#fdfcf7', { roughness: 0.9 });
      for (let i = 0; i < 7; i++) s.box([0.013, 0.013, 0.013], [bx + wobble(0.018), 0.036 + (i % 3) * 0.006, bz + wobble(0.018)], cube).rotation.set(wobble(0.6), random() * 3, wobble(0.6));
      for (let i = 0; i < 1 + Math.round(mood.density * 4); i++) s.box([0.013, 0.013, 0.013], [bx + 0.05 + wobble(0.035), 0.0065, bz + 0.03 + wobble(0.04)], cube).rotation.y = random() * 3;
    } else if (a.beside === 'biscotti') {
      const bake = s.material('#c99653', { roughness: 0.95 });
      for (let i = 0; i < 2; i++) {
        const biscuit = s.mesh(new THREE.CapsuleGeometry(0.012, 0.07, 3, 10), bake, [bx + i * 0.022, 0.008 + i * 0.006, bz + i * 0.012]);
        biscuit.rotation.set(Math.PI / 2, 0, 0.5 + i * 0.5);
        biscuit.scale.set(1, 1, 0.6);
      }
      s.scatter(new THREE.DodecahedronGeometry(1, 0), bake, Array.from({ length: 10 }, () => ({ at: [bx + wobble(0.05), 0.001, bz + wobble(0.04)] as const, size: 0.0012 + random() * 0.002 })));
    } else if (a.beside === 'tin') {
      const tin = s.material(mood.cheer > 0.5 ? '#c4302a' : '#28533f', { metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
      s.lathe([[0, 0.002], [0.04, 0.002], [0.04, 0.085], [0.038, 0.085], [0.038, 0.004], [0, 0.004]], tin, [bx, 0, bz]);
      s.label('CAFFÈ', 0.055, 0.03, [bx + 0.012, 0.045, bz + 0.039], '#f6e7b8', mood.cheer > 0.5 ? '#7c1612' : '#122a20').rotation.y = 0.3;
      s.cylinder(0.037, 0.037, 0.002, [bx, 0.06, bz], s.material('#3a2415', { roughness: 1 }), 24);
      s.cylinder(0.042, 0.042, 0.008, [bx + 0.075, 0.004, bz - 0.03], s.material('#d9dcdc', { metalness: 0.9, roughness: 0.3 }), 24);
      s.rod([bx - 0.005, 0.062, bz], [bx + 0.03, 0.105, bz + 0.03], 0.0025, s.material('#d9dcdc', { metalness: 0.9, roughness: 0.3 }));
    }

    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      update: puffs.length || flames.length
        ? (_dt, time) => {
          for (const puff of puffs) {
            const home = puff.userData.home as THREE.Vector3, phase = puff.userData.phase as number;
            puff.position.x = home.x + Math.sin(time * speed + phase) * 0.006;
            puff.position.y = home.y + Math.sin(time * speed * 0.7 + phase) * 0.004;
          }
          flames.forEach((flame, i) => (flame.scale.y = 1 + Math.sin(time * 9 * speed + i) * 0.25));
        }
        : undefined,
    });
  },
});
