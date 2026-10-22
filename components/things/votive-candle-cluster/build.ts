import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const IMAGERY = {
  guadalupe: 'The Virgin in a teal cloak inside a blaze of golden rays.',
  heart: 'A sacred heart, red, crowned with flame and ringed with thorns.',
  saint: 'A haloed saint in a brown robe, hands raised.',
  cross: 'A plain cross with rays on white glass, churchly and spare.',
  plain: 'No pictures: plain glass in jewel colours, red, blue, green and amber.',
  muerte: 'A hooded skeleton with a scythe on purple and black, a folk saint of death.',
} as const;

const paint: Record<Exclude<keyof typeof IMAGERY, 'plain'>, (g: Ctx) => string> = {
  guadalupe(g) {
    g.fillStyle = '#f2b61e'; g.beginPath();
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, r = i % 2 ? 1 : 0.8; g.lineTo(128 + Math.cos(a) * 62 * r, 132 + Math.sin(a) * 100 * r); }
    g.fill();
    g.fillStyle = '#17807a'; g.beginPath(); g.moveTo(128, 52); g.quadraticCurveTo(178, 120, 164, 214); g.lineTo(92, 214); g.quadraticCurveTo(78, 120, 128, 52); g.fill();
    g.fillStyle = '#d9577c'; g.beginPath(); g.moveTo(128, 96); g.lineTo(150, 214); g.lineTo(106, 214); g.fill();
    g.fillStyle = '#c99a72'; g.beginPath(); g.arc(128, 84, 13, 0, 7); g.fill();
    g.fillStyle = '#20201c'; g.beginPath(); g.arc(128, 226, 24, 0, Math.PI); g.fill();
    return '#f5ecd8';
  },
  heart(g) {
    g.strokeStyle = '#f2b61e'; g.lineWidth = 5;
    for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 58, 140 + Math.sin(a) * 58); g.lineTo(128 + Math.cos(a) * 96, 140 + Math.sin(a) * 96); g.stroke(); }
    g.fillStyle = '#f28a1c'; g.beginPath(); g.moveTo(104, 96); g.quadraticCurveTo(110, 50, 128, 30); g.quadraticCurveTo(150, 54, 152, 96); g.fill();
    g.fillStyle = '#c8141e'; g.beginPath(); g.moveTo(128, 208); g.bezierCurveTo(40, 150, 76, 70, 128, 108); g.bezierCurveTo(180, 70, 216, 150, 128, 208); g.fill();
    g.strokeStyle = '#3a2412'; g.lineWidth = 6; g.setLineDash([10, 6]); g.beginPath(); g.ellipse(128, 146, 52, 14, -0.15, 0, 7); g.stroke(); g.setLineDash([]);
    return '#f5ecd8';
  },
  saint(g) {
    g.fillStyle = '#f2c230'; g.beginPath(); g.arc(128, 70, 34, 0, 7); g.fill();
    g.fillStyle = '#6b4526'; g.beginPath(); g.moveTo(128, 78); g.quadraticCurveTo(186, 110, 176, 226); g.lineTo(80, 226); g.quadraticCurveTo(70, 110, 128, 78); g.fill();
    g.fillStyle = '#d0a57c'; g.beginPath(); g.arc(128, 72, 17, 0, 7); g.fill();
    g.beginPath(); g.arc(98, 120, 9, 0, 7); g.arc(158, 120, 9, 0, 7); g.fill();
    g.fillStyle = '#f1e6c8'; g.fillRect(122, 130, 12, 96);
    return '#dfeaf0';
  },
  cross(g) {
    g.strokeStyle = '#d9a521'; g.lineWidth = 4;
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(128 + Math.cos(a) * 40, 118 + Math.sin(a) * 40); g.lineTo(128 + Math.cos(a) * 92, 118 + Math.sin(a) * 92); g.stroke(); }
    g.fillStyle = '#7a1a22'; g.fillRect(114, 44, 28, 176); g.fillRect(76, 92, 104, 28);
    return '#f7f3e8';
  },
  muerte(g) {
    g.fillStyle = '#17131c'; g.beginPath(); g.moveTo(128, 34); g.quadraticCurveTo(196, 90, 184, 230); g.lineTo(72, 230); g.quadraticCurveTo(60, 90, 128, 34); g.fill();
    g.fillStyle = '#efe9da'; g.beginPath(); g.ellipse(128, 96, 26, 30, 0, 0, 7); g.fill(); g.fillRect(114, 116, 28, 16);
    g.fillStyle = '#17131c'; g.beginPath(); g.arc(117, 94, 8, 0, 7); g.arc(139, 94, 8, 0, 7); g.fill();
    g.strokeStyle = '#d9a521'; g.lineWidth = 6; g.beginPath(); g.moveTo(196, 236); g.lineTo(196, 40); g.stroke();
    g.beginPath(); g.moveTo(196, 44); g.quadraticCurveTo(150, 22, 122, 46); g.stroke();
    return '#6a3a9a';
  },
};
const JEWELS = ['#c81e2a', '#1f56b8', '#1f8a4a', '#e09a1a', '#7a35b0', '#f3ead8'];
const WAX = { white: ['#f6efdc'], cream: ['#f1dfb2', '#f6efdc'], red: ['#c4222c', '#a81a22'], purple: ['#6a3a9a', '#8a5ab8', '#f6efdc'], rainbow: ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a', '#f6efdc'] } as const;

export default defineThing({
  questions: {
    count: choice('How many candles are gathered?', {
      lone: 'One tall glass candle with a single tea light for company.',
      few: 'Three or four, a private prayer.',
      cluster: 'A dozen or so of mixed heights, a family shrine.',
      crowd: 'A dense crowd of flames, a public vigil.',
    }),
    imagery: choice('What is printed on the tall glass candles?', IMAGERY),
    lit: choice('Are they burning?', {
      all: 'Every one alight.',
      most: 'Most alight, a few gone out.',
      last: 'All dark but one last flame.',
      guttered: 'All burned out or blown out, thin smoke rising from the wicks.',
      unlit: 'Not yet lit: clean wicks, waiting for the match.',
    }),
    burn: score('How far have they burned down?', ['Brand new, full to the brim', 'An hour in', 'Half gone, wax starting to pool', 'Stubs drowning in spilled wax']),
    draught: score('How steady are the flames?', ['Perfectly still, upright teardrops', 'Wavering a little', 'Leaning hard in a draught, close to going out']),
    wax: choice('What colour are the loose candles and tea lights?', {
      white: 'All white.',
      cream: 'Beeswax cream and ivory.',
      red: 'Deep red.',
      purple: 'Mourning purple with a few white.',
      rainbow: 'Every colour, bought one at a time.',
    }),
    stand: choice('What do they stand on?', {
      bare: 'Directly on the surface.',
      tray: 'A hammered tin tray that catches the wax.',
      steps: 'A small two-step wooden riser, tall candles at the back.',
      bricks: 'A couple of rough bricks, a roadside shrine.',
    }),
    left: choice('What has been left among the candles?', {
      nothing: 'Nothing.',
      matches: 'A matchbox and a scatter of spent matches.',
      coins: 'A few coins and a folded note.',
      flowers: 'Marigold heads tucked between the glasses.',
      card: 'A small prayer card propped against a candle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = { lone: [1, 1, 0], few: [2, 1, 1], cluster: [4, 5, 3], crowd: [8, 9, 5] }[a.count].map((v, i) => (a.count === 'lone' ? v : v + Math.round(mood.density * (i === 1 ? 2 : 1))));
    const waxes = WAX[a.wax];
    const burn = Math.min(1, a.burn * 0.9 + mood.wear * 0.15);
    const brightness = mix(0.5, 1, mood.warmth * 0.5 + mood.cheer * 0.5);

    // Stand.
    const spread = { lone: 0.07, few: 0.1, cluster: 0.16, crowd: 0.23 }[a.count];
    let floorY = 0;
    const lift = (z: number) => (a.stand === 'steps' && z < -0.01 ? 0.045 : 0) + floorY;
    if (a.stand === 'tray') {
      s.lathe([[0, 0], [spread * 1.45, 0], [spread * 1.6, 0.014], [spread * 1.57, 0.014], [spread * 1.43, 0.005], [0, 0.005]], s.material('#aab0b0', { metalness: 0.75, roughness: 0.38 })).scale.z = 0.8;
      floorY = 0.005;
    } else if (a.stand === 'steps') {
      const wood = s.material('#7a5232', { roughness: 0.8 });
      s.box([spread * 3, 0.02, spread * 2.5], [0, 0.01, 0], wood);
      s.box([spread * 3, 0.045, spread * 1.25], [0, 0.0425, -spread * 0.635], wood);
      floorY = 0.02;
    } else if (a.stand === 'bricks') {
      const brick = s.material('#a9553c', { roughness: 0.95 });
      const w = Math.max(0.22, spread * 1.45);
      for (const side of a.count === 'lone' ? [0] : [-1, 1]) { const b = s.box([w, 0.06, Math.max(0.11, spread * 2.3)], [side * (w / 2 + 0.004), 0.03, 0], brick); b.rotation.y = (random() - 0.5) * 0.06; }
      floorY = 0.06;
    }

    // Placement: tall at the back, small in front.
    const placed: { x: number; z: number; r: number }[] = [];
    const place = (r: number, back: number) => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const ang = random() * Math.PI * 2, d = Math.sqrt(random()) * (spread * (1 + attempt / 60));
        const x = Math.cos(ang) * d * 1.25, z = Math.sin(ang) * d * 0.75 - back * spread * 0.45;
        if (a.stand === 'steps' && Math.abs(z + 0.01) < r) continue;
        if (placed.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + r + 0.004)) { placed.push({ x, z, r }); return { x, z }; }
      }
      const x = (random() - 0.5) * spread * 3, z = (random() - 0.5) * spread;
      placed.push({ x, z, r });
      return { x, z };
    };

    const total = n[0] + n[1] + n[2];
    const lastLit = Math.floor(random() * total);
    let index = 0;
    const isLit = () => {
      const i = index++;
      if (a.lit === 'all') return true;
      if (a.lit === 'most') return random() > 0.28 || i === lastLit;
      if (a.lit === 'last') return i === lastLit;
      return false;
    };

    const flameGeo = new THREE.LatheGeometry([[0, 0], [0.55, 0.12], [0.7, 0.35], [0.5, 0.7], [0.16, 1.15], [0, 1.45]].map(([x, y]) => new THREE.Vector2(x, y)), 12);
    const flameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb02e').multiplyScalar(brightness + 0.1) });
    const coreMat = new THREE.MeshBasicMaterial({ color: '#fff3c4' });
    const haloMat = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#8f8f96', transparent: true, opacity: 0.18, depthWrite: false });
    const wickMat = s.material('#1c1612');
    const flames: { group: THREE.Group; phase: number; size: number }[] = [];
    const lean = a.draught * 0.75;
    const flame = (x: number, y: number, z: number, size: number, lit: boolean) => {
      s.rod([x, y - 0.002, z], [x + 0.001, y + 0.006, z], 0.0012, wickMat);
      if (!lit) {
        if (a.lit === 'guttered' || (a.lit !== 'unlit' && random() < 0.5)) {
          const pts: V3[] = [];
          const drift = (random() - 0.5) * 0.03 + lean * 0.05;
          for (let i = 0; i < 7; i++) pts.push([x + Math.sin(i * 1.1 + random()) * 0.006 * i * 0.4 + drift * i / 6, y + 0.008 + i * 0.022, z + Math.cos(i * 0.9) * 0.004 * i * 0.4]);
          const wisp = s.tube(pts, 0.0022, smokeMat);
          wisp.castShadow = false;
        }
        return;
      }
      const group = new THREE.Group();
      group.position.set(x, y + 0.004, z);
      const outer = new THREE.Mesh(flameGeo, flameMat); outer.scale.setScalar(size);
      const inner = new THREE.Mesh(flameGeo, coreMat); inner.scale.setScalar(size * 0.5); inner.position.y = size * 0.12;
      const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 3.2, 12, 8), haloMat); halo.position.y = size * 0.7;
      group.add(outer, inner, halo);
      group.rotation.z = -lean * mix(0.7, 1.2, random());
      group.scale.y = mix(1, 0.75, a.draught);
      s.root.add(group);
      flames.push({ group, phase: random() * 10, size: group.scale.y });
    };
    const pool = (x: number, y: number, z: number, r: number, mat: THREE.Material) => {
      const blobs = 2 + Math.floor(random() * 3);
      for (let i = 0; i < blobs; i++) {
        const ang = random() * 6.28, d = r * mix(0.5, 1.2, random());
        s.ball([r * mix(0.5, 1, random()), 0.003, r * mix(0.5, 1, random())], [x + Math.cos(ang) * d, y + 0.001, z + Math.sin(ang) * d], mat, 12).castShadow = false;
      }
    };

    // Tall glass prayer candles.
    const rimMat = s.material('#e9eef0', { roughness: 0.15, metalness: 0.1 });
    const tallSpots: { x: number; z: number; y: number }[] = [];
    for (let i = 0; i < n[0]; i++) {
      const { x, z } = place(0.033, 1);
      const y0 = lift(z), h = mix(0.19, 0.22, random()), r = 0.03;
      const lit = isLit();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const g = canvas.getContext('2d')!;
      let glass: string;
      if (a.imagery === 'plain') { glass = JEWELS[(i + Math.floor(random() * 2)) % JEWELS.length]; g.fillStyle = glass; g.fillRect(0, 0, 256, 256); }
      else {
        g.fillStyle = '#f4ecda'; g.fillRect(0, 0, 256, 256);
        const tint = paint[a.imagery](g);
        g.globalCompositeOperation = 'destination-over'; g.fillStyle = tint; g.fillRect(0, 0, 256, 256); g.globalCompositeOperation = 'source-over';
        glass = tint;
        g.fillStyle = a.imagery === 'muerte' ? '#d9a521' : '#a81a22'; g.fillRect(0, 0, 256, 10); g.fillRect(0, 244, 256, 12);
      }
      // Soot and wax level darken the glass above the wax line.
      const level = mix(0.9, 0.12, Math.min(1, burn * mix(0.75, 1.2, random())));
      g.fillStyle = `rgba(30,22,16,${0.1 + burn * 0.22})`; g.fillRect(0, 0, 256, 256 * (1 - level));
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const body = s.mesh(new THREE.CylinderGeometry(r, r * 0.97, h, 28, 1, true), new THREE.MeshStandardMaterial({ map, roughness: 0.22, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: lit ? 0.5 * brightness : 0.04 }), [x, y0 + h / 2, z]);
      body.rotation.y = Math.PI + (random() - 0.5) * 0.9;
      s.cylinder(r * 0.97, r * 0.97, 0.004, [x, y0 + 0.002, z], rimMat, 28);
      s.ring(r, 0.0022, [x, y0 + h, z], rimMat).rotation.x = Math.PI / 2;
      const waxY = y0 + h * level;
      const waxColour = a.imagery === 'plain' ? '#f3ead8' : waxes[Math.floor(random() * waxes.length)];
      s.cylinder(r * 0.96, r * 0.96, 0.004, [x, waxY, z], s.material(waxColour, { roughness: 0.4, emissive: '#ffb347', emissiveIntensity: lit ? 0.7 : 0 }), 24);
      flame(x, waxY + 0.003, z, 0.0085, lit);
      tallSpots.push({ x, z, y: y0 });
      void glass;
    }

    // Bare pillar stubs with drips.
    for (let i = 0; i < n[2]; i++) {
      const { x, z } = place(0.026, 0.2);
      const y0 = lift(z), r = mix(0.016, 0.023, random());
      const h = mix(0.15, 0.025, Math.min(1, burn * mix(0.7, 1.25, random())));
      const colour = waxes[Math.floor(random() * waxes.length)];
      const lit = isLit();
      const mat = s.material(colour, { roughness: 0.45, emissive: '#ff9a3a', emissiveIntensity: lit ? 0.22 * brightness : 0 });
      s.cylinder(r * 0.94, r, h, [x, y0 + h / 2, z], mat, 20);
      const drips = Math.round(mix(1, 7, burn));
      for (let d = 0; d < drips; d++) {
        const ang = random() * 6.28, len = Math.min(h * 0.9, mix(0.01, 0.06, random()));
        s.rod([x + Math.cos(ang) * r * 0.97, y0 + h - 0.002, z + Math.sin(ang) * r * 0.97], [x + Math.cos(ang) * r * 1.02, y0 + h - len, z + Math.sin(ang) * r * 1.02], 0.0028, mat, 0.004);
      }
      if (burn > 0.3) pool(x, y0, z, r * mix(1, 2.2, burn), mat);
      flame(x, y0 + h, z, 0.008, lit);
    }

    // Tea lights.
    const tin = s.material('#cfd4d6', { metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < n[1]; i++) {
      const { x, z } = place(0.022, -0.9);
      const y0 = lift(z), lit = isLit();
      const colour = waxes[Math.floor(random() * waxes.length)];
      s.cylinder(0.0195, 0.0185, 0.016, [x, y0 + 0.008, z], tin, 20);
      const level = mix(0.015, 0.006, burn);
      s.cylinder(0.018, 0.018, 0.003, [x, y0 + level, z], s.material(colour, { roughness: 0.3, emissive: '#ffb347', emissiveIntensity: lit ? 0.6 : 0 }), 20);
      if (burn > 0.75 && random() < 0.5) pool(x, y0, z, 0.02, s.material(colour, { roughness: 0.4 }));
      flame(x, y0 + level + 0.002, z, 0.0065, lit);
    }

    // Left behind.
    const front = spread * 0.75 + 0.05;
    if (a.left === 'matches') {
      const box = s.box([0.052, 0.014, 0.036], [spread * 0.9, floorY + 0.007, front * 0.8], s.material('#c4262b'));
      box.rotation.y = 0.5;
      s.box([0.046, 0.0145, 0.03], [spread * 0.9, floorY + 0.0075, front * 0.8], s.material('#f2d24a')).rotation.y = 0.5;
      for (let i = 0; i < 5 + Math.floor(random() * 5); i++) {
        const x = (random() - 0.5) * spread * 2, z = front * mix(0.7, 1.05, random()), ang = random() * 6.28;
        s.rod([x, floorY + 0.002, z], [x + Math.cos(ang) * 0.04, floorY + 0.002, z + Math.sin(ang) * 0.04], 0.0011, s.material('#d8c49a'));
        s.ball([0.002, 0.002, 0.002], [x, floorY + 0.002, z], wickMat, 6);
      }
    } else if (a.left === 'coins') {
      const brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 }), silver = s.material('#c4c8ca', { metalness: 0.8, roughness: 0.3 });
      for (let i = 0; i < 5 + Math.floor(random() * 6); i++) s.cylinder(0.011, 0.011, 0.002, [(random() - 0.5) * spread * 2, floorY + 0.001 + (i % 3) * 0.002, front * mix(0.7, 1.05, random())], random() < 0.5 ? brass : silver, 14);
      const note = s.box([0.06, 0.004, 0.04], [-spread * 0.8, floorY + 0.003, front * 0.85], s.material('#f1ead2'));
      note.rotation.y = -0.4;
    } else if (a.left === 'flowers') {
      const petal = s.material('#ee7a0c', { flatShading: true, emissive: '#b84a00', emissiveIntensity: 0.15 });
      for (let i = 0; i < 6 + Math.floor(random() * 6); i++) {
        const { x, z } = place(0.02, random() * 2 - 1.2);
        const bloom = s.mesh(new THREE.IcosahedronGeometry(mix(0.018, 0.025, random()), 1), petal, [x, lift(z) + 0.014, z]);
        bloom.scale.y = 0.7; bloom.rotation.set(random(), random() * 6, random());
      }
    } else if (a.left === 'card' && tallSpots.length) {
      const t = tallSpots[0];
      const card = s.label('ORA POR', 0.06, 0.085, [t.x + 0.012, t.y + 0.04, t.z + 0.05], '#7a1a22', '#f3e7c4');
      card.rotation.x = -0.32; card.rotation.y = 0.15;
    }

    const speed = mix(4, 16, mood.energy), amp = mix(0.04, 0.4, a.draught) * mix(0.6, 1.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const f of flames) {
          const w = Math.sin(time * speed + f.phase) * 0.6 + Math.sin(time * speed * 2.7 + f.phase * 1.7) * 0.4;
          f.group.scale.y = f.size * (1 + w * amp);
          f.group.rotation.x = w * amp * 0.4;
        }
      },
    });
  },
});
