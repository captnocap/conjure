import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P = readonly [number, number, number];
const WALLS = {
  ochre: 'Sun-baked ochre yellow.',
  seagreen: 'Sea green gone chalky.',
  coral: 'Coral pink.',
  sky: 'Sky blue.',
  lavender: 'Faded lavender.',
  bone: 'Bone white streaked with grey.',
} as const;
const WALL_TINT: Record<keyof typeof WALLS, string> = { ochre: '#e3b04a', seagreen: '#7cc0aa', coral: '#ec8f78', sky: '#86bfe0', lavender: '#b9a3d6', bone: '#e6dfcc' };

export default defineThing({
  questions: {
    wall: choice('What colour is the plaster?', WALLS),
    plaster: score('How much of the plaster has fallen away?', ['Freshly restored, none', 'A few scabs at the edges', 'Big patches of bare brick', 'More brick than plaster']),
    shutters: choice('How are the balcony shutters?', {
      closed: 'Closed tight against the heat; nobody home, or siesta.',
      ajar: 'One leaf pushed ajar, someone listening to the street.',
      open: 'Thrown wide open onto a dark, cool room.',
      curtain: 'Wide open with a lace curtain blowing out over the balcony.',
    }),
    iron: choice('What is the ironwork like?', {
      scrolls: 'Rows of wrought S-scrolls, ornate and old.',
      bars: 'Plain slim uprights with a ring between each pair.',
      crosses: 'Crossed diagonals with a hoop at every crossing, geometric.',
      mended: 'Plain bars with a missing section patched with planks and wire.',
    }),
    hangs: choice('What hangs from the rail?', {
      nothing: 'Nothing.',
      washing: 'A line of washing: shirts, a sheet, a towel.',
      flag: 'A Cuban flag hung straight down over the rail.',
      birdcage: 'A birdcage with a canary, hung from a bracket.',
      sign: 'A cardboard sign offering the flat for exchange: SE PERMUTA.',
      bulbs: 'A string of coloured bulbs along the top rail.',
    }),
    bucket: choice('What is the bucket on the rope doing?', {
      none: 'There is no bucket.',
      parked: 'Hauled up and hanging just under the rail, waiting.',
      bread: 'Halfway up with loaves of bread sticking out of it.',
      keys: 'Lowered almost to the pavement with the door keys in it for a visitor.',
    }),
    plants: choice('What is growing on it?', {
      none: 'Nothing grows here.',
      tins: 'Geraniums and ferns in old tins along the balcony floor.',
      bougainvillea: 'A bougainvillea spilling magenta over the rail and down the wall.',
      sapling: 'A fig sapling rooted in the masonry itself, splitting the cornice.',
    }),
    ground: choice('What is on the ground floor beneath?', {
      door: 'A tall panelled street door, one leaf ajar.',
      grille: 'A tall window behind a projecting iron cage.',
      blank: 'Blank wall with the ghost of a painted shop sign and a house number.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 3.4, H = 6.5, T = 0.35, F = 3.0;
    const tint = new THREE.Color(WALL_TINT[a.wall]);
    tint.offsetHSL(0, mix(-0.2, 0.06, mood.cheer), 0).lerp(new THREE.Color('#b5ad9c'), mood.wear * 0.3);
    const missing = clamp01(a.plaster * 0.8 + (mood.wear - 0.5) * 0.4);

    // Painted facade: mottled plaster, stains, cracks and patches of bare brick.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const px = (x: number) => (x / W + 0.5) * 512, py = (y: number) => (1 - y / H) * 1024;
    ctx.fillStyle = `#${tint.getHexString()}`; ctx.fillRect(0, 0, 512, 1024);
    ctx.fillStyle = `#${tint.clone().multiplyScalar(0.78).getHexString()}`; ctx.fillRect(0, py(0.95), 512, 200);
    for (let i = 0; i < 90; i++) { ctx.fillStyle = random() < 0.5 ? `rgba(255,255,255,${0.03 + random() * 0.07})` : `rgba(60,50,40,${0.03 + random() * 0.07})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 1024, 20 + random() * 70, 14 + random() * 50, random() * 3, 0, 6.3); ctx.fill(); }
    const streaks = 6 + Math.floor(mood.wear * 26);
    for (let i = 0; i < streaks; i++) {
      const x = random() * 512, top = random() < 0.5 ? py(F - 0.15) : py(H - 0.3), length = 60 + random() * 260;
      const gradient = ctx.createLinearGradient(0, top, 0, top + length);
      gradient.addColorStop(0, `rgba(50,45,38,${0.18 + mood.wear * 0.25})`); gradient.addColorStop(1, 'rgba(50,45,38,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x, top, 5 + random() * 16, length);
    }
    if (a.ground === 'blank') {
      ctx.save(); ctx.globalAlpha = mix(0.6, 0.25, mood.wear); ctx.fillStyle = '#7a2f25'; ctx.textAlign = 'center';
      ctx.font = 'bold 62px serif'; ctx.fillText(pick(['CAFE', 'HIELO', 'BARBERIA', 'TABACOS']), 256, py(2.0));
      ctx.font = 'bold 30px serif'; ctx.fillText(pick(['REFRESCOS', 'LA ESQUINA', 'DESDE 1948']), 256, py(1.65));
      ctx.strokeStyle = '#7a2f25'; ctx.lineWidth = 4; ctx.strokeRect(70, py(2.5), 372, py(1.45) - py(2.5)); ctx.restore();
    }
    const patches = Math.round(missing * 16);
    for (let i = 0; i < patches; i++) {
      const edge = random() < 0.6;
      const cx = edge ? (random() < 0.5 ? random() * 90 : 512 - random() * 90) : random() * 512, cy = random() < 0.45 ? py(random() * 1.3) : random() * 1024;
      const radius = (26 + random() * 70) * (0.6 + missing);
      const outline: [number, number][] = [];
      for (let k = 0; k < 12; k++) { const t = k / 12 * 6.283, r = radius * (0.55 + random() * 0.6); outline.push([cx + Math.cos(t) * r * 0.8, cy + Math.sin(t) * r * 1.15]); }
      ctx.save(); ctx.beginPath(); outline.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.strokeStyle = 'rgba(255,250,235,0.7)'; ctx.lineWidth = 5; ctx.stroke(); ctx.clip();
      ctx.fillStyle = '#b3a590'; ctx.fillRect(cx - radius * 1.5, cy - radius * 1.5, radius * 3, radius * 3);
      for (let row = Math.floor((cy - radius * 1.5) / 13); row < (cy + radius * 1.5) / 13; row++) for (let col = -1; col < 16; col++) {
        ctx.fillStyle = pick(['#a8553a', '#b8654a', '#9a4a34', '#c07a5a']);
        ctx.fillRect(col * 36 + (row % 2 ? 18 : 0) + 1, row * 13 + 1, 33, 10);
      }
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(60,50,40,0.55)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2 + mood.wear * 8; i++) { let x = random() * 512, y = random() * 900; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (random() - 0.5) * 30; y += 12 + random() * 22; ctx.lineTo(x, y); } ctx.stroke(); }
    const facade = new THREE.CanvasTexture(canvas);
    facade.colorSpace = THREE.SRGBColorSpace;
    const brick = s.material('#a8674e', { roughness: 1 });
    s.box([W, H, T], [0, H / 2, -T / 2], [brick, brick, brick, brick, new THREE.MeshStandardMaterial({ map: facade, roughness: 0.95 }), s.material('#b9ad98')] as unknown as THREE.Material);

    const trim = s.material(new THREE.Color('#efe8d6').lerp(new THREE.Color('#a59d8c'), mood.wear * 0.4), { roughness: 0.9 });
    const iron = s.material(mood.wear > 0.6 ? '#4a3a30' : '#22262a', { metalness: 0.5, roughness: 0.6 });
    const shadow = s.material('#241f1b', { roughness: 1 });
    const paintHue = pick(['#2f6f7a', '#3f6a3f', '#7a3a2a', '#28497a', '#8a7a3a', '#5a4a6a']);
    const joinery = s.material(new THREE.Color(paintHue).lerp(new THREE.Color('#8f8a7c'), mood.wear * 0.35), { roughness: 0.7 });

    // Cornice and string course.
    s.box([W + 0.3, 0.16, T + 0.3], [0, H - 0.08, -T / 2 + 0.08], trim);
    s.box([W + 0.16, 0.12, T + 0.18], [0, H - 0.22, -T / 2 + 0.05], trim);
    for (let i = 0; i < 11; i++) s.box([0.12, 0.12, 0.12], [-W / 2 + 0.2 + i * (W - 0.4) / 10, H - 0.34, 0.05], trim);

    // Balcony slab on scrolled brackets.
    s.box([2.7, 0.14, 0.82], [0, F - 0.07, 0.41], trim);
    s.box([2.78, 0.05, 0.86], [0, F - 0.025, 0.43], trim);
    for (const x of [-1.1, 0, 1.1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0.7, 0); shape.quadraticCurveTo(0.6, -0.3, 0.12, -0.42); shape.quadraticCurveTo(0.2, -0.6, 0, -0.72); shape.closePath();
      const corbel = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: false }), trim, [x + 0.07, F - 0.14, 0]);
      corbel.rotation.y = -Math.PI / 2;
    }

    // Balcony door: dark room, surround, stained-glass fanlight.
    const DT = F + 2.4;
    const glow = mood.daylight > 0.65 ? mix(0.2, 0.9, (mood.daylight - 0.65) / 0.35) : 0;
    const room = s.material(glow ? '#5a3a1c' : '#241f1b', { emissive: '#ffb04a', emissiveIntensity: glow, roughness: 1 });
    s.box([1.2, 2.4, 0.02], [0, F + 1.2, 0.01], room);
    for (const x of [-0.66, 0.66]) s.box([0.12, 2.4, 0.07], [x, F + 1.2, 0.035], trim);
    s.box([1.44, 0.08, 0.09], [0, DT + 0.02, 0.045], trim);
    const arch = s.mesh(new THREE.TorusGeometry(0.66, 0.06, 8, 24, Math.PI), trim, [0, DT + 0.04, 0.04]);
    arch.castShadow = true;
    const glassHues = ['#d8322a', '#f0c22a', '#2a6ad8', '#3aa85a', '#e87a1e'];
    for (let i = 0; i < 5; i++) {
      const hue = glassHues[(i + Math.floor(random() * 5)) % 5];
      s.mesh(new THREE.CircleGeometry(0.6, 6, i * Math.PI / 5, Math.PI / 5), s.material(hue, { emissive: hue, emissiveIntensity: 0.25 + glow * 0.8, roughness: 0.3 }), [0, DT + 0.06, 0.03]).castShadow = false;
      s.rod([0, DT + 0.06, 0.04], [Math.cos(i * Math.PI / 5) * 0.6, DT + 0.06 + Math.sin(i * Math.PI / 5) * 0.6, 0.04], 0.012, trim);
    }
    s.mesh(new THREE.CircleGeometry(0.2, 12, 0, Math.PI), trim, [0, DT + 0.06, 0.045]);

    // Louvred shutter leaves.
    const louvre = (width: number, height: number, hingeX: number, baseY: number, side: number, angle: number, z = 0.05) => {
      const leaf = new Sculpture(context);
      leaf.root.position.set(hingeX, baseY, z);
      leaf.root.rotation.y = side * angle;
      const cx = side * width / 2;
      leaf.box([width, height, 0.012], [cx, height / 2, 0], shadow);
      for (const x of [0.03, width - 0.03]) leaf.box([0.06, height, 0.045], [side * x, height / 2, 0], joinery);
      for (const y of [0.04, height * 0.5, height - 0.04]) leaf.box([width, 0.08, 0.045], [cx, y, 0], joinery);
      const count = Math.floor((height - 0.2) / 0.07), matrices: THREE.Matrix4[] = [];
      const lost = mood.wear > 0.5 ? Math.floor(random() * count) : -1;
      for (let i = 0; i < count; i++) if (i !== lost && i !== lost + 1) matrices.push(new THREE.Matrix4().makeRotationX(0.65).setPosition(cx, 0.12 + i * 0.07, 0.006));
      const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(width - 0.12, 0.05, 0.01), joinery, matrices.length);
      matrices.forEach((matrix, index) => slats.setMatrixAt(index, matrix));
      slats.castShadow = true;
      leaf.root.add(slats);
      s.root.add(leaf.root);
    };
    const swing = { closed: [0.02, 0.03], ajar: [0.04, 0.75], open: [2.75, 2.85], curtain: [2.8, 2.7] }[a.shutters];
    const flip = random() < 0.5;
    louvre(0.6, 2.38, -0.6, F + 0.01, 1, -swing[flip ? 1 : 0]);
    louvre(0.6, 2.38, 0.6, F + 0.01, -1, -swing[flip ? 0 : 1]);
    let curtain: THREE.Mesh | null = null;
    if (a.shutters === 'curtain') {
      curtain = s.mesh(new THREE.PlaneGeometry(0.7, 2.2, 8, 10), new THREE.MeshStandardMaterial({ color: '#f6f2e6', side: THREE.DoubleSide, roughness: 0.9 }), [0.1, F + 1.25, 0.08]);
    }

    // Ironwork: runs along the front and both returns.
    const RZ = 0.76, RX = 1.3, RH = 0.98;
    const matricesFor = { bar: [] as THREE.Matrix4[], scroll: [] as THREE.Matrix4[], hoop: [] as THREE.Matrix4[], crossA: [] as THREE.Matrix4[], crossB: [] as THREE.Matrix4[] };
    const gapStart = mix(-0.9, 0.2, random());
    const runs: { origin: P; yaw: number; length: number; front: boolean }[] = [
      { origin: [-RX, F, RZ], yaw: 0, length: RX * 2, front: true },
      { origin: [-RX, F, RZ], yaw: Math.PI / 2, length: RZ - 0.02, front: false },
      { origin: [RX, F, RZ], yaw: Math.PI / 2, length: RZ - 0.02, front: false },
    ];
    for (const run of runs) {
      const frame = new THREE.Matrix4().makeRotationY(run.yaw).setPosition(...run.origin);
      const at = (x: number, y: number, extra?: THREE.Matrix4) => { const m = frame.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, 0)); return extra ? m.multiply(extra) : m; };
      const end = new THREE.Vector3(run.length, 0, 0).applyMatrix4(frame);
      for (const y of [0.08, RH]) s.rod([run.origin[0], F + y, run.origin[2]], [end.x, F + y, end.z], y > 0.5 ? 0.022 : 0.014, iron);
      const panels = Math.max(2, Math.round(run.length / 0.33)), w = run.length / panels;
      if (a.iron === 'bars' || a.iron === 'mended') {
        const n = Math.round(run.length / 0.11);
        for (let i = 1; i < n; i++) {
          const x = i * run.length / n, world = x - RX;
          if (a.iron === 'mended' && run.front && world > gapStart && world < gapStart + 0.62) continue;
          matricesFor.bar.push(at(x, 0.53));
          if (a.iron === 'bars' && i % 2) matricesFor.hoop.push(at(x + run.length / n / 2, 0.88, new THREE.Matrix4().makeScale(0.36, 0.36, 0.36)));
        }
      } else for (let i = 0; i < panels; i++) {
        if (i) matricesFor.bar.push(at(i * w, 0.53));
        if (a.iron === 'scrolls') matricesFor.scroll.push(at((i + 0.5) * w, 0.1, new THREE.Matrix4().makeScale(i % 2 ? -1 : 1, 0.86, 1)));
        else {
          const lean = Math.atan2(w, 0.86);
          matricesFor.crossA.push(at((i + 0.5) * w, 0.53, new THREE.Matrix4().makeRotationZ(lean)));
          matricesFor.crossB.push(at((i + 0.5) * w, 0.53, new THREE.Matrix4().makeRotationZ(-lean)));
          matricesFor.hoop.push(at((i + 0.5) * w, 0.53, new THREE.Matrix4().makeScale(0.8, 0.8, 0.8)));
        }
      }
    }
    const instanced = (geometry: THREE.BufferGeometry, matrices: readonly THREE.Matrix4[]) => {
      if (!matrices.length) { geometry.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, a.iron === 'scrolls' ? new THREE.MeshStandardMaterial({ color: (iron as THREE.MeshStandardMaterial).color, metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide }) : iron, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.castShadow = true;
      s.root.add(mesh);
    };
    instanced(new THREE.CylinderGeometry(0.009, 0.009, 0.9, 6), matricesFor.bar);
    instanced(new THREE.TorusGeometry(0.11, 0.012, 6, 18), matricesFor.hoop);
    const crossLength = Math.hypot(RX * 2 / Math.round(RX * 2 / 0.33), 0.86);
    instanced(new THREE.CylinderGeometry(0.008, 0.008, crossLength, 6), matricesFor.crossA);
    instanced(new THREE.CylinderGeometry(0.008, 0.008, crossLength, 6), matricesFor.crossB);
    const curl: THREE.Vector3[] = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14, angle = -Math.PI / 2 + (1 - u) * Math.PI * 3, r = 0.02 + 0.06 * u; curl.push(new THREE.Vector3(0.065 + Math.cos(angle) * r, 0.72 + Math.sin(angle) * r, 0)); }
    const sCurve = [...curl, ...curl.map((p) => new THREE.Vector3(-p.x, 1 - p.y, 0)).reverse()];
    instanced(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sCurve), 60, 0.009, 5), matricesFor.scroll);
    for (const x of [-RX, RX]) { s.rod([x, F, RZ], [x, F + RH + 0.1, RZ], 0.02, iron); s.ball([0.035, 0.045, 0.035], [x, F + RH + 0.13, RZ], iron, 10); }
    if (a.iron === 'mended') {
      const plank = s.material('#9a8468', { roughness: 1 });
      for (const y of [0.3, 0.62]) s.box([0.78, 0.13, 0.025], [gapStart + 0.31, F + y + (random() - 0.5) * 0.06, RZ + 0.015], plank).rotation.z = (random() - 0.5) * 0.12;
      s.rod([gapStart - 0.05, F + 0.9, RZ], [gapStart + 0.67, F + 0.12, RZ + 0.01], 0.006, s.material('#8a5a3a', { metalness: 0.6 }));
    }

    // Swaying things.
    const pendulums: { group: THREE.Group; gain: number; phase: number }[] = [];
    const hang = (at: P, gain: number) => { const part = new Sculpture(context); part.root.position.set(...at); s.root.add(part.root); pendulums.push({ group: part.root, gain, phase: random() * 6 }); return part; };
    const bulbs: THREE.MeshStandardMaterial[] = [];
    if (a.hangs === 'washing') {
      s.rod([-RX, F + RH - 0.08, RZ + 0.1], [RX, F + RH - 0.08, RZ + 0.1], 0.004, s.material('#e9e4d4'));
      for (const x of [-RX, RX]) s.rod([x, F + RH - 0.08, RZ], [x, F + RH - 0.08, RZ + 0.1], 0.006, iron);
      let x = -RX + 0.15;
      while (x < RX - 0.5) {
        const kind = Math.floor(random() * 3), width = [0.42, 0.75, 0.3][kind], drop = [0.5, 0.95, 0.6][kind];
        const cloth = hang([x + width / 2, F + RH - 0.08, RZ + 0.1], 1);
        const colour = cloth.material(pick(['#f4f1e8', '#e8573f', '#3f7fbf', '#f0c22a', '#7fbf8a', '#e9a3c2', '#f4f1e8']), { roughness: 1 });
        cloth.box([width, drop, 0.012], [0, -drop / 2, 0], colour);
        if (kind === 0) for (const k of [-1, 1]) cloth.box([0.16, 0.22, 0.012], [k * (width / 2 + 0.05), -0.14, 0], colour).rotation.z = k * 0.5;
        for (const k of [-1, 1]) cloth.box([0.015, 0.05, 0.02], [k * width * 0.35, 0, 0], cloth.material('#c9a06a'));
        x += width + 0.08 + random() * 0.15;
      }
    } else if (a.hangs === 'flag') {
      const flagCanvas = document.createElement('canvas');
      flagCanvas.width = 300; flagCanvas.height = 600;
      const f = flagCanvas.getContext('2d')!;
      for (let i = 0; i < 5; i++) { f.fillStyle = i % 2 ? '#f4f1e8' : '#1f3c94'; f.fillRect(i * 60, 0, 60, 600); }
      f.fillStyle = '#cf2027'; f.beginPath(); f.moveTo(0, 0); f.lineTo(300, 0); f.lineTo(150, 260); f.fill();
      f.fillStyle = '#f4f1e8'; f.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 44, t = i * Math.PI / 5 + Math.PI; f.lineTo(150 + Math.sin(t) * r, 95 + Math.cos(t) * r); }
      f.fill();
      const map = new THREE.CanvasTexture(flagCanvas); map.colorSpace = THREE.SRGBColorSpace;
      const flag = hang([mix(-0.6, 0.3, random()), F + RH, RZ + 0.03], 0.6);
      flag.mesh(new THREE.PlaneGeometry(0.85, 1.7), new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 }), [0, -0.85, 0]);
    } else if (a.hangs === 'birdcage') {
      const bx = -0.95;
      s.rod([bx, F + 2.1, 0], [bx, F + 2.15, 0.5], 0.012, iron); s.rod([bx, F + 1.8, 0], [bx, F + 2.13, 0.35], 0.008, iron);
      const cage = hang([bx, F + 2.14, 0.48], 0.5);
      const wire = new THREE.MeshStandardMaterial({ color: '#d9d2bf', wireframe: true });
      cage.rod([0, 0, 0], [0, -0.12, 0], 0.004, iron);
      cage.mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 14, 3, true), wire, [0, -0.36, 0]);
      cage.mesh(new THREE.SphereGeometry(0.15, 14, 5, 0, 6.3, 0, Math.PI / 2), wire, [0, -0.21, 0]);
      cage.cylinder(0.155, 0.155, 0.025, [0, -0.52, 0], cage.material('#8a6a3a'), 14);
      cage.ball([0.035, 0.04, 0.05], [0.02, -0.4, 0], cage.material('#f2cf1e'), 10);
      cage.ball([0.024, 0.024, 0.024], [0.02, -0.355, 0.035], cage.material('#f2cf1e'), 8);
      cage.rod([-0.14, -0.44, 0], [0.14, -0.44, 0], 0.005, cage.material('#8a6a3a'));
    } else if (a.hangs === 'sign') {
      const sign = hang([mix(-0.7, 0.2, random()), F + RH - 0.05, RZ + 0.03], 0.25);
      const board = sign.label('SE PERMUTA', 0.9, 0.34, [0, -0.3, 0], '#1f1f1f', '#c9a878');
      board.rotation.z = (random() - 0.5) * 0.1;
      for (const k of [-1, 1]) sign.rod([k * 0.36, -0.14, 0], [k * 0.3, 0, 0], 0.004, sign.material('#e9e4d4'));
    } else if (a.hangs === 'bulbs') {
      const hues = ['#ff4a4a', '#ffd23a', '#4ad27a', '#4aa8ff', '#ff7ad2'];
      const materials = hues.map((hue) => s.material(hue, { emissive: hue, emissiveIntensity: 1.2 }));
      bulbs.push(...materials);
      for (let i = 0; i < 17; i++) { const x = -RX + 0.05 + i * (RX * 2 - 0.1) / 16; s.ball([0.04, 0.055, 0.04], [x, F + RH - 0.07 - Math.abs(Math.sin(i * 1.57)) * 0.06, RZ + 0.03], materials[i % 5], 8); }
      s.tube(Array.from({ length: 17 }, (_unused, i) => [-RX + 0.05 + i * (RX * 2 - 0.1) / 16, F + RH - 0.02 - Math.abs(Math.sin(i * 1.57)) * 0.06, RZ + 0.03] as const), 0.004, shadow);
    }

    if (a.bucket !== 'none') {
      const length = { parked: 0.45, bread: 1.9, keys: 3.05 }[a.bucket];
      const rope = hang([0.98, F + RH, RZ + 0.03], a.bucket === 'parked' ? 0.5 : 0.22);
      rope.rod([0, 0, 0], [0, -length, 0], 0.006, rope.material('#d9c9a0', { roughness: 1 }));
      const pail = rope.material(pick(['#2d6ea8', '#b8bcbc', '#c8372f', '#e9e4d8']), { roughness: 0.5, side: THREE.DoubleSide });
      rope.lathe([[0, 0], [0.1, 0], [0.13, 0.24]], pail, [0, -length - 0.3, 0]);
      rope.mesh(new THREE.TorusGeometry(0.125, 0.006, 5, 14, Math.PI), iron, [0, -length - 0.07, 0]);
      if (a.bucket === 'bread') for (let i = 0; i < 3; i++) rope.rod([(i - 1) * 0.04, -length - 0.26, 0], [(i - 1) * 0.11, -length + 0.12 - random() * 0.1, (random() - 0.5) * 0.12], 0.032, rope.material('#d9a35a', { roughness: 0.9 }));
      if (a.bucket === 'keys') { rope.mesh(new THREE.TorusGeometry(0.035, 0.005, 5, 12), rope.material('#d9c05a', { metalness: 0.8 }), [0.05, -length - 0.07, 0.11]); rope.box([0.015, 0.07, 0.004], [0.05, -length - 0.13, 0.115], rope.material('#d9c05a', { metalness: 0.8 })); }
      if (a.bucket === 'parked') { const coil = s.ring(0.1, 0.02, [0.98, F + 0.03, 0.5], s.material('#d9c9a0', { roughness: 1 })); coil.rotation.x = Math.PI / 2; }
    }

    // Plants.
    if (a.plants === 'tins') {
      const count = Math.round(mix(3, 8, mood.density));
      for (let i = 0; i < count; i++) {
        const x = mix(-1.15, 1.15, (i + random() * 0.7) / count) , z = random() < 0.7 ? 0.6 : 0.2, size = mix(0.09, 0.15, random());
        s.cylinder(size, size * 0.85, size * 1.7, [x, F + size * 0.85, z], s.material(pick(['#b3352b', '#c9a548', '#3f6fae', '#b5673f', '#d9d2bf']), { metalness: 0.2 }), 12);
        const leaf = s.material(new THREE.Color('#3f8a3f').offsetHSL((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.1), { roughness: 0.9 });
        for (let k = 0; k < 4; k++) s.ball([size * 1.1, size * 1.2, size * 1.1], [x + (random() - 0.5) * size * 1.6, F + size * 2.2 + random() * size * 1.6, z + (random() - 0.5) * size * 1.6], leaf, 7);
        if (random() < 0.7) for (let k = 0; k < 5; k++) s.ball([0.04, 0.04, 0.04], [x + (random() - 0.5) * size * 2.4, F + size * 2.6 + random() * size * 2, z + (random() - 0.5) * size * 2.4], s.material(pick(['#e8322a', '#ff6fa0', '#f4f1e8', '#ff9a1f']), { roughness: 0.6 }), 6);
      }
    } else if (a.plants === 'bougainvillea') {
      const sideX = random() < 0.5 ? -1 : 1, points: { at: P; size: number; color: string }[] = [];
      const blooms = Math.round(mix(90, 220, mood.density));
      for (let i = 0; i < blooms; i++) {
        const fall = random() ** 1.6, spread = random();
        const x = sideX * mix(1.35, 0.1, spread * spread) + (random() - 0.5) * 0.3, y = F + 1.15 - fall * 2.6 * (1 - spread * 0.7) + (random() - 0.5) * 0.3;
        points.push({ at: [x, y, RZ + 0.05 + (random() - 0.3) * 0.25 - (y < F ? 0.25 * random() : 0)], size: 0.06 + random() * 0.07, color: random() < 0.3 ? '#3f8a3f' : pick(['#d81f8a', '#e83fa0', '#c2187a', '#f06ab8']) });
      }
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), points);
      s.tube([[sideX * 1.15, F + 0.02, 0.6], [sideX * 1.25, F + 0.6, 0.7], [sideX * 0.9, F + 1.05, 0.78], [sideX * 0.3, F + 1.1, 0.8]], 0.02, s.material('#5a4630'));
      s.cylinder(0.16, 0.13, 0.28, [sideX * 1.12, F + 0.14, 0.58], s.material('#b5673f'), 14);
    } else if (a.plants === 'sapling') {
      const sx = (random() < 0.5 ? -1 : 1) * mix(0.7, 1.4, random());
      s.tube([[sx, H - 0.25, 0.02], [sx + 0.05, H - 0.05, 0.22], [sx - 0.08, H + 0.5, 0.2], [sx + 0.1, H + 1.0, 0.1]], 0.035, s.material('#7a6a55'));
      s.tube([[sx, H - 0.3, 0.02], [sx + 0.12, H - 0.8, 0.03], [sx + 0.05, H - 1.5, 0.02]], 0.014, s.material('#7a6a55'));
      s.tube([[sx, H - 0.3, 0.02], [sx - 0.15, H - 0.7, 0.03], [sx - 0.1, H - 1.1, 0.02]], 0.01, s.material('#7a6a55'));
      const leaf = s.material('#4a8f3a', { roughness: 0.9 });
      for (let i = 0; i < 22; i++) s.ball([0.1 + random() * 0.08, 0.07 + random() * 0.05, 0.1 + random() * 0.07], [sx + (random() - 0.5) * 0.75, H + 0.5 + random() * 0.75, 0.12 + (random() - 0.5) * 0.4], leaf, 8);
    }

    // Ground floor.
    if (a.ground === 'door') {
      s.box([1.4, 2.6, 0.02], [0, 1.45, 0.01], shadow);
      for (const x of [-0.78, 0.78]) s.box([0.18, 2.75, 0.1], [x, 1.375, 0.05], trim);
      s.box([1.74, 0.2, 0.12], [0, 2.85, 0.06], trim);
      s.box([1.9, 0.15, 0.5], [0, 0.075, 0.25], s.material('#a39c8c'));
      const door = (side: number, angle: number) => {
        const leaf = new Sculpture(context);
        leaf.root.position.set(side * -0.7, 0.15, 0.05); leaf.root.rotation.y = side * angle;
        leaf.box([0.7, 2.55, 0.05], [side * 0.35, 1.275, 0], joinery);
        for (const y of [0.5, 1.3, 2.05]) leaf.box([0.46, y > 2 ? 0.6 : 0.55, 0.02], [side * 0.35, y, 0.03], leaf.material(new THREE.Color(paintHue).multiplyScalar(0.8)));
        leaf.ball([0.035, 0.035, 0.035], [side * 0.62, 1.2, 0.05], leaf.material('#c9a548', { metalness: 0.8 }), 8);
        s.root.add(leaf.root);
      };
      door(1, -0.02); door(-1, mix(0.35, 0.8, random()));
    } else if (a.ground === 'grille') {
      s.box([1.1, 1.9, 0.02], [0, 1.75, 0.01], shadow);
      louvre(0.55, 1.88, -0.55, 0.81, 1, -0.03, 0.03); louvre(0.55, 1.88, 0.55, 0.81, -1, -0.03, 0.03);
      s.box([1.5, 0.12, 0.3], [0, 0.72, 0.15], trim); s.box([1.5, 0.12, 0.3], [0, 2.78, 0.15], trim);
      const bars: THREE.Matrix4[] = [];
      for (let i = 0; i <= 12; i++) bars.push(new THREE.Matrix4().makeScale(1, 2.2, 1).setPosition(-0.66 + i * 0.11, 1.75, 0.26));
      for (const x of [-0.66, 0.66]) for (const z of [0.08, 0.17]) bars.push(new THREE.Matrix4().makeScale(1, 2.2, 1).setPosition(x, 1.75, z));
      instanced(new THREE.CylinderGeometry(0.009, 0.009, 0.9, 6), bars);
      for (const y of [1.2, 2.3]) { s.rod([-0.66, y, 0.26], [0.66, y, 0.26], 0.012, iron); for (const x of [-0.66, 0.66]) s.rod([x, y, 0], [x, y, 0.26], 0.012, iron); }
    } else {
      s.box([0.3, 0.2, 0.02], [-1.1, 2.3, 0.012], s.material('#28497a'));
      s.label(String(100 + Math.floor(random() * 700)), 0.26, 0.16, [-1.1, 2.3, 0.024], '#f4f1e8', '#28497a');
      s.box([0.3, 0.42, 0.14], [0.9, 1.6, 0.07], s.material('#8a8f8c', { metalness: 0.4 }));
      s.cylinder(0.09, 0.09, 0.03, [0.9, 1.65, 0.15], s.material('#d9e2e2', { roughness: 0.2 }), 14).rotation.x = Math.PI / 2;
      s.tube([[0.9, 1.8, 0.05], [0.95, 2.6, 0.04], [1.5, 2.8, 0.04], [W / 2, 2.75, 0.04]], 0.012, shadow);
    }
    // A drainpipe and a sagging cable belong to every slice.
    const pipeX = (random() < 0.5 ? -1 : 1) * (W / 2 - 0.12);
    s.cylinder(0.05, 0.05, H - 0.7, [pipeX, (H - 0.7) / 2 + 0.25, 0.06], s.material(mood.wear > 0.5 ? '#8a5a3a' : '#5a6a6a', { metalness: 0.4 }), 10);
    s.tube([[-W / 2, F + 2.9, 0.03], [-0.5, F + 2.75 - random() * 0.2, 0.06], [0.6, F + 2.85, 0.06], [W / 2, F + 3.05, 0.03]], 0.008, shadow);

    const wind = mix(0.02, 0.2, mood.energy);
    const base = curtain ? Float32Array.from(curtain.geometry.attributes.position.array) : null;
    const billow = (time: number) => {
      if (!curtain || !base) return;
      const position = curtain.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const y = base[i * 3 + 1], drop = (1.1 - y) / 2.2;
        position.setZ(i, drop * drop * (0.55 + Math.sin(time * 1.7 + base[i * 3] * 4) * wind * 1.6) + Math.sin(base[i * 3] * 9 + time * 2.3) * 0.03 * drop);
      }
      position.needsUpdate = true;
      curtain.geometry.computeVertexNormals();
    };
    billow(0);
    return s.finish({
      update: (_dt, time) => {
        pendulums.forEach((p) => { p.group.rotation.x = Math.sin(time * 1.6 + p.phase) * wind * p.gain; p.group.rotation.z = Math.sin(time * 1.1 + p.phase * 2) * wind * p.gain * 0.5; });
        bulbs.forEach((bulb, index) => { bulb.emissiveIntensity = 0.4 + (Math.sin(time * 3 + index * 1.3) > 0 ? 1.3 : 0); });
        billow(time);
      },
    });
  },
});
