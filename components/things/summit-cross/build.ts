import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

function rockGeometry(seed: number, detail = 1) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const r = 1 + 0.2 * Math.sin(x * 3.1 + seed) * Math.cos(y * 2.7 + seed * 1.3) + 0.14 * Math.sin(z * 5 + seed * 2.1) + 0.08 * Math.sin(x * 9 + y * 7 + seed);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  g.computeVertexNormals();
  return g;
}

export default defineThing({
  questions: {
    make: choice('What is the cross made of?', {
      timber: 'Squared larch beams, silvered by weather, pegged and bolted.',
      lattice: 'An openwork iron lattice, riveted like a little pylon, carried up in pieces.',
      tube: 'Polished stainless steel tube, modern, catching the sun.',
      poles: 'Two rough poles lashed together with rope, improvised by whoever got here first.',
    }),
    height: score('How tall is it?', ['A modest cross barely head high', 'Twice the height of a climber', 'A towering landmark seen from the valley']),
    heart: choice('What is at the crossing of the beams?', {
      plain: 'Nothing, just the joint.',
      sunburst: 'A gilt sunburst of rays between the arms.',
      roofed: 'A little pitched roof sheltering the top of the cross.',
      wreath: 'A weathered wreath hung over the joint.',
    }),
    box: choice('What state is the summit logbook box in?', {
      closed: 'A galvanised box, lid shut and latched against the weather.',
      open: 'Lid flipped up, the book lying open with a pencil on a string.',
      red: 'A bright red enamel box with a white cross on the lid.',
      wrecked: 'Rusted through, the lid hanging by one hinge, the book long gone.',
    }),
    plate: choice('What does the plate on the cross say?', {
      altitude: 'The altitude, 3274 m.',
      thanks: 'GOTT SEI DANK.',
      memory: 'IN MEMORIAM with a year.',
      berg: 'BERG HEIL.',
      blank: 'It is worn blank.',
    }),
    story: choice('What has been left here?', {
      nothing: 'Nothing, the summit is empty.',
      flags: 'Strings of faded prayer flags tied along the guy wires.',
      memorial: 'A memorial: a framed photograph, a candle lantern and flowers wedged in the rocks.',
      gear: 'A rucksack and an ice axe leaning on the cross, someone is here right now.',
      cairn: 'A tall cairn of balanced stones built by a hundred visitors.',
      toast: 'A bottle and little glasses on a flat stone, a summit toast.',
    }),
    snow: score('How much snow lies on the summit?', ['Bare dry rock', 'Old snow in the cracks', 'Deep snow and rime crusting the cross']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const stone = s.material(new THREE.Color('#8f8d88').offsetHSL(0, 0, (random() - 0.5) * 0.08), { roughness: 0.95, flatShading: true });
    const stoneDark = s.material('#6b6b70', { roughness: 0.95, flatShading: true });
    const lichen = s.material('#9a9a74', { roughness: 1, flatShading: true });
    const snow = s.material('#f4f7fb', { roughness: 0.6 });
    const rust = mood.wear;
    const wire = s.material('#5d6266', { metalness: 0.7, roughness: 0.4 });
    const rocks = [0, 1, 2, 3].map((i) => rockGeometry(random() * 30 + i * 5, i === 0 ? 2 : 1));

    // The summit knob.
    const top = 1.25;
    const knob = s.mesh(rocks[0], stone, [0, 0.35, 0]);
    knob.scale.set(1.55, 0.95, 1.3); knob.rotation.y = random() * 6;
    const anchors: P3[] = [];
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI / 4 + i * Math.PI / 2 + (random() - 0.5) * 0.3;
      const r = 1.75 + random() * 0.25, h = 0.3 + random() * 0.25;
      const m = s.mesh(rocks[1 + (i % 3)], i % 2 ? stoneDark : stone, [Math.cos(ang) * r, h * 0.35, Math.sin(ang) * r]);
      m.scale.set(0.55 + random() * 0.25, h, 0.5 + random() * 0.25); m.rotation.y = random() * 6;
      anchors.push([Math.cos(ang) * r, h * 1.1, Math.sin(ang) * r]);
    }
    for (let i = 0; i < 5 + Math.round(mood.density * 6); i++) {
      const ang = random() * 6.3, r = 1.2 + random() * 0.9, h = 0.15 + random() * 0.3;
      const m = s.mesh(rocks[1 + (i % 3)], [stone, stoneDark, lichen][i % 3], [Math.cos(ang) * r, h * 0.3, Math.sin(ang) * r]);
      m.scale.set(0.3 + random() * 0.3, h, 0.3 + random() * 0.3); m.rotation.y = random() * 6;
    }

    // The cross.
    const H = mix(2.1, 4.6, a.height);
    const armY = top + H * 0.7, armW = H * 0.5, crossTop = top + H;
    const cross = new THREE.Group();
    cross.position.y = 0;
    s.root.add(cross);
    const C = <T extends THREE.Object3D>(m: T) => { cross.add(m); return m; };
    let stemR = 0.1;
    if (a.make === 'timber') {
      const wood = s.material(new THREE.Color('#8b7a66').lerp(new THREE.Color('#5b4634'), 0.35 - rust * 0.3), { roughness: 0.9 });
      const t = 0.17 + H * 0.02; stemR = t / 2;
      C(s.box([t, H + 0.5, t], [0, top - 0.5 + (H + 0.5) / 2, 0], wood));
      C(s.box([armW, t, t * 0.9], [0, armY, 0.02], wood));
      for (const x of [-1, 1]) C(s.rod([x * armW * 0.3, armY - t / 2, 0], [0, armY - armW * 0.3, 0], 0.035, wood));
      const cap = s.material('#5e7f72', { metalness: 0.4, roughness: 0.6 });
      C(s.box([t + 0.04, 0.03, t + 0.04], [0, crossTop + 0.015, 0], cap));
      for (const x of [-1, 1]) C(s.box([0.03, t + 0.04, t + 0.03], [x * armW / 2, armY, 0.02], cap));
    } else if (a.make === 'lattice') {
      const iron = s.material(new THREE.Color('#3f4347').lerp(new THREE.Color('#8a4a2a'), rust * 0.7), { metalness: 0.5, roughness: 0.6 });
      const w = 0.16 + H * 0.02; stemR = w;
      const truss = (from: THREE.Vector3, to: THREE.Vector3, side: THREE.Vector3, depth: THREE.Vector3) => {
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
          const o = side.clone().multiplyScalar(sx * w).addScaledVector(depth, sz * w * 0.6);
          C(s.rod(from.clone().add(o).toArray() as P3, to.clone().add(o).toArray() as P3, 0.022, iron));
        }
        const n = Math.max(3, Math.round(from.distanceTo(to) / (w * 2.2)));
        for (let i = 0; i < n; i++) for (const sz of [-1, 1]) {
          const p0 = from.clone().lerp(to, i / n).addScaledVector(side, (i % 2 ? 1 : -1) * w).addScaledVector(depth, sz * w * 0.6);
          const p1 = from.clone().lerp(to, (i + 1) / n).addScaledVector(side, (i % 2 ? -1 : 1) * w).addScaledVector(depth, sz * w * 0.6);
          C(s.rod(p0.toArray() as P3, p1.toArray() as P3, 0.014, iron));
        }
      };
      const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
      truss(new THREE.Vector3(0, top - 0.3, 0), new THREE.Vector3(0, crossTop, 0), X, Z);
      truss(new THREE.Vector3(-armW / 2, armY, 0), new THREE.Vector3(armW / 2, armY, 0), Y, Z);
      C(s.box([w * 2.6, 0.05, w * 1.8], [0, top + 0.02, 0], iron));
    } else if (a.make === 'tube') {
      const steel = s.material('#d5dade', { metalness: 0.95, roughness: 0.16 + rust * 0.3 });
      const r = 0.06 + H * 0.008; stemR = r;
      C(s.cylinder(r, r, H + 0.4, [0, top - 0.4 + (H + 0.4) / 2, 0], steel, 16));
      C(s.cylinder(r, r, armW, [0, armY, 0], steel, 16)).rotation.z = Math.PI / 2;
      for (const p of [[0, crossTop, 0], [armW / 2, armY, 0], [-armW / 2, armY, 0]] as P3[]) C(s.ball([r * 1.5, r * 1.5, r * 1.5], p, steel, 12));
      C(s.cylinder(r * 2.4, r * 2.8, 0.06, [0, top + 0.03, 0], steel, 16));
    } else {
      const pole = s.material('#9a8468', { roughness: 0.95 });
      stemR = 0.09;
      C(s.tube([[0.04, top - 0.4, 0], [-0.03, top + H * 0.4, 0.02], [0.03, top + H * 0.8, 0], [0, crossTop, 0.01]], 0.09, pole));
      C(s.tube([[-armW / 2, armY - 0.06, 0.07], [0, armY + 0.02, 0.08], [armW / 2, armY + 0.05, 0.1]], 0.07, pole));
      const rope = s.material('#d9c9a0', { roughness: 1 });
      for (const r of [0, 1]) C(s.ring(0.14, 0.03, [0, armY, 0.05], rope)).rotation.set(Math.PI / 2 + (r ? 0.7 : -0.7), 0, r ? 0.5 : -0.5);
    }
    // Lean with age, pivoting at the rock.
    cross.position.y = top; cross.children.forEach((c) => { c.position.y -= top; });
    cross.rotation.z = (random() - 0.5) * 0.02 + rust * rust * 0.09 * (random() < 0.5 ? -1 : 1);
    cross.updateMatrixWorld(true);
    const onCross = (x: number, y: number, z: number) => cross.localToWorld(new THREE.Vector3(x, y - top, z));

    if (a.heart === 'sunburst') {
      const gilt = s.material('#e3b93a', { metalness: 0.85, roughness: 0.25, emissive: '#6b4d08', emissiveIntensity: mix(0.1, 0.6, mood.cheer) });
      for (let i = 0; i < 16; i++) {
        const ang = Math.PI / 4 + (Math.floor(i / 4) * Math.PI) / 2 + ((i % 4) - 1.5) * 0.2;
        const len = armW * (0.2 + ((i % 4) === 1 || (i % 4) === 2 ? 0.1 : 0));
        C(s.rod([Math.cos(ang) * 0.12, armY - top + Math.sin(ang) * 0.12, 0.03], [Math.cos(ang) * len, armY - top + Math.sin(ang) * len, 0.03], 0.016, gilt, 0.004));
      }
    } else if (a.heart === 'roofed') {
      const roof = s.material('#5a4636', { roughness: 0.9 });
      for (const x of [-1, 1]) C(s.box([armW * 0.42, 0.04, 0.34], [x * armW * 0.16, crossTop - top + 0.02, 0], roof)).rotation.z = -x * 0.7;
    } else if (a.heart === 'wreath') {
      const dry = s.material(mood.cheer > 0.5 ? '#5d7f3a' : '#7b6b45', { roughness: 1 });
      C(s.ring(0.3, 0.06, [0, armY - top, stemR + 0.05], dry));
      const pts: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 14; i++) { const ang = random() * 6.3; pts.push({ at: [Math.cos(ang) * 0.3, armY - top + Math.sin(ang) * 0.3, stemR + 0.1], size: 0.035 + random() * 0.02, color: mood.cheer > 0.5 ? ['#e8312f', '#f4d13a', '#ffffff'][i % 3] : ['#a08a6a', '#8c5b4a', '#c9bfa0'][i % 3] }); }
      C(s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), pts));
    }

    // Plate.
    if (a.plate !== 'blank') {
      const text = { altitude: '3274 m', thanks: 'GOTT SEI DANK', memory: `IN MEMORIAM ${1921 + Math.floor(random() * 90)}`, berg: 'BERG HEIL' }[a.plate];
      const wide = a.make === 'timber' || a.make === 'lattice';
      const plate = C(s.label(text, wide ? 0.62 : 0.5, 0.2, [0, armY - top - (wide ? 0 : 0.45), stemR + 0.07], '#f3ead0', a.plate === 'memory' ? '#22201e' : '#7a1f1c'));
      plate.rotation.z = (random() - 0.5) * 0.04;
    } else C(s.box([0.4, 0.16, 0.012], [0, armY - top - 0.45, stemR + 0.03], s.material('#9b9a92', { metalness: 0.4 })));

    // Guy wires with turnbuckles.
    const tie = onCross(0, top + H * 0.62, 0);
    const wires: [THREE.Vector3, THREE.Vector3][] = [];
    for (const anchor of anchors) {
      const end = new THREE.Vector3(...anchor);
      s.rod(tie.toArray() as P3, anchor, 0.016, wire);
      const mid = tie.clone().lerp(end, 0.88);
      const buckle = s.rod(tie.clone().lerp(end, 0.84).toArray() as P3, tie.clone().lerp(end, 0.92).toArray() as P3, 0.035, wire);
      buckle.castShadow = true; void mid;
      s.ring(0.06, 0.018, anchor, wire).rotation.x = Math.PI / 2;
      wires.push([tie, end]);
    }
    s.ring(stemR + 0.03, 0.02, tie.toArray() as P3, wire).rotation.x = Math.PI / 2;

    // Logbook box, bolted to the foot.
    const boxAt = onCross(0, top + 0.72, stemR + 0.12);
    const rusty = s.material('#8a4f2c', { metalness: 0.3, roughness: 0.9 });
    const tin = a.box === 'red' ? s.material('#c8202a', { metalness: 0.3, roughness: 0.4 }) : a.box === 'wrecked' ? rusty : s.material('#a7adb0', { metalness: 0.7, roughness: 0.4 });
    s.box([0.4, 0.3, 0.2], [boxAt.x, boxAt.y, boxAt.z], tin);
    s.box([0.08, 0.34, 0.04], [boxAt.x, boxAt.y, boxAt.z - 0.12], wire);
    const lid = new THREE.Group();
    lid.position.set(boxAt.x, boxAt.y + 0.15, boxAt.z - 0.1);
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.03, 0.26), tin);
    lidMesh.position.set(0, 0.015, 0.12); lidMesh.castShadow = true;
    lid.add(lidMesh);
    if (a.box === 'red') { const mark = s.label('+', 0.16, 0.16, [0, 0.032, 0.12], '#ffffff', '#c8202a'); mark.rotation.x = -Math.PI / 2; lid.add(mark); }
    lid.rotation.x = a.box === 'open' ? -1.9 : a.box === 'wrecked' ? -2.4 : 0.12;
    if (a.box === 'wrecked') lid.rotation.z = 0.5;
    s.root.add(lid);
    if (a.box === 'open') {
      const page = s.material('#f3ecd6', { roughness: 0.9 });
      const book = s.box([0.34, 0.03, 0.26], [boxAt.x, boxAt.y + 0.17, boxAt.z + 0.08], page); book.rotation.x = 0.25;
      s.box([0.012, 0.034, 0.26], [boxAt.x, boxAt.y + 0.172, boxAt.z + 0.08], s.material('#3a2a20')).rotation.x = 0.25;
      s.rod([boxAt.x + 0.2, boxAt.y + 0.12, boxAt.z + 0.1], [boxAt.x + 0.26, boxAt.y - 0.2, boxAt.z + 0.12], 0.004, s.material('#d9c9a0'));
      s.rod([boxAt.x + 0.26, boxAt.y - 0.2, boxAt.z + 0.12], [boxAt.x + 0.27, boxAt.y - 0.32, boxAt.z + 0.12], 0.01, s.material('#e3b93a'));
    } else if (a.box !== 'wrecked') s.box([0.06, 0.07, 0.02], [boxAt.x, boxAt.y + 0.1, boxAt.z + 0.105], wire);

    // What was left behind.
    const flutter: THREE.Object3D[] = [];
    if (a.story === 'flags') {
      const colours = mood.cheer > 0.3 ? ['#2f6fd0', '#f1f1ea', '#d3312c', '#3f9a4a', '#f0c330'] : ['#7f8ea3', '#d8d5ca', '#a8756c', '#8a9a80', '#c9b98a'];
      const strings = 1 + Math.round(mood.density * 2);
      for (let w = 0; w < strings; w++) {
        const [from, to] = wires[(w * 3 + 1) % 4];
        for (let i = 0; i < 12; i++) {
          const p = from.clone().lerp(to, 0.08 + i * 0.065);
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), new THREE.MeshStandardMaterial({ color: colours[i % 5], side: THREE.DoubleSide, roughness: 0.9 }));
          flag.geometry.translate(0, -0.13, 0);
          flag.position.copy(p); flag.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) + Math.PI / 2; flag.rotation.x = (random() - 0.5) * 0.5;
          flag.castShadow = true;
          s.root.add(flag); flutter.push(flag);
        }
      }
    } else if (a.story === 'memorial') {
      const fx = 0.55, fz = 0.95;
      s.box([0.3, 0.38, 0.03], [fx, top - 0.22, fz], s.material('#2a2623')).rotation.x = -0.3;
      s.box([0.22, 0.3, 0.032], [fx, top - 0.22, fz + 0.003], s.material('#cfc8b8')).rotation.x = -0.3;
      s.ball([0.05, 0.06, 0.02], [fx, top - 0.19, fz + 0.012], s.material('#6d5a4c'), 8).rotation.x = -0.3;
      s.box([0.12, 0.2, 0.12], [fx - 0.4, top - 0.3, fz], s.material('#8b1f1c', { emissive: '#ff7a1a', emissiveIntensity: mix(0.2, 1, mood.cheer) }));
      s.cylinder(0.0, 0.08, 0.06, [fx - 0.4, top - 0.17, fz], wire, 4);
      const pts: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 16; i++) pts.push({ at: [fx + 0.3 + random() * 0.3, top - 0.4 + random() * 0.2, fz - 0.05 + random() * 0.2], size: 0.03 + random() * 0.025, color: rust > 0.5 ? ['#9c8a66', '#7b6247'][i % 2] : ['#f2f2ee', '#e8312f', '#f4d13a', '#4b8a3a'][i % 4] });
      s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), pts);
    } else if (a.story === 'gear') {
      const pack = s.material(mood.cheer > 0.4 ? '#e2632a' : '#4b5a52', { roughness: 0.8 });
      s.ball([0.2, 0.3, 0.16], [-0.42, top + 0.18, 0.3], pack, 12);
      s.ball([0.17, 0.1, 0.14], [-0.42, top + 0.46, 0.3], pack, 10);
      s.box([0.2, 0.14, 0.06], [-0.42, top + 0.12, 0.45], s.material('#2a2c30'));
      s.rod([0.45, top - 0.2, 0.5], [0.16, top + 0.72, 0.12], 0.016, s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 }));
      s.box([0.3, 0.035, 0.03], [0.16, top + 0.73, 0.12], s.material('#3a3d42', { metalness: 0.7 })).rotation.z = 0.3;
      s.ball([0.14, 0.09, 0.14], [0.55, top - 0.28, 0.75], s.material('#d92c2c', { roughness: 0.4 }), 12);
    } else if (a.story === 'cairn') {
      let y = 0.25;
      for (let i = 0; i < 8; i++) {
        const r = 0.36 - i * 0.035, h = 0.11 + random() * 0.05;
        const m = s.mesh(rocks[1 + (i % 3)], [stone, stoneDark, lichen][i % 3], [-1.25 + (random() - 0.5) * 0.06, y + h * 0.5, 0.95 + (random() - 0.5) * 0.06]);
        m.scale.set(r, h, r * 0.9); m.rotation.y = random() * 6; y += h * 1.25;
      }
    } else if (a.story === 'toast') {
      const slab = s.mesh(rocks[2], stoneDark, [0.75, top - 0.52, 0.85]); slab.scale.set(0.4, 0.1, 0.32);
      const glass = s.material('#4c7a3c', { roughness: 0.2, metalness: 0.2 });
      s.lathe([[0.001, 0], [0.045, 0], [0.045, 0.16], [0.016, 0.22], [0.016, 0.29], [0.001, 0.29]], glass, [0.7, top - 0.44, 0.85]);
      for (let i = 0; i < 3; i++) s.cylinder(0.022, 0.016, 0.05, [0.85 + i * 0.07, top - 0.415, 0.8 + (i % 2) * 0.09], s.material('#e9eef0', { roughness: 0.1, metalness: 0.5 }), 8);
    }

    // Snow.
    if (a.snow > 0.3) {
      const n = Math.round(mix(0, 16, (a.snow - 0.3) / 0.7));
      for (let i = 0; i < n; i++) {
        const ang = random() * 6.3, r = 0.4 + random() * 1.5;
        const y = r < 1 ? top - 0.2 - r * 0.45 : 0.12;
        s.ball([0.3 + random() * 0.35, 0.1 + a.snow * 0.1, 0.25 + random() * 0.3], [Math.cos(ang) * r, y, Math.sin(ang) * r], snow, 10);
      }
      if (a.snow > 0.7) {
        const capL = onCross(0, armY + stemR + 0.03, 0);
        const rime = s.box([armW * 0.98, 0.07, 0.24], capL.toArray() as P3, snow); rime.rotation.z = cross.rotation.z;
        const t = onCross(0, crossTop + 0.04, 0);
        s.ball([0.16, 0.08, 0.16], t.toArray() as P3, snow, 10);
        for (let i = 0; i < 7; i++) { const p = onCross(-armW / 2 + (i + 0.5) * armW / 7, armY - stemR - 0.02, 0); s.cylinder(0.03, 0.002, 0.12 + random() * 0.2, [p.x, p.y - 0.1, p.z], snow, 5); }
      }
    }

    const energy = mix(0.1, 1.4, mood.energy);
    const base = flutter.map((f) => f.rotation.x);
    return s.finish({
      footprint: 1.9,
      update: (_dt, time) => { flutter.forEach((flag, i) => { flag.rotation.x = base[i] + Math.sin(time * 5 * energy + i * 0.8) * 0.5 * energy; }); },
    });
  },
});
