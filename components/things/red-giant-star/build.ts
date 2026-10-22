import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const DEPTHS = {
  amber: 'Honey amber and gold, still generous, a late-afternoon sun.',
  orange: 'Full pumpkin orange with red lanes, the classic swollen giant.',
  crimson: 'Deep blood crimson, heavy and low, the last hour of a sunset.',
  carbon: 'Dark sooty maroon, nearly brown, a coal that is mostly ash.',
  peach: 'Pale washed-out peach and cream, thin and feverish, almost transparent with age.',
} as const;
const PALETTE: Record<keyof typeof DEPTHS, [string, string, string]> = {
  amber: ['#8a3a10', '#e07a1c', '#ffc65a'],
  orange: ['#7a2410', '#d9501a', '#ffa040'],
  crimson: ['#560e12', '#b8231f', '#f2603a'],
  carbon: ['#2e0e0c', '#7d1d18', '#c8452a'],
  peach: ['#a5553a', '#ee9a6a', '#ffe0b0'],
};

/** Paint an equirectangular skin: bright cell tops separated by dark sinking lanes. */
function skin(random: () => number, colours: [string, string, string], surface: string, grime: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const [deep, mid, bright] = colours;
  ctx.fillStyle = surface === 'smooth' ? mid : deep;
  ctx.fillRect(0, 0, 1024, 512);
  const blob = (u: number, v: number, radius: number, inner: string, outer: string, squash = 1) => {
    const stretch = Math.min(5, 1 / Math.max(0.2, Math.cos((v - 0.5) * Math.PI)));
    for (const wrap of [-1, 0, 1]) {
      ctx.save();
      ctx.translate((u + wrap) * 1024, v * 512);
      ctx.rotate((random() - 0.5) * 0.6);
      ctx.scale(stretch, squash);
      const paint = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      paint.addColorStop(0, inner);
      paint.addColorStop(0.55, inner);
      paint.addColorStop(1, outer);
      ctx.fillStyle = paint;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  const spot = () => [random(), Math.asin(random() * 2 - 1) / Math.PI + 0.5] as const;
  const clear = (hex: string) => `${hex}00`;
  const cells = { cells: 46, spots: 90, soot: 70, smooth: 16, banded: 60 }[surface] ?? 50;
  const size = { cells: 62, spots: 40, soot: 46, smooth: 120, banded: 44 }[surface] ?? 50;
  for (let i = 0; i < cells; i++) {
    const [u, v0] = spot();
    const v = surface === 'banded' ? Math.round(v0 * 7) / 7 + (random() - 0.5) * 0.03 : v0;
    blob(u, v, size * (0.6 + random() * 0.7), `${mid}e6`, clear(mid), surface === 'banded' ? 0.45 : 0.8 + random() * 0.3);
  }
  for (let i = 0; i < cells * 0.8; i++) {
    const [u, v] = spot();
    blob(u, v, size * (0.2 + random() * 0.3), `${bright}cc`, clear(bright));
  }
  // Granulation so the cells do not look airbrushed.
  for (let i = 0; i < 900; i++) {
    const [u, v] = spot();
    blob(u, v, 3 + random() * 6, i % 2 ? `${bright}55` : `${deep}66`, i % 2 ? clear(bright) : clear(deep));
  }
  const darkSpots = surface === 'spots' ? 9 : surface === 'cells' ? 2 : 0;
  for (let i = 0; i < darkSpots; i++) {
    const u = random(), v = 0.25 + random() * 0.5, radius = 22 + random() * 38;
    blob(u, v, radius * 1.5, `${deep}cc`, clear(deep), 0.8);
    blob(u, v, radius * 0.8, '#1a0806f0', '#1a080600', 0.8);
  }
  const soot = (surface === "soot" ? 60 : 0) + Math.round(Math.max(0, grime - 0.25) * 45);
  for (let i = 0; i < soot; i++) {
    const [u, v] = spot();
    const patches = 2 + Math.floor(random() * 4);
    for (let j = 0; j < patches; j++) blob(u + (random() - 0.5) * 0.08, v + (random() - 0.5) * 0.08, 10 + random() * 26, '#160a08c8', '#160a0800', 0.5 + random() * 0.6);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    surface: choice('What does the surface look like?', {
      cells: 'A few enormous lazy convection cells, bright tops with dark lanes between, like slow porridge.',
      spots: 'Fine mottling broken by several huge dark starspots, like age spots or bruises.',
      soot: 'Patchy black soot drifting across the glow, a lamp glass that needs cleaning.',
      smooth: 'Almost featureless, a soft even ember with only vague clouds.',
      banded: 'Cells smeared into rough bands around its middle, a slowly turning top.',
    }),
    shedding: score('How much of itself is it shedding into space?', ['Holding together, a clean edge', 'A few loops lifting off', 'Ragged plumes on every side', 'Coming apart in streamers and puffs']),
    shape: choice('What shape has it swollen into?', {
      round: 'An even, dignified sphere.',
      lopsided: 'Bulging on one side like a sagging balloon.',
      lumpy: 'Knobbly and irregular, a potato of a star with great humps.',
      oblate: 'Squashed and wide, spreading at the waist.',
    }),
    colour: choice('How deep is its colour?', DEPTHS),
    moment: choice('What is happening to it right now?', {
      breathing: 'It is simply breathing, swelling and sinking, nothing else to do.',
      shrugging: 'It has just shrugged off a thin ring of gas that now hangs around it like a dropped shawl.',
      erupting: 'One great arch of gas is tearing free from a single wound in its side.',
      guttering: 'It is guttering: dark patches are winning and the glow comes and goes.',
    }),
    transit: noul('Is a tiny dark planet crossing in front of its face, showing how huge it is?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 2;
    const colours = PALETTE[a.colour];
    const offset = [random() * 9, random() * 9, random() * 9];
    const lump = (d: THREE.Vector3, f: number) =>
      Math.sin(d.x * f + offset[0]) * Math.sin(d.y * f * 1.3 + offset[1]) * Math.sin(d.z * f * 0.9 + offset[2]);
    const axis = new THREE.Vector3(random() - 0.5, random() * 0.5, random() - 0.5).normalize();
    const radiusAt = (d: THREE.Vector3) => {
      let r = 1 + lump(d, 6) * 0.012 + lump(d, 11) * 0.008 * (1 + a.shedding * 2);
      if (a.shape === 'lopsided') r += Math.max(0, d.dot(axis)) ** 2 * 0.36 - 0.07;
      if (a.shape === 'lumpy') r += lump(d, 2.4) * 0.2 + lump(d, 4.1) * 0.07;
      return r * R;
    };

    const star = new THREE.Group();
    s.root.add(star);
    const texture = skin(random, colours, a.surface, mood.wear * 0.6 + (a.moment === 'guttering' ? 0.9 : 0));
    const glow = mix(0.55, 0.95, mood.cheer) * (a.moment === 'guttering' ? 0.7 : 1);
    const body = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: glow, roughness: 1 });
    const geometry = new THREE.SphereGeometry(1, 96, 64);
    const at = geometry.attributes.position as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    for (let i = 0; i < at.count; i++) {
      d.fromBufferAttribute(at, i).normalize();
      d.multiplyScalar(radiusAt(d.clone()));
      at.setXYZ(i, d.x, d.y, d.z);
    }
    geometry.computeVertexNormals();
    const ball = new THREE.Mesh(geometry, body);
    ball.castShadow = true;
    if (a.shape === 'oblate') ball.scale.set(1.12, 0.84, 1.12);
    star.add(ball);
    const squash = (p: THREE.Vector3) => (a.shape === 'oblate' ? p.multiply(new THREE.Vector3(1.12, 0.84, 1.12)) : p);
    const surfacePoint = (dir: THREE.Vector3, lift = 1) => squash(dir.clone().multiplyScalar(radiusAt(dir) * lift));

    const hot = s.material(colours[2], { emissive: colours[1], emissiveIntensity: glow, roughness: 1 });
    const warm = s.material(colours[1], { emissive: colours[1], emissiveIntensity: glow * 0.7, roughness: 1 });

    // A ragged limb: short flame tongues standing all over the surface.
    const tongues = Math.round(mix(120, 420, a.shedding));
    const spike = new THREE.ConeGeometry(0.5, 1, 5);
    spike.translate(0, 0.4, 0);
    const fringe = new THREE.InstancedMesh(spike, warm, tongues);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const anyDirection = () => {
      const y = random() * 2 - 1, t = random() * Math.PI * 2, w = Math.sqrt(1 - y * y);
      return new THREE.Vector3(Math.cos(t) * w, y, Math.sin(t) * w);
    };
    for (let i = 0; i < tongues; i++) {
      const dir = anyDirection();
      const lean = dir.clone().add(anyDirection().multiplyScalar(0.35)).normalize();
      turn.setFromUnitVectors(up, lean);
      const width = 0.06 + random() * 0.1;
      matrix.compose(surfacePoint(dir, 0.985), turn, new THREE.Vector3(width, mix(0.08, 0.22, a.shedding) * (0.5 + random() * 1.4), width));
      fringe.setMatrixAt(i, matrix);
    }
    fringe.castShadow = true;
    star.add(fringe);

    // Loops of gas: arches rooted at both feet, and broken ones that end in drifting puffs.
    const puffs: { at: [number, number, number]; size: number; color: string }[] = [];
    const loops = Math.round(a.shedding * 7 + mood.energy * 2) + (a.moment === 'erupting' ? 1 : 0);
    for (let i = 0; i < loops; i++) {
      const big = a.moment === 'erupting' && i === 0;
      const dir = anyDirection();
      dir.y = Math.abs(dir.y) * 0.9 - 0.15;
      if (dir.z < -0.2) dir.z *= -1;
      dir.normalize();
      const tangent = new THREE.Vector3().crossVectors(dir, anyDirection()).normalize();
      const height = big ? 0.75 : 0.14 + random() * 0.3 + a.shedding * 0.18;
      const span = big ? 0.5 : 0.16 + random() * 0.22;
      const broken = !big && random() < a.shedding * 0.6;
      const end = broken ? 0.45 + random() * 0.3 : 1;
      const points: [number, number, number][] = [];
      for (let k = 0; k <= 14; k++) {
        const angle = (k / 14) * Math.PI * end;
        const foot = dir.clone().addScaledVector(tangent, -Math.cos(angle) * span).normalize();
        points.push(surfacePoint(foot, 0.97 + Math.sin(angle) * height).toArray() as [number, number, number]);
      }
      const loop = s.tube(points, big ? 0.075 : 0.03 + random() * 0.03, i % 2 ? hot : warm);
      star.add(loop);
      if (broken || big) {
        const tip = new THREE.Vector3(...points[broken ? points.length - 1 : 7]);
        for (let k = 0; k < 7; k++) {
          const drift = tip.clone().multiplyScalar(1 + k * 0.035).add(anyDirection().multiplyScalar(0.08 + k * 0.02));
          puffs.push({ at: drift.toArray() as [number, number, number], size: 0.09 - k * 0.009, color: k % 2 ? colours[2] : colours[1] });
        }
      }
    }
    // Streamers: lines of puffs thinning as they leave.
    const streamers = Math.round(Math.max(0, a.shedding - 0.45) * 14 * mix(0.6, 1.3, mood.density));
    for (let i = 0; i < streamers; i++) {
      const dir = anyDirection();
      const curl = anyDirection().multiplyScalar(0.25);
      const length = 6 + Math.floor(random() * 7);
      for (let k = 0; k < length; k++) {
        const out = dir.clone().addScaledVector(curl, (k / length) ** 2).normalize();
        const p = surfacePoint(out, 1.02 + k * 0.045).add(anyDirection().multiplyScalar(0.04));
        puffs.push({ at: p.toArray() as [number, number, number], size: 0.13 * (1 - k / (length + 2)), color: k < 3 ? colours[2] : colours[1] });
      }
    }
    if (puffs.length) star.add(s.scatter(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { emissive: colours[1], emissiveIntensity: glow * 0.8, roughness: 1 }), puffs));

    // The thin outer atmosphere, see-through, so it is not measured as body.
    const reach = 1.1 + a.shedding * 0.12;
    const haze = new THREE.Mesh(new THREE.SphereGeometry(R * reach, 40, 24), new THREE.MeshBasicMaterial({ color: colours[1], transparent: true, opacity: 0.1 + a.shedding * 0.1, depthWrite: false }));
    if (a.shape === 'oblate') haze.scale.set(1.12, 0.84, 1.12);
    star.add(haze);

    if (a.moment === 'shrugging') {
      const shawl = new THREE.Mesh(new THREE.TorusGeometry(R * 1.42, 0.07, 8, 96), new THREE.MeshBasicMaterial({ color: colours[2], transparent: true, opacity: 0.75, depthWrite: false }));
      shawl.rotation.set(Math.PI / 2 + 0.22 + random() * 0.15, 0.2 * (random() - 0.5), 0);
      const veil = new THREE.Mesh(new THREE.TorusGeometry(R * 1.36, 0.2, 8, 96), new THREE.MeshBasicMaterial({ color: colours[1], transparent: true, opacity: 0.22, depthWrite: false }));
      veil.rotation.copy(shawl.rotation);
      veil.scale.z = 0.4;
      star.add(shawl, veil);
    }

    star.rotation.y = random() * Math.PI * 2;
    if (a.transit) {
      const world = s.ball([0.13, 0.13, 0.13], [-0.55 + random() * 1.1, 0.25 + random() * 0.5, R * 1.32], s.material('#1c1414', { roughness: 0.9 }), 16);
      world.castShadow = true;
    }

    const lift = R * (reach - 1) * 0.6;
    const breath = mix(0.012, 0.045, mood.energy) * (a.moment === 'breathing' ? 1.6 : 1);
    const pace = mix(0.25, 0.9, mood.energy);
    const thing = s.finish({
      footprint: R * 0.8,
      update: (dt, time) => {
        const swell = Math.sin(time * pace);
        star.scale.setScalar(1 + swell * breath);
        star.rotation.y += dt * 0.03;
        if (a.moment === 'guttering') body.emissiveIntensity = glow * (0.8 + 0.2 * Math.sin(time * 2.3) * Math.sin(time * 0.7));
      },
    });
    s.root.position.y += lift;
    return thing;
  },
});
