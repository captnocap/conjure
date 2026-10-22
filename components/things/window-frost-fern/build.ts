import * as THREE from 'three';
import { choice, defineThing, mix } from '@conjure/kit';
import { Bag, V, finish, matte, xf } from './bits';

interface Segment { x0: number; y0: number; x1: number; y1: number; depth: number; taper: number }

export default defineThing({
  questions: {
    growth: choice('How has the frost spread over the glass?', {
      corner: 'Fanning out from one lower corner, the rest still clear.',
      sill: 'Rising from the bottom edge in a row, like ferns in a bed.',
      edges: 'Creeping in from all four edges, leaving a clear window in the middle.',
      sheet: 'A thick sheet over the whole pane, fronds on fronds.',
      sparse: 'Two or three lone fronds on bare glass.',
    }),
    pattern: choice('What shape are the crystals?', {
      fern: 'Curling fern fronds, each arm coiling like a fiddlehead.',
      feather: 'Long straight feathers with close-set barbs.',
      star: 'Six-pointed rosettes scattered like stamped stars.',
      needle: 'Scratchy straight needles crossing like pen strokes.',
    }),
    behind: choice('What is on the other side of the glass?', {
      night: 'Deep blue night with a blurred moon.',
      dawn: 'A cold dawn, slate above and peach along the horizon.',
      day: 'A flat grey day and the dark line of a hedge.',
      lamp: 'A warm lamplit room, seen from outside in the cold.',
    }),
    touched: choice('Has anyone touched it?', {
      untouched: 'No. It is whole.',
      peephole: 'A fingertip has melted one round peephole, with a drip running from it.',
      breath: 'Someone breathed on it: a soft oval is fogged clear.',
      heart: 'A heart has been drawn in it with a finger.',
      hand: 'A small handprint is melted into it.',
      thaw: 'It is thawing from one top corner, drops running down.',
    }),
    frame: choice('What holds the pane?', {
      sash: 'A cream-painted wooden sash with a sill.',
      cottage: 'An old green-painted frame, the paint lifting.',
      steel: 'A thin dark steel casement with a latch.',
      bare: 'Nothing but a strip of wood along the bottom: a loose pane.',
    }),
    ledge: choice('What is on the sill or the frame?', {
      nothing: 'Nothing.',
      snow: 'Snow drifted along the bottom of the glass and into the corners.',
      icicles: 'A row of small icicles hanging from the top of the frame.',
      candle: 'A stub of candle burning on the sill.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const w = 0.3, h = 0.36, base = a.frame === 'bare' ? 0.016 : 0.05;
    const reach = mix(1.12, 0.8, mood.warmth) * mix(0.9, 1.1, mood.density);

    // ---- Grow the frost as line segments in pane space (origin bottom-left, y up). ----
    const segments: Segment[] = [];
    const P = { fern: { curl: 2.6, barb: 1.05, scale: 0.4, steps: 16 }, feather: { curl: 0.35, barb: 0.62, scale: 0.3, steps: 20 }, star: { curl: 0, barb: 1.047, scale: 0.42, steps: 7 }, needle: { curl: 0.1, barb: 0.5, scale: 0.16, steps: 6 } }[a.pattern];
    const grow = (x: number, y: number, theta: number, length: number, depth: number, curl: number, deepest: number) => {
      const steps = depth === 0 ? P.steps : depth === 1 ? (deepest === 1 ? 4 : 6) : 3, step = length / steps;
      let th = theta;
      for (let i = 0; i < steps; i++) {
        const nx = x + Math.cos(th) * step, ny = y + Math.sin(th) * step;
        if (nx < 0 || nx > w || ny < 0 || ny > h) break;
        const t = i / steps;
        segments.push({ x0: x, y0: y, x1: nx, y1: ny, depth, taper: 1 - t * 0.7 });
        x = nx; y = ny;
        th += (curl / steps) * (0.4 + t * 1.4);
        if (depth < deepest && segments.length < 30000 && (a.pattern !== 'needle' || i % 2 === 0)) {
          const envelope = Math.sin(Math.min(1, t * 1.15 + 0.12) * Math.PI) ** 0.6;
          for (const side of [-1, 1]) grow(x, y, th + side * P.barb, length * P.scale * envelope * (0.8 + random() * 0.4), depth + 1, curl * side * 0.5, deepest);
        }
      }
    };
    const frond = (x: number, y: number, theta: number, length: number) => {
      const L = length * reach;
      if (a.pattern === 'star') for (let k = 0; k < 6; k++) grow(x, y, theta + (k * Math.PI) / 3, L * 0.3, 0, 0, 1);
      else grow(x, y, theta, L * (a.pattern === 'needle' ? 1.2 : 1), 0, (random() < 0.5 ? -1 : 1) * P.curl * (0.6 + random() * 0.6), L > 0.15 ? 2 : 1);
    };
    const along = (edge: number, t: number): [number, number, number] => edge === 0 ? [t * w, 0.002, Math.PI / 2] : edge === 1 ? [w - 0.002, t * h, Math.PI] : edge === 2 ? [t * w, h - 0.002, -Math.PI / 2] : [0.002, t * h, 0];
    const star = a.pattern === 'star';
    const starAt = (x: number, y: number, size: number) => frond(Math.min(w - 0.02, Math.max(0.02, x)), Math.min(h - 0.02, Math.max(0.02, y)), random(), size);
    if (a.growth === 'corner' || a.growth === 'sheet') {
      const count = Math.round(mix(5, 9, mood.density) * (a.growth === 'sheet' ? 0.6 : 1));
      for (let i = 0; i < count; i++) {
        const angle = mix(0.1, 1.47, (i + random() * 0.6) / count), length = 0.2 + random() * 0.2;
        if (star) starAt(Math.cos(angle) * length, Math.sin(angle) * length, 0.3 * (1.2 - length * 1.5)); else frond(0.003, 0.003, angle, length);
      }
    }
    if (a.growth === 'sill' || a.growth === 'sheet') {
      const count = Math.round(mix(6, 10, mood.density) * (a.growth === 'sheet' ? 0.6 : 1));
      for (let i = 0; i < count; i++) {
        const x = ((i + 0.2 + random() * 0.6) / count) * w, length = 0.12 + random() * 0.17;
        if (star) starAt(x, 0.03 + random() * 0.14, 0.16 + random() * 0.14); else frond(x, 0.002, Math.PI / 2 + (random() - 0.5) * 0.7, length);
      }
    }
    if (a.growth === 'edges' || a.growth === 'sheet') {
      const count = Math.round(mix(14, 24, mood.density));
      for (let i = 0; i < count; i++) {
        const [x, y, inward] = along(i % 4, random());
        if (star) starAt(x + Math.cos(inward) * 0.04, y + Math.sin(inward) * 0.04, 0.14 + random() * 0.1); else frond(x, y, inward + (random() - 0.5) * 0.9, 0.07 + random() * 0.08);
      }
    }
    if (a.growth === 'sparse') {
      const count = 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const [x, y, inward] = along(i === 0 ? 0 : Math.floor(random() * 4), 0.2 + random() * 0.6);
        if (star) starAt(w * (0.2 + random() * 0.6), h * (0.2 + random() * 0.6), 0.3); else frond(x, y, inward + (random() - 0.5) * 0.6, 0.2 + random() * 0.12);
      }
    }
    if (a.growth === 'sheet' && star) for (let i = 0; i < 14; i++) starAt(random() * w, random() * h, 0.14 + random() * 0.14);

    // ---- Where warmth has cleared it: soft circles in pane space. ----
    const clear: { x: number; y: number; r: number; soft: number }[] = [];
    const drips: { x: number; y: number; length: number }[] = [];
    // Aim the touch at the frost itself, so there is something to clear.
    const stems = segments.filter((s) => s.depth === 0);
    const mean = stems.reduce((sum, s) => { sum.x += s.x1 / stems.length; sum.y += s.y1 / stems.length; return sum; }, { x: 0, y: 0 });
    const wide = a.growth === 'sheet' || a.growth === 'edges' || !stems.length;
    const cx = wide ? w * (0.42 + random() * 0.16) : Math.min(w - 0.09, Math.max(0.09, mean.x)), cy = wide ? h * (0.52 + random() * 0.12) : Math.min(h - 0.1, Math.max(0.1, mean.y));
    if (a.touched === 'peephole') { clear.push({ x: cx, y: cy, r: 0.034, soft: 0.25 }); drips.push({ x: cx + 0.004, y: cy - 0.03, length: 0.09 + random() * 0.06 }); }
    else if (a.touched === 'breath') for (let i = 0; i < 6; i++) clear.push({ x: cx + (random() - 0.5) * 0.09, y: cy + (random() - 0.5) * 0.05, r: 0.05 + random() * 0.025, soft: 0.7 });
    else if (a.touched === 'heart') for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2, s = 0.0048;
      clear.push({ x: cx + s * 16 * Math.sin(t) ** 3, y: cy + s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)), r: 0.0105, soft: 0.3 });
    } else if (a.touched === 'hand') {
      for (let i = 0; i < 5; i++) clear.push({ x: cx + (random() - 0.5) * 0.03, y: cy - 0.03 + (random() - 0.5) * 0.03, r: 0.03, soft: 0.3 });
      [-0.75, -0.3, 0, 0.3, 0.62].forEach((splay, finger) => {
        const length = [0.05, 0.075, 0.085, 0.078, 0.06][finger], x0 = cx + splay * 0.05, y0 = cy + (finger === 0 ? -0.025 : 0.005);
        for (let k = 0; k < 6; k++) clear.push({ x: x0 + Math.sin(splay * 0.8) * length * (k / 5), y: y0 + Math.cos(splay * 0.8) * length * (k / 5), r: 0.0095, soft: 0.3 });
      });
    } else if (a.touched === 'thaw') {
      clear.push({ x: w, y: h, r: 0.17 + mood.warmth * 0.05, soft: 0.35 });
      for (let i = 0; i < 4; i++) drips.push({ x: w * (0.5 + i * 0.12 + random() * 0.05), y: h * (0.66 - i * 0.06 + random() * 0.05), length: 0.07 + random() * 0.1 });
    }
    for (const drip of drips) for (let k = 0; k < 10; k++) clear.push({ x: drip.x + Math.sin(k * 0.9) * 0.002, y: drip.y - (k / 9) * drip.length, r: 0.006, soft: 0.3 });
    const cleared = (x: number, y: number) => clear.some((c) => Math.hypot(x - c.x, y - c.y) < c.r * (1 - c.soft * 0.5));

    // ---- Paint the pane. ----
    const CW = 640, CH = Math.round((640 * h) / w);
    const canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    const px = (x: number) => (x / w) * CW, py = (y: number) => (1 - y / h) * CH, pr = (r: number) => (r / w) * CW;
    const sky = ctx.createLinearGradient(0, 0, 0, CH);
    const stops = { night: ['#1d2a4a', '#2c3d66', '#3d4f7c'], dawn: ['#55688f', '#b98591', '#eeb588'], day: ['#77858f', '#8f9ba3', '#a4aeb2'], lamp: ['#6b3f20', '#b8742f', '#d99a45'] }[a.behind];
    stops.forEach((stop, i) => sky.addColorStop(i / 2, stop));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, CH);
    if (a.behind === 'night' || a.behind === 'lamp') {
      const gx = CW * (0.3 + random() * 0.4), gy = CH * (a.behind === 'night' ? 0.25 : 0.5), glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, CW * 0.3);
      glow.addColorStop(0, a.behind === 'night' ? 'rgba(235,240,255,0.95)' : 'rgba(255,236,170,0.95)');
      glow.addColorStop(0.18, a.behind === 'night' ? 'rgba(170,190,235,0.45)' : 'rgba(255,200,110,0.6)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, CW, CH);
    } else {
      ctx.fillStyle = a.behind === 'day' ? 'rgba(52,60,58,0.75)' : 'rgba(58,52,78,0.7)';
      ctx.beginPath(); ctx.moveTo(0, CH);
      for (let i = 0; i <= 24; i++) ctx.lineTo((i / 24) * CW, CH * (0.84 - random() * 0.07 - (i % 7 === 3 ? 0.12 : 0)));
      ctx.lineTo(CW, CH); ctx.fill();
    }
    const frost = document.createElement('canvas');
    frost.width = CW; frost.height = CH;
    const f = frost.getContext('2d')!;
    f.fillStyle = `rgba(232,242,250,${a.growth === 'sheet' ? 0.5 : 0.1})`;
    f.fillRect(0, 0, CW, CH);
    f.lineCap = 'round';
    // Haze thickens round every stem before the crisp strokes go on top.
    f.strokeStyle = 'rgba(225,238,248,0.22)';
    for (const s of segments) if (s.depth < 1) { f.lineWidth = 34; f.beginPath(); f.moveTo(px(s.x0), py(s.y0)); f.lineTo(px(s.x1), py(s.y1)); f.stroke(); }
    for (const s of segments) {
      f.strokeStyle = s.depth === 0 ? 'rgba(255,255,255,1)' : s.depth === 1 ? 'rgba(246,251,255,0.96)' : 'rgba(236,246,253,0.85)';
      f.lineWidth = [5.2, 2.6, 1.3][s.depth] * (0.45 + s.taper * 0.55);
      f.beginPath(); f.moveTo(px(s.x0), py(s.y0)); f.lineTo(px(s.x1), py(s.y1)); f.stroke();
    }
    f.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 500; i++) f.fillRect(random() * CW, random() * CH, 1.6, 1.6);
    f.globalCompositeOperation = 'destination-out';
    for (const c of clear) {
      const g = f.createRadialGradient(px(c.x), py(c.y), pr(c.r) * (1 - c.soft), px(c.x), py(c.y), pr(c.r));
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      f.fillStyle = g; f.beginPath(); f.arc(px(c.x), py(c.y), pr(c.r), 0, Math.PI * 2); f.fill();
    }
    ctx.drawImage(frost, 0, 0);
    if (mood.wear > 0.6) {
      // An old pane carries a crack.
      ctx.strokeStyle = 'rgba(240,246,250,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); let x = CW * (0.1 + random() * 0.3), y = 0; ctx.moveTo(x, y);
      while (y < CH * (0.5 + mood.wear * 0.5)) { x += (random() - 0.35) * 50; y += 30 + random() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const glow = a.behind === 'lamp' ? 0.5 : a.behind === 'dawn' ? 0.3 : 0.18;
    const front = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow * mix(0.7, 1.2, mood.cheer), roughness: 0.25 });
    const edge = new THREE.MeshStandardMaterial({ color: stops[1], roughness: 0.3 });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), [edge, edge, edge, edge, front, edge]);
    pane.position.set(0, base + h / 2, 0);
    pane.castShadow = pane.receiveShadow = true;
    root.add(pane);

    // ---- The stems again as raised ice, so the frost has relief. ----
    const rime = new Bag(), wood = new Bag(), snow = new Bag(), wet = new Bag(), wax = new Bag();
    const lift = (x: number, y: number, z = 0.0045) => V(x - w / 2, base + y, z);
    const busy = segments.filter((s) => s.depth < 2).length > 3500;
    let nth = 0;
    for (const s of segments) {
      if (s.depth === 1 && busy && nth++ % 3) continue;
      if (s.depth > 1 || cleared((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2)) continue;
      const length = Math.hypot(s.x1 - s.x0, s.y1 - s.y0), width = (s.depth === 0 ? 0.0034 : 0.0018) * (0.45 + s.taper * 0.55);
      rime.add(new THREE.BoxGeometry(length * 1.05, width, s.depth === 0 ? 0.004 : 0.0024), s.depth === 0 ? '#ffffff' : '#edf5fb', xf(lift((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2), 1, new THREE.Euler(0, 0, Math.atan2(s.y1 - s.y0, s.x1 - s.x0))));
    }
    for (const drip of drips) {
      wet.add(new THREE.SphereGeometry(1, 12, 8), '#cfe4f2', xf(lift(drip.x, drip.y - drip.length, 0.006), V(0.006, 0.0085, 0.004)));
      wet.add(new THREE.SphereGeometry(1, 8, 6), '#cfe4f2', xf(lift(drip.x + 0.002, drip.y - drip.length * 0.45, 0.005), V(0.003, 0.004, 0.002)));
    }
    if (mood.warmth > 0.6 || a.touched === 'thaw' || a.touched === 'breath') for (let i = 0; i < 24; i++) {
      const c = clear.length ? clear[Math.floor(random() * clear.length)] : { x: random() * w, y: random() * h, r: 0.02 };
      const x = Math.min(w - 0.01, Math.max(0.01, c.x + (random() - 0.5) * c.r * 1.4)), y = Math.min(h - 0.01, Math.max(0.01, c.y + (random() - 0.5) * c.r * 1.4));
      wet.add(new THREE.SphereGeometry(1, 8, 6), '#cfe4f2', xf(lift(x, y, 0.005), V(0.0028, 0.0034, 0.002).multiplyScalar(0.6 + random())));
    }

    // ---- Frame, sill and whatever sits on them. ----
    const paint = new THREE.Color({ sash: '#d8d2c0', cottage: '#4f7260', steel: '#353b42', bare: '#8b6d4c' }[a.frame]);
    const bare = new THREE.Color('#8b6d4c');
    const t = a.frame === 'steel' ? 0.014 : 0.03, d = a.frame === 'steel' ? 0.022 : 0.042;
    const peel = (a.frame === 'cottage' ? 0.35 : 0.05) + mood.wear * 0.5;
    const rail = (size: [number, number, number], at: THREE.Vector3) => {
      wood.add(new THREE.BoxGeometry(...size), paint.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03), xf(at));
      if (a.frame === 'steel' || a.frame === 'bare') return;
      const long = size[0] > size[1], patches = Math.round(peel * 7 * random());
      for (let i = 0; i < patches; i++) {
        const u = (random() - 0.5) * 0.9, lengthways = 0.008 + random() * 0.02;
        wood.add(new THREE.BoxGeometry(long ? lengthways : size[0] * (0.3 + random() * 0.5), long ? size[1] * (0.3 + random() * 0.5) : lengthways, 0.002), bare.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1), xf(at.clone().add(V(long ? u * size[0] : (random() - 0.5) * size[0] * 0.3, long ? (random() - 0.5) * size[1] * 0.3 : u * size[1], size[2] / 2))));
      }
    };
    let sillTop = 0, sillDepth = 0.03;
    if (a.frame === 'bare') {
      rail([w + 0.03, base, 0.04], V(0, base / 2, 0));
      sillTop = base; sillDepth = 0.02;
    } else {
      const sw = w + t * 2 + (a.frame === 'steel' ? 0.01 : 0.07), sd = a.frame === 'steel' ? 0.05 : 0.11;
      rail([sw, base - t, sd], V(0, (base - t) / 2, sd / 2 - d / 2 - 0.004));
      rail([w + t * 2, t, d], V(0, base - t / 2, 0));
      rail([w + t * 2, t, d], V(0, base + h + t / 2, 0));
      for (const side of [-1, 1]) rail([t, h, d], V(side * (w + t) / 2, base + h / 2, 0));
      sillTop = base - t; sillDepth = sd - d / 2 - 0.004;
      if (a.frame === 'steel') {
        wood.add(new THREE.BoxGeometry(0.012, 0.05, 0.012), '#8a8f94', xf(V(w / 2 + t / 2, base + h * 0.5, d / 2 + 0.006)));
        wood.add(new THREE.BoxGeometry(0.05, 0.01, 0.01), '#8a8f94', xf(V(w / 2 + t / 2 - 0.02, base + h * 0.5 - 0.02, d / 2 + 0.012), 1, new THREE.Euler(0, 0, 0.5)));
        for (const y of [0.2, 0.8]) wood.add(new THREE.BoxGeometry(0.016, 0.04, 0.012), '#55595f', xf(V(-w / 2 - t / 2, base + h * y, d / 2 + 0.004)));
      }
    }
    if (a.ledge === 'snow') {
      for (let i = 0; i < 9; i++) snow.add(new THREE.SphereGeometry(1, 12, 8), '#eef4f9', xf(V(mix(-w / 2, w / 2, i / 8), base + 0.004, 0.012), V(0.03 + random() * 0.015, 0.012 + random() * 0.02 + (i === 0 || i === 8 ? 0.03 : 0), 0.014)));
      if (a.frame !== 'bare') for (let i = 0; i < 6; i++) snow.add(new THREE.SphereGeometry(1, 12, 8), '#eef4f9', xf(V((random() - 0.5) * w, sillTop + 0.003, sillDepth * 0.5), V(0.05, 0.012 + random() * 0.012, sillDepth * 0.45)));
    } else if (a.ledge === 'icicles') {
      const count = 6 + Math.floor(random() * 5), top = base + h + (a.frame === 'bare' ? 0 : t * 0.2);
      for (let i = 0; i < count; i++) {
        const length = 0.025 + random() ** 2 * 0.1, r = 0.004 + length * 0.05;
        snow.add(new THREE.ConeGeometry(r, length, 7), '#cfe6f6', xf(V(mix(-w / 2, w / 2, (i + random() * 0.7) / count), top - length / 2, a.frame === 'bare' ? 0.006 : d / 2 + 0.002), 1, new THREE.Euler(Math.PI, 0, 0)));
      }
    }
    let flame: THREE.Mesh | null = null;
    if (a.ledge === 'candle') {
      const at = V(w * 0.3, sillTop, a.frame === 'bare' ? 0.07 : sillDepth * 0.55), tall = 0.03 + random() * 0.03;
      if (a.frame === 'bare') wax.add(new THREE.CylinderGeometry(0.03, 0.034, 0.006, 16), '#8f8a80', xf(at.clone().setY(0.003)));
      const y0 = a.frame === 'bare' ? 0.006 : sillTop;
      wax.add(new THREE.CylinderGeometry(0.014, 0.016, tall, 14), '#efe6cc', xf(V(at.x, y0 + tall / 2, at.z)));
      wax.add(new THREE.SphereGeometry(1, 10, 6), '#efe6cc', xf(V(at.x + 0.012, y0 + 0.003, at.z + 0.008), V(0.014, 0.004, 0.012)));
      wax.add(new THREE.CylinderGeometry(0.001, 0.001, 0.008, 5), '#2a2622', xf(V(at.x, y0 + tall + 0.004, at.z)));
      const geometry = new THREE.SphereGeometry(1, 12, 10), p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setXYZ(i, p.getX(i) * (1 - p.getY(i) * 0.8), p.getY(i) * 2.2, p.getZ(i) * (1 - p.getY(i) * 0.8));
      geometry.computeVertexNormals();
      flame = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: mix(1, 2, mood.cheer), roughness: 0.4 }));
      flame.scale.setScalar(0.0075);
      flame.position.set(at.x, y0 + tall + 0.014, at.z);
      root.add(flame);
    }
    rime.into(root, matte({ roughness: 0.55, emissive: '#c4d6e6', emissiveIntensity: 0.35 }));
    wood.into(root, matte({ roughness: a.frame === 'steel' ? 0.5 : 0.8, metalness: a.frame === 'steel' ? 0.5 : 0 }));
    snow.into(root, matte({ roughness: a.ledge === 'icicles' ? 0.15 : 0.9, emissive: '#aebfd0', emissiveIntensity: 0.2 }));
    wet.into(root, new THREE.MeshPhysicalMaterial({ roughness: 0.03, clearcoat: 1, emissive: '#7fb5dc', emissiveIntensity: 0.15 }));
    wax.into(root, matte({ roughness: 0.6 }));

    const top = flame ? flame.position.y : 0, pace = mix(3, 14, mood.energy), jump = mix(0.05, 0.3, mood.energy);
    return finish(root, flame ? (_dt, time) => {
      flame!.scale.set(0.0075, 0.0075 * (1 + Math.sin(time * pace) * jump + Math.sin(time * pace * 2.3) * jump * 0.5), 0.0075);
      flame!.position.y = top + Math.sin(time * pace) * 0.0008;
      flame!.rotation.z = Math.sin(time * pace * 0.6) * jump;
    } : undefined, 0.2);
  },
});
