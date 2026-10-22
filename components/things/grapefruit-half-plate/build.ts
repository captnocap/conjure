import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const FRUIT = {
  pink: { rind: '#f1c64a', flesh: '#f08a6c', deep: '#d9604a', r: 0.056, pith: 0.1 },
  white: { rind: '#f2d23c', flesh: '#f3e08a', deep: '#d9bf55', r: 0.056, pith: 0.11 },
  ruby: { rind: '#f0a83a', flesh: '#d93a3a', deep: '#a81e2a', r: 0.054, pith: 0.09 },
  blood: { rind: '#e8782a', flesh: '#b8243a', deep: '#6e1028', r: 0.04, pith: 0.07 },
  pomelo: { rind: '#a9c24a', flesh: '#f2b89a', deep: '#e0907a', r: 0.068, pith: 0.2 },
  orange: { rind: '#f08a1c', flesh: '#f5a52a', deep: '#e07f14', r: 0.043, pith: 0.07 },
} as const;

export default defineThing({
  questions: {
    fruit: choice('What fruit is it?', {
      pink: 'A pink grapefruit: yellow skin, coral flesh.',
      white: 'A white grapefruit: pale yellow all through, the sour kind.',
      ruby: 'A ruby red grapefruit, deep and sweet.',
      blood: 'A small blood orange, crimson and marbled.',
      pomelo: 'A big green-skinned pomelo with thick white pith.',
      orange: 'An ordinary orange, cut the same way for a child.',
    }),
    eaten: score('How much has been eaten?', [
      'Untouched, freshly cut',
      'Two or three segments scooped',
      'Half the segments gone',
      'One segment left',
      'A hollow rind, squeezed dry',
    ]),
    sugar: score('How much sugar has been spilled around it?', [
      'None at all',
      'A few stray grains',
      'A trail from the bowl to the fruit',
      'Sugar everywhere, a small drift',
    ]),
    vessel: choice('What does the sugar come in?', {
      bowl: 'A china sugar bowl with a teaspoon in it.',
      cubes: 'A bowl of sugar cubes with little tongs.',
      pourer: 'A glass diner pourer with a chrome spout.',
      sachets: 'Paper sachets, one torn open.',
      none: 'No sugar on the table. It is eaten as it is.',
    }),
    topping: choice('What is on top of the fruit?', {
      none: 'Nothing.',
      cherry: 'A glacé cherry in the middle, hotel style.',
      grilled: 'A crust of brown sugar, grilled until it bubbled.',
      heap: 'A white heap of sugar not yet soaked in.',
      mint: 'A sprig of mint.',
    }),
    dish: choice('What is it served on?', {
      saucer: 'A plain white saucer.',
      coupe: 'A footed cut-glass dish.',
      silver: 'A silver hotel dish on a doily.',
      melamine: 'A pastel melamine plate.',
    }),
    company: choice('What keeps it company?', {
      none: 'Nothing. That is breakfast.',
      half: 'The other half, waiting face up.',
      crispbread: 'Two dry crispbreads and a scrape of cottage cheese.',
      cigarette: 'A cigarette burning in a glass ashtray.',
      coffee: 'A cup of black coffee.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const f = FRUIT[a.fruit];
    const R = f.r;
    const segments = 10 + Math.floor(random() * 3);
    const steel = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.22 });
    const china = s.material('#f5f2ea', { roughness: 0.28, side: THREE.DoubleSide });
    const sugarSkin = s.material('#ffffff', { roughness: 0.9 });

    // Dish.
    let top = 0.006;
    const dr = Math.max(0.082, R * 1.5);
    if (a.dish === 'coupe') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e6f1f2', transparent: true, opacity: 0.4, roughness: 0.08, side: THREE.DoubleSide, flatShading: true });
      const coupe = s.mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.038, 0.005], [0.008, 0.012], [0.008, 0.03], [0.02, 0.036], [dr * 0.8, 0.045], [dr, 0.072]].map(([x, y]) => new THREE.Vector2(x, y)), 16), glass);
      coupe.castShadow = true;
      top = 0.04;
    } else if (a.dish === 'silver') {
      const lace = s.cylinder(dr * 1.25, dr * 1.25, 0.001, [0, 0.0005, 0], s.material('#fbfaf5', { roughness: 1 }), 24);
      lace.castShadow = false;
      s.lathe([[0, 0.002], [0.035, 0.002], [0.036, 0.012], [dr * 0.6, 0.016], [dr, 0.03], [dr + 0.003, 0.03], [dr * 0.6, 0.012], [0, 0.012]], s.material('#dfe1e0', { metalness: 0.9, roughness: 0.2 + mood.wear * 0.3, side: THREE.DoubleSide }));
      top = 0.0165;
    } else {
      const skin = a.dish === 'melamine' ? s.material(['#a8d8c8', '#f2c9b8', '#f2e2a0', '#b8cce8'][Math.floor(random() * 4)], { roughness: 0.5, side: THREE.DoubleSide }) : china;
      s.lathe([[0, 0.006], [dr * 0.62, 0.006], [dr * 0.7, 0.007], [dr, 0.016], [dr + 0.002, 0.0145], [dr * 0.7, 0.003], [dr * 0.6, 0], [0, 0]], skin);
      top = 0.0065;
    }

    // The fruit: a rind hemisphere and a cut face drawn in polar coordinates.
    const halfAt = (x: number, y: number, z: number, eaten: number, topping: typeof a.topping | 'none') => {
      const group = new Sculpture(context);
      const rindSkin = new THREE.MeshStandardMaterial({ color: new THREE.Color(f.rind).lerp(new THREE.Color('#8a7a3a'), mood.wear * 0.3), roughness: 0.6, side: THREE.DoubleSide });
      const hollow = eaten > 0.9;
      const squash = hollow ? 0.8 : 0.96;
      const rind = group.mesh(new THREE.SphereGeometry(R, 36, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), rindSkin, [0, R * squash, 0]);
      rind.scale.y = squash;
      const gone = Math.round(segments * Math.min(1, eaten * 1.02));
      const order = Array.from({ length: segments }, (_unused, i) => i);
      // People eat round the fruit, so the scooped segments are neighbours.
      const start = Math.floor(random() * segments);
      const scooped = new Set(order.slice(0, gone).map((i) => (i + start) % segments));
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 128;
      const g = canvas.getContext('2d')!;
      // v = 0 is the centre (bottom of the canvas), v = 1 the outer rind.
      const pithBand = Math.round(128 * f.pith);
      g.fillStyle = '#f8f0d2';
      g.fillRect(0, 0, 720, 128);
      g.fillStyle = f.rind;
      g.fillRect(0, 0, 720, 5);
      const wide = 720 / segments;
      for (let i = 0; i < segments; i++) {
        const x0 = i * wide + 3, x1 = (i + 1) * wide - 3, out = scooped.has(i);
        const fill = g.createLinearGradient(0, pithBand, 0, 116);
        if (out) { fill.addColorStop(0, '#e6d6a8'); fill.addColorStop(1, '#b89f68'); }
        else if (topping === 'grilled') { fill.addColorStop(0, '#a85a1c'); fill.addColorStop(0.5, '#c9802a'); fill.addColorStop(1, '#7a3a12'); }
        else { fill.addColorStop(0, f.flesh); fill.addColorStop(1, f.deep); }
        g.fillStyle = fill;
        g.fillRect(x0, pithBand + 5, x1 - x0, 116 - pithBand - 5);
        if (!out) {
          // Juice vesicles: fine streaks running to the centre.
          for (let k = 0; k < 16; k++) {
            g.strokeStyle = a.fruit === 'blood' && random() > 0.5 ? 'rgba(60,5,20,0.5)' : random() > 0.5 ? 'rgba(255,255,255,0.28)' : 'rgba(90,20,10,0.14)';
            g.lineWidth = 1.5;
            const x = x0 + random() * (x1 - x0), y = pithBand + 8 + random() * 60;
            g.beginPath(); g.moveTo(x, y); g.lineTo(x + wobble(2), y + 10 + random() * 26); g.stroke();
          }
        } else {
          g.fillStyle = `rgba(${a.fruit === 'white' || a.fruit === 'pomelo' ? '200,180,90' : '200,90,60'},0.3)`;
          for (let k = 0; k < 4; k++) g.fillRect(x0 + random() * (x1 - x0 - 6), pithBand + 10 + random() * 80, 5, 8 + random() * 14);
        }
      }
      if (topping === 'grilled') for (let k = 0; k < 90; k++) { g.fillStyle = random() > 0.5 ? 'rgba(40,15,5,0.5)' : 'rgba(240,180,80,0.5)'; g.beginPath(); g.arc(random() * 720, pithBand + 6 + random() * 100, 2 + random() * 4, 0, Math.PI * 2); g.fill(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const dip = hollow ? R * 0.62 : mix(0.0015, 0.012, eaten) * (R / 0.056);
      const profile: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) { const t = i / 10; profile.push(new THREE.Vector2(Math.max(0.0001, t * (R - 0.0005)), -dip * Math.cos(t * Math.PI / 2) ** (hollow ? 0.7 : 1.5))); }
      const faceSkin = new THREE.MeshStandardMaterial({ color: '#d8d8d8', map: texture, roughness: topping === 'grilled' ? 0.3 : 0.38, side: THREE.DoubleSide });
      const face = group.mesh(new THREE.LatheGeometry(profile, 48), hollow ? new THREE.MeshStandardMaterial({ color: '#efe2bc', roughness: 0.8, side: THREE.DoubleSide }) : faceSkin, [0, R * squash, 0]);
      face.castShadow = false;
      const peak = R * squash - dip;
      if (!hollow) {
        if (topping === 'cherry') {
          group.ball([0.009, 0.0085, 0.009], [0, peak + 0.006, 0], new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.12, emissive: '#7a0a18', emissiveIntensity: 0.3 }), 14);
          group.rod([0, peak + 0.013, 0], [0.006, peak + 0.03, 0.003], 0.0007, group.material('#5a3a1c'));
        } else if (topping === 'heap') {
          group.mesh(new THREE.ConeGeometry(R * 0.45, R * 0.22, 20), sugarSkin, [0, peak + R * 0.1, 0]);
        } else if (topping === 'mint') {
          const leaf = group.material('#3f9a4a', { roughness: 0.6 });
          for (let i = 0; i < 4; i++) { const b = group.ball([0.011, 0.002, 0.007], [Math.sin(i * 1.6) * 0.009, peak + 0.006 + i * 0.0025, Math.cos(i * 1.6) * 0.009], leaf, 10); b.rotation.set(0.3, i * 1.6, 0.3); }
        }
      }
      group.root.position.set(x, y + R * 0.05, z);
      group.root.rotation.set(0.24 + wobble(0.04), random() * 6, wobble(0.05));
      s.root.add(group.root);
      return R * squash - dip;
    };
    const faceY = top + halfAt(0, top, 0, a.eaten, a.topping);

    // The serrated spoon.
    const spoon = new Sculpture(context);
    const bowlShape = new THREE.Shape();
    bowlShape.moveTo(0, -0.022);
    for (let i = 1; i <= 8; i++) bowlShape.lineTo(0.0085 * Math.sin((i / 8) * Math.PI) + (i % 2 ? 0.0012 : 0), -0.022 + (i / 8) * 0.044 * 0.8);
    bowlShape.lineTo(0, 0.02);
    for (let i = 7; i >= 1; i--) bowlShape.lineTo(-0.0085 * Math.sin((i / 8) * Math.PI) - (i % 2 ? 0.0012 : 0), -0.022 + (i / 8) * 0.044 * 0.8);
    bowlShape.closePath();
    const blade = spoon.mesh(new THREE.ExtrudeGeometry(bowlShape, { depth: 0.0012, bevelEnabled: false }), steel);
    blade.rotation.x = Math.PI / 2;
    spoon.rod([0, 0, 0.018], [0, 0.003, 0.1], 0.0024, steel, 0.002);
    spoon.ball([0.0055, 0.002, 0.011], [0, 0.003, 0.105], steel, 10);
    if (a.eaten > 0.08 && a.eaten < 0.9) {
      spoon.root.position.set(R * 0.35, faceY + 0.006, R * 0.3);
      spoon.root.rotation.set(-0.5, 0.8 + wobble(0.6), 0, 'YXZ');
    } else {
      const ang = 0.9 + wobble(0.3);
      spoon.root.position.set(Math.sin(ang) * (dr + 0.03), 0.003, Math.cos(ang) * (dr + 0.03));
      spoon.root.rotation.y = ang + Math.PI / 2 + wobble(0.3);
    }
    s.root.add(spoon.root);
    // Pips and scraps pushed to the edge of the plate.
    if (a.eaten > 0.15 && a.dish !== 'coupe') {
      const pips = Math.round(a.eaten * 6 + random() * 2);
      for (let i = 0; i < pips; i++) { const ang = 3.6 + wobble(0.5), rad = dr * 0.72; s.ball([0.0035, 0.0022, 0.0055], [Math.sin(ang) * rad, top + 0.004, Math.cos(ang) * rad], s.material('#efe3b8'), 8).rotation.y = random() * 3; }
      s.ball([0.02, 0.0008, 0.014], [Math.sin(2.4) * dr * 0.6, top + 0.0012, Math.cos(2.4) * dr * 0.6], new THREE.MeshStandardMaterial({ color: f.flesh, roughness: 0.1, transparent: true, opacity: 0.6 }), 12).castShadow = false;
    }

    // Sugar.
    const vx = -dr - 0.045, vz = -0.005;
    if (a.vessel === 'bowl' || a.vessel === 'cubes') {
      s.lathe([[0, 0.006], [0.022, 0.006], [0.024, 0], [0.03, 0], [0.032, 0.008], [0.044, 0.03], [0.046, 0.052], [0.043, 0.052], [0.04, 0.03], [0, 0.012]], china, [vx, 0, vz]);
      s.ring(0.0455, 0.0012, [vx, 0.048, vz], s.material('#c9a544', { metalness: 0.8, roughness: 0.3 })).rotation.x = Math.PI / 2;
      if (a.vessel === 'bowl') {
        s.ball([0.04, 0.012, 0.04], [vx, 0.042, vz], sugarSkin, 16);
        s.rod([vx + 0.01, 0.045, vz], [vx + 0.05, 0.085, vz + 0.03], 0.002, steel);
        s.ball([0.005, 0.002, 0.008], [vx + 0.052, 0.087, vz + 0.032], steel, 8);
      } else {
        for (let i = 0; i < 9; i++) s.box([0.014, 0.014, 0.014], [vx + wobble(0.022), 0.044 + (i % 3) * 0.007, vz + wobble(0.022)], sugarSkin).rotation.set(wobble(0.6), random() * 3, wobble(0.6));
        for (const side of [-1, 1]) s.rod([vx + 0.06, 0.004, vz + 0.045 + side * 0.006], [vx + 0.075, 0.004, vz + 0.115 + side * 0.012], 0.002, steel);
        s.ball([0.005, 0.004, 0.005], [vx + 0.06, 0.004, vz + 0.043], steel, 8);
      }
    } else if (a.vessel === 'pourer') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#e9f3f0', transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, flatShading: true });
      const jar = s.mesh(new THREE.LatheGeometry([[0, 0.002], [0.03, 0.002], [0.033, 0.01], [0.03, 0.1], [0.022, 0.118]].map(([x, y]) => new THREE.Vector2(x, y)), 10), glass, [vx, 0, vz]);
      jar.castShadow = true;
      s.cylinder(0.027, 0.029, mix(0.03, 0.085, random()), [vx, 0.05, vz], sugarSkin, 10).position.y = 0.045;
      s.cylinder(0.008, 0.024, 0.022, [vx, 0.129, vz], steel, 16);
      s.rod([vx, 0.138, vz], [vx + 0.012, 0.15, vz + 0.006], 0.005, steel, 0.004);
    } else if (a.vessel === 'sachets') {
      const paper = s.material('#fbf8ee', { roughness: 0.9 });
      const stripe = s.material(mood.cheer > 0.5 ? '#e85d4a' : '#5a7aa8');
      for (let i = 0; i < 4; i++) {
        const sx = vx + 0.02 + wobble(0.03), sz = vz + 0.02 + wobble(0.04), turn = random() * 3;
        s.box([0.03, 0.004, 0.05], [sx, 0.002 + i * 0.0025, sz], paper).rotation.y = turn;
        s.box([0.03, 0.0042, 0.008], [sx, 0.0021 + i * 0.0025, sz], stripe).rotation.y = turn;
      }
      const torn = s.box([0.03, 0.002, 0.03], [vx + 0.07, 0.001, vz + 0.07], paper);
      torn.rotation.y = 0.8;
    }
    const grains = a.vessel === 'none' && a.topping !== 'heap' ? Math.round(a.sugar * 20) : Math.round(a.sugar ** 1.5 * 900);
    if (grains > 0) {
      const points = Array.from({ length: grains }, () => {
        // Along the path from the vessel to the fruit, then widening with the amount.
        const t = random(), spread = 0.012 + a.sugar * 0.05;
        const x = mix(vx + 0.045, 0.01, t) + wobble(spread), z = mix(vz + 0.02, 0.03, t) + wobble(spread) + Math.sin(t * 3) * 0.02;
        const rad = Math.hypot(x, z);
        const y = rad < R * 0.95 ? faceY + 0.001 + (rad < R * 0.5 && a.eaten > 0.9 ? -0.01 : 0) : rad < dr && a.dish !== 'coupe' ? top + 0.002 + (rad > dr * 0.7 ? (rad - dr * 0.7) / (dr * 0.3) * 0.009 : 0) : rad < dr ? -1 : 0.0006;
        return { at: [x, y, z] as const, size: 0.0007 + random() * 0.0007 };
      }).filter((p) => p.at[1] >= 0);
      if (points.length) s.scatter(new THREE.BoxGeometry(1, 1, 1), sugarSkin, points);
      if (a.sugar > 0.75) s.ball([0.03, 0.004, 0.022], [vx + 0.06, 0.001, vz + 0.035], sugarSkin, 14);
    }

    // Company.
    const cx = dr * 0.55 + 0.07, cz = -dr * 0.7 - 0.015;
    if (a.company === 'half') {
      halfAt(cx - 0.01, 0, cz, 0, 'none');
    } else if (a.company === 'crispbread') {
      s.lathe([[0, 0.005], [0.05, 0.005], [0.072, 0.012], [0.074, 0.0105], [0.05, 0], [0, 0]], china, [cx, 0, cz]);
      const rye = s.material('#a8743c', { roughness: 1 });
      for (let i = 0; i < 2; i++) {
        const slab = s.box([0.05, 0.005, 0.085], [cx - 0.012 + i * 0.016, 0.009 + i * 0.006, cz + i * 0.008], rye);
        slab.rotation.y = 0.3 + i * 0.5;
      }
      s.ball([0.016, 0.007, 0.013], [cx + 0.03, 0.01, cz + 0.03], s.material('#fbfaf2', { roughness: 0.7 }), 10);
    } else if (a.company === 'cigarette') {
      const glass = new THREE.MeshPhysicalMaterial({ color: mood.cheer > 0.5 ? '#e8c060' : '#9ab8a8', transparent: true, opacity: 0.55, roughness: 0.08, flatShading: true });
      const tray = s.mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.018, 8), glass, [cx, 0.009, cz]);
      tray.castShadow = true;
      s.cylinder(0.034, 0.034, 0.002, [cx, 0.0175, cz], s.material('#8a8a86', { roughness: 1 }), 16);
      const cig = new Sculpture(context);
      cig.cylinder(0.0038, 0.0038, 0.05, [0, 0, 0], cig.material('#fbfaf5', { roughness: 0.9 }), 10).rotation.z = Math.PI / 2;
      cig.cylinder(0.0039, 0.0039, 0.02, [-0.035, 0, 0], cig.material('#c98a3c', { roughness: 0.8 }), 10).rotation.z = Math.PI / 2;
      cig.cylinder(0.0036, 0.003, 0.012, [0.031, 0, 0], new THREE.MeshStandardMaterial({ color: '#77736c', emissive: '#ff5a1c', emissiveIntensity: 0.9, roughness: 1 }), 10).rotation.z = Math.PI / 2;
      cig.root.position.set(cx + 0.012, 0.024, cz + 0.02);
      cig.root.rotation.set(0, 0.7, 0.14);
      s.root.add(cig.root);
      const smoke = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, depthWrite: false });
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 12; i++) pts.push([cx + 0.03 + Math.sin(i * 0.9) * 0.004 * i * 0.4, 0.03 + i * 0.012, cz + 0.002 + Math.cos(i * 0.7) * 0.003 * i * 0.4]);
      s.tube(pts, 0.0028, smoke).castShadow = false;
    } else if (a.company === 'coffee') {
      s.lathe([[0, 0.004], [0.036, 0.004], [0.06, 0.01], [0.061, 0.0085], [0.037, 0], [0, 0]], china, [cx, 0, cz]);
      s.lathe([[0, 0.007], [0.02, 0.007], [0.026, 0.014], [0.038, 0.05], [0.04, 0.062], [0.0375, 0.062], [0.0355, 0.05], [0.024, 0.016], [0, 0.012]], china, [cx, 0, cz]);
      s.ring(0.014, 0.0035, [cx + 0.048, 0.038, cz], china).rotation.y = 0;
      s.cylinder(0.0365, 0.0365, 0.001, [cx, 0.054, cz], new THREE.MeshStandardMaterial({ color: '#1e120a', roughness: 0.12 }), 24);
    }

    return s.finish();
  },
});
