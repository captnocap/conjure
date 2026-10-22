import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';
import { cone, wheel } from './parts';

type Ctx = CanvasRenderingContext2D;
const PALETTES = {
  'blue-gold': 'Midnight blue and gold, a grand old flag carrier.',
  'red-white': 'Signal red and white, crisp and northern.',
  'teal-coral': 'Teal and coral, tropical and optimistic.',
  'green-yellow': 'Emerald green and yellow, an island airline.',
  'black-silver': 'Black and silver, severe and expensive.',
  'orange-brown': 'Burnt orange and chocolate brown, pure 1970s.',
  'pink-violet': 'Hot pink and violet, a party charter.',
} as const;
const INKS: Record<keyof typeof PALETTES, [string, string]> = {
  'blue-gold': ['#172a5c', '#d5a637'], 'red-white': ['#c9252b', '#f3f3ef'], 'teal-coral': ['#167f80', '#f0765a'], 'green-yellow': ['#157a48', '#f2c81c'],
  'black-silver': ['#1a1b1f', '#b9bfc4'], 'orange-brown': ['#e0701c', '#5a3220'], 'pink-violet': ['#e8418f', '#5b2c9a'],
};
const MOTIFS = {
  sunburst: 'A rising half sun with fanned rays.',
  bird: 'A stylised bird in flight inside a circle.',
  globe: 'A globe of meridians circled by an orbit line.',
  stripes: 'Three speed stripes sweeping up the fin.',
  star: 'One large five-pointed star.',
  compass: 'A compass rose.',
  bands: 'Broad horizontal flag bands across the whole fin.',
  blank: 'Nothing: an all-white fin, unbranded or between owners.',
} as const;

const TYPES = {
  propliner: { R: 1.7, L: 17, axis: 3.3, lift: 0.9, tip: 0.2 },
  firstjet: { R: 1.85, L: 18, axis: 3.7, lift: 0.8, tip: 0.3 },
  ttail: { R: 1.7, L: 17, axis: 3.5, lift: 0.7, tip: 0.32 },
  widebody: { R: 3.1, L: 25, axis: 5.1, lift: 0.75, tip: 0.5 },
} as const;

function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.42) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) { const t = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); }
  ctx.closePath(); ctx.fill();
}

