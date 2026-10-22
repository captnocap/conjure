import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, choice, defineWorld, disposeTree, mix, score, visibleBounds } from '@conjure/kit';

const SKIES = {
  slate: 'Slate indigo dusk, cold and exact.',
  teal: 'Deep grey-teal, like old instrument glass.',
  plum: 'Bruised plum, the colour left behind after something violent.',
  ash: 'Flat ash grey, everything settled and silent.',
  bone: 'Pale bone paper, a star chart of the wreckage.',
} as const;
const SKY_TINT: Record<keyof typeof SKIES, string> = { slate: '#4a5470', teal: '#43605f', plum: '#5c4865', ash: '#8b8d94', bone: '#d8d5ca' };
const GASES = {
  ember: 'Ember red and rust threaded with teal.',
  oxygen: 'Ghostly teal and blue.',
  ashen: 'Colourless grey ash with a few pale gold threads.',
  violet: 'Violet and rose, bruised and electric.',
} as const;
const GAS_TINT: Record<keyof typeof GASES, [string, string, string]> = {
  ember: ['#e2452f', '#f08a3c', '#2fb3a4'], oxygen: ['#2fc2b4', '#4f8df0', '#a8e6e0'], ashen: ['#b9b6ae', '#8f8c86', '#e3c26a'], violet: ['#a35cf0', '#e05a9a', '#6f7cf0'],
};
const VIEW_PITCH = { survey: 30, plane: 13, chart: 56 } as const;
const EXTENT = 9; // the set is built for a frame this wide and scaled to fit the cast

type P = [number, number, number];

