import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, dewMaterial, matte, tube, xf } from './bits';

interface Hole { j0: number; jn: number; k0: number; kn: number; mended: boolean }

const BEHIND = {
  meadow: { far: '#8fae6e', near: '#587a48' },
  stubble: { far: '#c9b06a', near: '#8f7438' },
  hedge: { far: '#5f7a58', near: '#34493a' },
  flowers: { far: '#93aa74', near: '#5f7a4e' },
  water: { far: '#8fb4c4', near: '#4f7c90' },
} as const;
const SKIES = { golden: '#ecd6a4', mist: '#c9cdc6', afterstorm: '#7d8794', frost: '#a9bdd0', drizzle: '#aab2ae' } as const;

export default defineWorld({
  questions: {
    weather: choice('What is the air like this morning?', {
      golden: 'Clear and golden: low sun flaring through the grass behind the web.',
      mist: 'Thick ground mist: everything behind is pale and the web is drawn in grey beads.',
      afterstorm: 'The day after a storm: dark clearing sky, heavy drops, everything battered and rinsed.',
      frost: 'First frost: the threads are furred with ice crystals instead of dew.',
      drizzle: 'Fine drizzle still falling from an overcast sky.',
    }),
    web: choice('What state is the web in?', {
      fresh: 'Freshly spun overnight, complete and even.',
      mended: 'Patched: holes filled in with tighter, brighter new silk.',
      torn: 'Torn through in places, broken threads hanging plumb with a drop on each.',
      abandoned: 'Abandoned: sagging, dusty, snagged with seeds and scraps.',
      unfinished: 'Half built: all the spokes and only the inner turns of the spiral, the outer scaffold still wide.',
    }),
    dew: score('How heavily is it beaded?', ['A few scattered beads', 'Beaded along most threads', 'Every thread strung heavy with drops']),
    anchors: choice('What is the web strung between?', {
      grass: 'Tall grass stems with seed heads.',
      teasel: 'Dry teasel stalks with spiny heads.',
      bramble: 'Arching bramble canes with thorns, leaves and a few blackberries.',
      umbels: 'The dry spoked seed heads of cow parsley.',
      fence: 'A weathered fence post and strands of barbed wire, with grass on the other side.',
    }),
    caught: choice('What else is in the web?', {
      empty: 'Nothing: it is clean.',
      bundles: 'A few white silk-wrapped bundles, a larder.',
      spider: 'The builder herself, watching from an upper corner.',
      debris: 'Drifted dandelion seeds and scraps of leaf.',
    }),
    behind: choice('What lies out of focus behind it?', {
      meadow: 'A green meadow.',
      stubble: 'A golden field of stubble.',
      hedge: 'A dark hedge.',
      flowers: 'Wildflowers: soft discs of pink, violet and yellow.',
      water: 'A pond or stream throwing bright sparkles.',
    }),
    view: choice('Where is the viewer?', {
      front: 'Facing the web, the lattice tilting away at the top.',
      raking: 'Off to one side, looking along the plane so the spiral foreshortens into a receding lattice.',
      under: 'Low down, looking up through the web at the sky.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const d = mood.daylight, sunUp = Math.sin(d * Math.PI);
    const frost = a.weather === 'frost';
    const grey = a.weather === 'mist' ? 0.5 : a.weather === 'drizzle' ? 0.35 : a.weather === 'afterstorm' ? 0.2 : 0;
    const shade = (c: Tone) => {
      const tint = new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.2, (mood.cheer - 0.5) * 0.06);
      if (frost) tint.lerp(new THREE.Color('#9fb4c4'), 0.5);
      return tint.lerp(new THREE.Color('#b4bab4'), grey);
    };
    const hex = (c: THREE.Color, alpha = 1) => { const s = c.clone().convertLinearToSRGB(); return `rgba(${Math.round(s.r * 255)},${Math.round(s.g * 255)},${Math.round(s.b * 255)},${alpha})`; };
    const sunTone = new THREE.Color('#ffb25e').lerp(new THREE.Color('#fff4d6'), sunUp).lerp(new THREE.Color('#ffffff'), grey);
    const sky = shade(SKIES[a.weather]).lerp(sunTone, a.weather === 'golden' ? 0.2 : 0);
    const far = shade(BEHIND[a.behind].far), near = shade(BEHIND[a.behind].near);

    // The out-of-focus backdrop, painted once: sky, sun, a soft meadow and discs of bokeh.
    const horizon = a.view === 'under' ? 0.8 : 0.3;
    const sunAt: [number, number] = [mix(0.16, 0.84, d), horizon - 0.04 - sunUp * 0.22];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512);
      const skyTop = a.weather === 'afterstorm' ? sky.clone().multiplyScalar(0.8) : sky.clone().lerp(new THREE.Color('#bcd6ea'), a.weather === 'golden' ? 0.3 : 0.05);
      gradient.addColorStop(0, hex(skyTop));
      gradient.addColorStop(Math.max(0.02, horizon - 0.1), hex(sky.clone().lerp(sunTone, a.weather === 'afterstorm' ? 0.75 : 0.35)));
      gradient.addColorStop(horizon, hex(far.clone().lerp(sunTone, 0.45)));
      gradient.addColorStop(Math.min(0.97, horizon + 0.16), hex(far));
      gradient.addColorStop(1, hex(near));
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
      const glowAlpha = { golden: 0.95, mist: 0.5, afterstorm: 0.75, frost: 0.7, drizzle: 0.18 }[a.weather];
      const glow = ctx.createRadialGradient(sunAt[0] * 512, sunAt[1] * 512, 0, sunAt[0] * 512, sunAt[1] * 512, 230);
      glow.addColorStop(0, hex(new THREE.Color('#ffffff'), glowAlpha));
      glow.addColorStop(0.08, hex(sunTone.clone().lerp(new THREE.Color('#ffffff'), 0.5), glowAlpha * 0.9));
      glow.addColorStop(0.4, hex(sunTone, glowAlpha * 0.3));
      glow.addColorStop(1, hex(sunTone, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 512, 512);
      // Blurred grass: soft upright streaks rising out of the bottom.
      const layer = document.createElement('canvas');
      layer.width = layer.height = 512;
      const lx = layer.getContext('2d')!;
      lx.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const x = random() * 512, top = (horizon + (random() - 0.35) * 0.3) * 512;
        lx.strokeStyle = hex(random() < 0.5 ? near.clone().multiplyScalar(0.8) : far.clone().lerp(sunTone, 0.3), 0.3 + random() * 0.25);
        lx.lineWidth = 5 + random() * 18;
        lx.beginPath(); lx.moveTo(x, 530); lx.quadraticCurveTo(x + (random() - 0.5) * 50, (top + 530) / 2, x + (random() - 0.5) * 110, top); lx.stroke();
      }
      ctx.filter = 'blur(7px)';
      ctx.drawImage(layer, 0, 0);
      // Bokeh.
      lx.clearRect(0, 0, 512, 512);
      const discs = Math.round(mix(16, 60, mood.density) * (a.weather === 'mist' ? 0.4 : 1));
      const petals = ['#e98ab2', '#b78ae2', '#f4d25e', '#ffffff', '#e8607a'];
      for (let i = 0; i < discs; i++) {
        const nearSun = random() < 0.3;
        const x = nearSun ? (sunAt[0] + (random() - 0.5) * 0.5) * 512 : random() * 512;
        const y = (a.behind === 'water' ? horizon + 0.04 + random() * 0.3 : nearSun ? sunAt[1] + (random() - 0.3) * 0.35 : horizon - 0.08 + random() * (1.08 - horizon)) * 512;
        const r = 7 + random() * 30;
        const tint = a.behind === 'flowers' && random() < 0.7 ? shade(petals[Math.floor(random() * petals.length)]) : a.behind === 'water' ? new THREE.Color('#ffffff') : far.clone().lerp(sunTone, 0.4 + random() * 0.5);
        const alpha = (a.behind === 'water' ? 0.4 : a.behind === 'flowers' ? 0.38 : 0.2) * (0.5 + random() * 0.7);
        lx.fillStyle = hex(tint, alpha);
        lx.beginPath(); lx.arc(x, y, r, 0, Math.PI * 2); lx.fill();
        lx.strokeStyle = hex(tint.clone().lerp(new THREE.Color('#ffffff'), 0.5), alpha * 0.8); lx.lineWidth = 1.5; lx.stroke();
      }
      ctx.filter = 'blur(1.5px)';
      ctx.drawImage(layer, 0, 0);
      ctx.filter = 'none';
    }
    const backdropMap = new THREE.CanvasTexture(canvas);
    backdropMap.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: backdropMap, depthWrite: false, fog: false }));
    backdrop.renderOrder = -10;
    root.add(backdrop);
    const background = far.clone().lerp(sky, 0.5);

    // Light: a low sun and soft sky fill.
    root.add(new THREE.HemisphereLight(sky.clone().lerp(new THREE.Color('#ffffff'), 0.4), near, mix(1.0, 1.35, sunUp)));
    const key = new THREE.DirectionalLight(sunTone.clone().lerp(new THREE.Color('#ffffff'), 0.25 + grey * 0.5), mix(2.6, 1.5, grey));
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const rim = new THREE.DirectionalLight(sunTone, mix(0.9, 0.3, grey));
    root.add(rim, rim.target);

    const H = V(0, 6, 0), lean = 0.42 + (random() - 0.5) * 0.08;
    const web = new THREE.Group();
    web.position.copy(H);
    web.rotation.x = -lean;
    root.add(web);
    web.updateMatrixWorld(true);
    const toWorld = (p: THREE.Vector3) => p.clone().applyMatrix4(web.matrixWorld);
    const normal = V(0, Math.sin(lean), Math.cos(lean));

    // Near ground: a patch of turf the stems rise from.
    const groundTone = far.clone().lerp(near, a.view === 'under' ? 0.45 : 0.8);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(15, 40), new THREE.MeshBasicMaterial({ color: groundTone }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    root.add(ground);

    const floor = a.view === 'under' ? -3.5 : 0;
    const plant = new Bag(), wood = new Bag(), silk = new Bag(), webSilk = new Bag(), fresh = new Bag(), drops = new Bag(), bits = new Bag();
    const green = shade('#7fa050').lerp(shade('#c9b070'), clamp01(mood.wear * 0.8 + (a.weather === 'frost' ? 0.2 : 0)));
    const straw = shade('#c7b074');
    const samples: THREE.Vector3[] = [];
    const stem = (from: THREE.Vector3, to: THREE.Vector3, bow: THREE.Vector3, r: number, colour: THREE.Color, anchor = true) => {
      const points = arc(from, to, bow, 18);
      plant.add(tube(points, (t) => mix(r, r * 0.45, t), { sides: 7 }), colour);
      if (anchor) samples.push(...points.slice(2));
      return points;
    };
    const blade = (from: THREE.Vector3, to: THREE.Vector3, width: number, colour: THREE.Color) =>
      plant.add(tube(arc(from, to, V(0, from.distanceTo(to) * 0.18, 0), 9), (t) => mix(width, width * 0.08, t ** 1.5), { sides: 4, flat: 0.16, up: V(0, 0, 1) }), colour);
    const turf = (x: number, z: number, n: number, high: number) => {
      for (let i = 0; i < n; i++) {
        const base = V(x + (random() - 0.5) * 1.6, floor, z + (random() - 0.5) * 1.6);
        blade(base, base.clone().add(V((random() - 0.5) * 2.2, high * (0.4 + random() * 0.6) - floor, (random() - 0.5) * 1.6)), 0.16 + random() * 0.1, green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    };
    const leftA = stem(V(-6.7, floor, -0.4), V(-5.9, 14.5, -2.6), V(-0.4, 0, 0), 0.16, green);
    const leftB = stem(V(-7.6, floor, 1.2), V(-6.9, 11.5, 0.4), V(-0.3, 0, 0.3), 0.12, green.clone().offsetHSL(0, 0, -0.04));
    let rightA: THREE.Vector3[] = [], rightB: THREE.Vector3[] = [];
    if (a.anchors === 'fence') {
      // A split, weathered post and two strands of barbed wire.
      const postTone = shade('#8d877c');
      const post = new THREE.CylinderGeometry(0.85, 0.95, 13, 9);
      const p = post.getAttribute('position'), colours = new Float32Array(p.count * 3), tint = new THREE.Color();
      for (let i = 0; i < p.count; i++) { tint.copy(postTone).offsetHSL(0, 0, 0.06 * Math.sin(p.getX(i) * 9 + p.getZ(i) * 7) + 0.03 * Math.sin(p.getY(i) * 3)); colours.set([tint.r, tint.g, tint.b], i * 3); }
      post.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      wood.add(post, null, xf(V(6.2, 6.3 + floor, -1.3), 1, new THREE.Euler(0, 0, -0.03)));
      for (let i = 0; i < 5; i++) wood.add(new THREE.BoxGeometry(0.05, 2 + random() * 5, 0.05), postTone.clone().multiplyScalar(0.55), xf(V(5.8 + random() * 0.8, 4 + random() * 6, -0.42 - random() * 0.05)));
      for (let i = 0; i <= 12; i++) samples.push(V(5.4, 1 + i, -1.1));
      const rust = shade('#7a4a32');
      for (const y of [10.2, 4.4]) {
        const wire = Array.from({ length: 25 }, (_unused, i) => V(mix(5.5, -17, i / 24), y - 0.5 * Math.sin((i / 24) * Math.PI), -1.3 - i * 0.03));
        for (const offset of [0.035, -0.035]) wood.add(tube(wire.map((q, i) => q.clone().add(V(0, Math.sin(i * 2.1) * offset, Math.cos(i * 2.1) * offset))), 0.035, { sides: 5 }), rust);
        for (let i = 2; i < 24; i += 2) for (const turn of [0.7, -0.7]) wood.add(tube([wire[i].clone().add(V(-0.16, turn * 0.2, 0.1)), wire[i], wire[i].clone().add(V(0.16, -turn * 0.2, -0.1))], 0.022, { sides: 4 }), rust);
        samples.push(...wire.slice(0, 20));
      }
      rightA = [V(6.2, 12.8, -1.3)];
      turf(6.6, 0.5, 6, 3.5);
    } else {
      rightA = stem(V(6.6, floor, 0.1), V(6.0, 13.6, -2.2), V(0.4, 0, 0), 0.16, green);
      rightB = stem(V(7.8, floor, -1.4), V(6.9, 15.5, -3), V(0.4, 0, 0), 0.12, green.clone().offsetHSL(0, 0, -0.04));
    }
    const mains = a.anchors === 'fence' ? [leftA, leftB] : [leftA, leftB, rightA, rightB];
    const sway: THREE.Vector3[] = [];
    for (const points of mains) {
      const top = points[points.length - 1];
      sway.push(top);
      for (let i = 0; i < 2; i++) { const from = points[3 + i * 5]; blade(from, from.clone().add(V((from.x < 0 ? -1 : 1) * (1.5 + random() * 1.5), 2 + random() * 2, (random() - 0.5) * 2)), 0.22, green.clone().offsetHSL(0, 0, 0.03)); }
      if (a.anchors === 'grass' || a.anchors === 'fence' || (a.anchors !== 'bramble' && (points === leftB || points === rightB))) {
        for (let i = 0; i < 12; i++) { const q = top.clone().add(V(0, -1.6 + i * 0.28, 0)); plant.add(new THREE.SphereGeometry(1, 8, 6), straw.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06), aim(q, q.clone().add(V(i % 2 ? 0.7 : -0.7, 1, (random() - 0.5) * 0.8)), V(0.13, 0.3, 0.13))); }
      } else if (a.anchors === 'teasel') {
        const brown = shade('#8a6a45'), at = top.clone().add(V(0, -1.5, 0));
        plant.add(new THREE.SphereGeometry(1, 16, 12), brown, xf(at, V(0.7, 1.15, 0.7)));
        for (let i = 0; i < 110; i++) { const y = 1 - ((i + 0.5) / 110) * 2, r = Math.sqrt(1 - y * y), t = i * 2.4, n = V(Math.cos(t) * r * 0.7, y * 1.15, Math.sin(t) * r * 0.7); plant.add(new THREE.ConeGeometry(0.045, 0.42, 4), brown.clone().offsetHSL(0, 0, 0.1), aim(at.clone().add(n), at.clone().add(n.clone().multiplyScalar(1.6)).add(V(0, 0.25, 0)))); }
        for (let i = 0; i < 8; i++) { const angle = (i / 8) * Math.PI * 2, from = at.clone().add(V(0, -1.1, 0)); plant.add(tube(arc(from, from.clone().add(V(Math.cos(angle) * 1.2, 1.9 + random() * 0.7, Math.sin(angle) * 1.2)), V(Math.cos(angle) * 0.7, -0.5, Math.sin(angle) * 0.7), 8), (t) => mix(0.07, 0.015, t), { sides: 5 }), brown); }
        for (let i = 2; i < 17; i++) plant.add(new THREE.ConeGeometry(0.04, 0.22, 4), brown, aim(points[i], points[i].clone().add(V(i % 2 ? 1 : -1, 0.3, (random() - 0.5) * 2))));
      } else if (a.anchors === 'umbels') {
        const hub = top.clone().add(V(0, -2.4, 0));
        for (let i = 0; i < 11; i++) {
          const angle = (i / 11) * Math.PI * 2, tip = hub.clone().add(V(Math.cos(angle) * 1.5, 1.7 + random() * 0.5, Math.sin(angle) * 1.5));
          plant.add(tube(arc(hub, tip, V(Math.cos(angle) * 0.35, -0.3, Math.sin(angle) * 0.35), 6), 0.035, { sides: 5 }), straw);
          for (let k = 0; k < 6; k++) { const end = tip.clone().add(V((random() - 0.5) * 0.6, 0.25 + random() * 0.3, (random() - 0.5) * 0.6)); plant.add(tube([tip, end], 0.014, { sides: 3 }), straw); plant.add(new THREE.SphereGeometry(1, 5, 4), straw.clone().multiplyScalar(0.75), xf(end, V(0.06, 0.045, 0.06))); }
          samples.push(tip);
        }
      }
    }
    if (a.anchors === 'bramble') {
      // Recolour is not possible after the fact, so canes are drawn over the stems: thorns, leaves and fruit.
      const cane = shade('#8a3f4a');
      for (const points of mains) {
        plant.add(tube(points, (t) => mix(0.2, 0.09, t), { sides: 7 }), cane);
        for (let i = 1; i < 18; i++) plant.add(new THREE.ConeGeometry(0.07, 0.3, 5), cane.clone().offsetHSL(0, 0, 0.1), aim(points[i], points[i].clone().add(V(i % 2 ? 1 : -1, -0.35, (random() - 0.5) * 2))));
        for (const i of [6, 11, 15]) {
          const side = points[i].x < 0 ? -1 : 1, out = (random() < 0.5 ? -side : side);
          const leafTone = shade('#587a3a').lerp(shade('#a3562e'), clamp01(mood.wear * 0.8 + random() * 0.2));
          for (const fan of [-0.7, 0, 0.7]) {
            const from = points[i], tip = from.clone().add(V(out * 1.6 * Math.cos(fan), 0.5 + Math.sin(fan) * 1.1, 0.5 + random() * 0.6));
            plant.add(tube(arc(from, tip, V(0, 0.3, 0), 8), (t) => 0.03 + 0.42 * Math.sin(Math.min(1, t * 1.1) * Math.PI) ** 0.8, { sides: 8, flat: 0.08, up: V(0, 0.3, 1) }), leafTone);
          }
        }
      }
      const bunch = leftA[14].clone().add(V(0.9, -0.3, 0.6));
      plant.add(tube([leftA[14], bunch.clone().add(V(0, 0.5, 0))], 0.04, { sides: 4 }), cane);
      for (let i = 0; i < 4; i++) {
        const at = bunch.clone().add(V((i % 2) * 0.55 - 0.2, -Math.floor(i / 2) * 0.6, (random() - 0.5) * 0.4)), ripe = random() < 0.6 ? shade('#2a1a33') : shade('#a5283a');
        for (let k = 0; k < 14; k++) { const y = 1 - ((k + 0.5) / 14) * 2, r = Math.sqrt(1 - y * y), t = k * 2.4; plant.add(new THREE.SphereGeometry(1, 6, 5), ripe, xf(at.clone().add(V(Math.cos(t) * r * 0.17, y * 0.2, Math.sin(t) * r * 0.17)), 0.1)); }
      }
    }
    turf(-7.0, 0.4, 8, 4);
    turf(7.0, -0.4, a.anchors === 'fence' ? 2 : 8, 4);
    for (let i = 0; i < 40; i++) { const angle = Math.PI * (0.02 + 0.96 * random()), r = 9 + random() * 6; turf(Math.cos(angle) * r, -Math.sin(angle) * r, 2, 2.5 + random() * 3.5); }

    // The web, spun in its own plane.
    const silkTone = (a.web === 'abandoned' ? new THREE.Color('#c9cdc8') : new THREE.Color('#f4f7fa')).lerp(sunTone, 0.12);
    const count = Math.round(mix(22, 32, mood.density)), turns = Math.round(mix(13, 22, mood.density));
    const polygon = [50, 0, -50, -130, 180, 130].map((degrees, i) => {
      const angle = THREE.MathUtils.degToRad(degrees + (random() - 0.5) * 10), r = [5.7, 5.1, 5.8, 5.8, 5.1, 5.7][i] * (0.94 + random() * 0.12);
      return V(Math.cos(angle) * r, Math.sin(angle) * r, 0);
    });
    const dirs: THREE.Vector3[] = [], reach: number[] = [];
    for (let j = 0; j < count; j++) {
      const angle = ((j + (random() - 0.5) * 0.5) / count) * Math.PI * 2, dx = Math.cos(angle), dy = Math.sin(angle);
      let best = 9;
      for (let e = 0; e < polygon.length; e++) {
        const p = polygon[e], q = polygon[(e + 1) % polygon.length], ex = q.x - p.x, ey = q.y - p.y, det = ex * dy - ey * dx;
        if (Math.abs(det) < 1e-9) continue;
        const s = (ex * p.y - ey * p.x) / det, t = (dx * p.y - dy * p.x) / det;
        if (s > 0 && t >= 0 && t <= 1) best = Math.min(best, s);
      }
      dirs.push(V(dx, dy, 0));
      reach.push(best);
    }
    const outer = Math.max(...reach) * 0.94, hubR = 0.35, inner = 1.25;
    const at = (j: number, r: number) => dirs[j].clone().multiplyScalar(r);
    const thick = 0.02;
    for (let j = 0; j < count; j++) webSilk.add(tube([at(j, hubR), at(j, reach[j])], thick, { sides: 4 }), silkTone);
    for (let e = 0; e < polygon.length; e++) webSilk.add(tube([polygon[e], polygon[(e + 1) % polygon.length]], thick * 1.4, { sides: 4 }), silkTone);
    const hubRun: THREE.Vector3[] = [];
    for (let i = 0; i <= count * 4; i++) hubRun.push(at(i % count, mix(hubR, inner * 0.8, i / (count * 4))));
    webSilk.add(tube(hubRun, thick * 0.6, { sides: 4 }), silkTone);
    // Anchor lines from the frame corners out to whatever stands nearest.
    polygon.forEach((corner) => {
      const from = toWorld(corner), out = toWorld(corner.clone().multiplyScalar(1.5));
      let best = samples[0], score = Infinity;
      for (const sample of samples) { const s = sample.distanceTo(out) + Math.abs(sample.y - out.y) * 0.4; if (s < score) { score = s; best = sample; } }
      silk.add(tube([from, best], thick * 1.5, { sides: 4 }), silkTone);
      const second = samples[Math.min(samples.length - 1, samples.indexOf(best) + 3)];
      if (second.distanceTo(best) < 4) silk.add(tube([from.clone().lerp(best, 0.45), second], thick, { sides: 4 }), silkTone);
    });

    const holes: Hole[] = [];
    const wantHoles = { fresh: 0, mended: 2, torn: 3, abandoned: 3, unfinished: 0 }[a.web] + Math.round(mood.wear * 2.4) + (a.weather === 'afterstorm' ? 1 : 0);
    for (let i = 0; i < wantHoles; i++) holes.push({ j0: Math.floor(random() * count), jn: 2 + Math.floor(random() * 4), k0: 2 + Math.floor(random() * (turns - 5)), kn: 3 + Math.floor(random() * 5), mended: a.web === 'mended' && i < 2 });
    const holeAt = (j: number, k: number) => holes.find((h) => (j - h.j0 + count) % count < h.jn && k >= h.k0 && k < h.k0 + h.kn);
    const spiralR = (k: number, j: number) => inner + ((outer - inner) * (k * count + j)) / (turns * count);
    const built = a.web === 'unfinished' ? Math.round(turns * 0.45) : turns;
    const sag = (a.web === 'abandoned' ? 0.14 : 0.05) + a.dew * 0.05;
    const nodes: THREE.Vector3[] = [], mids: THREE.Vector3[] = [], tips: THREE.Vector3[] = [];
    let run: THREE.Vector3[] = [];
    const close = (bag: Bag, tone: THREE.Color, r: number) => {
      if (run.length > 1) { bag.add(tube(run, r, { sides: 4 }), tone); tips.push(run[run.length - 1], run[0]); }
      run = [];
    };
    for (let k = 0; k < built; k++)
      for (let j = 0; j < count; j++) {
        const r = spiralR(k, j);
        if (r > reach[j] * 0.94 || holeAt(j, k)) { close(webSilk, silkTone, thick * 0.8); continue; }
        const p = at(j, r);
        if (run.length) { const last = run[run.length - 1], mid = last.clone().lerp(p, 0.5); mid.y -= last.distanceTo(p) * sag; run.push(mid); mids.push(mid); }
        run.push(p);
        nodes.push(p);
      }
    close(webSilk, silkTone, thick * 0.8);
    const looseTips = tips.splice(0);
    if (a.web === 'unfinished') {
      // The wide temporary scaffold spiral the finished turns will replace.
      for (let i = built * count; i < turns * count; i++) { const j = i % count, r = inner + ((outer - inner) * (built + ((i - built * count) / count) * 3.2)) / turns; if (r < reach[j] * 0.94) run.push(at(j, r)); }
      close(webSilk, silkTone, thick * 0.5);
    }
    const bright = new THREE.Color('#ffffff');
    for (const hole of holes.filter((h) => h.mended)) {
      for (let k = hole.k0; k < hole.k0 + hole.kn; k += 0.5) {
        for (let n = -1; n <= hole.jn; n++) { const j = (hole.j0 + n + count) % count, r = spiralR(k, j) * (1 + (random() - 0.5) * 0.025); if (r < reach[j] * 0.94) run.push(at(j, r)); }
        close(fresh, bright, thick * 0.9);
      }
    }
    // Broken ends hang plumb, each with a drop.
    const dangling = a.web === 'torn' || a.web === 'abandoned' || a.weather === 'afterstorm' ? Math.min(looseTips.length, 6 + Math.round(mood.wear * 8)) : Math.round(mood.wear * 3);
    for (let i = 0; i < dangling && looseTips.length; i++) {
      const from = toWorld(looseTips[Math.floor(random() * looseTips.length)]), length = 0.5 + random() * 2;
      const end = from.clone().add(V((random() - 0.5) * 0.3, -length, 0.1));
      silk.add(tube([from, from.clone().lerp(end, 0.5).add(V(0.08, 0, 0.05)), end], thick * 0.7, { sides: 4, smooth: 6 }), silkTone);
      if (!frost) drops.add(new THREE.SphereGeometry(1, 10, 8), null, xf(end.clone().add(V(0, -0.08, 0)), V(0.09, 0.11, 0.09)));
    }

    // Standing places: silk hammocks slung in front of the web, and leaves beside it.
    const padTone = silkTone.clone().multiplyScalar(0.96);
    const slots: { at: THREE.Vector3; high: number; wide: number; group: THREE.Group }[] = [];
    const silkMaterial = () => matte({ roughness: 0.5, emissive: silkTone, emissiveIntensity: a.web === 'abandoned' ? 0.4 : 0.8 });
    // Each standing place is its own group, shown only when something stands there.
    const stand = (leaves: Bag, threads: Bag) => {
      const group = new THREE.Group();
      leaves.into(group, matte({ roughness: 0.85 }));
      threads.into(group, silkMaterial());
      root.add(group);
      return group;
    };
    const hammock = (local: THREE.Vector3, r: number, high: number, off: number) => {
      const centre = toWorld(local).addScaledVector(normal, off), silk = new Bag();
      silk.add(new THREE.CylinderGeometry(r, r * 0.82, 0.07, 28), padTone, xf(centre.clone().add(V(0, -0.035, 0))));
      for (const ring of [0.35, 0.68, 1]) silk.add(new THREE.TorusGeometry(r * ring, 0.022, 4, 28), padTone.clone().multiplyScalar(0.8), xf(centre.clone().add(V(0, 0.004, 0)), 1, new THREE.Euler(Math.PI / 2, 0, 0)));
      const guys = 9;
      for (let i = 0; i < guys; i++) {
        const angle = (i / guys) * Math.PI * 2 + 0.2, edge = centre.clone().add(V(Math.cos(angle) * r, 0, Math.sin(angle) * r));
        const tie = toWorld(local.clone().add(V(Math.cos(angle) * r * 1.9, -Math.sin(angle) * r * 1.7 + r * 0.25, 0)));
        silk.add(tube([edge, tie], thick, { sides: 4 }), silkTone);
        silk.add(tube([centre.clone().add(V(0, 0.01, 0)), edge.clone().add(V(0, 0.01, 0))], thick * 0.7, { sides: 3 }), padTone.clone().multiplyScalar(0.8));
      }
      slots.push({ at: centre, high, wide: r * 0.92, group: stand(new Bag(), silk) });
    };
    const perch = (centre: THREE.Vector3, r: number, high: number) => {
      const leafTone = green.clone().offsetHSL(0.01, 0.04, -0.03), plant = new Bag();
      let best = samples[0], score = Infinity;
      for (const sample of samples) { const s = sample.distanceTo(centre) + Math.abs(sample.y - centre.y + 1) * 0.5; if (s < score) { score = s; best = sample; } }
      const side = centre.x < best.x ? 1 : -1;
      const edge = centre.clone().add(V(side * r * 1.15, -0.02, 0));
      plant.add(tube(arc(best, edge, V(0, 0.5, 0), 8), 0.07, { sides: 6 }), leafTone);
      const disc = new THREE.SphereGeometry(1, 24, 12);
      const p = disc.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setXYZ(i, x * (1.25 - 0.2 * x * side), p.getY(i) * 0.05 + 0.06 * (x * x + z * z), z); }
      disc.computeVertexNormals();
      plant.add(disc, leafTone, xf(centre.clone().add(V(0, -0.05, 0)), r));
      plant.add(tube([edge, centre.clone().add(V(-side * r * 1.2, 0.07, 0))], 0.035, { sides: 4 }), leafTone.clone().multiplyScalar(0.8));
      for (let i = -3; i <= 3; i++) if (i) plant.add(tube([centre.clone().add(V(i * r * 0.28, 0.012, 0)), centre.clone().add(V(i * r * 0.36, 0.05, (i % 2 ? 1 : -1) * r * 0.8))], 0.018, { sides: 3 }), leafTone.clone().multiplyScalar(0.82));
      slots.push({ at: centre.clone().add(V(0, 0.03, 0)), high, wide: r * 0.85, group: stand(plant, new Bag()) });
    };
    hammock(V(0, 0, 0), 1.75, 3.5, 0.65);
    perch(V(-4.9, 1.7, 3.0), 1.3, 2.6);
    perch(V(5.0, 2.3, 2.7), 1.3, 2.6);
    hammock(V(-3.1, 3.0, 0), 1.0, 2.0, 0.55);
    hammock(V(3.3, 2.6, 0), 1.0, 2.0, 0.55);

    // Dew, or frost, along the threads.
    const load = mix(0.12, 0.95, a.dew) * mix(1, 0.7, sunUp) * (a.weather === 'afterstorm' ? 1.2 : 1);
    const spots: { p: THREE.Vector3; r: number }[] = [];
    const size = mix(0.055, 0.115, a.dew) * (a.weather === 'afterstorm' ? 1.25 : 1);
    for (const p of mids) if (random() < load) spots.push({ p: p.clone().add(V(0, -size * 0.5, 0)), r: size * (0.55 + random() * 0.75) });
    for (const p of nodes) if (random() < load * 0.7) spots.push({ p, r: size * (0.35 + random() * 0.4) });
    for (let j = 0; j < count; j++) for (let n = 0; n < 8; n++) if (random() < load * 0.5) spots.push({ p: at(j, mix(hubR, reach[j], random())), r: size * (0.3 + random() * 0.4) });
    // Keep the biggest beads when there are too many to draw cheaply.
    if (spots.length > 950) { spots.sort((p, q) => q.r - p.r); spots.length = 950; }
    const matrix = new THREE.Matrix4();
    const glass = dewMaterial(sky.clone().lerp(new THREE.Color('#ffffff'), 0.6), far.clone().lerp(new THREE.Color('#ffffff'), 0.45), mix(0.75, 1.0, mood.cheer));
    if (spots.length) {
      const geometry = frost ? new THREE.OctahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 8, 5);
      const material = frost ? new THREE.MeshStandardMaterial({ color: '#f6fbff', roughness: 0.25, emissive: '#b9d3e6', emissiveIntensity: 0.5, flatShading: true }) : glass;
      const beads = new THREE.InstancedMesh(geometry, material, spots.length);
      const q = new THREE.Quaternion(), e = new THREE.Euler();
      spots.forEach((spot, i) => {
        if (frost) { e.set(random() * 3, random() * 3, random() * 3); q.setFromEuler(e); matrix.compose(spot.p, q, V(spot.r * 0.5, spot.r * 2.2, spot.r * 0.5)); }
        else matrix.makeScale(spot.r, spot.r * 1.1, spot.r).setPosition(spot.p);
        beads.setMatrixAt(i, matrix);
      });
      beads.instanceMatrix.needsUpdate = true;
      beads.castShadow = false;
      web.add(beads);
    }
    if (!frost) for (const slot of slots) for (let i = 0; i < 3; i++) { const angle = random() * 6.28; drops.add(new THREE.SphereGeometry(1, 10, 8), null, xf(slot.at.clone().add(V(Math.cos(angle) * slot.wide * 1.05, 0.03, Math.sin(angle) * slot.wide * 1.05)), V(1, 0.75, 1).multiplyScalar(0.06 + random() * 0.07))); }

    // What else the web holds.
    const free = () => { for (let i = 0; i < 30; i++) { const p = nodes[Math.floor(random() * nodes.length)]; if (p && p.length() > 2.6 && p.distanceTo(V(-3.1, 3, 0)) > 1.9 && p.distanceTo(V(3.3, 2.6, 0)) > 1.9) return p; } return at(0, outer * 0.8); };
    if (a.caught === 'bundles') {
      const n = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const p = toWorld(free()).addScaledVector(normal, 0.14), turn = new THREE.Euler(-lean, 0, random() * 3), s = 0.75 + random() * 0.5;
        bits.add(new THREE.SphereGeometry(1, 12, 9), shade('#eeeade'), xf(p, V(0.2 * s, 0.36 * s, 0.19 * s), turn));
        for (let k = 0; k < 4; k++) bits.add(new THREE.TorusGeometry(0.2 * s * Math.sin(((k + 1) / 5) * Math.PI) + 0.01, 0.014, 4, 12), shade('#b9c0c4'), xf(p, 1, turn).multiply(xf(V(0, (k - 1.5) * 0.15 * s, 0), 1, new THREE.Euler(Math.PI / 2 + 0.3, 0, 0))));
        if (i === 0) bits.add(new THREE.SphereGeometry(1, 8, 6), shade('#3a3430'), xf(p, 1, turn).multiply(xf(V(0, 0.36 * s, 0), 0.11 * s)));
      }
    } else if (a.caught === 'spider') {
      const u = 0.24, body = shade('#b9783a'), dark = shade('#4d321f'), pale = shade('#e0c193');
      const m = xf(toWorld(V(-2.9, 4.3, 0)).addScaledVector(normal, 0.14), u, new THREE.Euler(-lean, 0, Math.PI + 0.5));
      bits.add(new THREE.SphereGeometry(1, 12, 9), dark, m.clone().multiply(xf(V(0, 0, 0.1), V(0.42, 0.52, 0.3))));
      bits.add(new THREE.SphereGeometry(1, 16, 12), body, m.clone().multiply(xf(V(0, -1.3, 0.25), V(0.85, 1.05, 0.7))));
      for (const [y, w] of [[0.5, 0.09], [0.15, 0.11], [-0.2, 0.09]] as const) bits.add(new THREE.SphereGeometry(1, 6, 5), '#f6efd9', m.clone().multiply(xf(V(0, -1.3 + y, 0.93), V(w, 0.14, 0.04))));
      for (const side of [-1, 1]) {
        bits.add(new THREE.SphereGeometry(1, 6, 5), '#f6efd9', m.clone().multiply(xf(V(side * 0.3, -0.95, 0.9), V(0.13, 0.08, 0.04))));
        [26, 60, 106, 152].forEach((degrees, i) => {
          const angle = THREE.MathUtils.degToRad(degrees + (random() - 0.5) * 10), length = [3.5, 3.1, 1.9, 3.0][i], from = V(side * 0.36, 0.3 - i * 0.2, 0);
          const foot = from.clone().add(V(side * Math.sin(angle) * length, Math.cos(angle) * length, 0)).setZ(-0.3);
          const joints = [from, from.clone().lerp(foot, 0.3).setZ(0.75), from.clone().lerp(foot, 0.7).setZ(0.45), foot], path: THREE.Vector3[] = [];
          for (let s = 0; s < 3; s++) for (let n = 0; n < 4; n++) path.push(joints[s].clone().lerp(joints[s + 1], n / 4));
          path.push(foot);
          bits.add(tube(path, (t) => mix(0.13, 0.05, t), { sides: 5, colour: (t) => (Math.floor(t * 6.99) % 2 ? pale : dark) }), null, m);
        });
      }
    } else if (a.caught === 'debris') {
      const n = 5 + Math.round(mood.density * 6);
      for (let i = 0; i < n; i++) {
        const p = toWorld(free()).addScaledVector(normal, 0.08);
        if (i % 2) {
          const tip = p.clone().add(V((random() - 0.5) * 0.7, 0.5 + random() * 0.4, 0.3));
          bits.add(tube([p, tip], 0.02, { sides: 4 }), shade('#9a8a66'));
          bits.add(new THREE.SphereGeometry(1, 6, 5), shade('#7d6a44'), xf(p, V(0.05, 0.13, 0.05)));
          for (let k = 0; k < 16; k++) { const angle = (k / 16) * Math.PI * 2; bits.add(tube([tip, tip.clone().add(V(Math.cos(angle) * 0.42, 0.14 + random() * 0.1, Math.sin(angle) * 0.42))], 0.01, { sides: 3 }), '#eef0ea'); }
        } else {
          const s = 0.35 + random() * 0.3, to = p.clone().add(V((random() - 0.5) * s * 2, (random() - 0.5) * s, 0.12));
          bits.add(tube(arc(p, to, V(0, 0, 0.08), 6), (t) => 0.02 + s * 0.4 * Math.sin(t * Math.PI) ** 0.8, { sides: 7, flat: 0.1, up: normal }), shade(['#8a5a2b', '#b9893a', '#a3562e'][i % 3]));
        }
      }
    }

    plant.into(root, matte({ roughness: 0.85 }));
    wood.into(root, matte({ roughness: 0.9 }));
    const webMesh = webSilk.into(web, silkMaterial());
    if (webMesh) webMesh.castShadow = false;
    const freshMesh = fresh.into(web, matte({ roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.75 }));
    if (freshMesh) freshMesh.castShadow = false;
    silk.into(root, silkMaterial());
    drops.into(root, glass);
    bits.into(root, matte({ roughness: 0.7 }));

    // Falling drops and drizzle.
    const fallers: { mesh: THREE.Mesh; from: THREE.Vector3; phase: number }[] = [];
    if (!frost && spots.length) {
      const n = Math.round(mix(1, 6, mood.energy) * (a.weather === 'drizzle' || a.weather === 'afterstorm' ? 2 : 1));
      const geometry = new THREE.SphereGeometry(1, 8, 6);
      for (let i = 0; i < n; i++) {
        const mesh = new THREE.Mesh(geometry, glass), from = toWorld(spots[Math.floor(random() * spots.length)].p);
        mesh.scale.set(0.06, 0.1, 0.06);
        mesh.position.copy(from);
        root.add(mesh);
        fallers.push({ mesh, from, phase: random() });
      }
    }
    let rain: THREE.InstancedMesh | null = null;
    if (a.weather === 'drizzle') {
      const n = Math.round(mix(90, 220, mood.energy));
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.7, 0.018), new THREE.MeshBasicMaterial({ color: '#f2f6f6', transparent: true, opacity: 0.4, depthWrite: false }), n);
      for (let i = 0; i < n; i++) { matrix.makeRotationZ(-0.1).setPosition((random() - 0.5) * 22, random() * 30, -6 + random() * 14); rain.setMatrixAt(i, matrix); }
      root.add(rain);
    }

    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    const toCamera = { front: V(0.2, 0.06, 1), raking: V(0.95, 0.1, 0.62), under: V(0.22, -0.3, 1) }[a.view].normalize();
    const corners = polygon.map((corner) => toWorld(corner.clone().multiplyScalar(1.0)));

    const place = (items: readonly Placeable[]) => {
      const points: THREE.Vector3[] = [...corners];
      slots.forEach((slot, index) => { slot.group.visible = index === 0 || index < items.length; });
      for (const slot of slots.slice(0, Math.max(1, Math.min(items.length, slots.length)))) points.push(slot.at.clone().add(V(slot.wide, 0, 0)), slot.at.clone().add(V(-slot.wide, 0, 0)), slot.at.clone().add(V(0, -0.5, 0)));
      items.forEach((item, index) => {
        const slot = slots[index % slots.length];
        const scale = Math.min(slot.high / Math.max(item.height, 0.05), slot.wide / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.copy(slot.at);
        item.holder.rotation.y = Math.atan2(toCamera.x, toCamera.z) * 0.8 + (context.random() - 0.5) * 0.4;
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        if (box.isEmpty()) return;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(V(x, y, z));
      });
      // Aim at the middle of everything, then back off until it all fits.
      const bounds = new THREE.Box3().setFromPoints(points);
      const target = bounds.getCenter(V()).lerp(H, 0.35);
      camera.position.copy(target).add(toCamera);
      camera.up.set(0, 1, 0);
      camera.lookAt(target);
      camera.updateMatrixWorld(true);
      const right = V().setFromMatrixColumn(camera.matrixWorld, 0), up = V().setFromMatrixColumn(camera.matrixWorld, 1);
      const slope = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      let distance = 8;
      for (const point of points) {
        const v = point.clone().sub(target);
        distance = Math.max(distance, v.dot(toCamera) + (Math.max(Math.abs(v.dot(right)), Math.abs(v.dot(up))) / slope) * 1.07);
      }
      camera.position.copy(target).addScaledVector(toCamera, distance);
      camera.lookAt(target);
      camera.near = Math.max(0.5, distance - 30);
      camera.far = distance + 160;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      const depth = 90;
      backdrop.position.copy(target).addScaledVector(toCamera, -depth);
      backdrop.quaternion.copy(camera.quaternion);
      backdrop.scale.setScalar((distance + depth) * slope * 2 * 1.02);
      key.target.position.copy(target);
      key.position.copy(target).add(V(mix(-13, 13, d), 8 + sunUp * 8, 15));
      rim.target.position.copy(target);
      rim.position.copy(target).add(V(mix(-10, 10, d), 3 + sunUp * 6, -16));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -11;
      shadow.right = shadow.top = 11;
      shadow.near = 1; shadow.far = 70;
      shadow.updateProjectionMatrix();
    };

    const speed = mix(0.25, 0.9, mood.energy);
    return {
      object: root, camera, background, capacity: slots.length, ground, keyLight: key, place,
      update(_dt: number, time: number) {
        for (const faller of fallers) {
          const t = (time * speed + faller.phase) % 1.6;
          faller.mesh.visible = t < 1;
          faller.mesh.position.y = faller.from.y - t * t * 9;
        }
        if (rain) rain.position.y = -((time * 9) % 10);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
