import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
const HAZE: Record<string, [string, string]> = {
  violet: ['#9a7fe0', '#5b3fb0'],
  magenta: ['#e070b8', '#a02f86'],
  cyan: ['#6fc4dc', '#2b7fa6'],
  amber: ['#eeb45a', '#b8732a'],
  none: ['#ffffff', '#ffffff'],
};

export default defineThing({
  questions: {
    crowd: score('How crowded is the cluster?', ['A loose village of a few dozen', 'A busy town', 'A packed city of hundreds', 'A crush with no room between them']),
    shape: choice('What shape has the swarm settled into?', {
      round: 'A calm round ball, long settled.',
      elongated: 'Stretched into a cigar along the thread that feeds it.',
      double: 'Two cores side by side, two crowds that have not finished merging.',
      ragged: 'Lumpy and unfinished, several clumps still finding each other.',
    }),
    haze: choice('What colour is the hot haze that fills it?', {
      violet: 'X-ray violet, the classic false colour.',
      magenta: 'Hot magenta, feverish.',
      cyan: 'Cool cyan, thin and clean.',
      amber: 'Amber, like smog over a city at dusk.',
      none: 'No haze shown: only the galaxies themselves.',
    }),
    giant: choice('What sits at the centre?', {
      bloated: 'One bloated giant elliptical with a wide soft halo, fat from eating its neighbours.',
      twins: 'Two giants circling each other, neither yet in charge.',
      jets: 'A giant firing two thin radio jets that end in puffed lobes.',
      empty: 'Nothing: the middle is a crowd with no leader.',
    }),
    infall: choice('Is anything arriving?', {
      nothing: 'Nothing: the cluster is closed and finished.',
      group: 'A small group of galaxies is falling in from one side, still huddled together.',
      stream: 'A long thin line of stragglers trickles in, one after another.',
      collision: 'A second cluster has punched straight through, leaving a curved shock front between them.',
    }),
    members: choice('What are the member galaxies like?', {
      gold: 'Almost all old yellow ellipticals, uniform as a crowd in the same coat.',
      red: 'Red and dead: deep orange, burnt out long ago.',
      mixed: 'Mostly yellow, with a scatter of small blue spirals that have just arrived.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const gauss = () => (random() + random() + random() + random() - 2) / 1.2;
    const direction = () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()); return v.lengthSq() ? v.normalize() : v.set(0, 1, 0); };
    const R = 2.1;
    const total = Math.round(mix(130, 560, a.crowd) * mix(0.8, 1.2, mood.density));
    const [hazeLight, hazeDeep] = HAZE[a.haze];

    const centres: { at: THREE.Vector3; share: number; reach: number }[] =
      a.shape === 'double' ? [{ at: new THREE.Vector3(-1.15, 0, 0.1), share: 0.55, reach: 0.78 }, { at: new THREE.Vector3(1.25, 0.25, -0.2), share: 0.45, reach: 0.68 }]
      : a.shape === 'ragged' ? [{ at: new THREE.Vector3(0, 0, 0), share: 0.4, reach: 0.7 }, { at: new THREE.Vector3(1.5, 0.7, 0.3), share: 0.22, reach: 0.45 }, { at: new THREE.Vector3(-1.4, -0.5, 0.6), share: 0.2, reach: 0.42 }, { at: new THREE.Vector3(-0.3, 1.3, -0.9), share: 0.18, reach: 0.38 }]
      : [{ at: new THREE.Vector3(0, 0, 0), share: 1, reach: 1 }];
    const stretch = a.shape === 'elongated' ? new THREE.Vector3(1.6, 0.85, 0.85) : new THREE.Vector3(1, 0.92, 1);
    const lean = a.shape === 'elongated' ? 0.32 : 0;

    const palette = { gold: ['#f2c63e', '#e9a92c', '#f7dc7c', '#dc9a2a'], red: ['#d9772c', '#c4551f', '#e79a45', '#a8431f'], mixed: ['#f2c63e', '#e9a92c', '#f7dc7c', '#dc9a2a'] }[a.members];
    const grey = new THREE.Color('#8d8794');
    const members: { at: THREE.Vector3; size: number; colour: THREE.Color; spiral: boolean }[] = [];
    const pushMember = (at: THREE.Vector3, size: number) => {
      const spiral = a.members === 'mixed' && random() < 0.16;
      const colour = new THREE.Color(spiral ? (random() < 0.5 ? '#5f8fe0' : '#7fb1ee') : palette[Math.floor(random() * palette.length)]);
      colour.lerp(grey, (1 - mood.cheer) * 0.25 + mood.wear * 0.15);
      members.push({ at, size, colour, spiral });
    };
    for (const centre of centres) {
      const share = Math.round(total * centre.share);
      for (let i = 0; i < share; i++) {
        // Centrally concentrated: most of the crowd is near the middle, a few on the outskirts.
        const radius = R * centre.reach * Math.pow(random(), 1.7) * 1.02 + 0.12;
        const at = direction().multiplyScalar(radius).multiply(stretch).add(centre.at);
        pushMember(at, mix(0.05, 0.12, random() * random()) * (1 + 0.5 * (1 - radius / R)));
      }
    }

    const side = random() < 0.5 ? -1 : 1;
    if (a.infall === 'group') {
      const home = new THREE.Vector3(side * 3.5, 1.1 + random() * 0.6, 0.6);
      for (let i = 0; i < 26; i++) pushMember(direction().multiplyScalar(Math.abs(gauss()) * 0.42).add(home), mix(0.035, 0.07, random()));
      pushMember(home.clone(), 0.13);
      for (let i = 0; i < 14; i++) pushMember(home.clone().lerp(new THREE.Vector3(side * 1.6, 0.3, 0.2), random()).addScaledVector(direction(), 0.18), 0.03);
      if (a.haze !== 'none') s.ball([0.75, 0.7, 0.75], home.toArray() as P3, new THREE.MeshBasicMaterial({ color: hazeLight, transparent: true, opacity: 0.16, depthWrite: false }), 18).castShadow = false;
    } else if (a.infall === 'stream') {
      const count = 34;
      for (let i = 0; i < count; i++) {
        const u = i / count;
        pushMember(new THREE.Vector3(side * (1.3 + u * 3.4), 0.2 + Math.sin(u * 2.6) * 1.2 + gauss() * 0.08, 0.5 * Math.cos(u * 3) + gauss() * 0.08), mix(0.03, 0.065, random()));
      }
    } else if (a.infall === 'collision') {
      const home = new THREE.Vector3(side * 3.1, 0.2, 0.3);
      for (let i = 0; i < 70; i++) pushMember(direction().multiplyScalar(Math.pow(random(), 1.5) * 0.9).add(home), mix(0.035, 0.075, random()));
      pushMember(home.clone(), 0.2);
      // The bullet's bow shock: a cap of haze facing away from the main cluster.
      const cap = s.mesh(new THREE.SphereGeometry(1.05, 28, 14, 0, Math.PI * 2, 0, 1.05), new THREE.MeshBasicMaterial({ color: a.haze === 'none' ? '#e070b8' : hazeLight, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }), home.toArray() as P3);
      cap.rotation.z = -side * Math.PI / 2;
      cap.castShadow = false;
      for (let i = 0; i < 40; i++) pushMember(home.clone().lerp(new THREE.Vector3(side * 0.6, 0, 0), random()).addScaledVector(direction(), 0.1 + random() * 0.3), mix(0.035, 0.06, random()));
    }

    // One instanced swarm: each member is its own squashed, tilted ellipsoid.
    const swarm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, emissive: a.members === 'red' ? '#a8431f' : '#c08a1c', emissiveIntensity: mix(0.3, 0.75, mood.cheer) }), members.length);
    const matrix = new THREE.Matrix4(), turn = new THREE.Quaternion(), scale = new THREE.Vector3(), euler = new THREE.Euler();
    members.forEach((member, index) => {
      euler.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      turn.setFromEuler(euler);
      if (member.spiral) scale.set(member.size * 1.5, member.size * 0.22, member.size * 1.5);
      else scale.set(member.size * mix(1, 1.7, random()), member.size * mix(0.6, 1, random()), member.size);
      swarm.setMatrixAt(index, matrix.compose(member.at, turn, scale));
      swarm.setColorAt(index, member.colour);
    });
    swarm.instanceMatrix.needsUpdate = true;
    if (swarm.instanceColor) swarm.instanceColor.needsUpdate = true;
    swarm.castShadow = true;
    const spin = new THREE.Group();
    spin.add(swarm);
    spin.rotation.z = lean;
    s.root.add(spin);

    const giantPaint = new THREE.MeshStandardMaterial({ color: '#ffd45c', emissive: '#f0a81e', emissiveIntensity: mix(0.7, 1.1, mood.cheer), roughness: 0.6 });
    const glow = (at: P3, radius: number, colour = '#ffe08a', opacity = 0.2) => { s.ball([radius, radius * 0.86, radius], at, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false }), 20).castShadow = false; };
    const giantAt = centres[0].at.toArray() as P3;
    if (a.giant === 'bloated' || a.giant === 'jets') {
      s.ball([0.74, 0.56, 0.64], giantAt, giantPaint, 24).rotation.z = 0.3 + lean;
      glow(giantAt, 0.95, '#f2b63a', 0.3); glow(giantAt, 1.35, '#f2b63a', 0.15);
    } else if (a.giant === 'twins') {
      for (const dx of [-0.46, 0.46]) { const at: P3 = [giantAt[0] + dx, giantAt[1] + dx * 0.4, giantAt[2] + dx * 0.5]; s.ball([0.4, 0.32, 0.36], at, giantPaint, 20); glow(at, 0.62, '#f2b63a', 0.3); }
    }
    if (a.shape === 'double' && a.giant !== 'empty') { const at = centres[1].at.toArray() as P3; s.ball([0.32, 0.26, 0.3], at, giantPaint, 20); glow(at, 0.6); }
    if (a.giant === 'jets') {
      const jetPaint = new THREE.MeshBasicMaterial({ color: '#7fe0ff' });
      const lobePaint = new THREE.MeshBasicMaterial({ color: '#5fc6f0', transparent: true, opacity: 0.4, depthWrite: false });
      const tilt = (random() - 0.5) * 0.7;
      for (const up of [-1, 1]) {
        const end: P3 = [giantAt[0] + Math.sin(tilt) * up * 2.5, giantAt[1] + Math.cos(tilt) * up * 2.5, giantAt[2] + up * 0.3];
        s.rod(giantAt, end, 0.05, jetPaint, 0.022);
        s.ball([0.5, 0.62, 0.5], end, lobePaint, 16).castShadow = false;
        s.ball([0.2, 0.26, 0.2], end, jetPaint, 12);
      }
    }

    if (a.haze !== 'none') {
      const strength = mix(0.75, 1.25, mood.warmth * 0.5 + mood.cheer * 0.5);
      for (const centre of centres) {
        const layers: [number, string, number][] = [[1.02, hazeLight, 0.17], [0.72, hazeDeep, 0.14], [0.42, hazeDeep, 0.1]];
        for (const [reach, colour, opacity] of layers) {
          const shell = s.ball([R * centre.reach * reach * stretch.x, R * centre.reach * reach * stretch.y, R * centre.reach * reach * stretch.z], centre.at.toArray() as P3, new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: opacity * strength * 1.25, depthWrite: false, side: THREE.BackSide }), 28);
          shell.rotation.z = lean;
          shell.castShadow = false;
        }
      }
    }

    const speed = mix(0.01, 0.12, mood.energy);
    return s.finish({ update: (dt) => { spin.rotation.y += dt * speed; } });
  },
});
