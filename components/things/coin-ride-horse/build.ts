import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type G = CanvasRenderingContext2D;
const COATS = {
  palomino: 'A golden palomino pony with a cream mane.',
  stallion: 'A glossy black stallion with a flame-red mane and wild eyes.',
  carousel: 'A white carousel horse with gilt trim on a twisted brass pole.',
  pinto: 'A brown-and-white pinto, patched like a cow.',
  zebra: 'A zebra, striped black and white.',
  unicorn: 'A lilac unicorn with a gold horn and a pink mane.',
} as const;
const COAT: Record<keyof typeof COATS, { coat: string; mane: string; hoof: string }> = {
  palomino: { coat: '#d9a43a', mane: '#f3e6bc', hoof: '#3a2a1c' },
  stallion: { coat: '#1d1c22', mane: '#d8321c', hoof: '#c9a23a' },
  carousel: { coat: '#f3f0e6', mane: '#c9a23a', hoof: '#c9a23a' },
  pinto: { coat: '#f1ece0', mane: '#3a2418', hoof: '#2a1c14' },
  zebra: { coat: '#f3f1ea', mane: '#1a1a1c', hoof: '#1a1a1c' },
  unicorn: { coat: '#c9aee8', mane: '#f06aa8', hoof: '#e8c23a' },
};

