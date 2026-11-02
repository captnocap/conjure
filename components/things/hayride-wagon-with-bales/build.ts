import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex } from '@conjure/kit';
import { hayBale, strawTexture } from './props';
import { pumpkin, stem } from './pumpkin';

function plaidTexture(base: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const c = new THREE.Color(base);
  ctx.fillStyle = c.getStyle(); ctx.fillRect(0, 0, 64, 64);
  ctx.globalAlpha = 0.6; ctx.fillStyle = c.clone().multiplyScalar(0.35).getStyle();
  ctx.fillRect(0, 20, 64, 16); ctx.fillRect(20, 0, 16, 64);
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#f2ead8'; ctx.fillRect(0, 50, 64, 3); ctx.fillRect(50, 0, 3, 64);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

export default defineThing({
  questions: {
    paint: paint('What colour is the wagon painted?', ['red', 'crimson', 'green', 'forest', 'yellow', 'blue', 'grey', 'brown']),
    sides: choice('What are its sides like?', {
      stakes: 'Stake sides: upright posts with two weathered boards between them.',
      planks: 'Low solid plank sides, like a farm box.',
      open: 'An open flatbed, no sides at all, just the bales.',
    }),
    hitch: noul('Does the long tractor hitch tongue show at the front?'),
    cargo: choice('What else rides on it?', {
      empty: 'Nothing else: just the bales, waiting for riders.',
      pumpkins: 'A few pumpkins tucked between the bales.',
      sign: 'A hand-painted HAYRIDES $5 sign nailed to the side.',
      lights: 'A string of glowing orange lights swagged along the rails.',
      festival: 'Decked out for the festival: the sign, the lights and pumpkins all at once.',
    }),
    bales: choice('What shape are the bales in?', {
      fresh: 'Fresh, tight, golden bales straight from the barn.',
      dulled: 'Rain-dulled grey-brown bales that have sat out for weeks.',
      broken: 'Some bales burst and kicked apart, loose straw strewn across the deck.',
    }),
    left: choice('What has been left on the bales?', {
      nothing: 'Nothing: the riders have not arrived yet.',
      blankets: 'Plaid blankets thrown over the seats against the evening chill.',
      cups: 'Forgotten paper cups of cider and a single lost mitten.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 4.2, D = 2.0, deckY = 0.82;
    const hex = new THREE.Color(paintHex(a.paint, '#c8102e')).lerp(new THREE.Color('#8b8275'), mood.wear * 0.3);
    const painted = s.material(hex, { roughness: 0.6 });
    const boards = s.material('#9a7d5a', { roughness: 0.9 });
    const dark = s.material('#2a2a2c', { roughness: 0.6 });
    const rubber = s.material('#1c1c1e', { roughness: 0.85 });
    const rim = s.material(a.paint === 'yellow' ? '#2f9e44' : '#e8c22a', { roughness: 0.4, metalness: 0.3 });

    // Running gear: axles, frame and four tyres.
    for (const x of [-L * 0.32, L * 0.32]) {
      s.cylinder(0.04, 0.04, D * 0.95, [x, 0.38, 0], dark, 10).rotation.x = Math.PI / 2;
      for (const z of [-D * 0.42, D * 0.42]) {
        const tyre = s.ring(0.29, 0.1, [x, 0.39, z], rubber);
        tyre.geometry.dispose();
        tyre.geometry = new THREE.TorusGeometry(0.29, 0.1, 12, 32);
        const hub = s.cylinder(0.22, 0.22, 0.14, [x, 0.39, z], rim, 18);
        hub.rotation.x = Math.PI / 2;
        s.cylinder(0.06, 0.06, 0.17, [x, 0.39, z], dark, 10).rotation.x = Math.PI / 2;
        // Tread lugs.
        for (let i = 0; i < 14; i++) {
          const ang = (i / 14) * Math.PI * 2;
          const lug = s.box([0.05, 0.03, 0.18], [x + Math.cos(ang) * 0.385, 0.39 + Math.sin(ang) * 0.385, z], rubber);
          lug.rotation.z = ang + Math.PI / 2;
        }
      }
    }
    for (const z of [-D * 0.3, D * 0.3]) s.box([L * 0.9, 0.12, 0.1], [0, deckY - 0.17, z], painted);
    s.box([0.12, 0.2, D * 0.7], [-L * 0.32, 0.55, 0], dark);
    s.box([0.12, 0.2, D * 0.7], [L * 0.32, 0.55, 0], dark);

    // The deck: planks with gaps.
    const planks = 12;
    for (let i = 0; i < planks; i++) {
      const z = -D / 2 + (i + 0.5) * (D / planks);
      s.box([L, 0.05, D / planks - 0.012], [0, deckY - 0.025, z], i % 4 === 0 ? s.material('#8a6e4c', { roughness: 0.9 }) : boards);
    }
    s.box([L + 0.04, 0.12, 0.06], [0, deckY - 0.08, D / 2 + 0.01], painted);
    s.box([L + 0.04, 0.12, 0.06], [0, deckY - 0.08, -D / 2 - 0.01], painted);
    s.box([0.06, 0.12, D], [L / 2 + 0.01, deckY - 0.08, 0], painted);
    s.box([0.06, 0.12, D], [-L / 2 - 0.01, deckY - 0.08, 0], painted);

    // Sides.
    const railTop = deckY + (a.sides === 'stakes' ? 0.75 : a.sides === 'planks' ? 0.42 : 0);
    const topRail: THREE.Vector3[] = [];
    if (a.sides === 'stakes') {
      const stakes = 6;
      for (const z of [-D / 2, D / 2]) {
        for (let i = 0; i < stakes; i++) {
          const x = -L / 2 + 0.05 + i * (L - 0.1) / (stakes - 1);
          s.box([0.08, 0.8, 0.07], [x, deckY + 0.38, z], painted);
          if (z > 0) topRail.push(new THREE.Vector3(x, railTop + 0.02, z + 0.04));
        }
        for (const y of [deckY + 0.3, deckY + 0.62]) s.box([L, 0.13, 0.04], [0, y, z + (z > 0 ? -0.04 : 0.04)], boards);
      }
      for (let i = 0; i < 4; i++) {
        const z = -D / 2 + 0.05 + i * (D - 0.1) / 3;
        s.box([0.07, 0.8, 0.08], [-L / 2, deckY + 0.38, z], painted);
      }
      for (const y of [deckY + 0.3, deckY + 0.62]) s.box([0.04, 0.13, D], [-L / 2 + 0.04, y, 0], boards);
    } else if (a.sides === 'planks') {
      for (const z of [-D / 2, D / 2]) {
        s.box([L, 0.42, 0.05], [0, deckY + 0.21, z], painted);
        s.box([L + 0.04, 0.05, 0.08], [0, deckY + 0.43, z], s.material(hex.clone().multiplyScalar(0.75)));
      }
      s.box([0.05, 0.42, D], [-L / 2, deckY + 0.21, 0], painted);
      for (let i = 0; i < 6; i++) topRail.push(new THREE.Vector3(-L / 2 + i * L / 5, railTop + 0.04, D / 2 + 0.04));
    }

    // Hitch tongue: an A-frame drawbar to a ring.
    if (a.hitch) {
      const tongueEnd = new THREE.Vector3(L / 2 + 1.6, 0.48, 0);
      for (const z of [-0.4, 0.4]) s.rod([L * 0.32, 0.5, z], tongueEnd.toArray() as [number, number, number], 0.04, painted);
      s.rod([L / 2 + 1.3, 0.48, 0], [L / 2 + 1.75, 0.46, 0], 0.035, dark);
      s.ring(0.07, 0.02, [L / 2 + 1.8, 0.46, 0], dark).rotation.x = Math.PI / 2;
      s.rod([L / 2 + 1.5, 0.46, 0], [L / 2 + 1.5, 0, 0.05], 0.025, dark);
    } else {
      s.rod([L * 0.32, 0.5, 0], [L / 2 + 0.35, 0.45, 0], 0.04, painted);
      s.box([0.1, 0.06, 0.12], [L / 2 + 0.4, 0.45, 0], dark);
    }

    // Bales: two rows of benches facing inward, a stack at the back.
    const dull = a.bales === 'dulled' ? 0.75 : 0;
    const baleL = 0.9, baleH = 0.36, baleD = 0.46;
    const benchCount = Math.floor((L - 0.2) / (baleL + 0.04));
    const balePositions: THREE.Vector3[] = [];
    const broken = new Set<number>();
    for (const z of [-D / 2 + baleD / 2 + 0.08, D / 2 - baleD / 2 - 0.08]) {
      for (let i = 0; i < benchCount; i++) {
        const x = -L / 2 + 0.15 + baleL / 2 + i * (baleL + 0.04) + (random() - 0.5) * 0.04;
        const index = balePositions.length;
        if (a.bales === 'broken' && random() < 0.3) { broken.add(index); balePositions.push(new THREE.Vector3(x, deckY, z)); continue; }
        hayBale(s, [x, deckY, z], random, { size: [baleL, baleH, baleD], dull, turn: (random() - 0.5) * 0.08 });
        balePositions.push(new THREE.Vector3(x, deckY + baleH, z));
      }
    }
    // A back rest stacked two high against the front of the bed.
    for (let j = 0; j < 2; j++) hayBale(s, [-L / 2 + baleD / 2 + 0.1, deckY + j * baleH, 0], random, { size: [baleL * 1.1, baleH, baleD], dull, turn: Math.PI / 2 + (random() - 0.5) * 0.06 });
    if (a.bales === 'broken' || mood.wear > 0.5) {
      const loose = s.material('#ffffff', { map: strawTexture(random, '#d8b45c', dull), roughness: 1 });
      const strands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.008, 0.012), loose, 200);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 200; i++) {
        const p = balePositions[Math.floor(random() * balePositions.length)];
        const heap = broken.size > 0 && random() < 0.7;
        const base = heap ? [...broken][Math.floor(random() * broken.size)] : -1;
        const c = base >= 0 ? balePositions[base] : p;
        e.set((random() - 0.5) * 0.6, random() * 6, (random() - 0.5) * 0.6);
        m.compose(new THREE.Vector3(c.x + (random() - 0.5) * 1.1, deckY + 0.01 + (heap ? random() * 0.12 : 0), (base >= 0 ? c.z : (random() - 0.5) * D * 0.8) + (random() - 0.5) * 0.5), q.setFromEuler(e), new THREE.Vector3(1, 1, 1));
        strands.setMatrixAt(i, m);
      }
      strands.castShadow = strands.receiveShadow = true;
      s.root.add(strands);
    }
    const seats = balePositions.filter((_p, i) => !broken.has(i));

    // What was left behind.
    if (a.left === 'blankets') {
      for (let k = 0; k < 2; k++) {
        const seat = seats[Math.floor(random() * seats.length)];
        if (!seat) break;
        const colour = ['#a0281e', '#2a5a3a', '#2a3a6a', '#c88a2a'][Math.floor(random() * 4)];
        s.drape({ size: [baleL * 1.1, baleD * 1.6], at: [seat.x, seat.y + 0.25, seat.z], over: [{ box: [baleL, baleH, baleD], at: [seat.x, seat.y - baleH / 2, seat.z] }], floor: deckY, stiffness: 0.3, rumple: 0.5, detail: 20 }, s.material('#ffffff', { map: plaidTexture(colour), side: THREE.DoubleSide, roughness: 0.95 }));
      }
    } else if (a.left === 'cups') {
      const paper = s.material('#f2ecdc', { roughness: 0.8 });
      for (let k = 0; k < 4; k++) {
        const seat = seats[Math.floor(random() * seats.length)];
        if (!seat) break;
        const cup = s.cylinder(0.045, 0.034, 0.11, [seat.x + (random() - 0.5) * 0.6, seat.y + 0.055, seat.z + (random() - 0.5) * 0.2], paper, 12);
        if (random() < 0.3) { cup.rotation.z = Math.PI / 2; cup.position.y = seat.y + 0.045; }
        s.cylinder(0.04, 0.04, 0.005, [cup.position.x, cup.position.y + 0.05, cup.position.z], s.material('#8a4a1a'), 12);
      }
      const seat = seats[Math.floor(random() * seats.length)];
      if (seat) {
        const mitten = s.ball([0.07, 0.03, 0.1], [seat.x, seat.y + 0.03, seat.z], s.material(['#c82a3a', '#2a6ab0', '#e8b52c'][Math.floor(random() * 3)], { roughness: 1 }), 12);
        mitten.rotation.y = random() * 3;
        s.ball([0.03, 0.025, 0.04], [seat.x + 0.06, seat.y + 0.03, seat.z + 0.05], mitten.material as THREE.Material, 8);
      }
    }

    // Pumpkins.
    if (a.cargo === 'pumpkins' || a.cargo === 'festival') {
      const stemMat = s.material('#6e6236');
      const n = 3 + Math.floor(random() * 3);
      for (let k = 0; k < n; k++) {
        const onSeat = k < 2 && seats.length > 0;
        const seat = onSeat ? seats[Math.floor(random() * seats.length)] : null;
        const r = 0.13 + random() * 0.08;
        const at = seat ? new THREE.Vector3(seat.x + (random() - 0.5) * 0.4, seat.y, seat.z) : new THREE.Vector3(-L / 2 + 0.9 + random() * (L - 1.4), deckY, (random() - 0.5) * 0.5);
        const p = pumpkin(s, { radius: r, height: r * 1.4, ribs: 10, groove: 0.8, color: new THREE.Color('#e2701a').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.1), slump: 0.2 }, random);
        p.mesh.position.copy(at);
        stem(s, p.topAt.clone().add(at), 0.06, 0.015, stemMat, random);
      }
    }
    // Hand-painted sign on the near side.
    if (a.cargo === 'sign' || a.cargo === 'festival') {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#efe6cc'; ctx.fillRect(0, 0, 512, 200);
      ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 502, 190);
      ctx.fillStyle = '#b8261c'; ctx.font = 'bold 92px cursive, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(256, 80); ctx.rotate(-0.03); ctx.fillText('HAYRIDES', 0, 0, 480); ctx.restore();
      ctx.fillStyle = '#1e3a20'; ctx.font = 'bold 70px cursive, serif'; ctx.fillText('$5', 256, 158);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const board = s.mesh(new THREE.PlaneGeometry(1.3, 0.5), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), [L * 0.12, deckY + (a.sides === 'open' ? -0.05 : 0.38), D / 2 + 0.07]);
      board.rotation.z = (random() - 0.5) * 0.08;
      if (a.sides === 'open') board.position.y = deckY - 0.3;
      s.box([1.34, 0.54, 0.02], [board.position.x, board.position.y, D / 2 + 0.055], boards).rotation.z = board.rotation.z;
    }
    // String lights swagged between the stakes.
    const bulbs: THREE.Mesh[] = [];
    if (a.cargo === 'lights' || a.cargo === 'festival') {
      const anchors = topRail.length ? topRail : [-L / 2, -L / 6, L / 6, L / 2].map((x) => new THREE.Vector3(x, deckY + 0.05, D / 2 + 0.05));
      const glow = s.material('#ffb347', { emissive: '#ff8a1a', emissiveIntensity: mix(1, 2.6, mood.cheer) });
      const cord = s.material('#1a1a1a');
      for (let i = 0; i < anchors.length - 1; i++) {
        const p0 = anchors[i], p1 = anchors[i + 1];
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 8; k++) {
          const f = k / 8;
          pts.push([mix(p0.x, p1.x, f), mix(p0.y, p1.y, f) - Math.sin(f * Math.PI) * 0.16, mix(p0.z, p1.z, f) + 0.01]);
        }
        s.tube(pts, 0.006, cord);
        for (let k = 1; k < 8; k += 2) {
          const [x, y, z] = pts[k];
          bulbs.push(s.ball([0.03, 0.042, 0.03], [x, y - 0.04, z], glow, 8));
        }
      }
    }

    const twinkle = mood.energy;
    return s.finish({
      update: (_dt, time) => {
        if (!bulbs.length) return;
        const m = bulbs[0].material as THREE.MeshStandardMaterial;
        m.emissiveIntensity = mix(1, 2.6, mood.cheer) * (1 - twinkle * 0.25 + Math.sin(time * (2 + twinkle * 6)) * twinkle * 0.25);
      },
    });
  },
});
