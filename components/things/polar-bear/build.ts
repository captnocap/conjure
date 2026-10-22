import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V = THREE.Vector3;
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v(0, 1, 0);

const POSES = {
  walking: 'Pacing steadily across the ice, head low and swinging, one forepaw reaching.',
  sitting: 'Sitting back on its haunches like a huge dog, forepaws planted, looking out.',
  sniffing: 'Standing square with its neck stretched high and nose lifted, reading the wind.',
  rearing: 'Reared up on its hind legs to its full height, forepaws hanging, towering.',
  waiting: 'Lying flat on its belly, chin down between its forepaws, utterly still.',
} as const;

interface Frame { hip: [number, number]; shoulder: [number, number]; neck: [number, number]; pitch: number; front: [number, number, number, number][]; hind: [number, number, number, number][]; }
// [y, z] in the bear's side view; legs are [foot y, foot z, sideways spread, knee push forward] for left then right.
const FRAMES: Record<keyof typeof POSES, Frame> = {
  walking: { hip: [0.98, -0.62], shoulder: [0.95, 0.38], neck: [0.8, 1.0], pitch: 0.22, front: [[0.07, 0.78, 0.23, -0.05], [0.07, 0.12, 0.23, 0.1]], hind: [[0.07, -0.95, 0.25, -0.14], [0.07, -0.4, 0.25, 0.16]] },
  sitting: { hip: [0.47, -0.42], shoulder: [1.2, 0.12], neck: [1.52, 0.42], pitch: 0.05, front: [[0.07, 0.42, 0.2, 0.04], [0.07, 0.46, 0.2, 0.04]], hind: [[0.07, 0.22, 0.44, 0.22], [0.07, 0.26, 0.44, 0.22]] },
  sniffing: { hip: [0.98, -0.6], shoulder: [1.0, 0.38], neck: [1.5, 0.82], pitch: -0.75, front: [[0.07, 0.42, 0.24, 0.02], [0.07, 0.34, 0.24, 0.02]], hind: [[0.07, -0.72, 0.26, 0.12], [0.07, -0.58, 0.26, 0.12]] },
  rearing: { hip: [1.0, -0.08], shoulder: [1.98, 0.12], neck: [2.42, 0.36], pitch: -0.25, front: [[1.42, 0.6, 0.26, 0.28], [1.5, 0.56, 0.26, 0.28]], hind: [[0.07, 0.02, 0.26, 0.2], [0.07, -0.14, 0.26, 0.2]] },
  waiting: { hip: [0.4, -0.7], shoulder: [0.42, 0.3], neck: [0.3, 0.88], pitch: 0.12, front: [[0.07, 1.02, 0.34, 0.1], [0.07, 0.98, 0.34, 0.1]], hind: [[0.07, -0.3, 0.6, 0.3], [0.07, -0.34, 0.6, 0.3]] },
};

