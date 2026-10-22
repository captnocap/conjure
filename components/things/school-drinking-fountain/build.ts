import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const TILES = {
  white: 'Plain white gloss tiles with dark grout, clean and clinical.',
  mint: 'Pale mint green tiles with a darker green trim row.',
  butter: 'Butter yellow tiles with a brown trim row, sunny and dated.',
  sky: 'Sky blue tiles with a navy trim row, swimming-baths fresh.',
  brown: 'Brown and orange 1970s tiles, heavy and warm.',
  chequer: 'Black and white chequerboard tiles.',
  mosaic: 'Small mixed mosaic tiles in children’s colours.',
} as const;
const TILE: Record<keyof typeof TILES, { main: string[]; trim: string; grout: string; size: number }> = {
  white: { main: ['#eef0ec'], trim: '#dfe3df', grout: '#6f7672', size: 0.1 },
  mint: { main: ['#bfdccb'], trim: '#3f7a5c', grout: '#8fa79a', size: 0.1 },
  butter: { main: ['#ecd98a'], trim: '#7a4f2a', grout: '#a59a6a', size: 0.1 },
  sky: { main: ['#a9d2ea'], trim: '#23466f', grout: '#7f9fb4', size: 0.1 },
  brown: { main: ['#9a5a30', '#b8702f', '#7c4526'], trim: '#e0a03a', grout: '#3f2a1c', size: 0.1 },
  chequer: { main: ['#f0efe9', '#1f2224'], trim: '#1f2224', grout: '#8a8a86', size: 0.1 },
  mosaic: { main: ['#e85a4a', '#f2c63a', '#3f9ad8', '#5cb86a', '#f3f0e6', '#f3f0e6', '#f08a3a'], trim: '#3f9ad8', grout: '#d8d6cc', size: 0.05 },
};

