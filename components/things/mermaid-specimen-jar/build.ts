import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

function placard(lines: readonly string[], width: number, height: number, ink: string, paper: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = Math.max(64, Math.round((384 * height) / width));
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const row = (canvas.height - 24) / lines.length;
  lines.forEach((line, index) => {
    ctx.font = `italic bold ${Math.min(row * 0.7, 560 / Math.max(line.length, 1))}px serif`;
    ctx.fillText(line, 192, 12 + row * (index + 0.52), 356);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  return mesh;
}

export default defineThing({
  questions: {
    verdict: choice('How does the specimen come across?', {
      fake: 'A clear fake: a monkey’s top half sewn to a fish with fat black stitches and a button for an eye.',
      convincing: 'Unsettlingly convincing: seamless, delicate, the join impossible to find.',
      watching: 'Looking back at you: eyes open and bright, head turned, one hand pressed to the glass.',
      screaming: 'Frozen in the classic sideshow pose, hands clapped to its cheeks, mouth open.',
      sleeping: 'Curled up small as if asleep, more child than monster.',
      ruined: 'Coming apart: the tail has dropped off and lies at the bottom among flakes.',
    }),
    body: choice('What is its skin like?', {
      leather: 'Dark, dry, leathery brown like a mummified thing.',
      waxen: 'Pale waxy grey-pink, soft and drowned.',
      verdigris: 'Mottled sea-green, as if algae had taken it.',
      bleached: 'Bleached bone-white by the preserving fluid.',
    }),
    tail: choice('What kind of fish tail does it have?', {
      carp: 'A plump golden carp tail with a broad fan.',
      eel: 'A long thin eel tail that coils round the jar.',
      shark: 'A grey shark tail with a sharp crescent fin.',
      veil: 'A trailing goldfish veil-tail, absurdly pretty.',
    }),
    fluid: choice('What is the fluid like?', {
      amber: 'Yellowed amber formalin, the colour of old varnish.',
      green: 'Cloudy pond green.',
      tea: 'Murky brown, strong as stewed tea.',
      clear: 'Nearly clear with a cold blue cast, recently topped up.',
      rose: 'A faint unhealthy pink.',
    }),
    level: score('How much fluid is left in the jar?', ['Almost evaporated, the figure left high and dry', 'Half full, the head above the surface', 'Brimming, right up to the seal']),
    seal: choice('How is the jar closed?', {
      wax: 'A cork buried under dripping red sealing wax with a ribbon.',
      glass: 'A ground-glass stopper with a round knob.',
      brass: 'A heavy brass screw lid.',
      bladder: 'Parchment stretched over the mouth and tied down with string.',
      open: 'Not closed at all: the lid sits beside it.',
    }),
    tag: choice('What is written on the collector’s tag?', {
      latin: 'SIREN juv., with a sea and a year: a naturalist’s careful hand.',
      doubt: 'MERMAID, followed by a question mark.',
      showman: 'A showman’s price: SEE THE MERMAID 10 CENTS.',
      warning: 'DO NOT OPEN',
      returned: 'RETURNED BY DONOR',
    }),
    stand: choice('What does the jar stand on?', {
      bare: 'Nothing but its own glass foot.',
      ebony: 'A turned black wooden stand.',
      velvet: 'A faded velvet cushion block with tassel fringe.',
      crate: 'A sideshow crate stencilled with a number.',
    }),
    hair: noul('Does the figure have long hair floating in the fluid?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.15, H = 0.64, S = 1.4;
    const standHeight = { bare: 0, ebony: 0.07, velvet: 0.09, crate: 0.2 }[a.stand];
    const jar = new THREE.Group();
    jar.position.y = standHeight;
    s.root.add(jar);
    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };

    // Stand.
    if (a.stand === 'ebony') s.lathe([[0.17, 0], [0.17, 0.015], [0.13, 0.03], [0.145, 0.05], [0.14, 0.07], [0, 0.07]], s.material('#1d1a19', { roughness: 0.35 }));
    else if (a.stand === 'velvet') {
      s.box([0.36, 0.03, 0.36], [0, 0.015, 0], s.material('#3a2a20'));
      const cushion = s.ball([0.18, 0.045, 0.18], [0, 0.05, 0], s.material(mood.wear > 0.5 ? '#7d4a52' : '#8f2638', { roughness: 0.95 }), 20);
      cushion.scale.y = 0.045;
      for (let i = 0; i < 16; i++) s.rod([Math.cos(i * 0.3927) * 0.17, 0.045, Math.sin(i * 0.3927) * 0.17], [Math.cos(i * 0.3927) * 0.185, 0.005, Math.sin(i * 0.3927) * 0.185], 0.004, s.material('#c9a24c'));
    } else if (a.stand === 'crate') {
      const pine = s.material('#b99a63', { roughness: 0.9 });
      s.box([0.4, 0.2, 0.34], [0, 0.1, 0], pine);
      for (const y of [0.035, 0.165]) s.box([0.42, 0.04, 0.36], [0, y, 0], s.material('#a3844f', { roughness: 0.9 }));
      s.label(`LOT ${10 + Math.floor(random() * 89)}`, 0.2, 0.07, [0, 0.1, 0.171], '#3a2a20', '#b99a63');
    }

    // Glass, foot and fluid.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#c4ddd4', transparent: true, opacity: 0.2, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    put(jar, s.cylinder(R + 0.012, R + 0.016, 0.02, [0, 0.01, 0], s.material('#b9cdc6', { roughness: 0.15, transparent: true, opacity: 0.75 }), 32));
    put(jar, s.lathe([[R, 0.02], [R, H - 0.06], [R - 0.02, H - 0.03], [R - 0.02, H], [R - 0.008, H + 0.008]], glass));
    put(jar, s.ring(R - 0.012, 0.011, [0, H + 0.004, 0], s.material('#c6d8d2', { roughness: 0.15, transparent: true, opacity: 0.7 }))).rotation.x = Math.PI / 2;
    const fluidTint = new THREE.Color({ amber: '#d6a531', green: '#7c9a4a', tea: '#6b4526', clear: '#bcd9e4', rose: '#d99a94' }[a.fluid]).lerp(new THREE.Color('#ff9a3c'), (mood.warmth - 0.5) * 0.2);
    const level = mix(0.09, H - 0.075, Math.min(1, a.level * mix(1, 0.82, mood.wear)));
    const murk = { amber: 0.34, green: 0.46, tea: 0.52, clear: 0.2, rose: 0.3 }[a.fluid] + mood.wear * 0.12;
    const fluid = new THREE.MeshStandardMaterial({ color: fluidTint, transparent: true, opacity: murk, roughness: 0.1, depthWrite: false });
    put(jar, s.cylinder(R - 0.006, R - 0.006, level, [0, 0.02 + level / 2, 0], fluid, 32)).castShadow = false;
    put(jar, s.cylinder(R - 0.006, R - 0.006, 0.004, [0, 0.02 + level, 0], new THREE.MeshStandardMaterial({ color: fluidTint.clone().multiplyScalar(0.8), transparent: true, opacity: 0.6, depthWrite: false }), 32));

    // The figure. Its waist is the origin; the upper body can bend there.
    const skinTint = { leather: '#5d4129', waxen: '#c9a79c', verdigris: '#6f8f73', bleached: '#e4dccb' }[a.body];
    const skin = s.material(skinTint, { roughness: 0.8 });
    const scaleTint = { carp: '#b98a2c', eel: '#3f4a3a', shark: '#77838a', veil: '#d9662a' }[a.tail];
    const scales = s.material(new THREE.Color(scaleTint).lerp(new THREE.Color(skinTint), a.verdict === 'convincing' ? 0.45 : 0.1), { roughness: 0.45, metalness: 0.25 });
    const finPaint = s.material(new THREE.Color(scaleTint).lerp(new THREE.Color('#f2dcb0'), 0.35), { roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.88 });
    const black = s.material('#17130f', { roughness: 0.9 });
    const figure = new THREE.Group();
    const ruined = a.verdict === 'ruined', sleeping = a.verdict === 'sleeping';
    const tailLength = a.tail === 'eel' ? 0.23 : 0.2;
    const lowest = 0.045 + tailLength * S;
    const waistY = ruined ? Math.min(Math.max(level - 0.2, 0.1), H - 0.34) : sleeping ? Math.max(0.2, Math.min(level - 0.2, H - 0.36)) : Math.min(Math.max(lowest, level - 0.26), Math.max(lowest, H - 0.3));
    figure.position.set(0, waistY, 0);
    figure.rotation.y = a.verdict === 'watching' ? 0.15 : (random() - 0.5) * 0.9;
    jar.add(figure);
    const upper = new THREE.Group();
    upper.rotation.x = sleeping ? 1.25 : ruined ? -0.3 : a.verdict === 'watching' ? 0.12 : 0.05;
    if (ruined) upper.rotation.z = 0.3;
    figure.add(upper);
    put(upper, s.ball([0.036, 0.058, 0.03], [0, 0.05, 0], skin, 16));
    for (let i = 0; i < 4; i++) put(upper, s.ring(0.031 - i * 0.002, 0.0035, [0, 0.045 + i * 0.016, 0.002], skin)).rotation.x = Math.PI / 2;
    const head = new THREE.Group();
    head.position.set(0, 0.138, 0.004);
    head.rotation.set(sleeping ? 0.5 : a.verdict === 'screaming' ? -0.3 : 0, a.verdict === 'watching' ? 0.25 : 0, 0);
    upper.add(head);
    put(head, s.ball([0.037, 0.04, 0.04], [0, 0, 0], skin, 18));
    put(head, s.ball([0.022, 0.018, 0.02], [0, -0.022, 0.026], skin, 12));
    const open = a.verdict === 'screaming' || a.verdict === 'fake' || ruined;
    put(head, s.ball([0.013, open ? 0.014 : 0.003, 0.008], [0, -0.026, 0.042], black, 10));
    for (const side of [-1, 1]) {
      put(head, s.ball([0.012, 0.016, 0.006], [side * 0.036, 0, 0], skin, 8));
      if (a.verdict === 'watching') {
        put(head, s.ball([0.011, 0.011, 0.008], [side * 0.015, 0.004, 0.034], s.material('#fffbe8', { emissive: '#fff3b0', emissiveIntensity: 0.9, roughness: 0.2 }), 10));
        put(head, s.ball([0.005, 0.005, 0.004], [side * 0.015, 0.004, 0.041], black, 8));
      } else if (a.verdict === 'fake' && side === 1) {
        const button = put(head, s.cylinder(0.012, 0.012, 0.004, [0.016, 0.004, 0.036], s.material('#e6e0cf', { roughness: 0.3 }), 12));
        button.rotation.x = Math.PI / 2;
      } else if (sleeping || a.verdict === 'convincing') put(head, s.box([0.014, 0.002, 0.004], [side * 0.015, 0.002, 0.037], black));
      else put(head, s.ball([0.009, 0.01, 0.006], [side * 0.015, 0.004, 0.034], black, 8));
    }
    // Arms: shoulder, elbow, hand per pose.
    const arms: Record<string, [number[], number[]][]> = {
      fake: [[[0.07, 0.04, 0.02], [0.085, -0.01, 0.045]], [[0.06, 0.09, 0.03], [0.075, 0.14, 0.04]]],
      convincing: [[[0.055, 0.04, 0.01], [0.03, 0.0, 0.04]], [[0.055, 0.04, 0.01], [0.03, 0.005, 0.04]]],
      watching: [[[0.06, 0.06, 0.04], [0.055, 0.1, 0.085]], [[0.06, 0.04, 0.02], [0.05, -0.01, 0.03]]],
      screaming: [[[0.07, 0.06, 0.03], [0.04, 0.13, 0.035]], [[0.07, 0.06, 0.03], [0.04, 0.13, 0.035]]],
      sleeping: [[[0.05, 0.05, 0.03], [0.01, 0.1, 0.045]], [[0.05, 0.04, 0.04], [0.0, 0.03, 0.05]]],
      ruined: [[[0.07, 0.03, 0.0], [0.08, -0.03, 0.01]], [[0.06, 0.1, -0.01], [0.09, 0.15, -0.02]]],
    };
    arms[a.verdict].forEach(([elbow, hand], index) => {
      const side = index === 0 ? 1 : -1;
      const shoulder = [side * 0.034, 0.095, 0] as const, e = [side * elbow[0], elbow[1], elbow[2]] as const, h = [side * hand[0], hand[1], hand[2]] as const;
      put(upper, s.rod(shoulder, e, 0.008, skin, 0.007));
      put(upper, s.rod(e, h, 0.007, skin, 0.006));
      put(upper, s.ball([0.012, 0.012, 0.008], h, skin, 8));
      put(upper, s.ball([0.009, 0.009, 0.009], e, skin, 8));
    });
    // Tail: a tapering chain of segments along a curve, with fins.
    const tail = new THREE.Group();
    const coil = a.tail === 'eel';
    const path = new THREE.CatmullRomCurve3((coil
      ? [[0, 0.01, 0], [0.03, -0.05, 0.03], [0.0, -0.1, 0.065], [-0.06, -0.14, 0.03], [-0.05, -0.18, -0.05], [0.03, -0.21, -0.06], [0.07, -0.225, 0.0]]
      : sleeping ? [[0, 0.01, 0], [0, -0.05, 0.025], [0, -0.09, 0.07], [0, -0.07, 0.115]]
      : [[0, 0.01, 0], [0.012, -0.06, 0.012], [0.03, -0.12, -0.005], [0.012, -0.17, 0.012], [-0.02, -0.2, 0.0]]
    ).map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const segments = coil ? 26 : 16;
    for (let i = 0; i < segments; i++) {
      const t = i / (segments - 1), p = path.getPoint(t), girth = mix(coil ? 0.03 : 0.037, coil ? 0.008 : 0.011, t ** 0.8);
      put(tail, s.ball([girth, girth * 1.05, girth * 0.82], [p.x, p.y, p.z], scales, 10));
    }
    const end = path.getPoint(1), before = path.getPoint(0.93);
    const finShape = new THREE.Shape();
    const [span, reach, notch] = { carp: [0.06, 0.075, 0.035], eel: [0.02, 0.05, 0.04], shark: [0.075, 0.07, 0.015], veil: [0.07, 0.14, 0.06] }[a.tail];
    finShape.moveTo(0, 0); finShape.quadraticCurveTo(span * 0.4, reach * 0.5, span, reach); finShape.quadraticCurveTo(span * 0.2, reach * 0.9, 0, notch); finShape.quadraticCurveTo(-span * 0.2, reach * 0.9, -span, reach); finShape.quadraticCurveTo(-span * 0.4, reach * 0.5, 0, 0);
    const fin = put(tail, s.mesh(new THREE.ShapeGeometry(finShape, 10), finPaint, [end.x, end.y, end.z]));
    fin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(before).normalize());
    if (a.tail !== 'eel') {
      const dorsal = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.05, -0.02), new THREE.Vector2(0.012, -0.075)]);
      const back = put(tail, s.mesh(new THREE.ShapeGeometry(dorsal), finPaint, [0, -0.02, -0.022]));
      back.rotation.y = Math.PI / 2;
    }
    if (ruined) {
      tail.position.set(0.02, (0.06 - figure.position.y) / S, 0.0);
      tail.rotation.set(1.35, random() * 3, 0.2);
      tail.scale.setScalar(0.85);
    }
    figure.add(tail);
    // The join.
    const stitches = a.verdict === 'fake' ? 9 : a.verdict === 'convincing' ? 0 : 7;
    for (let i = 0; i < stitches; i++) {
      const angle = (i / stitches) * Math.PI * 2, big = a.verdict === 'fake' ? 1.9 : 1;
      const stitch = put(figure, s.box([0.004 * big, 0.022 * big, 0.004 * big], [Math.cos(angle) * 0.036, 0.008, Math.sin(angle) * 0.03], black));
      stitch.rotation.z = (i % 2 ? 0.6 : -0.6);
    }
    if (a.verdict !== 'convincing') put(figure, s.ring(0.034, 0.004, [0, 0.008, 0], black)).rotation.x = Math.PI / 2;
    // Hair.
    const strands: THREE.Object3D[] = [];
    if (a.hair) {
      const hairPaint = s.material(a.body === 'bleached' ? '#cfc7a8' : a.body === 'verdigris' ? '#2e4a34' : '#2a1c12', { roughness: 0.8 });
      for (let i = 0; i < 9; i++) {
        const across = (i / 8 - 0.5) * 2, lift = -0.02 + random() * 0.07, back = 0.05 + random() * 0.03;
        const strand = s.tube([[across * 0.028, 0.025, -0.02], [across * 0.04, 0.02 + lift * 0.4, -0.045], [across * 0.045 + (random() - 0.5) * 0.02, 0.02 + lift, -back], [across * 0.03, 0.01 + lift * 1.3, -back - 0.012]], 0.0032, hairPaint);
        head.add(strand);
        strands.push(strand);
      }
    }
    figure.scale.setScalar(S);

    // Sediment and bubbles.
    const flakes = Math.round(mix(0, 16, mood.wear)) + (ruined ? 14 : 0);
    if (flakes) s.scatter(new THREE.BoxGeometry(1, 0.25, 0.7), scales, Array.from({ length: flakes }, () => {
      const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * (R - 0.02);
      return { at: [Math.cos(angle) * radius, standHeight + 0.024, Math.sin(angle) * radius] as const, size: 0.008 + random() * 0.012 };
    }));
    const bubblePaint = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.1 });
    const bubbles = Array.from({ length: Math.round(mix(2, 12, mood.energy)) }, () => {
      const angle = random() * Math.PI * 2, radius = random() * (R - 0.03);
      const bubble = put(jar, s.ball([1, 1, 1], [Math.cos(angle) * radius, 0.03 + random() * (level - 0.02), Math.sin(angle) * radius], bubblePaint, 8));
      bubble.scale.setScalar(0.003 + random() * 0.005);
      bubble.castShadow = false;
      return { bubble, rate: 0.02 + random() * 0.05 };
    });

    // Seal.
    const lid = new THREE.Group();
    lid.position.y = H;
    jar.add(lid);
    const neck = R - 0.02;
    if (a.seal === 'wax') {
      const wax = s.material(mood.wear > 0.6 ? '#7c1f1d' : '#b3211f', { roughness: 0.35 });
      put(lid, s.cylinder(neck - 0.006, neck - 0.01, 0.05, [0, 0.01, 0], s.material('#a9824f')));
      put(lid, s.ball([neck + 0.012, 0.03, neck + 0.012], [0, 0.035, 0], wax, 20));
      for (let i = 0; i < 9; i++) {
        const angle = random() * Math.PI * 2, drop = 0.03 + random() * 0.09;
        put(lid, s.rod([Math.cos(angle) * (neck + 0.006), 0.02, Math.sin(angle) * (neck + 0.006)], [Math.cos(angle) * (neck + 0.012 + (drop > 0.05 ? 0.014 : 0)), 0.02 - drop, Math.sin(angle) * (neck + 0.012 + (drop > 0.05 ? 0.014 : 0))], 0.01, wax, 0.007));
      }
      put(lid, s.cylinder(0.03, 0.03, 0.008, [0, 0.066, 0], wax, 14));
    } else if (a.seal === 'glass') {
      const solid = s.material('#c3d6d0', { roughness: 0.1, transparent: true, opacity: 0.72 });
      put(lid, s.lathe([[0, 0.0], [neck + 0.014, 0.0], [neck + 0.014, 0.012], [neck - 0.02, 0.03], [0.02, 0.045], [0.018, 0.06], [0.036, 0.08], [0.03, 0.1], [0, 0.108]], solid));
    } else if (a.seal === 'brass') {
      const brass = s.material('#b88d3a', { metalness: 0.8, roughness: 0.35 });
      put(lid, s.cylinder(neck + 0.014, neck + 0.014, 0.04, [0, 0.014, 0], brass, 28));
      put(lid, s.cylinder(neck - 0.01, neck + 0.01, 0.012, [0, 0.04, 0], brass, 28));
      put(lid, s.ball([0.016, 0.014, 0.016], [0, 0.055, 0], brass, 10));
    } else if (a.seal === 'bladder') {
      const hide = s.material('#d8c497', { roughness: 0.9 });
      put(lid, s.ball([neck + 0.008, 0.016, neck + 0.008], [0, 0.006, 0], hide, 20));
      put(lid, s.cylinder(neck + 0.006, neck + 0.022, 0.04, [0, -0.02, 0], hide, 20));
      put(lid, s.ring(neck + 0.012, 0.005, [0, -0.012, 0], black)).rotation.x = Math.PI / 2;
    } else {
      const brass = s.material('#b88d3a', { metalness: 0.8, roughness: 0.35 });
      s.cylinder(neck + 0.014, neck + 0.014, 0.035, [R + 0.16, standHeight > 0.1 ? standHeight + 0.0175 : 0.0175, 0.08], brass, 28).visible = true;
    }

    // Tags and labels.
    const tagText = {
      latin: ['Siren juv.', `Banda Sea ${1790 + Math.floor(random() * 90)}`],
      doubt: ['MERMAID', '?'],
      showman: ['SEE THE MERMAID', '10 CENTS'],
      warning: ['DO NOT', 'OPEN'],
      returned: ['RETURNED', 'BY DONOR'],
    }[a.tag];
    const paper = mood.wear > 0.55 ? '#d9c99a' : '#f0e6c8';
    const tag = placard(tagText, 0.19, 0.105, a.tag === 'warning' ? '#8a1c18' : '#33261a', paper);
    const side = random() < 0.5 ? -1 : 1;
    tag.position.set(side * (R + 0.035), H - 0.17, R * 0.72);
    tag.rotation.set(0, side * 0.45, side * -0.14 + (random() - 0.5) * 0.1);
    jar.add(tag);
    put(jar, s.rod([side * (R - 0.03), H - 0.02, R * 0.55], [side * (R + 0.03), H - 0.13, R * 0.72], 0.0025, black));
    put(jar, s.ring(neck + 0.004, 0.003, [0, H - 0.02, 0], black)).rotation.x = Math.PI / 2;
    const number = placard([`No. ${1 + Math.floor(random() * 400)}`], 0.1, 0.048, '#33261a', paper);
    number.position.set(-side * 0.035, 0.07, R + 0.002);
    number.rotation.z = (random() - 0.5) * 0.1;
    jar.add(number);

    // Neighbours on a crowded shelf.
    const others = mood.density > 0.6 ? 1 + Math.round(random()) : 0;
    for (let i = 0; i < others; i++) {
      const x = (i ? -1 : 1) * (R + 0.14 + random() * 0.03) * (a.seal === 'open' && !i ? -1 : 1), z = -0.04 + random() * 0.1, r = 0.05 + random() * 0.02, h = 0.14 + random() * 0.1;
      s.cylinder(r + 0.004, r + 0.006, 0.012, [x, 0.006, z], s.material('#b9cdc6', { roughness: 0.15, transparent: true, opacity: 0.75 }), 20);
      s.cylinder(r, r, h, [x, 0.012 + h / 2, z], glass, 20).castShadow = false;
      s.cylinder(r - 0.004, r - 0.004, h * 0.8, [x, 0.012 + h * 0.4, z], fluid, 20).castShadow = false;
      s.ball([r * 0.5, r * 0.75, r * 0.5], [x, 0.012 + h * 0.35, z], i ? skin : scales, 10);
      s.cylinder(r * 0.9, r * 0.9, 0.025, [x, 0.02 + h, z], s.material('#a9824f'), 16);
    }

    const baseY = figure.position.y, baseTurn = figure.rotation.y, energy = mood.energy;
    return s.finish({
      update: (dt, time) => {
        if (!ruined) figure.position.y = baseY + Math.sin(time * 0.7) * 0.006 * (0.3 + energy);
        figure.rotation.y = baseTurn + Math.sin(time * 0.31) * 0.12 * (0.3 + energy);
        if (a.verdict === 'watching') head.rotation.y = 0.25 + Math.sin(time * 0.45) * 0.3;
        strands.forEach((strand, index) => { strand.rotation.z = Math.sin(time * 0.9 + index) * 0.12; });
        for (const { bubble, rate } of bubbles) {
          bubble.position.y += dt * rate * (0.4 + energy);
          if (bubble.position.y > 0.02 + level) bubble.position.y = 0.03;
        }
      },
    });
  },
});
