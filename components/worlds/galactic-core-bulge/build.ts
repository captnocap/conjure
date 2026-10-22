import * as THREE from 'three';
import { type Placeable, choice, clamp01, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';

type P = readonly [number, number, number, number];
/** Where the cast rides, relative to the centre: x, y, z and a size. Front and low first, then back and up. */
const SLOTS: readonly P[] = [[0.4, -3.8, 10, 1], [-9.4, 1.2, 4, 0.7], [9.6, 0.4, 1.5, 0.66], [-6.2, 7, -3, 0.54], [6.8, 7.6, -5, 0.5], [-2, -8.8, 14, 0.48]];

export default defineWorld({
  questions: {
    view: choice('From where do we look at the core?', {
      into: 'A three-quarter view, looking slightly down into the blaze.',
      edge: 'Edge-on along the galactic plane: the bulge is a flattened lozenge with a razor of dust across its waist.',
      above: 'From high above, looking down the well, the orbits spread out like a chart.',
    }),
    dust: choice('How do the dust lanes cut across it?', {
      threads: 'A few fine dark threads, like cracks in glaze.',
      lanes: 'Two or three broad brown lanes sweeping diagonally across the light.',
      choked: 'Heavy curtains of dust, half the blaze hidden behind them.',
      ring: 'A neat dark ring of dust circling the middle, with wisps trailing off it.',
    }),
    core: choice('What is the bright point at the middle doing?', {
      quiet: 'Quiet: one small steady glint, oddly modest for the thing everyone orbits.',
      flaring: 'Flaring: long white spikes, a point too bright to look at.',
      draining: 'Draining: a three-armed swirl of hot gas winding into it.',
      outburst: 'Mid-outburst: bright shells ringing outward from it like a struck bell.',
    }),
    tracks: choice('Are the orbits of the things here drawn?', {
      drawn: 'Yes: each rides a fine dark ellipse.',
      dotted: 'As dotted ellipses, like a surveyor\'s chart.',
      none: 'No. They just hang there, and you sense the pull.',
    }),
    stars: choice('Who lives here?', {
      old: 'Only the old: a uniform crowd of honey-gold stars.',
      young: 'The old gold crowd, plus knots of fierce young blue stars near the middle.',
      giants: 'Gold, studded with swollen red giants like tail lights in traffic.',
    }),
    traffic: choice('How does the crowd move?', {
      still: 'It holds still, a long exposure of a calm night.',
      ringroad: 'Everything streaks the same way round the centre, like traffic on a ring road.',
      scramble: 'Streaks in every direction, nobody yielding: a junction at rush hour.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const honey = new THREE.Color().setHSL(mix(0.118, 0.088, mood.warmth), mix(0.6, 0.76, mood.cheer), mix(0.5, 0.6, mix(mood.cheer, 1 - Math.abs(mood.daylight - 0.5) * 2, 0.5)));
    const cream = new THREE.Color('#fff7dc'), amber = new THREE.Color('#b56a16'), umber = new THREE.Color('#6e3f12'), soot = new THREE.Color('#3a2210');

    const pitch = THREE.MathUtils.degToRad({ into: 24, edge: 7, above: 52 }[a.view]);
    const yaw = (random() - 0.5) * 0.5;
    const toCamera = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const right = new THREE.Vector3(0, 1, 0).cross(toCamera).normalize();
    const upward = toCamera.clone().cross(right).normalize();
    const camera = new THREE.OrthographicCamera(-16, 16, 16, -16, 0.1, 500);

    root.add(new THREE.HemisphereLight('#fff6dc', '#c98f3a', 1.5));
    const key = new THREE.DirectionalLight('#fff1d6', 2.3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.04;
    root.add(key, key.target);
    // The core itself lights everything from behind.
    const rim = new THREE.DirectionalLight('#ffb347', 1.2);
    rim.position.copy(toCamera).multiplyScalar(-30).add(new THREE.Vector3(0, 6, 0));
    root.add(rim);

    // The blaze: shells of unresolved starlight, brighter toward the middle.
    const flat = a.view === 'edge' ? 0.5 : 0.68;
    const blaze = ['#f1c458', '#f6d06a', '#fbdc80', '#ffe89c', '#fff2bd', '#fffbe6'];
    [[12, 0.36], [9, 0.42], [6.4, 0.5], [4.2, 0.58], [2.6, 0.68], [1.4, 0.85]].forEach(([radius, opacity], index) => {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(blaze[index]), transparent: true, opacity, depthWrite: false }));
      shell.scale.set(1, flat + index * 0.05, 0.85);
      shell.renderOrder = -20 + index;
      root.add(shell);
    });

    // The crowd: thousands of old stars, packed toward the centre.
    const count = Math.round(mix(2600, 7200, mood.density));
    const crowd = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
    const matrix = new THREE.Matrix4(), tint = new THREE.Color(), at = new THREE.Vector3();
    const blue = new THREE.Color('#2a66f5'), red = new THREE.Color('#d6331c');
    const knots = Array.from({ length: 3 }, () => new THREE.Vector3((random() - 0.5) * 9, (random() - 0.5) * 3, (random() - 0.5) * 6));
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, v = random() * 2 - 1, ring = Math.sqrt(1 - v * v), radius = 14 * random() ** 1.9 + 0.6;
      at.set(ring * Math.cos(angle) * radius, v * radius * flat, ring * Math.sin(angle) * radius * 0.85);
      const depth = clamp01(radius / 12);
      let size = mix(0.05, 0.14, random() ** 2.4);
      // Bright against the glow near the middle, dark against the honey sky further out.
      if (random() < 0.45) tint.copy(cream).lerp(new THREE.Color('#ffe9a8'), random());
      else tint.copy(amber).lerp(umber, clamp01(depth * 1.3 - 0.2 + (random() - 0.5) * 0.6));
      const kind = random();
      if (a.stars === 'young' && kind < 0.05) { at.copy(knots[i % 3]).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(2.2)); tint.copy(blue).offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.14); size *= 1.7; }
      if (a.stars === 'giants' && kind < 0.035) { tint.copy(red).offsetHSL((random() - 0.5) * 0.03, 0, 0); size *= 2.3; }
      crowd.setMatrixAt(i, matrix.makeRotationY(random() * 3).scale(new THREE.Vector3(size, size * 1.2, size)).setPosition(at));
      crowd.setColorAt(i, tint);
    }
    root.add(crowd);

    // Traffic: short streaks circling the middle.
    const lanesOfTraffic: { group: THREE.Group; speed: number }[] = [];
    if (a.traffic !== 'still') {
      const families = a.traffic === 'ringroad' ? 1 : 4;
      const per = Math.round(mix(50, 150, mood.density) / Math.sqrt(families));
      const streakMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      for (let f = 0; f < families; f++) {
        const group = new THREE.Group();
        const streaks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), streakMaterial, per);
        const turn = new THREE.Quaternion(), scale = new THREE.Vector3();
        for (let i = 0; i < per; i++) {
          const angle = random() * Math.PI * 2, radius = mix(1.6, 11, random() ** 1.4), length = mix(0.3, 1.0, random()) * mix(0.7, 1.4, mood.energy);
          at.set(Math.cos(angle) * radius, (random() - 0.5) * mix(0.3, 2.4, radius / 11), Math.sin(angle) * radius);
          turn.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -angle);
          scale.set(0.045, 0.045, length);
          streaks.setMatrixAt(i, matrix.compose(at, turn, scale));
          streaks.setColorAt(i, tint.copy(radius < 5 ? cream : umber).lerp(amber, random() * 0.5));
        }
        group.add(streaks);
        if (families > 1) group.rotation.set((random() - 0.5) * 2.4, random() * 3, (random() - 0.5) * 2.4);
        root.add(group);
        lanesOfTraffic.push({ group, speed: (f % 2 ? -1 : 1) * mix(0.6, 1.4, random()) });
      }
    }

    // Dust: ribbons that face the viewer, feathered at the edges and combed along their length.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const fade = ctx.createLinearGradient(0, 0, 0, 64);
    fade.addColorStop(0, 'rgba(58,34,16,0)'); fade.addColorStop(0.3, 'rgba(58,34,16,0.82)'); fade.addColorStop(0.62, 'rgba(46,26,12,0.95)'); fade.addColorStop(1, 'rgba(58,34,16,0)');
    ctx.fillStyle = fade; ctx.fillRect(0, 0, 256, 64);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(0,0,0,${0.15 + random() * 0.4})`; ctx.lineWidth = 0.6 + random() * 2.2;
      const y = random() * 64, x = random() * 256, length = 30 + random() * 120;
      for (const shift of [-256, 0, 256]) { ctx.beginPath(); ctx.moveTo(x + shift, y); ctx.bezierCurveTo(x + shift + length / 3, y + (random() - 0.5) * 8, x + shift + length * 0.66, y + (random() - 0.5) * 8, x + shift + length, y); ctx.stroke(); }
    }
    const veil = new THREE.CanvasTexture(canvas);
    veil.colorSpace = THREE.SRGBColorSpace;
    veil.wrapS = THREE.RepeatWrapping;
    const dustMaterial = new THREE.MeshBasicMaterial({ map: veil, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: mix(0.62, 0.85, mood.wear), vertexColors: true });
    const ribbon = (tilt: number, offset: number, bow: number, width: number, toward: number, reach = 13) => {
      const positions: number[] = [], uvs: number[] = [], shades: number[] = [], index: number[] = [];
      const steps = 48, wobble = random() * 6, wave = mix(0.2, 0.9, random());
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, along = mix(-reach, reach, t);
        const across = offset + bow * (1 - (along / reach) ** 2) + Math.sin(t * 7 + wobble) * wave;
        const centre = right.clone().multiplyScalar(along * Math.cos(tilt) - across * Math.sin(tilt)).addScaledVector(upward, along * Math.sin(tilt) + across * Math.cos(tilt)).addScaledVector(toCamera, -toward);
        const wide = width * (0.35 + Math.sin(Math.PI * t) ** 0.6) * (1 + Math.sin(t * 13 + wobble) * 0.25);
        const normal = right.clone().multiplyScalar(-Math.sin(tilt)).addScaledVector(upward, Math.cos(tilt));
        for (const side of [-0.5, 0.5]) { positions.push(...centre.clone().addScaledVector(normal, side * wide).toArray()); uvs.push(t * 3 + wobble, side + 0.5); shades.push(1, 1, 1, Math.sin(Math.PI * t) ** 0.7); }
        if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(shades, 4));
      geometry.setIndex(index);
      const mesh = new THREE.Mesh(geometry, dustMaterial);
      mesh.renderOrder = -5;
      root.add(mesh);
    };
    const slant = () => (random() < 0.5 ? -1 : 1) * mix(0.15, 0.6, random());
    const threads = (n: number) => { for (let i = 0; i < n; i++) ribbon(slant() * 1.4, (random() - 0.5) * 13, (random() - 0.5) * 6, mix(0.3, 0.6, random()), mix(1, 5, random()), mix(6, 11, random())); };
    if (a.view === 'edge') ribbon((random() - 0.5) * 0.06, mix(-0.9, -0.3, random()), 0.4, 1.5, 4, 17);
    if (a.dust === 'threads') threads(4 + Math.floor(random() * 3));
    else if (a.dust === 'lanes') {
      const first = slant();
      ribbon(first, mix(2.2, 4, random()), -2.5, mix(1.8, 2.6, random()), 3, 14);
      ribbon(first + (random() - 0.5) * 0.25, -mix(3.5, 5.5, random()), 3, mix(1.3, 2.2, random()), 2, 12);
      if (random() < 0.6) ribbon(-first * 1.3, mix(-7, 7, random()), 1, mix(1, 1.6, random()), 4, 9);
      threads(1);
    } else if (a.dust === 'choked') {
      const first = slant();
      for (let i = 0; i < 4; i++) ribbon(first + (random() - 0.5) * 0.4, (i - 1.5) * 4.4 + (random() - 0.5) * 2 + 1, (random() - 0.5) * 5, mix(2.2, 3.6, random()), mix(1, 5, random()), mix(11, 15, random()));
      threads(3);
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.75, 10, 72), new THREE.MeshStandardMaterial({ color: soot, roughness: 1 }));
      ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3);
      ring.scale.z = 0.45;
      root.add(ring);
      threads(3);
    }

    // The middle.
    const white = new THREE.MeshBasicMaterial({ color: '#fffef4' });
    const heart = new THREE.Mesh(new THREE.SphereGeometry(a.core === 'quiet' ? 0.38 : 0.62, 20, 14), white);
    root.add(heart);
    const pit = new THREE.Mesh(new THREE.SphereGeometry(a.core === 'quiet' ? 0.16 : 0.2, 14, 10), new THREE.MeshBasicMaterial({ color: '#120c0a' }));
    pit.position.copy(toCamera).multiplyScalar(0.7);
    root.add(pit);
    const swirl = new THREE.Group();
    root.add(swirl);
    const shells: THREE.Mesh[] = [];
    if (a.core === 'flaring') {
      const spikes = 8 + Math.floor(random() * 5);
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2 + random() * 0.3, length = (i % 2 ? mix(1.6, 3, random()) : mix(3.5, 6.5, random())) * mix(0.8, 1.2, mood.energy);
        const dir = right.clone().multiplyScalar(Math.cos(angle)).addScaledVector(upward, Math.sin(angle));
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, length, 6), white);
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        spike.position.copy(dir).multiplyScalar(length / 2 + 0.3);
        swirl.add(spike);
      }
    } else if (a.core === 'draining') {
      const ember = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e24a17') }), blaze = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a2e') });
      for (let arm = 0; arm < 3; arm++) {
        const start = (arm / 3) * Math.PI * 2 + random() * 0.5, turns = mix(1.1, 1.6, random());
        const points = Array.from({ length: 28 }, (_unused, i) => { const t = i / 27, angle = start + t * turns * Math.PI * 2, radius = mix(4.6, 0.5, t ** 0.8); return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(t * 5 + arm) * 0.25, Math.sin(angle) * radius); });
        const curve = new THREE.CatmullRomCurve3(points);
        swirl.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.2, 8), ember));
        swirl.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.slice(12)), 50, 0.24, 8), blaze));
      }
      swirl.rotation.set(mix(0.2, 0.5, random()), 0, (random() - 0.5) * 0.5);
    } else if (a.core === 'outburst') {
      const lean = new THREE.Euler(Math.PI / 2 + (random() - 0.5) * 0.7, 0, (random() - 0.5) * 0.7);
      [2.2, 3.9, 6].forEach((radius, i) => {
        const shell = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.17 - i * 0.035, 8, 80), new THREE.MeshBasicMaterial({ color: i === 0 ? '#fffef4' : i === 1 ? '#ff8a3a' : '#e0481c' }));
        shell.rotation.copy(lean);
        swirl.add(shell);
        shells.push(shell);
      });
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 6, 40), new THREE.MeshBasicMaterial({ color: '#f08a2a' }));
      ring.rotation.x = Math.PI / 2 - pitch;
      swirl.add(ring);
    }

    // A few neighbours bright enough to throw crossed spikes.
    const sparkle = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#fffbea' }), 14 * 2);
    for (let i = 0; i < 14; i++) {
      at.copy(right).multiplyScalar((random() - 0.5) * 34).addScaledVector(upward, (random() - 0.5) * 30).addScaledVector(toCamera, -6 - random() * 6);
      const long = mix(0.35, 0.9, random());
      for (let k = 0; k < 2; k++) {
        const basis = new THREE.Matrix4().makeBasis(right, upward, toCamera);
        sparkle.setMatrixAt(i * 2 + k, matrix.copy(basis).multiply(new THREE.Matrix4().makeScale(k ? 0.05 : long, k ? long : 0.05, 0.05)).setPosition(at));
      }
    }
    root.add(sparkle);

    const tracks = new THREE.Group();
    root.add(tracks);
    const ink = new THREE.MeshBasicMaterial({ color: umber });
    type Rider = { holder: THREE.Object3D; at: (anomaly: number, out: THREE.Vector3) => THREE.Vector3; anomaly: number; drop: number; phase: number };
    let riders: Rider[] = [];

    const place = (items: readonly Placeable[]) => {
      for (const child of [...tracks.children]) disposeTree(child);
      riders = [];
      const boxes: THREE.Box3[] = [new THREE.Box3(new THREE.Vector3(-12, -8, -4), new THREE.Vector3(12, 8, 4))];
      items.forEach((item, index) => {
        const [sx, sy, sz, size] = SLOTS[index % SLOTS.length];
        // Slots are laid out for the three-quarter view; from above they spread outward instead of upward.
        const spot = right.clone().multiplyScalar(sx + (random() - 0.5)).addScaledVector(new THREE.Vector3(0, 1, 0), a.view === 'above' ? sy * 0.35 : sy).addScaledVector(new THREE.Vector3(-right.z, 0, right.x), a.view === 'above' ? sz + sy * 0.9 : sz);
        const scale = Math.min(7 / Math.max(item.height, 0.05), 4.2 / Math.max(item.radius, 0.05)) * size;
        item.holder.scale.setScalar(scale);
        item.holder.rotation.y = yaw + (random() - 0.5) * 0.7;
        const drop = (item.height * scale) / 2;

        // A steep ellipse with the centre at one focus, passing through this spot near its far end.
        const distance = spot.length(), outward = spot.clone().normalize();
        const eccentricity = mix(0.55, 0.8, random()), anomaly = (index % 2 ? -1 : 1) * mix(2.25, 2.85, random());
        const facing = toCamera.clone().addScaledVector(outward, -toCamera.dot(outward)).normalize().applyAxisAngle(outward, (random() - 0.5) * 1.5);
        const sideways = facing.clone().cross(outward).normalize();
        const peri = outward.clone().multiplyScalar(Math.cos(anomaly)).addScaledVector(sideways, -Math.sin(anomaly));
        const perp = outward.clone().multiplyScalar(Math.sin(anomaly)).addScaledVector(sideways, Math.cos(anomaly));
        const latus = distance * (1 + eccentricity * Math.cos(anomaly));
        const at = (theta: number, out: THREE.Vector3) => out.copy(peri).multiplyScalar(Math.cos(theta)).addScaledVector(perp, Math.sin(theta)).multiplyScalar(latus / (1 + eccentricity * Math.cos(theta)));
        if (a.tracks === 'drawn') {
          const curve = new THREE.CatmullRomCurve3(Array.from({ length: 90 }, (_unused, i) => at((i / 90) * Math.PI * 2, new THREE.Vector3())), true);
          tracks.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 180, item.hero ? 0.06 : 0.045, 6, true), ink));
        } else if (a.tracks === 'dotted') {
          const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.085, 6, 4), ink, 110);
          const dot = new THREE.Vector3();
          for (let i = 0; i < 110; i++) dots.setMatrixAt(i, new THREE.Matrix4().setPosition(at((i / 110) * Math.PI * 2, dot)));
          tracks.add(dots);
        }
        const rider: Rider = { holder: item.holder, at, anomaly, drop, phase: random() * 6 };
        riders.push(rider);
        at(anomaly, item.holder.position).y -= drop;
        item.holder.updateMatrixWorld(true);
        boxes.push(visibleBounds(item.holder));
      });

      const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
      const centre = bounds.getCenter(new THREE.Vector3());
      camera.position.copy(centre).addScaledVector(toCamera, 160);
      camera.up.set(0, 1, 0);
      camera.lookAt(centre);
      camera.updateMatrixWorld(true);
      const seen = new THREE.Box2(), corner = new THREE.Vector3();
      for (const box of boxes)
        for (const x of [box.min.x, box.max.x])
          for (const y of [box.min.y, box.max.y])
            for (const z of [box.min.z, box.max.z]) {
              corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              seen.expandByPoint(new THREE.Vector2(corner.x, corner.y));
            }
      const middle = seen.getCenter(new THREE.Vector2());
      const extent = Math.max(...seen.getSize(new THREE.Vector2()).toArray()) * 0.55;
      camera.translateX(middle.x);
      camera.translateY(middle.y);
      camera.left = camera.bottom = -extent;
      camera.right = camera.top = extent;
      camera.updateProjectionMatrix();

      const span = bounds.getSize(new THREE.Vector3()).length();
      key.target.position.copy(centre);
      key.position.copy(centre).addScaledVector(toCamera, span).addScaledVector(right, mix(-0.9, 0.9, mood.daylight) * span).addScaledVector(upward, span * 0.8);
      const shadow = key.shadow.camera;
      shadow.left = shadow.bottom = -span * 0.6;
      shadow.right = shadow.top = span * 0.6;
      shadow.near = 0.1;
      shadow.far = span * 4;
      shadow.updateProjectionMatrix();
    };

    const pace = mix(0.02, 0.22, mood.energy);
    let clock = 0;
    return {
      object: root,
      camera,
      background: honey,
      capacity: SLOTS.length,
      ground: null,
      keyLight: key,
      place,
      update(dt) {
        clock += dt;
        for (const lane of lanesOfTraffic) lane.group.rotateY(dt * pace * lane.speed);
        swirl.rotation.y -= a.core === 'draining' ? dt * pace * 2 : 0;
        shells.forEach((shell, i) => shell.scale.setScalar(1 + ((clock * pace * 0.8 + i * 0.33) % 1) * 0.35));
        heart.scale.setScalar(1 + Math.sin(clock * mix(1, 7, mood.energy)) * (a.core === 'quiet' ? 0.03 : 0.1));
        // Everyone sways a little way along their orbit and back.
        for (const rider of riders) rider.at(rider.anomaly + Math.sin(clock * pace * 1.6 + rider.phase) * 0.07, rider.holder.position).y -= rider.drop;
      },
      dispose() {
        key.shadow.map?.dispose();
        disposeTree(root);
      },
    };
  },
});
