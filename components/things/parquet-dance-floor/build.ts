import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { paint } from './helpers';

const TAU = Math.PI * 2;
type P3 = [number, number, number];

export default defineThing({
  questions: {
    finish: choice('What is the floor made of?', {
      oak: 'Honey oak parquet in basket-weave squares, the classic hire floor.',
      walnut: 'Dark walnut herringbone, expensive and glossy.',
      chequer: 'Black-and-white chequerboard tiles.',
      lightup: 'Light-up disco tiles glowing in different colours.',
      white: 'Gloss white panels with the couple\'s monogram in the centre.',
      plywood: 'Bare plywood sheets laid straight on the grass, a festival wedding.',
    }),
    size: score('How big is the floor?', ['A tiny square for two', 'Room for a dozen', 'Big enough for a ceilidh']),
    aftermath: choice('What have the dancers left on it?', {
      spotless: 'Nothing: polished and spotless before the first dance.',
      heels: 'Scattered confetti and a pair of kicked-off high heels.',
      bouquet: 'A dropped bouquet in a drift of petals.',
      jacket: 'A discarded suit jacket, a tie and one shoe.',
      spill: 'A tipped glass and a spreading spill, with a mop and bucket standing by.',
      balloons: 'Balloons, some burst, and tangles of paper streamers.',
    }),
    rig: choice('What is playing the music at the edge?', {
      decks: 'A DJ table with decks and a laptop, a speaker on a tripod either side.',
      booth: 'A glowing white DJ booth under a truss of coloured lights.',
      speaker: 'Just a bluetooth speaker and a phone left on a folding chair.',
      gramophone: 'A wind-up gramophone with a brass horn on a little side table.',
    }),
    mirrorball: noul('Is there a mirror ball turning overhead?'),
    flipflops: noul('Is there a basket of flip-flops at the edge for tired feet?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const n = 3 + Math.round(a.size * 2), W = n * 0.82, half = W / 2, TH = a.finish === 'plywood' ? 0.02 : 0.035;

    interface Item { p: P3; s: P3 | number; c: THREE.ColorRepresentation; r?: P3 }
    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], shadow = true) => {
      if (!items.length) { geometry.dispose(); material.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      items.forEach((it, k) => {
        if (it.r) q.setFromEuler(e.set(it.r[0], it.r[1], it.r[2], 'YXZ')); else q.identity();
        const sc = typeof it.s === 'number' ? [it.s, it.s, it.s] as P3 : it.s;
        m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...sc));
        mesh.setMatrixAt(k, m);
        mesh.setColorAt(k, new THREE.Color(it.c));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const plain = () => new THREE.MeshStandardMaterial({ roughness: 0.75 });

    // Paint the floor.
    const initials = `${pick('ABCDEFGHJKLMNRST'.split(''))} & ${pick('ABCDEHJKLMNOPRSTW'.split(''))}`;
    const S = 1024, cell = S / n;
    const glowHue = () => (mood.warmth > 0.5 ? mix(0.9, 1.14, random()) % 1 : mix(0.48, 0.8, random()));
    const top = paint(S, S, (ctx) => {
      const shade = (base: string, amt: number) => { const c = new THREE.Color(base); c.offsetHSL(0, 0, (random() - 0.5) * amt); return `#${c.getHexString()}`; };
      if (a.finish === 'oak') {
        const q = cell / 4, slats = 4;
        for (let i = 0; i < n * 4; i++) for (let j = 0; j < n * 4; j++) for (let k = 0; k < slats; k++) {
          ctx.fillStyle = shade('#c58f4e', 0.14);
          if ((i + j) % 2) ctx.fillRect(i * q + k * q / slats, j * q, q / slats - 1, q - 1); else ctx.fillRect(i * q, j * q + k * q / slats, q - 1, q / slats - 1);
        }
      } else if (a.finish === 'walnut') {
        ctx.fillStyle = '#3a2416'; ctx.fillRect(0, 0, S, S);
        const bw = 16, bl = 64;
        for (let col = -2; col < S / (bl * 1.414) + 2; col++) for (let row = -6; row < S / (bw * 1.414) + 6; row++) {
          ctx.save();
          ctx.translate(col * bl * 0.707 * 2, row * bw * 1.414);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = shade('#5a3a24', 0.07); ctx.fillRect(0, 0, bl - 1.5, bw - 1.5);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = shade('#62412a', 0.07); ctx.fillRect(-bl, 0, bl - 1.5, bw - 1.5);
          ctx.restore();
        }
      } else if (a.finish === 'chequer') {
        const q = cell / 2;
        for (let i = 0; i < n * 2; i++) for (let j = 0; j < n * 2; j++) { ctx.fillStyle = (i + j) % 2 ? shade('#17171a', 0.03) : shade('#f1eee4', 0.04); ctx.fillRect(i * q, j * q, q, q); }
      } else if (a.finish === 'lightup') {
        ctx.fillStyle = '#101014'; ctx.fillRect(0, 0, S, S);
        const q = cell / 2;
        for (let i = 0; i < n * 2; i++) for (let j = 0; j < n * 2; j++) {
          const off = random() < (1 - mood.cheer) * 0.45;
          const c = new THREE.Color().setHSL(glowHue(), 0.9, off ? 0.12 : 0.55);
          const g = ctx.createRadialGradient(i * q + q / 2, j * q + q / 2, 2, i * q + q / 2, j * q + q / 2, q * 0.75);
          g.addColorStop(0, `#${c.clone().offsetHSL(0, 0, off ? 0.03 : 0.25).getHexString()}`); g.addColorStop(1, `#${c.getHexString()}`);
          ctx.fillStyle = g; ctx.fillRect(i * q + 4, j * q + 4, q - 8, q - 8);
        }
      } else if (a.finish === 'white') {
        ctx.fillStyle = '#f4f2ec'; ctx.fillRect(0, 0, S, S);
        ctx.strokeStyle = '#b89a52'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.2, 0, TAU); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(S / 2, S / 2, S * 0.225, 0, TAU); ctx.stroke();
        ctx.fillStyle = '#b89a52'; ctx.font = `italic bold ${S * 0.13}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initials, S / 2, S / 2 + 6);
      } else {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          ctx.fillStyle = shade('#d9bf8a', 0.08); ctx.fillRect(i * cell, j * cell, cell, cell);
          ctx.strokeStyle = 'rgba(150,110,60,0.35)'; ctx.lineWidth = 2;
          for (let k = 0; k < 7; k++) { ctx.beginPath(); const y = j * cell + random() * cell; ctx.moveTo(i * cell, y); ctx.bezierCurveTo(i * cell + cell * 0.3, y + 14, i * cell + cell * 0.6, y - 14, i * cell + cell, y + 6); ctx.stroke(); }
          ctx.fillStyle = 'rgba(110,75,40,0.6)'; ctx.beginPath(); ctx.ellipse(i * cell + random() * cell, j * cell + random() * cell, 9, 5, 0, 0, TAU); ctx.fill();
        }
      }
      // Panel seams and scuffs.
      ctx.strokeStyle = a.finish === 'lightup' ? '#05050a' : 'rgba(40,28,18,0.55)'; ctx.lineWidth = a.finish === 'plywood' ? 6 : 3;
      for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, S); ctx.moveTo(0, i * cell); ctx.lineTo(S, i * cell); ctx.stroke(); }
      ctx.lineWidth = 2;
      for (let k = 0; k < mood.wear * 90; k++) { ctx.strokeStyle = `rgba(${a.finish === 'walnut' || a.finish === 'lightup' ? '230,230,230' : '50,45,40'},${0.15 + random() * 0.25})`; ctx.beginPath(); ctx.arc(random() * S, random() * S, 20 + random() * 90, random() * TAU, random() * TAU + 1); ctx.stroke(); }
    });
    const lit = a.finish === 'lightup';
    const floorMat = new THREE.MeshStandardMaterial({ map: top, roughness: a.finish === 'plywood' ? 0.9 : mix(0.25, 0.6, mood.wear), ...(lit ? { emissiveMap: top, emissive: new THREE.Color('#ffffff'), emissiveIntensity: mix(0.45, 1.1, mood.cheer) } : {}) });
    const side = s.material(a.finish === 'plywood' ? '#c9ad78' : '#3a3026');
    const floor = s.box([W, TH, W], [0, TH / 2, 0], side);
    (floor as THREE.Mesh).material = [side, side, floorMat, side, side, side];
    if (a.finish !== 'plywood') {
      const trim = s.material('#b9bdc0', { metalness: 0.8, roughness: 0.35 });
      for (const [x, z, ry] of [[0, half + 0.05, 0], [0, -half - 0.05, Math.PI], [half + 0.05, 0, Math.PI / 2], [-half - 0.05, 0, -Math.PI / 2]] as const) {
        const ramp = s.box([W + 0.2, 0.012, 0.115], [x, TH / 2, z], trim);
        ramp.rotation.set(0.31, ry, 0, 'YXZ');
      }
    } else for (let k = 0; k < n; k++) s.box([0.09, 0.05, W + 0.3], [-half + 0.41 + k * 0.82, -0.005, 0], s.material('#9a8156'));

    // The music.
    const rz = -half - 0.75;
    const dark = s.material('#1b1b1f', { roughness: 0.6 }), steel = s.material('#8d9296', { metalness: 0.7, roughness: 0.4 });
    const glows: THREE.MeshStandardMaterial[] = [];
    const glow = (hue: number, intensity = 1.6) => { const c = new THREE.Color().setHSL(hue % 1, 0.9, 0.6); const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: intensity * mix(0.5, 1, mood.cheer) }); glows.push(m); return m; };
    const speakerBox = (x: number, y: number, z: number, ry: number) => {
      const g = new THREE.Group();
      g.add(s.box([0.42, 0.68, 0.36], [0, 0, 0], dark));
      for (const [yy, r] of [[-0.12, 0.15], [0.2, 0.07]] as const) { const cone = s.cylinder(r, r * 0.6, 0.03, [0, yy, 0.185], s.material('#3a3a40'), 20); cone.rotation.x = Math.PI / 2; g.add(cone); }
      g.position.set(x, y, z); g.rotation.y = ry;
      s.root.add(g);
    };
    const deckTop = (y: number, wide: number) => {
      s.box([wide * 0.62, 0.05, 0.36], [0, y + 0.025, rz], s.material('#2a2a30', { metalness: 0.4, roughness: 0.4 }));
      for (const ex of [-1, 1]) { s.cylinder(0.12, 0.12, 0.012, [ex * wide * 0.2, y + 0.056, rz], s.material('#0e0e10', { roughness: 0.3 }), 24); s.cylinder(0.04, 0.04, 0.014, [ex * wide * 0.2, y + 0.058, rz], glow(mood.warmth > 0.5 ? 0.05 : 0.55, 1), 12); }
      for (let k = 0; k < 4; k++) s.cylinder(0.012, 0.012, 0.02, [-0.06 + k * 0.04, y + 0.06, rz - 0.06], steel, 8);
      const lid = s.box([0.32, 0.21, 0.012], [wide * 0.4, y + 0.12, rz - 0.1], steel);
      lid.rotation.x = -0.2;
      s.box([0.32, 0.014, 0.22], [wide * 0.4, y + 0.007, rz + 0.02], steel);
      s.ring(0.07, 0.012, [-wide * 0.4, y + 0.02, rz + 0.05], dark, Math.PI).rotation.set(0, 0.5, 0);
    };
    if (a.rig === 'decks') {
      s.box([1.7, 0.03, 0.62], [0, 0.9, rz], dark);
      s.box([1.7, 0.86, 0.02], [0, 0.45, rz + 0.3], s.material('#101013', { roughness: 0.9 }));
      for (const ex of [-1, 1]) for (const ez of [-1, 1]) s.cylinder(0.02, 0.02, 0.9, [ex * 0.8, 0.45, rz + ez * 0.27], steel, 8);
      deckTop(0.915, 1.7);
      for (const ex of [-1, 1]) {
        const x = ex * Math.min(half - 0.1, 1.5);
        s.cylinder(0.02, 0.02, 1.25, [x, 0.72, rz], steel, 8);
        for (let k = 0; k < 3; k++) { const th = k * TAU / 3 + 0.5; s.rod([x, 0.55, rz], [x + Math.sin(th) * 0.42, 0, rz + Math.cos(th) * 0.42], 0.012, steel); }
        speakerBox(x, 1.62, rz, ex * -0.25);
      }
    } else if (a.rig === 'booth') {
      const front = glow(mood.warmth > 0.5 ? 0.92 : 0.58, 0.9);
      s.box([1.9, 1.0, 0.06], [0, 0.5, rz + 0.33], front);
      for (const ex of [-1, 1]) { const wing = s.box([0.5, 1.0, 0.06], [ex * 1.17, 0.5, rz + 0.22], front); wing.rotation.y = ex * -0.45; }
      s.box([1.9, 0.04, 0.66], [0, 1.02, rz], s.material('#f1f1f1'));
      deckTop(1.04, 1.9);
      const truss = s.material('#c2c6c9', { metalness: 0.8, roughness: 0.35 });
      const tw = Math.max(2.6, W * 0.8);
      for (const ex of [-1, 1]) { s.box([0.12, 2.6, 0.12], [ex * tw / 2, 1.3, rz - 0.45], truss); s.box([0.5, 0.03, 0.5], [ex * tw / 2, 0.015, rz - 0.45], truss); }
      s.box([tw + 0.12, 0.12, 0.12], [0, 2.6, rz - 0.45], truss);
      for (let k = 0; k < Math.round(tw / 0.22); k++) s.rod([-tw / 2 + k * 0.22, 2.54, rz - 0.39], [-tw / 2 + k * 0.22 + 0.22, 2.66, rz - 0.39], 0.008, truss);
      const cans = 4 + Math.round(mood.density * 2);
      for (let k = 0; k < cans; k++) {
        const x = -tw / 2 + 0.3 + k * (tw - 0.6) / (cans - 1);
        const can = s.cylinder(0.09, 0.07, 0.2, [x, 2.42, rz - 0.38], dark, 14);
        can.rotation.x = 0.9;
        const lens = s.cylinder(0.08, 0.08, 0.02, [x, 2.35, rz - 0.3], glow(k / cans + mood.warmth * 0.3, 2.2), 14);
        lens.rotation.x = 0.9; lens.castShadow = false;
      }
      for (const ex of [-1, 1]) speakerBox(ex * (tw / 2 + 0.4), 0.34, rz - 0.1, ex * -0.3);
    } else if (a.rig === 'speaker') {
      const frame = s.material(pick(['#f4f2ea', '#2a2a2e', '#7a5230']));
      const cx = (random() - 0.5) * (W - 1.4), cz = rz + 0.3;
      for (const ex of [-1, 1]) { s.rod([cx + ex * 0.2, 0, cz + 0.22], [cx + ex * 0.2, 0.9, cz - 0.22], 0.014, frame); s.rod([cx + ex * 0.2, 0, cz - 0.2], [cx + ex * 0.2, 0.46, cz + 0.2], 0.014, frame); }
      s.box([0.42, 0.025, 0.4], [cx, 0.46, cz], frame);
      s.box([0.42, 0.2, 0.02], [cx, 0.8, cz - 0.19], frame).rotation.x = -0.2;
      const spk = s.cylinder(0.075, 0.075, 0.24, [cx - 0.05, 0.55, cz], s.material(pick(['#d23a3a', '#2f6fd6', '#1f1f24', '#2f9a7a'])), 20);
      spk.rotation.z = Math.PI / 2;
      s.cylinder(0.06, 0.06, 0.245, [cx - 0.05, 0.55, cz], glow(0.55, 0.6), 16).rotation.z = Math.PI / 2;
      s.box([0.075, 0.01, 0.15], [cx + 0.13, 0.478, cz + 0.08], dark).rotation.y = 0.4;
      s.box([0.065, 0.004, 0.13], [cx + 0.13, 0.485, cz + 0.08], glow(0.38, 0.7)).rotation.y = 0.4;
      s.tube([[cx + 0.13, 0.48, cz], [cx + 0.2, 0.3, cz - 0.3], [cx + 0.5, 0.01, cz - 0.4], [cx + 1.1, 0.01, cz - 0.2]], 0.006, s.material('#f1f1f1'));
    } else {
      const cx = (random() - 0.5) * (W - 1.6);
      s.cylinder(0.36, 0.36, 0.03, [cx, 0.7, rz], s.material('#6a4426'), 28);
      s.lathe([[0.3, 0], [0.26, 0.02], [0.04, 0.06], [0.04, 0.6], [0.09, 0.68], [0.3, 0.69]], s.material('#4a2e18'), [cx, 0, rz]);
      s.box([0.36, 0.14, 0.36], [cx, 0.785, rz], s.material('#5a3520', { roughness: 0.45 }));
      s.cylinder(0.15, 0.15, 0.01, [cx, 0.86, rz], s.material('#101012', { roughness: 0.25 }), 28);
      s.cylinder(0.05, 0.05, 0.012, [cx, 0.862, rz], s.material(pick(['#b3202e', '#d4ae52', '#2f6fd6'])), 16);
      const brass = s.material('#c9a03c', { metalness: 0.85, roughness: 0.28, side: THREE.DoubleSide });
      const horn = s.lathe([[0.015, 0], [0.02, 0.15], [0.05, 0.3], [0.12, 0.42], [0.24, 0.5], [0.3, 0.52]], brass, [cx - 0.12, 0.95, rz - 0.05]);
      horn.rotation.set(0.75, 0.5, -0.35);
      s.tube([[cx - 0.12, 0.96, rz - 0.05], [cx - 0.17, 0.92, rz - 0.14], [cx - 0.14, 0.86, rz - 0.16]], 0.016, brass);
      s.rod([cx + 0.18, 0.8, rz], [cx + 0.27, 0.8, rz], 0.008, brass);
      s.ball([0.02, 0.02, 0.02], [cx + 0.28, 0.83, rz], s.material('#2a1a10'));
      for (let k = 0; k < 5; k++) s.box([0.32, 0.006, 0.32], [cx + 0.7, 0.004 + k * 0.007, rz + 0.1], s.material(pick(['#d9cdb0', '#8a2f2b', '#27506b', '#c9a03c'])) ).rotation.y = random();
    }

    // Mirror ball and the specks of light it throws.
    let ball: THREE.Mesh | null = null;
    const specks = new THREE.Group();
    s.root.add(specks);
    if (a.mirrorball) {
      const px = -half - 0.35, pz = -half - 0.2;
      s.cylinder(0.03, 0.035, 3.0, [px, 1.5, pz], steel, 10);
      for (let k = 0; k < 3; k++) { const th = k * TAU / 3; s.rod([px, 0.5, pz], [px + Math.sin(th) * 0.6, 0, pz + Math.cos(th) * 0.6], 0.016, steel); }
      const reach = Math.min(1.5, half * 0.75);
      s.rod([px, 2.95, pz], [px + reach + 0.35, 3.0, pz + reach + 0.2], 0.022, steel);
      s.rod([px, 2.4, pz], [px + reach * 0.6, 2.98, pz + reach * 0.5], 0.012, steel);
      const bx = px + reach + 0.35, bz = pz + reach + 0.2;
      s.rod([bx, 3.0, bz], [bx, 2.72, bz], 0.004, steel);
      ball = s.mesh(new THREE.IcosahedronGeometry(0.24, 3), new THREE.MeshStandardMaterial({ color: '#e8eef2', metalness: 1, roughness: 0.12, flatShading: true, emissive: '#8fa0b0', emissiveIntensity: 0.25 }), [bx, 2.48, bz]);
      const dots: Item[] = [];
      for (let k = 0; k < 40 + mood.energy * 50; k++) { const th = random() * TAU, rr = Math.sqrt(random()) * (half - 0.1); dots.push({ p: [Math.sin(th) * rr, TH + 0.004, Math.cos(th) * rr], s: [0.04 + random() * 0.03, 0.001, 0.03 + random() * 0.02], c: '#ffffff', r: [0, th, 0] }); }
      const speckMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: new THREE.Color().setHSL(mix(0.6, 0.12, mood.warmth), 0.5, 0.8), emissiveIntensity: 1.6, transparent: true, opacity: 0.85, depthWrite: false });
      const mesh = inst(new THREE.CylinderGeometry(1, 1, 1, 8), speckMat, dots, false);
      if (mesh) specks.add(mesh);
    }

    // What the dancers left.
    const F = TH + 0.002;
    const spot = (r = half - 0.5): [number, number] => [(random() - 0.5) * 2 * r, (random() - 0.5) * 2 * r];
    const confetti = (count: number, colours: readonly string[], spreadOut = 0.5) => {
      const bits: Item[] = [];
      for (let k = 0; k < count; k++) { const x = (random() - 0.5) * (W + spreadOut), z = (random() - 0.5) * (W + spreadOut); bits.push({ p: [x, Math.abs(x) < half && Math.abs(z) < half ? F : 0.003, z], s: [0.035, 0.002, 0.022], c: pick(colours), r: [0, random() * TAU, 0] }); }
      inst(new THREE.BoxGeometry(1, 1, 1), plain(), bits, false);
    };
    const party = ['#f1c232', '#e23b6f', '#3a8fd9', '#3fae5a', '#ffffff', '#d4ae52', '#8a4fd0'];
    const shoe = (x: number, z: number, ry: number, lying: boolean, colour: string, heel: boolean) => {
      const g = new THREE.Group(), m = s.material(colour, { roughness: 0.35 });
      if (heel) {
        const sole = s.box([0.085, 0.012, 0.17], [0, 0.065, -0.03], m); sole.rotation.x = 0.5; g.add(sole);
        g.add(s.box([0.085, 0.012, 0.1], [0, 0.012, 0.09], m));
        g.add(s.box([0.09, 0.045, 0.07], [0, 0.035, 0.1], m));
        g.add(s.cylinder(0.012, 0.005, 0.11, [0, 0.055, -0.1], m, 8));
        g.add(s.box([0.085, 0.07, 0.012], [0, 0.135, -0.105], m));
      } else {
        g.add(s.box([0.1, 0.03, 0.29], [0, 0.015, 0], s.material('#15151a')));
        g.add(s.ball([0.052, 0.045, 0.1], [0, 0.05, 0.08], m));
        g.add(s.box([0.1, 0.07, 0.13], [0, 0.065, -0.07], m));
      }
      g.scale.setScalar(1.5);
      g.position.set(x, F + (lying ? 0.055 : 0), z);
      g.rotation.set(0, ry, lying ? Math.PI / 2 : 0, 'YXZ');
      s.root.add(g);
    };
    const flowers = ['#f3c6cc', '#fbeee6', '#e59aa8', '#d9788c', '#fbf9f2'];
    if (a.aftermath !== 'spotless') confetti(Math.round(mix(10, 60, mood.density)), party, 0.8);
    if (a.aftermath === 'heels') {
      confetti(Math.round(mix(260, 700, mood.density)), party, 1.0);
      const [x, z] = spot(half * 0.5), colour = pick(['#c9203a', '#d4ae52', '#e7c5b0', '#1b1b1f', '#c9d2d9']);
      shoe(x, z, random() * TAU, false, colour, true);
      shoe(x + 0.25 + random() * 0.4, z + (random() - 0.5) * 0.6, random() * TAU, true, colour, true);
    }
    if (a.aftermath === 'bouquet') {
      const [x, z] = spot(half * 0.45), ry = random() * TAU, items: Item[] = [], leaves: Item[] = [];
      const dx = Math.sin(ry), dz = Math.cos(ry);
      for (let k = 0; k < 34; k++) { const th = random() * TAU, rr = Math.sqrt(random()) * 0.17; items.push({ p: [x + Math.sin(th) * rr, F + 0.07 + (0.17 - rr) * 0.5, z + Math.cos(th) * rr], s: 0.04 + random() * 0.035, c: pick(flowers) }); }
      for (let k = 0; k < 10; k++) { const th = random() * TAU; leaves.push({ p: [x + Math.sin(th) * 0.19, F + 0.05, z + Math.cos(th) * 0.19], s: [0.11, 0.02, 0.055], c: pick(['#5c8046', '#4a6e3c']), r: [0, th, 0.4] }); }
      inst(new THREE.IcosahedronGeometry(1, 1), plain(), items);
      inst(new THREE.SphereGeometry(1, 6, 4), plain(), leaves);
      s.rod([x + dx * 0.12, F + 0.06, z + dz * 0.12], [x + dx * 0.48, F + 0.03, z + dz * 0.48], 0.035, s.material('#f6f3ea'), 0.025);
      for (const e of [-1, 1]) s.tube([[x + dx * 0.3, F + 0.05, z + dz * 0.3], [x + dx * 0.45 + e * dz * 0.2, F + 0.01, z + dz * 0.45 - e * dx * 0.2], [x + dx * 0.8 + e * dz * 0.25, F + 0.006, z + dz * 0.8 - e * dx * 0.1]], 0.012, s.material('#e7b3b8')).scale.y = 1;
      const petals: Item[] = [];
      for (let k = 0; k < mix(60, 160, mood.density); k++) { const th = random() * TAU, rr = 0.2 + Math.abs(random() + random() - 1) * 1.6; petals.push({ p: [x + Math.sin(th) * rr, F, z + Math.cos(th) * rr], s: [0.035, 0.004, 0.025], c: pick(flowers), r: [0, random() * TAU, 0] }); }
      inst(new THREE.SphereGeometry(1, 6, 4), plain(), petals, false);
    }
    if (a.aftermath === 'jacket') {
      const [x, z] = spot(half * 0.45), suit = pick(['#1f2a44', '#2a2a2e', '#55585c', '#6a4a3a']), cloth = s.material(suit, { roughness: 0.85 });
      const g = new THREE.Group();
      g.add(s.ball([0.34, 0.05, 0.42], [0, 0.04, 0], cloth));
      g.add(s.ball([0.2, 0.06, 0.3], [0.1, 0.07, -0.05], cloth));
      for (const e of [-1, 1]) { const sl = s.box([0.13, 0.05, 0.6], [e * 0.36, 0.03, 0.12 * e], cloth); sl.rotation.y = e * (0.5 + random() * 0.6); g.add(sl); g.add(s.box([0.11, 0.03, 0.05], [e * 0.36 + Math.sin(sl.rotation.y) * 0.31, 0.03, 0.12 * e + Math.cos(sl.rotation.y) * 0.31], s.material('#f4f2ea'))); }
      g.add(s.box([0.3, 0.012, 0.36], [-0.06, 0.085, 0.03], s.material(pick(['#8a2f3b', '#c9a85a', '#3a5a7a']), { roughness: 0.5 })));
      g.position.set(x, F, z); g.rotation.y = random() * TAU;
      s.root.add(g);
      const tx = x + 0.7 + random() * 0.5, tz = z + (random() - 0.5) * 1.0, tie = s.material(pick(['#b3202e', '#d4ae52', '#2f6fd6', '#5a2a6a', '#111111']));
      const strip = s.tube([[tx, 0, tz], [tx + 0.15, 0, tz + 0.12], [tx + 0.32, 0, tz + 0.02], [tx + 0.5, 0, tz + 0.16], [tx + 0.62, 0, tz + 0.1]], 0.03, tie);
      strip.scale.y = 0.2; strip.position.y = F + 0.008;
      s.ball([0.045, 0.012, 0.045], [tx, F + 0.01, tz], tie);
      shoe(x - 0.6 - random() * 0.5, z + 0.5 + random() * 0.4, random() * TAU, random() < 0.5, pick(['#1b1b1f', '#4a2a18']), false);
    }
    if (a.aftermath === 'spill') {
      const [x, z] = spot(half * 0.4), drink = pick(['#7a1528', '#e9c75a', '#f08a3c']);
      const wet = new THREE.MeshStandardMaterial({ color: drink, roughness: 0.05, transparent: true, opacity: 0.75, depthWrite: false });
      for (let k = 0; k < 5; k++) s.cylinder(0.18 + random() * 0.22, 0.2, 0.003, [x + (random() - 0.5) * 0.5, F, z + (random() - 0.5) * 0.5], wet, 20).scale.z = 0.6 + random() * 0.6;
      const gm = new THREE.MeshStandardMaterial({ color: '#e6f2f6', transparent: true, opacity: 0.5, roughness: 0.05, side: THREE.DoubleSide });
      const cup = s.lathe([[0, 0.002], [0.034, 0], [0.005, 0.008], [0.004, 0.09], [0.02, 0.1], [0.04, 0.14], [0.036, 0.2]], gm, [x - 0.2, F + 0.04, z + 0.1]);
      cup.rotation.set(0, random() * TAU, Math.PI / 2, 'YXZ');
      const shards: Item[] = [];
      for (let k = 0; k < 26; k++) shards.push({ p: [x + (random() - 0.5) * 0.9, F + 0.004, z + (random() - 0.5) * 0.9], s: [0.015 + random() * 0.02, 0.004, 0.01 + random() * 0.015], c: '#f4fbff', r: [0, random() * TAU, 0] });
      inst(new THREE.TetrahedronGeometry(1), new THREE.MeshStandardMaterial({ roughness: 0.05, metalness: 0.4 }), shards);
      const bx = x + 0.9, bz = z - 0.5;
      s.lathe([[0, 0], [0.15, 0], [0.19, 0.3], [0.2, 0.3], [0.17, 0.02], [0, 0.02]], s.material('#e8c62a', { side: THREE.DoubleSide }), [bx, F, bz]);
      s.rod([bx + 0.05, F + 0.1, bz], [bx + 0.5, F + 1.35, bz - 0.25], 0.016, s.material('#b08a52'));
      const strands: Item[] = [];
      for (let k = 0; k < 14; k++) strands.push({ p: [bx + 0.05 + (random() - 0.5) * 0.12, F + 0.14, bz + (random() - 0.5) * 0.12], s: [0.018, 0.12, 0.018], c: '#e9e6dc' });
      inst(new THREE.CylinderGeometry(1, 1, 1, 6), plain(), strands);
      const sign = s.material('#f2c81e', { side: THREE.DoubleSide });
      for (const e of [-1, 1]) { const leaf = s.box([0.3, 0.62, 0.012], [x + 0.2, F + 0.3, z + 0.75 + e * 0.1], sign); leaf.rotation.x = e * -0.33; }
      s.label('!', 0.2, 0.2, [x + 0.2, F + 0.36, z + 0.9], '#1b1b1f', '#f2c81e').rotation.x = -0.33;
    }
    if (a.aftermath === 'balloons') {
      const count = Math.round(mix(7, 18, mood.density)), flat: Item[] = [], round: Item[] = [];
      for (let k = 0; k < count; k++) {
        const [x, z] = spot(half - 0.25), c = pick(['#f6f3ea', '#d4ae52', '#e7b3b8', '#e23b6f', '#3a8fd9', '#ffffff']);
        if (random() < 0.3) flat.push({ p: [x, F + 0.006, z], s: [0.1, 0.006, 0.07], c, r: [0, random() * TAU, 0] });
        else { const r = 0.12 + random() * 0.04; round.push({ p: [x, F + r * 1.12, z], s: [r, r * 1.18, r], c }); round.push({ p: [x, F + 0.012, z], s: 0.014, c }); }
      }
      inst(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshStandardMaterial({ roughness: 0.18 }), round);
      inst(new THREE.SphereGeometry(1, 8, 6), plain(), flat, false);
      for (let k = 0; k < Math.round(mix(4, 10, mood.density)); k++) {
        const [x, z] = spot(half - 0.5), th = random() * TAU, pts: P3[] = [];
        for (let j = 0; j < 9; j++) pts.push([x + Math.sin(th) * j * 0.14 + Math.sin(j * 1.9) * 0.07, 0, z + Math.cos(th) * j * 0.14 + Math.cos(j * 1.7) * 0.07]);
        const st = s.tube(pts, 0.014, s.material(pick(party)));
        st.scale.y = 0.2; st.position.y = F + 0.004; st.castShadow = false;
      }
      confetti(Math.round(mix(80, 220, mood.density)), party);
    }

    // Flip-flop basket.
    if (a.flipflops) {
      const bx = half + 0.55, bz = half * 0.5;
      s.lathe([[0, 0], [0.24, 0], [0.3, 0.3], [0.31, 0.32], [0.27, 0.3], [0.22, 0.03], [0, 0.03]], s.material('#b08a52', { side: THREE.DoubleSide, roughness: 0.95 }), [bx, 0, bz]);
      const flops: Item[] = [];
      for (let k = 0; k < 14; k++) flops.push({ p: [bx + (random() - 0.5) * 0.36, 0.22 + random() * 0.16, bz + (random() - 0.5) * 0.36], s: [0.1, 0.014, 0.26], c: pick(['#ff5c8a', '#2fb5c9', '#f2c230', '#ffffff', '#3fae5a', '#1b1b1f']), r: [(random() - 0.5) * 1.6, random() * TAU, (random() - 0.5) * 1.2] });
      for (let k = 0; k < 2; k++) flops.push({ p: [bx - 0.45 + k * 0.14, 0.008, bz + 0.3 + k * 0.1], s: [0.1, 0.014, 0.26], c: '#ff5c8a', r: [0, 0.4 + k * 0.5, 0] });
      inst(new THREE.BoxGeometry(1, 1, 1), plain(), flops);
      s.rod([bx + 0.33, 0, bz - 0.2], [bx + 0.33, 0.75, bz - 0.2], 0.012, s.material('#7a5230'));
      s.label('DANCING SHOES', 0.5, 0.2, [bx + 0.33, 0.8, bz - 0.185], '#3a2a1a', '#f4ecd6');
    }

    const base = glows.map((m) => m.emissiveIntensity);
    return s.finish({
      update: (dt, time) => {
        const e = mood.energy;
        if (ball) ball.rotation.y += dt * mix(0.15, 1.2, e);
        specks.rotation.y += dt * mix(0.05, 0.5, e);
        if (lit) floorMat.emissiveIntensity = mix(0.45, 1.1, mood.cheer) * (1 + Math.sin(time * mix(1, 7, e)) * 0.3 * e);
        glows.forEach((m, k) => { m.emissiveIntensity = base[k] * (1 + Math.sin(time * mix(1.5, 8, e) + k * 1.7) * 0.4 * e); });
      },
    });
  },
});
