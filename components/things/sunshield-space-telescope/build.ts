import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const OUTLINE: readonly (readonly [number, number])[] = [[0, 10.6], [7.1, 1.6], [4.4, -7.4], [0, -10.6], [-4.4, -7.4], [-7.1, 1.6]];

/** One faceted membrane: a centre, a half-way ring and the rim, so each layer catches light in panels. */
function membrane(scale: number, squeeze: number, centreY: number, rimY: number, skip: ReadonlySet<number>, crinkle: () => number) {
  const rim = OUTLINE.map(([x, z]) => new THREE.Vector3(x * scale * squeeze, rimY + crinkle(), z * scale));
  const mid = rim.map((p) => new THREE.Vector3(p.x * 0.5, mix(centreY, rimY, 0.42) + crinkle() * 0.6, p.z * 0.5));
  const centre = new THREE.Vector3(0, centreY, 0);
  const positions: number[] = [];
  const push = (...points: THREE.Vector3[]) => { for (const p of points) positions.push(p.x, p.y, p.z); };
  rim.forEach((_point, k) => {
    const n = (k + 1) % rim.length;
    push(centre, mid[k], mid[n]);
    if (skip.has(k)) return;
    push(mid[k], rim[k], rim[n]);
    push(mid[k], rim[n], mid[n]);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    mirror: choice('What state is the main mirror in?', {
      deployed: 'Fully unfolded and whole: a clean gold honeycomb with the secondary mirror out on its tripod.',
      folded: 'Still folded for launch: the side wings swung back behind the centre and the tripod stowed flat.',
      pitted: 'Deployed but old: dark micrometeorite pits across the gold and one segment knocked dull and crooked.',
      gapped: 'Unfinished or stripped: several segments missing, dark empty sockets showing in the honeycomb.',
    }),
    size: choice('How large is the mirror?', {
      six: 'A small ring of six segments, a modest survey instrument.',
      eighteen: 'Eighteen segments in two rings, the famous flagship proportions.',
      thirtysix: 'Thirty-six segments in three rings, an enormous successor that dwarfs its own bus.',
    }),
    pointing: choice('Where is it pointing?', {
      horizon: 'Level along its shield, staring straight out at one patch of deep sky.',
      zenith: 'Tipped far back, looking almost straight up away from the Sun.',
      sidelong: 'Slewed round to one side, mid-turn toward a new target.',
      bowed: 'Nodding forward and down toward its own shield, parked, sleeping or lost.',
    }),
    shield: choice('What state is the sunshield in?', {
      taut: 'All five layers stretched tight and fanned apart, a perfect kite.',
      stowed: 'Still bundled narrow along its pallets, the booms not yet pushed out.',
      torn: 'Ripped: panels missing from the upper layers so the ones beneath show through, a strip hanging loose.',
      slack: 'Deployed but slack and crinkled, the layers sagging unevenly.',
    }),
    foil: choice('What do the shield membranes look like?', {
      silver: 'Bright aluminised silver.',
      violet: 'Silver with a pink-violet sheen on the sunward layers.',
      gold: 'Amber-gold foil, like a thermal blanket.',
      white: 'Matte chalk white, a simpler cheaper shade.',
    }),
    status: choice('What is the telescope doing right now?', {
      observing: 'Observing: steady, squared up, a single green status lamp.',
      downlinking: 'Phoning home: a pale beam fanning out from its dish and blue lamps lit.',
      serviced: 'Being serviced: a small work platform alongside with an arm holding a spare segment and a tethered suited figure.',
      derelict: 'Dead and adrift: tumbled over at an angle, lamps dark, a panel hanging off.',
    }),
    dish: noul('Does it carry a large high-gain dish antenna under the bus?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dead = a.status === 'derelict';
    const worn = mood.wear;

    // ---- sunshield -------------------------------------------------------------------
    const foil = { silver: '#cfd6dc', violet: '#c9b4d6', gold: '#d9a648', white: '#eceae2' }[a.foil];
    const under = { silver: '#9aa5b2', violet: '#a9b3c4', gold: '#b98a3a', white: '#cfcabb' }[a.foil];
    const squeeze = a.shield === 'stowed' ? 0.3 : 1;
    const crinkleSize = a.shield === 'slack' ? 0.5 : a.shield === 'stowed' ? 0.25 : a.shield === 'torn' ? 0.22 : 0.04 + worn * 0.12;
    const shieldTop = 3.1;
    for (let layer = 0; layer < 5; layer++) {
      const skip = new Set<number>();
      if (a.shield === 'torn' && layer < 3) {
        const first = Math.floor(random() * 6);
        skip.add(first);
        if (layer < 2) skip.add((first + 1 + Math.floor(random() * 2)) % 6);
      }
      const tint = new THREE.Color(foil).lerp(new THREE.Color(under), layer / 4).lerp(new THREE.Color('#6d6558'), worn * 0.25);
      const material = new THREE.MeshStandardMaterial({ color: tint, metalness: 0.35, roughness: mix(0.32, 0.7, worn), side: THREE.DoubleSide, flatShading: true, emissive: tint, emissiveIntensity: 0.08 });
      const sag = a.shield === 'slack' ? 0.2 : 0;
      s.mesh(membrane(1 - (4 - layer) * 0.03, squeeze, shieldTop - layer * 0.1 - sag, shieldTop - layer * (a.shield === 'stowed' ? 0.16 : 0.42), skip, () => (random() - 0.5) * crinkleSize), material);
    }
    const boom = s.material('#3b4048', { roughness: 0.5 });
    const frame = s.material('#8e949b', { metalness: 0.4, roughness: 0.45 });
    // Fore and aft pallets and the two mid booms that push the layers out sideways.
    s.box([0.9, 0.3, 20.4], [0, shieldTop - 2.0, 0], boom);
    for (const side of [-1, 1]) {
      s.rod([0, shieldTop - 1.0, 1.6], [side * 7.1 * squeeze, shieldTop - 0.9, 1.6], 0.09, frame);
      if (a.shield !== 'stowed') for (const [x, z] of [[4.4, -7.4], [7.1, 1.6]] as const) s.rod([side * x, shieldTop + 0.05, z], [side * x, shieldTop - 1.8, z], 0.035, frame);
    }
    for (const z of [10.6, -10.6]) s.rod([0, shieldTop - 1.9, z * 0.98], [0, shieldTop + 0.1, z], 0.06, frame);
    // The trim flap at the stern.
    const flap = s.box([2.2, 0.05, 1.7], [0, shieldTop - 1.5, -10.9], s.material(foil, { metalness: 0.3, side: THREE.DoubleSide }));
    flap.rotation.x = dead ? 1.2 : 0.55;
    if (a.shield === 'torn') {
      const strip = s.box([0.5, 0.03, 3.4], [5.2, shieldTop - 1.8, -3], s.material(foil, { side: THREE.DoubleSide }));
      strip.rotation.set(1.1, 0.4, 0.3);
    }

    // ---- bus -------------------------------------------------------------------------
    const blanket = s.material('#c79a3e', { metalness: 0.3, roughness: 0.45, emissive: '#4a3208', emissiveIntensity: 0.3 });
    s.box([2.6, 1.5, 2.6], [0, 1.25, 0], blanket);
    s.box([2.8, 0.12, 2.8], [0, 2.05, 0], boom);
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.12, 0.2, 0.3, [x * 1.1, 0.4, z * 1.1], boom, 10);
    const cells = s.material('#1c2f5e', { metalness: 0.3, roughness: 0.3, emissive: '#0b1838', emissiveIntensity: 0.4 });
    const panel = new THREE.Group();
    panel.position.set(0, 0.9, -1.4);
    for (let i = 0; i < 4; i++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 1.25), cells);
      cell.position.set(0, 0, -0.75 - i * 1.32);
      cell.castShadow = true;
      panel.add(cell);
    }
    panel.rotation.x = dead ? -0.9 : 0.32;
    s.root.add(panel);
    const lampColour = dead ? '#2b2f33' : a.status === 'observing' ? '#4dff86' : a.status === 'downlinking' ? '#58b8ff' : '#ffb347';
    const lamp = s.ball([0.16, 0.16, 0.16], [1.0, 1.7, 1.34], new THREE.MeshStandardMaterial({ color: lampColour, emissive: lampColour, emissiveIntensity: dead ? 0 : 2.2 }), 10);
    let dishGroup: THREE.Group | null = null;
    if (a.dish) {
      dishGroup = new THREE.Group();
      dishGroup.position.set(0.3, 0.42, 1.0);
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.4, 0.05], [0.75, 0.2], [0.95, 0.4]].map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshStandardMaterial({ color: '#e9ebe6', side: THREE.DoubleSide, roughness: 0.5 }));
      bowl.castShadow = true;
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), boom);
      feed.position.y = 0.3;
      dishGroup.add(bowl, feed);
      dishGroup.rotation.set(Math.PI * 0.62, 0, dead ? 0.6 : 0.15);
      s.root.add(dishGroup);
      if (a.status === 'downlinking') {
        const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#9fd6ff', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.y = 3.3;
        beam.rotation.x = Math.PI;
        dishGroup.add(beam);
      }
    } else {
      s.rod([0.9, 0.5, 1.2], [1.3, -0.1, 2.3], 0.03, frame);
      s.rod([-0.9, 0.5, 1.2], [-1.2, 0.0, 2.0], 0.03, frame);
    }

    // ---- telescope -------------------------------------------------------------------
    const rings = { six: 1, eighteen: 2, thirtysix: 3 }[a.size];
    const R = 1.05;
    const half = Math.sqrt(3) * R * (rings + 0.5);
    const pivot = new THREE.Group();
    pivot.position.set(0, shieldTop, -0.6);
    s.root.add(pivot);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const strut = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, material: THREE.Material) => {
      const direction = to.clone().sub(from);
      const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), 8), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      return mesh;
    };
    add(pivot, new THREE.CylinderGeometry(0.45, 0.7, 1.3, 12), boom, 0, 0.65, 0);
    add(pivot, new THREE.CylinderGeometry(0.9, 0.9, 0.16, 20), frame, 0, 0.08, 0);
    const head = new THREE.Group();
    head.position.y = 1.3;
    pivot.add(head);
    const aim = { horizon: [0.06, 0], zenith: [-0.95, 0], sidelong: [-0.2, 0.42], bowed: [0.5, 0] }[a.pointing];
    head.rotation.x = aim[0];
    pivot.rotation.y = aim[1];

    const gold = new THREE.MeshStandardMaterial({ color: '#e7b23c', metalness: 0.55, roughness: mix(0.22, 0.5, worn), emissive: '#7a4e08', emissiveIntensity: 0.45 });
    const dull = new THREE.MeshStandardMaterial({ color: '#7b6a45', metalness: 0.3, roughness: 0.8 });
    const socket = new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.7 });
    const pit = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.9 });
    const hex = new THREE.CylinderGeometry(R * 0.955, R * 0.955, 0.09, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6);
    const back = new THREE.CylinderGeometry(R * 1.0, R * 0.8, 0.34, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6);
    const pitGeometry = new THREE.CylinderGeometry(1, 1, 0.02, 7).rotateX(Math.PI / 2);
    const face = new THREE.Group();
    face.position.y = half + 0.15;
    head.add(face);
    const hinge = 1.5 * R * (rings - 0.5);
    const wings = [-1, 1].map((side) => {
      const wing = new THREE.Group();
      wing.position.x = side * hinge;
      wing.rotation.y = a.mirror === 'folded' ? side * 1.72 : 0;
      face.add(wing);
      return wing;
    });
    const pitting = a.mirror === 'pitted' ? 0.75 : worn > 0.65 ? 0.25 : 0;
    const placed: [number, number][] = [];
    for (let q = -rings; q <= rings; q++)
      for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
        if (q === 0 && r === 0) continue;
        const x = 1.5 * R * q, y = Math.sqrt(3) * R * (r + q / 2);
        const onWing = Math.abs(q) === rings && rings > 1;
        const parent = onWing ? wings[q < 0 ? 0 : 1] : face;
        const px = onWing ? x - Math.sign(q) * hinge : x;
        add(parent, back, socket, px, y, -0.2);
        if (a.mirror === 'gapped' && random() < 0.36) continue;
        placed.push([x, y]);
        const segment = add(parent, hex, gold, px, y, 0.02);
        if (pitting > 0 && random() < pitting)
          for (let k = 0, n = 1 + Math.floor(random() * 3); k < n; k++) {
            const mark = add(parent, pitGeometry, pit, px + (random() - 0.5) * R, y + (random() - 0.5) * R, 0.066);
            mark.scale.set(0.04 + random() * 0.09, 0.04 + random() * 0.09, 1);
          }
        segment.rotation.set((random() - 0.5) * 0.02, (random() - 0.5) * 0.02, 0);
      }
    if (a.mirror === 'pitted' && placed.length) {
      // One struck segment: dull, tipped out of the figure.
      const [x, y] = placed[Math.floor(random() * placed.length)];
      const struck = add(face, hex, dull, x, y, 0.1);
      struck.rotation.set(0.16, -0.12, 0.05);
    }
    // Instrument module and radiator behind the mirror.
    add(face, new THREE.BoxGeometry(2.6, Math.min(3.4, half * 1.2), 1.2), socket, 0, -0.2, -1.0);
    add(face, new THREE.BoxGeometry(2.6, 1.3, 0.06), frame, 0, half * 0.35, -1.55).rotation.x = 0.25;
    // Secondary mirror on its tripod.
    const reach = half * 1.75;
    if (a.mirror === 'folded') {
      strut(face, new THREE.Vector3(0, -half, 0.25), new THREE.Vector3(0, half * 0.7, 0.4), 0.05, boom);
      add(face, new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16).rotateX(Math.PI / 2), gold, 0, half * 0.7, 0.45);
    } else {
      const apex = new THREE.Vector3(0, 0, reach);
      for (const from of [new THREE.Vector3(-half * 0.72, -half * 0.8, 0.05), new THREE.Vector3(half * 0.72, -half * 0.8, 0.05), new THREE.Vector3(0, half * 0.98, 0.05)]) strut(face, from, apex, 0.045, boom);
      add(face, new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16).rotateX(Math.PI / 2), gold, 0, 0, reach - 0.06);
      add(face, new THREE.CylinderGeometry(0.46, 0.46, 0.1, 16).rotateX(Math.PI / 2), socket, 0, 0, reach + 0.04);
    }
    add(face, new THREE.CylinderGeometry(0.3, 0.42, 0.9, 12).rotateX(Math.PI / 2), socket, 0, 0, 0.4);

    // ---- company ---------------------------------------------------------------------
    if (a.status === 'serviced') {
      const yellow = s.material('#e3b21f', { roughness: 0.5 });
      const px = -(half * 0.9 + 2.6), py = shieldTop + 2.6, pz = 3.4;
      s.box([1.5, 0.9, 1.2], [px, py, pz], yellow);
      s.box([1.9, 0.06, 0.9], [px, py + 0.75, pz], cells).rotation.z = 0.3;
      s.rod([px + 0.6, py + 0.2, pz], [px + 1.9, py + 1.5, pz + 0.3], 0.07, frame);
      s.rod([px + 1.9, py + 1.5, pz + 0.3], [px + 3.1, py + 0.9, pz + 0.5], 0.06, frame);
      const spare = s.mesh(hex.clone(), gold, [px + 3.3, py + 0.8, pz + 0.55]);
      spare.rotation.set(0.5, 0.7, 0.2);
      const suit = s.material('#f1f1ec', { roughness: 0.7 });
      const fx = px + 1.2, fy = py - 1.2, fz = pz + 1.6;
      s.ball([0.26, 0.34, 0.24], [fx, fy, fz], suit, 12);
      s.ball([0.2, 0.2, 0.2], [fx, fy + 0.46, fz], suit, 12);
      s.box([0.24, 0.14, 0.06], [fx, fy + 0.47, fz + 0.17], s.material('#c98a1e', { metalness: 0.5, roughness: 0.2 }));
      s.box([0.36, 0.44, 0.2], [fx, fy + 0.05, fz - 0.24], suit);
      s.rod([fx - 0.18, fy - 0.2, fz], [fx - 0.3, fy - 0.8, fz + 0.1], 0.08, suit);
      s.rod([fx + 0.18, fy - 0.2, fz], [fx + 0.34, fy - 0.75, fz - 0.1], 0.08, suit);
      s.rod([fx - 0.24, fy + 0.2, fz], [fx - 0.6, fy + 0.5, fz + 0.2], 0.07, suit);
      s.rod([fx + 0.24, fy + 0.2, fz], [fx + 0.62, fy + 0.1, fz + 0.2], 0.07, suit);
      s.tube([[fx, fy, fz - 0.3], [fx - 0.6, fy + 0.4, fz - 1.0], [px + 0.5, py - 0.9, pz + 0.4], [px, py - 0.4, pz]], 0.025, s.material('#e25b2a'));
    }
    if (dead) {
      s.root.rotation.set(0.14 + random() * 0.08, (random() - 0.5) * 0.5, -0.2 - random() * 0.1);
      const loose = s.box([1.4, 0.04, 1.0], [3.2, shieldTop + 1.6, 4.4], s.material(foil, { side: THREE.DoubleSide }));
      loose.rotation.set(0.7, 0.3, 1.0);
    }

    const speed = dead ? 0 : mix(0.15, 1.6, mood.energy);
    const lampMaterial = lamp.material as THREE.MeshStandardMaterial;
    return s.finish({
      update: (_dt, time) => {
        if (dead) return;
        lampMaterial.emissiveIntensity = 1.4 + Math.sin(time * speed * 4) * 1.0;
        if (dishGroup) dishGroup.rotation.z = 0.15 + Math.sin(time * speed * 0.6) * 0.25;
      },
    });
  },
});
