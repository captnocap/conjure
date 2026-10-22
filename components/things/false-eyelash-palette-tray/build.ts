import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type V3 = [number, number, number];

const PALETTES = {
  classic: ['#b3121f', '#d9a441', '#7a1420', '#f0d89a', '#8c5a2b', '#1c1416', '#e2574c', '#c98f2e'],
  neon: ['#ff2bd6', '#39ff14', '#fff01f', '#00e5ff', '#ff6a00', '#b026ff', '#ff1744', '#1e90ff'],
  pastel: ['#f7c6d9', '#c9e4f5', '#d9c9f2', '#c8f0d4', '#fdf0b8', '#f9d2b6', '#e8b8e0', '#b8e0e0'],
  goth: ['#0f0f12', '#3a3a40', '#6d6d75', '#a9a9b0', '#4a0d17', '#1d1a2b', '#d9d9df', '#26262b'],
  jewel: ['#0f7a4f', '#1a3fa8', '#6a1fa0', '#a8123a', '#0e7f8c', '#c79a1e', '#3d1466', '#12603d'],
  nude: ['#e6c7a8', '#c79b78', '#9a6b4b', '#6e4630', '#f1ddc8', '#b7826a', '#4b2f22', '#dcae96'],
} as const;

export default defineThing({
  questions: {
    palette: choice('What palette of colours fills the pans?', {
      classic: 'Classic showgirl reds, golds and bronze with one black.',
      neon: 'Neon club-kid brights: acid green, hot pink, electric yellow and cyan.',
      pastel: 'Soft pastels: baby pink, lilac, mint and butter.',
      goth: 'Monochrome goth: blacks, greys and silver with one oxblood.',
      jewel: 'Deep jewel tones: emerald, sapphire, amethyst and ruby.',
      nude: 'Skin tones and browns for contour, a working kit.',
    }),
    used: score('How far through the palette is its owner?', ['Brand new, every pan untouched', 'A few favourites dipped into', 'Well loved, several hitting pan', 'Scraped to the metal, powder everywhere']),
    uncapped: choice('Which item is uncapped, left mid-use?', {
      lipstick: 'A lipstick twisted all the way up, its cap lying beside it.',
      glue: 'A purple glue stick for flattening brows, cap off and smeared.',
      mascara: 'A mascara, the wand pulled out and set down.',
      liner: 'A liquid eyeliner pen, with a test flick drawn on the towel.',
      lashglue: 'A tiny tube of lash glue with a bead squeezed out, one lash waiting beside it.',
      none: 'Nothing; everything is capped and put back.',
    }),
    lashes: choice('What are the false lashes like?', {
      wispy: 'Long wispy fans, the everyday pair.',
      feather: 'Enormous thick feathered drag lashes, stacked three deep.',
      spider: 'Spiky clumped spider-leg lashes.',
      colour: 'Coloured lashes with a line of rhinestones along the band.',
    }),
    box: choice('What kind of case is it?', {
      train: 'A black professional train case with aluminium edges.',
      caboodle: 'A bubblegum plastic caboodle from a teenage bedroom.',
      tin: 'An old enamelled biscuit tin pressed into service.',
      compact: 'A slim black-and-gold cardboard palette from a department store.',
    }),
    cloth: choice('What is it all laid out on?', {
      white: 'A white hand towel, soon to be ruined.',
      black: 'A black velvet cloth.',
      pink: 'A pink bar towel.',
      newspaper: 'Yesterday’s newspaper.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = PALETTES[a.palette];
    const use = clamp01(a.used * 0.85 + mood.wear * 0.3);
    const pick = () => colours[Math.floor(random() * colours.length)];
    const lay = (group: THREE.Object3D, at: V3, turn: number) => { group.position.set(...at); group.rotation.y = turn; s.root.add(group); return group; };
    const part = (mesh: THREE.Mesh, group: THREE.Object3D) => { group.add(mesh); return mesh; };

    // ---- Cloth ----
    const clothColour = { white: '#f1eee6', black: '#1d1b22', pink: '#f2a7c0', newspaper: '#d9d4c2' }[a.cloth];
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = clothColour; ctx.fillRect(0, 0, 512, 512);
    if (a.cloth === 'newspaper') {
      ctx.fillStyle = '#3d3b36';
      ctx.fillRect(24, 24, 300, 26);
      for (let col = 0; col < 4; col++) for (let row = 0; row < 44; row++) ctx.fillRect(24 + col * 120, 70 + row * 10, 70 + random() * 36, 3);
      ctx.fillStyle = '#8d8a80'; ctx.fillRect(264, 180, 216, 130);
    } else {
      ctx.globalAlpha = 0.08; ctx.fillStyle = a.cloth === 'black' ? '#ffffff' : '#000000';
      for (let i = 0; i < 64; i++) ctx.fillRect(0, i * 8, 512, 2);
      if (a.cloth !== 'black') { ctx.globalAlpha = 0.5; ctx.fillStyle = a.cloth === 'pink' ? '#ffffff' : '#7fa7c9'; ctx.fillRect(0, 30, 512, 14); ctx.fillRect(0, 468, 512, 14); }
    }
    for (let i = 0; i < use * 26; i++) {
      const x = random() * 512, y = 200 + random() * 300, r = 10 + random() * 34;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, pick()); blot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.25 + random() * 0.4; ctx.fillStyle = blot; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    const clothTex = new THREE.CanvasTexture(canvas);
    clothTex.colorSpace = THREE.SRGBColorSpace;
    const cloth = s.box([0.6, 0.008, 0.48], [0, 0.004, 0.04], new THREE.MeshStandardMaterial({ map: clothTex, roughness: 1 }));
    cloth.rotation.y = (random() - 0.5) * 0.12;
    const T = 0.008;

    // ---- Case ----
    const slim = a.box === 'compact';
    const W = 0.37, D = slim ? 0.2 : 0.24, h = slim ? 0.016 : 0.04, cz = -0.06;
    const shellMat = {
      train: s.material('#18181c', { roughness: 0.55 }),
      caboodle: s.material(mood.cheer > 0.5 ? '#ff7ab8' : '#58c4c0', { roughness: 0.35 }),
      tin: s.material('#3f7d6a', { roughness: 0.4, metalness: 0.5 }),
      compact: s.material('#121214', { roughness: 0.4 }),
    }[a.box];
    const metal = s.material(a.box === 'compact' || a.box === 'tin' ? '#c9a13c' : '#c9ced2', { metalness: 0.85, roughness: 0.25 });
    const insert = s.material(a.box === 'caboodle' ? '#f6f0f3' : '#0d0d10', { roughness: 0.8 });
    const box = new THREE.Group();
    box.position.set(0, T, cz);
    box.rotation.y = (random() - 0.5) * 0.16;
    s.root.add(box);
    part(s.box([W, h, D], [0, h / 2, 0], shellMat), box);
    part(s.box([W - 0.016, 0.004, D - 0.016], [0, h, 0], insert), box);
    if (a.box === 'train' || a.box === 'tin') {
      for (const sx of [-1, 1]) part(s.box([0.008, h + 0.002, D + 0.004], [sx * W / 2, h / 2, 0], metal), box);
      part(s.box([W + 0.004, h + 0.002, 0.008], [0, h / 2, D / 2], metal), box);
      part(s.box([0.04, 0.022, 0.008], [0, h * 0.6, D / 2 + 0.004], metal), box);
    }
    if (a.box === 'caboodle') part(s.box([0.07, 0.02, 0.012], [0, h * 0.6, D / 2 + 0.004], s.material('#fff06a')), box);
    // Lid, hinged at the back, with a mirror inside.
    const lid = new THREE.Group();
    lid.position.set(0, h, -D / 2);
    lid.rotation.x = -mix(0.12, 0.42, random());
    box.add(lid);
    const lt = slim ? 0.008 : 0.022;
    part(s.box([W, D, lt], [0, D / 2, -lt / 2], shellMat), lid);
    const mirror = part(s.box([W * 0.82, D * 0.72, 0.002], [0, D / 2, 0.002], s.material('#b9c9cf', { metalness: 0.9, roughness: 0.08, emissive: '#8fa3ab', emissiveIntensity: 0.35 })), lid);
    mirror.castShadow = false;
    if (a.box === 'train' || a.box === 'tin') { for (const sx of [-1, 1]) part(s.box([0.008, D + 0.004, lt + 0.002], [sx * W / 2, D / 2, -lt / 2], metal), lid); part(s.box([W + 0.004, 0.008, lt + 0.002], [0, D, -lt / 2], metal), lid); }
    if (slim) { const logo = s.label('GLAMOUR', 0.2, 0.03, [0, D * 0.93, 0.004], '#c9a13c', '#121214'); lid.add(logo); }

    // Eyeshadow pans.
    const square = a.box === 'train' || a.box === 'compact';
    const cols = 5, rows = slim ? 3 : 4, px = 0.046, pz = (D - 0.05) / rows, r = 0.019;
    const panGeo = square ? new THREE.BoxGeometry(r * 2, 0.004, r * 2) : new THREE.CylinderGeometry(r, r, 0.004, 20);
    const pans: { at: V3; size: number; color: string }[] = [], hits: { at: V3; size: number }[] = [], dust: { at: V3; size: number; color: string }[] = [];
    const offset = Math.floor(random() * colours.length);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = -W / 2 + 0.036 + i * px, z = -D / 2 + 0.034 + j * pz;
      const colour = new THREE.Color(colours[(i + j * 3 + offset) % colours.length]).offsetHSL(0, 0, (random() - 0.5) * 0.1);
      pans.push({ at: [x, h + 0.004, z], size: 1, color: `#${colour.getHexString()}` });
      if (random() < use * 0.9) {
        hits.push({ at: [x + (random() - 0.5) * 0.01, h + 0.0062, z + (random() - 0.5) * 0.01], size: 0.25 + random() * 0.6 * use + 0.1 });
        for (let d = 0; d < 5; d++) dust.push({ at: [x + (random() - 0.5) * 0.05, h + 0.0065, z + (random() - 0.5) * 0.05], size: 0.5 + random(), color: `#${colour.getHexString()}` });
      }
    }
    box.add(s.scatter(panGeo, new THREE.MeshStandardMaterial({ roughness: a.palette === 'goth' || a.palette === 'nude' ? 0.9 : 0.55, metalness: a.palette === 'classic' || a.palette === 'jewel' ? 0.35 : 0 }), pans));
    if (hits.length) box.add(s.scatter(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.0006, 14), s.material('#d5d8da', { metalness: 0.9, roughness: 0.3 }), hits));
    if (dust.length) box.add(s.scatter(new THREE.IcosahedronGeometry(0.0028, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), dust));

    // Lipsticks standing in the right-hand well.
    const tubeMat = s.material(a.box === 'caboodle' ? '#f4f4f6' : '#1a1a1e', { roughness: 0.3, metalness: 0.4 });
    const lipstick = (group: THREE.Object3D, at: V3, colour: string, open: boolean, k = 1) => {
      part(s.cylinder(0.011 * k, 0.011 * k, 0.04 * k, [at[0], at[1] + 0.02 * k, at[2]], tubeMat, 12), group);
      part(s.cylinder(0.0115 * k, 0.0115 * k, 0.006 * k, [at[0], at[1] + 0.041 * k, at[2]], metal, 12), group);
      if (open) {
        part(s.cylinder(0.0095 * k, 0.0095 * k, 0.018 * k, [at[0], at[1] + 0.052 * k, at[2]], metal, 12), group);
        const bullet = part(s.cylinder(0.004 * k, 0.0082 * k, 0.026 * k, [at[0], at[1] + 0.072 * k, at[2]], s.material(colour, { roughness: 0.3 }), 12), group);
        bullet.rotation.z = 0.12;
      } else part(s.cylinder(0.012 * k, 0.012 * k, 0.034 * k, [at[0], at[1] + 0.058 * k, at[2]], random() < 0.5 ? metal : tubeMat, 12), group);
    };
    const sticks = slim ? 0 : 3 + Math.round(mood.density * 3);
    for (let i = 0; i < sticks; i++) lipstick(box, [W / 2 - 0.035 - (i % 2) * 0.034, h, -D / 2 + 0.04 + Math.floor(i / 2) * 0.055 + (random() - 0.5) * 0.01], pick(), false);
    if (slim) {
      const applicator = new THREE.Group();
      part(s.rod([-0.04, 0, 0], [0.04, 0, 0], 0.0025, tubeMat), applicator);
      for (const sx of [-1, 1]) part(s.ball([0.007, 0.004, 0.004], [sx * 0.045, 0, 0], s.material('#f1e2d2', { roughness: 1 }), 8), applicator);
      applicator.position.set(W / 2 - 0.05, h + 0.006, 0); applicator.rotation.y = Math.PI / 2; box.add(applicator);
    }

    // ---- Lashes on their card ----
    const lashHair = new THREE.CylinderGeometry(0.00025, 0.001, 1, 4);
    lashHair.translate(0, 0.5, 0);
    const hairs: THREE.Matrix4[] = [], hairColours: THREE.Color[] = [], gems: { at: V3; size: number; color: string }[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const lash = (cx: number, y: number, cz2: number, turn: number, flip: number) => {
      const R = 0.05, span = 0.62;
      const band: V3[] = [];
      const n = { wispy: 17, feather: 30, spider: 9, colour: 20 }[a.lashes];
      const frame = new THREE.Matrix4().makeRotationY(turn).setPosition(cx, y, cz2);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), th = (t - 0.5) * 2 * span;
        const p = new THREE.Vector3(Math.sin(th) * R, 0.002, Math.cos(th) * R - R).applyMatrix4(frame);
        if (i % 2 === 0 || i === n - 1) band.push([p.x, p.y, p.z]);
        const outer = flip > 0 ? t : 1 - t;
        const len = { wispy: mix(0.018, 0.034, outer) * (i % 2 ? 0.7 : 1), feather: mix(0.03, 0.055, outer) * (0.8 + random() * 0.3), spider: mix(0.035, 0.055, outer), colour: mix(0.025, 0.045, outer) * (i % 3 ? 1 : 0.6) }[a.lashes];
        const thick = { wispy: 1.6, feather: 2.6, spider: 4.2, colour: 2.2 }[a.lashes];
        const dir = new THREE.Vector3(Math.sin(th) * 1.25 + flip * 0.25, 0.3 + random() * 0.12, Math.cos(th)).normalize().transformDirection(frame);
        hairs.push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(up, dir), new THREE.Vector3(thick, len, thick)));
        hairColours.push(new THREE.Color(a.lashes === 'colour' ? colours[i % colours.length] : '#0b0b0d'));
        if (a.lashes === 'colour' && i % 3 === 1) gems.push({ at: [p.x, p.y + 0.002, p.z], size: 1, color: '#ffffff' });
      }
      s.tube(band, 0.0016, s.material('#0b0b0d'));
    };
    const cardAt: V3 = [-0.02 + (random() - 0.5) * 0.05, T, 0.17];
    const pairs = 1 + (mood.density > 0.45 ? 1 : 0);
    const cardD = 0.075 * pairs + 0.02;
    const card = s.box([0.19, 0.004, cardD], [cardAt[0], T + 0.002, cardAt[2]], s.material(a.cloth === 'white' ? '#f6c9da' : '#fbfaf6', { roughness: 0.5 }));
    card.castShadow = true;
    for (let p = 0; p < pairs; p++) for (const sx of [-1, 1]) lash(cardAt[0] + sx * 0.045, T + 0.004, cardAt[2] - cardD / 2 + 0.05 + p * 0.075, 0, sx);

    // ---- Brushes fanned at the left ----
    const brushes = 3 + Math.round(mood.density * 3);
    for (let i = 0; i < brushes; i++) {
      const brush = new THREE.Group(), len = 0.13 + random() * 0.06, fat = 0.006 + random() * 0.01;
      part(s.rod([0, 0, 0], [0, 0, -len * 0.6], 0.0045, s.material(a.box === 'caboodle' ? '#ff9ac6' : '#2a1d16'), 0.0035), brush);
      part(s.rod([0, 0, -len * 0.6], [0, 0, -len * 0.78], 0.0048, metal, 0.0045 + fat * 0.3), brush);
      part(s.ball([fat, fat * 0.7, len * 0.14], [0, 0, -len * 0.86], s.material(random() < use + 0.2 ? pick() : '#3b2a20', { roughness: 1 }), 10), brush);
      lay(brush, [-0.26 + i * 0.016, T + 0.008, 0.25 - random() * 0.03], -0.5 + i * 0.16 + (random() - 0.5) * mood.wear * 0.5);
    }

    // ---- The item left mid-use ----
    const hero = new THREE.Group();
    const lipColour = colours[0];
    if (a.uncapped === 'lipstick') {
      lipstick(hero, [0, 0, 0], lipColour, true, 1.5);
      const cap = part(s.cylinder(0.018, 0.018, 0.05, [0.06, 0.018, 0.02], metal, 12), hero); cap.rotation.z = Math.PI / 2; cap.rotation.y = 0.6;
      const mark = part(s.ball([0.03, 0.001, 0.008], [-0.05, 0.001, 0.035], s.material(lipColour), 10), hero); mark.rotation.y = 0.4;
    } else if (a.uncapped === 'glue') {
      part(s.cylinder(0.019, 0.019, 0.085, [0, 0.0425, 0], s.material('#f5f3ee', { roughness: 0.4 }), 16), hero);
      part(s.cylinder(0.0195, 0.0195, 0.035, [0, 0.04, 0], s.material('#6a2fa8'), 16), hero);
      part(s.cylinder(0.021, 0.021, 0.012, [0, 0.006, 0], s.material('#f08a24'), 16), hero);
      part(s.cylinder(0.014, 0.015, 0.022, [0, 0.096, 0], s.material('#9a6fd6', { roughness: 0.3 }), 14), hero).rotation.z = 0.08;
      const cap = part(s.cylinder(0.021, 0.021, 0.03, [0.06, 0.021, 0.03], s.material('#f08a24'), 16), hero); cap.rotation.x = Math.PI / 2; cap.rotation.z = 0.5;
    } else if (a.uncapped === 'mascara') {
      const tube = part(s.cylinder(0.011, 0.011, 0.09, [0, 0.011, 0], s.material(a.palette === 'neon' ? '#ff2bd6' : '#141416', { roughness: 0.25, metalness: 0.5 }), 14), hero); tube.rotation.z = Math.PI / 2;
      part(s.rod([-0.04, 0.012, 0.05], [0.0, 0.012, 0.045], 0.011, metal), hero);
      part(s.rod([0.0, 0.012, 0.045], [0.04, 0.01, 0.04], 0.0015, metal), hero);
      const bristle = part(s.rod([0.04, 0.01, 0.04], [0.075, 0.008, 0.036], 0.0055, s.material('#0b0b0d', { roughness: 1 }), 0.003), hero); bristle.castShadow = true;
      for (let i = 0; i < 6; i++) part(s.ring(0.0062, 0.0008, [0.044 + i * 0.005, 0.0098 - i * 0.0003, 0.0395 - i * 0.0006], s.material('#0b0b0d')), hero).rotation.y = Math.PI / 2;
    } else if (a.uncapped === 'liner') {
      part(s.rod([-0.06, 0.007, 0], [0.04, 0.007, 0], 0.007, s.material('#141416', { roughness: 0.3 })), hero);
      part(s.rod([0.04, 0.007, 0], [0.062, 0.006, 0], 0.005, s.material('#141416'), 0.0006), hero);
      part(s.rod([-0.02, 0.008, 0.04], [0.02, 0.008, 0.05], 0.0078, metal), hero);
      const flick: V3[] = [[0.05, 0.0015, 0.03], [0.08, 0.0015, 0.026], [0.105, 0.0015, 0.012], [0.12, 0.0015, -0.012]];
      hero.add(s.tube(flick, 0.0022, s.material('#0b0b0d')));
    } else if (a.uncapped === 'lashglue') {
      const tube = part(s.cylinder(0.004, 0.011, 0.06, [0, 0.009, 0], s.material('#f4f4f6', { roughness: 0.4 }), 12), hero); tube.rotation.z = -Math.PI / 2; tube.scale.z = 0.5;
      part(s.rod([0.03, 0.006, 0], [0.042, 0.005, 0], 0.003, s.material('#2bb6c9')), hero);
      part(s.ball([0.006, 0.004, 0.006], [0.05, 0.003, 0], s.material('#ffffff', { roughness: 0.1 }), 10), hero);
      part(s.cylinder(0.005, 0.004, 0.012, [-0.02, 0.006, 0.035], s.material('#2bb6c9'), 8), hero);
    }
    lay(hero, [0.2, T, 0.16 + (random() - 0.5) * 0.03], (random() - 0.5) * 0.6);
    if (a.uncapped === 'lashglue') lash(0.13, T + 0.001, 0.25, 0.4 + random() * 0.4, 1);

    // All lash hairs in one draw call.
    const hairMesh = new THREE.InstancedMesh(lashHair, new THREE.MeshStandardMaterial({ roughness: 0.6 }), hairs.length);
    hairs.forEach((m, i) => { hairMesh.setMatrixAt(i, m); hairMesh.setColorAt(i, hairColours[i]); });
    hairMesh.castShadow = true;
    s.root.add(hairMesh);
    if (gems.length) s.scatter(new THREE.OctahedronGeometry(0.0028), s.material('#ffffff', { metalness: 0.6, roughness: 0.1, emissive: '#bfe9ff', emissiveIntensity: 0.6 }), gems);

    // Loose pans and cotton buds when the table is busy.
    for (let i = 0; i < Math.round(mood.density * 4); i++) {
      const x = 0.08 + random() * 0.2, z = 0.02 + random() * 0.08;
      if (i % 2) { const bud = s.rod([x, T + 0.003, z], [x + 0.06, T + 0.003, z + (random() - 0.5) * 0.05], 0.0015, s.material('#f4f4f4')); bud.castShadow = false; s.ball([0.004, 0.004, 0.004], [x, T + 0.003, z], s.material(pick(), { roughness: 1 }), 6); }
      else { s.cylinder(0.022, 0.022, 0.008, [x, T + 0.004, z + 0.2 > 0.3 ? z : z + 0.2], tubeMat, 16); s.cylinder(0.018, 0.018, 0.009, [x, T + 0.0045, z + 0.2 > 0.3 ? z : z + 0.2], s.material(pick()), 16); }
    }

    return s.finish({ footprint: 0.33 });
  },
});
