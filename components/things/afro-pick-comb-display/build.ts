import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const COLOURS = {
  black: 'Classic black, the one in every back pocket.',
  pan: 'Red, black and green: the handle red, the comb black, the base green.',
  red: 'Bold signal red.',
  green: 'Deep bottle green.',
  gold: 'Gold, shiny as a trophy.',
  pink: 'Bubblegum pink.',
  blue: 'Bright royal blue.',
} as const;
const TINT: Record<keyof typeof COLOURS, [string, string, string]> = {
  black: ['#1b1b1f', '#1b1b1f', '#2a2a2e'],
  pan: ['#c8202a', '#17171a', '#1f8a3c'],
  red: ['#c8202a', '#c8202a', '#3a2a2a'],
  green: ['#1f7a3c', '#1f7a3c', '#2c2f2a'],
  gold: ['#d6a528', '#d6a528', '#2a2620'],
  pink: ['#ff5aa8', '#ff5aa8', '#f3ecea'],
  blue: ['#2452d8', '#2452d8', '#20242e'],
};

function fistShape(w: number) {
  // A raised fist seen from the front, wrist at the origin. w is the fist's width.
  const u = w / 1.1;
  const shape = new THREE.Shape();
  shape.moveTo(-0.26 * u, 0);
  shape.lineTo(0.26 * u, 0);
  shape.lineTo(0.3 * u, 0.42 * u);
  shape.quadraticCurveTo(0.56 * u, 0.5 * u, 0.55 * u, 0.75 * u);
  shape.lineTo(0.55 * u, 1.12 * u);
  const knuckles = [0.42, 0.15, -0.12, -0.39];
  let x = 0.55;
  for (const k of knuckles) {
    shape.quadraticCurveTo(x * u, 1.34 * u, k * u, 1.34 * u);
    x = k - 0.135;
    shape.quadraticCurveTo(x * u, 1.34 * u, x * u, 1.2 * u);
  }
  shape.lineTo(-0.53 * u, 0.95 * u);
  shape.quadraticCurveTo(-0.66 * u, 0.9 * u, -0.64 * u, 0.7 * u);
  shape.quadraticCurveTo(-0.6 * u, 0.48 * u, -0.3 * u, 0.42 * u);
  shape.closePath();
  return { shape, height: 1.34 * u, u };
}

