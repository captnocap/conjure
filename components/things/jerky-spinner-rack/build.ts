import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, random: () => number) => void;
interface Variant { w: number; h: number; puff?: number; draw: Draw }

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function pillow(thickness: number) {
  const geometry = new THREE.BoxGeometry(1, 1, thickness, 4, 7, 2);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) * 2, v = position.getY(i) * 2;
    position.setZ(i, position.getZ(i) * (Math.abs(v) > 0.86 ? 0.06 : Math.max(0.06, Math.cos((v / 0.86) * Math.PI / 2) ** 0.6 * (1 - 0.4 * u * u))));
  }
  geometry.computeVertexNormals();
  return geometry;
}

const text = (ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, colour: string, max: number, font = 'sans-serif') => {
  ctx.fillStyle = colour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px ${font}`; ctx.fillText(value, x, y, max);
};
const pouch = (bg: string, band: string, ink: string, name: string, flavour: string): Draw => (ctx, w, h, random) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 0, w, h * 0.1);
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.05, w * 0.09, h * 0.022, 0, 0, 7); ctx.fill();
  ctx.fillStyle = band; ctx.fillRect(0, h * 0.16, w, h * 0.3);
  text(ctx, name, w / 2, h * 0.26, h * 0.13, ink, w * 0.92);
  text(ctx, flavour, w / 2, h * 0.39, h * 0.075, ink, w * 0.9);
  ctx.fillStyle = '#2a120a'; ctx.fillRect(w * 0.14, h * 0.54, w * 0.72, h * 0.36);
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#6e2f18' : '#4f2110'; ctx.fillRect(w * (0.16 + random() * 0.5), h * (0.56 + random() * 0.26), w * 0.2, h * 0.07); }
};
const shades = (frame: string, lens: string, heart = false): Draw => (ctx, w, h) => {
  ctx.strokeStyle = frame; ctx.lineWidth = h * 0.09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(w * 0.42, h * 0.4); ctx.quadraticCurveTo(w * 0.5, h * 0.28, w * 0.58, h * 0.4); ctx.stroke();
  for (const x of [0.25, 0.75]) {
    ctx.fillStyle = lens; ctx.beginPath();
    if (heart) { const cx = w * x, cy = h * 0.42, r = h * 0.2; ctx.moveTo(cx, cy + r * 1.5); ctx.bezierCurveTo(cx - r * 2.4, cy - r * 0.2, cx - r, cy - r * 1.8, cx, cy - r * 0.6); ctx.bezierCurveTo(cx + r, cy - r * 1.8, cx + r * 2.4, cy - r * 0.2, cx, cy + r * 1.5); }
    else ctx.ellipse(w * x, h * 0.48, w * 0.2, h * 0.3, 0, 0, 7);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(w * (x - 0.12), h * 0.32, w * 0.09, h * 0.07);
  }
  ctx.fillStyle = '#fbf7e8'; ctx.fillRect(w * 0.82, h * 0.6, w * 0.16, h * 0.38);
  ctx.fillStyle = '#c8102e'; ctx.fillRect(w * 0.84, h * 0.7, w * 0.12, h * 0.08);
};
const tree = (colour: string, label: string): Draw => (ctx, w, h) => {
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h * 0.14); ctx.stroke();
  ctx.fillStyle = colour;
  for (let i = 0; i < 4; i++) { const top = h * (0.1 + i * 0.17), half = w * (0.2 + i * 0.1); ctx.beginPath(); ctx.moveTo(w / 2, top); ctx.lineTo(w / 2 + half, top + h * 0.26); ctx.lineTo(w / 2 - half, top + h * 0.26); ctx.fill(); }
  ctx.fillRect(w * 0.38, h * 0.84, w * 0.24, h * 0.16);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(w * 0.2, h * 0.66, w * 0.6, h * 0.12);
  text(ctx, label, w / 2, h * 0.725, h * 0.08, colour, w * 0.56);
};
const keychain = (plate: string, ink: string, name: string): Draw => (ctx, w, h) => {
  ctx.strokeStyle = '#b9bec2'; ctx.lineWidth = w * 0.06;
  ctx.beginPath(); ctx.arc(w / 2, h * 0.16, w * 0.17, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w / 2, h * 0.3); ctx.lineTo(w / 2, h * 0.5); ctx.stroke();
  ctx.fillStyle = plate; ctx.fillRect(w * 0.02, h * 0.5, w * 0.96, h * 0.46);
  ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(w * 0.07, h * 0.54, w * 0.86, h * 0.38);
  text(ctx, name, w / 2, h * 0.74, h * 0.2, ink, w * 0.8);
};
const lighter = (bodyColour: string, motif: string): Draw => (ctx, w, h) => {
  ctx.fillStyle = '#fbf7e8'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h * 0.07, w * 0.07, 0, 7); ctx.fill();
  ctx.fillStyle = '#c8102e'; ctx.fillRect(0, h * 0.14, w, h * 0.1);
  ctx.fillStyle = '#b9bec2'; ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.14);
  ctx.fillStyle = bodyColour; ctx.fillRect(w * 0.27, h * 0.44, w * 0.46, h * 0.5);
  ctx.fillStyle = motif; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.5); ctx.quadraticCurveTo(w * 0.72, h * 0.7, w / 2, h * 0.86); ctx.quadraticCurveTo(w * 0.28, h * 0.7, w / 2, h * 0.5); ctx.fill();
};

const NAMES = ['ASHLEY', 'BRANDON', 'CRYSTAL', 'DWAYNE', 'TAMMY', 'KYLE', 'MISTY', 'RANDY', 'JOLENE', 'TRAVIS', 'DEBBIE', 'CODY'];
const MERCH = {
  jerky: 'Beef jerky pouches with pepperoni sticks below and puffy pork-rind bags on top.',
  sunglasses: 'Cheap sunglasses: aviators, mirrored blue wraparounds, hot pink.',
  fresheners: 'Cardboard tree air fresheners in pine green, cherry red, new-car blue.',
  keychains: 'Tiny licence-plate keychains, each stamped with a first name.',
  lighters: 'Carded novelty lighters with flames, eagles and skulls.',
  everything: 'A jumble of all of it, one kind per tier.',
} as const;
type Merch = Exclude<keyof typeof MERCH, 'everything'>;
const SIGN_NAME: Record<keyof typeof MERCH, [string, string]> = {
  jerky: ['TRAIL BOSS', 'JERKY'], sunglasses: ['SHADY', 'DEALS'], fresheners: ['ROAD', 'FRESH'], keychains: ['FIND YOUR', 'NAME'], lighters: ['FLAME', 'ON'], everything: ['LAST CHANCE', 'GIFTS'],
};

export default defineThing({
  questions: {
    merch: choice('What hangs on the hooks?', MERCH),
    full: score('How full are the hooks?', ['Bare arms, two or three things left', 'Thinned out', 'Well hung', 'Bristling, every hook loaded to the tip']),
    sign: choice('What is the round sign on top like?', {
      rustic: 'A burnt-wood brand, dark lettering seared into a plank disc.',
      tin: 'A red enamel tin disc with cream lettering, retro roadside.',
      sunburst: 'A loud yellow plastic sunburst.',
      cardboard: 'A cardboard circle lettered in marker.',
      faded: 'Sun-bleached almost blank, the brand a ghost.',
    }),
    stance: choice('How does the rack stand?', {
      straight: 'Straight and true.',
      leaning: 'Leaning noticeably, its base bent by years of spinning.',
      bent: 'Upright but with one arm bent and drooping.',
      both: 'Leaning, with a drooping bent arm as well.',
    }),
    odd: choice('If one thing hangs there that does not belong, what is it?', {
      none: 'Nothing out of place.',
      heart: 'A single pair of pink heart-shaped sunglasses.',
      name: 'One oversized name keychain with a name nobody has.',
      pine: 'A lone pine-tree air freshener.',
      bear: 'A small sun-faded plush bear on a loop.',
    }),
    base: choice('What does it stand on?', {
      disc: 'A heavy black round base plate.',
      cross: 'Four splayed chrome feet with casters.',
      crate: 'It is bolted to an upturned wooden crate.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const chrome = s.material(mood.wear > 0.65 ? '#8a7a66' : '#cfd3d5', { metalness: 0.8, roughness: 0.28 + mood.wear * 0.4 });
    const dark = s.material('#24272a', { metalness: 0.4, roughness: 0.5 });

    const catalogue: Record<Merch, Variant[]> = {
      jerky: [
        { w: 0.125, h: 0.175, puff: 0.14, draw: pouch('#b98d58', '#c8102e', '#fff6d8', 'TRAIL BOSS', 'ORIGINAL') },
        { w: 0.125, h: 0.175, puff: 0.14, draw: pouch('#17181a', '#e0a81c', '#17181a', 'TRAIL BOSS', 'TERIYAKI') },
        { w: 0.125, h: 0.175, puff: 0.14, draw: pouch('#6e1414', '#1a1a1a', '#ffd21f', 'TRAIL BOSS', 'PEPPERED') },
        { w: 0.17, h: 0.22, puff: 0.42, draw: (ctx, w, h) => { ctx.fillStyle = '#f6e7a6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#d9dde0'; ctx.fillRect(0, 0, w, h * 0.07); ctx.fillRect(0, h * 0.93, w, h * 0.07); ctx.fillStyle = '#c8102e'; ctx.fillRect(0, h * 0.2, w, h * 0.28); text(ctx, 'PORK', w / 2, h * 0.29, h * 0.12, '#fff6d8', w * 0.9); text(ctx, 'RINDS', w / 2, h * 0.41, h * 0.12, '#fff6d8', w * 0.9); ctx.fillStyle = '#e8b85a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(w * (0.25 + i * 0.13), h * (0.66 + (i % 2) * 0.08), w * 0.12, h * 0.06, i, 0, 7); ctx.fill(); } } },
      ],
      sunglasses: [
        { w: 0.16, h: 0.075, draw: shades('#1a1a1c', '#2c3238') }, { w: 0.16, h: 0.075, draw: shades('#c9ccd0', '#2f7fe0') },
        { w: 0.16, h: 0.075, draw: shades('#ff3fa4', '#5a2a6a') }, { w: 0.16, h: 0.075, draw: shades('#7a4a1c', '#3a2a12') },
      ],
      fresheners: [
        { w: 0.075, h: 0.125, draw: tree('#1f8a3a', 'PINE') }, { w: 0.075, h: 0.125, draw: tree('#c8102e', 'CHERRY') },
        { w: 0.075, h: 0.125, draw: tree('#1f6fd0', 'NEW CAR') }, { w: 0.075, h: 0.125, draw: tree('#f2c81a', 'VANILLA') }, { w: 0.075, h: 0.125, draw: tree('#1a1a1c', 'MIDNIGHT') },
      ],
      keychains: [['#1f4fa8', '#ffffff'], ['#f4f1e6', '#c8102e'], ['#f2c81a', '#1a1a1c'], ['#c8102e', '#ffffff'], ['#1f8a4a', '#ffe14a']].map(([plate, ink]) => ({ w: 0.075, h: 0.1, draw: keychain(plate, ink, pick(NAMES)) })),
      lighters: [['#c8102e', '#ffd21f'], ['#1a1a1c', '#ff5a1f'], ['#1f4fa8', '#ffffff'], ['#f2c81a', '#c8102e']].map(([bodyColour, motif]) => ({ w: 0.06, h: 0.125, draw: lighter(bodyColour, motif) })),
    };
    const kinds = Object.keys(catalogue) as Merch[];
    const small = a.merch !== 'jerky' && a.merch !== 'everything';
    const tiers = small ? 5 : 4, arms = small ? 10 : 8;
    const firstY = 0.52, pitch = small ? 0.225 : 0.3, R = 0.3;
    const poleTop = firstY + (tiers - 1) * pitch + 0.1;

    const turning = new THREE.Group();
    const leanGroup = new THREE.Group();
    leanGroup.add(turning);
    s.root.add(leanGroup);
    const leaning = a.stance === 'leaning' || a.stance === 'both';
    const bentArm = a.stance === 'bent' || a.stance === 'both' ? { tier: 1 + Math.floor(random() * (tiers - 2)), arm: Math.floor(random() * arms) } : null;

    // Collect every hanging item as a matrix per variant.
    const variants: Variant[] = [];
    const placed: THREE.Matrix4[][] = [];
    const use = (variant: Variant) => { let index = variants.indexOf(variant); if (index < 0) { index = variants.push(variant) - 1; placed.push([]); } return index; };
    const sticks: THREE.Matrix4[] = [];
    const rods: THREE.BufferGeometry[] = [];
    const rod = (from: THREE.Vector3, to: THREE.Vector3, radius: number) => {
      const d = to.clone().sub(from);
      const geometry = new THREE.CylinderGeometry(radius, radius, d.length(), 6, 1);
      rods.push(geometry.applyMatrix4(new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1))));
    };
    const fullness = mix(0.04, 1, a.full) * mix(0.85, 1, mood.density);
    const oddSpot = { tier: Math.min(tiers - 2, 2), arm: 0 };
    const hang = (tier: number, armIndex: number, r: number, droop: number, variant: Variant) => {
      const theta = (armIndex + (tier % 2) * 0.5) / arms * Math.PI * 2;
      const y = firstY + tier * pitch + 0.02 * (r / R) - droop * (r / R) ** 2;
      const m = new THREE.Matrix4().makeTranslation(Math.sin(theta) * r, y - 0.004, Math.cos(theta) * r)
        .multiply(new THREE.Matrix4().makeRotationY(theta + (random() - 0.5) * 0.25))
        .multiply(new THREE.Matrix4().makeRotationZ((random() - 0.5) * mix(0.06, 0.4, mood.wear)))
        .multiply(new THREE.Matrix4().makeRotationX((random() - 0.5) * 0.12 - droop * 1.5))
        .multiply(new THREE.Matrix4().makeTranslation(0, -variant.h / 2, 0))
        .multiply(new THREE.Matrix4().makeScale(variant.w, variant.h, variant.puff ? variant.w : 1));
      placed[use(variant)].push(m);
    };
    for (let tier = 0; tier < tiers; tier++) {
      const kind: Merch = a.merch === 'everything' ? kinds[(tier + Math.floor(context.seed % 5)) % kinds.length] : a.merch;
      const list = catalogue[kind];
      const hub = new THREE.Vector3(0, firstY + tier * pitch, 0);
      rods.push(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12).translate(0, hub.y, 0));
      for (let arm = 0; arm < arms; arm++) {
        const theta = (arm + (tier % 2) * 0.5) / arms * Math.PI * 2;
        const droop = bentArm && bentArm.tier === tier && bentArm.arm === arm ? 0.17 : 0;
        const tip = new THREE.Vector3(Math.sin(theta) * R, hub.y + 0.02 - droop, Math.cos(theta) * R);
        if (droop) { const elbow = new THREE.Vector3(Math.sin(theta) * R * 0.45, hub.y + 0.01, Math.cos(theta) * R * 0.45); rod(hub, elbow, 0.004); rod(elbow, tip, 0.004); }
        else rod(hub, tip, 0.004);
        rod(tip, tip.clone().add(new THREE.Vector3(0, 0.022, 0)), 0.004);
        const odd = a.odd !== 'none' && tier === oddSpot.tier && arm === oddSpot.arm;
        const pepperoni = kind === 'jerky' && tier === 0;
        const variant = kind === 'jerky' ? (tier === tiers - 1 ? list[3] : list[(arm + tier) % 3]) : list[(arm + tier * 2 + (random() < 0.15 ? 1 : 0)) % list.length];
        const gap = pepperoni ? 0.022 : variant.puff ? variant.w * variant.puff * 0.62 : 0.02;
        const most = Math.floor((R - 0.1) / gap);
        const count = odd ? 0 : Math.round(most * Math.min(1, Math.max(0, fullness + (random() - 0.5) * 0.5 * (1.1 - a.full))));
        for (let k = 0; k < count; k++) {
          const r = R - 0.015 - k * gap;
          if (!pepperoni) { hang(tier, arm, r, droop, variant); continue; }
          const length = mix(0.17, 0.21, random());
          sticks.push(new THREE.Matrix4().makeTranslation(Math.sin(theta) * r, hub.y + 0.016 * (r / R) - droop * (r / R) ** 2, Math.cos(theta) * r)
            .multiply(new THREE.Matrix4().makeRotationZ((random() - 0.5) * 0.3)).multiply(new THREE.Matrix4().makeRotationX((random() - 0.5) * 0.3))
            .multiply(new THREE.Matrix4().makeTranslation(0, -length / 2, 0)).multiply(new THREE.Matrix4().makeScale(1, length, 1)));
        }
      }
    }
    // The thing that does not belong, alone on its hook facing forward.
    if (a.odd !== 'none') {
      const theta = (oddSpot.arm + (oddSpot.tier % 2) * 0.5) / arms * Math.PI * 2;
      const y = firstY + oddSpot.tier * pitch + 0.016;
      if (a.odd === 'bear') {
        const fur = s.material('#b98a5a', { roughness: 1 });
        const bear = new THREE.Group();
        const part = (size: number, at: [number, number, number]) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), fur); mesh.position.set(...at); mesh.castShadow = true; bear.add(mesh); };
        part(0.04, [0, -0.11, 0]); part(0.03, [0, -0.055, 0]); part(0.012, [-0.024, -0.03, 0]); part(0.012, [0.024, -0.03, 0]);
        part(0.015, [-0.04, -0.1, 0.01]); part(0.015, [0.04, -0.1, 0.01]); part(0.017, [-0.022, -0.15, 0.01]); part(0.017, [0.022, -0.15, 0.01]);
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.002, 6, 12), chrome); loop.position.y = -0.012; bear.add(loop);
        bear.position.set(Math.sin(theta) * (R - 0.02), y, Math.cos(theta) * (R - 0.02));
        bear.rotation.set(0, theta, 0.15);
        turning.add(bear);
      } else {
        const odd: Variant = a.odd === 'heart' ? { w: 0.17, h: 0.08, draw: shades('#ff3fa4', '#ff7ac4', true) } : a.odd === 'name' ? { w: 0.12, h: 0.16, draw: keychain('#7a2a8a', '#ffe14a', pick(['BARNABY', 'ETHELRED', 'XIOMARA', 'OSWIN'])) } : { w: 0.1, h: 0.165, draw: tree('#1f8a3a', 'PINE') };
        hang(oddSpot.tier, oddSpot.arm, R - 0.02, 0, odd);
      }
    }

    // Pole, hubs and arms as one mesh.
    rods.push(new THREE.CylinderGeometry(0.018, 0.018, poleTop + 0.12, 10).translate(0, (poleTop + 0.12) / 2, 0));
    const frame = new THREE.Mesh(mergeGeometries(rods), chrome);
    frame.castShadow = frame.receiveShadow = true;
    turning.add(frame);
    for (const geometry of rods) geometry.dispose();

    const plane = new THREE.PlaneGeometry(1, 1);
    variants.forEach((variant, index) => {
      const height = Math.round(128 * variant.h / variant.w);
      const map = paint(128, height, (ctx) => variant.draw(ctx, 128, height, random));
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.55, side: THREE.DoubleSide, alphaTest: 0.5, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.03, 0.16, mood.cheer) });
      const mesh = new THREE.InstancedMesh(variant.puff ? pillow(variant.puff) : plane, material, placed[index].length);
      placed[index].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = mesh.receiveShadow = true;
      turning.add(mesh);
    });
    if (sticks.length) {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0075, 0.0075, 1, 7), s.material('#8a2a1a', { roughness: 0.4 }), sticks.length);
      sticks.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = true;
      turning.add(mesh);
    }

    // The round sign.
    const [first, second] = SIGN_NAME[a.merch];
    const signArt = paint(256, 256, (ctx) => {
      const style = { rustic: ['#9a6a3a', '#3a1c0a'], tin: ['#c8102e', '#fdf3d0'], sunburst: ['#ffd21f', '#c8102e'], cardboard: ['#b8936a', '#16181c'], faded: ['#d9d2c0', '#b9ad98'] }[a.sign];
      ctx.fillStyle = style[0]; ctx.fillRect(0, 0, 256, 256);
      if (a.sign === 'rustic') { ctx.strokeStyle = 'rgba(58,28,10,0.35)'; ctx.lineWidth = 2; for (let y = 6; y < 256; y += 9 + random() * 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + random() * 12 - 6, 170, y + random() * 12 - 6, 256, y); ctx.stroke(); } }
      if (a.sign === 'sunburst') { ctx.translate(128, 128); ctx.fillStyle = '#ff8a1f'; for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -130); ctx.lineTo(14, -130); ctx.fill(); } ctx.setTransform(1, 0, 0, 1, 0, 0); }
      ctx.strokeStyle = style[1]; ctx.lineWidth = a.sign === 'cardboard' ? 4 : 9; ctx.beginPath(); ctx.arc(128, 128, 112, 0, 7); ctx.stroke();
      const font = a.sign === 'cardboard' ? 'cursive' : a.sign === 'sunburst' ? 'sans-serif' : 'serif';
      text(ctx, first, 128, 100, first.length > 8 ? 34 : 46, style[1], 190, font);
      text(ctx, second, 128, 150, 50, style[1], 190, font);
      if (a.sign === 'rustic' || a.sign === 'tin') { ctx.fillStyle = style[1]; for (const x of [70, 186]) { ctx.beginPath(); ctx.moveTo(x, 196); ctx.lineTo(x + 8, 208); ctx.lineTo(x - 8, 208); ctx.fill(); } text(ctx, 'EST. 1974', 128, 202, 20, style[1], 120, font); }
    });
    const signMaterial = new THREE.MeshStandardMaterial({ map: signArt, roughness: 0.7, emissive: '#ffffff', emissiveMap: signArt, emissiveIntensity: a.sign === 'sunburst' ? 0.3 : 0.08 });
    const signY = poleTop + 0.31;
    for (const flip of [0, Math.PI]) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), signMaterial);
      disc.position.set(0, signY, flip ? -0.012 : 0.012);
      disc.rotation.y = flip;
      disc.castShadow = true;
      turning.add(disc);
    }
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.024, 40, 1, true).rotateX(Math.PI / 2), a.sign === 'rustic' ? s.material('#5a3a1c') : chrome);
    rim.position.y = signY;
    rim.castShadow = true;
    turning.add(rim);
    if (a.sign === 'cardboard') turning.children.slice(-3).forEach((node) => { node.rotation.z += 0.12; });

    // Base.
    let baseTop = 0.05;
    if (a.base === 'disc') { s.cylinder(0.27, 0.3, 0.035, [0, 0.0175, 0], dark, 32); s.cylinder(0.05, 0.12, 0.05, [0, 0.06, 0], dark, 20); }
    else if (a.base === 'cross') for (let i = 0; i < 4; i++) {
      const t = i * Math.PI / 2 + 0.4;
      s.rod([0, 0.16, 0], [Math.sin(t) * 0.34, 0.06, Math.cos(t) * 0.34], 0.014, chrome);
      s.ball([0.028, 0.028, 0.028], [Math.sin(t) * 0.34, 0.028, Math.cos(t) * 0.34], dark, 10);
    } else {
      baseTop = 0.3;
      const wood = s.material('#a57a4a', { roughness: 0.9 });
      for (let i = 0; i < 4; i++) s.box([0.5, 0.062, 0.5], [0, 0.035 + i * 0.075, 0], wood).scale.set(1, 1, i % 2 ? 0.96 : 1);
      s.label('PRODUCE', 0.3, 0.06, [0, 0.19, 0.252], '#5a3a1c', '#a57a4a');
    }
    if (a.base === 'crate') turning.position.y = baseTop - 0.05;
    if (leaning) { leanGroup.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.06, 0.1, random()); leanGroup.rotation.x = mix(-0.04, 0.04, random()); }

    turning.rotation.y = random() * Math.PI * 2;
    const speed = mix(0.04, 0.7, mood.energy);
    return s.finish({ footprint: 0.34, update: (dt) => { turning.rotation.y += dt * speed; } });
  },
});
