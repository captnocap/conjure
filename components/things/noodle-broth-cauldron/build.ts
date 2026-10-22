import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const BROTHS = {
  tonkotsu: 'Milky ivory pork-bone broth, opaque and rich.',
  shoyu: 'Clear dark amber soy broth with beads of fat.',
  miso: 'Cloudy orange-tan miso broth.',
  'chili-oil': 'Angry red broth under a slick of chili oil.',
  'black-garlic': 'Near-black broth with an oily sheen.',
  herbal: 'Murky green medicinal broth, more pharmacy than kitchen.',
  synthetic: 'A faintly glowing cyan vat-grown stock nobody asks about.',
} as const;
const BROTH_TINT: Record<keyof typeof BROTHS, string> = {
  tonkotsu: '#eadfc4', shoyu: '#7a4a1e', miso: '#c98b45', 'chili-oil': '#b5281c', 'black-garlic': '#2a2019', herbal: '#5d6e2f', synthetic: '#4fd6d0',
};

export default defineThing({
  questions: {
    state: choice('What is the pot doing right now?', {
      cold: 'Gone cold: flame out, no steam, a skin of fat set on the surface.',
      simmering: 'A patient simmer with a thin thread of steam.',
      rolling: 'A rolling boil, bubbles breaking and thick steam rising.',
      'boiling-over': 'Boiling over: foam pouring down the side and pooling on the ground.',
      scorched: 'Boiled dry and burning: a scorched empty pot trailing dark smoke.',
    }),
    broth: choice('What is cooking in it?', BROTHS),
    pot: choice('What kind of pot is it?', {
      aluminium: 'A tall dull aluminium stockpot, dented all over.',
      steel: 'A bright stainless restaurant stockpot with riveted handles.',
      iron: 'A round-bellied blackened iron cauldron.',
      enamel: 'A chipped enamel pot in speckled blue.',
      drum: 'A sawn-off steel oil drum pressed into service as a pot.',
    }),
    fire: choice('What is it standing on?', {
      'gas-ring': 'A cast-iron gas ring on legs, hose running to a gas bottle.',
      'drum-stove': 'A stove cut from an oil drum with a glowing fire door.',
      bricks: 'A few stacked bricks around a wood fire.',
      induction: 'A slab-like induction plate with a glowing readout.',
    }),
    floating: choice('What can be seen in the broth?', {
      nothing: 'Nothing but the liquid.',
      bones: 'Big knuckle bones breaking the surface.',
      eggs: 'Pale boiled eggs bobbing in a cluster.',
      greens: 'Chopped scallions and a sheet of seaweed.',
      chilies: 'Whole red chilies and star anise drifting.',
    }),
    baskets: choice('How many noodle baskets hang on the rim?', {
      none: 'None: just the pot.',
      one: 'A single basket.',
      pair: 'Two baskets side by side.',
      row: 'A full row of four or five, a busy service.',
    }),
    ladle: choice('Where is the ladle?', {
      'in-pot': 'Standing in the broth, handle leaning on the rim.',
      hooked: 'Hooked over the rim, hanging outside.',
      dropped: 'Dropped on the ground beside the stove.',
      missing: 'There is no ladle.',
    }),
    lid: choice('Where is the lid?', {
      none: 'No lid in sight.',
      askew: 'Sitting askew on top, half covering the pot.',
      leaning: 'Leaning against the stove on the ground.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const iron = s.material('#2b2c2e', { roughness: 0.8, metalness: 0.3 });
    const steelLook = { aluminium: ['#aeb2b3', 0.55, 0.5], steel: ['#d2d7da', 0.65, 0.25], iron: ['#303133', 0.3, 0.85], enamel: ['#3f6fb0', 0.1, 0.35], drum: ['#8a5a3c', 0.4, 0.7] } as const;
    const [potColour, potMetal, potRough] = steelLook[a.pot];
    const makeSpeckle = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = random() < 0.75 ? 'rgba(255,255,255,0.9)' : 'rgba(20,24,40,0.6)'; ctx.fillRect(random() * 128, random() * 128, 1 + random() * 2, 1 + random() * 2); }
      ctx.fillStyle = 'rgba(190,200,230,0.55)';
      for (let i = 0; i < 260; i++) ctx.fillRect(random() * 128, random() * 128, 2, 2);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 2);
      return texture;
    };
    const potMat = s.material(potColour, { metalness: potMetal, roughness: potRough, side: THREE.DoubleSide, map: a.pot === 'enamel' ? makeSpeckle() : null });
    const sootMat = s.material('#151413', { roughness: 0.95 });

    // --- The fire -------------------------------------------------------------------------
    let base = 0.26; // height of the surface the pot sits on
    const flames: THREE.Mesh[] = [];
    const lit = a.state !== 'cold';
    const flameSize = { cold: 0, simmering: 0.6, rolling: 1, 'boiling-over': 1.15, scorched: 1.2 }[a.state];
    const blue = new THREE.MeshStandardMaterial({ color: '#58b4ff', emissive: '#2f8dff', emissiveIntensity: 1.6, roughness: 0.6 });
    const orange = new THREE.MeshStandardMaterial({ color: '#ffb347', emissive: '#ff7a1a', emissiveIntensity: 1.5, roughness: 0.6 });
    const flame = (x: number, y: number, z: number, size: number, material: THREE.Material) => {
      const mesh = s.mesh(new THREE.ConeGeometry(0.018 * size, 0.07 * size, 6), material, [x, y + 0.035 * size, z]);
      mesh.castShadow = false;
      flames.push(mesh);
    };
    if (a.fire === 'gas-ring') {
      base = 0.27;
      s.ring(0.25, 0.018, [0, base - 0.018, 0], iron).rotation.x = Math.PI / 2;
      s.ring(0.13, 0.014, [0, base - 0.018, 0], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4, cx = Math.cos(angle), cz = Math.sin(angle);
        s.rod([cx * 0.29, 0, cz * 0.29], [cx * 0.24, base - 0.02, cz * 0.24], 0.016, iron);
        s.box([0.2, 0.02, 0.03], [cx * 0.17, base - 0.012, cz * 0.17], iron).rotation.y = -angle;
      }
      s.cylinder(0.1, 0.07, 0.05, [0, base - 0.1, 0], iron, 20);
      s.cylinder(0.03, 0.03, 0.1, [0, base - 0.17, 0], iron, 10);
      if (lit) for (let i = 0; i < 18; i++) flame(Math.cos(i * 0.349) * 0.095, base - 0.075, Math.sin(i * 0.349) * 0.095, flameSize * (0.8 + random() * 0.4), blue);
      // Hose and bottle.
      const side = random() < 0.5 ? -1 : 1;
      const bottle = s.material(mood.warmth > 0.5 ? '#d9622b' : '#4c7fa6', { roughness: 0.5, metalness: 0.2 });
      const bx = side * 0.52, bz = -0.12;
      s.lathe([[0, 0], [0.11, 0], [0.12, 0.03], [0.12, 0.3], [0.09, 0.37], [0.04, 0.4], [0.04, 0.44]], bottle, [bx, 0, bz]);
      s.ring(0.07, 0.008, [bx, 0.47, bz], bottle).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) s.rod([bx + Math.cos(i * 2.1) * 0.07, 0.39, bz + Math.sin(i * 2.1) * 0.07], [bx + Math.cos(i * 2.1) * 0.07, 0.47, bz + Math.sin(i * 2.1) * 0.07], 0.006, bottle);
      s.cylinder(0.02, 0.02, 0.04, [bx, 0.45, bz], s.material('#c9a23a', { metalness: 0.7, roughness: 0.3 }), 10);
      s.tube([[bx, 0.46, bz], [bx - side * 0.1, 0.5, bz + 0.06], [side * 0.3, 0.1, 0.12], [side * 0.12, 0.05, 0.05], [0.02, base - 0.19, 0]], 0.011, s.material('#b3372a', { roughness: 0.7 }));
    } else if (a.fire === 'drum-stove') {
      base = 0.36;
      const drum = s.material(mood.warmth > 0.5 ? '#7d4a35' : '#40565c', { roughness: 0.85, metalness: 0.3, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(0.29, 0.29, base, 28, 1, true, 0.45, Math.PI * 2 - 0.9), drum, [0, base / 2, 0]);
      for (const y of [0.02, base * 0.5, base - 0.02]) s.ring(0.295, 0.012, [0, y, 0], drum).rotation.x = Math.PI / 2;
      s.cylinder(0.27, 0.27, 0.02, [0, 0.03, 0], sootMat, 24);
      for (let i = 0; i < 9; i++) s.ball([0.045, 0.03, 0.045], [(random() - 0.5) * 0.3, 0.06, (random() - 0.2) * 0.3], lit ? orange : sootMat, 8);
      if (lit) for (let i = 0; i < 12; i++) flame((random() - 0.5) * 0.3, 0.07, 0.05 + random() * 0.2, flameSize * (1.6 + random()), orange);
      for (let i = 0; i < 3; i++) s.box([0.5, 0.016, 0.02], [0, base - 0.008, (i - 1) * 0.16], iron);
    } else if (a.fire === 'bricks') {
      base = 0.24;
      const brick = s.material('#9b5a43', { roughness: 0.95 });
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 4; i++) {
        if (i === 0 && layer < 2) continue; // open mouth at the front
        const angle = i * Math.PI / 2 + Math.PI / 2 + (layer % 2) * 0.12;
        const b = s.box([0.24, 0.075, 0.11], [Math.cos(angle) * 0.24, 0.04 + layer * 0.08, Math.sin(angle) * 0.24], brick);
        b.rotation.y = -angle + Math.PI / 2 + (random() - 0.5) * 0.12;
      }
      for (let i = 0; i < 4; i++) s.rod([(random() - 0.5) * 0.1, 0.03, -0.05], [(i - 1.5) * 0.12, 0.03 + random() * 0.04, 0.42 + random() * 0.1], 0.022, s.material(lit ? '#4a3524' : '#6b5038', { roughness: 0.95 }));
      if (lit) for (let i = 0; i < 12; i++) flame((random() - 0.5) * 0.25, 0.04, (random() - 0.3) * 0.25, flameSize * (1.5 + random()), orange);
    } else {
      base = 0.09;
      s.box([0.62, 0.08, 0.62], [0, 0.045, 0], s.material('#2a2c31', { roughness: 0.35, metalness: 0.4 }));
      s.box([0.6, 0.006, 0.6], [0, 0.088, 0], s.material('#0f1013', { roughness: 0.08 }));
      const ringGlow = new THREE.MeshStandardMaterial({ color: '#ff5a3c', emissive: '#ff3a1c', emissiveIntensity: lit ? 1.6 : 0.05 });
      s.ring(0.27, 0.006, [0, 0.092, 0], ringGlow).rotation.x = Math.PI / 2;
      s.label(lit ? (a.state === 'scorched' ? 'E-07' : '9.5') : '--', 0.14, 0.05, [0.18, 0.045, 0.312], lit ? '#ff6a4c' : '#59312c', '#16171a');
      for (let i = 0; i < 3; i++) s.cylinder(0.014, 0.014, 0.01, [-0.2 + i * 0.07, 0.045, 0.312], s.material('#c9ccd0', { metalness: 0.6 }), 12).rotation.x = Math.PI / 2;
    }

    // --- The pot, dented ------------------------------------------------------------------
    const round = a.pot === 'iron';
    const R = round ? 0.3 : a.pot === 'drum' ? 0.29 : 0.27;
    const H = round ? 0.42 : a.pot === 'drum' ? 0.46 : 0.5;
    const profile: [number, number][] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      const r = round ? R * (0.62 + 0.38 * Math.sin(Math.PI * (0.12 + t * 0.7))) : R * (t < 0.06 ? 0.92 + t * 1.33 : 1);
      profile.push([r, t * H]);
    }
    const rimR = profile[14][0];
    const level = { cold: 0.68, simmering: 0.8, rolling: 0.88, 'boiling-over': 0.985, scorched: 0.03 }[a.state] * H;
    const shell = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48);
    const dents = Math.round(mix(2, 9, mood.wear) * (a.pot === 'steel' ? 0.4 : 1));
    const position = shell.attributes.position as THREE.BufferAttribute;
    for (let d = 0; d < dents; d++) {
      const angle = random() * Math.PI * 2, y = mix(0.08, 0.9, random()) * H, reach = 0.07 + random() * 0.08, depth = 0.015 + random() * 0.03;
      if (Math.abs(y - level) < reach + 0.02 && a.state !== 'scorched') continue; // a dent must not cut through the liquid surface
      const centre = new THREE.Vector3(Math.cos(angle) * R, y, Math.sin(angle) * R), v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i);
        const distance = v.distanceTo(centre);
        if (distance > reach || v.y > H * 0.97) continue;
        const push = 1 - depth * (0.5 + 0.5 * Math.cos(Math.PI * distance / reach)) / Math.hypot(v.x, v.z);
        position.setXYZ(i, v.x * push, v.y, v.z * push);
      }
    }
    shell.computeVertexNormals();
    const pot = new THREE.Group();
    pot.position.y = base;
    s.root.add(pot);
    const into = <T extends THREE.Object3D>(mesh: T) => { pot.add(mesh); return mesh; };
    into(s.mesh(shell, potMat));
    into(s.cylinder(profile[0][0], profile[0][0], 0.012, [0, 0.006, 0], potMat, 32));
    into(s.ring(rimR, 0.012, [0, H, 0], potMat)).rotation.x = Math.PI / 2;
    if (a.pot === 'drum') for (const y of [H * 0.33, H * 0.66]) into(s.ring(R + 0.004, 0.01, [0, y, 0], potMat)).rotation.x = Math.PI / 2;
    // Soot licking up from the fire.
    const soot = into(s.mesh(new THREE.CylinderGeometry(profile[2][0] + 0.004, profile[0][0] + 0.004, H * mix(0.08, 0.3, mood.wear), 32, 1, true), sootMat, [0, H * mix(0.04, 0.15, mood.wear), 0]));
    soot.visible = !round && a.fire !== 'induction';
    // Side handles.
    for (const side of [-1, 1]) {
      const handle = into(s.ring(0.065, 0.011, [side * (rimR + 0.012), H * 0.82, 0], a.pot === 'iron' ? iron : potMat, Math.PI));
      handle.rotation.z = side * -Math.PI / 2; handle.rotation.y = 0; handle.rotation.x = Math.PI / 2 * 0 ;
      handle.rotation.set(0, side > 0 ? 0 : Math.PI, -Math.PI / 2);
      if (a.pot === 'steel') for (const z of [-0.065, 0.065]) into(s.ball([0.012, 0.012, 0.012], [side * (rimR + 0.004), H * 0.82, z], potMat, 8));
    }

    // --- Broth ----------------------------------------------------------------------------
    const levelR = (() => { const t = level / H * 14, i = Math.min(13, Math.floor(t)); return mix(profile[i][0], profile[i + 1][0], t - i) - 0.006; })();
    const tint = BROTH_TINT[a.broth];
    const bubbles: THREE.Mesh[] = [];
    if (a.state === 'scorched') {
      into(s.cylinder(levelR, levelR, 0.02, [0, level, 0], sootMat, 28));
      for (let i = 0; i < 7; i++) into(s.ball([0.05, 0.02, 0.04], [(random() - 0.5) * 0.3, level + 0.015, (random() - 0.5) * 0.3], s.material('#3a2414', { roughness: 1 }), 8));
      const burnt = into(s.mesh(new THREE.CylinderGeometry(rimR - 0.004, levelR, H * 0.9, 32, 1, true), s.material('#1c1612', { roughness: 0.95, side: THREE.BackSide }), [0, H * 0.48, 0]));
      burnt.castShadow = false;
    } else {
      const liquid = s.material(tint, { roughness: a.state === 'cold' ? 0.6 : 0.12, emissive: tint, emissiveIntensity: a.broth === 'synthetic' ? 0.7 : 0.12 });
      into(s.cylinder(levelR, levelR, 0.02, [0, level - 0.01, 0], liquid, 36));
      const anywhere = (spread = 0.8): [number, number] => { const r = Math.sqrt(random()) * levelR * spread, t = random() * Math.PI * 2; return [Math.cos(t) * r, Math.sin(t) * r]; };
      // Fat: discs of oil, or a set skin when cold.
      const fat = s.material(a.broth === 'chili-oil' ? '#e8491f' : '#f2e3a8', { roughness: 0.2, transparent: true, opacity: a.state === 'cold' ? 0.85 : 0.6 });
      for (let i = 0; i < (a.state === 'cold' ? 16 : 7); i++) { const size = (a.state === 'cold' ? 0.07 : 0.035) * (0.5 + random()); const [x, z] = anywhere(Math.max(0.1, (levelR - size - 0.012) / levelR)); into(s.cylinder(size, size, 0.003, [x, level + 0.002, z], fat, 12)).castShadow = false; }
      if (a.floating === 'bones') {
        const bone = s.material('#e9e1cc', { roughness: 0.7 });
        for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) {
          const [x, z] = anywhere(0.6), tilt = random() * 0.9 + 0.2, turn = random() * 6.28;
          const group = new THREE.Group();
          group.position.set(x, level - 0.01, z); group.rotation.set(0, turn, tilt);
          pot.add(group);
          group.add(s.cylinder(0.018, 0.022, 0.17, [0, 0.05, 0], bone, 8));
          for (const k of [-1, 1]) group.add(s.ball([0.03, 0.026, 0.026], [k * 0.018, 0.14, 0], bone, 8));
        }
      } else if (a.floating === 'eggs') {
        const egg = s.material('#f4ead8', { roughness: 0.4 });
        for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) { const [x, z] = anywhere(0.7); into(s.ball([0.03, 0.026, 0.038], [x, level + 0.004, z], egg, 12)).rotation.y = random() * 3; }
      } else if (a.floating === 'greens') {
        const green = s.material('#58a83a', { roughness: 0.6 });
        for (let i = 0; i < 26; i++) { const [x, z] = anywhere(0.9); into(s.cylinder(0.011, 0.011, 0.006, [x, level + 0.004, z], green, 8)); }
        into(s.box([0.16, 0.004, 0.11], [0.04, level + 0.004, -0.05], s.material('#1d3a2b', { roughness: 0.5 }))).rotation.y = random() * 3;
      } else if (a.floating === 'chilies') {
        const red = s.material('#c8201a', { roughness: 0.35 }), anise = s.material('#5a3520');
        for (let i = 0; i < 7; i++) { const [x, z] = anywhere(0.8); const c = into(s.cylinder(0.004, 0.013, 0.085, [x, level + 0.008, z], red, 8)); c.rotation.set(Math.PI / 2, 0, random() * 6.28); }
        for (let i = 0; i < 3; i++) { const [x, z] = anywhere(0.7); const star = into(s.cylinder(0.026, 0.026, 0.006, [x, level + 0.004, z], anise, 8)); star.rotation.y = random(); }
      }
      // Bubbles and foam.
      const froth = s.material(new THREE.Color(tint).lerp(new THREE.Color('#fff8e8'), 0.75), { roughness: 0.5 });
      const bubbleCount = { cold: 0, simmering: 6, rolling: 22, 'boiling-over': 34 }[a.state];
      for (let i = 0; i < bubbleCount; i++) {
        const [x, z] = anywhere(0.95), size = 0.014 + random() * (a.state === 'simmering' ? 0.012 : 0.03);
        bubbles.push(into(s.ball([size, size * 0.7, size], [x, level, z], froth, 8)));
      }
      if (a.state === 'boiling-over') {
        const spill = random() * 0.8 + 0.4; // which way it pours, towards the viewer
        for (let i = 0; i < 16; i++) {
          const angle = spill + (random() - 0.5) * 1.4, size = 0.03 + random() * 0.035;
          into(s.ball([size, size * 0.8, size], [Math.cos(angle) * (rimR - 0.01 + random() * 0.03), H + random() * 0.03, Math.sin(angle) * (rimR - 0.01 + random() * 0.03)], froth, 10));
        }
        for (let i = 0; i < 5; i++) {
          const angle = spill + (i - 2) * 0.22 + (random() - 0.5) * 0.1, length = H * (0.45 + random() * 0.55), x = Math.cos(angle), z = Math.sin(angle);
          into(s.rod([x * (rimR + 0.006), H, z * (rimR + 0.006)], [x * (round ? rimR * 1.05 : R + 0.008), H - length, z * (round ? rimR * 1.05 : R + 0.008)], 0.02 + random() * 0.012, froth, 0.016));
          into(s.ball([0.026, 0.034, 0.02], [x * (round ? rimR * 1.05 : R + 0.012), H - length, z * (round ? rimR * 1.05 : R + 0.012)], froth, 8));
        }
        const puddle = s.cylinder(0.2, 0.22, 0.006, [Math.cos(spill) * 0.42, 0.003, Math.sin(spill) * 0.42], froth, 18);
        puddle.scale.set(1, 1, 0.7 + random() * 0.5); puddle.rotation.y = -spill;
      }
    }

    // --- Baskets, ladle, lid ----------------------------------------------------------------
    const wire = s.material('#c2c7c9', { metalness: 0.6, roughness: 0.35 });
    const wood = s.material('#8a5a32', { roughness: 0.8 });
    const meshCanvas = document.createElement('canvas');
    meshCanvas.width = meshCanvas.height = 64;
    const mctx = meshCanvas.getContext('2d')!;
    mctx.strokeStyle = '#cfd4d6'; mctx.lineWidth = 5;
    for (let i = 0; i <= 64; i += 16) { mctx.beginPath(); mctx.moveTo(i, 0); mctx.lineTo(i, 64); mctx.moveTo(0, i); mctx.lineTo(64, i); mctx.stroke(); }
    const meshTexture = new THREE.CanvasTexture(meshCanvas);
    meshTexture.wrapS = meshTexture.wrapT = THREE.RepeatWrapping; meshTexture.repeat.set(10, 4); meshTexture.colorSpace = THREE.SRGBColorSpace;
    const netting = new THREE.MeshStandardMaterial({ map: meshTexture, alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.4 });
    const basketCount = { none: 0, one: 1, pair: 2, row: 4 + Math.round(random()) }[a.baskets];
    const lidOn = a.lid === 'askew';
    const start = 0.25 + random() * 0.3;
    for (let i = 0; i < basketCount; i++) {
      const angle = start + i * 0.52 + (random() - 0.5) * 0.08;
      const basket = new THREE.Group();
      basket.position.set(Math.cos(angle) * (rimR - 0.085), H - 0.02, Math.sin(angle) * (rimR - 0.085));
      basket.rotation.y = -angle;
      basket.rotation.z = (random() - 0.5) * 0.12;
      pot.add(basket);
      basket.add(s.mesh(new THREE.CylinderGeometry(0.062, 0.05, 0.13, 16, 1, true), netting, [0, -0.055, 0]));
      basket.add(s.mesh(new THREE.SphereGeometry(0.05, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), netting, [0, -0.12, 0]));
      const hoop = s.ring(0.063, 0.005, [0, 0.01, 0], wire); hoop.rotation.x = Math.PI / 2; basket.add(hoop);
      basket.add(s.rod([0.06, 0.01, 0], [0.15, 0.035, 0], 0.005, wire));
      basket.add(s.rod([0.15, 0.035, 0], [0.34 + random() * 0.05, 0.12 + random() * 0.05, 0], 0.013, wood));
      if (random() < 0.3 + mood.density * 0.5 && a.state !== 'scorched' && a.state !== 'cold')
        basket.add(s.ball([0.052, 0.035, 0.052], [0, -0.01, 0], s.material('#ecd58a', { roughness: 0.7 }), 10));
    }
    if (a.ladle !== 'missing') {
      const ladle = new THREE.Group();
      const steel = s.material('#c9ced1', { metalness: 0.65, roughness: 0.3 });
      const cup = s.mesh(new THREE.SphereGeometry(0.055, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), s.material('#c9ced1', { metalness: 0.65, roughness: 0.3, side: THREE.DoubleSide }));
      ladle.add(cup);
      ladle.add(s.rod([0.05, 0, 0], [0.09, 0.42, 0], 0.007, steel));
      const hook = s.ring(0.022, 0.006, [0.112, 0.42, 0], steel, Math.PI); ladle.add(hook);
      if (a.ladle === 'in-pot') {
        const angle = start - 0.75;
        ladle.position.set(Math.cos(angle) * (rimR - 0.2), Math.max(level, H * 0.45) - 0.01, Math.sin(angle) * (rimR - 0.2));
        ladle.rotation.set(0, -angle, -0.33);
        pot.add(ladle);
      } else if (a.ladle === 'hooked') {
        const angle = start - 0.6;
        ladle.position.set(Math.cos(angle) * (rimR + 0.135), H - 0.44, Math.sin(angle) * (rimR + 0.135));
        ladle.rotation.set(0, -angle + Math.PI, 0.02);
        hook.rotation.z = 0;
        pot.add(ladle);
      } else {
        ladle.position.set(-0.42 - random() * 0.08, 0.055, 0.36 + random() * 0.1);
        ladle.rotation.set(0, random() * 2, Math.PI / 2 - 0.12);
        s.root.add(ladle);
      }
    }
    if (a.lid !== 'none') {
      const lid = new THREE.Group();
      lid.add(s.lathe([[rimR + 0.02, 0], [rimR + 0.02, 0.012], [rimR * 0.7, 0.035], [0, 0.045]], potMat));
      lid.add(s.cylinder(0.022, 0.03, 0.04, [0, 0.06, 0], iron, 12));
      lid.add(s.cylinder(0.04, 0.035, 0.016, [0, 0.085, 0], iron, 12));
      if (lidOn) {
        lid.position.set(-rimR * 0.62, H + 0.07, -rimR * 0.3); lid.rotation.set(0.12, random(), 0.3);
        pot.add(lid);
      } else {
        const side = random() < 0.5 ? -1 : 1;
        lid.position.set(side * -0.48, rimR * 0.94, 0.2); lid.rotation.set(0.2, 0, side * -(Math.PI / 2 - 0.35));
        s.root.add(lid);
      }
    }

    // --- Steam ----------------------------------------------------------------------------
    const steamAmount = { cold: 0, simmering: 0.4, rolling: 0.8, 'boiling-over': 1, scorched: 0.8 }[a.state];
    const puffCount = Math.round(steamAmount * mix(10, 20, mood.energy));
    const steamHeight = mix(0.7, 1.5, steamAmount);
    const puffs: { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; phase: number; drift: number; size: number }[] = [];
    const smoke = a.state === 'scorched';
    for (let i = 0; i < puffCount; i++) {
      const material = new THREE.MeshStandardMaterial({ color: smoke ? '#4a4540' : '#dfe7ec', emissive: smoke ? '#000000' : '#c9d6dd', emissiveIntensity: 0.4, transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), material);
      s.root.add(mesh);
      puffs.push({ mesh, material, phase: (i + random() * 0.6) / puffCount, drift: random() * Math.PI * 2, size: 0.08 + random() * 0.07 });
    }
    const top = base + H;
    const lean = (random() - 0.5) * 0.4;
    const pose = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.phase + time * 0.12) % 1;
        const sway = Math.sin(puff.drift + t * 5 + time * 0.6) * 0.07 * (0.3 + t);
        puff.mesh.position.set(sway + lean * t * t * steamHeight + (lidOn ? 0.1 : 0), top + 0.02 + t * steamHeight, Math.cos(puff.drift + t * 4) * 0.06 * (0.3 + t));
        puff.mesh.scale.setScalar(puff.size * (0.7 + t * 2.1));
        puff.material.opacity = (smoke ? 0.42 : 0.4) * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.8 * (1 - t * 0.55);
      }
    };
    pose(0);
    const speed = mix(0.4, 1.6, mood.energy);
    const rest = bubbles.map((bubble) => ({ scale: bubble.scale.clone(), phase: random() * 6.28, rate: 2 + random() * 4 }));
    const flameRest = flames.map((mesh) => ({ scale: mesh.scale.y, phase: random() * 6.28 }));

    return s.finish({
      footprint: 0.42,
      update: (_dt, time) => {
        pose(time * speed);
        bubbles.forEach((bubble, index) => {
          const pulse = 0.5 + 0.5 * Math.sin(time * rest[index].rate * speed + rest[index].phase);
          bubble.scale.copy(rest[index].scale).multiplyScalar(0.3 + pulse * 0.9);
        });
        flames.forEach((mesh, index) => { mesh.scale.y = flameRest[index].scale * (0.8 + 0.3 * Math.sin(time * 14 + flameRest[index].phase)); });
      },
    });
  },
});
