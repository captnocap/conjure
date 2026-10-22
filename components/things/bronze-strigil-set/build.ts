import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

/** A strigil hanging from the origin down -y, its scoop curling toward +z. */
function strigil(metal: THREE.Material, length: number, width: number, sweep: number, fluted: boolean) {
  const group = new THREE.Group();
  const handle = length * 0.36, straight = length * 0.2, R = (length - handle - straight) / Math.max(sweep, 0.6) * 0.95;
  const rows = 26, cols = 7;
  const positions: number[] = [], index: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, run = t * (straight + R * sweep);
    let y: number, z: number, ny: number, nz: number;
    if (run < straight) { y = -handle - run; z = 0; ny = 0; nz = 1; }
    else { const th = (run - straight) / R; y = -handle - straight - Math.sin(th) * R; z = R * (1 - Math.cos(th)); ny = Math.sin(th); nz = Math.cos(th); }
    const w = width * (t < 0.12 ? mix(0.55, 1, t / 0.12) : 1 - 0.35 * t * t) * (t > 0.95 ? mix(1, 0.45, (t - 0.95) / 0.05) : 1);
    for (let j = 0; j < cols; j++) {
      const u = j / (cols - 1) * 2 - 1;
      const lift = w * 0.36 * u * u + (fluted ? Math.cos(u * Math.PI * 3) * w * 0.03 : 0);
      positions.push(u * w / 2, y + ny * lift, z + nz * lift);
    }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols - 1; j++) {
    const p = i * cols + j;
    index.push(p, p + cols, p + 1, p + 1, p + cols, p + cols + 1);
  }
  const blade = new THREE.BufferGeometry();
  blade.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  blade.setIndex(index);
  blade.computeVertexNormals();
  const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh; };
  add(new THREE.Mesh(blade, metal));
  // The handle: a flat bar bent into a long loop that the ring passes through.
  const bar = width * 0.13, half = width * 0.36;
  for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(bar, handle, bar * 1.6), metal)).position.set(side * half, -handle / 2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(half * 2 + bar, bar, bar * 1.6), metal)).position.set(0, -bar / 2, 0);
  add(new THREE.Mesh(new THREE.BoxGeometry(half * 2 + bar, bar * 2.4, bar * 2), metal)).position.set(0, -handle, 0);
  return group;
}

