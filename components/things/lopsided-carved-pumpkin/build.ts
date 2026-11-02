import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type XY = readonly [number, number];
type Ctx = CanvasRenderingContext2D;

export default defineThing({
  questions: {
    face: choice('What face has been carved into it?', {
      gaptooth: 'Triangle eyes and nose over a wide grin with a single gap tooth left standing.',
      surprised: 'Round startled O eyes, raised brows and a big round O mouth.',
      cat: 'A cat: almond eyes with slit pupils, a little triangle nose, a curly mouth and whiskers.',
      wink: 'One triangle eye, the other closed in a wink, and a sly lopsided smirk.',
      vampire: 'A scowling vampire: slanted angry eyes, knitted brows and a mouth with two fangs.',
      crooked: 'A small child\'s crooked first attempt: mismatched wobbly eyes, a jagged mouth and a knife slip.',
    }),
    shape: choice('What kind of pumpkin is it?', {
      squat: 'Squat and wide, a flattened orange cushion with deep ribs.',
      tall: 'Tall and oval, standing up straight like an egg.',
      warty: 'A warty knucklehead covered in green-flecked bumps.',
      ghost: 'A white ghost pumpkin, chalky pale with faint green streaks.',
    }),
    lid: choice('Where is the lid?', {
      on: 'Sitting on top with a glowing seam showing round the cut.',
      askew: 'Cocked half off at an angle, light spilling out of the top.',
      beside: 'Taken off and set down beside it, stem up, the candle visible inside.',
    }),
    slump: score('Has it started to slump in on itself?', [
      'Freshly carved, firm and crisp',
      'A day or two old, the cut edges softening',
      'Wrinkled and sagging, the face drooping',
      'Collapsing in on itself, mould in the cuts',
    ]),
    size: score('How big is it?', ['A little pie pumpkin', 'An ordinary carving pumpkin', 'A big one from the patch', 'A giant that took two to carry']),
    mess: choice('Is the carving mess still around it?', {
      none: 'No: it stands on its own, cleaned up.',
      paper: 'It sits on spread newspaper with a heap of stringy pulp and seeds.',
      tools: 'Newspaper, seeds, a little orange carving saw and the big scooping spoon left beside it.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glow = clamp01(0.06 + 0.94 * (0.4 * mood.cheer + 0.35 * mood.warmth + 0.25 * mood.energy));
    const slump = a.slump;

    // ---- the form ----
    const dims = { squat: [0.17, 0.2], tall: [0.13, 0.29], warty: [0.155, 0.22], ghost: [0.155, 0.2] }[a.shape];
    const R = dims[0], H = dims[1];
    const ribs = a.shape === 'tall' ? 8 + Math.floor(random() * 3) : 9 + Math.floor(random() * 4);
    const ribDepth = a.shape === 'squat' ? 0.09 : a.shape === 'ghost' ? 0.05 : 0.07;
    const lop = [0.03 + random() * 0.04, random() * 6, 0.02 + random() * 0.03, random() * 6, 0.03 + random() * 0.05, random() * 6];
    const cave = random() * Math.PI * 2;
    const warts = a.shape === 'warty' ? Array.from({ length: 60 }, () => [random() * Math.PI * 2, Math.PI * (0.22 + random() * 0.62), 0.003 + random() * 0.006] as const) : [];
    const angle = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
    const shape = (u: number, v: number, out: THREE.Vector3, sag = slump, shell = 1) => {
      const th = Math.PI * 2 * u + Math.PI, ph = Math.PI * v;
      const sn = Math.sin(ph), cs = Math.cos(ph);
      let r = R * sn;
      let y = H / 2 * (1 - cs);
      const groove = Math.pow(1 - Math.abs(Math.cos(ribs * th / 2)), 4);
      r *= 1 - ribDepth * groove * Math.sqrt(sn);
      r *= 1 + lop[0] * Math.sin(th + lop[1]) + lop[2] * Math.sin(2 * th + lop[3]);
      y *= 1 + lop[4] * Math.sin(th + lop[5]) * (1 - cs) / 2;
      for (const [wt, wp, h] of warts) {
        const d2 = angle(th - wt) ** 2 * sn + (ph - wp) ** 2;
        r += h * Math.exp(-d2 / 0.006);
      }
      if (cs < 0) y -= 0.12 * H * Math.pow(1 - sn, 3); else y += 0.06 * H * Math.pow(1 - sn, 3);
      // Slumping: the top sinks, the belly spreads, one side caves in.
      y *= 1 - 0.3 * sag;
      r *= 1 + sag * 0.16 * Math.sqrt(sn) * clamp01(cs + 0.4);
      r *= 1 - sag * 0.14 * Math.exp(-(angle(th - cave) ** 2) / 0.5) * sn * (1 - cs) / 2;
      y -= sag * 0.08 * H * Math.pow(clamp01(-cs), 1.5);
      if (shell !== 1) { r *= shell; y = H * 0.05 + y * (shell + 0.03); }
      return out.set(r * Math.sin(th), y, r * Math.cos(th));
    };

    // ---- the skin, painted with its face ----
    const W = 1024, Hc = 512;
    const colour = document.createElement('canvas'); colour.width = W; colour.height = Hc;
    const lit = document.createElement('canvas'); lit.width = W; lit.height = Hc;
    const c = colour.getContext('2d')!, e = lit.getContext('2d')!;
    const skinHex = { squat: '#e7741a', tall: '#ee8a24', warty: '#d97a22', ghost: '#ece5d2' }[a.shape];
    c.fillStyle = skinHex; c.fillRect(0, 0, W, Hc);
    e.fillStyle = '#000'; e.fillRect(0, 0, W, Hc);
    // Streaks along the ribs, darker in the grooves.
    for (let k = 0; k < ribs; k++) {
      const u = ((((2 * k + 1) * Math.PI / ribs) - Math.PI) / (Math.PI * 2) + 1) % 1;
      const g = c.createLinearGradient(u * W - 14, 0, u * W + 14, 0);
      g.addColorStop(0, 'rgba(90,40,10,0)'); g.addColorStop(0.5, a.shape === 'ghost' ? 'rgba(120,140,100,0.35)' : 'rgba(110,45,8,0.35)'); g.addColorStop(1, 'rgba(90,40,10,0)');
      c.fillStyle = g; c.fillRect(u * W - 14, 0, 28, Hc);
    }
    for (let i = 0; i < 90; i++) {
      c.fillStyle = random() < 0.5 ? 'rgba(255,220,150,0.09)' : 'rgba(120,50,10,0.08)';
      if (a.shape === 'ghost') c.fillStyle = random() < 0.5 ? 'rgba(150,170,120,0.12)' : 'rgba(255,255,250,0.15)';
      c.fillRect(random() * W, 0, 2 + random() * 6, Hc);
    }
    if (a.shape === 'warty') for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${90 + random() * 40},${110 + random() * 30},40,${0.25 + random() * 0.3})`; c.beginPath(); c.ellipse(random() * W, 40 + random() * 420, 4 + random() * 16, 3 + random() * 10, 0, 0, 7); c.fill(); }
    { const g = c.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, a.shape === 'ghost' ? 'rgba(120,140,90,0.7)' : 'rgba(95,105,40,0.75)'); g.addColorStop(1, 'rgba(95,105,40,0)'); c.fillStyle = g; c.fillRect(0, 0, W, 80); }
    { const g = c.createLinearGradient(0, Hc - 70, 0, Hc); g.addColorStop(0, 'rgba(240,200,110,0)'); g.addColorStop(1, 'rgba(225,190,110,0.8)'); c.fillStyle = g; c.fillRect(0, Hc - 70, W, 70); }
    for (let i = 0; i < 200; i++) { c.fillStyle = 'rgba(80,40,10,0.25)'; c.fillRect(random() * W, random() * Hc, 1.5, 1.5); }

    // Face space: units of a little over half the radius, measured on the fresh form at the front.
    const vFace = a.shape === 'tall' ? 0.52 : 0.5;
    const p0 = shape(0.5, vFace, new THREE.Vector3(), 0), pu = shape(0.52, vFace, new THREE.Vector3(), 0), pv = shape(0.5, vFace + 0.02, new THREE.Vector3(), 0);
    const pxU = W * 0.02 / p0.distanceTo(pu), pxV = Hc * 0.02 / p0.distanceTo(pv);
    const unit = Math.min(R, H * 0.62) * 0.7;
    const tilt = (random() - 0.5) * (a.face === 'crooked' ? 0.3 : 0.1);
    const cx = W / 2 + (random() - 0.5) * 20, cy = (1 - vFace) * Hc;
    const P = (x: number, y: number): XY => {
      const rx = x * Math.cos(tilt) - y * Math.sin(tilt), ry = x * Math.sin(tilt) + y * Math.cos(tilt);
      return [cx + rx * unit * pxU, cy - ry * unit * pxV];
    };
    const wob = a.face === 'crooked' ? 0.07 : 0.025;
    const jitter = (pts: XY[]) => pts.map(([x, y]) => [x + (random() - 0.5) * wob, y + (random() - 0.5) * wob] as XY);
    const fleshHex = slump > 0.6 ? '#9a6a34' : '#c98a3c';
    const inside = new THREE.Color('#1e0e04').lerp(new THREE.Color('#5a2a08'), glow);
    const insideHex = `#${inside.getHexString()}`;
    const rimPx = Math.max(4, unit * pxU * 0.06 * (1 + slump * 0.6));
    const both = (draw: (ctx: Ctx) => void, fill: string, glowFill: string) => {
      for (const [ctx, f] of [[c, fill], [e, glowFill]] as const) { ctx.fillStyle = f; ctx.strokeStyle = f; ctx.beginPath(); draw(ctx); }
    };
    const polyPath = (pts: XY[]) => (ctx: Ctx) => { pts.forEach((p, i) => { const [X, Y] = P(...p); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.closePath(); };
    const curvePath = (moves: XY[][]) => (ctx: Ctx) => {
      // Each entry: [start] or [control, end] for quadratic segments.
      moves.forEach((m, i) => { if (i === 0) ctx.moveTo(...P(...m[0])); else if (m.length === 1) ctx.lineTo(...P(...m[0])); else ctx.quadraticCurveTo(...P(...m[0]), ...P(...m[1])); });
      ctx.closePath();
    };
    const ellipsePath = (x: number, y: number, rx: number, ry: number) => (ctx: Ctx) => { const [X, Y] = P(x, y); ctx.ellipse(X, Y, rx * unit * pxU, ry * unit * pxV, -tilt, 0, 7); };
    /** A hole cut right through: a pale wall of flesh round a glowing (or dark) inside. */
    const hole = (path: (ctx: Ctx) => void) => {
      both((ctx) => { path(ctx); ctx.lineWidth = rimPx * 2; ctx.lineJoin = 'round'; ctx.stroke(); }, fleshHex, '#3a3a3a');
      both((ctx) => { path(ctx); ctx.fill(); }, insideHex, '#fff');
    };
    /** A slit cut with the tip of the knife. */
    const slit = (moves: XY[][], width: number) => {
      const path = (ctx: Ctx) => moves.forEach((m, i) => { if (i === 0) ctx.moveTo(...P(...m[0])); else if (m.length === 1) ctx.lineTo(...P(...m[0])); else ctx.quadraticCurveTo(...P(...m[0]), ...P(...m[1])); });
      both((ctx) => { path(ctx); ctx.lineCap = 'round'; ctx.lineWidth = width * unit * pxU + rimPx * 2; ctx.stroke(); }, fleshHex, '#555');
      both((ctx) => { path(ctx); ctx.lineCap = 'round'; ctx.lineWidth = width * unit * pxU; ctx.stroke(); }, insideHex, '#fff');
    };
    /** Flesh left standing inside a hole: a tooth, a fang, a pupil. */
    const keep = (path: (ctx: Ctx) => void) => {
      both((ctx) => { path(ctx); ctx.fill(); }, skinHex, '#000');
      both((ctx) => { path(ctx); ctx.lineWidth = rimPx * 0.8; ctx.stroke(); }, fleshHex, '#333');
    };
    const mirror = (pts: XY[]) => pts.map(([x, y]) => [-x, y] as XY);
    switch (a.face) {
      case 'gaptooth': {
        const eye: XY[] = [[-0.78, 0.12], [-0.22, 0.12], [-0.52, 0.66]];
        hole(polyPath(jitter(eye))); hole(polyPath(jitter(mirror(eye))));
        hole(polyPath(jitter([[-0.13, -0.14], [0.13, -0.14], [0, 0.12]])));
        hole(curvePath([[[-0.98, -0.28]], [[0, -0.8], [0.98, -0.28]], [[0.86, -0.4]], [[0, -1.3], [-0.86, -0.4]]]));
        keep(polyPath([[-0.14, -0.4], [0.12, -0.4], [0.1, -0.74], [-0.12, -0.74]]));
        keep(polyPath([[0.3, -1.0], [0.52, -0.95], [0.5, -0.66], [0.32, -0.7]]));
        break;
      }
      case 'surprised': {
        hole(ellipsePath(-0.46, 0.36, 0.25, 0.27)); hole(ellipsePath(0.46, 0.36, 0.23, 0.26));
        slit([[[-0.75, 0.74]], [[-0.46, 0.98], [-0.2, 0.78]]], 0.07); slit([[[0.2, 0.78]], [[0.46, 0.98], [0.75, 0.74]]], 0.07);
        hole(ellipsePath(0, -0.58, 0.27, 0.36));
        break;
      }
      case 'cat': {
        const eye: XY[][] = [[[-0.86, 0.3]], [[-0.52, 0.78], [-0.14, 0.36]], [[-0.5, -0.02], [-0.86, 0.3]]];
        hole(curvePath(eye)); hole(curvePath(eye.map((m) => m.map(([x, y]) => [-x, y] as XY))));
        keep(ellipsePath(-0.5, 0.36, 0.05, 0.2)); keep(ellipsePath(0.5, 0.36, 0.05, 0.2));
        hole(polyPath([[-0.14, 0.02], [0.14, 0.02], [0, -0.17]]));
        slit([[[0, -0.18]], [[0, -0.3]], [[-0.16, -0.52], [-0.38, -0.3]]], 0.07);
        slit([[[0, -0.3]], [[0.16, -0.52], [0.38, -0.3]]], 0.07);
        for (const side of [-1, 1]) for (let i = 0; i < 3; i++) slit([[[side * 0.42, -0.1 - i * 0.1]], [[side * 1.05, -0.02 - i * 0.16]]], 0.045);
        break;
      }
      case 'wink': {
        hole(polyPath(jitter([[-0.78, 0.14], [-0.22, 0.14], [-0.5, 0.66]])));
        slit([[[0.22, 0.42]], [[0.5, 0.12], [0.78, 0.42]]], 0.1);
        hole(curvePath([[[-0.62, -0.46]], [[0.08, -0.62], [0.86, -0.12]], [[0.78, -0.3]], [[0.12, -1.0], [-0.62, -0.46]]]));
        slit([[[0.84, -0.06]], [[0.96, -0.16]]], 0.06);
        break;
      }
      case 'vampire': {
        const eye: XY[] = [[-0.82, 0.5], [-0.16, 0.22], [-0.3, 0.02], [-0.74, 0.12]];
        hole(polyPath(jitter(eye))); hole(polyPath(jitter(mirror(eye))));
        slit([[[-0.92, 0.74]], [[-0.14, 0.44]]], 0.08); slit([[[0.92, 0.74]], [[0.14, 0.44]]], 0.08);
        hole(ellipsePath(-0.08, -0.08, 0.04, 0.09)); hole(ellipsePath(0.08, -0.08, 0.04, 0.09));
        hole(curvePath([[[-0.86, -0.34]], [[0, -0.2], [0.86, -0.34]], [[0, -1.05], [-0.86, -0.34]]]));
        keep(polyPath([[-0.44, -0.2], [-0.16, -0.2], [-0.3, -0.66]]));
        keep(polyPath([[0.44, -0.2], [0.16, -0.2], [0.3, -0.66]]));
        break;
      }
      case 'crooked': {
        const blob = (x: number, y: number, r: number, n: number) => Array.from({ length: n }, (_, i) => {
          const t = i / n * Math.PI * 2 + random() * 0.3;
          const rr = r * (0.75 + random() * 0.45);
          return [x + Math.cos(t) * rr, y + Math.sin(t) * rr] as XY;
        });
        hole(polyPath(blob(-0.5, 0.4, 0.3, 7)));
        hole(polyPath(jitter([[0.24, 0.16], [0.62, 0.2], [0.4, 0.5]])));
        const top: XY[] = [], bottom: XY[] = [];
        for (let i = 0; i <= 7; i++) { const x = -0.75 + i * 0.2; top.push([x, -0.36 - Math.sin(i / 7 * Math.PI) * 0.18 + (random() - 0.5) * 0.12 + i * 0.03]); }
        for (let i = 7; i >= 0; i--) { const x = -0.75 + i * 0.2; bottom.push([x, -0.62 - Math.sin(i / 7 * Math.PI) * 0.25 + (i % 2 ? 0.16 : 0) + (random() - 0.5) * 0.1 + i * 0.03]); }
        hole(polyPath([...top, ...bottom]));
        slit([[[0.66, 0.66]], [[0.98, 0.46]]], 0.05);
        break;
      }
    }

    // Age: bruises and mould gather where the pumpkin is going soft.
    if (slump > 0.35) {
      for (let i = 0; i < Math.round(slump * 14); i++) {
        const x = random() * W, y = 120 + random() * 380, r = 15 + random() * 60 * slump;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(70,40,15,0.55)'); g.addColorStop(1, 'rgba(70,40,15,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    if (slump > 0.62) {
      for (let k = 0; k < 9; k++) {
        const near = k < 6;
        const x = near ? cx + (random() - 0.5) * unit * pxU * 1.8 : random() * W, y = near ? cy + (random() - 0.5) * unit * pxV * 1.6 : 300 + random() * 200;
        for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(235,240,225,${0.35 + random() * 0.5})`; c.beginPath(); c.arc(x + (random() - 0.5) * 34, y + (random() - 0.5) * 24, 1.5 + random() * 4, 0, 7); c.fill(); }
      }
    }
    if (mood.wear > 0.4) for (let i = 0; i < mood.wear * 20; i++) { c.strokeStyle = 'rgba(250,220,170,0.4)'; c.lineWidth = 1.5; c.beginPath(); const x = random() * W, y = random() * Hc; c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 40, y + (random() - 0.5) * 20); c.stroke(); }

    // The lid's cut, a zigzag ring just above the face.
    const vCut = 0.8;
    const seamY = (1 - vCut) * Hc;
    both((ctx) => { for (let x = 0; x <= W; x += 32) ctx.lineTo(x, seamY + (x / 32 % 2 ? -4 : 4)); ctx.lineWidth = 3; ctx.stroke(); }, a.lid === 'on' ? '#5a2a0a' : fleshHex, a.lid === 'on' ? '#aaa' : '#222');

    const map = new THREE.CanvasTexture(colour); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
    const emissiveMap = new THREE.CanvasTexture(lit); emissiveMap.colorSpace = THREE.SRGBColorSpace;
    const baseGlow = mix(0.02, 2.4, glow);
    const skin = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: new THREE.Color('#ffb02a'), emissiveIntensity: baseGlow, roughness: mix(0.45, 0.85, slump) });
    const flesh = s.material(fleshHex, { roughness: 0.85, emissive: new THREE.Color('#ff8a28'), emissiveIntensity: mix(0.02, 1.2, glow * glow) });

    // ---- meshes ----
    const remapV = (mesh: THREE.Mesh, from: number, to: number) => {
      const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setY(i, from + uv.getY(i) * (to - from));
      uv.needsUpdate = true;
    };
    const body = s.surface((u, v, t) => shape(u, v * vCut, t), skin, { segments: [112, 44], wrap: true });
    remapV(body, 0, vCut);
    const innerWall = s.surface((u, v, t) => shape(u, 0.08 + v * (vCut - 0.08), t, slump, 0.9), flesh, { segments: [64, 18], wrap: true, flip: true });
    void innerWall;
    const edge = Array.from({ length: 96 }, (_, i) => shape(i / 96, vCut, new THREE.Vector3()).multiply(new THREE.Vector3(0.95, 1, 0.95)).toArray() as [number, number, number]);
    if (a.lid !== 'on') s.tube(edge, R * 0.03, flesh, true);

    const lid = new THREE.Group();
    const centre = edge.reduce((sum, p) => sum.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / edge.length);
    const lidTop = s.surface((u, v, t) => shape(u, vCut + v * (1 - vCut), t), skin, { segments: [112, 12], wrap: true });
    remapV(lidTop, vCut, 1);
    const lidUnder = s.surface((u, v, t) => { shape(u, vCut, t); t.lerp(centre, v); t.y -= 0.004; }, flesh, { segments: [64, 6], wrap: true, flip: true });
    const top = shape(0, 1, new THREE.Vector3());
    const stemMat = s.material(slump > 0.6 ? '#5a4a30' : a.shape === 'ghost' ? '#7b8a55' : '#6a6a2c', { roughness: 0.9 });
    const lean = (random() - 0.5) * 0.04;
    const stemH = 0.05 + random() * 0.04;
    const stem = s.tube([[top.x, top.y - 0.01, top.z], [top.x + lean * 0.3, top.y + stemH * 0.5, top.z], [top.x + lean + 0.012, top.y + stemH, top.z + lean * 0.4]], R * 0.09, stemMat);
    const stemBase = s.cylinder(R * 0.1, R * 0.15, 0.02, [top.x, top.y + 0.004, top.z], stemMat, 12);
    // Askew: hinged up off one side of the cut, one edge still resting on the rim.
    const side0 = random() < 0.5 ? -1 : 1;
    const hingeIndex = Math.round((side0 > 0 ? 0.75 : 0.25) * edge.length + (random() - 0.5) * 8) % edge.length;
    const pivot = a.lid === 'askew' ? new THREE.Vector3(...edge[hingeIndex]) : centre;
    for (const m of [lidTop, lidUnder, stem, stemBase]) { m.position.sub(pivot); lid.add(m); }
    s.root.add(lid);
    lid.position.copy(pivot);
    if (a.lid === 'on') {
      lid.position.y += 0.004; lid.rotation.y = (random() - 0.5) * 0.2;
    } else if (a.lid === 'askew') {
      const radial = new THREE.Vector3(pivot.x - centre.x, 0, pivot.z - centre.z).normalize();
      const axis = new THREE.Vector3(0, 1, 0).cross(radial).normalize();
      lid.quaternion.setFromAxisAngle(axis, 0.5 + random() * 0.35);
      lid.position.y += 0.006;
    } else {
      const side = random() < 0.5 ? -1 : 1;
      const low = edge.reduce((m, p) => Math.min(m, p[1]), 9);
      lid.position.set(side * (R * 1.75 + 0.03), centre.y - low + 0.006, R * 0.5);
      lid.rotation.set(0.05, random() * 6, side * 0.12);
    }

    // The candle, seen when the lid is off.
    const candleY = H * 0.05 + 0.01;
    const wax = s.material('#f1ead8', { roughness: 0.7 });
    s.cylinder(0.022, 0.024, 0.04, [0, candleY + 0.02, 0], wax, 14);
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffdf8a', emissive: '#ffb444', emissiveIntensity: mix(0.2, 3, glow), transparent: true, opacity: 0.9, depthWrite: false });
    const flame = s.mesh(new THREE.ConeGeometry(0.008, 0.028, 10), flameMat, [0, candleY + 0.056, 0]);
    flame.visible = glow > 0.15;
    flame.castShadow = false;

    // ---- the carving mess ----
    if (a.mess !== 'none') {
      const paper = document.createElement('canvas'); paper.width = 512; paper.height = 384;
      const p = paper.getContext('2d')!;
      p.fillStyle = '#e4e0d4'; p.fillRect(0, 0, 512, 384);
      p.fillStyle = '#2a2a2a'; p.fillRect(24, 20, 464, 34);
      p.fillStyle = '#8a8a86'; for (let col = 0; col < 4; col++) for (let row = 0; row < 36; row++) if (random() > 0.06) p.fillRect(24 + col * 118, 70 + row * 8.4, 104 - (row % 9 === 8 ? 40 : 0), 3);
      p.fillStyle = '#b0aca2'; p.fillRect(260, 90, 110, 80);
      const texture = new THREE.CanvasTexture(paper); texture.colorSpace = THREE.SRGBColorSpace;
      const sheet = s.mesh(new THREE.PlaneGeometry(R * 4.6, R * 3.4), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, side: THREE.DoubleSide }), [R * 0.4, 0.002, R * 0.35]);
      sheet.rotation.set(-Math.PI / 2, 0, (random() - 0.5) * 0.4);
      const pulp = s.material('#f0a040', { roughness: 0.6 });
      const pile = new THREE.Vector3(R * (random() < 0.5 ? -1.4 : 1.6), 0, R * 1.0);
      for (let i = 0; i < 9; i++) {
        const pts: [number, number, number][] = [];
        let x = pile.x + (random() - 0.5) * R * 0.6, z = pile.z + (random() - 0.5) * R * 0.5;
        for (let k = 0; k < 5; k++) { pts.push([x, 0.008 + random() * 0.02, z]); x += (random() - 0.5) * 0.05; z += (random() - 0.5) * 0.05; }
        s.tube(pts, 0.006, pulp);
      }
      s.ball([R * 0.45, R * 0.12, R * 0.35], [pile.x, 0.004, pile.z], pulp, 14);
      const seeds = Array.from({ length: 70 }, () => ({ at: [pile.x + (random() - 0.5) * R * 1.3, 0.01 + random() * 0.012, pile.z + (random() - 0.5) * R * 1.0] as [number, number, number], size: 1 }));
      const seed = new THREE.SphereGeometry(0.008, 8, 6); seed.scale(1, 0.3, 0.6);
      s.scatter(seed, s.material('#efe3bd', { roughness: 0.5 }), seeds);
      if (a.mess === 'tools') {
        const orange = s.material('#f07a12', { roughness: 0.5 }), steel = s.material('#c9ccd1', { metalness: 0.8, roughness: 0.3 });
        const tool = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.016, 0.022), orange);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.002, 0.012), steel);
        blade.position.x = 0.085; handle.castShadow = blade.castShadow = true;
        tool.add(handle, blade); tool.position.set(-R * 0.3, 0.01, R * 1.55); tool.rotation.y = 0.4 + random() * 0.5;
        s.root.add(tool);
        const spoon = s.ball([0.035, 0.012, 0.045], [R * 1.5, 0.012, -R * 0.2], steel, 16);
        void spoon;
        s.rod([R * 1.5, 0.014, -R * 0.2 - 0.04], [R * 1.5 + 0.03, 0.03, -R * 0.2 - 0.22], 0.007, steel);
      }
    }

    // One small warm light from the candle when it is really burning.
    let light: THREE.PointLight | null = null;
    const k = mix(0.65, 1.7, a.size);
    if (glow > 0.45) {
      light = new THREE.PointLight('#ff9a3c', 0, 2.2 * k, 2);
      light.position.set(0, H * 0.4, 0);
      s.root.add(light);
    }
    const lightBase = 0.6 * glow * k * k;

    // Scale the whole carving to its size.
    const all = new THREE.Group();
    all.add(...s.root.children);
    all.scale.setScalar(k);
    s.root.add(all);

    const flick = 0.05 + 0.32 * mood.energy, phase = random() * 10;
    const tick = (time: number) => {
      const f = 1 + flick * (Math.sin(time * 11.3 + phase) * 0.5 + Math.sin(time * 17.9 + phase * 2) * 0.3 + Math.sin(time * 4.1) * 0.2);
      skin.emissiveIntensity = baseGlow * f;
      flesh.emissiveIntensity = mix(0.02, 1.2, glow * glow) * f;
      flame.scale.set(1, f, 1);
      if (light) light.intensity = lightBase * f;
    };
    tick(0);
    return s.finish({ update: (_dt, time) => tick(time) });
  },
});
