import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export default defineThing({
  questions: {
    corner: choice('Which corner is it?', {
      red: 'The red corner: champion, favourite, home fighter.',
      blue: 'The blue corner: challenger, visitor, underdog.',
      white: 'A neutral white corner where nobody sits and the referee sends you.',
      gold: 'A black and gold corner dressed for a televised title night.',
    }),
    story: choice('What has been left in the corner?', {
      ready: 'Everything set for the bell: stool out, towel folded over the top rope, bottle and bucket waiting.',
      thrown: 'The towel thrown in: it lies crumpled out on the canvas and the stool is knocked over.',
      empty: 'An empty stool and nothing else, long after everyone went home.',
      gloves: 'A pair of gloves left sitting on the stool, laces trailing.',
      cutkit: 'A hard night: swabs, an ice bag and a tin of grease lined up on the apron, the towel bloodied.',
    }),
    canvas: choice('What state is the canvas in?', {
      clean: 'Fresh pale canvas, newly stretched.',
      scuffed: 'Grey with shoe scuffs and resin dust.',
      blood: 'Old brown bloodstains that never washed out.',
      taped: 'Split and mended with long strips of tape.',
      blue: 'Sky-blue canvas, a television ring.',
    }),
    ropes: choice('What are the ropes like?', {
      white: 'Fat white wrapped ropes.',
      red: 'Red vinyl-covered ropes.',
      tricolour: 'Red, white and blue ropes, one colour each.',
      hemp: 'Bare old hemp rope bound with tape, sagging.',
    }),
    skirt: choice('What hangs below the apron?', {
      plain: 'A plain dark skirt to the floor.',
      striped: 'Red and white bunting stripes, fairground bright.',
      boxing: 'A skirt lettered BOXING in fat block capitals.',
      boxeo: 'A skirt hand-lettered BOXEO with a star, Havana style.',
      bare: 'No skirt: you can see the timber trestles and the dark underneath.',
    }),
    steps: choice('How do you climb up?', {
      wooden: 'Three worn wooden steps.',
      steel: 'A folding steel step frame.',
      crate: 'A milk crate somebody put there.',
      none: 'No steps: you haul yourself up by the ropes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const H = 0.9, HALF = 1.3, P = 0.85;
    const accent = { red: '#b8281f', blue: '#2452a8', white: '#e9e5d8', gold: '#1c1b1a' }[a.corner];
    const trim = { red: '#f1ead6', blue: '#f1ead6', white: '#8c8f92', gold: '#d4a531' }[a.corner];
    const pad = s.material(accent, { roughness: 0.45 });
    const trimPaint = s.material(trim, { roughness: 0.5, metalness: a.corner === 'gold' ? 0.5 : 0 });
    const steel = s.material('#7d8589', { metalness: 0.75, roughness: 0.35 });
    const timber = s.material('#7b5a3a', { roughness: 0.8 });
    const darkTimber = s.material('#3a2c22', { roughness: 0.9 });
    const cloth = s.material('#ece7d8', { roughness: 1 });

    // Canvas top, painted with its history.
    const base = a.canvas === 'blue' ? '#7fb2d6' : a.canvas === 'clean' ? '#e6e0cc' : '#d3ccb6';
    const top = paint(512, 512, (ctx) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
      const blot = (x: number, y: number, r: number, colour: string, alpha: number) => {
        ctx.globalAlpha = alpha; ctx.fillStyle = colour;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.5 + random() * 0.6), random() * 3, 0, 7); ctx.fill();
      };
      const grime = mix(0.4, 1.4, mood.wear) * (a.canvas === 'clean' || a.canvas === 'blue' ? 0.35 : 1);
      for (let i = 0; i < 60; i++) blot(random() * 512, random() * 512, 10 + random() * 46, '#5b5448', 0.05 * grime);
      if (a.canvas === 'scuffed') for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.25; ctx.strokeStyle = '#3b3833'; ctx.lineWidth = 2 + random() * 3;
        const x = random() * 512, y = random() * 512, t = random() * 6.28, l = 8 + random() * 26;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); ctx.stroke();
      }
      if (a.canvas === 'blood' || a.story === 'cutkit') for (let i = 0, n = a.canvas === 'blood' ? 16 : 5; i < n; i++) {
        const x = 150 + random() * 330, y = 150 + random() * 330;
        blot(x, y, 8 + random() * 30, '#6b2a1c', 0.6);
        for (let j = 0; j < 5; j++) blot(x + (random() - 0.5) * 90, y + (random() - 0.5) * 90, 2 + random() * 5, '#6b2a1c', 0.7);
      }
      if (a.canvas === 'taped') {
        ctx.globalAlpha = 1;
        for (let i = 0; i < 5; i++) {
          ctx.save(); ctx.translate(60 + random() * 380, 60 + random() * 380); ctx.rotate(random() * 3.14);
          ctx.fillStyle = '#2a2826'; ctx.fillRect(-70, -2, 140, 4);
          ctx.fillStyle = i % 2 ? '#a9adb0' : '#8f8a78'; ctx.globalAlpha = 0.92; ctx.fillRect(-90 - random() * 40, -11, 190 + random() * 60, 22);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 0.35; ctx.strokeStyle = '#4a463f'; ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 512 * (HALF + P) / (HALF * 2), 512);
    });
    s.box([HALF * 2, 0.1, HALF * 2], [0, H - 0.05, 0], new THREE.MeshStandardMaterial({ color: base, roughness: 0.95 }));
    const sheet = s.mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), new THREE.MeshStandardMaterial({ map: top, roughness: 0.95 }), [0, H + 0.002, 0]);
    sheet.rotation.x = -Math.PI / 2;
    // Apron edge binding on the two outer sides.
    s.box([HALF * 2 + 0.02, 0.105, 0.03], [0, H - 0.05, HALF], pad);
    s.box([0.03, 0.105, HALF * 2 + 0.02], [HALF, H - 0.05, 0], pad);

    // Under the deck.
    if (a.skirt === 'bare') {
      for (const x of [-1.2, 0, 1.2]) for (const z of [-1.2, 0, 1.2]) s.box([0.09, H - 0.1, 0.09], [x, (H - 0.1) / 2, z], timber);
      for (const z of [-1.2, 0, 1.2]) s.box([HALF * 2 - 0.1, 0.14, 0.06], [0, H - 0.17, z], timber);
      for (const x of [-1.2, 1.2]) s.box([0.06, 0.14, HALF * 2 - 0.1], [x, H - 0.17, 0], timber);
      for (const x of [-0.6, 0.6]) s.rod([x - 0.55, 0.05, 1.2], [x + 0.55, H - 0.25, 1.2], 0.025, timber);
      for (const z of [-0.6, 0.6]) s.rod([1.2, 0.05, z - 0.55], [1.2, H - 0.25, z + 0.55], 0.025, timber);
    } else {
      s.box([HALF * 2 - 0.06, H - 0.1, HALF * 2 - 0.06], [0, (H - 0.1) / 2, 0], darkTimber);
      const skirtColour = a.skirt === 'plain' ? (a.corner === 'gold' ? '#17161a' : '#23304a') : a.skirt === 'boxeo' ? '#1f6f6a' : a.skirt === 'boxing' ? '#8a1f1a' : '#efe8d4';
      const skirt = (word: string | null) => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: paint(1024, 320, (ctx) => {
        ctx.fillStyle = skirtColour; ctx.fillRect(0, 0, 1024, 320);
        if (a.skirt === 'striped') { ctx.fillStyle = '#c4302a'; for (let i = 0; i < 16; i += 2) ctx.fillRect(i * 64, 0, 64, 320); }
        ctx.fillStyle = a.skirt === 'boxeo' ? '#f5d76a' : '#f2ead5';
        if (word) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `bold ${a.skirt === 'boxeo' ? 'italic ' : ''}210px ${a.skirt === 'boxeo' ? 'serif' : 'sans-serif'}`;
          ctx.fillText(word, 512, 168, 860);
          if (a.skirt === 'boxeo') for (const x of [70, 954]) {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) { const r = i % 2 ? 22 : 54, t = (i / 10) * 6.283 - 1.571; ctx.lineTo(x + Math.cos(t) * r, 160 + Math.sin(t) * r); }
            ctx.fill();
          }
        }
        ctx.fillRect(0, 300, 1024, 8);
        ctx.globalAlpha = 0.1 + mood.wear * 0.25; ctx.fillStyle = '#2b2520';
        for (let i = 0; i < 40; i++) ctx.fillRect(random() * 1024, 200 + random() * 120, 20 + random() * 60, 20 + random() * 80);
      }) });
      const word = a.skirt === 'boxing' ? 'BOXING' : a.skirt === 'boxeo' ? 'BOXEO' : null;
      s.mesh(new THREE.PlaneGeometry(HALF * 2, H - 0.1), skirt(word), [0, (H - 0.1) / 2, HALF + 0.001]);
      const side = s.mesh(new THREE.PlaneGeometry(HALF * 2, H - 0.1), skirt(word), [HALF + 0.001, (H - 0.1) / 2, 0]);
      side.rotation.y = Math.PI / 2;
    }

    // Corner post and ropes.
    s.cylinder(0.055, 0.055, H + 1.5, [P, (H + 1.5) / 2, P], steel, 16);
    s.ball([0.07, 0.05, 0.07], [P, H + 1.5, P], trimPaint, 12);
    s.cylinder(0.11, 0.11, 0.02, [P, H + 0.012, P], steel, 16);
    const ropeColours = { white: ['#eee9da', '#eee9da', '#eee9da', '#eee9da'], red: ['#b8281f', '#b8281f', '#b8281f', '#b8281f'], tricolour: ['#b8281f', '#eee9da', '#2452a8', '#b8281f'], hemp: ['#b39a6a', '#b39a6a', '#b39a6a', '#b39a6a'] }[a.ropes];
    const sagBase = a.ropes === 'hemp' ? 0.07 : 0.015 + mood.wear * 0.03;
    const ropeHeights = [0.42, 0.74, 1.06, 1.38];
    ropeHeights.forEach((h, i) => {
      const y = H + h, inset = 0.24;
      const material = s.material(ropeColours[i], { roughness: 0.6 });
      const sag = sagBase * (0.6 + random() * 0.8);
      for (const along of ['x', 'z'] as const) {
        const points: [number, number, number][] = [];
        for (let k = 0; k <= 6; k++) {
          const d = mix(P - inset, -HALF - 0.02, k / 6), dip = -sag * Math.sin((k / 6) * Math.PI * 0.6) * 3;
          points.push(along === 'x' ? [d, y + dip, P] : [P, y + dip, d]);
        }
        s.tube(points, a.ropes === 'hemp' ? 0.017 : 0.024, material);
        // Turnbuckle from the post to the rope end.
        const end: [number, number, number] = along === 'x' ? [P - inset, y, P] : [P, y, P - inset];
        s.rod([P, y, P], end, 0.012, steel);
        if (a.ropes === 'hemp') for (const k of [0.25, 0.55, 0.8]) {
          const d = mix(P - inset, -HALF, k) + (random() - 0.5) * 0.2;
          const wrap = s.cylinder(0.021, 0.021, 0.07, along === 'x' ? [d, y - sag * 1.6, P] : [P, y - sag * 1.6, d], s.material('#2a2826'), 8);
          wrap.rotation.set(along === 'z' ? Math.PI / 2 : 0, 0, along === 'x' ? Math.PI / 2 : 0);
        }
      }
      // The corner pad across the turnbuckles.
      const cushion = s.box([0.4, 0.2, 0.1], [P - 0.14, y, P - 0.14], pad);
      cushion.rotation.y = Math.PI / 4 + Math.PI / 2;
      const band = s.box([0.405, 0.05, 0.104], [P - 0.14, y, P - 0.14], trimPaint);
      band.rotation.y = cushion.rotation.y;
    });
    // Rope spacers tying the four ropes together on each run.
    for (const d of [-0.5]) {
      s.rod([d, H + ropeHeights[0], P], [d, H + ropeHeights[3], P], 0.008, cloth);
      s.rod([P, H + ropeHeights[0], d], [P, H + ropeHeights[3], d], 0.008, cloth);
    }

    // Steps up to the apron on the front face.
    const stepX = -0.45;
    if (a.steps === 'wooden') {
      for (let i = 0; i < 3; i++) {
        const y = (i + 1) * (H / 4), z = HALF + 0.14 + (2 - i) * 0.27;
        s.box([0.8, 0.045, 0.3], [stepX, y, z], timber);
        s.box([0.76, 0.02, 0.02], [stepX, y + 0.025, z + 0.13], darkTimber);
      }
      for (const x of [-0.38, 0.38]) {
        const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.85, 0), new THREE.Vector2(0.85, 0.2), new THREE.Vector2(0.04, H * 0.76), new THREE.Vector2(0, H * 0.76)]);
        const stringer = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), darkTimber, [stepX + x + 0.02, 0, HALF + 0.01]);
        stringer.rotation.y = -Math.PI / 2;
      }
    }
    if (a.steps === 'steel') {
      for (let i = 0; i < 2; i++) s.box([0.6, 0.03, 0.26], [stepX, (i + 1) * (H / 3), HALF + 0.16 + (1 - i) * 0.3], steel);
      for (const x of [-0.3, 0.3]) {
        s.rod([stepX + x, 0, HALF + 0.62], [stepX + x, H * 0.72, HALF + 0.03], 0.018, steel);
        s.rod([stepX + x, 0, HALF + 0.05], [stepX + x, H / 3, HALF + 0.55], 0.014, steel);
      }
    }
    if (a.steps === 'crate') {
      const plastic = s.material(mood.cheer > 0.5 ? '#2f6fd0' : '#b8442a', { roughness: 0.6 });
      s.box([0.36, 0.03, 0.36], [stepX, 0.275, HALF + 0.3], plastic);
      for (const [x, z] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const y of [0.03, 0.14, 0.25]) s.box([x ? 0.025 : 0.36, 0.05, z ? 0.025 : 0.36], [stepX + x * 0.17, y, HALF + 0.3 + z * 0.17], plastic);
      for (const x of [-0.17, 0.17]) for (const z of [-0.17, 0.17]) s.box([0.03, 0.28, 0.03], [stepX + x, 0.14, HALF + 0.3 + z], plastic);
    }

    // The stool, on the diagonal inside the corner.
    const stool = new THREE.Group();
    const seatPaint = s.material('#a9814f', { roughness: 0.6 });
    const add = (mesh: THREE.Object3D) => { stool.add(mesh); return mesh; };
    add(s.cylinder(0.17, 0.17, 0.035, [0, 0.42, 0], seatPaint, 20));
    add(s.cylinder(0.172, 0.172, 0.012, [0, 0.41, 0], pad, 20));
    for (let i = 0; i < 4; i++) {
      const t = (i / 4) * 6.283 + 0.785;
      add(s.rod([Math.cos(t) * 0.19, 0, Math.sin(t) * 0.19], [Math.cos(t) * 0.11, 0.41, Math.sin(t) * 0.11], 0.017, seatPaint));
    }
    const ringR = s.ring(0.15, 0.008, [0, 0.16, 0], steel);
    ringR.rotation.x = Math.PI / 2;
    add(ringR);
    s.root.add(stool);
    if (a.story === 'thrown') {
      stool.position.set(0.3, H + 0.17, 0.05);
      stool.rotation.set(0, random() * 3, Math.PI / 2);
    } else {
      stool.position.set(P - 0.5, H, P - 0.5);
      stool.rotation.y = random();
    }

    // Towel in its three lives.
    const stain = s.material('#8e2f22', { roughness: 1 });
    const towel = a.story === 'cutkit' ? s.material('#e2d5c4', { roughness: 1 }) : cloth;
    if (a.story === 'ready' || a.story === 'cutkit' || a.story === 'gloves') {
      const y = H + ropeHeights[3], x = 0.05 + random() * 0.2;
      if (a.story === 'ready') {
        s.box([0.3, 0.03, 0.09], [x, y + 0.035, P], towel);
        for (const z of [-0.035, 0.035]) s.box([0.3, 0.3, 0.02], [x, y - 0.12, P + z], towel);
        for (const dy of [-0.2, -0.23]) s.box([0.302, 0.012, 0.022], [x, y + dy, P + 0.036], pad);
      } else {
        s.box([0.42, 0.03, 0.09], [x, y + 0.035, P], towel);
        s.box([0.42, 0.5, 0.015], [x, y - 0.22, P + 0.035], towel).rotation.z = 0.04;
        s.box([0.4, 0.22, 0.015], [x + 0.02, y - 0.08, P - 0.035], towel);
        if (a.story === 'cutkit') for (let i = 0; i < 4; i++) s.ball([0.03 + random() * 0.05, 0.03 + random() * 0.06, 0.004], [x - 0.15 + random() * 0.3, y - 0.1 - random() * 0.3, P + 0.044], stain, 8);
      }
    }
    if (a.story === 'thrown') {
      const cx = -0.55 + (random() - 0.5) * 0.3, cz = -0.45 + (random() - 0.5) * 0.3;
      for (let i = 0; i < 6; i++) {
        const fold = s.ball([0.14 + random() * 0.12, 0.025 + random() * 0.035, 0.1 + random() * 0.1], [cx + (random() - 0.5) * 0.3, H + 0.03 + i * 0.006, cz + (random() - 0.5) * 0.25], towel, 10);
        fold.rotation.y = random() * 3;
      }
    }
    if (a.story === 'gloves') {
      const glove = s.material(a.corner === 'blue' ? '#2452a8' : '#a5261d', { roughness: 0.4 });
      const sx = P - 0.5, sz = P - 0.5, y = H + 0.44;
      for (const [dx, turn] of [[-0.07, 0.5], [0.075, -0.4]]) {
        const fist = s.ball([0.075, 0.07, 0.105], [sx + dx, y + 0.068, sz + 0.02], glove, 14);
        fist.rotation.y = turn;
        s.ball([0.03, 0.035, 0.05], [sx + dx + Math.sign(dx) * -0.06, y + 0.06, sz + 0.05], glove, 8);
        const cuff = s.cylinder(0.05, 0.058, 0.09, [sx + dx - Math.sin(turn) * 0.11, y + 0.062, sz + 0.02 - Math.cos(turn) * 0.11], glove, 12);
        cuff.rotation.set(Math.PI / 2, 0, -turn);
        s.tube([[sx + dx, y + 0.1, sz - 0.08], [sx + dx * 2.2, y + 0.02, sz - 0.17], [sx + dx * 2.6, y - 0.2, sz - 0.19 + random() * 0.05]], 0.005, cloth);
      }
    }

    // Bucket and bottle on the apron outside the ropes, except when nobody is left.
    if (a.story !== 'empty') {
      const zinc = s.material('#9aa0a2', { metalness: 0.65, roughness: 0.4 });
      const bx = 0.15 + random() * 0.15, bz = P + 0.25;
      s.lathe([[0.0005, 0.02], [0.1, 0.02], [0.105, 0], [0.11, 0.01], [0.14, 0.26], [0.146, 0.27], [0.135, 0.265], [0.1, 0.03]], zinc, [bx, H, bz]);
      const handle = s.ring(0.14, 0.006, [bx, H + 0.25, bz], zinc, Math.PI);
      handle.rotation.set(0.9, 0.3, 0);
      const bottle = s.material(mood.cheer > 0.5 ? '#3f8fd0' : '#d7dbd6', { roughness: 0.3 });
      const wx = bx - 0.3, wz = bz + 0.02;
      s.lathe([[0.0005, 0], [0.04, 0], [0.042, 0.02], [0.042, 0.17], [0.02, 0.21], [0.02, 0.24], [0.0005, 0.245]], bottle, [wx, H, wz]);
      s.cylinder(0.006, 0.006, 0.08, [wx + 0.01, H + 0.27, wz], cloth, 6).rotation.z = -0.3;
      if (a.story === 'cutkit') {
        s.cylinder(0.05, 0.05, 0.025, [bx + 0.3, H + 0.013, bz], s.material('#d8c56a', { metalness: 0.6, roughness: 0.3 }), 16);
        s.ball([0.1, 0.045, 0.08], [bx + 0.5, H + 0.04, bz - 0.02], s.material('#4f7fb5', { roughness: 0.5 }), 12);
        for (let i = 0; i < 4; i++) s.rod([wx - 0.12 - i * 0.035, H + 0.006, wz - 0.06], [wx - 0.1 - i * 0.035, H + 0.006, wz + 0.08], 0.004, cloth);
      }
      if (mood.density > 0.6) s.ball([0.07, 0.035, 0.05], [bx + 0.02, H + 0.3, bz], s.material('#e3c95a', { roughness: 1 }), 10);
    }

    return s.finish({ footprint: 1.7 });
  },
});
