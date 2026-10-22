import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

const TRACK = ['#9cc0ff', '#fff1cf', '#ffae52', '#c8421a'].map((hex) => new THREE.Color(hex));
const along = (stops: THREE.Color[], t: number) => {
  const at = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  return stops[Math.floor(at)].clone().lerp(stops[Math.floor(at) + 1], at % 1);
};

export default defineThing({
  questions: {
    cooling: score('Where is it on its cooling track?', ['Fierce blue-white, newly bared', 'Pearl white', 'Candle yellow', 'Dull orange', 'A dark coal with a red heart']),
    frozen: score('How much of it has crystallised?', ['Still a smooth glowing liquid', 'A cap of crystal spreading from one pole', 'Frozen right through, one enormous gem']),
    lattice: choice('What pattern does the crystal lattice make?', {
      honeycomb: 'A regular honeycomb of hexagonal cells.',
      frost: 'Feathery branching ferns, like frost on a window.',
      facets: 'Straight criss-crossing cleavage lines, like a cut diamond.',
      rings: 'Concentric growth rings, like a pearl or a tree stump.',
    }),
    ring: choice('What circles it?', {
      none: 'Nothing: it is alone.',
      dust: 'A thin, flat, banded ring of fine dust.',
      rubble: 'A clumpy ring of gravel with one crumbling asteroid still shedding a tail.',
      warped: 'Two thin rings, tilted against each other and slightly bent.',
    }),
    companion: choice('Does it have a companion?', {
      none: 'No.',
      feeding: 'A swollen orange star, pulled to a teardrop, pouring a stream of gas onto it.',
      planet: 'One cold, scorched planet that somehow survived, still in orbit.',
      twin: 'A second, dimmer dwarf circling close, two embers keeping each other company.',
    }),
    shroud: choice('What is left of the outer layers it threw off?', {
      gone: 'Nothing: long since dispersed.',
      shells: 'Faint nested rings of gas, like smoke rings, far out.',
      lobes: 'Two soft translucent lobes above and below, an hourglass of old gas.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.8;
    const cool = Math.min(1, Math.max(0, a.cooling + (mood.warmth - 0.5) * 0.12));
    const light = along(TRACK, cool);
    const glow = mix(0.8, 1.35, mood.cheer) * mix(1.1, 0.75, cool);
    const coal = new THREE.Color('#3a2018');
    const frozen = a.frozen;
    const star = new THREE.Group();
    star.rotation.set(mix(-0.5, -0.15, random()), random() * 6, mix(-0.3, 0.3, random()));
    s.root.add(star);
    const orbit = new THREE.Group();
    orbit.rotation.set(mix(-0.12, 0.12, random()), random() * 6, mix(0.12, 0.38, random()) * (random() < 0.5 ? -1 : 1));
    s.root.add(orbit);
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Surface: body colour with the lattice scored into it; the emissive map flips from
    // dark lines on a bright ground (hot) to bright seams in a dark coal (cold).
    const W = 1024, H = 512;
    const paintCanvas = document.createElement('canvas'), lightCanvas = document.createElement('canvas');
    paintCanvas.width = lightCanvas.width = W; paintCanvas.height = lightCanvas.height = H;
    const c = paintCanvas.getContext('2d')!, e = lightCanvas.getContext('2d')!;
    const body = light.clone().lerp(new THREE.Color('#ffffff'), 0.12 * (1 - cool)).lerp(coal, cool ** 2 * 0.8);
    c.fillStyle = `#${body.getHexString()}`;
    c.fillRect(0, 0, W, H);
    const ground = Math.round(255 * mix(0.6, 0.1, cool ** 1.5));
    e.fillStyle = `rgb(${ground},${ground},${ground})`;
    e.fillRect(0, 0, W, H);
    // Convection mottle on whatever is still liquid.
    for (let i = 0; i < 260; i++) {
      const x = random() * W, y = random() * H, r = 6 + random() * 30;
      for (const [ctx, colour] of [[c, random() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.1)'], [e, random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)']] as const) {
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 1.6, r * 0.6, 0, 0, 7);
        ctx.fill();
      }
    }
    // The crystal front creeps down from the top pole with a ragged edge.
    const front = (x: number) => H * (frozen * 1.1 - 0.04 + Math.sin(x * 0.021) * 0.04 * frozen + Math.sin(x * 0.057 + 2) * 0.025);
    const lineInk = `#${body.clone().multiplyScalar(cool > 0.6 ? 0.4 : 0.5).lerp(new THREE.Color('#2b3f66'), 0.75 * (1 - cool)).getHexString()}`;
    const lineLight = cool > 0.55 ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,1)';
    const stroke = (points: [number, number][], width: number) => {
      const kept = points.filter(([x, y]) => y < front(x));
      if (kept.length < 2) return;
      for (const shift of [-W, 0, W])
        for (const [ctx, colour, w] of [[c, lineInk, width * 1.6], [e, lineLight, width * 1.5]] as const) {
          ctx.strokeStyle = colour;
          ctx.lineWidth = w;
          ctx.lineJoin = ctx.lineCap = 'round';
          ctx.beginPath();
          kept.forEach(([x, y], index) => (index ? ctx.lineTo(x + shift, y) : ctx.moveTo(x + shift, y)));
          ctx.stroke();
        }
    };
    // Tint the frozen region slightly cooler and glassier.
    c.fillStyle = 'rgba(190,220,255,0.16)';
    e.fillStyle = cool > 0.55 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.1)';
    for (let x = 0; x < W; x += 4) { c.fillRect(x, 0, 4, front(x)); e.fillRect(x, 0, 4, front(x)); }
    if (a.lattice === 'honeycomb') {
      const cell = 34;
      for (let j = 0; j * cell * 0.87 < H; j++)
        for (let i = 0; i <= W / cell; i++) {
          const cx = (i + (j % 2) * 0.5) * cell, cy = j * cell * 0.87;
          const hex: [number, number][] = [];
          for (let k = 0; k <= 6; k++) hex.push([cx + Math.cos(k * Math.PI / 3 + Math.PI / 6) * cell * 0.58, cy + Math.sin(k * Math.PI / 3 + Math.PI / 6) * cell * 0.58]);
          stroke(hex, 3);
        }
    } else if (a.lattice === 'frost') {
      const fern = (x: number, y: number, heading: number, length: number, depth: number) => {
        const points: [number, number][] = [[x, y]];
        for (let i = 0; i < length; i++) {
          x += Math.cos(heading) * 13;
          y += Math.sin(heading) * 8;
          points.push([x, y]);
          if (depth > 0 && i % 2 === 1) for (const side of [-1, 1]) fern(x, y, heading + side * 1.05, Math.round((length - i) * 0.45), depth - 1);
        }
        stroke(points, 1.6 + depth * 1.2);
      };
      for (let i = 0; i < 26; i++) fern(random() * W, random() * H * Math.max(0.2, frozen), random() * 6.3, 12, 2);
    } else if (a.lattice === 'facets') {
      for (let i = 0; i < 46; i++) {
        const x = random() * W, y = random() * H, heading = [0.5, -0.5, 1.2, -1.2, 0.05][Math.floor(random() * 5)] + (random() - 0.5) * 0.08, reach = mix(120, 420, random());
        stroke(Array.from({ length: 13 }, (_unused, k) => [x + Math.cos(heading) * reach * (k / 12 - 0.5), y + Math.sin(heading) * reach * 0.6 * (k / 12 - 0.5)] as [number, number]), mix(1.5, 3.5, random()));
      }
    } else {
      for (let y = 10; y < H; y += mix(11, 22, random())) {
        const phase = random() * 6;
        stroke(Array.from({ length: 65 }, (_unused, k) => [(k / 64) * W, y + Math.sin((k / 64) * Math.PI * 2 * 3 + phase) * 3] as [number, number]), mix(1.5, 4, random()));
      }
      for (let i = 0; i < 18; i++) {
        const x = random() * W, y = random() * H;
        stroke([[x, y], [x + (random() - 0.5) * 8, y + mix(20, 60, random())]], 2);
      }
    }
    const map = new THREE.CanvasTexture(paintCanvas), emissiveMap = new THREE.CanvasTexture(lightCanvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const gem = frozen > 0.72;
    const skin = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: light, emissiveIntensity: mix(0.4, 1.4, cool) * glow, roughness: mix(0.45, 0.12, frozen), metalness: 0.05, flatShading: gem });
    solid(gem ? new THREE.SphereGeometry(R, 22, 13) : new THREE.SphereGeometry(R, 56, 36), skin, star);
    // A dark rim so a pale star still has an edge on pale paper.
    const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 40, 24), new THREE.MeshBasicMaterial({ color: light.clone().lerp(new THREE.Color('#1a2238'), 0.55), side: THREE.BackSide }));
    star.add(rim);
    const haze = (radius: number, opacity: number, parent: THREE.Object3D = s.root, colour: THREE.Color = light) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 18), new THREE.MeshBasicMaterial({ color: colour.clone().lerp(new THREE.Color('#d8602a'), 0.25), transparent: true, opacity, depthWrite: false, side: THREE.BackSide }));
      parent.add(mesh);
      return mesh;
    };
    haze(R * 1.3, mix(0.2, 0.1, cool));
    haze(R * 1.75, mix(0.1, 0.04, cool));

    // Rings of ground-up planet.
    const dustTint = (t: number) => new THREE.Color('#8a7a68').lerp(new THREE.Color('#4a4038'), t).lerp(light, 0.12);
    const band = (inner: number, outer: number, tint: number, parent: THREE.Object3D) => {
      const mesh = solid(new THREE.RingGeometry(inner, outer, 96), new THREE.MeshStandardMaterial({ color: dustTint(tint), roughness: 0.95, side: THREE.DoubleSide }), parent);
      mesh.rotation.x = -Math.PI / 2;
      return mesh;
    };
    const grains = (count: number, inner: number, outer: number, parent: THREE.Object3D, big: number) => {
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: dustTint(0.7), roughness: 0.9, flatShading: true }), count);
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, r = mix(inner, outer, random());
        turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, 0));
        scale.setScalar(mix(0.008, big, random() ** 3));
        mesh.setMatrixAt(i, matrix.compose(at.set(Math.cos(angle) * r, (random() - 0.5) * 0.03, Math.sin(angle) * r), turn, scale));
      }
      mesh.castShadow = true;
      parent.add(mesh);
    };
    const ringGroups: THREE.Group[] = [];
    if (a.ring !== 'none') {
      const main = new THREE.Group();
      orbit.add(main);
      ringGroups.push(main);
      if (a.ring === 'dust' || a.ring === 'warped') {
        let r = R * 1.55;
        const bands = a.ring === 'warped' ? 2 : 4 + Math.round(mood.density * 3);
        for (let i = 0; i < bands; i++) {
          const width = R * mix(0.05, 0.2, random());
          band(r, r + width, random(), main);
          r += width + R * mix(0.02, 0.09, random());
        }
        grains(Math.round(mix(30, 120, mood.density)), R * 1.5, r, main, 0.03);
        if (a.ring === 'warped') {
          const second = new THREE.Group();
          second.rotation.set(0.5, 0, 0.35);
          band(r + R * 0.1, r + R * 0.22, 0.3, second);
          band(r + R * 0.26, r + R * 0.3, 0.8, second);
          orbit.add(second);
          ringGroups.push(second);
        }
      } else {
        band(R * 1.7, R * 1.78, 0.5, main);
        grains(Math.round(mix(80, 260, mood.density)), R * 1.6, R * 2.3, main, 0.07);
        // The asteroid that is still coming apart.
        const rockPaint = new THREE.MeshStandardMaterial({ color: '#5c5048', roughness: 0.9, flatShading: true });
        solid(new THREE.DodecahedronGeometry(R * 0.16, 1), rockPaint, main).position.set(R * 2.05, 0.02, 0);
        for (let i = 1; i < 14; i++) {
          const angle = -i * 0.07;
          solid(new THREE.DodecahedronGeometry(R * mix(0.07, 0.015, i / 14), 0), rockPaint, main).position.set(Math.cos(angle) * R * 2.05, (random() - 0.5) * 0.06, Math.sin(angle) * R * (2.05 + i * 0.012));
        }
      }
    }

    // Companions.
    let partner: THREE.Group | null = null;
    if (a.companion !== 'none') {
      partner = new THREE.Group();
      partner.rotation.y = random() * 6;
      orbit.add(partner);
    }
    if (a.companion === 'feeding' && partner) {
      const giantTint = new THREE.Color('#e8742c');
      const giant = new THREE.MeshStandardMaterial({ color: giantTint, emissive: '#d2501c', emissiveIntensity: 0.55 * glow, roughness: 0.7 });
      // A teardrop: a sphere whose near side is drawn out to a point toward the dwarf.
      const drop = new THREE.LatheGeometry([[0, -1], [0.55, -0.85], [0.9, -0.45], [1, 0], [0.86, 0.5], [0.5, 0.95], [0.2, 1.3], [0.03, 1.6]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
      const lobe = solid(drop, giant, partner);
      lobe.scale.setScalar(R * 0.95);
      lobe.rotation.z = Math.PI / 2;
      lobe.position.x = R * 4.1;
      const streamPaint = new THREE.MeshStandardMaterial({ color: '#f09a3e', emissive: '#f0701e', emissiveIntensity: 0.9 * glow, roughness: 0.5 });
      const points: P[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20, angle = t * t * 4.2, r = R * mix(2.55, 1.25, t);
        points.push([Math.cos(angle) * r, 0, -Math.sin(angle) * r]);
      }
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 60, R * 0.045, 6), streamPaint, partner);
      for (let i = 0; i < 3; i++) solid(new THREE.TorusGeometry(R * (1.2 + i * 0.13), R * 0.03, 6, 64), i === 1 ? streamPaint : giant, partner).rotation.x = Math.PI / 2;
    } else if (a.companion === 'planet' && partner) {
      const planet = solid(new THREE.SphereGeometry(R * 0.26, 24, 16), new THREE.MeshStandardMaterial({ color: '#4b4038', roughness: 0.95 }), partner);
      planet.position.x = R * 3.2;
      const scar = solid(new THREE.SphereGeometry(R * 0.264, 24, 10, 0, Math.PI * 2, 0, 0.8), new THREE.MeshStandardMaterial({ color: light, emissive: light, emissiveIntensity: 0.4 * glow, roughness: 0.8 }), partner);
      scar.position.x = R * 3.2;
      scar.rotation.z = Math.PI / 2; // the lit, scoured face looks at the dwarf
      solid(new THREE.TorusGeometry(R * 3.2, R * 0.006, 4, 120), new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.9 }), partner).rotation.x = Math.PI / 2;
    } else if (a.companion === 'twin' && partner) {
      const dim = along(TRACK, Math.min(1, cool + 0.3));
      const twin = solid(new THREE.SphereGeometry(R * 0.55, 32, 20), new THREE.MeshStandardMaterial({ color: dim.clone().lerp(coal, 0.35), emissive: dim, emissiveIntensity: 0.6 * glow, roughness: 0.4 }), partner);
      twin.position.x = R * 2.9;
      const twinRim = new THREE.Mesh(new THREE.SphereGeometry(R * 0.575, 24, 16), new THREE.MeshBasicMaterial({ color: dim.clone().lerp(new THREE.Color('#1a2238'), 0.55), side: THREE.BackSide }));
      twinRim.position.x = R * 2.9;
      partner.add(twinRim);
      haze(R * 0.8, 0.14, partner, dim).position.x = R * 2.9;
    }

    // What it shed long ago.
    if (a.shroud === 'shells') {
      const gas = new THREE.MeshStandardMaterial({ color: light.clone().lerp(new THREE.Color('#2f8f88'), 0.8), emissive: '#2f8f88', emissiveIntensity: 0.25 * glow, roughness: 0.7 });
      for (let i = 0; i < 3; i++) {
        const ring = solid(new THREE.TorusGeometry(R * (2.7 + i * 0.5), R * mix(0.05, 0.025, i / 2), 6, 96, Math.PI * mix(1.5, 2, random())), gas, s.root);
        ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.5, (random() - 0.5) * 0.4, random() * 6);
      }
    } else if (a.shroud === 'lobes') {
      for (const side of [-1, 1]) {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(R * 1.5, 28, 18), new THREE.MeshBasicMaterial({ color: side > 0 ? '#4fa6a0' : '#c2607a', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        lobe.scale.set(0.8, 1.25, 0.8);
        lobe.position.y = side * R * 1.75;
        star.add(lobe);
        const lip = solid(new THREE.TorusGeometry(R * 0.95, R * 0.014, 6, 64), new THREE.MeshStandardMaterial({ color: side > 0 ? '#3f8f8a' : '#b04a66', roughness: 0.7 }), star);
        lip.rotation.x = Math.PI / 2;
        lip.position.y = side * R * 2.6;
      }
    }

    const pace = mix(0.3, 1.6, mood.energy);
    const base = skin.emissiveIntensity;
    return s.finish({
      footprint: R * 1.2,
      update(dt, time) {
        star.rotation.y += dt * 0.05 * pace;
        ringGroups.forEach((group, index) => (group.rotation.y += dt * 0.07 * pace * (index ? -0.6 : 1)));
        if (partner) partner.rotation.y += dt * 0.05 * pace;
        // An ember breathes: slowly, and less the colder it is.
        skin.emissiveIntensity = base * (1 + Math.sin(time * pace * 1.1) * 0.12 + Math.sin(time * pace * 2.9) * 0.05);
      },
    });
  },
});
