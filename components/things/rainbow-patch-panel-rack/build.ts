import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

function instanced(geometry: THREE.BufferGeometry, material: THREE.Material, matrices: readonly THREE.Matrix4[], colours?: readonly THREE.Color[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
  mesh.count = matrices.length;
  matrices.forEach((m, i) => {
    mesh.setMatrixAt(i, m);
    if (colours) mesh.setColorAt(i, colours[i]);
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

const PALETTES = {
  rainbow: ['#e8302a', '#f08a1c', '#f2d21c', '#30b84a', '#2a6fd6', '#8a46c8', '#20b8c8', '#f2f2ea'],
  blueyellow: ['#2a6fd6', '#2a6fd6', '#f2d21c', '#2a6fd6', '#f2d21c', '#3b78cc'],
  grey: ['#a8acb0', '#8c9094', '#b8bcc0', '#9a9ea2'],
  trunk: ['#e8302a', '#2a6fd6', '#30b84a', '#e8302a', '#2a6fd6', '#30b84a'],
} as const;

const U = 0.04445, INNER = 0.465;

export default defineThing({
  questions: {
    style: choice('How are the cables run?', {
      neat: 'Neat colour-coded vertical loops through the management rings, every cable the same length.',
      mostly: 'Mostly neat, with a handful of strays crossing over.',
      nest: 'A chaotic bird\'s nest, loops bulging out in every direction.',
    }),
    height: score('How tall is the rack?', ['A half-height rack to the waist', 'A full rack, head high', 'A tall rack to the ceiling']),
    colours: choice('What colours are the patch cables?', {
      rainbow: 'Every colour, blocks of red, orange, yellow, green, blue, purple.',
      blueyellow: 'Blue data cables with yellow crossover leads.',
      grey: 'All grey, an old installation.',
      trunk: 'Red, blue and green trunks only.',
    }),
    lights: choice('How are the port lights?', {
      green: 'All steady green, everything fine.',
      busy: 'Green and amber flickering, traffic everywhere.',
      trouble: 'One switch all amber, something wrong there.',
      dead: 'One switch dark with its cables still plugged in.',
    }),
    tagged: noul('Does one cable dangle unplugged with a tag reading DO NOT UNPLUG?'),
    gear: noul('Do a label printer and spare cable coils hang off the side?'),
    frame: choice('What kind of frame?', {
      twopost: 'A two-post open relay rack bolted to the floor.',
      fourpost: 'A four-post open frame on levelling feet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const units = [26, 42, 48][Math.min(2, Math.round(a.height * 2))];
    const H = units * U + 0.1;
    const steel = s.material('#2b2d31', { metalness: 0.5, roughness: 0.5 });
    const postX = INNER / 2 + 0.028;
    const postZ = a.frame === 'twopost' ? [0] : [-0.3, 0.1];
    for (const x of [-1, 1]) for (const z of postZ) {
      s.box([0.05, H, 0.045], [x * postX, H / 2, z], steel);
      if (a.frame === 'twopost') s.box([0.3, 0.02, 0.4], [x * postX, 0.01, 0], steel);
      else s.cylinder(0.02, 0.025, 0.02, [x * postX, 0.01, z], steel, 10);
    }
    if (a.frame === 'fourpost') for (const y of [0.03, H - 0.03]) for (const x of [-1, 1]) s.box([0.04, 0.04, 0.44], [x * postX, y, -0.1], steel);
    s.box([INNER + 0.1, 0.04, 0.045], [0, H - 0.02, postZ[0]], steel);
    // Mounting holes down each post.
    const holes: THREE.Matrix4[] = [];
    for (let u = 0; u < units; u++) for (const k of [0.16, 0.5, 0.84]) for (const x of [-1, 1]) holes.push(new THREE.Matrix4().makeScale(0.01, 0.01, 0.004).setPosition(x * (postX - 0.012), 0.05 + (u + k) * U, postZ[0] + 0.024));
    s.root.add(instanced(new THREE.BoxGeometry(1, 1, 1), s.material('#0c0c0e'), holes));

    // Equipment in blocks of four: panel, ring, switch, ring, with a gap now and then.
    const front = postZ[0] + 0.03;
    const panelMat = s.material('#2e3034', { metalness: 0.4, roughness: 0.5 });
    const switchMat = s.material('#1c1e22', { metalness: 0.3, roughness: 0.55 });
    const ringMat = s.material('#141416', { roughness: 0.7 });
    const panels: THREE.Matrix4[] = [], switches: THREE.Matrix4[] = [], bars: THREE.Matrix4[] = [], rings: THREE.Matrix4[] = [], ports: THREE.Matrix4[] = [], strips: THREE.Matrix4[] = [];
    const leds: { m: THREE.Matrix4; colour: THREE.Color; base: THREE.Color; busy: boolean }[] = [];
    const pairs: { panelY: number; switchY: number; ringY: number }[] = [];
    const green = new THREE.Color('#2cff5c'), amber = new THREE.Color('#ffb020'), off = new THREE.Color('#1a1c1e');
    const deadSwitch = a.lights === 'dead' ? Math.floor(random() * Math.floor((units - 2) / 4)) : -1;
    const troubleSwitch = a.lights === 'trouble' ? Math.floor(random() * Math.floor((units - 2) / 4)) : -1;
    let u = 1, block = 0;
    const yOf = (unit: number) => 0.05 + (unit + 0.5) * U;
    while (u + 4 <= units - 1) {
      if (block > 0 && random() < 0.18) { u += 1; if (u + 4 > units - 1) break; }
      const panelY = yOf(u + 3), ringTop = yOf(u + 2), switchY = yOf(u + 1), ringBottom = yOf(u);
      panels.push(new THREE.Matrix4().makeTranslation(0, panelY, front - 0.05));
      strips.push(new THREE.Matrix4().makeTranslation(0, panelY - 0.016, front + 0.0015));
      for (let p = 0; p < 24; p++) ports.push(new THREE.Matrix4().makeTranslation(-INNER / 2 + 0.03 + p * 0.0175, panelY + 0.004, front + 0.001));
      for (const ringY of [ringTop, ringBottom]) {
        bars.push(new THREE.Matrix4().makeTranslation(0, ringY, front - 0.01));
        for (let r = 0; r < 5; r++) rings.push(new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(-INNER / 2 + 0.06 + r * 0.085, ringY, front + 0.035));
      }
      switches.push(new THREE.Matrix4().makeTranslation(0, switchY, front - 0.13));
      const state = block === deadSwitch ? 'dead' : block === troubleSwitch ? 'trouble' : a.lights;
      for (let p = 0; p < 24; p++) {
        ports.push(new THREE.Matrix4().makeTranslation(-INNER / 2 + 0.03 + p * 0.0175, switchY - 0.006, front + 0.001));
        const lit = state === 'dead' ? off : state === 'trouble' ? amber : state === 'busy' ? (random() < 0.5 ? green : amber) : green;
        leds.push({ m: new THREE.Matrix4().makeScale(0.006, 0.004, 0.003).setPosition(-INNER / 2 + 0.03 + p * 0.0175, switchY + 0.012, front + 0.0015), colour: lit.clone(), base: lit, busy: state === 'busy' || (state === 'green' && random() < 0.25) });
      }
      leds.push({ m: new THREE.Matrix4().makeScale(0.008, 0.005, 0.003).setPosition(INNER / 2 - 0.02, switchY + 0.01, front + 0.0015), colour: (state === 'dead' ? off : green).clone(), base: state === 'dead' ? off : green, busy: false });
      pairs.push({ panelY, switchY, ringY: ringTop });
      u += 4;
      block++;
    }
    s.root.add(instanced(new THREE.BoxGeometry(INNER + 0.04, U - 0.004, 0.1), panelMat, panels));
    s.root.add(instanced(new THREE.BoxGeometry(INNER + 0.04, U - 0.004, 0.26), switchMat, switches));
    s.root.add(instanced(new THREE.BoxGeometry(INNER + 0.04, U - 0.006, 0.02), ringMat, bars));
    s.root.add(instanced(new THREE.TorusGeometry(0.02, 0.004, 6, 14), ringMat, rings));
    s.root.add(instanced(new THREE.BoxGeometry(0.013, 0.011, 0.004), s.material('#08090b'), ports));
    s.root.add(instanced(new THREE.BoxGeometry(INNER - 0.02, 0.007, 0.002), s.material('#f2f2ea'), strips));
    const ledMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), leds.map((l) => l.m), leds.map((l) => l.colour));
    ledMesh.castShadow = false;
    s.root.add(ledMesh);

    // Patch cables: every one a tube, merged by colour so hundreds cost a handful of draws.
    const palette = PALETTES[a.colours];
    const byColour = new Map<string, THREE.BufferGeometry[]>();
    const cable = (points: P3[], colour: string, radius = 0.0032) => {
      const path = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const geometry = new THREE.TubeGeometry(path, 14, radius, 5, false);
      if (!byColour.has(colour)) byColour.set(colour, []);
      byColour.get(colour)!.push(geometry);
    };
    const portX = (p: number) => -INNER / 2 + 0.03 + p * 0.0175;
    const fill = mix(0.45, 1, mood.density);
    const strayChance = { neat: 0, mostly: 0.12, nest: 1 }[a.style];
    let dangle: { x: number; y: number } | null = null;
    pairs.forEach((pair, blockIndex) => {
      for (let p = 0; p < 24; p++) {
        if (random() > fill) continue;
        const x = portX(p);
        const colour = a.style === 'nest' ? pick(palette) : palette[(Math.floor(p / 4) + blockIndex) % palette.length];
        if (a.tagged && !dangle && blockIndex === Math.floor(pairs.length / 2) && p === 7) { dangle = { x, y: pair.panelY }; continue; }
        if (random() < strayChance) {
          // A stray: off to some other block, bulging out of the frame.
          const other = pairs[Math.floor(random() * pairs.length)];
          const toX = portX(Math.floor(random() * 24));
          const bulge = 0.08 + random() * (a.style === 'nest' ? 0.22 : 0.1);
          cable([[x, pair.panelY + 0.004, front], [x + (random() - 0.5) * 0.1, pair.panelY + (random() - 0.5) * 0.1, front + bulge], [(x + toX) / 2 + (random() - 0.5) * 0.3, (pair.panelY + other.switchY) / 2, front + bulge * 1.2], [toX + (random() - 0.5) * 0.1, other.switchY + (random() - 0.5) * 0.1, front + bulge], [toX, other.switchY - 0.006, front]], colour);
        } else {
          const out = 0.05 + (p % 3) * 0.008;
          cable([[x, pair.panelY + 0.004, front], [x, pair.panelY, front + out], [x + (random() - 0.5) * 0.01, pair.ringY, front + out + 0.01], [x, pair.switchY, front + out], [x, pair.switchY - 0.006, front]], colour);
        }
      }
    });
    if (dangle) {
      const { x, y } = dangle as { x: number; y: number };
      const endY = Math.max(0.12, y - 0.5 - random() * 0.3);
      const tagColour = '#f2d21c';
      cable([[x, y + 0.004, front], [x + 0.02, y - 0.02, front + 0.12], [x + 0.05, (y + endY) / 2, front + 0.16], [x + 0.03, endY + 0.03, front + 0.14], [x + 0.02, endY, front + 0.13]], tagColour, 0.0036);
      s.box([0.013, 0.02, 0.011], [x + 0.02, endY - 0.01, front + 0.13], s.material('#dfe3e6', { metalness: 0.2, roughness: 0.4 }));
      const tag = s.label('DO NOT UNPLUG', 0.1, 0.045, [x + 0.045, endY - 0.05, front + 0.135], '#b02020', '#f6f3ea');
      tag.rotation.z = -0.25;
      s.rod([x + 0.02, endY - 0.015, front + 0.13], [x + 0.03, endY - 0.03, front + 0.135], 0.0012, s.material('#f2f2ea'));
    }
    for (const [colour, geometries] of byColour) {
      const merged = mergeGeometries(geometries);
      for (const g of geometries) g.dispose();
      s.mesh(merged, s.material(colour, { roughness: 0.5 }));
    }

    if (a.gear) {
      const side = random() < 0.5 ? -1 : 1;
      const sx = side * (postX + 0.03);
      s.box([0.012, 0.3, 0.012], [sx, H * 0.55, postZ[0] + 0.03], steel);
      const printer = s.box([0.09, 0.16, 0.05], [sx + side * 0.05, H * 0.55 - 0.1, postZ[0] + 0.03], s.material('#3a3c40', { roughness: 0.5 }));
      printer.rotation.z = side * 0.05;
      s.box([0.07, 0.03, 0.052], [sx + side * 0.05, H * 0.55 - 0.05, postZ[0] + 0.03], s.material('#1c1c1e'));
      s.box([0.03, 0.002, 0.02], [sx + side * 0.05, H * 0.55 - 0.09, postZ[0] + 0.056], s.material('#f2d21c'));
      s.label('A1-07', 0.05, 0.015, [sx + side * 0.05, H * 0.55 - 0.03, postZ[0] + 0.057], '#1c1c1e', '#f2d21c');
      for (let i = 0; i < 3; i++) {
        const coilColour = pick(palette);
        const cy = H * 0.3 - i * 0.02, cz = postZ[0] + 0.03 + (i - 1) * 0.03;
        const loops: P3[] = [];
        for (let k = 0; k < 20; k++) loops.push([sx + side * 0.04 + Math.cos(k * 0.7) * 0.05, cy - Math.abs(Math.sin(k * 0.7)) * 0.11, cz + Math.sin(k * 0.7) * 0.02]);
        s.tube(loops, 0.003, s.material(coilColour, { roughness: 0.5 }));
      }
      s.rod([sx, H * 0.3 + 0.06, postZ[0] + 0.03], [sx, H * 0.3 + 0.02, postZ[0] + 0.03], 0.004, steel);
    }

    // The port lights blink, more of them and faster with the scene's energy.
    const rate = mix(1.5, 9, mood.energy);
    const scratch = new THREE.Color();
    let last = -1;
    return s.finish({
      update(_dt, time) {
        const tick = Math.floor(time * rate);
        if (tick === last) return;
        last = tick;
        leds.forEach((led, i) => {
          if (!led.busy) return;
          const on = ((tick * 7 + i * 13) % 11) > 3;
          scratch.copy(led.base).multiplyScalar(on ? 1 : 0.18);
          ledMesh.setColorAt(i, scratch);
        });
        ledMesh.instanceColor!.needsUpdate = true;
      },
    });
  },
});
