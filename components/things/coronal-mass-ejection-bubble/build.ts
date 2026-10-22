import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { makeNoise, plasmaPaint, strand, vec } from './plasma';

const LIGHTS = {
  coronagraph: 'Coronagraph white light: pale blue-white shells and a white-hot core.',
  gold: 'Gold and orange plasma, glowing like embers blown outward.',
  euv: 'Extreme-ultraviolet false colour: teal and green.',
  halpha: 'Hydrogen-alpha red, the core a deep crimson rope.',
} as const;
const TONES: Record<keyof typeof LIGHTS, { shell: string; deep: string; core: string; tip: string; edge: string }> = {
  coronagraph: { shell: '#8fb2ff', deep: '#2f58c0', core: '#ffffff', tip: '#ffd77a', edge: '#e8f0ff' },
  gold: { shell: '#ffb050', deep: '#d24a08', core: '#fffbe8', tip: '#ff8a1c', edge: '#ffe2a8' },
  euv: { shell: '#7ee8c8', deep: '#11866a', core: '#f2fff8', tip: '#3fd0a0', edge: '#d8fff0' },
  halpha: { shell: '#ff9a88', deep: '#b81a0c', core: '#fff0ea', tip: '#e02a18', edge: '#ffd6cc' },
};

export default defineThing({
  questions: {
    shape: choice('What shape is the cloud?', {
      lightbulb: 'The classic lightbulb: a round bulb on a narrow neck, still tied to the star.',
      balloon: 'A great round bubble barely tethered by a thin stalk.',
      bullet: 'Long and narrow, stretched by its speed like a bullet.',
      ragged: 'A lumpy torn cloud with frayed edges, coming apart as it goes.',
    }),
    heading: choice('Which way is it travelling?', {
      up: 'Straight out from the limb, seen side-on.',
      leaning: 'Leaning off to one side, thrown at an angle.',
      toward: 'Tipped toward us, the bulb swelling into a halo.',
    }),
    core: choice('What is at its heart?', {
      rope: 'A bright twisted flux rope of three strands winding round each other.',
      braid: 'A braid of many fine glowing threads.',
      prominence: 'A tangled knot of erupted prominence, bright and lumpy.',
      hollow: 'Nothing: a dark empty cavity inside the bright shell.',
    }),
    light: choice('What light is it seen in?', LIGHTS),
    shock: choice('What runs ahead of it?', {
      none: 'Nothing: the bubble is the front.',
      shell: 'A thin faint shock shell, like a ripple ahead of a boat.',
      storm: 'A wide shock with a spray of energetic particles sparkling ahead.',
    }),
    base: choice('What has it left behind on the surface?', {
      arcade: 'A row of bright little loops glowing where it tore free.',
      dimming: 'A dark dimmed patch, the hole where the mass came from.',
      legs: 'Its two legs still rooted in bright footpoints.',
    }),
    target: choice('Is anything small caught in its path?', {
      nothing: 'Nothing: open space.',
      planet: 'A small blue planet about to be engulfed, its auroras already glowing.',
      probe: 'A tiny spacecraft with its panels spread, about to be hit.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random, seed } = context;
    const tone = TONES[a.light];
    const noise = makeNoise(seed);
    const energy = mood.energy;
    const materials: THREE.ShaderMaterial[] = [];
    const paint = (options: Parameters<typeof plasmaPaint>[0]) => {
      const material = plasmaPaint(options);
      materials.push(material);
      return material;
    };
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const dull = new THREE.Color('#5a4a40');
    const deep = new THREE.Color(tone.deep).lerp(dull, mood.wear * 0.3);
    const shellColour = new THREE.Color(tone.shell).lerp(dull, mood.wear * 0.2);

    // ---- The bulb: a lathe profile, stretched along its flight by its speed. ----
    const stretch = mix(0.85, 1.4, energy);
    const B = { lightbulb: 1.3, balloon: 1.55, bullet: 0.95, ragged: 1.35 }[a.shape];
    const neck = { lightbulb: 0.32, balloon: 0.14, bullet: 0.3, ragged: 0.36 }[a.shape];
    const cap = { lightbulb: 1, balloon: 1, bullet: 2.1, ragged: 1.1 }[a.shape] * B * stretch;
    const centre = { lightbulb: 2.0, balloon: 2.6, bullet: 1.7, ragged: 1.9 }[a.shape] * stretch;
    const L = centre + cap;
    const rough = a.shape === 'ragged' ? 0.18 : 0.04;
    const radiusAt = (y: number, angle = 0) => {
      let r: number;
      if (y >= centre) r = B * Math.sqrt(Math.max(0, 1 - ((y - centre) / cap) ** 2));
      else {
        const t = Math.max(0, y / centre);
        r = a.shape === 'balloon' ? mix(neck, B, Math.max(0, (t - 0.45) / 0.55) ** 0.5 * Math.min(1, t * 3)) : mix(neck, B, t * t * (3 - 2 * t));
      }
      return r * (1 + rough * noise(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5 + y * 0.8, 2));
    };
    const cme = new THREE.Group();
    s.root.add(cme);
    const bulbGeometry = (scale: number, rings = 40, sides = 48) => {
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      for (let i = 0; i <= rings; i++) {
        const t = i / rings, y = t * L;
        for (let j = 0; j <= sides; j++) {
          const angle = (j / sides) * Math.PI * 2;
          const r = radiusAt(y, angle) * scale;
          positions.push(Math.cos(angle) * r, y * (scale < 1 ? mix(1, scale, t) : 1), Math.sin(angle) * r);
          uvs.push(j / sides, t);
        }
      }
      for (let i = 0; i < rings; i++)
        for (let j = 0; j < sides; j++) {
          const p = i * (sides + 1) + j, q = p + sides + 1;
          indices.push(p, q, p + 1, q, q + 1, p + 1);
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };
    const shimmer = mix(0.05, 0.3, energy), speed = mix(0.1, 0.9, energy);
    // Outer shell: see-through in the middle, bright at its edges.
    const shell = new THREE.Mesh(bulbGeometry(1), paint({
      base: tone.edge, crown: shellColour, vertical: true, gamma: 0.6, opacity: 0.85, rim: 1, rimPower: 1.6, depthWrite: false, side: THREE.DoubleSide,
      fade: [0.05, 0], shimmer, waves: 3, speed: -speed,
    }));
    cme.add(shell);
    // A faint fill so the bubble has body against a pale sky.
    cme.add(new THREE.Mesh(bulbGeometry(0.97), paint({ base: tone.edge, crown: shellColour, vertical: true, opacity: 0.16, depthWrite: false, fade: [0.08, 0] })));
    // The dark cavity under the bright front.
    if (a.core === 'hollow' || a.shape !== 'bullet') {
      const cavity = new THREE.Mesh(bulbGeometry(0.72), new THREE.MeshBasicMaterial({ color: deep.clone().lerp(new THREE.Color('#10121c'), 0.55), transparent: true, opacity: a.core === 'hollow' ? 0.17 : 0.09, depthWrite: false }));
      cavity.position.y = L * 0.1;
      cme.add(cavity);
    }

    // The bright leading edge: a bundle of strands over the front of the bubble.
    const frontPaint = paint({ base: tone.core, crown: deep, arch: 1, gamma: 0.5, glow: 1.1, shimmer, waves: 2, speed });
    const frontStrands = a.shape === 'ragged' ? 5 : 3;
    for (let k = 0; k < frontStrands; k++) {
      const lean = jitter(0.5), shrink = mix(0.94, 1.02, random());
      const points: THREE.Vector3[] = [];
      const low = centre * 0.45, bow = lean * B * 0.25;
      // Up the left side of the neck, over the dome, and down the right side.
      for (let i = 0; i <= 8; i++) {
        const y = mix(low, centre, i / 8);
        points.push(vec(-radiusAt(y, Math.PI) * shrink, y, bow * (i / 8) * 0.5));
      }
      for (let i = 1; i < 32; i++) {
        const angle = Math.PI * (i / 32);
        points.push(vec(-Math.cos(angle) * radiusAt(centre, Math.cos(angle) < 0 ? Math.PI : 0) * shrink, centre + Math.sin(angle) * cap * shrink, bow * (0.5 + 0.5 * Math.sin(angle))));
      }
      for (let i = 0; i <= 8; i++) {
        const y = mix(centre, low, i / 8);
        points.push(vec(radiusAt(y, 0) * shrink, y, bow * (1 - i / 8) * 0.5));
      }
      const mesh = new THREE.Mesh(strand(points, { radius: (t) => B * mix(0.012, 0.03, Math.sin(Math.PI * t)) * (k === 0 ? 1.3 : 0.8), rings: 64, sides: 6 }), frontPaint);
      mesh.castShadow = true;
      cme.add(mesh);
    }

    // ---- The core: a twisted rope, a braid, a knotted prominence, or nothing. ----
    const corePaint = paint({ base: tone.core, crown: tone.tip, arch: 1, gamma: 0.8, glow: 1.15, shimmer: shimmer * 1.3, waves: 4, speed: speed * 1.4 });
    const axisPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const angle = Math.PI * (i / 24);
      axisPoints.push(vec(-Math.cos(angle) * mix(neck * 0.6, B * 0.5, Math.sin(angle)), Math.sin(angle) * centre * 0.95, Math.sin(angle * 2) * B * 0.08));
    }
    const axis = new THREE.CatmullRomCurve3(axisPoints, false, 'centripetal');
    const frames = axis.computeFrenetFrames(160, false);
    const helix = (count: number, radius: number, turns: number, thickness: number, wobble = 0) => {
      for (let k = 0; k < count; k++) {
        const phase = (k / count) * Math.PI * 2 + jitter(wobble);
        const twist = turns * (1 + jitter(wobble * 0.5));
        const points: THREE.Vector3[] = [];
        for (let i = 0; i <= 160; i++) {
          const t = i / 160, angle = phase + t * twist * Math.PI * 2;
          const swell = Math.sin(Math.PI * t) ** 0.5;
          const rr = radius * swell * (1 + wobble * noise(t * 8, k, 3));
          points.push(axis.getPointAt(t).addScaledVector(frames.normals[i], Math.cos(angle) * rr).addScaledVector(frames.binormals[i], Math.sin(angle) * rr));
        }
        const mesh = new THREE.Mesh(strand(points, { radius: (t) => thickness * (0.5 + 0.5 * Math.sin(Math.PI * t)), rings: 160, sides: 6 }), corePaint);
        mesh.castShadow = true;
        cme.add(mesh);
      }
    };
    if (a.core === 'rope') helix(3, B * 0.13, 4.5, B * 0.045);
    else if (a.core === 'braid') helix(6, B * 0.17, 2.2, B * 0.014, 1.1);
    else if (a.core === 'prominence') {
      helix(4, B * 0.1, 2.5, B * 0.03, 1.2);
      const knotPaint = paint({ base: tone.core, crown: tone.tip, vertical: true, gamma: 1, glow: 1.15, shimmer, waves: 1.5, speed });
      for (let i = 0; i < 6; i++) {
        const at = axis.getPointAt(mix(0.3, 0.7, random()));
        const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(B * mix(0.08, 0.16, random()), 1), knotPaint);
        knot.position.copy(at).add(vec(jitter(B * 0.2), jitter(B * 0.2), jitter(B * 0.15)));
        knot.scale.set(1, mix(0.6, 1.4, random()), 1);
        knot.castShadow = true;
        cme.add(knot);
      }
    }

    // ---- The base left on the surface. ----
    const flat = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, y = 0.01) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.rotation.x = -Math.PI / 2;
      s.root.add(mesh);
      return mesh;
    };
    const ground = new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.edge).lerp(new THREE.Color(tone.tip), 0.35) });
    if (a.base === 'arcade') {
      const loops = 6;
      for (let i = 0; i < loops; i++) {
        const z = (i / (loops - 1) - 0.5) * neck * 3.4;
        const w = neck * mix(0.9, 1.3, random()), h = w * mix(0.8, 1.2, random());
        const points: THREE.Vector3[] = [];
        for (let j = 0; j <= 12; j++) {
          const angle = Math.PI * j / 12;
          points.push(vec(-Math.cos(angle) * w, Math.sin(angle) * h, z));
        }
        const loop = new THREE.Mesh(strand(points, { radius: () => B * 0.022, rings: 24, sides: 6 }), paint({ base: '#ffffff', crown: tone.tip, arch: 1, gamma: 0.8, glow: 1.1, shimmer: 0.15, waves: 2, speed }));
        loop.castShadow = true;
        s.root.add(loop);
      }
      for (const side of [-1, 1]) flat(new THREE.PlaneGeometry(neck * 0.35, neck * 3.8), ground, side * neck * 1.05, 0);
    } else if (a.base === 'dimming') {
      const dark = flat(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: deep.clone().lerp(new THREE.Color('#14100e'), 0.7), roughness: 1 }), 0, 0, 0.006);
      dark.scale.set(neck * 3.2, neck * 2.2, 1);
      const ring = flat(new THREE.RingGeometry(1, 1.25, 40), ground, 0, 0, 0.008);
      ring.scale.copy(dark.scale);
    } else {
      for (const side of [-1, 1]) {
        flat(new THREE.CircleGeometry(neck * 0.7, 24), ground, side * neck * 0.6, 0);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(neck * 1.1, 18, 12), paint({ base: tone.tip, crown: tone.edge, vertical: true, opacity: 0.55, rim: 1, rimPower: 1.2, depthWrite: false }));
        glow.position.set(side * neck * 0.6, 0, 0);
        glow.scale.y = 0.45;
        s.root.add(glow);
      }
    }

    // ---- The shock running ahead, and its spray. ----
    let spray: THREE.InstancedMesh | null = null;
    const sprayAt: { x: number; y: number; z: number; rise: number; phase: number }[] = [];
    if (a.shock !== 'none') {
      const wide = a.shock === 'storm';
      const S = B * (wide ? 1.75 : 1.4);
      const front = new THREE.SphereGeometry(S, 48, 20, 0, Math.PI * 2, 0, wide ? 1.2 : 1.0);
      const shock = new THREE.Mesh(front, paint({ base: tone.edge, crown: shellColour, opacity: wide ? 0.75 : 0.6, rim: 1, rimPower: 2.4, depthWrite: false, side: THREE.DoubleSide }));
      shock.position.y = L + B * (wide ? 0.4 : 0.25) - S;
      shock.scale.y = mix(1, 1.3, energy);
      cme.add(shock);
      // Its crisp front edge as a thin bright line.
      const line: THREE.Vector3[] = [];
      const reach = wide ? 1.2 : 1.0;
      for (let i = 0; i <= 30; i++) {
        const angle = -reach + (i / 30) * reach * 2;
        line.push(vec(Math.sin(angle) * S, shock.position.y + Math.cos(angle) * S * shock.scale.y, 0));
      }
      const edge = new THREE.Mesh(strand(line, { radius: () => B * 0.008, rings: 48, sides: 5 }), new THREE.MeshBasicMaterial({ color: new THREE.Color(tone.edge).lerp(shellColour, 0.5) }));
      cme.add(edge);
      if (wide) {
        const count = Math.round(mix(40, 120, energy));
        spray = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: tone.edge }), count);
        for (let i = 0; i < count; i++) {
          const angle = jitter(2.2), r = S * mix(1.02, 1.3, random());
          sprayAt.push({ x: Math.sin(angle) * r, y: shock.position.y + Math.cos(angle) * r * shock.scale.y, z: jitter(S * 0.8), rise: B * mix(0.1, 0.4, random()), phase: random() });
        }
        cme.add(spray);
      }
    }

    // ---- Whatever is caught in its path. ----
    let victim: THREE.Object3D | null = null;
    const ahead = L + B * (a.shock === 'none' ? 0.5 : a.shock === 'storm' ? 1.0 : 0.8);
    if (a.target === 'planet') {
      const planet = new THREE.Group();
      const r = B * 0.22;
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#2d66b8';
      g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = random() < 0.6 ? '#4c8a3a' : '#c2a46a';
        g.beginPath();
        g.ellipse(random() * 128, mix(10, 54, random()), mix(5, 14, random()), mix(3, 9, random()), random() * 3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 14; i++) g.fillRect(random() * 128, random() * 64, mix(6, 22, random()), 2);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), new THREE.MeshStandardMaterial({ map, roughness: 0.6 }));
      globe.castShadow = true;
      planet.add(globe);
      // Auroral rings at both poles, and the faint bow of its magnetic shield facing the storm.
      const aurora = new THREE.MeshBasicMaterial({ color: '#4dff9a' });
      for (const pole of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.05, 6, 32), aurora);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = pole * r * 0.9;
        planet.add(ring);
      }
      const bow = new THREE.Mesh(new THREE.SphereGeometry(r * 2.4, 32, 12, 0, Math.PI * 2, 0, 1.1), paint({ base: '#9fe8ff', crown: '#4aa8ff', opacity: 0.6, rim: 1, rimPower: 2, depthWrite: false, side: THREE.DoubleSide }));
      bow.rotation.x = Math.PI;
      bow.position.y = r * 1.2;
      planet.add(bow);
      planet.position.set(jitter(B * 0.6), ahead + r * 1.4, 0);
      planet.rotation.z = 0.4;
      cme.add(planet);
      victim = planet;
    } else if (a.target === 'probe') {
      const probe = new THREE.Group();
      const size = B * 0.12;
      const body = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshStandardMaterial({ color: '#d8b04a', metalness: 0.6, roughness: 0.35 }));
      probe.add(body);
      const panel = new THREE.MeshStandardMaterial({ color: '#23366e', metalness: 0.4, roughness: 0.4, emissive: '#16245a', emissiveIntensity: 0.3 });
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(size * 2.4, size * 0.05, size * 0.9), panel);
        wing.position.x = side * size * 1.8;
        probe.add(wing);
      }
      const dish = new THREE.Mesh(new THREE.SphereGeometry(size * 0.7, 16, 8, 0, Math.PI * 2, 0, 1), new THREE.MeshStandardMaterial({ color: '#efeee8', roughness: 0.5, side: THREE.DoubleSide }));
      dish.position.y = size * 0.5;
      probe.add(dish);
      probe.traverse((node) => { node.castShadow = true; });
      probe.position.set(jitter(B * 0.8), ahead + size, jitter(B * 0.3));
      probe.rotation.set(jitter(1), jitter(2), jitter(1));
      cme.add(probe);
      victim = probe;
    }

    // ---- Heading: the whole cloud turns about its root. ----
    const lean = (random() < 0.5 ? -1 : 1);
    if (a.heading === 'leaning') cme.rotation.z = lean * mix(0.35, 0.55, random());
    if (a.heading === 'toward') cme.rotation.x = mix(0.8, 1.0, random());

    const matrix = new THREE.Matrix4();
    const pace = mix(0.1, 0.8, energy);
    const placeSpray = (time: number) => {
      if (!spray) return;
      sprayAt.forEach((p, i) => {
        const climb = (time * pace * 0.3 + p.phase) % 1;
        const size = B * 0.018 * (1 - climb * 0.6);
        spray!.setMatrixAt(i, matrix.makeScale(size, size * 2.5, size).setPosition(p.x * (1 + climb * 0.1), p.y + climb * p.rise, p.z));
      });
      spray.instanceMatrix.needsUpdate = true;
    };
    placeSpray(0);
    const victimHome = victim?.position.clone();
    return s.finish({
      footprint: B * 0.8,
      update: (_dt, time) => {
        for (const material of materials) material.uniforms.time.value = time;
        const breathe = 1 + Math.sin(time * pace) * 0.015;
        shell.scale.set(breathe, 1 + (breathe - 1) * 2, breathe);
        placeSpray(time);
        if (victim && victimHome) {
          victim.position.y = victimHome.y + Math.sin(time * 0.5) * B * 0.02;
          victim.rotation.y += 0.002 * pace;
        }
      },
    });
  },
});
