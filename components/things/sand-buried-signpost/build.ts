import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { sandGround, sandTone } from './sand';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type P3 = readonly [number, number, number];

const LEGENDS = {
  town: 'A far town and an absurd distance: TOMBOUCTOU 52 JOURS.',
  water: 'The nearest water, much too far: EAU 380 KM.',
  closed: 'A warning nobody needs any more: ROUTE BARREE.',
  welcome: 'A cheerful greeting to an empty horizon: BIENVENUE.',
  end: 'A plain admission: FIN DE ROUTE.',
  blank: 'Nothing legible at all: the lettering has been sandblasted away.',
} as const;
const TEXT: Record<keyof typeof LEGENDS, string[]> = {
  town: ['TOMBOUCTOU', '52 JOURS'], water: ['EAU', '380 KM'], closed: ['ROUTE', 'BARREE'], welcome: ['BIENVENUE'], end: ['FIN DE', 'ROUTE'], blank: [],
};
const ENAMEL = {
  blue: 'Deep road-sign blue with white lettering.',
  green: 'Highway green with white lettering.',
  yellow: 'Faded chrome yellow with black lettering.',
  white: 'Chalky white with black lettering and a red edge.',
} as const;
const PAINT: Record<keyof typeof ENAMEL, [string, string]> = {
  blue: ['#1f4f9c', '#f4f1e6'], green: ['#256b4a', '#f4f1e6'], yellow: ['#e2b62e', '#1d1b18'], white: ['#ece8dc', '#1d1b18'],
};

