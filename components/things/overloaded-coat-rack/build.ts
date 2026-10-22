import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Cloth = 'plain' | 'quilt' | 'check' | 'spots' | 'tweed';
interface Garment { tint: string; cloth: Cloth; length: number; width: number; hood?: boolean; band?: string }

const WARDROBES = {
  one: 'One person\'s forty years: the same beige mac and navy overcoat bought again and again, all the same size, older toward the middle.',
  family: 'A whole family: big dark coats, a school blazer, a small red anorak and a yellow raincoat on the low pegs.',
  strangers: 'Strangers\' coats that do not belong together: a hi-vis jacket, a leopard fur, an army parka, a purple puffer.',
  departed: 'Mostly hers, soft and floral, with one large dark man\'s overcoat and his hat left exactly where he hung them.',
} as const;

export default defineThing({
  questions: {
    whose: choice('Whose coats are these?', WARDROBES),
    load: score('How buried is the stand?', ['A few coats, the bentwood hooks still showing', 'Every hook taken', 'Coats hung on coats', 'A solid drum of cloth, the stand gone entirely']),
    hats: choice('What hats are on top?', {
      three: 'Three hats stacked on the crown: a trilby, a flat cap and a wool bobble hat.',
      caps: 'Flat caps only, one on each top hook.',
      single: 'One good felt hat, placed with care on the very top.',
      none: 'No hats.',
    }),
    scarves: choice('What scarves hang from it?', {
      none: 'No scarves.',
      football: 'A long striped football scarf in two club colours.',
      knitted: 'Hand-knitted woollen scarves in mustard and plum.',
      silk: 'Thin patterned silk headscarves, tied on in a bunch.',
    }),
    umbrellas: choice('What umbrellas are in the ring at its foot?', {
      none: 'None.',
      one: 'A single black umbrella with a crook handle.',
      many: 'A dozen umbrellas jammed in, golf stripes and floral, more than anyone needs.',
      broken: 'A few, and one blown inside-out lying beside it with bent ribs.',
    }),
    bags: score('How many carrier bags hang from the hooks?', ['None', 'One or two', 'A cluster on every side', 'Bags of bags, swollen and knotted']),
    stance: choice('How is it standing?', {
      upright: 'Square and upright, bearing it all.',
      tilting: 'Tilting under the weight, a few degrees from falling.',
      shed: 'Upright, but one coat has slid off into a heap on the floor.',
    }),
    wood: choice('What is the stand made of, where it still shows?', {
      bentwood: 'Dark bentwood with curled hooks, a café classic.',
      blond: 'Pale varnished beech, 1970s.',
      black: 'Black tubular steel with ball tips.',
      white: 'Chipped white painted wood.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const top = new THREE.Group();
    s.root.add(top);
    const mount = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = top) => { node.removeFromParent(); parent.add(node); return node; };

    const fabric = (tint: string, cloth: Cloth) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const g = canvas.getContext('2d')!;
      const base = new THREE.Color(tint);
      const grey = new THREE.Color('#8f8a80');
      base.lerp(grey, mood.wear * 0.3 + (1 - mood.cheer) * 0.12);
      g.fillStyle = `#${base.getHexString()}`;
      g.fillRect(0, 0, 64, 64);
      if (cloth === 'quilt') {
        for (let y = 0; y < 64; y += 8) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y, 64, 2); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, y + 2, 64, 2); }
      } else if (cloth === 'check') {
        g.fillStyle = 'rgba(0,0,0,0.28)';
        for (let i = 0; i < 64; i += 16) { g.fillRect(i, 0, 6, 64); g.fillRect(0, i, 64, 6); }
        g.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 10; i < 64; i += 16) { g.fillRect(i, 0, 1, 64); g.fillRect(0, i, 64, 1); }
      } else if (cloth === 'spots') {
        for (let i = 0; i < 46; i++) { g.fillStyle = i % 2 ? '#2a1c12' : '#7a4a22'; g.beginPath(); g.ellipse(random() * 64, random() * 64, 2 + random() * 3, 1.5 + random() * 2, random() * 3, 0, 7); g.fill(); }
      } else if (cloth === 'tweed') {
        for (let i = 0; i < 500; i++) { g.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)'; g.fillRect(random() * 64, random() * 64, 1, 2); }
      } else {
        for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(random() * 64, 0, 2 + random() * 4, 64); }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: cloth === 'quilt' ? 0.55 : 0.95, side: THREE.DoubleSide });
    };

    // The wardrobe each answer draws from.
    const adult = (tint: string, cloth: Cloth = 'plain', extra: Partial<Garment> = {}): Garment => ({ tint, cloth, length: r(0.95, 1.2), width: r(0.36, 0.42), ...extra });
    const child = (tint: string, cloth: Cloth = 'plain', extra: Partial<Garment> = {}): Garment => ({ tint, cloth, length: r(0.5, 0.62), width: r(0.25, 0.29), ...extra });
    const wardrobe: Garment[] = {
      one: () => [adult('#c6b08a'), adult('#27324a'), adult('#b9a784'), adult('#3a3f46', 'tweed'), adult('#d0bd97'), adult('#222b40'), adult('#8d7c62', 'tweed'), adult('#b3a07b')],
      family: () => [adult('#27324a'), child('#d23a2c', 'plain', { hood: true }), adult('#5a3a2a', 'tweed'), child('#f0c419', 'plain', { hood: true }), adult('#e58aa6', 'quilt', { length: 0.72 }), child('#27553a', 'plain'), adult('#3f6f9a', 'quilt', { length: 0.75, hood: true }), child('#4aa3d8', 'quilt', { hood: true })],
      strangers: () => [adult('#d6e21f', 'plain', { length: 0.78, band: '#d9dde0' }), adult('#c79a58', 'spots'), adult('#5d6a3c', 'plain', { hood: true }), adult('#7c3fa6', 'quilt', { length: 0.8 }), adult('#f2f2ee', 'plain'), adult('#b3261f', 'check', { length: 0.82 }), adult('#1c1c1f'), adult('#e56b1f', 'plain', { length: 0.7, band: '#d9dde0' })],
      departed: () => [adult('#c9a7c4', 'plain', { width: 0.34 }), adult('#d8c3a0', 'plain', { width: 0.34 }), adult('#8fb0a3', 'check', { width: 0.34, length: 0.9 }), adult('#e3b5b0', 'quilt', { width: 0.35, length: 0.8 }), adult('#a65a6f', 'plain', { width: 0.34 }), adult('#d9d2bd', 'tweed', { width: 0.34 })],
    }[a.whose]();

    const frameColour = { bentwood: '#4a2c1b', blond: '#c99b5e', black: '#1f2124', white: '#e9e5da' }[a.wood];
    const frame = s.material(frameColour, a.wood === 'black' ? { metalness: 0.6, roughness: 0.4 } : { roughness: 0.5 });
    const H = 1.86;

    // The stand: a pole, four S-curved legs, an umbrella ring and curled top hooks.
    s.cylinder(0.022, 0.026, H - 0.1, [0, 0.1 + (H - 0.1) / 2, 0], frame, 12);
    for (let i = 0; i < 4; i++) {
      const t = (i / 4) * Math.PI * 2 + Math.PI / 4, cx = Math.cos(t), cz = Math.sin(t);
      s.tube([[cx * 0.03, 0.62, cz * 0.03], [cx * 0.1, 0.38, cz * 0.1], [cx * 0.16, 0.16, cz * 0.16], [cx * 0.3, 0.03, cz * 0.3], [cx * 0.36, 0.015, cz * 0.36]], 0.015, frame);
    }
    mount(s.ring(0.2, 0.011, [0, 0.52, 0], frame), s.root).rotation.x = Math.PI / 2;
    mount(s.ring(0.17, 0.011, [0, 0.14, 0], frame), s.root).rotation.x = Math.PI / 2;
    mount(s.ball([0.035, 0.035, 0.035], [0, H + 0.01, 0], frame, 12));
    const hookCount = 6;
    const hooks: { angle: number; y: number }[] = [];
    for (let i = 0; i < hookCount; i++) {
      const t = (i / hookCount) * Math.PI * 2 + 0.3, cx = Math.cos(t), cz = Math.sin(t);
      const y = H - 0.14 - (i % 2) * 0.16;
      mount(s.tube([[cx * 0.02, y - 0.1, cz * 0.02], [cx * 0.1, y - 0.06, cz * 0.1], [cx * 0.19, y, cz * 0.19], [cx * 0.2, y + 0.07, cz * 0.2], [cx * 0.15, y + 0.1, cz * 0.15]], 0.011, frame));
      if (a.wood === 'black') mount(s.ball([0.02, 0.02, 0.02], [cx * 0.15, y + 0.1, cz * 0.15], frame, 10));
      hooks.push({ angle: t, y });
    }
    const low: { angle: number; y: number }[] = [0.9, 2.6, 4.3, 5.6].map((angle) => ({ angle, y: 1.15 }));

    // A coat hung by its collar: a flattened drape, two empty sleeves, a collar, perhaps a hood.
    const coat = (item: Garment) => {
      const group = new THREE.Group();
      const cloth = fabric(item.tint, item.cloth);
      const L = item.length, w = item.width / 2;
      const profile: [number, number][] = [[w * 0.86, -L], [w * 0.98, -L + 0.015], [w * 0.95, -L * 0.5], [w, -0.2], [w * 0.92, -0.1], [w * 0.55, -0.035], [0.07, 0], [0.06, 0.03]];
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 18), cloth);
      body.scale.z = item.cloth === 'quilt' ? 0.55 : 0.4;
      group.add(body);
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.048, L * 0.58, 10), cloth);
        sleeve.position.set(side * (w + 0.025), -0.1 - L * 0.29, 0.01);
        sleeve.rotation.z = side * r(0.03, 0.12);
        sleeve.scale.z = 0.7;
        group.add(sleeve);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.028, 6, 14), cloth);
      collar.rotation.x = Math.PI / 2.4;
      collar.scale.z = 0.8;
      collar.position.y = -0.01;
      group.add(collar);
      const depth = w * (item.cloth === 'quilt' ? 0.55 : 0.4);
      const trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(item.tint).multiplyScalar(0.45), roughness: 0.8 });
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.014, L * 0.84, 0.012), trim);
      placket.position.set(0, -0.14 - L * 0.42, depth * 0.97);
      group.add(placket);
      for (let i = 0; i < 3; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), trim);
        button.position.set(0.035, -0.22 - i * L * 0.2, depth * 0.96);
        group.add(button);
      }
      if (item.hood) {
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), cloth);
        hood.scale.set(1, 1.15, 0.5);
        hood.position.set(0, -0.12, -0.06);
        group.add(hood);
      }
      if (item.band) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.0, w * 1.0, 0.05, 18, 1, true), new THREE.MeshStandardMaterial({ color: item.band, metalness: 0.5, roughness: 0.35, emissive: item.band, emissiveIntensity: 0.15, side: THREE.DoubleSide }));
        band.scale.z = 0.42;
        band.position.y = -L * 0.62;
        group.add(band);
      }
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      return group;
    };

    const want = Math.round(mix(3, 15, a.load) + mood.density * 2);
    const hung: Garment[] = [];
    for (let i = 0; i < want; i++) {
      const base = wardrobe[i % wardrobe.length];
      hung.push(i < wardrobe.length ? base : { ...base, length: base.length * r(0.9, 1.05) });
    }
    const perHook = new Map<number, number>();
    hung.forEach((item, index) => {
      const small = item.length < 0.65;
      const pegs = small && a.load > 0.15 ? low : hooks;
      const slot = index % pegs.length;
      const key = slot + (pegs === low ? 100 : 0);
      const layer = perHook.get(key) ?? 0;
      perHook.set(key, layer + 1);
      const peg = pegs[slot];
      const angle = peg.angle + layer * r(0.25, 0.5) * (layer % 2 ? 1 : -1);
      const radius = (pegs === low ? 0.15 : 0.19) + layer * 0.075;
      const group = coat(item);
      group.position.set(Math.cos(angle) * radius, Math.min(peg.y + 0.04, 0.12 + item.length + r(0.25, 0.6)) - layer * 0.04, Math.sin(angle) * radius);
      group.rotation.y = -angle + Math.PI / 2 + r(-0.25, 0.25);
      group.rotation.x = -r(0.02, 0.09);
      top.add(group);
    });

    if (a.whose === 'departed') {
      // His overcoat keeps a hook to itself, and his hat sits above it.
      const his = coat({ tint: '#23252b', cloth: 'tweed', length: 1.22, width: 0.47 });
      const angle = Math.PI / 2;
      his.position.set(Math.cos(angle) * (0.28 + a.load * 0.14), H - 0.2, Math.sin(angle) * (0.28 + a.load * 0.14));
      his.rotation.y = -angle + Math.PI / 2;
      top.add(his);
    }

    // Scarves: long flattened tubes drooping from a hook.
    const scarf = (angle: number, colours: string[], length: number, radius: number) => {
      const cx = Math.cos(angle), cz = Math.sin(angle), tx = -cz, tz = cx;
      const stripes = document.createElement('canvas');
      stripes.width = 8; stripes.height = 64;
      const g = stripes.getContext('2d')!;
      for (let i = 0; i < 16; i++) { g.fillStyle = colours[i % colours.length]; g.fillRect(0, i * 4, 8, 4); }
      const map = new THREE.CanvasTexture(stripes);
      map.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      const y = H - 0.34;
      radius *= 0.86;
      // Two flat tails hang either side of the hook, joined by a fold over it.
      [length, length * r(0.6, 0.85)].forEach((tail, index) => {
        const side = index ? 1 : -1;
        const strip = mount(s.box([0.11, tail, 0.02], [cx * radius + tx * side * 0.07, y - tail / 2, cz * radius + tz * side * 0.07], material));
        strip.rotation.y = -angle + Math.PI / 2 + side * 0.25;
        strip.rotation.z = side * 0.05;
        const fringe = mount(s.box([0.11, 0.05, 0.008], [cx * radius + tx * side * 0.09, y - tail - 0.025, cz * radius + tz * side * 0.09], s.material(colours[0])));
        fringe.rotation.y = strip.rotation.y;
      });
      mount(s.box([0.26, 0.06, 0.06], [cx * radius, y + 0.01, cz * radius], material)).rotation.y = -angle + Math.PI / 2;
    };
    const reach = 0.3 + a.load * 0.22;
    if (a.scarves === 'football') scarf(r(0, 6.28), mood.cheer > 0.5 ? ['#c8102e', '#ffffff'] : ['#1d3f8f', '#f2c21b'], 0.95, reach);
    if (a.scarves === 'knitted') { scarf(r(0, 3), ['#c9972a', '#b8871f'], 0.8, reach); scarf(r(3, 6), ['#6b2f55', '#7d3a65'], 0.65, reach); }
    if (a.scarves === 'silk') for (let i = 0; i < 3; i++) scarf(4.2 + i * 0.25, pick([['#d94f6a', '#f3d9a4', '#2e6f8e'], ['#3c9a7a', '#f1e3c0'], ['#e39a2b', '#7a2d4f', '#f6efe0']]), 0.38, reach * 0.9);

    // Carrier bags: lumpy, knotted, hung by stretched handles.
    const bagCount = Math.round(a.bags * 9);
    const plastics = ['#f1f1ec', '#e8762c', '#2d6fb7', '#3c9a52', '#f2d23a', '#d9d9d9'];
    for (let i = 0; i < bagCount; i++) {
      const angle = r(0, Math.PI * 2), radius = reach + r(0.02, 0.1), y = r(0.75, 1.35);
      const plastic = s.material(pick(plastics), { roughness: 0.4, flatShading: true });
      const size = r(0.1, 0.15) * (a.bags > 0.8 ? 1.25 : 1);
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      // A sagging sack gathered to a neck, faceted like crumpled polythene.
      const sack = mount(s.mesh(new THREE.LatheGeometry([[0.02, 0], [0.75, 0.08], [1, 0.5], [0.85, 0.95], [0.45, 1.35], [0.16, 1.62], [0.22, 1.85]].map(([px, py]) => new THREE.Vector2(px * size, py * size)), 7), plastic, [x, y - size, z]));
      sack.rotation.set(r(-0.15, 0.15), r(0, 3), r(-0.15, 0.15));
      sack.scale.z = r(0.6, 0.85);
      mount(s.box([size * 0.9, size * 0.35, 0.004], [x + Math.cos(angle) * size * 0.82, y - size * 0.35, z + Math.sin(angle) * size * 0.82], s.material(pick(['#c8102e', '#1d3f8f', '#2f7a3d', '#e8762c'])))).rotation.y = -angle + Math.PI / 2;
      for (const side of [-0.03, 0.03]) mount(s.rod([x + side, y + size * 0.8, z], [Math.cos(angle) * 0.2, Math.min(H - 0.2, y + size + r(0.3, 0.5)), Math.sin(angle) * 0.2], 0.007, plastic, 0.004));
    }

    // Hats on the crown.
    const felt = (tint: string) => s.material(tint, { roughness: 0.9 });
    const trilby = (y: number, tint: string, tilt = 0) => {
      const hat = new THREE.Group();
      mount(s.cylinder(0.085, 0.095, 0.1, [0, 0.06, 0], felt(tint), 18), hat).scale.z = 1.15;
      mount(s.cylinder(0.16, 0.165, 0.012, [0, 0.008, 0], felt(tint), 22), hat).scale.z = 1.12;
      mount(s.cylinder(0.097, 0.097, 0.025, [0, 0.03, 0], felt('#1a1a1c'), 18), hat).scale.z = 1.15;
      hat.position.y = y; hat.rotation.z = tilt; hat.rotation.y = r(0, 3);
      top.add(hat);
    };
    const flatCap = (at: [number, number, number], tint: string) => {
      const cap = new THREE.Group();
      mount(s.ball([0.115, 0.04, 0.135], [0, 0.03, 0], fabric(tint, 'tweed'), 14), cap);
      mount(s.ball([0.085, 0.012, 0.06], [0, 0.012, 0.12], fabric(tint, 'tweed'), 12), cap);
      cap.position.set(...at); cap.rotation.y = r(0, 6); cap.rotation.x = r(-0.2, 0.2);
      top.add(cap);
    };
    const bobble = (y: number) => {
      const wool = felt(mood.cheer > 0.5 ? '#d8452f' : '#3f5b7a');
      mount(s.ball([0.1, 0.11, 0.1], [0.01, y + 0.06, 0], wool, 14));
      mount(s.cylinder(0.103, 0.103, 0.035, [0.01, y + 0.02, 0], felt('#eee8d8'), 14));
      mount(s.ball([0.04, 0.04, 0.04], [0.02, y + 0.185, 0], felt('#eee8d8'), 10));
    };
    if (a.hats === 'three') { trilby(H + 0.02, '#6b5a45', 0.08); flatCap([0.01, H + 0.13, 0], '#55604a'); bobble(H + 0.19); }
    if (a.hats === 'single') trilby(H + 0.02, '#3b3a3d', -0.12);
    if (a.hats === 'caps') hooks.forEach((hook, i) => { if (i % 2 === 0) flatCap([Math.cos(hook.angle) * 0.17, hook.y + 0.1, Math.sin(hook.angle) * 0.17], pick(['#55604a', '#6b5a45', '#444a55'])); });
    if (a.whose === 'departed' && a.hats !== 'none') flatCap([0, H - 0.02, 0.22], '#33363b');

    // Umbrellas stand in the foot ring, outside the tilt so they stay planted.
    const umbrella = (angle: number, tint: string, lean: number) => {
      const cx = Math.cos(angle), cz = Math.sin(angle);
      const foot: [number, number, number] = [cx * 0.13, 0.03, cz * 0.13];
      const tip: [number, number, number] = [cx * (0.4 + lean + a.load * 0.12), 0.98, cz * (0.4 + lean + a.load * 0.12)];
      const canopy = s.rod(foot, [mix(foot[0], tip[0], 0.8), 0.75, mix(foot[2], tip[2], 0.8)], 0.012, s.material(tint, { roughness: 0.6 }), 0.036);
      void canopy;
      s.rod([mix(foot[0], tip[0], 0.8), 0.75, mix(foot[2], tip[2], 0.8)], tip, 0.008, frame);
      const crook = s.ring(0.04, 0.011, [tip[0] + cx * 0.035, tip[1], tip[2] + cz * 0.035], s.material('#7a4a26'), Math.PI);
      crook.rotation.y = -angle;
    };
    const brollies = { none: 0, one: 1, many: 9 + Math.floor(random() * 4), broken: 3 }[a.umbrellas];
    const shades = a.umbrellas === 'one' ? ['#17181b'] : ['#17181b', '#1d3f6f', '#7a1f2b', '#2f6a44', '#e9d9a8', '#c94f7c', '#24262b'];
    for (let i = 0; i < brollies; i++) umbrella((i / Math.max(brollies, 1)) * Math.PI * 2 + r(-0.2, 0.2) + 0.6, shades[i % shades.length], r(0, 0.14));
    if (a.umbrellas === 'broken') {
      // Blown inside-out: a shallow cone turned upward with ribs poking past the cloth.
      const wreck = new THREE.Group();
      const cloth = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.2, 8, 1, true), new THREE.MeshStandardMaterial({ color: '#1d3f6f', roughness: 0.6, side: THREE.DoubleSide, flatShading: true }));
      cloth.rotation.x = Math.PI;
      cloth.position.y = 0.1;
      wreck.add(cloth);
      for (let i = 0; i < 8; i++) {
        const t = (i / 8) * Math.PI * 2;
        mount(s.rod([0, 0, 0], [Math.cos(t) * 0.5, 0.24 + (i === 3 ? -0.2 : 0), Math.sin(t) * 0.5], 0.004, s.material('#c8ccd0', { metalness: 0.8 })), wreck);
      }
      mount(s.rod([0, 0, 0], [0, -0.55, 0], 0.008, frame), wreck);
      wreck.traverse((node) => { node.castShadow = true; });
      wreck.position.set(0.72, 0.36, 0.3);
      wreck.rotation.set(1.1, r(0, 3), 0.5);
      s.root.add(wreck);
    }

    if (a.stance === 'shed') {
      // The fallen coat: a low crumpled heap with one sleeve thrown out.
      const fallen = wardrobe[1 % wardrobe.length];
      const heap = coat({ ...fallen, length: fallen.length * 0.8 });
      const angle = r(-0.6, 0.6) + Math.PI / 2;
      heap.rotation.set(-Math.PI / 2 + 0.06, 0, r(-0.5, 0.5) - angle + Math.PI / 2, 'YXZ');
      heap.rotation.y = -angle + Math.PI / 2 + r(-0.5, 0.5);
      heap.scale.set(1.15, 0.85, 0.7);
      heap.position.set(Math.cos(angle) * 0.5, 0.07, Math.sin(angle) * 0.5);
      heap.children.forEach((part, index) => { if (index === 1 || index === 2) part.rotation.z *= 7; });
      s.root.add(heap);
    }
    if (a.stance === 'tilting') {
      const way = r(0, Math.PI * 2);
      top.rotation.set(Math.cos(way) * 0.11, 0, Math.sin(way) * 0.11);
    }
    // The pole belongs with the leaning part.
    return s.finish({ footprint: 0.5 });
  },
});
