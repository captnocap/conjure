import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    sail: choice('What is the kite made of?', {
      silk: 'A cream silk handkerchief stretched on a cedar cross, as Franklin described.',
      crimson: 'Crimson silk with a gold hem, a gentleman\'s extravagance.',
      newsprint: 'Pasted sheets of a printed almanack, the lettering still legible.',
      oilcloth: 'Dark green oilcloth, heavy and rainproof.',
      nylon: 'A modern ripstop nylon kite in bright panels, a re-enactment.',
    }),
    sparks: choice('What is the electricity doing?', {
      none: 'Nothing yet: the string hangs wet and ordinary.',
      bristle: 'The loose fibres of the hemp are standing on end, bristling with charge.',
      spark: 'A fat spark is jumping from the key.',
      strike: 'A full bolt is running down the whole string from the wire point to the key.',
    }),
    tail: choice('What kind of tail does the kite have?', {
      bows: 'A string of rag bows.',
      ribbon: 'One long streaming ribbon.',
      twists: 'Knotted twists of paper, like a child\'s kite.',
      none: 'No tail at all, so it yaws and darts.',
    }),
    line: choice('What state is the string in?', {
      taut: 'Pulled taut and straight, humming in the wind.',
      slack: 'Sagging in a long lazy belly.',
      snapped: 'Snapped: the kite is tumbling free and the key has fallen with the loose end.',
    }),
    anchor: choice('What is at the bottom of the string?', {
      jar: 'A Leyden jar standing on the ground, waiting to be charged.',
      post: 'A shed doorpost, the silk ribbon tied to an iron nail.',
      winder: 'A wooden winding reel staked into the turf.',
    }),
    key: score('How big and grand is the key?', ['A small plain iron latch key', 'A brass door key', 'A great ornate church key']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hemp = s.material('#a8935e', { roughness: 1 });
    const cedar = s.material('#8a5f3a', { roughness: 0.8 });
    const brass = s.material(mix(0, 1, a.key) < 0.25 ? '#5c5a57' : '#c79a35', { metalness: 0.85, roughness: mix(0.28, 0.6, mood.wear) });
    const iron = s.material('#4c4e52', { metalness: 0.7, roughness: 0.5 });
    const bolt = new THREE.MeshStandardMaterial({ color: '#2a5fd0', emissive: '#3f8bff', emissiveIntensity: 0.7, roughness: 0.5 });
    const boltHalo = new THREE.MeshBasicMaterial({ color: '#a9d2ff', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.BackSide });
    const snapped = a.line === 'snapped';

    // ----- the kite, built flat in its own frame: +y up the spine, facing +z
    const kite = new THREE.Group();
    const add = <T extends THREE.Object3D>(node: T, parent: THREE.Object3D = kite) => { parent.add(node); return node; };
    const half = 0.78;
    {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const base = { silk: '#d9c794', crimson: '#b3202c', newsprint: '#ded5bb', oilcloth: '#2f4a3a', nylon: '#f2c21a' }[a.sail];
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 512);
      if (a.sail === 'nylon') {
        for (const [c, x, y] of [['#e2382e', 0, 0], ['#1f7fd0', 256, 256]] as const) { ctx.fillStyle = c; ctx.fillRect(x, y, 256, 256); }
      } else if (a.sail === 'newsprint') {
        ctx.fillStyle = '#3a3329';
        ctx.font = 'bold 40px serif';
        ctx.fillText('POOR RICHARD', 60, 70);
        for (let y = 100; y < 500; y += 15) for (let x = 24; x < 490; x += 240) ctx.fillRect(x, y, 150 + random() * 70, 5);
        ctx.strokeStyle = '#3a3329'; ctx.lineWidth = 3; ctx.strokeRect(250, 0, 3, 512);
      } else if (a.sail === 'silk' || a.sail === 'crimson') {
        ctx.fillStyle = a.sail === 'silk' ? '#7a5a3a' : '#e7c35a';
        ctx.font = 'italic bold 86px serif';
        ctx.textAlign = 'center';
        ctx.save(); ctx.translate(256, 256); ctx.rotate(-Math.PI / 4); ctx.fillText('B.F.', 0, 120); ctx.restore();
      }
      ctx.strokeStyle = a.sail === 'crimson' ? '#e7c35a' : a.sail === 'oilcloth' ? '#1c2c22' : 'rgba(90,70,40,0.6)';
      ctx.lineWidth = 16;
      ctx.strokeRect(8, 8, 496, 496);
      ctx.strokeStyle = 'rgba(60,40,20,0.35)';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(512, 512); ctx.moveTo(512, 0); ctx.lineTo(0, 512); ctx.stroke();
      // Storm damage: stains, scorch and a tear.
      for (let i = 0; i < Math.round(mood.wear * 12); i++) {
        ctx.fillStyle = `rgba(50,40,30,${0.12 + random() * 0.2})`;
        ctx.beginPath(); ctx.arc(random() * 512, random() * 512, 12 + random() * 44, 0, 7); ctx.fill();
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const square = new THREE.PlaneGeometry(half * Math.SQRT2, half * Math.SQRT2, 14, 14);
      const p = square.attributes.position as THREE.BufferAttribute;
      const side = half * Math.SQRT2 / 2;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) / side, v = p.getY(i) / side;
        // Each quarter of the handkerchief bellies back between the cross sticks.
        const d1 = Math.abs(u - v) / 2, d2 = Math.abs(u + v) / 2;
        p.setZ(i, -Math.sin(Math.min(1, d1 * 2) * Math.PI) * Math.sin(Math.min(1, d2 * 2) * Math.PI) * 0 - (1 - u * u) * (1 - v * v) * 0.02 - Math.min(d1, d2) * (1 - Math.max(Math.abs(u), Math.abs(v))) * 0.75);
      }
      square.computeVertexNormals();
      const sail = add(s.mesh(square, new THREE.MeshStandardMaterial({ map, roughness: a.sail === 'nylon' ? 0.4 : 0.8, side: THREE.DoubleSide })));
      sail.rotation.z = Math.PI / 4;
      add(s.rod([0, -half, 0.012], [0, half, 0.012], 0.014, cedar));
      add(s.rod([-half, 0, 0.02], [half, 0, 0.02], 0.014, cedar));
      // The pointed wire, a foot or more above the top of the upright stick.
      add(s.rod([0, half - 0.05, 0.02], [0, half + 0.5, 0.02], 0.009, iron, 0.002));
      add(s.ring(0.02, 0.006, [0, half - 0.02, 0.02], iron));
    }
    const bridleLocal: P = [0, 0.05, 0.42];
    add(s.rod([0, half * 0.55, 0.02], bridleLocal, 0.006, hemp));
    add(s.rod([0, -half * 0.6, 0.02], bridleLocal, 0.006, hemp));

    // Tail, streaming from the bottom corner.
    const tailLength = mix(1.2, 1.9, random());
    const wave = (t: number): P => [Math.sin(t * 5 + random() * 0.3) * 0.12 * t, -half - t * tailLength, -t * 0.5 + Math.sin(t * 7) * 0.05];
    if (a.tail !== 'none') {
      const points = Array.from({ length: 9 }, (_unused, i) => wave(i / 8));
      if (a.tail === 'ribbon') {
        const ribbon = add(s.tube(points, 0.045, s.material(a.sail === 'crimson' ? '#e7c35a' : '#c9352b', { roughness: 0.8 })));
        ribbon.scale.z = 1;
        const p = ribbon.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) * 1); // keep the wave; flatten below
        ribbon.geometry.scale(1, 1, 1);
      } else {
        add(s.tube(points, 0.006, hemp));
        const cloth = [s.material('#c9352b'), s.material('#e9e2cc'), s.material('#3e6a9a')];
        const count = a.tail === 'bows' ? 6 : 9;
        for (let i = 1; i <= count; i++) {
          const at = wave(i / (count + 0.5));
          if (a.tail === 'bows') {
            for (const side of [-1, 1]) {
              const wing = add(s.mesh(new THREE.ConeGeometry(0.1, 0.2, 4), cloth[i % 3], [at[0] + side * 0.1, at[1], at[2]]));
              wing.rotation.z = side * Math.PI / 2;
              wing.scale.z = 0.35;
            }
          } else {
            const twist = add(s.box([0.06, 0.24, 0.06], at, cloth[i % 3]));
            twist.rotation.set(random() * 3, random() * 3, random() * 3);
          }
        }
      }
    }

    // ----- placing the kite in the sky and running the string down to the key
    const kiteAt = new THREE.Vector3(snapped ? -0.9 : -1.5, snapped ? 2.5 : 3.6, 0);
    kite.position.copy(kiteAt);
    kite.rotation.set(snapped ? 0.9 : -0.5, snapped ? 1.1 : 0.25, snapped ? -1.2 : 0.35 + (random() - 0.5) * 0.3, 'YXZ');
    s.root.add(kite);
    kite.updateMatrixWorld(true);
    const bridle = new THREE.Vector3(...bridleLocal).applyMatrix4(kite.matrixWorld);
    const tip = new THREE.Vector3(0, half + 0.5, 0.02).applyMatrix4(kite.matrixWorld);

    const keyLength = mix(0.32, 0.62, a.key);
    const anchorX = 1.35;
    const keyTop = new THREE.Vector3(anchorX - 0.4, 1.5, 0.1);
    const stringPath: THREE.Vector3[] = [];
    const sag = a.line === 'slack' ? 0.95 : 0.12;
    if (!snapped) {
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        stringPath.push(bridle.clone().lerp(keyTop, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * sag, 0)));
      }
    } else {
      // The broken end trails from the kite in a whip curl.
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        stringPath.push(bridle.clone().add(new THREE.Vector3(t * 1.1 + Math.sin(t * 6) * 0.15, -t * 1.2 + Math.cos(t * 5) * 0.12, Math.sin(t * 4) * 0.2)));
      }
    }
    s.tube(stringPath.map((point) => point.toArray() as P), 0.009, hemp);

    // The key: bow, shank, collar and bit.
    const key = new THREE.Group();
    {
      const bow = keyLength * 0.2;
      add(s.ring(bow, keyLength * 0.035, [0, -bow, 0], brass), key);
      if (a.key > 0.6) {
        for (const x of [-1, 1]) add(s.ring(bow * 0.45, keyLength * 0.025, [x * bow * 0.5, -bow, 0], brass), key);
        add(s.ring(bow * 0.45, keyLength * 0.025, [0, -bow * 0.45, 0], brass), key);
      }
      add(s.cylinder(keyLength * 0.035, keyLength * 0.035, keyLength * 0.72, [0, -bow * 2 - keyLength * 0.36, 0], brass, 10), key);
      add(s.cylinder(keyLength * 0.06, keyLength * 0.06, keyLength * 0.05, [0, -bow * 2 - keyLength * 0.04, 0], brass, 10), key);
      add(s.box([keyLength * 0.2, keyLength * 0.16, keyLength * 0.035], [keyLength * 0.11, -bow * 2 - keyLength * 0.62, 0], brass), key);
      add(s.box([keyLength * 0.08, keyLength * 0.05, keyLength * 0.04], [keyLength * 0.16, -bow * 2 - keyLength * 0.52, 0], iron), key);
    }
    s.root.add(key);

    // Anchor.
    const silk = s.material('#3e6a9a', { roughness: 0.6 });
    let earth = new THREE.Vector3(anchorX, 0.6, 0);
    if (a.anchor === 'jar') {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#b9d6cf', roughness: 0.08, transparent: true, opacity: 0.5 });
      const foil = s.material('#b9bcbf', { metalness: 0.9, roughness: 0.35 });
      s.lathe([[0.001, 0], [0.16, 0], [0.16, 0.34], [0.13, 0.42], [0.09, 0.46], [0.09, 0.5]], glass, [anchorX, 0, 0]);
      s.cylinder(0.163, 0.163, 0.24, [anchorX, 0.13, 0], foil, 24);
      s.cylinder(0.1, 0.1, 0.04, [anchorX, 0.5, 0], s.material('#7a5a3a'), 16);
      s.rod([anchorX, 0.5, 0], [anchorX, 0.72, 0], 0.01, brass);
      s.ball([0.045, 0.045, 0.045], [anchorX, 0.75, 0], brass, 14);
      earth = new THREE.Vector3(anchorX, 0.75, 0);
    } else if (a.anchor === 'post') {
      const timber = s.material('#6b5540', { roughness: 0.95 });
      s.box([0.2, 2.3, 0.2], [anchorX + 0.2, 1.15, -0.1], timber);
      s.box([1.3, 0.2, 0.2], [anchorX + 0.75, 2.25, -0.1], timber);
      s.box([0.2, 2.3, 0.2], [anchorX + 1.3, 1.15, -0.1], timber);
      s.box([0.9, 0.05, 0.6], [anchorX + 0.55, 0.025, 0], s.material('#8a8172'));
      s.rod([anchorX + 0.1, 1.3, 0], [anchorX + 0.02, 1.33, 0.05], 0.012, iron);
      earth = new THREE.Vector3(anchorX + 0.05, 1.31, 0.03);
    } else {
      const timber = s.material('#8a6a44', { roughness: 0.9 });
      s.rod([anchorX, -0.2, 0], [anchorX + 0.08, 0.55, 0], 0.03, timber, 0.022);
      const reel = new THREE.Group();
      reel.position.set(anchorX + 0.07, 0.5, 0.07);
      for (const z of [-0.07, 0.07]) add(s.cylinder(0.15, 0.15, 0.012, [0, 0, z], timber, 16), reel).rotation.x = Math.PI / 2;
      add(s.cylinder(0.09, 0.09, 0.13, [0, 0, 0], hemp, 14), reel).rotation.x = Math.PI / 2;
      add(s.rod([0.1, 0, 0.08], [0.1, 0, 0.2], 0.012, timber), reel);
      s.root.add(reel);
      earth = new THREE.Vector3(anchorX + 0.02, 0.62, 0.07);
    }

    if (!snapped) {
      key.position.copy(keyTop);
      key.rotation.z = 0.12;
      // Dry silk ribbon from the key to whatever holds it: the insulator that kept Franklin alive.
      const mid = keyTop.clone().lerp(earth, 0.5).add(new THREE.Vector3(0, -0.14, 0.04));
      const ribbon = s.tube([keyTop.toArray() as P, mid.toArray() as P, earth.toArray() as P], 0.016, silk);
      ribbon.scale.z = 1;
      s.ring(0.03, 0.012, [keyTop.x, keyTop.y, keyTop.z], silk);
    } else {
      key.position.set(0.25, 0.03, 0.5);
      key.rotation.set(Math.PI / 2, 0, 0.9);
      const loose: P[] = [[0.25, 0.02, 0.5], [0.6, 0.02, 0.2], [0.35, 0.02, -0.15], [0.8, 0.02, -0.3], [earth.x - 0.2, 0.15, 0.1], earth.toArray() as P];
      s.tube(loose, 0.009, hemp);
    }

    // Electricity.
    const zig = (from: THREE.Vector3, to: THREE.Vector3, steps: number, wild: number, radius: number, core: THREE.BufferGeometry[], halo: THREE.BufferGeometry[]) => {
      let last = from.clone();
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 1; i <= steps; i++) {
        const next = from.clone().lerp(to, i / steps);
        if (i < steps) next.add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(wild));
        const d = next.clone().sub(last);
        const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
        const mid = last.clone().add(next).multiplyScalar(0.5);
        for (const [list, k] of [[core, 1], [halo, 2.4]] as const) {
          const g = new THREE.CylinderGeometry(radius * k, radius * k, d.length() * 1.04, 5, 1);
          g.applyQuaternion(q);
          g.translate(mid.x, mid.y, mid.z);
          list.push(g);
        }
        last = next;
      }
    };
    const core: THREE.BufferGeometry[] = [], halo: THREE.BufferGeometry[] = [];
    const keyTip = snapped ? new THREE.Vector3(0.25, 0.06, 0.5) : keyTop.clone().add(new THREE.Vector3(0.05, -keyLength - 0.02, 0));
    if (a.sparks === 'strike') {
      const sky = tip.clone().add(new THREE.Vector3(-0.3 + random() * 0.6, 1.5, 0));
      zig(sky, tip, 6, 0.3, 0.035, core, halo);
      for (let i = 0; i < stringPath.length - 1; i++) zig(stringPath[i], stringPath[i + 1], 2, 0.11, 0.022, core, halo);
      if (!snapped) zig(keyTip, earth, 4, 0.1, 0.018, core, halo);
    }
    if (a.sparks === 'spark' || a.sparks === 'strike') {
      const rays = a.sparks === 'spark' ? 6 : 4;
      for (let i = 0; i < rays; i++) {
        const d = new THREE.Vector3(random() - 0.5, random() - 0.7, random() - 0.5).normalize().multiplyScalar(mix(0.18, 0.42, random()));
        zig(keyTip, keyTip.clone().add(d), 3, 0.07, 0.012, core, halo);
      }
      if (a.sparks === 'spark' && !snapped) zig(keyTip, earth, 4, 0.09, 0.016, core, halo);
    }
    if (a.sparks === 'bristle') {
      // Hemp fibres standing straight out from the string, the first sign Franklin noticed.
      const fibres: THREE.BufferGeometry[] = [];
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 1; i < stringPath.length; i++)
        for (let k = 0; k < 7; k++) {
          const at = stringPath[i - 1].clone().lerp(stringPath[i], random());
          const d = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          const g = new THREE.CylinderGeometry(0.002, 0.007, 0.24, 4, 1);
          g.translate(0, 0.12, 0);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d));
          g.translate(at.x, at.y, at.z);
          fibres.push(g);
        }
      s.mesh(mergeGeometries(fibres)!, s.material('#d9c88f', { emissive: '#6f9fe0', emissiveIntensity: 0.35 }));
      fibres.forEach((g) => g.dispose());
      const glow = s.ball([0.06, 0.06, 0.06], [keyTip.x, keyTip.y, keyTip.z], boltHalo, 10);
      glow.castShadow = false;
    }
    let arcs: THREE.Mesh | null = null;
    if (core.length) {
      arcs = s.mesh(mergeGeometries(core)!, bolt);
      const aura = s.mesh(mergeGeometries(halo)!, boltHalo);
      aura.castShadow = aura.receiveShadow = false;
      [...core, ...halo].forEach((g) => g.dispose());
    }

    // A patch of wet turf so the scene has a floor of its own.
    const turf = s.material(new THREE.Color('#6f8750').lerp(new THREE.Color('#877f5c'), mood.wear), { roughness: 1 });
    s.cylinder(1.0, 1.05, 0.04, [anchorX - 0.25, -0.02, 0.1], turf, 22);
    s.scatter(new THREE.ConeGeometry(0.03, 0.2, 4), turf, Array.from({ length: 28 }, () => {
      const angle = random() * Math.PI * 2, reach = Math.sqrt(random()) * 0.95;
      return { at: [anchorX - 0.25 + Math.cos(angle) * reach, 0.08, 0.1 + Math.sin(angle) * reach] as P, size: mix(0.6, 1.3, random()) };
    }));

    const gust = mix(0.02, 0.1, mood.energy);
    const rest = kite.rotation.clone();
    return s.finish({
      footprint: 1.2,
      update(_dt, time) {
        kite.rotation.z = rest.z + Math.sin(time * 2.2) * gust;
        kite.rotation.x = rest.x + Math.sin(time * 3.4 + 1) * gust * 0.6;
        if (arcs) bolt.emissiveIntensity = 0.45 + 0.4 * Math.abs(Math.sin(time * 17) * Math.sin(time * 5.3));
      },
    });
  },
});
