import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { faceOut, headGeometry, headPoint, strands, wobble } from './head';

const PALETTES = {
  'grey-green': 'Classic grave grey-green, mossy and drowned.',
  'bruised-purple': 'Bruised purple and plum, livid and swollen.',
  'comic-blue': 'Comic-book blue, a bright Saturday-matinee zombie.',
  jaundice: 'Sickly waxen yellow, feverish and plague-ridden.',
  ashen: 'Chalky ash white with black hollows, a ghost of a person.',
} as const;
const SKIN: Record<keyof typeof PALETTES, [string, string]> = {
  'grey-green': ['#8fa17c', '#3f4f3c'],
  'bruised-purple': ['#9a82a8', '#40284f'],
  'comic-blue': ['#6fa9d6', '#1f4478'],
  jaundice: ['#cdb96e', '#6b5424'],
  ashen: ['#c4c0b6', '#3c3b3a'],
};

export default defineThing({
  questions: {
    decay: choice('How far gone is this zombie?', {
      fresh: 'Freshly turned: still nearly human, pallid, one bite wound and a bloody mouth.',
      weeks: 'Weeks old: mottled skin, a torn cheek showing the teeth on one side, lank hair.',
      skeletal: 'Nearly skeletal: nose gone to a dark cavity, a full bare grin of teeth, bone showing, a few wisps of hair.',
      mummified: 'Mummified: dry leather-brown skin, shrunken lips, strips of old wrapping round the skull.',
    }),
    palette: choice('What colour is the dead skin painted?', PALETTES),
    applied: score('How much of the makeup is on the cast?', [
      'Bare white plaster with one first piece glued on',
      'Half the face done, half serene plaster',
      'Fully applied and painted, ready to mould',
    ]),
    eyes: choice('What are the eyes like on the finished side?', {
      sunken: 'Dark painted hollows with dull yellowed eyes deep inside.',
      cataract: 'Milky white cataract eyes that glow faintly, blind and staring.',
      missing: 'One socket simply empty and black.',
      red: 'Bloodshot red eyes, furious and fast.',
    }),
    human: choice('What is still human about them?', {
      veil: 'A torn wedding veil and a little tiara.',
      glasses: 'A pair of bent wire glasses, still on.',
      earring: 'One gold hoop earring still in.',
      necktie: 'A loosened office necktie and collar.',
      'party-hat': 'A paper party hat on its elastic.',
      nothing: 'Nothing: whoever it was is gone.',
    }),
    state: choice('What is happening to it on the bench right now?', {
      drying: 'Left alone to dry, nothing around it.',
      painting: 'Mid-paint: a palette of colours and brushes beside it.',
      reference: 'A reference photo of the actor clipped on a wire beside it.',
      tagged: 'Finished and tagged with a call-sheet label round the neck.',
    }),
    mount: choice('What is the cast mounted on?', {
      board: 'A plain plywood board with a steel post.',
      turntable: 'A sculptor’s banding wheel that turns.',
      crate: 'An upturned wooden crate, improvised.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const seed = random() * 40;
    const side = random() < 0.5 ? 1 : -1;
    const threshold = mix(-0.62, 1.45, a.applied);
    const coverage = (d: THREE.Vector3) => threshold - (side * d.x + 0.28 * wobble(d.x, d.y, d.z, seed));
    const on = (x: number, y: number, z: number) => coverage(new THREE.Vector3(x, y, z).normalize()) > 0;

    const [baseSkin, baseShade] = SKIN[a.palette];
    const skin = new THREE.Color(baseSkin), shade = new THREE.Color(baseShade);
    if (a.decay === 'fresh') { skin.lerp(new THREE.Color('#dcbfa8'), 0.4); shade.lerp(new THREE.Color('#7a5a56'), 0.3); }
    if (a.decay === 'skeletal') { skin.lerp(new THREE.Color('#6d6558'), 0.3); shade.multiplyScalar(0.7); }
    if (a.decay === 'mummified') { skin.lerp(new THREE.Color('#8b6740'), 0.62); shade.lerp(new THREE.Color('#3a2616'), 0.7); }
    const plaster = new THREE.Color('#efe9dc').lerp(new THREE.Color('#b9ad98'), mood.wear * 0.35);
    const latex = new THREE.Color('#d9c48a');
    const blood = new THREE.Color(a.decay === 'mummified' ? '#4a2418' : a.decay === 'skeletal' ? '#5d1a16' : '#a3161a').lerp(new THREE.Color('#e02626'), mood.cheer * 0.3);
    const mottle = { fresh: 0.35, weeks: 0.8, skeletal: 1, mummified: 0.7 }[a.decay];

    const tone = new THREE.Color();
    const geometry = headGeometry((d) => {
      const c = coverage(d);
      const grain = wobble(d.x * 3, d.y * 3, d.z * 3, seed + 9);
      if (c <= 0) return tone.copy(plaster).multiplyScalar(1 - 0.04 * grain);
      if (c < 0.07) return tone.copy(latex);
      let dark = clamp01(0.25 + grain * mottle * 0.6);
      // Hollow the eye sockets, temples and cheeks.
      for (const ex of [0.36, -0.36]) dark += 0.95 * Math.exp(-((Math.hypot(d.x - ex, d.y - 0.12, d.z - 0.92) / 0.2) ** 2));
      for (const cx of [0.6, -0.6]) dark += 0.5 * mottle * Math.exp(-((Math.hypot(d.x - cx, d.y + 0.3, d.z - 0.7) / 0.22) ** 2));
      return tone.copy(skin).lerp(shade, clamp01(dark));
    });

    // Mount.
    const wood = s.material(a.mount === 'crate' ? '#a07c4f' : '#c9a876');
    const steel = s.material('#8c9296', { metalness: 0.7, roughness: 0.35 });
    let top = 0.024;
    if (a.mount === 'board') s.box([0.3, 0.024, 0.24], [0, 0.012, 0], wood);
    else if (a.mount === 'turntable') {
      s.cylinder(0.09, 0.11, 0.03, [0, 0.015, 0], steel, 28);
      s.cylinder(0.025, 0.025, 0.05, [0, 0.055, 0], steel, 14);
      s.cylinder(0.14, 0.14, 0.02, [0, 0.09, 0], steel, 36);
      top = 0.1;
    } else {
      s.box([0.3, 0.1, 0.24], [0, 0.05, 0], wood);
      for (const y of [0.025, 0.075]) s.box([0.31, 0.01, 0.25], [0, y, 0], s.material('#7d5d38'));
      top = 0.1;
    }
    const cast = new THREE.Group();
    cast.position.y = top;
    s.root.add(cast);
    const add = <T extends THREE.Object3D>(mesh: T) => { cast.add(mesh); return mesh; };
    const part = (geo: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.castShadow = mesh.receiveShadow = true;
      return add(mesh);
    };
    const plasterMat = new THREE.MeshStandardMaterial({ color: plaster, roughness: 0.92 });
    // Bust: shoulders, neck.
    const bust = part(new THREE.LatheGeometry([[0, 0], [0.105, 0], [0.11, 0.02], [0.1, 0.05], [0.06, 0.085], [0.043, 0.12], [0.044, 0.19]].map(([x, y]) => new THREE.Vector2(x, y)), 36), plasterMat);
    bust.scale.set(1.2, 1, 0.8);
    const HY = 0.27;
    const head = part(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    head.position.y = HY;
    const hp = (x: number, y: number, z: number, scale = 1) => headPoint(x, y, z, scale).add(new THREE.Vector3(0, HY, 0));
    const blob = (x: number, y: number, z: number, size: [number, number, number], material: THREE.Material, lift = 1) => {
      const mesh = part(new THREE.SphereGeometry(1, 14, 10), material);
      mesh.position.copy(hp(x, y, z, lift));
      mesh.scale.set(...size);
      faceOut(mesh, new THREE.Vector3(x / 0.077, y / 0.118, z / 0.097));
      return mesh;
    };

    const skinMat = new THREE.MeshStandardMaterial({ color: skin.clone().lerp(shade, 0.25), roughness: 0.75 });
    const darkMat = new THREE.MeshStandardMaterial({ color: '#1a1012', roughness: 0.9 });
    const bloodMat = new THREE.MeshStandardMaterial({ color: blood, roughness: 0.25 });
    const boneMat = new THREE.MeshStandardMaterial({ color: '#e9dfc2', roughness: 0.55 });

    // Nose: plaster nose, zombie nose or an open cavity.
    const centreOn = on(0, -0.1, 1);
    if (centreOn && a.decay === 'skeletal') {
      const cavity = blob(0, -0.12, 1, [0.011, 0.017, 0.004], darkMat, 1.0);
      cavity.rotation.z = 0;
    } else {
      const noseMat = centreOn ? skinMat : plasterMat;
      const nose = part(new THREE.SphereGeometry(1, 14, 10), noseMat);
      nose.scale.set(0.013, 0.028, 0.017);
      nose.position.copy(hp(0, -0.05, 1)).add(new THREE.Vector3(0, 0, 0.004));
      nose.rotation.x = -0.35;
      const tip = part(new THREE.SphereGeometry(1, 14, 10), noseMat);
      tip.scale.set(0.016, 0.011, 0.012);
      tip.position.copy(hp(0, -0.2, 1)).add(new THREE.Vector3(0, 0, 0.008));
    }
    // Ears.
    for (const ex of [1, -1]) {
      const earOn = on(ex, 0, -0.05);
      const ear = part(new THREE.SphereGeometry(1, 12, 10), earOn ? skinMat : plasterMat);
      ear.scale.set(0.008, 0.027, 0.016);
      ear.position.copy(hp(ex, -0.02, -0.08)).add(new THREE.Vector3(ex * 0.004, 0, 0));
      ear.rotation.y = ex * 0.4;
    }
    // Eyes.
    const eyeTint = { sunken: '#c9b25e', cataract: '#f4f6f2', missing: '#c9b25e', red: '#d8301f' }[a.eyes];
    const eyeMat = new THREE.MeshStandardMaterial({ color: eyeTint, roughness: 0.2, emissive: eyeTint, emissiveIntensity: a.eyes === 'cataract' || a.eyes === 'red' ? 0.55 : 0.12 });
    [1, -1].forEach((ex, index) => {
      const x = ex * 0.36;
      if (on(x, 0.12, 0.92)) {
        blob(x, 0.12, 0.92, [0.021, 0.016, 0.006], darkMat, 0.985);
        if (!(a.eyes === 'missing' && index === (side > 0 ? 0 : 1))) {
          const ball = blob(x, 0.115, 0.92, [0.0105, 0.0105, 0.008], eyeMat, 0.99);
          if (a.eyes !== 'cataract') blob(x + ex * 0.01 * (random() - 0.5), 0.112, 0.92, [0.004, 0.004, 0.004], darkMat, 1.035);
          ball.castShadow = false;
        }
      } else blob(x, 0.115, 0.92, [0.017, 0.009, 0.006], plasterMat, 0.975);
    });
    // Mouth: plaster lips, then whatever the decay has opened up.
    const span = { fresh: [0, 0], weeks: side > 0 ? [0.12, 0.85] : [-0.85, -0.12], skeletal: [-0.85, 0.85], mummified: [-0.45, 0.45] }[a.decay];
    const lip: [number, number, number][] = [];
    for (let i = 0; i <= 8; i++) { const t = mix(-0.42, 0.42, i / 8); lip.push(hp(Math.sin(t), -0.47 + 0.02 * Math.cos(t * 3.5), Math.cos(t), 1.0).toArray() as [number, number, number]); }
    s.tube(lip, 0.0032, centreOn ? (a.decay === 'fresh' ? bloodMat : skinMat) : new THREE.MeshStandardMaterial({ color: plaster.clone().multiplyScalar(0.85), roughness: 0.9 })).position.y = top;
    if (span[0] !== span[1]) {
      const teeth: THREE.Mesh[] = [];
      for (let t = span[0]; t <= span[1] + 0.001; t += 0.085) {
        const x = Math.sin(t), z = Math.cos(t);
        if (!on(x, -0.46, z)) continue;
        blob(x, -0.46, z, [0.0075, 0.022, 0.003], darkMat, 1.005);
        for (const [y, tall] of [[-0.4, 0.011], [-0.53, 0.009]] as const) {
          if (random() < 0.1 + mood.wear * 0.2) continue;
          const tooth = part(new THREE.BoxGeometry(0.0062, tall, 0.004), boneMat);
          tooth.position.copy(hp(x, y, z, 1.03));
          tooth.rotation.y = t;
          teeth.push(tooth);
        }
      }
      if (teeth.length && a.decay !== 'mummified') {
        const mid = (span[0] + span[1]) / 2;
        blob(Math.sin(mid), -0.7, Math.cos(mid), [0.02, 0.006, 0.003], boneMat, 1.01);
      }
    }
    // Wounds, bone and blood.
    const wounds = { fresh: 2, weeks: 6, skeletal: 5, mummified: 2 }[a.decay] + Math.round(mood.wear * 3);
    let tries = 0, made = 0;
    while (made < wounds && tries++ < 80) {
      const x = mix(-0.9, 0.9, random()), y = mix(-0.55, 0.75, random()), z = mix(0.35, 1, random());
      if (!on(x, y, z) || (Math.abs(Math.abs(x) - 0.36) < 0.2 && Math.abs(y - 0.12) < 0.2)) continue;
      const r = mix(0.008, 0.02, random());
      const wound = blob(x, y, z, [r, r * mix(0.4, 0.9, random()), 0.004], bloodMat, 1.0);
      wound.rotateZ(random() * 3);
      if (a.decay === 'skeletal' || random() < 0.3) blob(x, y, z, [r * 0.55, r * 0.3, 0.005], boneMat, 1.0).rotateZ(random() * 3);
      if (a.decay === 'fresh' || a.decay === 'weeks') {
        const p = hp(x, y, z, 1.01);
        s.rod([p.x, p.y + top, p.z], [p.x, p.y + top - mix(0.02, 0.06, random()), p.z + 0.002], 0.0022, bloodMat, 0.001);
      }
      made++;
    }
    if (a.decay === 'fresh' && centreOn) blob(side * 0.25, -0.62, 0.95, [0.014, 0.02, 0.004], bloodMat, 1.0);
    // Mummy wrappings.
    if (a.decay === 'mummified') {
      const linen = new THREE.MeshStandardMaterial({ color: '#b8a67c', roughness: 0.95 });
      const wraps = 2 + Math.round(a.applied * 4);
      for (let i = 0; i < wraps; i++) {
        const tilt = (random() - 0.5) * 0.9, lift = i === 0 ? -0.75 : mix(0.38, 0.9, i / Math.max(1, wraps - 1));
        const ring: [number, number, number][] = [];
        for (let k = 0; k < 20; k++) { const t = k / 20 * Math.PI * 2; ring.push(hp(Math.cos(t), lift + tilt * Math.cos(t) * 0.5, Math.sin(t), 1.035).toArray() as [number, number, number]); }
        const band = s.tube(ring, 0.0075, linen, true);
        band.position.y = top;
      }
    }
    // Hair, only where the makeup has been laid.
    const hairAmount = { fresh: 0.85, weeks: 0.55, skeletal: 0.2, mummified: 0.12 }[a.decay];
    const hairTint = new THREE.Color(['#2b2622', '#5a4630', '#8a8478', '#3a2a1e'][Math.floor(random() * 4)]);
    const tufts: Parameters<typeof strands>[0][number][] = [];
    for (let i = 0; i < 520; i++) {
      const t = random() * Math.PI * 2, y = mix(0.3, 1, random());
      const r = Math.sqrt(1 - y * y), x = Math.cos(t) * r, z = Math.sin(t) * r;
      if (z > 0.55 && y < 0.62) continue;
      if (!on(x, y, z)) continue;
      if (wobble(x * 2, y * 2, z * 2, seed + 3) * 0.5 + 0.5 > hairAmount + (random() - 0.5) * 0.2) continue;
      const at = hp(x, y, z, 0.99).add(new THREE.Vector3(0, 0, 0));
      const normal = new THREE.Vector3(x, y * 0.7, z).normalize();
      const dir = new THREE.Vector3(x * 0.2, -1, z * 0.2 - 0.12);
      dir.addScaledVector(normal, -dir.dot(normal)).normalize().addScaledVector(normal, 0.12).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(a.decay === 'fresh' ? 0.15 : 0.3));
      tufts.push({ at, dir, length: mix(0.025, a.decay === 'fresh' ? 0.085 : 0.06, random()), width: mix(0.003, 0.006, random()) });
    }
    if (tufts.length) add(strands(tufts, new THREE.MeshStandardMaterial({ color: hairTint, roughness: 0.9 })));

    // What was human about them.
    const gold = new THREE.MeshStandardMaterial({ color: '#d9ad3c', metalness: 0.85, roughness: 0.25 });
    const sway: THREE.Object3D[] = [];
    if (a.human === 'veil') {
      const veil = part(new THREE.CylinderGeometry(0.05, 0.13, 0.26, 20, 6, true, Math.PI * 0.55, Math.PI * 0.9), new THREE.MeshStandardMaterial({ color: '#f6f1ea', roughness: 0.9, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
      const pos = veil.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.1) pos.setY(i, pos.getY(i) + (random() - 0.3) * 0.04);
      veil.position.set(0, HY + 0.0, -0.03);
      const tiara = part(new THREE.TorusGeometry(0.06, 0.004, 6, 24, Math.PI), gold);
      tiara.position.copy(hp(0, 0.85, 0.2, 0.9));
      tiara.rotation.x = -0.3;
      for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5 * Math.PI; const gem = part(new THREE.ConeGeometry(0.005, 0.016 + (i === 2 ? 0.01 : 0), 5), gold); gem.position.copy(tiara.position).add(new THREE.Vector3(Math.cos(t) * 0.06, Math.sin(t) * 0.06 * Math.cos(0.3) + 0.008, Math.sin(t) * 0.06 * Math.sin(0.3))); }
      sway.push(veil);
    } else if (a.human === 'glasses') {
      const wire = new THREE.MeshStandardMaterial({ color: '#2a2a2e', metalness: 0.6, roughness: 0.4 });
      const frame = new THREE.Group();
      for (const ex of [1, -1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0022, 6, 20), wire);
        rim.position.set(ex * 0.027, 0, 0);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.09, 6), wire);
        arm.rotation.x = Math.PI / 2;
        arm.position.set(ex * 0.05, 0, -0.045);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), new THREE.MeshStandardMaterial({ color: '#cfe4ea', transparent: true, opacity: 0.3, depthWrite: false }));
        lens.position.set(ex * 0.027, 0, 0);
        frame.add(rim, arm, lens);
      }
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 0.018, 6), wire);
      bridge.rotation.z = Math.PI / 2;
      frame.add(bridge);
      frame.position.set(0, HY + 0.016, 0.098);
      frame.rotation.z = (random() - 0.5) * 0.45;
      frame.traverse((n) => { n.castShadow = true; });
      add(frame);
    } else if (a.human === 'earring') {
      const ex = side;
      const hoop = part(new THREE.TorusGeometry(0.014, 0.0022, 6, 20), gold);
      hoop.position.copy(hp(ex, -0.02, -0.08)).add(new THREE.Vector3(ex * 0.012, -0.036, 0));
      hoop.rotation.y = Math.PI / 2;
      sway.push(hoop);
    } else if (a.human === 'necktie') {
      const cloth = new THREE.MeshStandardMaterial({ color: ['#8a1f2b', '#1f3f7a', '#3d6b3a'][Math.floor(random() * 3)], roughness: 0.8 });
      const collar = part(new THREE.TorusGeometry(0.047, 0.009, 6, 24), new THREE.MeshStandardMaterial({ color: '#f1f1ee', roughness: 0.85 }));
      collar.rotation.x = Math.PI / 2 - 0.15;
      collar.position.set(0, 0.125, 0);
      const knot = part(new THREE.BoxGeometry(0.02, 0.018, 0.012), cloth);
      knot.position.set(0.006, 0.108, 0.05);
      const tie = part(new THREE.CylinderGeometry(0.012, 0.022, 0.1, 4, 1), cloth);
      tie.scale.z = 0.25;
      tie.rotation.set(0.75, Math.PI / 4, 0.1);
      tie.position.set(0.01, 0.062, 0.088);
    } else if (a.human === 'party-hat') {
      const hat = part(new THREE.ConeGeometry(0.04, 0.11, 18), new THREE.MeshStandardMaterial({ color: ['#e8427c', '#f2c230', '#3fb6c9'][Math.floor(random() * 3)], roughness: 0.6 }));
      hat.position.copy(hp(side * -0.25, 1, 0.1)).add(new THREE.Vector3(side * -0.012, 0.045, 0));
      hat.rotation.z = side * 0.3;
      const pom = part(new THREE.SphereGeometry(0.011, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
      pom.position.copy(hat.position).add(new THREE.Vector3(side * -0.017, 0.055, 0));
    }

    // Bench state.
    const px = 0.11;
    if (a.state === 'painting') {
      s.cylinder(0.045, 0.045, 0.006, [px, top + 0.003, 0.08], s.material('#f3f1ea'), 22);
      [skin, shade, blood, latex, new THREE.Color('#1c1c1c')].forEach((c, i) => {
        const t = i / 5 * Math.PI * 2;
        s.ball([0.01, 0.004, 0.01], [px + Math.cos(t) * 0.027, top + 0.007, 0.08 + Math.sin(t) * 0.027], new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }), 10);
      });
      for (let i = 0; i < 2 + Math.round(mood.density * 2); i++) {
        const bx = -0.125 + i * 0.02, tilt = (random() - 0.5) * 0.06;
        s.rod([bx, top + 0.006, 0.12], [bx + tilt, top + 0.006, -0.02], 0.004, s.material(['#b33a2e', '#2e5fa8', '#d9b23a', '#2c2c2c'][i % 4]));
        s.rod([bx, top + 0.006, 0.12], [bx - tilt * 0.3, top + 0.006, 0.15], 0.0045, new THREE.MeshStandardMaterial({ color: i % 2 ? blood : shade, roughness: 0.6 }), 0.001);
      }
    } else if (a.state === 'reference') {
      s.rod([px, top, -0.06], [px, top + 0.3, -0.06], 0.003, steel);
      const card = s.box([0.1, 0.13, 0.003], [px, top + 0.33, -0.06], s.material('#f6f4ee'));
      card.rotation.set(-0.1, -0.35, (random() - 0.5) * 0.15);
      const photo = s.box([0.084, 0.1, 0.002], [px, top + 0.338, -0.057], s.material('#7d8a94'));
      photo.rotation.copy(card.rotation);
      const face = s.ball([0.022, 0.03, 0.002], [px + 0.001, top + 0.335, -0.054], s.material('#e3c3a8'), 12);
      face.rotation.copy(card.rotation);
    } else if (a.state === 'tagged') {
      const tag = s.label(['HERO', 'BG 12', 'STUNT', 'DAY 31', 'CLOSE-UP'][Math.floor(random() * 5)], 0.09, 0.045, [0.03, top + 0.085, 0.098], '#2a2622', '#e9d9a8');
      tag.rotation.set(-0.25, 0, -0.12);
      s.rod([0.0, top + 0.13, 0.04], [0.02, top + 0.105, 0.095], 0.0012, s.material('#8a6a45'));
      sway.push(tag);
    }
    // Pencil guide lines on bare plaster and plaster crumbs when it is being worked.
    if (a.applied < 0.85) {
      const crumbs = Array.from({ length: 5 + Math.round(mood.wear * 14) }, () => ({ at: [(random() - 0.5) * 0.24, top + 0.003, 0.05 + random() * 0.06] as [number, number, number], size: mix(0.003, 0.008, random()) }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), plasterMat, crumbs);
    }

    const spin = a.mount === 'turntable' ? mix(0.05, 0.5, mood.energy) : 0;
    const base: [THREE.Object3D, number][] = sway.map((node) => [node, node.rotation.z]);
    return s.finish({
      update: (_dt, time) => {
        if (spin) cast.rotation.y = Math.sin(time * spin) * 0.5;
        for (const [node, rest] of base) node.rotation.z = rest + Math.sin(time * 1.3) * 0.03 * mood.energy;
      },
    });
  },
});
