import * as THREE from 'three';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';
import { type Block, type P3, blocks, canvasTexture } from './rail';

const W = 25, D = 22;
const GAUGE = 0.285; // half gauge at the yard's model scale

export default defineWorld({
  questions: {
    weather: choice('What is the weather and light?', {
      snowing: 'Snow falling steadily out of a white sky, everything softened.',
      fog: 'Freezing fog: the far tracks dissolve and the skyline is a grey ghost.',
      dusk: 'A clear, bitter blue dusk with every lamp already lit.',
      overcast: 'Flat grey daylight under low cloud, hard and plain.',
    }),
    ground: choice('What is underfoot?', {
      snow: 'Fresh unbroken snow with the rails cut through it.',
      slush: 'Grey trampled slush and puddles.',
      cinders: 'Black cinders rimed with frost.',
      ballast: 'Brown oil-stained ballast, dry and dusty.',
    }),
    overhead: choice('What stands over the tracks?', {
      floodlights: 'Tall lattice floodlight masts.',
      catenary: 'Catenary portals and overhead wires above every road.',
      gantries: 'Signal gantries with small coloured lights.',
      poles: 'Only a line of telegraph poles.',
    }),
    hump: choice('How is the yard worked?', {
      crest: 'Over a pronounced hump with a control cabin and rail brakes below it.',
      gentle: 'Over a low rise, wagons trickling down by gravity.',
      flat: 'It is a flat yard: a plain ladder of points, everything pushed by an engine.',
    }),
    standing: choice('What is standing on the classification tracks?', {
      empty: 'Nothing: bare roads, only a distant row at the back.',
      cuts: 'A few short cuts of wagons here and there.',
      full: 'Long strings on nearly every road, the yard choked.',
      rolling: 'A few cuts, and one lone wagon rolling down off the hump by itself.',
      derelict: 'Forgotten strings rusting on the back roads under snow.',
    }),
    stock: choice('What kind of wagons are they?', {
      mixed: 'A mixed freight: vans, hoppers, tankers, a few containers.',
      coal: 'Coal hoppers, black loads heaped.',
      tank: 'Tank wagons, black and silver.',
      vans: 'Box vans in faded colours, tagged with graffiti.',
      containers: 'Flat wagons carrying bright shipping containers.',
    }),
    life: choice('What is going on?', {
      working: 'The night shift is running: a shunter pushing over the hump, dwarf signals lit.',
      waiting: 'Between trains: lamps lit, an engine parked, nobody in sight.',
      closed: 'Closed for good: dark, gated, rust on the railheads.',
      drifters: 'Officially dead, but there is a small fire by the far fence and footprints across the snow to an open van.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = { snowing: '#e3e8ec', fog: '#d2d7da', dusk: '#aeb8cf', overcast: '#d8dbd9' }[a.weather];
    const skyColour = new THREE.Color(sky);
    const groundHex = { snow: '#eef1f3', slush: '#b9bfc2', cinders: '#5f5d5b', ballast: '#8c8275' }[a.ground];
    const { art, world } = diorama(context, {
      background: sky, floor: groundHex, width: W, depth: D, maxHeight: 5, radius: 2.8, pitch: 38, yaw: 31,
      slots: [[0, 4.8], [-6.6, 6.6], [6.6, 6.6], [-9.6, 2.4, 0, 0.8], [9.8, 2.4, 0, 0.8], [2.4, 9.3, 0, 0.7]],
    });
    const s = art;
    const hemisphere = s.root.children.find((child) => (child as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight | undefined;
    if (world.keyLight) world.keyLight.intensity = { snowing: 1.7, fog: 1.2, dusk: 1.5, overcast: 2.1 }[a.weather];
    if (hemisphere) hemisphere.intensity = { snowing: 1.75, fog: 1.85, dusk: 1.25, overcast: 1.5 }[a.weather];
    if (a.weather === 'dusk' && world.keyLight) world.keyLight.color.set('#ffc9b0');

    const dead = a.life === 'closed' || a.life === 'drifters';
    const night = (a.weather === 'dusk' ? 1 : 0.65) * (dead ? 0.0 : 1);
    const haze = { snowing: 0.4, fog: 0.7, dusk: 0.3, overcast: 0.2 }[a.weather];
    const snowy = a.ground === 'snow' || a.weather === 'snowing';
    /** Things further back sink into the weather. */
    const fogged = (colour: THREE.ColorRepresentation, z: number, extra = 0) => new THREE.Color(colour).lerp(skyColour, Math.min(0.92, haze * THREE.MathUtils.clamp((1.5 - z) / 14, 0, 1) + extra));
    const parts: Block[] = [], rounds: Block[] = [];
    const strut = (from: P3, to: P3, thick: number, color: THREE.ColorRepresentation, wide = thick) => {
      const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to);
      const d = vb.clone().sub(va);
      const len = d.length();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()));
      const mid = va.add(vb).multiplyScalar(0.5);
      parts.push({ size: [len, thick, wide], at: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z], color });
    };

    // ---- Track plan: a lead over the hump, a fan, and parallel classification roads ----
    const N = 8;
    const roads = Array.from({ length: N }, (_unused, i) => -9.2 + i * 1.3);
    const leadZ = -4.65, fanX = -6.4, straightX = -1.0, endX = W / 2 - 0.3;
    const hh = { crest: 1.15, gentle: 0.5, flat: 0 }[a.hump];
    const ballast = new THREE.Color(a.ground === 'cinders' ? '#3f3d3c' : a.ground === 'ballast' ? '#6f6558' : '#7d7b77').lerp(new THREE.Color('#eef1f3'), a.ground === 'snow' ? 0.45 : 0);
    const railColour = new THREE.Color(dead ? '#6a4630' : '#3c3836').lerp(new THREE.Color('#6a4630'), mood.wear * 0.5);
    const sleeperColour = new THREE.Color('#3f342b');
    const lay = (p0: THREE.Vector3, p1: THREE.Vector3) => {
      const d = p1.clone().sub(p0);
      const len = d.length();
      const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
      const up = (p0.y + p1.y) / 2;
      const zMid = (p0.z + p1.z) / 2;
      strut([p0.x, p0.y + 0.025, p0.z], [p1.x, p1.y + 0.025, p1.z], 0.05, fogged(ballast, zMid), 1.1);
      for (const k of [-1, 1]) strut([p0.x + side.x * GAUGE * k, p0.y + 0.09, p0.z + side.z * GAUGE * k], [p1.x + side.x * GAUGE * k, p1.y + 0.09, p1.z + side.z * GAUGE * k], 0.05, fogged(railColour, zMid), 0.04);
      const count = Math.max(1, Math.round(len / 0.27));
      const yaw = Math.atan2(-d.z, d.x);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        parts.push({ size: [0.1, 0.035, 0.92], at: [p0.x + d.x * t, up + 0.058 + (t - 0.5) * d.y, p0.z + d.z * t], rot: [0, yaw, 0], color: fogged(snowy && random() < 0.5 ? '#c9ccce' : sleeperColour, zMid) });
      }
    };
    const leadProfile: [number, number][] = [[-W / 2 + 0.2, hh * 0.1], [-10.4, hh * 0.62], [-8.6, hh], [-7.4, hh * 0.62], [fanX, 0]];
    for (let i = 0; i < leadProfile.length - 1; i++) lay(new THREE.Vector3(leadProfile[i][0], leadProfile[i][1], leadZ), new THREE.Vector3(leadProfile[i + 1][0], leadProfile[i + 1][1], leadZ));
    if (hh > 0) {
      const bank = new THREE.ExtrudeGeometry(new THREE.Shape([[-W / 2 + 0.05, 0], ...leadProfile, [fanX + 0.6, 0]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 2.3, bevelEnabled: false });
      s.mesh(bank, s.material(fogged(new THREE.Color(groundHex).multiplyScalar(0.9), leadZ)), [0, -0.01, leadZ - 1.15]);
    }
    for (const z of roads) {
      const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(fanX, 0, leadZ), new THREE.Vector3(fanX + 2.3, 0, leadZ), new THREE.Vector3(straightX - 2.3, 0, z), new THREE.Vector3(straightX, 0, z));
      const points = curve.getPoints(12);
      for (let i = 0; i < points.length - 1; i++) lay(points[i], points[i + 1]);
      lay(new THREE.Vector3(straightX, 0, z), new THREE.Vector3(endX, 0, z));
      // Rail brakes on each road where it straightens out.
      if (a.hump !== 'flat') for (const k of [-1, 1]) parts.push({ size: [1.5, 0.07, 0.07], at: [straightX + 1.2, 0.1, z + k * (GAUGE + 0.09)], color: fogged(dead ? '#7a5a40' : '#c9a422', z) });
      else parts.push({ size: [0.08, 0.3, 0.08], at: [straightX - 0.4, 0.15, z + 0.62], color: fogged('#d8d5c9', z) }, { size: [0.18, 0.14, 0.03], at: [straightX - 0.4, 0.34, z + 0.62], color: fogged('#c8281f', z) });
    }

    // ---- Wagons ----
    const snowWhite = new THREE.Color('#f1f4f6');
    const vanColours = ['#7d3d2b', '#5f6b72', '#8a6a3a', '#4e6e52', '#6a4a5a', '#3f5878'];
    const boxColours = ['#b9332b', '#2e5b96', '#d6a31f', '#2f8a6a', '#e0e0dc', '#c25a1e'];
    const tagColours = ['#ff5a8a', '#39d6c8', '#ffd23d', '#b06cff', '#f4f1e8', '#7be04a'];
    type Kind = 'van' | 'hopper' | 'tank' | 'flat';
    const pickKind = (): Kind => a.stock === 'coal' ? 'hopper' : a.stock === 'tank' ? 'tank' : a.stock === 'vans' ? 'van' : a.stock === 'containers' ? 'flat' : (['van', 'hopper', 'tank', 'flat', 'van', 'hopper'] as const)[Math.floor(random() * 6)];
    const wagon = (x: number, y: number, z: number, kind: Kind, pitch = 0, rusted = false, open = false) => {
      const L = 3.3;
      const tint = (hex: THREE.ColorRepresentation) => fogged(new THREE.Color(hex).lerp(new THREE.Color('#6a4630'), rusted ? 0.55 : mood.wear * 0.3), z);
      const put = (size: P3, at: P3, color: THREE.Color, list = parts, rot: P3 = [0, 0, pitch]) => list.push({ size, at: [x + at[0], y + at[1] + at[0] * Math.tan(pitch), z + at[2]], rot, color });
      const darkGear = tint('#252526');
      put([L, 0.07, 0.82], [0, 0.34, 0], darkGear);
      for (const end of [-1, 1]) put([0.78, 0.2, 0.74], [end * 1.05, 0.2, 0], darkGear);
      const cap = snowy && !open ? fogged(snowWhite, z) : null;
      if (kind === 'van') {
        const colour = tint(vanColours[Math.floor(random() * vanColours.length)]);
        put([L - 0.1, 0.88, 0.96], [0, 0.82, 0], colour);
        put([L, 0.07, 1.02], [0, 1.29, 0], cap ?? colour.clone().multiplyScalar(0.7));
        put([0.75, 0.74, 0.03], [open ? 0.75 : 0, 0.8, 0.49], open ? colour.clone().multiplyScalar(0.8) : colour.clone().multiplyScalar(0.85));
        if (open) put([0.72, 0.72, 0.02], [0, 0.8, 0.485], fogged('#17150f', z));
        if (a.stock === 'vans' || random() < 0.4) for (let i = 0; i < 2; i++) put([mix(0.4, 1.0, random()), mix(0.2, 0.4, random()), 0.02], [(random() - 0.5) * 2.2, mix(0.6, 0.85, random()), 0.492], tint(tagColours[Math.floor(random() * tagColours.length)]));
      } else if (kind === 'hopper') {
        const colour = tint(['#7d3d2b', '#2c2d30', '#7f868a', '#b9332b'][Math.floor(random() * 4)]);
        put([L - 0.1, 0.72, 0.96], [0, 0.78, 0], colour);
        for (let i = 0; i < 7; i++) put([0.05, 0.7, 0.03], [-1.4 + i * 0.47, 0.78, 0.49], colour.clone().multiplyScalar(0.8));
        put([L - 0.3, 0.14, 0.8], [0, 1.16, 0], cap ?? tint(a.stock === 'coal' ? '#17171a' : ['#17171a', '#8d8981', '#8b4a31'][Math.floor(random() * 3)]), rounds, [0, 0, pitch]);
      } else if (kind === 'tank') {
        const colour = tint(['#222326', '#b9bfc2', '#3a3d40', '#6a6f56'][Math.floor(random() * 4)]);
        put([0.88, L - 0.35, 0.88], [0, 0.82, 0], colour, rounds, [0, 0, Math.PI / 2 + pitch]);
        put([0.3, 0.2, 0.3], [0, 1.28, 0], colour, rounds);
        put([L - 0.6, 0.04, 0.9], [0, 0.8, 0], tint('#d8d5c9'));
        if (cap) put([L - 0.7, 0.06, 0.35], [0, 1.25, 0], cap);
      } else {
        put([L, 0.06, 0.95], [0, 0.4, 0], tint('#4a4640'));
        for (const end of [-1, 1]) if (random() < 0.85) { const colour = tint(boxColours[Math.floor(random() * boxColours.length)]); put([1.55, 0.8, 0.9], [end * 0.82, 0.83, 0], colour); if (cap) put([1.55, 0.05, 0.9], [end * 0.82, 1.25, 0], cap); }
      }
    };
    const pitchOf = 3.55;
    roads.forEach((z, i) => {
      const back = i < 3;
      let cuts: [number, number][] = [];
      if (a.standing === 'full') cuts = i === N - 1 ? [[5 + random() * 2, 2]] : [[straightX + 3.2 + random() * 1.5, 3 + Math.floor(random() * 2)]];
      else if (a.standing === 'cuts' || a.standing === 'rolling') { if (random() < 0.62 && i < N - 1) cuts = [[mix(i === 5 ? 5 : 2.5, 7, random()), 1 + Math.floor(random() * 3)]]; }
      else if (a.standing === 'derelict') { if (back) cuts = [[straightX + 3 + random() * 2, 4]]; }
      if (i === 0 && a.standing !== 'derelict' && a.standing !== 'full') cuts = [[straightX + 2.6, 5]]; // the distant row
      for (const [start, count] of cuts) for (let k = 0; k < count; k++) { const x = start + k * pitchOf; if (x < endX - 1.6) wagon(x, 0, z, pickKind(), 0, a.standing === 'derelict'); }
    });
    if (a.standing === 'rolling') wagon(straightX + 1.3, 0, roads[5], pickKind());
    let openVanAt: THREE.Vector3 | null = null;
    if (a.life === 'drifters') { openVanAt = new THREE.Vector3(8, 0, roads[N - 1]); wagon(openVanAt.x, 0, openVanAt.z, 'van', 0, true, true); }

    // ---- Engine ----
    const glowing: THREE.MeshStandardMaterial[] = [];
    const lamp = (hex: string, strength: number) => { const material = new THREE.MeshStandardMaterial({ color: strength > 0 ? hex : '#3a3836', emissive: hex, emissiveIntensity: strength, roughness: 0.4 }); if (strength > 0) glowing.push(material); return material; };
    const warmLamp = lamp('#ffd9a0', 2.4 * night), redLamp = lamp('#ff3020', 2.6 * night), greenLamp = lamp('#30ff80', 2.6 * night), whiteLamp = lamp('#f4f8ff', 2.4 * night);
    const engine = (x: number, y: number, z: number, pitch: number, running: boolean) => {
      const body = fogged(['#d6701e', '#2f6a4a', '#2e5b96', '#b9332b'][Math.floor(random() * 4)], z);
      const put = (size: P3, at: P3, color: THREE.ColorRepresentation) => parts.push({ size, at: [x + at[0], y + at[1] + at[0] * Math.tan(pitch), z + at[2]], rot: [0, 0, pitch], color });
      put([3.4, 0.14, 0.9], [0, 0.36, 0], fogged('#222224', z));
      for (const end of [-1, 1]) put([0.9, 0.24, 0.8], [end * 1.05, 0.2, 0], fogged('#222224', z));
      put([1.9, 0.72, 0.74], [0.6, 0.8, 0], body);
      put([1.0, 1.1, 0.94], [-0.95, 0.98, 0], body);
      put([1.1, 0.06, 1.0], [-0.95, 1.56, 0], snowy ? fogged(snowWhite, z) : fogged('#3a3d40', z));
      put([0.5, 0.36, 0.96], [-0.95, 1.22, 0], running ? '#ffe2ae' : '#2a3038');
      put([0.12, 0.3, 0.12], [1.1, 1.3, 0], fogged('#222224', z));
      for (const k of [-1, 1]) put([0.06, 0.3, 0.3], [1.72 * k, 0.5, 0], '#e0b020');
      const head = s.ball([0.1, 0.1, 0.1], [x + 1.62, y + 1.0 + 1.62 * Math.tan(pitch), z], running ? whiteLamp : lamp('#f4f8ff', 0), 10);
      head.castShadow = false;
    };
    if (a.life === 'working') {
      const pitch = Math.atan2(hh * 0.5, 2.0);
      engine(-10.5, hh * 0.56, leadZ, pitch, true);
      wagon(-7.4, hh * 0.6, leadZ, pickKind(), -Math.atan2(hh * 0.55, 1.6));
    } else if (a.life === 'waiting') engine(9.6, 0, roads[N - 2], 0, false);

    // ---- Hump cabin and signal ----
    const cabinLit = lamp('#ffd9a0', 1.8 * night);
    if (a.hump !== 'flat') {
      const cx = -9.8, cz = -1.4, floor = a.hump === 'crest' ? 1.7 : 1.0;
      for (const dx of [-0.55, 0.55]) for (const dz of [-0.45, 0.45]) parts.push({ size: [0.1, floor, 0.1], at: [cx + dx, floor / 2, cz + dz], color: fogged('#4a4038', cz) });
      strut([cx - 0.55, 0.1, cz + 0.45], [cx + 0.55, floor, cz + 0.45], 0.06, fogged('#4a4038', cz)); strut([cx + 0.55, 0.1, cz + 0.45], [cx - 0.55, floor, cz + 0.45], 0.06, fogged('#4a4038', cz));
      parts.push({ size: [1.6, 0.5, 1.3], at: [cx, floor + 0.25, cz], color: fogged('#6f8279', cz) }, { size: [1.9, 0.1, 1.6], at: [cx, floor + 1.25, cz], color: snowy ? snowWhite : fogged('#474d55', cz) });
      s.box([1.5, 0.7, 1.2], [cx, floor + 0.85, cz], cabinLit).castShadow = false;
      for (const dx of [-0.75, 0, 0.75]) parts.push({ size: [0.07, 0.72, 0.07], at: [cx + dx, floor + 0.85, cz + 0.61], color: '#e9e4d6' });
      strut([cx + 0.9, floor, cz + 0.3], [cx + 2.3, 0, cz + 0.5], 0.08, fogged('#4a4038', cz), 0.5);
      // Hump signal: a mast with a column of white lights beside the crest.
      parts.push({ size: [0.08, hh + 2.4, 0.08], at: [-8.9, (hh + 2.4) / 2, leadZ + 1.45], color: fogged('#d8d5c9', leadZ) }, { size: [0.3, 0.8, 0.12], at: [-8.9, hh + 2.2, leadZ + 1.5], color: '#18191b' });
      for (let k = 0; k < 3; k++) s.ball([0.07, 0.07, 0.05], [-8.9, hh + 1.95 + k * 0.25, leadZ + 1.58], k === 1 && !dead ? whiteLamp : lamp('#f4f8ff', 0), 8).castShadow = false;
    }
    // Dwarf signals at the foot of the fan.
    roads.forEach((z, i) => {
      parts.push({ size: [0.14, 0.3, 0.14], at: [straightX - 1.1, 0.15, z - 0.62], color: '#18191b' });
      s.ball([0.07, 0.07, 0.07], [straightX - 1.1, 0.33, z - 0.62], dead ? lamp('#ff3020', 0) : i === 2 || (i === 5 && a.standing === 'rolling') ? greenLamp : redLamp, 8).castShadow = false;
    });

    // ---- Overhead ----
    const steel = (z: number) => fogged(new THREE.Color('#3a3f42').lerp(new THREE.Color('#6a4630'), mood.wear * 0.5), z);
    const zBack = roads[0] - 0.9, zFront = roads[N - 1] + 0.9;
    if (a.overhead === 'catenary') {
      for (const x of [0.2, 5.6, 11]) {
        for (const z of [zBack, zFront]) parts.push({ size: [0.14, 3.6, 0.14], at: [x, 1.8, z], color: steel(z) });
        strut([x, 3.45, zBack], [x, 3.45, zFront], 0.1, steel(-4)); strut([x, 3.1, zBack], [x, 3.1, zFront], 0.06, steel(-4));
        for (let k = 0; k < 8; k++) { const z0 = mix(zBack, zFront, k / 8), z1 = mix(zBack, zFront, (k + 1) / 8); strut([x, k % 2 ? 3.45 : 3.1, z0], [x, k % 2 ? 3.1 : 3.45, z1], 0.04, steel(-4)); }
        for (const z of roads) parts.push({ size: [0.04, 0.5, 0.04], at: [x, 2.85, z], color: steel(z) });
      }
      for (const z of roads) { parts.push({ size: [endX - straightX + 1.2, 0.025, 0.025], at: [(endX + straightX - 1.2) / 2, 2.6, z], color: fogged('#5a4a3a', z) }); parts.push({ size: [endX - straightX + 1.2, 0.02, 0.02], at: [(endX + straightX - 1.2) / 2, 2.95, z], color: fogged('#5a4a3a', z) }); }
    } else if (a.overhead === 'gantries') {
      for (const x of [1.2, 8.2]) {
        for (const z of [zBack, zFront]) { parts.push({ size: [0.22, 3.2, 0.22], at: [x, 1.6, z], color: steel(z) }); parts.push({ size: [0.5, 0.15, 0.5], at: [x, 0.07, z], color: fogged('#a5a39b', z) }); }
        for (const y of [3.0, 3.5]) strut([x, y, zBack - 0.2], [x, y, zFront + 0.2], 0.08, steel(-4));
        for (let k = 0; k < 14; k++) { const z0 = mix(zBack, zFront, k / 14), z1 = mix(zBack, zFront, (k + 1) / 14); strut([x, k % 2 ? 3.5 : 3.0, z0], [x, k % 2 ? 3.0 : 3.5, z1], 0.04, steel(-4)); }
        roads.forEach((z, i) => {
          parts.push({ size: [0.14, 0.52, 0.2], at: [x, 3.95, z], color: '#18191b' }, { size: [0.05, 0.3, 0.05], at: [x, 3.6, z], color: steel(z) });
          const colour = dead ? lamp('#ff3020', 0) : (i * 3 + Math.round(x)) % 5 === 0 ? greenLamp : redLamp;
          for (const k of [-1, 1]) s.ball([0.05, 0.08, 0.08], [x + k * 0.08, 3.95, z], colour, 8).castShadow = false;
        });
      }
    } else if (a.overhead === 'floodlights') {
      for (const [x, z] of [[-4.6, 1.0], [3.8, 1.0], [11.4, 1.0], [0, zBack - 0.3], [8, zBack - 0.3]]) {
        const h = 5.6;
        for (const dx of [-0.12, 0.12]) for (const dz of [-0.12, 0.12]) parts.push({ size: [0.05, h, 0.05], at: [x + dx, h / 2, z + dz], color: steel(z) });
        for (let k = 0; k < 10; k++) { const y0 = (k / 10) * h, y1 = ((k + 1) / 10) * h, sgn = k % 2 ? 1 : -1; strut([x - 0.12 * sgn, y0, z + 0.12], [x + 0.12 * sgn, y1, z + 0.12], 0.03, steel(z)); strut([x + 0.12, y0, z - 0.12 * sgn], [x + 0.12, y1, z + 0.12 * sgn], 0.03, steel(z)); }
        parts.push({ size: [1.5, 0.1, 0.3], at: [x, h + 0.05, z], color: steel(z) }, { size: [0.5, 0.15, 0.5], at: [x, 0.07, z], color: fogged('#a5a39b', z) });
        for (let k = 0; k < 4; k++) { s.box([0.3, 0.2, 0.26], [x - 0.56 + k * 0.375, h - 0.08, z + 0.06], warmLamp).castShadow = false; }
      }
    } else {
      for (let k = 0; k < 6; k++) {
        const x = -11.6 + k * 4.6, z = zFront + 0.2, lean = (random() - 0.5) * 0.08 * (1 + mood.wear * 2);
        strut([x, 0, z], [x + lean * 3.4, 3.4, z], 0.1, fogged('#4a3b2e', z));
        for (const y of [2.9, 3.2]) parts.push({ size: [0.07, 0.07, 1.0], at: [x + lean * y, y, z], color: fogged('#4a3b2e', z) });
        if (k < 5) for (const dz of [-0.4, 0.4]) for (const y of [2.95, 3.25]) strut([x, y, z + dz], [x + 4.6, y, z + dz], 0.015, fogged('#2a2a2a', z));
      }
    }

    // ---- Skyline: flat, fog-faded shapes along the back edge ----
    const zSky = -D / 2 + 0.25;
    const far = (hex: string, amount = 0.42) => new THREE.Color(hex).lerp(skyColour, Math.min(0.9, amount + haze * 0.25));
    parts.push({ size: [8, 2.4, 0.3], at: [-7.6, 1.2, zSky], color: far('#6a6e72') });
    for (let k = 0; k < 5; k++) parts.push({ size: [1.35, 0.9, 0.3], at: [-10.8 + k * 1.6, 2.55, zSky], rot: [0, 0, 0.5], color: far('#5a5e62') });
    parts.push({ size: [0.5, 5.8, 0.3], at: [-2.4, 2.9, zSky], color: far('#7a5a50') }, { size: [0.36, 4.6, 0.3], at: [-1.3, 2.3, zSky], color: far('#7a5a50', 0.55) });
    parts.push({ size: [2.8, 4.4, 0.3], at: [8.2, 2.2, zSky], color: far('#7c7f80') }, { size: [1.1, 0.9, 0.3], at: [8.2, 4.85, zSky], color: far('#6c6f70') }, { size: [2.2, 3.0, 0.3], at: [10.9, 1.5, zSky], color: far('#8a8c8a', 0.55) });
    rounds.push({ size: [3.8, 2.8, 0.5], at: [3.2, 1.4, zSky], color: far('#70787c') });
    for (let k = 0; k < 6; k++) parts.push({ size: [0.05, 3.1, 0.05], at: [1.4 + k * 0.72, 1.55, zSky + 0.3], color: far('#4a4e52') });
    for (let k = 0; k < 9; k++) parts.push({ size: [0.5, 0.5, 0.05], at: [-11 + k * 0.85, 1.5, zSky + 0.17], color: !dead && random() < 0.5 ? new THREE.Color('#ffe2ae').lerp(skyColour, 0.3) : far('#3a3d40') });
    // Fence along the back with gaps, and a gate on the left edge.
    for (let x = -W / 2 + 0.5; x < W / 2; x += 1.5) { if (dead && random() < 0.2) continue; parts.push({ size: [0.05, 1.0, 0.05], at: [x, 0.5, zSky + 0.7], color: far('#4a4e52', 0.4) }, { size: [1.5, 0.03, 0.03], at: [x + 0.75, 0.98, zSky + 0.7], color: far('#4a4e52', 0.4) }, { size: [1.5, 0.03, 0.03], at: [x + 0.75, 0.5, zSky + 0.7], color: far('#4a4e52', 0.4) }); }

    // ---- The apron in front: where the cast stands ----
    const apron: Block[] = [];
    const groundColour = new THREE.Color(groundHex);
    // A trodden service road, sleeper stacks, a rail pile and a lineside hut.
    parts.push({ size: [W - 1, 0.02, 1.3], at: [0, 0.011, 1.0], color: groundColour.clone().lerp(new THREE.Color('#5a5753'), a.ground === 'snow' ? 0.22 : 0.3) });
    for (const [x, z, turn] of [[-11, 8.4, 0.3], [11, 9.3, -0.5], [-3.6, 10.1, 1.4]] as const) for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 3; k++) parts.push({ size: [1.3, 0.09, 0.14], at: [x + Math.sin(turn + (layer % 2) * 1.57) * (k - 1) * 0.3, 0.05 + layer * 0.1, z + Math.cos(turn + (layer % 2) * 1.57) * (k - 1) * 0.3], rot: [0, turn + (layer % 2) * 1.57, 0], color: layer === 2 && snowy ? snowWhite : '#4a3b2e' });
    for (let k = 0; k < 5; k++) parts.push({ size: [4.2, 0.07, 0.05], at: [9.8, 0.04 + Math.floor(k / 3) * 0.08, 5.0 + (k % 3) * 0.12], rot: [0, 0.06, 0], color: '#6a4630' });
    parts.push({ size: [1.6, 1.3, 1.3], at: [-11.2, 0.65, 4.6], color: '#6b5a48' }, { size: [1.9, 0.1, 1.6], at: [-11.2, 1.37, 4.6], rot: [0, 0, 0.12], color: snowy ? snowWhite : '#474d55' }, { size: [0.5, 0.95, 0.04], at: [-10.9, 0.48, 5.27], color: '#3f5a4c' });
    s.box([0.4, 0.34, 0.03], [-11.6, 0.85, 5.27], cabinLit).castShadow = false;
    // Drifts, puddles or frost patches, depending on the ground.
    const patches = 18 + Math.round(mood.density * 14);
    for (let k = 0; k < patches; k++) {
      const x = (random() - 0.5) * (W - 2), z = mix(0.8, D / 2 - 0.6, random());
      if (Math.hypot(x, z - 4.8) < 2.6) continue;
      if (a.ground === 'slush') apron.push({ size: [mix(0.6, 1.8, random()), 0.012, mix(0.4, 1.0, random())], at: [x, 0.006, z], rot: [0, random() * 3, 0], color: '#6d7780' });
      else if (a.ground === 'snow') apron.push({ size: [mix(0.8, 2.2, random()), mix(0.08, 0.22, random()), mix(0.6, 1.4, random())], at: [x, 0, z], rot: [0, random() * 3, 0], color: '#f6f8fa' });
      else apron.push({ size: [mix(0.6, 1.9, random()), 0.014, mix(0.5, 1.2, random())], at: [x, 0.007, z], rot: [0, random() * 3, 0], color: groundColour.clone().lerp(new THREE.Color('#eef1f3'), 0.55) });
    }
    // Footprints: a wandering line across the apron toward the yard.
    const walkTo = openVanAt ?? new THREE.Vector3(-3, 0, 1.0);
    if (a.ground === 'snow' || a.ground === 'slush' || a.life === 'drifters') {
      let px = W / 2 - 1.2, pz = D / 2 - 1.4;
      for (let k = 0; k < 60 && Math.hypot(px - walkTo.x, pz - walkTo.z) > 0.6; k++) {
        const heading = Math.atan2(walkTo.x - px, walkTo.z - pz) + Math.sin(k * 0.5) * 0.35;
        px += Math.sin(heading) * 0.34; pz += Math.cos(heading) * 0.34;
        apron.push({ size: [0.11, 0.012, 0.22], at: [px + Math.cos(heading) * (k % 2 ? 0.09 : -0.09), 0.008, pz - Math.sin(heading) * (k % 2 ? 0.09 : -0.09)], rot: [0, heading, 0], color: groundColour.clone().multiplyScalar(0.62) });
      }
    }
    // The closed yard gets a gate and a notice; the drifters get their fire.
    const fire: THREE.MeshStandardMaterial[] = [];
    if (dead) {
      for (const dz of [0, 1.3]) { parts.push({ size: [0.08, 1.5, 0.08], at: [-W / 2 + 0.6, 0.75, 8.0 + dz * 1.4], color: '#5a5e62' }); }
      for (const y of [0.3, 0.75, 1.3]) parts.push({ size: [0.04, 0.04, 1.85], at: [-W / 2 + 0.6, y, 8.9], color: '#5a5e62' });
      const notice = s.label(a.life === 'closed' ? 'YARD CLOSED' : 'NO TRESPASSING', 1.5, 0.5, [-W / 2 + 0.66, 0.95, 8.9], '#f1eee4', '#b3261d');
      notice.rotation.y = Math.PI / 2;
    }
    if (a.life === 'drifters') {
      const fx = 5.4, fz = zBack + 0.1;
      const ember = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 2.6 });
      fire.push(ember);
      rounds.push({ size: [0.34, 0.5, 0.34], at: [fx, 0.25, fz], color: '#3a2a22' });
      s.mesh(new THREE.ConeGeometry(0.2, 0.6, 7), ember, [fx, 0.75, fz]).castShadow = false;
      s.ball([0.9, 0.05, 0.9], [fx, 0.02, fz], new THREE.MeshBasicMaterial({ color: '#ff9a4a', transparent: true, opacity: 0.35, depthWrite: false }), 12);
      for (const [dx, dz] of [[-0.6, 0.3], [0.55, 0.4], [0.1, -0.6]]) { rounds.push({ size: [0.3, 0.55, 0.3], at: [fx + dx, 0.32, fz + dz], color: ['#4c5340', '#5a4636', '#3f4652'][Math.abs(Math.round(dx * 3)) % 3] }); rounds.push({ size: [0.2, 0.2, 0.2], at: [fx + dx, 0.68, fz + dz], color: '#c99a7c' }); }
    }

    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
    blocks(s.root, white, parts);
    blocks(s.root, white, rounds, new THREE.CylinderGeometry(0.5, 0.5, 1, 14));
    const apronMesh = blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: a.ground === 'slush' ? 0.25 : 0.95 }), apron, new THREE.SphereGeometry(0.5, 12, 6));
    if (apronMesh) apronMesh.castShadow = false;

    // ---- Weather: fog banks as see-through sheets, and falling snow ----
    const veil = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
      const up = ctx.createLinearGradient(0, h, 0, 0); up.addColorStop(0, '#ffffff'); up.addColorStop(0.45, '#bbbbbb'); up.addColorStop(1, '#000000');
      ctx.fillStyle = up; ctx.fillRect(0, 0, w, h);
      for (const [from, to] of [[0, w * 0.2], [w, w * 0.8]]) { const edge = ctx.createLinearGradient(from, 0, to, 0); edge.addColorStop(0, 'rgba(0,0,0,1)'); edge.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = edge; ctx.fillRect(Math.min(from, to), 0, w * 0.2, h); }
    });
    veil.colorSpace = THREE.NoColorSpace;
    const sheet = (z: number, opacity: number, height: number) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(W + 10, height), new THREE.MeshBasicMaterial({ color: skyColour, alphaMap: veil, transparent: true, opacity, depthWrite: false })); mesh.position.set(0, height / 2 - 0.1, z); s.root.add(mesh); };
    sheet(zSky + 1.0, 0.2 + haze * 0.45, 8);
    if (a.weather === 'fog') { sheet(roads[2] + 0.65, 0.4, 4.5); sheet(roads[5] + 0.65, 0.3, 3.5); sheet(0.6, 0.16, 2.5); }
    if (a.weather === 'snowing') sheet(roads[3] + 0.65, 0.2, 4.5);
    const flakeCount = a.weather === 'snowing' ? 300 + Math.round(mood.energy * 200) : 0;
    const flakes: THREE.Vector3[] = Array.from({ length: flakeCount }, () => new THREE.Vector3((random() - 0.5) * W, random() * 5.2, (random() - 0.5) * D));
    const flakeMesh = flakeCount ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 5, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }), flakeCount) : null;
    const flakeMatrix = new THREE.Matrix4();
    if (flakeMesh) { flakes.forEach((flake, i) => flakeMesh.setMatrixAt(i, flakeMatrix.makeTranslation(flake.x, flake.y, flake.z))); flakeMesh.frustumCulled = false; s.root.add(flakeMesh); }

    const fall = mix(0.5, 1.8, mood.energy), drift = mix(0.1, 1.2, mood.energy);
    const steady = glowing.map((material) => material.emissiveIntensity);
    world.update = (dt, time) => {
      if (flakeMesh) {
        flakes.forEach((flake, i) => {
          flake.y -= dt * fall; flake.x += dt * drift;
          if (flake.y < 0) flake.y += 5.2;
          if (flake.x > W / 2) flake.x -= W;
          flakeMesh.setMatrixAt(i, flakeMatrix.makeTranslation(flake.x, flake.y, flake.z));
        });
        flakeMesh.instanceMatrix.needsUpdate = true;
      }
      glowing.forEach((material, i) => { material.emissiveIntensity = steady[i] * (0.94 + Math.sin(time * 5 + i * 1.7) * 0.06); });
      for (const material of fire) material.emissiveIntensity = 2.2 + Math.sin(time * 11) * 0.5 + Math.sin(time * 23) * 0.25;
    };
    return world;
  },
});
