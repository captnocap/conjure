import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

type V3 = [number, number, number];

const TIMES = {
  morning: 'The morning rush under a flat white monsoon sky, everything grey and wet and hurrying.',
  break: 'A break in the clouds: low yellow sun slanting under the canopy onto the wet floor.',
  evening: 'The evening rush at blue dusk, tube lights on, everyone going home.',
  last: 'Close to the last train: deep indigo beyond the roof, the platform a tunnel of tube light.',
} as const;
const SKY: Record<keyof typeof TIMES, { bg: string; hemi: string; floor: string; hemiPower: number; key: string; power: number; tubes: number }> = {
  morning: { bg: '#ced6d8', hemi: '#f2f6f7', floor: '#8f8a80', hemiPower: 1.35, key: '#f3f6f8', power: 1.7, tubes: 0.5 },
  break: { bg: '#dadccb', hemi: '#fbf6e4', floor: '#958b76', hemiPower: 1.15, key: '#ffe6ae', power: 2.9, tubes: 0.25 },
  evening: { bg: '#a3acc4', hemi: '#c3cbe8', floor: '#b39c7c', hemiPower: 1.3, key: '#ffb58c', power: 1.2, tubes: 1.5 },
  last: { bg: '#737d9a', hemi: '#a3add2', floor: '#c2a678', hemiPower: 1.3, key: '#a9b6e4', power: 0.8, tubes: 2.1 },
};
const STATIONS = {
  dadar: 'DADAR, the great interchange where both lines cross.',
  bandra: 'BANDRA, a western suburb with an old gabled station.',
  kurla: 'KURLA, a crowded junction of mills and markets.',
  andheri: 'ANDHERI, the busiest of the western suburbs.',
  churchgate: 'CHURCHGATE, the terminus where the city pours in each morning.',
  borivali: 'BORIVALI, far out where the long-distance commuters board.',
  ghatkopar: 'GHATKOPAR, an eastern suburb station under a flyover.',
} as const;

const SLOTS = [
  { x: -0.8, z: 3.5, h: 3.0, r: 1.25 },
  { x: -3.0, z: -1.6, h: 3.0, r: 1.1 },
  { x: 1.6, z: -2.0, h: 3.0, r: 0.85 },
  { x: 1.7, z: 4.4, h: 1.5, r: 0.8 },
  { x: -1.3, z: -13, h: 3.2, r: 1.3 },
] as const;

