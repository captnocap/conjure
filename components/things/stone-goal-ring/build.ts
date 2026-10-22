import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { PAINT, bladeGeometry, fret, glyph, lerpHex, paintCanvas, prism, stone, stoneTone, textured, tuft, weather } from './maya';

const COLOURS = { red: PAINT.red, blue: PAINT.blue, ochre: PAINT.ochre, cream: PAINT.cream } as const;

export default defineThing({
  questions: {
    carving: choice('What is carved around the hoop?', {
      serpents: 'Two feathered serpents coiled round and round the rim, heads meeting at the front.',
      glyphs: 'A flat band of glyph blocks circling the hole like a calendar.',
      solar: 'Pointed rays around the rim, the hoop as a sun disc.',
      plain: 'Nothing: a blunt, smooth stone doughnut.',
    }),
    wall: choice('What kind of wall carries it?', {
      apron: 'A sheer upper wall rising from a long sloping apron the ball can run up.',
      sheer: 'A tall sheer wall with a band of carved panels below the ring.',
      fragment: 'A broken free-standing chunk of masonry with a jagged top, all that still stands.',
    }),
    height: score('How high above the playing floor is the ring?', ['Just overhead, reachable with a leap', 'Twice head height', 'Three storeys up, almost out of reach']),
    hole: score('How wide is the hole?', ['Barely wider than the ball', 'A fair target', 'Generous, wide as a cartwheel']),
    paint: choice('If its paint survives, what colour is the ring?', {
      red: 'Blood red, the colour of the east and of sacrifice.',
      blue: 'Maya blue, turquoise and rain.',
      ochre: 'Golden ochre, maize and sun.',
      cream: 'Bare cream stucco with dark outlines.',
    }),
    moment: choice('What is happening at the ring right now?', {
      waiting: 'Nothing. It hangs empty above an empty court.',
      scoring: 'A black rubber ball is caught in the instant it passes through the hoop.',
      festival: 'It is dressed for a game day: marigold garlands and long coloured streamers hang from it.',
      fallen: 'The ring has snapped off its tenon and lies on the ground below the broken stump.',
      overgrown: 'Lianas have grown down the wall and threaded themselves through the hoop.',
      nested: 'A bird has built a twig nest in the bottom of the hoop.',
    }),
    foot: choice('What lies at the foot of the wall?', {
      nothing: 'Bare ground.',
      ball: 'A rubber ball left where it stopped rolling.',
      offerings: 'Clay bowls, flowers and a small smoking censer.',
      rubble: 'Fallen facing stones and a tumbled cornice block.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const fresh = Math.max(0, Math.min(1, 1.15 - wear * 1.5));
    const base = stoneTone(wear);
    const W = 2.7, T = 0.9;
    const H = mix(3.1, 5.6, a.height) * (a.wall === 'fragment' ? 0.92 : 1);
    const ri = mix(0.22, 0.5, a.hole), ro = ri + 0.36, thick = 0.34;
    const cy = H - ro - 0.45, cz = ro + 0.28;
    const colour = COLOURS[a.paint];
    const dado = a.paint === 'red' ? PAINT.blue : PAINT.red;

    // Wall face: coursed stone under painted stucco, a fret border and, on the sheer wall, glyph panels.
    const face = paintCanvas(512, Math.round(512 * H / W), (ctx, w, h) => {
      stone(ctx, w, h, random, { base, wear: 0, course: 44, block: 96 });
      const px = h / H;
      if (fresh > 0) {
        ctx.globalAlpha = fresh * 0.9;
        ctx.fillStyle = PAINT.cream; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = dado; ctx.fillRect(0, h - px * 1.2, w, px * 1.2);
        ctx.fillStyle = colour; ctx.fillRect(0, 0, w, px * 0.5);
        fret(ctx, 0, px * 0.08, w, px * 0.34, PAINT.black);
        ctx.globalAlpha = 1;
      }
      if (a.wall === 'sheer') {
        const size = px * 0.55, top = (H - cy + ro + 0.35) * px;
        ctx.fillStyle = lerpHex(base, '#6d6558', 0.25);
        ctx.fillRect(w * 0.08, top - 6, w * 0.84, size * 2 + 12);
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 6; col++) glyph(ctx, w * 0.1 + col * (w * 0.8 / 6), top + row * size, Math.min(size, w * 0.8 / 6), random, '#3a3028', fresh > 0.2 ? lerpHex(base, col % 2 ? colour : PAINT.ochre, fresh) : undefined);
      }
      weather(ctx, w, h, random, wear);
    });
    const tile = paintCanvas(512, 512, (ctx, w, h) => stone(ctx, w, h, random, { base: fresh > 0.3 ? lerpHex(base, dado, fresh * 0.75) : base, wear, course: 64, block: 128 }));
    const wallPaint = textured(face);
    const tilePaint = textured(tile, { side: THREE.DoubleSide });
    const plain = s.material(base, { roughness: 0.9 });
    const dark = s.material(lerpHex(base, '#4a443a', 0.5), { roughness: 0.95 });

    if (a.wall === 'fragment') {
      // A stepped, broken silhouette: columns of masonry of unequal height.
      const columns = 6;
      for (let i = 0; i < columns; i++) {
        const centreWeight = 1 - Math.abs(i - (columns - 1) / 2) / columns * 1.5;
        const h = Math.max(1.2, H * mix(0.45, 1, centreWeight) - random() * 0.6 + (i === 2 || i === 3 ? 0.3 : 0));
        const part = s.box([W / columns, Math.min(h, H + 0.2), T * (0.85 + random() * 0.15)], [-W / 2 + (i + 0.5) * W / columns, Math.min(h, H + 0.2) / 2, -T / 2], wallPaint);
        const uv = part.geometry.getAttribute('uv') as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / columns, uv.getY(k) * Math.min(h, H) / H);
      }
    } else {
      s.box([W, H, T], [0, H / 2, -T / 2], wallPaint);
      s.box([W + 0.24, 0.28, T + 0.24], [0, H + 0.14, -T / 2], plain);
      s.box([W + 0.1, 0.16, T + 0.1], [0, H - 0.5, -T / 2], plain);
    }
    const apron = a.wall === 'apron' ? 1.5 : 0;
    if (apron) s.mesh(prism([[0, 0], [apron, 0], [apron, 0.3], [0.05, Math.min(1.5, cy - ro - 0.5)], [0, Math.min(1.5, cy - ro - 0.5)]], W, 0.4), tilePaint);
    else if (a.wall === 'sheer') s.box([W + 0.2, 0.3, T + 0.5], [0, 0.15, -T / 2 + 0.15], plain);

    // The ring itself, built around the x axis in its own group so it can hang or lie fallen.
    const ring = new THREE.Group();
    const put = <M extends THREE.Object3D>(group: THREE.Object3D, node: M) => { group.add(node); return node; };
    const ringTone = lerpHex(base, colour, fresh * 0.9);
    const ringPaint = s.material(ringTone, { roughness: 0.85 });
    const bevel = 0.05;
    const hoop = put(ring, s.lathe([[ri, -thick / 2 + bevel], [ri + bevel, -thick / 2], [ro - bevel, -thick / 2], [ro, -thick / 2 + bevel], [ro, thick / 2 - bevel], [ro - bevel, thick / 2], [ri + bevel, thick / 2], [ri, thick / 2 - bevel], [ri, -thick / 2 + bevel]], ringPaint));
    hoop.rotation.z = Math.PI / 2;
    const faceArt = paintCanvas(384, 384, (ctx, w) => {
      const c = w / 2, outer = c * 0.98, inner = outer * ri / ro;
      ctx.fillStyle = ringTone; ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = lerpHex(ringTone, '#2c2620', 0.75); ctx.lineWidth = 5;
      for (const r of [outer * 0.96, inner * 1.08]) { ctx.beginPath(); ctx.arc(c, c, r, 0, 7); ctx.stroke(); }
      if (a.carving === 'glyphs') {
        const n = 10, size = (outer - inner) * 0.72;
        for (let i = 0; i < n; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i / n * Math.PI * 2); glyph(ctx, -size / 2, -(outer + inner) / 2 - size / 2, size, random, '#2c2620', fresh > 0.2 ? lerpHex(ringTone, PAINT.cream, 0.7) : lerpHex(ringTone, '#ffffff', 0.15)); ctx.restore(); }
      } else if (a.carving === 'solar') {
        ctx.fillStyle = fresh > 0.2 ? PAINT.ochre : lerpHex(ringTone, '#ffffff', 0.2);
        for (let i = 0; i < 16; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i / 16 * Math.PI * 2); ctx.beginPath(); ctx.moveTo(-outer * 0.09, -inner * 1.12); ctx.lineTo(0, -outer * 0.93); ctx.lineTo(outer * 0.09, -inner * 1.12); ctx.fill(); ctx.stroke(); ctx.restore(); }
      } else if (a.carving === 'serpents') {
        ctx.lineWidth = 3;
        for (let i = 0; i < 40; i++) { ctx.save(); ctx.translate(c, c); ctx.rotate(i / 40 * Math.PI * 2); ctx.beginPath(); ctx.arc(0, -(outer + inner) / 2, (outer - inner) * 0.2, 0, Math.PI); ctx.stroke(); ctx.restore(); }
      }
    });
    const facePaint = textured(faceArt, { side: THREE.DoubleSide, bumpScale: 2 });
    for (const side of [-1, 1]) {
      const disc = put(ring, s.mesh(new THREE.RingGeometry(ri + bevel, ro - bevel, 48), facePaint, [side * (thick / 2 + 0.004), 0, 0]));
      disc.rotation.y = side * Math.PI / 2;
    }
    if (a.carving === 'serpents') {
      const mid = (ri + ro) / 2, ar = (ro - ri) / 2 + 0.06, ax = thick / 2 + 0.06, turns = 6;
      [[PAINT.green, 0], [PAINT.red, Math.PI]].forEach(([tint, phase], which) => {
        const skin = s.material(lerpHex(base, tint as string, Math.max(0.35, fresh) * 0.95), { roughness: 0.75 });
        const points: [number, number, number][] = [];
        for (let i = 0; i < 120; i++) {
          const t = i / 120 * Math.PI * 2, r = mid + ar * Math.cos(turns * t + (phase as number));
          points.push([ax * Math.sin(turns * t + (phase as number)), r * Math.cos(t), r * Math.sin(t)]);
        }
        put(ring, s.tube(points, 0.055, skin, true));
        // Heads rear off the front of the rim, one above the other, jaws open.
        const head = new THREE.Group();
        const sign = which ? -1 : 1;
        put(head, s.ball([0.1, 0.085, 0.17], [0, 0, 0.08], skin, 14));
        put(head, s.box([0.15, 0.03, 0.16], [0, 0.05, 0.22], skin)).rotation.x = -0.35;
        put(head, s.box([0.13, 0.03, 0.14], [0, -0.05, 0.2], skin)).rotation.x = 0.3;
        const plume = put(head, new THREE.InstancedMesh(bladeGeometry(0.34, 0.09, 1.1), new THREE.MeshStandardMaterial({ color: lerpHex(base, which ? PAINT.ochre : PAINT.green, Math.max(0.25, fresh)), roughness: 0.8, side: THREE.DoubleSide }), 5));
        const dummy = new THREE.Object3D();
        for (let k = 0; k < 5; k++) { dummy.position.set((k - 2) * 0.035, 0.05, 0); dummy.rotation.set(-0.5 - random() * 0.3, 0, (k - 2) * -0.22); dummy.updateMatrix(); plume.setMatrixAt(k, dummy.matrix); }
        plume.castShadow = true;
        head.position.set(sign * 0.12, sign * 0.2, ro + 0.02);
        head.rotation.set(sign * -0.5, sign * 0.25, 0);
        ring.add(head);
      });
    } else if (a.carving === 'solar') {
      for (let i = 0; i < 12; i++) {
        const t = (i + 0.5) / 12 * Math.PI * 2;
        if (Math.abs(Math.sin(t) + 1) < 0.3) continue; // the tenon side
        const ray = put(ring, s.mesh(new THREE.ConeGeometry(0.1, 0.22, 4), ringPaint, [0, (ro + 0.08) * Math.cos(t), (ro + 0.08) * Math.sin(t)]));
        ray.rotation.x = t;
        ray.scale.x = 1.4;
      }
    } else if (a.carving === 'plain') {
      put(ring, s.ring((ri + ro) / 2, 0.03, [0, 0, 0], dark)).rotation.y = Math.PI / 2;
    }

    const fallen = a.moment === 'fallen';
    const tenonEnd = fallen ? 0.22 + random() * 0.12 : cz - ro + 0.12;
    s.box([0.3, 0.46, tenonEnd + 0.2], [0, cy, (tenonEnd - 0.2) / 2], fallen ? dark : ringPaint);
    if (fallen) {
      s.mesh(new THREE.DodecahedronGeometry(0.2, 0), dark, [0.02, cy - 0.05, tenonEnd]);
      const lying = new THREE.Group();
      ring.position.y = ro;
      ring.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.5;
      lying.add(ring);
      lying.rotation.x = -1.2 + random() * 0.15;
      lying.rotation.z = (random() - 0.5) * 0.2;
      lying.position.set((random() - 0.5) * 0.8, 0.02, apron + 0.75);
      s.root.add(lying);
      s.box([0.34, 0.4, 0.3], [lying.position.x + 0.9, 0.16, apron + 0.5], ringPaint).rotation.set(0.3, 0.7, 0.2);
    } else {
      ring.position.set(0, cy, cz);
      s.root.add(ring);
    }

    const sway: THREE.Object3D[] = [];
    if (a.moment === 'scoring') {
      const rubber = s.material('#1c1a19', { roughness: 0.35 });
      const ball = Math.min(0.14, ri * 0.72);
      s.ball([ball, ball, ball], [0.05, cy + 0.01, cz], rubber, 18);
      // A few speed streaks trail behind it on the approach side.
      const streak = new THREE.MeshBasicMaterial({ color: '#2a2622', transparent: true, opacity: 0.35, depthWrite: false });
      for (let i = 0; i < 4; i++) s.rod([-0.3 - i * 0.14, cy - 0.06 + i * 0.045 - 0.02 * i * i, cz + (i - 1.5) * 0.05], [-1.0 - i * 0.2, cy - 0.3 - i * 0.05, cz + (i - 1.5) * 0.07], 0.012, streak).castShadow = false;
    }
    if (a.moment === 'festival') {
      const petals: { at: [number, number, number]; size: number; color: string }[] = [];
      const swag = (from: [number, number, number], to: [number, number, number], drop: number) => {
        for (let i = 0; i <= 26; i++) {
          const t = i / 26;
          petals.push({ at: [mix(from[0], to[0], t) + (random() - 0.5) * 0.03, mix(from[1], to[1], t) - Math.sin(t * Math.PI) * drop, mix(from[2], to[2], t)], size: 0.06 + random() * 0.03, color: random() < 0.7 ? '#f29a1f' : '#f7d038' });
        }
      };
      swag([-W / 2 + 0.2, H - 0.25, 0.08], [0, cy + ro, cz], 0.5);
      swag([W / 2 - 0.2, H - 0.25, 0.08], [0, cy + ro, cz], 0.5);
      swag([0, cy - ro, cz - 0.1], [0, cy - ro, cz + 0.1], 0.45);
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.7 }), petals);
      const tints = [PAINT.red, PAINT.ochre, PAINT.blue, PAINT.green, PAINT.cream];
      const count = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const length = 1.1 + random() * 1.3;
        const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(0.11, length, 1, 8), new THREE.MeshStandardMaterial({ color: tints[i % tints.length], roughness: 0.8, side: THREE.DoubleSide }));
        ribbon.geometry.translate(0, -length / 2, 0);
        ribbon.castShadow = true;
        const t = Math.PI * (0.2 + 0.6 * (i + 0.5) / count);
        ribbon.position.set((random() - 0.5) * 0.2, cy - ro * Math.sin(t) * 0.98, cz + ro * Math.cos(t) * 0.98);
        ribbon.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.8;
        s.root.add(ribbon);
        sway.push(ribbon);
      }
    }
    const leaf = lerpHex('#3c7a3a', '#6c8a3c', mood.warmth * 0.6);
    if (a.moment === 'overgrown') {
      const vine = s.material('#4a3b28', { roughness: 0.95 });
      const leaves: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) {
        const x0 = (random() - 0.5) * 1.6, x1 = (random() - 0.5) * 0.14, tail = cy - ri - 0.5 - random() * 1.6;
        const path: [number, number, number][] = [[x0, H + 0.3, -0.3], [x0 * 0.8, H + 0.1, 0.12], [x0 * 0.3, cy + ri + 0.5, cz * 0.6], [x1, cy + ri * 0.4, cz + (random() - 0.5) * ri], [-x0 * 0.2, cy - ro - 0.2, cz + 0.05], [-x0 * 0.3 + (random() - 0.5) * 0.3, Math.max(0.4, tail), cz + (random() - 0.5) * 0.3]];
        s.tube(path, 0.022 + random() * 0.018, vine);
        const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
        for (let k = 0; k < 16; k++) { const p = curve.getPoint(0.1 + random() * 0.9); leaves.push({ at: [p.x + (random() - 0.5) * 0.15, p.y, p.z + (random() - 0.5) * 0.15], size: 0.07 + random() * 0.06, color: lerpHex(leaf, '#9fbf52', random() * 0.5) }); }
      }
      const blades = new THREE.SphereGeometry(1, 6, 4); blades.scale(1, 0.25, 0.6);
      s.scatter(blades, s.material('#ffffff', { roughness: 0.8 }), leaves);
    }
    if (a.moment === 'nested') {
      const twig = s.material('#6d5237', { roughness: 1 });
      for (let i = 0; i < 16; i++) {
        const t = random() * Math.PI * 2, r = 0.07 + random() * 0.1;
        s.rod([Math.cos(t) * r, cy - ri + 0.02 + random() * 0.07, cz + Math.sin(t) * r], [Math.cos(t + 2.2) * (r + 0.05), cy - ri + 0.05 + random() * 0.08, cz + Math.sin(t + 2.2) * (r + 0.05)], 0.012, twig);
      }
      s.cylinder(0.15, 0.1, 0.08, [0, cy - ri + 0.04, cz], twig, 10);
      for (let i = 0; i < 3; i++) s.ball([0.03, 0.04, 0.03], [(i - 1) * 0.05, cy - ri + 0.1, cz + (random() - 0.5) * 0.05], s.material('#cfe3de', { roughness: 0.5 }), 8);
      // The bird, perched on the rim.
      const bird = s.material(lerpHex('#2f6f8c', '#b8402c', mood.warmth), { roughness: 0.6 });
      s.ball([0.06, 0.07, 0.1], [0, cy + ro + 0.08, cz + 0.02], bird, 10);
      s.ball([0.04, 0.04, 0.045], [0, cy + ro + 0.16, cz + 0.09], bird, 8);
      s.mesh(new THREE.ConeGeometry(0.015, 0.06, 6), s.material('#e0b23a'), [0, cy + ro + 0.155, cz + 0.15]).rotation.x = Math.PI / 2;
      s.box([0.05, 0.012, 0.16], [0, cy + ro + 0.07, cz - 0.13], bird).rotation.x = 0.4;
    }

    // Jungle moves in as the place wears out.
    if (wear > 0.45) {
      const growth = (wear - 0.45) / 0.55;
      const n = Math.round(growth * (4 + mood.density * 8));
      for (let i = 0; i < n; i++) {
        const top = random() < 0.4 && a.wall !== 'fragment';
        s.root.add(tuft(random, [(random() - 0.5) * W, top ? H + 0.26 : 0, top ? -random() * T : apron + 0.1 + random() * 0.7], 0.35 + random() * 0.45, lerpHex(leaf, '#86a548', random() * 0.5)));
      }
      if (wear > 0.7) {
        const root = s.material('#6b5a44', { roughness: 1 });
        for (let i = 0; i < 2 + Math.round(random() * 2); i++) {
          const x = (random() - 0.5) * (W - 0.6) + (random() < 0.5 ? -0.9 : 0.9) * 0.5;
          const path: [number, number, number][] = [];
          for (let k = 0; k <= 6; k++) path.push([x + (random() - 0.5) * 0.5, H * (1 - k / 6) + (k === 0 ? 0.35 : 0), k === 0 ? -0.2 : 0.05 + (k === 6 ? 0.4 : 0)]);
          s.tube(path, 0.05 + random() * 0.04, root);
        }
      }
    }

    const front = apron + 0.55;
    if (a.foot === 'ball') {
      const rubber = s.material('#1c1a19', { roughness: 0.4 });
      s.ball([0.14, 0.14, 0.14], [0.9 + random() * 0.4, 0.14, front + random() * 0.4], rubber, 18);
    } else if (a.foot === 'offerings') {
      const clay = s.material('#b0623f', { roughness: 0.85 });
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const x = -1.2 + (i / Math.max(1, n - 1)) * 1.6 + (random() - 0.5) * 0.2, z = front + random() * 0.45, r = 0.13 + random() * 0.07;
        s.lathe([[0.02, 0], [r * 0.6, 0.01], [r, 0.11], [r * 0.9, 0.12], [r * 0.5, 0.03], [0, 0.03]], clay, [x, 0, z]);
        const heap = [];
        for (let k = 0; k < 8; k++) heap.push({ at: [x + (random() - 0.5) * r, 0.1 + random() * 0.05, z + (random() - 0.5) * r] as [number, number, number], size: 0.03 + random() * 0.02, color: ['#f29a1f', '#f7d038', '#c8402e', '#f4eede'][Math.floor(random() * 4)] });
        s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff'), heap);
      }
      const smoke = new THREE.MeshBasicMaterial({ color: '#f1efe8', transparent: true, opacity: 0.35, depthWrite: false });
      s.tube([[-1.3, 0.15, front + 0.6], [-1.25, 0.5, front + 0.62], [-1.36, 0.9, front + 0.58], [-1.26, 1.4, front + 0.63]], 0.025, smoke).castShadow = false;
      s.cylinder(0.09, 0.06, 0.16, [-1.3, 0.08, front + 0.6], clay, 12);
    } else if (a.foot === 'rubble') {
      const n = 4 + Math.round(mood.density * 6);
      for (let i = 0; i < n; i++) {
        const size = 0.18 + random() * 0.3;
        const block = s.box([size * 1.5, size, size], [(random() - 0.5) * (W - 0.4), size * 0.4, front - 0.2 + random() * 0.8], random() < 0.5 ? plain : dark);
        block.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6);
      }
    }

    s.root.rotation.y = -0.72;
    const speed = mix(0.4, 2.6, mood.energy), reach = mix(0.04, 0.3, mood.energy);
    return s.finish({
      update: sway.length ? (_dt, time) => { sway.forEach((ribbon, index) => { ribbon.rotation.x = Math.sin(time * speed + index * 1.3) * reach; }); } : undefined,
    });
  },
});
