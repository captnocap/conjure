import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, score } from '@conjure/kit';

const SKIES = {
  bluehour: 'Northern blue hour: deep blue air, a pale pink afterglow in the notch, every window a point of gold.',
  lowcloud: 'A lid of low grey cloud cutting off the tops of the walls; flat, quiet, wet light.',
  midnightsun: 'Midsummer night: low golden sun that never sets, long shadows across the water.',
  autumn: 'A clear cold autumn day, birches turned yellow, the first new snow high up.',
  aurora: 'Winter night with green aurora hanging over the valley head.',
} as const;
const SKY: Record<keyof typeof SKIES, { top: string; horizon: string; hemi: [string, string, number]; key: [string, number]; water: string; glow: number; cold: number }> = {
  bluehour: { top: '#7b92b8', horizon: '#ecd6cc', hemi: ['#a9bde0', '#3b4553', 1.55], key: ['#cdd8f2', 1.3], water: '#33485c', glow: 2.4, cold: -0.15 },
  lowcloud: { top: '#c3c8cc', horizon: '#dcdfe1', hemi: ['#e4e8ec', '#4a5054', 1.7], key: ['#eceef0', 0.9], water: '#56636b', glow: 1.3, cold: 0 },
  midnightsun: { top: '#b4c0d6', horizon: '#f7d9a4', hemi: ['#f3dfc4', '#4b4a52', 1.3], key: ['#ffc689', 2.5], water: '#5b6d80', glow: 0.9, cold: 0.2 },
  autumn: { top: '#a5c1df', horizon: '#e8eff3', hemi: ['#e0ebf7', '#55564c', 1.5], key: ['#fff1d6', 2.6], water: '#3d5f74', glow: 0.7, cold: 0.05 },
  aurora: { top: '#586d92', horizon: '#aebcd2', hemi: ['#93aacb', '#2f3947', 1.55], key: ['#bccbee', 1.1], water: '#2d4055', glow: 2.8, cold: -0.3 },
};

