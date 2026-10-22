import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { painted, windKey } from './parts';

type P = readonly [number, number, number];

export default defineThing({
  questions: {
    state: choice('What is the bird doing?', {
      singing: 'Singing: head thrown back, beak wide, tail up, little rings of sound rising.',
      silent: 'Silent on its perch, head lowered, beak shut.',
      fallen: 'Run down and toppled from the perch, lying on the cage floor.',
      gone: 'Gone. The door hangs open, the perch is empty, one feather left behind.',
      outside: 'Out: the door hangs open and the bird sits on top of the cage, looking away.',
    }),
    cage: choice('What shape is the cage?', {
      dome: 'A round cage with a domed top, the classic.',
      tall: 'A slim tall cylinder under a pointed spire.',
      pagoda: 'A square cage with a flared pagoda roof.',
    }),
    plumage: choice('What is the bird made of?', {
      gold: 'Gold with ruby eyes.',
      sapphire: 'Deep blue enamel set with sapphires.',
      emerald: 'Green enamel and emeralds.',
      pearl: 'White enamel and seed pearls.',
      jet: 'Blackened silver and jet, a mourning piece.',
    }),
    base: choice('What does the cage stand on?', {
      musicbox: 'A deep music-box drum with a painted enamel band.',
      tray: 'A thin gilt tray on ball feet.',
      marble: 'A slab of white veined marble.',
    }),
    key: choice('Where is the tiny key?', {
      ribbon: 'Hanging outside the cage on its ribbon.',
      wound: 'Left in the keyhole in the base.',
      lost: 'Lost. Only a frayed end of ribbon remains.',
    }),
    ribbon: choice('What colour is the ribbon?', {
      red: 'Scarlet silk.',
      black: 'Black velvet.',
      blue: 'Pale blue satin.',
      white: 'Yellowed white lace.',
    }),
    covered: noul('Is a velvet cloth draped half over the cage?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gilt = s.material(new THREE.Color('#d9b24a').lerp(new THREE.Color('#7d8a6a'), mood.wear * 0.45), { metalness: 0.6, roughness: 0.3 });
    const deep = s.material(new THREE.Color('#a8822e').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.4), { metalness: 0.55, roughness: 0.4 });
    const ribbonColour = { red: '#c2261e', black: '#1b1b1e', blue: '#a9c8e6', white: '#ece4cc' }[a.ribbon];
    const silk = s.material(ribbonColour, { roughness: 0.6, side: THREE.DoubleSide });
    const square = a.cage === 'pagoda';
    const R = a.cage === 'tall' ? 0.105 : 0.14;
    const baseH = { musicbox: 0.075, tray: 0.02, marble: 0.045 }[a.base];
    const feet = a.base === 'marble' ? 0 : 0.018;
    const floorY = feet + baseH;
    const wallH = a.cage === 'tall' ? 0.34 : 0.25;
    const eaveY = floorY + wallH;
    const sides = square ? 4 : 40;
    const turn = square ? Math.PI / 4 : 0;
    const openDoor = a.state === 'gone' || a.state === 'outside';

    // Base.
    const BR = R + 0.022;
    if (a.base === 'musicbox') {
      const band = painted(512, 64, (ctx, w, h) => {
        ctx.fillStyle = '#1f3a5a'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) {
          const x = i * 32 + 16;
          ctx.fillStyle = ['#e8c552', '#e58aa6', '#f2efe4'][i % 3];
          for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.257) * 8, 32 + Math.sin(k * 1.257) * 8, 5.5, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = '#c2261e'; ctx.beginPath(); ctx.arc(x, 32, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#d9b24a'; ctx.fillRect(0, 0, w, 5); ctx.fillRect(0, h - 5, w, 5);
      });
      const drum = s.mesh(new THREE.CylinderGeometry(BR, BR, baseH - 0.016, sides, 1, true), new THREE.MeshStandardMaterial({ map: band, roughness: 0.35 }), [0, feet + baseH / 2, 0]);
      drum.rotation.y = turn;
      for (const y of [feet + 0.004, floorY - 0.004]) s.cylinder(BR + 0.006, BR + 0.006, 0.01, [0, y, 0], gilt, sides).rotation.y = turn;
    } else if (a.base === 'tray') {
      s.cylinder(BR + 0.012, BR, baseH, [0, feet + baseH / 2, 0], gilt, sides).rotation.y = turn;
    } else {
      const veins = painted(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f1efea'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(110,115,125,0.6)'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) { let x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (random() - 0.3) * 60; y += (random() - 0.5) * 50; ctx.lineTo(x, y); } ctx.stroke(); }
      });
      s.mesh(new THREE.CylinderGeometry(BR + 0.02, BR + 0.02, baseH, sides), new THREE.MeshStandardMaterial({ map: veins, roughness: 0.25 }), [0, baseH / 2, 0]).rotation.y = turn;
      s.ring((BR + 0.02) * (square ? 1 : 1), 0.005, [0, baseH, 0], gilt).visible = !square;
    }
    if (feet) for (let i = 0; i < (square ? 4 : 3); i++) {
      const angle = i / (square ? 4 : 3) * Math.PI * 2 + (square ? Math.PI / 4 : 0.5);
      s.ball([0.02, 0.018, 0.02], [Math.sin(angle) * BR * 0.85, 0.014, Math.cos(angle) * BR * 0.85], deep, 10);
    }
    s.cylinder(R, R, 0.004, [0, floorY, 0], s.material('#e9dfc4', { roughness: 0.8 }), sides).rotation.y = turn;

    // Bars. A square cage walks its perimeter; a round one its circle.
    const barCount = square ? 24 : a.cage === 'tall' ? 18 : 24;
    const around = (index: number, count: number): [number, number] => {
      if (!square) { const angle = index / count * Math.PI * 2; return [Math.sin(angle) * R, Math.cos(angle) * R]; }
      const half = R * Math.SQRT1_2, per = count / 4, side = Math.floor(index / per), t = (index % per) / per * 2 - 1;
      return [[t * half, half], [half, -t * half], [-t * half, -half], [-half, t * half]][side] as [number, number];
    };
    const doorHalf = square ? 2 : 1.5;
    const front = square ? 0 + 3 : 0; // index nearest +z
    const isDoor = (index: number) => {
      const d = Math.abs(((index - front + barCount / 2 + barCount) % barCount) - barCount / 2);
      return d < doorHalf;
    };
    const doorTop = floorY + wallH * 0.62;
    for (let i = 0; i < barCount; i++) {
      const [x, z] = around(i, barCount);
      if (isDoor(i)) s.rod([x, doorTop, z], [x, eaveY, z], 0.0028, gilt);
      else s.rod([x, floorY, z], [x, eaveY, z], 0.0028, gilt);
    }
    const hoop = (y: number, tube = 0.0045) => {
      const ring = s.mesh(new THREE.TorusGeometry(R, tube, 6, square ? 4 : 48), gilt, [0, y, 0]);
      ring.rotation.set(Math.PI / 2, 0, square ? Math.PI / 4 : 0);
      return ring;
    };
    hoop(floorY + 0.004, 0.006); hoop(eaveY, 0.006); hoop(doorTop, 0.0035);

    // Roof.
    let topY: number;
    if (a.cage === 'dome') {
      const rise = 0.13;
      for (let i = 0; i < 12; i++) {
        const arc = s.mesh(new THREE.TorusGeometry(R, 0.0028, 5, 14, Math.PI / 2), gilt, [0, eaveY, 0]);
        arc.scale.set(1, rise / R, 1);
        arc.rotation.y = i / 12 * Math.PI * 2;
      }
      topY = eaveY + rise;
    } else {
      const rise = a.cage === 'tall' ? 0.17 : 0.12;
      const ribs = square ? 12 : 9;
      const flare = square ? 1.22 : 1.0;
      for (let i = 0; i < ribs; i++) {
        const [x, z] = around(i * (barCount / ribs), barCount);
        if (square) s.tube([[x * flare, eaveY - 0.008, z * flare], [x * 0.8, eaveY + rise * 0.22, z * 0.8], [x * 0.3, eaveY + rise * 0.6, z * 0.3], [0, eaveY + rise, 0]], 0.0028, gilt);
        else s.rod([x, eaveY, z], [0, eaveY + rise, 0], 0.0028, gilt);
      }
      if (square) {
        const eave = s.mesh(new THREE.TorusGeometry(R * flare, 0.005, 6, 4), gilt, [0, eaveY - 0.008, 0]);
        eave.rotation.set(Math.PI / 2, 0, Math.PI / 4);
        for (let i = 0; i < 4; i++) { const angle = i / 4 * Math.PI * 2 + Math.PI / 4; s.ball([0.008, 0.008, 0.008], [Math.sin(angle) * R * flare, eaveY - 0.02, Math.cos(angle) * R * flare], deep, 8); }
      }
      topY = eaveY + rise;
    }
    s.lathe([[0, 0], [0.02, 0.002], [0.012, 0.012], [0.016, 0.022], [0.005, 0.03], [0.005, 0.04]], gilt, [0, topY - 0.004, 0]);
    s.ring(0.016, 0.0035, [0, topY + 0.05, 0], gilt);

    // Door.
    const doorIdx = Array.from({ length: barCount }, (_unused, i) => i).filter(isDoor);
    const ordered = doorIdx.map((i) => around(i, barCount)).sort((p, q) => p[0] - q[0]);
    const hingeAt = ordered[0], latchAt = ordered[ordered.length - 1];
    const door = new THREE.Group();
    door.position.set(hingeAt[0], floorY, hingeAt[1]);
    s.root.add(door);
    const doorW = Math.hypot(latchAt[0] - hingeAt[0], latchAt[1] - hingeAt[1]);
    const dh = doorTop - floorY;
    for (let i = 0; i <= 3; i++) door.add(s.rod([doorW * i / 3, 0.006, 0.002], [doorW * i / 3, dh - 0.004, 0.002], 0.003, deep));
    for (const y of [0.006, dh - 0.004]) door.add(s.rod([0, y, 0.002], [doorW, y, 0.002], 0.0035, deep));
    door.add(s.ball([0.006, 0.006, 0.006], [doorW, dh * 0.5, 0.006], gilt, 8));
    door.rotation.y = openDoor ? -(1.5 + random() * 0.6) : 0;

    // Swing perch.
    const perchY = floorY + wallH * 0.52;
    const swing = new THREE.Group();
    swing.position.set(0, topY - 0.01, 0);
    s.root.add(swing);
    const drop = topY - 0.01 - perchY;
    for (const x of [-1, 1]) swing.add(s.rod([x * 0.045, 0, 0], [x * 0.045, -drop, 0], 0.0018, gilt));
    const bar = s.cylinder(0.005, 0.005, 0.11, [0, -drop, 0], s.material('#5a3a26', { roughness: 0.7 }), 8);
    bar.rotation.z = Math.PI / 2;
    swing.add(bar);
    swing.rotation.x = a.state === 'gone' || a.state === 'fallen' ? 0.14 : 0;
    // Seed and water cups against the bars.
    for (const x of [-1, 1]) s.cylinder(0.018, 0.013, 0.02, [x * (square ? R * 0.55 : R * 0.8), floorY + 0.055, 0], x > 0 ? s.material('#f2efe4', { roughness: 0.3 }) : deep, 12);

    // The bird.
    const tone = { gold: ['#e2b93e', '#b8892a', '#d3261f'], sapphire: ['#1f4fb0', '#d9b24a', '#7fc4ff'], emerald: ['#1f8a55', '#d9b24a', '#9af0b0'], pearl: ['#f2efe6', '#d9b24a', '#f7d7e2'], jet: ['#26272c', '#aab0b6', '#d3261f'] }[a.plumage];
    const feather = s.material(tone[0], { metalness: a.plumage === 'pearl' ? 0.1 : 0.5, roughness: 0.25 });
    const accent = s.material(tone[1], { metalness: 0.6, roughness: 0.3 });
    const gem = new THREE.MeshStandardMaterial({ color: tone[2], emissive: tone[2], emissiveIntensity: mix(0.25, 1.0, mood.cheer), roughness: 0.15 });
    const bird = new THREE.Group();
    const head = new THREE.Group();
    const tail = new THREE.Group();
    const upperBeak = s.rod([0, 0, 0.016], [0, 0.002, 0.04], 0.006, accent, 0.0008);
    const lowerBeak = s.rod([0, -0.003, 0.016], [0, -0.004, 0.036], 0.005, accent, 0.0008);
    head.add(s.ball([0.019, 0.019, 0.02], [0, 0, 0], feather, 14), upperBeak, lowerBeak);
    for (const x of [-1, 1]) head.add(s.ball([0.005, 0.005, 0.004], [x * 0.014, 0.004, 0.012], gem, 8));
    for (let i = 0; i < 3; i++) head.add(s.rod([0, 0.016, -0.004 - i * 0.004], [0, 0.034 - i * 0.004, -0.014 - i * 0.008], 0.0025, accent, 0.0008));
    head.position.set(0, 0.03, 0.03);
    for (let i = -2; i <= 2; i++) {
      const plume = s.ball([0.007, 0.003, 0.04], [i * 0.008, 0, -0.036], i % 2 ? accent : feather, 8);
      const stem = new THREE.Group();
      stem.rotation.y = i * 0.2;
      stem.add(plume);
      stem.add(s.ball([0.004, 0.004, 0.004], [i * 0.008, 0.002, -0.07], gem, 6));
      tail.add(stem);
    }
    tail.position.set(0, 0.004, -0.03);
    bird.add(s.ball([0.026, 0.027, 0.042], [0, 0, 0], feather, 16), head, tail);
    for (const x of [-1, 1]) {
      const wing = s.ball([0.006, 0.018, 0.034], [x * 0.024, 0.004, -0.004], accent, 10);
      wing.rotation.x = 0.25;
      bird.add(wing);
      for (let k = 0; k < 3; k++) bird.add(s.ball([0.004, 0.004, 0.004], [x * 0.029, 0.008 - k * 0.005, 0.012 - k * 0.012], gem, 6));
      bird.add(s.rod([x * 0.009, -0.02, 0], [x * 0.009, -0.036, 0.004], 0.0018, accent));
    }
    bird.add(s.ball([0.012, 0.012, 0.006], [0, -0.004, 0.04], gem, 8));
    const birdKey = windKey(gilt, 0.036, 'butterfly');
    birdKey.position.set(0, 0.022, -0.012);
    birdKey.rotation.x = -0.5;
    bird.add(birdKey);
    const singing = a.state === 'singing';
    head.rotation.x = singing ? -0.75 : a.state === 'silent' ? 0.45 : 0;
    tail.rotation.x = singing ? -0.75 : a.state === 'silent' ? 0.3 : 0;
    lowerBeak.rotation.x = singing ? 0.5 : 0;
    const birdScale = 1.6;
    bird.scale.setScalar(birdScale);
    const notes: THREE.Mesh[] = [];
    if (a.state === 'gone') {
      bird.visible = false;
      const quill = s.ball([0.006, 0.0015, 0.03], [0.03 + random() * 0.04, floorY + 0.006, 0.02 + random() * 0.04], feather, 8);
      quill.rotation.y = random() * 3;
      s.rod([quill.position.x, floorY + 0.006, quill.position.z - 0.03], [quill.position.x, floorY + 0.006, quill.position.z + 0.03], 0.0012, accent).rotation.y = quill.rotation.y;
    } else if (a.state === 'fallen') {
      bird.position.set(0.02 + random() * 0.03, floorY + 0.03 * birdScale, 0.01);
      bird.rotation.set(0.2, random() * 6, Math.PI / 2 - 0.15);
      s.root.add(bird);
    } else if (a.state === 'outside') {
      bird.position.set(a.cage === 'dome' ? 0.05 : 0.0, topY + (a.cage === 'dome' ? -0.012 : 0.095), a.cage === 'dome' ? 0.04 : 0);
      bird.rotation.y = 2.2 + random() * 1.6;
      s.root.add(bird);
    } else {
      bird.position.set(0, -drop + 0.036 * birdScale + 0.004, 0);
      bird.rotation.y = (random() - 0.5) * 0.9;
      swing.add(bird);
      if (singing) {
        const sound = s.material('#f2d67a', { emissive: '#f2c234', emissiveIntensity: 0.7, roughness: 0.4 });
        for (let i = 0; i < 4; i++) {
          const note = s.ring(0.008 + i * 0.004, 0.0018, [0.01 + i * 0.012, perchY + 0.1 + i * 0.03, 0.06 + i * 0.022], sound);
          note.rotation.x = -0.6;
          notes.push(note);
        }
      }
    }

    // The key and its ribbon.
    const loop: P = [0.016, topY + 0.05, 0];
    const hang: P = [R + 0.035, eaveY - 0.07 - random() * 0.05, 0.03];
    const ribbonTo = (end: P) => {
      const strip = s.tube([loop, [R * 0.75, topY - 0.02, 0.01], [R + 0.03, eaveY + 0.01, 0.025], end], 0.004, silk);
      strip.scale.set(1, 1, 1);
      return strip;
    };
    let baseKey: THREE.Object3D | null = null;
    // A bow at the top ring whatever became of the key.
    for (const x of [-1, 1]) s.ball([0.016, 0.009, 0.004], [x * 0.018, topY + 0.036, 0.008], silk, 8).rotation.z = x * 0.5;
    if (a.key === 'ribbon') {
      ribbonTo(hang);
      const key = windKey(gilt, 0.055, 'heart');
      key.position.set(hang[0], hang[1], hang[2]);
      key.rotation.set(Math.PI, random() * 3, 0);
      s.root.add(key);
    } else if (a.key === 'lost') {
      const end: P = [R + 0.034, eaveY - 0.03, 0.03];
      ribbonTo(end);
      for (let i = 0; i < 4; i++) s.rod(end, [end[0] + (random() - 0.5) * 0.02, end[1] - 0.016 - random() * 0.012, end[2] + (random() - 0.5) * 0.02], 0.0012, silk);
    } else {
      baseKey = windKey(gilt, 0.06, 'butterfly');
      const holder = new THREE.Group();
      holder.position.set(square ? BR * Math.SQRT1_2 : BR, a.base === 'musicbox' ? feet + baseH / 2 : floorY + 0.0, 0);
      holder.rotation.z = -Math.PI / 2;
      if (a.base !== 'musicbox') { holder.position.set(R * 0.5, floorY + 0.004, R * 0.3); holder.rotation.set(0, 0.5, -Math.PI / 2 + 0.02); }
      holder.add(baseKey);
      s.root.add(holder);
    }

    // Velvet cover over the back half.
    if (a.covered) {
      const velvet = s.material(mood.cheer > 0.5 ? '#5a1f4a' : '#23242e', { roughness: 1, side: THREE.DoubleSide });
      const CR = (square ? R * 1.0 : R) + 0.012;
      const start = Math.PI * 0.62 + (random() - 0.5) * 0.3, span = Math.PI * 1.05;
      const drape = s.mesh(new THREE.CylinderGeometry(CR, CR * 1.06, wallH * 0.8, 20, 1, true, start, span), velvet, [0, eaveY - wallH * 0.4, 0]);
      drape.castShadow = true;
      const hood = s.mesh(new THREE.SphereGeometry(CR, 20, 10, start + Math.PI / 2, span, 0, Math.PI / 2), velvet, [0, eaveY, 0]);
      hood.scale.y = (topY - eaveY + 0.012) / CR;
      // Sphere phi and cylinder theta start on different axes; turn the hood to sit over the drape.
      hood.rotation.y = 0;
    }

    const speed = singing ? mix(0.8, 3.5, mood.energy) : 0;
    const sway = a.state === 'gone' ? mix(0.2, 1, mood.energy) : 0;
    return s.finish({
      footprint: R + 0.05,
      update: (dt, time) => {
        if (speed) {
          head.rotation.x = -0.75 + Math.sin(time * speed * 3) * 0.14;
          lowerBeak.rotation.x = 0.35 + Math.abs(Math.sin(time * speed * 6)) * 0.4;
          tail.rotation.x = -0.75 + Math.sin(time * speed * 6) * 0.12;
          birdKey.rotation.y += dt * speed * 2;
          if (baseKey) baseKey.rotation.y += dt * speed;
          swing.rotation.x = Math.sin(time * speed) * 0.06;
          for (const [index, note] of notes.entries()) note.position.y = perchY + 0.1 + ((time * 0.25 * speed + index * 0.25) % 1) * 0.12;
        }
        if (sway) swing.rotation.x = Math.sin(time * 1.6) * 0.14 * sway;
      },
    });
  },
});
