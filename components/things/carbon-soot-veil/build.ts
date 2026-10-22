import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

function noiseOf(seed: number) {
  const lattice = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683) + seed) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const edge = (dy: number, dz: number) => lattice(xi, yi + dy, zi + dz) * (1 - u) + lattice(xi + 1, yi + dy, zi + dz) * u;
    return (edge(0, 0) * (1 - v) + edge(1, 0) * v) * (1 - w) + (edge(0, 1) * (1 - v) + edge(1, 1) * v) * w;
  };
  return (x: number, y: number, z: number, octaves = 4) => {
    let total = 0, weight = 0.5, scale = 1;
    for (let i = 0; i < octaves; i++) {
      total += noise(x * scale + i * 7.3, y * scale, z * scale) * weight;
      weight *= 0.5; scale *= 2.03;
    }
    return total / (1 - 0.5 ** octaves);
  };
}

const EMBERS = {
  'dull-red': 'Dull cherry red, the classic dying coal.',
  orange: 'Bright orange, still properly alight at the fringes.',
  rose: 'Dusky rose and violet, bruised and tender.',
  sodium: 'Sour sodium yellow, like streetlight through smog.',
  gas: 'Cold gas-flame blue, clean and unsettling.',
  ash: 'No glow at all: the edges have gone to pale grey ash.',
} as const;
const GLOWS: Record<keyof typeof EMBERS, [string, number]> = {
  'dull-red': ['#d9301f', 1], orange: ['#ff8424', 1.15], rose: ['#d4558e', 1], sodium: ['#e9c22e', 1], gas: ['#3f9cff', 1.1], ash: ['#b9b4ad', 0],
};

type Curve = (t: number) => { at: THREE.Vector3; side: THREE.Vector3; width: number };

