import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    arrangement: choice('How has the set been left?', {
      'in-use': 'Mid-wash: the stool pulled out, the bucket full beside it, the towel over the seat, suds on the floor.',
      tidy: 'Put away properly: the bucket turned upside down on the stool with the towel folded on top.',
      tipped: 'Knocked over: the stool on its side, the bucket rolled away and its water spilled across the floor.',
      waiting: 'Set out fresh and dry, stool and bucket side by side, untouched.',
    }),
    sets: choice('How many sets are there?', {
      one: 'A single set.',
      pair: 'Two sets side by side, for two people washing together.',
      row: 'A row of three along a wall, one of them in a different state from the others.',
      stack: 'One set out, and behind it the bathhouse supply: stools stacked in a column and buckets in a pyramid.',
    }),
    material: choice('What are they made of?', {
      hinoki: 'Fresh pale cypress with copper hoops.',
      aged: 'Old wood gone dark honey-brown with black iron hoops.',
      plastic: 'Bright yellow moulded plastic with a red band, the cheap public-bath classic.',
    }),
    towel: choice('What is the towel like?', {
      white: 'A thin plain white washcloth.',
      stripes: 'White with indigo stripes at each end.',
      dots: 'Indigo with small white dots, a traditional hand towel.',
      checks: 'Red and white checks.',
      none: 'There is no towel.',
    }),
    wash: choice('What is there to wash with?', {
      soap: 'A bar of soap on a slatted wooden dish.',
      brush: 'A long-handled wooden back brush.',
      bottles: 'Three pump bottles: shampoo, conditioner, body soap.',
      nothing: 'Nothing: just the stool and bucket.',
    }),
    contents: choice('If the bucket stands upright, what is in it?', {
      water: 'Hot water, steaming.',
      suds: 'A heap of soap foam.',
      empty: 'Nothing: it is dry.',
      duck: 'Water and one yellow rubber duck.',
    }),
    footprints: noul('Do wet footprints lead away from it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const plastic = a.material === 'plastic';

    const tone = { hinoki: '#e8cf9c', aged: '#b3824a', plastic: '#f3c81e' }[a.material];
    const grain = (() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      if (!plastic) for (let i = 0; i < 16; i++) {
        const x = i * 16;
        ctx.fillStyle = `rgba(120,80,30,${r(0, 0.14)})`;
        ctx.fillRect(x, 0, 16, 256);
        ctx.fillStyle = 'rgba(70,40,10,0.5)';
        ctx.fillRect(x, 0, 1.5, 256);
        ctx.strokeStyle = 'rgba(110,70,25,0.2)';
        for (let g = 0; g < 2; g++) { const p = x + r(2, 14); ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p + r(-2, 2), 256); ctx.stroke(); }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const body = s.material(tone, plastic ? { roughness: 0.3 } : { roughness: 0.75, map: grain });
    const flat = s.material(tone, { roughness: plastic ? 0.3 : 0.8 });
    const inside = s.material(new THREE.Color(tone).multiplyScalar(0.85), { roughness: 0.8 });
    const hoop = plastic ? s.material('#d8322c', { roughness: 0.4 }) : a.material === 'aged' ? s.material('#2b2c2e', { metalness: 0.6, roughness: 0.5 }) : s.material('#c2714a', { metalness: 0.8, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#3a2a1c', roughness: 1 });
    const waterTone = new THREE.Color('#c4e2e6').lerp(new THREE.Color('#e6e3c6'), mood.warmth * 0.6);
    const water = new THREE.MeshStandardMaterial({ color: waterTone, roughness: 0.1, emissive: waterTone, emissiveIntensity: 0.15 });
    const wet = new THREE.MeshStandardMaterial({ color: '#8fb3bd', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false });
    const foam = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });

    const put = <T extends THREE.Object3D>(parent: THREE.Object3D, child: T, at: P3 = [0, 0, 0]) => { child.position.set(...at); parent.add(child); return child; };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; return m; };

    const SW = 0.31, SD = 0.21, SH = 0.22, BR = 0.125, BH = 0.125;

    /** The stool: a plank seat with a hand slot on two arched end boards. */
    const stool = () => {
      const g = new THREE.Group();
      put(g, solid(new THREE.BoxGeometry(SW, 0.024, SD), body), [0, SH - 0.012, 0]);
      put(g, solid(new THREE.BoxGeometry(0.1, 0.004, 0.026), dark), [0, SH + 0.0005, 0]);
      const end = new THREE.Shape();
      end.moveTo(-SD / 2 + 0.01, 0); end.lineTo(-SD * 0.24, 0);
      end.absarc(0, 0, SD * 0.24, Math.PI, 0, true);
      end.lineTo(SD / 2 - 0.01, 0); end.lineTo(SD / 2 - 0.02, SH - 0.024); end.lineTo(-SD / 2 + 0.02, SH - 0.024); end.closePath();
      for (const side of [-1, 1]) {
        const board = solid(new THREE.ExtrudeGeometry(end, { depth: 0.024, bevelEnabled: false }).translate(0, 0, -0.012).rotateY(Math.PI / 2), flat);
        put(g, board, [side * (SW / 2 - 0.04), 0, 0]);
      }
      put(g, solid(new THREE.BoxGeometry(SW - 0.08, 0.035, 0.02), flat), [0, SH - 0.07, 0]);
      return g;
    };
    /** The bucket: a hooped tub, origin at the centre of its base. */
    const bucket = (fill: 'water' | 'suds' | 'empty' | 'duck' | 'none') => {
      const g = new THREE.Group();
      const w = 0.012;
      const shell = new THREE.LatheGeometry([[0, 0.006], [BR - 0.014, 0.006], [BR - 0.012, 0], [BR, BH], [BR - w, BH], [BR - w - 0.01, 0.022], [0, 0.022]].map(([x, y]) => new THREE.Vector2(x, y)), 28);
      put(g, solid(shell, body));
      for (const f of plastic ? [0.62] : [0.24, 0.74]) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(BR - 0.012 * (1 - f) + 0.003, BR - 0.012 * (1 - f - 0.14) + 0.002, plastic ? 0.03 : 0.014, 28, 1, true), hoop);
        put(g, band, [0, BH * f, 0]);
      }
      if (fill === 'water' || fill === 'duck' || fill === 'suds') put(g, new THREE.Mesh(new THREE.CylinderGeometry(BR - w - 0.002, BR - w - 0.002, 0.01, 24), water), [0, BH - 0.022, 0]);
      else if (fill === 'empty') put(g, new THREE.Mesh(new THREE.CylinderGeometry(BR - w - 0.008, BR - w - 0.008, 0.004, 24), inside), [0, 0.025, 0]);
      if (fill === 'suds') for (let i = 0; i < 16; i++) { const t = r(0, 6.3), d = Math.sqrt(random()) * (BR - 0.03); put(g, solid(new THREE.SphereGeometry(r(0.022, 0.042), 8, 6), foam), [Math.cos(t) * d, BH - 0.01 + r(0, 0.03) * (1 - d / BR), Math.sin(t) * d]); }
      if (fill === 'duck') {
        const yellow = new THREE.MeshStandardMaterial({ color: '#f7d21e', roughness: 0.35 }), d = new THREE.Group();
        const part = (size: P3, at: P3, m: THREE.Material) => { const b = solid(new THREE.SphereGeometry(1, 12, 8), m); b.scale.set(...size); put(d, b, at); };
        part([0.04, 0.03, 0.05], [0, 0.02, 0], yellow); part([0.026, 0.026, 0.026], [0, 0.058, 0.03], yellow);
        part([0.014, 0.006, 0.016], [0, 0.053, 0.058], new THREE.MeshStandardMaterial({ color: '#f0762a' }));
        for (const side of [-1, 1]) part([0.004, 0.004, 0.004], [side * 0.015, 0.066, 0.05], dark);
        d.rotation.y = r(-1, 1.4);
        put(g, d, [r(-0.02, 0.02), BH - 0.02, r(-0.02, 0.02)]);
      }
      return g;
    };
    const towelMap = (() => {
      if (a.towel === 'none') return null;
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = a.towel === 'dots' ? '#2c4273' : '#f5f2ea';
      ctx.fillRect(0, 0, 256, 128);
      if (a.towel === 'stripes') { ctx.fillStyle = '#2f4a86'; for (const x of [14, 30, 214, 230]) ctx.fillRect(x, 0, 10, 128); }
      if (a.towel === 'dots') { ctx.fillStyle = '#f2efe6'; for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) { ctx.beginPath(); ctx.arc(12 + x * 21 + (y % 2) * 10, 11 + y * 21, 4.5, 0, 7); ctx.fill(); } }
      if (a.towel === 'checks') { ctx.fillStyle = 'rgba(200,50,50,0.55)'; for (let i = 0; i < 8; i++) { ctx.fillRect(i * 32, 0, 16, 128); ctx.fillRect(0, i * 32, 256, 16); } }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })();
    const cloth = new THREE.MeshStandardMaterial({ map: towelMap, roughness: 0.95 });
    const towel = (how: 'folded' | 'draped' | 'dropped') => {
      const g = new THREE.Group();
      if (!towelMap) return g;
      if (how === 'folded') {
        put(g, solid(new THREE.BoxGeometry(0.2, 0.014, 0.11), cloth), [0, 0.007, 0]);
        put(g, solid(new THREE.BoxGeometry(0.196, 0.014, 0.106), cloth), [0.002, 0.022, 0.001]);
        put(g, solid(new THREE.BoxGeometry(0.19, 0.012, 0.1), cloth), [0, 0.036, 0]);
      } else if (how === 'draped') {
        put(g, solid(new THREE.BoxGeometry(0.15, 0.01, SD + 0.02), cloth), [0, 0.005, 0]);
        put(g, solid(new THREE.BoxGeometry(0.15, 0.13, 0.01), cloth), [0, -0.06, SD / 2 + 0.012]).rotation.x = -0.06;
        put(g, solid(new THREE.BoxGeometry(0.15, 0.07, 0.01), cloth), [0, -0.03, -SD / 2 - 0.012]);
      } else for (let i = 0; i < 4; i++) {
        const fold = put(g, solid(new THREE.BoxGeometry(r(0.1, 0.16), 0.016, r(0.07, 0.1)), cloth), [r(-0.05, 0.05), 0.01 + i * 0.012, r(-0.04, 0.04)]);
        fold.rotation.set(r(-0.25, 0.25), r(0, 3), r(-0.25, 0.25));
      }
      return g;
    };
    const washKit = () => {
      const g = new THREE.Group();
      if (a.wash === 'soap') {
        for (let i = 0; i < 4; i++) put(g, solid(new THREE.BoxGeometry(0.11, 0.008, 0.014), flat), [0, 0.014, -0.03 + i * 0.02]);
        for (const x of [-0.04, 0.04]) put(g, solid(new THREE.BoxGeometry(0.012, 0.01, 0.08), flat), [x, 0.005, 0]);
        const bar = solid(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f3b8c4' : '#efe6c8', roughness: 0.4 }));
        bar.scale.set(0.045, 0.016, 0.03);
        put(g, bar, [0, 0.032, 0]).rotation.y = r(-0.4, 0.4);
      } else if (a.wash === 'brush') {
        put(g, solid(new THREE.BoxGeometry(0.34, 0.014, 0.022), flat), [0.08, 0.035, 0]);
        put(g, solid(new THREE.BoxGeometry(0.13, 0.016, 0.05), flat), [-0.13, 0.035, 0]);
        put(g, solid(new THREE.BoxGeometry(0.12, 0.028, 0.044), new THREE.MeshStandardMaterial({ color: '#cdb890', roughness: 1 })), [-0.13, 0.014, 0]);
      } else if (a.wash === 'bottles') {
        const tints = ['#e9e4d6', '#7fa7b8', '#d99aa4'];
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 0.075, h = r(0.15, 0.19);
          put(g, solid(new THREE.CylinderGeometry(0.027, 0.03, h, 14), new THREE.MeshStandardMaterial({ color: tints[i], roughness: 0.35 })), [x, h / 2, r(-0.01, 0.01)]);
          put(g, solid(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), foam), [x, h + 0.02, 0]);
          put(g, solid(new THREE.BoxGeometry(0.012, 0.01, 0.04), foam), [x, h + 0.042, 0.012]);
          put(g, solid(new THREE.PlaneGeometry(0.034, h * 0.4), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 })), [x, h * 0.5, 0.0305]);
        }
      }
      return g;
    };
    const puddle = (at: P3, rx: number, rz: number, turn = 0) => {
      const shape = new THREE.Shape(), k = r(0, 6);
      for (let i = 0; i <= 28; i++) { const t = (i / 28) * Math.PI * 2, f = 1 + Math.sin(t * 3 + k) * 0.14 + Math.sin(t * 5 + k) * 0.08; if (i) shape.lineTo(Math.cos(t) * rx * f, Math.sin(t) * rz * f); else shape.moveTo(rx * f, 0); }
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), wet);
      mesh.rotation.y = turn;
      put(s.root, mesh, at);
    };

    const steamAt: P3[] = [];
    /** One whole set in a given state, built around its own origin. */
    const makeSet = (state: typeof a.arrangement, origin: P3, turn: number, full: boolean) => {
      const g = new THREE.Group();
      g.position.set(...origin);
      g.rotation.y = turn;
      s.root.add(g);
      const world = (p: P3): P3 => { const v = new THREE.Vector3(...p).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn); return [v.x + origin[0], v.y + origin[1], v.z + origin[2]]; };
      const seat = stool();
      if (state === 'tidy') {
        put(g, seat);
        const b = put(g, bucket('none'), [0, SH + BH, 0]);
        b.rotation.x = Math.PI;
        put(g, towel('folded'), [0, SH + BH, 0]).rotation.y = r(-0.2, 0.2);
        if (full) put(g, washKit(), [0.02, 0, SD / 2 + 0.12]);
      } else if (state === 'waiting') {
        put(g, seat, [-0.08, 0, 0]);
        put(g, bucket(a.contents === 'duck' || a.contents === 'suds' ? 'empty' : a.contents), [SW / 2 + BR + 0.0, 0, 0.03]);
        if (a.contents === 'water') steamAt.push(world([SW / 2 + BR, BH, 0.03]));
        put(g, towel('folded'), [-0.08, SH, 0]).rotation.y = r(-0.1, 0.1);
        if (full) put(g, washKit(), [-0.06, 0, SD / 2 + 0.13]);
      } else if (state === 'in-use') {
        put(g, seat, [-0.07, 0, -0.03]).rotation.y = r(-0.25, 0.25);
        put(g, bucket(a.contents), [SW / 2 + BR + 0.02, 0, 0.12]);
        if (a.contents !== 'empty') steamAt.push(world([SW / 2 + BR + 0.02, BH, 0.12]));
        put(g, towel('draped'), [-0.07 + r(-0.03, 0.03), SH, -0.03]).rotation.y = seat.rotation.y;
        put(g, washKit(), [-0.1, 0, SD / 2 + 0.14]).rotation.y = r(-0.5, 0.5);
        puddle(world([0.02, 0.003, 0.08]), 0.36, 0.27, turn);
        for (let i = 0, n = Math.round(mix(6, 22, mood.density)); i < n; i++) {
          const t = r(0, 6.3), d = r(0.12, 0.34);
          put(g, solid(new THREE.SphereGeometry(r(0.012, 0.03), 8, 6), foam), [Math.cos(t) * d, 0.008, 0.1 + Math.sin(t) * d * 0.7]).scale.y = 0.6;
        }
      } else {
        seat.rotation.z = Math.PI / 2;
        put(g, seat, [-0.02, SW / 2 - 0.04 + 0.012, -0.02]).rotation.y = r(-0.4, 0.4);
        const b = put(g, bucket('none'), [SW / 2 + 0.16, BR - 0.001, 0.14]);
        b.rotation.z = -Math.PI / 2;
        b.rotation.y = r(-0.9, -0.3);
        puddle(world([SW / 2 + 0.3, 0.003, 0.3]), 0.3, 0.2, turn + 0.7);
        put(g, towel('dropped'), [-0.18, 0, SD / 2 + 0.14]);
        const kit = put(g, washKit(), [0.08, 0, SD / 2 + 0.24]);
        kit.rotation.y = r(0.6, 2);
        if (a.wash === 'bottles') { kit.rotation.z = Math.PI / 2; kit.position.y = 0.03; }
      }
    };

    if (a.sets === 'one') makeSet(a.arrangement, [0, 0, 0], r(-0.15, 0.15), true);
    else if (a.sets === 'pair') {
      makeSet(a.arrangement, [-0.36, 0, 0], r(-0.1, 0.25), true);
      makeSet(a.arrangement === 'tipped' ? 'in-use' : a.arrangement, [0.36, 0, r(-0.05, 0.05)], r(-0.25, 0.1), false);
    } else if (a.sets === 'row') {
      const odd = Math.floor(random() * 3);
      const rest = a.arrangement === 'tidy' ? 'waiting' : 'tidy';
      for (let i = 0; i < 3; i++) makeSet(i === odd ? a.arrangement : rest, [(i - 1) * 0.58, 0, r(-0.03, 0.03)], r(-0.08, 0.08), i === odd);
    } else {
      makeSet(a.arrangement, [0.1, 0, 0.32], r(-0.15, 0.15), true);
      const column = 3 + Math.round(mood.density * 3);
      for (let i = 0; i < column; i++) { const st = put(s.root, stool(), [-0.36 + r(-0.008, 0.008), i * (SH * 0.55), -0.3]); st.rotation.y = r(-0.05, 0.05); }
      const rows = mood.density > 0.5 ? 3 : 2;
      for (let row = 0; row < rows; row++) for (let i = 0; i < rows - row; i++) {
        const b = put(s.root, bucket('none'), [0.2 + (i - (rows - row - 1) / 2) * (BR * 2 + 0.012), BH + row * (BH + 0.004), -0.3]);
        b.rotation.x = Math.PI;
      }
    }

    if (a.footprints) {
      const print = new THREE.MeshStandardMaterial({ color: '#5f7f8a', roughness: 0.1, transparent: true, opacity: 0.5, depthWrite: false });
      const heading = r(-0.2, 0.5);
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1, along = 0.3 + i * 0.2;
        const g = new THREE.Group();
        const sole = new THREE.Mesh(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), print);
        sole.scale.set(0.035, 1, 0.07);
        g.add(sole);
        for (let t = 0; t < 4; t++) { const toe = new THREE.Mesh(new THREE.CircleGeometry(0.011 - t * 0.0015, 8).rotateX(-Math.PI / 2), print); toe.position.set(-side * (0.024 - t * 0.017), 0, 0.085 - t * 0.006); g.add(toe); }
        g.position.set(Math.sin(heading) * along + Math.cos(heading) * side * 0.07 + 0.25, 0.004, Math.cos(heading) * along - Math.sin(heading) * side * 0.07 + 0.1);
        g.rotation.y = heading + side * -0.12;
        sole.material = print;
        s.root.add(g);
      }
    }
    if (mood.wear > 0.6 && !plastic) {
      const mildew = new THREE.MeshStandardMaterial({ color: '#3b3a30', roughness: 1, transparent: true, opacity: 0.5, depthWrite: false });
      for (let i = 0; i < 10; i++) put(s.root, new THREE.Mesh(new THREE.CircleGeometry(r(0.03, 0.07), 10).rotateX(-Math.PI / 2), mildew), [r(-0.4, 0.4), 0.002, r(-0.2, 0.3)]);
    }

    // Steam off any hot bucket.
    const mist = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false, roughness: 1, emissive: '#aebccb', emissiveIntensity: 0.35 });
    const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
    const per = Math.round(mix(4, 8, mood.energy));
    const puffs = steamAt.flatMap((at) => Array.from({ length: per }, (_unused, i) => {
      const mesh = new THREE.Mesh(puffGeometry, mist);
      s.root.add(mesh);
      return { mesh, at, phase: (i + random()) / per, size: r(0.035, 0.06), sway: r(0, 6.3) };
    }));
    const pose = (time: number) => {
      for (const p of puffs) {
        const t = (p.phase + time * 0.08 * mix(0.6, 1.8, mood.energy)) % 1;
        p.mesh.position.set(p.at[0] + Math.sin(p.sway + t * 4) * 0.04 * t, p.at[1] + 0.01 + t * 0.42, p.at[2] + Math.cos(p.sway + t * 3) * 0.04 * t);
        p.mesh.scale.setScalar(p.size * (0.5 + t * 1.5) * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.5 + 0.001);
      }
    };
    pose(0);
    return s.finish({ update: (_dt, time) => pose(time) });
  },
});
