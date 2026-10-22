import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix, visibleBounds } from '@conjure/kit';

const SIGNS = { outpost: 'OUTPOST', pop: 'POP. 4', services: 'NO SERVICES', home: 'HOME', earth: 'EARTH  >>>', claim: 'CLAIM 17' } as const;
const RADIUS = 9.2;
const SLOTS = [[0.2, 2.8], [-4.6, -0.8], [4.7, 1.9], [-1.5, -2.9, 0, 0.85], [3.0, -3.4, 0, 0.8], [-6.0, 4.2, 0, 0.7]] as const;
/** The wheel tracks cross the plain from front-left to back-right; everything else keeps off them. */
const trackZ = (x: number) => -0.55 * x + 0.49 + 0.98 * Math.sin(x * 0.427);

const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;

function skyTexture(random: () => number, daylight: number, weather: string, horizon: string, rimTone: THREE.Color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  const low = Math.abs(daylight - 0.5) * 2;
  const top = new THREE.Color('#ecd0b4').lerp(new THREE.Color('#beb2ad'), low * 0.8);
  const base = new THREE.Color('#f0cfa6').lerp(new THREE.Color('#d2bfae'), low * 0.7);
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, hex(top));
  gradient.addColorStop(0.3, hex(top.clone().lerp(base, 0.35)));
  gradient.addColorStop(0.8, hex(base));
  gradient.addColorStop(1, hex(base.clone().lerp(new THREE.Color('#ffffff'), weather === 'haze' ? 0.4 : 0.1)));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 320);
  // The sun: small and pale, with a blue halo when it is low.
  const sunX = (0.24 + 0.52 * daylight) * 1024, sunY = 250 - Math.sin(daylight * Math.PI) * 190;
  if (low > 0.35) {
    const strength = (low - 0.35) / 0.65;
    const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 300);
    halo.addColorStop(0, `rgba(205,232,255,${0.95 * strength})`);
    halo.addColorStop(0.18, `rgba(120,172,236,${0.8 * strength})`);
    halo.addColorStop(0.5, `rgba(104,140,200,${0.35 * strength})`);
    halo.addColorStop(1, 'rgba(110,140,190,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 1024, 320);
  } else {
    const glare = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    glare.addColorStop(0, 'rgba(255,250,235,0.85)');
    glare.addColorStop(1, 'rgba(255,240,215,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(0, 0, 1024, 320);
  }
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath(); ctx.arc(sunX, sunY, 11, 0, Math.PI * 2); ctx.fill();
  // Weather on the horizon.
  if (weather === 'storm') {
    const wall = new THREE.Color('#9c6a44').lerp(top, 0.25);
    ctx.fillStyle = hex(wall);
    for (let i = 0; i < 46; i++) {
      const x = random() * 520, reach = 60 + 190 * Math.sin((x / 520) * Math.PI * 0.6 + 0.9) * (0.75 + random() * 0.25);
      ctx.globalAlpha = 0.5 + random() * 0.4;
      ctx.beginPath(); ctx.arc(x, 320 - reach + 40, 40 + random() * 50, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 60, 320 - reach + 40, 120, reach);
    }
    ctx.globalAlpha = 1;
  }
  if (weather === 'devils') {
    for (let i = 0; i < 3; i++) {
      const x = 180 + random() * 660, tall = 50 + random() * 70, lean = (random() - 0.5) * 40;
      ctx.strokeStyle = 'rgba(190,140,95,0.75)';
      ctx.lineWidth = 3 + random() * 4;
      ctx.beginPath(); ctx.moveTo(x, 306); ctx.quadraticCurveTo(x + lean * 0.2, 306 - tall * 0.5, x + lean, 306 - tall); ctx.stroke();
      ctx.fillStyle = 'rgba(245,220,185,0.9)';
      ctx.beginPath(); ctx.ellipse(x, 306, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // A far, hazy second rim behind the modelled one.
  ctx.fillStyle = hex(rimTone.clone().lerp(base, weather === 'haze' ? 0.8 : 0.55));
  ctx.beginPath();
  ctx.moveTo(0, 320);
  for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, 300 - 9 * Math.sin(x * 0.011 + 1) - 5 * Math.sin(x * 0.037) - random() * 2);
  ctx.lineTo(1024, 320);
  ctx.fill();
  void horizon;
  // Dissolve the top and the two ends into the backdrop so the sky has no edge.
  ctx.globalCompositeOperation = 'destination-out';
  for (const [x0, x1] of [[0, 150], [1024, 874]]) {
    const edge = ctx.createLinearGradient(x0, 0, x1, 0);
    edge.addColorStop(0, 'rgba(0,0,0,1)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(Math.min(x0, x1), 0, 150, 320);
  }
  const lid = ctx.createLinearGradient(0, 0, 0, 70);
  lid.addColorStop(0, 'rgba(0,0,0,1)');
  lid.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lid;
  ctx.fillRect(0, 0, 1024, 70);
  ctx.globalCompositeOperation = 'source-over';
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { texture, top };
}

function groundTexture(random: () => number, ground: THREE.Color, wind: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = hex(ground);
  ctx.fillRect(0, 0, 1024, 1024);
  const light = hex(ground.clone().lerp(new THREE.Color('#fbe6c2'), 0.5)), dark = hex(ground.clone().multiplyScalar(0.78));
  for (let i = 0; i < 50; i++) {
    ctx.globalAlpha = 0.1 + random() * 0.12;
    ctx.fillStyle = random() < 0.5 ? light : dark;
    ctx.beginPath(); ctx.ellipse(random() * 1024, random() * 1024, 40 + random() * 130, 20 + random() * 60, wind, 0, Math.PI * 2); ctx.fill();
  }
  // Wind ripples: short parallel crescents, light on one side and dark on the other.
  ctx.lineCap = 'round';
  for (let i = 0; i < 1500; i++) {
    const x = random() * 1024, y = random() * 1024, length = 14 + random() * 36;
    const dx = Math.cos(wind + Math.PI / 2) * length, dy = Math.sin(wind + Math.PI / 2) * length;
    const bow = (random() - 0.5) * 8;
    for (const [shade, shift] of [[light, 0], [dark, 2.2]] as const) {
      ctx.globalAlpha = 0.28 + random() * 0.25;
      ctx.strokeStyle = shade;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - dx / 2 + Math.cos(wind) * shift, y - dy / 2 + Math.sin(wind) * shift);
      ctx.quadraticCurveTo(x + Math.cos(wind) * (bow + shift), y + Math.sin(wind) * (bow + shift), x + dx / 2 + Math.cos(wind) * shift, y + dy / 2 + Math.sin(wind) * shift);
      ctx.stroke();
    }
  }
  for (let i = 0; i < 2600; i++) {
    ctx.globalAlpha = 0.2 + random() * 0.3;
    ctx.fillStyle = random() < 0.6 ? dark : light;
    ctx.fillRect(random() * 1024, random() * 1024, 1 + random() * 2, 1 + random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineWorld({
  questions: {
    marker: choice('What marks the outpost beside the tracks?', {
      signpost: 'A crooked signpost with a hand-painted plank.',
      mailbox: 'A rural mailbox on a post, flag up, absurd and hopeful.',
      flag: 'A tall pole with a sun-bleached flag.',
      cairn: 'A waist-high cairn of dark stones with a reflector on top.',
      beacon: 'A tripod beacon mast with a small solar panel and a lamp.',
    }),
    sign: choice('What is written on the marker?', {
      outpost: 'OUTPOST',
      pop: 'POP. 4',
      services: 'NO SERVICES',
      home: 'HOME',
      earth: 'EARTH  >>>',
      claim: 'CLAIM 17',
    }),
    tracks: choice('What are the wheel tracks like?', {
      fresh: 'One crisp fresh pair, cleat marks sharp.',
      road: 'A worn road of many overlapping passes.',
      faint: 'Faint and half erased by the wind.',
      ends: 'A single pair that simply stops beside the marker.',
    }),
    rocks: choice('What is scattered across the plain?', {
      pebbles: 'A thin scatter of small dark pebbles.',
      blocks: 'Angular dark basalt blocks, fist to chair sized.',
      boulders: 'A field of big rounded boulders casting long shadows.',
      plates: 'Flat pale slabs of cracked bedrock showing through the dust.',
    }),
    horizon: choice('What does the horizon look like?', {
      rim: 'The low smooth wall of a distant crater rim.',
      broken: 'A jagged, broken rim with notches and peaks.',
      mesas: 'Two or three flat-topped mesas.',
      flat: 'Almost nothing: a ruler line with the faintest swell.',
    }),
    weather: choice('What is the weather doing?', {
      clear: 'Clear and still.',
      haze: 'Thick dust haze, the horizon washed out.',
      devils: 'Dust devils wandering in the distance.',
      storm: 'A brown wall of dust storm climbing one side of the sky.',
    }),
    waiting: choice('What sign of waiting for resupply lies by the tracks?', {
      nothing: 'Nothing.',
      crates: 'A neat stack of empty crates and fuel drums ready to be collected.',
      lights: 'A line of little stake lights marking the way in.',
      dropzone: 'A drop zone: a ring of pale stones with a cloth X pegged in the middle.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const { art: s, world } = diorama(context, { floor: null, width: RADIUS * 2, depth: RADIUS * 2, maxHeight: 3.7, radius: 1.75, pitch: 24, yaw: 26, slots: SLOTS });
    const low = Math.abs(mood.daylight - 0.5) * 2;
    const ground = new THREE.Color('#c9925a').lerp(new THREE.Color('#b9643c'), mood.warmth * 0.45).lerp(new THREE.Color('#9a8a82'), low * 0.18);
    const rimTone = ground.clone().lerp(new THREE.Color('#8a5a48'), 0.45);
    const wind = random() * Math.PI;
    const dummy = new THREE.Object3D();

    // Warm the stock lights toward butterscotch.
    for (const child of s.root.children) {
      const light = child as THREE.HemisphereLight;
      if (light.isHemisphereLight) { light.color.set('#ffe9d2'); light.groundColor.set('#a8744f'); light.intensity = mix(1.5, 1.15, low); }
    }

    // Ground disc and sky cyclorama.
    const floor = s.mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, 0.3, 72), new THREE.MeshStandardMaterial({ map: groundTexture(random, ground, wind), roughness: 1 }), [0, -0.15, 0]);
    floor.castShadow = false;
    world.ground = floor;
    const sky = skyTexture(random, mood.daylight, a.weather, a.horizon, rimTone);
    world.background.copy(sky.top);
    const yaw = 26 * Math.PI / 180;
    const cyclorama = s.mesh(new THREE.CylinderGeometry(RADIUS + 0.05, RADIUS + 0.05, 6.4, 64, 1, true, yaw + Math.PI - 1.62, 3.24), new THREE.MeshBasicMaterial({ map: sky.texture, side: THREE.DoubleSide, transparent: true, toneMapped: false }), [0, 3.2, 0]);
    cyclorama.castShadow = cyclorama.receiveShadow = false;

    const free = (x: number, z: number, margin = 0) => {
      if (Math.hypot(x, z) > RADIUS - 0.5) return false;
      if (Math.abs(z - trackZ(x)) < 1.05 + margin) return false;
      return SLOTS.every(([sx, sz, , size = 1]) => Math.hypot(x - sx, z - sz) > 2.0 * size + margin);
    };

    // The modelled rim: low hills ranked along the back edge.
    const rimPaint = new THREE.MeshStandardMaterial({ color: rimTone.clone().lerp(sky.top, a.weather === 'haze' ? 0.65 : 0.42), roughness: 1, flatShading: a.horizon === 'broken' });
    const hills = a.horizon === 'flat' ? 9 : a.horizon === 'mesas' ? 3 : 15;
    for (let i = 0; i < hills; i++) {
      const angle = yaw + Math.PI + (a.horizon === 'mesas' ? [-0.75, 0.1, 0.8][i] + (random() - 0.5) * 0.2 : mix(-1.35, 1.35, (i + random() * 0.6) / hills));
      const r = RADIUS - 1.0 - random() * 0.5;
      const x = Math.sin(angle) * r, z = Math.cos(angle) * r;
      if (a.horizon === 'mesas') {
        const wide = 1.2 + random() * 1.0, tall = 0.7 + random() * 0.6;
        s.mesh(new THREE.CylinderGeometry(wide * 0.8, wide, tall, 9), rimPaint, [x, tall / 2, z]).rotation.y = random();
        s.mesh(new THREE.CylinderGeometry(wide, wide * 1.5, tall * 0.45, 9), rimPaint, [x, tall * 0.22, z]);
      } else if (a.horizon === 'broken') {
        const tall = 0.35 + random() * 0.95;
        const peak = s.mesh(new THREE.ConeGeometry(1.2 + random() * 0.9, tall, 6), rimPaint, [x, tall / 2, z]);
        peak.rotation.y = random() * 3;
        peak.scale.x = 1.9;
        peak.lookAt(0, tall / 2, 0);
      } else {
        const tall = a.horizon === 'flat' ? 0.12 + random() * 0.12 : 0.4 + random() * 0.35 + Math.sin((i / hills) * Math.PI) * 0.35;
        const swell = s.ball([2.6 + random(), tall, 1.0], [x, 0, z], rimPaint, 16);
        swell.rotation.y = angle + Math.PI / 2 + Math.PI / 2;
        swell.castShadow = false;
      }
    }

    // Soft drifts for relief, raised wind ripples that catch a low sun.
    const duneSkin = new THREE.MeshStandardMaterial({ color: ground.clone().lerp(new THREE.Color('#f3d7ac'), 0.18), roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const x = (random() - 0.5) * 15, z = (random() - 0.5) * 15;
      if (!free(x, z, 1.4)) continue;
      const dune = s.ball([1.6 + random() * 1.6, 0.1 + random() * 0.14, 0.7 + random() * 0.6], [x, 0, z], duneSkin, 16);
      dune.rotation.y = -wind;
      dune.castShadow = false;
    }
    const rippleCount = 150;
    const ripples = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), duneSkin, rippleCount);
    for (let i = 0; i < rippleCount; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 6; tries++) { x = (random() - 0.5) * 18; z = (random() - 0.5) * 18; if (Math.hypot(x, z) < RADIUS - 0.8 && Math.abs(z - trackZ(x)) > 0.95) break; }
      if (Math.hypot(x, z) >= RADIUS - 0.8) { x *= 0.4; z *= 0.4; }
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, -wind + Math.PI / 2 + (random() - 0.5) * 0.3, 0);
      dummy.scale.set(0.5 + random() * 0.9, 0.022 + random() * 0.02, 0.07 + random() * 0.05);
      dummy.updateMatrix();
      ripples.setMatrixAt(i, dummy.matrix);
    }
    ripples.receiveShadow = true;
    s.root.add(ripples);

    // Rocks.
    const rockPlan = { pebbles: [150, 0.05, 0.12, 1], blocks: [60, 0.14, 0.42, 1], boulders: [22, 0.28, 0.7, 0.8], plates: [34, 0.4, 1.0, 0.13] }[a.rocks];
    const rockCount = Math.round(rockPlan[0] * mix(0.45, 1.3, mood.density));
    const rocks = new THREE.InstancedMesh(a.rocks === 'boulders' ? new THREE.IcosahedronGeometry(1, 1) : new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), rockCount);
    const rockTones = a.rocks === 'plates' ? ['#c9a988', '#b99578', '#d5b592'] : ['#4b332b', '#3a2c2a', '#5d4034', '#463a38', '#6a4636'];
    for (let i = 0; i < rockCount; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 12; tries++) { x = (random() - 0.5) * 18; z = (random() - 0.5) * 18; if (free(x, z)) break; }
      const size = mix(rockPlan[1], rockPlan[2], random() ** 2);
      const ok = free(x, z);
      dummy.position.set(x, size * rockPlan[3] * 0.35, z);
      dummy.rotation.set(a.rocks === 'plates' ? 0 : random() * 3, random() * 6, a.rocks === 'plates' ? (random() - 0.5) * 0.1 : random() * 3);
      dummy.scale.set(size * (0.8 + random() * 0.5), size * rockPlan[3], size * (0.7 + random() * 0.4)).multiplyScalar(ok ? 1 : 0.0001);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      rocks.setColorAt(i, new THREE.Color(rockTones[Math.floor(random() * rockTones.length)]).lerp(ground, 0.12 + mood.wear * 0.3));
    }
    rocks.castShadow = rocks.receiveShadow = true;
    s.root.add(rocks);

    // Wheel tracks.
    const markerAt: [number, number] = [2.9, 3.7];
    const gauge = 0.62, step = 0.17;
    const passes = a.tracks === 'road' ? [0, 0.42, -0.36] : [0];
    const marks: { matrix: THREE.Matrix4; colour: THREE.Color }[] = [];
    const rut = ground.clone().multiplyScalar(0.68), cleat = ground.clone().multiplyScalar(0.52);
    for (const [index, shift] of passes.entries()) {
      for (let x = -RADIUS; x < RADIUS; x += step * 0.85) {
        if (a.tracks === 'ends' && x > 1.4) break;
        const z = trackZ(x) + shift + (index ? Math.sin(x * 0.8 + index) * 0.2 : 0);
        const heading = Math.atan2(step, (trackZ(x + step) - trackZ(x)));
        const fade = a.tracks === 'faint' ? 0.32 + 0.3 * Math.sin(x * 1.3) : index ? 0.6 : 1 - mood.wear * 0.25;
        for (const side of [-1, 1]) {
          if (random() > fade) continue;
          const px = x + Math.cos(heading) * side * gauge, pz = z - Math.sin(heading) * side * gauge;
          if (Math.hypot(px, pz) > RADIUS - 0.3) continue;
          dummy.position.set(px, 0.006 + index * 0.001, pz);
          dummy.rotation.set(0, heading, 0);
          const isCleat = Math.round(x / step) % 2 === 0;
          dummy.scale.set(isCleat ? 0.36 : 0.3, 1, step * (isCleat ? 0.5 : 1.1));
          dummy.updateMatrix();
          marks.push({ matrix: dummy.matrix.clone(), colour: (isCleat && a.tracks !== 'faint' ? cleat : rut).clone().lerp(ground, a.tracks === 'faint' ? 0.35 : 0) });
        }
      }
    }
    const treads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.012, 1), new THREE.MeshStandardMaterial({ roughness: 1 }), marks.length);
    marks.forEach((mark, i) => { treads.setMatrixAt(i, mark.matrix); treads.setColorAt(i, mark.colour); });
    treads.receiveShadow = true;
    s.root.add(treads);
    if (a.tracks === 'ends') {
      // Where it stopped: two small heaps of pushed sand.
      const x = 1.5, heading = Math.atan2(step, trackZ(x + step) - trackZ(x));
      for (const side of [-1, 1]) s.ball([0.3, 0.12, 0.22], [x + Math.cos(heading) * side * gauge, 0, trackZ(x) - Math.sin(heading) * side * gauge], duneSkin, 10);
    }

    // The outpost marker, beside the hero.
    const [mx, mz] = markerAt;
    const metal = s.material('#9da2a5', { metalness: 0.6, roughness: 0.45 });
    const dusty = (tone: string) => new THREE.Color(tone).lerp(ground, 0.15 + mood.wear * 0.4);
    const paper = hex(dusty('#eadfc6')), ink = '#3a2a22';
    const lean = (random() - 0.5) * (0.12 + mood.wear * 0.3);
    const marker = new THREE.Group();
    marker.position.set(mx, 0, mz);
    marker.rotation.set(0, yaw * 0.6, lean);
    s.root.add(marker);
    const put = <T extends THREE.Object3D>(node: T) => { marker.add(node); return node; };
    const flags: THREE.Mesh[] = [];
    let lamp: THREE.MeshStandardMaterial | null = null;
    if (a.marker === 'signpost') {
      put(s.box([0.12, 2.2, 0.12], [0, 1.1, 0], s.material(dusty('#8a7f72'))));
      put(s.label(SIGNS[a.sign], 1.7, 0.46, [0.15, 1.85, 0.075], ink, paper)).rotation.z = 0.05;
      put(s.box([1.76, 0.52, 0.05], [0.15, 1.85, 0.04], s.material(dusty('#a8967c')))).rotation.z = 0.05;
      const arrow = put(s.box([1.0, 0.24, 0.04], [-0.2, 1.3, 0.05], s.material(dusty('#d9c9a4'))));
      arrow.rotation.z = -0.12;
    } else if (a.marker === 'mailbox') {
      put(s.box([0.1, 1.2, 0.1], [0, 0.6, 0], s.material(dusty('#8a7f72'))));
      put(s.box([0.42, 0.05, 0.75], [0, 1.2, 0.05], s.material(dusty('#8a7f72'))));
      const box = put(s.mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 14, 1, false, -Math.PI / 2, Math.PI), s.material(dusty('#c9ced2'), { metalness: 0.5, roughness: 0.4 }), [0, 1.36, 0.05]));
      box.rotation.x = Math.PI / 2;
      put(s.box([0.4, 0.14, 0.7], [0, 1.29, 0.05], s.material(dusty('#c9ced2'), { metalness: 0.5, roughness: 0.4 })));
      put(s.box([0.03, 0.34, 0.05], [0.215, 1.48, 0.2], s.material('#d63a2a', { emissive: '#d63a2a', emissiveIntensity: 0.2 + mood.cheer * 0.4 })));
      put(s.box([0.03, 0.14, 0.2], [0.215, 1.6, 0.27], s.material('#d63a2a', { emissive: '#d63a2a', emissiveIntensity: 0.2 + mood.cheer * 0.4 })));
      const plate = put(s.label(SIGNS[a.sign], 0.62, 0.17, [0.205, 1.3, 0.05], ink, paper));
      plate.rotation.y = Math.PI / 2;
      const front = put(s.label(SIGNS[a.sign], 1.1, 0.3, [0, 0.75, 0.07], ink, paper));
      front.rotation.z = -0.04;
    } else if (a.marker === 'flag') {
      put(s.cylinder(0.035, 0.05, 3.3, [0, 1.65, 0], metal, 8));
      put(s.ball([0.07, 0.07, 0.07], [0, 3.32, 0], metal, 8));
      const cloth = new THREE.MeshStandardMaterial({ color: dusty(mood.cheer > 0.5 ? '#e2562c' : '#d9d2c2'), side: THREE.DoubleSide, roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.75 - i * 0.03), cloth);
        strip.geometry.translate(0.13, 0, 0);
        strip.castShadow = true;
        (i ? flags[i - 1] : marker).add(strip);
        strip.position.set(i ? 0.26 : 0.04, i ? 0 : 2.85, 0);
        strip.rotation.y = 0.25 * (i % 2 ? -1 : 1);
        flags.push(strip);
      }
      put(s.label(SIGNS[a.sign], 0.8, 0.22, [0, 0.9, 0.06], ink, paper));
    } else if (a.marker === 'cairn') {
      let y = 0;
      for (let i = 0; i < 8; i++) {
        const size = mix(0.55, 0.16, i / 7), thick = 0.13 + random() * 0.08;
        const stone = put(s.mesh(new THREE.DodecahedronGeometry(1, 0), s.material(['#4b332b', '#5d4034', '#3a2c2a'][i % 3], { roughness: 1, flatShading: true }), [(random() - 0.5) * 0.1, y + thick * 0.5, (random() - 0.5) * 0.1]));
        stone.scale.set(size, thick * 0.62, size * 0.85);
        stone.rotation.y = random() * 6;
        y += thick;
      }
      put(s.cylinder(0.02, 0.02, 0.6, [0, y + 0.25, 0], metal, 6));
      const reflector = put(s.mesh(new THREE.CircleGeometry(0.2, 3), new THREE.MeshStandardMaterial({ color: '#f08a1c', emissive: '#f06a10', emissiveIntensity: 0.5 + mood.cheer * 0.6, side: THREE.DoubleSide }), [0, y + 0.6, 0.02]));
      reflector.rotation.z = Math.PI / 2;
      put(s.label(SIGNS[a.sign], 0.8, 0.22, [0, 0.3, 0.52], ink, paper)).rotation.x = -0.5;
    } else {
      for (let i = 0; i < 3; i++) put(s.rod([Math.cos(i * 2.094) * 0.65, 0, Math.sin(i * 2.094) * 0.65], [0, 2.3, 0], 0.03, metal));
      put(s.cylinder(0.03, 0.03, 0.8, [0, 2.6, 0], metal, 6));
      lamp = s.material('#ffcf6a', { emissive: '#ffae2a', emissiveIntensity: 2.2 });
      put(s.ball([0.14, 0.17, 0.14], [0, 3.1, 0], lamp, 12));
      put(s.cylinder(0.17, 0.17, 0.04, [0, 2.95, 0], metal, 12));
      const panel = put(s.box([0.8, 0.03, 0.5], [0.1, 1.9, 0.25], s.material(dusty('#22407c'), { metalness: 0.5, roughness: 0.3 })));
      panel.rotation.x = 0.7;
      put(s.label(SIGNS[a.sign], 0.9, 0.25, [0, 1.25, 0.2], ink, paper)).rotation.x = -0.25;
    }
    // A drift against the marker's foot grows as things wear.
    s.ball([0.7, 0.08 + mood.wear * 0.2, 0.45], [mx - 0.25, 0, mz + 0.1], duneSkin, 10).rotation.y = -wind;

    // Signs of waiting.
    const stakeLamps: THREE.MeshStandardMaterial[] = [];
    if (a.waiting === 'crates') {
      const [cx, cz] = [-3.3, 3.6];
      const paints = [s.material(dusty('#d9d4c6')), s.material(dusty('#e1ab1f')), s.material(dusty('#7d8a92'))];
      const stack = 3 + Math.round(mood.density * 4);
      for (let i = 0; i < stack; i++) {
        const level = i < 4 ? 0 : 1;
        s.box([0.8, 0.6, 0.8], [cx + (i % 2) * 0.86 + (level ? 0.4 : 0) + (random() - 0.5) * 0.06, 0.3 + level * 0.6, cz + (Math.floor(i / 2) % 2) * 0.86 + (random() - 0.5) * 0.06], paints[i % 3]).rotation.y = (random() - 0.5) * 0.15;
      }
      for (let i = 0; i < 3; i++) {
        s.cylinder(0.26, 0.26, 0.8, [cx - 0.9 - (i % 2) * 0.56, 0.4, cz + 0.2 + Math.floor(i / 2) * 0.56], s.material(dusty(i === 1 ? '#c9452e' : '#3f78a6'), { metalness: 0.4, roughness: 0.5 }), 14);
        s.ring(0.262, 0.015, [cx - 0.9 - (i % 2) * 0.56, 0.55, cz + 0.2 + Math.floor(i / 2) * 0.56], metal).rotation.x = Math.PI / 2;
      }
    } else if (a.waiting === 'lights') {
      for (let x = -7.6; x < 8; x += 1.7) {
        const heading = Math.atan2(step, trackZ(x + step) - trackZ(x));
        const px = x + Math.cos(heading) * 1.1, pz = trackZ(x) - Math.sin(heading) * 1.1;
        if (Math.hypot(px, pz) > RADIUS - 0.6 || !SLOTS.every(([sx, sz, , size = 1]) => Math.hypot(px - sx, pz - sz) > 1.2 * size)) continue;
        const glow = s.material('#bfe9ff', { emissive: mood.cheer > 0.5 ? '#ffd27a' : '#8fd8ff', emissiveIntensity: 1.2 + low * 1.5 });
        stakeLamps.push(glow);
        const tilt = (random() - 0.5) * mood.wear * 0.5;
        s.rod([px, 0, pz], [px + tilt * 0.4, 0.42, pz], 0.014, metal);
        s.ball([0.07, 0.07, 0.07], [px + tilt * 0.4, 0.46, pz], glow, 10);
      }
    } else if (a.waiting === 'dropzone') {
      const [cx, cz] = [-3.0, 4.2], r = 1.1;
      const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: dusty('#eee6d6'), roughness: 0.9, flatShading: true }), 22);
      for (let i = 0; i < 22; i++) {
        const angle = (i / 22) * Math.PI * 2;
        dummy.position.set(cx + Math.cos(angle) * r, 0.05, cz + Math.sin(angle) * r);
        dummy.rotation.set(random(), random() * 6, random());
        dummy.scale.setScalar(random() < mood.wear * 0.3 ? 0.0001 : 0.09 + random() * 0.05);
        dummy.updateMatrix();
        stones.setMatrixAt(i, dummy.matrix);
      }
      stones.castShadow = true;
      s.root.add(stones);
      const cloth = s.material(dusty('#e8622a'), { roughness: 0.9 });
      for (const turn of [Math.PI / 4, -Math.PI / 4]) s.box([1.5, 0.014, 0.26], [cx, 0.012, cz], cloth).rotation.y = turn;
      s.box([0.8, 0.12, 0.6], [cx - 0.3, 0.06, cz + 1.7], s.material(dusty('#9a7b4f'))).rotation.y = 0.3;
    }

    // A dust devil in the middle distance when the weather is restless.
    let devil: THREE.Mesh | null = null;
    if (a.weather === 'devils') {
      const tall = 2.6 + random();
      const angle = yaw + Math.PI + (random() - 0.5) * 1.6;
      const profile: [number, number][] = [];
      for (let i = 0; i <= 12; i++) profile.push([0.1 + (i / 12) ** 1.5 * 0.4 + Math.sin(i * 1.7) * 0.03, (i / 12) * tall]);
      devil = s.lathe(profile, new THREE.MeshStandardMaterial({ color: ground.clone().lerp(new THREE.Color('#f3d9b0'), 0.35), roughness: 1, transparent: true, opacity: 0.72, side: THREE.DoubleSide }), [Math.sin(angle) * 6.4, 0, Math.cos(angle) * 6.4]);
      devil.rotation.z = 0.12;
      devil.castShadow = false;
      s.ball([0.5, 0.14, 0.5], [Math.sin(angle) * 6.4, 0, Math.cos(angle) * 6.4], duneSkin, 10);
    }

    // The stock framing fits a square box round the round stage; refit to what is really there.
    const stockPlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      stockPlace(items);
      const camera = world.camera as THREE.OrthographicCamera;
      camera.updateMatrixWorld(true);
      const inverse = camera.matrixWorld.clone().invert();
      const frame = new THREE.Box2(), point = new THREE.Vector3();
      const see = (x: number, y: number, z: number) => { point.set(x, y, z).applyMatrix4(inverse); frame.expandByPoint(new THREE.Vector2(point.x, point.y)); };
      for (let i = 0; i < 48; i++) {
        const angle = (i / 48) * Math.PI * 2;
        see(Math.sin(angle) * RADIUS, -0.3, Math.cos(angle) * RADIUS);
        if (Math.abs(Math.atan2(Math.sin(angle - yaw - Math.PI), Math.cos(angle - yaw - Math.PI))) < 1.3) see(Math.sin(angle) * RADIUS, 5.3, Math.cos(angle) * RADIUS);
      }
      for (const item of items) {
        const box = visibleBounds(item.holder);
        if (box.isEmpty()) continue;
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) see(x, y, z);
      }
      const middle = frame.getCenter(new THREE.Vector2()), size = frame.getSize(new THREE.Vector2());
      const extent = Math.max(size.x, size.y) * 0.52;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    const pace = mix(0.3, 2.4, mood.energy);
    world.update = (_dt, time) => {
      flags.forEach((strip, i) => { strip.rotation.y = Math.sin(time * 2.4 * pace - i * 0.9) * mix(0.15, 0.55, mood.energy) * (i ? 1 : 0.5); });
      if (lamp) lamp.emissiveIntensity = Math.sin(time * 2.2 * pace) > 0.3 ? 2.6 : 0.3;
      if (devil) devil.rotation.y = time * 3 * pace;
      stakeLamps.forEach((glow, i) => { glow.emissiveIntensity = 1.4 + low * 1.5 + Math.sin(time * 1.4 + i) * 0.25; });
    };
    return world;
  },
});
