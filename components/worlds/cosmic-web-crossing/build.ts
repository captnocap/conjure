import * as THREE from 'three';
import { type Placeable, choice, defineWorld, disposeTree, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const SKIES: Record<string, { paper: string; gulf: string; pale: boolean }> = {
  mist: { paper: '#b9b4cb', gulf: '#6f6890', pale: true },
  dusk: { paper: '#8f89a8', gulf: '#514a70', pale: false },
  plum: { paper: '#655d80', gulf: '#3a3354', pale: false },
  chart: { paper: '#dad7e3', gulf: '#9891b4', pale: true },
};
const THREADS: Record<string, { bright: string[]; deep: string[]; gas: string }> = {
  gold: { bright: ['#ffd04a', '#f5ae22', '#fff0b4', '#e89618'], deep: ['#d9951a', '#b87410', '#e8b23a', '#9a5f0c'], gas: '#e8b040' },
  rose: { bright: ['#ffc09a', '#f59a8a', '#ffe6cf', '#e87f6a'], deep: ['#c9705a', '#b0584a', '#dc947a', '#8f4238'], gas: '#e89a84' },
  silver: { bright: ['#f4f6ff', '#d6dcf4', '#ffffff', '#bfc8ea'], deep: ['#7f86b0', '#5f6694', '#9aa1c4', '#4a517e'], gas: '#cfd6f2' },
  ember: { bright: ['#ffa24a', '#f5742a', '#ffd29a', '#e85a1e'], deep: ['#c9521a', '#a83c12', '#dc7430', '#86300e'], gas: '#f08a3a' },
};

export default defineWorld({
  questions: {
    weave: choice('How many threads meet at this crossing?', {
      three: 'Three, a Y-shaped fork.',
      four: 'Four, a ragged cross.',
      hub: 'Six or seven, a busy hub like the middle of a spiderweb.',
      thread: 'One thread passing straight through, with only short twigs leaving it.',
    }),
    sky: choice('What is the emptiness between the threads like?', {
      mist: 'Pale lavender mist, soft and quiet.',
      dusk: 'Violet-grey dusk, the threads glowing against it.',
      plum: 'Deep plum, heavy and enclosing.',
      chart: 'Nearly white, like a survey chart with the structure inked on it.',
    }),
    thread: choice('What colour are the threads?', {
      gold: 'Gold, like lamplit dew.',
      rose: 'Rose-gold, warm and bodily, like nerves.',
      silver: 'Silver-white, cold dew on a morning web.',
      ember: 'Ember orange, as if still hot.',
    }),
    dew: score('How heavily are the threads beaded with bright knots?', ['Bare threads', 'A few beads', 'Strung like a necklace', 'Dripping with them']),
    state: choice('What is the web doing?', {
      still: 'Holding still, finished and balanced.',
      feeding: 'Feeding: everything is streaming inward along the threads and the junction is swollen with it.',
      thinning: 'Thinning: the threads have been stretched until they break into dashes and stragglers.',
      tangled: 'Tangled: fine cross-threads stitch the main ones together into a cobweb.',
    }),
    gulfs: choice('What is in the gulfs between?', {
      empty: 'Nothing whatsoever.',
      shadowed: 'Soft dark hollows, bubbles of deeper emptiness.',
      haunted: 'A scatter of lost single points that never found a thread.',
      charted: 'Thin dotted survey circles, as if someone has measured the voids.',
    }),
    view: choice('Where are we looking from?', {
      flat: 'Straight on, the web spread flat like a map.',
      oblique: 'From one side, so some threads run toward us and others recede.',
      under: 'From below and close, the junction looming overhead.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const sky = SKIES[a.sky], thread = THREADS[a.thread];
    const background = new THREE.Color(sky.paper).lerp(new THREE.Color('#ffffff'), (mood.daylight - 0.5) * 0.16).lerp(new THREE.Color('#c9b9a8'), mood.warmth * 0.12);
    const tints = (sky.pale ? thread.deep : thread.bright).map((colour) => new THREE.Color(colour).lerp(new THREE.Color(sky.paper), (1 - mood.cheer) * 0.22 + mood.wear * 0.12));
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const direction = () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()); return v.lengthSq() ? v.normalize() : v.set(0, 1, 0); };

    root.add(new THREE.HemisphereLight('#f4f0ff', '#6b6488', 1.5));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(mix(0.7, 0.11, mood.warmth), 0.4, 0.9), 2.4);
    key.position.set(-8, 14, 12);
    key.castShadow = false;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#ffe2a8', 0.7);
    fill.position.set(6, -4, 8);
    root.add(fill);

    // Threads leave the junction in a plane that roughly faces the viewer, each with its own wander.
    const armCount = { three: 3, four: 4, hub: 6 + Math.floor(random() * 2), thread: 2 }[a.weave];
    const REACH = 19;
    const spinStart = random() * Math.PI * 2;
    const arms: THREE.CatmullRomCurve3[] = [];
    for (let k = 0; k < armCount; k++) {
      const angle = a.weave === 'thread' ? spinStart * 0.15 + 0.2 + k * Math.PI + (random() - 0.5) * 0.2 : spinStart + k * Math.PI * 2 / armCount + (random() - 0.5) * (1.6 / armCount);
      const depth = (random() - 0.5) * 0.55, bend = (random() - 0.5) * 0.5;
      const points: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
      for (let i = 1; i <= 5; i++) {
        const r = REACH * i / 5, turned = angle + bend * (i / 5) ** 2 + (random() - 0.5) * 0.12;
        points.push(new THREE.Vector3(Math.cos(turned) * r, Math.sin(turned) * r * 0.92, depth * r + (random() - 0.5) * 0.8));
      }
      arms.push(new THREE.CatmullRomCurve3(points));
    }
    const strands: { curve: THREE.CatmullRomCurve3; thick: number; share: number; main: boolean }[] = arms.map((curve) => ({ curve, thick: 0.42, share: 1, main: true }));
    const twigs = a.weave === 'thread' ? 5 : a.state === 'tangled' ? armCount * 2 : Math.round(armCount * mix(0.3, 1, mood.density));
    for (let k = 0; k < twigs; k++) {
      const from = arms[k % armCount], next = arms[(k + 1) % armCount];
      const t0 = mix(0.22, 0.7, random());
      const start = from.getPoint(t0);
      const end = a.state === 'tangled' && armCount > 2 ? next.getPoint(mix(0.2, 0.7, random())) : start.clone().add(direction().multiplyScalar(mix(3, 6.5, random())).setZ((random() - 0.5) * 2));
      const middle = start.clone().lerp(end, 0.5).multiplyScalar(a.state === 'tangled' ? 0.86 : 1.05).add(new THREE.Vector3(0, 0, (random() - 0.5) * 1.5));
      strands.push({ curve: new THREE.CatmullRomCurve3([start, middle, end]), thick: 0.18, share: 0.3, main: false });
    }

    const dots: { at: P3; size: number; color: THREE.Color }[] = [];
    const fat = a.state === 'feeding' ? 1.35 : a.state === 'thinning' ? 0.7 : 1;
    const perMetre = mix(34, 70, mood.density) * fat * Math.min(1, Math.sqrt(4 / armCount));
    const beadPaint = new THREE.MeshStandardMaterial({ color: sky.pale ? thread.deep[2] : thread.bright[0], emissive: sky.pale ? thread.deep[0] : thread.bright[1], emissiveIntensity: mix(0.6, 1.1, mood.cheer), roughness: 0.4 });
    const haloPaint = new THREE.MeshBasicMaterial({ color: thread.gas, transparent: true, opacity: sky.pale ? 0.26 : 0.2, depthWrite: false });
    const gasPaint = new THREE.MeshBasicMaterial({ color: thread.gas, transparent: true, opacity: (sky.pale ? 0.09 : 0.07) * (a.state === 'feeding' ? 1.4 : 1), depthWrite: false });
    const beads: { mesh: THREE.Mesh; base: number; phase: number }[] = [];
    const beadGeometry = new THREE.SphereGeometry(1, 14, 10);
    const dashPhase = random() * 6;
    for (const strand of strands) {
      const length = strand.curve.getLength();
      const count = Math.round(length * perMetre * strand.share * (strand.main ? 1 : 1.6));
      const beadTotal = Math.round(mix(0, strand.main ? 9 : 2.4, a.dew) + (strand.main ? 0 : random()));
      const beadAt = Array.from({ length: beadTotal }, (_unused, i) => mix(0.12, 0.96, (i + 0.3 + random() * 0.6) / Math.max(beadTotal, 1)));
      const broken = (t: number) => a.state === 'thinning' && Math.sin(t * length * 0.9 + dashPhase) < -0.15 - (1 - mood.wear) * 0.2;
      for (let i = 0; i < count; i++) {
        const nearBead = beadAt.length > 0 && random() < 0.34;
        // Denser toward the junction, where everything gathers.
        let t = nearBead ? beadAt[Math.floor(random() * beadAt.length)] + gauss() * 0.012 : Math.pow(random(), strand.main ? 1.25 : 1);
        t = Math.min(1, Math.max(0, t));
        if (!nearBead && broken(t) && random() < 0.88) continue;
        const spread = strand.thick * fat * (nearBead ? 1.9 : mix(1.25, 0.75, t));
        const at = strand.curve.getPoint(t).addScaledVector(direction(), Math.abs(gauss()) * spread);
        dots.push({ at: at.toArray() as P3, size: (nearBead ? 0.075 : 0.05) + random() * random() * 0.1, color: tints[Math.floor(random() * tints.length)] });
      }
      for (const t of beadAt) {
        const at = strand.curve.getPoint(t);
        if (at.length() < 2.6) continue;
        const size = strand.thick * mix(0.55, 0.95, random()) * (strand.main ? 1 : 1.3);
        const bead = new THREE.Mesh(beadGeometry, beadPaint);
        bead.position.copy(at); bead.scale.setScalar(size);
        const halo = new THREE.Mesh(beadGeometry, haloPaint);
        halo.position.copy(at); halo.scale.setScalar(size * 2.4);
        root.add(bead, halo);
        beads.push({ mesh: bead, base: size, phase: at.length() });
      }
      if (a.state !== 'thinning') {
        for (const girth of [2.3, 1.6, 1]) root.add(new THREE.Mesh(new THREE.TubeGeometry(strand.curve, 32, strand.thick * fat * girth, 8, false), gasPaint));
      }
      if (a.state === 'feeding' && strand.main) for (let i = 0; i < 6; i++) {
        // Chevron rings of points, all aimed at the junction.
        const t = mix(0.2, 0.85, (i + random() * 0.5) / 6), at = strand.curve.getPoint(t), tangent = strand.curve.getTangent(t);
        const side = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 0, 1)).normalize();
        for (let j = 0; j < 26; j++) { const u = (j / 25 - 0.5) * 2; dots.push({ at: at.clone().addScaledVector(side, u * 1.5).addScaledVector(tangent, Math.abs(u) * 1.3).toArray() as P3, size: 0.07 * (1.1 - Math.abs(u) * 0.6), color: tints[0] }); }
      }
    }

    // The junction itself: a swarm with a hollow heart, so whatever stands there can be seen.
    const knot = Math.round(mix(380, 760, mood.density) * fat);
    for (let i = 0; i < knot; i++) {
      const radius = 2.5 + Math.abs(gauss()) * 1.5 * fat;
      const at = direction().multiplyScalar(radius); at.z = at.z * 0.5 - 1.2;
      dots.push({ at: at.toArray() as P3, size: 0.055 + random() * random() * 0.11, color: tints[Math.floor(random() * tints.length)] });
    }
    for (let layer = 0; layer < 7; layer++) {
      const radius = mix(2.2, 6.4, layer / 6) * (a.state === 'feeding' ? 1.2 : 1);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 16), new THREE.MeshBasicMaterial({ color: thread.gas, transparent: true, opacity: sky.pale ? 0.075 : 0.06, depthWrite: false, side: THREE.BackSide }));
      glow.position.z = -1.5;
      root.add(glow);
    }

    // The gulfs: what lies in the wedges between threads.
    const armAngles = arms.map((curve) => { const p = curve.getPoint(0.5); return Math.atan2(p.y, p.x); }).sort((x, y) => x - y);
    const wedges = armAngles.map((angle, index) => {
      const next = index === armAngles.length - 1 ? armAngles[0] + Math.PI * 2 : armAngles[index + 1];
      return { middle: (angle + next) / 2, width: next - angle };
    });
    for (const wedge of wedges) {
      const distance = mix(7.5, 10.5, random()), size = Math.min(6.5, Math.max(2.2, distance * Math.sin(Math.min(wedge.width, 2.6) / 2) * 0.82));
      const centre = new THREE.Vector3(Math.cos(wedge.middle) * distance, Math.sin(wedge.middle) * distance * 0.92, -2.5);
      if (a.gulfs === 'shadowed') for (let layer = 0; layer < 7; layer++) {
        const hollow = new THREE.Mesh(new THREE.SphereGeometry(size * mix(1, 0.2, layer / 6), 24, 14), new THREE.MeshBasicMaterial({ color: sky.gulf, transparent: true, opacity: 0.075, depthWrite: false }));
        hollow.position.copy(centre); hollow.scale.z = 0.4;
        root.add(hollow);
      } else if (a.gulfs === 'haunted') for (let i = 0; i < 9; i++) {
        const at = centre.clone().add(new THREE.Vector3(gauss() * size * 0.5, gauss() * size * 0.5, gauss()));
        dots.push({ at: at.toArray() as P3, size: 0.07 + random() * 0.07, color: new THREE.Color(sky.gulf).lerp(tints[0], 0.35) });
      } else if (a.gulfs === 'charted') for (const reach of [1, 0.6]) {
        const segments = Math.round(size * reach * 9);
        for (let i = 0; i < segments; i++) { const angle = i / segments * Math.PI * 2; dots.push({ at: [centre.x + Math.cos(angle) * size * reach, centre.y + Math.sin(angle) * size * reach, centre.z], size: 0.045, color: new THREE.Color(sky.gulf) }); }
      }
    }

    const cloud = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), dots.length);
    const matrix = new THREE.Matrix4();
    dots.forEach((dot, index) => { cloud.setMatrixAt(index, matrix.makeScale(dot.size, dot.size, dot.size).setPosition(...dot.at)); cloud.setColorAt(index, dot.color); });
    cloud.instanceMatrix.needsUpdate = true;
    if (cloud.instanceColor) cloud.instanceColor.needsUpdate = true;
    cloud.frustumCulled = false;
    root.add(cloud);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);
    const yaw = a.view === 'oblique' ? (random() < 0.5 ? -1 : 1) * 0.5 : a.view === 'under' ? 0.18 : 0.06;
    const pitch = a.view === 'oblique' ? 0.26 : a.view === 'under' ? -0.42 : 0.05;
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));

    const place = (items: readonly Placeable[]) => {
      let far = 9.5;
      items.forEach((item, index) => {
        let spot = new THREE.Vector3(0, 0, 0.4), fit = 2.5;
        if (index > 0) {
          const k = index - 1, ring = Math.floor(k / armCount), arm = arms[(k * (armCount > 3 ? 2 : 1) + ring) % armCount];
          const distance = 5.6 + ring * 3.2 + (k % 2) * 0.9;
          spot = arm.getPoint(Math.min(0.9, distance / arm.getLength()));
          spot.z += 0.6;
          fit = ring === 0 ? 1.6 : 1.3;
          far = Math.max(far, spot.length() + fit);
        }
        const scale = Math.min(fit * 2 / Math.max(item.height, 0.05), fit / Math.max(item.radius, 0.05));
        item.holder.scale.setScalar(scale);
        item.holder.position.set(spot.x, spot.y - item.height * scale / 2, spot.z);
        item.holder.rotation.y = yaw + (context.random() - 0.5) * 0.7;
        item.holder.updateMatrixWorld(true);
      });
      const span = far * (a.view === 'under' ? 0.9 : 1.08);
      const distance = span / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position.copy(toCamera).multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      camera.near = 0.5; camera.far = distance + 80;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      key.target.position.set(0, 0, 0);
    };

    const speed = mix(0.3, 2.6, mood.energy);
    return {
      object: root,
      camera,
      background,
      capacity: 7,
      ground: null,
      keyLight: key,
      place,
      update: (_dt, time) => { for (const bead of beads) bead.mesh.scale.setScalar(bead.base * (1 + 0.14 * Math.sin(time * speed - bead.phase * 0.8))); },
      dispose() { disposeTree(root); },
    };
  },
});
