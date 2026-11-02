import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';

type P = [number, number, number];

/** Horizontal strata in vertex colours, by world height, so every limestone part shares one bedding. */
function strata(geometry: THREE.BufferGeometry, lift: number, wear: number, seed: number) {
  const pos = geometry.getAttribute('position');
  const colours = new Float32Array(pos.count * 3);
  const pale = new THREE.Color('#ffffff'), deep = new THREE.Color('#cdb791'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + lift;
    const band = 0.5 + 0.5 * Math.sin(y * 2.3 + Math.sin(y * 0.7 + seed) * 1.5);
    const groove = Math.pow(0.5 + 0.5 * Math.sin(y * 1.1 + seed * 2), 6);
    c.copy(pale).lerp(deep, band * (0.35 + wear * 0.4) + groove * 0.4);
    colours.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
}

/** Alternating bands for the nemes headdress. */
function stripeMap(a: string, b: string, bands = 14) {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 256;
  const g = canvas.getContext('2d')!;
  for (let i = 0; i < bands; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, (i * 256) / bands, 64, 256 / bands + 1); }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export default defineThing({
  questions: {
    era: choice('When are we seeing the sphinx?', {
      buried: 'As early travellers found it: drowned in a drift of sand up to the neck, only the head and the line of the back showing.',
      excavated: 'Freshly dug out in its quarried pit, bedrock walls round it and the ruined block temple before its paws.',
      painted: 'Newly carved in ancient Egypt: red-ochre body, a blue and gold striped headdress, the nose whole and a long plaited beard.',
      today: 'Today: weathered layered rock, the nose gone, the beard broken off, restored masonry blocks along the paws.',
    }),
    stela: choice('What stands between the paws?', {
      stela: 'The tall granite dream stela of Thutmose, round-topped and dark.',
      altar: 'A small offering altar with a smear of red.',
      nothing: 'Nothing: bare sand between the paws.',
    }),
    visitors: choice('Who is at its feet?', {
      none: 'Nobody, the desert empty.',
      tourists: 'A knot of tourists photographing it.',
      camels: 'A guide leading saddled camels past the paws.',
      workers: 'A gang of excavators with baskets and a wooden ladder.',
    }),
    show: choice('Is the sound-and-light show playing on it?', {
      off: 'No show: only the sun.',
      wash: 'Yes: the whole sphinx bathed in one strong coloured light.',
      split: 'Yes: two colours, one on the head and another on the body.',
    }),
    showColour: paint('If the show is on, what colour floods the body?', ['amber', 'gold', 'red', 'magenta', 'purple', 'blue', 'turquoise', 'green', 'white']),
    headColour: paint('If the show uses two colours, what colour lights the head?', ['blue', 'turquoise', 'gold', 'white', 'magenta', 'green', 'red']),
    tail: choice('Where does the tail lie?', {
      curled: 'Curled along its right flank, the tip over the haunch.',
      worn: 'Worn away to a faint ridge.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = a.era === 'painted' ? 0 : Math.min(1, mood.wear * 0.7 + 0.35);
    const painted = a.era === 'painted';
    const lowSun = Math.abs(mood.daylight - 0.5) * 2;
    const glow = Math.min(1, Math.max(0, lowSun * 1.25 - 0.25));
    const showOn = a.show !== 'off';
    const showHex = paintHex(a.showColour);
    const headHex = a.show === 'split' ? paintHex(a.headColour) : showHex;
    const seed = random() * 6;

    const stoneHex = painted ? '#b9603a' : new THREE.Color('#e0c896').lerp(new THREE.Color('#b89c72'), mood.wear * 0.4).getStyle();
    const limestone = new THREE.MeshStandardMaterial({
      color: stoneHex, vertexColors: true, roughness: 0.95,
      emissive: showOn ? showHex : '#000000', emissiveIntensity: showOn ? mix(0.12, 0.65, glow) : 0,
    });
    const headStone = new THREE.MeshStandardMaterial({
      color: painted ? '#c26a40' : stoneHex, vertexColors: true, roughness: 0.92,
      emissive: showOn ? headHex : '#000000', emissiveIntensity: showOn ? mix(0.15, 0.7, glow) : 0,
    });
    const stone = (geometry: THREE.BufferGeometry, at: P, head = false) => {
      geometry.translate(...at);
      strata(geometry, 0, wear, seed);
      return s.mesh(geometry, head ? headStone : limestone);
    };
    const dark = s.material('#2c2622', { roughness: 0.9 });

    // The body: a long boxy superellipse loaf, higher at the shoulders, rounded at the rump.
    const L0 = -32, L1 = 12;
    const groove = (y: number) => 1 - (0.02 + wear * 0.05) * Math.pow(0.5 + 0.5 * Math.sin(y * 1.1 + seed * 2), 6);
    const pow = (x: number, e: number) => Math.sign(x) * Math.pow(Math.abs(x), e);
    const loaf = (u: number, v: number, t: THREE.Vector3) => {
      const z = L0 + v * (L1 - L0);
      const H = 10 + v * 3 - Math.sin(v * Math.PI) * 0.8;
      const rear = v < 0.16 ? Math.sqrt(Math.max(0, 1 - ((0.16 - v) / 0.16) ** 2)) : 1;
      const front = v > 0.9 ? Math.sqrt(Math.max(0, 1 - ((v - 0.9) / 0.1) ** 2)) : 1;
      const cap = rear * front;
      const th = u * Math.PI * 2;
      const hy = pow(Math.sin(th), 0.32);
      const y = H / 2 + hy * (H / 2) * Math.max(cap, 0.02);
      const w = 5.6 * Math.max(cap, 0.02) * (1 - 0.06 * Math.max(0, hy)) * groove(y);
      t.set(pow(Math.cos(th), 0.32) * w, Math.max(0, y), z);
    };
    {
      const mesh = s.surface(loaf, limestone, { segments: [48, 40], wrap: true });
      strata(mesh.geometry, 0, wear, seed);
    }
    // Haunches folded at the rear, the forelegs reaching forward, paws with toes.
    for (const x of [-1, 1]) {
      stone(new THREE.SphereGeometry(1, 20, 12).scale(2.4, 4.2, 8), [x * 5.2, 3.6, -21]);
      stone(new THREE.SphereGeometry(1, 14, 8).scale(1.8, 1.4, 4), [x * 5.5, 1.3, -11]);
      const leg = new THREE.CapsuleGeometry(1.8, 15, 6, 14).rotateX(Math.PI / 2).scale(1.2, 0.85, 1);
      stone(leg, [x * 4.3, 1.75, 19]);
      for (let k = 0; k < 4; k++) stone(new THREE.SphereGeometry(0.55, 8, 6).scale(1, 0.8, 1.3), [x * 4.3 + (k - 1.5) * 0.85, 0.5, 28.2]);
      if (a.era === 'today') {
        const blocks = s.material('#efe2c4', { roughness: 0.9 });
        s.scatter(new THREE.BoxGeometry(1, 1, 1), blocks, Array.from({ length: 8 }, (_u, i) => ({ at: [x * (4.3 + 1.7), 0.5 + (i % 2) * 0.9, 13 + Math.floor(i / 2) * 3] as P, size: 1.05 })));
      }
    }
    // Chest and neck rising to the head.
    stone(new THREE.SphereGeometry(1, 20, 14).scale(5.4, 6.5, 4), [0, 7.2, 9.5]);
    stone(new THREE.CylinderGeometry(2.4, 3.6, 4.5, 16), [0, 14, 12.4]);

    // The head: small for the body, in its nemes headdress.
    const hx = 0, hy = 17.4, hz = 13.6;
    stone(new THREE.SphereGeometry(1, 20, 14).scale(2.05, 2.5, 2.2), [hx, hy, hz], true);
    const nemesStripes = painted ? stripeMap('#2a4f9e', '#d9a93a') : stripeMap('#ffffff', a.era === 'today' && mood.wear < 0.6 ? '#d8b9a0' : '#e6dccb');
    const nemes = new THREE.MeshStandardMaterial({
      color: painted ? '#ffffff' : stoneHex, map: nemesStripes, roughness: 0.9,
      emissive: showOn ? headHex : '#000000', emissiveIntensity: showOn ? mix(0.2, 0.6, glow) : 0,
    });
    s.mesh(new THREE.SphereGeometry(1, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(2.55, 2.4, 2.6), nemes, [hx, hy + 0.4, hz - 0.45]);
    for (const x of [-1, 1]) {
      // Side lappets falling to the chest, and the ear in front of each.
      const lappet = s.mesh(new THREE.BoxGeometry(1.7, 6.4, 1.0), nemes, [x * 3.0, hy - 2.0, hz + 0.4]);
      lappet.rotation.z = x * 0.3;
      lappet.rotation.x = 0.08;
      stone(new THREE.SphereGeometry(1, 10, 8).scale(0.35, 0.8, 0.5), [x * 2.2, hy + 0.1, hz + 0.9], true);
    }
    s.mesh(new THREE.TorusGeometry(2.15, 0.28, 6, 24, Math.PI), nemes, [hx, hy + 1.35, hz + 0.1]).rotation.set(Math.PI / 2 - 0.2, 0, 0);
    // The back flap flaring onto the shoulders.
    const flap = s.mesh(new THREE.CylinderGeometry(2.6, 5.0, 5.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.6), nemes, [hx, hy - 1.6, hz - 2.0]);
    void flap;
    // Face: brow, eyes, mouth; the nose and beard depend on the era.
    const faceZ = hz + 2.15;
    s.box([3.0, 0.3, 0.4], [hx, hy + 0.9, faceZ - 0.15], headStone);
    for (const x of [-0.75, 0.75]) s.box([0.5, 0.22, 0.2], [hx + x, hy + 0.45, faceZ - 0.05], painted ? s.material('#1a1a1a') : s.material('#8a7456', { roughness: 1 }));
    s.box([1.2, 0.14, 0.2], [hx, hy - 1.25, faceZ - 0.12], s.material('#8a7456', { roughness: 1 }));
    if (painted) {
      s.mesh(new THREE.ConeGeometry(0.42, 1.2, 4).rotateX(Math.PI * 0.5), headStone, [hx, hy - 0.35, faceZ + 0.25]);
      s.box([0.9, 3.6, 0.8], [hx, hy - 3.6, faceZ - 0.3], nemes);
      const uraeus = s.material('#d9a93a', { metalness: 0.7, roughness: 0.3 });
      s.cylinder(0.18, 0.25, 1.2, [hx, hy + 2.0, faceZ - 0.2], uraeus, 8);
    } else {
      s.box([0.9, 0.7, 0.3], [hx, hy - 0.35, faceZ - 0.2], s.material('#bfa57d', { roughness: 1 }));
      s.box([0.9, 0.9, 0.7], [hx, hy - 2.7, faceZ - 0.6], headStone);
    }
    if (painted) {
      // Painted collar of blue and gold on the chest.
      s.mesh(new THREE.TorusGeometry(3.2, 0.5, 6, 24, Math.PI), nemes, [0, 12.6, 12.8]).rotation.set(-0.3, 0, Math.PI);
    }

    if (a.tail === 'curled') s.tube([[6.6, 0.6, -30], [7.4, 0.6, -24], [7.6, 0.6, -16], [7.3, 1.4, -11], [6.8, 2.6, -12]], 0.55, limestone);

    // Between the paws.
    if (a.stela === 'stela') {
      const granite = s.material('#4e4644', { roughness: 0.6 });
      s.box([3.4, 5, 0.7], [0, 2.5, 14.5], granite);
      s.cylinder(1.7, 1.7, 0.7, [0, 5, 14.5], granite, 20).rotation.x = Math.PI / 2;
      s.box([2.6, 0.4, 0.1], [0, 4.4, 14.9], s.material('#3a3432'));
    } else if (a.stela === 'altar') {
      s.box([2.2, 1.2, 1.6], [0, 0.6, 22], s.material('#cfc2a6'));
      s.box([1.2, 0.05, 0.8], [0, 1.23, 22], s.material('#9a2a1e'));
    }

    // Ground under it: sand, or the quarried enclosure with the temple, or a drift to the neck.
    const sand = s.material(new THREE.Color('#e3c993').lerp(new THREE.Color('#c6a878'), mood.wear * 0.3), { roughness: 1 });
    if (a.era === 'buried') {
      const drift = s.surface((u, v, t) => {
        const th = u * Math.PI * 2, r = v;
        const x = Math.cos(th) * r * 17, z = Math.sin(th) * r * 36 - 4;
        const h = 12.2 * (1 - Math.pow(r, 2.6)) + Math.sin(th * 3 + seed) * 0.8 * r + Math.sin(z * 0.9 + x * 0.3) * 0.25 * r;
        t.set(x, Math.max(0, h), z);
      }, sand, { segments: [40, 16], wrap: true });
      void drift;
    } else {
      s.surface((u, v, t) => {
        const th = u * Math.PI * 2;
        const edge = 1 + Math.sin(th * 5 + seed) * 0.08 + Math.sin(th * 2 + seed * 3) * 0.1;
        t.set(Math.cos(th) * v * 26 * edge, 0.5 * (1 - v * v) + 0.05, Math.sin(th) * v * 36 * edge + 2);
      }, sand, { segments: [40, 6], wrap: true });
    }
    if (a.era === 'excavated') {
      const rock = new THREE.MeshStandardMaterial({ color: stoneHex, vertexColors: true, roughness: 1 });
      for (const [size, at] of [[[4, 7, 66], [-19, 3.5, -4]], [[4, 7, 66], [19, 3.5, -4]], [[42, 7, 4], [0, 3.5, -36]]] as [P, P][]) {
        const geo = new THREE.BoxGeometry(...size, 2, 8, 2).translate(...at);
        strata(geo, 0, 0.8, seed + 1);
        s.mesh(geo, rock);
      }
      // The temple before it: a low courtyard of square piers and fallen blocks.
      const block = s.material('#d4c3a0', { roughness: 0.95 });
      s.box([30, 0.6, 14], [0, 0.3, 40], block);
      for (let i = 0; i < 6; i++) for (const z of [35, 45]) s.box([1.6, 2.4 + ((i * 7 + z) % 3) * 0.8, 1.6], [-11 + i * 4.4, 1.8, z], s.material('#857471', { roughness: 0.7 }));
      for (let i = 0; i < 10; i++) s.box([2 + random() * 2, 1.2, 1.4 + random()], [(random() - 0.5) * 30, 0.9, 32 + random() * 16], block).rotation.y = random() * 3;
    }

    // People and animals at its feet.
    const skins = ['#c9956a', '#a8724b', '#e2b894', '#7c5236'];
    if (a.visitors === 'tourists') {
      const tops = ['#e24a3a', '#3a6ad4', '#f2f0e8', '#e6c43a', '#4a8a5a'];
      for (let i = 0; i < 6; i++) {
        const person = figure(s, { height: 1.7, style: 'doll', pose: i % 3 === 0 ? 'pointing' : 'standing', hair: i % 2 ? 'hat' : 'cap', top: tops[i % 5], bottom: '#d8cfb6', skin: skins[i % 4], gaze: 'up', mirror: random() < 0.5 });
        s.root.add(person.root);
        person.root.position.set(-6 + i * 2.4 + random(), 0.3, 32 + random() * 3);
        person.root.rotation.y = Math.PI + (random() - 0.5) * 0.8;
      }
    }
    if (a.visitors === 'camels' || a.visitors === 'workers') {
      const guide = figure(s, { height: 1.75, style: 'doll', pose: a.visitors === 'camels' ? 'walking' : 'carrying', hair: 'hood', top: '#efe9dc', bottom: '#efe9dc', skin: skins[1] });
      s.root.add(guide.root);
      guide.root.position.set(10, 0.3, 30);
      guide.root.rotation.y = -Math.PI / 2;
    }
    if (a.visitors === 'camels') {
      const hide = s.material('#b88f5e', { roughness: 0.95 }), blanket = s.material('#b0302a', { roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const cx = 13 + i * 3.4, cz = 30.5 + (random() - 0.5);
        s.ball([1.5, 0.75, 0.6], [cx, 1.9, cz], hide, 12);
        s.ball([0.6, 0.55, 0.45], [cx, 2.55, cz], hide, 10);
        s.box([1.1, 0.12, 0.95], [cx, 2.4, cz], blanket);
        s.rod([cx - 1.3, 2.0, cz], [cx - 1.9, 3.1, cz], 0.2, hide, 0.15);
        s.ball([0.38, 0.22, 0.2], [cx - 2.1, 3.15, cz], hide, 8);
        for (const dx of [-0.9, 0.9]) for (const dz of [-0.25, 0.25]) s.rod([cx + dx, 1.6, cz + dz], [cx + dx * 1.05, 0.3, cz + dz], 0.09, hide);
      }
    }
    if (a.visitors === 'workers') {
      for (let i = 0; i < 5; i++) {
        const w = figure(s, { height: 1.7, style: 'doll', pose: i % 2 ? 'carrying' : 'crouching', hair: 'cap', top: '#e6dcc6', bottom: '#8a7a62', skin: skins[i % 4], gaze: 'down' });
        s.root.add(w.root);
        w.root.position.set(-12 + i * 1.8, 0.3, 24 + random() * 6);
        w.root.rotation.y = random() * 6;
      }
      s.rod([8.5, 0.3, 20], [7.2, 7, 17], 0.12, s.material('#7a5a3a'));
      s.rod([9.3, 0.3, 20], [8.0, 7, 17], 0.12, s.material('#7a5a3a'));
      s.scatter(new THREE.CylinderGeometry(1, 0.7, 0.8, 10), s.material('#8a6a3e'), Array.from({ length: 6 }, () => ({ at: [-10 + random() * 6, 0.6, 30 + random() * 3] as P, size: 0.45 })));
    }

    return s.finish({ footprint: 20 });
  },
});
