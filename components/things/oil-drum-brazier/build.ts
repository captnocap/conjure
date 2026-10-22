import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { type Block, blocks, canvasTexture, figure, snowOf } from './rail';

const DRUMS = {
  rust: 'Bare rust, burnt through so many times no paint is left.',
  blue: 'Faded blue with a white stencilled band.',
  red: 'Oxide red with a fuel company roundel scorched half away.',
  yellow: 'Chemical yellow with a black hazard diamond.',
  green: 'Army green with stencilled numbers.',
  black: 'Tar black, sooted to the rim.',
} as const;
const DRUM_HEX: Record<keyof typeof DRUMS, string> = { rust: '#7a4a30', blue: '#3c6c9c', red: '#a63a2a', yellow: '#d2a422', green: '#55653f', black: '#2a2826' };

export default defineThing({
  questions: {
    gathering: choice('Who has gathered at it?', {
      gang: 'A track gang on their break: hi-vis and hard hats, shovels leaned against a crate.',
      drifters: 'Drifters: hunched figures in old coats, a bindle and a guitar case.',
      pickets: 'Strikers on a picket: placards leaned by the fire.',
      watchman: 'One night watchman alone with a lantern and a newspaper.',
      nobody: 'Nobody now: crates knocked over, a glove left behind.',
    }),
    fire: score('What state is the fire in?', ['Cold grey ash', 'Sullen embers', 'A steady working fire', 'Roaring, sparks flying']),
    burning: choice('What is on or in the fire?', {
      scrap: 'Scrap timber and broken pallets sticking out of the top.',
      sleepers: 'Sawn lengths of creosoted sleeper, giving off thick dark smoke.',
      kettle: 'A blackened kettle on a grate across the rim.',
      stew: 'A big can of mulligan stew hung over it from a bent rod.',
      sausages: 'Sausages cooking on a shovel blade.',
      papers: 'Papers and photographs: somebody is burning what they do not want found.',
      chair: 'A broken chair, legs up, the last furniture.',
    }),
    drum: choice('What is the drum like?', DRUMS),
    holes: choice('How was it punched?', {
      random: 'Ragged pick-axe holes all over, wherever the blows fell.',
      rows: 'Neat rows of drilled air holes.',
      slots: 'Tall chiselled slots round the bottom third.',
      face: 'Somebody cut it a face: two eyes and a jagged grin.',
      stars: 'Cut-out stars and a moon, done with care.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const snow = snowOf(s);
    const fire = a.fire;
    const R = 0.29, H = 0.88;
    const heat = new THREE.Color().setHSL(mix(0.02, 0.1, fire), 1, mix(0.3, 0.6, fire));

    // Drum wall: one canvas gives the paint, the soot and, as an emissive map, the glow through the holes.
    const W = 1024, CH = 512;
    const holes: { x: number; y: number; draw: (ctx: CanvasRenderingContext2D) => void }[] = [];
    const star = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = (i / 10) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } ctx.closePath(); ctx.fill(); };
    if (a.holes === 'random') for (let i = 0; i < 46; i++) { const x = random() * W, y = mix(0.2, 0.92, random()) * CH, r = mix(9, 24, random()), k = random() * 3; holes.push({ x, y, draw: (ctx) => { ctx.beginPath(); ctx.ellipse(x, y, r, r * mix(0.5, 1, k / 3), k, 0, 7); ctx.fill(); } }); }
    else if (a.holes === 'rows') for (let row = 0; row < 4; row++) for (let i = 0; i < 18; i++) { const x = ((i + (row % 2) * 0.5) / 18) * W, y = (0.38 + row * 0.15) * CH; holes.push({ x, y, draw: (ctx) => { ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); } }); }
    else if (a.holes === 'slots') for (let i = 0; i < 16; i++) { const x = ((i + 0.5) / 16) * W, y = 0.75 * CH; holes.push({ x, y, draw: (ctx) => ctx.fillRect(x - 11, CH * 0.58, 22, CH * 0.33) }); }
    else if (a.holes === 'face') {
      for (const centre of [W * 0.75, W * 0.25]) holes.push({ x: centre, y: CH * 0.5, draw: (ctx) => {
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(centre + side * 34, CH * 0.3); ctx.lineTo(centre + side * 100, CH * 0.36); ctx.lineTo(centre + side * 56, CH * 0.5); ctx.closePath(); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(centre - 118, CH * 0.62);
        for (let i = 0; i <= 8; i++) ctx.lineTo(centre - 118 + i * 29.5, CH * (i % 2 ? 0.7 : 0.62));
        for (let i = 8; i >= 0; i--) ctx.lineTo(centre - 118 + i * 29.5, CH * (i % 2 ? 0.86 : 0.77) - Math.abs(i - 4) * 9);
        ctx.closePath(); ctx.fill();
      } });
      for (let i = 0; i < 10; i++) { const x = ((i + 0.5) / 10) * W, y = CH * 0.94; holes.push({ x, y, draw: (ctx) => { ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); } }); }
    } else {
      for (let i = 0; i < 15; i++) { const x = ((i + random() * 0.6) / 15) * W, y = mix(0.25, 0.9, random()) * CH, r = mix(20, 40, random()); holes.push({ x, y, draw: (ctx) => star(ctx, x, y, r) }); }
      for (const centre of [W * 0.75, W * 0.25]) holes.push({ x: centre, y: CH * 0.42, draw: (ctx) => { ctx.beginPath(); ctx.arc(centre, CH * 0.42, 64, 0.6, Math.PI * 2 - 0.6); ctx.arc(centre + 34, CH * 0.42, 50, Math.PI * 2 - 1.0, 1.0, true); ctx.fill(); } });
    }
    const paintHex = `#${new THREE.Color(DRUM_HEX[a.drum]).lerp(new THREE.Color('#6e4630'), mood.wear * 0.55).getHexString()}`;
    const skin = canvasTexture(W, CH, (ctx, w, h) => {
      ctx.fillStyle = paintHex; ctx.fillRect(0, 0, w, h);
      if (a.drum === 'blue' || a.drum === 'green') { ctx.fillStyle = a.drum === 'blue' ? '#e4e1d6' : '#d8d3b4'; if (a.drum === 'blue') ctx.fillRect(0, h * 0.12, w, h * 0.1); ctx.font = `bold ${h * 0.12}px monospace`; for (const x of [w * 0.6, w * 0.1]) ctx.fillText(a.drum === 'blue' ? 'LUBE OIL' : 'POL 55 GAL', x, h * (a.drum === 'blue' ? 0.36 : 0.2)); }
      if (a.drum === 'red') for (const x of [w * 0.75, w * 0.25]) { ctx.fillStyle = '#e8d9a8'; ctx.beginPath(); ctx.arc(x, h * 0.3, 60, 0, 7); ctx.fill(); ctx.fillStyle = '#a63a2a'; ctx.beginPath(); ctx.arc(x, h * 0.3, 40, 0, 7); ctx.fill(); }
      if (a.drum === 'yellow') for (const x of [w * 0.75, w * 0.25]) { ctx.fillStyle = '#19191b'; ctx.save(); ctx.translate(x, h * 0.28); ctx.rotate(Math.PI / 4); ctx.fillRect(-52, -52, 104, 104); ctx.fillStyle = '#d2a422'; ctx.fillRect(-38, -38, 76, 76); ctx.restore(); }
      // Soot rising from every hole and down from the rim, rust blooms.
      const soot = ctx.createLinearGradient(0, 0, 0, h * 0.4);
      soot.addColorStop(0, `rgba(18,16,15,${0.55 + fire * 0.35})`); soot.addColorStop(1, 'rgba(18,16,15,0)');
      ctx.fillStyle = soot; ctx.fillRect(0, 0, w, h * 0.4);
      for (let i = 0; i < 30 + mood.wear * 90; i++) { ctx.fillStyle = `rgba(${90 + random() * 40},${50 + random() * 20},28,${0.15 + random() * 0.4})`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 8 + random() * 44, 6 + random() * 26, 0, 0, 7); ctx.fill(); }
      for (const hole of holes) { const g = ctx.createRadialGradient(hole.x, hole.y - 26, 4, hole.x, hole.y - 26, 70); g.addColorStop(0, 'rgba(14,12,11,0.75)'); g.addColorStop(1, 'rgba(14,12,11,0)'); ctx.fillStyle = g; ctx.fillRect(hole.x - 70, hole.y - 100, 140, 150); }
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 9;
      for (const y of [h * 0.33, h * 0.66]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      ctx.fillStyle = fire > 0.12 ? '#1a0d08' : '#0e0d0c';
      for (const hole of holes) hole.draw(ctx);
      if (snow > 0.4 && fire < 0.3) { ctx.fillStyle = 'rgba(240,244,246,0.7)'; ctx.fillRect(0, 0, w, 14); }
    });
    const glowMap = canvasTexture(W, CH, (ctx, w, h) => {
      ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, w, h);
      if (fire <= 0.12) return;
      const g = ctx.createLinearGradient(0, h * 0.15, 0, h);
      g.addColorStop(0, '#ff7a1a'); g.addColorStop(0.6, '#ffb030'); g.addColorStop(1, '#fff0a0');
      ctx.fillStyle = g;
      for (const hole of holes) hole.draw(ctx);
    });
    const wall = new THREE.MeshStandardMaterial({ map: skin, emissiveMap: glowMap, emissive: '#ffffff', emissiveIntensity: mix(0, 2.6, clamp01((fire - 0.12) / 0.6)), roughness: 0.85, metalness: 0.25, side: THREE.DoubleSide });
    const drum = new THREE.Group();
    s.root.add(drum);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 36, 1, true), wall);
    shell.position.y = H / 2 + 0.04;
    shell.rotation.y = -Math.PI / 2;
    shell.castShadow = shell.receiveShadow = true;
    drum.add(shell);
    const iron = s.material('#2a2725', { roughness: 0.8, metalness: 0.3 });
    for (const y of [0.05, H * 0.36, H * 0.69, H + 0.03]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(R + 0.006, 0.014, 6, 36), iron); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; drum.add(hoop); }
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 24), iron);
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; drum.add(floor);
    // The bed of the fire, just below the rim: ash, then coals.
    const bedMaterial = new THREE.MeshStandardMaterial({ color: fire > 0.12 ? '#3a1408' : '#8f8d88', emissive: heat, emissiveIntensity: mix(0, 2.2, clamp01((fire - 0.1) / 0.5)), roughness: 1 });
    const bed = new THREE.Mesh(new THREE.CircleGeometry(R - 0.01, 24), bedMaterial);
    bed.rotation.x = -Math.PI / 2; bed.position.y = H - 0.14; drum.add(bed);
    for (const [x, z] of [[-0.2, 0.2], [0.2, 0.2], [0, -0.26]]) s.box([0.2, 0.07, 0.1], [x, 0.02, z], s.material('#8a4a36')).rotation.y = random() * 2;
    drum.rotation.y = (random() - 0.5) * 0.5;
    drum.rotation.z = (random() - 0.5) * mood.wear * 0.12;

    // Fuel and cooking.
    const char = s.material('#2b211b', { roughness: 1 });
    const plank = s.material('#8a6a48', { roughness: 0.95 });
    const top = H + 0.04;
    const sticks = (count: number, material: THREE.Material, thick: number) => { for (let i = 0; i < count; i++) { const t = random() * Math.PI * 2, r = random() * 0.2, len = mix(0.35, 0.75, random()); const from: [number, number, number] = [Math.cos(t) * r, top - 0.3, Math.sin(t) * r]; const to: [number, number, number] = [Math.cos(t) * (r + len * 0.4), top - 0.3 + len, Math.sin(t) * (r + len * 0.4)]; const stick = s.rod(from, to, thick, material); stick.scale.x = 1.8; } };
    if (a.burning === 'scrap') { sticks(5, plank, 0.022); sticks(2, char, 0.02); }
    else if (a.burning === 'sleepers') { for (let i = 0; i < 3; i++) { const t = i * 2.1 + random(); s.box([0.13, 0.75, 0.2], [Math.cos(t) * 0.1, top + 0.1, Math.sin(t) * 0.1], s.material('#2c2019', { roughness: 1 })).rotation.set((random() - 0.5) * 0.5, t, 0.25); } }
    else if (a.burning === 'kettle') {
      for (const z of [-0.12, 0, 0.12]) s.rod([-R - 0.05, top + 0.03, z], [R + 0.05, top + 0.03, z], 0.01, iron);
      const black = s.material('#1c1b1a', { roughness: 0.6, metalness: 0.4 });
      s.lathe([[0.01, 0], [0.15, 0.01], [0.17, 0.1], [0.14, 0.2], [0.07, 0.23], [0.02, 0.26]], black, [0, top + 0.04, 0]);
      s.rod([0.12, top + 0.14, 0], [0.3, top + 0.24, 0], 0.025, black, 0.014);
      s.ring(0.11, 0.012, [0, top + 0.27, 0], black, Math.PI);
      sticks(2, plank, 0.02);
    } else if (a.burning === 'stew') {
      s.rod([-R - 0.25, 0, 0.05], [-R - 0.05, top + 0.75, 0], 0.014, iron);
      s.rod([-R - 0.05, top + 0.75, 0], [0, top + 0.7, 0], 0.014, iron);
      s.rod([0, top + 0.7, 0], [0, top + 0.42, 0], 0.006, iron);
      s.cylinder(0.15, 0.14, 0.3, [0, top + 0.26, 0], s.material('#8c8f8c', { metalness: 0.6, roughness: 0.4 }), 16);
      s.cylinder(0.135, 0.135, 0.02, [0, top + 0.4, 0], s.material('#7a4a22'), 16);
      sticks(2, plank, 0.02);
    } else if (a.burning === 'sausages') {
      s.rod([0.1, top + 0.08, 0], [1.25, top + 0.2, 0.3], 0.02, plank);
      const blade = s.box([0.3, 0.02, 0.26], [-0.02, top + 0.07, -0.03], iron); blade.rotation.y = -0.25;
      for (let i = 0; i < 4; i++) { const sausage = s.mesh(new THREE.CapsuleGeometry(0.022, 0.13, 3, 8), s.material('#8c4a2c', { roughness: 0.5 }), [-0.1 + i * 0.06, top + 0.105, -0.03]); sausage.rotation.set(Math.PI / 2, 0, 0.2); }
      sticks(2, plank, 0.02);
    } else if (a.burning === 'papers') {
      const sheet = new THREE.MeshStandardMaterial({ color: '#efe9d8', roughness: 0.9, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) { const up = i < 4; const page = s.mesh(new THREE.PlaneGeometry(0.21, 0.3), i % 3 === 2 ? char : sheet, up ? [(random() - 0.5) * 0.3, top + mix(0.0, 0.2, random()), (random() - 0.5) * 0.3] : [mix(0.45, 0.9, random()) * (random() < 0.5 ? -1 : 1), 0.02 + i * 0.004, mix(-0.4, 0.8, random())]); page.rotation.set(up ? random() * 1.2 : -Math.PI / 2, random() * 3, random()); }
      s.box([0.34, 0.22, 0.26], [0.72, 0.11, 0.42], s.material('#a58a5c')).rotation.y = 0.5;
    } else {
      const leg = s.material('#6a4a30');
      for (const [x, z] of [[-0.14, -0.12], [0.14, -0.12], [-0.14, 0.14], [0.14, 0.14]]) s.rod([x, top - 0.1, z], [x * 1.5, top + 0.5, z * 1.5 + 0.05], 0.022, leg);
      s.box([0.38, 0.03, 0.36], [0, top + 0.02, 0.02], leg).rotation.x = 0.2;
      s.box([0.36, 0.3, 0.03], [0, top + 0.02, -0.26], leg).rotation.x = -0.5;
    }

    // Flames, sparks and smoke.
    const flameMaterial = new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 2.4, roughness: 1 });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#fff0a8', emissive: '#ffd24a', emissiveIntensity: 2.6, roughness: 1 });
    const flames: { mesh: THREE.Mesh; height: number; phase: number }[] = [];
    if (fire > 0.4) {
      const n = Math.round(mix(3, 9, (fire - 0.4) / 0.6));
      for (let i = 0; i < n; i++) {
        const t = random() * Math.PI * 2, r = random() * 0.17, height = mix(0.2, 0.42, random()) * mix(0.7, 2.3, (fire - 0.4) / 0.6);
        const geometry = new THREE.ConeGeometry(mix(0.07, 0.12, random()), 1, 7);
        geometry.translate(0, 0.5, 0);
        const mesh = s.mesh(geometry, i % 3 === 0 ? coreMaterial : flameMaterial, [Math.cos(t) * r, top - 0.12, Math.sin(t) * r]);
        mesh.scale.y = height;
        mesh.castShadow = false;
        flames.push({ mesh, height, phase: random() * 6 });
      }
    }
    const sparks: Block[] = [];
    if (fire > 0.3) for (let i = 0; i < Math.round(fire * fire * 30); i++) { const t = random() * Math.PI * 2, r = random() * 0.45; sparks.push({ size: [0.02, 0.02, 0.02], at: [Math.cos(t) * r, top + mix(0.2, 1.9, random()) * fire, Math.sin(t) * r] }); }
    const sparkMesh = blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ff9a2a', emissiveIntensity: 3 }), sparks);
    if (sparkMesh) sparkMesh.castShadow = false;
    const smoky = a.burning === 'sleepers' ? 1 : fire < 0.12 ? 0 : fire < 0.45 ? 0.7 : 0.3;
    const puffs: THREE.Mesh[] = [];
    if (smoky > 0) {
      const smoke = new THREE.MeshStandardMaterial({ color: a.burning === 'sleepers' ? '#34302d' : '#8b8a88', transparent: true, opacity: 0.07 + smoky * 0.15, depthWrite: false, roughness: 1 });
      for (let i = 0; i < 5; i++) { const puff = s.ball([0.12 + i * 0.05, 0.12 + i * 0.045, 0.12 + i * 0.05], [i * 0.07 * (mood.energy + 0.3), top + 0.45 + i * 0.24, i * 0.03], smoke, 10); puff.castShadow = false; puffs.push(puff); }
    }

    // Ground: scorch ring and ash, melted snow.
    const scorch = s.cylinder(0.75, 0.8, 0.012, [0, 0.006, 0], s.material(snow > 0.3 ? '#56504a' : '#3a3632', { roughness: 1 }), 24);
    scorch.receiveShadow = true;
    const ash: Block[] = Array.from({ length: 22 }, () => { const t = random() * Math.PI * 2, r = mix(0.32, 0.75, random()); return { size: [mix(0.03, 0.09, random()), 0.02, mix(0.03, 0.08, random())] as const, at: [Math.cos(t) * r, 0.02, Math.sin(t) * r] as const, rot: [0, random() * 3, 0] as const, color: random() < 0.4 ? '#c9c7c2' : '#262220' }; });
    blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), ash);

    // Seats: slatted crates upturned in a ring.
    const crateWood = new THREE.Color('#a8875a').lerp(new THREE.Color('#77705f'), mood.wear * 0.6);
    const seatCount = a.gathering === 'watchman' ? 1 : a.gathering === 'nobody' ? 3 : 2 + Math.round(mood.density * 3);
    const seats: { x: number; z: number; yaw: number; fallen: boolean }[] = [];
    const slats: Block[] = [];
    const startAngle = 0.5 + random() * 0.4;
    for (let i = 0; i < seatCount; i++) {
      const angle = startAngle + (i / Math.max(seatCount, 3)) * Math.PI * 2 * (seatCount > 3 ? 1 : 0.8) + (random() - 0.5) * 0.25;
      const d = mix(1.0, 1.25, random());
      const fallen = a.gathering === 'nobody' && i > 0;
      const seat = { x: Math.sin(angle) * d, z: Math.cos(angle) * d, yaw: angle + (random() - 0.5) * 0.5, fallen };
      seats.push(seat);
      const crate = new THREE.Group();
      crate.position.set(seat.x, fallen ? 0.19 : 0, seat.z);
      crate.rotation.set(fallen ? Math.PI / 2 + 0.2 : 0, seat.yaw, 0);
      crate.updateMatrix();
      const put = (size: readonly [number, number, number], at: readonly [number, number, number]) => {
        const p = new THREE.Vector3(...at).applyMatrix4(crate.matrix);
        slats.push({ size, at: [p.x, p.y, p.z], rot: [crate.rotation.x, crate.rotation.y, 0], color: crateWood.clone().offsetHSL(0, 0, (random() - 0.5) * 0.08) });
      };
      const tall = i % 2 ? 0.42 : 0.34;
      for (let k = 0; k < 4; k++) put([0.5, 0.02, 0.085], [0, tall, -0.15 + k * 0.1]);
      for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { put([0.5, 0.09, 0.02], [0, 0.07 + k * (tall - 0.1) / 2, side * 0.19]); put([0.02, 0.09, 0.36], [side * 0.24, 0.07 + k * (tall - 0.1) / 2, 0]); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) put([0.035, tall, 0.035], [sx * 0.225, tall / 2, sz * 0.165]);
    }
    blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 }), slats);

    // The company, or what they left.
    const upright = seats.filter((seat) => !seat.fallen);
    const sit = (index: number, options: Omit<Parameters<typeof figure>[1], 'at' | 'yaw' | 'pose'>) => {
      const seat = upright[index];
      if (!seat) return;
      const face = Math.atan2(-seat.x, -seat.z);
      figure(s, { ...options, at: [seat.x + Math.sin(face) * 0.05, (index % 2 ? 0.42 : 0.34) + 0.03, seat.z + Math.cos(face) * 0.05], yaw: face, pose: 'sit' });
    };
    const beside = (index: number, out: number, across: number): [number, number] => { const seat = seats[index % seats.length]; const t = Math.atan2(seat.x, seat.z); return [seat.x + Math.sin(t) * out + Math.cos(t) * across, seat.z + Math.cos(t) * out - Math.sin(t) * across]; };
    if (a.gathering === 'gang') {
      const people = Math.max(1, Math.min(upright.length - 1, 1 + Math.round(mood.density * 2)));
      for (let i = 0; i < people; i++) sit(i, { coat: i % 2 ? '#e8791c' : '#d6d22a', trousers: '#2c3340', hat: 'hardhat', hatColour: i % 2 ? '#f2f0e8' : '#e8c21c' });
      const [x, z] = beside(seats.length - 1, 0.25, 0.1);
      s.rod([x, 0, z + 0.3], [x - 0.1, 1.35, z - 0.1], 0.02, plank);
      s.box([0.24, 0.3, 0.02], [x + 0.02, 0.14, z + 0.33], iron).rotation.x = 0.25;
      s.rod([x + 0.3, 0, z + 0.25], [x + 0.2, 1.2, z - 0.1], 0.02, plank);
      s.box([0.5, 0.05, 0.05], [x + 0.3, 0.05, z + 0.26], iron);
      const last = seats[seats.length - 1];
      if (people < upright.length) { s.cylinder(0.045, 0.045, 0.26, [last.x, 0.56, last.z], s.material('#3d6b4f'), 10); s.ball([0.13, 0.08, 0.13], [last.x + 0.15, 0.48, last.z + 0.05], s.material('#e8c21c'), 12); }
    } else if (a.gathering === 'drifters') {
      const people = Math.max(1, Math.min(upright.length, 1 + Math.round(mood.density * 2)));
      const coats = ['#4c5340', '#5a4636', '#3f4652', '#6a5a4a'];
      for (let i = 0; i < people; i++) sit(i, { coat: coats[i % 4], trousers: '#39362f', hat: i % 2 ? 'brim' : 'beanie', hatColour: i % 2 ? '#3a332c' : '#7c2f2a' });
      const [x, z] = beside(0, 0.45, 0.45);
      s.rod([x, 0.03, z], [x + 0.9, 0.2, z + 0.5], 0.015, plank);
      s.ball([0.17, 0.15, 0.17], [x + 0.9, 0.2, z + 0.5], s.material('#a23a2e'), 10);
      const [gx, gz] = beside(seats.length - 1, 0.5, -0.3);
      const guitar = s.box([0.36, 0.1, 1.0], [gx, 0.06, gz], s.material('#1f1c1a')); guitar.rotation.y = random() * 3;
      for (let i = 0; i < 3; i++) s.cylinder(0.037, 0.037, 0.1, [mix(-0.6, 0.6, random()), 0.05, mix(0.5, 0.75, random()) * (random() < 0.5 ? -1 : 1)], s.material('#a9aeb0', { metalness: 0.7, roughness: 0.3 }), 10);
    } else if (a.gathering === 'pickets') {
      const people = Math.max(1, Math.min(upright.length - 1, 1 + Math.round(mood.density * 2)));
      for (let i = 0; i < people; i++) sit(i, { coat: ['#34495e', '#6a3a34', '#3f5a48'][i % 3], hat: 'cap', hatColour: '#2b2b2b' });
      const texts = ['ON STRIKE', 'FAIR PAY', 'NO CUTS', 'UNITED'];
      for (let i = 0; i < 2; i++) {
        const [x, z] = beside(seats.length - 1 - i, 0.3, i ? -0.2 : 0.2);
        s.rod([x, 0, z + 0.2], [x, 1.7, z - 0.15], 0.02, plank);
        const board = s.label(texts[Math.floor(random() * texts.length)], 0.8, 0.5, [x, 1.5, z - 0.08], i ? '#f1eee4' : '#c22c22', i ? '#c22c22' : '#f1eee4');
        board.rotation.set(-0.2, Math.atan2(x, z) + (random() - 0.5) * 0.4, (random() - 0.5) * 0.2);
      }
    } else if (a.gathering === 'watchman') {
      sit(0, { coat: '#2e3a4e', trousers: '#262a30', hat: 'cap', hatColour: '#1f2530' });
      const [x, z] = beside(0, 0.1, 0.6);
      s.cylinder(0.07, 0.08, 0.2, [x, 0.14, z], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb53a', emissiveIntensity: 1.6 }), 10);
      s.cylinder(0.09, 0.09, 0.04, [x, 0.02, z], iron, 10); s.mesh(new THREE.ConeGeometry(0.1, 0.08, 10), iron, [x, 0.28, z]); s.ring(0.07, 0.008, [x, 0.36, z], iron);
      const [nx, nz] = beside(0, 0.15, -0.6);
      s.box([0.4, 0.015, 0.3], [nx, 0.01, nz], s.material('#dcd8cb')).rotation.y = 0.6;
    } else {
      const [x, z] = beside(0, 0.0, 0.0);
      s.box([0.2, 0.05, 0.12], [x, 0.38, z], s.material('#b38a3c')).rotation.y = 0.8;
      s.cylinder(0.04, 0.04, 0.2, [0.9, 0.04, -0.6], s.material('#3f6a45', { roughness: 0.3 }), 8).rotation.z = Math.PI / 2;
    }
    if (snow > 0.4 && fire < 0.4) for (const seat of upright) s.box([0.5, 0.04, 0.4], [seat.x, 0.46, seat.z], new THREE.MeshStandardMaterial({ color: '#f3f6f8' })).rotation.y = seat.yaw;

    const speed = mix(4, 16, mood.energy);
    const baseGlow = wall.emissiveIntensity, baseBed = bedMaterial.emissiveIntensity;
    return s.finish({
      footprint: 1.6,
      update: (_dt, time) => {
        const flick = 0.85 + Math.sin(time * speed) * 0.1 + Math.sin(time * speed * 2.3 + 1) * 0.06;
        wall.emissiveIntensity = baseGlow * flick;
        bedMaterial.emissiveIntensity = baseBed * flick;
        for (const flame of flames) { flame.mesh.scale.y = flame.height * (0.75 + Math.sin(time * speed * 0.8 + flame.phase) * 0.25); flame.mesh.rotation.z = Math.sin(time * speed * 0.5 + flame.phase) * 0.12; }
        puffs.forEach((puff, i) => { puff.position.x = (i * 0.07 + Math.sin(time * 0.6 + i) * 0.04) * (mood.energy + 0.3); });
      },
    });
  },
});
