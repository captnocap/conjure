import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';
import { blob, glow, hazePaint, limb, makeNoise, tint, vec } from './cosmos';

const LEAKS = {
  amber: 'Deep amber-orange, like a coal seen through a cracked stove door.',
  rose: 'Soft rose-pink, tender and fleshy.',
  gold: 'Pale gold going to white, a clean sunrise.',
  teal: 'Unearthly teal-green, cold and strange.',
  violet: 'Ultraviolet lilac, electric and a little dangerous.',
} as const;
const LEAK: Record<keyof typeof LEAKS, string> = { amber: '#ff8a2b', rose: '#ff6f8f', gold: '#ffd257', teal: '#35d8c2', violet: '#a97bff' };

export default defineThing({
  questions: {
    hatched: score('How far has the star hatched from its shell?', [
      'Sealed: only hairline cracks glow',
      'Cracked open in several places',
      'Half the shell torn away',
      'Almost free, a few rags of shell left',
    ]),
    leak: choice('What colour is the light leaking out?', LEAKS),
    shell: choice('What shape is the dust shell?', {
      egg: 'A tall smooth egg.',
      orb: 'A lumpy round ball, like a clod of soot.',
      teardrop: 'A teardrop drawn up into a wispy point, like a seed or a flame.',
      tattered: 'A ragged ball trailing long torn streamers to one side.',
    }),
    siblings: choice('Who is inside the cocoon?', {
      single: 'One star, alone.',
      twins: 'Twin stars of equal size sharing one shell.',
      unequal: 'One large star and a tiny companion tucked against it.',
    }),
    doing: choice('What is the newborn doing right now?', {
      sleeping: 'Sleeping: a steady, dim, private glow.',
      stirring: 'Stirring: shafts of light sweep out through the gaps.',
      kicking: 'Kicking: two thin bright jets stab out of opposite sides.',
      emerging: 'Emerging: pieces of shell are being blown outward and tumble away.',
    }),
    ring: noul('Is a dark ring of infalling dust still circling its waist?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const noise = makeNoise(context.seed);
    const hatched = clamp01(a.hatched * 0.9 + mood.wear * 0.1);
    const leak = new THREE.Color(LEAK[a.leak]);
    const white = new THREE.Color('#ffffff');
    const bright = mix(0.75, 1, mood.cheer);
    const radius = 1.25;
    const stretch = { egg: vec(0.92, 1.3, 0.92), orb: vec(1.05, 1, 1.05), teardrop: vec(0.95, 1.05, 0.95), tattered: vec(1.05, 1, 1) }[a.shell];
    if (a.siblings === 'twins') stretch.x *= 1.3;
    const axis = vec(random() - 0.5, 0.9 + random() * 0.5, (random() - 0.5) * 0.6).normalize();
    const openTowards = vec((random() - 0.5) * 0.9, 1, 0.75).normalize();

    // Which directions the shell has lost: hairline cracks, torn holes, then the whole crown.
    const crack = mix(0.028, 0.075, hatched), holeLevel = mix(0.6, 0.2, hatched), crownLevel = mix(1.5, 0.3, hatched ** 1.3);
    const gone = (d: THREE.Vector3) =>
      Math.abs(noise(d.x * 1.9 + 3, d.y * 1.9, d.z * 1.9, 2)) < crack
      || noise(d.x * 1.25 - 7, d.y * 1.25, d.z * 1.25, 3) > holeLevel
      || d.dot(openTowards) > crownLevel
      || (a.doing === 'kicking' && Math.abs(d.dot(axis)) > 0.972);

    const dustDark = new THREE.Color('#150d12').lerp(new THREE.Color('#1e0f08'), mood.warmth);
    const dustLight = new THREE.Color('#4a3a44').lerp(new THREE.Color('#6b4026'), mood.warmth);
    const shade = new THREE.Color();
    const whole = blob(radius, (d) => {
      let r = 1 + 0.1 * noise(d.x * 2.3, d.y * 2.3, d.z * 2.3, 4);
      if (a.shell === 'orb' || a.shell === 'tattered') r += 0.1 * noise(d.x * 1.1 + 9, d.y * 1.1, d.z * 1.1, 2);
      if (a.shell === 'teardrop' && d.y > 0) r *= 1 + 1.25 * d.y ** 5;
      return r;
    }, 24);
    whole.scale(stretch.x, stretch.y, stretch.z);
    whole.computeVertexNormals();
    tint(whole, (p, n) => shade.copy(dustDark).lerp(dustLight, clamp01(0.35 + 0.4 * noise(p.x * 1.6, p.y * 1.6, p.z * 1.6, 3) + 0.25 * n.y)));
    const flat = whole.toNonIndexed();
    whole.dispose();
    const position = flat.getAttribute('position'), normal = flat.getAttribute('normal'), colour = flat.getAttribute('color');
    const kept: number[] = [], keptNormal: number[] = [], keptColour: number[] = [];
    const centroid = new THREE.Vector3(), corner = new THREE.Vector3();
    for (let face = 0; face < position.count; face += 3) {
      centroid.set(0, 0, 0);
      for (let i = 0; i < 3; i++) centroid.add(corner.fromBufferAttribute(position, face + i));
      centroid.divide(stretch).normalize();
      if (gone(centroid)) continue;
      for (let i = face; i < face + 3; i++) {
        kept.push(position.getX(i), position.getY(i), position.getZ(i));
        keptNormal.push(normal.getX(i), normal.getY(i), normal.getZ(i));
        keptColour.push(colour.getX(i), colour.getY(i), colour.getZ(i));
      }
    }
    flat.dispose();
    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
    shellGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(keptNormal, 3));
    shellGeometry.setAttribute('color', new THREE.Float32BufferAttribute(keptColour, 3));
    const body = new THREE.Group();
    s.root.add(body);
    const outer = new THREE.Mesh(shellGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: leak, emissiveIntensity: 0.03 }));
    outer.castShadow = outer.receiveShadow = true;
    // The inside of the shell is lit by the star, so every crack and torn edge shows as a glowing lining.
    const lining = new THREE.Mesh(shellGeometry, new THREE.MeshBasicMaterial({ color: leak.clone().multiplyScalar(0.8 * bright), side: THREE.BackSide }));
    lining.scale.setScalar(0.985);
    body.add(outer, lining);

    const hearts: THREE.Object3D[] = [];
    const heart = (at: THREE.Vector3, size: number) => {
      const core = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 20), new THREE.MeshBasicMaterial({ color: leak.clone().lerp(white, 0.35) }));
      const skin = new THREE.Mesh(new THREE.SphereGeometry(size * 1.18, 24, 16), hazePaint(leak, 0.5));
      const group = new THREE.Group();
      group.add(core, skin);
      group.position.copy(at);
      body.add(group);
      hearts.push(group);
    };
    if (a.siblings === 'single') heart(vec(0, 0, 0), 0.68);
    else if (a.siblings === 'twins') { heart(vec(-0.5, 0.05, 0.05), 0.5); heart(vec(0.5, -0.05, -0.05), 0.5); }
    else { heart(vec(-0.15, 0, 0), 0.62); heart(vec(0.62, 0.3, 0.25), 0.24); }
    const aura = glow(radius * mix(1.35, 1.75, hatched), leak, mix(0.4, 0.8, hatched) * bright, 4);
    body.add(aura);

    // Shafts of light through whatever gaps the shell really has.
    const shafts: THREE.Object3D[] = [];
    const shaftPaint = hazePaint(leak.clone().lerp(white, 0.3), 0.2, THREE.DoubleSide);
    const wanted = Math.round((a.doing === 'sleeping' ? 1 : a.doing === 'stirring' ? 5 : 3) + hatched * 4);
    const sweep = new THREE.Group();
    body.add(sweep);
    for (let tries = 0; tries < 400 && shafts.length < wanted; tries++) {
      const d = vec(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
      if (!gone(d) || d.y < -0.35) continue;
      const length = radius * mix(1.6, 2.6, random()) * (a.doing === 'sleeping' ? 0.7 : 1);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(mix(0.16, 0.42, random()), 0.03, length, 10, 1, true), shaftPaint);
      shaft.position.copy(d).multiplyScalar(0.5 + length / 2);
      shaft.quaternion.setFromUnitVectors(vec(0, 1, 0), d);
      sweep.add(shaft);
      shafts.push(shaft);
    }

    if (a.doing === 'kicking') {
      const beam = new THREE.MeshBasicMaterial({ color: leak.clone().lerp(white, 0.5) });
      for (const sign of [1, -1]) {
        const reach = radius * stretch.y * (sign > 0 ? 2.5 : 1.25);
        const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.07, reach, 8), beam);
        jet.position.copy(axis).multiplyScalar(sign * reach * 0.5);
        jet.quaternion.setFromUnitVectors(vec(0, 1, 0), axis.clone().multiplyScalar(sign));
        const knot = glow(0.34, leak, 1.3, 3);
        knot.position.copy(axis).multiplyScalar(sign * reach * 0.8);
        body.add(jet, knot);
      }
    }

    // Torn-off pieces of shell: curved shards that keep the dark outside and the lit inside.
    const shards: { node: THREE.Object3D; spin: THREE.Vector3; home: THREE.Vector3; out: THREE.Vector3 }[] = [];
    const shardCount = Math.round(hatched * (a.doing === 'emerging' ? 12 : 4) + (a.doing === 'emerging' ? 5 : 0) + mood.density * 2);
    const shardOut = new THREE.MeshStandardMaterial({ color: dustLight.clone().lerp(dustDark, 0.5), roughness: 0.95 });
    const shardIn = new THREE.MeshBasicMaterial({ color: leak.clone().multiplyScalar(0.8 * bright), side: THREE.BackSide });
    for (let i = 0; i < shardCount; i++) {
      const d = vec(random() * 2 - 1, random() * 1.3 - 0.05, random() * 2 - 1).normalize().lerp(openTowards, 0.35).normalize();
      const size = mix(0.12, 0.34, random());
      const patch = new THREE.SphereGeometry(radius, 3, 2, 0, size * mix(0.8, 1.7, random()), Math.PI / 2 - size / 2, size);
      patch.translate(-radius * 0.98, 0, 0);
      const node = new THREE.Group();
      const front = new THREE.Mesh(patch, shardOut);
      front.castShadow = true;
      node.add(front, new THREE.Mesh(patch, shardIn));
      const distance = radius * (a.doing === 'emerging' ? mix(1.15, 1.75, random()) : mix(1.08, 1.3, random()));
      node.position.copy(d).multiply(stretch).multiplyScalar(distance);
      node.rotation.set(random() * 6.28, random() * 6.28, random() * 6.28);
      body.add(node);
      shards.push({ node, spin: vec(random() - 0.5, random() - 0.5, random() - 0.5), home: node.position.clone(), out: d });
    }

    if (a.shell === 'tattered') {
      const side = random() < 0.5 ? -1 : 1;
      const rag = new THREE.MeshStandardMaterial({ color: dustLight.clone().lerp(dustDark, 0.55), roughness: 0.95 });
      for (let i = 0; i < 11; i++) {
        const from = vec(side * 0.7, (random() - 0.5) * 1.5, (random() - 0.5) * 1.5).normalize().multiplyScalar(radius * 0.9);
        const reach = mix(0.7, 1.9, random());
        const points = [from, from.clone().add(vec(side * reach * 0.4, 0.25 * (random() - 0.3), (random() - 0.5) * 0.4)), from.clone().add(vec(side * reach * 0.75, 0.5 * (random() - 0.5), (random() - 0.5) * 0.7)), from.clone().add(vec(side * reach, 0.6 * (random() - 0.2), (random() - 0.5) * 0.9))];
        const width = mix(0.05, 0.13, random());
        const ribbon = limb(points, { rings: 20, sides: 8, radius: (t) => width * (1 - t) ** 0.8 + 0.01, rough: (p) => 1 + 0.35 * noise(p.x * 3, p.y * 3, p.z * 3, 2) });
        const mesh = new THREE.Mesh(ribbon, rag);
        mesh.castShadow = true;
        body.add(mesh);
      }
    }

    if (a.ring) {
      const ring = new THREE.Group();
      const reach = radius * Math.max(stretch.x, stretch.z) * 1.42;
      const band = new THREE.Mesh(new THREE.TorusGeometry(reach, 0.13, 10, 72), new THREE.MeshStandardMaterial({ color: dustDark.clone().lerp(dustLight, 0.35), roughness: 0.95 }));
      band.scale.z = 0.3;
      band.castShadow = true;
      const lit = new THREE.Mesh(new THREE.TorusGeometry(reach - 0.15, 0.025, 6, 72), new THREE.MeshBasicMaterial({ color: leak }));
      const faint = new THREE.Mesh(new THREE.TorusGeometry(reach + 0.3, 0.05, 6, 72), band.material);
      faint.scale.z = 0.3;
      ring.add(band, lit, faint);
      ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.35, (random() - 0.5) * 0.35, 0);
      body.add(ring);
    }

    const pace = mix(0.5, 3, mood.energy), lively = a.doing === 'sleeping' ? 0.3 : 1;
    return s.finish({
      update: (dt, time) => {
        const pulse = 1 + Math.sin(time * pace) * 0.05 * lively;
        for (const core of hearts) core.scale.setScalar(pulse);
        aura.scale.setScalar(1 + Math.sin(time * pace) * 0.08 * lively);
        if (a.doing === 'stirring') sweep.rotation.y += dt * pace * 0.12;
        for (const shard of shards) {
          shard.node.rotation.x += dt * shard.spin.x * pace * 0.5;
          shard.node.rotation.y += dt * shard.spin.y * pace * 0.5;
          if (a.doing === 'emerging') shard.node.position.copy(shard.home).addScaledVector(shard.out, 0.12 * Math.sin(time * pace * 0.4 + shard.spin.z * 9));
        }
      },
    });
  },
});
