import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Item { at: P3; yaw?: number; tilt?: number; scale?: P3 | number; color?: THREE.ColorRepresentation }

export default defineThing({
  questions: {
    kind: choice('What kind of lanterns are they?', {
      lotus: 'Paper lotus flowers, a ring of pointed petals cupped around a candle.',
      box: 'Square paper box lanterns on little wooden floats, glowing through their sides.',
      boat: 'Folded paper boats, each carrying a stub of candle.',
      mixed: 'All kinds together, whatever people brought.',
    }),
    count: score('How many are there?', ['Three or four', 'A dozen', 'Thirty', 'A whole river of them']),
    colour: choice('What colours are they?', {
      pink: 'Lotus pink with pale hearts.',
      white: 'Plain white, for mourning.',
      red: 'Red and gold, festive.',
      rainbow: 'Every colour: pink, yellow, green, blue, orange.',
    }),
    burning: score('How many are still alight?', ['Almost all gone dark', 'Half of them', 'Nearly every one']),
    drift: choice('How are they moving?', {
      line: 'Strung out in a long thin line by the current.',
      raft: 'Bunched close together, turning slowly as one.',
      scattered: 'Spread wide and far apart, each alone.',
      eddy: 'Caught in a slow eddy, circling in a spiral.',
    }),
    snag: choice('What has the stray one caught on?', {
      reeds: 'A stand of reeds at the edge.',
      rock: 'A wet mossy rock.',
      branch: 'A half-sunk branch.',
      none: 'Nothing: they all run free.',
    }),
    flotsam: choice('What else floats among them?', {
      none: 'Only the lanterns.',
      petals: 'Loose flower petals.',
      paper: 'Squares of gold spirit paper.',
      leaves: 'Fallen leaves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const night = clamp01(Math.abs(mood.daylight - 0.5) * 2);
    const glow = mix(0.7, 1.6, night);

    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const batch = (geometry: THREE.BufferGeometry, material: THREE.Material, items: Item[], shadow = true) => {
      if (!items.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      items.forEach((it, i) => {
        e.set(it.tilt ?? 0, it.yaw ?? 0, 0, 'YXZ'); q.setFromEuler(e);
        if (typeof it.scale === 'number' || it.scale === undefined) sc.setScalar(it.scale ?? 1); else sc.set(...it.scale);
        mesh.setMatrixAt(i, matrix.compose(v.set(...it.at), q, sc));
        if (it.color !== undefined) mesh.setColorAt(i, new THREE.Color(it.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = shadow;
      s.root.add(mesh);
      return mesh;
    };

    // Where they float. The current runs toward +x.
    const total = Math.round(mix(3, 34, Math.pow(a.count, 1.4)) * mix(0.85, 1.15, mood.density)) + (a.count > 0.9 ? 8 : 0);
    const size = 0.62;
    const spots: [number, number][] = [];
    const gap = a.drift === 'raft' ? 0.72 : 0.85;
    const reach = { line: [1.6 + total * 0.16, 0.5], raft: [0.5 + Math.sqrt(total) * 0.3, 0.5 + Math.sqrt(total) * 0.26], scattered: [1.6 + Math.sqrt(total) * 0.62, 1.1 + Math.sqrt(total) * 0.36], eddy: [1 + Math.sqrt(total) * 0.42, 1 + Math.sqrt(total) * 0.42] }[a.drift];
    for (let k = 0; k < total; k++) {
      for (let attempt = 0; attempt < 60; attempt++) {
        let x: number, z: number;
        if (a.drift === 'line') { x = (random() * 2 - 1) * reach[0]; z = Math.sin(x * 0.7) * 0.35 + (random() - 0.5) * reach[1] * (1 + attempt * 0.05); }
        else if (a.drift === 'eddy') { const t = (k + random() * 0.6) / total; const th = t * 12.5, r = 0.35 + t * reach[0] * (1 + attempt * 0.01); x = Math.cos(th) * r; z = Math.sin(th) * r; }
        else { const th = random() * 6.28, r = Math.sqrt(random()) * (1 + attempt * 0.02); x = Math.cos(th) * r * reach[0]; z = Math.sin(th) * r * reach[1]; }
        if (spots.every(([px, pz]) => Math.hypot(px - x, pz - z) > gap)) { spots.push([x, z]); break; }
      }
    }
    let maxX = 1.5, maxZ = 1;
    for (const [x, z] of spots) { maxX = Math.max(maxX, Math.abs(x)); maxZ = Math.max(maxZ, Math.abs(z)); }
    const wx = maxX + 1.0, wz = maxZ + (a.snag === 'none' ? 0.9 : 1.4);

    const waterTone = new THREE.Color('#4c8876').lerp(new THREE.Color('#263f47'), night * 0.6).lerp(new THREE.Color('#7b8062'), mood.wear * 0.2);
    const water = s.cylinder(1, 1, 0.06, [0, 0.03, 0], new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.16, metalness: 0.3 }), 56);
    water.scale.set(wx, 1, wz);
    const top = 0.06;

    const PALETTES: Record<string, string[]> = {
      pink: ['#f28fb0', '#f7b6c9', '#e9648f', '#fbd3dc'], white: ['#f6f3ea', '#ecebe4', '#fbfaf5'], red: ['#d8322a', '#e85a2c', '#e9b23a', '#c8261f'],
      rainbow: ['#f28fb0', '#f4cf4a', '#7cc36a', '#62a8dc', '#f08a3c', '#b68ad6'],
    };
    const palette = PALETTES[a.colour];
    const pick = () => palette[Math.floor(random() * palette.length)];

    // Geometry shared by every lantern of a kind.
    const petal = new THREE.BufferGeometry();
    petal.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, -0.16, 0.14, 0.34, 0, 0.36, 0.5, 0, 0, 0.12, 0, 0.36, 0.5, 0.16, 0.14, 0.34, 0, 0, 0.12, 0.16, 0.14, 0.34, -0.16, 0.14, 0.34], 3));
    petal.computeVertexNormals();
    const boat = new THREE.BufferGeometry();
    boat.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.5, 0.22, 0, 0, 0, 0.17, 0.5, 0.22, 0, -0.5, 0.22, 0, 0.5, 0.22, 0, 0, 0, -0.17, -0.5, 0.22, 0, 0, 0, -0.17, 0, 0, 0.17, 0.5, 0.22, 0, 0, 0, 0.17, 0, 0, -0.17,
      -0.2, 0.1, 0, 0, 0.42, 0, 0.2, 0.1, 0,
    ], 3));
    boat.computeVertexNormals();

    const litPaper = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff8a3a', emissiveIntensity: 0.32 * glow, roughness: 0.85, side: THREE.DoubleSide, flatShading: true });
    const darkPaper = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide, flatShading: true });
    const boxLit = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const petalsLit: Item[] = [], petalsDark: Item[] = [], boxesLit: Item[] = [], boxesDark: Item[] = [], boatsLit: Item[] = [], boatsDark: Item[] = [];
    const floats: Item[] = [], frames: Item[] = [], flames: Item[] = [], wicks: Item[] = [], pools: Item[] = [], wakes: Item[] = [], pads: Item[] = [];
    const flameAt: P3[] = [];

    const lantern = (x: number, z: number, snagged: boolean) => {
      const kind = a.kind === 'mixed' ? (['lotus', 'lotus', 'box', 'boat'] as const)[Math.floor(random() * 4)] : a.kind;
      const lit = !snagged ? random() < mix(0.12, 0.96, a.burning) : random() < 0.5;
      const sunk = !lit && random() < 0.25 + mood.wear * 0.5;
      const tilt = sunk ? mix(0.25, 0.6, random()) : snagged ? 0.3 : (random() - 0.5) * 0.08;
      const yaw = random() * 6.28;
      const y = top + (sunk ? -0.05 : 0.01);
      const scale = size * mix(0.85, 1.15, random());
      const dim = (c: string) => (lit ? new THREE.Color(c) : new THREE.Color(c).lerp(new THREE.Color('#5a5f5c'), 0.5).multiplyScalar(sunk ? 0.6 : 0.85));
      const base = pick();
      if (kind === 'lotus') {
        pads.push({ at: [x, y, z], scale: [scale * 0.42, scale * 0.3, scale * 0.42], color: dim('#5c8a4a') });
        const rings: [number, number, number, string][] = [[9, 0.55, 1.0, base], [7, 0.15, 0.72, base], [5, -0.15, 0.5, '#fbe7b0']];
        rings.forEach(([n, open, sz, col], ring) => {
          for (let k = 0; k < n; k++) (lit ? petalsLit : petalsDark).push({ at: [x, y + 0.01 + ring * 0.012, z], yaw: yaw + (k / n) * 6.283 + ring * 0.4, tilt: tilt * Math.cos(yaw + k) + open + (sunk ? 0.3 : 0), scale: scale * sz, color: dim(col).offsetHSL(0, 0, (random() - 0.5) * 0.06) });
        });
      } else if (kind === 'box') {
        floats.push({ at: [x, y + 0.012, z], yaw, tilt, scale: [scale * 0.95, 0.03, scale * 0.95], color: '#8a6a45' });
        const h = scale * 0.8;
        (lit ? boxesLit : boxesDark).push({ at: [x, y + 0.03 + h / 2, z], yaw, tilt, scale: [scale * 0.6, h, scale * 0.6], color: lit ? new THREE.Color(base).lerp(new THREE.Color('#ffe9b0'), 0.45) : dim(base) });
        for (const dy of [0.03, 0.03 + h]) frames.push({ at: [x, y + dy, z], yaw, tilt, scale: [scale * 0.64, 0.018, scale * 0.64], color: dy > 0.05 ? '#7a5a3a' : '#3a2c20' });
        wicks.push({ at: [x, y + 0.03 + h + 0.03, z], scale: [0.02, 0.07, 0.02], color: '#3a2c20' });
      } else {
        (lit ? boatsLit : boatsDark).push({ at: [x, y, z], yaw, tilt, scale: scale * 1.15, color: dim(a.colour === 'pink' ? '#fbe9ee' : base) });
      }
      if (kind !== 'box') wicks.push({ at: [x, y + 0.06 * scale / size, z], scale: [0.03, 0.09, 0.03], color: '#efe9d6' });
      if (lit) {
        const fy = y + (kind === 'box' ? scale * 0.45 : 0.15);
        if (kind !== 'box') { flames.push({ at: [x, fy, z], scale: [0.035, 0.07, 0.035] }); flameAt.push([x, fy, z]); }
        pools.push({ at: [x, top + 0.004, z], scale: [scale * mix(1.15, 1.6, night), 1, scale * mix(1.15, 1.6, night)], color: kind === 'box' ? new THREE.Color(base).lerp(new THREE.Color('#ffc070'), 0.6) : '#ffb060' });
      }
      if (!snagged) wakes.push({ at: [x - scale * 1.1, top + 0.003, z], scale: [scale * mix(0.8, 1.6, mood.energy), 0.004, 0.012] });
    };
    spots.forEach(([x, z]) => lantern(x, z, false));

    // The one that got caught.
    const side = random() < 0.5 ? -1 : 1;
    const cx = (random() - 0.3) * wx * 0.7, cz = side * (wz - 0.75);
    if (a.snag !== 'none') {
      lantern(cx - 0.3, cz - side * 0.12, true);
      if (a.snag === 'reeds') {
        const reed = s.material('#6f8f4a'), head = s.material('#5a3d26');
        const nReeds = 14 + Math.round(mood.density * 12);
        for (let k = 0; k < nReeds; k++) {
          const x = cx + (random() - 0.5) * 1.6, z = cz + side * random() * 0.5, hgt = mix(0.9, 1.9, random()), lean = (random() - 0.5) * 0.5;
          s.rod([x, top, z], [x + lean, top + hgt, z + (random() - 0.5) * 0.2], 0.014, reed, 0.006);
          if (random() < 0.4) s.rod([x + lean * 0.8, top + hgt * 0.8, z], [x + lean * 0.95, top + hgt * 0.95, z], 0.035, head);
        }
      } else if (a.snag === 'rock') {
        s.mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshStandardMaterial({ color: '#7d837c', roughness: 1, flatShading: true }), [cx + 0.25, top + 0.1, cz + side * 0.2]).rotation.set(random(), random(), random());
        s.mesh(new THREE.DodecahedronGeometry(0.4, 0), new THREE.MeshStandardMaterial({ color: '#5f8545', roughness: 1, flatShading: true }), [cx + 0.25, top + 0.38, cz + side * 0.2]).scale.y = 0.45;
        s.mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#7d837c', roughness: 1, flatShading: true }), [cx + 0.95, top + 0.03, cz + side * 0.1]);
      } else {
        const bark = s.material('#4a382a');
        s.tube([[cx - 1.2, top - 0.02, cz + side * 0.3], [cx - 0.3, top + 0.12, cz + side * 0.1], [cx + 0.5, top + 0.3, cz], [cx + 1.3, top + 0.75, cz - side * 0.1]], 0.06, bark);
        s.rod([cx + 0.3, top + 0.22, cz], [cx + 0.6, top + 0.7, cz - side * 0.45], 0.03, bark, 0.01);
        s.rod([cx + 0.9, top + 0.5, cz], [cx + 1.0, top + 0.95, cz + side * 0.3], 0.025, bark, 0.008);
      }
    }

    batch(new THREE.CylinderGeometry(1, 0.8, 0.14, 12), darkPaper, pads);
    batch(petal, litPaper, petalsLit);
    batch(petal, darkPaper, petalsDark);
    batch(new THREE.BoxGeometry(1, 1, 1), boxLit, boxesLit);
    batch(new THREE.BoxGeometry(1, 1, 1), darkPaper, boxesDark);
    batch(new THREE.BoxGeometry(1, 1, 1), darkPaper, floats);
    batch(new THREE.BoxGeometry(1, 1, 1), darkPaper, frames);
    batch(boat, litPaper, boatsLit);
    batch(boat, darkPaper, boatsDark);
    batch(new THREE.CylinderGeometry(1, 1, 1, 6), darkPaper, wicks);
    const flameMesh = batch(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe08a' }), flames, false);
    batch(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: mix(0.3, 0.5, night), depthWrite: false }), pools, false);
    batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: waterTone.clone().lerp(new THREE.Color('#ffffff'), 0.4), transparent: true, opacity: 0.55, depthWrite: false }), wakes, false);

    if (a.flotsam !== 'none') {
      const bits: Item[] = [];
      const tones = { petals: ['#f6a9bf', '#fbe3e8', '#e9648f'], paper: ['#e2b93a', '#d19a26', '#f0d470'], leaves: ['#b9862e', '#8a6a2a', '#a1431f'] }[a.flotsam];
      for (let k = 0; k < 24 + mood.density * 36; k++) {
        const th = random() * 6.28, r = Math.sqrt(random()) * 0.94;
        bits.push({ at: [Math.cos(th) * r * wx, top + 0.004, Math.sin(th) * r * wz], yaw: random() * 6.28, scale: a.flotsam === 'paper' ? [0.11, 0.004, 0.11] : [0.1, 0.004, 0.05], color: tones[Math.floor(random() * tones.length)] });
      }
      batch(a.flotsam === 'paper' ? new THREE.BoxGeometry(1, 1, 1) : new THREE.SphereGeometry(0.6, 6, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, metalness: a.flotsam === 'paper' ? 0.5 : 0 }), bits);
    }
    // Current lines on the water.
    const lines: Item[] = [];
    for (let k = 0; k < 14; k++) { const th = random() * 6.28, r = Math.sqrt(random()) * 0.8; lines.push({ at: [Math.cos(th) * r * wx, top + 0.002, Math.sin(th) * r * wz], scale: [mix(0.5, 1.6, random()), 0.003, 0.012] }); }
    batch(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: waterTone.clone().lerp(new THREE.Color('#ffffff'), 0.3), transparent: true, opacity: 0.4, depthWrite: false }), lines, false);

    const speed = mix(2, 9, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        if (!flameMesh) return;
        flameAt.forEach((p, i) => {
          const f = 1 + Math.sin(time * speed + i * 2.3) * 0.18 * (0.4 + mood.energy);
          flameMesh.setMatrixAt(i, matrix.compose(v.set(p[0], p[1], p[2]), q.identity(), sc.set(0.035, 0.07 * f, 0.035)));
        });
        flameMesh.instanceMatrix.needsUpdate = true;
      },
    });
  },
});
