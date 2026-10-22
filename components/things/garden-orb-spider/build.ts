import * as THREE from 'three';
import { choice, defineThing, mix, noul, score } from '@conjure/kit';
import { Bag, type Tone, V, aim, arc, dewMaterial, finish, matte, tube, xf } from './bits';

interface Hole { j0: number; jn: number; k0: number; kn: number }

/** An orb web in the xy plane: radials out to a frame polygon and a sagging capture spiral. */
function spinWeb(silk: Bag, centre: THREE.Vector3, poly: THREE.Vector3[], count: number, turns: number, random: () => number, holes: Hole[], thick: number, tone: Tone) {
  const dirs: THREE.Vector3[] = [], reach: number[] = [];
  for (let j = 0; j < count; j++) {
    const angle = ((j + (random() - 0.5) * 0.5) / count) * Math.PI * 2;
    const d = V(Math.cos(angle), Math.sin(angle), 0);
    let best = Infinity;
    for (let e = 0; e < poly.length; e++) {
      const a = poly[e], b = poly[(e + 1) % poly.length];
      const ex = b.x - a.x, ey = b.y - a.y, det = ex * d.y - ey * d.x;
      if (Math.abs(det) < 1e-9) continue;
      const wx = a.x - centre.x, wy = a.y - centre.y;
      const s = (ex * wy - ey * wx) / det, q = (d.x * wy - d.y * wx) / det;
      if (s > 0 && q >= 0 && q <= 1) best = Math.min(best, s);
    }
    dirs.push(d);
    reach.push(best === Infinity ? 0.05 : best);
  }
  const outer = mix(Math.min(...reach), Math.max(...reach), 0.5) * 0.95, hub = outer * 0.07, inner = outer * 0.22;
  const at = (j: number, r: number) => centre.clone().addScaledVector(dirs[j], r);
  for (let j = 0; j < count; j++) silk.add(tube([at(j, hub), at(j, reach[j])], thick, { sides: 4 }), tone);
  for (let e = 0; e < poly.length; e++) silk.add(tube([poly[e], poly[(e + 1) % poly.length]], thick * 1.3, { sides: 4 }), tone);
  // The hub: a tight little mesh of a few turns.
  const hubRun: THREE.Vector3[] = [];
  for (let i = 0; i <= count * 3; i++) hubRun.push(at(i % count, mix(hub, inner * 0.62, i / (count * 3))));
  silk.add(tube(hubRun, thick * 0.6, { sides: 4 }), tone);
  const inHole = (j: number, k: number) => holes.some((h) => (j - h.j0 + count) % count < h.jn && k >= h.k0 && k < h.k0 + h.kn);
  const nodes: THREE.Vector3[] = [];
  let run: THREE.Vector3[] = [];
  const close = () => {
    if (run.length > 1) silk.add(tube(run, thick * 0.7, { sides: 4 }), tone);
    run = [];
  };
  for (let k = 0; k < turns; k++)
    for (let j = 0; j < count; j++) {
      const r = inner + ((outer - inner) * (k * count + j)) / (turns * count);
      if (r > reach[j] * 0.95 || inHole(j, k)) { close(); continue; }
      const p = at(j, r);
      if (run.length) {
        const last = run[run.length - 1];
        // Each chord sags a little toward the hub.
        run.push(last.clone().lerp(p, 0.5).lerp(centre, 0.035));
      }
      run.push(p);
      nodes.push(p);
    }
  close();
  return { nodes, dirs, reach, outer };
}

const PALETTE = {
  classic: { abdomen: '#b9783a', head: '#8a5731', pale: '#e0c193', dark: '#57371f' },
  pumpkin: { abdomen: '#e58a22', head: '#b0652a', pale: '#f0cf9a', dark: '#6b3a1c' },
  chocolate: { abdomen: '#55392a', head: '#3d2a1f', pale: '#b89878', dark: '#2a1c15' },
  straw: { abdomen: '#d9c48c', head: '#b89c66', pale: '#efe2bd', dark: '#7d6742' },
  ash: { abdomen: '#8e877b', head: '#6d665c', pale: '#cfc8ba', dark: '#3f3a34' },
} as const;

