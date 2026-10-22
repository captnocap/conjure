import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { carvedDecal, crow, instanced, sheep, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

const ROCK = {
  granite: 'Pale speckled moor granite.',
  sarsen: 'Silver-grey sarsen sandstone.',
  slate: 'Dark blue-grey slate, a thin flat blade of a stone.',
  sandstone: 'Rust-red sandstone, soft-edged.',
  quartz: 'Milky white quartz that shows from far off.',
  gritstone: 'Sooty brown-black gritstone.',
} as const;
const ROCK_TINT: Record<keyof typeof ROCK, string> = {
  granite: '#b4ada3', sarsen: '#a3a39c', slate: '#56616c', sandstone: '#a7694b', quartz: '#e3dfd6', gritstone: '#5b5046',
};

export default defineThing({
  questions: {
    rock: choice('What stone is it?', ROCK),
    stature: score('How long is the stone?', ['The length of a person', 'Twice that', 'A giant, seven metres end to end']),
    break: choice('How did it break?', {
      two: 'Snapped clean in two, the halves a little apart and out of line.',
      three: 'Shattered into three lengths with rubble between them.',
      cracked: 'Cracked right through but the halves still touch.',
      stump: 'It broke off at the ground: a jagged stump still stands in the socket and the rest lies beyond it.',
      whole: 'It went over whole and lies unbroken.',
    }),
    cause: choice('What brought it down?', {
      time: 'Nothing but time, frost and its own weight.',
      pulled: 'People pulled it down on purpose: ropes, stakes and a lever are still here.',
      lightning: 'Lightning: the stone and the ground around it are scorched black.',
      diggers: 'Treasure hunters undermined it, leaving a spoil heap and a spade.',
      quarried: 'Stone-breakers were splitting it for gateposts: a row of iron wedges and a sledgehammer.',
    }),
    socket: choice('What is left of the hole it stood in?', {
      open: 'An open dark pit ringed with packing stones.',
      pool: 'The pit has filled with still rainwater.',
      sapling: 'A young rowan has seeded itself in the pit.',
      lost: 'Almost nothing: a faint grassy hollow.',
    }),
    cover: choice('What has grown over it?', {
      turf: 'Short cropped turf; the stone lies clean on top.',
      sunk: 'Long grass has half swallowed it.',
      heather: 'Clumps of purple-brown heather crowd against it.',
      moss: 'A blanket of green moss over its upper face.',
      bracken: 'Rusty bracken fronds arch over it.',
    }),
    marks: choice('If the stone carries marks, what are they?', {
      none: 'It is unmarked.',
      cups: 'Small pecked cup marks.',
      ogham: 'A row of ogham notches along one edge.',
      spiral: 'A single worn spiral.',
      cross: 'A later cross cut into it to christen it.',
    }),
    visitor: choice('Who or what is with it now?', {
      nobody: 'Nobody.',
      sheep: 'A sheep lying in its lee.',
      crow: 'A crow perched on the highest piece.',
      walker: "A walker's rucksack, flask and map left on it as on a bench.",
      flowers: 'A small jar of wild flowers somebody left.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = mix(2.2, 7, a.stature) * mix(0.93, 1.07, random());
    const flat = a.rock === 'slate' ? 0.6 : 1;
    const W = L * mix(0.26, 0.33, random()), T = L * mix(0.17, 0.22, random()) * flat;
    const frost = mood.warmth < 0.3 ? mix(0.9, 0, mood.warmth / 0.3) : 0;
    const base = new THREE.Color(ROCK_TINT[a.rock]);
    const patches = [
      ...(a.cover === 'moss' ? [{ color: '#3f5826', amount: 0.6, scale: 1, up: 0 }] : [{ color: '#c8cdb0', amount: 0.2 + mood.wear * 0.2, scale: 2.4 }]),
      ...(a.cause === 'lightning' ? [{ color: '#151312', amount: 0.45, scale: 0.7 }] : []),
      ...(a.cover === 'moss' || a.cause === 'lightning' ? [] : [{ color: '#d39a35', amount: 0.12, scale: 3.4 }]),
    ];
    const material = stoneMaterial();
    const sunk = (a.cover === 'sunk' ? 0.4 : 0.12) + mood.wear * 0.12;
    const round = (a.rock === 'slate' ? 0.08 : 0.15) + mood.wear * 0.06;

    // Lengths of the pieces, from the socket end outward.
    const cuts = { two: [0.56, 0.44], three: [0.4, 0.27, 0.33], cracked: [0.52, 0.48], stump: [0.2, 0.45, 0.35], whole: [1] }[a.break];
    const socketX = -L * 0.5 - W * 0.75;
    let x = -L * 0.5 + (a.break === 'stump' ? -W * 0.2 : W * 0.25);
    let z = 0, heading = (random() - 0.5) * 0.12;
    const tops: { x: number; z: number; y: number; length: number; heading: number }[] = [];
    // One outline for the whole stone, so the broken lengths still match each other: a broad waist and a blunt point.
    const outline = (u: number) => (0.74 + 0.34 * Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.08))) * (u > 0.72 ? mix(1, 0.42, ((u - 0.72) / 0.28) ** 1.6) : 1);
    let done = 0;
    cuts.forEach((fraction, index) => {
      const length = L * fraction;
      const from = done;
      done += fraction;
      const piece = solid(stoneGeometry(random, { size: [T, length, W], taper: 1, round, rough: L * 0.011 * mix(0.8, 1.6, mood.wear), base, patches, frost, segments: 14, profile: (up) => outline(from + up * fraction) }), material);
      const holder = new THREE.Group();
      holder.add(piece);
      if (a.break === 'stump' && index === 0) {
        // The stump stays upright in its socket, top jagged.
        holder.position.set(socketX, -length * 0.25, 0);
        holder.rotation.set((random() - 0.5) * 0.1, random() * 0.6, 0.12);
        piece.rotation.y = Math.PI / 2;
        const jag = solid(stoneGeometry(random, { size: [W * 0.5, length * 0.45, T * 0.8], taper: 0.2, round: 0.1, rough: L * 0.01, base, patches, frost, segments: 6 }), material);
        jag.position.set(-W * 0.2, length * 0.82, 0);
        holder.add(jag);
        s.root.add(holder);
        x = socketX + W * 0.75;
        return;
      }
      const gap = a.break === 'cracked' || index === 0 ? L * 0.012 : L * mix(0.05, 0.1, random());
      x += gap * Math.cos(heading);
      const tiltUp = (random() - 0.5) * 0.07 + (a.break === 'three' ? (random() - 0.5) * 0.12 : 0);
      // In a clean snap the outer half still rests its broken end on the inner one.
      const propped = a.break === 'two' && index === 1;
      const lift = propped ? T * 0.55 : 0;
      if (propped) x -= T * 0.9 * Math.cos(heading);
      holder.position.set(x, T * (0.5 - sunk * 0.6) + lift, z);
      // Local +y (the stone's length) is laid along +x.
      holder.rotation.set(0, -heading, -Math.PI / 2 + (propped ? -Math.asin(Math.min(0.5, (lift * 1.25) / length)) : tiltUp), 'YXZ');
      piece.rotation.y = (random() - 0.5) * 0.2;
      s.root.add(holder);
      tops.push({ x: x + Math.cos(heading) * length * 0.5, z: z - Math.sin(heading) * length * 0.5, y: T * (1 - sunk * 0.6), length, heading });
      x += Math.cos(heading) * length;
      z -= Math.sin(heading) * length;
      if (a.break !== 'cracked' && a.break !== 'whole') heading += (random() - 0.5) * (a.break === 'three' ? 0.7 : 0.4) + 0.12;
    });
    const main = tops.reduce((best, top) => (top.length > best.length ? top : best), tops[0]);

    // Rubble where it broke.
    if (a.break === 'three' || a.break === 'two' || mood.wear > 0.7) {
      const dabs: Dab[] = [];
      const n = Math.round(mix(4, 14, mood.density)) * (a.break === 'three' ? 2 : 1);
      for (let i = 0; i < n; i++) {
        const near = tops[Math.floor(random() * tops.length)];
        const end = random() < 0.5 ? -1 : 1;
        dabs.push({ at: [near.x + end * near.length * 0.5 + (random() - 0.5) * W, -0.02, near.z + (random() - 0.5) * W * 1.6], scale: L * mix(0.02, 0.055, random()), turn: [random(), random() * 6, random()] });
      }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.6, 0.8], round: 0.25, rough: 0.08, base, segments: 4 }), material, dabs));
    }

    // A pad of turf the whole ruin lies bedded in.
    const padH = Math.max(0.07, L * 0.02);
    const tipX = x;
    const padGeometry = new THREE.SphereGeometry(1, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    {
      const position = padGeometry.getAttribute('position') as THREE.BufferAttribute;
      const wobble = Array.from({ length: 7 }, () => random());
      for (let i = 0; i < position.count; i++) {
        const px = position.getX(i), pz = position.getZ(i);
        const angle = Math.atan2(pz, px);
        const k = 1 + 0.1 * Math.sin(angle * 3 + wobble[0] * 6) + 0.07 * Math.sin(angle * 5 + wobble[1] * 6) + 0.05 * Math.sin(angle * 9 + wobble[2] * 6);
        position.setXYZ(i, px * k, position.getY(i), pz * k);
      }
      padGeometry.computeVertexNormals();
    }
    const padColour = frost > 0.3 ? '#93a99a' : mood.warmth > 0.65 ? '#7d8148' : '#4f6b38';
    const pad = s.mesh(padGeometry, new THREE.MeshStandardMaterial({ color: padColour, roughness: 1 }), [(socketX + tipX) / 2, 0, z / 2]);
    pad.scale.set((tipX - socketX) / 2 + W * 0.95, padH, W * 1.25 + Math.abs(z) / 2);
    pad.castShadow = false;
    const padY = padH * 0.72;

    // The socket.
    const earth = s.material('#4a3a2a', { roughness: 1 });
    const pitR = W * (a.cause === 'diggers' ? 0.72 : 0.56);
    if (a.socket === 'lost') {
      s.cylinder(pitR * 0.9, pitR * 0.9, 0.02, [socketX, padY + 0.012, 0], s.material(frost > 0.3 ? '#7f9485' : '#3f5a2c', { roughness: 1 }), 18).castShadow = false;
    } else {
      const collar = s.cylinder(pitR * 1.28, pitR * 1.4, 0.03, [socketX, padY + 0.006, 0], earth, 20);
      collar.castShadow = false;
      s.cylinder(pitR, pitR, 0.03, [socketX, padY + 0.02, 0], a.socket === 'pool'
        ? new THREE.MeshStandardMaterial({ color: mood.daylight > 0.75 ? '#c08d6a' : '#7f9fb0', roughness: 0.08, metalness: 0.4 })
        : new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 1 }), 20).castShadow = false;
      const dabs: Dab[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + random() * 0.5;
        if (Math.abs(angle - Math.PI * 2) < 0.5 || angle < 0.5) continue;
        dabs.push({ at: [socketX + Math.cos(angle) * pitR * 1.08, padY, Math.sin(angle) * pitR * 1.08], scale: pitR * mix(0.3, 0.52, random()), turn: [random(), random() * 6, random()] });
      }
      s.root.add(instanced(stoneGeometry(random, { size: [1, 0.7, 0.8], round: 0.5, rough: 0.06, base, segments: 4 }), material, dabs));
      if (a.socket === 'sapling') {
        const bark = s.material('#5d4a3a');
        const h = Math.max(1.1, L * 0.3);
        s.tube([[socketX, 0, 0], [socketX + 0.05, h * 0.5, 0.04], [socketX - 0.04, h, -0.03]], h * 0.018, bark);
        const leaves: Dab[] = [];
        const leafColours = mood.warmth > 0.65 ? ['#b8862b', '#c9662a', '#8f8a34'] : ['#6f9440', '#58803a', '#86a44c'];
        for (let i = 0; i < 26; i++) {
          const up = mix(0.45, 1.1, random()), angle = random() * 6.28, out = h * 0.3 * (1.15 - up) + 0.05;
          leaves.push({ at: [socketX + Math.cos(angle) * out, h * up, Math.sin(angle) * out], scale: [h * 0.09, h * 0.05, h * 0.09], color: leafColours[i % 3] });
        }
        if (mood.cheer > 0.4) for (let i = 0; i < 6; i++) leaves.push({ at: [socketX + (random() - 0.5) * h * 0.3, h * mix(0.6, 0.9, random()), (random() - 0.5) * h * 0.3], scale: h * 0.035, color: '#c8321f' });
        s.root.add(instanced(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), leaves));
      }
    }

    // What felled it.
    if (a.cause === 'pulled') {
      const rope = s.material('#b9a678'), wood = s.material('#7a5c3c');
      const end = tops[tops.length - 1];
      const loop = s.ring(Math.max(W, T) * 0.56, L * 0.012, [end.x, end.y * 0.5, end.z], rope);
      loop.rotation.y = Math.PI / 2 - end.heading;
      loop.scale.set(1, T / W + 0.25, 1);
      s.tube([[end.x, end.y, end.z], [end.x + L * 0.1, 0.03, end.z + W * 1.2], [end.x - L * 0.12, 0.03, end.z + W * 2], [end.x + L * 0.05, 0.03, end.z + W * 2.6]], L * 0.011, rope);
      for (let i = 0; i < 3; i++) s.rod([end.x - i * L * 0.12, -0.1, end.z + W * (1.5 + i * 0.4)], [end.x - i * L * 0.12 + 0.08, L * 0.07, end.z + W * (1.5 + i * 0.4)], L * 0.012, wood, L * 0.008);
      s.rod([main.x - main.length * 0.3, 0.06, main.z - W * 0.9], [main.x + main.length * 0.4, T * 0.5, main.z - W * 0.6], L * 0.016, wood);
    }
    if (a.cause === 'lightning') { const burn = s.cylinder(W * 0.95, W * 0.95, 0.02, [main.x, padH + 0.004, main.z], new THREE.MeshStandardMaterial({ color: '#2a221b', roughness: 1 }), 18); burn.scale.set(Math.max(1.2, (main.length * 0.62) / W), 1, 1); burn.rotation.y = -main.heading; burn.castShadow = false; }
    if (a.cause === 'diggers') {
      const heap = s.ball([pitR * 1.3, pitR * 0.6, pitR * 1.1], [socketX - pitR * 0.6, 0, pitR * 1.7], earth, 12);
      heap.rotation.y = random();
      const iron = s.material('#3b3d40', { metalness: 0.6, roughness: 0.5 }), wood = s.material('#8b6b45');
      const sx = socketX - pitR * 0.5, sz = pitR * 1.6;
      s.rod([sx, pitR * 0.35, sz], [sx + 0.18, pitR * 0.35 + 0.95, sz + 0.1], 0.022, wood);
      s.box([0.2, 0.3, 0.02], [sx - 0.03, pitR * 0.35 - 0.05, sz - 0.015], iron).rotation.z = -0.18;
      s.box([0.14, 0.03, 0.03], [sx + 0.18, pitR * 0.35 + 0.96, sz + 0.1], wood);
    }
    if (a.cause === 'quarried') {
      const iron = s.material('#2f3033', { metalness: 0.7, roughness: 0.45 }), wood = s.material('#8b6b45');
      const n = Math.max(4, Math.round(main.length / 0.35));
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1) - 0.5) * main.length * 0.8;
        s.box([0.035, 0.11, 0.06], [main.x + Math.cos(main.heading) * t, main.y + 0.03, main.z - Math.sin(main.heading) * t + W * 0.08], iron).rotation.y = -main.heading;
      }
      const hx = main.x + main.length * 0.15, hz = main.z + W * 0.9;
      s.rod([hx - 0.45, 0.05, hz], [hx + 0.4, 0.09, hz + 0.25], 0.02, wood);
      s.box([0.11, 0.11, 0.24], [hx + 0.42, 0.08, hz + 0.26], iron).rotation.y = -0.55;
    }

    // Marks on the upper face of the longest piece.
    if (a.marks !== 'none') {
      const dw = Math.min(main.length * 0.6, W * 2.4), dh = W * 0.62;
      const decal = carvedDecal(dw, dh, (ctx, cw, ch) => {
        ctx.lineWidth = 6;
        if (a.marks === 'cups') for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cw * (0.08 + random() * 0.84), ch * (0.15 + random() * 0.7), ch * mix(0.06, 0.11, random()), 0, 7); ctx.fill(); }
        else if (a.marks === 'ogham') {
          ctx.beginPath(); ctx.moveTo(cw * 0.03, ch * 0.5); ctx.lineTo(cw * 0.97, ch * 0.5); ctx.stroke();
          let px = cw * 0.07;
          while (px < cw * 0.93) {
            const group = 1 + Math.floor(random() * 5), kind = Math.floor(random() * 3);
            for (let i = 0; i < group; i++) { ctx.beginPath(); ctx.moveTo(px, ch * (kind === 0 ? 0.5 : 0.2)); ctx.lineTo(px + (kind === 2 ? 6 : 0), ch * (kind === 1 ? 0.5 : 0.8)); ctx.stroke(); px += 9; }
            px += 10;
          }
        } else if (a.marks === 'spiral') {
          ctx.beginPath();
          for (let t = 0; t < 28; t += 0.2) ctx.lineTo(cw * 0.5 + Math.cos(t) * ch * 0.42 * (t / 28), ch * 0.5 + Math.sin(t) * ch * 0.42 * (t / 28));
          ctx.stroke();
        } else {
          ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(cw * 0.2, ch * 0.5); ctx.lineTo(cw * 0.8, ch * 0.5); ctx.moveTo(cw * 0.38, ch * 0.15); ctx.lineTo(cw * 0.38, ch * 0.85); ctx.stroke();
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(cw * 0.38, ch * 0.5, ch * 0.22, 0, 7); ctx.stroke();
        }
      }, 'rgba(22,19,17,0.8)');
      decal.rotation.set(-Math.PI / 2, 0, -main.heading, 'YXZ');
      decal.rotation.y = -main.heading;
      decal.rotation.z = 0;
      decal.position.set(main.x, main.y + L * 0.02, main.z);
      s.root.add(decal);
    }

    // Vegetation.
    const green = frost > 0.3 ? ['#a9bdb0', '#8fa894', '#c3d2cc'] : mood.warmth > 0.65 ? ['#a7a25a', '#8c9450', '#c2b56b'] : ['#5f7d3c', '#6f8a45', '#4d6b35'];
    const blades: [number, number, number][] = [];
    const along = () => { const top = tops[Math.floor(random() * tops.length)], t = (random() - 0.5) * top.length, side = random() < 0.5 ? -1 : 1; return [top.x + Math.cos(top.heading) * t, 0, top.z - Math.sin(top.heading) * t + side * W * mix(0.5, 0.75, random())] as [number, number, number]; };
    const tuftCount = Math.round(mix(40, 110, mood.density) * (a.cover === 'sunk' ? 2.2 : 1));
    for (let i = 0; i < tuftCount; i++) blades.push(along());
    s.root.add(tufts(random, blades, green, L * (a.cover === 'sunk' ? 0.1 : 0.05)));
    if (a.cover === 'heather') {
      const dabs: Dab[] = [];
      const bloom = mood.warmth > 0.45 ? ['#6d4a66', '#7b5573', '#5e4a3c', '#59613a'] : ['#5a4638', '#6b5340', '#4d4034'];
      for (let i = 0; i < Math.round(mix(10, 26, mood.density)); i++) {
        const [px, , pz] = along();
        const size = L * mix(0.035, 0.07, random());
        for (let j = 0; j < 4; j++) dabs.push({ at: [px + (random() - 0.5) * size * 1.6, size * 0.45, pz + (random() - 0.5) * size * 1.6 + Math.sign(pz) * size * 0.4], scale: [size, size * 0.7, size], color: bloom[Math.floor(random() * bloom.length)] });
      }
      s.root.add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), dabs));
    }
    if (a.cover === 'bracken') {
      const fronds: [number, number, number][] = [];
      for (let i = 0; i < Math.round(mix(14, 34, mood.density)); i++) fronds.push(along());
      s.root.add(tufts(random, fronds, ['#9a6a3a', '#84552c', '#a27a40', '#6f7a34'], L * 0.12));
    }

    // Company.
    const birds: THREE.Object3D[] = [];
    if (a.visitor === 'sheep') {
      const animal = sheep(random, true, '#e6dfcd');
      animal.position.set(main.x + (random() - 0.5) * main.length * 0.4, 0, main.z + W * 0.5 + 0.42);
      animal.rotation.y = -main.heading + (random() < 0.5 ? 0 : Math.PI);
      animal.scale.setScalar(Math.max(1, L * 0.2));
      s.root.add(animal);
    } else if (a.visitor === 'crow') {
      const bird = crow();
      bird.scale.setScalar(Math.max(0.9, L * 0.18));
      bird.position.set(main.x + main.length * 0.25, main.y, main.z);
      bird.rotation.y = random() * 6.28;
      s.root.add(bird);
      birds.push(bird);
    } else if (a.visitor === 'walker') {
      const k = Math.max(1, L * 0.18);
      const bx = main.x - main.length * 0.2, by = main.y, bz = main.z;
      const pack = s.ball([0.17 * k, 0.26 * k, 0.14 * k], [bx, by + 0.24 * k, bz], s.material(mood.cheer > 0.5 ? '#d2472f' : '#3d5a73'), 12);
      pack.rotation.z = 0.15;
      s.box([0.2 * k, 0.1 * k, 0.05 * k], [bx, by + 0.18 * k, bz + 0.14 * k], s.material('#2c3038'));
      s.cylinder(0.04 * k, 0.04 * k, 0.24 * k, [bx + 0.32 * k, by + 0.12 * k, bz + 0.05 * k], s.material('#c8ccd0', { metalness: 0.8, roughness: 0.3 }), 10);
      s.cylinder(0.042 * k, 0.042 * k, 0.05 * k, [bx + 0.32 * k, by + 0.26 * k, bz + 0.05 * k], s.material('#2f6a4a'), 10);
      const map = s.box([0.3 * k, 0.012, 0.22 * k], [bx + 0.62 * k, by + 0.02, bz - 0.03], s.material('#e9e2c8'));
      map.rotation.y = 0.3;
    } else if (a.visitor === 'flowers') {
      const k = Math.max(1, L * 0.2);
      const bx = main.x + main.length * 0.1, by = main.y, bz = main.z;
      s.cylinder(0.045 * k, 0.04 * k, 0.11 * k, [bx, by + 0.055 * k, bz], new THREE.MeshStandardMaterial({ color: '#cfe3e6', roughness: 0.1, transparent: true, opacity: 0.6 }), 10);
      const colours = mood.cheer > 0.4 ? ['#e8c22a', '#d9486b', '#f1ede2', '#8a5bd0'] : ['#b9b09a', '#8d8672', '#d9d2bd'];
      const dabs: Dab[] = [];
      for (let i = 0; i < 9; i++) {
        const tip: [number, number, number] = [bx + (random() - 0.5) * 0.2 * k, by + mix(0.2, 0.34, random()) * k, bz + (random() - 0.5) * 0.2 * k];
        s.rod([bx, by + 0.05 * k, bz], tip, 0.005 * k, s.material('#55733a'));
        dabs.push({ at: tip, scale: 0.035 * k, color: colours[i % colours.length] });
      }
      s.root.add(instanced(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), dabs));
    }

    return s.finish({
      update: birds.length ? (_dt, time) => { birds.forEach((bird) => { bird.rotation.z = Math.sin(time * mix(0.4, 2.2, mood.energy)) * 0.08; }); } : undefined,
    });
  },
});
