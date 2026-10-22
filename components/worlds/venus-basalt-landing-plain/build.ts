import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

type P2 = [number, number];

/** The plain is a big disc pushed toward the camera, so its far edge is the horizon and its near edge is never seen. */
const GROUND = 20;
const SHIFT = 7.5;
const HORIZON = GROUND - SHIFT;
const YAW = 24;
const SLOTS: [number, number, number?, number?][] = [[0.3, 1.5], [-4.1, -0.5], [4.2, 0.1], [-1.8, -3.5, 0, 0.8], [2.5, -3.9, 0, 0.75]];

const SKIES = {
  amber: { top: '#7e5a34', mid: '#c18646', glow: '#f3c16e', key: '#ffc47e', hemi: '#ffd08e', ground: '#6a4628' },
  sulfur: { top: '#8a7436', mid: '#cfae4e', glow: '#fbe28a', key: '#ffe08e', hemi: '#ffe7a0', ground: '#6e5a2c' },
  storm: { top: '#4e3c3a', mid: '#8c6248', glow: '#d99a5c', key: '#e8b07e', hemi: '#d8b090', ground: '#4a3428' },
  rust: { top: '#5e2e1c', mid: '#a8502c', glow: '#ec9a52', key: '#ffaa6e', hemi: '#ffb48a', ground: '#5a2c1c' },
} as const;

const smooth = THREE.MathUtils.smoothstep;

/** A disc of ground with real interior vertices, so it can be warped. UVs span the disc. */
function polarDisc(cx: number, cz: number, radius: number, rings: number, segments: number, lift: (x: number, z: number) => number) {
  const position: number[] = [cx, lift(cx, cz), cz], uv: number[] = [0.5, 0.5], index: number[] = [];
  for (let r = 1; r <= rings; r++) {
    const rr = radius * (r / rings) ** 0.9;
    for (let k = 0; k < segments; k++) {
      const t = (k / segments) * Math.PI * 2, x = cx + Math.cos(t) * rr, z = cz + Math.sin(t) * rr;
      position.push(x, lift(x, z), z);
      uv.push((x - cx) / (2 * radius) + 0.5, 1 - ((z - cz) / (2 * radius) + 0.5));
    }
  }
  for (let k = 0; k < segments; k++) index.push(0, 1 + ((k + 1) % segments), 1 + k);
  for (let r = 1; r < rings; r++) {
    const a = 1 + (r - 1) * segments, b = 1 + r * segments;
    for (let k = 0; k < segments; k++) {
      const k1 = (k + 1) % segments;
      index.push(a + k, a + k1, b + k, a + k1, b + k1, b + k);
    }
  }
  const disc = new THREE.BufferGeometry();
  disc.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  disc.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  disc.setIndex(index);
  disc.computeVertexNormals();
  return disc;
}

const outline = (random: () => number, cx: number, cz: number, r: number, corners: number, squash = 1): P2[] =>
  Array.from({ length: corners }, (_unused, i) => {
    const t = (i / corners) * Math.PI * 2 + (random() - 0.5) * 0.5, rr = r * (0.7 + random() * 0.4);
    return [cx + Math.cos(t) * rr, cz + Math.sin(t) * rr * squash] as P2;
  });