function mottle(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c98a2c';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 46; i++) {
    ctx.fillStyle = random() < 0.6 ? 'rgba(58,26,10,0.75)' : 'rgba(236,178,74,0.6)';
    ctx.beginPath();
    ctx.ellipse(random() * 128, random() * 128, 6 + random() * 18, 4 + random() * 10, random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    setting: choice('How are the combs presented?', {
      card: 'A shop display card on an easel back, rows of combs hung on it, the big pick standing in front.',
      jar: 'No shop at all: one treasured pick standing in a glass jar, kept on a dresser.',
      mug: 'A barber\'s mug crammed with combs and picks, the big one tallest.',
      monument: 'The fist pick alone, standing tines-down in a block like a small monument.',
    }),
    era: choice('What era does it belong to?', {
      seventies: 'Seventies pride: brown, orange and green sunburst card, bold rounded lettering.',
      nineties: 'Nineties barbershop: red, white and blue stripes and chrome.',
      modern: 'Modern salon: pale blush and white, minimal and tidy.',
    }),
    material: choice('What are the picks made of?', {
      metal: 'Steel tines in a moulded plastic handle, the classic.',
      tortoise: 'Tortoiseshell: mottled amber and dark brown.',
      neon: 'Fluorescent plastic that almost glows.',
      wood: 'Carved wood, oiled and warm.',
      plastic: 'Plain moulded plastic, handle and teeth in one piece.',
    }),
    colour: choice('What colour is the big pick?', COLOURS),
    handle: choice('What is the handle of the big pick?', {
      fist: 'A clenched raised fist.',
      peace: 'A round peace sign.',
      round: 'A plain rounded grip with a finger hole.',
      heart: 'A heart.',
    }),
    size: score('How big is the hero pick?', ['Pocket sized like the rest', 'Large', 'A novelty giant, taller than the card']),
    story: choice('What has happened to the big pick?', {
      new: 'Brand new, a string price tag still tied to it.',
      used: 'Well used: a soft tuft of hair is caught in its tines.',
      broken: 'Loved to breaking: a tine is bent out and the handle is bound with tape.',
      gift: 'It is a present: a ribbon bow is tied round the handle.',
      prize: 'On sale: a spiky starburst sticker shouts the price.',
    }),
    slogan: choice('If there is a card, what does its header say?', {
      picks: 'PICKS & COMBS',
      natural: 'NATURAL',
      proud: 'BLACK IS BEAUTIFUL',
      barber: 'BARBER SUPPLY',
      price: 'ALL 99¢',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // ---- materials
    const tortoise = a.material === 'tortoise' ? mottle(random) : null;
    const plasticMaterial = (hex: string) => {
      if (a.material === 'tortoise') {
        const map = tortoise!.clone();
        map.repeat.set(14, 14);
        map.needsUpdate = true;
        return new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.25 });
      }
      if (a.material === 'wood') return s.material(new THREE.Color('#8a5a2e').lerp(new THREE.Color(hex), 0.12), { roughness: 0.6 });
      if (a.material === 'neon') {
        const c = new THREE.Color(hex);
        const hsl = { h: 0, s: 0, l: 0 };
        c.getHSL(hsl);
        if (hsl.s < 0.25) c.set('#b6f21f'); else c.setHSL(hsl.h, 1, 0.5);
        return s.material(c, { roughness: 0.3, emissive: c, emissiveIntensity: mix(0.12, 0.3, mood.cheer) });
      }
      return s.material(hex, { roughness: a.colour === 'gold' ? 0.25 : 0.4, metalness: a.colour === 'gold' ? 0.7 : 0 });
    };
    const steel = s.material('#cdd2d6', { metalness: 0.95, roughness: 0.22 });
    const [c1, c2, c3] = TINT[a.colour];
    const handleMaterial = plasticMaterial(c1);
    const combMaterial = plasticMaterial(c2);
    const tineMaterial = a.material === 'metal' ? steel : combMaterial;
    const eraLook = {
      seventies: { card: '#c9772a', band: '#4a2a14', ink: '#f6d27a', accent: '#3d7a3a', small: ['#1b1b1f', '#7a3a1a', '#c8202a', '#1f7a3c', '#d6a528'] },
      nineties: { card: '#f3f1ea', band: '#1d3f9a', ink: '#ffffff', accent: '#c8202a', small: ['#1b1b1f', '#1b1b1f', '#c8202a', '#2452d8', '#f3f1ea'] },
      modern: { card: '#f0dcd6', band: '#f8f5f0', ink: '#3a3033', accent: '#b98f86', small: ['#1b1b1f', '#e9d9c8', '#b98f86', '#3a3033', '#f8f5f0'] },
    }[a.era];
    const smallMaterials = eraLook.small.map((hex) => (a.material === 'tortoise' || a.material === 'neon' || a.material === 'wood'
      ? plasticMaterial(pick(['#ff5aa8', '#2452d8', '#1f7a3c', '#d6a528', '#c8202a']))
      : s.material(hex, { roughness: 0.4 })));

    // ---- the hero pick, built tines-down around the origin (y = 0 at the tine tips)
    const makeHero = (H: number) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const W = H * 0.3, T = H * 0.035;
      const tineL = H * 0.5, barH = H * 0.1;
      const n = a.material === 'metal' ? 11 : 8;
      const bent = a.story === 'broken' ? Math.floor(random() * n) : -1;
      const tines: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * W * 0.9;
        const geo = a.material === 'metal'
          ? new THREE.CylinderGeometry(H * 0.006, H * 0.004, tineL, 6)
          : new THREE.CylinderGeometry(W / n * 0.34, W / n * 0.12, tineL, 6).scale(1, 1, 0.8);
        geo.translate(0, -tineL / 2, 0);
        const lean = i === bent ? (random() < 0.5 ? -0.5 : 0.5) : jitter(mood.wear * 0.07);
        geo.rotateZ(lean);
        if (i === bent) geo.rotateX(0.5);
        geo.translate(x, tineL, 0);
        tines.push(geo);
      }
      add(new THREE.Mesh(mergeGeometries(tines)!, tineMaterial));
      tines.forEach((geo) => geo.dispose());
      // the bar the tines are set in
      const bar = new THREE.Shape();
      bar.moveTo(-W / 2, 0); bar.lineTo(W / 2, 0);
      bar.quadraticCurveTo(W / 2, barH, W * 0.2, barH * 1.25);
      bar.lineTo(-W * 0.2, barH * 1.25);
      bar.quadraticCurveTo(-W / 2, barH, -W / 2, 0);
      const bevel = { depth: T, bevelEnabled: true, bevelThickness: T * 0.25, bevelSize: T * 0.25, bevelSegments: 2, curveSegments: 10 };
      add(new THREE.Mesh(new THREE.ExtrudeGeometry(bar, bevel).translate(0, tineL - barH * 0.1, -T / 2), combMaterial));
      const neckY = tineL + barH * 1.1;
      const dark = s.material('#111114', { roughness: 0.7 });
      let top = neckY;
      if (a.handle === 'fist') {
        const fist = fistShape(W * 0.86);
        add(new THREE.Mesh(new THREE.ExtrudeGeometry(fist.shape, { ...bevel, depth: T * 1.6, bevelSize: T * 0.4, bevelThickness: T * 0.4 }).translate(0, neckY, -T * 0.8), handleMaterial));
        const u = fist.u, z = T * 1.22;
        for (const fx of [0.285, 0.015, -0.255]) add(new THREE.Mesh(new THREE.BoxGeometry(u * 0.035, u * 0.42, T * 0.2), dark)).position.set(fx * u, neckY + u * 1.05, z);
        add(new THREE.Mesh(new THREE.BoxGeometry(u * 1.0, u * 0.03, T * 0.2), dark)).position.set(0, neckY + u * 0.84, z);
        const thumb = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), handleMaterial));
        thumb.scale.set(u * 0.42, u * 0.15, T * 0.8);
        thumb.position.set(-u * 0.14, neckY + u * 0.68, z);
        thumb.rotation.z = 0.22;
        add(new THREE.Mesh(new THREE.BoxGeometry(u * 0.5, u * 0.025, T * 0.2), dark)).position.set(0, neckY + u * 0.36, z);
        top = neckY + fist.height;
      } else if (a.handle === 'peace') {
        const R = W * 0.46;
        add(new THREE.Mesh(new THREE.CylinderGeometry(T * 0.9, T * 0.9, R * 0.5, 10), handleMaterial)).position.set(0, neckY + R * 0.2, 0);
        const cy = neckY + R * 1.35;
        add(new THREE.Mesh(new THREE.TorusGeometry(R, T * 0.9, 10, 40), handleMaterial)).position.set(0, cy, 0);
        const spoke = (angle: number, length: number) => {
          const m = add(new THREE.Mesh(new THREE.CylinderGeometry(T * 0.8, T * 0.8, length, 8), handleMaterial));
          m.position.set(Math.sin(angle) * length / 2 * (angle ? 1 : 0), cy - (angle ? Math.cos(angle) * length / 2 : 0), 0);
          m.rotation.z = angle;
        };
        spoke(0, R * 2); spoke(0.78, R); spoke(-0.78, R);
        top = cy + R + T;
      } else if (a.handle === 'heart') {
        const R = W * 0.5;
        const heart = new THREE.Shape();
        heart.moveTo(0, 0);
        heart.bezierCurveTo(-R * 1.9, R * 1.1, -R * 1.1, R * 2.5, 0, R * 1.55);
        heart.bezierCurveTo(R * 1.1, R * 2.5, R * 1.9, R * 1.1, 0, 0);
        add(new THREE.Mesh(new THREE.ExtrudeGeometry(heart, { ...bevel, depth: T * 1.4 }).translate(0, neckY - R * 0.2, -T * 0.7), handleMaterial));
        top = neckY + R * 1.75;
      } else {
        const grip = new THREE.Shape();
        const gw = W * 0.36, gh = H * 0.34;
        grip.moveTo(-gw * 0.7, 0); grip.lineTo(gw * 0.7, 0);
        grip.bezierCurveTo(gw * 1.2, gh * 0.3, gw * 1.2, gh, 0, gh);
        grip.bezierCurveTo(-gw * 1.2, gh, -gw * 1.2, gh * 0.3, -gw * 0.7, 0);
        const hole = new THREE.Path();
        hole.absellipse(0, gh * 0.66, gw * 0.42, gw * 0.42, 0, Math.PI * 2, true);
        grip.holes.push(hole);
        add(new THREE.Mesh(new THREE.ExtrudeGeometry(grip, bevel).translate(0, neckY, -T / 2), handleMaterial));
        top = neckY + gh;
      }

      // ---- what happened to it
      if (a.story === 'new') {
        const string = s.material('#e8e0cc');
        const tag = new THREE.Mesh(new THREE.BoxGeometry(H * 0.11, H * 0.07, 0.0008), s.material('#f6f0dc'));
        tag.position.set(W * 0.62, neckY - H * 0.08, T * 1.2); tag.rotation.z = 0.5; add(tag);
        const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0006, H * 0.16, 4), string);
        line.position.set(W * 0.42, neckY + H * 0.0, T); line.rotation.z = 1.0; add(line);
      } else if (a.story === 'used') {
        const hair = new THREE.MeshStandardMaterial({ color: pick(['#16131a', '#2a1a12', '#4a3a36', '#8a8a8e']), roughness: 1 });
        for (let i = 0; i < 9; i++) {
          const r = H * mix(0.03, 0.055, random());
          const m = add(new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), hair));
          m.position.set(jitter(W * 0.3), tineL * mix(0.45, 0.85, random()), jitter(T));
        }
      } else if (a.story === 'broken') {
        const tape = s.material('#d9d2b8', { roughness: 0.9 });
        for (let i = 0; i < 3; i++) {
          const m = add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.5, H * 0.03, T * 3.2), tape));
          m.position.set(0, neckY + H * 0.02 + i * H * 0.022, 0); m.rotation.z = jitter(0.2);
        }
      } else if (a.story === 'gift') {
        const ribbon = s.material(a.colour === 'red' || a.colour === 'pan' ? '#f2c230' : '#d8203a', { roughness: 0.35, side: THREE.DoubleSide });
        add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.52, H * 0.03, T * 3), ribbon)).position.set(0, neckY + H * 0.03, 0);
        for (const side of [-1, 1]) {
          const loop = add(new THREE.Mesh(new THREE.TorusGeometry(H * 0.045, H * 0.014, 6, 16), ribbon));
          loop.scale.set(1.5, 0.8, 1); loop.position.set(side * H * 0.07, neckY + H * 0.05, T * 1.9); loop.rotation.z = side * 0.4;
          const tail = add(new THREE.Mesh(new THREE.BoxGeometry(H * 0.03, H * 0.13, 0.0008), ribbon));
          tail.position.set(side * H * 0.035, neckY - H * 0.035, T * 1.9); tail.rotation.z = side * 0.3;
        }
        add(new THREE.Mesh(new THREE.SphereGeometry(H * 0.022, 8, 6), ribbon)).position.set(0, neckY + H * 0.05, T * 1.9);
      } else {
        const burst = new THREE.Shape();
        for (let i = 0; i < 24; i++) {
          const r = H * (i % 2 ? 0.075 : 0.11), t = i / 24 * Math.PI * 2;
          if (i === 0) burst.moveTo(Math.cos(t) * r, Math.sin(t) * r); else burst.lineTo(Math.cos(t) * r, Math.sin(t) * r);
        }
        const star = add(new THREE.Mesh(new THREE.ExtrudeGeometry(burst, { depth: 0.001, bevelEnabled: false }), s.material('#ffe21f', { emissive: '#ffd000', emissiveIntensity: 0.25 })));
        star.position.set(W * 0.55, tineL * 0.72, T);
        const holder = new Sculpture(context);
        const price = holder.label(pick(['1.99', '2 FOR 3', '99¢', '3.50']), H * 0.14, H * 0.07, [0, 0, 0], '#c2161f', '#ffe21f');
        price.position.set(W * 0.55, tineL * 0.72, T + 0.0018); price.rotation.z = -0.15;
        g.add(price);
      }
      return { group: g, top, W, T, tineL };
    };

    const H = mix(0.24, 0.5, a.size) * (a.setting === 'monument' ? 1.15 : 1);
    const hero = makeHero(H);
    s.root.add(hero.group);

    // ---- small flat combs, origin at the hanging hole, hanging down -y
    const smallComb = (kind: number, material: THREE.Material) => {
      const parts: THREE.BufferGeometry[] = [];
      const teeth: THREE.BufferGeometry[] = [];
      const D = 0.004;
      if (kind === 0) {
        // little pick
        parts.push(new THREE.CylinderGeometry(0.026, 0.026, D, 16).rotateX(Math.PI / 2).translate(0, -0.026, 0));
        parts.push(new THREE.BoxGeometry(0.056, 0.03, D).translate(0, -0.055, 0));
        for (let i = 0; i < 8; i++) teeth.push(new THREE.CylinderGeometry(0.0016, 0.001, 0.085, 5).translate((i - 3.5) * 0.0072, -0.11, 0));
      } else if (kind === 1) {
        // wide-tooth comb, spine on the left, teeth to the right
        parts.push(new THREE.BoxGeometry(0.014, 0.19, D).translate(-0.02, -0.095, 0));
        parts.push(new THREE.BoxGeometry(0.04, 0.05, D).translate(-0.007, -0.025, 0));
        for (let i = 0; i < 9; i++) teeth.push(new THREE.BoxGeometry(0.036, 0.0075, D * 0.8).translate(0.003, -0.062 - i * 0.0155, 0));
      } else {
        // rat-tail comb
        parts.push(new THREE.BoxGeometry(0.008, 0.1, D).translate(-0.01, -0.05, 0));
        parts.push(new THREE.CylinderGeometry(0.0038, 0.0008, 0.11, 6).translate(-0.01, -0.155, 0));
        for (let i = 0; i < 22; i++) teeth.push(new THREE.BoxGeometry(0.022, 0.002, D * 0.7).translate(0.004, -0.006 - i * 0.0043, 0));
      }
      const group = new THREE.Group();
      const body = new THREE.Mesh(mergeGeometries(parts)!, material);
      const tine = new THREE.Mesh(mergeGeometries(teeth)!, kind === 0 && a.material === 'metal' ? steel : material);
      [...parts, ...teeth].forEach((geo) => geo.dispose());
      body.castShadow = tine.castShadow = true;
      group.add(body, tine);
      return group;
    };

    const base = s.material(c3, { roughness: 0.5 });
    if (a.setting === 'card') {
      const cols = 5, rows = 2, CW = 0.4, CH = 0.56, headH = 0.1;
      const slots: { x: number; y: number; kind: number; filled: boolean }[] = [];
      const fillChance = mix(0.45, 1, mood.density);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const kind = (c + r * 2) % 3;
        slots.push({ x: (c - (cols - 1) / 2) * 0.072, y: CH - headH - 0.03 - r * 0.215, kind, filled: random() < fillChance });
      }
      if (slots.every((slot) => !slot.filled)) slots[0].filled = true;
      // the printed card
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = Math.round(512 * CH / CW);
      const ctx = canvas.getContext('2d')!;
      const px = 512 / CW;
      ctx.fillStyle = eraLook.card; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (a.era === 'seventies') {
        ctx.translate(256, canvas.height * 0.62);
        for (let i = 0; i < 24; i++) {
          ctx.fillStyle = i % 2 ? '#e09a3a' : eraLook.accent;
          ctx.globalAlpha = i % 2 ? 0.9 : 0.55;
          ctx.beginPath(); ctx.moveTo(0, 0);
          ctx.arc(0, 0, 900, i / 24 * Math.PI * 2, (i + 1) / 24 * Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
      } else if (a.era === 'nineties') {
        for (let i = -20; i < 40; i++) {
          ctx.fillStyle = i % 3 === 0 ? eraLook.accent : i % 3 === 1 ? eraLook.band : eraLook.card;
          ctx.save(); ctx.translate(i * 26, 0); ctx.transform(1, 0, -0.5, 1, 0, 0); ctx.fillRect(0, 0, 26, canvas.height); ctx.restore();
        }
        ctx.fillStyle = 'rgba(243,241,234,0.72)'; ctx.fillRect(22, 0, 468, canvas.height - 22);
      } else {
        ctx.strokeStyle = eraLook.accent; ctx.lineWidth = 3;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
      }
      // unfaded ghosts where sold combs used to hang
      for (const slot of slots) if (!slot.filled) {
        ctx.fillStyle = 'rgba(40,22,10,0.22)';
        const cx = (slot.x + CW / 2) * px, cy = (CH - slot.y) * px;
        ctx.fillRect(cx - 0.024 * px, cy, 0.048 * px, 0.18 * px);
      }
      ctx.fillStyle = eraLook.band; ctx.fillRect(0, 0, 512, headH * px);
      ctx.fillStyle = eraLook.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const text = { picks: 'PICKS & COMBS', natural: 'NATURAL', proud: 'BLACK IS BEAUTIFUL', barber: 'BARBER SUPPLY', price: 'ALL 99¢' }[a.slogan];
      ctx.font = `bold ${Math.min(headH * px * 0.62, 760 / text.length)}px ${a.era === 'modern' ? 'sans-serif' : 'Impact, sans-serif'}`;
      ctx.fillText(text, 256, headH * px * 0.54, 480);
      // fading and scuffs with wear
      ctx.fillStyle = `rgba(214,206,186,${mood.wear * 0.45})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < mood.wear * 30; i++) {
        ctx.fillStyle = 'rgba(70,56,40,0.25)';
        ctx.fillRect(random() * 512, random() * canvas.height, 2 + random() * 26, 1 + random() * 3);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const board = new THREE.Group();
      const backing = new THREE.Mesh(new THREE.BoxGeometry(CW, CH, 0.006), s.material('#8b7a5e', { roughness: 0.9 }));
      backing.position.set(0, CH / 2, 0);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
      face.position.set(0, CH / 2, 0.0034);
      backing.castShadow = backing.receiveShadow = face.receiveShadow = true;
      board.add(backing, face);
      const peg = s.material('#d8d8d8', { metalness: 0.8, roughness: 0.3 });
      for (const slot of slots) {
        const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.016, 6).rotateX(Math.PI / 2), peg);
        hook.position.set(slot.x, slot.y, 0.011); board.add(hook);
        if (!slot.filled) continue;
        const comb = smallComb(slot.kind, pick(smallMaterials));
        comb.position.set(slot.x, slot.y + 0.008, 0.012);
        comb.rotation.z = jitter(0.03 + mood.wear * 0.12 + mood.energy * 0.05);
        board.add(comb);
      }
      board.rotation.x = -0.2;
      board.position.set(0, 0, -0.03);
      s.root.add(board);
      // easel strut
      s.rod([0, CH * 0.62, -0.03 - CH * 0.62 * 0.2], [0, 0, -0.26], 0.006, s.material('#8b7a5e'));
      // hero stand
      const hx = 0.2 + H * 0.12, hz = 0.12;
      s.lathe([[0.001, 0], [H * 0.2, 0], [H * 0.2, H * 0.04], [H * 0.17, H * 0.07], [0.001, H * 0.07]], base, [hx, 0, hz]).scale.set(1, 1, 0.6);
      hero.group.position.set(hx, H * 0.03, hz);
      hero.group.rotation.y = -0.18 + jitter(0.08);
    } else if (a.setting === 'jar') {
      const R = Math.max(0.045, hero.W * 0.62), JH = Math.max(0.1, hero.tineL * 0.85);
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dff1ee', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
      s.mesh(new THREE.CylinderGeometry(R, R * 0.94, JH, 28, 1, true), glass, [0, JH / 2, 0]);
      s.cylinder(R * 0.94, R * 0.94, 0.006, [0, 0.003, 0], s.material('#b9d6d0', { roughness: 0.2 }), 28);
      s.ring(R, 0.004, [0, JH, 0], s.material('#c3ded8', { roughness: 0.15 })).rotation.x = Math.PI / 2;
      hero.group.position.set(0, 0.008, 0);
      hero.group.rotation.z = 0.13 * (random() < 0.5 ? -1 : 1);
      hero.group.rotation.y = jitter(0.3);
      // dresser doily and a keepsake or two
      const doily = s.cylinder(R * 2.3, R * 2.3, 0.002, [0, 0.001, 0], s.material(a.era === 'modern' ? '#efe6e0' : '#f1e9d2'), 28);
      void doily;
      const keep = Math.round(mix(0, 3, mood.density));
      for (let i = 0; i < keep; i++) {
        const t = 0.6 + i * 1.5 + jitter(0.3), d = R * 1.75;
        if (i === 0) s.cylinder(0.014, 0.016, 0.03, [Math.cos(t) * d, 0.017, Math.sin(t) * d], s.material(eraLook.accent, { roughness: 0.3 }), 14);
        else if (i === 1) s.ring(0.012, 0.002, [Math.cos(t) * d, 0.004, Math.sin(t) * d], s.material('#d6a528', { metalness: 0.9, roughness: 0.25 })).rotation.x = Math.PI / 2;
        else s.box([0.05, 0.002, 0.035], [Math.cos(t) * d, 0.003, Math.sin(t) * d], s.material('#f6f0dc')).rotation.y = t;
      }
    } else if (a.setting === 'mug') {
      const R = Math.max(0.05, hero.W * 0.7), MH = Math.max(0.1, hero.tineL * 0.8);
      const mugColour = { seventies: '#b5632a', nineties: '#f3f1ea', modern: '#3a3033' }[a.era];
      const mug = s.material(mugColour, { roughness: 0.3 });
      s.lathe([[0.001, 0], [R * 0.9, 0], [R, MH * 0.1], [R, MH], [R * 0.9, MH], [R * 0.9, MH * 0.12], [0.001, MH * 0.12]], mug);
      s.ring(MH * 0.3, MH * 0.07, [R + MH * 0.12, MH * 0.52, 0], mug).scale.set(0.7, 1, 1);
      if (a.era === 'nineties') for (const y of [0.3, 0.42]) s.ring(R * 1.005, 0.004, [0, MH * y, 0], s.material(y < 0.4 ? '#c8202a' : '#1d3f9a')).rotation.x = Math.PI / 2;
      hero.group.position.set(0, MH * 0.13, -R * 0.25);
      hero.group.rotation.z = 0.06;
      const extras = Math.round(mix(2, 7, mood.density));
      for (let i = 0; i < extras; i++) {
        const comb = smallComb(i % 3, pick(smallMaterials));
        const t = i / extras * Math.PI * 2 + jitter(0.3);
        // handles down in the mug, teeth and tails fanning out of the top
        comb.rotation.order = 'YXZ';
        comb.rotation.set(jitter(0.25), t, Math.PI + jitter(0.3));
        comb.position.set(Math.cos(t) * R * 0.55, Math.max(MH * 0.2, MH - 0.07) + jitter(0.01), -Math.sin(t) * R * 0.5 + R * 0.2);
        s.root.add(comb);
      }
    } else {
      const BW = H * 0.55;
      const stone = { seventies: '#6a4526', nineties: '#d9dcdf', modern: '#efe9e4' }[a.era];
      s.mesh(new THREE.BoxGeometry(BW, H * 0.16, BW * 0.6), s.material(stone, { roughness: 0.6, metalness: a.era === 'nineties' ? 0.7 : 0 }), [0, H * 0.08, 0]);
      s.box([BW * 1.15, H * 0.03, BW * 0.72], [0, H * 0.015, 0], base);
      s.label({ seventies: 'POWER', nineties: 'FRESH', modern: 'CROWN' }[a.era], BW * 0.7, H * 0.08, [0, H * 0.09, BW * 0.301], eraLook.ink, eraLook.band);
      hero.group.position.set(0, H * 0.12, 0);
      // a few fallen little combs at its foot, like offerings
      const offerings = Math.round(mix(0, 4, mood.density));
      for (let i = 0; i < offerings; i++) {
        const comb = smallComb(i % 3, pick(smallMaterials));
        comb.rotation.set(-Math.PI / 2, 0, random() * 6);
        comb.position.set(jitter(BW * 0.6), 0.003, BW * 0.5 + random() * 0.1);
        s.root.add(comb);
      }
    }

    const sway = mix(0, 0.02, mood.energy), phase = random() * 6, rest = hero.group.rotation.z;
    return s.finish({
      update: (_dt, time) => { hero.group.rotation.z = rest + Math.sin(time * 1.7 + phase) * sway; },
    });
  },
});