export default defineWorld({
  questions: {
    sky: choice('What hour and weather hold the fjord?', SKIES),
    settlement: choice('What kind of place has grown on the shore?', {
      farms: 'Scattered farmsteads: red barns, white houses, hay drying on long racks.',
      fishing: 'A fishing hamlet: a row of boathouses at the waterline and a timber quay.',
      hamlet: 'A tight cluster of houses around a small white church.',
      abandoned: 'A handful of grey unlit houses, some roofless: the last family left years ago.',
    }),
    tight: score('How close do the walls stand?', ['A broad U-shaped valley with plenty of sky', 'Close walls', 'A dark slit you could shout across']),
    falls: choice('What comes down the walls?', {
      none: 'Nothing: dry dark rock.',
      thread: 'One thin white thread of a waterfall.',
      many: 'Waterfalls everywhere after rain, white veins on every face.',
      frozen: 'Blue icefalls frozen in place.',
    }),
    water: choice('How does the water lie?', {
      mirror: 'A perfect dark mirror doubling the walls.',
      ruffled: 'Ruffled by a down-valley wind, the reflections broken.',
      mist: 'Still, with bands of mist lying on it.',
      ice: 'Frozen at the head, with one dark lead kept open to the shore.',
    }),
    afloat: choice('What is out on the water?', {
      nothing: 'Nothing.',
      moorings: 'A few small boats on moorings off the shore.',
      fishfarm: 'The rings of a salmon farm and its feed barge.',
      buoys: 'A curving line of orange net buoys.',
    }),
    story: choice('What is the village doing tonight?', {
      ordinary: 'Nothing special: supper, a few lights.',
      waiting: 'Waiting: every window lit and a lantern at the end of the jetty for a boat not yet home.',
      bonfire: 'A midsummer bonfire burning on the shore.',
      slide: 'Living with it: a fresh rockslide has come down one wall to the edge of the fields.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const sky = SKY[a.sky];
    const root = new THREE.Group();
    const mirrored = new THREE.Group(); // everything the water should double
    root.add(mirrored);
    const warmth = clamp01(mood.warmth + sky.cold);
    const winter = warmth < 0.3;
    const snowLine = mix(0.2, 1.0, warmth);
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const glow = sky.glow * mix(0.7, 1.2, dusk);
    const base = mix(27, 17.5, a.tight);
    const pa = random() * 6, pb = random() * 6, pc = random() * 6, pd = random() * 6;
    const slideSide = random() < 0.5 ? -1 : 1, slideZ = mix(-20, -9, random());

    const gap = (z: number) => base + Math.max(0, z + 8) * 0.22 + Math.min(0, z + 8) * 0.06;
    const wallHeight = (z: number) => mix(94, 46, clamp01((75 - z) / 170)) + Math.sin(z * 0.09 + pd) * 7 + Math.sin(z * 0.31 + pa) * 3;
    const wallR = (z: number, v: number) => {
      const foot = gap(z) + Math.sin(z * 0.13 + pa) * 2.2 + Math.sin(z * 0.37 + pb) * 1.1;
      const flare = Math.max(0, 0.14 - v) / 0.14;
      return foot - 5 * flare * flare + v * wallHeight(z) * 0.15 + Math.sin(z * 0.9 + v * 3 + pc) * 0.7 * v + (Math.floor(v * 7) % 2) * 0.9 * Math.min(1, v * 5);
    };
    const shoreZ = (x: number) => -1.5 - (x / base) ** 2 * 6 + Math.sin(x * 0.5 + pa) * 0.6 + 3 * Math.exp(-((x / 6) ** 2));
    const step = mix(13, 19, random());
    const ground = (x: number, z: number) => {
      const d = shoreZ(x) - z;
      if (d < 0) return -0.03;
      const s = clamp01((d - 26) / 14);
      let h = 0.2 + Math.min(d, 2) * 0.12 + d * 0.04 + s * s * (3 - 2 * s) * step + Math.max(0, d - 40) * 0.13;
      const e = Math.abs(x) - (gap(z) - 5);
      if (e > 0) h += e * e * 0.3;
      if (d > 4) h += (Math.sin(x * 0.6 + pb) * Math.cos(z * 0.5 + pc)) * 0.22 * Math.min(1, (d - 4) / 5);
      return h;
    };

    // Lights.
    root.add(new THREE.HemisphereLight(sky.hemi[0], sky.hemi[1], sky.hemi[2]));
    const key = new THREE.DirectionalLight(new THREE.Color(sky.key[0]).lerp(new THREE.Color('#ffb070'), mood.warmth * 0.2), sky.key[1]);
    key.position.set(mix(-75, 75, mood.daylight), a.sky === 'midnightsun' ? 30 : 58, 48);
    key.target.position.set(0, 5, -10);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.25;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);

    // Sky backdrop: light at the horizon, deeper overhead.
    const gradient = document.createElement('canvas');
    gradient.width = 4;
    gradient.height = 256;
    const gctx = gradient.getContext('2d')!;
    const ramp = gctx.createLinearGradient(0, 0, 0, 256);
    ramp.addColorStop(0, sky.top);
    ramp.addColorStop(0.55, sky.top);
    ramp.addColorStop(0.9, sky.horizon);
    ramp.addColorStop(1, sky.horizon);
    gctx.fillStyle = ramp;
    gctx.fillRect(0, 0, 4, 256);
    const skyTexture = new THREE.CanvasTexture(gradient);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1100, 330), new THREE.MeshBasicMaterial({ map: skyTexture, fog: false }));
    backdrop.position.set(0, 150, -300);
    mirrored.add(backdrop);

    // Fjord walls: displaced, flat-shaded sheets painted with strata, scrub and snow.
    const rockA = new THREE.Color('#3d434b'), rockB = new THREE.Color('#5d626a'), white = new THREE.Color('#f0f3f6');
    const scrub = new THREE.Color(winter ? '#6a7077' : a.sky === 'autumn' ? '#8a7436' : '#465a3c');
    const scarColour = new THREE.Color('#b9b09c');
    const c = new THREE.Color();
    const NZ = 74, NV = 23;
    for (const side of [-1, 1]) {
      const positions: number[] = [];
      const grid: THREE.Vector3[][] = [];
      for (let i = 0; i <= NZ; i++) {
        const z = 80 - (i / NZ) * 182;
        grid.push([]);
        for (let j = 0; j <= NV; j++) {
          const v = Math.min(1, j / (NV - 1));
          const plateau = j === NV;
          grid[i].push(new THREE.Vector3(side * (wallR(z, v) + (plateau ? 34 : 0)), v * wallHeight(z) + (plateau ? 7 : 0), z));
        }
      }
      const colours: number[] = [];
      for (let i = 0; i < NZ; i++)
        for (let j = 0; j < NV; j++) {
          const quad = [grid[i][j], grid[i + 1][j], grid[i][j + 1], grid[i + 1][j + 1]];
          const tris = side > 0 ? [[0, 2, 1], [1, 2, 3]] : [[0, 1, 2], [1, 3, 2]];
          for (const tri of tris) {
            const z = (quad[tri[0]].z + quad[tri[1]].z + quad[tri[2]].z) / 3;
            const v = clamp01((j + 0.5) / (NV - 1));
            c.copy(rockA).lerp(rockB, clamp01(Math.sin(z * 1.7 + pa) * 0.4 + 0.5 + Math.sin(v * 31 + z * 0.2) * 0.25)).offsetHSL(0, 0, (random() - 0.5) * 0.035);
            const patch = Math.sin(z * 0.23 + v * 9 + pb) * Math.sin(z * 0.61 + pc);
            if (v < 0.15 + patch * 0.07) c.lerp(scrub, 0.6);
            const ledge = Math.floor(v * 7) % 2 === 1;
            if (j === NV - 1 ? warmth < 0.9 : (ledge && v + patch * 0.3 > snowLine) || v + patch * 0.2 > snowLine + 0.42 || (Math.sin(z * 0.52 + pd + side) > 0.92 && v > snowLine * 0.55)) c.copy(white).offsetHSL(0, 0, (random() - 0.5) * 0.03);
            if (a.story === 'slide' && side === slideSide) {
              const w = mix(1.2, 4.5, 1 - v);
              if (Math.abs(z - slideZ - Math.sin(v * 4 + pa) * 2) < w && v < 0.72) c.copy(scarColour).offsetHSL(0, 0, (random() - 0.5) * 0.08);
            }
            for (const k of tri) { positions.push(quad[k].x, quad[k].y, quad[k].z); colours.push(c.r, c.g, c.b); }
          }
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      const wall = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
      wall.castShadow = wall.receiveShadow = true;
      mirrored.add(wall);
    }

    // Shore, fields and the valley climbing away behind.
    const grass = new THREE.Color(winter ? '#e9eef2' : a.sky === 'autumn' ? '#8f9148' : '#6a8a45');
    const shingle = new THREE.Color('#8b8a82');
    const terrainGeometry = new THREE.PlaneGeometry(132, 122, 66, 61).toNonIndexed();
    terrainGeometry.rotateX(-Math.PI / 2);
    terrainGeometry.translate(0, 0, -53);
    const tp = terrainGeometry.attributes.position;
    const tc = new Float32Array(tp.count * 3);
    for (let i = 0; i < tp.count; i += 3) {
      let cx = 0, cz = 0, cy = 0;
      for (let k = 0; k < 3; k++) {
        const y = ground(tp.getX(i + k), tp.getZ(i + k));
        tp.setY(i + k, y);
        cx += tp.getX(i + k) / 3; cz += tp.getZ(i + k) / 3; cy += y / 3;
      }
      const d = shoreZ(cx) - cz;
      const field = Math.sin(cx * 0.45 + pb) * Math.cos(cz * 0.4 + pc);
      if (d >= 0 && Math.abs(cx) > gap(cz) - 4.2) c.copy(rockA).lerp(scrub, field > 0 ? 0.55 : 0.15);
      else if (d < 1.6) c.copy(shingle);
      else if (d < 26) c.copy(grass).offsetHSL(a.settlement === 'farms' && !winter ? Math.round(field * 2) * 0.012 : 0, 0, field * 0.035);
      else if (d < 40) c.copy(rockA).lerp(scrub, field > 0 ? 0.6 : 0.1);
      else c.copy(cy > snowLine * 60 ? white : winter ? white : scrub).lerp(rockB, field > 0.4 ? 0.5 : 0);
      c.offsetHSL(0, 0, (random() - 0.5) * 0.03);
      for (let k = 0; k < 3; k++) tc.set([c.r, c.g, c.b], (i + k) * 3);
    }
    terrainGeometry.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    terrainGeometry.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    terrain.receiveShadow = true;
    mirrored.add(terrain);

    // Distant peaks beyond the head of the valley.
    const far = new THREE.Color(sky.top).lerp(new THREE.Color('#55606e'), 0.55);
    for (let i = 0; i < 5; i++) {
      const h = mix(70, 125, random()), x = (i - 2) * 46 + (random() - 0.5) * 20, z = -170 - random() * 70;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(h * 0.75, h, 6, 1), new THREE.MeshStandardMaterial({ color: far, roughness: 1, flatShading: true }));
      peak.position.set(x, h / 2 + 4, z);
      peak.rotation.y = random() * 3;
      const cap = new THREE.Mesh(new THREE.ConeGeometry(h * 0.75 * 0.56, h * 0.55, 6, 1), new THREE.MeshStandardMaterial({ color: white.clone().lerp(new THREE.Color(sky.top), 0.15), roughness: 1, flatShading: true }));
      cap.position.set(x, 4 + h - h * 0.275 + 0.6, z);
      cap.rotation.y = peak.rotation.y;
      cap.scale.set(1.03, 1, 1.03);
      mirrored.add(peak);
      if (warmth < 0.92) mirrored.add(cap);
    }

    // Where the cast stands: [x, z, tallest, widest].
    const SLOTS: [number, number, number, number][] = [
      [0, 0, 9.5, 6],
      [base * 0.52, -9.5, 7, 4.4],
      [-base * 0.52, -10.5, 7, 4.4],
      [-base * 0.36, 15, 4.6, 3.2],
    ];
    SLOTS[0][1] = shoreZ(0) - 6.5;
    // The skerry that carries the fourth slot.
    {
      const geometry = new THREE.IcosahedronGeometry(1, 2);
      const sp = geometry.attributes.position;
      for (let i = 0; i < sp.count; i++) sp.setY(i, Math.min(sp.getY(i), 0.55) * (1 + Math.sin(sp.getX(i) * 6 + pa) * 0.1));
      geometry.computeVertexNormals();
      const skerry = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#5a5f63', roughness: 1, flatShading: true }));
      skerry.scale.set(5.2, 1.5, 4.2);
      skerry.position.set(SLOTS[3][0], 0, SLOTS[3][1]);
      skerry.castShadow = skerry.receiveShadow = true;
      mirrored.add(skerry);
    }
    const free = (x: number, z: number, r: number) => SLOTS.slice(0, 3).every(([sx, sz, , sr]) => Math.hypot(x - sx, z - sz) > sr + r);

    // The settlement.
    const material = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9, ...options });
    const windowLit = material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: glow, roughness: 0.4 });
    const windowDark = material('#222b33', { roughness: 0.3 });
    const roofSlate = material(winter ? '#eef1f4' : '#3b4046'), roofTurf = material(winter ? '#eef1f4' : '#5f7a3a');
    const paints = ['#a8321f', '#a8321f', '#eee9dc', '#c99532', '#eee9dc', '#6e1f1a', '#3f556b'];
    const gableShape = new THREE.Shape([new THREE.Vector2(-0.56, 0), new THREE.Vector2(0.56, 0), new THREE.Vector2(0, 0.42)]);
    const gableGeometry = new THREE.ExtrudeGeometry(gableShape, { depth: 1.08, bevelEnabled: false });
    gableGeometry.translate(0, 0, -0.54);
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const paneGeometry = new THREE.PlaneGeometry(1, 1);
    const litShare = a.settlement === 'abandoned' ? 0 : a.story === 'waiting' ? 1 : mix(0.3, 0.9, mood.cheer);
    const chimneys: THREE.Vector3[] = [];
    const placed: [number, number][] = [];
    const house = (x: number, z: number, turn: number, w: number, d: number, h: number, colour: string, options: { ruin?: boolean; boathouse?: boolean; spire?: boolean } = {}) => {
      const group = new THREE.Group();
      const paint = new THREE.Color(colour).lerp(new THREE.Color('#8b8780'), a.settlement === 'abandoned' ? 0.75 : mood.wear * 0.3);
      const body = new THREE.Mesh(boxGeometry, material(paint));
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      group.add(body);
      if (!options.ruin) {
        const roof = new THREE.Mesh(gableGeometry, random() < 0.3 ? roofTurf : roofSlate);
        roof.scale.set(w, h * 1.1, d);
        roof.position.y = h;
        group.add(roof);
      }
      if (options.boathouse) {
        const door = new THREE.Mesh(paneGeometry, windowDark);
        door.scale.set(w * 0.6, h * 0.8, 1);
        door.position.set(0, h * 0.42, d / 2 + 0.02);
        group.add(door);
      } else {
        const panes = Math.max(2, Math.round(w / 1.6));
        for (let i = 0; i < panes; i++) {
          const pane = new THREE.Mesh(paneGeometry, random() < litShare ? windowLit : windowDark);
          pane.scale.set(0.62, 0.8, 1);
          pane.position.set((i - (panes - 1) / 2) * (w / panes), h * 0.55, d / 2 + 0.02);
          group.add(pane);
        }
        if (!options.ruin && !options.spire) {
          const chimney = new THREE.Mesh(boxGeometry, material('#6a6d70'));
          chimney.scale.set(0.45, 1, 0.45);
          chimney.position.set(w * 0.2, h + h * 0.4, 0);
          group.add(chimney);
          if (random() < litShare * 0.8) chimneys.push(new THREE.Vector3(x, ground(x, z) + h * 1.4 + 0.6, z));
        }
      }
      if (options.spire) {
        const tower = new THREE.Mesh(boxGeometry, material(paint));
        tower.scale.set(w * 0.45, h * 1.9, w * 0.45);
        tower.position.set(0, h * 0.95, d / 2);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(w * 0.36, h * 1.5, 4), roofSlate);
        spire.rotation.y = Math.PI / 4;
        spire.position.set(0, h * 1.9 + h * 0.75, d / 2);
        group.add(tower, spire);
      }
      group.position.set(x, ground(x, z) - 0.15, z);
      group.rotation.y = turn;
      if (options.ruin) group.rotation.z = (random() - 0.5) * 0.08;
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      mirrored.add(group);
      placed.push([x, z]);
    };
    const clear = (x: number, z: number, r: number) => free(x, z, r) && placed.every(([px, pz]) => Math.hypot(x - px, z - pz) > r + 2.2) && Math.abs(x) < gap(z) - 5.5;
    const count = Math.round(mix(6, 17, mood.density) * (a.settlement === 'abandoned' ? 0.55 : 1));
    if (a.settlement === 'hamlet') house(1.5, shoreZ(1.5) - 21, (random() - 0.5) * 0.3, 4, 7, 3.6, '#f1eee4', { spire: true });
    if (a.settlement === 'fishing')
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 4.6 + (i > 2 ? 9 : -9) * 0.55 + (random() - 0.5), z = shoreZ(x) - 1.6;
        if (Math.abs(x) < gap(z) - 5 && free(x, z, 1.5)) house(x, z, (random() - 0.5) * 0.25, 2.9, 4.6, 2.2, paints[Math.floor(random() * 4)], { boathouse: true });
      }
    for (let i = 0, tries = 0; i < count && tries < 400; tries++) {
      const cluster = a.settlement === 'hamlet';
      const x = cluster ? (random() + random() - 1) * 13 : (random() - 0.5) * 2 * (base - 6);
      const d = cluster ? mix(11, 25, random()) : mix(4, 25, random());
      const z = shoreZ(x) - d;
      if (!clear(x, z, 2.6)) continue;
      const barn = a.settlement === 'farms' && random() < 0.35;
      const ruin = a.settlement === 'abandoned' && random() < 0.45;
      house(x, z, (random() - 0.5) * 0.7, barn ? 6.5 : mix(4, 5.4, random()), barn ? 4.6 : 3.6, barn ? 3.4 : mix(2.5, 3.1, random()), barn ? '#8f2a1c' : paints[Math.floor(random() * paints.length)], { ruin });
      i++;
    }
    // Hay racks and fences on a farm shore.
    if (a.settlement === 'farms' && !winter)
      for (let i = 0, tries = 0; i < 6 && tries < 80; tries++) {
        const x = (random() - 0.5) * 2 * (base - 7), z = shoreZ(x) - mix(3, 16, random());
        if (!clear(x, z, 3)) continue;
        const rack = new THREE.Mesh(boxGeometry, material('#c9b45a'));
        rack.scale.set(6, 1.3, 0.3);
        rack.position.set(x, ground(x, z) + 0.75, z);
        rack.rotation.y = 0.15 + (random() - 0.5) * 0.2;
        rack.castShadow = true;
        mirrored.add(rack);
        placed.push([x, z]);
        i++;
      }

    // Trees: birch on the shore, spruce up the step.
    const birchPoints: { m: THREE.Matrix4; colour: THREE.Color }[] = [], sprucePoints: { m: THREE.Matrix4; colour: THREE.Color }[] = [];
    const leaf = winter ? ['#5f5850', '#6b6259'] : a.sky === 'autumn' ? ['#d9a82a', '#c98a22', '#e3c33a'] : ['#7fa84a', '#6a9440', '#93b85a'];
    for (let i = 0; i < 150; i++) {
      const x = (random() - 0.5) * 2 * (base + 4), d = mix(2, 60, random() ** 1.4), z = shoreZ(x) - d;
      if (Math.abs(x) > gap(z) - 2 || !free(x, z, 2) || placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 3.4)) continue;
      const y = ground(x, z), size = mix(1.1, 2.3, random()) * (winter ? 0.8 : 1);
      const spruce = d > 22 ? random() < 0.7 : random() < 0.15;
      if (winter && !spruce && random() < 0.85) continue;
      (spruce ? sprucePoints : birchPoints).push({ m: new THREE.Matrix4().compose(new THREE.Vector3(x, y + size * (spruce ? 1.1 : 1.2), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 3, 0)), new THREE.Vector3(size * (spruce ? 0.55 : 0.8), size * (spruce ? 1.15 : 1.1), size * (spruce ? 0.55 : 0.8))), colour: new THREE.Color(spruce ? (winter ? '#55665a' : '#2f4a35') : leaf[Math.floor(random() * leaf.length)]) });
    }
    const forest = (geometry: THREE.BufferGeometry, points: { m: THREE.Matrix4; colour: THREE.Color }[]) => {
      if (!points.length) return;
      const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), points.length);
      points.forEach((point, index) => { mesh.setMatrixAt(index, point.m); mesh.setColorAt(index, point.colour); });
      mesh.castShadow = mesh.receiveShadow = true;
      mirrored.add(mesh);
    };
    forest(new THREE.IcosahedronGeometry(1, 0), birchPoints);
    forest(new THREE.ConeGeometry(1, 2, 6), sprucePoints);

    // Waterfalls drawn down the wall faces.
    const fallCount = { none: 0, thread: 1, many: 6, frozen: 3 }[a.falls];
    for (let n = 0; n < fallCount; n++) {
      const side = n % 2 ? 1 : -1, z = mix(-38, 2, random()), width = a.falls === 'frozen' ? mix(1.6, 2.6, random()) : mix(0.5, 1.1, random()) * (a.falls === 'thread' ? 1.3 : 1);
      const v0 = mix(0.5, 0.95, random()), positions: number[] = [], index: number[] = [];
      const rows = 26;
      for (let i = 0; i <= rows; i++) {
        const v = mix(v0, 0.02, i / rows), zz = z + Math.sin(v * 9 + n) * 0.8 * (1 - v);
        const spread = width * mix(0.6, 1.5, i / rows);
        for (const dz of [-spread / 2, spread / 2]) positions.push(side * (wallR(zz + dz, v) - 0.7), v * wallHeight(zz), zz + dz);
        if (i < rows) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const fall = new THREE.Mesh(geometry, material(a.falls === 'frozen' ? '#bfe0ee' : '#f2f6f8', { side: THREE.DoubleSide, roughness: a.falls === 'frozen' ? 0.2 : 0.7, emissive: a.falls === 'frozen' ? '#3a6f8a' : '#aab4bc', emissiveIntensity: 0.35 }));
      mirrored.add(fall);
    }
    if (a.falls === 'many' || a.falls === 'thread') {
      // And one down the step at the valley head.
      const x = (random() - 0.5) * 10;
      const fall = new THREE.Mesh(boxGeometry, material('#f2f6f8', { emissive: '#aab4bc', emissiveIntensity: 0.35 }));
      const z0 = shoreZ(x) - 27, z1 = shoreZ(x) - 40;
      fall.scale.set(1.3, 0.3, Math.hypot(z1 - z0, ground(x, z1) - ground(x, z0)));
      fall.position.set(x, (ground(x, z0) + ground(x, z1)) / 2 + 0.5, (z0 + z1) / 2);
      fall.rotation.x = Math.atan2(ground(x, z1) - ground(x, z0), z0 - z1);
      mirrored.add(fall);
    }

    // The slide: a fan of boulders from the scar to the edge of the fields.
    if (a.story === 'slide') {
      const blocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), 150);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 150; i++) {
        const out = random() ** 0.7 * 13, z = slideZ + (random() - 0.5) * (4 + out * 0.9);
        const x = slideSide * (gap(z) - 2.5 - out);
        const size = mix(0.3, 1.2, random() * (out / 13)) + 0.15;
        e.set(random() * 3, random() * 3, random() * 3);
        m.compose(new THREE.Vector3(x, Math.max(0, ground(x, z)) + size * 0.3, z), q.setFromEuler(e), new THREE.Vector3(size, size * 0.8, size));
        blocks.setMatrixAt(i, m);
        blocks.setColorAt(i, new THREE.Color(['#c9c2b0', '#b9b2a2', '#d8d0bd', '#a3a094'][i % 4]));
      }
      blocks.castShadow = blocks.receiveShadow = true;
      mirrored.add(blocks);
    }

    // The mirror: everything above is doubled beneath a sheet of dark water.
    const reflection = mirrored.clone(true);
    reflection.scale.y = -1;
    reflection.position.y = -0.12;
    reflection.traverse((node) => { node.castShadow = node.receiveShadow = false; });
    root.add(reflection);
    const still = { mirror: 0.55, ruffled: 0.9, mist: 0.68, ice: 0.74 }[a.water];
    const water = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: sky.water, transparent: true, opacity: still, roughness: 0.2, metalness: 0.25 }));
    water.rotation.x = -Math.PI / 2;
    water.receiveShadow = true;
    root.add(water);
    // Ripples and glints.
    {
      const streaks = a.water === 'ruffled' ? 260 : a.water === 'ice' ? 0 : 50;
      const mesh = new THREE.InstancedMesh(boxGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(sky.horizon).lerp(new THREE.Color(sky.water), 0.45) }), Math.max(1, streaks));
      const m = new THREE.Matrix4();
      for (let i = 0; i < streaks; i++) {
        const z = mix(shoreZ(0) + 3, 62, random() ** 0.8), x = (random() - 0.5) * 2 * (gap(z) - 3);
        m.makeScale(mix(1.2, 5, random()), 0.02, 0.09).setPosition(x, 0.02, z);
        mesh.setMatrixAt(i, m);
      }
      mesh.count = streaks;
      root.add(mesh);
    }
    const mists: THREE.Mesh[] = [];
    if (a.water === 'mist' || a.sky === 'lowcloud')
      for (let i = 0; i < (a.water === 'mist' ? 7 : 2); i++) {
        const band = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), new THREE.MeshBasicMaterial({ color: '#eef1f3', transparent: true, opacity: 0.34, depthWrite: false }));
        band.scale.set(mix(14, 30, random()), mix(0.5, 1.1, random()), mix(2, 5, random()));
        band.position.set((random() - 0.5) * 30, mix(0.8, 2.6, random()), mix(-2, 40, random()));
        band.userData.x = band.position.x;
        root.add(band);
        mists.push(band);
      }
    if (a.water === 'ice') {
      const ice = material('#dbe6ee', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        const shape = new THREE.Shape();
        const edge = mix(14, 24, random());
        shape.moveTo(side * 2.2, 8);
        for (let i = 0; i <= 12; i++) { const x = side * mix(2.4, 46, i / 12); shape.lineTo(x, -(edge + Math.sin(i * 1.7 + pa) * 2.4 + (i / 12) * 14)); }
        shape.lineTo(side * 46, 8);
        const sheet = new THREE.Mesh(new THREE.ShapeGeometry(shape), ice);
        sheet.rotation.x = -Math.PI / 2;
        sheet.position.y = 0.04;
        sheet.receiveShadow = true;
        root.add(sheet);
      }
      const floes = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.08, 6), ice, 40);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 40; i++) {
        const z = mix(16, 48, random()), size = mix(0.5, 2.2, random());
        m.makeScale(size, 1, size * mix(0.6, 1, random())).setPosition((random() - 0.5) * 2 * (gap(z) - 4), 0.03, z);
        floes.setMatrixAt(i, m);
      }
      root.add(floes);
    }
    if (a.sky === 'lowcloud')
      for (let i = 0; i < 26; i++) {
        const cloud = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), new THREE.MeshStandardMaterial({ color: '#e6e8ea', emissive: '#c4c8cc', emissiveIntensity: 0.8, roughness: 1 }));
        const z = mix(-130, 34, random());
        cloud.scale.set(mix(16, 34, random()), mix(5, 9, random()), mix(12, 22, random()));
        cloud.position.set((random() - 0.5) * 2 * (gap(z) + 14), mix(38, 50, random()) + Math.max(0, -z - 30) * 0.1, z);
        root.add(cloud);
      }
    const ribbons: THREE.Mesh[] = [];
    if (a.sky === 'aurora') {
      const fade = document.createElement('canvas');
      fade.width = 4; fade.height = 128;
      const fctx = fade.getContext('2d')!;
      const curtain = fctx.createLinearGradient(0, 0, 0, 128);
      curtain.addColorStop(0, 'rgba(120,255,190,0)');
      curtain.addColorStop(0.75, 'rgba(120,255,170,0.85)');
      curtain.addColorStop(1, 'rgba(190,255,210,0)');
      fctx.fillStyle = curtain;
      fctx.fillRect(0, 0, 4, 128);
      const texture = new THREE.CanvasTexture(fade);
      for (let n = 0; n < 3; n++) {
        const geometry = new THREE.PlaneGeometry(260, mix(38, 60, random()), 48, 1);
        const gp = geometry.attributes.position;
        for (let i = 0; i < gp.count; i++) gp.setZ(i, Math.sin(gp.getX(i) * 0.05 + n * 2 + pa) * 16 + Math.sin(gp.getX(i) * 0.13 + pb) * 5);
        const ribbon = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide, color: n === 1 ? '#b9ffe0' : '#7dffb0' }));
        ribbon.position.set((random() - 0.5) * 60, 120 + n * 22, -250 + n * 12);
        ribbon.rotation.z = (random() - 0.5) * 0.3;
        root.add(ribbon);
        ribbons.push(ribbon);
      }
    }
    if (a.sky === 'bluehour' || a.sky === 'aurora') {
      const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 24), new THREE.MeshBasicMaterial({ color: '#f6f1e2' }));
      moon.position.set((random() < 0.5 ? -1 : 1) * mix(8, 24, random()), mix(105, 135, random()), -290);
      root.add(moon);
    }

    // Out on the water.
    const boatAt = (x: number, z: number, colour: string) => {
      const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), material(colour, { side: THREE.DoubleSide }));
      hull.scale.set(0.8, 0.55, 2.2);
      hull.position.set(x, 0.5, z);
      hull.rotation.y = (random() - 0.5) * 1.2;
      const deck = new THREE.Mesh(boxGeometry, material('#d9d2c2'));
      deck.scale.set(1.1, 0.06, 3.4);
      deck.position.set(x, 0.5, z);
      deck.rotation.y = hull.rotation.y;
      hull.castShadow = true;
      root.add(hull, deck);
    };
    if (a.afloat === 'moorings') for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) { const x = (random() - 0.5) * 2 * (base - 6); if (Math.abs(x) > 5) boatAt(x, shoreZ(x) + mix(4, 11, random()), ['#eeeade', '#a8321f', '#2f5d6b', '#c99532'][i % 4]); }
    if (a.afloat === 'fishfarm') {
      const ringMat = material('#23282c', { roughness: 0.6 });
      for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.22, 6, 28), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(base * 0.3 + (i % 2) * 10, 0.15, 10 + Math.floor(i / 2) * 10);
        const net = new THREE.Mesh(new THREE.CylinderGeometry(4.1, 4.1, 0.9, 20, 1, true), material('#3d464c', { wireframe: true }));
        net.position.copy(ring.position).setY(0.6);
        root.add(ring, net);
      }
      const barge = new THREE.Mesh(boxGeometry, material('#c8ccce'));
      barge.scale.set(3, 1.6, 5);
      barge.position.set(base * 0.3 + 5, 0.8, 4);
      barge.castShadow = true;
      const lamp = new THREE.Mesh(boxGeometry, windowLit);
      lamp.scale.set(3.05, 0.4, 1.6);
      lamp.position.set(base * 0.3 + 5, 1.15, 5);
      root.add(barge, lamp);
    }
    if (a.afloat === 'buoys') {
      const buoys = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), material('#f0642a', { emissive: '#7a2a0a', emissiveIntensity: 0.4 }), 16);
      const m = new THREE.Matrix4();
      for (let i = 0; i < 16; i++) buoys.setMatrixAt(i, m.makeTranslation(mix(4, base * 0.75, i / 15) + Math.sin(i * 0.6) * 2, 0.25, mix(8, 34, i / 15)));
      buoys.castShadow = true;
      root.add(buoys);
    }

    // Jetty, lantern, bonfire.
    const timber = material('#6d5a48', { roughness: 1 });
    let flame: THREE.Mesh | null = null, fireLight: THREE.PointLight | null = null, lantern: THREE.MeshStandardMaterial | null = null;
    if (a.story === 'waiting' || a.settlement === 'fishing') {
      const jx = base * 0.26, z0 = shoreZ(jx) - 1, len = 11;
      const deck = new THREE.Mesh(boxGeometry, timber);
      deck.scale.set(1.8, 0.16, len);
      deck.position.set(jx, 0.85, z0 + len / 2);
      deck.castShadow = deck.receiveShadow = true;
      root.add(deck);
      for (let i = 0; i < 5; i++) for (const dx of [-0.8, 0.8]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.6, 6), timber);
        pile.position.set(jx + dx, 0.3, z0 + 1 + i * 2.4);
        root.add(pile);
      }
      if (a.story === 'waiting') {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), timber);
        post.position.set(jx + 0.7, 2, z0 + len - 0.4);
        lantern = material('#ffe6a8', { emissive: '#ffb347', emissiveIntensity: glow * 1.6 });
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lantern);
        lamp.position.set(jx + 0.7, 3.2, z0 + len - 0.4);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffc866', transparent: true, opacity: 0.16, depthWrite: false }));
        halo.position.copy(lamp.position);
        const streak = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({ color: '#ffc866', transparent: true, opacity: 0.4, depthWrite: false }));
        streak.scale.set(0.35, 0.02, 9);
        streak.position.set(jx + 0.7, 0.03, z0 + len + 5);
        root.add(post, lamp, halo, streak);
      }
    }
    if (a.story === 'bonfire') {
      const fx = -base * 0.24, fz = shoreZ(fx) - 1.6, fy = ground(fx, fz);
      for (let i = 0; i < 9; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 3.2, 5), timber);
        const angle = (i / 9) * Math.PI * 2;
        log.position.set(fx + Math.cos(angle) * 0.6, fy + 1.3, fz + Math.sin(angle) * 0.6);
        log.rotation.set(Math.sin(angle) * 0.42, 0, -Math.cos(angle) * 0.42);
        root.add(log);
      }
      flame = new THREE.Mesh(new THREE.ConeGeometry(0.95, 4.4, 7), material('#ffb02e', { emissive: '#ff6a1a', emissiveIntensity: 3, roughness: 0.6 }));
      flame.position.set(fx, fy + 2.6, fz);
      const core = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.6, 6), material('#fff0a8', { emissive: '#ffd24a', emissiveIntensity: 4 }));
      core.position.set(fx, fy + 1.8, fz);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(4.5, 14, 10), new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.13, depthWrite: false }));
      halo.position.set(fx, fy + 2.4, fz);
      const streak = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({ color: '#ff9a3a', transparent: true, opacity: 0.45, depthWrite: false }));
      streak.scale.set(0.9, 0.02, 12);
      streak.position.set(fx, 0.03, shoreZ(fx) + 7.5);
      fireLight = new THREE.PointLight('#ff8a3a', 260, 46, 1.8);
      fireLight.position.set(fx, fy + 3, fz + 0.5);
      root.add(flame, core, halo, streak, fireLight);
    }
    // Chimney smoke.
    const puffs: THREE.Mesh[] = [];
    for (const chimney of chimneys.slice(0, 7))
      for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#dfe3e6', transparent: true, opacity: 0.3, depthWrite: false }));
        puff.userData.origin = chimney;
        puff.userData.phase = i / 4 + random() * 0.2;
        root.add(puff);
        puffs.push(puff);
      }
    const drift = (time: number) => {
      for (const puff of puffs) {
        const t = (puff.userData.phase + time * mix(0.03, 0.1, mood.energy)) % 1, origin = puff.userData.origin as THREE.Vector3;
        puff.position.set(origin.x + t * t * mix(1, 7, mood.energy), origin.y + t * 5, origin.z);
        puff.scale.setScalar(0.35 + t * 1.5);
        (puff.material as THREE.MeshBasicMaterial).opacity = 0.34 * (1 - t);
      }
    };
    drift(0);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.5, 900);
    camera.position.set((random() - 0.5) * 6, mix(5.5, 8.5, random()), 70);
    const aim = new THREE.Vector3(0, 14, -10);

    return {
      object: root,
      camera,
      background: new THREE.Color(sky.top),
      capacity: SLOTS.length,
      ground: terrain,
      keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, index) => {
          const [x, z, tall, wide] = SLOTS[index % SLOTS.length];
          const scale = Math.min(tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, index % SLOTS.length === 3 ? 0.78 : ground(x, z), z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.6 + (index === 0 ? 0.35 : -0.45) + (context.random() - 0.5) * 0.4;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -75;
        shadow.right = shadow.top = 75;
        shadow.near = 1;
        shadow.far = 320;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        drift(time);
        if (flame) {
          flame.scale.set(1 + Math.sin(time * 9) * 0.12, 1 + Math.sin(time * 13) * 0.14 * mix(0.5, 1.5, mood.energy), 1 + Math.cos(time * 11) * 0.12);
          if (fireLight) fireLight.intensity = 260 * (0.85 + Math.sin(time * 17) * 0.1 + Math.sin(time * 7.3) * 0.08);
        }
        if (lantern) lantern.emissiveIntensity = glow * 1.6 * (0.9 + Math.sin(time * 3) * 0.1);
        ribbons.forEach((ribbon, index) => { (ribbon.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(time * mix(0.3, 1.2, mood.energy) + index * 2) * 0.18; });
        mists.forEach((band, index) => { band.position.x = band.userData.x + Math.sin(time * 0.05 + index) * 4; });
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
