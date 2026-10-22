import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

// Standing places on the shelf: x, z, tallest and widest a guest may be. The hero stands on the point, against the star.
const SLOTS: readonly (readonly [number, number, number, number])[] = [[0, -3, 8, 3.8], [-6, 0.8, 4.4, 2.4], [6.1, 1.4, 4.6, 2.4], [-3.2, 7.6, 2.6, 1.7], [3.7, 8.6, 2.4, 1.6]];
const TINTS = {
  orange: { say: 'Furnace orange: the classic ember dusk.', top: '#6b3140', mid: '#c25a3c', low: '#f2a765', sun: ['#ffe0a8', '#ff9d4a', '#e2582a'] },
  crimson: { say: 'Deep blood red, heavy and close.', top: '#4a2233', mid: '#a03a3a', low: '#e2795a', sun: ['#ffb48a', '#f0563a', '#b02a26'] },
  gold: { say: 'Pale brass and gold, a bleaching glare.', top: '#7a4a48', mid: '#d08a4e', low: '#f7cf8a', sun: ['#fff3d0', '#ffc870', '#f08a3a'] },
  magenta: { say: 'Bruised magenta and rose, alien and beautiful.', top: '#4a2a5a', mid: '#b04a78', low: '#f09a8a', sun: ['#ffd0c8', '#ff7a9a', '#c83a7a'] },
} as const;
const EDGE: readonly (readonly [number, number])[] = [[-9.5, 0.5], [-8, 3.4], [-5, 5.6], [-2, 6.8], [2, 8.6], [6, 11.5], [10, 16.5], [14, 26], [36, 26]];
const halfWidth = (z: number) => {
  for (let i = 0; i < EDGE.length - 1; i++) if (z <= EDGE[i + 1][0]) return mix(EDGE[i][1], EDGE[i + 1][1], THREE.MathUtils.clamp((z - EDGE[i][0]) / (EDGE[i + 1][0] - EDGE[i][0]), 0, 1));
  return 26;
};

