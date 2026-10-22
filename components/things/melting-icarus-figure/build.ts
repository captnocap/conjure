import * as THREE from 'three';
import { Sculpture, choice, defineThing, figure, mix, noul, score } from '@conjure/kit';

type Side = 'left' | 'right';

export default defineThing({
  questions: {
    medium: choice('What is he made of?', {
      bronze: 'Cast bronze, dark gold with green patina in the hollows: a monument.',
      marble: 'White marble, smooth and cold, a museum sculpture.',
      silhouette: 'A dark silhouette against the glare, only the dripping wax glowing.',
      living: 'A living youth in a short pale tunic, wings of real feathers and yellow wax.',
    }),
    fall: choice('How is he falling?', {
      plunging: 'Plunging head first, arms and wings flung back behind him.',
      tumbling: 'Tumbling backward, face to the sky, limbs flailing.',
      reaching: 'Still reaching up toward the sun with one hand as he drops.',
      curled: 'Curled in on himself in grief, knees drawn up, wings folding round him.',
    }),
    melt: choice('How far has the wax gone?', {
      whole: 'Barely begun: the wings are whole, the wax just softening and beading.',
      dripping: 'Wax running in long drips, the first feathers loosening.',
      shedding: 'Feathers peeling away in a cloud around him.',
      bare: 'Almost nothing left: a bare frame of spars and a few last feathers.',
    }),
    mount: choice('What holds him up?', {
      free: 'Nothing: he is simply falling, in the air.',
      pedestal: 'A stone pedestal with a bronze rod holding him aloft, a plaza monument.',
      waves: 'A curling cast wave rising to meet him, the sea he falls into.',
      rock: 'A jagged crag he falls past, a hand or foot just brushing it.',
    }),
    sun: noul('Is a gilded sun mounted above him?'),
    span: score('How great are the wings?', ['Modest, arm length', 'Broad as a swan', 'Vast, twice his height']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const H = 1.75;

    // ---- Materials for the chosen medium. ----
    const bronze = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8a5a2e').lerp(new THREE.Color('#4f8a72'), mood.wear * 0.45), metalness: 0.8, roughness: 0.38 });
    const bronzeLight = new THREE.MeshStandardMaterial({ color: new THREE.Color('#a8763c').lerp(new THREE.Color('#5f9a82'), mood.wear * 0.35), metalness: 0.75, roughness: 0.42, side: THREE.DoubleSide });
    const marble = new THREE.MeshStandardMaterial({ color: new THREE.Color('#efebe3').lerp(new THREE.Color('#bdb5a6'), mood.wear * 0.4), roughness: 0.48 });
    const marbleWing = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5, side: THREE.DoubleSide });
    const warmWax = new THREE.Color().setHSL(mix(0.13, 0.08, mood.warmth), 0.9, 0.55);
    const featherPaint = {
      bronze: bronzeLight,
      marble: marbleWing,
      silhouette: new THREE.MeshStandardMaterial({ color: '#25272c', roughness: 0.9, side: THREE.DoubleSide }),
      living: new THREE.MeshStandardMaterial({ color: '#f2ead6', roughness: 0.75, side: THREE.DoubleSide }),
    }[a.medium];
    const waxPaint = {
      bronze: bronze,
      marble: marble,
      silhouette: new THREE.MeshStandardMaterial({ color: warmWax, emissive: warmWax, emissiveIntensity: mix(0.6, 1.1, mood.energy), roughness: 0.4 }),
      living: new THREE.MeshStandardMaterial({ color: '#e8b440', emissive: warmWax, emissiveIntensity: mix(0.15, 0.45, mood.warmth), roughness: 0.25 }),
    }[a.medium];
    const membranePaint = {
      bronze: new THREE.MeshStandardMaterial({ color: new THREE.Color('#7a4e26').lerp(new THREE.Color('#4f8a72'), mood.wear * 0.4), metalness: 0.75, roughness: 0.45, side: THREE.DoubleSide }),
      marble: new THREE.MeshStandardMaterial({ color: '#e6e1d6', roughness: 0.55, side: THREE.DoubleSide }),
      silhouette: new THREE.MeshStandardMaterial({ color: '#1c1e22', roughness: 0.95, side: THREE.DoubleSide }),
      living: new THREE.MeshStandardMaterial({ color: '#e8d49a', roughness: 0.45, side: THREE.DoubleSide, emissive: warmWax, emissiveIntensity: mix(0.05, 0.25, mood.warmth) }),
    }[a.medium];
    const sparPaint = a.medium === 'living' ? new THREE.MeshStandardMaterial({ color: '#8a6238', roughness: 0.8 }) : a.medium === 'silhouette' ? featherPaint : waxPaint;

    // ---- The figure. ----
    const person = figure(s, {
      height: H, build: 'slight', pose: 'standing',
      style: a.medium === 'silhouette' ? 'silhouette' : 'doll',
      face: a.medium === 'living' ? 'dots' : 'blank',
      hair: a.medium === 'silhouette' ? 'none' : 'short',
      skin: a.medium === 'living' ? ['#d9b08c', '#b5805a', '#e8c4a0', '#9a6b4b'][Math.floor(random() * 4)] : undefined,
      hairColor: '#3a2618', top: '#efe6cf', bottom: '#d9b08c', shoes: '#8a5a32', sleeves: 'short',
      mirror: random() < 0.5,
    });
    s.root.add(person.root);
    if (a.medium === 'bronze' || a.medium === 'marble') {
      const stone = a.medium === 'bronze' ? bronze : marble;
      person.root.traverse((node) => { if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).material = stone; });
    }
    if (a.medium === 'living') {
      // The tunic: bottom set to skin above, so add a short skirt at the hips.
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.085, H * 0.12, H * 0.16, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.8, side: THREE.DoubleSide }));
      skirt.position.y = -H * 0.06;
      skirt.castShadow = true;
      person.pelvis.add(skirt);
    }

    // ---- Wings: feathers fanned from a spar along each arm. ----
    const melt = { whole: 0, dripping: 0.3, shedding: 0.6, bare: 0.92 }[a.melt];
    const wingLength = H * mix(0.62, 1.05, a.span);
    const featherMax = H * mix(0.36, 0.56, a.span);
    const sweepAt = (along: number) => mix(0.15, 1.15, along ** 1.6);
    const vane = new THREE.Shape();
    vane.moveTo(0, 0);
    vane.quadraticCurveTo(0.24, 0.22, 0.17, 0.78);
    vane.quadraticCurveTo(0.08, 1.02, 0, 1);
    vane.quadraticCurveTo(-0.12, 0.7, -0.1, 0.3);
    vane.quadraticCurveTo(-0.07, 0.06, 0, 0);
    const featherGeometry = new THREE.ShapeGeometry(vane, 6);
    const drip = new THREE.LatheGeometry([new THREE.Vector2(0.001, 1), new THREE.Vector2(0.18, 0.75), new THREE.Vector2(0.32, 0.3), new THREE.Vector2(0.24, 0.06), new THREE.Vector2(0.001, 0)], 10);
    const wings: { side: Side; group: THREE.Group }[] = [];
    const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), scale = new THREE.Vector3();
    for (const side of ['left', 'right'] as const) {
      const sign = side === 'left' ? 1 : -1;
      const shoulder = person.joints.shoulders[side];
      const wing = new THREE.Group();
      wing.position.z = -H * 0.025;
      shoulder.add(wing);
      // The spar: a rod along the arm and on past the hand.
      const spar = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.009, H * 0.014, wingLength, 8), sparPaint);
      spar.position.y = -wingLength / 2;
      spar.castShadow = true;
      wing.add(spar);
      const placed: THREE.Matrix4[] = [];
      const rows = [{ count: 20, length: 0.28, z: 0.018 }, { count: 16, length: 0.52, z: 0.006 }, { count: 14, length: 0.78, z: -0.006 }, { count: 10, length: 1, z: -0.018 }];
      for (const [row, spec] of rows.entries()) {
        for (let i = 0; i < spec.count; i++) {
          const t = (i + 0.5) / spec.count;
          // Primaries live at the tip; secondaries along the forearm; coverts all along.
          const along = row === 3 ? mix(0.6, 1, t) : row === 2 ? mix(0.15, 0.8, t) : row === 1 ? mix(0.06, 0.9, t) : mix(0.03, 0.96, t);
          if (random() < melt * (row === 0 ? 1.05 : 0.85) && !(melt > 0.9 && random() < 0.12)) continue;
          const length = featherMax * spec.length * mix(0.75, 1.15, along) * mix(0.9, 1.1, random()) * (row === 3 ? mix(0.8, 1.05, t) : 1);
          // Fan from pointing in toward the body near the shoulder to sweeping along the arm at the tip.
          const sweep = sweepAt(along) + jitter(0.08) + (melt > 0.2 ? jitter(melt * 0.6) : 0);
          const direction = new THREE.Vector3(-sign * Math.cos(sweep), -Math.sin(sweep), -0.12).normalize();
          q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          // The vane already lies in the wing's plane; a little twist keeps it from looking stamped.
          q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), jitter(0.5)));
          matrix.compose(new THREE.Vector3(jitter(0.01), -wingLength * along, spec.z * H), q, scale.set(length * 0.9, length, length));
          placed.push(matrix.clone());
        }
      }
      // The wax sheet the feathers are set in: a filled wing outline, ragged and holed as it melts.
      if (melt < 0.9) {
        const reach = melt < 0.5 ? 1 : 0.62;
        const outline = new THREE.Shape();
        outline.moveTo(0, 0);
        outline.lineTo(0, -wingLength * reach);
        for (let k = 0; k <= 16; k++) {
          const along = reach * (1 - k / 16);
          const sweep = sweepAt(along);
          const length = featherMax * mix(0.75, 1.15, along) * (along > 0.6 ? 0.82 : 0.62) * (1 - melt * 0.35 * random());
          outline.lineTo(-sign * Math.cos(sweep) * length, -wingLength * along - Math.sin(sweep) * length);
        }
        outline.lineTo(-sign * featherMax * 0.25, 0);
        const sheet = new THREE.ShapeGeometry(outline, 4);
        const position = sheet.attributes.position;
        for (let i = 0; i < position.count; i++) position.setZ(i, -0.12 * Math.abs(position.getX(i)) - 0.03 * H);
        sheet.computeVertexNormals();
        const membrane = new THREE.Mesh(sheet, membranePaint);
        membrane.castShadow = membrane.receiveShadow = true;
        wing.add(membrane);
      }
      const feathers = new THREE.InstancedMesh(featherGeometry, featherPaint, Math.max(1, placed.length));
      placed.forEach((m, i) => feathers.setMatrixAt(i, m));
      if (!placed.length) feathers.setMatrixAt(0, new THREE.Matrix4().makeScale(0.001, 0.001, 0.001));
      feathers.instanceMatrix.needsUpdate = true;
      feathers.computeBoundingBox();
      feathers.computeBoundingSphere();
      feathers.castShadow = feathers.receiveShadow = true;
      wing.add(feathers);
      if (a.melt === 'bare') {
        // Bare ribs where the feathers were.
        for (let i = 0; i < 6; i++) {
          const along = mix(0.15, 0.95, i / 5);
          const sweep = mix(0.15, 1.15, along ** 1.6);
          const rib = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.004, H * 0.006, featherMax * 0.7, 5), sparPaint);
          const direction = new THREE.Vector3(-sign * Math.cos(sweep), -Math.sin(sweep), -0.25).normalize();
          rib.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
          rib.position.set(0, -wingLength * along, 0).addScaledVector(direction, featherMax * 0.35);
          rib.castShadow = true;
          wing.add(rib);
        }
      }
      wings.push({ side, group: wing });
    }

    // ---- The fall: custom joints, then settle onto the ground. ----
    const { joints } = person;
    const set = (group: THREE.Object3D, x: number, y: number, z: number) => group.rotation.set(x, y, z);
    // Poses turn mostly in the picture plane, so the wings stay open to the viewer.
    const tip = random() < 0.5 ? -1 : 1;
    if (a.fall === 'plunging') {
      joints.body.rotation.set(0.25, 0, tip * mix(2.3, 2.7, random()));
      set(joints.shoulders.left, 0.3, 0, 2.5); set(joints.shoulders.right, 0.2, 0, -2.2);
      set(joints.elbows.left, -0.15, 0, 0); set(joints.elbows.right, -0.3, 0, 0);
      set(joints.hips.left, 0.2, 0, 0.25); set(joints.hips.right, -0.3, 0, -0.1);
      set(joints.knees.left, 1.0, 0, 0); set(joints.knees.right, 0.25, 0, 0);
      set(joints.neck, -0.5, 0, 0);
      joints.spine.rotation.x = -0.2;
    } else if (a.fall === 'tumbling') {
      joints.body.rotation.set(-0.3, 0, tip * mix(1.1, 1.5, random()));
      set(joints.shoulders.left, -0.3, 0, 2.2); set(joints.shoulders.right, -0.5, 0, -0.9);
      set(joints.elbows.left, -0.3, 0, 0); set(joints.elbows.right, -0.8, 0.3, 0);
      set(joints.hips.left, -0.6, 0, 0.45); set(joints.hips.right, -0.15, 0, -0.3);
      set(joints.knees.left, 1.1, 0, 0); set(joints.knees.right, 0.4, 0, 0);
      set(joints.neck, -0.4, 0.3, 0);
      joints.spine.rotation.x = -0.15;
    } else if (a.fall === 'reaching') {
      joints.body.rotation.set(-0.2, 0, tip * mix(0.5, 0.75, random()));
      set(joints.shoulders.left, -0.2, 0, 2.85); set(joints.shoulders.right, -0.2, 0, -1.35);
      set(joints.elbows.left, -0.1, 0, 0); set(joints.elbows.right, -0.35, 0, 0);
      set(joints.hips.left, 0.35, 0, 0.18); set(joints.hips.right, 0.1, 0, -0.12);
      set(joints.knees.left, 1.25, 0, 0); set(joints.knees.right, 0.55, 0, 0);
      set(joints.neck, -0.6, 0.3, 0);
    } else {
      joints.body.rotation.set(0.5, 0, tip * mix(0.3, 0.6, random()));
      joints.spine.rotation.x = 0.55;
      set(joints.shoulders.left, -1.2, 0, 0.55); set(joints.shoulders.right, -1.0, 0, -0.65);
      set(joints.elbows.left, -1.6, 0.6, 0); set(joints.elbows.right, -1.7, -0.6, 0);
      set(joints.hips.left, -1.55, 0, 0.12); set(joints.hips.right, -1.35, 0, -0.1);
      set(joints.knees.left, 2.0, 0, 0); set(joints.knees.right, 1.8, 0, 0);
      set(joints.neck, 0.6, 0.2, 0);
    }
    for (const side of ['left', 'right'] as const) joints.ankles[side].rotation.x = 0.6;
    person.settle();

    // ---- Wax drips: beads and runs hanging straight down from each spar, and drops already falling. ----
    s.root.updateMatrixWorld(true);
    const dripCount = Math.round({ whole: 4, dripping: 12, shedding: 9, bare: 6 }[a.melt] * mix(0.8, 1.3, mood.density));
    for (const { group } of wings) {
      const toLocal = group.getWorldQuaternion(new THREE.Quaternion()).invert();
      const down = new THREE.Vector3(0, -1, 0).applyQuaternion(toLocal);
      // The teardrop's narrow end (+y) points up to the spar; the bead hangs below.
      const hang = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), down.clone().negate());
      const drips = new THREE.InstancedMesh(drip, waxPaint, dripCount);
      for (let i = 0; i < dripCount; i++) {
        const along = mix(0.05, 0.95, random());
        const run = H * mix(0.03, a.melt === 'dripping' ? 0.13 : 0.07, random() ** 1.5);
        const at = new THREE.Vector3(jitter(0.02), -wingLength * along, jitter(0.02)).addScaledVector(down, run);
        matrix.compose(at, hang, scale.set(H * 0.035, run, H * 0.035));
        drips.setMatrixAt(i, matrix);
      }
      drips.instanceMatrix.needsUpdate = true;
      drips.computeBoundingBox();
      drips.castShadow = true;
      group.add(drips);
    }

    // ---- Feathers already shed, drifting above and around him. ----
    s.root.updateMatrixWorld(true);
    const body = new THREE.Box3().setFromObject(person.root);
    const size = body.getSize(new THREE.Vector3()), mid = body.getCenter(new THREE.Vector3());
    const shedCount = Math.round({ whole: 3, dripping: 8, shedding: 26, bare: 18 }[a.melt] * mix(0.7, 1.3, mood.density));
    const shed = new THREE.InstancedMesh(featherGeometry, featherPaint, shedCount);
    const shedData = Array.from({ length: shedCount }, () => ({
      at: new THREE.Vector3(mid.x + jitter(size.x * 0.95), body.max.y - size.y * 0.45 + random() * size.y * 0.6, mid.z + jitter(size.z * 0.8)),
      spin: new THREE.Euler(random() * 6, random() * 6, random() * 6),
      length: featherMax * mix(0.3, 0.8, random()),
      rate: mix(0.3, 1, random()),
    }));
    const placeShed = (time: number) => {
      shedData.forEach((feather, i) => {
        const e = new THREE.Euler(feather.spin.x + time * 0.4 * feather.rate, feather.spin.y + time * 0.3 * feather.rate, feather.spin.z);
        const bob = new THREE.Vector3(Math.sin(time * 0.5 * feather.rate + i) * 0.05, Math.sin(time * 0.3 + i) * 0.04, 0);
        shed.setMatrixAt(i, matrix.compose(feather.at.clone().add(bob), q.setFromEuler(e), scale.set(feather.length * 0.9, feather.length, feather.length)));
      });
      shed.instanceMatrix.needsUpdate = true;
    };
    placeShed(0);
    shed.computeBoundingBox();
    shed.castShadow = true;
    s.root.add(shed);

    // ---- What holds him up. ----
    const stone = s.material(a.medium === 'marble' ? '#cfc8bb' : '#b9b2a4', { roughness: 0.85 });
    const top = (lift: number) => { person.root.position.y = lift; shed.position.y = lift; s.root.updateMatrixWorld(true); };
    let sunAnchor = body.max.y + 0.4;
    if (a.mount === 'pedestal') {
      const plinthH = 1.0;
      s.box([0.95, plinthH, 0.95], [mid.x, plinthH / 2, mid.z], stone);
      s.box([1.1, 0.1, 1.1], [mid.x, 0.05, mid.z], stone);
      s.box([1.05, 0.08, 1.05], [mid.x, plinthH - 0.04, mid.z], stone);
      const plaque = s.label(a.medium === 'marble' ? 'ΙΚΑΡΟΣ' : 'ICARUS', 0.55, 0.13, [mid.x, plinthH * 0.6, mid.z + 0.48], a.medium === 'marble' ? '#4a463e' : '#2c1e10', a.medium === 'marble' ? '#e6e0d4' : '#b8893e');
      void plaque;
      top(plinthH + 0.35);
      const pelvis = person.pelvis.getWorldPosition(new THREE.Vector3());
      s.rod([mid.x, plinthH, mid.z], [pelvis.x, pelvis.y, pelvis.z], 0.035, a.medium === 'marble' ? marble : bronze);
      sunAnchor = body.max.y + plinthH + 0.75;
    } else if (a.mount === 'waves') {
      // One great curling wave, cast or real, rising to meet him.
      const sea = a.medium === 'bronze' ? bronze : a.medium === 'marble' ? marble : new THREE.MeshStandardMaterial({ color: a.medium === 'silhouette' ? '#2a2d34' : '#2c6c84', roughness: 0.3, metalness: 0.1 });
      const curl = new THREE.Shape();
      curl.moveTo(-1.0, 0);
      curl.quadraticCurveTo(-0.45, 0.12, -0.05, 0.6);
      curl.quadraticCurveTo(0.2, 1.05, 0.62, 0.92);
      curl.quadraticCurveTo(0.88, 0.8, 0.7, 0.58);
      curl.quadraticCurveTo(0.52, 0.72, 0.4, 0.55);
      curl.quadraticCurveTo(0.5, 0.22, 1.0, 0);
      curl.lineTo(-1.0, 0);
      // Put the crest under whatever part of him is lowest: his head, a hand or a wing tip.
      let lowest = new THREE.Vector3(mid.x, Infinity, mid.z);
      person.root.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
        const box = new THREE.Box3().setFromObject(mesh);
        if (box.min.y < lowest.y) lowest = new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
      });
      const wave = s.mesh(new THREE.ExtrudeGeometry(curl, { depth: 0.9, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 16 }), sea, [lowest.x - 0.5, 0, lowest.z - 0.45]);
      wave.scale.set(1.1, 1, 1);
      if (a.medium === 'living') {
        const foam = new THREE.MeshStandardMaterial({ color: '#eef4f2', roughness: 0.6 });
        for (let i = 0; i < 5; i++) s.ball([0.09, 0.07, 0.09], [lowest.x + 0.18 + jitter(0.1), 0.86 + jitter(0.08), lowest.z - 0.4 + i * 0.2], foam, 10);
      }
      top(Math.max(0, 0.97 - Math.max(0, lowest.y - body.min.y)));
    } else if (a.mount === 'rock') {
      // A tall jagged crag rising beside him; he falls past its top.
      const lift = 0.9;
      const tall = lift + size.y * 0.6;
      const geometry = new THREE.CylinderGeometry(0.12, 0.62, tall, 7, 6);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const y = position.getY(i), k = mix(0.75, 1.3, random());
        position.setXYZ(i, position.getX(i) * k + jitter(0.08), y + (y > tall / 2 - 0.01 ? jitter(0.25) : jitter(0.06)), position.getZ(i) * k + jitter(0.08));
      }
      geometry.computeVertexNormals();
      const offset = (random() < 0.5 ? -1 : 1) * (Math.min(size.x, 2.2) * 0.32 + 0.3);
      s.mesh(geometry, s.material(a.medium === 'marble' ? '#d7d1c4' : '#6e675e', { flatShading: true, roughness: 0.95 }), [mid.x + offset, tall / 2, mid.z - 0.15]);
      top(lift);
    }
    if (a.sun) {
      const gilt = new THREE.MeshStandardMaterial({ color: '#e0b040', metalness: 0.9, roughness: 0.25, emissive: '#7a4a08', emissiveIntensity: mix(0.2, 0.6, mood.cheer) });
      const sx = mid.x + size.x * 0.25, sz = mid.z - 0.2;
      const disc = s.cylinder(0.28, 0.28, 0.06, [sx, sunAnchor + 0.3, sz], gilt, 32);
      disc.rotation.x = Math.PI / 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const ray = s.cylinder(0, 0.06, i % 2 ? 0.22 : 0.34, [sx + Math.cos(angle) * 0.4, sunAnchor + 0.3 + Math.sin(angle) * 0.4, sz], gilt, 6);
        ray.rotation.z = angle - Math.PI / 2;
      }
      if (a.mount === 'pedestal') s.rod([mid.x - 0.4, 1.0, mid.z - 0.4], [sx, sunAnchor + 0.3, sz - 0.04], 0.02, gilt);
    }

    const pace = mix(0.2, 1.2, mood.energy);
    return s.finish({
      footprint: a.mount === 'pedestal' ? 0.6 : a.mount === 'free' ? Math.max(0.5, Math.min(size.x, size.z) * 0.4) : 0.9,
      update: (dt, time) => {
        person.update(dt, time);
        placeShed(time * pace);
      },
    });
  },
});
