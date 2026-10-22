import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

const LAMPS = {
  sodium: 'Old sodium tubes: everything steeped in amber.',
  fluorescent: 'Green-white fluorescent tubes, a faint hum, a sickly evenness.',
  failing: 'Green-white tubes with one stuttering and two dead, so the aisle falls into patches.',
  led: 'New cold-white LED battens, clinical and over-bright.',
  mixed: 'Amber over the aisle, green-white over the bays: two colours of light that never mix.',
} as const;
const OUTSIDE = {
  skyline: 'A night skyline of lit office windows under a violet sky.',
  dusk: 'The last of a peach and teal sunset behind dark rooftops.',
  rain: 'Rain: blurred neon, wet glow, streaks slanting past the opening.',
  fog: 'Fog lit orange from below. No buildings, only glow.',
  dawn: 'Pale blue dawn over rooftops, a few windows already lit.',
} as const;
const ACCENTS = { green: '#3f9a6a', amber: '#e08a2a', blue: '#2f74c4', red: '#c8402c', purple: '#7a4fa8', yellow: '#e3c02e' } as const;
const LEVELS = { p1: 'P1', p2: 'P2', p3: 'P3', p4: 'P4', b2: 'B2', five: '5', c: 'C' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export default defineWorld({
  questions: {
    lamps: choice('What are the ceiling lights like?', LAMPS),
    outside: choice('What shows through the open side?', OUTSIDE),
    story: choice('Who else is still here?', {
      nobody: 'Nobody. Whatever cars remain are parked, dark and cold.',
      lastcar: 'One last car, alone at the far end of the row.',
      waiting: 'A car stopped in the aisle far down with its headlights on, engine running, facing this way.',
      dooropen: 'A parked car with its driver\'s door standing open and the cabin light on. Nobody near it.',
      coned: 'A section coned off with tape after cleaning, the floor still wet.',
    }),
    end: choice('What is at the far end of the aisle?', {
      up: 'A ramp curling up and out of sight round a concrete drum.',
      down: 'A ramp curling down and out of sight round a concrete drum.',
      shutter: 'A steel roller shutter, down and locked. The way out is closed.',
    }),
    accent: choice('What colour marks this level on the columns and walls?', { green: 'Green.', amber: 'Amber orange.', blue: 'Blue.', red: 'Red.', purple: 'Purple.', yellow: 'Yellow.' }),
    level: choice('Which level is it?', { p1: 'P1, just above the street.', p2: 'P2, a middle level.', p3: 'P3, high and half empty.', p4: 'P4, the top covered deck.', b2: 'B2, a basement level.', five: 'Level 5.', c: 'Zone C.' }),
    floor: choice('What is the floor like?', {
      sealed: 'Pale sealed concrete with black tyre arcs at the turns.',
      wet: 'Wet: long puddles holding the reflections of the tubes.',
      walkway: 'A green painted pedestrian walkway with white hatching runs up the aisle.',
      stained: 'Oil-spotted and patched, with faded bay numbers.',
    }),
    sign: choice('What hangs over the aisle?', {
      exit: 'A green EXIT sign with an arrow.',
      pay: 'PAY BEFORE RETURNING TO YOUR CAR.',
      height: 'A yellow and black MAX HEIGHT 2.1m bar on chains.',
      full: 'A red LEVEL FULL lightbox.',
      none: 'Nothing but pipes.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const accent = ACCENTS[a.accent], levelText = LEVELS[a.level];
    const add = <T extends THREE.Object3D>(object: T) => { root.add(object); return object; };
    const mat = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });
    const box = (size: [number, number, number], at: [number, number, number], material: THREE.Material, shadow = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...at); mesh.castShadow = shadow; mesh.receiveShadow = true;
      return add(mesh);
    };
    const rod = (from: [number, number, number], to: [number, number, number], radius: number, material: THREE.Material) => {
      const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to), dir = vb.clone().sub(va);
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 8), material);
      mesh.position.copy(va).add(vb).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      return add(mesh);
    };

    // Plan, metres. The aisle runs along z; the camera looks toward -z.
    const X = 8.9, XR = 5.4, XM = (XR - X) / 2, Z0 = 15, Z1 = -18, CEIL = 3.15, AISLE = 3.25;
    const columnsZ = [9, 1.5, -6, -13.5];
    const tubesZ = [8.2, 4.4, 0.6, -3.2, -7, -10.8, -14.6, -17.2];

    // Light character.
    const amberTube = '#ffb45a', greenTube = '#d9ffd0', ledTube = '#eef4ff';
    const aisleTube = a.lamps === 'sodium' || a.lamps === 'mixed' ? amberTube : a.lamps === 'led' ? ledTube : greenTube;
    const bayTube = a.lamps === 'sodium' ? amberTube : a.lamps === 'led' ? ledTube : greenTube;
    const dead = new Set<number>(a.lamps === 'failing' ? [2 + Math.floor(random() * 2), 5 + Math.floor(random() * 2)] : mood.wear > 0.7 ? [Math.floor(random() * 8)] : []);
    const flickerAt = a.lamps === 'failing' ? 1 : mood.wear > 0.55 ? 4 : -1;
    const night = a.outside === 'dawn' ? 0.35 : a.outside === 'dusk' ? 0.25 : 0;

    // Concrete tone: mid-grey leaning to the lamp colour.
    const concreteTint = new THREE.Color('#8f918a').lerp(new THREE.Color(aisleTube), 0.12).lerp(new THREE.Color('#8b8275'), mood.wear * 0.2);
    const concrete = mat(concreteTint, { roughness: 0.95 });
    const soffit = mat(concreteTint.clone().multiplyScalar(0.92), { roughness: 1 });
    const darkMat = mat('#202325', { roughness: 0.8 });
    const steel = mat('#aeb5b7', { metalness: 0.6, roughness: 0.45 });
    const accentMat = mat(accent, { roughness: 0.8 });

    // ---- Floor, painted ---------------------------------------------------------------
    const FW = 1024, FH = 2048;
    const fx = (x: number) => (x + X) / (X + XR) * FW, fz = (z: number) => (Z0 - z) / (Z0 - Z1) * FH;
    const sx = FW / (X + XR), sz = FH / (Z0 - Z1);
    const floorMap = paint(FW, FH, (ctx) => {
      ctx.fillStyle = concreteTint.clone().multiplyScalar(a.floor === 'wet' ? 0.74 : 0.86).getStyle(); ctx.fillRect(0, 0, FW, FH);
      for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '40,40,36'},${0.02 + random() * 0.05})`; ctx.fillRect(random() * FW, random() * FH, 2 + random() * 10, 2 + random() * 10); }
      // Pour joints.
      ctx.fillStyle = 'rgba(50,50,46,0.35)';
      for (const z of columnsZ) ctx.fillRect(0, fz(z) - 1, FW, 2);
      for (const x of [-AISLE, AISLE]) ctx.fillRect(fx(x) - 1, 0, 2, FH);
      // Pools of light under each working tube.
      tubesZ.forEach((z, i) => {
        if (dead.has(i)) return;
        for (const [x, tint, r] of [[0, aisleTube, 4.6], [-5.9, bayTube, 3.4]] as const) {
          if (x !== 0 && i % 2) continue;
          const g = ctx.createRadialGradient(fx(x), fz(z), 4, fx(x), fz(z), r * sx);
          const c = new THREE.Color(tint); const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
          g.addColorStop(0, `rgba(${rgb},${mix(0.2, 0.36, mood.cheer)})`); g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = g; ctx.fillRect(0, fz(z) - r * sz, FW, 2 * r * sz);
        }
      });
      // Bays: lines every 2.5 m on both sides, T-ends, numbers.
      const faded = a.floor === 'stained' ? 0.55 : mix(0.95, 0.7, mood.wear);
      ctx.fillStyle = `rgba(238,237,228,${faded})`;
      let number = 100 + Math.floor(random() * 500);
      for (let z = Z0 - 1; z > Z1 + 1; z -= 2.5) for (const side of [-1]) {
        if (columnsZ.some((cz) => Math.abs(cz - z) < 0.1)) continue;
        ctx.fillRect(fx(side > 0 ? AISLE + 0.15 : -X + 0.4), fz(z) - 0.06 * sz, (X - AISLE - 0.55) * sx, 0.12 * sz);
        ctx.fillRect(fx(side * (AISLE + 0.15)) - 0.06 * sx, fz(z) - 0.3 * sz, 0.12 * sx, 0.6 * sz);
        ctx.save(); ctx.translate(fx(side * (AISLE + 0.75)), fz(z - 1.25)); ctx.rotate(side * Math.PI / 2); ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(number++), 0, 9); ctx.restore();
      }
      // Yellow edge lines and aisle arrows.
      ctx.fillStyle = `rgba(227,185,34,${faded})`;
      for (const x of [-AISLE - 0.02, AISLE + 0.02]) ctx.fillRect(fx(x) - 0.05 * sx, 0, 0.1 * sx, FH);
      const arrow = (x: number, z: number, flip: boolean) => {
        ctx.save(); ctx.translate(fx(x), fz(z)); if (flip) ctx.rotate(Math.PI);
        ctx.beginPath(); ctx.moveTo(-0.14 * sx, 1.3 * sz); ctx.lineTo(0.14 * sx, 1.3 * sz); ctx.lineTo(0.14 * sx, -0.3 * sz); ctx.lineTo(0.5 * sx, -0.3 * sz); ctx.lineTo(0, -1.5 * sz); ctx.lineTo(-0.5 * sx, -0.3 * sz); ctx.lineTo(-0.14 * sx, -0.3 * sz); ctx.fill(); ctx.restore();
      };
      ctx.fillStyle = `rgba(238,237,228,${faded})`;
      if (a.floor === 'walkway') {
        ctx.fillStyle = 'rgba(63,154,106,0.85)'; ctx.fillRect(fx(-AISLE + 0.2), 0, 1.3 * sx, FH);
        ctx.strokeStyle = 'rgba(238,237,228,0.85)'; ctx.lineWidth = 0.1 * sx;
        for (let y = -40; y < FH + 40; y += 0.9 * sz) { ctx.beginPath(); ctx.moveTo(fx(-AISLE + 0.2), y); ctx.lineTo(fx(-AISLE + 1.5), y + 0.6 * sz); ctx.stroke(); }
        ctx.strokeRect(fx(-AISLE + 0.2), -10, 1.3 * sx, FH + 20);
        ctx.fillStyle = `rgba(238,237,228,${faded})`;
        for (const z of [5, -5, -14]) arrow(1.1, z, false);
      } else for (const z of [5.5, -3.5, -12.5]) { arrow(-1.4, z, false); arrow(1.4, z + 2, true); }
      ctx.strokeStyle = `rgba(227,185,34,${faded * 0.9})`; ctx.lineWidth = 0.09 * sx;
      for (let y = -40; y < FH + 40; y += 1.1 * sz) { ctx.beginPath(); ctx.moveTo(fx(AISLE + 0.2), y); ctx.lineTo(fx(XR - 0.2), y + 0.9 * sz); ctx.stroke(); }
      // Tyre arcs at the far turn and where people cut the corners.
      ctx.strokeStyle = `rgba(22,22,22,${a.floor === 'sealed' ? 0.42 : 0.22})`; ctx.lineWidth = 0.13 * sx;
      for (let i = 0; i < (a.floor === 'sealed' ? 7 : 3); i++) { const z = mix(Z1 + 1, 0, random()), dir = random() < 0.5 ? -1 : 1, r = mix(2.5, 4.5, random()); ctx.beginPath(); ctx.arc(fx(dir * r * 0.9), fz(z), r * sx, dir > 0 ? Math.PI * 0.6 : -0.1 * Math.PI, dir > 0 ? Math.PI * 1.1 : 0.4 * Math.PI); ctx.stroke(); }
      for (const off of [-0.8, 0.8]) { ctx.beginPath(); ctx.arc(fx(-6), fz(Z1), (6 + off) * sx, -Math.PI * 0.5, 0); ctx.stroke(); }
      // Oil, patches, puddles.
      const spots = Math.round((a.floor === 'stained' ? 60 : 14) * (0.5 + mood.wear));
      for (let i = 0; i < spots; i++) { const x = -mix(AISLE + 0.6, X - 1, random()), z = mix(Z1, Z0, random()), r = mix(0.1, 0.45, random()) * sx; const g = ctx.createRadialGradient(fx(x), fz(z), 0, fx(x), fz(z), r); g.addColorStop(0, 'rgba(18,16,14,0.7)'); g.addColorStop(1, 'rgba(18,16,14,0)'); ctx.fillStyle = g; ctx.fillRect(fx(x) - r, fz(z) - r, r * 2, r * 2); }
      if (a.floor === 'stained') for (let i = 0; i < 7; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '70,70,66' : '190,188,178'},0.5)`; ctx.fillRect(fx(mix(-X, XR - 2, random())), fz(mix(Z1 + 2, Z0, random())), mix(0.6, 2.4, random()) * sx, mix(0.5, 1.8, random()) * sz); }
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(X + XR, Z0 - Z1), new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.floor === 'wet' ? 0.45 : 0.9, metalness: a.floor === 'wet' ? 0.15 : 0 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(XM, 0, (Z0 + Z1) / 2); floor.receiveShadow = true;
    add(floor);
    if (a.floor === 'wet' || a.story === 'coned') {
      // Standing water: dark, glossy, each puddle carrying a streak of the tube above it.
      const water = new THREE.MeshStandardMaterial({ color: '#4d5653', roughness: 0.06, metalness: 0.5, transparent: true, opacity: 0.38, depthWrite: false });
      const gleam = new THREE.MeshStandardMaterial({ color: aisleTube, emissive: aisleTube, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, depthWrite: false });
      const count = a.floor === 'wet' ? 7 : 3;
      for (let i = 0; i < count; i++) {
        const z = a.floor === 'wet' ? tubesZ[(i + 1) % tubesZ.length] + 0.9 + mix(-0.6, 0.6, random()) : mix(-4, 2, random()), x = mix(-2.6, 2.6, random());
        const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 20), water);
        puddle.rotation.x = -Math.PI / 2; puddle.scale.set(mix(0.4, 1.0, random()), mix(0.6, 1.5, random()), 1); puddle.position.set(x, 0.006 + i * 0.0005, z);
        add(puddle);
        const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.12), gleam);
        streak.rotation.x = -Math.PI / 2; streak.position.set(x * 0.6, 0.012, z);
        if (!dead.has(i % tubesZ.length)) add(streak);
      }
    }

    // ---- Ceiling, beams, services ------------------------------------------------------
    box([X + XR + 0.6, 0.35, Z0 - Z1], [XM, CEIL + 0.175, (Z0 + Z1) / 2], soffit, false);
    for (const z of columnsZ) box([X + XR, 0.5, 0.55], [XM, CEIL - 0.25, z], soffit, false);
    for (const x of [-3.6, 3.6]) box([0.45, 0.32, Z0 - Z1], [x, CEIL - 0.16, (Z0 + Z1) / 2], soffit, false);
    // Conduit runs, a red sprinkler main with drops, a fat drain pipe.
    for (const x of [-1.15, -1.0]) rod([x, CEIL - 0.06, Z0], [x, CEIL - 0.06, Z1], 0.022, steel);
    const red = mat('#8f3228', { roughness: 0.6 });
    rod([3.05, CEIL - 0.42, Z0], [3.05, CEIL - 0.42, Z1], 0.035, red);
    for (let z = 9; z > Z1; z -= 3.75) { rod([3.05, CEIL - 0.42, z], [3.05, CEIL - 0.56, z], 0.014, red); rod([3.05, CEIL - 0.4, z + 0.6], [3.05, CEIL - 0.3, z + 0.6], 0.008, steel); }
    rod([-2.95, CEIL - 0.45, Z0], [-2.95, CEIL - 0.4, Z1], 0.07, mat('#6f736f', { roughness: 0.7 }));
    for (let z = Z0 - 3; z > Z1; z -= 5) add(new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 14), steel)).position.set(-2.95, CEIL - 0.43, z);

    // Tubes. Emissive, with a few real lights so things standing below pick up the colour.
    const housing = mat('#d9dcd6', { roughness: 0.6 });
    const tubeMats: THREE.MeshStandardMaterial[] = [];
    const tubeGeometry = new THREE.BoxGeometry(1.5, 0.06, 0.1), housingGeometry = new THREE.BoxGeometry(1.62, 0.07, 0.2);
    const glowPower = mix(1.6, 2.6, mood.cheer);
    tubesZ.forEach((z, i) => {
      const lit = !dead.has(i);
      const material = new THREE.MeshStandardMaterial({ color: lit ? '#ffffff' : '#5c5f58', emissive: aisleTube, emissiveIntensity: lit ? glowPower : 0.02 });
      tubeMats.push(material);
      for (const x of i % 2 ? [0] : [0, -5.9]) {
        const own = x === 0 ? material : new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: bayTube, emissiveIntensity: lit ? glowPower * 0.9 : 0.02 });
        const h = new THREE.Mesh(housingGeometry, housing); h.position.set(x, CEIL - 0.55 - 0.035 + (x ? 0.2 : 0), z + 0.9); add(h);
        const t = new THREE.Mesh(tubeGeometry, own); t.position.set(x, CEIL - 0.55 - 0.1 + (x ? 0.2 : 0), z + 0.9); add(t);
        for (const dx of [-0.6, 0.6]) rod([x + dx, CEIL - 0.55 + (x ? 0.2 : 0), z + 0.9], [x + dx, CEIL - (x ? 0 : 0.0), z + 0.9], 0.006, steel);
      }
    });
    const lamps: THREE.PointLight[] = [];
    for (const i of [1, 3, 5]) {
      const z = tubesZ[i];
      const light = new THREE.PointLight(aisleTube, dead.has(i) ? 0 : 5, 14, 1.7);
      light.position.set(0, CEIL - 0.8, z + 0.9);
      lamps.push(add(light));
    }

    // ---- Columns -------------------------------------------------------------------------
    const bandMap = paint(256, 256, (ctx) => {
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = a.accent === 'yellow' ? '#1a1a1a' : '#f6f4ec'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${levelText.length > 1 ? 150 : 200}px sans-serif`; ctx.fillText(levelText, 128, 138, 236);
      ctx.fillStyle = concreteTint.getStyle(); for (let i = 0; i < mood.wear * 240; i++) ctx.fillRect(random() * 256, random() * 256, 1 + random() * 8, 1 + random() * 8);
    });
    const bandMat = new THREE.MeshStandardMaterial({ map: bandMap, roughness: 0.8 });
    const hazardMap = paint(64, 64, (ctx) => { ctx.fillStyle = '#e3b922'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#1c1c1c'; for (let i = -2; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 64); ctx.lineTo(i * 32 + 16, 64); ctx.lineTo(i * 32 + 80, 0); ctx.lineTo(i * 32 + 64, 0); ctx.fill(); } });
    const hazardMat = new THREE.MeshStandardMaterial({ map: hazardMap, roughness: 0.8 });
    const columnGeometry = new THREE.BoxGeometry(0.62, CEIL, 0.62), bandGeometry = new THREE.BoxGeometry(0.635, 0.66, 0.635), footGeometry = new THREE.BoxGeometry(0.64, 0.5, 0.64);
    for (const z of columnsZ) for (const x of [-3.6, 3.6, -X + 0.3]) {
      const edge = x < -4;
      const column = new THREE.Mesh(columnGeometry, concrete); column.position.set(x, CEIL / 2, z); column.castShadow = !edge; column.receiveShadow = true; add(column);
      if (edge) continue;
      const band = new THREE.Mesh(bandGeometry, bandMat); band.position.set(x, 1.82, z); add(band);
      const foot = new THREE.Mesh(footGeometry, hazardMat); foot.position.set(x, 0.25, z); add(foot);
    }

    // ---- Left wall: solid, painted dado, stair door ------------------------------------------
    const wallMap = paint(1024, 256, (ctx) => {
      ctx.fillStyle = concreteTint.clone().multiplyScalar(1.02).getStyle(); ctx.fillRect(0, 0, 1024, 256);
      ctx.fillStyle = accent; ctx.fillRect(0, 150, 1024, 106);
      ctx.fillStyle = '#f2f0e6'; ctx.fillRect(0, 142, 1024, 8);
      ctx.fillStyle = a.accent === 'yellow' ? '#1a1a1a' : '#f6f4ec'; ctx.font = 'bold 84px sans-serif'; ctx.textBaseline = 'middle';
      for (let x = 60; x < 1024; x += 250) ctx.fillText(levelText, x, 206);
      for (let i = 0; i < 6 + mood.wear * 22; i++) { const x = random() * 1024, w = 4 + random() * 22, g = ctx.createLinearGradient(0, 0, 0, 100 + random() * 150); g.addColorStop(0, `rgba(52,46,36,${0.12 + mood.wear * 0.3})`); g.addColorStop(1, 'rgba(52,46,36,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, w, 256); }
      if (mood.wear > 0.5) { ctx.strokeStyle = 'rgba(20,20,24,0.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; for (let t = 0; t < 3; t++) { let x = random() * 800, y = 110 + random() * 60; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 10; k++) { x += 9; y += (k % 2 ? -1 : 1) * (14 + random() * 26); ctx.lineTo(x, y); } ctx.stroke(); } }
    });
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(Z0 - Z1, CEIL), new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.92 }));
    leftWall.rotation.y = Math.PI / 2; leftWall.position.set(-X, CEIL / 2, (Z0 + Z1) / 2); leftWall.receiveShadow = true; add(leftWall);
    // Stair door with a glowing running-man box.
    const doorZ = -2.2;
    box([0.06, 2.1, 1.0], [-X + 0.04, 1.05, doorZ], mat('#2f5a44', { roughness: 0.6 }));
    box([0.07, 0.34, 0.12], [-X + 0.05, 1.5, doorZ - 0.28], mat('#11161a', { roughness: 0.2 }));
    box([0.08, 2.2, 0.08], [-X + 0.05, 1.1, doorZ - 0.54], steel); box([0.08, 2.2, 0.08], [-X + 0.05, 1.1, doorZ + 0.54], steel);
    const exitGlow = '#27e07a';
    const exitMap = paint(128, 64, (ctx) => { ctx.fillStyle = '#0f9a52'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('EXIT', 64, 46); });
    const exitMat = new THREE.MeshStandardMaterial({ map: exitMap, emissiveMap: exitMap, emissive: '#ffffff', emissiveIntensity: 1.3 });
    const exitBox = box([0.1, 0.3, 0.6], [-X + 0.07, 2.42, doorZ], darkMat);
    const exitFace = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.26), exitMat); exitFace.rotation.y = Math.PI / 2; exitFace.position.set(-X + 0.125, 2.42, doorZ); add(exitFace);
    void exitBox;
    const exitLight = add(new THREE.PointLight(exitGlow, 3, 7, 1.8)); exitLight.position.set(-X + 0.8, 2.2, doorZ);

    // ---- Right side: parapet, rail, and the city -----------------------------------------------
    box([0.22, 1.1, Z0 - Z1], [XR, 0.55, (Z0 + Z1) / 2], concrete);
    rod([XR - 0.02, 1.3, Z0], [XR - 0.02, 1.3, Z1], 0.03, steel);
    for (let z = Z0 - 1; z > Z1; z -= 2.5) rod([XR - 0.02, 1.1, z], [XR - 0.02, 1.3, z], 0.018, steel);
    box([0.4, 0.5, Z0 - Z1], [XR + 0.05, CEIL - 0.25, (Z0 + Z1) / 2], soffit, false);
    const SKY: Record<keyof typeof OUTSIDE, [string, string, string]> = {
      skyline: ['#4a4a78', '#8a6f96', '#d99a6a'], dusk: ['#3f6f86', '#d9a37a', '#f2c184'], rain: ['#4d5a66', '#6f7f8a', '#c98a6a'], fog: ['#8a7a66', '#c9965a', '#e8b06a'], dawn: ['#6f8fb4', '#b4c6d6', '#e8d2b8'],
    };
    const [skyTop, skyMid, skyLow] = SKY[a.outside];
    const cityMap = paint(1024, 512, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, skyTop); g.addColorStop(0.5, skyMid); g.addColorStop(0.72, skyLow); g.addColorStop(1, skyLow);
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
      if (a.outside !== 'fog') {
        for (const [depth, shade, lit] of [[0, '#5a5a7c', 0.35], [1, '#34364e', 0.6], [2, '#1f2130', 0.8]] as const) {
          let x = -20;
          while (x < 1024) {
            const w = 30 + random() * 70, h = 60 + random() * (180 - depth * 30) + depth * 40;
            const top = 512 - 150 - h + depth * 60;
            ctx.fillStyle = a.outside === 'dawn' ? new THREE.Color(shade).lerp(new THREE.Color('#8a94a6'), 0.45).getStyle() : shade; ctx.fillRect(x, top, w, 512);
            const warm = ['#ffd98a', '#fff0c0', '#bfe6ff', '#ffb45a'];
            for (let wy = top + 8; wy < 512 - 60; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) if (random() < lit * (a.outside === 'dawn' ? 0.25 : a.outside === 'dusk' ? 0.5 : 0.6) * mix(0.6, 1.2, mood.density)) { ctx.fillStyle = warm[Math.floor(random() * 4)]; ctx.fillRect(wx, wy, 5, 6); }
            if (random() < 0.25) { ctx.fillStyle = '#ff3a2a'; ctx.fillRect(x + w / 2, top - 8, 3, 3); }
            x += w + random() * 14;
          }
        }
        if (a.outside === 'rain') { for (const tint of ['#ff4a8a', '#3ad6ff', '#ffb43a', '#7dff8a']) { const x = random() * 1000, y = 300 + random() * 120; const n = ctx.createRadialGradient(x, y, 2, x, y, 90); n.addColorStop(0, tint); n.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.6; ctx.fillStyle = n; ctx.fillRect(x - 90, y - 90, 180, 180); ctx.globalAlpha = 1; } }
      } else { const n = ctx.createLinearGradient(0, 200, 0, 512); n.addColorStop(0, 'rgba(255,170,80,0)'); n.addColorStop(1, 'rgba(255,170,80,0.7)'); ctx.fillStyle = n; ctx.fillRect(0, 0, 1024, 512); for (let i = 0; i < 5; i++) { const x = random() * 1024, y = 330 + random() * 100, n2 = ctx.createRadialGradient(x, y, 2, x, y, 120); n2.addColorStop(0, 'rgba(255,220,160,0.8)'); n2.addColorStop(1, 'rgba(255,200,120,0)'); ctx.fillStyle = n2; ctx.fillRect(x - 120, y - 120, 240, 240); } }
      if (a.outside === 'rain') { ctx.strokeStyle = 'rgba(220,230,240,0.35)'; ctx.lineWidth = 1.5; for (let i = 0; i < 500; i++) { const x = random() * 1024, y = random() * 512; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 26); ctx.stroke(); } }
    });
    // A curved backdrop: the opening is seen at a grazing angle, so a flat plane would slide out of view.
    cityMap.wrapS = THREE.RepeatWrapping; cityMap.repeat.x = 2;
    const city = new THREE.Mesh(new THREE.CylinderGeometry(64, 64, 46, 40, 1, true, Math.PI / 2 - 0.5, Math.PI / 2 + 0.9), new THREE.MeshStandardMaterial({ color: '#000000', emissiveMap: cityMap, emissive: '#ffffff', emissiveIntensity: 1, roughness: 1, side: THREE.BackSide }));
    city.position.set(0, 8, 0);
    add(city);
    const background = new THREE.Color(skyMid).lerp(new THREE.Color('#6f7a74'), 0.35);

    // ---- Far end ---------------------------------------------------------------------------------
    const endWallMat = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.92 });
    const rightEnd = new THREE.Mesh(new THREE.PlaneGeometry(XR - AISLE + 0.2, CEIL), endWallMat); rightEnd.position.set((XR + AISLE) / 2, CEIL / 2, Z1 + 0.02); add(rightEnd);
    const leftEnd = new THREE.Mesh(new THREE.PlaneGeometry(X - AISLE + 0.2, CEIL), endWallMat); leftEnd.position.set(-(X + AISLE) / 2, CEIL / 2, Z1 + 0.02); add(leftEnd);
    if (a.end === 'shutter') {
      const slatMap = paint(64, 256, (ctx) => { for (let y = 0; y < 256; y += 8) { const g = ctx.createLinearGradient(0, y, 0, y + 8); g.addColorStop(0, '#c2c8ca'); g.addColorStop(0.6, '#8d9496'); g.addColorStop(1, '#565c5e'); ctx.fillStyle = g; ctx.fillRect(0, y, 64, 8); } ctx.fillStyle = `rgba(90,60,40,${mood.wear * 0.5})`; for (let i = 0; i < 40; i++) ctx.fillRect(random() * 64, 180 + random() * 76, 3 + random() * 12, 2 + random() * 6); });
      const shutter = new THREE.Mesh(new THREE.PlaneGeometry(2 * AISLE, CEIL - 0.3), new THREE.MeshStandardMaterial({ map: slatMap, metalness: 0.5, roughness: 0.5 }));
      shutter.position.set(0, (CEIL - 0.3) / 2, Z1 + 0.05); add(shutter);
      box([2 * AISLE + 0.2, 0.36, 0.4], [0, CEIL - 0.18, Z1 + 0.2], darkMat);
      box([2 * AISLE, 0.12, 0.1], [0, 0.06, Z1 + 0.1], hazardMat);
      const noEntry = paint(128, 128, (ctx) => { ctx.clearRect(0, 0, 128, 128); ctx.fillStyle = '#c8281e'; ctx.beginPath(); ctx.arc(64, 64, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f6f4ec'; ctx.fillRect(22, 52, 84, 24); });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), new THREE.MeshStandardMaterial({ map: noEntry, roughness: 0.6 })); disc.position.set(0, 1.7, Z1 + 0.07); add(disc);
      const lock = add(new THREE.PointLight('#ff3a2a', 3, 6, 1.8)); lock.position.set(2.6, 1.2, Z1 + 0.6);
      box([0.12, 0.2, 0.06], [AISLE - 0.4, 1.2, Z1 + 0.08], new THREE.MeshStandardMaterial({ color: '#ff3a2a', emissive: '#ff3a2a', emissiveIntensity: 2 }));
    } else {
      // A helical ramp round a drum: a rising ring sector, its outer wall, and the turn above as a soffit.
      const dir = a.end === 'up' ? 1 : -1, C = new THREE.Vector3(-6, 0, Z1), r0 = 2.75, r1 = 9.25, sweep = Math.PI * 1.05, rise = 3.5;
      const ring = (offset: number, from: number, to: number) => {
        const seg = 28, geometry = new THREE.BufferGeometry(), pos: number[] = [], idx: number[] = [];
        for (let i = 0; i <= seg; i++) { const t = mix(from, to, i / seg), th = t * sweep; for (const r of [r0, r1]) pos.push(C.x + Math.cos(th) * r, offset + dir * rise * t, C.z - Math.sin(th) * r); }
        for (let i = 0; i < seg; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geometry.setIndex(idx); geometry.computeVertexNormals();
        return geometry;
      };
      const rampMat = mat(concreteTint.clone().multiplyScalar(0.9), { roughness: 0.95, side: THREE.DoubleSide });
      const ramp = new THREE.Mesh(ring(0.01, 0, 1), rampMat); ramp.receiveShadow = true; add(ramp);
      add(new THREE.Mesh(ring(dir > 0 ? rise + 0.3 : rise, dir > 0 ? 0.12 : -0.05, 1), mat(concreteTint.clone().multiplyScalar(0.7), { roughness: 1, side: THREE.DoubleSide })));
      if (dir < 0) add(new THREE.Mesh(ring(rise * 2, 0, 1), soffit));
      // Kerb lines painted on the ramp, drum, outer wall with chevrons.
      const kerb = (r: number) => { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 24; i++) { const t = i / 24, th = t * sweep; pts.push(new THREE.Vector3(C.x + Math.cos(th) * r, 0.05 + dir * rise * t, C.z - Math.sin(th) * r)); } return add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 5), mat('#e3b922'))); };
      kerb(r0 + 0.12); kerb(r1 - 0.12);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(r0, r0, 12, 40), concrete); drum.position.set(C.x, 2, C.z); add(drum);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r0 + 0.01, r0 + 0.01, 0.7, 40, 1, true), accentMat); band.position.set(C.x, 1.75, C.z); add(band);
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(r1, r1, 14, 48, 1, true, Math.PI / 2 - 0.02, sweep + 0.3), mat(concreteTint.clone().multiplyScalar(0.84), { roughness: 0.95, side: THREE.BackSide }));
      outer.position.set(C.x, 3, C.z); add(outer);
      const chevMap = paint(128, 64, (ctx) => { ctx.fillStyle = '#151515'; ctx.fillRect(0, 0, 128, 64); ctx.fillStyle = '#e3b922'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(20 + i * 40, 6); ctx.lineTo(38 + i * 40, 6); ctx.lineTo(18 + i * 40, 32); ctx.lineTo(38 + i * 40, 58); ctx.lineTo(20 + i * 40, 58); ctx.lineTo(0 + i * 40, 32); ctx.fill(); } });
      const chevMat = new THREE.MeshStandardMaterial({ map: chevMap, roughness: 0.6, emissiveMap: chevMap, emissive: '#ffffff', emissiveIntensity: 0.25 });
      for (const t of [0.14, 0.28, 0.42]) { const th = t * sweep; const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), chevMat); sign.position.set(C.x + Math.cos(th) * (r1 - 0.06), 1.5 + dir * rise * t, C.z - Math.sin(th) * (r1 - 0.06)); sign.lookAt(C.x, sign.position.y, C.z); add(sign); }
      // A lamp on the drum throws the ramp's own colour up or down the well.
      const well = add(new THREE.PointLight(dir > 0 ? bayTube : amberTube, 9, 15, 1.6)); well.position.set(C.x + 5, 2.4 + dir * 0.8, C.z - 3.2);
      const wellTube = new THREE.Mesh(tubeGeometry, new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: dir > 0 ? bayTube : amberTube, emissiveIntensity: glowPower })); wellTube.position.set(C.x + 4.5, 2.7 + dir * 1.0, C.z - 4.4); wellTube.rotation.y = 0.8; add(wellTube);
      const word = paint(256, 64, (ctx) => { ctx.fillStyle = accent; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = a.accent === 'yellow' ? '#1a1a1a' : '#f6f4ec'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(dir > 0 ? 'UP  ⬆' : 'EXIT  ⬇', 128, 47); });
      const way = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshStandardMaterial({ map: word, roughness: 0.7 })); way.position.set((XR + AISLE) / 2, 2.2, Z1 + 0.04); add(way);
    }

    // ---- Hanging sign ---------------------------------------------------------------------------
    if (a.sign !== 'none') {
      const z = -3.2, y = CEIL - 0.78;
      if (a.sign === 'height') {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5.6, 10), new THREE.MeshStandardMaterial({ map: hazardMap, roughness: 0.6 })); bar.rotation.z = Math.PI / 2; bar.position.set(0, y - 0.1, z); (bar.material as THREE.MeshStandardMaterial).map!.wrapS = THREE.RepeatWrapping; add(bar);
        for (const x of [-2.4, 2.4]) rod([x, y - 0.1, z], [x, CEIL, z], 0.008, steel);
        const plate = paint(256, 64, (ctx) => { ctx.fillStyle = '#e3b922'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#151515'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MAX HEIGHT 2.1m', 128, 44, 244); });
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6 })); p.position.set(0, y - 0.1, z + 0.08); add(p);
      } else {
        const [text, bg, ink] = { exit: ['EXIT  ➜', '#0f9a52', '#ffffff'], pay: ['PAY BEFORE RETURNING TO CAR', '#1f4fa8', '#ffffff'], full: ['LEVEL FULL', '#b3271f', '#ffe9d8'] }[a.sign];
        const map = paint(512, 112, (ctx) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 112); ctx.fillStyle = ink; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 60, 480); });
        box([2.5, 0.56, 0.12], [0, y, z], darkMat);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: mix(0.8, 1.3, mood.cheer) })); face.position.set(0, y, z + 0.065); add(face);
        for (const x of [-1, 1]) rod([x, y + 0.28, z], [x, CEIL, z], 0.012, steel);
      }
    }

    // ---- Cars -------------------------------------------------------------------------------------
    const profile = new THREE.Shape();
    ([[-2.15, 0.3], [-2.2, 0.62], [-1.95, 0.86], [-1.2, 0.92], [-0.6, 1.4], [0.75, 1.42], [1.35, 0.98], [2.1, 0.86], [2.2, 0.5], [2.15, 0.3]] as const).forEach(([z, y], i) => (i ? profile.lineTo(z, y) : profile.moveTo(z, y)));
    const bodyGeometry = new THREE.ExtrudeGeometry(profile, { depth: 1.72, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 });
    bodyGeometry.translate(0, 0, -0.86); bodyGeometry.rotateY(-Math.PI / 2); // length along z, nose at +z
    const glassShape = new THREE.Shape();
    ([[-1.12, 0.95], [-0.6, 1.34], [0.72, 1.36], [1.26, 0.99]] as const).forEach(([z, y], i) => (i ? glassShape.lineTo(z, y) : glassShape.moveTo(z, y)));
    const glassGeometry = new THREE.ExtrudeGeometry(glassShape, { depth: 1.86, bevelEnabled: false }); glassGeometry.translate(0, 0, -0.93); glassGeometry.rotateY(-Math.PI / 2);
    const wheelGeometry = new THREE.CylinderGeometry(0.33, 0.33, 1.84, 14); wheelGeometry.rotateZ(Math.PI / 2);
    const glassMat = mat('#1b2226', { roughness: 0.2, metalness: 0.4 });
    const tints = ['#8e9498', '#2a2d33', '#d9d9d2', '#5a2a2a', '#2f4a66', '#bfb9a8', '#3a4a3c', '#101113'];
    const car = (x: number, z: number, turn: number, tint = tints[Math.floor(random() * tints.length)]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeometry, mat(tint, { roughness: 0.35, metalness: 0.35 })); body.castShadow = body.receiveShadow = true;
      const glass = new THREE.Mesh(glassGeometry, glassMat);
      g.add(body, glass);
      for (const wz of [1.4, -1.35]) { const wheel = new THREE.Mesh(wheelGeometry, darkMat); wheel.position.set(0, 0.33, wz); g.add(wheel); }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.05), new THREE.MeshStandardMaterial({ color: '#7a1612', emissive: '#ff2a1a', emissiveIntensity: 0.25 })); tail.position.set(0, 0.74, -2.2); g.add(tail);
      g.position.set(x, 0, z); g.rotation.y = turn;
      g.scale.setScalar(mix(0.92, 1.04, random()));
      return add(g);
    };
    // Bays not straddling a column line. Supporting slots stay inside the aisle, so any bay is free.
    const bays: [number, number][] = [];
    for (let z = Z0 - 2.25; z > Z1 + 1; z -= 2.5) if (z < 10.5) bays.push([-5.95, z]);
    const order = bays.map((bay) => ({ bay, key: random() })).sort((p, q) => p.key - q.key).map((entry) => entry.bay);
    const wanted = a.story === 'lastcar' ? 0 : Math.round(mix(1, 9, mood.density) * (a.story === 'coned' ? 0.6 : 1));
    for (const [x, z] of order.slice(0, wanted)) car(x + (random() - 0.5) * 0.3, z + (random() - 0.5) * 0.2, (x > 0 ? -1 : 1) * Math.PI / 2 + (random() < 0.3 ? Math.PI : 0) + (random() - 0.5) * 0.08);
    const headMats: THREE.MeshStandardMaterial[] = [];
    if (a.story === 'lastcar') car(-5.95, -14.2, Math.PI / 2, '#b3271f');
    if (a.story === 'waiting') {
      const g = car(mix(-0.9, 0.9, random()), -11.5, mix(-0.12, 0.12, random()), '#17191c');
      const beam = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff2c0', emissiveIntensity: 4 }); headMats.push(beam);
      for (const x of [-0.6, 0.6]) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), beam); lamp.position.set(x, 0.7, 2.2); lamp.scale.z = 0.4; g.add(lamp); }
      const haze = new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#fff2c0', emissiveIntensity: 1.2, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }); headMats.push(haze);
      for (const x of [-0.6, 0.6]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 9, 14, 1, true), haze); cone.rotation.x = -Math.PI / 2 + 0.07; cone.position.set(x, 0.42, 6.6); g.add(cone); }
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 11), new THREE.MeshStandardMaterial({ color: '#fff2c0', emissive: '#fff2c0', emissiveIntensity: 0.8, transparent: true, opacity: 0.22, depthWrite: false })); wash.rotation.x = -Math.PI / 2; wash.position.set(0, 0.014, 7.8); g.add(wash);
      const glare = new THREE.PointLight('#fff2c0', 12, 20, 1.5); glare.position.set(0, 0.8, 3.4); g.add(glare);
    }
    if (a.story === 'dooropen') {
      const g = car(-5.95, 0.2, Math.PI / 2, '#d9d9d2');
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.1), mat('#d9d9d2', { roughness: 0.35, metalness: 0.35 })); door.geometry.translate(0, 0, -0.55); door.position.set(0.9, 0.72, 0.62); door.rotation.y = 1.05; door.castShadow = true; g.add(door);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 1.5), new THREE.MeshStandardMaterial({ color: '#ffe9b0', emissive: '#ffd98a', emissiveIntensity: 1.6 })); cabin.position.set(0, 1.12, 0.05); g.add(cabin);
      const dome = new THREE.PointLight('#ffd98a', 4, 6, 1.7); dome.position.set(1.4, 1.1, 0.2); g.add(dome);
      const spill = new THREE.Mesh(new THREE.CircleGeometry(1.2, 20), new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffd98a', emissiveIntensity: 0.9, transparent: true, opacity: 0.25, depthWrite: false })); spill.rotation.x = -Math.PI / 2; spill.position.set(1.6, 0.014, 0.2); g.add(spill);
    }
    if (a.story === 'coned') {
      const coneMat = mat('#f0641e', { roughness: 0.6 }), white = mat('#f4f2ea');
      const coneGeometry = new THREE.CylinderGeometry(0.03, 0.12, 0.55, 12), collar = new THREE.CylinderGeometry(0.066, 0.087, 0.11, 12), foot = new THREE.BoxGeometry(0.32, 0.03, 0.32);
      const posts: THREE.Vector3[] = [];
      for (const [x, z] of [[-2.9, 3.4], [-2.7, -0.5], [-2.8, -4.4], [-2.9, -8.2]]) {
        const p = new THREE.Vector3(x + (random() - 0.5) * 0.3, 0, z + (random() - 0.5) * 0.4); posts.push(p);
        const c = new THREE.Mesh(coneGeometry, coneMat); c.position.set(p.x, 0.3, p.z); c.castShadow = true; add(c);
        const w = new THREE.Mesh(collar, white); w.position.set(p.x, 0.33, p.z); add(w);
        const f = new THREE.Mesh(foot, darkMat); f.position.set(p.x, 0.015, p.z); add(f);
      }
      const tape = new THREE.MeshStandardMaterial({ map: hazardMap, roughness: 0.5, side: THREE.DoubleSide });
      for (let i = 0; i < posts.length - 1; i++) { const p = posts[i], q = posts[i + 1], len = p.distanceTo(q); const t = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.07), tape); t.position.set((p.x + q.x) / 2, 0.5, (p.z + q.z) / 2); t.rotation.y = Math.atan2(p.z - q.z, q.x - p.x); add(t); }
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.62, 0.012), mat('#f0cc1f', { roughness: 0.5 })); board.position.set(-2.2, 0.3, 5.2); board.rotation.x = -0.3; board.castShadow = true; add(board);
    }
    // A trolley shelter of small things that gather with density: bollards by the stair door, a bin.
    if (mood.density > 0.4) { const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.8, 14), mat('#3a4a3c', { roughness: 0.6 })); bin.position.set(-X + 0.5, 0.4, doorZ + 1.4); bin.castShadow = true; add(bin); }
    for (const z of [doorZ - 1, doorZ + 1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), hazardMat); b.position.set(-X + 1.5, 0.5, z); b.castShadow = true; add(b); }

    // ---- Light -------------------------------------------------------------------------------------
    const hemi = new THREE.HemisphereLight(new THREE.Color(aisleTube).lerp(new THREE.Color('#ffffff'), 0.5), new THREE.Color('#a8a493'), mix(0.5, 0.66, mood.cheer) + night * 0.2);
    add(hemi);
    // The key stands in for the row of tubes overhead: the slab itself casts no shadow.
    const key = new THREE.DirectionalLight(new THREE.Color(aisleTube).lerp(new THREE.Color().setHSL(mix(0.38, 0.08, mood.warmth), 0.5, 0.8), 0.4), 0.85);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.03; key.shadow.bias = -0.0003; key.shadow.radius = 4;
    add(key); add(key.target);
    // City glow raking in from the open side.
    const glow = new THREE.DirectionalLight(skyLow, mix(0.3, 0.5, mood.daylight) + night * 0.5);
    glow.position.set(20, 3, -4); glow.target.position.set(0, 1, -2); add(glow); add(glow.target);

    // ---- Camera and placement ------------------------------------------------------------------------
    const camera = new THREE.PerspectiveCamera(46, 1, 0.2, 300);
    const slots: [number, number, number][] = [[-0.6, 4.6, 0.1], [2.4, 2.2, -0.4], [-2.5, 0.6, 0.45], [1.5, -3.4, -0.25], [-1.6, -6.5, 0.2], [1.6, -10.5, -0.1]];
    const place = (items: readonly Placeable[]) => {
      let heroTop = 1.8;
      items.forEach((item, index) => {
        const [x, z, turn] = slots[index % slots.length];
        // Real sizes, eased toward what fits under a 3 m slab and reads from the camera.
        const natural = Math.max(item.height, item.radius * 1.5, 0.05);
        const shown = natural < 1.2 ? 1.2 * (natural / 1.2) ** 0.4 : natural > 2.5 ? 2.5 * (natural / 2.5) ** 0.15 : natural;
        const scale = Math.min(shown / natural, (CEIL - 0.75) / Math.max(item.height, 0.05), (index === 0 ? 1.8 : 1.4) / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = turn + (random() - 0.5) * 0.25;
        item.holder.updateMatrixWorld(true);
        if (index === 0) heroTop = Math.max(1.2, visibleBounds(item.holder).max.y);
      });
      camera.position.set(0.5, mix(1.1, 1.4, Math.min(1, heroTop / 2.4)), 12.6);
      camera.lookAt(0.75, mix(1.1, 1.4, Math.min(1, heroTop / 2.4)), -8);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
      key.target.position.set(0, 0, 0);
      key.position.set(mix(-5, 5, mood.daylight), 16, 9);
      const shadow = key.shadow.camera;
      shadow.left = -12; shadow.right = 12; shadow.top = 20; shadow.bottom = -20; shadow.near = 1; shadow.far = 50;
      shadow.updateProjectionMatrix();
    };
    place([]);

    const flickerMat = flickerAt >= 0 && !dead.has(flickerAt) ? tubeMats[flickerAt] : null;
    const flickerLamp = flickerMat && flickerAt === 1 ? lamps[0] : null;
    const lampBase = flickerLamp ? flickerLamp.intensity : 0;
    const headBase = headMats.map((m) => m.emissiveIntensity);
    return {
      object: root, camera, background, capacity: slots.length, ground: floor, keyLight: key, place,
      update: (_dt, time) => {
        const rate = mix(3, 22, mood.energy);
        if (flickerMat) {
          const on = Math.sin(time * rate) * Math.sin(time * rate * 0.37 + 1) > -0.15 ? 1 : 0.08;
          flickerMat.emissiveIntensity = glowPower * on;
          if (flickerLamp) flickerLamp.intensity = lampBase * on;
        }
        // An idling engine: the beams tremble very slightly.
        headMats.forEach((m, i) => { m.emissiveIntensity = headBase[i] * (1 + Math.sin(time * rate * 1.3) * 0.04 * (0.5 + mood.energy)); });
      },
      dispose() { key.shadow.map?.dispose(); bodyGeometry.dispose(); glassGeometry.dispose(); wheelGeometry.dispose(); tubeGeometry.dispose(); housingGeometry.dispose(); disposeTree(root); },
    };
  },
});