export default defineThing({
  questions: {
    pose: choice('What is the bear doing?', POSES),
    build: score('How well fed is it?', ['Gaunt, hips and shoulders showing, starving', 'Lean and rangy', 'Solid and strong', 'Enormous, rolling with fat']),
    cubs: choice('Are there cubs with it?', {
      none: 'No cubs. It is alone.',
      one: 'One cub close behind.',
      two: 'Two cubs trailing after, one lagging.',
    }),
    noticed: choice('What has it noticed?', {
      nothing: 'Nothing. It is simply here.',
      hole: 'A seal\'s breathing hole, a dark round opening in the ice just ahead.',
      scent: 'Something on the wind off to one side: its head is turned hard toward it.',
      kill: 'Its own kill: a dark seal on blood-stained snow, and red on its muzzle.',
      drum: 'A rusting fuel drum left by people, half buried in the snow.',
      flag: 'A bamboo survey pole with a little orange flag, planted in the ice.',
    }),
    floe: choice('What is the ice under it like?', {
      broad: 'A broad solid floe with snow on it.',
      shrinking: 'A cake of ice barely bigger than the bear, dark water all round.',
      ponds: 'Rotten summer ice pocked with turquoise melt ponds.',
      ridge: 'Hard ice with a tumbled ridge of blue blocks behind it.',
    }),
    tracks: noul('Has it left a trail of paw prints behind it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const sphere = new THREE.SphereGeometry(1, 18, 12);
    const fur = new THREE.MeshStandardMaterial({ color: new THREE.Color('#f6eed6').lerp(new THREE.Color('#e9d9ae'), mood.warmth * 0.5 + mood.wear * 0.25).lerp(new THREE.Color('#a8a294'), mood.wear * 0.3), roughness: 0.95 });
    const shade = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d9d0b8').lerp(new THREE.Color('#9a927f'), mood.wear * 0.4), roughness: 1 });
    const black = new THREE.MeshStandardMaterial({ color: '#16171a', roughness: 0.5 });
    const blood = new THREE.MeshStandardMaterial({ color: '#a3202a', roughness: 0.8 });
    const owned: THREE.Material[] = [fur, shade, black, blood];
    const heads: { group: THREE.Group; yaw: number; pitch: number; phase: number }[] = [];

    const put = (group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const blob = (group: THREE.Object3D, at: V, size: [number, number, number], material: THREE.Material = fur) => {
      const mesh = put(group, sphere, material);
      mesh.position.copy(at);
      mesh.scale.set(...size);
      return mesh;
    };
    /** A tapered limb from one joint to the next, capped with a ball so chains stay smooth. */
    const bone = (group: THREE.Object3D, from: V, to: V, r0: number, r1: number, material: THREE.Material = fur) => {
      const along = to.clone().sub(from), length = Math.max(along.length(), 0.001);
      const mesh = put(group, new THREE.CylinderGeometry(r1, r0, length, 14, 1, true), material);
      mesh.position.copy(from).addScaledVector(along, 0.5);
      mesh.quaternion.setFromUnitVectors(UP, along.normalize());
      blob(group, to, [r1, r1, r1], material);
    };

    const bear = (pose: keyof typeof POSES, bulk: number, cub: boolean, headYaw: number, bloody: boolean) => {
      const group = new THREE.Group();
      const f = FRAMES[pose];
      const girth = mix(0.8, 1.22, bulk) * (cub ? 1.12 : 1);
      const hip = v(0, f.hip[0], f.hip[1]), shoulder = v(0, f.shoulder[0], f.shoulder[1]), neck = v(0, f.neck[0], f.neck[1]);
      const spine = shoulder.clone().sub(hip).normalize();
      // Barrel: big rump, slightly narrower chest, a belly that sags when fat.
      blob(group, hip, [0.44 * girth, 0.45 * girth, 0.45 * girth]);
      bone(group, hip, shoulder, 0.44 * girth, 0.39 * girth);
      const middle = hip.clone().lerp(shoulder, 0.45);
      const down = pose === 'rearing' || pose === 'sitting' ? v(0, -0.2, 0.75).normalize() : v(0, -1, 0);
      if (pose !== 'waiting') blob(group, middle.addScaledVector(down, mix(-0.02, 0.16, bulk)), [0.4 * girth, 0.42 * girth, 0.5 * girth]).rotation.x = -Math.atan2(spine.y, spine.z);
      if (bulk < 0.25 && !cub) for (const side of [-1, 1]) blob(group, hip.clone().add(v(side * 0.2, 0.3, 0.05)), [0.1, 0.08, 0.16], shade);
      blob(group, hip.clone().addScaledVector(spine, -0.42 * girth).add(v(0, 0.02, 0)), [0.07, 0.07, 0.09]);
      // The long neck is what makes it a polar bear and not a brown one.
      bone(group, shoulder.clone().addScaledVector(spine, 0.08), neck, 0.33 * girth, cub ? 0.24 : 0.2);

      const head = new THREE.Group();
      head.position.copy(neck);
      head.rotation.set(f.pitch, headYaw, 0, 'YXZ');
      group.add(head);
      const big = cub ? 1.28 : 1;
      blob(head, v(0, 0.02, 0.08), [0.2 * big, 0.185 * big, 0.24 * big]);
      const snout = put(head, new THREE.CylinderGeometry(0.075 * big, 0.135 * big, cub ? 0.2 : 0.32, 12), fur);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.03, cub ? 0.32 : 0.4);
      const tip = cub ? 0.42 : 0.56;
      blob(head, v(0, -0.03, tip), [0.075 * big, 0.07 * big, 0.06 * big], bloody ? blood : fur);
      blob(head, v(0, -0.005, tip + 0.04), [0.045, 0.035, 0.035], black);
      for (const side of [-1, 1]) {
        blob(head, v(side * 0.15 * big, 0.17 * big, 0.0), [0.055 * big, 0.06 * big, 0.03 * big]);
        blob(head, v(side * 0.105 * big, 0.085 * big, 0.25 * big), [0.024, 0.024, 0.02], black);
      }
      if (bloody) blob(head, v(0, -0.07, 0.42), [0.09, 0.05, 0.14], blood);
      heads.push({ group: head, yaw: headYaw, pitch: f.pitch, phase: random() * 6 });

      const limb = (root: V, leg: [number, number, number, number], side: number, thick: number, front: boolean) => {
        const top = root.clone().add(v(side * leg[2] * 0.85, front ? -0.08 : -0.05, 0));
        const foot = v(side * leg[2] * (pose === 'waiting' || pose === 'sitting' ? 1 : 1.0), leg[0], leg[1]);
        const knee = top.clone().lerp(foot, 0.52).add(v(side * 0.03, 0, leg[3]));
        blob(group, top, [thick * 1.15, thick * 1.15, thick * 1.15]);
        bone(group, top, knee, thick * 1.1, thick * 0.86);
        bone(group, knee, foot.clone().add(v(0, 0.04, 0)), thick * 0.86, thick * 0.74);
        const hanging = foot.y > 0.3;
        const paw = blob(group, foot.clone().add(hanging ? v(0, -0.06, 0.04) : v(0, 0, 0.07)), [thick * 0.95, hanging ? 0.14 : 0.075, hanging ? 0.1 : 0.2], shade);
        if (pose === 'waiting' && front) paw.scale.z = 0.24;
      };
      const stride = cub ? (random() < 0.5 ? 1 : -1) : 1;
      const order = (legs: Frame['front']) => (stride === 1 ? legs : [legs[1], legs[0]]);
      order(f.front).forEach((leg, index) => limb(shoulder, leg, index ? 1 : -1, 0.165 * mix(0.9, 1.1, bulk), true));
      order(f.hind).forEach((leg, index) => limb(hip, leg, index ? 1 : -1, 0.18 * mix(0.9, 1.1, bulk), false));
      return group;
    };

    // The scent comes from one side; a bear at a hole or a kill looks down at it.
    const turn = a.noticed === 'scent' ? (random() < 0.5 ? -1 : 1) * mix(0.8, 1.15, random()) : (random() - 0.5) * 0.35;
    const mother = bear(a.pose, a.build, false, turn, a.noticed === 'kill');
    const drop = a.pose === 'waiting' ? 0.06 : 0;
    mother.position.y = drop;
    s.root.add(mother);
    const frame = FRAMES[a.pose];
    const nose = frame.neck[1] + 0.6;

    const cubCount = { none: 0, one: 1, two: 2 }[a.cubs];
    const cubSpots: [number, number][] = [];
    for (let i = 0; i < cubCount; i++) {
      const settled = a.pose === 'sitting' || a.pose === 'waiting';
      const cubPose: keyof typeof POSES = settled ? (i === 0 ? 'sitting' : random() < 0.5 ? 'waiting' : 'sniffing') : i === 1 && random() < 0.4 ? 'sitting' : a.pose === 'rearing' ? 'sniffing' : 'walking';
      const cub = bear(cubPose, mix(0.4, 0.9, a.build), true, (random() - 0.5) * 1.2, false);
      const size = mix(0.4, 0.5, random());
      const x = settled ? (i ? -1 : 1) * mix(0.75, 0.95, random()) : (i ? -0.5 : 0.4) + (random() - 0.5) * 0.3;
      const z = settled ? mix(-0.2, 0.5, random()) : -1.45 - i * mix(1.0, 1.6, random());
      cub.scale.setScalar(size);
      cub.position.set(x, 0, z);
      cub.rotation.y = settled ? (i ? 0.5 : -0.4) : (random() - 0.5) * 0.4;
      s.root.add(cub);
      cubSpots.push([x, z]);
    }

    // What it has noticed lies ahead of its nose.
    const ahead = Math.max(nose + 0.35, 1.55);
    let front = Math.max(nose, 1.2);
    const snowTint = new THREE.Color('#d3e1ec').lerp(new THREE.Color('#dfe3e2'), mood.wear * 0.5);
    if (a.noticed === 'hole') {
      const hole = s.cylinder(0.3, 0.3, 0.02, [0, 0.011, ahead], new THREE.MeshStandardMaterial({ color: '#0f2433', roughness: 0.15 }), 18);
      hole.castShadow = false;
      const rim = s.ring(0.33, 0.06, [0, 0.01, ahead], s.material('#ffffff', { roughness: 1 }));
      rim.rotation.x = Math.PI / 2;
      rim.scale.z = 0.7;
      front = ahead + 0.5;
    } else if (a.noticed === 'kill') {
      const stain = s.mesh(new THREE.CircleGeometry(0.75, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b3323a', roughness: 1 }), [0.1, 0.012, ahead + 0.1]);
      stain.scale.set(1, 1, 0.7);
      stain.castShadow = false;
      const seal = s.ball([0.22, 0.17, 0.55], [0, 0.14, ahead + 0.15], s.material('#3d4248', { roughness: 0.45 }), 14);
      seal.rotation.y = 1.1;
      s.ball([0.13, 0.11, 0.15], [0.5, 0.12, ahead - 0.1], s.material('#3d4248', { roughness: 0.45 }), 10);
      s.ball([0.2, 0.05, 0.14], [-0.1, 0.2, ahead + 0.2], blood, 8);
      front = ahead + 0.8;
    } else if (a.noticed === 'drum') {
      const rust = s.material('#9a4a26', { roughness: 0.9, metalness: 0.3 });
      const drum = s.cylinder(0.29, 0.29, 0.88, [0.25, 0.16, ahead + 0.35], rust, 18);
      drum.rotation.set(0.25, 0.5, Math.PI / 2 - 0.2);
      for (const along of [-0.3, 0, 0.3]) { const hoop = s.ring(0.3, 0.018, [0, 0, 0], s.material('#6e3018', { metalness: 0.4 })); drum.add(hoop); hoop.rotation.x = Math.PI / 2; hoop.position.set(0, along, 0); }
      s.ball([0.5, 0.12, 0.4], [0.5, 0, ahead + 0.5], s.material(snowTint, { roughness: 1 }), 10);
      front = ahead + 0.9;
    } else if (a.noticed === 'flag') {
      const lean = (random() - 0.5) * 0.3;
      s.rod([0.2, 0, ahead + 0.3], [0.2 + lean, 2.1, ahead + 0.3], 0.018, s.material('#c9a55a'));
      const cloth = s.mesh(new THREE.PlaneGeometry(0.42, 0.26, 6, 1), new THREE.MeshStandardMaterial({ color: '#f26a1b', side: THREE.DoubleSide, roughness: 0.8, emissive: '#f26a1b', emissiveIntensity: 0.15 }), [0.41 + lean, 1.95, ahead + 0.3]);
      const wave = cloth.geometry.getAttribute('position');
      for (let i = 0; i < wave.count; i++) wave.setZ(i, Math.sin(wave.getX(i) * 14) * 0.04);
      cloth.geometry.computeVertexNormals();
      front = ahead + 0.6;
    }

    const back = Math.min(frame.hip[1] - 0.7, ...cubSpots.map(([, z]) => z - 0.6), a.tracks ? -2.3 : 0);
    const prints: { at: [number, number, number]; size: number }[] = [];
    if (a.tracks) for (let i = 0; i < 9; i++) {
      const z = frame.hip[1] - 0.55 - i * 0.33;
      if (z < back + 0.2) break;
      prints.push({ at: [(i % 2 ? 0.2 : -0.2) + Math.sin(i * 0.9) * 0.05, 0.008, z], size: 1 });
    }

    // The floe.
    const wide = Math.max(0.7, ...cubSpots.map(([x]) => Math.abs(x) + 0.4));
    const margin = { broad: 0.5, shrinking: 0.1, ponds: 0.5, ridge: 0.45 }[a.floe];
    const cz = (front + back) / 2, rz = (front - back) / 2 + margin, rx = wide + margin * 1.1;
    const outline = (grow: number, corners: number, rough: number) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < corners; i++) {
        const angle = i / corners * 6.283, wobble = 1 - rough / 2 + random() * rough;
        const px = Math.cos(angle) * (rx + grow) * wobble, pz = Math.sin(angle) * (rz + grow) * wobble;
        if (i === 0) shape.moveTo(px, pz); else shape.lineTo(px, pz);
      }
      return shape;
    };
    const ice = s.material(a.floe === 'ponds' ? '#cfdde6' : a.floe === 'ridge' ? '#c3d9e8' : snowTint, { roughness: a.floe === 'ridge' ? 0.5 : 0.95, flatShading: true });
    const thick = a.floe === 'shrinking' ? 0.3 : 0.2;
    const slab = s.mesh(new THREE.ExtrudeGeometry(outline(0, 12, 0.22), { depth: thick, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.05, bevelSegments: 1 }).rotateX(Math.PI / 2), ice, [0, -0.05, cz]);
    slab.castShadow = false;
    if (a.floe === 'shrinking') {
      const sea = s.mesh(new THREE.ExtrudeGeometry(outline(0.5, 20, 0.06), { depth: 0.08, bevelEnabled: false }).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#1f4a63', roughness: 0.12, metalness: 0.2 }), [0, -0.28, cz]);
      sea.castShadow = false;
      const brash = s.material('#f2f7fa', { flatShading: true });
      for (let i = 0; i < 7; i++) {
        const angle = random() * 6.283;
        const chip = s.cylinder(0.14 + random() * 0.18, 0.18 + random() * 0.2, 0.1, [Math.cos(angle) * (rx + 0.3), -0.3, cz + Math.sin(angle) * (rz + 0.3)], brash, 5);
        chip.rotation.y = random() * 3;
      }
    } else if (a.floe === 'ponds') {
      const pond = new THREE.MeshStandardMaterial({ color: '#58c3d6', roughness: 0.1, emissive: '#2a9db3', emissiveIntensity: 0.2 });
      owned.push(pond);
      for (let i = 0; i < 6; i++) {
        const angle = random() * 6.283, far = mix(0.55, 0.9, random());
        const pool = s.mesh(new THREE.CircleGeometry(0.3 + random() * 0.4, 12).rotateX(-Math.PI / 2), pond, [Math.cos(angle) * rx * far, 0.006, cz + Math.sin(angle) * rz * far]);
        pool.scale.set(1, 1, 0.5 + random() * 0.4);
        pool.rotation.y = random() * 3;
        pool.castShadow = false;
      }
    } else if (a.floe === 'ridge') {
      const block = new THREE.MeshStandardMaterial({ color: '#a9d0e6', roughness: 0.35, flatShading: true });
      owned.push(block);
      for (let i = 0; i < 9; i++) {
        const t = i / 8 - 0.5;
        const chunk = s.mesh(new THREE.BoxGeometry(0.5 + random() * 0.7, 0.3 + random() * 0.6, 0.4 + random() * 0.5), block, [t * rx * 1.5, 0.15 + random() * 0.25, cz - rz * 0.82 + Math.cos(t * 3) * 0.2]);
        chunk.rotation.set((random() - 0.5) * 1.2, random() * 3, (random() - 0.5) * 1.2);
      }
    } else for (let i = 0; i < 4; i++) {
      const angle = random() * 6.283;
      s.ball([0.4 + random() * 0.5, 0.05 + random() * 0.05, 0.25 + random() * 0.2], [Math.cos(angle) * rx * 0.85, 0, cz + Math.sin(angle) * rz * 0.85], s.material('#f8fbfd', { roughness: 1 }), 10).rotation.y = random() * 3;
    }
    if (prints.length) s.scatter(new THREE.SphereGeometry(1, 8, 6).scale(0.13, 0.012, 0.17), new THREE.MeshStandardMaterial({ color: '#9fb4c6', roughness: 1 }), prints).castShadow = false;

    const thing = s.finish({
      update: (_dt, time) => {
        for (const head of heads) {
          head.group.rotation.y = head.yaw + Math.sin(time * mix(0.3, 1.6, mood.energy) + head.phase) * mix(0.05, 0.3, mood.energy);
          head.group.rotation.x = head.pitch + Math.sin(time * 0.6 + head.phase * 2) * 0.04;
        }
      },
    });
    return { ...thing, dispose: () => { thing.dispose(); sphere.dispose(); for (const material of owned) material.dispose(); } };
  },
});
