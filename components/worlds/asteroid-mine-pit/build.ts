import * as THREE from 'three';
import { type Placeable, type World, Sculpture, choice, clamp01, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

const ROCKS = {
  chondrite: 'Pale grey chondrite rubble, dusty and ordinary.',
  iron: 'Rust-red iron rock with dark seams.',
  carbon: 'Charcoal-black carbon rock with ochre strata in the cut faces.',
  ice: 'Dirty white rock veined with blue ice that glints in the lamps.',
  sulphur: 'Sour yellow-green sulphur crust over grey stone.',
} as const;
const ROCK_TINT: Record<keyof typeof ROCKS, { floor: string; wall: string; seam: string; skin: string }> = {
  chondrite: { floor: '#a39d92', wall: '#67635d', seam: '#4b4743', skin: '#7b766e' },
  iron: { floor: '#b07a5e', wall: '#784432', seam: '#432a22', skin: '#8c5843' },
  carbon: { floor: '#6c6b70', wall: '#38383e', seam: '#b98a3c', skin: '#47474d' },
  ice: { floor: '#a9b2b6', wall: '#667886', seam: '#7cc8f0', skin: '#87929a' },
  sulphur: { floor: '#b0aa64', wall: '#74704d', seam: '#d8d23a', skin: '#8a8758' },
};
const SKIES = {
  indigo: 'Deep indigo, thick with stars.',
  slate: 'Cold slate blue, a far small sun somewhere behind.',
  dust: 'A brown-red haze of the pit\'s own dust hanging round the rock.',
  teal: 'Dark teal, eerie and still.',
} as const;
const SKY_TINT: Record<keyof typeof SKIES, string> = { indigo: '#4b5079', slate: '#66728c', dust: '#8b6f66', teal: '#48686f' };
const LAMPS = {
  sodium: 'Sodium orange, the colour of every night shift.',
  arc: 'Hard blue-white arc light, flat and merciless.',
  green: 'Sickly green tubes bought cheap.',
  red: 'Red emergency lighting only.',
} as const;
const LAMP_TINT: Record<keyof typeof LAMPS, string> = { sodium: '#ffb040', arc: '#dcecff', green: '#9dff8a', red: '#ff4030' };

export default defineWorld({
  questions: {
    state: choice('What state is the pit in?', {
      working: 'Working flat out: every lamp blazing, gravel thrown up and hanging, cables everywhere.',
      quiet: 'Between shifts: half the lamps on, nobody about.',
      abandoned: 'Worked out and abandoned: lamps dead, one tower fallen, tape across the shaft.',
      contested: 'Claim-jumped: rival pennants planted along the rim and a barricade thrown across a bench.',
    }),
    rock: choice('What is the asteroid made of?', ROCKS),
    sky: choice('What is the sky like?', SKIES),
    lamps: choice('What colour are the work lamps?', LAMPS),
    shaft: choice('What comes up out of the main shaft?', {
      dark: 'Nothing: a black hole with a hoist cable going down.',
      glow: 'A steady warm glow from the workings below.',
      green: 'A green glow that nobody talks about.',
      dust: 'A slow column of dust and grit.',
      alarm: 'A pulsing red alarm light.',
    }),
    litter: choice('What litters the benches?', {
      spoil: 'Spoil heaps and tipped ore tubs.',
      pipes: 'Pipe stacks, cable reels and hoses.',
      drums: 'Fuel drums and supply crates.',
      bare: 'Almost nothing: swept bare rock.',
    }),
    overhead: choice('What hangs in the sky beyond the rim?', {
      stars: 'Only the stars.',
      giant: 'A banded gas giant filling a corner of the sky.',
      sun: 'A small hard white sun.',
      neighbour: 'Another lit, worked asteroid tumbling close by.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const rock = ROCK_TINT[a.rock];
    const background = new THREE.Color(SKY_TINT[a.sky]).offsetHSL(0, 0, (mood.daylight < 0.5 ? mood.daylight : 1 - mood.daylight) * 0.08);
    const yawDeg = 30, yaw = yawDeg * Math.PI / 180, pitch = 31 * Math.PI / 180;
    const toward = new THREE.Vector2(Math.sin(yaw), Math.cos(yaw)); // the camera's side of the pit
    const STEP = 1.0;
    const R = [3.0, 5.6, 8.0], RIM = 9.6;
    const phases = Array.from({ length: 8 }, () => random() * Math.PI * 2);
    const wobble = (theta: number, k: number) => 1 + 0.05 * Math.sin(3 * theta + phases[k]) + 0.03 * Math.sin(7 * theta + phases[k + 4]);
    /** Terraces stand full height at the back and sink to nothing toward the camera. */
    const rise = (ux: number, uz: number) => { const t = clamp01((0.38 - (ux * toward.x + uz * toward.y)) / 0.85); return t * t * (3 - 2 * t); };
    const heightAt = (x: number, z: number) => {
      const r = Math.hypot(x, z), theta = Math.atan2(z, x), w = rise(x / (r || 1), z / (r || 1));
      let level = 0;
      for (let k = 0; k < 3; k++) if (r > R[k] * wobble(theta, k) + 0.06) level++;
      return level * STEP * w;
    };

    // Terrain: one polar sheet from the pit floor, up the benches, over the rim and round the underside.
    const SEG = 84;
    const positions: number[] = [], colours: number[] = [], index: number[] = [];
    const floorTint = new THREE.Color(rock.floor), wallTint = new THREE.Color(rock.wall), seamTint = new THREE.Color(rock.seam), skinTint = new THREE.Color(rock.skin);
    floorTint.lerp(new THREE.Color('#6e6a66'), mood.wear * 0.25);
    const tone = new THREE.Color();
    let stations = 0;
    for (let i = 0; i <= SEG; i++) {
      const theta = (i % SEG) / SEG * Math.PI * 2, ux = Math.cos(theta), uz = Math.sin(theta), w = rise(ux, uz);
      const rim = RIM * wobble(theta, 3);
      const ring: [number, number, THREE.Color][] = [[0, 0, floorTint], [R[0] * wobble(theta, 0) * 0.5, 0, floorTint]];
      for (let k = 0; k < 3; k++) {
        const r = R[k] * wobble(theta, k), low = k * STEP * w, high = (k + 1) * STEP * w;
        ring.push([r, low, floorTint], [r, low, wallTint], [r + 0.04, mix(low, high, 0.42), wallTint], [r + 0.05, mix(low, high, 0.5), seamTint], [r + 0.06, mix(low, high, 0.58), wallTint], [r + 0.14, high, wallTint], [r + 0.14, high, floorTint]);
      }
      const top = 3 * STEP * w;
      ring.push([rim, top, floorTint], [rim, top, skinTint], [rim + 1.3, top - 0.6, skinTint], [rim + 2.3, top - 2.2, skinTint], [rim + 2.7, mix(top - 4.6, -5, 0.5), skinTint], [rim + 1.9, -7.6, wallTint], [rim * 0.55, -10.4, wallTint], [0, -11.2, wallTint]);
      stations = ring.length;
      ring.forEach(([r, y, tint], j) => {
        const rough = j > stations - 7 ? (Math.sin(theta * 9 + j * 2.1 + phases[1]) + Math.sin(theta * 4 + j + phases[2])) * 0.35 : 0;
        positions.push(ux * (r + rough), y + (j > stations - 6 ? rough * 0.6 : 0), uz * (r + rough));
        tone.copy(tint).offsetHSL(0, 0, (Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1) * 0.035);
        colours.push(tone.r, tone.g, tone.b);
      });
    }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < stations - 1; j++) {
      const p = i * stations + j, q = (i + 1) * stations + j;
      index.push(p, q, p + 1, q, q + 1, p + 1);
    }
    let terrainGeometry = new THREE.BufferGeometry();
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    terrainGeometry.setIndex(index);
    const flat = terrainGeometry.toNonIndexed();
    terrainGeometry.dispose();
    terrainGeometry = flat;
    terrainGeometry.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, flatShading: true, side: THREE.DoubleSide }));
    terrain.receiveShadow = true; terrain.castShadow = true;
    root.add(terrain);

    // Lights: thin ambient so the lamps and the key throw hard shadows.
    const lampColour = new THREE.Color(LAMP_TINT[a.lamps]);
    const power = { working: 1, quiet: 0.55, abandoned: 0, contested: 0.75 }[a.state];
    root.add(new THREE.HemisphereLight(background.clone().lerp(new THREE.Color('#ffffff'), 0.45), rock.wall, 0.52));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.3, 0.9).lerp(lampColour, 0.25 * power), 2.05);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04; key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#aab8e0', 0.3);
    fill.position.set(8, 4, -6);
    root.add(fill);

    const steel = s.material('#757b80', { metalness: 0.6, roughness: 0.5 });
    const dark = s.material('#26282b', { roughness: 0.8 });
    const hazard = s.material('#e0b020');
    const back = (degrees: number, radius: number): [number, number] => { const t = Math.atan2(-toward.y, -toward.x) + degrees * Math.PI / 180; return [Math.cos(t) * radius, Math.sin(t) * radius]; };

    // Slots: hero on the lit floor beside the shaft, the rest up the benches.
    const slots: { x: number; z: number; size: number }[] = [
      { x: 1.2, z: 1.0, size: 1 },
      ...([[42, 4.3, 0.78], [-44, 4.3, 0.78], [0, 6.8, 0.76], [68, 6.8, 0.72], [-70, 6.8, 0.72], [30, 8.85, 0.56], [-28, 8.85, 0.56]] as const).map(([deg, radius, size]) => { const [x, z] = back(deg, radius); return { x, z, size }; }),
    ];
    const clear = (x: number, z: number, margin: number) => slots.every((slot) => Math.hypot(slot.x - x, slot.z - z) > margin);

    // The main shaft and its headframe.
    const [sx, sz] = [-1.3, -0.95];
    const shaftGlow = { dark: '#000000', glow: '#ffb050', green: '#70ff60', dust: '#000000', alarm: '#ff2a1c' }[a.shaft];
    const shaftMaterial = new THREE.MeshStandardMaterial({ color: a.shaft === 'dark' || a.shaft === 'dust' ? '#0c0c0e' : shaftGlow, emissive: shaftGlow, emissiveIntensity: a.shaft === 'dark' || a.shaft === 'dust' ? 0 : 1.3, roughness: 1 });
    s.cylinder(1.0, 1.0, 0.04, [sx, 0.03, sz], shaftMaterial, 24).castShadow = false;
    s.ring(1.06, 0.1, [sx, 0.07, sz], s.material('#5a5d60', { roughness: 0.8 })).rotation.x = Math.PI / 2;
    for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; s.box([0.34, 0.1, 0.1], [sx + Math.cos(t) * 1.06, 0.17, sz + Math.sin(t) * 1.06], i % 2 ? hazard : dark).rotation.y = -t + Math.PI / 2; }
    for (const side of [-1, 1]) { s.rod([sx - 1.25, 0, sz + side * 0.85], [sx - 0.1, 2.5, sz + side * 0.2], 0.07, steel); s.rod([sx + 1.0, 0, sz + side * 0.95 - 0.5], [sx - 0.1, 2.5, sz + side * 0.2], 0.05, steel); }
    s.rod([sx - 0.1, 2.5, sz - 0.3], [sx - 0.1, 2.5, sz + 0.3], 0.05, dark);
    s.cylinder(0.45, 0.45, 0.1, [sx - 0.1, 2.5, sz], hazard, 18).rotation.x = Math.PI / 2;
    s.rod([sx + 0.33, 2.4, sz], [sx + 0.3, 0.05, sz], 0.02, dark);
    s.rod([sx - 0.53, 2.4, sz], [sx - 1.5, 0.3, sz - 0.6], 0.02, dark);
    s.box([0.6, 0.55, 0.7], [sx - 1.45, 0.28, sz - 0.65], s.material('#8a4a30', { roughness: 0.7 }));
    if (a.shaft !== 'dark') {
      const columnColour = a.shaft === 'dust' ? rock.floor : shaftGlow;
      const column = s.mesh(new THREE.CylinderGeometry(a.shaft === 'dust' ? 1.5 : 1.25, 0.92, a.shaft === 'dust' ? 5 : 2.6, 20, 1, true), new THREE.MeshBasicMaterial({ color: columnColour, transparent: true, opacity: a.shaft === 'dust' ? 0.2 : 0.14, depthWrite: false, side: THREE.DoubleSide }), [sx, a.shaft === 'dust' ? 2.5 : 1.3, sz]);
      column.castShadow = false; column.receiveShadow = false;
    }
    if (a.state === 'abandoned') for (let i = 0; i < 2; i++) { const band = s.box([2.5, 0.12, 0.02], [sx, 0.75, sz], hazard); band.rotation.y = i * 1.5 + 0.4; band.rotation.z = 0.08; }

    // Floodlight towers on the high benches.
    const lampMaterial = new THREE.MeshStandardMaterial({ color: power > 0 ? lampColour : new THREE.Color('#4a4c50'), emissive: lampColour, emissiveIntensity: power > 0 ? 1.5 : 0 });
    const beam = new THREE.MeshBasicMaterial({ color: lampColour, transparent: true, opacity: 0.05 * power, depthWrite: false, side: THREE.DoubleSide });
    const towers: [number, number, number][] = [[-8, 8.9, 4.8], [50, 8.9, 4.2], [-50, 8.9, 3.9], [98, 4.4, 3.2]];
    towers.forEach(([deg, radius, tall], number) => {
      const [x, z] = back(deg, radius), y = heightAt(x, z);
      const fallen = a.state === 'abandoned' && number === 1;
      const tower = new Sculpture(context);
      for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [0.25, 0.25], [-0.25, 0.25]] as const) tower.rod([dx, 0, dz], [dx * 0.4, tall, dz * 0.4], 0.035, steel);
      for (let i = 1; i < 5; i++) { const t = i / 5, w = mix(0.25, 0.1, t); tower.rod([-w, t * tall, -w], [w, (t + 0.2) * tall, w], 0.02, steel); tower.rod([w, t * tall, -w], [-w, (t + 0.2) * tall, w], 0.02, steel); }
      const aim = Math.atan2(-x, -z);
      const head = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.4, 0.3), dark); housing.position.set((i % 2 - 0.5) * 0.6, Math.floor(i / 2) * 0.46, 0); housing.castShadow = true; head.add(housing);
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.32, 0.04), number === 3 && a.state === 'quiet' ? new THREE.MeshStandardMaterial({ color: '#4a4c50' }) : lampMaterial); lens.position.set((i % 2 - 0.5) * 0.6, Math.floor(i / 2) * 0.46, 0.16); head.add(lens);
      }
      head.position.set(0, tall + 0.1, 0); head.rotation.set(0.55, aim, 0, 'YXZ');
      tower.root.add(head);
      if (power > 0 && !fallen) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.6, 7.5, 18, 1, true), beam);
        cone.geometry.translate(0, -3.75, 0); cone.position.set(0, tall + 0.3, 0); cone.rotation.set(-Math.PI / 2 + 0.6, aim, 0, 'YXZ');
        tower.root.add(cone);
      }
      tower.root.position.set(x, y, z);
      if (fallen) { tower.root.rotation.set(0, aim, 0); tower.root.rotateX(1.42); tower.root.position.y += 0.25; }
      root.add(tower.root);
      if (power > 0 && number < 2) {
        const glow = new THREE.PointLight(lampColour, 40 * power, 18, 1.6);
        glow.position.set(x * 0.72, y + tall + 0.4, z * 0.72);
        root.add(glow);
      }
    });

    // Ladders between benches, edge markers, and cable runs down to the floor.
    for (const deg of [18, -20, 52]) for (let k = 0; k < 3; k++) {
      if ((deg === 52 && k !== 1) || (deg === -20 && k === 0)) continue;
      const theta = Math.atan2(-toward.y, -toward.x) + (deg + k * 3) * Math.PI / 180;
      const r = R[k] * wobble(theta, k), ux = Math.cos(theta), uz = Math.sin(theta), low = heightAt(ux * (r - 0.3), uz * (r - 0.3)), high = heightAt(ux * (r + 0.4), uz * (r + 0.4));
      for (const side of [-0.2, 0.2]) s.rod([ux * (r - 0.25) - uz * side, low, uz * (r - 0.25) + ux * side], [ux * (r + 0.16) - uz * side, high + 0.5, uz * (r + 0.16) + ux * side], 0.025, hazard);
      for (let i = 1; i < 5; i++) { const t = i / 5; s.rod([ux * mix(r - 0.25, r + 0.1, t) - uz * 0.2, mix(low, high, t), uz * mix(r - 0.25, r + 0.1, t) + ux * 0.2], [ux * mix(r - 0.25, r + 0.1, t) + uz * 0.2, mix(low, high, t), uz * mix(r - 0.25, r + 0.1, t) - ux * 0.2], 0.018, steel); }
    }
    const posts: { at: [number, number, number]; size: number; color: string }[] = [];
    for (let k = 0; k < 3; k++) for (let deg = -84; deg <= 84; deg += 12) {
      const theta = Math.atan2(-toward.y, -toward.x) + deg * Math.PI / 180, r = R[k] * wobble(theta, k) + 0.4, x = Math.cos(theta) * r, z = Math.sin(theta) * r;
      posts.push({ at: [x, heightAt(x, z) + 0.2, z], size: 1, color: (deg / 12 + k) % 2 ? '#e0b020' : '#d8d4c8' });
    }
    s.scatter(new THREE.BoxGeometry(0.07, 0.4, 0.07), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), posts);
    for (const [deg, radius] of [[-8, 8.6], [50, 8.6]] as const) {
      const points: [number, number, number][] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, [x, z] = back(deg + Math.sin(t * 5 + deg) * 7, mix(radius, 2.4, t)); points.push([x, heightAt(x, z) + 0.05, z]); }
      s.tube(points, 0.04, dark).castShadow = false;
    }

    // Bench litter.
    const litter: { at: [number, number, number]; size: number; color: string }[] = [];
    const spots: [number, number, number][] = [];
    const wanted = a.litter === 'bare' ? 2 : Math.round(mix(5, 12, mood.density));
    for (let tries = 0; tries < 80 && spots.length < wanted; tries++) {
      const k = Math.floor(random() * 3), [x, z] = back(mix(-95, 95, random()), mix(R[k] + 0.8, (R[k + 1] ?? RIM) - 0.7, random()));
      if (clear(x, z, 1.9) && spots.every((spot) => Math.hypot(spot[0] - x, spot[2] - z) > 1.2)) spots.push([x, heightAt(x, z), z]);
    }
    spots.forEach(([x, y, z], number) => {
      if (a.litter === 'spoil' || a.litter === 'bare') {
        const heap = mix(0.35, 0.75, random());
        s.mesh(new THREE.ConeGeometry(heap * 1.3, heap, 7), new THREE.MeshStandardMaterial({ color: number % 2 ? rock.wall : rock.seam, roughness: 0.95, flatShading: true }), [x, y + heap / 2, z]).rotation.y = random() * 3;
        for (let i = 0; i < 8; i++) litter.push({ at: [x + (random() - 0.5) * heap * 3, y + 0.06, z + (random() - 0.5) * heap * 3], size: mix(0.05, 0.13, random()), color: i % 3 ? rock.wall : rock.seam });
        if (number % 3 === 0 && a.litter === 'spoil') { const tub = s.box([0.7, 0.45, 0.5], [x + 0.9, y + 0.33, z + 0.3], s.material('#a8502c')); tub.rotation.set(0, random() * 3, number % 2 ? 0.5 : 0); }
      } else if (a.litter === 'pipes') {
        if (number % 2) { for (let i = 0; i < 5; i++) s.cylinder(0.09, 0.09, 1.8, [x, y + 0.1 + Math.floor(i / 3) * 0.17, z + (i % 3 - 1) * 0.19 + Math.floor(i / 3) * 0.1], steel, 8).rotation.z = Math.PI / 2; }
        else { const reel = s.cylinder(0.42, 0.42, 0.08, [x, y + 0.42, z - 0.2], s.material('#9a7a4a'), 16); reel.rotation.x = Math.PI / 2; s.cylinder(0.42, 0.42, 0.08, [x, y + 0.42, z + 0.2], s.material('#9a7a4a'), 16).rotation.x = Math.PI / 2; s.cylinder(0.26, 0.26, 0.36, [x, y + 0.42, z], dark, 12).rotation.x = Math.PI / 2; }
      } else {
        if (number % 2) for (let i = 0; i < 3; i++) s.cylinder(0.2, 0.2, 0.6, [x + (i - 1) * 0.44, y + 0.3, z + (i % 2) * 0.3], s.material(['#b8402c', '#2f6a8a', '#d8b020'][(i + number) % 3]), 12);
        else { s.box([0.7, 0.5, 0.6], [x, y + 0.25, z], s.material('#9a8a62')); s.box([0.5, 0.4, 0.5], [x + 0.1, y + 0.7, z], s.material('#6f7a56')).rotation.y = 0.4; }
      }
    });
    for (let i = 0; i < 40; i++) { const t = random() * 7, r = Math.sqrt(random()) * 9, x = Math.cos(t) * r, z = Math.sin(t) * r; litter.push({ at: [x, heightAt(x, z) + 0.04, z], size: mix(0.04, 0.11, random()), color: i % 2 ? rock.wall : rock.skin }); }
    s.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }), litter);

    if (a.state === 'contested') {
      // Rival pennants along the rim and a barricade across the middle bench.
      const flags = ['#d8281c', '#f2f0e8', '#2f6fd0', '#e8c020'];
      for (let i = 0; i < 9; i++) {
        const [x, z] = back(-80 + i * 20 + random() * 6, RIM - 0.5), y = heightAt(x, z), tint = s.material(flags[i % 2 ? 0 : 2 + (i % 4 === 0 ? 1 : 0)], { side: THREE.DoubleSide });
        s.rod([x, y, z], [x + (random() - 0.5) * 0.3, y + 1.9, z], 0.03, steel);
        const pennant = s.mesh(new THREE.ConeGeometry(0.22, 0.75, 3), tint, [x + 0.36, y + 1.7, z]); pennant.rotation.z = -Math.PI / 2; pennant.scale.z = 0.08;
      }
      const [bx, bz] = back(24, 6.8), by = heightAt(bx, bz);
      for (let i = 0; i < 3; i++) { const bar = s.box([1.5, 0.14, 0.1], [bx, by + 0.35 + i * 0.3, bz], i % 2 ? hazard : s.material('#c8281c')); bar.rotation.y = Math.atan2(bx, bz) + Math.PI / 2 + (i - 1) * 0.12; }
    }

    // Weightless gravel hanging over the pit.
    const gravel = new THREE.Group();
    const adrift = new Sculpture(context);
    const pebbles: { at: [number, number, number]; size: number; color: string }[] = [];
    const drifting = Math.round(mix(40, 150, mood.density) * (a.state === 'working' ? 1.4 : a.state === 'abandoned' ? 0.6 : 1));
    for (let i = 0; i < drifting; i++) {
      const t = random() * Math.PI * 2, r = mix(1.5, 12, Math.sqrt(random())), big = random() > 0.9;
      pebbles.push({ at: [Math.cos(t) * r, mix(0.5, 8.5, random() ** 1.4) + (r > 9 ? -2 * random() : 0), Math.sin(t) * r], size: big ? mix(0.22, 0.45, random()) : mix(0.06, 0.16, random()), color: [rock.wall, rock.skin, rock.seam][i % 3] });
    }
    const pebbleMesh = adrift.scatter(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true, depthWrite: false }), pebbles);
    pebbleMesh.material.depthWrite = true;
    gravel.add(adrift.root);
    root.add(gravel);

    // Sky: stars on a disc behind the scene that turns about the line of sight, plus whatever else hangs there.
    const sky = new THREE.Group();
    const wheel = new THREE.Group();
    sky.add(wheel);
    root.add(sky);
    const starCount = 620;
    const stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false }), starCount);
    const matrix = new THREE.Matrix4(), tint = new THREE.Color();
    for (let i = 0; i < starCount; i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 34, size = random() > 0.94 ? mix(0.12, 0.2, random()) : mix(0.035, 0.085, random());
      matrix.makeScale(size, size, size).setPosition(Math.cos(t) * r, Math.sin(t) * r, -55 - random() * 10);
      stars.setMatrixAt(i, matrix);
      stars.setColorAt(i, tint.setHSL(random() > 0.5 ? 0.6 : 0.1, 0.5, mix(0.82, 1, random())));
    }
    stars.frustumCulled = false;
    wheel.add(stars);
    const body = new THREE.Group();
    sky.add(body);
    if (a.overhead === 'giant') {
      const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const bands = ['#d8b890', '#b8845c', '#e8d4b0', '#a8684a', '#d0a070', '#e8dcc0', '#b07850'];
      for (let y = 0; y < 128; y += 6 + Math.floor(random() * 12)) { ctx.fillStyle = bands[Math.floor(random() * bands.length)]; ctx.fillRect(0, y, 8, 128); }
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const giant = new THREE.Mesh(new THREE.SphereGeometry(5.5, 40, 24), new THREE.MeshStandardMaterial({ map, roughness: 1, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.35, depthWrite: false }));
      giant.rotation.z = 0.35; body.add(giant);
      const ringMesh = new THREE.Mesh(new THREE.RingGeometry(7, 9.8, 64), new THREE.MeshBasicMaterial({ color: '#e8d8b8', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
      ringMesh.rotation.set(1.25, 0.2, 0.35); body.add(ringMesh);
    } else if (a.overhead === 'sun') {
      body.add(new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', depthWrite: false })));
      body.add(new THREE.Mesh(new THREE.SphereGeometry(2.4, 20, 12), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.2, depthWrite: false })));
      for (let i = 0; i < 4; i++) { const ray = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? 9 : 5.5, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false })); ray.rotation.z = i * Math.PI / 4; body.add(ray); }
    } else if (a.overhead === 'neighbour') {
      const lump = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 1), new THREE.MeshStandardMaterial({ color: rock.skin, roughness: 1, flatShading: true, depthWrite: false }));
      lump.scale.set(1.3, 0.8, 1); body.add(lump);
      for (let i = 0; i < 9; i++) { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), new THREE.MeshBasicMaterial({ color: i % 3 ? '#ffc060' : '#ff4030', depthWrite: false })); dot.position.set((random() - 0.5) * 6, (random() - 0.5) * 3, 4.2); body.add(dot); }
    }

    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 260);
    const world: World = {
      object: root, camera, background, ground: terrain, keyLight: key, capacity: slots.length,
      place(items: readonly Placeable[]) {
        const boxes: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(-6.0, 0, -8.2), new THREE.Vector3(6.0, 6.2, 2.6))];
        items.forEach((item, number) => {
          const slot = slots[number % slots.length];
          const scale = Math.min(3.5 / Math.max(item.height, 0.05), 1.75 / Math.max(item.radius, 0.05)) * slot.size;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(slot.x, heightAt(slot.x, slot.z), slot.z);
          item.holder.rotation.y = yaw * 0.5 + (context.random() - 0.5) * 0.4;
          item.holder.updateMatrixWorld(true);
          boxes.push(visibleBounds(item.holder));
        });
        const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        camera.position.copy(centre).addScaledVector(direction, 90);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        const projection = new THREE.Box2();
        for (const box of boxes)
          for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
            const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
            projection.expandByPoint(new THREE.Vector2(p.x, p.y));
          }
        const middle = projection.getCenter(new THREE.Vector2());
        const extent = Math.max(projection.getSize(new THREE.Vector2()).x, projection.getSize(new THREE.Vector2()).y) * 0.52;
        camera.translateX(middle.x);
        camera.translateY(middle.y);
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        // The sky rides with the camera so it always sits behind the rock.
        sky.position.copy(camera.position).addScaledVector(direction, -90);
        sky.quaternion.copy(camera.quaternion);
        body.position.set(-extent * 0.6, extent * 0.66, a.overhead === 'neighbour' ? -34 : -48);
        const span = bounds.getSize(new THREE.Vector3()).length();
        key.target.position.copy(centre);
        key.position.copy(centre).add(new THREE.Vector3(-10 + mood.daylight * 16, 10, 8).normalize().multiplyScalar(span * 1.5));
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -span * 0.62;
        shadow.right = shadow.top = span * 0.62;
        shadow.near = 0.1; shadow.far = span * 4;
        shadow.updateProjectionMatrix();
      },
      update(dt, time) {
        wheel.rotation.z += dt * mix(0.004, 0.05, mood.energy);
        gravel.rotation.y += dt * mix(0.003, 0.03, mood.energy);
        gravel.position.y = Math.sin(time * 0.4) * 0.08;
        if (a.shaft === 'alarm') shaftMaterial.emissiveIntensity = Math.sin(time * 5) > 0 ? 1.8 : 0.25;
        if (a.state === 'quiet') lampMaterial.emissiveIntensity = 1.2 + Math.sin(time * 31) * 0.08;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
