import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const GENRES = {
  horror: { sign: 'HORROR', paper: '#7d0f12', ink: '#f0e6cf', colours: ['#17141a', '#8f1414', '#2b3a1f', '#3a1238', '#b9b2a2', '#d9380f', '#101a2a'] },
  family: { sign: 'FAMILY', paper: '#f2c21a', ink: '#1c3f9c', colours: ['#f2c21a', '#2f8fe0', '#e8443a', '#58b84a', '#f08ab4', '#f6f2e6', '#8a5ad6'] },
  action: { sign: 'ACTION', paper: '#1a1a1c', ink: '#f28a12', colours: ['#f28a12', '#1c2530', '#b3261e', '#5d7186', '#e9d23a', '#2c2c2e', '#8a3a12'] },
  foreign: { sign: 'FOREIGN', paper: '#e9e0c6', ink: '#5a1f2a', colours: ['#e9e0c6', '#6e1f2c', '#6b6b3a', '#c99a2e', '#27323a', '#a8b4b0', '#3a2a22'] },
  new: { sign: 'NEW RELEASES', paper: '#d81e2c', ink: '#fff3a8', colours: ['#d81e2c', '#1f4fb8', '#f2f2f2', '#141414', '#f2b81a', '#1f9a8a', '#7a2a9a'] },
  comedy: { sign: 'COMEDY', paper: '#f06a1c', ink: '#fff7dc', colours: ['#f06a1c', '#ffd83a', '#38b8d8', '#f2f2ea', '#e8408a', '#7ac83a', '#f04a3a'] },
  scifi: { sign: 'SCI-FI', paper: '#101c3a', ink: '#6ef0e0', colours: ['#101c3a', '#1f6a8a', '#6ef0e0', '#8a8f9a', '#3a1a5a', '#d8dce0', '#e0522a'] },
} as const;

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Four anonymous cover layouts in one strip; the instance colour tints them. */
function coverAtlas() {
  return paint(512, 224, (ctx) => {
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, 512, 224);
    const dark = 'rgba(0,0,0,0.6)', light = 'rgba(255,255,255,0.85)';
    // 0: title band, a moon, a credit block.
    ctx.fillStyle = dark; ctx.fillRect(8, 10, 112, 40);
    ctx.fillStyle = light; ctx.fillRect(18, 22, 92, 14);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(64, 118, 40, 0, 7); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.arc(76, 108, 26, 0, 7); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(14, 186, 100, 6); ctx.fillRect(26, 198, 76, 5);
    // 1: head and shoulders under a white title.
    ctx.fillStyle = dark; ctx.fillRect(128, 60, 128, 164);
    ctx.fillStyle = light; ctx.fillRect(138, 12, 108, 34);
    ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(192, 112, 30, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(140, 224); ctx.quadraticCurveTo(192, 110, 244, 224); ctx.fill();
    // 2: diagonal slash with a title at the foot.
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(384, 0); ctx.lineTo(256, 150); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(384, 40); ctx.lineTo(384, 150); ctx.lineTo(290, 150); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(264, 164, 112, 44);
    ctx.fillStyle = light; ctx.fillRect(274, 176, 92, 8); ctx.fillRect(274, 190, 60, 8);
    // 3: stacked block letters.
    ctx.fillStyle = dark; ctx.fillRect(384, 0, 128, 224);
    ctx.fillStyle = light;
    for (let i = 0; i < 4; i++) ctx.fillRect(396, 20 + i * 36, 104 - (i % 2) * 28, 24);
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(396, 174, 104, 36);
  });
}

