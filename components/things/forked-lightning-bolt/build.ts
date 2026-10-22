import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const COLOURS = {
  'blue-white': 'Classic electric blue-white, cold and clean.',
  violet: 'Deep violet with a lilac halo, a summer night storm.',
  gold: 'Hot yellow-gold, a dry heat strike over dust.',
  red: 'Angry red-orange, seen through smoke or rain.',
  green: 'Sickly green, the colour of a tornado sky.',
  pink: 'Hot pink-magenta, a strike through falling snow.',
} as const;
const TINT: Record<keyof typeof COLOURS, [string, string]> = {
  'blue-white': ['#2f7bff', '#9fd0ff'],
  violet: ['#7a3cf0', '#c9a6ff'],
  gold: ['#e08a00', '#ffd866'],
  red: ['#e8361c', '#ffa27a'],
  green: ['#10a352', '#93efaa'],
  pink: ['#e62e9a', '#ffb0de'],
};

const UP = new THREE.Vector3(0, 1, 0);
type V = THREE.Vector3;

export default defineThing({
  questions: {
    colour: choice('What colour is the bolt?', COLOURS),
    branching: choice('How does the bolt branch?', {
      single: 'One clean crooked stroke straight to the ground, almost no side leaders.',
      forked: 'It splits partway down into two or three prongs, with small leaders off each.',
      spider: 'Spider lightning: many thin fingers crawling outward under the cloud, only one finding the ground.',
      arc: 'A cloud-to-cloud arc leaping sideways between two cloud scraps, with a thin feeler reaching down.',
    }),
    thickness: score('How thick is the main channel?', ['A hair-thin thread', 'A cord', 'A fat rope of plasma', 'A blinding trunk']),
    flicker: choice('How is the light behaving at this instant?', {
      steady: 'Frozen at full brightness, a single perfect exposure.',
      stutter: 'Stuttering: two or three return strokes pulsing down the same path.',
      strobe: 'Strobing hard, on and off faster than the eye can follow.',
      dying: 'Fading into bead lightning: the channel broken into a string of glowing pearls.',
    }),
    strike: choice('What does it hit?', {
      ground: 'Bare ground: a scorched star and a splash of thrown sparks.',
      tree: 'A tree, split down the middle and smouldering.',
      rod: 'A copper lightning rod on a stone chimney, doing its job.',
      water: 'Open water: rings of light racing outward.',
      nothing: 'Nothing: the tip ends in clean air, a stroke that has not landed yet.',
    }),
    cloud: noul('Is a scrap of dark storm cloud attached where the bolt begins?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [coreTint, haloTint] = TINT[a.colour];
    const H = mix(7.5, 9.5, random());
    const r = mix(0.03, 0.13, a.thickness);
    const wild = mix(0.1, 0.24, mood.energy);
    const core: THREE.BufferGeometry[] = [];
    const halo: THREE.BufferGeometry[] = [];
    const beaded = a.flicker === 'dying';

    const limb = (from: V, to: V, r0: number, r1: number) => {
      const d = to.clone().sub(from);
      const length = d.length();
      if (length < 1e-4) return;
      const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
      const mid = from.clone().add(to).multiplyScalar(0.5);
      for (const [list, k, sides] of [[core, 1, 6], [halo, 1.7, 7]] as const) {
        const g = new THREE.CylinderGeometry(r1 * k + (k > 1 ? 0.05 : 0), r0 * k + (k > 1 ? 0.05 : 0), length * (k > 1 ? 1.02 : 1), sides, 1);
        g.applyQuaternion(q);
        g.translate(mid.x, mid.y, mid.z);
        list.push(g);
        const joint = new THREE.IcosahedronGeometry(r0 * k * 1.08 + (k > 1 ? 0.05 : 0), k > 1 ? 1 : 0);
        joint.translate(from.x, from.y, from.z);
        const flat = joint.toNonIndexed();
        joint.dispose();
        list.push(flat);
      }
    };
    // CylinderGeometry is indexed and the joints are not: make everything non-indexed to merge.
    const flatten = (list: THREE.BufferGeometry[]) => {
      const out = list.map((g) => {
        const f = g.index ? g.toNonIndexed() : g;
        if (f !== g) g.dispose();
        return f;
      });
      const merged = mergeGeometries(out)!;
      out.forEach((g) => g.dispose());
      return merged;
    };

    /** Midpoint displacement: a crooked path that never looks drawn with a ruler. */
    const jag = (from: V, to: V, depth: number, sway: number): V[] => {
      if (depth === 0) return [from, to];
      const mid = from.clone().add(to).multiplyScalar(0.5);
      const span = from.distanceTo(to);
      const dir = to.clone().sub(from).normalize();
      const side = new THREE.Vector3(random() - 0.5, random() - 0.5, (random() - 0.5) * 0.5).cross(dir).normalize();
      mid.addScaledVector(side, span * sway * (0.6 + random() * 0.8) * (random() < 0.5 ? -1 : 1));
      return [...jag(from, mid, depth - 1, sway), ...jag(mid, to, depth - 1, sway).slice(1)];
    };
    const channel = (points: V[], r0: number, r1: number) => {
      for (let i = 0; i < points.length - 1; i++) {
        if (beaded) {
          // Bead lightning: the channel has gone dark between a string of lingering pearls.
          const pearls = Math.max(1, Math.round(points[i].distanceTo(points[i + 1]) / 0.34));
          for (let k = 0; k < pearls; k++) {
            const bead = new THREE.IcosahedronGeometry(mix(r0, r1, i / points.length) * 0.9 + 0.025, 1);
            const at = points[i].clone().lerp(points[i + 1], (k + 0.5) / pearls);
            bead.translate(at.x, at.y, at.z);
            core.push(bead);
            const aura = new THREE.IcosahedronGeometry(mix(r0, r1, i / points.length) * 1.6 + 0.07, 1);
            aura.translate(at.x, at.y, at.z);
            halo.push(aura);
          }
          continue;
        }
        const t0 = i / (points.length - 1), t1 = (i + 1) / (points.length - 1);
        limb(points[i], points[i + 1], mix(r0, r1, t0), mix(r0, r1, t1));
      }
    };
    /** A side leader: starts at a point, wanders outward and down, and may fork again. */
    const leader = (from: V, length: number, radius: number, level: number, lean = 0) => {
      const sideways = (random() < 0.5 ? -1 : 1) * mix(0.45, 1, random());
      const end = from.clone().add(new THREE.Vector3(sideways, lean - mix(0.25, 1, random()), (random() - 0.5) * 0.6).normalize().multiplyScalar(length));
      end.y = Math.max(end.y, 0.5);
      const path = jag(from, end, 3, wild * 1.2);
      channel(path, radius, radius * 0.12);
      if (level > 0 && random() < 0.75) leader(path[2 + Math.floor(random() * 4)], length * 0.5, radius * 0.5, level - 1, lean);
    };

    const leaders = Math.round(mix(1, 5, mood.density) + random() * 2);
    const top = new THREE.Vector3((random() - 0.5) * 2.4, H, (random() - 0.5) * 0.6);
    const foot = new THREE.Vector3(0, a.strike === 'nothing' ? 1.1 : a.strike === 'tree' ? 2.1 : a.strike === 'rod' ? 2.5 : 0.03, 0);
    const clouds: V[] = [];

    if (a.branching === 'single') {
      const path = jag(top, foot, 5, wild);
      channel(path, r, r * 0.7);
      if (r > 0.08 || mood.density > 0.5) leader(path[9], H * 0.14, r * 0.3, 0);
      clouds.push(top);
    } else if (a.branching === 'forked') {
      const split = top.clone().lerp(foot, mix(0.3, 0.5, random())).add(new THREE.Vector3((random() - 0.5) * 1.6, 0, 0));
      const trunk = jag(top, split, 3, wild);
      channel(trunk, r, r * 0.85);
      channel(jag(split, foot, 3, wild), r * 0.85, r * 0.6);
      const prongs = 1 + (random() < 0.5 ? 1 : 0);
      for (let i = 0; i < prongs; i++) {
        const sign = i === 0 ? (random() < 0.5 ? -1 : 1) : 0;
        const end = new THREE.Vector3((sign || (random() < 0.5 ? -1 : 1) * 0.5) * mix(1.8, 3.2, random()), mix(0.6, 2.4, random()), (random() - 0.5) * 1.2);
        const prong = jag(split, end, 3, wild);
        channel(prong, r * 0.7, r * 0.2);
        leader(prong[4], H * 0.14, r * 0.25, 0);
      }
      for (let i = 0; i < leaders; i++) leader(trunk[1 + Math.floor(random() * (trunk.length - 2))], H * mix(0.12, 0.26, random()), r * 0.32, 1);
      clouds.push(top);
    } else if (a.branching === 'spider') {
      const hub = new THREE.Vector3(0, H * 0.86, 0);
      const fingers = 6 + leaders;
      for (let i = 0; i < fingers; i++) {
        const angle = (i / fingers) * Math.PI * 2 + random() * 0.5;
        const reach = mix(2.2, 4.4, random());
        const end = hub.clone().add(new THREE.Vector3(Math.cos(angle) * reach, mix(-1.3, 0.25, random()), Math.sin(angle) * reach * 0.45));
        const path = jag(hub, end, 3, wild * 1.1);
        channel(path, r * 0.55, r * 0.1);
        if (random() < 0.7) leader(path[3 + Math.floor(random() * 3)], reach * 0.4, r * 0.22, 0, 0.3);
      }
      channel(jag(hub, foot, 4, wild), r * 0.6, r * 0.4);
      clouds.push(hub.clone().setY(H * 0.93), hub.clone().add(new THREE.Vector3(-2.6, H * 0.06, 0)), hub.clone().add(new THREE.Vector3(2.6, H * 0.05, 0)));
    } else {
      const left = new THREE.Vector3(-3.6, H * mix(0.62, 0.8, random()), 0), right = new THREE.Vector3(3.6, H * mix(0.62, 0.8, random()), 0);
      const sag = left.clone().lerp(right, mix(0.35, 0.65, random())).add(new THREE.Vector3(0, -mix(0.5, 1.6, random()), 0));
      const first = jag(left, sag, 3, wild), second = jag(sag, right, 3, wild);
      channel(first, r, r * 0.85);
      channel(second, r * 0.85, r);
      for (let i = 0; i < leaders + 1; i++) leader((random() < 0.5 ? first : second)[1 + Math.floor(random() * 7)], H * mix(0.1, 0.22, random()), r * 0.3, 1);
      channel(jag(sag, foot, 3, wild), r * 0.4, r * 0.12);
      clouds.push(left, right);
    }

    const coreMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(coreTint).multiplyScalar(0.5), emissive: coreTint, emissiveIntensity: beaded ? 0.4 : 0.62, roughness: 0.5 });
    const haloMaterial = new THREE.MeshBasicMaterial({ color: haloTint, transparent: true, opacity: beaded ? 0.2 : 0.34, depthWrite: false, side: THREE.BackSide });
    const coreMesh = s.mesh(flatten(core), coreMaterial);
    const haloMesh = s.mesh(flatten(halo), haloMaterial);
    haloMesh.castShadow = haloMesh.receiveShadow = false;
    coreMesh.receiveShadow = false;

    // The cloud scrap: bruised lumps with their bellies lit by the bolt.
    if (a.cloud) {
      const dark = new THREE.Color('#5a6070').lerp(new THREE.Color('#33363f'), 1 - mood.cheer).lerp(new THREE.Color(coreTint), 0.06);
      const cloudMaterial = new THREE.MeshStandardMaterial({ color: dark, roughness: 1 });
      const puffs: { at: [number, number, number]; size: number }[] = [];
      for (const centre of clouds) {
        const lumps = 7 + Math.floor(random() * 4);
        for (let i = 0; i < lumps; i++) {
          const spread = (i / (lumps - 1) - 0.5) * 3.4;
          puffs.push({ at: [centre.x + spread + (random() - 0.5) * 0.4, centre.y + 0.5 + random() * 0.45 - Math.abs(spread) * 0.08, centre.z + (random() - 0.5) * 1.1], size: mix(0.55, 0.95, random()) * (1 - Math.abs(spread) * 0.13) });
        }
      }
      const cloud = s.scatter(new THREE.IcosahedronGeometry(1, 2), cloudMaterial, puffs);
      cloud.receiveShadow = false;
    }

    // What it hits.
    const char = s.material('#26221f', { roughness: 1 });
    const glow = new THREE.MeshStandardMaterial({ color: haloTint, emissive: coreTint, emissiveIntensity: 1.1, roughness: 0.5 });
    if (a.strike === 'ground') {
      const star = new THREE.Shape();
      const points = 11;
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? mix(0.9, 1.9, random()) : mix(0.3, 0.55, random());
        const angle = (i / (points * 2)) * Math.PI * 2;
        if (i === 0) star.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else star.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      const scorch = s.mesh(new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }), char);
      scorch.rotation.x = -Math.PI / 2;
      s.cylinder(0.3 + r, 0.42 + r, 0.07, [0, 0.055, 0], glow, 9);
      const sparks = Array.from({ length: 14 }, () => {
        const angle = random() * Math.PI * 2, reach = mix(0.3, 1.7, random());
        return { at: [Math.cos(angle) * reach, mix(0.1, 1.2, random()) * (1.8 - reach) * 0.6 + 0.08, Math.sin(angle) * reach] as [number, number, number], size: mix(0.03, 0.09, random()) };
      });
      s.scatter(new THREE.TetrahedronGeometry(1), glow, sparks);
    } else if (a.strike === 'tree') {
      const bark = s.material('#3a2c22', { roughness: 1 });
      const ember = new THREE.MeshStandardMaterial({ color: '#ff7a2a', emissive: '#ff5a10', emissiveIntensity: 1.2 });
      s.cylinder(0.3, 0.46, 1.1, [0, 0.55, 0], bark, 9);
      for (const side of [-1, 1]) {
        const half = s.cylinder(0.1, 0.27, 1.6, [side * 0.34, 1.75, 0], side < 0 ? bark : char, 7);
        half.rotation.z = -side * 0.42;
        const bough = s.cylinder(0.03, 0.09, 1.3, [side * 1.05, 2.2, (random() - 0.5) * 0.4], char, 6);
        bough.rotation.z = -side * 1.1;
      }
      s.box([0.1, 0.9, 0.3], [0, 1.25, 0], ember).rotation.y = 0.3;
      for (let i = 0; i < 5; i++) s.rod([Math.cos(i * 1.3) * 0.4, 0.1, Math.sin(i * 1.3) * 0.4], [Math.cos(i * 1.3) * 0.95, 0.02, Math.sin(i * 1.3) * 0.95], 0.08, bark, 0.02);
    } else if (a.strike === 'rod') {
      const stone = s.material('#8d8a82', { roughness: 0.95 });
      const copper = s.material('#b9713c', { metalness: 0.7, roughness: 0.35 });
      s.box([0.9, 1.3, 0.9], [0, 0.65, 0], stone);
      s.box([1.06, 0.14, 1.06], [0, 1.32, 0], stone);
      for (const x of [-0.22, 0.22]) s.cylinder(0.13, 0.15, 0.28, [x, 1.52, 0.12], s.material('#a5553a'), 10);
      s.rod([0, 1.36, -0.2], [0, 2.5, -0.02], 0.025, copper, 0.012);
      s.ball([0.07, 0.07, 0.07], [0, 2.0, -0.1], copper, 10);
      s.rod([0.47, 1.3, -0.2], [0.47, 0, -0.2], 0.018, copper);
      s.ball([0.12, 0.12, 0.12], [0, 2.5, -0.02], glow, 10);
    } else if (a.strike === 'water') {
      const water = s.material('#3f6072', { roughness: 0.15, metalness: 0.3 });
      s.cylinder(2.3, 2.3, 0.04, [0, 0.02, 0], water, 36);
      for (let i = 0; i < 4; i++) {
        const ring = s.ring(0.35 + i * 0.5 + random() * 0.1, 0.035 - i * 0.006, [0, 0.05, 0], glow);
        ring.rotation.x = Math.PI / 2;
      }
      const column = s.cylinder(0.05, 0.22, 0.5, [0, 0.28, 0], glow, 8);
      column.castShadow = false;
    } else {
      s.ball([r * 1.8 + 0.05, r * 1.8 + 0.05, r * 1.8 + 0.05], [foot.x, foot.y, foot.z], glow, 10);
    }

    const pace = mix(0.5, 2, mood.energy);
    const base = coreMaterial.emissiveIntensity, baseHalo = haloMaterial.opacity;
    return s.finish({
      footprint: 1.6,
      update(_dt, time) {
        const t = time * pace;
        let level = 1;
        if (a.flicker === 'stutter') level = 0.45 + 0.55 * Math.pow(Math.abs(Math.sin(t * 9) * Math.sin(t * 2.3)), 0.4);
        else if (a.flicker === 'strobe') level = Math.sin(t * 38) * Math.sin(t * 7.1) > -0.15 ? 1 : 0.12;
        else if (a.flicker === 'dying') level = 0.6 + 0.4 * Math.sin(t * 3);
        else level = 0.94 + 0.06 * Math.sin(t * 21);
        coreMaterial.emissiveIntensity = base * level;
        haloMaterial.opacity = baseHalo * level;
      },
    });
  },
});
