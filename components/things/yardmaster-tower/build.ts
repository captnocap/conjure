import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type Block, type P3, blocks, canvasTexture, figure, snowOf, weeds } from './rail';

const NAMES = { yard: 'YARD', hump: 'HUMP', east: 'EAST JCT', towerb: 'TOWER B', cabin7: 'CABIN 7', nord: 'NORD' } as const;

export default defineThing({
  questions: {
    construction: choice('How is it built?', {
      brick: 'A classic signal box: brick ground floor, timber glazed storey above, hipped slate roof with a finial.',
      stilts: 'A plank cabin perched on four braced timber legs under a tin roof.',
      steel: 'A modern cab on slim steel legs with a wide flat roof, floodlights and an aerial.',
      concrete: 'A brutalist concrete stem carrying a broad glass cab like a small control tower.',
    }),
    occupied: choice('Who is in it?', {
      shift: 'The yardmaster is on shift, standing at the lit window.',
      justleft: 'Somebody just stepped out: lights on, door open, a bicycle leaned at the foot of the stair.',
      automated: 'Nobody ever: it runs itself, cold screens glowing in an empty room.',
      abandoned: 'Abandoned: dark, panes boarded or broken, steps missing.',
    }),
    interior: choice('What can be seen through the windows?', {
      levers: 'A long frame of tall levers with red, blue, yellow and black handles.',
      panel: 'An illuminated track diagram on the back wall above a push-button console.',
      desk: 'A desk with a green-shaded lamp, a telephone and a wall clock.',
    }),
    pinned: choice('What is pinned in the window?', {
      nothing: 'Nothing.',
      calendar: 'A calendar from a locomotive works.',
      notice: 'A red union strike notice.',
      orders: 'A row of yellow train-order flimsies clipped along the glass.',
      drawing: 'A child’s crayon drawing of a train under a sun.',
      closed: 'A sheet reading CLOSED.',
      plant: 'A geranium in a pot on the sill.',
    }),
    stove: choice('Is there a stove?', {
      none: 'No chimney at all.',
      cold: 'A stovepipe or chimney, cold.',
      smoking: 'The chimney is smoking steadily.',
    }),
    name: choice('What does the nameboard say?', NAMES),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const K = a.construction;
    const { mood, random } = context;
    const snow = snowOf(s);
    const abandoned = a.occupied === 'abandoned';
    const lit = !abandoned;
    const dims = { brick: [4.8, 3.4, 3.2], stilts: [3.6, 3.0, 4.2], steel: [4.4, 3.6, 5.6], concrete: [5.2, 4.2, 6.8] }[K];
    const [cw, cd, H0] = dims;
    const ch = 2.5, sill = 0.95;
    const age = Math.min(1, mood.wear + (abandoned ? 0.35 : 0));

    const cladHex = { brick: '#7a8f86', stilts: '#8c6e4c', steel: '#c9cfd2', concrete: '#a9a8a1' }[K];
    const clad = new THREE.Color(cladHex).lerp(new THREE.Color('#7d776c'), age * 0.5);
    const trimColour = new THREE.Color(K === 'brick' ? '#ece7d8' : K === 'stilts' ? '#5a4634' : K === 'steel' ? '#3c5a70' : '#3a3d40');
    const glow = a.occupied === 'automated' ? '#bfe0ff' : '#ffd79a';
    const dark = s.material('#1c1d1f');
    const parts: Block[] = [];
    const strut = (from: P3, to: P3, thick: number, color: THREE.ColorRepresentation) => {
      const va = new THREE.Vector3(...from), vb = new THREE.Vector3(...to);
      const d = vb.clone().sub(va);
      const len = d.length();
      const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()));
      const mid = va.add(vb).multiplyScalar(0.5);
      parts.push({ size: [len, thick, thick], at: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z], color });
    };

    // ---- Base ----
    const brickTexture = (wide: number, tall: number) => canvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#b9ae9c'; ctx.fillRect(0, 0, w, h);
      const rows = Math.round(tall / 0.085 / 2.2), cols = Math.round(wide / 0.24 / 2.2);
      for (let r = 0; r < rows; r++) for (let c = -1; c < cols; c++) {
        const base = new THREE.Color('#8c4a36').offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.12).lerp(new THREE.Color('#4a3a34'), age * 0.4 * random());
        ctx.fillStyle = `#${base.getHexString()}`;
        ctx.fillRect((c + (r % 2) * 0.5) * (w / cols) + 2, r * (h / rows) + 2, w / cols - 4, h / rows - 4);
      }
      const soot = ctx.createLinearGradient(0, h * 0.6, 0, h); soot.addColorStop(0, 'rgba(30,26,24,0)'); soot.addColorStop(1, `rgba(30,26,24,${0.25 + age * 0.4})`);
      ctx.fillStyle = soot; ctx.fillRect(0, 0, w, h);
    });
    if (K === 'brick') {
      const brick = new THREE.MeshStandardMaterial({ map: brickTexture(cw, H0), roughness: 0.95 });
      s.box([cw - 0.3, H0, cd - 0.3], [0, H0 / 2, 0], brick);
      s.box([cw - 0.1, 0.3, cd - 0.1], [0, 0.15, 0], s.material('#6a6660'));
      for (const x of [-1.2, 0.6]) { s.box([0.9, 1.3, 0.08], [x, 1.7, cd / 2 - 0.13], dark); s.cylinder(0.45, 0.45, 0.08, [x, 2.35, cd / 2 - 0.13], dark, 16).rotation.x = Math.PI / 2; s.box([1.0, 0.08, 0.14], [x, 1.03, cd / 2 - 0.1], s.material('#d8d2c2')); }
      s.box([0.9, 2.0, 0.08], [-cw / 2 + 0.11, 1.0, 0.4], s.material('#3f5a4c')).rotation.y = Math.PI / 2;
    } else if (K === 'stilts' || K === 'steel') {
      const timber = K === 'stilts';
      const legColour = timber ? new THREE.Color('#4f3d2d') : new THREE.Color('#5d6a70').lerp(new THREE.Color('#70452c'), age * 0.5);
      const t = timber ? 0.24 : 0.16;
      const lx = cw / 2 - 0.35, lz = cd / 2 - 0.35;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { parts.push({ size: [t, H0, t], at: [sx * lx, H0 / 2, sz * lz], color: legColour }); parts.push({ size: [0.6, 0.25, 0.6], at: [sx * lx, 0.1, sz * lz], color: '#a5a39b' }); }
      const tiers = timber ? 1 : 2;
      for (let k = 0; k < tiers; k++) {
        const y0 = 0.4 + (k * (H0 - 0.6)) / tiers, y1 = 0.4 + ((k + 1) * (H0 - 0.6)) / tiers;
        for (const sz of [-1, 1]) { strut([-lx, y0, sz * lz], [lx, y1, sz * lz], timber ? 0.12 : 0.05, legColour); strut([lx, y0, sz * lz], [-lx, y1, sz * lz], timber ? 0.12 : 0.05, legColour); strut([-lx, y1, sz * lz], [lx, y1, sz * lz], timber ? 0.12 : 0.07, legColour); }
        for (const sx of [-1, 1]) { strut([sx * lx, y0, -lz], [sx * lx, y1, lz], timber ? 0.12 : 0.05, legColour); strut([sx * lx, y0, lz], [sx * lx, y1, -lz], timber ? 0.12 : 0.05, legColour); }
      }
      if (timber) { s.box([1.4, 0.8, 1.0], [-0.4, 0.4, -0.3], s.material('#3a332c')); s.ball([0.6, 0.25, 0.4], [-0.4, 0.82, -0.3], s.material('#17171a'), 10); }
      else s.box([0.9, 1.5, 0.6], [0.6, 0.75, -0.4], s.material('#8d9698', { metalness: 0.4 }));
    } else {
      const concrete = new THREE.MeshStandardMaterial({ map: canvasTexture(256, 512, (ctx, w, h) => {
        ctx.fillStyle = `#${clad.getHexString()}`; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 2;
        for (let y = 0; y < h; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
        for (let i = 0; i < 10 + age * 30; i++) { const x = random() * w, g = ctx.createLinearGradient(0, 0, 0, h * (0.3 + random() * 0.6)); g.addColorStop(0, 'rgba(40,38,34,0.4)'); g.addColorStop(1, 'rgba(40,38,34,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 5 + random() * 16, h); }
      }), roughness: 1 });
      s.box([2.6, H0, 2.6], [0, H0 / 2, 0], concrete);
      for (let k = 0; k < 4; k++) s.box([0.3, 0.9, 0.06], [0.6, 1.6 + k * 1.4, 1.31], dark);
      s.box([0.9, 2.0, 0.06], [-0.5, 1.0, 1.31], s.material('#3c5a70'));
      const corbel = new THREE.CylinderGeometry(Math.SQRT1_2, 0.52 * Math.SQRT1_2, 1, 4);
      corbel.rotateY(Math.PI / 4);
      const flare = s.mesh(corbel, s.material(clad), [0, H0 - 0.5, 0]);
      flare.scale.set(cw, 1, cd);
    }

    // ---- Cab ----
    const wallMaterial = new THREE.MeshStandardMaterial({ color: '#e9dfc8', emissive: glow, emissiveIntensity: lit ? 0.55 : 0, roughness: 0.9 });
    parts.push({ size: [cw + 0.3, 0.2, cd + 0.3], at: [0, H0 + 0.02, 0], color: trimColour });
    s.box([cw - 0.1, ch, 0.12], [0, H0 + ch / 2, -cd / 2 + 0.06], wallMaterial);
    s.box([cw, ch, 0.05], [0, H0 + ch / 2, -cd / 2 - 0.01], s.material(clad));
    s.box([cw - 0.2, 0.04, cd - 0.2], [0, H0 + 0.14, 0], s.material('#6b5a48'));
    const ceiling = new THREE.MeshStandardMaterial({ color: '#f4efe0', emissive: glow, emissiveIntensity: lit ? 1.5 : 0 });
    s.box([cw - 0.5, 0.05, cd - 0.5], [0, H0 + ch - 0.06, 0], ceiling);
    // Sill walls, corner posts and glazing bars.
    parts.push({ size: [cw, sill, 0.1], at: [0, H0 + sill / 2 + 0.1, cd / 2 - 0.05], color: clad });
    for (const sx of [-1, 1]) parts.push({ size: [0.1, sill, cd], at: [sx * (cw / 2 - 0.05), H0 + sill / 2 + 0.1, 0], color: clad });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push({ size: [0.16, ch, 0.16], at: [sx * (cw / 2 - 0.06), H0 + ch / 2 + 0.1, sz * (cd / 2 - 0.06)], color: trimColour });
    parts.push({ size: [cw + 0.05, 0.16, cd + 0.05], at: [0, H0 + ch + 0.1, 0], color: trimColour });
    const paneFront = Math.round(cw / 0.95), paneSide = Math.round(cd / 0.95);
    const glassH = ch - sill;
    const panes: { at: P3; yaw: number; w: number }[] = [];
    for (let k = 0; k <= paneFront; k++) { const x = -cw / 2 + (k / paneFront) * cw; if (k > 0 && k < paneFront) parts.push({ size: [0.07, glassH, 0.07], at: [x, H0 + sill + glassH / 2 + 0.1, cd / 2 - 0.05], color: trimColour }); if (k < paneFront) panes.push({ at: [x + cw / paneFront / 2, H0 + sill + glassH / 2 + 0.1, cd / 2 - 0.05], yaw: 0, w: cw / paneFront }); }
    for (const sx of [-1, 1]) for (let k = 0; k <= paneSide; k++) { const z = -cd / 2 + (k / paneSide) * cd; if (k > 0 && k < paneSide) parts.push({ size: [0.07, glassH, 0.07], at: [sx * (cw / 2 - 0.05), H0 + sill + glassH / 2 + 0.1, z], color: trimColour }); if (k < paneSide) panes.push({ at: [sx * (cw / 2 - 0.05), H0 + sill + glassH / 2 + 0.1, z + cd / paneSide / 2], yaw: sx * Math.PI / 2, w: cd / paneSide }); }
    if (K === 'brick' || K === 'stilts') { parts.push({ size: [cw, 0.05, 0.08], at: [0, H0 + sill + glassH * 0.6 + 0.1, cd / 2 - 0.05], color: trimColour }); for (const sx of [-1, 1]) parts.push({ size: [0.08, 0.05, cd], at: [sx * (cw / 2 - 0.05), H0 + sill + glassH * 0.6 + 0.1, 0], color: trimColour }); }
    const glass = new THREE.MeshStandardMaterial({ color: lit ? '#fff0cc' : '#8ea3ab', transparent: true, opacity: lit ? 0.2 : 0.38, depthWrite: false, roughness: 0.1, side: THREE.DoubleSide });
    const ply = s.material('#a58a5c', { roughness: 1 });
    for (const pane of panes) {
      const fate = abandoned ? random() : 1;
      if (fate < 0.42) { const board = s.box([pane.w - 0.04, glassH - 0.04, 0.04], pane.at, ply); board.rotation.y = pane.yaw; board.rotation.z = (random() - 0.5) * 0.06; }
      else if (fate > 0.62) { const sheet = s.mesh(new THREE.PlaneGeometry(pane.w - 0.06, glassH - 0.04), glass, pane.at); sheet.rotation.y = pane.yaw; sheet.castShadow = false; }
    }

    // ---- Roof ----
    const roofY = H0 + ch + 0.18;
    const snowWhite = new THREE.MeshStandardMaterial({ color: '#f3f6f8', roughness: 0.95 });
    if (K === 'brick') {
      const hip = new THREE.ConeGeometry(Math.SQRT1_2, 1.5, 4); hip.rotateY(Math.PI / 4);
      const roof = s.mesh(hip, snow > 0.5 ? snowWhite : s.material('#474d55', { roughness: 0.8 }), [0, roofY + 0.75, 0]);
      roof.scale.set(cw + 0.9, 1, cd + 0.9);
      s.mesh(new THREE.ConeGeometry(0.07, 0.6, 6), dark, [0, roofY + 1.75, 0]); s.ball([0.1, 0.1, 0.1], [0, roofY + 1.52, 0], dark, 8);
    } else if (K === 'stilts') {
      const gable = new THREE.ExtrudeGeometry(new THREE.Shape([[-(cd / 2 + 0.45), 0], [cd / 2 + 0.45, 0], [0, 1.2]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: cw + 0.7, bevelEnabled: false });
      gable.rotateY(Math.PI / 2); gable.translate(-(cw + 0.7) / 2, 0, 0);
      s.mesh(gable, snow > 0.5 ? snowWhite : s.material(new THREE.Color('#8a8f92').lerp(new THREE.Color('#7a4a30'), age * 0.8), { metalness: 0.3, roughness: 0.6 }), [0, roofY, 0]);
    } else {
      const over = K === 'steel' ? 0.75 : 0.35;
      s.box([cw + over * 2, K === 'steel' ? 0.16 : 0.4, cd + over * 2], [0, roofY + 0.1, 0], s.material(K === 'steel' ? '#e3e6e6' : clad));
      if (snow > 0.4) s.box([cw + over * 2, 0.08, cd + over * 2], [0, roofY + (K === 'steel' ? 0.22 : 0.34), 0], snowWhite);
      s.rod([cw / 2 - 0.4, roofY + 0.2, -cd / 2 + 0.4], [cw / 2 - 0.4, roofY + 2.6, -cd / 2 + 0.4], 0.03, dark);
      for (const y of [1.6, 2.1]) s.rod([cw / 2 - 0.8, roofY + y, -cd / 2 + 0.4], [cw / 2, roofY + y, -cd / 2 + 0.4], 0.015, dark);
      const lampOn = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff0c0', emissiveIntensity: lit ? 2.2 : 0 });
      for (const sx of [-1, 1]) { s.box([0.5, 0.2, 0.3], [sx * (cw / 2 + over - 0.3), roofY - 0.05, cd / 2 + over - 0.1], dark).rotation.x = 0.5; s.box([0.42, 0.04, 0.24], [sx * (cw / 2 + over - 0.3), roofY - 0.16, cd / 2 + over - 0.04], lampOn).rotation.x = 0.5; }
      if (K === 'concrete') { const dish = s.lathe([[0.02, 0], [0.3, 0.06], [0.5, 0.2]], s.material('#dfe2e2', { side: THREE.DoubleSide }), [-cw / 2 + 0.9, roofY + 0.9, 0]); dish.rotation.set(1.0, 0, 0.3); s.rod([-cw / 2 + 0.9, roofY + 0.3, 0], [-cw / 2 + 0.9, roofY + 0.9, 0], 0.04, dark); }
    }

    // ---- Stove ----
    const puffs: THREE.Mesh[] = [];
    if (a.stove !== 'none') {
      const cx = -cw / 2 + 0.7, cz = -cd / 2 + 0.5;
      const stackTop = roofY + (K === 'brick' ? 2.0 : K === 'stilts' ? 1.9 : 1.3);
      if (K === 'brick') { s.box([0.6, stackTop - H0, 0.6], [cx, (stackTop + H0) / 2, cz - 0.35], new THREE.MeshStandardMaterial({ map: brickTexture(0.6, 2), roughness: 0.95 })); s.cylinder(0.14, 0.17, 0.4, [cx, stackTop + 0.2, cz - 0.35], s.material('#a5553a'), 10); }
      else { s.cylinder(0.09, 0.09, stackTop - H0 - 1, [cx, (stackTop + H0 + 1) / 2, cz], dark, 10); s.mesh(new THREE.ConeGeometry(0.2, 0.16, 10), dark, [cx, stackTop + 0.14, cz]); }
      s.box([0.5, 0.75, 0.5], [cx, H0 + 0.5, cz + 0.25], dark);
      if (a.stove === 'smoking') {
        const smoke = new THREE.MeshStandardMaterial({ color: '#d9d9d6', transparent: true, opacity: 0.2, depthWrite: false, roughness: 1 });
        for (let i = 0; i < 6; i++) { const puff = s.ball([0.22 + i * 0.1, 0.2 + i * 0.08, 0.22 + i * 0.1], [cx + i * 0.25 * (0.3 + mood.energy), stackTop + 0.6 + i * 0.5, cz - (K === 'brick' ? 0.35 : 0)], smoke, 10); puff.castShadow = false; puffs.push(puff); }
      }
    }

    // ---- Interior ----
    const blink: THREE.MeshStandardMaterial[] = [];
    const floorY = H0 + 0.16;
    if (a.interior === 'levers') {
      const colours = ['#c62a20', '#2a5fae', '#19191b', '#e2b21c', '#ece9de', '#c62a20', '#2a5fae'];
      const count = Math.round(cw / 0.3) - 2;
      for (let k = 0; k < count; k++) {
        const x = -cw / 2 + 0.5 + k * ((cw - 1) / (count - 1)), pulled = random() < 0.3;
        const tiltBack = pulled ? -0.45 : 0.12;
        parts.push({ size: [0.07, 1.25, 0.07], at: [x, floorY + 0.6, cd / 2 - 0.75 + Math.sin(tiltBack) * 0.6], rot: [tiltBack, 0, 0], color: colours[Math.floor(random() * colours.length)] });
        parts.push({ size: [0.05, 0.22, 0.05], at: [x, floorY + 1.28, cd / 2 - 0.75 + Math.sin(tiltBack) * 1.3], rot: [tiltBack, 0, 0], color: '#cfd2d2' });
      }
      parts.push({ size: [cw - 0.7, 0.14, 0.5], at: [0, floorY + 0.07, cd / 2 - 0.75], color: '#2a2b2d' });
      const shelf = s.label('1 2 3 4 5 6 7 8 9 10 11 12', cw - 1.2, 0.22, [0, H0 + ch - 0.35, -cd / 2 + 0.14], '#19191b', '#e9dfc8'); shelf.castShadow = false;
    } else if (a.interior === 'panel') {
      const diagram = canvasTexture(512, 192, (ctx, w, h) => {
        ctx.fillStyle = '#10201c'; ctx.fillRect(0, 0, w, h);
        ctx.lineWidth = 5; ctx.strokeStyle = '#e8e4d0';
        for (let k = 0; k < 6; k++) { const y = 30 + k * 26; ctx.beginPath(); ctx.moveTo(30, h / 2); ctx.lineTo(150, y); ctx.lineTo(w - 30, y); ctx.stroke(); }
        for (let k = 0; k < 26; k++) { ctx.fillStyle = ['#ff3a28', '#35e078', '#ffc21e'][Math.floor(random() * 3)]; ctx.beginPath(); ctx.arc(170 + random() * 300, 30 + Math.floor(random() * 6) * 26, 7, 0, 7); ctx.fill(); }
      });
      const screen = new THREE.MeshStandardMaterial({ map: diagram, emissiveMap: diagram, emissive: '#ffffff', emissiveIntensity: lit ? 1.4 : 0, roughness: 0.6 });
      s.mesh(new THREE.PlaneGeometry(cw - 1, 1.15), screen, [0, H0 + 1.75, -cd / 2 + 0.14]).castShadow = false;
      blink.push(screen);
      const desk = s.box([cw - 1.4, 0.85, 0.7], [0, floorY + 0.42, cd / 2 - 0.8], s.material('#8d9698'));
      desk.receiveShadow = true;
      const buttons = canvasTexture(256, 64, (ctx, w, h) => { ctx.fillStyle = '#3a3f42'; ctx.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { ctx.fillStyle = ['#ff3a28', '#35e078', '#ffc21e', '#e8e4d0', '#3f8dff'][Math.floor(random() * 5)]; ctx.fillRect(8 + (k % 20) * 12, 12 + Math.floor(k / 20) * 26, 7, 12); } });
      const top = new THREE.MeshStandardMaterial({ map: buttons, emissiveMap: buttons, emissive: '#ffffff', emissiveIntensity: lit ? 1.2 : 0 });
      const slab = s.mesh(new THREE.PlaneGeometry(cw - 1.5, 0.6), top, [0, floorY + 0.9, cd / 2 - 0.8]); slab.rotation.x = -Math.PI / 2 + 0.35; slab.castShadow = false;
      blink.push(top);
    } else {
      s.box([1.7, 0.08, 0.8], [0.3, floorY + 0.78, cd / 2 - 0.85], s.material('#7a5a3a'));
      for (const x of [-0.45, 1.05]) s.box([0.08, 0.76, 0.7], [x, floorY + 0.38, cd / 2 - 0.85], s.material('#6a4c30'));
      s.cylinder(0.02, 0.07, 0.35, [0.9, floorY + 1.0, cd / 2 - 0.8], s.material('#b8963a', { metalness: 0.7 }), 8);
      const shade = new THREE.MeshStandardMaterial({ color: '#2f8a4c', emissive: '#3fae62', emissiveIntensity: lit ? 1.3 : 0 });
      s.box([0.4, 0.12, 0.2], [0.9, floorY + 1.22, cd / 2 - 0.8], shade);
      s.box([0.26, 0.14, 0.2], [0.0, floorY + 0.89, cd / 2 - 0.85], dark);
      const clock = canvasTexture(128, 128, (ctx) => { ctx.fillStyle = '#19191b'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, 7); ctx.fill(); ctx.fillStyle = '#f2eedf'; ctx.beginPath(); ctx.arc(64, 64, 52, 0, 7); ctx.fill(); ctx.strokeStyle = '#19191b'; ctx.lineWidth = 7; const h = random() * 6.28, m = random() * 6.28; ctx.beginPath(); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(h) * 26, 64 - Math.cos(h) * 26); ctx.moveTo(64, 64); ctx.lineTo(64 + Math.sin(m) * 42, 64 - Math.cos(m) * 42); ctx.stroke(); });
      s.mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshStandardMaterial({ map: clock, emissiveMap: clock, emissive: '#ffffff', emissiveIntensity: lit ? 0.6 : 0 }), [-cw / 4, H0 + 1.85, -cd / 2 + 0.14]).castShadow = false;
    }
    if (a.occupied === 'shift') {
      figure(s, { at: [-cw / 4 + (random() - 0.5) * 0.6, floorY, cd / 2 - (a.interior === 'levers' ? 1.25 : 1.45)], yaw: (random() - 0.5) * 0.5, coat: '#2e3a4e', trousers: '#262a30', hat: 'cap', hatColour: '#1f2530', pose: a.interior === 'levers' ? 'hunch' : 'stand' });
      if (mood.density > 0.6) figure(s, { at: [cw / 4, floorY, -cd / 2 + 0.9], yaw: 0.4, coat: '#5a4636', hat: 'none', pose: 'stand' });
    } else if (a.occupied === 'justleft') s.box([0.45, 0.9, 0.12], [cw / 4, H0 + 1.5, -cd / 2 + 0.2], s.material('#4c3a2a'));

    // Pinned in the window: on the inside of the front glass, second pane from the right.
    const pinAt: P3 = [cw / 2 - (cw / paneFront) * 1.5, H0 + sill + glassH * 0.5 + 0.1, cd / 2 - 0.12];
    if (a.pinned === 'plant') {
      s.cylinder(0.14, 0.1, 0.22, [pinAt[0], H0 + sill + 0.22, cd / 2 - 0.25], s.material('#b2603f'), 10);
      for (let k = 0; k < 7; k++) s.ball([0.12, 0.1, 0.12], [pinAt[0] + (random() - 0.5) * 0.3, H0 + sill + 0.42 + random() * 0.25, cd / 2 - 0.25 + (random() - 0.5) * 0.12], s.material(k % 2 ? '#d02a3a' : '#3f7a3c'), 8);
    } else if (a.pinned !== 'nothing') {
      const sheet = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (a.pinned === 'calendar') { ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#2a4a6a'; ctx.fillRect(0, 0, w, h * 0.5); ctx.fillStyle = '#19191b'; ctx.fillRect(40, 60, 150, 40); ctx.fillRect(60, 36, 60, 30); ctx.fillStyle = '#c62a20'; ctx.fillRect(0, h * 0.5, w, 24); ctx.fillStyle = '#555'; for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) ctx.fillRect(18 + c * 32, h * 0.62 + r * 22, 18, 10); }
        else if (a.pinned === 'notice') { ctx.fillStyle = '#c62a20'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f4f0e4'; ctx.font = 'bold 62px sans-serif'; ctx.fillText('STRIKE', w / 2, 70); ctx.font = 'bold 34px sans-serif'; ctx.fillText('NOTICE', w / 2, 126); for (let k = 0; k < 4; k++) ctx.fillRect(30, 160 + k * 20, w - 60 - (k === 3 ? 70 : 0), 8); }
        else if (a.pinned === 'orders') { ctx.clearRect(0, 0, w, h); for (let k = 0; k < 3; k++) { ctx.fillStyle = k === 1 ? '#e7dc8a' : '#efe6a8'; ctx.save(); ctx.translate(44 + k * 84, h / 2); ctx.rotate((random() - 0.5) * 0.15); ctx.fillRect(-36, -110, 72, 220); ctx.fillStyle = '#4a4a4a'; for (let r = 0; r < 9; r++) ctx.fillRect(-28, -92 + r * 20, 56 - (r % 3) * 12, 5); ctx.restore(); } }
        else if (a.pinned === 'drawing') { ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#f5c21a'; ctx.beginPath(); ctx.arc(200, 54, 30, 0, 7); ctx.fill(); ctx.fillStyle = '#2f8a4c'; ctx.fillRect(0, 210, w, 46); ctx.fillStyle = '#d2392c'; ctx.fillRect(40, 130, 130, 60); ctx.fillStyle = '#2a5fae'; ctx.fillRect(130, 96, 44, 40); ctx.fillStyle = '#19191b'; for (const x of [66, 110, 150]) { ctx.beginPath(); ctx.arc(x, 198, 17, 0, 7); ctx.fill(); } ctx.fillRect(56, 100, 18, 34); ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.arc(70, 76, 18, 0, 7); ctx.arc(96, 54, 22, 0, 7); ctx.fill(); }
        else { ctx.fillStyle = '#f4f0e4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#19191b'; ctx.font = 'bold 60px sans-serif'; ctx.fillText('CLOSED', w / 2, h / 2); ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20); }
      });
      const wide = a.pinned === 'orders' ? 1.1 : 0.82;
      const pinned = s.mesh(new THREE.PlaneGeometry(wide, 0.86), new THREE.MeshStandardMaterial({ map: sheet, emissiveMap: sheet, emissive: '#ffffff', emissiveIntensity: lit ? 0.45 : 0, alphaTest: 0.5, roughness: 0.9 }), pinAt);
      pinned.rotation.z = (random() - 0.5) * 0.1;
      pinned.castShadow = false;
    }

    // Nameboard.
    const board = s.label(NAMES[a.name], Math.min(cw * 0.6, 2.6), 0.46, [0, H0 + sill * 0.5 + 0.12, cd / 2 + 0.02], K === 'brick' ? '#f1ecdc' : '#19191b', K === 'brick' ? '#19191b' : '#f1ecdc');
    board.rotation.z = abandoned ? (random() - 0.5) * 0.25 : 0;

    // ---- Stair up the right-hand side to a landing and door at the back ----
    const stairColour = K === 'steel' || K === 'concrete' ? new THREE.Color('#6d777b') : new THREE.Color('#5a4634');
    const sx0 = cw / 2 + 0.55;
    const landingZ = -cd / 2 + 0.6;
    parts.push({ size: [1.1, 0.08, 1.3], at: [sx0, H0 + 0.08, landingZ], color: stairColour });
    const doorMaterial = s.material(K === 'brick' ? '#3f5a4c' : '#3c4c58');
    const door = s.box([0.06, 2.0, 0.85], [cw / 2 + 0.02, H0 + 1.12, landingZ], doorMaterial);
    if (a.occupied === 'justleft') { door.rotation.y = 0.9; door.position.set(cw / 2 + 0.35, H0 + 1.12, landingZ + 0.6); const spill = new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: 1.4 }); s.box([0.02, 1.9, 0.8], [cw / 2 - 0.02, H0 + 1.1, landingZ], spill); }
    const rise = 0.23, run = 0.27;
    const steps = Math.ceil(H0 / rise);
    for (let k = 0; k < steps; k++) {
      if (abandoned && random() < 0.22) continue;
      parts.push({ size: [1.0, 0.05, run + 0.02], at: [sx0, H0 + 0.08 - (k + 1) * rise, landingZ + 0.65 + (k + 0.5) * run], color: stairColour });
    }
    const footZ = landingZ + 0.65 + steps * run;
    for (const dx of [-0.5, 0.5]) {
      strut([sx0 + dx, H0 + 0.02, landingZ + 0.65], [sx0 + dx, 0.05, footZ], 0.09, stairColour);
      strut([sx0 + dx, H0 + 1.0, landingZ + 0.65], [sx0 + dx, 1.05, footZ], 0.05, stairColour);
      strut([sx0 + dx, H0 + 1.0, landingZ - 0.65], [sx0 + dx, H0 + 1.0, landingZ + 0.65], 0.05, stairColour);
      for (const t of [0, 0.33, 0.66, 1]) strut([sx0 + dx, mix(H0, 0.05, t), mix(landingZ + 0.65, footZ, t)], [sx0 + dx, mix(H0, 0.05, t) + 1.0, mix(landingZ + 0.65, footZ, t)], 0.05, stairColour);
      strut([sx0 + dx, H0, landingZ - 0.6], [sx0 + dx, H0 + 1.0, landingZ - 0.6], 0.05, stairColour);
    }
    strut([sx0 - 0.5, H0 + 1.0, landingZ - 0.6], [sx0 + 0.5, H0 + 1.0, landingZ - 0.6], 0.05, stairColour);
    for (const dx of [-0.45, 0.45]) strut([sx0 + dx, 0, landingZ], [sx0 + dx, H0, landingZ], 0.1, stairColour);
    blocks(s.root, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), parts);

    // Door lamp, bicycle, weeds, snow.
    const doorLamp = new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffc870', emissiveIntensity: lit ? 2 : 0 });
    s.ball([0.1, 0.1, 0.1], [cw / 2 + 0.14, H0 + 2.3, landingZ], doorLamp, 10).castShadow = false;
    if (a.occupied === 'justleft') {
      const bike = new Sculpture(context);
      const frame = s.material('#a3322a', { metalness: 0.4 });
      for (const x of [-0.52, 0.52]) bike.ring(0.33, 0.022, [x, 0.35, 0], dark);
      bike.rod([-0.52, 0.35, 0], [-0.15, 0.8, 0], 0.018, frame); bike.rod([-0.15, 0.8, 0], [0.4, 0.85, 0], 0.018, frame); bike.rod([0.4, 0.85, 0], [0.52, 0.35, 0], 0.018, frame); bike.rod([-0.15, 0.8, 0], [0.05, 0.35, 0], 0.018, frame); bike.rod([0.05, 0.35, 0], [-0.52, 0.35, 0], 0.018, frame); bike.rod([0.05, 0.35, 0], [0.4, 0.85, 0], 0.018, frame);
      bike.box([0.22, 0.04, 0.1], [-0.17, 0.92, 0], dark); bike.rod([0.4, 0.85, -0.2], [0.4, 1.0, 0.2], 0.014, dark);
      bike.root.position.set(sx0 + 0.9, 0, footZ - 1.4); bike.root.rotation.set(0.2, Math.PI / 2, 0);
      s.root.add(bike.root);
    }
    if (age > 0.5) weeds(s, Array.from({ length: Math.round(age * 26) }, () => { const t = random() * Math.PI * 2; return { at: [Math.cos(t) * (cw / 2 + 0.3 + random()), 0, Math.sin(t) * (cd / 2 + 0.3 + random())] as const, size: mix(0.4, 1.3, random()) }; }));
    if (snow > 0.4) s.box([cw + 0.4, 0.05, 0.3], [0, H0 + 0.15, cd / 2 + 0.1], snowWhite);

    const speed = mix(0.4, 1.6, mood.energy);
    const automated = a.occupied === 'automated';
    return s.finish({
      update: (_dt, time) => {
        puffs.forEach((puff, i) => { puff.position.y += Math.sin(time * speed + i) * 0.0015; puff.position.x += Math.cos(time * speed * 0.7 + i) * 0.001; });
        if (lit) { ceiling.emissiveIntensity = automated ? 1.4 + (Math.sin(time * 23) > 0.96 ? -0.5 : 0) : 1.5; for (const material of blink) material.emissiveIntensity = 1.2 + Math.sin(time * 3 * (0.5 + mood.energy)) * 0.25; }
      },
    });
  },
});
