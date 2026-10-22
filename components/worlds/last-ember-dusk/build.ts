import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, noul, score, visibleBounds } from '@conjure/kit';

const SKIES = {
  rose: 'Faded rose, like an old photograph of a sunset.',
  ash: 'Pale ash grey with only a memory of pink.',
  peach: 'Thin last-light peach, the warmest it will ever be again.',
  lilac: 'Cold pale lilac, dusk tipping toward night.',
  mauve: 'A deeper dusty mauve, later in the evening.',
} as const;
const SKY: Record<keyof typeof SKIES, [string, string]> = {
  rose: ['#e4cccb', '#d49c98'], ash: ['#d8d4d1', '#bfa9a6'], peach: ['#edd5c1', '#e0a184'], lilac: ['#d6cddd', '#b99bb5'], mauve: ['#bfa3ad', '#a8707c'],
};

export default defineWorld({
  questions: {
    sky: choice('What colour is the last dusk?', SKIES),
    stars: choice('How many stars are still lit?', {
      one: 'One dull red dwarf, far off to one side.',
      pair: 'Two red dwarfs close together, keeping each other company.',
      few: 'Three or four, very far apart from one another.',
      none: 'None. Only cinders, and the afterglow.',
    }),
    remnants: choice('What remnants of the long-gone drift untended in the distance?', {
      panels: 'Broken collector panels and lengths of truss from some great machine.',
      rings: 'Arcs of a shattered ring-world, a few spokes still attached.',
      hulls: 'Derelict ships, dark and holed.',
      domestic: 'Small, shabby, human things: a street lamp, a door in its frame, a window, a signpost.',
      monuments: 'Toppled columns, an arch, a pedestal with nothing left on it.',
      nothing: 'Nothing. It has all drifted out of sight already.',
    }),
    drift: score('How far have things drifted apart from one another?', ['Still gathered close, almost touching', 'Loosened, an arm’s length apart', 'Scattered wide, barely in the same frame']),
    air: choice('What hangs in the dark between them?', {
      clear: 'Nothing: it is perfectly clear and still.',
      ash: 'Slow grey flakes, like ash after a fire.',
      band: 'One long faint band of dust crossing the whole view.',
      frost: 'A few bright motes of frost.',
    }),
    view: choice('Where do we watch from?', {
      level: 'Level with the subject, like sitting across from it.',
      above: 'From a little above, looking down on what is left.',
      below: 'From below, so it stands tall against the dusk.',
    }),
    trails: noul('Can you see the faint dotted paths they have drifted along, leading back to where they were once together?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const [pale, deep] = SKY[a.sky];
    const background = new THREE.Color(pale);
    const haze = new THREE.Color(pale).lerp(new THREE.Color(deep), 0.35);
    /** Far things take on the colour of the dusk, since a world may not set fog. */
    const fade = (colour: THREE.ColorRepresentation, depth: number) => new THREE.Color(colour).lerp(haze, clamp01((depth - 18) / 80) * 0.78);

    // A fixed camera: everything else is laid out in its frame.
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 500);
    const yaw = 0.32, pitch = { level: 0.05, above: 0.36, below: -0.26 }[a.view], distance = 18;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const half = Math.tan(THREE.MathUtils.degToRad(15));
    /** A point in the frame: x and y from -1 to 1 across the picture, at a distance from the lens. */
    const at = (x: number, y: number, depth: number) => camera.localToWorld(new THREE.Vector3(x * depth * half, y * depth * half, -depth));
    const upright = (node: THREE.Object3D) => node.quaternion.copy(camera.quaternion);

    // Light: a dim warm rim from behind, soft dusk all round, a little cool fill so faces still read.
    root.add(new THREE.HemisphereLight(new THREE.Color(pale).lerp(new THREE.Color('#ffffff'), 0.3), '#75686c', 1.05));
    const warm = new THREE.Color().setHSL((0.97 + mood.warmth * 0.1) % 1, 0.75, 0.72, THREE.SRGBColorSpace);
    const key = new THREE.DirectionalLight(warm, 2.5);
    const side = mix(-0.9, 0.9, mood.daylight);
    key.position.copy(new THREE.Vector3(side, 0.6, -0.7).normalize().transformDirection(camera.matrixWorld).multiplyScalar(40));
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.04;
    Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 90 });
    key.shadow.camera.updateProjectionMatrix();
    const fill = new THREE.DirectionalLight('#d5cddd', 0.6);
    fill.position.copy(new THREE.Vector3(-side * 0.5, 0.3, 1).normalize().transformDirection(camera.matrixWorld).multiplyScalar(30));
    root.add(key, key.target, fill);

    // Soft see-through washes: the afterglow low in the frame and a bloom round each star.
    const soft = (inner: string, vertical = false) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      const c = new THREE.Color(inner), rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
      const g = vertical ? ctx.createLinearGradient(0, 0, 0, 128) : ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      if (vertical) { g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(0.5, `rgba(${rgb},1)`); g.addColorStop(1, `rgba(${rgb},0)`); }
      else { g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`); }
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false });
    };
    const wash = (material: THREE.Material, x: number, y: number, depth: number, width: number, height: number, turn = 0) => {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width * depth * half, height * depth * half), material);
      plane.position.copy(at(x, y, depth)); upright(plane); plane.rotateZ(turn);
      root.add(plane);
      return plane;
    };
    const srgb = (c: THREE.Color) => `#${c.getHexString()}`;
    wash(soft(srgb(new THREE.Color(deep).lerp(new THREE.Color(pale), 0.25)), true), 0, -0.55 + random() * 0.25, 300, 5, 1.9, (random() - 0.5) * 0.25).material.opacity = 0.5;
    wash(soft(srgb(new THREE.Color(pale).lerp(new THREE.Color('#ffffff'), 0.6))), (random() - 0.5) * 0.8, 0.5, 290, 2.6, 1.8).material.opacity = 0.6;

    // The stars that are left.
    const starSpots: [number, number][] = {
      one: [[random() < 0.5 ? -0.66 : 0.68, 0.38 + random() * 0.3]],
      pair: [[0.56, 0.5], [0.7, 0.38]],
      few: [[-0.72, 0.6], [0.78, 0.22], [0.36, -0.74], [-0.3, 0.84]],
      none: [],
    }[a.stars] as [number, number][];
    const ember = new THREE.Color().setHSL((0.965 + mood.warmth * 0.085) % 1, 0.72, mix(0.4, 0.5, mood.cheer), THREE.SRGBColorSpace);
    const blooms: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
    starSpots.forEach(([x, y], index) => {
      const depth = 120 + random() * 60, radius = (a.stars === 'pair' ? 0.03 : 0.036 - index * 0.004) * depth * half * (0.85 + random() * 0.3);
      const where = at(x + (random() - 0.5) * 0.08, y + (random() - 0.5) * 0.08, depth);
      const star = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshBasicMaterial({ color: ember.clone().lerp(haze, 0.12) }));
      star.position.copy(where);
      root.add(star);
      for (let k = 0; k < 2; k++) { const spot = new THREE.Mesh(new THREE.SphereGeometry(radius * (0.05 + random() * 0.07), 8, 6), new THREE.MeshBasicMaterial({ color: ember.clone().multiplyScalar(0.6) })); spot.position.copy(where).add(new THREE.Vector3(random() - 0.5, random() - 0.5, 0).normalize().multiplyScalar(radius * random() * 0.7).applyQuaternion(camera.quaternion)).add(new THREE.Vector3(0, 0, radius * 0.95).applyQuaternion(camera.quaternion)); root.add(spot); }
      const bloom = new THREE.Mesh(new THREE.PlaneGeometry(radius * 9, radius * 9), soft(srgb(ember.clone().lerp(new THREE.Color('#ffd9c0'), 0.35))));
      bloom.position.copy(where).add(new THREE.Vector3(0, 0, -radius * 1.2).applyQuaternion(camera.quaternion)); upright(bloom);
      bloom.material.opacity = 0.8;
      root.add(bloom); blooms.push(bloom);
    });

    // Where the cast will hang, so the set dressing can keep clear of it.
    const spread = mix(0.8, 1.18, a.drift);
    const slots: [number, number, number][] = [[-0.6, 0.34, 8], [0.62, -0.3, 4], [0.5, 0.6, 15], [-0.66, -0.46, 2]];
    const clear = (x: number, y: number) => (Math.abs(x) > 0.45 || Math.abs(y) > 0.55) && slots.every(([sx, sy]) => Math.hypot(x - sx * spread, y - sy * spread) > 0.3);
    const freeSpot = (): [number, number] => { for (let tries = 0; tries < 40; tries++) { const x = (random() - 0.5) * 2.0, y = (random() - 0.5) * 1.9; if (clear(x, y)) return [x, y]; } return [0.9, 0.9]; };

    // Cold cinders: dead stars, seen only as dark balls with a thin lit edge.
    const cinderCount = 2 + Math.round(mood.density * 3) + (a.stars === 'none' ? 2 : 0);
    for (let i = 0; i < cinderCount; i++) {
      const [x, y] = freeSpot(), depth = 60 + random() * 70, radius = (0.016 + random() * 0.028) * depth * half;
      const cinder = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 2), new THREE.MeshStandardMaterial({ color: fade('#3f3a40', depth), roughness: 0.75, flatShading: random() < 0.5 }));
      cinder.position.copy(at(x, y, depth));
      cinder.rotation.set(random() * 6, random() * 6, 0);
      root.add(cinder);
      const frost = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.06, 20, 12), new THREE.MeshBasicMaterial({ color: '#f0e9ee', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.BackSide }));
      frost.position.copy(cinder.position);
      root.add(frost);
    }

    // Remnants: each built about one unit across, then set out small and far.
    const drifting: { node: THREE.Object3D; axis: THREE.Vector3; rate: number }[] = [];
    const lit = new THREE.MeshBasicMaterial({ color: '#ffdf9e' });
    const remnant = (depth: number) => {
      const g = new THREE.Group();
      const tone = (colour: string, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: fade(colour, depth), roughness: 0.8, ...options });
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; g.add(mesh); return mesh; };
      const rod = (from: [number, number, number], to: [number, number, number], r: number, material: THREE.Material) => { const p = new THREE.Vector3(...from), q = new THREE.Vector3(...to), d = q.clone().sub(p); const mesh = add(new THREE.CylinderGeometry(r, r, d.length(), 6), material); mesh.position.copy(p.add(q).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return mesh; };
      const metal = tone('#6d6a70', { metalness: 0.3 }), stone = tone('#8d857d'), dark = tone('#3b3a42');
      if (a.remnants === 'panels') {
        const face = tone(random() < 0.5 ? '#2c3344' : '#8f979d', { metalness: 0.3, roughness: 0.4, flatShading: true });
        const n = 2 + Math.floor(random() * 4);
        for (let k = 0; k < n; k++) { const hexagon = add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 6), face, (k % 3 - 1) * 0.35 + (Math.floor(k / 3) % 2) * 0.17, Math.floor(k / 3) * 0.3 - 0.15, (random() - 0.5) * 0.1); hexagon.rotation.x = Math.PI / 2 + (random() - 0.5) * mood.wear; }
        for (let k = 0; k < 4; k++) rod([(random() - 0.5) * 0.9, (random() - 0.5) * 0.6, -0.08], [(random() - 0.5) * 1.1, (random() - 0.5) * 0.9, -0.12 - random() * 0.2], 0.012, metal);
      } else if (a.remnants === 'rings') {
        const arc = 0.5 + random() * 1.0;
        const band = add(new THREE.TorusGeometry(0.9, 0.035, 6, 30, arc), metal); band.position.set(-0.75, -0.3, 0);
        const inner = add(new THREE.TorusGeometry(0.82, 0.012, 5, 30, arc * 0.8), metal); inner.position.set(-0.75, -0.3, 0);
        for (let k = 0; k < 3; k++) { const t = arc * (0.15 + k * 0.3); rod([-0.75 + Math.cos(t) * 0.9, -0.3 + Math.sin(t) * 0.9, 0], [-0.75 + Math.cos(t) * (0.45 + random() * 0.25), -0.3 + Math.sin(t) * (0.45 + random() * 0.25), (random() - 0.5) * 0.1], 0.01, metal); add(new THREE.BoxGeometry(0.07, 0.05, 0.09), dark, -0.75 + Math.cos(t) * 0.93, -0.3 + Math.sin(t) * 0.93, 0); }
      } else if (a.remnants === 'hulls') {
        const hull = add(new THREE.LatheGeometry([[0, -0.5], [0.1, -0.44], [0.15, -0.1], [0.14, 0.25], [0.07, 0.45], [0, 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 12), tone(['#7a7275', '#6a7078', '#857a6a'][Math.floor(random() * 3)], { metalness: 0.2 }));
        hull.rotation.z = Math.PI / 2;
        add(new THREE.BoxGeometry(0.16, 0.012, 0.42), metal, -0.3, 0, 0);
        add(new THREE.BoxGeometry(0.12, 0.2, 0.012), metal, -0.36, 0.1, 0);
        add(new THREE.IcosahedronGeometry(0.075, 0), dark, 0.05 + random() * 0.1, 0.07, 0.11);
        for (let k = 0; k < 5; k++) add(new THREE.BoxGeometry(0.025, 0.02, 0.01), random() < mood.cheer * 0.25 ? lit : dark, 0.3 - k * 0.07, 0.05, 0.125);
      } else if (a.remnants === 'domestic') {
        const kind = Math.floor(random() * 4);
        const paint = tone(['#7d8a84', '#9a8478', '#8a8a96', '#a39a84'][Math.floor(random() * 4)]);
        if (kind === 0) { rod([0, -0.5, 0], [0, 0.4, 0], 0.014, dark); rod([0, 0.4, 0], [0.18, 0.47, 0], 0.011, dark); add(new THREE.CylinderGeometry(0.03, 0.06, 0.07, 8), dark, 0.2, 0.44, 0); add(new THREE.SphereGeometry(0.035, 8, 6), random() < 0.25 + mood.cheer * 0.5 ? lit : tone('#b9b4ac'), 0.2, 0.4, 0); add(new THREE.CylinderGeometry(0.03, 0.045, 0.1, 8), dark, 0, -0.46, 0); }
        if (kind === 1) { add(new THREE.BoxGeometry(0.4, 0.82, 0.03), paint, 0.03, 0, 0.02).rotation.y = random() * 0.9; add(new THREE.BoxGeometry(0.05, 0.9, 0.07), stone, -0.22, 0, 0); add(new THREE.BoxGeometry(0.05, 0.9, 0.07), stone, 0.24, 0, 0); add(new THREE.BoxGeometry(0.52, 0.05, 0.07), stone, 0.01, 0.46, 0); add(new THREE.SphereGeometry(0.02, 8, 6), tone('#b79c5a', { metalness: 0.5 }), 0.15, -0.03, 0.06); }
        if (kind === 2) { for (const [x, y, w, h] of [[0, 0.3, 0.66, 0.04], [0, -0.3, 0.66, 0.04], [-0.31, 0, 0.04, 0.62], [0.31, 0, 0.04, 0.62], [0, 0, 0.025, 0.6], [0, 0, 0.62, 0.025]] as const) add(new THREE.BoxGeometry(w, h, 0.04), paint, x, y, 0); const curtain = add(new THREE.PlaneGeometry(0.22, 0.5), tone('#c9b3b0', { side: THREE.DoubleSide }), -0.17, 0.02, -0.03); curtain.rotation.z = 0.12; }
        if (kind === 3) { rod([0, -0.5, 0], [0, 0.5, 0], 0.013, dark); for (let k = 0; k < 2 + Math.floor(random() * 2); k++) { const sign = add(new THREE.BoxGeometry(0.34, 0.08, 0.012), paint, (k % 2 ? -1 : 1) * 0.17, 0.4 - k * 0.12, 0); sign.rotation.set(0, (random() - 0.5) * 0.8, (random() - 0.5) * mood.wear * 0.6); } }
      } else if (a.remnants === 'monuments') {
        const kind = Math.floor(random() * 3);
        if (kind === 0) { const drums = 3 + Math.floor(random() * 3); for (let k = 0; k < drums; k++) add(new THREE.CylinderGeometry(0.09, 0.095, 0.17, 12), stone, (random() - 0.5) * 0.04 * k, -0.4 + k * (0.18 + mood.wear * 0.03 * k), 0).rotation.z = (random() - 0.5) * 0.12 * k; add(new THREE.BoxGeometry(0.26, 0.05, 0.26), stone, 0.02, -0.4 + drums * 0.2, 0).rotation.z = 0.2; }
        if (kind === 1) { add(new THREE.BoxGeometry(0.14, 0.7, 0.14), stone, -0.3, -0.1, 0); add(new THREE.BoxGeometry(0.14, 0.5, 0.14), stone, 0.3, -0.2, 0); const span = add(new THREE.TorusGeometry(0.3, 0.07, 6, 14, Math.PI * 0.72), stone, 0, 0.25, 0); span.rotation.z = Math.PI * 0.28; }
        if (kind === 2) { add(new THREE.BoxGeometry(0.5, 0.1, 0.5), stone, 0, -0.35, 0); add(new THREE.BoxGeometry(0.36, 0.4, 0.36), stone, 0, -0.1, 0); add(new THREE.BoxGeometry(0.44, 0.06, 0.44), stone, 0, 0.13, 0); add(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 8), stone, -0.06, 0.24, 0.02).rotation.z = 0.2; add(new THREE.CylinderGeometry(0.045, 0.06, 0.1, 8), stone, 0.08, 0.21, -0.03); }
      }
      return g;
    };
    const remnantCount = a.remnants === 'nothing' ? 0 : Math.round(mix(4, 11, mood.density));
    for (let i = 0; i < remnantCount; i++) {
      const [x, y] = freeSpot(), depth = 24 + random() ** 1.4 * 60;
      const node = remnant(depth);
      node.position.copy(at(x, y, depth));
      node.scale.setScalar((0.13 + random() * 0.11) * depth * half * (a.remnants === 'domestic' ? 1.15 : 1));
      upright(node);
      node.rotateZ((random() - 0.5) * (0.5 + mood.wear * 1.6));
      node.rotateY((random() - 0.5) * 1.6);
      root.add(node);
      drifting.push({ node, axis: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize(), rate: (0.02 + random() * 0.06) * (random() < 0.5 ? -1 : 1) });
    }

    // What hangs in the air.
    let motes: THREE.InstancedMesh | null = null;
    if (a.air !== 'clear') {
      const count = { ash: 240, band: 520, frost: 130 }[a.air];
      const material = a.air === 'frost' ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color('#6d6468'), 0.55), roughness: 1, flatShading: true });
      motes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), material, count);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), size = new THREE.Vector3();
      const tilt = 0.25 + random() * 0.3, lift = (random() - 0.5) * 0.5;
      for (let i = 0; i < count; i++) {
        let x = (random() - 0.5) * 2.3, y = (random() - 0.5) * 2.3, depth = 9 + random() * 60;
        if (a.air === 'band') { y = lift + x * tilt + (random() + random() + random() - 1.5) * 0.16; depth = 55 + random() * 30; }
        const k = (a.air === 'band' ? 0.0022 : a.air === 'frost' ? 0.004 : 0.0045) * (0.5 + random()) * depth * half * 2;
        q.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
        motes.setMatrixAt(i, m.compose(at(x, y, depth), q, size.set(k, a.air === 'ash' ? k * 0.2 : k, k * (a.air === 'frost' ? 1 : 0.7))));
      }
      root.add(motes);
    }

    const trailMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(deep).lerp(new THREE.Color('#4a3d48'), 0.6) });
    const dotGeometry = new THREE.SphereGeometry(1, 6, 4);
    let trail: THREE.InstancedMesh | null = null;
    const origin = at(0.04, -0.1, 70);
    const placed: { holder: THREE.Object3D; home: THREE.Vector3; away: THREE.Vector3; hero: boolean; phase: number }[] = [];

    const place = (items: readonly Placeable[]) => {
      placed.length = 0;
      if (trail) { root.remove(trail); trail = null; }
      const dots: { at: THREE.Vector3; size: number }[] = [];
      items.forEach((item, index) => {
        // Measure what is really visible: haloes and tails are not the thing's size.
        item.holder.position.set(0, 0, 0); item.holder.rotation.set(0, 0, 0); item.holder.scale.setScalar(1);
        item.holder.updateMatrixWorld(true);
        const seen = visibleBounds(item.holder).getSize(new THREE.Vector3());
        const natural = Math.max(seen.x, seen.y, seen.z) > 0.01 ? Math.max(seen.x, seen.y, seen.z) : Math.max(item.height, item.radius * 2, 0.05);
        let centre: THREE.Vector3, size: number;
        if (index === 0) { centre = new THREE.Vector3(0, 0, 0); size = 4.2; }
        else {
          const [sx, sy, back] = slots[(index - 1) % slots.length];
          const depth = distance + back * mix(0.5, 2.2, a.drift) + Math.floor((index - 1) / slots.length) * 12;
          centre = at(sx * spread, sy * spread, depth);
          size = 4.2 * mix(0.64, 0.52, a.drift);
        }
        const scale = size / natural, tall = (seen.y > 0.01 ? seen.y : item.height) * scale;
        item.holder.scale.setScalar(scale);
        // Things face the lens at a three-quarter turn; supports have tipped a little, untended.
        item.holder.rotation.set(index ? (random() - 0.5) * 0.3 * a.drift : 0, yaw + 0.3 + (random() - 0.5) * (index ? 1.4 : 0.3), index ? (random() - 0.5) * (0.25 + a.drift * 0.5) : (random() - 0.5) * 0.06);
        const down = new THREE.Vector3(0, -tall / 2, 0).applyEuler(item.holder.rotation);
        const home = centre.clone().add(down);
        item.holder.position.copy(home);
        item.holder.updateMatrixWorld(true);
        // Re-centre on what was actually built, which may not sit evenly over its origin.
        const box = visibleBounds(item.holder);
        if (!box.isEmpty()) { home.add(centre.clone().sub(box.getCenter(new THREE.Vector3()))); item.holder.position.copy(home); item.holder.updateMatrixWorld(true); }
        placed.push({ holder: item.holder, home, away: centre.clone().sub(origin).normalize(), hero: index === 0, phase: random() * 6 });
        if (a.trails && index > 0) {
          const edge = centre.clone().addScaledVector(centre.clone().sub(origin).normalize(), -size * 0.62);
          for (let k = 2; k < 30; k++) { const t = k / 30; dots.push({ at: origin.clone().lerp(edge, t), size: mix(0.0034, 0.0026, t) * origin.clone().lerp(edge, t).distanceTo(camera.position) }); }
        }
      });
      if (dots.length) {
        trail = new THREE.InstancedMesh(dotGeometry, trailMaterial, dots.length);
        const m = new THREE.Matrix4();
        dots.forEach((dot, i) => trail!.setMatrixAt(i, m.makeScale(dot.size, dot.size, dot.size).setPosition(dot.at)));
        root.add(trail);
      }
      key.target.position.set(0, 0, 0);
    };

    const pace = mix(0.25, 1.6, mood.energy);
    const spin = new THREE.Quaternion();
    return {
      object: root, camera, background, capacity: 5, ground: null, keyLight: key, place,
      update(dt, time) {
        for (const part of drifting) part.node.quaternion.premultiply(spin.setFromAxisAngle(part.axis, part.rate * pace * dt));
        if (motes) motes.position.set(Math.sin(time * 0.05 * pace) * 0.6, a.air === 'ash' ? -((time * 0.04 * pace) % 1) * 0.5 : Math.cos(time * 0.04 * pace) * 0.3, 0);
        blooms.forEach((bloom, i) => { bloom.material.opacity = 0.8 + Math.sin(time * (0.6 + i * 0.23)) * 0.08 + Math.sin(time * 3.1 + i) * 0.03; });
        for (const item of placed) {
          // Everything eases outward and back, never quite returning: a slow breath of drifting apart.
          const ease = item.hero ? 0 : (Math.sin(time * 0.11 * pace + item.phase) * 0.5 + 0.5) * 0.35;
          item.holder.position.copy(item.home).addScaledVector(item.away, ease);
          item.holder.position.y += Math.sin(time * 0.3 * pace + item.phase) * (item.hero ? 0.04 : 0.07);
          if (!item.hero) item.holder.rotation.y += dt * 0.025 * pace;
        }
      },
      dispose() { key.shadow.map?.dispose(); dotGeometry.dispose(); trailMaterial.dispose(); lit.dispose(); disposeTree(root); },
    };
  },
});
