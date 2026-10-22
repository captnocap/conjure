import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    gathering: choice('How are the filaments arranged?', {
      single: 'One strand drifting in a long lazy arch.',
      mat: 'A tangled mat of many strands, the scum on a summer ditch.',
      ladder: 'Two strands lying side by side, joined rung by rung into a ladder as they mate.',
      forest: 'Upright strands rising from one holdfast like a stand of glass trees or kelp.',
      coil: 'One long strand wound into a loose coil, like dropped ribbon.',
    }),
    spirals: choice('How does the green ribbon wind inside each cell?', {
      loose: 'One ribbon in a slow open spiral.',
      double: 'Two ribbons crossing each other like a twisted ladder.',
      tight: 'A tightly wound spring, many turns per cell.',
    }),
    health: choice('What condition is it in?', {
      lush: 'Flourishing: saturated emerald ribbons in glass-clear cells.',
      yellowing: 'Tired: the ribbons thinning and going yellow-green.',
      bleached: 'Dying: the ribbons have collapsed into dark clots in cloudy cells.',
      spores: 'Finished for the year: each cell holds one brown oval resting spore.',
    }),
    bubbles: score('How many oxygen bubbles are caught in it?', ['None', 'A few beads', 'Strung with bubbles', 'Frothing with them']),
    cells: score('How long are the cells?', ['Short and boxy, like a row of windows', 'Twice as long as wide', 'Long glass tubes']),
    passengers: choice('What has settled on it?', {
      none: 'Nothing; it is clean.',
      diatoms: 'Little amber boat-shaped diatoms stuck along it.',
      bells: 'Tiny stalked bell animals waving from its sides.',
      fuzz: 'A brown fuzz of bacteria and silt.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.2;
    const cellRatio = mix(1.7, 5.2, a.cells);
    const green = new THREE.Color({ lush: '#2fa63a', yellowing: '#96a628', bleached: '#4a5a2c', spores: '#6a4a26' }[a.health]);
    green.offsetHSL((mood.warmth - 0.5) * 0.04, (mood.cheer - 0.5) * 0.25, -mood.wear * 0.06);
    const wallTint = new THREE.Color(a.health === 'bleached' ? '#cfd0c0' : a.health === 'spores' ? '#d8d2b0' : '#cfe8cc');
    const wall = new THREE.MeshPhysicalMaterial({ color: wallTint, transparent: true, opacity: a.health === 'bleached' ? 0.5 : 0.34, roughness: 0.15, clearcoat: 0.8 });
    const septum = new THREE.MeshStandardMaterial({ color: wallTint.clone().multiplyScalar(0.5), roughness: 0.5 });
    const ribbonMat = new THREE.MeshStandardMaterial({ color: green, roughness: 0.5, emissive: green, emissiveIntensity: 0.25 });
    const paleMat = new THREE.MeshStandardMaterial({ color: '#eef0d8', roughness: 0.4 });
    const unit = new THREE.SphereGeometry(1, 12, 8);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const anchors: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];

    const filament = (parent: THREE.Object3D, points: THREE.Vector3[], contents: 'ribbon' | 'empty' | 'spores' | 'clots') => {
      const curve = new THREE.CatmullRomCurve3(points);
      const cells = Math.max(2, Math.round(curve.getLength() / (R * cellRatio)));
      const N = cells * 14;
      const frames = curve.computeFrenetFrames(N, false);
      const spaced = curve.getSpacedPoints(N);
      const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, cells * 6, R, 10), wall);
      hull.castShadow = true;
      hull.renderOrder = 2;
      parent.add(hull);
      // Cross walls and end caps.
      const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(R * 0.98, R * 0.09, 5, 16), septum, cells + 1);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
      for (let c = 0; c <= cells; c++) rings.setMatrixAt(c, m.compose(spaced[c * 14], q.setFromUnitVectors(zAxis, frames.tangents[c * 14]), one));
      rings.castShadow = true;
      parent.add(rings);
      for (const end of [0, N]) { const cap = new THREE.Mesh(unit, wall); cap.position.copy(spaced[end]); cap.scale.setScalar(R * 0.98); parent.add(cap); }
      if (contents === 'ribbon') {
        const turns = { loose: 1.4, double: 1.3, tight: 3.6 }[a.spirals], strands = a.spirals === 'double' ? 2 : 1;
        const width = R * (a.health === 'yellowing' ? 0.16 : 0.22) * (a.spirals === 'tight' ? 0.8 : 1);
        for (let k = 0; k < strands; k++) {
          const path: THREE.Vector3[] = [];
          const steps = Math.round(cells * turns * 9);
          for (let i = 0; i <= steps; i++) {
            const u = (i / steps) * N, lo = Math.min(N - 1, Math.floor(u)), f = u - lo;
            const p = spaced[lo].clone().lerp(spaced[lo + 1], f), angle = (u / 14) * turns * Math.PI * 2 * (k ? -1 : 1) + k * 1.3;
            path.push(p.addScaledVector(frames.normals[lo], Math.cos(angle) * R * 0.68).addScaledVector(frames.binormals[lo], Math.sin(angle) * R * 0.68));
          }
          const ribbon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), steps * 2, width, 5), ribbonMat);
          ribbon.castShadow = true;
          parent.add(ribbon);
        }
      }
      // One nucleus, clot or spore per cell.
      if (contents !== 'empty') {
        const cores = new THREE.InstancedMesh(unit, contents === 'ribbon' ? paleMat : ribbonMat, cells);
        for (let c = 0; c < cells; c++) {
          const i = c * 14 + 7, long = contents === 'spores' ? Math.min(R * cellRatio * 0.36, R * 1.3) : contents === 'clots' ? R * mix(0.5, 1.1, random()) : R * 0.2;
          const fat = contents === 'ribbon' ? R * 0.2 : contents === 'spores' ? R * 0.7 : R * mix(0.4, 0.62, random());
          cores.setMatrixAt(c, m.compose(spaced[i], q.setFromUnitVectors(zAxis, frames.tangents[i]), new THREE.Vector3(fat, fat, long)));
        }
        parent.add(cores);
      }
      for (let c = 0; c < cells; c++) anchors.push({ p: spaced[c * 14 + 7], n: frames.normals[c * 14 + 7].clone().applyAxisAngle(frames.tangents[c * 14 + 7], random() * 6.3) });
      return { curve, cells, spaced, frames };
    };

    const contents = a.health === 'bleached' ? 'clots' : a.health === 'spores' ? 'spores' : 'ribbon';
    const sways: THREE.Group[] = [];
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const jitter = (amount: number) => (random() - 0.5) * amount;
    if (a.gathering === 'single') {
      filament(s.root, [v(-2.3, R, 0.3), v(-1.3, 0.55 + jitter(0.2), 0), v(-0.2, 1.15, -0.2 + jitter(0.3)), v(1, 0.8 + jitter(0.2), 0.15), v(2.2, 0.25, -0.1)], contents);
    } else if (a.gathering === 'ladder') {
      const lane = (z: number) => [v(-2.1, R, z + 0.25), v(-0.7, R, z - 0.05), v(0.7, R, z + 0.08), v(2.1, R, z - 0.2)];
      const gap = R * 3.1;
      const first = filament(s.root, lane(gap / 2), 'spores');
      filament(s.root, lane(-gap / 2), 'empty');
      for (let c = 0; c < first.cells; c++) {
        const p = first.spaced[c * 14 + 7];
        s.rod([p.x, p.y, p.z - R * 0.8], [p.x, p.y, p.z - gap + R * 0.8], R * 0.42, wall);
      }
    } else if (a.gathering === 'mat') {
      const count = Math.round(mix(5, 12, mood.density));
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI, layer = R + (i / count) * 0.7, reach = mix(1.4, 2.1, random());
        const points = [-1, -0.45, 0.1, 0.55, 1].map((t) => v(Math.cos(angle) * t * reach + jitter(0.9), layer + jitter(0.25) + (Math.abs(t) > 0.9 ? -layer * 0.5 : 0), Math.sin(angle) * t * reach * 0.8 + jitter(0.9)));
        filament(s.root, points, i % 5 === 4 && contents === 'ribbon' ? 'clots' : contents);
      }
    } else if (a.gathering === 'forest') {
      const count = Math.round(mix(4, 10, mood.density));
      const lean = jitter(0.5);
      for (let i = 0; i < count; i++) {
        const group = new THREE.Group();
        const angle = (i / count) * Math.PI * 2 + random(), d = mix(0.1, 0.75, random()), height = mix(2.2, 4.4, random());
        group.position.set(Math.cos(angle) * d, 0, Math.sin(angle) * d);
        filament(group, [v(0, 0, 0), v(jitter(0.3), height * 0.35, jitter(0.3)), v(lean * 0.5 + jitter(0.5), height * 0.7, jitter(0.5)), v(lean + jitter(0.7), height, jitter(0.7))], contents);
        s.root.add(group);
        sways.push(group);
      }
      const silt = s.mesh(new THREE.DodecahedronGeometry(1, 1), s.material('#6a5a40', { flatShading: true, roughness: 1 }), [0, -0.08, 0]);
      silt.scale.set(1.2, 0.16, 1.1);
    } else {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14, angle = t * Math.PI * 3.6, r = mix(1.5, 0.75, t); points.push(v(Math.cos(angle) * r, R + t * 0.9 + jitter(0.08), Math.sin(angle) * r)); }
      filament(s.root, points, contents);
    }

    // Bubbles, and whatever has settled on the walls.
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#f2fbff', transparent: true, opacity: 0.5, roughness: 0.02, clearcoat: 1 });
    const bubbleRim = new THREE.MeshBasicMaterial({ color: '#5a7a80', side: THREE.BackSide, transparent: true, opacity: 0.5, depthWrite: false });
    const bubbles = Math.round(a.bubbles * mix(10, 34, mood.density));
    for (let i = 0; i < bubbles && anchors.length; i++) {
      const spot = anchors[Math.floor(random() * anchors.length)], r = R * mix(0.5, 1.9, random() ** 2);
      const at = spot.p.clone().addScaledVector(spot.n, R + r * 0.8);
      at.y = Math.max(at.y, r) + r * 0.3;
      s.ball([r, r, r], at.toArray() as [number, number, number], bubbleMat, 14).renderOrder = 3;
      s.ball([r * 1.05, r * 1.05, r * 1.05], at.toArray() as [number, number, number], bubbleRim, 14).castShadow = false;
    }
    if (a.passengers !== 'none') {
      const riders = a.passengers === 'fuzz' ? 220 : a.passengers === 'diatoms' ? 26 : 14;
      const amber = new THREE.MeshStandardMaterial({ color: '#c8922e', roughness: 0.35, emissive: '#7a4a10', emissiveIntensity: 0.3 });
      const silt: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < riders; i++) {
        const spot = anchors[Math.floor(random() * anchors.length)], n = spot.n.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), jitter(2)).normalize();
        const at = spot.p.clone().addScaledVector(n, R * 1.05).add(v(jitter(R * 3), 0, jitter(R)));
        if (a.passengers === 'fuzz') silt.push({ at: at.toArray() as [number, number, number], size: R * mix(0.1, 0.3, random()), color: ['#6a4c30', '#8a6a44', '#4f3c28'][i % 3] });
        else if (a.passengers === 'diatoms') {
          const boat = s.ball([R * 0.75, R * 0.2, R * 0.24], at.toArray() as [number, number, number], amber, 10);
          boat.rotation.set(jitter(1), jitter(3), jitter(1));
        } else {
          const tip = spot.p.clone().addScaledVector(n, R * mix(2.6, 4.2, random()));
          s.rod(spot.p.clone().addScaledVector(n, R).toArray() as [number, number, number], tip.toArray() as [number, number, number], R * 0.035, paleMat);
          const bell = s.mesh(new THREE.ConeGeometry(R * 0.5, R * 0.75, 10, 1, true), paleMat, tip.toArray() as [number, number, number]);
          bell.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), n);
          (bell.material as THREE.Material).side = THREE.DoubleSide;
        }
      }
      if (silt.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), silt);
    }

    s.root.scale.setScalar(context.scale === 'landscape' ? 4 : 0.1);
    const sway = mix(0.1, 1, mood.energy);
    const bases = sways.map(() => random() * 6);
    return s.finish({
      footprint: a.gathering === 'forest' ? (context.scale === 'landscape' ? 4 : 0.1) * 1.2 : undefined,
      update: (_dt, time) => { sways.forEach((group, i) => { group.rotation.z = Math.sin(time * 0.6 * sway + bases[i]) * 0.07 * sway; group.rotation.x = Math.cos(time * 0.45 * sway + bases[i]) * 0.05 * sway; }); },
    });
  },
});