export default defineThing({
  questions: {
    kind: choice('What kind of sign is it?', {
      arrow: 'A single enamel direction arrow on a steel pole, pointing off to one side.',
      fingerpost: 'A fingerpost with three arms pointing different ways, each with a place and a distance.',
      marker: 'A squat French-style kilometre stone with a rounded red cap.',
      roundel: 'A round red-ringed speed limit sign, with a small plate beneath it.',
      warning: 'A red warning triangle with a camel on it, and a small plate beneath.',
      busstop: 'A bus stop flag with a timetable frame, waiting for a bus that will not come.',
    }),
    legend: choice('What does its lettering say?', LEGENDS),
    enamel: choice('What colour was the enamel?', ENAMEL),
    burial: score('How deep has the sand buried it?', ['Standing clear, sand only round its foot', 'Up to its waist', 'Drowned to its neck', 'Only the top edge still shows']),
    lean: choice('How does it stand?', {
      upright: 'Still dead upright, stubborn.',
      downwind: 'Leaning gently downwind.',
      toppling: 'Heeled far over, about to go under.',
      twisted: 'Wrenched round and tipped back so it points up at the sky.',
    }),
    left: choice('What has been left on or beside it?', {
      nothing: 'Nothing at all.',
      rag: 'A faded indigo headcloth knotted to it, flapping: someone marked it for someone else.',
      tyre: 'An old tyre leaned against it as a second marker.',
      cairn: 'A small cairn of stones piled up by passing drivers.',
      bottles: 'A few plastic water bottles left for the next traveller.',
      bullets: 'Bullet holes: it has been used for target practice.',
      crow: 'A crow perched on top, the only thing reading it.',
    }),
    road: choice('What remains of the road it stood beside?', {
      none: 'Nothing. There is no trace of any road.',
      tarmac: 'A tongue of cracked tarmac with a centre line, diving under the drift.',
      ruts: 'Two faint tyre ruts wandering past.',
      drums: 'A line of half-buried oil drums that once marked the piste.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sand = sandTone('#e0bd80', mood.warmth);
    const [paintHex, inkHex] = PAINT[a.enamel];
    const blasted = a.legend === 'blank' ? 0.96 : mix(0.12, 0.8, mood.wear);
    const steel = s.material('#8d8a82', { metalness: 0.5, roughness: 0.6 });
    const rust = s.material('#7d4f33', { roughness: 0.95 });
    const paint = s.material(new THREE.Color(paintHex).lerp(new THREE.Color('#9a9488'), blasted * 0.5), { roughness: 0.5 });
    const postMaterial = mood.wear > 0.55 ? rust : steel;
    const holes = a.left === 'bullets';

    /** An enamel face painted on a canvas, then scoured by the wind from the bottom up. */
    const face = (w: number, h: number, lines: string[], bg: string, fg: string, draw?: (g: CanvasRenderingContext2D, W: number, H: number) => void, edge = true) => {
      const canvas = document.createElement('canvas');
      const W = (canvas.width = 512), H = (canvas.height = Math.max(64, Math.round((512 * h) / w)));
      const g = canvas.getContext('2d')!;
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      if (draw) draw(g, W, H);
      else if (edge) {
        g.strokeStyle = fg;
        g.lineWidth = Math.max(6, H * 0.05);
        g.strokeRect(g.lineWidth, g.lineWidth, W - g.lineWidth * 2, H - g.lineWidth * 2);
      }
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const rows = lines.length;
      lines.forEach((line, index) => {
        const size = Math.min((H * 0.72) / rows, (W * 1.5) / Math.max(line.length, 3));
        g.font = `bold ${size}px sans-serif`;
        g.fillText(line, W / 2, H * (0.5 + (index - (rows - 1) / 2) * (0.78 / rows)), W * 0.86);
      });
      for (let i = 0; i < 420 * blasted; i++) {
        g.globalAlpha = 0.25 + random() * 0.6;
        g.fillStyle = random() < 0.35 ? '#7d4f33' : random() < 0.5 ? '#a39c90' : '#c9c1b0';
        const y = H * (1 - random() ** (1.2 + blasted)), length = 20 + random() * 130;
        g.fillRect(random() * W - length / 2, y, length, 1 + random() * H * 0.045);
      }
      g.globalAlpha = 1;
      if (holes) for (let i = 0; i < 5 + Math.floor(random() * 5); i++) {
        const x = W * (0.1 + random() * 0.8), y = H * (0.15 + random() * 0.7), r = Math.max(5, H * 0.035);
        g.fillStyle = '#7d4f33'; g.beginPath(); g.arc(x, y, r * 1.9, 0, 7); g.fill();
        g.fillStyle = '#0d0b0a'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.5, metalness: 0.1 });
    };

    const sign = new THREE.Group();
    const add = <T extends THREE.Object3D>(mesh: T) => { sign.add(mesh); return mesh; };
    const extrude = (shape: THREE.Shape, depth: number, material: THREE.Material) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geometry.translate(0, 0, -depth / 2);
      return add(s.mesh(geometry, material));
    };
    /** A pointed direction board with lettering on its front, its tail at x = 0. */
    const arm = (length: number, height: number, lines: string[], y: number, yaw: number, z = 0.06) => {
      const group = new THREE.Group();
      const tip = height * 0.7;
      const shape = new THREE.Shape().moveTo(-0.1, -height / 2).lineTo(length - tip, -height / 2).lineTo(length, 0).lineTo(length - tip, height / 2).lineTo(-0.1, height / 2).lineTo(-0.1, -height / 2);
      const board = extrude(shape, 0.02, paint);
      const text = s.mesh(new THREE.PlaneGeometry(length - tip + 0.06, height * 0.9), face(length - tip + 0.06, height * 0.9, lines, paintHex, inkHex), [(length - tip - 0.04) / 2, 0, 0.012]);
      group.add(board, text);
      group.position.set(0, y, z);
      group.rotation.y = yaw;
      return add(group);
    };

    const H = { arrow: 2.6, fingerpost: 2.9, marker: 0.82, roundel: 2.5, warning: 2.5, busstop: 2.8 }[a.kind];
    // Where the board sits decides what "to its neck" means.
    const neck = a.kind === 'marker' ? H * 0.72 : a.kind === 'fingerpost' ? H - 1.05 : a.kind === 'busstop' ? H - 0.95 : a.kind === 'arrow' ? H - 0.62 : H - 1.25;
    const level = a.burial < 0.67 ? mix(0.08 * H, neck, a.burial / 0.67) : mix(neck, neck + (H - neck) * 0.62, (a.burial - 0.67) / 0.33);
    // Most of the burial is below y = 0: only a low drift stands proud, and nothing is built under it.
    const buried = Math.min(level, 0.3 + a.burial * 0.25);
    const sunk = level - buried;
    const post = (top: number, bottom: number, material: THREE.Material) => add(s.cylinder(top, bottom, H - sunk, [0, (H + sunk) / 2, 0], material, 12));
    const lines = TEXT[a.legend];
    if (a.kind === 'arrow') {
      post(0.04, 0.04, postMaterial);
      add(s.cylinder(0.05, 0.05, 0.03, [0, H, 0], postMaterial, 12));
      arm(1.5, 0.42, [lines.join(' ')], H - 0.32, 0);
      for (const y of [H - 0.2, H - 0.44]) add(s.box([0.12, 0.03, 0.1], [0, y, 0.01], steel));
    } else if (a.kind === 'fingerpost') {
      post(0.05, 0.055, postMaterial);
      add(s.ball([0.07, 0.07, 0.07], [0, H + 0.03, 0], postMaterial, 12));
      const others = [['AGADEZ', '610 KM'], ['BILMA', '14 JOURS'], ['TAMANRASSET', '880'], ['NULLE PART', '0 KM'], ['PARIS', '3 480']];
      const first = Math.floor(random() * others.length);
      [lines, others[first], others[(first + 2) % others.length]].forEach((text, index) =>
        H - 0.2 - index * 0.34 > sunk + 0.05 && arm(1.05 + random() * 0.25, 0.26, a.legend === 'blank' ? [] : [text.join(' ')], H - 0.2 - index * 0.34, [0.15, 2.5, -1.9][index] + (random() - 0.5) * 0.5, 0));
    } else if (a.kind === 'marker') {
      const w = 0.4, cap = 0.22, body = H - cap;
      const white = s.material('#e9e4d6', { roughness: 0.9 });
      add(s.box([w, body, 0.26], [0, body / 2, 0], white));
      const dome = new THREE.Shape().moveTo(-w / 2, 0).lineTo(w / 2, 0).lineTo(w / 2, cap * 0.35).absarc(0, cap * 0.35, w / 2, 0, Math.PI, false).lineTo(-w / 2, 0);
      const top = extrude(dome, 0.262, s.material(a.enamel === 'yellow' ? '#e2b62e' : '#b5372c', { roughness: 0.8 }));
      top.position.y = body;
      top.scale.y = cap / (cap * 0.35 + w / 2);
      add(s.mesh(new THREE.PlaneGeometry(w * 0.9, cap * 0.5), face(w * 0.9, cap * 0.5, a.legend === 'blank' ? [] : ['N 1'], a.enamel === 'yellow' ? '#e2b62e' : '#b5372c', '#f4f1e6', undefined, false), [0, body + cap * 0.3, 0.134]));
      add(s.mesh(new THREE.PlaneGeometry(w * 0.92, body * 0.6), face(w * 0.92, body * 0.6, lines, '#e9e4d6', '#1d1b18', undefined, false), [0, body * 0.66, 0.132]));
    } else if (a.kind === 'roundel' || a.kind === 'warning') {
      post(0.035, 0.035, postMaterial);
      if (a.kind === 'roundel') {
        const r = 0.36;
        const disc = add(s.cylinder(r, r, 0.02, [0, H - r + 0.06, 0.045], steel, 40));
        disc.rotation.x = Math.PI / 2;
        const limit = ['30', '50', '90', '120'][Math.floor(random() * 4)];
        add(s.mesh(new THREE.CircleGeometry(r * 0.985, 40), face(1, 1, a.legend === 'blank' ? [] : [limit], '#ece8dc', '#1d1b18', (g, W) => {
          g.strokeStyle = '#c2352b'; g.lineWidth = W * 0.13; g.beginPath(); g.arc(W / 2, W / 2, W * 0.43, 0, 7); g.stroke();
        }), [0, H - r + 0.06, 0.057]));
      } else {
        const w = 0.86, h = 0.76;
        const triangle = new THREE.Shape().moveTo(-w / 2, 0).lineTo(w / 2, 0).lineTo(0, h).lineTo(-w / 2, 0);
        const plate = extrude(triangle, 0.02, steel);
        plate.position.set(0, H - h + 0.05, 0.045);
        const front = new THREE.ShapeGeometry(triangle);
        const uv = front.attributes.uv, p = front.attributes.position;
        for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, p.getY(i) / h);
        add(s.mesh(front, face(w, h, [], '#ece8dc', '#1d1b18', (g, W, Hc) => {
          g.strokeStyle = '#c2352b'; g.lineWidth = W * 0.11; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(W * 0.5, Hc * 0.07); g.lineTo(W * 0.95, Hc * 0.95); g.lineTo(W * 0.05, Hc * 0.95); g.closePath(); g.stroke();
          if (a.legend === 'blank') return;
          g.fillStyle = g.strokeStyle = '#1d1b18'; g.lineWidth = W * 0.022; g.lineCap = 'round';
          const cx = W * 0.5, cy = Hc * 0.66;
          g.beginPath(); g.ellipse(cx, cy, W * 0.115, Hc * 0.06, 0, 0, 7); g.fill();
          g.beginPath(); g.ellipse(cx - W * 0.01, cy - Hc * 0.065, W * 0.055, Hc * 0.06, 0, 0, 7); g.fill();
          g.beginPath(); g.moveTo(cx + W * 0.1, cy); g.quadraticCurveTo(cx + W * 0.16, cy - Hc * 0.02, cx + W * 0.165, cy - Hc * 0.17); g.lineTo(cx + W * 0.21, cy - Hc * 0.16); g.stroke();
          for (const dx of [-0.085, -0.05, 0.055, 0.085]) { g.beginPath(); g.moveTo(cx + W * dx, cy + Hc * 0.03); g.lineTo(cx + W * (dx + 0.008), cy + Hc * 0.2); g.stroke(); }
        }), [0, H - h + 0.05, 0.057]));
      }
      const subY = H - (a.kind === 'roundel' ? 0.72 : 0.76) - 0.2;
      if (subY > sunk) {
        add(s.box([0.7, 0.26, 0.016], [0, subY, 0.045], steel));
        add(s.mesh(new THREE.PlaneGeometry(0.68, 0.24), face(0.68, 0.24, [lines.join(' ')], paintHex, inkHex), [0, subY, 0.055]));
      }
    } else {
      post(0.04, 0.04, postMaterial);
      add(s.box([0.62, 0.62, 0.025], [0.36, H - 0.34, 0], paint));
      for (const side of [1, -1]) {
        const flag = add(s.mesh(new THREE.PlaneGeometry(0.58, 0.58), face(1, 1, a.legend === 'blank' ? [] : ['BUS', '12'], paintHex, inkHex), [0.36, H - 0.34, side * 0.014]));
        if (side < 0) flag.rotation.y = Math.PI;
      }
      add(s.box([0.62, 0.18, 0.02], [0.36, H - 0.78, 0], steel));
      add(s.mesh(new THREE.PlaneGeometry(0.6, 0.16), face(0.6, 0.16, [lines.join(' ')], '#ece8dc', '#1d1b18'), [0.36, H - 0.78, 0.012]));
      if (H - 1.75 > sunk) add(s.box([0.4, 0.55, 0.03], [0, H - 1.5, 0.06], steel));
      if (H - 1.75 > sunk) add(s.mesh(new THREE.PlaneGeometry(0.34, 0.49), face(0.34, 0.49, a.legend === 'blank' ? [] : ['06:15', '--:--', '--:--', '--:--'], '#f1ecdc', '#3a3832', undefined, false), [0, H - 1.5, 0.077]));
    }

    const tilt = { upright: 0.02, downwind: 0.2, toppling: 0.62, twisted: 0.12 }[a.lean] + (random() - 0.5) * 0.05;
    const stand = new THREE.Group();
    sign.position.y = -sunk;
    stand.add(sign);
    stand.rotation.set(a.lean === 'twisted' ? -0.55 : (random() - 0.5) * 0.06, a.lean === 'twisted' ? 0.9 : (random() - 0.5) * 0.3, -tilt, 'YXZ');
    s.root.add(stand);

    const radius = (a.kind === 'marker' ? 0.6 : 0.95) + buried * 1.25;
    const sx = radius * 0.55, sz = radius * 0.42, shift = -radius * 0.12;
    const drift = (x: number, z: number) => Math.exp(-(((x - shift) / sx) ** 2 + (z / sz) ** 2));
    const ground = sandGround({
      radius, colour: sand, random, rows: Math.round(10 + radius * 6), stretch: 1.2, dome: 0.05,
      height: (x, z) => (buried * drift(x, z)) / drift(0, 0) * (1 - 0.22 * Math.exp(-(((x - 0.3) / 0.35) ** 2 + (z / 0.3) ** 2))) + 0.02 * Math.sin(x * 2.3 + z * 1.1),
    });
    s.root.add(ground.mesh);
    const on = (x: number, z: number, lift = 0): P3 => [x, ground.y(x, z) + lift, z];

    // What the road left.
    if (a.road === 'tarmac') {
      const tar = s.material('#3c3a38', { roughness: 0.95 });
      const strip = s.box([1.1, 0.08, radius * 1.0], [radius * 0.42, 0.0, radius * 0.42], tar);
      strip.rotation.y = 0.5;
      for (let i = 0; i < 4; i++) {
        const dash = s.box([0.07, 0.085, radius * 0.13], [radius * 0.42 + Math.sin(0.5) * (i - 1.5) * radius * 0.25, 0, radius * 0.42 + Math.cos(0.5) * (i - 1.5) * radius * 0.25], s.material('#d8d2c0'));
        dash.rotation.y = 0.5;
      }
    } else if (a.road === 'ruts') {
      const marks: { at: P3; size: number }[] = [];
      for (const side of [-0.3, 0.3]) for (let i = 0; i < 110; i++) {
        const t = i / 109, x = mix(-radius, radius, t) * 1.05, z = radius * 0.5 + side + Math.sin(t * 4) * 0.18;
        if (ground.y(x, z) > 0.03) marks.push({ at: on(x, z, -0.045), size: 0.06 });
      }
      s.scatter(new THREE.SphereGeometry(1, 8, 5), new THREE.MeshStandardMaterial({ color: sand.clone().multiplyScalar(0.6), roughness: 1 }), marks).castShadow = false;
    } else if (a.road === 'drums') {
      for (let i = 0; i < 3; i++) {
        const x = -radius * 0.6 + i * radius * 0.55 + (random() - 0.5) * 0.2, z = radius * (0.45 + i * 0.06);
        const drum = new THREE.Group();
        const body = s.cylinder(0.29, 0.29, 0.88, [0, 0, 0], i % 2 ? s.material('#b5372c', { roughness: 0.8 }) : rust, 18);
        drum.add(body);
        for (const y of [-0.42, -0.15, 0.15, 0.42]) drum.add(s.ring(0.292, 0.013, [0, y, 0], rust).rotateX(Math.PI / 2));
        drum.add(s.cylinder(0.27, 0.27, 0.02, [0, 0.435, 0], s.material('#4a4038'), 18));
        drum.position.set(x, ground.y(x, z) + random() * 0.2, z);
        drum.rotation.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
        s.root.add(drum);
      }
    }

    // What was left with it.
    stand.updateMatrixWorld(true);
    const top = sign.localToWorld(V(0, H, 0));
    const base = V(0, 0, 0);
    let cloth: THREE.Mesh | null = null;
    let crow: THREE.Group | null = null;
    if (a.left === 'rag') {
      const geometry = new THREE.PlaneGeometry(0.95, 0.24, 12, 2);
      geometry.translate(0.475, 0, 0);
      cloth = s.mesh(geometry, s.material(mood.cheer > 0.6 ? '#2a4fb0' : '#2c3566', { side: THREE.DoubleSide, roughness: 1 }));
      const knot = sign.localToWorld(V(0, Math.max(H - 0.75, mix(level, H, 0.55)), 0.05));
      cloth.position.copy(knot);
      cloth.rotation.z = -0.25;
      s.ball([0.07, 0.06, 0.07], [knot.x, knot.y, knot.z], cloth.material as THREE.Material, 10);
    } else if (a.left === 'tyre') {
      const tyre = s.ring(0.3, 0.11, on(base.x - 0.42, base.z + 0.2, 0.2), s.material('#26231f', { roughness: 0.95 }));
      tyre.geometry.dispose();
      tyre.geometry = new THREE.TorusGeometry(0.3, 0.11, 10, 28);
      tyre.rotation.set(-0.5, 0.9, 0.2);
    } else if (a.left === 'cairn') {
      const stone = s.material('#7c6f62', { flatShading: true, roughness: 1 });
      const cx = base.x + 0.65, cz = base.z + 0.35, cy = ground.y(cx, cz);
      for (let i = 0; i < 13; i++) {
        const layer = i < 6 ? 0 : i < 10 ? 1 : i < 12 ? 2 : 3, spread = [0.26, 0.17, 0.09, 0][layer], angle = random() * 6.28;
        const rock = s.mesh(new THREE.DodecahedronGeometry(0.1 + random() * 0.05, 0), stone, [cx + Math.cos(angle) * spread, cy + 0.05 + layer * 0.13, cz + Math.sin(angle) * spread]);
        rock.rotation.set(random() * 3, random() * 3, random() * 3);
        rock.scale.y = 0.7;
      }
    } else if (a.left === 'bottles') {
      const plastic = new THREE.MeshStandardMaterial({ color: '#bfe1ee', roughness: 0.2, transparent: true, opacity: 0.75 });
      const capMaterial = s.material('#2f6fd0');
      for (let i = 0; i < 4; i++) {
        const x = base.x + 0.3 + i * 0.15 + (random() - 0.5) * 0.1, z = base.z + 0.3 + (random() - 0.5) * 0.25;
        const bottle = new THREE.Group();
        bottle.add(s.cylinder(0.045, 0.045, 0.24, [0, 0.12, 0], plastic, 12), s.cylinder(0.018, 0.045, 0.06, [0, 0.27, 0], plastic, 12), s.cylinder(0.02, 0.02, 0.025, [0, 0.31, 0], capMaterial, 10));
        bottle.position.set(x, ground.y(x, z) - 0.03, z);
        if (i === 3) bottle.rotation.set(1.4, random() * 3, 0);
        s.root.add(bottle);
      }
    } else if (a.left === 'crow') {
      crow = new THREE.Group();
      const feather = s.material('#17161a', { roughness: 0.6 });
      const body = s.ball([0.075, 0.07, 0.14], [0, 0.12, 0], feather, 14);
      body.rotation.x = -0.45;
      const tail = s.box([0.07, 0.012, 0.16], [0, 0.07, -0.16], feather);
      tail.rotation.x = 0.5;
      const beak = s.cylinder(0.002, 0.016, 0.07, [0, 0.21, 0.155], s.material('#2a2622'), 8);
      beak.rotation.x = Math.PI / 2 + 0.15;
      crow.add(body, tail, s.ball([0.045, 0.045, 0.05], [0, 0.22, 0.09], feather, 12), beak, s.rod([0.025, 0, 0], [0.025, 0.07, 0], 0.006, feather), s.rod([-0.025, 0, 0], [-0.025, 0.07, 0], 0.006, feather));
      const perch = a.kind === 'busstop' ? sign.localToWorld(V(0.4, H - 0.03, 0)) : a.kind === 'arrow' ? sign.localToWorld(V(0.7, H - 0.11, 0.06)) : top.clone().add(V(0, a.kind === 'fingerpost' ? 0.09 : 0.01, 0));
      crow.position.copy(perch);
      crow.rotation.y = random() * 6.28;
      crow.scale.setScalar(a.kind === 'marker' ? 1.1 : 1.5);
      s.root.add(crow);
    }
    // Windblown grit on the lee side and a few stones, more when the scene is cluttered.
    s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#85776a', { flatShading: true }), Array.from({ length: 5 + Math.round(mood.density * 16) }, () => {
      const angle = random() * 6.28, r = radius * (0.35 + random() * 0.55);
      return { at: on(Math.cos(angle) * r * 1.2, Math.sin(angle) * r, 0.01), size: 0.02 + random() * 0.035 };
    }));

    const flutter = mix(1.5, 9, mood.energy);
    const rest = cloth ? Float32Array.from(cloth.geometry.attributes.position.array) : null;
    return s.finish({
      footprint: radius * 0.9,
      update: (_dt, time) => {
        if (cloth && rest) {
          const p = cloth.geometry.attributes.position;
          for (let i = 0; i < p.count; i++) {
            const x = rest[i * 3];
            p.setZ(i, Math.sin(x * 9 - time * flutter) * 0.09 * x);
            p.setY(i, rest[i * 3 + 1] + Math.sin(x * 6 - time * flutter * 0.7) * 0.05 * x);
          }
          p.needsUpdate = true;
          cloth.geometry.computeVertexNormals();
        }
        if (crow) crow.rotation.z = Math.sin(time * 0.9) > 0.92 ? 0.25 : 0;
      },
    });
  },
});