function signTexture(text: string, ratio: number, paper: string, ink: string, style: 'lightbox' | 'card' | 'wood' | 'banner') {
  const w = 768, h = Math.round(768 / ratio);
  return paint(w, h, (ctx) => {
    ctx.fillStyle = style === 'wood' ? '#6a4324' : style === 'card' ? '#fff06a' : style === 'banner' ? '#f3f1e6' : paper;
    ctx.fillRect(0, 0, w, h);
    if (style === 'wood') { ctx.strokeStyle = 'rgba(40,20,8,0.35)'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(0, i * h / 9 + 6); ctx.bezierCurveTo(w / 3, i * h / 9 - 8, w * 0.66, i * h / 9 + 18, w, i * h / 9 + 4); ctx.stroke(); } }
    if (style === 'banner') { ctx.fillStyle = '#cfe0ea'; for (let i = 0; i < 6; i++) ctx.fillRect(0, i * h / 3, w, h / 6); ctx.fillStyle = '#9a9a92'; for (let x = 10; x < w; x += 26) { ctx.beginPath(); ctx.arc(x, 9, 4, 0, 7); ctx.arc(x, h - 9, 4, 0, 7); ctx.fill(); } }
    if (style === 'lightbox') { ctx.strokeStyle = ink; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20); }
    ctx.fillStyle = style === 'wood' ? '#f2dc9a' : style === 'card' ? '#c81e1e' : style === 'banner' ? '#2a2a2e' : ink;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = Math.min(h * 0.62, (w * 1.55) / text.length);
    ctx.font = `${style === 'card' ? 'italic ' : ''}900 ${size}px ${style === 'banner' ? 'monospace' : style === 'card' ? 'cursive' : 'sans-serif'}`;
    ctx.fillText(text, w / 2, h / 2 + size * 0.04, w - 50);
    if (style === 'card') { ctx.lineWidth = 6; ctx.strokeStyle = '#c81e1e'; ctx.beginPath(); ctx.moveTo(60, h - 22); ctx.quadraticCurveTo(w / 2, h - 6, w - 60, h - 26); ctx.stroke(); }
  });
}

