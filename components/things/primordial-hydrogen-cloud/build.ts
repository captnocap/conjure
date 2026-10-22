import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, clamp01, defineThing, disposeTree, mix, score } from '@conjure/kit';

type P = [number, number, number];

export default defineThing({
  questions: {
    collapse: choice('How far has the cloud collapsed?', {
      fog: 'Not at all: a smooth, even fog with no feature anywhere.',
      dimpled: 'Dimpled: shallow creases have appeared, like a thumb pressed into dough.',
      puckered: 'Puckered: deep seams divide it into fat lobes that bulge between them.',
      beads: 'Strung into beads: it has broken up along the seams into strings of separate knots.',
    }),
    seams: score('How large is the pattern of seams?', ['Two or three broad folds', 'A handful of creases', 'A fine net of many small seams']),
    tint: choice('What tint does the gas have?', {
      pearl: 'Neutral pearl grey.',
      cool: 'Cool blue-grey, like breath on glass.',
      cream: 'Warm cream, like unbaked dough.',
      rose: 'A faint rose flush.',
      slate: 'Dark slate, a heavy thundery grey.',
    }),
    spark: choice('Is any point starting to glow?', {
      none: 'No. Nothing has lit yet.',
      ember: 'One dull ember deep in a seam, barely warmer than the rest.',
      point: 'One clear bright point has switched on where the seams meet.',
      several: 'Three or four points have lit along the seams at once.',
    }),
    outline: choice('What is its overall shape?', {
      pillow: 'A plump rounded pillow.',
      loaf: 'A long low loaf, stretched sideways.',
      sheet: 'A wide flat sheet, almost a pancake.',
      tower: 'A tall heaped column like a cumulus.',
    }),
    edge: choice('What is happening at its edges?', {
      clean: 'Clean, soft edges, nothing escaping.',
      puffs: 'Small puffs have budded off and hang nearby.',
      trailing: 'One side trails away in a thinning tail, as if it were drifting.',
      infall: 'Thin threads of gas are falling in from outside toward the seams.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const body = new THREE.Group();
    s.root.add(body);

    const tint = new THREE.Color({ pearl: '#c9c8c6', cool: '#b3c2d2', cream: '#ddd0b6', rose: '#d9bdc0', slate: '#7f8792' }[a.tint]);
    tint.lerp(new THREE.Color(mood.warmth > 0.5 ? '#e0c4a0' : '#a9c0dc'), Math.abs(mood.warmth - 0.5) * 0.3);
    const shade = tint.clone().multiplyScalar(0.3);
    const hot = new THREE.Color('#ffb14a').lerp(new THREE.Color('#9fd0ff'), clamp01(0.7 - mood.warmth));
    const shape = ({ pillow: [3.3, 2.3, 2.7], loaf: [4.4, 1.7, 2.3], sheet: [4.3, 0.95, 3.5], tower: [2.4, 3.6, 2.3] } satisfies Record<string, P>)[a.outline];
    const depth = { fog: 0, dimpled: 0.13, puckered: 0.27, beads: 0.2 }[a.collapse];
    const seamCount = Math.round(mix(2.5, 13, a.seams ** 1.3));
    const width = mix(0.2, 0.075, a.seams);
    // Each seam is a circle cut across the unit ball: a direction and an offset from the centre.
    const seams = Array.from({ length: seamCount }, () => {
      const n = new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.7, random() - 0.5).normalize();
      return { n, o: (random() - 0.5) * 0.9 };
    });
    const lobes = Array.from({ length: 6 }, () => [random() * 6.28, random() * 6.28, random() * 6.28, 1.2 + random() * 2.4] as const);
    const ragged = mix(0.05, 0.13, mood.wear) * (a.collapse === 'fog' ? 0.6 : 1);
    const groove = (v: THREE.Vector3) => {
      let g = 0;
      for (const { n, o } of seams) { const d = (v.dot(n) - o) / width; g = Math.max(g, Math.exp(-d * d)); }
      return g;
    };
    const tail = (v: THREE.Vector3) => (a.edge === 'trailing' && v.x > 0 ? 1 + v.x ** 3 * 1.1 : 1);

    const makeCloud = (detail: number, size = 1) => {
      const raw = new THREE.IcosahedronGeometry(1, detail);
      raw.deleteAttribute('uv'); raw.deleteAttribute('normal');
      const geometry = mergeVertices(raw);
      raw.dispose();
      const position = geometry.attributes.position;
      const colours = new Float32Array(position.count * 3);
      const v = new THREE.Vector3(), c = new THREE.Color();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).normalize();
        const g = groove(v);
        let push = 1 - g * depth;
        for (const [p, q, r, f] of lobes) push += Math.sin(v.x * f + p) * Math.sin(v.y * f + q) * Math.sin(v.z * f + r) * ragged;
        // Lobes swell a little between the seams, the way dough rises around a cut.
        push += (1 - g) * depth * 0.35;
        const stretch = tail(v);
        c.copy(tint).lerp(shade, clamp01(g ** 2.5 * (depth > 0 ? mix(0.6, 0.95, depth * 4) : 0) + clamp01(-v.y) * 0.12));
        colours.set([c.r, c.g, c.b], i * 3);
        position.setXYZ(i, v.x * push * size * shape[0] * stretch, v.y * push * size * shape[1] * (stretch > 1 ? 1 / stretch ** 0.7 : 1), v.z * push * size * shape[2] * (stretch > 1 ? 1 / stretch ** 0.7 : 1));
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      geometry.computeVertexNormals();
      return geometry;
    };
    const onSurface = (v: THREE.Vector3, lift = 1): P => [v.x * shape[0] * lift, v.y * shape[1] * lift, v.z * shape[2] * lift];
    const seamPoint = (k: number, angle: number) => {
      const { n, o } = seams[k % seams.length];
      const u = new THREE.Vector3(0, 1, 0).cross(n).normalize(), w = n.clone().cross(u), r = Math.sqrt(Math.max(0.05, 1 - o * o));
      return n.clone().multiplyScalar(o).addScaledVector(u, Math.cos(angle) * r).addScaledVector(w, Math.sin(angle) * r).normalize();
    };

    const gas = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: tint, emissiveIntensity: mix(0.08, 0.22, mood.cheer) });
    const veil = (opacity: number) => new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity, depthWrite: false });
    const breathing: THREE.Object3D[] = [];

    if (a.collapse !== 'beads') {
      const cloud = new THREE.Mesh(makeCloud(5), gas);
      cloud.castShadow = cloud.receiveShadow = true;
      body.add(cloud);
      breathing.push(cloud);
      if (a.collapse === 'fog') for (const [k, o] of [[1.12, 0.2], [1.26, 0.12], [1.42, 0.07]] as const) {
        const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), veil(o));
        halo.scale.set(shape[0] * k, shape[1] * k, shape[2] * k);
        body.add(halo);
      }
    } else {
      // The fog has broken into knots strung along its old seams; a ghost of the cloud remains.
      const ghost = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), veil(0.2));
      ghost.scale.set(...shape);
      body.add(ghost);
      // What is left of the fog, shrunk inside its own net.
      const rest = new THREE.Mesh(makeCloud(4, 0.6), gas);
      rest.castShadow = true;
      body.add(rest);
      breathing.push(rest);
      const beads: { at: P; size: number; color: THREE.Color }[] = [];
      const strand = new THREE.MeshStandardMaterial({ color: shade.clone().lerp(tint, 0.3), roughness: 1 });
      seams.forEach((_seam, k) => {
        const n = Math.round(mix(9, 16, random()) * mix(0.8, 1.3, mood.density));
        const start = random() * 6.28, arc = mix(3.2, 6.28, random());
        const line: THREE.Vector3[] = [];
        for (let i = 0; i < n; i++) {
          const v = seamPoint(k, start + arc * i / (n - 1) + (random() - 0.5) * 0.08);
          const at = onSurface(v, mix(0.86, 0.98, random()));
          line.push(new THREE.Vector3(...at));
          beads.push({ at, size: mix(0.14, 0.38, random() ** 1.5) * mix(1.25, 0.75, a.seams), color: tint.clone().lerp(shade, random() * 0.25) });
        }
        const thread = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line), n * 6, 0.035, 5), strand);
        thread.castShadow = true;
        body.add(thread);
      });
      const knots = s.scatter(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ roughness: 1, emissive: tint, emissiveIntensity: 0.15 }), beads);
      body.add(knots);
    }

    // Lit points sit where seams are, half sunk into the gas.
    const lights = { none: 0, ember: 1, point: 1, several: 3 + Math.floor(random() * 2) }[a.spark];
    const glows: THREE.Mesh[] = [];
    for (let i = 0; i < lights; i++) {
      const v = seamPoint(i, 0.6 + random() * 1.6 + (i ? random() * 4 : 0));
      if (v.z < 0.15) v.z = 0.15 + random() * 0.5;
      if (v.y < -0.2) v.y = random() * 0.5;
      v.normalize();
      const at = onSurface(v, a.spark === 'ember' ? 0.8 : 0.9);
      const size = a.spark === 'ember' ? 0.22 : a.spark === 'point' ? 0.2 : 0.14;
      const colour = a.spark === 'ember' ? new THREE.Color('#c8643a') : hot;
      const core = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), new THREE.MeshBasicMaterial({ color: a.spark === 'ember' ? colour : colour.clone().lerp(new THREE.Color('#ffffff'), 0.6), toneMapped: false }));
      core.position.set(...at);
      body.add(core);
      for (const [k, o] of [[2.2, 0.3], [4, 0.16], [6.5, 0.08]] as const) {
        const halo = new THREE.Mesh(new THREE.SphereGeometry(size * k, 18, 12), new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: o * (a.spark === 'ember' ? 0.8 : 1), depthWrite: false }));
        halo.position.set(...at);
        body.add(halo);
        glows.push(halo);
      }
      if (a.spark !== 'ember') for (const turn of [0.4, 0.4 + Math.PI / 2]) {
        const spike = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: colour.clone().lerp(new THREE.Color('#ffffff'), 0.4), toneMapped: false }));
        spike.scale.set(size * 5.5, size * 0.22, size * 0.22);
        spike.rotation.z = turn;
        spike.position.set(...at);
        body.add(spike);
      }
    }

    if (a.edge === 'puffs') {
      const n = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < n; i++) {
        const ang = random() * 6.28, r = mix(0.3, 0.75, random());
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), new THREE.MeshStandardMaterial({ color: tint.clone().lerp(shade, random() * 0.2), roughness: 1, emissive: tint, emissiveIntensity: 0.12 }));
        puff.scale.set(1.3, 0.8, 1);
        puff.position.set(Math.cos(ang) * (shape[0] + r + random() * 0.9), (random() - 0.3) * shape[1], Math.sin(ang) * (shape[2] + r + random() * 0.6));
        puff.castShadow = true;
        body.add(puff);
        breathing.push(puff);
      }
    }
    if (a.edge === 'infall') {
      const thread = new THREE.MeshStandardMaterial({ color: shade.clone().lerp(tint, 0.45), roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const v = seamPoint(i, random() * 6.28);
        if (v.y < -0.3) v.y = -v.y;
        const foot = new THREE.Vector3(...onSurface(v, 0.9)), far = new THREE.Vector3(...onSurface(v, mix(1.5, 1.9, random())));
        const bend = foot.clone().lerp(far, 0.55).add(new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(0.9));
        const stream = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([far, bend, foot]), 20, 0.05, 6), thread);
        stream.castShadow = true;
        body.add(stream);
        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), thread);
        drop.position.copy(far);
        body.add(drop);
      }
    }

    body.rotation.y = (random() - 0.5) * 0.8;
    const built = s.finish();
    const energy = mood.energy;
    return {
      object: built.object,
      update(_dt, time) {
        breathing.forEach((part, i) => {
          const swell = Math.sin(time * mix(0.25, 1.6, energy) + i * 1.7) * mix(0.004, 0.02, energy);
          const puff = part !== breathing[0];
          part.scale.set((puff ? 1.3 : 1) * (1 + swell), (puff ? 0.8 : 1) * (1 - swell), 1 + swell);
        });
        glows.forEach((halo, i) => halo.scale.setScalar(1 + Math.sin(time * mix(1, 6, energy) + i) * 0.06));
      },
      dispose: () => disposeTree(built.object),
    };
  },
});