export default defineWorld({
  questions: {
    time: choice('What time is it on the platform?', TIMES),
    rain: choice('What is the rain doing beyond the canopy?', {
      drizzle: 'A fine drizzle, the far buildings still visible.',
      steady: 'Steady monsoon rain, the tracks shining.',
      cloudburst: 'A cloudburst: rain in solid sheets, the far side of the tracks a white blur.',
      stopped: 'It has just stopped: the eaves dripping, puddles everywhere, the air washed clear.',
    }),
    station: choice('Which station is named on the hanging board?', STATIONS),
    canopy: choice('What is the canopy like?', {
      gable: 'A pitched corrugated roof on lattice trusses with a fretted wooden valance.',
      lean: 'A single long slope falling from the station wall to the platform edge.',
      vault: 'A curved barrel of corrugated sheet on arched ribs, a grander terminus roof.',
    }),
    side: choice('What runs along the inner side of the platform?', {
      building: 'The old station building: cream wall, maroon dado, arched doorways, a ticket window.',
      tiles: 'A tiled wall of bright hoardings, with taps and a water cooler.',
      railing: 'Only an iron railing, and beyond it the rain, another platform roof and the city.',
    }),
    crowd: choice('What trace of the crowd is on the platform?', {
      bare: 'None: the platform is swept and empty between trains.',
      umbrellas: 'A thicket of black umbrellas held up along the yellow line, their owners unseen.',
      luggage: 'Sacks, bundles and tin trunks heaped by the columns, waiting for the long-distance train.',
      papers: 'Trodden newspapers, dropped flowers and wet footprints where the last trainload passed.',
    }),
    train: choice('Is there a train?', {
      none: 'No train: empty rails running into the rain.',
      arriving: 'One is coming: two headlamps far down the line.',
      standing: 'One stands at the far platform across the tracks.',
      departed: 'One has just left: red tail lamps shrinking into the rain.',
    }),
    gutter: choice('How is the canopy drained?', { plain: 'The existing plain edge.', trough: 'A long open gutter under the eave.', pipes: 'A gutter with three downpipes.', hoppers: 'Broad rain hoppers and downpipes at three columns.' }),
    cableTray: choice('What carries wiring beneath the canopy?', { bare: 'No exposed cable tray.', ladder: 'A narrow ladder tray along the inner columns.', trunk: 'A closed grey service trunk.', bundles: 'Three separate dark cable bundles.' }),
    columnBands: choice('How are the lower columns marked?', { plain: 'Plain painted columns.', pale: 'Broad pale bands at shoulder height.', hazard: 'Black and yellow warning bands.', red: 'Two red identification bands.' }),
    disposal: choice('What waste containers stand against the inner side?', { none: 'No extra bins.', pair: 'Paired green and blue cylindrical bins.', cage: 'An open wire basket for paper.', lidded: 'A large square metal bin with a lid.' }),
    waterStation: choice('What drinking-water fitting is on the inner side?', { none: 'No separate drinking point.', taps: 'Three taps over a low stone trough.', cooler: 'A tall stainless cooler over a small drip tray.', jug: 'An earthen water pot on a masonry stand.' }),
    serviceCabinet: choice('What railway equipment stands by the rear columns?', { none: 'No separate cabinet.', electrical: 'A tall grey electrical cupboard.', hose: 'A red hose reel cabinet.', tools: 'A low locked maintenance chest.' }),
    edgeMarkers: choice('What marks the platform edge beyond the yellow line?', { plain: 'The original yellow line alone.', studs: 'A row of pale tactile studs.', slabs: 'A narrow band of ribbed edge slabs.', numbers: 'Numbered carriage-position plates.' }),
  },

  build(a, context) {
    const { mood, random } = context;
    const s = new Sculpture(context);
    const root = s.root;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sky = SKY[a.time];
    const raining = a.rain !== 'stopped';
    const background = new THREE.Color(sky.bg);
    if (a.rain === 'cloudburst') background.lerp(new THREE.Color('#e2e6e6'), 0.25);
    const bgHex = `#${background.getHexString()}`;
    const textures: THREE.Texture[] = [];

    // Platform geometry, all in metres. The camera looks down -z.
    const X0 = -4.6, XE = 3.2, ZN = 18, ZF = -62, PW = XE - X0, PL = ZN - ZF, PIT = -1.15;
    const frames = [13, 7, 1, -5, -11, -17, -23];
    const colL = -4.2, colR = 2.5, eave = 4.3, roofEnd = -23.6, roofStart = 16;

    // ---- light -------------------------------------------------------------
    root.add(new THREE.HemisphereLight(sky.hemi, sky.floor, sky.hemiPower));
    const key = new THREE.DirectionalLight(new THREE.Color(sky.key).lerp(new THREE.Color('#ffb070'), (mood.warmth - 0.5) * 0.35), sky.power);
    key.position.set(17, mix(15, 9, Math.abs(mood.daylight - 0.5) * 2), mix(12, -6, mood.daylight));
    key.target.position.set(-1, 0, -5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05;
    const sh = key.shadow.camera;
    sh.left = -26; sh.right = 26; sh.top = 22; sh.bottom = -22; sh.near = 1; sh.far = 70;
    sh.updateProjectionMatrix();
    root.add(key, key.target);

    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
      textures.push(texture);
      return texture;
    };
    // A headline-barred script that reads as Devanagari at a glance.
    const barred = (ctx: CanvasRenderingContext2D, cx: number, y: number, h: number, glyphs: number) => {
      const widths = Array.from({ length: glyphs }, () => h * rnd(0.55, 0.85));
      const total = widths.reduce((sum, w) => sum + w + h * 0.22, 0);
      let x = cx - total / 2;
      ctx.lineWidth = h * 0.13; ctx.lineCap = 'round';
      widths.forEach((w, g) => {
        ctx.beginPath(); ctx.moveTo(x - h * 0.1, y); ctx.lineTo(x + w + h * 0.1, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h); ctx.stroke();
        ctx.beginPath();
        if (g % 3 === 0) ctx.arc(x + w * 0.45, y + h * 0.52, w * 0.38, -0.4, Math.PI * 1.25);
        else if (g % 3 === 1) { ctx.moveTo(x + 3, y + h * 0.2); ctx.quadraticCurveTo(x + w, y + h * 0.4, x + 5, y + h); }
        else { ctx.arc(x + w * 0.4, y + h * 0.4, w * 0.3, Math.PI * 0.5, Math.PI * 2.1); ctx.lineTo(x + 4, y + h); }
        ctx.stroke();
        if (g % 4 === 1) { ctx.beginPath(); ctx.arc(x + w * 0.6, y - h * 0.22, h * 0.14, Math.PI, 0); ctx.stroke(); }
        x += w + h * 0.22;
      });
    };
    // A flowing right-to-left script for the third line of older boards.
    const flowing = (ctx: CanvasRenderingContext2D, cx: number, y: number, h: number, width: number) => {
      ctx.lineWidth = h * 0.14; ctx.lineCap = 'round';
      ctx.beginPath();
      let x = cx + width / 2; ctx.moveTo(x, y + h * 0.3);
      while (x > cx - width / 2) { const step = h * rnd(0.5, 1); ctx.quadraticCurveTo(x - step * 0.5, y + h * rnd(0.5, 1.1), x - step, y + h * rnd(0.3, 0.7)); x -= step; if (random() < 0.4) ctx.lineTo(x, y - h * rnd(0, 0.5)); ctx.moveTo(x, y + h * 0.6); }
      ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(cx + rnd(-0.45, 0.45) * width, y + h * pick([-0.15, 1.25]), h * 0.08, 0, Math.PI * 2); ctx.fill(); }
    };

    // ---- platform floor ----------------------------------------------------
    const wetness = a.rain === 'drizzle' ? 0.45 : a.rain === 'steady' ? 0.7 : a.rain === 'cloudburst' ? 1 : 0.85;
    const tubeZ = frames.slice(0, -1).map((z) => z - 3);
    const floorTexture = paint(512, 2048, (ctx) => {
      const fx = (x: number) => (x - X0) / PW * 512, fz = (z: number) => (z - ZF) / PL * 2048;
      const stone = new THREE.Color('#aaa69b').lerp(new THREE.Color('#7e786c'), mood.wear * 0.6).lerp(new THREE.Color('#6f6e6c'), wetness * 0.25);
      ctx.fillStyle = `#${stone.getHexString()}`; ctx.fillRect(0, 0, 512, 2048);
      // Paving slabs, each a touch different.
      const slab = 0.75;
      for (let z = ZF; z < ZN; z += slab) for (let x = X0; x < XE; x += slab) {
        const t = rnd(-0.06, 0.06) + (random() < mood.wear * 0.2 ? -0.14 : 0);
        ctx.fillStyle = t > 0 ? `rgba(255,255,255,${t})` : `rgba(0,0,0,${-t})`;
        ctx.fillRect(fx(x), fz(z), slab / PW * 512 - 1, slab / PL * 2048 - 1);
      }
      // Rain blown in darkens the floor past the eave and at the open end.
      const wetEdge = ctx.createLinearGradient(fx(0.2), 0, fx(XE), 0);
      wetEdge.addColorStop(0, 'rgba(40,46,52,0)'); wetEdge.addColorStop(1, `rgba(40,46,52,${0.25 + wetness * 0.3})`);
      ctx.fillStyle = wetEdge; ctx.fillRect(0, 0, 512, 2048);
      ctx.fillStyle = `rgba(40,46,52,${0.2 + wetness * 0.3})`; ctx.fillRect(0, 0, 512, fz(roofEnd));
      // Stains: paan, oil, old chewing gum.
      for (let i = 0; i < 60 + mood.wear * 260; i++) {
        ctx.fillStyle = random() < 0.3 ? `rgba(122,44,30,${rnd(0.15, 0.5)})` : `rgba(35,32,30,${rnd(0.08, 0.3)})`;
        ctx.beginPath(); ctx.ellipse(random() * 512, random() * 2048, rnd(2, 9), rnd(3, 14), random() * 3, 0, Math.PI * 2); ctx.fill();
      }
      // Tactile strip, the yellow line and the pale coping at the edge.
      const chipped = (x0: number, x1: number, colour: string) => {
        ctx.fillStyle = colour; ctx.fillRect(fx(x0), 0, fx(x1) - fx(x0), 2048);
        ctx.fillStyle = `#${stone.getHexString()}`;
        for (let i = 0; i < mood.wear * 500; i++) ctx.fillRect(fx(x0) + random() * (fx(x1) - fx(x0)), random() * 2048, rnd(1, 5), rnd(3, 26));
      };
      chipped(2.02, 2.42, '#d8ad1e');
      ctx.fillStyle = 'rgba(90,70,10,0.35)';
      for (let z = 0; z < 2048; z += 5) for (let x = 0; x < 4; x++) ctx.fillRect(fx(2.06) + x * (fx(2.42) - fx(2.06)) / 4, z, 3, 2);
      chipped(2.5, 2.66, '#f0c21c');
      ctx.fillStyle = '#c9c6ba'; ctx.fillRect(fx(2.86), 0, fx(XE) - fx(2.86), 2048);
      ctx.fillStyle = 'rgba(40,40,40,0.4)'; for (let z = 0; z < 2048; z += 31) ctx.fillRect(fx(2.86), z, fx(XE) - fx(2.86), 1.5);
      // Puddles hold the sky; tube lights smear down the wet stone.
      const puddles = Math.round((10 + mood.wear * 18) * wetness);
      for (let i = 0; i < puddles; i++) {
        const px = fx(rnd(X0 + 0.4, XE - 0.3)), pz = fz(rnd(roofEnd - 20, 7));
        ctx.fillStyle = bgHex; ctx.globalAlpha = 0.5;
        const pr = rnd(6, 20);
        ctx.beginPath(); ctx.ellipse(px, pz, pr, pr * rnd(0.5, 0.9), rnd(-0.3, 0.3), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(px + pr * 0.7, pz + pr * 0.3, pr * 0.6, pr * 0.4, rnd(-0.3, 0.3), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (sky.tubes > 0.4) for (const z of tubeZ) {
        const glow = ctx.createRadialGradient(fx(-0.9), fz(z), 2, fx(-0.9), fz(z), 150);
        glow.addColorStop(0, `rgba(255,246,214,${0.12 * sky.tubes * wetness})`); glow.addColorStop(1, 'rgba(255,246,214,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, fz(z) - 160, 512, 320);
      }
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL), new THREE.MeshStandardMaterial({ map: floorTexture, roughness: mix(0.85, 0.35, wetness), metalness: 0.05 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set((X0 + XE) / 2, 0, (ZN + ZF) / 2); ground.receiveShadow = true;
    root.add(ground);
    const brick = s.material('#5c4a40', { roughness: 0.9 });
    s.box([PW, 1.2, PL], [(X0 + XE) / 2, -0.61, (ZN + ZF) / 2], brick);
    s.box([0.12, 0.14, PL], [XE + 0.02, -0.07, (ZN + ZF) / 2], s.material('#b9b6aa', { roughness: 0.6 }));

    // ---- track bed, rails, sleepers ----------------------------------------
    const ballast = s.material(new THREE.Color('#6d665c').lerp(new THREE.Color('#4a4640'), wetness * 0.6), { roughness: mix(1, 0.6, wetness) });
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(40, PL + 40), ballast);
    bed.rotation.x = -Math.PI / 2; bed.position.set(XE + 20, PIT, (ZN + ZF) / 2); bed.receiveShadow = true;
    root.add(bed);
    const railSteel = s.material('#b9bfc2', { metalness: 0.9, roughness: mix(0.4, 0.15, wetness) });
    const railRust = s.material('#5d4638', { metalness: 0.4, roughness: 0.7 });
    const tracks = [4.95, 9.3];
    const sleepers: { at: V3; size: number }[] = [];
    for (const tx of tracks) {
      for (const d of [-0.84, 0.84]) {
        s.box([0.075, 0.16, PL + 30], [tx + d, PIT + 0.2, (ZN + ZF) / 2], railRust);
        s.box([0.07, 0.02, PL + 30], [tx + d, PIT + 0.29, (ZN + ZF) / 2], railSteel);
      }
      for (let z = ZN + 4; z > ZF - 14; z -= 0.68) sleepers.push({ at: [tx, PIT + 0.07, z], size: 1 });
    }
    s.scatter(new THREE.BoxGeometry(2.6, 0.13, 0.26), s.material('#8d897e', { roughness: 0.9 }), sleepers);
    // Standing water between the rails.
    const water = new THREE.MeshStandardMaterial({ color: background.clone().multiplyScalar(0.92), roughness: 0.12, metalness: 0.2 });
    for (let i = 0; i < Math.round(wetness * 7); i++) { const pool = s.mesh(new THREE.CircleGeometry(1, 18), water, [pick(tracks) + rnd(-0.6, 0.6), PIT + 0.012, rnd(8, -45)]); pool.rotation.x = -Math.PI / 2; pool.scale.set(rnd(0.3, 0.7), rnd(1, 3.4), 1); pool.castShadow = false; }
    // The far platform and its boundary wall.
    s.box([3.2, 1.2, PL], [13.4, PIT + 0.6, (ZN + ZF) / 2], brick);
    s.box([3.3, 0.06, PL], [13.4, PIT + 1.23, (ZN + ZF) / 2], s.material('#9d998e', { roughness: 0.6 }));
    s.box([0.3, 3.4, PL + 20], [15.3, PIT + 2.9, (ZN + ZF) / 2], s.material(new THREE.Color('#9a958a').lerp(background, 0.35), { roughness: 1 }));

    // ---- ironwork: one instanced set of struts -----------------------------
    const ironHex = { building: '#2f5a48', tiles: '#9aa2a4', railing: '#7a3b2c' }[a.side];
    const ironColour = new THREE.Color(ironHex).lerp(new THREE.Color('#6a4a34'), mood.wear * 0.4);
    const iron = s.material(ironColour, { metalness: 0.35, roughness: 0.6 });
    const struts: { a: V3; b: V3; t: number; w?: number }[] = [];
    const strut = (from: V3, to: V3, t = 0.07, w?: number) => { struts.push({ a: from, b: to, t, w }); };

    // Roof section: a polyline from the inner eave to the outer eave.
    const section: [number, number][] = a.canopy === 'gable' ? [[X0 - 0.15, eave], [-0.7, 5.5], [XE - 0.1, eave]]
      : a.canopy === 'lean' ? [[X0 - 0.15, 5.9], [XE - 0.1, eave]]
        : Array.from({ length: 9 }, (_u, i) => { const t = i / 8; return [mix(X0 - 0.15, XE - 0.1, t), eave + Math.sin(t * Math.PI) * 2.0] as [number, number]; });
    const roofY = (x: number) => { for (let i = 0; i < section.length - 1; i++) { const [x0, y0] = section[i], [x1, y1] = section[i + 1]; if (x <= x1) return mix(y0, y1, (x - x0) / (x1 - x0)); } return section[section.length - 1][1]; };

    const rivets: { at: V3; size: number }[] = [];
    for (const z of frames) {
      for (const x of [colL, colR]) {
        // A built-up riveted stanchion: two channels, lacing plates, a cast base.
        strut([x, 0, z], [x, roofY(x) - 0.05, z], 0.2, 0.16);
        strut([x, 0, z], [x, 0.5, z], 0.34);
        strut([x, 0.5, z], [x, 0.62, z], 0.27);
        strut([x, eave - 0.5, z], [x, eave - 0.38, z], 0.28);
        for (let y = 0.8; y < eave - 0.6; y += 0.24) for (const d of [-0.065, 0.065]) rivets.push({ at: [x + d, y, z + 0.084], size: 1 }, { at: [x + 0.104, y, z + d * 0.8], size: 1 }, { at: [x - 0.104, y, z + d * 0.8], size: 1 });
        // Knee braces along the platform.
        for (const d of [-1, 1]) if (z + d * 1.3 < roofStart && z + d * 1.3 > roofEnd) strut([x, eave - 1.1, z], [x, eave - 0.06, z + d * 1.1], 0.06);
      }
      // The truss: bottom chord, rafters along the section, web members.
      strut([colL, eave - 0.05, z], [colR, eave - 0.05, z], 0.09);
      strut([colR, eave - 0.05, z], [XE - 0.1, eave - 0.02, z], 0.08);
      for (let i = 0; i < section.length - 1; i++) strut([section[i][0], section[i][1] - 0.08, z], [section[i + 1][0], section[i + 1][1] - 0.08, z], 0.09);
      const webs = 7;
      for (let i = 0; i <= webs; i++) {
        const x0 = mix(colL, colR, i / webs), yTop = roofY(x0) - 0.1;
        if (yTop - eave > 0.25) strut([x0, eave - 0.05, z], [x0, yTop, z], 0.045);
        if (i < webs) { const x1 = mix(colL, colR, (i + 1) / webs); strut(i % 2 ? [x0, eave - 0.05, z] : [x0, yTop, z], i % 2 ? [x1, roofY(x1) - 0.1, z] : [x1, eave - 0.05, z], 0.04); }
      }
      strut([colR, eave - 1.0, z], [XE - 0.4, eave - 0.06, z], 0.06);
    }
    // Purlins along the length, and the eave beams.
    const purlins = a.canopy === 'vault' ? 9 : 8;
    for (let i = 0; i <= purlins; i++) { const x = mix(X0 - 0.1, XE - 0.15, i / purlins); strut([x, roofY(x) - 0.04, roofStart], [x, roofY(x) - 0.04, roofEnd], 0.07); }
    for (const x of [colL, colR]) strut([x, eave - 0.05, roofStart], [x, eave - 0.05, roofEnd], 0.1);

    // The corrugated sheeting, one panel per bay and section span, some missing when worn.
    const sheetTexture = paint(64, 256, (ctx) => {
      const tone = new THREE.Color('#8f9492').lerp(new THREE.Color('#6b5244'), mood.wear * 0.65);
      for (let x = 0; x < 64; x++) { const k = 0.78 + 0.22 * Math.sin((x / 64) * Math.PI * 2 * 4); ctx.fillStyle = `#${tone.clone().multiplyScalar(k).getHexString()}`; ctx.fillRect(x, 0, 1, 256); }
      for (let i = 0; i < 20 + mood.wear * 120; i++) { ctx.fillStyle = `rgba(92,48,26,${rnd(0.1, 0.45)})`; ctx.fillRect(random() * 64, random() * 256, rnd(1, 4), rnd(10, 90)); }
      ctx.fillStyle = 'rgba(20,20,20,0.35)'; ctx.fillRect(0, 0, 64, 3);
    });
    sheetTexture.wrapS = sheetTexture.wrapT = THREE.RepeatWrapping;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const holes: { x: number; z: number }[] = [];
    const bays = [roofStart, ...frames.slice(1), roofEnd];
    for (let b = 0; b < bays.length - 1; b++) for (let i = 0; i < section.length - 1; i++) {
      const [x0, y0] = section[i], [x1, y1] = section[i + 1], z0 = bays[b], z1 = bays[b + 1];
      if (b > 0 && random() < Math.max(0, mood.wear - 0.55) * 0.5) { holes.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2 }); continue; }
      const n = positions.length / 3, slope = Math.hypot(x1 - x0, y1 - y0);
      positions.push(x0, y0, z0, x1, y1, z0, x1, y1, z1, x0, y0, z1);
      uvs.push(z0 / 1.1, 0, z0 / 1.1, slope / 3, z1 / 1.1, slope / 3, z1 / 1.1, 0);
      index.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const roofGeometry = new THREE.BufferGeometry();
    roofGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roofGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roofGeometry.setIndex(index); roofGeometry.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeometry, new THREE.MeshStandardMaterial({ map: sheetTexture, roughness: 0.75, metalness: 0.25, side: THREE.DoubleSide }));
    roof.castShadow = roof.receiveShadow = true;
    root.add(roof);
    // The fretted valance along the outer eave.
    const valanceTexture = paint(128, 64, (ctx) => {
      ctx.clearRect(0, 0, 128, 64);
      ctx.fillStyle = `#${ironColour.clone().multiplyScalar(0.85).getHexString()}`;
      ctx.fillRect(0, 0, 128, 26);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 32, 26); ctx.lineTo(i * 32 + 16, 62); ctx.lineTo(i * 32 + 32, 26); ctx.fill(); }
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(i * 32 + 16, 30, 5, 0, Math.PI * 2); ctx.fill(); }
    });
    valanceTexture.wrapS = THREE.RepeatWrapping; valanceTexture.repeat.set((roofStart - roofEnd) / 1.2, 1);
    const valance = new THREE.Mesh(new THREE.PlaneGeometry(roofStart - roofEnd, 0.5), new THREE.MeshStandardMaterial({ map: valanceTexture, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }));
    valance.rotation.y = -Math.PI / 2; valance.position.set(XE - 0.08, eave - 0.24, (roofStart + roofEnd) / 2); valance.castShadow = true;
    if (a.canopy !== 'lean') root.add(valance); else { valance.geometry.dispose(); (valance.material as THREE.Material).dispose(); strut([XE - 0.08, eave - 0.12, roofStart], [XE - 0.08, eave - 0.12, roofEnd], 0.2, 0.04); }

    // ---- ceiling fans, tube lights, clock ----------------------------------
    const fans: THREE.Object3D[] = [];
    const fanMaterial = s.material('#d9d6c8', { roughness: 0.5 });
    const tube = new THREE.MeshStandardMaterial({ color: '#f4f7f2', emissive: '#f2f6ee', emissiveIntensity: sky.tubes, roughness: 0.4 });
    const tubes: THREE.Mesh[] = [];
    tubeZ.forEach((z, bay) => {
      for (const x of [-2.6, 0.9]) {
        if (bay === 0 && x > 0) continue;
        strut([x, eave - 0.05, z], [x, 3.72, z], 0.03);
        const hub = new THREE.Group(); hub.position.set(x, 3.62, z);
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 12), fanMaterial); hub.add(motor);
        for (let k = 0; k < 3; k++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.012, 0.13), fanMaterial); blade.position.set(Math.cos(k * 2.094) * 0.4, -0.02, Math.sin(k * 2.094) * 0.4); blade.rotation.y = -k * 2.094; blade.rotation.x = 0.12; hub.add(blade); }
        hub.rotation.y = random() * 6; root.add(hub); fans.push(hub);
      }
      if (bay === 0) return;
      const lamp = s.mesh(new THREE.BoxGeometry(0.07, 0.07, 1.25), tube, [-0.9, eave - 0.2, z]); lamp.castShadow = false; tubes.push(lamp);
      strut([-0.9, eave - 0.14, z - 0.66], [-0.9, eave - 0.14, z + 0.66], 0.1, 0.03);
    });

    // ---- hanging signs -----------------------------------------------------
    const swingers: THREE.Group[] = [];
    const hang = (texture: THREE.Texture, w: number, h: number, at: V3, glow = 0) => {
      const group = new THREE.Group(); group.position.set(at[0], eave - 0.05, at[2]);
      const drop = eave - 0.05 - at[1] - h / 2;
      const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, ...(glow ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: glow } : {}) });
      const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), [iron, iron, iron, iron, material, material]);
      board.position.y = -drop - h / 2; board.castShadow = true;
      group.add(board);
      for (const d of [-1, 1]) { const rod = new THREE.Mesh(new THREE.BoxGeometry(0.025, drop, 0.025), iron); rod.position.set(d * w * 0.38, -drop / 2, 0); group.add(rod); }
      root.add(group); swingers.push(group);
      return group;
    };
    const name = a.station.toUpperCase();
    const nameTexture = paint(768, 256, (ctx) => {
      ctx.fillStyle = '#f0c61f'; ctx.fillRect(0, 0, 768, 256);
      ctx.strokeStyle = '#17150f'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 752, 240);
      ctx.fillStyle = '#17150f';
      barred(ctx, 384, 34, 44, Math.max(3, Math.round(name.length * 0.6)));
      ctx.font = 'bold 84px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(name, 384, 140, 700);
      flowing(ctx, 384, 196, 30, 60 + name.length * 26);
      for (let i = 0; i < mood.wear * 140; i++) { ctx.fillStyle = `rgba(110,70,30,${rnd(0.15, 0.5)})`; ctx.fillRect(random() * 768, random() * 256, rnd(2, 14), rnd(2, 8)); }
    });
    hang(nameTexture, 3.3, 1.1, [-0.9, 3.72, -0.6]);
    hang(nameTexture, 2.7, 0.9, [-0.9, 3.72, -18.2]);
    // Platform number, lit from inside.
    const platformNo = 1 + Math.floor(random() * 7);
    hang(paint(128, 128, (ctx) => {
      ctx.fillStyle = '#17357a'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#fbfbf2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 26px sans-serif'; ctx.fillText('PLATFORM', 64, 22, 116);
      ctx.font = 'bold 86px sans-serif'; ctx.fillText(String(platformNo), 64, 80);
    }), 0.7, 0.7, [1.4, 3.6, -6.2], 0.3 + sky.tubes * 0.35);
    // Coach position boards over the edge: ladies in green and yellow, first class in red and yellow.
    const coachBoard = (c0: string, c1: string, word: string) => paint(256, 128, (ctx) => {
      for (let i = -2; i < 12; i++) { ctx.fillStyle = i % 2 ? c0 : c1; ctx.beginPath(); ctx.moveTo(i * 32, 128); ctx.lineTo(i * 32 + 32, 128); ctx.lineTo(i * 32 + 80, 0); ctx.lineTo(i * 32 + 48, 0); ctx.fill(); }
      ctx.fillStyle = '#fbfbf2'; ctx.fillRect(22, 34, 212, 60);
      ctx.fillStyle = '#17150f'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 40px sans-serif'; ctx.fillText(word, 128, 66, 200);
    });
    hang(coachBoard('#2f8a4a', '#f2cf2e', 'LADIES'), 1.1, 0.55, [2.3, 3.5, -9.5]);
    hang(coachBoard('#c8281f', '#f2cf2e', 'FIRST'), 1.1, 0.55, [2.3, 3.5, 4.6]);
    hang(coachBoard('#c8281f', '#f2cf2e', 'FIRST'), 1.1, 0.55, [2.3, 3.5, -20.5]);
    // The platform clock, hours by the light.
    const hour = { morning: 8, break: 16, evening: 18, last: 0 }[a.time] + Math.floor(random() * 2), minute = Math.floor(random() * 60);
    const clockGroup = hang(paint(128, 128, (ctx) => {
      ctx.fillStyle = '#20231f'; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#f7f2df'; ctx.beginPath(); ctx.arc(64, 64, 58, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#151515';
      for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2; ctx.lineWidth = i % 3 ? 3 : 6; ctx.beginPath(); ctx.moveTo(64 + Math.sin(t) * 46, 64 - Math.cos(t) * 46); ctx.lineTo(64 + Math.sin(t) * 55, 64 - Math.cos(t) * 55); ctx.stroke(); }
      ctx.lineCap = 'round';
      const hand = (turn: number, len: number, w: number) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(turn) * len, 64 - Math.cos(turn) * len); ctx.stroke(); };
      hand(((hour % 12) + minute / 60) / 12 * Math.PI * 2, 30, 8); hand(minute / 60 * Math.PI * 2, 46, 5);
    }), 0.8, 0.8, [-2.7, 3.55, -11.6], 0.2 + sky.tubes * 0.3);
    void clockGroup;

    // ---- the inner side ----------------------------------------------------
    const posterHues = mood.cheer > 0.5 ? ['#d8402f', '#2f7fc8', '#e9a820', '#3c9a5c', '#c2479a', '#ef7a2a'] : ['#8a5a4e', '#566a80', '#9a8650', '#5a7362', '#7a5a70', '#8a6a4a'];
    if (a.side !== 'railing') {
      const wallH = 6.2, repeatLength = 12;
      const wallTexture = paint(1024, 512, (ctx) => {
        const u = (m: number) => m / repeatLength * 1024, v = (m: number) => 512 - m / wallH * 512;
        const upper = new THREE.Color(a.side === 'tiles' ? '#d9dcd4' : '#e3d6b0').lerp(new THREE.Color('#9a8f78'), mood.wear * 0.5);
        ctx.fillStyle = `#${upper.getHexString()}`; ctx.fillRect(0, 0, 1024, 512);
        if (a.side === 'building') {
          ctx.fillStyle = '#6e2a26'; ctx.fillRect(0, v(1.35), 1024, 512 - v(1.35));
          ctx.fillStyle = '#3a2420'; ctx.fillRect(0, v(1.42), 1024, 6); ctx.fillRect(0, v(0.16), 1024, 512 - v(0.16));
          // An arched doorway and its signboard.
          const door = (x: number, word: string) => {
            ctx.fillStyle = '#4a3a2c'; ctx.fillRect(u(x - 0.85), v(2.5), u(1.7), v(0) - v(2.5)); ctx.beginPath(); ctx.arc(u(x), v(2.5), u(0.85), Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#16191a'; ctx.fillRect(u(x - 0.7), v(2.5), u(1.4), v(0) - v(2.5)); ctx.beginPath(); ctx.arc(u(x), v(2.5), u(0.7), Math.PI, 0); ctx.fill();
            if (sky.tubes > 1) { ctx.fillStyle = 'rgba(255,214,140,0.5)'; ctx.fillRect(u(x - 0.7), v(2.4), u(1.4), v(0) - v(2.4)); }
            ctx.fillStyle = '#17357a'; ctx.fillRect(u(x - 1.0), v(3.75), u(2.0), v(3.35) - v(3.75));
            ctx.fillStyle = '#fbfbf2'; ctx.strokeStyle = '#fbfbf2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 19px sans-serif';
            ctx.fillText(word, u(x), v(3.55) + 6, u(1.9)); barred(ctx, u(x), v(3.74) + 3, 7, 5);
          };
          door(2.2, 'WAITING ROOM'); door(8.6, pick(['STATION MASTER', 'PARCEL OFFICE', 'CLOAK ROOM']));
          // The ticket window with its grille.
          ctx.fillStyle = '#3a2420'; ctx.fillRect(u(4.75), v(2.3), u(1.5), v(1.0) - v(2.3));
          ctx.fillStyle = sky.tubes > 1 ? '#c9a868' : '#1c2120'; ctx.fillRect(u(4.85), v(2.2), u(1.3), v(1.1) - v(2.2));
          ctx.fillStyle = '#8f9390'; for (let i = 0; i < 9; i++) ctx.fillRect(u(4.85) + i * u(1.3) / 8 - 1, v(2.2), 2.5, v(1.1) - v(2.2));
          ctx.fillStyle = '#f0c61f'; ctx.fillRect(u(4.75), v(2.75), u(1.5), v(2.4) - v(2.75));
          ctx.fillStyle = '#17150f'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TICKETS', u(5.5), v(2.56), u(1.4));
        } else {
          // Tiled dado in a checker of white and blue, then hoardings above.
          const tile = 0.22;
          for (let y = 0; y < 1.9; y += tile) for (let x = 0; x < repeatLength; x += tile) {
            const blue = (Math.round(x / tile) + Math.round(y / tile)) % 7 === 0 || y > 1.6;
            ctx.fillStyle = blue ? '#3f78b4' : random() < mood.wear * 0.3 ? '#b9b3a2' : '#eef0ea';
            ctx.fillRect(u(x) + 0.5, v(y + tile) + 0.5, u(tile) - 1, v(0) - v(tile) - 1);
          }
          for (let i = 0; i < 2; i++) {
            const x = 0.6 + i * 6, c = pick(posterHues), d = pick(posterHues);
            ctx.fillStyle = '#2a2a2a'; ctx.fillRect(u(x - 0.06), v(4.5), u(4.9), v(2.2) - v(4.5));
            ctx.fillStyle = c; ctx.fillRect(u(x), v(4.44), u(4.78), v(2.26) - v(4.44));
            ctx.fillStyle = d; ctx.beginPath(); ctx.arc(u(x + rnd(0.9, 3.8)), v(3.4), u(0.8), 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fbfbf2'; ctx.strokeStyle = '#fbfbf2'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(pick(['CHAI', 'SOAP', 'GOLD', 'CEMENT', 'SAREES', 'BISCUITS', 'TALKIES']), u(x + 2.4), v(3.7), u(4.4));
            barred(ctx, u(x + 2.4), v(3.05), 22, 6);
          }
          // Taps over a steel trough.
          ctx.fillStyle = '#9aa2a4'; ctx.fillRect(u(9.2), v(1.0), u(2.2), v(0.7) - v(1.0));
          ctx.fillStyle = '#2a2d2e'; for (let i = 0; i < 4; i++) ctx.fillRect(u(9.45 + i * 0.55), v(1.35), 5, v(1.0) - v(1.35));
        }
        // Posters, timetables and their ghosts.
        for (let i = 0; i < 3 + mood.density * 6; i++) {
          const x = rnd(0.3, 11.2), y = rnd(1.5, 2.3), w = rnd(0.4, 0.75), h = rnd(0.5, 0.9);
          if (a.side === 'building' && ((x > 0.9 && x < 3.4) || (x > 4.2 && x < 6.6) || (x > 7.4 && x < 9.9))) continue;
          if (a.side === 'tiles' && y + h > 2.1) continue;
          ctx.save(); ctx.translate(u(x), v(y)); ctx.rotate(rnd(-0.05, 0.05));
          ctx.fillStyle = random() < 0.4 ? '#efe8d2' : pick(posterHues); ctx.fillRect(0, -u(h), u(w), u(h));
          ctx.fillStyle = 'rgba(20,20,20,0.6)'; for (let l = 0; l < 4; l++) ctx.fillRect(4, -u(h) + 8 + l * 9, u(w) * rnd(0.4, 0.85), 3);
          ctx.restore();
        }
        // Damp rising, drips falling.
        const damp = ctx.createLinearGradient(0, v(0), 0, v(1.2));
        damp.addColorStop(0, `rgba(48,52,44,${0.25 + mood.wear * 0.4})`); damp.addColorStop(1, 'rgba(48,52,44,0)');
        ctx.fillStyle = damp; ctx.fillRect(0, v(1.2), 1024, v(0) - v(1.2));
        for (let i = 0; i < 16 + mood.wear * 80; i++) { ctx.fillStyle = `rgba(70,74,60,${rnd(0.08, 0.3)})`; ctx.fillRect(random() * 1024, v(wallH), rnd(2, 9), rnd(30, 240)); }
      });
      wallTexture.wrapS = THREE.RepeatWrapping; wallTexture.repeat.set(PL / repeatLength, 1);
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(PL, wallH), new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.85 }));
      wall.rotation.y = Math.PI / 2; wall.position.set(X0, wallH / 2, (ZN + ZF) / 2); wall.receiveShadow = true;
      root.add(wall);
      s.box([0.5, wallH, PL], [X0 - 0.27, wallH / 2, (ZN + ZF) / 2], s.material('#8d8474'));
      // A cornice and the building's own roof line past the canopy.
      s.box([0.5, 0.2, PL], [X0 - 0.1, wallH + 0.1, (ZN + ZF) / 2], s.material('#b9ad8e'));
    } else {
      // Railing on a low kerb, then open rain, a neighbouring canopy and the city.
      s.box([0.22, 0.4, PL], [X0 + 0.02, 0.2, (ZN + ZF) / 2], s.material('#8d8880', { roughness: 0.9 }));
      strut([X0, 1.25, ZN], [X0, 1.25, ZF], 0.06); strut([X0, 0.8, ZN], [X0, 0.8, ZF], 0.04);
      for (let z = ZN - 0.4; z > -44; z -= 0.42) strut([X0, 0.4, z], [X0, 1.25, z], 0.028);
      const far = s.material(new THREE.Color('#77807c').lerp(background, 0.4), { roughness: 0.9 });
      s.box([7, 1.1, PL], [-13.5, -0.6, (ZN + ZF) / 2], far);
      const roofFar = s.box([8, 0.12, 60], [-13.5, 4.6, -16], far); roofFar.rotation.z = 0.08;
      for (let z = 10; z > -46; z -= 6) for (const x of [-16, -11]) strut([x, 0, z], [x, 4.5, z], 0.2);
      const bedLeft = new THREE.Mesh(new THREE.PlaneGeometry(40, PL + 40), ballast); bedLeft.rotation.x = -Math.PI / 2; bedLeft.position.set(X0 - 20.2, PIT, (ZN + ZF) / 2); root.add(bedLeft);
      for (const d of [-0.84, 0.84]) s.box([0.075, 0.16, PL + 30], [-7.2 + d, PIT + 0.2, (ZN + ZF) / 2], railRust);
    }

    // ---- overhead wires and masts ------------------------------------------
    const wire = s.material('#2b2d2e', { roughness: 0.6 });
    const mastX = 11.5, contactY = PIT + 5.6;
    for (let z = 10; z > ZF - 10; z -= 12) {
      strut([mastX, PIT, z], [mastX, PIT + 7.6, z], 0.24, 0.2);
      for (const tx of tracks) {
        strut([mastX, PIT + 7.0, z], [tx, contactY + 1.2, z], 0.06);
        strut([mastX, PIT + 5.9, z], [tx + 0.2, contactY + 0.06, z], 0.045);
        strut([tx, contactY + 1.2, z], [tx + 0.2, contactY + 0.06, z], 0.035);
      }
      // Catenary sag between masts with droppers down to the contact wire.
      for (const tx of tracks) for (let k = 0; k < 6; k++) {
        const u0 = k / 6, u1 = (k + 1) / 6, sag = (u: number) => contactY + 1.2 - Math.sin(u * Math.PI) * 0.75;
        struts.push({ a: [tx, sag(u0), z - u0 * 12], b: [tx, sag(u1), z - u1 * 12], t: 0.03, w: 0.03 });
        if (k > 0) struts.push({ a: [tx + 0.1, sag(u0), z - u0 * 12], b: [tx + 0.1, contactY, z - u0 * 12], t: 0.016, w: 0.016 });
      }
    }
    for (const tx of tracks) s.box([0.035, 0.035, PL + 30], [tx + 0.1, contactY, (ZN + ZF) / 2], wire);

    // ---- footbridge beyond the canopy end ----------------------------------
    const bz = -31, deck = 6.3;
    s.box([24, 0.3, 3.2], [4.5, deck, bz], iron);
    s.box([24.4, 0.14, 3.8], [4.5, deck + 2.75, bz], s.material(new THREE.Color('#8f9492').lerp(new THREE.Color('#6b5244'), mood.wear * 0.6), { metalness: 0.2 }));
    for (const dz of [-1.55, 1.55]) {
      strut([-7.5, deck + 1.25, bz + dz], [16.5, deck + 1.25, bz + dz], 0.08);
      for (let x = -7.5; x < 16.5; x += 1.5) { strut([x, deck, bz + dz], [x + 1.5, deck + 1.25, bz + dz], 0.045); strut([x + 1.5, deck, bz + dz], [x, deck + 1.25, bz + dz], 0.045); strut([x, deck + 1.25, bz + dz], [x, deck + 2.7, bz + dz], 0.05); }
    }
    for (const x of [-3.9, 2.6, 7.1, 15.6]) for (const dz of [-1.3, 1.3]) strut([x, x > 3 ? PIT : 0, bz + dz], [x, deck, bz + dz], 0.26);
    // Stairs down onto the platform, with a landing.
    const stair = s.box([2.4, 0.3, 9.6], [-3.2, deck / 2 - 0.1, bz + 6.1], s.material('#8d8880', { roughness: 0.9 }));
    stair.rotation.x = -Math.atan2(deck, 8.4);
    for (const d of [-1.2, 1.2]) strut([-3.2 + d, deck + 1.0, bz + 1.6], [-3.2 + d, 1.0, bz + 10.2], 0.06);

    // ---- the city in the rain ----------------------------------------------
    const windowTexture = paint(128, 256, (ctx) => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 256);
      for (let y = 8; y < 256; y += 20) for (let x = 8; x < 128; x += 20) { ctx.fillStyle = sky.tubes > 1 && random() < 0.45 ? '#fff0b8' : `rgba(40,50,60,${rnd(0.35, 0.7)})`; ctx.fillRect(x, y, 11, 12); }
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(50,50,45,${rnd(0.05, 0.25)})`; ctx.fillRect(random() * 128, 0, rnd(2, 6), rnd(40, 256)); }
    });
    windowTexture.wrapS = windowTexture.wrapT = THREE.RepeatWrapping;
    const haze = a.rain === 'cloudburst' ? 0.82 : a.rain === 'steady' ? 0.68 : a.rain === 'drizzle' ? 0.55 : 0.4;
    const blockHues = ['#c9b79a', '#b7c0c4', '#c4a79a', '#aab5a8', '#d0c8b0', '#b0a8b8'];
    const towers: { x: number; z: number; w: number; h: number; d: number }[] = [];
    for (let i = 0; i < 12; i++) towers.push({ x: rnd(20, 44), z: mix(4, -95, i / 11) + rnd(-3, 3), w: rnd(7, 13), h: rnd(9, 34), d: rnd(7, 12) });
    if (a.side === 'railing') for (let i = 0; i < 7; i++) towers.push({ x: rnd(-46, -24), z: mix(0, -90, i / 6) + rnd(-3, 3), w: rnd(7, 13), h: rnd(9, 30), d: rnd(7, 12) });
    for (let i = 0; i < 5; i++) towers.push({ x: rnd(-18, 30), z: rnd(-105, -125), w: rnd(8, 14), h: rnd(14, 40), d: 8 });
    for (const t of towers) {
      const far = Math.min(1, (Math.abs(t.x) + Math.abs(t.z)) / 150);
      const map = windowTexture.clone(); map.needsUpdate = true; map.repeat.set(Math.round(t.w / 3.4), Math.round(t.h / 6)); textures.push(map);
      const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(pick(blockHues)).lerp(background, Math.min(0.93, haze + far * 0.3)), map, roughness: 1, ...(sky.tubes > 1 ? { emissive: '#ffe2a0', emissiveMap: map, emissiveIntensity: 0.25 } : {}) });
      const block = s.box([t.w, t.h, t.d], [t.x, PIT + t.h / 2, t.z], material); block.castShadow = false;
      // A water tank on the roof.
      if (random() < 0.6) s.cylinder(1, 1, 1.6, [t.x + rnd(-2, 2), PIT + t.h + 0.8, t.z], material, 10).castShadow = false;
    }
    // Shanty roofs and blue tarpaulins against the boundary wall.
    const shacks: { at: V3; size: number; color: string }[] = [];
    for (let z = 12; z > -70; z -= rnd(2.2, 3.4)) shacks.push({ at: [17.2 + rnd(-0.4, 0.8), PIT + 2.6 + rnd(0, 1.6), z], size: rnd(1.6, 2.6), color: `#${new THREE.Color(random() < 0.45 ? '#2f6fc0' : pick(['#8a8478', '#9a6a4a', '#7a8a84', '#b0a890'])).lerp(background, haze * 0.6).getHexString()}` });
    s.scatter(new THREE.BoxGeometry(1.4, 1, 1.2), s.material('#ffffff', { roughness: 1 }), shacks);

    // ---- a train, perhaps --------------------------------------------------
    const lamps: THREE.MeshStandardMaterial[] = [];
    const train = (tx: number, zHead: number, cars: number, headToward: number, lampColour: string) => {
      const bodyA = s.material(new THREE.Color('#e6dfc8').lerp(background, 0.25), { roughness: 0.5 }), bodyB = s.material(new THREE.Color('#6a2a6e').lerp(background, 0.25), { roughness: 0.5 });
      const dark = s.material('#20252a', { roughness: 0.4 });
      for (let c = 0; c < cars; c++) {
        const zc = zHead - headToward * (10.2 + c * 20.8);
        s.box([3.0, 1.0, 20.2], [tx, PIT + 1.75, zc], bodyA); s.box([3.02, 0.8, 20.2], [tx, PIT + 2.6, zc], bodyB); s.box([3.0, 0.75, 20.2], [tx, PIT + 3.35, zc], bodyA);
        s.box([2.6, 0.5, 19.6], [tx, PIT + 0.9, zc], dark);
        s.box([2.9, 0.3, 20.2], [tx, PIT + 3.85, zc], s.material('#8f9492', { metalness: 0.2 }));
        for (let k = 0; k < 4; k++) s.box([3.06, 1.9, 1.3], [tx, PIT + 2.25, zc - 7.6 + k * 5.1], dark);
      }
      // Cab face with lamps toward the viewer or away.
      const face = zHead + headToward * 0.06;
      s.box([2.9, 1.0, 0.1], [tx, PIT + 1.7, face], s.material('#e9c21f'));
      s.box([2.5, 0.9, 0.1], [tx, PIT + 2.9, face], dark);
      const lamp = new THREE.MeshStandardMaterial({ color: lampColour, emissive: lampColour, emissiveIntensity: 3 });
      lamps.push(lamp);
      for (const d of [-0.9, 0.9]) {
        const bulb = s.mesh(new THREE.SphereGeometry(0.2, 12, 8), lamp, [tx + d, PIT + 1.75, face + headToward * 0.08]); bulb.castShadow = false;
        const halo = s.mesh(new THREE.SphereGeometry(lampColour === '#ff3a28' ? 0.7 : 1.3, 12, 8), new THREE.MeshBasicMaterial({ color: lampColour, transparent: true, opacity: 0.3, depthWrite: false }), [tx + d, PIT + 1.75, face + headToward * 0.3]); halo.castShadow = false; halo.renderOrder = 4;
      }
    };
    if (a.train === 'arriving') train(tracks[0], -33, 2, 1, '#fff4c8');
    else if (a.train === 'standing') train(tracks[1], 6, 3, 1, '#fff4c8');
    else if (a.train === 'departed') train(tracks[0], -27, 2, 1, '#ff3a28');

    // ---- traces of the crowd -----------------------------------------------
    const cloths = mood.cheer > 0.5 ? ['#d8402f', '#e9a820', '#2f7fc8', '#f1ece0', '#3c9a5c', '#c2479a'] : ['#7c4a40', '#8a7a52', '#48607a', '#b9b3a2', '#566b58', '#6a5568'];
    const count = (lo: number, hi: number) => Math.round(mix(lo, hi, mood.density));
    if (a.crowd === 'umbrellas') {
      const n = count(9, 26);
      const dome = new THREE.SphereGeometry(0.5, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2.5);
      const canopies = new THREE.InstancedMesh(dome, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const inner = i % 3 === 0, z = inner ? rnd(-6, -22) : mix(8.5, -22, (i + random() * 0.8) / n), x = rnd(2.5, 3.0) - (inner ? rnd(2.6, 5.4) : 0), y = rnd(1.6, 1.9);
        // Skip the standing slots so nothing is speared by a handle.
        if (SLOTS.some((slot) => Math.hypot(slot.x - x, slot.z - z) < slot.r + 0.5)) { m.makeScale(0, 0, 0); canopies.setMatrixAt(i, m); continue; }
        const tilt = rnd(-0.25, 0.25), lean = rnd(-0.2, 0.2);
        q.setFromEuler(e.set(tilt, random() * 6, lean));
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 0.8, 1).multiplyScalar(rnd(0.85, 1.1)));
        canopies.setMatrixAt(i, m);
        canopies.setColorAt(i, new THREE.Color(random() < 0.78 ? '#17171a' : pick(cloths)));
        struts.push({ a: [x, y + 0.42, z], b: [x - lean * 0.9, y - 0.55, z + tilt * 0.9], t: 0.018, w: 0.018 });
        // A bag set down at the feet of some.
        if (random() < 0.5) s.ball([0.2, 0.17, 0.12], [x - lean, 0.16, z + rnd(-0.15, 0.15)], s.material(pick(['#3a3430', '#4a3a2c', '#2c3440', '#5a4a3a', '#6e5a40']), { roughness: 0.9 }), 8).rotation.y = rnd(0, 3);
      }
      canopies.castShadow = true; canopies.instanceMatrix.needsUpdate = true; if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
      root.add(canopies);
    } else if (a.crowd === 'luggage') {
      const sack = s.material('#b59a6a', { roughness: 1 });
      for (const z of frames.slice(2, 6)) for (const x of [colL, colR]) {
        if (random() < 0.25) continue;
        const n = count(2, 6), away = x < 0 ? 1 : -1;
        for (let i = 0; i < n; i++) {
          const px = x + away * rnd(0.25, 0.55), pz = z + rnd(-0.75, 0.75), kind = random();
          if (kind < 0.45) { const m = s.ball([rnd(0.25, 0.38), rnd(0.2, 0.3), rnd(0.3, 0.45)], [px, 0.22 + (i > 2 ? 0.4 : 0), pz], sack, 10); m.rotation.y = rnd(0, 3); }
          else if (kind < 0.75) s.box([0.7, 0.34, 0.42], [px, 0.17 + (i > 2 ? 0.36 : 0), pz], s.material(pick(['#1d1f22', '#3f8a78', '#1f3566', '#6e1f24']), { metalness: 0.3, roughness: 0.45 })).rotation.y = rnd(-0.3, 0.3) + Math.PI / 2;
          else { const m = s.ball([0.26, 0.22, 0.26], [px, 0.2 + (i > 2 ? 0.4 : 0), pz], s.material(pick(cloths), { roughness: 1 }), 10); m.rotation.y = rnd(0, 3); }
        }
      }
    } else if (a.crowd === 'papers') {
      const paper = s.material('#e6e0cc', { roughness: 1 });
      const sheets = count(14, 46);
      const litter: { at: V3; size: number; color: string }[] = [];
      for (let i = 0; i < sheets; i++) litter.push({ at: [rnd(X0 + 0.5, XE - 0.3), 0.012, rnd(10, -22)], size: rnd(0.6, 1.4), color: random() < 0.65 ? '#e6e0cc' : random() < 0.5 ? '#f59a1b' : '#c9c2ae' });
      const flat = s.scatter(new THREE.BoxGeometry(0.4, 0.008, 0.3), paper, litter);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      litter.forEach((l, i) => { q.setFromEuler(new THREE.Euler(0, random() * 6, 0)); flat.setMatrixAt(i, m.compose(new THREE.Vector3(...l.at), q, new THREE.Vector3(l.size, 1, l.size))); });
      flat.instanceMatrix.needsUpdate = true; flat.castShadow = false;
      // Wet footprints heading for the edge.
      const prints: { at: V3; size: number }[] = [];
      for (let trail = 0; trail < 7; trail++) { let x = rnd(-3.5, 0), z = rnd(8, -18); const dx = rnd(0.3, 0.5), dz = rnd(-0.25, 0.25); for (let k = 0; k < 9 && x < XE - 0.4; k++) { prints.push({ at: [x, 0.006, z + (k % 2 ? 0.1 : -0.1)], size: 1 }); x += dx; z += dz; } }
      s.scatter(new THREE.BoxGeometry(0.26, 0.004, 0.1), new THREE.MeshStandardMaterial({ color: '#4a4c4c', roughness: 0.2, transparent: true, opacity: 0.55, depthWrite: false }), prints).castShadow = false;
    }
    // Benches against the inner side, and bins, by density.
    const benchWood = s.material('#7a5a3a', { roughness: 0.8 });
    const benchZ = [9.5, -8, -14.2, -20].slice(0, count(1, 4));
    for (const z of benchZ) {
      s.box([0.5, 0.06, 2.2], [X0 + 0.55, 0.45, z], benchWood);
      s.box([0.06, 0.5, 2.2], [X0 + 0.28, 0.75, z], benchWood).rotation.z = -0.15;
      for (const d of [-0.95, 0.95]) { strut([X0 + 0.35, 0, z + d], [X0 + 0.35, 0.98, z + d], 0.05); strut([X0 + 0.75, 0, z + d], [X0 + 0.75, 0.45, z + d], 0.05); }
    }
    if (mood.density > 0.3) { s.cylinder(0.26, 0.2, 0.75, [colL + 0.45, 0.375, -11.2], s.material('#2f6a8a', { roughness: 0.6, metalness: 0.3 }), 12); s.cylinder(0.26, 0.2, 0.75, [colR - 0.1, 0.375, -17.6], s.material('#2f8a4a', { roughness: 0.6, metalness: 0.3 }), 12); }
    if (mood.cheer > 0.6) {
      // Marigold strings round the nearer columns.
      const beads: { at: V3; size: number; color: string }[] = [];
      for (const z of [7, 1, -5]) for (const x of [colL, colR]) for (let i = 0; i < 22; i++) { const t = (i / 22) * Math.PI * 2; beads.push({ at: [x + Math.cos(t) * 0.15, 2.5 + Math.sin(t * 2) * 0.06, z + Math.sin(t) * 0.15], size: 1, color: i % 3 ? '#f59a1b' : '#f7c21d' }); }
      s.scatter(new THREE.SphereGeometry(0.045, 6, 4), s.material('#ffffff'), beads);
    }

    const serviceMetal=s.material('#929d99',{metalness:.55,roughness:.5});
    if(a.gutter!=='plain'){
      s.box([.3,.08,roofStart-roofEnd],[colR+.46,eave-.05,(roofStart+roofEnd)/2],serviceMetal);
      for(const z of[7,-5,-17])if(a.gutter==='pipes'||a.gutter==='hoppers'){
        const x=colR+.43;s.rod([x,.05,z],[x,eave-.06,z],.055,serviceMetal);for(const y of[.8,2.3,3.7])s.box([.15,.07,.12],[x,y,z],iron);
        if(a.gutter==='hoppers')s.cylinder(.19,.065,.3,[x,eave-.2,z],serviceMetal,4).rotation.y=Math.PI/4;
      }
    }
    if(a.cableTray!=='bare'){
      const x=colL+.42,y=eave-.43,z=(roofStart+roofEnd)/2,len=roofStart-roofEnd;
      if(a.cableTray==='trunk')s.box([.22,.12,len],[x,y,z],serviceMetal);
      else if(a.cableTray==='bundles')for(const dx of[-.07,0,.07])s.rod([x+dx,y,roofStart],[x+dx,y,roofEnd],.024,iron);
      else{for(const dx of[-.12,.12])s.box([.018,.06,len],[x+dx,y,z],serviceMetal);for(let i=0;i<40;i++)s.box([.26,.02,.025],[x,y-.02,roofEnd+i*len/39],serviceMetal);}
      for(const z of frames)strut([colL,eave-.43,z],[x+.13,eave-.43,z],.03);
    }
    if(a.columnBands!=='plain')for(const z of frames)for(const x of[colL,colR]){
      if(a.columnBands==='pale')s.box([.22,.32,.22],[x,1.4,z],s.material('#dcd5ba'));
      else if(a.columnBands==='red')for(const y of[1.2,1.55])s.box([.22,.09,.22],[x,y,z],s.material('#a84335'));
      else for(let i=0;i<4;i++)s.box([.22,.075,.22],[x,1.2+i*.075,z],s.material(i%2?'#d3ad31':'#303832'));
    }
    if(a.disposal!=='none'){
      const x=-3.8,z=-4;
      if(a.disposal==='pair')for(const dz of[-.32,.32]){s.cylinder(.22,.19,.7,[x,.35,z+dz],s.material(dz<0?'#3b7962':'#46758f'),18);s.ring(.22,.02,[x,.7,z+dz],iron).rotation.x=Math.PI/2;}
      else if(a.disposal==='lidded'){s.box([.6,.8,.6],[x,.4,z],serviceMetal);s.box([.64,.04,.64],[x,.82,z],iron);s.box([.18,.04,.05],[x,.86,z],serviceMetal);}
      else{for(const y of[.03,.35,.68])s.ring(.25,.014,[x,y,z],iron).rotation.x=Math.PI/2;for(let i=0;i<12;i++){const t=i*Math.PI/6;s.rod([x+Math.sin(t)*.25,.03,z+Math.cos(t)*.25],[x+Math.sin(t)*.25,.68,z+Math.cos(t)*.25],.008,iron);}s.cylinder(.25,.25,.02,[x,.01,z],iron,16);}
    }
    if(a.waterStation!=='none'){
      const x=-3.9,z=-10;
      if(a.waterStation==='taps'){s.box([.5,.38,1.5],[x,.19,z],s.material('#b1aa96'));s.box([.35,.02,1.35],[x,.39,z],serviceMetal);for(const dz of[-.5,0,.5]){s.rod([x-.18,.38,z+dz],[x-.18,.9,z+dz],.025,serviceMetal);s.tube([[x-.18,.9,z+dz],[x+.05,.9,z+dz],[x+.05,.82,z+dz]],.018,serviceMetal);}}
      else if(a.waterStation==='cooler'){s.box([.6,1.2,.7],[x,.6,z],serviceMetal);s.box([.18,.08,.06],[x+.33,.9,z],iron);s.box([.3,.04,.5],[x+.43,.7,z],serviceMetal);for(const dz of[-.2,.2])strut([x+.29,.45,z+dz],[x+.55,.68,z+dz],.02);}
      else{s.box([.52,.55,.52],[x,.275,z],s.material('#aa9e83'));s.lathe([[.12,0],[.25,.1],[.28,.32],[.16,.5],[.1,.54]],s.material('#ac7752'),[x,.55,z]);s.cylinder(.13,.13,.025,[x,1.1025,z],s.material('#8f6749'),16);}
    }
    if(a.serviceCabinet!=='none'){
      const x=-3.8,z=-16,h=a.serviceCabinet==='tools'?.6:1.65,w=a.serviceCabinet==='tools'?1.2:.8,mat=a.serviceCabinet==='hose'?s.material('#a64739'):serviceMetal;
      s.box([.55,h,w],[x,h/2,z],mat);s.box([.012,h-.1,w-.08],[x+.282,h/2,z],iron);
      if(a.serviceCabinet==='hose'){const ring=s.ring(.35,.05,[x+.3,.9,z],mat);ring.rotation.y=Math.PI/2;s.rod([x+.32,.9,z-.3],[x+.32,.9,z+.3],.025,serviceMetal);}
      else{s.box([.025,.13,.04],[x+.3,h*.55,z+w*.3],serviceMetal);if(a.serviceCabinet==='electrical')for(let i=0;i<6;i++)s.box([.02,.015,.55],[x+.3,.28+i*.045,z],serviceMetal);}
    }
    if(a.edgeMarkers!=='plain'){
      if(a.edgeMarkers==='studs'){const studs:{at:V3;size:number}[]=[];for(let i=0;i<120;i++)for(const x of[XE-.15,XE-.25])studs.push({at:[x,.007,roofEnd+i*(roofStart-roofEnd)/119],size:1});s.scatter(new THREE.SphereGeometry(.018,6,4).scale(1,.4,1),s.material('#d0c7aa'),studs);}
      else if(a.edgeMarkers==='slabs')for(let i=0;i<40;i++){const z=roofEnd+(i+.5)*(roofStart-roofEnd)/40;s.box([.32,.008,.92],[XE-.2,.004,z],s.material(i%2?'#c2bba4':'#aba58f'));}
      else for(let i=0;i<6;i++){const plate=s.label(String(i+1),.4,.3,[XE-.25,.008,roofStart-3-i*6],'#242b27','#ddd4b3');plate.rotation.x=-Math.PI/2;}
    }

    // ---- commit the ironwork ----------------------------------------------
    {
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), iron, struts.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), from = new THREE.Vector3(), to = new THREE.Vector3(), dir = new THREE.Vector3();
      struts.forEach((st, i) => {
        from.set(...st.a); to.set(...st.b); dir.subVectors(to, from);
        const length = Math.max(dir.length(), 0.001);
        q.setFromUnitVectors(up, dir.normalize());
        mesh.setMatrixAt(i, m.compose(from.add(to).multiplyScalar(0.5), q, new THREE.Vector3(st.t, length, st.w ?? st.t)));
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      s.scatter(new THREE.SphereGeometry(0.014, 5, 3), iron, rivets).castShadow = false;
    }

    // ---- rain --------------------------------------------------------------
    const streaks = { drizzle: 380, steady: 900, cloudburst: 1700, stopped: 0 }[a.rain];
    const drips = raining ? 220 : 70;
    const seeds: { x: number; z: number; phase: number; top: number; fallTo: number; len: number; speed: number }[] = [];
    for (let i = 0; i < streaks; i++) {
      const region = random();
      if (region < 0.72) seeds.push({ x: rnd(XE + 0.1, 15), z: rnd(13, -55), phase: random(), top: 11, fallTo: PIT, len: rnd(0.5, 1.5), speed: rnd(0.85, 1.15) });
      else if (region < 0.86 || a.side !== 'railing') seeds.push({ x: rnd(X0, XE), z: rnd(roofEnd - 0.3, -55), phase: random(), top: 11, fallTo: 0, len: rnd(0.5, 1.5), speed: rnd(0.85, 1.15) });
      else seeds.push({ x: rnd(-16, X0 - 0.2), z: rnd(13, -50), phase: random(), top: 11, fallTo: PIT, len: rnd(0.5, 1.5), speed: rnd(0.85, 1.15) });
    }
    // Water off the eave, and through any missing sheet.
    for (let i = 0; i < drips; i++) seeds.push({ x: XE - 0.05 + rnd(-0.04, 0.04), z: rnd(roofStart, roofEnd), phase: random(), top: eave - 0.3, fallTo: 0, len: rnd(0.12, raining ? 0.7 : 0.2), speed: rnd(1.6, 2.2) });
    for (const hole of holes) for (let i = 0; i < (raining ? 60 : 8); i++) seeds.push({ x: hole.x + rnd(-1.6, 1.6), z: hole.z + rnd(-2.6, 2.6), phase: random(), top: 5, fallTo: 0, len: rnd(0.3, 0.9), speed: rnd(1.2, 1.6) });
    const rainMaterial = new THREE.MeshBasicMaterial({ color: '#f4f8fa', transparent: true, opacity: a.rain === 'cloudburst' ? 0.5 : 0.42, depthWrite: false });
    const rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 1, 0.022), rainMaterial, Math.max(1, seeds.length));
    rain.frustumCulled = false; rain.castShadow = false;
    root.add(rain);
    const slant = mix(0.04, 0.22, mood.energy);
    const rainMatrix = new THREE.Matrix4();
    const fallRain = (time: number) => {
      const speed = mix(0.7, 1.5, mood.energy);
      seeds.forEach((d, i) => {
        const u = (d.phase + time * speed * d.speed) % 1, y = d.top - u * (d.top - d.fallTo);
        rainMatrix.makeShear(0, 0, slant, 0, 0, 0).scale(new THREE.Vector3(1, d.len, 1)).setPosition(d.x + (d.top - y) * slant * 0.2, y, d.z);
        rain.setMatrixAt(i, rainMatrix);
      });
      rain.instanceMatrix.needsUpdate = true;
    };
    fallRain(rnd(0, 20));
    // Veils of falling water: the far side of the tracks goes pale, then white.
    const veil = (x0: number, x1: number, z: number, opacity: number) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 46), new THREE.MeshBasicMaterial({ color: background, transparent: true, opacity, depthWrite: false }));
      plane.position.set((x0 + x1) / 2, PIT + 23, z); plane.renderOrder = 2;
      root.add(plane);
    };
    const density = { drizzle: 0.1, steady: 0.17, cloudburst: 0.3, stopped: 0.05 }[a.rain];
    for (const z of [-4, -16, -28]) veil(XE + 0.3, 70, z, density);
    for (const z of [-36, -50, -66]) veil(-80, 80, z, density * 1.25);
    if (a.side === 'railing') for (const z of [-4, -16, -28]) veil(-70, X0 - 0.3, z, density);
    rain.renderOrder = 3;

    // ---- trolleys for small things, the camera, placement ------------------
    const stands = SLOTS.map(() => {
      const group = new THREE.Group();
      const deckMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 1.0), benchWood); deckMesh.position.y = 0.52;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.9), iron); frame.position.y = 0.46;
      group.add(deckMesh, frame);
      for (const d of [-1, 1]) for (const e of [-1, 1]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 14), iron); wheel.rotation.x = Math.PI / 2; wheel.position.set(d * 0.5, 0.2, e * 0.46); group.add(wheel); }
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.9), iron); handle.position.set(-0.76, 0.9, 0); handle.rotation.z = 0.25; handle.scale.z = 0.06; group.add(handle);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), iron); bar.position.set(-0.87, 1.33, 0); group.add(bar);
      group.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
      group.visible = false; root.add(group);
      return group;
    });

    const camera = new THREE.PerspectiveCamera(50, 1, 0.3, 320);
    camera.position.set(-0.3, 2.7, 13.6);
    camera.lookAt(0.9, 1.75, -12);

    const place = (items: readonly Placeable[]) => {
      for (const stand of stands) stand.visible = false;
      let trackFree = true, slotIndex = 0;
      for (const item of items) {
        const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
        if (radius > 3.2 && trackFree) {
          // Rolling stock and other giants go on the near track, side-on to the platform.
          trackFree = false;
          const scale = Math.min(1, 7.5 / radius, 5.6 / height);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(tracks[0], PIT, -5.5 - radius * scale * 0.55);
          item.holder.rotation.y = -Math.PI / 2;
          item.holder.updateMatrixWorld(true);
          continue;
        }
        const index = slotIndex++ % SLOTS.length, slot = SLOTS[index];
        const fit = Math.min(slot.h / height, slot.r / radius);
        // True size when it fits; shrunk to the slot when it does not; small things grow a little.
        const scale = Math.min(fit, Math.max(1, Math.min((item.hero ? 1.15 : 0.85) / height, 3.2)));
        let y = 0;
        if (height * scale < 0.85 && radius * scale < 0.62) { stands[index].visible = true; stands[index].position.set(slot.x, 0, slot.z); stands[index].rotation.y = slot.x > 0 ? 0.3 : -0.25; y = 0.555; }
        item.holder.scale.setScalar(scale);
        item.holder.position.set(slot.x, y, slot.z);
        item.holder.rotation.y = (slot.x + 0.3) * -0.1 + (context.random() - 0.5) * 0.3;
        item.holder.updateMatrixWorld(true);
      }
      camera.updateMatrixWorld(true);
    };

    const flickery = mood.wear > 0.5 ? tubes[Math.floor(random() * tubes.length)] : null;
    const flickerMaterial = flickery ? tube.clone() : null;
    if (flickery && flickerMaterial) flickery.material = flickerMaterial;
    const spin = mix(1.5, 16, mood.energy), sway = mix(0.004, 0.05, mood.energy);
    return {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key, place,
      update(dt, time) {
        for (const fan of fans) fan.rotation.y += dt * spin;
        swingers.forEach((group, i) => { group.rotation.z = Math.sin(time * 1.3 + i * 1.7) * sway; });
        fallRain(time);
        if (flickerMaterial) flickerMaterial.emissiveIntensity = Math.sin(time * 37) * Math.sin(time * 5.3) > 0.4 ? sky.tubes * 0.15 : sky.tubes;
        for (const lamp of lamps) lamp.emissiveIntensity = 2.6 + Math.sin(time * 9) * 0.4;
      },
      dispose() { key.shadow.map?.dispose(); for (const t of textures) t.dispose(); flickerMaterial?.dispose(); disposeTree(root); },
    };
  },
});