export default defineThing({
  questions: {
    resting: choice('Where has the kit been left?', {
      hung: 'Hanging from a bronze peg on a slab of bathhouse wall, scrapers dangling straight down.',
      bench: 'Laid on the corner of a marble bench, the scrapers fanned out from the ring.',
      towel: 'Set down on a folded linen towel.',
      floor: 'Dropped on the bare floor in a careless tangle, the ring propped up on the blades.',
    }),
    scrapers: choice('How many strigils are on the ring?', {
      one: 'A single scraper, a poor man\'s or a soldier\'s kit.',
      pair: 'Two scrapers, the usual pair.',
      three: 'Three of different sizes, a rich bather\'s full set.',
    }),
    flask: choice('What is the oil flask like?', {
      bronze: 'A round bronze globe with a tiny neck, on a fine chain.',
      clay: 'A painted clay aryballos with dark bands and a wide flat lip, on a cord.',
      glass: 'A blue-green blown glass ball with little dolphin handles.',
      leather: 'A stitched leather bottle, soft and cheap.',
      lost: 'There is no flask; only its empty chain hangs from the ring.',
    }),
    metal: choice('What are the scrapers made of?', {
      bright: 'Bright golden bronze, kept polished by a slave.',
      dark: 'Old brown bronze, handled dark over years.',
      iron: 'Plain grey iron, a cheap working set.',
      silver: 'Silver with fluted blades, a gift meant to be noticed.',
    }),
    moment: choice('What has just happened?', {
      ready: 'Nothing yet: clean and stoppered, waiting for its owner.',
      used: 'Just used: oil shines on the blades, a small puddle has dripped, grey curls of scraped sweat and dust lie near.',
      forgotten: 'Left behind days ago: the flask is unstoppered and a dried oil stain rings it.',
      buried: 'Dug from a grave: crusted green, earth still clinging, one blade snapped.',
    }),
    sponge: noul('Is there a sea sponge with the kit?'),
    ring: choice('What holds the set together?', {
      hoop: 'A plain round bronze hoop.',
      clasp: 'A hoop with a hinged clasp and a little decorative knob.',
      thong: 'A knotted leather thong instead of a metal ring.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const buried = a.moment === 'buried';
    const wear = Math.min(1, mood.wear + (buried ? 0.6 : 0));
    const tone = new THREE.Color({ bright: '#c9963f', dark: '#7a5632', iron: '#6f7275', silver: '#cfd2d2' }[a.metal]);
    tone.lerp(new THREE.Color(a.metal === 'iron' ? '#7a4526' : a.metal === 'silver' ? '#5d5a55' : '#4f9079'), wear * (buried ? 0.9 : 0.6));
    const oily = a.moment === 'used';
    const metal = new THREE.MeshStandardMaterial({ color: tone, metalness: 0.8, roughness: oily ? 0.18 : mix(0.3, 0.85, wear), side: THREE.DoubleSide });
    const leather = s.material('#6b4329', { roughness: 0.9, side: THREE.DoubleSide });
    const oil = new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.85 });
    const marble = s.material('#e3dfd4', { roughness: mix(0.3, 0.8, mood.wear) });
    const ringMat = a.ring === 'thong' ? leather : metal;

    const count = { one: 1, pair: 2, three: 3 }[a.scrapers];
    const ringR = 0.052, ringT = a.ring === 'thong' ? 0.005 : 0.0065;
    const hung = a.resting === 'hung';
    const kit = new THREE.Group();
    s.root.add(kit);
    const put = (mesh: THREE.Object3D) => { kit.add(mesh); return mesh; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, at: P3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      kit.add(mesh);
      return mesh;
    };

    // The kit is built hanging in its own frame: ring centred at the origin in the XY plane.
    const ring = solid(new THREE.TorusGeometry(ringR, ringT, 8, 40), ringMat);
    if (a.ring === 'clasp') { solid(new THREE.SphereGeometry(0.009, 10, 8), metal, [0, ringR + 0.006, 0]); solid(new THREE.BoxGeometry(0.02, 0.012, 0.012), metal, [ringR * 0.7, ringR * 0.7, 0]).rotation.z = -0.78; }
    if (a.ring === 'thong') { solid(new THREE.SphereGeometry(0.009, 8, 6), leather, [ringR * 0.3, ringR * 0.96, 0]); for (const side of [-1, 1]) { const tail = solid(new THREE.CylinderGeometry(0.003, 0.002, 0.05, 6), leather, [ringR * 0.3 + side * 0.014, ringR + 0.026, 0]); tail.rotation.z = -side * 0.5; } }

    const blades: THREE.Group[] = [];
    for (let i = 0; i < count; i++) {
      const length = (0.31 - i * 0.04) * (0.94 + random() * 0.12);
      const g = strigil(metal, length, 0.042 - i * 0.004, 1.5 + random() * 0.7, a.metal === 'silver');
      g.userData.length = length;
      blades.push(g);
      put(g);
    }
    if (buried && blades.length) { // one blade snapped: hide its end by scaling a clipped copy
      const victim = blades[blades.length - 1];
      victim.scale.y = 0.62; victim.userData.length *= 0.62;
    }

    // The flask, built hanging from its own origin.
    const flask = new THREE.Group();
    put(flask);
    const chainLen = 0.075 + random() * 0.03;
    const fr = 0.044;
    const fadd = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; flask.add(mesh); return mesh; };
    const links = 7;
    const chainMat = a.flask === 'clay' || a.flask === 'leather' ? leather : metal;
    if (a.flask === 'clay' || a.flask === 'leather') fadd(new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, chainLen, 6), chainMat)).position.y = -chainLen / 2;
    else for (let i = 0; i < links; i++) { const link = fadd(new THREE.Mesh(new THREE.TorusGeometry(chainLen / links * 0.62, 0.0018, 5, 10), chainMat)); link.position.y = -(i + 0.5) * chainLen / links; link.rotation.y = i % 2 ? Math.PI / 2 : 0; }
    const top = -chainLen;
    if (a.flask !== 'lost') {
      const lathe = (profile: [number, number][], material: THREE.Material) => fadd(new THREE.Mesh(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 24), material));
      if (a.flask === 'bronze') {
        lathe([[0.007, top], [0.013, top - 0.004], [0.006, top - 0.01], [0.012, top - 0.02], [fr * 0.8, top - 0.035], [fr, top - 0.02 - fr], [fr * 0.75, top - 0.02 - fr * 1.7], [0.001, top - 0.02 - fr * 2]], metal);
        for (const y of [0.85, 1.15]) fadd(new THREE.Mesh(new THREE.TorusGeometry(fr * 0.99, 0.0012, 4, 28), metal)).rotation.x = Math.PI / 2, flask.children[flask.children.length - 1].position.y = top - 0.02 - fr * y;
      } else if (a.flask === 'clay') {
        const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#d9a66a'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#2a1c16'; for (const [y, h] of [[6, 5], [20, 3], [26, 10], [40, 3], [50, 6]]) ctx.fillRect(0, y, 64, h);
        ctx.fillStyle = '#8a2f1f'; for (let i = 0; i < 8; i++) ctx.fillRect(i * 8 + 2, 28, 4, 6);
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
        const clay = new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide });
        lathe([[0.02, top], [0.021, top - 0.004], [0.007, top - 0.008], [0.009, top - 0.018], [fr * 0.85, top - 0.032], [fr, top - 0.018 - fr], [fr * 0.7, top - 0.018 - fr * 1.75], [0.001, top - 0.018 - fr * 2]], clay);
        fadd(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.018, 0.004), clay)).position.set(0.012, top - 0.012, 0);
      } else if (a.flask === 'glass') {
        const glass = new THREE.MeshStandardMaterial({ color: '#5fb6a8', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
        lathe([[0.012, top], [0.014, top - 0.003], [0.007, top - 0.008], [0.008, top - 0.02], [fr * 0.8, top - 0.034], [fr, top - 0.02 - fr], [fr * 0.75, top - 0.02 - fr * 1.7], [0.001, top - 0.02 - fr * 2]], glass);
        fadd(new THREE.Mesh(new THREE.SphereGeometry(fr * 0.8, 12, 8, 0, Math.PI * 2, Math.PI * 0.55), oil)).position.y = top - 0.02 - fr;
        for (const side of [-1, 1]) { const ear = fadd(new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.003, 5, 10), glass)); ear.position.set(side * 0.012, top - 0.016, 0); }
      } else {
        lathe([[0.008, top], [0.01, top - 0.02], [fr * 0.8, top - 0.04], [fr * 0.95, top - 0.07], [fr * 0.8, top - 0.1], [0.001, top - 0.106]], leather).scale.z = 0.6;
        fadd(new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 5, 10), s.material('#c8b08a'))).position.set(0, top - 0.02, 0);
        flask.children[flask.children.length - 1].rotation.x = Math.PI / 2;
      }
      if (a.moment !== 'forgotten') fadd(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.012, 8), s.material('#a07848', { roughness: 1 }))).position.y = top + 0.004;
    }

    let surface = 0;
    const drips: P3[] = [];
    if (hung) {
      // A slab of wall with a peg. The ring hangs flat against it.
      const pegY = 0.5, wallZ = -0.06;
      const plaster = s.material(mood.warmth > 0.5 ? '#dcc3a4' : '#d3d6cf', { roughness: 0.95 });
      s.box([0.32, 0.57, 0.05], [0, 0.285, wallZ - 0.025], plaster);
      s.box([0.32, 0.1, 0.054], [0, 0.08, wallZ - 0.025], s.material('#8f3a2c', { roughness: 0.9 }));
      s.box([0.32, 0.01, 0.058], [0, 0.135, wallZ - 0.025], s.material('#2f2a26'));
      s.box([0.36, 0.03, 0.12], [0, 0.015, wallZ + 0.0], marble);
      if (mood.wear > 0.45) for (let i = 0; i < 2 + mood.wear * 3; i++) { const x0 = (random() - 0.5) * 0.26, y0 = 0.2 + random() * 0.33; s.rod([x0, y0, wallZ + 0.001], [x0 + (random() - 0.5) * 0.08, y0 - 0.05 - random() * 0.09, wallZ + 0.001], 0.0016, s.material('#6f675c')).castShadow = false; }
      s.rod([0, pegY, wallZ], [0, pegY + 0.012, wallZ + 0.06], 0.006, metal);
      s.ball([0.011, 0.011, 0.011], [0, pegY + 0.013, wallZ + 0.062], metal, 10);
      const z = wallZ + 0.03;
      kit.position.set(0, pegY - ringR + 0.004, z);
      ring.rotation.y = 0.25;
      blades.forEach((g, i) => {
        const spread = (i - (count - 1) / 2) * 0.3 + (random() - 0.5) * 0.08;
        g.position.set(Math.sin(spread) * ringR, -Math.cos(spread) * ringR + 0.004, 0.004 + i * 0.006);
        g.rotation.z = spread * 0.75;
        g.rotation.y = 0.35 + (random() - 0.5) * 0.7;
        drips.push([Math.sin(spread) * (ringR + g.userData.length), 0.03, z + 0.07]);
      });
      const side = count === 1 ? 0.5 : 0.95;
      flask.position.set(Math.sin(side) * ringR, -Math.cos(side) * ringR, 0.012);
      flask.rotation.z = 0.06;
      if (a.sponge) lump(s, random, [-0.11, 0.03 + 0.04, wallZ + 0.02], 0.045);
    } else {
      if (a.resting === 'bench') {
        surface = 0.09;
        s.box([0.5, 0.06, 0.36], [0, 0.06, 0], marble);
        s.box([0.46, 0.03, 0.32], [0, 0.015, 0], marble);
        const edge = s.cylinder(0.014, 0.014, 0.5, [0, 0.076, 0.18], marble, 10); edge.rotation.z = Math.PI / 2;
      } else if (a.resting === 'towel') {
        surface = 0.034;
        const linen = s.material(mood.cheer > 0.5 ? '#ece2c8' : '#c9c2b2', { roughness: 1 });
        const w = 0.44, d = 0.32;
        for (let layer = 0; layer < 3; layer++) { const fold = s.box([w - layer * 0.012, 0.011, d - layer * 0.02], [layer * 0.004, 0.006 + layer * 0.0115, (random() - 0.5) * 0.01], linen); fold.rotation.y = (random() - 0.5) * 0.05; }
        for (const x of [-1, 1]) s.box([0.012, 0.004, d - 0.04], [x * (w / 2 - 0.03), 0.036, 0], s.material('#a23b2e', { roughness: 1 })).castShadow = false;
      }
      const tangled = a.resting === 'floor';
      const tilt = tangled ? 0.55 + random() * 0.3 : 0.06;
      // Lay the ring nearly flat and fan the scrapers out on their sides.
      kit.position.set(-0.1, surface + ringT + Math.sin(tilt) * ringR, tangled ? 0 : -0.03);
      ring.rotation.x = Math.PI / 2 - tilt;
      if (a.ring === 'clasp' || a.ring === 'thong') for (const child of kit.children) if (child !== ring && !blades.includes(child as THREE.Group) && child !== flask) { child.visible = false; }
      const base = -0.35 + random() * 0.3;
      blades.forEach((g, i) => {
        const yaw = base - (i - (count - 1) / 2) * (tangled ? 0.9 + random() * 0.6 : 0.55) + (random() - 0.5) * 0.12;
        const flip = tangled && random() < 0.5 ? -1 : 1;
        g.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), flip * Math.PI / 2));
        if (flip < 0) g.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
        const dir = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        g.position.copy(dir.clone().multiplyScalar(ringR * 0.75));
        g.position.y = -kit.position.y + surface + 0.022 + (tangled ? i * 0.012 : 0);
        if (tangled && i > 0) g.rotateX((random() - 0.5) * 0.3);
        drips.push([kit.position.x + dir.x * (ringR + g.userData.length * 0.8), surface + 0.002, kit.position.z + dir.z * (ringR + g.userData.length * 0.8) + 0.03]);
      });
      const fy = base + 1.5 + random() * 0.4;
      flask.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), fy).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
      flask.position.set(Math.cos(fy) * ringR * 0.9, -kit.position.y + surface + (a.flask === 'lost' ? 0.004 : a.flask === 'leather' ? fr * 0.6 : fr), -Math.sin(fy) * ringR * 0.9);
      if (a.sponge) lump(s, random, [0.14 + random() * 0.03, surface + 0.036, -0.09 - random() * 0.03], 0.045);
    }

    // The moment: oil, scrapings, stains, earth.
    if (oily) {
      for (const at of drips) {
        const pool = s.cylinder(0.022 + random() * 0.02, 0.03, 0.003, at, oil, 16);
        pool.scale.z = 0.7 + random() * 0.5; pool.castShadow = false;
        for (let i = 0; i < 2; i++) s.cylinder(0.006, 0.007, 0.002, [at[0] + (random() - 0.5) * 0.09, at[1], at[2] + (random() - 0.5) * 0.08], oil, 8).castShadow = false;
      }
      const grime = s.material('#77706a', { roughness: 1 });
      const [x, y, z] = drips[0];
      for (let i = 0; i < 7 + mood.density * 8; i++) {
        const curl = s.ring(0.007 + random() * 0.006, 0.0022, [x + (random() - 0.5) * 0.16, y + 0.006, z + 0.02 + (random() - 0.5) * 0.1], grime, Math.PI * (0.8 + random() * 0.9));
        curl.rotation.set(Math.PI / 2 + (random() - 0.5), random() * 3, random() * 6);
      }
    }
    if (a.moment === 'forgotten' && a.flask !== 'lost') {
      const at = new THREE.Vector3(0, top - 0.03, 0).applyQuaternion(flask.quaternion).add(flask.position).add(kit.position);
      const stain = s.cylinder(0.05, 0.05, 0.002, hung ? [at.x, 0.031, -0.02] : [at.x, surface + 0.001, at.z], new THREE.MeshStandardMaterial({ color: '#8a6a2a', roughness: 0.6, transparent: true, opacity: 0.75 }), 20);
      stain.scale.z = hung ? 0.5 : 0.8; stain.castShadow = false;
      const dust = s.material('#b8b0a2', { roughness: 1 });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), dust, Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * 0.4, (hung ? 0.03 : surface) + 0.003, (random() - 0.5) * (hung ? 0.06 : 0.28)] as P3, size: 0.004 + random() * 0.005 })));
    }
    if (buried) {
      const earth = s.material('#6a5038', { roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), earth, Array.from({ length: 26 }, () => ({ at: [(random() - 0.5) * 0.4, (hung ? 0.03 : surface) + 0.003, (random() - 0.5) * (hung ? 0.07 : 0.28)] as P3, size: 0.003 + random() * 0.007 })));
      const crust = new THREE.MeshStandardMaterial({ color: '#7fb39a', roughness: 1 });
      kit.updateMatrixWorld(true);
      for (const g of blades) for (let i = 0; i < 5; i++) { const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.005 + random() * 0.006, 0), crust); blob.position.set((random() - 0.5) * 0.02, -random() * 0.2, random() * 0.01); g.add(blob); }
    }
    return s.finish();
  },
});

function lump(s: Sculpture, random: () => number, at: P3, size: number) {
  const geometry = new THREE.IcosahedronGeometry(size, 3);
  const p = geometry.attributes.position;
  const bumps = Array.from({ length: 5 }, () => [random() * 6, random() * 6, random() * 6]);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
    let k = 1;
    for (const [bx, by, bz] of bumps) k += 0.07 * Math.sin(v.x / size * 4 + bx) * Math.sin(v.y / size * 5 + by) * Math.sin(v.z / size * 4 + bz) * 3;
    v.multiplyScalar(k); v.y *= 0.75;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  const sponge = s.mesh(geometry, s.material('#c9a65c', { roughness: 1 }), at);
  const holes = s.material('#6e5326', { roughness: 1 });
  for (let i = 0; i < 14; i++) {
    const dir = new THREE.Vector3(random() - 0.5, random() * 0.6 + 0.1, random() - 0.2).normalize().multiplyScalar(size * 0.86);
    s.ball([size * 0.1, size * 0.1, size * 0.1], [at[0] + dir.x, at[1] + dir.y * 0.75, at[2] + dir.z], holes, 6).castShadow = false;
  }
  return sponge;
}
