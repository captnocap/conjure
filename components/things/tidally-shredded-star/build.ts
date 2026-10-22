import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

/** A tube whose radius and colour change along its length. */
function taperedTube(curve: THREE.Curve<THREE.Vector3>, steps: number, sides: number, radius: (t: number) => number, paint: (t: number, out: THREE.Color) => void) {
  const frames = curve.computeFrenetFrames(steps, false);
  const positions: number[] = [], normals: number[] = [], colours: number[] = [], index: number[] = [];
  const point = new THREE.Vector3(), normal = new THREE.Vector3(), colour = new THREE.Color();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    curve.getPointAt(t, point);
    const r = radius(t);
    paint(t, colour);
    for (let j = 0; j <= sides; j++) {
      const angle = (j / sides) * Math.PI * 2;
      normal.copy(frames.normals[i]).multiplyScalar(Math.cos(angle)).addScaledVector(frames.binormals[i], Math.sin(angle));
      positions.push(point.x + normal.x * r, point.y + normal.y * r, point.z + normal.z * r);
      normals.push(normal.x, normal.y, normal.z);
      colours.push(colour.r, colour.g, colour.b);
    }
  }
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(index);
  return geometry;
}

const smooth = (from: number, to: number, x: number) => { const t = clamp01((x - from) / (to - from)); return t * t * (3 - 2 * t); };

const STARS = {
  sun: 'A yellow sun-like star, ordinary and middle-aged.',
  giant: 'A bloated red giant, soft and easy to pull apart.',
  blue: 'A young blue-white star, brilliant and wasted.',
  dwarf: 'A small hard white dwarf, dense and stubborn, giving up only a thread.',
} as const;
const PALETTE: Record<keyof typeof STARS, { body: string; mid: string; cold: string; size: number }> = {
  sun: { body: '#ffc928', mid: '#ff7a1c', cold: '#a32a1c', size: 0.95 },
  giant: { body: '#ff5a2c', mid: '#cf2a22', cold: '#5c1626', size: 1.3 },
  blue: { body: '#4f9bff', mid: '#3b62f0', cold: '#6a2fb8', size: 0.82 },
  dwarf: { body: '#c9dcf6', mid: '#86b0ee', cold: '#4a5fa8', size: 0.45 },
};

