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

const LETTERING = {
  coop: ['FARMERS', 'CO-OP'],
  pioneer: ['PIONEER', 'GRAIN CO.'],
  town: ['HOPE'],
  union: ['UNION', 'ELEVATOR'],
  feed: ['FEED', '& SEED'],
  pool: ['WHEAT', 'POOL'],
} as const;

export default defineThing({
  questions: {
    kind: choice('How is the elevator built?', {
      timber: 'A tall wooden crib elevator: a square tower with sloped shoulders and a narrow headhouse on top, the classic prairie sentinel.',
      concrete: 'A row of slip-form concrete silos with a long gallery across the top and a taller leg tower at one end.',
      twin: 'Two wooden crib elevators side by side, an old one and a bigger annex, joined at the hip.',
    }),
    cladding: choice('What covers its walls?', {
      tin: 'Galvanised corrugated tin, silver going dull.',
      oxide: 'Boxcar-red painted siding.',
      white: 'White-painted siding with dark trim.',
      green: 'Pale mint-green tin, a co-op colour from the 1950s.',
    }),
    lettering: choice('What do the big painted letters say?', {
      coop: 'FARMERS CO-OP',
      pioneer: 'PIONEER GRAIN CO.',
      town: 'HOPE, the name of the town itself',
      union: 'UNION ELEVATOR',
      feed: 'FEED & SEED',
      pool: 'WHEAT POOL',
    }),
    paintwork: choice('How well has the lettering survived?', {
      fresh: 'Repainted crisp this decade.',
      faded: 'Faded but perfectly readable.',
      ghost: 'A ghost sign: you can only just make it out.',
    }),
    state: choice('What is happening at the elevator?', {
      harvest: 'Harvest: a grain truck at the pit, the spout pouring, a golden pile outside and dust hanging in the air.',
      working: 'An ordinary working day: doors open, yard light on, nobody in sight.',
      closed: 'Closed for good: doors boarded, windows dark, pigeons along the roof, weeds at the foot.',
      gutted: 'Being lost: cladding stripped in patches, the cribbing showing, the spout fallen.',
    }),
    siding: choice('What runs alongside it?', {
      none: 'Nothing: the rails were lifted long ago.',
      track: 'An empty stretch of rail siding.',
      hopper: 'A rail siding with a covered hopper car spotted under the spout.',
    }),
    bins: score('How many round steel grain bins stand beside it?', ['None', 'One', 'A pair', 'A whole row']),
    height: score('How tall is it?', ['Squat country elevator', 'Tall', 'Towering over everything for miles']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gutted = a.state === 'gutted';
    const derelict = gutted || a.state === 'closed';
    const wear = Math.min(1, mood.wear + (gutted ? 0.35 : a.state === 'closed' ? 0.15 : 0));
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });

    const wallColour = new THREE.Color({ tin: '#b9bdbb', oxide: '#8c3a2c', white: '#e9e6dc', green: '#a9c9b4' }[a.cladding]);
    const boards = a.cladding === 'oxide' || a.cladding === 'white';
    const ink = a.cladding === 'tin' || a.cladding === 'white' ? '#1f2326' : '#f1ede2';
    const rust = '#7a4a2c';
    const letterAlpha = { fresh: 0.95, faded: 0.7, ghost: 0.28 }[a.paintwork] * (1 - wear * 0.3);

    /** Corrugated tin or lap siding, streaked by weather; optionally lettered and stripped. */
    const cladding = (metresWide: number, metresHigh: number, words: readonly string[] | null, concrete = false) => {
      const texture = paint(512, 512, (g, w, h) => {
        const base = concrete ? new THREE.Color('#cfcabd') : wallColour;
        g.fillStyle = hex(base);
        g.fillRect(0, 0, w, h);
        if (concrete) {
          for (let y = 0; y < h; y += 512 / metresHigh * 1.2) {
            g.fillStyle = `rgba(60,58,50,${0.12 + random() * 0.1})`;
            g.fillRect(0, y, w, 1.5);
          }
        } else if (boards) {
          for (let y = 0; y < h; y += 7) {
            g.fillStyle = 'rgba(0,0,0,0.2)';
            g.fillRect(0, y, w, 1.2);
          }
        } else {
          for (let x = 0; x < w; x += 5) {
            g.fillStyle = x % 10 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.13)';
            g.fillRect(x, 0, 2.5, h);
          }
          for (let y = 0; y < h; y += 512 / metresHigh * 2.4) {
            g.fillStyle = 'rgba(0,0,0,0.22)';
            g.fillRect(0, y, w, 1.5);
          }
        }
        for (let i = 0; i < 6 + wear * 70; i++) {
          g.fillStyle = concrete ? `rgba(70,62,50,${0.05 + random() * 0.12})` : `rgba(122,74,44,${0.1 + random() * 0.3 * wear})`;
          g.fillRect(random() * w, random() * h * 0.6, 2 + random() * 9, h * (0.08 + random() * 0.5));
        }
        if (words) {
          g.fillStyle = ink;
          g.globalAlpha = letterAlpha;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          const lineH = Math.min(h * 0.16, (w * 0.9) / Math.max(...words.map((word) => word.length)) * 1.5 * (metresWide / metresHigh) * (h / w));
          words.forEach((word, i) => {
            g.save();
            g.translate(w / 2, h * 0.3 + (i - (words.length - 1) / 2) * lineH * 1.15);
            g.scale((metresHigh / metresWide) * (w / h), 1);
            g.font = `bold ${lineH}px sans-serif`;
            g.fillText(word, 0, 0);
            g.restore();
          });
          g.globalAlpha = 1;
        }
        if (gutted && !concrete)
          for (let i = 0; i < 9; i++) {
            const x = random() * w * 0.85, y = random() * h * 0.85, pw = 30 + random() * 90, ph = 40 + random() * 110;
            g.fillStyle = '#3d2f22';
            g.fillRect(x, y, pw, ph);
            g.fillStyle = '#6b5438';
            for (let row = y + 3; row < y + ph; row += 7) g.fillRect(x, row, pw, 3);
          }
      });
      return new THREE.MeshStandardMaterial({ map: texture, roughness: concrete || boards ? 0.9 : 0.5 + wear * 0.35, metalness: concrete || boards ? 0 : 0.35 });
    };
    const roofColour = new THREE.Color(a.cladding === 'tin' ? '#9ea3a2' : a.cladding === 'green' ? '#7f9c8a' : '#5a5d5e').lerp(new THREE.Color(rust), wear * 0.5);
    const roofing = mat(roofColour, { metalness: 0.4, roughness: 0.55 });
    const trim = mat(a.cladding === 'white' ? '#2f4a3b' : '#3a3d3e');
    const dark = mat('#1f2022', { roughness: 0.9 });
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const windowLit = !derelict ? 0.25 + dusk * 1.3 : 0;
    const pane = mat(derelict ? '#17181a' : '#3c4a52', { emissive: new THREE.Color('#ffd28a').lerp(new THREE.Color('#dfeaff'), 1 - mood.warmth), emissiveIntensity: windowLit, roughness: 0.3 });

    const gable = (width: number, depth: number, rise: number, at: P3, material: THREE.Material, alongX = false) => {
      const shape = new THREE.Shape([new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0), new THREE.Vector2(0, rise)]);
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
      geometry.translate(0, 0, -depth / 2);
      const mesh = s.mesh(geometry, material, at);
      if (alongX) mesh.rotation.y = Math.PI / 2;
      return mesh;
    };
    const wallBox = (size: P3, at: P3, words: readonly string[] | null) => {
      s.box(size, at, cladding(size[0], size[1], null));
      if (words || gutted) s.mesh(new THREE.PlaneGeometry(size[0], size[1]), cladding(size[0], size[1], words), [at[0], at[1], at[2] + size[2] / 2 + 0.03]);
    };

    const tall = a.height;
    const words = LETTERING[a.lettering];
    let spoutFrom: P3 = [0, 0, 0], ridge: { x0: number; x1: number; y: number; z: number } = { x0: 0, x1: 0, y: 0, z: 0 };
    let right = 5, left = -5, depth = 8.5, doorX = 0;

    /** One wooden crib elevator: tower, shoulders, headhouse. Returns its top. */
    const crib = (cx: number, width: number, bodyH: number, lettered: readonly string[] | null) => {
      const d = width * 0.95;
      wallBox([width, bodyH, d], [cx, bodyH / 2, 0], lettered);
      const shoulder = width * 0.3;
      gable(width + 0.5, d + 0.5, shoulder, [cx, bodyH, 0], roofing, true).rotation.y = Math.PI / 2;
      const headW = width * 0.42, headH = width * 0.5;
      const lean = gutted ? (random() - 0.5) * 0.12 : 0;
      const head = s.box([d * 0.98, headH + shoulder * 0.5, headW], [cx, bodyH + shoulder * 0.5 + headH / 2, 0], cladding(d, headH, null));
      head.rotation.y = Math.PI / 2;
      head.rotation.z = lean;
      const cap = gable(headW + 0.5, d * 0.98 + 0.5, headW * 0.42, [cx, bodyH + shoulder * 0.75 + headH, 0], roofing);
      cap.rotation.x = -lean;
      for (const z of [-1, 1]) s.box([headW * 0.25, headH * 0.3, 0.1], [cx, bodyH + shoulder + headH * 0.45, z * (d * 0.49 + 0.02)], pane);
      s.box([width * 0.1, bodyH * 0.06, 0.1], [cx + width * 0.25, bodyH * 0.72, d / 2 + 0.06], pane);
      return { top: bodyH + shoulder * 0.75 + headH + headW * 0.42, d, headW };
    };

    if (a.kind !== 'concrete') {
      const width = 8.5, bodyH = mix(11, 19, tall);
      const main = crib(0, width, bodyH, words);
      depth = main.d;
      left = -width / 2;
      right = width / 2;
      if (a.kind === 'twin') {
        const annex = crib(width * 0.5 + 5.2, 10.4, bodyH * 1.12, null);
        right = width * 0.5 + 10.4;
        ridge = { x0: 0, x1: width * 0.5 + 5.2, y: Math.max(main.top, annex.top), z: 0 };
        s.box([3, 2.2, 2.4], [width * 0.5 + 0.2, bodyH * 0.95, 0], cladding(3, 2.2, null));
      } else ridge = { x0: 0, x1: 0, y: main.top, z: 0 };
      // Drive shed with its dark doorway and ramp.
      const shedW = 5, shedH = 5.2;
      doorX = left - shedW / 2;
      s.box([shedW, shedH, depth * 0.8], [doorX, shedH / 2, 0], cladding(shedW, shedH, null));
      const lid = s.box([shedW + 0.6, 0.2, depth * 0.8 + 0.6], [doorX - 0.1, shedH + 0.55, 0], roofing);
      lid.rotation.z = 0.22;
      s.box([shedW * 0.62, shedH * 0.72, 0.12], [doorX, shedH * 0.36, depth * 0.4 + 0.02], derelict ? mat('#6b5438') : dark);
      const ramp = s.box([shedW * 0.7, 0.3, 3.4], [doorX, 0.12, depth * 0.4 + 1.6], mat('#8f8674'));
      ramp.rotation.x = 0.09;
      // Office lean-to.
      s.box([3.2, 2.8, 3], [left + 1.9, 1.4, depth / 2 + 1.5], cladding(3.2, 2.8, null));
      s.box([3.6, 0.16, 3.5], [left + 1.9, 2.95, depth / 2 + 1.6], roofing).rotation.x = 0.16;
      s.box([0.9, 1.9, 0.08], [left + 1.3, 0.95, depth / 2 + 3.02], trim);
      s.box([0.9, 0.8, 0.08], [left + 2.7, 1.7, depth / 2 + 3.02], pane);
      spoutFrom = [right - 0.2, bodyH * (a.kind === 'twin' ? 0.8 : 0.72), depth / 2 - 1];
    } else {
      const silos = 4, r = 3.1, silH = mix(15, 26, tall);
      const concrete = cladding(r * 6.28, silH, null, true);
      left = -((silos - 1) * r * 1.9) / 2 - r;
      right = -left + 5.6;
      depth = r * 2;
      for (let i = 0; i < silos; i++) s.cylinder(r, r, silH, [left + r + i * r * 1.9, silH / 2, 0], concrete, 28);
      const span = (silos - 1) * r * 1.9 + r * 1.6;
      wallBox([span, 3.4, 3.6], [0, silH + 1.7, 0], null);
      s.mesh(new THREE.PlaneGeometry(span, 3.4), cladding(span, 3.4 / 0.6, null), [0, silH + 1.7, 1.83]);
      const banner = paint(512, 96, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = ink;
        g.globalAlpha = letterAlpha;
        g.font = 'bold 70px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(words.join(' '), w / 2, h / 2 + 4, w * 0.94);
      });
      s.mesh(new THREE.PlaneGeometry(span * 0.94, 2.6), new THREE.MeshStandardMaterial({ map: banner, alphaTest: 0.2, roughness: 0.9, side: THREE.DoubleSide }), [0, silH + 1.7, 1.87]);
      gable(4.1, span + 0.4, 0.9, [0, silH + 3.4, 0], roofing, true);
      for (let i = 0; i < 7; i++) s.box([0.8, 0.9, 0.08], [-span / 2 + 1.2 + (i * (span - 2.4)) / 6, silH + 0.75, 1.9], pane);
      // Leg tower.
      const legH = silH + 9;
      const legX = right - 2.6;
      s.box([5, legH, 5.4], [legX, legH / 2, 0], concrete);
      s.box([5.4, 0.3, 5.8], [legX, legH + 0.15, 0], trim);
      s.box([2.4, 2.2, 2.4], [legX, legH + 1.3, 0], cladding(2.4, 2.2, null));
      for (let i = 0; i < 4; i++) s.box([0.9, 1.3, 0.08], [legX, legH - 2.5 - i * 4.5, 2.74], pane);
      s.box([3.2, 4.2, 0.12], [legX, 2.1, 2.74], derelict ? mat('#6b5438') : dark);
      doorX = legX;
      ridge = { x0: -span / 2, x1: span / 2, y: silH + 4.3, z: 0 };
      spoutFrom = [right - 0.1, silH * 0.6, 1];
    }

    // Loading spout out over the siding.
    const railX = right + 3.4;
    const steel = mat(new THREE.Color('#a4a9a8').lerp(new THREE.Color(rust), wear * 0.5), { metalness: 0.5, roughness: 0.5 });
    const spoutEnd: P3 = [railX, 5.2, spoutFrom[2]];
    if (gutted) {
      s.rod([right + 0.8, 0.25, depth / 2 + 1], [right + 6.5, 0.25, depth / 2 + 3.2], 0.28, steel);
      s.box([0.9, 0.8, 0.9], [spoutFrom[0], spoutFrom[1], spoutFrom[2]], steel);
    } else {
      s.rod(spoutFrom, spoutEnd, 0.3, steel, 0.24);
      s.rod([spoutFrom[0], spoutFrom[1] + 2.4, spoutFrom[2]], [mix(spoutFrom[0], railX, 0.6), mix(spoutFrom[1], 5.2, 0.6) + 0.3, spoutFrom[2]], 0.03, dark);
      s.cylinder(0.24, 0.3, 0.9, [railX, 4.8, spoutFrom[2]], steel, 12);
    }

    // Siding and hopper car.
    const gold = mat('#d9a93a', { roughness: 0.95, emissive: '#7a5410', emissiveIntensity: 0.25 });
    if (a.siding !== 'none') {
      const length = 21, cz = 0;
      const railSteel = mat(new THREE.Color('#5d5348').lerp(new THREE.Color(rust), 0.3 + wear * 0.4), { metalness: 0.5 });
      for (const dx of [-0.72, 0.72]) s.box([0.1, 0.16, length], [railX + dx, 0.2, cz], railSteel);
      s.box([3.2, 0.1, length + 0.6], [railX, 0.05, cz], mat('#8d8676', { roughness: 1 }));
      const ties = Array.from({ length: Math.floor(length / 0.75) }, (_unused, i) => ({ at: [railX, 0.12, cz - length / 2 + 0.4 + i * 0.75] as const, size: 1, color: '#4a3a2c' }));
      s.scatter(new THREE.BoxGeometry(2.5, 0.12, 0.24), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.95 }), ties);
      if (a.siding === 'hopper') {
        const carColour = mat(new THREE.Color(['#6f7f8c', '#8c5a3c', '#b9b29c', '#3f6a4c'][Math.floor(random() * 4)]).lerp(new THREE.Color(rust), wear * 0.4));
        const cz2 = spoutFrom[2] - 2;
        s.box([3, 2.6, 13.5], [railX, 3.4, cz2], carColour);
        for (let bay = 0; bay < 3; bay++) {
          const hopper = s.cylinder(1.9, 0.5, 1.5, [railX, 1.45, cz2 - 4.4 + bay * 4.4], carColour, 4);
          hopper.rotation.y = Math.PI / 4;
          hopper.scale.z = 1.15;
        }
        for (let rib = 0; rib < 10; rib++) s.box([3.12, 2.6, 0.12], [railX, 3.4, cz2 - 6.4 + rib * 1.42], carColour);
        s.box([1, 0.18, 13.2], [railX, 4.78, cz2], steel);
        for (const z of [-5.2, 5.2]) for (const dx of [-0.72, 0.72]) for (const dz of [-0.85, 0.85]) s.cylinder(0.46, 0.46, 0.14, [railX + dx, 0.74, cz2 + z + dz], dark, 14).rotation.z = Math.PI / 2;
        s.mesh(new THREE.PlaneGeometry(4.4, 1.1), cladding(4.4, 1.1 / 0.6, null), [railX - 1.52, 3.6, cz2]).visible = false;
      }
    }

    // Steel bins.
    const binCount = Math.round(a.bins * 3 + (mood.density - 0.5) * 1.2);
    const binTin = cladding(18, 7, null);
    binTin.map!.wrapS = THREE.RepeatWrapping;
    for (let i = 0; i < Math.max(0, Math.min(3, binCount)); i++) {
      const r = 2.7 + random() * 0.6, h = 5.5 + random() * 2.5;
      const x = left - 9 - i * 6.3 + (a.kind === 'concrete' ? 5 : 0), z = -1 + random() * 2;
      const bin = s.cylinder(r, r, h, [x, h / 2, z], new THREE.MeshStandardMaterial({ map: paint(256, 128, (g, w, hh) => {
        g.fillStyle = hex(new THREE.Color('#c3c7c5').lerp(new THREE.Color(rust), wear * 0.35));
        g.fillRect(0, 0, w, hh);
        for (let y = 0; y < hh; y += 6) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, y, w, 2.4); }
        for (let xx = 0; xx < w; xx += 32) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(xx, 0, 1.5, hh); }
      }), metalness: 0.45, roughness: 0.5 }), 28);
      bin.rotation.y = random() * 6;
      s.cylinder(0.3, r + 0.15, r * 0.62, [x, h + r * 0.31, z], roofing, 28);
      s.cylinder(0.34, 0.34, 0.35, [x, h + r * 0.62 + 0.1, z], steel, 10);
      s.box([0.5, h, 0.08], [x, h / 2, z + r + 0.05], dark);
    }
    void binTin;

    // What is happening here.
    const yardLight = (x: number, z: number) => {
      s.rod([x, 0, z], [x, 6.2, z], 0.09, mat('#4a3a2c'), 0.07);
      s.rod([x, 6, z], [x + 1.1, 6.3, z], 0.04, steel);
      s.ball([0.34, 0.16, 0.34], [x + 1.1, 6.2, z], mat('#fff0c0', { emissive: '#ffd28a', emissiveIntensity: derelict ? 0 : 0.4 + dusk * 1.5 }), 12);
    };
    yardLight(doorX - 3.4, depth / 2 + 4.5);
    let dust: THREE.Mesh[] = [];
    if (a.state === 'harvest') {
      const tx = doorX, tz = depth * 0.4 + 5.2;
      const cab = mat(mood.cheer > 0.5 ? '#b3242c' : '#3f5f7d', { roughness: 0.4 });
      s.box([2.3, 1.5, 4.6], [tx, 2.0, tz - 0.4], mat('#8f8674'));
      s.box([2.0, 0.5, 4.3], [tx, 2.6, tz - 0.4], gold);
      s.box([2.2, 1.7, 1.7], [tx, 1.75, tz + 3], cab);
      s.box([2.0, 0.7, 0.9], [tx, 2.15, tz + 3.45], pane);
      s.box([2.1, 0.9, 1.3], [tx, 1.15, tz + 4.3], cab);
      for (const z of [-1.9, -0.7, 3.9]) for (const dx of [-1.05, 1.05]) s.cylinder(0.52, 0.52, 0.34, [tx + dx, 0.52, tz + z], dark, 14).rotation.z = Math.PI / 2;
      const pileX = right + (a.siding === 'none' ? 4 : 9);
      s.cylinder(0.2, 4.6, 2.9, [pileX, 1.45, depth / 2 + 3], gold, 20);
      s.cylinder(0.2, 2.2, 1.4, [pileX - 3.6, 0.7, depth / 2 + 4.6], gold, 16);
      s.rod([spoutEnd[0], 4.4, spoutEnd[2]], [spoutEnd[0], a.siding === 'hopper' ? 4.6 : 0.2, spoutEnd[2]], 0.13, gold, 0.3);
      if (a.siding !== 'hopper') s.cylinder(0.1, 1.5, 0.9, [spoutEnd[0], 0.5, spoutEnd[2]], gold, 14);
      const haze = new THREE.MeshStandardMaterial({ color: '#e8cf93', transparent: true, opacity: 0.16, depthWrite: false, roughness: 1 });
      dust = Array.from({ length: 5 + Math.round(mood.energy * 5) }, (_unused, i) => {
        const puff = s.ball([1, 1, 1], [spoutEnd[0] + (random() - 0.5) * 3, 2 + random() * 5, spoutEnd[2] + (random() - 0.5) * 4 + i * 0.3], haze, 10);
        puff.scale.setScalar(1.2 + random() * 2.2);
        puff.castShadow = puff.receiveShadow = false;
        puff.userData.live = true;
        puff.userData.home = puff.position.clone();
        puff.userData.phase = random() * 6;
        return puff;
      });
    }
    if (derelict) {
      const plank = mat('#a08a62', { roughness: 0.95 });
      const z = a.kind === 'concrete' ? 2.85 : depth * 0.4 + 0.12;
      for (const turn of [-0.6, 0.6]) s.box([4.6, 0.3, 0.06], [doorX, 1.9, z], plank).rotation.z = turn;
      const birds = Array.from({ length: 5 + Math.round(random() * 9) }, () => ({ at: [mix(ridge.x0 - 2, ridge.x1 + 2, random()), ridge.y + 0.12, ridge.z + (random() - 0.5) * 3] as const, size: 0.16 + random() * 0.06, color: '#3a3d42' }));
      s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.9 }), birds);
      const weeds = Array.from({ length: 60 }, () => ({ at: [mix(left - 6, right + 5, random()), 0.25, depth / 2 + 0.3 + random() * 5] as const, size: 0.25 + random() * 0.45, color: ['#7b8048', '#93935a', '#6a7340'][Math.floor(random() * 3)] }));
      s.scatter(new THREE.ConeGeometry(0.5, 2, 5), new THREE.MeshStandardMaterial({ map: blank, roughness: 1 }), weeds);
    }

    fuse(s.root);
    const drift = mix(0.1, 0.6, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const puff of dust) {
          const home = puff.userData.home as THREE.Vector3, phase = puff.userData.phase as number;
          const t = (time * drift * 0.2 + phase) % 1;
          puff.position.set(home.x + t * 3, home.y + t * 2.5, home.z + Math.sin(phase + time * 0.3) * 0.6);
        }
      },
    });
  },
});
