import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix } from '@conjure/kit';

const WATERS = {
  gold: 'Pale green-gold, clear and sunlit, the classic ditch-water glow.',
  pea: 'Pea-soup green, thick with an algal bloom.',
  tea: 'Tea-brown peat water, amber and tannic.',
  milk: 'Milky grey-white, cloudy with clay or bacteria.',
  blue: 'Cold clear blue-green meltwater.',
} as const;
const WATER: Record<keyof typeof WATERS, [string, string, string]> = {
  gold: ['#f8f4d2', '#dbe0a0', '#9cab60'],
  pea: ['#eef5bc', '#b7d470', '#6c983c'],
  tea: ['#f6e6ba', '#dcb870', '#9c6c34'],
  milk: ['#f5f4ec', '#dddccf', '#a8a99c'],
  blue: ['#eff9f8', '#bfe0e2', '#6ea4ae'],
};

export default defineWorld({
  questions: {
    water: choice('What is the water like?', WATERS),
    vessel: choice('Where is the drop?', {
      free: 'Nowhere in particular: a free hanging bead of water.',
      slide: 'Sitting on a glass microscope slide with a paper label.',
      pipette: 'Hanging from the tip of a glass pipette.',
      leaf: 'Resting on a green leaf like dew.',
      duckweed: 'Clinging under a floating duckweed frond, whose pale roots dangle down into it.',
    }),
    drift: choice('What drifts in the water besides the creatures?', {
      motes: 'Only fine motes of silt.',
      leafbits: 'Brown flakes of rotting leaf skeleton.',
      threads: 'Loose green threads of algae.',
      sand: 'Angular grains of quartz sand.',
      bubbles: 'Silver air bubbles.',
    }),
    bed: choice('What lies at the bottom of the drop?', {
      open: 'Nothing; open water all the way down.',
      silt: 'A soft dark bed of silt.',
      litter: 'A bed of silt strewn with leaf litter and grit.',
    }),
    state: choice('What is happening to the drop?', {
      fresh: 'Freshly collected and teeming.',
      evaporating: 'Drying out under the lamp: sagging flat, with white salt crystals growing round its edge.',
      dyed: 'Someone has added a drop of stain, and a coloured cloud is unfurling through it.',
      stagnant: 'Forgotten for days: a wrinkled grey scum has formed across the top.',
      freezing: 'Freezing from one side, needles of ice creeping inward.',
    }),
    light: choice('How is it lit?', {
      bright: 'Bright-field: even pale light from below, everything in clear silhouette.',
      shafts: 'Sunlight through the meniscus: slanting shafts and strong dancing caustics.',
      dark: 'Dark-field: a dusky teal drop in which every edge glows.',
    }),
    view: choice('Where are we looking from?', {
      whole: 'Outside, seeing the whole drop as a round lit world.',
      immersed: 'Inside the drop, among the creatures, the wall of the drop far behind them.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const art = new Sculpture(context);
    const root = art.root;
    const R = 6;
    const squash = a.state === 'evaporating' ? 0.7 : 1;
    const dark = a.light === 'dark', whole = a.view === 'whole';
    const rnd = (from: number, to: number) => mix(from, to, random());

    // Water colours, pushed by the mood.
    const tones = WATER[a.water].map((hex) => {
      const c = new THREE.Color(hex);
      c.offsetHSL((mood.warmth - 0.5) * -0.05, (mood.cheer - 0.5) * 0.18, -mood.wear * 0.06);
      if (a.state === 'stagnant') c.lerp(new THREE.Color('#a9a78c'), 0.35);
      if (dark) c.lerp(new THREE.Color('#2f5f66'), 0.62).multiplyScalar(1.05);
      return c;
    });
    const background = new THREE.Color(dark ? '#6d8384' : '#ebe8dc').lerp(tones[1], whole ? 0.12 : 0.9);

    // The wall of the drop, painted: meniscus sky above, deeper water and caustics below.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, `#${tones[0].getHexString()}`);
    gradient.addColorStop(0.2, `#${tones[0].getHexString()}`);
    gradient.addColorStop(0.5, `#${tones[1].getHexString()}`);
    gradient.addColorStop(1, `#${tones[2].getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    ctx.lineCap = 'round';
    const ripples = a.light === 'shafts' ? 110 : 60;
    for (let i = 0; i < ripples; i++) {
      const x = random() * 1024, y = mix(250, 500, Math.sqrt(random())), w = rnd(30, 110), h = rnd(8, 26);
      ctx.strokeStyle = `rgba(255,255,${dark ? 255 : 225},${rnd(0.15, a.light === 'shafts' ? 0.45 : 0.3)})`;
      ctx.lineWidth = rnd(1, 3.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + w * 0.3, y - h, x + w * 0.7, y + h, x + w, y + rnd(-6, 6));
      ctx.bezierCurveTo(x + w * 0.6, y + h * 1.6, x + w * 0.2, y + h * 0.4, x - rnd(5, 30), y + h);
      ctx.stroke();
    }
    // The meniscus: a bright band where the surface curves over, and the fine dark line under it.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(0, 96, 1024, 16);
    ctx.fillStyle = dark ? 'rgba(220,255,250,0.5)' : 'rgba(70,90,40,0.3)';
    ctx.fillRect(0, 112, 1024, 3);
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    skin.wrapS = THREE.RepeatWrapping;
    const wall = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 40), new THREE.MeshBasicMaterial({ map: skin, side: THREE.BackSide, depthWrite: false }));
    wall.scale.y = squash;
    wall.renderOrder = -2;
    root.add(wall);

    // Light: the meniscus sky above, and the lamp below for bright-field.
    root.add(new THREE.HemisphereLight(tones[0], tones[2], dark ? 1.1 : 1.5));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.5, 0.11, mood.warmth), 0.4, 0.9), dark ? 3.2 : 2.3);
    key.position.set(mix(-7, 7, mood.daylight), 13, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    const shadow = key.shadow.camera;
    shadow.left = shadow.bottom = -R * 1.2;
    shadow.right = shadow.top = R * 1.2;
    shadow.near = 1; shadow.far = 40;
    root.add(key, key.target);
    const lamp = new THREE.DirectionalLight('#fffdf0', a.light === 'bright' ? 1.1 : 0.45);
    lamp.position.set(2, -10, 6);
    root.add(lamp);

    const drift = new THREE.Group();
    root.add(drift);
    const inDrop = (reach = 0.86, low = -1, high = 1): [number, number, number] => {
      for (;;) {
        const p: [number, number, number] = [rnd(-1, 1), rnd(low, high), rnd(-1, 1)];
        if (Math.hypot(...p) < 1) return [p[0] * R * reach, p[1] * R * reach * squash, (!whole && p[2] * R * reach > 1.5 ? -p[2] : p[2]) * R * reach];
      }
    };
    const instances = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, items: { at: [number, number, number]; size: [number, number, number]; color?: THREE.ColorRepresentation; turn?: boolean }[]) => {
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      items.forEach((item, i) => {
        e.set(item.turn === false ? 0 : random() * 6.3, random() * 6.3, item.turn === false ? 0 : random() * 6.3);
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...item.at), q.setFromEuler(e), new THREE.Vector3(...item.size)));
        if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
      });
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Fine motes are always there; the mood decides how many.
    const moteColours = ['#6f6238', '#8f8a4a', '#4f5a30', '#a8905a', '#3f4a34'];
    instances(drift, new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      Array.from({ length: Math.round(mix(50, 240, mood.density) * mix(1, 1.6, mood.wear)) }, (_unused, i) => { const size = rnd(0.025, 0.085); return { at: inDrop(0.92), size: [size, size * rnd(0.5, 1), size] as [number, number, number], color: moteColours[i % 5] }; }));
    if (a.drift === 'leafbits') {
      instances(drift, new THREE.CircleGeometry(1, 7), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }),
        Array.from({ length: Math.round(mix(9, 22, mood.density)) }, (_unused, i) => ({ at: inDrop(0.82), size: [rnd(0.2, 0.6), rnd(0.12, 0.4), 1] as [number, number, number], color: ['#7a5a30', '#94703c', '#5f4a2c'][i % 3] })));
    } else if (a.drift === 'threads') {
      const thread = art.material('#4f9a3a', { roughness: 0.6 });
      for (let i = 0; i < Math.round(mix(6, 14, mood.density)); i++) {
        const start = new THREE.Vector3(...inDrop(0.7)), dir = new THREE.Vector3(rnd(-1, 1), rnd(-0.6, 0.6), rnd(-1, 1)).normalize(), points: THREE.Vector3[] = [];
        for (let k = 0; k < 5; k++) points.push(start.clone().addScaledVector(dir, k * rnd(0.4, 0.7)).add(new THREE.Vector3(rnd(-0.3, 0.3), rnd(-0.3, 0.3), rnd(-0.3, 0.3))));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, rnd(0.025, 0.05), 5), thread);
        tube.castShadow = true;
        drift.add(tube);
      }
    } else if (a.drift === 'sand') {
      instances(drift, new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.3, flatShading: true }),
        Array.from({ length: Math.round(mix(10, 26, mood.density)) }, (_unused, i) => { const size = rnd(0.12, 0.34); return { at: inDrop(0.8, -1, 0.1), size: [size, size * rnd(0.6, 1), size * rnd(0.7, 1.2)] as [number, number, number], color: ['#e6d2a8', '#d8c0c0', '#c9c9b8', '#f0e8d8'][i % 4] }; }));
    } else if (a.drift === 'bubbles') {
      const pearl = new THREE.MeshPhysicalMaterial({ color: '#f4fcff', roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.6 });
      const edge = new THREE.MeshBasicMaterial({ color: dark ? '#e8ffff' : '#56737a', side: THREE.BackSide, transparent: true, opacity: 0.5, depthWrite: false });
      const beads = Array.from({ length: Math.round(mix(8, 22, mood.density)) }, () => { const size = rnd(0.1, 0.42); return { at: inDrop(0.8, -0.3, 1), size: [size, size, size] as [number, number, number], turn: false }; });
      instances(drift, new THREE.SphereGeometry(1, 16, 12), pearl, beads).renderOrder = 2;
      instances(drift, new THREE.SphereGeometry(1.07, 16, 12), edge, beads).castShadow = false;
    }

    // The bottom of the drop.
    let ground: THREE.Object3D | null = null;
    if (a.bed !== 'open') {
      const level = -0.74, siltColour = new THREE.Color('#6a5c3a').lerp(tones[2], 0.3);
      const silt = art.material(siltColour, { roughness: 1 });
      const bowl = art.mesh(new THREE.SphereGeometry(R * 0.985, 48, 10, 0, Math.PI * 2, Math.acos(level), Math.PI - Math.acos(level)), art.material(siltColour.clone().multiplyScalar(0.8), { roughness: 1, side: THREE.BackSide }));
      bowl.scale.y = squash;
      bowl.castShadow = false;
      const top = art.mesh(new THREE.CircleGeometry(R * Math.sqrt(1 - level * level) * 0.985, 48), silt, [0, R * level * squash, 0]);
      top.rotation.x = -Math.PI / 2;
      ground = top;
      const reach = R * Math.sqrt(1 - level * level) * 0.9;
      const onBed = (): [number, number, number] => { const angle = random() * 6.3, d = Math.sqrt(random()) * reach; return [Math.cos(angle) * d, R * level * squash + 0.03, Math.sin(angle) * d]; };
      instances(root, new THREE.DodecahedronGeometry(1, 0), art.material(siltColour.clone().multiplyScalar(1.15), { roughness: 1, flatShading: true }),
        Array.from({ length: 26 }, () => { const size = rnd(0.15, 0.55); return { at: onBed(), size: [size, size * 0.45, size] as [number, number, number], turn: false }; }));
      if (a.bed === 'litter') {
        instances(root, new THREE.CircleGeometry(1, 8), new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide }),
          Array.from({ length: Math.round(mix(10, 24, mood.density)) }, (_unused, i) => { const at = onBed(); at[1] += rnd(0.08, 0.3); return { at, size: [rnd(0.4, 0.9), rnd(0.25, 0.5), 1] as [number, number, number], color: ['#8a6a34', '#a8843c', '#6a5230', '#7f8a3c'][i % 4] }; }));
        for (let i = 0; i < 5; i++) { const at = onBed(); art.rod(at, [at[0] + rnd(-1.2, 1.2), at[1] + rnd(0.1, 0.5), at[2] + rnd(-1.2, 1.2)], 0.035, art.material('#5a4428')); }
      }
    }

    // What is happening to the drop.
    if (a.state === 'evaporating') {
      const salt = new THREE.MeshStandardMaterial({ color: '#f6f4ea', roughness: 0.35 });
      instances(root, new THREE.BoxGeometry(1, 1, 1), salt, Array.from({ length: Math.round(mix(50, 110, mood.wear)) }, () => {
        const angle = random() * Math.PI * 2, low = rnd(-0.95, -0.45), ring = R * Math.sqrt(1 - low * low) * rnd(0.97, 1.08), size = rnd(0.12, 0.5) * (low < -0.8 ? 1.3 : 1);
        return { at: [Math.cos(angle) * ring, R * low * squash, Math.sin(angle) * ring] as [number, number, number], size: [size, size, size] as [number, number, number] };
      }));
    } else if (a.state === 'dyed') {
      const stain = new THREE.Color(['#b8245a', '#2a5fc0', '#6a34b0'][Math.floor(random() * 3)]);
      const ink = new THREE.MeshStandardMaterial({ color: stain, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1, emissive: stain, emissiveIntensity: 0.25 });
      const source = new THREE.Vector3(rnd(-2.5, 2.5), R * 0.8 * squash, rnd(-2, 0));
      for (let i = 0; i < 6; i++) {
        const points = [source.clone()];
        let p = source.clone();
        for (let k = 0; k < 5; k++) { p = p.clone().add(new THREE.Vector3(rnd(-1.4, 1.4), -rnd(0.8, 1.9) * squash, rnd(-1.2, 1.2))); if (p.length() > R * 0.85) p.multiplyScalar((R * 0.85) / p.length()); points.push(p); }
        const wisp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, rnd(0.1, 0.3), 8), ink);
        root.add(wisp);
        const puff = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.4, 0.9), 14, 10), ink);
        puff.position.copy(p);
        puff.scale.y = 0.6;
        root.add(puff);
      }
    } else if (a.state === 'stagnant') {
      const level = 0.66, scumColour = new THREE.Color('#8f8d76').lerp(tones[1], 0.25);
      const film = new THREE.CircleGeometry(R * Math.sqrt(1 - level * level) * 0.99, 40, 0, Math.PI * 2);
      const p = film.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 2.3 + p.getY(i) * 1.1) * 0.09 + Math.sin(p.getY(i) * 3.7) * 0.05);
      film.computeVertexNormals();
      const scum = art.mesh(film, art.material(scumColour, { roughness: 1, side: THREE.DoubleSide }), [0, R * level, 0]);
      scum.rotation.x = Math.PI / 2;
      instances(root, new THREE.SphereGeometry(1, 8, 6), art.material(scumColour.clone().multiplyScalar(0.8), { roughness: 1 }),
        Array.from({ length: 34 }, () => { const angle = random() * 6.3, d = Math.sqrt(random()) * R * 0.7, size = rnd(0.08, 0.3); return { at: [Math.cos(angle) * d, R * level - rnd(0.05, 0.5), Math.sin(angle) * d] as [number, number, number], size: [size, size * rnd(1, 2.4), size] as [number, number, number], turn: false }; }));
    } else if (a.state === 'freezing') {
      const ice = new THREE.MeshPhysicalMaterial({ color: '#dff2f8', roughness: 0.1, clearcoat: 1, flatShading: true });
      const side = random() < 0.5 ? -1 : 1;
      const needle = new THREE.ConeGeometry(0.09, 1, 4);
      needle.translate(0, 0.5, 0);
      const needles = new THREE.InstancedMesh(needle, ice, Math.round(mix(26, 60, 1 - mood.warmth)));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < needles.count; i++) {
        const from = new THREE.Vector3(side * rnd(0.45, 1), rnd(-0.8, 0.8), rnd(-0.7, 0.7)).normalize().multiplyScalar(R * 0.98);
        const toward = new THREE.Vector3(-side * rnd(0.5, 1), rnd(-0.5, 0.5), rnd(-0.5, 0.5)).normalize();
        needles.setMatrixAt(i, m.compose(from, q.setFromUnitVectors(up, toward), new THREE.Vector3(rnd(0.6, 1.8), rnd(1, 4.2), rnd(0.6, 1.8))));
      }
      needles.castShadow = true;
      root.add(needles);
    }

    if (a.light === 'shafts') {
      const beam = new THREE.MeshBasicMaterial({ color: '#fffbe0', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(rnd(0.15, 0.4), rnd(0.6, 1.3), R * 1.7, 12, 1, true), beam);
        shaft.position.set(rnd(-3.5, 3.5), R * 0.05, rnd(-3, 1));
        shaft.rotation.z = mix(0.5, -0.5, mood.daylight) + rnd(-0.08, 0.08);
        root.add(shaft);
      }
    }

    // Where the drop is.
    const glass = new THREE.MeshPhysicalMaterial({ color: '#d4e6ea', roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.6 });
    const bottom = -R * squash;
    if (a.vessel === 'slide') {
      art.box([R * 5, 0.3, R * 2.2], [0, bottom - 0.1, 0], glass);
      art.box([R * 5.02, 0.06, 0.06], [0, bottom + 0.06, R * 1.1], art.material('#8fa8ae'));
      const label = art.label('POND · JULY', R * 1.1, R * 0.5, [-R * 1.85, bottom + 0.07, R * 0.55], '#3a4a5a', '#f4f0e0');
      label.rotation.x = -Math.PI / 2;
    } else if (a.vessel === 'pipette') {
      const tip = art.mesh(new THREE.CylinderGeometry(R * 0.42, R * 0.16, R * 2.2, 20, 1, true), glass, [0, R * squash + R * 0.95, 0]);
      (tip.material as THREE.Material).side = THREE.DoubleSide;
      art.ring(R * 0.16, 0.05, [0, R * squash - R * 0.14, 0], art.material('#8fa8ae')).rotation.x = Math.PI / 2;
      art.cylinder(R * 0.12, R * 0.12, R * 1.6, [0, R * squash + R * 0.8, 0], new THREE.MeshBasicMaterial({ color: tones[1] }), 16);
    } else if (a.vessel === 'leaf') {
      const leaf = art.ball([R * 2.6, 0.4, R * 1.5], [0, bottom - 0.25, 0], art.material('#4f8f3c', { roughness: 0.6 }), 28);
      leaf.rotation.z = 0.04;
      const vein = art.material('#7fb85a');
      art.tube([[-R * 2.5, bottom + 0.12, 0], [0, bottom + 0.17, 0], [R * 2.5, bottom + 0.1, 0]], 0.09, vein);
      for (let i = -4; i <= 4; i++) if (i) art.rod([i * R * 0.5, bottom + 0.13, 0], [i * R * 0.5 + R * 0.4, bottom + 0.05, (i % 2 ? 1 : -1) * R * 1.1], 0.04, vein, 0.01);
    } else if (a.vessel === 'duckweed') {
      art.ball([R * 1.25, 0.45, R * 0.95], [0, R * squash + 0.1, 0], art.material('#6aa83c', { roughness: 0.5 }), 24);
      art.ball([R * 0.7, 0.35, R * 0.6], [R * 1.2, R * squash + 0.2, -R * 0.4], art.material('#7fb848', { roughness: 0.5 }), 20);
      const rootMat = art.material('#dfe6b8', { roughness: 0.5 });
      for (let i = 0; i < 3; i++) {
        const x = rnd(-2.6, 2.6), z = rnd(-2.5, -0.5), depth = rnd(0.2, 0.9);
        art.tube([[x, R * squash, z], [x + rnd(-0.4, 0.4), R * 0.4 * squash, z], [x + rnd(-0.6, 0.6), -R * depth * 0.4 * squash, z + rnd(-0.4, 0.4)], [x + rnd(-0.8, 0.8), -R * depth * squash * 0.75, z]], 0.11, rootMat);
      }
    }

    // Seen from outside, the drop has a dark edge and a pair of window glints on its skin.
    const camera = new THREE.PerspectiveCamera(whole ? 34 : 62, 1, whole ? 4 : 0.3, whole ? 48 : 30);
    const eye = whole ? new THREE.Vector3(0, 1.7, 22) : new THREE.Vector3(0, 0.5, 5.6);
    camera.position.copy(eye);
    camera.lookAt(0, whole ? -0.15 : 0, whole ? 0 : -1.5);
    root.add(camera);
    if (whole) {
      const distance = eye.length(), sine = R / distance;
      const outline = new THREE.Mesh(new THREE.TorusGeometry(R * Math.sqrt(1 - sine * sine), 0.055, 6, 120), new THREE.MeshBasicMaterial({ color: tones[2].clone().multiplyScalar(dark ? 1.9 : 0.55) }));
      outline.position.copy(eye).multiplyScalar((R * sine) / distance);
      outline.lookAt(eye);
      outline.scale.y = squash;
      root.add(outline);
      const glint = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
      for (const [radius, start, length, width] of [[0.86, 2.0, 0.55, 0.11], [0.78, 2.12, 0.25, 0.07], [0.88, 5.3, 0.22, 0.05]] as const) {
        const arc = new THREE.Mesh(new THREE.TorusGeometry(R * radius, width, 6, 30, length), glint);
        arc.position.copy(outline.position);
        arc.lookAt(eye);
        arc.rotateZ(start);
        arc.scale.y = squash;
        arc.renderOrder = 5;
        root.add(arc);
      }
    }

    // Suspended at different depths: nobody stands on anything here.
    const slots: readonly (readonly [number, number, number, number])[] = [
      [0, -0.1, 1.2, 5.2], [-3.4, 2.0, -2.0, 3.0], [3.5, -1.6, -1.2, 3.0], [-3.1, -2.6, 0.4, 2.4], [3.1, 2.7, -2.8, 2.4], [0.3, 3.6, -3.4, 2.0],
    ];
    const floaters: { holder: THREE.Group; y: number; tilt: number; phase: number }[] = [];
    const place = (items: readonly Placeable[]) => {
      floaters.length = 0;
      items.forEach((item, index) => {
        const [x, y, z, room] = slots[index % slots.length];
        const scale = (room * (whole ? 1 : 0.8)) / Math.max(item.height, item.radius * 2, 0.001);
        const tilt = rnd(-0.22, 0.22);
        item.holder.scale.setScalar(scale);
        item.holder.rotation.set(rnd(-0.12, 0.18), rnd(-0.5, 0.5), tilt);
        const base = y * squash * (index ? 1 : squash) - (item.height * scale) / 2;
        item.holder.position.set(x, base, z + (whole ? 0 : -1.8));
        item.holder.updateMatrixWorld(true);
        floaters.push({ holder: item.holder, y: base, tilt, phase: index * 1.7 + rnd(0, 3) });
      });
      key.target.position.set(0, 0, 0);
    };

    const calm = mix(0.25, 1, mood.energy);
    return {
      object: root, camera, background, capacity: slots.length, ground, keyLight: key, place,
      update(dt, time) {
        if (whole) drift.rotation.y += dt * 0.025 * calm;
        else drift.rotation.y = Math.sin(time * 0.05 * calm) * 0.12;
        for (const floater of floaters) {
          floater.holder.position.y = floater.y + Math.sin(time * 0.7 * calm + floater.phase) * 0.13 * calm;
          floater.holder.rotation.z = floater.tilt + Math.sin(time * 0.45 * calm + floater.phase * 2) * 0.05 * calm;
        }
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
