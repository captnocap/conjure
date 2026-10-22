import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';
import { Bag, V, WOOL, crimp, matte, plied, tube, xf } from './bits';

const TRIM = { cream: '#d9cfb4', red: '#b23a34', mustard: '#c79a36', sky: '#7fa9cf', pink: '#cf8ea0' } as const;
const SKIES = { grey: '#c3c9ce', whiteout: '#dfe4e7', dusk: '#a3adc8', dawn: '#dfcbc8', lamplit: '#d8c59c' } as const;
// An eight-pointed Selbu star, the motif on every Norwegian mitten.
const STAR = ['....#....', '#...#...#', '.#..#..#.', '..#.#.#..', '#########', '..#.#.#..', '.#..#..#.', '#...#...#', '....#....'];

export default defineWorld({
  questions: {
    wool: choice('What colour is the mitten?', {
      charcoal: 'Charcoal grey.', navy: 'Navy blue.', oxblood: 'Deep oxblood red.', forest: 'Forest green.', heather: 'Heathered grey-lilac.', teal: 'Teal.', mustard: 'Mustard.',
    }),
    knit: choice('How is it knitted?', {
      stocking: 'Smooth stocking stitch: straight furrows of little Vs running away from you.',
      garter: 'Garter stitch: bumpy ridges running across like a ploughed field.',
      rib: 'Deep ribbing: raised columns and shadowed channels.',
      cable: 'Stocking stitch with fat twisted cables running through it like hedgerows.',
      fairisle: 'Fair Isle colourwork: pale stars and zigzags knitted into the dark ground.',
    }),
    trim: choice('What colour is the second yarn, used for trims, patterns and mending?', {
      cream: 'Cream.', red: 'Bright red.', mustard: 'Mustard.', sky: 'Sky blue.', pink: 'Dusty pink.',
    }),
    landmark: choice('What rises at the far edge of the field?', {
      cuff: 'The ribbed cuff, a corrugated wall with a stripe round it.',
      thumb: 'The thumb, a rounded knitted hill.',
      pompom: 'A pompom on a plaited cord, a shaggy boulder.',
      button: 'A big sewn-on button, lying like a millstone.',
      cord: 'The mitten string, a thick plaited cord snaking across.',
    }),
    snowfall: choice('What is falling?', {
      none: 'Nothing now. It has just stopped.',
      few: 'A few big slow flakes, each one separate.',
      steady: 'Steady snow, the air full of flakes.',
      squall: 'A squall of small hard pellets coming in on a slant.',
    }),
    settled: score('How much snow has settled on the wool?', ['The first few flakes', 'A scattering resting on the fuzz', 'Flakes everywhere and drifts in the furrows']),
    sky: choice('What is the sky like?', {
      grey: 'Soft even grey, a snow sky.',
      whiteout: 'Bright white, the air itself glowing.',
      dusk: 'Blue dusk, the light going.',
      dawn: 'Pale pink early morning.',
      lamplit: 'Amber, snow falling through a street lamp.',
    }),
    story: choice('What is the mitten doing?', {
      held: 'Held out flat to catch flakes and look at them.',
      lost: 'Lost: dropped on a path, a bank of snow already creeping over one corner.',
      caked: 'Just back from snowballing: clots of packed snow stuck all over the fibres.',
      mended: 'Old and loved: a darned patch in the other yarn shows in the field.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const slots = [[0, 1.4, 0.16], [-3.9, -1.2, 0.16], [3.9, -1.2, 0.16], [-3.7, 3.1, 0.16], [3.7, 3.1, 0.16], [0, -2.6, 0.16, 0.9]] as const;
    const dye = new THREE.Color(WOOL[a.wool]).lerp(new THREE.Color('#8d9097'), 0.1).multiplyScalar(0.72).offsetHSL(0, (mood.cheer - 0.5) * 0.14 - mood.wear * 0.06, mood.wear * 0.04);
    const trim = new THREE.Color(TRIM[a.trim]).offsetHSL(0, (mood.cheer - 0.5) * 0.12, 0);
    const sky = new THREE.Color(SKIES[a.sky]);
    const { art: s, world } = diorama(context, { background: `#${sky.getHexString()}`, floor: `#${dye.clone().multiplyScalar(0.62).getHexString()}`, width: 14, depth: 11, maxHeight: 3.9, radius: 1.75, pitch: 31, yaw: 26, slots });
    const root = s.root;
    const W = 14, D = 11, shade = (c: THREE.Color, amount = 0.08) => c.clone().offsetHSL(a.wool === 'heather' ? (random() - 0.5) * 0.06 : 0, 0, (random() - 0.5) * amount);
    const nearSlot = (x: number, z: number, r: number) => slots.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < r);
    const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
    /** The lie of the land: flat where the cast stands, swelling toward the far edge. */
    const ground = (x: number, z: number) => smooth((-3.7 - z) / 1.8) * 0.8 + Math.sin(x * 0.55 + 1) * Math.sin(z * 0.5) * 0.04;

    // ---- The knit: every stitch is two instanced lobes. ----
    const px = 0.7, pz = 0.5, cols = Math.round(W / px), rows = Math.round(D / pz);
    const lobes: { m: THREE.Matrix4; c: THREE.Color }[] = [];
    const q = new THREE.Quaternion(), up = V(0, 1, 0);
    const lobe = (x: number, y: number, z: number, turn: number, size: THREE.Vector3, c: THREE.Color) => lobes.push({ m: new THREE.Matrix4().compose(V(x, y, z), q.setFromAxisAngle(up, turn).clone(), size), c });
    const cables = a.knit === 'cable' ? [3, 4, cols - 5, cols - 4, Math.floor(cols / 2) - 5, Math.floor(cols / 2) + 4] : [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = -W / 2 + px * (c + 0.5), z = -D / 2 + pz * (r + 0.5), y0 = ground(x, z);
      let tint = shade(dye, 0.07), raise = 0;
      if (a.knit === 'fairisle') {
        const band = r % 13, cell = c % 10;
        const on = band < 9 ? cell < 9 && STAR[band][cell] === '#' : band === 10 ? (c + r) % 2 === 0 : band === 11 ? c % 4 < 2 : false;
        if (on) tint = shade(trim, 0.05);
      }
      if (cables.includes(c)) continue;
      if (a.knit === 'garter' && r % 2 === 0) { lobe(x, y0 + 0.13, z, 0, V(0.36, 0.2, 0.24), tint.offsetHSL(0, 0, 0.03)); continue; }
      if (a.knit === 'rib') { if (c % 4 >= 2) { lobe(x, y0 + 0.02, z, 0, V(0.33, 0.1, 0.24), tint.offsetHSL(0, 0, -0.05)); continue; } raise = 0.2; }
      for (const side of [-1, 1]) lobe(x + side * px * 0.23, y0 + 0.06 + raise, z, side * 0.42, V(0.19, 0.14 + raise * 0.5, 0.35), side < 0 ? tint : tint.clone().offsetHSL(0, 0, -0.025));
    }
    const lobeGeometry = new THREE.SphereGeometry(1, 9, 6);
    const stitches = new THREE.InstancedMesh(lobeGeometry, matte({ roughness: 0.95 }), lobes.length);
    lobes.forEach((entry, i) => { stitches.setMatrixAt(i, entry.m); stitches.setColorAt(i, entry.c); });
    stitches.castShadow = stitches.receiveShadow = true;
    root.add(stitches);

    const yarn = new Bag(), snow = new Bag(), pale = new Bag(), hard = new Bag();
    if (a.knit === 'cable') for (const centre of [3.5, cols - 4.5, Math.floor(cols / 2) - 0.5 - 4, Math.floor(cols / 2) + 0.5 + 4]) {
      const x0 = -W / 2 + px * (centre + 0.5);
      for (const strand of [0, 1]) {
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 60; i++) { const z = -D / 2 + (i / 60) * D, ph = (i / 60) * Math.PI * 7 + strand * Math.PI; points.push(V(x0 + Math.sin(ph) * 0.3, ground(x0, z) + 0.2 + Math.cos(ph) * 0.13, z)); }
        yarn.add(tube(points, 0.24, { sides: 8, colour: plied(shade(dye, 0.04).offsetHSL(0, 0, 0.03), 40) }));
      }
    }

    // ---- Landmark at the far edge. ----
    const knitTexture = (base: THREE.Color) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${base.clone().multiplyScalar(0.7).getHexString()}`; ctx.fillRect(0, 0, 256, 256);
      ctx.lineCap = 'round'; ctx.lineWidth = 11;
      for (let r = -1; r < 9; r++) for (let c = 0; c < 8; c++) {
        ctx.strokeStyle = `#${base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06 + 0.02).getHexString()}`;
        ctx.beginPath(); ctx.moveTo(c * 32 + 4, r * 32); ctx.lineTo(c * 32 + 16, r * 32 + 30); ctx.lineTo(c * 32 + 28, r * 32); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    let cap: { at: THREE.Vector3; size: THREE.Vector3 } | null = null;
    if (a.landmark === 'cuff') {
      const ribs = 24, high = 2.5;
      for (let i = 0; i < ribs; i++) {
        const x = -W / 2 + (i + 0.5) * (W / ribs), tone = shade(dye, 0.05).offsetHSL(0, 0, i % 2 ? 0.02 : -0.03), r = i % 2 ? 0.3 : 0.24, z = -5.0 + (i % 2 ? 0.08 : -0.06);
        yarn.add(new THREE.CylinderGeometry(r, r, high * 0.5, 10), tone, xf(V(x, high * 0.25 + 0.3, z)));
        yarn.add(new THREE.CylinderGeometry(r * 1.02, r * 1.02, high * 0.2, 10), shade(trim, 0.05), xf(V(x, high * 0.6 + 0.3, z)));
        yarn.add(new THREE.CylinderGeometry(r, r, high * 0.3, 10), tone, xf(V(x, high * 0.85 + 0.3, z)));
        yarn.add(new THREE.SphereGeometry(r * 1.25, 10, 8), tone, xf(V(x, high + 0.3, z)));
      }
      cap = { at: V(0, high + 0.55, -5), size: V(W * 0.5, 0.16, 0.36) };
    } else if (a.landmark === 'thumb') {
      const map = knitTexture(dye); map.repeat.set(5, 4);
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      hill.scale.set(2.3, 2.9, 1.8); hill.position.set(-3.6, 0.3, -4.5); hill.rotation.z = 0.28;
      hill.castShadow = hill.receiveShadow = true;
      root.add(hill);
      for (let i = 0; i < 70; i++) {
        const d = V(random() - 0.5, random() * 0.9 + 0.1, random() * 0.6 + 0.2).normalize(), from = V(d.x * 2.3, d.y * 2.9, d.z * 1.8).applyAxisAngle(V(0, 0, 1), 0.28).add(hill.position);
        yarn.add(tube(crimp(from, from.clone().addScaledVector(d, 0.3 + random() * 0.4), 0.05, 2 + random() * 2, random, 0.2), (t) => mix(0.022, 0.008, t), { sides: 4 }), shade(dye, 0.16).offsetHSL(0, 0, 0.07));
      }
      cap = { at: V(-4.35, 3.05, -4.45), size: V(1.1, 0.2, 0.9) };
    } else if (a.landmark === 'pompom') {
      const at = V(3.9, 1.45, -4.2), R = 1.35;
      yarn.add(new THREE.IcosahedronGeometry(R * 0.8, 2), trim.clone().multiplyScalar(0.75), xf(at));
      for (let i = 0; i < 520; i++) {
        const d = V(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), tip = at.clone().addScaledVector(d, R * (0.9 + random() * 0.2)).add(V((random() - 0.5) * 0.2, (random() - 0.5) * 0.2, (random() - 0.5) * 0.2));
        yarn.add(tube([at.clone().addScaledVector(d, R * 0.6), tip], (t) => mix(0.07, 0.05, t), { sides: 4 }), shade(i % 5 ? trim : dye, 0.12));
      }
      const path = [at.clone().add(V(-0.9, -0.9, 0)), V(1.6, 0.35, -4.5), V(-0.8, 0.4, -4.1), V(-3.4, 0.4, -4.7), V(-7, 0.5, -4.3)];
      for (const ply of [0, 1]) yarn.add(tube(new THREE.CatmullRomCurve3(path).getPoints(70).map((p, k) => p.add(V(0, Math.sin(k * 0.7 + ply * Math.PI) * 0.1, Math.cos(k * 0.7 + ply * Math.PI) * 0.1))), 0.13, { sides: 6, colour: plied(ply ? trim : dye, 18) }));
      cap = { at: at.clone().add(V(0, R * 0.9, 0)), size: V(R * 0.7, 0.2, R * 0.7) };
    } else if (a.landmark === 'button') {
      const at = V(3.8, 1.25, -4.3), tiltQ = new THREE.Euler(0.95, 0.2, 0.1), R = 1.6, horn = new THREE.Color(a.trim === 'cream' ? '#a88a62' : TRIM[a.trim]).offsetHSL(0, -0.1, -0.05);
      const place = (g: THREE.BufferGeometry, c: THREE.ColorRepresentation, local: THREE.Matrix4) => hard.add(g, c, xf(at, 1, tiltQ).multiply(local));
      place(new THREE.CylinderGeometry(R, R * 1.03, 0.3, 40), horn, xf(V(0, 0, 0)));
      place(new THREE.TorusGeometry(R * 0.9, 0.12, 8, 44), horn.clone().offsetHSL(0, 0, 0.06), xf(V(0, 0.15, 0), 1, new THREE.Euler(Math.PI / 2, 0, 0)));
      for (const [hx, hz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) place(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 14), '#1c1d20', xf(V(hx * 0.36, 0.005, hz * 0.36)));
      for (const d of [-1, 1]) for (const o of [-0.05, 0.05]) yarn.add(tube([V(-0.36, 0.14, -0.36 * d + o), V(0, 0.24, o), V(0.36, 0.14, 0.36 * d + o)].map((p) => p.applyEuler(tiltQ).add(at)), 0.055, { sides: 6, smooth: 10 }), shade(trim, 0.05));
      cap = { at: at.clone().add(V(0, 1.35, -0.75)), size: V(0.9, 0.14, 0.3) };
    } else {
      const path = [V(-7.2, 0.6, -4.0), V(-4.4, 0.75, -4.9), V(-1.8, 0.7, -3.9), V(0.6, 0.75, -4.8), V(2.6, 0.95, -4.1), V(3.6, 1.5, -4.5), V(2.9, 0.9, -5.0), V(4.6, 0.7, -4.4), V(7.2, 0.6, -4.9)];
      for (const ply of [0, 1, 2]) yarn.add(tube(new THREE.CatmullRomCurve3(path).getPoints(120).map((p, k) => p.add(V(0, Math.sin(k * 0.5 + ply * 2.09) * 0.2, Math.cos(k * 0.5 + ply * 2.09) * 0.2))), 0.24, { sides: 7, colour: plied(ply === 1 ? trim : shade(dye, 0.04).offsetHSL(0, 0, 0.03), 30) }));
      for (let i = 0; i < 60; i++) {
        const p = new THREE.CatmullRomCurve3(path).getPoint(random()), d = V(random() - 0.5, random(), random() - 0.2).normalize();
        yarn.add(tube(crimp(p.clone().addScaledVector(d, 0.35), p.clone().addScaledVector(d, 0.7 + random() * 0.4), 0.05, 3, random, 0.2), 0.014, { sides: 4 }), shade(dye, 0.16).offsetHSL(0, 0, 0.08));
      }
    }

    // ---- Story dressing. ----
    if (a.story === 'mended') {
      const cx = 3.95, cz = 1.0, n = 8, span = 0.66;
      for (let i = 0; i < n; i++) for (const weft of [false, true]) {
        const o = mix(-span, span, i / (n - 1)), points: THREE.Vector3[] = [];
        for (let k = 0; k <= 30; k++) {
          const t = mix(-span - 0.12, span + 0.12, k / 30), cell = ((t + span) / (2 * span)) * (n - 1), liftY = Math.cos(cell * Math.PI + (i % 2 ? Math.PI : 0)) * 0.045 * (weft ? 1 : -1);
          points.push(weft ? V(cx + t, 0.3 + liftY, cz + o) : V(cx + o, 0.3 + liftY, cz + t));
        }
        yarn.add(tube(points, 0.07, { sides: 6, colour: plied(shade(trim, 0.07), 9) }));
      }
      yarn.add(tube(crimp(V(cx + span, 0.3, cz + span), V(cx + span + 0.7, 0.9, cz + span + 0.3), 0.06, 3, random, 0.5), 0.06, { sides: 6 }), trim);
    } else if (a.story === 'lost') {
      for (let i = 0; i < 9; i++) snow.add(new THREE.SphereGeometry(1, 16, 10), '#edf2f7', xf(V(6.3 - random() * 1.2, 0.1, 4.8 - i * 0.62 + random() * 0.3), V(0.7 + random() * 0.5, 0.35 + random() * 0.5, 0.6 + random() * 0.3)));
      for (let i = 0; i < 6; i++) snow.add(new THREE.SphereGeometry(1, 16, 10), '#edf2f7', xf(V(6.2 - i * 0.75, 0.1, 4.9 - random() * 0.5), V(0.6 + random() * 0.4, 0.3 + random() * 0.35, 0.5)));
      for (let i = 0; i < 26; i++) hard.add(new THREE.DodecahedronGeometry(1, 0), ['#5a5248', '#7c7466', '#3f3a34'][i % 3], xf(V(1.5 + random() * 3.6, 0.26, 4.2 + random() * 1), V(0.07, 0.05, 0.07).multiplyScalar(0.6 + random() * 1.3), new THREE.Euler(random(), random(), 0)));
    } else if (a.story === 'caked') {
      for (let i = 0, tries = 0; i < 20 && tries < 200; tries++) {
        const x = (random() - 0.5) * (W - 1), z = (random() - 0.5) * (D - 1), r = 0.22 + random() * 0.3;
        if (nearSlot(x, z, 1.8 + r)) continue;
        snow.add(new THREE.IcosahedronGeometry(1, 2), '#eef3f8', xf(V(x, ground(x, z) + 0.28 + r * 0.5, z), V(r, r * 0.78, r), new THREE.Euler(random(), random(), random())));
        for (let k = 0; k < 4; k++) snow.add(new THREE.IcosahedronGeometry(1, 1), '#e3ebf3', xf(V(x + (random() - 0.5) * r * 2.4, ground(x, z) + 0.3, z + (random() - 0.5) * r * 2.4), 0.05 + random() * 0.08));
        i++;
      }
    }

    // ---- Fibres standing like winter grass, and pills where the wool has worn. ----
    const fibreGeometry = tube(crimp(V(0, 0, 0), V(0.12, 1, 0), 0.05, 2.5, random, 0.12), (t) => mix(0.022, 0.006, t), { sides: 4 });
    const fibreCount = Math.round(mix(260, 620, mood.density * 0.6 + mood.wear * 0.4));
    const fibres = new THREE.InstancedMesh(fibreGeometry, matte({ roughness: 1 }), fibreCount);
    const landing: THREE.Vector3[] = [];
    const m4 = new THREE.Matrix4(), e = new THREE.Euler();
    for (let i = 0; i < fibreCount; i++) {
      const x = (random() - 0.5) * (W - 0.4), z = (random() - 0.5) * (D - 0.4), close = nearSlot(x, z, 1.6), tall = (close ? 0.25 : 0.4 + random() * 0.75) * (0.8 + random() * 0.4);
      m4.compose(V(x, ground(x, z) + 0.14, z), q.setFromEuler(e.set((random() - 0.5) * 0.7, random() * Math.PI * 2, (random() - 0.5) * 0.7)), V(1, tall, 1));
      fibres.setMatrixAt(i, m4); fibres.setColorAt(i, shade(dye, 0.18).offsetHSL(0, 0, 0.09));
      if (!close && tall > 0.5) landing.push(V(x + 0.05, ground(x, z) + 0.14 + tall * 0.82, z));
    }
    fibres.castShadow = true;
    root.add(fibres);
    for (let i = 0; i < Math.round(mood.wear * 26); i++) {
      const x = (random() - 0.5) * (W - 1), z = (random() - 0.5) * (D - 1);
      if (!nearSlot(x, z, 1.7)) yarn.add(new THREE.IcosahedronGeometry(1, 1), shade(dye, 0.14).offsetHSL(0, 0, 0.06), xf(V(x, ground(x, z) + 0.28, z), 0.1 + random() * 0.1));
    }

    // ---- Snow crystals: one flat star and one plate, instanced for resting and falling. ----
    const star = new Bag(), plate = new Bag();
    for (let arm = 0; arm < 6; arm++) {
      const turn = new THREE.Matrix4().makeRotationY((arm / 6) * Math.PI * 2);
      star.add(new THREE.BoxGeometry(0.11, 0.05, 1).translate(0, 0, 0.5), '#ffffff', turn);
      for (const [t, len] of [[0.42, 0.3], [0.68, 0.2]]) for (const side of [-1, 1]) star.add(new THREE.BoxGeometry(0.075, 0.045, len).translate(0, 0, len / 2), '#ffffff', turn.clone().multiply(xf(V(0, 0, t), 1, new THREE.Euler(0, side * 1.047, 0))));
      plate.add(new THREE.BoxGeometry(0.09, 0.05, 0.62).translate(0, 0, 0.31), '#ffffff', turn);
      plate.add(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 6), '#ffffff', turn.clone().multiply(xf(V(0, 0, 0.72))));
    }
    star.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 6), '#ffffff');
    plate.add(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 6), '#ffffff');
    const flakeGeometries = [star.geometry(), plate.geometry()];
    const iceTint = new THREE.Color('#f4f9fd').lerp(sky, 0.12);
    const flakeMaterial = new THREE.MeshStandardMaterial({ color: iceTint, roughness: 0.3, emissive: '#9cb9d4', emissiveIntensity: mix(0.25, 0.45, mood.cheer), flatShading: true });
    const restCount = Math.min(landing.length, Math.round(mix(8, 95, a.settled) * mix(0.8, 1.2, mood.density)));
    const melted = Math.round(restCount * Math.max(0, mood.warmth - 0.55) * 1.4);
    const resting = [0, 1].map((kind) => {
      const mine = Math.ceil((restCount - melted) / 2) + 1, mesh = new THREE.InstancedMesh(flakeGeometries[kind], flakeMaterial, mine);
      mesh.count = 0; mesh.castShadow = true; root.add(mesh);
      return mesh;
    });
    for (let i = 0; i < restCount; i++) {
      const at = landing.splice(Math.floor(random() * landing.length), 1)[0], size = 0.2 + random() ** 2 * 0.3;
      if (i < melted) { pale.add(new THREE.SphereGeometry(1, 12, 8), '#cfe2f0', xf(at, V(size * 0.5, size * 0.42, size * 0.5))); continue; }
      const mesh = resting[i % 2];
      m4.compose(at, q.setFromEuler(e.set((random() - 0.5) * 0.7, random() * 6.28, (random() - 0.5) * 0.7)), V(size, size, size));
      if (mesh.count < mesh.instanceMatrix.count) mesh.setMatrixAt(mesh.count++, m4);
    }
    if (a.settled > 0.55) {
      const drifts = Math.round((a.settled - 0.55) * 60);
      for (let i = 0, tries = 0; i < drifts && tries < 300; tries++) {
        const c = Math.floor(random() * cols), x = -W / 2 + px * c, z = (random() - 0.5) * (D - 1);
        if (nearSlot(x, z, 1.7)) continue;
        snow.add(new THREE.SphereGeometry(1, 12, 8), '#eaf0f6', xf(V(x, ground(x, z) + 0.12, z), V(0.16 + random() * 0.1, 0.12 + random() * 0.06, 0.5 + random() * 0.9)));
        i++;
      }
      if (cap) snow.add(new THREE.SphereGeometry(1, 20, 10), '#eef3f8', xf(cap.at, cap.size));
    }

    // Falling: wrapped through a box of air above the field; the hero's column is kept clear.
    const fallCount = { none: 0, few: 14, steady: 70, squall: 150 }[a.snowfall], pellets = a.snowfall === 'squall';
    const pelletGeometry = pellets ? new THREE.IcosahedronGeometry(1, 1) : flakeGeometries[0];
    const falling = fallCount ? [0, 1].map((kind) => { const mesh = new THREE.InstancedMesh(pellets ? pelletGeometry : flakeGeometries[kind], flakeMaterial, Math.ceil(fallCount / 2)); mesh.castShadow = !pellets; root.add(mesh); return mesh; }) : [];
    const drops = Array.from({ length: fallCount }, () => {
      let x = 0, z = 0;
      do { x = (random() - 0.5) * W; z = (random() - 0.5) * D; } while (Math.hypot(x - slots[0][0], z - slots[0][1]) < 2.1);
      return { x, z, y: 0.8 + random() * 4.6, size: pellets ? 0.05 + random() * 0.06 : a.snowfall === 'few' ? 0.3 + random() * 0.25 : 0.13 + random() * 0.2, tilt: e.set(random() * 2 - 1, random() * 6, random() * 2 - 1).clone(), spin: (random() - 0.5) * 2, rate: 0.7 + random() * 0.6 };
    });
    const top = 5.6, floorY = 0.55, speed = mix(0.12, 1.5, mood.energy) * (pellets ? 2.4 : 1), slant = (pellets ? 0.9 : 0.25) * mix(0.3, 1.2, mood.energy);
    const layFalling = (time: number) => {
      drops.forEach((drop, i) => {
        const travelled = time * speed * drop.rate, span = top - floorY, y = floorY + ((((drop.y - floorY - travelled) % span) + span) % span);
        const x = ((((drop.x + (top - y) * slant + W / 2) % W) + W) % W) - W / 2;
        m4.compose(V(x, y, drop.z), q.setFromEuler(e.set(drop.tilt.x + time * drop.spin * 0.4, drop.tilt.y + time * drop.spin, drop.tilt.z)), V(drop.size, drop.size, drop.size));
        falling[i % 2].setMatrixAt(Math.floor(i / 2), m4);
      });
      for (const mesh of falling) mesh.instanceMatrix.needsUpdate = true;
    };
    if (fallCount) layFalling(0);

    // Out-of-focus flakes far behind: pale discs in the sky, never measured as solid.
    const bokeh = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').lerp(sky, 0.25), transparent: true, opacity: 0.4, depthWrite: false });
    const discs = a.snowfall === 'none' ? 4 : 11;
    for (let i = 0; i < discs; i++) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.25 + random() * 0.5, 6), bokeh);
      disc.position.set((random() - 0.5) * 15, 3.2 + random() * 3, -6.5 - random() * 2);
      disc.rotation.z = random();
      root.add(disc);
    }

    yarn.into(root, matte({ roughness: 0.95 }));
    snow.into(root, matte({ roughness: 0.9, emissive: '#9fb2c6', emissiveIntensity: 0.2 }));
    pale.into(root, new THREE.MeshPhysicalMaterial({ roughness: 0.04, clearcoat: 1, emissive: '#7fa9cc', emissiveIntensity: 0.2 }));
    hard.into(root, matte({ roughness: 0.5 }));

    if (fallCount) world.update = (_dt, time) => layFalling(time);
    return world;
  },
});
