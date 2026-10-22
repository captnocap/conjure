import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { grime, paint, panel, pick, write } from './lib';

const CASSEROLES = ['#6f7f3a', '#eadf9c', '#7a3a1e', '#2f4a2a', '#f2d064', '#b9864a', '#d9772a', '#c94a2a', '#e8d9b0'];

export default defineThing({
  questions: {
    occasion: choice('What is the meal for?', {
      homecoming: 'Dinner on the grounds after Sunday service: everybody brought their best dish.',
      repast: 'A funeral repast: plain, plentiful, a framed photograph and lilies at one end.',
      wedding: 'A small-town wedding reception with a tiered white cake and punch.',
      'fish-fry': 'A Friday fish-fry fundraiser: trays of fried fish, white bread, slaw and a cash box.',
      'coffee-hour': 'Fellowship hour: boxes of doughnuts, coffee and store-bought cookies.',
    }),
    progress: score('How far along is the meal?', ['Just set out, foil still on everything', 'The line is moving, lids off and spoons in', 'Picked over, a few scoops left', 'Scraped empty: crumbs, crumpled foil and one untouched dish']),
    cloth: choice('What covers the table?', {
      'red-gingham': 'Red-and-white checked cloth.',
      'blue-gingham': 'Blue-and-white checked cloth.',
      'white-paper': 'White butcher paper rolled out and taped at the corners.',
      'plastic-floral': 'A wipe-clean plastic cloth printed with yellow flowers.',
      bare: 'Nothing: bare wood-grain laminate with a metal edge.',
    }),
    favourite: choice('Which dish is everyone really waiting for?', {
      'fried-chicken': 'A heaped platter of fried chicken.',
      'mac-and-cheese': 'A deep pan of baked macaroni and cheese with a browned top.',
      'jello-salad': 'A wobbling ring of jello salad with fruit suspended in it.',
      'deviled-eggs': 'A tray of deviled eggs dusted with paprika.',
      tamales: 'A steaming pot of tamales in their husks.',
      pies: 'Three pies: pecan, sweet potato and a meringue.',
    }),
    cake: choice('If there is a sheet cake, what is piped on it?', {
      welcome: 'WELCOME HOME in blue icing.',
      birthday: 'HAPPY 90TH MOTHER JONES.',
      grads: 'CONGRATS GRADUATES.',
      memory: 'IN LOVING MEMORY, with a frosted cross.',
      pastor: 'PASTOR APPRECIATION DAY.',
      none: 'No sheet cake at all, just the dishes.',
    }),
    drink: choice('What is there to drink?', {
      'sweet-tea': 'A clear glass dispenser of sweet tea with lemon slices.',
      'orange-cooler': 'An orange insulated jug cooler with a push spigot.',
      'coffee-urn': 'A tall steel coffee urn with a black base.',
      punch: 'A glass bowl of red punch with a ladle.',
    }),
    end: choice('What sits at the far end of the table?', {
      'donation-jar': 'A pickle jar with a handwritten LOVE OFFERING label and bills inside.',
      'guest-book': 'An open guest book with a pen on a ribbon.',
      flowers: 'A vase of garden flowers.',
      hymnals: 'A stack of hymnals somebody set down.',
      nothing: 'Nothing, just the last of the plates.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const L = mix(2.2, 3.2, mood.density), D = 0.76, top = 0.74;
    const eaten = a.progress;
    const add = <T extends THREE.Object3D>(mesh: T, at: readonly [number, number, number]) => { mesh.position.set(...at); s.root.add(mesh); return mesh; };

    // ---- Table
    const steel = s.material('#a3a8a8', { metalness: 0.4, roughness: 0.45 });
    s.box([L, 0.04, D], [0, top - 0.02, 0], s.material(a.cloth === 'bare' ? '#a37448' : '#cfc9bb'));
    if (a.cloth === 'bare') { s.box([L + 0.02, 0.045, 0.02], [0, top - 0.02, D / 2], steel); s.box([L + 0.02, 0.045, 0.02], [0, top - 0.02, -D / 2], steel); }
    for (const x of [-1, 1]) {
      const lx = x * (L / 2 - 0.25);
      for (const z of [-1, 1]) s.rod([lx, top - 0.04, z * (D / 2 - 0.08)], [lx + x * 0.04, 0, z * (D / 2 - 0.06)], 0.014, steel);
      s.rod([lx + x * 0.03, 0.14, -D / 2 + 0.07], [lx + x * 0.03, 0.14, D / 2 - 0.07], 0.012, steel);
      s.rod([lx, top - 0.06, 0], [lx - x * 0.35, top - 0.05, 0], 0.01, steel);
    }

    // ---- Cloth
    const clothKind = a.cloth;
    const y0 = top + (clothKind === 'bare' ? 0 : 0.008);
    const skirts: THREE.Mesh[] = [];
    if (clothKind !== 'bare') {
      const tile = clothKind.endsWith('gingham') ? 0.5 : clothKind === 'plastic-floral' ? 0.6 : 1;
      const makeMap = () => {
        const map = paint(256, 256, (ctx, w, h) => {
          ctx.fillStyle = clothKind === 'plastic-floral' ? '#f4f0dc' : '#f7f4ec';
          ctx.fillRect(0, 0, w, h);
          if (clothKind.endsWith('gingham')) {
            const c = clothKind === 'red-gingham' ? '200,40,44' : '46,92,170';
            const n = 8, step = w / n;
            for (let i = 0; i < n; i += 2) { ctx.fillStyle = `rgba(${c},0.55)`; ctx.fillRect(i * step, 0, step, h); ctx.fillRect(0, i * step, w, step); }
          } else if (clothKind === 'plastic-floral') {
            for (let i = 0; i < 9; i++) {
              const x = (i % 3 + 0.5) * w / 3 + (i % 2) * 20 - 10, y = (Math.floor(i / 3) + 0.5) * h / 3;
              ctx.fillStyle = '#e8b21e';
              for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p) * 14, y + Math.sin(p) * 14, 10, 0, 7); ctx.fill(); }
              ctx.fillStyle = '#7a4a1e'; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
              ctx.fillStyle = '#5f8a4a'; ctx.fillRect(x + 22, y + 10, 16, 6);
            }
          }
          grime(ctx, w, h, wear * 0.8 + eaten * 0.25, random, pick(random, ['120,70,30', '150,60,40', '90,80,40']));
        });
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        return map;
      };
      const drop = clothKind === 'white-paper' ? 0.12 : mix(0.28, 0.5, random());
      const topMap = makeMap();
      topMap.repeat.set((L + 0.06) / tile, (D + 0.06) / tile);
      add(new THREE.Mesh(new THREE.BoxGeometry(L + 0.06, 0.008, D + 0.06), new THREE.MeshStandardMaterial({ map: topMap, roughness: clothKind === 'plastic-floral' ? 0.35 : 0.9 })), [0, top + 0.004, 0]).receiveShadow = true;
      const skirt = (length: number, at: readonly [number, number, number], rotY: number) => {
        const geometry = new THREE.PlaneGeometry(length, drop, Math.round(length * 12), 2);
        const position = geometry.attributes.position;
        const phase = random() * 6;
        for (let i = 0; i < position.count; i++) {
          const down = 0.5 - position.getY(i) / drop;
          position.setZ(i, Math.sin(position.getX(i) * 9 + phase) * 0.035 * down + down * 0.02);
        }
        geometry.computeVertexNormals();
        const map = makeMap();
        map.repeat.set(length / tile, drop / tile);
        const mesh = add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide })), at);
        mesh.rotation.y = rotY;
        mesh.castShadow = true;
        skirts.push(mesh);
      };
      skirt(L + 0.06, [0, top - drop / 2, D / 2 + 0.03], 0);
      skirt(L + 0.06, [0, top - drop / 2, -D / 2 - 0.03], Math.PI);
      skirt(D + 0.06, [L / 2 + 0.03, top - drop / 2, 0], Math.PI / 2);
      skirt(D + 0.06, [-L / 2 - 0.03, top - drop / 2, 0], -Math.PI / 2);
    }

    // ---- Dish vocabulary
    const foil = s.material('#e6e9ea', { metalness: 0.35, roughness: 0.3 });
    const white = s.material('#f7f5ee', { roughness: 0.7 });
    const crust = s.material('#c9924a');
    const left = (bias = 0) => clamp01(1 - eaten * 1.15 + (random() - 0.5) * 0.35 + bias);
    const covered = () => eaten < 0.2 && random() < 0.85 - eaten * 3;
    const spoon = (x: number, z: number) => { const r = s.rod([x - 0.05, y0 + 0.06, z], [x + 0.16, y0 + 0.12, z + 0.1 * (random() - 0.5)], 0.007, steel); return r; };
    const pan = (x: number, z: number, colour: string, big = false, bias = 0) => {
      const w = big ? 0.5 : 0.34, d = big ? 0.32 : 0.26, h = big ? 0.085 : 0.065;
      const turn = (random() - 0.5) * 0.3;
      const group = new THREE.Group();
      group.position.set(x, y0, z); group.rotation.y = turn; s.root.add(group);
      const put = (mesh: THREE.Mesh, py: number) => { mesh.position.y = py; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
      put(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), foil), h / 2);
      put(new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, 0.008, d + 0.03), foil), h);
      if (covered()) {
        const lid = put(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), foil), h);
        lid.scale.set(w * 0.55, 0.03 + random() * 0.02, d * 0.55);
      } else {
        const amount = left(bias);
        const food = s.material(colour, { roughness: 0.85 });
        if (amount > 0.06) {
          const fw = w * 0.92 * mix(0.35, 1, amount);
          const slab = put(new THREE.Mesh(new THREE.BoxGeometry(fw, h * 0.6 * mix(0.5, 1, amount) + 0.01, d * 0.9), food), h * 0.62);
          slab.position.x = -(w * 0.92 - fw) / 2;
          for (let i = 0; i < 5; i++) { const lump = put(new THREE.Mesh(new THREE.SphereGeometry(0.03 + random() * 0.02, 6, 5), food), h * 0.95); lump.position.x = slab.position.x + (random() - 0.5) * fw * 0.8; lump.position.z = (random() - 0.5) * d * 0.7; lump.scale.y = 0.5; }
        }
        spoon(x, z);
        if (eaten > 0.75 && random() < 0.6) { const ball = s.ball([0.07, 0.05, 0.06], [x + (random() - 0.5) * 0.3, y0 + 0.04, z + (random() < 0.5 ? -1 : 1) * (d / 2 + 0.07)], foil, 6); ball.rotation.y = random() * 3; }
      }
    };
    const platter = (x: number, z: number, r: number) => s.cylinder(r, r * 0.8, 0.02, [x, y0 + 0.01, z], white, 20);
    const pie = (x: number, z: number, filling: string, meringue = false) => {
      s.cylinder(0.125, 0.095, 0.035, [x, y0 + 0.018, z], foil, 18);
      const amount = covered() ? 1 : left(0.1);
      if (amount > 0.08) {
        const wedge = s.mesh(new THREE.CylinderGeometry(0.115, 0.1, meringue ? 0.075 : 0.04, 18, 1, false, random() * 6, Math.PI * 2 * Math.max(0.15, Math.round(amount * 8) / 8)), s.material(filling), [x, y0 + (meringue ? 0.05 : 0.035), z]);
        wedge.castShadow = true;
      }
    };

    const special = (x: number, z: number) => {
      const amount = eaten > 0.85 ? 0.03 : left(-0.15);
      if (a.favourite === 'fried-chicken') {
        platter(x, z, 0.24);
        const n = Math.round(amount * 22);
        s.scatter(new THREE.SphereGeometry(1, 7, 6), s.material('#c9862e', { roughness: 0.95 }), Array.from({ length: n }, (_u, i) => {
          const layer = i < 10 ? 0 : i < 17 ? 1 : 2, angle = random() * 7, r = random() * (0.17 - layer * 0.05);
          return { at: [x + Math.cos(angle) * r, y0 + 0.05 + layer * 0.05, z + Math.sin(angle) * r] as const, size: 0.04 + random() * 0.018, color: pick(random, ['#c9862e', '#b8742a', '#d69a3e']) };
        }));
      } else if (a.favourite === 'mac-and-cheese') pan(x, z, '#f0a830', true, -0.15);
      else if (a.favourite === 'jello-salad') {
        platter(x, z, 0.2);
        if (amount > 0.1) {
          const jello = new THREE.MeshStandardMaterial({ color: pick(random, ['#d8263c', '#6fbf3a', '#f08a1e']), roughness: 0.15, transparent: true, opacity: 0.88 });
          const ring = s.mesh(new THREE.TorusGeometry(0.1, 0.06, 10, 24, Math.PI * 2 * Math.max(0.3, amount)), jello, [x, y0 + 0.07, z]);
          ring.rotation.x = Math.PI / 2;
          ring.scale.z = 1.2;
        }
      } else if (a.favourite === 'deviled-eggs') {
        s.box([0.42, 0.015, 0.28], [x, y0 + 0.008, z], white);
        const n = Math.round(amount * 24);
        const spots = Array.from({ length: 24 }, (_u, i) => [x - 0.175 + (i % 6) * 0.07, z - 0.105 + Math.floor(i / 6) * 0.07] as const).sort(() => random() - 0.5).slice(0, n);
        s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#fbf8ee'), spots.map(([ex, ez]) => ({ at: [ex, y0 + 0.025, ez] as const, size: 0.028 })));
        s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#f0b62a'), spots.map(([ex, ez]) => ({ at: [ex, y0 + 0.042, ez] as const, size: 0.014 })));
      } else if (a.favourite === 'tamales') {
        s.cylinder(0.19, 0.18, 0.24, [x, y0 + 0.12, z], s.material('#3a4f6a', { roughness: 0.4 }), 20);
        s.cylinder(0.2, 0.2, 0.012, [x, y0 + 0.24, z], steel, 20);
        const n = Math.round(amount * 14);
        for (let i = 0; i < n; i++) { const angle = i * 2.4, r = 0.03 + (i % 5) * 0.03; const t = s.box([0.05, 0.035, 0.15], [x + Math.cos(angle) * r, y0 + 0.26 + (i % 3) * 0.02, z + Math.sin(angle) * r], s.material(pick(random, ['#e6d49a', '#d9c486', '#efe0b0']))); t.rotation.y = angle; }
        if (amount < 0.9) { const lid = s.cylinder(0.2, 0.2, 0.015, [x + 0.3, y0 + 0.01, z + 0.05], steel, 20); lid.rotation.z = 0; }
      } else {
        pie(x - 0.2, z, '#7a4a22'); pie(x + 0.06, z + 0.04, '#d9772a'); pie(x + 0.3, z - 0.02, '#fbf3d8', true);
      }
    };

    // ---- Lay the table: drink at -x end, plates beside it, dishes down the middle, end piece at +x.
    const dx = -L / 2 + 0.2;
    const lvl = mix(0.92, 0.12, clamp01(eaten + (random() - 0.5) * 0.2));
    if (a.drink === 'sweet-tea') {
      s.cylinder(0.11, 0.13, 0.09, [dx, y0 + 0.045, 0], s.material('#2f2a26'), 16);
      s.cylinder(0.13, 0.13, 0.36, [dx, y0 + 0.27, 0], new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false }), 20);
      s.cylinder(0.122, 0.122, 0.34 * lvl, [dx, y0 + 0.1 + 0.17 * lvl, 0], s.material('#b3621e', { roughness: 0.2, emissive: '#7a3a0a', emissiveIntensity: 0.25 }), 20);
      for (let i = 0; i < 4; i++) { const slice = s.cylinder(0.035, 0.035, 0.008, [dx + Math.cos(i * 1.7) * 0.11, y0 + 0.12 + random() * 0.3 * lvl, Math.sin(i * 1.7) * 0.11], s.material('#f2d23a'), 10); slice.rotation.set(Math.PI / 2, 0, i * 1.7); }
      s.cylinder(0.135, 0.135, 0.03, [dx, y0 + 0.465, 0], steel, 20);
      s.ball([0.025, 0.025, 0.025], [dx, y0 + 0.495, 0], steel, 8);
      s.rod([dx, y0 + 0.12, 0.12], [dx, y0 + 0.1, 0.19], 0.012, steel);
    } else if (a.drink === 'orange-cooler') {
      s.cylinder(0.16, 0.15, 0.42, [dx, y0 + 0.21, 0], s.material('#f07a1c', { roughness: 0.5 }), 20);
      s.cylinder(0.165, 0.165, 0.06, [dx, y0 + 0.45, 0], white, 20);
      s.box([0.04, 0.04, 0.05], [dx, y0 + 0.07, 0.17], white);
      s.box([0.36, 0.02, 0.03], [dx, y0 + 0.5, 0], white);
    } else if (a.drink === 'coffee-urn') {
      s.cylinder(0.13, 0.14, 0.06, [dx, y0 + 0.03, 0], s.material('#1c1a18'), 18);
      s.cylinder(0.125, 0.125, 0.4, [dx, y0 + 0.26, 0], s.material('#d5d9dc', { metalness: 0.45, roughness: 0.25 }), 20);
      s.cylinder(0.05, 0.13, 0.05, [dx, y0 + 0.485, 0], s.material('#1c1a18'), 18);
      for (const x of [-1, 1]) s.box([0.03, 0.09, 0.03], [dx + x * 0.145, y0 + 0.36, 0], s.material('#1c1a18'));
      s.rod([dx, y0 + 0.1, 0.12], [dx, y0 + 0.08, 0.18], 0.012, s.material('#1c1a18'));
      s.box([0.02, 0.02, 0.01], [dx + 0.05, y0 + 0.1, 0.125], s.material('#ff4a2a', { emissive: '#ff3a1a', emissiveIntensity: 0.9 }));
    } else {
      const bowl = s.mesh(new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), [dx, y0 + 0.24, 0]);
      bowl.castShadow = false;
      s.cylinder(0.07, 0.09, 0.04, [dx, y0 + 0.02, 0], white, 14);
      s.cylinder(0.19 * mix(0.6, 1, lvl), 0.1, 0.02 + 0.12 * lvl, [dx, y0 + 0.07 + 0.06 * lvl, 0], s.material('#d8263c', { roughness: 0.15, emissive: '#7a0a1a', emissiveIntensity: 0.3 }), 20);
      s.rod([dx + 0.05, y0 + 0.1, 0], [dx + 0.26, y0 + 0.32, 0.08], 0.008, steel);
    }
    // cups and plates
    const cupX = dx + 0.27;
    const cups = Math.round(mix(14, 1, eaten) + random() * 3);
    const cupColour = a.drink === 'coffee-urn' ? '#f7f5ee' : pick(random, ['#d8263c', '#2a5fb0', '#f7f5ee']);
    for (let i = 0; i < cups; i++) s.cylinder(0.042, 0.03, 0.1, [cupX, y0 + 0.05 + i * 0.012, -0.2], s.material(cupColour), 12);
    const plates = Math.round(mix(40, 3, eaten) + random() * 4);
    s.cylinder(0.115, 0.1, plates * 0.0035 + 0.004, [cupX + 0.04, y0 + (plates * 0.0035 + 0.004) / 2, 0.12], white, 20);
    s.box([0.14, 0.02 + (1 - eaten) * 0.04, 0.14], [cupX + 0.04, y0 + 0.01 + (1 - eaten) * 0.02, 0.3], s.material(mood.cheer > 0.5 ? '#f2d23a' : '#f7f5ee')).rotation.y = 0.2;

    // dish slots
    const startX = cupX + 0.2, endX = L / 2 - (a.end === 'nothing' ? 0.08 : 0.34);
    const slots: [number, number][] = [];
    const cols = Math.max(2, Math.floor((endX - startX) / 0.37));
    for (let c = 0; c < cols; c++) for (const z of [-0.2, 0.2]) slots.push([startX + (c + 0.5) * (endX - startX) / cols, z + (random() - 0.5) * 0.04]);
    const centre = Math.floor(cols / 2) * 2;
    const taken = new Set<number>();
    // favourite takes both rows of the centre column
    special(slots[centre][0], 0);
    taken.add(centre); taken.add(centre + 1);
    // cake takes a front slot and its neighbour
    const tiered = a.occasion === 'wedding';
    if (tiered || a.cake !== 'none') {
      const column = centre >= 2 ? centre - 2 : centre + 2;
      if (column + 1 < slots.length) {
        taken.add(column); taken.add(column + 1);
        const [cx] = slots[column];
        if (tiered) {
          const icing = s.material('#fbf8f0', { roughness: 0.5 });
          s.cylinder(0.2, 0.2, 0.012, [cx, y0 + 0.006, 0], foil, 24);
          const tiers = eaten > 0.6 ? 2 : 3;
          for (let i = 0; i < tiers; i++) {
            const r = 0.17 - i * 0.045;
            const tier = s.mesh(new THREE.CylinderGeometry(r, r, 0.11, 28, 1, false, 0, i === 0 && eaten > 0.3 ? Math.PI * 2 * (1 - eaten * 0.5) : Math.PI * 2), icing, [cx, y0 + 0.067 + i * 0.11, 0]);
            tier.castShadow = true;
            s.ring(r, 0.008, [cx, y0 + 0.015 + i * 0.11, 0], s.material(mood.cheer > 0.5 ? '#f2a6b8' : '#e8e2d0')).rotation.x = Math.PI / 2;
          }
          s.ball([0.03, 0.04, 0.03], [cx - 0.015, y0 + 0.05 + tiers * 0.11, 0], s.material('#1c1a18'), 8);
          s.ball([0.03, 0.04, 0.03], [cx + 0.02, y0 + 0.05 + tiers * 0.11, 0], white, 8);
        } else {
          const w = 0.5, d = 0.34, frac = eaten < 0.15 ? 1 : Math.max(0.12, Math.round(left(0.1) * 6) / 6);
          s.box([w + 0.04, 0.01, d + 0.04], [cx, y0 + 0.005, 0], s.material('#c9a15a'));
          const fw = w * frac;
          s.box([fw, 0.07, d], [cx - (w - fw) / 2, y0 + 0.045, 0], s.material('#fbf6e6', { roughness: 0.5 }));
          const text = { welcome: ['WELCOME', 'HOME'], birthday: ['HAPPY 90TH', 'MOTHER JONES'], grads: ['CONGRATS', 'GRADUATES'], memory: ['IN LOVING', 'MEMORY'], pastor: ['PASTOR', 'APPRECIATION'], none: ['', ''] }[a.cake];
          const ink = { welcome: '#2a5fb0', birthday: '#d93f87', grads: '#2f8a4f', memory: '#5a4a6a', pastor: '#b3261e', none: '#000' }[a.cake];
          const icing = panel(w, d, (ctx, cw, ch) => {
            ctx.fillStyle = '#fbf6e6'; ctx.fillRect(0, 0, cw, ch);
            ctx.strokeStyle = ink; ctx.lineWidth = cw * 0.025; ctx.setLineDash([cw * 0.03, cw * 0.02]); ctx.strokeRect(cw * 0.04, ch * 0.06, cw * 0.92, ch * 0.88);
            write(ctx, text[0], cw / 2, ch * 0.36, ch * 0.2, ink, { max: cw * 0.8, font: 'italic bold', face: 'Georgia, serif' });
            write(ctx, text[1], cw / 2, ch * 0.64, ch * 0.2, ink, { max: cw * 0.8, font: 'italic bold', face: 'Georgia, serif' });
            if (a.cake === 'memory') { ctx.fillStyle = ink; ctx.fillRect(cw * 0.1, ch * 0.3, cw * 0.025, ch * 0.4); ctx.fillRect(cw * 0.07, ch * 0.4, cw * 0.085, ch * 0.05); }
          }, { px: 256, roughness: 0.5 });
          const map = (icing.material as THREE.MeshStandardMaterial).map!;
          map.repeat.set(frac, 1);
          icing.scale.x = frac;
          icing.rotation.x = -Math.PI / 2;
          add(icing, [cx - (w - fw) / 2, y0 + 0.081, 0]);
          if (frac < 1) { const knife = s.box([0.26, 0.004, 0.03], [cx + w / 2 - 0.12, y0 + 0.018, 0.05], steel); knife.rotation.y = 0.5; }
        }
      }
    }
    // everything else
    const fill: ((x: number, z: number) => void)[] = [];
    if (a.occasion === 'fish-fry') {
      fill.push((x, z) => { // fried fish tray
        s.box([0.36, 0.05, 0.27], [x, y0 + 0.025, z], foil);
        const n = Math.round(left() * 12);
        for (let i = 0; i < n; i++) { const f = s.box([0.13, 0.03, 0.06], [x + (random() - 0.5) * 0.2, y0 + 0.06 + (i % 3) * 0.02, z + (random() - 0.5) * 0.16], s.material(pick(random, ['#c9862e', '#d69a3e', '#b8742a']), { roughness: 0.95 })); f.rotation.y = random() * 3; }
      }, (x, z) => { // white bread loaf
        const n = Math.round(left(0.1) * 9);
        for (let i = 0; i < n; i++) s.box([0.022, 0.11, 0.11], [x - 0.1 + i * 0.024, y0 + 0.056, z], s.material(i % 2 ? '#fbf6e6' : '#f4ecd6'));
        s.box([0.06, 0.012, 0.13], [x + 0.16, y0 + 0.006, z], s.material('#f0c22a'));
      }, (x, z) => { // slaw tub
        s.cylinder(0.11, 0.09, 0.1, [x, y0 + 0.05, z], white, 16);
        s.cylinder(0.1, 0.1, 0.01, [x, y0 + 0.03 + 0.06 * left(), z], s.material('#dfe8c0'), 16);
        spoon(x, z);
      }, (x, z) => { // cash box and price card
        s.box([0.24, 0.08, 0.17], [x, y0 + 0.04, z], s.material('#5a6a6f', { metalness: 0.5 }));
        const card = panel(0.22, 0.16, (ctx, w, h) => { ctx.fillStyle = '#f4ecd0'; ctx.fillRect(0, 0, w, h); write(ctx, 'PLATES', w / 2, h * 0.3, h * 0.3, '#1c1a18'); write(ctx, '$8', w / 2, h * 0.7, h * 0.42, '#b3261e'); }, { px: 128 });
        card.rotation.x = -0.3;
        add(card, [x, y0 + 0.17, z - 0.02]);
      });
    }
    if (a.occasion === 'coffee-hour') {
      fill.push((x, z) => { // doughnut box
        s.box([0.34, 0.05, 0.26], [x, y0 + 0.025, z], s.material('#f2a6c0'));
        const lid = s.box([0.34, 0.006, 0.26], [x, y0 + 0.17, z - 0.14], s.material('#f2a6c0')); lid.rotation.x = Math.PI / 2 - 0.25;
        const n = Math.round(left() * 12);
        for (let i = 0; i < n; i++) { const ring = s.ring(0.03, 0.016, [x - 0.12 + (i % 4) * 0.08, y0 + 0.06, z - 0.08 + Math.floor(i / 4) * 0.08], s.material(pick(random, ['#c9924a', '#5a3320', '#f2a6c0', '#fbf6e6']))); ring.rotation.x = Math.PI / 2; }
      }, (x, z) => { // cookie tray
        platter(x, z, 0.15);
        const n = Math.round(left() * 14);
        for (let i = 0; i < n; i++) s.cylinder(0.03, 0.03, 0.01, [x + Math.cos(i * 2.4) * (0.03 + (i % 4) * 0.028), y0 + 0.028 + (i % 2) * 0.01, z + Math.sin(i * 2.4) * (0.03 + (i % 4) * 0.028)], crust, 9);
      });
    }
    const general = [
      (x: number, z: number) => pan(x, z, pick(random, CASSEROLES)),
      (x: number, z: number) => pan(x, z, pick(random, CASSEROLES)),
      (x: number, z: number) => pan(x, z, pick(random, CASSEROLES)),
      (x: number, z: number) => pie(x, z, pick(random, ['#7a4a22', '#d9772a', '#8a2a3a', '#e8c23a'])),
      (x: number, z: number) => { // slow cooker
        s.cylinder(0.14, 0.13, 0.17, [x, y0 + 0.085, z], s.material(pick(random, ['#1c1a18', '#7a1f1f', '#c9cdd0']), { roughness: 0.4 }), 18);
        s.cylinder(0.14, 0.145, 0.02, [x, y0 + 0.18, z], s.material('#3a3a38'), 18);
        const lid = s.ball([0.13, 0.035, 0.13], [x, y0 + 0.19, z], new THREE.MeshPhysicalMaterial({ color: '#dfe8ea', transparent: true, opacity: 0.45, roughness: 0.1 }), 14);
        if (eaten > 0.3) { lid.position.set(x + 0.2, y0 + 0.02, z); }
        s.ball([0.02, 0.02, 0.02], [lid.position.x, lid.position.y + 0.04, z], s.material('#1c1a18'), 8);
        for (const side of [-1, 1]) s.box([0.04, 0.02, 0.06], [x + side * 0.155, y0 + 0.13, z], s.material('#1c1a18'));
      },
      (x: number, z: number) => { // basket of rolls
        s.cylinder(0.14, 0.1, 0.07, [x, y0 + 0.035, z], s.material('#b98a4a'), 14);
        const n = Math.round(left() * 9);
        for (let i = 0; i < n; i++) s.ball([0.045, 0.035, 0.045], [x + Math.cos(i * 2.4) * 0.07 * (i ? 1 : 0), y0 + 0.08 + (i > 6 ? 0.03 : 0), z + Math.sin(i * 2.4) * 0.07 * (i ? 1 : 0)], crust, 8);
        s.box([0.2, 0.004, 0.2], [x, y0 + 0.072, z], s.material(clothKind === 'red-gingham' ? '#f7f4ec' : '#d8263c')).rotation.y = 0.6;
      },
    ];
    let cursor = 0;
    for (let i = 0; i < slots.length; i++) {
      if (taken.has(i)) continue;
      const builder = cursor < fill.length ? fill[cursor] : general[Math.floor(random() * general.length)];
      cursor++;
      builder(slots[i][0], slots[i][1]);
    }

    // ---- Occasion dressing and end piece
    const ex = L / 2 - 0.2;
    if (a.occasion === 'repast') {
      // framed photograph on a little easel, and lilies
      s.box([0.2, 0.26, 0.015], [ex - 0.02, y0 + 0.15, -0.2], s.material('#c9a23a', { metalness: 0.6, roughness: 0.4 })).rotation.x = -0.2;
      const photo = panel(0.15, 0.2, (ctx, w, h) => { ctx.fillStyle = '#d9d2c4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.arc(w / 2, h * 0.4, w * 0.2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(w / 2, h * 0.95, w * 0.36, h * 0.3, 0, 0, 7); ctx.fill(); }, { px: 96 });
      photo.rotation.x = -0.2;
      add(photo, [ex - 0.02, y0 + 0.152, -0.19]);
    }
    if (a.end === 'donation-jar') {
      s.cylinder(0.07, 0.07, 0.19, [ex, y0 + 0.095, 0.12], new THREE.MeshPhysicalMaterial({ color: '#e8f2ee', transparent: true, opacity: 0.4, roughness: 0.05 }), 16);
      s.cylinder(0.055, 0.06, 0.09 * mix(1, 0.4, random()), [ex, y0 + 0.05, 0.12], s.material('#7fa27a'), 12);
      const label = panel(0.11, 0.07, (ctx, w, h) => { ctx.fillStyle = '#fbf6e6'; ctx.fillRect(0, 0, w, h); write(ctx, 'LOVE', w / 2, h * 0.3, h * 0.36, '#1c1a18'); write(ctx, 'OFFERING', w / 2, h * 0.72, h * 0.3, '#1c1a18', { max: w * 0.9 }); }, { px: 128 });
      add(label, [ex, y0 + 0.11, 0.192]);
      s.cylinder(0.073, 0.073, 0.015, [ex, y0 + 0.195, 0.12], s.material('#c9a23a', { metalness: 0.7 }), 16);
    } else if (a.end === 'guest-book') {
      for (const side of [-1, 1]) { const page = s.box([0.15, 0.012, 0.21], [ex - 0.02 + side * 0.076, y0 + 0.012, 0.1], s.material('#fbf6e6')); page.rotation.z = side * 0.08; }
      s.box([0.31, 0.006, 0.22], [ex - 0.02, y0 + 0.003, 0.1], s.material('#f4f1e6'));
      s.rod([ex - 0.08, y0 + 0.025, 0.14], [ex + 0.04, y0 + 0.028, 0.06], 0.005, s.material('#1c1a18'));
    } else if (a.end === 'flowers' || a.occasion === 'repast') {
      const lilies = a.occasion === 'repast';
      s.lathe([[0.04, 0], [0.06, 0.02], [0.07, 0.1], [0.035, 0.2], [0.045, 0.24]], s.material(lilies ? '#f7f5ee' : '#6aa0b8', { roughness: 0.3 }), [ex, y0, 0.1]);
      const n = Math.round(mix(5, 12, mood.density));
      for (let i = 0; i < n; i++) {
        const angle = i * 2.4, lean = 0.05 + random() * 0.12, h = 0.4 + random() * 0.16;
        const tip: [number, number, number] = [ex + Math.cos(angle) * lean, y0 + h, 0.1 + Math.sin(angle) * lean];
        s.rod([ex, y0 + 0.2, 0.1], tip, 0.004, s.material('#4f7a3a'));
        const droop = wear > 0.6 ? 0.6 : 1;
        s.ball([0.035, 0.035 * droop, 0.035], tip, s.material(lilies ? '#fbf8f0' : pick(random, mood.cheer > 0.4 ? ['#f2a620', '#d93f87', '#f4e04a', '#7a4fc0', '#ffffff'] : ['#b9a676', '#a58aa0', '#d8d2c0'])), 8);
      }
    } else if (a.end === 'hymnals') {
      const n = 3 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) { const book = s.box([0.15, 0.035, 0.22], [ex + (random() - 0.5) * 0.02, y0 + 0.018 + i * 0.036, 0.1 + (random() - 0.5) * 0.02], s.material(pick(random, ['#7a1f1f', '#1f3b6e', '#234a34']))); book.rotation.y = (random() - 0.5) * 0.4; }
    }
    // a balloon or two when the day is glad
    const strings: THREE.Mesh[] = [];
    if (mood.cheer > 0.72 && a.occasion !== 'repast') {
      const n = 1 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const bx = L / 2 - 0.05 + (random() - 0.5) * 0.2, bz = -D / 2 + random() * 0.2, by = 1.5 + random() * 0.35;
        s.rod([L / 2 - 0.25, 0.2, -D / 2 + 0.08], [bx, by - 0.15, bz], 0.003, white);
        strings.push(s.ball([0.13, 0.16, 0.13], [bx, by, bz], s.material(pick(random, ['#d8263c', '#f2d23a', '#2a5fb0', '#f7f5ee', '#7a4fc0']), { roughness: 0.25 }), 14));
      }
    }

    const sway = mix(0, 0.035, mood.energy);
    const base = strings.map((b) => b.position.clone());
    return s.finish({
      update: (_dt, time) => {
        skirts.forEach((skirt, i) => { skirt.rotation.x = Math.sin(time * 1.3 + i * 1.7) * sway; });
        strings.forEach((b, i) => { b.position.x = base[i].x + Math.sin(time * 0.9 + i) * sway * 0.6; });
      },
    });
  },
});
