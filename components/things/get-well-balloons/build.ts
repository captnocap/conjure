import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const MESSAGES = {
  getwell: { say: 'Sunny yellow: GET WELL SOON with a smiling face.', lines: ['GET WELL', 'SOON'], foil: '#f2c81e', ink: '#3a2a10', latex: ['#f2c81e', '#f08a2a', '#4fa8e0', '#6fc45a', '#f4f1e6'] },
  boy: { say: 'Baby blue: IT’S A BOY.', lines: ['IT’S A', 'BOY!'], foil: '#5aa2e0', ink: '#ffffff', latex: ['#8fc4f0', '#f4f6f8', '#3f7fc8', '#bfe0f6'] },
  girl: { say: 'Pink: IT’S A GIRL.', lines: ['IT’S A', 'GIRL!'], foil: '#ee7fae', ink: '#ffffff', latex: ['#f4a6c6', '#f8f4f4', '#e0568f', '#f9cfe0'] },
  baby: { say: 'Soft mint and lemon: WELCOME BABY.', lines: ['WELCOME', 'BABY'], foil: '#8fd6b6', ink: '#2a4a40', latex: ['#bfe8d4', '#f6ecb0', '#f4f6f4', '#c9d8f2'] },
  sympathy: { say: 'Muted silver and lavender: THINKING OF YOU.', lines: ['THINKING', 'OF YOU'], foil: '#c4c8d4', ink: '#4a4460', latex: ['#f1f1ee', '#c9c0e0', '#d9dde2', '#a99bc4'] },
  birthday: { say: 'Loud rainbow: HAPPY BIRTHDAY, spent in a hospital bed.', lines: ['HAPPY', 'BIRTHDAY'], foil: '#d6409a', ink: '#fff3a0', latex: ['#e2452f', '#2f8fe0', '#f0c82a', '#3fa35c', '#a04fc8', '#f08a2a'] },
  love: { say: 'Deep red: LOVE YOU, with a heart.', lines: ['LOVE', 'YOU'], foil: '#d02a3a', ink: '#ffffff', latex: ['#d02a3a', '#f4f1ee', '#f08aa0', '#8a1f2a'] },
  home: { say: 'Gold and green: WELCOME HOME, for a discharge day.', lines: ['WELCOME', 'HOME'], foil: '#d9a82a', ink: '#2a3a20', latex: ['#d9a82a', '#3f8a5a', '#f4f1e6', '#e8c86a'] },
} as const;
type Message = keyof typeof MESSAGES;