export default defineThing({
  questions: {
    genre: choice('Which section is this shelf?', {
      horror: 'HORROR: black and blood-red covers with sickly greens.',
      family: 'FAMILY: bright primaries, clamshell cases, cartoon colours.',
      action: 'ACTION: orange fireballs, gunmetal and yellow type.',
      foreign: 'FOREIGN: muted cream, burgundy and olive, serious covers.',
      new: 'NEW RELEASES: glossy and loud, the same title face-out in long runs.',
      comedy: 'COMEDY: orange, yellow and pink, grinning covers.',
      scifi: 'SCI-FI: deep blue, teal glow and chrome.',
    }),
    format: choice('What format is on the shelf?', {
      vhs: 'Tall cardboard VHS sleeves.',
      dvd: 'Slim, slightly wider DVD cases.',
      laserdisc: 'Big square laserdisc sleeves, three rows of them.',
      mixed: 'DVDs taking over the top shelves while VHS is pushed down to the bottom.',
    }),
    picked: score('How much of it is already rented out?', ['Fully stocked', 'A few gaps', 'Half gone', 'Only what nobody wants is left']),
    sun: noul('Has the window end of the shelf been bleached pale by years of sun?'),
    header: choice('What kind of genre header does it carry?', {
      lightbox: 'A plastic light-up header in the store colours.',
      card: 'A yellow card hand-lettered in red marker.',
      wood: 'A routed, stained wooden board with painted letters.',
      banner: 'A strip of dot-matrix printer paper with the genre printed across it.',
    }),
    fixture: choice('What is the fixture made of?', {
      laminate: 'Beige laminate with a brown kick plate, the default shop fitting.',
      corporate: 'Royal blue with a yellow stripe, a chain store.',
      black: 'Black slatboard and black wire, a specialist shop.',
      pine: 'Stained pine built by the owner.',
    }),
    state: choice('What is going on at this shelf?', {
      tidy: 'Faced up and straightened, every box square.',
      restock: 'Stacks of returned tapes stand on the floor at its ends waiting to be shelved.',
      clearance: 'Orange starburst price cards are clipped along it: previously viewed, for sale.',
      toppled: 'Boxes have slid off and lie scattered on the floor at its foot.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const genre = GENRES[a.genre];
    const W = mix(1.15, 1.6, mood.density);
    const fixture = { laminate: ['#d8ccb2', '#5a4634'], corporate: ['#1f46a8', '#f2c21a'], black: ['#26262a', '#4a4a50'], pine: ['#b98a52', '#7a5630'] }[a.fixture];
    const board = s.material(fixture[0], { roughness: 0.6 });
    const trim = s.material(fixture[1], { roughness: 0.6 });
    const white = s.material('#efeee6', { roughness: 0.7 });
    const large = a.format === 'laserdisc';
    const rows = large ? 3 : 5;
    const pitch = large ? 0.4 : 0.262;
    const H = 0.2 + rows * pitch + 0.06;
    const depthAt = (r: number) => 0.075 + (rows - 1 - r) * (large ? 0.06 : 0.045);

    // Carcass: kick plate, spine, stepped shelves with price rails, end posts.
    s.box([W, 0.14, depthAt(0) * 2 + 0.16], [0, 0.07, 0], trim);
    s.box([W, H - 0.14, 0.05], [0, 0.14 + (H - 0.14) / 2, 0], board);
    for (let r = 0; r < rows; r++) {
      const y = 0.2 + r * pitch, d = depthAt(r) + 0.05;
      s.box([W, 0.018, d * 2], [0, y - 0.009, 0], board);
      for (const dir of [-1, 1]) s.box([W, 0.032, 0.008], [0, y - 0.004, dir * d], a.fixture === 'corporate' ? trim : white);
    }
    for (const x of [-1, 1]) s.box([0.035, H + 0.02, 0.1], [x * (W / 2 + 0.0175), (H + 0.02) / 2, 0], trim);
    s.box([W + 0.07, 0.03, 0.14], [0, H + 0.015, 0], trim);

    // Covers.
    const atlas = coverAtlas();
    const coverMaterial = new THREE.MeshStandardMaterial({ map: atlas, roughness: mix(0.45, 0.85, mood.wear) });
    const sizes = { vhs: [0.105, 0.19, 0.028], dvd: [0.135, 0.19, 0.015], laserdisc: [0.315, 0.315, 0.012] } as const;
    const lists = new Map<string, { matrix: THREE.Matrix4; colour: THREE.Color }[]>();
    const push = (kind: 'vhs' | 'dvd' | 'laserdisc', variant: number, matrix: THREE.Matrix4, colour: THREE.Color) => {
      const key = `${kind}:${variant}`;
      if (!lists.has(key)) lists.set(key, []);
      lists.get(key)!.push({ matrix, colour });
    };
    const bleach = new THREE.Color('#a9c6d2'), dust = new THREE.Color('#8e8676');
    const tags: { at: [number, number, number]; size: number }[] = [];
    const fallen: { kind: 'vhs' | 'dvd' | 'laserdisc'; variant: number; colour: THREE.Color }[] = [];
    const sloppy = a.state === 'toppled' ? 1 : a.state === 'tidy' ? 0.15 : mix(0.3, 1, mood.wear);
    for (const dir of [1, -1]) {
      for (let r = 0; r < rows; r++) {
        const kind = a.format === 'mixed' ? (r >= rows - 2 ? 'dvd' : 'vhs') : a.format;
        const [bw, bh, bd] = sizes[kind];
        const slot = bw + (large ? 0.03 : 0.018);
        const n = Math.floor((W - 0.04) / slot);
        const rowGap = a.picked * mix(0.35, 1.25, random()) * (a.genre === 'new' && r >= rows - 2 ? 1.4 : 1);
        let run = 0, runColour = new THREE.Color(), runVariant = 0;
        for (let i = 0; i < n; i++) {
          if (run <= 0) {
            run = a.genre === 'new' ? 2 + Math.floor(random() * 5) : 1;
            runColour = new THREE.Color(genre.colours[Math.floor(random() * genre.colours.length)]);
            runColour.offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.12);
            runVariant = Math.floor(random() * 4);
          }
          run--;
          const x = -((n - 1) * slot) / 2 + i * slot;
          const y = 0.2 + r * pitch, z = dir * (depthAt(r) - 0.005);
          const colour = runColour.clone().lerp(dust, mood.wear * 0.3);
          if (a.sun && dir === 1) colour.lerp(bleach, mix(0.15, 0.92, (x / W + 0.5)) * mix(0.8, 1, random()));
          if (random() < rowGap * 0.82) {
            if (random() < 0.5) tags.push({ at: [x, y + 0.03, z - dir * 0.03], size: 1 });
            if (a.state === 'toppled' && random() < 0.45) fallen.push({ kind, variant: runVariant, colour });
            continue;
          }
          const lean = -dir * (0.13 + random() * 0.05 * sloppy);
          const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(x + (random() - 0.5) * 0.012 * sloppy, y + bh / 2 * Math.cos(lean), z - dir * bh / 2 * 0.13),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, dir === 1 ? 0 : Math.PI, (random() - 0.5) * 0.16 * sloppy * sloppy, 'YXZ')),
            new THREE.Vector3(1, 1, 1));
          push(kind, runVariant, matrix, colour);
        }
      }
    }
    // Returned tapes waiting on top, or boxes on the floor.
    if (a.state === 'restock') {
      const piles = 1 + Math.floor(random() * 2);
      for (let p = 0; p < piles; p++) {
        const px = (p === 0 ? 1 : -1) * (W / 2 + 0.2 + random() * 0.08), pz = (random() - 0.5) * 0.3, count = 4 + Math.floor(random() * 9);
        const spin = random() * Math.PI;
        for (let i = 0; i < count; i++) {
          const colour = new THREE.Color(genre.colours[Math.floor(random() * genre.colours.length)]);
          push('vhs', Math.floor(random() * 4), new THREE.Matrix4().compose(
            new THREE.Vector3(px + (random() - 0.5) * 0.02, 0.014 + i * 0.028, pz + (random() - 0.5) * 0.015),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, spin + (random() - 0.5) * 0.5, 0, 'YXZ')),
            new THREE.Vector3(1, 1, 1)), colour);
        }
      }
    }
    for (const item of fallen.slice(0, 26)) {
      const [, , bd] = sizes[item.kind];
      const side = random() < 0.7 ? 1 : -1;
      push(item.kind, item.variant, new THREE.Matrix4().compose(
        new THREE.Vector3((random() - 0.5) * W * 1.05, bd / 2 + random() * 0.012, side * (depthAt(0) + 0.2 + random() * 0.4)),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, random() * Math.PI * 2, 0, 'YXZ')),
        new THREE.Vector3(1, 1, 1)), item.colour);
    }
    for (const [key, list] of lists) {
      const [kind, variant] = key.split(':') as ['vhs' | 'dvd' | 'laserdisc', string];
      const geometry = new THREE.BoxGeometry(...sizes[kind]);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + Number(variant)) / 4);
      const mesh = new THREE.InstancedMesh(geometry, coverMaterial, list.length);
      list.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, item.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    if (tags.length) {
      const tag = new THREE.BoxGeometry(0.06, 0.035, 0.003);
      s.scatter(tag, s.material('#f6e04a', { roughness: 0.8 }), tags);
    }
    if (a.state === 'clearance') {
      const burst = paint(128, 128, (ctx) => {
        ctx.fillStyle = '#ff7a1a'; ctx.beginPath();
        for (let i = 0; i < 28; i++) { const r = i % 2 ? 62 : 44, t = (i / 28) * Math.PI * 2; ctx.lineTo(64 + Math.cos(t) * r, 64 + Math.sin(t) * r); }
        ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.font = '900 34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$4', 64, 66);
      });
      const material = new THREE.MeshStandardMaterial({ map: burst, alphaTest: 0.5, transparent: false, roughness: 0.8, side: THREE.DoubleSide });
      void material;
      const card = s.material('#ff7a1a', { roughness: 0.8, emissive: '#ff5a00', emissiveIntensity: 0.15 });
      for (const dir of [1, -1]) for (let i = 0; i < 4; i++) {
        const r = Math.floor(random() * rows), x = (random() - 0.5) * W * 0.85;
        const star = s.cylinder(0.062, 0.062, 0.004, [x, 0.2 + r * pitch - 0.03, dir * (depthAt(r) + 0.062)], card, 9);
        star.rotation.x = Math.PI / 2;
        star.rotation.z = random();
      }
      material.dispose(); burst.dispose();
    }

    // Header.
    const text = genre.sign, hw = Math.min(W * 0.92, 0.2 * text.length * 0.55 + 0.3), hh = 0.2;
    const hy = H + 0.03 + 0.05 + hh / 2;
    const lit = a.header === 'lightbox';
    const texture = signTexture(text, hw / hh, genre.paper, genre.ink, a.header);
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: lit ? mix(0.25, 0.75, mood.cheer) : 0 });
    for (const x of [-1, 1]) s.box([0.025, 0.06, 0.025], [x * hw * 0.35, H + 0.06, 0], trim);
    const tilt = a.header === 'card' || a.header === 'banner' ? (random() - 0.5) * 0.09 * (1 + mood.wear) : 0;
    const slab = s.box([hw, hh, lit ? 0.07 : 0.018], [0, hy, 0], a.header === 'wood' ? s.material('#6a4324') : a.header === 'lightbox' ? trim : white);
    slab.rotation.z = tilt;
    for (const dir of [1, -1]) {
      const plane = s.mesh(new THREE.PlaneGeometry(hw * 0.985, hh * 0.95), face, [0, hy, dir * ((lit ? 0.035 : 0.009) + 0.002)]);
      plane.rotation.set(0, dir === 1 ? 0 : Math.PI, dir * tilt);
    }
    const flicker = lit ? mix(0, 0.35, mood.wear) * mix(0.4, 1, mood.energy) : 0;
    const base = face.emissiveIntensity;
    return s.finish({ footprint: W / 2 + 0.1, update: flicker > 0.02 ? (_dt, time) => { face.emissiveIntensity = base * (1 - flicker * (Math.sin(time * 31) > 0.72 ? 1 : 0) * (Math.sin(time * 2.3) > 0 ? 1 : 0.2)); } : undefined });
  },
});
