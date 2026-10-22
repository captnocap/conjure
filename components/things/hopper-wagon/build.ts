import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';
import { type Block, HALF_GAUGE, RAIL_TOP, blocks, canvasTexture, figure, hexOf, snowOf, track, weeds } from './rail';

const LIVERY = {
  oxide: 'Boxcar oxide red-brown, the default colour of freight everywhere.',
  grey: 'Utility grey with a yellow band, a state railway aggregate wagon.',
  red: 'Bright traffic red, a modern national freight operator.',
  blue: 'Deep blue with a white stripe, a private leasing company.',
  black: 'Coal-company black with white lettering.',
  yellow: 'Engineering-department yellow, a ballast wagon for the track gangs.',
  green: 'Faded bottle green, an old grain co-operative.',
} as const;
const LIVERY_COLOUR: Record<keyof typeof LIVERY, string> = {
  oxide: '#7d3d2b', grey: '#7f868a', red: '#b9332b', blue: '#2e5b96', black: '#2c2d30', yellow: '#d6a31f', green: '#4e6e52',
};
const MARKS: Record<keyof typeof LIVERY, string> = {
  oxide: 'NKRX', grey: 'SZD', red: 'RCG', blue: 'VTLX', black: 'B&LC', yellow: 'ENGR', green: 'PGCO',
};
const CARGO_COLOUR = { coal: '#1b1b1e', gravel: '#8d8981', grain: '#d2a646', ore: '#8b4a31', beet: '#c8b795' } as const;

