import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Bake every static mesh that shares a surface (texture, gloss, glow) into one draw call, carrying
 * its colour as vertex colour. Anything marked userData.live, or instanced, is left to move freely.
 */
function fuse(root: THREE.Object3D) {
  root.updateWorldMatrix(true, true);
  const groups = new Map<string, { material: THREE.MeshStandardMaterial; parts: THREE.BufferGeometry[]; meshes: THREE.Mesh[] }>();
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh) return;
    for (let up: THREE.Object3D | null = mesh; up && up !== root; up = up.parent) if (up.userData.live) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (Array.isArray(m) || m.type !== 'MeshStandardMaterial' || m.userData.live || m.transparent) return;
    const key = [m.map?.uuid, m.emissiveMap?.uuid, Math.round(m.roughness * 8), Math.round(m.metalness * 5), m.emissive.getHex(), m.emissiveIntensity.toFixed(2), m.side, m.alphaTest].join('|');
    const group = groups.get(key) ?? { material: m, parts: [], meshes: [] };
    groups.set(key, group);
    const part = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    part.applyMatrix4(mesh.matrixWorld);
    for (const name of Object.keys(part.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') part.deleteAttribute(name);
    const count = part.attributes.position.count;
    if (!part.attributes.normal) part.computeVertexNormals();
    if (!part.attributes.uv) part.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([m.color.r, m.color.g, m.color.b], i * 3);
    part.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    group.parts.push(part);
    group.meshes.push(mesh);
  });
  for (const { material, parts, meshes } of groups.values()) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const surface = material.clone();
    surface.color.set('#ffffff');
    surface.vertexColors = true;
    const mesh = new THREE.Mesh(merged, surface);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    const spent = new Set<THREE.Material>();
    for (const old of meshes) {
      old.removeFromParent();
      old.geometry.dispose();
      spent.add(old.material as THREE.Material);
    }
    // Textures stay alive on the fused clone; only the per-mesh material shells go.
    for (const old of spent) old.dispose();
  }
}

const DESIGNS = ['dog', 'person', 'sale', 'band', 'lessons', 'supper', 'truck', 'cat'] as const;
type Design = (typeof DESIGNS)[number];

