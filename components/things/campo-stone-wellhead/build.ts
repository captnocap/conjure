import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Draw = (ctx: CanvasRenderingContext2D) => void;

const STONES = {
  istrian: 'Bone-white Istrian stone, greyed where the rain runs.',
  verona: 'Rosy red Verona marble, warm and mottled.',
  trachyte: 'Dark grey trachyte, heavy and plain.',
  bronze: 'Not stone at all: a cast bronze wellhead gone green, as in a palace courtyard.',
} as const;
const STONE: Record<keyof typeof STONES, [string, string]> = {
  istrian: ['#d8d2c0', '#6f6a5c'], verona: ['#c98b78', '#6a3a30'], trachyte: ['#8d8c88', '#4b4a48'], bronze: ['#5f8a78', '#2f4a41'],
};

export default defineThing({
  questions: {
    carving: choice('How is the wellhead carved?', {
      byzantine: 'A plain round drum ringed with small arches, crosses and rope mouldings, very old.',
      gothic: 'A capital shape: round below, square on top, with a big curled leaf at each corner and shields between.',
      renaissance: 'A swelling urn with swags of fruit, ribbons and four lion heads holding rings.',
      octagon: 'A humble eight-sided tub with a framed panel on each face.',
    }),
    stone: choice('What is it made of?', STONES),
    lid: choice('What covers the mouth of the well?', {
      shut: 'A flat iron lid, shut and padlocked for a century.',
      open: 'The iron lid thrown back on its hinge, dark water glinting below.',
      grille: 'An iron grille you can look down through.',
      dome: 'A bronze dome cap with a little finial.',
    }),
    frame: choice('Is there ironwork over it?', {
      none: 'None, just the stone.',
      arch: 'A wrought-iron arch with a pulley wheel.',
      'arch-bucket': 'A wrought-iron arch with a pulley, a rope and a bucket hanging.',
    }),
    steps: choice('What does it stand on?', {
      one: 'A single low stone slab.',
      square: 'Two square steps.',
      octagonal: 'Three broad octagonal steps, good for sitting.',
    }),
    pigeons: choice('Are there pigeons?', {
      none: 'None.',
      one: 'One, on the rim.',
      few: 'Three or four around the steps.',
      flock: 'A whole gossiping flock all over it.',
    }),
    left: choice('What has been left on it?', {
      nothing: 'Nothing.',
      bucket: 'A zinc bucket and a coil of rope.',
      flowers: 'A bunch of flowers in paper, laid on the rim.',
      wine: 'A bottle and two glasses from last night.',
      cat: 'A ginger cat asleep in the sun.',
      ball: "A child's football against the step.",
      shopping: 'Two full shopping bags, set down mid-conversation.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [stoneColour, shade] = STONE[a.stone];

    // Carved surface: relief drawn as a shadow line and a highlight line, then lichen and rain stains.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = stoneColour;
    ctx.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '60,55,45'},${0.04 + random() * 0.06})`;
      ctx.fillRect(random() * 1024, random() * 256, 4 + random() * 22, 2 + random() * 6);
    }
    const strength = mix(1, 0.6, mood.wear);
    const relief = (draw: Draw, width = 5) => {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width * 1.7;
      ctx.save(); ctx.translate(2, 3); ctx.strokeStyle = shade; ctx.fillStyle = shade; ctx.globalAlpha = strength; draw(ctx); ctx.restore();
      ctx.save(); ctx.translate(-1, -2); ctx.strokeStyle = '#ffffff'; ctx.fillStyle = '#ffffff'; ctx.lineWidth = width * 0.8; ctx.globalAlpha = strength * 0.6; draw(ctx); ctx.restore();
      ctx.globalAlpha = 1;
    };
    const cells = a.carving === 'octagon' ? 8 : a.carving === 'byzantine' ? 8 : 4, cell = 1024 / cells;
    for (let i = 0; i < cells; i++) {
      const x = i * cell, mid = x + cell / 2;
      if (a.carving === 'byzantine') {
        relief((c) => { c.beginPath(); c.moveTo(x + 14, 226); c.lineTo(x + 14, 110); c.arc(mid, 110, cell / 2 - 14, Math.PI, 0); c.lineTo(x + cell - 14, 226); c.stroke(); }, 7);
        if (i % 2) relief((c) => { c.beginPath(); c.moveTo(mid, 96); c.lineTo(mid, 196); c.moveTo(mid - 30, 128); c.lineTo(mid + 30, 128); c.stroke(); }, 9);
        else relief((c) => { for (let p = 0; p < 6; p++) { c.beginPath(); c.ellipse(mid + Math.cos(p * 1.047) * 20, 146 + Math.sin(p * 1.047) * 20, 13, 7, p * 1.047, 0, 7); c.stroke(); } }, 4);
      } else if (a.carving === 'gothic') {
        relief((c) => { c.beginPath(); c.moveTo(mid - 46, 60); c.lineTo(mid + 46, 60); c.lineTo(mid + 46, 130); c.quadraticCurveTo(mid + 40, 180, mid, 200); c.quadraticCurveTo(mid - 40, 180, mid - 46, 130); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(mid - 40, 70); c.lineTo(mid + 40, 170); c.stroke(); }, 7);
        relief((c) => { for (const side of [-1, 1]) { c.beginPath(); c.moveTo(mid + side * 70, 230); c.quadraticCurveTo(mid + side * 80, 120, mid + side * 122, 40); c.stroke(); c.beginPath(); c.moveTo(mid + side * 96, 230); c.quadraticCurveTo(mid + side * 100, 150, mid + side * 126, 100); c.stroke(); } }, 5);
      } else if (a.carving === 'renaissance') {
        relief((c) => { c.beginPath(); c.moveTo(x + 6, 78); c.quadraticCurveTo(mid, 215, x + cell - 6, 78); c.stroke(); c.beginPath(); c.moveTo(x + 6, 100); c.quadraticCurveTo(mid, 250, x + cell - 6, 100); c.stroke(); }, 6);
        relief((c) => { for (let p = 0; p < 7; p++) { const t = (p + 0.5) / 7, px = x + 6 + t * (cell - 12), py = 89 + 4 * t * (1 - t) * 76; c.beginPath(); c.arc(px, py, 11, 0, 7); c.fill(); } });
        relief((c) => { for (const side of [-1, 1]) { c.beginPath(); c.moveTo(x + (side < 0 ? 8 : cell - 8), 110); c.quadraticCurveTo(x + (side < 0 ? 30 : cell - 30), 180, x + (side < 0 ? 12 : cell - 12), 230); c.stroke(); } }, 4);
      } else {
        relief((c) => { c.strokeRect(x + 16, 46, cell - 32, 170); c.strokeRect(x + 30, 62, cell - 60, 138); }, 5);
        relief((c) => { c.beginPath(); c.arc(mid, 131, 20, 0, 7); c.stroke(); c.beginPath(); c.arc(mid, 131, 5, 0, 7); c.fill(); }, 6);
      }
    }
    relief((c) => { for (const y of [20, 240]) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); } for (let x = 0; x < 1024; x += 22) { c.beginPath(); c.moveTo(x, 12); c.lineTo(x + 12, 28); c.stroke(); } }, 4);
    for (let i = 0; i < 6 + mood.wear * 40; i++) {
      const x = random() * 1024, y = random() * 256, r = 6 + random() * (10 + mood.wear * 22);
      ctx.fillStyle = [`rgba(214,168,52,0.75)`, `rgba(120,138,96,0.7)`, `rgba(88,92,80,0.55)`][Math.floor(random() * 3)];
      for (let blot = 0; blot < 5; blot++) { ctx.beginPath(); ctx.arc(x + (random() - 0.5) * r * 1.6, y + (random() - 0.5) * r, r * (0.3 + random() * 0.5), 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < 10 + mood.wear * 14; i++) {
      const x = random() * 1024, grad = ctx.createLinearGradient(0, 0, 0, 120 + random() * 130);
      grad.addColorStop(0, 'rgba(60,62,50,0.4)'); grad.addColorStop(1, 'rgba(60,62,50,0)');
      ctx.fillStyle = grad; ctx.fillRect(x, 0, 6 + random() * 16, 256);
    }
    const carved = new THREE.CanvasTexture(canvas);
    carved.colorSpace = THREE.SRGBColorSpace;
    carved.wrapS = THREE.RepeatWrapping;
    const skin = new THREE.MeshStandardMaterial({ map: carved, bumpMap: carved, bumpScale: 1.5, roughness: a.stone === 'bronze' ? 0.55 : 0.92, metalness: a.stone === 'bronze' ? 0.4 : 0 });
    const stone = s.material(stoneColour, { roughness: 0.92, metalness: a.stone === 'bronze' ? 0.35 : 0 });
    const paving = s.material(a.stone === 'bronze' ? '#cfc8b6' : new THREE.Color(stoneColour).lerp(new THREE.Color('#8f8a7a'), 0.3), { roughness: 0.95 });
    const iron = s.material('#2c2b2d', { roughness: 0.7, metalness: 0.3 });
    const rust = s.material(new THREE.Color('#35322f').lerp(new THREE.Color('#7a4a2c'), mood.wear), { roughness: 0.85 });

    // Steps.
    let base = 0;
    const tiers = a.steps === 'one' ? [[1.05, 0.14]] : a.steps === 'square' ? [[1.3, 0.17], [0.95, 0.17]] : [[1.75, 0.16], [1.35, 0.16], [0.98, 0.16]];
    for (const [radius, height] of tiers) {
      const sides = a.steps === 'octagonal' ? 8 : 4;
      const tier = s.cylinder(radius, radius + 0.02, height, [0, base + height / 2, 0], paving, sides);
      tier.rotation.y = Math.PI / sides + (random() - 0.5) * 0.02;
      base += height;
    }
    const stepRadii = tiers.map(([radius]) => radius * (a.steps === 'octagonal' ? 0.92 : 0.7));

    // The drum.
    const H = 0.98;
    let rim = 0.56;
    if (a.carving === 'byzantine') s.lathe([[0.5, 0], [0.54, 0.03], [0.54, 0.09], [0.5, 0.12], [0.5, H - 0.14], [0.56, H - 0.1], [0.58, H - 0.04], [0.56, H]], skin, [0, base, 0]);
    else if (a.carving === 'gothic') {
      s.lathe([[0.5, 0], [0.52, 0.05], [0.44, 0.12], [0.42, 0.4], [0.5, H - 0.24], [0.6, H - 0.12]], skin, [0, base, 0]);
      s.box([1.24, 0.14, 1.24], [0, base + H - 0.07, 0], stone);
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const leaf = s.ball([0.15, 0.27, 0.15], [x * 0.47, base + H - 0.34, z * 0.47], stone, 12);
        leaf.rotation.set(-z * 0.5, 0, x * 0.5);
        s.ball([0.1, 0.1, 0.1], [x * 0.58, base + H - 0.2, z * 0.58], stone, 10);
      }
      rim = 0.62;
    } else if (a.carving === 'renaissance') {
      s.lathe([[0.4, 0], [0.46, 0.04], [0.42, 0.1], [0.56, 0.3], [0.62, 0.5], [0.56, 0.72], [0.5, 0.82], [0.58, H - 0.08], [0.6, H]], skin, [0, base, 0]);
      for (let i = 0; i < 4; i++) {
        const angle = i * Math.PI / 2 + Math.PI / 4, x = Math.sin(angle), z = Math.cos(angle);
        s.ball([0.11, 0.12, 0.11], [x * 0.6, base + 0.62, z * 0.6], stone, 12);
        s.ball([0.06, 0.05, 0.06], [x * 0.68, base + 0.58, z * 0.68], stone, 8);
        const ring = s.ring(0.07, 0.014, [x * 0.71, base + 0.5, z * 0.71], iron);
        ring.rotation.y = angle + Math.PI / 2;
      }
      rim = 0.6;
    } else {
      const tub = s.mesh(new THREE.CylinderGeometry(0.58, 0.52, H - 0.1, 8, 1, true), skin, [0, base + (H - 0.1) / 2, 0]);
      tub.rotation.y = Math.PI / 8;
      s.cylinder(0.63, 0.6, 0.1, [0, base + H - 0.05, 0], stone, 8).rotation.y = Math.PI / 8;
      s.cylinder(0.56, 0.58, 0.08, [0, base + 0.04, 0], stone, 8).rotation.y = Math.PI / 8;
      rim = 0.6;
    }
    const top = base + H;
    const mouth = 0.38;
    if (a.carving !== 'gothic') s.cylinder(rim, rim, 0.03, [0, top - 0.015, 0], stone, a.carving === 'octagon' ? 8 : 32).rotation.y = Math.PI / 8;
    // Worn grooves where ropes ran over the rim.
    for (let i = 0; i < 3 + mood.wear * 5; i++) {
      const angle = random() * Math.PI * 2;
      s.box([0.03, 0.006, 0.16], [Math.sin(angle) * (mouth + 0.08), top + 0.003, Math.cos(angle) * (mouth + 0.08)], s.material(shade)).rotation.y = angle;
    }

    // Mouth and lid.
    const dark = new THREE.MeshStandardMaterial({ color: '#12171a', roughness: 0.4 });
    if (a.lid === 'open' || a.lid === 'grille') {
      s.cylinder(mouth, mouth, 0.008, [0, top + 0.004, 0], dark, 28);
      s.cylinder(mouth * 0.5, mouth * 0.5, 0.004, [0.06, top + 0.01, -0.05], s.material('#3f6f66', { emissive: '#2f6a5e', emissiveIntensity: 0.5, roughness: 0.1 }), 20).scale.set(1, 1, 0.6);
    }
    if (a.lid === 'shut' || a.lid === 'open') {
      const lid = new THREE.Group();
      lid.position.set(0, top + 0.012, -mouth - 0.03);
      const L = <T extends THREE.Object3D>(node: T) => { lid.add(node); return node; };
      L(s.cylinder(mouth + 0.04, mouth + 0.04, 0.03, [0, 0.015, mouth + 0.03], rust, 28));
      for (const x of [-0.17, 0.17]) L(s.box([0.05, 0.016, mouth * 2 + 0.1], [x, 0.036, mouth + 0.03], iron));
      L(s.ring(0.07, 0.014, [0, 0.07, mouth + 0.03], iron)).rotation.y = Math.PI / 2;
      for (const x of [-0.17, 0.17]) L(s.cylinder(0.03, 0.03, 0.09, [x, 0.02, 0], iron, 8)).rotation.z = Math.PI / 2;
      if (a.lid === 'open') lid.rotation.x = -1.85 + (random() - 0.5) * 0.2;
      else {
        L(s.box([0.09, 0.07, 0.035], [0, -0.03, mouth * 2 + 0.1], s.material('#b08a3a', { metalness: 0.3 })));
        L(s.ring(0.035, 0.01, [0, 0.02, mouth * 2 + 0.1], iron));
      }
      s.root.add(lid);
    } else if (a.lid === 'grille') {
      s.ring(mouth + 0.02, 0.018, [0, top + 0.02, 0], iron).rotation.x = Math.PI / 2;
      for (let i = -2; i <= 2; i++) {
        const reach = Math.sqrt(Math.max(0.001, mouth * mouth - (i * 0.14) ** 2));
        s.rod([i * 0.14, top + 0.02, -reach], [i * 0.14, top + 0.02, reach], 0.012, iron);
        s.rod([-reach, top + 0.03, i * 0.14], [reach, top + 0.03, i * 0.14], 0.012, iron);
      }
    } else {
      const verdigris = s.material('#5f9483', { roughness: 0.6, metalness: 0.3 });
      s.lathe([[mouth + 0.08, 0], [mouth + 0.06, 0.04], [mouth * 0.8, 0.2], [mouth * 0.4, 0.3], [0.04, 0.33], [0.03, 0.4], [0.07, 0.45], [0, 0.5]], verdigris, [0, top, 0]);
    }

    // Ironwork.
    if (a.frame !== 'none') {
      const reach = rim - 0.08, crown = top + 1.45;
      s.tube([[-reach, top - 0.3, 0], [-reach, top + 0.7, 0], [-reach * 0.75, crown - 0.2, 0], [0, crown, 0], [reach * 0.75, crown - 0.2, 0], [reach, top + 0.7, 0], [reach, top - 0.3, 0]], 0.022, iron);
      for (const side of [-1, 1]) s.tube([[side * reach, top + 0.75, 0], [side * reach * 0.5, top + 0.95, 0], [side * reach * 0.62, top + 1.12, 0], [side * reach * 0.82, top + 1.02, 0]], 0.012, iron);
      s.ring(0.11, 0.022, [0, crown - 0.17, 0], iron).rotation.y = Math.PI / 2;
      s.rod([0, crown, 0], [0, crown - 0.17, 0], 0.012, iron);
      s.ball([0.04, 0.07, 0.04], [0, crown + 0.07, 0], iron, 8);
      if (a.frame === 'arch-bucket') {
        const rope = s.material('#cdbf98'), sway = (random() - 0.5) * 0.1;
        const by = a.lid === 'dome' ? top + 0.72 : top + 0.42;
        s.rod([0.02, crown - 0.2, 0.1], [0.02 + sway, by + 0.26, 0.1], 0.012, rope);
        s.rod([-0.02, crown - 0.2, -0.1], [-reach + 0.02, top + 0.5, -0.02], 0.012, rope);
        for (let i = 0; i < 4; i++) s.ring(0.045, 0.014, [-reach, top + 0.42 + i * 0.03, 0], rope).rotation.x = Math.PI / 2;
        s.mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.24, 16, 1, true), s.material('#7a5a3c', { side: THREE.DoubleSide }), [0.02 + sway, by, 0.1]);
        for (const y of [-0.07, 0.07]) s.ring(0.137 + y * 0.16, 0.01, [0.02 + sway, by + y, 0.1], iron).rotation.x = Math.PI / 2;
        s.ring(0.14, 0.008, [0.02 + sway, by + 0.13, 0.1], iron, Math.PI);
      }
    }

    // What was left.
    const front = 0.55 + (random() - 0.5) * 0.5;
    const onRim: P3 = [Math.sin(front) * (rim - 0.1), top, Math.cos(front) * (rim - 0.1)];
    const stepY = base - tiers[tiers.length - 1][1], stepR = stepRadii[stepRadii.length - 1];
    const onStep = (angle: number, inset = 0.16): P3 => [Math.sin(angle) * (stepR - inset), base, Math.cos(angle) * (stepR - inset)];
    const item = new THREE.Group();
    s.root.add(item);
    const I = <T extends THREE.Object3D>(node: T) => { item.add(node); return node; };
    if (a.left === 'bucket') {
      item.position.set(...onStep(front + 0.5));
      I(s.mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.26, 16, 1, true), s.material('#a9b0b3', { metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }), [0, 0.13, 0]));
      I(s.cylinder(0.11, 0.11, 0.01, [0, 0.01, 0], s.material('#8d9497'), 16));
      I(s.ring(0.15, 0.008, [0, 0.25, 0], iron, Math.PI)).rotation.y = 0.5;
      for (let i = 0; i < 4; i++) I(s.ring(0.13 - i * 0.012, 0.02, [0.3, 0.02 + i * 0.035, 0.05], s.material('#cdbf98'))).rotation.x = Math.PI / 2;
    } else if (a.left === 'flowers') {
      item.position.set(...onRim);
      item.rotation.y = front + 1.2;
      I(s.cylinder(0.09, 0.03, 0.4, [0, 0.06, 0], s.material('#efe9da'), 10)).rotation.z = Math.PI / 2 - 0.08;
      const petals = mood.wear > 0.7 ? ['#8a6f5a', '#a08a6a'] : ['#e8455a', '#f6d04a', '#f2eef0', '#c36ad0'];
      for (let i = 0; i < 9; i++) I(s.ball([0.045, 0.045, 0.045], [-0.2 - random() * 0.08, 0.07 + random() * 0.07, (random() - 0.5) * 0.16], s.material(petals[i % petals.length], { emissive: petals[i % petals.length], emissiveIntensity: 0.15 }), 8));
    } else if (a.left === 'wine') {
      item.position.set(...onRim);
      const glass = new THREE.MeshStandardMaterial({ color: '#2f5a34', roughness: 0.15 });
      I(s.lathe([[0.04, 0], [0.04, 0.17], [0.015, 0.23], [0.015, 0.3]], glass));
      const clear = s.material('#e9f1f0', { roughness: 0.1 });
      for (const [x, z, tipped] of [[0.13, 0.02, 0], [-0.1, -0.08, 1]] as const) {
        const cup = new THREE.Group();
        cup.position.set(x, tipped ? 0.035 : 0, z);
        if (tipped) cup.rotation.z = Math.PI / 2;
        cup.add(s.cylinder(0.03, 0.03, 0.006, [0, 0.003, 0], clear, 12), s.cylinder(0.005, 0.005, 0.07, [0, 0.04, 0], clear, 6), s.cylinder(0.035, 0.012, 0.07, [0, 0.11, 0], tipped ? clear : s.material('#8f1d2c'), 12));
        I(cup);
      }
    } else if (a.left === 'cat') {
      if (a.lid === 'shut') item.position.set(0.05, top + 0.05, 0.03); else item.position.set(...onStep(front + 0.3, 0.22));
      item.rotation.y = random() * 6;
      const fur = s.material('#d98a3a'), pale = s.material('#f0d6a8');
      I(s.ring(0.14, 0.085, [0, 0.07, 0], fur)).rotation.x = Math.PI / 2;
      I(s.ball([0.13, 0.07, 0.13], [0, 0.07, 0], fur, 12));
      I(s.ball([0.08, 0.07, 0.075], [0.15, 0.09, 0.08], fur, 12));
      for (const side of [-1, 1]) I(s.cylinder(0, 0.028, 0.05, [0.15 + side * 0.04, 0.165, 0.08 - side * 0.02], fur, 4));
      I(s.ball([0.03, 0.025, 0.03], [0.21, 0.075, 0.11], pale, 8));
      I(s.tube([[-0.16, 0.05, 0.02], [-0.2, 0.05, 0.14], [-0.08, 0.05, 0.24], [0.06, 0.05, 0.22]], 0.025, fur));
    } else if (a.left === 'ball') {
      const angle = front + 0.4, r = stepR + 0.14;
      item.position.set(Math.sin(angle) * r, stepY, Math.cos(angle) * r);
      const ball = I(s.ball([0.115, 0.115, 0.115], [0, 0.115, 0], s.material('#f1eee6'), 16));
      ball.rotation.set(random() * 3, random() * 3, 0);
      for (let i = 0; i < 7; i++) {
        const v = new THREE.Vector3().setFromSphericalCoords(0.106, 0.4 + random() * 2.2, i * 0.9);
        I(s.ball([0.036, 0.036, 0.02], [v.x, 0.115 + v.y, v.z], s.material(i % 2 ? '#c4222c' : '#1c1c22'), 8)).lookAt(item.position.x, 0.115 + stepY, item.position.z);
      }
    } else if (a.left === 'shopping') {
      item.position.set(...onStep(front + 0.6));
      for (const [x, colour, tall] of [[0, '#3f7fc4', 0.34], [0.3, '#e6e0d0', 0.28]] as const) {
        const bag = I(s.box([0.24, tall, 0.16], [x, tall / 2, x * 0.3], s.material(colour)));
        bag.rotation.y = random() - 0.5;
        I(s.ring(0.06, 0.008, [x, tall + 0.03, x * 0.3], s.material(colour), Math.PI));
      }
      I(s.cylinder(0.035, 0.035, 0.3, [0.02, 0.36, 0.02], s.material('#d9b36a'), 8)).rotation.z = 0.25;
      for (let i = 0; i < 3; i++) I(s.ball([0.045, 0.045, 0.045], [0.26 + i * 0.05, 0.3, 0.08 + (i % 2) * 0.05], s.material(i === 1 ? '#e8862a' : '#6fa63a'), 8));
    }

    // Pigeons.
    const count = { none: 0, one: 1, few: 3 + Math.round(random()), flock: 7 + Math.round(mood.density * 5) }[a.pigeons];
    const greys = ['#7d8894', '#99a1aa', '#5c636e', '#b9b3aa'];
    for (let i = 0; i < count; i++) {
      const bird = new THREE.Group();
      const angle = random() * Math.PI * 2;
      const where = i === 0 ? 0 : Math.floor(random() * (tiers.length + 2));
      if (where === 0) bird.position.set(Math.sin(angle) * (rim - 0.07), top + (a.carving === 'gothic' ? 0 : 0), Math.cos(angle) * (rim - 0.07));
      else if (where <= tiers.length) {
        const index = where - 1, y = tiers.slice(0, index + 1).reduce((sum, [, h]) => sum + h, 0);
        const inner = index + 1 < tiers.length ? stepRadii[index + 1] + 0.12 : rim + 0.1;
        bird.position.set(Math.sin(angle) * mix(inner, stepRadii[index] - 0.05, random()), y, Math.cos(angle) * mix(inner, stepRadii[index] - 0.05, random()));
      } else bird.position.set(Math.sin(angle) * (tiers[0][0] + 0.25 + random() * 0.3), 0, Math.cos(angle) * (tiers[0][0] + 0.25 + random() * 0.3));
      bird.rotation.y = random() * Math.PI * 2;
      const pecking = random() < 0.4;
      const grey = s.material(greys[Math.floor(random() * greys.length)]);
      const body = s.ball([0.14, 0.085, 0.08], [0, 0.11, 0], grey, 12);
      body.rotation.z = pecking ? -0.35 : 0.25;
      bird.add(body, s.ball([0.045, 0.05, 0.045], pecking ? [0.14, 0.07, 0] : [0.11, 0.21, 0], s.material('#4e6a66'), 10), s.rod(pecking ? [0.17, 0.06, 0] : [0.14, 0.21, 0], pecking ? [0.2, 0.02, 0] : [0.19, 0.2, 0], 0.012, s.material('#d9a05a'), 0.003), s.box([0.12, 0.012, 0.07], pecking ? [-0.15, 0.17, 0] : [-0.16, 0.07, 0], s.material('#3d434c')), s.rod([0.01, 0, 0.02], [0.01, 0.06, 0.02], 0.006, s.material('#c0605a')), s.rod([0.01, 0, -0.02], [0.01, 0.06, -0.02], 0.006, s.material('#c0605a')));
      bird.scale.setScalar(1.25);
      s.root.add(bird);
    }

    return s.finish({ footprint: tiers[0][0] + 0.1 });
  },
});
