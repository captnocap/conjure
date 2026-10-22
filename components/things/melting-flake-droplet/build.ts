import * as THREE from 'three';
import { choice, defineThing, mix, noul } from '@conjure/kit';
import { Bag, V, WOOL, crimp, finish, flake, flakePlan, ice, matte, plied, tube, xf } from './bits';

const LIGHTS = { sky: ['#9fb6c8', '#dfe9f0'], lamp: ['#d9a55a', '#fff0c8'], dusk: ['#7f86c4', '#e6dcf4'], morning: ['#e0a3a8', '#fff0ea'] } as const;

export default defineThing({
  questions: {
    stage: choice('How far gone is the flake?', {
      landed: 'Just landed: the crystal is whole, with only a small bead of water gathering under its centre.',
      half: 'Half gone: one side still stands out crisp in the air, the other has slumped into a dome of water.',
      ghost: 'Nearly gone: a full round droplet with the pale ghost of the six arms hanging inside it.',
      gone: 'Gone: a clear bead with one last speck of ice in it, and a trickle running off.',
    }),
    flake: choice('What kind of flake was it?', {
      fern: 'A feathery fern-armed dendrite.',
      stellar: 'A simple six-pointed star.',
      sector: 'A flower of six broad blades.',
      plated: 'Six spokes ending in little plates.',
    }),
    resting: choice('What is it resting on?', {
      fibres: 'A hammock of fine crossing wool fibres.',
      yarn: 'One fat strand of knitted yarn, soaking in.',
      fingertip: 'A bare fingertip, held up to look.',
      mitten: 'The rounded tip of a mittened finger.',
    }),
    dye: choice('If there is wool, what colour is it?', {
      charcoal: 'Charcoal grey.', navy: 'Navy blue.', oxblood: 'Oxblood red.', forest: 'Forest green.', mustard: 'Mustard yellow.', teal: 'Teal.',
    }),
    light: choice('What light is caught in the water?', {
      sky: 'Flat grey winter sky.',
      lamp: 'A warm lamp or a lit window.',
      dusk: 'Blue-violet dusk.',
      morning: 'Pink early morning.',
    }),
    runoff: noul('Have smaller beads already run off and settled beside it?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group(), wobble = new THREE.Group();
    const wool = new Bag(), skin = new Bag(), crisp = new Bag(), ghost = new Bag();
    const dye = new THREE.Color(WOOL[a.dye]).offsetHSL(0, (mood.cheer - 0.5) * 0.15, 0);
    const [deep, pale] = LIGHTS[a.light];
    const shade = (c: THREE.Color, amount = 0.1) => c.clone().offsetHSL(0, 0, (random() - 0.5) * amount);

    // ---- The support, and the height its top surface reaches under the bead. ----
    let seat = 0.05;
    if (a.resting === 'fibres') {
      const count = Math.round(mix(9, 18, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI + random() * 0.4, dir = V(Math.cos(angle), 0, Math.sin(angle)), off = (random() - 0.5) * 0.1;
        const side = V(-dir.z, 0, dir.x).multiplyScalar(off), dip = 0.06 - Math.abs(off) * 0.25;
        const pts = [dir.clone().multiplyScalar(-0.2).add(side).setY(0.003), dir.clone().multiplyScalar(-0.09).add(side).setY(dip + 0.01), side.clone().setY(dip - 0.012), dir.clone().multiplyScalar(0.09).add(side).setY(dip + 0.01), dir.clone().multiplyScalar(0.2).add(side).setY(0.003)];
        const path = new THREE.CatmullRomCurve3(pts).getPoints(36).map((p, k) => p.add(V(Math.sin(k * 1.3 + i) * 0.003, Math.cos(k * 1.7 + i) * 0.002, 0)));
        wool.add(tube(path, i < 3 ? 0.006 : 0.0034, { sides: 6 }), shade(dye, 0.14));
      }
      seat = 0.048;
    } else if (a.resting === 'yarn') {
      const path = [V(-0.22, 0.03, 0.03), V(-0.1, 0.036, -0.01), V(0, 0.04, 0), V(0.1, 0.036, 0.015), V(0.22, 0.03, -0.03)];
      for (const ply of [0, 1, 2]) {
        const pts = new THREE.CatmullRomCurve3(path).getPoints(48).map((p, k) => p.add(V(0, Math.sin(k * 0.8 + ply * 2.09) * 0.013, Math.cos(k * 0.8 + ply * 2.09) * 0.013)));
        wool.add(tube(pts, 0.019, { sides: 8, colour: plied(shade(dye, 0.05), 5) }));
      }
      for (let i = 0; i < 40; i++) {
        const x = (random() - 0.5) * 0.4, from = V(x, 0.04 + random() * 0.02, (random() - 0.5) * 0.04);
        wool.add(tube(crimp(from, from.clone().add(V((random() - 0.5) * 0.05, 0.02 + random() * 0.04, (random() - 0.5) * 0.06)), 0.004, 3, random, 0.2), 0.0016, { sides: 4 }), shade(dye, 0.2).offsetHSL(0, 0, 0.07));
      }
      seat = 0.07;
    } else {
      // A fingertip pointing up and a little forward: skin with a whorl, or a knitted cap of stitches.
      const flesh = new THREE.Color().setHSL(mix(0.02, 0.07, random()), 0.45, mix(0.42, 0.64, random())).offsetHSL(0, 0, (mood.warmth - 0.5) * 0.05);
      const tipGeometry = new THREE.SphereGeometry(1, 40, 28), p = tipGeometry.getAttribute('position');
      const colours = new Float32Array(p.count * 3), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (a.resting === 'fingertip') {
          // Fingerprint ridges ring the pad.
          const ring = Math.sin(Math.hypot(x, z * 0.8 - 0.1) * 40 + Math.atan2(z, x) * 1) > 0 ? 1 : -1;
          c.copy(flesh).offsetHSL(0, 0, y > 0.1 ? ring * 0.05 : 0).lerp(new THREE.Color('#c9584f'), Math.max(0, 0.25 - y * 0.2) * 0.5);
        } else {
          const row = Math.sin(y * 34) * 0.5 + Math.sin(Math.atan2(z, x) * 22) * 0.5;
          c.copy(dye).offsetHSL(0, 0, row * 0.07);
          const bump = 1 + row * 0.02;
          p.setXYZ(i, x * bump, y, z * bump);
        }
        colours.set([c.r, c.g, c.b], i * 3);
      }
      tipGeometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      tipGeometry.computeVertexNormals();
      const wide = a.resting === 'fingertip' ? 0.1 : 0.13, tall = 0.11, shaft = a.resting === 'fingertip' ? 0.14 : 0.08;
      skin.add(tipGeometry, null, xf(V(0, shaft, 0), V(wide, tall * 0.9, wide * 0.92)));
      skin.add(new THREE.CylinderGeometry(wide * 0.995, wide * 1.04, shaft, 40, 1, true), a.resting === 'fingertip' ? flesh : dye, xf(V(0, shaft / 2, 0), V(1, 1, 0.92)));
      if (a.resting === 'fingertip') for (const y of [0.02, 0.032]) skin.add(new THREE.TorusGeometry(wide * 1.02, 0.0025, 5, 40), flesh.clone().offsetHSL(0, 0, -0.1), xf(V(0, y, 0), V(1, 1, 0.92), new THREE.Euler(Math.PI / 2, 0, 0)));
      if (a.resting === 'fingertip') skin.add(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), flesh.clone().lerp(new THREE.Color('#f3dccf'), 0.6), xf(V(0, shaft + tall * 0.3, -wide * 0.78), V(wide * 0.66, tall * 0.62, wide * 0.22), new THREE.Euler(-0.25, 0, 0)));
      else for (let i = 0; i < 46; i++) {
        const angle = random() * Math.PI * 2, up = random(), r = wide * Math.sqrt(Math.max(0.05, 1 - (up * 0.9) ** 2)) * (up > 0.5 ? 1 : 1.01);
        const from = V(Math.cos(angle) * r, shaft * 0.4 + tall * up * 0.86, Math.sin(angle) * r * 0.92);
        wool.add(tube(crimp(from, from.clone().add(V(Math.cos(angle) * 0.03, 0.01 + random() * 0.03, Math.sin(angle) * 0.03)), 0.004, 3, random, 0.2), 0.0018, { sides: 4 }), shade(dye, 0.2).offsetHSL(0, 0, 0.08));
      }
      seat = shaft + tall * 0.88;
    }

    // ---- The flake and the water it is becoming. ----
    const stage = a.stage, lush = { landed: 0.7, half: 0.6, ghost: 0.35, gone: 0 }[stage];
    const R = { landed: 0.14, half: 0.13, ghost: 0.072, gone: 0.02 }[stage];
    const dropR = { landed: 0.036, half: 0.085, ghost: 0.1, gone: 0.092 }[stage] * mix(0.92, 1.1, mood.warmth);
    const dropAt = V(stage === 'half' ? 0.05 : 0, seat + dropR * 0.3, stage === 'half' ? 0.03 : 0);
    const plan = flakePlan(stage === 'gone' ? 'stellar' : a.flake, lush, random);
    const lean = stage === 'half' ? 0.22 : stage === 'landed' ? 0.08 : 0.3;
    const flakeAt = stage === 'landed' ? V(0, seat + dropR * 0.9, 0) : stage === 'half' ? V(-0.015, seat + dropR * 0.5, 0) : dropAt.clone().add(V(0, dropR * 0.12, 0));
    const m = xf(flakeAt, R, new THREE.Euler(-Math.PI / 2 + lean, 0, random()));
    const inWater = stage === 'ghost' || stage === 'gone';
    const tones = inWater ? ['#f2f8fc', '#ffffff', '#ffffff', '#e2eef6'] : ['#3f7fc0', '#74aee0', '#bcdcf3', '#2f6aa8'];
    const { tips } = flake(inWater ? ghost : crisp, plan, { matrix: m, tone: (depth) => tones[depth], thick: inWater ? 0.1 : 0.055, random, rough: stage === 'landed' ? mood.wear * 0.3 : 0.5 });
    // Where an arm has reached the water it ends in a bead.
    const beads = new Bag(), bead = new THREE.Color(deep).lerp(new THREE.Color(pale), 0.35);
    const water = new THREE.MeshPhysicalMaterial({ color: deep, transparent: true, opacity: inWater ? 0.5 : 0.62, roughness: 0.04, clearcoat: 1, emissive: deep, emissiveIntensity: mix(0.15, 0.4, mood.cheer) });
    const solidWater = new THREE.MeshPhysicalMaterial({ roughness: 0.04, clearcoat: 1, emissive: deep, emissiveIntensity: 0.25 });
    if (stage === 'half' || stage === 'landed') for (const tip of tips) if (stage === 'half' ? tip.distanceTo(dropAt) > dropR * 1.1 && random() < 0.6 : random() < 0.4) beads.add(new THREE.SphereGeometry(1, 10, 8), bead, xf(tip, R * (0.05 + random() * 0.05)));

    const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), water);
    dome.scale.set(dropR, dropR * (stage === 'landed' ? 0.55 : 0.64), dropR);
    dome.position.copy(dropAt);
    dome.castShadow = true;
    wobble.add(dome);
    // Catch-lights: a window on the shoulder and a rim of light opposite.
    const glint = new Bag();
    glint.add(new THREE.SphereGeometry(1, 12, 8), pale, xf(dropAt.clone().add(V(-dropR * 0.42, dropR * 0.42, dropR * 0.5)), V(dropR * 0.2, dropR * 0.1, dropR * 0.14), new THREE.Euler(0.6, 0.5, 0.5)));
    glint.add(new THREE.SphereGeometry(1, 10, 6), pale, xf(dropAt.clone().add(V(dropR * 0.55, dropR * 0.14, dropR * 0.62)), V(dropR * 0.06, dropR * 0.05, dropR * 0.05)));
    glint.into(wobble, new THREE.MeshStandardMaterial({ emissive: pale, emissiveIntensity: 0.9, roughness: 0.2 }));

    if (stage === 'gone' || a.runoff) {
      const count = stage === 'gone' ? 5 : 3 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = 0.4 + random() * 2.2, d = dropR * (1.25 + i * 0.4 + random() * 0.3), r = dropR * mix(0.3, 0.1, i / count);
        const y = a.resting === 'fingertip' || a.resting === 'mitten' ? Math.max(0.02, seat - d * d * 9) : seat * (1 - d * 1.6) + r * 0.4;
        beads.add(new THREE.SphereGeometry(1, 14, 10), bead, xf(V(Math.cos(angle) * d, Math.max(r * 0.6, y), Math.sin(angle) * d * 0.8 + 0.01), V(r, r * 0.75, r)));
      }
    }

    wool.into(root, matte({ roughness: 0.95 }));
    skin.into(root, matte({ roughness: a.resting === 'fingertip' ? 0.55 : 0.95 }));
    ghost.into(wobble, matte({ roughness: 0.5, emissive: '#dbe8f2', emissiveIntensity: 0.45 }));
    crisp.into(wobble, ice(mix(0.04, 0.16, mood.cheer)));
    beads.into(wobble, solidWater);
    root.add(wobble);

    const pace = mix(0.6, 5, mood.energy), amount = mix(0.004, 0.035, mood.energy), sy = dome.scale.y;
    return finish(root, (_dt, time) => {
      const s = Math.sin(time * pace) * amount;
      dome.scale.set(dropR * (1 - s * 0.5), sy * (1 + s), dropR * (1 - s * 0.5));
    }, 0.16);
  },
});
