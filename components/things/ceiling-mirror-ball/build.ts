import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

const PAIRS = {
  'magenta-cyan': ['#ff2fa8', '#22d8ff'],
  'red-blue': ['#ff3324', '#2a55ff'],
  'amber-pink': ['#ffab2e', '#ff6fa0'],
  'green-purple': ['#3dea5a', '#9a3dff'],
  white: ['#fff3d6', '#fff3d6'],
  dark: ['#30333a', '#30333a'],
} as const;

export default defineThing({
  questions: {
    size: score('How big is the mirror ball?', ['A fist-sized novelty', 'Football sized', 'Beach-ball sized', 'A big ballroom globe']),
    tiles: choice('What are its mirror tiles like?', {
      silver: 'Classic silver mirror squares.',
      gold: 'Gold mirror tiles, wedding and cabaret.',
      rose: 'Pink-tinted mirror, sweet and kitsch.',
      iridescent: 'Rainbow dichroic tiles, every facet a different colour.',
      patchy: 'Half the tiles have fallen off, bald foam showing in patches.',
    }),
    lights: choice('What colour are the two par cans?', {
      'magenta-cyan': 'Hot magenta and cyan, karaoke and synth-pop.',
      'red-blue': 'Red and blue, a roller rink or a school disco.',
      'amber-pink': 'Amber and pink, warm and romantic.',
      'green-purple': 'Acid green and purple, a little queasy.',
      white: 'Plain warm white, a wedding marquee.',
      dark: 'Switched off: only the little pin spot is on.',
    }),
    turning: choice('Is the ball turning?', {
      slow: 'Turning slowly, a slow dance.',
      fast: 'Spinning briskly, the party is on.',
      still: 'Hanging still, motor off.',
      crooked: 'Stalled and hanging crooked on a chain, the motor dead.',
    }),
    rig: choice('What frame does it hang from?', {
      goalpost: 'A truss goalpost: two uprights and a crossbar, a mobile DJ rig.',
      tripod: 'A tripod lighting stand with a T-bar.',
      gallows: 'A single post with a braced arm and a sandbagged base.',
    }),
    haze: noul('Is there haze in the air, so the light beams show as cones?'),
    dressing: choice('What else hangs on the rig?', {
      bare: 'Nothing. Just the kit.',
      tinsel: 'A fringe of foil tinsel along the bar.',
      balloons: 'A bunch of balloons tied to the frame.',
      cables: 'Loose cables drooping to a coiled extension lead on the floor: mid set-up or mid pack-down.',
      bunting: 'A sagging string of triangular paper bunting.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const black = s.material('#1c1d21', { roughness: 0.55, metalness: 0.3 });
    const alloy = s.material('#b9bec4', { roughness: 0.3, metalness: 0.8 });
    const [tintA, tintB] = PAIRS[a.lights];
    const R = mix(0.11, 0.34, a.size);
    const glow = mix(0.9, 2.2, mood.cheer);

    // The frame. Each rig yields an anchor for the drop rod, lamp positions and a bar to dress.
    let anchor: P, lampA: P, lampB: P, pin: P, barA: P, barB: P, post: P;
    if (a.rig === 'goalpost') {
      const W = 1.7, H = 2.15;
      for (const x of [-W / 2, W / 2]) {
        s.box([0.4, 0.02, 0.4], [x, 0.01, 0], black);
        s.cylinder(0.025, 0.025, H, [x, H / 2, 0], alloy, 12);
        s.cylinder(0.035, 0.035, 0.08, [x, 1.05, 0], black, 12);
      }
      for (const y of [H, H - 0.16]) s.rod([-W / 2, y, 0], [W / 2, y, 0], 0.02, alloy);
      const n = 10;
      for (let i = 0; i < n; i++) {
        const x0 = -W / 2 + (W * i) / n, x1 = x0 + W / n;
        s.rod([x0, i % 2 ? H : H - 0.16, 0], [x1, i % 2 ? H - 0.16 : H, 0], 0.008, alloy);
      }
      anchor = [0, H - 0.16, 0]; lampA = [-0.58, H - 0.3, 0]; lampB = [0.58, H - 0.3, 0];
      pin = [W / 2 - 0.09, 1.25, 0.06]; barA = [-W / 2, H - 0.16, 0]; barB = [W / 2, H - 0.16, 0]; post = [W / 2, H, 0];
    } else if (a.rig === 'tripod') {
      const H = 2.0;
      s.cylinder(0.02, 0.026, H - 0.2, [0, (H - 0.2) / 2 + 0.2, 0], alloy, 12);
      s.cylinder(0.034, 0.034, 0.07, [0, 0.75, 0], black, 12);
      s.cylinder(0.034, 0.034, 0.07, [0, 1.2, 0], black, 12);
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + Math.PI / 6;
        const foot: P = [Math.cos(t) * 0.6, 0.02, Math.sin(t) * 0.6];
        s.rod(foot, [0, 0.75, 0], 0.014, black);
        s.rod([foot[0] * 0.5, 0.38, foot[2] * 0.5], [0, 0.3, 0], 0.008, alloy);
        s.ball([0.025, 0.02, 0.025], foot, black, 10);
      }
      s.rod([-0.65, H, 0], [0.65, H, 0], 0.018, alloy);
      s.rod([0, H, 0], [0, H, 0.48], 0.016, alloy);
      s.rod([0, H - 0.3, 0], [0, H, 0.3], 0.008, alloy);
      anchor = [0, H, 0.46]; lampA = [-0.55, H - 0.14, 0]; lampB = [0.55, H - 0.14, 0];
      pin = [0, 1.35, 0.07]; barA = [-0.65, H, 0]; barB = [0.65, H, 0]; post = [0.65, H, 0];
    } else {
      const H = 2.2, px = -0.8;
      s.box([0.62, 0.03, 0.62], [px, 0.015, 0], black);
      const bag = s.ball([0.2, 0.07, 0.13], [px + 0.02, 0.09, 0.19], s.material('#c8742a', { roughness: 0.95 }), 14);
      bag.rotation.y = 0.3;
      s.cylinder(0.028, 0.028, H, [px, H / 2, 0], alloy, 12);
      s.rod([px, H - 0.04, 0], [0.22, H - 0.04, 0], 0.02, alloy);
      s.rod([px, H - 0.55, 0], [-0.25, H - 0.04, 0], 0.012, alloy);
      anchor = [0, H - 0.04, 0]; lampA = [-0.5, H - 0.18, 0]; lampB = [px + 0.07, 1.55, 0.05];
      pin = [px + 0.07, 1.05, 0.06]; barA = [px, H - 0.04, 0]; barB = [0.22, H - 0.04, 0]; post = [px, H, 0];
    }

    // Motor, drop rod (or chain) and the ball itself.
    const crooked = a.turning === 'crooked';
    const drop = mix(0.12, 0.26, random());
    const centre: P = [anchor[0], anchor[1] - 0.07 - drop - R, anchor[2]];
    s.cylinder(0.055, 0.055, 0.016, [anchor[0], anchor[1] - 0.008, anchor[2]], black, 16);
    s.box([0.09, 0.06, 0.07], [anchor[0], anchor[1] - 0.045, anchor[2]], black);
    const hang = new THREE.Group();
    hang.position.set(anchor[0], anchor[1] - 0.07, anchor[2]);
    s.root.add(hang);
    if (crooked) {
      hang.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.12, 0.22, random());
      const links = Math.round(drop / 0.022);
      for (let i = 0; i < links; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.0025, 5, 10), alloy);
        link.position.y = -0.011 - i * 0.022;
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        link.castShadow = true;
        hang.add(link);
      }
    } else {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, drop, 8), alloy);
      rod.position.y = -drop / 2;
      rod.castShadow = true;
      hang.add(rod);
    }
    const ball = new THREE.Group();
    ball.position.y = -drop - R;
    hang.add(ball);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.02, 10), alloy);
    cap.position.y = R + 0.006;
    ball.add(cap);
    const coreTint = a.tiles === 'patchy' ? '#d9d2bd' : a.tiles === 'gold' ? '#5a4310' : '#3a3d44';
    const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 28, 18), s.material(coreTint, { roughness: 0.9 }));
    core.castShadow = true;
    ball.add(core);

    const tile = Math.max(0.014, R * 0.15);
    const rings = Math.max(8, Math.round((Math.PI * R) / tile));
    const spots: { m: THREE.Matrix4; c: THREE.Color; lit: boolean }[] = [];
    const dummy = new THREE.Object3D();
    const patchSeed = random() * 10;
    const base = new THREE.Color({ silver: '#e4eaf2', gold: '#f0c458', rose: '#f6a8c0', iridescent: '#ffffff', patchy: '#dfe4ea' }[a.tiles]);
    const lightTints = a.lights === 'dark' ? ['#ffffff'] : ['#ffffff', tintA, tintB];
    for (let i = 0; i < rings; i++) {
      const phi = ((i + 0.5) / rings) * Math.PI;
      const count = Math.max(4, Math.round((2 * Math.PI * R * Math.sin(phi)) / tile));
      for (let k = 0; k < count; k++) {
        const theta = ((k + (i % 2) * 0.5) / count) * Math.PI * 2;
        const n = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
        const patch = Math.sin(n.x * 3.1 + patchSeed) + Math.sin(n.y * 4.3 + patchSeed * 2) + Math.sin(n.z * 3.7 - patchSeed);
        if (a.tiles === 'patchy' && patch > 0.15) continue;
        if (random() < mood.wear * 0.14) continue;
        dummy.position.copy(n).multiplyScalar(R);
        dummy.lookAt(n.clone().multiplyScalar(R * 2));
        dummy.rotation.z += (random() - 0.5) * mood.wear * 0.5;
        dummy.updateMatrix();
        const lit = random() < 0.16;
        const c = lit
          ? new THREE.Color(lightTints[Math.floor(random() * lightTints.length)]).lerp(new THREE.Color('#ffffff'), 0.35)
          : base.clone();
        if (!lit) {
          if (a.tiles === 'iridescent') c.setHSL(random(), 0.75, 0.62);
          c.multiplyScalar(mix(0.45, 1.05, random()));
        }
        spots.push({ m: dummy.matrix.clone(), c, lit });
      }
    }
    const tileGeo = new THREE.BoxGeometry(tile * 0.88, tile * 0.88, tile * 0.12);
    for (const lit of [false, true]) {
      const set = spots.filter((spot) => spot.lit === lit);
      if (!set.length) continue;
      const material = lit
        ? new THREE.MeshBasicMaterial({ color: '#ffffff' })
        : new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.35, roughness: 0.22 });
      const mesh = new THREE.InstancedMesh(tileGeo, material, set.length);
      set.forEach((spot, index) => { mesh.setMatrixAt(index, spot.m); mesh.setColorAt(index, spot.c); });
      mesh.castShadow = !lit;
      ball.add(mesh);
    }

    // Lamps: a can on a yoke, aimed at the ball, with an optional cone of haze.
    const target = new THREE.Vector3(...centre);
    const lamp = (at: P, tint: string, radius: number, length: number, on: boolean) => {
      const g = new THREE.Group();
      g.position.set(...at);
      g.lookAt(target);
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, z: number) => {
        geometry.rotateX(Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = z;
        mesh.castShadow = true;
        g.add(mesh);
        return mesh;
      };
      add(new THREE.CylinderGeometry(radius, radius * 0.8, length, 16), black, 0);
      add(new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, length * 0.12, 16), alloy, length / 2);
      add(new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, 0.006, 16), new THREE.MeshStandardMaterial({ color: on ? tint : '#2a2c31', emissive: on ? tint : '#000000', emissiveIntensity: glow, roughness: 0.3 }), length / 2 + 0.005).castShadow = false;
      s.root.add(g);
      // Yoke up to the nearest piece of frame.
      s.rod(at, [at[0], at[1] + radius + 0.07, at[2] - (a.rig === 'gallows' && at[1] < 1.8 ? 0.05 : 0)], 0.007, black);
      s.box([radius * 2.3, 0.008, 0.02], [at[0], at[1] + radius + 0.03, at[2]], black);
      if (a.haze && on) {
        const reach = Math.max(0.1, target.distanceTo(g.position) - length / 2 - R * 0.6);
        const cone = new THREE.ConeGeometry(radius + reach * 0.22, reach, 20, 1, true);
        cone.translate(0, -reach / 2, 0);
        cone.rotateX(-Math.PI / 2);
        const beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: radius < 0.05 ? 0.1 : 0.2, depthWrite: false, side: THREE.DoubleSide }));
        beam.position.z = length / 2;
        g.add(beam);
      }
    };
    const on = a.lights !== 'dark';
    lamp(lampA, tintA, 0.075, 0.17, on);
    lamp(lampB, tintB, 0.075, 0.17, on);
    lamp(pin, '#fff6dc', 0.04, 0.11, true);

    // Dressing.
    const festive = ['#ff3f8e', '#ffd22e', '#2fd0ff', '#6ae04a', '#ff7a2a', '#a05aff'];
    const bar = (t: number): P => [mix(barA[0], barB[0], t), mix(barA[1], barB[1], t), mix(barA[2], barB[2], t)];
    if (a.dressing === 'tinsel') {
      const count = Math.round(mix(40, 110, mood.density));
      const strands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 1, 0.002), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.5, roughness: 0.25, emissive: '#ffffff', emissiveIntensity: 0.08 }), count);
      const tint = a.tiles === 'gold' ? ['#ffd65a', '#fff0a8', '#e0a030'] : ['#e8eef6', '#ff6fb4', '#6fd8ff', '#ffe36a'];
      for (let i = 0; i < count; i++) {
        const at = bar(random());
        const length = mix(0.12, 0.42, random()) * (1 - mood.wear * 0.4);
        dummy.position.set(at[0], at[1] - 0.02 - length / 2, at[2] + (random() - 0.5) * 0.03);
        dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.12);
        dummy.scale.set(1, length, 1);
        dummy.updateMatrix();
        strands.setMatrixAt(i, dummy.matrix);
        strands.setColorAt(i, new THREE.Color(tint[Math.floor(random() * tint.length)]));
      }
      strands.castShadow = true;
      s.root.add(strands);
    } else if (a.dressing === 'bunting') {
      const flags = 9;
      const tri = new THREE.Shape();
      tri.moveTo(-0.07, 0); tri.lineTo(0.07, 0); tri.lineTo(0, -0.19); tri.closePath();
      const points: P[] = [];
      for (let i = 0; i <= flags; i++) {
        const t = i / flags, at = bar(t);
        points.push([at[0], at[1] - 0.03 - Math.sin(t * Math.PI) * mix(0.1, 0.3, mood.wear), at[2] + 0.03]);
      }
      s.tube(points, 0.004, s.material('#f0ead8'));
      for (let i = 0; i < flags; i++) {
        if (random() < mood.wear * 0.3) continue;
        const p = points[i], q = points[i + 1];
        const flag = s.mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: festive[i % festive.length], side: THREE.DoubleSide, roughness: 0.8 }), [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, p[2]]);
        flag.rotation.z = Math.atan2(q[1] - p[1], q[0] - p[0]) + (random() - 0.5) * 0.15;
      }
    } else if (a.dressing === 'balloons') {
      const count = Math.round(mix(3, 8, mood.density));
      const knot: P = [post[0], post[1] - 0.35, post[2]];
      for (let i = 0; i < count; i++) {
        const tint = festive[Math.floor(random() * festive.length)];
        const skin = s.material(tint, { roughness: 0.25, emissive: tint, emissiveIntensity: 0.12 });
        const limp = random() < mix(0.75, 0.05, mood.cheer) * 0.8 + mood.wear * 0.2;
        if (limp) {
          const at: P = [post[0] + (random() - 0.5) * 0.7, 0.045, 0.2 + random() * 0.35];
          s.ball([0.09, 0.045, 0.07], at, skin, 14).rotation.y = random() * 3;
          s.tube([knot, [mix(knot[0], at[0], 0.4), 0.5, at[2] * 0.5], at], 0.0025, s.material('#f0ead8'));
        } else {
          const t = random() * Math.PI * 2, reach = mix(0.25, 0.6, random());
          const at: P = [knot[0] + Math.cos(t) * reach * 0.6, knot[1] + 0.35 + reach * 0.8, knot[2] + Math.sin(t) * reach * 0.5];
          s.ball([0.12, 0.145, 0.12], at, skin, 16);
          s.ball([0.012, 0.012, 0.012], [at[0], at[1] - 0.15, at[2]], skin, 8);
          s.rod(knot, [at[0], at[1] - 0.15, at[2]], 0.0025, s.material('#f0ead8'));
        }
      }
    } else if (a.dressing === 'cables') {
      const cable = s.material('#17181b', { roughness: 0.7 });
      const foot: P = [post[0] + (post[0] > 0 ? -0.25 : 0.3), 0.012, 0.3];
      s.tube([lampA, [lampA[0], lampA[1] + 0.2, lampA[2]], bar(0.5), [post[0], post[1] - 0.25, 0.03], [post[0], 1.1, 0.06], [post[0] + (foot[0] - post[0]) * 0.3, 0.25, 0.14], foot], 0.008, cable);
      for (let i = 0; i < 4; i++) {
        const coil = s.ring(0.13 + random() * 0.02, 0.008, [foot[0] + (random() - 0.5) * 0.02, 0.01 + i * 0.014, foot[2] + (random() - 0.5) * 0.02], i === 2 ? s.material('#e8792a') : cable);
        coil.rotation.x = Math.PI / 2;
      }
      s.box([0.24, 0.035, 0.06], [foot[0] + 0.28, 0.018, foot[2] + 0.1], s.material('#e9e6dc', { roughness: 0.5 })).rotation.y = 0.5;
      s.ball([0.006, 0.006, 0.006], [foot[0] + 0.2, 0.038, foot[2] + 0.145], new THREE.MeshBasicMaterial({ color: '#ff3a1c' }), 8);
    }

    const speed = a.turning === 'fast' ? mix(0.9, 2.6, mood.energy) : a.turning === 'slow' ? mix(0.15, 0.6, mood.energy) : 0;
    ball.rotation.y = random() * Math.PI * 2;
    return s.finish({
      update: (dt, time) => {
        ball.rotation.y += dt * speed;
        if (crooked) hang.rotation.x = Math.sin(time * 0.8) * 0.02 * mood.energy;
      },
    });
  },
});