export default defineThing({
  questions: {
    newest: choice('Which flyer is the newest, stapled on top at eye level?', {
      dog: 'LOST DOG, with a photocopied photo and a reward.',
      person: 'MISSING, a face, a date last seen, a number to call.',
      sale: 'YARD SALE on neon paper with a fat arrow.',
      band: 'A photocopied punk-show poster for a band playing Saturday.',
      lessons: 'GUITAR LESSONS with a fringe of tear-off phone tabs.',
      supper: 'A church pancake supper, all welcome.',
      truck: 'FOR SALE: a pickup, runs good, a price.',
      cat: 'FOUND CAT, hand-drawn in marker.',
    }),
    mass: choice('What is the rest of the paper like?', {
      mixed: 'A real community mix: every kind of notice in every colour.',
      plastered: 'The same newest flyer over and over, put up by someone desperate.',
      neon: 'Mostly yard-sale neon: pink, green, orange and yellow.',
      pulp: 'Decades of grey pulp, torn corners and bare staples, with only one or two fresh sheets.',
    }),
    tabs: score('How many tear-off phone tabs are left on the newest flyer?', ['All of them: nobody has called', 'About half', 'One last tab']),
    top: choice('What does the pole carry up above?', {
      crossarm: 'A wooden crossarm with glass insulators.',
      lamp: 'A streetlight on a curved arm.',
      transformer: 'A grey transformer can and a tangle of drops.',
      stump: 'Nothing: it was cut off overhead and left standing just for the paper.',
    }),
    foot: choice('What is at its foot?', {
      weeds: 'Only weeds and old staples.',
      bike: 'A bicycle frame chained to it, one wheel long gone.',
      memorial: 'A roadside memorial: flowers in cellophane, candles, a teddy bear.',
      balloons: 'Party balloons tied on with ribbon.',
      stake: 'A yard-sale arrow sign on a wire stake.',
    }),
    coverage: score('How much paper is on it?', ['A few sheets', 'A good layer', 'Shingled thick from knee to as high as an arm can reach']),
    girth: score('How stout is the pole?', ['A thin service pole', 'Ordinary', 'A fat old trunk of a pole']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });

    const R = mix(0.17, 0.3, a.girth), poleH = a.top === 'stump' ? 2.9 + random() * 0.4 : 4.3;
    const radiusAt = (y: number) => R * (1 - (y / 4.3) * 0.22);

    // The pole: dark grainy creosote.
    const grain = paint(256, 512, (g, w, h) => {
      const base = new THREE.Color('#3d2c1f').lerp(new THREE.Color('#82786a'), wear * 0.55);
      g.fillStyle = hex(base);
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = hex(base.clone().offsetHSL(0, 0, (random() - 0.5) * 0.14));
        g.fillRect(random() * w, random() * h, 1 + random() * 3, 20 + random() * 160);
      }
      g.fillStyle = '#17110c';
      for (let i = 0; i < 16 + wear * 30; i++) g.fillRect(random() * w, random() * h, 1.6, 30 + random() * 140);
    });
    const wood = new THREE.MeshStandardMaterial({ map: grain, roughness: 0.95 });
    s.cylinder(radiusAt(poleH), R * 1.04, poleH + 0.4, [0, poleH / 2 - 0.2, 0], wood, 20);
    s.cylinder(radiusAt(poleH) * 0.98, radiusAt(poleH) * 0.98, 0.02, [0, poleH + 0.005, 0], mat('#8a7a62'), 16);
    s.box([0.09, 0.13, 0.01], [0, 2.7, radiusAt(2.7) + 0.004], mat('#c9ccc9', { metalness: 0.7, roughness: 0.3 }));

    // Eight flyer designs painted into one atlas.
    const CW = 200, CH = 272;
    const neons = ['#ff5fa2', '#b6f23a', '#ffe23a', '#ff9a2e'];
    const atlas = paint(CW * 4, CH * 2, (g) => {
      const cell = (index: number, drawCell: () => void, paper = '#f6f3ea') => {
        g.save();
        g.translate((index % 4) * CW, Math.floor(index / 4) * CH);
        g.fillStyle = paper;
        g.fillRect(0, 0, CW, CH);
        g.fillStyle = '#1c1c1c';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        drawCell();
        g.restore();
      };
      const head = (text: string, y: number, size: number, colour = '#1c1c1c') => {
        g.fillStyle = colour;
        g.font = `bold ${size}px sans-serif`;
        g.fillText(text, CW / 2, y, CW - 16);
      };
      const lines = (from: number, count: number, gap = 13) => {
        g.fillStyle = '#3a3a3a';
        for (let i = 0; i < count; i++) g.fillRect(24 + random() * 14, from + i * gap, CW - 60 - random() * 40, 4);
      };
      const tabsRow = () => {
        g.strokeStyle = '#1c1c1c';
        g.lineWidth = 1.5;
        for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo((i * CW) / 8, CH - 46); g.lineTo((i * CW) / 8, CH); g.stroke(); }
        g.beginPath(); g.moveTo(0, CH - 46); g.lineTo(CW, CH - 46); g.stroke();
        g.fillStyle = '#3a3a3a';
        for (let i = 0; i < 8; i++) g.fillRect((i * CW) / 8 + 10, CH - 40, 4, 34);
      };
      cell(0, () => {
        head('LOST DOG', 34, 38, '#c01818');
        g.fillStyle = '#b9b5ab'; g.fillRect(34, 62, CW - 68, 104);
        g.fillStyle = '#4a3a2c';
        g.beginPath(); g.ellipse(CW / 2, 128, 34, 30, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(CW / 2 - 30, 96, 13, 24, -0.5, 0, 7); g.fill();
        g.beginPath(); g.ellipse(CW / 2 + 30, 96, 13, 24, 0.5, 0, 7); g.fill();
        g.fillStyle = '#1c1c1c';
        g.beginPath(); g.arc(CW / 2 - 12, 120, 4, 0, 7); g.arc(CW / 2 + 12, 120, 4, 0, 7); g.fill();
        g.beginPath(); g.ellipse(CW / 2, 138, 8, 6, 0, 0, 7); g.fill();
        head('REWARD', 188, 26);
        lines(208, 2);
        tabsRow();
      });
      cell(1, () => {
        head('MISSING', 34, 42, '#c01818');
        g.fillStyle = '#c9c5bb'; g.fillRect(44, 62, CW - 88, 116);
        g.fillStyle = '#5a5651';
        g.beginPath(); g.arc(CW / 2, 106, 24, 0, 7); g.fill();
        g.beginPath(); g.ellipse(CW / 2, 172, 44, 36, 0, Math.PI, 0); g.fill();
        head('HAVE YOU SEEN ME?', 196, 17);
        lines(212, 3, 12);
        head('CALL 555-0142', 258, 17);
      });
      cell(2, () => {
        head('YARD', 46, 60);
        head('SALE', 104, 60);
        head('SAT 8-2', 150, 26);
        g.fillStyle = '#1c1c1c';
        g.beginPath(); g.moveTo(30, 196); g.lineTo(120, 196); g.lineTo(120, 174); g.lineTo(176, 214); g.lineTo(120, 254); g.lineTo(120, 232); g.lineTo(30, 232); g.fill();
      }, '#ffffff');
      cell(3, () => {
        g.fillStyle = '#141414'; g.fillRect(0, 0, CW, CH);
        g.fillStyle = '#f6f3ea';
        for (let i = 0; i < 9; i++) { g.save(); g.translate(CW / 2, 120); g.rotate((i / 9) * 6.28); g.fillRect(-6, 20, 12, 70); g.restore(); }
        g.beginPath(); g.arc(CW / 2, 120, 30, 0, 7); g.fill();
        head('LIVE SAT', 30, 34, '#f6f3ea');
        head('THE RUSTED', 222, 26, '#f6f3ea');
        head('$5 · ALL AGES', 252, 17, '#f6f3ea');
      });
      cell(4, () => {
        head('GUITAR', 40, 40);
        head('LESSONS', 82, 36);
        g.strokeStyle = '#1c1c1c'; g.lineWidth = 5;
        g.beginPath(); g.ellipse(84, 160, 30, 36, 0.5, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(104, 136); g.lineTo(166, 104); g.stroke();
        head('ALL AGES', 210, 18);
        tabsRow();
      });
      cell(5, () => {
        head('PANCAKE', 36, 34, '#1f4a8a');
        head('SUPPER', 72, 34, '#1f4a8a');
        g.fillStyle = '#d9a650';
        for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(CW / 2, 152 - i * 11, 46, 11, 0, 0, 7); g.fill(); g.strokeStyle = '#8a5a1c'; g.lineWidth = 2; g.stroke(); }
        head('FIRST METHODIST', 200, 17);
        head('ALL WELCOME', 226, 20, '#1f4a8a');
        lines(246, 1);
      });
      cell(6, () => {
        head('FOR SALE', 34, 38);
        g.fillStyle = '#6f7f8c'; g.fillRect(30, 104, 140, 34); g.fillRect(96, 76, 54, 30);
        g.fillStyle = '#1c1c1c';
        g.beginPath(); g.arc(62, 142, 15, 0, 7); g.arc(142, 142, 15, 0, 7); g.fill();
        head('RUNS GOOD', 184, 24);
        head('$800 OBO', 216, 30, '#c01818');
        tabsRow();
      });
      cell(7, () => {
        head('FOUND', 36, 44);
        g.strokeStyle = '#1c1c1c'; g.lineWidth = 5;
        g.beginPath(); g.arc(CW / 2, 122, 38, 0, 7); g.stroke();
        g.beginPath(); g.moveTo(CW / 2 - 34, 100); g.lineTo(CW / 2 - 30, 62); g.lineTo(CW / 2 - 8, 88); g.moveTo(CW / 2 + 34, 100); g.lineTo(CW / 2 + 30, 62); g.lineTo(CW / 2 + 8, 88); g.stroke();
        g.beginPath(); g.moveTo(CW / 2 - 40, 126); g.lineTo(CW / 2 - 66, 120); g.moveTo(CW / 2 + 40, 126); g.lineTo(CW / 2 + 66, 120); g.stroke();
        g.fillStyle = '#1c1c1c';
        g.beginPath(); g.arc(CW / 2 - 14, 114, 5, 0, 7); g.arc(CW / 2 + 14, 114, 5, 0, 7); g.fill();
        head('CAT', 190, 44);
        head('grey, friendly', 226, 18);
        lines(246, 1);
      });
    });

    // Flyers wrapped onto the pole, all in one mesh. Later sheets sit on top of earlier ones.
    const positions: number[] = [], uvs: number[] = [], tints: number[] = [];
    const aged = new THREE.Color('#b3aa94');
    const sheetOn = (design: Design, theta: number, y: number, width: number, layer: number, tint: THREE.Color, keep = 1, skew = 0) => {
      const index = DESIGNS.indexOf(design), height = width * (CH / CW), nx = 6;
      const u0 = (index % 4) / 4, v1 = 1 - Math.floor(index / 4) / 2;
      const lift = 0.4 + wear + random() * 0.3;
      const point = (i: number, j: number) => {
        const u = i / nx, v = j;
        const yy = y + height * (0.5 - v * keep) + (u - 0.5) * skew;
        const curl = (v > 0.5 ? 1 : 0.3) * Math.pow(Math.abs(u - 0.5) * 2, 3) * 0.035 * lift;
        const r = radiusAt(yy) + 0.005 + layer * 0.0022 + curl;
        const angle = theta + ((u - 0.5) * width) / radiusAt(yy);
        return { p: [Math.sin(angle) * r, yy, Math.cos(angle) * r], uv: [u0 + u / 4, v1 - (v * keep) / 2] };
      };
      for (let i = 0; i < nx; i++) {
        const q = [point(i, 0), point(i, 1), point(i + 1, 1), point(i + 1, 0)];
        for (const k of [0, 1, 2, 0, 2, 3]) {
          positions.push(...q[k].p);
          uvs.push(...q[k].uv);
          tints.push(tint.r, tint.g, tint.b);
        }
      }
    };
    const count = Math.round(mix(5, 34, a.coverage) * mix(0.75, 1.25, mood.density));
    const others = DESIGNS.filter((design) => design !== a.newest);
    const highest = mix(1.8, 2.45, a.coverage);
    for (let i = 0; i < count; i++) {
      const old = i < count * (a.mass === 'pulp' ? 0.9 : 0.45 + wear * 0.3);
      let design: Design = others[Math.floor(random() * others.length)];
      if (a.mass === 'plastered' && random() < 0.75) design = a.newest;
      if (a.mass === 'neon' && random() < 0.65) design = 'sale';
      let tint = new THREE.Color('#ffffff');
      if (design === 'sale' || (a.mass === 'neon' && random() < 0.4) || (a.mass === 'mixed' && random() < 0.3)) tint = new THREE.Color(neons[Math.floor(random() * 4)]);
      if (old) tint.lerp(aged, 0.45 + random() * 0.4 + (a.mass === 'pulp' ? 0.15 : 0));
      const torn = old && random() < 0.35 + wear * 0.4 ? 0.25 + random() * 0.5 : 1;
      sheetOn(design, random() * Math.PI * 2, mix(0.5, highest, random()), 0.25 + random() * 0.12, i, tint, torn, (random() - 0.5) * 0.08);
    }
    // The newest flyer, front and centre, and a second copy or neighbour beside it.
    const newY = 1.5, newW = Math.min(0.44, R * 2.3);
    const newTint = new THREE.Color(a.newest === 'sale' ? neons[Math.floor(random() * 4)] : '#ffffff').lerp(aged, wear * 0.25);
    sheetOn(a.newest, 0.05, newY, newW, count + 2, newTint, 1, (random() - 0.5) * 0.03);
    if (a.mass === 'plastered') {
      sheetOn(a.newest, 0.05 + (newW / R) * 1.05, newY - 0.3, newW, count + 1, newTint, 1, 0.03);
      sheetOn(a.newest, 0.05 - (newW / R) * 1.05, newY + 0.25, newW, count + 1, newTint, 1, -0.03);
    }
    const paperGeometry = new THREE.BufferGeometry();
    paperGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    paperGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    paperGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tints, 3));
    paperGeometry.computeVertexNormals();
    const paper = s.mesh(paperGeometry, new THREE.MeshStandardMaterial({ map: atlas, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }));
    paper.userData.live = true;

    // Loose tear-off tabs that flutter.
    const tabs: THREE.Mesh[] = [];
    const hasTabs = a.newest === 'dog' || a.newest === 'lessons' || a.newest === 'truck';
    if (hasTabs) {
      const newH = newW * (CH / CW), tabH = newH * (46 / CH), tabW = newW / 8;
      const left = Math.round(mix(8, 1, a.tabs));
      const keepers = new Set([...Array(8).keys()].sort(() => random() - 0.5).slice(0, left));
      const cover = mat('#3d2c1f');
      for (let i = 0; i < 8; i++) {
        const angle = 0.05 + ((i + 0.5) / 8 - 0.5) * newW / radiusAt(newY);
        const r = radiusAt(newY) + 0.005 + (count + 3) * 0.0022;
        const yTop = newY - newH / 2 + tabH;
        if (!keepers.has(i)) {
          // A torn-off tab leaves a gap showing what is underneath.
          const gap = s.box([tabW * 0.92, tabH, 0.002], [Math.sin(angle) * (r + 0.002), yTop - tabH / 2, Math.cos(angle) * (r + 0.002)], cover);
          gap.rotation.y = angle;
          continue;
        }
        const geometry = new THREE.PlaneGeometry(tabW * 0.86, tabH);
        geometry.translate(0, -tabH / 2, 0);
        const tab = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: blank, color: newTint, side: THREE.DoubleSide, roughness: 0.9 }), [Math.sin(angle) * (r + 0.004), yTop, Math.cos(angle) * (r + 0.004)]);
        tab.rotation.set(-0.25 - random() * 0.5, angle, 0, 'YXZ');
        tab.userData.live = true;
        tab.userData.rest = tab.rotation.x;
        tab.userData.phase = random() * 6;
        tabs.push(tab);
      }
    }

    // Staples: thousands of them over the years.
    const staples = Array.from({ length: Math.round(mix(60, 420, a.coverage) * (0.6 + wear * 0.8)) }, () => {
      const y = 0.4 + random() * (highest + 0.2), angle = random() * 6.28, r = radiusAt(y) + 0.004;
      return { at: [Math.sin(angle) * r, y, Math.cos(angle) * r] as const, size: 0.006 + random() * 0.005, color: random() < 0.3 + wear * 0.5 ? '#7a4a2c' : '#d5d8d8' };
    });
    s.scatter(new THREE.BoxGeometry(2.2, 0.5, 0.6), new THREE.MeshStandardMaterial({ map: blank, metalness: 0.6, roughness: 0.4 }), staples);

    // Up top.
    const steel = mat('#9aa0a1', { metalness: 0.6, roughness: 0.4 });
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    if (a.top === 'crossarm') {
      s.box([1.9, 0.1, 0.11], [0, poleH - 0.35, radiusAt(poleH) + 0.05], wood);
      s.rod([-0.5, poleH - 0.4, radiusAt(poleH) + 0.1], [0, poleH - 0.95, radiusAt(poleH - 0.9)], 0.015, steel);
      s.rod([0.5, poleH - 0.4, radiusAt(poleH) + 0.1], [0, poleH - 0.95, radiusAt(poleH - 0.9)], 0.015, steel);
      for (const x of [-0.82, -0.3, 0.3, 0.82]) {
        s.cylinder(0.012, 0.012, 0.12, [x, poleH - 0.26, radiusAt(poleH) + 0.05], steel, 6);
        s.lathe([[0, 0], [0.05, 0], [0.055, 0.04], [0.035, 0.07], [0.045, 0.1], [0, 0.12]], mat('#7fbfb0', { roughness: 0.15, metalness: 0.2 }), [x, poleH - 0.2, radiusAt(poleH) + 0.05]);
      }
    } else if (a.top === 'lamp') {
      s.tube([[0, poleH - 0.5, radiusAt(poleH)], [0, poleH + 0.1, 0.45], [0, poleH + 0.15, 0.95]], 0.03, steel);
      s.ball([0.15, 0.07, 0.26], [0, poleH + 0.12, 1.1], steel, 12);
      s.ball([0.1, 0.045, 0.18], [0, poleH + 0.07, 1.1], mat('#fff0c0', { emissive: new THREE.Color('#ffc46a').lerp(new THREE.Color('#e9f1ff'), 1 - mood.warmth), emissiveIntensity: 0.3 + dusk * 1.5 }), 10);
    } else if (a.top === 'transformer') {
      const can = mat('#8b9092', { metalness: 0.4 });
      s.cylinder(0.24, 0.24, 0.62, [0.38, poleH - 0.75, 0.1], can, 16);
      s.cylinder(0.255, 0.255, 0.04, [0.38, poleH - 0.43, 0.1], mat('#6f7476'), 16);
      for (const dx of [-0.09, 0.09]) s.cylinder(0.022, 0.032, 0.16, [0.38 + dx, poleH - 0.33, 0.1], mat('#7a4a34'), 8);
      s.box([0.3, 0.06, 0.08], [0.2, poleH - 0.6, 0.02], steel);
      s.tube([[0.38, poleH - 0.25, 0.1], [0.2, poleH - 0.05, 0.12], [0, poleH - 0.1, radiusAt(poleH) + 0.02]], 0.01, mat('#1c1c1c'));
      s.tube([[0.3, poleH - 1.05, 0.2], [0.1, poleH - 1.5, 0.22], [-0.02, poleH - 2.2, radiusAt(poleH - 2.2) + 0.02], [0, poleH - 2.9, radiusAt(poleH - 2.9) + 0.02]], 0.012, mat('#1c1c1c'));
    } else {
      s.cylinder(radiusAt(poleH) * 0.6, radiusAt(poleH) * 0.75, 0.05, [0, poleH + 0.03, 0], mat('#5a4a38'), 9);
      s.rod([0.02, poleH - 0.3, radiusAt(poleH)], [0.3, poleH - 0.7, radiusAt(poleH) + 0.25], 0.008, mat('#1c1c1c'));
    }

    // At its foot.
    const blooms: { at: P3; size: number; color: string }[] = [];
    const green = mat('#5f7a3f', { roughness: 0.95 });
    for (let i = 0; i < 6 + Math.round(wear * 14); i++) {
      const angle = random() * 6.28, r = R + 0.03 + random() * 0.2;
      s.rod([Math.sin(angle) * r, 0, Math.cos(angle) * r], [Math.sin(angle) * (r + 0.06), 0.1 + random() * 0.25, Math.cos(angle) * (r + 0.06)], 0.008, green, 0.001);
    }
    const balloons: THREE.Object3D[] = [];
    if (a.foot === 'bike') {
      const paintwork = mat(new THREE.Color(['#3f6f9a', '#a3322a', '#3a3d3e'][Math.floor(random() * 3)]).lerp(new THREE.Color('#7a4a2c'), wear * 0.5), { metalness: 0.4 });
      const bike = new THREE.Group();
      const part = (mesh: THREE.Object3D) => { bike.add(mesh); return mesh; };
      const bb: P3 = [0, 0.3, 0], seat: P3 = [-0.18, 0.82, 0], headTop: P3 = [0.42, 0.82, 0], headBottom: P3 = [0.47, 0.62, 0], rear: P3 = [-0.5, 0.34, 0], front: P3 = [0.6, 0.34, 0];
      for (const [from, to] of [[bb, seat], [seat, headTop], [bb, headBottom], [headTop, headBottom], [bb, rear], [seat, rear], [headBottom, front]] as const) part(s.rod(from, to, 0.018, paintwork));
      part(s.rod([seat[0], seat[1], 0], [seat[0] - 0.03, seat[1] + 0.12, 0], 0.012, paintwork));
      part(s.box([0.22, 0.04, 0.1], [seat[0] - 0.04, seat[1] + 0.14, 0], mat('#1c1c1c')));
      part(s.rod([0.4, 0.95, -0.22], [0.4, 0.95, 0.22], 0.012, mat('#9aa0a1', { metalness: 0.7 })));
      part(s.rod(headTop, [0.4, 0.95, 0], 0.012, paintwork));
      part(s.ring(0.3, 0.02, [rear[0], rear[1], 0], mat('#1c1c1c')));
      part(s.ring(0.27, 0.008, [rear[0], rear[1], 0], steel));
      part(s.ring(0.09, 0.012, [bb[0], bb[1], 0.03], steel));
      bike.position.set(-0.05, 0, R + 0.16);
      bike.rotation.set(-0.14, 0.08, 0);
      s.root.add(bike);
      const lock = s.ring(R + 0.13, 0.014, [0, 0.62, 0.04], mat('#22262a', { metalness: 0.5 }));
      lock.rotation.x = Math.PI / 2 + 0.25;
    } else if (a.foot === 'memorial') {
      const z = R + 0.18;
      const wrap = mat('#bcd3dc', { roughness: 0.15 });
      for (let b = 0; b < 2 + Math.round(mood.density * 2); b++) {
        const bx = -0.3 + b * 0.22 + random() * 0.08, lean = 0.5 + random() * 0.2;
        const cone = s.cylinder(0.08, 0.02, 0.36, [bx, 0.17, z + 0.06], wrap, 8);
        cone.rotation.x = -lean - 0.35;
        for (let i = 0; i < 7; i++) blooms.push({ at: [bx + (random() - 0.5) * 0.14, 0.27 + random() * 0.07, z - 0.1 + (random() - 0.5) * 0.08], size: 0.035 + random() * 0.02, color: wear > 0.6 ? ['#8a7350', '#a48c63'][i % 2] : ['#d83a45', '#f4f0e6', '#e9c34b', '#f2a7b5'][Math.floor(random() * 4)] });
      }
      for (let i = 0; i < 3; i++) {
        const x = 0.2 + i * 0.1, zz = z + 0.12 + (i % 2) * 0.08, h = 0.1 + random() * 0.08;
        s.cylinder(0.03, 0.03, h, [x, h / 2, zz], mat(i % 2 ? '#b23535' : '#f4f0e6', { roughness: 0.3 }), 10);
        s.ball([0.012, 0.022, 0.012], [x, h + 0.02, zz], mat('#ffd38a', { emissive: '#ffb04a', emissiveIntensity: wear > 0.7 ? 0 : 1.6 }), 6);
      }
      const fur = mat('#b98a56', { roughness: 1 });
      const tx = -0.42, tz = z + 0.1;
      s.ball([0.09, 0.1, 0.08], [tx, 0.1, tz], fur, 10);
      s.ball([0.07, 0.07, 0.065], [tx, 0.24, tz + 0.01], fur, 10);
      for (const side of [-1, 1]) {
        s.ball([0.028, 0.028, 0.02], [tx + side * 0.055, 0.3, tz], fur, 6);
        s.ball([0.035, 0.035, 0.05], [tx + side * 0.08, 0.05, tz + 0.08], fur, 6);
      }
      const ribbon = s.ring(radiusAt(1.05) + 0.012, 0.016, [0, 1.05, 0], mat('#f2e25a', { roughness: 0.6 }));
      ribbon.rotation.x = Math.PI / 2;
    } else if (a.foot === 'balloons') {
      const sad = mood.cheer < 0.35 || wear > 0.7;
      for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) {
        const colour = ['#e23a4a', '#3a8fe2', '#ffd23a', '#7ad05a', '#c95fd0'][i % 5];
        const group = new THREE.Group();
        const length = sad ? 0.5 + random() * 0.3 : 0.9 + random() * 0.6;
        const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, length, 4), mat('#f4f0e6'));
        string.position.y = length / 2;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(sad ? 0.09 : 0.15, 12, 10), mat(colour, { roughness: 0.2 }));
        ball.scale.y = 1.2;
        ball.position.y = length + (sad ? 0.08 : 0.16);
        ball.castShadow = true;
        group.add(string, ball);
        group.position.set((random() - 0.5) * 0.1, 1.25, R + 0.01);
        group.rotation.set(sad ? 2.4 + random() * 0.5 : 0.25 + random() * 0.5, (random() - 0.5) * 1.6, 0, 'YXZ');
        group.userData.live = true;
        group.userData.rest = group.rotation.x;
        group.userData.phase = random() * 6;
        s.root.add(group);
        if (!sad) balloons.push(group);
      }
      s.ring(radiusAt(1.25) + 0.01, 0.012, [0, 1.25, 0], mat('#e23a4a')).rotation.x = Math.PI / 2;
    } else if (a.foot === 'stake') {
      const arrow = paint(256, 160, (g, w, h) => {
        g.fillStyle = neons[Math.floor(random() * 4)];
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#1c1c1c';
        g.font = 'bold 54px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText('YARD SALE', w / 2, 44, w - 16);
        g.beginPath(); g.moveTo(40, 96); g.lineTo(160, 96); g.lineTo(160, 76); g.lineTo(226, 114); g.lineTo(160, 152); g.lineTo(160, 132); g.lineTo(40, 132); g.fill();
      });
      const x = R + 0.5, z = 0.3;
      for (const dx of [-0.15, 0.15]) s.rod([x + dx, 0, z], [x + dx, 0.5, z], 0.006, steel);
      const board = s.mesh(new THREE.PlaneGeometry(0.6, 0.38), new THREE.MeshStandardMaterial({ map: arrow, roughness: 0.6, side: THREE.DoubleSide }), [x, 0.62, z]);
      board.rotation.set((random() - 0.5) * 0.15, -0.3, (random() - 0.5) * (0.1 + wear * 0.5), 'YXZ');
    }
    if (blooms.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.8 }), blooms);

    fuse(s.root);
    s.root.rotation.z = (random() - 0.5) * (0.03 + wear * 0.07);
    const breeze = mix(0.03, 0.5, mood.energy);
    return s.finish({
      footprint: Math.max(0.5, R + 0.45),
      update: (_dt, time) => {
        for (const tab of tabs) tab.rotation.x = (tab.userData.rest as number) - Math.abs(Math.sin(time * (3 + mood.energy * 7) + (tab.userData.phase as number))) * breeze;
        for (const balloon of balloons) balloon.rotation.x = (balloon.userData.rest as number) + Math.sin(time * 1.3 + (balloon.userData.phase as number)) * breeze * 0.3;
      },
    });
  },
});