export default defineThing({
  questions: {
    figure: choice('Which horse is it?', COATS),
    chipped: score('How chipped is the paint?', ['Showroom gloss', 'Scuffed at the ears and nose', 'Chipped in patches', 'Worn through to bare fibreglass all over']),
    state: choice('Is it working?', {
      waiting: 'Plugged in and waiting, the start button glowing.',
      rocking: 'Mid-ride, rocking hard with nobody on it.',
      unplugged: 'Unplugged, its cord coiled on the pavement.',
      bagged: 'Out of order: a plastic bag taped over the coin box.',
    }),
    saddle: choice('What saddle is painted on it?', {
      western: 'A brown western saddle with a horn.',
      racing: 'A red racing blanket with a white number.',
      stars: 'A blue saddle scattered with yellow stars.',
      pink: 'A pink saddle with a heart on the blanket.',
    }),
    base: choice('What does it stand on?', {
      steel: 'A plain painted steel box.',
      meadow: 'A moulded green hillock dotted with painted flowers.',
      corral: 'A plank deck with a little fence rail behind.',
    }),
    price: choice('What does a ride cost?', {
      quarter: 'Twenty-five cents.',
      fifty: 'Fifty cents.',
      dollar: 'One dollar, bills not accepted.',
      peso: 'Five pesos.',
      free: 'A hand-written FREE taped over the price.',
    }),
    dropped: choice('What has a child left beside it?', {
      nothing: 'Nothing.',
      mitten: 'One small red mitten.',
      icecream: 'A dropped ice-cream cone, melting into a puddle.',
      shoe: 'One tiny sneaker.',
      balloon: 'A balloon tied to the handlebar.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const texture = (w: number, h: number, draw: (g: G) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      return map;
    };
    const look = COAT[a.figure];
    const fade = (colour: string) => `#${new THREE.Color(colour).lerp(new THREE.Color('#d9d2c2'), mood.wear * 0.28).getHexString()}`;
    const blob = (g: G, x: number, y: number, r: number, points = 9) => { g.beginPath(); for (let i = 0; i < points; i++) { const t = i / points * Math.PI * 2, rr = r * (0.55 + random() * 0.7); g.lineTo(x + Math.cos(t) * rr * 1.3, y + Math.sin(t) * rr); } g.closePath(); g.fill(); };
    const chips = (g: G, size: number, amount: number) => {
      for (let i = 0; i < amount; i++) {
        const x = random() * size, y = random() * size, r = (4 + random() * 16) * (0.6 + a.chipped) * Math.max(0.4, size / 256);
        g.fillStyle = '#8f8a70'; blob(g, x, y, r + 2);
        g.fillStyle = '#ddd5b6'; blob(g, x, y, r);
        g.strokeStyle = 'rgba(120,112,84,0.6)'; g.lineWidth = 1;
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - r * 0.6 + random() * r, y - r * 0.5 + random() * r); g.lineTo(x - r * 0.6 + random() * r, y - r * 0.5 + random() * r); g.stroke(); }
      }
    };
    const chipCount = Math.round(a.chipped ** 1.6 * 34);
    const coatMap = texture(256, 256, (g) => {
      g.fillStyle = fade(look.coat); g.fillRect(0, 0, 256, 256);
      if (a.figure === 'pinto') { g.fillStyle = fade('#7a4424'); for (let i = 0; i < 7; i++) blob(g, random() * 256, random() * 256, 26 + random() * 30, 11); }
      if (a.figure === 'zebra') { g.strokeStyle = '#1a1a1c'; g.lineWidth = 9; for (let x = -10; x < 270; x += 21) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 14, 80, x - 14, 170, x + 6, 256); g.stroke(); } }
      if (a.figure === 'unicorn') { g.fillStyle = '#fff3a0'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(random() * 256, random() * 256, 3 + random() * 3, 0, 7); g.fill(); } }
      chips(g, 256, chipCount);
    });
    const gloss = mix(0.2, 0.7, mood.wear);
    const coat = new THREE.MeshStandardMaterial({ map: coatMap, roughness: gloss });
    const paintOn = (colour: string, n = 0.25) => new THREE.MeshStandardMaterial({ map: texture(64, 64, (g) => { g.fillStyle = fade(colour); g.fillRect(0, 0, 64, 64); chips(g, 64, Math.round(chipCount * n)); }), roughness: gloss });
    const mane = paintOn(look.mane), hoof = paintOn(look.hoof, 0.4);
    const chrome = s.material('#dfe4e6', { metalness: 0.9, roughness: 0.2 });
    const rubber = s.material('#1b1b1d', { roughness: 0.8 });

    // The horse, in its own frame so it can rock about the base.
    const ride = new THREE.Group();
    const h = new Sculpture(context);
    ride.add(h.root);
    const limb = (from: [number, number, number], to: [number, number, number], r1: number, r2: number) => { h.rod(from, to, r1, coat, r2); h.ball([r2, r2, r2], to, coat, 10); };
    h.ball([0.165, 0.185, 0.4], [0, 0.62, 0], coat, 24);
    h.ball([0.15, 0.17, 0.17], [0, 0.66, 0.27], coat, 16);
    h.ball([0.16, 0.175, 0.17], [0, 0.65, -0.26], coat, 16);
    h.rod([0, 0.7, 0.27], [0, 0.97, 0.5], 0.125, coat, 0.088);
    const hd = new Sculpture(context);
    hd.root.position.set(0, -0.176, -0.01);
    hd.root.scale.setScalar(1.1);
    h.root.add(hd.root);
    const head = hd.ball([0.078, 0.09, 0.17], [0, 1.06, 0.6], coat, 18);
    head.rotation.x = 0.55;
    hd.ball([0.062, 0.058, 0.07], [0, 0.985, 0.725], a.figure === 'palomino' || a.figure === 'pinto' ? paintOn('#e8c8b0') : coat, 14);
    const black = new THREE.MeshStandardMaterial({ color: '#111013', roughness: 0.2 });
    for (const side of [-1, 1]) {
      const ear = hd.mesh(new THREE.ConeGeometry(0.03, 0.085, 6), coat, [side * 0.048, 1.185, 0.5]);
      ear.rotation.set(-0.15, 0, -side * 0.2);
      hd.ball([0.022, 0.026, 0.012], [side * 0.071, 1.1, 0.585], new THREE.MeshStandardMaterial({ color: '#f6f4ee', roughness: 0.2 }), 10).rotation.y = side * 1.2;
      hd.ball([0.012, 0.015, 0.008], [side * 0.08, 1.1, 0.59], black, 8).rotation.y = side * 1.2;
      hd.ball([0.011, 0.008, 0.008], [side * 0.03, 0.975, 0.79], black, 8);
      if (a.figure === 'stallion') hd.box([0.004, 0.012, 0.05], [side * 0.076, 1.133, 0.59], paintOn('#d8321c')).rotation.x = -0.5;
    }
    // Bridle and handlebar through the head.
    const tack = paintOn({ western: '#6a3d1f', racing: '#c4262a', stars: '#2452b8', pink: '#f06aa8' }[a.saddle]);
    hd.ring(0.066, 0.008, [0, 1.0, 0.7], tack).rotation.x = 0.55;
    hd.ring(0.094, 0.008, [0, 1.09, 0.555], tack).rotation.x = -0.3;
    const bar = hd.rod([-0.21, 1.115, 0.53], [0.21, 1.115, 0.53], 0.012, chrome);
    bar.castShadow = true;
    for (const side of [-1, 1]) hd.rod([side * 0.14, 1.115, 0.53], [side * 0.215, 1.115, 0.53], 0.017, rubber);
    // Mane, forelock and tail.
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const tuft = h.ball([0.032, 0.075, 0.06], [(random() - 0.5) * 0.02, mix(1.1, 0.82, t), mix(0.47, 0.19, t)], mane, 10);
      tuft.rotation.x = -0.7;
    }
    hd.ball([0.035, 0.05, 0.05], [0, 1.16, 0.56], mane, 10).rotation.x = 0.7;
    h.tube([[0, 0.72, -0.37], [0, 0.8, -0.5], [0, 0.66, -0.64], [0, 0.42, -0.67], [0, 0.3, -0.62]], 0.045, mane);
    // Galloping legs.
    const leg = (side: number, joint: [number, number], foot: [number, number], front: boolean) => {
      const x = side * (front ? 0.095 : 0.105), root: [number, number, number] = [x, front ? 0.52 : 0.55, front ? 0.27 : -0.27];
      limb(root, [x, joint[0], joint[1]], 0.065, 0.042);
      limb([x, joint[0], joint[1]], [x, foot[0], foot[1]], 0.04, 0.032);
      const shoe = h.cylinder(0.036, 0.044, 0.055, [x, foot[0] - 0.02, foot[1]], hoof, 12);
      shoe.rotation.x = Math.atan2(foot[1] - joint[1], -(foot[0] - joint[0]));
    };
    leg(1, [0.4, 0.52], [0.3, 0.74], true);
    leg(-1, [0.33, 0.45], [0.17, 0.33], true);
    leg(1, [0.33, -0.43], [0.15, -0.62], false);
    leg(-1, [0.3, -0.3], [0.1, -0.36], false);
    // Saddle and blanket, moulded on.
    const blanket = paintOn({ western: '#b3201c', racing: '#c4262a', stars: '#2452b8', pink: '#f9c2d8' }[a.saddle]);
    h.ball([0.178, 0.1, 0.25], [0, 0.72, -0.03], blanket, 18);
    if (a.saddle !== 'racing') {
      h.ball([0.14, 0.07, 0.17], [0, 0.8, -0.03], tack, 16);
      h.ball([0.1, 0.06, 0.04], [0, 0.86, -0.17], tack, 12);
      if (a.saddle === 'western') { h.cylinder(0.02, 0.028, 0.08, [0, 0.89, 0.12], tack, 10); h.ball([0.03, 0.015, 0.03], [0, 0.93, 0.12], tack, 10); }
      else h.ball([0.07, 0.05, 0.035], [0, 0.85, 0.12], tack, 12);
    }
    const emblem = texture(64, 64, (g) => {
      g.clearRect(0, 0, 64, 64);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (a.saddle === 'racing') { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.fillStyle = '#16161a'; g.font = 'bold 40px monospace'; g.fillText(String(1 + Math.floor(random() * 9)), 32, 35); }
      if (a.saddle === 'stars') { g.fillStyle = '#f6d21c'; for (const [x, y, r] of [[20, 20, 12], [44, 40, 15], [18, 48, 8]]) { g.beginPath(); for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2 - 1.57, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } g.fill(); } }
      if (a.saddle === 'pink') { g.fillStyle = '#e8246a'; g.beginPath(); g.arc(22, 26, 12, 0, 7); g.arc(42, 26, 12, 0, 7); g.fill(); g.beginPath(); g.moveTo(10, 30); g.lineTo(54, 30); g.lineTo(32, 56); g.fill(); }
      if (a.saddle === 'western') { g.strokeStyle = '#e8c23a'; g.lineWidth = 4; g.strokeRect(10, 10, 44, 44); g.beginPath(); g.moveTo(10, 32); g.lineTo(32, 10); g.lineTo(54, 32); g.lineTo(32, 54); g.closePath(); g.stroke(); }
    });
    for (const side of [-1, 1]) {
      const patch = h.mesh(new THREE.PlaneGeometry(0.15, 0.15), new THREE.MeshStandardMaterial({ map: emblem, transparent: true, depthWrite: false, roughness: gloss, polygonOffset: true, polygonOffsetFactor: -2 }), [side * 0.172, 0.69, -0.16]);
      patch.rotation.set(0, side * Math.PI / 2, 0);
      patch.rotateX(-0.35);
      patch.castShadow = false;
      h.rod([side * 0.14, 0.5, 0.06], [side * 0.27, 0.48, 0.06], 0.014, chrome);
      h.rod([side * 0.22, 0.48, 0.06], [side * 0.285, 0.48, 0.06], 0.02, rubber);
    }
    if (a.figure === 'unicorn') {
      const horn = hd.mesh(new THREE.ConeGeometry(0.026, 0.24, 8), paintOn('#e8c23a'), [0, 1.28, 0.64]);
      horn.rotation.x = 0.5;
    }
    if (a.figure === 'carousel') {
      const brass = h.material('#c9a23a', { metalness: 0.85, roughness: 0.25 });
      h.rod([0, 0.75, 0.2], [0, 1.72, 0.2], 0.02, brass);
      for (let i = 0; i < 16; i++) h.ball([0.024, 0.012, 0.024], [0.008 * Math.cos(i * 1.3), 0.92 + i * 0.05, 0.2 + 0.008 * Math.sin(i * 1.3)], brass, 8);
      h.ball([0.04, 0.04, 0.04], [0, 1.74, 0.2], brass, 12);
      const roses = Array.from({ length: 7 }, (_unused, i) => ({ at: [0.1 * Math.sin(i), 0.86 - Math.abs(i - 3) * 0.02, 0.27 + (i - 3) * 0.012] as [number, number, number], size: 0.022, color: i % 2 ? '#e8446a' : '#c4162a' }));
      h.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.4 }), roses.map((rose, i) => ({ ...rose, at: [(i - 3) * 0.045, 0.83 + Math.cos((i - 3) * 0.5) * 0.045, 0.3] as [number, number, number] })));
    }
    // Mount post and rubber bellows.
    h.cylinder(0.045, 0.045, 0.5, [0, 0.22, -0.02], chrome, 14);
    for (let i = 0; i < 5; i++) h.ring(0.07 - i * 0.004, 0.02, [0, 0.03 + i * 0.035, -0.02], rubber).rotation.x = Math.PI / 2;

    // Balloon tied to the handlebar rides with the horse.
    const balloon = new THREE.Group();
    if (a.dropped === 'balloon') {
      const b = new Sculpture(context);
      const colour = pick(['#e8242a', '#f6c81c', '#2a8ae0', '#f06aa8']);
      b.rod([0, 0, 0], [0.05, 0.62, -0.03], 0.002, new THREE.MeshStandardMaterial({ color: '#f1efe6' }));
      b.ball([0.13, 0.155, 0.13], [0.05, 0.77, -0.03], new THREE.MeshStandardMaterial({ color: colour, roughness: 0.15, metalness: 0.3 }), 18);
      b.mesh(new THREE.ConeGeometry(0.018, 0.03, 6), new THREE.MeshStandardMaterial({ color: colour }), [0.05, 0.615, -0.03]);
      balloon.add(b.root);
      balloon.position.set(0.22, 1.05, 0.573);
      ride.add(balloon);
    }

    // Base.
    const BH = 0.3;
    const basePaint = fade(pick(mood.cheer > 0.5 ? ['#d8262a', '#f2b81c', '#2452b8'] : ['#8a2a2a', '#3a4a6a', '#5a5e62']));
    if (a.base === 'steel') {
      s.box([0.66, 0.05, 1.22], [0, 0.025, 0], rubber);
      s.box([0.62, BH - 0.05, 1.18], [0, 0.05 + (BH - 0.05) / 2, 0], paintOn(basePaint, 0.5));
      s.box([0.625, 0.05, 1.185], [0, BH - 0.07, 0], s.material('#f3efe2'));
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.014, 0.014, 0.012, [x * 0.26, BH + 0.004, z * 0.52], chrome, 6);
      s.label(pick(['GIDDY UP', 'RIDE ME', 'CHAMPION', 'EL CABALLITO']), 0.56, 0.1, [0, 0.16, 0.592], '#f3efe2', basePaint);
    }
    if (a.base === 'meadow') {
      s.box([0.74, 0.06, 1.3], [0, 0.03, 0], rubber);
      const hill = s.ball([0.36, BH - 0.04, 0.64], [0, 0.05, 0], paintOn('#3f9a3c', 0.5), 24);
      hill.receiveShadow = true;
      const flowers = Array.from({ length: Math.round(mix(8, 26, mood.cheer)) }, () => {
        const t = random() * 7, r = 0.5 + random() * 0.45, x = Math.cos(t) * 0.36 * r, z = Math.sin(t) * 0.64 * r;
        return { at: [x, 0.05 + (BH - 0.04) * Math.sqrt(Math.max(0, 1 - r * r)) + 0.004, z] as [number, number, number], size: 0.018 + random() * 0.012, color: pick(['#f6d21c', '#f3f1ea', '#f06aa8', '#e8442a']) };
      });
      const dot = new THREE.SphereGeometry(1, 8, 5);
      dot.scale(1, 0.35, 1);
      s.scatter(dot, new THREE.MeshStandardMaterial({ roughness: gloss }), flowers);
    }
    if (a.base === 'corral') {
      const wood = [paintOn('#9a6a3a', 0.4), paintOn('#8a5c30', 0.4)];
      s.box([0.72, 0.04, 1.26], [0, 0.02, 0], rubber);
      s.box([0.68, BH - 0.07, 1.22], [0, 0.04 + (BH - 0.07) / 2, 0], wood[1]);
      for (let i = 0; i < 6; i++) s.box([0.112, 0.03, 1.24], [-0.285 + i * 0.114, BH - 0.015, 0], wood[i % 2]);
      for (const z of [-0.5, 0, 0.5]) s.box([0.05, 0.42, 0.05], [-0.36, BH + 0.2, z], wood[1]);
      for (const y of [0.16, 0.34]) s.box([0.025, 0.06, 1.16], [-0.375, BH + y, 0], wood[0]);
    }

    // Coin box on a post.
    const cx = 0.47, cz = 0.34, top = 1.02;
    s.box([0.2, 0.03, 0.2], [cx, 0.015, cz], rubber);
    s.cylinder(0.03, 0.03, top - 0.26, [cx, (top - 0.26) / 2, cz], chrome, 12);
    const working = a.state === 'waiting' || a.state === 'rocking';
    const boxColour = fade('#f2b81c');
    s.box([0.18, 0.27, 0.14], [cx, top - 0.135, cz], paintOn(boxColour, 0.5));
    const price = { quarter: '25c', fifty: '50c', dollar: '$1', peso: '$5', free: '25c' }[a.price];
    const plate = s.mesh(new THREE.PlaneGeometry(0.16, 0.25), new THREE.MeshStandardMaterial({
      map: texture(128, 200, (g) => {
        g.fillStyle = '#c9ced0'; g.fillRect(0, 0, 128, 200);
        g.fillStyle = '#c4162a'; g.fillRect(8, 8, 112, 66);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ffffff'; g.font = 'bold 50px monospace'; g.fillText(price, 64, 44, 104);
        g.fillStyle = '#16161a'; g.fillRect(52, 88, 8, 34); g.fillRect(84, 96, 22, 22);
        g.font = 'bold 11px monospace'; g.fillText(a.price === 'dollar' ? 'COINS ONLY' : a.price === 'peso' ? 'MONEDAS' : 'INSERT COIN', 64, 136);
        g.fillStyle = '#16161a'; g.fillRect(30, 160, 68, 26); g.fillStyle = '#8a8d92'; g.fillRect(36, 166, 56, 14);
        if (a.price === 'free') { g.save(); g.translate(64, 42); g.rotate(-0.12); g.fillStyle = '#f6f1dc'; g.fillRect(-58, -30, 116, 60); g.fillStyle = '#1b2d7a'; g.font = 'bold 40px monospace'; g.fillText('FREE', 0, 2); g.restore(); }
      }), roughness: 0.4, metalness: 0.3,
    }), [cx, top - 0.135, cz + 0.071]);
    plate.castShadow = false;
    const button = new THREE.MeshStandardMaterial({ color: working ? '#3ae06a' : '#3a4a3e', emissive: '#3ae06a', emissiveIntensity: working ? 1.4 : 0, roughness: 0.3 });
    s.cylinder(0.024, 0.024, 0.02, [cx + 0.04, top + 0.008, cz], button, 14);
    s.cylinder(0.03, 0.03, 0.008, [cx + 0.04, top + 0.002, cz], chrome, 14);
    if (a.state === 'bagged') {
      const bag = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#f1f1ec', { roughness: 0.35, flatShading: true }), [cx, top - 0.11, cz]);
      bag.scale.set(0.135, 0.2, 0.115);
      s.box([0.28, 0.035, 0.24], [cx, top - 0.26, cz], s.material('#b89b62'));
      s.label('OUT OF ORDER', 0.24, 0.08, [cx, top - 0.1, cz + 0.118], '#c4162a', '#f6f1dc').rotation.z = (random() - 0.5) * 0.2;
    }

    // Power cord.
    const cord = s.material('#1b1b1d', { roughness: 0.7 });
    if (a.state === 'unplugged') {
      const px = -0.5, pz = -0.52;
      s.tube([[0, 0.06, -0.6], [-0.15, 0.012, -0.7], [-0.4, 0.012, -0.66], [px, 0.012, pz]], 0.009, cord);
      for (let i = 0; i < 4; i++) s.ring(0.1 - i * 0.004, 0.009, [px + (random() - 0.5) * 0.02, 0.012 + i * 0.014, pz + 0.02], cord).rotation.x = Math.PI / 2;
      s.box([0.035, 0.03, 0.05], [px + 0.14, 0.02, pz + 0.12], cord).rotation.y = 0.6;
      for (const o of [-0.008, 0.008]) s.box([0.003, 0.012, 0.022], [px + 0.155 + o, 0.02, pz + 0.15], chrome).rotation.y = 0.6;
    } else {
      s.tube([[0, 0.06, -0.6], [0.05, 0.012, -0.72], [0.2, 0.012, -0.8], [0.34, 0.012, -0.9]], 0.009, cord);
      s.box([0.05, 0.035, 0.07], [0.35, 0.02, -0.92], s.material('#e8782a')).rotation.y = -0.9;
    }

    // What was dropped.
    const dx = -0.5 + random() * 0.1, dz = 0.42 + random() * 0.2;
    if (a.dropped === 'mitten') {
      const wool = s.material('#c8242c', { roughness: 1 });
      s.ball([0.062, 0.03, 0.085], [dx, 0.03, dz], wool, 12).rotation.y = 0.7;
      s.ball([0.022, 0.02, 0.04], [dx + 0.06, 0.022, dz - 0.01], wool, 8).rotation.y = -0.2;
      s.cylinder(0.045, 0.045, 0.045, [dx - 0.06, 0.03, dz - 0.07], s.material('#f3f1ea', { roughness: 1 }), 10).rotation.set(Math.PI / 2, 0, -0.7);
    }
    if (a.dropped === 'icecream') {
      const flavour = pick(['#f2a7c0', '#f3e6bc', '#7a4a2a', '#b9e0c0']);
      s.ball([mix(0.09, 0.2, mood.warmth), 0.004, mix(0.08, 0.16, mood.warmth)], [dx, 0.004, dz], s.material(flavour, { roughness: 0.15 }), 16);
      s.ball([0.05, 0.035, 0.05], [dx, 0.03, dz], s.material(flavour, { roughness: 0.4 }), 12);
      const cone = s.mesh(new THREE.ConeGeometry(0.04, 0.14, 12), s.material('#d9a45c', { roughness: 0.8 }), [dx + 0.07, 0.04, dz + 0.05]);
      cone.rotation.set(Math.PI / 2 + 0.2, 0, -0.95);
    }
    if (a.dropped === 'shoe') {
      const canvasShoe = s.material(pick(['#e8242a', '#2a8ae0', '#f06aa8', '#f3f1ea']));
      const shoe = new Sculpture(context);
      shoe.box([0.065, 0.014, 0.15], [0, 0.007, 0], shoe.material('#f6f4ee'));
      shoe.ball([0.032, 0.03, 0.05], [0, 0.035, 0.035], canvasShoe, 10);
      shoe.box([0.06, 0.05, 0.075], [0, 0.04, -0.035], canvasShoe);
      shoe.box([0.02, 0.004, 0.05], [0, 0.066, 0.02], shoe.material('#f6f4ee'));
      shoe.root.position.set(dx, 0, dz);
      shoe.root.rotation.set(0, 0.9 + random(), random() < 0.5 ? Math.PI / 2 : 0);
      if (shoe.root.rotation.z) shoe.root.position.y = 0.035;
      s.root.add(shoe.root);
    }

    ride.position.y = BH;
    s.root.add(ride);
    const amp = a.state === 'rocking' ? mix(0.06, 0.2, mood.energy) : 0, speed = mix(1.6, 5.5, mood.energy);
    const blink = a.state === 'waiting';
    const pose = (time: number) => {
      const swing = Math.sin(time * speed + 1.1) * amp;
      ride.rotation.x = swing;
      ride.position.set(0, BH + Math.abs(swing) * 0.08, swing * 0.12);
      balloon.rotation.set(-swing * 0.8 + Math.sin(time * 1.3) * 0.08 * (0.3 + mood.energy), 0, Math.sin(time * 0.9) * 0.1 * (0.3 + mood.energy));
    };
    pose(0);
    return s.finish({
      footprint: 0.75,
      update: (_dt, time) => {
        pose(time);
        if (blink) button.emissiveIntensity = Math.sin(time * 4) > 0 ? 1.6 : 0.3;
      },
    });
  },
});
