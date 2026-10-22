import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const PALETTES = {
  'ocean-blue': ['#2f7fd1', '#f4f4ee', '#58b4e6'],
  rainbow: ['#e2412f', '#f4c62c', '#2f86d6'],
  'bubblegum': ['#e86aa0', '#f7efe9', '#8f6fd0'],
  'lime-lemon': ['#55b947', '#f5e04a', '#f08a2a'],
  'faded-aqua': ['#a9d6d6', '#eef2ea', '#bfe0cf'],
} as const;

export default defineThing({
  questions: {
    state: choice('What state is the pool in?', {
      fresh: 'Freshly filled this morning: taut rings, clear blue water, not yet touched.',
      'in-use': 'In use right now: water sloshing, splashes in the air, the grass around it soaked dark.',
      forgotten: 'Forgotten for a week: rings sagging, water gone green, leaves and drowned insects on the surface.',
      drained: 'Tipped out and half-deflated, propped on its side to dry.',
    }),
    colours: choice('What colours are the rings?', {
      'ocean-blue': 'Blue and white, the standard seaside pool.',
      rainbow: 'Red, yellow and blue, one colour per ring.',
      bubblegum: 'Pink and lilac.',
      'lime-lemon': 'Lime, lemon and orange, like boiled sweets.',
      'faded-aqua': 'Pale aqua bleached nearly colourless by sun.',
    }),
    print: choice('What is printed on the vinyl?', {
      fish: 'Cartoon fish swimming nose to tail.',
      starfish: 'Starfish and shells.',
      dots: 'Big polka dots.',
      waves: 'Wavy stripes.',
      plain: 'Nothing; plain rings.',
    }),
    rings: choice('How is it built?', {
      three: 'Three stacked rings, knee deep.',
      two: 'Two rings, ankle deep.',
      one: 'A single fat ring, a toddler puddle.',
    }),
    size: score('How big is it?', ['A toddler pool one child fills', 'Room for two', 'A family pool that takes an hour to fill']),
    floating: choice('What floats in it, or lies in it if dry?', {
      boat: 'A toy sailing boat.',
      duck: 'A yellow rubber duck.',
      ball: 'A striped beach ball.',
      bucket: 'A seaside bucket and spade.',
      nothing: 'Nothing but the water.',
    }),
    beside: choice('What lies beside it on the grass?', {
      hose: 'The garden hose, still looped over the rim.',
      towel: 'A striped towel spread out and abandoned.',
      pump: 'The foot pump that blew it up.',
      'flip-flops': 'A small pair of flip-flops.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [p0, p1, p2] = PALETTES[a.colours];
    const count = { three: 3, two: 2, one: 1 }[a.rings];
    const R = mix(0.5, 1.05, a.size);
    const r = (a.rings === 'one' ? 0.14 : 0.085) * mix(0.9, 1.15, a.size);
    const sag = a.state === 'forgotten' ? mix(0.75, 0.5, mood.wear) : a.state === 'drained' ? 0.4 : 1;
    const pool = new THREE.Group();
    s.root.add(pool);
    const put = <T extends THREE.Object3D>(mesh: T) => { pool.add(mesh); return mesh; };

    const fishShape = (g: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string, flip: number) => {
      g.save(); g.translate(x, y); g.scale(flip * size, size);
      g.fillStyle = colour;
      g.beginPath(); g.ellipse(0, 0, 1, 0.55, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-0.8, 0); g.lineTo(-1.6, -0.6); g.lineTo(-1.6, 0.6); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0.5, -0.12, 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#16202a'; g.beginPath(); g.arc(0.55, -0.12, 0.09, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    const motif = (g: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string, index: number) => {
      if (a.print === 'fish') fishShape(g, x, y, size, colour, index % 2 ? -1 : 1);
      else if (a.print === 'starfish') {
        g.fillStyle = colour; g.beginPath();
        for (let k = 0; k < 10; k++) { const rad = k % 2 ? size * 0.45 : size * 1.1, ang = k / 10 * Math.PI * 2 + index; g.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad); }
        g.fill();
      } else if (a.print === 'dots') { g.fillStyle = colour; g.beginPath(); g.arc(x, y, size * 0.9, 0, Math.PI * 2); g.fill(); }
    };
    const inks = ['#f08a2a', '#e2412f', '#f4c62c', '#2f86d6', '#3aa66a'];
    const ringTexture = (base: string) => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
      const g = canvas.getContext('2d')!;
      g.fillStyle = base; g.fillRect(0, 0, 512, 128);
      if (a.print === 'waves') {
        g.strokeStyle = p0; g.lineWidth = 12;
        for (const y0 of [34, 78]) { g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, y0 + Math.sin(x / 512 * Math.PI * 8) * 12); g.stroke(); }
      } else if (a.print !== 'plain') for (let i = 0; i < 4; i++) motif(g, 64 + i * 128, 52, 24, inks[i % inks.length], i);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(Math.max(3, Math.round(R * 5)), 1);
      // Torus tube v starts on the outer equator; shift so the print faces outward and upward.
      texture.offset.y = 0.62;
      return texture;
    };
    const fade = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#d9ddd2'), mood.wear * 0.45);
    const vinyl = (hex: string, printed: boolean) => new THREE.MeshStandardMaterial({ color: printed ? fade('#ffffff') : fade(hex), map: printed ? ringTexture(hex) : null, roughness: mix(0.22, 0.6, mood.wear), metalness: 0.02 });

    // Rings, with seam valves and a slow sag as they lose air.
    const ringColours = count === 3 ? [p0, p1, p2] : count === 2 ? [p0, p1] : [p1];
    const printedIndex = count === 1 ? 0 : 1;
    let top = 0;
    ringColours.forEach((colour, index) => {
      const squash = index === 0 ? mix(1, sag, 0.4) : sag * (1 - (a.state === 'forgotten' ? index * 0.08 : 0));
      const ring = put(new THREE.Mesh(new THREE.TorusGeometry(R, r, 14, 56), vinyl(colour, index === printedIndex && a.print !== 'plain')));
      ring.rotation.x = Math.PI / 2;
      ring.scale.z = squash;
      ring.position.y = top + r * squash;
      if (a.state === 'forgotten' && index > 0) { ring.rotation.x += (random() - 0.5) * 0.05; ring.rotation.y = (random() - 0.5) * 0.05; }
      ring.castShadow = ring.receiveShadow = true;
      top += r * squash * 1.78;
    });
    const rim = top + r * 0.2;
    const valve = put(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8), s.material('#f2f2ee')));
    valve.position.set(R + r * 0.95, r, 0); valve.rotation.z = Math.PI / 2;

    // Floor with the print, seen dry or through the water.
    const inner = R - r * 0.75;
    const surface = (wet: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const g = canvas.getContext('2d')!;
      const murk = a.state === 'forgotten';
      const grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
      if (!wet) { grad.addColorStop(0, '#f1f5f4'); grad.addColorStop(1, '#cfe4ea'); }
      else if (murk) { grad.addColorStop(0, '#7f9a52'); grad.addColorStop(1, '#55703a'); }
      else { grad.addColorStop(0, '#9be0f0'); grad.addColorStop(1, '#4fb3dd'); }
      g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
      g.globalAlpha = wet ? (murk ? 0.18 : 0.55) : 1;
      if (a.print === 'waves') { g.strokeStyle = p0; g.lineWidth = 10; for (let y0 = 60; y0 < 512; y0 += 90) { g.beginPath(); for (let x = 0; x <= 512; x += 8) g.lineTo(x, y0 + Math.sin(x / 40) * 14); g.stroke(); } }
      else if (a.print !== 'plain') for (let i = 0; i < 9; i++) { const ang = i / 9 * Math.PI * 2 + random(), rad = 70 + (i % 3) * 60; motif(g, 256 + Math.cos(ang) * rad, 256 + Math.sin(ang) * rad, 26 + random() * 12, inks[i % inks.length], i); }
      g.globalAlpha = 1;
      if (wet) {
        g.strokeStyle = murk ? 'rgba(210,225,150,0.35)' : 'rgba(255,255,255,0.75)'; g.lineWidth = 3;
        const ripples = a.state === 'in-use' ? 16 : 7;
        for (let i = 0; i < ripples; i++) { const x = 60 + random() * 392, y = 60 + random() * 392, rad = 12 + random() * (a.state === 'in-use' ? 60 : 34); g.beginPath(); g.ellipse(x, y, rad, rad * 0.8, random() * 3, random() * 2, random() * 2 + 3); g.stroke(); }
        if (murk) for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${150 + random() * 60},${170 + random() * 40},70,0.5)`; g.beginPath(); g.ellipse(random() * 512, random() * 512, 8 + random() * 40, 5 + random() * 18, random() * 3, 0, Math.PI * 2); g.fill(); }
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: wet ? 0.12 : 0.5, metalness: wet ? 0.1 : 0 });
    };
    const disc = (y: number, wet: boolean) => {
      const mesh = put(new THREE.Mesh(new THREE.CircleGeometry(inner, 48), surface(wet)));
      mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.receiveShadow = true;
      return mesh;
    };
    const hasWater = a.state !== 'drained';
    const level = hasWater ? rim * (a.state === 'fresh' ? 0.78 : a.state === 'in-use' ? 0.66 : mix(0.6, 0.35, mood.wear)) : 0.012;
    disc(0.01, false);
    if (hasWater) disc(level, true);

    // Things afloat. Each rides in its own group so update() can bob it.
    const floaters: { group: THREE.Group; y: number; phase: number; drift: number }[] = [];
    const afloat = (x: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(x, level, z); group.rotation.y = random() * Math.PI * 2;
      pool.add(group);
      if (hasWater) floaters.push({ group, y: level, phase: random() * 6, drift: (random() - 0.5) * 0.3 });
      else { group.rotation.z = 0.5 + random() * 0.6; group.position.y += 0.03; }
      return group;
    };
    const mesh = (group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; group.add(m); return m;
    };
    const spot = () => { const ang = random() * Math.PI * 2, rad = random() * inner * 0.6; return [Math.cos(ang) * rad, Math.sin(ang) * rad] as const; };
    if (a.floating === 'boat') {
      const [x, z] = spot(); const g = afloat(x, z);
      const hull = new THREE.Shape(); hull.moveTo(-0.13, 0); hull.lineTo(0.16, 0); hull.lineTo(0.11, -0.05); hull.lineTo(-0.1, -0.05);
      mesh(g, new THREE.ExtrudeGeometry(hull, { depth: 0.09, bevelEnabled: false }), s.material('#d8352f', { roughness: 0.4 }), 0, 0.045, -0.045);
      mesh(g, new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6), s.material('#f0ead8'), 0, 0.17, 0);
      const sail = new THREE.Shape(); sail.moveTo(0.01, 0); sail.lineTo(0.14, 0); sail.lineTo(0.01, 0.2);
      mesh(g, new THREE.ShapeGeometry(sail), new THREE.MeshStandardMaterial({ color: '#fbfaf2', side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.075, 0);
      const jib = new THREE.Shape(); jib.moveTo(-0.01, 0); jib.lineTo(-0.1, 0); jib.lineTo(-0.01, 0.15);
      mesh(g, new THREE.ShapeGeometry(jib), new THREE.MeshStandardMaterial({ color: '#f4c62c', side: THREE.DoubleSide, roughness: 0.8 }), 0, 0.075, 0);
    } else if (a.floating === 'duck') {
      const [x, z] = spot(); const g = afloat(x, z); const yellow = s.material('#f6cf2a', { roughness: 0.35 });
      mesh(g, new THREE.SphereGeometry(0.075, 14, 10), yellow, 0, 0.035, 0).scale.set(1.25, 0.8, 0.95);
      mesh(g, new THREE.SphereGeometry(0.05, 12, 8), yellow, 0.065, 0.105, 0);
      mesh(g, new THREE.ConeGeometry(0.022, 0.05, 8), s.material('#ee7a22'), 0.12, 0.1, 0).rotation.z = -Math.PI / 2;
      mesh(g, new THREE.ConeGeometry(0.035, 0.07, 6), yellow, -0.1, 0.07, 0).rotation.z = 0.9;
      for (const sz of [-1, 1]) mesh(g, new THREE.SphereGeometry(0.008, 6, 4), s.material('#1b1b1b'), 0.09, 0.12, sz * 0.03);
    } else if (a.floating === 'ball') {
      const [x, z] = spot(); const g = afloat(x, z);
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 16; const c = canvas.getContext('2d')!;
      ['#e2412f', '#fbfaf2', '#2f86d6', '#fbfaf2', '#f4c62c', '#fbfaf2'].forEach((colour, i) => { c.fillStyle = colour; c.fillRect(i * 128 / 6, 0, 128 / 6 + 1, 16); });
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const ball = mesh(g, new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.3 }), 0, 0.12, 0);
      ball.rotation.set(random(), 0, random());
    } else if (a.floating === 'bucket') {
      const [x, z] = spot(); const g = afloat(x, z); const red = s.material('#e2412f', { roughness: 0.4 });
      const bucket = mesh(g, new THREE.CylinderGeometry(0.085, 0.06, 0.14, 16, 1, true), new THREE.MeshStandardMaterial({ color: red.color, roughness: 0.4, side: THREE.DoubleSide }), 0, 0.05, 0);
      bucket.rotation.z = 0.5;
      mesh(g, new THREE.TorusGeometry(0.085, 0.006, 6, 16, Math.PI), s.material('#f4f4ee'), 0.035, 0.11, 0).rotation.set(0, 0, 0.5);
      const spade = mesh(g, new THREE.BoxGeometry(0.07, 0.008, 0.1), s.material('#f4c62c'), -0.16, 0.012, 0.08);
      mesh(g, new THREE.CylinderGeometry(0.008, 0.008, 0.17, 6), s.material('#f4c62c'), -0.16, 0.014, -0.05).rotation.x = Math.PI / 2;
      spade.rotation.y = 0.2;
    }
    // Leaves: a few always, many once it has been forgotten.
    const leafCount = !hasWater ? Math.round(mood.wear * 5) : a.state === 'forgotten' ? Math.round(mix(10, 30, mood.density)) : Math.round(mix(0, 5, mood.wear));
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.05); leafShape.quadraticCurveTo(0.04, 0, 0, 0.06); leafShape.quadraticCurveTo(-0.04, 0, 0, -0.05);
    const leafGeo = new THREE.ShapeGeometry(leafShape); leafGeo.rotateX(-Math.PI / 2);
    const leafTints = ['#b8792a', '#8a5a25', '#c9a23a', '#6f7f33', '#a34b25'];
    for (let i = 0; i < leafCount; i++) {
      const ang = random() * Math.PI * 2, rad = Math.sqrt(random()) * inner * 0.92;
      const g = afloat(Math.cos(ang) * rad, Math.sin(ang) * rad);
      g.rotation.z = 0; g.position.y = level + 0.004 + i * 0.0004;
      mesh(g, leafGeo, new THREE.MeshStandardMaterial({ color: leafTints[i % leafTints.length], side: THREE.DoubleSide, roughness: 0.9 })).scale.setScalar(0.7 + random() * 0.8);
    }
    // Splashes for a pool in use: arcs of droplets and a ring of soaked grass.
    if (a.state === 'in-use') {
      const drops: { at: [number, number, number]; size: number }[] = [];
      const bursts = 2 + Math.round(mood.energy * 3);
      for (let b = 0; b < bursts; b++) {
        const ang = random() * Math.PI * 2, rad = inner * (0.2 + random() * 0.6), cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
        for (let i = 0; i < 16; i++) {
          const out = random() * Math.PI * 2, t = random(), reach = 0.1 + random() * 0.32;
          drops.push({ at: [cx + Math.cos(out) * reach * t, level + Math.sin(t * Math.PI) * mix(0.2, 0.6, mood.energy) * (0.5 + random()), cz + Math.sin(out) * reach * t], size: 0.012 + random() * 0.022 });
        }
      }
      put(s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#dff4fb', roughness: 0.1, emissive: '#bfe9f7', emissiveIntensity: 0.35 }), drops));
      const wet = s.mesh(new THREE.RingGeometry(R + r * 0.4, R + r + 0.34, 40), s.material('#4b6a3a', { roughness: 0.5 }), [0, 0.004, 0]);
      wet.rotation.x = -Math.PI / 2; wet.castShadow = false;
    }
    if (a.state === 'forgotten') {
      const dead = s.mesh(new THREE.RingGeometry(R + r * 0.3, R + r + 0.16, 40), s.material('#b8ab62', { roughness: 1 }), [0, 0.004, 0]);
      dead.rotation.x = -Math.PI / 2; dead.castShadow = false;
    }

    // Propped on its side to dry: leaned on an upturned washing-up bowl, a puddle where it emptied.
    if (a.state === 'drained') {
      pool.rotation.z = 0.95;
      pool.position.set(R * 0.38, R * Math.sin(0.95) + 0.02, 0);
      pool.scale.set(1, 1, 0.94);
      s.cylinder(0.2, 0.26, R * 0.9, [R * 0.95 + 0.1, R * 0.45, 0], s.material('#d9d2c0', { roughness: 0.7 }), 16);
      const puddle = s.mesh(new THREE.CircleGeometry(1, 28), s.material('#6f9aa8', { roughness: 0.08, metalness: 0.2 }), [-R * 0.55, 0.004, R * 0.1]);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(R * 0.55, R * 0.8, 1); puddle.castShadow = false;
    }

    // Beside it.
    const side = R + r + 0.3;
    if (a.beside === 'hose') {
      const green = s.material('#3f8f4e', { roughness: 0.5 });
      const pts: [number, number, number][] = [];
      const hang = a.state === 'drained' ? 0.02 : rim + 0.03;
      if (a.state !== 'drained') pts.push([-(R - r * 1.6), Math.max(level + 0.03, hang - 0.12), 0.1], [-(R - r * 0.3), hang, 0.1], [-(R + r * 1.1), hang - 0.04, 0.1], [-(R + r * 1.5), 0.03, 0.12]);
      for (let i = 0; i <= 26; i++) { const t = i / 26 * Math.PI * 5, rad = 0.2 + i * 0.004; pts.push([-(side + 0.25) + Math.cos(t + Math.PI) * rad * -1, 0.022 + i * 0.0015, 0.2 + Math.sin(t) * rad]); }
      s.tube(pts, 0.016, green);
      const end = pts[0];
      s.cylinder(0.02, 0.02, 0.06, [end[0], end[1], end[2]], s.material('#d9a62c', { metalness: 0.6, roughness: 0.3 }), 8).rotation.z = Math.PI / 2;
    } else if (a.beside === 'towel') {
      const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 128; const c = canvas.getContext('2d')!;
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f6f1e4' : [p0, p2, '#e2412f', '#f4c62c'][(i / 2) % 4 | 0]; c.fillRect(0, i * 16, 64, 16); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const geo = new THREE.PlaneGeometry(0.7, 1.3, 8, 14); geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, 0.012 + 0.02 * Math.abs(Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 5)) + (pos.getZ(i) > 0.45 ? (pos.getZ(i) - 0.45) * 0.25 : 0));
      geo.computeVertexNormals();
      const towel = s.mesh(geo, new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide }), [side + 0.25, 0, 0.1]);
      towel.rotation.y = 0.3 + random() * 0.4;
    } else if (a.beside === 'pump') {
      const x = side + 0.05, yellow = s.material('#f1c232', { roughness: 0.45 }), black = s.material('#22242a');
      s.box([0.2, 0.02, 0.3], [x, 0.01, 0], black);
      for (let i = 0; i < 5; i++) s.cylinder(0.085 - (i % 2) * 0.018, 0.085 - ((i + 1) % 2) * 0.018, 0.026, [x, 0.035 + i * 0.026, -0.02], yellow, 16);
      s.box([0.2, 0.018, 0.3], [x, 0.17, 0.0], black).rotation.x = -0.22;
      s.tube([[x, 0.03, 0.13], [x - 0.12, 0.02, 0.3], [x - 0.3, 0.02, 0.26], [x - 0.36, 0.05, 0.1]], 0.012, black);
    } else if (a.beside === 'flip-flops') {
      for (let i = 0; i < 2; i++) {
        const x = side - 0.05 + i * 0.15 + random() * 0.06, z = 0.1 + random() * 0.25, turn = (random() - 0.5) * 1.6;
        const sole = s.mesh(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10), s.material(p2, { roughness: 0.8 }), [x, 0.012, z]);
        sole.rotation.set(Math.PI / 2, 0, turn); sole.scale.set(1, 1, 0.22);
        const strap = s.mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), s.material(p0), [x + Math.sin(turn) * -0.03, 0.02, z - Math.cos(turn) * 0.03]);
        strap.rotation.y = turn;
      }
    }

    const energy = mix(0.25, 1.4, mood.energy) * (a.state === 'in-use' ? 1.6 : a.state === 'forgotten' ? 0.5 : 1);
    return s.finish({
      update: (_dt, time) => {
        for (const f of floaters) {
          f.group.position.y = f.y + Math.sin(time * 1.7 * energy + f.phase) * 0.008 * energy;
          f.group.rotation.x = Math.sin(time * 1.3 * energy + f.phase) * 0.06 * energy;
          f.group.rotation.y += f.drift * energy * 0.016;
        }
      },
    });
  },
});
