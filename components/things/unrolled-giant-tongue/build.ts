import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, visibleBounds } from '@conjure/kit';

// Half the width of the tongue, in metres, at each scale.
const HALF_WIDTHS: Record<string, number> = { cosmic: 6, planetary: 6, landscape: 6, street: 2.2, room: 0.7, tabletop: 0.1, macro: 0.03 };
const COLUMNS = 24;

export default defineThing({
  questions: {
    source: choice('Where does the tongue come from?', {
      lips: 'Out of a great open mouth half buried in a dune: red lips and a row of teeth above it.',
      doorway: 'Out of the darkness of a free-standing doorway, over the step, like a carpet laid for a guest.',
      free: 'From nowhere. It simply lies there, the far end still rolled up like a carpet.',
    }),
    length: choice('How long is it?', {
      lap: 'A short lap, barely out of the mouth.',
      carpet: 'A long straight carpet.',
      snaking: 'Very long, snaking away in lazy curves.',
    }),
    surface: choice('What is its surface like?', {
      wet: 'Pink, wet and glossy, dotted with taste buds.',
      dry: 'Dry, pale and cracked like a riverbed, days without water.',
      rug: 'Patterned like a woven rug, with borders, medallions and a fringe at the tip.',
      forked: 'Dark red and forked at the tip, like a serpent.',
    }),
    carries: choice('What is lying on it?', {
      nothing: 'Nothing.',
      pill: 'A two-coloured capsule pill, waiting to be swallowed.',
      sweet: 'A wrapped boiled sweet.',
      footprints: 'A trail of tiny footprints and the small figure who made them.',
      stud: 'A steel stud piercing, a ball the size of a boulder.',
    }),
    doing: choice('What is it doing right now?', {
      lolling: 'Lolling: slack on the ground with its tip curled lazily up.',
      licking: 'Licking the ground: it humps up and presses its tip flat, drooling.',
      rain: 'Tasting rain: the tip is lifted to the sky and drops are falling on it.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const HW = (HALF_WIDTHS[context.scale] ?? 2.2) * mix(0.9, 1.1, random());
    const thick = 0.4 * HW;
    const forked = a.surface === 'forked';
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0], parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // The centreline: an optional carpet roll, a run along the ground, then the curl of the tip.
    const points: THREE.Vector3[] = [], sides: THREE.Vector3[] = [];
    const step = 0.09 * HW;
    const groundLength = { lap: 4.2, carpet: 10, snaking: 17 }[a.length] * HW * mix(0.9, 1.1, random());
    if (a.source === 'free') {
      const outer = 1.3 * HW, pitch = 0.073 * HW, turns = Math.PI * 2 * 1.6;
      for (let phi = turns; phi > 0; ) {
        const r = outer - pitch * phi;
        points.push(new THREE.Vector3(0, outer - r * Math.cos(phi), -r * Math.sin(phi)));
        sides.push(new THREE.Vector3(1, 0, 0));
        phi -= step / r;
      }
    }
    const rollCount = points.length;
    const amplitude = a.length === 'snaking' ? mix(0.55, 0.8, random()) : mix(0.03, 0.1, random());
    const cycles = a.length === 'snaking' ? mix(1.2, 1.7, random()) : 1, phase = random() * Math.PI * 2;
    const sourceLift = a.source === 'lips' ? 0.55 * HW : a.source === 'doorway' ? 0.16 * HW : 0;
    const humpAt = groundLength - 2.3 * HW, humpWidth = 1.5 * HW;
    const position = new THREE.Vector3(0, 0, a.source === 'lips' ? -0.7 * HW : a.source === 'doorway' ? -0.15 * HW : 0);
    const start = position.z;
    for (let s = 0; s <= groundLength; s += step) {
      const heading = amplitude * Math.sin(s / groundLength * Math.PI * 2 * cycles + phase) * Math.min(1, s / (2.5 * HW)) * Math.min(1, (groundLength - s) / (1.5 * HW));
      position.x += Math.sin(heading) * step;
      position.z += Math.cos(heading) * step;
      const along = position.z - start;
      let y = sourceLift * (along < 0.9 * HW ? 1 : Math.max(0, 0.5 + 0.5 * Math.cos(Math.min(1, (along - 0.9 * HW) / (1.3 * HW)) * Math.PI)));
      if (a.doing === 'licking' && Math.abs(s - humpAt) < humpWidth) y = Math.max(y, 0.75 * HW * Math.cos((s - humpAt) / humpWidth * Math.PI / 2) ** 2);
      points.push(new THREE.Vector3(position.x, y, position.z));
      sides.push(new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading)));
    }
    const groundEnd = points.length - 1;
    const curl = { lolling: { radius: 0.95 * HW, angle: forked ? 1.5 : mix(2.1, 2.8, random()) }, licking: { radius: 0, angle: 0 }, rain: { radius: 1.7 * HW, angle: mix(1.2, 1.45, random()) } }[a.doing];
    if (curl.radius > 0) {
      const from = points[groundEnd].clone();
      for (let theta = step / curl.radius; theta <= curl.angle; theta += step / curl.radius) {
        points.push(new THREE.Vector3(from.x, from.y + curl.radius * (1 - Math.cos(theta)), from.z + curl.radius * Math.sin(theta)));
        sides.push(new THREE.Vector3(1, 0, 0));
      }
    }
    const count = points.length;
    const lengths = [0];
    for (let i = 1; i < count; i++) lengths.push(lengths[i - 1] + points[i].distanceTo(points[i - 1]));
    const total = lengths[count - 1];
    const normals = points.map((_point, i) => points[Math.min(i + 1, count - 1)].clone().sub(points[Math.max(i - 1, 0)]).normalize().cross(sides[i]).normalize());

    // Width, thickness and the fork along the length.
    const tipLength = (forked ? 2.6 : 2.1) * HW;
    const rings = lengths.map((length) => {
      const d = Math.min(1, Math.max(0, 1 - (total - length) / tipLength));
      const narrowStart = a.source === 'lips' ? mix(0.8, 1, Math.min(1, length / (2 * HW))) : 1;
      const spread = a.doing === 'licking' ? 1 + 0.18 * Math.sin(Math.min(1, d * 1.4) * Math.PI) : 1;
      if (forked) return { w: HW * narrowStart * (1 - 0.3 * d) * (d > 0.7 ? Math.sqrt(Math.max(0.004, 1 - ((d - 0.7) / 0.3) ** 2)) : 1), h: thick * (1 - 0.5 * d), gap: d <= 0.3 ? 0 : 0.62 * ((d - 0.3) / 0.7) ** 0.7 };
      return { w: HW * narrowStart * spread * Math.sqrt(Math.max(0.004, 1 - d ** 2.4)), h: thick * (0.45 + 0.55 * Math.sqrt(1 - d * d)), gap: 0 };
    });
    const across = (j: number, gap: number) => {
      const half = COLUMNS / 2;
      if (j === half) return 0;
      return j < half ? -1 + (1 - gap) * j / (half - 1) : gap + (1 - gap) * (j - half - 1) / (half - 1);
    };
    const profile = (u: number, gap: number) => {
      if (gap < 0.001) return Math.sqrt(Math.max(0, 1 - u ** 4)) * (1 - 0.2 * Math.exp(-((u / 0.09) ** 2)));
      const v = (Math.abs(u) - (1 + gap) / 2) / ((1 - gap) / 2);
      return Math.abs(u) < gap ? 0 : Math.sqrt(Math.max(0, 1 - v ** 4));
    };
    const surfaceAt = (length: number, u: number, lift = 0) => {
      let i = 0;
      while (i < count - 1 && lengths[i] < length) i++;
      const ring = rings[i];
      return { at: points[i].clone().addScaledVector(sides[i], u * ring.w).addScaledVector(normals[i], ring.h * profile(u, ring.gap) + lift), normal: normals[i], side: sides[i], index: i };
    };

    const vertices: number[] = [], uvs: number[] = [], indices: number[] = [];
    const row = (COLUMNS + 1) * 2;
    for (let i = 0; i < count; i++) {
      const ring = rings[i], v = 1 - lengths[i] / total;
      for (let j = 0; j <= COLUMNS; j++) {
        const u = across(j, ring.gap);
        const top = points[i].clone().addScaledVector(sides[i], u * ring.w).addScaledVector(normals[i], ring.h * profile(u, ring.gap));
        vertices.push(top.x, top.y, top.z);
        uvs.push(u * 0.5 + 0.5, v);
      }
      for (let j = 0; j <= COLUMNS; j++) {
        const u = across(j, ring.gap);
        const under = points[i].clone().addScaledVector(sides[i], u * ring.w * 0.98);
        vertices.push(under.x, under.y, under.z);
        uvs.push(0.012, v);
      }
      if (i === count - 1) break;
      const split = rings[i + 1].gap > 0.001;
      for (let j = 0; j < COLUMNS; j++) {
        if (split && (j === COLUMNS / 2 - 1 || j === COLUMNS / 2)) continue;
        const p = i * row + j, q = p + row, below = COLUMNS + 1;
        indices.push(p, q, p + 1, p + 1, q, q + 1);
        indices.push(p + below, p + below + 1, q + below, p + below + 1, q + below + 1, q + below);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // The skin is painted in units of one tongue-width, so marks stay round whatever the length.
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = Math.min(4096, Math.round(160 * total / HW));
    const A = total / (2 * HW);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(canvas.width, 0, 0, canvas.height / A, 0, 0);
    const figureLength = lengths[rollCount] + (groundEnd - rollCount) * step * 0.62, figureY = figureLength / (2 * HW);
    const trail = (y: number) => 0.5 + 0.17 * Math.sin(y * 1.7 + phase);
    const grey = new THREE.Color('#9a8f88');
    const tone = (hex: string) => '#' + new THREE.Color(hex).lerp(grey, (1 - mood.cheer) * 0.22 + mood.wear * 0.12).getHexString();
    if (a.surface === 'rug') {
      ctx.fillStyle = tone('#8a1c22');
      ctx.fillRect(0, 0, 1, A);
      for (const [x, width, colour] of [[0.045, 0.06, '#d4a84a'], [0.105, 0.03, '#1d2a4a'], [0.135, 0.012, '#efe2c0']] as const) {
        ctx.fillStyle = tone(colour);
        ctx.fillRect(x, 0, width, A);
        ctx.fillRect(1 - x - width, 0, width, A);
      }
      for (let y = 0.5; y < A - 0.5; y += 1) {
        const diamond = (size: number, colour: string, cx = 0.5, cy = y) => { ctx.fillStyle = tone(colour); ctx.beginPath(); ctx.moveTo(cx, cy - size * 1.3); ctx.lineTo(cx + size, cy); ctx.lineTo(cx, cy + size * 1.3); ctx.lineTo(cx - size, cy); ctx.fill(); };
        diamond(0.24, '#d4a84a'); diamond(0.2, '#1d2a4a'); diamond(0.12, '#efe2c0'); diamond(0.06, '#8a1c22');
        for (const x of [0.22, 0.78]) { diamond(0.05, '#d4a84a', x, y + 0.5); diamond(0.025, '#1d2a4a', x, y + 0.5); }
      }
      ctx.fillStyle = '#efe2c0';
      for (let x = 0.01; x < 1; x += 0.04) ctx.fillRect(x, A - 0.3, 0.018, 0.3);
    } else {
      const dry = a.surface === 'dry';
      const [edge, middle, bud, groove] = dry ? ['#8f5a4e', '#bd7f70', '#dbb3a2', '#4f2620'] : forked ? ['#6e1426', '#b0283c', '#d85a66', '#4a0b18'] : ['#b93e55', '#e86b7a', '#f6a3aa', '#a02c46'];
      const wash = ctx.createLinearGradient(0, 0, 1, 0);
      wash.addColorStop(0, tone(edge)); wash.addColorStop(0.2, tone(middle)); wash.addColorStop(0.8, tone(middle)); wash.addColorStop(1, tone(edge));
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, 1, A);
      ctx.fillStyle = tone(bud);
      for (let i = 0; i < 520 * A; i++) { ctx.globalAlpha = 0.3 + random() * 0.45; ctx.beginPath(); ctx.arc(0.05 + random() * 0.9, random() * A, 0.005 + random() * 0.009, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 0.9;
      const back = lengths[rollCount] / (2 * HW) + 0.75;
      for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(0.5 + i * 0.085, back - Math.abs(i) * 0.07, 0.03, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 0.7; ctx.strokeStyle = tone(groove); ctx.lineWidth = 0.022; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0.5, back + 0.25); ctx.lineTo(0.5, A - 0.5); ctx.stroke();
      if (dry || mood.wear > 0.55) {
        ctx.strokeStyle = tone(groove);
        for (let i = 0; i < (dry ? 26 : 8) * A; i++) {
          let x = random(), y = random() * A;
          ctx.globalAlpha = 0.5 + random() * 0.4; ctx.lineWidth = 0.005 + random() * 0.01; ctx.beginPath(); ctx.moveTo(x, y);
          for (let k = 0; k < 3 + random() * 5; k++) { x += (random() - 0.5) * 0.16; y += (random() - 0.5) * 0.16; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = '#efe6da';
        for (let i = 0; i < 5 * A; i++) { ctx.globalAlpha = 0.2 + random() * 0.2; ctx.beginPath(); ctx.ellipse(random(), random() * A, 0.05 + random() * 0.1, 0.04 + random() * 0.08, random() * 3, 0, Math.PI * 2); ctx.fill(); }
      }
    }
    if (a.carries === 'footprints') {
      ctx.globalAlpha = 0.85; ctx.fillStyle = a.surface === 'rug' ? '#e9d9b0' : '#5a1a2a';
      const first = lengths[rollCount] / (2 * HW) + 0.5;
      for (let y = first, k = 0; y < figureY - 0.04; y += 0.085, k++) {
        const x = trail(y) + (k % 2 ? 0.035 : -0.035);
        ctx.beginPath(); ctx.ellipse(x, y, 0.02, 0.034, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y - 0.045, 0.013, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const wetness = a.surface === 'wet' || forked ? mix(1, 0.5, mood.wear) : 0;
    const flesh = new THREE.MeshPhysicalMaterial({ map, side: THREE.DoubleSide, roughness: a.surface === 'rug' ? 1 : mix(0.95, 0.28, wetness), clearcoat: wetness, clearcoatRoughness: 0.15 });
    const tongue = add(geometry, flesh);

    // Where it comes from.
    const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9c59a').lerp(new THREE.Color('#b9ad9a'), 1 - mood.warmth), roughness: 1 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1c080d', roughness: 1 });
    if (a.source === 'lips') {
      const lipColour = new THREE.Color(forked ? '#5c8a4a' : '#c3212f').lerp(grey, (1 - mood.cheer) * 0.3 + mood.wear * 0.2);
      const lip = new THREE.MeshPhysicalMaterial({ color: lipColour, roughness: mix(0.3, 0.8, mood.wear), clearcoat: 1 - mood.wear });
      const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f4eee0').lerp(new THREE.Color('#b9a56a'), mood.wear * 0.7), roughness: 0.35 });
      const archY = (x: number) => { const k = Math.min(1, Math.abs(x) / (1.75 * HW)); return 1.95 * HW * Math.sqrt(1 - k * k) ** 0.8 - 0.2 * HW * Math.exp(-((x / (0.3 * HW)) ** 2)); };
      const arch = Array.from({ length: 25 }, (_unused, i) => { const x = Math.cos(Math.PI * i / 24) * 1.75 * HW; return new THREE.Vector3(x, archY(x), -0.2 * HW + 0.25 * HW * (1 - (x / (1.75 * HW)) ** 2)); });
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arch), 64, 0.36 * HW, 12), lip).scale.z = 1.25;
      const lower = Array.from({ length: 9 }, (_unused, i) => { const k = i / 4 - 1; return new THREE.Vector3(k * 1.8 * HW, -0.1 * HW * k * k - 0.02 * HW, 0.05 * HW + 0.3 * HW * (1 - k * k)); });
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lower), 40, 0.4 * HW, 12), lip);
      const missing = mood.wear > 0.6 ? Math.floor(random() * 8) : -1;
      for (let i = 0; i < 8; i++) {
        if (i === missing) continue;
        const x = (i - 3.5) * 0.34 * HW, long = (Math.abs(i - 3.5) < 1 ? 0.44 : Math.abs(i - 3.5) < 2 ? 0.36 : forked ? 0.62 : 0.4) * HW;
        const tooth = add(new THREE.CapsuleGeometry(0.15 * HW, long, 4, 10), enamel, [x, archY(x) - 0.3 * HW - long / 2, -0.12 * HW]);
        tooth.scale.set(1, 1, 0.6);
        tooth.rotation.z = (random() - 0.5) * 0.12 * (0.3 + mood.wear);
      }
      for (const x of [-1.22, -0.98, 0.98, 1.22]) add(new THREE.CapsuleGeometry(0.11 * HW, 0.2 * HW, 4, 8), enamel, [x * HW, 0.42 * HW, 0.02 * HW]).scale.z = 0.6;
      add(new THREE.SphereGeometry(1, 28, 16), dark, [0, 0.2 * HW, -0.8 * HW]).scale.set(1.6 * HW, 1.65 * HW, 0.6 * HW);
      add(new THREE.SphereGeometry(1, 36, 18), sand, [0, 0, -1.9 * HW]).scale.set(3 * HW, 2.5 * HW, 1.55 * HW);
      for (const x of [-1, 1]) add(new THREE.SphereGeometry(1, 20, 10), sand, [x * 2.2 * HW, 0, 0.1 * HW]).scale.set(0.9 * HW, 0.42 * HW, 0.8 * HW);
    }
    if (a.source === 'doorway') {
      const plaster = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.55, 0.08, mood.warmth), 0.25, mix(0.8, 0.6, mood.wear)), roughness: 0.9 });
      const wood = new THREE.MeshStandardMaterial({ color: new THREE.Color(mood.cheer > 0.5 ? '#2e7a6a' : '#5a3a26').lerp(grey, mood.wear * 0.4), roughness: 0.7 });
      const inner = 1.25 * HW, tall = 3.7 * HW, post = 0.32 * HW;
      for (const x of [-1, 1]) add(new THREE.BoxGeometry(post, tall, 0.5 * HW), plaster, [x * (inner + post / 2), tall / 2, -0.25 * HW]);
      add(new THREE.BoxGeometry(inner * 2 + post * 2.6, post, 0.6 * HW), plaster, [0, tall + post / 2, -0.25 * HW]);
      const pediment = add(new THREE.CylinderGeometry(0.02 * HW, (inner + post) * 1.1, 0.7 * HW, 4), plaster, [0, tall + post + 0.35 * HW, -0.25 * HW]);
      pediment.rotation.y = Math.PI / 4; pediment.scale.z = 0.28;
      add(new THREE.BoxGeometry(inner * 2, tall, 0.06 * HW), dark, [0, tall / 2, -0.3 * HW]);
      add(new THREE.BoxGeometry(inner * 2 + post * 3, 0.16 * HW, 1.1 * HW), plaster, [0, 0.08 * HW, -0.1 * HW]);
      const hinge = new THREE.Group();
      hinge.position.set(-inner, 0.16 * HW, 0);
      hinge.rotation.y = -mix(1.2, 2.2, random());
      root.add(hinge);
      add(new THREE.BoxGeometry(inner * 2, tall - 0.16 * HW, 0.1 * HW), wood, [inner, (tall - 0.16 * HW) / 2, 0], hinge);
      for (const y of [0.3, 0.72]) add(new THREE.BoxGeometry(inner * 1.5, tall * 0.3, 0.13 * HW), wood, [inner, tall * y, 0], hinge);
      add(new THREE.SphereGeometry(0.09 * HW, 10, 8), new THREE.MeshStandardMaterial({ color: '#d8b24a', metalness: 0.8, roughness: 0.3 }), [inner * 1.8, tall * 0.48, -0.12 * HW], hinge);
    }

    // What lies on it.
    const spot = surfaceAt(figureLength, a.carries === 'footprints' ? (trail(figureY) - 0.5) * 2 : 0);
    const prop = new THREE.Group();
    prop.position.copy(spot.at);
    root.add(prop);
    const turn = (random() - 0.5) * 0.8;
    if (a.carries === 'stud') {
      const steel = new THREE.MeshStandardMaterial({ color: '#d9dde2', metalness: 1, roughness: 0.18 });
      add(new THREE.SphereGeometry(0.36 * HW, 28, 18), steel, [0, 0.22 * HW, 0], prop);
      add(new THREE.CylinderGeometry(0.2 * HW, 0.26 * HW, 0.08 * HW, 20), steel, [0, 0, 0], prop);
    }
    if (a.carries === 'pill') {
      const r = 0.24 * HW, halfLong = 0.42 * HW;
      prop.rotation.y = Math.PI / 2 + turn;
      for (const [sign, colour] of [[-1, '#f3efe6'], [1, mood.cheer > 0.5 ? '#f2c230' : '#2b6fc2']] as const) {
        const shell = new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.2, clearcoat: 1 });
        add(new THREE.CylinderGeometry(r, r, halfLong, 20), shell, [0, r * 0.9, sign * halfLong / 2], prop).rotation.x = Math.PI / 2;
        add(new THREE.SphereGeometry(r, 20, 14), shell, [0, r * 0.9, sign * halfLong], prop);
      }
    }
    if (a.carries === 'sweet') {
      const hue = random();
      const wrap = new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setHSL(hue, 0.8, 0.55), roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide });
      const stripe = new THREE.MeshPhysicalMaterial({ color: '#fff6e8', roughness: 0.15, clearcoat: 1 });
      prop.rotation.y = turn + 0.6;
      add(new THREE.SphereGeometry(0.3 * HW, 24, 16), wrap, [0, 0.26 * HW, 0], prop).scale.set(1.25, 0.85, 1);
      for (const k of [-1, 0, 1]) add(new THREE.TorusGeometry(0.262 * HW * Math.sqrt(1 - (k * 0.5) ** 2), 0.022 * HW, 6, 24), stripe, [k * 0.19 * HW, 0.26 * HW, 0], prop).rotation.set(0, Math.PI / 2, 0);
      for (const x of [-1, 1]) {
        const twist = add(new THREE.ConeGeometry(0.24 * HW, 0.4 * HW, 9, 1, true), wrap, [x * 0.56 * HW, 0.26 * HW, 0], prop);
        twist.rotation.z = x * Math.PI / 2;
      }
    }
    if (a.carries === 'footprints') {
      const coat = new THREE.MeshStandardMaterial({ color: '#23262e', roughness: 0.9 });
      add(new THREE.CylinderGeometry(0.035 * HW, 0.06 * HW, 0.2 * HW, 8), coat, [0, 0.1 * HW, 0], prop);
      add(new THREE.SphereGeometry(0.04 * HW, 10, 8), new THREE.MeshStandardMaterial({ color: '#d9b08f', roughness: 0.8 }), [0, 0.235 * HW, 0], prop);
      add(new THREE.CylinderGeometry(0.07 * HW, 0.07 * HW, 0.012 * HW, 12), coat, [0, 0.27 * HW, 0], prop);
      add(new THREE.CylinderGeometry(0.04 * HW, 0.04 * HW, 0.05 * HW, 10), coat, [0, 0.29 * HW, 0], prop);
    }

    // Spit, rain and drifted sand.
    const tip = points[count - 1], water = new THREE.MeshPhysicalMaterial({ color: '#bfe1f2', roughness: 0.05, clearcoat: 1, emissive: '#3d7fa6', emissiveIntensity: 0.3 });
    if (a.doing === 'licking') {
      for (let i = 0; i < 5; i++) {
        const at = surfaceAt(total - random() * 2 * HW, (random() < 0.5 ? -1 : 1) * 1.04).at;
        add(new THREE.SphereGeometry(1, 14, 8), water, [at.x, 0.01 * HW, at.z]).scale.set((0.12 + random() * 0.22) * HW, 0.03 * HW, (0.12 + random() * 0.22) * HW);
      }
      add(new THREE.SphereGeometry(1, 16, 8), water, [tip.x, 0.01 * HW, tip.z + 0.25 * HW]).scale.set(0.7 * HW, 0.035 * HW, 0.4 * HW);
    }
    const drops: { x: number; z: number; y: number; speed: number }[] = [];
    let rain: THREE.InstancedMesh | null = null;
    const ceiling = tip.y + 2.6 * HW, matrix = new THREE.Matrix4();
    if (a.doing === 'rain') {
      const number = Math.round(mix(14, 44, mood.density));
      rain = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), water, number);
      rain.castShadow = true;
      for (let i = 0; i < number; i++) { const angle = random() * Math.PI * 2, reach = Math.sqrt(random()) * 1.6 * HW; drops.push({ x: tip.x + Math.cos(angle) * reach, z: tip.z - 0.8 * HW + Math.sin(angle) * reach, y: random(), speed: 0.5 + random() * 0.5 }); }
      root.add(rain);
      for (let i = 0; i < 4; i++) { const at = surfaceAt(total - (0.4 + random() * 2.2) * HW, (random() - 0.5) * 1.2, 0.01 * HW).at; add(new THREE.SphereGeometry(1, 12, 8), water, [at.x, at.y, at.z]).scale.setScalar((0.06 + random() * 0.08) * HW); }
    }
    const fall = (time: number) => {
      if (!rain) return;
      drops.forEach((drop, i) => {
        const y = ceiling - ((drop.y + time * drop.speed * mix(0.25, 1.1, mood.energy)) % 1) * (ceiling - 0.3 * HW);
        matrix.makeScale(0.06 * HW, 0.2 * HW, 0.06 * HW).setPosition(drop.x, y, drop.z);
        rain!.setMatrixAt(i, matrix);
      });
      rain.instanceMatrix.needsUpdate = true;
    };
    fall(0);
    const drifts = Math.round(mix(0, 7, mood.wear * 0.6 + mood.density * 0.4));
    for (let i = 0; i < drifts; i++) {
      const at = surfaceAt(lengths[rollCount] + (0.15 + random() * 0.7) * groundLength, (random() < 0.5 ? -1 : 1) * 1.02).at;
      add(new THREE.SphereGeometry(1, 16, 8), sand, [at.x, 0, at.z]).scale.set((0.5 + random() * 0.6) * HW, (0.12 + random() * 0.16) * HW, (0.6 + random() * 0.9) * HW);
    }

    const bounds = visibleBounds(root), centre = bounds.getCenter(new THREE.Vector3());
    const body = new THREE.Group();
    body.add(root);
    root.position.set(-centre.x, 0, -centre.z);
    const breath = mix(0.2, 1.6, mood.energy), beat = random() * 6;
    return {
      object: body,
      update(_dt, time) {
        tongue.scale.y = 1 + Math.sin(time * breath + beat) * 0.035;
        fall(time);
      },
      dispose() { map.dispose(); disposeTree(body); },
    };
  },
});