export default defineThing({
  questions: {
    cargo: choice('What is it carrying?', {
      coal: 'Black coal heaped above the rim in glinting lumps.',
      gravel: 'Grey crushed stone in conical piles, straight from the quarry loader.',
      grain: 'Golden grain mounded smooth and level.',
      ore: 'Rust-red iron ore, heavy, sitting low in the body.',
      beet: 'A lumpy pale heap of sugar beet from the autumn campaign.',
      empty: 'Nothing: the body is hollow and you can see down the bare slope sheets.',
    }),
    graffiti: choice('What is painted on its side?', {
      none: 'Nothing but the railway lettering.',
      wildstyle: 'A big multi-coloured wildstyle piece with arrows and a drop shadow.',
      throwup: 'A fast two-letter bubble throw-up in chrome and black.',
      character: 'A cartoon skull character with dripping eyes.',
      moniker: 'A small white oil-stick hobo moniker: a figure in a hat, a name and a date.',
      slogan: 'A sentence in tall white roller letters, more message than art.',
      wholecar: 'An end-to-end whole-car burner in sunset bands and stars.',
    }),
    livery: choice('Whose colours does it wear?', LIVERY),
    era: choice('What era of wagon is it?', {
      oldtime: 'A short two-axle plank-sided hopper with round buffers, from the steam age.',
      steel: 'A mid-century ribbed steel bogie hopper with three bays.',
      modern: 'A tall, long modern high-capacity hopper with many ribs and reflective stripes.',
    }),
    state: choice('What is happening to it right now?', {
      parked: 'Simply standing, coupled to nothing, waiting to be collected.',
      unloading: 'Bay doors open, its load pouring into piles between the rails.',
      forgotten: 'Forgotten for years: weeds through the track, a wheel scotched, a door hanging.',
      rider: 'Somebody is riding it: a huddled figure with a bedroll on the end platform.',
    }),
    lamp: noul('Is a red tail lamp hung on its rear end?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const forgotten = a.state === 'forgotten';
    const L = { oldtime: 6.4, steel: 10.6, modern: 13.2 }[a.era];
    const top = RAIL_TOP + { oldtime: 2.75, steel: 3.3, modern: 3.85 }[a.era];
    const low = RAIL_TOP + 1.3;
    const W = 2.8;
    const cut = a.era === 'oldtime' ? 1.15 : 1.9;
    const shoulder = top - 0.95;
    const bays = { oldtime: 1, steel: 3, modern: 4 }[a.era];

    track(s, { length: L + 3.6 });

    const rustiness = clamp01(mood.wear + (forgotten ? 0.3 : 0));
    const base = new THREE.Color(LIVERY_COLOUR[a.livery]).lerp(new THREE.Color('#6a3f29'), rustiness * 0.4);
    const body = s.material(base, { roughness: 0.8, metalness: 0.1 });
    const inside = s.material(base.clone().multiplyScalar(0.55), { roughness: 0.95 });
    const iron = s.material('#2a2b2d', { roughness: 0.8, metalness: 0.3 });
    const bodyHex = hexOf(body);

    // Side sheets: the classic silhouette with the lower corners cut away over the wheels.
    const profile = new THREE.Shape([
      new THREE.Vector2(-L / 2, top), new THREE.Vector2(L / 2, top), new THREE.Vector2(L / 2, shoulder),
      new THREE.Vector2(L / 2 - cut, low), new THREE.Vector2(-L / 2 + cut, low), new THREE.Vector2(-L / 2, shoulder),
    ]);
    for (const z of [W / 2 - 0.05, -W / 2]) s.mesh(new THREE.ExtrudeGeometry(profile, { depth: 0.05, bevelEnabled: false }), body, [0, 0, z]);
    const slopeLength = Math.hypot(cut, shoulder - low), slopeAngle = Math.atan2(shoulder - low, cut);
    for (const end of [-1, 1]) {
      s.box([0.05, top - shoulder, W], [end * (L / 2 - 0.025), (top + shoulder) / 2, 0], body);
      s.box([slopeLength, 0.05, W - 0.06], [end * (L / 2 - cut / 2), (shoulder + low) / 2, 0], inside).rotation.z = end * slopeAngle;
      s.box([cut - 0.1, 0.06, 2.5], [end * (L / 2 - cut / 2 + 0.1), RAIL_TOP + 1.14, 0], iron);
    }
    s.box([L - 2 * cut, 0.05, W - 0.06], [0, low + 0.02, 0], inside);

    const frame: Block[] = [];
    const ribs = { oldtime: 5, steel: 9, modern: 15 }[a.era];
    for (let i = 0; i < ribs; i++) {
      const x = -L / 2 + 0.08 + (i / (ribs - 1)) * (L - 0.16);
      const over = Math.abs(x) - (L / 2 - cut);
      const bottom = over > 0 ? low + (over / cut) * (shoulder - low) : low;
      for (const side of [-1, 1]) frame.push({ size: [a.era === 'oldtime' ? 0.14 : 0.1, top - bottom, 0.09], at: [x, (top + bottom) / 2, side * (W / 2 + 0.04)] });
    }
    for (const side of [-1, 1]) {
      frame.push({ size: [L + 0.1, 0.13, 0.16], at: [0, top, side * (W / 2 + 0.02)] });
      frame.push({ size: [L - 2 * cut + 0.2, 0.1, 0.1], at: [0, low + 0.02, side * (W / 2 + 0.04)] });
      for (const end of [-1, 1]) {
        frame.push({ size: [0.1, shoulder - RAIL_TOP - 1.1, 0.1], at: [end * (L / 2 - 0.05), (shoulder + RAIL_TOP + 1.1) / 2, side * 1.2] });
        frame.push({ size: [0.16, top - shoulder + 0.1, 0.12], at: [end * (L / 2), (top + shoulder) / 2, side * (W / 2 + 0.02)] });
      }
    }
    blocks(s.root, body, frame);

    // Underframe, running gear and couplings.
    const under: Block[] = [];
    for (const side of [-1, 1]) under.push({ size: [L + 0.3, 0.2, 0.14], at: [0, RAIL_TOP + 1.0, side * 1.22] });
    for (const end of [-1, 1]) under.push({ size: [0.16, 0.32, 2.6], at: [end * (L / 2 + 0.12), RAIL_TOP + 1.0, 0] });
    const axles: number[] = a.era === 'oldtime' ? [-1.95, 1.95] : [-1, 1].flatMap((end) => [end * (L / 2 - 1.55) - 0.9, end * (L / 2 - 1.55) + 0.9]);
    const wheels: Block[] = [], rods: Block[] = [];
    const wheelY = RAIL_TOP + 0.46;
    for (const x of axles) {
      for (const side of [-1, 1]) {
        wheels.push({ size: [0.92, 0.13, 0.92], at: [x, wheelY, side * HALF_GAUGE], rot: [Math.PI / 2, 0, 0] });
        wheels.push({ size: [1.0, 0.03, 1.0], at: [x, wheelY, side * (HALF_GAUGE - 0.07)], rot: [Math.PI / 2, 0, 0] });
        wheels.push({ size: [0.3, 0.2, 0.3], at: [x, wheelY, side * (HALF_GAUGE + 0.04)], rot: [Math.PI / 2, 0, 0], color: '#6b6258' });
        under.push({ size: [0.3, 0.3, 0.16], at: [x, wheelY, side * 1.04], color: '#3a3b3d' });
        if (a.era === 'oldtime') {
          under.push({ size: [1.5, 0.07, 0.1], at: [x, wheelY + 0.27, side * 1.04] });
          under.push({ size: [0.08, 0.5, 0.1], at: [x - 0.3, wheelY + 0.2, side * 1.12], rot: [0, 0, 0.3] }, { size: [0.08, 0.5, 0.1], at: [x + 0.3, wheelY + 0.2, side * 1.12], rot: [0, 0, -0.3] });
        }
      }
      rods.push({ size: [0.14, 1.9, 0.14], at: [x, wheelY, 0], rot: [Math.PI / 2, 0, 0] });
    }
    if (a.era !== 'oldtime')
      for (const end of [-1, 1]) for (const side of [-1, 1]) {
        const x = end * (L / 2 - 1.55);
        under.push({ size: [2.3, 0.2, 0.1], at: [x, wheelY + 0.12, side * 1.04] }, { size: [0.5, 0.28, 0.14], at: [x, wheelY - 0.02, side * 1.05], color: '#55504a' });
        under.push({ size: [0.2, 0.3, 0.3], at: [x, RAIL_TOP + 0.85, side * 0.9] });
      }
    for (const end of [-1, 1]) {
      if (a.era === 'oldtime') {
        for (const side of [-1, 1]) {
          rods.push({ size: [0.13, 0.5, 0.13], at: [end * (L / 2 + 0.42), RAIL_TOP + 1.0, side * 0.87], rot: [0, 0, Math.PI / 2] });
          rods.push({ size: [0.42, 0.07, 0.42], at: [end * (L / 2 + 0.68), RAIL_TOP + 1.0, side * 0.87], rot: [0, 0, Math.PI / 2] });
        }
        under.push({ size: [0.45, 0.1, 0.08], at: [end * (L / 2 + 0.38), RAIL_TOP + 0.95, 0] });
      } else {
        under.push({ size: [0.75, 0.22, 0.26], at: [end * (L / 2 + 0.5), RAIL_TOP + 0.86, 0] }, { size: [0.22, 0.32, 0.36], at: [end * (L / 2 + 0.88), RAIL_TOP + 0.86, 0], color: '#4a4640' });
      }
    }
    blocks(s.root, new THREE.MeshStandardMaterial({ color: '#2c2c2e', roughness: 0.75, metalness: 0.3 }), under);
    blocks(s.root, iron, wheels, new THREE.CylinderGeometry(0.5, 0.5, 1, 22));
    blocks(s.root, iron, rods, new THREE.CylinderGeometry(0.5, 0.5, 1, 10));

    // Brake wheel, end ladder and grab irons at the +x end.
    const wheelRing = s.ring(0.26, 0.025, [L / 2 + 0.14, shoulder + 0.25, 0.7], iron);
    wheelRing.rotation.y = Math.PI / 2;
    s.rod([L / 2 + 0.02, shoulder + 0.25, 0.7], [L / 2 + 0.16, shoulder + 0.25, 0.7], 0.03, iron);
    const rungs: Block[] = [];
    for (const end of [-1, 1]) {
      const x = end * (L / 2 - 0.35);
      const from = RAIL_TOP + 1.2;
      for (const dx of [-0.2, 0.2]) rungs.push({ size: [0.04, top - from, 0.04], at: [x + dx, (top + from) / 2, W / 2 + 0.16] });
      for (let y = from + 0.2; y < top; y += 0.36) rungs.push({ size: [0.4, 0.035, 0.035], at: [x, y, W / 2 + 0.16] });
    }
    blocks(s.root, new THREE.MeshStandardMaterial({ color: a.era === 'modern' ? '#e0c12c' : '#d9d5c8', roughness: 0.7 }), rungs);

    // Discharge bays: inverted pyramids hanging between the wheels, each with a door.
    const span = L - 2 * cut + 0.3;
    const bayLength = span / bays;
    const bayBottom = RAIL_TOP + 0.3;
    const cargoKey = a.cargo === 'empty' ? null : a.cargo;
    const unloading = a.state === 'unloading';
    const cargoColour = cargoKey ? new THREE.Color(CARGO_COLOUR[cargoKey]) : null;
    const cargoMaterial = cargoColour ? new THREE.MeshStandardMaterial({ color: cargoColour, roughness: cargoKey === 'coal' ? 0.45 : 0.95, flatShading: true }) : null;
    for (let i = 0; i < bays; i++) {
      const x = (i - (bays - 1) / 2) * bayLength;
      const bay = new THREE.CylinderGeometry((bayLength / 2) * Math.SQRT2 * 0.96, 0.36, low - bayBottom, 4);
      bay.rotateY(Math.PI / 4);
      bay.scale(1, 1, (W * 0.8) / bayLength);
      s.mesh(bay, body, [x, (low + bayBottom) / 2, 0]);
      const hanging = unloading || (forgotten && i === 0);
      const door = s.box([0.6, 0.05, W * 0.62], [x + (hanging ? 0.28 : 0), bayBottom - (hanging ? 0.26 : 0.03), 0], iron);
      if (hanging) door.rotation.z = -1.25;
      s.rod([x - 0.3, bayBottom + 0.1, W * 0.36], [x + 0.3, bayBottom + 0.1, W * 0.36], 0.035, iron);
      if (unloading && cargoMaterial) {
        const pile = s.mesh(new THREE.ConeGeometry(mix(0.75, 1.15, random()), mix(0.55, 0.8, random()), 9), cargoMaterial, [x + (random() - 0.5) * 0.2, 0.55, (random() - 0.5) * 0.2]);
        pile.scale.z = 1.5;
        s.rod([x, bayBottom, 0], [x, 0.7, 0], 0.16, cargoMaterial, 0.26);
      }
    }

    // The load: a displaced sheet inside the walls, peaked under where each loader chute stood.
    if (cargoMaterial && cargoColour) {
      if (snow > 0.3 && !unloading) cargoMaterial.color.lerp(new THREE.Color('#eef2f4'), snow * 0.55);
      const sheet = new THREE.PlaneGeometry(L - 0.14, W - 0.14, 36, 8);
      sheet.rotateX(-Math.PI / 2);
      const points = sheet.attributes.position;
      const level = top - (cargoKey === 'ore' ? 1.0 : cargoKey === 'grain' ? 0.3 : 0.38) - (unloading ? 0.75 : 0);
      const peak = { coal: 0.62, gravel: 0.7, grain: 0.22, ore: 0.45, beet: 0.5 }[cargoKey!];
      const lumps = { coal: 0.14, gravel: 0.07, grain: 0.015, ore: 0.09, beet: 0.16 }[cargoKey!];
      const peaks = Array.from({ length: bays + 1 }, (_unused, i) => (i - bays / 2) * (L / (bays + 1.4)) + (random() - 0.5) * 0.5);
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i), z = points.getZ(i);
        const edge = Math.min(1, (W / 2 - Math.abs(z)) / 0.5, (L / 2 - Math.abs(x)) / 0.7);
        let y = 0;
        for (const p of peaks) y = Math.max(y, peak * Math.max(0, 1 - Math.hypot(x - p, z * 1.3) / 1.9));
        if (unloading) y = -y * 1.3;
        points.setY(i, level + (y + (random() - 0.5) * lumps) * clamp01(edge) - (1 - clamp01(edge)) * 0.25);
      }
      sheet.computeVertexNormals();
      s.mesh(sheet, cargoMaterial);
      if (cargoKey === 'coal' || cargoKey === 'beet' || cargoKey === 'gravel') {
        const size = cargoKey === 'gravel' ? 0.1 : 0.2;
        const lumpsOnTop: Block[] = Array.from({ length: unloading ? 20 : 70 }, () => {
          const x = (random() - 0.5) * (L - 1.2), z = (random() - 0.5) * (W - 0.7);
          let y = 0;
          for (const p of peaks) y = Math.max(y, peak * Math.max(0, 1 - Math.hypot(x - p, z * 1.3) / 1.9));
          return { size: [size, size * 0.8, size * mix(0.8, 1.5, random())] as const, at: [x, level + (unloading ? -y * 1.3 : y) + 0.02, z] as const, rot: [random() * 3, random() * 3, 0] as const };
        });
        blocks(s.root, cargoMaterial, lumpsOnTop, new THREE.DodecahedronGeometry(0.6, 0));
      }
    }

    // Painted flank: lettering, stripes, rust and graffiti on one canvas, shown between the ribs.
    const panelWidth = L - 2 * cut - 0.06, panelHeight = top - low - 0.16;
    const words = ['SERK', 'NOIZ', 'ZEPH', 'KAPUT', 'ORBS', 'DUSK', 'RYME'];
    const word = words[Math.floor(random() * words.length)];
    const slogans = ['NO ONE RIDES FREE', 'HOME BY SPRING', 'STILL HERE', 'WHO OWNS THE RAILS', 'COLD STEEL WARM HEART', 'GONE WEST'];
    const slogan = slogans[Math.floor(random() * slogans.length)];
    const number = String(10000 + Math.floor(random() * 89999));
    const paint = (mirror: boolean) => canvasTexture(1024, Math.round((1024 * panelHeight) / panelWidth), (ctx, w, h) => {
      const pale = a.livery === 'yellow' ? '#1d1d1d' : '#eee9dc';
      ctx.fillStyle = bodyHex;
      ctx.fillRect(0, 0, w, h);
      if (a.era === 'oldtime') {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 3;
        for (let y = h / 7; y < h; y += h / 7) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      }
      if (a.livery === 'grey' || a.livery === 'blue' || a.livery === 'green') {
        ctx.fillStyle = a.livery === 'blue' ? '#e9e9e4' : '#e2b62a';
        ctx.fillRect(0, h * 0.8, w, h * 0.09);
      }
      ctx.fillStyle = pale;
      ctx.textBaseline = 'top';
      ctx.font = `bold ${h * 0.17}px sans-serif`;
      ctx.fillText(MARKS[a.livery], w * 0.035, h * 0.07);
      ctx.fillText(number, w * 0.035, h * 0.26);
      ctx.font = `${h * 0.065}px monospace`;
      ['LD LMT 154300', 'LT WT  61200', 'BLT 4-' + (a.era === 'modern' ? '09' : a.era === 'steel' ? '61' : '23')].forEach((line, i) => ctx.fillText(line, w * 0.035, h * (0.5 + i * 0.085)));
      if (a.era === 'modern') {
        ctx.fillStyle = '#f0d43a';
        for (let x = 0; x < w; x += 110) ctx.fillRect(x + 12, h * 0.93, 60, h * 0.045);
      }

      const g = { x: w * 0.27, y: h * 0.1, w: w * 0.68, h: h * 0.74 };
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
      if (a.graffiti === 'wildstyle') {
        ctx.fillStyle = '#18233f';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) ctx.ellipse(g.x + (i / 8) * g.w, cy + Math.sin(i * 2.1) * g.h * 0.12, g.w * 0.11, g.h * 0.55, 0, 0, 7);
        ctx.fill();
        ctx.font = `italic 900 ${g.h * 0.82}px sans-serif`;
        ctx.setTransform(1, -0.07, -0.25, 1, cy * 0.25, cx * 0.07);
        ctx.strokeStyle = '#0c0c10'; ctx.lineWidth = 34;
        ctx.strokeText(word, cx + 12, cy + 14, g.w * 0.9);
        ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = 16;
        ctx.strokeText(word, cx, cy, g.w * 0.9);
        const fade = ctx.createLinearGradient(0, g.y, 0, g.y + g.h);
        fade.addColorStop(0, '#ffd23d'); fade.addColorStop(0.5, '#ff5a2a'); fade.addColorStop(1, '#c21f6b');
        ctx.fillStyle = fade;
        ctx.fillText(word, cx, cy, g.w * 0.9);
        ctx.fillStyle = '#39d6c8';
        for (const [ax, dir] of [[g.x + 10, -1], [g.x + g.w - 10, 1]] as const) {
          ctx.beginPath(); ctx.moveTo(ax, cy - 40); ctx.lineTo(ax + dir * 70, cy); ctx.lineTo(ax, cy + 40); ctx.closePath(); ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#0c0c10'; ctx.stroke();
        }
      } else if (a.graffiti === 'throwup') {
        const letters = word.slice(0, 2);
        ctx.font = `900 ${g.h * 1.05}px sans-serif`;
        ctx.strokeStyle = '#0d0d0f'; ctx.lineWidth = 90; ctx.strokeText(letters, cx, cy);
        ctx.strokeStyle = '#d9dde0'; ctx.lineWidth = 58; ctx.strokeText(letters, cx, cy);
        ctx.fillStyle = '#d9dde0'; ctx.fillText(letters, cx, cy);
        ctx.strokeStyle = '#0d0d0f'; ctx.lineWidth = 7; ctx.strokeText(letters, cx, cy);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) ctx.fillRect(cx - 150 + i * 75, cy - g.h * 0.32, 26, 12);
      } else if (a.graffiti === 'character') {
        const r = g.h * 0.5;
        ctx.fillStyle = '#0d0d0f'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 1.02, 0, 7); ctx.fill(); ctx.fillRect(cx - r * 0.6, cy + r * 0.3, r * 1.2, r * 0.75);
        ctx.fillStyle = '#efe9da'; ctx.beginPath(); ctx.arc(cx, cy - r * 0.1, r * 0.9, 0, 7); ctx.fill(); ctx.fillRect(cx - r * 0.5, cy + r * 0.3, r, r * 0.62);
        ctx.fillStyle = '#0d0d0f';
        for (const side of [-1, 1]) {
          ctx.beginPath(); ctx.ellipse(cx + side * r * 0.38, cy - r * 0.15, r * 0.25, r * 0.3, side * 0.3, 0, 7); ctx.fill();
          ctx.fillRect(cx + side * r * 0.38 - 7, cy, 14, r * (0.7 + side * 0.2));
        }
        ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.12); ctx.lineTo(cx - r * 0.1, cy + r * 0.34); ctx.lineTo(cx + r * 0.1, cy + r * 0.34); ctx.fill();
        for (let i = -2; i <= 2; i++) ctx.fillRect(cx + i * r * 0.2 - 4, cy + r * 0.5, 8, r * 0.42);
        ctx.fillStyle = '#e6382e'; ctx.beginPath(); ctx.arc(cx + r * 0.38, cy - r * 0.15, r * 0.09, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(cx - r * 0.38, cy - r * 0.15, r * 0.09, 0, 7); ctx.fill();
        ctx.font = `900 ${g.h * 0.3}px sans-serif`; ctx.fillStyle = '#e6382e'; ctx.strokeStyle = '#0d0d0f'; ctx.lineWidth = 12;
        ctx.strokeText(word, cx + r * 2.1, cy + r * 0.4, g.w * 0.3); ctx.fillText(word, cx + r * 2.1, cy + r * 0.4, g.w * 0.3);
      } else if (a.graffiti === 'moniker') {
        const mx = g.x + g.w * 0.3, my = cy, u = g.h * 0.3;
        ctx.strokeStyle = '#f3f0e6'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(mx, my - u * 0.75, u * 1.25, u * 0.2, -0.08, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx - u * 0.6, my - u * 0.85); ctx.quadraticCurveTo(mx, my - u * 2.1, mx + u * 0.6, my - u * 0.9); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx - u * 0.55, my - u * 0.6); ctx.quadraticCurveTo(mx - u * 0.6, my + u * 0.9, mx + u * 0.2, my + u * 0.95); ctx.quadraticCurveTo(mx + u * 0.75, my + u * 0.6, mx + u * 0.55, my - u * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx + u * 0.5, my + u * 0.35); ctx.lineTo(mx + u * 1.5, my + u * 0.2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mx + u * 1.5, my + u * 0.1); ctx.bezierCurveTo(mx + u * 2, my - u * 0.5, mx + u * 1.3, my - u, mx + u * 2, my - u * 1.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(mx + u * 0.15, my - u * 0.2, 6, 0, 7); ctx.stroke();
        ctx.font = `italic ${g.h * 0.2}px serif`; ctx.fillStyle = '#f3f0e6'; ctx.textAlign = 'left';
        ctx.fillText(`${word.toLowerCase()} slim`, mx + u * 2.4, my - u * 0.3);
        ctx.fillText(`${1 + Math.floor(random() * 12)} - ${String(Math.floor(random() * 99)).padStart(2, '0')}  w.b.`, mx + u * 2.4, my + u * 0.6);
      } else if (a.graffiti === 'slogan') {
        ctx.font = `900 ${g.h * 0.36}px sans-serif`;
        ctx.fillStyle = '#f3f0e6';
        const parts = slogan.split(' ');
        const half = Math.ceil(parts.length / 2);
        ctx.fillText(parts.slice(0, half).join(' '), cx, cy - g.h * 0.2, g.w * 0.96);
        ctx.fillText(parts.slice(half).join(' '), cx, cy + g.h * 0.23, g.w * 0.96);
        for (let i = 0; i < 9; i++) ctx.fillRect(g.x + random() * g.w, cy + g.h * 0.36, 7, random() * h * 0.2);
      } else if (a.graffiti === 'wholecar') {
        const bands = ['#2a1b5c', '#7b2a8f', '#e0457a', '#ff8a3c', '#ffd75e'];
        bands.forEach((colour, i) => { ctx.fillStyle = colour; ctx.fillRect(0, (i / bands.length) * h, w, h / bands.length + 1); });
        ctx.fillStyle = '#fff6c9';
        for (let i = 0; i < 26; i++) { const x = random() * w, y = random() * h * 0.5, r = 3 + random() * 7; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
        ctx.font = `italic 900 ${h * 0.7}px sans-serif`;
        ctx.strokeStyle = '#0c0c10'; ctx.lineWidth = 36; ctx.strokeText(word, w / 2 + 10, h / 2 + 12, w * 0.92);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 14; ctx.strokeText(word, w / 2, h / 2, w * 0.92);
        ctx.fillStyle = '#1fd0c2'; ctx.fillText(word, w / 2, h / 2, w * 0.92);
      }
      ctx.restore();

      // Rust bleeding down from the top chord and up from the hem.
      const streaks = Math.round(rustiness * 70);
      for (let i = 0; i < streaks; i++) {
        const x = random() * w, len = h * mix(0.1, 0.6, random());
        const fade = ctx.createLinearGradient(0, 0, 0, len);
        fade.addColorStop(0, 'rgba(96,52,26,0.75)'); fade.addColorStop(1, 'rgba(96,52,26,0)');
        ctx.fillStyle = fade;
        ctx.fillRect(x, 0, 6 + random() * 22, len);
      }
      for (let i = 0; i < streaks / 2; i++) { ctx.fillStyle = `rgba(70,40,24,${0.25 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * w, h - random() * h * 0.3, 12 + random() * 50, 8 + random() * 26, 0, 0, 7); ctx.fill(); }
      if (snow > 0.4) { ctx.fillStyle = 'rgba(240,244,246,0.5)'; for (let i = 0; i < 160 * snow; i++) ctx.fillRect(random() * w, h - random() * random() * h * 0.5, 5, 4); }
      void mirror;
    });
    for (const side of [1, -1]) {
      const panel = s.mesh(new THREE.PlaneGeometry(panelWidth, panelHeight), new THREE.MeshStandardMaterial({ map: paint(side < 0), roughness: 0.85 }), [0, (top + low) / 2 + 0.02, side * (W / 2 + 0.008)]);
      if (side < 0) panel.rotation.y = Math.PI;
    }

    // What the moment has left on and around it.
    if (forgotten) {
      weeds(s, Array.from({ length: 46 }, () => ({ at: [(random() - 0.5) * (L + 3), 0.22, (random() - 0.5) * 3.6] as const, size: mix(0.4, 1.3, random()) })));
      const chock = s.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 3), s.material('#c8a021'), [axles[0] - 0.55, RAIL_TOP + 0.1, HALF_GAUGE]);
      chock.rotation.x = Math.PI / 2;
    } else if (mood.wear > 0.55) {
      weeds(s, Array.from({ length: 10 }, () => ({ at: [(random() - 0.5) * (L + 3), 0.1, (random() < 0.5 ? -1 : 1) * mix(1.5, 2, random())] as const, size: mix(0.3, 0.7, random()) })));
    }
    if (a.state === 'rider') {
      const px = L / 2 - cut / 2 + 0.15;
      figure(s, { at: [px, RAIL_TOP + 1.17, 0.5], yaw: 0.3, coat: '#4c5340', trousers: '#3b3a36', hat: 'beanie', hatColour: '#7c2f2a', pose: 'sit' });
      const roll = s.cylinder(0.16, 0.16, 0.7, [px - 0.1, RAIL_TOP + 1.33, -0.45], s.material('#8a7a5a'), 12);
      roll.rotation.x = Math.PI / 2;
      s.box([0.3, 0.34, 0.24], [px + 0.25, RAIL_TOP + 1.34, -0.5], s.material('#59624a'));
    }
    let lampMaterial: THREE.MeshStandardMaterial | null = null;
    if (a.lamp) {
      lampMaterial = new THREE.MeshStandardMaterial({ color: '#ff3b2b', emissive: '#ff2a1a', emissiveIntensity: 1.6 });
      s.box([0.16, 0.24, 0.16], [-L / 2 - 0.2, RAIL_TOP + 1.42, -0.8], iron);
      s.ball([0.08, 0.08, 0.08], [-L / 2 - 0.29, RAIL_TOP + 1.42, -0.8], lampMaterial, 10);
      s.ball([0.08, 0.08, 0.08], [-L / 2 - 0.2, RAIL_TOP + 1.42, -0.71], lampMaterial, 10);
    }
    if (snow > 0.3) {
      const cap: Block[] = [];
      for (const side of [-1, 1]) cap.push({ size: [L, 0.04 + snow * 0.06, 0.2], at: [0, top + 0.09, side * (W / 2 + 0.02)] });
      for (const end of [-1, 1]) cap.push({ size: [cut - 0.2, 0.05 + snow * 0.05, 2.3], at: [end * (L / 2 - cut / 2 + 0.1), RAIL_TOP + 1.2, 0] });
      blocks(s.root, new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 }), cap);
    }

    const pulse = mix(0.6, 3, mood.energy);
    return s.finish({ update: (_dt, time) => { if (lampMaterial) lampMaterial.emissiveIntensity = 1.1 + Math.sin(time * pulse) * 0.5; } });
  },
});
