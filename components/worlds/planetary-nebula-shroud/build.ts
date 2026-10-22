import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function noiseOf(seed: number) {
  const lattice = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const edge = (dy: number, dz: number) => lattice(xi, yi + dy, zi + dz) * (1 - u) + lattice(xi + 1, yi + dy, zi + dz) * u;
    return (edge(0, 0) * (1 - v) + edge(1, 0) * v) * (1 - w) + (edge(0, 1) * (1 - v) + edge(1, 1) * v) * w;
  };
  return (x: number, y: number, z: number, octaves = 4) => {
    let total = 0, weight = 0.5, scale = 1;
    for (let i = 0; i < octaves; i++) {
      total += noise(x * scale + i * 7.3, y * scale, z * scale) * weight;
      weight *= 0.5; scale *= 2.03;
    }
    return total / (1 - 0.5 ** octaves);
  };
}

const PALETTES = {
  classic: 'Orange nearest the core, then rose, then sea-glass teal, against a deep teal dusk.',
  autumn: 'Ochre, rust and wine red against warm brown: leaves in the last week of the season.',
  glass: 'Pale peach, pink and aqua on a light milky ground, like a paperweight held to a window.',
  bruise: 'Pink, violet and deep blue against plum: tender, nocturnal, a little sore.',
  ash: 'Grey and bone shells with only the innermost still orange, against flat pewter: nearly burnt out.',
} as const;
const COLOURS: Record<keyof typeof PALETTES, { backdrop: string; shells: string[] }> = {
  classic: { backdrop: '#31535f', shells: ['#f6a23c', '#ea6f8c', '#3fbfb4', '#5a8fd0', '#7fd1c6'] },
  autumn: { backdrop: '#5c4338', shells: ['#f2c14e', '#d9622b', '#9c2f4a', '#8a7434', '#c98a5a'] },
  glass: { backdrop: '#cfdcd9', shells: ['#f09a5c', '#e8799a', '#4fbdb2', '#7fa0d8', '#9fd6cc'] },
  bruise: { backdrop: '#3d3550', shells: ['#f08fa0', '#b05cc0', '#5a6fd0', '#3fa79a', '#8f7fd8'] },
  ash: { backdrop: '#6b6f72', shells: ['#f2a65a', '#c9c2b8', '#a3a7a8', '#8a9094', '#d5d2cc'] },
};

/** How high the cupped floor of gas sits at a given distance from the core. */
const dishY = (r: number) => 0.03 * r * r - 0.75;
const RINGS = [2.7, 5.2, 7.5];
/** Each standing place: degrees round from the camera's side, which ring, and a size multiplier. */
const SLOTS: readonly (readonly [number, number, number])[] = [
  [-32, 0, 1], [122, 1, 0.85], [-118, 1, 0.85], [42, 1, 0.75], [176, 2, 0.85], [-66, 2, 0.75], [84, 2, 0.75],
];