export default defineThing({
  questions: {
    form: choice('What form has the smoke taken?', {
      pinwheel: 'A flat pinwheel spiral unwinding from a centre, a clock spring or a snail shell of soot.',
      plume: 'A plume rising from a point and curling as it climbs, like smoke off a snuffed candle.',
      curtain: 'A hanging curtain of soot with folds and a torn hem, a mourning veil.',
      knot: 'A tangled knot of loops going nowhere, smoke in a closed room.',
    }),
    thickness: score('How thick is it?', ['A thin gauze full of holes', 'A light veil', 'A heavy pall', 'Dense, layered and suffocating']),
    ember: choice('What colour do its edges glow?', EMBERS),
    hiding: choice('What is it hiding?', {
      nothing: 'Nothing. Whatever made it is gone or out of sight.',
      'red-star': 'A dim red star, glimpsed through the gaps.',
      'white-point': 'A fierce white point that the soot cannot quite cover.',
      candle: 'A snuffed candle stub with a wick still glowing.',
      pair: 'Two small stars close together, one bright and one faint.',
    }),
    moment: choice('How long ago was the flame put out?', {
      fresh: 'A moment ago: the smoke is one unbroken ribbon and sparks are still flying.',
      curling: 'A little while: it is curling and widening, still in one piece.',
      dispersing: 'A long while: it has broken into separate drifting wisps with gaps between.',
    }),
    edge: choice('What are its edges like?', {
      wispy: 'Soft and wispy, fraying into tongues.',
      torn: 'Torn and ragged, with rips running in from the edge.',
      clean: 'Surprisingly clean and ribbon-like, as if cut from felt.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fbm = noiseOf(context.seed ^ Math.floor(random() * 1e9));
    const [emberHex, emberPower] = GLOWS[a.ember];
    const ember = new THREE.Color(emberHex);
    const glow = emberPower * mix(0.7, 1.3, mood.cheer) * (a.moment === 'fresh' ? 1.2 : a.moment === 'dispersing' ? 0.75 : 1);

    // One strip of smoke painted flat: u runs along the ribbon and wraps, v runs across it.
    const paint = (salt: number) => {
      const width = 512, height = 192;
      const colour = document.createElement('canvas'), light = document.createElement('canvas');
      colour.width = light.width = width; colour.height = light.height = height;
      const cctx = colour.getContext('2d')!, lctx = light.getContext('2d')!;
      const cdata = cctx.createImageData(width, height), ldata = lctx.createImageData(width, height);
      const holeLevel = mix(0.4, 0.2, a.thickness) + (a.edge === 'torn' ? 0.03 : 0);
      const fray = { wispy: 0.75, torn: 1.1, clean: 0.16 }[a.edge];
      const e = [ember.r * 255, ember.g * 255, ember.b * 255];
      for (let py = 0; py < height; py++) {
        const v = (py + 0.5) / height, centre = Math.min(v, 1 - v) * 2;
        for (let px = 0; px < width; px++) {
          const u = (px + 0.5) / width, cu = Math.cos(u * Math.PI * 2), su = Math.sin(u * Math.PI * 2);
          const broad = fbm(cu * 2.4 + salt, su * 2.4, v * 2.6, 4);
          const fine = fbm(cu * 7 + salt, su * 7 + 9, v * 7, 3);
          const rip = a.edge === 'torn' ? Math.max(0, 0.5 - Math.abs(fbm(cu * 9 + salt, su * 9, 4.4, 2) - 0.5) * 9) * (1 - centre * 0.4) : 0;
          const body = centre + (broad - 0.5) * fray - rip - 0.13;
          const hole = fine - holeLevel;
          const gap = a.moment === 'dispersing' ? fbm(cu * 1.5 + salt + 4, su * 1.5, 0.5, 2) - 0.47 : 1;
          const solid = Math.min(body, hole * 2.2, gap * 3);
          const rimLight = smooth(0.085, 0, solid);
          const soot = 22 + fine * 46 + broad * 14;
          const at = (py * width + px) * 4;
          cdata.data[at] = soot + (e[0] * 0.85 - soot) * rimLight * 0.9;
          cdata.data[at + 1] = soot * 0.95 + (e[1] * 0.85 - soot) * rimLight * 0.9;
          cdata.data[at + 2] = soot + (e[2] * 0.85 - soot) * rimLight * 0.9;
          cdata.data[at + 3] = solid > 0 ? 255 : 0;
          ldata.data[at] = e[0] * rimLight; ldata.data[at + 1] = e[1] * rimLight; ldata.data[at + 2] = e[2] * rimLight; ldata.data[at + 3] = 255;
        }
      }
      cctx.putImageData(cdata, 0, 0);
      lctx.putImageData(ldata, 0, 0);
      const map = new THREE.CanvasTexture(colour), emissiveMap = new THREE.CanvasTexture(light);
      map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = emissiveMap.wrapS = THREE.RepeatWrapping;
      return new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: glow, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    };

    const veil = new THREE.Group();
    s.root.add(veil);
    const haze = new THREE.MeshBasicMaterial({ color: '#2c2729', transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide });
    const ribbon = (curve: Curve, material: THREE.Material, ripple: number, repeat = 1, spread = 1): THREE.Mesh => {
      const along = 120, across = 10;
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      const tangent = new THREE.Vector3(), normal = new THREE.Vector3();
      const phase = random() * 9;
      for (let i = 0; i <= along; i++) {
        const t = i / along, here = curve(t), next = curve(Math.min(1, t + 0.004)), before = curve(Math.max(0, t - 0.004));
        tangent.subVectors(next.at, before.at).normalize();
        normal.crossVectors(tangent, here.side).normalize();
        for (let j = 0; j <= across; j++) {
          const v = j / across;
          const wave = Math.sin(v * 5 + t * 17 + phase) * ripple * here.width;
          const p = here.at.clone().addScaledVector(here.side, (v - 0.5) * here.width * spread).addScaledVector(normal, wave + (spread > 1 ? 0.04 : 0));
          positions.push(p.x, p.y, p.z);
          uvs.push(t * repeat, v);
          if (i < along && j < across) {
            const k = i * (across + 1) + j;
            indices.push(k, k + across + 1, k + 1, k + 1, k + across + 1, k + across + 2);
          }
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = mesh.receiveShadow = spread === 1;
      veil.add(mesh);
      if (spread === 1) ribbon(curve, haze, ripple, repeat, 1.45);
      return mesh;
    };

    const layers = 1 + Math.round(a.thickness * 2.4);
    const ends = (t: number) => smooth(0, 0.06, t) * smooth(1, 0.9, t);
    let heart = new THREE.Vector3();
    let spin = 0;
    if (a.form === 'pinwheel') {
      const arms = layers >= 3 ? 2 : 1;
      for (let layer = 0; layer < layers; layer++) {
        const arm = layer % arms, depth = (Math.floor(layer / arms) - 0.5) * 0.22, turns = 1.9 + random() * 0.5, start = (arm * Math.PI * 2) / arms + layer * 0.5;
        ribbon((t) => {
          const angle = start + t * turns * Math.PI * 2, r = 0.14 + 1.85 * t;
          const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
          return { at: radial.clone().multiplyScalar(r).setZ(depth + Math.sin(angle * 1.5) * 0.14 * t), side: radial.clone().setZ(0.3).normalize(), width: (0.1 + 0.8 * t ** 0.8) * ends(t) * mix(0.75, 1.1, a.thickness) };
        }, paint(layer * 13.7), 0.05, 2);
      }
      veil.rotation.x = -0.28;
      spin = 1;
    } else if (a.form === 'plume') {
      const strands = layers + 2, lean = (random() - 0.5) * 0.9, height = 4.2;
      for (let k = 0; k < strands; k++) {
        const turns = 1.1 + random() * 0.9, start = (k / strands) * Math.PI * 2, hand = random() < 0.5 ? -1 : 1, reach = 0.75 + random() * 0.5;
        ribbon((t) => {
          const angle = start + hand * t * turns * Math.PI * 2, r = 0.03 + reach * t ** 1.6;
          const curl = smooth(0.7, 1, t);
          const at = new THREE.Vector3(Math.cos(angle) * r + lean * t * t + Math.sin(t * 5 + start) * 0.18 * t, height * (t - curl * 0.14) + 0.12, Math.sin(angle) * r);
          return { at, side: new THREE.Vector3(-Math.sin(angle), 0.55 - curl * 0.8, Math.cos(angle)).normalize(), width: (0.14 + 1.05 * t ** 0.85) * smooth(1, 0.88, t) * mix(0.75, 1.15, a.thickness) };
        }, paint(k * 5.1), 0.09, 1.5);
      }
      heart = new THREE.Vector3(0, 0.02, 0);
    } else if (a.form === 'curtain') {
      const height = 3.3, span = 3.8;
      for (let layer = 0; layer < layers; layer++) {
        const fold = 6 + random() * 5, phase = random() * 6, drop = height * (1 - layer * 0.12), swing = (random() - 0.5) * 0.5;
        ribbon((t) => {
          const x = (t - 0.5) * span * (1 - layer * 0.08);
          const z = -layer * 0.3 + Math.sin(t * fold + phase) * 0.22 + Math.sin(t * fold * 2.3 + phase) * 0.07 + swing * (t - 0.5);
          const hang = drop * (0.82 + 0.18 * Math.sin(t * 7 + phase * 2)) * mix(0.55, 1, ends(t));
          return { at: new THREE.Vector3(x, height - hang / 2, z), side: new THREE.Vector3(0, 1, Math.sin(t * fold + phase) * 0.12).normalize(), width: hang };
        }, paint(layer * 3.3), 0.012, 1);
      }
      heart = new THREE.Vector3(0, height * 0.52, -0.75);
    } else {
      for (let layer = 0; layer < layers + 1; layer++) {
        const fx = 1 + Math.floor(random() * 3), fy = 2 + Math.floor(random() * 2), fz = 1 + Math.floor(random() * 3), px = random() * 6, pz = random() * 6, size = 1.25 + random() * 0.5;
        ribbon((t) => {
          const angle = t * Math.PI * 2;
          const at = new THREE.Vector3(Math.sin(angle * fx + px) * size, 2 + Math.sin(angle * fy) * size * 0.9, Math.cos(angle * fz + pz) * size * 0.8);
          return { at, side: new THREE.Vector3(Math.cos(angle * 3), Math.sin(angle * 2 + px), Math.sin(angle * 3)).normalize(), width: (0.45 + 0.3 * Math.sin(angle * 2 + pz)) * mix(0.75, 1.2, a.thickness) };
        }, paint(layer * 8.9), 0.07, 3);
      }
      heart = new THREE.Vector3(0, 2, 0);
      spin = 0.5;
    }

    // Ash and sparks.
    const span = new THREE.Box3().setFromObject(veil);
    const size = span.getSize(new THREE.Vector3()), middle = span.getCenter(new THREE.Vector3());
    const flecks = Math.round(mix(14, 90, mood.density) * (a.moment === 'dispersing' ? 1.4 : 1));
    const ash: { at: [number, number, number]; size: number; color: string }[] = [], sparks: { at: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < flecks; i++) {
      const at: [number, number, number] = [middle.x + (random() - 0.5) * size.x * 1.05, Math.max(0.03, middle.y + (random() - 0.5) * size.y * 1.05), middle.z + (random() - 0.5) * Math.max(size.z, 1.2) * 1.2];
      if (emberPower > 0 && random() < (a.moment === 'fresh' ? 0.5 : 0.15)) sparks.push({ at, size: 0.015 + random() * 0.025 });
      else ash.push({ at, size: 0.02 + random() * 0.035, color: random() < 0.5 ? '#2a2628' : '#6d6866' });
    }
    if (ash.length) s.scatter(new THREE.TetrahedronGeometry(1), s.material('#ffffff', { roughness: 1, flatShading: true }), ash);
    if (sparks.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: ember, emissive: ember, emissiveIntensity: 1.2 }), sparks);

    // What the smoke is hiding.
    const secret = new THREE.Group();
    secret.position.copy(heart);
    s.root.add(secret);
    const orb = (radius: number, colour: string, emissive: string, power: number, x = 0) => {
      const star = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 16), new THREE.MeshStandardMaterial({ color: colour, emissive, emissiveIntensity: power, roughness: 1 }));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.6, 20, 14), new THREE.MeshBasicMaterial({ color: emissive, transparent: true, opacity: 0.22, depthWrite: false }));
      star.position.x = halo.position.x = x;
      secret.add(star, halo);
    };
    const lift = a.form === 'plume' ? 0.3 : 0;
    if (a.hiding === 'red-star') { orb(0.3, '#c8402a', '#b8301c', 0.75); secret.position.y += lift; }
    if (a.hiding === 'white-point') { orb(0.1, '#ffffff', '#fff6e0', 1.4); secret.position.y += lift * 0.4; }
    if (a.hiding === 'pair') { orb(0.15, '#fff2d8', '#ffe2a8', 1.2, -0.2); orb(0.09, '#c4553a', '#b03a22', 0.8, 0.22); secret.position.y += lift * 0.6; }
    if (a.hiding === 'candle') {
      const wax = s.material('#e9dfc6', { roughness: 0.7 });
      const stub = new THREE.Group();
      const tall = 0.42 + random() * 0.3;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, tall, 20), wax);
      body.position.y = tall / 2;
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.12, 6), s.material('#1b1818'));
      wick.position.y = tall + 0.05;
      wick.rotation.z = 0.25;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), new THREE.MeshStandardMaterial({ color: ember, emissive: emberPower ? ember : new THREE.Color('#ff7a2a'), emissiveIntensity: 1.4 }));
      tip.position.set(-0.016, tall + 0.11, 0);
      stub.add(body, wick, tip);
      for (let i = 0; i < 5; i++) {
        const drip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), wax);
        const angle = random() * Math.PI * 2;
        drip.position.set(Math.cos(angle) * 0.205, tall * (0.35 + random() * 0.6), Math.sin(angle) * 0.205);
        drip.scale.y = 1.6 + random() * 2;
        stub.add(drip);
      }
      stub.traverse((node) => { node.castShadow = true; });
      // A candle stands on the ground under the smoke, wherever the smoke's own heart is.
      stub.position.set(heart.x, 0, a.form === 'curtain' ? 0.5 : heart.z);
      s.root.add(stub);
      if (a.form === 'plume') veil.position.y = tall;
      else if (a.form !== 'curtain') veil.position.y = Math.max(0, tall + 0.25 - span.min.y);
    }

    const sway = mix(0.01, 0.06, mood.energy), pace = mix(0.25, 1.3, mood.energy);
    return s.finish({
      footprint: 0.9,
      update: (dt, time) => {
        if (spin) veil.rotation[a.form === 'pinwheel' ? 'z' : 'y'] += dt * spin * mix(0.02, 0.2, mood.energy);
        else veil.rotation.z = Math.sin(time * pace) * sway;
      },
    });
  },
});
