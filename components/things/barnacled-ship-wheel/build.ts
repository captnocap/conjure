import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, score } from '@conjure/kit';
import { encrust, stained } from './sea';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    spokes: choice('How many spokes does the wheel have?', {
      six: 'Six: a small plain wheel from a working boat.',
      eight: 'Eight: the classic helm.',
      ten: 'Ten: a big wheel from a big ship, crowded with handles.',
    }),
    missing: score('How many spokes and handles have broken away?', ['None, it is whole', 'One handle snapped', 'Several gone, gap-toothed', 'Most gone, barely a wheel']),
    turned: choice('Which way was it left turned?', {
      midships: 'Amidships: the king spoke straight up, rudder dead ahead.',
      port: 'Hard over to port, the last desperate turn.',
      starboard: 'Hard over to starboard.',
      spinning: 'Not held at all: it turns slowly on its own.',
    }),
    pedestal: choice('What does it stand on?', {
      column: 'A turned brass steering pedestal with a domed head.',
      box: 'A panelled timber steering box, a sailing-ship helm.',
      frame: 'Two iron stanchions with a rope drum between them.',
      loose: 'Nothing any more: it has come off and leans on the broken stump of its pedestal.',
    }),
    timber: choice('What is the wood like?', {
      varnished: 'Rich varnished teak, cared for.',
      bleached: 'Bleached silver-grey by sun and salt.',
      sodden: 'Black and sodden, long under water.',
    }),
    growth: choice('What has grown on it?', {
      clean: 'Nothing, it has been scrubbed clean.',
      barnacles: 'Clusters of barnacles on the rim and hub.',
      heavy: 'Thick barnacles and hanging weed, everywhere.',
      coral: 'Barnacles with bright sponges and coral buds.',
    }),
    helm: choice('What was left at the helm?', {
      free: 'Nothing: it is simply unattended.',
      lashed: 'A rope lashing the wheel in place.',
      cap: 'A captain\'s cap hung on a handle.',
      hand: 'A skeletal hand and forearm, still gripping.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const N = { six: 6, eight: 8, ten: 10 }[a.spokes];
    const woodBase = { varnished: '#8a4f26', bleached: '#a9a08c', sodden: '#3a3028' }[a.timber];
    const stainAmount = clamp01({ varnished: 0.1, bleached: 0.3, sodden: 0.55 }[a.timber] + (mood.wear - 0.5) * 0.4 + (a.growth === 'heavy' ? 0.25 : 0));
    const wood = stained(random, woodBase, a.timber === 'varnished' ? '#3d2412' : '#5d7350', stainAmount, { metalness: 0, roughness: a.timber === 'varnished' ? 0.4 : 0.9 });
    const brass = stained(random, '#cfa748', '#5fb39c', clamp01(stainAmount * 1.1 + (a.growth === 'clean' ? 0 : 0.15)));
    const iron = stained(random, '#3a3d40', '#8a4a26', clamp01(0.3 + mood.wear * 0.5), { metalness: 0.3, roughness: 0.8 });
    const hosts: THREE.Mesh[] = [];

    // The wheel, built about its own centre, axis along z.
    const wheel = new Sculpture(context);
    const R = 0.44;
    const rim = wheel.ring(R, 0.04, [0, 0, 0], wood);
    rim.scale.z = 0.85;
    hosts.push(rim);
    for (const z of [-1, 1]) wheel.ring(R, 0.012, [0, 0, z * 0.033], brass);
    wheel.ring(0.15, 0.022, [0, 0, 0], wood);
    const hub = wheel.cylinder(0.095, 0.095, 0.13, [0, 0, 0], brass, 24);
    hub.rotation.x = Math.PI / 2;
    hosts.push(hub);
    wheel.ball([0.06, 0.06, 0.03], [0, 0, 0.066], brass, 16);
    const spokeProfile = [[0.024, 0.09], [0.032, 0.17], [0.02, 0.25], [0.03, 0.34], [0.036, 0.4], [0.03, 0.48], [0.022, 0.5], [0.031, 0.56], [0.036, 0.62], [0.028, 0.67], [0.014, 0.695], [0.001, 0.7]].map(([x, y]) => new THREE.Vector2(x, y));
    const whole = new THREE.LatheGeometry(spokeProfile, 10);
    const stub = new THREE.LatheGeometry([...spokeProfile.slice(0, 6), new THREE.Vector2(0.012, 0.5)], 10);
    const short = new THREE.LatheGeometry([...spokeProfile.slice(0, 2), new THREE.Vector2(0.01, 0.2)], 10);
    const step = (Math.PI * 2) / N;
    const intact: number[] = [0];
    const breakChance = a.missing < 0.15 ? 0 : mix(0.08, 0.6, (a.missing - 0.15) / 0.85);
    let broken = 0;
    for (let i = 0; i < N; i++) {
      let geometry = whole;
      const mustBreak = i === Math.floor(N / 2) + 1 && a.missing >= 0.15 && broken === 0;
      if (i > 0 && (random() < breakChance || mustBreak)) { geometry = random() < 0.7 ? stub : short; broken++; }
      else if (i > 0) intact.push(i);
      const spoke = wheel.mesh(geometry, wood);
      spoke.rotation.z = i * step;
      if (geometry === whole) hosts.push(spoke);
    }
    // King spoke: brass ferrule and cap so the rudder position can be read by touch.
    wheel.cylinder(0.04, 0.04, 0.05, [0, 0.6, 0], brass, 12);
    wheel.ball([0.03, 0.02, 0.03], [0, 0.7, 0], brass, 10);

    const mount = new THREE.Group();
    mount.add(wheel.root);
    s.root.add(mount);
    const turn = { midships: 0, port: mix(1.9, 2.6, random()), starboard: -mix(1.9, 2.6, random()), spinning: random() * 6.283 }[a.turned];
    wheel.root.rotation.z = turn;
    const rudder = { midships: 0, port: 0.62, starboard: -0.62, spinning: mix(-0.4, 0.4, random()) }[a.turned];
    const cy = 1.08;

    const indicator = (at: P3) => {
      // A brass quadrant with a pointer: where the rudder was when she was left.
      const plate = s.mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 20, 1, false, -1, 2), brass, at);
      plate.rotation.x = 0;
      const needle = s.box([0.012, 0.01, 0.12], [at[0] + Math.sin(rudder) * 0.06, at[1] + 0.012, at[2] + Math.cos(rudder) * 0.06], s.material('#b3261e'));
      needle.rotation.y = rudder;
    };

    if (a.pedestal === 'column') {
      mount.position.set(0, cy, 0.12);
      hosts.push(s.lathe([[0.2, 0], [0.2, 0.04], [0.13, 0.08], [0.09, 0.2], [0.075, 0.55], [0.085, 0.8], [0.12, 0.92], [0.13, 1.02], [0.13, 1.14], [0.1, 1.22], [0.04, 1.27], [0.001, 1.28]], brass));
      s.cylinder(0.04, 0.04, 0.16, [0, cy, 0.06], brass, 12).rotation.x = Math.PI / 2;
      s.ring(0.14, 0.012, [0, 0.95, 0], brass).rotation.x = Math.PI / 2;
      indicator([0, 1.2, 0.07]);
    } else if (a.pedestal === 'box') {
      mount.position.set(0, cy, 0.3);
      const box = s.box([0.62, 0.98, 0.46], [0, 0.49, 0], wood);
      hosts.push(box);
      const lid = s.box([0.7, 0.05, 0.54], [0, 1.0, 0], wood);
      lid.rotation.x = 0.0;
      for (const x of [-1, 1]) s.box([0.2, 0.6, 0.012], [x * 0.15, 0.45, 0.233], s.material('#4a3320'));
      for (const y of [0.04, 0.94]) s.box([0.64, 0.05, 0.48], [0, y, 0], s.material('#4a3320'));
      s.cylinder(0.035, 0.035, 0.12, [0, cy, 0.25], brass, 12).rotation.x = Math.PI / 2;
      // The hub sits above the box on a brass bracket.
      s.box([0.16, 0.2, 0.1], [0, 1.08, 0.2], brass);
      indicator([0, 1.03, -0.02]);
    } else if (a.pedestal === 'frame') {
      mount.position.set(0, cy, 0.24);
      for (const z of [0.12, -0.42]) {
        for (const x of [-1, 1]) hosts.push(s.rod([x * 0.26, 0, z], [0, cy + 0.02, z], 0.028, iron));
        s.box([0.62, 0.04, 0.1], [0, 0.02, z], iron);
        s.rod([-0.13, cy * 0.5, z], [0.13, cy * 0.5, z], 0.018, iron);
        s.cylinder(0.05, 0.05, 0.07, [0, cy, z], iron, 12).rotation.x = Math.PI / 2;
      }
      const drum = s.cylinder(0.13, 0.13, 0.42, [0, cy, -0.15], wood, 20);
      drum.rotation.x = Math.PI / 2;
      for (const z of [0.07, -0.37]) s.cylinder(0.17, 0.17, 0.025, [0, cy, z], wood, 20).rotation.x = Math.PI / 2;
      const rope = s.material('#b9a877', { roughness: 1 });
      for (let i = 0; i < 9; i++) s.ring(0.14, 0.017, [0, cy, -0.3 + i * 0.037], rope);
      for (const x of [-1, 1]) s.rod([x * 0.14, cy, -0.15 + x * 0.1], [x * 0.2, 0.01, -0.15 + x * 0.14], 0.016, rope);
      s.rod([0, cy, -0.42], [0, cy, 0.24], 0.022, iron);
    } else {
      // Fallen: the wheel leans back on what is left of its pedestal.
      const lean = mix(0.26, 0.4, random());
      mount.rotation.set(-lean, mix(-0.25, 0.25, random()), mix(-0.12, 0.12, random()));
      mount.position.set(0, 0.69 * Math.cos(lean), 0.12);
      const stumpTop = mix(0.7, 0.95, random());
      const stump = s.lathe([[0.2, 0], [0.2, 0.04], [0.13, 0.08], [0.09, 0.2], [0.075, 0.55], [0.082, stumpTop], [0.05, stumpTop + 0.03], [0.001, stumpTop - 0.02]], brass, [0, 0, -0.27]);
      stump.rotation.z = mix(-0.08, 0.08, random());
      hosts.push(stump);
    }
    s.root.updateMatrixWorld(true);
    const tip = (i: number, r = 0.66, z = 0) => wheel.root.localToWorld(new THREE.Vector3(-Math.sin(i * step) * r, Math.cos(i * step) * r, z));
    // The intact spoke whose handle is nearest a wanted direction.
    const nearest = (want: THREE.Vector3) => intact.reduce((best, i) => (tip(i).sub(mount.position).normalize().dot(want) > tip(best).sub(mount.position).normalize().dot(want) ? i : best), intact[0]);

    if (a.helm === 'lashed') {
      const rope = s.material('#c2b07c', { roughness: 1 });
      const i = nearest(new THREE.Vector3(0.8, -0.5, 0));
      const hold = tip(i, 0.6, 0.02);
      const cleat: P3 = [0.62, 0.03, mount.position.z + 0.1];
      s.box([0.2, 0.03, 0.05], [cleat[0], 0.045, cleat[2]], iron);
      s.box([0.05, 0.05, 0.05], [cleat[0], 0.02, cleat[2]], iron);
      s.rod(hold.toArray() as P3, cleat, 0.014, rope);
      s.rod(tip(i, 0.5, -0.02).toArray() as P3, [cleat[0] + 0.03, 0.04, cleat[2]], 0.014, rope);
      const knot = s.ring(0.045, 0.016, hold.toArray() as P3, rope);
      knot.quaternion.copy(wheel.root.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, i * step)));
      for (let k = 0; k < 3; k++) s.ring(0.07 - k * 0.008, 0.013, [cleat[0] + 0.02, 0.07 + k * 0.012, cleat[2]], rope).rotation.x = Math.PI / 2;
    } else if (a.helm === 'cap') {
      const i = nearest(new THREE.Vector3(-0.55, 0.83, 0));
      const at = tip(i, 0.67, 0.02);
      const cap = new Sculpture(context);
      const white = cap.material(mood.wear > 0.6 ? '#b9b3a0' : '#f1eee4');
      const navy = cap.material('#1b2233');
      cap.cylinder(0.105, 0.09, 0.03, [0, 0.062, 0], white, 20);
      cap.cylinder(0.088, 0.086, 0.05, [0, 0.025, 0], navy, 20);
      const peak = cap.cylinder(0.1, 0.1, 0.008, [0, 0.008, 0.05], cap.material('#0c0d10', { roughness: 0.25 }), 20);
      peak.scale.z = 0.75;
      cap.ball([0.02, 0.024, 0.008], [0, 0.036, 0.088], brass, 8);
      cap.root.position.copy(at).add(new THREE.Vector3(0, -0.02, 0));
      cap.root.rotation.set(mix(-0.25, 0.1, random()), mix(-0.5, 0.5, random()), mix(-0.5, 0.5, random()));
      s.root.add(cap.root);
    } else if (a.helm === 'hand') {
      const bone = s.material('#e7dfc8', { roughness: 0.8 });
      const i = nearest(new THREE.Vector3(0.85, 0.5, 0));
      const grip = tip(i, 0.61, 0.0);
      const elbow = grip.clone().add(new THREE.Vector3(0.1, -0.3, 0.14));
      const wrist = grip.clone().add(new THREE.Vector3(0.02, -0.06, 0.05));
      for (const o of [-0.012, 0.012]) s.rod([elbow.x + o, elbow.y, elbow.z], [wrist.x + o * 0.7, wrist.y, wrist.z], 0.011, bone, 0.008);
      s.ball([0.02, 0.02, 0.02], elbow.toArray() as P3, bone, 8);
      s.ball([0.03, 0.022, 0.02], wrist.clone().lerp(grip, 0.4).toArray() as P3, bone, 8);
      const along = tip(i, 0.7).sub(tip(i, 0.5)).normalize();
      for (let f = 0; f < 4; f++) {
        const base = grip.clone().addScaledVector(along, (f - 1.5) * 0.02);
        const finger = s.ring(0.034, 0.006, base.toArray() as P3, bone, Math.PI * 1.5);
        finger.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
      }
    }

    // Growth.
    const amount = { clean: 0, barnacles: 0.45, heavy: 1, coral: 0.6 }[a.growth];
    if (amount > 0) {
      encrust(s, hosts, amount * mix(140, 330, mood.wear) * mix(0.7, 1.15, mood.density), 0.022);
      if (a.growth === 'coral') encrust(s, hosts, 30, 0.032, ['#c9604a', '#d98a4a', '#b8587a', '#d9b85a', '#7a9a8c'], 'blob');
      if (a.growth === 'heavy') {
        const weeds = [s.material('#3d4a22', { roughness: 0.6 }), s.material('#56562a', { roughness: 0.6 }), s.material('#2f3d2a', { roughness: 0.6 })];
        const strands = Math.round(mix(8, 18, mood.density));
        for (let k = 0; k < strands; k++) {
          const t = mix(-1.9, 1.9, random());
          const top = wheel.root.localToWorld(new THREE.Vector3(Math.sin(t) * R, -Math.cos(t) * R * (random() < 0.3 ? -1 : 1), 0));
          const fall = Math.min(top.y - 0.03, mix(0.15, 0.55, random()));
          if (fall < 0.08) continue;
          const sx = (random() - 0.5) * 0.14, sz = (random() - 0.5) * 0.14;
          s.tube([[top.x, top.y, top.z], [top.x + sx, top.y - fall * 0.4, top.z + sz + 0.03], [top.x - sx * 0.4, top.y - fall * 0.7, top.z], [top.x + sx, top.y - fall, top.z + sz]], 0.008 + random() * 0.006, weeds[k % 3]);
        }
      }
    }

    const spin = a.turned === 'spinning' ? mix(0.12, 1.1, mood.energy) * (random() < 0.5 ? -1 : 1) : 0;
    const thing = s.finish({
      update: (dt, time) => {
        // Only a bare wheel is free to turn; anything hung on it would be left behind.
        if (spin && a.helm === 'free' && amount === 0) wheel.root.rotation.z += dt * spin;
        else if (spin) wheel.root.rotation.z = turn + Math.sin(time * Math.abs(spin)) * 0.05;
      },
    });
    return thing;
  },
});
