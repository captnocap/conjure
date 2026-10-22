import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    era: choice('What kind of sledge is it?', {
      heroic: 'A heroic-age wooden sledge: long ash runners curving up to a bow, lashed with rawhide, loaded with canvas and stencilled crates.',
      pulk: 'A modern expedition pulk: a bright moulded tub with a zipped cover, rigid hauling poles and a hip harness.',
      komatik: 'A northern komatik: heavy plank runners, lashed cross slats and tall handles at the back, hides over the load.',
    }),
    load: choice('What is it carrying?', {
      light: 'Almost nothing now: a bag or two on a nearly bare deck.',
      crates: 'Provision crates in a neat row, stencilled PEMMICAN and BISCUIT.',
      camp: 'A whole camp: tent roll, sleeping bags, stove box, fuel tins, skis strapped on top.',
      rocks: 'Sacks of rock specimens, far too heavy, that nobody would leave behind.',
      overloaded: 'A tottering double-decked mountain of everything.',
    }),
    hauling: choice('What lies in the snow ahead of it?', {
      men: 'Man-hauling traces ending in empty canvas harnesses.',
      dogs: 'A fan of dog traces, and huskies curled asleep at the ends of them.',
      cut: 'Short frayed ends of rope. Whatever pulled it is gone.',
    }),
    state: choice('What has happened here?', {
      journey: 'Mid-journey, a short halt: everything lashed tight, runner tracks stretching behind.',
      camped: 'Camped for the night: skis and poles planted upright in the snow beside it.',
      abandoned: 'Abandoned: tipped on one runner, drifted over, a crate spilled open.',
      cairn: 'The last camp: a snow cairn stands beside it with a cross made of skis.',
    }),
    flag: choice('What flag does it carry?', {
      none: 'No flag.',
      pennant: 'A long red silk sledging pennant.',
      black: 'A plain black marker flag, the kind left to say someone was here first.',
      striped: 'A small tattered striped national flag.',
      cross: 'A blue flag with a white cross.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const g = new Sculpture(context);
    s.root.add(g.root);
    const { mood, random } = context;
    const snow = s.material('#f3f7fa', { roughness: 1 });
    const rope = g.material('#9c8458', { roughness: 1 });
    const ash = g.material('#b98d55');
    const darkWood = g.material('#6d4d30');
    const iron = g.material('#3a3d40', { metalness: 0.5 });
    const canvasWhite = g.material('#d9d1b8', { roughness: 1 });
    const canvasGreen = g.material('#5f6f4a', { roughness: 1 });
    const modern = a.era === 'pulk';
    const palette = modern ? ['#e6462e', '#f2a516', '#2f6fb0', '#22252a'] : ['#8c6a43', '#a9824f', '#77593a', '#93744c'];

    const DECK = a.era === 'komatik' ? 0.3 : modern ? 0.1 : 0.24, HALF = a.era === 'komatik' ? 0.36 : modern ? 0.27 : 0.27;
    const LENGTH = a.era === 'komatik' ? 3.6 : modern ? 1.9 : 3.3;
    const Z0 = -LENGTH / 2 + 0.2, Z1 = LENGTH / 2 - (modern ? 0.25 : 0.55);

    const strip = (line: [number, number][], thick: number, width: number, material: THREE.Material, x: number) => {
      const shape = new THREE.Shape();
      line.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
      for (let i = line.length - 1; i >= 0; i--) shape.lineTo(line[i][0] - (i > line.length - 4 ? thick * 0.6 : 0), line[i][1] + thick);
      return g.mesh(new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false }).translate(0, 0, -width / 2).rotateY(-Math.PI / 2), material, [x, 0, 0]);
    };

    if (a.era === 'heroic') {
      const curve: [number, number][] = [[-LENGTH / 2, 0.03], [-LENGTH / 2 + 0.15, 0], [LENGTH / 2 - 0.55, 0]];
      for (let i = 1; i <= 6; i++) { const t = i / 6 * 1.25; curve.push([LENGTH / 2 - 0.55 + Math.sin(t) * 0.5, (1 - Math.cos(t)) * 0.5]); }
      const tip = curve[curve.length - 1];
      for (const x of [-HALF, HALF]) {
        strip(curve, 0.028, 0.085, ash, x);
        for (let i = 0; i < 5; i++) { const z = Z0 + 0.1 + i * (Z1 - Z0 - 0.2) / 4; g.box([0.035, DECK - 0.03, 0.05], [x, DECK / 2 + 0.01, z], ash); }
        g.rod([x, DECK, -LENGTH / 2 + 0.15], [x, DECK, Z1 + 0.05], 0.018, ash);
        g.rod([x, DECK, Z1 + 0.05], [x * 0.92, tip[1] + 0.03, tip[0] - 0.02], 0.016, ash);
      }
      for (let i = 0; i < 5; i++) { const z = Z0 + 0.1 + i * (Z1 - Z0 - 0.2) / 4; g.box([HALF * 2 + 0.06, 0.025, 0.06], [0, DECK - 0.02, z], ash); }
      for (let i = 0; i < 9; i++) g.box([0.045, 0.012, Z1 - Z0 + 0.1], [-HALF + 0.07 + i * (HALF * 2 - 0.14) / 8, DECK, (Z0 + Z1) / 2], g.material('#c9a56d'));
      g.tube([[-HALF, tip[1] + 0.03, tip[0]], [-HALF * 0.6, tip[1] + 0.05, tip[0] + 0.14], [HALF * 0.6, tip[1] + 0.05, tip[0] + 0.14], [HALF, tip[1] + 0.03, tip[0]]], 0.018, ash);
    } else if (a.era === 'komatik') {
      const side: [number, number][] = [[-LENGTH / 2, 0], [LENGTH / 2 - 0.5, 0], [LENGTH / 2, 0.22]];
      for (const x of [-HALF, HALF]) {
        const plank = strip(side, DECK - 0.03, 0.06, darkWood, x);
        plank.castShadow = true;
        g.box([0.07, 0.015, LENGTH - 0.5], [x, 0.004, -0.25], g.material('#e6eef2', { metalness: 0.3, roughness: 0.3 }));
        const post = g.rod([x, DECK - 0.05, -LENGTH / 2 + 0.25], [x, 1.05, -LENGTH / 2 - 0.05], 0.028, ash);
        post.castShadow = true;
      }
      g.rod([-HALF - 0.05, 1.03, -LENGTH / 2 - 0.045], [HALF + 0.05, 1.03, -LENGTH / 2 - 0.045], 0.025, ash);
      g.rod([-HALF, 0.68, -LENGTH / 2 + 0.06], [HALF, 0.68, -LENGTH / 2 + 0.06], 0.018, ash);
      const slats = 15;
      for (let i = 0; i < slats; i++) {
        const z = -LENGTH / 2 + 0.2 + i * (LENGTH - 0.75) / (slats - 1);
        g.box([HALF * 2 + 0.18, 0.03, 0.11], [0, DECK - 0.015, z], i % 2 ? ash : g.material('#a57c48'));
        for (const x of [-HALF, HALF]) g.box([0.075, 0.05, 0.02], [x, DECK - 0.03, z], rope);
      }
    } else {
      const hull = g.mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), g.material(palette[0], { roughness: 0.35 }), [0, 0.2, 0]);
      hull.scale.set(HALF + 0.04, 0.2, LENGTH / 2);
      const lip = g.ring(1, 0.035, [0, 0.2, 0], g.material('#b83220', { roughness: 0.4 }));
      lip.rotation.x = Math.PI / 2;
      lip.scale.set(HALF + 0.04, LENGTH / 2, 0.6);
    }

    // Stowage: each item rests on whatever is already under it.
    const tops = new Array<number>(40).fill(DECK);
    // A cell belongs to an item only when its centre lies under it, so neighbours never stack by accident.
    const cells = (z0: number, z1: number) => {
      const width = (Z1 - Z0) / 40, from = Math.max(0, Math.ceil((z0 - Z0) / width - 0.5)), to = Math.min(39, Math.floor((z1 - Z0) / width - 0.5));
      return Array.from({ length: Math.max(0, to - from + 1) }, (_unused, i) => from + i);
    };
    const topAt = (z0: number, z1: number) => Math.max(DECK, ...cells(z0, z1).map((i) => tops[i]));
    const cover = (z0: number, z1: number, top: number) => { for (const i of cells(z0, z1)) tops[i] = Math.max(tops[i], top); };
    const stencils = ['PEMMICAN', 'BISCUIT', 'COCOA', 'PARAFFIN', 'TEA', 'SUGAR', 'OATS'];
    let labels = 0;
    type Kind = 'crate' | 'roll' | 'bag' | 'tins' | 'rocks' | 'stove';
    const stow = (kind: Kind, z0: number, length: number) => {
      const z1 = Math.min(Z1, z0 + length), mid = (z0 + z1) / 2, run = z1 - z0, base = topAt(z0, z1);
      const jitter = (random() - 0.5) * 0.04;
      let height = 0.25;
      if (kind === 'crate') {
        height = modern ? 0.24 : 0.24 + random() * 0.1;
        const tone = palette[Math.floor(random() * palette.length)];
        const box = g.box([HALF * 2 - 0.04, height, run - 0.03], [jitter, base + height / 2, mid], g.material(tone, { roughness: modern ? 0.45 : 0.9 }));
        box.rotation.y = (random() - 0.5) * 0.05;
        if (!modern) {
          for (const z of [-run / 2 + 0.05, run / 2 - 0.05]) g.box([HALF * 2 - 0.02, height + 0.012, 0.035], [jitter, base + height / 2, mid + z], darkWood);
          if (labels++ < 5) for (const side of [-1, 1]) {
            const plate = g.label(a.load === 'rocks' ? 'SPECIMENS' : stencils[Math.floor(random() * stencils.length)], Math.min(0.42, run - 0.14), 0.11, [jitter + side * (HALF - 0.017), base + height / 2, mid], '#2c241b', tone);
            plate.rotation.y = side * Math.PI / 2;
          }
        } else g.box([HALF * 2 - 0.02, 0.03, run - 0.01], [jitter, base + height, mid], g.material('#22252a'));
      } else if (kind === 'roll') {
        const radius = 0.12 + random() * 0.035;
        height = radius * 1.9;
        const fur = g.material(modern ? palette[Math.floor(random() * 3)] : random() < 0.5 ? '#6f5034' : '#8a7a5c', { roughness: 1 });
        g.cylinder(radius, radius, HALF * 2 + 0.06, [0, base + radius, mid], fur, 14).rotation.z = Math.PI / 2;
        for (const x of [-0.14, 0.14]) { const band = g.ring(radius + 0.005, 0.012, [x, base + radius, mid], rope); band.rotation.y = Math.PI / 2; }
      } else if (kind === 'bag') {
        height = 0.2 + random() * 0.08;
        g.ball([HALF - 0.03, height * 0.6, run / 2], [jitter, base + height * 0.5, mid], modern ? g.material(palette[1 + Math.floor(random() * 2)], { roughness: 0.8 }) : canvasWhite, 12);
        g.ball([0.05, 0.05, 0.05], [jitter + 0.1, base + height * 0.95, mid + run * 0.3], canvasWhite, 8);
      } else if (kind === 'tins') {
        height = 0.3;
        const red = g.material(modern ? '#f2a516' : '#b3382c', { metalness: 0.4, roughness: 0.5 });
        for (const x of [-0.125, 0.125]) {
          g.box([0.22, 0.28, Math.min(0.22, run - 0.02)], [x, base + 0.14, mid], red);
          g.cylinder(0.025, 0.025, 0.04, [x + 0.05, base + 0.3, mid + 0.04], iron, 8);
        }
      } else if (kind === 'rocks') {
        height = 0.26;
        g.ball([HALF - 0.02, 0.17, run / 2], [0, base + 0.12, mid], canvasWhite, 12);
        const stone = new THREE.DodecahedronGeometry(1, 0);
        g.scatter(stone, g.material('#6c6f72', { flatShading: true, roughness: 0.9 }), Array.from({ length: 7 }, () => ({ at: [(random() - 0.5) * 0.36, base + 0.24 + random() * 0.05, mid + (random() - 0.5) * run * 0.7] as P, size: 0.05 + random() * 0.045, color: ['#6c6f72', '#8a7f72', '#4f5560', '#7d6a55'][Math.floor(random() * 4)] })));
        height = 0.32;
      } else {
        height = 0.2;
        g.box([0.36, 0.2, Math.min(0.3, run)], [jitter, base + 0.1, mid], g.material(modern ? '#2f6fb0' : '#3f5a48'));
        g.box([0.06, 0.02, 0.14], [jitter, base + 0.21, mid], iron);
      }
      cover(z0, z1, base + height);
    };
    const plans: Record<typeof a.load, Kind[][]> = {
      light: [['bag', 'tins']],
      crates: [['crate', 'crate', 'crate', 'crate', 'crate', 'tins']],
      camp: [['crate', 'roll', 'roll', 'bag', 'stove', 'tins', 'roll']],
      rocks: [['crate', 'rocks', 'rocks', 'crate', 'rocks', 'bag']],
      overloaded: [['crate', 'crate', 'tins', 'crate', 'crate', 'crate'], ['roll', 'bag', 'crate', 'roll', 'bag', 'roll']],
    };
    const lengths: Record<Kind, number> = { crate: 0.52, roll: 0.3, bag: 0.48, tins: 0.26, rocks: 0.5, stove: 0.34 };
    plans[a.load].forEach((layer, level) => {
      const total = layer.reduce((sum, kind) => sum + lengths[kind], 0);
      const room = Z1 - Z0 - level * 0.5;
      const squeeze = Math.min(1, room / total);
      let z = a.load === 'light' ? Z0 + 0.15 : Z0 + level * 0.25 + Math.max(0, room - total) * 0.5;
      const fits = modern ? layer.slice(0, Math.max(2, Math.ceil(layer.length * 0.6))) : layer;
      const scale = modern ? Math.min(1, room / fits.reduce((sum, kind) => sum + lengths[kind], 0)) : squeeze;
      for (const kind of fits) { stow(kind, z, lengths[kind] * scale); z += lengths[kind] * scale; }
    });
    const loadTop = Math.max(...tops);

    // A tent roll and skis ride lengthwise on top of a camp load.
    const long = (a.load === 'camp' || a.load === 'overloaded') && !modern;
    if (long) {
      const lz = Z1 - Z0 - 0.5;
      g.cylinder(0.11, 0.11, lz, [-0.1, loadTop + 0.1, (Z0 + Z1) / 2], canvasGreen, 12).rotation.x = Math.PI / 2;
      for (const x of [-0.15, -0.05]) g.rod([x, loadTop + 0.12, Z0 + 0.05], [x, loadTop + 0.12, Z1 + 0.05], 0.014, ash);
      cover(Z0, Z1, loadTop + 0.2);
    }
    if (modern) {
      const shell = g.mesh(new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), g.material(palette[2], { roughness: 0.8 }), [0, 0.2, -0.05]);
      shell.scale.set(HALF, Math.max(0.1, loadTop - 0.05) * (a.load === 'light' ? 0.45 : 1), LENGTH / 2 - 0.12);
      g.box([0.02, 0.012, LENGTH - 0.6], [0, 0.2 + Math.max(0.1, loadTop - 0.05) * (a.load === 'light' ? 0.45 : 1), -0.05], g.material('#f2f2ee'));
    }
    const strapped = !(a.state === 'camped' || a.state === 'cairn');
    const skiTop = Math.max(...tops) + (modern ? 0.12 : 0.03);
    const ski = (sculpture: Sculpture, from: P, to: P) => sculpture.rod(from, to, 0.028, sculpture.material(modern ? '#1d6fb8' : '#9a7444'), 0.016);
    if (strapped && (a.load === 'camp' || a.load === 'overloaded' || modern)) {
      for (const x of [0.08, 0.17]) { const blade = ski(g, [x, skiTop, -LENGTH * 0.3], [x, skiTop + 0.02, LENGTH * 0.28]); blade.scale.set(1.6, 1, 0.35); }
      g.rod([0.24, skiTop - 0.02, -LENGTH * 0.25], [0.22, skiTop - 0.02, LENGTH * 0.2], 0.009, iron);
    }
    // Lashings over the load.
    if (!modern) for (let z = Z0 + 0.22; z < Z1 - 0.05; z += 0.42) {
      const top = topAt(z - 0.07, z + 0.07);
      if (top <= DECK + 0.05) continue;
      g.tube([[-HALF - 0.02, DECK - 0.02, z], [-HALF - 0.015, top - 0.03, z], [-HALF * 0.5, top + 0.012, z], [HALF * 0.5, top + 0.012, z], [HALF + 0.015, top - 0.03, z], [HALF + 0.02, DECK - 0.02, z]], 0.008, rope).castShadow = false;
    } else for (const z of [-0.5, 0, 0.45]) {
      const band = g.ring(1, 0.014, [0, 0.2, z], g.material('#22252a'), Math.PI);
      band.scale.set(HALF + 0.01, Math.max(0.1, loadTop - 0.04) * Math.sqrt(1 - (z / (LENGTH / 2 - 0.1)) ** 2) * (a.load === 'light' ? 0.45 : 1), 1);
    }

    // Flag on a bamboo at the stern.
    if (a.flag !== 'none') {
      const height = modern ? 1.3 : 1.9;
      g.rod([HALF - 0.04, DECK, Z0 + 0.1], [HALF - 0.04, height, Z0 + 0.02], 0.014, g.material('#c9a85e'));
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const c = canvas.getContext('2d')!;
      if (a.flag === 'pennant') { c.fillStyle = '#c62b2b'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#f2ead6'; c.fillRect(0, 0, 30, 64); c.fillStyle = '#c62b2b'; c.fillRect(12, 0, 6, 64); c.fillRect(0, 29, 30, 6); }
      else if (a.flag === 'black') { c.fillStyle = '#15171a'; c.fillRect(0, 0, 128, 64); }
      else if (a.flag === 'striped') { ['#b72a2a', '#f1ece0', '#27477f'].forEach((tone, i) => { c.fillStyle = tone; c.fillRect(0, i * 22, 128, 22); }); }
      else { c.fillStyle = '#2b5fa8'; c.fillRect(0, 0, 128, 64); c.fillStyle = '#f4f1e6'; c.fillRect(34, 0, 14, 64); c.fillRect(0, 25, 128, 14); }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const wide = a.flag === 'pennant' ? 0.75 : 0.5, tall = a.flag === 'pennant' ? 0.22 : 0.32;
      const cloth = new THREE.PlaneGeometry(wide, tall, 10, 2).translate(wide / 2, 0, 0);
      const at = cloth.getAttribute('position');
      const tatter = mood.wear;
      for (let i = 0; i < at.count; i++) {
        const u = at.getX(i) / wide;
        at.setZ(i, Math.sin(u * 7 + random() * 0.3) * 0.05 * u);
        at.setY(i, at.getY(i) - u * u * mix(0.02, 0.16, 1 - mood.energy) + (u > 0.9 ? (random() - 0.5) * tatter * 0.1 : 0));
        if (a.flag === 'pennant') at.setY(i, at.getY(i) * (1 - u * 0.75));
      }
      cloth.computeVertexNormals();
      const flag = g.mesh(cloth, new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.9 }), [HALF - 0.04, height - tall / 2 - 0.02, Z0 + 0.02]);
      flag.rotation.y = -Math.PI / 2 + 0.3;
    }

    // Snow settling on the load with wear and abandonment.
    const buried = a.state === 'abandoned' ? 1 : a.state === 'cairn' ? 0.6 : mood.wear * 0.5;
    if (buried > 0.45) for (let z = Z0 + 0.3; z < Z1; z += 0.62) {
      const top = topAt(z - 0.2, z + 0.2);
      g.ball([HALF * mix(0.5, 0.8, random()), 0.02 + buried * 0.025, 0.2], [(random() - 0.5) * 0.1, top + 0.01, z], snow, 10);
    }

    // Hauling gear ahead of the bow.
    const bow: P = [0, modern ? 0.2 : a.era === 'komatik' ? 0.18 : 0.3, LENGTH / 2 - (modern ? 0.02 : 0.1)];
    const reach = a.hauling === 'cut' ? 0.55 : modern ? 1.5 : 1.9;
    const lines = a.hauling === 'dogs' ? 3 + Math.round(mood.density * 3) : a.hauling === 'men' ? (modern ? 1 : 2 + Math.round(mood.density * 2)) : 2;
    const harness = s.material(modern ? '#22252a' : '#d8cfb4', { roughness: 1 });
    const fronts: P[] = [];
    for (let i = 0; i < lines; i++) {
      const fan = lines === 1 ? 0 : (i / (lines - 1) - 0.5) * (a.hauling === 'dogs' ? 1.5 : 0.9);
      const far = reach * mix(0.8, 1.05, random());
      const end: P = [Math.sin(fan) * far + (random() - 0.5) * 0.2, 0.02, bow[2] + Math.cos(fan) * far];
      const sag = (t: number): P => [bow[0] + (end[0] - bow[0]) * t + Math.sin(t * 9 + i) * 0.06 * (a.state === 'journey' ? 0.4 : 1), Math.max(0.015, bow[1] * (1 - t * 2.5)), bow[2] + (end[2] - bow[2]) * t];
      if (modern && a.hauling === 'men') {
        for (const x of [-0.16, 0.16]) s.rod([x, 0.18, bow[2] - 0.1], [x * 1.2, 0.05, end[2]], 0.014, s.material('#c9cdd0', { metalness: 0.6, roughness: 0.3 }));
        const belt = s.ring(0.19, 0.03, [0, 0.03, end[2] + 0.12], harness);
        belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.75, 1.6);
      } else {
        s.tube([sag(0), sag(0.2), sag(0.45), sag(0.7), sag(1)], 0.012, rope).castShadow = false;
        if (a.hauling === 'men') {
          const loop = s.ring(0.2, 0.03, [end[0], 0.025, end[2] + 0.18], harness);
          loop.rotation.set(Math.PI / 2, 0, random() * 3); loop.scale.set(1, 0.7 + random() * 0.4, 1);
          s.rod([end[0], 0.03, end[2]], [end[0] + (random() - 0.5) * 0.2, 0.03, end[2] + 0.36], 0.018, harness);
        }
      }
      fronts.push(end);
    }
    if (a.hauling === 'dogs') {
      const coats = ['#8d949b', '#3c3f45', '#c9c2b3', '#7a6a58'];
      fronts.forEach((end, i) => {
        if (i % 2 && fronts.length > 4 && random() < 0.4) return;
        const d = new Sculpture(context);
        const coat = d.material(coats[Math.floor(random() * coats.length)], { roughness: 1 });
        const pale = d.material('#e9e6dc', { roughness: 1 });
        d.ball([0.3, 0.17, 0.24], [0, 0.14, 0], coat, 14);
        d.ball([0.11, 0.1, 0.13], [0.2, 0.13, 0.17], coat, 10);
        d.ball([0.05, 0.045, 0.08], [0.13, 0.1, 0.27], pale, 8);
        for (const x of [0.15, 0.25]) d.mesh(new THREE.ConeGeometry(0.035, 0.08, 4), coat, [x, 0.25, 0.15]);
        const tail = d.ring(0.2, 0.055, [0.02, 0.1, 0.05], pale, Math.PI * 0.8);
        tail.rotation.set(Math.PI / 2, 0, 2.6);
        d.root.position.set(end[0], 0, end[2] + 0.25);
        d.root.rotation.y = random() * 6.283;
        s.root.add(d.root);
      });
    }

    // What the halt has become.
    const besideX = HALF + 0.75;
    if (a.state === 'camped') {
      const stand = new Sculpture(context);
      for (const [x, tilt] of [[0, 0.06], [0.14, -0.05]] as const) { const blade = ski(stand, [x, -0.1, 0], [x + tilt, 1.85, tilt]); blade.scale.set(1.6, 1, 0.35); }
      for (const x of [0.4, 0.52]) { stand.rod([x, -0.05, 0.1], [x + 0.03, 1.3, 0.12], 0.009, iron); stand.ring(0.045, 0.006, [x, 0.12, 0.1], iron).rotation.x = Math.PI / 2; }
      stand.root.position.set(besideX - 0.2, 0, -0.5);
      s.root.add(stand.root);
      s.cylinder(0.05, 0.04, 0.09, [besideX - 0.1, 0.045, 0.5], s.material('#e9e6dc', { metalness: 0.3 }), 10);
    } else if (a.state === 'cairn') {
      const cx = -(HALF + 1.15);
      for (let i = 0; i < 6; i++) { const r = 0.62 - i * 0.085; s.cylinder(r - 0.06, r, 0.27, [cx, 0.135 + i * 0.26, -0.3], snow, 7 + (i % 2)).rotation.y = random(); }
      const blade = ski(s, [cx, 1.45, -0.3], [cx, 2.75, -0.3]); blade.scale.set(1.6, 1, 0.35);
      const cross = ski(s, [cx - 0.45, 2.3, -0.3], [cx + 0.45, 2.3, -0.3]); cross.scale.set(0.35, 1, 1.6);
    } else if (a.state === 'abandoned') {
      g.root.rotation.z = -0.24;
      g.root.position.set(0.1, -0.04, 0);
      s.ball([0.8, 0.3, 1.5], [0.6, 0, -0.3], snow, 14);
      s.ball([0.5, 0.2, 0.7], [-0.5, 0, 0.9], snow, 12);
      const spill = new Sculpture(context);
      spill.box([0.5, 0.3, 0.46], [0, 0.15, 0], spill.material(palette[0]));
      spill.box([0.44, 0.02, 0.4], [0, 0.29, 0], spill.material('#2a211a'));
      spill.box([0.5, 0.02, 0.46], [0.32, 0.05, 0.1], spill.material(palette[1])).rotation.z = 0.2;
      for (let i = 0; i < 5; i++) spill.cylinder(0.05, 0.05, 0.12, [0.2 + random() * 0.5, 0.05, -0.3 + random() * 0.7], spill.material('#b9b0a0', { metalness: 0.5 }), 10).rotation.set(Math.PI / 2, 0, random() * 3);
      spill.root.position.set(-(HALF + 0.75), 0, -0.4);
      spill.root.rotation.set(0.1, 0.5, -0.12);
      s.root.add(spill.root);
    } else {
      const groove = new THREE.MeshStandardMaterial({ color: '#b9cddb', roughness: 1 });
      for (const x of [-HALF, HALF]) s.box([0.09, 0.012, 1.5], [x, 0.004, -LENGTH / 2 - 0.7], groove).castShadow = false;
    }

    // Snow underfoot with wind-cut ridges.
    const shape = new THREE.Shape();
    const front = bow[2] + reach + 0.75, back = -LENGTH / 2 - (a.state === 'journey' ? 1.5 : 0.5), sideways = Math.max(1.5, a.state === 'cairn' ? HALF + 2.0 : besideX + 0.6);
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * 6.283, wobble = 0.93 + random() * 0.12;
      const x = Math.cos(angle) * sideways * wobble, z = (front + back) / 2 + Math.sin(angle) * (front - back) / 2 * wobble;
      if (i === 0) shape.moveTo(x, -z); else shape.lineTo(x, -z);
    }
    const field = s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2), s.material('#dfe9f1', { roughness: 0.95, flatShading: true }), [0, -0.12, 0]);
    field.castShadow = false;
    for (let i = 0; i < 6; i++) {
      const drift = s.ball([0.5 + random() * 0.5, 0.035 + random() * 0.04, 0.12 + random() * 0.1], [(random() < 0.5 ? -1 : 1) * (0.7 + random() * (sideways - 1.3) * 0.6), 0, back + 0.6 + random() * (front - back - 1.2)], snow, 10);
      drift.rotation.y = 0.5;
    }
    // A long thing reads best three-quarter on, so it sits at an angle to its own front.
    s.root.rotation.y = -0.85;
    s.root.updateMatrixWorld(true);
    const thing = s.finish();
    const centre = new THREE.Box3().setFromObject(s.root).getCenter(new THREE.Vector3());
    s.root.position.x -= centre.x; s.root.position.z -= centre.z;
    return thing;
  },
});