export default defineThing({
  questions: {
    pose: choice('What is the spider doing?', {
      hub: 'Sitting head down at the hub of her web, legs spread along the radials, waiting.',
      mending: 'Out on the spiral beside a torn hole, drawing fresh silk from her spinnerets with a hind leg.',
      retreat: 'Tucked away under a curled leaf at the top of a stem, legs bunched, one front leg resting on a signal line.',
      dropping: 'Hanging in front of the web on a single dragline, legs gathered in, alarmed or abseiling.',
    }),
    colouring: choice('What colour is she?', {
      classic: 'Warm orange-brown, the ordinary garden spider.',
      pumpkin: 'Bright pumpkin orange, showy and autumnal.',
      chocolate: 'Dark chocolate brown, heavy and menacing.',
      straw: 'Pale straw and cream, almost the colour of dry grass.',
      ash: 'Ashen grey-brown, bark coloured, old and tired.',
    }),
    marking: choice('What marks her abdomen?', {
      cross: 'A white cross of dashes and dots, the classic diadem.',
      folium: 'A dark wavy leaf-shaped outline running down the back.',
      spots: 'Two rows of pale round spots.',
      plain: 'No clear marking, only mottling.',
    }),
    fed: score('How fat is her abdomen?', ['Shrunken and lean after laying her eggs', 'Ordinary', 'Swollen tight, about to lay']),
    size: score('How big is she against her web?', ['A small juvenile on a big web', 'A grown female', 'A huge late-autumn matriarch']),
    banded: noul('Are her legs boldly banded dark and pale?'),
    lostLeg: noul('Has she lost a leg somewhere along the way?'),
    catch: choice('What else is in the web?', {
      empty: 'Nothing: the web is empty and she is still waiting.',
      bundle: 'One white silk-wrapped bundle, stored for later.',
      midges: 'A scatter of tiny dark midges stuck in the spiral.',
      dew: 'Heavy dew: the whole spiral is strung with water beads.',
      leaf: 'A scrap of dead leaf that blew in and stuck.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const tone = (c: Tone, lift = 0) => new THREE.Color(c).offsetHSL((mood.warmth - 0.5) * 0.03, (mood.cheer - 0.5) * 0.25, lift);
    const pal = PALETTE[a.colouring];
    const plant = new Bag(), silk = new Bag(), dew = new Bag();

    // Two grass stems carry the web. Autumn wear turns them from green to straw.
    const green = new THREE.Color('#6f9a45').lerp(new THREE.Color('#c2a865'), mood.wear * 0.8 + (1 - mood.cheer) * 0.15);
    const leanL = (random() - 0.5) * 0.04, leanR = (random() - 0.5) * 0.04;
    const L = (t: number) => V(-0.16 + leanL * t * t + 0.02 * t, 0.4 * t, 0);
    const R = (t: number) => V(0.16 + leanR * t * t - 0.015 * t, 0.43 * t, 0);
    for (const stem of [L, R]) {
      const points = Array.from({ length: 10 }, (_unused, i) => stem(i / 9));
      plant.add(tube(points, (t) => mix(0.007, 0.0035, t), { sides: 6 }), green);
      for (let i = 0; i < 4; i++) {
        const base = stem(0).add(V((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.03));
        const tip = base.clone().add(V((random() - 0.5) * 0.12, 0.06 + random() * 0.1, (random() - 0.5) * 0.1));
        plant.add(tube(arc(base, tip, V(0, 0.02, 0), 6), (t) => mix(0.008, 0.001, t), { sides: 5, flat: 0.2, up: V(0, 0, 1) }), green.clone().offsetHSL(0, 0, (random() - 0.5) * 0.1));
      }
    }
    // A blade peeling off the left stem and a seed head on top of it.
    plant.add(tube(arc(L(0.45), L(0.45).add(V(-0.12, 0.1, 0.03)), V(0, 0.03, 0), 8), (t) => mix(0.009, 0.001, t), { sides: 5, flat: 0.18 }), green);
    const ear = tone('#b9a36a');
    for (let i = 0; i < 9; i++) {
      const p = L(1).add(V(0, 0.012 * i, 0)), side = i % 2 ? 1 : -1;
      plant.add(new THREE.SphereGeometry(1, 8, 6), ear, aim(p, p.clone().add(V(side * 0.6, 1, (random() - 0.5) * 0.6)), V(0.006, 0.014, 0.006)));
    }
    plant.add(tube([L(1), L(1).add(V(0, 0.11, 0))], 0.002, { sides: 5 }), green);

    // The web.
    const centre = V(0, 0.225, 0);
    const poly = [L(0.93), R(0.9), R(0.2), L(0.18)];
    const count = 18 + Math.floor(random() * 5), turns = Math.round(mix(8, 14, mood.density));
    const holes: Hole[] = [];
    const tears = Math.round(mood.wear * 4 + random() * 0.8);
    for (let i = 0; i < tears; i++) holes.push({ j0: Math.floor(random() * count), jn: 2 + Math.floor(random() * 3), k0: Math.floor(random() * turns), kn: 2 + Math.floor(random() * 4) });
    // The mender works at the edge of a tear in the lower right.
    const workJ = Math.round(count * 0.9), workK = Math.round(turns * 0.55);
    if (a.pose === 'mending') holes.push({ j0: workJ + 1, jn: 3, k0: workK - 2, kn: 5 });
    const silkTone = new THREE.Color('#8d9aa5');
    const thread = 0.0013;
    const net = spinWeb(silk, centre, poly, count, turns, random, holes, thread, silkTone);

    // The spider, in her own units: 1 is the length of the head. Forward is +y, her back is +z.
    const u = mix(0.027, 0.04, a.size);
    const spider = new THREE.Group();
    const body = new Bag(), shine = new Bag();
    const fat = mix(0.72, 1.2, a.fed);
    const bunched = a.pose === 'retreat' || a.pose === 'dropping';
    const headTone = tone(pal.head), abdomenTone = tone(pal.abdomen), paleTone = tone(pal.pale), darkTone = tone(pal.dark);
    body.add(new THREE.SphereGeometry(1, 18, 12), headTone, xf(V(0, 0, 0), V(0.42, 0.52, 0.3)));
    body.add(new THREE.SphereGeometry(1, 12, 8), headTone.clone().offsetHSL(0, 0, -0.05), xf(V(0, 0.38, 0.02), V(0.26, 0.22, 0.22)));
    for (const side of [-1, 1]) {
      body.add(tube([V(side * 0.12, 0.5, -0.05), V(side * 0.16, 0.78, -0.12), V(side * 0.1, 0.92, -0.2)], 0.07, { sides: 5 }), paleTone);
      for (const [x, y, z, r] of [[0.07, 0.56, 0.14, 0.035], [0.17, 0.5, 0.13, 0.03], [0.24, 0.42, 0.1, 0.028]] as const)
        shine.add(new THREE.SphereGeometry(1, 6, 5), '#0c0a08', xf(V(side * x, y, z), r));
    }
    // Abdomen: broad shoulders in front, tapering to the spinnerets, mottled.
    const ar = V(0.8 * fat, 1.0 * fat, 0.68 * fat), ac = V(0, -(0.42 + ar.y * 0.9), 0.16);
    const abdomen = new THREE.SphereGeometry(1, 30, 22);
    {
      const p = abdomen.getAttribute('position'), colours = new Float32Array(p.count * 3), c = new THREE.Color();
      const foliumTone = darkTone.clone().lerp(abdomenTone, 0.35);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        const wide = 1 + 0.2 * Math.max(0, y) - 0.3 * Math.max(0, -y) ** 2;
        p.setXYZ(i, x * wide, y, z * (1 - 0.12 * Math.max(0, -y)));
        const mottle = Math.sin(x * 23 + y * 7) * Math.sin(y * 19 + z * 11) * 0.5;
        c.copy(abdomenTone).offsetHSL(0, 0, mottle * 0.07 - (z < -0.2 ? 0.08 : 0));
        if (a.marking === 'folium' && z > 0) {
          const edge = 0.52 * (1 - Math.max(0, 0.2 - y) / 1.3) + 0.07 * Math.sin(y * 13);
          const off = Math.abs(Math.abs(x) - edge);
          c.lerp(foliumTone, Math.max(0, 1 - off / 0.13) * 0.9);
          if (Math.abs(x) < edge - 0.1) c.offsetHSL(0, 0, 0.06);
        }
        colours.set([c.r, c.g, c.b], i * 3);
      }
      abdomen.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      abdomen.computeVertexNormals();
    }
    body.add(abdomen, null, xf(ac, ar));
    body.add(new THREE.ConeGeometry(0.14, 0.3, 8), darkTone, aim(ac.clone().add(V(0, -ar.y * 0.93, -0.12 * fat)), ac.clone().add(V(0, -ar.y * 1.4, -0.3 * fat))));
    const spinneret = ac.clone().add(V(0, -ar.y * 1.12, -0.2 * fat));
    // Markings sit on the back as thin raised spots.
    const spot = (x: number, y: number, sx: number, sy: number, c: Tone) => {
      const wide = 1 + 0.2 * Math.max(0, y) - 0.3 * Math.max(0, -y) ** 2;
      const z = Math.sqrt(Math.max(0.02, 1 - x * x - y * y));
      const normal = V((x / ar.x) * 1, y / ar.y, z / ar.z).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), normal);
      body.add(new THREE.SphereGeometry(1, 10, 6), c, xf(ac.clone().add(V(x * wide * ar.x, y * ar.y, z * ar.z)), V(sx * ar.x, sy * ar.y, 0.03), q));
    };
    const cream = tone('#f6efd9');
    if (a.marking === 'cross') {
      for (const [y, sx, sy] of [[0.66, 0.07, 0.1], [0.42, 0.085, 0.13], [0.14, 0.1, 0.13], [-0.12, 0.07, 0.1], [-0.34, 0.05, 0.07], [-0.52, 0.04, 0.05]] as const) spot(0, y, sx, sy, cream);
      for (const side of [-1, 1]) { spot(side * 0.22, 0.34, 0.12, 0.07, cream); spot(side * 0.43, 0.36, 0.08, 0.055, cream); spot(side * 0.58, 0.4, 0.045, 0.04, cream); }
    } else if (a.marking === 'spots') {
      for (let i = 0; i < 4; i++) for (const side of [-1, 1]) spot(side * (0.3 - i * 0.04), 0.5 - i * 0.32, 0.1 - i * 0.012, 0.1 - i * 0.012, cream);
    } else if (a.marking === 'folium') {
      for (let i = 0; i < 4; i++) spot(0, 0.55 - i * 0.3, 0.045, 0.07, cream);
    }

    // Eight legs: two forward, one short and sideways, one back.
    const lengths = [3.5, 3.1, 1.9, 3.0], angles = [26, 60, 106, 152];
    const gone = a.lostLeg ? Math.floor(random() * 8) : -1;
    const signalFoot = V();
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        if (gone === i * 2 + (side > 0 ? 1 : 0)) {
          body.add(new THREE.SphereGeometry(1, 6, 5), darkTone, xf(V(side * 0.4, 0.3 - i * 0.2, 0), 0.1));
          continue;
        }
        const signal = a.pose === 'retreat' && side === -1 && i === 0;
        const spinning = a.pose === 'mending' && side === 1 && i === 3;
        const spread = signal ? 1.05 : bunched ? 0.4 + random() * 0.08 : 0.92 + random() * 0.12;
        const lift = bunched && !signal ? 1.7 : 1;
        const angle = THREE.MathUtils.degToRad((signal ? 8 : angles[i]) + (random() - 0.5) * 10);
        const root0 = V(side * 0.36, 0.3 - i * 0.2, -0.05);
        const out = V(side * Math.sin(angle), Math.cos(angle), 0);
        let foot = root0.clone().addScaledVector(out, lengths[i] * spread).setZ(-0.38);
        if (spinning) foot = spinneret.clone().add(V(0.12, -0.1, 0));
        if (signal) signalFoot.copy(foot);
        const knee = root0.clone().lerp(foot, 0.3).setZ(0.72 * lift), shin = root0.clone().lerp(foot, 0.7).setZ(0.4 * lift);
        const joints = [root0, knee, shin, foot], path: THREE.Vector3[] = [];
        for (let s = 0; s < 3; s++) for (let n = 0; n < 5; n++) path.push(joints[s].clone().lerp(joints[s + 1], n / 5));
        path.push(foot);
        body.add(tube(path, (t) => mix(0.135, 0.05, t) * (1 + 0.25 * Math.max(0, 1 - Math.abs(t - 0.33) * 14) + 0.2 * Math.max(0, 1 - Math.abs(t - 0.66) * 14)), {
          sides: 6,
          colour: (t) => (a.banded ? (Math.floor(t * 7.99) % 2 ? paleTone : darkTone) : paleTone.clone().lerp(darkTone, 0.25 + 0.4 * t)),
        }), null);
      }
    body.into(spider, matte({ roughness: 0.62 }));
    shine.into(spider, matte({ roughness: 0.15 }));
    spider.scale.setScalar(u);
    root.add(spider);

    // Where she is and which way she faces.
    const stand = 0.4 * u + thread;
    const leafGreen = green.clone().offsetHSL(0, -0.05, -0.04);
    if (a.pose === 'hub') {
      spider.position.copy(centre).setZ(stand);
      spider.rotation.z = Math.PI + (random() - 0.5) * 0.3;
    } else if (a.pose === 'mending') {
      const p = centre.clone().addScaledVector(net.dirs[workJ % count], Math.min(net.outer * 0.62, net.reach[workJ % count] * 0.8));
      spider.position.copy(p).setZ(stand);
      spider.rotation.z = Math.atan2(net.dirs[workJ % count].y, net.dirs[workJ % count].x) + Math.PI + 0.3;
      spider.updateMatrixWorld(true);
      const from = spinneret.clone().applyMatrix4(spider.matrixWorld);
      const to = centre.clone().addScaledVector(net.dirs[(workJ + 3) % count], net.outer * 0.6);
      silk.add(tube([from, from.clone().lerp(to, 0.5).add(V(0, -0.006, 0.004)), to], thread * 1.2, { sides: 4, smooth: 8 }), '#c9d3da');
    } else if (a.pose === 'retreat') {
      const top = R(1);
      const leaf = arc(top, top.clone().add(V(-7.5 * u, -0.3 * u, 2 * u)), V(0, 3 * u, 0.5 * u), 10);
      plant.add(tube(leaf, (t) => 0.004 + 2.3 * u * Math.sin(Math.min(1, t * 1.15) * Math.PI) ** 0.7, { sides: 8, flat: 0.12, up: V(0, 1, 0) }), leafGreen);
      const den = top.clone().add(V(-3.6 * u, 0.6 * u, 1.2 * u));
      spider.position.copy(den);
      const toHub = centre.clone().sub(den);
      spider.rotation.z = Math.atan2(toHub.y, toHub.x) - Math.PI / 2 + 0.14;
      spider.updateMatrixWorld(true);
      const foot = signalFoot.clone().applyMatrix4(spider.matrixWorld);
      silk.add(tube([foot, centre.clone().setZ(0.002)], thread * 1.3, { sides: 4 }), '#b9c4cc');
    } else {
      const hang = V(0.02 + (random() - 0.5) * 0.08, mix(0.13, 0.2, random()), 2.5 * u);
      spider.position.copy(hang);
      spider.rotation.set(-0.5, 0, Math.PI + (random() - 0.5) * 0.5);
      spider.updateMatrixWorld(true);
      const from = spinneret.clone().applyMatrix4(spider.matrixWorld);
      const anchor = L(0.93).lerp(R(0.9), 0.5 + hang.x * 2);
      silk.add(tube([from, anchor], thread * 1.3, { sides: 4 }), '#b9c4cc');
    }

    // What else the web has caught.
    const pick = () => net.nodes[Math.floor(random() * net.nodes.length)] ?? centre;
    const far = () => { for (let i = 0; i < 12; i++) { const p = pick(); if (p.distanceTo(spider.position) > 5 * u) return p; } return pick(); };
    const beads = Math.round(net.nodes.length * (a.catch === 'dew' ? 0.55 : 0.07 * (1 - mood.daylight) + 0.02));
    for (let i = 0; i < beads; i++) {
      const p = pick(), r = mix(0.003, a.catch === 'dew' ? 0.008 : 0.005, random() ** 2);
      dew.add(new THREE.SphereGeometry(1, 8, 6), null, xf(p.clone().add(V(0, -r * 0.6, 0)), V(r, r * 1.12, r)));
    }
    if (a.catch === 'bundle') {
      const p = far(), tilt = random() * 3;
      const wrap = tone('#e9e6da');
      silk.add(new THREE.SphereGeometry(1, 12, 8), wrap, xf(p.clone().setZ(0.008), V(0.011, 0.02, 0.01), new THREE.Euler(0, 0, tilt)));
      for (let i = 0; i < 5; i++) silk.add(new THREE.TorusGeometry(0.0105 * Math.sin(((i + 1) / 6) * Math.PI) + 0.002, 0.0009, 4, 12), '#b7c0c6', xf(p.clone().setZ(0.008), 1, new THREE.Euler(Math.PI / 2 + (random() - 0.5) * 0.5, 0, tilt)).multiply(new THREE.Matrix4().makeTranslation(0, 0, (i - 2) * 0.006)));
    } else if (a.catch === 'midges') {
      const n = 4 + Math.floor(random() * 5 + mood.density * 4);
      for (let i = 0; i < n; i++) {
        const p = far().clone().setZ(0.003), turn = new THREE.Euler(0, 0, random() * 6);
        plant.add(new THREE.SphereGeometry(1, 6, 5), '#26221f', xf(p, V(0.002, 0.005, 0.002), turn));
        for (const side of [-1, 1]) plant.add(new THREE.SphereGeometry(1, 6, 4), '#9aa3a8', xf(p.clone().add(V(side * 0.004, 0.001, 0.001)), V(0.004, 0.0018, 0.0005), new THREE.Euler(0, 0, side * 0.5 + random())));
      }
    } else if (a.catch === 'leaf') {
      const p = far().clone().setZ(0.004), size = 0.03 + random() * 0.015;
      const points = arc(p.clone().add(V(-size, -size * 0.4, 0)), p.clone().add(V(size, size * 0.5, 0.006)), V(0, 0, 0.006), 8);
      plant.add(tube(points, (t) => 0.002 + size * 0.42 * Math.sin(t * Math.PI) ** 0.8, { sides: 8, flat: 0.08, up: V(0, 0, 1) }), tone('#8a5a2b'));
      plant.add(tube(points, 0.0012, { sides: 4 }), tone('#5b3a1d'));
    }

    plant.into(root, matte({ roughness: 0.85 }));
    silk.into(root, matte({ roughness: 0.5, emissive: '#56626c', emissiveIntensity: 0.25 }));
    dew.into(root, dewMaterial('#cfe6f5', '#7d9c8c'));

    // She breathes and shifts; a restless mood makes her pluck at the web.
    const home = spider.rotation.z, pace = mix(0.3, 3.2, mood.energy), reachOut = mix(0.01, 0.06, mood.energy);
    return finish(root, (_dt, time) => {
      spider.rotation.z = home + Math.sin(time * pace) * reachOut;
      if (a.pose === 'dropping') spider.rotation.y = Math.sin(time * pace * 0.4) * 0.5;
    }, 0.2);
  },
});
