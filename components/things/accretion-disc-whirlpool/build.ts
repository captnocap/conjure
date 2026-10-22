import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul, score } from '@conjure/kit';

/** A colour along a list of stops, 0 at the first and 1 at the last. */
function ramp(stops: readonly THREE.Color[], amount: number, out: THREE.Color) {
  const x = clamp01(amount) * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.floor(x));
  return out.copy(stops[index]).lerp(stops[index + 1], x - index);
}

/** A flat ring in the xz plane with painted vertices and polar texture coordinates, so a streak in the texture becomes a spiral. */
function annulus(
  inner: number,
  outer: number,
  around: number,
  across: number,
  paint: (fraction: number, angle: number, out: THREE.Color) => void,
  uv: (fraction: number, turn: number) => [number, number],
  lift: (radius: number, angle: number) => number = () => 0,
) {
  const positions: number[] = [], colours: number[] = [], uvs: number[] = [], index: number[] = [];
  const colour = new THREE.Color();
  for (let i = 0; i <= across; i++) {
    const fraction = i / across;
    const radius = mix(inner, outer, fraction);
    for (let j = 0; j <= around; j++) {
      const turn = j / around, angle = turn * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, lift(radius, angle), Math.sin(angle) * radius);
      paint(fraction, angle, colour);
      colours.push(colour.r, colour.g, colour.b);
      uvs.push(...uv(fraction, turn));
    }
  }
  for (let i = 0; i < across; i++)
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j, b = a + around + 1;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export default defineThing({
  questions: {
    tilt: choice('How is the whirlpool tilted toward us?', {
      open: 'Laid almost flat and open, so we look down into the drain.',
      slanted: 'Canted at a rakish diagonal, the classic portrait.',
      steep: 'Nearly edge-on, a bright blade with a hump of bent light over it.',
      warped: 'Twisted like a warped record, the outer bands tipped away from the inner ones and slowly wobbling.',
    }),
    banding: choice('What is the texture of the gas?', {
      smooth: 'Smooth, even bands of colour, serene and polished.',
      streaked: 'Combed into hundreds of fine bright and dark spiral streaks.',
      clumpy: 'Lumpy and torn, with gaps, knots and ragged holes.',
      armed: 'A few bold spiral arms winding in, like water round a plughole.',
    }),
    hunger: score('How hungry is it?', ['Starved: one thin, dim ring', 'Picking at scraps', 'Feeding steadily', 'Gorging', 'Roaring, a huge bloated blazing disc']),
    flare: noul('Is a white hot-spot flaring on the inner edge as it whips around?'),
    lensing: choice('How is the far side of the disc bent by gravity?', {
      flat: 'Not at all: a plain flat disc, like a diagram.',
      hood: 'Lifted into a bright arch over the top of the dark centre.',
      halo: 'Wrapped all the way round into a full burning ring, above and below.',
    }),
    feeding: choice('What is it swallowing right now?', {
      nothing: 'Nothing new. It is working through what it already has.',
      companion: 'A companion star beside it, drained through a long glowing stream.',
      scraps: 'Loose clumps and crumbs tumbling in from the outside.',
      wind: 'More than it can hold: gas boils off the faces of the disc in a wind.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const h = a.hunger;

    // White-hot to ember. A cold mood pulls the middle bands toward rose and violet.
    const stops = ['#fff8e4', '#ffe27a', '#ff9d2c', '#e24a1e', '#7c1d14'].map((hex, index) => {
      const colour = new THREE.Color(hex);
      colour.offsetHSL(mix(-0.035, 0.012, mood.warmth) * Math.min(index, 3) * 0.45, 0, mix(-0.03, 0.02, mood.cheer));
      return colour;
    });
    const dim = mix(0.62, 1, h);

    // One strip of streaks, wrapped round the disc and sheared into a spiral.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 128);
    const stroke = (y: number, x: number, length: number, weight: number, shade: string) => {
      ctx.strokeStyle = shade; ctx.lineWidth = weight; ctx.lineCap = 'round';
      for (const shift of [-512, 0, 512]) { ctx.beginPath(); ctx.moveTo(x + shift, y); ctx.lineTo(x + shift + length, y); ctx.stroke(); }
    };
    if (a.banding === 'smooth') {
      for (let i = 0; i < 9; i++) { ctx.fillStyle = `rgba(${i % 2 ? '70,20,10' : '255,255,255'},${0.1 + random() * 0.14})`; ctx.fillRect(0, random() * 120, 512, 3 + random() * 9); }
    } else if (a.banding === 'streaked') {
      for (let i = 0; i < 260; i++) stroke(random() * 128, random() * 512, 60 + random() * 260, 0.6 + random() * 1.6, random() < 0.6 ? `rgba(60,12,8,${0.25 + random() * 0.45})` : `rgba(255,255,240,${0.3 + random() * 0.5})`);
    } else if (a.banding === 'armed') {
      for (let i = 0; i < 3; i++) {
        const x = (i + random() * 0.4) * 512 / 3;
        for (const shift of [-512, 0, 512]) {
          const band = ctx.createLinearGradient(x + shift - 70, 0, x + shift + 70, 0);
          band.addColorStop(0, 'rgba(40,8,6,0)'); band.addColorStop(0.5, 'rgba(40,8,6,0.82)'); band.addColorStop(1, 'rgba(40,8,6,0)');
          ctx.fillStyle = band; ctx.fillRect(x + shift - 70, 0, 140, 128);
        }
      }
      for (let i = 0; i < 60; i++) stroke(random() * 128, random() * 512, 40 + random() * 120, 1, `rgba(60,12,8,${0.15 + random() * 0.25})`);
    } else {
      for (let i = 0; i < 70; i++) {
        const x = random() * 512, y = random() * 128, rx = 8 + random() * 30, ry = 3 + random() * 9;
        ctx.fillStyle = random() < 0.55 ? `rgba(40,8,6,${0.4 + random() * 0.5})` : `rgba(255,250,225,${0.35 + random() * 0.5})`;
        for (const shift of [-512, 0, 512]) { ctx.beginPath(); ctx.ellipse(x + shift, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      // Holes: fully transparent bites, cut by the alpha test.
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 26; i++) {
        const x = random() * 512, y = 20 + random() * 108, rx = 10 + random() * 26, ry = 3 + random() * 8;
        for (const shift of [-512, 0, 512]) { ctx.beginPath(); ctx.ellipse(x + shift, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    const gas = new THREE.MeshBasicMaterial({ map: texture, vertexColors: true, side: THREE.DoubleSide, alphaTest: 0.5 });

    const inner = mix(1.95, 1.38, h), outer = mix(2.6, 4.7, h);
    const disc = new THREE.Group();
    s.root.add(disc);
    const bands: { group: THREE.Group; speed: number }[] = [];
    const count = Math.round(mix(2, 7, h));
    const shear = a.banding === 'armed' ? 0.75 : 0.5;
    const edge = (n: number) => inner * (outer / inner) ** (n / count);
    for (let n = 0; n < count; n++) {
      const r0 = edge(n), r1 = edge(n + 1);
      const f0 = (r0 - inner) / (outer - inner), f1 = (r1 - inner) / (outer - inner);
      const group = new THREE.Group();
      const geometry = annulus(r0, r1, 96, 3,
        (fraction, _angle, out) => { ramp(stops, mix(0.02, 1, mix(f0, f1, fraction) ** 0.8) + (1 - h) * 0.22, out).multiplyScalar(dim); },
        (fraction, turn) => [turn * 2 + mix(f0, f1, fraction) * shear * (outer - inner) / 2, mix(f0, f1, fraction)]);
      const mesh = new THREE.Mesh(geometry, gas);
      mesh.castShadow = true;
      group.add(mesh);
      if (a.tilt === 'warped') {
        const bend = (n / Math.max(1, count - 1)) ** 1.3;
        group.rotation.set(bend * 0.42, 0, bend * 0.2);
      }
      disc.add(group);
      bands.push({ group, speed: (inner / ((r0 + r1) / 2)) ** 1.5 });
    }
    // The inner rim is a hard white-hot lip.
    const lip = new THREE.Mesh(new THREE.TorusGeometry(inner, mix(0.03, 0.06, h), 8, 96), new THREE.MeshBasicMaterial({ color: stops[0].clone().multiplyScalar(mix(0.8, 1, h)) }));
    lip.rotation.x = Math.PI / 2;
    disc.add(lip);

    // The dark centre, and the light from the far side bent round it.
    const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), new THREE.MeshBasicMaterial({ color: '#0b0910' }));
    shadow.castShadow = true;
    s.root.add(shadow);
    if (a.lensing !== 'flat') {
      const reach = mix(0.3, 0.85, h);
      const hood = new THREE.Mesh(
        annulus(1.0, 1.0 + reach, 96, 4,
          (fraction, _angle, out) => { ramp(stops, mix(0.0, 0.92, fraction ** 0.8), out).multiplyScalar(dim); },
          (fraction, turn) => [turn * 2 + fraction * 0.3, 0.1 + fraction * 0.8],
          // Thicker over the top than underneath, as the lensed image really is.
          () => 0),
        gas);
      // Stand the ring up to face the viewer, leaning back toward a camera that looks down.
      hood.rotation.x = Math.PI / 2 - 0.42;
      if (a.lensing === 'hood') {
        // Thick over the top, pinched to a thread underneath, as the lensed image really is.
        const position = hood.geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) {
          const x = position.getX(i), z = position.getZ(i), r = Math.hypot(x, z);
          const width = z > 0 ? mix(1, 0.12, clamp01((z / r) * 1.5)) : 1 + 0.6 * (-z / r);
          const to = (1 + (r - 1) * width) / r;
          position.setXYZ(i, x * to, 0, z * to);
        }
        position.needsUpdate = true;
      }
      s.root.add(hood);
      const photon = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.028, 8, 80), new THREE.MeshBasicMaterial({ color: stops[0] }));
      photon.rotation.x = -0.42;
      s.root.add(photon);
    }

    // A hot spot riding the inner edge, with a short comet tail behind it.
    let spot: THREE.Group | null = null;
    if (a.flare) {
      spot = new THREE.Group();
      const white = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const blob = new THREE.Mesh(new THREE.SphereGeometry(mix(0.2, 0.32, h), 16, 10), white);
      blob.position.set(inner + 0.12, 0.02, 0);
      spot.add(blob);
      for (let i = 0; i < 6; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, mix(0.9, 1.6, random()) * mix(0.8, 1.3, h), 6), white);
        const angle = (i / 6) * Math.PI * 2 + random() * 0.3;
        const tip = new THREE.Vector3(Math.cos(angle) * 0.5, 0.75, Math.sin(angle) * 0.5).normalize();
        if (i > 2) tip.y *= -0.5;
        tip.normalize();
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip);
        spike.position.copy(blob.position).addScaledVector(tip, 0.45);
        spot.add(spike);
      }
      const tail = new THREE.Mesh(new THREE.TorusGeometry(inner + 0.12, 0.09, 6, 40, 1.7), new THREE.MeshBasicMaterial({ color: stops[1] }));
      tail.rotation.x = Math.PI / 2;
      spot.add(tail);
      disc.add(spot);
    }

    // What it is eating.
    const crumbs: THREE.Object3D[] = [];
    if (a.feeding === 'companion') {
      const side = random() < 0.5 ? -1 : 1;
      const far = outer + mix(1.6, 2.4, random());
      const start = new THREE.Vector3(far, 0.25 * side, far * 0.2 * side);
      const curve = new THREE.CatmullRomCurve3([
        start,
        new THREE.Vector3(far * 0.72, 0.12 * side, -far * 0.42 * side),
        new THREE.Vector3(outer * 0.55, 0.03, -outer * 0.86 * side),
        new THREE.Vector3(-outer * 0.3, 0, -outer * 0.93 * side),
      ]);
      const stream = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, mix(0.12, 0.2, h), 8), new THREE.MeshBasicMaterial({ color: stops[2].clone().multiplyScalar(dim) }));
      disc.add(stream);
      const star = new THREE.Mesh(new THREE.SphereGeometry(mix(0.55, 0.8, random()), 24, 16), new THREE.MeshStandardMaterial({ color: stops[1], emissive: stops[2], emissiveIntensity: 0.7, roughness: 0.8 }));
      star.position.copy(start);
      // Drawn out into a point where the stream leaves it.
      star.scale.set(1.25, 0.95, 0.95);
      star.castShadow = true;
      disc.add(star);
    } else if (a.feeding === 'scraps') {
      const ember = new THREE.MeshStandardMaterial({ color: stops[3], emissive: stops[3], emissiveIntensity: 0.5, roughness: 0.9, flatShading: true });
      const total = 5 + Math.floor(random() * 6 + mood.density * 6);
      for (let i = 0; i < total; i++) {
        const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07 + random() * 0.14, 0), ember);
        const angle = random() * Math.PI * 2, radius = outer + 0.25 + random() * 1.1;
        lump.position.set(Math.cos(angle) * radius, (random() - 0.5) * 0.5, Math.sin(angle) * radius);
        lump.rotation.set(random() * 3, random() * 3, 0);
        lump.castShadow = true;
        const orbit = new THREE.Group();
        orbit.add(lump);
        disc.add(orbit);
        crumbs.push(orbit);
      }
    } else if (a.feeding === 'wind') {
      const breath = new THREE.MeshBasicMaterial({ color: stops[2].clone().lerp(stops[3], 0.5), transparent: true, opacity: 0.85, depthWrite: false });
      const total = 14 + Math.floor(mood.density * 12);
      for (let i = 0; i < total; i++) {
        const angle = random() * Math.PI * 2, radius = mix(inner + 0.2, outer * 0.85, random()), up = i % 2 ? 1 : -1;
        const length = mix(0.9, 2.2, random()) * mix(0.7, 1.2, h);
        const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.06, length, 5), breath);
        const lean = new THREE.Vector3(Math.cos(angle) * 0.55, up, Math.sin(angle) * 0.55).normalize();
        wisp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lean);
        wisp.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).addScaledVector(lean, length / 2 + 0.05);
        disc.add(wisp);
      }
    }

    const [tiltX, tiltZ] = ({ open: [0.1, 0.06], slanted: [0.2, 0.5], steep: [0.95, 0.16], warped: [0.25, -0.3] } as const)[a.tilt];
    const spinner = new THREE.Group();
    s.root.add(spinner);
    spinner.add(disc);
    spinner.rotation.set(tiltX, 0, tiltZ);
    disc.rotation.y = random() * Math.PI * 2;

    const spin = mix(0.12, 1.1, mood.energy) * mix(0.6, 1.2, h);
    const wobble = a.tilt === 'warped' ? mix(0.05, 0.3, mood.energy) : 0;
    return s.finish({
      update(dt) {
        for (const band of bands) band.group.children[0].rotation.y -= dt * spin * band.speed;
        if (spot) spot.rotation.y -= dt * spin * 1.25;
        crumbs.forEach((orbit, index) => { orbit.rotation.y -= dt * spin * (0.12 + (index % 4) * 0.03); });
        if (wobble) disc.rotation.y += dt * wobble;
      },
    });
  },
});
