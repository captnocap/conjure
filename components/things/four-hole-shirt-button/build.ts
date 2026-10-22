import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

const MATERIALS = {
  pearl: 'Mother-of-pearl: milky white with a shifting pink and green sheen.',
  white: 'Plain white shirt plastic, the anonymous office button.',
  tortoise: 'Mottled amber and dark brown tortoiseshell from a cardigan.',
  black: 'Glossy black, formal, from a suit or a funeral shirt.',
  navy: 'Dull navy blue school-uniform plastic.',
  wood: 'Turned pale wood with visible grain, from a hand-knitted jumper.',
  pink: 'Pastel pink, from a child\'s cardigan.',
  brass: 'Dull stamped brass metal, from workwear.',
} as const;
const BASE: Record<keyof typeof MATERIALS, string> = {
  pearl: '#f3efe6', white: '#f1f0ea', tortoise: '#b9772c', black: '#1d1c1f', navy: '#27375e', wood: '#c9a36c', pink: '#f0b4c2', brass: '#b8923f',
};
const THREADS = {
  matching: 'Thread the same colour as the button, the factory original.',
  white: 'Ordinary white cotton.',
  black: 'Black thread.',
  red: 'Bright red thread, an obviously wrong-coloured home repair.',
  gold: 'Mustard yellow thread from the bottom of the sewing tin.',
  blue: 'Pale blue thread.',
} as const;
const CLOTHS = {
  oxford: 'White oxford shirt cotton.',
  stripe: 'Blue and white business-shirt stripe.',
  flannel: 'Red and black plaid flannel.',
  denim: 'Faded blue denim.',
  gingham: 'Small pink gingham check, a child\'s dress or a kitchen apron.',
  black: 'Black satin lining.',
} as const;

