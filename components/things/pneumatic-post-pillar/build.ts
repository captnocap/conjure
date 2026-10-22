import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { gearGeometry, painted } from './parts';

type P = readonly [number, number, number];

const PLATES = {
  palace: 'PALACE',
  tribunal: 'TRIBUNAL',
  winding: 'WINDING HALL',
  lost: 'DEAD LETTERS',
  district: 'DISTRICT IX',
  defaced: '',
} as const;

export default defineThing({
  questions: {
    sending: choice('What is going up the tubes?', {
      love: 'Love letters: rose-pink canisters sealed with red hearts.',
      summons: 'Summonses: black canisters with red wax seals, one after another.',
      news: 'Ordinary post: cream paper canisters in a steady stream.',
      stuck: 'A stuck canister: one jammed crooked at the bend, others piling up behind it, a red flag raised and air hissing out.',
      nothing: 'Nothing. The tubes stand empty.',
    }),
    plate: choice('What does the destination plate say?', {
      palace: 'PALACE.',
      tribunal: 'TRIBUNAL.',
      winding: 'WINDING HALL.',
      lost: 'DEAD LETTERS.',
      district: 'DISTRICT IX.',
      defaced: 'It has been scratched out and cannot be read.',
    }),
    tubes: choice('How many glass tubes rise from it?', {
      one: 'A single tube.',
      three: 'Three, like organ pipes.',
      five: 'Five, a busy exchange.',
    }),
    route: choice('Where do the tubes go?', {
      overhead: 'Straight up, then bending away overhead together.',
      spiral: 'Winding round a tall mast before leaving.',
      split: 'Parting left and right at different heights like branches.',
    }),
    pillar: choice('What is the pillar like?', {
      fluted: 'A fluted column of polished brass.',
      enamel: 'A pillar box in red enamel with brass bands.',
      verdigris: 'Green-crusted bronze on lion-paw feet.',
      iron: 'Black cast iron with brass fittings.',
    }),
    horn: choice('What is its speaking horn like?', {
      trumpet: 'One flared trumpet bell at mouth height.',
      pair: 'Two horns: one to speak into, one bent to the ear.',
      capped: 'Capped off with a brass plug on a chain.',
    }),
    foot: choice('What lies at its foot?', {
      nothing: 'Nothing.',
      basket: 'A wire basket of canisters waiting to be sent.',
      spilled: 'Spilled letters across the ground.',
      step: 'A worn little step for short customers.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const brass = s.material(new THREE.Color('#c99a3e').lerp(new THREE.Color('#5f9a84'), mood.wear * 0.4), { metalness: 0.55, roughness: 0.36 });
    const shellColour = { fluted: '#c99a3e', enamel: '#b3261e', verdigris: '#5f9a84', iron: '#26282d' }[a.pillar];
    const shell = a.pillar === 'fluted' ? brass : s.material(shellColour, { metalness: a.pillar === 'enamel' ? 0.15 : 0.4, roughness: a.pillar === 'enamel' ? 0.3 : 0.6 });
    const dark = s.material('#17171a', { roughness: 0.8 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#8fc9d4', transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide });
    const SR = 0.3, capY = 1.9;

    // Pillar.
    s.lathe([[0, 0], [0.46, 0], [0.46, 0.08], [0.4, 0.14], [0.36, 0.3], [SR, 0.36], [SR, 1.62], [0.34, 1.68], [0.4, 1.74], [0.4, 1.82], [0.34, 1.86], [0.26, capY], [0, capY]], shell);
    for (const y of [0.4, 1.0, 1.6]) s.ring(SR + 0.004, 0.022, [0, y, 0], brass).rotation.x = Math.PI / 2;
    if (a.pillar === 'fluted') for (let i = 0; i < 18; i++) {
      const angle = i / 18 * Math.PI * 2;
      s.rod([Math.sin(angle) * (SR + 0.004), 0.44, Math.cos(angle) * (SR + 0.004)], [Math.sin(angle) * (SR + 0.004), 0.96, Math.cos(angle) * (SR + 0.004)], 0.018, shell);
    }
    if (a.pillar === 'verdigris') for (let i = 0; i < 3; i++) {
      const angle = i / 3 * Math.PI * 2 + Math.PI / 3;
      s.ball([0.1, 0.07, 0.14], [Math.sin(angle) * 0.44, 0.06, Math.cos(angle) * 0.44], shell, 10).rotation.y = angle;
    }
    if (a.pillar === 'iron') for (let i = 0; i < 16; i++) for (const y of [0.46, 1.54]) {
      const angle = i / 16 * Math.PI * 2;
      s.ball([0.02, 0.02, 0.02], [Math.sin(angle) * (SR + 0.005), y, Math.cos(angle) * (SR + 0.005)], brass, 6);
    }

    // Loading hatch, destination plate, gauge.
    const front = SR + 0.012;
    s.box([0.32, 0.4, 0.05], [0, 1.24, front - 0.02], brass);
    s.box([0.25, 0.32, 0.03], [0, 1.24, front + 0.002], dark);
    const hatch = s.cylinder(0.075, 0.075, 0.03, [0, 1.24, front + 0.02], brass, 20);
    hatch.rotation.x = Math.PI / 2;
    s.rod([0.1, 1.14, front + 0.01], [0.1, 1.34, front + 0.01], 0.012, brass);
    const text = PLATES[a.plate];
    const plate = painted(384, 96, (ctx, w, h) => {
      ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#1b2b5a'; ctx.lineWidth = 8; ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.fillStyle = '#1b2b5a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 50px serif';
      if (text) ctx.fillText(text, w / 2, h / 2 + 3, w - 40);
      else {
        ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 5;
        for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(30 + random() * (w - 60), 20 + random() * (h - 40)); ctx.lineTo(30 + random() * (w - 60), 20 + random() * (h - 40)); ctx.stroke(); }
      }
      ctx.fillStyle = 'rgba(90,60,30,0.3)';
      for (let i = 0; i < Math.floor(mood.wear * 16); i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * 9, 0, Math.PI * 2); ctx.fill(); }
    });
    s.box([0.5, 0.15, 0.03], [0, 1.54, front - 0.006], brass);
    s.mesh(new THREE.PlaneGeometry(0.46, 0.115), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.35 }), [0, 1.54, front + 0.011]).castShadow = false;
    const gauge = painted(128, 128, (ctx) => {
      ctx.fillStyle = '#f4efe2'; ctx.beginPath(); ctx.arc(64, 64, 62, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 4;
      for (let i = 0; i <= 8; i++) { const angle = Math.PI * (0.8 + i * 0.175); ctx.beginPath(); ctx.moveTo(64 + Math.cos(angle) * 46, 64 + Math.sin(angle) * 46); ctx.lineTo(64 + Math.cos(angle) * 58, 64 + Math.sin(angle) * 58); ctx.stroke(); }
      ctx.strokeStyle = '#b3261e'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(64, 64, 52, Math.PI * 1.95, Math.PI * 2.2); ctx.stroke();
    });
    s.cylinder(0.1, 0.1, 0.03, [0, 0.78, front], brass, 20).rotation.x = Math.PI / 2;
    s.mesh(new THREE.CircleGeometry(0.085, 20), new THREE.MeshStandardMaterial({ map: gauge, roughness: 0.4 }), [0, 0.78, front + 0.017]).castShadow = false;
    const needle = new THREE.Group();
    needle.position.set(0, 0.78, front + 0.02);
    needle.add(s.rod([0, -0.015, 0], [0, 0.07, 0], 0.005, dark, 0.001));
    const pressure = a.sending === 'stuck' ? -1.9 : a.sending === 'nothing' ? 1.7 : mix(0.9, -0.9, mood.energy);
    needle.rotation.z = pressure;
    s.root.add(needle);
    // A little pump cog on the flank.
    const cog = s.mesh(gearGeometry(0.16, 11, 0.04, 0.03, 4), brass, [-SR - 0.03, 0.72, 0]);
    cog.rotation.y = Math.PI / 2;

    // Tubes.
    const count = { one: 1, three: 3, five: 5 }[a.tubes];
    const TR = 0.07;
    const up = new THREE.Vector3(0, 1, 0);
    const travellers: { node: THREE.Object3D; curve: THREE.CatmullRomCurve3; offset: number; jam: number | null }[] = [];
    const canisterColour = { love: ['#e88aa6', '#f2b8c6', '#d86a8c'], summons: ['#1d1e22', '#26282d', '#1d1e22'], news: ['#efe6cc', '#e2d6b4', '#f4eeda'], stuck: ['#efe6cc', '#e88aa6', '#1d1e22'], nothing: ['#efe6cc'] }[a.sending];
    const sealColour = a.sending === 'news' ? '#2f66b0' : '#c2261e';
    const canister = (tint: string) => {
      const group = new THREE.Group();
      const hull = s.mesh(new THREE.LatheGeometry([[0, -0.12], [0.05, -0.12], [0.056, -0.1], [0.045, -0.085], [0.045, 0.085], [0.056, 0.1], [0.05, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y)), 12), s.material(tint, { roughness: 0.5 }));
      group.add(hull);
      const seal = a.sending === 'love'
        ? s.mesh(gearGeometry(0.03, 5, 0.012, 0, 0, 0.012), s.material(sealColour, { emissive: sealColour, emissiveIntensity: 0.3 }), [0, 0, 0.048])
        : s.ball([0.02, 0.02, 0.01], [0, 0, 0.046], s.material(sealColour, { roughness: 0.4 }), 8);
      group.add(seal);
      for (const y of [-0.105, 0.105]) { const band = s.cylinder(0.058, 0.058, 0.025, [0, y, 0], brass, 12); group.add(band); }
      s.root.add(group);
      return group;
    };
    const mastTop = 4.3;
    if (a.route === 'spiral') {
      s.rod([0, capY, 0], [0, mastTop, 0], 0.035, brass);
      s.ball([0.07, 0.07, 0.07], [0, mastTop + 0.04, 0], brass, 12);
    }
    let jamAt: THREE.Vector3 | null = null;
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : (i - (count - 1) / 2) / ((count - 1) / 2);
      const points: P[] = [];
      if (a.route === 'overhead') {
        const x = spread * 0.17, z = -Math.abs(spread) * 0.06;
        const top = 3.5 + (1 - Math.abs(spread)) * 0.5 + random() * 0.1;
        points.push([x, capY - 0.06, z], [x, capY + 0.6, z], [x, top - 0.35, z], [x + 0.08, top - 0.05, z - 0.14], [x + 0.36, top + 0.1, z - 0.42], [x + 0.95, top + 0.14, z - 0.8], [x + 1.5, top + 0.14, z - 1.1]);
      } else if (a.route === 'spiral') {
        const phase = i / count * Math.PI * 2;
        for (let k = 0; k <= 12; k++) {
          const t = k / 12, angle = phase + t * Math.PI * 2 * 1.3, r = 0.16 + Math.sin(t * Math.PI) * 0.08;
          points.push([Math.sin(angle) * r, capY - 0.06 + t * (mastTop - capY - 0.3), Math.cos(angle) * r]);
        }
        const end = points[points.length - 1], angle = phase + Math.PI * 2 * 1.3;
        points.push([end[0] + Math.sin(angle) * 0.4, end[1] + 0.2, end[2] + Math.cos(angle) * 0.4], [end[0] + Math.sin(angle) * 1.0, end[1] + 0.26, end[2] + Math.cos(angle) * 1.0]);
      } else {
        const side = i % 2 ? -1 : 1, x = spread * 0.17;
        const fork = 2.5 + i * 0.42 + random() * 0.1;
        const reach = 1.3 - i * 0.08;
        points.push([x, capY - 0.06, 0], [x, capY + 0.5, 0], [x, fork - 0.3, 0], [x + side * 0.1, fork, 0], [x + side * 0.4, fork + 0.16, -0.05], [x + side * reach, fork + 0.2, -0.12]);
      }
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.3);
      const pipe = s.mesh(new THREE.TubeGeometry(curve, 48, TR, 10, false), glass);
      pipe.castShadow = false;
      // Brass collars keep the glass in sections and give the tube a solid outline.
      const collars = 8;
      for (let k = 0; k <= collars; k++) {
        const t = k / collars;
        const p0 = curve.getPointAt(Math.max(0, t - 0.008)), p1 = curve.getPointAt(Math.min(1, t + 0.008));
        if (k === 0) p0.y -= 0.02;
        s.rod(p0.toArray() as [number, number, number], p1.toArray() as [number, number, number], TR + 0.016, brass);
      }
      s.cylinder(0.1, 0.11, 0.07, [points[0][0], capY - 0.01, points[0][2]], brass, 14);
      const end = curve.getPointAt(1), tangent = curve.getTangentAt(1);
      s.rod(end.toArray() as [number, number, number], end.clone().addScaledVector(tangent, 0.1).toArray() as [number, number, number], TR + 0.02, brass, TR + 0.05);

      if (a.sending !== 'nothing') {
        const jammed = a.sending === 'stuck' && i === Math.floor(count / 2);
        const riders = jammed ? 4 : a.sending === 'stuck' ? 1 : 2 + Math.round(mood.density * 2 + random());
        for (let k = 0; k < riders; k++) {
          const node = canister(canisterColour[(i + k) % canisterColour.length]);
          const jam = jammed ? 0.62 - k * 0.06 : a.sending === 'stuck' ? 0.2 + random() * 0.2 : null;
          travellers.push({ node, curve, offset: (k + random() * 0.6) / Math.max(riders, 1), jam });
          if (jammed && k === 0) jamAt = curve.getPointAt(0.62);
        }
      }
    }
    const placeTraveller = (traveller: (typeof travellers)[number], t: number) => {
      const at = traveller.jam ?? t;
      traveller.node.position.copy(traveller.curve.getPointAt(at));
      traveller.node.quaternion.setFromUnitVectors(up, traveller.curve.getTangentAt(at));
      if (traveller.jam === 0.62) traveller.node.rotateZ(0.5);
    };
    for (const traveller of travellers) placeTraveller(traveller, traveller.offset);
    const puffs: THREE.Mesh[] = [];
    let flag: THREE.Object3D | null = null;
    if (a.sending === 'stuck') {
      s.rod([SR, 1.5, 0], [SR + 0.1, 2.25, 0], 0.014, dark);
      flag = s.box([0.3, 0.2, 0.012], [SR + 0.26, 2.14, 0], s.material('#d3261f', { emissive: '#d3261f', emissiveIntensity: 0.4, roughness: 0.5 }));
      if (jamAt) {
        const at: THREE.Vector3 = jamAt;
        const steam = new THREE.MeshStandardMaterial({ color: '#f2f4f4', transparent: true, opacity: 0.6, roughness: 1, depthWrite: false });
        for (let k = 0; k < 6; k++) {
          const size = 0.08 + random() * 0.12;
          const puff = s.ball([size, size, size], [at.x + 0.1 + random() * 0.4, at.y + (random() - 0.3) * 0.4, at.z + 0.1 + random() * 0.3], steam, 10);
          puff.castShadow = false;
          puff.userData.size = size;
          puffs.push(puff);
        }
        const crack = s.material('#f6f8f8', { roughness: 0.3 });
        for (let k = 0; k < 5; k++) s.rod([at.x, at.y, at.z + TR], [at.x + (random() - 0.5) * 0.2, at.y + (random() - 0.5) * 0.3, at.z + TR * 0.9], 0.004, crack);
      }
    }

    // Speaking horn.
    const bell = (at: P, aim: P, size: number) => {
      const horn = s.lathe([[0.025, 0], [0.03, 0.1], [0.06, 0.2], [0.13, 0.27], [0.16, 0.29], [0.165, 0.3]], s.material(brass.color, { metalness: 0.55, roughness: 0.36, side: THREE.DoubleSide }), at);
      horn.scale.setScalar(size);
      horn.quaternion.setFromUnitVectors(up, new THREE.Vector3(...aim).normalize());
      return horn;
    };
    if (a.horn === 'capped') {
      s.cylinder(0.05, 0.05, 0.1, [SR + 0.04, 1.4, 0.1], brass, 12).rotation.z = Math.PI / 2;
      s.ball([0.06, 0.06, 0.06], [SR + 0.1, 1.4, 0.1], brass, 10);
      s.tube([[SR + 0.1, 1.36, 0.1], [SR + 0.14, 1.2, 0.12], [SR + 0.02, 1.16, 0.12]], 0.006, dark);
    } else {
      s.tube([[SR - 0.04, 1.3, 0.08], [SR + 0.16, 1.32, 0.14], [SR + 0.26, 1.46, 0.22], [SR + 0.27, 1.56, 0.28]], 0.028, brass);
      bell([SR + 0.27, 1.54, 0.27], [0.1, 0.55, 1], 1);
      if (a.horn === 'pair') {
        s.tube([[-SR + 0.04, 1.3, 0.08], [-SR - 0.18, 1.36, 0.1], [-SR - 0.3, 1.56, 0.16], [-SR - 0.3, 1.72, 0.2]], 0.022, brass);
        bell([-SR - 0.3, 1.7, 0.19], [0.5, 0.5, 0.6], 0.7);
      }
    }

    // At the foot.
    if (a.foot === 'basket') {
      const bx = 0.62, bz = 0.3;
      const wire = s.material('#6f7378', { metalness: 0.5, roughness: 0.5 });
      for (const y of [0.02, 0.2, 0.38]) s.ring(0.2 + y * 0.12, 0.008, [bx, y, bz], wire).rotation.x = Math.PI / 2;
      for (let i = 0; i < 10; i++) { const angle = i / 10 * Math.PI * 2; s.rod([bx + Math.sin(angle) * 0.2, 0.02, bz + Math.cos(angle) * 0.2], [bx + Math.sin(angle) * 0.245, 0.38, bz + Math.cos(angle) * 0.245], 0.005, wire); }
      for (let i = 0; i < 4 + Math.round(mood.density * 4); i++) {
        const node = canister(canisterColour[i % canisterColour.length]);
        node.position.set(bx + (random() - 0.5) * 0.2, 0.1 + i * 0.045, bz + (random() - 0.5) * 0.2);
        node.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.8, random() * 3, random() * 3);
      }
    } else if (a.foot === 'spilled') {
      const tint = a.sending === 'love' ? ['#f6d6de', '#f1ead6', '#e88aa6'] : ['#f1ead6', '#e6dcc0', '#f7f3e6'];
      s.scatter(new THREE.BoxGeometry(1, 0.03, 0.62), s.material('#ffffff', { roughness: 0.9 }), Array.from({ length: 16 + Math.round(mood.density * 24) }, () => {
        const angle = random() * Math.PI * 1.4 - 0.7, d = 0.5 + random() * 0.6;
        return { at: [Math.sin(angle) * d, 0.006 + random() * 0.01, Math.cos(angle) * d] as const, size: 0.14 + random() * 0.05, color: tint[Math.floor(random() * 3)] };
      }));
      const fallen = canister(canisterColour[0]);
      fallen.position.set(0.55, 0.056, 0.5);
      fallen.rotation.set(Math.PI / 2, 0, 0.7);
    } else if (a.foot === 'step') {
      s.box([0.5, 0.16, 0.3], [0, 0.08, 0.62], s.material('#6b4a2c', { roughness: 0.85 }));
      s.box([0.54, 0.02, 0.32], [0, 0.17, 0.62], brass);
    }

    const speed = a.sending === 'nothing' || a.sending === 'stuck' ? 0 : mix(0.12, 0.7, mood.energy);
    let clock = 0;
    return s.finish({
      footprint: 0.6,
      update: (dt, time) => {
        clock += dt * speed;
        if (speed) for (const traveller of travellers) placeTraveller(traveller, (traveller.offset + clock) % 1);
        cog.rotation.z += dt * (speed ? speed * 5 : 0);
        needle.rotation.z = pressure + Math.sin(time * 7) * (a.sending === 'stuck' ? 0.12 : 0.04);
        if (flag) flag.rotation.x = Math.sin(time * 5) * 0.12;
        for (const [index, puff] of puffs.entries()) puff.scale.setScalar(puff.userData.size * (1 + ((time * 0.6 + index * 0.3) % 1) * 0.8));
      },
    });
  },
});