export default defineWorld({
  questions: {
    form: choice('What do the shells of gas look like from inside?', {
      flower: 'A blown-glass flower: nested cups with scalloped petal rims curling upward.',
      eye: 'An eye: flat rings of radial fibres like an iris, with a dark edge and the core as its pupil.',
      bubbles: 'Clean nested bowls with smooth bright rims, soap films one inside another.',
      rags: 'Tattered: the shells have torn into arcs, streamers and holes.',
    }),
    palette: choice('What colours are the shells?', PALETTES),
    layers: score('How many shells has the star thrown off?', ['Two, close in', 'Three', 'Four', 'Five, reaching far out']),
    stage: score('How far along is the ending?', ['The first breath out: shells tight, bright and dense', 'In full bloom', 'Thinning and widening', 'Almost dispersed: pale wide ghosts of shells']),
    core: choice('What is left at the centre?', {
      fierce: 'A tiny, fierce white point with sharp rays.',
      blue: 'A hard blue-white dwarf, cold and bright.',
      ember: 'A small dull orange ember, nearly out.',
      gone: 'Nothing: an empty place where the star was, with a faint ring around it.',
    }),
    drift: choice('What is drifting outward through the shells?', {
      nothing: 'Nothing. The gas is still.',
      knots: 'Small knots of gas with tails pointing away from the core, like tadpoles.',
      leaves: 'Flat flakes turning over like falling leaves.',
      sparks: 'Bright sparks, the last of the fire.',
    }),
    tracks: choice('What do things float on?', {
      rings: 'Fine bright concentric rings, like orbits drawn on glass.',
      nothing: 'Nothing visible; they hang in the gas.',
      beads: 'Rings of small beads, like dew on a web.',
    }),
    view: choice('Where are we looking from?', {
      within: 'From inside, low, across the shells toward the core.',
      above: 'From high above, looking down into it like an eye or a flower.',
      between: 'Somewhere between: a calm three-quarter view.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const fbm = noiseOf(context.seed ^ Math.floor(random() * 1e9));
    const palette = COLOURS[a.palette];
    const warmShift = new THREE.Color(mood.warmth > 0.5 ? '#c9743a' : '#3a78c9');
    const background = new THREE.Color(palette.backdrop).lerp(warmShift, Math.abs(mood.warmth - 0.5) * 0.3).lerp(new THREE.Color('#e9e4da'), mix(0, 0.22, mood.cheer) + a.stage * 0.08);
    const count = 2 + Math.round(a.layers * 3);
    const spread = mix(0.92, 1.12, a.stage);
    const rims = Array.from({ length: count }, (_unused, k) => (3.35 + k * 2.1) * spread);
    const dense = mix(1.15, 0.5, a.stage) * mix(0.9, 1.1, mood.cheer);
    const tatter = (a.form === 'rags' ? 0.5 : 0) + mood.wear * 0.25 + a.stage * 0.12;
    const yaw = THREE.MathUtils.degToRad(28 + (random() - 0.5) * 16);
    const pitch = THREE.MathUtils.degToRad({ within: 22, between: 34, above: 52 }[a.view]);

    // Light comes from the core. A weak sun behind the scene gives looks a direction and casts shadows forward.
    const coreColour = new THREE.Color({ fierce: '#fff6e6', blue: '#cfe4ff', ember: '#ffb070', gone: '#c9d0d8' }[a.core]);
    const coreHeight = 0.95;
    root.add(new THREE.HemisphereLight('#ffffff', background.clone().lerp(new THREE.Color('#ffffff'), 0.3), mix(0.75, 1.05, mood.cheer)));
    const lamp = new THREE.PointLight(coreColour, { fierce: 10, blue: 10, ember: 6, gone: 2.5 }[a.core], 0, 1);
    lamp.position.set(0, coreHeight, 0);
    root.add(lamp);
    const key = new THREE.DirectionalLight(coreColour.clone().lerp(new THREE.Color('#ffffff'), 0.4), 1.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);

    // The shells: cupped sheets of gas, each painted with radial filaments.
    const shells: THREE.Mesh[] = [];
    rims.forEach((rim, k) => {
      const inner = Math.max(1.0, rim - 3.3 * spread);
      const curl = { flower: 1.15, eye: 0.12, bubbles: 0.8, rags: 0.9 }[a.form] * (0.8 + random() * 0.4);
      const profile = Array.from({ length: 29 }, (_unused, i) => {
        const t = i / 28, r = inner + (rim - inner) * t;
        return new THREE.Vector2(r, dishY(r) * (a.form === 'eye' ? 0.55 : 1) + curl * smooth(0.6, 1, t) ** 2 * (1 + k * 0.18));
      });
      const width = 512, height = 192;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!, data = ctx.createImageData(width, height);
      const own = new THREE.Color(palette.shells[k % palette.shells.length]);
      const within = new THREE.Color(palette.shells[Math.max(0, k - 1) % palette.shells.length]);
      const petals = 5 + k * 2 + Math.floor(random() * 3), turn = random() * 6, salt = k * 17.3;
      for (let py = 0; py < height; py++) {
        const v = 1 - (py + 0.5) / height;
        for (let px = 0; px < width; px++) {
          const u = (px + 0.5) / width, cu = Math.cos(u * Math.PI * 2), su = Math.sin(u * Math.PI * 2);
          const fibre = fbm(cu * (a.form === 'eye' ? 20 : 11) + salt, su * (a.form === 'eye' ? 20 : 11), v * 1.2, 4);
          const cloud = fbm(cu * 2.6 + salt, su * 2.6 + 5, v * 2.4, 3);
          let edge = 1;
          if (a.form === 'flower') edge = 0.8 + 0.2 * Math.abs(Math.sin(u * Math.PI * petals + turn)) ** 0.55;
          if (a.form === 'rags') edge = 0.6 + 0.4 * smooth(0.3, 0.7, fbm(cu * 4 + salt, su * 4, 2.2, 3));
          if (a.form === 'eye') edge = 0.97 + 0.03 * fibre;
          const lip = smooth(0.05, 0, edge - v) * (v <= edge ? 1 : 0);
          let alpha = smooth(0, 0.4, v) * (0.28 + fibre * 0.75 + smooth(0.6, 1, v) * 0.2) * dense;
          if (a.form === 'eye') alpha *= 0.75 + 0.5 * smooth(0.45, 0.6, fibre);
          alpha *= 1 - smooth(0.42 + tatter * 0.2, 0.3 + tatter * 0.2, cloud) * Math.min(1, tatter * 1.8);
          alpha = Math.max(alpha, lip * 0.9 * Math.min(1, dense + 0.2));
          if (v > edge) alpha = 0;
          const tone = within.clone().lerp(own, smooth(0.05, 0.55, v)).lerp(new THREE.Color('#ffffff'), fibre * 0.3 + lip * 0.45);
          if (a.form === 'eye') tone.multiplyScalar(1 - smooth(0.82, 0.97, v) * 0.5);
          const at = (py * width + px) * 4;
          data.data[at] = tone.r * 255; data.data[at + 1] = tone.g * 255; data.data[at + 2] = tone.b * 255; data.data[at + 3] = Math.min(1, alpha) * 255;
        }
      }
      ctx.putImageData(data, 0, 0);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = THREE.RepeatWrapping;
      const shell = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), new THREE.MeshStandardMaterial({
        map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: mix(0.35, 0.6, mood.cheer), transparent: true, depthWrite: false, side: THREE.DoubleSide, roughness: 0.45,
      }));
      shell.renderOrder = count - k;
      shell.receiveShadow = true;
      shell.rotation.y = random() * Math.PI * 2;
      root.add(shell);
      shells.push(shell);
    });

    // The core.
    const core = new THREE.Group();
    core.position.y = coreHeight;
    root.add(core);
    const soft = (radius: number, colour: THREE.ColorRepresentation, opacity: number) => new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }));
    if (a.core === 'gone') {
      const hollow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 48), new THREE.MeshBasicMaterial({ color: '#e6ebf0' }));
      hollow.rotation.x = Math.PI / 2;
      core.add(hollow, soft(0.4, background.clone().multiplyScalar(0.6), 0.5));
    } else {
      const size = { fierce: 0.25, blue: 0.3, ember: 0.34 }[a.core];
      core.add(new THREE.Mesh(new THREE.SphereGeometry(size, 24, 16), new THREE.MeshBasicMaterial({ color: a.core === 'ember' ? '#ff9a4a' : '#ffffff' })), soft(size * 2.2, coreColour, 0.4), soft(size * 4.5, coreColour, 0.14));
      const rays = a.core === 'ember' ? 0 : a.core === 'fierce' ? 8 : 4;
      for (let i = 0; i < rays; i++) {
        const long = i % 2 === 0;
        const ray = new THREE.Mesh(new THREE.ConeGeometry(0.035, long ? 2.6 : 1.3, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
        const angle = (i / rays) * Math.PI * 2;
        ray.rotation.set(0, 0, 0);
        ray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), i < rays / 2 || a.core === 'blue' ? new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)) : new THREE.Vector3(Math.cos(angle) * 0.2, 1, Math.sin(angle) * 0.2).normalize());
        ray.translateY((long ? 1.3 : 0.65) + size);
        core.add(ray);
        if (i < 2) {
          const up = new THREE.Mesh(new THREE.ConeGeometry(0.03, 1.8, 4), ray.material);
          up.position.y = (i ? -1 : 1) * (0.9 + size);
          if (i) up.rotation.x = Math.PI;
          core.add(up);
        }
      }
    }
    if (a.form === 'eye') {
      const pupil = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.25, 48), new THREE.MeshBasicMaterial({ color: '#15161c', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
      pupil.rotation.x = -Math.PI / 2;
      pupil.position.y = dishY(1) * 0.55 + 0.05;
      root.add(pupil);
    }

    // Faint stars beyond the last shell.
    const far = rims[rims.length - 1];
    const dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), Math.round(mix(50, 190, mood.density)));
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), tint = new THREE.Color();
    const light = background.getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
    for (let i = 0; i < dots.count; i++) {
      const angle = random() * Math.PI * 2, r = 3 + random() * (far + 9), size = 0.025 + random() ** 3 * 0.07;
      matrix.compose(new THREE.Vector3(Math.cos(angle) * r, -5 + random() * 15, Math.sin(angle) * r), turn, new THREE.Vector3(size, size, size));
      dots.setMatrixAt(i, matrix);
      dots.setColorAt(i, tint.set(light ? '#6f8a96' : i % 4 ? '#f3f0e6' : palette.shells[i % 3]));
    }
    root.add(dots);

    // What drifts outward.
    const drifters: THREE.InstancedMesh[] = [];
    if (a.drift !== 'nothing') {
      const total = Math.round(mix(40, 190, mood.density));
      const geometry = a.drift === 'knots' ? new THREE.ConeGeometry(1, 1, 6) : a.drift === 'leaves' ? new THREE.CircleGeometry(1, 5) : new THREE.IcosahedronGeometry(1, 0);
      if (a.drift === 'knots') { geometry.rotateZ(Math.PI / 2); geometry.translate(-0.5, 0, 0); geometry.scale(-1, 1, 1); }
      const paint = a.drift === 'sparks' ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7, side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.15 });
      const flock = new THREE.InstancedMesh(geometry, paint, total);
      const heads = a.drift === 'knots' ? new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), total) : null;
      for (let i = 0; i < total; i++) {
        const angle = random() * Math.PI * 2, r = a.drift === 'knots' ? rims[0] * (0.55 + random() * 0.7) : 1.6 + random() * (far - 1), outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const at = outward.clone().multiplyScalar(r).setY(dishY(r) + 0.15 + random() * (a.drift === 'knots' ? 0.5 : 2.6));
        const shellIndex = Math.min(count - 1, rims.findIndex((rim) => r < rim) < 0 ? count - 1 : rims.findIndex((rim) => r < rim));
        tint.set(palette.shells[shellIndex % palette.shells.length]).lerp(new THREE.Color('#ffffff'), a.drift === 'sparks' ? 0.6 : 0.25);
        if (a.drift === 'knots') {
          const size = 0.05 + random() * 0.05;
          turn.setFromUnitVectors(new THREE.Vector3(1, 0, 0), outward);
          matrix.compose(at, turn, new THREE.Vector3(0.35 + random() * 0.6, size, size));
          heads!.setMatrixAt(i, matrix.clone().compose(at, turn, new THREE.Vector3(size * 1.25, size * 1.25, size * 1.25)));
          heads!.setColorAt(i, new THREE.Color('#fff7ea'));
        } else if (a.drift === 'leaves') {
          turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
          const size = 0.07 + random() * 0.1;
          matrix.compose(at, turn, new THREE.Vector3(size, size * 1.6, size));
        } else {
          const size = 0.025 + random() ** 2 * 0.06;
          matrix.compose(at, turn, new THREE.Vector3(size, size, size));
        }
        flock.setMatrixAt(i, matrix);
        flock.setColorAt(i, tint);
      }
      root.add(flock);
      drifters.push(flock);
      if (heads) { root.add(heads); drifters.push(heads); }
    }

    // The rings things float on.
    const trackPaint = new THREE.MeshBasicMaterial({ color: light ? '#5d7884' : '#fdf6e4' });
    const tracks: THREE.Object3D[] = RINGS.map((radius) => {
      const y = dishY(radius) + 0.3;
      if (a.tracks === 'beads') {
        const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 8, 6), trackPaint, Math.round(radius * 14));
        for (let i = 0; i < beads.count; i++) {
          const angle = (i / beads.count) * Math.PI * 2;
          beads.setMatrixAt(i, matrix.makeTranslation(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
        }
        return beads;
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 6, 160), trackPaint);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      return ring;
    });
    if (a.tracks !== 'nothing') for (const track of tracks) root.add(track);

    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 260);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const place = (items: readonly Placeable[]) => {
      const boxes: THREE.Box3[] = [];
      let reach = RINGS[0];
      items.forEach((item, index) => {
        const [degrees, ringIndex, size] = SLOTS[index % SLOTS.length];
        const radius = RINGS[ringIndex] * (1 + (context.random() - 0.5) * 0.06);
        reach = Math.max(reach, radius);
        const angle = yaw + THREE.MathUtils.degToRad(degrees + (context.random() - 0.5) * 14);
        const scale = Math.min((item.hero ? 4.3 : 3.3) / Math.max(item.height, 0.05), (item.hero ? 2.3 : 1.8) / Math.max(item.radius, 0.05)) * size;
        item.holder.scale.setScalar(scale);
        item.holder.position.set(Math.sin(angle) * radius, dishY(radius) + 0.72, Math.cos(angle) * radius);
        item.holder.rotation.y = yaw + (context.random() - 0.5) * 0.8;
        item.holder.updateMatrixWorld(true);
        const box = visibleBounds(item.holder);
        if (!box.isEmpty()) boxes.push(box);
      });
      // Frame the rings in use, not the whole nebula: the outer shells run off the edge so we are inside them.
      tracks.forEach((track, index) => { track.visible = RINGS[index] <= reach + 0.5; });
      const span = reach + 1.0;
      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3(new THREE.Vector3(-span, -0.6, -span), new THREE.Vector3(span, coreHeight + 1.6, span)));
      const centre = bounds.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 90);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      // The stage is round, so fit a circle of it rather than the corners of a square.
      for (let i = 0; i < 24; i++)
        for (const y of [-0.6, coreHeight + 1.6]) {
          corner.set(Math.cos((i / 24) * Math.PI * 2) * span, y, Math.sin((i / 24) * Math.PI * 2) * span).applyMatrix4(camera.matrixWorldInverse);
          seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
        }
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
            }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.5;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();

      const size = bounds.getSize(new THREE.Vector3()).length();
      const swing = yaw + Math.PI + (mood.daylight - 0.5) * 1.6;
      key.target.position.copy(centre);
      key.position.copy(centre).add(new THREE.Vector3(Math.sin(swing) * 0.8, 1.1, Math.cos(swing) * 0.8).normalize().multiplyScalar(size * 1.4));
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -size * 0.6;
      shadow.right = shadow.top = size * 0.6;
      shadow.near = 0.1;
      shadow.far = size * 4;
      shadow.updateProjectionMatrix();
    };

    const pace = mix(0.004, 0.05, mood.energy);
    return {
      object: root,
      camera,
      background,
      capacity: SLOTS.length,
      ground: null,
      keyLight: key,
      place,
      update(dt, time) {
        shells.forEach((shell, index) => { shell.rotation.y += dt * pace * (index % 2 ? -1 : 1) * (1 + index * 0.3); });
        for (const flock of drifters) flock.rotation.y += dt * pace * 0.6;
        const beat = 1 + Math.sin(time * mix(0.5, 2.2, mood.energy)) * 0.05;
        core.scale.setScalar(beat);
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
