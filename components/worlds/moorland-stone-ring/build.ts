import * as THREE from 'three';
import { type Placeable, type World, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';
import { crow, instanced, makeNoise, sheep, solid, stoneGeometry, stoneMaterial, tufts, type Dab } from './stone';

const RR = 8; // ring radius, metres

export default defineWorld({
  questions: {
    ring: choice('What are the stones of the ring like?', {
      pillars: 'Rough upright pillars of mixed heights, the classic moorland circle.',
      boulders: 'Low rounded boulders, knee to waist high, easy to miss in the grass.',
      sarsens: 'Massive dressed uprights, some still carrying lintels across their tops.',
      blades: 'Tall thin slabs with slanted tops, like knives stood on end.',
      recumbent: 'Stones graded in height toward one enormous block lying on its side between two tall flankers.',
    }),
    survival: score('How much of the ring survives?', ['A few lonely survivors and fallen stones', 'Gapped and leaning', 'Complete, every stone in place']),
    ground: choice('What is the ground?', {
      frost: 'Winter grass white with frost.',
      turf: 'Summer turf, green and close-cropped, with paths worn by visitors.',
      heather: 'Heather and peat, purple-brown and rough.',
      snow: 'Snow, with the stones standing black out of it.',
      bog: 'Wet bog: dark peat, standing pools and cotton grass.',
    }),
    sky: choice('What is the sky doing?', {
      clear: 'Clear, with clean raking sunlight and sharp shadows.',
      mist: 'Mist lying in the hollows and drifting through the stones.',
      storm: 'A storm: slate-dark cloud, rain driving across.',
      stars: 'Deep dusk with the first stars and a moon.',
      overcast: 'Flat white overcast, shadowless and still.',
    }),
    company: choice('Who else is here?', {
      nobody: 'Nobody at all.',
      gathering: 'A gathering: robed figures with torches round a fire inside the ring.',
      tourists: 'Day visitors in bright waterproofs, a rope barrier and an information board.',
      sheep: 'A flock of sheep grazing among the stones.',
      watcher: 'A single figure standing far off on the ridge, and crows on the stones.',
    }),
    earthwork: choice('What else did the builders leave?', {
      none: 'Only the ring.',
      henge: 'A bank and ditch encircling the stones, broken by a causeway at the entrance.',
      avenue: 'An avenue of paired small stones leading out through the gap.',
      outlier: 'A leaning outlying stone beyond the gap, and a fallen slab at the entrance.',
      cairn: 'A low kerbed cairn of cobbles heaped against the inside of the ring.',
    }),
    view: choice('Where are we looking from?', {
      survey: 'A calm raised view taking in the whole ring.',
      low: 'Low, near head height, the stones standing up against the hills.',
      high: 'High above, the ring a diagram on the moor.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const noise = makeNoise(random);
    const root = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T) => { root.add(node); return node; };

    // ---- Framing, fixed for the place: the camera looks from +z, tilted down. ----
    const pitch = THREE.MathUtils.degToRad({ survey: 23, low: 15, high: 32 }[a.view]);
    const sp = Math.sin(pitch), cp = Math.cos(pitch);
    const half = RR + 2.4, tall = 6;
    const minY = -half * sp, maxY = tall * cp + half * sp;
    const extent = (Math.max(half * 2, maxY - minY) / 2) * 1.04;
    const cy = (minY + maxY) / 2;
    /** World height that lands at a given fraction up the frame (-1 bottom … 1 top) for a point at depth z. */
    const skyAt = (fraction: number, z: number) => (cy + extent * fraction + z * sp) / cp;
    const frontZ = (extent - cy) / sp + 2;
    const camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 0.1, 400);
    camera.position.set(0, sp * 120, cp * 120);
    camera.lookAt(0, 0, 0);
    camera.translateY(cy);
    camera.updateMatrixWorld(true);

    // ---- Light: the sun's place comes from the mood, its character from the sky. ----
    const stormy = a.sky === 'storm', night = a.sky === 'stars', flat = a.sky === 'overcast' || a.sky === 'mist';
    const azimuth = THREE.MathUtils.degToRad(mix(152, 28, mood.daylight));
    const elevation = THREE.MathUtils.degToRad(night ? 24 : mix(9, 54, Math.sin(Math.PI * mood.daylight) ** 2.2) + (a.ground === 'turf' ? 6 : 0));
    const lowSun = 1 - clamp01((THREE.MathUtils.radToDeg(elevation) - 9) / 30);
    const sunDir = new THREE.Vector3(Math.cos(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.sin(azimuth) * Math.cos(elevation));
    const warmSun = new THREE.Color('#ffffff').lerp(new THREE.Color('#ffc98a'), lowSun * mix(0.45, 1, mood.warmth));
    const skyTint = new THREE.Color(
      stormy ? '#7c8790' : night ? '#66709a' : a.sky === 'mist' ? '#cfd4d1' : a.sky === 'overcast' ? '#d6d9d6' : '#dbe6ea',
    );
    if (a.sky === 'clear') skyTint.lerp(new THREE.Color(mood.warmth > 0.5 ? '#f0cfa8' : '#ecd6cf'), lowSun * 0.75);
    skyTint.lerp(new THREE.Color('#8a8f96'), (1 - mood.cheer) * (stormy ? 0.25 : 0.1));
    const background = skyTint.clone();

    const hemi = add(new THREE.HemisphereLight(stormy ? '#aebccb' : night ? '#9fb0e0' : '#eef3ff', '#6f6a5a', stormy ? 1.05 : night ? 1.0 : flat ? 1.15 : 0.82));
    const key = new THREE.DirectionalLight(stormy ? '#c2cdd8' : night ? '#b9c8f2' : warmSun, stormy ? 1.3 : night ? 1.5 : flat ? 1.45 : mix(2.7, 3.4, lowSun));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.05;
    key.shadow.bias = -0.0004;
    key.shadow.radius = flat ? 9 : 3;
    key.position.copy(sunDir).multiplyScalar(70);
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -30; shadow.right = shadow.top = 30; shadow.near = 1; shadow.far = 170;
    shadow.updateProjectionMatrix();
    add(key); add(key.target);
    const fill = add(new THREE.DirectionalLight(stormy || night ? '#9fb0d0' : '#cfe0ff', 0.45));
    fill.position.set(6, 9, 14);

    // ---- Ground. ----
    const frost = a.ground === 'frost' ? 0.8 : a.ground === 'snow' ? 1 : mood.warmth < 0.25 ? 0.5 : 0;
    const gap = azimuth; // the entrance faces the sun
    const henge = a.earthwork === 'henge';
    const ridgeY = Math.max(0.9, skyAt(0.52, -13));
    const angleFrom = (x: number, z: number, to: number) => Math.abs(Math.atan2(Math.sin(Math.atan2(z, x) - to), Math.cos(Math.atan2(z, x) - to)));
    const heightAt = (x: number, z: number) => {
      const r = Math.hypot(x, z);
      let h = noise(x * 0.07, 0, z * 0.07, 3) * 0.9 * THREE.MathUtils.smoothstep(r, 12.5, 24);
      h += noise(x * 0.3, 4, z * 0.3, 2) * 0.05;
      h += ridgeY * THREE.MathUtils.smoothstep(-z, 7.5, 13) * (0.72 + 0.28 * noise(x * 0.09, 8, 0, 2));
      if (henge) {
        const causeway = THREE.MathUtils.smoothstep(angleFrom(x, z, gap), 0.16, 0.3);
        h += 0.85 * Math.exp(-(((r - 11.6) / 0.85) ** 2)) * causeway;
        h -= 0.5 * Math.exp(-(((r - 10.1) / 0.6) ** 2)) * causeway;
      }
      return h;
    };
    const palette = {
      frost: ['#8fa692', '#7d9780', '#c5d4cc'], turf: ['#6f9448', '#5d823e', '#8aa655'], heather: ['#75644f', '#62525e', '#84744e'],
      snow: ['#dde5ea', '#cfd9e0', '#f2f5f6'], bog: ['#6a6048', '#544a39', '#7f7c4c'],
    }[a.ground].map((hex) => new THREE.Color(hex).lerp(new THREE.Color('#c9a878'), Math.max(0, mood.warmth - 0.65) * 0.5));
    const pathTint = new THREE.Color(a.ground === 'snow' ? '#cfd6da' : a.ground === 'bog' ? '#2a231c' : '#b3a67c');
    const worn = a.ground === 'turf' || a.company === 'tourists' ? 1 : a.company === 'gathering' ? 0.6 : 0.25;
    const pools: [number, number][] = [];
    const sx = 150, sz = 96, X0 = -48, X1 = 48, Z0 = -13.2, Z1 = Math.max(26, frontZ + 2);
    const ground = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, sx, sz);
    ground.rotateX(-Math.PI / 2);
    ground.translate(0, 0, (Z0 + Z1) / 2);
    {
      const position = ground.getAttribute('position') as THREE.BufferAttribute;
      const colours = new Float32Array(position.count * 3);
      const c = new THREE.Color(), dark = background.clone().multiplyScalar(0.5);
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i), r = Math.hypot(x, z);
        const y = heightAt(x, z);
        position.setY(i, y);
        const patch = noise(x * 0.16, 2, z * 0.16, 3);
        c.copy(palette[0]).lerp(palette[1], THREE.MathUtils.smoothstep(patch, -0.25, 0.2)).lerp(palette[2], THREE.MathUtils.smoothstep(noise(x * 0.5, 6, z * 0.5, 2), 0.15, 0.5) * 0.7);
        // Feet have worn a ring just inside the stones and a path in through the gap.
        const inRing = Math.exp(-(((r - (RR - 1.3)) / 0.7) ** 2));
        const along = x * Math.cos(gap) + z * Math.sin(gap), across = -x * Math.sin(gap) + z * Math.cos(gap);
        const lane = along > RR - 2 ? Math.exp(-(((across + Math.sin(along * 0.3) * 0.6) / 0.75) ** 2)) : 0;
        c.lerp(pathTint, Math.max(inRing, lane) * worn * 0.75);
        if (a.ground === 'bog' && r > 4.5 && noise(x * 0.2, 12, z * 0.2, 2) > 0.3 && Math.abs(y) < 0.4) { c.copy(dark); position.setY(i, y - 0.05); if (i % 5 === 0) pools.push([x, z]); }
        if (henge) c.multiplyScalar(1 - 0.22 * Math.exp(-(((r - 10.1) / 0.6) ** 2)));
        c.multiplyScalar(1 - 0.16 * THREE.MathUtils.smoothstep(-z, 8, 13));
        colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
      }
      ground.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      ground.computeVertexNormals();
    }
    const floor = add(new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: a.ground === 'bog' ? 0.7 : 1 })));
    floor.receiveShadow = true;

    // Far hills: two paler cut-out ranges behind the moor.
    for (const [z, base, swing, haze, seed] of [[-14.2, 0.6, 0.12, 0.55, 3], [-15.6, 0.7, 0.16, 0.78, 17]] as const) {
      const shape = new THREE.Shape();
      shape.moveTo(-50, -4);
      for (let i = 0; i <= 100; i++) { const x = -50 + i; shape.lineTo(x, skyAt(base + swing * noise(x * 0.045, seed, 0, 3) + 0.03 * noise(x * 0.3, seed, 5, 2), z)); }
      shape.lineTo(50, -4);
      const hill = add(new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: palette[1].clone().lerp(background, haze), roughness: 1 })));
      hill.position.z = z;
    }

    // ---- The ring. ----
    const stoneTint = new THREE.Color(a.ring === 'sarsens' ? '#a5a39b' : a.ring === 'blades' ? '#8f8b84' : '#96928a').lerp(new THREE.Color('#d8a56a'), lowSun * mood.warmth * 0.25);
    if (a.ground === 'snow' || stormy) stoneTint.multiplyScalar(0.72);
    const patches = [{ color: '#c9cdb1', amount: 0.3 + mood.wear * 0.3, scale: 2.4 }, { color: '#d39a35', amount: 0.14, scale: 4 }, { color: '#4f6a2f', amount: a.ground === 'snow' ? 0 : 0.2, scale: 1.3, up: 2 }];
    const material = stoneMaterial();
    const block = (size: readonly [number, number, number], round: number, taper: number, rough = 0.02) =>
      solid(stoneGeometry(random, { size, round, taper, rough: Math.max(...size) * rough * mix(0.8, 1.5, mood.wear), base: stoneTint, patches, damp: 0.6, frost: frost * 0.55, segments: 10 }), material);
    const perches: THREE.Vector3[] = [];
    const count = { pillars: 17, boulders: 22, sarsens: 14, blades: 13, recumbent: 13 }[a.ring];
    const standing: (number | null)[] = [];
    const recumbentAt = -Math.PI / 2 + (random() - 0.5) * 0.3;
    for (let i = 0; i < count; i++) {
      const angle = gap + ((i + 0.5) / count) * Math.PI * 2;
      const fromGap = Math.min(i, count - 1 - i);
      const x = Math.cos(angle) * RR, z = Math.sin(angle) * RR;
      const portal = fromGap === 0;
      const nearRecumbent = a.ring === 'recumbent' ? angleFrom(x, z, recumbentAt) : 9;
      if (a.ring === 'recumbent' && nearRecumbent < 0.2) { standing.push(null); continue; }
      // The side nearest the viewer is always the most ruined, so the centre stays in view.
      const tallRing = a.ring !== 'boulders';
      const front = tallRing ? THREE.MathUtils.smoothstep(Math.sin(angle), 0.3, 0.8) : 0;
      const lost = (!portal && random() > mix(0.42, 1.02, a.survival) - mood.wear * 0.12) || random() < front * 0.8;
      let w = 1, h = 2, d = 0.6, round = 0.25, taper = 0.75;
      if (a.ring === 'pillars') { h = mix(1.7, 3.2, random()) * (portal ? 1.25 : 1); w = mix(0.8, 1.3, random()); d = mix(0.5, 0.8, random()); }
      else if (a.ring === 'boulders') { h = mix(0.6, 1.2, random()) * (portal ? 1.4 : 1); w = mix(0.9, 1.5, random()); d = mix(0.7, 1.1, random()); round = 0.7; taper = 0.7; }
      else if (a.ring === 'sarsens') { h = 4.1; w = 2.0; d = 0.95; round = 0.14; taper = 0.9; }
      else if (a.ring === 'blades') { h = mix(2.6, 4.6, random()); w = mix(1.1, 1.6, random()); d = 0.3; round = 0.08; taper = mix(0.35, 0.7, random()); }
      else { h = mix(1.2, 1.7, random()) + 2.2 * Math.exp(-((nearRecumbent / 0.9) ** 2)); w = mix(0.8, 1.2, random()); d = mix(0.5, 0.7, random()); }
      if (lost && random() < 0.4) { standing.push(null); continue; }
      if (!lost && front > 0) h *= mix(1, 0.5, front);
      const stone = block([w, h + 0.5, d], round, taper, a.ring === 'sarsens' ? 0.012 : 0.022);
      const holder = new THREE.Group();
      holder.add(stone);
      const y = heightAt(x, z);
      if (lost) {
        // Fallen outward or inward, half sunk.
        const outward = random() < 0.6 ? 1 : -1;
        holder.rotation.set(0, -angle + Math.PI / 2 + (random() - 0.5) * 0.5, 0);
        stone.rotation.x = outward * (Math.PI / 2 - 0.06);
        stone.position.set(0, d * 0.32, -outward * 0.2);
        holder.position.set(x, y, z);
        standing.push(null);
      } else {
        holder.position.set(x, y - 0.5, z);
        holder.rotation.set((random() - 0.5) * 0.16 * (1.2 - a.survival + mood.wear * 0.6), -angle + Math.PI / 2 + (random() - 0.5) * 0.25, (random() - 0.5) * 0.14 * (1.2 - a.survival + mood.wear * 0.6));
        standing.push(h);
        perches.push(new THREE.Vector3(x, y + h - 0.06, z));
      }
      add(holder);
    }
    if (a.ring === 'sarsens') {
      for (let i = 0; i < count - 1; i++) {
        if (standing[i] === null || standing[i + 1] === null || standing[i]! < 4 || standing[i + 1]! < 4 || random() > mix(0.2, 0.85, a.survival)) continue;
        const a0 = gap + ((i + 0.5) / count) * Math.PI * 2, a1 = gap + ((i + 1.5) / count) * Math.PI * 2, mid = (a0 + a1) / 2;
        const chord = 2 * RR * Math.sin((a1 - a0) / 2);
        const lintel = block([chord + 0.5, 0.8, 1.05], 0.14, 0.97, 0.012);
        lintel.position.set(Math.cos(mid) * RR * Math.cos((a1 - a0) / 2), 4.02, Math.sin(mid) * RR * Math.cos((a1 - a0) / 2));
        lintel.rotation.y = -mid + Math.PI / 2;
        add(lintel);
      }
    }
    if (a.ring === 'recumbent') {
      const lying = block([4.2, 1.7, 1.3], 0.3, 0.9);
      lying.position.set(Math.cos(recumbentAt) * RR, heightAt(Math.cos(recumbentAt) * RR, Math.sin(recumbentAt) * RR) - 0.25, Math.sin(recumbentAt) * RR);
      lying.rotation.y = -recumbentAt + Math.PI / 2;
      add(lying);
      for (const side of [-1, 1]) {
        const at = recumbentAt + side * 0.34;
        const flanker = block([1.2, 4.1, 0.8], 0.22, 0.6);
        flanker.position.set(Math.cos(at) * RR, -0.5, Math.sin(at) * RR);
        flanker.rotation.set(0, -at + Math.PI / 2, side * 0.05);
        add(flanker);
        perches.push(new THREE.Vector3(flanker.position.x, 3.5, flanker.position.z));
      }
    }

    // ---- What else the builders left. ----
    const gx = Math.cos(gap), gz = Math.sin(gap);
    if (a.earthwork === 'avenue') for (let i = 0; i < 7; i++) for (const side of [-1, 1]) {
      const along = RR + 2.6 + i * 2.7, x = gx * along - gz * side * 1.7, z = gz * along + gx * side * 1.7;
      if (random() < 0.15 + mood.wear * 0.2) continue;
      const stone = block([mix(0.5, 0.8, random()), mix(0.9, 1.6, random()) + 0.4, mix(0.4, 0.6, random())], 0.35, 0.7);
      stone.position.set(x, heightAt(x, z) - 0.4, z);
      stone.rotation.set((random() - 0.5) * 0.2, random() * 3, (random() - 0.5) * 0.2);
      add(stone);
    }
    if (a.earthwork === 'outlier') {
      const far = RR + 5.5, heel = block([1.5, 3.9, 1.1], 0.4, 0.62);
      heel.position.set(gx * far, heightAt(gx * far, gz * far) - 0.5, gz * far);
      heel.rotation.set(0, -gap, 0.28);
      add(heel);
      const slab = block([1.4, 3.6, 0.7], 0.25, 0.85);
      slab.rotation.set(Math.PI / 2 - 0.05, 0, 0);
      const cradle = new THREE.Group();
      cradle.add(slab);
      cradle.position.set(gx * (RR + 0.4) + gz * 1.2, 0.22, gz * (RR + 0.4) - gx * 1.2);
      cradle.rotation.y = -gap + 0.3;
      add(cradle);
    }
    if (a.earthwork === 'cairn') {
      const at = gap + Math.PI + 0.5, cx = Math.cos(at) * (RR - 2.3), cz = Math.sin(at) * (RR - 2.3);
      const cobbles: Dab[] = [];
      for (let i = 0; i < 130; i++) { const angle = random() * 6.28, out = Math.sqrt(random()), u = mix(0.16, 0.34, random()); cobbles.push({ at: [cx + Math.cos(angle) * out * 1.9, (1 - out * out) * 0.6 + u * 0.1, cz + Math.sin(angle) * out * 1.9], scale: [u, u * 0.7, u * 0.85], turn: [random(), random() * 6, random()] }); }
      for (let i = 0; i < 16; i++) { const angle = (i / 16) * 6.28; cobbles.push({ at: [cx + Math.cos(angle) * 2.05, 0.05, cz + Math.sin(angle) * 2.05], scale: [0.5, 0.42, 0.34], turn: [0, -angle + Math.PI / 2, 0] }); }
      add(instanced(stoneGeometry(random, { size: [1, 1, 1], round: 0.6, rough: 0.06, base: stoneTint, patches, frost: frost * 0.8, segments: 5 }), material, cobbles));
    }

    // ---- Moor dressing: tussocks, heather, loose stones, bog pools. ----
    const scatter = (): [number, number, number] => {
      for (let attempt = 0; attempt < 12; attempt++) {
        const x = mix(-extent - 3, extent + 3, random()), z = mix(-11, frontZ, random() ** 1.15);
        if (Math.abs(Math.hypot(x, z) - (RR - 1.3)) < 0.7) continue;
        return [x, heightAt(x, z), z];
      }
      return [0, 0, 20];
    };
    const tussock = { frost: ['#b7c8bb', '#a3b7a4', '#cfdcd6', '#a99d74'], turf: ['#6f9448', '#84a352', '#5d823e'], heather: ['#8a7a45', '#6b6a3a', '#a08a4e'], snow: ['#b9ae8a', '#cfc9b4', '#a39c80'], bog: ['#8a7a45', '#6b6a3a', '#a39a52'] }[a.ground];
    const tuftPoints: [number, number, number][] = [];
    for (let i = 0; i < Math.round(mix(320, 760, mood.density) * (a.ground === 'turf' ? 0.6 : a.ground === 'snow' ? 0.35 : 1)); i++) tuftPoints.push(scatter());
    add(tufts(random, tuftPoints, tussock, a.ground === 'turf' ? 0.26 : 0.5));
    if (a.ground === 'heather' || a.ground === 'bog') {
      const dabs: Dab[] = [];
      const tints = a.ground === 'heather' ? (mood.warmth > 0.35 ? ['#64505e', '#6e5a66', '#5e4a3c', '#59613a'] : ['#5a4638', '#6b5340', '#4d4034']) : ['#5d5240', '#6a6240', '#4f4a36'];
      for (let i = 0; i < Math.round(mix(160, 420, mood.density) * (a.ground === 'bog' ? 0.4 : 1)); i++) { const [x, y, z] = scatter(); const u = mix(0.25, 0.55, random()); dabs.push({ at: [x, y + u * 0.2, z], scale: [u, u * 0.42, u * 0.9], turn: [0, random() * 6, 0], color: tints[Math.floor(random() * tints.length)] }); }
      add(instanced(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, flatShading: true }), dabs));
    }
    if (a.ground === 'bog') {
      const sheen: Dab[] = pools.slice(0, 260).map(([x, z]) => ({ at: [x, heightAt(x, z) + 0.012, z] as const, scale: [0.95, 0.01, 0.8] as const }));
      const water = add(instanced(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshStandardMaterial({ color: background.clone().multiplyScalar(0.62), roughness: 0.04, metalness: 0.6 }), sheen));
      water.castShadow = false;
      const cotton: Dab[] = tuftPoints.slice(0, 160).map(([x, y, z]) => ({ at: [x + 0.05, y + 0.42, z] as const, scale: 0.07 }));
      add(instanced(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#f6f4ec', roughness: 1 }), cotton));
    }
    {
      const loose: Dab[] = [];
      for (let i = 0; i < Math.round(mix(14, 50, mood.wear)); i++) { const [x, y, z] = scatter(); const u = mix(0.15, 0.5, random()); loose.push({ at: [x, y - u * 0.15, z], scale: [u, u * 0.6, u * 0.8], turn: [random() * 0.4, random() * 6, random() * 0.4] }); }
      add(instanced(stoneGeometry(random, { size: [1, 1, 1], round: 0.6, rough: 0.07, base: stoneTint, patches, frost: frost * 0.8, segments: 5 }), material, loose));
    }

    // A shaft of low sun laid through the entrance and across the centre.
    if (a.sky === 'clear' && lowSun > 0.45) {
      const beam = add(new THREE.Mesh(new THREE.PlaneGeometry(2 * RR + 9, 2.4), new THREE.MeshBasicMaterial({ color: warmSun, transparent: true, opacity: 0.16 * lowSun, depthWrite: false })));
      beam.rotation.set(-Math.PI / 2, 0, -gap, 'YXZ');
      beam.rotation.set(-Math.PI / 2, 0, 0);
      beam.rotateZ(-gap);
      beam.position.set(-gx * 1.5, 0.06, -gz * 1.5);
    }

    // ---- Company. ----
    const flames: THREE.Mesh[] = [];
    let fire: THREE.PointLight | null = null;
    const robe = new THREE.CylinderGeometry(0.16, 0.36, 1.42, 9);
    robe.translate(0, 0.71, 0);
    const jacket = new THREE.CylinderGeometry(0.2, 0.24, 0.72, 9);
    jacket.translate(0, 1.1, 0);
    const legs = new THREE.CylinderGeometry(0.17, 0.13, 0.8, 8);
    legs.translate(0, 0.4, 0);
    const folk = (list: { x: number; z: number; tint: string; size?: number; hood?: boolean }[]) => {
      const robes: Dab[] = [], coats: Dab[] = [], trousers: Dab[] = [], heads: Dab[] = [], packs: Dab[] = [];
      for (const person of list) {
        const k = person.size ?? 1, y = heightAt(person.x, person.z), turn = random() * 6.28;
        if (person.hood) robes.push({ at: [person.x, y, person.z], scale: k, color: person.tint });
        else {
          coats.push({ at: [person.x, y, person.z], scale: [k, k, k * 0.75], turn: [0, turn, 0], color: person.tint });
          trousers.push({ at: [person.x, y, person.z], scale: [k, k, k * 0.75], turn: [0, turn, 0], color: random() < 0.5 ? '#2d3540' : '#4a4338' });
          if (random() < 0.5) packs.push({ at: [person.x - Math.sin(turn) * 0.2 * k, y + 1.15 * k, person.z - Math.cos(turn) * 0.2 * k], scale: [0.16 * k, 0.24 * k, 0.12 * k], turn: [0, turn, 0], color: random() < 0.5 ? '#2c3038' : '#7a3a2a' });
        }
        heads.push({ at: [person.x, y + (person.hood ? 1.55 : 1.62) * k, person.z], scale: person.hood ? [0.19 * k, 0.22 * k, 0.19 * k] : 0.14 * k, color: person.hood ? person.tint : random() < 0.4 ? '#d8263c' : '#c9a58a' });
      }
      const paint = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
      if (robes.length) add(instanced(robe, paint(), robes));
      if (coats.length) { add(instanced(jacket, paint(), coats)); add(instanced(legs, paint(), trousers)); }
      if (packs.length) add(instanced(new THREE.SphereGeometry(1, 8, 6), paint(), packs));
      add(instanced(new THREE.SphereGeometry(1, 10, 8), paint(), heads));
    };
    if (a.company === 'gathering') {
      const fx = 0.3, fz = 5.4;
      const lit = new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff8a1e', emissiveIntensity: mix(1.6, 3.2, mood.warmth) });
      const logs = new THREE.MeshStandardMaterial({ color: '#2f241c', roughness: 1 });
      for (let i = 0; i < 7; i++) { const angle = (i / 7) * 6.28; const log = add(solid(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 6), logs)); log.position.set(fx + Math.cos(angle) * 0.28, 0.5, fz + Math.sin(angle) * 0.28); log.rotation.set(Math.sin(angle) * 0.5, 0, -Math.cos(angle) * 0.5); }
      for (let i = 0; i < 5; i++) { const flame = add(new THREE.Mesh(new THREE.ConeGeometry(mix(0.16, 0.34, random()), mix(0.8, 1.5, random()), 7), lit)); flame.position.set(fx + (random() - 0.5) * 0.4, 0.75 + random() * 0.3, fz + (random() - 0.5) * 0.4); flames.push(flame); }
      fire = add(new THREE.PointLight('#ff9a3c', mix(60, 170, mood.warmth) * (night || stormy ? 1.5 : 1), 26, 1.6));
      fire.position.set(fx, 1.5, fz);
      const robeTints = mood.cheer > 0.6 ? ['#e9e4d6', '#d9d2bd', '#f1ede2'] : ['#3a3530', '#4a3f38', '#e2dccb', '#5a2f2a'];
      const crowd: { x: number; z: number; tint: string; hood: boolean }[] = [];
      const n = Math.round(mix(5, 15, mood.density));
      const stick = new THREE.MeshStandardMaterial({ color: '#3a2c1f', roughness: 1 });
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + 0.3, r = mix(5.6, 6.6, random());
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r * 0.92 + 0.4;
        if (Math.hypot(x - fx, z - fz) < 1.3) continue;
        crowd.push({ x, z, tint: robeTints[Math.floor(random() * robeTints.length)], hood: true });
        if (random() < 0.6) {
          const torch = add(solid(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 5), stick));
          torch.position.set(x + 0.3, 1.15, z + 0.1);
          const flame = add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), lit));
          flame.position.set(x + 0.3, 2.08, z + 0.1);
          flames.push(flame);
        }
      }
      folk(crowd);
    } else if (a.company === 'tourists') {
      const coats = ['#d8263c', '#1f6fd0', '#f2c22a', '#2f9a5a', '#e45a9c', '#f08a2a'];
      const crowd: { x: number; z: number; tint: string; size: number }[] = [];
      const groups = Math.round(mix(2, 6, mood.density));
      for (let g = 0; g < groups; g++) {
        const angle = random() * 6.28, r = mix(RR + 1.8, RR + 4.5, random());
        const gxp = Math.cos(angle) * r, gzp = Math.abs(Math.sin(angle)) * r * 0.9 + (random() < 0.3 ? -r * 0.5 : 2);
        for (let i = 0; i < 1 + Math.floor(random() * 3); i++) crowd.push({ x: gxp + (random() - 0.5) * 1.6, z: gzp + (random() - 0.5) * 1.2, tint: coats[Math.floor(random() * coats.length)], size: random() < 0.25 ? 0.68 : mix(0.95, 1.08, random()) });
      }
      folk(crowd);
      // A rope on low posts keeps them off the stones.
      const post = new THREE.MeshStandardMaterial({ color: '#5a5148', roughness: 1 });
      const posts: Dab[] = [], ropes: Dab[] = [];
      const np = 34, rr = RR + 1.5;
      for (let i = 0; i < np; i++) {
        const angle = (i / np) * 6.283, next = ((i + 1) / np) * 6.283;
        if (angleFrom(Math.cos(angle), Math.sin(angle), gap) < 0.2) continue;
        posts.push({ at: [Math.cos(angle) * rr, 0.3, Math.sin(angle) * rr], scale: [0.045, 0.6, 0.045] });
        if (angleFrom(Math.cos(next), Math.sin(next), gap) >= 0.2) ropes.push({ at: [Math.cos((angle + next) / 2) * rr * 0.996, 0.52, Math.sin((angle + next) / 2) * rr * 0.996], scale: [2 * rr * Math.sin(Math.PI / np), 0.03, 0.03], turn: [0, -(angle + next) / 2 + Math.PI / 2, 0] });
      }
      add(instanced(new THREE.CylinderGeometry(1, 1, 1, 6), post, posts));
      add(instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#e9e4d2', roughness: 1 }), ropes));
      const board = add(solid(new THREE.BoxGeometry(1.5, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: '#3d5c48', roughness: 0.8 })));
      board.position.set(8.6, 1.0, 10.6); board.rotation.set(-0.5, -0.3, 0);
      const sheet = add(solid(new THREE.BoxGeometry(1.3, 0.72, 0.02), new THREE.MeshStandardMaterial({ color: '#efe9d6', roughness: 0.8 })));
      sheet.position.set(8.59, 1.03, 10.65); sheet.rotation.copy(board.rotation);
      for (const side of [-0.6, 0.6]) { const leg = add(solid(new THREE.CylinderGeometry(0.05, 0.05, 1, 6), post)); leg.position.set(8.6 + side, 0.5, 10.5); }
    } else if (a.company === 'sheep') {
      for (let i = 0; i < Math.round(mix(5, 16, mood.density)); i++) {
        const angle = random() * 6.28, r = mix(4.2, 12.5, random());
        const x = Math.cos(angle) * r, z = Math.sin(angle) * r * 0.9 + 2;
        if (Math.abs(r - RR) < 0.9) continue;
        const animal = sheep(random, random() < 0.3, a.ground === 'snow' ? '#d9d2bd' : '#ece6d6');
        animal.scale.setScalar(mix(1.05, 1.3, random()));
        animal.position.set(x, heightAt(x, z), z);
        animal.rotation.y = random() * 6.28;
        add(animal);
      }
    } else if (a.company === 'watcher') {
      folk([{ x: mix(-7, 7, random()), z: -12.2, tint: '#2a2622', size: 1.25, hood: true }]);
    }
    const birds: THREE.Object3D[] = [];
    if (a.company === 'watcher' || (mood.cheer < 0.3 && a.company !== 'tourists')) {
      for (const perch of perches.filter(() => random() < (a.company === 'watcher' ? 0.45 : 0.2)).slice(0, 7)) {
        const bird = add(crow());
        bird.scale.setScalar(1.25);
        bird.position.copy(perch);
        bird.rotation.y = random() * 6.28;
        birds.push(bird);
      }
    }

    // ---- Weather. ----
    if (a.sky === 'mist' || (a.ground === 'bog' && a.sky !== 'storm' && lowSun > 0.6)) {
      const haze = new THREE.MeshBasicMaterial({ color: '#f1f3f1', transparent: true, opacity: 0.12, depthWrite: false });
      for (let i = 0; i < 7; i++) {
        const sheet = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), haze));
        sheet.scale.set(mix(7, 16, random()), mix(0.5, 1.1, random()), mix(2, 5, random()));
        sheet.position.set(mix(-13, 13, random()), mix(1.2, 2.4, random()), random() < 0.6 ? mix(-12, -5, random()) : mix(7, 14, random()));
      }
    }
    const rain: THREE.InstancedMesh | null = stormy ? (() => {
      const drops: Dab[] = [];
      for (let i = 0; i < Math.round(mix(260, 700, mood.energy)); i++) drops.push({ at: [mix(-16, 16, random()), mix(0.5, 13, random()), mix(-10, 18, random())], scale: [0.02, mix(0.9, 2, random()), 0.02], turn: [0, 0, -0.35] });
      const mesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#e8eef2', transparent: true, opacity: 0.4, depthWrite: false }), drops);
      mesh.castShadow = mesh.receiveShadow = false;
      return add(mesh);
    })() : null;
    if (stormy || a.sky === 'overcast') {
      const cloud = new THREE.MeshStandardMaterial({ color: stormy ? '#525c65' : '#c9ccca', roughness: 1 });
      for (let i = 0; i < 9; i++) {
        const puff = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cloud));
        const z = -16.4 - random();
        puff.scale.set(mix(4, 8, random()), mix(0.9, 1.7, random()), 1.5);
        puff.position.set(mix(-15, 15, random()), skyAt(mix(0.84, 1.02, random()), z), z);
      }
    }
    if (night) {
      const dots: Dab[] = [];
      for (let i = 0; i < 70; i++) { const z = -16.6; dots.push({ at: [mix(-extent, extent, random()), skyAt(mix(0.72, 1, random()), z), z], scale: mix(0.04, 0.1, random()) }); }
      add(instanced(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshBasicMaterial({ color: '#fffbe6' }), dots)).castShadow = false;
      const moon = add(new THREE.Mesh(new THREE.CircleGeometry(0.85, 28), new THREE.MeshBasicMaterial({ color: '#fbf6dc' })));
      moon.position.set(mix(-6, 7, random()), skyAt(0.9, -16.5), -16.5);
      moon.rotation.x = -pitch;
    }

    // ---- Where the cast stands: the hero in the centre, the rest inside and in front of the ring. ----
    const slots: readonly [number, number, number, number][] = [[0, 0, 5.6, 3.1], [-4.4, 2.6, 2.5, 1.5], [4.6, 2.2, 2.5, 1.5], [3.4, 13.6, 2.4, 1.5], [-6.6, 13.2, 2.4, 1.5], [-2.4, -4.6, 2.3, 1.4]];
    const world: World = {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, maxHeight, maxRadius] = slots[index % slots.length];
          const fit = Math.min(maxHeight / Math.max(item.height, 0.05), maxRadius / Math.max(item.radius, 0.05));
          // Sizes are compressed so the cast reads against the ring: everything fills its standing room.
          item.holder.scale.setScalar(fit);
          item.holder.position.set(x, heightAt(x, z), z);
          item.holder.rotation.y = (context.random() - 0.5) * 0.7 + (index === 0 ? 0.25 : 0);
          item.holder.updateMatrixWorld(true);
        });
      },
      update(_dt, time) {
        const pace = mix(2, 9, mood.energy);
        flames.forEach((flame, i) => { flame.scale.y = 1 + Math.sin(time * pace + i * 1.7) * 0.22; flame.rotation.z = Math.sin(time * pace * 0.6 + i) * 0.12; });
        if (fire) fire.intensity = fire.userData.base * (1 + Math.sin(time * pace * 1.3) * 0.12 + Math.sin(time * pace * 2.9) * 0.06);
        birds.forEach((bird, i) => { bird.rotation.z = Math.sin(time * mix(0.4, 2, mood.energy) + i) * 0.07; });
        if (rain) rain.position.y = -((time * mix(4, 11, mood.energy)) % 2);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    if (fire) fire.userData.base = fire.intensity;
    void hemi;
    return world;
  },
});
