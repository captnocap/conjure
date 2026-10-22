import * as THREE from 'three';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix, noul, score } from '@conjure/kit';

// Standing places: x, z, tallest and widest (radius) a thing may be there. The hero is first and nearest.
const SLOTS: readonly (readonly [number, number, number, number])[] = [[5.8, -4, 10, 5.6], [-19, -16, 10, 6.5], [19, -40, 12, 8], [-27, -64, 14, 9], [12, -92, 16, 10]];
const TIMES = {
  golden: { top: '#6c90bb', mid: '#e8c596', low: '#f7dfae', sun: '#fff2c4', key: '#ffd29a', power: 4.6, sky: 0.55, lift: 0.3, shade: 1 },
  dusk: { top: '#4a5486', mid: '#b97c8e', low: '#f3ab6c', sun: '#ffd9a0', key: '#ffb98a', power: 2.7, sky: 0.8, lift: 0.22, shade: 0.8 },
  noon: { top: '#86b0d6', mid: '#cddbe3', low: '#efeadb', sun: '#ffffff', key: '#fff8ea', power: 4.3, sky: 0.6, lift: 0.85, shade: 1 },
  dawn: { top: '#7f92ba', mid: '#e2b4b2', low: '#f6dac4', sun: '#ffe9d8', key: '#ffd3c2', power: 3.6, sky: 0.6, lift: 0.26, shade: 0.95 },
  norther: { top: '#5d646e', mid: '#8f887b', low: '#c9a878', sun: '#f1e6cf', key: '#e9d9c2', power: 2.6, sky: 0.85, lift: 0.5, shade: 0.88 },
} as const;
const PLACES = {
  permian: { ground: '#b89f75', road: '#eadfc8', bush: '#5b6440', grass: '#c8b36c' },
  baku: { ground: '#8b7d6c', road: '#b8ab98', bush: '#66634e', grass: '#9a8f72' },
  oklahoma: { ground: '#8b9c5d', road: '#b4593b', bush: '#3f6a38', grass: '#b3b964' },
  bakken: { ground: '#e6eaec', road: '#a8735f', bush: '#8a8674', grass: '#d6cba3' },
  kern: { ground: '#cdb889', road: '#dccfb2', bush: '#8e895c', grass: '#d9c886' },
} as const;

