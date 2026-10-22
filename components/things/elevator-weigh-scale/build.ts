import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PRICES = {
  boom: 'Boom: high prices written large with arrows up and an exclamation mark.',
  steady: 'An ordinary day: three neat rows of grades and prices.',
  bust: 'Bust: prices crossed out and rewritten lower and lower.',
  erased: 'Wiped to a grey smear, only ghosts of numbers left.',
  closed: 'One chalked word: CLOSED.',
} as const;
const PAINTS = {
  red: 'Boxcar red with white trim, matching the elevator.',
  white: 'White clapboard with green trim.',
  green: 'Dark co-op green.',
  grey: 'Unpainted boards weathered silver-grey.',
} as const;
const PAINT_TINT: Record<keyof typeof PAINTS, [string, string]> = { red: ['#8a3423', '#e9e3d2'], white: ['#e6e1d2', '#3d5a47'], green: ['#3c6649', '#e9e3d2'], grey: ['#8d877c', '#5d574e'] };
type P = readonly [number, number, number];

export default defineThing({
  questions: {
    prices: choice('What is chalked on the price board?', PRICES),
    indicator: choice('What reads the weight in the window?', {
      beam: 'A long brass weigh beam with sliding poises.',
      dial: 'A big round dial with a red needle.',
    }),
    weight: score('What is the scale reading right now?', ['Nothing: balanced at zero', 'A light load', 'A full truck', 'Pegged at the limit']),
    lit: noul('Is the lamp on inside the scale house?'),
    sill: choice('What was left on the window sill?', {
      ticket: 'One last weigh ticket, curling.',
      stack: 'A stack of tickets pinned under a stone.',
      mug: 'An enamel coffee mug.',
      cap: 'A seed-company cap.',
      nothing: 'Nothing at all.',
    }),
    platform: choice('What is on the platform?', {
      empty: 'Nothing: bare planks.',
      sacks: 'A few sacks of grain being check-weighed.',
      cans: 'Two milk cans and a crate.',
      spill: 'A trail of spilled wheat and tyre marks.',
      bicycle: 'A child’s bicycle laid down on the deck.',
    }),
    paint: choice('How is the scale house painted?', PAINTS),
    deck: choice('What is the platform decked with?', {
      planks: 'Thick timber planks, grey and splintered.',
      steel: 'Steel plate with a dark frame.',
      concrete: 'A poured concrete slab.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const [wallHex, trimHex] = PAINT_TINT[a.paint];
    const wallTint = new THREE.Color(wallHex).lerp(new THREE.Color('#8f887b'), wear * 0.4);
    const boards = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${wallTint.getHexString()}`;
      ctx.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 16; i++) {
        ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${random() * (0.05 + wear * 0.2)})`;
        ctx.fillRect(0, i * 16, 128, 16);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, i * 16 + 14, 128, 2);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
    })();
    const trim = s.material(trimHex);
    const dark = s.material('#1f1d1b', { roughness: 1 });
    const iron = s.material('#3a3d40', { metalness: 0.4, roughness: 0.6 });
    const brass = s.material('#c9a24a', { metalness: 0.5, roughness: 0.35, emissive: '#6b4a10', emissiveIntensity: 0.25 });
    const timber = s.material('#8c8172');
    const lampOn = a.lit;
    const glow = lampOn ? mix(1.3, 0.55, Math.sin(mood.daylight * Math.PI)) : 0;
    const inside = s.material(lampOn ? '#e9c98a' : '#4a4640', { emissive: '#ffcf7a', emissiveIntensity: glow * 0.7, roughness: 1 });

    // Scale house: real walls with a real window opening so the beam sits inside.
    const W = 4, D = 2.5, H = 2.7, hz = -2.3, front = hz + D / 2;
    const wx = -0.85, ww = 1.9, wy = 1.0, wh = 1.25;
    s.box([W, H, 0.1], [0, H / 2, hz - D / 2], boards);
    for (const x of [-1, 1]) s.box([0.1, H, D], [x * (W / 2 - 0.05), H / 2, hz], boards);
    s.box([W, wy, 0.1], [0, wy / 2, front], boards);
    s.box([W, H - wy - wh, 0.1], [0, (H + wy + wh) / 2, front], boards);
    const leftW = wx - ww / 2 + W / 2, rightW = W / 2 - (wx + ww / 2);
    s.box([leftW, wh, 0.1], [-W / 2 + leftW / 2, wy + wh / 2, front], boards);
    s.box([rightW, wh, 0.1], [W / 2 - rightW / 2, wy + wh / 2, front], boards);
    s.box([W - 0.2, 0.06, D - 0.2], [0, 0.2, hz], s.material('#6f6253'));
    s.box([W - 0.2, H - 0.3, 0.04], [0, H / 2, hz - D / 2 + 0.08], inside);
    s.box([W - 0.2, 0.04, D - 0.2], [0, H - 0.05, hz], inside);
    // Window frame, mullion, sill.
    for (const x of [-1, 1]) s.box([0.09, wh + 0.18, 0.16], [wx + x * (ww / 2 + 0.02), wy + wh / 2, front + 0.02], trim);
    s.box([ww + 0.22, 0.09, 0.16], [wx, wy + wh + 0.05, front + 0.02], trim);
    s.box([ww + 0.4, 0.07, 0.34], [wx, wy - 0.03, front + 0.1], trim);
    s.box([0.04, wh, 0.05], [wx, wy + wh / 2, front + 0.02], trim);
    const pane = new THREE.MeshStandardMaterial({ color: '#cfe0e6', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false });
    s.box([ww, wh, 0.02], [wx, wy + wh / 2, front], pane).castShadow = false;
    // Roof with an overhang toward the platform, stovepipe, door on the side.
    const gable = new THREE.Shape([new THREE.Vector2(-D / 2 - 0.25, 0), new THREE.Vector2(D / 2 + 0.22, 0), new THREE.Vector2(D / 2 + 0.22, 0.07), new THREE.Vector2(0, 0.6), new THREE.Vector2(-D / 2 - 0.25, 0.07)]);
    const roofGeo = new THREE.ExtrudeGeometry(gable, { depth: W + 0.5, bevelEnabled: false });
    const roof = s.mesh(roofGeo, s.material(a.paint === 'white' ? '#3d5a47' : '#4a433c'), [(W + 0.5) / 2, H, hz]);
    roof.rotation.y = -Math.PI / 2;
    s.cylinder(0.08, 0.08, 1.1, [1.3, H + 0.9, hz - 0.5], iron, 8);
    s.cylinder(0.13, 0.08, 0.1, [1.3, H + 1.48, hz - 0.5], iron, 8);
    s.box([0.06, 1.95, 0.85], [W / 2 + 0.01, 1.18, hz + 0.2], trim);
    s.box([0.07, 0.5, 0.45], [W / 2 + 0.02, 1.6, hz + 0.2], lampOn ? inside : dark);
    s.box([0.5, 0.18, 0.9], [W / 2 + 0.3, 0.1, hz + 0.2], timber);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.1, H, 0.1], [x * (W / 2), H / 2, hz + z * (D / 2)], trim);
    s.label(a.indicator === 'dial' ? 'SCALE' : 'WEIGH HERE', a.indicator === 'dial' ? 1.0 : 1.5, 0.26, [wx, wy + wh + 0.3, front + 0.06], trimHex, `#${wallTint.getHexString()}`);

    // The indicator, inside the window.
    const iz = front - 0.42;
    s.box([ww + 0.5, 0.06, 0.6], [wx, wy - 0.02, iz], timber);
    const needle = new THREE.Group();
    const load = mix(0, 1, a.weight);
    if (a.indicator === 'beam') {
      s.box([0.12, 0.72, 0.12], [wx - 0.62, wy + 0.36, iz], iron);
      s.box([0.5, 0.06, 0.2], [wx - 0.62, wy + 0.03, iz], iron);
      needle.position.set(wx - 0.62, wy + 0.72, iz + 0.02);
      const bar = (y: number, length: number, weightAt: number) => {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, 0.035), brass);
        beam.position.set(length / 2 - 0.18, y, 0);
        const poise = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.09, 12), iron);
        poise.rotation.x = Math.PI / 2;
        poise.position.set(0.1 + weightAt * (length - 0.4), y - 0.02, 0);
        needle.add(beam, poise);
      };
      bar(0, 1.5, load);
      bar(0.16, 1.1, random());
      const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 5), iron);
      hook.position.set(1.3, -0.2, 0);
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03 + load * 0.12, 12), iron);
      pan.position.set(1.3, -0.4, 0);
      needle.add(hook, pan);
      needle.rotation.z = mix(-0.09, 0.09, load > 0.92 ? 1 : load * 0.6 + 0.2);
      // Trig loop that limits the beam's travel.
      s.box([0.05, 0.4, 0.05], [wx + 0.78, wy + 0.72, iz - 0.06], iron);
    } else {
      s.box([0.34, 0.5, 0.26], [wx, wy + 0.25, iz], s.material('#35503f'));
      const face = s.cylinder(0.5, 0.5, 0.1, [wx, wy + 0.62, iz], s.material('#35503f'), 28);
      face.rotation.x = Math.PI / 2;
      const dial = s.cylinder(0.45, 0.45, 0.02, [wx, wy + 0.62, iz + 0.06], s.material('#f1ecdc', { emissive: '#ffe9b0', emissiveIntensity: glow * 0.4 }), 28);
      dial.rotation.x = Math.PI / 2;
      for (let i = 0; i < 20; i++) {
        const t = (i / 20) * Math.PI * 2;
        s.box([0.015, i % 5 ? 0.05 : 0.1, 0.01], [wx + Math.sin(t) * 0.38, wy + 0.62 + Math.cos(t) * 0.38, iz + 0.075], dark).rotation.z = -t;
      }
      needle.position.set(wx, wy + 0.62, iz + 0.09);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.012), s.material('#c0261c'));
      hand.position.y = 0.15;
      needle.add(hand, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10).rotateX(Math.PI / 2), iron));
      needle.rotation.z = -load * Math.PI * 1.85;
    }
    s.root.add(needle);
    if (lampOn) {
      s.rod([wx + 0.3, H - 0.1, hz], [wx + 0.3, H - 0.55, hz], 0.008, dark);
      s.ball([0.07, 0.09, 0.07], [wx + 0.3, H - 0.62, hz], s.material('#fff1c4', { emissive: '#ffd98a', emissiveIntensity: 2.2 }), 10);
      s.mesh(new THREE.ConeGeometry(0.2, 0.12, 14, 1, true), s.material('#3d5a47', { side: THREE.DoubleSide }), [wx + 0.3, H - 0.52, hz]);
    }

    // Chalkboard on the front wall.
    {
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 400;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#26302b';
      ctx.fillRect(0, 0, 320, 400);
      for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(230,230,220,${0.02 + random() * 0.05})`; ctx.fillRect(random() * 320, random() * 400, 60 + random() * 160, 14 + random() * 40); }
      const chalk = (text: string, x: number, y: number, size: number, colour = '#f2f0e6', alpha = 0.92) => {
        ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.06);
        ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.font = `${size}px "Comic Sans MS", "Segoe Print", cursive`; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0); ctx.restore();
      };
      const strike = (x: number, y: number, w: number) => { ctx.strokeStyle = 'rgba(242,240,230,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y + 6); ctx.lineTo(x + w, y - 6); ctx.stroke(); };
      const grades = ['WHEAT', 'OATS', 'BARLEY', 'FLAX'];
      if (a.prices === 'closed') {
        chalk('CLOSED', 34, 170, 68);
        chalk('no buying', 70, 250, 34, '#f2f0e6', 0.7);
      } else if (a.prices === 'erased') {
        ctx.fillStyle = 'rgba(210,210,200,0.2)';
        for (let i = 0; i < 9; i++) { ctx.save(); ctx.translate(160, 60 + i * 38); ctx.rotate((random() - 0.5) * 0.3); ctx.fillRect(-140, -18, 280, 36); ctx.restore(); }
        grades.forEach((grade, index) => chalk(grade, 22, 100 + index * 76, 40, '#f2f0e6', 0.12));
      } else {
        chalk("TODAY'S PRICE", 26, 40, 36, '#f6e9a0');
        grades.forEach((grade, index) => {
          const y = 118 + index * 74;
          chalk(grade, 16, y, 36);
          const high = (2.2 - index * 0.45 + random() * 0.3);
          if (a.prices === 'boom') { chalk(`${(high * 1.6).toFixed(2)}`, 186, y, 44, '#fff7c2'); chalk('↑', 286, y, 40, '#fff7c2'); }
          else if (a.prices === 'steady') chalk(`${high.toFixed(2)}`, 200, y, 40);
          else { chalk(`${high.toFixed(2)}`, 150, y - 14, 26, '#f2f0e6', 0.6); strike(146, y - 14, 76); chalk(`.${Math.floor(18 + random() * 40)}`, 236, y + 8, 40, '#f4b9a8'); }
        });
        if (a.prices === 'boom') chalk('!', 280, 40, 60, '#fff7c2');
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      const bx = 1.12, by = 1.6;
      s.box([1.22, 1.5, 0.05], [bx, by, front + 0.07], timber);
      s.mesh(new THREE.PlaneGeometry(1.1, 1.38), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), [bx, by, front + 0.1]);
      s.box([1.22, 0.05, 0.1], [bx, by - 0.75, front + 0.1], timber);
      s.box([0.1, 0.03, 0.03], [bx - 0.3, by - 0.71, front + 0.12], s.material('#f4f2ea'));
    }

    // What was left on the sill.
    const sillY = wy + 0.01, sillZ = front + 0.18;
    const paper = s.material('#f1ead2');
    if (a.sill === 'ticket') {
      const ticket = s.box([0.26, 0.012, 0.15], [wx + 0.45, sillY + 0.02, sillZ], paper);
      ticket.rotation.set(0.1, 0.4, 0.12);
    } else if (a.sill === 'stack') {
      for (let i = 0; i < 6; i++) s.box([0.26, 0.012, 0.15], [wx + 0.4, sillY + 0.012 * i + 0.006, sillZ], i % 2 ? paper : s.material('#e9c9c0')).rotation.y = (random() - 0.5) * 0.5;
      s.ball([0.07, 0.045, 0.06], [wx + 0.4, sillY + 0.11, sillZ], s.material('#7d776c'), 8);
    } else if (a.sill === 'mug') {
      s.cylinder(0.055, 0.05, 0.12, [wx + 0.5, sillY + 0.06, sillZ], s.material('#e9eef0'), 12);
      s.ring(0.035, 0.012, [wx + 0.56, sillY + 0.06, sillZ], s.material('#2a4f8a')).rotation.y = 0;
    } else if (a.sill === 'cap') {
      s.ball([0.12, 0.08, 0.12], [wx + 0.5, sillY + 0.04, sillZ - 0.02], s.material('#2f6b34'), 12);
      s.box([0.2, 0.015, 0.14], [wx + 0.5, sillY + 0.02, sillZ + 0.1], s.material('#e8c52f'));
    }

    // The platform: deck, steel frame, pit gap, ramps.
    const PL = 5.2, PW = 2.7, pz = 1.3, ph = 0.24;
    s.box([PL + 0.5, 0.1, PW + 0.5], [0, 0.03, pz], dark);
    s.box([PL + 0.24, ph - 0.06, PW + 0.24], [0, (ph - 0.06) / 2 + 0.04, pz], iron);
    const deckTint = { planks: '#9a8f7e', steel: '#6d7376', concrete: '#b3aea2' }[a.deck];
    if (a.deck === 'planks') {
      const n = 20;
      for (let i = 0; i < n; i++) {
        const tone = new THREE.Color(deckTint).multiplyScalar(0.82 + random() * 0.3);
        const missing = random() < wear * 0.12;
        if (!missing) s.box([PL / n - 0.025, 0.07, PW], [-PL / 2 + (i + 0.5) * (PL / n), ph + (random() - 0.5) * wear * 0.03, pz], s.material(tone)).rotation.y = (random() - 0.5) * wear * 0.02;
      }
    } else {
      s.box([PL, 0.07, PW], [0, ph, pz], s.material(deckTint, { metalness: a.deck === 'steel' ? 0.4 : 0, roughness: a.deck === 'steel' ? 0.5 : 0.95 }));
      if (a.deck === 'steel') for (let i = 1; i < 4; i++) s.box([0.03, 0.075, PW], [-PL / 2 + i * PL / 4, ph, pz], iron);
      else for (let i = 0; i < 3; i++) s.rod([(random() - 0.5) * PL, ph + 0.036, pz - PW / 2], [(random() - 0.5) * PL, ph + 0.036, pz + PW / 2], 0.012, dark);
    }
    for (const x of [-1, 1]) {
      const ramp = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(0, ph + 0.03)]);
      const mesh = s.mesh(new THREE.ExtrudeGeometry(ramp, { depth: PW + 0.2, bevelEnabled: false }), s.material('#a39479'), [x * (PL / 2 + 0.25), 0, pz + (x > 0 ? -1 : 1) * (PW + 0.2) / 2]);
      if (x < 0) mesh.rotation.y = Math.PI;
    }
    // Rod housing from the pit to the house, and corner bollards.
    s.box([0.3, 0.2, pz - PW / 2 - front + 0.2], [wx - 0.62, 0.1, (pz - PW / 2 + front) / 2], iron);
    for (const x of [-1, 1]) s.cylinder(0.07, 0.07, 0.8, [x * (PL / 2 + 0.05), 0.4, pz - PW / 2 - 0.3], s.material('#d8c23a'), 8);

    // On the platform.
    const top = ph + 0.04;
    if (a.platform === 'sacks') {
      const sack = s.material('#b79a66');
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) s.ball([0.36, 0.2, 0.26], [-0.6 + (i % 3) * 0.6 + (random() - 0.5) * 0.15, top + 0.18 + Math.floor(i / 3) * 0.34, pz + (random() - 0.5) * 0.3], sack, 10).rotation.y = (random() - 0.5) * 0.6;
    } else if (a.platform === 'cans') {
      const can = s.material('#aeb4b6', { metalness: 0.45, roughness: 0.4 });
      for (const x of [-0.5, 0.05]) { s.lathe([[0.17, 0], [0.17, 0.42], [0.1, 0.52], [0.1, 0.6], [0.13, 0.62], [0, 0.62]], can, [x, top, pz + (random() - 0.5) * 0.4]); }
      s.box([0.6, 0.4, 0.45], [0.9, top + 0.2, pz + 0.2], timber).rotation.y = 0.3;
    } else if (a.platform === 'spill') {
      const grain = s.material('#d6a23a', { emissive: '#d6a23a', emissiveIntensity: 0.1 });
      for (let i = 0; i < 12; i++) s.cylinder(0.12 + random() * 0.25, 0.2 + random() * 0.25, 0.03, [-PL / 2 + random() * PL, top + 0.012, pz + 0.4 + (random() - 0.5) * 0.5], grain, 9);
      s.lathe([[0.5, 0], [0.3, 0.1], [0.08, 0.2], [0, 0.22]], grain, [1.2, top, pz + 0.5]);
      for (const z of [-0.8, 0.85]) s.box([PL + 3, 0.012, 0.28], [0, top + 0.005, pz + z], new THREE.MeshStandardMaterial({ color: '#4d453b', transparent: true, opacity: 0.45, depthWrite: false }));
    } else if (a.platform === 'bicycle') {
      const paintB = s.material(mood.cheer > 0.5 ? '#c0261c' : '#3f6a8a');
      const g = new THREE.Group();
      const add = (mesh: THREE.Object3D) => { g.add(mesh); return mesh; };
      for (const x of [-0.42, 0.42]) add(s.ring(0.26, 0.022, [x, 0, 0], dark));
      add(s.rod([-0.42, 0, 0], [-0.1, 0.3, 0], 0.02, paintB)); add(s.rod([-0.1, 0.3, 0], [0.3, 0.32, 0], 0.02, paintB));
      add(s.rod([0.3, 0.32, 0], [0.42, 0, 0], 0.02, paintB)); add(s.rod([-0.1, 0.3, 0], [0.05, 0, 0], 0.02, paintB));
      add(s.rod([0.05, 0, 0], [-0.42, 0, 0], 0.02, paintB)); add(s.rod([0.3, 0.32, 0], [0.26, 0.5, 0], 0.016, paintB));
      add(s.rod([0.26, 0.5, -0.2], [0.26, 0.5, 0.2], 0.014, dark)); add(s.box([0.2, 0.04, 0.1], [-0.12, 0.36, 0], dark));
      g.rotation.set(Math.PI / 2 - 0.12, 0, 0.5);
      g.position.set(0.4, top + 0.1, pz + 0.3);
      s.root.add(g);
    }
    // Test weights stacked by the door when the place is busy.
    for (let i = 0; i < Math.round(mood.density * 5); i++) s.box([0.3, 0.16, 0.2], [W / 2 + 0.3 + (i % 2) * 0.34, 0.08 + Math.floor(i / 2) * 0.17, front + 0.4], iron);
    if (wear > 0.55) {
      const blades = Array.from({ length: 70 }, () => { const size = 0.3 + random() * 0.5; const back = random() > 0.5; return { at: [(random() - 0.5) * (PL + 2), 0.5 * size, back ? front + 0.15 + random() * 0.5 : pz + (random() > 0.5 ? 1 : -1) * (PW / 2 + 0.3 + random() * 0.3)] as P, size, color: random() > 0.4 ? '#b9a865' : '#8f8a50' }; });
      s.scatter(new THREE.ConeGeometry(0.05, 1.0, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }

    const rest = needle.rotation.z;
    const swing = a.indicator === 'beam' ? 0.035 : 0.12;
    return s.finish({ update: (_dt, time) => { needle.rotation.z = rest + Math.sin(time * mix(0.8, 5, mood.energy)) * swing * mix(0.2, 1, mood.energy); } });
  },
});
