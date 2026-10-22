import * as THREE from 'three';
import { Sculpture, type Placeable, choice, defineWorld, diorama, mix, score } from '@conjure/kit';
import { floodColour } from './flood';

const TRADES = {
  bazaar: ['TEA STALL', 'MEDICAL', 'TAILOR', 'MOBILE', 'SWEETS', 'HARDWARE', 'STUDIO', 'KIRANA', 'XEROX'],
  cloth: ['SAREE CENTRE', 'CLOTH HOUSE', 'TAILORS', 'FASHION', 'HANDLOOM', 'READYMADE', 'DYERS'],
  food: ['TEA', 'BIRYANI', 'SWEETS', 'JUICE', 'HOTEL', 'BAKERY', 'RICE & DAL'],
  repair: ['CYCLE REPAIR', 'ELECTRICALS', 'TYRES', 'WELDING', 'RADIO TV', 'WATCH REPAIR', 'BATTERY'],
} as const;
const PALETTES = {
  pastel: ['#8fc1b5', '#e3b9a5', '#d9c58a', '#a9c3d9', '#e8dcc0', '#c7a9c4'],
  loud: ['#2fa89a', '#e0527a', '#e8b72a', '#3f8fd0', '#6fb54a', '#e8763a'],
  whitewash: ['#e6e6e0', '#d7dcdc', '#e9e2d0', '#cfd8dc', '#e6e6e0', '#dcd8cc'],
  brick: ['#b0694a', '#a8a199', '#c0805a', '#8f8a80', '#b87858', '#9d968c'],
} as const;

