import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const DRINKS = {
  lemonade: 'Cloudy pale-yellow lemonade with lemon wheels.',
  pink: 'Pink lemonade with strawberries, sweet and girlish.',
  tea: 'Clear amber iced tea with lemon, southern and slow.',
  limeade: 'Green limeade with lime wheels and mint, sharp and cool.',
  sangria: 'Dark red sangria crowded with orange slices: grown-ups, evening, a party.',
  water: 'Plain water with cucumber slices, spa-clean and abstemious.',
} as const;
const LIQUID: Record<keyof typeof DRINKS, string> = { lemonade: '#f2e28a', pink: '#f4a6b4', tea: '#b8691f', limeade: '#b9dc7a', sangria: '#7d1730', water: '#d3e9ec' };
const FRUIT: Record<keyof typeof DRINKS, [string, string]> = {
  lemonade: ['#f3cf2c', '#fbf0a0'], pink: ['#f3cf2c', '#fbf0a0'], tea: ['#f3cf2c', '#fbf0a0'],
  limeade: ['#5d9a2b', '#cfe58a'], sangria: ['#ef8a1c', '#fbc56a'], water: ['#3f7a36', '#d9efc0'],
};
const SIGNS: Record<keyof typeof DRINKS, string> = { lemonade: 'LEMONADE 5¢', pink: 'PINK 10¢', tea: 'ICED TEA', limeade: 'LIMEADE 5¢', sangria: 'SANGRIA', water: 'FREE WATER' };

