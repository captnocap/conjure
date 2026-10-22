import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

const MESSAGES = {
  getwell: ['GET', 'WELL', 'SOON'],
  boy: ['IT\'S A', 'BOY!'],
  girl: ['IT\'S A', 'GIRL!'],
  home: ['WELCOME', 'HOME'],
  congrats: ['CONGRAT-', 'ULATIONS'],
  birthday: ['HAPPY', 'BIRTHDAY'],
  thinking: ['THINKING', 'OF YOU'],
  leaving: ['SORRY', 'YOU\'RE', 'LEAVING'],
} as const;

const PALETTES = {
  rainbow: ['#e5352b', '#f6c21a', '#2f9e4a', '#2a6fd0', '#8b4ac0', '#f07a1e'],
  pastel: ['#f6b8c8', '#b8dcf0', '#fbe6a0', '#c8ecc8', '#d8c4f0', '#fbd0b0'],
  gold: ['#e0b23a', '#f6f1e2', '#c99a2a', '#fbf6e8', '#1f1f22', '#e8c96a'],
  blue: ['#2a6fd0', '#8fc4f0', '#f4f8fb', '#1f4a9c', '#b8dcf0', '#c9ced2'],
  pink: ['#e85a9a', '#f6b8c8', '#fbf4f6', '#c93a7a', '#f08ab4', '#d8c4f0'],
  red: ['#d5202a', '#f4f4f0', '#e85a6a', '#b3141c', '#f6c8cc', '#c9ced2'],
} as const;

