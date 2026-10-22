import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { strands, wobble } from './head';

const SPECIES = {
  chimp: 'A chimpanzee: big round ears, tan face, long upper lip, clever and familiar.',
  gorilla: 'A gorilla: black leather face, heavy brow, tall crested skull, wide nostrils.',
  orangutan: 'An orangutan: wide flat cheek pads, a small sad face in the middle and a straggling beard.',
  mandrill: 'A mandrill: long muzzle with a scarlet nose stripe, ridged blue cheeks and a yellow beard.',
  capuchin: 'A small capuchin: pink face in a white ruff with a dark cap, an organ-grinder’s monkey.',
  'winged-bellhop': 'A winged monkey in a red bellhop pillbox hat with a pair of feathered wings, from a storybook witch’s castle.',
} as const;
type Species = keyof typeof SPECIES;
interface Shape { cran: [number, number, number]; muzzle: [number, number, number]; ear: number; brow: number; face: string; snout: string; crest: number; size: number }
const SHAPES: Record<Species, Shape> = {
  chimp: { cran: [0.092, 0.098, 0.1], muzzle: [0.06, 0.046, 0.058], ear: 0.04, brow: 1, face: '#b58a6c', snout: '#cfa888', crest: 0, size: 1 },
  gorilla: { cran: [0.108, 0.108, 0.115], muzzle: [0.068, 0.046, 0.046], ear: 0.017, brow: 1.6, face: '#2c2b2e', snout: '#3a383b', crest: 0.07, size: 1.12 },
  orangutan: { cran: [0.09, 0.104, 0.098], muzzle: [0.056, 0.056, 0.05], ear: 0.012, brow: 0.7, face: '#5b4a45', snout: '#927565', crest: 0.02, size: 1.05 },
  mandrill: { cran: [0.082, 0.088, 0.098], muzzle: [0.042, 0.046, 0.1], ear: 0.02, brow: 1.3, face: '#3b3835', snout: '#3b3835', crest: 0.03, size: 1 },
  capuchin: { cran: [0.085, 0.088, 0.088], muzzle: [0.042, 0.036, 0.036], ear: 0.026, brow: 0.6, face: '#e3c2a4', snout: '#edd3ba', crest: 0, size: 0.78 },
  'winged-bellhop': { cran: [0.09, 0.096, 0.098], muzzle: [0.058, 0.046, 0.056], ear: 0.042, brow: 1.1, face: '#7f93a6', snout: '#9db0bf', crest: 0, size: 1 },
};
const FURS = {
  black: 'Glossy black.',
  chestnut: 'Warm chestnut brown.',
  'orange-red': 'Shaggy orange-red.',
  silver: 'Grizzled silver-grey, an old silverback.',
  white: 'Snow white, a yeti or albino.',
  golden: 'Golden blond.',
} as const;
const FUR_TINT: Record<keyof typeof FURS, string> = { black: '#1d1b1c', chestnut: '#6a3f24', 'orange-red': '#c4581c', silver: '#9a9ca0', white: '#efece4', golden: '#d2a54a' };

