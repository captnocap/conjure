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

const COLOURS = {
  'maroon-gold': ['#7a1f2e', '#e2b530'],
  'blue-white': ['#1f47a8', '#f4f1e8'],
  'green-white': ['#1f6b3f', '#f4f1e8'],
  'orange-black': ['#e8731c', '#1d1c1e'],
  'purple-gold': ['#5a2d8f', '#e8c23a'],
  'red-white-blue': ['#c8202c', '#24418f'],
} as const;
const BANNERS = { homecoming: 'HOMECOMING', wildcats: 'GO WILDCATS!', beat: 'BEAT CENTRAL', alumni: 'WELCOME ALUMNI', seniors: 'SENIORS RULE', queen: 'OUR QUEEN' } as const;

export default defineThing({
  questions: {
    state: choice('Where is the float in its short life?', {
      parade: 'Mid-parade and proud: every pomp fluffed, streamers flying, the royalty just stepped off.',
      building: 'The night before in somebody\'s barn: half the chicken wire still bare, boxes of tissue, a stepladder.',
      soaked: 'Abandoned after the game in the rain: pomps sagging and bleeding colour, the arch collapsed, the banner hanging by one corner.',
      stored: 'Forgotten behind a shed for years: mostly bare wire and faded scraps, weeds, a flat tyre.',
    }),
    colours: choice('What are the school colours?', {
      'maroon-gold': 'Maroon and gold.',
      'blue-white': 'Royal blue and white.',
      'green-white': 'Kelly green and white.',
      'orange-black': 'Orange and black.',
      'purple-gold': 'Purple and gold.',
      'red-white-blue': 'Red, white and blue.',
    }),
    centrepiece: choice('What rides on the deck?', {
      throne: 'A high-backed throne on a riser for the homecoming queen, a crown left on the seat.',
      mascot: 'A giant papier-mache wildcat head, lumpy and fierce.',
      goalpost: 'A goalpost with a huge football going through it.',
      crown: 'An enormous glittering crown with stars on sticks around it.',
      bales: 'Just hay bales to sit on and a couple of folding chairs.',
    }),
    arch: choice('What kind of arch stands over the deck?', {
      crepe: 'Two colours of crepe paper twisted around a hoop.',
      balloons: 'An arch of balloons.',
      rainbow: 'A flat painted plywood rainbow.',
      none: 'No arch.',
    }),
    banner: choice('What does the hand-painted banner say?', {
      homecoming: 'HOMECOMING',
      wildcats: 'GO WILDCATS!',
      beat: 'BEAT CENTRAL',
      alumni: 'WELCOME ALUMNI',
      seniors: 'SENIORS RULE',
      queen: 'OUR QUEEN',
    }),
    trailer: choice('What is underneath it all?', {
      wagon: 'A wooden hay wagon with red steel wheels.',
      flatbed: 'A low steel car-hauler flatbed on twin axles.',
      utility: 'A short single-axle utility trailer, a small class budget.',
    }),
    pattern: choice('How are the pomps arranged on the skirt?', {
      stripes: 'Bold diagonal stripes.',
      checker: 'A chunky checkerboard.',
      waves: 'A wavy band along the middle.',
      solid: 'One solid colour with a border of the other.',
    }),
    length: score('How long is the trailer?', ['Short', 'Ordinary', 'A long showpiece']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const soaked = a.state === 'soaked', stored = a.state === 'stored', building = a.state === 'building';
    const wear = Math.min(1, mood.wear * 0.7 + (stored ? 0.6 : soaked ? 0.3 : 0));
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });
    const drab = new THREE.Color('#9b9484');
    const tone = (colour: string) => new THREE.Color(colour).lerp(drab, wear * (soaked ? 0.15 : 0.45) + (1 - mood.cheer) * 0.08).multiplyScalar(soaked ? 0.82 : 1);
    const [c1, c2] = COLOURS[a.colours].map(tone);
    const accent = a.colours === 'red-white-blue' ? tone('#f4f1e8') : c2;
    const tissue = (colour: THREE.Color, options: THREE.MeshStandardMaterialParameters = {}) => mat(colour, { roughness: soaked ? 0.45 : 0.95, ...options });

    const L = mix(4.4, 7.4, a.length) * (a.trailer === 'utility' ? 0.72 : 1), W = 2.4;
    const deckY = { wagon: 1.05, flatbed: 0.78, utility: 0.7 }[a.trailer];
    const tilt = stored ? 0.045 : 0;

    // Running gear.
    const steel = mat(a.trailer === 'wagon' ? '#a3322a' : '#2b2d30', { metalness: 0.4 });
    const rubber = mat('#1b1b1c', { roughness: 0.9 });
    const wheelR = a.trailer === 'wagon' ? 0.42 : 0.33;
    const axles = a.trailer === 'wagon' ? [-L * 0.36, L * 0.36] : a.trailer === 'flatbed' ? [-0.45, 0.45] : [0];
    for (const x of axles)
      for (const side of [-1, 1]) {
        const flat = stored && side === 1 && x === axles[0];
        const tyre = s.cylinder(wheelR, wheelR, 0.24, [x, flat ? wheelR * 0.8 : wheelR, side * (W / 2 - 0.2)], rubber, 18);
        tyre.rotation.x = Math.PI / 2;
        if (flat) tyre.scale.z = 0.8;
        s.cylinder(wheelR * 0.5, wheelR * 0.5, 0.26, [x, flat ? wheelR * 0.8 : wheelR, side * (W / 2 - 0.2)], steel, 10).rotation.x = Math.PI / 2;
      }
    s.box([L, 0.12, W * 0.5], [0, deckY - 0.2, 0], steel);
    s.rod([L / 2 - 0.2, deckY - 0.2, 0], [L / 2 + 1.5, 0.5, 0], 0.06, steel);
    s.rod([L / 2 - 0.3, deckY - 0.2, -0.6], [L / 2 + 1.2, 0.56, 0], 0.04, steel);
    s.rod([L / 2 - 0.3, deckY - 0.2, 0.6], [L / 2 + 1.2, 0.56, 0], 0.04, steel);
    s.cylinder(0.05, 0.08, 0.5, [L / 2 + 1.1, 0.25, 0], steel, 8);

    // Skirt of pomps over chicken wire.
    const bareShare = stored ? 0.72 : building ? 0 : soaked ? 0.12 : mood.wear * 0.08;
    const skirtMap = (metres: number, unfinishedFrom: number) =>
      paint(Math.round(64 * metres), 72, (g, w, h) => {
        g.fillStyle = '#5f5546';
        g.fillRect(0, 0, w, h);
        g.strokeStyle = '#a7a59c';
        g.lineWidth = 1;
        for (let x = -h; x < w; x += 8) {
          g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke();
          g.beginPath(); g.moveTo(x + h, 0); g.lineTo(x, h); g.stroke();
        }
        const cell = 9, patchSeed = random() * 10;
        for (let cy = 0; cy < h / cell; cy++)
          for (let cx = 0; cx < w / cell; cx++) {
            const u = cx / (w / cell), v = cy / (h / cell);
            if (u > unfinishedFrom + Math.sin(cy * 1.3) * 0.03) continue;
            if (Math.sin(cx * 0.37 + patchSeed) * Math.cos(cy * 0.8 + cx * 0.21 + patchSeed) + random() * 0.5 < bareShare * 2.4 - 1) continue;
            let pick = 0;
            if (a.pattern === 'stripes') pick = Math.floor((cx + cy * 1.2) / 5) % 2;
            else if (a.pattern === 'checker') pick = (Math.floor(cx / 4) + Math.floor(cy / 4)) % 2;
            else if (a.pattern === 'waves') pick = Math.abs(v - 0.5 - Math.sin(cx * 0.35) * 0.18) < 0.17 ? 1 : 0;
            else pick = cy === 0 || cy >= Math.floor(h / cell) - 1 ? 1 : 0;
            const colour = (pick ? (a.colours === 'red-white-blue' && (cx + cy) % 3 === 0 ? accent : c2) : c1).clone().offsetHSL(0, 0, (random() - 0.5) * 0.1);
            g.fillStyle = hex(colour);
            g.beginPath();
            g.arc(cx * cell + cell / 2 + (random() - 0.5) * 2, cy * cell + cell / 2 + (random() - 0.5) * 2 + (soaked ? 2 : 0), cell * (0.55 + random() * 0.12), 0, Math.PI * 2);
            g.fill();
            if (soaked && random() < 0.3) {
              g.globalAlpha = 0.5;
              g.fillRect(cx * cell + 2, cy * cell + cell / 2, 2.5, 8 + random() * 22);
              g.globalAlpha = 1;
            }
          }
      });
    const skirtH = deckY - 0.07;
    const sides: [number, number, number, number, number][] = [[L + 0.06, 0, W / 2 + 0.03, 0, building ? 0.55 : 2], [L + 0.06, 0, -W / 2 - 0.03, Math.PI, building ? 0.3 : 2], [W + 0.06, L / 2 + 0.03, 0, Math.PI / 2, building ? 0 : 2], [W + 0.06, -L / 2 - 0.03, 0, -Math.PI / 2, 2]];
    for (const [width, x, z, yaw, unfinished] of sides) {
      const panel = s.mesh(new THREE.PlaneGeometry(width, skirtH), new THREE.MeshStandardMaterial({ map: skirtMap(width, unfinished), roughness: soaked ? 0.5 : 0.95 }), [x, 0.07 + skirtH / 2, z]);
      panel.rotation.y = yaw;
    }
    s.box([L, deckY - 0.3, W], [0, 0.15 + (deckY - 0.3) / 2, 0], mat('#4a4234'));
    if (!stored && !building) {
      const foil = mat(accent, { metalness: 0.7, roughness: 0.3 });
      s.box([L + 0.1, 0.1, W + 0.1], [0, 0.1, 0], foil);
      // A fat ruffle of tissue flowers around the deck edge.
      const edge: { at: P3; size: number; color: string }[] = [];
      const lap = (count: number, from: P3, to: P3) => { for (let i = 0; i < count; i++) edge.push({ at: [mix(from[0], to[0], i / count), deckY + (soaked ? -0.06 : 0.02) + random() * 0.04, mix(from[2], to[2], i / count)], size: (soaked ? 0.1 : 0.13) + random() * 0.04, color: hex((i % 2 ? c1 : c2).clone().offsetHSL(0, 0, (random() - 0.5) * 0.08)) }); };
      const hx = L / 2 + 0.05, hz = W / 2 + 0.05;
      lap(Math.round(L / 0.24), [-hx, 0, hz], [hx, 0, hz]);
      lap(Math.round(W / 0.24), [hx, 0, hz], [hx, 0, -hz]);
      lap(Math.round(L / 0.24), [hx, 0, -hz], [-hx, 0, -hz]);
      lap(Math.round(W / 0.24), [-hx, 0, -hz], [-hx, 0, hz]);
      s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ map: blank, roughness: soaked ? 0.45 : 0.95 }), edge);
    }
    // Deck.
    s.box([L + 0.08, 0.1, W + 0.08], [0, deckY - 0.05, 0], tissue(stored ? new THREE.Color('#8a7a5c') : building ? new THREE.Color('#b59b6a') : a.centrepiece === 'goalpost' ? tone('#3f8f4a') : c1.clone().lerp(new THREE.Color('#ffffff'), 0.25)));

    // Banner, hand-painted on butcher paper.
    const full = BANNERS[a.banner];
    const text = building ? full.slice(0, Math.max(3, Math.ceil(full.length * 0.55))) : full;
    const bannerW = Math.min(L * 0.72, 4.2), bannerH = Math.min(0.62, skirtH * 0.8);
    const sign = paint(512, Math.round((512 * bannerH) / bannerW), (g, w, h) => {
      g.fillStyle = hex(new THREE.Color('#f3ecd8').lerp(drab, wear * 0.5));
      g.fillRect(0, 0, w, h);
      const size = Math.min(h * 0.72, (w / full.length) * 1.5);
      g.font = `bold ${size}px sans-serif`;
      g.textBaseline = 'middle';
      g.textAlign = 'center';
      const step = (w * 0.9) / full.length;
      [...text].forEach((letter, i) => {
        g.save();
        g.translate(w * 0.05 + step * (i + 0.5), h / 2 + (random() - 0.5) * h * 0.12);
        g.rotate((random() - 0.5) * 0.16);
        g.fillStyle = hex(i % 2 ? c1 : a.colours.endsWith('white') || a.colours === 'red-white-blue' ? tone('#1d1c1e') : c2.clone().multiplyScalar(0.8));
        g.fillText(letter, 0, 0);
        if (soaked) {
          g.globalAlpha = 0.45;
          g.fillRect(-size * 0.12, 0, size * 0.1, h * (0.3 + random() * 0.5));
        }
        g.restore();
      });
    });
    if (!stored) {
      const banner = s.mesh(new THREE.PlaneGeometry(bannerW, bannerH), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5 }), [-L * 0.06, 0.1 + skirtH * 0.55, W / 2 + 0.07]);
      if (soaked) {
        banner.geometry.translate(bannerW / 2, -bannerH / 2, 0);
        banner.position.set(-L * 0.06 - bannerW / 2, 0.1 + skirtH * 0.55 + bannerH / 2, W / 2 + 0.09);
        banner.rotation.z = -0.5 - random() * 0.4;
      } else banner.rotation.z = (random() - 0.5) * 0.05;
    }

    // Arch over the back half of the deck.
    const archX = a.centrepiece === 'bales' ? 0 : -L * 0.18, archR = Math.min(1.75, L * 0.3);
    if (a.arch !== 'none' && !stored) {
      const arch = new THREE.Group();
      const local = (mesh: THREE.Object3D) => { arch.add(mesh); return mesh; };
      const upTo = building ? 0.6 : 1;
      const arc = (t: number, r = archR): P3 => [Math.cos(Math.PI * (1 - t)) * r, Math.sin(Math.PI * t) * r * 1.25, 0];
      if (a.arch === 'crepe') {
        local(s.tube(Array.from({ length: 21 }, (_unused, i) => arc(i / 20)), 0.035, mat('#8d8a80')));
        for (const [index, colour] of [c1, c2].entries()) {
          const points: P3[] = [];
          for (let i = 0; i <= 80 * upTo; i++) {
            const t = i / 80, p = arc(t), angle = i * 0.9 + index * Math.PI;
            points.push([p[0] + Math.cos(angle) * 0.1 * Math.cos(Math.PI * t), p[1] + Math.cos(angle) * 0.1 * Math.sin(Math.PI * t), Math.sin(angle) * 0.1]);
          }
          local(s.tube(points, 0.075, tissue(colour)));
        }
      } else if (a.arch === 'balloons') {
        const balloons = Array.from({ length: Math.round(46 * upTo) }, (_unused, i) => {
          const p = arc(i / 45);
          return { at: [p[0] + (random() - 0.5) * 0.14, p[1] + (random() - 0.5) * 0.14, (random() - 0.5) * 0.3] as const, size: (soaked ? 0.11 : 0.17) + random() * 0.05, color: hex([c1, c2, accent][i % 3]) };
        });
        local(s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.25 }), balloons));
        local(s.tube(Array.from({ length: 21 }, (_unused, i) => arc(i / 20)), 0.02, mat('#8d8a80')));
      } else {
        const bands = [c1, accent, c2, tone('#f4f1e8')];
        bands.forEach((colour, i) => {
          const r = archR - i * 0.16;
          const shape = new THREE.Shape();
          shape.absarc(0, 0, r, 0, Math.PI * upTo, false);
          shape.absarc(0, 0, r - 0.16, Math.PI * upTo, 0, true);
          const band = local(s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false, curveSegments: 24 }), mat(colour)));
          band.scale.y = 1.25;
        });
      }
      arch.position.set(archX, deckY, -W * 0.28);
      if (soaked) {
        arch.rotation.x = 1.42;
        arch.rotation.y = 0.25;
        arch.position.set(archX + 0.5, deckY + 0.12, W * 0.12);
      }
      s.root.add(arch);
    }

    // Centrepiece.
    const gold = mat(tone('#e2b530'), { metalness: 0.75, roughness: 0.3 });
    const crown = (x: number, y: number, z: number, r: number, tipped: boolean) => {
      const group = new THREE.Group();
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, r * 0.6, 16, 1, true), gold);
      (band.material as THREE.MeshStandardMaterial).side = THREE.FrontSide;
      band.position.y = r * 0.3;
      group.add(band);
      for (let i = 0; i < 8; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, r * 0.75, 4), gold);
        spike.position.set(Math.cos((i * Math.PI) / 4) * r * 0.95, r * 0.9, Math.sin((i * Math.PI) / 4) * r * 0.95);
        const jewel = new THREE.Mesh(new THREE.SphereGeometry(r * 0.11, 8, 6), mat(i % 2 ? c1 : '#d8334a', { roughness: 0.2 }));
        jewel.position.set(Math.cos((i * Math.PI) / 4) * r * 0.95, r * 1.3, Math.sin((i * Math.PI) / 4) * r * 0.95);
        group.add(spike, jewel);
      }
      group.traverse((node) => { node.castShadow = true; });
      group.position.set(x, y, z);
      if (tipped) group.rotation.set(1.4, 0, 0.5);
      s.root.add(group);
    };
    const cx = archX;
    if (a.centrepiece === 'throne') {
      const velvet = tissue(c1), riserY = deckY + 0.3;
      s.box([1.7, 0.3, 1.4], [cx, deckY + 0.15, -0.25], tissue(c2));
      s.box([0.8, 0.5, 0.7], [cx, riserY + 0.25, -0.3], velvet);
      s.box([0.9, 1.5, 0.16], [cx, riserY + 0.75, -0.68], velvet);
      const top = s.cylinder(0.45, 0.45, 0.16, [cx, riserY + 1.5, -0.68], velvet, 20);
      top.rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        s.box([0.14, 0.75, 0.7], [cx + side * 0.47, riserY + 0.38, -0.3], gold);
        s.ball([0.1, 0.1, 0.1], [cx + side * 0.47, riserY + 0.8, 0.02], gold, 10);
        s.ball([0.08, 0.08, 0.08], [cx + side * 0.42, riserY + 1.72, -0.68], gold, 10);
      }
      if (!building) crown(cx + (soaked ? 0.7 : 0), soaked ? deckY + 0.1 : riserY + 0.5, soaked ? 0.5 : -0.25, 0.2, soaked);
      if (!building && !stored) {
        const sash = s.box([0.16, 0.012, 1.1], [cx + 0.1, riserY + 0.51, -0.05], mat('#f4f1e8'));
        sash.rotation.y = 0.5;
      }
    } else if (a.centrepiece === 'mascot') {
      const fur = tissue(c1.clone().lerp(new THREE.Color('#c98a3a'), 0.35));
      const y = deckY + 1.15;
      s.ball([1.1, 1.0, 0.95], [cx, y, -0.1], fur, 18);
      for (const side of [-1, 1]) {
        const ear = s.cylinder(0, 0.38, 0.6, [cx + side * 0.7, y + 0.95, -0.15], fur, 4);
        ear.rotation.z = -side * 0.35;
        s.ball([0.17, 0.2, 0.06], [cx + side * 0.42, y + 0.25, 0.78], mat('#f1e38a', { emissive: '#f1e38a', emissiveIntensity: 0.25 }), 10);
        s.ball([0.06, 0.16, 0.03], [cx + side * 0.42, y + 0.25, 0.83], mat('#1d1c1e'), 8);
        for (let k = 0; k < 3; k++) s.rod([cx + side * 0.3, y - 0.2, 0.95], [cx + side * 1.15, y - 0.1 - k * 0.14 + 0.14, 0.75], 0.012, mat('#f4f1e8'));
        s.cylinder(0, 0.07, 0.25, [cx + side * 0.17, y - 0.5, 0.86], mat('#f4f1e8'), 6).rotation.x = Math.PI;
      }
      s.ball([0.5, 0.36, 0.35], [cx, y - 0.25, 0.75], tissue(accent), 14);
      s.ball([0.13, 0.09, 0.08], [cx, y - 0.08, 1.06], mat('#1d1c1e'), 8);
      s.box([0.5, 0.1, 0.08], [cx, y - 0.48, 0.92], mat('#3a1518'));
    } else if (a.centrepiece === 'goalpost') {
      const post = mat('#f0c81e');
      const gx = cx - 0.6;
      s.rod([gx, deckY, 0], [gx, deckY + 1.5, 0], 0.07, post);
      s.rod([gx, deckY + 1.5, -1], [gx, deckY + 1.5, 1], 0.06, post);
      for (const z of [-1, 1]) s.rod([gx, deckY + 1.5, z], [gx, deckY + 3.2, z], 0.05, post);
      const ball = s.ball([0.62, 0.38, 0.38], [gx + 0.9, deckY + 2.35, 0], tissue(new THREE.Color('#7a4526')), 16);
      ball.rotation.z = 0.5;
      s.rod([gx + 0.9, deckY, 0], [gx + 0.9, deckY + 2.1, 0], 0.025, mat('#8d8a80'));
      for (let k = -2; k <= 2; k++) {
        const lace = s.box([0.03, 0.02, 0.2], [gx + 0.9 + k * 0.09 - 0.1, deckY + 2.69 + k * 0.045, 0], mat('#f4f1e8'));
        lace.rotation.z = 0.5;
      }
    } else if (a.centrepiece === 'crown') {
      crown(cx, deckY, -0.1, 0.85, false);
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.11 : 0.27, angle = Math.PI / 2 + (i * Math.PI) / 5;
        if (i) starShape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else starShape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      for (let i = 0; i < 4 + Math.round(mood.density * 5); i++) {
        const x = cx + (random() - 0.5) * L * 0.7, z = (random() - 0.5) * W * 0.8, h = 0.9 + random() * 1.4;
        s.rod([x, deckY, z], [x, deckY + h, z], 0.012, mat('#8d8a80'));
        s.mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.03, bevelEnabled: false }), i % 2 ? gold : tissue(accent, { metalness: 0.5 }), [x, deckY + h + 0.15, z]).rotation.y = (random() - 0.5) * 1.2;
      }
    }
    // Seating and clutter that any float collects.
    const hay = mat(tone('#d2b05a'), { roughness: 1 });
    const baleCount = a.centrepiece === 'bales' ? 4 + Math.round(mood.density * 3) : Math.round(mood.density * 2);
    for (let i = 0; i < baleCount; i++) {
      const x = L * 0.38 - (i % 4) * 1.0 - (a.centrepiece === 'bales' ? 0 : 0.2), z = (i % 2 ? -1 : 1) * (0.3 + random() * 0.35), stack = i >= 4 ? 0.42 : 0;
      if (Math.abs(x) > L / 2 - 0.5) continue;
      const bale = s.box([0.95, 0.42, 0.5], [x, deckY + 0.21 + stack, z], hay);
      bale.rotation.y = (random() - 0.5) * 0.5;
      for (const dx of [-0.25, 0.25]) s.box([0.02, 0.43, 0.51], [x + dx, deckY + 0.21 + stack, z], mat('#7d6a3a')).rotation.y = bale.rotation.y;
    }
    // Corner poles with streamers.
    const streamers: THREE.Mesh[] = [];
    if (!stored) {
      for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
        const x = sx * (L / 2 - 0.12), z = sz * (W / 2 - 0.12);
        if (building && sx === 1) continue;
        s.rod([x, deckY, z], [x, deckY + 1.5, z], 0.025, mat('#f4f1e8'));
        s.ball([0.07, 0.07, 0.07], [x, deckY + 1.55, z], gold, 8);
        for (let k = 0; k < 3; k++) {
          const colour = [c1, c2, accent][k];
          const geometry = new THREE.PlaneGeometry(1.1, 0.07, 8, 1);
          geometry.translate(-0.55, 0, 0);
          const ribbon = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: blank, color: colour, side: THREE.DoubleSide, alphaTest: 0.5, roughness: 0.8 }), [x, deckY + 1.45 - k * 0.09, z]);
          ribbon.rotation.set(0, (random() - 0.5) * 0.8, soaked ? 1.45 : 0.25 + random() * 0.5);
          ribbon.userData.live = true;
          ribbon.userData.rest = ribbon.rotation.z;
          ribbon.userData.phase = random() * 6;
          streamers.push(ribbon);
        }
      }
    }

    if (building) {
      const ladder = mat('#c9a35a');
      const lx = L / 2 + 0.3, lz = W / 2 + 1.0;
      for (const dz of [-0.25, 0.25]) {
        s.rod([lx - 0.45, 0, lz + dz], [lx, 2.1, lz + dz], 0.03, ladder);
        s.rod([lx + 0.45, 0, lz + dz], [lx, 2.1, lz + dz], 0.03, ladder);
      }
      for (let i = 1; i < 5; i++) s.rod([lx - 0.45 + i * 0.09, i * 0.42, lz - 0.25], [lx - 0.45 + i * 0.09, i * 0.42, lz + 0.25], 0.02, ladder);
      for (let i = 0; i < 3; i++) {
        const bx = -L * 0.3 + i * 1.1 + random() * 0.3, bz = W / 2 + 0.7 + random() * 0.5;
        s.box([0.6, 0.4, 0.45], [bx, 0.2, bz], mat('#b08a55')).rotation.y = random();
        const scraps = Array.from({ length: 14 }, () => ({ at: [bx + (random() - 0.5) * 0.9, 0.42 - Math.floor(random() * 2) * 0.4 + random() * 0.05, bz + (random() - 0.5) * 0.9] as const, size: 0.07 + random() * 0.04, color: hex([c1, c2, accent][i % 3]) }));
        s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.95 }), scraps);
      }
    }
    if (soaked || stored) {
      const litter = Array.from({ length: stored ? 20 : 60 }, () => {
        const angle = random() * 6.28, r = 0.6 + random() * 1.2;
        return { at: [Math.cos(angle) * (L / 2 + r * 0.6) * (0.3 + random() * 0.7), 0.03, Math.sin(angle) * (W / 2 + r)] as const, size: 0.05 + random() * 0.05, color: hex([c1, c2, accent][Math.floor(random() * 3)].clone().lerp(drab, 0.3)) };
      });
      const pomps = s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: soaked ? 0.4 : 0.95 }), litter);
      pomps.scale.y = 1;
      if (soaked) s.cylinder(L * 0.42, L * 0.42, 0.012, [L * 0.1, 0.006, W * 0.3], mat('#59636b', { roughness: 0.08, metalness: 0.5 }), 24).scale.z = 0.6;
      if (stored) {
        const weeds = Array.from({ length: 46 }, () => ({ at: [(random() - 0.5) * (L + 2.4), 0.3, (random() < 0.5 ? -1 : 1) * (W / 2 + 0.1 + random() * 0.6)] as const, size: 0.3 + random() * 0.5, color: ['#7b8048', '#93935a', '#6a7340'][Math.floor(random() * 3)] }));
        s.scatter(new THREE.ConeGeometry(0.22, 2, 5), new THREE.MeshStandardMaterial({ map: blank, roughness: 1 }), weeds);
      }
    }

    fuse(s.root);
    s.root.rotation.z = tilt;
    const breeze = soaked || stored ? 0.03 : mix(0.08, 0.45, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        for (const ribbon of streamers) ribbon.rotation.z = (ribbon.userData.rest as number) + Math.sin(time * (2 + mood.energy * 5) + (ribbon.userData.phase as number)) * breeze;
      },
    });
  },
});
