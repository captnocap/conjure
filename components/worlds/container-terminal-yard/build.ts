import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';
import { halo, lamp, paint, shade, skin, weather, write } from './paint';

type P3 = [number, number, number];
const X0 = -21.5, X1 = 30, D = 44, GW = X1 - X0, GC = (X0 + X1) / 2;
const LAMPS = { sodium: '#ff9d3c', led: '#eef4ff', mercury: '#b4f0e0', mixed: '#ffb060' } as const;
const SKIES = { haze: '#a48a78', blue: '#6d82a2', mauve: '#8c7d96', fog: '#a3abae', petrol: '#567078', dawn: '#b79a8c' } as const;
const BOXES: Record<string, string[]> = {
  mixed: ['#8e3b2a', '#1f4f86', '#1f6b4a', '#e0661c', '#7d8587', '#c8257a', '#d9b320', '#8e3b2a', '#2a8a9a', '#ecece6'],
  oxide: ['#8e3b2a', '#7a3a2c', '#9a4a30', '#6e3626', '#8a5a3a', '#a04a2a'],
  blue: ['#1f4f86', '#24598f', '#1a4478', '#2a62a0', '#7d8587', '#1f4f86'],
  reefer: ['#ecece6', '#e4e6e0', '#f0eee6', '#d9dcd8', '#ecece6', '#1f4f86'],
  candy: ['#e58aa8', '#8ec3de', '#f0d27a', '#9ad2a8', '#c9a2e0', '#f0a070'],
};
// Where the cast stands: x, z, tallest it may be shown, widest radius.
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [4, 3, 15, 8], [19.5, -3, 11, 6], [-3, -4, 11, 6], [21, 13, 7, 5], [-7, 15, 7, 5], [8, 18.5, 5, 4],
];
// The least height each slot shows its occupant at, so a small hero is still the subject.
const LEAST = [12, 7.5, 7.5, 5.5, 5.5, 4];

