import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { mouthOutline, gapOutline, type Mouth } from './lips';
import { blend, bump, paint, relief, smooth, stain, trace } from './relief';

const TONE = { porcelain: '#f3d6c6', honey: '#deaa86', olive: '#bd8a62', deep: '#74462f' } as const;

export default defineThing({
  questions: {
    tone: choice('What is the skin tone?', {
      porcelain: 'Pale porcelain pink.',
      honey: 'Warm honey beige.',
      olive: 'Olive tan.',
      deep: 'Deep brown.',
    }),
    skin: choice('What is the skin like?', {
      smooth: 'Smooth, young and even.',
      weathered: 'Weathered and blotchy, sun and wind in it.',
      freckled: 'Scattered thick with freckles.',
      stubbled: 'Dark stubble shading the jaw and lower cheeks.',
      powdered: 'Powdered chalk white like a clown, a geisha or a marquise.',
    }),
    colour: choice('What colour sits on the cheeks?', {
      flush: 'A soft natural flush on the apples.',
      doll: 'Two hard round doll circles of bright blush.',
      contour: 'Unblended contour: dark stripes under the cheekbones, pale stripes above.',
      slap: 'A red handprint across one cheek, fingers and all.',
      cold: 'Raw cold-red and purple, pinched by winter.',
      none: 'No colour at all, drained.',
    }),
    expression: choice('What are the cheeks doing?', {
      relaxed: 'At rest.',
      smile: 'Lifted into a broad smile with dimples.',
      sucked: 'Sucked in hollow, fish-faced.',
      puffed: 'Puffed out full of held breath.',
      clenched: 'Clenched, jaw muscles standing out.',
    }),
    mark: choice('Is there a mark on them?', {
      none: 'Nothing.',
      spot: 'A single dark beauty spot.',
      scar: 'A pale stitched scar across one cheek.',
      tear: 'One tear track running down, a drop at its end.',
      kiss: 'A lipstick kiss print left on one cheek.',
    }),
    age: score('How old is the face?', ['A child', 'Twenties', 'Middle-aged', 'Very old, lined and slack']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tone = a.skin === 'powdered' ? '#f3efe8' : a.skin === 'weathered' ? blend(TONE[a.tone], '#a2553c', 0.25) : TONE[a.tone];
    const old = smooth(0.45, 1, a.age);
    const side = random() < 0.5 ? -1 : 1;

    const W = 0.24, H = 0.21;
    const appleY = a.expression === 'smile' ? 0.022 : a.expression === 'puffed' ? -0.012 : 0.008 - old * 0.012;
    const appleR = a.expression === 'puffed' ? 0.05 : 0.034;
    const appleH = { relaxed: 0.02, smile: 0.028, sucked: 0.008, puffed: 0.046, clenched: 0.015 }[a.expression] * mix(1.15, 0.8, a.age);
    const mouth = { relaxed: [0.032, 0.006, 0.005, 1.5], smile: [0.046, 0.002, 0.017, 7], sucked: [0.011, 0.012, 0.012, 0], puffed: [0.015, 0.004, 0.004, 0], clenched: [0.04, 0.003, 0.003, -2.5] }[a.expression];
    const mouthY = -0.048;
    const height = (x: number, y: number) => {
      const ax = Math.abs(x);
      let z = -3.1 * x * x - 0.4 * y * y;
      z += appleH * bump(Math.hypot(ax - 0.056, (y - appleY) * 1.1), appleR);
      z += 0.007 * bump(y - (0.03 + 0.55 * (ax - 0.05)), 0.016) * smooth(0.035, 0.075, ax);
      z += 0.012 * bump(Math.hypot(ax, y + 0.088), 0.032);
      z += 0.012 * old * bump(Math.hypot(ax - 0.058, y + 0.066), 0.024);
      if (a.expression === 'sucked') z -= 0.016 * bump(Math.hypot(ax - 0.058, (y + 0.026) * 0.8), 0.028);
      if (a.expression === 'smile') z -= 0.006 * bump(Math.hypot(ax - 0.066, y + 0.034), 0.007);
      if (a.expression === 'clenched') z += 0.009 * bump(Math.hypot(ax - 0.086, y + 0.035), 0.02);
      // Nasolabial folds deepen with age and with a smile.
      const fold = Math.abs(ax - (0.026 + (0.03 - y) * 0.22));
      z -= (0.002 + 0.004 * old + (a.expression === 'smile' ? 0.003 : 0)) * bump(fold, 0.005) * smooth(0.03, 0.01, y) * smooth(-0.07, -0.045, y);
      return z;
    };
    const outline = (x: number, y: number) => {
      const ax = Math.abs(x);
      const rx = 0.11 * (0.74 + 0.26 * smooth(-0.095, 0.02, y));
      const face = (1 - (ax / rx) ** 2.6 - (Math.abs(y + 0.013) / 0.093) ** 2.6) * 0.04;
      const top = 0.088 - 0.024 * bump(ax - 0.056, 0.034) - y;
      const noseR = 0.007 + 0.016 * smooth(0.045, -0.004, y);
      const nose = (1 - (x / noseR) ** 2 - (Math.abs(y - 0.02) / 0.032) ** 2.4) * 0.012;
      const [mw, tu, tl, k] = mouth;
      const lens = Math.max(0, 1 - (x / mw) ** 2);
      const lip = ax < mw ? Math.min(mouthY + k * x * x + tu * lens - y, y - (mouthY + k * x * x - tl * lens)) : -(ax - mw);
      return Math.min(face, top, -nose, -lip);
    };
    const form = new THREE.Group();
    const mask = relief(W, H, 132, (x, y) => (outline(x, y) > 0 ? height(x, y) : null), (x, y) => height(x, y) - 0.011, outline);

    const blush = blend('#e8607c', '#f0785a', mood.warmth);
    const map = paint(W, H, 768, (ctx) => {
      ctx.fillStyle = tone;
      ctx.fillRect(-W, -H, W * 2, H * 2);
      for (let i = 0; i < 70; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.014, 0.014, random() < 0.5 ? blend(tone, '#b0503c', 0.5) : blend(tone, '#fff3e4', 0.6), 0.1);
      if (a.skin === 'weathered') {
        for (let i = 0; i < 90; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.008 + random() * 0.01, 0.008, random() < 0.6 ? '#8a3a2a' : '#5e3b2a', 0.16);
        ctx.strokeStyle = 'rgba(70,30,24,0.4)';
        ctx.lineWidth = 0.0005;
        for (let i = 0; i < 40; i++) { const x = (random() - 0.5) * 0.18, y = (random() - 0.5) * 0.1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 0.012, y + (random() - 0.5) * 0.012); ctx.stroke(); }
      }
      // Colour on the cheeks.
      for (const sx of [-1, 1]) {
        const cx = sx * 0.058, cy = appleY;
        if (a.colour === 'flush') stain(ctx, cx, cy, 0.04, 0.032, blush, 0.5);
        if (a.colour === 'doll') { ctx.fillStyle = blend(blush, '#ff2d55', 0.5); ctx.beginPath(); ctx.arc(cx, cy, 0.023, 0, 7); ctx.fill(); stain(ctx, cx - 0.006, cy + 0.007, 0.01, 0.008, '#ffffff', 0.35); }
        if (a.colour === 'contour') {
          ctx.lineCap = 'round';
          ctx.strokeStyle = blend(tone, '#3c2218', 0.62); ctx.lineWidth = 0.011;
          ctx.beginPath(); ctx.moveTo(sx * 0.1, 0.02); ctx.lineTo(sx * 0.045, -0.024); ctx.stroke();
          ctx.strokeStyle = blend(tone, '#fff6e6', 0.75); ctx.lineWidth = 0.008;
          ctx.beginPath(); ctx.moveTo(sx * 0.094, 0.046); ctx.lineTo(sx * 0.04, 0.026); ctx.stroke();
          ctx.strokeStyle = blend(tone, '#3c2218', 0.5); ctx.lineWidth = 0.007;
          ctx.beginPath(); ctx.moveTo(sx * 0.085, -0.045); ctx.lineTo(sx * 0.03, -0.092); ctx.stroke();
        }
        if (a.colour === 'cold') {
          stain(ctx, cx, cy, 0.045, 0.036, '#c92a3c', 0.6);
          for (let i = 0; i < 12; i++) stain(ctx, cx + (random() - 0.5) * 0.06, cy + (random() - 0.5) * 0.05, 0.008, 0.008, '#7a2a6a', 0.25);
        }
      }
      if (a.colour === 'cold') stain(ctx, 0, -0.088, 0.03, 0.02, '#c92a3c', 0.4);
      if (a.colour === 'slap') {
        ctx.save();
        ctx.translate(side * 0.06, 0.0);
        ctx.rotate(side * -0.5 + (random() - 0.5) * 0.3);
        stain(ctx, 0, 0, 0.05, 0.05, '#e0354a', 0.3);
        ctx.fillStyle = 'rgba(214,40,60,0.6)';
        ctx.beginPath(); ctx.ellipse(0, -0.02, 0.021, 0.019, 0, 0, 7); ctx.fill();
        for (let f = 0; f < 4; f++) { ctx.beginPath(); ctx.ellipse(-0.017 + f * 0.0112, 0.019 + (f === 1 || f === 2 ? 0.006 : 0), 0.0043, 0.022, (f - 1.5) * 0.07, 0, 7); ctx.fill(); }
        ctx.beginPath(); ctx.ellipse(side * -0.028, -0.012, 0.0045, 0.014, side * 0.9, 0, 7); ctx.fill();
        ctx.restore();
      }
      if (a.skin === 'freckled') for (let i = 0; i < 420; i++) {
        const x = (random() + random() - 1) * 0.105, y = 0.02 + (random() + random() - 1) * 0.07;
        ctx.fillStyle = `rgba(${a.tone === 'deep' ? '40,20,12' : '150,84,44'},${0.35 + random() * 0.45})`;
        ctx.beginPath(); ctx.arc(x, y, 0.0006 + random() * 0.0012, 0, 7); ctx.fill();
      }
      if (a.skin === 'stubbled') for (let i = 0; i < 2600; i++) {
        const x = (random() - 0.5) * 0.22, y = -0.105 + random() * 0.115;
        if (y > -0.012 + Math.abs(x) * 0.5 - 0.02 && Math.abs(x) < 0.05) continue;
        ctx.fillStyle = `rgba(30,24,22,${0.3 + random() * 0.5})`;
        ctx.fillRect(x, y, 0.0007, 0.0013);
      }
      if (a.skin === 'stubbled') stain(ctx, 0, -0.07, 0.11, 0.05, '#2a2422', 0.22);
      // Age: folds, crow's feet and fine lines.
      ctx.lineCap = 'round';
      for (const sx of [-1, 1]) {
        ctx.strokeStyle = `rgba(80,36,28,${0.15 + old * 0.5})`;
        ctx.lineWidth = 0.001 + old * 0.001;
        ctx.beginPath(); ctx.moveTo(sx * 0.027, 0.012); ctx.quadraticCurveTo(sx * 0.046, -0.02, sx * 0.047, -0.055); ctx.stroke();
        if (old > 0.05) for (let i = 0; i < 4; i++) {
          ctx.lineWidth = 0.0007;
          ctx.beginPath(); ctx.moveTo(sx * 0.088, 0.058 - i * 0.006); ctx.lineTo(sx * 0.104, 0.062 - i * 0.012); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx * (0.05 + i * 0.008), -0.062 - i * 0.004); ctx.quadraticCurveTo(sx * (0.06 + i * 0.008), -0.078, sx * (0.05 + i * 0.008), -0.09); ctx.stroke();
        }
      }
      if (a.mark === 'spot') { ctx.fillStyle = '#2a1712'; ctx.beginPath(); ctx.arc(side * 0.05, -0.03, 0.0032, 0, 7); ctx.fill(); }
      if (a.mark === 'scar') {
        ctx.save(); ctx.translate(side * 0.062, -0.012); ctx.rotate(side * 0.7);
        ctx.strokeStyle = blend(tone, '#ffe9e2', 0.7); ctx.lineWidth = 0.0028; ctx.beginPath(); ctx.moveTo(-0.028, 0); ctx.quadraticCurveTo(0, 0.006, 0.028, 0); ctx.stroke();
        ctx.strokeStyle = 'rgba(120,40,40,0.75)'; ctx.lineWidth = 0.001;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 0.008, -0.005); ctx.lineTo(i * 0.008, 0.008); ctx.stroke(); }
        ctx.restore();
      }
      if (a.mark === 'tear') {
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.0032;
        ctx.beginPath(); ctx.moveTo(side * 0.05, 0.05); ctx.bezierCurveTo(side * 0.047, 0.02, side * 0.062, -0.01, side * 0.058, -0.04); ctx.stroke();
        ctx.strokeStyle = a.skin === 'powdered' ? 'rgba(190,140,120,0.9)' : 'rgba(70,90,120,0.45)'; ctx.lineWidth = 0.0012;
        ctx.beginPath(); ctx.moveTo(side * 0.052, 0.05); ctx.bezierCurveTo(side * 0.049, 0.02, side * 0.064, -0.01, side * 0.06, -0.04); ctx.stroke();
      }
      if (a.mark === 'kiss') {
        const print: Mouth = { W: 0.027, Hu: 0.011, Hl: 0.012, bow: 0.45, gap: 0.004, smile: 0, Du: 0, Dl: 0 };
        ctx.save(); ctx.translate(side * 0.062, -0.012); ctx.rotate(side * -0.35 + (random() - 0.5) * 0.4);
        trace(ctx, mouthOutline(print)); ctx.fillStyle = '#c40f22'; ctx.globalAlpha = 0.88; ctx.fill();
        trace(ctx, gapOutline(print)); ctx.fillStyle = tone; ctx.globalAlpha = 1; ctx.fill();
        ctx.strokeStyle = tone; ctx.lineWidth = 0.0006;
        for (let i = 0; i < 16; i++) { const x = (random() - 0.5) * 0.04; ctx.beginPath(); ctx.moveTo(x, -0.012); ctx.lineTo(x * 1.15, 0.012); ctx.stroke(); }
        ctx.restore();
      }
      for (let i = 0; i < 50 * mood.wear; i++) stain(ctx, (random() - 0.5) * W, (random() - 0.5) * H, 0.007, 0.007, '#6f675a', 0.2);
    });
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      form.add(mesh);
      return mesh;
    };
    add(mask.front, new THREE.MeshStandardMaterial({ map, roughness: a.skin === 'powdered' ? 0.95 : 0.62 }));
    add(mask.shell, s.material(blend(tone, '#4a2c24', 0.3), { roughness: 0.85 }));
    let drop: THREE.Mesh | null = null;
    if (a.mark === 'tear') {
      drop = add(new THREE.SphereGeometry(0.0048, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#dff2ff', roughness: 0.05, clearcoat: 1, emissive: '#9fc8e8', emissiveIntensity: 0.25 }));
      drop.scale.set(1, 1.4, 0.8);
      drop.position.set(side * 0.058, -0.043, height(side * 0.058, -0.043) + 0.002);
    }
    form.position.set(0, 0.168, 0);
    form.rotation.x = -0.26;
    s.root.add(form);

    const brass = s.material('#d9ae52', { metalness: 0.9, roughness: 0.25 });
    s.lathe([[0, 0], [0.06, 0], [0.06, 0.006], [0.052, 0.012], [0.014, 0.016], [0.008, 0.03], [0, 0.03]], brass, [0, 0, -0.04]);
    s.rod([0, 0.02, -0.04], [0, 0.15, -0.04], 0.005, brass);
    s.rod([0, 0.15, -0.04], [0, 0.155, -0.012], 0.004, brass);

    // What put the colour there: a blush compact and brush on the counter.
    if (a.colour === 'flush' || a.colour === 'doll' || a.colour === 'contour') {
      const powder = a.colour === 'contour' ? blend(tone, '#3c2218', 0.55) : blush;
      const cx = -side * 0.055, cz = 0.05;
      s.cylinder(0.03, 0.03, 0.01, [cx, 0.005, cz], s.material('#1d1b20', { roughness: 0.35 }), 28);
      s.cylinder(0.024, 0.024, 0.003, [cx, 0.0105, cz], s.material(powder, { roughness: 0.95 }), 28);
      const turn = random() * 0.8 - 0.4;
      const tip: [number, number, number] = [cx + 0.05 * Math.cos(turn) * -side * -1, 0.016, cz + 0.02];
      const end: [number, number, number] = [tip[0] + side * 0.07 * Math.cos(turn), 0.01, tip[2] + 0.07 * Math.sin(turn) + 0.01];
      s.rod(end, [mix(end[0], tip[0], 0.6), 0.012, mix(end[2], tip[2], 0.6)], 0.004, s.material('#22191c', { roughness: 0.4 }), 0.0055);
      s.rod([mix(end[0], tip[0], 0.6), 0.012, mix(end[2], tip[2], 0.6)], [mix(end[0], tip[0], 0.72), 0.013, mix(end[2], tip[2], 0.72)], 0.0062, brass);
      s.rod([mix(end[0], tip[0], 0.72), 0.013, mix(end[2], tip[2], 0.72)], tip, 0.007, s.material(blend('#e9d2c0', powder, 0.45), { roughness: 1 }), 0.016);
    }

    const pace = mix(0.4, 2.2, mood.energy);
    const breath = a.expression === 'puffed' ? 0.012 : 0.004;
    return s.finish({
      update: (_dt, time) => {
        form.scale.x = 1 + Math.sin(time * pace) * breath;
        if (drop) drop.position.y = -0.043 - ((time * pace * 0.004) % 0.012);
      },
    });
  },
});