export default defineThing({
  questions: {
    stage: choice('How far gone is the star?', {
      bulge: 'Only just caught: still a whole ball, drawn into an egg with a first wisp leaving its tip.',
      teardrop: 'A teardrop: a fat ball with a long pointed tail reaching for the centre.',
      noodle: 'Half ball, half noodle: a long stream sweeps round the centre and out the far side.',
      ring: 'Nearly all gone: a ring of debris wrapped round the centre, with a last knot where the star was.',
    }),
    star: choice('What kind of star is it?', STARS),
    loop: noul('Is the tail looping back and spiralling down into the centre?'),
    wound: score('How bright is the wound where the stream tears out of the star?', ['Dull, a slow bleed', 'Glowing', 'White-hot', 'Blinding, flaring and spitting sparks']),
    debris: choice('What is the stream like?', {
      clean: 'One clean, taut ribbon.',
      beads: 'Breaking into droplets: beads strung along it and sprayed to either side.',
      frayed: 'Fraying into several separate strands, like a rope coming apart.',
    }),
    hole: choice('What is doing the pulling?', {
      unseen: 'Nothing visible. The stream bends round an empty spot.',
      dot: 'A small, perfectly black sphere.',
      ringed: 'A black sphere that has already grown a thin glowing ring from earlier mouthfuls.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const look = PALETTE[a.star];
    const body = new THREE.Color(look.body), mid = new THREE.Color(look.mid), cold = new THREE.Color(look.cold), white = new THREE.Color('#fffdf0');
    const size = look.size * { bulge: 1, teardrop: 0.92, noodle: 0.66, ring: 0.36 }[a.stage];
    const plane = new THREE.Group();
    s.root.add(plane);

    // The path of the stream, as a distance from the centre for each angle swept.
    const sweep = { bulge: 0.42, teardrop: 1.05, noodle: 4.3, ring: 6.9 }[a.stage] * mix(0.9, 1.1, random());
    const near = mix(0.95, 1.2, random());
    const distance = (angle: number) => {
      if (a.stage === 'bulge') return 3.0 - 0.5 * (angle / sweep);
      if (a.stage === 'teardrop') return 3.0 - 1.3 * (angle / sweep) ** 0.9;
      if (a.stage === 'noodle') return near + 2.2 * (Math.abs(angle - 2.0) / 2.0) ** 1.5;
      return 1.55 + 0.95 * Math.exp(-angle * 1.1);
    };
    const points: THREE.Vector3[] = [];
    const steps = Math.ceil(sweep * 14) + 4;
    for (let i = 0; i <= steps; i++) { const angle = (i / steps) * sweep, r = distance(angle); points.push(new THREE.Vector3(Math.cos(angle) * r, 0, -Math.sin(angle) * r)); }
    const spiral = a.loop ? mix(2.6, 3.6, random()) : 0;
    if (a.loop) {
      const last = distance(sweep);
      for (let i = 1; i <= 26; i++) { const v = i / 26, angle = sweep + v * spiral, r = mix(last, 0.34, v ** 0.75); points.push(new THREE.Vector3(Math.cos(angle) * r, 0, -Math.sin(angle) * r)); }
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const total = curve.getLength();
    // Where, in arc length, the first sweep ends and the infall begins.
    const turnBack = a.loop ? clamp01(1 - (curve.getLength() - new THREE.CatmullRomCurve3(points.slice(0, steps + 1)).getLength()) / total) : 1;

    const neck = size * (a.stage === 'bulge' ? 0.38 : 0.66);
    const thin = size * mix(0.16, 0.22, random()) + 0.04;
    const girth = (t: number) => {
      const along = t * total;
      const taper = mix(neck, thin, smooth(0, size * (a.stage === 'teardrop' ? 2.6 : a.stage === 'noodle' ? 5 : 2.2), along) ** 0.7);
      const tail = a.loop ? mix(1, 0.45, smooth(turnBack, 1, t)) : 1 - smooth(0.72, 1, t) * 0.88;
      return Math.max(0.012, taper * tail);
    };
    const heat = mix(0.25, 1, a.wound);
    const paint = (t: number, out: THREE.Color) => {
      const along = t * total;
      out.copy(body);
      out.lerp(white, heat * (1 - smooth(size * 0.9, size * mix(2.2, 4.2, a.wound), along)) * smooth(0, size * 0.5, along + size * 0.4));
      out.lerp(mid, smooth(size * 1.5, total * 0.45 + size * 1.5, along) * (1 - heat * 0.25));
      out.lerp(cold, smooth(0.45, 1, t) * 0.9);
      // Falling in, it heats again.
      if (a.loop) out.lerp(white, smooth(turnBack + 0.4 * (1 - turnBack), 1, t) * 0.85);
    };
    const flesh = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: mid, emissiveIntensity: mix(0.3, 0.6, mood.energy), roughness: 0.75 });
    const stream = new THREE.Mesh(taperedTube(curve, Math.round(total * 16) + 40, 14, girth, paint), flesh);
    stream.castShadow = true;
    plane.add(stream);

    if (a.debris === 'frayed') {
      const strands = 3 + Math.floor(random() * 3);
      for (let i = 0; i < strands; i++) {
        const drift = (random() - 0.5) * 0.5, rise = (random() - 0.5) * 0.3, begin = mix(0.08, 0.3, random()), wave = random() * 6;
        const strand = points.map((point, index) => {
          const t = index / (points.length - 1), out = smooth(begin, begin + 0.25, t);
          const radial = point.clone().normalize();
          return point.clone().addScaledVector(radial, out * (drift + Math.sin(t * 9 + wave) * 0.07)).add(new THREE.Vector3(0, out * (rise + Math.cos(t * 7 + wave) * 0.05), 0));
        }).filter((_point, index) => index / (points.length - 1) >= begin * 0.8);
        const path = new THREE.CatmullRomCurve3(strand);
        const fine = thin * mix(0.3, 0.5, random());
        const mesh = new THREE.Mesh(taperedTube(path, strand.length * 5, 8, (t) => Math.max(0.01, fine * Math.sin(Math.PI * clamp01(t * 0.9 + 0.1)) ** 0.5), (t, out) => paint(mix(begin, 1, t), out)), flesh);
        mesh.castShadow = true;
        plane.add(mesh);
      }
    }

    // The star itself, drawn out toward the centre and mottled like a boiling surface.
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${body.getHexString()}`;
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 240; i++) {
      const bright = random() < 0.5;
      ctx.fillStyle = bright ? `rgba(255,250,225,${0.1 + random() * 0.22})` : `#${mid.getHexString()}${Math.floor(40 + random() * 70).toString(16)}`;
      ctx.beginPath();
      ctx.ellipse(random() * 256, random() * 128, 3 + random() * 9, 2 + random() * 6, random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const skin = new THREE.CanvasTexture(canvas);
    skin.colorSpace = THREE.SRGBColorSpace;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshStandardMaterial({ map: skin, emissive: body, emissiveMap: skin, emissiveIntensity: 0.55, roughness: 0.85 }));
    const head = curve.getPointAt(0), aim = curve.getTangentAt(0);
    const stretch = { bulge: 1.3, teardrop: 1.22, noodle: 1.1, ring: 1 }[a.stage];
    // Pull the near side of the ball out to a point so it flows into the stream.
    const shape = ball.geometry.getAttribute('position');
    for (let i = 0; i < shape.count; i++) {
      const y = shape.getY(i);
      const pull = y > 0 ? 1 + y ** 3 * (a.stage === 'ring' ? 0.2 : 0.55) : 1;
      const pinch = y > 0 ? 1 - y ** 4 * 0.25 : 1;
      shape.setXYZ(i, shape.getX(i) * pinch, y * pull * stretch, shape.getZ(i) * pinch);
    }
    ball.geometry.computeVertexNormals();
    ball.scale.setScalar(size);
    ball.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
    ball.position.copy(head).addScaledVector(aim, -size * 0.55);
    ball.castShadow = true;
    plane.add(ball);

    // The wound: a hot collar and, when bad, sparks.
    const glare = new THREE.MeshBasicMaterial({ color: white });
    if (a.wound > 0.45) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(neck * 1.02, size * mix(0.03, 0.09, a.wound), 8, 32), glare);
      collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), aim);
      collar.position.copy(curve.getPointAt(clamp01((size * 0.5) / total)));
      plane.add(collar);
    }
    if (a.wound > 0.7) {
      const sparks = 6 + Math.floor(random() * 6);
      for (let i = 0; i < sparks; i++) {
        const dir = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).addScaledVector(aim, 0.4).normalize();
        const length = size * mix(0.5, 1.3, random());
        const spark = new THREE.Mesh(new THREE.ConeGeometry(size * 0.05, length, 5), glare);
        spark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        spark.position.copy(head).addScaledVector(aim, size * 0.35).addScaledVector(dir, neck + length / 2);
        plane.add(spark);
      }
    }

    // Droplets riding the stream.
    const drops: { t: number; off: THREE.Vector3; size: number }[] = [];
    let beads: THREE.InstancedMesh | null = null;
    if (a.debris === 'beads' || a.stage === 'ring') {
      const count = Math.round((a.debris === 'beads' ? 26 : 12) + total * 3 + mood.density * 20);
      for (let i = 0; i < count; i++)
        drops.push({ t: mix(0.12, 0.98, random()), off: new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.7, random() - 0.5).multiplyScalar(random() < 0.55 ? 0.12 : 0.6), size: mix(0.035, 0.11, random() ** 2) });
      beads = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: mid, emissiveIntensity: 0.5, roughness: 0.8 }), count);
      beads.castShadow = true;
      beads.frustumCulled = false;
      plane.add(beads);
    }

    // The thing doing the pulling.
    if (a.hole !== 'unseen') {
      const pit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshBasicMaterial({ color: '#0b0910' }));
      pit.castShadow = true;
      plane.add(pit);
      if (a.hole === 'ringed')
        ['#fff1c0', '#ffb347', '#e5602a'].forEach((hex, i) => {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.1, 0.05, 6, 48), new THREE.MeshBasicMaterial({ color: hex }));
          ring.rotation.x = Math.PI / 2;
          ring.scale.z = 0.3;
          plane.add(ring);
        });
    }

    // Tip the orbital plane up toward the viewer and turn it so the star sits where it is easy to see.
    plane.rotation.set(mix(0.4, 0.62, random()), 0, (random() - 0.5) * 0.3);
    const spin = new THREE.Group();
    plane.add(spin);
    for (const child of [...plane.children]) if (child !== spin) spin.add(child);
    spin.rotation.y = mix(-0.5, 0.9, random()) + (a.stage === 'ring' ? random() * 6 : 0);

    const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), tint = new THREE.Color();
    const pace = mix(0.004, 0.035, mood.energy);
    const breath = ball.scale.clone();
    let clock = 0;
    const settle = (dt: number) => {
      clock += dt;
      const throb = 1 + Math.sin(clock * mix(0.8, 3.2, mood.energy)) * 0.015;
      ball.scale.set(breath.x * throb, breath.y / throb, breath.z * throb);
      if (!beads) return;
      drops.forEach((drop, index) => {
        drop.t += dt * pace;
        if (drop.t > 0.99) drop.t = 0.12;
        curve.getPointAt(drop.t, at).add(drop.off);
        const fade = Math.min(smooth(0.1, 0.2, drop.t), 1 - smooth(0.9, 0.99, drop.t));
        const girthNow = Math.max(0.0001, drop.size * fade);
        beads!.setMatrixAt(index, matrix.makeScale(girthNow, girthNow, girthNow).setPosition(at));
        paint(drop.t, tint);
        beads!.setColorAt(index, tint);
      });
      beads.instanceMatrix.needsUpdate = true;
      if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    };
    settle(0);
    return s.finish({ update: settle });
  },
});
