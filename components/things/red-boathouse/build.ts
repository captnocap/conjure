import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

const PAINTS = {
  falu: 'Fresh matt falu red with white trim, the postcard colour.',
  oxblood: 'Deep dark oxblood, almost brown in the shade.',
  salmon: 'Sun-bleached salmon pink where old red has chalked away.',
  ochre: 'Ochre yellow, the neighbour who wanted to be different.',
  bare: 'Never painted: silver-grey driftwood-coloured boards.',
  tar: 'Black-brown pine tar, older than paint.',
} as const;
const PAINT: Record<keyof typeof PAINTS, string> = {
  falu: '#a8321f', oxblood: '#6e1f1a', salmon: '#c9806a', ochre: '#c99532', bare: '#9a9790', tar: '#3a2a22',
};

/** One square metre of vertical boards, painted, with gaps and weathering. */
function boards(base: string, wear: number, random: () => number, horizontal = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const colour = new THREE.Color(base);
  const count = 6;
  for (let i = 0; i < count; i++) {
    const shade = colour.clone().offsetHSL(0, (random() - 0.5) * 0.06, (random() - 0.5) * 0.07);
    ctx.fillStyle = `#${shade.getHexString()}`;
    ctx.fillRect((i * 256) / count, 0, 256 / count, 256);
    ctx.fillStyle = 'rgba(20,12,8,0.75)';
    ctx.fillRect((i * 256) / count, 0, 3, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect((i * 256) / count + 3, 0, 2, 256);
  }
  // Peeled paint and salt streaks.
  const patches = Math.round(wear * 70);
  for (let i = 0; i < patches; i++) {
    ctx.fillStyle = random() < 0.6 ? 'rgba(150,146,138,0.55)' : 'rgba(40,30,24,0.35)';
    const w = 6 + random() * 18;
    ctx.fillRect(Math.floor(random() * count) * (256 / count) + 4 + random() * 10, random() * 256, w, 12 + random() * 70);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (horizontal) texture.rotation = Math.PI / 2;
  return texture;
}

function roofTexture(kind: 'turf' | 'slate' | 'tin' | 'pantile', wear: number, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  if (kind === 'turf') {
    ctx.fillStyle = '#5d7a3a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = ['#48642c', '#718f43', '#8a9a4a', '#3d5527', '#a5a85a'][Math.floor(random() * 5)];
      ctx.fillRect(random() * 256, random() * 256, 2 + random() * 3, 4 + random() * 9);
    }
  } else if (kind === 'slate') {
    ctx.fillStyle = '#4b535a';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 6; col++) {
        const shade = 70 + random() * 40;
        ctx.fillStyle = `rgb(${shade},${shade + 8},${shade + 16})`;
        ctx.fillRect(col * 51.2 + (row % 2) * 25.6 + 1.5, row * 32 + 1.5, 48.5, 29.5);
      }
  } else if (kind === 'tin') {
    for (let x = 0; x < 256; x++) {
      const v = 120 + Math.sin((x / 256) * Math.PI * 2 * 10) * 45;
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 8})`;
      ctx.fillRect(x, 0, 1, 256);
    }
    for (let i = 0; i < 20 + wear * 160; i++) {
      ctx.fillStyle = `rgba(${140 + random() * 40},${60 + random() * 30},25,${0.3 + random() * 0.4})`;
      ctx.fillRect(random() * 256, random() * 256, 4 + random() * 14, 10 + random() * 60);
    }
  } else {
    ctx.fillStyle = '#7a3a26';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const tone = new THREE.Color('#b9583a').offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.12);
        ctx.fillStyle = `#${tone.getHexString()}`;
        ctx.beginPath();
        ctx.ellipse(col * 32 + 16, row * 32 + 14, 13, 17, 0, 0, Math.PI * 2);
        ctx.fill();
      }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    paint: choice('What colour are its boards?', PAINTS),
    roof: choice('What is the roof?', {
      turf: 'A thick living turf roof, green and shaggy, held by a log along the eaves.',
      slate: 'Heavy grey slate laid in overlapping courses.',
      tin: 'Corrugated iron sheet, practical and rattling in the wind.',
      pantile: 'Red clay pantiles, a little grand for a boat shed.',
    }),
    size: score('How big is the boathouse?', ['A narrow shed for one rowing boat', 'A family naust', 'A wide double boathouse for a fishing crew']),
    doors: choice('How do the seaward doors stand?', {
      shut: 'Both doors shut and barred: nobody is going out today.',
      ajar: 'One door standing ajar, someone is inside.',
      open: 'Both doors thrown wide with the stern of a boat showing in the dark.',
      gone: 'The doors are gone and the dark interior gapes empty.',
    }),
    slip: choice('What is on the slipway?', {
      empty: 'Nothing: bare wet logs running into the water.',
      boat: 'A small rowing boat hauled halfway up the logs.',
      crates: 'Stacked fish crates and a coil of rope waiting for the boat.',
      nets: 'A net spread to dry, strung with floats.',
    }),
    left: choice('What has been left against the side wall?', {
      nothing: 'Nothing, the wall is bare.',
      oars: 'A pair of long oars leaning under the eaves.',
      buoys: 'A cluster of bright net buoys hung from a nail.',
      barrels: 'Old herring barrels standing in the lee.',
      firewood: 'A neat stack of split birch firewood.',
    }),
    lamp: noul('Is a lamp burning beside the doors?'),
    flag: noul('Does a small pennant fly from the gable?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const W = mix(3.2, 6.4, a.size) * mix(0.94, 1.06, random());
    const L = mix(5.5, 9, a.size) * mix(0.94, 1.06, random());
    const H = mix(2.1, 2.7, a.size);
    const rise = W * (a.roof === 'turf' ? 0.28 : 0.34);
    const base = 0.55; // floor height above the shore, on stone
    const sag = wear * 0.12;

    const wallTexture = boards(PAINT[a.paint], wear, random);
    const wall = new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.9 });
    const trimColour = a.paint === 'bare' || a.paint === 'tar' ? '#6f6a62' : '#eee9dc';
    const trim = s.material(trimColour, { roughness: 0.8 });
    const dark = s.material('#15120f', { roughness: 1 });
    const timber = s.material('#6d5a48', { roughness: 0.95 });
    const wet = s.material('#3f372f', { roughness: 0.55 });
    const stone = s.material('#8d8d88', { roughness: 0.95 });

    const panel = (points: [number, number][], material: THREE.Material) => {
      const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
      return s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false }), material);
    };

    // Door opening in the seaward gable.
    const doorW = Math.min(W - 0.9, mix(2.1, 3.6, a.size));
    const doorH = H - 0.15;
    const gable: [number, number][] = [[-W / 2, 0], [W / 2, 0], [W / 2, H], [0, H + rise], [-W / 2, H]];
    const back = panel(gable, wall);
    back.position.set(0, base, -L / 2);
    const frontShape = new THREE.Shape(gable.map(([x, y]) => new THREE.Vector2(x, y)));
    const hole = new THREE.Path([[-doorW / 2, 0.02], [doorW / 2, 0.02], [doorW / 2, doorH], [-doorW / 2, doorH]].map(([x, y]) => new THREE.Vector2(x, y)));
    frontShape.holes.push(hole);
    s.mesh(new THREE.ExtrudeGeometry(frontShape, { depth: 0.1, bevelEnabled: false }), wall, [0, base, L / 2 - 0.1]);
    for (const side of [-1, 1]) {
      const sideWall = panel([[-L / 2, 0], [L / 2, 0], [L / 2, H], [-L / 2, H]], wall);
      sideWall.rotation.y = Math.PI / 2;
      sideWall.position.set(side * W / 2 - (side > 0 ? 0.1 : 0), base, 0);
      // Corner boards.
      for (const end of [-1, 1]) s.box([0.14, H, 0.14], [side * (W / 2 - 0.02), base + H / 2, end * (L / 2 - 0.02)], trim);
    }
    // The dark inside, so open doors show depth and not the far wall's paint.
    s.box([W - 0.3, H - 0.1, L - 0.4], [0, base + H / 2, 0], dark);
    s.box([W, 0.12, L], [0, base - 0.04, 0], timber);

    // Dry-stone footings: piers of rounded stones, taller toward the water.
    const stones: { at: [number, number, number]; size: number; color: string }[] = [];
    const greys = ['#8e8e89', '#a09f98', '#77797a', '#8a8378', '#6c6f6e'];
    const rows = Math.round(L / 0.55);
    for (const side of [-1, 1])
      for (let i = 0; i <= rows; i++)
        for (let layer = 0; layer < 2; layer++)
          stones.push({ at: [side * (W / 2 - 0.1) + (random() - 0.5) * 0.12, 0.14 + layer * 0.24, -L / 2 + (i / rows) * L + (random() - 0.5) * 0.1], size: 0.2 + random() * 0.1, color: greys[Math.floor(random() * greys.length)] });
    for (let i = 0; i <= Math.round(W / 0.5); i++)
      for (const end of [-1, 1])
        for (let layer = 0; layer < 2; layer++)
          stones.push({ at: [-W / 2 + i * 0.5 + (random() - 0.5) * 0.1, 0.14 + layer * 0.24, end * (L / 2 - 0.1)], size: 0.2 + random() * 0.1, color: greys[Math.floor(random() * greys.length)] });
    // Shore boulders under the slipway head.
    for (let i = 0; i < 26; i++) stones.push({ at: [(random() - 0.5) * (doorW + 1.2), 0.05 + random() * 0.12, L / 2 + 0.3 + random() * 2.6], size: 0.18 + random() * 0.2, color: greys[Math.floor(random() * greys.length)] });
    const rock = new THREE.IcosahedronGeometry(1, 1);
    rock.scale(1, 0.72, 1);
    s.scatter(rock, new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), stones);

    // Roof: two slopes with an overhang, bargeboards on the gables.
    const slope = Math.atan2(rise, W / 2);
    const over = 0.35;
    const run = Math.hypot(W / 2, rise) + over;
    const thick = a.roof === 'turf' ? 0.3 : 0.09;
    const roofTex = roofTexture(a.roof, wear, random);
    roofTex.repeat.set((L + 0.8) / (a.roof === 'tin' ? 2 : 1.6), run / 1.6);
    const roofColour = { turf: mix(0.55, 1, mood.cheer), slate: 1, tin: 1, pantile: 1 }[a.roof];
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, color: new THREE.Color().setScalar(roofColour), roughness: a.roof === 'tin' ? 0.5 : 0.95, metalness: a.roof === 'tin' ? 0.45 : 0 });
    if (a.roof === 'turf' && mood.cheer < 0.35) roofMat.color.set('#c9b98a');
    for (const side of [-1, 1]) {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(run, thick, L + 0.8), [dark, dark, roofMat, dark, dark, dark].map((m, index) => (index === 2 ? roofMat : a.roof === 'turf' ? s.material('#4a3a2a') : m)));
      // The top face's u runs along x; turn the texture so courses run along the ridge.
      slab.castShadow = slab.receiveShadow = true;
      const mid = run / 2 - over;
      slab.position.set(side * (W / 2 - Math.cos(slope) * (run / 2 - over)) , base + H + Math.sin(slope) * (run / 2 - over) + thick / 2 - sag * 0.5, 0);
      void mid;
      slab.rotation.z = -side * slope;
      s.root.add(slab);
      // Bargeboards.
      for (const end of [-1, 1]) {
        const board = s.box([run, 0.2, 0.05], [slab.position.x, slab.position.y - 0.02, end * (L / 2 + 0.41)], trim);
        board.rotation.z = -side * slope;
      }
      if (a.roof === 'turf') {
        // The turf log along the eaves and its wooden hooks.
        const ex = side * (W / 2 + Math.cos(slope) * over), ey = base + H - Math.sin(slope) * over + thick;
        s.rod([ex, ey, -L / 2 - 0.4], [ex, ey, L / 2 + 0.4], 0.09, timber);
      }
    }
    roofTex.rotation = Math.PI / 2;
    const ridgeY = base + H + rise + thick - sag * 0.5;
    if (a.roof !== 'turf') s.rod([0, ridgeY + 0.02, -L / 2 - 0.42], [0, ridgeY + 0.02, L / 2 + 0.42], 0.07, a.roof === 'pantile' ? s.material('#8f4630') : s.material('#3c4348'));
    if (a.roof === 'turf') {
      // Shaggy grass and the odd flower standing on the roof.
      const blades: { at: [number, number, number]; size: number; color: string }[] = [];
      const greens = mood.cheer < 0.35 ? ['#b3a36c', '#9c9160', '#c7b98a'] : ['#6f9340', '#56782f', '#8aa64a', '#a9b060'];
      for (let i = 0; i < 260; i++) {
        const u = random() * (run - 0.2), side = random() < 0.5 ? -1 : 1;
        const x = side * (W / 2 + Math.cos(slope) * over - Math.cos(slope) * u);
        const y = base + H - Math.sin(slope) * over + Math.sin(slope) * u + thick + 0.05;
        const flower = mood.cheer > 0.6 && random() < 0.1;
        blades.push({ at: [x, y, (random() - 0.5) * (L + 0.6)], size: flower ? 0.1 : 0.12 + random() * 0.16, color: flower ? ['#f3e25a', '#ffffff', '#d98ad0'][Math.floor(random() * 3)] : greens[Math.floor(random() * greens.length)] });
      }
      s.scatter(new THREE.ConeGeometry(0.35, 1.3, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), blades);
    }

    // Doors: boards with a diagonal brace, hung on the outside.
    const doorMat = new THREE.MeshStandardMaterial({ map: boards(a.paint === 'bare' || a.paint === 'tar' ? PAINT[a.paint] : new THREE.Color(PAINT[a.paint]).offsetHSL(0, 0, -0.05).getStyle(), wear, random), roughness: 0.9 });
    doorMat.map!.repeat.set(doorW / 2, doorH);
    if (a.doors !== 'gone') {
      const angles = { shut: [0, 0], ajar: [0, mix(0.5, 1.1, random())], open: [mix(1.5, 1.9, random()), mix(1.5, 1.9, random())] }[a.doors];
      for (const [index, side] of [-1, 1].entries()) {
        const leaf = new THREE.Group();
        const slabDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2 - 0.02, doorH - 0.04, 0.06), doorMat);
        slabDoor.position.set(-side * (doorW / 4), doorH / 2, 0.03);
        const brace = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(doorW / 2, doorH) * 0.92, 0.12, 0.03), trim);
        brace.position.set(-side * (doorW / 4), doorH / 2, 0.075);
        brace.rotation.z = side * Math.atan2(doorH, doorW / 2);
        for (const y of [0.25, doorH - 0.3]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2 - 0.06, 0.12, 0.03), trim);
          rail.position.set(-side * (doorW / 4), y, 0.075);
          leaf.add(rail);
        }
        leaf.add(slabDoor, brace);
        leaf.position.set(side * (doorW / 2), base + 0.02, L / 2);
        leaf.rotation.y = side * angles[index] + (wear > 0.6 ? side * 0.05 : 0);
        leaf.rotation.z = -side * wear * 0.03 * index;
        leaf.traverse((node) => { node.castShadow = node.receiveShadow = true; });
        s.root.add(leaf);
      }
      if (a.doors === 'shut') s.box([doorW * 0.8, 0.1, 0.06], [0, base + doorH * 0.5, L / 2 + 0.12], timber);
    }
    // Door frame.
    s.box([doorW + 0.3, 0.14, 0.06], [0, base + doorH + 0.07, L / 2 + 0.03], trim);
    for (const side of [-1, 1]) s.box([0.12, doorH, 0.06], [side * (doorW / 2 + 0.07), base + doorH / 2, L / 2 + 0.03], trim);

    // A small boat: used inside the open doors and on the slipway.
    const boat = (length: number, colour: string) => {
      const group = new THREE.Group();
      const hullGeometry = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
      const hull = new THREE.Mesh(hullGeometry, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.8, side: THREE.DoubleSide }));
      hull.scale.set(length * 0.19, length * 0.11, length / 2);
      hull.position.y = length * 0.11;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 28), trim);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(length * 0.19, length / 2, 1);
      rim.position.y = length * 0.11;
      group.add(hull, rim);
      for (const z of [-0.22, 0.05, 0.3]) {
        const thwart = new THREE.Mesh(new THREE.BoxGeometry(length * 0.36 * Math.sqrt(1 - (z * 2) ** 2), 0.03, 0.2), timber);
        thwart.position.set(0, length * 0.085, z * length);
        group.add(thwart);
      }
      group.traverse((node) => { node.castShadow = node.receiveShadow = true; });
      s.root.add(group);
      return group;
    };
    if (a.doors === 'open') boat(Math.min(L - 1.2, 4.6), '#e8e2d2').position.set(0, base + 0.05, L / 2 - Math.min(L - 1.2, 4.6) / 2 + 0.5);

    // Slipway: two rails and cross logs, running down past the shoreline.
    const slipL = mix(4.2, 6, a.size);
    const railGap = Math.min(doorW * 0.36, 0.9);
    const z0 = L / 2 + 0.1, z1 = L / 2 + slipL, y0 = base - 0.02, y1 = -0.12;
    for (const side of [-1, 1]) s.rod([side * railGap, y0, z0], [side * railGap, y1, z1], 0.09, timber, 0.075);
    const logs = Math.round(slipL / 0.62);
    for (let i = 0; i < logs; i++) {
      const t = (i + 0.5) / logs;
      if (wear > 0.7 && random() < 0.2) continue;
      const skew = (random() - 0.5) * 0.12 * (1 + wear);
      s.rod([-railGap - 0.3, mix(y0, y1, t) + 0.12, mix(z0, z1, t) + skew], [railGap + 0.3, mix(y0, y1, t) + 0.12, mix(z0, z1, t) - skew], 0.065, t > 0.6 ? wet : timber);
    }
    const slipAt = (t: number, lift = 0): [number, number, number] => [0, mix(y0, y1, t) + 0.19 + lift, mix(z0, z1, t)];
    const slipPitch = Math.atan2(y0 - y1, slipL);
    if (a.slip === 'boat') {
      const hauled = boat(Math.min(3.8, slipL * 0.75), ['#e9e4d6', '#2f5d6b', '#3d6b3a', '#c9a23a'][Math.floor(random() * 4)]);
      hauled.position.set(...slipAt(0.5));
      hauled.rotation.x = slipPitch;
      hauled.rotation.z = (random() - 0.5) * 0.25;
    } else if (a.slip === 'crates') {
      const crateColours = ['#3f7fb5', '#d9772b', '#e4d9b8', '#3d8a5f'];
      const stacks = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < stacks; i++) {
        const x = (i - (stacks - 1) / 2) * 0.72 + (random() - 0.5) * 0.1;
        const high = 1 + Math.floor(random() * (1 + mood.density * 3));
        for (let j = 0; j < high; j++) {
          const crate = s.box([0.6, 0.3, 0.42], [x * 0.9, base + 0.32 + j * 0.31 - 0.3, L / 2 + 0.9 + (random() - 0.5) * 0.2 + Math.abs(x) * 0.5], s.material(crateColours[Math.floor(random() * crateColours.length)]));
          crate.rotation.y = (random() - 0.5) * 0.3;
        }
      }
      s.ring(0.28, 0.07, [railGap + 0.75, 0.18, L / 2 + 1.7], s.material('#c8b98f')).rotation.x = Math.PI / 2;
    } else if (a.slip === 'nets') {
      const net = new THREE.Mesh(new THREE.PlaneGeometry(railGap * 2 + 1, slipL * 0.6, 10, 10), new THREE.MeshStandardMaterial({ color: '#3d6a5c', roughness: 1, wireframe: true }));
      const solid = new THREE.Mesh(new THREE.PlaneGeometry(railGap * 2 + 1, slipL * 0.6, 10, 10), new THREE.MeshStandardMaterial({ color: '#4f7f70', roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
      for (const mesh of [net, solid]) {
        const position = mesh.geometry.attributes.position;
        for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 4 + position.getY(i) * 3) * 0.04);
        mesh.rotation.x = -Math.PI / 2 + slipPitch;
        mesh.position.set(...slipAt(0.42, 0.06));
        s.root.add(mesh);
      }
      const floats: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < 9; i++) floats.push({ at: [-railGap - 0.5 + (i / 8) * (railGap * 2 + 1), slipAt(0.13)[1] + 0.08, slipAt(0.13)[2] + (random() - 0.5) * 0.1], size: 0.09, color: i % 2 ? '#e8742a' : '#f0e9d6' });
      s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), floats);
    }

    // The lee wall: what the family leaves out.
    const wx = W / 2 + 0.12;
    if (a.left === 'oars') {
      for (let i = 0; i < 2; i++) {
        const z = L * 0.1 + i * 0.35;
        s.rod([wx + 0.75, 0, z], [wx + 0.05, base + H - 0.05, z - 0.2], 0.028, s.material('#c9ad7e'));
        const blade = s.box([0.03, 0.75, 0.15], [wx + 0.11, base + H - 0.38, z - 0.17], s.material('#c9ad7e'));
        blade.rotation.z = 0.28;
      }
    } else if (a.left === 'buoys') {
      const colours = ['#e8572a', '#f2c230', '#e9e4d2', '#d8336b', '#2f7fc2'];
      const count = 4 + Math.round(mood.density * 6);
      for (let i = 0; i < count; i++) {
        const z = L * 0.15 + (random() - 0.5) * 1.2, y = base + 0.5 + random() * 1.3;
        s.ball([0.16, 0.2, 0.16], [wx + 0.14, y, z], s.material(colours[Math.floor(random() * colours.length)]), 12);
        s.rod([wx + 0.02, base + H - 0.3, L * 0.15], [wx + 0.14, y + 0.18, z], 0.012, s.material('#c8b98f'));
      }
    } else if (a.left === 'barrels') {
      const count = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < count; i++) {
        const z = -L * 0.2 + i * 0.78 + (random() - 0.5) * 0.1;
        const barrel = s.lathe([[0.26, 0], [0.33, 0.25], [0.35, 0.45], [0.33, 0.65], [0.26, 0.9], [0, 0.9]], s.material('#7a5a3a'), [wx + 0.45 + (random() - 0.5) * 0.15, 0, z]);
        void barrel;
        for (const y of [0.14, 0.76]) s.ring(0.31, 0.015, [wx + 0.45, y, z], s.material('#2b2b2b', { metalness: 0.5 })).rotation.x = Math.PI / 2;
      }
    } else if (a.left === 'firewood') {
      const logsPile: { at: [number, number, number]; size: number; color: string }[] = [];
      const tiers = 3 + Math.round(mood.density * 4);
      for (let row = 0; row < tiers; row++)
        for (let i = 0; i < 12; i++) logsPile.push({ at: [wx + 0.25, 0.1 + row * 0.19, -L * 0.3 + i * 0.2 + (row % 2) * 0.1], size: 0.09 + random() * 0.02, color: ['#e8dcc0', '#d9c8a4', '#f2ece0', '#b99c72'][Math.floor(random() * 4)] });
      const log = new THREE.CylinderGeometry(1, 1, 4.5, 7);
      log.rotateZ(Math.PI / 2);
      s.scatter(log, new THREE.MeshStandardMaterial({ roughness: 0.9 }), logsPile);
    }

    // A small window in the other wall, white-framed.
    s.box([0.06, 0.75, 0.95], [-W / 2 - 0.02, base + H * 0.58, L * 0.12], trim);
    const dusk = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const litInside = a.lamp || a.doors === 'ajar';
    s.box([0.07, 0.56, 0.76], [-W / 2 - 0.03, base + H * 0.58, L * 0.12], s.material(litInside ? '#f3c66a' : '#27333a', { emissive: litInside ? '#f2b04a' : '#000000', emissiveIntensity: litInside ? mix(0.5, 1.6, dusk) : 0, roughness: 0.3 }));
    s.box([0.08, 0.56, 0.05], [-W / 2 - 0.035, base + H * 0.58, L * 0.12], trim);
    s.box([0.08, 0.05, 0.76], [-W / 2 - 0.035, base + H * 0.58, L * 0.12], trim);

    if (a.lamp) {
      const lx = doorW / 2 + 0.38, ly = base + doorH * 0.8;
      s.rod([lx, ly + 0.2, L / 2], [lx, ly + 0.2, L / 2 + 0.3], 0.02, dark);
      s.cylinder(0.1, 0.16, 0.08, [lx, ly + 0.13, L / 2 + 0.3], dark, 10);
      s.ball([0.09, 0.11, 0.09], [lx, ly + 0.02, L / 2 + 0.3], s.material('#ffe2a0', { emissive: '#ffbf55', emissiveIntensity: mix(1.2, 3, dusk) }), 10);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffc866', transparent: true, opacity: mix(0.08, 0.22, dusk), depthWrite: false }));
      halo.position.set(lx, ly + 0.02, L / 2 + 0.3);
      s.root.add(halo);
    }
    let pennant: THREE.Mesh | null = null;
    if (a.flag) {
      s.rod([0, base + H + rise - 0.3, L / 2 + 0.1], [0, base + H + rise + 1.5, L / 2 + 0.1], 0.025, trim);
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.95, 0.14), new THREE.Vector2(0, 0.3)]);
      pennant = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.4 ? '#c8202f' : '#5a5f66', side: THREE.DoubleSide, roughness: 0.8 }));
      pennant.position.set(0, base + H + rise + 1.15, L / 2 + 0.1);
      pennant.castShadow = true;
      s.root.add(pennant);
    }
    // A snow drift in the lee when the mood is cold.
    if (mood.warmth < 0.25) {
      const snow = s.material('#f1f4f6', { roughness: 1 });
      s.ball([W * 0.5, 0.35, 0.9], [0, 0.05, -L / 2 - 0.4], snow, 14);
      for (const side of [-1, 1]) {
        s.ball([0.3, 0.2, L * 0.3], [side * (W / 2 + 0.2), 0.03, -L * 0.15], snow, 14);
        // Snow lying on the roof, slid a little down from the ridge.
        const cover = run * 0.72;
        const cap = s.box([cover, 0.1, L + 0.7], [side * (Math.cos(slope) * (cover / 2 + 0.05)), base + H + rise - Math.sin(slope) * (cover / 2 + 0.05) + thick + 0.05, 0], snow);
        cap.rotation.z = -side * slope;
      }
    }

    const speed = mix(0.6, 5, mood.energy);
    return s.finish({
      footprint: Math.max(W, L) * 0.62,
      update: (_dt, time) => { if (pennant) pennant.rotation.y = -0.5 + Math.sin(time * speed) * 0.35 * mix(0.2, 1, mood.energy); },
    });
  },
});
