import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { paint } from './helpers';

const TAU = Math.PI * 2;
type P3 = [number, number, number];
const HOUR = {
  golden: { sky: '#ecd3ae', hemi: 1.0, key: 1.0, glow: 0.75, hemiSky: '#fff1dc' },
  dusk: { sky: '#a5a2ca', hemi: 0.8, key: 0.5, glow: 1.0, hemiSky: '#d9d6ff' },
  night: { sky: '#767daa', hemi: 0.62, key: 0.3, glow: 1.25, hemiSky: '#b9c2f2' },
  dawn: { sky: '#dacdd3', hemi: 0.95, key: 0.7, glow: 0.5, hemiSky: '#f6e9ee' },
} as const;
const LANTERNS = {
  white: ['#fffaf0', '#f6efe0', '#fff6e6'],
  pastel: ['#f8cdd6', '#cfe6f2', '#dcf0cf', '#fdebb6', '#fffaf0'],
  fiesta: ['#ff5c8a', '#ff9a2e', '#ffd21f', '#19b5a5', '#8a4fd0'],
  redgold: ['#d8262c', '#e8b23a', '#d8262c', '#fff1c9'],
} as const;

export default defineWorld({
  questions: {
    moment: choice('What point of the wedding day is it in here?', {
      waiting: 'Before anyone arrives: tables laid, chairs tucked in, everything perfect and untouched.',
      speeches: 'The speeches: every chair turned toward the middle, glasses charged.',
      dancing: 'The party in full swing: jackets on chair backs, balloons, confetti on the dance floor.',
      lull: 'The lull after everyone has gone: chairs askew, streamers and empties, a child asleep under a table, the lights still on.',
      strike: 'The morning after: bulbs off, cloths stripped, chairs stacked, a strand of lights unhooked and trailing.',
    }),
    hour: choice('What is the light outside?', {
      golden: 'Late golden hour, warm and still bright.',
      dusk: 'Lavender dusk, the bulbs just beginning to matter.',
      night: 'Deep blue night; the tent is a lit box in the dark.',
      dawn: 'Pale grey-pink dawn.',
    }),
    sides: choice('How are the sides of the marquee?', {
      open: 'Rolled up and tied back all round, open to the garden.',
      windows: 'Walled with clear arched Georgian windows.',
      mixed: 'Some bays open, some windowed.',
      closed: 'Closed up against the weather, plain pleated walls.',
    }),
    lining: choice('What is the roof lined with?', {
      pleated: 'Pleated ivory lining, the classic.',
      blush: 'Ivory and blush-pink pleats in broad bands.',
      starcloth: 'Black starcloth pricked with tiny lights.',
      bare: 'No lining: bare canvas and the aluminium frame.',
    }),
    lanterns: choice('What colour are the paper lanterns?', {
      white: 'All white and cream.',
      pastel: 'Soft pastels.',
      fiesta: 'Hot fiesta brights.',
      redgold: 'Red and gold.',
    }),
    floor: choice('What is underfoot around the dance floor?', {
      coir: 'Coir matting.',
      boards: 'Wooden boarding.',
      carpet: 'Charcoal carpet.',
      grass: 'Bare lawn, trampled.',
    }),
    garden: choice('What is outside?', {
      hedges: 'Clipped yew hedges and topiary.',
      orchard: 'Old apple trees hung with lanterns.',
      roses: 'A brick garden wall covered in climbing roses.',
      fields: 'A post-and-rail fence and open fields with hay bales.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const pick = <V,>(list: readonly V[]) => list[Math.floor(random() * list.length)];
    const hour = HOUR[a.hour];
    const sky = new THREE.Color(hour.sky).lerp(new THREE.Color('#f3e2c4'), (0.5 - Math.abs(mood.daylight - 0.5)) * 0.25);
    const W = 13.6, D = 12, X0 = -5.7, X1 = 5.7, KX = 2.85, ZB = -4.8, ZF = 5.2, E = 2.4, ZR = 0.2, R = E + 0.84 * (ZR - ZB);
    const lawn = new THREE.Color('#6f9058').lerp(sky, 0.28);
    const { art: s, world } = diorama(context, {
      background: `#${sky.getHexString()}`, floor: `#${lawn.getHexString()}`, width: W, depth: D, yaw: 28, pitch: 24, maxHeight: 3.2, radius: 1.5,
      slots: [[0, 0.7, 0.06], [-3.95, -2.9, 0.03], [3.95, -2.9, 0.03], [-4.0, 3.2, 0.03], [4.0, 3.2, 0.03], [0, -3.5, 0.03]],
    });
    const off = a.moment === 'strike';
    const glow = off ? 0 : hour.glow * mix(0.75, 1.15, mood.cheer);
    for (const light of s.root.children) {
      if ((light as THREE.HemisphereLight).isHemisphereLight) { (light as THREE.HemisphereLight).intensity *= hour.hemi; (light as THREE.HemisphereLight).color.set(hour.hemiSky); }
      else if ((light as THREE.DirectionalLight).isDirectionalLight) (light as THREE.DirectionalLight).intensity *= light === world.keyLight ? hour.key : hour.hemi;
    }
    const warm = new THREE.Color().setHSL(mix(0.13, 0.075, mood.warmth), 0.95, 0.62);
    const lamp = new THREE.PointLight(warm, 1.15 * glow, 0, 0);
    lamp.position.set(0, 4.3, 1.4);
    s.root.add(lamp);

    // Batched parts.
    const bulbMat = new THREE.MeshStandardMaterial({ color: off ? '#d9d2bf' : '#fff3cf', emissive: warm, emissiveIntensity: 2.4 * glow, roughness: 0.4 });
    const GEO: Record<string, () => THREE.BufferGeometry> = {
      box: () => new THREE.BoxGeometry(1, 1, 1),
      cyl: () => new THREE.CylinderGeometry(1, 1, 1, 14),
      skirt: () => new THREE.CylinderGeometry(0.82, 1, 1, 28, 1, true),
      cone: () => new THREE.ConeGeometry(1, 1, 10),
      ball: () => new THREE.SphereGeometry(1, 12, 8),
      bloom: () => new THREE.IcosahedronGeometry(1, 1),
      bulb: () => new THREE.SphereGeometry(1, 6, 5),
    };
    const MAT: Record<string, () => THREE.Material> = {
      matte: () => new THREE.MeshStandardMaterial({ roughness: 0.8 + mood.wear * 0.15 }),
      cloth: () => new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }),
      metal: () => new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.8 }),
      glass: () => new THREE.MeshStandardMaterial({ color: '#e6f2f6', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }),
      bulb: () => bulbMat,
    };
    const batches = new Map<string, { geo: string; mat: string; m: THREE.Matrix4[]; c: THREE.Color[] }>();
    const put = (geo: string, mat: string, m: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff') => {
      const key = `${geo}|${mat}`;
      if (!batches.has(key)) batches.set(key, { geo, mat, m: [], c: [] });
      const b = batches.get(key)!; b.m.push(m); b.c.push(new THREE.Color(color));
    };
    const M = (p: P3, sc: P3 | number = 1, r: P3 = [0, 0, 0]) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), typeof sc === 'number' ? new THREE.Vector3(sc, sc, sc) : new THREE.Vector3(...sc));
    const I = new THREE.Matrix4();
    const on = (parent: THREE.Matrix4, local: THREE.Matrix4) => parent.clone().multiply(local);
    const box = (parent: THREE.Matrix4, mat: string, size: P3, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('box', mat, on(parent, M(p, size, r)), color);
    const cyl = (parent: THREE.Matrix4, mat: string, radius: number, h: number, p: P3, color: THREE.ColorRepresentation, r: P3 = [0, 0, 0]) => put('cyl', mat, on(parent, M(p, [radius, h, radius], r)), color);
    const ball = (parent: THREE.Matrix4, mat: string, size: P3 | number, p: P3, color: THREE.ColorRepresentation) => put('ball', mat, on(parent, M(p, size)), color);
    const span = (mat: string, from: P3, to: P3, radius: number, color: THREE.ColorRepresentation) => {
      const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to), dir = vb.clone().sub(va);
      put('cyl', mat, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), new THREE.Vector3(radius, dir.length(), radius)), color);
    };

    // Floors.
    const ivory = '#f3ecdc';
    if (a.floor !== 'grass') {
      const tex = paint(256, 256, (ctx, w, h) => {
        const base = { coir: '#b79a68', boards: '#a47c4c', carpet: '#5d6068' }[a.floor as 'coir' | 'boards' | 'carpet'];
        ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
        if (a.floor === 'coir') for (let k = 0; k < 64; k++) { ctx.fillStyle = k % 2 ? 'rgba(90,60,30,0.16)' : 'rgba(255,240,200,0.12)'; ctx.fillRect(0, k * 4, w, 2); }
        if (a.floor === 'boards') for (let k = 0; k < 8; k++) { ctx.fillStyle = `rgba(${k % 2 ? '60,35,15' : '255,230,190'},0.14)`; ctx.fillRect(0, k * 32, w, 30); ctx.fillStyle = 'rgba(40,25,10,0.5)'; ctx.fillRect(0, k * 32 + 30, w, 2); ctx.fillRect((k * 97) % w, k * 32, 2, 30); }
        for (let k = 0; k < mood.wear * 60; k++) { ctx.fillStyle = 'rgba(60,50,35,0.14)'; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 6 + random() * 22, 4 + random() * 10, random() * 3, 0, TAU); ctx.fill(); }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(7, 5);
      s.box([W / 2 - X0, 0.03, ZF - ZB], [(W / 2 + X0) / 2, 0.015, (ZF + ZB) / 2], new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
    } else for (let k = 0; k < 40; k++) cyl(I, 'matte', 0.3 + random() * 0.5, 0.004, [mix(X0, W / 2, random()), 0.002, mix(ZB, ZF, random())], lawn.clone().offsetHSL(0, -0.1, -0.06 - random() * 0.05));
    const DF = 4.4, dz = 0.5;
    const parquet = paint(512, 512, (ctx, w) => {
      const q = w / 20;
      for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) for (let k = 0; k < 4; k++) {
        const c = new THREE.Color('#c58f4e'); c.offsetHSL(0, 0, (random() - 0.5) * 0.14); ctx.fillStyle = `#${c.getHexString()}`;
        if ((i + j) % 2) ctx.fillRect(i * q + k * q / 4, j * q, q / 4 - 1, q - 1); else ctx.fillRect(i * q, j * q + k * q / 4, q - 1, q / 4 - 1);
      }
      ctx.strokeStyle = 'rgba(40,28,18,0.55)'; ctx.lineWidth = 3;
      for (let i = 0; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(i * w / 5, 0); ctx.lineTo(i * w / 5, w); ctx.moveTo(0, i * w / 5); ctx.lineTo(w, i * w / 5); ctx.stroke(); }
    });
    const edge = s.material('#3a3026');
    const dance = s.box([DF, 0.06, DF], [0, 0.03, dz], edge);
    dance.material = [edge, edge, new THREE.MeshStandardMaterial({ map: parquet, roughness: mix(0.25, 0.6, mood.wear) }), edge, edge, edge] as unknown as THREE.Material;
    for (const [x, z, w, d] of [[0, dz + DF / 2 + 0.05, DF + 0.2, 0.1], [0, dz - DF / 2 - 0.05, DF + 0.2, 0.1], [DF / 2 + 0.05, dz, 0.1, DF], [-DF / 2 - 0.05, dz, 0.1, DF]] as const) box(I, 'metal', [w, 0.035, d], [x, 0.02, z], '#b9bdc0');

    if (!off) {
      const pool = s.cylinder(2.3, 2.3, 0.004, [0, 0.064, 0.7], new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 0.5 * glow, transparent: true, opacity: 0.16, depthWrite: false }), 40);
      pool.castShadow = pool.receiveShadow = false;
    }

    // Frame: poles, ridge, roof lining, gable.
    const pole = '#f1ede2';
    const backX = [X0, -KX, 0, KX, X1], leftZ = [ZB, -1.5, 1.9, ZF], kings: [number, number][] = [[-KX, ZR], [KX, ZR]];
    for (const x of backX) cyl(I, 'matte', 0.05, E, [x, E / 2, ZB], pole);
    for (const z of leftZ.slice(1)) cyl(I, 'matte', 0.05, E, [X0, E / 2, z], pole);
    for (const [x, z] of kings) { cyl(I, 'matte', 0.075, R, [x, R / 2, z], '#e6dfcd'); cyl(I, 'matte', 0.2, 0.06, [x, 0.03, z], '#d9d2bf'); ball(I, 'metal', 0.1, [x, R + 0.06, z], '#d4ae52'); }
    span('matte', [X0, R, ZR], [X1, R, ZR], 0.045, '#e6dfcd');
    span('matte', [X0, E, ZB], [X1, E, ZB], 0.04, pole);
    span('matte', [X0, E, ZB], [X0, E, ZF], 0.04, pole);
    const slopeLen = Math.hypot(R - E, ZR - ZB), alpha = Math.atan2(R - E, ZR - ZB);
    const pleated = (width: number, height: number, pitch: number, depth: number) => {
      const n = Math.max(2, Math.round(width / pitch) * 2);
      const geo = new THREE.PlaneGeometry(width, height, n, 1);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const col = Math.round((p.getX(k) / width + 0.5) * n); p.setZ(k, col % 2 ? depth : 0); }
      geo.computeVertexNormals();
      return geo;
    };
    const liningTex = paint(256, 16, (ctx, w, h) => {
      if (a.lining === 'starcloth') { ctx.fillStyle = '#1b2240'; ctx.fillRect(0, 0, w, h); return; }
      if (a.lining === 'bare') { ctx.fillStyle = '#e4dcc8'; ctx.fillRect(0, 0, w, h); return; }
      for (let k = 0; k < 8; k++) { ctx.fillStyle = a.lining === 'blush' && k % 2 ? '#eec3c6' : k % 2 ? '#f2ead8' : '#f8f3e6'; ctx.fillRect(k * 32, 0, 32, h); }
    });
    const liningMat = new THREE.MeshStandardMaterial({ map: liningTex, side: THREE.DoubleSide, roughness: 0.9 });
    const roof = s.mesh(pleated(X1 - X0, slopeLen, a.lining === 'bare' ? KX : 0.42, a.lining === 'bare' ? 0.02 : 0.1), liningMat, [0, (E + R) / 2, (ZB + ZR) / 2]);
    roof.rotation.x = Math.PI / 2 - alpha;
    roof.castShadow = false;
    const up: P3 = [0, Math.sin(alpha), Math.cos(alpha)], nrm: P3 = [0, -Math.cos(alpha), Math.sin(alpha)];
    const onRoof = (x: number, t: number, drop = 0): P3 => [x, E + up[1] * t * slopeLen + nrm[1] * drop, ZB + up[2] * t * slopeLen + nrm[2] * drop];
    if (a.lining === 'bare') {
      for (const x of backX) span('metal', onRoof(x, 0, 0.08), onRoof(x, 1, 0.08), 0.045, '#c2c6c9');
      for (const t of [0.33, 0.66]) span('metal', onRoof(X0, t, 0.08), onRoof(X1, t, 0.08), 0.03, '#c2c6c9');
    }
    if (a.lining === 'starcloth') for (let k = 0; k < 260; k++) put('bulb', 'bulb', M(onRoof(mix(X0 + 0.2, X1 - 0.2, random()), 0.03 + random() * 0.94, 0.14), 0.02 + random() * 0.018));
    const gable = new THREE.BufferGeometry();
    gable.setAttribute('position', new THREE.Float32BufferAttribute([X0, E, ZB, X0, E, ZF, X0, R, ZR], 3));
    gable.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    gable.computeVertexNormals();
    s.mesh(gable, new THREE.MeshStandardMaterial({ color: a.lining === 'starcloth' ? '#232a4a' : ivory, side: THREE.DoubleSide, roughness: 0.9 })).castShadow = false;
    for (const z of [-2.3, 0.2, 2.7]) span('matte', [X0 + 0.03, E, z], [X0 + 0.03, E + (R - E) * (1 - Math.abs(z - ZR) / 5), z], 0.02, '#e2dac6');
    span('matte', [X0, E, ZF], [X0, R, ZR], 0.04, pole);
    // Scalloped valance.
    for (let x = X0 + 0.2; x < X1; x += 0.4) ball(I, 'cloth', [0.2, 0.16, 0.02], [x, E - 0.02, ZB + 0.06], a.lining === 'blush' ? '#eec3c6' : ivory);
    for (let z = ZB + 0.2; z < ZF; z += 0.4) ball(I, 'cloth', [0.02, 0.16, 0.2], [X0 + 0.06, E - 0.02, z], a.lining === 'blush' ? '#eec3c6' : ivory);

    // Walls, bay by bay.
    const wallMat = new THREE.MeshStandardMaterial({ color: ivory, side: THREE.DoubleSide, roughness: 0.9 });
    const paneMat = new THREE.MeshStandardMaterial({ color: sky.clone().lerp(new THREE.Color('#ffffff'), 0.25), emissive: sky, emissiveIntensity: 0.35, roughness: 0.15, side: THREE.DoubleSide });
    const sway: THREE.Object3D[] = [];
    const bay = (kind: 'open' | 'window' | 'wall', from: P3, length: number, ry: number) => {
      const g = new THREE.Group();
      g.position.set(...from); g.rotation.y = ry;
      const add = <T extends THREE.Object3D>(node: T) => { g.add(node); return node; };
      if (kind === 'open') {
        for (const e of [0, 1]) {
          const tie = add(s.lathe([[0.2, 0], [0.16, 0.5], [0.07, 0.95], [0.15, 1.5], [0.28, E - 0.25], [0.1, E - 0.05]], wallMat, [e ? length - 0.2 : 0.2, 0, 0.05]));
          tie.scale.z = 0.5;
          add(s.ring(0.085, 0.02, [e ? length - 0.2 : 0.2, 0.95, 0.05], s.material('#d4ae52'))).rotation.x = Math.PI / 2;
        }
        add(s.box([length, 0.3, 0.03], [length / 2, E - 0.15, 0], wallMat));
      } else {
        add(s.mesh(pleated(length, E, 0.26, 0.04), wallMat, [length / 2, E / 2, 0]));
        if (kind === 'window') for (const f of [0.27, 0.73]) {
          const shape = new THREE.Shape();
          shape.moveTo(-0.48, 0); shape.lineTo(0.48, 0); shape.lineTo(0.48, 1.05); shape.absarc(0, 1.05, 0.48, 0, Math.PI, false); shape.closePath();
          add(s.mesh(new THREE.ShapeGeometry(shape, 14), paneMat, [length * f, 0.5, 0.06])).castShadow = false;
          add(s.box([0.03, 1.52, 0.02], [length * f, 1.26, 0.07], wallMat));
          for (const yy of [0.85, 1.2, 1.55]) add(s.box([0.96, 0.03, 0.02], [length * f, yy, 0.07], wallMat));
        }
      }
      s.root.add(g);
    };
    const flip = random() < 0.5 ? 0 : 1;
    const kindOf = (k: number) => a.sides === 'open' ? 'open' : a.sides === 'windows' ? 'window' : a.sides === 'closed' ? (k === 2 ? 'open' : 'wall') : (k + flip) % 2 ? 'window' : 'open';
    for (let k = 0; k < 4; k++) bay(kindOf(k), [backX[k], 0, ZB], KX, 0);
    for (let k = 0; k < 3; k++) bay(kindOf(k + 5), [X0, 0, leftZ[k + 1]], leftZ[k + 1] - leftZ[k], Math.PI / 2);

    // Festoons and lanterns.
    const lanternColours = LANTERNS[a.lanterns];
    const lanternMats = lanternColours.map((c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.7 * glow, roughness: 0.9 }));
    const lanternItems: { p: P3; r: number }[][] = lanternColours.map(() => []);
    const wire = s.material('#2c2f2a');
    const swag = (from: P3, to: P3, sag: number, bow = 0, lanterns = 0, dense = 1) => {
      const pts: P3[] = [], n = 14;
      for (let k = 0; k <= n; k++) { const f = k / n, d = 4 * f * (1 - f); pts.push([mix(from[0], to[0], f), mix(from[1], to[1], f) - sag * d, mix(from[2], to[2], f) + bow * d]); }
      s.tube(pts, 0.012, wire).castShadow = false;
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
      const length = curve.getLength(), count = Math.max(2, Math.round(length / 0.36 * dense));
      for (let k = 0; k < count; k++) { const p = curve.getPointAt((k + 0.5) / count); put('bulb', 'bulb', M([p.x, p.y - 0.08, p.z], [0.062, 0.08, 0.062])); box(I, 'matte', [0.025, 0.05, 0.025], [p.x, p.y - 0.02, p.z], '#2c2f2a'); }
      for (let k = 0; k < lanterns; k++) {
        const p = curve.getPointAt(mix(0.08, 0.92, (k + random()) / lanterns)), r = 0.16 + random() * 0.2, drop = 0.1 + random() * 0.45;
        if (p.y - drop - r * 2 < 3.25 && Math.abs(p.x) < 2.6 && p.z > -1.5) continue;
        box(I, 'matte', [0.008, drop, 0.008], [p.x, p.y - drop / 2, p.z], '#2c2f2a');
        lanternItems[Math.floor(random() * lanternItems.length)].push({ p: [p.x, p.y - drop - r * 0.9, p.z], r });
      }
      return pts;
    };
    const lan = (base: number) => Math.round(base * mix(0.5, 1.4, mood.density));
    // The brightest swags: a canopy of strands between the king poles, bowing out over the dance floor.
    const kTop = R - 0.25;
    for (let k = 0; k < 5; k++) swag([-KX, kTop - k * 0.12, ZR], [KX, kTop - k * 0.12, ZR], 0.9 + k * 0.28, 0.25 + k * 0.5, k % 2 ? lan(2) : 0, 1.5);
    for (const [kx] of kings) {
      for (const bx of backX) if (Math.abs(bx - kx) < KX + 0.2) swag([kx, kTop, ZR], [bx, E - 0.06, ZB + 0.12], 0.75, 0, lan(2));
      swag([kx, kTop, ZR], [kx < 0 ? X0 + 0.1 : X1, kx < 0 ? E + (R - E) * 0.55 : kTop - 0.4, kx < 0 ? ZR : ZR + 0.2], 0.6, 0.3, lan(2));
    }
    swag([X0 + 0.1, E - 0.06, ZB + 0.12], [X0 + 0.1, E - 0.06, ZF], 0.3, 0.25, lan(3));
    for (let k = 0; k < 4; k++) swag([backX[k], E - 0.08, ZB + 0.14], [backX[k + 1], E - 0.08, ZB + 0.14], 0.28, 0.1, lan(1));
    if (off) {
      const pts = swag([KX, kTop - 0.6, ZR], [5.0, 0.3, 2.0], 0.9, 0.4, 0);
      const end = pts[pts.length - 1];
      for (let k = 0; k < 8; k++) { put('bulb', 'bulb', M([end[0] + Math.sin(k * 0.9) * 0.3 + k * 0.1, 0.07, end[2] + Math.cos(k * 0.9) * 0.3], [0.045, 0.06, 0.045], [1.4, k, 0])); }
    }

    // Flowers wound up the king poles, and urns at the back.
    const petals = lanternColours.filter((c) => c !== '#fffaf0');
    const blooms = [...(petals.length ? petals : ['#f3c6cc', '#fbeee6']), '#fbf9f2', '#fbf9f2'];
    const greens = ['#5c8046', '#4a6e3c', '#7c9a58'];
    for (const [kx, kz] of kings) for (let k = 0; k < Math.round(mix(26, 60, mood.density)); k++) {
      const y = 0.3 + k * 0.045, th = k * 0.55 + kx;
      if (y > 2.6) break;
      if (k % 2) put('bloom', 'matte', M([kx + Math.sin(th) * 0.12, y, kz + Math.cos(th) * 0.12], 0.05 + random() * 0.04), pick(blooms));
      else put('ball', 'matte', M([kx + Math.sin(th) * 0.13, y, kz + Math.cos(th) * 0.13], [0.09, 0.02, 0.05], [random() * 3, th, random()]), pick(greens));
    }
    for (const ux of [-1.97, 1.97]) {
      if (off) { for (let k = 0; k < 7; k++) { const C = M([ux, 0.03 + k * 0.13, ZB + 0.75], 1, [0, 0.1, 0]); chair(C, '#c9a13f', true); } continue; }
      box(I, 'matte', [0.42, 0.95, 0.42], [ux, 0.5, ZB + 0.6], '#e9e2d0');
      box(I, 'matte', [0.5, 0.05, 0.5], [ux, 1.0, ZB + 0.6], '#e9e2d0');
      cyl(I, 'matte', 0.17, 0.26, [ux, 1.15, ZB + 0.6], '#c9c2b0');
      for (let k = 0; k < 34; k++) { const th = random() * TAU, ph = random() * 1.3, rr = 0.42; put(k % 3 ? 'bloom' : 'ball', 'matte', M([ux + Math.sin(th) * Math.sin(ph) * rr, 1.38 + Math.cos(ph) * rr * 0.9, ZB + 0.6 + Math.cos(th) * Math.sin(ph) * rr], k % 3 ? 0.08 + random() * 0.05 : [0.14, 0.03, 0.07], [random() * 3, th, random()]), k % 3 ? pick(blooms) : pick(greens)); }
    }

    // Guest tables and chairs.
    function chair(C: THREE.Matrix4, colour: string, stacked = false) {
      const mat = colour === '#c9a13f' ? 'metal' : 'matte';
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) cyl(C, mat, 0.017, 0.46, [x, 0.23, z], colour);
      box(C, mat, [0.42, 0.03, 0.42], [0, 0.47, 0], colour);
      if (!stacked) box(C, 'matte', [0.37, 0.035, 0.37], [0, 0.5, 0], '#f1ead8');
      for (const x of [-0.18, 0.18]) cyl(C, mat, 0.017, 0.5, [x, 0.72, -0.2], colour);
      for (const y of [0.96, 0.84, 0.62]) box(C, mat, [0.4, 0.035, 0.028], [0, y, -0.2], colour);
    }
    const chairColour = pick(['#c9a13f', '#c9a13f', '#f4f2ea', '#7a5230']);
    const clothColour = a.lining === 'blush' ? '#f6e3e0' : ivory;
    const party = [...lanternColours, '#d4ae52', '#ffffff'];
    const tables: [number, number][] = [[-1.95, 4.3], [2.0, 4.35], [-4.55, 0.2], [5.7, 0.45]].slice(0, 2 + Math.round(mood.density * 2)) as [number, number][];
    tables.forEach(([tx, tz], ti) => {
      const sleeper = a.moment === 'lull' && ti === 0;
      if (off) {
        if (ti % 2) { cyl(I, 'matte', 0.8, 0.04, [tx, 0.8, tz], '#b08a52', [0, random(), Math.PI / 2 - 0.12]); return; }
        cyl(I, 'matte', 0.8, 0.04, [tx, 0.73, tz], '#b08a52'); cyl(I, 'metal', 0.03, 0.7, [tx, 0.36, tz], '#55585c');
        for (const e of [-1, 1]) box(I, 'metal', [1.1, 0.03, 0.05], [tx, 0.03, tz], '#55585c', [0, e * 0.78, 0]);
        box(I, 'matte', [0.5, 0.3, 0.36], [tx + 0.1, 0.9, tz], '#8f9aa0');
        for (let k = 0; k < 6; k++) cyl(I, 'glass', 0.03, 0.1, [tx - 0.08 + (k % 3) * 0.14, 1.07, tz - 0.08 + Math.floor(k / 3) * 0.14], '#ffffff');
        return;
      }
      put('skirt', 'cloth', M([tx, sleeper ? 0.56 : 0.375, tz], [0.98, sleeper ? 0.38 : 0.75, 0.98]), clothColour);
      cyl(I, 'cloth', 0.805, 0.012, [tx, 0.752, tz], clothColour);
      if (sleeper) cyl(I, 'metal', 0.04, 0.74, [tx, 0.37, tz], '#55585c');
      const T = 0.76, seats = 8;
      // Centrepiece: a jar of flowers and a candle lantern.
      cyl(I, 'glass', 0.06, 0.16, [tx, T + 0.08, tz], '#ffffff');
      for (let k = 0; k < 9; k++) put('bloom', 'matte', M([tx + (random() - 0.5) * 0.2, T + 0.2 + random() * 0.1, tz + (random() - 0.5) * 0.2], 0.045 + random() * 0.03), pick(blooms));
      for (let k = 0; k < 3; k++) { const th = k * 2.1 + ti; cyl(I, 'matte', 0.025, 0.08, [tx + Math.sin(th) * 0.2, T + 0.04, tz + Math.cos(th) * 0.2], '#f7f0df'); put('bulb', 'bulb', M([tx + Math.sin(th) * 0.2, T + 0.1, tz + Math.cos(th) * 0.2], [0.012, 0.022, 0.012])); }
      for (let k = 0; k < seats; k++) {
        const th = k / seats * TAU + ti, px = tx + Math.sin(th) * 0.56, pz = tz + Math.cos(th) * 0.56;
        const used = a.moment !== 'waiting';
        if (!used || random() < 0.6) cyl(I, 'matte', 0.115, 0.012, [px, T + 0.006, pz], '#fbfaf5');
        if (!used) box(I, 'matte', [0.07, 0.02, 0.13], [px, T + 0.022, pz], pick(blooms), [0, th, 0]);
        else if (random() < 0.5) ball(I, 'matte', [0.05, 0.03, 0.05], [px + (random() - 0.5) * 0.1, T + 0.03, pz + (random() - 0.5) * 0.1], '#f1ead8');
        const gx = tx + Math.sin(th + 0.3) * 0.4, gz = tz + Math.cos(th + 0.3) * 0.4, tipped = a.moment === 'lull' && random() < 0.3;
        cyl(I, 'glass', 0.028, 0.13, [gx, T + (tipped ? 0.03 : 0.065), gz], '#ffffff', tipped ? [0, random() * 3, Math.PI / 2] : [0, 0, 0]);
        if (used && !tipped && random() < 0.6) cyl(I, 'matte', 0.022, 0.06, [gx, T + 0.04, gz], pick(['#f0dc8c', '#7a1528', '#f0dc8c']));
        // Chair.
        let rr = 1.02, yaw = th + Math.PI, lean: P3 = [0, 0, 0], y = 0.03;
        if (a.moment === 'speeches') { rr = 1.12; yaw = Math.atan2(0 - (tx + Math.sin(th) * rr), 0.7 - (tz + Math.cos(th) * rr)) + (random() - 0.5) * 0.3; }
        if (a.moment === 'dancing') { rr = 1.1 + random() * 0.3; yaw += (random() - 0.5) * 1.2; }
        if (a.moment === 'lull') { rr = 1.1 + random() * 0.5; yaw += (random() - 0.5) * 2.4; if (random() < 0.15) { lean = [-Math.PI / 2 + 0.05, 0, 0]; y = 0.23; } }
        if (sleeper && Math.cos(th) > 0.5) continue;
        const cx = tx + Math.sin(th) * rr, cz = tz + Math.cos(th) * rr;
        if (cz > ZF + 0.5 || cx > W / 2 - 0.3) continue;
        const C = M([cx, y, cz], 1, [lean[0], yaw, 0]);
        chair(C, chairColour);
        if ((a.moment === 'dancing' || a.moment === 'lull') && random() < 0.3 && !lean[0]) box(C, 'matte', [0.46, 0.42, 0.07], [0, 0.8, -0.215], pick(['#1d1d22', '#3b4a6b', '#55585c', '#6e1f30']));
        if (a.moment === 'dancing' && random() < 0.16) { const bx = (random() - 0.5) * 0.3; for (let b = 0; b < 3; b++) { box(C, 'matte', [0.005, 1.0 + b * 0.12, 0.005], [bx + (b - 1) * 0.07, 1.45 + b * 0.06, -0.2], '#f1ead8', [0, 0, (b - 1) * -0.14]); ball(C, 'matte', [0.15, 0.18, 0.15], [bx + (b - 1) * 0.2, 2.1 + b * 0.14, -0.2], pick(party)); } }
      }
      if (a.moment !== 'waiting') for (let k = 0; k < 2; k++) cyl(I, 'matte', 0.036, 0.28, [tx + (random() - 0.5) * 0.5, T + 0.14, tz + (random() - 0.5) * 0.5], pick(['#1e3a27', '#2a2118']));
      if (sleeper) {
        // The child asleep under the table, a jacket for a blanket.
        const K = M([tx + 0.1, 0.03, tz + 0.5], 1, [0, 0.35, 0]);
        box(K, 'matte', [0.45, 0.08, 0.3], [-0.5, 0.04, 0], pick(blooms));
        ball(K, 'matte', 0.11, [-0.45, 0.16, 0], pick(['#f0c9a4', '#c98f62', '#8a5a3a']));
        ball(K, 'matte', [0.115, 0.1, 0.12], [-0.49, 0.2, -0.01], pick(['#2a1c14', '#6b4423', '#d9b45a']));
        ball(K, 'matte', [0.42, 0.13, 0.22], [0.02, 0.11, 0], pick(['#1f2a44', '#2a2a2e', '#55585c']));
        box(K, 'matte', [0.3, 0.03, 0.12], [0.1, 0.03, 0.26], '#1f2a44', [0, 0.5, 0]);
        for (const e of [-1, 1]) { cyl(K, 'matte', 0.04, 0.3, [0.52, 0.06, e * 0.06], '#f6f3ea', [0, 0, Math.PI / 2]); ball(K, 'matte', [0.05, 0.035, 0.09], [1.0 + e * 0.1, 0.035, 0.3 + e * 0.06], pick(['#e23b3b', '#fbf9f2', '#111111'])); }
        ball(K, 'matte', [0.09, 0.1, 0.08], [-0.2, 0.22, 0.12], '#b98a5a'); ball(K, 'matte', 0.06, [-0.26, 0.3, 0.14], '#b98a5a');
      }
    });

    // What is on the floor.
    const litter = { waiting: 0, speeches: 20, dancing: 420, lull: 640, strike: 160 }[a.moment] * mix(0.6, 1.3, mood.density);
    for (let k = 0; k < litter; k++) {
      const onFloor = random() < 0.6, x = onFloor ? (random() - 0.5) * DF : mix(X0 + 0.3, W / 2 - 0.2, random()), z = onFloor ? dz + (random() - 0.5) * DF : mix(ZB + 0.3, ZF, random());
      box(I, 'matte', [0.05, 0.003, 0.03], [x, onFloor ? 0.063 : 0.033, z], pick(party), [0, random() * 3, 0]);
    }
    if (a.moment === 'lull' || a.moment === 'dancing') for (let k = 0; k < (a.moment === 'lull' ? 9 : 4); k++) {
      const x = mix(X0 + 1, 6.2, random()), z = mix(-1.5, ZF - 0.3, random());
      if (Math.hypot(x, z - 0.7) < 1.9) continue;
      if (random() < 0.5) ball(I, 'matte', [0.15, 0.18, 0.15], [x, 0.21, z], pick(party));
      else cyl(I, 'matte', 0.036, 0.28, [x, 0.066, z], '#1e3a27', [0, random() * 3, Math.PI / 2]);
    }
    if (mood.cheer > 0.45 && !off) for (let k = 0; k < 30; k++) { const f = k / 29, x = mix(X0 + 0.2, X1 - 0.2, f), sagY = Math.sin((f * 4 % 1) * Math.PI) * 0.22; box(I, 'cloth', [0.2, 0.2, 0.006], [x, E - 0.5 - sagY, ZB + 0.2], pick(party), [0, 0, Math.PI / 4]); }

    // The garden beyond.
    const dusk = (c: string) => new THREE.Color(c).lerp(sky, 0.3);
    const gz = ZB - 0.75, gx = X0 - 0.7;
    const stake = (x: number, z: number) => { cyl(I, 'matte', 0.012, 0.5, [x, 0.25, z], '#2a2a2e'); put('bulb', 'bulb', M([x, 0.55, z], 0.06)); };
    if (a.garden === 'hedges') {
      const leafy = paint(128, 128, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); for (let k = 0; k < 500; k++) { ctx.fillStyle = pick(['#d9d9d9', '#f4f4f4', '#bfbfbf', '#e8e8e8']); ctx.beginPath(); ctx.arc(random() * w, random() * h, 2 + random() * 4, 0, TAU); ctx.fill(); } });
      leafy.wrapS = leafy.wrapT = THREE.RepeatWrapping; leafy.repeat.set(8, 1.2);
      const hedge = new THREE.MeshStandardMaterial({ map: leafy, color: dusk('#3f6a3a'), roughness: 1 });
      s.box([W, 1.8, 0.8], [0, 0.9, gz - 0.1], hedge);
      s.box([0.8, 1.8, D - 1.4], [gx - 0.1, 0.9, 0.7], hedge);
      for (const x of [-4.3, -1.45, 1.45, 4.3]) { put('cone', 'matte', M([x, 2.4, gz - 0.1], [0.42, 1.3, 0.42]), dusk('#365c33')); ball(I, 'matte', 0.3, [x, 3.15, gz - 0.1], dusk('#365c33')); }
    } else if (a.garden === 'orchard') {
      for (const [x, z] of [[-5.2, gz], [-2.2, gz - 0.2], [0.9, gz], [3.9, gz - 0.2], [6.3, gz], [gx - 0.1, -2.6], [gx, 0.9], [gx - 0.1, 4.3]] as const) {
        cyl(I, 'matte', 0.13, 1.5, [x, 0.75, z], dusk('#5a4230'), [0.08, x, 0.06]);
        for (let k = 0; k < 5; k++) ball(I, 'matte', [0.75 + random() * 0.3, 0.6 + random() * 0.2, 0.7], [x + (random() - 0.5) * 0.7, 2.0 + random() * 0.6, z + (random() - 0.5) * 0.4], dusk(pick(['#5a8046', '#4a7040', '#6f9050'])));
        for (let k = 0; k < 9; k++) ball(I, 'matte', 0.055, [x + (random() - 0.5) * 1.5, 1.6 + random() * 1.1, z + 0.5 + random() * 0.25], '#c9382c');
        const r = 0.16 + random() * 0.08, c = Math.floor(random() * lanternItems.length);
        lanternItems[c].push({ p: [x + 0.5, 1.25, z + 0.55], r });
      }
    } else if (a.garden === 'roses') {
      const brick = paint(256, 128, (ctx, w, h) => { ctx.fillStyle = '#b9a892'; ctx.fillRect(0, 0, w, h); for (let r = 0; r < 12; r++) for (let c = -1; c < 9; c++) { ctx.fillStyle = pick(['#9a5a44', '#a8644c', '#8a4f3c', '#b0705a']); ctx.fillRect(c * 32 + (r % 2) * 16 + 1, r * 11 + 1, 30, 9); } });
      brick.wrapS = brick.wrapT = THREE.RepeatWrapping; brick.repeat.set(6, 1.5);
      const wall = new THREE.MeshStandardMaterial({ map: brick, color: dusk('#ffffff'), roughness: 0.95 });
      s.box([W, 2.1, 0.35], [0, 1.05, gz - 0.2], wall);
      s.box([0.35, 2.1, D - 1.4], [gx - 0.3, 1.05, 0.7], wall);
      box(I, 'matte', [W, 0.08, 0.45], [0, 2.14, gz - 0.2], dusk('#c9bfae'));
      for (let k = 0; k < 220; k++) {
        const back = random() < 0.6, u = random(), y = 0.2 + Math.pow(random(), 0.7) * 2.0;
        const p: P3 = back ? [mix(-W / 2, W / 2, u), y, gz + 0.02] : [gx - 0.08, y, mix(ZB, ZF + 0.8, u)];
        if (k % 3) put('ball', 'matte', M(p, [0.16, 0.12, 0.08], [0, back ? 0 : Math.PI / 2, random() * 3]), dusk(pick(greens)));
        else put('bloom', 'matte', M([p[0], p[1], p[2] + (back ? 0.05 : 0)], 0.07 + random() * 0.04), pick(['#e8a0b0', '#f6d6d9', '#c9506a', '#fbf2e6']));
      }
    } else {
      for (let x = -W / 2 + 0.3; x <= W / 2; x += 1.8) cyl(I, 'matte', 0.06, 1.25, [x, 0.6, gz], dusk('#a08460'));
      for (const y of [0.45, 0.85, 1.15]) span('matte', [-W / 2, y, gz], [W / 2, y, gz], 0.035, dusk('#a08460'));
      for (let z = ZB; z <= ZF + 1; z += 1.8) cyl(I, 'matte', 0.06, 1.25, [gx, 0.6, z], dusk('#a08460'));
      for (const y of [0.45, 0.85, 1.15]) span('matte', [gx, y, ZB - 0.7], [gx, y, D / 2], 0.035, dusk('#a08460'));
      for (const [x, z] of [[-3.5, gz - 0.55], [2.6, gz - 0.5], [5.6, gz - 0.6], [gx - 0.45, 2.2]] as const) { cyl(I, 'matte', 0.6, 1.1, [x, 0.6, z], dusk('#d9b85a'), [0, 0.3 + x, Math.PI / 2]); cyl(I, 'matte', 0.605, 0.06, [x, 0.6, z], dusk('#b8963c'), [0, 0.3 + x, Math.PI / 2]); }
      for (let k = 0; k < 110; k++) { const back = random() < 0.65; put('cone', 'matte', M(back ? [mix(-W / 2, W / 2, random()), 0.25, gz - 0.25 - random() * 0.4] : [gx - 0.2 - random() * 0.4, 0.25, mix(ZB, D / 2, random())], [0.05, 0.5 + random() * 0.3, 0.05], [random() * 0.3, 0, random() * 0.3]), dusk(pick(['#a9a85a', '#8f9a4f', '#c2b464']))); }
    }
    for (let x = -5.2; x <= 6.4; x += 2.4) stake(x + random() * 0.4, ZB - 0.3);
    // Front lawn: guy ropes, stepping stones, lavender, a welcome board.
    for (const [px, pz] of [[X0 - 0.6, ZF + 0.45], [X0 + 0.5, ZF + 0.7]] as const) { span('matte', [X0, E, ZF], [px, 0.05, pz], 0.012, '#e9dcc0'); cyl(I, 'matte', 0.02, 0.22, [px, 0.08, pz], '#8a5a34', [0.3, 0, 0.3]); }
    for (let k = 0; k < 7; k++) cyl(I, 'matte', 0.26 + random() * 0.08, 0.03, [-3.2 + k * 0.62 + random() * 0.1, 0.012, ZF + 0.42 + Math.sin(k * 1.3) * 0.1], dusk('#b9b4a6'));
    for (let x = 1.6; x < W / 2 - 0.2; x += 0.34) { for (let k = 0; k < 4; k++) put('cone', 'matte', M([x + (random() - 0.5) * 0.2, 0.18, ZF + 0.45 + (random() - 0.5) * 0.25], [0.04, 0.36 + random() * 0.14, 0.04], [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5]), dusk(pick(['#8f7fc9', '#7a6ab8', '#a79ad6']))); ball(I, 'matte', [0.2, 0.12, 0.2], [x, 0.08, ZF + 0.45], dusk('#6f8f6a')); }
    stake(1.2, ZF + 0.5); stake(-3.9, ZF + 0.6); stake(W / 2 - 0.4, ZF + 0.6);
    const sign = s.label(pick(['WELCOME', 'MR & MRS', 'THIS WAY', 'JUST MARRIED', 'DANCING']), 0.7, 0.9, [-4.8, 0.62, ZF + 0.5], '#f4f1e6', '#2a2d2c');
    sign.rotation.set(-0.2, 0.25, 0, 'YXZ');
    for (const e of [-1, 1]) span('matte', [-4.8 + e * 0.3, 1.1, ZF + 0.4], [-4.85 + e * 0.32, 0, ZF + 0.18], 0.02, '#8a5a34');

    // Emit.
    for (const b of batches.values()) {
      const mesh = new THREE.InstancedMesh(GEO[b.geo](), MAT[b.mat](), b.m.length);
      b.m.forEach((m, k) => { mesh.setMatrixAt(k, m); mesh.setColorAt(k, b.c[k]); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
      mesh.castShadow = b.mat !== 'glass' && b.mat !== 'bulb';
      mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    lanternItems.forEach((items, k) => {
      if (!items.length) { lanternMats[k].dispose(); return; }
      const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), lanternMats[k], items.length);
      items.forEach((it, j) => mesh.setMatrixAt(j, M(it.p, [it.r, it.r * 0.9, it.r])));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      s.root.add(mesh);
      sway.push(mesh);
    });

    const bulbBase = bulbMat.emissiveIntensity, lampBase = lamp.intensity;
    world.update = (_dt, time) => {
      const e = mood.energy, beat = a.moment === 'dancing' ? Math.sin(time * mix(2, 9, e)) * 0.25 * e : 0;
      bulbMat.emissiveIntensity = bulbBase * (1 + Math.sin(time * 1.7) * 0.08 * e + beat);
      lamp.intensity = lampBase * (1 + Math.sin(time * 1.1) * 0.05 * e + beat * 0.5);
      lanternMats.forEach((m, k) => { m.emissiveIntensity = 0.7 * glow * (1 + Math.sin(time * 0.9 + k * 1.3) * 0.15 * e); });
    };
    return world;
  },
});