export default defineThing({
  questions: {
    message: choice('What does the big foil balloon say?', {
      getwell: 'GET WELL SOON',
      boy: 'IT\'S A BOY!',
      girl: 'IT\'S A GIRL!',
      home: 'WELCOME HOME',
      congrats: 'CONGRATULATIONS',
      birthday: 'HAPPY BIRTHDAY',
      thinking: 'THINKING OF YOU',
      leaving: 'SORRY YOU\'RE LEAVING',
    }),
    deflated: score('How deflated are they?', ['Delivered an hour ago, all tight and straining upward', 'A day old, one or two starting to dip', 'Half of them sagging at head height or lower', 'Days old: most lying wrinkled on the floor, one or two still hovering']),
    palette: choice('What colours are the balloons?', {
      rainbow: 'Loud primary rainbow.',
      pastel: 'Soft nursery pastels.',
      gold: 'Gold, cream and a touch of black, a grown-up celebration.',
      blue: 'Blues, white and silver.',
      pink: 'Pinks and lilac.',
      red: 'Red and white, hearts and roses.',
    }),
    foil: choice('What shape is the big foil balloon?', {
      round: 'A round foil disc with a crimped seam.',
      heart: 'A fat foil heart.',
      star: 'A five-pointed foil star.',
    }),
    anchor: choice('What are the ribbons tied to?', {
      weight: 'A small foil-wrapped balloon weight.',
      giftbag: 'A paper gift bag with rope handles and tissue paper.',
      teddy: 'The paw of a sitting teddy bear.',
      basket: 'The handle of a cellophaned fruit basket.',
      bottle: 'The neck of a bottle of something fizzy in a gift box.',
    }),
    aftermath: choice('What else tells the story?', {
      nothing: 'Nothing more.',
      card: 'An unopened card in its envelope propped against the anchor.',
      popped: 'One balloon has burst: a limp rag of rubber on the end of its ribbon.',
      escaped: 'One ribbon hangs empty and cut; its balloon is gone.',
      confetti: 'Confetti and curls of ribbon scattered on the floor around it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = PALETTES[a.palette].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#8f8a80'), (1 - mood.cheer) * 0.28));
    const tone = (index: number) => palette[index % palette.length];

    // ---- Anchor ----------------------------------------------------------------------------
    let tie: P3 = [0, 0.1, 0];
    const anchorHue = tone(Math.floor(random() * 6));
    if (a.anchor === 'weight') {
      const foil = s.material(anchorHue, { metalness: 0.55, roughness: 0.3 });
      s.lathe([[0, 0], [0.07, 0], [0.075, 0.02], [0.05, 0.07], [0.02, 0.1], [0.012, 0.12], [0, 0.12]], foil);
      for (let i = 0; i < 6; i++) { const angle = (i / 6) * Math.PI * 2; s.mesh(new THREE.ConeGeometry(0.02, 0.07, 4), foil, [Math.cos(angle) * 0.02, 0.15, Math.sin(angle) * 0.02]).rotation.set(Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6); }
      tie = [0, 0.12, 0];
    } else if (a.anchor === 'giftbag') {
      const paperHue = s.material(anchorHue, { roughness: 0.55 });
      s.box([0.26, 0.3, 0.13], [0, 0.15, 0], paperHue);
      const stripe = s.material('#fbf8ee', { roughness: 0.6 });
      for (const x of [-0.07, 0.07]) s.box([0.03, 0.3, 0.132], [x, 0.15, 0], stripe);
      for (const z of [-0.05, 0.05]) s.ring(0.06, 0.005, [0, 0.3, z], s.material('#e9dfc4'), Math.PI);
      for (let i = 0; i < 5; i++) s.mesh(new THREE.ConeGeometry(0.05, 0.12, 4), s.material(tone(i + 1), { roughness: 0.9 }), [(random() - 0.5) * 0.18, 0.33, (random() - 0.5) * 0.05]).rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
      tie = [0, 0.355, 0.05];
    } else if (a.anchor === 'teddy') {
      const fur = s.material(new THREE.Color('#b98452').lerp(new THREE.Color('#e9d2a8'), mood.cheer * 0.6), { roughness: 0.98 });
      const pale = s.material('#f1e2c4', { roughness: 0.98 }), ink = s.material('#191613', { roughness: 0.3 });
      s.ball([0.12, 0.14, 0.105], [0, 0.14, 0], fur);
      s.ball([0.1, 0.092, 0.092], [0, 0.33, 0.015], fur);
      s.ball([0.05, 0.042, 0.042], [0, 0.31, 0.092], pale, 12);
      s.ball([0.015, 0.012, 0.01], [0, 0.325, 0.132], ink, 8);
      for (const side of [-1, 1]) {
        s.ball([0.04, 0.04, 0.02], [side * 0.08, 0.41, 0], fur, 12);
        s.ball([0.011, 0.011, 0.008], [side * 0.037, 0.352, 0.096], ink, 8);
        s.ball([0.045, 0.045, 0.1], [side * 0.085, 0.05, 0.12], fur, 12).rotation.y = side * 0.35;
        s.ball([0.036, 0.038, 0.014], [side * 0.118, 0.05, 0.215], pale, 10);
      }
      s.ball([0.038, 0.095, 0.038], [-0.135, 0.17, 0.03], fur, 12).rotation.z = -0.5;
      s.ball([0.038, 0.1, 0.038], [0.14, 0.24, 0.04], fur, 12).rotation.z = 2.3;
      s.ring(0.07, 0.014, [0, 0.255, 0.008], s.material(tone(0), { roughness: 0.6 })).rotation.x = Math.PI / 2;
      tie = [0.2, 0.31, 0.045];
    } else if (a.anchor === 'basket') {
      const wicker = s.material('#b58a52', { roughness: 0.9, side: THREE.DoubleSide });
      s.lathe([[0, 0.005], [0.14, 0.005], [0.2, 0.13], [0.205, 0.14]], wicker);
      for (let i = 0; i < 3; i++) s.ring(0.15 + i * 0.022, 0.006, [0, 0.03 + i * 0.045, 0], s.material('#8f6a3a', { roughness: 0.9 })).rotation.x = Math.PI / 2;
      s.ring(0.2, 0.01, [0, 0.14, 0], wicker, Math.PI);
      const fruit: [string, number][] = [['#e5352b', 0.055], ['#f08a1e', 0.058], ['#f2d21a', 0.05], ['#7ab83a', 0.055], ['#8b3a6a', 0.04]];
      for (let i = 0; i < 9; i++) {
        const [hue, r] = fruit[Math.floor(random() * fruit.length)];
        const angle = random() * 6, reach = random() * 0.12;
        s.ball([r, r * (hue === '#f2d21a' ? 0.7 : 1), r * (hue === '#f2d21a' ? 1.6 : 1)], [Math.cos(angle) * reach, 0.13 + random() * 0.05, Math.sin(angle) * reach], s.material(hue, { roughness: 0.45 }), 12).rotation.y = angle;
      }
      const wrap = s.mesh(new THREE.ConeGeometry(0.22, 0.3, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.05, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }), [0, 0.3, 0]);
      wrap.castShadow = false;
      tie = [0, 0.345, 0];
    } else {
      s.box([0.11, 0.34, 0.11], [0, 0.17, 0], s.material(anchorHue, { roughness: 0.5 }));
      s.box([0.112, 0.06, 0.112], [0, 0.2, 0], s.material('#f1e6c0', { roughness: 0.4, metalness: 0.4 }));
      s.cylinder(0.02, 0.043, 0.1, [0, 0.38, 0], s.material('#1f3a2a', { roughness: 0.2 }), 14);
      s.cylinder(0.021, 0.021, 0.07, [0, 0.45, 0], s.material('#d9b44a', { metalness: 0.7, roughness: 0.3 }), 12);
      tie = [0, 0.43, 0];
    }

    // ---- Balloon makers --------------------------------------------------------------------
    const float = new THREE.Group();
    float.position.set(...tie);
    s.root.add(float);
    const ribbonHue = s.material('#f6f3ea', { roughness: 0.5 });
    const ribbonTint = s.material(tone(1), { roughness: 0.5 });

    const messageMap = (lines: readonly string[], hue: THREE.Color, wide = 168) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const light = hue.clone().lerp(new THREE.Color('#ffffff'), 0.55).getStyle();
      const gradient = ctx.createRadialGradient(128, 110, 10, 128, 128, 150);
      gradient.addColorStop(0, light);
      gradient.addColorStop(1, hue.getStyle());
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
      const dark = hue.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
      ctx.fillStyle = dark ? 'rgba(40,40,60,0.25)' : 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2, r = 96;
        ctx.beginPath(); ctx.arc(128 + Math.cos(angle) * r * 0.62, 128 + Math.sin(angle) * r, 5 + (i % 3) * 2, 0, 7); ctx.fill();
      }
      ctx.fillStyle = dark ? '#2a2f55' : '#ffffff';
      ctx.strokeStyle = dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 5;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const longest = Math.max(...lines.map((line) => line.length));
      const size = Math.min(88, (wide / longest) * 1.62, 190 / lines.length);
      ctx.font = `bold ${size}px sans-serif`;
      lines.forEach((line, index) => {
        const y = 128 + (index - (lines.length - 1) / 2) * size * 1.05;
        ctx.strokeText(line, 128, y, wide);
        ctx.fillText(line, 128, y, wide);
      });
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const shapeOf = (kind: 'heart' | 'star') => {
      const shape = new THREE.Shape();
      if (kind === 'heart') {
        shape.moveTo(0, -0.95);
        shape.bezierCurveTo(-0.5, -0.5, -1.1, -0.05, -1.05, 0.45);
        shape.bezierCurveTo(-1, 1.0, -0.3, 1.05, 0, 0.55);
        shape.bezierCurveTo(0.3, 1.05, 1, 1.0, 1.05, 0.45);
        shape.bezierCurveTo(1.1, -0.05, 0.5, -0.5, 0, -0.95);
      } else {
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 === 0 ? 1.08 : 0.5;
          if (i === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        shape.closePath();
      }
      return shape;
    };
    const foilGeo = (kind: 'heart' | 'star', puff: number) => {
      const geometry = new THREE.ExtrudeGeometry(shapeOf(kind), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.2 * puff + 0.03, bevelSize: 0.17, bevelSegments: 5, curveSegments: 10 });
      geometry.translate(0, 0, -0.01);
      return geometry;
    };

    /** Builds one balloon hanging point-down from its own origin at the neck. */
    const foilBalloon = (kind: 'round' | 'heart' | 'star', radius: number, hue: THREE.Color, sag: number, lines?: readonly string[]) => {
      const g = new THREE.Group();
      const puff = mix(1, 0.35, sag);
      const skin = (map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : hue, map, metalness: 0.45, roughness: 0.22 + sag * 0.25, emissive: hue, emissiveIntensity: 0.12 });
      if (kind === 'round') {
        for (const start of [0, Math.PI]) {
          const half = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 18, start, Math.PI), skin(lines ? messageMap(lines, hue) : undefined));
          half.scale.z = 0.42 * puff;
          half.position.y = radius + 0.03;
          half.castShadow = true;
          g.add(half);
        }
        const seam = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.0, 0.012, 6, 40), skin());
        seam.scale.z = 0.3;
        seam.position.y = radius + 0.03;
        g.add(seam);
      } else {
        const body = new THREE.Mesh(foilGeo(kind, puff), skin());
        const unit = radius * 0.86;
        body.scale.set(unit, unit, unit * 1.0);
        body.position.y = radius * (kind === 'heart' ? 1.02 : 1.12) + 0.03;
        body.castShadow = true;
        g.add(body);
        if (lines) {
          for (const face of [1, -1]) {
            const plate = new THREE.Mesh(new THREE.CircleGeometry(radius * (kind === 'heart' ? 0.7 : 0.5), 28), new THREE.MeshStandardMaterial({ map: messageMap(lines, hue, 214), metalness: 0.2, roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.08 }));
            plate.position.set(0, body.position.y + (kind === 'heart' ? radius * 0.1 : 0), face * (unit * (0.2 * puff + 0.04) + 0.004));
            if (face < 0) plate.rotation.y = Math.PI;
            g.add(plate);
          }
        }
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 6), skin());
      tail.position.y = 0.012;
      g.add(tail);
      return g;
    };
    const latexBalloon = (radius: number, hue: THREE.Color, sag: number) => {
      const g = new THREE.Group();
      const r = radius * mix(1, 0.6, sag);
      const rubber = new THREE.MeshStandardMaterial({ color: hue, roughness: 0.18 + sag * 0.5, emissive: hue, emissiveIntensity: 0.1 });
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 22; i++) {
        // Round on top, tapering to the knot: an egg standing on its narrow end.
        const theta = (i / 22) * Math.PI, rise = (1 - Math.cos(theta)) / 2;
        const w = Math.sin(theta) * r * (0.6 + 0.4 * rise ** (0.7 + sag));
        points.push(new THREE.Vector2(Math.max(0.0005, w), rise * r * mix(2.35, 2.0, sag) + 0.02));
      }
      const body = new THREE.Mesh(new THREE.LatheGeometry(points, 22), rubber);
      body.castShadow = true;
      g.add(body);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.03, 8), rubber);
      knot.position.y = 0.013;
      g.add(knot);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.5 * (1 - sag), transparent: true, opacity: 0.55 * (1 - sag), depthWrite: false }));
      glint.position.set(-r * 0.42, r * 1.7, r * 0.52);
      glint.scale.set(1, 1.6, 0.4);
      g.add(glint);
      return g;
    };

    // ---- Arrange ---------------------------------------------------------------------------
    type Spec = { make: (sag: number) => THREE.Group; height: number; reach: number; hero?: boolean };
    const heroHue = tone(0);
    const specs: Spec[] = [{ make: (sag) => foilBalloon(a.foil, 0.31, heroHue, sag, MESSAGES[a.message]), height: 1.42, reach: 0, hero: true }];
    const foils = 1 + Math.round(mood.density * 1.4);
    for (let i = 0; i < foils; i++) {
      const kind = (['star', 'heart', 'round'] as const)[(i + (a.foil === 'star' ? 1 : 0)) % 3];
      const hue = tone(i + 2);
      specs.push({ make: (sag) => foilBalloon(kind, 0.18 + random() * 0.03, hue, sag), height: 1.0 + random() * 0.2, reach: 0.3 + random() * 0.06 });
    }
    const latex = 3 + Math.round(mood.density * 5);
    for (let i = 0; i < latex; i++) {
      const hue = tone(i + 1);
      specs.push({ make: (sag) => latexBalloon(0.14 + random() * 0.02, hue, sag), height: 0.8 + random() * 0.4, reach: 0.16 + random() * 0.2 });
    }
    const burst = a.aftermath === 'popped' || a.aftermath === 'escaped' ? 1 + Math.floor(random() * (specs.length - 1)) : -1;
    const spin = random() * Math.PI * 2;
    const floaters: THREE.Object3D[] = [];
    specs.forEach((spec, index) => {
      const angle = spin + (index / (specs.length - 1)) * Math.PI * 2 + (random() - 0.5) * 0.4;
      // Latex gives up first; the foil hero holds out longest.
      const fragile = spec.hero ? -0.35 : index <= foils ? -0.12 : 0.12;
      const sag = clamp01(a.deflated * 1.25 + fragile + (random() - 0.5) * 0.5 * Math.min(1, a.deflated * 4));
      const ribbonMaterial = index % 2 ? ribbonTint : ribbonHue;
      const curl = (at: P3) => {
        const pts: P3[] = [];
        for (let i = 0; i <= 14; i++) { const turn = i * 0.9; pts.push([at[0] + Math.cos(turn) * 0.016, at[1] - i * 0.008, at[2] + Math.sin(turn) * 0.016]); }
        return pts;
      };
      if (index === burst) {
        const reach = spec.reach * 0.6, end: P3 = [Math.cos(angle) * (reach + 0.2), 0.01 - tie[1], Math.sin(angle) * (reach + 0.2)];
        const rag = new THREE.Group();
        if (a.aftermath === 'popped') {
          float.parent!.add(s.tube([[tie[0], tie[1], tie[2]], [tie[0] + end[0] * 0.3, Math.max(0.02, tie[1] * 0.5), tie[2] + end[2] * 0.3], [tie[0] + end[0] * 0.8, 0.008, tie[2] + end[2] * 0.7], [tie[0] + end[0], 0.008, tie[2] + end[2]]], 0.005, ribbonMaterial));
          const scrap = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.11, 5), new THREE.MeshStandardMaterial({ color: tone(index + 1), roughness: 0.7, side: THREE.DoubleSide }));
          scrap.scale.set(1, 1, 0.25);
          scrap.rotation.set(Math.PI / 2, 0, random() * 3);
          rag.add(scrap);
          rag.position.set(tie[0] + end[0], 0.012, tie[2] + end[2]);
          s.root.add(rag);
        } else {
          // Cut ribbon: rises a little way with the others and ends in a curl.
          const top: P3 = [Math.cos(angle) * 0.1, 0.42, Math.sin(angle) * 0.1];
          float.add(s.tube([[0, 0, 0], [top[0] * 0.5, 0.25, top[2] * 0.5], top, ...curl(top)], 0.005, ribbonMaterial));
        }
        return;
      }
      const balloon = spec.make(sag);
      const length = spec.height;
      const onFloor = sag > 0.82;
      if (onFloor) {
        // Spent: lying on the floor at the end of a slack ribbon.
        const reach = 0.28 + random() * 0.4;
        const fx = tie[0] + Math.cos(angle) * reach, fz = tie[2] + Math.sin(angle) * reach;
        balloon.rotation.set(Math.PI / 2 - 0.1 - random() * 0.2, 0, -angle + Math.PI / 2 + (random() - 0.5), 'YXZ');
        balloon.rotation.y = -angle + Math.PI / 2 + (random() - 0.5);
        balloon.position.set(fx, spec.hero ? 0.07 : 0.05, fz);
        s.root.add(balloon);
        s.tube([[tie[0], tie[1], tie[2]], [tie[0] + Math.cos(angle + 0.5) * 0.12, Math.max(0.01, tie[1] * 0.35), tie[2] + Math.sin(angle + 0.5) * 0.12], [mix(tie[0], fx, 0.6) + (random() - 0.5) * 0.15, 0.006, mix(tie[2], fz, 0.6) + (random() - 0.5) * 0.15], [fx, 0.02, fz]], 0.005, ribbonMaterial);
        return;
      }
      // Lift fades as the gas goes: tight ribbons first lean, then go slack and loop.
      const lift = 1 - sag;
      const up = length * mix(-0.08, 1, lift ** 0.8);
      const out = spec.reach * mix(1.5, 1, lift) + (1 - lift) * 0.15;
      const neck: P3 = [Math.cos(angle) * out, Math.max(0.1 - tie[1], up), Math.sin(angle) * out];
      const dist = Math.hypot(...neck);
      const slack = Math.max(0, length - dist);
      const mid: P3 = [neck[0] * 0.55, Math.max(0.01 - tie[1], neck[1] * 0.5 - slack * 0.55), neck[2] * 0.55];
      balloon.position.set(...neck);
      const lean = mix(0.1, 0.5, sag) + (random() - 0.5) * 0.15;
      balloon.rotation.set(Math.sin(angle) * lean, random() * 6 * (spec.hero ? 0 : 1), -Math.cos(angle) * lean);
      if (spec.hero) balloon.rotation.set(-0.28 * (1 - sag), (random() - 0.5) * 0.5, (random() - 0.5) * 0.12 + sag * 0.3);
      const holder = sag < 0.5 ? float : s.root;
      const shift: P3 = sag < 0.5 ? [0, 0, 0] : tie;
      if (sag >= 0.5) balloon.position.set(neck[0] + tie[0], neck[1] + tie[1], neck[2] + tie[2]);
      holder.add(balloon);
      const ribbon = s.tube([[shift[0], shift[1], shift[2]], [mid[0] + shift[0], mid[1] + shift[1], mid[2] + shift[2]], [neck[0] + shift[0], neck[1] + shift[1], neck[2] + shift[2]]], 0.005, ribbonMaterial);
      holder.add(ribbon);
      if (sag < 0.5) floaters.push(balloon);
    });
    // Ribbon tails curling down from the knot.
    for (let i = 0; i < 4; i++) {
      const angle = random() * 6, pts: P3[] = [[tie[0], tie[1], tie[2]]];
      const drop = Math.min(tie[1] - 0.01, 0.12 + random() * 0.1);
      for (let k = 1; k <= 12; k++) pts.push([tie[0] + Math.cos(angle) * 0.05 + Math.cos(k * 0.9 + angle) * 0.018, tie[1] - (k / 12) * drop, tie[2] + Math.sin(angle) * 0.05 + Math.sin(k * 0.9 + angle) * 0.018]);
      s.tube(pts, 0.003, i % 2 ? ribbonTint : ribbonHue);
    }

    // ---- Aftermath -------------------------------------------------------------------------
    if (a.aftermath === 'card') {
      const envelope = s.mesh(new RoundedBoxGeometry(0.19, 0.135, 0.006, 1, 0.002), s.material(tone(3).clone().lerp(new THREE.Color('#ffffff'), 0.6), { roughness: 0.8 }), [0.2, 0.065, 0.12]);
      envelope.rotation.set(-0.32, -0.5, 0.04);
      const flap = s.mesh(new THREE.ConeGeometry(0.095, 0.06, 3), s.material('#f1ece0', { roughness: 0.8 }), [0.2, 0.09, 0.115]);
      flap.scale.z = 0.03;
      flap.rotation.set(-0.32 + Math.PI, -0.5, 0.04);
    } else if (a.aftermath === 'confetti') {
      const bits = Array.from({ length: 70 + Math.round(mood.density * 80) }, () => {
        const angle = random() * 6, r = 0.12 + random() ** 0.7 * 0.6;
        return { at: [Math.cos(angle) * r, 0.004, Math.sin(angle) * r] as P3, size: 0.6 + random() * 0.8, color: tone(Math.floor(random() * 6)) };
      });
      const confetti = s.scatter(new THREE.CylinderGeometry(0.013, 0.013, 0.002, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), bits);
      confetti.castShadow = false;
    }

    const sway = mix(0.01, 0.07, mood.energy);
    const rest = floaters.map((node) => node.position.clone());
    return s.finish({
      footprint: 0.5,
      update: (_dt, time) => {
        float.rotation.z = Math.sin(time * 0.6) * sway;
        float.rotation.x = Math.cos(time * 0.47) * sway * 0.7;
        floaters.forEach((node, index) => { node.position.y = rest[index].y + Math.sin(time * 1.1 + index * 1.7) * sway * 0.12; });
      },
    });
  },
});
