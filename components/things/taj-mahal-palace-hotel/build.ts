import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, paint, paintHex } from '@conjure/kit';
import { Batch, archBand, canvasTexture, onion, planarUV, pointedArch, roundArch, stoneTexture, wallWithHoles, night as nightOf } from './parts';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    era: choice('When is it?', {
      original: '1903: the hotel alone on the bunder, no tower behind, horse carriages waiting at the door.',
      today: 'Today: the 1973 Taj Tower slab rising behind the old palace, taxis at the porch.',
      wedding: 'A society wedding: marigold garlands streaming down the facade in orange and gold.',
    }),
    lighting: choice('How is it lit?', {
      windows: 'Warm windows glowing room by room along the verandahs.',
      fairy: 'Strings of festival fairy lights outlining every arch, gable and dome.',
      dark: 'Dark: the windows black, a blackout or the small hours.',
    }),
    fairy: paint('If fairy lights are strung, what colour are they?', ['gold', 'amber', 'white', 'magenta', 'turquoise', 'red', 'lime', 'blue']),
    weather: choice('What is the weather doing to it?', {
      bright: 'A bright afternoon: hard sun, crisp shadows, the red domes vivid.',
      haze: 'Harbour haze: the far end softening into grey-white air.',
      monsoon: 'Monsoon rain sheeting down the domes, the stone darkened and shining.',
    }),
    flag: noul('Does a flag fly from the lantern on the great dome?'),
    forecourt: choice('What is happening at the harbour-side forecourt?', {
      empty: 'Nothing: an empty paved forecourt.',
      arrivals: 'Arrivals: cars or carriages drawn up and a doorman in a turban at the porch.',
      gawkers: 'Tourists and families photographing the facade from the waterfront.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = nightOf(mood.daylight);
    const wet = a.weather === 'monsoon';
    const haze = a.weather === 'haze' ? 0.4 : 0;
    const darken = wet ? 0.72 : 1;
    const tone = (hex: string) => new THREE.Color(hex).multiplyScalar(darken).lerp(new THREE.Color('#d8d9d6'), haze);
    const stain = 0.08 + mood.wear * 0.6 + (wet ? 0.25 : 0);
    const lit = a.lighting === 'dark' ? 0 : mix(0.05, 1.1, night);

    // Window grid for the walls behind the verandahs: arched dark windows, lit at random as the light goes.
    const cells = 8, cell = 64, metres = 4.5 * cells;
    const winMap = canvasTexture(cells * cell, cells * cell, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, cells * cell, cells * cell);
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        const x = i * cell, y = j * cell;
        c.fillStyle = 'rgba(160,150,135,0.25)'; c.fillRect(x, y + cell - 4, cell, 3);
        c.fillStyle = '#4a4744'; c.beginPath(); c.moveTo(x + 22, y + 56); c.lineTo(x + 22, y + 26); c.arc(x + 32, y + 26, 10, Math.PI, 0); c.lineTo(x + 42, y + 56); c.fill();
        c.fillStyle = '#ffffff'; c.fillRect(x + 31, y + 18, 2, 38);
      }
      for (let k = 0; k < Math.round(stain * 50); k++) { const g = c.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(30,30,28,0.35)'); g.addColorStop(1, 'rgba(30,30,28,0)'); c.fillStyle = g; c.fillRect(random() * 512, random() * 512, 3 + random() * 8, 120); }
    });
    const winGlow = canvasTexture(cells * cell, cells * cell, (c) => {
      c.fillStyle = '#000000'; c.fillRect(0, 0, cells * cell, cells * cell);
      const share = 0.35 + mood.density * 0.45;
      for (let i = 0; i < cells; i++) for (let j = 0; j < cells; j++) {
        if (random() > share) continue;
        const x = i * cell, y = j * cell;
        c.fillStyle = random() < 0.8 ? '#ffc477' : '#fff0d0';
        c.beginPath(); c.moveTo(x + 22, y + 56); c.lineTo(x + 22, y + 26); c.arc(x + 32, y + 26, 10, Math.PI, 0); c.lineTo(x + 42, y + 56); c.fill();
      }
    });
    const core = s.material(tone('#e6d3b0'), { map: winMap, emissive: '#ffffff', emissiveMap: winGlow, emissiveIntensity: lit, roughness: wet ? 0.35 : 0.85 });
    const stoneMap = stoneTexture(random, stain, 6, 3);
    const stone = s.material(tone('#ead5ae'), { map: stoneMap, roughness: wet ? 0.35 : 0.85 });
    const basaltMap = stoneTexture(random, stain, 6, 3, 'rgba(30,30,30,0.6)');
    const basalt = s.material(tone('#77746e'), { map: basaltMap, roughness: wet ? 0.3 : 0.9 });
    const trim = s.material(tone('#f6f3ec'), { roughness: wet ? 0.3 : 0.6 });
    const tileMap = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 128);
      for (let r = 0; r < 8; r++) for (let k = 0; k < 9; k++) {
        const g = 200 + Math.floor(random() * 55);
        c.fillStyle = `rgb(${g},${g - 20},${g - 25})`;
        c.beginPath(); c.arc(k * 16 + (r % 2) * 8, r * 16 + 16, 8, 0, Math.PI); c.fill();
        c.strokeStyle = 'rgba(60,20,10,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.arc(k * 16 + (r % 2) * 8, r * 16 + 16, 8, 0, Math.PI); c.stroke();
      }
    });
    tileMap.repeat.set(10, 6);
    const tiles = s.material(tone('#b8402a'), { map: tileMap, roughness: wet ? 0.25 : 0.65, metalness: wet ? 0.15 : 0 });
    const paving = s.material(tone(wet ? '#77736c' : '#a9a49a'), { roughness: wet ? 0.15 : 0.9, metalness: wet ? 0.25 : 0 });

    const roof = s.material(tone('#8d7a6c'), { roughness: wet ? 0.3 : 0.9 });
    const b = new Batch();
    const levels = [0, 6, 10.5, 15, 19.5, 24, 28.5];
    const fairyPts: V3[] = [];
    const outline = (from: V3, to: V3, step = 1.2) => {
      const n = Math.max(1, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) / step));
      for (let i = 0; i <= n; i++) fairyPts.push([mix(from[0], to[0], i / n), mix(from[1], to[1], i / n), mix(from[2], to[2], i / n)]);
    };

    // An arcade of stacked verandahs: one pierced wall per floor, the ground floor in grey basalt with pointed arches.
    const arcade = (x0: number, x1: number, zf: number, lv: number[], bay = 3.9) => {
      const L = x1 - x0, cx = (x0 + x1) / 2, n = Math.max(1, Math.round(L / bay)), bw = L / n;
      for (let i = 0; i < lv.length - 1; i++) {
        const y0 = lv[i], h = lv[i + 1] - y0;
        const holes: THREE.Vector2[][] = [];
        for (let k = 0; k < n; k++) {
          const hx = -L / 2 + bw * (k + 0.5);
          if (i === 0) holes.push(pointedArch(hx, 0.01, bw - 1.1, h - 2.6, 0.8, 8));
          else if (i === lv.length - 2) holes.push(pointedArch(hx, 1.0, bw - 1.2, h - 3.2, 0.85, 8));
          else holes.push(roundArch(hx, 1.0, bw - 1.1, h - 1.0 - (bw - 1.1) / 2 - 0.45, 8));
        }
        b.add(i === 0 ? basalt : stone, wallWithHoles(L, h, 0.6, holes), [cx, y0, zf - 0.6]);
        for (const hole of holes) b.add(trim, archBand(hole, 0.22, 0.12), [cx, y0, zf]);
        b.box(trim, [L + 0.3, 0.32, 0.9], [cx, y0 + h, zf - 0.3]);
        if (i > 0) b.box(trim, [L, 0.12, 0.25], [cx, y0 + 1.0, zf + 0.05]);
        b.box(stone, [L, 0.3, 2.6], [cx, y0 + h - 0.15, zf - 1.9]);
        if (i > 0) outline([x0, y0 + 1.05, zf + 0.2], [x1, y0 + 1.05, zf + 0.2], 1.4);
      }
      const top = lv[lv.length - 1];
      b.box(stone, [L, 1.4, 0.5], [cx, top + 0.7, zf - 0.25]);
      b.box(trim, [L + 0.3, 0.3, 0.7], [cx, top + 1.45, zf - 0.25]);
      outline([x0, top + 1.6, zf], [x1, top + 1.6, zf]);
    };
    const gable = (x: number, y: number, z: number, w: number, h: number, rot = 0, mat = stone) => {
      const shape = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]);
      b.add(mat, new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false }), [x, y, z - 0.3], [0, rot, 0]);
      const dx = Math.cos(rot), dz = -Math.sin(rot);
      b.rod(trim, [x - dx * w / 2, y, z - dz * w / 2], [x, y + h + 0.3, z], 0.18, 5);
      b.rod(trim, [x + dx * w / 2, y, z + dz * w / 2], [x, y + h + 0.3, z], 0.18, 5);
      b.cyl(trim, 0.05, 0.25, 1.6, [x, y + h + 0.9, z], 6);
      outline([x - dx * w / 2, y, z - dz * w / 2], [x, y + h, z], 1); outline([x, y + h, z], [x + dx * w / 2, y, z + dz * w / 2], 1);
    };

    // Wings: core blocks with arcades on the harbour face.
    const wingTop = levels[levels.length - 1];
    b.box(core, [86, wingTop, 19], [0, wingTop / 2, -1.5]);
    for (const [x0, x1] of [[-43, -12], [12, 43]] as const) {
      arcade(x0, x1, 10.5, levels);
      for (let k = 0; k < 3; k++) gable(mix(x0, x1, (k + 0.5) / 3), wingTop + 1.6, 10.3, 5.5, 4.2);
    }
    b.box(roof, [86, 0.4, 19.4], [0, wingTop + 0.1, -1.5]);

    // Corner towers with Gothic gables and red onion domes.
    const towerTop = 40;
    for (const sx of [-1, 1]) {
      const x = sx * 49;
      b.box(core, [12, towerTop, 24], [x, towerTop / 2, 0]);
      const holes: THREE.Vector2[][] = [];
      for (let y = 7; y < towerTop - 4; y += 4.5) for (const hx of [-2.6, 2.6]) holes.push(pointedArch(hx, y, 2.2, 1.8, 0.8, 6));
      holes.push(pointedArch(0, 0.01, 4.2, 2.6, 0.8, 8));
      b.add(stone, wallWithHoles(12, towerTop, 0.5, holes), [x, 0, 12]);
      b.add(basalt, new THREE.BoxGeometry(12.3, 6, 24.3), [x, 3, 0]);
      for (const hole of holes) b.add(trim, archBand(hole, 0.18, 0.1), [x, 0, 12.5]);
      for (let y = 6; y <= towerTop; y += 4.5) b.box(trim, [12.5, 0.32, 24.6], [x, y, 0.1]);
      b.box(trim, [13, 0.6, 25], [x, towerTop, 0]);
      b.box(roof, [12.4, 0.3, 24.4], [x, towerTop + 0.4, 0]);
      for (const [gz, rot] of [[12.2, 0], [-12.2, Math.PI]] as const) gable(x, towerTop + 0.3, gz, 11, 6.5, rot);
      for (const gx of [x - 6.2, x + 6.2]) gable(gx, towerTop + 0.3, 6, 10, 5.5, Math.PI / 2);
      b.box(stone, [7, 6, 7], [x, towerTop + 3, 3]);
      b.add(tiles, onion(4.2, 9.5), [x, towerTop + 6, 3]);
      b.rod(trim, [x, towerTop + 15.3, 3], [x, towerTop + 18, 3], 0.12);
      for (const px of [-5.8, 5.8]) for (const pz of [-11.8, 11.8]) {
        b.cyl(trim, 0.45, 0.45, 4, [x + px, towerTop + 2, pz], 8);
        b.cyl(tiles, 0.02, 0.55, 2.2, [x + px, towerTop + 5.1, pz], 8);
      }
      outline([x - 6, towerTop + 0.4, 12.5], [x + 6, towerTop + 0.4, 12.5]);
      for (let y = 6; y <= towerTop; y += 9) outline([x - 6, y, 12.6], [x + 6, y, 12.6], 1.5);
    }

    // The projecting central block, its drum and the great red dome with its lantern.
    const centralLv = [...levels, 32.5, 36];
    b.box(core, [24, 36, 25], [0, 18, 1.5]);
    arcade(-12, 12, 16.5, centralLv, 4);
    for (const sx of [-1, 1]) b.box(stone, [1.6, 36, 3.2], [sx * 12.8, 18, 15]);
    b.box(trim, [26, 0.6, 26], [0, 36.3, 1.5]);
    b.box(roof, [25.4, 0.3, 25.4], [0, 36.7, 1.5]);
    gable(0, 37.9, 16.2, 14, 7.5);
    const drumBase = 37.6, drumTop = 47;
    b.cyl(core, 9.5, 10, drumTop - drumBase, [0, (drumBase + drumTop) / 2, 1.5], 8, Math.PI / 8);
    for (const y of [drumBase + 0.3, drumTop]) b.cyl(trim, 10.3, 10.3, 0.5, [0, y, 1.5], 8, Math.PI / 8);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      b.cyl(trim, 0.4, 0.5, 5, [Math.cos(an) * 10.3, drumTop + 2.2, 1.5 + Math.sin(an) * 10.3], 6);
      b.cyl(tiles, 0.02, 0.6, 2.2, [Math.cos(an) * 10.3, drumTop + 5.7, 1.5 + Math.sin(an) * 10.3], 6);
    }
    const domeH = 17, domeR = 10;
    const profile: [number, number][] = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; profile.push([Math.max(0.0001, domeR * Math.pow(Math.max(0, 1 - t ** 1.7), 0.6)), t * domeH]); }
    b.add(tiles, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), [0, drumTop + 0.2, 1.5]);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const pts = profile.map(([r, y]) => new THREE.Vector3(Math.cos(an) * (r + 0.12), drumTop + 0.2 + y, 1.5 + Math.sin(an) * (r + 0.12)));
      b.add(trim, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(0, -1)), 20, 0.18, 5));
      pts.forEach((p, k) => { if (k % 2 === 0 && k < pts.length - 1) fairyPts.push([p.x, p.y, p.z]); });
    }
    const lanternBase = drumTop + domeH;
    b.cyl(trim, 2, 2.3, 4, [0, lanternBase + 1.6, 1.5], 8);
    b.add(tiles, onion(2.2, 3.6), [0, lanternBase + 3.6, 1.5]);
    const finialTop = lanternBase + 9;
    b.rod(trim, [0, lanternBase + 7, 1.5], [0, finialTop, 1.5], 0.12);

    // The 1973 Tower behind.
    if (a.era !== 'original') {
      const tw = 48, th = 80, tz = -30;
      b.box(core, [tw, th, 16], [16, th / 2, tz]);
      for (let y = 4; y < th; y += 3.4) b.box(trim, [tw + 0.6, 0.35, 16.6], [16, y, tz]);
      const holes: THREE.Vector2[][] = [];
      for (let k = 0; k < 8; k++) holes.push(pointedArch(-tw / 2 + 3 + k * 6, 0.5, 4.2, 2.6, 0.8, 6));
      b.add(trim, wallWithHoles(tw, 7, 0.6, holes), [16, th, tz + 7.4]);
      b.box(stone, [tw - 1, 6, 14], [16, th + 3, tz]);
      b.box(roof, [tw - 1.2, 0.3, 13.8], [16, th + 6.1, tz]);
    }

    // The forecourt toward the harbour.
    b.box(paving, [128, 0.4, 16], [0, -0.2, 21]);
    b.box(basalt, [128, 0.8, 0.6], [0, 0.4, 29]);
    b.flush(s, { uv: new Map([[core, (g: THREE.BufferGeometry) => planarUV(g, metres)], [stone, (g: THREE.BufferGeometry) => planarUV(g, 4)], [basalt, (g: THREE.BufferGeometry) => planarUV(g, 4)], [paving, (g: THREE.BufferGeometry) => planarUV(g, 6)]]) });

    // Marigold garlands streaming down the central block and the towers.
    const flowers: { at: V3; size: number; color: string }[] = [];
    if (a.era === 'wedding') {
      const strings: [number, number, number, number][] = [];
      for (let x = -11; x <= 11; x += 1.3) strings.push([x, 36, 17.1, 1.2]);
      for (const tx of [-49, 49]) for (let x = -5; x <= 5; x += 1.25) strings.push([tx + x, towerTop, 12.9, 6]);
      for (const [x, top, z, bottom] of strings) for (let y = top; y > bottom; y -= 0.42) flowers.push({ at: [x + Math.sin(y * 0.7) * 0.05, y, z], size: 0.22, color: random() < 0.6 ? '#f28a12' : '#f6c21a' });
      for (const x0 of [-43, 12]) for (let k = 0; k < 8; k++) for (let i = 0; i <= 10; i++) {
        const x = x0 + k * 3.875 + i * 0.3875, sag = Math.sin((i / 10) * Math.PI) * 1.2;
        for (const y of [10.5, 19.5, 28.5]) flowers.push({ at: [x, y - sag, 10.8], size: 0.24, color: random() < 0.6 ? '#f28a12' : '#e8b416' });
      }
      const m = s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.7, emissive: '#ff8a20', emissiveIntensity: 0.12 + night * 0.3 }), flowers);
      m.castShadow = false;
    }
    // Fairy lights.
    if (a.lighting === 'fairy') {
      const hex = paintHex(a.fairy);
      const bulbs = s.scatter(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: mix(0.8, 2.6, night), roughness: 0.4 }), fairyPts.map((at) => ({ at, size: 0.22 })));
      bulbs.castShadow = false;
    }
    // Flag on the lantern.
    let flag: THREE.Mesh | null = null;
    if (a.flag) {
      const flagMap = canvasTexture(96, 64, (c) => {
        c.fillStyle = '#ff9933'; c.fillRect(0, 0, 96, 22); c.fillStyle = '#ffffff'; c.fillRect(0, 21, 96, 22); c.fillStyle = '#138808'; c.fillRect(0, 42, 96, 22);
        c.strokeStyle = '#000080'; c.lineWidth = 2; c.beginPath(); c.arc(48, 32, 8, 0, 7); c.stroke();
      }, false);
      flag = s.mesh(new THREE.PlaneGeometry(4.5, 3, 8, 1).translate(2.25, 0, 0), new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.8 }), [0, finialTop - 1.6, 1.5]);
      flag.rotation.y = -0.5;
      s.rod([0, finialTop, 1.5], [0, finialTop + 1.5, 1.5], 0.08, trim);
    }
    // Rain sheeting over the front.
    if (wet) {
      const drops: { at: V3; size: number }[] = [];
      for (let i = 0; i < 1500; i++) drops.push({ at: [(random() - 0.5) * 130, random() * 75, -6 + random() * 40], size: 1 });
      const rain = s.scatter(new THREE.BoxGeometry(0.2, 7, 0.2).rotateZ(0.12), new THREE.MeshBasicMaterial({ color: '#e8eef4', transparent: true, opacity: 0.5, depthWrite: false }), drops);
      rain.castShadow = false;
    }
    // The forecourt's people and arrivals.
    const people: ReturnType<typeof figure>[] = [];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const person = (x: number, z: number, pose: 'standing' | 'walking' | 'pointing' | 'arms-crossed', turn: number, top?: string, hair?: 'hat' | 'cap' | 'short' | 'long' | 'bun') => {
      const p = figure(s, { height: 1.7, pose, style: 'doll', hair: hair ?? pick(['short', 'long', 'bun'] as const), top: top ?? pick(['#c8324a', '#2f6fb3', '#f2f0ea', '#e0a020', '#3b8a5a', '#d65a8a']), bottom: pick(['#2a2f3a', '#e8e2d4', '#4a3a2a']), skin: pick(['#8a5a3c', '#a8714c', '#c08a62', '#e0b48f']), mirror: random() < 0.5 });
      s.root.add(p.root); p.root.position.set(x, 0, z); p.root.rotation.y = turn; people.push(p);
    };
    const extra = new Batch();
    if (a.forecourt === 'arrivals') {
      person(4, 18.5, 'standing', 0, '#f2f0ea', 'hat');
      for (let i = 0; i < 3; i++) {
        const x = -10 + i * 8 + random() * 2;
        if (a.era === 'original') {
          // A victoria: a black hooded carriage on tall wheels behind a horse.
          const black = s.material('#1c1a18'), horse = s.material(pick(['#5a3a24', '#2a2420', '#d8d2c4']));
          extra.box(black, [1.4, 0.9, 2.2], [x, 1.3, 22]);
          extra.add(black, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.75, 0.9, 0.7), [x, 1.75, 21.4]);
          for (const sz of [-0.8, 0.8]) for (const sx of [-0.8, 0.8]) extra.add(black, new THREE.TorusGeometry(sz > 0 ? 0.45 : 0.7, 0.05, 4, 16), [x + sx, sz > 0 ? 0.45 : 0.7, 22 + sz], [0, Math.PI / 2, 0]);
          extra.box(horse, [0.6, 0.8, 1.9], [x, 1.5, 24.4]);
          extra.box(horse, [0.35, 0.9, 0.6], [x, 2.1, 25.4]);
          for (const lx of [-0.2, 0.2]) for (const lz of [23.7, 25.1]) extra.box(horse, [0.14, 1.1, 0.14], [x + lx, 0.55, lz]);
        } else {
          const yellow = s.material('#f2c21a'), black = s.material('#17181a');
          const limo = i === 1;
          extra.box(limo ? black : black, [1.7, 0.8, limo ? 5.2 : 3.9], [x, 0.65, 22]);
          extra.box(limo ? black : yellow, [1.5, 0.6, limo ? 2.8 : 2.0], [x, 1.35, 22]);
          extra.box(s.material('#7c8a92', { metalness: 0.4, roughness: 0.2 }), [1.52, 0.4, limo ? 2.6 : 1.8], [x, 1.35, 22.05]);
        }
      }
    }
    if (a.forecourt === 'gawkers') for (let i = 0; i < Math.round(3 + mood.density * 9); i++) person(-30 + random() * 60, 23 + random() * 5, pick(['standing', 'pointing', 'standing'] as const), Math.PI + (random() - 0.5) * 0.8);
    if (a.forecourt === 'empty' && mood.density > 0.5) person(random() * 20 - 10, 24, 'walking', random() * 6);
    extra.flush(s);

    s.root.rotation.y = -0.6;
    const flutter = mix(0.6, 3.5, mood.energy);
    return s.finish({
      update: (dt, time) => {
        for (const p of people) p.update(dt, time);
        if (flag) {
          const pos = flag.geometry.attributes.position as THREE.BufferAttribute;
          for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setZ(k, Math.sin(x * 1.4 - time * flutter * 2) * 0.25 * (x / 4.5)); }
          pos.needsUpdate = true;
        }
      },
    });
  },
});
