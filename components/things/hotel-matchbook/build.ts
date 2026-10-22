import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;

const VENUES = {
  flamingo: 'THE FLAMINGO ROOM: hot pink with a palm tree and a setting sun, a tropical supper club.',
  meridian: 'HOTEL MERIDIAN: navy and gold with a stepped art deco tower, a grand old hotel.',
  parrot: 'BLUE PARROT LOUNGE: black with a neon cocktail glass, a cocktail bar after midnight.',
  anchor: 'THE ANCHOR BAR: cream with a red anchor, a harbour dive.',
  starlite: 'STARLITE MOTEL: teal with a yellow starburst, a roadside motel.',
  dragon: 'GOLDEN DRAGON: lacquer red with a gold medallion, a late restaurant.',
  plain: 'Unmarked matte black with a single gold monogram: a private club that does not advertise.',
} as const;
const VENUE: Record<keyof typeof VENUES, { name: [string, string]; paper: string; ink: string; head: string }> = {
  flamingo: { name: ['THE FLAMINGO', 'ROOM'], paper: '#ef4f8b', ink: '#fff3d6', head: '#2f6a46' },
  meridian: { name: ['HOTEL', 'MERIDIAN'], paper: '#16264d', ink: '#e2b94e', head: '#e2b94e' },
  parrot: { name: ['BLUE PARROT', 'LOUNGE'], paper: '#15151c', ink: '#3fd8ee', head: '#2a8fd8' },
  anchor: { name: ['THE ANCHOR', 'BAR'], paper: '#efe6cc', ink: '#b3262a', head: '#b3262a' },
  starlite: { name: ['STARLITE', 'MOTEL'], paper: '#1f8a8a', ink: '#f6d94a', head: '#f6d94a' },
  dragon: { name: ['GOLDEN', 'DRAGON'], paper: '#b01c22', ink: '#e8c14e', head: '#1a1a1e' },
  plain: { name: ['', ''], paper: '#18181b', ink: '#c9a544', head: '#18181b' },
};

function texture(width: number, height: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

/** The venue's emblem, drawn in a box centred on (x, y) of the given size. */
function emblem(c: CanvasRenderingContext2D, venue: keyof typeof VENUES, x: number, y: number, size: number) {
  const { ink, paper } = VENUE[venue];
  const u = size / 100;
  c.save(); c.translate(x, y); c.scale(u, u);
  c.fillStyle = ink; c.strokeStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
  if (venue === 'flamingo') {
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(0, 18, 34, Math.PI, 0); c.fill();
    c.strokeStyle = '#2a5a3a'; c.lineWidth = 7; c.beginPath(); c.moveTo(4, 44); c.quadraticCurveTo(-6, 0, 6, -30); c.stroke();
    c.lineWidth = 6;
    for (const [dx, dy] of [[-34, -18], [-22, -44], [30, -46], [40, -18], [0, -50]]) { c.beginPath(); c.moveTo(6, -30); c.quadraticCurveTo(6 + dx * 0.5, -30 + dy * 0.9, 6 + dx, -30 + dy * 0.3 + 14); c.stroke(); }
    c.fillStyle = ink; c.fillRect(-46, 18, 92, 5);
  } else if (venue === 'meridian') {
    for (let i = 0; i < 9; i++) { c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 40); const t = Math.PI * (0.12 + i * 0.095); c.lineTo(-Math.cos(t) * 62, 40 - Math.sin(t) * 86); c.stroke(); }
    c.fillStyle = paper; c.fillRect(-22, -30, 44, 76);
    c.fillStyle = ink;
    for (const [w, top] of [[40, 4], [28, -22], [16, -40], [5, -56]]) c.fillRect(-w / 2, top, w, 46 - top);
    c.fillStyle = paper; for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) c.fillRect(-16 + k * 9, 10 + r * 9, 5, 5);
  } else if (venue === 'parrot') {
    c.strokeStyle = '#ff4fa8'; c.lineWidth = 6;
    c.beginPath(); c.moveTo(-36, -34); c.lineTo(36, -34); c.lineTo(0, 6); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(0, 6); c.lineTo(0, 40); c.moveTo(-22, 42); c.lineTo(22, 42); c.stroke();
    c.strokeStyle = ink; c.beginPath(); c.moveTo(-14, -48); c.lineTo(12, -12); c.stroke();
    c.fillStyle = '#b6f04a'; c.beginPath(); c.arc(12, -14, 8, 0, 7); c.fill();
  } else if (venue === 'anchor') {
    c.lineWidth = 9;
    c.beginPath(); c.arc(0, -36, 9, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 40); c.moveTo(-20, -10); c.lineTo(20, -10); c.stroke();
    c.beginPath(); c.arc(0, 8, 34, Math.PI * 0.08, Math.PI * 0.92); c.stroke();
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 34, 14); c.lineTo(side * 44, -2); c.lineTo(side * 24, 2); c.closePath(); c.fill(); }
  } else if (venue === 'starlite') {
    c.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 14 : i % 4 === 0 ? 50 : 30, t = i / 16 * Math.PI * 2 - Math.PI / 2; c.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
    c.closePath(); c.fill();
    c.fillStyle = '#ff6b4a'; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill();
  } else if (venue === 'dragon') {
    c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.stroke();
    c.lineWidth = 9; c.beginPath(); c.moveTo(-28, 22);
    c.bezierCurveTo(-34, -14, -6, -30, 0, -4); c.bezierCurveTo(6, 22, 34, 10, 26, -22); c.stroke();
    c.beginPath(); c.arc(28, -26, 7, 0, 7); c.fill();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-26 + i * 14, 2 - Math.abs(i - 1.5) * 8); c.lineTo(-22 + i * 14, -14 - Math.abs(i - 1.5) * 6); c.lineTo(-16 + i * 14, 0 - Math.abs(i - 1.5) * 8); c.fill(); }
  } else {
    c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 34, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 40, 0, 7); c.stroke();
    c.font = 'italic bold 52px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('M', 0, 3);
  }
  c.restore();
}

