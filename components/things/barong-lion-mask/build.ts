import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';
import { type Pt, g, horn, painted, shell, shellPoint, type ShellSpec } from './face';

export default defineThing({
  questions: {
    figure: choice('Which figure is it?', {
      ket: 'Barong Ket, the lion: a red face, round staring eyes, a broad grin and a black beard, wrapped in pale shaggy fur.',
      rangda: 'Rangda, the witch: a chalk-white face, long fangs, wild grey hair and a red tongue of flames lolling to the ground.',
      boar: 'Barong Bangkal, the boar: a black face with a long snout and upturned tusks.',
      tiger: 'Barong Macan, the tiger: orange with black stripes, round ears and whiskers.',
    }),
    jaw: choice('How is the jaw?', {
      open: 'Hanging open to show the red mouth and teeth.',
      shut: 'Clapped shut in a tight toothy grin.',
    }),
    gilding: score('How dense are the gilding and mirror chips?', ['Sparse: a village mask, mostly paint', 'Well gilded', 'Blazing: every inch gold leaf and glittering mirror']),
    offerings: choice('What offerings are set before it?', {
      none: 'None.',
      canang: 'Small square palm-leaf trays of flower petals.',
      tower: 'A tall cone of stacked fruit on a pedestal dish, with smoking incense sticks.',
    }),
    state: choice('What state is it in?', {
      dance: 'Dressed for the dance: frangipani flowers in the crown, red tassels and bells.',
      shrine: 'At rest in the temple between ceremonies, under a fringed ceremonial parasol.',
      stored: 'Stored: a black-and-white checked cloth draped over the crown, only the face showing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const fig = a.figure;
    const gilt = a.gilding;
    const faceColour = { ket: '#c3261f', rangda: '#ebe5d5', boar: '#2b2627', tiger: '#e07c1f' }[fig];
    const gold = s.material('#dba830', { metalness: mix(0.55, 0.85, gilt), roughness: mix(0.5, 0.25, gilt) });
    const goldHex = '#e2b23a';
    const ivory = s.material('#f1ead6', { roughness: 0.35 });
    const snout = fig === 'boar' ? 1 : 0;

    const head = new THREE.Group();
    const headY = 0.78;
    head.position.set(0, headY, 0.06);
    s.root.add(head);
    const add = <T extends THREE.Object3D>(o: T, to: THREE.Object3D = head) => { o.traverse((n) => { n.castShadow = n.receiveShadow = true; }); to.add(o); return o; };

    // Upper face.
    const lip = (u: number) => -0.42 + 0.14 * u * u;
    const spec: ShellSpec = {
      w: 0.44, h: 0.42, d: 0.2, round: 2.8, taper: 0.06, segU: 72, segV: 72,
      relief: (u, v) => {
        const au = Math.abs(u);
        return (0.32 + snout * 0.5) * g(u, 0, 0.42 - snout * 0.12) * g(v, -0.2, 0.34) + 0.26 * g(u, 0, 0.17) * g(v, -0.02, 0.13) + 0.12 * g(au, 0.2, 0.08) * g(v, -0.1, 0.08)
          + 0.3 * g(v, 0.5, 0.11) * g(au, 0.42, 0.3) + 0.16 * g(au, 0.72, 0.2) * g(v, -0.12, 0.25) - 0.1 * g(au, 0.42, 0.2) * g(v, 0.16, 0.14);
      },
      hole: (u, v) => v < lip(u),
    };
    const paint = (jawPiece: boolean) => painted(512, 512, (ctx, X, Y, W, H) => {
      ctx.fillStyle = faceColour; ctx.fillRect(0, 0, W, H);
      const line = fig === 'boar' ? goldHex : '#141012';
      const curl = (u: number, v: number, r: number, turn: number, colour: string, width: number) => {
        ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.beginPath();
        for (let k = 0; k <= 30; k++) { const t = k / 30, ang = t * 6 * turn + (turn > 0 ? 0 : Math.PI), rr = r * W * (1 - t * 0.85); const px = X(u) + Math.cos(ang) * rr, py = Y(v) + Math.sin(ang) * rr; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
        ctx.stroke();
      };
      if (fig === 'tiger') {
        ctx.fillStyle = '#18130f';
        for (const side of [-1, 1]) for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(X(side * 1), Y(0.8 - k * 0.32)); ctx.quadraticCurveTo(X(side * 0.7), Y(0.7 - k * 0.32), X(side * (0.45 + (k % 2) * 0.12)), Y(0.78 - k * 0.32)); ctx.quadraticCurveTo(X(side * 0.7), Y(0.6 - k * 0.32), X(side * 1), Y(0.66 - k * 0.32)); ctx.fill(); }
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(X(k * 0.14 - 0.04), Y(1)); ctx.lineTo(X(k * 0.14), Y(0.6)); ctx.lineTo(X(k * 0.14 + 0.04), Y(1)); ctx.fill(); }
        if (!jawPiece) { ctx.fillStyle = '#f3ead8'; ctx.beginPath(); ctx.ellipse(X(0), Y(-0.36), W * 0.2, H * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
      }
      if (jawPiece) {
        ctx.strokeStyle = goldHex; ctx.lineWidth = 16; ctx.beginPath();
        for (let i = 0; i <= 20; i++) { const u = i / 10 - 1, y = Y(0.3 + 0.2 * u * u - 0.06); if (i) ctx.lineTo(X(u), y); else ctx.moveTo(X(u), y); } ctx.stroke();
        for (let k = 0; k < 3 + gilt * 5; k++) curl((random() - 0.5) * 1.2, -0.1 - random() * 0.5, 0.05, k % 2 ? 1 : -1, goldHex, 5);
        return;
      }
      for (const side of [-1, 1]) {
        // Ringed eye surround and flaming brows.
        ctx.fillStyle = line; ctx.beginPath(); ctx.ellipse(X(side * 0.42), Y(0.17), W * 0.125, H * 0.115, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = goldHex; ctx.lineWidth = 9; ctx.stroke();
        for (let k = 0; k < 4; k++) curl(side * (0.2 + k * 0.17), 0.52 + Math.sin(k * 1.3) * 0.05 + k * 0.03, 0.05, side, goldHex, 9);
        curl(side * 0.3, -0.22, 0.07, -side, goldHex, 10);
        curl(side * 0.62, -0.2, 0.06, side, line, 7);
        for (let k = 0; k < gilt * 9; k++) curl(side * (0.1 + random() * 0.85), -0.35 + random() * 1.3, 0.025 + random() * 0.03, k % 2 ? 1 : -1, goldHex, 5);
        ctx.fillStyle = '#141012'; ctx.beginPath(); ctx.ellipse(X(side * 0.15), Y(-0.1), 14, 9, side * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = goldHex; ctx.beginPath(); ctx.arc(X(0), Y(0.42), 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = fig === 'ket' ? '#f5efe0' : '#c3261f'; ctx.beginPath(); ctx.arc(X(0), Y(0.42), 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = goldHex; ctx.lineWidth = 14; ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const u = i / 10 - 1, y = Y(lip(u) + 0.045); if (i) ctx.lineTo(X(u), y); else ctx.moveTo(X(u), y); } ctx.stroke();
      if (fig === 'boar') { ctx.fillStyle = '#d98a94'; ctx.beginPath(); ctx.ellipse(X(0), Y(-0.2), W * 0.085, H * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#141012'; for (const side of [-1, 1]) { ctx.beginPath(); ctx.ellipse(X(side * 0.07), Y(-0.2), 9, 14, 0, 0, Math.PI * 2); ctx.fill(); } }
      for (let i = 0; i < mood.wear * 30; i++) { ctx.fillStyle = `rgba(70,55,40,${0.15 + random() * 0.25})`; ctx.beginPath(); ctx.arc(random() * W, random() * H, 5 + random() * 22, 0, Math.PI * 2); ctx.fill(); }
    });
    const lacquer = { roughness: mix(0.3, 0.7, mood.wear), side: THREE.DoubleSide } as const;
    add(shell(spec, new THREE.MeshStandardMaterial({ map: paint(false), ...lacquer })));
    const on = (u: number, v: number, lift = 0): Pt => { const p = shellPoint(spec, u, v); return [p.x, p.y, p.z + lift]; };

    // Bulging eyes.
    for (const side of [-1, 1]) {
      const [x, y, z] = on(side * 0.42, 0.17);
      const r = fig === 'rangda' ? 0.05 : 0.043;
      add(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), ivory)).position.set(x, y, z - r * 0.25);
      add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 14, 10), s.material('#0f0d0e', { roughness: 0.2 }))).position.set(x - side * 0.004, y - 0.002, z + r * 0.48);
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.006, 6, 24), fig === 'rangda' ? s.material('#b3201c') : gold));
      rim.position.set(x, y, z - r * 0.1); rim.rotation.y = side * 0.35;
    }
    // Mouth interior, jaw, teeth and tusks.
    add(new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: '#8d1217', roughness: 0.6, emissive: '#5a0808', emissiveIntensity: 0.4 }))).scale.set(0.17, 0.07, 0.13 + snout * 0.06);
    head.children.at(-1)!.position.set(0, -0.12, 0.03);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.085, -0.01);
    head.add(jaw);
    const jawSpec: ShellSpec = { w: 0.41, h: 0.28, d: 0.2, round: 2.2, taper: 0.4, segU: 48, segV: 40, relief: (u, v) => (0.22 + snout * 0.45) * g(u, 0, 0.4) * g(v, 0.1, 0.4), hole: (u, v) => v > 0.3 + 0.2 * u * u };
    const jawShell = add(shell(jawSpec, new THREE.MeshStandardMaterial({ map: paint(true), ...lacquer })), jaw);
    jawShell.position.set(0, -0.052, 0.012);
    const toothGeo = new THREE.BoxGeometry(0.022, 0.03, 0.012);
    const teeth = (specOf: ShellSpec, edge: (u: number) => number, dir: number, to: THREE.Object3D, offset: Pt) => {
      for (let k = -5; k <= 5; k++) {
        const u = k * 0.105; if (Math.abs(k) === 4) continue;
        const p = shellPoint(specOf, u, edge(u));
        const tooth = add(new THREE.Mesh(toothGeo, ivory), to);
        tooth.position.set(p.x + offset[0], p.y + offset[1] + dir * 0.012, p.z + offset[2] - 0.006);
        tooth.rotation.y = -u * 0.9;
      }
    };
    teeth(spec, (u) => lip(u) + 0.01, -1, head, [0, 0, 0]);
    teeth(jawSpec, (u) => 0.28 + 0.2 * u * u, 1, jaw, [0, -0.052, 0.012]);
    const fang = fig === 'rangda' ? 0.15 : 0.075;
    for (const side of [-1, 1]) {
      const p = shellPoint(spec, side * 0.42, lip(0.42) + 0.02);
      add(horn([[p.x, p.y, p.z - 0.01], [p.x + side * 0.012, p.y - fang * 0.6, p.z + 0.012], [p.x + side * 0.03, p.y - fang, p.z + 0.004]], (t) => 0.014 * (1 - t) ** 0.7, ivory, { sides: 8, steps: 10 }));
      const q = shellPoint(jawSpec, side * 0.5, 0.33);
      const up = fig === 'boar' ? 0.15 : fig === 'rangda' ? 0.1 : 0.06;
      add(horn([[q.x, q.y - 0.06, q.z + 0.006], [q.x + side * 0.02, q.y - 0.06 + up * 0.6, q.z + 0.03], [q.x + side * 0.012, q.y - 0.06 + up, q.z + 0.02]], (t) => 0.015 * (1 - t) ** 0.7, ivory, { sides: 8, steps: 10 }), jaw);
    }
    // Beard, hair, tongue, ears.
    const hairSkin = new THREE.MeshStandardMaterial({ color: fig === 'rangda' ? '#b9b4a8' : '#17130f', roughness: 1 });
    if (fig !== 'rangda') {
      for (let k = 0; k < 16; k++) {
        const x = (random() - 0.5) * 0.2, len = (fig === 'ket' ? 0.3 : 0.14) * (0.7 + random() * 0.5);
        add(horn([[x, -0.17, 0.12 - Math.abs(x) * 0.4], [x * 1.2, -0.17 - len * 0.5, 0.14 - Math.abs(x) * 0.3], [x * 1.3 + (random() - 0.5) * 0.04, -0.17 - len, 0.1 + (random() - 0.5) * 0.04]], (t) => 0.014 * (1 - t * 0.85), hairSkin, { sides: 5, steps: 8 }), jaw);
      }
    } else {
      for (let k = 0; k < 34; k++) {
        const side = k % 2 ? 1 : -1, sx = side * (0.16 + random() * 0.14), len = 0.45 + random() * 0.3;
        add(horn([[sx, 0.2 - random() * 0.1, -0.02], [sx + side * 0.12, 0.05, 0.02 + random() * 0.06], [sx + side * (0.14 + random() * 0.1), -len * 0.6, 0.04 + random() * 0.08], [sx + side * (0.1 + random() * 0.14), -len, 0.02 + random() * 0.1]], (t) => 0.016 * (1 - t * 0.8), hairSkin, { sides: 5, steps: 12 }));
      }
      const tongueSkin = new THREE.MeshStandardMaterial({ roughness: 0.5, side: THREE.DoubleSide, map: painted(64, 256, (ctx, _X, _Y, W, H) => { ctx.fillStyle = '#c21d1d'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = goldHex; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(W * 0.5, k * 30); ctx.quadraticCurveTo(W * 0.9, k * 30 + 12, W * 0.5, k * 30 + 26); ctx.quadraticCurveTo(W * 0.1, k * 30 + 12, W * 0.5, k * 30); ctx.fill(); } }) });
      add(horn([[0, -0.03, 0.1], [0, -0.1, 0.2], [0.01, -0.3, 0.19], [-0.01, -0.48, 0.22], [0.01, -0.6, 0.2]], (t) => 0.05 * (1 - t * 0.5), tongueSkin, { sides: 10, steps: 22, squash: 0.2, side: [1, 0, 0] }), jaw);
    }
    if (fig === 'tiger' || fig === 'boar') for (const side of [-1, 1]) {
      const ear = add(new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: faceColour, roughness: 0.5 })));
      ear.scale.set(0.06, fig === 'boar' ? 0.09 : 0.06, 0.02); ear.position.set(side * 0.2, 0.2, 0.0); ear.rotation.z = -side * 0.5;
    }
    if (fig === 'tiger') for (const side of [-1, 1]) for (let k = 0; k < 4; k++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.16, 4), ivory)).position.set(side * 0.19, -0.05 - k * 0.012, 0.16), (head.children.at(-1)!.rotation.z = Math.PI / 2 + side * (k - 1.5) * 0.14);

    // The gilded leather crown: a spiked fan behind the head, ear wings and a brow crest.
    const leather = (R: number) => {
      const tex = painted(512, 512, (ctx, _X, _Y, W, H) => {
        ctx.fillStyle = mood.wear > 0.6 ? '#b58f38' : '#dcaa2e'; ctx.fillRect(0, 0, W, H);
        const cut = fig === 'rangda' ? '#8d1217' : '#5c1014';
        for (let ring = 1; ring < 7; ring++) {
          const rr = ring * W / 14, n = Math.round(ring * 7 * mix(0.6, 1.2, gilt));
          for (let k = 0; k < n; k++) { const ang = k / n * Math.PI * 2 + ring * 0.3; ctx.fillStyle = (ring + k) % 3 ? cut : '#1c6b4a'; ctx.save(); ctx.translate(W / 2 + Math.cos(ang) * rr, H / 2 + Math.sin(ang) * rr); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(0, -9, 12, 0); ctx.quadraticCurveTo(0, 9, -8, 0); ctx.fill(); ctx.restore(); }
          ctx.strokeStyle = '#f3d77a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(W / 2, H / 2, rr + W / 28, 0, Math.PI * 2); ctx.stroke();
        }
      });
      tex.repeat.set(0.5 / R, 0.5 / R); tex.offset.set(0.5, 0.5);
      return new THREE.MeshStandardMaterial({ map: tex, metalness: mix(0.35, 0.75, gilt), roughness: mix(0.6, 0.3, gilt), side: THREE.DoubleSide });
    };
    const fan = (R: number, from: number, to: number, spikes: number, inner = 0) => {
      const shape = new THREE.Shape();
      const n = spikes * 8;
      for (let i = 0; i <= n; i++) { const t = i / n, ang = from + (to - from) * t, r = R * (0.8 + 0.2 * Math.abs(Math.sin(t * Math.PI * spikes)) ** 0.5); if (i) shape.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); else shape.moveTo(Math.cos(ang) * r, Math.sin(ang) * r); }
      shape.lineTo(Math.cos(to) * inner, Math.sin(to) * inner); shape.lineTo(Math.cos(from) * inner, Math.sin(from) * inner);
      return new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), leather(R));
    };
    const size = mix(0.88, 1.08, gilt) * (fig === 'rangda' ? 0.8 : 1);
    const crown = new THREE.Group();
    add(crown);
    const halo = add(fan(0.5 * size, -0.25, Math.PI + 0.25, fig === 'rangda' ? 13 : 9), crown);
    halo.position.set(0, 0.04, -0.07);
    for (const side of [-1, 1]) {
      const wing = add(fan(0.24 * size, -1.1, 1.1, 5), crown);
      wing.position.set(side * 0.2, 0.06, 0.0); wing.rotation.y = side > 0 ? -0.5 : Math.PI + 0.5;
    }
    const crest = add(fan(0.2 * size, 0.25, Math.PI - 0.25, 5), crown);
    crest.position.set(0, 0.17, 0.06); crest.rotation.x = -0.25;
    // Mirror chips catch the light.
    const chips = Math.round(mix(14, 150, gilt));
    const chipMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 8), new THREE.MeshStandardMaterial({ color: '#f4f8ff', metalness: 0.9, roughness: 0.08, emissive: '#cfe6ff', emissiveIntensity: mix(0.25, 0.7, mood.cheer) }), chips);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    for (let i = 0; i < chips; i++) {
      const ang = -0.2 + random() * (Math.PI + 0.4), r = (0.26 + random() * 0.17) * size;
      m4.compose(new THREE.Vector3(Math.cos(ang) * r, 0.04 + Math.sin(ang) * r, -0.058), q4, new THREE.Vector3(1, 1, 1));
      chipMesh.setMatrixAt(i, m4);
    }
    add(chipMesh, crown);

    // Shaggy coat behind the head, over the carrying frame.
    const bamboo = s.material('#b99a55', { roughness: 0.6 });
    for (const x of [-0.26, 0.26]) for (const z of [-0.3, 0.0]) s.rod([x * 1.25, 0, z < -0.1 ? -0.42 : 0.08], [x * 0.7, 0.62, -0.17], 0.018, bamboo);
    s.rod([-0.3, 0.62, -0.17], [0.3, 0.62, -0.17], 0.02, bamboo);
    s.rod([0, 0.62, -0.17], [0, headY, -0.02], 0.02, bamboo);
    s.rod([-0.32, 0.2, 0.01], [0.32, 0.2, 0.01], 0.014, bamboo);
    if (fig !== 'rangda') {
      const furColour = { ket: '#e6dcc0', boar: '#2e2a2a', tiger: '#e2a04a' }[fig];
      const fur = painted(256, 256, (ctx, _X, _Y, W, H) => {
        ctx.fillStyle = furColour; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i < 500; i++) { ctx.strokeStyle = `rgba(${random() < 0.5 ? '60,45,30' : '255,250,235'},${0.12 + random() * 0.25})`; ctx.lineWidth = 1 + random() * 2; const x = random() * W, y = random() * H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (random() - 0.5) * 8, y + 20 + random() * 40); ctx.stroke(); }
        if (fig === 'tiger') { ctx.fillStyle = '#18130f'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.ellipse(random() * W, k * 30, 40 + random() * 30, 7, (random() - 0.5) * 0.4, 0, Math.PI * 2); ctx.fill(); } }
      });
      const coat = s.mesh(new THREE.LatheGeometry([[0.16, headY + 0.1], [0.3, headY - 0.1], [0.37, 0.45], [0.4, 0.14], [0.36, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 36, 1.15, Math.PI * 2 - 2.3), new THREE.MeshStandardMaterial({ map: fur, roughness: 1, side: THREE.DoubleSide }), [0, 0, -0.12]);
      const pos = coat.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), k = 1 + 0.05 * Math.sin(Math.atan2(z, x) * 14 + pos.getY(i) * 9); pos.setX(i, x * k); pos.setZ(i, z * k); }
      coat.geometry.computeVertexNormals();
    }

    if (a.state === 'dance') {
      const petal = s.material('#fbf6e4', { roughness: 0.6 }), heart = s.material('#f2c230', { roughness: 0.6 });
      for (let k = 0; k < 9; k++) {
        const ang = 0.4 + k / 8 * (Math.PI - 0.8), r = 0.33 * size;
        const fx = Math.cos(ang) * r, fy = 0.04 + Math.sin(ang) * r;
        for (let pIdx = 0; pIdx < 5; pIdx++) { const pa = pIdx / 5 * Math.PI * 2; const pm = add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), petal), crown); pm.scale.z = 0.4; pm.position.set(fx + Math.cos(pa) * 0.018, fy + Math.sin(pa) * 0.018, -0.05); }
        add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), heart), crown).position.set(fx, fy, -0.044);
      }
      const tassel = s.material('#c61f2b', { roughness: 0.9 });
      for (const side of [-1, 1]) { add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), tassel)).position.set(side * 0.27, -0.06, 0.06); add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), tassel)).position.set(side * 0.27, -0.14, 0.06); add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), gold)).position.set(side * 0.27, -0.21, 0.06); }
    } else if (a.state === 'shrine') {
      const px = -0.5, top = 1.52;
      s.rod([px, 0, -0.3], [px, top, -0.3], 0.015, s.material('#7d1a1a', { roughness: 0.5 }));
      const canopy = s.mesh(new THREE.ConeGeometry(0.36, 0.2, 20, 1, true), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#f0c12c' : '#ece6d4', roughness: 0.7, side: THREE.DoubleSide }), [px, top - 0.08, -0.3]);
      canopy.rotation.y = random();
      s.mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.09, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#c61f2b', roughness: 0.9, side: THREE.DoubleSide }), [px, top - 0.22, -0.3]);
      s.ball([0.02, 0.04, 0.02], [px, top + 0.04, -0.3], gold, 10);
      s.mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: '#f1ecda', roughness: 0.9, side: THREE.DoubleSide }), [0, 0.3, -0.13]).scale.z = 0.8;
    } else {
      const checks = painted(256, 256, (ctx, _X, _Y, W, H) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 2 ? '#1b1a1c' : (i % 2 ? '#e9e6dc' : '#9a9892'); ctx.fillRect(i * W / 8, j * H / 8, W / 8, H / 8); } });
      checks.wrapS = checks.wrapT = THREE.RepeatWrapping; checks.repeat.set(4, 2);
      const geometry = new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.62);
      const pos = geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ang = Math.atan2(z, x), low = Math.max(0, 0.6 - y); const k = 1 + 0.07 * Math.sin(ang * 11) * low; pos.setXYZ(i, x * k, y - low * (z > 0 ? -0.25 : 0.5), z * k); }
      geometry.computeVertexNormals();
      const cloth = add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: checks, roughness: 0.9, side: THREE.DoubleSide })), crown);
      cloth.scale.set(0.5 * size, 0.34 * size, 0.15); cloth.position.set(0, 0.26, -0.06);
    }

    if (a.offerings === 'canang') {
      const leaf = s.material('#8fae4a', { roughness: 0.8 });
      const petals = ['#f3f0e6', '#d6243a', '#f0c22e', '#e9728f', '#7a4bb0'];
      const n = 2 + Math.round(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * 0.17 + (random() - 0.5) * 0.04, z = 0.42 + (random() - 0.5) * 0.08;
        const tray = s.box([0.11, 0.012, 0.11], [x, 0.006, z], leaf); tray.rotation.y = random();
        for (let k = 0; k < 14; k++) s.ball([0.012, 0.006, 0.012], [x + (random() - 0.5) * 0.07, 0.017, z + (random() - 0.5) * 0.07], s.material(petals[Math.floor(k / 3.5) % 5]), 6);
      }
    } else if (a.offerings === 'tower') {
      const x = 0.34, z = 0.42;
      s.lathe([[0, 0], [0.09, 0], [0.03, 0.03], [0.03, 0.1], [0.13, 0.13], [0.13, 0.14], [0, 0.14]], s.material('#6a2a1a', { roughness: 0.4 }), [x, 0, z]);
      const fruit = ['#d6342a', '#f0a22e', '#e9d23c', '#7fb23a', '#f3ead2'];
      let layer = 0;
      for (let rr = 0.1; rr > 0.02; rr -= 0.02, layer++) { const count = Math.max(1, Math.round(rr / 0.012)); for (let k = 0; k < count; k++) { const ang = k / count * Math.PI * 2 + layer; s.ball([0.026, 0.026, 0.026], [x + Math.cos(ang) * rr, 0.16 + layer * 0.042, z + Math.sin(ang) * rr], s.material(fruit[(k + layer) % 5], { roughness: 0.5 }), 8); } }
      s.mesh(new THREE.ConeGeometry(0.04, 0.09, 8), s.material('#8fae4a'), [x, 0.16 + layer * 0.042 + 0.03, z]);
      for (let k = 0; k < 3; k++) { const ix = -0.3 + k * 0.04, iz = 0.42 + k * 0.02; s.rod([ix, 0, iz], [ix + 0.02, 0.2, iz - 0.02], 0.0025, s.material('#8a5a3a')); s.ball([0.005, 0.005, 0.005], [ix + 0.02, 0.2, iz - 0.02], new THREE.MeshStandardMaterial({ color: '#ff7b2e', emissive: '#ff5a1e', emissiveIntensity: 1.5 }), 6); }
    }

    const open = a.jaw === 'open';
    const energy = mood.energy;
    jaw.rotation.x = open ? 0.42 : 0.03;
    const phase = random() * 6;
    return s.finish({
      update: (_dt, time) => {
        const beat = Math.max(0, Math.sin(time * mix(1.2, 5, energy) + phase)) ** 6 * energy;
        jaw.rotation.x = open ? 0.42 - 0.38 * beat : 0.03 + 0.3 * beat;
      },
    });
  },
});
