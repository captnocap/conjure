import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { choice, defineWorld, diorama, mix } from '@conjure/kit';

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

const NAMES = { hope: 'HOPE', millbrook: 'MILLBROOK', prairie: 'PRAIRIE CITY', eden: 'EDEN', union: 'UNION', wildcats: 'HOME OF THE WILDCATS' } as const;
const SHOPS = ['HARDWARE', 'CAFE', 'DRUGS', 'BANK', 'FIVE & DIME', 'BARBER', 'RIALTO', 'ANTIQUES', 'THE LEDGER', 'FEED & SEED', 'BAKERY', 'DRY GOODS'];

export default defineWorld({
  questions: {
    fortunes: choice('How is the town doing?', {
      thriving: 'Thriving: every storefront open, bright awnings, flower baskets, cars parked on the square.',
      holding: 'Holding on: most shops open, a couple papered over with FOR LEASE in the window.',
      emptying: 'Emptying out: more windows boarded than lit, ghost signs, one stubborn shop, weeds in the kerb.',
      parade: 'Dressed for a parade day: bunting strung over the street, flags on every lamp post, kerbs swept.',
    }),
    season: choice('What season is it on the square?', {
      summer: 'High summer: deep green lawn and full shade trees.',
      autumn: 'Autumn: trees in orange and gold, leaves on the grass.',
      winter: 'Winter: a skin of snow on the lawn and roofs, bare branches.',
      spring: 'Spring: fresh light green and trees in pink and white blossom.',
    }),
    tower: choice('What kind of water tower stands behind the roofs?', {
      tinman: 'A classic four-legged tin-man tank with a conical cap and a catwalk.',
      pedesphere: 'A smooth golf-ball sphere on a single flared stem.',
      standpipe: 'A fat riveted standpipe, a plain tall drum.',
    }),
    name: choice('What is painted on the water tower?', {
      hope: 'HOPE',
      millbrook: 'MILLBROOK',
      prairie: 'PRAIRIE CITY',
      eden: 'EDEN',
      union: 'UNION',
      wildcats: 'HOME OF THE WILDCATS',
    }),
    tank: choice('What colour is the tank?', {
      silver: 'Aluminium silver.',
      white: 'White with black letters.',
      blue: 'Sky blue with white letters.',
      green: 'Pale institutional green, streaked.',
    }),
    brick: choice('What are the storefronts built of?', {
      red: 'Deep red brick with pale stone cornices.',
      buff: 'Buff yellow brick.',
      painted: 'Brick painted over in creams, greys and faded pastels.',
      mixed: 'A jumble: red brick, buff brick and one painted front.',
    }),
    paths: choice('How do the paths cross the lawn?', {
      diagonal: 'Two diagonals meeting at a paved circle in the middle.',
      plus: 'A straight cross, north-south and east-west.',
      ring: 'A ring walk around the centre with four short spokes.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const emptying = a.fortunes === 'emptying', parade = a.fortunes === 'parade', winter = a.season === 'winter';
    const wear = Math.min(1, mood.wear * 0.8 + (emptying ? 0.35 : 0));
    const dusk = Math.abs(mood.daylight - 0.5) * 2;
    const hex = (colour: THREE.Color) => `#${colour.getHexString()}`;
    const dry = new THREE.Color('#a8a070');
    const lawnColour = new THREE.Color({ summer: '#7c9f58', autumn: '#96975a', winter: '#e9ecea', spring: '#93bd6c' }[a.season]).lerp(dry, winter ? 0 : wear * 0.5);
    const sky = new THREE.Color('#e2e7e6').lerp(new THREE.Color(mood.daylight > 0.5 ? '#efd9bd' : '#e6dcd6'), dusk * 0.8).lerp(new THREE.Color('#c9c6d2'), Math.max(0, mood.daylight - 0.85) * 3);
    const C: [number, number] = [3.2, 3.2];
    const slots: [number, number][] = [C, [-0.7, 6.2], [7.4, 0.2], [7.3, 6.7], [-1.0, 0.0], [3.2, -1.3]];
    const { art: s, world } = diorama(context, { background: hex(sky), floor: hex(lawnColour), width: 20, depth: 18, maxHeight: 4.2, radius: 1.9, pitch: 31, yaw: 30, slots });
    if (world.ground) world.ground.userData.live = true;

    const blank = paint(2, 2, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 2, 2); });
    const mat = (colour: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) => s.material(colour, { map: blank, ...options });
    const lampGlow = new THREE.Color('#ffd28a').lerp(new THREE.Color('#e6efff'), 1 - mood.warmth);
    const snow = mat('#f1f4f3', { roughness: 0.9 });

    // Streets, kerbs and pavements along the two built sides.
    const asphalt = mat(new THREE.Color('#5a5c5e').lerp(new THREE.Color('#8f8a80'), wear * 0.4), { roughness: 0.95 });
    const concrete = mat(winter ? '#d9dcd8' : '#c9c5b8', { roughness: 0.9 });
    s.box([20, 0.04, 2.7], [0, 0.02, -3.95], asphalt);
    s.box([2.7, 0.04, 18], [-4.95, 0.021, 0], asphalt);
    s.box([16.3, 0.14, 1.3], [1.85, 0.07, -5.95], concrete);
    s.box([1.3, 0.14, 14.3], [-6.95, 0.07, 1.85], concrete);
    s.box([13.6, 0.1, 0.5], [3.2, 0.05, -2.35], concrete);
    s.box([0.5, 0.1, 11.6], [-3.35, 0.05, 3.2], concrete);
    const stripe = mat(new THREE.Color('#e9e6dc').lerp(new THREE.Color('#77787a'), wear * 0.7));
    for (let i = 0; i < 9; i++) {
      const bay = s.box([0.08, 0.012, 1.5], [-2.6 + i * 1.5, 0.045, -4.5], stripe);
      bay.rotation.y = 0.5;
    }
    for (let i = 0; i < 7; i++) s.box([0.08, 0.012, 0.9], [-4.95, 0.046, -1.5 + i * 1.6], mat('#d9b23a'));

    // Paths on the lawn.
    const paving = mat(winter ? '#cfd2ce' : a.paths === 'ring' ? '#b98f78' : '#cdc6b4', { roughness: 0.95 });
    const strip = (from: [number, number], to: [number, number], width: number) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
      const mesh = s.box([length, 0.03, width], [(from[0] + to[0]) / 2, 0.015, (from[1] + to[1]) / 2], paving);
      mesh.rotation.y = -Math.atan2(to[1] - from[1], to[0] - from[0]);
    };
    const hx = 6.3, hz = 5.3;
    s.cylinder(2.5, 2.5, 0.036, [C[0], 0.018, C[1]], paving, 36);
    if (a.paths === 'diagonal') {
      strip([C[0] - hx, C[1] - hz], [C[0] + hx, C[1] + hz], 1.1);
      strip([C[0] - hx, C[1] + hz], [C[0] + hx, C[1] - hz], 1.1);
    } else {
      strip([C[0] - hx, C[1]], [C[0] + hx, C[1]], 1.2);
      strip([C[0], C[1] - hz], [C[0], C[1] + hz], 1.2);
      if (a.paths === 'ring') {
        const ring = s.mesh(new THREE.RingGeometry(3.7, 4.6, 48), paving, [C[0], 0.03, C[1]]);
        ring.rotation.x = -Math.PI / 2;
      }
    }
    s.ring(2.5, 0.07, [C[0], 0.03, C[1]], concrete).rotation.x = Math.PI / 2;

    // Storefronts.
    const brickTones = { red: ['#8f4636', '#7d3d31', '#9a5240'], buff: ['#c2a878', '#b89a68', '#cbb488'], painted: ['#d9d2bf', '#a9b4b0', '#d7b9a4', '#b9c2a4', '#c9a9a0'], mixed: ['#8f4636', '#c2a878', '#d9d2bf', '#7d3d31', '#a9b4b0'] }[a.brick];
    const awnings = ['#b3242c', '#1f6b45', '#24418f', '#d9a32e', '#3a3d3e'];
    const shopNames = [...SHOPS].sort(() => random() - 0.5);
    let shopIndex = 0;
    const vacantShare = { thriving: 0.0, holding: 0.3, emptying: 0.75, parade: 0.1 }[a.fortunes] + mood.wear * 0.12;
    const building = (along: number, width: number, side: 'back' | 'left') => {
      const height = 4.5 + random() * 1.7, depth = 2.4;
      const tone = new THREE.Color(brickTones[shopIndex % brickTones.length]).offsetHSL(0, 0, (random() - 0.5) * 0.06).lerp(new THREE.Color('#8a8378'), wear * 0.3);
      const vacant = random() < vacantShare;
      const boarded = vacant && random() < (emptying ? 0.6 : 0.2);
      const name = shopNames[shopIndex++ % shopNames.length];
      const arched = random() < 0.5, bays = width > 3.6 ? 3 : 2;
      const litUp = !vacant && dusk > 0.35;
      const awning = new THREE.Color(awnings[Math.floor(random() * awnings.length)]).lerp(new THREE.Color('#9a958a'), wear * 0.5 + (1 - mood.cheer) * 0.2);
      const glowCanvas = document.createElement('canvas');
      const face = paint(256, Math.round((256 * height) / width), (g, w, h) => {
        glowCanvas.width = w;
        glowCanvas.height = h;
        const glow = glowCanvas.getContext('2d')!;
        glow.fillStyle = '#000000';
        glow.fillRect(0, 0, w, h);
        const m = h / height;
        g.fillStyle = hex(tone);
        g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,0.13)';
        for (let y = 0; y < h; y += 5) g.fillRect(0, y, w, 1);
        for (let y = 0; y < h; y += 5) for (let x = (y / 5) % 2 ? 0 : 6; x < w; x += 12) g.fillRect(x, y, 1, 5);
        const stone = hex(new THREE.Color('#d8d1bf').lerp(new THREE.Color('#8a8378'), wear * 0.4));
        // Cornice.
        g.fillStyle = stone;
        g.fillRect(0, 0, w, 0.38 * m);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        for (let x = 4; x < w; x += 12) g.fillRect(x, 0.26 * m, 6, 0.12 * m);
        if (winter) { g.fillStyle = '#f1f4f3'; g.fillRect(0, 0, w, 0.1 * m); }
        // Upper windows.
        const glassDay = hex(new THREE.Color('#5a6e7a').lerp(new THREE.Color('#2c3238'), 0.3));
        const winW = (w / bays) * 0.46, winTop = 0.75 * m, winH = Math.min(1.55 * m, (height - 3.6) * m);
        for (let i = 0; i < bays; i++) {
          const x = (i + 0.5) * (w / bays) - winW / 2;
          g.fillStyle = stone;
          g.fillRect(x - 4, winTop - 5, winW + 8, winH + 10);
          const lit = !vacant && dusk > 0.45 && random() < 0.45;
          g.fillStyle = boarded ? '#a58a5c' : lit ? '#f6d68a' : vacant ? '#23272b' : glassDay;
          g.beginPath();
          if (arched) { g.moveTo(x, winTop + winH); g.lineTo(x, winTop + winW / 2); g.arc(x + winW / 2, winTop + winW / 2, winW / 2, Math.PI, 0); g.lineTo(x + winW, winTop + winH); }
          else g.rect(x, winTop, winW, winH);
          g.fill();
          if (lit) { glow.fillStyle = '#f6d68a'; glow.fillRect(x, winTop + 4, winW, winH - 4); }
          g.fillStyle = stone;
          g.fillRect(x, winTop + winH * 0.5, winW, 2);
          g.fillRect(x + winW / 2 - 1, winTop, 2, winH);
        }
        // Sign band.
        const bandTop = h - 2.95 * m, bandH = 0.6 * m;
        const signPaper = vacant ? hex(tone.clone().offsetHSL(0, -0.1, 0.12)) : hex(new THREE.Color(['#1f2a3a', '#f1ead2', '#1f4a36', '#7a1f1f'][Math.floor(random() * 4)]).lerp(new THREE.Color('#8a8378'), wear * 0.4));
        g.fillStyle = signPaper;
        g.fillRect(6, bandTop, w - 12, bandH);
        g.fillStyle = new THREE.Color(signPaper).getHSL({ h: 0, s: 0, l: 0 }).l > 0.5 ? '#26221c' : '#f1ead2';
        g.globalAlpha = vacant ? 0.22 : 1;
        g.font = `bold ${Math.min(bandH * 0.72, ((w - 30) / name.length) * 1.45)}px serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(name, w / 2, bandTop + bandH / 2 + 1, w - 26);
        g.globalAlpha = 1;
        // Shopfront.
        const shopTop = h - 2.25 * m;
        g.fillStyle = hex(tone.clone().multiplyScalar(0.45));
        g.fillRect(6, shopTop, w - 12, 2.25 * m);
        const doorW = 0.85 * m, paneW = (w - 12 - doorW - 16) / 2;
        const paneFill = boarded ? '#a58a5c' : vacant ? '#c9c2ac' : litUp ? '#f8dd9a' : '#7f97a0';
        for (const x of [12, 12 + paneW + doorW + 4]) {
          g.fillStyle = paneFill;
          g.fillRect(x, shopTop + 6, paneW - 4, 1.55 * m);
          if (litUp) { glow.fillStyle = '#f8dd9a'; glow.fillRect(x, shopTop + 6, paneW - 4, 1.55 * m); }
          if (boarded) { g.strokeStyle = '#7a623c'; g.lineWidth = 2; g.strokeRect(x + 2, shopTop + 8, paneW - 8, 1.55 * m - 4); g.beginPath(); g.moveTo(x, shopTop + 6 + 0.78 * m); g.lineTo(x + paneW - 4, shopTop + 6 + 0.78 * m); g.stroke(); }
          else if (!vacant) {
            g.fillStyle = 'rgba(40,36,30,0.55)';
            for (let k = 0; k < 4; k++) g.fillRect(x + 5 + k * (paneW / 4.4), shopTop + 6 + 1.55 * m - (0.3 + random() * 0.55) * m, paneW / 6.5, (0.3 + random() * 0.55) * m);
          }
        }
        if (vacant && !boarded) {
          g.fillStyle = '#b3242c';
          g.fillRect(16, shopTop + 0.5 * m, paneW - 12, 0.55 * m);
          g.fillStyle = '#f4f0e6';
          g.font = `bold ${0.3 * m}px sans-serif`;
          g.fillText('FOR LEASE', 12 + paneW / 2, shopTop + 0.78 * m, paneW - 16);
        }
        g.fillStyle = boarded ? '#96794c' : vacant ? '#3a342c' : litUp ? '#e9c77c' : '#4d5d62';
        g.fillRect(12 + paneW + 2, shopTop + 0.2 * m, doorW - 4, 2.05 * m);
        if (emptying || wear > 0.6) {
          g.globalAlpha = 0.25;
          g.fillStyle = '#2c2a26';
          for (let k = 0; k < 10; k++) g.fillRect(random() * w, 0.38 * m, 2 + random() * 6, random() * h * 0.6);
          g.globalAlpha = 1;
        }
      });
      const glowMap = new THREE.CanvasTexture(glowCanvas);
      glowMap.colorSpace = THREE.SRGBColorSpace;
      const front = new THREE.MeshStandardMaterial({ map: face, emissive: '#ffffff', emissiveMap: glowMap, emissiveIntensity: 0.25 + dusk * 0.9, roughness: 0.9 });
      const shell = mat(tone.clone().multiplyScalar(0.92), { roughness: 0.95 });
      const roof = winter ? snow : mat('#4a4744', { roughness: 0.95 });
      const group = new THREE.Group();
      const add = (mesh: THREE.Object3D) => { group.add(mesh); return mesh; };
      // Local frame: the building spans x in [0, width], faces +z, and its front wall is at z = 0.
      add(s.box([width - 0.04, height, depth], [width / 2, height / 2, -depth / 2], shell));
      add(s.mesh(new THREE.PlaneGeometry(width - 0.04, height), front, [width / 2, height / 2, 0.012]));
      add(s.box([width + 0.04, 0.16, depth + 0.1], [width / 2, height + 0.08, -depth / 2 + 0.05], mat(new THREE.Color('#d8d1bf').lerp(new THREE.Color('#8a8378'), wear * 0.4))));
      add(s.box([width - 0.4, 0.06, depth - 0.4], [width / 2, height + 0.03, -depth / 2], roof));
      if (random() < 0.5) add(s.box([0.5, 0.7, 0.5], [0.6 + random() * (width - 1.2), height + 0.35, -depth * 0.7], mat('#7d3d31')));
      if (!vacant) {
        const cloth = mat(awning, { roughness: 0.8 });
        const shade = add(s.box([width * 0.86, 0.05, 1.05], [width / 2, 2.42, 0.48], cloth));
        shade.rotation.x = 0.34;
        add(s.box([width * 0.86, 0.22, 0.03], [width / 2, 2.16, 0.98], mat(awning.clone().lerp(new THREE.Color('#f4f0e6'), 0.55))));
        if (winter) add(s.box([width * 0.86, 0.04, 1.0], [width / 2, 2.47, 0.47], snow)).rotation.x = 0.34;
        if ((a.fortunes === 'thriving' || parade) && !winter) {
          for (const x of [0.25, width - 0.25]) {
            add(s.ball([0.2, 0.15, 0.2], [x, 2.75, 0.3], mat('#3f6a3c', { roughness: 1 }), 8));
            add(s.ball([0.14, 0.1, 0.14], [x, 2.86, 0.3], mat(['#e23a6a', '#f2c23a', '#f4f0e6', '#c95fd0'][Math.floor(random() * 4)]), 8));
          }
        }
      }
      if (side === 'back') group.position.set(along, 0, -6.6);
      else {
        group.rotation.y = Math.PI / 2;
        group.position.set(-7.6, 0, along + width);
      }
      s.root.add(group);
      return height;
    };
    const tops: { x: number; z: number; y: number }[] = [];
    for (let x = -6.3; x < 9.9; ) {
      const width = Math.min(10 - x, 3.2 + random() * 1.4);
      const y = building(x, width < 2.2 ? width : width, 'back');
      tops.push({ x: x + width / 2, z: -6.6, y });
      x += width;
    }
    for (let z = -5.3; z < 8.9; ) {
      const width = Math.min(9 - z, 3.2 + random() * 1.4);
      const y = building(z, width, 'left');
      tops.push({ x: -7.6, z: z + width / 2, y });
      z += width;
    }

    // The water tower on the corner lot behind the two rows.
    const T: P3 = [-8.2, 0, -7.4];
    const tankColour = new THREE.Color({ silver: '#c3c8c8', white: '#f1efe8', blue: '#8fbfe0', green: '#a9c9b0' }[a.tank]);
    const letterColour = a.tank === 'blue' ? '#f4f1e8' : '#1f2326';
    const name = NAMES[a.name];
    const tankMap = (bandTop: number, bandHeight: number) => {
      const texture = paint(1024, 256, (g, w, h) => {
        g.fillStyle = hex(tankColour);
        g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,0.1)';
        for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 2, h);
        for (let i = 0; i < 6 + wear * 60; i++) {
          g.fillStyle = `rgba(122,74,44,${0.12 + random() * 0.35 * (0.3 + wear)})`;
          g.fillRect(random() * w, random() * h * 0.5, 2 + random() * 8, h * (0.15 + random() * 0.6));
        }
        g.fillStyle = letterColour;
        g.globalAlpha = 0.95 - wear * 0.4;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const size = Math.min(h * bandHeight, (300 / name.length) * 1.7);
        g.font = `bold ${size}px sans-serif`;
        // The camera sits toward +x and +z, so centre the name on that quarter, and once more behind.
        // The third copy wraps the half that falls off the canvas's left edge back onto the seam.
        for (const u of [0.085, 0.585, 1.085]) g.fillText(name, w * u, h * (bandTop + bandHeight / 2), 330);
      });
      texture.wrapS = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map: texture, roughness: a.tank === 'silver' ? 0.4 : 0.7, metalness: a.tank === 'silver' ? 0.5 : 0.05 });
    };
    const iron = mat(new THREE.Color(a.tank === 'silver' ? '#9aa0a0' : '#5d6468').lerp(new THREE.Color('#7a4a2c'), wear * 0.5), { metalness: 0.4 });
    const beaconGlow = mat('#ff5a4a', { emissive: '#ff3a2a', emissiveIntensity: 0.4 + dusk * 1.6 });
    let towerTop = 12;
    if (a.tower === 'tinman') {
      const r = 2.1, base = 7.3, tankH = 2.7;
      s.cylinder(r, r, tankH, [T[0], base + tankH / 2, T[2]], tankMap(0.22, 0.56), 32);
      s.ball([r, 0.85, r], [T[0], base, T[2]], iron, 24);
      s.cylinder(0.12, r + 0.12, 1.15, [T[0], base + tankH + 0.575, T[2]], mat(tankColour.clone().multiplyScalar(0.9), { metalness: 0.3 }), 32);
      s.ring(r + 0.35, 0.035, [T[0], base + 0.55, T[2]], iron).rotation.x = Math.PI / 2;
      s.cylinder(r + 0.35, r + 0.35, 0.05, [T[0], base + 0.05, T[2]], iron, 24);
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI / 4 + (i * Math.PI) / 2, c = Math.cos(angle), n = Math.sin(angle);
        s.rod([T[0] + c * 2.5, 0, T[2] + n * 2.5], [T[0] + c * 1.75, base + 0.3, T[2] + n * 1.75], 0.11, iron);
        const next = angle + Math.PI / 2, c2 = Math.cos(next), n2 = Math.sin(next);
        for (const [lo, hi] of [[0.12, 0.5], [0.5, 0.9]] as const) {
          const at = (t: number, cc: number, nn: number): P3 => [T[0] + cc * mix(2.5, 1.75, t), (base + 0.3) * t, T[2] + nn * mix(2.5, 1.75, t)];
          s.rod(at(lo, c, n), at(hi, c2, n2), 0.025, iron);
          s.rod(at(hi, c, n), at(lo, c2, n2), 0.025, iron);
          s.rod(at(hi, c, n), at(hi, c2, n2), 0.04, iron);
        }
      }
      s.cylinder(0.3, 0.3, base, [T[0], base / 2, T[2]], iron, 12);
      towerTop = base + tankH + 1.15;
    } else if (a.tower === 'pedesphere') {
      const profile: [number, number][] = [[1.5, 0], [0.75, 1.2], [0.6, 4.5], [0.75, 6.6], [1.5, 7.6]];
      s.lathe(profile, mat(tankColour, { roughness: 0.6 }), [T[0], 0, T[2]]);
      const ball = s.mesh(new THREE.SphereGeometry(2.55, 36, 20), tankMap(0.34, 0.26), [T[0], 9.4, T[2]]);
      ball.rotation.y = -Math.PI / 2;
      ball.scale.y = 0.86;
      towerTop = 9.4 + 2.2;
    } else {
      const r = 2.0, h = 10.4;
      const drum = tankMap(0.08, 0.2);
      s.cylinder(r, r, h, [T[0], h / 2, T[2]], drum, 32);
      for (let i = 1; i < 6; i++) s.ring(r + 0.01, 0.03, [T[0], (i * h) / 6, T[2]], iron).rotation.x = Math.PI / 2;
      s.ball([r, 0.55, r], [T[0], h, T[2]], mat(tankColour.clone().multiplyScalar(0.9)), 24);
      s.box([0.4, h, 0.06], [T[0] + 1.45, h / 2, T[2] + 1.45], iron).rotation.y = Math.PI / 4;
      towerTop = h + 0.55;
    }
    s.rod([T[0], towerTop - 0.1, T[2]], [T[0], towerTop + 0.5, T[2]], 0.03, iron);
    s.ball([0.1, 0.1, 0.1], [T[0], towerTop + 0.55, T[2]], beaconGlow, 8);
    s.box([3.9, 0.05, 3.7], [-8.15, 0.025, -7.2], mat('#a39c8a', { roughness: 1 }));

    // Lamp posts at the lawn corners and along the shops.
    const lampSpots: [number, number][] = [[-2.8, -1.8], [9.2, -1.8], [-2.8, 8.2], [9.2, 8.2], [-0.5, -5.6], [5.5, -5.6], [-6.6, 1], [-6.6, 6.5]];
    const postPaint = mat('#2a3330', { metalness: 0.3 });
    const globe = mat('#fff3d2', { emissive: lampGlow, emissiveIntensity: 0.25 + dusk * 1.5 });
    const flagCloth: number[] = [], flagUv: number[] = [];
    const tri = (p: P3, q: P3, r: P3, u: number) => { flagCloth.push(...p, ...q, ...r); for (let i = 0; i < 3; i++) flagUv.push(u, 0.5); };
    for (const [x, z] of lampSpots) {
      s.lathe([[0.16, 0], [0.16, 0.08], [0.07, 0.3], [0.05, 0.5], [0.045, 2.7], [0.09, 2.78], [0, 2.8]], postPaint, [x, 0, z]);
      s.ball([0.17, 0.2, 0.17], [x, 2.98, z], globe, 12);
      if (parade) {
        s.rod([x, 2.3, z], [x + 0.5, 2.55, z + 0.2], 0.012, postPaint);
        tri([x + 0.02, 2.3, z], [x + 0.5, 2.55, z + 0.2], [x + 0.55, 1.95, z + 0.22], 0.1);
        tri([x + 0.02, 2.3, z], [x + 0.55, 1.95, z + 0.22], [x + 0.06, 1.72, z + 0.02], 0.5);
      }
    }
    if (parade) {
      // Bunting zig-zagging over the back street and the side street.
      const cord = mat('#3b3a36');
      const lines: [P3, P3][] = [];
      for (let i = 0; i < 4; i++) lines.push([[-5 + i * 4.4, 4.3, -6.5], [-2.8 + i * 4.2, 2.95, -1.9]]);
      for (let i = 0; i < 3; i++) lines.push([[-7.5, 4.3, -3.5 + i * 4.4], [-2.9, 2.95, -1.2 + i * 4.2]]);
      for (const [p, q] of lines) {
        const pts = Array.from({ length: 11 }, (_unused, i) => { const t = i / 10; return [mix(p[0], q[0], t), mix(p[1], q[1], t) - 0.5 * 4 * t * (1 - t), mix(p[2], q[2], t)] as const; });
        s.tube(pts, 0.012, cord);
        for (let i = 0; i < 10; i++) tri(pts[i], pts[i + 1], [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2 - 0.34, (pts[i][2] + pts[i + 1][2]) / 2], [0.1, 0.5, 0.9][i % 3]);
      }
    }
    if (flagCloth.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(flagCloth, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(flagUv, 2));
      geometry.computeVertexNormals();
      const palette = paint(30, 4, (g) => ['#c8202c', '#f4f0e6', '#24418f'].forEach((colour, i) => { g.fillStyle = colour; g.fillRect(i * 10, 0, 10, 4); }));
      s.mesh(geometry, new THREE.MeshStandardMaterial({ map: palette, side: THREE.DoubleSide, roughness: 0.85 }));
    }

    // Trees, benches, parked cars, by how busy the scene should be.
    const leaf = { summer: ['#4f7a3c', '#5d8a44', '#456e38'], autumn: ['#d07a2a', '#e0a630', '#b8482a'], winter: ['#5a4a3c'], spring: ['#f2bfd0', '#f6e9ee', '#9fcf7a'] }[a.season];
    const treeSpots: [number, number][] = [[9.1, 3.4], [-2.6, 3.3], [0.3, 8.3], [6.2, -1.7], [5.6, 8.4], [0.6, -1.9], [9.3, -1.0], [-2.7, 8.4]];
    const bark = mat('#4a3a2c', { roughness: 1 });
    const crowns: { at: P3; size: number; color: string }[] = [];
    const trees = Math.round(mix(2, 8, mood.density));
    for (const [x, z] of treeSpots.slice(0, trees)) {
      const h = 2.2 + random() * 1.0;
      s.rod([x, 0, z], [x + (random() - 0.5) * 0.2, h, z + (random() - 0.5) * 0.2], 0.16, bark, 0.09);
      if (winter || (emptying && random() < 0.25)) {
        for (let b = 0; b < 7; b++) {
          const angle = random() * 6.28, reach = 0.7 + random() * 0.9;
          s.rod([x, h - random() * 0.8, z], [x + Math.cos(angle) * reach, h + 0.5 + random() * 1.2, z + Math.sin(angle) * reach], 0.05, bark, 0.012);
        }
      } else
        for (let b = 0; b < 5; b++) crowns.push({ at: [x + (random() - 0.5) * 1.3, h + 0.5 + random() * 1.1, z + (random() - 0.5) * 1.3], size: 0.8 + random() * 0.55, color: leaf[Math.floor(random() * leaf.length)] });
    }
    if (crowns.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.95, flatShading: false }), crowns);
    if (a.season === 'autumn' || a.season === 'spring' || emptying) {
      const bits = Array.from({ length: 150 }, () => ({ at: [C[0] + (random() - 0.5) * 13, 0.02, C[1] + (random() - 0.5) * 11] as const, size: 0.05 + random() * 0.06, color: a.season === 'spring' ? '#f6dfe8' : emptying && a.season !== 'autumn' ? '#8f9a5a' : leaf[Math.floor(random() * leaf.length)] }));
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.95 }), bits);
    }
    const benchWood = mat(new THREE.Color('#2f5a43').lerp(new THREE.Color('#8a8378'), wear * 0.5));
    const benchSpots: [number, number, number][] = [[C[0] + 2.9, C[1] - 1.9, -0.9], [C[0] - 2.9, C[1] + 1.9, 2.2], [C[0] + 1.6, C[1] + 3.0, 3.6], [C[0] - 1.9, C[1] - 2.9, 0.5]];
    for (const [x, z, yaw] of benchSpots.slice(0, 1 + Math.round(mood.density * 3))) {
      const group = new THREE.Group();
      for (const part of [s.box([1.5, 0.06, 0.42], [0, 0.45, 0], benchWood), s.box([1.5, 0.4, 0.05], [0, 0.78, -0.2], benchWood), s.box([0.06, 0.45, 0.4], [-0.65, 0.225, 0], postPaint), s.box([0.06, 0.45, 0.4], [0.65, 0.225, 0], postPaint)]) group.add(part);
      group.position.set(x, 0, z);
      group.rotation.y = yaw;
      s.root.add(group);
    }
    const carCount = { thriving: 4, holding: 2, emptying: 1, parade: 0 }[a.fortunes] + Math.round((mood.density - 0.5) * 2);
    const carColours = ['#8a2f2a', '#3f5f7d', '#d9d4c6', '#4a5a48', '#c9a23a', '#2c2e31'];
    const glass = mat('#3a4a52', { roughness: 0.2 });
    const rubber = mat('#1b1b1c', { roughness: 0.9 });
    for (let i = 0; i < Math.max(0, carCount); i++) {
      const group = new THREE.Group();
      const body = mat(new THREE.Color(carColours[Math.floor(random() * carColours.length)]).lerp(new THREE.Color('#8a8378'), wear * 0.4), { roughness: 0.4, metalness: 0.2 });
      const truck = random() < 0.4;
      const parts = [s.box([3.3, 0.55, 1.4], [0, 0.55, 0], body), truck ? s.box([1.2, 0.55, 1.3], [0.35, 1.05, 0], body) : s.box([1.8, 0.5, 1.26], [-0.15, 1.05, 0], body), truck ? s.box([1.1, 0.36, 1.2], [0.35, 1.08, 0], glass) : s.box([1.7, 0.34, 1.28], [-0.15, 1.07, 0], glass)];
      for (const wx of [-1.05, 1.05]) for (const wz of [-0.66, 0.66]) { const wheel = s.cylinder(0.3, 0.3, 0.2, [wx, 0.3, wz], rubber, 12); wheel.rotation.x = Math.PI / 2; parts.push(wheel); }
      if (winter) parts.push(s.box([3.1, 0.06, 1.3], [0, truck ? 0.86 : 1.33, 0], snow));
      for (const part of parts) group.add(part);
      if (i < 3) { group.position.set(-1.4 + i * 3.1 + random() * 0.5, 0.03, -4.55); group.rotation.y = 0.5 + Math.PI / 2 + (random() - 0.5) * 0.08; }
      else { group.position.set(-5.5, 0.03, 1 + (i - 3) * 4.2); group.rotation.y = Math.PI / 2; }
      s.root.add(group);
    }
    if (emptying) {
      const weeds = Array.from({ length: 70 }, () => (random() < 0.5 ? { at: [-6 + random() * 15.5, 0.18, -5.25 + random() * 0.25] as const, size: 0.12 + random() * 0.2, color: '#7b8048' } : { at: [-6.25 + random() * 0.25, 0.18, -5 + random() * 13.5] as const, size: 0.12 + random() * 0.2, color: '#93935a' }));
      s.scatter(new THREE.ConeGeometry(0.5, 2, 5), new THREE.MeshStandardMaterial({ map: blank, roughness: 1 }), weeds);
    }
    if (winter) for (const [x, z] of [[-3.3, -2.3], [9.6, -2.3], [-3.3, 8.6]] as const) s.ball([0.9, 0.35, 0.7], [x, 0.1, z], snow, 10);

    fuse(s.root);
    return world;
  },
});
