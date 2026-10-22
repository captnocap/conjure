import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SIZES = [2, 3, 5, 8, 12, 16, 22, 30, 40, 52, 66, 85];

export default defineThing({
  questions: {
    material: choice('What are the stretchers made of?', {
      acrylic: 'Glossy acrylic in loud two-colour swirls, cheap and cheerful.',
      wood: 'Oiled hardwoods: teak, olive and ebony, warm and organic.',
      stone: 'Polished stone, a different gem for each size: jade, amethyst, obsidian, tiger eye.',
      glass: 'Clear tinted glass, jewel-like and fragile.',
      steel: 'Mirror-polished surgical steel.',
      silicone: 'Soft neon silicone, squashy and fluorescent.',
    }),
    reach: score('How far up the sizes does the set go?', ['Four small starter sizes', 'Up to a fingertip', 'Up to a thumb-wide tunnel', 'All the way to fist-wide']),
    missing: choice('Is a pair missing because it is the size being worn?', {
      none: 'No, the set is complete and untouched.',
      early: 'One of the smallest pairs is gone: the journey has just started.',
      middle: 'A pair in the middle is gone, with everything smaller already used.',
      largest: 'The biggest pair is gone: the goal was reached.',
      several: 'Several gaps, a set sold off or lost piece by piece.',
    }),
    large: choice('What form do the bigger sizes take?', {
      tunnels: 'Hollow tunnels you can see daylight through.',
      solid: 'Solid plugs with a pale inlaid spiral on the face.',
      spirals: 'Coiled spiral hangers, like ammonites.',
    }),
    display: choice('What is it displayed on?', {
      acrylic: 'A stepped block of gloss black acrylic.',
      walnut: 'Hand-cut walnut steps.',
      velvet: 'Steps wrapped in red velvet.',
      card: 'A kraft cardboard starter-kit box with a printed header card.',
    }),
    aid: choice('What sits beside it?', {
      none: 'Nothing.',
      oil: 'A small amber bottle of jojoba oil.',
      tape: 'A roll of white stretching tape.',
      calipers: 'A pair of steel calipers for measuring the next size.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = Math.min(SIZES.length, 4 + Math.round(a.reach * 8));
    const sizes = SIZES.slice(0, count).map((mm) => mm / 1000);

    // Materials for the stretchers, one per pair.
    let swirl: THREE.Texture | null = null;
    if (a.material === 'acrylic') {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#3a3a3a'; g.lineWidth = 9;
      for (let i = 0; i < 9; i++) { g.beginPath(); const y = i * 18 - 10; g.moveTo(0, y); g.bezierCurveTo(40, y + 30 * (random() - 0.5) + 20, 90, y - 20, 128, y + 14); g.stroke(); }
      swirl = new THREE.CanvasTexture(c); swirl.colorSpace = THREE.SRGBColorSpace; swirl.wrapS = swirl.wrapT = THREE.RepeatWrapping;
    }
    const sat = mix(0.55, 1, mood.cheer);
    const hue0 = random();
    const pairMaterial = (i: number): THREE.Material => {
      switch (a.material) {
        case 'acrylic': { const c = new THREE.Color().setHSL((hue0 + i * 0.13) % 1, sat, 0.6); return s.material(c, { map: swirl, roughness: 0.15, emissive: c, emissiveIntensity: 0.18 }); }
        case 'wood': return s.material(['#a8703c', '#c9a063', '#2a1c14', '#7a4a26', '#5c3a1e'][i % 5], { roughness: 0.6 });
        case 'stone': return s.material(['#3f9a6a', '#8a4fc0', '#17161b', '#b9772a', '#e9a9b8', '#2c62b0', '#d9e6ee'][i % 7], { roughness: 0.12, metalness: 0.1 });
        case 'glass': { const c = new THREE.Color().setHSL((hue0 + i * 0.09) % 1, sat * 0.8, 0.6); return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.04, transparent: true, opacity: 0.72, emissive: c, emissiveIntensity: 0.3 }); }
        case 'steel': return s.material('#e4e9ec', { metalness: 0.95, roughness: 0.14, emissive: '#7c8c9a', emissiveIntensity: 0.25 });
        default: { const c = new THREE.Color().setHSL([0.9, 0.3, 0.52, 0.12, 0.75, 0.02][i % 6], 1, 0.55); return s.material(c, { roughness: 0.75, emissive: c, emissiveIntensity: 0.35 }); }
      }
    };
    const inlay = s.material('#f1e7cd', { roughness: 0.4 });
    const oring = s.material('#16161a', { roughness: 0.8 });
    const stepColour = { acrylic: '#17171b', walnut: '#5a3620', velvet: '#8e1228', card: '#b8925e' }[a.display];
    const stepM = s.material(stepColour, { roughness: a.display === 'acrylic' ? 0.12 : a.display === 'velvet' ? 1 : 0.7 });
    const hole = s.material(new THREE.Color(stepColour).multiplyScalar(0.45), { roughness: 1 });

    const gone = new Set<number>();
    if (a.missing === 'early') gone.add(1 + Math.floor(random() * 2));
    else if (a.missing === 'middle') gone.add(Math.floor(count / 2) + Math.floor(random() * 2) - 1);
    else if (a.missing === 'largest') gone.add(count - 1);
    else if (a.missing === 'several') { for (let i = 0; i < count; i++) if (random() < 0.34) gone.add(i); gone.add(Math.floor(random() * count)); }

    const face = (m: THREE.Mesh) => { m.rotation.x = Math.PI / 2; return m; };
    const wearable = (i: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
      const r = d / 2;
      if (d <= 0.0085) {
        // Taper: a long spike, point up, with two o-rings.
        const len = 0.045 + d * 3;
        s.cylinder(0.0003, r, len, [x, y + len / 2, z], m, 12);
        for (const k of [0.12, 0.3]) s.ring(r * (1 - k * 0.8) + 0.0006, 0.0007, [x, y + len * k, z], oring).rotation.x = Math.PI / 2;
        return;
      }
      const t = Math.min(0.016, Math.max(0.008, d * 0.42));
      const cy = y + r;
      const big = d >= 0.022;
      if (big && a.large === 'spirals') {
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 30; k++) { const an = k / 30 * Math.PI * 4.4 - Math.PI / 2; const rr = r * (0.92 - k / 30 * 0.74); pts.push([x + Math.cos(an) * rr, cy + Math.sin(an) * rr, z]); }
        s.tube(pts, Math.max(0.0018, d * 0.075), m);
        return;
      }
      if (big && a.large === 'tunnels') {
        const ri = r * 0.78;
        face(s.lathe([[ri, -t / 2], [r, -t / 2], [r * 0.92, -t * 0.2], [r * 0.92, t * 0.2], [r, t / 2], [ri, t / 2], [ri, -t / 2]], m, [x, cy, z]));
        return;
      }
      face(s.lathe([[0, -t / 2], [r * 0.9, -t / 2], [r, -t * 0.38], [r * 0.88, -t * 0.15], [r * 0.88, t * 0.15], [r, t * 0.38], [r * 0.9, t / 2], [0, t / 2]], m, [x, cy, z]));
      if (big) {
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 24; k++) { const an = k / 24 * Math.PI * 4 + i; const rr = r * (0.75 - k / 24 * 0.7); pts.push([x + Math.cos(an) * rr, cy + Math.sin(an) * rr, z + t / 2]); }
        s.tube(pts, d * 0.03, inlay);
      }
    };

    // The staircase: each size on its own step, a little higher than the last.
    const depth = 0.075;
    let cursor = 0;
    const spans: { x: number; w: number; h: number }[] = [];
    sizes.forEach((d, i) => {
      const w = d + 0.014;
      const h = 0.012 + i * 0.007;
      const back = Math.max(0.012, d * 0.55);
      const x = cursor + w / 2;
      spans.push({ x, w, h });
      s.box([w, h, depth / 2], [x, h / 2, depth / 4], stepM);
      s.box([w, h + back, depth / 2], [x, (h + back) / 2, -depth / 4], stepM);
      const lab = s.label(String(Math.round(d * 1000)), w * 0.9, Math.min(0.011, h * 0.8), [x, h / 2, depth / 2 + 0.0004], a.display === 'card' ? '#3a2a18' : '#f2ead6', stepColour);
      void lab;
      if (gone.has(i)) {
        for (const [zz, yy] of [[depth / 4, h], [-depth / 4, h + back]] as const) s.cylinder(Math.max(0.0015, d * 0.3), Math.max(0.0015, d * 0.3), 0.0008, [x, yy + 0.0003, zz], hole, 16);
      } else {
        const m = pairMaterial(i);
        const lean = (random() - 0.5) * 0.004 * (0.3 + mood.energy);
        wearable(i, d, x + lean, h, depth / 4, m);
        wearable(i, d, x - lean, h + back, -depth / 4, m);
      }
      cursor += w;
    });
    const total = cursor;
    if (a.display === 'card') {
      const tall = spans[count - 1].h + sizes[count - 1] * 1.7 + 0.04;
      s.box([total + 0.01, tall, 0.004], [total / 2, tall / 2, -depth / 2 - 0.002], stepM);
      s.label('STRETCH KIT', Math.min(total * 0.7, 0.16), 0.022, [total * 0.36, tall - 0.02, -depth / 2 + 0.0006], '#f6ecd0', '#c2331f');
    } else if (a.display === 'acrylic') {
      s.box([total + 0.012, 0.004, depth + 0.012], [total / 2, 0.002, 0], s.material('#2a2a30', { roughness: 0.1 }));
    }

    // Stretching aids by the small end.
    const ax = Math.min(total * 0.18, 0.06), az = depth / 2 + 0.035;
    if (a.aid === 'oil') {
      s.cylinder(0.011, 0.011, 0.034, [ax, 0.017, az], s.material('#a4601a', { roughness: 0.1, emissive: '#7a3d00', emissiveIntensity: 0.35 }), 16);
      s.cylinder(0.005, 0.009, 0.008, [ax, 0.038, az], s.material('#a4601a', { roughness: 0.1 }), 12);
      s.cylinder(0.006, 0.006, 0.012, [ax, 0.048, az], s.material('#1b1b1e'), 12);
      s.label('OIL', 0.018, 0.012, [ax, 0.017, az + 0.0112], '#3a2a18', '#f1e6c8');
    } else if (a.aid === 'tape') {
      s.lathe([[0.008, 0], [0.018, 0], [0.018, 0.012], [0.008, 0.012], [0.008, 0]], s.material('#f4f4f0', { roughness: 0.5 }), [ax, 0, az]);
      s.box([0.03, 0.0006, 0.012], [ax + 0.03, 0.0006, az + 0.008], s.material('#f4f4f0')).rotation.y = 0.3;
    } else if (a.aid === 'calipers') {
      const steel = s.material('#d9dfe3', { metalness: 0.9, roughness: 0.2 });
      const g = new THREE.Group(); g.position.set(ax + 0.03, 0.002, az + 0.005); g.rotation.y = 0.25 + random() * 0.3; s.root.add(g);
      g.add(s.box([0.12, 0.003, 0.012], [0, 0, 0], steel));
      for (const [px, len] of [[-0.058, 0.035], [-0.02 + random() * 0.03, 0.035]] as const) g.add(s.box([0.006, 0.003, len], [px, 0, len / 2], steel));
      g.add(s.box([0.022, 0.005, 0.02], [0.0, 0.001, -0.002], s.material('#1c1c20')));
    }
    return s.finish();
  },
});
