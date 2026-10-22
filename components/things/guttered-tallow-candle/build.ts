import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    holder: choice('What holds the candle?', {
      tripod: 'A forged iron pricket on three splayed legs, with a drip pan.',
      dish: 'A wide low iron pan with a ring handle, made to be carried down a corridor.',
      block: 'Nothing but a spike driven into a rough block of oak.',
      tall: 'A tall knopped iron altar stick on ball feet.',
    }),
    wax: choice('What is the candle made of?', {
      tallow: 'Yellow-grey mutton tallow: greasy, smoky, the poor light of a workroom.',
      beeswax: 'Deep honey-gold beeswax, the good church candle.',
      white: 'Bleached white wax, clean and solemn.',
      black: 'Black wax, for a rite nobody will talk about.',
    }),
    burned: score('How far has it burned down?', ['Barely started, tall and square-shouldered', 'Half gone', 'A low stub', 'Almost nothing: a wick drowning in a puddle']),
    cascade: score('How much wax has run down it?', ['A few neat runs', 'Thick ropes down one side', 'A frozen waterfall over the pan and onto the table']),
    flame: choice('Is it alight?', {
      steady: 'A tall calm flame, perfectly still.',
      guttering: 'Guttering: a low flame leaning hard in a draught, about to fail.',
      flaring: 'Flaring high and ragged with a long smoking wick.',
      smoking: 'Just out: a red ember on the wick and a thread of smoke.',
      cold: 'Long cold: a black wick stump, dust in the wax.',
    }),
    clock: noul('Is it a candle clock, ringed with hour marks and nails that drop as it burns?'),
    foot: choice('What lies at its foot?', {
      nothing: 'Nothing.',
      snuffer: 'A cone snuffer and wick shears.',
      stubs: 'The spent stubs of the candles that came before it tonight.',
      moth: 'A singed moth.',
      tinder: 'A fire-steel, a flint and a tinder box.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lit = a.flame === 'steady' || a.flame === 'guttering' || a.flame === 'flaring';
    const iron = s.material(new THREE.Color('#2f2c2a').lerp(new THREE.Color('#6a3f28'), mood.wear * 0.5), { metalness: 0.6 - mood.wear * 0.3, roughness: 0.5 });
    const waxColour = new THREE.Color({ tallow: '#d9c98f', beeswax: '#d49a2e', white: '#f1ecdf', black: '#262224' }[a.wax]);
    if (a.flame === 'cold') waxColour.lerp(new THREE.Color('#8f887a'), 0.25 + mood.wear * 0.2);
    const glowTone = new THREE.Color().setHSL(mix(0.11, 0.06, mood.warmth), 1, 0.5);
    const wax = new THREE.MeshStandardMaterial({
      color: waxColour, roughness: a.wax === 'tallow' ? 0.5 : 0.35, vertexColors: true,
      emissive: lit && a.wax !== 'black' ? glowTone : new THREE.Color('#000'), emissiveIntensity: lit ? 0.16 : 0,
    });
    const drip = new THREE.MeshStandardMaterial({ color: waxColour.clone().offsetHSL(0, 0, 0.02), roughness: wax.roughness, emissive: wax.emissive, emissiveIntensity: lit ? 0.08 : 0 });

    // ---- the holder ----
    let panY: number, panR: number;
    let overEdge = true;
    if (a.holder === 'tripod') {
      panY = 0.17; panR = 0.075;
      for (let i = 0; i < 3; i++) {
        const angle = i * 2.094 + 0.4;
        const c = Math.cos(angle), n = Math.sin(angle);
        s.tube([[c * 0.012, 0.11, n * 0.012], [c * 0.05, 0.09, n * 0.05], [c * 0.085, 0.03, n * 0.085], [c * 0.1, 0.006, n * 0.1], [c * 0.118, 0.012, n * 0.118]], 0.007, iron);
      }
      s.lathe([[0.012, 0.1], [0.012, 0.125], [0.022, 0.135], [0.012, 0.146], [0.012, panY - 0.012]], iron);
    } else if (a.holder === 'dish') {
      panY = 0.022; panR = 0.105;
      s.ring(0.026, 0.006, [panR + 0.022, 0.024, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.holder === 'block') {
      panY = 0.1; panR = 0.075;
      overEdge = true;
      const oak = s.material(new THREE.Color('#7a5c3a').lerp(new THREE.Color('#3f3026'), mood.wear * 0.7), { roughness: 0.9 });
      const block = s.box([0.16, 0.1, 0.15], [0, 0.05, 0], oak);
      block.rotation.y = (random() - 0.5) * 0.3;
      for (let i = 0; i < 4; i++) s.box([0.162, 0.002, 0.004], [0, 0.02 + i * 0.022 + random() * 0.006, 0.076], s.material('#4a3828')).rotation.y = block.rotation.y;
    } else {
      panY = 0.4; panR = 0.07;
      s.lathe([[0.085, 0.012], [0.085, 0.022], [0.03, 0.04], [0.014, 0.06], [0.014, 0.12], [0.03, 0.135], [0.014, 0.15], [0.012, 0.24], [0.034, 0.26], [0.012, 0.28], [0.012, 0.36], [0.024, 0.375], [0.012, panY - 0.012]], iron);
      for (let i = 0; i < 3; i++) s.ball([0.016, 0.014, 0.016], [Math.cos(i * 2.094) * 0.07, 0.012, Math.sin(i * 2.094) * 0.07], iron, 10);
    }
    if (a.holder !== 'block') s.lathe([[0, panY - 0.012], [panR * 0.5, panY - 0.012], [panR, panY - 0.002], [panR + 0.006, panY + 0.008], [panR + 0.002, panY + 0.009], [panR * 0.95, panY], [0, panY]], iron);
    s.mesh(new THREE.ConeGeometry(0.006, 0.07, 8), iron, [0, panY + 0.035, 0]);

    // ---- the candle ----
    const R = 0.031 * mix(0.92, 1.08, random());
    const tall = mix(0.26, 0.022, Math.pow(a.burned, 0.8));
    const breachAngle = random() * Math.PI * 2;
    const breach = mix(0.012, Math.min(0.05, tall * 0.5), a.cascade);
    const leanX = (random() - 0.5) * 0.05, leanZ = (random() - 0.5) * 0.05;
    const candle = new THREE.Group();
    candle.position.y = panY;
    candle.rotation.set(leanX, 0, leanZ);
    s.root.add(candle);
    const rimDrop = (angle: number) => breach * Math.pow(Math.max(0, Math.cos(angle - breachAngle)), 3) + 0.003 * Math.sin(angle * 3 + 1);
    const profile: [number, number][] = [[0.0001, tall - 0.011], [R * 0.6, tall - 0.009], [R * 0.9, tall - 0.001], [R, tall - 0.005], [R * 1.03, tall * 0.55], [R * 1.06, tall * 0.12], [R * 1.1, 0]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 28), wax);
    const bp = body.geometry.attributes.position;
    const colours: number[] = [];
    for (let i = 0; i < bp.count; i++) {
      const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i);
      const angle = Math.atan2(z, x);
      const high = Math.max(0, (y - tall * 0.5) / (tall * 0.5));
      const wobble = 1 + 0.035 * Math.sin(angle * 5 + y * 60) * (0.3 + a.cascade);
      bp.setXYZ(i, x * wobble, y - rimDrop(angle) * high * (Math.hypot(x, z) > R * 0.7 ? 1 : 0.4), z * wobble);
      const shade = lit ? mix(0.72, 1.25, Math.pow(Math.min(1, y / Math.max(tall, 0.05)), 2)) : 1;
      colours.push(shade, shade, shade);
    }
    body.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    body.geometry.computeVertexNormals();
    body.castShadow = body.receiveShadow = true;
    candle.add(body);
    const inCandle = (m: THREE.Object3D) => { candle.add(m); return m; };

    if (a.clock && tall > 0.05) {
      const mark = new THREE.MeshStandardMaterial({ color: waxColour.clone().multiplyScalar(0.5), roughness: 0.7 });
      for (let y = 0.035, n = 0; y < tall - 0.025; y += 0.05, n++) {
        inCandle(s.mesh(new THREE.TorusGeometry(R * mix(1.09, 1.03, y / tall), 0.0013, 5, 28), mark, [0, y, 0])).rotation.x = Math.PI / 2;
        const angle = breachAngle + Math.PI + (random() - 0.5) * 0.4;
        const nail = s.rod([Math.cos(angle) * R * 0.6, y, Math.sin(angle) * R * 0.6], [Math.cos(angle) * (R + 0.016), y - 0.003, Math.sin(angle) * (R + 0.016)], 0.0017, iron);
        inCandle(nail);
        inCandle(s.ball([0.004, 0.004, 0.004], [Math.cos(angle) * (R + 0.016), y - 0.003, Math.sin(angle) * (R + 0.016)], iron, 6));
      }
      // The nails that have already fallen.
      for (let i = 0; i < 1 + Math.floor(a.burned * 4); i++) {
        const angle = random() * 6.28, d = a.holder === 'block' ? 0.12 + random() * 0.05 : panR * (0.6 + random() * 0.3);
        const y = a.holder === 'block' ? 0.003 : panY + 0.004;
        s.rod([Math.cos(angle) * d, y, Math.sin(angle) * d], [Math.cos(angle) * d + 0.03, y, Math.sin(angle) * d + 0.012], 0.002, iron);
      }
    }

    // ---- runs of wax ----
    const side = (angle: number, y: number, out = 1.04): P3 => {
      const r = R * mix(1.1, 1.0, Math.min(1, y / Math.max(tall, 0.001))) * out;
      return [Math.cos(angle) * r, y, Math.sin(angle) * r];
    };
    const runs = 3 + Math.round(a.cascade * 9);
    for (let i = 0; i < runs; i++) {
      const angle = breachAngle + (random() - 0.5) * mix(2.4, 1.3, a.cascade) + (i < 2 ? Math.PI * (0.6 + random() * 0.8) : 0);
      const startY = tall - rimDrop(angle) - 0.004;
      const length = Math.min(startY - 0.004, mix(0.03, 0.22, random()) * mix(0.5, 1.2, a.cascade));
      if (length < 0.012) continue;
      const fat = mix(0.0035, 0.0075, random()) * mix(0.8, 1.3, a.cascade);
      const wander = (random() - 0.5) * 0.3;
      const points: P3[] = [0, 0.33, 0.66, 1].map((t) => side(angle + wander * t * t, startY - length * t, 1.03 + fat * 6 * t));
      inCandle(s.tube(points, fat, drip));
      inCandle(s.ball([fat * 1.6, fat * 2.3, fat * 1.6], points[3], drip, 8));
    }
    // The cascade proper: lapped sheets down the breach side, a skirt on the pan, icicles off the rim.
    if (a.cascade > 0.3) {
      const layers = Math.round(mix(3, 9, a.cascade));
      for (let i = 0; i < layers; i++) {
        const t = i / (layers - 1);
        const angle = breachAngle + (random() - 0.5) * 0.7;
        const y = mix(Math.max(0.01, tall - breach - 0.01), 0.008, t);
        const at = side(angle, y, 0.98 + t * 0.3);
        const lobe = s.ball([R * mix(0.22, 0.6, t), mix(0.016, 0.01, t) + tall * 0.07 * (1 - t), R * mix(0.4, 0.75, t) * (0.8 + random() * 0.4)], at, drip, 10);
        lobe.rotation.y = -angle;
        inCandle(lobe);
      }
    }
    const flatten = a.holder === 'block' ? 0.075 : panR;
    const skirt = Math.round(mix(1, 9, a.cascade) + a.burned * 4);
    for (let i = 0; i < skirt; i++) {
      const angle = breachAngle + (random() - 0.5) * mix(1.2, 3.4, a.burned);
      const d = Math.min(flatten * 0.95, R + random() * (flatten - R) * mix(0.5, 1, a.cascade));
      const blob = s.ball([0.014 + random() * 0.018, 0.004 + random() * 0.007, 0.012 + random() * 0.014], [Math.cos(angle) * d, panY + 0.003, Math.sin(angle) * d], drip, 10);
      blob.rotation.y = -angle;
    }
    if (a.burned > 0.8) s.cylinder(Math.min(flatten * 0.8, R * 1.9), Math.min(flatten * 0.85, R * 2.1), 0.008, [0, panY + 0.004, 0], drip, 20);
    if (a.cascade > 0.55 && overEdge) {
      const edge = a.holder === 'block' ? 0.082 : panR + 0.006;
      const icicles = Math.round(mix(2, 8, (a.cascade - 0.55) / 0.45));
      let longest = 0;
      for (let i = 0; i < icicles; i++) {
        const angle = breachAngle + (i - (icicles - 1) / 2) * 0.17 + (random() - 0.5) * 0.08;
        const centred = 1 - Math.abs(i - (icicles - 1) / 2) / icicles;
        const length = Math.min(panY - 0.004, mix(0.02, 0.11, random() * 0.5 + centred * 0.5) * mix(0.6, 1.3, a.cascade));
        longest = Math.max(longest, length);
        const x = Math.cos(angle) * edge, z = Math.sin(angle) * edge;
        s.ball([0.012, 0.006, 0.012], [x * 0.94, panY + 0.006, z * 0.94], drip, 8);
        s.rod([x, panY + 0.006, z], [x, panY + 0.004 - length, z], 0.007, drip, 0.0018);
        if (length > panY - 0.01) s.ball([0.02 + random() * 0.02, 0.005, 0.018 + random() * 0.016], [x * 1.05, 0.004, z * 1.05], drip, 10);
      }
      // What dripped clear to the table.
      for (let i = 0; i < 3 + Math.floor(a.cascade * 5); i++) {
        const angle = breachAngle + (random() - 0.5) * 0.9, d = edge + random() * 0.03;
        s.ball([0.007 + random() * 0.012, 0.003, 0.007 + random() * 0.012], [Math.cos(angle) * d, 0.002, Math.sin(angle) * d], drip, 8);
      }
    }

    // ---- wick, flame, smoke ----
    const wickLen = a.flame === 'flaring' ? 0.03 : 0.014;
    const wickBend = 0.007 + random() * 0.006;
    const wickBase: P3 = [0, tall - 0.011, 0];
    const wickTip: P3 = [wickBend, tall - 0.011 + wickLen, wickBend * 0.4];
    inCandle(s.tube([wickBase, [0, tall - 0.011 + wickLen * 0.6, 0], wickTip], 0.0017, s.material('#161312', { roughness: 1 })));
    const flameGroup = new THREE.Group();
    flameGroup.position.set(wickTip[0] * 0.5, wickTip[1] - 0.006, wickTip[2] * 0.5);
    candle.add(flameGroup);
    let smoke: THREE.Mesh | null = null;
    if (lit) {
      const size = { steady: 1, guttering: 0.5, flaring: 1.5 }[a.flame as 'steady' | 'guttering' | 'flaring'];
      const tear = (scale: number, height: number): THREE.Vector2[] => [[0, 0], [0.006, 0.004], [0.0105, 0.014], [0.0085, 0.028], [0.004, 0.044], [0, 0.058]].map(([x, y]) => new THREE.Vector2(x * scale, y * height));
      const outer = new THREE.Mesh(new THREE.LatheGeometry(tear(size * (a.flame === 'guttering' ? 1.2 : 1), size), 14), new THREE.MeshStandardMaterial({ color: '#ffb23c', emissive: glowTone.clone().offsetHSL(0.01, 0, 0.05), emissiveIntensity: 2.6, roughness: 1 }));
      const core = new THREE.Mesh(new THREE.LatheGeometry(tear(size * 0.5, size * 0.62), 12), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#fff0b0', emissiveIntensity: 3.2 }));
      core.position.y = 0.004;
      const blue = new THREE.Mesh(new THREE.SphereGeometry(0.0062 * size, 10, 8), new THREE.MeshStandardMaterial({ color: '#4f7de0', emissive: '#3d6be0', emissiveIntensity: 1.6 }));
      blue.position.y = 0.004;
      blue.scale.y = 0.7;
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.04 * size, 16, 12), new THREE.MeshBasicMaterial({ color: glowTone.clone().offsetHSL(0.02, 0, 0.1), transparent: true, opacity: 0.1, depthWrite: false }));
      halo.position.y = 0.03 * size;
      flameGroup.add(outer, core, blue, halo);
      if (a.flame === 'guttering') flameGroup.rotation.z = -0.75;
      if (a.flame === 'flaring') {
        const soot = new THREE.MeshStandardMaterial({ color: '#3b3632', transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
        smoke = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.08, 0], [0.012, 0.15, 0.004], [-0.01, 0.23, -0.004], [0.016, 0.32, 0.006]].map((p) => new THREE.Vector3(...(p as P3)))), 20, 0.003, 6), soot);
        flameGroup.add(smoke);
      }
    } else {
      if (a.flame === 'smoking') {
        const ember = s.ball([0.0032, 0.0032, 0.0032], wickTip, new THREE.MeshStandardMaterial({ color: '#ff5a1e', emissive: '#ff4a12', emissiveIntensity: 3 }), 8);
        inCandle(ember);
        const haze = new THREE.MeshStandardMaterial({ color: '#b9b6b0', transparent: true, opacity: 0.34, depthWrite: false, roughness: 1 });
        const path: P3[] = [[0, 0.004, 0], [0.006, 0.05, 0.002], [-0.01, 0.1, -0.004], [0.014, 0.16, 0.008], [-0.012, 0.22, 0.0], [0.02, 0.29, -0.01]];
        smoke = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p))), 30, 0.0035, 6), haze);
        smoke.position.set(...wickTip);
        candle.add(smoke);
      } else if (mood.wear > 0.3) {
        // Cobweb from the dead wick to the pan.
        const web = new THREE.MeshStandardMaterial({ color: '#e9e7de', roughness: 1 });
        for (let i = 0; i < 4; i++) {
          const angle = breachAngle + Math.PI + (i - 1.5) * 0.3;
          s.rod([wickTip[0], panY + wickTip[1], wickTip[2]], [Math.cos(angle) * panR, panY + 0.008, Math.sin(angle) * panR], 0.0006, web);
        }
      }
    }

    // ---- at its foot ----
    const reach = (a.holder === 'tripod' ? 0.13 : a.holder === 'dish' ? 0.14 : 0.11) + 0.05;
    const footAngle = breachAngle + Math.PI * 0.75;
    const fx = Math.cos(footAngle) * reach, fz = Math.sin(footAngle) * reach;
    if (a.foot === 'snuffer') {
      const cone = s.mesh(new THREE.ConeGeometry(0.022, 0.05, 14, 1, true), s.material('#8a7a4a', { metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide }), [fx, 0.02, fz]);
      cone.rotation.set(0, -footAngle, Math.PI / 2 - 0.25);
      s.rod([fx, 0.03, fz], [fx + Math.cos(footAngle + 1.4) * 0.16, 0.006, fz + Math.sin(footAngle + 1.4) * 0.16], 0.003, iron);
      const sx = fx - Math.cos(footAngle + 1.4) * 0.08, sz = fz - Math.sin(footAngle + 1.4) * 0.08;
      for (const k of [-1, 1]) {
        s.rod([sx, 0.004, sz], [sx + Math.cos(footAngle + k * 0.16) * 0.11, 0.004, sz + Math.sin(footAngle + k * 0.16) * 0.11], 0.003, iron, 0.0015);
        s.ring(0.012, 0.003, [sx - Math.cos(footAngle + k * 0.5) * 0.022, 0.004, sz - Math.sin(footAngle + k * 0.5) * 0.022], iron).rotation.x = Math.PI / 2;
      }
    } else if (a.foot === 'stubs') {
      const count = 2 + Math.floor(mood.density * 5);
      for (let i = 0; i < count; i++) {
        const angle = footAngle + (i - count / 2) * 0.42, d = reach + random() * 0.05;
        const h = 0.012 + random() * 0.03;
        const stub = s.cylinder(R * 0.9, R * 1.15, h, [Math.cos(angle) * d, h / 2, Math.sin(angle) * d], drip, 14);
        stub.rotation.y = random() * 3;
        s.rod([Math.cos(angle) * d, h, Math.sin(angle) * d], [Math.cos(angle) * d + 0.004, h + 0.008, Math.sin(angle) * d], 0.0016, s.material('#161312'));
        s.ball([R * 1.5, 0.004, R * 1.4], [Math.cos(angle) * d, 0.003, Math.sin(angle) * d], drip, 10);
      }
    } else if (a.foot === 'moth') {
      const mothWing = s.material('#b3a48a', { roughness: 1, side: THREE.DoubleSide });
      const onPan = a.holder !== 'block';
      const mx = onPan ? Math.cos(footAngle) * panR * 0.72 : fx, mz = onPan ? Math.sin(footAngle) * panR * 0.72 : fz, my = onPan ? panY + 0.004 : 0.003;
      s.ball([0.004, 0.004, 0.012], [mx, my + 0.002, mz], s.material('#5a4a3a'), 8).rotation.y = footAngle;
      for (const k of [-1, 1]) {
        const wing = s.mesh(new THREE.CircleGeometry(0.014, 3), mothWing, [mx + Math.cos(footAngle) * k * 0.01, my + 0.003, mz - Math.sin(footAngle) * k * 0.01]);
        wing.rotation.set(-Math.PI / 2 + k * 0.5, 0, footAngle + k * 0.6);
      }
    } else if (a.foot === 'tinder') {
      const box = s.cylinder(0.04, 0.04, 0.03, [fx, 0.015, fz], s.material('#7a6a4a', { metalness: 0.5, roughness: 0.5 }), 18);
      void box;
      s.cylinder(0.036, 0.036, 0.004, [fx, 0.03, fz], s.material('#1a1715', { roughness: 1 }), 16);
      const lid = s.cylinder(0.042, 0.042, 0.008, [fx + Math.cos(footAngle + 1) * 0.07, 0.012, fz + Math.sin(footAngle + 1) * 0.07], s.material('#7a6a4a', { metalness: 0.5, roughness: 0.5 }), 18);
      lid.rotation.x = 0.25;
      const fx2 = fx + Math.cos(footAngle - 1.2) * 0.08, fz2 = fz + Math.sin(footAngle - 1.2) * 0.08;
      s.ring(0.022, 0.005, [fx2, 0.005, fz2], iron, Math.PI * 1.5).rotation.x = Math.PI / 2;
      s.mesh(new THREE.IcosahedronGeometry(0.016, 0), new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.4, flatShading: true }), [fx2 + 0.045, 0.012, fz2 + 0.02]);
    }

    const flick = mix(0.35, 1.8, mood.energy) * (a.flame === 'guttering' ? 2 : a.flame === 'flaring' ? 1.5 : a.flame === 'steady' ? 0.5 : 1);
    const baseLean = flameGroup.rotation.z;
    return s.finish({
      update: (_dt, time) => {
        if (lit) {
          const w = Math.sin(time * 9 * flick) * 0.5 + Math.sin(time * 23.7 * flick) * 0.3 + Math.sin(time * 3.1) * 0.2;
          flameGroup.scale.set(1 - w * 0.05, 1 + w * 0.12 * flick, 1 - w * 0.05);
          flameGroup.rotation.z = baseLean + Math.sin(time * 5.3 * flick) * 0.06 * flick;
        }
        if (smoke) smoke.rotation.y = time * 0.6;
      },
    });
  },
});
