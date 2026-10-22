import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';
import { TAU, agarPad, dome, gloss, painted, wobble } from './plate';

type P2 = { x: number; z: number };

export default defineThing({
  questions: {
    behaviour: choice('What is the slime mould doing?', {
      exploring: 'Exploring: broad scalloped fans advance in every direction, trailing a fine mesh of veins.',
      networked: 'Settled: everything wasteful has been pruned away, leaving thick veins that link the food like a rail map.',
      retreating: 'Retreating: it has pulled back to one trunk, leaving pale ghost trails where it used to be.',
      fruiting: 'Fruiting: it has stopped moving and risen into clusters of stalked spore heads.',
      dormant: 'Dormant: dried into a hard orange-brown crust, waiting for water.',
    }),
    layout: choice('How is the food laid out?', {
      scatter: 'Oat flakes dropped at random.',
      ring: 'A ring of oat flakes around the starting point.',
      pair: 'Just two flakes at opposite ends: start and finish, the shortest-path test.',
      map: 'Flakes placed on the cities of a map drawn beneath the gel.',
    }),
    found: score('How much of the food has it found?', ['None yet, still at the start', 'The nearest flake or two', 'Most of them', 'Every flake, each one engulfed']),
    colour: choice('What colour is the plasmodium?', {
      yellow: 'Vivid egg-yolk yellow.',
      lemon: 'Pale lemon, nearly translucent.',
      orange: 'Deep orange.',
      white: 'Milky white.',
      pink: 'Coral pink.',
    }),
    ground: choice('What is it growing across?', {
      agar: 'Pale, plain water agar.',
      paper: 'Damp black filter paper, so the yellow blazes.',
      bark: 'A slab of rotting bark, where it would live in the wild.',
    }),
    timed: noul('Has someone traced its advancing front in pen and written the times beside each line?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 26, faceR = a.ground === 'agar' ? R - 0.56 : R - 0.3;
    const d2 = (p: P2, q: P2) => Math.hypot(p.x - q.x, p.z - q.z);

    // Food first: everything else is drawn towards it.
    const origin: P2 = a.layout === 'pair' ? { x: -R * 0.66, z: R * 0.1 } : a.layout === 'ring' ? { x: 0, z: 0 } : { x: (random() - 0.5) * R * 0.5, z: (random() - 0.5) * R * 0.5 };
    const flakes: P2[] = [];
    const want = a.layout === 'pair' ? 1 : Math.round(mix(4, 9, mood.density));
    if (a.layout === 'pair') flakes.push({ x: R * 0.66, z: -R * 0.12 });
    else if (a.layout === 'ring') for (let i = 0; i < want; i++) { const angle = (i / want) * TAU + random() * 0.25; flakes.push({ x: Math.cos(angle) * R * 0.68, z: Math.sin(angle) * R * 0.68 }); }
    else for (let tries = 0; flakes.length < want && tries < 400; tries++) {
      const angle = random() * TAU, d = Math.sqrt(random()) * R * 0.8, p = { x: Math.cos(angle) * d, z: Math.sin(angle) * d };
      if (d2(p, origin) > 7 && flakes.every((f) => d2(f, p) > 8)) flakes.push(p);
    }

    // Grow outward from the start, always taking the nearest unfound flake.
    const reached: P2[] = [origin];
    const edges: [P2, P2][] = [];
    const pending = flakes.slice();
    const foundCount = Math.min(flakes.length, Math.round(a.found * flakes.length + (a.behaviour === 'networked' ? 0.6 : 0)));
    for (let i = 0; i < foundCount; i++) {
      let best = 0, from = origin, distance = Infinity;
      pending.forEach((flake, index) => reached.forEach((node) => { const d = d2(flake, node); if (d < distance) { distance = d; best = index; from = node; } }));
      const [flake] = pending.splice(best, 1);
      edges.push([from, flake]);
      reached.push(flake);
    }
    const trunk = edges.length;
    if (a.behaviour !== 'retreating' && a.behaviour !== 'dormant')
      for (let i = 1; i < reached.length; i++) for (let j = i + 1; j < reached.length; j++)
        if (d2(reached[i], reached[j]) < R * 0.75 && random() < (a.behaviour === 'networked' ? 0.35 : 0.2) && !edges.some(([p, q]) => (p === reached[i] && q === reached[j]))) edges.push([reached[i], reached[j]]);

    // The ground.
    const paintTop = (base: string) => painted(640, 640, (ctx, w, h) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      const px = (v: number) => (0.5 + v / (2 * faceR)) * w;
      if (a.ground !== 'agar') for (let i = 0; i < 1400; i++) {
        ctx.fillStyle = a.ground === 'bark' ? `rgba(${random() < 0.5 ? '30,18,10' : '150,110,70'},0.25)` : `rgba(${random() < 0.5 ? '0,0,0' : '90,90,100'},0.2)`;
        if (a.ground === 'bark') ctx.fillRect(random() * w, random() * h, 10 + random() * 60, 1.5 + random() * 3);
        else { ctx.beginPath(); ctx.arc(random() * w, random() * h, 1 + random() * 3, 0, TAU); ctx.fill(); }
      }
      const pen = a.ground === 'agar' ? '#22357a' : '#f2f2ea';
      ctx.strokeStyle = ctx.fillStyle = pen;
      ctx.lineJoin = ctx.lineCap = 'round';
      if (a.layout === 'map') {
        const coast = wobble(random, 5, 2);
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        for (let i = 0; i <= 90; i++) { const angle = (i / 90) * TAU, r = R * (0.78 + 0.14 * coast(angle)); ctx.lineTo(px(Math.cos(angle) * r), px(Math.sin(angle) * r)); }
        ctx.closePath();
        ctx.stroke();
        ctx.font = 'bold 20px monospace';
        [origin, ...flakes].forEach((city, i) => { ctx.beginPath(); ctx.arc(px(city.x), px(city.z), 26, 0, TAU); ctx.stroke(); ctx.fillText(i === 0 ? 'HQ' : String.fromCharCode(64 + i), px(city.x) + 30, px(city.z) + 30); });
        ctx.globalAlpha = 1;
      }
      if (a.timed) {
        ctx.lineWidth = 3.5;
        ctx.font = 'italic bold 22px sans-serif';
        const hour = 7 + Math.floor(random() * 4);
        for (let k = 0; k < 3; k++) {
          const r = R * (0.3 + k * 0.22), start = random() * TAU, sweep = 1.1 + random() * 0.8, wave = wobble(random, 3, 2);
          ctx.beginPath();
          for (let i = 0; i <= 30; i++) { const angle = start + (i / 30) * sweep, rr = r * (1 + 0.07 * wave(angle)); ctx.lineTo(px(origin.x * 0.5 + Math.cos(angle) * rr), px(origin.z * 0.5 + Math.sin(angle) * rr)); }
          ctx.stroke();
          const at = start + sweep + 0.12;
          ctx.fillText(`${(hour + k * 6) % 24}:00`, px(origin.x * 0.5 + Math.cos(at) * r) - 20, px(origin.z * 0.5 + Math.sin(at) * r));
        }
      }
    });
    let top = 0;
    if (a.ground === 'agar') top = agarPad(s, R, 'pale', { map: paintTop('#cfc79c'), glow: 0.1 });
    else {
      const thick = a.ground === 'bark' ? 3.2 : 0.8, tone = a.ground === 'bark' ? '#5a3d28' : '#26272c';
      const edge = wobble(random, 5, 3);
      const slab = a.ground === 'bark'
        ? s.mesh(dome((angle) => R * (1 + 0.035 * edge(angle)), (t, angle) => thick * (t > 0.96 ? 0 : 1) + 0.25 * edge(angle * 3 + t * 9) * (t < 0.9 ? 1 : 0), 26, 72), s.material('#ffffff', { map: paintTop(tone), roughness: 1 }))
        : s.cylinder(R, R, thick, [0, thick / 2, 0], s.material(tone, { roughness: 0.9 }), 56);
      if (a.ground === 'paper') { const face = s.mesh(new THREE.CircleGeometry(faceR, 56), s.material('#ffffff', { map: paintTop(tone), roughness: 0.75 }), [0, thick + 0.02, 0]); face.rotation.x = -Math.PI / 2; face.castShadow = false; }
      slab.receiveShadow = true;
      top = thick + (a.ground === 'bark' ? 0.2 : 0);
    }

    const base = new THREE.Color({ yellow: '#f5c518', lemon: '#f3e676', orange: '#f08419', white: '#f1efe2', pink: '#ee8f86' }[a.colour]);
    base.offsetHSL(0, (mood.cheer - 0.5) * 0.12, 0);
    const dormant = a.behaviour === 'dormant';
    const tone = dormant ? new THREE.Color('#b2621c').lerp(base, 0.25) : a.behaviour === 'fruiting' ? base.clone().offsetHSL(0, -0.15, -0.08) : base;
    const living = dormant ? s.material(tone, { roughness: 1 }) : gloss(tone, { emissive: tone, emissiveIntensity: 0.22, roughness: 0.3 });

    // Veins.
    const tubes: THREE.BufferGeometry[] = [], ghosts: THREE.BufferGeometry[] = [];
    const course = (p: P2, q: P2, sway: number) => {
      const length = d2(p, q), nx = -(q.z - p.z) / length, nz = (q.x - p.x) / length;
      const offsets = [0, (random() - 0.5) * sway, (random() - 0.5) * sway, (random() - 0.5) * sway, 0];
      return new THREE.CatmullRomCurve3(offsets.map((off, i) => new THREE.Vector3(mix(p.x, q.x, i / 4) + nx * off * length, 0, mix(p.z, q.z, i / 4) + nz * off * length)));
    };
    const vein = (curve: THREE.Curve<THREE.Vector3>, radius: number, list = tubes) => {
      const geometry = new THREE.TubeGeometry(curve, Math.max(6, Math.round(curve.getLength() * 1.2)), radius, 6, false);
      geometry.scale(1, 0.62, 1);
      list.push(geometry);
    };
    const twig = (from: THREE.Vector3, angle: number, length: number, radius: number, depth: number) => {
      const bend = angle + (random() - 0.5) * 0.9;
      const mid = new THREE.Vector3(from.x + Math.cos(angle) * length * 0.5, 0, from.z + Math.sin(angle) * length * 0.5);
      const tip = new THREE.Vector3(mid.x + Math.cos(bend) * length * 0.5, 0, mid.z + Math.sin(bend) * length * 0.5);
      if (Math.hypot(tip.x, tip.z) > R * 0.93) return;
      vein(new THREE.CatmullRomCurve3([from, mid, tip]), radius);
      if (depth > 0) for (const side of [-1, 1]) if (random() < 0.75) twig(random() < 0.5 ? mid : tip, bend + side * (0.5 + random() * 0.5), length * 0.62, radius * 0.72, depth - 1);
    };
    const thickness = { exploring: 0.85, networked: 1.5, retreating: 0.9, fruiting: 0.75, dormant: 0.85 }[a.behaviour];
    const bushy = { exploring: 7, networked: 1.4, retreating: 0, fruiting: 3, dormant: 3 }[a.behaviour];
    edges.forEach(([p, q], index) => {
      const curve = course(p, q, a.behaviour === 'networked' ? 0.1 : 0.28);
      const ghost = a.behaviour === 'retreating' && index > 0;
      vein(curve, thickness * (index < trunk ? 1 : 0.6) * (ghost ? 1.3 : 1), ghost ? ghosts : tubes);
      if (ghost) return;
      const twigs = Math.round(bushy * mix(0.6, 1.3, random()) * (curve.getLength() / 14));
      for (let i = 0; i < twigs; i++) {
        const t = 0.1 + random() * 0.8, at = curve.getPoint(t), tangent = curve.getTangent(t);
        twig(at, Math.atan2(tangent.z, tangent.x) + (random() < 0.5 ? 1 : -1) * (0.7 + random() * 0.7), 3.5 + random() * 6, thickness * 0.5, a.behaviour === 'exploring' ? 2 : 1);
      }
    });
    if (edges.length === 0 || a.behaviour === 'exploring') {
      const feelers = edges.length === 0 ? 7 : 3;
      for (let i = 0; i < feelers; i++) twig(new THREE.Vector3(origin.x, 0, origin.z), random() * TAU, 6 + random() * 6, thickness * 0.7, 2);
    }
    const pulsing: THREE.Object3D[] = [];
    if (tubes.length) {
      const web = s.mesh(mergeGeometries(tubes)!, living, [0, top + 0.1, 0]);
      tubes.forEach((g) => g.dispose());
      pulsing.push(web);
    }
    if (ghosts.length) {
      const trail = s.mesh(mergeGeometries(ghosts)!, new THREE.MeshStandardMaterial({ color: a.ground === 'agar' ? '#b9ad6a' : '#8f8a66', transparent: true, opacity: 0.55, roughness: 0.9, depthWrite: false }), [0, top - 0.25, 0]);
      ghosts.forEach((g) => g.dispose());
      trail.castShadow = false;
    }

    // The starting blob and the flakes, engulfed or not.
    const lumps = wobble(random, 4, 3);
    const body = s.mesh(dome((angle) => 3.2 * (1 + 0.2 * lumps(angle)), (t, angle) => (dormant ? 0.5 : 1.1) * Math.sqrt(1 - t * t) * (1 + 0.2 * lumps(angle * 2 + t * 5)), 8, 32), living, [origin.x, top, origin.z]);
    if (!dormant) pulsing.push(body);
    const oat = s.material('#e8d6a8', { roughness: 0.9 });
    const oatGeometry = new THREE.SphereGeometry(1, 14, 8);
    flakes.forEach((flake) => {
      const found = reached.includes(flake);
      const grain = s.mesh(oatGeometry, oat, [flake.x, top + 0.45, flake.z]);
      grain.scale.set(2.5 + random() * 0.8, 0.5, 1.6 + random() * 0.5);
      grain.rotation.y = random() * TAU;
      if (!found) return;
      // A found flake wears a skin of plasmodium.
      const skin = wobble(random, 4, 3);
      const coat = s.mesh(dome((angle) => (3.4 + (a.behaviour === 'networked' ? 0.6 : 0)) * (1 + 0.16 * skin(angle)), (t, angle) => 0.95 * (1 - t ** 3) * (1 + 0.15 * skin(angle * 3)), 6, 28), living, [flake.x, top, flake.z]);
      coat.rotation.y = random() * TAU;
      if (!dormant) pulsing.push(coat);
      if (a.behaviour === 'retreating') coat.scale.setScalar(0.45);
    });

    // Advancing fronts: thick scalloped rims with thin sheet behind them.
    if (a.behaviour === 'exploring' || a.behaviour === 'networked') {
      const fronts = a.behaviour === 'exploring' ? Math.round(mix(3, 5, mood.energy)) : 1;
      const sources = reached.slice(-fronts).concat(reached).slice(0, fronts);
      sources.forEach((node, index) => {
        const target = pending[index % Math.max(pending.length, 1)];
        const aim = target && random() < 0.8 ? Math.atan2(target.z - node.z, target.x - node.x) : Math.atan2(node.z, node.x) + (random() - 0.5) * 1.5 + (node === origin ? random() * TAU : 0);
        const reach = Math.min(mix(7, 13, random()), target ? d2(node, target) * 0.8 : 13) * (a.behaviour === 'networked' ? 0.6 : 1);
        const scallop = wobble(random, 4, 9), wide = 0.6 + random() * 0.4;
        const outline = (angle: number) => { const off = Math.abs(((angle - aim + TAU * 3 + Math.PI) % TAU) - Math.PI); return 1.2 + reach * Math.max(0, Math.cos(Math.min(Math.PI / 2, off / wide))) ** 0.7 * (1 + 0.16 * scallop(angle)); };
        const fan = s.mesh(dome(outline, (t, angle) => 0.12 + 0.2 * Math.abs(Math.sin(angle * 17 + Math.sin(t * 6) * 0.8)) ** 3 * t + 0.34 * Math.exp(-(((1 - t) / 0.1) ** 2)) * (t > 0.995 ? 0.3 : 1), 18, 120,
          (t, angle) => base.clone().offsetHSL(0, 0, t > 0.86 ? 0 : 0.14 - 0.14 * Math.abs(Math.sin(angle * 17 + Math.sin(t * 6) * 0.8)) ** 3)), gloss('#ffffff', { vertexColors: true, emissive: base, emissiveIntensity: 0.18, roughness: 0.35 }), [node.x, top, node.z]);
        void fan;
      });
    }

    // Fruiting bodies: stalks with dark, lime-dusted heads.
    if (a.behaviour === 'fruiting') {
      const stalks: { at: [number, number, number]; size: number }[] = [], heads: typeof stalks = [];
      const sites = reached.flatMap((node) => Array.from({ length: Math.round(mix(10, 22, mood.density)) }, () => { const angle = random() * TAU, d = Math.sqrt(random()) * 4.2; return { x: node.x + Math.cos(angle) * d, z: node.z + Math.sin(angle) * d }; }));
      for (const site of sites) {
        if (Math.hypot(site.x, site.z) > R * 0.94) continue;
        const height = 1.8 + random() * 2.2;
        stalks.push({ at: [site.x, top, site.z], size: height });
        heads.push({ at: [site.x, top + height, site.z], size: 0.5 + random() * 0.35 });
      }
      s.scatter(new THREE.CylinderGeometry(0.06, 0.1, 1, 5).translate(0, 0.5, 0), s.material(base.clone().offsetHSL(0, -0.1, 0.1), { roughness: 0.8 }), stalks);
      s.scatter(new THREE.SphereGeometry(1, 10, 8).scale(1, 0.82, 1), s.material('#4b4552', { roughness: 0.55, metalness: 0.25 }), heads.map((head) => ({ ...head, color: random() < 0.25 ? '#8d8792' : '#4b4552' })));
    }
    if (dormant) {
      const crust = s.material('#8a4a17', { roughness: 1, flatShading: true });
      for (const node of reached) for (let i = 0; i < 3; i++) {
        const edge = wobble(random, 4, 4), angle = random() * TAU, d = random() * 4;
        s.mesh(dome((t) => (1.5 + random() * 0.4) * (1 + 0.3 * edge(t)), (t) => 0.45 * (1 - t ** 4), 3, 9), crust, [node.x + Math.cos(angle) * d, top, node.z + Math.sin(angle) * d]);
      }
    }

    s.root.scale.setScalar(0.01);
    const rate = mix(0.5, 3.2, mood.energy);
    return s.finish({
      update: (_dt, time) => pulsing.forEach((node, i) => {
        // Shuttle streaming: the whole body thickens and thins on a slow beat, out of phase from part to part.
        node.scale.y = 1 + 0.12 * Math.sin(time * rate + i * 0.9);
      }),
    });
  },
});
