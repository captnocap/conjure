import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { circleHole, crossings, finishTexture, gearShape, screw, slab, tile } from './bits';

/** An escape wheel outline: hooked club teeth or plain spikes, with some teeth optionally broken to stubs. */
function escapeShape(R: number, teeth: number, spiky: boolean, broken: ReadonlySet<number>) {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth, root = R * 0.7;
  const at = (radius: number, turns: number, first = false) => {
    const x = Math.cos(turns * step) * radius, y = Math.sin(turns * step) * radius;
    if (first) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  };
  for (let i = 0; i < teeth; i++) {
    at(root, i + 0.12, i === 0);
    if (broken.has(i)) {
      at(root * 1.1, i + 0.3);
      at(root * 1.06, i + 0.5);
    } else if (spiky) at(R, i + 0.86);
    else {
      at(R, i + 0.8);
      at(R * 0.95, i + 1.02);
    }
    at(root, i + 0.64);
  }
  shape.closePath();
  return shape;
}

export default defineThing({
  questions: {
    state: choice('What is the escapement doing?', {
      ticking: 'Ticking: the fork rocks side to side and the wheel steps round a tooth at a time.',
      locked: 'Stopped and at rest, a tooth held quietly on a pallet. Wound but waiting.',
      jammed: 'Overbanked: the fork has been thrown across to the wrong side and wedged there.',
      stone: 'One ruby pallet has fallen out and lies on the plate; nothing holds the wheel now.',
      stripped: 'Several teeth of the escape wheel are broken off to stubs.',
    }),
    wheel: choice('What is the escape wheel like?', {
      club: 'Polished steel with hooked club-foot teeth, the Swiss lever standard.',
      brass: 'Yellow brass with hooked teeth, older and softer.',
      spiky: 'Thin sharp ratchet spikes, the old English pattern, dangerous looking.',
      violet: 'Skeletal violet silicon, a modern laboratory part.',
    }),
    teeth: score('How many teeth does the wheel have?', ['A dozen long ones', 'Fifteen', 'Twenty short ones']),
    fork: choice('What is the pallet fork made of?', {
      steel: 'Bright polished steel with bevelled edges.',
      gilt: 'Gilded brass.',
      blued: 'Heat-blued steel, deep cornflower.',
      black: 'Matt black, coated and anonymous.',
    }),
    pallets: choice('What are the two pallets?', {
      ruby: 'Red ruby slips, glowing.',
      sapphire: 'Clear pale sapphire.',
      garnet: 'Dark wine garnet.',
      pins: 'No jewels: two plain steel pins, the cheap pin-lever kind.',
    }),
    plate: choice('What is it standing on?', {
      perlage: 'A piece of nickel plate covered in circular graining.',
      gilt: 'A frosted gilt plate.',
      dark: 'A blackened ruthenium plate, so the steel and rubies stand out.',
      bench: 'No plate: the parts are laid out together on bare bench.',
    }),
    roller: noul('Is the balance roller with its impulse jewel there at the fork end?'),
    bridge: noul('Is the little pallet bridge screwed down over the fork pivot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dull = mix(0.2, 0.6, mood.wear);
    const steel = s.material('#cfd4d8', { metalness: 0.7, roughness: dull });
    const blue = s.material('#2f58cc', { metalness: 0.55, roughness: 0.25, emissive: '#10267a', emissiveIntensity: 0.55 });
    const gold = s.material('#e2b23e', { metalness: 0.65, roughness: dull });
    const wheelMaterial = { club: steel, spiky: steel, brass: s.material('#cf9230', { metalness: 0.6, roughness: dull }), violet: s.material('#8a5ae0', { metalness: 0.4, roughness: 0.3, emissive: '#35157a', emissiveIntensity: 0.5 }) }[a.wheel];
    const forkMaterial = { steel, gilt: gold, blued: blue, black: s.material('#26282c', { metalness: 0.3, roughness: 0.7 }) }[a.fork];
    const stoneTint = { ruby: '#dc1040', sapphire: '#b4d2f2', garnet: '#7c1026', pins: '#cfd4d8' }[a.pallets];
    const stone = a.pallets === 'pins' ? steel : s.material(stoneTint, { roughness: 0.1, emissive: stoneTint, emissiveIntensity: mix(0.25, 0.55, mood.cheer) });
    const ruby = s.material('#dc1040', { roughness: 0.1, emissive: '#dc1040', emissiveIntensity: 0.35 });

    const onPlate = a.plate !== 'bench';
    const T = onPlate ? 0.9 : 0;
    const R = 3.7, pivotX = 5.1;
    const teeth = Math.round(mix(12, 20, a.teeth));
    const step = (Math.PI * 2) / teeth;

    if (onPlate) {
      const base = { perlage: '#c6c9c4', gilt: '#e6d8a4', dark: '#4a4d55' }[a.plate as 'perlage' | 'gilt' | 'dark'];
      const texture = tile(finishTexture(a.plate === 'gilt' ? 'brushed' : 'perlage', base, random, mood.wear), 3, 0.3);
      // A kidney of plate just big enough for the three pivots.
      const plate = new THREE.Shape();
      plate.absarc(0, 0, 5.4, Math.PI * 0.42, Math.PI * 1.58, false);
      plate.absarc(pivotX + 6.4, 0, 3.3, -Math.PI * 0.5, Math.PI * 0.5, false);
      plate.closePath();
      slab(s, plate, T, s.material('#ffffff', { map: texture, metalness: 0.45, roughness: a.plate === 'gilt' ? 0.7 : dull + 0.1 }), 0, 0.1);
      // Jewelled holes under each pivot and the two banking pins.
      for (const x of [0, pivotX]) {
        s.cylinder(0.75, 0.75, 0.06, [x, T + 0.03, 0], gold, 20);
        s.cylinder(0.45, 0.45, 0.1, [x, T + 0.06, 0], ruby, 16);
      }
      for (const side of [-1, 1]) s.cylinder(0.16, 0.16, 1.3, [pivotX + 3.9, T + 0.65, side * 1.15], steel, 10);
    }

    // The escape wheel on its arbor, with a pinion below.
    const wheel = new THREE.Group();
    wheel.position.set(0, T + 0.9, 0);
    s.root.add(wheel);
    const broken = new Set<number>();
    if (a.state === 'stripped') {
      const from = Math.floor(random() * teeth);
      const count = 2 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) broken.add((from + i + (random() < 0.3 ? 1 : 0)) % teeth);
    }
    const outline = escapeShape(R, teeth, a.wheel === 'spiky', broken);
    outline.holes.push(circleHole(0.18));
    crossings(outline, R * 0.2, R * 0.56, a.wheel === 'violet' ? 6 : 4 + Math.floor(random() * 2), a.wheel === 'violet' ? 0.14 : 0.28);
    wheel.add(slab(s, outline, 0.3, wheelMaterial, 0, 0.04));
    const add = (group: THREE.Group, mesh: THREE.Object3D, x: number, y: number, z: number) => { mesh.position.set(x, y, z); group.add(mesh); return mesh; };
    add(wheel, s.cylinder(0.13, 0.13, 2.1, [0, 0, 0], steel, 10), 0, 0.1, 0);
    const pinion = gearShape(0.62, 0.36, 7, 0, 0.2);
    add(wheel, slab(s, pinion, 0.6, steel, 0, 0.02), 0, -0.75, 0);

    // The fork: an anchor with two arms and a long lever ending in horns.
    const fork = new THREE.Group();
    fork.position.set(pivotX, T + 0.92, 0);
    s.root.add(fork);
    const anchor = new THREE.Shape();
    const half: [number, number][] = [[5, 0.25], [5.2, 0.8], [6.1, 0.95], [6.1, 0.4], [5.5, 0.32]];
    const arm: [number, number][] = [[0.7, 0.32], [0.2, 0.95], [-0.6, 2.25], [-1.5, 3.05], [-2.35, 3.05], [-2.35, 2.2], [-1.55, 2.1], [-0.85, 1.2], [-0.8, 0]];
    anchor.moveTo(5.5, -0.32);
    for (const [x, y] of half.slice().reverse()) anchor.lineTo(x, y);
    for (const [x, y] of arm) anchor.lineTo(x, y);
    for (const [x, y] of arm.slice(0, -1).reverse()) anchor.lineTo(x, -y);
    for (const [x, y] of half) anchor.lineTo(x, -y);
    anchor.closePath();
    fork.add(slab(s, anchor, 0.36, forkMaterial, 0, 0.06));
    add(fork, s.cylinder(0.14, 0.14, 2.0, [0, 0, 0], steel, 10), 0, 0.15, 0);
    add(fork, s.cylinder(0.42, 0.42, 0.2, [0, 0, 0], forkMaterial, 14), 0, 0.42, 0);
    add(fork, s.cylinder(0.07, 0.07, 0.5, [0, 0, 0], steel, 6), 5.2, -0.2, 0);
    const missing = a.state === 'stone' ? (random() < 0.5 ? -1 : 1) : 0;
    for (const side of [-1, 1]) {
      if (side === missing) continue;
      const pallet = a.pallets === 'pins'
        ? s.cylinder(0.17, 0.17, 0.9, [0, 0, 0], stone, 10)
        : s.box([1.25, 0.5, 0.42], [0, 0, 0], stone);
      add(fork, pallet, a.pallets === 'pins' ? -2.2 : -2.55, 0.2, side * 2.62);
      pallet.rotation.y = side * 0.35;
    }
    if (missing) {
      const lost = a.pallets === 'pins' ? s.cylinder(0.17, 0.17, 0.9, [0, 0, 0], stone, 10) : s.box([1.25, 0.5, 0.42], [0, 0, 0], stone);
      lost.position.set(pivotX + 1.5 + random() * 2, T + (a.pallets === 'pins' ? 0.17 : 0.25), missing * (2.4 + random() * 1.2));
      lost.rotation.y = random() * 3;
      if (a.pallets === 'pins') lost.rotation.z = Math.PI / 2;
    }

    if (a.bridge && onPlate) {
      const texture = tile(finishTexture('stripes', '#dcb85c', random, mood.wear), 4, 0.9);
      const shape = new THREE.Shape();
      shape.absarc(0, -2.4, 0.95, Math.PI, 0, false);
      shape.absarc(0, 2.4, 0.95, 0, Math.PI, false);
      shape.closePath();
      const top = T + 2.0;
      const bridge = slab(s, shape, 0.45, s.material('#ffffff', { map: texture, metalness: 0.5, roughness: dull }), top, 0.06);
      bridge.position.x = pivotX + 0.55;
      for (const side of [-1, 1]) {
        s.cylinder(0.6, 0.6, top - T, [pivotX + 0.55, T + (top - T) / 2, side * 2.6], gold, 12);
        screw(s, [pivotX + 0.55, top + 0.45, side * 2.6], 0.5, blue, random() * 3);
      }
      s.cylinder(0.32, 0.32, 0.1, [pivotX, top + 0.47, 0], ruby, 14);
      bridge.rotation.y = 0;
    }

    // The roller table off the balance staff, whose jewel pin the fork flicks.
    const rollerX = pivotX + 6.55;
    if (a.roller) {
      s.cylinder(1.25, 1.25, 0.22, [rollerX, T + 1.55, 0], steel, 28);
      s.cylinder(0.7, 0.7, 0.2, [rollerX, T + 1.15, 0], steel, 20);
      s.cylinder(0.15, 0.15, 2.9, [rollerX, T + 1.45, 0], steel, 10);
      s.cylinder(0.13, 0.13, 0.75, [rollerX - 0.85, T + 1.15, 0], ruby, 3);
    }

    // Rest positions, then the tick.
    const swing = 0.15;
    const rest = (random() < 0.5 ? -1 : 1) * swing;
    const start = random() * step;
    wheel.rotation.y = start;
    fork.rotation.y = a.state === 'jammed' ? (rest > 0 ? 1 : -1) * 0.5 : a.state === 'stone' ? rest * 1.6 : rest;
    if (a.state === 'stone') wheel.rotation.y = random() * 6;
    if (!onPlate) {
      // Loose on the bench the parts lie flat, the fork nudged away from the wheel.
      fork.position.x += 0.9;
      fork.rotation.y += (random() - 0.5) * 0.5;
      wheel.position.y = 0.75 + 0.2;
      wheel.rotation.z = 0.07;
      fork.position.y = 0.3;
    }

    const ticking = a.state === 'ticking' && onPlate;
    const beat = mix(1.1, 0.16, mood.energy);
    s.root.scale.setScalar(0.05);
    return s.finish({
      update: ticking
        ? (_dt, time) => {
            const phase = time / beat, count = Math.floor(phase);
            const snap = Math.min(1, (phase - count) / 0.3);
            const eased = snap * snap * (3 - 2 * snap);
            wheel.rotation.y = start - (count + eased) * step * 0.5;
            const from = count % 2 === 0 ? -swing : swing;
            fork.rotation.y = from + (-from - from) * eased;
          }
        : undefined,
    });
  },
});