export default defineWorld({
  questions: {
    sky: choice('What colour is the void here?', SKIES),
    filaments: choice('What form do the shredded supernova filaments take?', {
      veil: 'Long combed curtains sweeping across the background.',
      net: 'A knotted lace of threads on every side.',
      shreds: 'A few thick torn ribbons, the rest long gone.',
      ring: 'One enormous broken ring of bundled strands circling the whole scene.',
    }),
    gas: choice('What colours are the filaments?', GASES),
    age: score('How long ago was the catastrophe?', ['Recent: tight, bright and still hot', 'Centuries: spread out and cooling', 'Ancient: thin, faint, almost dispersed']),
    beam: choice('Where is the lighthouse beam right now?', {
      hero: 'Full on the hero at the centre, raking across it.',
      grazing: 'Just off to one side, about to arrive or just gone.',
      away: 'Swung away into the distance: the field waits in the dim for the next pass.',
    }),
    orbits: choice('How are the orbits marked?', {
      bare: 'Not at all: things simply hang there.',
      lines: 'Fine drawn ellipses, like a diagram.',
      clock: 'Ellipses ticked like clock faces, with minute marks.',
      trails: 'Faint trails of grit strung along each path.',
    }),
    debris: choice('What is the drifting debris made of?', {
      rock: 'Dull broken rock.',
      plates: 'Flat torn plates and spars of wreckage.',
      ice: 'Long pale ice crystals.',
      cinders: 'Dark cinders still glowing at their edges.',
    }),
    view: choice('Where do we watch from?', {
      survey: 'An oblique view from above, the orbits open like a model.',
      plane: 'Low, nearly in the orbital plane: things pass in front of one another.',
      chart: 'High overhead, a chart of the ellipses.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const set = new THREE.Group();
    root.add(set);
    const pale = a.sky === 'bone' || a.sky === 'ash';
    const background = new THREE.Color(SKY_TINT[a.sky]);
    const glow = mix(0.7, 1.3, mood.cheer) * mix(1.25, 0.6, a.age);
    const yaw = THREE.MathUtils.degToRad(28), pitch = THREE.MathUtils.degToRad(VIEW_PITCH[a.view]);
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const dir = () => { const y = random() * 2 - 1, phi = random() * Math.PI * 2, r = Math.sqrt(1 - y * y); return new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r); };
    const add = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T) => { parent.add(child); return child; };

    // Light: a dim cold ambient, a key, and the pulsar's raking spot.
    root.add(new THREE.HemisphereLight(pale ? '#ffffff' : '#cfd8ff', pale ? '#8a867c' : '#39324a', pale ? 1.25 : 1.05));
    const beamTint = new THREE.Color().setHSL(mix(0.57, 0.11, mood.warmth), 0.8, 0.72);
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.6, 0.09, mood.warmth), 0.35, 0.86), 1.9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const rake = new THREE.SpotLight(beamTint, 0, 0, 0.16, 0.6, 0);
    root.add(rake, rake.target);

    // Filaments: strands on a wide shell, kept out of the foreground.
    const tints = GAS_TINT[a.gas].map((hex) => new THREE.Color(hex).lerp(new THREE.Color(pale ? '#6f6a72' : '#a9a7b4'), a.age * 0.35 + mood.wear * 0.1));
    if (pale) tints.forEach((tint) => tint.multiplyScalar(0.72));
    const strands: THREE.BufferGeometry[][] = [[], [], []];
    const shell = EXTENT * mix(0.72, 1.12, a.age);
    const torn = mix(0.02, 0.3, a.age * 0.7 + mood.wear * 0.3);
    const strand = (start: THREE.Vector3, heading: THREE.Vector3, steps: number, turn: number, thick: number, depth: number, tint: number) => {
      const d = start.clone().normalize(), h = heading.clone().sub(d.clone().multiplyScalar(heading.dot(d))).normalize();
      const axis = new THREE.Vector3();
      let points: THREE.Vector3[] = [];
      const flush = () => {
        if (points.length >= 3) strands[tint].push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length * 3, thick, 5, false));
        points = [];
      };
      for (let i = 0; i < steps; i++) {
        const hidden = d.dot(toCamera) > 0.18 || random() < torn * 0.25;
        if (hidden) flush();
        else points.push(d.clone().multiplyScalar(shell * depth * (1 + Math.sin(i * 0.9 + thick * 900) * 0.035)));
        axis.crossVectors(d, h).normalize();
        d.applyAxisAngle(axis, 0.075).normalize();
        h.applyAxisAngle(axis, 0.075).applyAxisAngle(d, (random() - 0.5) * turn).normalize();
      }
      flush();
    };
    const amount = mix(0.65, 1.3, mood.density) * mix(1.1, 0.7, a.age);
    const weight = mix(1.2, 0.8, a.age);
    if (a.filaments === 'veil') {
      for (let c = 0; c < Math.round(6 * amount); c++) {
        const start = dir(), heading = dir(), side = new THREE.Vector3().crossVectors(start, heading).normalize();
        for (let k = 0; k < 9; k++) strand(start.clone().addScaledVector(side, (k - 4) * 0.035).normalize(), heading, Math.round(mix(14, 30, random())), 0.16, mix(0.035, 0.07, random()) * weight, mix(0.96, 1.04, random()), (c + (k % 4 === 0 ? 1 : 0)) % 3);
      }
    } else if (a.filaments === 'net') {
      for (let i = 0; i < Math.round(90 * amount); i++) strand(dir(), dir(), Math.round(mix(8, 22, random())), 0.9, mix(0.03, 0.06, random()) * weight, mix(0.9, 1.08, random()), i % 3);
    } else if (a.filaments === 'shreds') {
      for (let i = 0; i < Math.round(13 * amount); i++) {
        const start = dir(), heading = dir(), side = new THREE.Vector3().crossVectors(start, heading).normalize();
        for (let k = 0; k < 3; k++) strand(start.clone().addScaledVector(side, k * 0.02).normalize(), heading, Math.round(mix(6, 12, random())), 0.5, mix(0.09, 0.16, random()) * weight, 1 + k * 0.012, i % 3);
      }
    } else {
      const normal = new THREE.Vector3(mix(-0.3, 0.3, random()), 1, mix(-0.5, -0.15, random())).normalize();
      const start = new THREE.Vector3(1, 0, 0).cross(normal).normalize(), heading = new THREE.Vector3().crossVectors(normal, start);
      for (let k = 0; k < Math.round(26 * amount); k++) {
        const lift = (random() - 0.5) * 0.22;
        const from = start.clone().applyAxisAngle(normal, random() * Math.PI * 2);
        strand(from.clone().addScaledVector(normal, lift).normalize(), heading.clone().applyAxisAngle(normal, Math.atan2(from.dot(heading), from.dot(start))), Math.round(mix(20, 60, random())), 0.1, mix(0.035, 0.08, random()) * weight, mix(0.93, 1.05, random()), k % 3);
      }
    }
    const filamentPaints = tints.map((tint) => new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.5 * glow, roughness: 0.5 }));
    strands.forEach((group, index) => {
      if (!group.length) return;
      const merged = mergeGeometries(group)!;
      group.forEach((geometry) => geometry.dispose());
      add(set, new THREE.Mesh(merged, filamentPaints[index]));
    });

    // Distant points and a few dead stars: the rest of the graveyard.
    {
      const count = Math.round(mix(60, 220, mood.density));
      const stars = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
      const matrix = new THREE.Matrix4();
      const tone = new THREE.Color();
      for (let i = 0; i < count; i++) {
        let d = dir();
        if (d.dot(toCamera) > 0) d = d.negate();
        const size = mix(0.02, 0.06, random() ** 3);
        stars.setMatrixAt(i, matrix.makeScale(size, size, size).setPosition(d.x * EXTENT * 1.5, d.y * EXTENT * 1.5, d.z * EXTENT * 1.5));
        stars.setColorAt(i, pale ? tone.set('#4d5361') : tone.setHSL(random() < 0.5 ? 0.6 : 0.1, 0.5, mix(0.75, 0.95, random())));
      }
      add(set, stars);
      const corpsePaint = new THREE.MeshStandardMaterial({ color: pale ? '#55505a' : '#2c2a36', roughness: 0.8 });
      const ringPaint = new THREE.MeshStandardMaterial({ color: tints[2], emissive: tints[2], emissiveIntensity: 0.4 * glow, roughness: 0.6 });
      for (let i = 0; i < 3 + Math.round(mood.density * 4); i++) {
        let d = dir();
        if (d.dot(toCamera) > -0.1) d = d.negate();
        if (d.dot(toCamera) > -0.1) continue;
        const corpse = new THREE.Group();
        corpse.position.copy(d).multiplyScalar(EXTENT * mix(1.15, 1.4, random()));
        const size = mix(0.14, 0.34, random());
        corpse.add(new THREE.Mesh(new THREE.SphereGeometry(size, 14, 10), corpsePaint));
        if (random() < 0.7) {
          const halo = new THREE.Mesh(new THREE.TorusGeometry(size * mix(1.6, 2.4, random()), size * 0.06, 5, 32), ringPaint);
          halo.rotation.set(random() * 3, random() * 3, 0);
          corpse.add(halo);
        }
        set.add(corpse);
      }
    }

    // The pulsar: a spark far behind, with two opposed beams sweeping a plane through the centre.
    const pulsarAt = new THREE.Vector3(-0.62, 0.36, -0.78).multiplyScalar(EXTENT);
    if (a.view === 'chart') pulsarAt.set(-0.7 * EXTENT, 0.2 * EXTENT, -0.55 * EXTENT);
    const inward = pulsarAt.clone().negate().normalize();
    const sweepAxis = new THREE.Vector3(mix(-0.25, 0.25, random()), 1, mix(-0.2, 0.2, random())).cross(inward).cross(inward).normalize().negate();
    const across = new THREE.Vector3().crossVectors(inward, sweepAxis).normalize();
    const lighthouse = new THREE.Group();
    lighthouse.position.copy(pulsarAt);
    set.add(lighthouse);
    const sparkPaint = new THREE.MeshBasicMaterial({ color: pale ? beamTint.clone().multiplyScalar(0.8) : '#ffffff' });
    lighthouse.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), sparkPaint));
    for (const [radius, opacity] of [[0.34, 0.4], [0.62, 0.18]] as const)
      lighthouse.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), new THREE.MeshBasicMaterial({ color: beamTint, transparent: true, opacity, depthWrite: false })));
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), sparkPaint);
      spike.scale.set(i % 2 ? 0.55 : 0.9, 0.022, 0.022);
      spike.quaternion.setFromAxisAngle(toCamera, (i / 4) * Math.PI + 0.4);
      lighthouse.add(spike);
    }
    const beams = new THREE.Group();
    lighthouse.add(beams);
    const reach = pulsarAt.length() * 2.3;
    const beamSoft = new THREE.MeshBasicMaterial({ color: pale ? beamTint.clone().multiplyScalar(0.85) : beamTint, transparent: true, opacity: pale ? 0.28 : 0.2, depthWrite: false, side: THREE.DoubleSide });
    const beamCore = new THREE.MeshBasicMaterial({ color: pale ? beamTint.clone().multiplyScalar(0.7) : beamTint.clone().lerp(new THREE.Color('#ffffff'), 0.5), transparent: true, opacity: 0.55, depthWrite: false });
    for (const side of [1, -1]) {
      const length = side > 0 ? reach : reach * 0.45;
      for (const [width, material] of [[0.04, beamSoft], [0.018, beamSoft], [0.005, beamCore]] as const) {
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(length * width, 0.02, length, 20, 1, true), material);
        cone.position.y = side * length / 2;
        if (side < 0) cone.rotation.x = Math.PI;
        beams.add(cone);
      }
    }
    const beamBasis = new THREE.Matrix4().makeBasis(across, inward, sweepAxis);
    let phase = { hero: 0, grazing: mix(0.16, 0.24, random()) * (random() < 0.5 ? -1 : 1), away: mix(1.0, 1.5, random()) }[a.beam];
    const aim = () => {
      beams.quaternion.setFromRotationMatrix(beamBasis).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -phase));
      const world = lighthouse.getWorldPosition(new THREE.Vector3());
      const pointing = new THREE.Vector3(0, 1, 0).applyQuaternion(beams.quaternion);
      rake.position.copy(world);
      rake.target.position.copy(world).addScaledVector(pointing, 10);
      // The spot only bites when the beam is somewhere near the cast.
      const nearness = Math.max(0, Math.cos(phase)) ** 6;
      rake.intensity = mix(2.5, 5.5, mood.cheer) * nearness;
    };

    // A soft lit heart behind the hero: the glow that lights the filaments from within.
    const heart = new THREE.Group();
    root.add(heart);
    {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      const fall = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      fall.addColorStop(0, 'rgba(255,255,255,1)');
      fall.addColorStop(0.25, 'rgba(255,255,255,0.62)');
      fall.addColorStop(0.6, 'rgba(255,255,255,0.18)');
      fall.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fall;
      ctx.fillRect(0, 0, 256, 256);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      heart.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, color: pale ? '#ffffff' : beamTint.clone().lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: mix(0.62, 0.38, a.age) * mix(0.85, 1.15, mood.cheer), depthWrite: false })));
    }

    // Debris belts.
    const belts: { group: THREE.Group; rate: number }[] = [];
    {
      const geometry = { rock: new THREE.DodecahedronGeometry(1, 0), plates: new THREE.BoxGeometry(1.6, 0.12, 1), ice: new THREE.OctahedronGeometry(1, 0), cinders: new THREE.IcosahedronGeometry(1, 0) }[a.debris];
      const material = {
        rock: new THREE.MeshStandardMaterial({ color: pale ? '#6b6661' : '#8e8a86', roughness: 0.95, flatShading: true }),
        plates: new THREE.MeshStandardMaterial({ color: '#9aa2a8', roughness: 0.5, metalness: 0.6, flatShading: true }),
        ice: new THREE.MeshStandardMaterial({ color: '#cfe8f4', roughness: 0.25, flatShading: true, emissive: '#7fbbe0', emissiveIntensity: 0.25 }),
        cinders: new THREE.MeshStandardMaterial({ color: '#2a2224', roughness: 0.9, flatShading: true, emissive: '#ff5a1e', emissiveIntensity: 0.55 * glow }),
      }[a.debris];
      const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), at = new THREE.Vector3();
      [0.42, 0.7, 0.98].forEach((fraction, index) => {
        const group = new THREE.Group();
        group.rotation.set(mix(-0.35, 0.35, random()), random() * 6, mix(-0.3, 0.3, random()));
        const count = Math.round(mix(30, 150, mood.density) * (0.7 + index * 0.3));
        const mesh = new THREE.InstancedMesh(index ? geometry.clone() : geometry, material, count);
        const squash = mix(0.72, 0.92, random());
        for (let i = 0; i < count; i++) {
          const angle = random() * Math.PI * 2, r = EXTENT * fraction * mix(0.92, 1.08, random());
          at.set(Math.cos(angle) * r, (random() - 0.5) * 0.35, Math.sin(angle) * r * squash);
          turn.setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
          const size = mix(0.03, 0.16, random() ** 3);
          scale.set(size, a.debris === 'ice' ? size * 2.6 : size * mix(0.6, 1.1, random()), size);
          mesh.setMatrixAt(i, matrix.compose(at, turn, scale));
        }
        mesh.castShadow = true;
        group.add(mesh);
        set.add(group);
        belts.push({ group, rate: (index % 2 ? -1 : 1) * mix(0.03, 0.012, index / 2) });
      });
    }

    // Orbits for the cast: tilted ellipses with the hero near one focus.
    const CAPACITY = 7;
    const inkTint = pale ? new THREE.Color('#3f4654') : new THREE.Color('#e6e9f2').lerp(beamTint, 0.25);
    const ink = new THREE.MeshBasicMaterial({ color: inkTint, transparent: true, opacity: 0.85 });
    const orbits = Array.from({ length: CAPACITY - 1 }, (_unused, k) => {
      const major = 3.3 + k * 0.82, minor = major * mix(0.74, 0.9, random());
      const group = new THREE.Group();
      group.rotation.set(mix(0.08, 0.3, random()) * (k % 2 ? 1 : -1), random() * Math.PI * 2, mix(0.06, 0.26, random()) * (random() < 0.5 ? -1 : 1), 'YXZ');
      group.updateMatrix();
      const offset = major * mix(0.06, 0.16, random());
      const at = (angle: number) => new THREE.Vector3(Math.cos(angle) * major - offset, 0, Math.sin(angle) * minor);
      const marks = new THREE.Group();
      if (a.orbits === 'lines' || a.orbits === 'clock') {
        const points = Array.from({ length: 96 }, (_point, i) => at((i / 96) * Math.PI * 2));
        marks.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 192, 0.016, 4, true), ink));
      }
      if (a.orbits === 'clock' || a.orbits === 'trails') {
        const count = a.orbits === 'clock' ? 60 : Math.round(mix(60, 160, mood.density));
        const mesh = new THREE.InstancedMesh(a.orbits === 'clock' ? new THREE.BoxGeometry(1, 0.02, 0.022) : new THREE.IcosahedronGeometry(0.03, 0), ink, count);
        const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1);
        for (let i = 0; i < count; i++) {
          const angle = a.orbits === 'clock' ? (i / count) * Math.PI * 2 : random() * Math.PI * 2;
          const p = at(angle);
          if (a.orbits === 'clock') {
            turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(p.z, p.x + offset));
            scale.set(i % 5 ? 0.12 : 0.3, 1, i % 5 ? 1 : 1.6);
          } else {
            p.add(new THREE.Vector3((random() - 0.5) * 0.25, (random() - 0.5) * 0.12, (random() - 0.5) * 0.25));
            scale.setScalar(mix(0.4, 1.6, random() ** 2));
          }
          mesh.setMatrixAt(i, matrix.compose(p, turn, scale));
        }
        marks.add(mesh);
      }
      marks.visible = false;
      group.add(marks);
      root.add(group);
      return { group, marks, at, start: k * 2.4 + mix(-0.4, 0.4, random()) + 0.6, rate: 0.5 / major ** 1.5 };
    });

    const camera = new THREE.OrthographicCamera(-9, 9, 9, -9, 0.1, 300);
    const cast: { holder: THREE.Group; centre: THREE.Vector3; orbit: number; angle: number }[] = [];
    const settle = (member: (typeof cast)[number]) => {
      const orbit = orbits[member.orbit];
      member.holder.position.copy(orbit.at(member.angle)).applyMatrix4(orbit.group.matrix).sub(member.centre);
    };
    const pace = mix(0.2, 1.4, mood.energy);

    const place = (items: readonly Placeable[]) => {
      cast.length = 0;
      orbits.forEach((orbit) => (orbit.marks.visible = false));
      let outer = 2.6;
      items.slice(0, CAPACITY).forEach((item, index) => {
        const holder = item.holder;
        holder.position.set(0, 0, 0);
        holder.scale.setScalar(1);
        holder.rotation.set(0, yaw + (index ? mix(-0.7, 0.7, ((index * 0.61803) % 1)) : 0.1), 0);
        holder.updateMatrixWorld(true);
        // Fit by what is actually visible: footprints understate long ships and ringed stars.
        const box = visibleBounds(holder);
        const size = box.isEmpty() ? new THREE.Vector3(item.radius * 2, item.height, item.radius * 2) : box.getSize(new THREE.Vector3());
        const centre = box.isEmpty() ? new THREE.Vector3(0, item.height / 2, 0) : box.getCenter(new THREE.Vector3());
        const target = index === 0 ? 3.7 : mix(1.9, 1.5, (index - 1) / 5);
        const scale = target / Math.max(size.x, size.y, size.z, 1e-4);
        holder.scale.setScalar(scale);
        centre.multiplyScalar(scale);
        if (index === 0) holder.position.copy(centre).negate();
        else {
          const member = { holder, centre, orbit: index - 1, angle: orbits[index - 1].start };
          cast.push(member);
          settle(member);
          orbits[index - 1].marks.visible = true;
          outer = 3.3 + (index - 1) * 0.82 + 0.9;
        }
        holder.updateMatrixWorld(true);
      });
      const extent = Math.max(4.3, outer + 0.5);
      set.scale.setScalar(extent / EXTENT);
      set.updateMatrixWorld(true);
      camera.position.copy(toCamera).multiplyScalar(90);
      camera.lookAt(0, 0, 0);
      heart.scale.setScalar(extent * 1.7);
      heart.position.copy(toCamera).multiplyScalar(-extent * 2.2);
      heart.quaternion.copy(camera.quaternion);
      const half = extent * 0.96;
      camera.left = camera.bottom = -half;
      camera.right = camera.top = half;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(0, 0, 0);
      key.position.set(mix(-1, 1, mood.daylight) * 0.8, 0.75, 0.55).normalize().multiplyScalar(extent * 3);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -extent * 1.15;
      shadow.right = shadow.top = extent * 1.15;
      shadow.near = 0.1;
      shadow.far = extent * 7;
      shadow.updateProjectionMatrix();
      aim();
    };

    return {
      object: root,
      camera,
      background,
      capacity: CAPACITY,
      ground: null,
      keyLight: key,
      place,
      update(dt) {
        // A lighthouse tick: the beam lingers as it crosses the cast, then swings round quickly.
        phase += dt * mix(0.25, 1.1, mood.energy) * (0.12 + 0.88 * (1 - Math.max(0, Math.cos(phase)) ** 10));
        if (phase > Math.PI) phase -= Math.PI * 2;
        aim();
        for (const belt of belts) belt.group.rotation.y += dt * belt.rate * pace;
        for (const member of cast) {
          member.angle += dt * orbits[member.orbit].rate * pace;
          settle(member);
        }
      },
      dispose() {
        key.shadow.map?.dispose();
        rake.dispose();
        disposeTree(root);
      },
    };
  },
});
