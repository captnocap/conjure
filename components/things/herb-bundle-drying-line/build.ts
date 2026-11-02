import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Kind = 'lavender' | 'sage' | 'rosemary' | 'poppy' | 'garlic' | 'chillies';
const KINDS: Kind[] = ['lavender', 'sage', 'rosemary', 'poppy', 'garlic', 'chillies'];
const UP = new THREE.Vector3(0, 1, 0);

export default defineThing({
  questions: {
    herbs: choice('What is hung up to dry?', {
      lavender: 'Bunches of lavender, purple spikes hanging down.',
      sage: 'Bundles of soft grey-green sage leaves, the smudging herb.',
      rosemary: 'Dark needled sprigs of rosemary, for remembrance.',
      poppy: 'Poppy stems with round grey seed heads like little rattles.',
      garlic: 'Long plaited braids of white garlic bulbs.',
      chillies: 'Strings of glossy red chillies, a ristra.',
      mixed: 'A mixed line of everything: lavender, sage, rosemary, poppies, garlic and chillies.',
    }),
    count: score('How many bundles hang on the line?', ['Three lonely bundles', 'Half a dozen', 'Nine or ten', 'A crowded line of a dozen or more']),
    fruit: choice('Is anything else drying among the herbs?', {
      none: 'Only the herbs.',
      apples: 'Threads of pale dried apple rings.',
      oranges: 'Threads of thin orange slices, glowing like stained glass.',
      both: 'Both apple rings and orange slices strung between the bundles.',
    }),
    age: score('How long have they been drying?', ['Picked this morning, still green and soft', 'A few days, starting to fade', 'Weeks, papery and dull', 'Brittle and crumbling, shedding on the floor']),
    frame: choice('What holds the line up?', {
      posts: 'Two rough poles driven into the ground, like a garden or yard line.',
      beam: 'A short timber beam on two uprights, the cord tied between iron pegs hammered into it.',
      rack: 'Two A-frame trestles like a folding clothes horse, a kitchen rack.',
    }),
    cord: choice('What is the line itself?', {
      twine: 'Plain hairy garden twine.',
      red: 'Red wool thread, tied for protection.',
      leather: 'A dark leather thong.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const n = Math.round(mix(3, 13, a.count));
    const W = mix(0.9, 2.3, a.count);
    const H = 1.45;
    const sag = mix(0.04, 0.14, a.count);
    const lineY = (x: number) => H - sag * (1 - Math.pow((2 * x) / W, 2));
    const dryTo = new THREE.Color('#8a6e44');
    const dried = (hex: string, extra = 0) => new THREE.Color(hex).lerp(dryTo, Math.min(1, a.age * 0.65 + extra));
    const wood = s.material('#6b4c30', { roughness: 0.9 });
    const cordHex = { twine: '#b49a6a', red: '#b01e22', leather: '#3a2618' }[a.cord];
    const cordMat = s.material(cordHex, { roughness: 0.9 });
    const stemMat = s.material(dried('#5a7a3a', 0.1), { roughness: 0.9 });

    // The frame.
    if (a.frame === 'posts') {
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.03);
        s.rod([x, -0.1, 0], [x + side * 0.02, H + 0.15, 0], 0.035, wood, 0.03);
        s.ball([0.06, 0.02, 0.06], [x, 0, 0], s.material('#5a4a3a'), 10);
      }
    } else if (a.frame === 'beam') {
      s.box([W + 0.3, 0.12, 0.12], [0, H + 0.12, 0], wood);
      for (const side of [-1, 1]) {
        s.box([0.1, H + 0.06, 0.1], [side * (W / 2 + 0.1), (H + 0.06) / 2, 0], wood);
        s.box([0.3, 0.06, 0.4], [side * (W / 2 + 0.1), 0.03, 0], wood);
        s.rod([side * (W / 2 + 0.1), H - 0.25, 0], [side * (W / 2 - 0.12), H + 0.06, 0], 0.025, wood);
        s.cylinder(0.012, 0.012, 0.1, [side * W / 2, H + 0.02, 0.05], s.material('#222', { metalness: 0.5 }), 8).rotation.x = Math.PI / 2;
      }
    } else {
      for (const side of [-1, 1]) {
        const x = side * (W / 2 + 0.04);
        s.rod([x, 0, -0.32], [x, H + 0.08, 0], 0.025, wood);
        s.rod([x, 0, 0.32], [x, H + 0.08, 0], 0.025, wood);
        s.rod([x, 0.5, -0.22], [x, 0.5, 0.22], 0.018, wood);
      }
      s.rod([-W / 2 - 0.04, 0.5, 0], [W / 2 + 0.04, 0.5, 0], 0.016, wood);
    }

    // The sagging cord.
    const linePts: [number, number, number][] = [];
    for (let i = 0; i <= 12; i++) { const x = -W / 2 + (i / 12) * W; linePts.push([x, lineY(x), 0]); }
    s.tube(linePts, 0.006, cordMat);

    // Bundles hang from the line and sway on their ties.
    const swingers: { g: THREE.Group; phase: number; amp: number }[] = [];
    const inst = (g: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, mats: THREE.Matrix4[], colours?: THREE.Color[]) => {
      if (!mats.length) return;
      const m = new THREE.InstancedMesh(geo, mat, mats.length);
      mats.forEach((mm, i) => m.setMatrixAt(i, mm));
      if (colours) colours.forEach((c, i) => m.setColorAt(i, c));
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    };
    const between = (from: THREE.Vector3, to: THREE.Vector3, thick = 1) => {
      const d = to.clone().sub(from);
      return new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize()), new THREE.Vector3(thick, d.length(), thick));
    };
    const stemGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 4);

    const bundle = (kind: Kind, g: THREE.Group) => {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 12), cordMat);
      tie.rotation.x = Math.PI / 2; tie.position.y = -0.05; g.add(tie);
      const dangle = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 4), cordMat);
      dangle.position.y = -0.025; g.add(dangle);
      if (kind === 'garlic' || kind === 'chillies') {
        const len = mix(0.38, 0.55, random());
        const braid = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.009, len, 6), s.material(dried('#c8b07a', 0.2)));
        braid.position.y = -0.05 - len / 2; g.add(braid);
        const mats: THREE.Matrix4[] = [];
        const count = kind === 'garlic' ? Math.round(len / 0.05) : Math.round(len / 0.012);
        for (let i = 0; i < count; i++) {
          const y = -0.07 - (i / count) * len;
          const t = i * 2.4 + random() * 0.5;
          const out = new THREE.Vector3(Math.cos(t), kind === 'garlic' ? -0.4 : -0.9, Math.sin(t)).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(UP, out.clone().negate());
          const r = kind === 'garlic' ? 0.035 : 0.012;
          const at = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r);
          const scale = kind === 'garlic' ? new THREE.Vector3(1, 1, 1).multiplyScalar(mix(0.85, 1.15, random())) : new THREE.Vector3(1, mix(0.8, 1.3, random()), 1);
          mats.push(new THREE.Matrix4().compose(at, q, scale));
        }
        if (kind === 'garlic') {
          const bulb = new THREE.LatheGeometry([[0.001, -0.035], [0.022, -0.03], [0.034, -0.012], [0.03, 0.008], [0.012, 0.025], [0.004, 0.04], [0.001, 0.042]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
          inst(g, bulb, s.material(dried('#efe6d4', -0.4), { roughness: 0.6 }), mats);
        } else {
          const pod = new THREE.ConeGeometry(0.011, 0.075, 7).translate(0, -0.0375, 0).rotateX(Math.PI);
          inst(g, pod, s.material(dried('#c0141a', -0.25), { roughness: 0.3 }), mats);
        }
        return;
      }
      const stems = { lavender: 22, sage: 11, rosemary: 12, poppy: 9 }[kind];
      const len = mix(0.22, 0.32, random());
      const stemMats: THREE.Matrix4[] = [];
      const ends: THREE.Vector3[] = [];
      for (let i = 0; i < stems; i++) {
        const t = random() * Math.PI * 2, r = mix(0.02, 0.07, random()) * mix(0.8, 1.25, a.age);
        const end = new THREE.Vector3(Math.cos(t) * r, -0.05 - len * mix(0.85, 1, random()), Math.sin(t) * r);
        stemMats.push(between(new THREE.Vector3(0, -0.05, 0), end));
        ends.push(end);
      }
      inst(g, stemGeo, stemMat, stemMats);
      if (kind === 'lavender') {
        const spike = new THREE.CapsuleGeometry(0.008, 0.06, 3, 6);
        inst(g, spike, s.material(dried('#8a5ac8', -0.25), { roughness: 0.8 }), ends.map((e) => between(e.clone().add(new THREE.Vector3(0, 0.02, 0)), e.clone().add(e.clone().setY(0).multiplyScalar(0.3)).add(new THREE.Vector3(0, -0.05, 0)), 1)));
      } else if (kind === 'poppy') {
        const head = new THREE.SphereGeometry(0.024, 10, 8);
        head.scale(1, 1.15, 1);
        const crown = new THREE.CylinderGeometry(0.016, 0.01, 0.008, 8).translate(0, -0.03, 0);
        const m = ends.map((e) => new THREE.Matrix4().makeTranslation(e.x, e.y - 0.02, e.z));
        inst(g, head, s.material(dried('#98a487', 0.05), { roughness: 0.7 }), m);
        inst(g, crown, s.material(dried('#6a6a50', 0.1)), m);
      } else {
        const leaves: THREE.Matrix4[] = [];
        const leafCount = kind === 'sage' ? 60 : 150;
        for (let i = 0; i < leafCount; i++) {
          const e = ends[i % ends.length];
          const f = mix(0.3, 1, random());
          const at = e.clone().multiplyScalar(f).add(new THREE.Vector3(0, -0.05 * (1 - f), 0));
          const dir = new THREE.Vector3(random() - 0.5, -0.6 - random(), random() - 0.5).normalize();
          const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
          leaves.push(new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1).multiplyScalar(mix(0.8, 1.2, random()))));
        }
        const leaf = kind === 'sage'
          ? new THREE.SphereGeometry(1, 6, 4).scale(0.014, 0.034, 0.006).translate(0, 0.025, 0)
          : new THREE.BoxGeometry(0.003, 0.03, 0.003).translate(0, 0.015, 0);
        inst(g, leaf, s.material(dried(kind === 'sage' ? '#8fa182' : '#2f5236', kind === 'sage' ? -0.1 : 0), { roughness: 0.85 }), leaves);
      }
    };

    const strand = (kind: 'apples' | 'oranges', g: THREE.Group) => {
      const len = mix(0.25, 0.4, random());
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, len, 4), cordMat);
      thread.position.y = -len / 2; g.add(thread);
      const k = Math.round(len / 0.07);
      for (let i = 0; i < k; i++) {
        const y = -0.05 - i * 0.07;
        if (kind === 'apples') {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.014, 6, 14), s.material(dried('#efdca8', -0.5), { roughness: 0.7 }));
          ring.position.y = y; ring.scale.z = 0.35; ring.rotation.y = random() * 0.8; ring.castShadow = true; g.add(ring);
        } else {
          const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 14), orangeMats);
          slice.position.y = y; slice.rotation.set(Math.PI / 2, 0, random() * 0.5); slice.rotation.y = (random() - 0.5) * 0.8; slice.castShadow = true; g.add(slice);
        }
      }
    };
    // An orange slice: rind, pith and segments painted on its faces.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#e8701a'; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6d9a0'; ctx.beginPath(); ctx.arc(32, 32, 27, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#f39a2a' : '#ee8a1e';
      ctx.beginPath(); ctx.moveTo(32, 32); ctx.arc(32, 32, 25, i * Math.PI / 5 + 0.05, (i + 1) * Math.PI / 5 - 0.05); ctx.closePath(); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const orangeFace = new THREE.MeshStandardMaterial({ map: tex, emissive: '#c85a10', emissiveIntensity: mix(0.05, 0.35, mood.cheer), roughness: 0.5 });
    const orangeMats: THREE.Material[] = [s.material('#d8681a'), orangeFace, orangeFace];

    const items: ('bundle' | 'apples' | 'oranges')[] = [];
    for (let i = 0; i < n; i++) items.push('bundle');
    const fruitKinds: ('apples' | 'oranges')[] = a.fruit === 'both' ? ['apples', 'oranges'] : a.fruit === 'none' ? [] : [a.fruit];
    if (fruitKinds.length) {
      const extra = Math.max(2, Math.round(n / 3));
      for (let i = 0; i < extra; i++) items.splice(1 + Math.floor((i + 0.5) * (n - 1) / extra) + i, 0, fruitKinds[i % fruitKinds.length]);
    }
    items.forEach((item, i) => {
      const x = -W / 2 + ((i + 0.5) / items.length) * W + (random() - 0.5) * 0.03;
      const g = new THREE.Group();
      g.position.set(x, lineY(x), 0);
      if (item === 'bundle') bundle(a.herbs === 'mixed' ? KINDS[Math.floor(random() * KINDS.length)] : a.herbs, g);
      else strand(item, g);
      g.rotation.y = random() * Math.PI;
      g.scale.setScalar(mix(1.55, 1.25, a.count));
      s.root.add(g);
      swingers.push({ g, phase: random() * 6, amp: mix(0.01, 0.12, mood.energy) * mix(0.7, 1.3, random()) });
    });

    // Brittle herbs shed on the floor beneath.
    if (a.age > 0.55) {
      const bits = Math.round(mix(10, 70, (a.age - 0.55) / 0.45));
      const pts = Array.from({ length: bits }, () => ({ at: [(random() - 0.5) * W, 0.004, (random() - 0.5) * 0.4] as [number, number, number], size: mix(0.006, 0.014, random()), color: random() < 0.5 ? '#8a6e44' : a.herbs === 'lavender' ? '#7a6a8a' : '#6a7050' }));
      s.scatter(new THREE.BoxGeometry(1.4, 0.3, 0.8), s.material('#ffffff'), pts);
    }

    return s.finish({
      update: (_dt, time) => {
        for (const sw of swingers) {
          sw.g.rotation.z = Math.sin(time * mix(0.6, 2.2, mood.energy) + sw.phase) * sw.amp;
          sw.g.rotation.x = Math.cos(time * mix(0.5, 1.8, mood.energy) + sw.phase * 1.3) * sw.amp * 0.6;
        }
      },
    });
  },
});