function sliceTexture(rind: string, flesh: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = rind; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#fbf6dc'; ctx.beginPath(); ctx.arc(64, 64, 55, 0, 7); ctx.fill();
  ctx.fillStyle = flesh;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(i * 0.785 + 0.39) * 8, 64 + Math.sin(i * 0.785 + 0.39) * 8);
    ctx.arc(64, 64, 49, i * 0.785 + 0.07, (i + 1) * 0.785 - 0.07);
    ctx.closePath(); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    drink: choice('What is in the jug?', DRINKS),
    jug: choice('What kind of jug is it?', {
      belly: 'A round-bellied glass pitcher with a pinched spout and a looped handle, the classic.',
      straight: 'A tall straight-sided pitcher, diner or cafeteria.',
      carafe: 'A narrow-necked carafe with no handle, bistro and elegant.',
      mason: 'A big screw-top mason jar with a metal band, homespun and rural.',
    }),
    fill: score('How full is the jug?', ['Only dregs and slices in the bottom', 'A third left', 'Half', 'Just made, full to the brim']),
    glasses: choice('How many tumblers stand beside it?', {
      none: 'None: just the jug.',
      one: 'One glass, a solitary drink.',
      two: 'Two glasses, a pair.',
      four: 'Four glasses, a family or a gathering.',
    }),
    drunk: score('How much has been drunk from the glasses?', ['Poured and untouched', 'A few sips gone', 'Half drunk', 'Drained to the ice']),
    ice: noul('Is it full of ice and beaded with condensation?'),
    scene: choice('What is going on around it?', {
      served: 'Nothing else: freshly set out on the bare surface.',
      tray: 'Served properly on a round tray with striped paper straws in the glasses.',
      stand: 'A child\'s lemonade stand: a hand-lettered price card and a jar of coins.',
      spilled: 'A glass has been knocked over and its drink has pooled out.',
      forgotten: 'Left out too long: wasps on the rims and whole lemons rolling loose.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const glass = new THREE.MeshPhysicalMaterial({ color: '#e4f3f4', transparent: true, opacity: 0.3, roughness: 0.04, depthWrite: false, side: THREE.DoubleSide });
    const solidGlass = new THREE.MeshStandardMaterial({ color: '#c9dfe2', roughness: 0.1 });
    const liquidColour = new THREE.Color(LIQUID[a.drink]).offsetHSL(0, 0, (mood.cheer - 0.5) * 0.06);
    const liquid = new THREE.MeshStandardMaterial({ color: liquidColour, roughness: 0.15, transparent: a.drink === 'water', opacity: a.drink === 'water' ? 0.75 : 1 });
    const [rind, flesh] = FRUIT[a.drink];
    const sliceMap = sliceTexture(rind, flesh);
    const sliceFace = new THREE.MeshStandardMaterial({ map: sliceMap, roughness: 0.5 });
    const sliceRind = new THREE.MeshStandardMaterial({ color: rind, roughness: 0.6 });
    const iceMaterial = new THREE.MeshStandardMaterial({ color: '#f1fbfd', roughness: 0.15 });
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = s.root) => { node.traverse((n) => { n.castShadow = true; }); parent.add(node); return node; };

    const outline = {
      belly: [[0.05, 0], [0.066, 0.012], [0.084, 0.07], [0.082, 0.115], [0.064, 0.17], [0.058, 0.2], [0.066, 0.232]],
      straight: [[0.06, 0], [0.066, 0.01], [0.068, 0.1], [0.07, 0.2], [0.074, 0.245]],
      carafe: [[0.052, 0], [0.068, 0.018], [0.078, 0.085], [0.056, 0.15], [0.036, 0.205], [0.04, 0.235], [0.05, 0.255]],
      mason: [[0.066, 0], [0.074, 0.012], [0.075, 0.1], [0.074, 0.165], [0.056, 0.19], [0.056, 0.22]],
    }[a.jug] as [number, number][];
    const curve = new THREE.SplineCurve(outline.map(([r, y]) => new THREE.Vector2(r, y)));
    const samples = curve.getPoints(40);
    const jugHeight = outline[outline.length - 1][1];
    const radiusAt = (y: number) => {
      for (let i = 1; i < samples.length; i++)
        if (samples[i].y >= y) return mix(samples[i - 1].x, samples[i].x, (y - samples[i - 1].y) / Math.max(1e-5, samples[i].y - samples[i - 1].y));
      return samples[samples.length - 1].x;
    };
    const spoutShape = (geometry: THREE.BufferGeometry, top: number) => {
      if (a.jug === 'mason' || a.jug === 'carafe') return;
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const lift = Math.max(0, (y - (top - 0.05)) / 0.05), aim = Math.max(0, x / Math.max(1e-4, Math.hypot(x, z)));
        pos.setX(i, x + lift * lift * aim ** 6 * 0.028);
      }
      geometry.computeVertexNormals();
    };

    const jug = new THREE.Group();
    const wall = new THREE.LatheGeometry([new THREE.Vector2(0, 0.003), ...samples], 48);
    spoutShape(wall, jugHeight);
    add(new THREE.Mesh(wall, glass), jug);
    add(new THREE.Mesh(new THREE.CylinderGeometry(outline[0][0] + 0.006, outline[0][0], 0.007, 32), solidGlass), jug).position.y = 0.0035;
    const lip = new THREE.TorusGeometry(outline[outline.length - 1][0], 0.0035, 6, 48);
    lip.rotateX(Math.PI / 2);
    lip.translate(0, jugHeight, 0);
    spoutShape(lip, jugHeight + 0.0035);
    add(new THREE.Mesh(lip, solidGlass), jug);
    if (a.jug === 'belly' || a.jug === 'straight') {
      const hx = (y: number) => -radiusAt(y);
      add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(hx(jugHeight * 0.88) + 0.004, jugHeight * 0.88, 0), new THREE.Vector3(hx(jugHeight * 0.85) - 0.045, jugHeight * 0.9, 0),
        new THREE.Vector3(hx(jugHeight * 0.5) - 0.058, jugHeight * 0.6, 0), new THREE.Vector3(hx(jugHeight * 0.3) + 0.004, jugHeight * 0.3, 0),
      ]), 24, 0.008, 8), solidGlass), jug);
    } else if (a.jug === 'mason') {
      const tin = new THREE.MeshStandardMaterial({ color: '#b7b3a6', metalness: 0.7, roughness: 0.4 });
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.059, 0.059, 0.022, 32, 1, true), tin), jug).position.y = 0.208;
      add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.003, 6, 16, Math.PI), tin), jug).position.set(0, 0.2, 0);
    }

    // The drink: the same outline, inset, cut off at the fill level.
    const level = mix(0.03, jugHeight * (a.jug === 'carafe' ? 0.78 : 0.86), a.fill);
    const body: THREE.Vector2[] = [new THREE.Vector2(0, 0.008)];
    for (const p of samples) if (p.y > 0.008 && p.y < level) body.push(new THREE.Vector2(Math.max(0.001, p.x - 0.004), p.y));
    const surface = Math.max(0.001, radiusAt(level) - 0.004);
    body.push(new THREE.Vector2(surface, level), new THREE.Vector2(0, level));
    add(new THREE.Mesh(new THREE.LatheGeometry(body, 40), liquid), jug);

    const slice = (parent: THREE.Object3D, radius = 0.03) => {
      const mesh = add(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.006, 20), [sliceRind, sliceFace, sliceFace]), parent);
      return mesh;
    };
    // Citrus wheels pressed against the glass, where they can be seen.
    const wheels = 3 + Math.floor(a.fill * 4 + mood.density * 2);
    for (let i = 0; i < wheels; i++) {
      const y = mix(0.035, Math.max(0.04, level - 0.03), wheels === 1 ? 0 : i / (wheels - 1)) * mix(0.9, 1.05, random());
      const angle = -0.5 + (i * 2.4 + random() * 0.7);
      const r = Math.max(0.01, radiusAt(y) - 0.0085);
      const wheel = slice(jug, Math.min(0.03, r * 0.5 + 0.012));
      wheel.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      wheel.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.4, 0, 0);
      wheel.rotation.order = 'YXZ';
      wheel.rotation.y = Math.PI / 2 - angle;
    }
    const floaters: THREE.Object3D[] = [];
    if (a.ice) {
      for (let i = 0; i < 7; i++) {
        const angle = random() * 6.28, r = random() * surface * 0.7;
        const cube = add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.022), iceMaterial), jug);
        cube.position.set(Math.cos(angle) * r, level + 0.002, Math.sin(angle) * r);
        cube.rotation.set(random() * 3, random() * 3, random() * 3);
        floaters.push(cube);
      }
    }
    if (a.drink === 'pink') for (let i = 0; i < 5; i++) {
      const angle = random() * 6.28, y = mix(0.04, Math.max(0.045, level - 0.01), random()), r = radiusAt(y) - 0.016;
      const berry = add(new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.024, 10), new THREE.MeshStandardMaterial({ color: '#d42a3a', roughness: 0.5 })), jug);
      berry.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
      berry.rotation.set(Math.PI + random(), 0, random());
    }
    if (a.drink === 'limeade' || a.drink === 'water') for (let i = 0; i < 4; i++) {
      const sprig = add(new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#3f8a3a', roughness: 0.7 })), jug);
      sprig.scale.set(0.014, 0.004, 0.009);
      sprig.position.set((random() - 0.5) * surface, level + 0.006 + random() * 0.012, (random() - 0.5) * surface);
      sprig.rotation.set(random(), random() * 3, random());
    }
    // A wheel hooked on the rim.
    if (a.jug !== 'mason' && a.fill > 0.25) {
      const rimWheel = slice(jug, 0.027);
      const top = outline[outline.length - 1][0];
      rimWheel.position.set(Math.cos(1.1) * top, jugHeight + 0.008, Math.sin(1.1) * top);
      rimWheel.rotation.order = 'YXZ';
      rimWheel.rotation.set(Math.PI / 2, Math.PI - 1.1, 0);
    }
    // Condensation: small opaque beads, thick below the fill line.
    const beads: { at: [number, number, number]; size: number }[] = [];
    const beadCount = Math.round((a.ice ? 190 : 22) * mix(0.6, 1.3, mood.warmth));
    for (let i = 0; i < beadCount; i++) {
      const y = 0.012 + random() ** 1.5 * (level - 0.012), angle = random() * 6.28, r = radiusAt(y) + 0.001;
      beads.push({ at: [Math.cos(angle) * r, y, Math.sin(angle) * r], size: 0.0016 + random() ** 3 * 0.0035 });
    }
    if (beads.length) {
      const dew = s.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.05 }), beads);
      jug.add(dew);
    }
    jug.rotation.y = -0.5 + (random() - 0.5) * 0.4;
    s.root.add(jug);

    // Tumblers.
    const count = { none: 0, one: 1, two: 2, four: 4 }[a.glasses];
    const spots: [number, number][] = [[0.125, 0.06], [0.035, 0.135], [-0.11, 0.1], [0.135, -0.065]];
    const stripes = ['#d8343f', '#2f7fc4', '#e9a51f', '#3b9a5a'];
    for (let i = 0; i < count; i++) {
      const tumbler = new THREE.Group();
      const tipped = a.scene === 'spilled' && i === 0;
      add(new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0.004), new THREE.Vector2(0.029, 0.004), new THREE.Vector2(0.039, 0.105)], 28), glass), tumbler);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.029, 0.008, 24), solidGlass), tumbler).position.y = 0.004;
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0022, 6, 32), solidGlass), tumbler);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.105;
      const left = tipped ? 0 : mix(0.86, 0.1, Math.min(1, Math.max(0, a.drunk + (random() - 0.5) * 0.35)));
      if (left > 0.02) {
        const h = 0.095 * left;
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.028 + h * 0.095, 0.027, h, 24), liquid), tumbler).position.y = 0.008 + h / 2;
        if (a.ice) for (let k = 0; k < 2; k++) {
          const cube = add(new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.017, 0.017), iceMaterial), tumbler);
          cube.position.set((k - 0.5) * 0.02, 0.01 + h, (random() - 0.5) * 0.02);
          cube.rotation.set(random() * 3, random() * 3, 0);
        }
      } else if (a.ice && !tipped) {
        for (let k = 0; k < 3; k++) add(new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.015), iceMaterial), tumbler).position.set((k - 1) * 0.014, 0.016, (random() - 0.5) * 0.02);
      }
      if (a.scene === 'tray' && !tipped) {
        const straw = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.17, 8), new THREE.MeshStandardMaterial({ color: stripes[i % 4], roughness: 0.6 })), tumbler);
        straw.position.set(0.012, 0.088, 0);
        straw.rotation.z = -0.25;
        for (let k = 0; k < 6; k++) {
          const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.012, 8), new THREE.MeshStandardMaterial({ color: '#fbf8ee' })), straw);
          band.position.y = -0.07 + k * 0.028;
        }
      }
      const [x, z] = spots[i];
      tumbler.position.set(x + (random() - 0.5) * 0.02, 0, z + (random() - 0.5) * 0.02);
      if (tipped) {
        tumbler.rotation.set(0, random() * 0.6 - 0.2, -Math.PI / 2 + 0.09);
        tumbler.position.y = 0.039;
        tumbler.position.x += 0.02;
        const pool = new THREE.MeshStandardMaterial({ color: liquidColour, roughness: 0.05, transparent: a.drink === 'water', opacity: a.drink === 'water' ? 0.6 : 1 });
        for (let k = 0; k < 6; k++) {
          const blob = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.002, 20), pool);
          const reach = 0.075 + k * 0.016;
          blob.scale.set(0.035 + random() * 0.04, 1, 0.03 + random() * 0.035);
          blob.position.set(tumbler.position.x + reach + (random() - 0.5) * 0.03, 0.001 + k * 0.0002, tumbler.position.z + (random() - 0.5) * 0.06);
          blob.receiveShadow = true;
          s.root.add(blob);
        }
        if (a.ice) for (let k = 0; k < 3; k++) s.box([0.016, 0.016, 0.016], [tumbler.position.x + 0.09 + k * 0.025, 0.008, tumbler.position.z + (random() - 0.5) * 0.07], iceMaterial).rotation.y = random() * 3;
      }
      s.root.add(tumbler);
    }

    if (a.scene === 'tray') {
      const trayPaint = s.material(mood.cheer > 0.5 ? '#c8463a' : '#6c7a80', { metalness: 0.3, roughness: 0.4 });
      s.cylinder(0.215, 0.21, 0.008, [0.02, -0.004, 0.03], trayPaint, 48);
      const edge = s.ring(0.215, 0.007, [0.02, 0.002, 0.03], trayPaint);
      edge.rotation.x = Math.PI / 2;
    } else if (a.scene === 'stand') {
      const card = s.label(SIGNS[a.drink], 0.22, 0.095, [-0.02, 0.065, -0.115], '#b3262c', '#f6efd8');
      card.rotation.set(-0.28, 0.12, (random() - 0.5) * 0.08);
      s.box([0.22, 0.095, 0.004], [-0.02, 0.06, -0.15], s.material('#b9a37c')).rotation.set(0.3, 0.12, 0);
      const jar = new THREE.Group();
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.08, 20, 1, true), glass), jar).position.y = 0.04;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 20), solidGlass), jar).position.y = 0.003;
      const coin = new THREE.MeshStandardMaterial({ color: '#b98a4a', metalness: 0.8, roughness: 0.35 });
      const coins = 4 + Math.floor(mood.cheer * 14);
      for (let k = 0; k < coins; k++) {
        const c = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 12), coin), jar);
        c.position.set((random() - 0.5) * 0.04, 0.008 + k * 0.0022, (random() - 0.5) * 0.04);
        c.rotation.set((random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5);
      }
      jar.position.set(-0.135, 0, -0.03);
      s.root.add(jar);
    } else if (a.scene === 'forgotten') {
      const peel = new THREE.MeshStandardMaterial({ color: rind, roughness: 0.6 });
      for (let k = 0; k < 3; k++) {
        const lemon = s.ball([0.036, 0.03, 0.03], [-0.09 + k * 0.06 + random() * 0.01, 0.03, 0.2 + random() * 0.03], peel, 16);
        lemon.rotation.y = random() * 3;
      }
      const halved = slice(s.root, 0.03);
      halved.position.set(0.12, 0.004, 0.17);
    }
    const wasps: THREE.Object3D[] = [];
    if (a.scene === 'forgotten') {
      const yellow = new THREE.MeshStandardMaterial({ color: '#e8b81c', roughness: 0.5 }), black = new THREE.MeshStandardMaterial({ color: '#1d1a16', roughness: 0.5 });
      const wing = new THREE.MeshStandardMaterial({ color: '#f4f6f6', roughness: 0.3, side: THREE.DoubleSide });
      for (let k = 0; k < 5; k++) {
        const wasp = new THREE.Group();
        for (let j = 0; j < 4; j++) { const seg = add(new THREE.Mesh(new THREE.SphereGeometry(0.0045 - Math.abs(j - 1.5) * 0.0007, 8, 6), j % 2 ? black : yellow), wasp); seg.position.x = j * 0.005; }
        for (const side of [-1, 1]) { const w = add(new THREE.Mesh(new THREE.CircleGeometry(0.007, 8), wing), wasp); w.scale.set(1, 0.4, 1); w.position.set(0.006, 0.005, side * 0.006); w.rotation.x = side * 1.1; }
        const angle = random() * 6.28, top = outline[outline.length - 1][0];
        if (k < 2) wasp.position.set(Math.cos(angle) * top, jugHeight + 0.007, Math.sin(angle) * top);
        else wasp.position.set(Math.cos(angle) * (top + 0.05 + random() * 0.08), jugHeight * mix(0.5, 1.25, random()), Math.sin(angle) * (top + 0.05 + random() * 0.08));
        wasp.rotation.y = random() * 6.28;
        wasp.scale.setScalar(1.6);
        s.root.add(wasp);
        if (k >= 2) wasps.push(wasp);
      }
    }

    const bob = mix(0.0005, 0.003, mood.energy);
    const origins = wasps.map((wasp) => wasp.position.clone());
    return s.finish({
      update: (_dt, time) => {
        floaters.forEach((cube, i) => { cube.position.y = level + 0.002 + Math.sin(time * 1.7 + i * 1.3) * bob; });
        wasps.forEach((wasp, i) => {
          const speed = 2 + mood.energy * 5;
          wasp.position.set(origins[i].x + Math.sin(time * speed + i * 2) * 0.012, origins[i].y + Math.sin(time * speed * 1.3 + i) * 0.008, origins[i].z + Math.cos(time * speed + i * 2) * 0.012);
        });
      },
    });
  },
});
