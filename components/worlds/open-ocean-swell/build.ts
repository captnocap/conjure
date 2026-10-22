import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix } from '@conjure/kit';
import { painted, seaColour } from './sea';

const SKIES = {
  clear: 'An empty sky, pale at the rim and deepening overhead.',
  tradewind: 'Rows of small flat-bottomed fair-weather clouds marching away to the horizon.',
  towering: 'Great cumulus towers piled up over the horizon, bright on one side.',
  overcast: 'A low grey lid from rim to rim: no sun, no shadows.',
  squall: 'A dark squall line advancing, a slanting curtain of rain hanging under it.',
  mackerel: 'High rippled mackerel cloud and mares’ tails: weather is on its way.',
  firststars: 'The clear end of the day, the first stars out and a thin moon.',
} as const;

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing?', SKIES),
    swell: choice('What shape is the sea?', {
      long: 'A long even groundswell, wide smooth hills of water in ranks.',
      crossed: 'Two swells crossing, heaping the water into restless pyramids.',
      chop: 'Short steep wind-chop, close-packed and slapping.',
      oily: 'Almost flat: a slow oily heave you feel more than see.',
      wall: 'A regular swell, and behind it one enormous wave standing up over everything.',
    }),
    horizon: choice('What breaks the horizon?', {
      nothing: 'Nothing. An unbroken line all the way round.',
      ship: 'A ship hull-down in the distance under a smudge of smoke, not turning.',
      sail: 'One small white sail, far off.',
      spout: 'The blow of a whale a few hundred metres away.',
      waterspout: 'A waterspout hanging down from the cloud base.',
      aircraft: 'A search plane, a small dark cross low over the sea.',
      lightning: 'A fork of lightning standing on the horizon.',
    }),
    flotsam: choice('What else is on the water?', {
      nothing: 'Nothing but water.',
      weed: 'Long windrows of golden sargassum weed.',
      wreckage: 'Planks, a crate, a hatch cover and a lifejacket: something sank here.',
      fins: 'Dark triangular fins cutting slow circles.',
      birds: 'A loose raft of seabirds sitting on the swell.',
      flyingfish: 'A flight of flying fish skittering out of a wave face.',
    }),
    air: choice('What is in the air?', {
      clear: 'Nothing: clean and sharp to the horizon.',
      rain: 'Rain, falling in slanting grey streaks.',
      mist: 'Low banks of sea mist lying on the water.',
      spray: 'Spindrift torn from the crests and blown flat.',
    }),
    view: choice('From where is it seen?', {
      waterline: 'From the waterline, chin in the sea, the crests rising against the sky.',
      deck: 'From the height of a small boat’s deck.',
      masthead: 'From a masthead or a gull’s height, the pattern of swells laid out below.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const grim = 1 - mood.cheer;
    const heavy = a.sky === 'overcast' || a.sky === 'squall';

    // Palette.
    const sea = seaColour(mood);
    if (heavy) sea.lerp(new THREE.Color('#566469'), 0.45);
    const zenith = new THREE.Color('#86b2dc').lerp(new THREE.Color('#98a2c6'), dusk * 0.8).lerp(new THREE.Color('#b4bcc1'), grim * 0.6);
    const rim = new THREE.Color('#e6f0f3').lerp(new THREE.Color(mood.warmth > 0.45 ? '#f7d6b0' : '#e9d3da'), dusk * 0.85).lerp(new THREE.Color('#e0e3e2'), grim * 0.5);
    if (a.sky === 'overcast') { zenith.set('#a6aeb2').lerp(new THREE.Color('#b9b3aa'), mood.warmth * 0.3); rim.set('#d6dad8'); }
    if (a.sky === 'squall') { zenith.lerp(new THREE.Color('#8e989e'), 0.6); rim.lerp(new THREE.Color('#d9dedd'), 0.5); }
    if (a.sky === 'firststars') { zenith.set('#6d7ea9'); rim.set(mood.warmth > 0.45 ? '#f0cfae' : '#dccbd6'); }
    const haze = rim.clone().lerp(sea, 0.25);
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;

    // Light.
    const hemisphere = new THREE.HemisphereLight(rim.clone().lerp(new THREE.Color('#ffffff'), 0.4), sea.clone().multiplyScalar(0.8), heavy ? 1.25 : 0.95);
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), mix(0.25, 0.6, dusk), mix(0.9, 0.8, dusk)), heavy ? 0.7 : mix(1.9, 1.5, dusk));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    root.add(hemisphere, key, key.target);
    const sunSide = mix(-1, 1, mood.daylight), sunHeight = Math.sin(Math.PI * mix(0.06, 0.94, mood.daylight));

    // The swell: a few wave trains, the first of which carries the hero on its crest at the start.
    const A = mix(0.1, 2.3, mood.energy ** 1.25);
    const pace = mix(0.1, 0.34, mood.energy);
    type Train = { dx: number; dz: number; k: number; amp: number; speed: number; phase: number; sharp: number };
    const train = (turn: number, length: number, amp: number, sharp: number, phase = random() * 6): Train => {
      const angle = 0.3 + turn, k = (Math.PI * 2) / length;
      return { dx: Math.sin(angle), dz: Math.cos(angle), k, amp, speed: Math.sqrt(9.8 * k) * pace, phase, sharp };
    };
    const trains: Train[] =
      a.swell === 'crossed' ? [train(-0.55, 26, A * 0.62, 1.5, Math.PI / 2), train(0.6, 21, A * 0.6, 1.5, Math.PI / 2), train(0.1, 7, A * 0.08 + 0.02, 1.2)]
      : a.swell === 'chop' ? [train(0, 12, A * 0.5 + 0.05, 2.1, Math.PI / 2), train(0.5, 7.5, A * 0.24 + 0.03, 1.8), train(-0.7, 4.2, A * 0.1 + 0.02, 1.4)]
      : a.swell === 'oily' ? [train(0, 52, A * 0.35 + 0.05, 1, Math.PI / 2), train(0.4, 30, A * 0.1, 1)]
      : [train(0, 31, A * 0.85 + 0.04, 1.45, Math.PI / 2), train(0.55, 18, A * 0.22, 1.3), train(-0.4, 6, A * 0.06 + 0.015, 1.2)];
    const crestHeight = trains.reduce((sum, t) => sum + t.amp, 0);
    const wallHeight = a.swell === 'wall' ? mix(3.5, 7.5, mood.energy) : 0;
    const wallAngle = 0.3, wallDx = Math.sin(wallAngle), wallDz = Math.cos(wallAngle);
    const fade = (x: number, z: number) => { const r = Math.hypot(x, z + 12); return r < 58 ? 1 : r > 86 ? 0 : 0.5 + 0.5 * Math.cos(((r - 58) / 28) * Math.PI); };
    const slope = new THREE.Vector2();
    let crest = 0;
    /** Height of the sea at a point; also leaves the slope in `slope` and the dominant crest factor in `crest`. */
    const height = (x: number, z: number, time: number) => {
      let h = 0, gx = 0, gz = 0;
      for (let i = 0; i < trains.length; i++) {
        const t = trains[i], theta = t.k * (t.dx * x + t.dz * z) - t.speed * time + t.phase;
        const lifted = (Math.sin(theta) + 1) / 2, shaped = lifted ** t.sharp;
        h += t.amp * (2 * shaped - 1);
        const d = t.amp * t.sharp * (lifted > 0 ? shaped / lifted : 0) * Math.cos(theta) * t.k;
        gx += d * t.dx; gz += d * t.dz;
        if (i === 0) crest = shaped;
      }
      if (wallHeight) {
        const along = (wallDx * x + wallDz * z + 46 - time * 0.5) / 11, bump = wallHeight * Math.exp(-along * along);
        h += bump;
        const d = (bump * -2 * along) / 11;
        gx += d * wallDx; gz += d * wallDz;
        crest = Math.max(crest, bump / wallHeight);
      }
      const f = fade(x, z);
      slope.set(gx * f, gz * f);
      return h * f;
    };

    // Sea surface: a moving grid near the camera, and a still skirt out to the horizon.
    const N = 104, SPAN = 176, OFFSET = -12;
    const grid = new THREE.PlaneGeometry(SPAN, SPAN, N, N);
    grid.rotateX(-Math.PI / 2);
    grid.translate(0, 0, OFFSET);
    const position = grid.attributes.position as THREE.BufferAttribute, normal = grid.attributes.normal as THREE.BufferAttribute;
    const colour = new THREE.BufferAttribute(new Float32Array(position.count * 3), 3);
    grid.setAttribute('color', colour);
    const deep = sea.clone().multiplyScalar(0.42), bright = sea.clone().lerp(new THREE.Color('#ffffff'), 0.06), white = new THREE.Color('#f3f7f6');
    const capping = Math.max(clamp01((mood.energy - 0.45) / 0.4), a.swell === 'chop' ? 0.35 : 0, a.air === 'spray' ? 0.6 : 0);
    const tint = new THREE.Color();
    const wash = (time: number) => {
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        const h = height(x, z, time);
        position.setY(i, h);
        const inv = 1 / Math.sqrt(slope.x * slope.x + slope.y * slope.y + 1);
        normal.setXYZ(i, -slope.x * inv, inv, -slope.y * inv);
        const level = clamp01(h / (crestHeight * 2 + wallHeight + 0.001) + 0.5);
        tint.copy(deep).lerp(bright, level);
        if (capping > 0 && crest > 0.955) tint.lerp(white, capping * 0.8 * clamp01((crest - 0.955) / 0.04) * clamp01(0.45 + 0.55 * Math.sin(x * 1.7 + z * 2.3) + 0.3 * Math.sin(x * 0.37 - z * 0.9)));
        tint.lerp(haze, clamp01((Math.hypot(x, z) - 60) / 2600) ** 0.7 * 0.85);
        colour.setXYZ(i, tint.r, tint.g, tint.b);
      }
      position.needsUpdate = normal.needsUpdate = colour.needsUpdate = true;
    };
    const water = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.42, 0.62, mood.energy), metalness: 0, envMapIntensity: 0.15 });
    const ocean = new THREE.Mesh(grid, water);
    ocean.receiveShadow = true;
    ocean.frustumCulled = false;
    const ground = new THREE.Group();
    ground.add(ocean);
    const skirtGeometry = new THREE.RingGeometry(86, 5200, 72, 10);
    skirtGeometry.rotateX(-Math.PI / 2);
    skirtGeometry.translate(0, -0.02, OFFSET);
    const skirtPosition = skirtGeometry.attributes.position as THREE.BufferAttribute;
    const skirtColour = new THREE.BufferAttribute(new Float32Array(skirtPosition.count * 3), 3);
    for (let i = 0; i < skirtPosition.count; i++) {
      // Rings are bunched near the inner edge, where the colour changes fastest.
      const r = Math.hypot(skirtPosition.getX(i), skirtPosition.getZ(i) - OFFSET), f = clamp01((r - 86) / 5114), packed = 86 + 5114 * f ** 2.6, k = packed / r;
      skirtPosition.setX(i, skirtPosition.getX(i) * k); skirtPosition.setZ(i, (skirtPosition.getZ(i) - OFFSET) * k + OFFSET);
      tint.copy(deep).lerp(bright, 0.5).lerp(haze, clamp01((packed - 60) / 2600) ** 0.7 * 0.85);
      skirtColour.setXYZ(i, tint.r, tint.g, tint.b);
    }
    skirtGeometry.setAttribute('color', skirtColour);
    ground.add(new THREE.Mesh(skirtGeometry, water));
    root.add(ground);
    wash(0);

    // Sky: one painted panel that always stands behind the scene, the horizon near its foot.
    const SW = 1280, SH = 800, FOOT = 0.07;
    const sunX = a.sky === 'firststars' ? 0.76 : mix(0.2, 0.8, mood.daylight) + (random() - 0.5) * 0.06, sunLift = a.sky === 'firststars' ? 0.035 : sunHeight * 0.95;
    const sunShown = !heavy && sunLift < 0.8;
    const sky = painted(SW, SH, (ctx, W, H) => {
      const base = H * (1 - FOOT);
      const ramp = ctx.createLinearGradient(0, 0, 0, base);
      ramp.addColorStop(0, hex(zenith)); ramp.addColorStop(0.55, hex(zenith.clone().lerp(rim, 0.45))); ramp.addColorStop(1, hex(rim));
      ctx.fillStyle = ramp; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = hex(rim); ctx.fillRect(0, base, W, H - base);
      const cloudLight = new THREE.Color('#ffffff').lerp(rim, 0.25 + dusk * 0.3), cloudShade = zenith.clone().lerp(new THREE.Color('#7f8a96'), 0.5).lerp(rim, 0.25);
      const puff = (x: number, y: number, w: number, h: number, tone: number, flat = true) => {
        const top = cloudLight.clone().lerp(cloudShade, tone * 0.5), under = cloudShade.clone().lerp(cloudLight, 0.25 - tone * 0.25);
        const lumps = Math.max(3, Math.round((w / h) * 1.6));
        const blobs = Array.from({ length: lumps }, (_unused, i) => { const f = (i + 0.5) / lumps, bell = 0.45 + 0.55 * Math.sin(f * Math.PI); return { cx: x - w / 2 + f * w + (random() - 0.5) * (w / lumps) * 0.5, r: h * mix(0.5, 0.78, random()) * bell }; });
        ctx.save();
        ctx.beginPath(); ctx.rect(x - w, y - h * 3, w * 2, flat ? h * 3 : h * 5); ctx.clip();
        ctx.fillStyle = hex(under);
        for (const { cx, r } of blobs) { ctx.beginPath(); ctx.ellipse(cx, y - r * (flat ? 0.3 : 0.42), r * 1.14, r * (flat ? 1 : 0.9), 0, 0, 7); ctx.fill(); }
        ctx.fillStyle = hex(top);
        for (const { cx, r } of blobs) { ctx.beginPath(); ctx.ellipse(cx - r * 0.04, y - r * 0.55, r * 1.12, r * 0.84, 0, 0, 7); ctx.fill(); }
        ctx.restore();
      };
      if (a.sky === 'firststars') {
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 90; i++) { const y = random() ** 1.6 * base * 0.75; ctx.globalAlpha = mix(0.9, 0.25, y / base); ctx.beginPath(); ctx.arc(random() * W, y, mix(0.8, 2.1, random()), 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(W * 0.3, base * 0.3, 26, 0, 7); ctx.fill();
        ctx.fillStyle = hex(zenith.clone().lerp(rim, 0.14)); ctx.beginPath(); ctx.arc(W * 0.3 + 12, base * 0.3 - 5, 24, 0, 7); ctx.fill();
      }
      if (sunShown) {
        const sx = W * sunX, sy = base - sunLift * base;
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 300);
        const warm = new THREE.Color('#fff6dc').lerp(new THREE.Color('#ffc98a'), dusk * mood.warmth);
        glow.addColorStop(0, `rgba(${Math.round(warm.r * 255)},${Math.round(warm.g * 255)},${Math.round(warm.b * 255)},0.95)`);
        glow.addColorStop(1, `rgba(${Math.round(warm.r * 255)},${Math.round(warm.g * 255)},${Math.round(warm.b * 255)},0)`);
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, base);
        ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, 7); ctx.fill();
      }
      const many = mix(0.6, 1.5, mood.density);
      if (a.sky === 'tradewind') {
        for (let row = 0; row < 7; row++) {
          const t = row / 6, y = base - 10 - t ** 1.7 * base * 0.72, size = mix(16, 150, t ** 1.5);
          for (let i = 0; i < mix(22, 5, t) * many; i++) puff(random() * W, y + (random() - 0.5) * size * 0.3, size * mix(1.4, 2.8, random()), size * mix(0.35, 0.6, random()), 0.3 + random() * 0.3);
        }
      } else if (a.sky === 'towering') {
        for (let i = 0; i < 26 * many; i++) puff(random() * W, base - 4, mix(40, 130, random()), mix(10, 34, random()), 0.6);
        for (let tower = 0; tower < 4; tower++) {
          const x = W * (0.12 + tower * 0.26 + (random() - 0.5) * 0.12), tall = mix(0.4, 0.82, random()) * base, wide = mix(150, 290, random());
          for (let i = 0; i < 34; i++) { const t = random() ** 0.8; puff(x + (random() - 0.5) * wide * (1 - t * 0.55), base - 6 - t * tall, wide * mix(0.3, 0.55, random()) * (1 - t * 0.3), mix(40, 90, random()), 0.75 - t * 0.7, false); }
        }
      } else if (a.sky === 'mackerel') {
        ctx.fillStyle = hex(cloudLight); ctx.globalAlpha = 0.75;
        for (let row = 0; row < 24; row++) for (let i = 0; i < 44; i++) { const y = row * 14 + Math.sin(i * 0.5) * 6 + 10; if (y > base * 0.55) continue; ctx.beginPath(); ctx.ellipse(i * 30 + (row % 2) * 15 + random() * 6, y, mix(8, 13, random()), mix(2.5, 4.5, random()), -0.12, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 0.6; ctx.strokeStyle = hex(cloudLight); ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 9; i++) { const x = random() * W, y = base * mix(0.55, 0.85, random()); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 110, y - 14, x + 260, y - 70); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (a.sky === 'overcast') {
        for (let i = 0; i < 70; i++) { ctx.globalAlpha = 0.16; ctx.fillStyle = hex(random() < 0.5 ? zenith.clone().multiplyScalar(0.86) : rim); ctx.beginPath(); const y = random() ** 0.7 * base; ctx.ellipse(random() * W, y, mix(90, 280, random()) * (0.4 + y / base), mix(10, 44, random()) * (1.3 - y / base), 0, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      } else if (a.sky === 'squall') {
        const side = random() < 0.5 ? 0 : 1, dark = new THREE.Color('#56616b').lerp(zenith, 0.25);
        const mass = ctx.createLinearGradient(side ? W : 0, 0, side ? W * 0.15 : W * 0.85, 0);
        mass.addColorStop(0, hex(dark)); mass.addColorStop(0.6, hex(dark.clone().lerp(zenith, 0.4))); mass.addColorStop(1, 'rgba(120,130,138,0)');
        ctx.fillStyle = mass; ctx.fillRect(0, 0, W, base * 0.5);
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 70; i++) { const x = side ? W - random() ** 1.3 * W * 0.9 : random() ** 1.3 * W * 0.9; ctx.fillStyle = hex(dark.clone().lerp(zenith, random() * 0.4)); ctx.beginPath(); ctx.ellipse(x, base * mix(0.3, 0.74, random()), mix(110, 260, random()), mix(40, 90, random()), 0, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 46; i++) { const x = side ? W - random() ** 1.5 * W * 0.8 : random() ** 1.5 * W * 0.8; ctx.fillStyle = hex(dark.clone().lerp(zenith, random() * 0.3)); ctx.beginPath(); ctx.ellipse(x, base * mix(0.5, 0.76, random()), mix(60, 170, random()), mix(18, 44, random()), 0, 0, 7); ctx.fill(); }
        ctx.strokeStyle = hex(dark.clone().lerp(rim, 0.25)); ctx.lineWidth = 2; ctx.globalAlpha = 0.3;
        for (let i = 0; i < 260; i++) { const x = side ? W - random() * W * 0.55 : random() * W * 0.55, y = base * mix(0.7, 0.78, random()); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (side ? -1 : 1) * 46, base); ctx.stroke(); }
        ctx.globalAlpha = 1;
      } else if (a.sky === 'clear' || a.sky === 'firststars') {
        for (let i = 0; i < 5 * many; i++) puff(random() * W, base - 3, mix(60, 160, random()), mix(5, 10, random()), 0.5);
      }
      // A soft band of haze where sea meets sky.
      const band = ctx.createLinearGradient(0, base - 46, 0, base);
      band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(1, hex(rim));
      ctx.globalAlpha = 0.7; ctx.fillStyle = band; ctx.fillRect(0, base - 46, W, 46); ctx.globalAlpha = 1;
    });
    const FOV = 38, SKY_DISTANCE = 4200;
    const panelHeight = 2 * SKY_DISTANCE * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 1.9, panelWidth = panelHeight * (SW / SH);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, panelHeight), new THREE.MeshBasicMaterial({ map: sky, depthWrite: false, fog: false, toneMapped: false }));
    panel.renderOrder = -10;
    panel.frustumCulled = false;
    root.add(panel);

    // Things that ride the surface: anything listed here is lifted and tilted by the sea every frame.
    type Rider = { object: THREE.Object3D; x: number; z: number; lift: number; turn: number; lean: number };
    const riders: Rider[] = [];
    const float = (object: THREE.Object3D, x: number, z: number, lift = 0, lean = 0.6) => { object.traverse((node) => { node.castShadow = true; }); root.add(object); riders.push({ object, x, z, lift, turn: object.rotation.y, lean }); return object; };
    const settle = (time: number) => {
      for (const rider of riders) {
        const y = height(rider.x, rider.z, time);
        rider.object.position.set(rider.x, y + rider.lift, rider.z);
        rider.object.rotation.set(Math.atan(slope.y) * rider.lean, rider.turn, -Math.atan(slope.x) * rider.lean, 'YXZ');
      }
    };
    const SLOTS: [number, number][] = [[0, 0], [-6.2, -8], [7, -12], [-12, -20], [4, -29]];
    const clearOf = (x: number, z: number, room: number) => SLOTS.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > room);
    const spot = (room: number, near = 9, farZ = -46, wide = 20): [number, number] => {
      for (let i = 0; i < 40; i++) { const z = mix(near, farZ, random()), x = (random() - 0.5) * 2 * wide * (1 + (near - z) / 60); if (clearOf(x, z, room)) return [x, z]; }
      return [wide, farZ];
    };
    const matte = (hexColour: string, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: hexColour, roughness: 0.8, ...options });
    const circling: { rider: Rider; cx: number; cz: number; radius: number; angle: number; speed: number }[] = [];
    if (a.flotsam === 'weed') {
      const clump = new THREE.SphereGeometry(1, 8, 5);
      clump.scale(1, 0.16, 1);
      const gold = matte('#8a7024'), olive = matte('#5f6426');
      for (let line = 0; line < 3 + Math.round(mood.density * 3); line++) {
        const [x0, z0] = spot(3.5), turn = 0.3 + Math.PI / 2 + (random() - 0.5) * 0.2, length = mix(10, 26, random());
        for (let i = 0; i < length * 3; i++) {
          const t = (i / (length * 3) - 0.5) * length, x = x0 + Math.cos(turn) * t + (random() - 0.5) * 0.9, z = z0 - Math.sin(turn) * t + (random() - 0.5) * 0.9;
          if (!clearOf(x, z, 2.6)) continue;
          const mesh = new THREE.Mesh(clump, random() < 0.6 ? gold : olive);
          mesh.scale.setScalar(mix(0.14, 0.42, random()));
          mesh.rotation.y = random() * 6;
          float(mesh, x, z, 0.02, 1).castShadow = false;
        }
      }
    } else if (a.flotsam === 'wreckage') {
      const timber = matte('#9a8463'), paint = matte('#c9c3b2');
      for (let i = 0; i < 9 + Math.round(mood.density * 8); i++) {
        const [x, z] = spot(3, 8, -34, 14);
        const plank = new THREE.Mesh(new THREE.BoxGeometry(mix(1.2, 3.4, random()), 0.07, mix(0.16, 0.3, random())), random() < 0.3 ? paint : timber);
        plank.rotation.y = random() * 6;
        float(plank, x, z, 0.02, 1);
      }
      const [cx, cz] = spot(3.5, 6, -16, 9);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 0.8), matte('#a98f5f'));
      crate.rotation.set(0.25, random() * 6, 0.3);
      float(crate, cx, cz, 0.12, 0.8);
      const [hx, hz] = spot(3.5, 6, -22, 10);
      const hatch = new THREE.Group();
      hatch.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 1.5), matte('#7d6a4c')));
      for (const x of [-0.7, 0, 0.7]) { const batten = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.5), timber); batten.position.set(x, 0.09, 0); hatch.add(batten); }
      hatch.rotation.y = random() * 6;
      float(hatch, hx, hz, 0.03, 1);
      const [jx, jz] = spot(3, 5, -14, 8);
      const jacket = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 8, 20), matte('#e8641c'));
      jacket.rotation.x = Math.PI / 2;
      const ring = new THREE.Group();
      ring.add(jacket);
      float(ring, jx, jz, 0.06, 1);
    } else if (a.flotsam === 'fins') {
      const outline = new THREE.Shape();
      outline.moveTo(-0.55, 0); outline.quadraticCurveTo(0.1, 0.25, 0.3, 0.85); outline.quadraticCurveTo(0.45, 0.4, 0.5, 0); outline.closePath();
      const finGeometry = new THREE.ExtrudeGeometry(outline, { depth: 0.07, bevelEnabled: false });
      finGeometry.translate(0, 0, -0.035);
      const shark = matte('#4c565e', { roughness: 0.4 });
      for (let i = 0; i < 2 + Math.round(mood.density * 3); i++) {
        const [cx, cz] = spot(7, 4, -30, 13);
        const fin = new THREE.Group();
        fin.add(new THREE.Mesh(finGeometry, shark));
        const tail = new THREE.Mesh(finGeometry, shark);
        tail.scale.setScalar(0.45); tail.position.x = -1.7;
        fin.add(tail);
        fin.scale.setScalar(mix(0.8, 1.3, random()));
        const rider = { object: float(fin, cx, cz, -0.08, 0.3), x: cx, z: cz, lift: -0.08, turn: 0, lean: 0.3 };
        riders.pop(); riders.push(rider);
        circling.push({ rider, cx, cz, radius: mix(2.4, 4.2, random()), angle: random() * 6, speed: mix(0.12, 0.4, mood.energy) * (random() < 0.5 ? -1 : 1) });
      }
    } else if (a.flotsam === 'birds') {
      const body = new THREE.SphereGeometry(1, 10, 8);
      const whiteM = matte('#f3f2ec'), greyM = matte('#5a5f66'), bill = matte('#e3a53a');
      const [fx, fz] = spot(8, 2, -24, 10);
      for (let i = 0; i < 9 + Math.round(mood.density * 12); i++) {
        const angle = random() * 6, d = Math.sqrt(random()) * 6, x = fx + Math.cos(angle) * d, z = fz + Math.sin(angle) * d * 0.7;
        if (!clearOf(x, z, 3)) continue;
        const bird = new THREE.Group();
        const hull = new THREE.Mesh(body, whiteM); hull.scale.set(0.13, 0.11, 0.24); hull.position.y = 0.06;
        const wings = new THREE.Mesh(body, greyM); wings.scale.set(0.135, 0.07, 0.22); wings.position.set(0, 0.11, -0.04);
        const head = new THREE.Mesh(body, whiteM); head.scale.setScalar(0.065); head.position.set(0, 0.22, 0.17);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), bill); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.21, 0.27);
        bird.add(hull, wings, head, beak);
        bird.scale.setScalar(mix(1.1, 1.5, random()));
        bird.rotation.y = 0.3 + Math.PI + (random() - 0.5) * 1.2;
        float(bird, x, z, 0, 0.5);
      }
    } else if (a.flotsam === 'flyingfish') {
      const silver = matte('#b9c6d2', { metalness: 0.6, roughness: 0.3 }), wing = new THREE.MeshStandardMaterial({ color: '#dfe9f1', roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const fishBody = new THREE.SphereGeometry(1, 10, 6);
      const fin = new THREE.BufferGeometry();
      fin.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.06, 0.34, 0.07, -0.02, 0.05, 0, -0.1], 3));
      fin.computeVertexNormals();
      const [fx, fz] = spot(7, 5, -16, 9);
      const heading = (random() - 0.5) * 1.2 + Math.PI / 2;
      for (let i = 0; i < 7 + Math.round(mood.density * 8); i++) {
        const along = mix(-5, 5, random()), across = (random() - 0.5) * 3;
        const fish = new THREE.Group();
        const hull = new THREE.Mesh(fishBody, silver); hull.scale.set(0.04, 0.045, 0.17);
        const right = new THREE.Mesh(fin, wing), left = new THREE.Mesh(fin, wing); left.scale.x = -1;
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 3), silver); tail.rotation.x = -Math.PI / 2; tail.position.z = -0.2; tail.scale.x = 0.2;
        fish.add(hull, right, left, tail);
        fish.scale.setScalar(1.5);
        fish.rotation.y = heading;
        float(fish, fx + Math.sin(heading) * along + Math.cos(heading) * across, fz + Math.cos(heading) * along - Math.sin(heading) * across, mix(0.15, 1.1, Math.sin(clamp01((along + 5) / 10) * Math.PI)) * mix(0.6, 1.2, random()), 0.2);
      }
    }

    // Air.
    let rain: THREE.InstancedMesh | null = null;
    const drops: THREE.Vector3[] = [];
    const veils: THREE.Mesh[] = [];
    const flecks: { rider: Rider; drift: number }[] = [];
    if (a.air === 'rain' || a.sky === 'squall') {
      const streak = new THREE.PlaneGeometry(0.03, 1.5);
      rain = new THREE.InstancedMesh(streak, new THREE.MeshBasicMaterial({ color: rim.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: a.air === 'rain' ? 0.5 : 0.28, depthWrite: false, side: THREE.DoubleSide }), a.air === 'rain' ? 900 : 350);
      rain.frustumCulled = false;
      for (let i = 0; i < rain.count; i++) drops.push(new THREE.Vector3((random() - 0.5) * 70, random() * 26, mix(3, -70, random())));
      root.add(rain);
    }
    if (a.air === 'mist') {
      const veil = painted(256, 64, (ctx, W, H) => {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0.5)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'destination-out';
        const side = ctx.createLinearGradient(0, 0, W, 0);
        side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.25, 'rgba(0,0,0,0)'); side.addColorStop(0.75, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = side; ctx.fillRect(0, 0, W, H);
      });
      for (let i = 0; i < 9; i++) {
        const z = mix(-10, -260, (i / 8) ** 1.6);
        const bank = new THREE.Mesh(new THREE.PlaneGeometry(mix(60, 320, i / 8), mix(3.5, 16, i / 8)), new THREE.MeshBasicMaterial({ map: veil, color: rim.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: mix(0.4, 0.75, i / 8), depthWrite: false }));
        bank.position.set((random() - 0.5) * (30 + i * 20), bank.geometry.parameters.height * 0.42 + crestHeight * 0.3, z);
        bank.userData.x = bank.position.x;
        veils.push(bank);
        root.add(bank);
      }
    }
    if (a.air === 'spray') {
      const fleck = new THREE.SphereGeometry(1, 6, 4);
      fleck.scale(2.6, 0.5, 0.6);
      const foam = matte('#f4f8f7');
      for (let i = 0; i < 130; i++) {
        const mesh = new THREE.Mesh(fleck, foam);
        mesh.scale.setScalar(mix(0.04, 0.13, random()));
        mesh.castShadow = false;
        const x = (random() - 0.5) * 60, z = mix(12, -50, random());
        root.add(mesh);
        const rider: Rider = { object: mesh, x, z, lift: mix(0.1, 0.9, random() ** 2), turn: 0.3, lean: 0 };
        riders.push(rider);
        flecks.push({ rider, drift: mix(2, 7, random()) * mix(0.5, 1.4, mood.energy) });
      }
    }

    // Whatever stands on the horizon. It is positioned once the camera is known.
    const far = new THREE.Group();
    root.add(far);
    let farDistance = 0, farSide = (random() < 0.5 ? -1 : 1) * mix(0.13, 0.25, random()), farLift = 0;
    const bolt: THREE.Mesh[] = [];
    const farPuffs: THREE.Mesh[] = [];
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.scale.set(...scale); far.add(mesh); return mesh; };
    const distant = (hexColour: string, amount = 0.45) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hexColour).lerp(haze, amount), toneMapped: false });
    const unit = new THREE.BoxGeometry(1, 1, 1), ball = new THREE.SphereGeometry(1, 10, 8);
    if (a.horizon === 'ship') {
      farDistance = 2600; farLift = -5;
      part(unit, distant('#30363b'), [0, 7, 0], [190, 14, 24]);
      part(unit, distant('#8a3d2c'), [0, 1, 0], [188, 3, 24]);
      part(unit, distant('#e8e6de'), [-58, 24, 0], [30, 20, 22]);
      part(unit, distant('#30363b'), [-60, 42, 0], [8, 16, 8]);
      for (const x of [10, 45, 80]) part(unit, distant('#5d646a'), [x, 22, 0], [3, 18, 3]);
      for (let i = 0; i < 9; i++) farPuffs.push(part(ball, distant('#565c62', 0.5 + i * 0.05), [-66 - i * 34, 56 + i * 9, 0], [22 + i * 9, 12 + i * 4, 14]));
    } else if (a.horizon === 'sail') {
      farDistance = 620;
      part(unit, distant('#3b3f42', 0.25), [0, 0.8, 0], [11, 1.6, 3]);
      const cloth = new THREE.BufferGeometry();
      cloth.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 0, 5.2, 2.4, 0, 0, 15, 0, -0.4, 2.2, 0, -4.2, 2.6, 0, -0.4, 12, 0], 3));
      part(cloth, new THREE.MeshBasicMaterial({ color: '#fbfaf4', side: THREE.DoubleSide, toneMapped: false }), [0, 0, 0]);
      part(unit, distant('#3b3f42', 0.25), [-0.2, 8, 0], [0.25, 15, 0.25]);
    } else if (a.horizon === 'spout') {
      farDistance = 170; farSide *= 1.1;
      part(ball, distant('#2c353c', 0.1), [0, 0, 0], [5.5, 0.9, 1.4]);
      for (let i = 0; i < 8; i++) farPuffs.push(part(ball, distant('#f6f9f9', 0.1), [2.2 - i * 0.15, 1 + i * 0.7, 0], [0.35 + i * 0.22, 0.4 + i * 0.16, 0.35 + i * 0.2]));
    } else if (a.horizon === 'waterspout') {
      farDistance = 2200;
      const funnel = new THREE.LatheGeometry([[26, 0], [9, 60], [7, 220], [12, 420], [40, 560], [120, 640]].map(([r, y]) => new THREE.Vector2(r, y)), 14);
      const twist = funnel.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < twist.count; i++) twist.setX(i, twist.getX(i) + Math.sin(twist.getY(i) / 150) * 38);
      part(funnel, distant('#6f7a84', 0.35), [0, 0, 0]);
      for (let i = 0; i < 9; i++) part(ball, distant('#eef2f2', 0.3), [(random() - 0.5) * 70, 6, 0], [mix(12, 26, random()), mix(6, 16, random()), 10]);
      part(ball, distant('#66717b', 0.35), [20, 660, 0], [420, 60, 60]);
    } else if (a.horizon === 'aircraft') {
      farDistance = 900; farLift = mix(50, 110, random());
      const grey = distant('#3d444a', 0.3);
      part(unit, grey, [0, 0, 0], [26, 2.6, 2.6]);
      part(unit, grey, [2, 1, 0], [4, 0.6, 34]);
      part(unit, grey, [-11.5, 2.5, 0], [3, 5, 0.5]);
      part(unit, grey, [-11.5, 0.6, 0], [2.4, 0.4, 10]);
      far.rotation.z = 0.12;
    } else if (a.horizon === 'lightning') {
      farDistance = 3000;
      const points: THREE.Vector3[] = [];
      let x = 0;
      for (let i = 0; i <= 9; i++) { points.push(new THREE.Vector3(x, 560 - i * 62, 0)); x += (random() - 0.5) * 120; }
      const flash = new THREE.MeshBasicMaterial({ color: '#fffbe0', toneMapped: false });
      bolt.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0), 40, 5, 5), flash, [0, 0, 0]));
      const branch = points.slice(4, 8).map((p, i) => p.clone().add(new THREE.Vector3(i * 46, -i * 18, 0)));
      bolt.push(part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(branch, false, 'catmullrom', 0), 20, 3, 5), flash, [0, 0, 0]));
      part(ball, distant('#58626c', 0.3), [0, 600, -20], [520, 90, 60]);
    }

    // Glitter under a low sun.
    let glitter: THREE.InstancedMesh | null = null;
    if (sunShown && sunLift < 0.42) {
      const disc = new THREE.CircleGeometry(1, 8);
      disc.rotateX(-Math.PI / 2);
      glitter = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff7dc').lerp(new THREE.Color('#ffd49a'), dusk * mood.warmth), toneMapped: false }), 240);
      glitter.frustumCulled = false;
      root.add(glitter);
    }

    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 9000);
    const placed: { item: Placeable; rider: Rider }[] = [];
    const dummy = new THREE.Object3D();
    const shown = (metres: number) => 1.5 * metres ** 0.45;

    const world = {
      object: root,
      camera,
      background: rim.clone(),
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place(items: readonly Placeable[]) {
        let heroSize = 3, heroHeight = 2;
        items.forEach((item, index) => {
          const natural = Math.max(item.height, item.radius * 2, 0.05);
          const scale = (shown(natural) / natural) * (item.hero ? 1 : 0.82);
          item.holder.scale.setScalar(scale);
          const [x, z] = SLOTS[index % SLOTS.length];
          item.holder.rotation.y = (random() - 0.5) * 0.7 + (item.hero ? 0.25 : 0);
          // Everything sits a little into the water rather than on it.
          const rider: Rider = { object: item.holder, x, z, lift: -Math.min(item.radius * scale * 0.065, item.height * scale * 0.12), turn: item.holder.rotation.y, lean: 0.55 };
          riders.push(rider);
          placed.push({ item, rider });
          if (item.hero) { heroSize = natural * scale; heroHeight = item.height * scale; }
        });
        settle(0);
        const crestY = height(0, 0, 0);
        const distance = (heroSize * 1.75 + 6.5) / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)));
        const yaw = (random() - 0.5) * 0.45;
        const tall = crestHeight + (a.swell === 'wall' ? 0.3 : 0);
        const eye = a.view === 'waterline' ? tall + 0.7 : a.view === 'deck' ? tall + 2.2 + heroSize * 0.4 : tall + distance * 0.25 + heroSize * 0.4;
        const pitch = THREE.MathUtils.degToRad(a.view === 'waterline' ? -4.5 : a.view === 'deck' ? 2.5 : 10.5);
        camera.position.set(Math.sin(yaw) * distance, eye, Math.cos(yaw) * distance);
        const aim = new THREE.Vector3(0, Math.max(eye - distance * Math.tan(pitch), crestY + heroHeight * 0.4), -1.5);
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const forward = new THREE.Vector3(aim.x - camera.position.x, 0, aim.z - camera.position.z).normalize();
        const sideways = new THREE.Vector3(-forward.z, 0, forward.x);
        // Sky panel square to the view, its painted horizon at eye level.
        panel.position.copy(camera.position).addScaledVector(forward, SKY_DISTANCE);
        panel.position.y = camera.position.y + panelHeight * (0.5 - FOOT);
        panel.lookAt(camera.position.x, panel.position.y, camera.position.z);
        if (farDistance) {
          far.position.copy(camera.position).addScaledVector(forward, farDistance).addScaledVector(sideways, farDistance * farSide);
          far.position.y = farLift;
          far.rotation.y = Math.atan2(forward.x, forward.z) + (a.horizon === 'ship' || a.horizon === 'aircraft' ? 0.35 : 0);
        }
        if (glitter) {
          const bearing = (sunX - 0.5) * (panelWidth / SKY_DISTANCE);
          const toward = forward.clone().addScaledVector(sideways, bearing).normalize(), across = new THREE.Vector3(-toward.z, 0, toward.x);
          for (let i = 0; i < glitter.count; i++) {
            const d = mix(95, 2400, random() ** 2.2), spread = (random() - 0.5) * mix(10, 70, d / 2400) * (0.6 + mood.energy);
            dummy.position.copy(camera.position).setY(0.06).addScaledVector(toward, d).addScaledVector(across, spread);
            dummy.scale.set(mix(0.5, 9, d / 2400) * mix(0.6, 1.6, random()), 1, mix(0.5, 9, d / 2400) * 0.3);
            dummy.rotation.y = Math.atan2(across.x, across.z) + Math.PI / 2;
            dummy.updateMatrix(); glitter.setMatrixAt(i, dummy.matrix);
          }
          glitter.instanceMatrix.needsUpdate = true;
        }
        for (const drop of drops) drop.add(new THREE.Vector3(camera.position.x * 0.5, 0, 0));
        // Key light from the sun's side of the sky.
        key.target.position.set(0, crestY, -6);
        key.position.copy(key.target.position).add(new THREE.Vector3(sunSide * 0.9 + sideways.x * 0.2, mix(0.3, 1.25, sunHeight), -0.12 + forward.z * -0.35).normalize().multiplyScalar(90));
        const reach = Math.max(22, heroSize * 3.2);
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -reach;
        shadow.right = shadow.top = reach;
        shadow.near = 1; shadow.far = 240;
        shadow.updateProjectionMatrix();
      },
      update(_dt: number, time: number) {
        wash(time);
        for (const circle of circling) {
          circle.angle += circle.speed * 0.016;
          circle.rider.x = circle.cx + Math.cos(circle.angle) * circle.radius;
          circle.rider.z = circle.cz + Math.sin(circle.angle) * circle.radius;
          circle.rider.turn = -circle.angle + (circle.speed > 0 ? -Math.PI / 2 : Math.PI / 2) + Math.PI / 2;
        }
        for (const { rider, drift } of flecks) {
          rider.x += drift * 0.016 * Math.sin(0.3); rider.z += drift * 0.016 * Math.cos(0.3);
          if (rider.z > 14) { rider.z -= 62; rider.x -= 62 * Math.tan(0.3) * 0.5; }
        }
        settle(time);
        if (rain) {
          const fall = mix(9, 20, mood.energy), slant = mix(0.12, 0.5, mood.energy);
          for (let i = 0; i < drops.length; i++) {
            const drop = drops[i];
            dummy.position.set(drop.x + ((time * fall * slant + i) % 6), 26 - ((drop.y + time * fall) % 26), drop.z);
            dummy.rotation.set(0, 0, slant * 0.9);
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix(); rain.setMatrixAt(i, dummy.matrix);
          }
          rain.instanceMatrix.needsUpdate = true;
        }
        veils.forEach((veil, i) => { veil.position.x = veil.userData.x + Math.sin(time * 0.04 + i) * 6; veil.quaternion.copy(camera.quaternion); });
        farPuffs.forEach((cloud, i) => { cloud.scale.y *= 1 + Math.sin(time * 0.8 + i) * 0.0015; });
        for (const stroke of bolt) stroke.visible = (time * mix(0.7, 2.2, mood.energy)) % 3 < 2.4 || Math.sin(time * 40) > 0;
      },
      dispose() {
        key.shadow.map?.dispose();
        for (const { item } of placed) item.holder.removeFromParent();
        disposeTree(root);
      },
    };
    return world;
  },
});
