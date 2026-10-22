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
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;

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

export default defineThing({
  questions: {
    occasion: choice('What is the bandstand set for, or what has become of it?', {
      concert: 'A band concert: folding chairs in an arc, music stands, a bass drum waiting.',
      dance: 'An evening dance: swags of glowing bulbs strung all around the eaves and under the roof.',
      holiday: 'A patriotic holiday: red, white and blue bunting and pennants on every side and a podium for speeches.',
      wedding: 'A wedding: white drapes swagged between the posts and flowers tied to each one.',
      empty: 'Nothing at all: swept, bare and waiting, one forgotten chair.',
      condemned: 'Closed off: caution tape around the posts, a KEEP OFF board, balusters missing and leaves blown in.',
    }),
    roof: choice('What shape is the roof?', {
      pyramid: 'A simple eight-sided pointed roof.',
      tiered: 'Two tiers with a little open cupola between them.',
      bell: 'A swooping bell-curved roof, flared at the eaves like a Victorian park pavilion.',
      low: 'A broad, low hipped roof with deep eaves.',
    }),
    shingles: choice('What covers the roof?', {
      cedar: 'Weathered silver-grey cedar shakes.',
      green: 'Dark green asphalt shingles.',
      red: 'Barn-red painted shingles.',
      copper: 'Standing copper gone pale verdigris green.',
      black: 'Black tar shingles.',
    }),
    paint: choice('What colour is the woodwork?', {
      white: 'Bright white all over.',
      cream: 'Cream with dark green rails and trim.',
      blue: 'Pale porch-ceiling blue with white trim.',
      bare: 'Never repainted: bare grey wood with ghosts of white.',
    }),
    trim: choice('What decorates the tops of the posts?', {
      plain: 'Nothing, just a plain beam.',
      brackets: 'Scrolled gingerbread brackets at every post.',
      arches: 'Shallow arches spanning from post to post.',
    }),
    base: choice('What does the deck sit on?', {
      lattice: 'A skirt of white diagonal lattice.',
      stone: 'A mortared fieldstone foundation.',
      brick: 'A red brick foundation.',
    }),
    finial: choice('What tops the roof?', {
      vane: 'A weathervane with an arrow.',
      spire: 'A turned spire with a ball.',
      flag: 'A short flagstaff flying a flag.',
      none: 'Nothing, just a cap.',
    }),
    height: score('How tall and airy is it?', ['Squat, low-roofed', 'Ordinary', 'Tall and elegant on a high deck']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const condemned = a.occasion === 'condemned';
    const wear = Math.min(1, mood.wear + (condemned ? 0.3 : 0) + (a.paint === 'bare' ? 0.2 : 0));
    const R = 2.6, turn = Math.PI / 8, apothem = R * Math.cos(turn);
    const deckY = mix(0.5, 1.05, a.height);
    const postH = mix(2.2, 3.0, a.height);
    const eaveY = deckY + postH;
    const vertex = (k: number, r = R): [number, number] => [Math.sin(turn + (k * Math.PI) / 4) * r, Math.cos(turn + (k * Math.PI) / 4) * r];
    // Side k runs from vertex k to k + 1; side 7 faces +z and carries the steps.
    const FRONT = 7;

    // Every surface shares one of three shader variants, which keeps first-frame compile short.
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });
    const sheet = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85 });
    const sign = (text: string, width: number, height: number, at: P3, ink: string, paper: string) => {
      const map = paint(256, Math.round((256 * height) / width), (g, w, h) => {
        g.fillStyle = paper; g.fillRect(0, 0, w, h);
        g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `bold ${Math.min(h * 0.62, (w / text.length) * 1.4)}px sans-serif`;
        g.fillText(text, w / 2, h / 2, w * 0.92);
      });
      map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
      return s.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), at);
    };
    const flat = (geometry: THREE.BufferGeometry) => { const g = geometry.toNonIndexed(); g.computeVertexNormals(); geometry.dispose(); return g; };
    const woodGrey = new THREE.Color('#8d877b');
    const bodyColour = new THREE.Color({ white: '#f6f4ec', cream: '#efe5c8', blue: '#bcd6e2', bare: '#aaa498' }[a.paint]);
    const trimColour = new THREE.Color({ white: '#f6f4ec', cream: '#2f5a43', blue: '#f6f4ec', bare: '#9c968a' }[a.paint]);
    const flake = paint(128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < wear * wear * 150; i++) {
        g.fillStyle = random() < 0.6 ? '#8d877b' : '#6f675a';
        g.fillRect(random() * w, random() * h, 2 + random() * 9, 4 + random() * 26);
      }
    });
    const body = mat(bodyColour.clone().lerp(woodGrey, wear * 0.25), { map: flake, roughness: 0.7 });
    const trim = mat(trimColour.clone().lerp(woodGrey, wear * 0.25), { map: flake, roughness: 0.7 });
    const boards = mat(new THREE.Color('#b9a98a').lerp(woodGrey, 0.3 + wear * 0.4), { roughness: 0.85 });

    // Foundation skirt and deck.
    if (a.base === 'lattice') {
      const lattice = paint(128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.strokeStyle = hex(bodyColour.clone().lerp(woodGrey, wear * 0.4));
        g.lineWidth = 9;
        for (let i = -4; i < 8; i++) {
          g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 128, 128); g.stroke();
          g.beginPath(); g.moveTo(i * 32, 128); g.lineTo(i * 32 + 128, 0); g.stroke();
        }
      });
      lattice.repeat.set(24, 1.5);
      const skirt = s.cylinder(R - 0.08, R - 0.08, deckY, [0, deckY / 2, 0], sheet(lattice), 8);
      skirt.rotation.y = turn;
      s.cylinder(R - 0.3, R - 0.3, deckY - 0.05, [0, deckY / 2, 0], mat('#3a3d38'), 8).rotation.y = turn;
    } else {
      const masonry = paint(256, 128, (g, w, h) => {
        const stone = a.base === 'stone';
        g.fillStyle = stone ? '#8d8a80' : '#b9b2a2';
        g.fillRect(0, 0, w, h);
        const rows = stone ? 4 : 8;
        for (let row = 0; row < rows; row++) {
          let x = -random() * 30;
          while (x < w) {
            const span = stone ? 26 + random() * 34 : 30;
            const tone = stone ? new THREE.Color().setHSL(0.09 + random() * 0.05, 0.08 + random() * 0.1, 0.42 + random() * 0.25) : new THREE.Color().setHSL(0.02 + random() * 0.02, 0.45, 0.33 + random() * 0.1);
            g.fillStyle = hex(tone);
            g.fillRect(x + 1.5, (row * h) / rows + 1.5, span - 3, h / rows - 3);
            x += span;
          }
        }
      });
      masonry.repeat.set(6, 1);
      s.cylinder(R - 0.05, R + 0.02, deckY, [0, deckY / 2, 0], new THREE.MeshStandardMaterial({ map: masonry, roughness: 0.95 }), 8).rotation.y = turn;
    }
    s.cylinder(R + 0.12, R + 0.12, 0.14, [0, deckY - 0.07, 0], boards, 8).rotation.y = turn;
    s.cylinder(R + 0.14, R + 0.14, 0.05, [0, deckY - 0.16, 0], trim, 8).rotation.y = turn;

    // Steps on the front side.
    const steps = Math.max(2, Math.round(deckY / 0.19));
    for (let i = 0; i < steps; i++) {
      const y = deckY - ((i + 1) * deckY) / (steps + 1);
      s.box([1.7, 0.06, 0.32], [0, y, apothem + 0.2 + i * 0.3], boards);
      s.box([1.6, y, 0.04], [0, y / 2, apothem + 0.34 + i * 0.3], body);
    }
    for (const x of [-0.88, 0.88]) s.rod([x, deckY - 0.12, apothem + 0.05], [x, 0.02, apothem + 0.2 + steps * 0.3], 0.06, trim);

    // Turned posts.
    const profile: [number, number][] = [[0.12, 0], [0.12, 0.55], [0.085, 0.62], [0.11, 0.7], [0.075, 0.82], [0.07, postH * 0.55], [0.09, postH - 0.6], [0.065, postH - 0.5], [0.1, postH - 0.4], [0.12, postH - 0.3], [0.12, postH]];
    for (let k = 0; k < 8; k++) {
      const [x, z] = vertex(k, R - 0.08);
      const post = s.lathe(profile, body, [x, deckY, z]);
      if (condemned && k === 2) post.rotation.z = 0.05;
    }

    // Railing with balusters on every side but the front.
    const balusters: { at: P3; size: number }[] = [];
    for (let k = 0; k < 8; k++) {
      if (k === FRONT) continue;
      const [ax, az] = vertex(k, R - 0.08), [bx, bz] = vertex(k + 1, R - 0.08);
      const broken = wear > 0.55 && random() < (wear - 0.45) * 0.9;
      s.rod([ax, deckY + 0.14, az], [bx, deckY + 0.14, bz], 0.035, trim);
      if (broken) s.rod([ax, deckY + 0.88, az], [mix(ax, bx, 0.85), deckY + 0.3, mix(az, bz, 0.85)], 0.04, trim);
      else s.rod([ax, deckY + 0.88, az], [bx, deckY + 0.88, bz], 0.045, trim);
      for (let i = 1; i < 10; i++) {
        if (broken && i > 2) continue;
        if (wear > 0.4 && random() < (wear - 0.4) * 0.5) continue;
        balusters.push({ at: [mix(ax, bx, i / 10), deckY + 0.51, mix(az, bz, i / 10)], size: 1 });
      }
    }
    s.scatter(new THREE.CylinderGeometry(0.022, 0.028, 0.7, 6), body, balusters.map((b) => ({ ...b, color: '#ffffff' })));

    // Beam, trim and ceiling.
    const beam = s.cylinder(R - 0.02, R - 0.02, 0.24, [0, eaveY - 0.12, 0], trim, 8);
    beam.rotation.y = turn;
    for (let k = 0; k < 8; k++) {
      const [ax, az] = vertex(k, R - 0.08), [bx, bz] = vertex(k + 1, R - 0.08);
      if (a.trim === 'brackets')
        for (const [fx, fz, tx, tz] of [[ax, az, bx, bz], [bx, bz, ax, az]] as const) {
          const along = (t: number): [number, number] => [mix(fx, tx, t), mix(fz, tz, t)];
          const [p1x, p1z] = along(0.1), [p2x, p2z] = along(0.24);
          s.tube([[fx, eaveY - 0.75, fz], [p1x, eaveY - 0.5, p1z], [p2x, eaveY - 0.26, p2z]], 0.028, body);
          s.ball([0.05, 0.05, 0.05], [p1x, eaveY - 0.36, p1z], body, 8);
        }
      else if (a.trim === 'arches') {
        const points: P3[] = [];
        for (let i = 0; i <= 8; i++) points.push([mix(ax, bx, i / 8), eaveY - 0.26 - 0.55 * Math.pow(Math.abs(i / 4 - 1), 2.4), mix(az, bz, i / 8)]);
        s.tube(points, 0.035, body);
      }
    }

    // Roof.
    const tone = new THREE.Color({ cedar: '#9a968c', green: '#35513f', red: '#8c2f27', copper: '#7fb5a2', black: '#2c2d30' }[a.shingles]);
    const shingle = paint(256, 256, (g, w, h) => {
      g.fillStyle = hex(tone.clone().multiplyScalar(0.55));
      g.fillRect(0, 0, w, h);
      const rows = a.shingles === 'copper' ? 1 : 12, columns = a.shingles === 'copper' ? 16 : 20;
      for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) {
          if (random() < wear * wear * 0.3) continue;
          g.fillStyle = hex(tone.clone().offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.12 + (random() < wear * 0.3 ? -0.1 : 0)));
          g.fillRect(((column + (row % 2) * 0.5) * w) / columns + 1, (row * h) / rows + 1, w / columns - 2, h / rows - 2);
          if (column === 0 && row % 2) g.fillRect(-w / columns / 2 + 1, (row * h) / rows + 1, w / columns - 2, h / rows - 2);
        }
    });
    shingle.repeat.set(4, 1);
    const roofing = new THREE.MeshStandardMaterial({ map: shingle, roughness: 0.85 });
    const eaveR = R + (a.roof === 'low' ? 0.75 : 0.45);
    const under = s.cylinder(eaveR - 0.05, eaveR - 0.05, 0.06, [0, eaveY + 0.03, 0], body, 8);
    under.rotation.y = turn;
    let peak = eaveY;
    const add = (geometry: THREE.BufferGeometry, y: number, material: THREE.Material = roofing) => {
      const mesh = s.mesh(material === roofing ? flat(geometry) : geometry, material, [0, y, 0]);
      mesh.rotation.y = turn;
      return mesh;
    };
    const rise = mix(1.3, 2.3, a.height);
    if (a.roof === 'pyramid') {
      add(new THREE.ConeGeometry(eaveR, rise, 8, 1), eaveY + 0.06 + rise / 2);
      peak = eaveY + 0.06 + rise;
    } else if (a.roof === 'low') {
      add(new THREE.ConeGeometry(eaveR, rise * 0.55, 8, 1), eaveY + 0.06 + rise * 0.275);
      peak = eaveY + 0.06 + rise * 0.55;
    } else if (a.roof === 'tiered') {
      add(new THREE.CylinderGeometry(eaveR * 0.36, eaveR, rise * 0.5, 8, 1), eaveY + 0.06 + rise * 0.25);
      const cupolaY = eaveY + 0.06 + rise * 0.5;
      for (let k = 0; k < 8; k++) {
        const [x, z] = vertex(k, eaveR * 0.3);
        s.cylinder(0.035, 0.035, 0.42, [x, cupolaY + 0.21, z], body, 6);
      }
      add(new THREE.CylinderGeometry(eaveR * 0.2, eaveR * 0.2, 0.4, 8), cupolaY + 0.2, mat('#3a3d38'));
      add(new THREE.ConeGeometry(eaveR * 0.48, rise * 0.5, 8, 1), cupolaY + 0.42 + rise * 0.25);
      peak = cupolaY + 0.42 + rise * 0.5;
    } else {
      const points: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        points.push(new THREE.Vector2(eaveR * (1 - t) ** 1.9 + 0.04 * t, rise * 1.1 * (t ** 0.75)));
      }
      add(new THREE.LatheGeometry(points, 8), eaveY + 0.06);
      peak = eaveY + 0.06 + rise * 1.1;
    }

    // Finial.
    const metal = mat(a.shingles === 'copper' ? '#7fb5a2' : '#2a2b2d', { metalness: 0.6, roughness: 0.4 });
    s.cylinder(0.05, 0.14, 0.2, [0, peak + 0.02, 0], metal, 8);
    let flag: THREE.Mesh | null = null;
    if (a.finial === 'vane') {
      s.rod([0, peak, 0], [0, peak + 0.9, 0], 0.02, metal);
      const spin = random() * Math.PI;
      const dx = Math.cos(spin) * 0.5, dz = Math.sin(spin) * 0.5;
      s.rod([-dx, peak + 0.72, -dz], [dx, peak + 0.72, dz], 0.014, metal);
      s.rod([dx * 0.7, peak + 0.72, dz * 0.7], [dx, peak + 0.72, dz], 0.07, metal, 0.001);
      s.box([0.02, 0.2, 0.2], [-dx, peak + 0.72, -dz], metal).rotation.y = -spin + Math.PI / 2;
      s.ball([0.07, 0.07, 0.07], [0, peak + 0.45, 0], metal, 10);
    } else if (a.finial === 'spire') {
      s.lathe([[0.05, 0], [0.09, 0.12], [0.03, 0.25], [0.06, 0.4], [0.015, 0.75], [0, 0.95]], metal, [0, peak + 0.1, 0]);
      s.ball([0.1, 0.1, 0.1], [0, peak + 0.42, 0], mat('#d8b755', { metalness: 0.8, roughness: 0.3 }), 12);
    } else if (a.finial === 'flag') {
      s.rod([0, peak, 0], [0, peak + 1.7, 0], 0.022, mat('#e9e6dc'));
      s.ball([0.045, 0.045, 0.045], [0, peak + 1.72, 0], mat('#d8b755', { metalness: 0.8 }), 10);
      const cloth = paint(128, 80, (g, w, h) => {
        for (let i = 0; i < 7; i++) {
          g.fillStyle = i % 2 ? '#f1ede2' : '#b3242c';
          g.fillRect(0, (i * h) / 7, w, h / 7 + 1);
        }
        g.fillStyle = '#27397d';
        g.fillRect(0, 0, w * 0.42, h * 0.57);
        g.fillStyle = '#f1ede2';
        for (let i = 0; i < 12; i++) g.fillRect(5 + (i % 4) * 12, 5 + Math.floor(i / 4) * 13, 4, 4);
      });
      const geometry = new THREE.PlaneGeometry(0.95, 0.6, 10, 1);
      geometry.translate(0.475, 0, 0);
      flag = s.mesh(geometry, sheet(cloth), [0.02, peak + 1.35, 0]);
      flag.rotation.y = -0.5 + random();
    }

    // Occasion dressing.
    const pennantPositions: number[] = [], pennantUvs: number[] = [];
    const pushPennant = (p: P3, q: P3, drop: number, colour: number) => {
      pennantPositions.push(...p, ...q, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - drop, (p[2] + q[2]) / 2);
      for (let i = 0; i < 3; i++) pennantUvs.push((colour + 0.5) / 3, 0.5);
    };
    const festive = ['#c8202c', '#f4f0e6', '#24418f'].map((c) => new THREE.Color(c).lerp(woodGrey, wear * 0.5));
    const cord = mat('#3b3a36');
    const swag = (from: [number, number], to: [number, number], y: number, sag: number, n: number, push = 1.02): P3[] =>
      Array.from({ length: n + 1 }, (_unused, i) => {
        const t = i / n;
        return [mix(from[0], to[0], t) * push, y - sag * 4 * t * (1 - t), mix(from[1], to[1], t) * push] as const;
      });
    let bulbs: THREE.InstancedMesh | null = null;
    const bulbMaterial = new THREE.MeshStandardMaterial({ map: blank, color: '#fff3c9', emissive: new THREE.Color('#ffe2a0').lerp(new THREE.Color('#ffb04a'), mood.warmth), emissiveIntensity: mix(0.7, 1.6, Math.max(mood.cheer, Math.abs(mood.daylight - 0.5) * 2)) });

    if (a.occasion === 'holiday' || a.occasion === 'concert') {
      const full = a.occasion === 'holiday';
      for (let k = 0; k < 8; k++) {
        const line = swag(vertex(k), vertex(k + 1), eaveY - 0.28, 0.22, 10);
        s.tube(line, 0.008, cord);
        for (let i = 0; i < 10; i++) pushPennant(line[i], line[i + 1], 0.3, (i + k) % 3);
        if (full && k !== FRONT) {
          // Half-round fan bunting on the rail.
          const [ax, az] = vertex(k), [bx, bz] = vertex(k + 1);
          const mx = (ax + bx) / 2, mz = (az + bz) / 2, ux = (bx - ax) / 2, uz = (bz - az) / 2;
          for (let i = 0; i < 9; i++) {
            const a0 = (i / 9) * Math.PI, a1 = ((i + 1) / 9) * Math.PI;
            const colour = i < 3 ? 0 : i < 6 ? 1 : 2;
            pennantPositions.push(mx * 1.03, deckY + 0.9, mz * 1.03, (mx - ux * 0.5 * Math.cos(a0)) * 1.03, deckY + 0.9 - 0.55 * Math.sin(a0), (mz - uz * 0.5 * Math.cos(a0)) * 1.03, (mx - ux * 0.5 * Math.cos(a1)) * 1.03, deckY + 0.9 - 0.55 * Math.sin(a1), (mz - uz * 0.5 * Math.cos(a1)) * 1.03);
            for (let j = 0; j < 3; j++) pennantUvs.push((colour + 0.5) / 3, 0.5);
          }
        }
      }
    }
    if (a.occasion === 'dance' || (a.occasion === 'concert' && mood.daylight > 0.7)) {
      const points: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < 8; k++) {
        const line = swag(vertex(k, eaveR), vertex(k + 1, eaveR), eaveY, 0.3, 8, 1);
        s.tube(line, 0.008, cord);
        for (const p of line) points.push({ at: [p[0], p[1] - 0.05, p[2]], size: 0.055, color: '#ffffff' });
        if (k < 4 && a.occasion === 'dance') {
          const cross = swag(vertex(k), vertex(k + 4), eaveY - 0.3, 0.35, 12, 0.95);
          s.tube(cross, 0.008, cord);
          for (const p of cross) points.push({ at: [p[0], p[1] - 0.05, p[2]], size: 0.055, color: '#ffffff' });
        }
      }
      bulbs = s.scatter(new THREE.SphereGeometry(1, 8, 6), bulbMaterial, points);
    }
    if (a.occasion === 'wedding') {
      const cloth = mat('#fbf8f0', { roughness: 0.9 });
      const flowers: { at: P3; size: number; color: string }[] = [];
      const petals = mood.warmth > 0.5 ? ['#f6d7dc', '#f2a7b5', '#fbf8f0', '#f0c66a'] : ['#fbf8f0', '#d9e3f4', '#cdb7e6', '#f6d7dc'];
      for (let k = 0; k < 8; k++) {
        const drape = s.tube(swag(vertex(k, R - 0.08), vertex(k + 1, R - 0.08), eaveY - 0.25, 0.5, 8, 1), 0.09, cloth);
        drape.scale.y = 1;
        const [x, z] = vertex(k, R - 0.08);
        s.rod([x * 1.03, eaveY - 0.3, z * 1.03], [x * 1.04, eaveY - 1.5, z * 1.04], 0.07, cloth, 0.03);
        for (let i = 0; i < 9; i++) flowers.push({ at: [x * 1.04 + (random() - 0.5) * 0.3, eaveY - 0.25 - random() * 0.3, z * 1.04 + (random() - 0.5) * 0.3], size: 0.06 + random() * 0.05, color: petals[i % 4] });
      }
      for (let i = 0; i < 30; i++) flowers.push({ at: [(random() - 0.5) * 1.5, deckY + 0.03 - Math.max(0, random() - 0.4) * deckY, apothem - 0.8 + random() * 2], size: 0.025 + random() * 0.02, color: petals[i % 4] });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.8 }), flowers);
      s.box([1.2, 0.02, apothem + 0.6], [0, deckY + 0.012, apothem / 2 - 0.1], cloth);
      // An arch of greenery where the couple will stand.
      s.ring(0.85, 0.07, [0, deckY + 0.95, -0.9], mat('#4d7a4a', { roughness: 0.9 }), Math.PI);
    }

    const chair = (x: number, z: number, facing: number, tipped = false) => {
      const group = new THREE.Group();
      const steel = mat('#6c6f6e', { metalness: 0.5 });
      const pad = mat(a.paint === 'cream' ? '#2f5a43' : '#7d4a3c');
      const part = (size: P3, at: P3, material: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...at);
        mesh.castShadow = true;
        group.add(mesh);
      };
      part([0.4, 0.03, 0.38], [0, 0.45, 0], pad);
      part([0.4, 0.2, 0.03], [0, 0.78, -0.2], pad);
      part([0.42, 0.45, 0.02], [0, 0.225, 0.17], steel);
      part([0.42, 0.9, 0.02], [0, 0.45, -0.19], steel);
      group.position.set(x, deckY, z);
      group.rotation.y = facing;
      if (tipped) {
        group.rotation.x = -Math.PI / 2;
        group.position.y += 0.2;
      }
      s.root.add(group);
    };
    if (a.occasion === 'concert') {
      const players = 4 + Math.round(mood.density * 5);
      const stand = mat('#1f2022', { metalness: 0.4 });
      for (let i = 0; i < players; i++) {
        const angle = Math.PI + ((i + 0.5) / players - 0.5) * 2.6;
        const r = 1.55 + (i % 2) * 0.25;
        const x = Math.sin(angle) * r, z = Math.cos(angle) * r;
        chair(x, z, angle + Math.PI + (random() - 0.5) * 0.4);
        const sx = Math.sin(angle) * (r - 0.6), sz = Math.cos(angle) * (r - 0.6);
        s.rod([sx, deckY, sz], [sx, deckY + 1.05, sz], 0.012, stand);
        const sheet = s.box([0.42, 0.3, 0.015], [sx, deckY + 1.15, sz], stand);
        sheet.rotation.set(-0.35, angle + Math.PI, 0, 'YXZ');
        const page = s.box([0.34, 0.24, 0.005], [sx - Math.sin(angle) * 0.012, deckY + 1.16, sz - Math.cos(angle) * 0.012], mat('#f4f0e6'));
        page.rotation.copy(sheet.rotation);
      }
      const drum = s.cylinder(0.42, 0.42, 0.35, [0.3, deckY + 0.42, -0.2], mat('#a32a2a'), 24);
      drum.rotation.x = Math.PI / 2;
      sign('TOWN BAND', 0.6, 0.16, [0.3, deckY + 0.42, -0.015], '#1d1d1d', '#f4f0e6');
      const head = s.cylinder(0.4, 0.4, 0.36, [0.3, deckY + 0.42, -0.2], mat('#f4f0e6'), 24);
      head.rotation.x = Math.PI / 2;
    } else if (a.occasion === 'holiday') {
      s.box([0.6, 1.1, 0.45], [0, deckY + 0.55, apothem - 0.9], body);
      s.box([0.7, 0.05, 0.55], [0, deckY + 1.12, apothem - 0.9], trim).rotation.x = 0.15;
      s.rod([0.1, deckY + 1.12, apothem - 0.85], [0.14, deckY + 1.42, apothem - 0.7], 0.012, cord);
      s.ball([0.035, 0.035, 0.05], [0.14, deckY + 1.43, apothem - 0.69], cord, 8);
    } else if (a.occasion === 'empty') chair(-0.9 + random() * 1.8, -0.6 + random() * 0.8, random() * 6.28, mood.wear > 0.6);
    else if (condemned) {
      const tape = mat('#f2c318', { roughness: 0.6 });
      for (let k = 0; k < 8; k++) {
        const [ax, az] = vertex(k, R + 0.02), [bx, bz] = vertex(k + 1, R + 0.02);
        const y = deckY + 1.15 + (random() - 0.5) * 0.25, y2 = deckY + 1.15 + (random() - 0.5) * 0.25;
        const strip = s.box([Math.hypot(bx - ax, bz - az), 0.09, 0.006], [(ax + bx) / 2, (y + y2) / 2, (az + bz) / 2], tape);
        strip.rotation.set(0, Math.atan2(-(bz - az), bx - ax), 0);
      }
      s.box([1.5, 0.9, 0.04], [0, deckY * 0.5 + 0.35, apothem + 0.5 + steps * 0.16], mat('#b89466')).rotation.x = -0.5;
      const board = sign('KEEP OFF', 1.1, 0.34, [0, deckY * 0.5 + 0.4, apothem + 0.54 + steps * 0.16], '#a3221d', '#e9dfc0');
      board.rotation.x = -0.5;
      const leaves = Array.from({ length: 50 }, () => {
        const angle = random() * 6.28, r = Math.sqrt(random()) * (R - 0.4);
        return { at: [Math.sin(angle) * r, deckY + 0.015, Math.cos(angle) * r] as const, size: 0.04 + random() * 0.05, color: ['#8a5a2b', '#a9742f', '#6b4a2a'][Math.floor(random() * 3)] };
      });
      const litter = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.9 }), leaves);
      litter.scale.y = 1;
    }

    let pennants: THREE.Mesh | null = null;
    if (pennantPositions.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(pennantPositions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(pennantUvs, 2));
      geometry.computeVertexNormals();
      const palette = paint(96, 8, (g) => festive.forEach((colour, i) => { g.fillStyle = hex(colour); g.fillRect(i * 32, 0, 32, 8); }));
      pennants = s.mesh(geometry, sheet(palette));
    }

    if (flag) flag.userData.live = true;
    if (pennants) pennants.userData.live = true;
    fuse(s.root);
    const twinkle = bulbMaterial.emissiveIntensity;
    return s.finish({
      footprint: R + 0.6,
      update: (_dt, time) => {
        if (flag) flag.rotation.y += Math.sin(time * (1 + mood.energy * 3)) * 0.003 * (0.3 + mood.energy);
        if (pennants) pennants.rotation.x = Math.sin(time * (0.8 + mood.energy * 2)) * 0.006 * mood.energy;
        if (bulbs) bulbMaterial.emissiveIntensity = twinkle * (0.9 + 0.1 * Math.sin(time * (2 + mood.energy * 6)));
      },
    });
  },
});