export default defineThing({
  questions: {
    type: choice('What kind of airliner is it?', {
      propliner: 'A 1950s propliner: a slim curving fuselage ending in a triple tail, three oval fins on one tailplane.',
      firstjet: 'A first-generation jet: a tall swept fin with a probe aerial jutting forward from its tip.',
      ttail: 'A 1960s T-tail jet: engines clustered at the rear and the tailplane perched on top of the fin.',
      widebody: 'A widebody: a fuselage like a building and a fin as tall as a block of flats.',
    }),
    motif: choice('What emblem is painted on the fin?', MOTIFS),
    colours: choice('What are the airline\'s colours?', PALETTES),
    field: choice('How is the fin painted behind the emblem?', {
      white: 'White fin, coloured emblem.',
      solid: 'The whole fin in the airline colour, emblem reversed out.',
      metal: 'Bare polished metal, emblem in colour.',
    }),
    state: choice('What is the aircraft doing?', {
      ready: 'Ready to go: beacon flashing, logo lit, exhaust shimmering.',
      nightstop: 'Parked for the night: chocked and coned, dark, engine covers on.',
      stored: 'In long-term storage: windows foiled over, exhausts and intakes taped, the emblem painted out, red streamers hanging.',
      scrapping: 'Being broken up: rudder gone, panels cut away, an X sprayed on the fin.',
    }),
    door: noul('Is the rear cabin door open?'),
    stand: choice('What is on the ground beneath the tail?', {
      nothing: 'Bare concrete.',
      tailstand: 'A tail stand: a yellow prop under the rear fuselage.',
      steps: 'A short maintenance ladder and a toolbox.',
      puddle: 'A wide stain where something has been dripping for a long time.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const T = TYPES[a.type];
    const [ink, second] = INKS[a.colours];
    const stored = a.state === 'stored', scrap = a.state === 'scrapping', ready = a.state === 'ready';
    const dirt = mood.wear + (stored ? 0.25 : scrap ? 0.45 : 0);
    const bare = a.type === 'propliner' || a.type === 'firstjet';
    const xcut = T.L / 2;
    const u0 = 0.36;
    const radius = (u: number) => (u < u0 ? T.R : Math.max(T.tip, T.R * (1 - Math.pow((u - u0) / (1 - u0), 1.6)) + T.tip * 0.5));
    const centre = (u: number) => T.axis + (T.R - radius(u)) * T.lift;
    const X = (u: number) => xcut - u * T.L;
    const top = (u: number) => centre(u) + radius(u);

    // ---- Fuselage skin: painted once, wrapped round a swept tube.
    const skin = document.createElement('canvas'); skin.width = 1024; skin.height = 512;
    {
      const c = skin.getContext('2d')!, w = 1024, h = 512;
      const Y = (v: number) => (1 - v) * h;            // v: 0 belly, 0.25 near side, 0.5 crown, 0.75 far side
      c.fillStyle = '#f1f2ee'; c.fillRect(0, 0, w, h);
      // Belly: bare metal on the older types, grey on the rest.
      c.fillStyle = bare ? '#b3b9bd' : '#c9cdcf';
      c.fillRect(0, Y(0.19), w, h); c.fillRect(0, 0, w, Y(0.81));
      const line = h * (a.type === 'widebody' ? 0.035 : 0.05);
      for (const side of [0.25, 0.75]) {
        const dir = side < 0.5 ? 1 : -1, yWin = Y(side + dir * 0.035);
        // Cheatline through the windows, with a thin second line below.
        c.fillStyle = ink; c.fillRect(0, yWin - line / 2, w, line);
        c.fillStyle = second; c.fillRect(0, yWin + dir * line * 0.75 - 2, w, 4);
        const count = a.type === 'widebody' ? 30 : 20, ww = a.type === 'widebody' ? 9 : 12, wh = line * 0.5;
        for (let i = 0; i < count; i++) {
          const x = w * (0.42 + (i / count) * 0.58);
          c.fillStyle = stored ? '#d9dcdc' : '#1b2430';
          c.beginPath(); c.roundRect(x, yWin - wh / 2, ww, wh, 3); c.fill();
          if (!stored && ready && random() < 0.5) { c.fillStyle = '#ffe9a6'; c.beginPath(); c.roundRect(x + 1, yWin - wh / 2 + 1, ww - 2, wh - 2, 2); c.fill(); }
        }
        // Rear door.
        const dx = w * 0.5, dw = w * 0.032, dh = h * 0.15;
        c.strokeStyle = '#5a6066'; c.lineWidth = 2; c.fillStyle = a.door ? '#15181c' : '#f1f2ee';
        c.beginPath(); c.roundRect(dx, yWin - dh * (dir > 0 ? 0.42 : 0.58), dw, dh, 5); if (a.door) c.fill(); c.stroke();
        if (a.door && ready) { c.fillStyle = 'rgba(255,220,150,0.8)'; c.fillRect(dx + 3, yWin - dh * (dir > 0 ? 0.3 : 0.5), dw - 6, dh * 0.5); }
        // Registration letters near the tail.
        const reg = 'ZQ-' + Array.from({ length: 3 }, () => 'ABCDEFGHJKLMNPRSTUVWXY'[Math.floor(random() * 22)]).join('');
        c.save(); c.translate(w * 0.3, Y(side - dir * 0.02)); if (dir < 0) c.rotate(Math.PI);
        c.fillStyle = scrap ? '#b9bcbc' : '#22262b'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(reg, 0, 0); c.restore();
      }
      // Panel lines.
      c.strokeStyle = 'rgba(90,96,102,0.25)'; c.lineWidth = 1;
      for (let i = 1; i < 14; i++) { c.beginPath(); c.moveTo((w * i) / 14, 0); c.lineTo((w * i) / 14, h); c.stroke(); }
      // Soot from the exhaust and streaks of age.
      for (let i = 0; i < 40 + dirt * 160; i++) {
        c.fillStyle = `rgba(${60 + random() * 30},${52 + random() * 20},${44 + random() * 20},${0.03 + dirt * 0.14 * random()})`;
        const x = random() * w, y = random() * h; c.fillRect(x, y, 2 + random() * 5, 20 + random() * 80 * dirt);
      }
      if (scrap) for (let i = 0; i < 9; i++) { c.fillStyle = '#23262a'; const x = w * (0.3 + random() * 0.65), y = random() * h; c.fillRect(x, y, 30 + random() * 60, 24 + random() * 44); c.strokeStyle = '#8b6a3a'; c.strokeRect(x, y, 30, 24); }
    }
    const skinMap = new THREE.CanvasTexture(skin); skinMap.colorSpace = THREE.SRGBColorSpace; skinMap.anisotropy = 4;
    const skinMat = new THREE.MeshStandardMaterial({ map: skinMap, roughness: bare ? 0.32 : 0.42, metalness: bare ? 0.45 : 0.15, side: THREE.DoubleSide });
    {
      const NU = 44, NV = 36, pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU, r = radius(u), yc = centre(u);
        for (let j = 0; j <= NV; j++) { const t = (j / NV) * Math.PI * 2; pos.push(X(u), yc - Math.cos(t) * r, Math.sin(t) * r); uv.push(1 - u, j / NV); }
      }
      for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const p = i * (NV + 1) + j, q = p + NV + 1; idx.push(p, p + 1, q, q, p + 1, q + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      s.mesh(g, skinMat);
    }
    // The cut: a section through the cabin, floor and all.
    const inside = s.material('#2b2f34', { roughness: 0.9 });
    const cap = s.mesh(new THREE.CircleGeometry(T.R - 0.02, 36), inside, [xcut + 0.01, T.axis, 0]); cap.rotation.y = Math.PI / 2;
    s.box([0.06, 0.12, T.R * 1.8], [xcut + 0.03, T.axis - T.R * 0.35, 0], s.material('#8d9396'));
    s.mesh(new THREE.TorusGeometry(T.R - 0.03, 0.05, 6, 40), s.material('#c9cdcf', { metalness: 0.5 }), [xcut, T.axis, 0]).rotation.y = Math.PI / 2;

    // ---- Fin emblem.
    const finMaterial = (width: number, height: number, minX: number, lean: number) => {
      const c2 = document.createElement('canvas'); c2.width = c2.height = 512;
      const c = c2.getContext('2d')!;
      const field = a.field === 'solid' ? ink : a.field === 'metal' ? '#c3c9cd' : '#f3f3ef';
      const mark = a.field === 'solid' ? (a.colours === 'red-white' || a.colours === 'black-silver' ? second : '#f6f4ec') : ink;
      c.fillStyle = field; c.fillRect(0, 0, 512, 512);
      // The emblem sits two fifths of the way up, following the sweep of the fin.
      const cy = 512 * 0.56, cx = 512 * (0.5 + lean), r = 512 * Math.min(0.2, (0.2 * height) / width) * (width > height ? 1 : 1);
      const sx = height / width;               // undo the stretch of a non-square fin
      c.save(); c.translate(cx, cy); c.scale(sx > 1 ? 1 : 1, sx > 1 ? 1 / sx : 1); if (sx <= 1) c.scale(1, 1); c.scale(sx > 1 ? sx * 0 + 1 : 1, 1);
      c.scale(Math.min(1, sx) / Math.min(1, sx), 1); c.scale(height >= width ? 1 : height / width, 1);
      c.fillStyle = mark; c.strokeStyle = mark; c.lineCap = 'round';
      const R = 512 * 0.2;
      if (a.motif === 'sunburst') {
        c.beginPath(); c.arc(0, R * 0.9, R * 0.75, Math.PI, 0); c.fill();
        c.lineWidth = R * 0.14; c.strokeStyle = a.field === 'solid' ? mark : second;
        for (let i = 0; i < 9; i++) { const t = Math.PI + (i / 8) * Math.PI; c.beginPath(); c.moveTo(Math.cos(t) * R * 0.95, R * 0.9 + Math.sin(t) * R * 0.95); c.lineTo(Math.cos(t) * R * 1.75, R * 0.9 + Math.sin(t) * R * 1.75); c.stroke(); }
      } else if (a.motif === 'bird') {
        c.lineWidth = R * 0.12; c.beginPath(); c.arc(0, 0, R * 1.15, 0, 7); c.stroke();
        c.beginPath(); c.moveTo(-R * 0.95, R * 0.1); c.quadraticCurveTo(-R * 0.3, -R * 0.75, 0, R * 0.15); c.quadraticCurveTo(R * 0.35, -R * 0.9, R * 0.98, -R * 0.2);
        c.quadraticCurveTo(R * 0.4, -R * 0.35, R * 0.05, R * 0.55); c.quadraticCurveTo(-R * 0.3, -R * 0.2, -R * 0.95, R * 0.1); c.fill();
      } else if (a.motif === 'globe') {
        c.lineWidth = R * 0.08; c.beginPath(); c.arc(0, 0, R, 0, 7); c.stroke();
        for (const k of [0.35, 0.7]) { c.beginPath(); c.ellipse(0, 0, R * k, R, 0, 0, 7); c.stroke(); }
        c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.moveTo(0, -R); c.lineTo(0, R); c.stroke();
        c.strokeStyle = a.field === 'solid' ? mark : second; c.lineWidth = R * 0.11; c.beginPath(); c.ellipse(0, 0, R * 1.6, R * 0.45, -0.45, 0, 7); c.stroke();
      } else if (a.motif === 'star') { star(c, 0, 0, R * 1.35); }
      else if (a.motif === 'compass') {
        star(c, 0, 0, R * 1.5, 4, 0.2); c.save(); c.rotate(Math.PI / 4); c.fillStyle = a.field === 'solid' ? mark : second; star(c, 0, 0, R * 0.9, 4, 0.22); c.restore();
        c.lineWidth = R * 0.07; c.beginPath(); c.arc(0, 0, R * 0.62, 0, 7); c.stroke();
      }
      c.restore();
      if (a.motif === 'stripes') {
        const cols = [mark, a.field === 'solid' ? mark : second, mark];
        cols.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 512 * 0.085; c.beginPath(); c.moveTo(512 * (1.1 - i * 0.02), 512 * (0.98 - i * 0.16)); c.bezierCurveTo(512 * 0.7, 512 * (0.95 - i * 0.16), 512 * 0.35, 512 * (0.7 - i * 0.16), 512 * -0.1, 512 * (0.25 - i * 0.2)); c.stroke(); });
      } else if (a.motif === 'bands') {
        [ink, second, ink].forEach((col, i) => { c.fillStyle = col; c.fillRect(0, 512 * (0.18 + i * 0.2), 512, 512 * 0.2); });
      }
      // Rudder hinge line.
      c.strokeStyle = 'rgba(40,44,50,0.45)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(512 * 0.3, 512); c.lineTo(512 * (0.3 - 0.0), 512 * 0.5); c.stroke();
      if (stored && a.motif !== 'blank') {
        // Painted out in mismatched rectangles; the old emblem ghosts through.
        for (let i = 0; i < 7; i++) { c.fillStyle = `rgba(${225 + random() * 20},${225 + random() * 20},${220 + random() * 20},${0.78 + random() * 0.14})`; c.fillRect(512 * (0.12 + random() * 0.3), 512 * (0.18 + random() * 0.45), 512 * (0.3 + random() * 0.3), 512 * (0.14 + random() * 0.2)); }
      }
      if (scrap) { c.strokeStyle = '#f0641e'; c.lineWidth = 14; c.beginPath(); c.moveTo(512 * (cx / 512 - 0.2), 512 * 0.3); c.lineTo(512 * (cx / 512 + 0.2), 512 * 0.8); c.moveTo(512 * (cx / 512 + 0.2), 512 * 0.3); c.lineTo(512 * (cx / 512 - 0.2), 512 * 0.8); c.stroke(); }
      for (let i = 0; i < 20 + dirt * 90; i++) { c.fillStyle = `rgba(70,60,50,${0.03 + dirt * 0.12 * random()})`; c.fillRect(random() * 512, random() * 512, 2 + random() * 4, 20 + random() * 90 * dirt); }
      const map = new THREE.CanvasTexture(c2); map.colorSpace = THREE.SRGBColorSpace;
      map.repeat.set(1 / width, 1 / height); map.offset.set(-minX / width, 0);
      const glow = ready ? mix(0.05, 0.5, Math.abs(mood.daylight - 0.5) * 2) : 0;
      return new THREE.MeshStandardMaterial({ map, roughness: 0.4, metalness: a.field === 'metal' ? 0.5 : 0.12, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow });
    };
    const plate = (pts: [number, number][], thick: number, material: THREE.Material, at: [number, number, number], flat = false) => {
      const shape = new THREE.Shape();
      // Round every corner a little so the planform reads as sheet metal, not cardboard.
      pts.forEach((p, i) => { const prev = pts[(i + pts.length - 1) % pts.length], next = pts[(i + 1) % pts.length];
        const A = new THREE.Vector2(...p).lerp(new THREE.Vector2(...prev), 0.12), B = new THREE.Vector2(...p).lerp(new THREE.Vector2(...next), 0.12);
        if (i === 0) shape.moveTo(A.x, A.y); else shape.lineTo(A.x, A.y); shape.quadraticCurveTo(p[0], p[1], B.x, B.y); });
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: thick * 0.4, bevelEnabled: true, bevelSize: thick * 0.3, bevelThickness: thick * 0.3, bevelSegments: 2, curveSegments: 8 });
      g.translate(0, 0, -thick * 0.2);
      if (flat) g.rotateX(Math.PI / 2);
      return s.mesh(g, material, at);
    };
    const white = s.material('#f1f2ee', { roughness: 0.42, metalness: 0.15 }), metal = s.material('#b9bfc3', { roughness: 0.3, metalness: 0.6 });
    const surface = a.field === 'metal' || bare ? metal : white;
    const dark = s.material('#23262a', { roughness: 0.8 }), redCover = s.material('#c62d2a', { roughness: 0.85 });
    const beaconMat = new THREE.MeshStandardMaterial({ color: '#ff3b2e', emissive: '#ff2a1a', emissiveIntensity: ready ? 2.5 : 0.05 });
    const streamers: [number, number, number][] = [];
    let beaconAt: [number, number, number] = [0, 0, 0];
    let finTop = 0;

    const fin = (uRoot: number, chord: number, height: number, sweep: number, tipChord: number) => {
      const x0 = X(uRoot), base = top(uRoot + 0.1) - T.R * 0.25;
      const cutBack = scrap ? 0.7 : 1;
      const pts: [number, number][] = [[x0, 0], [x0 - sweep, height], [x0 - sweep - tipChord * cutBack, height], [x0 - chord * cutBack - (scrap ? sweep * 0.2 : 0), 0]];
      const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
      const material = finMaterial(maxX - minX, height, minX, (x0 - sweep * 0.5 - (chord + tipChord) * 0.22 - (minX + maxX) / 2) / (maxX - minX));
      plate(pts, 0.34, material, [0, base, 0]);
      finTop = base + height;
      if (scrap) for (let i = 1; i < 7; i++) { const t = i / 7; const xr = mix(x0 - chord * cutBack - sweep * 0.2, x0 - sweep - tipChord * cutBack, t); s.rod([xr + 0.2, base + height * t, 0], [xr - chord * 0.22 * (1 - t * 0.5), base + height * t, 0], 0.04, metal); }
      return { x0, base, tipX: x0 - sweep, height };
    };
    const tailplane = (xLE: number, y: number, chord: number, half: number, sweep: number, tipChord: number, dihedral = 0) => {
      for (const side of [-1, 1]) {
        const g = plate([[xLE, 0], [xLE - sweep, half * side], [xLE - sweep - tipChord, half * side], [xLE - chord, 0]], 0.22, surface, [0, y, 0], true);
        g.rotation.x = -side * dihedral;
        streamers.push([xLE - sweep - tipChord * 0.5, y + Math.sin(dihedral) * half - 0.1, half * side * 0.98]);
      }
    };

    if (a.type === 'propliner') {
      const y = top(0.86) + 0.15, xs = X(0.78);
      tailplane(xs, y, 2.6, 5.6, 0.5, 1.5, 0.05);
      const oval = (z: number, scale: number) => {
        const h = 3.6 * scale, w = 2.4 * scale;
        const material = finMaterial(w, h, -w / 2, 0);
        const shape = new THREE.Shape(); shape.absellipse(0, h / 2, w / 2, h / 2, 0, Math.PI * 2);
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 20 }); g.translate(0, 0, -0.04);
        s.mesh(g, material, [xs - 1.5, y - h * (z === 0 ? 0.18 : 0.48), z]);
        if (z === 0) finTop = y - h * 0.18 + h;
      };
      oval(0, 1); oval(5.5, 0.92); oval(-5.5, 0.92);
      beaconAt = [X(0.5), top(0.5), 0];
    } else if (a.type === 'firstjet') {
      const f = fin(0.5, 5.6, 6.4, 4.4, 2.0);
      tailplane(X(0.66), centre(0.72) + radius(0.72) * 0.3, 3.6, 6.6, 3.0, 1.4, 0.12);
      // The probe aerial that every early jet wore on its fin tip.
      s.rod([f.tipX - 0.3, f.base + f.height - 0.15, 0], [f.tipX + 2.4, f.base + f.height - 0.15, 0], 0.07, metal, 0.02);
      beaconAt = [f.tipX - 1.0, finTop + 0.02, 0];
    } else if (a.type === 'ttail') {
      const f = fin(0.42, 6.0, 5.6, 4.2, 3.2);
      tailplane(f.tipX + 0.5, finTop - 0.05, 3.2, 5.6, 2.6, 1.3, -0.03);
      const bullet = s.ball([2.2, 0.32, 0.36], [f.tipX - 1.4, finTop, 0], surface, 16); void bullet;
      // Rear engines on stub pylons, and a third intake at the root of the fin.
      for (const z of [-1, 1]) {
        const ex = X(0.45), ey = centre(0.45) + 0.35, ez = z * (radius(0.45) + 0.95);
        const pod = s.cylinder(0.72, 0.62, 4.4, [ex, ey, ez], scrap ? dark : surface, 24); pod.rotation.z = Math.PI / 2;
        if (!scrap) { s.ring(0.72, 0.09, [ex + 2.2, ey, ez], metal).rotation.y = Math.PI / 2;
          const face = s.cylinder(0.66, 0.66, 0.06, [ex + 2.18, ey, ez], stored || a.state === 'nightstop' ? redCover : dark, 20); face.rotation.z = Math.PI / 2;
          const pipe = s.cylinder(0.5, 0.56, 0.5, [ex - 2.4, ey, ez], stored ? redCover : dark, 18); pipe.rotation.z = Math.PI / 2;
          const stripeBand = s.cylinder(0.735, 0.7, 0.5, [ex + 0.6, ey, ez], s.material(ink), 24); stripeBand.rotation.z = Math.PI / 2; }
        s.box([2.6, 0.22, 1.0], [ex - 0.2, ey, z * (radius(0.45) + 0.3)], surface);
      }
      const intake = s.cylinder(0.75, 0.6, 2.6, [f.x0 - 0.2, f.base + 0.75, 0], surface, 22); intake.rotation.z = Math.PI / 2;
      const mouth = s.cylinder(0.66, 0.66, 0.06, [f.x0 + 1.1, f.base + 0.75, 0], stored || a.state === 'nightstop' ? redCover : dark, 20); mouth.rotation.z = Math.PI / 2;
      beaconAt = [X(0.2), top(0.2), 0];
    } else {
      const f = fin(0.44, 10.5, 10.2, 7.6, 3.6);
      tailplane(X(0.56), centre(0.7) + radius(0.7) * 0.45, 6.6, 10.5, 5.8, 2.2, 0.13);
      beaconAt = [f.tipX - 1.8, finTop + 0.02, 0];
    }
    s.cylinder(0.1, 0.13, 0.12, [beaconAt[0], beaconAt[1] + 0.04, beaconAt[2]], dark, 10);
    s.ball([0.13, 0.17, 0.13], [beaconAt[0], beaconAt[1] + 0.2, beaconAt[2]], beaconMat, 12);
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff4a3a', transparent: true, opacity: 0, depthWrite: false }));
    flash.position.set(beaconAt[0], beaconAt[1] + 0.2, beaconAt[2]); s.root.add(flash);

    // ---- Tail cone: the auxiliary exhaust, a white navigation light.
    const tipX = X(1), tipY = centre(1);
    if (a.type === 'propliner') s.ball([0.5, T.tip, T.tip], [tipX, tipY, 0], metal, 14);
    else {
      const pipe = s.cylinder(T.tip * 0.85, T.tip, 0.5, [tipX - 0.2, tipY, 0], s.material('#5a5d60', { metalness: 0.7, roughness: 0.4 }), 16); pipe.rotation.z = Math.PI / 2;
      const hole = s.cylinder(T.tip * 0.68, T.tip * 0.68, 0.04, [tipX - 0.46, tipY, 0], stored ? redCover : dark, 14); hole.rotation.z = Math.PI / 2;
      // Soot fanning forward from the exhaust.
      const soot = s.cylinder(T.tip * 1.02, radius(0.93) * 1.01, T.L * 0.07, [X(0.965), centre(0.965), 0], new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 1, transparent: true, opacity: 0.25 + dirt * 0.3 }), 16); soot.rotation.z = Math.PI / 2;
    }
    s.ball([0.07, 0.07, 0.07], [tipX - (a.type === 'propliner' ? 0.5 : 0), tipY + T.tip + 0.05, 0], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: ready ? 2 : 0 }), 8);
    streamers.push([tipX + 0.3, tipY - T.tip, 0]);
    const heat = new THREE.Mesh(new THREE.ConeGeometry(T.tip * 2.4, 4.5, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#fff1d8', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    heat.rotation.z = -Math.PI / 2; heat.position.set(tipX - 2.7, tipY, 0);
    if (ready && a.type !== 'propliner') s.root.add(heat);

    // ---- Wing root stubs and the main gear that holds it all up.
    const tyre = s.material('#1b1c1e', { roughness: 0.9 }), hub = s.material('#d7dadb', { metalness: 0.5 }), leg = s.material('#dcdfe0', { metalness: 0.5, roughness: 0.35 });
    const wingY = T.axis - T.R * 0.55, span = T.R * 1.25;
    for (const side of [-1, 1]) {
      plate([[xcut, T.R * 0.5 * side], [xcut, (T.R + span) * side], [xcut - T.R * 0.9, (T.R + span) * side], [xcut - T.R * 1.7, T.R * 0.5 * side]], 0.4, bare ? metal : s.material('#c9cdcf', { metalness: 0.4, roughness: 0.4 }), [0, wingY, 0], true);
      const gz = side * (T.R * 0.5 + span * 0.6), gx = xcut - T.R * 0.6, wr = a.type === 'widebody' ? 0.62 : 0.52;
      s.cylinder(0.12, 0.15, wingY - wr, [gx, (wingY + wr) / 2, gz], leg, 12);
      s.rod([gx, wingY - 0.2, gz], [gx - 1.2, wr + 0.3, gz], 0.06, leg);
      const bogies = a.type === 'widebody' ? [-0.75, 0.75] : a.type === 'propliner' ? [0] : [-0.6, 0.6];
      for (const bx of bogies) for (const dz of [-0.33, 0.33]) wheel(s, wr, 0.36, [gx + bx, wr, gz + dz], tyre, hub);
      if (bogies.length > 1) s.box([1.6, 0.14, 0.14], [gx, wr, gz], leg);
      if (a.state !== 'ready') for (const d of [-1, 1]) s.box([0.3, 0.2, 0.9], [gx + (bogies[bogies.length - 1] + wr + 0.14) * d, 0.1, gz], s.material('#f1bd16', { roughness: 0.9 }));
      if (stored) for (const bx of bogies) s.box([wr * 2.1, wr * 2.05, 1.12], [gx + bx, wr * 1.02, gz], s.material('#cfd3d4', { metalness: 0.6, roughness: 0.5 }));
    }

    // ---- State dressing.
    if (stored) for (const [x, y, z] of streamers) { const len = 0.9 + random() * 0.8; const ribbon = s.box([0.09, len, 0.01], [x, y - len / 2, z], redCover); ribbon.rotation.z = (random() - 0.5) * 0.25; }
    const orange = s.material('#f0641e'), coneWhite = s.material('#f1efe6');
    if (a.state === 'nightstop' || stored) { cone(s, tipX - 0.8, 0, orange, coneWhite); cone(s, X(0.75), T.R * 2.2, orange, coneWhite); cone(s, X(0.75), -T.R * 2.2, orange, coneWhite); }
    if (scrap) {
      for (let i = 0; i < 10; i++) { const p = s.box([0.8 + random() * 1.6, 0.03, 0.6 + random() * 1.0], [X(0.35 + random() * 0.5), 0.05 + i * 0.035, T.R * 0.6 + random() * 2.2], i % 3 ? metal : white); p.rotation.y = random() * 3; p.rotation.z = (random() - 0.5) * 0.25; }
    }
    const ux = X(0.72), uy = centre(0.72) - radius(0.72);
    if (a.stand === 'tailstand') {
      const yel = s.material('#f1bd16');
      s.cylinder(0.07, 0.09, uy - 0.1, [ux, (uy - 0.1) / 2 + 0.05, 0], yel, 12); s.cylinder(0.3, 0.3, 0.08, [ux, uy - 0.04, 0], dark, 16);
      for (let i = 0; i < 3; i++) { const t = (i / 3) * Math.PI * 2; s.rod([ux, uy * 0.4, 0], [ux + Math.cos(t) * 0.9, 0.03, Math.sin(t) * 0.9], 0.04, yel); }
    } else if (a.stand === 'steps') {
      const alu = s.material('#c9ced0', { metalness: 0.6, roughness: 0.4 });
      const hgt = Math.min(uy - 0.1, 2.6);
      for (const z of [-0.3, 0.3]) { s.rod([ux - 0.9, 0.03, T.R * 0.5 + z], [ux, hgt, T.R * 0.5 + z], 0.03, alu); s.rod([ux + 0.7, 0.03, T.R * 0.5 + z], [ux, hgt, T.R * 0.5 + z], 0.03, alu); }
      for (let i = 1; i < 7; i++) { const t = i / 7; s.rod([mix(ux - 0.9, ux, t), mix(0.03, hgt, t), T.R * 0.5 - 0.3], [mix(ux - 0.9, ux, t), mix(0.03, hgt, t), T.R * 0.5 + 0.3], 0.02, alu); }
      s.box([0.55, 0.26, 0.28], [ux - 1.6, 0.13, T.R * 0.5 + 0.6], redCover);
    } else if (a.stand === 'puddle') {
      const p = s.cylinder(1.6 + random(), 1.6, 0.012, [ux + 0.5, 0.006, 0.4], new THREE.MeshStandardMaterial({ color: '#3b342c', roughness: 0.25, metalness: 0.3 }), 24); p.scale.z = 0.6; p.castShadow = false;
    }
    void noul;

    const phase = random() * 6;
    return s.finish({
      footprint: Math.max(T.L / 2, T.R * 3.4),
      update: (_dt, time) => {
        if (!ready) return;
        const rate = mix(0.7, 1.6, mood.energy);
        const on = (time * rate + phase) % 1 < 0.12;
        beaconMat.emissiveIntensity = on ? 5 : 0.4; (flash.material as THREE.MeshBasicMaterial).opacity = on ? 0.3 : 0;
        heat.scale.x = 1 + Math.sin(time * 9) * 0.06; heat.scale.z = 1 + Math.cos(time * 7) * 0.06;
      },
    });
  },
});