export default defineWorld({
  questions: {
    sky: choice('What is the sky doing?', {
      haze: 'Orange-brown light pollution on low cloud.',
      blue: 'Blue hour, the last cold daylight.',
      mauve: 'A bruised mauve dusk.',
      fog: 'Pale sea fog that the floodlights turn into milk.',
      petrol: 'Deep petrol-green evening over the water.',
      dawn: 'Pinkish first light at the end of the night shift.',
    }),
    lamps: choice('What colour are the floodlights?', {
      sodium: 'Old orange sodium: everything amber.',
      led: 'New hard white LED.',
      mercury: 'Greenish mercury vapour.',
      mixed: 'Orange and white together, a yard half way through a refit.',
    }),
    ship: choice('What is at the quay?', {
      black: 'A black-hulled container ship, red below the waterline, towering over the quay.',
      blue: 'A blue-hulled ship with white lettering.',
      green: 'A green-hulled ship stacked with boxes.',
      rusty: 'A tired grey feeder ship bleeding rust down its flank.',
      empty: 'Nothing: an empty berth, black water, fenders and bollards waiting.',
    }),
    crane: choice('What stands over the quay edge?', {
      working: 'A ship-to-shore gantry crane, boom down over the ship, a box in the air.',
      raised: 'A gantry crane parked with its boom raised to the sky.',
      none: 'No crane, only the lighting masts.',
    }),
    boxes: choice('What are the stacks made of?', {
      mixed: 'Every shipping line and colour jumbled together.',
      oxide: 'Rust red and brown leasing boxes, all alike.',
      blue: 'Almost all one blue line.',
      reefer: 'White refrigerated boxes, a humming cold wall.',
      candy: 'Faded pastel boxes, pink, sky and lemon.',
    }),
    height: score('How high are the stacks behind?', ['Two high, you can see over them', 'Three high', 'Five high', 'A cliff seven boxes high']),
    ground: choice('What state is the asphalt in?', {
      wet: 'Wet after rain, lights smeared across it in long reflections.',
      puddles: 'Standing puddles in every dip.',
      dry: 'Dry, dusty and tyre-marked.',
      drizzle: 'Wet, with fine rain still falling through the lamp beams.',
    }),
    tonight: choice('What is happening in the yard tonight?', {
      deserted: 'Nothing. Not a soul, just a traffic cone and blowing litter.',
      working: 'Full swing: terminal tractors hauling boxes along the back lane.',
      stoppage: 'A stoppage: dockers round an oil-drum fire with placards.',
      inspection: 'An inspection: one box on the apron with its doors open under work lights and tape.',
    }),
    view: choice('Where is the camera?', {
      survey: 'A calm three-quarter view from above, like a model.',
      low: 'Lower and closer to the ground, the stacks looming.',
      high: 'High up, almost a plan of the lanes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { root } = s;
    const { mood, random } = context;
    const dusk = Math.min(1, Math.abs(mood.daylight - 0.5) * 2);
    const lampColour = new THREE.Color(LAMPS[a.lamps]);
    const lampAt = (i: number) => (a.lamps === 'mixed' ? new THREE.Color(i % 2 ? '#eef4ff' : '#ff9d3c') : lampColour);
    const sky = new THREE.Color(SKIES[a.sky]).multiplyScalar(mix(1.12, 0.86, dusk));
    const wet = a.ground !== 'dry';
    const steel = s.material('#7f888c', { metalness: 0.5, roughness: 0.5 });
    const dark = s.material('#26292c');

    // Light: a warm key from the floodlights, a cool fill from the sky.
    root.add(new THREE.HemisphereLight(new THREE.Color('#cfd8f0').lerp(sky, 0.4), '#6a5c52', mix(1.3, 0.95, dusk)));
    const key = new THREE.DirectionalLight(new THREE.Color('#ffffff').lerp(lampColour, 0.55).lerp(new THREE.Color('#ffb070'), mood.warmth * 0.3), 2.3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.06;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight(new THREE.Color('#bcd0ff').lerp(sky, 0.3), 0.75);
    fill.position.set(30, 18, 30);
    root.add(fill);

    const masts: P3[] = [[10, 24, -14.7], [-14, 22, -19.5], [28.6, 23, -14.7]];
    const haze = a.sky === 'fog' ? 0.32 : a.ground === 'drizzle' ? 0.12 : 0;
    const craneOn = a.crane !== 'none';

    // The asphalt, painted: lanes, ground slots, puddles, light pools.
    const CW = 2048, CH = Math.round(2048 * D / GW);
    const gx = (x: number) => ((x - X0) / GW) * CW, gz = (z: number) => ((z + D / 2) / D) * CH, k = CW / GW;
    const asphalt = wet ? '#565b62' : '#70706c';
    const groundTex = paint(CW, CH, (ctx, w, h) => {
      ctx.fillStyle = asphalt; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5000; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'; ctx.fillRect(random() * w, random() * h, 2 + random() * 7, 2 + random() * 4); }
      for (let i = 0; i < 14; i++) { ctx.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.08})`; ctx.fillRect(random() * w, random() * h, 60 + random() * 260, 40 + random() * 160); }
      // Tyre tracks sweeping along the lanes.
      ctx.strokeStyle = 'rgba(20,20,22,0.16)'; ctx.lineWidth = 0.5 * k;
      for (let i = 0; i < 16; i++) { const z = [-12, 1, 13][i % 3] + (random() - 0.5) * 4; ctx.beginPath(); ctx.moveTo(gx(-10), gz(z)); ctx.bezierCurveTo(gx(5), gz(z + (random() - 0.5) * 5), gx(18), gz(z + (random() - 0.5) * 5), gx(30), gz(z + (random() - 0.5) * 3)); ctx.stroke(); }
      const yellow = `rgba(236,190,40,${mix(0.95, 0.55, mood.wear)})`, white = `rgba(240,238,228,${mix(0.95, 0.5, mood.wear)})`;
      // Ground slots in rows, each with a stencilled address.
      ctx.lineWidth = 0.16 * k; ctx.strokeStyle = yellow;
      const rows = [-7.2, -4.6, 6.6, 9.2, 18.4, 21.0];
      rows.forEach((z, r) => { for (let c = 0; c < 3; c++) { const x = -5.5 + c * 12.6; ctx.strokeRect(gx(x), gz(z - 1.22), 12.2 * k, 2.44 * k); write(ctx, `${'ABCDEF'[r]}${String(c * 2 + 11)}`, gx(x + 1.6), gz(z), 1.1 * k, yellow, 'bold SIZEpx monospace'); } });
      // Lane centre dashes and arrows.
      ctx.fillStyle = white;
      for (const z of [1, 13.8, -12]) for (let x = -7; x < 30; x += 3.2) ctx.fillRect(gx(x), gz(z) - 0.07 * k, 1.6 * k, 0.14 * k);
      for (const [x, z, dir] of [[14, 1, 1], [-2, 13.8, -1], [24, 13.8, -1]] as const) { ctx.beginPath(); ctx.moveTo(gx(x + dir * 2.2), gz(z)); ctx.lineTo(gx(x), gz(z - 1)); ctx.lineTo(gx(x), gz(z - 0.35)); ctx.lineTo(gx(x - dir * 2.4), gz(z - 0.35)); ctx.lineTo(gx(x - dir * 2.4), gz(z + 0.35)); ctx.lineTo(gx(x), gz(z + 0.35)); ctx.lineTo(gx(x), gz(z + 1)); ctx.fill(); }
      // Quay apron: hatched edge, crane rails, berth number, a zebra crossing.
      ctx.save(); ctx.beginPath(); ctx.rect(gx(X0), 0, 1.6 * k, h); ctx.clip(); ctx.fillStyle = yellow; ctx.fillRect(gx(X0), 0, 1.6 * k, h); ctx.strokeStyle = 'rgba(20,20,20,0.9)'; ctx.lineWidth = 0.45 * k; for (let z = -26; z < 26; z += 1.6) { ctx.beginPath(); ctx.moveTo(gx(X0), gz(z)); ctx.lineTo(gx(X0 + 1.6), gz(z + 1.6)); ctx.stroke(); } ctx.restore();
      for (const x of [-19.3, -10.3]) { ctx.fillStyle = 'rgba(30,32,34,0.9)'; ctx.fillRect(gx(x) - 0.22 * k, 0, 0.44 * k, h); ctx.fillStyle = 'rgba(190,196,200,0.8)'; ctx.fillRect(gx(x) - 0.05 * k, 0, 0.1 * k, h); }
      ctx.save(); ctx.translate(gx(-14.8), gz(15)); ctx.rotate(-Math.PI / 2); write(ctx, `BERTH ${1 + Math.floor(random() * 9)}`, 0, 0, 2.6 * k, white, 'bold SIZEpx sans-serif'); ctx.restore();
      ctx.fillStyle = white; for (let i = 0; i < 7; i++) ctx.fillRect(gx(-8.6), gz(-2.6 + i * 1.0), 2.6 * k, 0.5 * k);
      ctx.strokeStyle = yellow; ctx.lineWidth = 0.14 * k; ctx.strokeRect(gx(-8.2), gz(-20.5), 37.6 * k, 5.6 * k);
      // Puddles.
      if (wet) {
        const count = a.ground === 'puddles' ? 26 : 9;
        for (let i = 0; i < count; i++) {
          const x = gx(-20 + random() * 49), y = gz(-14 + random() * 35), r = (0.8 + random() * (a.ground === 'puddles' ? 3 : 1.6)) * k;
          ctx.beginPath(); for (let j = 0; j <= 10; j++) { const t = (j / 10) * 6.283, rr = r * (0.6 + random() * 0.5); ctx.lineTo(x + Math.cos(t) * rr * 1.5, y + Math.sin(t) * rr * 0.8); } ctx.closePath();
          ctx.fillStyle = 'rgba(28,32,40,0.45)'; ctx.fill();
          ctx.strokeStyle = `rgba(${Math.round(sky.r * 255)},${Math.round(sky.g * 255)},${Math.round(sky.b * 255)},0.5)`; ctx.lineWidth = 0.08 * k; ctx.stroke();
        }
      }
      // Pools of floodlight, and their long reflections on the wet.
      ctx.globalCompositeOperation = 'lighter';
      const pools: [number, number, number, THREE.Color][] = masts.map((m, i) => [m[0], m[2] + 6, 17, lampAt(i)] as [number, number, number, THREE.Color]);
      pools.push([6, 12, 20, lampAt(1)], [22, 4, 15, lampAt(0)]);
      if (craneOn) pools.push([-15, -3, 13, new THREE.Color('#fff2d8')]);
      for (const [x, z, r, c] of pools) {
        const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
        const g = ctx.createRadialGradient(gx(x), gz(z), 0, gx(x), gz(z), r * k);
        g.addColorStop(0, `rgba(${rgb},${mix(0.3, 0.52, dusk)})`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(gx(x - r), gz(z - r), 2 * r * k, 2 * r * k);
        if (wet) for (let j = 0; j < 46; j++) { const zz = z + 1 + j * 0.55; ctx.fillStyle = `rgba(${rgb},${(0.22 - j * 0.004) * (0.4 + random() * 0.6)})`; ctx.fillRect(gx(x - 0.7 - random() * 0.9 + j * 0.02), gz(zz), (1.4 + random() * 1.6) * k, 0.26 * k); }
      }
      ctx.globalCompositeOperation = 'source-over';
    });
    const ground = s.mesh(new THREE.PlaneGeometry(GW, D), new THREE.MeshStandardMaterial({ map: groundTex, roughness: wet ? 0.38 : 0.92, metalness: wet ? 0.18 : 0 }), [GC, 0, 0]);
    ground.rotation.x = -Math.PI / 2;
    ground.castShadow = false;
    s.box([GW, 2.6, D], [GC, -1.31, 0], s.material('#5a5650', { roughness: 1 })).castShadow = false;
    // Harbour water beside the quay.
    const water = s.mesh(new THREE.PlaneGeometry(13, D + 8), new THREE.MeshStandardMaterial({ color: new THREE.Color('#27343c').lerp(sky, 0.25), roughness: 0.2, metalness: 0.4 }), [X0 - 6.5, -1.7, 0]);
    water.rotation.x = -Math.PI / 2; water.castShadow = false;

    // Quay furniture: fenders, bollards, coping.
    const fenders = Array.from({ length: 9 }, (_u, i) => ({ at: [X0 - 0.25, -0.75, -20 + i * 5] as P3, size: 1 }));
    s.scatter(new THREE.TorusGeometry(0.55, 0.22, 6, 14).rotateY(Math.PI / 2), s.material('#17181a', { roughness: 1 }), fenders);
    const bollards = [-19, -9, 1, 11, 20].map((z) => ({ at: [X0 + 0.8, 0.35, z] as P3, size: 1 }));
    s.scatter(new THREE.CylinderGeometry(0.32, 0.26, 0.7, 10), s.material('#e0ae1c'), bollards);
    s.scatter(new THREE.SphereGeometry(0.4, 10, 6).scale(1, 0.4, 1).translate(0, 0.38, 0), s.material('#1d1f22'), bollards);

    // Struts in one draw call: square box sections.
    const struts = (list: [P3, P3, number][], material: THREE.Material) => {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.707, 0.707, 1, 4).rotateY(Math.PI / 4), material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach(([from, to, size], i) => { const p = new THREE.Vector3(...from), d = new THREE.Vector3(...to).sub(p), len = d.length(); q.setFromUnitVectors(up, d.normalize()); m.compose(p.addScaledVector(d, len / 2), q, new THREE.Vector3(size, len, size)); mesh.setMatrixAt(i, m); });
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    // Containers: one instanced mesh for every stack in sight.
    const ribs = paint(512, 128, (ctx, w, h) => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { ctx.fillStyle = '#c4c4c4'; ctx.fillRect(i * 12.8, 0, 3.6, h); ctx.fillStyle = '#ececec'; ctx.fillRect(i * 12.8 + 6.4, 0, 2.6, h); } weather(ctx, w, h, random, mood.wear * 0.8, '#6a5040'); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, h - 5, w, 5); ctx.fillRect(0, 0, w, 3); });
    const doors = paint(128, 128, (ctx, w, h) => { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, w - 6, h - 6); ctx.beginPath(); ctx.moveTo(w / 2, 3); ctx.lineTo(w / 2, h - 3); ctx.stroke(); ctx.strokeStyle = '#b8b8b8'; ctx.lineWidth = 3; for (const x of [0.2, 0.38, 0.62, 0.8]) { ctx.beginPath(); ctx.moveTo(w * x, 6); ctx.lineTo(w * x, h - 6); ctx.stroke(); } });
    const sideMat = skin(ribs, { roughness: 0.7 }), endMat = skin(doors, { roughness: 0.7 }), topMat = new THREE.MeshStandardMaterial({ color: '#b8b8b8', roughness: 0.85 });
    const palette = BOXES[a.boxes];
    const stacked: { at: P3; turn: number; colour: string }[] = [];
    const tint = () => new THREE.Color(palette[Math.floor(random() * palette.length)]).lerp(new THREE.Color('#6a6058'), mood.wear * 0.3 * random()).lerp(sky, haze).getStyle();
    const BH = 2.59, baseTiers = Math.round(mix(2, 7, a.height));
    const labels: P3[] = [];
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const tiers = Math.max(1, baseTiers + (row === 0 ? 0 : -1) + Math.round((random() - 0.5) * 2.2) - (mood.density < 0.25 && random() < 0.5 ? 1 : 0));
      const x = -1.5 + col * 12.6, z = row === 0 ? -19.4 : -16.8;
      for (let t = 0; t < tiers; t++) stacked.push({ at: [x + (random() - 0.5) * 0.14, BH / 2 + t * BH, z + (random() - 0.5) * 0.06], turn: 0, colour: tint() });
      if (row === 1 && tiers > 0) labels.push([x, BH * (tiers - 0.5), z + 1.24]);
    }
    // A short stack out on the right, end-on, to break the wall.
    for (let t = 0; t < Math.min(3, Math.max(1, baseTiers - 2)); t++) stacked.push({ at: [27.6, BH / 2 + t * BH, -6.5 + (random() - 0.5) * 0.1], turn: Math.PI / 2, colour: tint() });

    // The ship: a flank of plating running off both ends of the frame, boxes on deck.
    const HX = X0 - 2.6, HT = 13;
    if (a.ship !== 'empty') {
      const hull = new THREE.Color({ black: '#23272c', blue: '#1f4a82', green: '#22604a', rusty: '#6d7477' }[a.ship]).lerp(sky, haze).getStyle();
      const shipName = ['TRITON PROGRESS', 'NORDHAV ODIN', 'CAP ESPERANZA', 'OCEAN TALLY', 'EVERJADE DAWN', 'HANSA SUD BREMEN'][Math.floor(random() * 6)];
      const hullTex = paint(2048, 512, (ctx, w, h) => {
        ctx.fillStyle = hull; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8a2c23'; ctx.fillRect(0, h * 0.84, w, h * 0.16);
        ctx.fillStyle = shade(hull, 0.5); ctx.fillRect(0, h * 0.835, w, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
        for (let x = 0; x < w; x += 120) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 84) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        write(ctx, shipName, w * 0.62, h * 0.3, h * 0.2, '#f1efe6', 'bold SIZEpx sans-serif', w * 0.4);
        for (let i = 0; i < 6; i++) write(ctx, `${16 - i * 2}`, w * 0.16, h * (0.3 + i * 0.09), 30, '#f1efe6', 'bold SIZEpx sans-serif');
        for (let i = 0; i < 7; i++) { ctx.fillStyle = '#101214'; ctx.fillRect(w * (0.06 + i * 0.14), h * 0.1, 26, 14); }
        weather(ctx, w, h, random, (a.ship === 'rusty' ? 0.75 : 0.3) + mood.wear * 0.3, '#8a4a22');
      });
      const plate = s.material(shade(hull, -0.2));
      s.mesh(new THREE.BoxGeometry(10, HT + 3, 56), [skin(hullTex, { roughness: 0.6 }), plate, s.material('#7a3a2c'), plate, plate, plate] as unknown as THREE.Material, [HX - 5, (HT - 3) / 2, 0]);
      s.box([0.2, 1.1, 56], [HX - 0.1, HT + 0.55, 0], plate);
      // Deck cargo along the rail.
      for (let bay = 0; bay < 3; bay++) { const tiers = 1 + Math.floor(random() * 3) + (mood.density > 0.5 ? 1 : 0); for (let t = 0; t < tiers; t++) for (const dx of [0, -2.6]) stacked.push({ at: [HX - 1.6 + dx, HT + BH / 2 + t * BH, -6 + bay * 12.6 + (random() - 0.5) * 0.1], turn: Math.PI / 2, colour: tint() }); }
      // Accommodation block and funnel at the stern, windows lit.
      const win = paint(256, 256, (ctx, w, h) => { ctx.fillStyle = '#e9e6dc'; ctx.fillRect(0, 0, w, h); for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { ctx.fillStyle = random() < mix(0.25, 0.7, mood.density) ? '#ffd98a' : '#27323c'; ctx.fillRect(18 + c * 33, 20 + r * 48, 20, 15); } weather(ctx, w, h, random, mood.wear * 0.6); });
      const winGlow = paint(256, 256, (ctx, w, h) => { ctx.drawImage(win.image as HTMLCanvasElement, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#404040'; ctx.fillRect(0, 0, w, h); });
      const block = new THREE.MeshStandardMaterial({ map: win, emissiveMap: winGlow, emissive: '#ffffff', emissiveIntensity: mix(0.5, 1.2, dusk), roughness: 0.7 });
      s.box([8, 12, 8], [HX - 4.2, HT + 6, -21], block);
      s.box([11, 1.4, 4], [HX - 4.2, HT + 12.7, -20], s.material('#e9e6dc'));
      s.cylinder(1.5, 1.8, 5, [HX - 5.5, HT + 14.5, -24], s.material(a.ship === 'rusty' ? '#3a4046' : '#b3282a'), 12);
      // Mooring lines down to the quay, with rat guards.
      const rope = s.material('#d8cfb4', { roughness: 1 });
      for (const [z0, z1] of [[14, 20], [-10, -19], [3, 1]] as const) { s.tube([[HX, HT - 2.5, z0], [(HX + X0) / 2 + 0.6, 4, (z0 + z1) / 2], [X0 + 0.8, 0.55, z1]], 0.09, rope); const guard = s.cylinder(0.5, 0.5, 0.04, [HX + 0.9, HT - 4.6, z0 + (z1 - z0) * 0.22], steel, 12); guard.rotation.z = Math.PI / 2 - 0.9; }
      // Gangway.
      struts([[[HX + 0.2, HT, 9], [X0 + 2.5, 0.2, 9], 0.16], [[HX + 0.2, HT, 10.1], [X0 + 2.5, 0.2, 10.1], 0.16], [[HX + 0.2, HT + 1, 9], [X0 + 2.5, 1.2, 9], 0.07], [[HX + 0.2, HT + 1, 10.1], [X0 + 2.5, 1.2, 10.1], 0.07]], s.material('#c9cdd0', { metalness: 0.4 }));
      s.box([0.2, 0.2, 0.2], [HX + 0.3, HT + 1.3, 9.5], lamp('#fff2c8', mix(1, 2.4, dusk)));
    } else {
      // Empty berth: only a lonely navigation light out on a dolphin.
      s.cylinder(0.5, 0.6, 5, [X0 - 8, 0.4, -6], s.material('#4a4038'), 10);
      s.ball([0.3, 0.3, 0.3], [X0 - 8, 3.2, -6], lamp('#3cf07a', 2.4), 10);
      s.ball([1.4, 1.4, 1.4], [X0 - 8, 3.2, -6], halo('#3cf07a', 0.22), 10).castShadow = false;
    }
    const boxMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(12.19, BH, 2.44), [endMat, endMat, topMat, topMat, sideMat, sideMat], stacked.length);
    const m4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0);
    stacked.forEach((item, i) => { m4.compose(new THREE.Vector3(...item.at), quat.setFromAxisAngle(yAxis, item.turn), new THREE.Vector3(1, 1, 1)); boxMesh.setMatrixAt(i, m4); boxMesh.setColorAt(i, new THREE.Color(item.colour)); });
    boxMesh.instanceColor!.needsUpdate = true;
    boxMesh.castShadow = boxMesh.receiveShadow = true;
    root.add(boxMesh);
    const names = ['TRITON', 'NORDHAV', 'EVERJADE', 'HANSA SUD', 'ONE WAY', 'KESTREL'];
    labels.forEach((at) => {
      const tex = paint(512, 96, (ctx, w, h) => { ctx.clearRect(0, 0, w, h); write(ctx, names[Math.floor(random() * names.length)], w / 2, h / 2 + 4, 74, 'rgba(244,242,232,0.95)', 'bold SIZEpx sans-serif', w * 0.94); });
      s.mesh(new THREE.PlaneGeometry(6.4, 1.2), new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, roughness: 0.7 }), at).castShadow = false;
    });

    // The gantry crane over the quay.
    const trolley = new THREE.Group();
    if (craneOn) {
      const paintC = ['#2a5c9c', '#c22a22', '#e0ae1c', '#3f7a56', '#e5681d'][Math.floor(random() * 5)];
      const cm = s.material(paintC, { metalness: 0.2 });
      const xs = [-19.3, -10.3], zs = [-10, 3], PH = 20, BY = 23.5;
      const list: [P3, P3, number][] = [];
      for (const x of xs) { for (const z of zs) list.push([[x, 0.6, z], [x, PH + 4, z], 1.0]); list.push([[x, 1, zs[0]], [x, 1, zs[1]], 1.1], [[x, PH, zs[0]], [x, PH, zs[1]], 0.9], [[x, 1.5, zs[0]], [x, PH * 0.55, (zs[0] + zs[1]) / 2], 0.45], [[x, 1.5, zs[1]], [x, PH * 0.55, (zs[0] + zs[1]) / 2], 0.45]); }
      for (const z of zs) list.push([[xs[0], PH, z], [xs[1], PH, z], 0.9], [[xs[0], PH * 0.5, z], [xs[1], PH, z], 0.4]);
      const zb = [-5.6, -1.4];
      for (const z of zb) list.push([[xs[0] - 1, BY, z], [-1, BY, z], 0.9]);
      list.push([[-1, BY, zb[0]], [-1, BY, zb[1]], 0.6], [[xs[0], PH + 4, zs[0]], [xs[0], PH + 4, zs[1]], 0.7], [[xs[1], PH + 4, zs[0]], [xs[1], PH + 4, zs[1]], 0.7]);
      const apex: P3 = [-15.5, 33, -3.5];
      for (const z of zs) list.push([[xs[0], PH + 4, z], apex, 0.5], [[xs[1], PH + 4, z], apex, 0.5]);
      list.push([apex, [-1.5, BY + 0.4, -3.5], 0.22]);
      struts(list, cm);
      // The boom, hinged at the waterside leg.
      const boom = new THREE.Group();
      boom.position.set(xs[0] - 1, BY, -3.5);
      const boomLen = 19;
      for (const z of [-2.1, 2.1]) { const girder = new THREE.Mesh(new THREE.BoxGeometry(boomLen, 0.9, 0.9), cm); girder.position.set(-boomLen / 2, 0, z); girder.castShadow = true; boom.add(girder); }
      for (let i = 0; i < 5; i++) { const tie = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 4.2), cm); tie.position.set(-2 - i * 4.1, 0, 0); boom.add(tie); }
      boom.rotation.z = a.crane === 'raised' ? -1.25 : 0;
      root.add(boom);
      const tip = new THREE.Vector3(-boomLen * 0.8, 0.5, 0).applyEuler(boom.rotation).add(boom.position);
      struts([[apex, tip.toArray() as P3, 0.2], [apex, [boom.position.x - Math.cos(boom.rotation.z) * 6, BY + 0.4 + Math.sin(-boom.rotation.z) * 6, -3.5], 0.2]], cm);
      s.box([5.5, 3.2, 4.4], [-5, BY + 2.1, -3.5], s.material('#e9e6dc'));
      s.box([0.3, 0.5, 0.5], [apex[0], apex[1] + 0.5, apex[2]], lamp('#ff2318', 2.4));
      // Trolley, cab and the box on the wire.
      const working = a.crane === 'working';
      const tx = working ? (a.ship === 'empty' ? -16 : HX - 1.6) : -8;
      trolley.position.set(tx, BY - 0.7, -3.5);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P3) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = true; trolley.add(mesh); return mesh; };
      add(new THREE.BoxGeometry(3, 0.6, 4.6), dark, [0, 0, 0]);
      add(new THREE.BoxGeometry(1.8, 1.8, 1.6), s.material('#e9e6dc'), [1.6, -1.3, 2.2]);
      add(new THREE.BoxGeometry(0.05, 1.0, 1.3), lamp('#ffe2a0', mix(0.8, 1.8, dusk)), [2.52, -1.2, 2.2]);
      if (working) {
        const drop = a.ship === 'empty' ? 14 : 3.2 + random() * 2.5;
        for (const x of [-1, 1]) for (const z of [-0.9, 0.9]) add(new THREE.CylinderGeometry(0.04, 0.04, drop, 5), dark, [x, -drop / 2, z]).castShadow = false;
        add(new THREE.BoxGeometry(2.6, 0.4, 12.2), s.material('#e0ae1c'), [0, -drop, 0]);
        const c = new THREE.MeshStandardMaterial({ color: tint(), map: ribs, roughness: 0.7 });
        add(new THREE.BoxGeometry(2.44, BH, 12.19), [c, c, topMat, topMat, endMat, endMat], [0, -drop - 0.2 - BH / 2, 0]);
      }
      root.add(trolley);
      for (const x of [-18, -12]) for (const z of [-9, 2]) s.box([0.5, 0.25, 0.5], [x, PH - 0.6, z], lamp('#fff2d8', mix(1.1, 2.4, dusk)));
      const cone = s.mesh(new THREE.ConeGeometry(9, PH, 20, 1, true), halo('#fff2d8', mix(0.04, 0.1, dusk)), [-15, PH / 2, -3.5]);
      cone.castShadow = false;
    }

    // Lighting masts with glowing heads.
    const heads: { at: P3; size: number }[][] = [[], []];
    masts.forEach((mast, i) => {
      const [x, h, z] = mast;
      s.cylinder(0.2, 0.4, h, [x, h / 2, z], steel, 10);
      s.box([1.2, 0.5, 1.2], [x, 0.25, z], s.material('#e0ae1c'));
      s.ring(1.5, 0.08, [x, h, z], steel).rotation.x = Math.PI / 2;
      const bucket = a.lamps === 'mixed' ? i % 2 : 0;
      for (let j = 0; j < 8; j++) { const t = j * 0.785; if (random() < mood.wear * 0.45) continue; heads[bucket].push({ at: [x + Math.cos(t) * 1.6, h - 0.25, z + Math.sin(t) * 1.6], size: 1 }); }
      const c = lampAt(i);
      s.ball([4.4, 2.6, 4.4], [x, h - 0.4, z], halo(c, mix(0.14, 0.3, dusk)), 14).castShadow = false;
      const cone = s.mesh(new THREE.ConeGeometry(11, h - 1, 24, 1, true), halo(c, mix(0.03, 0.08, dusk) * (a.sky === 'fog' || a.ground === 'drizzle' ? 1.8 : 1)), [x, (h - 1) / 2 + 0.3, z]);
      cone.castShadow = false;
    });
    heads.forEach((list, i) => { if (list.length) s.scatter(new THREE.SphereGeometry(0.42, 10, 8), lamp(a.lamps === 'mixed' ? (i ? '#eef4ff' : '#ff9d3c') : lampColour, mix(1.0, 1.9, dusk)), list).castShadow = false; });

    // What is happening tonight.
    const figure = (at: P3, coat: string, turn = 0) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, colour: string, y: number) => { const mesh = new THREE.Mesh(geometry, s.material(colour)); mesh.position.y = y; mesh.castShadow = true; g.add(mesh); };
      add(new THREE.CylinderGeometry(0.16, 0.13, 0.85, 8), '#262a30', 0.42);
      add(new THREE.CapsuleGeometry(0.21, 0.42, 4, 8), coat, 1.15);
      add(new THREE.SphereGeometry(0.13, 10, 8), '#c99a7a', 1.68);
      add(new THREE.SphereGeometry(0.145, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), random() < 0.5 ? '#f1f0ea' : '#f0c21c', 1.7);
      g.position.set(...at); g.rotation.y = turn; g.scale.setScalar(1.25);
      root.add(g);
    };
    const flames: THREE.Mesh[] = [];
    const tractors: THREE.Group[] = [];
    if (a.tonight === 'working') {
      for (let i = 0; i < 2; i++) {
        const g = new THREE.Group();
        const add = (geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], at: P3) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...at); mesh.castShadow = true; g.add(mesh); return mesh; };
        const cab = s.material(['#e9e6dc', '#e0ae1c', '#e5681d'][i % 3]);
        add(new THREE.BoxGeometry(2.2, 2.0, 2.4), cab, [8.2, 1.9, 0]);
        add(new THREE.BoxGeometry(0.05, 0.8, 2.0), new THREE.MeshStandardMaterial({ color: '#27323c', roughness: 0.2 }), [9.32, 2.3, 0]);
        add(new THREE.BoxGeometry(16.5, 0.35, 2.3), dark, [0.6, 1.0, 0]);
        const c = new THREE.MeshStandardMaterial({ color: tint(), map: ribs, roughness: 0.7 });
        add(new THREE.BoxGeometry(12.19, BH, 2.44), [endMat, endMat, topMat, topMat, c, c], [-0.6, 1.2 + BH / 2, 0]);
        for (const x of [-5.2, -3.9, 5.6, 8.4]) for (const z of [-1.05, 1.05]) { const tyre = add(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), s.material('#151517', { roughness: 1 }), [x, 0.55, z]); tyre.rotation.x = Math.PI / 2; }
        add(new THREE.BoxGeometry(0.06, 0.2, 0.4), lamp('#fff6d8', 2.2), [9.33, 1.3, 0.8]); add(new THREE.BoxGeometry(0.06, 0.2, 0.4), lamp('#fff6d8', 2.2), [9.33, 1.3, -0.8]);
        add(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 8), lamp('#ff9a1a', 2.4), [8.2, 3.0, 0.6]);
        g.position.set(-2 + i * 19, 0, -12.2);
        root.add(g);
        tractors.push(g);
      }
      figure([-16, 0, 7], '#f2e21c', 1.2);
    } else if (a.tonight === 'stoppage') {
      const bx = -16.5, bz = 8;
      s.cylinder(0.42, 0.42, 1.1, [bx, 0.55, bz], s.material('#4a3a30', { metalness: 0.4 }), 14);
      for (let i = 0; i < 5; i++) { const flame = s.mesh(new THREE.ConeGeometry(0.2 + random() * 0.14, 0.7 + random() * 0.6, 6), lamp(i % 2 ? '#ffb030' : '#ff6a1a', 2.4), [bx + (random() - 0.5) * 0.4, 1.4 + random() * 0.2, bz + (random() - 0.5) * 0.4]); flame.castShadow = false; flames.push(flame); }
      s.ball([3.2, 2.4, 3.2], [bx, 1.6, bz], halo('#ff8a2a', mix(0.2, 0.36, dusk)), 12).castShadow = false;
      const glow = s.cylinder(4.5, 4.5, 0.02, [bx, 0.015, bz], halo('#ff8a2a', mix(0.16, 0.34, dusk)), 24); glow.castShadow = false;
      const signs = ['ON STRIKE', 'FAIR PAY', 'NO BOXES TONIGHT', 'SOLIDARITY'];
      for (let i = 0; i < 4 + Math.round(mood.density * 3); i++) {
        const t = i * 1.05 + random() * 0.4, r = 1.9 + random() * 0.9, x = bx + Math.cos(t) * r, z = bz + Math.sin(t) * r;
        figure([x, 0, z], ['#f2e21c', '#ff7a1a', '#2a3340'][i % 3], Math.atan2(bx - x, bz - z));
        if (i % 2 === 0) { s.rod([x + 0.3, 0, z + 0.2], [x + 0.3, 3.2, z + 0.2], 0.04, s.material('#b98f55')); const board = s.label(signs[(i / 2) % signs.length], 1.9, 0.9, [x + 0.3, 3.3, z + 0.24], '#b3201c', '#f4f1e6'); board.rotation.y = 0.5; }
      }
    } else if (a.tonight === 'inspection') {
      const ix = -15, iz = 9;
      const c = new THREE.MeshStandardMaterial({ color: tint(), map: ribs, roughness: 0.7 });
      const open = new THREE.MeshStandardMaterial({ color: '#0e1114', roughness: 1 });
      const box = s.mesh(new THREE.BoxGeometry(2.44, BH, 6.06), [c, c, topMat, topMat, open, endMat] as unknown as THREE.Material, [ix, BH / 2, iz]);
      box.rotation.y = 0.12;
      for (const side of [-1, 1]) { const door = s.box([1.2, BH - 0.2, 0.06], [ix + side * 1.7 + 0.4, BH / 2, iz + 3.5], c); door.rotation.y = side * 1.0 + 0.12; }
      for (const dx of [-2.6, 2.4]) { s.rod([ix + dx, 0, iz + 6], [ix + dx, 2.2, iz + 6], 0.05, steel); s.box([0.7, 0.45, 0.14], [ix + dx, 2.3, iz + 6], lamp('#f4f8ff', mix(1.4, 2.6, dusk))).rotation.y = dx > 0 ? -0.5 : 0.5; }
      const beam = s.box([3.2, 2.4, 3.4], [ix + 0.2, 1.2, iz + 4.6], halo('#f4f8ff', mix(0.06, 0.16, dusk))); beam.castShadow = false;
      const tape = s.material('#f2e21c');
      const posts: P3[] = [[ix - 4, 0, iz + 8], [ix + 4, 0, iz + 8], [ix + 4.4, 0, iz - 4], [ix - 3.6, 0, iz - 4]];
      posts.forEach((p, i) => { const n = posts[(i + 1) % 4]; s.rod(p, [p[0], 1.1, p[2]], 0.05, dark); s.rod([p[0], 1.0, p[2]], [n[0], 1.0, n[2]], 0.035, tape); });
      figure([ix + 1.2, 0, iz + 5.2], '#2a3340', 2.8); figure([ix - 1.3, 0, iz + 6.3], '#f2e21c', 0.4);
      for (let i = 0; i < 3; i++) s.box([0.5, 0.4, 0.4], [ix - 0.5 + i * 0.7, 0.2, iz + 4.4 + (random() - 0.5)], s.material('#b98f55'));
    } else {
      s.cylinder(0.04, 0.24, 0.7, [-14, 0.36, 9], s.material('#f0641a'), 10);
      const litter = Array.from({ length: 10 + Math.round(mood.density * 20) }, () => ({ at: [-18 + random() * 46, 0.03, -12 + random() * 32] as P3, size: 0.6 + random(), color: random() < 0.7 ? '#e9e6dc' : '#d9b24a' }));
      s.scatter(new THREE.BoxGeometry(0.4, 0.02, 0.3), new THREE.MeshStandardMaterial({ roughness: 1 }), litter).castShadow = false;
    }

    // Weather in the air.
    const rain = new THREE.Group();
    if (a.ground === 'drizzle') {
      const drops = Array.from({ length: 420 }, () => ({ at: [X0 + random() * GW, random() * 22, -20 + random() * 42] as P3, size: 0.6 + random() * 0.8 }));
      const helper = new Sculpture(context);
      helper.scatter(new THREE.BoxGeometry(0.03, 0.9, 0.03), new THREE.MeshBasicMaterial({ color: '#f1f4f8', transparent: true, opacity: 0.4, depthWrite: false }), drops).castShadow = false;
      rain.add(helper.root); rain.rotation.z = 0.12; root.add(rain);
    }

    const staticBounds = new THREE.Box3(new THREE.Vector3(X0 - 3, -0.5, -D / 2), new THREE.Vector3(X1, 17, D / 2));
    const camera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 600);
    const yaw = THREE.MathUtils.degToRad(31), pitch = THREE.MathUtils.degToRad({ survey: 29, low: 19, high: 43 }[a.view]);
    const display = (metres: number) => 2.4 * Math.pow(Math.max(metres, 0.2), 0.6);

    const place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [staticBounds.clone()];
      items.forEach((item, index) => {
        const [x, z, maxHeight, maxRadius] = SLOTS[index % SLOTS.length];
        const shown = Math.min(maxHeight, Math.max(LEAST[index % SLOTS.length], display(item.height)));
        const scale = Math.min(shown / Math.max(item.height, 0.05), maxRadius / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, 0, z);
        item.holder.rotation.y = yaw * 0.6 + (context.random() - 0.5) * 0.4;
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        box.min.y = Math.max(box.min.y, 0);
        if (!box.isEmpty()) boxes.push(box);
      });
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      camera.position.copy(centre).addScaledVector(direction, 220);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
          corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
          seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
        }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.5;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();
      const span = bounds.getSize(new THREE.Vector3()).length();
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(-0.55 + (mood.daylight - 0.5) * 0.5, 1, 0.5).normalize().multiplyScalar(span * 1.4));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.62;
      shadow.right = shadow.top = span * 0.62;
      shadow.near = 0.1; shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    const speed = mix(0.4, 2.2, mood.energy);
    return {
      object: root,
      camera,
      background: sky,
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place,
      update(dt, time) {
        flames.forEach((flame, i) => { flame.scale.y = 0.8 + 0.4 * Math.sin(time * (7 + i * 1.7) + i); flame.rotation.y += dt * 3; });
        for (const g of tractors) { g.position.x += dt * speed * 1.5; if (g.position.x > 21) g.position.x = -4; }
        if (a.crane === 'working') trolley.position.x += Math.sin(time * 0.3 * speed) * dt * 0.6;
        if (a.ground === 'drizzle') { rain.position.y -= dt * 9; if (rain.position.y < -4) rain.position.y = 0; }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