export default defineThing({
  questions: {
    material: choice('What is the button made of?', MATERIALS),
    style: choice('What shape is it?', {
      rimmed: 'A round disc with a thin raised rim, the standard shirt button.',
      fat: 'A round button with a fat rolled rim and a sunken centre.',
      flat: 'A plain flat round disc with softened edges.',
      square: 'A rounded square, a slightly fancy novelty button.',
    }),
    size: score('How big is it?', ['A tiny collar button', 'A shirt-front button', 'A cardigan button', 'A big coat button']),
    attachment: choice('What is still attached to it?', {
      bare: 'Nothing at all: a clean loose button, a spare.',
      threads: 'Broken threads trailing from its holes where it tore free.',
      scrap: 'It is still firmly sewn to a torn scrap of the garment.',
      dangling: 'It hangs off a scrap of cloth by one last long thread.',
      mending: 'It is half sewn onto cloth, the needle and thread still in it, a repair abandoned midway.',
    }),
    pose: choice('If it is loose, how is it lying?', {
      flat: 'Lying flat, face up.',
      tilted: 'Propped up on one edge at a slant.',
      edge: 'Standing on its rim, caught mid-roll, showing its full face.',
    }),
    fate: choice('What has happened to the button itself?', {
      whole: 'It is whole and sound.',
      chipped: 'A bite is chipped out of the rim.',
      cracked: 'A dark hairline crack runs from one hole out to the rim, but it still holds together.',
      snapped: 'It has snapped in two, the halves lying apart.',
    }),
    stitch: choice('How is the thread stitched through the holes?', {
      cross: 'An X across the four holes.',
      bars: 'Two parallel bars, machine sewn.',
      square: 'A square around the four holes.',
      arrow: 'A crooked Z, hand sewn in a hurry.',
    }),
    thread: choice('What colour is the thread?', THREADS),
    cloth: choice('If there is cloth, what was the garment?', CLOTHS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    s.root.scale.setScalar(0.001); // modelled in millimetres
    const k = mix(8.5, 23, a.size) / 11;
    const R = 5.5 * k, T = (a.style === 'fat' ? 2.8 : 2.1) * Math.sqrt(k), bevel = 0.4 * Math.sqrt(k);
    const h = (a.style === 'fat' ? 1.35 : 1.6) * k * 0.9, hr = 0.95 * Math.sqrt(k);
    const broken = a.fate === 'snapped';
    const onCloth = a.attachment === 'scrap' || a.attachment === 'mending';
    const hasCloth = onCloth || a.attachment === 'dangling';

    // Painted face: pearl bands, tortoise blotches, wood grain, then scuffs and yellowing with wear.
    const base = new THREE.Color(BASE[a.material]);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const g = canvas.getContext('2d')!;
    g.fillStyle = `#${base.getHexString()}`;
    g.fillRect(0, 0, 256, 256);
    if (a.material === 'pearl') {
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = ['rgba(255,170,200,0.28)', 'rgba(150,230,200,0.28)', 'rgba(160,190,255,0.28)', 'rgba(255,255,255,0.5)', 'rgba(250,225,160,0.25)'][i % 5];
        g.lineWidth = 6 + random() * 16;
        g.beginPath();
        const y = random() * 256;
        g.moveTo(-10, y);
        g.bezierCurveTo(80, y + (random() - 0.5) * 90, 170, y + (random() - 0.5) * 90, 266, y + (random() - 0.5) * 60);
        g.stroke();
      }
    } else if (a.material === 'tortoise') {
      for (let i = 0; i < 46; i++) {
        g.fillStyle = ['rgba(46,22,8,0.75)', 'rgba(90,44,12,0.6)', 'rgba(232,166,60,0.5)'][i % 3];
        g.beginPath();
        g.ellipse(random() * 256, random() * 256, 8 + random() * 30, 5 + random() * 16, random() * 3, 0, 7);
        g.fill();
      }
    } else if (a.material === 'wood') {
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(110,70,30,${0.15 + random() * 0.3})`;
        g.lineWidth = 1 + random() * 3;
        g.beginPath();
        const y = i * 6.5 + random() * 4;
        g.moveTo(0, y);
        g.quadraticCurveTo(128, y + (random() - 0.5) * 22, 256, y + (random() - 0.5) * 8);
        g.stroke();
      }
    } else if (a.material === 'brass') {
      for (let r = 10; r < 180; r += 5) {
        g.strokeStyle = `rgba(${r % 10 ? '255,235,170' : '80,55,10'},0.18)`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(128, 128, r, 0, 7);
        g.stroke();
      }
    }
    g.fillStyle = `rgba(150,120,50,${mood.wear * (a.material === 'black' || a.material === 'navy' ? 0.12 : 0.3)})`;
    g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < mood.wear * 70; i++) {
      g.strokeStyle = random() > 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(40,30,20,0.3)';
      g.lineWidth = 0.6 + random();
      g.beginPath();
      const x = random() * 256, y = random() * 256, t = random() * 6.3, l = 6 + random() * 40;
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l);
      g.stroke();
    }
    const face = new THREE.CanvasTexture(canvas);
    face.colorSpace = THREE.SRGBColorSpace;
    face.repeat.set(0.5 / R, 0.5 / R);
    face.offset.set(0.5, 0.5);
    const shell = new THREE.MeshPhysicalMaterial({
      map: face,
      roughness: mix(a.material === 'wood' ? 0.7 : 0.22, 0.75, mood.wear * 0.8),
      metalness: a.material === 'brass' ? 0.85 : 0,
      clearcoat: a.material === 'wood' || a.material === 'brass' ? 0 : 0.6 * (1 - mood.wear * 0.7),
      iridescence: a.material === 'pearl' ? 1 : 0,
      iridescenceIOR: 1.6,
      sheen: a.material === 'pearl' ? 0.6 : 0,
      sheenColor: new THREE.Color('#ffd9ec'),
    });
    
    const threadHex = a.thread === 'matching' ? base.clone().lerp(new THREE.Color('#ffffff'), 0.12) : new THREE.Color({ white: '#f4f1e8', black: '#1a1a1c', red: '#d3202a', gold: '#d8a21c', blue: '#8fb7e0' }[a.thread]);
    if (a.thread === 'matching' && a.material === 'black') threadHex.set('#2b2b30');
    threadHex.lerp(new THREE.Color('#8f8676'), mood.wear * 0.3);
    const yarn = new THREE.MeshStandardMaterial({ color: threadHex, roughness: 0.95 });
    const tr = 0.17 * Math.sqrt(k);

    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const strand = (parent: THREE.Object3D, points: THREE.Vector3[], radius = tr, material: THREE.Material = yarn) =>
      add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(8, points.length * 5), radius, 5), material);

    const outline = (t: number) => {
      const c = Math.abs(Math.cos(t)), sn = Math.abs(Math.sin(t));
      return (R - bevel) * (a.style === 'square' ? 0.92 / Math.pow(c ** 5 + sn ** 5, 0.2) : 1);
    };
    const chipAt = 0.6 + random() * 1.2, chipWide = 0.34 + random() * 0.2;
    const jag = Array.from({ length: 7 }, (_unused, i) => new THREE.Vector2((random() - 0.5) * 0.55 * k, mix(R - bevel, -(R - bevel), (i + 1) / 8)));

    // One piece of button: the whole disc, or one half along a jagged break between the hole pairs.
    const piece = (side: 0 | 1 | -1) => {
      const group = new THREE.Group();
      const points: THREE.Vector2[] = [];
      const from = side === 0 ? 0 : side === 1 ? -Math.PI / 2 : Math.PI / 2;
      const sweep = side === 0 ? Math.PI * 2 : Math.PI;
      const steps = side === 0 ? 72 : 36;
      for (let i = 0; i < (side === 0 ? steps : steps + 1); i++) {
        const t = from + (i / steps) * sweep;
        let r = outline(t);
        if (a.fate === 'chipped') {
          const d = Math.abs(Math.atan2(Math.sin(t - chipAt), Math.cos(t - chipAt))) / chipWide;
          if (d < 1) r -= R * (0.2 + 0.1 * Math.sin(i * 2.3)) * Math.sqrt(1 - d * d);
        }
        points.push(new THREE.Vector2(Math.cos(t) * r, Math.sin(t) * r));
      }
      if (side === 1) points.push(...jag);
      if (side === -1) points.push(...jag.slice().reverse());
      const shape = new THREE.Shape(points);
      const holes: [number, number][] = [];
      for (const hx of [-1, 1]) for (const hy of [-1, 1]) if (side === 0 || hx === side) holes.push([hx * h, hy * h]);
      for (const [hx, hy] of holes) shape.holes.push(new THREE.Path().absarc(hx, hy, hr, 0, Math.PI * 2, true));
      const body = new THREE.ExtrudeGeometry(shape, { depth: T - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 16 });
      body.rotateX(-Math.PI / 2);
      body.translate(0, -T / 2 + bevel, 0);
      add(group, body, shell);
      if (a.style === 'rimmed' || a.style === 'fat') {
        const fat = a.style === 'fat';
        const tube = (fat ? 1.25 : 0.55) * Math.sqrt(k), rimR = R - tube - 0.1 * k;
        let start = side === 0 ? 0 : side === 1 ? -Math.PI / 2 + 0.12 : Math.PI / 2 + 0.12, arc = side === 0 ? Math.PI * 2 : Math.PI - 0.24;
        if (a.fate === 'chipped') { start = chipAt + chipWide * 1.05; arc = Math.PI * 2 - chipWide * 2.1; }
        const rim = new THREE.TorusGeometry(rimR, tube, 8, 56, arc);
        rim.rotateZ(start);
        rim.rotateX(-Math.PI / 2);
        rim.scale(1, 0.6, 1);
        rim.translate(0, T / 2 - tube * 0.15, 0);
        const uv = rim.getAttribute('uv'), position = rim.getAttribute('position');
        for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i), -position.getZ(i));
        add(group, rim, shell);
      }
      return { group, holes: holes.map(([hx, hy]) => new THREE.Vector3(hx, T / 2 + tr * 0.6, -hy)) };
    };

    const button = new THREE.Group();
    s.root.add(button);
    const main = piece(broken ? 1 : 0);
    button.add(main.group);

    if (a.fate === 'cracked') {
      const from = main.holes[1].clone().setY(T / 2 + 0.02), angle = Math.atan2(-from.z, from.x) + (random() - 0.5) * 0.7;
      const crack: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const far = mix(hr, R * 0.99 - Math.hypot(from.x, from.z) * 0.6, i / 6);
        crack.push(new THREE.Vector3(from.x + Math.cos(angle) * far + (i % 6 ? (random() - 0.5) * 0.5 * k : 0), T / 2 + 0.03 - (i > 4 ? bevel * 0.6 * (i - 4) : 0), from.z - Math.sin(angle) * far + (i % 6 ? (random() - 0.5) * 0.5 * k : 0)));
      }
      strand(main.group, crack, 0.11 * Math.sqrt(k), new THREE.MeshStandardMaterial({ color: '#1c130c', roughness: 1 }));
    }

    // Stitches lie over the face between the holes.
    const stitched = a.attachment !== 'bare';
    const pairs: [number, number][] = broken ? [[0, 1]] : { cross: [[0, 3], [1, 2]], bars: [[0, 1], [2, 3]], square: [[0, 1], [1, 3], [3, 2], [2, 0]], arrow: [[0, 1], [1, 2], [2, 3]] }[a.stitch] as [number, number][];
    const sewnPairs = a.attachment === 'mending' && !broken ? pairs.slice(0, 1) : pairs;
    if (stitched && (a.attachment !== 'threads' || random() > 0.35))
      for (const [i, j] of sewnPairs) {
        const p = main.holes[i], q = main.holes[j];
        const across = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3(0, 1, 0)).normalize();
        for (const off of [-1, 0, 1]) {
          const shift = across.clone().multiplyScalar(off * tr * 1.5);
          strand(main.group, [p.clone().add(shift).setY(T / 2 - tr), p.clone().add(shift), p.clone().lerp(q, 0.5).add(shift).setY(T / 2 + tr * (1.6 + Math.abs(off))), q.clone().add(shift), q.clone().add(shift).setY(T / 2 - tr)]);
        }
      }

    // Where the button sits.
    let clothTop = 0;
    const site = new THREE.Vector3();
    if (hasCloth) clothTop = 0.35;
    const pose = hasCloth ? (a.attachment === 'dangling' ? 'tilted' : 'flat') : a.pose;
    const lean = 0.16 + random() * 0.1, tilt = 0.3 + random() * 0.22;
    if (onCloth) button.position.set(0, clothTop + T / 2 + 0.5 * Math.sqrt(k), 0);
    else if (pose === 'flat') button.position.set(0, T / 2, 0);
    else if (pose === 'tilted') {
      button.rotation.z = tilt;
      button.position.set(0, R * Math.sin(tilt) + (T / 2) * Math.cos(tilt), 0);
    } else {
      button.rotation.x = Math.PI / 2 - lean;
      button.position.set(0, outline(Math.PI / 2) * Math.cos(lean) + bevel + (T / 2) * Math.sin(lean), 0);
    }
    button.rotation.y = pose === 'edge' ? (random() - 0.5) * 0.5 : random() * Math.PI * 2;
    if (a.attachment === 'dangling') {
      site.set(-(R * 1.5 + 5), 0, (random() - 0.5) * 6);
      button.position.x += R * 0.6;
    }
    button.updateMatrixWorld(true);

    if (broken) {
      const other = piece(-1);
      const away = new THREE.Group();
      away.add(other.group);
      const angle = random() * Math.PI * 2, far = R * (1.5 + random() * 0.8);
      away.position.set(button.position.x + Math.cos(angle) * far, clothTop + T / 2, Math.sin(angle) * far);
      away.rotation.set(random() > 0.6 ? Math.PI : 0, random() * 6.3, 0);
      s.root.add(away);
    }

    // Loose ends: out of a hole, over the rim, and off across the ground.
    const trail = (from: THREE.Vector3, length: number, to?: THREE.Vector3) => {
      const start = button.localToWorld(from.clone());
      const out = new THREE.Vector3(start.x - button.position.x, 0, start.z - button.position.z);
      if (out.length() < 0.01) out.set(1, 0, 0);
      out.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), (random() - 0.5) * 1.2);
      const points = [start.clone().add(new THREE.Vector3(0, -tr, 0)), start.clone().add(new THREE.Vector3(0, tr * 1.5, 0))];
      const reach = pose === 'edge' ? R * 0.5 : R + 0.6 * k;
      const over = start.clone().addScaledVector(out, pose === 'edge' ? 1.2 * k : R * 0.6);
      over.y = Math.max(over.y - (pose === 'edge' ? 0.4 : 0), clothTop + T * 0.6 + tr);
      points.push(over);
      const land = new THREE.Vector3(button.position.x, clothTop + tr, button.position.z).addScaledVector(out, reach + 1.2 * k);
      if (pose === 'edge') land.z = Math.max(land.z, button.position.z + T + 1);
      points.push(land);
      let heading = Math.atan2(out.z, out.x), turn = (random() - 0.5) * 0.9;
      const at = land.clone();
      const steps = Math.max(2, Math.round(length / 1.4));
      for (let i = 0; i < steps; i++) {
        heading += turn + (random() - 0.5) * 0.8;
        turn *= 0.9;
        at.x += Math.cos(heading) * 1.4;
        at.z += Math.sin(heading) * 1.4;
        if (to) at.lerp(new THREE.Vector3(to.x, at.y, to.z), (i + 1) / steps);
        points.push(at.clone().setY(clothTop + tr + (i === steps - 1 && !to ? tr * 3 : 0)));
      }
      strand(s.root, points);
      if (!to) for (let f = 0; f < 3; f++) strand(s.root, [points.at(-1)!.clone(), points.at(-1)!.clone().add(new THREE.Vector3((random() - 0.5) * 1.6, tr * (1 + random() * 3), (random() - 0.5) * 1.6))], tr * 0.45);
      return points;
    };
    if (a.attachment === 'threads') {
      const count = 2 + Math.round(mood.density * 2 + random());
      for (let i = 0; i < count; i++) trail(main.holes[i % main.holes.length], (5 + random() * 9) * Math.sqrt(k) * mix(0.7, 1.4, mood.wear));
    }
    if (a.attachment === 'dangling') trail(main.holes[0], 6 * k, site);

    if (hasCloth) {
      // A torn scrap: painted weave with a ragged alpha edge, wrinkled away from the button.
      const cw = R * (5 + random() * 1.2), cd = R * (4 + random());
      const weave = document.createElement('canvas');
      weave.width = weave.height = 512;
      const w = weave.getContext('2d')!;
      const tones = { oxford: ['#eef0ee', '#dfe4e6'], stripe: ['#f2f3f1', '#5f86c4'], flannel: ['#b3242b', '#1c1a1c'], denim: ['#55729c', '#8ea4c4'], gingham: ['#f7eef0', '#e88aa4'], black: ['#1f1e24', '#34323c'] }[a.cloth];
      w.save();
      w.beginPath();
      const corners = 30;
      for (let i = 0; i < corners; i++) {
        const t = (i / corners) * Math.PI * 2;
        const sq = 1 / Math.pow(Math.abs(Math.cos(t)) ** 6 + Math.abs(Math.sin(t)) ** 6, 1 / 6);
        const r = 236 * sq * (0.8 + random() * 0.2);
        w.lineTo(256 + Math.cos(t) * r, 256 + Math.sin(t) * r);
      }
      w.closePath();
      w.clip();
      w.fillStyle = tones[0];
      w.fillRect(0, 0, 512, 512);
      w.fillStyle = tones[1];
      if (a.cloth === 'stripe') for (let x = 0; x < 512; x += 28) w.fillRect(x, 0, 9, 512);
      if (a.cloth === 'flannel' || a.cloth === 'gingham') {
        const step = a.cloth === 'flannel' ? 96 : 40;
        w.globalAlpha = 0.5;
        for (let x = 0; x < 512; x += step) { w.fillRect(x, 0, step / 2, 512); w.fillRect(0, x, 512, step / 2); }
        w.globalAlpha = 1;
      }
      for (let i = 0; i < 512; i += 4) {
        w.fillStyle = `rgba(${a.cloth === 'black' ? '255,255,255' : '0,0,0'},${a.cloth === 'denim' ? 0.16 : 0.06})`;
        if (a.cloth === 'denim') { w.save(); w.translate(i * 2 - 256, 0); w.rotate(0.6); w.fillRect(0, -200, 2, 1100); w.restore(); } else { w.fillRect(i, 0, 1, 512); w.fillRect(0, i, 512, 1); }
      }
      w.fillStyle = `rgba(120,100,60,${mood.wear * 0.3})`;
      for (let i = 0; i < 12; i++) { w.beginPath(); w.ellipse(random() * 512, random() * 512, 30 + random() * 70, 20 + random() * 50, random() * 3, 0, 7); w.fill(); }
      w.restore();
      w.strokeStyle = tones[0];
      w.lineWidth = 2.5;
      for (let i = 0; i < 90; i++) {
        const t = random() * Math.PI * 2, r0 = 180 + random() * 20;
        w.beginPath();
        w.moveTo(256 + Math.cos(t) * r0, 256 + Math.sin(t) * r0);
        w.lineTo(256 + Math.cos(t + (random() - 0.5) * 0.2) * (r0 + 40 + random() * 30), 256 + Math.sin(t + (random() - 0.5) * 0.2) * (r0 + 40 + random() * 30));
        w.stroke();
      }
      const fabric = new THREE.CanvasTexture(weave);
      fabric.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.PlaneGeometry(cw, cd, 44, 36);
      plane.rotateX(-Math.PI / 2);
      const position = plane.getAttribute('position');
      const p1 = random() * 6, p2 = random() * 6, corner = random() * Math.PI * 2;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        const d = Math.hypot(x - site.x, z - site.z), calm = clamp01((d - R * 0.9) / (R * 1.6));
        const ripple = 0.5 + 0.25 * Math.sin(x * 0.42 + p1) + 0.25 * Math.sin(z * 0.5 + x * 0.21 + p2);
        const curl = clamp01((Math.cos(Math.atan2(z, x) - corner) - 0.6) * 2.5) * clamp01(Math.hypot(x, z) / (cw * 0.5) - 0.45) * 9;
        position.setY(i, clothTop - 0.05 + calm * ripple * mix(1.2, 3.2, mood.wear) * Math.sqrt(k) + curl * Math.sqrt(k));
      }
      plane.computeVertexNormals();
      plane.translate(a.attachment === 'dangling' ? -(R * 1.5 + 5) - site.x : 0, 0, 0);
      add(s.root, plane, new THREE.MeshStandardMaterial({ map: fabric, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
      if (a.attachment === 'dangling') {
        // What is left where the button was: a tuft of stubs and four needle holes.
        for (let i = 0; i < 6; i++) strand(s.root, [site.clone().setY(clothTop), site.clone().add(new THREE.Vector3((random() - 0.5) * 2.4 * k, clothTop + (0.8 + random() * 1.6) * k, (random() - 0.5) * 2.4 * k))], tr * 0.8);
      }
      if (a.attachment === 'mending') {
        const steel = new THREE.MeshStandardMaterial({ color: '#cfd4d8', metalness: 0.9, roughness: 0.25 });
        const long = R * 5, swing = random() * Math.PI * 2;
        const eye = new THREE.Vector3(Math.cos(swing) * (R + 3), clothTop + 3.2 * Math.sqrt(k), Math.sin(swing) * (R + 3));
        const tip = eye.clone().add(new THREE.Vector3(Math.cos(swing + 1.1) * long, 0, Math.sin(swing + 1.1) * long)).setY(clothTop + 0.5);
        const needle = add(s.root, new THREE.CylinderGeometry(0.42 * Math.sqrt(k), 0.04, long, 8), steel);
        needle.position.copy(eye).lerp(tip, 0.5);
        needle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tip.clone().sub(eye).normalize());
        const from = button.localToWorld(main.holes[main.holes.length - 1].clone());
        const sag = from.clone().lerp(eye, 0.5).add(new THREE.Vector3((random() - 0.5) * 6, 2.5 * k, (random() - 0.5) * 6));
        strand(s.root, [from.clone().setY(from.y - tr * 2), from.clone().setY(from.y + k), sag, eye.clone().setY(eye.y + 0.3), eye.clone().add(new THREE.Vector3(Math.cos(swing) * 4, -1.5, Math.sin(swing) * 4)), eye.clone().add(new THREE.Vector3(Math.cos(swing + 0.6) * 9, 0, Math.sin(swing + 0.6) * 9)).setY(clothTop + tr + 0.6)]);
      }
    }

    const rocking = pose === 'edge' ? main.group : null;
    const baseY = button.rotation.y;
    return s.finish({
      update: rocking ? (_dt, time) => {
        rocking.rotation.y = Math.sin(time * mix(0.6, 3, mood.energy)) * 0.5 * mood.energy;
        button.rotation.y = baseY + Math.sin(time * mix(0.4, 2, mood.energy) + 1) * 0.08 * mood.energy;
      } : undefined,
    });
  },
});
