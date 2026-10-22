import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);

/** Diamond netting: opaque strings over a faint gauze, tiling in both directions. */
function netting() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(236,236,236,1)';
  ctx.lineWidth = 7;
  for (let i = -4; i <= 8; i++) {
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 + 256, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64 - 256, 256); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Meandering grooves for a brain coral. */
function grooves(base: string, line: string, random: () => number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = line;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (let n = 0; n < 26; n++) {
    let x = random() * 256, y = random() * 256, heading = random() * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 16; k++) {
      heading += (random() - 0.5) * 1.6;
      x += Math.cos(heading) * 9; y += Math.sin(heading) * 9;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    catch: choice('What is in the net?', {
      empty: 'Nothing yet, the bag hanging slack and empty.',
      jelly: 'One fat glowing jellyfish in the bag, its tentacles dangling out through the mesh.',
      swarm: 'A bag crammed with several small glowing jellies, like a bag of sweets.',
      escaped: 'The jellyfish has slipped out and floats just above the empty hoop, unbothered.',
      boot: 'An old boot, caught instead of anything worth catching.',
    }),
    net: choice('What colour is the netting?', {
      white: 'Plain white string mesh.',
      green: 'Faded leaf-green mesh.',
      pink: 'Candy pink mesh.',
      blue: 'Pale sky-blue mesh.',
      yellow: 'Sunny yellow mesh, a toy-shop net.',
    }),
    pole: choice('What is the handle made of?', {
      bamboo: 'Knotted bamboo cane.',
      wood: 'A plain varnished broom-handle of wood.',
      metal: 'A shiny aluminium pole with a rubber grip.',
      red: 'A red-painted handle like a seaside toy.',
    }),
    handle: score('How long is the handle?', ['Just long enough to clear the rock', 'Twice the height of a child', 'An absurdly long pole, its hoop wobbling far overhead']),
    second: noul('Is a second, smaller net leaning beside it?'),
    support: choice('What is it leaning on?', {
      rock: 'A lumpy grey boulder.',
      coral: 'A round pink brain coral with meandering grooves.',
      crate: 'A wooden fish crate turned on its end.',
    }),
    extras: choice('What else has been left beside it?', {
      nothing: 'Nothing, just the net.',
      jar: 'A glass jar with holes punched in the red lid, ready for the catch.',
      bucket: 'A little tin bucket.',
      hat: 'A straw hat with a red ribbon dropped on the sand.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const netColour = new THREE.Color({ white: '#f4f1e8', green: '#7fbf6a', pink: '#ff7fb2', blue: '#7fc4f0', yellow: '#ffd23a' }[a.net]);
    netColour.lerp(new THREE.Color('#9a968c'), (1 - mood.cheer) * 0.25 + mood.wear * 0.15);
    const glowStrength = mix(0.6, 1.6, 1 - Math.sin(mood.daylight * Math.PI) * 0.6) * mix(0.8, 1.15, mood.cheer);

    // The support stands at the origin.
    let support: THREE.Mesh;
    if (a.support === 'rock') {
      const geometry = new THREE.IcosahedronGeometry(1, 1);
      const position = geometry.attributes.position;
      // The icosahedron repeats each corner per face: give every shared corner the same bump.
      const bumps = new Map<string, number>();
      for (let i = 0; i < position.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(position, i);
        const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
        if (!bumps.has(key)) bumps.set(key, 0.85 + random() * 0.3);
        v.multiplyScalar(bumps.get(key)!);
        v.set(v.x * 0.55, v.y * 0.46 + 0.36, v.z * 0.48);
        v.y = Math.max(0, v.y);
        position.setXYZ(i, v.x, v.y, v.z);
      }
      geometry.computeVertexNormals();
      support = s.mesh(geometry, s.material('#8a8f94', { roughness: 0.95, flatShading: true }));
      support.rotation.y = random() * Math.PI;
    } else if (a.support === 'coral') {
      const geometry = new THREE.SphereGeometry(1, 28, 16);
      const position = geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(position, i);
        position.setXYZ(i, v.x * 0.52, Math.max(0, v.y * 0.5 + 0.3), v.z * 0.5);
      }
      geometry.computeVertexNormals();
      support = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: grooves('#f2909e', '#b9506a', random), roughness: 0.85 }));
    } else {
      const plank = s.material('#a5824f', { roughness: 0.85 });
      support = s.box([0.5, 0.78, 0.42], [0, 0.39, 0], s.material('#6b5233', { roughness: 0.9 }));
      for (const y of [0.1, 0.39, 0.68]) s.box([0.52, 0.18, 0.44], [0, y, 0], plank);
      s.label('FRESH FISH', 0.4, 0.12, [0, 0.39, 0.222], '#2f4f7a', '#d9c7a0');
      support.rotation.y = 0;
    }
    support.updateMatrixWorld(true);

    // A pole leaning from the sand onto the support: find the steepest line from the butt that touches it.
    const caster = new THREE.Raycaster();
    const lean = (butt: THREE.Vector3, heading: THREE.Vector3) => {
      const direction = new THREE.Vector3();
      for (let degrees = 84; degrees > 20; degrees -= 1) {
        const e = degrees * Math.PI / 180;
        direction.copy(heading).multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0)).normalize();
        caster.set(butt, direction);
        caster.far = 3;
        const hit = caster.intersectObject(support, false)[0];
        if (hit) {
          // Lift by the pole's radius so it rests on the surface rather than in it.
          const lifted = e + 0.035;
          return heading.clone().multiplyScalar(Math.cos(lifted)).add(new THREE.Vector3(0, Math.sin(lifted), 0)).normalize();
        }
      }
      return heading.clone().multiplyScalar(Math.cos(0.9)).add(new THREE.Vector3(0, Math.sin(0.9), 0)).normalize();
    };

    const poleTint = { bamboo: '#c9b26a', wood: '#a87a48', metal: '#c9ced3', red: '#d2402e' }[a.pole];
    const polePaint = s.material(poleTint, a.pole === 'metal' ? { metalness: 0.75, roughness: 0.3 } : { roughness: 0.55 });
    const knot = s.material(new THREE.Color(poleTint).multiplyScalar(0.72).getStyle(), { roughness: 0.6 });
    const grip = s.material('#26282b', { roughness: 0.9 });
    const hoopPaint = s.material('#8c9196', { metalness: 0.6, roughness: 0.35 });
        const mesh = netting();
    const gauzeFor = (tint: THREE.Color) => new THREE.MeshStandardMaterial({ color: tint, map: mesh, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.9 });
    const jellyTints = ['#ff4f9a', '#3fc8ff', '#b46bff', '#ffb02e', '#2fe8b0'];

    const heads: { group: THREE.Group; axis: THREE.Vector3; phase: number }[] = [];
    const jellies: { mesh: THREE.Object3D; base: THREE.Vector3; phase: number; float: boolean }[] = [];
    const makeJelly = (at: THREE.Vector3, size: number, tone: string, float: boolean, strands: number, strandLength: number) => {
      const glow = new THREE.MeshStandardMaterial({ color: tone, emissive: tone, emissiveIntensity: 0.9 * glowStrength, transparent: true, opacity: 0.92, roughness: 0.3 });
      const group = new THREE.Group();
      const bell = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 9, 0, Math.PI * 2, 0, Math.PI * 0.55), glow);
      bell.scale.y = 0.85;
      bell.castShadow = true;
      group.add(bell);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 10, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tone, emissiveIntensity: 1.2 * glowStrength, roughness: 0.4 }));
      inner.position.y = size * 0.2;
      group.add(inner);
      for (let t = 0; t < strands; t++) {
        const angle = t / strands * Math.PI * 2 + random() * 0.4;
        const r = size * (0.35 + random() * 0.45);
        const points = Array.from({ length: 5 }, (_, k) => new THREE.Vector3(
          Math.cos(angle) * r + Math.sin(k * 1.7 + t) * size * 0.12,
          -k / 4 * strandLength * (0.75 + random() * 0.4),
          Math.sin(angle) * r + Math.cos(k * 1.3 + t) * size * 0.12));
        const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, Math.max(0.004, size * 0.045), 5), glow);
        group.add(strand);
      }
      group.position.copy(at);
      s.root.add(group);
      jellies.push({ mesh: group, base: at.clone(), phase: random() * Math.PI * 2, float });
      return group;
    };

    const length = mix(0.05, 1.4, a.handle);
    const bounds = new THREE.Box3().setFromObject(support);
    const buildNet = (butt: THREE.Vector3, heading: THREE.Vector3, size: number, extra: number, catchKind: typeof a.catch, tint: THREE.Color) => {
      const d = lean(butt, heading);
      const R = 0.26 * size;
      // The handle is always long enough to carry the hoop clear past the far side of the support.
      let far = 0;
      for (const x of [bounds.min.x, bounds.max.x]) for (const z of [bounds.min.z, bounds.max.z]) far = Math.max(far, x * heading.x + z * heading.z);
      const level = Math.hypot(d.x, d.z);
      const poleLength = (far + 0.1 * size - (butt.x * heading.x + butt.z * heading.z)) / Math.max(level, 0.2) + extra;
      const tip = butt.clone().addScaledVector(d, poleLength);
      const radius = 0.021 * size;
      s.rod(butt.toArray() as P3, tip.toArray() as P3, radius, polePaint, radius * 0.92);
      // Grip, knots or a ferrule along the handle.
      const along = (f: number) => butt.clone().addScaledVector(d, poleLength * f).toArray() as P3;
      s.rod(butt.toArray() as P3, along(0.12), radius * 1.3, a.pole === 'bamboo' ? knot : grip);
      if (a.pole === 'bamboo') for (const f of [0.3, 0.5, 0.7, 0.88]) {
        const ring = s.cylinder(radius * 1.25, radius * 1.25, 0.02 * size, along(f), knot, 10);
        ring.quaternion.setFromUnitVectors(UP, d);
      }
      s.rod(along(0.97), tip.toArray() as P3, radius * 1.25, hoopPaint);

      // The hoop carries on from the handle: its plane holds the handle and a level line across it.
      const across = new THREE.Vector3().crossVectors(d, UP).normalize();
      const twist = (random() - 0.5) * 0.7;
      const facing = new THREE.Vector3().crossVectors(across, d).normalize();
      // Rotate the hoop about the handle a little so no two nets hang alike.
      const side = across.clone().applyAxisAngle(d, twist);
      const normal = new THREE.Vector3().crossVectors(d, side).normalize();
      void facing;
      const centre = tip.clone().addScaledVector(d, R);
      const head = new THREE.Group();
      head.position.copy(tip);
      s.root.add(head);
      const local = (p: THREE.Vector3) => p.clone().sub(tip);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.012 * size, 8, 48), hoopPaint);
      hoop.position.copy(local(centre));
      hoop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      hoop.castShadow = true;
      head.add(hoop);
      const band = new THREE.Mesh(new THREE.TorusGeometry(R, 0.022 * size, 6, 48), s.material(tint.clone().multiplyScalar(0.9).getStyle(), { roughness: 0.9 }));
      band.position.copy(hoop.position);
      band.quaternion.copy(hoop.quaternion);
      band.castShadow = true;
      head.add(band);

      // The bag: a sock of netting from the hoop, falling away from the mouth and down under its own weight.
      const hang = normal.y > 0 ? normal.clone().negate() : normal.clone();
      const bagLength = 0.62 * size * (catchKind === 'swarm' || catchKind === 'jelly' ? 1.08 : 1);
      const rings = 16, around = 28;
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const spine = centre.clone();
      const tangent = hang.clone();
      const spinePoints: THREE.Vector3[] = [];
      const turn = new THREE.Quaternion();
      for (let i = 0; i <= rings; i++) {
        const f = i / rings;
        if (i > 0) {
          tangent.copy(hang).lerp(new THREE.Vector3(0, -1, 0), Math.min(1, f * 1.6)).normalize();
          spine.addScaledVector(tangent, bagLength / rings);
        }
        spinePoints.push(spine.clone());
        turn.setFromUnitVectors(hang, tangent);
        const u = d.clone().applyQuaternion(turn), v = side.clone().applyQuaternion(turn);
        const swell = catchKind === 'swarm' ? 1 + Math.sin(f * Math.PI) * 0.12 : 1;
        const r = R * Math.max(0.02, Math.cos(f * Math.PI * 0.5)) ** 0.55 * swell;
        for (let j = 0; j <= around; j++) {
          const angle = j / around * Math.PI * 2;
          const p = spine.clone().addScaledVector(u, Math.cos(angle) * r).addScaledVector(v, Math.sin(angle) * r);
          const q = local(p);
          positions.push(q.x, q.y, q.z);
          uvs.push(j / around * 3, f * 2);
          if (i < rings && j < around) {
            const k = i * (around + 1) + j;
            indices.push(k, k + around + 1, k + 1, k + 1, k + around + 1, k + around + 2);
          }
        }
      }
      const bagGeometry = new THREE.BufferGeometry();
      bagGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      bagGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      bagGeometry.setIndex(indices);
      bagGeometry.computeVertexNormals();
      const bag = new THREE.Mesh(bagGeometry, gauzeFor(tint));
      bag.renderOrder = 2;
      head.add(bag);
      // A few seams give the bag its shape in every pass.
      const seamPaint = s.material(tint.getStyle(), { roughness: 0.9 });
      for (let k = 0; k < 4; k++) {
        const angle = k / 4 * Math.PI * 2 + 0.4;
        const seam: THREE.Vector3[] = [];
        for (let i = 0; i <= rings; i += 2) {
          const f = i / rings;
          const t = i === 0 ? hang : spinePoints[i].clone().sub(spinePoints[i - 1]).normalize();
          turn.setFromUnitVectors(hang, t);
          const u = d.clone().applyQuaternion(turn), v = side.clone().applyQuaternion(turn);
          const r = R * Math.max(0.02, Math.cos(f * Math.PI * 0.5)) ** 0.55 * 1.01;
          seam.push(local(spinePoints[i].clone().addScaledVector(u, Math.cos(angle) * r).addScaledVector(v, Math.sin(angle) * r)));
        }
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(seam), 16, 0.005 * size, 4), seamPaint);
        head.add(mesh);
      }
      heads.push({ group: head, axis: d.clone(), phase: random() * Math.PI * 2 });

      // The catch.
      const inside = spinePoints[Math.round(rings * 0.55)].clone();
      if (catchKind === 'jelly') {
        const jelly = makeJelly(inside.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.15 * size, jellyTints[Math.floor(random() * jellyTints.length)], false, 7, 0.5 * size);
        head.attach(jelly);
      }
      if (catchKind === 'swarm') {
        const n = 4 + Math.floor(random() * 3);
        for (let i = 0; i < n; i++) {
          const f = 0.35 + random() * 0.45;
          const at = spinePoints[Math.round(rings * f)].clone().add(new THREE.Vector3((random() - 0.5) * R * 0.7, (random() - 0.2) * R * 0.4, (random() - 0.5) * R * 0.7));
          head.attach(makeJelly(at, (0.075 + random() * 0.035) * size, jellyTints[i % jellyTints.length], false, 4, 0.16 * size));
        }
      }
      if (catchKind === 'escaped') {
        makeJelly(centre.clone().add(new THREE.Vector3(0.12 * size, R + 0.32 * size, 0.05 * size)), 0.14 * size, jellyTints[Math.floor(random() * jellyTints.length)], true, 7, 0.38 * size);
      }
      if (catchKind === 'boot') {
        const leather = s.material('#5a3c26', { roughness: 0.9 });
        const boot = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065 * size, 0.075 * size, 0.24 * size, 12), leather);
        const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * size, 0.14 * size, 4, 10), leather);
        foot.rotation.x = Math.PI / 2;
        foot.position.set(0, -0.12 * size, 0.07 * size);
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.13 * size, 0.025 * size, 0.27 * size), s.material('#2a221c'));
        sole.position.set(0, -0.18 * size, 0.07 * size);
        shaft.castShadow = foot.castShadow = sole.castShadow = true;
        boot.add(shaft, foot, sole);
        boot.position.copy(local(inside));
        boot.rotation.set(0.5 + random() * 0.4, random() * Math.PI, 0.6);
        head.add(boot);
      }
      return { d, tip };
    };

    // The main net leans across the support from the left, its hoop up on the right.
    const swing = (random() - 0.5) * 0.5;
    const heading = new THREE.Vector3(Math.cos(swing), 0, Math.sin(swing) * 0.6 + 0.12).normalize();
    const reach = a.support === 'crate' ? 0.62 : 0.72;
    const butt = heading.clone().multiplyScalar(-reach - 0.18 * random()).add(new THREE.Vector3(0, 0.02, 0.08));
    const first = buildNet(butt, heading, 1, length, a.catch, netColour);
    if (a.second) {
      const other = new THREE.Vector3(-0.8, 0, -0.5 - random() * 0.3).normalize();
      const tint = new THREE.Color(['#ffd23a', '#7fc4f0', '#ff7fb2', '#7fbf6a'][Math.floor(random() * 4)]);
      buildNet(other.clone().multiplyScalar(-0.92).add(new THREE.Vector3(0, 0.02, 0)), other, 0.72, 0.05 + random() * 0.2, 'empty', tint);
    }
    void first;

    // What else was left here.
    if (a.extras === 'jar') {
      const glass = new THREE.MeshStandardMaterial({ color: '#d8eef2', transparent: true, opacity: 0.35, roughness: 0.08, depthWrite: false });
      const jar = s.cylinder(0.085, 0.085, 0.2, [-0.3, 0.1, 0.52], glass, 18);
      jar.castShadow = false;
      s.cylinder(0.075, 0.08, 0.02, [-0.3, 0.01, 0.52], s.material('#cfe3e6', { roughness: 0.2 }), 18);
      s.cylinder(0.092, 0.092, 0.035, [-0.3, 0.215, 0.52], s.material('#c8352b', { roughness: 0.5 }), 18);
      s.ring(0.088, 0.012, [-0.3, 0.19, 0.52], s.material('#cfe3e6', { roughness: 0.2 })).rotation.x = Math.PI / 2;
    }
    if (a.extras === 'bucket') {
      const tin = s.material('#b9c2c6', { metalness: 0.6, roughness: 0.35 });
      s.lathe([[0, 0], [0.12, 0], [0.155, 0.24], [0.16, 0.245], [0, 0.245]], tin, [-0.32, 0, 0.5]);
      s.ring(0.157, 0.008, [-0.32, 0.245, 0.5], tin).rotation.x = Math.PI / 2;
      const handle = s.ring(0.15, 0.006, [-0.32, 0.245, 0.5], s.material('#6a6f73', { metalness: 0.6 }), Math.PI);
      handle.rotation.set(0.5, 0, 0);
      s.ring(0.156, 0.02, [-0.32, 0.12, 0.5], s.material('#2f7fd0', { roughness: 0.5 })).rotation.x = Math.PI / 2;
    }
    if (a.extras === 'hat') {
      const straw = s.material('#e0c070', { roughness: 0.9 });
      const hat = new THREE.Group();
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.015, 28), straw);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 20), straw);
      crown.position.y = 0.055;
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.122, 0.03, 20), s.material('#d2402e'));
      ribbon.position.y = 0.022;
      brim.castShadow = crown.castShadow = true;
      hat.add(brim, crown, ribbon);
      hat.position.set(-0.3, 0.008, 0.55);
      hat.rotation.set(-0.06, random() * Math.PI, 0.05);
      s.root.add(hat);
    }

    const speed = mix(0.25, 1.5, mood.energy);
    const swayAmount = 0.02 + mood.energy * 0.05;
    return s.finish({

      update: (_dt, time) => {
        for (const head of heads) {
          head.group.quaternion.setFromAxisAngle(head.axis, Math.sin(time * 0.9 * speed + head.phase) * swayAmount);
        }
        for (const jelly of jellies) {
          const pulse = Math.sin(time * 2.2 * speed + jelly.phase);
          jelly.mesh.scale.set(1 + pulse * 0.06, 1 - pulse * 0.08, 1 + pulse * 0.06);
          if (jelly.float) jelly.mesh.position.y = jelly.base.y + Math.sin(time * 0.8 * speed + jelly.phase) * 0.06;
        }
      },
    });
  },
});