export default defineThing({
  questions: {
    venue: choice('Where is the matchbook from?', VENUES),
    inside: choice('What is written inside the cover?', {
      number: 'A phone number, hurried.',
      room: 'A room number and an hour.',
      name: '"Call me" and an initial.',
      meet: 'A place and a time to meet, and "come alone".',
      sorry: 'Just "I\'m sorry."',
      blank: 'Nothing: only the printed warning to close the cover before striking.',
    }),
    pen: choice('If something is written inside, what was it written with?', {
      ballpoint: 'Blue ballpoint.',
      lipstick: 'Red lipstick, thick and smeared.',
      pencil: 'Soft grey pencil.',
    }),
    left: score('How many matches are left in it?', ['One last match', 'A handful', 'About half', 'A full untouched comb']),
    pose: choice('How is it lying?', {
      open: 'Open on its back with the cover standing up, showing the writing.',
      flat: 'Splayed fully flat, cover folded right back.',
      closed: 'Closed, cover tucked in, showing off the venue art.',
    }),
    spent: choice('What spent matches are there?', {
      none: 'None.',
      few: 'Two or three burnt matches dropped beside it.',
      heap: 'A nervous little heap of burnt and broken matches.',
      smoking: 'One just blown out, its head still glowing with a thread of smoke.',
    }),
    surface: choice('What is it lying on or by?', {
      bare: 'The bare bar top.',
      coaster: "A round paper coaster printed with the same venue's emblem.",
      ashtray: 'A glass ashtray with a stubbed-out cigarette.',
      napkin: 'A square cocktail napkin.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const venue = VENUE[a.venue];
    const fade = (colour: string) => `#${new THREE.Color(colour).lerp(new THREE.Color('#9a8f7c'), mood.wear * 0.35).getHexString()}`;
    const paper = fade(venue.paper);
    const W = 0.05, L = 0.05, T = 0.0009;

    const coverArt = texture(256, 256, (c, w, h) => {
      c.fillStyle = paper; c.fillRect(0, 0, w, h);
      c.strokeStyle = venue.ink; c.lineWidth = 5; c.strokeRect(12, 12, w - 24, h - 24);
      emblem(c, a.venue, w / 2, a.venue === 'plain' ? h / 2 : 104, a.venue === 'plain' ? 150 : 132);
      c.fillStyle = venue.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 30px serif'; c.fillText(venue.name[0], w / 2, 192, w - 40);
      c.font = 'bold 34px serif'; c.fillText(venue.name[1], w / 2, 226, w - 40);
    });
    const penColour = { ballpoint: '#1c3a9a', lipstick: '#c4122e', pencil: '#55565a' }[a.pen];
    const digits = Array.from({ length: 7 }, () => Math.floor(random() * 10)).join('');
    const lines: Record<typeof a.inside, string[]> = {
      number: [`${digits.slice(0, 3)}-${digits.slice(3)}`],
      room: [`Rm ${200 + Math.floor(random() * 700)}`, ['11 pm', 'midnight', 'after 1'][Math.floor(random() * 3)]],
      name: ['call me', `— ${'VJMRLD'[Math.floor(random() * 6)]}.`],
      meet: [`Pier ${3 + Math.floor(random() * 30)}`, 'midnight', 'come alone'],
      sorry: ["I'm sorry."],
      blank: [],
    };
    const insideArt = texture(256, 256, (c, w, h) => {
      c.fillStyle = fade('#efe9d8'); c.fillRect(0, 0, w, h);
      c.fillStyle = '#8a8474'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 15px sans-serif'; c.fillText('CLOSE COVER BEFORE STRIKING', w / 2, 236, w - 30);
      c.fillRect(20, 220, w - 40, 2);
      const text = lines[a.inside];
      c.fillStyle = penColour; c.strokeStyle = penColour;
      const thick = a.pen === 'lipstick';
      const size = Math.min(thick ? 60 : 54, 170 / Math.max(text.length, 1.6));
      c.font = `${thick ? 'bold' : 'italic bold'} ${size}px cursive`;
      c.save(); c.translate(w / 2, 112); c.rotate(-0.08 + (random() - 0.5) * 0.1);
      text.forEach((line, i) => c.fillText(line, 0, (i - (text.length - 1) / 2) * size * 1.08, w - 34));
      if (text.length && text.length < 3) { c.lineWidth = thick ? 8 : 4; c.beginPath(); c.moveTo(-80, text.length * size * 0.62); c.quadraticCurveTo(0, text.length * size * 0.62 + 12, 86, text.length * size * 0.62 - 6); c.stroke(); }
      c.restore();
    });
    const card = new THREE.MeshStandardMaterial({ color: fade('#efe9d8'), roughness: 0.9 });
    const outer = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.6 });
    const artMat = new THREE.MeshStandardMaterial({ map: coverArt, roughness: 0.55 });
    const insideMat = new THREE.MeshStandardMaterial({ map: insideArt, roughness: 0.9 });

    const book = new THREE.Group();
    s.root.add(book);
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = book) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); parent.add(node); return node; };
    const boxAt = (size: [number, number, number], at: [number, number, number], material: THREE.Material | THREE.Material[], parent: THREE.Object3D = book) => { const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(...size), material), parent); mesh.position.set(...at); return mesh; };

    // Back cover, the stapled base of the comb and the striker flap folded over it.
    boxAt([W, T, L], [0, T / 2, 0], [outer, outer, card, outer, outer, outer]);
    const baseZ = L / 2 - 0.0065;
    boxAt([W - 0.003, 0.0042, 0.011], [0, T + 0.0021, baseZ], card);
    boxAt([W, 0.006, T], [0, 0.003, L / 2], outer);
    boxAt([W, T, 0.013], [0, T + 0.0047, baseZ], outer);
    boxAt([W - 0.006, 0.0003, 0.0055], [0, T + 0.0053, baseZ + 0.002], new THREE.MeshStandardMaterial({ color: '#4a3526', roughness: 1 }));
    boxAt([0.011, 0.0005, 0.0012], [0, T + 0.0054, baseZ - 0.0035], new THREE.MeshStandardMaterial({ color: '#c9ccce', metalness: 0.9, roughness: 0.3 }));

    // The comb: two rows of ten, torn out from the front as the book empties.
    const total = 20;
    const remaining = Math.max(1, Math.round(mix(1, total, a.left)));
    const order = Array.from({ length: total }, (_u, i) => i).sort(() => random() - 0.5);
    const present = new Set(order.slice(0, remaining));
    const stickMat = new THREE.MeshStandardMaterial({ color: fade('#e6dcc0'), roughness: 0.95 });
    const headMat = new THREE.MeshStandardMaterial({ color: venue.head, roughness: 0.55 });
    const sticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0034, 0.0008, 1), stickMat, total);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), headMat, remaining);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let h = 0;
    for (let i = 0; i < total; i++) {
      const row = i < 10 ? 0 : 1, k = i % 10;
      const x = (k - 4.5) * 0.0044 + (row ? 0.0008 : 0), y = T + 0.0008 + row * 0.0013;
      const there = present.has(i);
      const length = there ? 0.034 - row * 0.002 : 0.002 + random() * 0.003;
      const z0 = baseZ - 0.005;
      const splay = there ? (random() - 0.5) * 0.06 : 0;
      q.setFromEuler(new THREE.Euler(there ? 0.02 + row * 0.03 : 0, splay, 0));
      m.compose(v.set(x, y + (there ? length * 0.012 * (1 + row) : 0), z0 - length / 2), q, sc.set(1, 1, length));
      sticks.setMatrixAt(i, m);
      if (there) {
        m.compose(v.set(x - Math.sin(splay) * length, y + 0.0006 + length * 0.025 * (1 + row), z0 - length), q, sc.set(0.0021, 0.0017, 0.003));
        heads.setMatrixAt(h++, m);
      }
    }
    add(sticks); add(heads);

    // The front cover on its fold.
    const hinge = new THREE.Group();
    hinge.position.set(0, a.pose === 'closed' ? T + 0.0062 : T, -L / 2);
    book.add(hinge);
    const coverLength = L - 0.012;
    boxAt([W, T, coverLength], [0, 0, coverLength / 2], [outer, outer, artMat, insideMat, outer, outer], hinge);
    if (a.pose === 'closed') {
      boxAt([W, 0.0068, T], [0, T / 2 + 0.0034, -L / 2], outer);
      hinge.rotation.x = 0.03;
    } else if (a.pose === 'flat') {
      hinge.rotation.x = -Math.PI + 0.06 + random() * 0.08;
      hinge.position.y = T + 0.0006;
    } else {
      hinge.rotation.x = -mix(1.75, 2.15, random());
    }
    book.rotation.y = (random() - 0.5) * 0.5;

    // What it lies on.
    if (a.surface === 'coaster') {
      const art = texture(256, 256, (c, w, hh) => {
        c.fillStyle = fade('#f1ead6'); c.fillRect(0, 0, w, hh);
        c.fillStyle = paper; c.beginPath(); c.arc(128, 128, 118, 0, 7); c.fill();
        c.strokeStyle = venue.ink; c.lineWidth = 5; c.beginPath(); c.arc(128, 128, 106, 0, 7); c.stroke();
        emblem(c, a.venue, 128, 112, 128);
        c.fillStyle = venue.ink; c.textAlign = 'center'; c.font = 'bold 22px serif'; c.fillText(`${venue.name[0]} ${venue.name[1]}`.trim(), 128, 204, 170);
      });
      const coaster = s.cylinder(0.047, 0.047, 0.002, [-0.052, 0.001, -0.048], [new THREE.MeshStandardMaterial({ color: fade('#f1ead6'), roughness: 1 }), new THREE.MeshStandardMaterial({ map: art, roughness: 0.9 }), card] as unknown as THREE.Material, 40);
      coaster.rotation.y = 0.2 + random() * 0.4;
      s.ring(0.03, 0.0012, [-0.047, 0.0021, -0.044], new THREE.MeshStandardMaterial({ color: '#8a8068', roughness: 0.2, transparent: true, opacity: 0.6 })).rotation.x = Math.PI / 2;
    } else if (a.surface === 'napkin') {
      const napkin = s.box([0.12, 0.0012, 0.12], [-0.012, -0.0006, -0.008], s.material('#f5f2e8', { roughness: 1 }));
      napkin.rotation.y = 0.3 + random() * 0.5;
      book.position.y = 0;
    } else if (a.surface === 'ashtray') {
      const ax = -0.07, az = -0.055;
      s.lathe([[0, 0], [0.05, 0], [0.056, 0.004], [0.058, 0.022], [0.05, 0.022], [0.046, 0.008], [0, 0.007]], new THREE.MeshPhysicalMaterial({ color: mood.warmth > 0.6 ? '#d9a04a' : '#d8e8ec', transparent: true, opacity: 0.5, roughness: 0.05, side: THREE.DoubleSide }), [ax, 0, az]);
      s.ring(0.054, 0.0022, [ax, 0.022, az], new THREE.MeshStandardMaterial({ color: '#f1fafc', transparent: true, opacity: 0.8, roughness: 0.05 })).rotation.x = Math.PI / 2;
      const ash = s.cylinder(0.04, 0.042, 0.003, [ax, 0.009, az], new THREE.MeshStandardMaterial({ color: '#8c8a86', roughness: 1 }), 20);
      ash.castShadow = false;
      const butts = 1 + Math.round(mood.density * 3);
      for (let i = 0; i < butts; i++) {
        const t = random() * 6.28, r = random() * 0.02, turn = random() * 6.28;
        const from: [number, number, number] = [ax + Math.cos(t) * r, 0.013, az + Math.sin(t) * r];
        const to: [number, number, number] = [from[0] + Math.cos(turn) * 0.022, 0.014 + (i === 0 ? 0.01 : 0), from[2] + Math.sin(turn) * 0.022];
        s.rod(from, to, 0.0038, s.material(i % 2 ? '#d99a52' : '#f1ede2', { roughness: 0.9 }));
        s.ball([0.004, 0.003, 0.004], from, new THREE.MeshStandardMaterial({ color: '#3a3836', roughness: 1 }), 8);
      }
    }

    // Spent matches.
    const burnt = new THREE.MeshStandardMaterial({ color: '#1b1917', roughness: 1 });
    const spentAt = (x: number, z: number, yaw: number, y = 0.0006, broken = false) => {
      const g = new THREE.Group();
      g.position.set(x, y, z); g.rotation.y = yaw;
      s.root.add(g);
      const length = broken ? 0.016 : 0.034;
      const char = mix(0.3, 0.6, random()) * length;
      const pale = new THREE.Mesh(new THREE.BoxGeometry(length - char, 0.0008, 0.0026), stickMat); pale.position.x = -(char) / 2;
      const black = new THREE.Mesh(new THREE.BoxGeometry(char, 0.0007, 0.002), burnt); black.position.set((length - char) / 2, 0.0006, 0); black.rotation.z = 0.12;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0017, 8, 6), burnt); tip.position.set(length / 2, 0.0016, 0);
      for (const part of [pale, black, tip]) { part.castShadow = true; g.add(part); }
      return { g, tip };
    };
    const sx = 0.045, sz = 0.02;
    let ember: THREE.MeshStandardMaterial | null = null;
    const smoke: THREE.Mesh[] = [];
    if (a.spent === 'few') for (let i = 0; i < 2 + Math.floor(random() * 2); i++) spentAt(sx + random() * 0.025, sz - 0.03 + i * 0.016 + random() * 0.006, random() * 6.28);
    else if (a.spent === 'heap') for (let i = 0; i < 9 + Math.round(mood.density * 6); i++) spentAt(sx + 0.008 + (random() - 0.5) * 0.03, sz - 0.01 + (random() - 0.5) * 0.03, random() * 6.28, 0.0006 + i * 0.0005, i % 3 === 0).g.rotation.z = (random() - 0.5) * 0.3;
    else if (a.spent === 'smoking') {
      const yaw = -0.5 + random() * 0.6;
      const { tip } = spentAt(sx + 0.008, sz - 0.008, yaw);
      ember = new THREE.MeshStandardMaterial({ color: '#ff6a1c', emissive: '#ff5a10', emissiveIntensity: 2 });
      tip.material = ember; tip.scale.setScalar(1.25);
      const haze = new THREE.MeshBasicMaterial({ color: '#8f9498', transparent: true, opacity: 0.4, depthWrite: false });
      const root = new THREE.Vector3(sx + 0.008 + Math.cos(yaw) * 0.017, 0.003, sz - 0.008 - Math.sin(yaw) * 0.017);
      const points = Array.from({ length: 9 }, (_u, i) => new THREE.Vector3(root.x + Math.sin(i * 1.1) * 0.0015 * i, root.y + i * 0.007, root.z + Math.cos(i * 0.9) * 0.001 * i));
      const wisp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 30, 0.0007, 5), haze);
      s.root.add(wisp);
      smoke.push(wisp);
    }

    const speed = mix(1.5, 6, mood.energy);
    return s.finish(ember ? {
      update: (_dt, time) => {
        ember!.emissiveIntensity = 1.6 + Math.sin(time * speed) * 0.6;
        for (const wisp of smoke) wisp.rotation.y = Math.sin(time * speed * 0.3) * 0.15;
      },
    } : {});
  },
});
