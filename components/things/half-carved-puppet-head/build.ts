import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    progress: choice('How far along is the carving?', {
      pencil: 'Not begun: a squared block with the face only drawn on in pencil lines.',
      roughed: 'Roughed out: corners knocked off, a faceted lump with a wedge of nose and a brow ledge, no features.',
      half: 'Half and half: one side of the face finished smooth with eye, cheek and ear, the other side still raw square block.',
      carved: 'Fully carved and sanded but bare wood, the back of the head still a square slab.',
      painting: 'Carved, and the first paint just on: eyes, brows and red lips on bare wood.',
    }),
    face: choice('Whose face is coming out of the wood?', {
      villain: 'A villain: hooked nose, pointed chin, heavy slanted brows, a sneer.',
      child: 'A child: round cheeks, button nose, wide eyes, a small mouth.',
      portrait: 'A careful portrait of a real person: ordinary, even proportions, a calm closed mouth.',
      king: 'An old king: long carved beard and the notched band of a crown.',
      death: 'Death: a skull with deep sockets, a nose hole and a row of teeth.',
    }),
    tools: choice('What tools are left out?', {
      row: 'Four gouges laid in a neat row beside the vice.',
      struck: 'A round mallet on the bench and one gouge left standing in the wood mid-cut.',
      knife: 'Only a whittling knife and a pencil stub.',
      none: 'None: the bench has been cleared.',
    }),
    story: choice('What is the story of the work?', {
      tonight: 'In progress tonight: fresh pale curls everywhere and a mug still on the bench.',
      draped: 'Paused: a dust cloth draped over the top of the head until tomorrow.',
      abandoned: 'Abandoned years ago: greyed wood, a rusted vice, cobwebs, the shavings long swept away.',
      split: 'Ruined: the block has split through the face along the grain and the carver walked away.',
    }),
    vice: choice('What holds the block?', {
      iron: 'A blue hammer-finish iron bench vice.',
      black: 'An old black cast-iron vice worn to bright steel on its edges.',
      wooden: "A carver's wooden screw vice with beech jaws.",
    }),
    reference: choice('What is the carver working from?', {
      none: 'Nothing: it is all in the head.',
      sketch: 'A pencil sketch on paper propped on a stick.',
      photo: 'A small sepia photograph of a face, propped where it can be seen.',
      sibling: 'A finished, painted puppet head on a peg: the one this must match.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const old = a.story === 'abandoned';
    const age = Math.max(mood.wear * 0.5, old ? 0.75 : 0);
    const tone = (c: string, k = 1) => new THREE.Color(c).lerp(new THREE.Color('#9d9484'), age * 0.6 * k);
    const lindenC = tone('#ead7ab');
    const linden = new THREE.MeshStandardMaterial({ color: lindenC, roughness: 0.75 });
    const facet = new THREE.MeshStandardMaterial({ color: lindenC, roughness: 0.8, flatShading: true });
    const cut = new THREE.MeshStandardMaterial({ color: tone('#c4a977'), roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: tone('#6a5233'), roughness: 0.9 });
    const steel = s.material('#c3c7ca', { metalness: 0.85, roughness: 0.3 + age * 0.4 });
    const bench = s.material(tone('#8a6238', 0.6), { roughness: 0.8 });
    const T = 0.075;

    // Bench slab on two battens.
    s.box([0.72, 0.05, 0.46], [0.02, T - 0.025, 0.04], bench);
    for (const x of [-0.24, 0.28]) s.box([0.06, 0.025, 0.46], [x, 0.0125, 0.04], bench);
    for (let i = 0; i < 3; i++) s.box([0.72, 0.001, 0.003], [0.02, T + 0.0005, -0.1 + i * 0.13 + random() * 0.03], dark);

    // Vice.
    const wooden = a.vice === 'wooden';
    const body = wooden ? s.material(tone('#c69a5c', 0.6), { roughness: 0.7 }) : s.material(old ? '#6b3f26' : a.vice === 'iron' ? '#2f5f9c' : '#232427', { metalness: old ? 0.2 : 0.5, roughness: old ? 0.9 : 0.45 });
    const jawX = 0.1015;
    s.box([0.44, 0.03, 0.16], [0.04, T + 0.015, 0], body);
    s.box([0.045, 0.12, 0.15], [-jawX - 0.0225, T + 0.09, 0], body);
    s.box([0.045, 0.12, 0.15], [jawX + 0.0225, T + 0.09, 0], body);
    s.box([0.24, 0.03, 0.07], [0.06, T + 0.045, 0], wooden ? body : steel);
    if (!wooden) for (const x of [-1, 1]) s.box([0.008, 0.035, 0.15], [x * (jawX + 0.004), T + 0.13, 0], steel);
    const screw = s.cylinder(wooden ? 0.016 : 0.01, wooden ? 0.016 : 0.01, 0.17, [jawX + 0.13, T + 0.07, 0], wooden ? body : steel, 12); screw.rotation.z = Math.PI / 2;
    s.cylinder(0.02, 0.02, 0.03, [jawX + 0.215, T + 0.07, 0], body, 12).rotation.z = Math.PI / 2;
    const ht = random() * 3;
    const hv: P3 = [0, Math.cos(ht) * 0.08, Math.sin(ht) * 0.08];
    s.rod([jawX + 0.215, T + 0.07 - hv[1], -hv[2]], [jawX + 0.215, T + 0.07 + hv[1] * 0.6, hv[2] * 0.6], 0.006, wooden ? body : steel);
    for (const k of [-1, 0.6]) s.ball([0.01, 0.01, 0.01], [jawX + 0.215, T + 0.07 + hv[1] * k, hv[2] * k], wooden ? body : steel, 8);
    if (!wooden) for (const z of [-1, 1]) s.cylinder(0.009, 0.009, 0.008, [-0.15, T + 0.034, z * 0.06], steel, 6);

    // The block.
    const block = new THREE.Group();
    block.position.set(0, T + 0.22, 0);
    block.scale.setScalar(1.45);
    s.root.add(block);
    const K = <O extends THREE.Object3D>(o: O) => { block.add(o); return o; };
    const sketch = (halfOnly: boolean) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 320;
      const g = canvas.getContext('2d')!;
      g.fillStyle = '#' + lindenC.getHexString(); g.fillRect(0, 0, 256, 320);
      g.strokeStyle = 'rgba(150,120,70,0.25)'; g.lineWidth = 1;
      for (let i = 0; i < 26; i++) { const x = random() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, 100, x - 6, 220, x + 3, 320); g.stroke(); }
      g.strokeStyle = 'rgba(40,40,46,0.85)'; g.lineWidth = 2.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(128, 6); g.lineTo(128, 314); g.moveTo(20, 130); g.lineTo(236, 130); g.stroke();
      g.beginPath(); g.ellipse(128, 140, 84, 112, 0, 0, 7); g.stroke();
      for (const k of [-1, 1]) { g.beginPath(); g.ellipse(128 + k * 38, 128, 17, 9, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(128 + k * 16, 104); g.lineTo(128 + k * 60, a.face === 'villain' ? 92 : 104); g.stroke(); }
      g.beginPath(); g.moveTo(128, 120); g.lineTo(112, 176); g.lineTo(144, 176); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(96, 208); g.quadraticCurveTo(128, a.face === 'child' ? 224 : 204, 160, 208); g.stroke();
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (halfOnly) { texture.repeat.set(0.5, 0.73); texture.offset.set(0.5, 0.27); }
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.75 });
    };

    const hy = 0.03, hz = 0.02;
    const child = a.face === 'child', villain = a.face === 'villain', death = a.face === 'death', king = a.face === 'king';
    const rx = child ? 0.056 : 0.051, ry = child ? 0.064 : 0.07, rz = 0.058;
    const painting = a.progress === 'painting';
    const features = (sides: number[]) => {
      const both = sides.length === 2;
      K(s.ball([rx, ry, rz], [0, hy, hz], linden, 28));
      K(s.cylinder(0.026, 0.03, 0.05, [0, -0.04, hz - 0.006], linden, 16));
      const zf = hz + rz;
      // Nose.
      if (death) { const hole = K(s.mesh(new THREE.ConeGeometry(0.01, 0.02, 3), dark, [0, hy - 0.006, zf - 0.003])); hole.scale.z = 0.3; }
      else if (child) K(s.ball([0.011, 0.01, 0.011], [0, hy - 0.004, zf + 0.002], linden, 12));
      else { const nose = K(s.cylinder(0.001, villain ? 0.014 : 0.013, villain ? 0.058 : 0.04, [0, hy - 0.002, zf + (villain ? 0.006 : 0.0)], linden, 12)); nose.rotation.x = villain ? 0.75 : 0.5; nose.scale.z = 1.25; if (villain) K(s.ball([0.009, 0.009, 0.009], [0, hy - 0.022, zf + 0.019], linden, 10)); }
      // Chin, mouth.
      if (villain) { const chin = K(s.cylinder(0.02, 0.004, 0.04, [0, hy - ry * 0.9, hz + rz * 0.62], linden, 12)); chin.rotation.x = -0.75; }
      else if (!death) K(s.ball([0.018, 0.014, 0.016], [0, hy - ry * 0.8, hz + rz * 0.6], linden, 12));
      const my = hy - (child ? 0.032 : 0.036);
      if (death) {
        K(s.box([0.05, 0.02, 0.012], [0, my - 0.004, zf - 0.012], linden));
        for (let i = -3; i <= 3; i++) K(s.box([0.0018, 0.02, 0.004], [i * 0.0068, my - 0.004, zf - 0.006 - Math.abs(i) * 0.0012], dark));
        K(s.box([0.052, 0.002, 0.004], [0, my - 0.004, zf - 0.0065], dark));
      } else {
        const w = child ? 0.012 : 0.02;
        const lipMat = painting ? new THREE.MeshStandardMaterial({ color: '#b3242c', roughness: 0.4 }) : cut;
        K(s.tube([[-w, my + (villain ? -0.004 : child ? 0.003 : 0), zf - 0.012], [0, my - (child ? 0.003 : 0), zf - 0.004], [w, my + (villain ? 0.007 : child ? 0.003 : 0), zf - 0.012]], painting ? 0.0036 : 0.0022, lipMat));
        if (!painting) K(s.ball([w * 0.7, 0.004, 0.004], [0, my - 0.006, zf - 0.006], linden, 10));
      }
      if (king) {
        const beard = K(s.cylinder(0.034, 0.004, 0.095, [0, hy - ry - 0.012, hz + rz * 0.55], linden, 14)); beard.scale.z = 0.6; beard.rotation.x = -0.12;
        for (let i = -2; i <= 2; i++) K(s.rod([i * 0.011, hy - ry + 0.03, hz + rz * 0.82 - Math.abs(i) * 0.004], [i * 0.006, hy - ry - 0.045, hz + rz * 0.62], 0.0014, cut));
        K(s.cylinder(rx * 0.9, rx * 0.98, 0.018, [0, hy + ry * 0.66, hz], linden, 20));
        for (let i = 0; i < 9; i++) { const t = i / 9 * 6.283; K(s.mesh(new THREE.ConeGeometry(0.008, 0.02, 4), linden, [Math.sin(t) * rx * 0.86, hy + ry * 0.66 + 0.018, hz + Math.cos(t) * rx * 0.86])); }
      }
      for (const side of sides) {
        const ex = side * rx * 0.42, ey = hy + 0.012, ez = hz + rz * 0.86;
        if (death) K(s.ball([0.014, 0.015, 0.008], [ex, ey, ez], dark, 12));
        else {
          const big = child ? 1.3 : 1;
          K(s.ball([0.0115 * big, 0.0065 * big, 0.004], [ex, ey, ez], painting ? new THREE.MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.4 }) : cut, 12)).rotation.y = side * 0.4;
          K(s.ball([0.0045 * big, 0.0045 * big, 0.003], [ex, ey, ez + 0.003], painting ? new THREE.MeshStandardMaterial({ color: '#17161a', roughness: 0.3 }) : linden, 8));
          const slant = villain ? -0.5 : king ? 0.25 : 0.1;
          K(s.tube([[side * 0.006, ey + 0.016 - slant * 0.012, ez + 0.006], [ex, ey + 0.018, ez + 0.004], [side * rx * 0.8, ey + 0.016 + slant * 0.012, ez - 0.012]], villain || king ? 0.0048 : 0.003, painting ? new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.6 }) : linden));
          K(s.ball([child ? 0.02 : 0.014, child ? 0.018 : 0.012, 0.012], [side * rx * 0.55, hy - 0.02, hz + rz * 0.68], linden, 12));
          if (painting && child) K(s.ball([0.01, 0.008, 0.002], [side * rx * 0.58, hy - 0.02, hz + rz * 0.86], new THREE.MeshStandardMaterial({ color: '#e58f8a', roughness: 0.6 }), 8));
        }
        K(s.ball([0.006, 0.015, 0.01], [side * rx * 0.99, hy + 0.002, hz - 0.004], linden, 10));
      }
      void both;
    };

    K(s.box([0.14, 0.06, 0.175], [0, -0.08, 0.0175], linden));
    if (a.progress === 'pencil') K(s.box([0.14, 0.16, 0.175], [0, 0.03, 0.0175], sketch(false)));
    else if (a.progress === 'roughed') {
      K(s.box([0.14, 0.16, 0.085], [0, 0.03, -0.0275], linden));
      const lump = K(s.mesh(new THREE.SphereGeometry(1, 7, 5), facet, [0, hy, hz])); lump.scale.set(rx * 1.14, ry * 1.08, rz * 1.12); lump.rotation.y = 0.45;
      const nose = K(s.mesh(new THREE.ConeGeometry(0.024, 0.06, 4), facet, [0, hy - 0.004, hz + rz * 1.05])); nose.rotation.x = 0.6;
      K(s.mesh(new THREE.BoxGeometry(0.088, 0.016, 0.022), facet, [0, hy + 0.026, hz + rz * 0.95]));
      K(s.mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), facet, [0, hy - ry * 0.82, hz + rz * 0.62])).rotation.x = 0.3;
      K(s.rod([0, hy + ry * 0.9, hz + rz * 0.75], [0, hy + 0.036, hz + rz * 1.14], 0.0012, dark));
      K(s.cylinder(0.034, 0.04, 0.05, [0, -0.04, hz - 0.006], facet, 7));
    } else if (a.progress === 'half') {
      K(s.box([0.07, 0.16, 0.175], [0.035, 0.03, 0.0175], sketch(true)));
      K(s.box([0.07, 0.16, 0.07], [-0.035, 0.03, -0.035], linden));
      features([-1]);
    } else {
      K(s.box([0.14, 0.16, a.progress === 'painting' ? 0.04 : 0.07], [0, 0.03, a.progress === 'painting' ? -0.05 : -0.035], linden));
      features([-1, 1]);
    }
    if (a.story === 'split') {
      const lean = (random() - 0.5) * 0.07;
      const crack = K(s.box([0.0026, 0.163, 0.178], [0.012, 0.03, 0.0175], new THREE.MeshStandardMaterial({ color: '#2a1f14', roughness: 1 }))); crack.rotation.z = lean;
      const shard = s.mesh(new THREE.ConeGeometry(0.035, 0.11, 3), facet, [-0.2, T + 0.02, 0.2]); shard.rotation.set(1.5, 0.4, 0.3);
    }
    if (a.story === 'draped') {
      const linenMat = new THREE.MeshStandardMaterial({ color: tone('#c9c2ad', 0.5), roughness: 1, side: THREE.DoubleSide });
      const cloth = K(s.mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), linenMat, [0, 0.07, -0.022])); cloth.scale.set(0.08, 0.045, 0.085); cloth.rotation.x = -0.3;
      for (let i = 0; i < 9; i++) { const t = Math.PI * (0.55 + i / 8 * 0.9) + Math.PI / 2; const fold = K(s.cylinder(0.02, 0.012 + random() * 0.012, 0.09 + random() * 0.05, [Math.cos(t) * 0.076, 0.02 - 0.0, -0.005 + Math.sin(t) * 0.09 + 0.01], linenMat, 7)); fold.position.y = 0.05; fold.position.z -= 0.012; }
    }

    // Shavings.
    const curls = { tonight: 70, draped: 36, abandoned: 5, split: 28 }[a.story] * mix(0.6, 1.3, mood.density);
    if (a.progress !== 'pencil' || a.story !== 'tonight') {
      const n = Math.round(a.progress === 'pencil' ? curls * 0.15 : curls);
      const curl = new THREE.TorusGeometry(0.011, 0.0032, 4, 9, 4.6);
      const mesh = new THREE.InstancedMesh(curl, new THREE.MeshStandardMaterial({ color: tone('#f1e2bb'), roughness: 0.8 }), Math.max(n, 1));
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < Math.max(n, 1); i++) {
        const onBench = true;
        const t = random() * 6.3, d = onBench ? 0.05 + random() * 0.2 : 0.3 + random() * 0.2;
        let x = Math.cos(t) * d * 1.2, z = Math.sin(t) * d * 0.7 + (onBench ? 0.07 : 0.1);
        if (onBench) { x = Math.max(-0.32, Math.min(0.36, x)); z = Math.max(-0.17, Math.min(0.25, z)); if (Math.abs(x - 0.04) < 0.23 && Math.abs(z) < 0.09) z = 0.1 + random() * 0.14; }
        else if (Math.abs(x - 0.03) < 0.35 && Math.abs(z - 0.02) < 0.22) z = 0.24 + random() * 0.18;
        const size = 0.6 + random() * 0.9;
        e.set(random() * 1.2 - 0.6, random() * 6.3, random() * 1.2 + 1.0);
        m.compose(new THREE.Vector3(x, (onBench ? T : 0) + 0.008 * size, z), q.setFromEuler(e), new THREE.Vector3(size, size, size * 0.6));
        mesh.setMatrixAt(i, m);
      }
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }

    // Tools.
    const handle = s.material(tone('#7a4a26', 0.5), { roughness: 0.55 }), brass = s.material('#c9a23a', { metalness: 0.8, roughness: 0.3 });
    const gouge = (from: P3, dir: THREE.Vector3, width = 0.008) => {
      const at = (d: number): P3 => [from[0] + dir.x * d, from[1] + dir.y * d, from[2] + dir.z * d];
      s.rod(at(0), at(0.1), 0.0115, handle, 0.009);
      s.rod(at(0.1), at(0.115), 0.0095, brass);
      s.rod(at(0.115), at(0.2), 0.0035, steel);
      s.rod(at(0.2), at(0.235), 0.0035, steel, width);
    };
    if (a.tools === 'row') for (let i = 0; i < 4; i++) gouge([-0.31 + i * 0.032, T + 0.012, 0.23 - random() * 0.02], new THREE.Vector3((random() - 0.5) * 0.08, 0, -1).normalize(), 0.005 + i * 0.002);
    else if (a.tools === 'struck') {
      const tip = new THREE.Vector3(-0.0435, T + 0.22 + (a.progress === 'pencil' ? 0.16 : 0.123), a.progress === 'pencil' ? 0.087 : 0.109);
      const dir = new THREE.Vector3(0.25, -0.75, -0.35).normalize();
      const start = tip.clone().addScaledVector(dir, -0.225);
      gouge(start.toArray() as P3, dir);
      const mallet = new THREE.Group(); mallet.position.set(-0.24, T + 0.04, 0.16); mallet.rotation.set(Math.PI / 2, 0, 0.5 + random() * 0.6, 'ZYX'); s.root.add(mallet);
      mallet.add(s.lathe([[0.001, 0], [0.034, 0], [0.04, 0.01], [0.04, 0.085], [0.03, 0.1], [0.001, 0.1]], s.material(tone('#a8763f', 0.5), { roughness: 0.7 })));
      mallet.add(s.cylinder(0.013, 0.015, 0.12, [0, -0.06, 0], handle, 10));
    } else if (a.tools === 'knife') {
      s.rod([-0.24, T + 0.01, 0.14], [-0.16, T + 0.01, 0.17], 0.01, handle);
      const blade = s.box([0.07, 0.002, 0.014], [-0.125, T + 0.008, 0.183], steel); blade.rotation.y = -0.36;
      s.rod([-0.12, T + 0.005, 0.1], [-0.07, T + 0.005, 0.13], 0.0038, s.material('#d9b62e'), 0.0038);
      s.rod([-0.07, T + 0.005, 0.13], [-0.062, T + 0.005, 0.135], 0.0038, s.material('#2a2a2e'), 0.0005);
    }
    if (a.story === 'tonight') {
      const mx = 0.26, mz = 0.15;
      s.lathe([[0.001, 0], [0.032, 0], [0.036, 0.01], [0.036, 0.075], [0.032, 0.075], [0.03, 0.012]], new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d9a02e' : '#4f6f80', roughness: 0.35, side: THREE.DoubleSide }), [mx, T, mz]);
      s.cylinder(0.031, 0.031, 0.002, [mx, T + 0.062, mz], s.material('#5a3518', { roughness: 0.2 }), 16);
      const h = s.ring(0.02, 0.006, [mx + 0.04, T + 0.04, mz], s.material(mood.cheer > 0.5 ? '#d9a02e' : '#4f6f80', { roughness: 0.35 }), Math.PI); h.rotation.z = -Math.PI / 2;
    }
    if (old) {
      const web = new THREE.MeshStandardMaterial({ color: '#e9e6df', roughness: 1 });
      const anchors: P3[] = [[jawX + 0.215, T + 0.07 + hv[1] * 0.6, hv[2] * 0.6], [0.1, T + 0.37, 0.0], [0.1, T + 0.25, 0.14], [0.33, T, 0.15], [0.2, T + 0.03, -0.07]];
      for (let i = 0; i < anchors.length; i++) for (let j = i + 1; j < anchors.length; j++) if ((i + j) % 2 || i === 0) s.rod(anchors[i], anchors[j], 0.0007, web);
    }
    // Reference.
    if (a.reference === 'sketch' || a.reference === 'photo') {
      const photo = a.reference === 'photo';
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 160;
      const g = canvas.getContext('2d')!;
      g.fillStyle = photo ? '#e9dcc0' : '#f4f0e4'; g.fillRect(0, 0, 128, 160);
      if (photo) { g.fillStyle = '#b89a6c'; g.fillRect(10, 10, 108, 130); g.fillStyle = '#5a4126'; g.beginPath(); g.ellipse(64, 66, 26, 34, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(64, 150, 50, 48, 0, 0, 7); g.fill(); g.fillStyle = '#b89a6c'; g.fillRect(10, 140, 108, 20); g.fillStyle = '#e9dcc0'; g.fillRect(0, 140, 128, 20); }
      else { g.strokeStyle = '#33333a'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(64, 76, 36, 50, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(64, 20); g.lineTo(64, 136); g.moveTo(24, 70); g.lineTo(104, 70); g.stroke(); for (const k of [-1, 1]) { g.beginPath(); g.ellipse(64 + k * 16, 68, 8, 4, 0, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(64, 66); g.lineTo(56, 92); g.lineTo(70, 92); g.stroke(); g.beginPath(); g.moveTo(50, 106); g.quadraticCurveTo(64, villain ? 100 : 114, 78, 106); g.stroke(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const card = s.mesh(new THREE.PlaneGeometry(0.09, 0.1125), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide }), [-0.27, T + 0.16, -0.08]);
      card.rotation.set(-0.2, 0.5, (random() - 0.5) * 0.12, 'YXZ');
      s.rod([-0.27, T, -0.085], [-0.27, T + 0.13, -0.085], 0.004, handle);
      s.box([0.05, 0.015, 0.05], [-0.27, T + 0.0075, -0.085], handle);
    } else if (a.reference === 'sibling') {
      const px = -0.27, pz = -0.07, py = T + 0.17;
      s.rod([px, T, pz], [px, py - 0.03, pz], 0.006, handle);
      s.box([0.06, 0.016, 0.06], [px, T + 0.008, pz], handle);
      const skinMat = new THREE.MeshStandardMaterial({ color: death ? '#ece6d2' : '#f0c8a6', roughness: 0.45 });
      const g2 = new THREE.Group(); g2.position.set(px, py, pz); g2.rotation.y = 0.45; s.root.add(g2);
      const G = <O extends THREE.Object3D>(o: O) => { g2.add(o); return o; };
      G(s.ball([0.04, 0.05, 0.043], [0, 0.01, 0], skinMat, 18));
      G(s.cylinder(0.018, 0.02, 0.03, [0, -0.04, 0], skinMat, 10));
      const nose = G(s.cylinder(0.001, 0.009, villain ? 0.04 : 0.024, [0, 0.006, 0.047], skinMat, 8)); nose.rotation.x = 0.6;
      for (const side of [-1, 1]) { G(s.ball([0.008, 0.006, 0.003], [side * 0.016, 0.018, 0.038], new THREE.MeshStandardMaterial({ color: death ? '#17161a' : '#f7f4ec' }), 8)); if (!death) G(s.ball([0.0035, 0.0035, 0.002], [side * 0.016, 0.018, 0.041], new THREE.MeshStandardMaterial({ color: '#17161a' }), 6)); }
      G(s.box([0.022, 0.004, 0.003], [0, -0.014, 0.038], new THREE.MeshStandardMaterial({ color: death ? '#17161a' : '#b3242c' })));
      const hatC = king ? '#d9a936' : villain ? '#1c1b20' : child ? '#3f8fd0' : death ? '#1c1b20' : '#7a3a22';
      if (king) { G(s.cylinder(0.04, 0.034, 0.03, [0, 0.055, 0], s.material(hatC, { metalness: 0.7, roughness: 0.3 }), 12)); G(s.cylinder(0.016, 0.001, 0.05, [0, -0.045, 0.03], new THREE.MeshStandardMaterial({ color: '#f0ede4' }), 8)); }
      else if (villain || death) { G(s.cylinder(0.05, 0.05, 0.004, [0, 0.048, 0], s.material(hatC), 16)); G(s.cylinder(0.024, 0.03, 0.045, [0, 0.07, 0], s.material(hatC), 16)); }
      else G(s.ball([0.043, 0.03, 0.046], [0, 0.04, -0.008], s.material(hatC), 14));
    }

    s.root.rotation.y = (random() - 0.5) * 0.25;
    return s.finish();
  },
});