export default defineThing({
  questions: {
    species: choice('What species is the mask?', SPECIES),
    expression: choice('What expression was it sculpted with?', {
      calm: 'Calm and watchful, mouth closed.',
      snarling: 'Snarling: brows down, jaw open, canines bared.',
      laughing: 'Laughing: jaw dropped wide open, brows up, a hooting grin.',
      mournful: 'Mournful: brows tilted, mouth turned down, old and tired.',
    }),
    fur: choice('What colour is the punched hair?', FURS),
    build: choice('How far along is the build?', {
      sculpt: 'A bare sculpt in cream foam latex: no hair, no paint, empty eye holes.',
      'half-haired': 'Half-haired: painted skin, hair punched on one side only, pins marking the rest.',
      finished: 'Finished: full coat, glass eyes in, ready for the actor.',
    }),
    eyes: choice('If the glass eyes are in, what are they like?', {
      amber: 'Warm amber glass, wet and thoughtful.',
      'pale-blue': 'Unsettling pale blue, almost human.',
      'glowing-red': 'Glowing red, a villain’s creature.',
      'black-button': 'Shiny black beads, toy-like.',
    }),
    rig: choice('How is it held and worked?', {
      wire: 'A simple bent-wire armature on a wooden base.',
      servo: 'An animatronic rig: cables run down to a control box, and the jaw works on its own.',
      tripod: 'Perched on a light-stand tripod, about to go to set.',
    }),
    beside: choice('What has been left beside it?', {
      hair: 'A hank of loose hair and a punching needle.',
      teeth: 'A spare set of acrylic teeth.',
      banana: 'A banana. Somebody on the crew thinks they are funny.',
      nothing: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const shape = SHAPES[a.species];
    const [cw, ch, cd] = shape.cran, [mw, mh, md] = shape.muzzle;
    const bare = a.build === 'sculpt';
    const foam = '#dccb9c';
    const paint = (tint: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: bare ? foam : tint, roughness: bare ? 0.95 : 0.7, ...extra });
    const furTint = new THREE.Color(FUR_TINT[a.fur]);
    const fur = paint(`#${furTint.clone().multiplyScalar(0.8).getHexString()}`, { roughness: 0.95 });
    const face = paint(shape.face), snout = paint(shape.snout);
    const dark = new THREE.MeshStandardMaterial({ color: '#170f10', roughness: 0.9 });
    const steel = s.material('#8e9499', { metalness: 0.75, roughness: 0.35 });
    const wood = s.material('#b89464');

    // Stand.
    const HY = a.rig === 'tripod' ? 0.52 : 0.36;
    if (a.rig === 'tripod') {
      for (let i = 0; i < 3; i++) { const t = i / 3 * Math.PI * 2 + 0.5; s.rod([Math.cos(t) * 0.2, 0.006, Math.sin(t) * 0.2], [0, 0.2, 0], 0.007, s.material('#222426')); }
      s.rod([0, 0.1, 0], [0, HY, 0], 0.009, steel);
      s.cylinder(0.016, 0.016, 0.03, [0, 0.21, 0], s.material('#222426'), 12);
    } else {
      s.box([0.34, 0.022, 0.28], [0, 0.011, 0], wood);
      s.cylinder(0.022, 0.03, 0.02, [0, 0.032, -0.02], steel, 16);
      s.rod([0, 0.03, -0.02], [0, HY, -0.02], 0.006, steel);
    }
    const base = a.rig === 'tripod' ? 0 : 0.022;
    const head = new THREE.Group();
    head.position.set(0, HY, 0);
    head.scale.setScalar(shape.size);
    head.rotation.x = { calm: 0, snarling: 0.1, laughing: -0.22, mournful: 0.16 }[a.expression];
    head.rotation.z = (random() - 0.5) * 0.12;
    s.root.add(head);
    const part = (geo: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1], parent: THREE.Object3D = head) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(...at);
      mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = () => new THREE.SphereGeometry(1, 20, 14);
    // Wire armature showing under and behind the mask.
    for (const turn of [0, Math.PI / 2]) { const loop = part(new THREE.TorusGeometry(0.06, 0.003, 6, 28), steel, [0, -0.04, -0.03]); loop.rotation.y = turn; loop.scale.y = 1.3; }
    part(new THREE.TorusGeometry(0.055, 0.003, 6, 28), steel, [0, -0.1, -0.03]).rotation.x = Math.PI / 2;

    // Skull, face plate, muzzle.
    part(ball(), fur, [0, 0.02, -0.02], [cw, ch, cd]);
    if (shape.crest) part(ball(), fur, [0, ch * 0.75, -cd * 0.35], [cw * 0.55, shape.crest, cd * 0.7]);
    part(ball(), face, [0, 0, cd * 0.52], [cw * 0.8, ch * 0.78, cd * 0.5]);
    const muzzleZ = cd * 0.86;
    const muzzle = part(ball(), snout, [0, -ch * 0.33, muzzleZ], [mw, mh, md]);
    if (a.expression === 'snarling') muzzle.position.y += 0.006;
    // Nostrils.
    for (const x of [1, -1]) part(ball(), dark, [x * mw * 0.2, -ch * 0.33 + mh * 0.45, muzzleZ + md * 0.78], [mw * (a.species === 'gorilla' ? 0.2 : 0.11), mh * 0.14, 0.006]).rotation.z = x * 0.5;
    if (a.species === 'mandrill' && !bare) {
      part(ball(), paint('#d0262c'), [0, -ch * 0.25 + mh * 0.5, muzzleZ + md * 0.25], [mw * 0.24, mh * 0.5, md * 0.85]);
      for (const x of [1, -1]) for (let i = 0; i < 4; i++) part(ball(), paint(i % 2 ? '#3f79c9' : '#7fb0e6'), [x * mw * (0.55 + i * 0.08), -ch * 0.3 + mh * 0.35 - i * 0.004, muzzleZ + md * 0.2], [mw * 0.12, mh * 0.32, md * 0.75]);
    }
    if (a.species === 'orangutan') for (const x of [1, -1]) part(ball(), face, [x * cw * 0.98, -0.01, cd * 0.2], [cw * 0.42, ch * 0.9, cd * 0.2]).rotation.y = x * 0.35;
    // Brow and eyes.
    const browTilt = { calm: 0, snarling: -0.4, laughing: 0.22, mournful: 0.42 }[a.expression];
    const browLift = { calm: 0, snarling: -0.006, laughing: 0.008, mournful: 0.004 }[a.expression];
    const eyeTint = { amber: '#c9862a', 'pale-blue': '#a9cfe6', 'glowing-red': '#ff2a18', 'black-button': '#0c0c0e' }[a.eyes];
    const glass = new THREE.MeshStandardMaterial({ color: eyeTint, roughness: 0.08, emissive: eyeTint, emissiveIntensity: a.eyes === 'glowing-red' ? 1.1 : 0.15 });
    for (const x of [1, -1]) {
      const brow = part(ball(), paint(shape.face), [x * cw * 0.36, ch * 0.3 + browLift, cd * 0.93], [cw * 0.44, ch * 0.13 * shape.brow, cd * 0.2]);
      brow.rotation.z = x * browTilt;
      part(ball(), dark, [x * cw * 0.36, ch * 0.13, cd * 0.93], [cw * 0.24, ch * 0.15, 0.012]);
      if (!bare) {
        const squint = a.expression === 'laughing' ? 0.55 : 1;
        part(ball(), glass, [x * cw * 0.36, ch * 0.13, cd * 0.95], [0.0135, 0.0135 * squint, 0.011]);
        if (a.eyes !== 'black-button' && a.eyes !== 'glowing-red') part(ball(), dark, [x * cw * 0.36, ch * 0.13, cd * 0.95 + 0.009], [0.006, 0.006 * squint, 0.004]);
      }
      // Ears.
      const ear = part(ball(), face, [x * (cw + shape.ear * 0.45), ch * 0.1, -0.005], [shape.ear * 0.3, shape.ear, shape.ear * 0.8]);
      ear.rotation.y = x * 0.5;
      part(ball(), dark, [x * (cw + shape.ear * 0.5), ch * 0.1, shape.ear * 0.2], [shape.ear * 0.14, shape.ear * 0.6, shape.ear * 0.45]).rotation.y = x * 0.5;
    }
    // Jaw on its hinge.
    const jaw = new THREE.Group();
    jaw.position.set(0, -ch * 0.42, cd * 0.15);
    head.add(jaw);
    const jl = muzzleZ + md * 0.9 - cd * 0.15;
    part(ball(), snout, [0, -mh * 0.5, jl * 0.6], [mw * 0.86, mh * 0.5, jl * 0.52], jaw);
    part(ball(), new THREE.MeshStandardMaterial({ color: '#7a1f26', roughness: 0.5 }), [0, -mh * 0.22, jl * 0.6], [mw * 0.6, mh * 0.2, jl * 0.42], jaw);
    const ivory = paint('#efe6c8', { roughness: 0.35 });
    const tooth = new THREE.BoxGeometry(1, 1, 1), fang = new THREE.ConeGeometry(1, 1, 8);
    const fangLength = (a.species === 'mandrill' ? 0.034 : a.species === 'gorilla' ? 0.024 : 0.018) * (a.species === 'capuchin' ? 0.7 : 1);
    for (let i = -3; i <= 3; i++) {
      const t = i / 3 * 1.1, x = Math.sin(t) * mw * 0.62, z = jl * 0.6 + Math.cos(t) * jl * 0.36;
      if (Math.abs(i) === 3) {
        part(fang, ivory, [x, -mh * 0.2 + fangLength * 0.4, z], [0.005, fangLength * 0.8, 0.005], jaw);
        part(fang, ivory, [x * 0.95, -ch * 0.33 - mh * 0.55, muzzleZ - cd * 0.15 + jaw.position.z + (z - jl * 0.6) + md * 0.3], [0.0055, fangLength, 0.0055]).rotation.x = Math.PI;
      } else {
        part(tooth, ivory, [x, -mh * 0.2, z], [0.0085, 0.011, 0.005], jaw).rotation.y = t;
        part(tooth, ivory, [x, -ch * 0.33 - mh * 0.62, muzzleZ + Math.cos(t) * md * 0.72], [0.009, 0.012, 0.005]).rotation.y = t;
      }
    }
    const open = { calm: 0.03, snarling: 0.42, laughing: 0.7, mournful: 0.0 }[a.expression];
    jaw.rotation.x = open;
    if (a.expression === 'mournful') for (const x of [1, -1]) part(ball(), dark, [x * mw * 0.75, -ch * 0.42 - mh * 0.2, muzzleZ + md * 0.3], [0.004, 0.012, 0.004]).rotation.z = x * -0.6;

    // Hair punching.
    const seed = random() * 30, side = random() < 0.5 ? 1 : -1;
    const haired = (x: number, y: number, z: number) => a.build === 'finished' || (a.build === 'half-haired' && side * x + 0.25 * wobble(x, y, z, seed) < 0.05);
    const hairs: Parameters<typeof strands>[0][number][] = [];
    const pins: { at: [number, number, number]; size: number; color: string }[] = [];
    const shag = a.species === 'orangutan' ? 1.7 : a.species === 'capuchin' ? 0.7 : 1;
    for (let i = 0; i < 900; i++) {
      const t = random() * Math.PI * 2, y = mix(-0.75, 1, random()), r = Math.sqrt(1 - y * y), x = Math.cos(t) * r, z = Math.sin(t) * r;
      if (z > 0.5 && y < 0.62 && Math.abs(x) < 0.72) continue;
      const at = new THREE.Vector3(x * cw, 0.02 + y * ch, -0.02 + z * cd);
      if (!bare && !haired(x, y, z)) { if (a.build === 'half-haired' && pins.length < 26 && random() < 0.12) pins.push({ at: at.clone().multiplyScalar(1.08).toArray() as [number, number, number], size: 0.004, color: ['#e23b3b', '#f2d13c', '#3b7de2', '#ffffff'][pins.length % 4] }); continue; }
      if (bare) continue;
      const tint = a.species === 'capuchin' && (y < 0.45 && z > -0.2) ? 1 : 0;
      hairs.push({ at, dir: new THREE.Vector3(x * 0.9, y * 0.5 - 0.55, z * 0.9 - 0.5).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.5)), length: mix(0.028, 0.055, random()) * shag * (tint ? 0.8 : 1), width: mix(0.005, 0.009, random()) });
    }
    // Beards and ruffs.
    const beard = { chimp: 0.4, gorilla: 0.2, orangutan: 1.6, mandrill: 1.3, capuchin: 0.5, 'winged-bellhop': 0.6 }[a.species];
    const beardHairs: typeof hairs = [];
    if (!bare) for (let i = 0; i < 110 * beard; i++) {
      const t = mix(-1.5, 1.5, random()), x = Math.sin(t);
      if (!haired(x, -0.8, 0.3)) continue;
      beardHairs.push({ at: new THREE.Vector3(x * cw * 0.85, -ch * mix(0.55, 0.85, random()), cd * mix(0.1, 0.55, random()) * Math.cos(t * 0.6)), dir: new THREE.Vector3(x * 0.3, -1, 0.2 + (random() - 0.5) * 0.4), length: mix(0.03, 0.06, random()) * beard, width: 0.007 });
    }
    const furMat = new THREE.MeshStandardMaterial({ color: furTint, roughness: 0.85 });
    if (hairs.length) head.add(strands(hairs, furMat));
    if (beardHairs.length) head.add(strands(beardHairs, new THREE.MeshStandardMaterial({ color: a.species === 'mandrill' ? '#e0b84a' : a.species === 'capuchin' ? '#f3efe6' : furTint.clone().lerp(new THREE.Color('#ffffff'), 0.15), roughness: 0.85 })));
    if (a.species === 'capuchin' && !bare) {
      const ruff: typeof hairs = [];
      for (let i = 0; i < 90; i++) { const t = random() * Math.PI * 2; if (!haired(Math.cos(t), Math.sin(t), 0.5)) continue; ruff.push({ at: new THREE.Vector3(Math.cos(t) * cw * 0.8, Math.sin(t) * ch * 0.8, cd * 0.55), dir: new THREE.Vector3(Math.cos(t), Math.sin(t), 0.25), length: mix(0.025, 0.04, random()), width: 0.008 }); }
      if (ruff.length) head.add(strands(ruff, new THREE.MeshStandardMaterial({ color: '#f5f1e6', roughness: 0.9 })));
    }
    if (pins.length) {
      const pinHeads = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pins);
      head.add(pinHeads);
    }
    if (bare) for (let i = 0; i < 5; i++) part(new THREE.TorusGeometry(cw * (0.5 + i * 0.1), 0.0012, 4, 24, Math.PI), dark, [0, ch * 0.35, cd * 0.2]).rotation.x = -0.6 - i * 0.25;

    if (a.species === 'winged-bellhop') {
      const red = new THREE.MeshStandardMaterial({ color: '#c3202c', roughness: 0.6 }), gold = new THREE.MeshStandardMaterial({ color: '#e0b440', metalness: 0.7, roughness: 0.3 });
      const hat = new THREE.Group();
      hat.position.set(0.012, ch * 1.02 + 0.03, -0.01);
      hat.rotation.z = -0.22;
      head.add(hat);
      part(new THREE.CylinderGeometry(0.052, 0.055, 0.055, 24), red, [0, 0, 0], [1, 1, 1], hat);
      part(new THREE.TorusGeometry(0.054, 0.004, 6, 28), gold, [0, -0.02, 0], [1, 1, 1], hat).rotation.x = Math.PI / 2;
      part(new THREE.SphereGeometry(0.008, 10, 8), gold, [0, 0.031, 0], [1, 1, 1], hat);
      part(new THREE.TorusGeometry(cw * 1.02, 0.003, 6, 28, Math.PI), dark, [0, 0.01, 0.01]).rotation.z = Math.PI;
      const feather = new THREE.MeshStandardMaterial({ color: bare ? foam : '#55708c', roughness: 0.8, side: THREE.DoubleSide });
      for (const x of [1, -1]) for (let i = 0; i < 7; i++) {
        const quill = part(new THREE.ConeGeometry(0.028, 0.2 + i * 0.012, 4), feather, [x * 0.07, -0.1, -0.09], [1, 1, 0.12]);
        quill.geometry.translate(0, 0.1, 0);
        quill.rotation.set(-0.2, 0, -x * (0.5 + i * 0.22));
      }
    }

    // Rig and bench leftovers.
    let blink: THREE.MeshStandardMaterial | null = null;
    if (a.rig === 'servo') {
      s.box([0.1, 0.045, 0.07], [0.1, base + 0.0225, 0.08], s.material('#2f3336'));
      s.rod([0.1, base + 0.045, 0.08], [0.105, base + 0.085, 0.075], 0.004, steel);
      s.ball([0.009, 0.009, 0.009], [0.105, base + 0.088, 0.075], s.material('#c22a2a'), 10);
      blink = new THREE.MeshStandardMaterial({ color: '#4cff6a', emissive: '#4cff6a', emissiveIntensity: 1 });
      s.ball([0.005, 0.005, 0.005], [0.07, base + 0.047, 0.1], blink, 8);
      for (const [x, tint] of [[0.03, '#c22a2a'], [-0.03, '#2a5fc2'], [0, '#e0c23a']] as const)
        s.tube([[x, HY - ch * 0.5 * shape.size, 0.0], [x * 2.2, HY * 0.55, -0.07], [0.04 + x, base + 0.08, 0.0], [0.08, base + 0.03, 0.06]], 0.0028, s.material(tint));
    }
    const lx = a.rig === 'servo' ? -0.1 : 0.1;
    if (a.beside === 'hair') {
      const hank: Parameters<typeof strands>[0][number][] = Array.from({ length: 40 }, () => ({ at: new THREE.Vector3(lx + (random() - 0.5) * 0.02, base + 0.004 + random() * 0.008, 0.05 + (random() - 0.5) * 0.02), dir: new THREE.Vector3(0.4 + (random() - 0.5) * 0.5, 0.02, 1), length: mix(0.07, 0.11, random()), width: 0.004 }));
      s.root.add(strands(hank, furMat));
      s.box([0.05, 0.012, 0.012], [lx, base + 0.01, 0.055], s.material('#f1ede2')).rotation.y = 0.3;
      s.rod([lx - 0.05, base + 0.004, 0.11], [lx - 0.02, base + 0.004, 0.02], 0.0035, wood);
      s.rod([lx - 0.05, base + 0.004, 0.11], [lx - 0.058, base + 0.004, 0.134], 0.001, steel);
    } else if (a.beside === 'teeth') {
      for (let i = -3; i <= 3; i++) { const t = i / 3 * 1.3; s.box([0.008, 0.012, 0.005], [lx + Math.sin(t) * 0.03, base + 0.012, 0.06 + Math.cos(t) * 0.03], ivory).rotation.y = t; }
      s.ring(0.03, 0.006, [lx, base + 0.005, 0.06], s.material('#d98a8a'), Math.PI).rotation.x = -Math.PI / 2;
    } else if (a.beside === 'banana') {
      const peel = s.material(mood.wear > 0.6 ? '#b99a2c' : '#f0cf32');
      s.tube([[lx - 0.07, base + 0.016, 0.1], [lx - 0.03, base + 0.02, 0.075], [lx + 0.02, base + 0.02, 0.075], [lx + 0.06, base + 0.016, 0.1]], 0.016, peel);
      s.ball([0.006, 0.006, 0.006], [lx + 0.063, base + 0.016, 0.102], s.material('#3a2c18'), 8);
    }

    const autonomous = a.rig === 'servo' ? 1 : 0.25;
    return s.finish({
      update: (_dt, time) => {
        jaw.rotation.x = Math.max(0, open + Math.sin(time * mix(0.6, 5, mood.energy)) * 0.14 * autonomous * mix(0.3, 1, mood.energy));
        if (blink) blink.emissiveIntensity = Math.sin(time * 4) > 0 ? 1.2 : 0.1;
      },
    });
  },
});
