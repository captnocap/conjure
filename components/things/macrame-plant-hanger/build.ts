import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P3 = [number, number, number];

/** Strap leaves as one merged, vertex-coloured mesh: three vertices across, so a centre stripe is free. */
class Ribbons {
  private position: number[] = [];
  private colour: number[] = [];
  private index: number[] = [];
  add(path: (t: number) => THREE.Vector3, width: (t: number) => number, tint: (t: number, mid: boolean) => THREE.Color, segments = 7) {
    const base = this.position.length / 3;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments, p = path(t), direction = path(Math.min(1, t + 0.02)).sub(path(Math.max(0, t - 0.02)));
      const side = new THREE.Vector3(-direction.z, 0, direction.x);
      if (side.lengthSq() < 1e-9) side.set(1, 0, 0);
      side.normalize().multiplyScalar(width(t) / 2);
      for (const k of [-1, 0, 1]) {
        const v = p.clone().addScaledVector(side, k);
        if (k === 0) v.y -= width(t) * 0.3;
        this.position.push(v.x, v.y, v.z);
        const c = tint(t, k === 0);
        this.colour.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < segments; i++) {
      const a = base + i * 3;
      this.index.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  mesh() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colour, 3));
    geometry.setIndex(this.index);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.75 }));
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }
}

