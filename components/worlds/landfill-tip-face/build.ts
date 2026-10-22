import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

type P = [number, number, number];
const SKIES = {
  overcast: { top: '#c6ccd1', low: '#e7e8e3', key: '#f4f2ec', power: 1.7, hemi: 1.5, lift: 55 },
  hazy: { top: '#b4cde0', low: '#ede7d6', key: '#fff1d0', power: 2.5, hemi: 1.2, lift: 48 },
  dawn: { top: '#b7bdd8', low: '#f1d6c8', key: '#ffd2ac', power: 2.1, hemi: 1.1, lift: 17 },
  storm: { top: '#6c7683', low: '#c8c6ba', key: '#fff6dc', power: 2.8, hemi: 0.85, lift: 34 },
  dusk: { top: '#7d84a6', low: '#ebbc8e', key: '#ffb97a', power: 2.0, hemi: 0.9, lift: 13 },
} as const;
const FACES = {
  household: { base: '#9f9786', soil: 0.22, bits: ['#f1efe8', '#f1efe8', '#2c2d30', '#2c2d30', '#3f79b8', '#c9a26a', '#d44b3a', '#e8c53c', '#7fa85b', '#d58bb0'] },
  cover: { base: '#957858', soil: 0.82, bits: ['#f1efe8', '#2c2d30', '#3f79b8', '#c9a26a', '#8a7a5e', '#8a7a5e'] },
  sheeted: { base: '#6f8a74', soil: 0.1, bits: ['#1f2023', '#1f2023', '#2f5a44', '#8d9296'] },
  rubble: { base: '#a19d94', soil: 0.2, bits: ['#e9e7e0', '#9a9c9b', '#c9a26a', '#a8553c', '#6f7276', '#d9d4c4'] },
  textile: { base: '#a8908c', soil: 0.08, bits: ['#d83a8a', '#2fa8c8', '#f08a1c', '#3f5fa8', '#f1efe8', '#e8c53c', '#8a3fb0', '#d44b3a', '#3fa85c'] },
} as const;
const CAM: P = [0, 2.4, 28], FOV = 40, HALF = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const TOE = -30;

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing over the tip?', {
      overcast: 'Flat pale overcast, shadowless and white.',
      hazy: 'Hazy sunshine, the light yellowed by dust.',
      dawn: 'Early morning: pink low light and long shadows before the first trucks.',
      storm: 'A dark slate storm front behind a sunlit foreground.',
      dusk: 'Amber dusk, the day’s last load, the flare showing against the sky.',
    }),
    face: choice('What is the working face made of?', {
      household: 'Raw household refuse: a confetti of white, black and coloured bags pressed flat.',
      cover: 'Mostly brown daily cover soil with refuse showing through in patches.',
      sheeted: 'Sheeted over with green and black tarpaulins weighed down by tyres.',
      rubble: 'Construction waste: grey rubble, plasterboard, splintered timber, brick.',
      textile: 'A mountain of discarded clothes, loud colours fading in the sun.',
    }),
    tipped: choice('What was in the last load tipped at the toe of the slope?', {
      bags: 'Black bin bags, split and spilling.',
      furniture: 'A house clearance: mattresses, a sofa, wardrobes on their sides.',
      green: 'Garden waste: branches, hedge clippings, a Christmas tree.',
      toys: 'Bright plastic: toys, crates, garden chairs, a paddling pool.',
      fridges: 'White goods: fridges and washing machines in a rough row.',
      nothing: 'Nothing yet today; the pad is swept clean.',
    }),
    barrier: choice('What holds the windblown litter back?', {
      nets: 'Tall net fences on posts, their mesh snagged thick with plastic bags.',
      containers: 'A windbreak wall of old shipping containers stacked two high.',
      bund: 'A low earth bank with marker poles and tattered flags.',
    }),
    cap: choice('What stands on the capped green hill behind?', {
      vents: 'Only rows of white gas vent pipes.',
      flare: 'Vent pipes and a gas flare stack with a pale flame.',
      sheep: 'Vent pipes, and sheep grazing as if it were any hill.',
      solar: 'Vent pipes and a field of solar panels.',
      tree: 'Vent pipes and one young tree, planted with ceremony.',
    }),
    air: choice('What is in the air?', {
      still: 'Nothing: it is still.',
      litter: 'Plastic bags and paper lifted on the wind, tumbling across the frame.',
      smoke: 'Thin smoke from a fire burning somewhere deep in the waste.',
      rain: 'Rain: the pad is slick and puddled.',
      dust: 'Dust kicked up along the haul road.',
    }),
    gulls: score('How many gulls are over the face?', ['None', 'A few distant dots', 'A wheeling flock', 'The sky is full of them']),
    sign: choice('What does the sign by the haul road say?', {
      face: 'TIPPING FACE', scavenge: 'NO SCAVENGING', hats: 'HARD HATS', slow: '10 MPH', cell: 'CELL 7',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const S = SKIES[a.sky], F = FACES[a.face];
    const top = new THREE.Color(S.top), low = new THREE.Color(S.low).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f4dcc0' : '#dfe6ee'), Math.abs(mood.warmth - 0.5) * 0.3);
    const drab = new THREE.Color('#9a968c');
    const tone = (colour: THREE.ColorRepresentation) => new THREE.Color(colour).lerp(drab, mix(0.45, 0.05, mood.cheer) * 0.6 + mood.wear * 0.15);
    const haze = (colour: THREE.ColorRepresentation, amount: number) => new THREE.Color(colour).lerp(low, Math.min(0.95, Math.max(0, amount)));
    const distant = (z: number, x = 0) => Math.min(0.9, Math.max(0, (Math.hypot(CAM[2] - z, x) - 22) / 300) + (a.sky === 'dawn' || a.air === 'dust' ? 0.1 : 0.03));
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const add = <T extends THREE.Object3D>(object: T, shadows = true) => { const mesh = object as unknown as THREE.Mesh; mesh.castShadow = shadows; mesh.receiveShadow = true; root.add(object); return object; };
    const box = (size: P, at: P, colour: THREE.ColorRepresentation, extra: THREE.MeshStandardMaterialParameters = {}) => { const mesh = add(new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, ...extra }))); mesh.position.set(...at); return mesh; };
    const wet = a.air === 'rain';

    // ---- Light. The sun sits behind the camera to one side so the face and the cast are lit.
    root.add(new THREE.HemisphereLight(top.clone().lerp(new THREE.Color('#ffffff'), 0.5), new THREE.Color('#8c877c'), S.hemi * 0.82));
    const key = new THREE.DirectionalLight(S.key, S.power);
    key.castShadow = true; key.shadow.mapSize.set(1536, 1536); key.shadow.normalBias = 0.05; key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const azimuth = THREE.MathUtils.degToRad(mix(-62, 62, mood.daylight)), lift = THREE.MathUtils.degToRad(S.lift);
    const sunDir = new THREE.Vector3(Math.sin(azimuth) * Math.cos(lift), Math.sin(lift), Math.cos(azimuth) * Math.cos(lift));

    // ---- Sky.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512; skyCanvas.height = 512;
    const sc = skyCanvas.getContext('2d')!;
    const gradient = sc.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#' + top.getHexString()); gradient.addColorStop(0.55, '#' + top.clone().lerp(low, 0.6).getHexString()); gradient.addColorStop(0.82, '#' + low.getHexString()); gradient.addColorStop(1, '#' + low.getHexString());
    sc.fillStyle = gradient; sc.fillRect(0, 0, 512, 512);
    for (let i = 0; i < (a.sky === 'overcast' ? 5 : 14); i++) {
      const x = random() * 512, y = 120 + random() * 250, w = 60 + random() * 160;
      sc.fillStyle = a.sky === 'storm' ? 'rgba(70,78,90,0.25)' : a.sky === 'dusk' ? 'rgba(255,200,150,0.22)' : a.sky === 'dawn' ? 'rgba(255,226,214,0.3)' : 'rgba(255,255,255,0.22)';
      for (let k = 0; k < 6; k++) { sc.beginPath(); sc.ellipse(x + (random() - 0.5) * w, y + (random() - 0.5) * 14, w * (0.3 + random() * 0.4), 7 + random() * 12, 0, 0, 6.3); sc.fill(); }
    }
    if (a.sky !== 'overcast' && a.sky !== 'storm') {
      const sx = 256 - Math.sin(azimuth) * 150, sy = a.sky === 'hazy' ? 150 : 330, glow = sc.createRadialGradient(sx, sy, 2, sx, sy, 110);
      glow.addColorStop(0, 'rgba(255,250,235,0.95)'); glow.addColorStop(0.12, 'rgba(255,244,220,0.5)'); glow.addColorStop(1, 'rgba(255,240,210,0)');
      sc.fillStyle = glow; sc.fillRect(0, 0, 512, 512);
    }
    const skyMap = new THREE.CanvasTexture(skyCanvas); skyMap.colorSpace = THREE.SRGBColorSpace;
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(1800, 900), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }));
    sky.position.set(0, 300, -700); root.add(sky);

    // ---- The lie of the land.
    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;
    const smooth = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
    const toeAt = (x: number) => TOE + Math.max(0, Math.abs(x) - 30) * 0.55 + Math.sin(x * 0.11 + p1) * 1.5;
    const crestAt = (x: number) => mix(27, 7.5, smooth((x + 8) / 34)) + Math.sin(x * 0.05 + p2) * 1.5;
    const benchRun = (x: number) => Math.min(7, crestAt(x) * 0.5) / 0.55;
    const surface = (x: number, z: number) => {
      const d = toeAt(x) - z;
      if (d <= 0) return -0.4;
      const H = crestAt(x), run = benchRun(x), benchH = run * 0.55;
      const flat = d > run && d < run + 9;
      const y = d < run ? d * 0.55 : flat ? benchH + (d - run) * 0.03 : Math.min(H + Math.sin(z * 0.09 + p3) * 0.8, benchH + 0.27 + (d - run - 9) * 0.52);
      const lumps = (Math.sin(x * 0.31 + p1) * Math.cos(z * 0.27 + p2) + Math.sin(x * 0.13 + z * 0.19 + p3)) * 0.5;
      return y + lumps * Math.min(1, d / 4) * (flat ? 0.12 : 0.75);
    };
    const patch = (x: number, z: number) => Math.sin(x * 0.07 + p3) * Math.cos(z * 0.09 + p1) + Math.sin(x * 0.21 + z * 0.17 + p2) * 0.5;

    // ---- Tipping pad and haul road, painted with ruts.
    const mud = tone(wet ? '#77695a' : a.sky === 'dusk' ? '#a08a70' : '#a3927a');
    const baseGround = add(new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: haze(mud, 0.1), roughness: 1 })), false);
    baseGround.rotation.x = -Math.PI / 2; baseGround.position.set(0, -0.05, -200);
    const PW = 96, PD = 104, zFar = -70;
    const padCanvas = document.createElement('canvas');
    padCanvas.width = padCanvas.height = 1024;
    const pc = padCanvas.getContext('2d')!;
    const px = (x: number) => (x + PW / 2) / PW * 1024, pz = (z: number) => (z - zFar) / PD * 1024;
    pc.fillStyle = '#' + mud.getHexString(); pc.fillRect(0, 0, 1024, 1024);
    pc.fillStyle = '#' + mud.clone().lerp(new THREE.Color('#d9cfb8'), 0.3).getHexString();
    pc.beginPath(); pc.moveTo(px(-5), pz(34)); pc.lineTo(px(-7), pz(5)); pc.lineTo(px(-22), pz(TOE)); pc.lineTo(px(22), pz(TOE)); pc.lineTo(px(7), pz(5)); pc.lineTo(px(5), pz(34)); pc.fill();
    for (let i = 0; i < 4000; i++) { const g = random(); pc.fillStyle = g < 0.5 ? 'rgba(60,50,40,0.18)' : 'rgba(240,232,214,0.2)'; pc.fillRect(random() * 1024, random() * 1024, 1 + random() * 3, 1 + random() * 3); }
    const rut = (x0: number, x1: number, x2: number, zEnd: number, gauge: number) => {
      for (const e of [-1, 1]) {
        pc.strokeStyle = wet ? 'rgba(40,34,28,0.45)' : 'rgba(70,58,46,0.3)'; pc.lineWidth = 5; pc.setLineDash([]);
        pc.beginPath(); pc.moveTo(px(x0 + e * gauge), pz(34)); pc.bezierCurveTo(px(x0 + e * gauge), pz(10), px(x1 + e * gauge), pz(-5), px(x2 + e * gauge), pz(zEnd)); pc.stroke();
      }
      pc.setLineDash([]);
    };
    for (let i = 0; i < Math.round(mix(4, 9, mood.wear * 0.5 + mood.density * 0.5)); i++) rut((random() - 0.5) * 4, (random() - 0.5) * 12, (random() - 0.5) * 44, TOE + 4 + random() * 4, 1.1 + random() * 0.2);
    for (let i = 0; i < Math.round(mix(200, 900, mood.density)); i++) {
      const x = (random() - 0.5) * PW, z = mix(34, zFar, random() ** 0.6);
      pc.fillStyle = '#' + tone(pick(F.bits)).getHexString(); pc.globalAlpha = 0.8;
      pc.fillRect(px(x), pz(z), 2 + random() * 4, 2 + random() * 3);
    }
    pc.globalAlpha = 1;
    const puddles: P[] = [];
    for (let i = 0; i < (wet ? 12 : a.air === 'dust' ? 0 : 3); i++) puddles.push([(random() - 0.5) * 30, 2 + random() * 3, mix(18, TOE + 3, random())]);
    for (const [x, r, z] of puddles) { pc.fillStyle = '#' + mud.clone().multiplyScalar(0.72).getHexString(); pc.beginPath(); pc.ellipse(px(x), pz(z), r * 12, r * 6, random(), 0, 6.3); pc.fill(); }
    const padMap = new THREE.CanvasTexture(padCanvas); padMap.colorSpace = THREE.SRGBColorSpace; padMap.anisotropy = 8;
    const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(PW, PD), new THREE.MeshStandardMaterial({ map: padMap, roughness: wet ? 0.45 : 0.97, metalness: wet ? 0.15 : 0 })), false);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, zFar + PD / 2);
    const water = new THREE.MeshStandardMaterial({ color: top.clone().lerp(low, 0.5), roughness: 0.05, metalness: 0.6 });
    for (const [x, r, z] of puddles) { const pool = add(new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 20), water), false); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.45; pool.position.set(x, 0.015, z); }

    // ---- The face itself: a displaced sheet coloured in patches, speckled by a painted map.
    const speck = document.createElement('canvas');
    speck.width = speck.height = 256;
    const kc = speck.getContext('2d')!;
    kc.fillStyle = '#f2efe8'; kc.fillRect(0, 0, 256, 256);
    for (let i = 0; i < Math.round(mix(500, 1500, mood.density)); i++) {
      kc.fillStyle = '#' + tone(pick(F.bits)).getHexString(); kc.globalAlpha = a.face === 'cover' || a.face === 'sheeted' ? 0.35 : 0.8;
      const w = 3 + random() * (a.face === 'rubble' ? 9 : 6);
      kc.fillRect(random() * 256, random() * 256, w, w * (0.4 + random() * 0.6));
    }
    const speckMap = new THREE.CanvasTexture(speck); speckMap.colorSpace = THREE.SRGBColorSpace; speckMap.wrapS = speckMap.wrapT = THREE.RepeatWrapping; speckMap.repeat.set(13, 9);
    const sheet = new THREE.PlaneGeometry(240, 170, 140, 96);
    sheet.rotateX(-Math.PI / 2); sheet.translate(0, 0, TOE - 60);
    const position = sheet.getAttribute('position'), colours = new Float32Array(position.count * 3), c = new THREE.Color();
    const soilHex = tone('#8c7050'), faceHex = tone(F.base), tarps = ['#4f7a5c', '#2a2c2e', '#5f6f66', '#3f6a4c'].map((hex) => tone(hex));
    const tracks = [-9 + random() * 4, 13 + random() * 6];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i), y = surface(x, z);
      position.setY(i, y);
      const d = toeAt(x) - z, n = patch(x, z);
      if (a.face === 'sheeted' && n > -0.9) c.copy(tarps[Math.abs(Math.floor(x / 15) * 3 + Math.floor(d / 11) * 5) % 4]);
      else c.copy(n * 0.5 + 0.5 < F.soil ? soilHex : faceHex);
      if (a.face === 'textile') c.lerp(tone(F.bits[Math.abs(Math.floor(x / 5) + Math.floor(z / 4) * 3) % F.bits.length]), 0.35);
      c.multiplyScalar(1 + n * 0.07);
      for (const t of tracks) { const off = Math.abs(x - t - d * 0.12); if (d > 0 && d < 60 && (Math.abs(off - 1.6) < 0.9)) c.multiplyScalar(0.62); }
      if (d > benchRun(x) && d < benchRun(x) + 9) c.lerp(soilHex, 0.6);
      c.lerp(low, distant(z, x));
      c.toArray(colours, i * 3);
    }
    sheet.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    sheet.computeVertexNormals();
    add(new THREE.Mesh(sheet, new THREE.MeshStandardMaterial({ vertexColors: true, map: speckMap, roughness: 1 })));

    // Loose pieces standing proud of the face, densest at the toe.
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sv = new THREE.Vector3();
    const strew = (geometry: THREE.BufferGeometry, count: number, at: (i: number) => { p: P; size: P; colour: THREE.Color; spin?: P }, material?: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(geometry, material ?? new THREE.MeshStandardMaterial({ roughness: 0.9 }), count);
      for (let i = 0; i < count; i++) {
        const it = at(i);
        e.set(...(it.spin ?? [random() * 3, random() * 3, random() * 3]));
        mesh.setMatrixAt(i, matrix.compose(v.set(...it.p), q.setFromEuler(e), sv.set(...it.size)));
        mesh.setColorAt(i, it.colour);
      }
      mesh.frustumCulled = false;
      return add(mesh);
    };
    const pieces = Math.round(mix(400, 1100, mood.density) * (a.face === 'cover' ? 0.4 : 1));
    const pieceGeometry = a.face === 'sheeted' ? new THREE.TorusGeometry(0.5, 0.2, 5, 10) : a.face === 'rubble' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.DodecahedronGeometry(0.6, 0);
    strew(pieceGeometry, pieces, () => {
      const x = (random() - 0.5) * 130, d = random() ** 1.7 * 46 + 0.3, z = toeAt(x) - d;
      const size = mix(0.4, 1.3, random()) * (1 + d / 40);
      return { p: [x, surface(x, z) + size * 0.15, z], size: a.face === 'rubble' ? [size * 1.6, size * 0.35, size] : a.face === 'sheeted' ? [size * 1.1, size * 1.1, size * 1.1] : [size, size * 0.6, size], colour: haze(tone(pick(F.bits)), distant(z, x)), spin: a.face === 'sheeted' ? [Math.PI / 2 - 0.5, 0, random() * 3] : undefined };
    });

    // ---- What the last truck left at the toe, kept to the edges of the frame.
    const heapAt: P[] = [[-12, 0, TOE + 4.5], [13, 0, TOE + 5.5], [25, 0, TOE + 9]];
    if (a.tipped !== 'nothing') heapAt.forEach(([hx, , hz], index) => {
      const big = mix(0.9, 1.35, mood.density) * (index === 1 ? 1.2 : 1);
      const hz0 = haze('#ffffff', 0).getHex() && distant(hz, hx);
      if (a.tipped === 'bags' || a.tipped === 'green' || a.tipped === 'toys') {
        const palette = a.tipped === 'bags' ? ['#1f2023', '#1f2023', '#26282c', '#e9e6dc', '#3f79b8'] : a.tipped === 'green' ? ['#5f8a3e', '#4a7034', '#7a9a48', '#6a5a3c', '#8a7a4a'] : ['#e23a3a', '#f2c41f', '#2f8fd8', '#3fb85a', '#f07ab0', '#f08a1c', '#f4f1e6'];
        strew(a.tipped === 'green' ? new THREE.ConeGeometry(0.5, 1.4, 5) : new THREE.DodecahedronGeometry(0.6, 0), Math.round(70 * big), () => {
          const t = random() * 6.28, r = Math.sqrt(random()) * 5.5 * big, size = mix(0.6, 1.3, random());
          return { p: [hx + Math.cos(t) * r, Math.max(0.25, (1 - r / (5.5 * big)) * 2.6 * big * random()), hz + Math.sin(t) * r * 0.7], size: [size, size * (a.tipped === 'green' ? 1.4 : 0.75), size], colour: haze(a.tipped === 'toys' ? new THREE.Color(pick(palette)).lerp(drab, mood.wear * 0.3) : tone(pick(palette)), hz0) };
        }, new THREE.MeshStandardMaterial({ roughness: a.tipped === 'bags' ? 0.4 : 0.8 }));
      } else {
        const count = Math.round(7 * big);
        for (let i = 0; i < count; i++) {
          const x = hx + (i - count / 2) * (a.tipped === 'fridges' ? 1.5 : 1.9) + (random() - 0.5), z = hz + (random() - 0.5) * 3;
          if (a.tipped === 'fridges') {
            const tall = random() < 0.6, fallen = random() < mood.wear * 0.6;
            const unit = box(tall ? [0.75, 1.8, 0.7] : [0.65, 0.9, 0.65], [x, fallen ? 0.36 : tall ? 0.9 : 0.45, z], haze(tone(pick(['#eeeeea', '#e4e2da', '#d9dcdc', '#c9c2a8'])), hz0), { roughness: 0.4 });
            unit.rotation.set(fallen ? Math.PI / 2 : 0, random() * 0.6 - 0.3, 0);
          } else {
            const kind = i % 3;
            const piece = kind === 0 ? box([1.5, 0.28, 2.0], [x, 0.3 + random() * 0.5, z], haze(tone(pick(['#e6dfd0', '#c9d6e2', '#e2c9c9'])), hz0)) : kind === 1 ? box([2.1, 0.85, 0.95], [x, 0.43, z], haze(tone(pick(['#7a4a3a', '#4a6a5a', '#a8875a', '#5a5f7a'])), hz0)) : box([1.1, 2.0, 0.6], [x, 0.35, z], haze(tone(pick(['#6a4a30', '#8a6a48', '#e9e4d6'])), hz0));
            piece.rotation.set(kind === 0 ? random() * 0.5 : kind === 2 ? Math.PI / 2 - 0.1 : 0, random() * 2, kind === 0 ? random() * 0.3 : 0);
          }
        }
      }
    });

    // ---- Litter barrier down the left flank and along the crest.
    const flank: P[] = Array.from({ length: 6 }, (_u, i) => { const x = -36 + i * 6.2; return [x, 0, toeAt(x) + 1.6] as P; });
    const crest: P[] = Array.from({ length: 9 }, (_u, i) => { const x = -58 + i * 8.5, z = toeAt(x) - benchRun(x) - 9 - (crestAt(x) - benchRun(x) * 0.55) / 0.52 - 4; return [x, surface(x, z), z] as P; });
    const snags: { p: P; size: P; colour: THREE.Color }[] = [];
    const bagHues = ['#f4f2ea', '#f4f2ea', '#5aa0d8', '#e89ab8', '#f2d24a', '#2a2b2e', '#f08a3a'];
    if (a.barrier === 'nets') {
      const netCanvas = document.createElement('canvas');
      netCanvas.width = netCanvas.height = 64;
      const nc = netCanvas.getContext('2d')!;
      nc.strokeStyle = 'rgba(40,60,45,0.9)'; nc.lineWidth = 2;
      for (let i = 0; i <= 64; i += 8) { nc.beginPath(); nc.moveTo(i, 0); nc.lineTo(i, 64); nc.moveTo(0, i); nc.lineTo(64, i); nc.stroke(); }
      const netMap = new THREE.CanvasTexture(netCanvas); netMap.wrapS = netMap.wrapT = THREE.RepeatWrapping; netMap.repeat.set(5, 4);
      const net = new THREE.MeshBasicMaterial({ map: netMap, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
      for (const [line, tall] of [[flank, 6], [crest, 7]] as const) line.forEach((post, i) => {
        const hz = distant(post[2], post[0]);
        const pole = box([0.16, tall + 0.6, 0.16], [post[0], post[1] + tall / 2 - 0.3, post[2]], haze('#6a6f72', hz), { metalness: 0.4 });
        pole.rotation.z = (random() - 0.5) * 0.06 * (1 + mood.wear * 2);
        const next = line[i + 1];
        if (!next) return;
        const span = Math.hypot(next[0] - post[0], next[2] - post[2]);
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(span, tall - 0.6), net);
        panel.position.set((post[0] + next[0]) / 2, (post[1] + next[1]) / 2 + tall / 2 + 0.3, (post[2] + next[2]) / 2);
        panel.rotation.y = -Math.atan2(next[2] - post[2], next[0] - post[0]);
        root.add(panel);
        for (let k = 0; k < Math.round(mix(4, 16, mood.density)); k++) {
          const u = random(), h = 0.6 + random() ** 1.5 * (tall - 1), size = mix(0.35, 0.8, random()) * (line === crest ? 1.5 : 1);
          snags.push({ p: [mix(post[0], next[0], u), mix(post[1], next[1], u) + h, mix(post[2], next[2], u) + 0.08], size: [size, size * 1.3, size * 0.25], colour: haze(tone(pick(bagHues)), hz) });
        }
      });
    } else if (a.barrier === 'containers') {
      const hues = ['#a8452e', '#2f6f9f', '#3f7a5a', '#c9a23c', '#8a8f94', '#7a3a3a'];
      flank.slice(0, 5).forEach((post, i) => { for (let tier = 0; tier < (i % 3 === 1 ? 1 : 2); tier++) box([6.0, 2.6, 2.5], [post[0] + 3.1, 1.3 + tier * 2.6, post[2]], haze(tone(hues[(i * 2 + tier) % hues.length]), distant(post[2], post[0])), { roughness: 0.6 }).rotation.y = (random() - 0.5) * 0.06; });
      crest.slice(1, 8).forEach((post, i) => { if (i % 4 !== 3) box([8.4, 2.6, 2.5], [post[0], post[1] + 1.1 + (i % 2) * 0.2, post[2]], haze(tone(hues[(i * 3 + 1) % hues.length]), distant(post[2], post[0])), { roughness: 0.6 }).rotation.y = (random() - 0.5) * 0.08; });
      for (let k = 0; k < Math.round(mix(6, 20, mood.density)); k++) { const post = flank[Math.floor(random() * 5)]; snags.push({ p: [post[0] + random() * 6, 0.3 + random() * 0.6, post[2] + 1.5], size: [0.5, 0.6, 0.2], colour: tone(pick(bagHues)) }); }
    } else {
      for (const [line, tall] of [[flank, 2.2], [crest, 2.6]] as const) line.forEach((post, i) => {
        const hz = distant(post[2], post[0]), next = line[i + 1];
        if (next) { const bank = box([Math.hypot(next[0] - post[0], next[2] - post[2]) + 2, tall * 2, tall * 2.4], [(post[0] + next[0]) / 2, (post[1] + next[1]) / 2 - tall * 0.42, (post[2] + next[2]) / 2], haze(tone('#8f7654'), hz)); bank.rotation.set(Math.PI / 4, -Math.atan2(next[2] - post[2], next[0] - post[0]), 0, 'YXZ'); }
        box([0.08, 3.4, 0.08], [post[0], post[1] + tall + 1.4, post[2]], haze('#e9e6dc', hz));
        box([0.9, 0.5, 0.04], [post[0] + 0.5, post[1] + tall + 2.8, post[2]], haze(tone(pick(['#e23a3a', '#f08a1c', '#f2c41f'])), hz)).rotation.z = -0.25 - random() * 0.3;
      });
    }
    if (snags.length) strew(new THREE.IcosahedronGeometry(0.5, 0), snags.length, (i) => snags[i]);

    // ---- The capped hill, greened over, with its vents.
    const HILL = { x: 58, y: -8, z: -205, rx: 120, ry: 58, rz: 90 };
    const hillY = (x: number, z: number) => HILL.y + HILL.ry * Math.sqrt(Math.max(0, 1 - ((x - HILL.x) / HILL.rx) ** 2 - ((z - HILL.z) / HILL.rz) ** 2));
    const grass = haze(tone(a.sky === 'dusk' ? '#8a9a5a' : '#7fa652'), 0.24);
    const hillCanvas = document.createElement('canvas');
    hillCanvas.width = 256; hillCanvas.height = 256;
    const hc = hillCanvas.getContext('2d')!;
    hc.fillStyle = '#' + grass.getHexString(); hc.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) { hc.fillStyle = i % 2 ? 'rgba(255,255,230,0.06)' : 'rgba(30,60,20,0.06)'; hc.fillRect(0, random() * 256, 256, 2 + random() * 8); }
    hc.fillStyle = '#' + haze(tone('#b8a680'), 0.3).getHexString();
    for (const y of [46, 70, 96]) hc.fillRect(0, y, 256, 2.2);
    for (let i = 0; i < 10; i++) hc.fillRect(i * 25.6 + 6, 22, 1.4, 106);
    const hillMap = new THREE.CanvasTexture(hillCanvas); hillMap.colorSpace = THREE.SRGBColorSpace;
    const hill = add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: hillMap, roughness: 1 })), false);
    hill.scale.set(HILL.rx, HILL.ry, HILL.rz); hill.position.set(HILL.x, HILL.y, HILL.z);
    const onHill = (u: number, w: number): P => { const x = HILL.x + (u - 0.5) * HILL.rx * 1.35, z = HILL.z + HILL.rz * mix(0.25, 0.82, w); return [x, hillY(x, z), z]; };
    const ventWhite = haze('#f3f2ec', 0.3);
    const vents = Array.from({ length: 22 }, (_u, i) => onHill((i % 8) / 7 * 0.9 + 0.05 + (random() - 0.5) * 0.04, Math.floor(i / 8) / 2.4 + random() * 0.1));
    strew(new THREE.CylinderGeometry(0.35, 0.35, 1, 6).translate(0, 0.5, 0), vents.length, (i) => ({ p: vents[i], size: [1, 4.2, 1], colour: ventWhite, spin: [0, 0, 0] }));
    strew(new THREE.TorusGeometry(0.7, 0.35, 5, 8, Math.PI).translate(0.7, 0, 0), vents.length, (i) => ({ p: [vents[i][0], vents[i][1] + 4.2, vents[i][2]], size: [1, 1, 1], colour: ventWhite, spin: [0, 0, 0] }));
    let flame: THREE.Mesh | null = null;
    if (a.cap === 'flare' || a.sky === 'dusk') {
      const at = onHill(0.3, 0.55);
      box([1.8, 13, 1.8], [at[0], at[1] + 6.5, at[2]], haze('#b9bdbd', 0.3), { metalness: 0.4 });
      flame = new THREE.Mesh(new THREE.ConeGeometry(1.5, 5.5, 8), new THREE.MeshBasicMaterial({ color: a.sky === 'dusk' ? '#ffb84a' : '#ffe6a8', transparent: true, opacity: 0.9, depthWrite: false }));
      flame.position.set(at[0], at[1] + 15.5, at[2]); root.add(flame);
    }
    if (a.cap === 'sheep') strew(new THREE.IcosahedronGeometry(1, 1), 26, () => { const at = onHill(0.1 + random() * 0.75, random() * 0.8); return { p: [at[0], at[1] + 0.9, at[2]], size: [1.5, 1.1, 1.0], colour: haze(random() < 0.1 ? '#3a3632' : '#f1efe6', 0.3), spin: [0, random() * 3, 0] }; });
    if (a.cap === 'solar') strew(new THREE.BoxGeometry(1, 1, 1), 40, (i) => { const at = onHill(0.18 + (i % 10) / 9 * 0.5, 0.3 + Math.floor(i / 10) / 3 * 0.4); return { p: [at[0], at[1] + 1.6, at[2]], size: [6.5, 0.2, 3.2], colour: haze('#2c3f66', 0.3), spin: [0.75, 0, 0] }; }, new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.6 }));
    if (a.cap === 'tree') {
      const at = onHill(0.42, 0.5);
      box([0.5, 7, 0.5], [at[0], at[1] + 3.5, at[2]], haze('#6a5438', 0.3));
      const crown = add(new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 1), new THREE.MeshStandardMaterial({ color: haze(tone('#5f8f3e'), 0.3), roughness: 1, flatShading: true })));
      crown.position.set(at[0], at[1] + 9, at[2]); crown.scale.y = 1.15;
      box([0.25, 3, 0.25], [at[0] + 1.6, at[1] + 1.5, at[2] + 1], haze('#c9b27c', 0.3));
    }

    // ---- Roadside sign, cones and a marker pole or two.
    const signText = { face: 'TIPPING FACE', scavenge: 'NO SCAVENGING', hats: 'HARD HATS', slow: '10 MPH', cell: 'CELL 7' }[a.sign];
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256; signCanvas.height = 160;
    const gc = signCanvas.getContext('2d')!;
    const warn = a.sign === 'scavenge' || a.sign === 'hats';
    gc.fillStyle = a.sign === 'slow' ? '#f4f2ea' : warn ? '#f1c81e' : '#2f6a4b'; gc.fillRect(0, 0, 256, 160);
    gc.strokeStyle = a.sign === 'slow' ? '#c22a22' : warn ? '#1b1b1b' : '#f4f2ea'; gc.lineWidth = 12; gc.strokeRect(8, 8, 240, 144);
    gc.fillStyle = a.sign === 'slow' || warn ? '#1b1b1b' : '#f4f2ea'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.font = 'bold 50px sans-serif';
    const words = signText.split(' ');
    if (words.length > 1) { gc.fillText(words[0], 128, 54, 220); gc.fillText(words.slice(1).join(' '), 128, 108, 220); } else gc.fillText(signText, 128, 80, 220);
    gc.fillStyle = `rgba(110,80,50,${mood.wear * 0.4})`; gc.fillRect(0, 0, 256, 160);
    const signMap = new THREE.CanvasTexture(signCanvas); signMap.colorSpace = THREE.SRGBColorSpace;
    const signAt: P = [5.6, 0, CAM[2] - 17];
    const board = add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: '#8a8f92' })).concat([new THREE.MeshStandardMaterial({ map: signMap, roughness: 0.7 }), new THREE.MeshStandardMaterial({ color: '#8a8f92' })])));
    board.position.set(signAt[0], 2.2, signAt[2]); board.rotation.set(0, -0.3, (random() - 0.5) * 0.1 * (1 + mood.wear * 2));
    for (const dx of [-0.55, 0.55]) box([0.07, 2.8, 0.07], [signAt[0] + dx * Math.cos(0.3), 1.4, signAt[2] - 0.04 + dx * Math.sin(0.3)], '#7f8588', { metalness: 0.5 });
    for (let i = 0; i < 4; i++) {
      const d = 13 + i * 7, x = -(0.9 * HALF * d) + 0.4;
      const cone = add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 10), new THREE.MeshStandardMaterial({ color: tone('#f0621e'), roughness: 0.6 })));
      cone.position.set(x, 0.375, CAM[2] - d);
      if (random() < mood.wear * 0.5) { cone.rotation.z = Math.PI / 2; cone.position.y = 0.2; }
      box([0.46, 0.04, 0.46], [x, 0.02, CAM[2] - d], tone('#f0621e'));
    }

    // ---- Gulls: dots in a pale sky.
    const gullCount = Math.round(a.gulls ** 1.3 * mix(60, 190, mood.density * 0.5 + mood.energy * 0.5));
    const wingShape = new THREE.BufferGeometry();
    wingShape.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1.1, 0.42, 0, 0.5, 0.02, 0.3, 0, 0, 0, -1.1, 0.42, 0, -0.5, 0.02, 0.3]), 3));
    const gulls = new THREE.InstancedMesh(wingShape, new THREE.MeshBasicMaterial({ color: haze(a.sky === 'storm' ? '#f1f0ea' : '#565c64', 0.2), side: THREE.DoubleSide }), Math.max(1, gullCount));
    gulls.count = gullCount; gulls.frustumCulled = false; root.add(gulls);
    const birds = Array.from({ length: gullCount }, () => ({ cx: -22 + (random() - 0.5) * 60, cz: TOE - 30 - random() * 55, y: 24 + random() ** 1.4 * 46, r: 4 + random() * 22, phase: random() * 6.28, speed: (random() < 0.8 ? 1 : -1) * mix(0.5, 1.4, random()), size: mix(1.3, 2.3, random()) }));
    const fly = (time: number) => {
      const pace = mix(0.08, 0.45, mood.energy);
      birds.forEach((bird, i) => {
        const angle = bird.phase + time * pace * bird.speed * 10 / (4 + bird.r * 0.5);
        e.set(0, -angle, Math.sin(time * 3 + bird.phase) * 0.15);
        const beat = 0.55 + Math.sin(time * mix(3, 7, mood.energy) + bird.phase * 7) * 0.45;
        gulls.setMatrixAt(i, matrix.compose(v.set(bird.cx + Math.cos(angle) * bird.r, bird.y + Math.sin(angle * 0.7 + bird.phase) * 2, bird.cz + Math.sin(angle) * bird.r), q.setFromEuler(e), sv.set(bird.size, bird.size * beat, bird.size)));
      });
      gulls.instanceMatrix.needsUpdate = true;
    };
    fly(0);

    // ---- What the air is carrying.
    const drifting: { mesh: THREE.Mesh; at: P; phase: number; material: THREE.MeshStandardMaterial }[] = [];
    const puff = (at: P, hex: string, radius: number) => {
      const material = new THREE.MeshStandardMaterial({ color: hex, transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 });
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material);
      root.add(mesh);
      drifting.push({ mesh, at, phase: random(), material });
    };
    if (a.air === 'smoke') for (const sx of [-14 + random() * 8, 22 + random() * 10]) { const z = toeAt(sx) - 20 - random() * 14; for (let i = 0; i < 14; i++) puff([sx, surface(sx, z), z], '#8d8883', 1.1); }
    if (a.air === 'dust') for (let i = 0; i < 12; i++) puff([(random() - 0.5) * 9, 0.6, mix(12, TOE + 6, random())], '#d9c9a8', 2.2);
    const flying = a.air === 'litter' ? Math.round(mix(25, 90, mood.energy)) : 0;
    const loose = Array.from({ length: flying }, () => ({ x: (random() - 0.5) * 70, y: 0.5 + random() ** 2 * 22, z: mix(14, TOE - 25, random()), phase: random() * 6.28, size: mix(0.3, 0.7, random()) }));
    const litter = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide }), Math.max(1, flying));
    litter.count = flying; litter.frustumCulled = false; root.add(litter);
    loose.forEach((_bag, i) => litter.setColorAt(i, tone(pick(bagHues))));
    const drops = wet ? 170 : 0;
    const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.025, 1.3, 0.025), new THREE.MeshBasicMaterial({ color: '#eef2f4', transparent: true, opacity: 0.45, depthWrite: false }), Math.max(1, drops));
    rain.count = drops; rain.frustumCulled = false; root.add(rain);
    const falling = Array.from({ length: drops }, () => ({ x: (random() - 0.5) * 44, y: random() * 22, z: mix(22, -30, random()) }));
    const blow = (time: number) => {
      const wind = mix(0.6, 5, mood.energy);
      for (const d of drifting) {
        const t = (time * 0.05 * (1 + mood.energy) + d.phase) % 1, rising = a.air === 'smoke';
        d.mesh.position.set(d.at[0] + t * (rising ? 14 : 5) * (wind * 0.4), d.at[1] + (rising ? t * 26 : t * 2.5), d.at[2] - (rising ? 0 : t * 4));
        d.mesh.scale.setScalar(rising ? 0.6 + t * 3.2 : 0.8 + t * 1.6);
        d.material.opacity = Math.min(1, t * 6) * (1 - t) * (rising ? 0.26 : 0.3);
      }
      loose.forEach((bag, i) => {
        const x = ((bag.x + time * wind + 35) % 70 + 70) % 70 - 35;
        e.set(time * 1.3 + bag.phase, time * 0.9 + bag.phase * 2, bag.phase);
        litter.setMatrixAt(i, matrix.compose(v.set(x, bag.y + Math.sin(time * 1.1 + bag.phase) * 1.2, bag.z), q.setFromEuler(e), sv.set(bag.size, bag.size * 1.3, bag.size * 0.2)));
      });
      litter.instanceMatrix.needsUpdate = true;
      falling.forEach((drop, i) => rain.setMatrixAt(i, matrix.makeRotationZ(-0.12).setPosition(drop.x, ((drop.y - time * 16) % 22 + 22) % 22, drop.z)));
      rain.instanceMatrix.needsUpdate = true;
    };
    blow(0.4);

    // ---- Camera: on the haul road, tilted up the slope.
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.3, 1800);
    camera.position.set(...CAM);
    camera.lookAt(0, CAM[1] + Math.tan(THREE.MathUtils.degToRad(6.5)) * CAM[2], 0);

    // Near true size: small things are helped a little, and the hero stands as close as it needs to fill the frame.
    const shown = (item: Placeable) => Math.min(1.6, Math.max(1, 2.4 / Math.max(item.height, 0.05)));
    const FAR = 50;
    const place = (items: readonly Placeable[]) => {
      let heroD = 18;
      const taken: { x: number; z: number }[] = [];
      items.forEach((item, index) => {
        let scale = shown(item);
        const r = Math.max(item.radius * scale, 0.2), h = item.height * scale;
        if (index === 0) {
          heroD = Math.min(FAR, Math.max(12, r / (HALF * 0.44), h / 0.4));
          const fit = Math.min(1, (FAR * HALF * 0.44) / r, (FAR * 0.4) / h);
          if (heroD >= FAR) scale *= fit;
          item.holder.scale.setScalar(scale);
          item.holder.position.set(0, 0, CAM[2] - heroD);
          item.holder.rotation.y = (random() > 0.5 ? 1 : -1) * (0.3 + random() * 0.3);
          taken.push({ x: 0, z: CAM[2] - heroD });
          return;
        }
        const bx = -13, bz = toeAt(bx) - benchRun(bx) - 4.5;
        const spots = [
          [Math.max(11.5, heroD * 0.86), -0.72, 0.22], [heroD * 1.08 + 1, 0.74, 0.22], [heroD * 1.5 + 4, -0.58, 0.32], [heroD * 1.9 + 6, 0.52, 0.34],
        ].map(([d, f, rf]) => { const dd = Math.min(d, FAR - 2); return { x: f * HALF * dd, y: 0, z: CAM[2] - dd, room: rf * HALF * dd, tall: dd * 0.34 }; });
        spots.push({ x: bx, y: surface(bx, bz) + 0.05, z: bz, room: 4.2, tall: 9 });
        const free = spots.filter((spot) => !taken.some((t) => Math.hypot(t.x - spot.x, t.z - spot.z) < 0.5));
        const fits = (spot: (typeof spots)[number]) => Math.min(spot.room / r, spot.tall / h);
        const chosen = free.find((spot) => fits(spot) >= 1) ?? free.reduce((best, spot) => (fits(spot) > fits(best) ? spot : best), free[0] ?? spots[index % spots.length]);
        scale *= Math.min(1, fits(chosen));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(chosen.x, chosen.y, chosen.z);
        item.holder.rotation.y = -Math.sign(chosen.x) * (0.2 + random() * 0.4);
        taken.push({ x: chosen.x, z: chosen.z });
      });
      const centreZ = CAM[2] - heroD;
      key.target.position.set(0, 0, centreZ);
      key.position.set(0, 0, centreZ).addScaledVector(sunDir, 170);
      const span = Math.max(26, heroD * 1.3);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span; shadow.right = shadow.top = span;
      shadow.near = 1; shadow.far = 440;
      shadow.updateProjectionMatrix();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    };

    return {
      object: root,
      camera,
      background: low.clone(),
      capacity: 5,
      ground,
      keyLight: key,
      place,
      update(_dt, time) {
        if (gullCount) fly(time);
        if (drifting.length || flying || drops) blow(time);
        if (flame) flame.scale.set(1 + Math.sin(time * 11) * 0.12, 1 + Math.sin(time * 7.3) * 0.2 * (0.5 + mood.energy), 1);
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