export default defineWorld({
  questions: {
    depth: score('How deep is the water in the street?', ['Ankle deep, the kerbs just gone', 'Knee deep', 'Thigh deep', 'Waist deep, doorways half drowned']),
    sky: choice('What is the sky doing?', {
      grey: 'The rain has just stopped: flat grey light, everything dripping.',
      drizzle: 'A thin drizzle still falling, pocking the water.',
      downpour: 'Still pouring, the far end of the street lost in rain.',
      breaking: 'Sun breaking through, the wet walls suddenly bright.',
      dusk: 'Blue dusk in a power cut, a few bulbs and lamps lit against it.',
    }),
    trade: choice('What kind of market street is it?', {
      bazaar: 'A mixed neighbourhood bazaar: tea stall, chemist, tailor, phone shop.',
      cloth: 'A cloth market, saris and bolts of fabric hung high out of the wet.',
      food: 'A food street of tea shops, sweet shops and small eating houses.',
      repair: 'A street of repair shops: cycles, tyres, radios, welding.',
    }),
    shutters: choice('What state are the shopfronts in?', {
      shut: 'Every shutter pulled down and padlocked.',
      salvage: 'A few shutters half up, stock being lifted onto the highest shelves.',
      open: 'Open for business regardless, lights on, goods stacked above the waterline.',
    }),
    paint: choice('How are the buildings painted?', {
      pastel: 'Faded pastels: teal, pink, ochre and pale blue.',
      loud: 'Loud fresh colours, turquoise, magenta and yellow.',
      whitewash: 'Whitewash and grey cement with coloured trim.',
      brick: 'Bare brick and raw cement.',
    }),
    overhead: choice('What crosses the street overhead, besides the wires?', {
      wires: 'Only the wires, sagging in black bundles.',
      bunting: 'Strings of small festival flags left over from a celebration.',
      washing: 'Washing lines between the balconies, clothes that will not dry.',
      tarps: 'Blue tarpaulins roped across as rain shelters, bellied with water.',
      bulbs: 'A string of bare coloured bulbs.',
    }),
    adrift: choice('What is in the water along the shopfronts?', {
      debris: 'Leaves, plastic bags and floating rubbish herded into corners.',
      causeway: 'An improvised causeway of bricks, benches and planks along the shop doors.',
      crates: 'Vegetable crates and baskets floating loose.',
      boats: 'A flotilla of paper boats.',
      raft: 'A raft of lashed oil drums moored to a shop pillar.',
      clean: 'Nothing: a clean brown mirror.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const W = 15, DEPTH = 11.6, yawDeg = 22, pitchDeg = 27;
    const dusk = a.sky === 'dusk';
    const backdrop = { grey: '#d3d6d4', drizzle: '#cdd1d1', downpour: '#bcc2c4', breaking: '#e3ddcd', dusk: '#a9b0c0' }[a.sky];
    const D = mix(0.28, 0.8, a.depth);
    const { art: s, world } = diorama(context, {
      background: backdrop, floor: null, width: W, depth: DEPTH, maxHeight: 3.3, radius: 1.6, pitch: pitchDeg, yaw: yawDeg,
      slots: [[0.7, 1.5, -D], [-3.5, -1.5, -D, 0.95], [4.3, -1.3, -D, 0.95], [-3.3, 3.5, -D, 0.9], [4.4, 3.6, -D, 0.9], [0.5, -2.5, -D, 0.9]],
    });
    // Light: overcast is mostly sky, sun breaks are mostly key, dusk is dim and blue.
    for (const child of s.root.children) {
      const light = child as THREE.Light;
      if (!light.isLight) continue;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = { grey: 1.75, drizzle: 1.7, downpour: 1.55, breaking: 1.5, dusk: 1.5 }[a.sky]; if (dusk) (light as THREE.HemisphereLight).color.set('#c9d4f2'); }
      else if (light === world.keyLight) light.intensity = { grey: 1.5, drizzle: 1.3, downpour: 1.0, breaking: 3.0, dusk: 1.15 }[a.sky];
    }

    // ---- the water: an opaque brown slab whose top is y = 0; the street bed is D below it ----
    const waterTint = floodColour(s);
    if (dusk) waterTint.lerp(new THREE.Color('#5f6677'), 0.25);
    const water = s.box([W, 0.9, DEPTH], [0, -0.45, 0], new THREE.MeshStandardMaterial({ color: waterTint, roughness: 0.3, metalness: 0.05 }));
    water.castShadow = false;
    world.ground = water;

    // ---- buildings ----
    const palette = PALETTES[a.paint];
    const names = [...TRADES[a.trade]];
    const stripe = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 8; canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#8d9498' : '#b3babd'; ctx.fillRect(0, i * 8, 8, 8); ctx.fillStyle = '#6f767a'; ctx.fillRect(0, i * 8 + 7, 8, 1); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.y = 3;
      return texture;
    })();
    const shutterMats = ['#ffffff', '#9fc0e0', '#b8d6b0', '#e0c9a0'].map((tint) => new THREE.MeshStandardMaterial({ map: stripe, color: tint, roughness: 0.55, metalness: 0.3 }));
    const interior = new THREE.MeshStandardMaterial({ color: '#201c19', roughness: 1 });
    const litInterior = new THREE.MeshStandardMaterial({ color: '#8a6a3a', roughness: 1, emissive: '#ffb65a', emissiveIntensity: dusk ? 0.9 : 0.35 });
    const glow = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#ffc45a', emissiveIntensity: dusk ? 2.4 : 0.9 });
    const bulbs: THREE.MeshStandardMaterial[] = [glow];
    const windowDark = new THREE.MeshStandardMaterial({ color: '#2a2f33', roughness: 0.4 });
    const windowLit = new THREE.MeshStandardMaterial({ color: '#e9c98a', emissive: '#ffbf66', emissiveIntensity: 1.1 });
    const tank = new THREE.MeshStandardMaterial({ color: '#1d1e20', roughness: 0.6 });
    const iron = new THREE.MeshStandardMaterial({ color: '#4a4f52', roughness: 0.6, metalness: 0.4 });
    const tin = new THREE.MeshStandardMaterial({ color: '#9aa1a4', roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide });
    const cloths = ['#d8368a', '#e8b72a', '#2f8fd0', '#3fa55a', '#e8651c', '#7a3fb0', '#c7261f', '#f1ece0'];
    let seq = 0;

    /** One shophouse, facade on local z = 0 facing +z, built up from the street bed. */
    const shophouse = (g: Sculpture, x: number, w: number, floors: number, limit = 99) => {
      const index = seq++;
      const tint = new THREE.Color(palette[index % palette.length]);
      tint.lerp(new THREE.Color('#8f8c84'), mood.wear * 0.28).offsetHSL(0, (mood.cheer - 0.5) * 0.14, dusk ? -0.07 : 0);
      const wall = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.92 });
      const trim = new THREE.MeshStandardMaterial({ color: tint.clone().offsetHSL(0.02, 0.05, -0.2), roughness: 0.85 });
      const h = Math.min(limit, 3.45 + (floors - 1) * 2.35 + 0.4);
      const Y = (y: number) => y - D;
      g.box([w - 0.04, h, 1.5], [x, Y(h / 2), -0.75], wall);
      // Damp rising from the water, worse on worn streets.
      const damp = 0.35 + mood.wear * 0.7;
      g.box([w - 0.03, damp, 0.02], [x, damp / 2, 0.006], new THREE.MeshStandardMaterial({ color: tint.clone().lerp(waterTint, 0.5).multiplyScalar(0.85), roughness: 1 }));
      // Shop opening, shutter and what shows behind it.
      const ow = w - 0.55, oh = 2.45, base = 0.25;
      const openAmount = a.shutters === 'shut' ? 0 : a.shutters === 'salvage' ? (random() < 0.45 ? 0.3 + random() * 0.3 : 0) : random() < 0.8 ? 0.75 + random() * 0.25 : 0;
      g.box([ow, oh, 0.05], [x, Y(base + oh / 2), 0.0], openAmount > 0.5 || (dusk && openAmount > 0) ? litInterior : interior);
      const sh = oh * (1 - openAmount);
      if (sh > 0.05) g.box([ow, sh, 0.06], [x, Y(base + oh - sh / 2), 0.05], shutterMats[index % shutterMats.length]);
      g.box([ow + 0.12, 0.16, 0.16], [x, Y(base + oh + 0.06), 0.08], iron);
      if (openAmount > 0) {
        // Stock lifted onto shelves above the water.
        const top = Y(base + oh) - sh - 0.1;
        for (let row = 0; row < 3; row++) {
          const y = Math.max(0.25, 0.45 + row * 0.5);
          if (y > top) break;
          g.box([ow - 0.2, 0.04, 0.3], [x, y, -0.05], trim);
          const count = Math.floor((ow - 0.3) / 0.24);
          g.scatter(new THREE.BoxGeometry(0.2, 0.3, 0.18), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }), Array.from({ length: count }, (_unused, i) => ({ at: [x - ow / 2 + 0.25 + i * 0.24, y + 0.17, -0.02] as [number, number, number], size: 0.85 + random() * 0.25, color: cloths[Math.floor(random() * cloths.length)] })));
        }
        if (dusk || a.shutters === 'open') { g.rod([x + ow * 0.2, Y(base + oh), 0.2], [x + ow * 0.2, Y(base + oh) - 0.3, 0.2], 0.008, iron); g.ball([0.06, 0.08, 0.06], [x + ow * 0.2, Y(base + oh) - 0.36, 0.2], glow, 8); }
      } else if (random() < 0.7) g.box([0.1, 0.12, 0.05], [x, Y(base + 0.25) < 0.1 ? 0.14 : Y(base + 0.25), 0.1], new THREE.MeshStandardMaterial({ color: '#c9a23a', metalness: 0.7, roughness: 0.3 }));
      // Signboard.
      const name = names.splice(Math.floor(random() * names.length), 1)[0] ?? 'STORES';
      const boards: [string, string][] = [['#f6e7b0', '#a5271f'], ['#ffffff', '#1f5f9a'], ['#1f2f5a', '#f2c21f'], ['#ffffff', '#1f7a4a'], ['#fff3b0', '#3a2f6a'], ['#a5271f', '#f1ece0']];
      const [ink, paper] = boards[(index + Math.floor(random() * 3)) % boards.length];
      const board = g.label(name, w - 0.35, 0.62, [x, Y(3.08), 0.1], ink, paper);
      board.rotation.z = (random() - 0.5) * mood.wear * 0.1;
      g.box([w - 0.25, 0.7, 0.06], [x, Y(3.08), 0.06], trim);
      // Awning over some shops.
      if (random() < 0.55) {
        const cloth = random() < 0.5;
        const awning = g.box([w - 0.3, 0.035, 1.0], [x, Y(2.66), 0.52], cloth ? new THREE.MeshStandardMaterial({ color: cloths[Math.floor(random() * cloths.length)], roughness: 0.8, side: THREE.DoubleSide }) : tin);
        awning.rotation.x = 0.3;
        for (const side of [-1, 1]) g.rod([x + side * (w / 2 - 0.25), Y(2.52), 0.98], [x + side * (w / 2 - 0.25), Y(3.3), 0.05], 0.012, iron);
        if (a.trade === 'cloth') for (let i = 0; i < 4; i++) g.box([0.4, 1.3 + random() * 0.5, 0.02], [x - (w - 0.9) / 2 + i * ((w - 0.9) / 3), Y(2.5) - 0.75, 0.9], new THREE.MeshStandardMaterial({ color: cloths[Math.floor(random() * cloths.length)], roughness: 0.9, side: THREE.DoubleSide }));
        if (a.trade === 'repair') for (let i = 0; i < 3; i++) g.ring(0.26, 0.07, [x - 0.5 + i * 0.5, Y(2.3), 0.85], tank).rotation.y = 0.4;
        if (a.trade === 'food') for (let i = 0; i < 3; i++) g.cylinder(0.14, 0.11, 0.2, [x - 0.4 + i * 0.4, Math.max(0.42, Y(1.3)), 0.2], new THREE.MeshStandardMaterial({ color: '#b9bcbb', metalness: 0.7, roughness: 0.35 }), 12);
      }
      // Upper floors: windows with shutters, a balcony, a sunshade.
      for (let floor = 1; floor < floors; floor++) {
        const y0 = Y(3.5 + (floor - 1) * 2.35);
        if (y0 + 2.1 > Y(h)) break;
        const balcony = random() < 0.5;
        const n = w > 3.1 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const wx = x + (i - (n - 1) / 2) * (w / n);
          g.box([0.72, 1.2, 0.05], [wx, y0 + 1.25, 0.0], dusk && random() < 0.45 ? windowLit : windowDark);
          const leafTint = new THREE.MeshStandardMaterial({ color: tint.clone().offsetHSL(0.45, 0.1, -0.12), roughness: 0.8 });
          for (const side of [-1, 1]) g.box([0.34, 1.2, 0.04], [wx + side * 0.53, y0 + 1.25, 0.05], leafTint).rotation.y = side * (0.2 + random() * 0.5);
          if (!balcony) g.box([0.95, 0.05, 0.3], [wx, y0 + 1.95, 0.14], trim);
        }
        if (balcony) {
          g.box([w - 0.3, 0.09, 0.75], [x, y0 + 0.5, 0.36], trim);
          g.box([w - 0.3, 0.05, 0.04], [x, y0 + 1.35, 0.72], iron);
          const posts = Math.round((w - 0.3) / 0.22);
          g.scatter(new THREE.BoxGeometry(0.025, 0.84, 0.025), iron, Array.from({ length: posts }, (_unused, i) => ({ at: [x - (w - 0.3) / 2 + 0.05 + i * ((w - 0.4) / (posts - 1)), y0 + 0.94, 0.72] as [number, number, number], size: 1 })));
          if (random() < 0.5 + mood.density * 0.4) for (let i = 0; i < 3; i++) g.box([0.36, 0.5, 0.02], [x - 0.6 + i * 0.55 + random() * 0.1, y0 + 1.1, 0.76], new THREE.MeshStandardMaterial({ color: cloths[Math.floor(random() * cloths.length)], roughness: 0.95, side: THREE.DoubleSide }));
        } else if (random() < 0.35 + mood.density * 0.4) { g.box([0.6, 0.4, 0.4], [x + w / 2 - 0.6, y0 + 0.5, 0.2], new THREE.MeshStandardMaterial({ color: '#d9d6cb', roughness: 0.6 })); }
        if (mood.wear > 0.45) g.box([0.5, 0.9, 0.012], [x + (random() - 0.5) * (w - 1), y0 + 0.3, 0.008], new THREE.MeshStandardMaterial({ color: tint.clone().multiplyScalar(0.7), roughness: 1 }));
      }
      // Parapet and roof clutter.
      g.box([w + 0.06, 0.14, 1.58], [x, Y(h) + 0.02, -0.75], trim);
      const roll = random();
      if (roll < 0.45) {
        const tx = x + (random() - 0.5) * (w - 1.3);
        for (const part of [g.cylinder(0.45, 0.48, 0.95, [tx, Y(h) + 0.6, -0.8], tank, 14), g.cylinder(0.2, 0.44, 0.14, [tx, Y(h) + 1.14, -0.8], tank, 14)]) part.userData.dry = true;
      } else if (roll < 0.7) {
        const dish = g.mesh(new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, 0, 0.9), tin, [x + (random() - 0.5), Y(h) + 0.75, -0.6]);
        dish.rotation.set(-2.0, random(), 0);
        dish.userData.dry = true;
        g.rod([dish.position.x, Y(h), -0.6], [dish.position.x, Y(h) + 0.6, -0.6], 0.02, iron).userData.dry = true;
      }
      if (floors > 1 && random() < 0.5) g.rod([x - w / 2 + 0.12, 0.05, 0.05], [x - w / 2 + 0.12, Y(h), 0.05], 0.04, iron);
      return h - D;
    };

    const yaw = THREE.MathUtils.degToRad(yawDeg), pitch = THREE.MathUtils.degToRad(pitchDeg);
    const kx = (Math.sin(yaw) * Math.cos(pitch)) / Math.sin(pitch), kz = (Math.cos(yaw) * Math.cos(pitch)) / Math.sin(pitch);
    const squash = 0.62;
    const zBack = -4.25, xLeft = -5.95;
    const back = new Sculpture(context);
    back.root.position.set(0, 0, zBack);
    const left = new Sculpture(context);
    left.root.position.set(xLeft, 0, 0);
    left.root.rotation.y = Math.PI / 2;
    s.root.add(back.root, left.root);
    // Back row: tall in the middle, falling away to a low stall where the street opens on the right.
    const roofs: { x: number; y: number }[] = [];
    let cursor = -5.9;
    const tall = Math.floor(random() * 3);
    const plan: [number, number][] = [[2.5, 2], [2.9, 2], [2.5, 2], [2.6, random() < 0.5 ? 1 : 2]];
    if (random() < 0.6) plan[tall][1] = 3;
    for (const [w, floors] of plan) {
      // A reflection may not run past the right-hand edge of the water, so the last buildings stay low.
      const room = (W / 2 - 0.2 - (cursor + w)) / (kx * squash);
      const top = shophouse(back, cursor + w / 2, w, floors, room + D);
      roofs.push({ x: cursor + w / 2, y: top });
      cursor += w + 0.04;
    }
    // Left row, facing into the street: local x runs toward the back of the stage.
    // The shop nearest the camera stays one storey so its reflection ends before the water does.
    const leftZ = 1.4;
    left.root.position.z = leftZ;
    let run = 0;
    for (const [w, floors] of [[2.6, 1], [2.9, 2]] as const) {
      const room = (DEPTH / 2 - 0.25 - (leftZ - run)) / (kz * squash);
      shophouse(left, run + w / 2, w, floors, room + D);
      run += w + 0.04;
    }
    // Where the row ends on the right: a low compound wall with a painted warning, banana plants behind it.
    {
      const wallTint = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9b3a4').lerp(new THREE.Color('#8f8c84'), mood.wear * 0.4), roughness: 0.95 });
      const wx = (cursor + W / 2) / 2, ww = W / 2 - cursor - 0.1, top = 1.75 - D;
      back.box([ww, 1.75, 0.24], [wx, top - 0.875, -0.3], wallTint);
      back.box([ww + 0.06, 0.08, 0.3], [wx, top + 0.03, -0.3], new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.95 }));
      if (top > 0.5) back.label(['STICK NO BILLS', 'NO PARKING', 'KEEP CLEAR'][Math.floor(random() * 3)], Math.min(2.2, ww - 0.4), 0.34, [wx, top - 0.3, -0.175], '#1f2f5a', '#d9d3c0');
      const leafMats = ['#4f8a3a', '#3f7a34', '#6a9f42'].map((tint) => new THREE.MeshStandardMaterial({ color: tint, roughness: 0.8, side: THREE.DoubleSide }));
      for (let i = 0; i < 2; i++) {
        const px = wx - 0.6 + i * 1.3, pz = zBack - 1.0 - i * 0.3, ph = 2.6 + random() * 0.9 - D;
        s.cylinder(0.09, 0.13, ph + D, [px, (ph - D) / 2, pz], s.material('#7a8a4a', { roughness: 0.9 }), 8);
        for (let k = 0; k < 7; k++) {
          const angle = (k / 7) * Math.PI * 2 + random() * 0.5;
          const leaf = s.mesh(new THREE.SphereGeometry(1, 8, 6), leafMats[k % 3], [px + Math.cos(angle) * 0.6, ph + 0.15 - (k % 2) * 0.2, pz + Math.sin(angle) * 0.6]);
          leaf.scale.set(0.75, 0.03, 0.22);
          leaf.rotation.set(0, -angle, -0.45 - (k % 2) * 0.35, 'YZX');
        }
      }
    }

    // ---- reflections: the set flattened onto the water along the camera's line of sight ----
    const mirror = new THREE.Group();
    mirror.matrixAutoUpdate = false;
    mirror.matrix.set(1, squash * kx, 0, 0, 0, 0.0004, 0, 0.006, 0, squash * kz, 1, 0, 0, 0, 0, 1);
    const ghosts = new Map<THREE.Material, THREE.Material>();
    let order = 1;
    for (const row of [back.root, left.root]) {
      const copy = row.clone(true);
      copy.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (mesh.userData.dry) { mesh.visible = false; return; }
        const source = mesh.material as THREE.MeshStandardMaterial;
        let ghost = ghosts.get(source);
        if (!ghost) {
          const tint = source.color.clone();
          if (source.emissiveIntensity > 0.3) tint.lerp(source.emissive, 0.6);
          ghost = new THREE.MeshBasicMaterial({ color: tint.multiplyScalar(dusk ? 0.75 : 0.9).lerp(waterTint, 0.25), map: source.map, transparent: true, opacity: source.emissiveIntensity > 0.3 ? 0.6 : 0.34, depthWrite: false, side: THREE.DoubleSide });
          ghosts.set(source, ghost);
        }
        mesh.material = ghost;
        mesh.castShadow = mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        mesh.renderOrder = order++;
      });
      mirror.add(copy);
    }
    s.root.add(mirror);

    // ---- street furniture that is part of the place ----
    // A pole at the open right-hand end and the wires that sag from it across the street.
    const wireMat = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.8 });
    const pole: [number, number, number] = [6.5, 0, -3.1];
    s.cylinder(0.07, 0.12, 6.6, [pole[0], 3.3 - D, pole[2]], s.material('#a7a59c', { roughness: 0.95 }), 6).rotation.z = -0.03;
    s.box([1.2, 0.07, 0.07], [pole[0], 5.9 - D, pole[2]], iron);
    s.box([0.4, 0.5, 0.3], [pole[0], 4.3 - D, pole[2] + 0.18], s.material('#8b9296', { metalness: 0.4 }));
    s.rod([pole[0], 5.2 - D, pole[2]], [pole[0] - 0.9, 5.5 - D, pole[2] + 0.5], 0.03, iron);
    s.ball([0.14, 0.07, 0.24], [pole[0] - 1.0, 5.47 - D, pole[2] + 0.56], dusk ? glow : s.material('#d9d6cb'), 8);
    const sag = (from: [number, number, number], to: [number, number, number], drop: number, radius = 0.014, material: THREE.Material = wireMat) => {
      const mid: [number, number, number] = [(from[0] + to[0]) / 2 + (random() - 0.5) * 0.2, Math.min(from[1], to[1]) - drop, (from[2] + to[2]) / 2 + (random() - 0.5) * 0.2];
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...from), new THREE.Vector3(...mid), new THREE.Vector3(...to)]);
      const tube = s.mesh(new THREE.TubeGeometry(curve, 18, radius, 4), material);
      tube.castShadow = false;
      return curve;
    };
    const wires = 3 + Math.round(mood.density * 5);
    for (let i = 0; i < wires; i++) {
      const roof = roofs[i % roofs.length];
      sag([pole[0], 5.3 - D + (i % 3) * 0.25, pole[2]], [roof.x + (random() - 0.5), Math.min(roof.y + 0.1, 4.3 + random() * 1.4), zBack + 0.1], 0.3 + random() * 0.5);
    }
    const leftTop: [number, number, number] = [xLeft + 0.1, 5.2 - D, -1.6];
    for (let i = 0; i < 3 + Math.round(mood.density * 2); i++) sag([pole[0], 5.6 - D + (i % 2) * 0.2, pole[2]], [leftTop[0], leftTop[1] + i * 0.12, leftTop[2] - i * 0.4], 0.7 + random() * 0.6);
    for (let i = 0; i < 2; i++) sag([roofs[1].x + i, Math.min(roofs[1].y, 5.6), zBack + 0.1], [leftTop[0], leftTop[1] + 0.2, leftTop[2] - 1.2 - i * 0.5], 0.4 + random() * 0.4);
    // A dark knot where they all meet.
    s.ball([0.22, 0.4, 0.2], [pole[0] - 0.05, 5.2 - D, pole[2] + 0.1], wireMat, 8);

    const spanFrom: [number, number, number] = [-1.5, Math.min(roofs[1].y - 0.9, 4.6), zBack + 0.75], spanTo: [number, number, number] = [pole[0] - 0.05, 4.2 - D, pole[2] + 0.2];
    const spanB0: [number, number, number] = [xLeft + 0.75, 3.5 - D, 0.6], spanB1: [number, number, number] = [3.0, Math.min(roofs[3].y - 0.4, 4.1), zBack + 0.75];
    const flutter: THREE.Object3D[] = [];
    if (a.overhead === 'bunting') {
      const tri = new THREE.Shape(); tri.moveTo(-0.13, 0); tri.lineTo(0.13, 0); tri.lineTo(0, -0.34); tri.closePath();
      const flagGeometry = new THREE.ShapeGeometry(tri);
      for (const [from, to] of [[spanFrom, spanTo], [spanB0, spanB1]] as const) {
        const curve = sag(from, to, 0.7, 0.008);
        for (let i = 1; i < 22; i++) { const p = curve.getPoint(i / 22); const flag = s.mesh(flagGeometry, new THREE.MeshStandardMaterial({ color: cloths[i % cloths.length], side: THREE.DoubleSide, roughness: 0.85 }), [p.x, p.y, p.z]); flag.rotation.y = 0.5 + (random() - 0.5) * 0.5; flag.castShadow = false; flutter.push(flag); }
      }
    } else if (a.overhead === 'washing') {
      for (const [from, to] of [[spanFrom, spanTo], [spanB0, spanB1]] as const) {
        const curve = sag(from, to, 0.5, 0.008, new THREE.MeshStandardMaterial({ color: '#d8c07a' }));
        for (let i = 1; i < 11; i++) { const p = curve.getPoint(i / 11 + (random() - 0.5) * 0.03); const hgt = 0.45 + random() * 0.45; const item = s.box([0.42 + random() * 0.2, hgt, 0.02], [p.x, p.y - hgt / 2, p.z], new THREE.MeshStandardMaterial({ color: cloths[Math.floor(random() * cloths.length)], side: THREE.DoubleSide, roughness: 0.95 })); item.rotation.y = -0.5 + (random() - 0.5) * 0.3; flutter.push(item); }
      }
    } else if (a.overhead === 'tarps') {
      const blue = new THREE.MeshStandardMaterial({ color: '#1f6fd0', roughness: 0.5, side: THREE.DoubleSide });
      for (const [cx, cz, tw, td] of [[-3.3, -2.6, 3.0, 2.4], [3.0, -2.7, 2.8, 2.2]] as const) {
        const geometry = new THREE.PlaneGeometry(tw, td, 8, 8);
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) / tw, v = pos.getY(i) / td; pos.setZ(i, -(0.25 - u * u - v * v) * 1.1); }
        geometry.computeVertexNormals();
        const tarp = s.mesh(geometry, blue, [cx, 3.5 - D, cz]);
        tarp.rotation.set(-Math.PI / 2 + 0.16, 0, (random() - 0.5) * 0.15);
        for (const sx of [-1, 1]) { s.rod([cx + sx * tw / 2, 3.3 - D, cz + td / 2], [cx + sx * (tw / 2 + 0.1), 0, cz + td / 2 + 0.1], 0.03, s.material('#b89a4f', { roughness: 0.8 })); s.rod([cx + sx * tw / 2, 3.72 - D, cz - td / 2], [cx + sx * tw / 2, 4.0 - D, zBack + 0.1], 0.008, wireMat); }
      }
    } else if (a.overhead === 'bulbs') {
      const tints = ['#ff5a3a', '#ffd23a', '#4ad07a', '#4aa0ff', '#ff6ab0'];
      const lamps = tints.map((tint) => new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: dusk ? 2.6 : 1.3 }));
      bulbs.push(...lamps);
      for (const [from, to] of [[spanFrom, spanTo], [spanB0, spanB1]] as const) {
        const curve = sag(from, to, 0.6, 0.008);
        for (let i = 1; i < 18; i++) { const p = curve.getPoint(i / 18); s.ball([0.06, 0.08, 0.06], [p.x, p.y - 0.09, p.z], lamps[i % lamps.length], 8).castShadow = false; }
      }
    }

    // ---- what is in the water along the shopfronts ----
    const front = zBack + 0.9;
    const bob: THREE.Object3D[] = [];
    const ringGeometry = new THREE.RingGeometry(0.93, 1, 28);
    const foam = new THREE.MeshStandardMaterial({ color: waterTint.clone().lerp(new THREE.Color('#efe9d6'), 0.55), roughness: 0.3, side: THREE.DoubleSide });
    const ringAt = (x: number, z: number, radius: number, parent: THREE.Object3D = s.root) => {
      const ring = new THREE.Mesh(ringGeometry, foam);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.012, z);
      ring.scale.setScalar(radius);
      ring.receiveShadow = true;
      parent.add(ring);
      return ring;
    };
    if (a.adrift === 'causeway') {
      const brick = s.material('#a8553a', { roughness: 0.95 }), plank = s.material('#a8895a', { roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const x = -4.6 + i * 1.75;
        for (let j = 0; j < 3; j++) s.box([0.46, 0.14, 0.24], [x + (random() - 0.5) * 0.05, 0.02 + j * 0.0 + (j - 1) * 0.0 + 0.0, front + (j - 1) * 0.25], brick);
        s.box([0.5, 0.14, 0.7], [x, 0.03, front], brick);
        if (i < 5) { const board = s.box([1.9, 0.05, 0.3], [x + 0.875, 0.13 + (i % 2) * 0.04, front + (random() - 0.5) * 0.12], plank); board.rotation.y = (random() - 0.5) * 0.08; }
        ringAt(x, front, 0.5);
      }
      const bench = s.box([1.1, 0.06, 0.32], [-5.1, 0.2, front - 0.1], plank);
      bench.rotation.y = 0.1;
    } else if (a.adrift === 'crates') {
      const tints = ['#3f7fc0', '#c7361f', '#3f9a5a', '#e8b72a'];
      for (let i = 0; i < 5 + Math.round(mood.density * 4); i++) {
        const x = -5 + random() * 11, z = front + random() * 0.9 + (i % 3 === 0 ? 5.2 + random() * 2 : 0);
        const crate = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.38), new THREE.MeshStandardMaterial({ color: tints[i % tints.length], roughness: 0.6 }));
        body.castShadow = true;
        crate.add(body);
        for (let k = 0; k < 6; k++) { const veg = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: ['#c7361f', '#5fa03a', '#e8b72a', '#7a3fa0'][Math.floor(random() * 4)], roughness: 0.6 })); veg.position.set((k % 3 - 1) * 0.16, 0.17, (Math.floor(k / 3) - 0.5) * 0.16); crate.add(veg); }
        crate.position.set(x, 0.05, z);
        crate.rotation.set((random() - 0.5) * 0.25, random() * 3, (random() - 0.5) * 0.25);
        s.root.add(crate);
        bob.push(crate);
        ringAt(x, z, 0.42);
      }
    } else if (a.adrift === 'boats') {
      const papers = ['#f3f0e6', '#f0d9a0', '#bcd6e8', '#f2b8b8', '#c9e6c0'];
      for (let i = 0; i < 7 + Math.round(mood.density * 8); i++) {
        const x = -5.5 + random() * 11.5, z = i % 2 ? front + random() * 1.2 : 2.5 + random() * 2.6;
        const boat = new THREE.Group();
        const paper = new THREE.MeshStandardMaterial({ color: papers[i % papers.length], roughness: 0.9, side: THREE.DoubleSide, flatShading: true });
        const hull = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.13, 4, 1), paper);
        hull.rotation.x = Math.PI; hull.scale.set(1.5, 1, 0.5); hull.rotation.y = Math.PI / 4;
        const sail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), paper);
        sail.position.y = 0.14; sail.scale.set(1, 1, 0.4);
        boat.add(hull, sail);
        boat.traverse((node) => { node.castShadow = true; });
        boat.position.set(x, 0.065, z);
        boat.rotation.y = random() * 6.28;
        s.root.add(boat);
        bob.push(boat);
        ringAt(x, z, 0.3);
      }
    } else if (a.adrift === 'raft') {
      const raft = new THREE.Group();
      const drumTints = ['#2f6fa8', '#c7361f', '#2f6fa8', '#3f8a5a'];
      for (let i = 0; i < 4; i++) { const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14), new THREE.MeshStandardMaterial({ color: drumTints[i], roughness: 0.5, metalness: 0.3 })); drum.rotation.z = Math.PI / 2; drum.position.set((i % 2 ? 0.5 : -0.5), 0, (i < 2 ? -0.4 : 0.4)); raft.add(drum); }
      for (let i = 0; i < 6; i++) { const board = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.05, 0.22), new THREE.MeshStandardMaterial({ color: '#a8895a', roughness: 0.9 })); board.position.set(0, 0.32, -0.62 + i * 0.25); raft.add(board); }
      const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 3.2, 6), new THREE.MeshStandardMaterial({ color: '#b89a4f', roughness: 0.8 }));
      poleMesh.position.set(0.2, 0.42, 0.1); poleMesh.rotation.z = Math.PI / 2 - 0.05; poleMesh.rotation.y = 0.3;
      raft.add(poleMesh);
      raft.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      raft.position.set(5.6, 0.12, 0.6);
      raft.rotation.y = 0.5;
      s.root.add(raft);
      bob.push(raft);
      ringAt(5.6, 0.6, 1.45);
      sag([5.2, 0.4, 0.1], [pole[0], 0.9, pole[2]], 0.15, 0.012, new THREE.MeshStandardMaterial({ color: '#d8c07a' }));
    }
    if (a.adrift !== 'clean') {
      const scrapCount = Math.round(mix(30, 120, mood.density) * (a.adrift === 'debris' ? 1.6 : 0.6));
      const tints = ['#6f7a3a', '#8a7a35', '#59452c', '#a2893f', '#4c5a2e', '#e9e6da', '#3f8fd0', '#e8588f'];
      const scraps = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, side: THREE.DoubleSide }), scrapCount);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < scrapCount; i++) {
        // Rubbish gathers along walls and in the corner where the two rows meet.
        const along = random();
        const x = along < 0.45 ? -5.5 + random() * 11 : along < 0.7 ? xLeft + 0.6 + random() * 0.9 : -6.5 + random() * 13.5;
        const z = along < 0.45 ? front - 0.3 + random() ** 2 * 1.4 : along < 0.7 ? -3 + random() * 6 : -3 + random() * 8.3;
        const size = mix(0.04, 0.11, random());
        turn.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, random() * 6.28));
        scraps.setMatrixAt(i, matrix.compose(at.set(x, 0.014, z), turn, scale.set(size * 1.7, size * 0.8, 1)));
        scraps.setColorAt(i, new THREE.Color(tints[Math.floor(random() * (a.adrift === 'debris' ? tints.length : 5))]));
      }
      scraps.instanceMatrix.needsUpdate = true;
      if (scraps.instanceColor) scraps.instanceColor.needsUpdate = true;
      scraps.receiveShadow = true;
      s.root.add(scraps);
      if (a.adrift === 'debris') {
        for (let i = 0; i < 6; i++) {
          const bag = s.ball([0.2 + random() * 0.12, 0.09, 0.16 + random() * 0.1], [-5 + random() * 10.5, 0.03, front + random() * 0.8], new THREE.MeshStandardMaterial({ color: ['#e9e6da', '#2f8fd0', '#1d1e20', '#e8588f'][i % 4], roughness: 0.4 }), 8);
          bob.push(bag);
        }
        const tyre = s.ring(0.3, 0.1, [xLeft + 1.1, 0.03, -2.6], tank);
        tyre.rotation.x = Math.PI / 2 - 0.12;
        ringAt(xLeft + 1.1, -2.6, 0.55);
      }
    }
    // Long glints across the open water.
    {
      const glintCount = Math.round(mix(26, 60, mood.energy));
      const glints = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 12), new THREE.MeshStandardMaterial({ color: waterTint.clone().lerp(new THREE.Color('#f1ecda'), 0.42), roughness: 0.2 }), glintCount);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < glintCount; i++) glints.setMatrixAt(i, matrix.compose(at.set(-6.8 + random() * 13.6, 0.009, -3 + random() * 8.4), turn, scale.set(mix(0.25, 0.9, random()), mix(0.012, 0.03, random()), 1)));
      glints.instanceMatrix.needsUpdate = true;
      glints.receiveShadow = true;
      s.root.add(glints);
    }

    // ---- rain ----
    const raining = a.sky === 'drizzle' || a.sky === 'downpour';
    let rain: THREE.InstancedMesh | null = null;
    const drops: THREE.Mesh[] = [];
    if (raining) {
      const heavy = a.sky === 'downpour';
      const count = heavy ? 520 : 170;
      rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.012, heavy ? 0.7 : 0.4, 0.012), new THREE.MeshBasicMaterial({ color: '#eef2f2', transparent: true, opacity: heavy ? 0.6 : 0.45, depthWrite: false }), count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.12)), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) rain.setMatrixAt(i, matrix.compose(at.set(-7.3 + random() * 14.6, 0.3 + random() * 6.5, -5 + random() * 10.6), turn, one));
      rain.instanceMatrix.needsUpdate = true;
      rain.frustumCulled = false;
      s.root.add(rain);
      for (let i = 0; i < (heavy ? 60 : 28); i++) drops.push(ringAt(-7 + random() * 14, -3.2 + random() * 8.6, 0.08 + random() * 0.16));
    }

    // ---- placement: stand the cast in the water and ring each one with ripples ----
    const ripples = new THREE.Group();
    s.root.add(ripples);
    const basePlace = world.place.bind(world);
    const placed: THREE.Mesh[] = [];
    world.place = (items: readonly Placeable[]) => {
      ripples.clear();
      placed.length = 0;
      ripples.visible = false;
      basePlace(items);
      ripples.visible = true;
      for (const item of items) {
        // Nothing drowns outright: low things sink by a third of their height at most.
        item.holder.position.y = -Math.min(D, item.height * item.holder.scale.y * 0.34);
        item.holder.updateMatrixWorld(true);
        const reach = Math.min(2.4, item.radius * item.holder.scale.x);
        for (const [k, grow] of [[0, 0.82], [1, 1.02]] as const) {
          const ring = ringAt(item.holder.position.x, item.holder.position.z, Math.max(0.25, reach * grow), ripples);
          ring.position.y = 0.011 + k * 0.001;
          placed.push(ring);
        }
      }
    };
    const energy = mix(0.2, 1, mood.energy);
    const rest = [...bob.map((object) => object.position.y)];
    const dropBase = drops.map((ring) => ring.scale.x);
    const placedBase: number[] = [];
    world.update = (dt: number, time: number) => {
      bob.forEach((object, index) => { object.position.y = rest[index] + Math.sin(time * 1.3 + index * 1.9) * 0.02 * energy; });
      flutter.forEach((object, index) => { object.rotation.x = Math.sin(time * 2.2 + index) * 0.25 * energy; });
      if (rain) rain.position.y = -((time * (a.sky === 'downpour' ? 9 : 5)) % 1.2);
      drops.forEach((ring, index) => { const phase = (time * 1.4 + index * 0.37) % 1; ring.scale.setScalar(dropBase[index] * (0.3 + phase * 1.4)); });
      placed.forEach((ring, index) => { placedBase[index] ??= ring.scale.x; ring.scale.setScalar(placedBase[index] * (1 + Math.sin(time * 1.2 + index) * 0.03 * energy)); });
      if (placedBase.length > placed.length) placedBase.length = 0;
      if (dusk) bulbs.forEach((material, index) => { material.emissiveIntensity = (material === glow ? 2.4 : 2.6) * (0.92 + Math.sin(time * 21 + index * 2.3) * 0.08 * mood.wear); });
    };
    return world;
  },
});