export default defineThing({
  questions: {
    plant: choice('How is the spider plant doing?', {
      thriving: 'Thriving: a fountain of glossy striped leaves.',
      leggy: 'Leggy: a few long pale leaves reaching for a window that is too far away.',
      crispy: 'Hanging on: drooping, with brown crisped tips.',
      dead: 'Dead: a brown, papery husk still hanging there.',
      gone: 'Gone: an empty pot of dry soil in a hanger nobody took down.',
    }),
    babies: score('How many baby plantlets trail from it?', ['None', 'One or two', 'A handful', 'A cascade of runners almost to the floor']),
    pot: choice('What is the pot like?', {
      speckled: 'Cream stoneware with iron speckles.',
      drip: 'Brown stoneware with an orange glaze dripping from the rim.',
      avocado: 'Glossy avocado green.',
      terracotta: 'Plain terracotta with a white bloom of salts.',
      mushroom: 'Cream with a ring of hand-painted orange mushrooms and dots.',
    }),
    cord: choice('What is the hanger knotted from?', {
      jute: 'Rough natural jute.',
      cotton: 'Thick white cotton cord.',
      rust: 'Cord dyed rust orange.',
      brown: 'Chocolate-brown twine.',
    }),
    beads: choice('What is knotted into the cords?', {
      none: 'Nothing but knots.',
      wood: 'Round wooden beads.',
      ceramic: 'Chunky glazed ceramic beads in orange and turquoise.',
    }),
    stand: choice('What does it hang from?', {
      hook: 'A black wrought-iron shepherd’s hook on a round base.',
      arch: 'A bentwood rattan arch on two sled feet.',
      tripod: 'Three lashed bamboo poles, a tripod.',
    }),
    double: noul('Is it a two-tier hanger, with a second smaller pot slung beneath the first?'),
    floor: choice('What is on the floor beneath it?', {
      nothing: 'Nothing.',
      leaves: 'A litter of dropped dry leaves.',
      can: 'A small brass watering can.',
      puddle: 'A saucer and a puddle from overwatering.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const hangY = 1.7;
    const h = new Sculpture(context);
    h.root.position.set(0, hangY, 0);
    const big = 1.3;
    h.root.scale.setScalar(big);
    s.root.add(h.root);

    // Stand.
    if (a.stand === 'hook') {
      const iron = s.material('#1f1d1c', { metalness: 0.5, roughness: 0.55 });
      s.tube([[-0.42, 0.02, 0], [-0.42, 1.0, 0], [-0.42, 1.62, 0], [-0.36, 1.86, 0], [-0.16, 1.93, 0], [-0.02, 1.86, 0], [0, 1.76, 0], [0, hangY - 0.01, 0]], 0.014, iron);
      s.cylinder(0.22, 0.24, 0.03, [-0.42, 0.015, 0], iron, 28);
      s.tube([[-0.42, 1.3, 0], [-0.33, 1.42, 0], [-0.3, 1.56, 0], [-0.36, 1.6, 0], [-0.4, 1.54, 0]], 0.008, iron);
      s.ball([0.03, 0.03, 0.03], [-0.42, 0.05, 0], iron, 10);
    } else if (a.stand === 'arch') {
      const cane = s.material('#b88a4a', { roughness: 0.5 });
      for (const z of [-0.035, 0.035]) s.tube([[-0.46, 0.03, z], [-0.46, 1.2, z], [-0.34, 1.78, z], [0, 1.95, z], [0.34, 1.78, z], [0.46, 1.2, z], [0.46, 0.03, z]], 0.016, cane);
      for (const x of [-0.46, 0.46]) {
        s.tube([[x, 0.02, -0.3], [x, 0.035, -0.2], [x, 0.035, 0.2], [x, 0.02, 0.3]], 0.02, cane);
        for (const y of [0.3, 0.75, 1.15]) s.ring(0.04, 0.007, [x, y, 0], s.material('#7a5a2c')).rotation.x = Math.PI / 2;
      }
      s.ring(0.045, 0.007, [0, 1.95, 0], s.material('#7a5a2c')).rotation.y = Math.PI / 2;
      s.rod([0, 1.94, 0], [0, hangY, 0], 0.005, s.material('#3a3632', { metalness: 0.6 }));
    } else {
      const bamboo = s.material('#c2a85a', { roughness: 0.45 }), node = s.material('#8f7a3a');
      for (let i = 0; i < 3; i++) {
        const t = Math.PI / 2 + i * Math.PI * 2 / 3 + Math.PI, foot: P3 = [Math.cos(t) * 0.5, 0, Math.sin(t) * 0.5], tip: P3 = [-Math.cos(t) * 0.04, 2.02, -Math.sin(t) * 0.04];
        s.rod(foot, tip, 0.022, bamboo, 0.016);
        for (let n = 1; n < 6; n++) s.ball([0.024, 0.01, 0.024], [mix(foot[0], tip[0], n / 6), mix(0, 2.02, n / 6), mix(foot[2], tip[2], n / 6)], node, 8);
      }
      for (let i = 0; i < 5; i++) s.ring(0.034, 0.006, [0, 1.86 + i * 0.012, 0], s.material('#7a6238')).rotation.x = Math.PI / 2;
      s.rod([0, 1.86, 0], [0, hangY, 0], 0.005, s.material('#7a6238'));
    }

    // Cord and knots. Everything below hangs from the ring, with y running downward from 0.
    const cordTone = new THREE.Color({ jute: '#b3905a', cotton: '#efe8d8', rust: '#b5582a', brown: '#5a3a24' }[a.cord]).lerp(new THREE.Color('#8f887a'), mood.wear * 0.35);
    const cord = new THREE.MeshStandardMaterial({ color: cordTone, roughness: 1 });
    const beadWood = h.material('#8a5a2c', { roughness: 0.4 });
    const potR = 0.135, potH = 0.19, rimY = a.double ? -0.5 : -0.7, baseY = rimY - potH;
    h.ring(0.035, 0.007, [0, -0.035, 0], h.material('#b8923f', { metalness: 0.7, roughness: 0.35 }));
    h.cylinder(0.02, 0.024, 0.11, [0, -0.125, 0], cord, 10);
    for (let i = 0; i < 6; i++) h.ring(0.024, 0.005, [0, -0.08 - i * 0.018, 0], cord).rotation.x = Math.PI / 2;

    const cradle = (rim: number, radius: number, height: number, from: number, arms: number) => {
      const bottom = rim - height - 0.05;
      for (let i = 0; i < arms; i++) {
        const t = i / arms * Math.PI * 2 + Math.PI / 4, cx = Math.cos(t), cz = Math.sin(t), reach = radius + 0.012;
        h.tube([[0, from, 0], [cx * reach * 0.45, mix(from, rim, 0.45), cz * reach * 0.45], [cx * reach, rim + 0.02, cz * reach]], 0.007, cord);
        // Square-knot sinnets: lumps along each arm.
        const knots = 3 + Math.floor(random() * 2);
        for (let k = 1; k <= knots; k++) {
          const f = k / (knots + 1), at: P3 = [cx * reach * f * mix(0.75, 1, f), mix(from, rim, f) - 0.01, cz * reach * f * mix(0.75, 1, f)];
          if (a.beads === 'none' || k % 2) h.ball([0.014, 0.022, 0.014], at, cord, 8);
          else if (a.beads === 'wood') h.ball([0.021, 0.021, 0.021], at, beadWood, 10);
          else h.ball([0.026, 0.024, 0.026], at, h.material(k % 4 ? '#d9772b' : '#3fa3a0', { roughness: 0.25 }), 10);
        }
        // Net around the pot: each arm splits and meets its neighbours half way down.
        for (const turn of [-1, 1]) {
          const m = t + turn * Math.PI / arms;
          h.tube([[cx * reach, rim + 0.02, cz * reach], [Math.cos(t + turn * Math.PI / arms * 0.5) * reach * 1.02, rim - height * 0.3, Math.sin(t + turn * Math.PI / arms * 0.5) * reach * 1.02], [Math.cos(m) * reach * 0.96, rim - height * 0.62, Math.sin(m) * reach * 0.96], [Math.cos(m) * reach * 0.5, rim - height - 0.012, Math.sin(m) * reach * 0.5], [0, bottom, 0]], 0.005, cord);
        }
        h.ball([0.016, 0.016, 0.016], [Math.cos(t + Math.PI / arms) * reach * 0.97, rim - height * 0.62, Math.sin(t + Math.PI / arms) * reach * 0.97], cord, 8);
      }
      h.ball([0.028, 0.034, 0.028], [0, bottom - 0.015, 0], cord, 10);
      return bottom - 0.03;
    };

    const glaze = { speckled: '#e6dcc4', drip: '#5d3a22', avocado: '#6f7a32', terracotta: '#b9643a', mushroom: '#ece2c8' }[a.pot];
    const potSkin = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = glaze;
      ctx.fillRect(0, 0, 256, 128);
      if (a.pot === 'speckled') for (let i = 0; i < 260; i++) { ctx.fillStyle = random() < 0.7 ? '#6b4a2a' : '#2f241a'; ctx.fillRect(random() * 256, random() * 128, 1 + random() * 2, 1 + random() * 2); }
      if (a.pot === 'drip') { ctx.fillStyle = '#d9772b'; ctx.fillRect(0, 0, 256, 22); for (let x = 0; x < 256; x += 9) { ctx.beginPath(); ctx.ellipse(x + 4, 22, 5, 8 + random() * 34, 0, 0, 7); ctx.fill(); } ctx.fillStyle = '#f0d9a0'; ctx.fillRect(0, 0, 256, 6); }
      if (a.pot === 'terracotta') for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(240,232,214,0.35)'; ctx.beginPath(); ctx.ellipse(random() * 256, 70 + random() * 58, 6 + random() * 16, 3 + random() * 8, 0, 0, 7); ctx.fill(); }
      if (a.pot === 'mushroom') for (let i = 0; i < 8; i++) { const x = 16 + i * 32; ctx.fillStyle = '#efe2c0'; ctx.fillRect(x - 3, 58, 6, 22); ctx.strokeStyle = '#6b4a2a'; ctx.strokeRect(x - 3, 58, 6, 22); ctx.fillStyle = i % 2 ? '#d9652b' : '#b8402a'; ctx.beginPath(); ctx.ellipse(x, 58, 13, 11, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#6b8a3a'; ctx.fillRect(x - 14, 82, 28, 3); ctx.fillStyle = '#d9a43a'; ctx.beginPath(); ctx.arc(x + 16, 30, 3, 0, 7); ctx.fill(); }
      if (a.pot === 'avocado') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 20, 256, 8); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 96, 256, 32); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const ceramic = new THREE.MeshStandardMaterial({ map: potSkin, roughness: a.pot === 'terracotta' ? 0.9 : 0.25 });
    const soil = h.material('#3a2a1c', { roughness: 1 });
    const pot = (rim: number, radius: number, height: number) => {
      h.lathe([[0, 0], [radius * 0.62, 0], [radius * 0.98, height * 0.5], [radius, height * 0.86], [radius * 1.08, height * 0.9], [radius * 1.08, height], [radius * 0.94, height], [radius * 0.9, height * 0.9]], ceramic, [0, rim - height, 0]);
      h.cylinder(radius * 0.92, radius * 0.92, 0.01, [0, rim - 0.025, 0], soil, 20);
    };

    // The plant.
    const leaves = new Ribbons();
    const green = new THREE.Color('#3f8a36').lerp(new THREE.Color('#6fae3a'), mood.cheer * 0.5), pale = new THREE.Color('#a9bf6a'), cream = new THREE.Color('#f1ecc0'), brown = new THREE.Color('#8a6a3a'), husk = new THREE.Color('#6b5236');
    const state = a.plant;
    const leaf = (origin: THREE.Vector3, azimuth: number, elevation: number, length: number, droop: number, width: number, floorY: number) => {
      const dx = Math.cos(azimuth) * Math.cos(elevation), dz = Math.sin(azimuth) * Math.cos(elevation), dy = Math.sin(elevation);
      const dry = state === 'dead' ? 1 : state === 'crispy' ? 0.55 + random() * 0.3 : state === 'leggy' ? 0.15 : random() * 0.12;
      const body = state === 'leggy' ? pale : green;
      leaves.add(
        (t) => new THREE.Vector3(origin.x + dx * length * t, Math.max(floorY, origin.y + dy * length * t - droop * length * t * t), origin.z + dz * length * t),
        (t) => width * Math.sin(Math.PI * (0.12 + 0.86 * t)) + 0.002,
        (t, mid) => (state === 'dead' ? husk.clone().lerp(brown, t) : (mid ? cream.clone().lerp(body, 0.25) : body.clone()).lerp(brown, Math.max(0, (t - (1 - dry)) / Math.max(dry, 0.01)) * (dry > 0.1 ? 1 : 0.5))),
      );
    };
    const tuft = (origin: THREE.Vector3, count: number, length: number, width: number, droopBase: number, floorY: number) => {
      for (let i = 0; i < count; i++) leaf(origin, random() * Math.PI * 2, mix(0.25, 1.35, Math.pow(random(), 0.8)), length * mix(0.7, 1.15, random()), droopBase * mix(0.8, 1.3, random()), width, floorY);
    };
    const floorY = (-hangY + 0.04) / big;
    const plantIn = (rim: number, radius: number, size: number) => {
      const origin = new THREE.Vector3(0, rim - 0.02, 0);
      if (state === 'thriving') tuft(origin, Math.round(mix(30, 44, mood.density) * size), 0.46 * size, 0.038, 1.0, floorY);
      else if (state === 'leggy') tuft(origin, Math.round(11 * size), 0.6 * size, 0.024, 1.15, floorY);
      else if (state === 'crispy') tuft(origin, Math.round(22 * size), 0.42 * size, 0.034, 1.7, floorY);
      else if (state === 'dead') tuft(origin, Math.round(13 * size), 0.36 * size, 0.03, 2.4, floorY);
      else { h.rod([0.02, rim - 0.03, 0.01], [0.03, rim + 0.03, 0.0], 0.006, h.material('#6b5236')); h.rod([-0.03, rim - 0.03, -0.02], [-0.05, rim + 0.015, -0.03], 0.005, h.material('#6b5236')); }
      if (state === 'gone') return;
      const runners = Math.round(a.babies * 9 * { thriving: 1, leggy: 0.7, crispy: 0.6, dead: 0.34, gone: 0 }[state] * size);
      const stem = h.material(state === 'dead' ? '#8a6a3a' : '#c9c06a', { roughness: 0.8 });
      for (let i = 0; i < runners; i++) {
        const t = (i + random() * 0.6) / runners * Math.PI * 2, out = radius + 0.07 + random() * 0.1, fall = Math.min(mix(0.18, 0.75, random()) * mix(0.5, 1.1, a.babies), rim - floorY - 0.12);
        const end = new THREE.Vector3(Math.cos(t) * (out + 0.03), rim - fall, Math.sin(t) * (out + 0.03));
        h.tube([[0, rim, 0], [Math.cos(t) * out * 0.6, rim + 0.12, Math.sin(t) * out * 0.6], [Math.cos(t) * out, rim - 0.02, Math.sin(t) * out], [end.x, mix(rim, end.y, 0.6), end.z], [end.x, end.y, end.z]], 0.0035, stem);
        tuft(end, 7 + Math.floor(random() * 4), 0.12, 0.02, 2.2, floorY);
        if (random() < 0.4 && fall > 0.3) tuft(new THREE.Vector3(end.x, mix(rim, end.y, 0.6), end.z), 6, 0.075, 0.012, 2.2, floorY);
      }
    };

    let tail = cradle(rimY, potR, potH, -0.18, 4);
    pot(rimY, potR, potH);
    plantIn(rimY, potR, 1);
    if (a.double) {
      const rim2 = baseY - 0.24, r2 = 0.095, h2 = 0.13;
      tail = cradle(rim2, r2, h2, tail + 0.02, 4);
      pot(rim2, r2, h2);
      plantIn(rim2, r2, 0.62);
    }
    // Tassel.
    const tassel = a.double ? 0.11 : mix(0.16, 0.3, random());
    for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, spread = 0.03 + random() * 0.03; h.rod([Math.cos(t) * 0.008, tail, Math.sin(t) * 0.008], [Math.cos(t) * spread, tail - tassel * mix(0.8, 1.1, random()), Math.sin(t) * spread], 0.004, cord); }
    if (a.beads !== 'none') h.ball([0.024, 0.024, 0.024], [0, tail + 0.005, 0], a.beads === 'wood' ? beadWood : h.material('#3fa3a0', { roughness: 0.25 }), 10);
    h.root.add(leaves.mesh());

    // Floor.
    if (a.floor === 'leaves') {
      const litter = new Ribbons();
      for (let i = 0; i < 9 + Math.floor(mood.wear * 10); i++) {
        const x = (random() - 0.5) * 0.6, z = (random() - 0.5) * 0.6, turn = random() * 6, length = 0.12 + random() * 0.14;
        litter.add((t) => new THREE.Vector3(x + Math.cos(turn) * length * t, 0.012 + Math.sin(t * 3) * 0.008, z + Math.sin(turn) * length * t), (t) => 0.02 * Math.sin(Math.PI * (0.1 + 0.9 * t)) + 0.002, (t) => husk.clone().lerp(brown, t), 4);
      }
      s.root.add(litter.mesh());
    } else if (a.floor === 'can') {
      const brass = s.material('#b8923f', { metalness: 0.75, roughness: 0.35 }), cx = 0.3, cz = 0.3;
      s.lathe([[0, 0], [0.07, 0], [0.075, 0.02], [0.06, 0.13], [0.045, 0.15], [0, 0.15]], brass, [cx, 0, cz]);
      s.rod([cx - 0.05, 0.05, cz], [cx - 0.22, 0.17, cz], 0.012, brass, 0.007);
      s.ball([0.02, 0.02, 0.02], [cx - 0.225, 0.172, cz], brass, 8);
      s.ring(0.05, 0.007, [cx + 0.07, 0.09, cz], brass, Math.PI).rotation.z = -Math.PI / 2;
    } else if (a.floor === 'puddle') {
      s.cylinder(0.12, 0.09, 0.02, [0, 0.01, 0], s.material(glaze, { roughness: 0.3 }), 24);
      const wet = s.cylinder(0.22, 0.22, 0.004, [0.07, 0.002, 0.05], new THREE.MeshStandardMaterial({ color: '#6f8f9a', roughness: 0.05, transparent: true, opacity: 0.55 }), 28);
      wet.scale.set(1, 1, 0.72);
    }

    const sway = mix(0.004, 0.035, mood.energy), phase = random() * 6;
    return s.finish({ footprint: 0.5, update: (_dt, time) => { h.root.rotation.z = Math.sin(time * 1.3 + phase) * sway; h.root.rotation.x = Math.cos(time * 1.1 + phase) * sway * 0.6; } });
  },
});
