import * as THREE from 'three';
import { NATURAL_FRAMING, Sculpture, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
interface Spot { at: P3; scale: P3; turn?: P3; color?: string }

const WATERS = {
  bright: 'Bright cartoon turquoise, Saturday-morning sun bouncing off the sand.',
  dusk: 'Violet-blue evening water, the lamps coming on.',
  murky: 'Murky green-teal water with silt hanging in it, a grubbier day.',
  deep: 'Deep clear cobalt, the surface a faint silver glow far above.',
} as const;
const WATER: Record<keyof typeof WATERS, { back: string; top: string; sand: string; lane: string }> = {
  bright: { back: '#56c4f0', top: '#d6f6ff', sand: '#ecd292', lane: '#d8bf84' },
  dusk: { back: '#6f72c4', top: '#d6bde6', sand: '#dccaa4', lane: '#c4b08c' },
  murky: { back: '#7fa596', top: '#c6d8c4', sand: '#d4c89c', lane: '#bcae84' },
  deep: { back: '#3f74c8', top: '#bcd8f2', sand: '#e2cf98', lane: '#c9b583' },
};

/** Grey sand with the light of the surface rippling across it; vertex colours tint it. Tiles seamlessly. */
function caustics(strength: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#d4d4d4';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = 'rgba(60,40,10,0.14)';
  for (let i = 0; i < 420; i++) ctx.fillRect((i * 193) % 512, (i * 389) % 512, 3, 3);
  const k = Math.PI * 2 / 512;
  ctx.lineCap = 'round';
  for (const [width, alpha] of [[30, 0.3 * strength], [11, 0.85 * strength]] as const) {
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = width;
    for (let n = 0; n < 4; n++) {
      ctx.beginPath();
      for (let x = -16; x <= 528; x += 8) {
        const y = n * 512 / 4 + 60 + Math.sin(x * k * 2 + n * 1.3) * 26 + Math.sin(x * k * 6 + n) * 9;
        if (x === -16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (let y = -16; y <= 528; y += 8) {
        const x = n * 512 / 4 + 60 + Math.sin(y * k * 2 + n * 0.7) * 26 + Math.sin(y * k * 5 + n * 2) * 9;
        if (y === -16) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/** Open water behind everything: brighter toward the surface, with the shimmer of waves far above. */
function openWater(back: string, top: string, shimmer: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const water = new THREE.Color(back);
  const deep = water.clone().lerp(new THREE.Color('#2b4474'), 0.2);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.22, `#${water.getHexString()}`);
  gradient.addColorStop(1, `#${deep.getHexString()}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineCap = 'round';
  for (let n = 0; n < 9; n++) {
    ctx.strokeStyle = `rgba(255,255,255,${(0.5 - n * 0.05) * shimmer})`;
    ctx.lineWidth = 3 + n * 0.5;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 6) {
      const y = 8 + n * 10 + Math.sin(x * 0.045 + n * 1.7) * 4 + Math.sin(x * 0.11 + n) * 2;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A soft beam of light: bright at the top, gone at the bottom. */
function beam() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, 'rgba(255,255,245,0.9)');
  gradient.addColorStop(0.5, 'rgba(255,255,245,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,245,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);
  const side = ctx.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.3, 'rgba(0,0,0,0)');
  side.addColorStop(0.7, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(canvas);
}

/** Meandering grooves, for brain-coral hedges. */
function grooves(random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(120,30,60,0.55)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  for (let n = 0; n < 22; n++) {
    let x = random() * 256, y = random() * 256, heading = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 14; i++) {
      heading += (random() - 0.5) * 1.6;
      x += Math.cos(heading) * 10; y += Math.sin(heading) * 10;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Many copies of one shape in a single draw call, each placed, turned, stretched and tinted. */
function instanced(root: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, spots: readonly Spot[], shadow = true) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, spots.length));
  mesh.count = spots.length;
  const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), euler = new THREE.Euler();
  spots.forEach((spot, i) => {
    turn.setFromEuler(euler.set(...(spot.turn ?? [0, 0, 0])));
    matrix.compose(new THREE.Vector3(...spot.at), turn, new THREE.Vector3(...spot.scale));
    mesh.setMatrixAt(i, matrix);
    if (spot.color) mesh.setColorAt(i, new THREE.Color(spot.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  root.add(mesh);
  return mesh;
}

export default defineWorld({
  questions: {
    water: choice('What is the water like?', WATERS),
    neighbours: choice('What houses line the lane behind the hero lot?', {
      classic: 'A stone Easter-Island head with a door, and a big brown boot with a chimney.',
      shells: 'A row of tall spiral-shell houses in pink and cream.',
      mixed: 'A stone head, a boot, a spiral shell and a tin can, one of each.',
      vacant: 'Empty sandy lots with FOR SALE signs and half-dug holes.',
    }),
    hedges: choice('What are the front hedges grown from?', {
      brain: 'Neatly trimmed pink brain coral, rounded like box hedges.',
      staghorn: 'Spiky orange staghorn coral, all fingers.',
      sponge: 'Clumps of yellow and purple tube sponges like organ pipes.',
      kelp: 'Wild untrimmed kelp, green ribbons flopping over the path.',
    }),
    bubbles: choice('How many bubble columns rise from the sand?', {
      none: 'None, the water is still.',
      one: 'One lazy column near the back.',
      few: 'A few, here and there.',
      many: 'Bubbles everywhere, the sand fizzing.',
    }),
    horizon: choice('What is in the far background?', {
      reef: 'A tall reef wall of coral in every colour.',
      sand: 'Open rippled sand dunes rolling off into the blue, a rock arch far off.',
      wreck: 'A sunken fishing boat lying on its side, mast tilted.',
      kelp: 'A tall kelp forest swaying slowly.',
    }),
    lane: choice('What is the lane surfaced with?', {
      stones: 'Flat stepping stones pressed into packed sand.',
      shells: 'A cobble of small shells.',
      road: 'A proper road: kerbstones and a painted yellow dashed line.',
      plain: 'Just packed sand, swept smooth.',
    }),
    passing: choice('What is passing by right now?', {
      nothing: 'Nothing, the lane is quiet.',
      school: 'A school of small yellow fish wheeling overhead.',
      jelly: 'A pink jellyfish drifting over the hedges.',
      snail: 'A pet sea snail with a pink spiral shell ambling down the lane.',
    }),
    sign: choice('What does the corner street sign say?', {
      conch: 'CONCH ST',
      pineapple: 'PINEAPPLE LN',
      dollar: 'SAND DOLLAR RD',
      end: 'DEAD END',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const water = WATER[a.water];
    const W = 15, D = 12.5;
    const slots = [[0, -1.3], [-4.7, -0.7, 0, 0.8], [4.7, -0.9, 0, 0.8], [-3.4, 5.2, 0, 0.55], [3.6, 5.3, 0, 0.55]] as const;
    const yawDeg = 24, pitchDeg = 28;
    const { art: s, world } = diorama(context, {
      background: water.back, floor: null, width: W, depth: D, maxHeight: 5, radius: 2.2, pitch: pitchDeg, yaw: yawDeg, slots,
      scale: [0.5, 2.5], viewBox: [[-6.3, 0, -D / 2], [6.3, 7, D / 2]],
    });
    const noon = Math.sin(mood.daylight * Math.PI);
    const waterColour = new THREE.Color(water.back);
    const far = (colour: string, amount: number) => `#${new THREE.Color(colour).lerp(waterColour, amount).getHexString()}`;
    const lively = (colour: string) => `#${new THREE.Color(colour).lerp(new THREE.Color('#8f8f86'), (1 - mood.cheer) * 0.35).getHexString()}`;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const lampOn = a.water === 'dusk' ? 1 : clamp01((mood.daylight - 0.55) * 3);
    const speed = mix(0.35, 1.5, mood.energy);

    // Underwater light: the sky light takes the colour of the water above.
    for (const child of s.root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) {
        hemi.color.set(new THREE.Color('#ffffff').lerp(new THREE.Color(water.top), 0.6));
        hemi.groundColor.set(new THREE.Color(water.sand).multiplyScalar(0.7));
        hemi.intensity *= 0.88;
      }
    }

    // The sea floor runs on past the lots and fades toward the blue, the light rippling across it.
    const ripple = caustics(a.water === 'murky' ? 0.35 : 0.6 + noon * 0.4);
    ripple.repeat.set(16, 11.6);
    const seabedGeometry = new THREE.PlaneGeometry(44, 32, 44, 32);
    seabedGeometry.rotateX(-Math.PI / 2);
    seabedGeometry.translate(0, 0, 4);
    const near = new THREE.Color(water.sand).multiplyScalar(1 / 0.83);
    const distant = new THREE.Color(water.sand).lerp(waterColour, 0.72).multiplyScalar(0.9 / 0.83);
    const tints: number[] = [];
    const position = seabedGeometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      const t = Math.max(THREE.MathUtils.smoothstep(-z, 5, 12), THREE.MathUtils.smoothstep(Math.abs(x), 12, 22) * 0.6);
      const c = near.clone().lerp(distant, t);
      tints.push(c.r, c.g, c.b);
    }
    seabedGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
    const seabed = s.mesh(seabedGeometry, new THREE.MeshStandardMaterial({ map: ripple, vertexColors: true, roughness: 0.95 }));
    seabed.castShadow = false;
    world.ground = seabed;

    // Open water behind, facing the camera: the surface shimmers along its top edge.
    const framing = context.framing ?? NATURAL_FRAMING;
    const yaw = (yawDeg + framing.turn * 22) * Math.PI / 180;
    const pitch = Math.min(68, Math.max(12, pitchDeg + (framing.elevation - 0.5) * 44)) * Math.PI / 180;
    const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();
    const centre = new THREE.Vector3(0, 2.75, 0);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(80, 42), new THREE.MeshBasicMaterial({ map: openWater(water.back, water.top, a.water === 'murky' ? 0.3 : 0.6 + noon * 0.4) }));
    back.position.copy(centre).addScaledVector(dir, -40).addScaledVector(up, -6);
    back.lookAt(back.position.clone().add(dir));
    back.renderOrder = -2;
    s.root.add(back);
    const shafts: THREE.Mesh[] = [];
    if (a.water !== 'murky') {
      const glow = beam();
      for (let i = 0; i < 5; i++) {
        const paint = new THREE.MeshBasicMaterial({ map: glow, transparent: true, opacity: 0.08 + noon * 0.14, depthWrite: false, blending: THREE.AdditiveBlending });
        const shaft = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + random() * 2.2, 26), paint);
        shaft.position.copy(centre).addScaledVector(dir, -24).addScaledVector(right, -12 + i * 6 + random() * 3).addScaledVector(up, 4);
        shaft.lookAt(shaft.position.clone().add(dir));
        shaft.rotateZ((random() - 0.5) * 0.3 + 0.15);
        shaft.renderOrder = -1;
        s.root.add(shaft);
        shafts.push(shaft);
      }
    }

    // The far background: a band across the whole view where the sea floor ends, half lost in the blue.
    const sway: { group: THREE.Object3D; phase: number }[] = [];
    const ball = new THREE.SphereGeometry(1, 14, 9);
    const hazy = (colour: string, amount: number) => `#${new THREE.Color(colour).lerp(waterColour, amount).multiplyScalar(0.92).getHexString()}`;
    const ridge: Spot[] = [];
    for (let x = -26; x <= 26; x += 2.6 + random() * 1.4) ridge.push({ at: [x, -0.2, -12.4 - random() * 0.6], scale: [3 + random() * 1.6, 0.9 + random() * 0.7, 1.6], color: hazy(water.sand, 0.62) });
    instanced(s.root, ball, new THREE.MeshStandardMaterial({ roughness: 1 }), ridge, false);
    if (a.horizon === 'reef') {
      const rocks: Spot[] = [], heads: Spot[] = [];
      const reefTints = ['#ff7a8a', '#ffa347', '#b35cff', '#3fd3c8', '#ffe14a', '#ff5a5a'].map(lively);
      for (let x = -24; x <= 24; x += 1.6 + random() * 1.2) {
        const h = 1.8 + random() * 1.8 + Math.sin(x * 0.35) * 0.6;
        const z = -10.8 - random() * 1.2;
        rocks.push({ at: [x, 0, z], scale: [1.3 + random() * 0.8, h, 1.1], color: hazy(lively(pick(['#d0707e', '#d98a5a', '#a070c0', '#c86a9a'])), 0.32) });
        for (let k = 0; k < 6; k++) heads.push({ at: [x + (random() - 0.5) * 1.8, h * (0.25 + random() * 0.75), z + 0.7 + random() * 0.35], scale: [0.2 + random() * 0.2, 0.18 + random() * 0.16, 0.22], color: hazy(pick(reefTints), 0.22) });
      }
      instanced(s.root, ball, new THREE.MeshStandardMaterial({ roughness: 0.9 }), rocks, false);
      instanced(s.root, ball, new THREE.MeshStandardMaterial({ roughness: 0.8 }), heads, false);
      const fan = new THREE.CylinderGeometry(1, 0.25, 0.06, 14, 1, false, -Math.PI / 2, Math.PI);
      fan.rotateX(Math.PI / 2);
      const fans: Spot[] = [];
      for (let i = 0; i < 14; i++) fans.push({ at: [-22 + i * 3.3 + random() * 1.5, 2.6 + random() * 1.2, -10.6], scale: [0.6 + random() * 0.4, 0.6 + random() * 0.4, 1], turn: [0, (random() - 0.5) * 0.5, 0], color: hazy(pick(reefTints), 0.35) });
      instanced(s.root, fan, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), fans, false);
    }
    if (a.horizon === 'sand') {
      const dunes: Spot[] = [];
      for (let x = -26; x <= 26; x += 4.5 + random() * 3) dunes.push({ at: [x, -0.3, -10.6 - random() * 1.5], scale: [4 + random() * 2.5, 0.9 + random() * 0.9, 2.2], color: hazy(water.sand, 0.45) });
      instanced(s.root, ball, new THREE.MeshStandardMaterial({ roughness: 1 }), dunes, false);
      const arch = s.mesh(new THREE.TorusGeometry(2.1, 0.6, 8, 24, Math.PI), s.material(hazy('#8a8270', 0.5), { roughness: 0.95 }), [-8.5, 0, -10.8]);
      arch.rotation.y = 0.3;
      arch.castShadow = false;
      const boulders: Spot[] = [];
      for (let i = 0; i < 7; i++) boulders.push({ at: [-20 + i * 6.5 + random() * 3, 0.15, -9.6 - random() * 1.5], scale: [0.6 + random() * 0.7, 0.5 + random() * 0.5, 0.6], color: hazy('#8a8270', 0.4) });
      instanced(s.root, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), boulders, false);
    }
    if (a.horizon === 'wreck') {
      const hull = new Sculpture(context);
      const plank = hull.material(hazy('#6a4a30', 0.35), { roughness: 0.9, side: THREE.DoubleSide });
      const body = hull.mesh(new THREE.CylinderGeometry(2, 2, 9, 18, 1, false, 0, Math.PI), plank);
      body.rotation.set(-0.45, 0, Math.PI / 2);
      hull.cylinder(0.8, 1.2, 2, [4.1, 0.5, 0.2], plank, 12).rotation.z = Math.PI / 2;
      hull.box([3, 1.4, 1.8], [-2, 1.2, -0.8], hull.material(hazy('#9a8a6a', 0.35), { roughness: 0.9 }));
      hull.box([0.9, 0.8, 0.08], [-2, 1.3, 0.12], hull.material(hazy('#3a4a5a', 0.35)));
      hull.rod([0.6, 1.2, 0.4], [1.4, 7.4, -2.6], 0.12, plank, 0.06);
      hull.rod([0.9, 5, -1.3], [-2.2, 5.4, -0.5], 0.07, plank);
      hull.ball([2, 0.05, 1.6], [1, 1.8, 2], hull.material(hazy('#b04a3a', 0.35), { roughness: 0.9 }), 8);
      const ribs = hull.material(hazy('#4a3220', 0.35), { roughness: 0.9 });
      for (let i = 0; i < 5; i++) hull.ring(2.02, 0.07, [-3.4 + i * 1.6, 0, 0], ribs, Math.PI).rotation.set(-0.45, Math.PI / 2, 0);
      hull.root.traverse((node) => { (node as THREE.Mesh).castShadow = false; });
      hull.root.position.set(-5.5, 0.4, -10.4);
      hull.root.rotation.y = 0.25;
      hull.root.scale.setScalar(0.8);
      s.root.add(hull.root);
    }
    if (a.horizon === 'kelp') {
      const stalk = s.material(hazy('#5f8a2e', 0.4), { roughness: 0.7 });
      const leaf = s.material(hazy('#86b547', 0.4), { roughness: 0.6, side: THREE.DoubleSide });
      for (let i = 0; i < 18; i++) {
        const x = -26 + i * 3 + random() * 1.6, z = -9.6 - random() * 2.4, h = 5 + random() * 3.5;
        const k = new Sculpture(context);
        const path: P3[] = [];
        for (let j = 0; j <= 6; j++) path.push([Math.sin(j * 1.1 + i) * 0.3, j / 6 * h, Math.cos(j * 0.9) * 0.2]);
        k.tube(path, 0.09, stalk).castShadow = false;
        const blades: Spot[] = [];
        for (let j = 1; j < 6; j++) {
          const p = path[j];
          blades.push({ at: [p[0] + (j % 2 ? 0.5 : -0.5), p[1] + 0.25, p[2]], scale: [0.62, 0.13, 0.03], turn: [0, random() * Math.PI, j % 2 ? -0.5 : 0.5] });
        }
        instanced(k.root, ball, leaf, blades, false);
        k.root.position.set(x, 0, z);
        s.root.add(k.root);
        sway.push({ group: k.root, phase: random() * Math.PI * 2 });
      }
    }

    // The near side of the street: low coral, rocks and sea grass in the foreground, nothing tall enough to hide the lane.
    const rocks: Spot[] = [], grass: Spot[] = [], heads: Spot[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (random() - 0.5) * 30, z = 6.6 + random() * 11;
      if (random() < 0.5) rocks.push({ at: [x, 0.05, z], scale: [0.25 + random() * 0.4, 0.18 + random() * 0.25, 0.25 + random() * 0.35], turn: [0, random() * 3, 0], color: pick(['#9a968c', '#8a877e', '#a8a296']) });
      else for (let k = 0; k < 5; k++) {
        const h = 0.3 + random() * 0.35;
        const turn: P3 = [(random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6];
        const half = new THREE.Vector3(0, h * 0.5, 0).applyEuler(new THREE.Euler(...turn));
        grass.push({ at: [x + (random() - 0.5) * 0.3 + half.x, half.y, z + (random() - 0.5) * 0.3 + half.z], scale: [0.05, h * 0.5, 0.012], turn, color: lively(pick(['#6f9c3a', '#86b547', '#5a8a30'])) });
      }
    }
    for (let i = 0; i < 6; i++) heads.push({ at: [(random() - 0.5) * 26, 0.05, 7 + random() * 9], scale: [0.5 + random() * 0.4, 0.4 + random() * 0.3, 0.5 + random() * 0.4], color: lively(pick(['#f58a9a', '#ffa347', '#b35cff', '#3fd3c8'])) });
    instanced(s.root, new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.95, flatShading: true }), rocks);
    instanced(s.root, ball, s.material('#ffffff', { roughness: 0.6, side: THREE.DoubleSide }), grass);
    instanced(s.root, new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: grooves(random), roughness: 0.85 }), heads);

    // The lane, running left to right in front of the lots.
    const laneZ = 2.9;
    const lanePaint = s.material(new THREE.Color(water.lane).multiplyScalar(0.88).getStyle(), { roughness: 0.95 });
    s.box([W + 6, 0.04, 2.4], [0, 0.02, laneZ], lanePaint).castShadow = false;
    if (a.lane === 'stones') {
      const stones: Spot[] = [];
      for (let i = 0; i < 15; i++) stones.push({ at: [-10 + i * 1.4 + (random() - 0.5) * 0.3, 0.05, laneZ + Math.sin(i * 1.1) * 0.5], scale: [0.36 + random() * 0.14, 1, 0.3 + random() * 0.12], turn: [0, random() * Math.PI, 0], color: pick(['#9c9a90', '#aaa69a', '#8d8a80']) });
      instanced(s.root, new THREE.CylinderGeometry(1, 1, 0.06, 9), s.material('#ffffff', { roughness: 0.9 }), stones);
    }
    if (a.lane === 'shells') {
      const half = new THREE.SphereGeometry(1, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2);
      const shells: Spot[] = [];
      for (let i = 0; i < 150; i++) { const size = 0.1 + random() * 0.08; shells.push({ at: [(random() - 0.5) * 20, 0.04, laneZ - 1.1 + random() * 2.2], scale: [size, size * 0.5, size * 0.85], turn: [0, random() * Math.PI, 0], color: pick(['#f1e4cf', '#f3c7b3', '#ffb37a', '#d8b4e8', '#ffffff']) }); }
      instanced(s.root, half, s.material('#ffffff', { roughness: 0.6 }), shells);
    }
    if (a.lane === 'road') {
      const kerb = s.material('#c8c2b0', { roughness: 0.9 });
      s.box([W + 6, 0.14, 0.25], [0, 0.07, laneZ - 1.25], kerb);
      s.box([W + 6, 0.14, 0.25], [0, 0.07, laneZ + 1.25], kerb);
      const dashes: Spot[] = [];
      for (let i = 0; i < 14; i++) dashes.push({ at: [-10 + i * 1.5, 0.045, laneZ], scale: [1, 1, 1] });
      instanced(s.root, new THREE.BoxGeometry(0.75, 0.012, 0.12), s.material('#f0c92a', { roughness: 0.8 }), dashes, false);
    }
    // A path of flat stones from the lane up to the hero's front door.
    const path: Spot[] = [];
    for (let i = 0; i < 3; i++) path.push({ at: [(random() - 0.5) * 0.15, 0.04, 1.45 - i * 0.55], scale: [0.32, 1, 0.24], turn: [0, random(), 0], color: '#b9b4a6' });
    instanced(s.root, new THREE.CylinderGeometry(1, 1, 0.06, 9), s.material('#ffffff', { roughness: 0.9 }), path);

    // Coral hedges along the far kerb, broken for the hero's path and the two side lots, with stubs on the near corners.
    const hedgeZ = 1.25;
    const runs: [number, number, number][] = [[-W / 2 - 1, -6.0, hedgeZ], [-3.4, -1.4, hedgeZ], [1.4, 3.4, hedgeZ], [6.0, W / 2 + 1, hedgeZ], [-W / 2 - 1, -5.6, 4.7], [6.0, W / 2 + 1, 4.7]];
    const hedgeSpots: Spot[] = [], tipSpots: Spot[] = [];
    if (a.hedges === 'brain') {
      const tints = ['#f58a9a', '#f07aa0', '#ff9a8a', '#e86f8a'].map(lively);
      for (const [x0, x1, z] of runs) {
        s.box([x1 - x0, 0.55, 0.62], [(x0 + x1) / 2, 0.28, z], s.material(lively('#d9607a'), { roughness: 0.9 }));
        for (let x = x0 + 0.3; x < x1 - 0.15; x += 0.42) hedgeSpots.push({ at: [x + (random() - 0.5) * 0.06, 0.52, z + (random() - 0.5) * 0.06], scale: [0.36, 0.34 + random() * 0.06, 0.38], turn: [0, random() * 3, 0], color: pick(tints) });
      }
      instanced(s.root, new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ map: grooves(random), roughness: 0.85 }), hedgeSpots);
    }
    if (a.hedges === 'staghorn') {
      const tints = ['#ff8a3a', '#ffa347', '#ff7a5a', '#f5b041'].map(lively);
      for (const [x0, x1, z] of runs) {
        s.box([x1 - x0, 0.3, 0.6], [(x0 + x1) / 2, 0.15, z], s.material(lively('#c9653a'), { roughness: 0.9 }));
        for (let x = x0 + 0.12; x < x1 - 0.1; x += 0.13) {
          const turn: P3 = [(random() - 0.5) * 0.8, 0, (random() - 0.5) * 1.1], h = 0.45 + random() * 0.45;
          const half = new THREE.Vector3(0, h / 2, 0).applyEuler(new THREE.Euler(...turn));
          const base = new THREE.Vector3(x, 0.26, z + (random() - 0.5) * 0.4);
          hedgeSpots.push({ at: base.clone().add(half).toArray() as P3, scale: [1, h, 1], turn, color: pick(tints) });
          tipSpots.push({ at: base.clone().addScaledVector(half, 2).toArray() as P3, scale: [0.06, 0.06, 0.06], color: '#ffe0b0' });
        }
      }
      instanced(s.root, new THREE.CylinderGeometry(0.035, 0.06, 1, 6), s.material('#ffffff', { roughness: 0.8 }), hedgeSpots);
      instanced(s.root, new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff', { roughness: 0.6 }), tipSpots, false);
    }
    if (a.hedges === 'sponge') {
      const tints = ['#ffd23a', '#b35cff', '#ffb02e', '#9a5cff', '#ff8ad0'].map(lively);
      for (const [x0, x1, z] of runs) {
        s.box([x1 - x0, 0.2, 0.6], [(x0 + x1) / 2, 0.1, z], s.material(lively('#8a7a5a'), { roughness: 0.9 }));
        for (let x = x0 + 0.15; x < x1 - 0.1; x += 0.2) {
          const h = 0.5 + random() * 0.6, r = 0.09 + random() * 0.04;
          const at: P3 = [x + (random() - 0.5) * 0.06, h / 2, z + (random() - 0.5) * 0.36];
          hedgeSpots.push({ at, scale: [r, h, r], turn: [(random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2], color: pick(tints) });
          tipSpots.push({ at: [at[0], h + 0.005, at[2]], scale: [r * 0.75, 1, r * 0.75] });
        }
      }
      instanced(s.root, new THREE.CylinderGeometry(1, 0.85, 1, 10), s.material('#ffffff', { roughness: 0.9 }), hedgeSpots);
      instanced(s.root, new THREE.CylinderGeometry(1, 1, 0.02, 10), s.material('#3a2a30', { roughness: 1 }), tipSpots, false);
    }
    if (a.hedges === 'kelp') {
      for (const [x0, x1, z] of runs) {
        s.box([x1 - x0, 0.25, 0.55], [(x0 + x1) / 2, 0.12, z], s.material(lively('#4e6b2d'), { roughness: 0.9 }));
        for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.16) {
          const h = 0.8 + random() * 0.7, turn: P3 = [0, random() * Math.PI, (random() - 0.5) * 1.2];
          const half = new THREE.Vector3(0, h * 0.5, 0).applyEuler(new THREE.Euler(...turn));
          hedgeSpots.push({ at: [x + half.x, 0.12 + half.y, z + (random() - 0.5) * 0.4 + half.z], scale: [0.09, h * 0.5, 0.015], turn, color: pick(['#6f9c3a', '#86b547', '#5a8a30', '#9ac25a'].map(lively)) });
        }
      }
      instanced(s.root, new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.6, side: THREE.DoubleSide }), hedgeSpots);
    }

    // Kelp lampposts: a thick stalk that crooks over and hangs a glowing anemone lantern.
    const kelpPaint = s.material(lively('#5f8f34'), { roughness: 0.7 });
    const holdfast = s.material(lively('#4a6628'), { roughness: 0.85 });
    const bulbTint = pick(['#ff4f8f', '#ff8a2e', '#ff5ac0', '#2fd0ff']);
    const bulbPaint = new THREE.MeshStandardMaterial({ color: bulbTint, emissive: bulbTint, emissiveIntensity: mix(0.8, 2.4, lampOn), roughness: 0.4 });
    const tipPaint = new THREE.MeshStandardMaterial({ color: '#fff0f6', emissive: '#ffe0f0', emissiveIntensity: mix(0.4, 2.4, lampOn), roughness: 0.3 });
    const lampSpots: [number, number, number][] = [[-1.95, hedgeZ + 0.05, 1], [1.95, hedgeZ + 0.05, -1], [-6.4, 4.75, 1], [6.6, 4.75, -1]];
    const lampCount = 2 + Math.round(mood.density * 2);
    const tips: Spot[] = [], blades: Spot[] = [];
    for (const [x, z, toward] of lampSpots.slice(0, lampCount)) {
      const h = 3.2 + random() * 0.4;
      const reach = 0.7 * toward;
      const stalk: P3[] = [[x, 0, z], [x + 0.06, h * 0.3, z], [x - 0.05, h * 0.6, z], [x, h * 0.88, z], [x + reach * 0.25, h + 0.22, z], [x + reach * 0.7, h + 0.25, z], [x + reach, h + 0.02, z]];
      s.tube(stalk, 0.1, kelpPaint);
      s.lathe([[0, 0], [0.32, 0], [0.26, 0.08], [0.12, 0.18], [0, 0.18]], holdfast, [x, 0, z]);
      for (let i = 0; i < 4; i++) {
        const p = stalk[1 + Math.min(i, 2)];
        const side = i % 2 ? 1 : -1;
        blades.push({ at: [p[0] + side * 0.3, p[1] + 0.2 + i * 0.25, p[2]], scale: [0.36, 0.09, 0.016], turn: [0, random() * 0.8 - 0.4, side * -0.45], color: lively(pick(['#8cbd4a', '#79ad3e'])) });
      }
      // The lantern: a cup, then the glowing anemone body with luminous tentacle tips around it.
      const hang: P3 = [x + reach, h - 0.12, z];
      s.rod([x + reach, h + 0.04, z], [hang[0], hang[1] - 0.06, z], 0.035, holdfast);
      s.lathe([[0, 0], [0.16, 0], [0.24, 0.1], [0.18, 0.18], [0, 0.16]], holdfast, [hang[0], hang[1] - 0.06, hang[2]]).rotation.x = Math.PI;
      s.ball([0.32, 0.28, 0.32], [hang[0], hang[1] - 0.34, hang[2]], bulbPaint, 18).castShadow = false;
      for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        tips.push({ at: [hang[0] + Math.sin(angle) * 0.3, hang[1] - 0.58 - Math.sin(i * 1.7) * 0.06, hang[2] + Math.cos(angle) * 0.3], scale: [0.06, 0.085, 0.06] });
      }
    }
    instanced(s.root, new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.6, side: THREE.DoubleSide }), blades);
    instanced(s.root, new THREE.SphereGeometry(1, 7, 5), tipPaint, tips, false);

    // The neighbours' houses, set back on their lots behind the side slots and the hero.
    const door = (h: Sculpture, at: P3, w: number, tall: number, colour: string, turn = 0) => {
      const group = new THREE.Group();
      group.position.set(...at);
      group.rotation.y = turn;
      h.root.add(group);
      const paint = h.material(colour, { roughness: 0.6 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, tall, 0.1), paint);
      slab.position.y = tall / 2;
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, 0.1, 18), paint);
      arch.rotation.x = Math.PI / 2;
      arch.position.y = tall;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), h.material('#d9b14a', { metalness: 0.7, roughness: 0.3 }));
      knob.position.set(w * 0.3, tall * 0.5, 0.07);
      for (const mesh of [slab, arch, knob]) { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
    };
    const porthole = (h: Sculpture, at: P3, r: number, turn = 0) => {
      const group = new THREE.Group();
      group.position.set(...at);
      group.rotation.y = turn;
      h.root.add(group);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.2, 8, 24), h.material('#d9b14a', { metalness: 0.7, roughness: 0.3 }));
      const pane = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 20), lampOn > 0.3
        ? new THREE.MeshStandardMaterial({ color: '#ffe3a0', emissive: '#ffb347', emissiveIntensity: 1.4 * lampOn })
        : h.material('#9fd6ee', { roughness: 0.2, metalness: 0.2 }));
      pane.position.z = -0.01;
      ring.castShadow = true;
      group.add(ring, pane);
    };
    const settle = (h: Sculpture, x: number, z: number, turn: number) => {
      h.root.position.set(x, 0, z);
      h.root.rotation.y = turn;
      s.root.add(h.root);
    };
    const moai = (x: number, z: number, turn: number) => {
      const h = new Sculpture(context);
      const stone = h.material('#7a8088', { roughness: 0.9, flatShading: true });
      h.box([2, 0.5, 1.5], [0, 0.25, 0], stone);
      h.ball([1.05, 2.1, 0.95], [0, 2.4, 0], stone, 10);
      h.box([0.44, 1.4, 0.5], [0, 2.35, 0.8], stone);
      h.box([1.45, 0.3, 0.5], [0, 3.35, 0.75], stone);
      h.box([0.85, 0.22, 0.4], [0, 1.4, 0.86], stone);
      for (const sx of [-1, 1]) h.box([0.22, 0.85, 0.3], [sx * 0.96, 2.25, 0.1], stone);
      door(h, [0, 0.5, 0.78], 0.62, 0.85, '#2f6fd6');
      for (const sx of [-1, 1]) porthole(h, [sx * 0.5, 2.9, 0.9], 0.2);
      settle(h, x, z, turn);
    };
    const boot = (x: number, z: number, turn: number) => {
      const h = new Sculpture(context);
      const leather = h.material('#8a5a32', { roughness: 0.8 });
      const dark = h.material('#4a3220', { roughness: 0.9 });
      h.box([1.6, 0.2, 2.7], [0, 0.1, 0.3], dark);
      h.box([1.5, 1.0, 2.4], [0, 0.7, 0.3], leather);
      h.ball([0.78, 0.56, 0.85], [0, 0.75, 1.45], leather, 12);
      h.cylinder(0.7, 0.78, 2.5, [0, 2.4, -0.35], leather, 18);
      h.ball([0.74, 0.24, 0.74], [0, 3.65, -0.35], dark, 12);
      const lace = h.material('#f0ead8', { roughness: 0.8 });
      for (let i = 0; i < 4; i++) h.box([0.6, 0.06, 0.06], [0, 1.35 + i * 0.38, 0.4 - i * 0.03], lace).rotation.z = i % 2 ? 0.35 : -0.35;
      door(h, [0, 0.2, 1.62], 0.58, 0.72, '#d94a3a');
      porthole(h, [0, 2.6, 0.38], 0.22);
      h.cylinder(0.12, 0.12, 0.5, [0.35, 3.9, -0.55], h.material('#6d6f73', { metalness: 0.4 }), 10);
      settle(h, x, z, turn);
    };
    const shellHouse = (x: number, z: number, turn: number, tint: string) => {
      const h = new Sculpture(context);
      const pink = h.material(lively(tint), { roughness: 0.55 });
      h.lathe([[0, 0], [1.05, 0.05], [1.3, 0.7], [1.2, 1.5], [0.86, 2.3], [0.48, 2.9], [0.2, 3.4], [0, 3.6]], pink);
      const ridge = h.material(lively('#e08a6a'), { roughness: 0.7 });
      for (const [r, y] of [[1.28, 0.9], [1.13, 1.65], [0.75, 2.45], [0.38, 3.05]] as const) h.ring(r, 0.05, [0, y, 0], ridge).rotation.x = Math.PI / 2;
      h.cylinder(1.25, 1.45, 0.3, [0, 0.15, 0], ridge, 20);
      door(h, [0, 0.3, 1.25], 0.66, 0.95, '#4aa3d6');
      porthole(h, [0.62, 1.9, 1.04], 0.19, 0.55);
      settle(h, x, z, turn);
    };
    const canHouse = (x: number, z: number, turn: number) => {
      const h = new Sculpture(context);
      const tin = h.material('#c9ccd0', { metalness: 0.6, roughness: 0.4 });
      h.cylinder(1, 1, 2.9, [0, 1.45, 0], tin, 24);
      h.cylinder(1.03, 1.03, 1.4, [0, 1.55, 0], h.material(lively('#d9402e'), { roughness: 0.6 }), 24);
      h.ring(1.03, 0.05, [0, 2.88, 0], tin).rotation.x = Math.PI / 2;
      h.cylinder(1.03, 1.03, 0.05, [0.3, 3.0, -0.4], tin, 24).rotation.set(0.35, 0, 0.2);
      h.label(pick(['BEANS', 'SOUP', 'PEAS']), 1.2, 0.46, [0, 1.6, 1.04], '#f6f1e2', lively('#d9402e'));
      door(h, [0.55, 0, 0.86], 0.6, 0.85, '#2f6fd6', 0.6);
      porthole(h, [-0.45, 2.35, 0.93], 0.18, -0.45);
      settle(h, x, z, turn);
    };
    const vacant = (x: number, z: number, turn: number) => {
      const h = new Sculpture(context);
      h.cylinder(0.03, 0.04, 1.4, [0, 0.7, 0], h.material('#8a6a45'), 8);
      h.label('FOR SALE', 1.2, 0.5, [0, 1.5, 0.03], '#b5301f', '#f1ead6');
      h.lathe([[0, 0.02], [0.5, 0.02], [0.8, 0.3], [1.3, 0.1], [1.5, 0]], h.material(water.sand, { roughness: 1 }), [1.4, 0, -0.6]);
      h.cylinder(0.45, 0.45, 0.04, [1.4, 0.03, -0.6], h.material('#4a3e30'), 16).castShadow = false;
      h.rod([1.9, 0, -0.2], [2.3, 1.1, -0.5], 0.03, h.material('#8a6a45'));
      h.box([0.3, 0.38, 0.04], [1.88, 0.18, -0.18], h.material('#9aa0a6', { metalness: 0.5 }));
      settle(h, x, z, turn);
    };
    const lots: [number, number, number][] = [[-5.6, -3.9, 0.3], [5.7, -4.1, -0.35], [-3.2, -4.9, 0.15], [3.4, -5.0, -0.15]];
    if (a.neighbours === 'classic') { moai(...lots[0]); boot(...lots[1]); }
    if (a.neighbours === 'shells') { shellHouse(...lots[0], '#f2b6a6'); shellHouse(...lots[1], '#f6d9c4'); shellHouse(-3.4, -5.2, 0.15, '#e9a8b8'); }
    if (a.neighbours === 'mixed') { moai(...lots[0]); boot(...lots[1]); shellHouse(...lots[2], '#f2b6a6'); canHouse(...lots[3]); }
    if (a.neighbours === 'vacant') { vacant(...lots[0]); vacant(...lots[1]); vacant(-2.6, -5.0, 0.2); }

    // Bubble columns rising out of little vents in the sand.
    const columns = { none: 0, one: 1, few: 3, many: 6 }[a.bubbles];
    const vents: [number, number][] = [[-2.9, -2.9], [7.0, -2.2], [-7.0, -1.8], [2.6, -3.3], [-1.2, 5.7], [6.9, 5.8]];
    const bubbleSeeds: { x: number; z: number; phase: number; size: number; angle: number }[] = [];
    const ventSpots: Spot[] = [], holeSpots: Spot[] = [];
    for (const [x, z] of vents.slice(0, columns)) {
      ventSpots.push({ at: [x, 0, z], scale: [1, 1, 1] });
      holeSpots.push({ at: [x, 0.13, z], scale: [1, 1, 1] });
      for (let i = 0; i < 22; i++) bubbleSeeds.push({ x, z, phase: random(), size: 0.09 + random() * 0.13, angle: random() * Math.PI * 2 });
    }
    if (columns) {
      instanced(s.root, new THREE.LatheGeometry([[0, 0.14], [0.16, 0.14], [0.3, 0.2], [0.6, 0.06], [0.75, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 18), s.material(new THREE.Color(water.sand).multiplyScalar(0.9).getStyle(), { roughness: 1 }), ventSpots);
      instanced(s.root, new THREE.CircleGeometry(0.17, 14).rotateX(-Math.PI / 2), s.material('#3a3230'), holeSpots, false);
    }
    const bubblePaint = new THREE.MeshStandardMaterial({ color: '#eefaff', emissive: '#cfefff', emissiveIntensity: 0.35, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false });
    const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), bubblePaint, Math.max(1, bubbleSeeds.length));
    bubbles.count = bubbleSeeds.length;
    bubbles.castShadow = false;
    s.root.add(bubbles);
    const matrix = new THREE.Matrix4();
    const poseBubbles = (time: number) => {
      for (const [i, b] of bubbleSeeds.entries()) {
        const t = (b.phase + time * speed * 0.08) % 1;
        const r = 0.05 + t * 0.45;
        const grow = b.size * (0.6 + t * 0.8);
        matrix.makeScale(grow, grow * 0.9, grow).setPosition(b.x + Math.sin(b.angle + time * 0.8 + t * 6) * r, 0.2 + t * 7.5, b.z + Math.cos(b.angle + time * 0.8 + t * 6) * r);
        bubbles.setMatrixAt(i, matrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
    };
    poseBubbles(0);

    // Dressing: sea flowers in the lots, starfish on the sand, litter if the place is run down.
    const flowerTints = ['#ff6b8a', '#ffa43b', '#b35cff', '#3fd3c8', '#ffe14a'].map(lively);
    const clear = (x: number, z: number) => slots.every(([sx, sz], i) => Math.hypot(sx - x, sz - z) > (i === 0 ? 2.5 : 1.7));
    const flowers: Spot[] = [], flowerTops: Spot[] = [];
    for (let i = 0; i < Math.round(mix(10, 34, mood.density)); i++) {
      const x = (random() - 0.5) * (W - 1), z = -3.6 + random() * 4.2;
      if (!clear(x, z) || Math.abs(z - hedgeZ) < 0.6) continue;
      const h = 0.25 + random() * 0.35, colour = pick(flowerTints);
      flowers.push({ at: [x, h / 2, z], scale: [0.06, h, 0.06], color: '#6f9c3a' });
      flowerTops.push({ at: [x, h, z], scale: [0.11, 0.07, 0.11], color: colour });
    }
    if (flowers.length) {
      instanced(s.root, new THREE.CylinderGeometry(1, 1, 1, 6), s.material('#ffffff'), flowers);
      instanced(s.root, new THREE.SphereGeometry(1, 10, 6), new THREE.MeshStandardMaterial({ roughness: 0.6, emissive: '#ffffff', emissiveIntensity: mix(0, 0.15, mood.cheer) }), flowerTops);
    }
    const starGeometry = (() => {
      const positions: number[] = [];
      for (let i = 0; i < 5; i++) {
        const a0 = i / 5 * Math.PI * 2, a1 = (i + 0.5) / 5 * Math.PI * 2, a2 = (i - 0.5) / 5 * Math.PI * 2;
        positions.push(0, 0.1, 0, Math.sin(a2) * 0.38, 0, Math.cos(a2) * 0.38, Math.sin(a0), 0, Math.cos(a0));
        positions.push(0, 0.1, 0, Math.sin(a0), 0, Math.cos(a0), Math.sin(a1) * 0.38, 0, Math.cos(a1) * 0.38);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.computeVertexNormals();
      return geometry;
    })();
    const stars: Spot[] = [];
    for (let i = 0; i < Math.round(mix(2, 7, mood.density)); i++) {
      const size = 0.24 + random() * 0.14;
      stars.push({ at: [(random() - 0.5) * (W - 1), 0.04, pick([laneZ - 1.5, laneZ + 1.6, 5.8]) + random() * 0.3], scale: [size, size, size], turn: [0, random() * Math.PI, 0], color: pick(['#ff7a3a', '#ff4f8b', '#b05cff', '#ffb347']) });
    }
    instanced(s.root, starGeometry, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), stars);
    if (mood.wear > 0.5) {
      const tin = s.material('#9aa0a3', { metalness: 0.6, roughness: 0.5 });
      for (let i = 0; i < 3; i++) s.cylinder(0.12, 0.12, 0.32, [(random() - 0.5) * 12, 0.12, pick([laneZ - 0.6, laneZ + 0.8, 5.6])], tin, 12).rotation.set(Math.PI / 2, 0, random() * Math.PI);
      s.ring(0.5, 0.14, [-6.2, 0.14, 5.9], s.material('#2a2a2c', { roughness: 0.9 })).rotation.x = Math.PI / 2;
    }

    // The corner street sign.
    const post = s.material('#3a4650', { metalness: 0.5, roughness: 0.5 });
    const signX = -5.2, signZ = 4.6;
    s.cylinder(0.045, 0.055, 2.7, [signX, 1.35, signZ], post, 10);
    s.ball([0.07, 0.07, 0.07], [signX, 2.72, signZ], post, 8);
    const text = { conch: 'CONCH ST', pineapple: 'PINEAPPLE LN', dollar: 'SAND DOLLAR RD', end: 'DEAD END' }[a.sign];
    const plate = a.sign === 'end' ? '#e0b81e' : '#1f7a45', ink = a.sign === 'end' ? '#222222' : '#ffffff';
    s.box([1.5, 0.34, 0.05], [signX + 0.62, 2.45, signZ], post);
    s.label(text, 1.44, 0.29, [signX + 0.62, 2.45, signZ + 0.03], ink, plate);
    s.label(text, 1.44, 0.29, [signX + 0.62, 2.45, signZ - 0.03], ink, plate).rotation.y = Math.PI;

    // Something passing by.
    const fishSeeds: { r: number; phase: number; y: number; size: number }[] = [];
    let fish: THREE.InstancedMesh | null = null;
    let jelly: THREE.Group | null = null;
    let snail: THREE.Group | null = null;
    const poseFish = (time: number) => {
      if (!fish) return;
      for (const [i, f] of fishSeeds.entries()) {
        const angle = f.phase + time * 0.5 * speed;
        matrix.makeRotationY(-angle).setPosition(-3.6 + Math.cos(angle) * f.r * 1.5, f.y + Math.sin(time * 1.6 + i) * 0.15, -1.6 + Math.sin(angle) * f.r);
        matrix.scale(new THREE.Vector3(f.size, f.size, f.size));
        fish.setMatrixAt(i, matrix);
      }
      fish.instanceMatrix.needsUpdate = true;
    };
    if (a.passing === 'school') {
      const body = new THREE.SphereGeometry(1, 10, 6);
      body.scale(0.24, 0.15, 0.08);
      body.rotateY(Math.PI / 2);
      const tail = new THREE.ConeGeometry(0.11, 0.16, 4);
      tail.rotateX(-Math.PI / 2);
      tail.translate(0, 0, -0.29);
      const merged = new THREE.BufferGeometry();
      const parts = [body.toNonIndexed(), tail.toNonIndexed()];
      const total = parts.reduce((sum, g) => sum + g.attributes.position.count, 0);
      const positions = new Float32Array(total * 3);
      let offset = 0;
      for (const g of parts) { positions.set(g.attributes.position.array as Float32Array, offset); offset += g.attributes.position.count * 3; g.dispose(); }
      body.dispose(); tail.dispose();
      merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      merged.computeVertexNormals();
      fish = new THREE.InstancedMesh(merged, s.material(lively('#ffd23a'), { roughness: 0.5, emissive: '#ffb000', emissiveIntensity: 0.1 }), 16);
      for (let i = 0; i < 16; i++) fishSeeds.push({ r: 1.4 + random() * 1.4, phase: random() * Math.PI * 2, y: 4 + random() * 1.2, size: 0.9 + random() * 0.5 });
      fish.castShadow = true;
      s.root.add(fish);
      poseFish(0);
    }
    if (a.passing === 'jelly') {
      jelly = new THREE.Group();
      const glow = new THREE.MeshStandardMaterial({ color: '#ff9ac4', emissive: '#ff7ab0', emissiveIntensity: mix(0.5, 1.4, lampOn), transparent: true, opacity: 0.85, roughness: 0.3 });
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow);
      bell.castShadow = true;
      jelly.add(bell);
      for (let i = 0; i < 9; i++) {
        const angle = i / 9 * Math.PI * 2;
        const points = Array.from({ length: 5 }, (_, k) => new THREE.Vector3(Math.sin(angle) * 0.38 + Math.sin(k + i) * 0.08, -k * 0.38, Math.cos(angle) * 0.38 + Math.cos(k * 1.3 + i) * 0.08));
        jelly.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.022, 5), glow));
      }
      jelly.position.set(-4.4, 4.2, 0.4);
      s.root.add(jelly);
    }
    if (a.passing === 'snail') {
      snail = new THREE.Group();
      const skin = s.material(lively('#5bc3e8'), { roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skin);
      body.scale.set(0.6, 0.26, 0.32);
      body.position.set(0, 0.22, 0);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 10), s.material(lively('#f08ab0'), { roughness: 0.5 }));
      shell.position.set(-0.12, 0.6, 0);
      shell.scale.set(1, 1, 0.75);
      const spiral = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 20, Math.PI * 1.6), s.material('#c2567e'));
      spiral.position.set(-0.12, 0.6, 0.31);
      for (const sz of [-1, 1]) {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 6), skin);
        stalk.position.set(0.52, 0.52, sz * 0.1);
        stalk.rotation.z = -0.5;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), s.material('#f7f4ec'));
        eye.position.set(0.63, 0.71, sz * 0.1);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), s.material('#1c1818'));
        pupil.position.set(0.69, 0.72, sz * 0.1);
        snail.add(stalk, eye, pupil);
      }
      for (const part of [body, shell, spiral]) part.castShadow = true;
      snail.add(body, shell, spiral);
      snail.position.set(5.6, 0, laneZ + 0.3);
      snail.rotation.y = Math.PI;
      s.root.add(snail);
    }

    world.update = (_dt, time) => {
      poseBubbles(time);
      poseFish(time);
      ripple.offset.set(Math.sin(time * 0.15 * speed) * 0.03, time * 0.012 * speed);
      bulbPaint.emissiveIntensity = mix(0.8, 2.4, lampOn) * (1 + Math.sin(time * 2.4 * speed) * 0.08);
      shafts.forEach((shaft, i) => { (shaft.material as THREE.MeshBasicMaterial).opacity = (0.08 + noon * 0.14) * (0.8 + Math.sin(time * 0.6 * speed + i) * 0.2); });
      for (const k of sway) k.group.rotation.z = Math.sin(time * 0.7 * speed + k.phase) * 0.05 * speed;
      if (jelly) {
        jelly.position.y = 4.2 + Math.sin(time * 0.9 * speed) * 0.35;
        jelly.position.x = -4.4 + Math.sin(time * 0.3 * speed) * 0.8;
        jelly.rotation.z = Math.sin(time * 0.7) * 0.12;
      }
      if (snail) snail.position.x = 5.6 - ((time * 0.08 * speed) % 11);
    };
    return world;
  },
});
