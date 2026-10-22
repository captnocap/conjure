import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { circleHole, finishTexture, screw, slab, tile } from './bits';

export default defineThing({
  questions: {
    stone: choice('What is the jewel?', {
      ruby: 'Synthetic ruby, a saturated pigeon-blood red.',
      pink: 'Pale pink ruby, almost candy coloured.',
      sapphire: 'Clear blue-white sapphire, cold and glassy.',
      garnet: 'An old natural garnet, dark wine red and slightly uneven.',
      amber: 'A honey-orange stone, warm and unusual.',
    }),
    setting: choice('How is it set?', {
      chaton: 'In a raised polished gold chaton held down by three tiny screws, the grand old way.',
      pressed: 'Pressed straight into the plate with no gold at all, plain and modern.',
      shock: 'Under a cap jewel held by a lyre-shaped steel shock spring.',
      collar: 'In a tall domed gold collar with a milled edge, proud and showy.',
    }),
    state: choice('What condition is the bearing in?', {
      oiled: 'Freshly serviced, with a clear bead of oil sitting in the cup.',
      dry: 'Clean and bone dry.',
      gummed: 'Unserviced for decades: the oil has gone to a dark brown crust around the hole.',
      cracked: 'The stone is cracked right across, with a chip out of its edge.',
      empty: 'The stone is gone. Only the empty seat is left.',
    }),
    ground: choice('What is it set into?', {
      stripes: 'A piece of bridge with broad Geneva stripes.',
      perlage: 'A piece of main plate covered in overlapping circular graining.',
      frosted: 'A matt gilt frosted plate, old English style.',
      loose: 'Nothing: the setting has been pushed out and sits loose on the bench.',
    }),
    screws: choice('If it has screws, what are they like?', {
      blued: 'All three present, heat-blued to cornflower.',
      polished: 'All three present, bright polished steel.',
      missing: 'One is missing, leaving an empty threaded hole.',
    }),
    size: score('How big is the stone in its setting?', ['A pinprick of red', 'Ordinary', 'A fat, generous stone']),
    pivot: noul('Is the steel pivot of a wheel showing through the hole?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.2, 0.6, mood.wear);
    const gold = s.material('#e6b63e', { metalness: 0.65, roughness: dull });
    const steel = s.material('#cdd2d6', { metalness: 0.7, roughness: dull });
    const tint = { ruby: '#d70f3a', pink: '#f0608e', sapphire: '#9fc4ee', garnet: '#7c1026', amber: '#e88a1c' }[a.stone];
    const stone = s.material(tint, {
      roughness: a.stone === 'garnet' ? 0.25 : 0.08, metalness: 0.1,
      emissive: tint, emissiveIntensity: mix(0.12, 0.34, mood.cheer),
    });
    const dark = s.material('#15120d', { roughness: 0.9 });
    const T = a.ground === 'loose' ? 0 : 1.1;
    const jewelR = mix(1.25, 1.95, a.size), hole = 0.44;
    const seatR = jewelR + 0.08;

    // The plate or bridge it lives in: an irregular piece with one sawn edge.
    if (a.ground !== 'loose') {
      const base = { stripes: '#dcb85c', perlage: '#c9cbc4', frosted: '#d9b556' }[a.ground];
      const texture = a.ground === 'frosted'
        ? tile(finishTexture('brushed', base, random, mood.wear), 2.5, random() * 3)
        : tile(finishTexture(a.ground === 'stripes' ? 'stripes' : 'perlage', base, random, mood.wear), a.ground === 'stripes' ? 7 : 2.6, 0.5);
      const plate = new THREE.Shape();
      // A round coupon of plate with one sawn flat.
      const plateR = seatR + 2.15, flat = 0.5 + random() * 0.25, start = random() * 6;
      plate.absarc(0, 0, plateR, start + flat, start + Math.PI * 2 - flat, false);
      plate.closePath();
      plate.holes.push(circleHole(seatR * 0.9));
      slab(s, plate, T, s.material('#ffffff', { map: texture, metalness: 0.45, roughness: a.ground === 'frosted' ? 0.75 : dull + 0.08 }), 0, 0.1);
      // A polished countersink round the setting.
      s.lathe([[seatR + 0.02, T - 0.02], [seatR + 0.5, T + 0.012]], gold);
    }

    let top = T;
    const holes: [number, number][] = [];
    if (a.setting === 'chaton') {
      const outer = seatR + 0.75;
      s.lathe([[seatR, T - 0.3], [seatR, T + 0.2], [seatR + 0.15, T + 0.32], [outer - 0.15, T + 0.32], [outer, T + 0.18], [outer, T - 0.3]], gold);
      top = T + 0.12;
      const turn = random() * 6;
      const screwMaterial = a.screws === 'polished' ? steel : s.material('#2f58cc', { metalness: 0.55, roughness: 0.25, emissive: '#10267a', emissiveIntensity: 0.55 });
      for (let i = 0; i < 3; i++) {
        const angle = turn + (i / 3) * Math.PI * 2;
        const at: [number, number] = [Math.cos(angle) * (outer + 0.32), Math.sin(angle) * (outer + 0.32)];
        if (a.screws === 'missing' && i === 0) {
          s.cylinder(0.3, 0.3, 0.06, [at[0], T + 0.03, at[1]], dark, 14);
          holes.push(at);
        } else screw(s, [at[0], T + 0.12, at[1]], 0.46, screwMaterial, random() * 3);
      }
      if (holes.length && a.ground !== 'loose') {
        // The lost screw, rolled a little way off.
        const lost = screw(s, [holes[0][0] * 1.7, T, holes[0][1] * 1.7], 0.46, screwMaterial, random() * 3);
        lost.rotation.z = Math.PI / 2;
        lost.position.y = T + 0.44;
      }
    } else if (a.setting === 'collar') {
      const outer = seatR + 1.05;
      s.lathe([[seatR, T - 0.2], [seatR, T + 0.7], [seatR + 0.2, T + 0.86], [seatR + 0.6, T + 0.8], [outer, T + 0.3], [outer + 0.1, T], [outer + 0.1, T - 0.2]], gold);
      const beads = [];
      for (let i = 0; i < 36; i++) beads.push({ at: [Math.cos((i / 36) * 6.283) * (outer + 0.08), T + 0.1, Math.sin((i / 36) * 6.283) * (outer + 0.08)] as [number, number, number], size: 1 });
      s.scatter(new THREE.SphereGeometry(0.11, 8, 6), gold, beads);
      top = T + 0.62;
    } else if (a.setting === 'shock') {
      const outer = seatR + 0.6;
      s.lathe([[seatR, T - 0.2], [seatR, T + 0.3], [outer, T + 0.3], [outer + 0.12, T + 0.1], [outer + 0.12, T - 0.2]], gold);
      top = T + 0.05;
    } else if (a.ground === 'loose') {
      s.lathe([[seatR, 0], [seatR + 0.12, 0], [seatR + 0.12, 0.4], [seatR, 0.4]], steel);
      top = 0.02;
    } else top = T - 0.12;

    // The stone: a doughnut with a domed face and an oil cup round the hole.
    const present = a.state !== 'empty';
    const h = 0.9;
    if (present) {
      const jewel = s.lathe(
        [[hole, 0.1], [hole, h * 0.45], [hole + jewelR * 0.08, h * 0.7], [hole + jewelR * 0.2, h * 0.9], [hole + jewelR * 0.34, h], [jewelR * 0.8, h * 0.9], [jewelR * 0.95, h * 0.68], [jewelR, h * 0.4], [jewelR, 0], [hole + 0.1, 0], [hole, 0.1]],
        stone, [0, top, 0],
      );
      if (a.state === 'cracked') {
        const angle = random() * 3;
        const crack = s.box([jewelR * 1.9, 0.05, 0.05], [0, top + h * 0.93, 0], dark);
        crack.rotation.y = angle;
        const fork = s.box([jewelR * 0.7, 0.05, 0.04], [Math.cos(angle + 0.5) * jewelR * 0.45, top + h * 0.9, -Math.sin(angle + 0.5) * jewelR * 0.45], dark);
        fork.rotation.y = angle + 0.9;
        // A flake has come away from the rim.
        const flake = s.mesh(new THREE.TetrahedronGeometry(jewelR * 0.2), stone, [Math.cos(angle) * (jewelR + 1.3), T + 0.12, -Math.sin(angle) * (jewelR + 1.3)]);
        flake.rotation.set(random() * 3, random() * 3, random() * 3);
        jewel.rotation.y = random();
      }
      // A highlight ground into the dome, so it reads as polished at any size.
      s.mesh(new THREE.TorusGeometry(jewelR * 0.66, 0.04, 6, 24, 1.3), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75, depthWrite: false }), [0, top + h + 0.01, 0]).rotation.set(Math.PI / 2, 0, 2.2);
    } else {
      s.cylinder(seatR * 0.92, seatR * 0.92, 0.05, [0, Math.max(top - 0.1, 0.03), 0], dark, 24);
    }

    if (present) s.cylinder(hole * 0.98, hole * 0.98, 0.1, [0, top + h * 0.42, 0], dark, 16);
    if (present && a.state === 'oiled')
      s.ball([hole + jewelR * 0.22, 0.2, hole + jewelR * 0.22], [0, top + h * 0.82, 0], new THREE.MeshStandardMaterial({ color: '#ffe9a0', roughness: 0.02, transparent: true, opacity: 0.55, depthWrite: false, emissive: '#b08a20', emissiveIntensity: 0.3 }), 16);
    if (present && a.state === 'gummed') {
      const crust = s.material('#3b2410', { roughness: 0.95 });
      s.mesh(new THREE.TorusGeometry(hole + jewelR * 0.16, 0.12, 6, 20), crust, [0, top + h * 0.9, 0]).rotation.x = Math.PI / 2;
      const flecks = [];
      for (let i = 0; i < 14; i++) {
        const angle = random() * 6.3, radius = hole + jewelR * (0.25 + random() * 0.6);
        flecks.push({ at: [Math.cos(angle) * radius, top + h * 0.9, Math.sin(angle) * radius] as [number, number, number], size: 0.05 + random() * 0.09 });
      }
      s.scatter(new THREE.SphereGeometry(1, 6, 4), crust, flecks);
    }
    if (a.pivot && a.setting !== 'shock') {
      const lean = a.state === 'empty' ? 0.25 : 0;
      const pin = s.cylinder(0.07, 0.13, 1.0, [lean * 1.2, top + (present ? h * 0.6 : 0.3), 0], steel, 10);
      pin.rotation.z = -lean;
      s.ball([0.09, 0.09, 0.09], [lean * 1.2 + lean * 0.5, top + (present ? h * 0.6 : 0.3) + 0.5, 0], steel, 8);
    }

    if (a.setting === 'shock' && present) {
      // Cap jewel and the lyre spring that lets it give under a knock.
      s.ball([jewelR * 0.7, 0.2, jewelR * 0.7], [0, top + h + 0.1, 0], stone, 18);
      const y = top + h + 0.3, r = seatR + 0.42;
      const turn = random() * 6;
      const lyre: [number, number, number][] = [];
      for (let i = 0; i <= 20; i++) {
        const angle = -2.3 + (i / 20) * 4.6;
        const radius = r * (i < 2 || i > 18 ? 0.62 : 0.95);
        lyre.push([Math.sin(angle) * radius, y, Math.cos(angle) * radius]);
      }
      const spring = s.tube(lyre, 0.06, steel);
      spring.rotation.y = turn;
      const bar = s.box([jewelR * 1.1, 0.07, 0.14], [0, y, 0], steel);
      bar.rotation.y = turn + Math.PI / 2;
    }

    // Dust and filings gather where nobody looks.
    if (mood.wear > 0.4 && a.ground !== 'loose') {
      const specks = [];
      for (let i = 0; i < Math.round(mood.wear * 26); i++) {
        const angle = random() * 6.3, radius = seatR + 1.2 + random() * 1.3;
        specks.push({ at: [Math.cos(angle) * radius, T + 0.03, Math.sin(angle) * radius] as [number, number, number], size: 0.03 + random() * 0.06 });
      }
      s.scatter(new THREE.SphereGeometry(1, 5, 4), s.material('#4a4134', { roughness: 1 }), specks);
    }

    s.root.scale.setScalar(0.05);
    return s.finish();
  },
});
