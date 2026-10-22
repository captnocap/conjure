import * as THREE from 'three';
import { choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

const METALS = {
  copper: 'Bright orange copper, a new penny that still shines on its high points.',
  bronze: 'Dark brown bronze, handled for decades.',
  verdigris: 'Green with verdigris, copper showing only where it has been rubbed.',
  nickel: 'Pale silvery nickel.',
  brass: 'Yellow brass, a token or a foreign coin.',
  zinc: 'Dull grey wartime zinc with pale spots.',
} as const;
const TONES: Record<keyof typeof METALS, { bright: string; dark: string; patina: string; crust: number }> = {
  copper: { bright: '#e39a63', dark: '#7a4226', patina: '#4f8a76', crust: 0.25 },
  bronze: { bright: '#b98549', dark: '#4d3421', patina: '#3f6f5c', crust: 0.35 },
  verdigris: { bright: '#c98f58', dark: '#2f6b5c', patina: '#7fc1a6', crust: 1 },
  nickel: { bright: '#e2e4df', dark: '#757a78', patina: '#55605c', crust: 0.3 },
  brass: { bright: '#e6c962', dark: '#806a2a', patina: '#5d7a4a', crust: 0.3 },
  zinc: { bright: '#b9c0c4', dark: '#545a5f', patina: '#e6e8e4', crust: 0.6 },
};

export default defineWorld({
  questions: {
    metal: choice('What metal is the coin, and what state is its surface in?', METALS),
    effigy: choice('What is struck in relief in the middle of the coin?', {
      head: 'A bare-headed profile portrait facing left, some forgotten statesman.',
      crowned: 'A crowned profile portrait, a monarch.',
      numeral: 'The tails side: a big numeral 1 inside a wreath.',
      ship: 'A three-masted sailing ship on waves.',
      tree: 'A spreading oak tree.',
      ghost: 'Almost nothing: the portrait has been rubbed down to a faint smooth ghost.',
    }),
    legend: choice('What does the lettering around the rim say?', {
      liberty: 'LIBERTY',
      penny: 'ONE PENNY',
      luck: 'GOOD LUCK, a pocket token.',
      latin: 'DEI GRATIA REGINA, old official Latin.',
      trust: 'IN LUCK WE TRUST',
      glyphs: 'Letters from an alphabet you cannot read, a coin from somewhere far away.',
    }),
    year: choice('What date is on it?', {
      y1911: '1911, older than anyone who carries it.',
      y1943: '1943, a wartime year.',
      y1968: '1968.',
      y1987: '1987, a childhood year.',
      y2001: '2001.',
      none: 'The date has worn off completely.',
    }),
    resting: choice('Where is the coin lying?', {
      pocket: 'At the bottom of a trouser pocket, among soft dark folds of cloth and a line of stitching.',
      drawer: 'In the corner of a wooden desk drawer, with a pencil stub and a rubber band.',
      fountain: 'On the tiled floor of a wishing fountain, with other thrown coins and rising bubbles.',
      pavement: 'On the pavement where it was dropped, among grit and a painted line.',
      saucer: 'On a white café saucer, left as a tip on top of the bill.',
    }),
    damage: choice('What has happened to this particular coin?', {
      circulated: 'Nothing special: the ordinary scratches of circulation.',
      holed: 'A hole has been drilled near the rim and a red thread tied through it, a lucky charm.',
      gouged: 'One deep gouge runs right across the face like a canyon.',
      flattened: 'It was laid on a railway line and squashed into a smeared oval.',
    }),
    view: choice('How do we look at it?', {
      plaza: 'From a raised three-quarter view, like a model of a city square.',
      low: 'From low down near the surface, the relief rising like hills.',
      map: 'From high above, a map of the whole disc.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const R = 8, thick = 0.9, reliefScale = 1.2, field = 0.25;
    const backdrop = { pocket: '#c3c7cf', drawer: '#ded3bf', fountain: '#c4e2df', pavement: '#d6d6d0', saucer: '#e8e2d6' }[a.resting];
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const canvasOf = (size: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      return canvas;
    };
    const textureOf = (canvas: HTMLCanvasElement, repeat = 1) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeat, repeat);
      texture.anisotropy = 4;
      return texture;
    };

    // ---- The die: a height map painted in greys. White is high, black is a gully. ----
    const S = 1024, C = S / 2, PR = S * 0.488;
    const sharp = canvasOf(S);
    const g = sharp.getContext('2d')!;
    const grey = (level: number) => { const v = Math.round(clamp01(level) * 255); return `rgb(${v},${v},${v})`; };
    g.fillStyle = grey(field);
    g.fillRect(0, 0, S, S);
    const ghost = a.effigy === 'ghost';
    const lift = (level: number) => field + (level - field) * (ghost ? 0.3 : 1);
    g.save();
    g.translate(C, C + 6);
    const u = 292; // effigy half-height in pixels
    const blob = (points: readonly (readonly [number, number])[]) => {
      g.beginPath();
      const n = points.length;
      g.moveTo(((points[n - 1][0] + points[0][0]) / 2) * u, ((points[n - 1][1] + points[0][1]) / 2) * u);
      for (let i = 0; i < n; i++) {
        const next = points[(i + 1) % n];
        g.quadraticCurveTo(points[i][0] * u, points[i][1] * u, ((points[i][0] + next[0]) / 2) * u, ((points[i][1] + next[1]) / 2) * u);
      }
      g.closePath();
    };
    const mound = (level: number, cx = 0, cy = 0, r = 1) => {
      const shade = g.createRadialGradient(cx * u, cy * u, 0, cx * u, cy * u, r * u);
      shade.addColorStop(0, grey(lift(level)));
      shade.addColorStop(1, grey(lift(level * 0.72)));
      g.fillStyle = shade;
    };
    const groove = (points: readonly (readonly [number, number])[], width: number, level = 0.4) => {
      g.strokeStyle = grey(lift(level));
      g.lineWidth = width;
      g.lineCap = 'round';
      g.beginPath();
      points.forEach(([x, y], i) => (i ? g.lineTo(x * u, y * u) : g.moveTo(x * u, y * u)));
      g.stroke();
    };
    if (a.effigy === 'head' || a.effigy === 'crowned' || ghost) {
      const profile = [[-0.36, 1.0], [-0.2, 0.66], [-0.3, 0.52], [-0.44, 0.47], [-0.5, 0.36], [-0.42, 0.28], [-0.37, 0.235], [-0.45, 0.18], [-0.41, 0.1], [-0.62, 0.05], [-0.47, -0.16], [-0.43, -0.26], [-0.42, -0.5], [-0.14, -0.82], [0.3, -0.8], [0.6, -0.46], [0.62, -0.1], [0.42, 0.22], [0.38, 0.5], [0.66, 0.8], [0.74, 1.0], [0.2, 1.06]] as const;
      mound(0.95, 0.05, -0.1, 1.2);
      blob(profile);
      g.fill();
      // Hair mass sits a little prouder than the face, with combed gullies through it.
      mound(1, 0.25, -0.4, 0.7);
      blob([[-0.34, -0.56], [-0.12, -0.84], [0.3, -0.82], [0.62, -0.46], [0.64, -0.08], [0.44, 0.2], [0.3, 0.02], [0.2, -0.3], [-0.05, -0.5]]);
      g.fill();
      for (let i = 0; i < 7; i++) groove([[-0.2 + i * 0.1, -0.74 + i * 0.03], [0.02 + i * 0.09, -0.5 + i * 0.06], [0.3 + i * 0.04, -0.2 + i * 0.05]], 9, 0.55);
      groove([[-0.34, -0.2], [-0.24, -0.215], [-0.2, -0.18]], 12, 0.42); // eye
      groove([[-0.4, -0.3], [-0.2, -0.33]], 8, 0.5); // brow
      groove([[0.12, -0.2], [0.2, -0.08], [0.13, 0.06], [0.07, -0.06], [0.12, -0.2]], 11, 0.5); // ear
      groove([[-0.36, 0.5], [-0.1, 0.44], [0.12, 0.2]], 9, 0.55); // jaw
      groove([[-0.38, 0.235], [-0.3, 0.24]], 8, 0.45); // mouth
      groove([[-0.3, 0.95], [0.0, 0.84], [0.66, 0.9]], 10, 0.5); // collar
      if (a.effigy === 'crowned') {
        g.fillStyle = grey(lift(1));
        g.beginPath();
        g.moveTo(-0.44 * u, -0.5 * u);
        for (let i = 0; i <= 5; i++) {
          const t = i / 5, bx = mix(-0.42, 0.5, t), by = mix(-0.56, -0.74, Math.sin(t * Math.PI * 0.6));
          g.lineTo(bx * u, by * u);
          if (i < 5) { g.lineTo((bx + 0.05) * u, (by - 0.3) * u); g.lineTo((bx + 0.13) * u, (by - 0.06) * u); }
        }
        g.lineTo(0.5 * u, -0.5 * u);
        g.closePath();
        g.fill();
        groove([[-0.42, -0.52], [0.05, -0.62], [0.5, -0.56]], 9, 0.5);
      }
    } else if (a.effigy === 'numeral') {
      g.fillStyle = grey(0.95);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `bold ${u * 1.75}px serif`;
      g.fillText('1', -0.02 * u, 0.08 * u);
      for (const side of [-1, 1])
        for (let i = 0; i < 9; i++) {
          const t = 0.35 + (i / 9) * 2.0, r = 0.86;
          g.save();
          g.translate(side * Math.sin(t) * r * u, Math.cos(t) * r * u);
          g.rotate(-side * t + (side > 0 ? 0.5 : -0.5) + (i % 2 ? 0.5 : -0.5) * side);
          g.fillStyle = grey(0.85);
          g.beginPath();
          g.ellipse(0, 0, 0.17 * u, 0.065 * u, 0, 0, 7);
          g.fill();
          g.restore();
        }
      groove([[-0.3, 0.9], [0, 0.98], [0.3, 0.9]], 14, 0.8);
    } else if (a.effigy === 'ship') {
      mound(0.95, 0, 0.5, 0.9);
      blob([[-0.8, 0.3], [0.86, 0.26], [0.62, 0.66], [-0.56, 0.68]]);
      g.fill();
      for (const [mx, top] of [[-0.42, -0.62], [0.02, -0.9], [0.46, -0.66]] as const) {
        groove([[mx, 0.32], [mx, top]], 13, 0.9);
        for (let i = 0; i < 3; i++) {
          const y0 = top + 0.1 + i * ((0.3 - top) / 3.2), h = (0.3 - top) / 3.9, w = 0.17 + i * 0.05;
          g.fillStyle = grey(0.8 - i * 0.03);
          blob([[mx - w, y0], [mx + w, y0], [mx + w * 1.25, y0 + h], [mx, y0 + h * 1.16], [mx - w * 1.25, y0 + h]]);
          g.fill();
        }
      }
      groove([[-0.8, 0.3], [-1.05, 0.02]], 9, 0.85);
      for (let i = 0; i < 3; i++) groove(Array.from({ length: 13 }, (_unused, j) => [-0.96 + j * 0.16, 0.8 + i * 0.1 + (j % 2 ? 0.035 : -0.035)] as const), 10, 0.7);
    } else {
      mound(0.9, 0, 0.6, 0.7);
      blob([[-0.1, 0.1], [0.1, 0.1], [0.14, 0.7], [0.4, 0.98], [-0.4, 0.98], [-0.14, 0.7]]);
      g.fill();
      const crown: [number, number, number][] = [[0, -0.4, 0.5], [-0.45, -0.25, 0.36], [0.45, -0.28, 0.36], [-0.25, -0.62, 0.34], [0.28, -0.62, 0.34], [-0.62, 0.02, 0.24], [0.62, 0, 0.24], [0, -0.78, 0.26]];
      for (const [cx, cy, r] of crown) { mound(1, cx, cy, r); g.beginPath(); g.arc(cx * u, cy * u, r * u, 0, 7); g.fill(); }
      for (let i = 0; i < 16; i++) { const t = random() * 6.3, r = random() * 0.6; groove([[Math.cos(t) * r, -0.35 + Math.sin(t) * r * 0.7], [Math.cos(t) * (r + 0.12), -0.35 + Math.sin(t) * (r + 0.1) * 0.7]], 10, 0.6); }
      groove([[-0.03, 0.9], [0, 0.3], [-0.2, -0.1]], 8, 0.6);
      groove([[0.04, 0.5], [0.22, -0.05]], 8, 0.6);
    }
    g.restore();

    // Rim, a ring of beads, and the legend running round inside it.
    g.strokeStyle = grey(0.82);
    g.lineWidth = PR * 0.09;
    g.beginPath();
    g.arc(C, C, PR * 0.955, 0, 7);
    g.stroke();
    g.fillStyle = grey(0.66);
    for (let i = 0; i < 84; i++) { const t = (i / 84) * Math.PI * 2; g.beginPath(); g.arc(C + Math.cos(t) * PR * 0.875, C + Math.sin(t) * PR * 0.875, 7, 0, 7); g.fill(); }
    const words = { liberty: 'LIBERTY', penny: 'ONE PENNY', luck: 'GOOD LUCK', latin: 'DEI GRATIA REGINA', trust: 'IN LUCK WE TRUST', glyphs: 'ΞΔΛ ΦΩΨΣ ЖЯ ΠΘ' }[a.legend];
    const date = { y1911: '1911', y1943: '1943', y1968: '1968', y1987: '1987', y2001: '2001', none: '' }[a.year];
    const arcText = (text: string, radius: number, size: number, centre: number, top: boolean, level: number) => {
      g.font = `bold ${size}px serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = grey(lift(level) * 0.5 + level * 0.5);
      const widths = [...text].map((letter) => g.measureText(letter).width + size * 0.16);
      const total = widths.reduce((sum, w) => sum + w, 0);
      let at = -total / 2;
      [...text].forEach((letter, i) => {
        const angle = centre + ((at + widths[i] / 2) / radius) * (top ? 1 : -1);
        at += widths[i];
        g.save();
        g.translate(C, C);
        g.rotate(angle);
        g.translate(0, top ? -radius : radius);
        g.fillText(letter, 0, 0);
        g.restore();
      });
    };
    arcText(words, PR * 0.735, words.length > 12 ? 74 : 92, 0, true, 0.8);
    if (date) arcText(date, PR * 0.745, 84, 0, false, 0.8);
    else { g.fillStyle = grey(0.36); g.beginPath(); g.ellipse(C, C + PR * 0.745, 110, 34, 0, 0, 7); g.fill(); }
    for (const side of [-1, 1]) { g.fillStyle = grey(0.7); g.beginPath(); g.arc(C + side * PR * 0.6, C + PR * 0.46, 13, 0, 7); g.fill(); }

    // Wear softens the strike; damage is cut afterwards so it stays crisp.
    const die = canvasOf(S);
    const d = die.getContext('2d')!;
    const soften = mix(2.2, 8, mood.wear) * (ghost ? 1.8 : 1) * (a.damage === 'flattened' ? 2.2 : 1);
    d.filter = `blur(${soften.toFixed(1)}px)`;
    d.drawImage(sharp, 0, 0);
    d.filter = 'blur(1.2px)';
    d.lineCap = 'round';
    const scratch = (x0: number, y0: number, x1: number, y1: number, width: number, depth: number) => {
      d.strokeStyle = grey(field + 0.12);
      d.lineWidth = width * 2.1;
      d.beginPath(); d.moveTo(x0, y0); d.lineTo(x1, y1); d.stroke();
      d.strokeStyle = grey(depth);
      d.lineWidth = width;
      d.beginPath(); d.moveTo(x0, y0); d.lineTo(x1, y1); d.stroke();
    };
    const scratches = Math.round(mix(4, 24, mood.wear));
    for (let i = 0; i < scratches; i++) {
      const t = random() * 6.3, far = random() * PR * 0.8, heading = random() * Math.PI, length = 40 + random() * 300 * mix(0.5, 1, mood.wear);
      const x = C + Math.cos(t) * far, y = C + Math.sin(t) * far;
      scratch(x - Math.cos(heading) * length / 2, y - Math.sin(heading) * length / 2, x + Math.cos(heading) * length / 2, y + Math.sin(heading) * length / 2, 2.5 + random() * 3, 0.08 + random() * 0.1);
    }
    for (let i = 0; i < mix(3, 22, mood.wear); i++) { d.fillStyle = grey(0.05); d.beginPath(); d.arc(C + (random() - 0.5) * PR * 1.6, C + (random() - 0.5) * PR * 1.6, 4 + random() * 7, 0, 7); d.fill(); }
    let holeAt: THREE.Vector2 | null = null;
    if (a.damage === 'gouged') {
      let x = C - PR * 0.8, y = C + (random() - 0.5) * PR * 0.9;
      const slope = (random() - 0.5) * 0.9;
      for (let i = 0; i < 9; i++) {
        const nx = x + PR * 0.18, ny = y + slope * PR * 0.18 + (random() - 0.5) * 34;
        scratch(x, y, nx, ny, 17 + random() * 9, 0);
        x = nx; y = ny;
      }
    }
    if (a.damage === 'holed') {
      const t = -Math.PI / 2 + (random() - 0.5) * 1.4;
      holeAt = new THREE.Vector2(Math.cos(t) * 0.6, Math.sin(t) * 0.6);
      d.fillStyle = grey(0.5);
      d.beginPath(); d.arc(C + holeAt.x * PR, C + holeAt.y * PR, 46, 0, 7); d.fill();
      d.fillStyle = grey(0);
      d.beginPath(); d.arc(C + holeAt.x * PR, C + holeAt.y * PR, 31, 0, 7); d.fill();
    }
    d.filter = 'none';
    const heightData = d.getImageData(0, 0, S, S).data;
    const heightAt = (px: number, py: number) => heightData[(Math.min(S - 1, Math.max(0, Math.round(py))) * S + Math.min(S - 1, Math.max(0, Math.round(px)))) * 4] / 255;

    // ---- Colour follows the relief: polished on the heights, grime in the edges, patina in the hollows. ----
    const tone = TONES[a.metal];
    const blotch = canvasOf(256);
    const b = blotch.getContext('2d')!;
    b.fillStyle = '#000';
    b.fillRect(0, 0, 256, 256);
    b.filter = 'blur(7px)';
    for (let i = 0; i < 46; i++) { b.fillStyle = `rgba(255,255,255,${0.25 + random() * 0.6})`; b.beginPath(); b.ellipse(random() * 256, random() * 256, 6 + random() * 34, 5 + random() * 22, random() * 3, 0, 7); b.fill(); }
    const blotchData = b.getImageData(0, 0, 256, 256).data;
    const skin = canvasOf(S);
    const k = skin.getContext('2d')!;
    const image = k.createImageData(S, S);
    const bright = new THREE.Color(tone.bright), dark = new THREE.Color(tone.dark), patina = new THREE.Color(tone.patina), soot = new THREE.Color('#231a14');
    for (const colour of [bright, dark, patina, soot]) colour.convertLinearToSRGB();
    const crust = clamp01(tone.crust * mix(0.45, 1.25, mood.wear));
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const i = (y * S + x) * 4, h = heightData[i] / 255;
        const slope = Math.abs(heightData[Math.min(S - 1, x + 2) + y * S << 2] - heightData[Math.max(0, x - 2) + y * S << 2]) + Math.abs(heightData[x + Math.min(S - 1, y + 2) * S << 2] - heightData[x + Math.max(0, y - 2) * S << 2]);
        const rub = clamp01((h - field) * 2.3 + 0.22);
        const mask = blotchData[((y >> 2) * 256 + (x >> 2)) * 4] / 255;
        let r = mix(dark.r, bright.r, rub), gg = mix(dark.g, bright.g, rub), bb = mix(dark.b, bright.b, rub);
        const green = clamp01(crust * (mask * 1.5 + 0.25) * (1.15 - rub * (a.metal === 'verdigris' ? 0.75 : 1.1)));
        r = mix(r, patina.r, green); gg = mix(gg, patina.g, green); bb = mix(bb, patina.b, green);
        const grime = clamp01(slope / 150) * mix(0.45, 0.8, mood.wear) + clamp01((field * 0.6 - h) * 2.4);
        r = mix(r, soot.r, clamp01(grime)); gg = mix(gg, soot.g, clamp01(grime)); bb = mix(bb, soot.b, clamp01(grime));
        image.data[i] = r * 255; image.data[i + 1] = gg * 255; image.data[i + 2] = bb * 255; image.data[i + 3] = 255;
      }
    k.putImageData(image, 0, 0);
    const skinTexture = textureOf(skin);
    skinTexture.wrapS = skinTexture.wrapT = THREE.ClampToEdgeWrapping;
    const metal = new THREE.MeshStandardMaterial({ map: skinTexture, metalness: 0.35, roughness: mix(0.38, 0.62, mood.wear) });

    // Each standing slot is lifted onto whatever relief it lands on, so nothing floats or drowns.
    const spin = (random() - 0.5) * 0.7, stretch = a.damage === 'flattened' ? [1.24, 0.9] : [1, 1];
    const reliefAt = (x: number, z: number) => {
      const lx = (x * Math.cos(spin) - z * Math.sin(spin)) / stretch[0], lz = (x * Math.sin(spin) + z * Math.cos(spin)) / stretch[1];
      let low = 1;
      for (const [ox, oz] of [[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) low = Math.min(low, heightAt(C + ((lx + ox) / R) * PR, C + ((lz + oz) / R) * PR));
      return Math.max(0, (low - field) * reliefScale);
    };
    const spots: [number, number, number][] = [[0.2, 2, 1], [-4.5, -1.7, 0.85], [4.5, -1.2, 0.85], [-3.3, 4.7, 0.72], [3.6, 4.8, 0.72], [-0.2, -5.1, 0.8]];
    const { art: s, world } = diorama(context, {
      background: backdrop, floor: null, width: 17, depth: 17, maxHeight: 4.6, radius: 2.1,
      pitch: { plaza: 34, low: 22, map: 52 }[a.view], yaw: 30,
      slots: spots.map(([x, z, size]) => [x, z, reliefAt(x, z), size] as const),
    });
    for (const child of s.root.children) if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = 1.0;
    if (world.keyLight) world.keyLight.intensity = 3.3;

    // ---- The struck face as real geometry, so every capture pass sees hills and gullies. ----
    const coin = new THREE.Group();
    s.root.add(coin);
    const N = 256;
    const face = new THREE.PlaneGeometry(R * 2, R * 2, N, N);
    face.rotateX(-Math.PI / 2);
    const position = face.getAttribute('position'), uv = face.getAttribute('uv');
    for (let i = 0; i < position.count; i++) {
      let x = position.getX(i), z = position.getZ(i);
      const far = Math.hypot(x, z);
      if (far > R) { x *= R / far; z *= R / far; }
      const px = C + (x / R) * PR, py = C + (z / R) * PR;
      position.setXYZ(i, x, (heightAt(px, py) - field) * reliefScale, z);
      uv.setXY(i, px / S, 1 - py / S);
    }
    face.computeVertexNormals();
    const ground = add(coin, face, metal);
    const reeds = canvasOf(64);
    const rg = reeds.getContext('2d')!;
    rg.fillStyle = tone.dark;
    rg.fillRect(0, 0, 64, 64);
    rg.fillStyle = tone.bright;
    rg.fillRect(0, 0, 30, 64);
    const edgeTexture = textureOf(reeds);
    edgeTexture.repeat.set(a.metal === 'copper' || a.metal === 'bronze' ? 1 : 150, 1);
    const rimTop = (0.82 - field) * reliefScale;
    const edge = add(coin, new THREE.CylinderGeometry(R * 1.002, R * 1.002, thick + rimTop, 160, 1, true), new THREE.MeshStandardMaterial({ map: edgeTexture, metalness: 0.35, roughness: 0.5 }));
    edge.position.y = (rimTop - thick) / 2;
    coin.rotation.y = spin;
    coin.scale.set(stretch[0], 1, stretch[1]);
    if (holeAt) {
      // The charm thread: through the hole, over the rim and away.
      coin.updateMatrixWorld(true);
      const hole = coin.localToWorld(new THREE.Vector3(holeAt.x * R, 0.1, holeAt.y * R));
      const out = hole.clone().setY(0).normalize();
      const side = new THREE.Vector3(-out.z, 0, out.x);
      const points = [hole.clone().addScaledVector(side, 0.5).setY(-thick + 0.1), hole.clone().addScaledVector(out, R * 0.25).setY(0.6), hole.clone().setY(0.12), hole.clone().setY(-0.3), hole.clone().setY(0.12).addScaledVector(side, 0.05), hole.clone().addScaledVector(out, R * 0.3).addScaledVector(side, 0.5).setY(0.7), out.clone().multiplyScalar(R * 1.06).addScaledVector(side, 0.9).setY(0.4), out.clone().multiplyScalar(R * 1.25).addScaledVector(side, 1.6).setY(-thick + 0.12), out.clone().multiplyScalar(R * 1.4).addScaledVector(side, 3.4).setY(-thick + 0.12)];
      add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.slice(1)), 70, 0.085, 6), new THREE.MeshStandardMaterial({ color: '#c8242e', roughness: 0.9 }));
    }

    // Other small change, sharing the same die.
    const loose = (x: number, z: number, radius: number, y: number, tilt = 0) => {
      const other = add(s.root, new THREE.CylinderGeometry(radius, radius, thick * 0.5 * (radius / R) * 2.2, 48), [new THREE.MeshStandardMaterial({ color: tone.dark, metalness: 0.35, roughness: 0.5 }), metal, metal]);
      other.position.set(x, y + thick * 0.25 * (radius / R) * 2.2 + Math.abs(Math.sin(tilt)) * radius, z);
      other.rotation.set(tilt, random() * 6.3, 0);
      return other;
    };

    // ---- Where it lies ----
    const floorY = -thick;
    const bubbles: THREE.Mesh[] = [];
    if (a.resting === 'pocket') {
      const weave = canvasOf(256);
      const w = weave.getContext('2d')!;
      const cloth = new THREE.Color('#566d92').lerp(new THREE.Color('#6d6a66'), mood.wear * 0.4).lerp(new THREE.Color('#8a6a52'), Math.max(0, mood.warmth - 0.6) * 0.5);
      w.fillStyle = `#${cloth.getHexString()}`;
      w.fillRect(0, 0, 256, 256);
      for (let i = -256; i < 256; i += 6) { w.strokeStyle = i % 12 ? 'rgba(230,236,245,0.22)' : 'rgba(20,28,48,0.3)'; w.lineWidth = 2; w.beginPath(); w.moveTo(i, 0); w.lineTo(i + 256, 256); w.stroke(); }
      const fabric = new THREE.PlaneGeometry(22, 21, 64, 60);
      fabric.rotateX(-Math.PI / 2);
      const p = fabric.getAttribute('position');
      const f1 = random() * 6, f2 = random() * 6;
      const fold = (x: number, z: number) => {
        const far = Math.hypot(x, z), rise = clamp01((far - R * 1.05) / 3.2), back = clamp01((-z + 3) / 11) + clamp01((-x - 2) / 12) * 0.7;
        return floorY + rise * rise * (0.5 + back * 4.6) * (0.75 + 0.25 * Math.sin(x * 0.55 + f1) + 0.2 * Math.sin(z * 0.8 + x * 0.3 + f2));
      };
      for (let i = 0; i < p.count; i++) p.setY(i, fold(p.getX(i), p.getZ(i)));
      fabric.computeVertexNormals();
      add(s.root, fabric, new THREE.MeshStandardMaterial({ map: textureOf(weave, 9), roughness: 1, side: THREE.DoubleSide }));
      // A line of chain stitch running over the folds.
      const stitches = Array.from({ length: 30 }, (_unused, i) => { const x = -10.6 + i * 0.73, z = -9.2 + Math.sin(i * 0.3) * 0.4; return { at: [x, fold(x, z) + 0.1, z] as [number, number, number], size: 1 }; });
      s.scatter(new THREE.BoxGeometry(0.52, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: '#d98a2b', roughness: 0.9 }), stitches);
      const fluff = Array.from({ length: Math.round(mix(10, 60, mood.density)) }, () => { const t = random() * 6.3, far = R * (1.05 + random() * 0.22); return { at: [Math.cos(t) * far, fold(Math.cos(t) * far, Math.sin(t) * far) + 0.08, Math.sin(t) * far] as [number, number, number], size: 0.08 + random() * 0.2, color: random() > 0.5 ? '#c9d0dc' : '#8794ab' }; });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), fluff);
    } else if (a.resting === 'drawer') {
      const grain = canvasOf(256);
      const w = grain.getContext('2d')!;
      const wood = new THREE.Color('#b98a57').lerp(new THREE.Color('#6f5a45'), mood.wear * 0.5);
      w.fillStyle = `#${wood.getHexString()}`;
      w.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { w.strokeStyle = `rgba(70,40,15,${0.08 + random() * 0.22})`; w.lineWidth = 1 + random() * 3; const y = random() * 256; w.beginPath(); w.moveTo(0, y); w.bezierCurveTo(80, y + (random() - 0.5) * 14, 170, y + (random() - 0.5) * 14, 256, y); w.stroke(); }
      const timber = new THREE.MeshStandardMaterial({ map: textureOf(grain, 2), roughness: 0.75 });
      add(s.root, new THREE.BoxGeometry(21, 0.4, 20), timber).position.set(0, floorY - 0.2, 0);
      add(s.root, new THREE.BoxGeometry(21, 4.6, 0.7), timber).position.set(0, floorY + 2.1, -10.1);
      add(s.root, new THREE.BoxGeometry(0.7, 4.6, 20), timber).position.set(-10.6, floorY + 2.1, 0);
      // Pencil stub against the back wall.
      const pencil = new THREE.Group();
      const paintJob = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f0b622' : '#3f7a4c', roughness: 0.5 });
      const barrel = add(pencil, new THREE.CylinderGeometry(0.62, 0.62, 8, 6), paintJob);
      barrel.rotation.z = Math.PI / 2;
      const cone = add(pencil, new THREE.ConeGeometry(0.62, 1.7, 6), new THREE.MeshStandardMaterial({ color: '#e0bf8f', roughness: 0.8 }));
      cone.rotation.z = -Math.PI / 2; cone.position.x = 4.85;
      const lead = add(pencil, new THREE.ConeGeometry(0.2, 0.55, 6), new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.5 }));
      lead.rotation.z = -Math.PI / 2; lead.position.x = 5.45;
      const ferrule = add(pencil, new THREE.CylinderGeometry(0.66, 0.66, 1.1, 12), new THREE.MeshStandardMaterial({ color: '#b9bcc0', metalness: 0.4, roughness: 0.4 }));
      ferrule.rotation.z = Math.PI / 2; ferrule.position.x = -4.5;
      const rubber = add(pencil, new THREE.CylinderGeometry(0.6, 0.6, 0.9, 12), new THREE.MeshStandardMaterial({ color: '#d9727f', roughness: 0.9 }));
      rubber.rotation.z = Math.PI / 2; rubber.position.x = -5.4;
      pencil.position.set(-1 + random() * 3, floorY + 0.56, -9.05);
      pencil.rotation.y = (random() - 0.5) * 0.12;
      s.root.add(pencil);
      const band = add(s.root, new THREE.TorusGeometry(2.3, 0.11, 6, 48), new THREE.MeshStandardMaterial({ color: '#b5673c', roughness: 0.8 }));
      band.rotation.x = Math.PI / 2;
      band.scale.set(1, 0.72, 1);
      band.position.set(-7.9, floorY + 0.11, 7.4);
      for (let i = 0; i < mix(0, 4, mood.density); i++) { const t = [0.78, -0.78, 0.6, 1.0][i % 4] + (random() - 0.5) * 0.2; loose(Math.cos(t) * (R + 1.9 + random() * 0.8), Math.sin(t) * (R + 1.9 + random() * 0.8), 1.1 + random() * 0.5, floorY + (i > 1 ? 0.2 : 0)); }
    } else if (a.resting === 'fountain') {
      const tiles = canvasOf(512);
      const w = tiles.getContext('2d')!;
      w.fillStyle = '#e6efe9';
      w.fillRect(0, 0, 512, 512);
      for (let x = 0; x < 8; x++)
        for (let y = 0; y < 8; y++) {
          w.fillStyle = `#${new THREE.Color().setHSL(0.47 + random() * 0.07, 0.42, 0.5 + random() * 0.16).lerp(new THREE.Color('#7b8a78'), mood.wear * 0.45).getHexString()}`;
          w.fillRect(x * 64 + 4, y * 64 + 4, 56, 56);
        }
      w.strokeStyle = 'rgba(255,255,255,0.5)';
      w.lineWidth = 5;
      for (let i = 0; i < 26; i++) { const x = random() * 512, y = random() * 512; w.beginPath(); w.moveTo(x, y); w.bezierCurveTo(x + 60, y + (random() - 0.5) * 120, x + 120, y + (random() - 0.5) * 120, x + 170, y + (random() - 0.5) * 60); w.stroke(); }
      add(s.root, new THREE.BoxGeometry(21, 0.4, 20), new THREE.MeshStandardMaterial({ map: textureOf(tiles, 2), roughness: 0.3 })).position.set(0, floorY - 0.2, 0);
      const count = Math.round(mix(4, 15, mood.density));
      for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2 + random() * 0.4, far = R + 1.5 + random() * 2.6;
        const radius = 0.9 + random() * 0.8, x = Math.max(-10.3 + radius, Math.min(10.3 - radius, Math.cos(t) * far)), z = Math.max(-9.8 + radius, Math.min(9.8 - radius, Math.sin(t) * far));
        if (Math.hypot(x, z) > R * 1.02 + radius) loose(x, z, radius, floorY + (random() > 0.75 ? 0.2 : 0), random() > 0.8 ? 0.2 : 0);
      }
      const air = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#dffaff', emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.1 });
      for (let i = 0; i < mix(6, 20, mood.energy); i++) {
        const bubble = add(s.root, new THREE.SphereGeometry(0.07 + random() * 0.16, 10, 8), air);
        bubble.castShadow = false;
        bubble.position.set((random() - 0.5) * 19, floorY + random() * 6, (random() - 0.5) * 18);
        bubbles.push(bubble);
      }
    } else if (a.resting === 'pavement') {
      const tar = canvasOf(256);
      const w = tar.getContext('2d')!;
      w.fillStyle = `#${new THREE.Color('#8d8f8c').lerp(new THREE.Color('#a59a85'), mood.warmth * 0.3).getHexString()}`;
      w.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1500; i++) { w.fillStyle = ['rgba(40,40,42,0.5)', 'rgba(220,220,214,0.5)', 'rgba(110,100,90,0.5)'][i % 3]; w.fillRect(random() * 256, random() * 256, 1 + random() * 4, 1 + random() * 4); }
      add(s.root, new THREE.BoxGeometry(21, 0.4, 20), new THREE.MeshStandardMaterial({ map: textureOf(tar, 3), roughness: 1 })).position.set(0, floorY - 0.2, 0);
      const stripe = add(s.root, new THREE.BoxGeometry(21, 0.05, 2.2), new THREE.MeshStandardMaterial({ color: new THREE.Color('#e9c53a').lerp(new THREE.Color('#9c9577'), mood.wear * 0.6), roughness: 0.9 }));
      stripe.position.set(0, floorY + 0.02, -8.7);
      const grit = Array.from({ length: Math.round(mix(40, 150, mood.density)) }, () => { const x = (random() - 0.5) * 20.4, z = (random() - 0.5) * 19.4; return { at: [x, floorY + 0.06, z] as [number, number, number], size: Math.hypot(x, z) < R + 0.3 ? 0 : 0.08 + random() * 0.3, color: ['#55565a', '#b9b6ab', '#7d7468'][Math.floor(random() * 3)] }; });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), grit);
      const crack: THREE.Vector3[] = [];
      for (let i = 0; i <= 10; i++) crack.push(new THREE.Vector3(8.6 + Math.sin(i * 1.7) * 0.7 + i * 0.1, floorY + 0.01, -9.8 + i * 1.96));
      add(s.root, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crack), 60, 0.11, 4), new THREE.MeshStandardMaterial({ color: '#2c2c2e', roughness: 1 }));
      // A crown bottle cap, crimped edge up.
      const cap = add(s.root, new THREE.CylinderGeometry(1.35, 1.6, 0.55, 21, 1), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8392b' : '#3b5d8f', metalness: 0.3, roughness: 0.45, flatShading: true }));
      cap.position.set(-8.2, floorY + 0.28, 7.6);
    } else {
      const glaze = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4f1ea').lerp(new THREE.Color('#d8cfbd'), mood.wear * 0.5), roughness: 0.18, side: THREE.DoubleSide });
      const profile = [[0, floorY - 0.3], [9.3, floorY - 0.3], [9.3, floorY], [0.01, floorY]].map(([x, y]) => new THREE.Vector2(x, y));
      add(s.root, new THREE.LatheGeometry(profile, 72), glaze);
      const lip = [[9.3, floorY], [10.2, floorY + 0.22], [11.2, floorY + 0.85], [11.7, floorY + 1.1], [11.7, floorY + 0.9], [11, floorY + 0.55], [9.3, floorY - 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
      add(s.root, new THREE.LatheGeometry(lip, 72), glaze);
      const band = add(s.root, new THREE.TorusGeometry(11.4, 0.07, 6, 96), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#2f6fb5' : '#7a2f2f', roughness: 0.3 }));
      band.rotation.x = Math.PI / 2;
      band.position.y = floorY + 0.98;
      // The bill, folded once, under the coin's edge.
      const bill = canvasOf(256);
      const w = bill.getContext('2d')!;
      w.fillStyle = '#f7f5ee';
      w.fillRect(0, 0, 256, 256);
      w.fillStyle = '#4a4d55';
      w.font = 'bold 22px monospace';
      w.fillText('THANK YOU', 60, 34);
      for (let y = 60; y < 200; y += 20) { w.fillRect(22, y, 60 + random() * 90, 5); w.fillRect(196, y, 38, 5); }
      w.fillRect(22, 210, 212, 3);
      w.font = 'bold 26px monospace';
      w.fillText('TOTAL', 22, 242);
      const slip = new THREE.PlaneGeometry(5.5, 8, 12, 1);
      slip.rotateX(-Math.PI / 2);
      const sp = slip.getAttribute('position');
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.abs(sp.getX(i)) * 0.07 + 0.03);
      slip.computeVertexNormals();
      const paper = add(s.root, slip, new THREE.MeshStandardMaterial({ map: textureOf(bill), roughness: 0.9, side: THREE.DoubleSide }));
      paper.position.set(-6.9, floorY, 4.4);
      paper.rotation.y = 0.5 + random() * 0.4;
      for (let i = 0; i < mix(0, 4, mood.density); i++) { const t = 0.1 + random() * 1.2; loose(Math.cos(t) * (R + 1.5 + random() * 0.4), Math.sin(t) * (R + 1.3 + random() * 0.4), 0.9 + random() * 0.5, floorY); }
    }

    // Raking light: keep the kit's sun direction but drop it close to the horizon.
    world.ground = ground;
    const place = world.place.bind(world);
    world.place = (items) => {
      place(items);
      const key = world.keyLight!;
      const centre = key.target.position, reach = key.position.distanceTo(centre);
      const low = new THREE.Vector3(mix(-11, 9, mood.daylight), mix(3.4, 5.6, Math.sin(mood.daylight * Math.PI)), 3 - Math.abs(mood.daylight - 0.5) * 8);
      key.position.copy(centre).addScaledVector(low.normalize(), reach);
    };
    const span = 6.5 - floorY;
    world.update = (dt) => {
      for (const bubble of bubbles) {
        bubble.position.y += dt * mix(0.3, 1.6, mood.energy) * (0.6 + bubble.scale.x);
        if (bubble.position.y > floorY + span) bubble.position.y = floorY;
      }
    };
    return world;
  },
});