export default defineWorld({
  questions: {
    terrain: choice('What is the ground like?', {
      slabs: 'Flat flaking basalt slabs fitted like a cracked pavement, dark soil in the joints.',
      rubble: 'A field of broken angular rubble and grit, nothing flat to stand on.',
      lava: 'Fresh dark lava with ropy folds, its cracks still glowing dull orange.',
      soil: 'Fine dark soil drifted smooth, a few slab edges poking through.',
    }),
    sky: choice('What is the sky like?', {
      amber: 'Amber gloom: a low glowing orange haze, no sun anywhere.',
      sulfur: 'Sulphur yellow, bright and sickly, the clouds lit from far above.',
      storm: 'Storm-lit: a dark brown overcast flickering with lightning deep in the cloud.',
      rust: 'Rust-red twilight, heavy and close, like the inside of a kiln.',
    }),
    horizon: choice('What stands on the horizon?', {
      dome: 'A dark pancake dome: wide, low and flat-topped.',
      ridge: 'A dark ragged ridge line.',
      tessera: 'Tessera highlands: tight folded ridges like crumpled foil.',
      shield: 'The broad slope of a giant shield volcano rising out of the haze.',
      none: 'Nothing: the plain runs flat to a hazy line.',
    }),
    mission: choice('What is the mission doing?', {
      transmitting: 'Still transmitting: the camera scan sweeping across the scene, every line a gift.',
      silent: 'Gone silent: the picture stopped part way, the rest of the sky never arrived.',
      crushed: 'Crushed: the signal breaking up into dropout stripes, the landing ring buckled.',
    }),
    frame: choice('What of the lander shows along the bottom of the picture?', {
      ring: 'The toothed landing ring curving across the foreground, as in every Venera panorama.',
      bars: 'The toothed ring with striped colour-calibration bars mounted on it.',
      nothing: 'Nothing: just ground to the bottom of the frame.',
    }),
    view: choice('How does the camera see it?', {
      panorama: 'Warped like a Venera panorama: the ground curving up at both sides to a tilted horizon.',
      level: 'A level, ordinary view to a straight horizon.',
    }),
    debris: choice('What came down nearby?', {
      nothing: 'Nothing else.',
      shell: 'A curved scorched fragment of the jettisoned heat shield, half buried in the middle distance.',
      cover: 'The camera\'s white lens cover, popped off and lying in front.',
      springs: 'Springs, bolts and torn foil from the separation, scattered near the front.',
    }),
    haze: choice('How far can you see?', {
      clear: 'Far: the horizon shapes dark and crisp against the glow.',
      thick: 'Barely: everything past the middle distance dissolves into orange haze.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = SKIES[a.sky];
    const warm = (colour: string) => new THREE.Color(colour).lerp(new THREE.Color(sky.glow), 0.08 + mood.warmth * 0.08);
    const top = warm(sky.top), mid = warm(sky.mid), glowColour = warm(sky.glow);
    const bg = top.clone().lerp(mid, 0.4).lerp(new THREE.Color('#7a6a5a'), (1 - mood.cheer) * 0.12);
    const { art: s, world } = diorama(context, {
      floor: null, background: `#${bg.getHexString()}`, width: 14, depth: 12,
      maxHeight: 3.6, radius: 1.7, pitch: 20, yaw: YAW, slots: SLOTS,
      viewBox: [[-3.5, 0, -5], [3.5, 3.4, 5]],
    });
    const yaw = YAW * Math.PI / 180;
    const silent = a.mission === 'silent', crushed = a.mission === 'crushed', lava = a.terrain === 'lava';
    const thick = a.haze === 'thick';

    // Picture coordinates: across runs left to right as the camera sees it, depth runs away from it.
    const across = (x: number, z: number) => x * Math.cos(yaw) - z * Math.sin(yaw);
    const depthOf = (x: number, z: number) => -(x * Math.sin(yaw) + z * Math.cos(yaw));
    const place = (u: number, d: number): P2 => [u * Math.cos(yaw) - d * Math.sin(yaw), -u * Math.sin(yaw) - d * Math.cos(yaw)];
    const [cx, cz] = place(0, -SHIFT);

    // ---- Light: no sun, only a diffuse ochre glow from everywhere above --------------------------
    for (const child of s.root.children) {
      if ((child as THREE.HemisphereLight).isHemisphereLight) {
        const light = child as THREE.HemisphereLight;
        light.color.set(sky.hemi);
        light.groundColor.set(sky.ground);
        light.intensity = mix(1.6, 2.0, mood.cheer) * (silent ? 0.85 : 1);
      } else if ((child as THREE.DirectionalLight).isDirectionalLight && child !== world.keyLight) {
        const light = child as THREE.DirectionalLight;
        light.color.set(sky.glow);
        light.intensity = 0.45;
      }
    }
    if (world.keyLight) {
      world.keyLight.color.set(sky.key);
      world.keyLight.intensity = mix(1.4, 1.9, mood.cheer) * (silent ? 0.8 : 1);
      world.keyLight.shadow.radius = 6;
    }

    // ---- The warped ground ------------------------------------------------------------------------------
    const panorama = a.view === 'panorama';
    const lift = (x: number, z: number) => {
      if (!panorama) return 0;
      const side = smooth(Math.abs(across(x, z)), 4.6, 15) ** 1.3;
      const far = 0.45 + 0.55 * smooth(depthOf(x, z), -4, HORIZON);
      return 4.2 * side * far * (across(x, z) > 0 ? 1.1 : 0.9);
    };
    const rockTone = new THREE.Color('#4b3f35').lerp(new THREE.Color('#5c4030'), mood.warmth * 0.5);
    const soilTone = new THREE.Color('#3a2e26').lerp(new THREE.Color('#6a4a30'), mood.wear * 0.4);
    const dustTone = new THREE.Color('#9a6a3e').lerp(new THREE.Color(sky.mid), 0.3);
    // The painting covers the disc; plates are laid out in the disc's own coordinates.
    const size = 2048, toPx = (v: number) => (v / (2 * GROUND) + 0.5) * size;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d')!;
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = lava ? 1024 : 4;
    const glow = glowCanvas.getContext('2d')!;
    glow.fillStyle = '#000'; glow.fillRect(0, 0, glowCanvas.width, glowCanvas.height);
    g.fillStyle = (lava ? new THREE.Color('#1e1714') : soilTone).getStyle();
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = random() < 0.5 ? 'rgba(255,230,190,0.05)' : 'rgba(0,0,0,0.12)';
      g.fillRect(random() * size, random() * size, 1 + random() * 4, 1 + random() * 4);
    }
    const plate = (points: readonly P2[], tone: THREE.Color) => {
      g.fillStyle = tone.getStyle();
      g.beginPath(); points.forEach(([x, z], i) => (i ? g.lineTo(toPx(x), toPx(z)) : g.moveTo(toPx(x), toPx(z)))); g.closePath(); g.fill();
      // A pale flaked lip along one side and a dark shadow under the other.
      g.strokeStyle = 'rgba(205,170,125,0.45)'; g.lineWidth = 2.5;
      g.beginPath(); points.slice(0, Math.ceil(points.length / 2) + 1).forEach(([x, z], i) => (i ? g.lineTo(toPx(x), toPx(z)) : g.moveTo(toPx(x), toPx(z)))); g.stroke();
      g.strokeStyle = 'rgba(10,6,4,0.55)'; g.lineWidth = 3;
      g.beginPath(); points.slice(Math.floor(points.length / 2)).forEach(([x, z], i) => (i ? g.lineTo(toPx(x) + 2, toPx(z) + 2) : g.moveTo(toPx(x) + 2, toPx(z) + 2))); g.stroke();
    };
    if (!lava) {
      const cell = a.terrain === 'slabs' ? 1.0 : a.terrain === 'rubble' ? 0.7 : 1.3;
      const fill = a.terrain === 'slabs' ? 0.97 : a.terrain === 'rubble' ? 0.7 : 0.5;
      for (let x = -GROUND; x < GROUND; x += cell)
        for (let z = -GROUND; z < GROUND; z += cell * 0.85) {
          if (random() > fill) continue;
          const tone = rockTone.clone().offsetHSL(0, (random() - 0.5) * 0.04, (random() - 0.5) * 0.09);
          plate(outline(random, x + cell / 2 + (random() - 0.5) * cell * 0.3, z + cell / 2 + (random() - 0.5) * cell * 0.3, cell * 0.56, 5 + Math.floor(random() * 3), 0.85), tone);
        }
      // Bigger plates lying over the small ones, long and uneven, then a scatter of chips: no honeycomb.
      const big = a.terrain === 'slabs' ? 260 : a.terrain === 'soil' ? 70 : 40;
      for (let i = 0; i < big; i++) {
        const x = (random() - 0.5) * 2 * GROUND, z = (random() - 0.5) * 2 * GROUND, r = mix(0.7, 2.1, random() ** 1.5);
        const turn = random() * Math.PI, squash = mix(0.45, 0.9, random());
        const points = outline(random, 0, 0, r, 6 + Math.floor(random() * 3), squash).map(([px, pz]) => [x + px * Math.cos(turn) - pz * Math.sin(turn), z + px * Math.sin(turn) + pz * Math.cos(turn)] as P2);
        plate(points, rockTone.clone().offsetHSL(0, (random() - 0.5) * 0.05, (random() - 0.5) * 0.1 + 0.02));
      }
      for (let i = 0; i < 500; i++) {
        const x = (random() - 0.5) * 2 * GROUND, z = (random() - 0.5) * 2 * GROUND;
        plate(outline(random, x, z, mix(0.12, 0.35, random()), 5), rockTone.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12));
      }
      g.strokeStyle = 'rgba(12,8,5,0.55)';
      for (let i = 0; i < 400; i++) {
        g.lineWidth = 1 + random() * 1.5;
        let x = random() * size, y = random() * size;
        g.beginPath(); g.moveTo(x, y);
        for (let j = 0; j < 3; j++) { x += (random() - 0.5) * 40; y += (random() - 0.5) * 40; g.lineTo(x, y); }
        g.stroke();
      }
    } else {
      // Ropy pahoehoe: arcs of folded skin, and glowing seams between crusts.
      for (let i = 0; i < 700; i++) {
        const x = random() * size, y = random() * size, r = 14 + random() * 40, t = random() * Math.PI * 2;
        for (let j = 0; j < 4; j++) {
          g.strokeStyle = j % 2 ? 'rgba(90,70,60,0.5)' : 'rgba(5,3,2,0.6)'; g.lineWidth = 2;
          g.beginPath(); g.arc(x, y, r + j * 4, t, t + 1.4); g.stroke();
        }
      }
      for (let i = 0; i < 160; i++) {
        let x = random() * 1024, y = random() * 1024;
        glow.strokeStyle = `rgba(255,${110 + Math.floor(random() * 60)},30,${0.6 + random() * 0.4})`; glow.lineWidth = 1.5 + random() * 2.5;
        g.strokeStyle = 'rgba(70,24,8,0.9)'; g.lineWidth = 3 + random() * 3;
        const path: P2[] = [[x, y]];
        for (let j = 0; j < 5; j++) { x += (random() - 0.5) * 60; y += (random() - 0.5) * 60; path.push([x, y]); }
        g.beginPath(); path.forEach(([px, py], j) => (j ? g.lineTo(px * 2, py * 2) : g.moveTo(px * 2, py * 2))); g.stroke();
        glow.beginPath(); path.forEach(([px, py], j) => (j ? glow.lineTo(px, py) : glow.moveTo(px, py))); glow.stroke();
      }
    }
    // Dust drifts that grow with wear.
    for (let i = 0; i < 40; i++) {
      const x = random() * size, y = random() * size, r = 40 + random() * 160;
      const drift = g.createRadialGradient(x, y, 0, x, y, r);
      const alpha = (lava ? 0.08 : 0.16) + mood.wear * 0.3 + (a.terrain === 'soil' ? 0.25 : 0);
      drift.addColorStop(0, `rgba(${Math.round(dustTone.r * 255)},${Math.round(dustTone.g * 255)},${Math.round(dustTone.b * 255)},${alpha})`);
      drift.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = drift;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const groundMap = new THREE.CanvasTexture(canvas);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.anisotropy = 8;
    const glowMap = new THREE.CanvasTexture(glowCanvas);
    glowMap.colorSpace = THREE.SRGBColorSpace;
    const groundPaint = new THREE.MeshStandardMaterial({
      map: groundMap, bumpMap: groundMap, bumpScale: 2, roughness: lava ? 0.55 : 0.97, metalness: lava ? 0.15 : 0,
      emissive: lava ? '#ffffff' : '#000000', emissiveMap: lava ? glowMap : null, emissiveIntensity: lava ? mix(0.7, 1.3, mood.energy) : 0,
    });
    const floor = new THREE.Mesh(polarDisc(cx, cz, GROUND, 48, 160, lift), groundPaint);
    floor.receiveShadow = true;
    s.root.add(floor);
    world.ground = floor;

    const freeOf = (x: number, z: number, margin: number) =>
      depthOf(x, z) < HORIZON - 1.5 && SLOTS.every(([sx, sz, , scale = 1]) => Math.hypot(x - sx, z - sz) > margin * scale);
    const planar = (geometry: THREE.BufferGeometry) => {
      const position = geometry.attributes.position;
      const uv = new Float32Array(position.count * 2);
      for (let i = 0; i < position.count; i++) {
        uv[i * 2] = (position.getX(i) - cx) / (2 * GROUND) + 0.5;
        uv[i * 2 + 1] = 1 - ((position.getZ(i) - cz) / (2 * GROUND) + 0.5);
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return geometry;
    };
    const anywhere = (): P2 => place((random() - 0.5) * 26, mix(-9, HORIZON - 1.5, random()));

    // ---- Raised slabs, rubble or lava lobes --------------------------------------------------------------
    const rockPaint = new THREE.MeshStandardMaterial({ map: groundMap, bumpMap: groundMap, bumpScale: 2, roughness: 0.95, color: '#d8d0c8' });
    const pieces: THREE.BufferGeometry[] = [];
    const slabCount = { slabs: Math.round(mix(40, 70, mood.density)), soil: 18, rubble: 14, lava: 0 }[a.terrain];
    for (let i = 0, tries = 0; i < slabCount && tries < 600; tries++) {
      const [x, z] = anywhere();
      if (!freeOf(x, z, 1.9)) continue;
      const r = mix(0.45, 1.2, random());
      const shape = new THREE.Shape(outline(random, 0, 0, r, 5 + Math.floor(random() * 3)).map(([px, pz]) => new THREE.Vector2(px, -pz)));
      const thickness = mix(0.04, 0.14, random()) * (a.terrain === 'soil' ? 0.6 : 1);
      const piece = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.03, bevelSegments: 1 });
      piece.rotateX(-Math.PI / 2);
      piece.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((random() - 0.5) * 0.12, random() * 6, (random() - 0.5) * 0.12)));
      piece.translate(x, lift(x, z) - (a.terrain === 'soil' ? 0.05 : 0.01), z);
      piece.clearGroups();
      pieces.push(planar(piece));
      i++;
    }
    if (pieces.length) {
      const merged = mergeGeometries(pieces);
      for (const piece of pieces) piece.dispose();
      if (merged) {
        const slabs = new THREE.Mesh(merged, rockPaint);
        slabs.castShadow = slabs.receiveShadow = true;
        s.root.add(slabs);
      }
    }
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion();
    if (a.terrain === 'rubble' || a.terrain === 'slabs') {
      const count = a.terrain === 'rubble' ? Math.round(mix(380, 620, mood.density)) : 90;
      const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: rockTone.clone().multiplyScalar(0.85), roughness: 0.95, flatShading: true }), count);
      let n = 0;
      for (let tries = 0; n < count && tries < count * 4; tries++) {
        const [x, z] = anywhere();
        if (!freeOf(x, z, 1.6)) continue;
        const r = a.terrain === 'rubble' ? mix(0.06, 0.36, random() ** 1.8) : mix(0.04, 0.14, random());
        matrix.compose(new THREE.Vector3(x, lift(x, z) + r * 0.25, z), q.setFromEuler(new THREE.Euler(random() * 3, random() * 3, random() * 3)), new THREE.Vector3(r * mix(1, 1.6, random()), r * mix(0.5, 0.8, random()), r));
        stones.setMatrixAt(n++, matrix);
      }
      stones.count = n;
      stones.instanceMatrix.needsUpdate = true;
      stones.castShadow = stones.receiveShadow = true;
      s.root.add(stones);
    } else if (lava) {
      const lobes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshStandardMaterial({ map: groundMap, roughness: 0.5, metalness: 0.15, color: '#9a8a80' }), 40);
      let n = 0;
      for (let tries = 0; n < 40 && tries < 300; tries++) {
        const [x, z] = anywhere();
        if (!freeOf(x, z, 2)) continue;
        const r = mix(0.6, 1.6, random());
        matrix.compose(new THREE.Vector3(x, lift(x, z), z), q.setFromEuler(new THREE.Euler(0, random() * 6, 0)), new THREE.Vector3(r, r * mix(0.12, 0.22, random()), r * mix(0.5, 0.8, random())));
        lobes.setMatrixAt(n++, matrix);
      }
      lobes.count = n;
      lobes.instanceMatrix.needsUpdate = true;
      lobes.castShadow = lobes.receiveShadow = true;
      s.root.add(lobes);
    }

    // ---- The sky: a painted cyclorama standing just past the horizon ------------------------------------
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2048; skyCanvas.height = 512;
    const c = skyCanvas.getContext('2d')!;
    const gradient = c.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, bg.getStyle());
    gradient.addColorStop(0.2, top.getStyle());
    gradient.addColorStop(0.6, mid.getStyle());
    gradient.addColorStop(0.93, glowColour.getStyle());
    gradient.addColorStop(1, glowColour.clone().lerp(new THREE.Color('#fff2d0'), 0.3).getStyle());
    c.fillStyle = gradient;
    c.fillRect(0, 0, 2048, 512);
    for (let i = 0; i < 30; i++) {
      const y = 60 + random() * 330, h = 8 + random() * 30;
      c.fillStyle = random() < 0.5 ? `rgba(40,20,10,${0.05 + random() * 0.08})` : `rgba(255,220,160,${0.04 + random() * 0.06})`;
      c.beginPath(); c.ellipse(random() * 2048, y, 300 + random() * 600, h, 0, 0, Math.PI * 2); c.fill();
    }
    // A far, hazy band of land painted behind the modelled horizon.
    const farTone = new THREE.Color('#3a2c24').lerp(glowColour, thick ? 0.7 : 0.45);
    c.fillStyle = farTone.getStyle();
    c.beginPath(); c.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 16) {
      const u = x / 2048;
      let h = 10 + 6 * Math.sin(u * 23 + 1) + 4 * Math.sin(u * 61);
      if (a.horizon === 'ridge' || a.horizon === 'tessera') h += 14 + 10 * Math.abs(Math.sin(u * 40));
      if (panorama) h += 120 * Math.abs(u - 0.5) ** 2 * 4;
      c.lineTo(x, 500 - h);
    }
    c.lineTo(2048, 512); c.fill();
    if (a.mission === 'transmitting') {
      // The Venera frame: a row of white survey ticks along the top while the camera scans.
      c.fillStyle = 'rgba(255,250,235,0.85)';
      for (let x = 20; x < 2048; x += 46) c.fillRect(x, 120, 4, x % 230 < 46 ? 26 : 14);
    } else if (crushed) {
      for (let i = 0; i < 14; i++) {
        const x = random() * 2048, w = 3 + random() * 14;
        c.fillStyle = random() < 0.5 ? 'rgba(245,240,225,0.55)' : 'rgba(20,14,10,0.45)';
        c.fillRect(x, 0, w, 512);
      }
    } else if (silent) {
      // The picture stops: beyond a ragged scan edge, the sky never arrived.
      const stop = 2048 * (0.4 + random() * 0.12);
      const blank = new THREE.Color(sky.top).lerp(new THREE.Color('#77685a'), 0.6);
      c.fillStyle = blank.getStyle();
      c.beginPath(); c.moveTo(stop, 0);
      for (let y = 0; y <= 512; y += 16) c.lineTo(stop + (random() - 0.5) * 18, y);
      c.lineTo(2048, 512); c.lineTo(2048, 0); c.fill();
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,250,240' : '0,0,0'},${random() * 0.1})`; c.fillRect(stop + random() * (2048 - stop), random() * 512, 2, 2); }
    }
    const skyMap = new THREE.CanvasTexture(skyCanvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const skyHeight = 8;
    const skyArc = 2.6;
    const cyclorama = new THREE.Mesh(
      new THREE.CylinderGeometry(GROUND + 0.1, GROUND + 0.1, skyHeight, 72, 1, true, yaw + Math.PI - skyArc / 2, skyArc),
      new THREE.MeshBasicMaterial({ map: skyMap, side: THREE.DoubleSide, toneMapped: false }),
    );
    cyclorama.position.set(cx, skyHeight / 2 - 0.4, cz);
    s.root.add(cyclorama);

    let stormGlow: THREE.MeshBasicMaterial | null = null;
    if (a.sky === 'storm') {
      const flash = document.createElement('canvas');
      flash.width = 1024; flash.height = 256;
      const f = flash.getContext('2d')!;
      for (let i = 0; i < 6; i++) {
        const x = 200 + random() * 620, y = 50 + random() * 100, r = 50 + random() * 80;
        const spot = f.createRadialGradient(x, y, 0, x, y, r);
        spot.addColorStop(0, 'rgba(255,236,200,0.9)'); spot.addColorStop(1, 'rgba(255,200,150,0)');
        f.fillStyle = spot; f.fillRect(x - r, y - r, r * 2, r * 2);
      }
      const map = new THREE.CanvasTexture(flash);
      map.colorSpace = THREE.SRGBColorSpace;
      stormGlow = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
      const overlay = new THREE.Mesh(new THREE.CylinderGeometry(GROUND, GROUND, skyHeight * 0.5, 48, 1, true, yaw + Math.PI - skyArc / 2, skyArc), stormGlow);
      overlay.position.set(cx, skyHeight * 0.62, cz);
      s.root.add(overlay);
    }

    // ---- What stands on the horizon ---------------------------------------------------------------------
    const far = new THREE.MeshStandardMaterial({ color: new THREE.Color('#2a201b').lerp(mid, thick ? 0.6 : 0.2), roughness: 1, flatShading: a.horizon !== 'dome' });
    const onHorizon = (u: number, back: number): [number, number, number] => {
      const [x, z] = place(u, HORIZON - back);
      return [x, lift(x, z), z];
    };
    if (a.horizon === 'dome') {
      const [x, y, z] = onHorizon((random() < 0.5 ? -1 : 1) * mix(1.5, 4.5, random()), 2.2);
      const profile = [[0, 0.62], [1.4, 0.6], [2.1, 0.55], [2.5, 0.42], [2.75, 0.18], [2.95, 0.03], [3.1, -0.15]].map(([px, py]) => new THREE.Vector2(px, py)).reverse();
      const dome = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), far);
      dome.position.set(x, y, z);
      dome.scale.set(1.3, mix(1.1, 1.6, random()), 0.7);
      dome.rotation.y = yaw;
      dome.castShadow = dome.receiveShadow = true;
      s.root.add(dome);
    } else if (a.horizon === 'ridge' || a.horizon === 'tessera') {
      const tessera = a.horizon === 'tessera';
      const count = tessera ? 48 : 20;
      const peaks = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, tessera ? 4 : 6), far, count);
      for (let i = 0; i < count; i++) {
        const u = mix(-13, 13, (i + random() * 0.8) / count);
        const [x, y, z] = onHorizon(u, 0.6 + random() * 1.6);
        const tall = (tessera ? mix(0.4, 1.1, random()) : mix(0.5, 1.6, random())) * (0.7 + 0.5 * Math.sin((i / count) * Math.PI * 1.3 + 0.4));
        const wide = tessera ? mix(0.35, 0.7, random()) : mix(1.0, 2.0, random());
        matrix.compose(new THREE.Vector3(x, y + tall / 2 - 0.05, z), q.setFromEuler(new THREE.Euler(0, yaw + (tessera ? 0.15 : random()), tessera ? (random() - 0.5) * 0.3 : 0)), new THREE.Vector3(wide * 2.4, tall, wide));
        peaks.setMatrixAt(i, matrix);
      }
      peaks.instanceMatrix.needsUpdate = true;
      peaks.castShadow = true;
      s.root.add(peaks);
    } else if (a.horizon === 'shield') {
      const [x, y, z] = onHorizon(mix(-4, 4, random()), 2.5);
      const shield = new THREE.Mesh(new THREE.ConeGeometry(6.5, 1.7, 48), new THREE.MeshStandardMaterial({ color: far.color.clone().lerp(mid, 0.25), roughness: 1 }));
      shield.position.set(x, y + 0.75, z);
      shield.scale.z = 0.35;
      shield.rotation.y = yaw;
      s.root.add(shield);
    } else {
      for (let i = 0; i < 7; i++) {
        const [x, y, z] = onHorizon(mix(-12, 12, i / 6) + (random() - 0.5) * 2, 0.5);
        const swell = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), far);
        swell.position.set(x, y, z);
        swell.scale.set(mix(2, 3.5, random()), mix(0.1, 0.25, random()), 0.6);
        swell.rotation.y = yaw;
        s.root.add(swell);
      }
    }

    // ---- The lander's toothed ring across the bottom of the picture ----------------------------------------
    const metal = new THREE.MeshStandardMaterial({ color: new THREE.Color('#c9c4b6').lerp(dustTone, mood.wear * 0.3), metalness: 0.35, roughness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: '#24201c', roughness: 0.8 });
    if (a.frame !== 'nothing') {
      const ringR = 5.4, apex = 7.6, arc = crushed ? 1.2 : 1.5;
      const geometry = new THREE.TorusGeometry(ringR, 0.25, 12, 72, arc);
      geometry.rotateZ(-Math.PI / 2 - arc / 2);
      geometry.rotateX(Math.PI / 2);
      const ring = new THREE.Mesh(geometry, metal);
      // The ring's centre sits toward the camera; its far side crosses the front of the plain.
      const [rx, rz] = place(0, -(apex + ringR));
      ring.position.set(rx, 0.25, rz);
      ring.rotation.y = yaw;
      if (crushed) ring.rotation.z = 0.05;
      ring.castShadow = ring.receiveShadow = true;
      s.root.add(ring);
      // The crushable teeth along the ring's inner edge, the saw-tooth of every Venera panorama.
      const teeth = 19;
      const toothShape = new THREE.Shape([new THREE.Vector2(-0.2, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0, 0.42)]);
      const tooth = new THREE.ExtrudeGeometry(toothShape, { depth: 0.22, bevelEnabled: false });
      tooth.translate(0, 0, -0.11);
      tooth.rotateX(Math.PI / 2);
      const teethMesh = new THREE.InstancedMesh(tooth, dark, teeth);
      for (let i = 0; i < teeth; i++) {
        const t = -arc / 2 + 0.04 + (i / (teeth - 1)) * (arc - 0.08);
        const x = rx - Math.sin(yaw + t) * (ringR - 0.2), z = rz - Math.cos(yaw + t) * (ringR - 0.2);
        const bent = crushed && random() < 0.4;
        // Each tooth lies flat, pointing in from the ring toward the camera.
        matrix.compose(new THREE.Vector3(x, bent ? 0.03 : 0.12, z), q.setFromEuler(new THREE.Euler(bent ? 0.5 : 0.15, yaw + t, bent ? 0.4 : 0, 'YXZ')), new THREE.Vector3(1, 1, bent ? 0.6 : 1));
        teethMesh.setMatrixAt(i, matrix);
      }
      teethMesh.instanceMatrix.needsUpdate = true;
      teethMesh.castShadow = true;
      s.root.add(teethMesh);
      if (a.frame === 'bars') {
        const bars = [['#111111', '#444444', '#777777', '#aaaaaa', '#dddddd', '#ffffff'], ['#d8322a', '#2d9a3f', '#2c4fd6', '#f2d23b', '#111111', '#ffffff'], ['#111111', '#ffffff', '#111111', '#ffffff', '#111111', '#ffffff']];
        bars.forEach((colours, i) => {
          const tile = document.createElement('canvas');
          tile.width = 256; tile.height = 48;
          const t2 = tile.getContext('2d')!;
          colours.forEach((colour, j) => { t2.fillStyle = colour; t2.fillRect((j * 256) / colours.length, 0, 256 / colours.length + 1, 48); });
          const map = new THREE.CanvasTexture(tile);
          map.colorSpace = THREE.SRGBColorSpace;
          const t = (i - 1) * 0.3;
          const x = rx - Math.sin(yaw + t) * (ringR - 0.05), z = rz - Math.cos(yaw + t) * (ringR - 0.05);
          const bar = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.26), new THREE.MeshStandardMaterial({ map, roughness: 0.7 }));
          bar.position.set(x, 0.66, z);
          bar.rotation.set(-0.2, yaw + t, 0, 'YXZ');
          bar.castShadow = true;
          s.root.add(bar);
          for (const side of [-0.5, 0.5]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), dark);
            post.position.set(x + Math.cos(yaw + t) * side, 0.42, z - Math.sin(yaw + t) * side);
            s.root.add(post);
          }
        });
      }
    }

    // ---- Debris ----------------------------------------------------------------------------------------
    if (a.debris === 'shell') {
      const fragment = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, 1.7, 0.2, 1.0), new THREE.MeshStandardMaterial({ color: '#2b221c', roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide }));
      let at = place(-5.5, 6);
      for (let tries = 0; tries < 20 && !freeOf(at[0], at[1], 2.4); tries++) at = place((random() - 0.5) * 14, 4 + random() * 5);
      fragment.position.set(at[0], lift(at[0], at[1]) - 0.4, at[1]);
      fragment.rotation.set(0.5, random() * 6, 0.3);
      fragment.castShadow = true;
      s.root.add(fragment);
    } else if (a.debris === 'cover') {
      const white = new THREE.MeshStandardMaterial({ color: '#f2efe6', roughness: 0.45, side: THREE.DoubleSide });
      const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 20, 1, true, 0, Math.PI), white);
      const [x, z] = place(-2.6, -5.4);
      cover.position.set(x, 0.01, z);
      cover.rotation.set(0, yaw + 0.6, Math.PI / 2);
      cover.castShadow = true;
      s.root.add(cover);
    } else if (a.debris === 'springs') {
      const steel = new THREE.MeshStandardMaterial({ color: '#a29d92', metalness: 0.7, roughness: 0.35 });
      for (let i = 0; i < 4; i++) {
        const [x0, z0] = place((random() - 0.5) * 6, -5 - random() * 1.4);
        const coil: THREE.Vector3[] = [];
        for (let j = 0; j <= 50; j++) coil.push(new THREE.Vector3(j * 0.012, 0.07 + Math.sin(j * 0.8) * 0.06, Math.cos(j * 0.8) * 0.06));
        const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coil), 120, 0.012, 6), steel);
        spring.position.set(x0, 0, z0);
        spring.rotation.y = random() * 6;
        spring.castShadow = true;
        s.root.add(spring);
      }
      const foil = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45, 6, 4), new THREE.MeshStandardMaterial({ color: '#d4a640', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
      const position = foil.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) position.setZ(i, (random() - 0.5) * 0.12);
      foil.geometry.computeVertexNormals();
      const [fx, fz] = place(2.6, -5.6);
      foil.position.set(fx, 0.08, fz);
      foil.rotation.set(-Math.PI / 2 + 0.2, 0, random() * 3);
      s.root.add(foil);
    }

    // ---- Motion: the camera's scan, the storm, the lava -------------------------------------------------------
    if (crushed) {
      for (let i = 0; i < 7; i++) {
        const light = random() < 0.5;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(mix(0.05, 0.3, random()), 24), new THREE.MeshBasicMaterial({ color: light ? '#f4efe2' : '#140e0a', transparent: true, opacity: mix(0.25, 0.5, random()), depthWrite: false, toneMapped: false }));
        const [x, z] = place((random() - 0.5) * 18, mix(-2, 8, random()));
        stripe.position.set(x, 6, z);
        stripe.rotation.y = yaw;
        s.root.add(stripe);
      }
    }
    let scan: THREE.Mesh | null = null;
    if (a.mission === 'transmitting') {
      scan = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 16), new THREE.MeshBasicMaterial({ color: '#fff2d6', transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      scan.rotation.y = yaw;
      s.root.add(scan);
    }
    const scanSpeed = mix(0.5, 2.6, mood.energy), flicker = mix(1, 6, mood.energy);
    const lavaBase = groundPaint.emissiveIntensity;
    world.update = (_dt, time) => {
      if (scan) {
        const u = ((time * scanSpeed) % 22) - 11;
        const [x, z] = place(u, 0);
        scan.position.set(x, 5, z);
      }
      if (stormGlow) {
        const n = Math.floor(time * flicker), x = Math.sin(n * 12.9898) * 43758.5453, beat = x - Math.floor(x);
        stormGlow.opacity = beat > 0.55 ? 0.5 + 0.4 * Math.exp(-(time * flicker - n) * 5) : 0.18;
      }
      if (lava) groundPaint.emissiveIntensity = lavaBase * (0.8 + 0.2 * Math.sin(time * scanSpeed));
    };
    world.update(0, 2.3);
    return world;
  },
});
