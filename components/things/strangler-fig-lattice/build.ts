import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Blob, type V, clump, fuse, instances, limb, v } from './parts';

export default defineThing({
  questions: {
    host: choice('What is left of the thing it grew around?', {
      hollow: 'Nothing at all: the host is long gone and daylight shows straight through the weave.',
      stump: 'A crumbling rotten stump and a heap of punk wood at the bottom.',
      ghost: 'A dead grey trunk still standing inside the cage, visible through the gaps.',
      alive: 'The host is still alive: a brown trunk inside the roots, its own paler crown still pushing out above.',
      ruin: 'Not a tree at all: a stack of carved stone blocks, a temple tower being prised apart.',
    }),
    weave: score('How closed is the lattice?', ['A few ropes of root hanging round an empty space', 'An open basket of crossing roots', 'Nearly fused into a wall with only windows left']),
    form: choice('What shape does the whole thing take?', {
      column: 'A straight tall cylinder, the ghost of a clean trunk.',
      bottle: 'Swollen in the middle like a lantern or a wicker fish trap.',
      leaning: 'Leaning, keeping the tilt of the tree it replaced.',
      arch: 'Split at the foot into two legs with a doorway you can walk through.',
    }),
    height: score('How tall is it?', ['Twice a person, a young cage', 'As tall as a house', 'A tower of roots into the canopy']),
    top: choice('What is at the top?', {
      crown: 'A broad dark glossy fig crown, dotted with ripe figs.',
      aerial: 'A spreading crown trailing thin aerial roots that have not yet reached the ground.',
      open: 'Open to the sky: the roots simply end in a ragged rim, a chimney.',
    }),
    inside: choice('What is in or on it now?', {
      empty: 'Nothing: just the empty shape.',
      light: 'A shaft of pale light falling down the hollow from the open top.',
      bats: 'Bats spilling out of the top in a loose spiral.',
      climber: 'A small figure climbing it like a ladder.',
      offerings: 'Candles, bowls and a strip of cloth left at its foot: someone treats it as holy.',
      garden: 'A hanging garden: ferns and moss lodged in every pocket of the weave.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();

    const H = mix(4, 22, a.height) * rnd(0.92, 1.08);
    const R0 = mix(0.95, 2.7, a.height) * rnd(0.9, 1.1) * (a.host === 'ruin' ? 1.2 : 1);
    const lean = a.form === 'leaning' ? H * rnd(0.22, 0.32) * (random() < 0.5 ? -1 : 1) : 0;
    const centre = (t: number) => v(lean * t * t, t * H, 0);
    const girth = (t: number) => R0 * (1 + 0.7 * Math.pow(1 - t, 5) + (a.form === 'bottle' ? 0.55 * Math.sin(Math.PI * Math.min(1, t * 1.1)) : 0) - 0.06 * t);
    const at = (theta: number, t: number, push = 1): V => {
      let ang = theta, r = girth(t) * push;
      if (a.form === 'arch' && t < 0.36) {
        const k = Math.pow(1 - t / 0.36, 0.8) * 0.8;
        const c = Math.cos(theta) >= 0 ? 0 : Math.PI;
        let d = theta - c;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        ang = c + d * (1 - k);
        r *= 1 + k * 0.5;
      }
      return centre(Math.max(t, 0)).add(v(Math.cos(ang) * r, t < 0 ? t * H : 0, Math.sin(ang) * r));
    };

    const rootTone = new THREE.Color('#7f715c').lerp(new THREE.Color('#8f6f48'), mood.warmth * 0.5).lerp(new THREE.Color('#7f8272'), mood.wear * 0.5);
    const rootMat = s.material(rootTone, { roughness: 0.9 });
    const paleMat = s.material(rootTone.clone().offsetHSL(0, -0.05, 0.1), { roughness: 0.9 });
    const count = Math.round(mix(8, 24, a.weave) + rnd(-1, 1));
    const thick = R0 * mix(0.06, 0.1, a.weave);
    const roots: THREE.BufferGeometry[] = [], pale: THREE.BufferGeometry[] = [];
    const tracks: ((t: number) => number)[] = [];
    for (let k = 0; k < count; k++) {
      const theta0 = (k / count) * Math.PI * 2 + rnd(-0.12, 0.12);
      const amp = rnd(0.15, 0.4), freq = rnd(2.2, 5.5), phase = rnd(0, 6.28), drift = (k % 2 ? 1 : -1) * rnd(0.9, 2.0) * Math.min(1.4, H / (R0 * 7));
      const track = (t: number) => theta0 + amp * Math.sin(freq * t + phase) + drift * t;
      tracks.push(track);
      const r = thick * rnd(0.65, 1.5);
      // Some roots have died back and stop short when the mood is worn.
      const start = random() < mood.wear * 0.25 ? rnd(0.2, 0.5) : -0.04;
      const pts: V[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = mix(start, 1.02, i / 12);
        pts.push(at(track(t), t, 1 + 0.06 * Math.sin(i * 1.7 + k)));
      }
      (k % 4 === 0 ? pale : roots).push(limb(pts, r * 1.35, r * 0.7, 6));
    }
    // Cross ties: where one root has reached sideways and fused with its neighbour.
    const ties = Math.round(count * mix(1.2, 3.2, a.weave));
    for (let i = 0; i < ties; i++) {
      const k = Math.floor(random() * count), j = (k + 1 + (random() < 0.25 ? 1 : 0)) % count;
      const t0 = rnd(0.12, 0.9), t1 = Math.min(0.98, t0 + rnd(0.04, 0.14));
      const p0 = at(tracks[k](t0), t0), p1 = at(tracks[j](t1), t1);
      if (p0.distanceTo(p1) > R0 * 1.6) continue;
      const mid = p0.clone().lerp(p1, 0.5);
      const c = centre((t0 + t1) / 2);
      mid.add(mid.clone().sub(c).setY(0).normalize().multiplyScalar(R0 * 0.06));
      roots.push(limb([p0, mid, p1], thick * rnd(0.45, 0.8), thick * rnd(0.4, 0.7), 5));
    }
    // Surface roots snaking out over the ground.
    for (let i = 0; i < 6 + Math.round(a.weave * 4); i++) {
      const ang = rnd(0, 6.28), p0 = at(ang, 0.02), reach = R0 * rnd(1.0, 2.2);
      const dir = p0.clone().setY(0).normalize();
      if (a.form === 'arch' && Math.abs(dir.z) > 0.7) continue;
      roots.push(limb([p0.clone().setY(R0 * 0.2), p0.clone().addScaledVector(dir, reach * 0.4).setY(R0 * 0.06).add(v(rnd(-0.2, 0.2), 0, rnd(-0.2, 0.2))), p0.clone().addScaledVector(dir, reach).setY(-0.05)], thick * 1.1, thick * 0.3, 5));
    }
    s.mesh(fuse(roots), rootMat);
    if (pale.length) s.mesh(fuse(pale), paleMat);

    // What it grew around.
    const top = centre(1);
    if (a.host === 'ghost' || a.host === 'alive') {
      const tall = a.host === 'alive' ? 1.28 : rnd(0.7, 0.92);
      const mat = s.material(a.host === 'alive' ? '#6b5440' : '#b9b6ad', { roughness: 1 });
      s.mesh(limb([centre(0).setY(-0.2), centre(0.5), centre(Math.min(1, tall)), centre(1).add(v(0, H * (tall - 1), 0)).setY(H * tall)], R0 * 0.62, R0 * (a.host === 'alive' ? 0.3 : 0.45), 10), mat);
      if (a.host === 'ghost') for (let i = 0; i < 3; i++) { const p = centre(tall * rnd(0.75, 0.98)); s.mesh(limb([p, p.clone().add(v(rnd(-1, 1) * R0 * 1.3, H * 0.06, rnd(-1, 1) * R0 * 1.3))], R0 * 0.14, R0 * 0.05, 5), mat); }
    }
    if (a.host === 'stump') {
      const punk = s.material('#5a4130', { roughness: 1, flatShading: true });
      const stump = s.mesh(new THREE.CylinderGeometry(R0 * 0.5, R0 * 0.7, H * 0.16, 9, 3), punk, [0, H * 0.08, 0]);
      const p = stump.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > H * 0.07) p.setY(i, p.getY(i) + rnd(-0.5, 0.6) * H * 0.07);
      stump.geometry.computeVertexNormals();
      const crumbs: Blob[] = [];
      for (let i = 0; i < 9; i++) { const size = R0 * rnd(0.12, 0.28); crumbs.push({ at: v(rnd(-1, 1) * R0 * 0.8, size * 0.4, rnd(-1, 1) * R0 * 0.8), size: v(size, size * 0.6, size), color: new THREE.Color('#5a4130').offsetHSL(0, 0, rnd(-0.05, 0.08)), turn: rnd(0, 6) }); }
      s.root.add(instances(clump(1, 0.3), punk, crumbs));
    }
    if (a.host === 'ruin') {
      const stone = s.material(new THREE.Color('#a59f8e').lerp(new THREE.Color('#b59c78'), mood.warmth * 0.5), { roughness: 1 });
      const courses = Math.max(4, Math.round((H * 0.72) / (R0 * 0.55)));
      for (let i = 0; i < courses; i++) {
        const t = i / courses, c = centre(t * 0.72), w = R0 * mix(1.25, 0.8, t);
        const block = s.box([w * rnd(0.95, 1.05), R0 * 0.52, w * rnd(0.95, 1.05)], [c.x + rnd(-0.06, 0.06) * R0 * (1 + mood.wear * 2), t * 0.72 * H + R0 * 0.26, rnd(-0.06, 0.06) * R0 * (1 + mood.wear * 2)], stone);
        block.rotation.y = rnd(-0.08, 0.08) * (1 + mood.wear * 3);
        if (i % 3 === 1) s.box([w * 1.12, R0 * 0.1, w * 1.12], [c.x, t * 0.72 * H + R0 * 0.5, 0], stone);
      }
      // A dark doorway on the front face and a few fallen blocks.
      s.box([R0 * 0.5, R0 * 1.0, 0.1], [0, R0 * 0.5, R0 * 0.64], s.material('#1c1b1a'));
      for (let i = 0; i < 4; i++) { const b = s.box([R0 * 0.5, R0 * 0.4, R0 * 0.4], [rnd(-1, 1) * R0 * 2.2, R0 * 0.16, R0 * rnd(1.5, 2.4) * (i % 2 ? 1 : -1)], stone); b.rotation.set(rnd(-0.3, 0.3), rnd(0, 3), rnd(-0.3, 0.3)); }
    }

    // The top.
    const hue = mix(0.38, 0.28, mood.warmth);
    const leafTone = new THREE.Color().setHSL(hue, 0.55, mix(0.1, 0.17, mood.cheer)).lerp(new THREE.Color('#6d6a3c'), mood.wear * 0.3);
    const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true });
    const leaves: Blob[] = [];
    const crownGroup = new THREE.Group();
    s.root.add(crownGroup);
    const branchParts: THREE.BufferGeometry[] = [];
    const tips: V[] = [];
    if (a.top !== 'open') {
      const spread = Math.max(R0 * 2.6, H * 0.28) * mix(0.8, 1.15, mood.density), n = 6 + Math.floor(random() * 3);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * 6.28 + rnd(-0.3, 0.3), reach = spread * rnd(0.7, 1.1), rise = spread * rnd(0.25, 0.6);
        const from = at(ang, 0.98, 0.8), dir = v(Math.cos(ang), 0, Math.sin(ang));
        const mid = from.clone().addScaledVector(dir, reach * 0.5).add(v(0, rise * 0.8, 0)), end = from.clone().addScaledVector(dir, reach).add(v(0, rise, 0));
        branchParts.push(limb([from, mid, end], thick * 1.2, thick * 0.3, 6));
        tips.push(mid, end);
        for (let k = 0; k < 4; k++) {
          const size = spread * rnd(0.26, 0.4);
          leaves.push({ at: from.clone().lerp(end, rnd(0.45, 1.05)).add(v(rnd(-1, 1) * size * 0.5, rise * 0.25 + rnd(0, size * 0.4), rnd(-1, 1) * size * 0.5)), size: v(size, size * 0.55, size), color: leafTone.clone().offsetHSL(rnd(-0.02, 0.02), 0, rnd(-0.03, 0.05)), turn: rnd(0, 6) });
        }
      }
      for (let k = 0; k < 4; k++) { const size = spread * rnd(0.3, 0.42); leaves.push({ at: top.clone().add(v(rnd(-1, 1) * spread * 0.3, spread * rnd(0.55, 0.8), rnd(-1, 1) * spread * 0.3)), size: v(size, size * 0.6, size), color: leafTone.clone().offsetHSL(0, 0, rnd(-0.02, 0.05)), turn: rnd(0, 6) }); }
      const figs: Blob[] = [];
      for (let i = 0; i < Math.round(mix(10, 70, mood.cheer)); i++) {
        const b = leaves[Math.floor(random() * leaves.length)], ang = rnd(0, 6.28), size = Math.max(0.05, spread * 0.018);
        figs.push({ at: b.at.clone().add(v(Math.cos(ang) * b.size.x * 0.9, -b.size.y * rnd(0.2, 0.8), Math.sin(ang) * b.size.z * 0.9)), size: v(size, size, size), color: random() < 0.6 ? '#d24a2c' : '#e3a02e' });
      }
      crownGroup.add(instances(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshStandardMaterial({ roughness: 0.5 }), figs));
      if (a.top === 'aerial') {
        const threads: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 16 + Math.round(mood.density * 12); i++) {
          const p = tips[Math.floor(random() * tips.length)].clone().add(v(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4)));
          const drop = Math.min(p.y - 0.1, H * rnd(0.2, 0.95));
          threads.push(limb([p, p.clone().add(v(rnd(-0.15, 0.15), -drop * 0.5, rnd(-0.15, 0.15))), p.clone().add(v(rnd(-0.2, 0.2), -drop, rnd(-0.2, 0.2)))], thick * 0.16, thick * 0.07, 4));
        }
        s.mesh(fuse(threads), paleMat);
      }
    } else {
      // A ragged rim of short stubs.
      for (let i = 0; i < count; i++) { const p = at(tracks[i](1), 1); branchParts.push(limb([p, p.clone().add(v(rnd(-0.3, 0.3) * R0, R0 * rnd(0.2, 0.9), rnd(-0.3, 0.3) * R0))], thick * 0.7, thick * 0.15, 5)); }
    }
    if (a.host === 'alive') {
      const hostTone = new THREE.Color().setHSL(hue - 0.06, 0.55, 0.36);
      for (let k = 0; k < 5; k++) { const size = R0 * rnd(0.9, 1.4); leaves.push({ at: v(top.x + rnd(-1, 1) * R0, H * rnd(1.22, 1.36), rnd(-1, 1) * R0), size: v(size, size * 0.6, size), color: hostTone.clone().offsetHSL(0, 0, rnd(-0.04, 0.04)), turn: rnd(0, 6) }); }
    }
    if (branchParts.length) s.mesh(fuse(branchParts), rootMat);
    if (leaves.length) crownGroup.add(instances(clump(), leafMaterial, leaves));

    // Density lodges moss in the weave whatever else is going on.
    const pockets: Blob[] = [], fernBlobs: Blob[] = [];
    const lodged = Math.round(mix(0, 16, mood.density) + (a.inside === 'garden' ? 22 : 0));
    for (let i = 0; i < lodged; i++) {
      const t = rnd(0.08, 0.95), p = at(rnd(0, 6.28), t, 1.02), size = R0 * rnd(0.1, 0.2);
      pockets.push({ at: p, size: v(size, size * 0.6, size), color: new THREE.Color().setHSL(hue - 0.03, 0.5, rnd(0.28, 0.4)), turn: rnd(0, 6) });
      if (a.inside === 'garden' && i % 2 === 0) fernBlobs.push({ at: at(rnd(0, 6.28), rnd(0.15, 0.92), 1.05).add(v(0, R0 * 0.1, 0)), size: v(R0 * 0.3, R0 * 0.22, R0 * 0.3), color: new THREE.Color().setHSL(hue - 0.08, 0.6, rnd(0.38, 0.48)), turn: rnd(0, 6) });
    }
    if (pockets.length) s.root.add(instances(clump(1, 0.25), leafMaterial, pockets));
    if (fernBlobs.length) s.root.add(instances(new THREE.ConeGeometry(1, 1.4, 7, 1, true).rotateX(Math.PI), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, flatShading: true }), fernBlobs));

    let bats: THREE.Object3D | null = null;
    const flames: THREE.MeshStandardMaterial[] = [];
    if (a.inside === 'light') {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(R0 * 0.45, R0 * 0.8, H * 1.05, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.set(lean * 0.3, H * 0.52, 0);
      beam.rotation.z = -Math.atan2(lean, H);
      s.root.add(beam);
      s.cylinder(R0 * 0.75, R0 * 0.75, 0.04, [0, 0.03, 0], s.material('#fff0b8', { emissive: '#ffe9a0', emissiveIntensity: 0.9 }), 20);
    }
    if (a.inside === 'bats') {
      const flock: Blob[] = [];
      for (let i = 0; i < 46; i++) {
        const t = i / 46, ang = t * 9 + rnd(-0.4, 0.4), out = R0 * (0.3 + t * 3.2), size = Math.max(0.12, R0 * 0.14) * rnd(0.7, 1.2);
        flock.push({ at: v(Math.cos(ang) * out, H * (0.95 + t * 0.5) + rnd(-0.3, 0.3), Math.sin(ang) * out), size: v(size * 1.8, size * 0.25, size * 0.6), color: '#1d1c20', tilt: new THREE.Euler(rnd(-0.6, 0.6), rnd(0, 6), rnd(-0.6, 0.6)) });
      }
      const group = new THREE.Group();
      group.position.x = top.x;
      group.add(instances(new THREE.OctahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), flock));
      s.root.add(group);
      bats = group;
    }
    if (a.inside === 'climber') {
      const t = rnd(0.35, 0.6), p = at(Math.PI / 2 + rnd(-0.5, 0.5), t, 1.12), k = 1;
      const coat = s.material(mood.cheer > 0.5 ? '#e0502c' : '#3d5a7a'), dark = s.material('#2b2a28'), skin = s.material('#c99a72');
      s.box([0.36 * k, 0.6 * k, 0.24 * k], [p.x, p.y, p.z + 0.1], coat);
      s.ball([0.13, 0.15, 0.13], [p.x, p.y + 0.45, p.z + 0.06], skin, 12);
      s.rod([p.x - 0.12, p.y + 0.22, p.z + 0.08], [p.x - 0.32, p.y + 0.78, p.z - 0.12], 0.05, coat);
      s.rod([p.x + 0.12, p.y + 0.22, p.z + 0.08], [p.x + 0.36, p.y + 0.5, p.z - 0.12], 0.05, coat);
      s.rod([p.x - 0.1, p.y - 0.28, p.z + 0.1], [p.x - 0.2, p.y - 0.95, p.z - 0.05], 0.065, dark);
      s.rod([p.x + 0.1, p.y - 0.28, p.z + 0.1], [p.x + 0.3, p.y - 0.62, p.z - 0.05], 0.065, dark);
    }
    if (a.inside === 'offerings') {
      const front = at(Math.PI / 2, 0, 1.35);
      const cloth = mood.cheer > 0.4 ? '#e3b21c' : '#b9b3a4';
      s.ring(girth(0.2) * 1.04, Math.max(0.06, R0 * 0.07), [centre(0.2).x, H * 0.2 > 1.6 ? 1.5 : H * 0.2, 0], s.material(cloth, { emissive: cloth, emissiveIntensity: 0.1 })).rotation.x = Math.PI / 2;
      for (let i = 0; i < 7; i++) {
        const x = front.x + (i - 3) * 0.24 + rnd(-0.05, 0.05), z = front.z + rnd(-0.15, 0.3), h = rnd(0.12, 0.28);
        s.cylinder(0.035, 0.04, h, [x, h / 2, z], s.material('#efe6cf'), 8);
        const flame = s.material('#ffd98a', { emissive: '#ffb347', emissiveIntensity: 2 });
        flames.push(flame);
        s.ball([0.03, 0.06, 0.03], [x, h + 0.06, z], flame, 8);
      }
      for (const dx of [-0.6, 0.55]) { s.cylinder(0.2, 0.12, 0.1, [front.x + dx, 0.05, front.z + 0.5], s.material('#a55a35'), 14); s.ball([0.14, 0.07, 0.14], [front.x + dx, 0.11, front.z + 0.5], s.material(dx < 0 ? '#e39a2e' : '#f1ece0'), 10); }
    }

    const energy = mood.energy, sway = mix(0.02, 0.2, energy) * R0 * 0.3;
    return s.finish({
      footprint: girth(0) * 1.3,
      update: (dt, time) => {
        crownGroup.position.x = Math.sin(time * 0.8) * sway;
        if (bats) bats.rotation.y += dt * mix(0.2, 1.6, energy);
        flames.forEach((flame, i) => { flame.emissiveIntensity = 1.8 + Math.sin(time * 11 + i * 2.3) * 0.5 * (0.3 + energy); });
      },
    });
  },
});
