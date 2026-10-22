import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const HOLIDAYS = {
  christmas: 'Christmas: red, green and gold baubles, tinsel and a tree-top angel.',
  halloween: 'Halloween: orange, black and purple, with a plastic pumpkin pail.',
  easter: 'Easter: pastel eggs, paper grass and a long-eared rabbit.',
  party: 'Birthdays and New Year: foil streamers, hot pink and silver, a stack of cone hats.',
  everything: 'Every holiday thrown in together, with the angel on top.',
} as const;
type Holiday = keyof typeof HOLIDAYS;
const PALETTE: Record<Holiday, string[]> = {
  christmas: ['#c8202c', '#d9a520', '#1f7a3f', '#cfd5da', '#b01835'],
  halloween: ['#f07818', '#26222b', '#6b2fa0', '#7fc21e', '#f0a020'],
  easter: ['#f6b3c6', '#f5e07a', '#a8e0c4', '#c7b3ee', '#a6d4f2'],
  party: ['#f2c230', '#d6dade', '#ff3f93', '#28c4d8', '#7d4be0'],
  everything: ['#c8202c', '#d9a520', '#f07818', '#f6b3c6', '#28c4d8', '#1f7a3f', '#6b2fa0'],
};
const WORDS: Record<Holiday, string[]> = {
  christmas: ['XMAS', 'XMAS DECS', 'TREE STUFF'],
  halloween: ['HALLOWEEN', 'SPOOKY'],
  easter: ['EASTER'],
  party: ['PARTY', 'BIRTHDAYS'],
  everything: ['DECORATIONS', 'HOLIDAYS'],
};
const BULBS = {
  multi: ['#ff3b30', '#ffcc00', '#34c759', '#2f7bff', '#ff7ad9'],
  warm: ['#ffd27a', '#ffc35a', '#ffe0a0'],
  ice: ['#cfe8ff', '#9fd0ff', '#ffffff'],
  'red-green': ['#ff3b30', '#34c759'],
};

