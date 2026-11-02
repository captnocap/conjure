import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, paint, paintHex, score } from '@conjure/kit';
import { leafGeometry, pumpkin, stem } from './pumpkin';

type Variety = 'classic' | 'goblin' | 'cinderella' | 'lumina' | 'little' | 'mixed';

const SHAPES: Record<Exclude<Variety, 'mixed'>, { radius: number; height: number; ribs: number; groove: number; warts: number }> = {
  classic: { radius: 0.2, height: 0.33, ribs: 10, groove: 0.8, warts: 0 },
  goblin: { radius: 0.17, height: 0.26, ribs: 8, groove: 0.6, warts: 26 },
  cinderella: { radius: 0.26, height: 0.2, ribs: 12, groove: 1.1, warts: 0 },
  lumina: { radius: 0.19, height: 0.27, ribs: 9, groove: 0.45, warts: 0 },
  little: { radius: 0.085, height: 0.07, ribs: 10, groove: 1, warts: 0 },
};

export default defineThing({
  questions: {
    variety: choice('What kind of pumpkins are growing here?', {
      classic: 'Classic jack-o-lantern pumpkins: tall, round, evenly ribbed, made for carving.',
      goblin: 'Warty goblin pumpkins: knobbly, lumpy skin covered in blistered warts, a little sinister.',
      cinderella: 'Flat Cinderella pumpkins: squat, wide and deeply ribbed like a fairy-tale coach.',
      lumina: 'White Lumina pumpkins: smooth, round and chalk-white, ghostly in the dusk.',
      little: 'Tiny Jack-Be-Little pumpkins: palm-sized and flat, a scatter of miniatures.',
      mixed: 'A mixed heirloom patch: one of each, different shapes and sizes side by side.',
    }),
    count: score('How many pumpkins are on these vines?', ['Two', 'Three', 'Four', 'Five']),
    rind: paint('What colour is the rind (unless they are white Luminas)?', ['orange', 'amber', 'rust', 'coral', 'yellow', 'cream', 'green', 'grey']),
    season: choice('How far gone is the vine?', {
      lush: 'Early autumn: the vine is still lush, with big dark green ragged leaves shading the fruit.',
      yellowing: 'Late October: leaves yellowing and mottled with mildew, the fruit showing through.',
      frost: 'After the first hard frost: leaves blackened and collapsed, vines withered, the pumpkins bare.',
    }),
    story: choice('What has happened in the patch?', {
      growing: 'Nothing yet: every pumpkin lies just as it grew, still on the vine.',
      cut: 'One has been cut from the vine and turned stem-up, ready for someone to pick it up.',
      smashed: 'One has been smashed open on the dirt, pulp and seeds spilling out.',
      gnawed: 'Something has gnawed a ragged hole into the biggest one in the night.',
    }),
    straw: noul('Is there golden straw mulch spread under the vines?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = 2 + Math.round(a.count * 3) + (a.variety === 'little' ? 3 + Math.round(a.count * 3) : 0);
    const rindHex = paintHex(a.rind, '#e2701a');
    const dirt = s.material(new THREE.Color('#5a4030').lerp(new THREE.Color('#3a2a20'), mood.wear * 0.5));
    const stemWood = s.material('#6e6236', { roughness: 0.9 });
    const leafHue = { lush: '#2f6a2a', yellowing: '#9a9a3a', frost: '#2b2a22' }[a.season];
    const leafMat = s.material(leafHue, { side: THREE.DoubleSide, roughness: 0.75 });
    const vineMat = s.material(a.season === 'frost' ? '#3a3826' : '#4f7a2e', { roughness: 0.8 });
    const tatter = a.season === 'lush' ? 0.15 : a.season === 'yellowing' ? 0.5 : 1;

    // Pumpkins laid out along a wandering main vine.
    const kinds: Exclude<Variety, 'mixed'>[] = a.variety === 'mixed' ? ['classic', 'goblin', 'cinderella', 'lumina', 'little'] : [a.variety];
    const spots: THREE.Vector3[] = [];
    const sizes: number[] = [];
    const startAng = random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const kind = a.variety === 'mixed' ? kinds[(i + Math.floor(random() * 5)) % 5] : kinds[0];
      const base = SHAPES[kind];
      const k = (0.85 + random() * 0.3) * (i === 0 ? 1.15 : 1);
      const radius = base.radius * k;
      const ang = startAng + (i / count) * Math.PI * 2 + (random() - 0.5) * 0.6;
      const dist = count === 2 ? 0.26 : 0.18 + random() * 0.22 + (kind === 'little' ? 0.05 : 0);
      const at = new THREE.Vector3(Math.cos(ang) * dist * 1.25, 0, Math.sin(ang) * dist);
      // Keep them from overlapping.
      for (let tries = 0; tries < 8; tries++) {
        const clash = spots.some((p, j) => p.distanceTo(at) < (sizes[j] + radius) * 1.05);
        if (!clash) break;
        at.multiplyScalar(1.18);
      }
      spots.push(at);
      sizes.push(radius);
      const white = kind === 'lumina' || (a.variety === 'lumina');
      let colour = new THREE.Color(white ? '#eeebe0' : rindHex);
      if (!white) colour.offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.06);
      // Frost and wear blotch the rind toward a bruised tan.
      colour = colour.lerp(new THREE.Color('#8a6a45'), mood.wear * 0.3);
      const turned = a.story === 'cut' && i === 1 % count;
      const smashed = a.story === 'smashed' && i === count - 1;
      const group = new THREE.Group();
      group.position.copy(at).setY(0.03);
      const sub = new Sculpture(context);
      const body = pumpkin(sub, { radius, height: base.height * k, ribs: base.ribs, groove: base.groove, warts: base.warts, slump: kind === 'cinderella' ? 0.3 : 0.15, color: colour, shade: white ? 0.25 : 0.45 }, random);
      if (smashed) {
        body.mesh.scale.set(1.25, 0.45, 1.15);
        const pulp = s.material('#f0a030', { roughness: 0.6 });
        const seeds = s.material('#f3e6c2');
        s.cylinder(radius * 1.35, radius * 1.5, 0.02, [at.x, 0.04, at.z], pulp, 18);
        for (let j = 0; j < 4; j++) {
          const shard = s.box([radius * 0.7, radius * 0.18, radius * 0.4], [at.x + (random() - 0.5) * radius * 3, 0.05, at.z + (random() - 0.5) * radius * 3], s.material(colour));
          shard.rotation.set(random() * 0.6, random() * 3, random() * 0.5);
        }
        s.scatter(new THREE.SphereGeometry(1, 6, 4), seeds, Array.from({ length: 30 }, () => ({ at: [at.x + (random() - 0.5) * radius * 3.4, 0.055, at.z + (random() - 0.5) * radius * 3] as [number, number, number], size: 0.012 })));
      } else {
        const st = stem(sub, body.topAt.clone().add(new THREE.Vector3(0, -0.01, 0)), kind === 'little' ? 0.04 : 0.08 + random() * 0.04, kind === 'little' ? 0.01 : 0.018, stemWood, random);
        void st;
      }
      if (a.story === 'gnawed' && i === 0) {
        const hole = sub.ball([radius * 0.3, radius * 0.24, radius * 0.12], [0, base.height * k * 0.55, radius * 0.95], s.material('#e88a1c', { emissive: '#3a1a00' }), 14);
        void hole;
        sub.ball([radius * 0.2, radius * 0.15, radius * 0.08], [0, base.height * k * 0.55, radius * 1.0], s.material('#3a2210'), 12);
      }
      group.add(sub.root);
      group.rotation.y = random() * Math.PI * 2;
      if (turned) {
        // Turned stem-up on its side and lifted clear of the vine: the cut end shows pale.
        group.rotation.z = 0.25;
        group.position.y += 0.02;
        const cutAt = body.topAt.clone();
        sub.cylinder(0.014, 0.014, 0.004, [cutAt.x, cutAt.y + 0.11, cutAt.z], s.material('#e8dca4'), 8);
      }
      s.root.add(group);
    }

    const spread = Math.max(0.55, ...spots.map((p, i) => Math.hypot(p.x, p.z) + sizes[i])) + 0.22;
    // A low mound of turned dirt the cluster lies in.
    const mound = s.surface((u, v, t) => {
      const ang = u * Math.PI * 2;
      const r = spread * v * (1 + 0.12 * Math.sin(ang * 3 + 1.3) + 0.06 * Math.sin(ang * 7));
      t.set(Math.cos(ang) * r * 1.1, 0.05 * (1 - v * v) + 0.004, Math.sin(ang) * r * 0.95);
    }, dirt, { segments: [40, 6], wrap: true, flip: false });
    void mound;
    if (a.straw) {
      const strawMat = s.material('#d8b45a', { roughness: 0.95 });
      const straw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.006, 0.008), strawMat, 160);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < 160; i++) {
        const ang = random() * Math.PI * 2, rr = Math.sqrt(random()) * 0.95 * spread;
        e.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3);
        m.compose(new THREE.Vector3(Math.cos(ang) * rr * 1.1, 0.045 * (1 - (rr / spread) ** 2) + 0.012, Math.sin(ang) * rr * 0.95), q.setFromEuler(e), new THREE.Vector3(0.6 + random() * 0.8, 1, 1));
        straw.setMatrixAt(i, m);
      }
      straw.castShadow = straw.receiveShadow = true;
      s.root.add(straw);
    }

    // The main vine: a tube that wanders through every pumpkin, then trails off the mound.
    const order = spots.map((p, i) => ({ p, i, ang: Math.atan2(p.z, p.x) })).sort((x, y) => x.ang - y.ang);
    const vinePts: [number, number, number][] = [];
    vinePts.push([-spread * 0.95, 0.03, spread * 0.45], [-spread * 0.6, 0.05, spread * 0.25 + (random() - 0.5) * 0.2]);
    for (const { p, i } of order) {
      const r = sizes[i];
      const toward = p.clone().normalize().multiplyScalar(-r * 0.6);
      vinePts.push([p.x + toward.x, 0.05 + random() * 0.03, p.z + toward.z]);
    }
    vinePts.push([spread * 0.6, 0.05, -spread * 0.2 + (random() - 0.5) * 0.2], [spread * 0.95, 0.03, -spread * 0.35]);
    const vineRad = a.season === 'frost' ? 0.009 : 0.013;
    s.tube(vinePts, vineRad, vineMat);
    // Each pumpkin's stalk joins the vine with a short side shoot.
    for (const { p, i } of order) {
      if (a.story === 'smashed' && i === count - 1) continue;
      const r = sizes[i];
      const toward = p.clone().normalize().multiplyScalar(-r * 0.6);
      s.tube([[p.x + toward.x, 0.05, p.z + toward.z], [p.x + toward.x * 0.4, 0.09, p.z + toward.z * 0.4], [p.x, r * 1.4, p.z]], vineRad * 0.7, vineMat);
    }
    // Curling tendrils off the vine.
    const tendrils = 4 + Math.floor(random() * 4);
    for (let t = 0; t < tendrils; t++) {
      const from = vinePts[1 + Math.floor(random() * (vinePts.length - 2))];
      const pts: [number, number, number][] = [];
      const dir = random() * Math.PI * 2, rad = 0.03 + random() * 0.02;
      for (let k = 0; k <= 16; k++) {
        const f = k / 16, sp = f * 8;
        pts.push([from[0] + Math.cos(dir) * f * 0.18 + Math.cos(sp) * rad * (1 - f * 0.5), from[1] + f * 0.12 + Math.sin(sp) * rad * 0.6, from[2] + Math.sin(dir) * f * 0.18 + Math.sin(sp) * rad * (1 - f * 0.5)]);
      }
      s.tube(pts, 0.0025, vineMat);
    }

    // Big ragged leaves on stalks along the vine.
    const leafCount = a.season === 'frost' ? 6 : a.season === 'yellowing' ? 9 : 13;
    const leaves: THREE.Object3D[] = [];
    for (let l = 0; l < leafCount; l++) {
      const idx = Math.floor(random() * (vinePts.length - 1));
      const p0 = new THREE.Vector3(...vinePts[idx]), p1 = new THREE.Vector3(...vinePts[idx + 1]);
      const base = p0.lerp(p1, random());
      const size = (a.season === 'frost' ? 0.12 : 0.17) + random() * 0.08;
      const stalkH = a.season === 'frost' ? 0.04 : 0.1 + random() * 0.14;
      // Leaves rise above the fruit and face outward from the cluster centre.
      const out = Math.atan2(base.x, base.z) + (random() - 0.5) * 1.6;
      const leafMesh = new THREE.Mesh(leafGeometry(size, random, tatter), a.season === 'yellowing' && random() < 0.5 ? s.material('#b5a246', { side: THREE.DoubleSide }) : leafMat);
      leafMesh.castShadow = leafMesh.receiveShadow = true;
      const pivot = new THREE.Group();
      pivot.position.set(base.x, base.y + stalkH, base.z);
      pivot.rotation.y = out + Math.PI;
      leafMesh.rotation.x = a.season === 'frost' ? -0.25 - random() * 0.15 : (random() - 0.3) * 0.5;
      pivot.add(leafMesh);
      s.root.add(pivot);
      s.rod([base.x, base.y, base.z], [base.x, base.y + stalkH, base.z], 0.005, vineMat);
      leaves.push(leafMesh);
    }

    const rest = leaves.map((leaf) => leaf.rotation.x);
    const sway = mix(0.01, 0.12, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        leaves.forEach((leaf, i) => { leaf.rotation.x = rest[i] + Math.sin(time * (1.1 + i * 0.13) + i) * sway; });
      },
    });
  },
});
