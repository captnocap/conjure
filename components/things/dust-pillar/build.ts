import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { blob, glow, hazePaint, hull, limb, makeNoise, rimPaint, star, tint, vec } from './cosmos';

const RIMS = {
  teal: 'Cool teal-green oxygen glow, the classic telescope palette.',
  amber: 'Warm amber and gold, like a lamp behind smoke.',
  rose: 'Hydrogen rose-pink, tender and bloody at once.',
  ice: 'Hard blue-white ultraviolet, harsh and clinical.',
} as const;
const RIM: Record<keyof typeof RIMS, string> = { teal: '#3fd6c0', amber: '#ffb347', rose: '#ff6f91', ice: '#9fd0ff' };

const gauss = (t: number, centre: number, width: number) => Math.exp(-(((t - centre) / width) ** 2));
type Kind = 'head' | 'stump' | 'arch' | 'branch';

export default defineThing({
  questions: {
    silhouette: choice('What silhouette does the pillar make?', {
      finger: 'A single tall finger pointing up, lonely and monumental.',
      hand: 'Three fingers of different heights rising from one base, like a reaching hand.',
      arch: 'A column that has toppled over into a bridge, its tip touching back down.',
      severed: 'A broken stump with its head torn free and floating just above it.',
      forked: 'One trunk that splits into two diverging horns, like antlers or a tuning fork.',
    }),
    eaten: score('How far has starlight eaten it away?', ['Fat, smooth and intact', 'Scalloped and pitted', 'Thin, gnawed and close to snapping']),
    lean: score('How does it stand?', ['Bolt upright', 'Gently bowed', 'Leaning hard, as if blown by a wind']),
    rim: choice('What colour is the glowing rim where radiation strikes it?', RIMS),
    tip: choice('What hides in the tip?', {
      nothing: 'Nothing: only dark dust, keeping its counsel.',
      ember: 'A newborn star glowing through the dust like a coal behind a hand.',
      globules: 'A cluster of small dark nodules on thin stalks, eggs about to detach.',
      jet: 'A thin bright jet spearing out of both sides of the head from a hidden star.',
      disc: 'A tiny dark planet-forming disc with a spark at its centre, perched just off the tip.',
    }),
    activity: choice('What is the starlight doing to it right now?', {
      patient: 'Almost nothing: it stands quietly, one faint wisp rising.',
      boiling: 'Wisps of gas boil and stream off the tip like steam.',
      shedding: 'Whole chunks are breaking off and drifting away downwind.',
      crowned: 'A bright shock front hangs over the tip like a halo or crown.',
    }),
    stars: noul('Are newborn stars already shining in the space around it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const eaten = clamp01(a.eaten * 0.85 + mood.wear * 0.15);
    const rimColour = new THREE.Color(RIM[a.rim]).lerp(new THREE.Color('#ffffff'), mix(0, 0.25, mood.cheer));
    const dustLow = new THREE.Color('#0d0c1c').lerp(new THREE.Color('#1c0d08'), mood.warmth);
    const dustHigh = new THREE.Color('#2b2d52').lerp(new THREE.Color('#54301c'), mood.warmth);
    const dust = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, emissive: rimColour, emissiveIntensity: 0.015 });
    const rim = rimPaint(rimColour);
    const halo = hazePaint(rimColour, 0.14, THREE.BackSide);
    const wispPaint = hazePaint(rimColour.clone().lerp(new THREE.Color('#ffffff'), 0.15), 0.42);
    const height = 6.2;
    const side = random() < 0.5 ? -1 : 1;
    const lean = side * mix(0, 1.7, a.lean);
    const shade = new THREE.Color();
    const thin = 1 - 0.32 * eaten;
    const swayers: { node: THREE.Object3D; phase: number; reach: number }[] = [];
    const drifters: { node: THREE.Object3D; phase: number; home: THREE.Vector3 }[] = [];

    /** Dress a dust geometry: dark painted body, a hard bright rim and a soft outer haze. */
    const dress = (geometry: THREE.BufferGeometry, rimWidth: number, parent: THREE.Object3D = s.root) => {
      tint(geometry, (p, n) => {
        const h = clamp01(p.y / height);
        const mottle = noise(p.x * 1.3, p.y * 1.3, p.z * 1.3, 3) * 0.5 + 0.5;
        return shade.copy(dustLow).lerp(dustHigh, clamp01(h * 0.5 + mottle * 0.4)).lerp(rimColour, h * h * 0.1 * clamp01(n.y * 0.6 + 0.4));
      });
      const body = new THREE.Mesh(geometry, dust);
      body.castShadow = body.receiveShadow = true;
      const edge = new THREE.Mesh(hull(geometry, (p) => rimWidth * (0.45 + 0.75 * clamp01(p.y / height))), rim);
      const mist = new THREE.Mesh(hull(geometry, (p) => rimWidth * 3.4 * (0.25 + 0.75 * clamp01(p.y / height))), halo);
      parent.add(body, edge, mist);
      return body;
    };

    const profile = (t: number, kind: Kind) => {
      let r = mix(1, 0.56, t);
      if (kind === 'head' || kind === 'stump') r += 0.55 * (1 - t) ** 3;
      if (kind === 'head' || kind === 'branch') {
        r += 0.24 * gauss(t, 0.86, 0.07) - eaten * 0.26 * gauss(t, 0.69, 0.07);
        if (t > 0.92) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.92) / 0.08) ** 2));
      }
      if (kind === 'stump' && t > 0.8) r *= Math.sqrt(Math.max(0, 1 - ((t - 0.8) / 0.2) ** 2)) * 0.8 + 0.2 * (1 - t) * 5;
      if (kind === 'arch') r = mix(1.1, 0.5, t) + 0.5 * (1 - t) ** 3 - 0.3 * gauss(t, 0.62, 0.15) * eaten + 0.12 * gauss(t, 0.35, 0.1);
      return r * thin;
    };
    const tips: { at: THREE.Vector3; dir: THREE.Vector3; r: number }[] = [];
    const column = (points: THREE.Vector3[], width: number, kind: Kind) => {
      const amp = mix(0.16, 0.4, eaten), bite = mix(0.08, 0.55, eaten), f = 1.5 / Math.max(width, 0.4);
      const offset = random() * 40;
      const geometry = limb(points, {
        rings: 80,
        sides: 30,
        radius: (t) => width * profile(t, kind),
        rough: (p, t) =>
          1 + amp * noise(p.x * f + offset, p.y * f * 0.6, p.z * f, 5) + amp * 0.35 * noise(p.x * f * 3.1, p.y * f * 2.2 + offset, p.z * f * 3.1, 2)
          - bite * Math.max(0, noise(p.x * 0.6 - offset, p.y * 0.55, p.z * 0.6, 2)) * Math.min(1, t * 3) * (t < 0.95 ? 1 : 0),
      });
      dress(geometry, width * 0.11);
      const curve = new THREE.CatmullRomCurve3(points);
      const where = kind === 'arch' ? 0.42 : kind === 'stump' ? 0.9 : 0.87;
      const dir = kind === 'arch' ? vec(0, 1, 0) : curve.getTangentAt(where).normalize();
      if (kind !== 'stump') tips.push({ at: curve.getPointAt(where), dir, r: width * profile(where, kind) });
      // Smaller fingers bud off the flanks, the way real pillars carry knuckles and side spires.
      const buds = kind === 'arch' ? 2 : kind === 'stump' ? 1 : 2 + Math.floor(random() * 2);
      for (let i = 0; i < buds; i++) {
        const t = kind === 'arch' ? mix(0.25, 0.7, random()) : mix(0.35, 0.72, random());
        const from = curve.getPointAt(t);
        const out = vec(wobble(2), 0, wobble(1.4)).normalize();
        const reach = width * mix(1.1, 2.1, random());
        const girth = width * mix(0.22, 0.36, random()) * thin;
        const bud = limb([from, from.clone().addScaledVector(out, width * 0.75).add(vec(0, reach * 0.35, 0)), from.clone().addScaledVector(out, width * 0.95).add(vec(0, reach, 0))], {
          rings: 20, sides: 12,
          radius: (u) => girth * (mix(1.3, 0.75, u) + 0.3 * gauss(u, 0.82, 0.1)) * (u > 0.9 ? Math.sqrt(Math.max(0, 1 - ((u - 0.9) / 0.1) ** 2)) : 1),
          rough: (q) => 1 + amp * 0.8 * noise(q.x * f * 1.6 + offset, q.y * f, q.z * f * 1.6, 3),
        });
        dress(bud, girth * 0.16);
      }
    };
    const mound = (x: number, radius: number) => {
      const geometry = blob(radius * 0.82, (d) => 1 + 0.4 * noise(d.x * 2.6 + x, d.y * 2, d.z * 2.6, 4), 4);
      const position = geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) position.setY(i, Math.max(0, position.getY(i) * 0.3));
      geometry.computeVertexNormals();
      geometry.translate(x, 0, 0);
      dress(geometry, 0.05);
    };
    const wobble = (amount: number) => (random() - 0.5) * amount;
    const spine = (x: number, top: number, bend: number, from = 0) => [0, 0.3, 0.62, 0.85, 1].map((t) =>
      vec(x + bend * t ** 1.7 + (t > 0 && t < 1 ? wobble(0.45) : 0), mix(from, top, t), t > 0 && t < 1 ? wobble(0.35) : 0));

    if (a.silhouette === 'finger') {
      column(spine(0, height, lean), 0.95, 'head');
      mound(0, 1.9);
    } else if (a.silhouette === 'hand') {
      const order = side > 0 ? [-1, 0, 1] : [1, 0, -1];
      [height, height * 0.76, height * 0.55].forEach((top, index) =>
        column(spine(order[index] * 1.35 + wobble(0.2), top * mix(0.92, 1.05, random()), lean * (0.6 + index * 0.25) + order[index] * 0.35), 0.72 - index * 0.09, 'head'));
      mound(0, 2.7);
    } else if (a.silhouette === 'arch') {
      const span = 2.5, crown = mix(5, 3.6, a.lean);
      column([
        vec(-span * side, 0, 0), vec(-span * 0.92 * side, crown * 0.55, wobble(0.3)), vec(-span * 0.4 * side, crown * 0.98, wobble(0.3)),
        vec(span * 0.35 * side, crown, wobble(0.3)), vec(span * 0.95 * side, crown * 0.62, wobble(0.3)), vec(span * 1.1 * side, crown * 0.2, 0), vec(span * 1.12 * side, -0.3, 0),
      ], 0.78, 'arch');
      mound(-span * side, 1.7);
      mound(span * 1.1 * side, 1.1);
    } else if (a.silhouette === 'severed') {
      column(spine(0, height * 0.56, lean * 0.4), 1, 'stump');
      mound(0, 2);
      const at = vec(lean * 0.75 + side * 0.3, height * 0.82, 0);
      const radius = 0.86 * thin;
      const geometry = blob(radius, (d) => (1 + mix(0.12, 0.3, eaten) * noise(d.x * 1.8, d.y * 1.8, d.z * 1.8, 4)) * (d.y < 0 ? 1 + 0.9 * d.y * d.y : 1.12), 4);
      geometry.rotateZ(-lean * 0.12);
      geometry.translate(at.x, at.y, at.z);
      dress(geometry, 0.08);
      tips.push({ at, dir: vec(0, 1, 0), r: radius });
      // Crumbs hang in the gap where it tore.
      for (let i = 0; i < 7; i++) {
        const crumb = blob(0.07 + random() * 0.13, (d) => 1 + 0.3 * noise(d.x * 2 + i, d.y * 2, d.z * 2, 2), 2);
        crumb.translate(mix(0, at.x, random()) + wobble(0.9), mix(height * 0.56, height * 0.68, random()), wobble(0.7));
        dress(crumb, 0.03);
      }
    } else {
      column(spine(0, height * 0.6, lean * 0.3), 0.98, 'stump');
      mound(0, 2);
      const fork = vec(lean * 0.12, height * 0.36, 0);
      for (const [dx, top, width] of [[-1.5, height, 0.6], [1.35, height * 0.8, 0.52]] as const)
        column([fork.clone(), vec(fork.x + dx * 0.45 * side, mix(fork.y, top, 0.35), wobble(0.3)), vec(fork.x + dx * 0.95 * side + lean * 0.4, mix(fork.y, top, 0.72), wobble(0.3)), vec(fork.x + dx * side + lean * 0.8, top, 0)], width, 'branch');
    }

    const main = tips[0];
    const front = vec(0.3 * side, 0.12, 1).normalize();
    if (a.tip === 'ember') {
      const ember = star(main.r * 0.36, mood.warmth > 0.5 ? '#ffb45a' : '#ffd98a', 2.6, 1.2);
      ember.position.copy(main.at).addScaledVector(front, main.r * 0.74);
      s.root.add(ember);
      const seep = glow(main.r * 1.7, '#ffb060', 0.5, 3);
      seep.position.copy(main.at);
      s.root.add(seep);
    } else if (a.tip === 'globules') {
      const count = 5 + Math.floor(random() * 4);
      for (let i = 0; i < count; i++) {
        const out = vec(wobble(2), 0.25 + random(), wobble(2)).normalize();
        const from = main.at.clone().addScaledVector(out, main.r * 0.55);
        const reach = main.r * mix(1, 2.1, random());
        const drift = vec(wobble(0.4), 0.3, wobble(0.4));
        const stalk = limb([from, from.clone().addScaledVector(out, reach * 0.5).addScaledVector(drift, 0.4), from.clone().addScaledVector(out, reach).add(drift)], {
          rings: 14, sides: 9,
          radius: (t) => main.r * (0.1 + 0.2 * gauss(t, 0.8, 0.14)) * (t > 0.9 ? Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)) : 1),
        });
        dress(stalk, 0.035);
      }
    } else if (a.tip === 'jet') {
      const jetColour = a.rim === 'rose' || a.rim === 'amber' ? '#7ff0e0' : '#ff9a7a';
      const beam = new THREE.MeshBasicMaterial({ color: jetColour });
      const axis = vec(side, 0.45 + wobble(0.3), 0.35).normalize();
      for (const [sign, reach] of [[1, 2.5], [-1, 1.7]] as const) {
        const end = main.at.clone().addScaledVector(axis, sign * reach);
        s.rod(main.at.toArray(), end.toArray(), 0.05, beam, 0.025).castShadow = false;
        const cap = s.mesh(new THREE.SphereGeometry(0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: jetColour, side: THREE.DoubleSide }), end.toArray());
        cap.quaternion.setFromUnitVectors(vec(0, 1, 0), axis.clone().multiplyScalar(sign));
        const flare = glow(0.5, jetColour, 1);
        flare.position.copy(end);
        s.root.add(flare);
      }
    } else if (a.tip === 'disc') {
      const perch = main.at.clone().addScaledVector(main.dir, main.r * 2.3).add(vec(side * 0.5, 0, 0.3));
      const disc = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(main.r * 0.75, main.r * 0.75, 0.035, 36), new THREE.MeshStandardMaterial({ color: dustLow.clone().multiplyScalar(1.6), roughness: 0.9 }));
      const lip = new THREE.Mesh(new THREE.TorusGeometry(main.r * 0.75, 0.02, 6, 48), new THREE.MeshBasicMaterial({ color: rimColour }));
      lip.rotation.x = Math.PI / 2;
      disc.add(plate, lip, star(main.r * 0.16, '#ffe9bf', 3, 1.2));
      disc.position.copy(perch);
      disc.rotation.set(0.9, 0, 0.5 * side);
      s.root.add(disc);
    }

    tips.forEach((tip, index) => {
      const wisps = a.activity === 'boiling' ? 5 + Math.floor(random() * 4) : a.activity === 'patient' ? (index === 0 ? 1 : 0) : 2;
      const reach = mix(0.9, 1.9, mood.energy) * (a.activity === 'boiling' ? 1 : 0.6);
      for (let i = 0; i < wisps; i++) {
        const out = vec(wobble(1.6), 0.5 + random(), wobble(1.6)).normalize();
        const curl = vec(wobble(1.2) - lean * 0.12, 0.8 + random() * 0.6, wobble(0.8));
        const local = [vec(0, 0, 0), out.clone().multiplyScalar(0.45 * reach), out.clone().multiplyScalar(0.7 * reach).addScaledVector(curl, 0.5 * reach), out.clone().multiplyScalar(0.8 * reach).addScaledVector(curl, 1.15 * reach)];
        const base = tip.r * mix(0.16, 0.3, random());
        local.splice(2, 0, out.clone().multiplyScalar(0.6 * reach).addScaledVector(curl, 0.2 * reach).add(vec(wobble(0.5), 0, wobble(0.5))));
        const geometry = limb(local, { rings: 22, sides: 8, radius: (t) => base * Math.sin(Math.PI * Math.min(1, t * 1.02)) ** 0.6 * (1 - t * 0.55) + 0.004 });
        const wisp = new THREE.Mesh(geometry, wispPaint);
        const pivot = new THREE.Group();
        pivot.position.copy(tip.at).addScaledVector(out, tip.r * 0.7);
        pivot.add(wisp);
        s.root.add(pivot);
        swayers.push({ node: pivot, phase: random() * 6.28, reach: mix(0.05, 0.2, mood.energy) });
      }
      if (a.activity === 'shedding') {
        const count = 4 + Math.floor(random() * 4 + mood.density * 3);
        for (let i = 0; i < count; i++) {
          const far = (i + 1) / count;
          const chunk = blob(tip.r * mix(0.42, 0.1, far) * mix(0.8, 1.2, random()), (d) => 1 + 0.32 * noise(d.x * 2 + i * 7, d.y * 2, d.z * 2, 3), 2);
          const node = new THREE.Group();
          node.position.copy(tip.at).add(vec(-side * (0.5 + far * 2.6) + wobble(0.4), tip.r * 0.6 + far * 1.4 + wobble(0.5), wobble(1.2)));
          dress(chunk, 0.035, node);
          // The chunk is painted in pillar space, so lift the paint reference with a translation instead.
          s.root.add(node);
          drifters.push({ node, phase: random() * 6.28, home: node.position.clone() });
        }
      }
      if (a.activity === 'crowned') {
        const crown = new THREE.Group();
        const radius = tip.r * 2.1, spread = 0.95;
        const veil = new THREE.Mesh(new THREE.SphereGeometry(radius, 28, 10, 0, Math.PI * 2, 0, spread), hazePaint(rimColour, 0.3, THREE.DoubleSide));
        const band = new THREE.Mesh(new THREE.TorusGeometry(radius * Math.sin(spread), tip.r * 0.06, 8, 56), new THREE.MeshBasicMaterial({ color: rimColour.clone().lerp(new THREE.Color('#ffffff'), 0.35) }));
        band.rotation.x = Math.PI / 2;
        band.position.y = radius * Math.cos(spread);
        const brow = new THREE.Mesh(new THREE.TorusGeometry(radius * Math.sin(spread * 0.5), tip.r * 0.035, 6, 48), band.material);
        brow.rotation.x = Math.PI / 2;
        brow.position.y = radius * Math.cos(spread * 0.5);
        crown.add(veil, band, brow);
        crown.position.copy(tip.at);
        crown.quaternion.setFromUnitVectors(vec(0, 1, 0), tip.dir.clone().lerp(vec(0, 1, 0), 0.5).normalize());
        s.root.add(crown);
      }
    });

    if (a.stars) {
      const count = 3 + Math.floor(mood.density * 5 + random() * 2);
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2, distance = 1.9 + random() * 1.6;
        const spark = star(0.07 + random() * 0.09, ['#7db8ff', '#ffc94d', '#ff9a6b'][i % 3], 3, 1.2, 5);
        spark.position.set(Math.cos(angle) * distance + lean * 0.4, 1.2 + random() * (height - 1.5), Math.sin(angle) * distance * 0.7);
        s.root.add(spark);
      }
    }

    const speed = mix(0.25, 1.6, mood.energy);
    return s.finish({
      footprint: a.silhouette === 'arch' ? 3.4 : a.silhouette === 'hand' ? 2.8 : 2.1,
      update: (_dt, time) => {
        for (const sway of swayers) {
          sway.node.rotation.z = Math.sin(time * speed + sway.phase) * sway.reach;
          sway.node.rotation.x = Math.cos(time * speed * 0.7 + sway.phase) * sway.reach * 0.6;
        }
        for (const drift of drifters) {
          drift.node.position.y = drift.home.y + Math.sin(time * speed * 0.6 + drift.phase) * 0.08;
          drift.node.rotation.y = time * speed * 0.2 + drift.phase;
        }
      },
    });
  },
});