export default defineThing({
  questions: {
    holiday: choice('Which holiday is in the box?', HOLIDAYS),
    state: choice('How has the box been left?', {
      sealed: 'Taped shut for another year, a little tinsel escaping the seam.',
      neat: 'Opened carefully: baubles in their tray, tinsel coiled, lights looped.',
      rummaged: 'Flaps splayed, half the contents pulled out over the side and onto the floor.',
      tipped: 'Knocked onto its side, everything pouring out across the floor.',
    }),
    lights: choice('What are the fairy lights doing?', {
      none: 'There are no fairy lights.',
      dark: 'A dark unplugged tangle.',
      lit: 'Plugged in and glowing, every bulb alive.',
      patchy: 'Plugged in but half the bulbs are dead.',
    }),
    bulbs: choice('If there are fairy lights, what colour are the bulbs?', {
      multi: 'Old-fashioned multicolour.',
      warm: 'Warm white, candle-like.',
      ice: 'Cold blue-white.',
      'red-green': 'Alternating red and green.',
    }),
    baubles: score('How many glass baubles are there?', ['None left', 'A last few', 'A dozen', 'Far too many']),
    figure: choice('What has become of the ornament for the top of the tree (the angel, or its holiday counterpart)?', {
      bent: 'Still here but bent and crooked from years under the weight of the rest.',
      proud: 'Standing straight, the one thing kept carefully.',
      missing: 'Missing. Nobody knows where it went.',
    }),
    label: choice('How is the box labelled?', {
      neat: 'Neat block capitals in black marker.',
      scrawl: 'A child\'s wobbly writing with a doodle.',
      relabelled: 'An older label crossed out and the holiday written underneath.',
      printed: 'A reused shipping box, FRAGILE in red print, with a marker word added.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.54, D = 0.4, H = 0.34, T = 0.007;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const palette = PALETTE[a.holiday];
    const tipped = a.state === 'tipped', sealed = a.state === 'sealed', neat = a.state === 'neat';
    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };

    // ---- the box
    const cardHex = new THREE.Color('#b98f5c').lerp(new THREE.Color('#8f7858'), mood.wear * 0.5);
    const card = new THREE.MeshStandardMaterial({ color: cardHex, roughness: 0.92 });
    const cardInside = new THREE.MeshStandardMaterial({ color: cardHex.clone().multiplyScalar(0.78), roughness: 0.95 });
    const crate = new THREE.Group();
    s.root.add(crate);
    const word = pick(WORDS[a.holiday]);
    const face = (flip: boolean) => paint(512, 320, (ctx) => {
      ctx.fillStyle = `#${cardHex.getHexString()}`; ctx.fillRect(0, 0, 512, 320);
      ctx.strokeStyle = 'rgba(70,45,20,0.16)'; ctx.lineWidth = 1;
      for (let x = 0; x < 512; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 320); ctx.stroke(); }
      for (let i = 0; i < Math.round(mood.wear * 6); i++) { const x = random() * 512, r = 40 + random() * 70; const g = ctx.createRadialGradient(x, 320, 0, x, 320, r); g.addColorStop(0, 'rgba(60,40,20,0.55)'); g.addColorStop(1, 'rgba(60,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, 320 - r, r * 2, r); }
      ctx.fillStyle = 'rgba(214,186,130,0.85)'; ctx.fillRect(226, 0, 60, 90);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (flip) { ctx.translate(256, 160); ctx.rotate(Math.PI); ctx.translate(-256, -160); }
      const marker = '#17161a';
      if (a.label === 'printed') {
        ctx.fillStyle = '#b3261f'; ctx.fillRect(20, 228, 472, 12); ctx.font = 'bold 54px sans-serif'; ctx.fillText('FRAGILE', 256, 276);
        for (const x of [60, 452]) { ctx.beginPath(); ctx.moveTo(x, 130); ctx.lineTo(x + 28, 172); ctx.lineTo(x + 9, 172); ctx.lineTo(x + 9, 214); ctx.lineTo(x - 9, 214); ctx.lineTo(x - 9, 172); ctx.lineTo(x - 28, 172); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = marker; ctx.font = 'bold 74px sans-serif'; ctx.fillText(word, 256, 150, 330);
      } else if (a.label === 'relabelled') {
        const old = pick(['KITCHEN', 'BOOKS', 'MUM\'S ROOM', 'MISC']);
        ctx.fillStyle = 'rgba(40,50,110,0.75)'; ctx.font = 'bold 62px sans-serif'; ctx.fillText(old, 256, 138, 420);
        ctx.strokeStyle = marker; ctx.lineWidth = 9; for (const dy of [-10, 8]) { ctx.beginPath(); ctx.moveTo(60, 138 + dy); ctx.lineTo(452, 132 + dy * 1.4); ctx.stroke(); }
        ctx.fillStyle = marker; ctx.font = 'bold 82px sans-serif'; ctx.fillText(word, 256, 236, 470);
      } else if (a.label === 'scrawl') {
        ctx.fillStyle = pick(['#b3261f', '#1f4fb3', '#1f7a3f', '#17161a']); ctx.font = 'bold 84px sans-serif';
        const letters = word.split(''), step = Math.min(64, 400 / letters.length);
        letters.forEach((letter, index) => { ctx.save(); ctx.translate(256 - 40 + (index - (letters.length - 1) / 2) * step, 150 + (random() - 0.5) * 34); ctx.rotate((random() - 0.5) * 0.4); ctx.fillText(letter, 0, 0); ctx.restore(); });
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 8; ctx.beginPath();
        if (a.holiday === 'halloween') { ctx.arc(440, 230, 44, 0, 7); ctx.moveTo(440, 186); ctx.lineTo(446, 166); }
        else if (a.holiday === 'easter') ctx.ellipse(440, 226, 36, 50, 0, 0, 7);
        else if (a.holiday === 'party') { ctx.ellipse(440, 200, 34, 42, 0, 0, 7); ctx.moveTo(440, 242); ctx.quadraticCurveTo(425, 270, 446, 300); }
        else { ctx.moveTo(440, 150); ctx.lineTo(400, 270); ctx.lineTo(480, 270); ctx.closePath(); ctx.moveTo(440, 270); ctx.lineTo(440, 300); }
        ctx.stroke();
      } else { ctx.fillStyle = marker; ctx.font = 'bold 96px sans-serif'; ctx.fillText(word, 256, 170, 460); }
    });
    const labelMaterial = (flip: boolean) => new THREE.MeshStandardMaterial({ map: face(flip), roughness: 0.92 });
    const sag = mood.wear * 0.07;
    const wall = (width: number, at: P3, turn: number, lean: number, label?: THREE.Material) => {
      const hinge = new THREE.Group(); hinge.position.set(...at); hinge.rotation.y = turn; crate.add(hinge);
      const tilt = new THREE.Group(); tilt.rotation.x = lean; hinge.add(tilt);
      put(tilt, new THREE.BoxGeometry(width, H, T), card, [0, H / 2, 0]);
      put(tilt, new THREE.PlaneGeometry(width - 0.004, H - 0.004), cardInside, [0, H / 2, -T / 2 - 0.001]).rotation.y = Math.PI;
      if (label) put(tilt, new THREE.PlaneGeometry(width, H), label, [0, H / 2, T / 2 + 0.0012]).castShadow = false;
      return tilt;
    };
    put(crate, new THREE.BoxGeometry(W, T, D), card, [0, T / 2, 0]);
    wall(W, [0, 0, D / 2], 0, sag, labelMaterial(false));
    wall(W, [0, 0, -D / 2], Math.PI, sag, tipped ? labelMaterial(true) : undefined);
    wall(D, [W / 2, 0, 0], Math.PI / 2, sag * 0.7);
    wall(D, [-W / 2, 0, 0], -Math.PI / 2, sag * 0.7);
    // flaps: angle 0 is folded shut, pi/2 upright, more is splayed outward
    const flap = (width: number, length: number, at: P3, turn: number, angle: number) => {
      const hinge = new THREE.Group(); hinge.position.set(...at); hinge.rotation.y = turn; crate.add(hinge);
      const leaf = new THREE.Group(); leaf.rotation.x = angle; hinge.add(leaf);
      put(leaf, new THREE.BoxGeometry(width - 0.006, T * 0.8, length), card, [0, 0, -length / 2]);
    };
    const out = sag * H;
    const angles = sealed ? [0.02, 0.02, 0.05, 0.05]
      : neat ? [2.2, 2.3, 2.0, 2.1].map((v) => v + (random() - 0.5) * 0.3)
      : tipped ? [1.56, 1.0 + random() * 0.3, 2.0 + random() * 0.4, 2.1 + random() * 0.4]
      : [2.5 + random() * 0.5, 1.9 + random() * 0.8, 2.2 + random() * 0.9, 1.6 + random() * 1.2];
    flap(W, D / 2, [0, H, D / 2 + out], 0, angles[0]);
    flap(W, D / 2, [0, H, -D / 2 - out], Math.PI, angles[1]);
    flap(D, sealed ? D * 0.3 : W * 0.4, [W / 2 + out * 0.7, H - (sealed ? 0.008 : 0), 0], Math.PI / 2, angles[2]);
    flap(D, sealed ? D * 0.3 : W * 0.4, [-W / 2 - out * 0.7, H - (sealed ? 0.008 : 0), 0], -Math.PI / 2, angles[3]);
    if (sealed) put(crate, new THREE.BoxGeometry(W + 0.01, 0.002, 0.06), new THREE.MeshStandardMaterial({ color: '#d8bd86', roughness: 0.35 }), [0, H + T, 0]);
    if (tipped) { crate.rotation.x = Math.PI / 2; crate.position.y = D / 2 + T / 2; crate.rotation.z = 0; }
    const yaw = tipped ? (random() - 0.5) * 0.5 : 0;

    // ---- where things can be
    const mouthZ = tipped ? H : D / 2;
    const heapY = sealed ? H + 0.02 : H * 0.97;
    const inside = (): P3 => tipped
      ? [(random() - 0.5) * (W - 0.14), 0.04 + random() * 0.1, H - 0.12 + random() * 0.26]
      : [(random() - 0.5) * (W - 0.14), heapY + random() * 0.06, (random() - 0.5) * (D - 0.14)];
    const floor = (reach = 1): P3 => [(random() - 0.5) * 0.95, 0, mouthZ + 0.1 + random() * (tipped ? 0.62 : 0.4) * reach];
    if (!sealed && !tipped) {
      // crumpled tissue fills the box below what can be seen
      put(crate, new THREE.BoxGeometry(W - 0.03, H * 0.88, D - 0.03), new THREE.MeshStandardMaterial({ color: neat ? '#e9e3d4' : '#d9d0bb', roughness: 1 }), [0, H * 0.46, 0]);
      for (let i = 0; i < 9; i++) { const wad = s.ball([0.07 + random() * 0.05, 0.03, 0.06 + random() * 0.04], [(random() - 0.5) * (W - 0.14), H * 0.9, (random() - 0.5) * (D - 0.14)], new THREE.MeshStandardMaterial({ color: '#efe9da', roughness: 1 }), 8); wad.rotation.y = random() * 3; }
    }

    // ---- tinsel: a core with a fringe of foil
    const strand = (points: P3[], colour: string) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const length = curve.getLength(), count = Math.round(length * 620);
      const foil = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.35, roughness: 0.3, side: THREE.DoubleSide, emissive: colour, emissiveIntensity: mix(0.12, 0.4, mood.cheer) });
      const fringe = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.007, 0.062), foil, count);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), base = new THREE.Color(colour), tint = new THREE.Color();
      for (let i = 0; i < count; i++) {
        e.set(random() * Math.PI, random() * Math.PI, random() * Math.PI); q.setFromEuler(e);
        matrix.compose(curve.getPointAt(i / count), q, one); fringe.setMatrixAt(i, matrix);
        fringe.setColorAt(i, tint.copy(base).offsetHSL(0, 0, (random() - 0.5) * 0.3));
      }
      fringe.castShadow = true; s.root.add(fringe);
      s.mesh(new THREE.TubeGeometry(curve, Math.max(16, Math.round(length * 60)), 0.012, 6), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.5 }));
    };
    const overEdge = (x: number): P3[] => tipped
      ? [[x, 0.09, H - 0.1], [x + 0.03, 0.05, H + 0.08]]
      : [[x, heapY + 0.05, 0.04], [x + 0.02, H + 0.05 + out, D / 2 + 0.02 + out], [x + 0.03, H * 0.55, D / 2 + 0.06 + out], [x + 0.02, 0.06, D / 2 + 0.09]];
    const strands = sealed ? 1 : 1 + Math.round(mood.density * 2);
    for (let i = 0; i < strands; i++) {
      const colour = pick(palette);
      if (sealed) { const x = (random() < 0.5 ? -1 : 1) * (0.17 + random() * 0.06); strand([[x, H + 0.02, 0.05], [x + 0.03, H + 0.045, D / 2 - 0.02], [x + 0.05, H - 0.03, D / 2 + 0.05], [x + 0.03, H - 0.16, D / 2 + 0.045]], colour); }
      else if (neat) {
        const cx = W * 0.27, cz = (i - (strands - 1) / 2) * 0.11, points: P3[] = [];
        for (let k = 0; k <= 14; k++) { const t = k / 14 * Math.PI * 4; points.push([cx + Math.cos(t) * 0.055, heapY + 0.02 + k * 0.003, cz + Math.sin(t) * 0.05]); }
        strand(points, colour);
      } else {
        const x = [-0.21, 0.2, -0.13][i % 3] * (tipped ? 0.7 : 1) + (random() - 0.5) * 0.04;
        const points: P3[] = [tipped ? [x * 0.6, 0.1, H - 0.25] : [x - 0.08, heapY + 0.03, -0.1], ...overEdge(x)];
        let px = x, pz = mouthZ + 0.14;
        for (let k = 0; k < 3; k++) { px += (random() - 0.5) * 0.3; pz += 0.08 + random() * 0.12; points.push([px, 0.04, pz]); }
        strand(points, colour);
      }
    }

    // ---- baubles (eggs at Easter)
    const eggs = a.holiday === 'easter';
    const total = Math.round(a.baubles ** 1.2 * 24 * mix(0.75, 1.15, mood.density));
    const R = 0.036;
    const spots: { at: P3; size: number }[] = [];
    if (neat) {
      const tray = new THREE.MeshStandardMaterial({ color: cardHex.clone().multiplyScalar(1.08), roughness: 0.95 });
      for (let i = 0; i <= 3; i++) put(crate, new THREE.BoxGeometry(0.004, 0.05, D - 0.05), tray, [-W / 2 + 0.03 + i * 0.085, H * 0.93, 0]);
      for (let k = 0; k <= 4; k++) put(crate, new THREE.BoxGeometry(0.255, 0.05, 0.004), tray, [-W / 2 + 0.03 + 0.1275, H * 0.93, -D / 2 + 0.025 + k * (D - 0.05) / 4]);
      for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) if (spots.length < total) spots.push({ at: [-W / 2 + 0.0725 + i * 0.085, H * 0.93 + 0.02, -D / 2 + 0.025 + (k + 0.5) * (D - 0.05) / 4], size: 1 });
    } else if (!sealed) {
      const spilled = tipped ? 0.75 : 0.4;
      for (let i = 0; i < total; i++) {
        const size = 0.75 + random() * 0.5;
        if (random() < spilled) { const p = floor(); spots.push({ at: [p[0], R * size, p[2]], size }); } else spots.push({ at: inside(), size });
      }
    } else if (total > 4) { const p = floor(0.4); spots.push({ at: [p[0], R, p[2]], size: 1 }); }
    if (spots.length) {
      const glass = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.16 });
      const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(R, 18, 12), glass, spots.length);
      const caps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.009, 0.011, 0.014, 8), new THREE.MeshStandardMaterial({ color: '#d0a94a', metalness: 0.7, roughness: 0.3 }), eggs ? 0 : spots.length);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), up = new THREE.Vector3();
      spots.forEach(({ at, size }, index) => {
        const loose = !neat;
        e.set(loose ? (random() - 0.5) * 2.6 : 0, random() * 6, loose ? (random() - 0.5) * 2.6 : 0); q.setFromEuler(e);
        matrix.compose(new THREE.Vector3(...at), q, new THREE.Vector3(size, size * (eggs ? 1.32 : 1), size)); balls.setMatrixAt(index, matrix);
        balls.setColorAt(index, new THREE.Color(pick(palette)));
        if (!eggs) { up.set(0, R * size + 0.004, 0).applyQuaternion(q); matrix.compose(new THREE.Vector3(...at).add(up), q, new THREE.Vector3(1, 1, 1)); caps.setMatrixAt(index, matrix); }
      });
      balls.castShadow = caps.castShadow = true; s.root.add(balls, caps);
      // one broken, when things have gone badly
      if (!neat && !sealed && mood.wear > 0.55 && !eggs) {
        const p = floor(0.7), colour = pick(palette);
        const shard = new THREE.MeshStandardMaterial({ color: colour, metalness: 0.3, roughness: 0.16, side: THREE.DoubleSide });
        const half = put(s.root, new THREE.SphereGeometry(R, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), shard, [p[0], R * 0.8, p[2]]); half.rotation.set(2.4, random() * 3, 0.3);
        for (let i = 0; i < 6; i++) { const bit = put(s.root, new THREE.CircleGeometry(0.012 + random() * 0.012, 3), shard, [p[0] + (random() - 0.5) * 0.16, 0.003, p[2] + (random() - 0.5) * 0.16]); bit.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.5, 0, random() * 6); bit.castShadow = false; }
      }
    }

    // ---- fairy lights
    type Bulb = { colour: THREE.Color; phase: number; alive: boolean };
    const bulbs: Bulb[] = [];
    let bulbMesh: THREE.InstancedMesh | null = null;
    const on = a.lights === 'lit' || a.lights === 'patchy';
    if (a.lights !== 'none') {
      const points: P3[] = [];
      if (neat) { const cx = -0.12 + random() * 0.2, cz = D / 2 + 0.22; for (let k = 0; k <= 20; k++) { const t = k / 20 * Math.PI * 6; points.push([cx + Math.cos(t) * (0.1 + (k % 3) * 0.008), 0.014 + k * 0.0012, cz + Math.sin(t) * (0.085 + (k % 4) * 0.006)]); } }
      else if (sealed) { for (let k = 0; k < 9; k++) points.push([(random() - 0.5) * (W - 0.12), H + 0.03 + random() * 0.03, (random() - 0.5) * (D - 0.12)]); points.push([W * 0.3, H + 0.03, D / 2 + 0.01], [W * 0.33, H * 0.4, D / 2 + 0.03], [W * 0.3, 0.014, D / 2 + 0.1], [W * 0.1, 0.014, D / 2 + 0.25]); }
      else {
        for (let k = 0; k < 4; k++) points.push(inside());
        const x = (random() - 0.5) * 0.3; points.push(...overEdge(x).map((p): P3 => [p[0], Math.max(p[1] - 0.03, 0.014), p[2] + 0.012]));
        for (let k = 0; k < 9; k++) { const p = floor(); points.push([p[0], 0.014 + (k % 2) * 0.012, p[2]]); }
      }
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.6);
      const length = curve.getLength();
      s.mesh(new THREE.TubeGeometry(curve, Math.round(length * 50), 0.0045, 5), new THREE.MeshStandardMaterial({ color: '#1f3a26', roughness: 0.7 }));
      const count = Math.min(70, Math.round(length / 0.075));
      const material = on ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : new THREE.MeshStandardMaterial({ roughness: 0.25 });
      bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.013, 10, 8), material, count);
      const halo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.2, 0.34, mood.cheer), depthWrite: false }), on ? count : 0);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), colours = BULBS[a.bulbs];
      for (let i = 0; i < count; i++) {
        const p = curve.getPointAt((i + 0.5) / count); p.y = Math.max(p.y + 0.008, 0.016);
        e.set(random() * 3, random() * 3, random() * 3); q.setFromEuler(e);
        matrix.compose(p, q, new THREE.Vector3(1, 1.7, 1)); bulbMesh.setMatrixAt(i, matrix);
        const alive = on && (a.lights === 'lit' ? true : random() < 0.5);
        const colour = new THREE.Color(colours[i % colours.length]);
        bulbs.push({ colour, phase: random() * 6.3, alive });
        bulbMesh.setColorAt(i, alive ? colour : colour.clone().multiplyScalar(on ? 0.16 : 0.45));
        if (on) { matrix.compose(p, q, alive ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(0, 0, 0)); halo.setMatrixAt(i, matrix); halo.setColorAt(i, colour); }
      }
      s.root.add(bulbMesh); if (on) s.root.add(halo);
      // the plug
      const end = curve.getPointAt(1);
      s.box([0.03, 0.022, 0.04], [end.x, 0.012, end.z], s.material('#e9e6dc'));
    }

    // ---- the tree-topper, or its counterpart
    if (a.figure !== 'missing') {
      const bent = a.figure === 'bent';
      const fig = new THREE.Group();
      const kind = a.holiday === 'everything' ? 'christmas' : a.holiday;
      if (kind === 'christmas') {
        const white = s.material('#f3efe2'), gold = new THREE.MeshStandardMaterial({ color: '#d9aa3a', metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide });
        put(fig, new THREE.CylinderGeometry(0.016, 0.085, 0.21, 18, 1, true), white, [0, 0.105, 0]);
        const hem = put(fig, new THREE.TorusGeometry(0.085, 0.008, 6, 24), gold, [0, 0.008, 0]); hem.rotation.x = Math.PI / 2;
        const upper = new THREE.Group(); upper.position.set(0, 0.2, 0); fig.add(upper);
        put(upper, new THREE.SphereGeometry(0.034, 14, 10), s.material('#eccaa6'), [0, 0.035, 0]);
        put(upper, new THREE.SphereGeometry(0.037, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), s.material('#e3c063'), [0, 0.038, -0.006]);
        const halo = put(upper, new THREE.TorusGeometry(0.036, 0.005, 6, 20), gold, [0, 0.088, -0.005]); halo.rotation.x = Math.PI / 2;
        for (const side of [-1, 1]) {
          const wing = put(fig, new THREE.SphereGeometry(1, 12, 8), gold, [side * 0.075, 0.185, -0.028]); wing.scale.set(0.05, 0.095, 0.008);
          wing.rotation.z = -side * (bent && side > 0 ? 1.5 : 0.55);
          if (bent && side > 0) wing.position.y = 0.13;
          const arm = put(fig, new THREE.CylinderGeometry(0.01, 0.012, 0.08, 6), white, [side * 0.035, 0.155, 0.03]); arm.rotation.set(-1.0, 0, side * 0.5);
        }
        put(fig, new THREE.OctahedronGeometry(0.02), gold, [0, 0.15, 0.07]);
        if (bent) { upper.rotation.z = 0.75; upper.rotation.x = 0.25; halo.rotation.y = 0.7; halo.position.x = 0.02; }
      } else if (kind === 'halloween') {
        const skin = paint(256, 128, (ctx) => {
          ctx.fillStyle = '#f0781a'; ctx.fillRect(0, 0, 256, 128); ctx.strokeStyle = '#c85a10'; ctx.lineWidth = 3;
          for (let x = 0; x < 256; x += 21) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
          ctx.fillStyle = '#17120c'; const cx = 64;
          for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + side * 16, 38); ctx.lineTo(cx + side * 27, 60); ctx.lineTo(cx + side * 6, 60); ctx.closePath(); ctx.fill(); }
          ctx.beginPath(); ctx.moveTo(cx - 30, 74); ctx.lineTo(cx - 18, 84); ctx.lineTo(cx - 9, 76); ctx.lineTo(cx, 86); ctx.lineTo(cx + 9, 76); ctx.lineTo(cx + 18, 84); ctx.lineTo(cx + 30, 74); ctx.lineTo(cx + 20, 98); ctx.lineTo(cx - 20, 98); ctx.closePath(); ctx.fill();
        });
        const pail = put(fig, new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0.35, Math.PI - 0.35), new THREE.MeshStandardMaterial({ map: skin, roughness: 0.45, side: THREE.DoubleSide }), [0, 0.095, 0]); pail.scale.y = bent ? 0.7 : 0.88;
        const handle = put(fig, new THREE.TorusGeometry(0.1, 0.006, 6, 24, Math.PI), s.material('#17120c'), [0, 0.17, 0]); handle.rotation.set(bent ? 1.2 : 0.3, Math.PI / 2, 0);
      } else if (kind === 'easter') {
        const fur = s.material(mood.wear > 0.6 ? '#d8d0bf' : '#f6f2ea', { roughness: 1 }), pink = s.material('#f2a7b8');
        const body = put(fig, new THREE.SphereGeometry(1, 16, 12), fur, [0, 0.085, 0]); body.scale.set(0.07, 0.085, 0.06);
        put(fig, new THREE.SphereGeometry(0.052, 16, 12), fur, [0, 0.2, 0.008]);
        for (const side of [-1, 1]) {
          const ear = new THREE.Group(); ear.position.set(side * 0.024, 0.24, 0); ear.rotation.z = -side * 0.15; fig.add(ear);
          if (bent && side > 0) ear.rotation.set(0.4, 0, -1.9);
          const outer = put(ear, new THREE.SphereGeometry(1, 10, 8), fur, [0, 0.07, 0]); outer.scale.set(0.02, 0.08, 0.012);
          const innerEar = put(ear, new THREE.SphereGeometry(1, 10, 8), pink, [0, 0.07, 0.008]); innerEar.scale.set(0.011, 0.06, 0.006);
          put(fig, new THREE.SphereGeometry(0.008, 8, 6), s.material('#16130f'), [side * 0.02, 0.212, 0.054]);
          const paw = put(fig, new THREE.SphereGeometry(1, 8, 6), fur, [side * 0.045, 0.02, 0.045]); paw.scale.set(0.024, 0.02, 0.04);
        }
        put(fig, new THREE.SphereGeometry(0.009, 8, 6), pink, [0, 0.195, 0.06]);
        const bow = put(fig, new THREE.BoxGeometry(0.075, 0.03, 0.02), s.material(pick(palette)), [0, 0.152, 0.045]); bow.rotation.z = 0.1;
      } else {
        for (let i = 0; i < 3; i++) {
          const cone = put(fig, new THREE.ConeGeometry(0.075, 0.2, 18, 1, true), new THREE.MeshStandardMaterial({ color: pick(palette), roughness: 0.4, side: THREE.DoubleSide }), [bent && i === 2 ? 0.03 : 0, 0.1 + i * 0.045, 0]);
          if (bent && i === 2) cone.rotation.z = -0.5;
          for (let k = 0; k < 3; k++) { const band = put(fig, new THREE.TorusGeometry(0.075 * (1 - (0.2 + k * 0.25)), 0.004, 5, 18), s.material('#f4f1e8'), [0, 0.04 + k * 0.05, 0]); band.rotation.x = Math.PI / 2; if (i > 0) band.visible = false; }
        }
        put(fig, new THREE.SphereGeometry(0.022, 10, 8), s.material('#f4f1e8', { roughness: 1 }), [bent ? 0.08 : 0, 0.29 - (bent ? 0.02 : 0), 0]);
      }
      fig.scale.setScalar(1.25);
      if (tipped || (a.state === 'rummaged' && random() < 0.35)) { const p = floor(0.8); fig.position.set(p[0], 0.1, p[2] + 0.1); fig.rotation.set(Math.PI / 2 - 0.05, 0, random() * 6); fig.rotation.order = 'YXZ'; fig.rotation.set(Math.PI / 2 - 0.1, random() * 6, 0); }
      else if (sealed) { fig.position.set(-W * 0.2, H + T + 0.004, -0.02); fig.rotation.set(0, 0.3, bent ? 0.08 : 0); }
      else { fig.position.set(-W * 0.22, H * 0.86, -D * 0.2); fig.rotation.set(0.08, 0.35, bent ? 0.32 : 0.05); }
      s.root.add(fig);
    }

    s.root.rotation.y = yaw;
    const rate = mix(0.6, 5, mood.energy);
    const thing = s.finish({
      footprint: 0.42,
      update: bulbMesh && on ? (_dt, time) => {
        const tint = new THREE.Color();
        bulbs.forEach((bulb, index) => { if (bulb.alive) bulbMesh!.setColorAt(index, tint.copy(bulb.colour).multiplyScalar(0.62 + 0.38 * Math.sin(time * rate + bulb.phase))); });
        if (bulbMesh!.instanceColor) bulbMesh!.instanceColor.needsUpdate = true;
      } : undefined,
    });
    return thing;
  },
});