export default defineThing({
  questions: {
    message: choice('What is the occasion written on the main balloon?', Object.fromEntries(Object.entries(MESSAGES).map(([key, value]) => [key, value.say])) as Record<Message, string>),
    foil: choice('What shape are the foil balloons?', {
      round: 'Round foil discs with crimped seams.',
      heart: 'Puffy foil hearts.',
      star: 'Five-pointed foil stars.',
      mixed: 'A mix: a round message balloon with a heart and a star.',
    }),
    age: score('How long ago were they delivered?', ['Minutes ago: every balloon taut and straining upward', 'Yesterday: still high, a little soft', 'Several days: the latex ones shrunken and sinking', 'A week: foil hovering at knee height, latex on the floor', 'Long forgotten: everything puddled on the floor']),
    anchor: choice('What are the ribbons tied to?', {
      bag: 'A glossy gift bag with tissue paper, weighted with something inside.',
      vase: 'A glass vase of flowers.',
      teddy: 'A sitting teddy bear holding the ribbons.',
      weight: 'A small foil-wrapped balloon weight, the cheapest option from the gift shop.',
      basket: 'A wicker basket of fruit.',
    }),
    latex: choice('What colours are the plain latex balloons?', {
      matching: 'Colours that match the occasion.',
      white: 'All white and pearl.',
      rainbow: 'Every colour at once.',
      metallic: 'Gold and silver.',
    }),
    popped: noul('Has one balloon popped, leaving a limp scrap of rubber on its ribbon?'),
    card: noul('Is there a little card or tag tied on with a handwritten name?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const msg = MESSAGES[a.message];
    const age = clamp01(a.age * 0.9 + mood.wear * 0.12);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const dull = (tint: THREE.ColorRepresentation) => new THREE.Color(tint).lerp(new THREE.Color('#9a9a94'), (1 - mood.cheer) * 0.18 + age * 0.12);

    // ---- Anchor.
    let tie: P3 = [0, 0.3, 0];
    if (a.anchor === 'bag') {
      const paper = s.material(dull(msg.foil), { roughness: 0.3 });
      const bag = s.mesh(new THREE.CylinderGeometry(0.15, 0.125, 0.3, 4, 1), paper, [0, 0.15, 0]); bag.rotation.y = Math.PI / 4; bag.scale.z = 0.55;
      for (const z of [-0.05, 0.05]) s.tube([[-0.06, 0.3, z], [-0.04, 0.4, z], [0.04, 0.4, z], [0.06, 0.3, z]], 0.005, s.material('#f4f1e6'));
      const tissue = s.material('#f6f2ea', { roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 6; i++) { const leaf = s.mesh(new THREE.ConeGeometry(0.05, 0.14, 4, 1, true), tissue, [(random() - 0.5) * 0.14, 0.33, (random() - 0.5) * 0.06]); leaf.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6); }
      s.label(msg.lines.join(' '), 0.17, 0.05, [0, 0.16, 0.062], msg.ink, '#' + dull(msg.foil).getHexString()).castShadow = false;
      tie = [0, 0.4, 0];
    } else if (a.anchor === 'vase') {
      s.lathe([[0, 0], [0.06, 0], [0.085, 0.08], [0.06, 0.2], [0.05, 0.26], [0.07, 0.3]], new THREE.MeshStandardMaterial({ color: '#b9dbe8', roughness: 0.12, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      s.cylinder(0.055, 0.058, 0.14, [0, 0.08, 0], new THREE.MeshStandardMaterial({ color: age > 0.6 ? '#9aa37a' : '#cfe6ee', roughness: 0.2, transparent: true, opacity: 0.8 }), 14);
      const droop = age * 0.22;
      for (let i = 0; i < 9; i++) {
        const t = random() * 6.3, lean = 0.07 + random() * 0.13 + droop * 0.4, h = 0.52 + random() * 0.14 - droop;
        const head: P3 = [Math.cos(t) * lean, h, Math.sin(t) * lean];
        s.tube([[0, 0.05, 0], [Math.cos(t) * lean * 0.35, h * 0.72, Math.sin(t) * lean * 0.35], head], 0.005, s.material('#4f8a52'));
        s.ball([0.05, 0.04, 0.05], head, s.material(new THREE.Color(pick(msg.latex)).lerp(new THREE.Color('#8a7a52'), age * 0.6), { roughness: 0.8 }), 10);
        if (i % 3 === 0) s.ball([0.05, 0.008, 0.025], [head[0] * 0.6, h * 0.6, head[2] * 0.6], s.material('#4f8a52'), 6).rotation.y = -t;
      }
      if (age > 0.5) for (let i = 0; i < Math.round(age * 8); i++) s.ball([0.02, 0.003, 0.014], [(random() - 0.5) * 0.4, 0.003, (random() - 0.5) * 0.4], s.material('#b89a6a'), 6).rotation.y = random() * 3;
      tie = [0, 0.27, 0];
    } else if (a.anchor === 'teddy') {
      const fur = s.material(pick(['#c9a06a', '#e8d9c0', '#a8794a', '#f1ede4']), { roughness: 1 });
      s.ball([0.13, 0.15, 0.115], [0, 0.15, 0], fur, 16);
      s.ball([0.105, 0.095, 0.095], [0, 0.365, 0.01], fur, 16);
      for (const d of [-1, 1]) {
        s.ball([0.038, 0.038, 0.02], [d * 0.08, 0.445, 0], fur, 8);
        s.ball([0.05, 0.05, 0.1], [d * 0.09, 0.05, 0.13], fur, 10).rotation.y = d * 0.3;
        s.ball([0.04, 0.085, 0.04], [d * 0.13, 0.2, 0.05], fur, 10).rotation.z = d * 0.7;
        s.ball([0.012, 0.012, 0.008], [d * 0.035, 0.39, 0.095], s.material('#1b1d1f', { roughness: 0.2 }), 6);
      }
      s.ball([0.04, 0.03, 0.03], [0, 0.345, 0.09], s.material('#f1e6d2'), 8);
      s.ball([0.012, 0.009, 0.008], [0, 0.355, 0.118], s.material('#3a2a20'), 6);
      const bow = s.material(dull(msg.foil), { roughness: 0.5 });
      for (const d of [-1, 1]) s.ball([0.04, 0.025, 0.012], [d * 0.04, 0.275, 0.085], bow, 8);
      tie = [0.16, 0.2, 0.08];
    } else if (a.anchor === 'weight') {
      const wrap = new THREE.MeshStandardMaterial({ color: dull(msg.foil), metalness: 0.85, roughness: 0.3 });
      s.lathe([[0, 0], [0.07, 0], [0.085, 0.03], [0.06, 0.09], [0.012, 0.12], [0.03, 0.14], [0.06, 0.17]], wrap);
      tie = [0, 0.13, 0];
    } else {
      s.lathe([[0, 0], [0.13, 0], [0.19, 0.12], [0.2, 0.14], [0.18, 0.12], [0.12, 0.015], [0, 0.015]], s.material('#b98a4a', { roughness: 0.9, side: THREE.DoubleSide }));
      s.tube([[-0.19, 0.13, 0], [-0.15, 0.36, 0], [0, 0.44, 0], [0.15, 0.36, 0], [0.19, 0.13, 0]], 0.012, s.material('#a8793c', { roughness: 0.9 }));
      for (let i = 0; i < 8; i++) { const t = i * 0.9 + random(), r = i < 6 ? 0.1 : 0.02; s.ball([0.05, 0.048, 0.05], [Math.cos(t) * r, i < 6 ? 0.12 : 0.19, Math.sin(t) * r], s.material(new THREE.Color(pick(['#e07a2a', '#c8362c', '#8fb83a', '#e0c02a', '#7a2f5a'])).lerp(new THREE.Color('#6a5a3a'), age * 0.4), { roughness: 0.6 }), 10); }
      tie = [0, 0.44, 0];
    }
    if (a.card) {
      const c = new Sculpture(context);
      c.box([0.11, 0.075, 0.003], [0, 0, 0], s.material('#f8f5ea', { roughness: 0.9 }));
      const name = pick(['Love, Nan', 'from Ward 6', 'xx Dad', 'The Team', 'A + J', 'Room 12']);
      c.label(name, 0.1, 0.035, [0, 0, 0.0025], '#2a3f7a', '#f8f5ea').castShadow = false;
      c.root.position.set(tie[0] + 0.1, Math.max(0.06, tie[1] - 0.09), tie[2] + 0.09);
      c.root.rotation.set(-0.3, 0.4, (random() - 0.5) * 0.6);
      s.root.add(c.root);
      s.rod(tie, [tie[0] + 0.09, tie[1] - 0.05, tie[2] + 0.08], 0.002, s.material('#c8a64a'));
    }

    // ---- Balloons.
    const latexShape: [number, number][] = [];
    for (let i = 0; i <= 18; i++) { const t = i / 18 * Math.PI; const pinch = 1 - 0.28 * Math.max(0, Math.cos(t)) ** 2; latexShape.push([Math.sin(t) * 0.14 * pinch + (i === 0 ? 0.004 : 0), -Math.cos(t) * 0.17 + 0.17]); }
    latexShape.unshift([0.012, -0.02], [0.006, -0.005]);
    const heart = (() => {
      const h = new THREE.Shape();
      h.moveTo(0, -0.2); h.bezierCurveTo(-0.3, 0.0, -0.26, 0.24, -0.11, 0.22); h.bezierCurveTo(-0.04, 0.21, 0, 0.16, 0, 0.12);
      h.bezierCurveTo(0, 0.16, 0.04, 0.21, 0.11, 0.22); h.bezierCurveTo(0.26, 0.24, 0.3, 0.0, 0, -0.2);
      return h;
    })();
    const star = (() => {
      const h = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2, r = i % 2 ? 0.1 : 0.23; if (i === 0) h.moveTo(Math.sin(t) * r, Math.cos(t) * r); else h.lineTo(Math.sin(t) * r, Math.cos(t) * r); }
      h.closePath();
      return h;
    })();
    const messageMap = (() => {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#' + dull(msg.foil).getHexString(); ctx.fillRect(0, 0, 512, 256);
      for (const cx of [128, 384]) {
        ctx.strokeStyle = msg.ink; ctx.globalAlpha = 0.55; ctx.lineWidth = 5; ctx.setLineDash([10, 9]);
        ctx.beginPath(); ctx.ellipse(cx, 128, 92, 104, 0, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.fillStyle = msg.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const size = (text: string) => Math.min(46, 250 / text.length);
        ctx.font = `bold ${size(msg.lines[0])}px sans-serif`; ctx.fillText(msg.lines[0], cx, 104, 150);
        ctx.font = `bold ${size(msg.lines[1]) * 1.1}px sans-serif`; ctx.fillText(msg.lines[1], cx, 152, 150);
        // A small emblem above the words.
        ctx.lineWidth = 4; ctx.strokeStyle = msg.ink;
        if (a.message === 'getwell') { ctx.beginPath(); ctx.arc(cx, 56, 18, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, 58, 10, 0.3, Math.PI - 0.3); ctx.stroke(); for (const d of [-6, 6]) { ctx.beginPath(); ctx.arc(cx + d, 51, 2.5, 0, 6.3); ctx.fill(); } }
        else if (a.message === 'love' || a.message === 'girl' || a.message === 'boy') { ctx.beginPath(); ctx.moveTo(cx, 72); ctx.bezierCurveTo(cx - 28, 52, cx - 14, 32, cx, 46); ctx.bezierCurveTo(cx + 14, 32, cx + 28, 52, cx, 72); ctx.fill(); }
        else { for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - 40 + i * 20, 54 + (i % 2) * 8, 4, 0, 6.3); ctx.fill(); } }
        ctx.beginPath(); ctx.arc(cx - 20, 204, 3, 0, 6.3); ctx.arc(cx, 208, 3, 0, 6.3); ctx.arc(cx + 20, 204, 3, 0, 6.3); ctx.fill();
      }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();

    const foilShapes: ('round' | 'heart' | 'star')[] = a.foil === 'mixed' ? ['round', 'heart', 'star'] : [a.foil, a.foil, a.foil];
    const foilCount = 1 + Math.round(mood.density * 2);
    const latexCount = Math.round(mix(2, 7, mood.density));
    const latexTints = a.latex === 'matching' ? msg.latex : a.latex === 'white' ? ['#f6f4ee', '#ece8e0', '#f8f8f6'] : a.latex === 'rainbow' ? ['#e2452f', '#f08a2a', '#f0c82a', '#3fa35c', '#2f8fe0', '#a04fc8'] : ['#d9b23a', '#c4c8cc', '#e8cf6a', '#aeb4ba'];
    const ribbonTints = ['#f4f1e6', '#' + new THREE.Color(msg.foil).getHexString(), '#d9b23a'];
    const total = foilCount + latexCount;
    const swayers: { group: THREE.Group; phase: number; amount: number }[] = [];
    const order = Array.from({ length: total }, (_unused, i) => i).sort(() => random() - 0.5);
    for (let n = 0; n < total; n++) {
      const isFoil = n < foilCount;
      const g = new Sculpture(context);
      const lift = isFoil ? clamp01(1.08 - age * 1.12 - random() * 0.1 * age) : clamp01(1.25 - age * 2.2 - random() * 0.25 * age);
      const size = isFoil ? mix(1, 0.92, age) * (n === 0 ? 1.12 : 0.9) : mix(1, 0.5, clamp01(age * 1.3)) * mix(0.85, 1.05, random());
      const angle = order[n] / total * Math.PI * 2 + random() * 0.5;
      const length = isFoil ? mix(1.25, 1.65, random()) + (n === 0 ? 0.2 : 0) : mix(0.85, 1.4, random());
      const spread = mix(0.08, 0.34, random()) + (1 - lift) * 0.35;
      const isPopped = a.popped && !isFoil && n === foilCount;
      const grounded = lift < 0.06;
      const radius = isFoil ? 0.22 * size : 0.15 * size;
      // Where the balloon ends up, relative to the tie point.
      const dx = Math.cos(angle) * spread * (grounded ? 1.5 : 1) * length * 0.6, dz = Math.sin(angle) * spread * (grounded ? 1.5 : 1) * length * 0.6;
      const topY = grounded ? -tie[1] + (isFoil ? 0.07 : radius * 0.85) : Math.max(-tie[1] + radius + 0.05, length * mix(0.12, 1, lift));
      const neck: P3 = isPopped ? [dx * 0.6, -tie[1] + 0.02, dz * 0.6] : [dx, topY - (grounded ? 0 : (isFoil ? radius * 1.02 : 0.02 * size)), dz];
      // Ribbon: straight when taut, sagging to the floor when not.
      const slack = isPopped ? 1 : clamp01(1 - lift * 1.15);
      const floorY = -tie[1] + 0.006;
      const curl = (random() - 0.5) * 0.12;
      const mid = (t: number): P3 => [neck[0] * t + Math.sin(t * Math.PI) * curl * Math.cos(angle + 1.6), mix(mix(0, neck[1], t), floorY, slack * Math.sin(t * Math.PI) ** 0.6), neck[2] * t + Math.sin(t * Math.PI) * curl * Math.sin(angle + 1.6)];
      const ribbon = s.material(dull(pick(ribbonTints)), { roughness: 0.5 });
      g.tube([[0, 0, 0], mid(0.25), mid(0.5), mid(0.75), neck], 0.0035, ribbon);

      if (isPopped) {
        const scrap = g.ball([0.05, 0.008, 0.03], [neck[0], neck[1], neck[2]], s.material(dull(pick(latexTints)), { roughness: 0.7 }), 8); scrap.rotation.y = random() * 3;
        g.ball([0.02, 0.01, 0.045], [neck[0] + 0.04, neck[1], neck[2] + 0.02], scrap.material as THREE.Material, 6).rotation.y = random() * 3;
      } else if (isFoil) {
        const shape = foilShapes[n % 3];
        const tint = n === 0 ? dull(msg.foil) : dull(pick([...msg.latex, '#c4c8cc', '#d9b23a']));
        const body = new Sculpture(context);
        const wrinkle = mix(1, 0.55, clamp01(age * 1.2));
        if (shape === 'round') {
          const foil = new THREE.MeshStandardMaterial(n === 0 ? { map: messageMap, metalness: 0.55, roughness: 0.3 } : { color: tint, metalness: 0.9, roughness: 0.25 });
          body.ball([0.22, 0.22, 0.085 * wrinkle], [0, 0, 0], foil, 32).rotation.y = -Math.PI / 2 + Math.PI / 2;
          const seam = body.ring(0.215, 0.012, [0, 0, 0], new THREE.MeshStandardMaterial({ color: tint, metalness: 0.9, roughness: 0.3 })); seam.scale.z = 0.4;
          body.cylinder(0.012, 0.02, 0.05, [0, -0.235, 0], new THREE.MeshStandardMaterial({ color: tint, metalness: 0.9, roughness: 0.3 }), 8);
        } else {
          const foil = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.9, roughness: 0.22 });
          const geometry = new THREE.ExtrudeGeometry(shape === 'heart' ? heart : star, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.055 * wrinkle, bevelSize: shape === 'heart' ? 0.045 : 0.035, bevelSegments: 5, curveSegments: 16 });
          geometry.center();
          body.mesh(geometry, foil);
          if (shape === 'star') body.root.rotation.z = (random() - 0.5) * 0.4;
          if (n === 0) for (const face of [1, -1]) {
            const words = body.label(msg.lines.join(' '), 0.3, 0.07, [0, shape === 'heart' ? 0.04 : 0, face * (0.062 * wrinkle + 0.006)], msg.ink, '#' + tint.getHexString());
            if (face < 0) words.rotation.y = Math.PI; words.castShadow = false;
          }
          body.cylinder(0.01, 0.018, 0.045, [0, shape === 'heart' ? -0.245 : -0.2, 0], foil, 8);
        }
        body.root.scale.setScalar(size);
        body.root.position.set(dx, topY, dz);
        if (grounded) { body.root.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.2, 0, random() * 6); }
        else { body.root.rotation.set((random() - 0.5) * 0.2 + (1 - lift) * 0.5, (random() - 0.5) * 1.1, (random() - 0.5) * 0.25 - dx * 0.25); }
        g.root.add(body.root);
      } else {
        const tint = dull(pick(latexTints));
        const skin = new THREE.MeshStandardMaterial({ color: tint, roughness: mix(0.18, 0.6, age), metalness: a.latex === 'metallic' ? 0.6 : 0.05, transparent: true, opacity: 0.94 });
        const body = new Sculpture(context);
        body.lathe(latexShape, skin);
        body.ring(0.012, 0.005, [0, -0.02, 0], skin).rotation.x = Math.PI / 2;
        body.root.scale.setScalar(size);
        body.root.position.set(neck[0], neck[1], neck[2]);
        if (grounded) { body.root.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.4, 0, random() * 6); body.root.position.y = -tie[1] + 0.13 * size; }
        else body.root.rotation.set(-dz * 0.35, 0, dx * 0.35);
        g.root.add(body.root);
      }
      // A curled tail of spare ribbon below the knot at the tie.
      if (n % 2 === 0) {
        const tail: P3[] = [];
        const dir = random() * 6.3, len = 12 + Math.floor(random() * 10);
        for (let i = 0; i <= len; i++) tail.push([Math.cos(dir) * 0.03 + Math.cos(i * 1.1) * 0.015 + Math.cos(dir) * i * 0.004, -i * Math.min(0.016, (tie[1] - 0.01) / len), Math.sin(dir) * 0.03 + Math.sin(i * 1.1) * 0.015 + Math.sin(dir) * i * 0.004]);
        g.tube(tail, 0.003, ribbon);
      }
      g.root.position.set(...tie);
      s.root.add(g.root);
      if (!grounded && !isPopped) swayers.push({ group: g.root, phase: random() * 6.3, amount: mix(0.01, 0.05, lift) });
    }
    s.ball([0.018, 0.014, 0.018], tie, s.material('#f4f1e6'), 8);

    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      footprint: 0.4,
      update: (_dt, time) => { for (const { group, phase, amount } of swayers) { group.rotation.z = Math.sin(time * speed + phase) * amount; group.rotation.x = Math.cos(time * speed * 0.8 + phase) * amount; } },
    });
  },
});
