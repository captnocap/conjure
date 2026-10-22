import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';
import { at, joints, poseArm } from './pose';

/** Upholstery painted on a canvas: a faded floral, cracked leather, velvet nap or plain weave. */
function fabric(random: () => number, base: string, motif: 'floral' | 'leather' | 'velvet' | 'plain', accents: string[]) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  if (motif === 'floral') {
    for (let i = 0; i < 60; i++) {
      const x = random() * 256, y = random() * 256, r = 6 + random() * 7;
      ctx.fillStyle = '#7d8c68';
      ctx.beginPath();
      ctx.ellipse(x + r, y + r * 0.6, r * 0.9, r * 0.35, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accents[i % accents.length];
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(p * 1.257) * r * 0.6, y + Math.sin(p * 1.257) * r * 0.6, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f1e8cc';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (motif === 'leather') {
    ctx.strokeStyle = 'rgba(25,14,8,0.45)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x = random() * 256, y = random() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 70, y + (random() - 0.5) * 70);
      ctx.stroke();
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,230,200,${random() * 0.12})`;
      ctx.fillRect(random() * 256, random() * 256, 3, 2);
    }
  } else if (motif === 'velvet') {
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = `rgba(255,255,255,${random() * 0.07})`;
      ctx.fillRect(random() * 256, random() * 256, 2, 3);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A small sepia print in a frame: a pale oval where a face would be, never a likeness. */
function photograph() {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6a4f38';
  ctx.fillRect(0, 0, 96, 128);
  ctx.fillStyle = '#9c7f62';
  ctx.fillRect(8, 8, 80, 112);
  ctx.fillStyle = '#5a4332';
  ctx.beginPath();
  ctx.ellipse(48, 96, 34, 26, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9ad8c';
  ctx.beginPath();
  ctx.ellipse(48, 54, 17, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    holds: choice('What is in her hands?', {
      rosary: 'A rosary of dark beads dangling from folded hands, the crucifix swinging.',
      handkerchief: 'A folded white handkerchief, twisted and twisted again.',
      photograph: 'A small framed photograph held against her, turned to herself.',
      teacup: 'A cup of tea on its saucer, long gone cold, forgotten in her lap.',
    }),
    sits: choice('How does she sit?', {
      upright: 'Upright and rigid, hands folded in her lap, holding herself together.',
      sunk: 'Sunk back into the chair, head against the wing, exhausted.',
      bent: 'Bent forward over her hands, elbows on her knees.',
    }),
    head: choice('What is on her head?', {
      bun: 'Grey hair pulled back into a tight bun.',
      hat: 'A small black hat with a short net veil, her funeral hat.',
      scarf: 'A dark headscarf tied under the chin.',
    }),
    shawl: noul('Is a knitted shawl over her shoulders?'),
    table: choice('What sits on the side table beside her?', {
      nothing: 'No table; the chair stands alone.',
      plate: 'A plate of sandwiches, untouched, the bread curling.',
      tea: 'A cup of tea gone cold with a skin on it, and the teapot.',
      candle: 'A lit candle in a brass stick and a mass card.',
      photo: 'A framed photograph turned to face her, and a glass of whiskey nobody poured for themselves.',
    }),
    grandchild: noul('Does a small grandchild lean against the arm of the chair?'),
    chair: choice('What is the good armchair like?', {
      wing: 'A high-backed wingback in a faded floral print, the chair nobody else sits in.',
      leather: 'Dark brown leather, cracked and shiny at the arms.',
      velvet: 'Bottle-green velvet with turned wooden arms.',
      kitchen: 'Only a plain wooden kitchen chair with a thin cushion, pulled in from the table.',
    }),
    age: score('How old is she?', ['In her fifties, still straight-backed', 'Seventy, grey and slower', 'Very old, small and bent']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const H = mix(1.64, 1.48, a.age);
    const build = a.age > 0.65 ? 'slight' : random() < 0.5 ? 'heavy' : 'average';
    const black = '#1b1a1e';
    const cardigan = pick(['#26242c', '#2d2c33', '#1f2427', '#302a2a']);
    const skin = pick(['#e3c2a4', '#d9b08c', '#c99a78', '#b8835f']);
    const hairColor = new THREE.Color('#5a4a3e').lerp(new THREE.Color('#d8d3c9'), Math.min(1, a.age * 1.3));
    const person = figure(s, {
      height: H, build, style: 'doll', gaze: 'down', skin, sleeves: 'long',
      pose: a.sits === 'bent' ? 'slumped' : 'sitting',
      hair: a.head === 'scarf' ? 'short' : 'bun',
      hairColor, top: cardigan, bottom: black, shoes: '#1a1a1c',
    });
    s.root.add(person.root);
    // Hands meet in the lap; bent forward, the elbows rest on the knees.
    const arm = a.sits === 'bent' ? { forward: 42, bend: 50, inward: 48 } : { forward: 18, bend: 72, inward: 52 };
    poseArm(person, 'left', arm);
    poseArm(person, 'right', arm);
    const { spine, neck, shoulder } = joints(person, 'left');
    if (a.sits === 'sunk') {
      spine.rotation.x += 0.16;
      neck.rotation.x += 0.3;
    }
    person.root.updateMatrixWorld(true);
    const hips = at(person.pelvis);
    const hl = at(person.hands.left), hr = at(person.hands.right);
    const hands = hl.clone().add(hr).multiplyScalar(0.5);
    const headR = H * 0.064;

    const wood = s.material('#6e4a2c', { roughness: 0.5 });
    const darkWood = s.material('#3e2a1c', { roughness: 0.45 });
    const brass = s.material('#b89550', { metalness: 0.7, roughness: 0.35 });
    const china = s.material('#f1ece0', { roughness: 0.35 });

    // ---- the good armchair
    const seatTop = person.hipHeight - 0.05 * H;
    const cz = hips.z + 0.12;
    if (a.chair === 'kitchen') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, seatTop - 0.03, 0.035], [hips.x + x * 0.19, (seatTop - 0.03) / 2, cz + z * 0.19], wood);
      s.box([0.44, 0.03, 0.44], [hips.x, seatTop - 0.035, cz], wood);
      s.box([0.38, 0.035, 0.36], [hips.x, seatTop - 0.005, cz + 0.02], s.material(pick(['#8a3a3a', '#5e6e5a', '#b9a46c'])));
      for (const x of [-1, 1]) s.box([0.035, 0.5, 0.035], [hips.x + x * 0.19, seatTop + 0.22, cz - 0.19], wood);
      for (let i = 0; i < 3; i++) s.box([0.36, 0.05, 0.02], [hips.x, seatTop + 0.14 + i * 0.14, cz - 0.19], wood);
    } else {
      const cloth = a.chair === 'wing'
        ? s.material('#ffffff', { map: fabric(random, '#d3c5a8', 'floral', ['#a65a62', '#8e6f8f', '#c48a4e']), roughness: 0.9 })
        : a.chair === 'leather'
          ? s.material('#ffffff', { map: fabric(random, '#5a3520', 'leather', []), roughness: 0.3, metalness: 0.05 })
          : s.material('#ffffff', { map: fabric(random, '#214a36', 'velvet', []), roughness: 0.95 });
      const skirtH = seatTop - 0.12;
      const W = 0.3 * H, D = 0.36 * H;
      s.box([W * 2, skirtH - 0.05, D], [hips.x, 0.05 + (skirtH - 0.05) / 2, cz], cloth);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.05, 0.06, 0.05], [hips.x + x * (W - 0.06), 0.03, cz + z * (D / 2 - 0.05)], darkWood);
      s.box([W * 2 - 0.06, 0.12, D - 0.04], [hips.x, seatTop - 0.06, cz], cloth);
      const backH = 0.42 * H;
      const back = s.box([W * 2, backH, 0.15], [hips.x, seatTop + backH / 2 - 0.08, hips.z - 0.17], cloth);
      back.rotation.x = -0.1;
      for (const x of [-1, 1]) {
        s.box([0.13, 0.17, D - 0.02], [hips.x + x * (W - 0.065), seatTop + 0.07, cz], cloth);
        if (a.chair === 'velvet') s.cylinder(0.025, 0.025, D - 0.04, [hips.x + x * (W - 0.065), seatTop + 0.17, cz], wood, 12).rotation.x = Math.PI / 2;
        if (a.chair === 'wing') {
          const wing = s.box([0.08, 0.26 * H, 0.22], [hips.x + x * (W - 0.1), seatTop + backH - 0.2 * H, hips.z - 0.02], cloth);
          wing.rotation.y = x * 0.3;
        }
      }
    }

    // ---- what is on her head and shoulders
    const knit = s.material(pick(['#3a3540', '#4a4a4a', '#2f2a2a', '#5a5048']), { roughness: 1 });
    if (a.head === 'hat') {
      const hat = s.material('#141316', { roughness: 0.7 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.95, headR * 1.0, headR * 0.55, 20), hat);
      crown.position.set(0, headR * 0.95, -headR * 0.1);
      crown.castShadow = true;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.25, headR * 1.25, headR * 0.06, 20), hat);
      brim.position.set(0, headR * 0.72, -headR * 0.1);
      const veil = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.18, 16, 10, -Math.PI * 0.6, Math.PI * 1.2, Math.PI * 0.25, Math.PI * 0.35), new THREE.MeshStandardMaterial({ color: '#111111', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
      person.head.add(crown, brim, veil);
    }
    if (a.head === 'scarf') {
      const scarfMat = s.material(pick(['#2a2730', '#3a2f2f', '#1f2a2a', '#4a3b4a']), { roughness: 0.95, side: THREE.DoubleSide });
      // A cap over the crown, a drape around the back and sides leaving the face open, and a knot under the chin.
      const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.13, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.34), scarfMat);
      const drape = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.13, 18, 12, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.8), scarfMat);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), scarfMat);
      knot.position.set(0, -headR * 1.0, headR * 0.55);
      crown.castShadow = drape.castShadow = true;
      person.head.add(crown, drape, knot);
    }
    // A pale blouse collar and a brooch where the cardigan meets at the neck.
    const collar = new THREE.Mesh(new THREE.SphereGeometry(H * 0.03, 10, 6), s.material('#efe9dc', { roughness: 0.8 }));
    collar.scale.set(1.5, 0.55, 0.6);
    collar.position.set(0, shoulder.position.y + 0.02 * H, H * 0.045);
    spine.add(collar);
    const brooch = new THREE.Mesh(new THREE.SphereGeometry(H * 0.008, 8, 6), brass);
    brooch.position.set(0, shoulder.position.y + 0.005 * H, H * 0.058);
    spine.add(brooch);
    if (a.shawl) {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), knit);
      dome.scale.set(H * 0.165, H * 0.1, H * 0.12);
      dome.position.set(0, shoulder.position.y - 0.015 * H, 0.005);
      dome.castShadow = true;
      spine.add(dome);
    }

    // ---- what she holds
    if (a.holds === 'rosary') {
      const beadColour = pick(['#1d1a1a', '#4a2c1a', '#2c3b5e', '#e9e4da']);
      const bead = new THREE.SphereGeometry(0.0095, 8, 6);
      const beadMat = s.material(beadColour, { roughness: 0.25, metalness: 0.15 });
      const points: { at: [number, number, number]; size: number }[] = [];
      const centre = hands.clone().add(new THREE.Vector3(0, -0.07, 0.05));
      const tilt = 0.6;
      for (let i = 0; i < 40; i++) {
        const t = (i / 40) * Math.PI * 2;
        const x = Math.sin(t) * 0.055, d = -Math.cos(t) * 0.085;
        points.push({ at: [centre.x + x, centre.y + 0.085 + d * Math.cos(tilt), centre.z + d * Math.sin(tilt)], size: 1 });
      }
      const bottom = new THREE.Vector3(centre.x, centre.y - 0.085 * Math.cos(tilt) + 0.085, centre.z + 0.085 * Math.sin(tilt));
      for (let i = 1; i <= 5; i++) points.push({ at: [bottom.x, bottom.y - i * 0.013 * Math.cos(tilt), bottom.z + i * 0.013 * Math.sin(tilt)], size: 1 });
      s.scatter(bead, beadMat, points);
      const cross = new THREE.Group();
      cross.position.set(bottom.x, bottom.y - 0.095 * Math.cos(tilt), bottom.z + 0.095 * Math.sin(tilt));
      cross.rotation.x = -tilt;
      s.root.add(cross);
      for (const [w, h] of [[0.011, 0.065], [0.04, 0.011]] as const) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.006), brass);
        bar.position.y = w > h ? 0.012 : 0;
        bar.castShadow = true;
        cross.add(bar);
      }
    } else if (a.holds === 'handkerchief') {
      s.ball([0.05, 0.028, 0.042], [hands.x, hands.y + 0.012, hands.z + 0.01], s.material('#f3f0e8', { roughness: 0.95 }), 12);
    } else if (a.holds === 'photograph') {
      const frame = new THREE.Group();
      frame.position.set(hands.x, hands.y + 0.075, hands.z - 0.01);
      frame.rotation.x = -0.35;
      s.root.add(frame);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.165, 0.012), darkWood);
      edge.castShadow = true;
      const print = new THREE.Mesh(new THREE.PlaneGeometry(0.105, 0.14), new THREE.MeshStandardMaterial({ map: photograph(), roughness: 0.8 }));
      print.position.z = -0.0065;
      print.rotation.y = Math.PI;
      frame.add(edge, print);
    } else {
      s.cylinder(0.065, 0.065, 0.006, [hands.x, hands.y + 0.012, hands.z + 0.01], china, 24);
      s.lathe([[0.012, 0], [0.034, 0.003], [0.04, 0.03], [0.042, 0.058], [0.04, 0.06], [0.036, 0.058], [0.032, 0.012], [0.012, 0.006]], china, [hands.x, hands.y + 0.015, hands.z + 0.01]);
      s.ring(0.014, 0.004, [hands.x + 0.048, hands.y + 0.048, hands.z + 0.01], china);
      s.cylinder(0.031, 0.031, 0.003, [hands.x, hands.y + 0.058, hands.z + 0.01], s.material('#b48a5a', { roughness: 0.4 }), 16);
    }

    // ---- the side table and the grandchild take opposite sides of the chair
    const childSide = random() < 0.5 ? -1 : 1;
    const tableSide = -childSide;
    if (a.table !== 'nothing') {
      const tx = hips.x + tableSide * 0.72, tz = cz + 0.05, top = 0.64;
      s.cylinder(0.23, 0.23, 0.025, [tx, top - 0.0125, tz], wood, 24);
      s.cylinder(0.03, 0.045, top - 0.1, [tx, (top - 0.1) / 2 + 0.06, tz], wood, 12);
      s.cylinder(0.16, 0.18, 0.03, [tx, 0.04, tz], wood, 16);
      const linen = s.material('#efe9da', { roughness: 0.95 });
      s.cylinder(0.2, 0.2, 0.004, [tx, top + 0.002, tz], linen, 24);
      if (a.table === 'plate') {
        s.cylinder(0.11, 0.09, 0.012, [tx, top + 0.01, tz], china, 24);
        const bread = s.material('#e8dcc2', { roughness: 0.9 }), ham = s.material('#d98a86', { roughness: 0.8 });
        for (let i = 0; i < 6; i++) {
          const wedge = s.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 3), i % 2 ? bread : ham, [tx + (random() - 0.5) * 0.06, top + 0.027 + Math.floor(i / 2) * 0.021, tz + (random() - 0.5) * 0.06]);
          wedge.rotation.y = random() * Math.PI * 2;
        }
      } else if (a.table === 'tea') {
        s.cylinder(0.06, 0.06, 0.006, [tx - 0.07, top + 0.01, tz + 0.04], china, 20);
        s.lathe([[0.01, 0], [0.032, 0.003], [0.038, 0.028], [0.04, 0.055], [0.034, 0.012], [0.01, 0.006]], china, [tx - 0.07, top + 0.012, tz + 0.04]);
        s.cylinder(0.029, 0.029, 0.003, [tx - 0.07, top + 0.064, tz + 0.04], s.material('#c4a070', { roughness: 0.3 }), 16);
        s.lathe([[0.03, 0], [0.085, 0.01], [0.095, 0.08], [0.07, 0.13], [0.03, 0.135], [0.03, 0.15], [0.012, 0.155], [0.001, 0.155]], s.material('#6e3b2a', { roughness: 0.45 }), [tx + 0.07, top + 0.012, tz - 0.03]);
        s.rod([tx + 0.14, top + 0.07, tz - 0.03], [tx + 0.2, top + 0.14, tz - 0.03], 0.01, s.material('#6e3b2a', { roughness: 0.45 }), 0.007);
        s.ring(0.045, 0.009, [tx - 0.03, top + 0.08, tz - 0.03], s.material('#6e3b2a', { roughness: 0.45 }), Math.PI * 1.3).rotation.z = Math.PI * 0.35;
      } else if (a.table === 'candle') {
        s.cylinder(0.03, 0.045, 0.015, [tx + 0.02, top + 0.012, tz], brass, 16);
        s.cylinder(0.009, 0.014, 0.09, [tx + 0.02, top + 0.065, tz], brass, 10);
        s.cylinder(0.022, 0.022, 0.012, [tx + 0.02, top + 0.11, tz], brass, 12);
        s.cylinder(0.014, 0.014, 0.17, [tx + 0.02, top + 0.2, tz], s.material('#f3ead2', { roughness: 0.7 }), 12);
        s.box([0.075, 0.1, 0.004], [tx - 0.1, top + 0.05, tz + 0.06], s.material('#f4efe4', { roughness: 0.9 })).rotation.x = -0.35;
      } else {
        const frame = s.box([0.12, 0.15, 0.012], [tx + 0.03, top + 0.085, tz - 0.02], darkWood);
        frame.rotation.set(-0.15, tableSide * -0.9, 0);
        const print = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.125), new THREE.MeshStandardMaterial({ map: photograph(), roughness: 0.8 }));
        print.position.z = 0.0065;
        frame.add(print);
        const glass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, roughness: 0.05, depthWrite: false });
        s.cylinder(0.03, 0.026, 0.07, [tx - 0.1, top + 0.045, tz + 0.08], glass, 14);
        s.cylinder(0.026, 0.024, 0.025, [tx - 0.1, top + 0.023, tz + 0.08], s.material('#b8762c', { roughness: 0.2, emissive: '#5a2e08', emissiveIntensity: 0.25 }), 14);
      }
    }

    let child: ReturnType<typeof figure> | null = null;
    if (a.grandchild) {
      const kid = figure(s, {
        height: 0.98, build: 'slight', style: 'doll', pose: 'standing', gaze: 'down', skin,
        hair: random() < 0.5 ? 'short' : 'long', hairColor: pick(['#3b2a22', '#6b4a2e', '#b8884a']),
        top: pick(['#7a8ea8', '#8a3a3a', '#5e6e5a']), bottom: pick(['#2f3038', '#4a3a30']), shoes: '#2a2320', sleeves: 'long',
      });
      poseArm(kid, childSide > 0 ? 'right' : 'left', { forward: 10, out: 85, bend: 40, inward: 20 });
      poseArm(kid, childSide > 0 ? 'left' : 'right', { forward: 6, out: 4, bend: 14 });
      kid.root.position.set(hips.x + childSide * (a.chair === 'kitchen' ? 0.36 : 0.58), 0, cz + 0.2);
      kid.root.rotation.set(0, -childSide * 0.5, childSide * 0.12);
      s.root.add(kid.root);
      child = kid;
    }

    // Candle glow breathes with the scene's energy; its colour follows the warmth.
    const flame = a.table === 'candle'
      ? s.ball([0.012, 0.03, 0.012], [hips.x + tableSide * 0.72 + 0.02, 0.64 + 0.3, cz + 0.05], new THREE.MeshStandardMaterial({ color: '#fff1c0', emissive: new THREE.Color().setHSL(mix(0.14, 0.07, mood.warmth), 1, 0.6), emissiveIntensity: mix(0.6, 1.6, mood.warmth), transparent: true, opacity: 0.9, depthWrite: false }), 10)
      : null;
    const flicker = mix(0.02, 0.2, mood.energy);
    return s.finish({
      update(dt, time) {
        person.update(dt, time);
        child?.update(dt, time);
        if (flame) flame.scale.y = 0.03 * (1 + Math.sin(time * 17) * flicker + Math.sin(time * 7.3) * flicker * 0.5);
      },
    });
  },
});
