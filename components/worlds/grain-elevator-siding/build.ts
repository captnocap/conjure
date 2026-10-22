import * as THREE from 'three';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix, noul } from '@conjure/kit';

// Standing places: x, z, tallest and widest (radius) a thing may be there. The hero is first and nearest.
const SLOTS: readonly (readonly [number, number, number, number])[] = [[2.5, 13, 11, 5], [14, -4, 9, 4.5], [-8, -6, 9, 4.2], [-20, -31, 11, 5.5], [2, -29, 12, 6]];
const SKIES = {
  harvest: { top: '#6f93bd', mid: '#ecc994', low: '#f8e0aa', key: '#ffd49a', power: 4.4, hemi: 0.6, lift: 0.3, shade: 1 },
  bluesky: { top: '#5f97d2', mid: '#b9d6ea', low: '#eaf0ea', key: '#fff8ea', power: 4.2, hemi: 0.7, lift: 0.8, shade: 1 },
  dustbowl: { top: '#9c8566', mid: '#c0a074', low: '#d3b27e', key: '#f0cf9c', power: 2.5, hemi: 0.95, lift: 0.55, shade: 0.9 },
  storm: { top: '#3d4652', mid: '#59626e', low: '#e2cf90', key: '#fff0c4', power: 4.6, hemi: 0.5, lift: 0.26, shade: 0.95 },
  dusk: { top: '#4b5587', mid: '#b97f90', low: '#f4ae70', key: '#ffb98a', power: 2.8, hemi: 0.8, lift: 0.2, shade: 0.8 },
  overcast: { top: '#b9c0c6', mid: '#d3d6d6', low: '#e6e6e0', key: '#f1efe8', power: 2.2, hemi: 1.1, lift: 0.7, shade: 0.95 },
} as const;
const SEASONS = {
  wheat: { ground: '#b99a57', field: '#d8ad48', street: '#cfc3a6' },
  stubble: { ground: '#b9a36a', field: '#cdb672', street: '#cfc3a6' },
  dust: { ground: '#b1936a', field: '#a98a63', street: '#c4ad88' },
  snow: { ground: '#e6eaec', field: '#f0f3f4', street: '#cfd2d0' },
  green: { ground: '#8f9c5a', field: '#7fa450', street: '#c9bfa4' },
} as const;
const PAINT = { red: ['#8a3423', '#f1ead8'], white: ['#e6e1d2', '#2a2622'], grey: ['#8b857a', '#e4ddcc'], green: ['#3c6649', '#f1ead8'], silver: ['#b3babd', '#27323a'] } as const;
const NAMES = { plenty: 'PLENTY', hope: 'HOPE', forget: 'FORGET', success: 'SUCCESS', paradise: 'PARADISE', bountiful: 'BOUNTIFUL', dry: 'DRY CREEK' } as const;
type P = readonly [number, number, number];

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing?', {
      harvest: 'Late harvest light: a low gold sun and long shadows.',
      bluesky: 'A towering blue noon with rows of flat-bottomed clouds marching to the horizon.',
      dustbowl: 'Dust-bowl haze: the sun a pale disc in a brown sky, the horizon gone.',
      storm: 'A slate-black storm front behind sunlit elevators.',
      dusk: 'Dusk: violet overhead, an orange band along the edge of the world.',
      overcast: 'A flat white overcast, shadowless and quiet.',
    }),
    elevators: choice('What stands beside the siding?', {
      row: 'A row of three wooden elevators, the classic prairie skyline.',
      concrete: 'A concrete terminal: a block of tall white silos with a head house.',
      mixed: 'One old wooden elevator in front of a newer concrete terminal.',
      lone: 'A single survivor leaning over the bare foundations of the others.',
    }),
    paint: choice('What colour are the wooden elevators?', {
      red: 'Boxcar red.', white: 'White.', grey: 'Bare weathered grey.', green: 'Co-op green.', silver: 'Silver tin.',
    }),
    name: choice('What town name is painted on the elevator and the sign?', {
      plenty: 'PLENTY.', hope: 'HOPE.', forget: 'FORGET.', success: 'SUCCESS.', paradise: 'PARADISE.', bountiful: 'BOUNTIFUL.', dry: 'DRY CREEK.',
    }),
    season: choice('What is the land like?', {
      wheat: 'Standing wheat, gold to the horizon.',
      stubble: 'Cut stubble dotted with round bales.',
      dust: 'Bare blown soil, drifted against the fences.',
      snow: 'Snow, drifted and wind-packed.',
      green: 'Spring green, the crop just up.',
    }),
    town: choice('How much of the town is left along the street?', {
      thriving: 'A full row of false-front stores, still open.',
      holding: 'Three buildings holding on.',
      emptied: 'Two empty shells, one with its roof caved in.',
      gone: 'Nothing but foundations, a chimney and the fallen town sign.',
    }),
    cars: choice('What is on the siding?', {
      none: 'Nothing: rusty rails and weeds.',
      boxcars: 'A string of oxide-red boxcars spotted at the elevators.',
      hoppers: 'Grey covered hoppers being loaded.',
      derelict: 'One derelict boxcar left behind.',
    }),
    horizon: choice('What breaks the horizon?', {
      nothing: 'Nothing at all.',
      nexttown: 'The next town’s elevator, a tiny tooth ten miles off.',
      farm: 'A farmstead in a shelterbelt of trees.',
      devil: 'A dust devil wandering across the fields.',
      combine: 'A combine working, trailing a plume of chaff.',
    }),
    birds: noul('Are birds sitting on the telegraph wires?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const sky = SKIES[a.sky], season = SEASONS[a.season];
    const grey = new THREE.Color('#9c9a96');
    const tone = (hexIn: THREE.ColorRepresentation, toward: THREE.ColorRepresentation = grey, amount = (1 - mood.cheer) * 0.18) => new THREE.Color(hexIn).lerp(new THREE.Color(toward), amount);
    const hex = (colour: THREE.Color) => '#' + colour.getHexString();
    const warmShift = (colour: THREE.Color) => colour.lerp(new THREE.Color(mood.warmth > 0.5 ? '#ffb070' : '#bcd2f0'), Math.abs(mood.warmth - 0.5) * 0.25);
    const horizonColour = warmShift(tone(sky.low));
    const side = mood.daylight < 0.5 ? 1 : -1;
    const dusk = a.sky === 'dusk', dusty = a.sky === 'dustbowl';
    const wear = mood.wear;
    const cameraAt = new THREE.Vector3(0, 2.4, 34);
    const haze = dusty ? 150 : a.sky === 'overcast' ? 320 : 480;
    const far = (colour: THREE.Color, z: number) => colour.clone().lerp(horizonColour, Math.min(0.85, Math.max(0, (-z - 30) / haze)));
    const shade = (hexIn: THREE.ColorRepresentation, z = 0) => far(warmShift(tone(hexIn)).multiplyScalar(sky.shade), z);
    const add = <T extends THREE.Object3D>(node: T, shadow = true) => {
      node.traverse((child) => { const mesh = child as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = shadow; mesh.receiveShadow = true; } });
      root.add(node);
      return node;
    };
    const part = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P = [0, 0, 0], shadow = true, parent: THREE.Object3D = root) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lambert = (colour: THREE.ColorRepresentation, options: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color: colour, ...options });
    const decal = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
    const glowMat = new THREE.MeshBasicMaterial({ color: '#ffd486' });
    const textures: THREE.Texture[] = [];
    const texture = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      textures.push(map);
      return map;
    };

    // Sky: a painted backdrop. The visible part is roughly x 310..715, y 200..497 of this canvas; the horizon is y 497.
    const skyMap = texture(1024, 512, (ctx) => {
      const wash = ctx.createLinearGradient(0, 512, 0, 0);
      wash.addColorStop(0, hex(horizonColour)); wash.addColorStop(0.035, hex(horizonColour)); wash.addColorStop(a.sky === 'storm' ? 0.07 : 0.17, hex(warmShift(tone(sky.mid)))); wash.addColorStop(0.5, hex(tone(sky.top))); wash.addColorStop(1, hex(tone(sky.top).multiplyScalar(0.9)));
      ctx.fillStyle = wash; ctx.fillRect(0, 0, 1024, 512);
      const sunX = 512 - side * mix(70, 140, random()), sunY = 497 - { harvest: 44, bluesky: 420, dustbowl: 150, storm: 30, dusk: -8, overcast: 300 }[a.sky];
      if (a.sky !== 'bluesky' && a.sky !== 'overcast') {
        const reach = dusk ? 260 : dusty ? 120 : 170;
        const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, reach);
        halo.addColorStop(0, dusty ? 'rgba(246,232,200,0.6)' : 'rgba(255,238,190,0.85)'); halo.addColorStop(1, 'rgba(255,238,190,0)');
        ctx.fillStyle = halo; ctx.fillRect(0, 0, 1024, 512);
        if (a.sky === 'harvest' || dusty) { ctx.fillStyle = dusty ? '#f4ead2' : '#fff2c4'; ctx.beginPath(); ctx.arc(sunX, sunY, dusty ? 10 : 13, 0, 7); ctx.fill(); }
      }
      const lit = dusk ? '#ffbf96' : a.sky === 'harvest' ? '#ffeccb' : '#fbfaf5';
      const under = hex(tone(sky.top).lerp(new THREE.Color('#6a7380'), 0.45));
      const cumulus = (cx: number, base: number, size: number) => {
        ctx.fillStyle = under; ctx.beginPath(); ctx.ellipse(cx, base, size * 1.5, size * 0.2, 0, 0, 7); ctx.fill();
        for (let i = 0; i < 9; i++) {
          const dx = (random() - 0.5) * size * 2.4, r = size * (0.35 + random() * 0.45) * (1 - Math.abs(dx) / (size * 2.2));
          const fill = ctx.createLinearGradient(0, base - r * 1.8, 0, base + 2);
          fill.addColorStop(0, lit); fill.addColorStop(0.7, lit); fill.addColorStop(1, under);
          ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(cx + dx, base - r * 0.75, r, 0, 7); ctx.fill();
        }
      };
      if (a.sky === 'bluesky' || a.sky === 'harvest') {
        const rows = a.sky === 'bluesky' ? 7 : 3;
        for (let row = 0; row < rows; row++) {
          const t = row / Math.max(1, rows - 1);
          const base = a.sky === 'bluesky' ? mix(478, 250, t * t) : mix(440, 330, t), size = mix(5, 44, t * t) * (a.sky === 'bluesky' ? 1 : 0.6);
          for (let x = 250 + random() * size * 3; x < 780; x += size * mix(3.4, 6.5, random())) if (random() < 0.55 + mood.density * 0.4) cumulus(x, base + (random() - 0.5) * size * 0.4, size * mix(0.7, 1.2, random()));
        }
      } else if (a.sky === 'storm') {
        const wall = ctx.createLinearGradient(0, 180, 0, 470);
        wall.addColorStop(0, 'rgba(40,46,56,0)'); wall.addColorStop(0.5, 'rgba(40,46,56,0.75)'); wall.addColorStop(1, 'rgba(52,58,68,0.9)');
        ctx.fillStyle = wall; ctx.fillRect(0, 180, 1024, 290);
        for (let i = 0; i < 90; i++) { const v = Math.round(52 + random() * 34); ctx.fillStyle = `rgba(${v},${v + 7},${v + 20},0.22)`; ctx.beginPath(); ctx.ellipse(250 + random() * 520, 250 + random() * 215, 30 + random() * 60, 10 + random() * 16, 0, 0, 7); ctx.fill(); }
        for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(232,214,160,0.55)'; ctx.beginPath(); ctx.arc(250 + random() * 520, 468 + random() * 8, 7 + random() * 12, 0, 7); ctx.fill(); }
        const rain = ctx.createLinearGradient(0, 462, 0, 497);
        rain.addColorStop(0, 'rgba(60,66,78,0.8)'); rain.addColorStop(1, 'rgba(60,66,78,0)');
        ctx.fillStyle = rain; ctx.fillRect(512 + side * 40 - 60, 462, 120, 36);
      } else if (dusk) {
        for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(255,${150 + random() * 50},${120 + random() * 40},${0.25 + random() * 0.35})`; ctx.beginPath(); ctx.ellipse(300 + random() * 430, 330 + random() * 150, 30 + random() * 90, 2 + random() * 4, -0.03, 0, 7); ctx.fill(); }
      } else if (dusty) {
        const band = ctx.createLinearGradient(0, 497, 0, 330);
        band.addColorStop(0, 'rgba(150,108,66,0.9)'); band.addColorStop(1, 'rgba(150,108,66,0)');
        ctx.fillStyle = band; ctx.fillRect(0, 330, 1024, 182);
        for (let i = 0; i < 46; i++) { ctx.fillStyle = `rgba(${Math.round(150 + random() * 30)},${Math.round(106 + random() * 24)},66,0.25)`; ctx.beginPath(); ctx.arc(260 + random() * 500, 497 - random() * 80, 14 + random() * 36, 0, 7); ctx.fill(); }
      } else {
        for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '150,156,162'},${0.08 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(250 + random() * 520, 220 + random() * 260, 50 + random() * 110, 6 + random() * 12, 0, 0, 7); ctx.fill(); }
      }
    });
    const backdrop = part(new THREE.PlaneGeometry(1400, 700), new THREE.MeshBasicMaterial({ map: skyMap, fog: false }), [0, 330, -560], false);
    backdrop.receiveShadow = false;
    backdrop.renderOrder = -1;

    // Ground: one endless mottled plane.
    const groundColour = shade(season.ground);
    const mottle = (base: THREE.Color, grain = 260) => texture(256, 256, (ctx) => {
      ctx.fillStyle = hex(base); ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < grain; i++) {
        ctx.globalAlpha = 0.05 + random() * 0.12;
        ctx.fillStyle = random() < 0.5 ? hex(base.clone().multiplyScalar(0.8)) : hex(base.clone().lerp(new THREE.Color('#ffffff'), 0.25));
        const x = random() * 256, y = random() * 256, w = 3 + random() * 22, h = 2 + random() * 7;
        for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, w, h, 0, 0, 7); ctx.fill(); }
      }
    });
    const groundMap = mottle(groundColour);
    groundMap.wrapS = groundMap.wrapT = THREE.RepeatWrapping; groundMap.repeat.set(90, 90);
    const ground = part(new THREE.PlaneGeometry(1800, 1800), new THREE.MeshLambertMaterial({ map: groundMap }), [0, 0, -300], false);
    ground.rotation.x = -Math.PI / 2;
    const flat = (width: number, depth: number, colour: THREE.Color, at: P, grainy = true) => {
      const map = grainy ? mottle(colour, 500) : null;
      if (map) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(Math.max(1, width / 14), Math.max(1, depth / 14)); }
      const mesh = part(new THREE.PlaneGeometry(width, depth), new THREE.MeshLambertMaterial({ color: map ? '#ffffff' : colour, map, ...decal }), at, false);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };
    // Main street stub, the cross road to the tracks, and the bare elevator yard.
    const streetColour = shade(season.street);
    flat(9.5, 110, streetColour, [-8, 0.02, -8]);
    flat(52, 8, streetColour, [5, 0.022, -38]);
    flat(34, 150, shade(season.street, -40).lerp(groundColour, 0.45), [8, 0.015, -100]);
    for (const x of [-10.2, -5.8]) flat(0.9, 100, streetColour.clone().multiplyScalar(0.86), [x + (random() - 0.5) * 0.3, 0.03, -6], false);

    // Fields to both sides.
    const fieldColour = shade(season.field);
    const standing = a.season === 'wheat' || a.season === 'green';
    const fieldH = a.season === 'wheat' ? 0.95 : a.season === 'green' ? 0.3 : 0.04;
    for (const [x0, x1] of [[-420, -40], [36, 420]] as const) {
      const fieldMap = mottle(fieldColour, 600);
      fieldMap.wrapS = fieldMap.wrapT = THREE.RepeatWrapping; fieldMap.repeat.set(40, 60);
      part(new THREE.BoxGeometry(x1 - x0, fieldH, 600), [lambert(fieldColour.clone().multiplyScalar(0.8)), lambert(fieldColour.clone().multiplyScalar(0.8)), new THREE.MeshLambertMaterial({ map: fieldMap }), lambert(fieldColour), lambert(fieldColour.clone().multiplyScalar(0.72)), lambert(fieldColour)], [(x0 + x1) / 2, fieldH / 2, -255], standing);
    }
    // Horizon haze so the far ground melts into the sky.
    const hazeMap = texture(8, 64, (ctx) => { const g = ctx.createLinearGradient(0, 64, 0, 0); g.addColorStop(0, hex(horizonColour)); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 64); });
    const veil = new THREE.MeshBasicMaterial({ map: hazeMap, color: horizonColour, transparent: true, opacity: dusty ? 0.95 : 0.55, depthWrite: false });
    part(new THREE.PlaneGeometry(1400, dusty ? 60 : 16), veil, [0, dusty ? 30 : 8, -530], false).receiveShadow = false;
    if (dusty) part(new THREE.PlaneGeometry(900, 40), new THREE.MeshBasicMaterial({ map: hazeMap, color: horizonColour, transparent: true, opacity: 0.5, depthWrite: false }), [0, 20, -230], false).receiveShadow = false;

    const posts: { at: P; lean: number }[] = [];
    for (const x of [-40, 36]) for (let z = 26; z > -330; z -= 6.5) posts.push({ at: [x + (random() - 0.5) * 0.3, 0.6, z], lean: (random() - 0.5) * (0.1 + wear * 0.5) });
    const postMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 1.4, 5), lambert(shade('#6d6253')), posts.length);
    const dummy = new THREE.Object3D();
    posts.forEach((post, index) => { dummy.position.set(...post.at); dummy.rotation.set(post.lean, 0, post.lean * 0.7); dummy.scale.setScalar(1); dummy.updateMatrix(); postMesh.setMatrixAt(index, dummy.matrix); });
    add(postMesh);
    for (const x of [-40, 36]) for (const y of [0.75, 1.1]) part(new THREE.BoxGeometry(0.02, 0.02, 356), lambert(shade('#55504a')), [x, y, -152], false);
    if (a.season === 'dust' || a.season === 'snow') {
      const drift = lambert(a.season === 'snow' ? shade('#f4f6f7') : shade('#c0a377'));
      for (let i = 0; i < 26; i++) {
        const x = random() > 0.5 ? -40 : 36, z = 24 - random() * 200;
        const mound = part(new THREE.SphereGeometry(1, 12, 6), drift, [x + (random() - 0.5) * 2, -0.1, z], false);
        mound.scale.set(2 + random() * 3, 0.5 + random() * 0.6, 4 + random() * 7);
      }
      for (let i = 0; i < 8; i++) { const mound = part(new THREE.SphereGeometry(1, 12, 6), drift, [-14 + random() * 3, -0.1, -12 - random() * 60], false); mound.scale.set(2.5 + random() * 2, 0.5 + random() * 0.5, 3 + random() * 4); }
    }
    if (a.season === 'stubble') {
      const bales = Array.from({ length: 46 }, () => ({ x: (random() > 0.5 ? -1 : 1) * (52 + random() * 220), z: 10 - random() * 330, turn: random() * 0.5 }));
      const baleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.95, 0.95, 1.5, 14), lambert('#ffffff'), bales.length);
      bales.forEach((bale, index) => { dummy.position.set(bale.x, 0.95, bale.z); dummy.rotation.set(0, bale.turn, Math.PI / 2); dummy.scale.setScalar(1); dummy.updateMatrix(); baleMesh.setMatrixAt(index, dummy.matrix); baleMesh.setColorAt(index, shade('#d9be73', bale.z)); });
      add(baleMesh);
    }
    // Verge grass.
    const tufts = Array.from({ length: 1500 }, () => {
      const pick = random();
      const x = pick < 0.35 ? (random() > 0.5 ? -13.4 : -2.6) + (random() - 0.5) * 1.4 : pick < 0.65 ? 14.5 + random() * 16 : -38 + random() * 70;
      const z = 24 - random() * random() * 260; return { x: x + (random() - 0.5) * 0.5, z, size: 0.35 + random() * 0.6 };
    }).filter((tuft) => !(tuft.z < -34 && tuft.z > -42 && tuft.x < 30) && !(Math.abs(tuft.x + 8) < 4.9));
    const tuftMesh = new THREE.InstancedMesh(new THREE.ConeGeometry(0.16, 1, 4), lambert('#ffffff'), tufts.length);
    const tuftTint = a.season === 'snow' ? '#b9b08e' : a.season === 'green' ? '#7d9a4e' : '#b7a55e';
    tufts.forEach((tuft, index) => { dummy.position.set(tuft.x, tuft.size * 0.45, tuft.z); dummy.rotation.set((random() - 0.5) * 0.4, random() * 3, (random() - 0.5) * 0.4); dummy.scale.set(tuft.size * 0.32, tuft.size * 0.75, tuft.size * 0.32); dummy.updateMatrix(); tuftMesh.setMatrixAt(index, dummy.matrix); tuftMesh.setColorAt(index, shade(tuftTint, tuft.z).multiplyScalar(0.85 + random() * 0.3)); });
    add(tuftMesh, false);

    // Railway: main line and the siding that leaves it.
    const MAIN = 22, SIDING = 17;
    const ballast = lambert(shade(a.season === 'snow' ? '#c9cccb' : '#9a9184', -60));
    part(new THREE.BoxGeometry(3.4, 0.3, 700), ballast, [MAIN, 0.15, -290], false);
    part(new THREE.BoxGeometry(3.4, 0.3, 215), ballast, [SIDING, 0.15, -127.5], false);
    const lead = part(new THREE.BoxGeometry(3.4, 0.3, 22), ballast, [(MAIN + SIDING) / 2, 0.15, -10], false);
    lead.rotation.y = Math.atan2(MAIN - SIDING, 20);
    const railMat = lambert(shade(wear > 0.5 || a.cars === 'none' ? '#7a513a' : '#5d5b5c', -40));
    const ties: P[] = [];
    for (let z = 44; z > -470; z -= 0.75) ties.push([MAIN, 0.33, z]);
    for (let z = -20; z > -235; z -= 0.75) ties.push([SIDING, 0.33, z]);
    for (let i = 0; i < 26; i++) ties.push([mix(MAIN, SIDING, i / 26), 0.33, -i * 0.77]);
    const tieMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.5, 0.12, 0.24), lambert('#ffffff'), ties.length);
    ties.forEach((tie, index) => { dummy.position.set(...tie); dummy.rotation.set(0, (random() - 0.5) * wear * 0.12, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); tieMesh.setMatrixAt(index, dummy.matrix); tieMesh.setColorAt(index, shade('#4f4439', tie[2]).multiplyScalar(0.85 + random() * 0.3)); });
    add(tieMesh, false);
    for (const dx of [-0.72, 0.72]) {
      part(new THREE.BoxGeometry(0.08, 0.16, 700), railMat, [MAIN + dx, 0.45, -290], false);
      part(new THREE.BoxGeometry(0.08, 0.16, 215), railMat, [SIDING + dx, 0.45, -127.5], false);
      const curve = part(new THREE.BoxGeometry(0.08, 0.16, 20.7), railMat, [(MAIN + SIDING) / 2 + dx, 0.45, -10], false);
      curve.rotation.y = Math.atan2(MAIN - SIDING, 20);
    }
    // Switch stand with its target.
    part(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6), lambert('#2b2b2d'), [MAIN + 2.4, 0.85, 1]);
    part(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12), lambert(shade(a.cars === 'none' ? '#8a6a5a' : '#b3261d')), [MAIN + 2.4, 1.75, 1]).rotation.x = Math.PI / 2;
    // Bumper post at the end of the siding.
    part(new THREE.BoxGeometry(2.4, 1.2, 0.5), lambert(shade('#5a4a3c', -235)), [SIDING, 0.9, -236]);

    // Telegraph poles marching off beside the main line.
    const POLE_X = 27.5;
    const poleMat = (z: number) => lambert(shade('#5b4c3e', z));
    const tops: { top: THREE.Vector3; tilt: number; z: number }[] = [];
    for (let i = 0; i < 11; i++) {
      const z = 16 - i * 44, tilt = (random() - 0.5) * (0.04 + wear * 0.3);
      const g = new THREE.Group();
      g.position.set(POLE_X, 0, z);
      g.rotation.z = tilt;
      part(new THREE.CylinderGeometry(0.11, 0.16, 9.4, 7), poleMat(z), [0, 4.7, 0], true, g);
      for (const [y, w] of [[8.7, 2.5], [7.9, 2.0]] as const) {
        if (y < 8 && random() < wear * 0.5) continue;
        part(new THREE.BoxGeometry(w, 0.13, 0.13), poleMat(z), [0, y, 0], true, g);
        for (const x of [-w / 2 + 0.15, -w / 6, w / 6, w / 2 - 0.15]) part(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 5), lambert(shade('#7fb0a4', z)), [x, y + 0.14, 0], false, g);
      }
      add(g);
      tops.push({ top: new THREE.Vector3(POLE_X - Math.sin(tilt) * 8.8, Math.cos(tilt) * 8.8, z), tilt, z });
    }
    const wirePoints: THREE.Vector3[] = [];
    for (let i = 0; i < tops.length - 1; i++) {
      const from = tops[i], to = tops[i + 1];
      for (const dx of [-1.1, -0.4, 0.4, 1.1]) {
        if (random() < wear * 0.35) continue;
        const p0 = from.top.clone().add(new THREE.Vector3(dx, 0, 0)), p1 = to.top.clone().add(new THREE.Vector3(dx, 0, 0));
        const midpoint = p0.clone().lerp(p1, 0.5); midpoint.y -= 0.9 + random() * 0.5;
        const curve = new THREE.QuadraticBezierCurve3(p0, midpoint.clone().setY(midpoint.y - 0.9), p1);
        part(new THREE.TubeGeometry(curve, 10, 0.022 + i * 0.006, 3), lambert(shade('#3a3836', from.z)), [0, 0, 0], false);
        if (i < 2) for (let k = 0; k < 6; k++) wirePoints.push(curve.getPoint(0.15 + random() * 0.7));
      }
    }
    if (a.birds && wirePoints.length) {
      const flock = wirePoints.filter(() => random() < 0.5 + mood.density * 0.4);
      const birdMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 5), lambert('#24242a'), Math.max(1, flock.length));
      flock.forEach((point, index) => { dummy.position.set(point.x, point.y + 0.1, point.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1.3, 1.5); dummy.updateMatrix(); birdMesh.setMatrixAt(index, dummy.matrix); });
      add(birdMesh, false);
    }

    // Elevators.
    const [paintHex, inkHex] = PAINT[a.paint];
    const town = NAMES[a.name];
    const tin = a.paint === 'silver';
    const boards = (colour: THREE.Color, width: number, height: number, lettering?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => texture(256, Math.min(1024, Math.round(256 * height / width)), (ctx) => {
      const w = 256, h = ctx.canvas.height, rows = Math.round(height / 0.45);
      ctx.fillStyle = hex(colour); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < rows; i++) {
        let x = 0;
        while (x < w) {
          const run = w * (0.15 + random() * 0.5), r = random();
          ctx.fillStyle = r < wear * 0.15 ? `rgba(84,76,66,${0.2 + random() * 0.35})` : `rgba(${r > 0.6 ? '255,255,255' : '0,0,0'},${random() * (0.03 + wear * 0.07)})`;
          ctx.fillRect(x, (i * h) / rows, run, h / rows); x += run;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, ((i + 1) * h) / rows - 1, w, 1);
      }
      for (let i = 0; i < wear * 16; i++) { const g = ctx.createLinearGradient(0, 0, 0, h * 0.5); g.addColorStop(0, 'rgba(50,44,38,0.4)'); g.addColorStop(1, 'rgba(50,44,38,0)'); ctx.fillStyle = g; ctx.fillRect(random() * w, 0, 3 + random() * 8, h * 0.5); }
      lettering?.(ctx, w, h);
    });
    const taper = (w0: number, d0: number, w1: number, d1: number, h: number) => {
      const lo = [[-w0 / 2, 0, d0 / 2], [w0 / 2, 0, d0 / 2], [w0 / 2, 0, -d0 / 2], [-w0 / 2, 0, -d0 / 2]], hi = [[-w1 / 2, h, d1 / 2], [w1 / 2, h, d1 / 2], [w1 / 2, h, -d1 / 2], [-w1 / 2, h, -d1 / 2]];
      const v: number[] = [];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; v.push(...lo[i], ...lo[j], ...hi[j], ...lo[i], ...hi[j], ...hi[i]); }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geometry.computeVertexNormals();
      return geometry;
    };
    const prism = (points: readonly (readonly [number, number])[], depth: number) => {
      const geometry = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
      geometry.translate(0, 0, -depth / 2);
      return geometry;
    };
    const wooden = (x: number, z: number, H: number, banner: string, lean = 0, annex = true) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.z = lean;
      const colour = shade(paintHex, z).lerp(shade('#8f887b', z), wear * 0.4);
      const ink = shade(inkHex, z);
      const sideMat = new THREE.MeshLambertMaterial({ map: boards(colour, 9, H) });
      const faceMat = new THREE.MeshLambertMaterial({
        map: boards(colour, 9.4, H, (ctx, w, h) => {
          ctx.globalAlpha = mix(0.95, 0.45, wear); ctx.fillStyle = hex(ink); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = `bold ${Math.min(74, (w * 1.5) / town.length)}px Georgia, serif`;
          ctx.fillText(town, w / 2, h * 0.48, w * 0.9);
          if (banner) { ctx.font = `bold ${Math.min(46, (w * 1.3) / banner.length)}px Arial, sans-serif`; ctx.fillText(banner, w / 2, h * 0.24, w * 0.84); ctx.lineWidth = 3; ctx.strokeStyle = hex(ink); ctx.strokeRect(w * 0.08, h * 0.24 - 34, w * 0.84, 68); }
          ctx.globalAlpha = 1;
        }),
      });
      const roof = lambert(shade(tin ? '#9aa1a3' : a.paint === 'white' ? '#3d4a44' : '#4a423b', z), { side: THREE.DoubleSide });
      part(new THREE.BoxGeometry(9.4, H, 9.2), [sideMat, sideMat, roof, roof, faceMat, sideMat], [0, H / 2, 0], true, g);
      part(taper(9.9, 9.7, 4.7, 7.7, 2.6), roof, [0, H, 0], true, g);
      part(new THREE.BoxGeometry(4.4, 4.2, 7.4), lambert(colour), [0, H + 2.6 + 2.1, 0], true, g);
      part(prism([[-2.55, 0], [2.55, 0], [0, 1.7]], 8.1), roof, [0, H + 6.8, 0], true, g);
      for (const wx of [-0.9, 0.9]) part(new THREE.BoxGeometry(0.75, 1, 0.06), lambert('#1d1a17'), [wx, H + 5, 3.72], false, g);
      if (annex) {
        const ah = H * 0.7, drop = 3.2;
        part(new THREE.BoxGeometry(6.2, ah - drop, 8.4), sideMat, [-4.7 - 3.1, (ah - drop) / 2, 0], true, g);
        part(prism([[0, ah - drop], [-6.2, ah - drop], [0, ah]], 8.4), lambert(colour.clone().multiplyScalar(0.94)), [-4.7, 0, 0], true, g);
        part(prism([[0.1, ah + 0.1], [-6.6, ah - drop - 0.25], [-6.6, ah - drop - 0.05], [0.1, ah + 0.3]], 9), roof, [-4.7, 0, 0], true, g);
      }
      // Drive shed out front with its ramp.
      part(new THREE.BoxGeometry(4.8, 5, 6.5), sideMat, [-2.2, 2.5, 4.6 + 3.25], true, g);
      part(prism([[-2.6, 5], [2.6, 5], [2.6, 5.2], [0, 6.2], [-2.6, 5.2]], 7), roof, [-2.2, 0, 4.6 + 3.25], true, g);
      part(new THREE.BoxGeometry(3.3, 4, 0.08), lambert(wear > 0.6 ? colour.clone().multiplyScalar(0.8) : '#1d1a17'), [-2.2, 2, 4.6 + 6.52], false, g);
      part(new THREE.BoxGeometry(1.1, 0.9, 0.08), dusk ? glowMat : lambert('#2b3238'), [3, 2, 4.62], false, g);
      if (a.cars !== 'none' && lean === 0) { const spout = part(new THREE.CylinderGeometry(0.2, 0.2, 6.5, 8), lambert(shade('#8f9596', z)), [4.7 + 2.2, H * 0.55, 0], true, g); spout.rotation.z = 0.75; }
      add(g);
    };
    const concrete = (x: number, z: number) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      const colour = shade('#ddd7c8', z);
      const streak = texture(256, 256, (ctx) => {
        ctx.fillStyle = hex(colour); ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 40 + wear * 80; i++) { const g2 = ctx.createLinearGradient(0, 0, 0, 256); g2.addColorStop(0, `rgba(70,66,60,${0.1 + wear * 0.3})`); g2.addColorStop(1, 'rgba(70,66,60,0)'); ctx.fillStyle = g2; ctx.fillRect(random() * 256, 0, 2 + random() * 9, 60 + random() * 190); }
        for (let y = 0; y < 256; y += 256 / 14) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(0, y, 256, 1.5); }
      });
      const wall = new THREE.MeshLambertMaterial({ map: streak });
      const R = 3.7, H = 31;
      for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) part(new THREE.CylinderGeometry(R, R, H, 20), wall, [(i - 1.5) * R * 1.96, H / 2, -row * R * 1.96], true, g);
      part(new THREE.BoxGeometry(R * 8.1, 4.4, R * 2.6), lambert(colour.clone().multiplyScalar(0.97)), [0, H + 2.2, -R], true, g);
      const sign = texture(512, 96, (ctx) => { ctx.fillStyle = hex(colour.clone().multiplyScalar(0.97)); ctx.fillRect(0, 0, 512, 96); ctx.fillStyle = hex(shade('#2c4a6e', z)); ctx.globalAlpha = mix(0.95, 0.5, wear); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 64px Arial, sans-serif'; ctx.fillText(`${town} TERMINAL`, 256, 50, 490); });
      part(new THREE.PlaneGeometry(R * 7.6, 3.2), new THREE.MeshLambertMaterial({ map: sign }), [0, H + 2.2, -R + R * 1.31], false, g);
      for (let i = 0; i < 9; i++) part(new THREE.BoxGeometry(0.9, 1.1, 0.06), dusk ? glowMat : lambert('#39424a'), [(i - 4) * R * 0.85, H + 0.3, 0.33], false, g).visible = false;
      part(new THREE.BoxGeometry(8, 45, 9), wall, [-R * 4 - 4.2, 22.5, -R], true, g);
      part(new THREE.BoxGeometry(8.6, 0.6, 9.6), lambert(colour.clone().multiplyScalar(0.9)), [-R * 4 - 4.2, 45.2, -R], true, g);
      for (let i = 0; i < 5; i++) part(new THREE.BoxGeometry(1.2, 1.4, 0.08), dusk && i % 2 ? glowMat : lambert('#39424a'), [-R * 4 - 4.2, 12 + i * 7, -R + 4.55], false, g);
      part(new THREE.CylinderGeometry(0.3, 0.3, 14, 8), lambert(shade('#8f9596', z)), [R * 4 + 3, H * 0.6, -R], true, g).rotation.z = 0.9;
      add(g);
    };
    const stump = (x: number, z: number) => {
      part(new THREE.BoxGeometry(10, 0.6, 9.6), lambert(shade('#aaa598', z)), [x, 0.3, z]);
      for (let i = 0; i < 9; i++) { const beam = part(new THREE.BoxGeometry(0.3, 0.3, 4 + random() * 5), lambert(shade('#6f5d49', z)), [x + (random() - 0.5) * 11, 0.8 + random() * 0.5, z + (random() - 0.5) * 10]); beam.rotation.set((random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.5); }
    };
    const banners = ['POOL', 'CO-OP', 'GRAIN GROWERS', ''];
    if (a.elevators === 'row') { wooden(7, -52, 24, banners[Math.floor(random() * 4)]); wooden(7.5, -94, 22, banners[Math.floor(random() * 4)], 0, random() > 0.3); wooden(6.5, -138, 25, banners[Math.floor(random() * 4)]); }
    else if (a.elevators === 'concrete') concrete(0, -84);
    else if (a.elevators === 'mixed') { wooden(7, -52, 23.5, banners[Math.floor(random() * 3)]); concrete(-1, -118); }
    else { wooden(7, -54, 24, 'POOL', -mix(0.04, 0.09, random()), false); stump(7, -92); stump(7.5, -132); }

    // Cars on the siding.
    const boxcar = (z: number, colourHex: string, derelict = false) => {
      const g = new THREE.Group();
      g.position.set(SIDING, 0.55, z);
      const colour = shade(colourHex, z);
      part(new THREE.BoxGeometry(2.95, 3.1, 12.3), lambert(colour), [0, 2.55, 0], true, g);
      part(new THREE.BoxGeometry(3.05, 0.14, 12.5), lambert(colour.clone().multiplyScalar(0.7)), [0, 4.15, 0], true, g);
      part(new THREE.BoxGeometry(0.5, 0.08, 12), lambert(shade('#6a655c', z)), [0, 4.28, 0], false, g);
      const door = part(new THREE.BoxGeometry(0.1, 2.8, 2.2), lambert(derelict ? '#1d1a17' : colour.clone().multiplyScalar(0.84)), [-1.5, 2.5, derelict ? 0 : 0.2], false, g);
      if (derelict) part(new THREE.BoxGeometry(0.1, 2.8, 2.2), lambert(colour.clone().multiplyScalar(0.84)), [-1.56, 2.5, 2.3], false, g);
      void door;
      for (const tz of [-4.3, 4.3]) { part(new THREE.BoxGeometry(2.3, 0.7, 2.4), lambert('#26262a'), [0, 0.5, tz], true, g); }
      part(new THREE.BoxGeometry(0.4, 0.3, 13.3), lambert('#26262a'), [0, 0.8, 0], false, g);
      if (derelict) g.rotation.z = 0.03;
      add(g);
    };
    const hopper = (z: number) => {
      const g = new THREE.Group();
      g.position.set(SIDING, 0.55, z);
      const colour = shade(random() > 0.5 ? '#9a9c98' : '#8a6a4c', z);
      const body = part(prism([[-6.4, 4.4], [6.4, 4.4], [6.4, 2.9], [4.4, 0.95], [-4.4, 0.95], [-6.4, 2.9]], 3), lambert(colour), [0, 0, 0], true, g);
      body.rotation.y = Math.PI / 2;
      for (let i = -4; i <= 4; i++) part(new THREE.BoxGeometry(3.12, 1.5, 0.12), lambert(colour.clone().multiplyScalar(0.85)), [0, 3.65, i * 1.45], false, g);
      part(new THREE.BoxGeometry(1.2, 0.2, 11), lambert(colour.clone().multiplyScalar(0.75)), [0, 4.5, 0], false, g);
      for (const tz of [-5, 5]) part(new THREE.BoxGeometry(2.3, 0.7, 2.4), lambert('#26262a'), [0, 0.5, tz], true, g);
      add(g);
    };
    if (a.cars === 'boxcars') for (let i = 0; i < 7; i++) boxcar(-40 - i * 13.6, ['#7a3526', '#8a3d2a', '#6e3a2c', '#5d4a3a'][Math.floor(random() * 4)]);
    if (a.cars === 'hoppers') for (let i = 0; i < 7; i++) hopper(-40 - i * 14.2);
    if (a.cars === 'derelict') boxcar(-36 - random() * 20, '#6e4a3a', true);

    // The cross road meets the rails: a crossbuck.
    {
      const cx = 13.2, cz = -33;
      part(new THREE.CylinderGeometry(0.07, 0.08, 3.6, 6), lambert(shade('#e9e6dc', cz)), [cx, 1.8, cz]);
      for (const turn of [0.6, -0.6]) part(new THREE.BoxGeometry(2.3, 0.26, 0.05), lambert(shade('#f1eee4', cz)), [cx, 3.2, cz + 0.06], false).rotation.z = turn + (wear > 0.6 ? 0.2 : 0);
    }

    // Main street: what is left of the town, facing the street from the left.
    const SHOPS = ['HOTEL', 'CAFE', 'HARDWARE', 'BANK', 'POOL HALL', 'DRUGS'];
    const shop = (z: number, width: number, colourHex: string, label: string, state: 'open' | 'shut' | 'caved') => {
      const g = new THREE.Group();
      g.position.set(-14.6, 0, z);
      const colour = shade(colourHex, z).lerp(shade('#8f887b', z), wear * 0.4);
      const depth = 9, body = 4.2, front = 6 + random() * 1.2;
      const sideMat = new THREE.MeshLambertMaterial({ map: boards(colour, width, body * 2.2) });
      part(new THREE.BoxGeometry(depth, body, width), sideMat, [-depth / 2, body / 2, 0], true, g);
      const roofMat = lambert(shade('#4d463e', z), { side: THREE.DoubleSide });
      const gableRoof = part(prism([[-width / 2 - 0.2, 0], [width / 2 + 0.2, 0], [0, 1.6]], depth), roofMat, [-depth / 2, body, 0], true, g);
      gableRoof.rotation.y = Math.PI / 2;
      if (state === 'caved') { gableRoof.rotation.z = 0.35; gableRoof.position.y = body - 1.2; }
      const faceMat = new THREE.MeshLambertMaterial({
        map: boards(colour, width, front, (ctx, w, h) => {
          ctx.globalAlpha = state === 'open' ? 0.9 : mix(0.6, 0.25, wear); ctx.fillStyle = hex(shade('#2b2622', z)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.2);
          ctx.fillStyle = hex(shade('#f0e8d4', z)); ctx.font = `bold ${Math.min(h * 0.15, (w * 1.2) / label.length)}px Georgia, serif`; ctx.fillText(label, w / 2, h * 0.2, w * 0.78);
          ctx.globalAlpha = 1;
        }),
      });
      part(new THREE.BoxGeometry(0.2, front, width + 0.4), [faceMat, sideMat, sideMat, sideMat, sideMat, sideMat], [0.1, front / 2, 0], true, g);
      part(new THREE.BoxGeometry(0.5, 0.2, width + 0.7), lambert(colour.clone().multiplyScalar(0.8)), [0.15, front + 0.05, 0], true, g);
      const glass = state === 'open' && (dusk || a.sky === 'storm') ? glowMat : lambert(shade('#262b30', z));
      part(new THREE.BoxGeometry(0.06, 2.2, 1), lambert(shade('#3d342b', z)), [0.22, 1.5, 0], false, g);
      for (const s of [-1, 1]) {
        part(new THREE.BoxGeometry(0.06, 1.5, width * 0.28), glass, [0.22, 1.9, s * width * 0.29], false, g);
        if (state !== 'open') for (let i = 0; i < 3; i++) part(new THREE.BoxGeometry(0.07, 0.22, width * 0.34), lambert(shade('#8d8272', z)), [0.27, 1.45 + i * 0.45, s * width * 0.29], false, g).rotation.x = (random() - 0.5) * 0.2;
      }
      part(new THREE.BoxGeometry(2, 0.35, width + 1), lambert(shade('#8d8272', z)), [1.1, 0.18, 0], true, g);
      if (state === 'open') {
        const porch = part(new THREE.BoxGeometry(2.2, 0.1, width + 0.6), roofMat, [1.2, 3.25, 0], true, g);
        porch.rotation.z = -0.12;
        for (const s of [-1, 0, 1]) part(new THREE.CylinderGeometry(0.06, 0.07, 2.8, 6), lambert(shade('#e9e3d2', z)), [2.05, 1.72, s * (width / 2 - 0.1)], true, g);
      }
      add(g);
    };
    const shopColours = ['#c79a45', '#e3ddcd', '#96493c', '#7fa69b', '#918a7e'];
    const lots = [-13, -52, -64.5, -77];
    const states: ('open' | 'shut' | 'caved')[] = a.town === 'thriving' ? ['open', 'open', 'open', 'open'] : a.town === 'holding' ? ['open', 'shut', 'open'] : a.town === 'emptied' ? ['shut', 'caved'] : [];
    states.forEach((state, index) => shop(lots[index], 8 + random() * 3, shopColours[Math.floor(random() * shopColours.length)], SHOPS[(index + Math.floor(random() * 3)) % SHOPS.length], state));
    for (let index = states.length; index < 4; index++) {
      const z = lots[index];
      part(new THREE.BoxGeometry(9, 0.45, 9), lambert(shade('#aaa598', z)), [-19.5, 0.22, z]);
      part(new THREE.BoxGeometry(1.6, 0.3, 2.2), lambert(shade('#b5b0a4', z)), [-14.2, 0.15, z]);
      if (index % 2 === 0) { part(new THREE.BoxGeometry(1.1, 5.5 - random() * 2, 1.1), lambert(shade('#8a5a48', z)), [-22, 2.4, z - 2]); }
    }
    // Town sign in the foreground.
    {
      const fallen = a.town === 'gone';
      const pop = { thriving: 'POP. 212', holding: 'POP. 43', emptied: 'POP. 3', gone: 'POP. 0' }[a.town];
      const map = texture(256, 128, (ctx) => {
        ctx.fillStyle = hex(shade(a.town === 'thriving' ? '#2f6b46' : '#d9d3c0')); ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = ctx.fillStyle = hex(shade(a.town === 'thriving' ? '#f4efe0' : '#2a2622')); ctx.lineWidth = 5; ctx.strokeRect(7, 7, 242, 114);
        ctx.globalAlpha = mix(1, 0.6, wear); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(52, 330 / town.length)}px Georgia, serif`; ctx.fillText(town, 128, 48, 226);
        ctx.font = 'bold 28px Arial, sans-serif'; ctx.fillText(pop, 128, 96);
      });
      const g = new THREE.Group();
      g.position.set(-13.6, 0, 3);
      part(new THREE.BoxGeometry(2.3, 1.15, 0.07), [lambert('#8d8272'), lambert('#8d8272'), lambert('#8d8272'), lambert('#8d8272'), new THREE.MeshLambertMaterial({ map }), lambert('#8d8272')], [0, 2.1, 0], true, g);
      for (const x of [-0.95, 0.95]) part(new THREE.BoxGeometry(0.11, 2.7, 0.11), lambert(shade('#6d6253')), [x, 1.35, -0.06], true, g);
      g.rotation.y = 0.3;
      if (fallen) { g.rotation.set(-1.35, 0.5, 0.1); g.position.y = 0.25; g.position.z = 4; }
      else g.rotation.z = (random() - 0.5) * wear * 0.3;
      add(g);
    }

    // Horizon.
    const dustPuffs: { mesh: THREE.Mesh; phase: number; y: number }[] = [];
    let devil: THREE.Group | null = null;
    const hz = -500;
    const silhouette = lambert(far(shade('#5d5a58'), -430));
    if (a.horizon === 'nexttown') {
      const hx = -90 - random() * 60;
      part(new THREE.BoxGeometry(9, 22, 9), silhouette, [hx, 11, hz], false);
      part(new THREE.BoxGeometry(4.5, 6, 7), silhouette, [hx, 25, hz], false);
      part(new THREE.BoxGeometry(6, 15, 8), silhouette, [hx - 7.5, 7.5, hz], false);
      for (let i = 0; i < 5; i++) part(new THREE.BoxGeometry(8, 4 + random() * 3, 8), silhouette, [hx - 30 - i * 14, 2.5, hz], false);
      part(new THREE.CylinderGeometry(4, 4, 6, 10), silhouette, [hx + 30, 22, hz], false);
      part(new THREE.CylinderGeometry(0.6, 0.6, 20, 6), silhouette, [hx + 30, 10, hz], false);
    } else if (a.horizon === 'farm') {
      const hx = -110 - random() * 60, fz = -330;
      const trees = lambert(far(shade(a.season === 'snow' ? '#5a554c' : '#4f6a3f'), fz));
      for (let i = 0; i < 16; i++) { const tree = part(new THREE.IcosahedronGeometry(1, 1), trees, [hx + i * 6 + random() * 2, 5 + random() * 2, fz + (random() - 0.5) * 4], false); tree.scale.set(4 + random() * 2, 5.5 + random() * 3, 4); }
      part(new THREE.BoxGeometry(9, 6, 8), lambert(far(shade('#e9e3d2'), fz)), [hx + 30, 3, fz + 14], false);
      part(new THREE.BoxGeometry(14, 9, 10), lambert(far(shade('#96392c'), fz)), [hx + 62, 4.5, fz + 12], false);
      part(new THREE.CylinderGeometry(3, 3, 13, 10), lambert(far(shade('#b9bfc0'), fz)), [hx + 76, 6.5, fz + 10], false);
    } else if (a.horizon === 'devil') {
      devil = new THREE.Group();
      devil.position.set(-95 - random() * 50, 0, -260);
      const dustMat = new THREE.MeshLambertMaterial({ color: far(shade('#c2a070'), -170), transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
      const points = [[1.2, 0], [0.7, 4], [1.1, 14], [2, 30], [3.6, 46], [6, 60]].map(([r, y]) => new THREE.Vector2(r, y));
      const funnel = new THREE.Mesh(new THREE.LatheGeometry(points, 14), dustMat);
      funnel.rotation.z = 0.08;
      devil.add(funnel);
      const skirt = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dustMat);
      skirt.scale.set(7, 1.6, 7);
      devil.add(skirt);
      root.add(devil);
    } else if (a.horizon === 'combine') {
      const cx = -85, cz = -120;
      const paintC = lambert(far(shade(mood.cheer > 0.5 ? '#b5281f' : '#2f6b34'), cz));
      part(new THREE.BoxGeometry(4, 3.2, 7), paintC, [cx, 2.9, cz]);
      part(new THREE.BoxGeometry(2.6, 2, 2.4), lambert(far(shade('#cfe0e6'), cz)), [cx + 0.4, 4.4, cz + 3.2]);
      part(new THREE.BoxGeometry(9, 1.1, 1.6), paintC, [cx, 1, cz + 5.6]);
      for (const dx of [-1.9, 1.9]) part(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12), lambert('#26262a'), [cx + dx, 1.1, cz + 2]).rotation.z = Math.PI / 2;
      const chaff = new THREE.MeshLambertMaterial({ color: far(shade('#dcc68c'), cz), transparent: true, opacity: 0.5, depthWrite: false, flatShading: true });
      for (let i = 0; i < 11; i++) { const size = 1.6 + i * 0.9; const mesh = part(new THREE.IcosahedronGeometry(1, 1), chaff, [cx - side * i * 1.2 + (random() - 0.5) * 2, 2 + size * 0.6, cz - 4 - i * 5.5], false); mesh.scale.set(size * 1.3, size * 0.8, size * 1.2); dustPuffs.push({ mesh, phase: random() * 6.28, y: 2 + size * 0.6 }); }
    }

    // Loose things by wear and density: tumbleweeds on the street, drums and timbers in the yard.
    const tumbleweeds: { mesh: THREE.Mesh; speed: number; radius: number }[] = [];
    const weedMat = new THREE.MeshLambertMaterial({ color: shade('#a48d5c'), wireframe: true });
    for (let i = 0; i < Math.round(wear * 4 + (a.town === 'gone' || a.town === 'emptied' ? 2 : 0)); i++) {
      const radius = 0.4 + random() * 0.35;
      const mesh = part(new THREE.IcosahedronGeometry(radius, 1), weedMat, [-30 + random() * 40, radius, 2 - random() * 40], false);
      tumbleweeds.push({ mesh, speed: 0.6 + random(), radius });
    }
    for (let i = 0; i < Math.round(mood.density * 6); i++) {
      const x = 14 - random() * 16, z = -40 - random() * 12;
      if (i % 2) part(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 10), lambert(shade(['#2767b0', '#7c4a31', '#b3261d'][i % 3], z)), [x, 0.44, z]);
      else part(new THREE.BoxGeometry(1.2, 0.9, 1), lambert(shade('#8d7a5e', z)), [x, 0.45, z]).rotation.y = random();
    }
    if (dusty || (a.season === 'dust' && mood.energy > 0.4)) {
      const blow = new THREE.MeshLambertMaterial({ color: shade('#c8a878'), transparent: true, opacity: 0.3, depthWrite: false, flatShading: true });
      for (let i = 0; i < 9; i++) { const size = 2 + random() * 3; const mesh = part(new THREE.IcosahedronGeometry(1, 1), blow, [-34 + random() * 70, size * 0.4, 6 - random() * 70], false); mesh.scale.set(size * 2.2, size * 0.5, size * 1.2); dustPuffs.push({ mesh, phase: random() * 6.28, y: size * 0.4 }); }
    }

    // Light.
    root.add(new THREE.HemisphereLight(tone(sky.top).lerp(new THREE.Color('#ffffff'), 0.45), groundColour.clone().lerp(new THREE.Color('#ffffff'), 0.2), sky.hemi * 1.9));
    const key = new THREE.DirectionalLight(warmShift(new THREE.Color(sky.key)), sky.power * 0.62);
    key.castShadow = a.sky !== 'overcast';
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.06;
    key.position.set(side * 85, 18 + 110 * sky.lift, 58);
    key.target.position.set(0, 0, -45);
    root.add(key, key.target);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 1500);
    camera.position.copy(cameraAt);
    const world: World = {
      object: root, camera, background: horizonColour, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          // Small things are shown a little larger than life; big ones shrink to their lot.
          const target = Math.min(tall, Math.max(item.height, index === 0 ? 4.6 : 3.8));
          const scale = Math.min(target / Math.max(item.height, 0.01), wide / Math.max(item.radius, 0.01));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, 0.04, z);
          item.holder.rotation.y = Math.atan2(cameraAt.x - x, cameraAt.z - z) * 0.7 + (index === 2 ? 0 : 0.35) + (context.random() - 0.5) * 0.4;
        });
        camera.lookAt(1.5, 10.6, -29);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadowCamera = key.shadow.camera;
        shadowCamera.left = -95; shadowCamera.right = 95; shadowCamera.bottom = -95; shadowCamera.top = 95;
        shadowCamera.near = 10; shadowCamera.far = 480;
        shadowCamera.updateProjectionMatrix();
      },
      update(dt, seconds) {
        const wind = mix(0.2, 3.2, mood.energy);
        for (const weed of tumbleweeds) {
          weed.mesh.position.x += dt * wind * weed.speed * side * -1;
          if (weed.mesh.position.x > 34) weed.mesh.position.x = -34;
          if (weed.mesh.position.x < -34) weed.mesh.position.x = 34;
          weed.mesh.rotation.z += (dt * wind * weed.speed * side) / weed.radius;
          weed.mesh.position.y = weed.radius + Math.abs(Math.sin(seconds * 2 * weed.speed)) * 0.25 * mood.energy;
        }
        for (const puff of dustPuffs) puff.mesh.position.y = puff.y + Math.sin(seconds * 0.7 + puff.phase) * 0.25;
        if (devil) { devil.rotation.y += dt * wind * 1.5; devil.position.x += Math.sin(seconds * 0.2) * dt * 2; }
      },
      dispose() { key.shadow.map?.dispose(); for (const map of textures) map.dispose(); disposeTree(root); },
    };
    return world;
  },
});
