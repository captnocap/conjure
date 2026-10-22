import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const BRAND = { red: '#c8232c', blue: '#1f5fb4', green: '#2c8a4b', orange: '#ea6a1a', yellow: '#e8bd1c' } as const;
const SIGN = {
  return: ['RETURN', 'CARTS HERE'],
  thanks: ['THANK YOU', 'FOR SHOPPING'],
  carts: ['CARTS', ''],
  parking: ['NO OVERNIGHT', 'PARKING'],
  blank: ['', ''],
} as const;

const UP = new THREE.Vector3(0, 1, 0);
function rodGeo(a: readonly [number, number, number], b: readonly [number, number, number], r: number) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
  const dir = to.clone().sub(from);
  const geo = new THREE.CylinderGeometry(r, r, dir.length(), 6);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()));
  geo.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return geo;
}

export default defineThing({
  questions: {
    style: choice('What kind of cart return is it?', {
      single: 'A narrow single-lane pen of two rails, the cheapest kind.',
      double: 'A two-lane pen with a centre rail, the supermarket standard.',
      roofed: 'A two-lane pen under an arched clear canopy.',
      hoops: 'Just two painted hoops and concrete kerbs marking a bay.',
    }),
    carts: score('How many carts are nested in it?', ['None, empty rails', 'Two or three', 'One full row', 'Jammed full and overflowing']),
    brand: choice('What colour are the cart handles and the sign?', {
      red: 'Discount-store red.',
      blue: 'Big-box blue.',
      green: 'Grocery green.',
      orange: 'Hardware orange.',
      yellow: 'Faded bargain yellow.',
    }),
    damage: choice('What has happened to the corral?', {
      intact: 'Nothing: straight rails, standing sign.',
      bent: 'A car backed into it; one side is buckled inward.',
      toppled: 'The sign post has been knocked flat across the rails.',
      stripped: 'Half the rails have been unbolted and taken away.',
    }),
    sign: choice('What does the sign flag say?', {
      return: 'RETURN CARTS HERE.',
      thanks: 'THANK YOU FOR SHOPPING.',
      carts: 'Just CARTS.',
      parking: 'NO OVERNIGHT PARKING.',
      blank: 'Sun-bleached to nothing.',
    }),
    stray: choice('What has ended up in or around it?', {
      nothing: 'Nothing but the carts.',
      bag: 'A plastic bag snagged on a rail, filling with wind.',
      leaves: 'A deep drift of dead leaves blown into the back.',
      tipped: 'A cart lying on its side just outside.',
      cone: 'A traffic cone and a wet-floor sign dumped in a cart.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const lanes = a.style === 'single' ? 1 : 2;
    const laneW = 0.82;
    const W = lanes * laneW + 0.16, L = 3.7;
    const brandColour = BRAND[a.brand];
    const steel = s.material(new THREE.Color('#b3b9bb').lerp(new THREE.Color('#8a5a3c'), wear * 0.45), { metalness: 0.55, roughness: 0.45 });
    const paintMat = s.material(brandColour, { roughness: 0.5 });
    const dark = s.material('#1f2124', { roughness: 0.8 });
    const R = 0.045;

    // Rails: a U of tube, open toward +z.
    const sideX = [-W / 2, W / 2];
    const bend = (x: number, z: number, side: number): [number, number] => {
      if (a.damage !== 'bent' || side !== 0) return [x, 0];
      const t = Math.max(0, 1 - Math.abs(z - 0.5) / 1.5);
      return [x + t * t * 0.55, -t * 0.12];
    };
    if (a.style !== 'hoops') {
      sideX.forEach((x, side) => {
        if (a.damage === 'stripped' && side === 1) {
          // Only the bolted feet and one stub remain.
          for (let z = -L / 2; z <= L / 2; z += L / 3) s.box([0.14, 0.02, 0.14], [x, 0.01, z], steel);
          s.rod([x, 0, -L / 2], [x + 0.05, 0.5, -L / 2], R, steel);
          return;
        }
        for (const y of [0.42, 0.98]) {
          const points: [number, number, number][] = [];
          for (let k = 0; k <= 8; k++) {
            const z = -L / 2 + (L * k) / 8;
            const [bx, by] = bend(x, z, side);
            points.push([bx, y + by, z]);
          }
          s.tube(points, R, steel);
        }
        for (let k = 0; k <= 3; k++) {
          const z = -L / 2 + (L * k) / 3;
          const [bx, by] = bend(x, z, side);
          s.rod([x, 0, z], [bx, 0.98 + by, z], R, steel);
          s.box([0.14, 0.02, 0.14], [x, 0.01, z], steel);
        }
        // Painted end hoop at the mouth.
        s.rod([x, 0.98, L / 2], [x, 0.42, L / 2 + 0.02], R * 1.25, paintMat);
      });
      if (a.damage !== 'stripped') for (const y of [0.42, 0.98]) s.rod([-W / 2, y, -L / 2], [W / 2, y, -L / 2], R, steel);
      if (lanes === 2) {
        s.rod([0, 0.42, -L / 2], [0, 0.42, L / 2 - 0.5], R, steel);
        for (let k = 0; k <= 2; k++) s.rod([0, 0, -L / 2 + k * (L - 0.5) / 2], [0, 0.42, -L / 2 + k * (L - 0.5) / 2], R, steel);
      }
    } else {
      for (const x of sideX) {
        s.box([0.2, 0.14, L], [x, 0.07, 0], s.material('#e3c21f', { roughness: 0.9 }));
      }
      for (const z of [-L / 2, L / 2 - 0.4]) {
        s.tube([[-W / 2, 0, z], [-W / 2, 1.2, z], [-W / 2 + 0.2, 1.42, z], [W / 2 - 0.2, 1.42, z], [W / 2, 1.2, z], [W / 2, 0, z]], R * 1.3, paintMat);
      }
    }

    // Canopy.
    if (a.style === 'roofed') {
      const hoop = (z: number) => {
        const pts: [number, number, number][] = [];
        for (let k = 0; k <= 10; k++) {
          const t = (k / 10) * Math.PI;
          pts.push([-Math.cos(t) * (W / 2 + 0.05), 1.75 + Math.sin(t) * 0.65, z]);
        }
        s.tube(pts, R, steel);
        for (const x of sideX) s.rod([x - Math.sign(x) * -0.05, 0.98, z], [x + Math.sign(x) * 0.05, 1.75, z], R, steel);
      };
      for (let k = 0; k <= 3; k++) hoop(-L / 2 + 0.1 + (k * (L - 0.6)) / 3);
      const cover = new THREE.CylinderGeometry(1, 1, L - 0.4, 16, 1, true, -Math.PI / 2, Math.PI);
      cover.rotateX(Math.PI / 2);
      cover.scale(W / 2 + 0.09, 0.69, 1);
      const sheet = s.mesh(cover, new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cfe3ea').lerp(new THREE.Color('#b5a888'), wear * 0.7),
        transparent: true, opacity: mix(0.3, 0.55, wear), roughness: 0.3, depthWrite: false, side: THREE.DoubleSide,
      }), [0, 1.75, -0.2]);
      sheet.castShadow = false;
    }

    // Sign post with its flag.
    const lines = SIGN[a.sign];
    const fade = mix(0, 0.6, wear);
    const signTexture = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 192;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = brandColour; ctx.fillRect(0, 0, 256, 192);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 10, 236, 172);
      ctx.fillStyle = brandColour; ctx.fillRect(16, 16, 224, 160);
      ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px Arial, Helvetica, sans-serif';
      if (lines[1]) { ctx.fillText(lines[0], 128, 62, 204); ctx.font = 'bold 34px Arial, Helvetica, sans-serif'; ctx.fillText(lines[1], 128, 112, 204); } else ctx.fillText(lines[0], 128, 80, 204);
      // A little cart pictogram.
      if (a.sign !== 'blank') {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.beginPath();
        ctx.moveTo(86, 140); ctx.lineTo(100, 140); ctx.lineTo(110, 162); ctx.lineTo(160, 162); ctx.lineTo(168, 144); ctx.lineTo(104, 144); ctx.stroke();
        ctx.beginPath(); ctx.arc(116, 170, 4, 0, 7); ctx.arc(154, 170, 4, 0, 7); ctx.fill();
      }
      ctx.fillStyle = `rgba(236,232,220,${a.sign === 'blank' ? 0.82 : fade})`; ctx.fillRect(0, 0, 256, 192);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const post = new THREE.Group();
    const postH = a.style === 'roofed' ? 3.1 : 2.7;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, postH, 8), steel);
    pole.position.y = postH / 2;
    const signMat = new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.6, side: THREE.DoubleSide });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.68, 0.03), [dark, dark, dark, dark, signMat, signMat]);
    board.position.set(0, postH - 0.36, 0.06);
    // The tattered pennant above it.
    const flagGeo = new THREE.PlaneGeometry(0.7, 0.36, 10, 3);
    const flagPos = flagGeo.attributes.position;
    const rest = new Float32Array(flagPos.array);
    const tatter = Array.from({ length: 4 }, () => random());
    for (let k = 0; k < flagPos.count; k++) {
      const u = flagPos.getX(k) / 0.7 + 0.5, row = Math.round((flagPos.getY(k) / 0.36 + 0.5) * 3);
      // Shred the free edge more as things wear out.
      if (u > 0.55) rest[k * 3] -= (u - 0.55) * 0.7 * tatter[row] * mix(0.2, 1.3, wear);
      rest[k * 3] += 0.37;
    }
    flagPos.array.set(rest);
    const flag = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: new THREE.Color(brandColour).lerp(new THREE.Color('#ded8c8'), fade), roughness: 0.8, side: THREE.DoubleSide }));
    flag.position.set(0, postH + 0.24, 0);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), steel);
    mast.position.y = postH + 0.2;
    post.add(pole, board, flag, mast);
    post.traverse((node) => { node.castShadow = true; });
    if (a.damage === 'toppled') {
      post.position.set(-W / 2 - 0.1, 0.06, -L / 2 + 0.2);
      post.rotation.set(Math.PI / 2 - 0.34, 0, -0.42, 'YXZ');
      s.box([0.2, 0.03, 0.2], [-W / 2 - 0.1, 0.015, -L / 2 + 0.1], steel);
    } else {
      post.position.set(a.style === 'hoops' ? W / 2 + 0.12 : 0, 0, -L / 2 - 0.02);
      post.rotation.z = (random() - 0.5) * mix(0.02, 0.22, wear);
      post.rotation.x = (random() - 0.5) * mix(0.0, 0.12, wear);
    }
    s.root.add(post);

    // Carts, instanced: basket mesh, steel frame, coloured handle, wheels.
    const grid = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 128, 128);
      ctx.strokeStyle = '#e4e8e9'; ctx.lineWidth = 6;
      for (let k = 0; k <= 128; k += 16) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 128); ctx.stroke(); }
      ctx.lineWidth = 5;
      for (let k = 0; k <= 128; k += 32) { ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(128, k); ctx.stroke(); }
      ctx.lineWidth = 14; ctx.strokeRect(0, 0, 128, 128);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const basketGeo = new THREE.BoxGeometry(0.52, 0.42, 0.82);
    {
      // Taper the basket toward its nose, as real carts do so they nest.
      const p = basketGeo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        if (p.getZ(k) < 0) { p.setX(k, p.getX(k) * 0.72); if (p.getY(k) < 0) p.setY(k, p.getY(k) + 0.1); }
      }
      basketGeo.translate(0, 0.8, 0);
    }
    const frameGeo = mergeGeometries([
      rodGeo([-0.26, 1.01, 0.41], [-0.19, 1.01, -0.41], 0.02), rodGeo([0.26, 1.01, 0.41], [0.19, 1.01, -0.41], 0.02),
      rodGeo([-0.19, 1.01, -0.41], [0.19, 1.01, -0.41], 0.02),
      rodGeo([-0.27, 0.16, 0.42], [-0.27, 1.06, 0.46], 0.022), rodGeo([0.27, 0.16, 0.42], [0.27, 1.06, 0.46], 0.022),
      rodGeo([-0.27, 0.16, 0.42], [-0.17, 0.2, -0.42], 0.022), rodGeo([0.27, 0.16, 0.42], [0.17, 0.2, -0.42], 0.022),
      rodGeo([-0.17, 0.2, -0.42], [0.17, 0.2, -0.42], 0.022),
      rodGeo([-0.17, 0.2, -0.42], [-0.19, 0.68, -0.41], 0.02), rodGeo([0.17, 0.2, -0.42], [0.19, 0.68, -0.41], 0.02),
    ])!;
    const handleGeo = mergeGeometries([
      rodGeo([-0.29, 1.07, 0.47], [0.29, 1.07, 0.47], 0.032),
      new THREE.BoxGeometry(0.4, 0.2, 0.02).translate(0, 0.86, 0.405),
    ])!;
    const wheelBase = new THREE.CylinderGeometry(0.055, 0.055, 0.03, 10).rotateZ(Math.PI / 2);
    const wheelGeo = mergeGeometries([[-0.27, 0.42], [0.27, 0.42], [-0.17, -0.42], [0.17, -0.42]].map(([x, z]) => wheelBase.clone().translate(x, 0.055, z)))!;
    wheelBase.dispose();

    const placements: THREE.Matrix4[] = [];
    const put = (x: number, y: number, z: number, yaw: number, roll = 0) => {
      placements.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, roll)), new THREE.Vector3(1, 1, 1)));
    };
    const perLane = Math.round(a.carts * 9 * mix(0.8, 1.1, random()));
    for (let lane = 0; lane < lanes; lane++) {
      const x = (lane - (lanes - 1) / 2) * laneW;
      const n = Math.max(0, Math.min(9, lane === 0 ? perLane : Math.round(perLane * mix(0.2, 1, random()))));
      for (let i = 0; i < n; i++) put(x + (random() - 0.5) * 0.04, 0, -L / 2 + 0.62 + i * 0.29, (random() - 0.5) * 0.05);
    }
    if (a.carts > 0.85) {
      // Overflow: strays abandoned near the mouth at careless angles.
      for (let i = 0; i < 3; i++) put((random() - 0.5) * (W + 1.6), 0, L / 2 + 0.5 + random() * 0.9, (random() - 0.5) * 2.4);
    }
    if (a.stray === 'tipped') put(W / 2 + 0.75 + random() * 0.3, 0.29, 0.6 + random(), random() * 3, Math.PI / 2);
    if (a.stray === 'cone' && placements.length === 0) put(0, 0, -L / 2 + 0.62, 0);
    if (placements.length) {
      const basketMat = new THREE.MeshStandardMaterial({ map: grid, alphaTest: 0.4, side: THREE.DoubleSide, metalness: 0.4, roughness: 0.5 });
      for (const [geo, mat] of [[basketGeo, basketMat], [frameGeo, steel], [handleGeo, paintMat], [wheelGeo, dark]] as const) {
        const mesh = new THREE.InstancedMesh(geo, mat, placements.length);
        placements.forEach((m, i) => mesh.setMatrixAt(i, m));
        mesh.castShadow = mesh.receiveShadow = true;
        s.root.add(mesh);
      }
    }
    if (a.stray === 'cone') {
      const at = new THREE.Vector3().setFromMatrixPosition(placements[0]);
      const orange = s.material('#f0641c', { roughness: 0.6 });
      const cone = s.mesh(new THREE.ConeGeometry(0.13, 0.5, 14), orange, [at.x - 0.05, 0.98, at.z - 0.1]);
      cone.rotation.set(0.5, 0, 0.7);
      s.box([0.02, 0.6, 0.28], [at.x + 0.12, 0.98, at.z + 0.1], s.material('#f0cf1c')).rotation.z = 0.3;
    }

    // Leaves drift into the back corners; more of them when asked or when the lot is neglected.
    const leafCount = Math.round((a.stray === 'leaves' ? 260 : mix(6, 90, wear)) * mix(0.7, 1.2, random()));
    const leafGeo = new THREE.TetrahedronGeometry(0.05).scale(1, 0.25, 1.3);
    const leafHues = ['#8a5a2b', '#a8702f', '#6e4a26', '#b98a3a', '#7d6a3a'];
    s.scatter(leafGeo, s.material('#8a5a2b', { roughness: 1 }), Array.from({ length: leafCount }, () => {
      const deep = a.stray === 'leaves' && random() < 0.6;
      const z = deep ? -L / 2 + random() * random() * 1.6 : -L / 2 + random() * L * 1.15;
      const pile = deep ? Math.max(0, 1 - (z + L / 2) / 1.6) * 0.3 * random() : 0;
      return {
        at: [(random() - 0.5) * (W + (deep ? -0.1 : 0.9)), 0.012 + pile, z] as const,
        size: mix(0.7, 1.6, random()),
        color: leafHues[Math.floor(random() * leafHues.length)],
      };
    }));

    // Plastic bag, snagged and breathing.
    let bag: THREE.Mesh | null = null;
    if (a.stray === 'bag') {
      const geo = new THREE.IcosahedronGeometry(0.17, 2);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, k);
        const n = 1 + Math.sin(v.x * 23 + v.y * 11) * 0.12 + Math.sin(v.z * 31 + v.y * 7) * 0.1;
        v.multiplyScalar(n);
        if (v.y > 0.08) v.x *= 0.5, v.z *= 0.5; // gathered at the handles
        p.setXYZ(k, v.x, v.y * 1.25, v.z);
      }
      geo.computeVertexNormals();
      bag = s.mesh(geo, new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.35, flatShading: true }), [W / 2 + 0.02, 0.8, 0.6 + random()]);
      s.rod([W / 2, 0.98, bag.position.z], [W / 2 + 0.02, 0.92, bag.position.z], 0.012, bag.material as THREE.Material);
    }

    // The slab it is bolted to, with painted bay lines.
    s.box([W + 0.9, 0.05, L + 0.5], [0, -0.025, 0], s.material('#56585a', { roughness: 1 }));
    const line = s.material(new THREE.Color('#e8e4d2').lerp(new THREE.Color('#77776f'), wear * 0.7), { roughness: 0.9 });
    for (const x of [-1, 1]) s.box([0.1, 0.006, L + 0.4], [x * (W / 2 + 0.34), 0.003, 0], line);

    const sway = mix(0.3, 2.6, mood.energy);
    return s.finish({
      footprint: Math.max(W, L) / 2 + 0.3,
      update: (_dt, time) => {
        const p = flagGeo.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const u = rest[k * 3] / 0.72;
          p.setZ(k, Math.sin(time * sway * 3 + u * 5) * 0.07 * u * mix(0.3, 1, mood.energy));
        }
        p.needsUpdate = true;
        if (bag) {
          const breath = 1 + Math.sin(time * sway * 2.1) * 0.08 * mix(0.3, 1, mood.energy);
          bag.scale.set(breath, 1 / breath, breath);
          bag.rotation.z = Math.sin(time * sway * 1.3) * 0.25;
        }
      },
    });
  },
});