export default defineThing({
  questions: {
    kind: choice('What kind of fountain is it?', {
      steel: 'A single stainless steel bowl on a bracket with a chrome bubbler.',
      porcelain: 'A heavy white porcelain basin with a tall splashback, Victorian board-school plumbing.',
      twin: 'Two steel bowls side by side, one low for the little ones and one higher.',
      trough: 'A long shared trough with three bubblers in a row, built for a queue.',
      cooler: 'A floor-standing refrigerated steel cabinet with a push bar, humming.',
    }),
    tiles: choice('What are the tiles behind it like?', TILES),
    step: choice('What is the step for small children?', {
      none: 'There is no step.',
      timber: 'A painted wooden box step, scuffed by years of shoes.',
      built: 'A built-in tiled step running the width of the slab.',
      stool: 'A bright plastic two-step stool.',
      crate: 'An upturned milk crate somebody put there.',
    }),
    water: choice('What is the water doing?', {
      dry: 'Dry; switched off for the holidays.',
      drip: 'A slow drip falling from the spout.',
      arc: 'A thin clean arc of water, as if someone just let go of the button.',
      stuck: 'Stuck on: a steady arc, an overflowing bowl and a puddle spreading on the floor.',
    }),
    sign: choice('What notice is fixed above it?', {
      none: 'No notice.',
      drinking: 'DRINKING WATER on a blue plate.',
      order: 'OUT OF ORDER on a taped sheet of paper.',
      queue: 'ONE AT A TIME on a yellow plate.',
      wash: 'NOT FOR WASHING PAINT POTS, hand-lettered.',
    }),
    left: choice('What has been left behind at the fountain?', {
      nothing: 'Nothing.',
      bottle: 'A child’s water bottle standing forgotten.',
      jumper: 'A school jumper dropped in a heap.',
      ball: 'A tennis ball sitting in the bowl.',
      cups: 'A scatter of crushed paper cone cups.',
      plant: 'A weed growing out of the drain, taking its chance.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const wide = a.kind === 'twin' || a.kind === 'trough';
    const W = wide ? 1.6 : 1.1, SH = 1.55, SD = 0.12, front = SD / 2;
    const tile = TILE[a.tiles];
    const textures: THREE.Texture[] = [];

    // Centres of the bowls, for stains on the tiles and for water.
    const spouts: { x: number; y: number; z: number; drainZ: number }[] = [];
    if (a.kind === 'steel' || a.kind === 'porcelain') spouts.push({ x: 0, y: 0.78, z: front + 0.1, drainZ: front + 0.22 });
    if (a.kind === 'twin') spouts.push({ x: -0.36, y: 0.6, z: front + 0.1, drainZ: front + 0.22 }, { x: 0.36, y: 0.84, z: front + 0.1, drainZ: front + 0.22 });
    if (a.kind === 'trough') for (const x of [-0.45, 0, 0.45]) spouts.push({ x, y: 0.72, z: front + 0.07, drainZ: front + 0.2 });
    if (a.kind === 'cooler') spouts.push({ x: 0, y: 0.98, z: front + 0.12, drainZ: front + 0.24 });

    // Tiled backing slab, painted.
    const px = 320;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(W * px); canvas.height = Math.round(SH * px);
    const g = canvas.getContext('2d')!;
    const tp = tile.size * px;
    const cols = Math.round(W / tile.size), rows = Math.ceil(SH / tile.size);
    g.fillStyle = tile.grout; g.fillRect(0, 0, canvas.width, canvas.height);
    const shade = (hex: string, d: number) => `#${new THREE.Color(hex).offsetHSL(0, 0, d).lerp(new THREE.Color('#8b8275'), wear * 0.2).getHexString()}`;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const trim = r === 1 || (a.tiles !== 'mosaic' && r === rows - 1);
      const base = trim ? tile.trim : a.tiles === 'chequer' ? tile.main[(r + c) % 2] : tile.main[Math.floor(random() * tile.main.length)];
      const missing = random() < wear * wear * 0.12;
      g.fillStyle = missing ? '#9a958a' : shade(base, (random() - 0.5) * 0.05);
      const gap = Math.max(1.5, tp * 0.05);
      g.fillRect(c * tp + gap, r * tp + gap, tp - gap * 2, tp - gap * 2);
      if (!missing) { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(c * tp + gap, r * tp + gap, tp - gap * 2, tp * 0.14); }
      if (!missing && random() < wear * 0.2) { g.strokeStyle = 'rgba(40,36,30,0.6)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(c * tp + random() * tp, r * tp + gap); g.lineTo(c * tp + random() * tp, r * tp + tp - gap); g.stroke(); }
    }
    for (const spout of spouts) {
      // Limescale and rust run down the wall from every bowl.
      const u = (spout.x + W / 2) * px, v = (SH - spout.y) * px;
      const streaks = 2 + Math.floor(wear * 8);
      for (let i = 0; i < streaks; i++) {
        const x = u + (random() - 0.5) * 0.3 * px, len = (0.15 + random() * 0.5) * px;
        const grad = g.createLinearGradient(0, v, 0, v + len);
        const rust = random() < wear * 0.6;
        grad.addColorStop(0, rust ? `rgba(140,78,34,${0.2 + wear * 0.45})` : `rgba(250,250,244,${0.25 + wear * 0.4})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad; g.fillRect(x, v, 3 + random() * 9, len);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    textures.push(tex);
    const plaster = s.material('#d9d4c6', { roughness: 0.9 });
    const tiled = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25 + wear * 0.4 });
    s.mesh(new THREE.BoxGeometry(W, SH, SD), [plaster, plaster, plaster, plaster, tiled, plaster] as unknown as THREE.Material, [0, SH / 2, 0]);
    s.box([W + 0.04, 0.04, SD + 0.04], [0, SH + 0.02, 0], s.material(tile.trim, { roughness: 0.4 }));

    const steel = s.material('#c5cbcd', { metalness: 0.85, roughness: 0.28 + wear * 0.2, side: THREE.DoubleSide });
    const chrome = s.material('#e3e7e8', { metalness: 0.95, roughness: 0.15 });
    const porcelain = s.material('#f3f1ea', { roughness: 0.18, side: THREE.DoubleSide });
    const dark = s.material('#2a2d2f', { roughness: 0.6 });
    const waterMat = new THREE.MeshStandardMaterial({ color: '#d8f2fc', transparent: true, opacity: 0.9, roughness: 0.05, emissive: '#aee0f5', emissiveIntensity: 0.6, depthWrite: false });
    const poolMat = new THREE.MeshStandardMaterial({ color: '#a9d8ea', transparent: true, opacity: 0.5, roughness: 0.02, metalness: 0.3, depthWrite: false });

    const bubbler = (x: number, y: number, z: number) => {
      s.cylinder(0.014, 0.02, 0.05, [x, y + 0.025, z], chrome, 12);
      s.ball([0.02, 0.016, 0.02], [x, y + 0.055, z], chrome, 10);
      // Mouth guard hoop.
      const guard = s.ring(0.03, 0.004, [x, y + 0.05, z + 0.012], chrome, Math.PI);
      guard.rotation.y = 0;
      guard.rotation.x = -0.5;
    };
    const bowlProfile: [number, number][] = [[0.03, -0.16], [0.1, -0.14], [0.17, -0.07], [0.205, -0.01], [0.21, 0], [0.19, 0], [0.17, -0.03], [0.09, -0.085], [0.015, -0.1]];
    const steelBowl = (x: number, y: number) => {
      const z = front + 0.2;
      s.lathe(bowlProfile, steel, [x, y, z]);
      s.box([0.3, 0.14, 0.06], [x, y - 0.06, front + 0.03], steel);
      s.box([0.34, 0.08, 0.015], [x, y + 0.03, front + 0.008], steel);
      s.cylinder(0.014, 0.014, 0.01, [x, y - 0.098, z], dark, 10);
      bubbler(x, y - 0.015, front + 0.075);
      // Push button on the front lip and a waste pipe back to the wall.
      const button = s.cylinder(0.022, 0.022, 0.02, [x + 0.13, y - 0.05, z + 0.13], chrome, 14);
      button.rotation.x = Math.PI / 2; button.rotation.z = -0.7;
      s.tube([[x, y - 0.16, z], [x, y - 0.26, z], [x, y - 0.3, z - 0.06], [x, y - 0.24, z - 0.12], [x, y - 0.24, front]], 0.02, chrome);
    };

    if (a.kind === 'steel') steelBowl(0, 0.78);
    if (a.kind === 'twin') { steelBowl(-0.36, 0.6); steelBowl(0.36, 0.84); s.tube([[-0.36, 0.36, front + 0.02], [0.0, 0.34, front + 0.02], [0.36, 0.6, front + 0.02]], 0.014, chrome); }
    if (a.kind === 'porcelain') {
      const y = 0.78, z = front + 0.2;
      const bowl = s.lathe(bowlProfile, porcelain, [0, y, z]);
      bowl.scale.set(1.25, 1.15, 1.05);
      s.box([0.56, 0.36, 0.05], [0, y + 0.13, front + 0.025], porcelain);
      s.cylinder(0.28, 0.28, 0.05, [0, y + 0.31, front + 0.025], porcelain, 24).rotation.x = Math.PI / 2;
      s.box([0.5, 0.05, 0.42], [0, y - 0.01, front + 0.2], porcelain).visible = false;
      for (const side of [-1, 1]) s.box([0.03, 0.2, 0.26], [side * 0.2, y - 0.14, front + 0.12], s.material('#3a3d3f', { metalness: 0.5 })).rotation.x = 0.5;
      // A brass lion-less spout from the splashback, and a brass push knob.
      const brass = s.material('#b8923a', { metalness: 0.8, roughness: 0.3 });
      s.tube([[0, y + 0.16, front + 0.04], [0, y + 0.17, front + 0.1], [0, y + 0.1, front + 0.12]], 0.013, brass);
      s.cylinder(0.025, 0.025, 0.03, [0.16, y + 0.14, front + 0.06], brass, 12).rotation.x = Math.PI / 2;
      s.cylinder(0.014, 0.014, 0.01, [0, y - 0.113, z], dark, 10);
      s.tube([[0, y - 0.18, z], [0, y - 0.32, z], [0, y - 0.36, z - 0.07], [0, y - 0.28, z - 0.13], [0, y - 0.28, front]], 0.024, s.material('#8a8f8a', { metalness: 0.6 }));
      spouts[0].y = y + 0.06; spouts[0].z = front + 0.12;
    }
    if (a.kind === 'trough') {
      const y = 0.72, L = 1.34, d = 0.3, h = 0.16, zc = front + d / 2;
      s.box([L, 0.015, d], [0, y - h, zc], steel);
      s.box([L, h, 0.015], [0, y - h / 2, front + d], steel);
      s.box([L, h + 0.12, 0.015], [0, y - h / 2 + 0.06, front + 0.008], steel);
      for (const side of [-1, 1]) s.box([0.015, h, d], [side * L / 2, y - h / 2, zc], steel);
      for (const x of [-0.45, 0, 0.45]) { bubbler(x, y - 0.03, front + 0.06); s.box([0.05, 0.05, 0.05], [x, y - 0.02, front + 0.035], steel); const b = s.cylinder(0.02, 0.02, 0.02, [x, y - 0.07, front + d + 0.012], chrome, 12); b.rotation.x = Math.PI / 2; }
      for (const x of [-0.5, 0.5]) { s.rod([x, y - h, front + d - 0.03], [x, y - h - 0.26, front], 0.014, dark); }
      s.tube([[0.3, y - h, zc], [0.3, y - h - 0.12, zc], [0.3, y - h - 0.16, zc - 0.06], [0.3, y - h - 0.16, front]], 0.022, chrome);
    }
    if (a.kind === 'cooler') {
      const w = 0.42, h = 0.96, d = 0.4, zc = front + d / 2;
      const cab = s.material('#aeb5b8', { metalness: 0.7, roughness: 0.38 });
      s.box([w, h - 0.04, d], [0, (h - 0.04) / 2 + 0.04, zc], cab);
      s.box([w - 0.04, 0.04, d - 0.04], [0, 0.02, zc], dark);
      for (let i = 0; i < 8; i++) s.box([w * 0.7, 0.012, 0.006], [0, 0.12 + i * 0.03, front + d + 0.002], dark);
      s.box([w * 0.8, 0.07, 0.03], [0, h - 0.14, front + d + 0.012], chrome);
      // Top: a rim around a sunken basin.
      s.box([w, 0.012, d], [0, h + 0.005, zc], dark);
      for (const side of [-1, 1]) s.box([0.03, 0.035, d], [side * (w / 2 - 0.015), h + 0.016, zc], steel);
      s.box([w, 0.035, 0.03], [0, h + 0.016, front + d - 0.015], steel);
      s.box([w, 0.09, 0.06], [0, h + 0.045, front + 0.03], steel);
      bubbler(-0.08, h + 0.01, front + 0.1);
      s.cylinder(0.02, 0.02, 0.006, [0.03, h + 0.012, front + 0.25], chrome, 12);
      spouts[0] = { x: -0.08, y: h + 0.07, z: front + 0.1, drainZ: front + 0.25 };
    }

    // Water.
    const drops: THREE.Mesh[] = [];
    const arcs: THREE.Mesh[] = [];
    const running = a.water === 'arc' || a.water === 'stuck';
    spouts.forEach((spout, index) => {
      const on = running && (index === 0 || (a.water === 'stuck' && a.kind !== 'twin'));
      const sy = a.kind === 'porcelain' || a.kind === 'cooler' ? spout.y : spout.y + 0.04;
      if (on) {
        const points: [number, number, number][] = [];
        const reach = spout.drainZ - spout.z + 0.03, rise = 0.16;
        for (let i = 0; i <= 10; i++) { const t = i / 10; points.push([spout.x + t * 0.03, sy + rise * 4 * t * (1 - t) * (a.kind === 'porcelain' ? 0.3 : 1) - t * t * 0.1, spout.z + reach * t]); }
        const arc = s.tube(points, 0.012, waterMat);
        arc.castShadow = false;
        arcs.push(arc);
      } else if (a.water === 'drip' && index === 0) {
        for (let i = 0; i < 2; i++) { const drop = s.ball([0.008, 0.013, 0.008], [spout.x, sy - 0.02 - i * 0.05, spout.z + 0.012], waterMat, 8); drop.castShadow = false; drop.userData.top = sy - 0.005; drop.userData.phase = i * 0.5; drops.push(drop); }
      }
    });
    if (a.water === 'stuck') {
      for (const spout of spouts.slice(0, a.kind === 'twin' ? 1 : spouts.length)) {
        if (a.kind !== 'trough' && a.kind !== 'cooler') s.cylinder(0.17, 0.17, 0.004, [spout.x, (a.kind === 'porcelain' ? 0.78 : spout.y) - 0.012, front + 0.2], poolMat, 24).castShadow = false;
        const fall = s.box([0.1, (a.kind === 'cooler' ? 0.98 : spout.y) - 0.02, 0.006], [spout.x + 0.05, ((a.kind === 'cooler' ? 0.98 : spout.y) - 0.02) / 2, front + (a.kind === 'cooler' ? 0.405 : a.kind === 'trough' ? 0.31 : 0.415)], waterMat);
        fall.castShadow = false;
      }
      if (a.kind === 'trough') s.box([1.3, 0.004, 0.27], [0, 0.71, front + 0.15], poolMat).castShadow = false;
      const puddle = new THREE.Shape();
      for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, r = 0.42 + Math.sin(t * 3 + random() * 0.5) * 0.08 + random() * 0.05; const x = Math.cos(t) * r * (wide ? 1.7 : 1.15), y = Math.sin(t) * r; if (i === 0) puddle.moveTo(x, y); else puddle.lineTo(x, y); }
      const pool = s.mesh(new THREE.ShapeGeometry(puddle), new THREE.MeshStandardMaterial({ color: '#8fbfd4', roughness: 0.03, metalness: 0.5 }), [0, 0.004, front + 0.6]);
      pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
    }

    // The step.
    let perch: [number, number, number] = [0.32, 0, front + 0.5];
    const stepX = a.kind === 'twin' ? -0.36 : 0;
    if (a.step === 'timber') {
      const paintCol = s.material(mood.cheer > 0.5 ? '#d8452f' : '#5f7a8a', { roughness: 0.7 });
      s.box([0.6, 0.16, 0.3], [stepX, 0.08, front + 0.5], paintCol);
      s.box([0.64, 0.025, 0.34], [stepX, 0.172, front + 0.5], s.material('#b98f5a', { roughness: 0.8 }));
      s.box([0.14, 0.04, 0.01], [stepX, 0.1, front + 0.651], dark);
      perch = [stepX + 0.18, 0.185, front + 0.5];
    } else if (a.step === 'built') {
      const stepMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(tile.main[0]).lerp(new THREE.Color('#8b8275'), 0.15 + wear * 0.2), roughness: 0.4 });
      s.box([W, 0.15, 0.42], [0, 0.075, front + 0.21], stepMat);
      s.box([W + 0.01, 0.03, 0.03], [0, 0.14, front + 0.42], s.material(tile.trim));
      perch = [stepX + 0.3, 0.15, front + 0.25];
    } else if (a.step === 'stool') {
      const plastic = s.material(['#e8473a', '#f2c230', '#2f8fd8', '#4ab05a'][Math.floor(random() * 4)], { roughness: 0.35 });
      s.box([0.42, 0.13, 0.34], [stepX, 0.065, front + 0.52], plastic);
      s.box([0.42, 0.13, 0.17], [stepX, 0.195, front + 0.435], plastic);
      for (let i = 0; i < 5; i++) s.box([0.3, 0.004, 0.012], [stepX, 0.262, front + 0.38 + i * 0.027], dark);
      perch = [stepX + 0.38, 0, front + 0.5];
    } else if (a.step === 'crate') {
      const crate = s.material(mood.cheer > 0.5 ? '#2f8fd8' : '#b83a2c', { roughness: 0.5 });
      const cw = 0.36, ch = 0.26;
      s.box([cw, 0.02, cw], [stepX, ch - 0.01, front + 0.5], crate);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) s.box([0.03, ch, 0.03], [stepX + sx * (cw / 2 - 0.015), ch / 2, front + 0.5 + sz * (cw / 2 - 0.015)], crate);
      for (const y of [0.03, 0.11, 0.19]) { for (const sz of [-1, 1]) s.box([cw, 0.035, 0.012], [stepX, y, front + 0.5 + sz * (cw / 2 - 0.006)], crate); for (const sx of [-1, 1]) s.box([0.012, 0.035, cw], [stepX + sx * (cw / 2 - 0.006), y, front + 0.5], crate); }
      for (let i = -1; i <= 1; i++) s.box([0.02, 0.022, cw], [stepX + i * 0.09, ch - 0.011, front + 0.5], dark).visible = false;
      perch = [stepX + 0.4, 0, front + 0.5];
    }

    // Notice above.
    if (a.sign !== 'none') {
      const text = { drinking: 'DRINKING WATER', order: 'OUT OF ORDER', queue: 'ONE AT A TIME', wash: 'NOT FOR PAINT POTS' }[a.sign];
      const [ink, paper] = { drinking: ['#ffffff', '#1f5fa8'], order: ['#b02a20', '#f4f0e2'], queue: ['#1c1c1c', '#f0c62a'], wash: ['#2a2a6a', '#f4f0e2'] }[a.sign];
      const paperSign = a.sign === 'order' || a.sign === 'wash';
      const sign = s.label(text, paperSign ? 0.5 : 0.56, paperSign ? 0.2 : 0.13, [0, 1.32, front + 0.004], ink, paper);
      sign.castShadow = false;
      if (paperSign) { sign.rotation.z = (random() - 0.5) * 0.14; for (const side of [-1, 1]) s.box([0.08, 0.03, 0.002], [side * 0.24, 1.42 + side * sign.rotation.z * 0.24, front + 0.006], s.material('#d9c27a')).rotation.z = side * 0.6; }
    }

    // Left behind.
    const first = spouts[0];
    if (a.left === 'bottle') {
      const col = s.material(mood.cheer > 0.5 ? '#f05aa0' : '#3f9ad8', { roughness: 0.3 });
      s.cylinder(0.035, 0.035, 0.17, [perch[0], perch[1] + 0.085, perch[2]], col, 16);
      s.cylinder(0.02, 0.034, 0.03, [perch[0], perch[1] + 0.185, perch[2]], col, 16);
      s.cylinder(0.022, 0.022, 0.03, [perch[0], perch[1] + 0.215, perch[2]], s.material('#f3f1ea'), 12);
      s.ring(0.035, 0.005, [perch[0], perch[1] + 0.2, perch[2] + 0.02], s.material('#f3f1ea')).rotation.y = Math.PI / 2;
    } else if (a.left === 'jumper') {
      const wool = s.material(['#7a1f2a', '#1f3f7a', '#2f6a45', '#6a6f75'][Math.floor(random() * 4)], { roughness: 1 });
      const [jx, jy, jz] = [perch[0] + 0.05, perch[1], perch[2] + 0.05];
      s.ball([0.2, 0.06, 0.16], [jx, jy + 0.05, jz], wool, 14).rotation.y = random() * 3;
      s.ball([0.1, 0.045, 0.2], [jx + 0.12, jy + 0.04, jz + 0.08], wool, 12).rotation.y = 0.8;
      s.ball([0.09, 0.04, 0.19], [jx - 0.13, jy + 0.035, jz - 0.03], wool, 12).rotation.y = -0.6;
      s.ring(0.05, 0.016, [jx, jy + 0.1, jz - 0.03], wool).rotation.x = Math.PI / 2 - 0.3;
    } else if (a.left === 'ball') {
      const by = a.kind === 'cooler' ? 1.0 : a.kind === 'trough' ? 0.6 : (a.kind === 'porcelain' ? 0.72 : first.y - 0.06);
      s.ball([0.034, 0.034, 0.034], [first.x + 0.04, by + 0.01, first.drainZ + 0.02], s.material('#c8e03a', { roughness: 0.95 }), 14);
    } else if (a.left === 'cups') {
      const paper = s.material('#f1eee2', { roughness: 0.9 });
      const n = 4 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const cup = s.cylinder(0.035, 0.002, 0.09, [(random() - 0.5) * (W - 0.2), 0.03, front + 0.25 + random() * 0.55], paper, 10);
        cup.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, random() * 6.3);
        cup.scale.z = 0.5 + random() * 0.5;
      }
    } else if (a.left === 'plant') {
      const leaf = s.material('#5a9a3a', { roughness: 0.8 });
      const py = a.kind === 'cooler' ? 0.99 : a.kind === 'trough' ? 0.57 : (a.kind === 'porcelain' ? 0.67 : first.y - 0.1);
      const pz = first.drainZ, pxx = a.kind === 'cooler' ? 0.03 : first.x;
      for (let i = 0; i < 5; i++) {
        const t = i * 1.3 + random(), h = 0.08 + random() * 0.09;
        s.tube([[pxx, py, pz], [pxx + Math.cos(t) * 0.03, py + h * 0.6, pz + Math.sin(t) * 0.03], [pxx + Math.cos(t) * 0.09, py + h, pz + Math.sin(t) * 0.07]], 0.004, leaf);
        const blade = s.ball([0.03, 0.006, 0.016], [pxx + Math.cos(t) * 0.1, py + h, pz + Math.sin(t) * 0.08], leaf, 8);
        blade.rotation.y = -t;
      }
      s.ball([0.018, 0.018, 0.018], [pxx + 0.01, py + 0.2, pz], s.material('#f2d43a'), 8);
      s.rod([pxx, py, pz], [pxx + 0.01, py + 0.2, pz], 0.003, leaf);
    }

    const speed = mix(0.4, 1.6, mood.energy);
    const thing = s.finish({
      update: drops.length || arcs.length ? (_dt, time) => {
        for (const drop of drops) { const t = (time * speed * 0.7 + drop.userData.phase) % 1; drop.position.y = drop.userData.top - t * t * 0.14; drop.scale.setScalar(t < 0.15 ? 0.006 + t * 0.03 : 0.011); }
        for (const arc of arcs) arc.scale.y = 1 + Math.sin(time * 9 * speed) * 0.006;
      } : undefined,
    });
    const dispose = thing.dispose;
    return { ...thing, dispose: () => { for (const t of textures) t.dispose(); dispose(); } };
  },
});
