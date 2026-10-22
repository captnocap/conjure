import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const N = 24;
const R = 26;

export default defineThing({
  questions: {
    style: choice('What kind of wheel is it?', {
      vonbraun: 'A fat smooth white torus with red trim and thick tube spokes, straight off a 1950s magazine cover.',
      modular: 'A ring of aluminium can modules joined end to end by ball nodes, built from launched parts.',
      inflatable: 'A soft tan torus of bulging fabric lobes cinched by dark straps, a modern inflatable.',
      truss: 'An open girder hoop with boxy habitat pods hung along it, industrial and bare.',
    }),
    spokes: choice('How many spokes does it have?', {
      two: 'Two, a single bar through the hub.',
      three: 'Three, a spare tripod.',
      four: 'Four, a plain cross.',
      six: 'Six, like a wagon wheel.',
      eight: 'Eight, dense and sturdy.',
    }),
    finish: choice('How finished is the ring?', {
      complete: 'Complete all the way round.',
      gap: 'One short gap where bare ribs bridge sections not yet skinned.',
      half: 'Half built: one side skinned and lived in, the other only ribs and hoops, the last sections not even started.',
      broken: 'Broken: a bite torn out of the rim, scorched ends and loose wreckage drifting beside it.',
    }),
    lights: choice('Which windows are lit?', {
      all: 'Nearly every window along the rim, a full house.',
      arc: 'Only one arc of the rim; the rest is dark and unoccupied.',
      alternate: 'Alternating lit and dark blocks, shifts sleeping and waking.',
      hub: 'The rim is dark; only the hub shows a light.',
      emergency: 'Dim red emergency lighting all the way round.',
    }),
    hub: choice('What is at the hub?', {
      plain: 'A plain drum with a docking collar.',
      dish: 'A big communications dish on a mast.',
      solar: 'Two long blue solar wings.',
      mast: 'A tall antenna spire with a beacon at its tip.',
    }),
    twin: noul('Is it a double wheel, two rims side by side on one hub?'),
    docked: noul('Is a ship docked nose-in at the hub?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const tube = { vonbraun: 3.7, modular: 3.0, inflatable: 4.3, truss: 2.4 }[a.style];
    const arc = (Math.PI * 2) / N;
    const segLen = R * arc;
    const wheel = new THREE.Group();
    s.root.add(wheel);
    const add = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    /** A frame at angle theta on the rim: local x points outward, local y along the rim. */
    const station = (theta: number, radius: number, z: number) => {
      const group = new THREE.Group();
      group.position.set(Math.cos(theta) * radius, Math.sin(theta) * radius, z);
      group.rotation.z = theta;
      wheel.add(group);
      return group;
    };

    const hullColour = { vonbraun: '#ecebe4', modular: '#b9c0c7', inflatable: '#d9cdb2', truss: '#e6e2d4' }[a.style];
    const hull = s.material(hullColour, { roughness: a.style === 'modular' ? 0.4 : 0.65, metalness: a.style === 'modular' ? 0.45 : 0.05 });
    const accent = s.material({ vonbraun: '#c8402c', modular: '#f0efe8', inflatable: '#4a4640', truss: '#d9a21b' }[a.style], { roughness: 0.6 });
    const scorched = s.material('#3a3632', { roughness: 0.9 });
    const girder = s.material('#5d646e', { roughness: 0.5, metalness: 0.4 });
    const glow = new THREE.Color().setHSL(mix(0.56, 0.1, mood.warmth), 0.85, 0.72);
    const litMaterial = new THREE.MeshStandardMaterial({ color: a.lights === 'emergency' ? '#ff3b2b' : glow, emissive: a.lights === 'emergency' ? '#ff2a1a' : glow, emissiveIntensity: a.lights === 'emergency' ? 1.1 : mix(1.2, 2.2, mood.cheer) });
    const darkGlass = new THREE.MeshStandardMaterial({ color: '#27313c', roughness: 0.3, metalness: 0.3 });

    // Which sections exist, and which are lit.
    type State = 'skin' | 'bare' | 'gone';
    const start = Math.floor(random() * N);
    const litStart = Math.floor(random() * N);
    const litSpan = 5 + Math.floor(random() * 4);
    const around = (i: number, from: number) => (i - from + N) % N;
    const stateOf = (i: number): State => {
      const d = around(i, start);
      if (a.finish === 'gap') return d < 3 ? 'bare' : 'skin';
      if (a.finish === 'half') return d < 2 ? 'gone' : d < N / 2 ? 'bare' : 'skin';
      if (a.finish === 'broken') return d < 3 ? 'gone' : 'skin';
      return 'skin';
    };
    const burnt = (i: number) => a.finish === 'broken' && (around(i, start) === 3 || around(i, start) === N - 1);
    const litAt = (i: number) => {
      if (burnt(i)) return false;
      if (a.lights === 'all') return random() > 0.1;
      if (a.lights === 'arc') return around(i, litStart) < litSpan;
      if (a.lights === 'alternate') return Math.floor(i / 2) % 2 === 0;
      if (a.lights === 'emergency') return random() > 0.2;
      return false;
    };

    const skinGeometry = {
      vonbraun: new THREE.TorusGeometry(R, tube, 12, 5, arc * 1.02),
      modular: new THREE.CylinderGeometry(tube * 0.82, tube * 0.82, segLen * 0.8, 14),
      inflatable: new THREE.SphereGeometry(1, 14, 10),
      truss: new THREE.BoxGeometry(tube * 1.5, segLen * 0.78, tube * 1.7),
    }[a.style];
    const hoop = new THREE.TorusGeometry(tube * 0.9, 0.22, 6, 18).rotateX(Math.PI / 2);
    const stringerIn = new THREE.TorusGeometry(R - tube * 0.9, 0.2, 5, 5, arc * 1.02);
    const stringerOut = new THREE.TorusGeometry(R + tube * 0.9, 0.2, 5, 5, arc * 1.02);
    const node = new THREE.SphereGeometry(tube * 0.95, 12, 8);
    const strap = new THREE.TorusGeometry(tube * 0.86, 0.3, 6, 18).rotateX(Math.PI / 2);
    const beam = new THREE.BoxGeometry(0.35, segLen * 1.04, 0.35);
    const frontZ = { vonbraun: tube * 0.96, modular: tube * 0.8, inflatable: tube * 1.02, truss: tube * 0.86 }[a.style];
    const lit: THREE.Matrix4[] = [], unlit: THREE.Matrix4[] = [];
    const zs = a.twin ? [tube * 1.35, -tube * 1.35] : [0];

    for (const z of zs)
      for (let i = 0; i < N; i++) {
        const theta = i * arc;
        const state = stateOf(i);
        if (state === 'gone') continue;
        if (state === 'bare') {
          const frame = station(theta, R, z);
          add(frame, hoop, girder);
          for (const geometry of [stringerIn, stringerOut]) {
            const stringer = add(wheel, geometry, girder);
            stringer.position.z = z;
            stringer.rotation.z = theta;
          }
          continue;
        }
        const paint = burnt(i) ? scorched : a.style === 'vonbraun' && i % 6 === 0 ? accent : hull;
        if (a.style === 'vonbraun') {
          const piece = add(wheel, skinGeometry, paint);
          piece.position.z = z;
          piece.rotation.z = theta - arc / 2;
        } else if (a.style === 'modular') {
          add(station(theta, R, z), skinGeometry, paint);
          add(station(theta + arc / 2, R, z), node, burnt(i) ? scorched : accent).scale.setScalar(0.92);
        } else if (a.style === 'inflatable') {
          add(station(theta, R, z), skinGeometry, paint).scale.set(tube * mix(0.96, 1.06, random()), segLen * 0.6, tube);
          add(station(theta + arc / 2, R, z), strap, accent);
        } else {
          const frame = station(theta, R, z);
          for (const [x, zz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const) add(frame, beam, girder).position.set(x * tube * 0.9, 0, zz * tube * 0.9);
          add(frame, hoop, girder).position.y = segLen / 2;
          if (i % 3 !== 2) add(frame, skinGeometry, i % 3 === 0 ? paint : burnt(i) ? scorched : accent);
          else continue;
        }
        // Windows on the face toward the viewer and round the outer tread.
        const on = litAt(i);
        for (const along of [-0.26, 0.26]) {
          const t = theta + along * arc;
          for (const [radius, depth, turn] of [[R, z + frontZ, 0], [R + frontZ * 0.72, z + frontZ * 0.62, 0.8], [R - frontZ * 0.72, z + frontZ * 0.62, -0.8]] as const) {
            const matrix = new THREE.Matrix4().compose(
              new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, depth),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, turn, t, 'ZYX')),
              new THREE.Vector3(1, 1, 1),
            );
            (on && random() > 0.12 ? lit : unlit).push(matrix);
          }
        }
      }
    const pane = new THREE.BoxGeometry(tube * 0.34, segLen * 0.3, 0.5);
    for (const [matrices, material] of [[lit, litMaterial], [unlit, darkGlass]] as const) {
      if (!matrices.length) continue;
      const mesh = new THREE.InstancedMesh(pane, material, matrices.length);
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      wheel.add(mesh);
    }

    // Spokes.
    const count = { two: 2, three: 3, four: 4, six: 6, eight: 8 }[a.spokes];
    const hubRadius = 3.6;
    const spokeThick = { vonbraun: 1.35, modular: 1.0, inflatable: 0.55, truss: 0.3 }[a.style];
    const spokeLength = R - tube * 0.8 - hubRadius * 0.8;
    const spokeGeometry = new THREE.CylinderGeometry(spokeThick, spokeThick, spokeLength, 10).rotateZ(Math.PI / 2);
    const thin = new THREE.CylinderGeometry(0.16, 0.16, spokeLength, 6).rotateZ(Math.PI / 2);
    const lift = new THREE.BoxGeometry(3.2, spokeThick * 2.6, spokeThick * 2.6);
    const spokeOffset = random() * arc;
    for (const z of zs)
      for (let k = 0; k < count; k++) {
        const theta = spokeOffset + (k * Math.PI * 2) / count;
        const nearest = Math.round(theta / arc) % N;
        const reaches = stateOf(nearest) !== 'gone';
        const spoke = station(theta, hubRadius * 0.8 + spokeLength / 2, z);
        if (!reaches) {
          // A spoke with nothing to hold: it ends in a stub.
          add(spoke, new THREE.CylinderGeometry(spokeThick, spokeThick, spokeLength * 0.55, 10).rotateZ(Math.PI / 2), a.finish === 'broken' ? scorched : girder).position.x = -spokeLength * 0.225;
          continue;
        }
        if (a.style === 'truss') {
          for (const [y, zz] of [[1.1, 0], [-0.6, 1], [-0.6, -1]] as const) add(spoke, thin, girder).position.set(0, y, zz);
          for (let j = -3; j <= 3; j++) add(spoke, new THREE.BoxGeometry(0.14, 1.9, 2.2), girder).position.x = (j * spokeLength) / 7;
        } else {
          add(spoke, spokeGeometry, a.style === 'inflatable' ? girder : hull);
          if (a.style === 'inflatable') for (const zz of [-1.6, 1.6]) add(spoke, thin, accent).position.z = zz;
          else add(spoke, lift, accent).position.x = mix(-0.3, 0.3, random()) * spokeLength;
        }
      }

    // The hub does not turn with the rim.
    const hubLength = 9 + (a.twin ? tube * 2.7 : 0) + tube;
    const hubMaterial = s.material(a.style === 'truss' ? '#8a9199' : hullColour, { roughness: 0.5, metalness: 0.2 });
    const drum = s.mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, hubLength, 20).rotateX(Math.PI / 2), hubMaterial);
    void drum;
    s.mesh(new THREE.CylinderGeometry(hubRadius * 1.12, hubRadius * 1.12, 1.0, 20).rotateX(Math.PI / 2), accent, [0, 0, hubLength * 0.3]);
    s.mesh(new THREE.CylinderGeometry(hubRadius * 0.55, hubRadius, 2.4, 20).rotateX(Math.PI / 2), hubMaterial, [0, 0, hubLength / 2 + 1.2]);
    s.mesh(new THREE.CylinderGeometry(hubRadius, hubRadius * 0.6, 2.0, 20).rotateX(Math.PI / 2), hubMaterial, [0, 0, -hubLength / 2 - 1.0]);
    const hubLit = a.lights !== 'emergency';
    for (let k = 0; k < 8; k++) {
      const t = (k / 8) * Math.PI * 2;
      const port = s.mesh(new THREE.SphereGeometry(0.55, 8, 6), hubLit && (a.lights === 'hub' || random() > 0.4) ? litMaterial : darkGlass, [Math.cos(t) * hubRadius, Math.sin(t) * hubRadius, hubLength * 0.12]);
      port.castShadow = false;
    }
    const front = hubLength / 2 + 2.4;
    if (a.docked) {
      const shipPaint = s.material('#d7dbe0', { metalness: 0.3, roughness: 0.4 });
      s.mesh(new THREE.CylinderGeometry(1.7, 1.7, 7, 14).rotateX(Math.PI / 2), shipPaint, [0, 0, front + 3.5]);
      s.mesh(new THREE.CylinderGeometry(2.3, 1.7, 2.2, 14).rotateX(Math.PI / 2), s.material('#3b4048'), [0, 0, front + 8.1]);
      s.mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.8, 14).rotateX(Math.PI / 2), accent, [0, 0, front + 5]);
      for (const x of [-1, 1]) s.box([5.5, 0.15, 2.4], [x * 4.5, 0, front + 4.5], s.material('#1c2f5e', { emissive: '#0b1838', emissiveIntensity: 0.4 }));
    } else {
      s.mesh(new THREE.TorusGeometry(1.5, 0.3, 6, 18), girder, [0, 0, front + 0.1]);
    }
    const rear = -hubLength / 2 - 2.0;
    if (a.hub === 'dish') {
      s.rod([0, 0, a.docked ? rear : front], [0, 0, a.docked ? rear - 5 : front + 5], 0.35, girder);
      const bowl = s.mesh(new THREE.LatheGeometry([[0.1, 0], [2.4, 0.5], [4.2, 1.6], [5.2, 3.0]].map(([x, y]) => new THREE.Vector2(x, y)), 24), new THREE.MeshStandardMaterial({ color: '#eeeeea', side: THREE.DoubleSide, roughness: 0.5 }), [0, 0, a.docked ? rear - 5 : front + 5]);
      bowl.rotation.set(a.docked ? -Math.PI / 2 - 0.4 : Math.PI / 2 - 0.5, 0, 0.3);
    } else if (a.hub === 'solar') {
      const cells = s.material('#1f3a7a', { metalness: 0.3, roughness: 0.3, emissive: '#0d1f4d', emissiveIntensity: 0.5 });
      for (const side of [-1, 1]) {
        s.rod([0, 0, rear + 0.5], [side * 8, 0, rear - 1], 0.25, girder);
        for (let j = 0; j < 4; j++) s.box([4.6, 0.2, 7], [side * (10.6 + j * 4.9), 0, rear - 1], cells).rotation.x = 0.5;
      }
    } else if (a.hub === 'mast') {
      const z0 = a.docked ? rear : front, dir = a.docked ? -1 : 1;
      s.rod([0, 0, z0], [0, 0, z0 + dir * 13], 0.4, girder, 0.1);
      for (let j = 1; j < 4; j++) s.rod([-2.4 + j * 0.4, 0, z0 + dir * j * 3], [2.4 - j * 0.4, 0, z0 + dir * j * 3], 0.1, girder);
      s.ball([0.6, 0.6, 0.6], [0, 0, z0 + dir * 13.3], new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff3a1a', emissiveIntensity: 2 }), 10);
    }

    // Work in progress, or the aftermath.
    if (a.finish === 'half' || a.finish === 'gap') {
      const theta = (start + (a.finish === 'gap' ? 1 : 3)) * arc;
      const rig = station(theta, R + tube + 2.2, zs[0]);
      add(rig, new THREE.BoxGeometry(2.6, 3.4, 2.6), s.material('#e3b21f'));
      add(rig, new THREE.CylinderGeometry(0.2, 0.2, 7, 6), girder).position.set(-1.2, 3.5, 1.4);
      add(rig, new THREE.BoxGeometry(0.3, 4.5, 3.2), hull).position.set(-2.4, 6.5, 1.4);
    }
    if (a.finish === 'broken') {
      for (let k = 0; k < 9; k++) {
        const theta = (start + 0.2 + random() * 2.6) * arc;
        const chunk = station(theta, R + (random() - 0.35) * 14, zs[0] + (random() - 0.5) * 12);
        const piece = add(chunk, new THREE.BoxGeometry(0.8 + random() * 3, 0.4 + random() * 2.4, 0.3 + random() * 1.5), random() > 0.5 ? scorched : hull);
        piece.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    // Patched and stained plating as the place ages.
    for (let k = 0, n = Math.round(mood.wear * 16); k < n; k++) {
      const i = Math.floor(random() * N);
      if (stateOf(i) !== 'skin' || a.style === 'truss') continue;
      const patch = station((i + random()) * arc, R, zs[0] + frontZ * 0.98);
      add(patch, new THREE.BoxGeometry(tube * (0.4 + random() * 0.5), segLen * 0.3, 0.3), scorched).rotation.z = random();
    }

    const speed = a.finish === 'broken' ? 0.01 : mix(0.03, 0.3, mood.energy);
    wheel.rotation.z = random() * Math.PI;
    return s.finish({ update: (dt) => { wheel.rotation.z += dt * speed; } });
  },
});