export default defineWorld({
  questions: {
    time: choice('What is the light?', {
      golden: 'Late golden light, long shadows, a low sun.',
      dusk: 'Flare-lit dusk: violet sky, an orange band on the horizon, every flame showing.',
      noon: 'White noon, heat and no shadow.',
      dawn: 'A cool pink dawn before the wind gets up.',
      norther: 'A dust storm coming: a brown wall on the horizon under a slate sky.',
    }),
    place: choice('Which oil country is it?', {
      permian: 'The Permian Basin: tan dirt, mesquite scrub, a white caliche road.',
      baku: 'The Absheron fields outside Baku: grey oil-soaked earth, black pools, old derricks on the skyline.',
      oklahoma: 'Oklahoma: green pasture, a red dirt road, round hay bales.',
      bakken: 'The Bakken in winter: snow on the prairie, a red scoria road.',
      kern: 'Kern County, California: bare pale ground and a forest of pumpjacks crowding the hills.',
    }),
    cycle: score('Where is the field in its cycle?', ['Bust: most pumpjacks stopped, weeds in the road, one flare', 'Steady production', 'Boom: everything nodding, flares everywhere, drilling rigs and truck dust']),
    horizon: choice('What marks the horizon besides pumpjacks?', {
      nothing: 'Nothing: a ruled line.',
      batteries: 'Rows of pale tank batteries.',
      rigs: 'Tall drilling rigs strung with lights.',
      turbines: 'Wind turbines turning on the caprock, the next boom.',
      mesa: 'A long flat-topped escarpment.',
    }),
    sky: choice('What is in the sky?', {
      clear: 'Nothing. Empty from edge to edge.',
      cirrus: 'High thin streaks of cloud.',
      thunderhead: 'One enormous anvil thunderhead far off.',
      haze: 'A brown band of flare smoke and dust lying on the horizon.',
    }),
    road: choice('What is on the lease road?', {
      empty: 'Nothing: two ruts running out of sight.',
      gate: 'A cattle guard and a pipe gate left open.',
      truck: 'A truck far down the road dragging a plume of dust.',
      puddles: 'Rain last night: the ruts hold long puddles of sky.',
    }),
    sign: choice('What stands at the roadside in front?', {
      none: 'Nothing.',
      leases: 'A stack of operator lease signs, one above another.',
      h2s: 'A red poison-gas warning.',
      cross: 'A white roadside cross with plastic flowers and a hard hat.',
      caution: 'A yellow truck-traffic warning.',
    }),
    fence: noul('Does a barbed-wire fence run along the road?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const time = TIMES[a.time], place = PLACES[a.place];
    const grey = new THREE.Color('#9c9a96');
    const tone = (hex: THREE.ColorRepresentation, toward: THREE.ColorRepresentation = grey, amount = (1 - mood.cheer) * 0.18) => new THREE.Color(hex).lerp(new THREE.Color(toward), amount);
    const hex = (colour: THREE.Color) => '#' + colour.getHexString();
    const warmShift = (colour: THREE.Color) => colour.lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb070' : '#bcd2f0'), Math.abs(mood.warmth - 0.5) * 0.25);
    const horizonColour = warmShift(tone(time.low));
    const side = mood.daylight < 0.5 ? 1 : -1;
    const boom = a.cycle, dusk = a.time === 'dusk';
    const cameraAt = new THREE.Vector3(0, 2.3, 31);
    const roadX = (z: number) => -5.2 + 0.018 * (z - 2);
    const far = (colour: THREE.Color, z: number) => colour.clone().lerp(horizonColour, Math.min(0.82, Math.max(0, (-z - 60) / 480)));
    const add = <T extends THREE.Object3D>(node: T, shadow = true) => {
      node.traverse((child) => { const mesh = child as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = shadow; mesh.receiveShadow = true; } });
      root.add(node);
      return node;
    };
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material, at: readonly [number, number, number] = [0, 0, 0], shadow = true) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      return add(mesh, shadow);
    };
    const lambert = (colour: THREE.ColorRepresentation, options: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color: colour, ...options });
    const decal = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };

    // Sky: a painted backdrop. The visible part is roughly x 310..715, y 200..496 of this canvas.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const wash = ctx.createLinearGradient(0, 512, 0, 0);
    wash.addColorStop(0, hex(horizonColour)); wash.addColorStop(0.035, hex(horizonColour)); wash.addColorStop(0.16, hex(warmShift(tone(time.mid)))); wash.addColorStop(0.5, hex(tone(time.top))); wash.addColorStop(1, hex(tone(time.top).multiplyScalar(0.92)));
    ctx.fillStyle = wash; ctx.fillRect(0, 0, 1024, 512);
    const sunX = 512 - side * mix(90, 150, random()), sunY = 496 - { golden: 46, dusk: -8, noon: 400, dawn: 22, norther: 120 }[a.time];
    {
      const reach = a.time === 'noon' ? 0 : dusk ? 260 : 170;
      const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, reach || 1);
      halo.addColorStop(0, a.time === 'norther' ? 'rgba(241,230,207,0.5)' : 'rgba(255,238,190,0.85)'); halo.addColorStop(1, 'rgba(255,238,190,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, 1024, 512);
      if (!dusk && a.time !== 'noon') { ctx.fillStyle = hex(tone(time.sun, '#ffffff', 0)); ctx.beginPath(); ctx.arc(sunX, sunY, a.time === 'norther' ? 9 : 13, 0, 7); ctx.fill(); }
    }
    if (a.sky === 'cirrus') for (let i = 0; i < 16 + Math.round(mood.density * 10); i++) {
      ctx.fillStyle = `rgba(${dusk ? '255,190,150' : '255,247,232'},${0.2 + random() * 0.35})`;
      ctx.save(); ctx.translate(300 + random() * 430, 200 + random() * 230); ctx.rotate(-0.1 + random() * 0.08);
      ctx.beginPath(); ctx.ellipse(0, 0, 30 + random() * 90, 1.5 + random() * 3.5, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    if (a.sky === 'thunderhead') {
      const cx = 512 + side * mix(70, 120, random()), lit = dusk ? '#ffb48a' : a.time === 'golden' ? '#ffe6c0' : '#f7f4ee', shade = hex(tone(time.top).lerp(new THREE.Color('#5d6470'), 0.4));
      const puff = (x: number, y: number, radius: number) => {
        const fill = ctx.createLinearGradient(x + side * radius, y - radius, x - side * radius, y + radius);
        fill.addColorStop(0, shade); fill.addColorStop(0.75, lit);
        ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, radius, 0, 7); ctx.fill();
      };
      ctx.fillStyle = lit; ctx.beginPath(); ctx.ellipse(cx, 296, 92, 13, 0, 0, 7); ctx.fill();
      for (let i = 0; i < 26; i++) { const t = random(); puff(cx + (random() - 0.5) * mix(40, 110, t * t), mix(304, 470, t), mix(22, 34, random())); }
      const rain = ctx.createLinearGradient(0, 468, 0, 497);
      rain.addColorStop(0, shade); rain.addColorStop(1, 'rgba(90,96,108,0)');
      ctx.fillStyle = rain; ctx.globalAlpha = 0.6; ctx.fillRect(cx - 44, 468, 78, 30); ctx.globalAlpha = 1;
    }
    if (a.sky === 'haze' || a.time === 'norther') {
      const band = ctx.createLinearGradient(0, 497, 0, a.time === 'norther' ? 380 : 430);
      band.addColorStop(0, a.time === 'norther' ? 'rgba(150,104,62,0.95)' : 'rgba(120,96,78,0.7)'); band.addColorStop(1, 'rgba(140,104,70,0)');
      ctx.fillStyle = band; ctx.fillRect(0, 380, 1024, 132);
      if (a.time === 'norther') for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(${150 + random() * 30},${104 + random() * 24},62,0.5)`; ctx.beginPath(); ctx.arc(280 + random() * 470, 497 - random() * 60, 14 + random() * 30, 0, 7); ctx.fill(); }
    }
    const skyMap = new THREE.CanvasTexture(canvas);
    skyMap.colorSpace = THREE.SRGBColorSpace;
    const backdrop = part(new THREE.PlaneGeometry(1400, 700), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }), [0, 330, -560], false);
    backdrop.receiveShadow = false;
    backdrop.renderOrder = -1;

    // Ground: one endless plane, mottled.
    const groundColour = warmShift(tone(place.ground)).multiplyScalar(time.shade);
    const roadColour = tone(place.road, place.ground, 0.1 + (1 - boom) * 0.25).multiplyScalar(time.shade);
    const tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    const paint = tile.getContext('2d')!;
    paint.fillStyle = hex(groundColour); paint.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) {
      paint.globalAlpha = 0.05 + random() * 0.12;
      paint.fillStyle = random() < 0.5 ? hex(groundColour.clone().multiplyScalar(0.8)) : hex(groundColour.clone().lerp(new THREE.Color('#ffffff'), 0.25));
      const x = random() * 256, y = random() * 256, w = 4 + random() * 26, h = 2 + random() * 8;
      for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { paint.beginPath(); paint.ellipse(x + dx, y + dy, w, h, 0, 0, 7); paint.fill(); }
    }
    const groundMap = new THREE.CanvasTexture(tile);
    groundMap.colorSpace = THREE.SRGBColorSpace;
    groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping;
    groundMap.repeat.set(1400 / 34, 1400 / 34);
    groundMap.anisotropy = 8;
    const groundGeometry = new THREE.PlaneGeometry(1400, 1400);
    groundGeometry.rotateX(-Math.PI / 2);
    const ground = part(groundGeometry, new THREE.MeshLambertMaterial({ map: groundMap }), [0, 0, -300], false);

    // Light.
    root.add(new THREE.HemisphereLight(tone(time.top, '#ffffff', 0.45), groundColour, time.sky));
    const key = new THREE.DirectionalLight(warmShift(tone(time.key)), time.power);
    const lift = time.lift * mix(0.8, 1.15, 1 - Math.abs(mood.daylight * 2 - 1));
    const sunward = new THREE.Vector3(-side * 0.85, lift, a.time === 'noon' ? 0.2 : -0.42).normalize();
    key.position.copy(new THREE.Vector3(0, 0, -30)).addScaledVector(sunward, 220);
    key.target.position.set(0, 0, -30);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0001;
    const fill = new THREE.DirectionalLight(dusk ? '#ffb07a' : '#ffffff', dusk ? 0.9 : 0.75);
    fill.position.set(12, 6, 50);
    root.add(key, key.target, fill);

    // The lease road: a pale ribbon with two worn ruts, pads at each location and spurs to reach them.
    const roadTile = document.createElement('canvas');
    roadTile.width = 128; roadTile.height = 128;
    const rut = roadTile.getContext('2d')!;
    rut.fillStyle = hex(roadColour); rut.fillRect(0, 0, 128, 128);
    for (const x of [30, 98]) { const worn = rut.createLinearGradient(x - 16, 0, x + 16, 0); worn.addColorStop(0, 'rgba(0,0,0,0)'); worn.addColorStop(0.5, a.road === 'puddles' ? 'rgba(70,56,40,0.5)' : 'rgba(110,92,66,0.32)'); worn.addColorStop(1, 'rgba(0,0,0,0)'); rut.fillStyle = worn; rut.fillRect(x - 16, 0, 32, 128); }
    for (let i = 0; i < 70; i++) { rut.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '90,74,54'},${0.08 + random() * 0.16})`; rut.fillRect(random() * 128, random() * 128, 2 + random() * 5, 2 + random() * 3); }
    for (let i = 0; i < Math.round((1 - boom) * 26); i++) { rut.fillStyle = hex(tone(place.grass).multiplyScalar(time.shade * 0.8)); rut.fillRect(56 + random() * 16, random() * 128, 2 + random() * 3, 3 + random() * 6); }
    const roadMap = new THREE.CanvasTexture(roadTile);
    roadMap.colorSpace = THREE.SRGBColorSpace; roadMap.wrapS = roadMap.wrapT = THREE.RepeatWrapping; roadMap.anisotropy = 8;
    {
      const stations = 60, positions: number[] = [], uvs: number[] = [], index: number[] = [];
      for (let i = 0; i <= stations; i++) {
        const z = 46 - (i / stations) ** 1.8 * 560, wide = 3.3;
        positions.push(roadX(z) - wide, 0.03, z, roadX(z) + wide, 0.03, z);
        uvs.push(0, z / 9, 1, z / 9);
        if (i < stations) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      ribbon.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      ribbon.setIndex(index);
      ribbon.computeVertexNormals();
      part(ribbon, new THREE.MeshLambertMaterial({ map: roadMap, side: THREE.DoubleSide, ...decal }), [0, 0, 0], false);
    }
    const padPaint = lambert(roadColour, decal);
    for (const [x, z, , wide] of SLOTS) {
      const pad = part(new THREE.CylinderGeometry(wide + 1.6, wide + 1.6, 0.05, 28), padPaint, [x, 0.02, z], false);
      pad.scale.z = 0.86;
      const from = new THREE.Vector2(roadX(z + 4), z + 4), to = new THREE.Vector2(x, z);
      const spur = part(new THREE.BoxGeometry(4.2, 0.04, from.distanceTo(to)), padPaint, [(from.x + to.x) / 2, 0.02, (from.y + to.y) / 2], false);
      spur.rotation.y = Math.atan2(to.x - from.x, to.y - from.y);
    }
    const clear = (x: number, z: number, margin = 1) => Math.abs(x - roadX(z)) > 3.6 + margin && SLOTS.every(([sx, sz, , wide]) => Math.hypot(x - sx, z - sz) > wide + 1.6 + margin);

    // Scrub and bunch grass.
    {
      const bushes = Math.round(mix(160, 620, mood.density) * (a.place === 'kern' ? 0.4 : a.place === 'bakken' ? 0.5 : 1));
      const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ flatShading: true }), bushes);
      const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 1, 5), new THREE.MeshLambertMaterial({ flatShading: true }), bushes);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
      const bushColour = tone(place.bush).multiplyScalar(time.shade), grassColour = tone(place.grass).multiplyScalar(time.shade);
      const spot = (): [number, number] => {
        for (let tries = 0; tries < 12; tries++) {
          const z = 14 - random() ** 1.5 * 320, x = (random() - 0.5) * (70 + (31 - z) * 1.25);
          if (clear(x, z)) return [x, z];
        }
        return [70, -200];
      };
      for (let i = 0; i < bushes; i++) {
        let [x, z] = spot();
        const size = mix(0.35, 1.05, random() ** 2);
        matrix.compose(new THREE.Vector3(x, size * 0.45, z), turn.setFromAxisAngle(yAxis, random() * 6.28), new THREE.Vector3(size * mix(1, 1.6, random()), size * mix(0.55, 0.9, random()), size * mix(1, 1.5, random())));
        bush.setMatrixAt(i, matrix);
        bush.setColorAt(i, far(bushColour.clone().offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.1), z));
        [x, z] = spot();
        const tall = mix(0.3, 0.9, random());
        matrix.compose(new THREE.Vector3(x, tall / 2, z), turn.identity(), new THREE.Vector3(mix(0.8, 1.8, random()), tall, mix(0.8, 1.8, random())));
        grass.setMatrixAt(i, matrix);
        grass.setColorAt(i, far(grassColour.clone().offsetHSL(0, 0, (random() - 0.5) * 0.12), z));
      }
      add(bush); add(grass);
    }

    // Distant pumpjacks: one silhouette instanced to the horizon, beams nodding.
    const frame = new THREE.Shape([[-1.9, 0], [-0.25, 5.1], [0.25, 5.1], [1.9, 0], [1.3, 0], [0, 4.2], [-1.3, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const box = new THREE.Shape([[2.3, 0], [2.3, 2.9], [4.6, 2.9], [4.6, 1.1], [6.4, 1.1], [6.4, 0]].map(([x, y]) => new THREE.Vector2(x, y)));
    const weight = new THREE.Shape();
    weight.absarc(3.5, 2.1, 1.7, -0.5, Math.PI + 0.5, false);
    const skid = new THREE.Shape([[-4.6, 0], [6.6, 0], [6.6, 0.35], [-4.6, 0.35]].map(([x, y]) => new THREE.Vector2(x, y)));
    const beamShape = new THREE.Shape();
    beamShape.moveTo(-4.4 * Math.cos(0.33), 4.4 * Math.sin(0.33));
    beamShape.absarc(0, 0, 4.4, Math.PI - 0.33, Math.PI + 0.38, false);
    beamShape.lineTo(-2.9, -0.3); beamShape.lineTo(3.9, -0.3); beamShape.lineTo(3.9, 0.42); beamShape.lineTo(-2.9, 0.42);
    const jackCount = Math.round(mix(12, 34, mood.density) * mix(0.7, 1.3, boom) * (a.place === 'kern' ? 2.1 : 1));
    const jackPaint = new THREE.MeshLambertMaterial();
    const bases = new THREE.InstancedMesh(new THREE.ExtrudeGeometry([frame, box, weight, skid], { depth: 0.8, bevelEnabled: false, curveSegments: 8 }), jackPaint, jackCount);
    const beams = new THREE.InstancedMesh(new THREE.ExtrudeGeometry(beamShape, { depth: 0.5, bevelEnabled: false, curveSegments: 8 }), jackPaint, jackCount);
    const jacks: { base: THREE.Matrix4; phase: number; speed: number; rest: number }[] = [];
    {
      const colours = ['#232527', '#232527', '#7c452b', '#c9621f', '#2c5fae', '#3f7a3a', '#8b8f8c'];
      const at = new THREE.Vector3(), turn = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), size = new THREE.Vector3();
      for (let i = 0; i < jackCount; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 20; tries++) {
          z = i < 5 ? mix(-48, -100, random()) : a.place === 'kern' ? mix(-70, -380, random() ** 0.9) : mix(-90, -400, random() ** 0.85);
          x = i < 5 ? (random() < 0.5 ? -1 : 1) * mix(24, 58, random()) : (random() - 0.5) * (-z * 1.2 + 60);
          if (clear(x, z, 9)) break;
        }
        const scale = mix(1.1, 1.9, random());
        const base = new THREE.Matrix4().compose(at.set(x, 0, z), turn.setFromAxisAngle(yAxis, (random() < 0.5 ? 0 : Math.PI) + (random() - 0.5) * 1.1), size.setScalar(scale));
        bases.setMatrixAt(i, base);
        const working = random() < mix(0.12, 1, boom);
        const colour = far(tone(colours[Math.floor(random() * colours.length)]).lerp(new THREE.Color('#7b4a30'), working ? mood.wear * 0.4 : 0.55).multiplyScalar(time.shade), z);
        bases.setColorAt(i, colour); beams.setColorAt(i, colour);
        jacks.push({ base, phase: random() * 6.28, speed: working ? mix(0.5, 1.4, random()) : 0, rest: (random() - 0.5) * 0.5 });
      }
    }
    const pivot = new THREE.Matrix4().makeTranslation(0, 5.3, 0.15), nod = new THREE.Matrix4(), posed = new THREE.Matrix4();
    const pump = (seconds: number) => {
      jacks.forEach((jack, i) => {
        nod.makeRotationZ(jack.speed ? Math.sin(seconds * jack.speed * mix(0.35, 1.5, mood.energy) + jack.phase) * 0.26 : jack.rest);
        beams.setMatrixAt(i, posed.copy(jack.base).multiply(pivot).multiply(nod));
      });
      beams.instanceMatrix.needsUpdate = true;
    };
    pump(0);
    add(bases, false); add(beams, false);

    // Tank batteries, flares and the chosen skyline.
    const pale = tone(a.place === 'baku' ? '#8d8f8c' : '#d8cdb2').multiplyScalar(time.shade);
    const batteryCount = (a.horizon === 'batteries' ? 9 : 3) + Math.round(mood.density * 2);
    {
      const tanks = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.3, 2.3, 5, 14), new THREE.MeshLambertMaterial(), batteryCount * 4);
      const matrix = new THREE.Matrix4();
      let n = 0;
      for (let b = 0; b < batteryCount; b++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 20; tries++) { z = mix(-120, -430, random()); x = (random() - 0.5) * (-z * 1.2 + 40); if (clear(x, z, 12)) break; }
        const count = 2 + Math.floor(random() * 3), tall = mix(0.8, 1.25, random());
        for (let i = 0; i < 4; i++) {
          if (i < count) matrix.makeScale(1, tall, 1).setPosition(x + i * 5.2, 2.5 * tall, z); else matrix.makeScale(0, 0, 0);
          tanks.setMatrixAt(n, matrix);
          tanks.setColorAt(n++, far(pale.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06), z));
        }
      }
      add(tanks, false);
    }
    const flames: { mesh: THREE.Mesh; glow: THREE.Mesh | null; tall: number; phase: number }[] = [];
    {
      const drop = new THREE.LatheGeometry([[0, 0], [0.2, 0.05], [0.34, 0.2], [0.36, 0.38], [0.27, 0.6], [0.14, 0.82], [0, 1]].map(([r, y]) => new THREE.Vector2(r, y)), 10);
      const fire = new THREE.MeshBasicMaterial({ color: '#ffb23a', fog: false }), core = new THREE.MeshBasicMaterial({ color: '#fff0a8', fog: false });
      const halo = new THREE.MeshBasicMaterial({ color: '#ff8a3a', transparent: true, opacity: dusk ? 0.22 : a.time === 'noon' ? 0.04 : 0.1, depthWrite: false, fog: false });
      const flareCount = 1 + Math.round(boom * 5) + (dusk ? 1 : 0);
      for (let i = 0; i < flareCount; i++) {
        let x = 0, z = 0;
        for (let tries = 0; tries < 20; tries++) { z = i === 0 ? mix(-60, -82, random()) : mix(-110, -420, random()); x = (i === 0 ? mix(36, 46, random()) : (random() - 0.5) * (-z * 1.1 + 30)); if (clear(x, z, 10)) break; }
        const pole = mix(11, 17, random()), tall = (i === 0 ? mix(8, 11, random()) : mix(5, 10, random())) * mix(0.75, 1.2, boom);
        part(new THREE.CylinderGeometry(0.22, 0.26, pole, 6), lambert(far(tone('#4a4541').multiplyScalar(time.shade), z)), [x, pole / 2, z], z > -200);
        const mesh = part(drop, fire, [x, pole, z], false);
        mesh.rotation.z = -side * mix(0.2, 0.7, mood.energy);
        const inner = new THREE.Mesh(drop, core);
        inner.scale.setScalar(0.55);
        mesh.add(inner);
        const glow = part(new THREE.CircleGeometry(tall * 1.5, 20), halo, [x, pole + tall * 0.4, z + 0.5], false);
        flames.push({ mesh, glow, tall, phase: random() * 6.28 });
        // A scorched patch under it.
        const scorch = part(new THREE.CircleGeometry(7, 12), lambert(far(new THREE.Color('#2a221c'), z), decal), [x, 0.03, z], false);
        scorch.rotation.x = -Math.PI / 2;
      }
    }
    const flicker = (seconds: number) => {
      for (const flame of flames) {
        const wave = Math.sin(seconds * 8 + flame.phase) * mix(0.06, 0.3, mood.energy);
        flame.mesh.scale.set(flame.tall * 0.62 * (1 - wave * 0.4), flame.tall * (1 + wave), flame.tall * 0.62);
        if (flame.glow) flame.glow.scale.setScalar(1 + wave * 0.5);
      }
    };
    flicker(0);

    const spinners: THREE.Object3D[] = [];
    const skyline = (count: number, near: number, deep: number, make: (x: number, z: number) => void) => {
      for (let i = 0; i < count; i++) { const z = mix(near, deep, random()), x = ((i + random()) / count - 0.5) * (-z * 1.05 + 40); make(x, z); }
    };
    if (a.horizon === 'rigs' || boom > 0.8) skyline(a.horizon === 'rigs' ? 4 : 1, -170, -400, (x, z) => {
      const steel = lambert(far(tone('#c9cdd0').multiplyScalar(time.shade), z));
      part(new THREE.BoxGeometry(9, 7, 9), steel, [x, 3.5, z], false);
      const mast = part(new THREE.CylinderGeometry(1.1, 2.4, 40, 4), steel, [x, 27, z], false);
      mast.rotation.y = Math.PI / 4;
      part(new THREE.BoxGeometry(16, 4, 5), steel, [x + 14, 2, z], false);
      const lights = new THREE.MeshBasicMaterial({ color: dusk ? '#fff2c0' : '#fff8e0', fog: false });
      for (let k = 0; k < 9; k++) part(new THREE.SphereGeometry(dusk ? 0.75 : 0.45, 6, 5), lights, [x + (k % 2 ? 1.6 : -1.6) * (1 - k / 12), 9 + k * 4.2, z + 2], false);
    });
    if (a.horizon === 'turbines') skyline(7 + Math.round(mood.density * 5), -260, -520, (x, z) => {
      const white = lambert(far(tone('#eef0ee').multiplyScalar(time.shade), z));
      part(new THREE.CylinderGeometry(0.9, 1.6, 80, 8), white, [x, 40, z], false);
      const hub = new THREE.Group();
      hub.position.set(x, 80, z + 2);
      for (let k = 0; k < 3; k++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 38, 0.5), white); blade.geometry.translate(0, 19, 0); blade.rotation.z = k * Math.PI * 2 / 3; hub.add(blade); }
      hub.rotation.z = random() * 6;
      spinners.push(add(hub, false));
    });
    if (a.horizon === 'mesa' || a.place === 'kern') {
      const rock = lambert(far(tone(a.place === 'kern' ? '#cfb878' : '#a5795a').multiplyScalar(time.shade), -330));
      if (a.place === 'kern') for (let i = 0; i < 9; i++) { const hill = part(new THREE.SphereGeometry(1, 20, 8), rock, [-420 + i * 105 + random() * 50, -2, -500 + random() * 40], false); hill.scale.set(90 + random() * 80, 22 + random() * 30, 40); }
      else {
        const profile = new THREE.Shape();
        profile.moveTo(-520, 0);
        let x = -520;
        while (x < 520) { const top = 16 + random() * 16, run = 60 + random() * 140; profile.lineTo(x + 14, top); profile.lineTo(x + run, top + (random() - 0.5) * 3); profile.lineTo(x + run + 16, random() < 0.3 ? 2 : top * 0.55); x += run + 30 + random() * 40; }
        profile.lineTo(540, 0);
        part(new THREE.ExtrudeGeometry(profile, { depth: 30, bevelEnabled: false }), rock, [0, -0.5, -540], false);
      }
    }
    if (a.place === 'baku') skyline(10 + Math.round(mood.density * 8), -130, -440, (x, z) => {
      const tall = mix(15, 24, random());
      const derrick = part(new THREE.CylinderGeometry(1.0, tall * 0.22, tall, 4), lambert(far(tone('#2f2823').multiplyScalar(time.shade), z)), [x, tall / 2, z], false);
      derrick.rotation.y = Math.PI / 4;
    });
    if (a.place === 'baku') for (let i = 0; i < 9; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 20; tries++) { z = mix(22, -90, random()); x = (random() - 0.5) * 80; if (clear(x, z, 2)) break; }
      const pool = part(new THREE.CircleGeometry(mix(1.5, 5, random()), 18), new THREE.MeshStandardMaterial({ color: '#0d0b0a', roughness: 0.12, metalness: 0.5, ...decal }), [x, 0.03, z], false);
      pool.rotation.x = -Math.PI / 2; pool.scale.y = mix(0.4, 0.8, random());
    }
    if (a.place === 'oklahoma') for (let i = 0; i < 7; i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 20; tries++) { z = mix(4, -150, random()); x = (random() - 0.5) * 120; if (clear(x, z, 3)) break; }
      const bale = part(new THREE.CylinderGeometry(0.9, 0.9, 1.5, 14), lambert(far(tone('#c9b060').multiplyScalar(time.shade), z)), [x, 0.9, z]);
      bale.rotation.z = Math.PI / 2; bale.rotation.y = random() * 3;
    }
    if (a.time === 'norther') for (let i = 0; i < 16; i++) {
      const cloud = part(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: tone('#9a6c42').multiplyScalar(mix(0.85, 1.1, random())), flatShading: true }), [-480 + i * 64 + random() * 30, 8, -500 + random() * 20], false);
      cloud.scale.set(50 + random() * 30, 32 + random() * 34, 20);
    }

    // Power line along the left of the road.
    const creosote = lambert(tone('#4f3d2e').multiplyScalar(time.shade)), wire = lambert('#2a2826');
    {
      const heads: THREE.Vector3[][] = [];
      for (let i = 0; i < 12; i++) {
        const z = 23 - i * 40, x = roadX(z) - 6.2, tall = 9.6;
        const pole = new THREE.Group();
        pole.position.set(x, 0, z);
        pole.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, tall, 7).translate(0, tall / 2, 0), creosote));
        pole.add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.12).translate(0, tall - 0.6, 0), creosote));
        for (const dx of [-1.15, 0, 1.15]) pole.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.22, 6).translate(dx, tall - 0.42, 0), lambert('#d9dcd4')));
        if (i === 1) { pole.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 10).translate(0.42, tall - 1.7, 0), lambert('#8d9294'))); }
        pole.rotation.z = (random() - 0.5) * (0.02 + mood.wear * 0.1 + (1 - boom) * 0.05);
        pole.rotation.x = (random() - 0.5) * 0.03;
        add(pole, i < 6);
        pole.updateMatrix();
        heads.push([-1.15, 0, 1.15].map((dx) => new THREE.Vector3(dx, tall - 0.3, 0).applyMatrix4(pole.matrix)));
      }
      for (let i = 0; i < heads.length - 1; i++) for (let k = 0; k < 3; k++) {
        const from = heads[i][k], to = heads[i + 1][k], sag = from.clone().lerp(to, 0.5);
        sag.y -= 0.9;
        part(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(from, sag, to), 10, i < 3 ? 0.03 : 0.05, 4), wire, [0, 0, 0], false);
      }
    }

    // Fence along the right of the road.
    if (a.fence) {
      const posts = 46;
      const cedar = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.07, 1.45, 6), lambert(tone('#6f5a45').multiplyScalar(time.shade)), posts);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), tilt = new THREE.Euler();
      for (let i = 0; i < posts; i++) {
        const z = 26 - i * 5.2;
        matrix.compose(new THREE.Vector3(roadX(z) + 4.3, 0.7, z), turn.setFromEuler(tilt.set((random() - 0.5) * 0.12, 0, (random() - 0.5) * (0.06 + mood.wear * 0.25))), new THREE.Vector3(1, 1, 1));
        cedar.setMatrixAt(i, matrix);
      }
      add(cedar);
      const from = new THREE.Vector3(roadX(26) + 4.3, 0, 26), to = new THREE.Vector3(roadX(26 - posts * 5.2) + 4.3, 0, 26 - posts * 5.2);
      for (const y of [0.55, 0.9, 1.25]) {
        const strand = part(new THREE.BoxGeometry(0.025, 0.025, from.distanceTo(to)), wire, [(from.x + to.x) / 2, y, (from.z + to.z) / 2], false);
        strand.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
      }
    }

    // Roadside foreground.
    const steel = lambert(tone('#d9d5c8').multiplyScalar(time.shade));
    const board = (text: string, wide: number, tall: number, at: readonly [number, number, number], ink: string, paper: string, turn = 0.25) => {
      const face = document.createElement('canvas');
      face.width = 512; face.height = Math.max(64, Math.round(512 * tall / wide));
      const pen = face.getContext('2d')!;
      pen.fillStyle = paper; pen.fillRect(0, 0, face.width, face.height);
      pen.fillStyle = ink; pen.textAlign = 'center'; pen.textBaseline = 'middle';
      pen.font = `bold ${Math.min(face.height * 0.62, 512 / Math.max(text.length, 1) * 1.45)}px sans-serif`;
      pen.fillText(text, 256, face.height / 2, 480);
      const map = new THREE.CanvasTexture(face);
      map.colorSpace = THREE.SRGBColorSpace;
      const mesh = part(new THREE.BoxGeometry(wide, tall, 0.04), [lambert('#3a3a38'), lambert('#3a3a38'), lambert('#3a3a38'), lambert('#3a3a38'), new THREE.MeshLambertMaterial({ map }), lambert('#3a3a38')] as unknown as THREE.Material, at);
      mesh.rotation.y = turn; mesh.rotation.z = (random() - 0.5) * (0.03 + mood.wear * 0.15);
      return mesh;
    };
    const signZ = 13.5, signX = roadX(signZ) + 5.6;
    if (a.sign === 'leases') {
      const names = ['HOLT RANCH 14', 'MABEE "B" UNIT', 'UNIVERSITY 9-2', 'COWDEN NORTH', 'YATES 31H', 'SCHARBAUER 7', 'WADDELL TXL'];
      const papers = [['#1f2a24', '#efe9d6'], ['#f1ede0', '#24418f'], ['#1b1b1b', '#e3b81f'], ['#f1ede0', '#a5362b'], ['#f1ede0', '#2f5d43']];
      for (const dx of [-0.85, 0.85]) part(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 6), steel, [signX + dx * Math.cos(0.25), 1.8, signZ - dx * Math.sin(0.25)]);
      const count = 4 + Math.round(boom * 2);
      for (let i = 0; i < count; i++) { const [ink, paper] = papers[Math.floor(random() * papers.length)]; board(names[(i + Math.floor(random() * 7)) % 7], 1.6, 0.42, [signX, 3.3 - i * 0.5, signZ + 0.06], ink, paper); }
    }
    if (a.sign === 'h2s') {
      part(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), steel, [signX, 1.3, signZ]);
      board('DANGER', 1.5, 0.45, [signX, 2.35, signZ + 0.06], '#ffffff', '#c22b23');
      board('POISON GAS', 1.5, 0.45, [signX, 1.85, signZ + 0.06], '#c22b23', '#f4f0e2');
      part(new THREE.CylinderGeometry(0.04, 0.04, 5, 6), steel, [signX + 2.2, 2.5, signZ - 1]);
      const sock = part(new THREE.CylinderGeometry(0.07, 0.22, 1.3, 8, 1, true), new THREE.MeshLambertMaterial({ color: '#e8641f', side: THREE.DoubleSide }), [signX + 2.2 - side * 0.6, 4.85, signZ - 1]);
      sock.rotation.z = side * (Math.PI / 2 - mix(0.9, 0.05, mood.energy));
    }
    if (a.sign === 'caution') {
      part(new THREE.CylinderGeometry(0.05, 0.05, 2.7, 6), steel, [signX, 1.35, signZ]);
      const diamond = board('TRUCKS', 1.15, 1.15, [signX, 2.55, signZ + 0.06], '#1b1b1b', '#e9c62a');
      diamond.rotation.z = Math.PI / 4;
      board('15 MPH', 0.9, 0.36, [signX, 1.45, signZ + 0.06], '#1b1b1b', '#f4f0e2');
    }
    if (a.sign === 'cross') {
      const white = lambert('#f3f1ea');
      const cx = signX - 0.6, cz = signZ + 3;
      part(new THREE.BoxGeometry(0.1, 1.3, 0.08), white, [cx, 0.65, cz]);
      part(new THREE.BoxGeometry(0.75, 0.1, 0.08), white, [cx, 0.98, cz]);
      const hat = part(new THREE.SphereGeometry(0.15, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), lambert('#e9c62a'), [cx, 1.29, cz]);
      hat.scale.set(1, 0.9, 1.15);
      for (let i = 0; i < 16; i++) part(new THREE.IcosahedronGeometry(0.07, 0), lambert(['#d8332b', '#e9c62a', '#e06aa8', '#f3f1ea', '#5a7fd0'][i % 5]), [cx + (random() - 0.5) * 0.7, 0.08 + random() * 0.3, cz + 0.1 + random() * 0.35]);
      part(new THREE.TorusGeometry(0.2, 0.05, 6, 14), lambert('#3f8a45'), [cx, 0.98, cz + 0.06]);
    }
    if (a.road === 'gate') {
      const gz = 17, gx = roadX(gz);
      for (const dx of [-3.9, 3.9]) part(new THREE.CylinderGeometry(0.11, 0.11, 1.9, 8), steel, [gx + dx, 0.95, gz]);
      for (let i = 0; i < 9; i++) part(new THREE.CylinderGeometry(0.055, 0.055, 7.4, 6).rotateZ(Math.PI / 2), lambert(tone('#6b6f70').multiplyScalar(time.shade)), [gx, 0.07, gz - 1 + i * 0.25], false);
      const gate = new THREE.Group();
      gate.position.set(gx + 3.9, 0, gz);
      for (const y of [0.35, 0.75, 1.15, 1.5]) gate.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 5.6, 6).rotateZ(Math.PI / 2).translate(2.8, y, 0), steel));
      for (const x of [0.1, 2.8, 5.55]) gate.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 6).translate(x, 0.92, 0), steel));
      gate.rotation.y = mix(0.9, 1.35, random());
      add(gate);
    }
    if (a.road === 'puddles') for (let i = 0; i < 9; i++) {
      const z = 22 - i * 11 - random() * 5, rutSide = i % 2 ? 1.75 : -1.75;
      const puddle = part(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: tone(time.mid).lerp(tone(time.top), 0.45), ...decal, polygonOffsetFactor: -4 }), [roadX(z) + rutSide, 0.035, z], false);
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(0.6 + random() * 0.4, 2.5 + random() * 4, 1);
    }
    const dust: { mesh: THREE.Mesh; phase: number; y: number }[] = [];
    if (a.road === 'truck' || boom > 0.85) {
      const tz = -mix(70, 120, random()), tx = roadX(tz);
      part(new THREE.BoxGeometry(2, 1.1, 5.4), lambert(tone('#e9e7df').multiplyScalar(time.shade)), [tx, 1.0, tz]);
      part(new THREE.BoxGeometry(1.9, 0.8, 1.9), lambert(tone('#e9e7df').multiplyScalar(time.shade)), [tx, 1.9, tz + 0.9]);
      part(new THREE.BoxGeometry(1.7, 0.5, 0.05), lambert('#27323a'), [tx, 1.95, tz + 1.87], false);
      for (const dx of [-0.7, 0.7]) part(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshBasicMaterial({ color: '#fff6d0' }), [tx + dx, 1.05, tz + 2.72], false);
      const haze = new THREE.MeshLambertMaterial({ color: roadColour.clone().lerp(horizonColour, 0.35), transparent: true, opacity: 0.55, depthWrite: false, flatShading: true });
      for (let i = 0; i < 12; i++) {
        const back = 3 + i * 5.5, size = 1.4 + i * 0.75;
        const mesh = part(new THREE.IcosahedronGeometry(1, 1), haze, [roadX(tz - back) + (random() - 0.5) * 2 - side * i * 0.9, size * 0.7, tz - back], false);
        mesh.scale.set(size * 1.3, size * 0.8, size * 1.2);
        dust.push({ mesh, phase: random() * 6.28, y: size * 0.7 });
      }
    }
    // Litter of a working field: pipe joints, drums and a tumbleweed, by density and wear.
    for (let i = 0; i < Math.round(mood.density * 4 + mood.wear * 3); i++) {
      let x = 0, z = 0;
      for (let tries = 0; tries < 20; tries++) { z = mix(20, -40, random()); x = (random() - 0.5) * 50; if (clear(x, z, 1.5)) break; }
      if (i % 3 === 0) { const joint = part(new THREE.CylinderGeometry(0.08, 0.08, 9, 8), lambert(tone('#7c4a31').multiplyScalar(time.shade)), [x, 0.1, z]); joint.rotation.set(Math.PI / 2, 0, random() * 3, 'YXZ'); joint.rotation.y = random() * 3; }
      else if (i % 3 === 1) part(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12), lambert(tone(['#2767b0', '#7c4a31', '#2a2c2e'][i % 3]).multiplyScalar(time.shade)), [x, 0.44, z]);
      else part(new THREE.IcosahedronGeometry(0.55, 1), new THREE.MeshLambertMaterial({ color: tone('#a48d5c').multiplyScalar(time.shade), wireframe: true }), [x, 0.5, z]);
    }

    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1500);
    camera.position.copy(cameraAt);
    const world: World = {
      object: root, camera, background: horizonColour, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          const scale = Math.min(tall / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, 0.045, z);
          item.holder.rotation.y = Math.atan2(cameraAt.x - x, cameraAt.z - z) * 0.75 + (context.random() - 0.5) * 0.45;
        });
        camera.lookAt(1.5, 10.6, -29);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -85; shadow.right = 85; shadow.bottom = -85; shadow.top = 85;
        shadow.near = 20; shadow.far = 460;
        shadow.updateProjectionMatrix();
      },
      update(dt, seconds) {
        pump(seconds);
        flicker(seconds);
        for (const hub of spinners) hub.rotation.z += dt * mix(0.2, 1.4, mood.energy);
        for (const puff of dust) puff.mesh.position.y = puff.y + Math.sin(seconds * 0.7 + puff.phase) * 0.25;
      },
      dispose() { key.shadow.map?.dispose(); skyMap.dispose(); groundMap.dispose(); roadMap.dispose(); disposeTree(root); },
    };
    return world;
  },
});
