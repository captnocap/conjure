import * as THREE from 'three';
import { choice, defineThing, mix, score } from '@conjure/kit';
import { Batch, type P3, vary } from './sav';

export default defineThing({
  questions: {
    form: choice('What shape has the tree grown into?', {
      umbrella: 'One clean trunk fanning into a single wide flat parasol, the postcard tree.',
      twin: 'Two trunks rising from one root and leaning apart, their flat crowns overlapping.',
      tiered: 'A main table of crown with a second, lower shelf of foliage reaching out to one side.',
      windswept: 'The whole tree leans hard one way, crown dragged off-centre by years of wind.',
      broken: 'An elephant has torn a great limb off: a wedge of crown is missing and the limb lies dead beside the trunk.',
    }),
    spread: score('How wide is the crown?', ['A narrow parasol', 'A broad umbrella', 'A vast table wider than the tree is tall']),
    foliage: choice('What is the canopy doing this season?', {
      dry: 'Thin dusty olive leaf, gaps of sky and branch showing through. Late dry season.',
      green: 'Dense fresh green after rain, a solid dark slab of shade.',
      blossom: 'Green and dotted all over with cream-yellow puffball flowers.',
      bare: 'Leafless: only the flat-topped lattice of thorny twigs, dead or waiting out a drought.',
    }),
    browse: score('How hard have animals browsed the underside?', [
      'Untouched, a thick shaggy crown hanging low',
      'Trimmed to a neat level line',
      'Clipped razor-flat and high on a long bare trunk by giraffes',
    ]),
    nests: choice('What has nested in it?', {
      none: 'Nothing.',
      few: 'Two or three woven grass weaver nests dangling from the outer twigs.',
      colony: 'A whole weaver colony: dozens of little straw globes hanging under the crown like fruit.',
      raptor: 'One big untidy stick platform on top of the crown with a large hunched bird on it.',
    }),
    shade: choice('What is in the shade underneath?', {
      nothing: 'Only dry grass.',
      bones: 'A bleached horned skull and a few ribs, something that came here to die.',
      herder: "A herder's three-legged stool, a red blanket, a gourd and a staff leaned on the trunk, as if he has just stepped away.",
      kill: "A leopard's larder: a dead antelope hauled up and draped over the fork of the tree.",
      hive: 'A hollow log beehive slung by ropes from a limb, the traditional way of keeping bees.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wood = new Batch();
    const leaf = new Batch();
    const prop = new Batch();
    const root = new THREE.Group();

    const bark = new THREE.Color('#5d4b3c').lerp(new THREE.Color('#8a857c'), mood.wear * 0.45);
    const leafBase = new THREE.Color({ dry: '#8a8650', green: '#4f7a38', blossom: '#5c8540', bare: '#000000' }[a.foliage])
      .lerp(new THREE.Color('#a89a52'), mood.warmth * 0.22)
      .lerp(new THREE.Color('#7b7a66'), mood.wear * 0.25);
    const fullness = { dry: 0.55, green: 1, blossom: 0.9, bare: 0 }[a.foliage] * mix(0.8, 1.15, mood.density) * mix(1, 0.75, mood.wear);

    const R0 = mix(2.7, 6.3, a.spread) * mix(0.93, 1.07, random());
    const H0 = mix(5.4, 8.4, a.browse * 0.55 + random() * 0.45);
    const thick = mix(1.45, 0.7, a.browse);

    const limbsOf: { points: P3[]; r: number }[] = [];
    const hangPoints: THREE.Vector3[] = [];
    let highest = 0;

    /** One flat table of foliage fed by limbs that fan up from `feed`. */
    const crown = (cx: number, cz: number, top: number, R: number, feed: THREE.Vector3, feedRadius: number, wedge: number | null) => {
      highest = Math.max(highest, top);
      const under = top - thick;
      const phase = random() * 6.28;
      const inWedge = (theta: number) => wedge !== null && Math.abs(Math.atan2(Math.sin(theta - wedge), Math.cos(theta - wedge))) < 0.62;
      const tips: THREE.Vector3[] = [];
      const count = 5 + Math.floor(random() * 3);
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * 6.283 + (random() - 0.5) * 0.5;
        if (inWedge(theta)) continue;
        const rho = R * mix(0.42, 0.7, random());
        const tip = new THREE.Vector3(cx + Math.cos(theta) * rho, under - 0.05, cz + Math.sin(theta) * rho);
        const mid = feed.clone().lerp(tip, 0.5).add(new THREE.Vector3((random() - 0.5) * 0.5, mix(-0.25, 0.3, random()), (random() - 0.5) * 0.5));
        const points: P3[] = [feed.toArray() as unknown as P3, mid.toArray() as unknown as P3, tip.toArray() as unknown as P3];
        wood.tube(points, feedRadius * 0.6, feedRadius * 0.16, vary(bark, random, 0.05), 6);
        limbsOf.push({ points, r: feedRadius * 0.4 });
        tips.push(tip);
        // Each limb forks once or twice toward the rim.
        for (const side of [-1, 1]) {
          if (random() < 0.2) continue;
          const t2 = theta + side * mix(0.3, 0.6, random());
          const rim = new THREE.Vector3(cx + Math.cos(t2) * R * mix(0.72, 0.92, random()), under + 0.05, cz + Math.sin(t2) * R * mix(0.72, 0.92, random()));
          const from = mid.clone().lerp(tip, mix(0.1, 0.5, random()));
          const bend = from.clone().lerp(rim, 0.55).add(new THREE.Vector3(0, -0.12, 0));
          wood.tube([from.toArray() as unknown as P3, bend.toArray() as unknown as P3, rim.toArray() as unknown as P3], feedRadius * 0.24, feedRadius * 0.07, vary(bark, random, 0.05), 5);
          tips.push(rim);
        }
      }
      const nearest = (p: THREE.Vector3) => tips.reduce((best, tip) => (tip.distanceToSquared(p) < best.distanceToSquared(p) ? tip : best), tips[0] ?? feed);

      const bare = a.foliage === 'bare';
      const n = Math.max(8, Math.round(R * R * (bare ? 1.5 : mix(1.4, 3.6, Math.min(1, fullness)))));
      for (let i = 0; i < n; i++) {
        const theta = i * 2.39996 + phase + (random() - 0.5) * 0.4;
        if (inWedge(theta)) continue;
        const edge = Math.sqrt((i + 0.5) / n);
        const rho = R * edge * (1 + 0.13 * Math.sin(theta * 3 + phase) + 0.07 * Math.sin(theta * 5 - phase));
        const x = cx + Math.cos(theta) * rho, z = cz + Math.sin(theta) * rho;
        const r = (R * 0.13 + 0.42) * mix(0.75, 1.25, random()) * (bare ? 0.6 : 1);
        const ry = Math.min(thick * mix(0.34, 0.5, random()) * (1 - edge * 0.35), r * 0.4);
        const base = new THREE.Vector3(x, under, z);
        const from = nearest(base);
        if (bare) {
          // A thorny fan of twigs ending on the same flat plane.
          const hub = from.clone().lerp(base, 0.75).setY(under + thick * 0.25);
          wood.rod(from.toArray() as unknown as P3, hub.toArray() as unknown as P3, 0.035, 0.022, bark, 4);
          for (let k = 0; k < 4; k++) {
            const end: P3 = [x + (random() - 0.5) * r * 2.4, top - random() * 0.18, z + (random() - 0.5) * r * 2.4];
            wood.rod(hub.toArray() as unknown as P3, end, 0.02, 0.006, bark, 3);
          }
        } else {
          wood.rod(from.toArray() as unknown as P3, [x, under + ry * 0.6, z], 0.03, 0.015, bark, 4);
          leaf.blob([r, ry, r], [x, under + ry * 0.92, z], vary(leafBase, random, 0.09), [0, random() * 3, 0]);
          // A second, smaller layer domes the middle of the table.
          if (edge < 0.7 && random() < mix(0.75, 0.4, a.browse)) leaf.blob([r * 0.7, ry * 0.7, r * 0.7], [x + (random() - 0.5) * r, under + ry * 1.75, z + (random() - 0.5) * r], vary(leafBase, random, 0.09).offsetHSL(0, 0, 0.03), [0, random() * 3, 0]);
          if (a.foliage === 'blossom')
            for (let k = 0; k < 3; k++) {
              const t = random() * 6.28, d = random() * r * 0.85;
              leaf.blob([0.11, 0.11, 0.11], [x + Math.cos(t) * d, under + ry * 1.85 + (edge < 0.62 ? ry * 0.4 : 0) + random() * 0.05, z + Math.sin(t) * d], vary(mood.cheer > 0.4 ? '#f1e39a' : '#ded8b4', random, 0.05), undefined, 0);
            }
        }
        if (edge > 0.45) hangPoints.push(new THREE.Vector3(x, under + (bare ? thick * 0.3 : ry * 0.25), z));
      }
    };

    /** A trunk from the ground to a fork, then a crown. Returns the fork. */
    const tree = (bx: number, bz: number, lean: readonly [number, number], R: number, H: number, wedge: number | null) => {
      const forkY = H * mix(0.3, 0.5, a.browse) * mix(0.92, 1.08, random());
      const fork = new THREE.Vector3(bx + lean[0] * forkY, forkY, bz + lean[1] * forkY);
      const r0 = 0.13 + 0.1 * Math.sqrt(R);
      const kink: P3 = [bx + lean[0] * forkY * 0.35 + (random() - 0.5) * 0.25, forkY * 0.5, bz + lean[1] * forkY * 0.35 + (random() - 0.5) * 0.25];
      wood.shaped([[bx, -0.15, bz], kink, fork.toArray() as unknown as P3], (t) => r0 * (1 + 0.7 * Math.max(0, 1 - t * 7) ** 2) * mix(1, 0.72, t), vary(bark, random, 0.03), 9);
      // Buttress roots.
      for (let i = 0; i < 4; i++) {
        const t = i * 1.57 + random();
        wood.rod([bx + Math.cos(t) * r0 * 0.5, 0.35, bz + Math.sin(t) * r0 * 0.5], [bx + Math.cos(t) * r0 * 2.6, -0.08, bz + Math.sin(t) * r0 * 2.6], r0 * 0.36, r0 * 0.12, bark, 5);
      }
      crown(fork.x + lean[0] * (H - forkY) * 1.15, fork.z + lean[1] * (H - forkY) * 1.15, H, R, fork, r0, wedge);
      return { fork, r0 };
    };

    let main: { fork: THREE.Vector3; r0: number };
    const wedge = a.form === 'broken' ? random() * 1.2 - 0.6 : null; // toward +x/+z so the wound faces the viewer
    if (a.form === 'twin') {
      const t = random() * 0.8 - 0.4;
      main = tree(-0.3 * Math.cos(t), -0.3 * Math.sin(t), [-0.26 * Math.cos(t), -0.26 * Math.sin(t)], R0 * 0.8, H0, null);
      tree(0.3 * Math.cos(t), 0.3 * Math.sin(t), [0.3 * Math.cos(t), 0.3 * Math.sin(t)], R0 * 0.68, H0 * 0.84, null);
    } else if (a.form === 'windswept') {
      main = tree(0, 0, [0.42, 0.08 * (random() - 0.5)], R0 * 0.92, H0 * 0.9, null);
    } else {
      main = tree(0, 0, [(random() - 0.5) * 0.12, (random() - 0.5) * 0.12], R0, H0, wedge);
    }
    if (a.form === 'tiered') {
      const side = random() < 0.5 ? -1 : 1;
      const feed = main.fork.clone().multiplyScalar(0.82);
      crown(side * R0 * 0.95, (random() - 0.5) * 1.2, H0 * 0.66, R0 * 0.5, feed, main.r0 * 0.75, null);
    }
    if (a.form === 'broken' && wedge !== null) {
      // The splintered stub and the limb on the ground.
      const out = new THREE.Vector3(Math.cos(wedge), 0, Math.sin(wedge));
      const stub = main.fork.clone().addScaledVector(out, 0.55).setY(main.fork.y + 0.45);
      wood.rod(main.fork.toArray() as unknown as P3, stub.toArray() as unknown as P3, main.r0 * 0.55, main.r0 * 0.4, bark, 6);
      wood.cone(main.r0 * 0.34, 0.5, [stub.x + out.x * 0.12, stub.y + 0.16, stub.z + out.z * 0.12], '#d9c39a', [out.z * 0.7, 0, -out.x * 0.7], 5);
      const end = out.clone().multiplyScalar(R0 * 0.85 + 1.2);
      wood.tube([[out.x * 0.9, 0.5, out.z * 0.9], [out.x * 2, 0.2, out.z * 2 + 0.3], [end.x, 0.28, end.z]], main.r0 * 0.5, main.r0 * 0.14, vary(bark, random, 0.05), 6);
      for (let i = 0; i < 9; i++) {
        const d = mix(0.45, 1, random()), s = mix(0.4, 0.8, random());
        const at: P3 = [end.x * d + (random() - 0.5) * 1.6, s * 0.35, end.z * d + (random() - 0.5) * 1.6];
        if (a.foliage === 'bare') wood.rod([end.x * d, 0.25, end.z * d], [at[0], 0.5 + random() * 0.5, at[2]], 0.03, 0.008, bark, 4);
        else leaf.blob([s, s * 0.45, s], at, vary('#8d7748', random, 0.08), [0, random() * 3, 0]);
      }
    }

    // Nests.
    const straw = new THREE.Color('#cdb46f').lerp(new THREE.Color('#9dab58'), mood.cheer * 0.35);
    if (a.nests === 'few' || a.nests === 'colony') {
      const want = a.nests === 'few' ? 2 + Math.floor(random() * 2) : 16 + Math.floor(random() * 12 + mood.density * 8);
      for (let i = 0; i < want && hangPoints.length; i++) {
        const p = hangPoints[Math.floor(random() * hangPoints.length)];
        const drop = mix(0.25, 0.75, random()), s = mix(0.13, 0.19, random());
        prop.rod([p.x, p.y, p.z], [p.x, p.y - drop, p.z], 0.012, 0.012, bark, 3);
        prop.ball([s, s * 1.15, s], [p.x, p.y - drop - s, p.z], vary(straw, random, 0.08), undefined, 8);
        prop.drum(s * 0.4, s * 0.7, [p.x, p.y - drop - s * 2.1, p.z], vary(straw, random, 0.08).offsetHSL(0, 0, -0.08), undefined, 6, s * 0.5);
      }
    } else if (a.nests === 'raptor') {
      const y = highest - 0.05, x = (random() - 0.5) * R0 * 0.5, z = (random() - 0.5) * R0 * 0.5;
      prop.blob([0.85, 0.22, 0.85], [x, y, z], '#4b3b2c', [0, random(), 0]);
      for (let i = 0; i < 14; i++) {
        const t = random() * 6.28;
        prop.rod([x - Math.cos(t) * 0.9, y + random() * 0.15, z - Math.sin(t) * 0.9], [x + Math.cos(t + 0.6) * 0.9, y + 0.1 + random() * 0.2, z + Math.sin(t + 0.6) * 0.9], 0.025, 0.015, '#5a4835', 4);
      }
      prop.ball([0.2, 0.34, 0.24], [x, y + 0.5, z], '#2c2622', [0.25, 0, 0], 10);
      prop.ball([0.1, 0.1, 0.11], [x, y + 0.86, z + 0.16], '#d8cfc0', undefined, 8);
      prop.cone(0.04, 0.16, [x, y + 0.82, z + 0.3], '#e0b23a', [2.1, 0, 0], 5);
    }

    // What is in the shade.
    const side = random() < 0.5 ? -1 : 1;
    if (a.shade === 'bones') {
      const bone = '#e6dfcd', x = side * 1.5, z = 1.1;
      prop.ball([0.16, 0.14, 0.24], [x, 0.14, z], bone, [0.2, side * 0.6, 0], 10);
      prop.box([0.13, 0.1, 0.24], [x + side * 0.12, 0.08, z + 0.2], bone, [0.15, side * 0.6, 0]);
      for (const h of [-1, 1]) prop.tube([[x + h * 0.1, 0.24, z - 0.08], [x + h * 0.32, 0.5, z - 0.2], [x + h * 0.2, 0.86, z - 0.34]], 0.04, 0.008, '#4a4038', 5);
      for (let i = 0; i < 6; i++) {
        const rx = x - side * (0.7 + i * 0.17), rz = z + 0.25 + (random() - 0.5) * 0.1;
        prop.tube([[rx, 0, rz - 0.28], [rx, 0.42 - i * 0.03, rz], [rx, 0.02, rz + 0.3]], 0.02, 0.016, bone, 4);
      }
      prop.rod([x - side * 0.55, 0.05, z + 0.25], [x - side * 1.85, 0.05, z + 0.3], 0.03, 0.03, bone, 5);
    } else if (a.shade === 'herder') {
      const x = side * 1.2, z = 1.0, timber = '#7a5636';
      prop.drum(0.2, 0.05, [x, 0.36, z], timber, undefined, 10, 0.23);
      for (let i = 0; i < 3; i++) prop.rod([x + Math.cos(i * 2.09) * 0.08, 0.34, z + Math.sin(i * 2.09) * 0.08], [x + Math.cos(i * 2.09) * 0.2, 0, z + Math.sin(i * 2.09) * 0.2], 0.022, 0.022, timber, 5);
      const red = new THREE.Color('#b8262c').lerp(new THREE.Color('#8a4a40'), mood.wear * 0.5);
      prop.box([0.5, 0.04, 0.34], [x, 0.4, z], red, [0, 0.4, 0]);
      prop.box([0.34, 0.3, 0.04], [x + 0.02, 0.26, z + 0.19], red, [0.25, 0.4, 0]);
      prop.box([0.36, 0.05, 0.045], [x + 0.02, 0.24, z + 0.2], '#27304f', [0.25, 0.4, 0]);
      prop.ball([0.14, 0.15, 0.14], [x + side * 0.42, 0.15, z + 0.25], '#b98a3e', undefined, 10);
      prop.drum(0.045, 0.14, [x + side * 0.42, 0.33, z + 0.25], '#a87a35', undefined, 8, 0.035);
      prop.rod([-side * 0.55, 0, 0.75], [-side * 0.12, 1.75, 0.22], 0.022, 0.018, '#8d6a43', 5);
      // A cold fire ring.
      for (let i = 0; i < 7; i++) prop.blob([0.09, 0.07, 0.09], [x - side * 0.9 + Math.cos(i * 0.9) * 0.28, 0.05, z + 0.55 + Math.sin(i * 0.9) * 0.28], vary('#6f675e', random, 0.08), [random(), random(), 0], 0);
      prop.drum(0.22, 0.02, [x - side * 0.9, 0.015, z + 0.55], '#2a2623', undefined, 9);
    } else if (a.shade === 'kill' || a.shade === 'hive') {
      const limb = limbsOf[Math.floor(random() * Math.max(1, Math.min(3, limbsOf.length)))];
      const curve = new THREE.CatmullRomCurve3((limb?.points ?? [[0, 2, 0], [0.5, 3, 0], [1, 4, 0]]).map((p) => new THREE.Vector3(...p)));
      if (a.shade === 'kill') {
        const p = curve.getPoint(0.22), d = curve.getTangent(0.22), yaw = Math.atan2(d.x, d.z) + 1.57, hide = '#c79a5c';
        const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + 0.22, p.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1));
        const k = new Batch();
        k.ball([0.2, 0.2, 0.5], [0, 0, 0], hide, undefined, 10).ball([0.18, 0.19, 0.2], [0, -0.05, 0.42], '#e9dcc0', undefined, 8);
        for (const z of [-0.4, -0.3, 0.35, 0.45]) k.rod([0, -0.05, z], [(z > 0 ? 0.06 : -0.06), -0.95, z * 1.25], 0.045, 0.02, hide, 5);
        k.tube([[0, 0.05, -0.45], [0, -0.1, -0.75], [0.05, -0.55, -0.85]], 0.08, 0.06, hide, 6);
        k.ball([0.07, 0.08, 0.14], [0.05, -0.68, -0.9], hide, [0.9, 0, 0], 8);
        for (const h of [-1, 1]) k.tube([[0.05 + h * 0.04, -0.6, -0.84], [0.05 + h * 0.09, -0.75, -0.62], [0.05 + h * 0.05, -0.98, -0.52]], 0.018, 0.005, '#2b2420', 4);
        k.box([0.03, 0.3, 0.5], [0, 0.03, 0.02], '#8d2f22');
        const mesh = k.mesh();
        mesh.applyMatrix4(m);
        root.add(mesh);
      } else {
        const p = curve.getPoint(0.55), d = curve.getTangent(0.55), yaw = Math.atan2(d.x, d.z);
        const drop = Math.min(1.3, p.y - 1.9), y = p.y - drop, ax: P3 = [Math.sin(yaw), 0, Math.cos(yaw)];
        prop.drum(0.24, 1.1, [p.x, y, p.z], '#6d5238', [1.5708, yaw, 0], 10);
        for (const e of [-1, 1]) {
          prop.drum(0.25, 0.03, [p.x + ax[0] * e * 0.56, y, p.z + ax[2] * e * 0.56], '#3b2d20', [1.5708, yaw, 0], 10);
          prop.drum(0.255, 0.05, [p.x + ax[0] * e * 0.32, y, p.z + ax[2] * e * 0.32], '#b89c5e', [1.5708, yaw, 0], 10);
          const q = curve.getPoint(0.55 + e * 0.07);
          prop.rod([p.x + ax[0] * e * 0.32, y + 0.24, p.z + ax[2] * e * 0.32], [q.x, q.y, q.z], 0.014, 0.014, '#b89c5e', 4);
        }
      }
    }

    // Dry grass around the foot.
    const tufts = 10 + Math.floor(random() * 8 + mood.density * 8);
    for (let i = 0; i < tufts; i++) {
      const t = random() * 6.28, d = mix(0.5, 2.3, random());
      const x = Math.cos(t) * d, z = Math.sin(t) * d, c = vary('#c9b06a', random, 0.1);
      for (let k = 0; k < 3; k++) prop.cone(0.035, mix(0.3, 0.6, random()), [x + (random() - 0.5) * 0.14, 0.18, z + (random() - 0.5) * 0.14], c, [(random() - 0.5) * 0.5, 0, (random() - 0.5) * 0.5], 4);
    }

    root.add(wood.mesh({ roughness: 0.95 }));
    let canopy: THREE.Mesh | null = null;
    if (!leaf.empty) root.add((canopy = leaf.mesh({ flatShading: true, roughness: 0.92 })));
    if (!prop.empty) root.add(prop.mesh({ roughness: 0.88 }));

    const sway = mix(0.002, 0.012, mood.energy), offset = random() * 6;
    return {
      object: root,
      footprint: 1.6,
      update: (_dt, time) => {
        root.rotation.z = Math.sin(time * 0.7 + offset) * sway;
        if (canopy) canopy.rotation.x = Math.sin(time * 1.1 + offset) * sway * 0.6;
      },
      dispose: () => {
        root.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
        root.removeFromParent();
      },
    };
  },
});
