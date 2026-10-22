import * as THREE from 'three';
import { choice, clamp01, defineThing, disposeTree, mix, noul, score } from '@conjure/kit';

export default defineThing({
  questions: {
    core: score('How dense is the core?', ['Loose and even, a soft puff with no real middle', 'Gently gathered', 'A bright packed heart', 'Collapsed: a blinding knot with a thin halo round it']),
    colour: choice('What colour are its stars?', {
      gold: 'All old honey gold, uniform and settled.',
      stragglers: 'Old gold with a few vivid blue stragglers that somehow stayed young.',
      silver: 'Pale silver-yellow, cooler and frostier, like sugar.',
      ruddy: 'Amber sprinkled with fat red giants, like embers in a hearth.',
    }),
    stream: choice('Is it losing stars?', {
      intact: 'No. A complete, perfect ball.',
      tails: 'A thin stream of stars leaks away from two opposite sides.',
      unravelling: 'It is being pulled apart: long curved tails, and the ball itself drawn into an oval.',
      shedding: 'It is shedding evenly, a loose drift of strays all around it like seeds off a dandelion.',
    }),
    size: score('How big and populous is it?', ['A small sparse knot of a few hundred', 'Modest', 'Rich', 'Enormous, hundreds of thousands, a full glitter ball']),
    giants: noul('Do a few of its brightest stars flare with crossed spikes of light?'),
    mount: choice('How is it presented?', {
      free: 'Floating free.',
      stem: 'On a slender stalk, like a dandelion clock.',
      globe: 'Sealed in a glass dome on a turned base, a snow globe.',
      hung: 'Hanging from a little stand by a thread, like a glitter ball or a bauble.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const ball = new THREE.Group();
    root.add(ball);
    const R = mix(1.3, 2.7, a.size);
    const count = Math.round(mix(1400, 7000, a.size ** 1.2) * mix(0.8, 1.2, mood.density));
    const coreRadius = R * mix(0.46, 0.17, a.core);

    const base = { gold: ['#fff0b8', '#f2b530', '#c9801a'], stragglers: ['#fff0b8', '#f2b530', '#c9801a'], silver: ['#f6efc4', '#cdb44e', '#8f8040'], ruddy: ['#ffe2a0', '#f09a2a', '#b85a18'] }[a.colour].map((hex) => new THREE.Color(hex).offsetHSL(mix(0.02, -0.015, mood.warmth), 0, 0));
    const blue = new THREE.Color('#2f74ff'), red = new THREE.Color('#e0381c');

    const lost = { intact: 0, tails: 0.13, unravelling: 0.34, shedding: 0.16 }[a.stream];
    const axis = new THREE.Vector3(random() - 0.5, (random() - 0.5) * 0.5, random() - 0.5).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(axis).normalize();
    const squash = a.stream === 'unravelling' ? 1.35 : 1;

    const stars = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), count);
    const matrix = new THREE.Matrix4(), tint = new THREE.Color(), at = new THREE.Vector3();
    const bright: { at: THREE.Vector3; size: number; tint: THREE.Color }[] = [];
    let reach = R, lowest = 0;
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, v = random() * 2 - 1, flat = Math.sqrt(1 - v * v);
      at.set(flat * Math.cos(angle), v, flat * Math.sin(angle));
      let radius: number;
      if (i / count < lost && a.stream !== 'shedding') {
        // A tidal tail: strays strung out along the orbit, one stream leading and one trailing, bending as they go.
        const out = random() ** 1.5, sign = i % 2 ? 1 : -1;
        const along = R * (0.7 + out * (a.stream === 'unravelling' ? 1.5 : 1.05));
        at.multiplyScalar(R * mix(0.3, 0.1, out) * random()).addScaledVector(axis, sign * along).addScaledVector(side, sign * out * out * R * 0.55);
        radius = R;
      } else if (i / count < lost) {
        radius = R * mix(0.95, 1.6, random() ** 1.6);
        at.multiplyScalar(radius);
      } else {
        // A Plummer ball: most stars near the core radius, a long thin skirt beyond.
        do radius = coreRadius / Math.sqrt(Math.max(1e-6, (0.02 + random() * 0.98) ** (-2 / 3) - 1)); while (radius > R);
        at.multiplyScalar(radius);
        if (squash > 1) at.addScaledVector(axis, at.dot(axis) * (squash - 1));
      }
      reach = Math.max(reach, at.length());
      lowest = Math.min(lowest, at.y);
      const depth = clamp01(radius / R);
      let size = mix(0.02, 0.044, random() ** 2) * mix(1.15, 0.9, a.size) * (1 + (1 - depth) * 0.25);
      tint.copy(base[0]).lerp(base[1], clamp01(depth * 2.2 + (random() - 0.5) * 0.5)).lerp(base[2], clamp01(depth * 1.6 - 0.35 + (random() - 0.5) * 0.6));
      const special = random();
      if (a.colour === 'stragglers' && special < 0.022) { tint.copy(blue).offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.1); size *= 2.1; }
      if (a.colour === 'ruddy' && special < 0.035) { tint.copy(red).offsetHSL((random() - 0.5) * 0.03, 0, 0); size *= 2.4; }
      if (special > 0.992 && bright.length < 9) bright.push({ at: at.clone(), size: size * 2.6, tint: tint.clone() });
      stars.setMatrixAt(i, matrix.makeRotationY(random() * 3).scale(new THREE.Vector3(size, size * 1.25, size)).setPosition(at));
      stars.setColorAt(i, tint);
    }
    stars.castShadow = true;
    ball.add(stars);

    // The unresolved blaze at the heart: too many stars to count.
    const glow = base[1].clone().lerp(base[0], 0.35);
    for (const [scale, opacity] of [[1.9, 0.16], [1.25, 0.3]] as const) {
      const haze = new THREE.Mesh(new THREE.SphereGeometry(coreRadius * scale + R * 0.12, 24, 16), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: opacity * mix(0.7, 1.2, a.core), depthWrite: false }));
      if (squash > 1) haze.scale.copy(new THREE.Vector3(1, 1, 1).addScaledVector(new THREE.Vector3(Math.abs(axis.x), Math.abs(axis.y), Math.abs(axis.z)), 0.3));
      ball.add(haze);
    }
    const heart = new THREE.Mesh(new THREE.SphereGeometry(coreRadius * mix(0.45, 0.8, a.core) + R * 0.03, 20, 14), new THREE.MeshBasicMaterial({ color: base[0].clone().lerp(base[1], 0.25) }));
    ball.add(heart);

    if (a.giants) {
      const spikes = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: '#ffffff' }), bright.length * 3);
      const turn = new THREE.Quaternion(), scale = new THREE.Vector3();
      bright.forEach((star, i) => {
        const long = star.size * mix(5, 9, random());
        ([[long, 0], [long, Math.PI / 2], [0, 0]] as const).forEach(([length, roll], k) => {
          turn.setFromEuler(new THREE.Euler(0, 0, roll));
          scale.set(length ? star.size * 0.3 : star.size * 1.3, length || star.size * 1.3, length ? star.size * 0.3 : star.size * 1.3);
          spikes.setMatrixAt(i * 3 + k, matrix.compose(star.at, turn, scale));
          spikes.setColorAt(i * 3 + k, tint.copy(star.tint).lerp(new THREE.Color('#fff7dc'), k === 2 ? 0.1 : 0.5));
        });
      });
      ball.add(spikes);
    }

    // How it stands.
    let height = -lowest + 0.03;
    const brass = new THREE.MeshStandardMaterial({ color: '#a8792f', metalness: 0.7, roughness: mix(0.3, 0.65, mood.wear) });
    const lathe = (profile: number[][], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 40), material);
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    if (a.mount === 'stem') {
      const stalk = R * mix(1.3, 1.9, random());
      height = R * 0.55 + stalk;
      const green = new THREE.MeshStandardMaterial({ color: new THREE.Color('#7c9a4a').lerp(new THREE.Color('#a08a5a'), mood.wear * 0.7), roughness: 0.8 });
      const lean = (random() - 0.5) * R * 0.5;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(lean, 0, 0), new THREE.Vector3(lean * 0.7, stalk * 0.45, lean * 0.2), new THREE.Vector3(0, height - coreRadius * 0.5, 0)]);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, R * 0.035, 8), green);
      stem.castShadow = true;
      root.add(stem);
      // The receptacle the seeds grow from, and a ruff of sepals under it.
      const cup = new THREE.Mesh(new THREE.SphereGeometry(R * 0.13, 14, 10), green);
      cup.position.y = height - R * 0.02;
      root.add(cup);
      for (let i = 0; i < 9; i++) {
        const sepal = new THREE.Mesh(new THREE.ConeGeometry(R * 0.035, R * 0.34, 5), green);
        const angle = (i / 9) * Math.PI * 2;
        sepal.position.set(Math.cos(angle) * R * 0.14, height - R * 0.2, Math.sin(angle) * R * 0.14);
        sepal.rotation.set(Math.sin(angle) * -0.75 + Math.PI, 0, Math.cos(angle) * 0.75);
        sepal.castShadow = true;
        root.add(sepal);
      }
    } else if (a.mount === 'globe') {
      const glassR = R * 1.08;
      const plinth = R * 0.42;
      height = plinth + glassR * 0.86;
      lathe([[0, 0], [glassR * 0.86, 0], [glassR * 0.9, plinth * 0.2], [glassR * 0.78, plinth * 0.42], [glassR * 0.7, plinth * 0.8], [glassR * 0.74, plinth], [0, plinth]], new THREE.MeshStandardMaterial({ color: new THREE.Color('#3b2a22').lerp(new THREE.Color('#7a2f2a'), mood.cheer * 0.8), roughness: 0.45 }));
      lathe([[glassR * 0.72, plinth * 0.98], [glassR * 0.76, plinth * 1.06], [glassR * 0.72, plinth * 1.12]], brass);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(glassR, 40, 24), new THREE.MeshPhysicalMaterial({ color: '#dff1f5', transparent: true, opacity: 0.16, roughness: 0.03, depthWrite: false }));
      glass.position.y = height;
      root.add(glass);
      // A window reflected in the glass.
      const shine = new THREE.Mesh(new THREE.SphereGeometry(glassR * 1.004, 16, 8, 0.5, 0.55, 0.75, 0.6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
      shine.position.y = height;
      root.add(shine);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(glassR, glassR * 0.008, 6, 64), new THREE.MeshBasicMaterial({ color: '#7f9aa3' }));
      rim.position.y = height;
      rim.rotation.set(-0.56, 0.68, 0);
      root.add(rim);
    } else if (a.mount === 'hung') {
      const top = height * 2 + R * 0.9, arm = R * 1.3;
      lathe([[0, 0], [R * 0.5, 0], [R * 0.52, R * 0.05], [R * 0.2, R * 0.1], [R * 0.05, R * 0.16]], brass).position.x = -arm;
      const hook = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-arm, 0.05, 0), new THREE.Vector3(-arm, top * 0.8, 0), new THREE.Vector3(-arm * 0.7, top, 0), new THREE.Vector3(-arm * 0.15, top * 1.01, 0), new THREE.Vector3(0, top * 0.95, 0)]), 40, R * 0.03, 8), brass);
      hook.castShadow = true;
      root.add(hook);
      height = height + R * 0.25;
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.008, R * 0.008, top * 0.95 - height, 5), new THREE.MeshBasicMaterial({ color: '#4a4a4a' }));
      thread.position.y = (top * 0.95 + height) / 2;
      root.add(thread);
    }
    ball.position.y = height;

    const drift = mix(0.02, 0.22, mood.energy) * (random() < 0.5 ? -1 : 1);
    return {
      object: root,
      footprint: a.mount === 'hung' ? R * 1.5 : R * 1.15,
      update: (dt) => { ball.rotation.y += dt * drift; },
      dispose: () => disposeTree(root),
    };
  },
});
