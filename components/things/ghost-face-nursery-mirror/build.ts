import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PALE = '214,224,236', INK = '10,14,22';
const WORDS = { none: '', help: 'HELP', play: 'PLAY WITH ME', behind: 'BEHIND YOU', mama: 'MAMA', see: 'I SEE YOU' } as const;

export default defineThing({
  questions: {
    whose: choice('Whose face is in the glass?', {
      child: 'A small child with huge dark eyes, low in the glass.',
      nanny: 'A stern nanny in a frilled white cap and high collar.',
      woman: 'A hollow-eyed woman with long hanging hair and a gaping mouth.',
      yours: 'Your own reflection, but wrong: blank white eyes and a smile far too wide.',
    }),
    clarity: choice('How clearly does it show?', {
      smudge: 'Barely: a smudge in a patch of breath fog that might be a face.',
      handprints: 'No face at all, only small handprints wiped in the fog from the inside.',
      full: 'A full, clear face looking straight out.',
      pushing: 'It is pushing out of the glass: face and hands bulging through the surface like a membrane.',
    }),
    frame: choice('What kind of mirror is it?', {
      'mahogany-oval': 'A full-length oval cheval glass in dark turned mahogany.',
      'arched-oak': 'A tall arched cheval glass in plain black oak.',
      gilt: 'A grand cheval glass in a carved and gilded frame with a shell crest.',
      painted: 'A nursery cheval glass painted white, the paint chipped, with a ribbon bow carved on top.',
      dressing: 'A small swing mirror on a box base with a little drawer, the kind that sits on a chest.',
    }),
    cracks: choice('Is the glass cracked?', {
      none: 'Whole.',
      single: 'One long crack from corner to corner.',
      star: 'A star of cracks from a blow, one shard fallen out to show the backing board.',
      corner: 'The bottom corner has broken away.',
    }),
    message: choice('What is written in the dust on the glass?', {
      none: 'Nothing.',
      help: 'HELP',
      play: 'PLAY WITH ME',
      behind: 'BEHIND YOU',
      mama: 'MAMA',
      see: 'I SEE YOU',
    }),
    cover: choice('Is it covered?', {
      bare: 'Uncovered.',
      'dust-sheet': 'Half hidden under a white dust sheet that has slipped to one side.',
      crepe: 'Swagged with black mourning crepe, as mirrors are in a house where someone has died.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const small = a.frame === 'dressing';
    const shape: 'oval' | 'arched' | 'rect' = a.frame === 'mahogany-oval' || a.frame === 'painted' ? 'oval' : a.frame === 'gilt' ? 'rect' : 'arched';
    const w = small ? 0.34 : shape === 'oval' ? 0.5 : 0.46;
    const h = small ? 0.42 : shape === 'oval' ? 1.16 : 1.12;
    const fw = a.frame === 'gilt' ? 0.075 : small ? 0.03 : 0.045;

    // ---- the glass and what shows in it -------------------------------------------------
    const CW = 512, CH = Math.round(512 * h / w);
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    const silver = ctx.createLinearGradient(0, 0, CW, CH);
    silver.addColorStop(0, '#77848f'); silver.addColorStop(0.5, '#4f5c68'); silver.addColorStop(1, '#3a444f');
    ctx.fillStyle = silver;
    ctx.fillRect(0, 0, CW, CH);
    // A dim room behind the viewer: a pale window shape and a door edge.
    ctx.fillStyle = 'rgba(160,178,196,0.22)';
    ctx.fillRect(CW * 0.62, CH * 0.08, CW * 0.2, CH * 0.22);
    ctx.fillStyle = 'rgba(20,26,34,0.3)';
    ctx.fillRect(CW * 0.08, CH * 0.12, CW * 0.16, CH);

    const S = (a.whose === 'child' ? 0.27 : 0.32) * CW * (small ? 0.9 : 1);
    const fx = CW * mix(0.44, 0.56, random()), fy = small ? CH * 0.45 : a.whose === 'child' ? CH * 0.42 : CH * 0.34;
    const drawFace = (g: CanvasRenderingContext2D) => {
      g.save();
      g.translate(fx, fy);
      g.scale(S, S);
      const pale = (alpha: number) => `rgba(${PALE},${alpha})`, ink = (alpha: number) => `rgba(${INK},${alpha})`;
      const oval = (x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, turn, 0, 7); g.fill(); };
      // Shoulders fading into the dark.
      const body = g.createLinearGradient(0, 0.9, 0, 3.2);
      body.addColorStop(0, a.whose === 'nanny' ? ink(0.85) : pale(0.6)); body.addColorStop(1, a.whose === 'nanny' ? ink(0) : pale(0));
      g.fillStyle = body;
      g.beginPath(); g.ellipse(0, 2.6, a.whose === 'child' ? 1.05 : 1.4, 1.6, 0, Math.PI, Math.PI * 2); g.fill();
      oval(0, 1.0, 0.24, 0.4, pale(0.8));
      if (a.whose === 'woman') {
        g.fillStyle = ink(0.9);
        g.beginPath(); g.moveTo(-0.7, -0.8); g.quadraticCurveTo(0, -1.5, 0.7, -0.8);
        for (let i = 0; i <= 8; i++) g.lineTo(0.95 - (i % 2) * 0.1, -0.6 + i * 0.4);
        g.lineTo(0.45, 2.6); g.lineTo(0.5, 0.2); g.lineTo(-0.5, 0.2); g.lineTo(-0.45, 2.7);
        for (let i = 8; i >= 0; i--) g.lineTo(-0.95 + (i % 2) * 0.1, -0.6 + i * 0.4);
        g.fill();
        oval(0, 0, 0.6, 1.05, pale(0.95));
        for (const side of [-1, 1]) {
          oval(side * 0.27, -0.12, 0.2, 0.27, ink(1));
          g.fillStyle = ink(0.85);
          g.fillRect(side * 0.27 - 0.05, 0, 0.1, mix(0.4, 0.9, random()));
          g.fillRect(side * 0.33 - 0.03, 0, 0.05, mix(0.2, 0.6, random()));
        }
        oval(0, 0.6, 0.17, 0.33, ink(1));
      } else if (a.whose === 'nanny') {
        oval(0, -0.62, 1.0, 0.62, pale(0.95));
        for (let i = 0; i <= 12; i++) oval(-0.96 + i * 0.16, -0.3 - Math.sin(i / 12 * Math.PI) * 0.12, 0.11, 0.11, pale(0.95));
        oval(0, 0, 0.68, 0.95, pale(1));
        oval(0, -0.72, 0.6, 0.3, 'rgba(120,134,150,0.6)');
        g.fillStyle = pale(1); g.fillRect(-0.34, 0.92, 0.68, 0.22);
        g.strokeStyle = ink(0.95); g.lineWidth = 0.07; g.lineCap = 'round';
        for (const side of [-1, 1]) {
          oval(side * 0.28, -0.05, 0.11, 0.065, ink(1));
          g.beginPath(); g.moveTo(side * 0.12, -0.2); g.lineTo(side * 0.44, -0.32); g.stroke();
          g.beginPath(); g.moveTo(side * 0.2, 0.28); g.lineTo(side * 0.3, 0.62); g.stroke();
        }
        g.beginPath(); g.moveTo(-0.24, 0.56); g.quadraticCurveTo(0, 0.47, 0.24, 0.56); g.stroke();
        g.lineWidth = 0.04;
        g.beginPath(); g.moveTo(0, -0.02); g.lineTo(-0.06, 0.28); g.lineTo(0.05, 0.3); g.stroke();
      } else if (a.whose === 'child') {
        oval(0, 0, 0.84, 0.92, pale(1));
        g.fillStyle = 'rgba(56,66,82,0.9)';
        g.beginPath(); g.ellipse(0, -0.2, 0.88, 0.8, 0, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, -0.62, -0.86, -0.32); g.fill();
        oval(-0.5, -0.92, 0.26, 0.17, pale(0.9), -0.5); oval(-0.02, -0.98, 0.26, 0.17, pale(0.9), 0.5);
        for (const side of [-1, 1]) {
          oval(side * 0.36, 0.1, 0.2, 0.23, ink(1));
          oval(side * 0.36 + 0.06, 0.03, 0.05, 0.05, pale(0.9));
        }
        g.strokeStyle = ink(0.9); g.lineWidth = 0.06; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-0.14, 0.58); g.quadraticCurveTo(0, 0.58 + mix(-0.1, 0.12, mood.cheer), 0.14, 0.58); g.stroke();
      } else {
        oval(0, 0, 0.7, 0.96, pale(1));
        g.fillStyle = 'rgba(40,48,60,0.9)';
        g.beginPath(); g.ellipse(0, -0.3, 0.74, 0.72, 0, Math.PI, Math.PI * 2); g.quadraticCurveTo(0, -0.75, -0.74, -0.3); g.fill();
        g.strokeStyle = ink(1); g.lineWidth = 0.05; g.lineCap = 'round';
        [-1, 1].forEach((side, index) => {
          oval(side * 0.29, -0.08, 0.17, 0.13, 'rgba(250,252,255,1)');
          g.beginPath(); g.ellipse(side * 0.29, -0.08, 0.17, 0.13, 0, 0, 7); g.stroke();
          oval(side * 0.29 + (index ? 0.09 : -0.02), -0.08 + (index ? -0.05 : 0.06), 0.03, 0.03, ink(1));
        });
        g.fillStyle = ink(1);
        g.beginPath(); g.moveTo(-0.72, 0.22); g.quadraticCurveTo(0, 0.74, 0.72, 0.22); g.quadraticCurveTo(0, 1.02, -0.72, 0.22); g.fill();
        g.strokeStyle = pale(1); g.lineWidth = 0.035;
        for (let i = -4; i <= 4; i++) { g.beginPath(); g.moveTo(i * 0.13, 0.36 + (1 - (i / 5) ** 2) * 0.1); g.lineTo(i * 0.13, 0.5 + (1 - (i / 5) ** 2) * 0.22); g.stroke(); }
      }
      g.restore();
    };
    const mist = (amount: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const x = random() * CW, y = random() * CH, r = mix(50, 170, random());
        const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
        puff.addColorStop(0, `rgba(206,214,222,${amount})`); puff.addColorStop(1, 'rgba(206,214,222,0)');
        ctx.fillStyle = puff;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };
    if (a.clarity === 'full') {
      const halo = ctx.createRadialGradient(fx, fy, S * 0.6, fx, fy, S * 2.4);
      halo.addColorStop(0, 'rgba(16,22,32,0.7)'); halo.addColorStop(1, 'rgba(16,22,32,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, CW, CH);
      drawFace(ctx);
      mist(0.12, 14);
    } else if (a.clarity === 'smudge') {
      mist(0.2, 22);
      const breath = ctx.createRadialGradient(fx, fy, 0, fx, fy, S * 1.7);
      breath.addColorStop(0, 'rgba(226,232,238,0.9)'); breath.addColorStop(0.7, 'rgba(226,232,238,0.55)'); breath.addColorStop(1, 'rgba(226,232,238,0)');
      ctx.fillStyle = breath; ctx.fillRect(0, 0, CW, CH);
      const soft = document.createElement('canvas');
      soft.width = CW; soft.height = CH;
      const g = soft.getContext('2d')!;
      g.filter = `blur(${Math.round(S * 0.09)}px)`;
      drawFace(g);
      ctx.globalAlpha = 0.62; ctx.drawImage(soft, 0, 0); ctx.globalAlpha = 1;
    } else if (a.clarity === 'handprints') {
      mist(0.34, 46);
      ctx.fillStyle = 'rgba(206,214,222,0.3)'; ctx.fillRect(0, 0, CW, CH);
    } else {
      const well = ctx.createRadialGradient(fx, fy, S * 0.5, fx, fy, S * 2.6);
      well.addColorStop(0, 'rgba(8,12,20,0.85)'); well.addColorStop(1, 'rgba(8,12,20,0)');
      ctx.fillStyle = well; ctx.fillRect(0, 0, CW, CH);
      mist(0.1, 10);
    }
    // Prints and words are wiped out of the fog, so they show the dark glass beneath.
    const wiped = `rgba(${INK},0.82)`;
    const drip = (x: number, y: number, length: number, width: number) => { ctx.fillStyle = wiped; ctx.fillRect(x - width / 2, y, width, length); ctx.beginPath(); ctx.arc(x, y + length, width * 0.8, 0, 7); ctx.fill(); };
    const hand = (x: number, y: number, size: number, turn: number, left: boolean) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(turn); ctx.scale(left ? -size : size, size);
      ctx.fillStyle = wiped;
      ctx.beginPath(); ctx.ellipse(0, 0, 0.5, 0.56, 0, 0, 7); ctx.fill();
      [[-0.42, -0.86, -0.22, 0.32], [-0.15, -1.04, -0.06, 0.4], [0.13, -1.02, 0.08, 0.38], [0.38, -0.84, 0.24, 0.3]].forEach(([px, py, lean, length]) => { ctx.beginPath(); ctx.ellipse(px, py, 0.115, length, lean, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(-0.66, -0.12, 0.13, 0.32, -1.0, 0, 7); ctx.fill();
      ctx.restore();
      if (random() < 0.7) drip(x + (random() - 0.5) * size * 0.6, y + size * 0.4, mix(30, 140, random()), size * 0.09);
    };
    if (a.clarity === 'handprints') {
      const count = 5 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) hand(mix(CW * 0.15, CW * 0.85, random()), mix(CH * 0.3, CH * 0.75, random()), mix(34, 46, random()), (random() - 0.5) * 0.9, random() < 0.5);
    } else if (a.clarity !== 'pushing' && random() < 0.6) hand(fx + S * mix(1.1, 1.5, random()) * (random() < 0.5 ? -1 : 1), fy + S * 1.6, 36, (random() - 0.5) * 0.6, random() < 0.5);
    if (a.message !== 'none') {
      const words = WORDS[a.message].split(' ');
      const lines = words.length > 2 ? [words.slice(0, 1).join(' '), words.slice(1).join(' ')] : words.length === 2 && !small ? words : [words.join(' ')];
      const size = Math.min(CW * 0.9 / Math.max(...lines.map((line) => line.length)) * 1.35, CW * 0.24);
      const startY = small ? CH * 0.86 - (lines.length - 1) * size : CH * 0.7;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${size}px sans-serif`;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      lines.forEach((text, row) => {
        const step = size * 0.74;
        [...text].forEach((letter, k) => {
          const x = CW / 2 + (k - (text.length - 1) / 2) * step + (random() - 0.5) * 5, y = startY + row * size * 1.08 + (random() - 0.5) * 12 + k * 3;
          ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.22);
          ctx.strokeStyle = wiped; ctx.lineWidth = size * 0.1; ctx.fillStyle = wiped;
          ctx.strokeText(letter, 0, 0); ctx.fillText(letter, 0, 0);
          ctx.restore();
          if (letter !== ' ' && random() < 0.4) drip(x + (random() - 0.5) * size * 0.3, y + size * 0.25, mix(20, 110, random()), size * 0.07);
        });
      });
    }
    // Foxing: the silvering rots in from the edges.
    for (let i = 0; i < mix(60, 520, mood.wear); i++) {
      const edge = random() ** 2.2, along = random();
      const sideOf = Math.floor(random() * 4);
      const x = sideOf === 0 ? edge * CW * 0.5 : sideOf === 1 ? CW - edge * CW * 0.5 : along * CW;
      const y = sideOf === 2 ? edge * CH * 0.4 : sideOf === 3 ? CH - edge * CH * 0.4 : along * CH;
      ctx.fillStyle = `rgba(${random() < 0.5 ? '36,28,20' : '70,52,30'},${mix(0.25, 0.8, random())})`;
      ctx.beginPath(); ctx.arc(x, y, mix(1.5, 8, random()), 0, 7); ctx.fill();
    }
    const crack = (points: [number, number][]) => {
      for (const [width, colour, shift] of [[5, 'rgba(8,10,14,0.8)', 2], [2, 'rgba(236,242,248,0.95)', 0]] as const) {
        ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineJoin = 'round';
        ctx.beginPath(); points.forEach(([x, y], k) => (k ? ctx.lineTo(x + shift, y + shift) : ctx.moveTo(x + shift, y + shift))); ctx.stroke();
      }
    };
    const jagged = (from: [number, number], to: [number, number], steps: number, wobble: number) =>
      Array.from({ length: steps + 1 }, (_unused, k) => [mix(from[0], to[0], k / steps) + (k % steps ? (random() - 0.5) * wobble : 0), mix(from[1], to[1], k / steps) + (k % steps ? (random() - 0.5) * wobble : 0)] as [number, number]);
    const board = '#4a3423';
    if (a.cracks === 'single') {
      crack(jagged([CW * mix(0.05, 0.3, random()), 0], [CW * mix(0.7, 1, random()), CH], 9, 46));
      crack(jagged([CW * 0.5, CH * 0.5], [CW, CH * mix(0.3, 0.45, random())], 5, 30));
    }
    if (a.cracks === 'star') {
      const ox = CW * mix(0.3, 0.7, random()), oy = CH * mix(0.5, 0.66, random());
      const spokes = 9, ends: [number, number][] = [];
      for (let i = 0; i < spokes; i++) {
        const angle = i / spokes * 6.283 + random() * 0.4, reach = mix(CW * 0.4, CH * 0.6, random());
        ends.push([ox + Math.cos(angle) * reach, oy + Math.sin(angle) * reach]);
        crack(jagged([ox, oy], ends[i], 6, 22));
      }
      for (const ring of [0.12, 0.26]) crack(ends.concat([ends[0]]).map(([x, y]) => [mix(ox, x, ring * mix(0.8, 1.2, random())), mix(oy, y, ring * mix(0.8, 1.2, random()))] as [number, number]));
      ctx.fillStyle = board;
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(mix(ox, ends[0][0], 0.4), mix(oy, ends[0][1], 0.4)); ctx.lineTo(mix(ox, ends[1][0], 0.45), mix(oy, ends[1][1], 0.45)); ctx.fill();
      ctx.beginPath(); ctx.arc(ox, oy, 12, 0, 7); ctx.fill();
    }
    if (a.cracks === 'corner') {
      const right = random() < 0.5;
      const cut: [number, number][] = jagged([right ? CW * 0.42 : CW * 0.58, CH], [right ? CW : 0, CH * mix(0.66, 0.78, random())], 5, 26);
      ctx.fillStyle = board;
      ctx.beginPath(); cut.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineTo(right ? CW : 0, CH); ctx.fill();
      crack(cut);
      crack(jagged(cut[2], [right ? CW * 0.2 : CW * 0.8, CH * 0.45], 6, 28));
    }

    const reflection = new THREE.CanvasTexture(canvas);
    reflection.colorSpace = THREE.SRGBColorSpace;
    reflection.anisotropy = 4;
    const glass = new THREE.MeshStandardMaterial({ map: reflection, roughness: 0.22, metalness: 0.25, emissive: '#ffffff', emissiveMap: reflection, emissiveIntensity: mix(0.22, 0.42, mood.energy) });

    // ---- frame ----------------------------------------------------------------------
    const outline = (grow: number) => {
      const path = new THREE.Shape();
      const hw = w / 2 + grow, hh = h / 2 + grow;
      if (shape === 'oval') path.absellipse(0, 0, hw, hh, 0, Math.PI * 2);
      else if (shape === 'arched') { path.moveTo(-hw, -hh); path.lineTo(hw, -hh); path.lineTo(hw, h / 2 - w / 2); path.absarc(0, h / 2 - w / 2, hw, 0, Math.PI); path.lineTo(-hw, -hh); }
      else { path.moveTo(-hw, -hh); path.lineTo(hw, -hh); path.lineTo(hw, hh); path.lineTo(-hw, hh); path.lineTo(-hw, -hh); }
      return path;
    };
    const paintTexture = () => {
      const chips = document.createElement('canvas');
      chips.width = chips.height = 128;
      const g = chips.getContext('2d')!;
      g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < mix(8, 70, mood.wear); i++) { g.fillStyle = random() < 0.6 ? '#6d5338' : '#a9a08c'; g.beginPath(); g.ellipse(random() * 128, random() * 128, mix(2, 9, random()), mix(1, 5, random()), random() * 3, 0, 7); g.fill(); }
      const texture = new THREE.CanvasTexture(chips);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      return texture;
    };
    const wood = a.frame === 'gilt' ? s.material('#b48f3c', { metalness: 0.75, roughness: 0.38 })
      : a.frame === 'painted' ? new THREE.MeshStandardMaterial({ map: paintTexture(), roughness: 0.7 })
        : s.material(a.frame === 'arched-oak' ? '#2e2620' : a.frame === 'dressing' ? '#6a4226' : '#56281b', { roughness: 0.42 });
    const brass = s.material('#b9954a', { metalness: 0.85, roughness: 0.3 });
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number] = [0, 0, 0], size: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = new THREE.SphereGeometry(1, 16, 12);

    const mirror = new THREE.Group();
    const glassGeometry = new THREE.ShapeGeometry(outline(0), 40);
    const uv = glassGeometry.attributes.uv, position = glassGeometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, position.getX(i) / w + 0.5, position.getY(i) / h + 0.5);
    add(mirror, glassGeometry, glass);
    const ring = outline(fw);
    ring.holes.push(new THREE.Path(outline(-0.004).getPoints(40).reverse()));
    add(mirror, new THREE.ExtrudeGeometry(ring, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.009, bevelSize: 0.009, bevelSegments: 2, curveSegments: 40 }), wood, [0, 0, -0.022]);
    add(mirror, new THREE.ShapeGeometry(outline(fw * 0.6), 40), s.material('#4a3423', { side: THREE.DoubleSide }), [0, 0, -0.018]);
    if (a.frame === 'gilt') {
      const beads: { at: [number, number, number]; size: number }[] = [];
      const hw = w / 2 + fw * 0.5, hh = h / 2 + fw * 0.5;
      for (let x = -hw; x <= hw + 0.001; x += 0.048) beads.push({ at: [x, hh, 0.02], size: 0.014 }, { at: [x, -hh, 0.02], size: 0.014 });
      for (let y = -hh; y <= hh + 0.001; y += 0.048) beads.push({ at: [hw, y, 0.02], size: 0.014 }, { at: [-hw, y, 0.02], size: 0.014 });
      mirror.add(s.scatter(ball, wood, beads));
      for (const [cx, cy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(mirror, ball, wood, [cx * (w / 2 + fw * 0.6), cy * (h / 2 + fw * 0.6), 0.012], [0.05, 0.05, 0.022]);
      for (let i = -3; i <= 3; i++) add(mirror, ball, wood, [i * 0.045, h / 2 + fw + 0.045 + (1 - Math.abs(i) / 3) * 0.035, 0], [0.03, 0.085 - Math.abs(i) * 0.012, 0.016]).rotation.z = -i * 0.27;
      add(mirror, ball, wood, [0, h / 2 + fw + 0.01, 0.01], [0.06, 0.035, 0.022]);
    }
    if (a.frame === 'painted') {
      for (const side of [-1, 1]) add(mirror, new THREE.TorusGeometry(0.045, 0.014, 8, 18), wood, [side * 0.055, h / 2 + fw + 0.035, 0], [1, 0.65, 1]).rotation.z = side * 0.3;
      add(mirror, ball, wood, [0, h / 2 + fw + 0.03, 0.004], [0.022, 0.022, 0.018]);
      for (const side of [-1, 1]) add(mirror, new THREE.BoxGeometry(0.03, 0.09, 0.012), wood, [side * 0.03, h / 2 + fw - 0.02, 0.016]).rotation.z = side * 0.4;
    }

    // ---- a face coming through the glass ------------------------------------------------
    if (a.clarity === 'pushing') {
      const membrane = new THREE.MeshStandardMaterial({ color: '#c3ced9', roughness: 0.28, metalness: 0.3, emissive: '#7f93ab', emissiveIntensity: 0.35 });
      const faceW = S / CW * w * (a.whose === 'woman' ? 0.72 : a.whose === 'child' ? 0.95 : 0.82), faceH = S / CW * w * 1.12;
      const rings = 22, spokes = 44;
      const points: number[] = [], faces: number[] = [];
      const bell = (x: number) => Math.exp(-x * x);
      const gape = a.whose === 'woman' ? 1.7 : 1;
      for (let j = 0; j <= rings; j++)
        for (let i = 0; i <= spokes; i++) {
          const rho = j / rings, angle = i / spokes * Math.PI * 2;
          const x = Math.cos(angle) * rho, y = Math.sin(angle) * rho;
          const dome = Math.pow(Math.max(0, 1 - rho * rho), 0.6) * 0.085;
          const features = 0.04 * bell(x / 0.16) * bell((y + 0.08) / 0.24)
            - 0.03 * gape * (bell((x - 0.36) / 0.17) + bell((x + 0.36) / 0.17)) * bell((y - 0.2) / 0.14)
            - 0.035 * gape * bell(x / (a.whose === 'yours' ? 0.5 : 0.2)) * bell((y + 0.5) / (0.1 * gape))
            + 0.012 * bell(x / 0.5) * bell((y - 0.42) / 0.09);
          points.push(x * faceW, y * faceH, (dome + features * (1 - rho ** 4)) * (small ? 0.7 : 1) + 0.002);
        }
      for (let j = 0; j < rings; j++)
        for (let i = 0; i < spokes; i++) { const k = j * (spokes + 1) + i; faces.push(k, k + spokes + 1, k + 1, k + 1, k + spokes + 1, k + spokes + 2); }
      const bulge = new THREE.BufferGeometry();
      bulge.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      bulge.setIndex(faces);
      bulge.computeVertexNormals();
      const gx = (fx / CW - 0.5) * w, gy = (0.5 - fy / CH) * h;
      add(mirror, bulge, membrane, [gx, gy, 0]);
      for (const side of [-1, 1]) {
        const palm = new THREE.Group();
        palm.position.set(THREE.MathUtils.clamp(gx + side * faceW * 1.5, -w / 2 + 0.06, w / 2 - 0.06), gy - faceH * mix(0.7, 1.3, random()), 0.004);
        palm.rotation.z = -side * mix(0.1, 0.5, random());
        const k = faceW * 0.55;
        mirror.add(palm);
        add(palm, ball, membrane, [0, 0, 0], [k * 0.5, k * 0.55, 0.02]);
        [[-0.42, 0.9, 0.25], [-0.15, 1.08, 0.08], [0.13, 1.05, -0.08], [0.38, 0.88, -0.25]].forEach(([px, py, lean]) => add(palm, ball, membrane, [px * k, py * k, 0], [k * 0.12, k * 0.36, 0.014]).rotation.z = lean);
        add(palm, ball, membrane, [side * -0.62 * k, 0.15 * k, 0], [k * 0.13, k * 0.3, 0.014]).rotation.z = side * 0.95;
      }
    }

    // ---- covering -----------------------------------------------------------------------
    if (a.cover !== 'bare') {
      const cloth = new THREE.MeshStandardMaterial({ color: a.cover === 'crepe' ? '#18161b' : new THREE.Color('#e4e1d6').lerp(new THREE.Color('#9d998c'), mood.wear * 0.5), roughness: 1, side: THREE.DoubleSide });
      const side = random() < 0.5 ? -1 : 1;
      const nu = 22, nv = 26, topY = h / 2 + fw + 0.015;
      const span = (w + fw * 2) * (a.cover === 'crepe' ? 1.12 : 0.5), startX = a.cover === 'crepe' ? -span / 2 : -(w / 2 + fw + 0.03);
      const points: number[] = [], faces: number[] = [];
      const p1 = random() * 6;
      for (let j = 0; j <= nv; j++)
        for (let i = 0; i <= nu; i++) {
          const u = i / nu, v = j / nv;
          const x = side * (startX + u * span);
          // The path runs up the front, over the top edge and down the back.
          const front = a.cover === 'crepe' ? 0.15 - 0.11 * Math.cos((u - 0.5) * Math.PI * 2) : mix(h * 0.62, h * 0.06, u ** 0.7);
          const back = a.cover === 'crepe' ? 0.14 : h * 0.5;
          const arc = small ? 0.5 : 1;
          const length = front * arc + back * arc + 0.07;
          const d = v * length;
          let y: number, z: number;
          if (d < front * arc) { y = topY - (front * arc - d); z = 0.035 + (front * arc - d) * 0.05; }
          else if (d < front * arc + 0.07) { const t = (d - front * arc) / 0.07; y = topY + Math.sin(t * Math.PI) * 0.012; z = 0.035 - t * 0.075; }
          else { y = topY - (d - front * arc - 0.07); z = -0.04 - (d - front * arc - 0.07) * 0.03; }
          const hang = Math.abs(topY - y);
          const drop = shape !== 'rect' ? Math.max(0, (Math.abs(x) / (w / 2 + fw)) ** 2 * w * 0.42 * (shape === 'oval' ? 1.15 : 1)) : 0;
          points.push(x, y - Math.min(drop, 0.28) * (hang < 0.02 ? 1 : 1), z + Math.sin(u * 15 + p1) * 0.022 * Math.min(1, hang * 6) * (z > 0 ? 1 : -1));
        }
      for (let j = 0; j < nv; j++)
        for (let i = 0; i < nu; i++) { const k = j * (nu + 1) + i; faces.push(k, k + nu + 1, k + 1, k + 1, k + nu + 1, k + nu + 2); }
      const drape = new THREE.BufferGeometry();
      drape.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      drape.setIndex(faces);
      drape.computeVertexNormals();
      add(mirror, drape, cloth);
    }

    // ---- stand --------------------------------------------------------------------------
    const tilt = mix(-0.2, 0.06, random());
    const postX = w / 2 + fw + 0.04;
    if (small) {
      const baseH = 0.13, pivotY = baseH + 0.04 + h / 2 + fw;
      add(s.root, new THREE.BoxGeometry(postX * 2 + 0.1, baseH - 0.03, 0.24), wood, [0, 0.03 + (baseH - 0.03) / 2, 0]);
      add(s.root, new THREE.BoxGeometry(postX * 2 + 0.13, 0.014, 0.26), wood, [0, baseH + 0.007, 0]);
      add(s.root, new THREE.BoxGeometry(postX * 2 - 0.02, baseH - 0.065, 0.01), s.material('#7d5230', { roughness: 0.4 }), [0, 0.03 + (baseH - 0.03) / 2, 0.121]);
      for (const x of [-1, 1]) {
        add(s.root, ball, brass, [x * 0.09, 0.03 + (baseH - 0.03) / 2, 0.13], [0.012, 0.012, 0.012]);
        for (const z of [-1, 1]) add(s.root, ball, wood, [x * (postX + 0.02), 0.018, z * 0.09], [0.024, 0.018, 0.024]);
        add(s.root, new THREE.CylinderGeometry(0.012, 0.016, pivotY - baseH + 0.06, 12), wood, [x * postX, baseH + (pivotY - baseH + 0.06) / 2, 0]);
        add(s.root, ball, wood, [x * postX, pivotY + 0.075, 0], [0.018, 0.022, 0.018]);
        add(s.root, ball, brass, [x * (postX + 0.018), pivotY, 0], [0.013, 0.013, 0.013]);
      }
      mirror.position.set(0, pivotY, 0);
    } else {
      const pivotY = 0.26 + h / 2 + fw + 0.02, postTop = pivotY + 0.22;
      const turned: [number, number][] = [[0.03, 0.2], [0.036, 0.23], [0.024, 0.27], [0.03, 0.34], [0.022, 0.42], [0.02, pivotY - 0.08], [0.03, pivotY - 0.04], [0.03, pivotY + 0.04], [0.02, pivotY + 0.08], [0.018, postTop - 0.03], [0.028, postTop], [0.012, postTop + 0.02]];
      for (const x of [-1, 1]) {
        add(s.root, new THREE.LatheGeometry(turned.map(([r, y]) => new THREE.Vector2(r, y)), 16), wood, [x * postX, 0, 0]);
        add(s.root, ball, wood, [x * postX, postTop + 0.04, 0], [0.026, 0.03, 0.026]);
        for (const z of [-1, 1]) {
          const leg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(x * postX, 0.24, 0), new THREE.Vector3(x * postX, 0.2, z * 0.1), new THREE.Vector3(x * postX, 0.08, z * 0.22), new THREE.Vector3(x * postX, 0.03, z * 0.3)]), 14, 0.022, 8);
          add(s.root, leg, wood);
          add(s.root, ball, a.frame === 'gilt' ? wood : brass, [x * postX, 0.022, z * 0.31], [0.026, 0.022, 0.03]);
        }
        add(s.root, ball, brass, [x * (postX + 0.035), pivotY, 0], [0.022, 0.022, 0.022]);
        add(s.root, new THREE.CylinderGeometry(0.008, 0.008, 0.08, 8), brass, [x * (postX - 0.01), pivotY, 0]).rotation.z = Math.PI / 2;
      }
      add(s.root, new THREE.CylinderGeometry(0.014, 0.014, postX * 2, 10), wood, [0, 0.235, 0]).rotation.z = Math.PI / 2;
      add(s.root, ball, wood, [0, 0.235, 0], [0.05, 0.024, 0.024]);
      mirror.position.set(0, pivotY, 0);
    }
    mirror.rotation.x = tilt;
    s.root.add(mirror);

    const sway = mix(0, 0.07, mood.energy), phase = random() * 6;
    return s.finish({ update: (_dt, time) => { mirror.rotation.x = tilt + Math.sin(time * 0.8 + phase) * sway; } });
  },
});
