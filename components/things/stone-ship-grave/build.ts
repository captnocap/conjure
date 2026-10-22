import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Stone { at: P3; size: P3; turn: number; tip: [number, number]; colour: string; kind: number }

/** A lumpy boulder with flat facets, narrowing toward the top. */
function boulder(seed: number, taper: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const at = geometry.attributes.position;
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    const bump = 1 + 0.16 * Math.sin(x * 5.1 + seed) * Math.cos(y * 4.3 + seed * 1.7) + 0.1 * Math.sin(z * 6.7 + seed * 2.3);
    const narrow = 1 - taper * Math.max(0, y) ;
    at.setXYZ(i, x * bump * narrow, y * (1 + 0.08 * Math.sin(x * 3 + seed)), z * bump * narrow);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const STONE_TONES = {
  granite: ['#9a9c9b', '#8a8d8e', '#a9aaa6', '#7f8284'],
  red: ['#a98a80', '#9a766c', '#b89c92', '#8a6a62'],
  dark: ['#63666b', '#55585d', '#73767b', '#4c4f54'],
  pale: ['#c9c4b4', '#b8b3a2', '#d6d2c4', '#a8a393'],
  mixed: ['#9a9c9b', '#63666b', '#c9c4b4', '#a98a80'],
} as const;

export default defineThing({
  questions: {
    hull: choice('What shape of ship do the stones draw?', {
      slender: 'A long narrow warship, sharp at both ends.',
      broad: 'A beamy cargo ship, wide in the middle.',
      boat: 'A short stubby boat, almost an oval.',
    }),
    stones: choice('What are the stones like?', {
      granite: 'Rounded grey granite boulders.',
      red: 'Warm red-brown granite.',
      dark: 'Dark sea-worn basalt.',
      pale: 'Pale limestone slabs set on edge, thin and tooth-like.',
      mixed: 'Whatever the fields gave up: grey, dark, pale and red together.',
    }),
    ends: choice('How do the prow and stern stones stand?', {
      twin: 'Two tall pointed stones of equal height.',
      prow: 'A towering prow stone and a much lower stern stone.',
      leaning: 'Both tall, both leaning outward like raked stems.',
      carved: 'The prow stone carries a red-painted band of runes.',
    }),
    inside: choice('What lies inside the ship?', {
      grass: 'Nothing but grass.',
      cairn: 'A low cairn of fist-sized stones over the burial.',
      mast: 'A single upright stone amidships where the mast would stand.',
      benches: 'Rows of small stones across the hull, like rowing benches.',
      pyre: 'A black scar of charcoal and ash where the pyre burned.',
    }),
    state: choice('What has time done to it?', {
      fresh: 'Newly raised: raw earth inside, turf cut clean around it.',
      kept: 'Old but tended: complete, the grass grazed short.',
      overgrown: 'Forgotten: heather and scrub growing through, stones half swallowed.',
      plundered: 'Robbed long ago: a pit dug into the middle, stones toppled and missing.',
    }),
    offering: choice('What has been left there?', {
      nothing: 'Nothing.',
      torches: 'Two torches burning either side of the prow stone.',
      weapons: 'A shield and a sword laid amidships.',
      flowers: 'A wreath of wild flowers on the prow stone.',
    }),
    size: score('How large a ship is it?', ['A small boat for one person', 'A ship of a dozen paces', 'A great ship fit for a king']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const L = mix(5.5, 17, a.size) * (a.hull === 'boat' ? 0.75 : 1);
    const W = L * { slender: 0.25, broad: 0.36, boat: 0.48 }[a.hull];
    const power = { slender: 1.3, broad: 1.05, boat: 0.8 }[a.hull];
    const tones = STONE_TONES[a.stones];
    const slab = a.stones === 'pale';
    const unit = mix(0.85, 1.3, a.size);
    const ruin = a.state === 'plundered' ? mix(0.35, 0.6, mood.wear) : a.state === 'overgrown' ? mix(0.1, 0.25, mood.wear) : mood.wear * 0.08;

    // Turf rise, itself drawn as a hull so the ship reads from far off.
    const turfColour = new THREE.Color('#77854c').lerp(new THREE.Color('#9a9166'), mix(0.6, 0.1, mood.warmth));
    const topY = 0.2 + L * 0.012;
    const margin = 1.1 * unit;
    const halfAt = (u: number) => (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), power);
    const hullShape = (grow: number) => {
      const shape = new THREE.Shape(), n = 48, long = L / 2 + grow * 1.3;
      const edge = (i: number, side: number) => { const u = i / n; return [-long + u * long * 2, side * (halfAt(u) + grow * Math.pow(Math.sin(Math.PI * u), 0.6))] as const; };
      for (let i = 0; i <= n; i++) { const [x, z] = edge(i, 1); if (i) shape.lineTo(x, z); else shape.moveTo(x, z); }
      for (let i = n; i >= 0; i--) shape.lineTo(...edge(i, -1));
      return shape;
    };
    const turf = s.mesh(new THREE.ExtrudeGeometry(hullShape(margin), { depth: topY - 0.1, bevelEnabled: true, bevelSize: 0.35, bevelThickness: 0.1, bevelSegments: 3, curveSegments: 1 }), s.material(turfColour), [0, topY, 0]);
    turf.rotation.x = Math.PI / 2;
    const rise = (_x: number, _z: number) => topY + 0.08;
    if (a.state === 'fresh') {
      const patch = s.mesh(new THREE.ExtrudeGeometry(hullShape(-0.25 * unit), { depth: 0.05, bevelEnabled: false, curveSegments: 1 }), s.material('#6b5540'), [0, topY + 0.14, 0]);
      patch.rotation.x = Math.PI / 2;
    }

    // The ship outline, resampled so the stones stand evenly spaced.
    const stoneList: Stone[] = [];
    const dense: [number, number][] = Array.from({ length: 201 }, (_u, i) => { const u = i / 200; return [-L / 2 + u * L, (W / 2) * Math.pow(Math.sin(Math.PI * u), power)]; });
    const lengths = [0];
    for (let i = 1; i < dense.length; i++) lengths.push(lengths[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
    const total = lengths[lengths.length - 1];
    const gap = (slab ? 0.7 : 0.9) * unit * mix(1.15, 0.85, mood.density);
    const perSide = Math.max(4, Math.round(total / gap));
    const endHeight = mix(2.0, 3.6, a.size), midHeight = mix(0.6, 1.0, a.size);
    const addStone = (x: number, z: number, h: number, w: number, d: number, turn: number, fallChance: number, lean: [number, number] = [0, 0]) => {
      if (random() < fallChance * 0.45) return;
      const fallen = random() < fallChance;
      const tip: [number, number] = fallen ? [Math.PI / 2 - 0.15 + random() * 0.2, random() * 6.3] : [lean[0] + (random() - 0.5) * 0.16 * (1 + mood.wear), lean[1]];
      const sunk = a.state === 'overgrown' ? 0.75 : 1;
      stoneList.push({ at: [x + (fallen ? (random() - 0.5) * h : 0), rise(x, z) + (fallen ? d * 0.4 : h * 0.42 * sunk), z + (fallen ? (random() - 0.5) * h : 0)], size: [w / 2, h * 0.58, d / 2], turn, tip, colour: pick(tones), kind: Math.floor(random() * 3) });
    };
    for (const side of [-1, 1]) for (let i = 1; i < perSide; i++) {
      const target = (i / perSide) * total;
      let k = 1;
      while (lengths[k] < target) k++;
      const f = (target - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1);
      const x = mix(dense[k - 1][0], dense[k][0], f), z = mix(dense[k - 1][1], dense[k][1], f) * side;
      const tangent = Math.atan2((dense[k][1] - dense[k - 1][1]) * side, dense[k][0] - dense[k - 1][0]);
      const along = Math.abs((2 * i) / perSide - 1);
      const h = mix(midHeight, endHeight * 0.66, Math.pow(along, 1.8)) * (0.8 + random() * 0.4);
      const w = (slab ? 0.8 : 0.78) * unit * (0.8 + random() * 0.4) * (0.8 + h * 0.25);
      addStone(x + (random() - 0.5) * 0.12, z + (random() - 0.5) * 0.12, h, w, slab ? 0.2 * unit : w * (0.6 + random() * 0.3), -tangent, ruin);
    }
    // Prow at +x, stern at -x.
    const lean = a.ends === 'leaning' ? 0.3 : 0.04;
    const prowH = endHeight * (a.ends === 'prow' ? 1.25 : 1), sternH = endHeight * (a.ends === 'prow' ? 0.5 : 0.95);
    const endWidth = (slab ? 0.9 : 0.8) * unit;
    addStone(L / 2, 0, prowH, endWidth * 1.15, slab ? 0.3 * unit : endWidth * 0.75, Math.PI / 2, 0, [lean, Math.PI / 2]);
    addStone(-L / 2, 0, sternH, endWidth, slab ? 0.28 * unit : endWidth * 0.7, Math.PI / 2, a.state === 'plundered' ? 0.3 : 0, [lean, -Math.PI / 2]);
    const prowTop: P3 = [L / 2 + Math.sin(lean) * prowH * 0.5, rise(L / 2, 0) + prowH * 0.95, 0];

    // Inside the hull.
    const centreY = rise(0, 0);
    if (a.inside === 'mast') addStone(0, 0, endHeight * 0.7, 0.6 * unit, 0.5 * unit, random() * 3, ruin * 0.5);
    if (a.inside === 'benches') {
      const rows = Math.max(2, Math.round(L / 3.2));
      for (let r = 1; r <= rows; r++) {
        const u = r / (rows + 1), x = -L / 2 + u * L, half = (W / 2) * Math.pow(Math.sin(Math.PI * u), power) - 0.7 * unit;
        for (let z = -half; z <= half + 0.01; z += 0.55 * unit) addStone(x, z, 0.3 * unit, 0.42 * unit, 0.36 * unit, random() * 3, ruin);
      }
    }
    if (a.inside === 'cairn') {
      const pebbles = Array.from({ length: 150 }, () => {
        const angle = random() * 6.3, r = Math.sqrt(random()), rx = L * 0.14, rz = W * 0.26;
        return { at: [Math.cos(angle) * r * rx, centreY + (1 - r) * 0.45 * unit * (0.7 + random() * 0.3), Math.sin(angle) * r * rz] as P3, size: (0.1 + random() * 0.1) * unit, color: pick(tones) };
      });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#ffffff'), pebbles);
    }
    if (a.inside === 'pyre') {
      const scar = s.cylinder(1, 1, 0.05, [0, centreY, 0], s.material('#2a2623'), 20);
      scar.scale.set(L * 0.14, 1, W * 0.28);
      s.ball([L * 0.08, 0.1, W * 0.15], [0.2, centreY, 0], s.material('#8d8a84'), 12);
      for (let i = 0; i < 12; i++) {
        const x = (random() - 0.5) * L * 0.2, z = (random() - 0.5) * W * 0.36, angle = random() * 3;
        s.rod([x, centreY + 0.04, z], [x + Math.cos(angle) * 0.6, centreY + 0.06 + random() * 0.12, z + Math.sin(angle) * 0.6], 0.04, s.material('#17140f'));
      }
    }
    if (a.state === 'plundered') {
      const px = (random() - 0.5) * L * 0.15;
      const pit = s.cylinder(1, 0.8, 0.06, [px, centreY, 0], s.material('#3a2e24'), 14);
      pit.scale.set(W * 0.3, 1, W * 0.22);
      const rim = s.ring(1, 0.22, [px, centreY - 0.03, 0], s.material('#6b5540'));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(W * 0.31, W * 0.23, 1);
      s.ball([W * 0.26, 0.4 * unit, W * 0.2], [px + W * 0.5, centreY, W * 0.16], s.material('#75604a'), 12);
    }

    // All stones in three instanced families.
    const stoneMaterial = s.material('#ffffff', { flatShading: true, roughness: 0.95 });
    const q = new THREE.Quaternion(), tipQ = new THREE.Quaternion(), m = new THREE.Matrix4(), euler = new THREE.Euler();
    for (let kind = 0; kind < 3; kind++) {
      const family = stoneList.filter((stone) => stone.kind === kind);
      if (!family.length) continue;
      const mesh = new THREE.InstancedMesh(boulder(kind * 3.1 + 1, slab ? 0.45 : 0.3 + kind * 0.08), stoneMaterial, family.length);
      family.forEach((stone, i) => {
        q.setFromEuler(euler.set(0, stone.turn, 0));
        // Tip the stone over about a horizontal axis pointing along tip[1].
        tipQ.setFromAxisAngle(new THREE.Vector3(Math.cos(stone.tip[1] + Math.PI / 2), 0, -Math.sin(stone.tip[1] + Math.PI / 2)), -stone.tip[0]);
        m.compose(new THREE.Vector3(...stone.at), tipQ.multiply(q), new THREE.Vector3(...stone.size));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(stone.colour).offsetHSL(0, 0, (random() - 0.5) * 0.06));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    if (a.ends === 'carved') {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.strokeStyle = '#a8231a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.strokeRect(6, 6, 52, 244);
      for (let y = 24; y < 240; y += 26) {
        ctx.beginPath(); ctx.moveTo(32, y - 9); ctx.lineTo(32, y + 9);
        const kind = Math.floor(random() * 4);
        if (kind === 0) { ctx.moveTo(32, y - 4); ctx.lineTo(46, y - 10); }
        if (kind === 1) { ctx.moveTo(20, y - 4); ctx.lineTo(44, y + 4); }
        if (kind === 2) { ctx.moveTo(32, y - 9); ctx.lineTo(44, y - 2); ctx.lineTo(32, y + 2); }
        if (kind === 3) { ctx.moveTo(32, y); ctx.lineTo(20, y - 9); ctx.moveTo(32, y); ctx.lineTo(44, y - 9); }
        ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const band = s.mesh(new THREE.PlaneGeometry(endWidth * 0.36, prowH * 0.62), new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.3, roughness: 0.9 }), [L / 2 - (slab ? 0.16 : 0.33) * unit, rise(L / 2, 0) + prowH * 0.5, 0]);
      band.rotation.y = -Math.PI / 2;
      band.castShadow = false;
    }

    // Grass, heather and scrub.
    const wild = a.state === 'overgrown';
    const tuft = new THREE.ConeGeometry(0.03, 0.34, 4);
    tuft.translate(0, 0.17, 0);
    const spread = (n: number, make: (x: number, z: number) => { at: P3; size: number; color: string }) => Array.from({ length: n }, () => {
      const u = 0.03 + random() * 0.94, reach = halfAt(u) + margin * 0.8 * Math.pow(Math.sin(Math.PI * u), 0.6);
      return make(-L / 2 + u * L, (random() * 2 - 1) * reach);
    });
    const grassCount = a.state === 'fresh' ? 30 : Math.round(mix(40, 130, mood.density) * (wild ? 1.6 : 1));
    s.scatter(tuft, s.material('#ffffff'), spread(grassCount, (x, z) => ({ at: [x, rise(x, z), z], size: (wild ? 1.5 : 0.9) * (0.6 + random() * 0.8) * unit, color: pick(['#8a9258', '#a3a46a', '#6c7a48', '#b0a878']) })));
    if (wild) {
      s.scatter(new THREE.IcosahedronGeometry(1, 0), s.material('#ffffff', { flatShading: true }), spread(Math.round(mix(14, 36, mood.density)), (x, z) => ({ at: [x, rise(x, z) + 0.02, z], size: (0.16 + random() * 0.2) * unit, color: pick(['#7b6680', '#86748a', '#56693f', '#5d7446', '#6d5a72']) })));
    }

    // Offerings.
    const flames: THREE.Mesh[] = [];
    if (a.offering === 'torches') {
      for (const side of [-1, 1]) {
        const x = L / 2 - 0.5 * unit, z = side * 0.95 * unit, y0 = rise(x, z);
        s.rod([x, y0, z], [x, y0 + 1.45, z], 0.035, s.material('#5a4630'));
        s.cylinder(0.075, 0.045, 0.2, [x, y0 + 1.5, z], s.material('#2a2019'), 8);
        s.ball([0.07, 0.09, 0.07], [x, y0 + 1.64, z], s.material('#ffd27a', { emissive: '#ff8a1e', emissiveIntensity: 2 }), 8);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5 * mix(0.7, 1.4, mood.energy), 7), new THREE.MeshStandardMaterial({ color: '#ffb23a', emissive: '#ff6a12', emissiveIntensity: 1.8, transparent: true, opacity: 0.85, depthWrite: false }));
        flame.position.set(x, y0 + 1.85, z);
        s.root.add(flame);
        flames.push(flame);
      }
    }
    if (a.offering === 'weapons') {
      const x = a.inside === 'grass' ? 0 : L * 0.2, y = rise(x, 0) - 0.02;
      const disc = s.cylinder(0.45, 0.45, 0.04, [x, y + 0.02, 0.1], s.material(pick(['#b3312a', '#2f5d8c', '#d9b441'])), 22);
      disc.rotation.x = 0.08;
      s.ball([0.09, 0.07, 0.09], [x, y + 0.06, 0.1], s.material('#6b6e72', { metalness: 0.6, roughness: 0.4 }), 10);
      s.ring(0.45, 0.016, [x, y + 0.03, 0.1], s.material('#4a3a2a')).rotation.x = Math.PI / 2;
      const steel = s.material('#b9bdc1', { metalness: 0.75, roughness: 0.3 });
      s.box([0.82, 0.012, 0.055], [x + 0.1, y + 0.02, -0.55], steel).rotation.y = 0.15;
      s.box([0.03, 0.035, 0.2], [x - 0.3, y + 0.025, -0.49], s.material('#9a7a34', { metalness: 0.6 })).rotation.y = 0.15;
      s.rod([x - 0.31, y + 0.025, -0.487], [x - 0.42, y + 0.025, -0.47], 0.018, s.material('#3a2a1e'));
    }
    if (a.offering === 'flowers') {
      const wreath = s.ring(0.3 * unit, 0.05 * unit, [prowTop[0] - 0.1, prowTop[1] - prowH * 0.3, 0], s.material('#5f7a3c'));
      wreath.rotation.y = Math.PI / 2;
      wreath.scale.set(1.4, 1.4, 4);
      const centre = wreath.position;
      s.scatter(new THREE.SphereGeometry(1, 6, 5), s.material('#ffffff'), Array.from({ length: 18 }, (_u, i) => ({ at: [centre.x + (random() - 0.5) * 0.5 * unit, centre.y + Math.sin(i * 0.35) * 0.42 * unit, Math.cos(i * 0.35) * 0.42 * unit] as P3, size: 0.05 * unit, color: pick(['#f1e9c9', '#d9a8c0', '#e4c94e', '#b9c7ee']) })));
    }

    return s.finish({
      footprint: L * 0.55,
      update: flames.length ? (_dt, time) => flames.forEach((flame, i) => { flame.scale.set(1 + Math.sin(time * 9 + i) * 0.1, 1 + Math.sin(time * 7 + i * 2) * 0.22, 1); }) : undefined,
    });
  },
});
