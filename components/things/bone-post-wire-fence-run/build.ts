import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    posts: choice('What are the posts made of?', {
      bone: 'Pale bone-white posts with knobbed ends, like great femurs stood on end.',
      grey: 'Grey weathered timber, split and silvered.',
      dark: 'Dark creosoted stakes, almost black.',
      steel: 'Rusted steel T-posts.',
    }),
    wire: choice('What is strung between them?', {
      barbed: 'Three strands of barbed wire.',
      smooth: 'Three smooth strands of wire.',
      tape: 'White electric fence tape on black insulators.',
      single: 'Only the top strand left; the lower ones are long gone.',
    }),
    state: choice('What state is the run in?', {
      intact: 'Intact and tight, every post upright.',
      sagging: 'The wire sagging low between leaning posts.',
      broken: 'Broken through: a post knocked flat in the middle and the wire snapped and curled.',
      drunk: 'Old and drunk: every post tilting its own way, strands drooping.',
    }),
    gate: choice('What about the gate at the end?', {
      closed: 'A gate at the end, closed.',
      open: 'A gate at the end, swung wide open.',
      off: 'A gate hanging off one hinge, its corner in the dirt.',
      none: 'No gate: the run simply ends.',
    }),
    caught: choice('What is caught on the wire?', {
      nothing: 'Nothing.',
      hide: 'A scrap of torn hide snagged on a barb.',
      fur: 'A tuft of pale fur.',
      ribbon: 'A faded red ribbon tied to a strand, marking something.',
      sign: 'A small hand-painted sign wired on: KEEP OUT.',
    }),
    line: choice('How does the run lie?', {
      straight: 'Dead straight.',
      curve: 'A gentle curve.',
      dogleg: 'A dog-leg, bending once partway along.',
    }),
    length: score('How long is the run?', ['Just three posts', 'A short run of five', 'A line of eight']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { random, mood } = context;
    const count = 3 + Math.round(a.length * 5);
    const gap = 2.0;
    const postMat = {
      bone: s.material('#ece6d6', { roughness: 0.78 }),
      grey: s.material('#9a968b', { roughness: 0.95 }),
      dark: s.material('#2f2823', { roughness: 0.9 }),
      steel: s.material('#7a4e36', { roughness: 0.6, metalness: 0.4 }),
    }[a.posts];
    const wireMat = s.material(a.wire === 'tape' ? '#f1efe4' : '#4e463c', { roughness: 0.5, metalness: a.wire === 'tape' ? 0 : 0.5 });
    const drunk = a.state === 'drunk', sagging = a.state === 'sagging';
    const broken = a.state === 'broken' ? Math.floor(count / 2) : -1;
    const wireR = 0.022;

    // Where each post stands along the run.
    const bend = a.line === 'curve' ? 0.1 : 0;
    const at = (i: number): [number, number] => {
      const x = (i - (count - 1) / 2) * gap;
      let z = bend * x * x * 0.5;
      if (a.line === 'dogleg' && i > count / 2) z += (i - count / 2) * gap * 0.45;
      return [x, z];
    };
    const height = () => 1.4 * mix(0.94, 1.06, random()) - (drunk ? random() * 0.2 : 0);
    const leanOf = (i: number) => {
      if (i === broken) return 1.35;
      return drunk ? (random() - 0.5) * 0.5 : sagging ? (random() - 0.5) * 0.22 : (random() - 0.5) * 0.05;
    };
    const special = 1 + Math.floor(random() * Math.max(1, count - 2));

    const posts: { base: P3; top: P3; h: number; lean: number; yaw: number }[] = [];
    for (let i = 0; i < count; i++) {
      const [x, z] = at(i);
      const h = height();
      let lean = leanOf(i);
      if (i === special && a.state !== 'broken') lean = 0.28 * (random() < 0.5 ? 1 : -1);
      const yaw = random() * Math.PI * 2;
      const tilt = new THREE.Vector3(0, h, 0).applyAxisAngle(new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)), lean);
      posts.push({ base: [x, 0, z], top: [x + tilt.x, tilt.y, z + tilt.z], h, lean, yaw });
    }

    // Posts, each with its own tilt: a knobbed lathe for bone, a tapered block for timber, a cross for steel.
    const boneProfile = (h: number) => [
      [0, 0], [0.15, 0], [0.13, h * 0.07], [0.1, h * 0.2], [0.09, h * 0.5], [0.095, h * 0.74], [0.12, h * 0.88], [0.15, h * 0.95], [0.11, h * 0.995], [0, h],
    ] as [number, number][];
    for (const post of posts) {
      const group = new THREE.Group();
      group.position.set(post.base[0], drunk && post.lean <= 1 ? -0.1 : 0, post.base[2]);
      group.setRotationFromAxisAngle(new THREE.Vector3(Math.cos(post.yaw), 0, Math.sin(post.yaw)), post.lean);
      if (a.posts === 'bone') {
        const m = s.lathe(boneProfile(post.h), postMat);
        m.rotation.y = random() * 6;
        group.add(m);
        // Two condyles at the head and a knuckle at the foot: the posts were leg bones once.
        for (const sx of [-1, 1]) group.add(s.ball([0.1, 0.085, 0.11], [sx * 0.085, post.h * 0.94, 0.02], postMat, 10));
        group.add(s.ball([0.17, 0.09, 0.16], [0.01, 0.04, -0.01], postMat, 10));
        // A hairline crack of dark down the shaft.
        group.add(s.box([0.012, post.h * mix(0.25, 0.45, random()), 0.012], [0.09, post.h * mix(0.35, 0.6, random()), 0.02], s.material('#8a8273')));
      } else if (a.posts === 'steel') {
        const web = s.box([0.075, post.h, 0.016], [0, post.h / 2, 0], postMat);
        const flange = s.box([0.016, post.h, 0.075], [0, post.h / 2, 0.03], postMat);
        group.add(web, flange);
        for (let k = 0; k < 6; k++) group.add(s.box([0.045, 0.03, 0.016], [0, 0.3 + k * 0.18, -0.016], postMat));
        group.add(s.box([0.2, 0.05, 0.2], [0, 0.03, 0], postMat));
      } else {
        const m = s.cylinder(0.085, 0.105, post.h, [0, post.h / 2, 0], postMat, a.posts === 'grey' ? 6 : 9);
        m.rotation.y = random();
        group.add(m);
        if (a.posts === 'grey') group.add(s.box([0.02, post.h * 0.4, 0.13], [0, post.h * 0.6, 0], s.material('#6f6b62')));
        if (a.posts === 'dark') group.add(s.cylinder(0.1, 0.1, 0.05, [0, post.h - 0.02, 0], s.material('#1c1714'), 9));
      }
      s.root.add(group);
    }

    // Wire: strands sagging between neighbours, all merged into one mesh.
    const strandY = a.wire === 'single' ? [0.96] : [0.3, 0.63, 0.96];
    const strands: THREE.BufferGeometry[] = [];
    const along = (post: typeof posts[number], f: number): P3 => [
      post.base[0] + (post.top[0] - post.base[0]) * f, post.base[1] + (post.top[1] - post.base[1]) * f, post.base[2] + (post.top[2] - post.base[2]) * f,
    ];
    for (let i = 0; i < count - 1; i++) {
      const left = posts[i], right = posts[i + 1];
      const gapBroken = i === broken || i + 1 === broken;
      for (const [k, f] of strandY.entries()) {
        const p0 = along(left, f / 1.4), p1 = along(right, f / 1.4);
        if (gapBroken) {
          // Snapped: each side ends in a curl of loose wire.
          const from = i === broken ? p1 : p0, dir = i === broken ? -1 : 1;
          const pts: P3[] = [from, [from[0] + dir * 0.5, from[1] - 0.1, from[2] + 0.1], [from[0] + dir * 0.75, from[1] - 0.45, from[2] - 0.15], [from[0] + dir * 0.55, from[1] - 0.7, from[2] + 0.2], [from[0] + dir * 0.9, Math.max(0.02, from[1] - 0.95), from[2]]];
          strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 24, wireR, 6));
          continue;
        }
        const sag = (sagging ? 0.24 : drunk ? 0.15 : 0.05) * mix(0.7, 1.3, random()) * (1 - k * 0.15);
        const mid: P3 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - sag, (p0[2] + p1[2]) / 2 + (random() - 0.5) * 0.03];
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(...p0), new THREE.Vector3(...mid), new THREE.Vector3(...p1)]);
        if (a.wire === 'tape') {
          const pts = curve.getPoints(10);
          const flatPts: number[] = [], idx: number[] = [];
          pts.forEach((p, n) => {
            flatPts.push(p.x, p.y + 0.025, p.z, p.x, p.y - 0.025, p.z);
            if (n) idx.push((n - 1) * 2, (n - 1) * 2 + 1, n * 2, n * 2, (n - 1) * 2 + 1, n * 2 + 1);
          });
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(flatPts, 3));
          g.setIndex(idx);
          g.computeVertexNormals();
          strands.push(g);
        } else strands.push(new THREE.TubeGeometry(curve, 12, wireR, 6));
      }
    }
    // The last strands of a 'single' run: stubs of the lower wires still twisted round a post or two.
    if (a.wire === 'single') for (const post of posts) if (random() < 0.5) {
      const p = along(post, 0.3 / 1.4), dir = random() < 0.5 ? 1 : -1;
      const pts: P3[] = [p, [p[0] + dir * 0.25, p[1] - 0.12, p[2] + 0.08], [p[0] + dir * 0.4, p[1] - 0.3, p[2] - 0.05], [p[0] + dir * 0.35, 0.02, p[2] + 0.1]];
      strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(...q))), 16, wireR, 6));
    }
    const merged = mergeGeometries(strands.map((g) => g.index ? g.toNonIndexed() : g));
    if (merged) s.mesh(merged, a.wire === 'tape' ? new THREE.MeshStandardMaterial({ color: '#f1efe4', roughness: 0.6, side: THREE.DoubleSide }) : wireMat, [0, 0, 0]);
    for (const g of strands) g.dispose();
    if (a.wire === 'barbed') {
      // Barbs twisted onto the strands every half metre.
      const barbs: { at: P3; size: number }[] = [];
      for (let i = 0; i < count - 1; i++) {
        if (i === broken || i + 1 === broken) continue;
        for (const f of strandY) for (let t = 0.1; t < 0.95; t += 0.2) {
          const p0 = along(posts[i], f / 1.4), p1 = along(posts[i + 1], f / 1.4);
          barbs.push({ at: [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - (sagging ? 0.22 : 0.05) * Math.sin(t * Math.PI), p0[2] + (p1[2] - p0[2]) * t], size: 0.04 });
        }
      }
      const barb = new THREE.OctahedronGeometry(1, 0);
      barb.scale(1, 1.6, 0.5);
      s.scatter(barb, wireMat, barbs);
    }
    if (a.wire === 'tape') {
      const insulators: { at: P3; size: number }[] = [];
      for (const post of posts) for (const f of strandY) insulators.push({ at: along(post, f / 1.4), size: 0.04 });
      s.scatter(new THREE.CylinderGeometry(1, 1, 1.2, 8), s.material('#1d1d1f', { roughness: 0.5 }), insulators);
    }

    // The gate section, hinged on the last post.
    if (a.gate !== 'none') {
      const end = posts[count - 1];
      const gw = 2.4, gh = 1.2;
      const hinge = new THREE.Group();
      hinge.position.set(end.base[0] + 0.14, 0, end.base[2]);
      const rail = a.posts === 'steel' ? s.material('#6d6a66', { metalness: 0.5, roughness: 0.5 }) : postMat;
      const bar = (from: P3, to: P3, r = 0.04) => { const m = s.rod(from, to, r, rail); hinge.add(m); return m; };
      bar([0.02, 0.22, 0], [gw, 0.22, 0]);
      bar([0.02, gh, 0], [gw, gh, 0]);
      bar([0.02, 0.62, 0], [gw, 0.62, 0], 0.03);
      for (const x of [0.05, gw * 0.5, gw - 0.05]) bar([x, 0.12, 0], [x, gh + 0.1, 0], 0.04);
      bar([0.05, 0.22, 0], [gw - 0.05, gh, 0], 0.028);
      // A heavier gate post opposite, when the gate is not swung away from it.
      if (a.gate === 'closed') {
        s.cylinder(0.1, 0.12, 1.5, [end.base[0] + gw + 0.24, 0.75, end.base[2]], postMat, 10);
        s.box([0.08, 0.06, 0.16], [end.base[0] + gw + 0.14, 0.85, end.base[2]], s.material('#4a4541', { metalness: 0.5 }));
      }
      if (a.gate === 'open') hinge.rotation.y = mix(-1.6, -1.1, random());
      if (a.gate === 'off') { hinge.rotation.z = -0.32; hinge.position.y = 0.25; hinge.rotation.y = -0.35; }
      s.root.add(hinge);
      // Hinges: two straps on the post.
      for (const y of [0.27, gh - 0.05]) s.box([0.08, 0.06, 0.16], [end.base[0] + 0.06, y, end.base[2]], s.material('#4a4541', { metalness: 0.5 }));
    }

    // Something caught on the top strand, about a third of the way along.
    if (a.caught !== 'nothing') {
      const i = Math.min(count - 2, Math.max(0, Math.floor(count * 0.35)));
      const top = strandY[strandY.length - 1];
      const p0 = along(posts[i], top / 1.4), p1 = along(posts[i + 1], top / 1.4);
      const t = mix(0.3, 0.7, random());
      const x = p0[0] + (p1[0] - p0[0]) * t, y = p0[1] + (p1[1] - p0[1]) * t - 0.04, z = p0[2] + (p1[2] - p0[2]) * t;
      if (a.caught === 'hide') {
        const scrap = s.box([0.2, 0.3, 0.012], [x, y - 0.14, z], s.material('#6b5a4a', { roughness: 1, side: THREE.DoubleSide }));
        scrap.rotation.set(0.2, 0.3, 0.35);
        s.box([0.09, 0.14, 0.012], [x + 0.1, y - 0.26, z + 0.02], s.material('#5a4a3c', { roughness: 1 })).rotation.z = -0.5;
      } else if (a.caught === 'fur') {
        const fur = s.material('#e6e0d2', { roughness: 1 });
        for (let k = 0; k < 9; k++) s.ball([0.025, 0.07, 0.025], [x + (random() - 0.5) * 0.12, y - 0.02 - random() * 0.07, z + (random() - 0.5) * 0.05], fur, 6).rotation.z = (random() - 0.5);
      } else if (a.caught === 'ribbon') {
        const tie = s.material('#b24a3c', { roughness: 0.8, side: THREE.DoubleSide });
        s.box([0.04, 0.04, 0.04], [x, y + 0.03, z], tie);
        s.box([0.035, 0.36, 0.005], [x + 0.02, y - 0.16, z], tie).rotation.z = 0.15;
        s.box([0.035, 0.26, 0.005], [x - 0.04, y - 0.1, z + 0.01], tie).rotation.z = -0.25;
      } else {
        s.label('KEEP OUT', 0.62, 0.27, [x, y - 0.17, z + 0.012], '#2a2420', '#d9ccae').rotation.z = -0.06;
        s.box([0.64, 0.29, 0.014], [x, y - 0.17, z], s.material('#8a7250'));
      }
    }

    // Wear: a snapped curl or two of old wire lying at the feet of a post.
    if (mood.wear > 0.5) {
      const p = posts[Math.floor(random() * count)];
      s.ring(0.14, wireR * 0.8, [p.base[0] + 0.3, 0.018, p.base[2] + 0.18], wireMat, Math.PI * 1.6).rotation.x = -Math.PI / 2;
    }

    return s.finish();
  },
});