export default defineWorld({
  questions: {
    star: choice('How does the star hang over the sea?', {
      swollen: 'Swollen and enormous, most of its disc above the horizon, filling the sky behind the subject.',
      dome: 'Half sunk: a vast glowing dome on the horizon line.',
      coin: 'Smaller and harder, a clear bright coin sitting just above the sea.',
      veiled: 'Huge but veiled behind bars of cloud, more glow than disc.',
    }),
    tint: choice('What colour is the light?', Object.fromEntries(Object.entries(TINTS).map(([k, v]) => [k, v.say])) as Record<keyof typeof TINTS, string>),
    sea: choice('What is the magma sea doing?', {
      crusted: 'Skinned over with dark plates, light showing in the seams between.',
      molten: 'Open and bright, a slow incandescent swell.',
      rafts: 'Bright, with black rafts of rock drifting past.',
      fountains: 'Restless: jets of lava bursting up out in the sea.',
    }),
    tide: score('How high does the lava stand against the shelf?', ['Far below the lip', 'Halfway up the cliff', 'Lapping over the edge and pooling on the rock']),
    shelf: choice('What is the basalt shelf like underfoot?', {
      glass: 'Smooth black volcanic glass with pale reflections.',
      columns: 'The flat tops of hexagonal columns, a natural pavement.',
      ropy: 'Ropy folds of old flow, like wrinkled skin.',
      plates: 'Broken plates with light glowing up through every crack.',
    }),
    sky: choice('What is falling from the silicate clouds?', {
      drizzle: 'A thin drizzle of sparks, almost gentle.',
      sparks: 'A hard rain of bright sparks slanting down.',
      ash: 'Grey ash, drifting like snow.',
      nothing: 'Nothing: the clouds only hang there in bars.',
    }),
    horizon: choice('What breaks the horizon?', {
      bare: 'Nothing but sea and star.',
      stacks: 'Black sea stacks of basalt standing in the lava.',
      cones: 'A chain of far volcanic cones, smoking.',
      wall: 'A jagged wall of mountains, the edge of the night side.',
    }),
    traces: choice('What has someone left on the shelf?', {
      none: 'Nothing. Nobody has stood here.',
      fence: 'A line of survey stakes and cable along the edge.',
      cairns: 'Small cairns of stacked stones.',
      shelter: 'A tiny mirrored heat shelter, lamp still on.',
      beacon: 'A thin beacon mast with a blinking light.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tint = TINTS[a.tint];
    const hex = (c: THREE.Color) => '#' + c.getHexString();
    const tone = (colour: string) => {
      const c = new THREE.Color(colour).lerp(new THREE.Color(mood.warmth < 0.5 ? '#5a4a7a' : '#a8401c'), Math.abs(mood.warmth - 0.5) * 0.3);
      return c.lerp(new THREE.Color('#ffffff'), (mood.cheer - 0.5) * 0.14 * (mood.cheer > 0.5 ? 1 : 0)).multiplyScalar(mix(0.86, 1, Math.min(1, mood.cheer * 2)));
    };
    const skyTop = tone(tint.top), skyMid = tone(tint.mid), skyLow = tone(tint.low);
    if (a.sky === 'ash') for (const c of [skyTop, skyMid, skyLow]) c.lerp(new THREE.Color('#8d8380'), 0.35);
    const flat = (colour: THREE.ColorRepresentation, extra: THREE.MeshBasicMaterialParameters = {}) => new THREE.MeshBasicMaterial({ color: colour, toneMapped: false, ...extra });
    const add = <T extends THREE.Object3D>(node: T, at: readonly [number, number, number] = [0, 0, 0]) => { node.position.set(...at); root.add(node); return node; };
    const textures: THREE.Texture[] = [];
    const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = false) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      if (repeat) map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      textures.push(map);
      return map;
    };
    const seaLevel = mix(-2.7, -0.22, a.tide);
    const cameraAt = new THREE.Vector3((random() - 0.5) * 2.4, 4.6, 27);
    const sunR = { swollen: 85, dome: 112, coin: 40, veiled: 92 }[a.star];
    const sunY = { swollen: 42, dome: 2, coin: 46, veiled: 40 }[a.star];
    const sunX = (mood.daylight - 0.5) * 2 * Math.min(34, sunR * 0.4);

    // Sky backdrop with painted cloud bars.
    const cloudDark = hex(skyTop.clone().multiplyScalar(0.62));
    const skyMap = paint(1024, 512, (ctx) => {
      const wash = ctx.createLinearGradient(0, 512, 0, 0);
      wash.addColorStop(0, hex(skyLow)); wash.addColorStop(0.1, hex(skyLow)); wash.addColorStop(0.22, hex(skyMid)); wash.addColorStop(0.42, hex(skyTop)); wash.addColorStop(1, hex(skyTop));
      ctx.fillStyle = wash; ctx.fillRect(0, 0, 1024, 512);
      const bars = Math.round(mix(5, 14, mood.density)) + (a.star === 'veiled' ? 5 : 0);
      for (let i = 0; i < bars; i++) {
        const x = 300 + random() * 424, y = 512 * (1 - (0.15 + random() * 0.24)), w = 40 + random() * 130, h = 2 + random() * 5;
        ctx.fillStyle = hex(skyLow.clone().lerp(new THREE.Color('#ffffff'), 0.15)); ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.ellipse(x, y + h * 0.7, w * 0.96, h * 0.7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = cloudDark; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    add(new THREE.Mesh(new THREE.PlaneGeometry(1500, 620), flat('#ffffff', { map: skyMap })), [0, 250, -420]).renderOrder = -2;

    // The star: painted disc, corona, a flare loop.
    const [sunBright, sunMid, sunDeep] = tint.sun.map((c) => hex(tone(c)));
    const sunMap = paint(512, 512, (ctx) => {
      const limb = ctx.createRadialGradient(256, 256, 0, 256, 256, 255);
      limb.addColorStop(0, sunBright); limb.addColorStop(0.6, sunMid); limb.addColorStop(0.96, sunDeep); limb.addColorStop(1, sunDeep);
      ctx.fillStyle = limb; ctx.beginPath(); ctx.arc(256, 256, 255, 0, 7); ctx.fill();
      for (let i = 0; i < 500; i++) { const t = random() * 7, d = Math.sqrt(random()) * 245; ctx.globalAlpha = 0.16; ctx.fillStyle = i % 3 ? sunBright : sunDeep; ctx.beginPath(); ctx.arc(256 + Math.cos(t) * d, 256 + Math.sin(t) * d, 3 + random() * 8, 0, 7); ctx.fill(); }
      const spots = 3 + Math.round(mood.wear * 7);
      for (let i = 0; i < spots; i++) {
        const x = 256 + (random() - 0.5) * 330, y = 256 - random() * 190 + 30, r = 6 + random() * 16;
        ctx.globalAlpha = 0.55; ctx.fillStyle = sunDeep; ctx.beginPath(); ctx.ellipse(x, y, r * 1.7, r * 1.3, 0, 0, 7); ctx.fill();
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#3a1412'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.75, 0, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    const sunMaterial = flat('#ffffff', { map: sunMap, transparent: true });
    add(new THREE.Mesh(new THREE.CircleGeometry(sunR, 72), sunMaterial), [sunX, sunY, -400]).renderOrder = -1;
    const corona = flat(sunMid, { transparent: true, opacity: 0.22, depthWrite: false });
    for (const grow of [1.1, 1.25]) add(new THREE.Mesh(new THREE.CircleGeometry(sunR * grow, 64), corona), [sunX, sunY, -402 - grow]).renderOrder = -1.5;
    const flareSide = random() < 0.5 ? -1 : 1, flareAngle = Math.PI / 2 - flareSide * (0.5 + random() * 0.5);
    const flare = add(new THREE.Mesh(new THREE.TorusGeometry(sunR * 0.16, sunR * 0.018, 6, 26, Math.PI), flat(sunBright)), [sunX + Math.cos(flareAngle) * sunR * 0.99, sunY + Math.sin(flareAngle) * sunR * 0.99, -399]);
    flare.rotation.z = flareAngle - Math.PI / 2;
    flare.scale.y = 1.7;
    if (a.star === 'veiled') {
      const veil = flat(cloudDark, { transparent: true, opacity: 0.82 });
      for (let i = 0; i < 6; i++) add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), veil), [sunX + (random() - 0.5) * sunR * 0.8, sunY - sunR * 0.55 + i * sunR * 0.27, -396]).scale.set(sunR * (0.7 + random() * 0.7), sunR * (0.025 + random() * 0.03), 3);
    }

    // The magma sea.
    const lavaHot = hex(tone('#ffb548')), lavaMid = hex(tone('#f8721f')), crustColour = '#43302f';
    const seaMap = paint(512, 512, (ctx) => {
      ctx.fillStyle = a.sea === 'crusted' || a.sea === 'fountains' ? lavaMid : lavaHot; ctx.fillRect(0, 0, 512, 512);
      const blob = (x: number, y: number, r: number, colour: string, alpha: number) => {
        const sides = 6 + Math.floor(random() * 3), turn = random() * 7, lobes = Array.from({ length: sides }, () => 0.7 + random() * 0.45);
        ctx.fillStyle = colour; ctx.globalAlpha = alpha;
        for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
          ctx.beginPath();
          lobes.forEach((lobe, k) => { const t = turn + (k / sides) * Math.PI * 2; ctx[k ? 'lineTo' : 'moveTo'](x + ox + Math.cos(t) * r * lobe, y + oy + Math.sin(t) * r * lobe * 0.8); });
          ctx.closePath(); ctx.fill();
        }
      };
      if (a.sea === 'crusted' || a.sea === 'fountains') {
        for (let i = 0; i < 40; i++) blob(random() * 512, random() * 512, 16 + random() * 16, lavaHot, 0.5);
        for (let gx = 0; gx < 7; gx++) for (let gy = 0; gy < 8; gy++) blob((gx + 0.5 + (random() - 0.5) * 0.7) * 73, (gy + 0.5 + (random() - 0.5) * 0.7) * 64, 30 + random() * 9, crustColour, 1);
      } else {
        for (let i = 0; i < 46; i++) blob(random() * 512, random() * 512, 20 + random() * 40, i % 2 ? lavaMid : hex(tone('#ffd27a')), 0.5);
        for (let i = 0; i < (a.sea === 'rafts' ? 8 : 16); i++) blob(random() * 512, random() * 512, 8 + random() * 14, crustColour, 0.85);
      }
      ctx.globalAlpha = 1;
    }, true);
    seaMap.repeat.set(1500 / 15, 470 / 15);
    const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(1500, 470), flat('#ffffff', { map: seaMap })), [0, seaLevel, -182]);
    sea.rotation.x = -Math.PI / 2;
    // Light from the star lies on the sea as a broken path.
    const pathMap = paint(64, 256, (ctx) => {
      for (let i = 0; i < 90; i++) { const y = random() * 256, w = 8 + random() * 50 * (1 - y / 300); ctx.fillStyle = `rgba(255,255,255,${0.25 + random() * 0.6})`; ctx.fillRect(32 - w / 2 + (random() - 0.5) * 8, y, w, 1 + random() * 2.5); }
    });
    const pathGeometry = new THREE.BufferGeometry();
    const far = sunR * 0.5;
    pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute([sunX - far, 0, -412, sunX + far, 0, -412, -4, 0, -8, 4, 0, -8], 3));
    pathGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
    pathGeometry.setIndex([0, 2, 1, 1, 2, 3]);
    add(new THREE.Mesh(pathGeometry, flat(sunBright, { map: pathMap, transparent: true, opacity: 0.75, depthWrite: false })), [0, seaLevel + 0.04, 0]);
    // Haze where the sea meets the sky.
    const hazeMap = paint(8, 128, (ctx) => { const g = ctx.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, hex(skyLow)); g.addColorStop(0.25, hex(skyLow) + 'cc'); g.addColorStop(1, hex(skyLow) + '00'); ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 128); });
    add(new THREE.Mesh(new THREE.PlaneGeometry(1500, 46), flat('#ffffff', { map: hazeMap, transparent: true, depthWrite: false })), [0, seaLevel + 22, -394]);

    // The basalt shelf: a point of rock running out toward the star.
    const lean = (random() - 0.5) * 0.2, wobble = random() * 20;
    const outline = (grow: number) => {
      const shape = new THREE.Shape();
      const right: [number, number][] = [], left: [number, number][] = [];
      for (let z = 36; z >= -9.5; z -= 0.75) {
        const jag = Math.sin(z * 1.9 + wobble) * 0.35 + Math.sin(z * 0.63 + wobble * 2) * 0.5;
        right.push([halfWidth(z) * (1 + lean) + jag + grow, z]);
        left.push([-halfWidth(z) * (1 - lean) + Math.sin(z * 1.7 + wobble * 3) * 0.4 - grow, z]);
      }
      shape.moveTo(right[0][0], -right[0][1]);
      for (const [x, z] of right) shape.lineTo(x, -z);
      shape.lineTo(0.4, 9.9 + grow);
      shape.lineTo(-0.5, 9.8 + grow);
      for (const [x, z] of left.reverse()) shape.lineTo(x, -z);
      return shape;
    };
    const rockBase = new THREE.Color({ glass: '#3d3842', columns: '#494344', ropy: '#4c3e3d', plates: '#40373a' }[a.shelf]).lerp(new THREE.Color('#6a5a52'), mood.wear * 0.3);
    const tile = 16;
    const rockMap = paint(512, 512, (ctx) => {
      ctx.fillStyle = hex(rockBase); ctx.fillRect(0, 0, 512, 512);
      const shade = (amount: number) => hex(rockBase.clone().multiplyScalar(amount));
      if (a.shelf === 'columns') {
        const r = 32, w = Math.sqrt(3) * r;
        for (let row = -1; row < 12; row++) for (let col = -1; col < 11; col++) {
          const cx = col * w + (row % 2 ? w / 2 : 0), cy = row * r * 1.5;
          ctx.fillStyle = shade(0.82 + random() * 0.4); ctx.strokeStyle = shade(0.5); ctx.lineWidth = 3;
          ctx.beginPath(); for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2 + Math.PI / 6; ctx[k ? 'lineTo' : 'moveTo'](cx + Math.cos(t) * r, cy + Math.sin(t) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      } else if (a.shelf === 'ropy') {
        for (let i = 0; i < 46; i++) { const cx = random() * 512, cy = random() * 512, r0 = 20 + random() * 50, turn = random() * 7; for (let k = 0; k < 7; k++) { ctx.strokeStyle = shade(k % 2 ? 0.7 : 1.25); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r0 + k * 6, turn, turn + 2.2); ctx.stroke(); } }
      } else if (a.shelf === 'glass') {
        for (let i = 0; i < 60; i++) { ctx.fillStyle = shade(i % 2 ? 1.45 : 0.75); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 30 + random() * 80, 2 + random() * 5, -0.3, 0, 7); ctx.fill(); }
      } else {
        for (let i = 0; i < 70; i++) { ctx.fillStyle = shade(0.8 + random() * 0.45); ctx.beginPath(); const x = random() * 512, y = random() * 512; for (let k = 0; k < 6; k++) { const t = (k / 6) * 7 + random(); ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(t) * (26 + random() * 30), y + Math.sin(t) * (26 + random() * 30)); } ctx.closePath(); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }, true);
    const crackMap = paint(512, 512, (ctx) => {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 512, 512);
      const cracks = Math.round((a.shelf === 'plates' ? 22 : 7) + mood.wear * 8);
      ctx.lineCap = 'round';
      for (let i = 0; i < cracks; i++) {
        let x = random() * 512, y = random() * 512, heading = random() * 7;
        const steps = 5 + Math.floor(random() * 8);
        for (const [colour, width] of [['#c8400f', 7], ['#ffb04a', 2.5]] as const) {
          let px = x, py = y, h = heading;
          ctx.strokeStyle = colour; ctx.lineWidth = width * (a.shelf === 'plates' ? 1.2 : 1);
          ctx.beginPath(); ctx.moveTo(px, py);
          for (let k = 0; k < steps; k++) { h += Math.sin(k * 2.3 + i) * 0.9; px += Math.cos(h) * 26; py += Math.sin(h) * 26; ctx.lineTo(px, py); }
          ctx.stroke();
        }
        x += 0; y += 0; heading += 0;
      }
    }, true);
    rockMap.repeat.set(1 / tile, 1 / tile); crackMap.repeat.set(1 / tile, 1 / tile);
    const rock = new THREE.MeshStandardMaterial({ color: '#ffffff', map: rockMap, emissive: '#ffffff', emissiveMap: crackMap, emissiveIntensity: mix(0.7, 1.3, mood.warmth), roughness: a.shelf === 'glass' ? 0.78 : 0.92, metalness: 0 });
    const shelf = add(new THREE.Mesh(new THREE.ExtrudeGeometry(outline(0), { depth: 7, bevelEnabled: false }), rock), [0, -7, 0]);
    shelf.rotation.x = -Math.PI / 2;
    shelf.receiveShadow = true;
    const glowLine = add(new THREE.Mesh(new THREE.ShapeGeometry(outline(0.4)), flat(tone('#ffd98a'))), [0, seaLevel + 0.03, 0]);
    glowLine.rotation.x = -Math.PI / 2;

    // Boulders and glass shards along the edge, kept clear of the standing places.
    const clearOf = (x: number, z: number, margin = 0.6) => SLOTS.every(([sx, sz, , r]) => Math.hypot(x - sx, z - sz) > r + margin);
    const dummy = new THREE.Object3D();
    const boulderGeometry = new THREE.DodecahedronGeometry(1, 0);
    const boulderCount = Math.round(mix(14, 46, mood.density));
    const boulders = new THREE.InstancedMesh(boulderGeometry, new THREE.MeshStandardMaterial({ color: rockBase.clone().multiplyScalar(0.8), roughness: 0.5, flatShading: true }), boulderCount);
    let placed = 0;
    for (let tries = 0; tries < boulderCount * 6 && placed < boulderCount; tries++) {
      const z = mix(-9, 16, random()), side = random() < 0.5 ? -1 : 1, x = side * (halfWidth(z) - 0.3 - random() * random() * 3.5);
      if (!clearOf(x, z) || Math.abs(x) > halfWidth(z) - 0.2) continue;
      const size = 0.18 + random() * random() * 0.75;
      dummy.position.set(x, size * 0.45, z); dummy.rotation.set(random() * 3, random() * 3, random() * 3); dummy.scale.set(size, size * (0.6 + random() * 0.6), size); dummy.updateMatrix();
      boulders.setMatrixAt(placed++, dummy.matrix);
    }
    boulders.count = placed;
    boulders.castShadow = boulders.receiveShadow = true;
    root.add(boulders);
    const glass = new THREE.MeshStandardMaterial({ color: '#2f2b3a', roughness: 0.15, metalness: 0.4, flatShading: true });
    for (const [x, z, h] of [[-6.2, -4.6, 1.1], [6.0, -5.2, 0.8]] as const) {
      const shard = add(new THREE.Mesh(new THREE.ConeGeometry(h * 0.3, h, 5), glass), [x + (random() - 0.5), h * 0.45, z]);
      shard.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);
      shard.castShadow = true;
    }
    // At high tide the lava pools in the low places of the shelf.
    if (a.tide > 0.55) {
      const pool = flat(lavaMid);
      for (const [x, z] of [[-9.3, 8.2], [8.8, 9.3], [0.6, 4.6], [-3.6, -7.2], [3.9, -7.0], [-0.4, 12.6]] as const) {
        if (random() > (a.tide - 0.4) * 1.6) continue;
        const puddle = add(new THREE.Mesh(new THREE.CircleGeometry(1, 9), pool), [x, 0.02, z]);
        puddle.rotation.x = -Math.PI / 2; puddle.rotation.z = random() * 3;
        puddle.scale.set(0.7 + random() * 0.9, 0.5 + random() * 0.6, 1);
      }
    }

    // The horizon.
    const farRock = flat(skyTop.clone().lerp(skyMid, 0.25).multiplyScalar(0.72));
    const jets: { x: number; z: number; h: number; parts: THREE.Mesh[] }[] = [];
    const jet = (x: number, z: number, h: number) => {
      const parts = [0, 1, 2].map((i) => { const part = add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), flat(i ? lavaHot : tone('#fff0b8'))), [x + (random() - 0.5) * h * 0.1, seaLevel + h * (0.3 + i * 0.28), z]); part.scale.set(h * (0.16 - i * 0.04), h * 0.36, h * (0.16 - i * 0.04)); return part; });
      for (let i = 0; i < 5; i++) { const t = random() * 7, d = h * (0.2 + random() * 0.35); add(new THREE.Mesh(new THREE.SphereGeometry(h * 0.045, 6, 5), flat(lavaHot)), [x + Math.cos(t) * d, seaLevel + h * (0.35 + random() * 0.6), z + Math.sin(t) * d * 0.3]); }
      const mound = add(new THREE.Mesh(new THREE.ConeGeometry(h * 0.45, h * 0.22, 7, 1, true), new THREE.MeshStandardMaterial({ color: '#3a2c2e', roughness: 0.9, flatShading: true })), [x, seaLevel + h * 0.1, z]);
      mound.castShadow = false;
      jets.push({ x, z, h, parts });
    };
    if (a.sea === 'fountains') { jet(-17 - random() * 5, -34, 6 + mood.energy * 5); jet(15 + random() * 6, -52, 8 + mood.energy * 6); jet(-34, -95, 13); jet(40, -120, 15); }
    if (a.horizon === 'stacks') {
      const stackMaterial = new THREE.MeshStandardMaterial({ color: rockBase.clone().multiplyScalar(0.7), roughness: 0.7, flatShading: true });
      for (let i = 0; i < 9; i++) {
        const side = i % 2 ? 1 : -1, z = -22 - i * 13 - random() * 8, x = side * (13 + random() * 16 + i * 2.2), h = 6 + random() * 11 + i * 1.2;
        for (let k = 0; k < 2 + Math.floor(random() * 2); k++) {
          const hh = h * (1 - k * 0.3), r = hh * (0.16 + random() * 0.08);
          const stack = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r, hh, 6, 1), stackMaterial), [x + k * r * 1.3 * side, seaLevel + hh / 2 - 0.3, z + (random() - 0.5) * r]);
          stack.rotation.set((random() - 0.5) * 0.12, random() * 3, (random() - 0.5) * 0.12);
        }
      }
    } else if (a.horizon === 'cones') {
      for (let i = 0; i < 4; i++) {
        const side = i % 2 ? 1 : -1, x = sunX + side * (sunR * 0.7 + 50 + i * 55 + random() * 30), h = 16 + random() * 16;
        add(new THREE.Mesh(new THREE.ConeGeometry(h * 1.9, h, 9, 1, true), farRock), [x, seaLevel + h / 2, -372]);
        add(new THREE.Mesh(new THREE.SphereGeometry(h * 0.16, 8, 6), flat(lavaHot)), [x, seaLevel + h, -372]);
        for (let k = 0; k < 6; k++) add(new THREE.Mesh(new THREE.SphereGeometry(h * (0.2 + k * 0.07), 8, 6), flat(cloudDark, { transparent: true, opacity: 0.6 })), [x + k * h * 0.22 * side, seaLevel + h * 1.2 + k * h * 0.3, -373]);
      }
    } else if (a.horizon === 'wall') {
      const skyline = new THREE.Shape();
      const seed = random() * 30;
      skyline.moveTo(-760, -5);
      for (let i = 0; i <= 150; i++) {
        const x = -750 + i * 10, away = Math.min(1, Math.abs(x - sunX) / (sunR * 1.4));
        skyline.lineTo(x, (10 + 26 * Math.abs(Math.sin(i * 0.61 + seed)) + 20 * Math.abs(Math.sin(i * 0.23 + seed * 2)) + random() * 6) * mix(0.3, 1, away));
      }
      skyline.lineTo(760, -5);
      add(new THREE.Mesh(new THREE.ShapeGeometry(skyline), farRock), [0, seaLevel, -397]);
    }

    // Black rafts adrift on an open sea.
    const rafts: { x: number; z: number; size: number; speed: number; spin: number }[] = [];
    let raftMesh: THREE.InstancedMesh | null = null;
    if (a.sea === 'rafts') {
      for (let i = 0; i < 70; i++) { const z = -11 - random() * random() * 150; rafts.push({ x: (random() - 0.5) * (80 + -z), z, size: 0.6 + random() * 2.4, speed: 0.5 + random(), spin: random() * 3 }); }
      for (let i = 0; i < 10; i++) rafts.push({ x: (random() < 0.5 ? -1 : 1) * (halfWidth(2) + 2 + random() * 8), z: -6 + random() * 14, size: 0.5 + random() * 1.2, speed: 0.5 + random(), spin: random() * 3 });
      raftMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1.15, 0.3, 7), new THREE.MeshStandardMaterial({ color: '#3f3132', roughness: 0.9, flatShading: true }), rafts.length);
      root.add(raftMesh);
    }
    const driftRafts = (time: number) => {
      if (!raftMesh) return;
      rafts.forEach((raft, i) => {
        let x = raft.x + time * raft.speed * 0.35;
        const span = 60 + -raft.z * 0.6;
        x = ((x + span) % (2 * span) + 2 * span) % (2 * span) - span;
        if (raft.z > -10 && Math.abs(x) < halfWidth(raft.z) + 1) x = Math.sign(x || 1) * (halfWidth(raft.z) + 1.2);
        dummy.position.set(x, seaLevel + 0.08, raft.z); dummy.rotation.set(0, raft.spin, 0); dummy.scale.set(raft.size, 1, raft.size * 0.75); dummy.updateMatrix();
        raftMesh!.setMatrixAt(i, dummy.matrix);
      });
      raftMesh.instanceMatrix.needsUpdate = true;
    };
    driftRafts(0);

    // What falls from the clouds.
    const falling = a.sky === 'nothing' ? 0 : Math.round({ drizzle: 110, sparks: 420, ash: 320 }[a.sky] * mix(0.7, 1.3, mood.energy));
    const ashy = a.sky === 'ash';
    const motes = Array.from({ length: falling }, () => ({ x: (random() - 0.5) * 70, y: random() * 30, z: 8 - random() * 80, speed: ashy ? 0.6 + random() * 0.8 : 5 + random() * 8, size: ashy ? 0.07 + random() * 0.09 : 0.05 + random() * 0.05, long: ashy ? 1 : 8 + random() * 16 }));
    const slant = ashy ? 0.2 : 0.28;
    const rain = falling ? new THREE.InstancedMesh(ashy ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1, 1, 1), flat(ashy ? '#d9d0c8' : tone('#ffe08a')), falling) : null;
    const fall = (time: number) => {
      if (!rain) return;
      const pace = mix(0.4, 1.4, mood.energy);
      motes.forEach((mote, i) => {
        const y = 30 - ((30 - mote.y + time * mote.speed * pace) % 30);
        dummy.position.set(mote.x + (30 - y) * slant + (ashy ? Math.sin(time * 0.7 + i) * 0.4 : 0), y - 1, mote.z);
        dummy.rotation.set(0, 0, ashy ? i : slant); dummy.scale.set(mote.size, mote.size * mote.long, mote.size); dummy.updateMatrix();
        rain.setMatrixAt(i, dummy.matrix);
      });
      rain.instanceMatrix.needsUpdate = true;
    };
    if (rain) { rain.frustumCulled = false; root.add(rain); fall(random() * 10); }
    // Cloud bars low enough to be seen as solid things.
    for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
      const cloud = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), flat(cloudDark)), [(random() - 0.5) * 420, 70 + random() * 75, -330 - random() * 40]);
      cloud.scale.set(50 + random() * 70, 2.5 + random() * 3, 14);
      const belly = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), flat(skyLow)), [cloud.position.x, cloud.position.y - cloud.scale.y * 0.55, cloud.position.z - 1]);
      belly.scale.set(cloud.scale.x * 0.95, cloud.scale.y * 0.6, 12);
    }

    // Traces of whoever came before.
    const steel = new THREE.MeshStandardMaterial({ color: '#b9b4ac', roughness: 0.4, metalness: 0.5 });
    let lamp: THREE.MeshBasicMaterial | null = null;
    const rod = (from: readonly [number, number, number], to: readonly [number, number, number], radius: number, material: THREE.Material) => {
      const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p);
      const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, d.length(), 6), material), p.clone().addScaledVector(d, 0.5).toArray() as [number, number, number]);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      mesh.castShadow = true;
      return mesh;
    };
    if (a.traces === 'fence') {
      const posts: [number, number, number][] = [];
      for (let z = 5; z >= -8.5; z -= 2.25) posts.push([halfWidth(z) * (1 + lean) - 0.9, 0, z]);
      posts.forEach((post, i) => {
        rod(post, [post[0], 1.1, post[2]], 0.035, steel);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), flat(i % 2 ? '#f2efe6' : '#e8552a')), [post[0] + 0.17, 1.0, post[2]]);
        if (i) rod([posts[i - 1][0], 0.85, posts[i - 1][2]], [post[0], 0.85, post[2]], 0.012, steel);
      });
    } else if (a.traces === 'cairns') {
      const stone = new THREE.MeshStandardMaterial({ color: rockBase.clone().multiplyScalar(1.25), roughness: 0.9, flatShading: true });
      for (const [x, z] of [[3.9, -6.9], [-8.7, 6.4], [9.0, 5.4], [-3.4, -7.4]] as const) {
        let y = 0;
        for (let i = 0; i < 5; i++) { const size = mix(0.42, 0.14, i / 4); const pebble = add(new THREE.Mesh(boulderGeometry, stone), [x + (random() - 0.5) * 0.08, y + size * 0.4, z]); pebble.scale.set(size, size * 0.5, size * 0.9); pebble.rotation.y = random() * 3; pebble.castShadow = true; y += size * 0.75; }
      }
    } else if (a.traces === 'shelter') {
      const dome = add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#e6e9ec', roughness: 0.15, metalness: 0.55, flatShading: true })), [-3.7, 0, -6.7]);
      dome.castShadow = true;
      lamp = flat('#ffe9a8');
      add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), lamp), [-3.3, 0.4, -5.62]).rotation.y = 0.35;
      rod([-2.3, 0, -6.4], [-2.3, 1.7, -6.4], 0.025, steel);
    } else if (a.traces === 'beacon') {
      rod([4.1, 0, -6.9], [4.1, 6.2, -6.9], 0.05, steel);
      for (const [dx, dz] of [[1.6, 0.4], [-1.2, 1.1], [-0.3, -1.5]] as const) rod([4.1, 4.6, -6.9], [4.1 + dx, 0, -6.9 + dz], 0.012, steel);
      lamp = flat('#ff4a3a');
      add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), lamp), [4.1, 6.35, -6.9]);
    }

    // Light: the star behind, lava glow from below, a soft violet fill so faces are not black.
    root.add(new THREE.HemisphereLight(skyLow.clone().lerp(new THREE.Color('#ffffff'), 0.3), new THREE.Color(lavaMid), 0.95));
    const key = new THREE.DirectionalLight(new THREE.Color(sunMid).lerp(new THREE.Color('#ffffff'), 0.35), 2.6);
    key.position.set(sunX * 0.22, 17, -70);
    key.target.position.set(0, 0, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0002;
    const fill = new THREE.DirectionalLight('#e2b8c8', 1.25);
    fill.position.set(cameraAt.x + 9, 12, 34);
    root.add(key, key.target, fill);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1200);
    camera.position.copy(cameraAt);
    const pace = mix(0.3, 1.5, mood.energy);
    return {
      object: root, camera, background: skyLow.clone(), capacity: SLOTS.length, ground: shelf, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          item.holder.scale.setScalar(Math.min(tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05)));
          item.holder.position.set(x, 0, z);
          item.holder.rotation.y = Math.atan2(cameraAt.x - x, cameraAt.z - z) * 0.8 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(0, 4.3, -10);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -24; shadow.right = 24; shadow.bottom = -24; shadow.top = 24;
        shadow.near = 10; shadow.far = 160;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        seaMap.offset.set(time * 0.004 * pace, time * 0.0015 * pace);
        fall(time);
        driftRafts(time * pace);
        for (const j of jets) j.parts.forEach((part, i) => { part.scale.y = j.h * 0.36 * (1 + Math.sin(time * pace * 5 + i * 1.7 + j.x) * 0.22); });
        const beat = 1 + Math.sin(time * pace * 0.8) * 0.06;
        flare.scale.set(beat, 1.7 * beat, 1);
        corona.opacity = 0.22 + Math.sin(time * pace * 0.5) * 0.04;
        rock.emissiveIntensity = mix(0.7, 1.3, mood.warmth) * (1 + Math.sin(time * 0.9) * 0.12);
        if (lamp && a.traces === 'beacon') lamp.color.set(Math.sin(time * 2.2) > 0.3 ? '#ff4a3a' : '#5a1a16');
      },
      dispose() { key.shadow.map?.dispose(); for (const map of textures) map.dispose(); disposeTree(root); },
    };
  },
});
