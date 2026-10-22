import * as THREE from 'three';
import { choice, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';
import { PALETTES, STYLES, bilayer, helixCurve, instances, paint, revolvedHeads, tone } from './membrane';

const COATS: Record<keyof typeof STYLES, { leg: string; hub: string }> = {
  pastel: { leg: '#7fa3d6', hub: '#41679f' },
  micrograph: { leg: '#56575a', hub: '#323335' },
  glossy: { leg: '#2a6fd6', hub: '#ffcf2e' },
};

/** The dual of a subdivided icosahedron: a cage of twelve pentagons among hexagons, like clathrin. */
function cage(detail: number) {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const position = geometry.attributes.position;
  const key = (i: number) => `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`;
  const nodes: THREE.Vector3[] = [];
  const shared = new Map<string, number[]>();
  for (let f = 0; f < position.count / 3; f++) {
    const centre = new THREE.Vector3();
    const ids: string[] = [];
    for (let k = 0; k < 3; k++) {
      centre.add(new THREE.Vector3().fromBufferAttribute(position, f * 3 + k));
      ids.push(key(f * 3 + k));
    }
    nodes.push(centre.normalize());
    for (let k = 0; k < 3; k++) {
      const edge = [ids[k], ids[(k + 1) % 3]].sort().join('|');
      shared.set(edge, [...(shared.get(edge) ?? []), f]);
    }
  }
  geometry.dispose();
  const edges = [...shared.values()].filter((faces) => faces.length === 2) as [number, number][];
  return { nodes, edges };
}

export default defineThing({
  questions: {
    stage: choice('How far has the bud got?', {
      pit: 'Just begun: a shallow coated dome bulging from the membrane, the cage only a cap.',
      deep: 'A deep coated bud, round as a balloon, still joined by a wide neck.',
      neck: 'Almost free: the ball hangs on a thin neck squeezed by a spiral protein collar.',
      released: 'Pinched off: the coated ball floats free above a healed scar, its cage beginning to shed.',
    }),
    lattice: choice('What is the clathrin cage like?', {
      coarse: 'Coarse: big hexagons and pentagons like a football.',
      fine: 'Fine: a tight honeycomb of many small cells.',
      patchy: 'Patchy: half-assembled, with gaps where pieces have not yet joined.',
    }),
    cargo: choice('What is being swallowed?', {
      cholesterol: 'Fat yellow cholesterol particles, bound for the cell\'s kitchen.',
      iron: 'Paired rusty-red iron carrier beads.',
      virus: 'A spiky virus, smuggled in by its own invitation.',
      receptors: 'Receptors still clutching their messenger molecules.',
      nothing: 'Nothing much: the membrane is being recycled.',
    }),
    cutaway: noul('Is the bud cut open to show the cargo inside?'),
    neighbours: noul('Are other coated pits starting nearby?'),
    size: score('How big is the vesicle?', ['Small and tight', 'Usual', 'Large and swollen']),
    style: choice('How is it drawn?', STYLES),
  },

  build(a, context) {
    const { mood, random } = context;
    const palette = PALETTES[a.style];
    const root = new THREE.Group();
    const R = 0.0135, T = 0.13, ys = T - R;
    const Rv = mix(0.1, 0.15, a.size);
    const coat = COATS[a.style];
    const legMaterial = paint(coat.leg, context, a.style);
    const hubMaterial = paint(coat.hub, context, a.style);
    const Y = new THREE.Vector3(0, 1, 0);

    // The bud: a sphere tied to the plane by a neck, as a profile turned about the y axis.
    let cy: number, rn: number;
    if (a.stage === 'pit') { cy = ys - Rv * 0.12; rn = Math.sqrt(Rv * Rv - (ys + 0.012 - cy) ** 2); }
    else if (a.stage === 'deep') { rn = Rv * 0.6; cy = ys + Math.sqrt(Rv * Rv - rn * rn) + 0.022; }
    else if (a.stage === 'neck') { rn = Rv * 0.2; cy = ys + Math.sqrt(Rv * Rv - rn * rn) + 0.07; }
    else { rn = 0; cy = ys + Rv + 0.11; }
    const base = Math.max(rn, 0.03) + 0.07;
    const cut = (p: THREE.Vector3) => !(a.cutaway && p.x > -0.005 && p.z > -0.005 && p.y > ys + 0.02);

    const pits: { x: number; z: number; r: number }[] = [];
    if (a.neighbours) {
      const count = 1 + Math.round(random() + mood.density * 0.6);
      for (let i = 0; i < count; i++) {
        const angle = -2.2 + i * 1.6 + random() * 0.6;
        pits.push({ x: Math.cos(angle) * 0.22, z: Math.sin(angle) * 0.17, r: 0.045 + random() * 0.02 });
      }
    }
    const patch = bilayer(context, palette, {
      width: 0.58, depth: 0.48, head: R, thickness: T,
      hole: (x, z) => (a.stage !== 'released' && Math.hypot(x, z) < base) || pits.some((pit) => Math.hypot(x - pit.x, z - pit.z) < pit.r),
      mix: 0.3,
    });
    root.add(patch.group);

    const bud = new THREE.Group();
    root.add(bud);
    if (a.stage === 'released') {
      // The healed scar where it left: a faint ring of paler heads.
      const scar = revolvedHeads(context, palette, [[0.02, ys + 0.004], [0.05, ys + 0.008]], R * 0.9, 0.8);
      root.add(scar);
      const ball: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const t = -Math.PI / 2 + (i / 24) * Math.PI;
        ball.push([Math.max(0.0001, Math.cos(t) * Rv), cy + Math.sin(t) * Rv]);
      }
      bud.add(revolvedHeads(context, palette, ball, R, 0.3, cut));
    } else {
      // Flat ring, a fillet into the neck, the neck, then round the sphere to the top.
      const profile: [number, number][] = [[base, ys]];
      const start = a.stage === 'pit' ? new THREE.Vector2(rn, ys + 0.012) : new THREE.Vector2(rn, cy - Math.sqrt(Rv * Rv - rn * rn));
      const corner = new THREE.Vector2(rn + 0.006, ys);
      const fillet = new THREE.QuadraticBezierCurve(new THREE.Vector2(base - 0.02, ys), corner, a.stage === 'pit' ? start : new THREE.Vector2(rn, Math.min(start.y, ys + 0.03)));
      for (const p of fillet.getPoints(8)) profile.push([p.x, p.y]);
      if (a.stage !== 'pit') profile.push([start.x, start.y]);
      const neckProfile = profile.slice();
      const from = Math.atan2(start.y - cy, start.x);
      const arc: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const t = from + (i / 24) * (Math.PI / 2 - from);
        arc.push([Math.max(0.0001, Math.cos(t) * Rv), cy + Math.sin(t) * Rv]);
      }
      root.add(revolvedHeads(context, palette, neckProfile, R, 0.3, cut));
      bud.add(revolvedHeads(context, palette, arc, R, 0.3, cut));
    }

    // The clathrin cage: legs between hubs over a sphere just outside the membrane.
    const { nodes, edges } = cage(a.lattice === 'fine' ? 2 : 1);
    const Rc = Rv + R + (a.lattice === 'fine' ? 0.014 : 0.02);
    const centre = new THREE.Vector3(0, cy, 0);
    const lowest = a.stage === 'pit' ? ys + 0.02 : a.stage === 'deep' ? cy - Math.sqrt(Rv * Rv - rn * rn) + 0.03 : a.stage === 'neck' ? cy - Rv * 0.82 : -Infinity;
    const shed = a.stage === 'released' ? 0.3 : a.lattice === 'patchy' ? 0.28 : 0;
    // A random spin so the pentagons do not always sit at the poles.
    const spin = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * 6, random() * 6, random() * 6));
    const at = nodes.map((node) => node.clone().applyQuaternion(spin).multiplyScalar(Rc).add(centre));
    const legs: { matrix: THREE.Matrix4 }[] = [];
    const used = new Set<number>();
    const legRadius = a.lattice === 'fine' ? 0.0048 : 0.0066;
    for (const [i, j] of edges) {
      const p = at[i], q = at[j];
      if (Math.min(p.y, q.y) < lowest) continue;
      const mid = p.clone().add(q).multiplyScalar(0.5);
      if (!cut(mid) || !cut(p) || !cut(q)) continue;
      if (shed && random() < shed && (a.stage !== 'released' || mid.y > cy - Rv * 0.2)) continue;
      // Each leg bows outward a little, like the bent arm of a triskelion.
      const direction = q.clone().sub(p);
      legs.push({ matrix: new THREE.Matrix4().compose(mid.clone().sub(centre).multiplyScalar(1.015).add(centre), new THREE.Quaternion().setFromUnitVectors(Y, direction.clone().normalize()), new THREE.Vector3(legRadius, direction.length() * 1.04, legRadius)) });
      used.add(i); used.add(j);
    }
    const cageGroup = new THREE.Group();
    cageGroup.add(instances(new THREE.CylinderGeometry(1, 1, 1, 6), legMaterial, legs));
    const hubs = [...used].map((i) => ({ matrix: new THREE.Matrix4().compose(at[i], new THREE.Quaternion(), new THREE.Vector3().setScalar(legRadius * 1.9)) }));
    cageGroup.add(instances(new THREE.SphereGeometry(1, 10, 8), hubMaterial, hubs));
    bud.add(cageGroup);

    // Loose triskelia: three-legged pieces lying on the membrane, waiting to join or just shed.
    const triskelion = (x: number, z: number, lift: number) => {
      const group = new THREE.Group();
      const hub = new THREE.Mesh(new THREE.SphereGeometry(legRadius * 2, 10, 8), hubMaterial);
      group.add(hub);
      for (let k = 0; k < 3; k++) {
        const angle = (k / 3) * Math.PI * 2;
        const leg = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(Math.cos(angle) * 0.03, 0, Math.sin(angle) * 0.03), new THREE.Vector3(Math.cos(angle + 0.6) * 0.05, 0, Math.sin(angle + 0.6) * 0.05)), 8, legRadius, 5), legMaterial);
        leg.castShadow = true;
        group.add(leg);
      }
      group.position.set(x, lift, z);
      group.rotation.y = random() * 6;
      root.add(group);
    };
    const loose = a.stage === 'released' ? 3 + Math.round(mood.density * 3) : a.lattice === 'patchy' ? 2 : 0;
    for (let i = 0; i < loose; i++) {
      const angle = random() * Math.PI * 2, r = base + 0.04 + random() * 0.1;
      triskelion(Math.cos(angle) * r, Math.sin(angle) * r * 0.75, T + 0.005);
    }

    // Neighbouring pits: small coated caps.
    for (const pit of pits) {
      const rr = pit.r;
      const cap: [number, number][] = [[rr, ys]];
      const capCentre = ys - rr * 0.55;
      const capR = Math.hypot(rr * 0.92, ys + 0.004 - capCentre);
      for (let i = 0; i <= 10; i++) {
        const from = Math.atan2(ys + 0.004 - capCentre, rr * 0.92);
        const t = from + (i / 10) * (Math.PI / 2 - from);
        cap.push([Math.max(0.0001, Math.cos(t) * capR), capCentre + Math.sin(t) * capR]);
      }
      const mesh = revolvedHeads(context, palette, cap, R, 0.3);
      mesh.position.set(pit.x, 0, pit.z);
      root.add(mesh);
      const { nodes: small, edges: links } = cage(0);
      const ring = small.map((node) => node.clone().multiplyScalar(capR + R + 0.012).add(new THREE.Vector3(pit.x, capCentre, pit.z)));
      const bits: { matrix: THREE.Matrix4 }[] = [];
      for (const [i, j] of links) {
        if (Math.min(ring[i].y, ring[j].y) < ys + 0.01) continue;
        const d = ring[j].clone().sub(ring[i]);
        bits.push({ matrix: new THREE.Matrix4().compose(ring[i].clone().add(ring[j]).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(Y, d.clone().normalize()), new THREE.Vector3(legRadius * 0.9, d.length(), legRadius * 0.9)) });
      }
      root.add(instances(new THREE.CylinderGeometry(1, 1, 1, 6), legMaterial, bits));
    }

    // The dynamin collar squeezing the neck.
    let collar: THREE.Mesh | null = null;
    if (a.stage === 'neck' || a.stage === 'deep') {
      const turns = a.stage === 'neck' ? 3.2 : 1.1;
      const bottom = a.stage === 'neck' ? ys + 0.018 : cy - Math.sqrt(Rv * Rv - rn * rn) - 0.012;
      const height = a.stage === 'neck' ? cy - Math.sqrt(Rv * Rv - rn * rn) - bottom + 0.005 : 0.024;
      collar = new THREE.Mesh(new THREE.TubeGeometry(helixCurve(rn + R + 0.012, height, turns), Math.round(turns * 24), 0.0085, 8), paint(palette.protein[3], context, a.style));
      collar.position.y = bottom;
      collar.castShadow = true;
      root.add(collar);
    }

    // The cargo.
    const cargoColour = { cholesterol: '#f2c84b', iron: '#a8402e', virus: '#d0533f', receptors: palette.protein[1], nothing: '#ffffff' }[a.cargo];
    const cargoMaterial = paint(cargoColour, context, a.style);
    const band = paint(new THREE.Color(cargoColour).multiplyScalar(0.65), context, a.style);
    const piece = (group: THREE.Object3D, p: THREE.Vector3, scale: number) => {
      const item = new THREE.Group();
      if (a.cargo === 'cholesterol') {
        item.add(new THREE.Mesh(new THREE.SphereGeometry(0.022 * scale, 16, 12), cargoMaterial));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022 * scale, 0.004 * scale, 6, 20), band);
        ring.rotation.x = random() * 3;
        item.add(ring);
      } else if (a.cargo === 'iron') {
        for (const side of [-1, 1]) {
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.013 * scale, 12, 10), cargoMaterial);
          bead.position.x = side * 0.011 * scale;
          item.add(bead);
        }
      } else if (a.cargo === 'virus') {
        item.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.03 * scale, 1), cargoMaterial));
        for (let k = 0; k < 12; k++) {
          const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.006 * scale, 0.02 * scale, 5), band);
          spike.position.copy(dir).multiplyScalar(0.033 * scale);
          spike.quaternion.setFromUnitVectors(Y, dir);
          item.add(spike);
        }
      } else if (a.cargo === 'receptors') {
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * scale, 0.005 * scale, 0.03 * scale, 6), cargoMaterial);
        stalk.position.y = 0.015 * scale;
        item.add(stalk);
        for (const side of [-1, 1]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0035 * scale, 0.0035 * scale, 0.02 * scale, 6), cargoMaterial);
          arm.position.set(side * 0.006 * scale, 0.036 * scale, 0);
          arm.rotation.z = -side * 0.6;
          item.add(arm);
        }
        const signal = new THREE.Mesh(new THREE.SphereGeometry(0.008 * scale, 10, 8), paint(palette.protein[3], context, a.style));
        signal.position.y = 0.046 * scale;
        item.add(signal);
      }
      item.traverse((node) => { node.castShadow = true; });
      item.position.copy(p);
      item.rotation.y = random() * 6;
      group.add(item);
      return item;
    };
    if (a.cargo !== 'nothing') {
      // Inside the bud, seen through the cut, and a few more drifting in toward the neck.
      if (a.cutaway || a.stage === 'released') {
        const inside = a.cargo === 'virus' ? 1 : 3 + Math.round(mood.density * 3);
        for (let i = 0; i < inside; i++) {
          const p = a.cargo === 'virus' ? new THREE.Vector3(0, cy, 0) : new THREE.Vector3((random() - 0.5) * Rv, cy + (random() - 0.6) * Rv * 0.9, (random() - 0.2) * Rv);
          if (p.distanceTo(centre) > Rv * 0.7) p.sub(centre).setLength(Rv * 0.6).add(centre);
          piece(bud, p, a.cargo === 'virus' ? Rv / 0.07 * 0.9 : 1.2);
        }
      }
      const outside = 2 + Math.round(mood.density * 2);
      for (let i = 0; i < outside; i++) {
        const angle = random() * Math.PI * 2, r = base + 0.03 + random() * 0.08;
        const lift = a.cargo === 'cholesterol' ? 0.022 * 1.1 : a.cargo === 'iron' ? 0.014 : a.cargo === 'virus' ? 0.05 : 0;
        piece(root, new THREE.Vector3(Math.cos(angle) * r, T + lift, Math.sin(angle) * r * 0.8), 1.1);
      }
    }

    const speed = mix(0.2, 2.2, mood.energy);
    const phase = random() * 6;
    const update = (_dt: number, time: number) => {
      const t = time * speed + phase;
      if (a.stage === 'released') {
        bud.position.y = Math.sin(t * 0.7) * 0.01;
        bud.rotation.y = t * 0.05;
      } else if (a.stage === 'neck') {
        bud.position.y = Math.sin(t) * 0.004;
      } else {
        cageGroup.scale.setScalar(1 + Math.sin(t) * 0.008);
      }
      if (collar) {
        const squeeze = 1 - (0.5 + 0.5 * Math.sin(t * 1.3)) * 0.12;
        collar.scale.set(squeeze, 1, squeeze);
      }
    };
    return { object: root, update, dispose: () => disposeTree(root) };
  },
});
