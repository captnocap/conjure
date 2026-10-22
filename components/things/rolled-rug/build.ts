import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const PALETTES: Record<string, string[]> = {
  madder: ['#8e2420', '#1f2f55', '#e6d6b0', '#c88a3a', '#3a1512'],
  rose: ['#c79a92', '#7f93a3', '#efe5d2', '#b9a37a', '#6b5650'],
  seventies: ['#c9862a', '#1f6f6a', '#f0e2bd', '#8a3b1c', '#3d2a1a'],
  mono: ['#ece5d3', '#1d1b1a', '#d8cfb8', '#6f685c', '#2a2826'],
  bright: ['#d8362f', '#1f77c9', '#f6d23c', '#2c9a57', '#7c3aa8'],
};

export default defineThing({
  questions: {
    pattern: choice('What kind of rug is it?', {
      persian: 'A Persian carpet: a central medallion in a dense field, with nested borders.',
      kilim: 'A flat-woven kilim in bands of zigzags and stepped diamonds.',
      shag: 'A deep plain shag pile, thick and lumpy when rolled.',
      rag: 'A homemade rag rug of mismatched woven stripes.',
      berber: 'A pale Moroccan wool rug crossed by a loose dark diamond lattice.',
      playmat: "A child's play rug printed with roads, houses and a pond.",
    }),
    colours: choice('What are its colours?', {
      madder: 'Deep madder red, indigo and cream: old and serious.',
      rose: 'Sun-faded rose, grey-blue and sand.',
      seventies: 'Mustard, teal and rust: a 1970s living room.',
      mono: 'Cream and near-black.',
      bright: 'Loud primary colours.',
    }),
    pose: choice('How has it been left?', {
      corner: 'Propped diagonally in the corner of the room against the skirting board.',
      boxes: 'Leaning across a couple of moving boxes, waiting for the van.',
      floor: 'Lying on the floor, rolled tight with only its fringed end showing.',
      half: 'Half unrolled across the floor, either just arriving or not yet let go.',
      upright: 'Standing on end by itself, slightly slumped.',
    }),
    size: choice('How big is the rug?', {
      runner: 'A narrow hallway runner, a short slim roll.',
      room: 'A living-room rug, a roll as long as a person is tall.',
      grand: 'A huge heavy carpet that takes two people to carry.',
    }),
    tie: choice('What holds the roll together?', {
      string: 'Two loops of white string with bows.',
      tape: 'Bands of brown parcel tape.',
      belts: 'Old leather belts and a necktie, improvised.',
      loose: 'Nothing: it is starting to unroll itself.',
    }),
    tag: choice('What does the paper tag tied to it say, if there is one?', {
      none: 'There is no tag.',
      free: 'FREE: left for whoever wants it.',
      keep: 'KEEP: it is coming to the new place.',
      mums: "MUM'S: it belonged to a parent.",
      skip: 'SKIP: bound for the dump.',
      price: 'A price, for the house clearance sale.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.colours];
    const pick = () => pal[Math.floor(random() * pal.length)];
    const W = { runner: 0.75, room: 1.6, grand: 2.2 }[a.size]; // roll length = rug width
    const L = { runner: 2.6, room: 2.4, grand: 3.4 }[a.size];
    const thick = a.pattern === 'shag' ? 0.034 : a.pattern === 'kilim' || a.pattern === 'rag' ? 0.008 : 0.013;
    const fringed = a.pattern === 'persian' || a.pattern === 'kilim' || a.pattern === 'rag' || a.pattern === 'berber';

    // --- paint the rug: canvas x runs along its length, y across its width
    const CW = 768, CH = Math.round(768 * W / L);
    const paint = (back: boolean) => {
      const canvas = document.createElement('canvas'); canvas.width = CW; canvas.height = CH;
      const c: Ctx = canvas.getContext('2d')!;
      const diamond = (x: number, y: number, rx: number, ry: number, fill: string) => { c.fillStyle = fill; c.beginPath(); c.moveTo(x - rx, y); c.lineTo(x, y - ry); c.lineTo(x + rx, y); c.lineTo(x, y + ry); c.closePath(); c.fill(); };
      if (a.pattern === 'persian') {
        c.fillStyle = pal[1]; c.fillRect(0, 0, CW, CH);
        const b = CH * 0.045;
        [[1, pal[2]], [2.2, pal[0]], [4.6, pal[3]], [5.4, pal[0]]].forEach(([k, col]) => { c.fillStyle = col as string; c.fillRect(b * (k as number), b * (k as number), CW - 2 * b * (k as number), CH - 2 * b * (k as number)); });
        for (let x = b * 3.4; x < CW - b * 3; x += b * 1.6) for (const y of [b * 3.4, CH - b * 3.4]) diamond(x, y, b * 0.6, b * 0.6, pal[1]);
        for (let y = b * 3.4; y < CH - b * 3; y += b * 1.6) for (const x of [b * 3.4, CW - b * 3.4]) diamond(x, y, b * 0.6, b * 0.6, pal[1]);
        for (let i = 0; i < 260; i++) { const x = b * 6 + random() * (CW - b * 12), y = b * 6 + random() * (CH - b * 12); diamond(x, y, 4 + random() * 4, 4 + random() * 4, i % 3 ? pal[2] : pal[3]); }
        for (const [k, col] of [[1, pal[1]], [0.8, pal[2]], [0.6, pal[0]], [0.36, pal[3]], [0.16, pal[1]]] as [number, string][]) diamond(CW / 2, CH / 2, CW * 0.2 * k, CH * 0.36 * k, col);
        for (const sx of [-1, 1]) { diamond(CW / 2 + sx * CW * 0.25, CH / 2, CW * 0.035, CH * 0.09, pal[2]); for (const sy of [-1, 1]) diamond(CW / 2 + sx * (CW / 2 - b * 5.4), CH / 2 + sy * (CH / 2 - b * 5.4), CW * 0.1, CH * 0.22, pal[1]); }
      } else if (a.pattern === 'kilim') {
        let x = 0, i = 0;
        while (x < CW) {
          const w = CW * (0.05 + random() * 0.09), col = pal[i % 4], next = pal[(i + 1 + Math.floor(random() * 2)) % 5];
          c.fillStyle = col; c.fillRect(x, 0, w + 1, CH);
          const n = Math.max(3, Math.round(CH / w / (i % 2 ? 1 : 0.6)));
          if (i % 3 === 0) for (let k = 0; k < n; k++) diamond(x + w / 2, (k + 0.5) * CH / n, w * 0.42, CH / n * 0.42, next);
          else if (i % 3 === 1) { c.strokeStyle = next; c.lineWidth = w * 0.18; c.beginPath(); for (let k = 0; k <= n * 2; k++) c.lineTo(x + w * (k % 2 ? 0.78 : 0.22), k * CH / n / 2); c.stroke(); }
          else { c.fillStyle = next; c.fillRect(x + w * 0.4, 0, w * 0.2, CH); }
          x += w; i++;
        }
      } else if (a.pattern === 'shag') {
        c.fillStyle = pal[0]; c.fillRect(0, 0, CW, CH);
        for (let i = 0; i < 5000; i++) { c.strokeStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.05 + random() * 0.12})`; c.lineWidth = 2; const x = random() * CW, y = random() * CH; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (random() - 0.5) * 14, y + (random() - 0.5) * 14); c.stroke(); }
      } else if (a.pattern === 'rag') {
        const cols = [...pal, '#d9d2c0', '#777', '#b9896b'];
        let x = 0;
        while (x < CW) { const w = 4 + random() * 22; c.fillStyle = cols[Math.floor(random() * cols.length)]; c.fillRect(x, 0, w + 1, CH); x += w; }
        for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '255,255,255' : '0,0,0'},0.16)`; c.fillRect(random() * CW, random() * CH, 2, 5 + random() * 8); }
      } else if (a.pattern === 'berber') {
        c.fillStyle = '#ece4d0'; c.fillRect(0, 0, CW, CH);
        c.strokeStyle = pal[a.colours === 'mono' ? 1 : 0]; c.lineWidth = CH * 0.022; c.lineJoin = 'round';
        const step = CH * 0.42;
        for (const dir of [1, -1]) for (let k = -6; k < 12; k++) { c.beginPath(); for (let y = 0; y <= CH; y += CH / 8) c.lineTo(k * step + dir * y * 0.8 + (random() - 0.5) * 9 + (dir < 0 ? step * 2 : 0), y); c.stroke(); }
        for (let i = 0; i < 9; i++) diamond(random() * CW, random() * CH, 9, 12, pal[(i % 3) + 1]);
      } else {
        c.fillStyle = '#5fa052'; c.fillRect(0, 0, CW, CH);
        c.fillStyle = '#3f86c9'; c.beginPath(); c.ellipse(CW * 0.72, CH * 0.3, CW * 0.09, CH * 0.14, 0.3, 0, 7); c.fill();
        c.strokeStyle = '#55595e'; c.lineWidth = CH * 0.11; c.lineJoin = 'round';
        c.beginPath(); c.roundRect(CW * 0.08, CH * 0.14, CW * 0.84, CH * 0.72, CH * 0.2); c.moveTo(CW * 0.45, CH * 0.14); c.lineTo(CW * 0.45, CH * 0.86); c.moveTo(CW * 0.08, CH * 0.52); c.lineTo(CW * 0.45, CH * 0.52); c.stroke();
        c.strokeStyle = '#f3f0e2'; c.lineWidth = CH * 0.012; c.setLineDash([CH * 0.05, CH * 0.05]);
        c.beginPath(); c.roundRect(CW * 0.08, CH * 0.14, CW * 0.84, CH * 0.72, CH * 0.2); c.moveTo(CW * 0.45, CH * 0.14); c.lineTo(CW * 0.45, CH * 0.86); c.stroke(); c.setLineDash([]);
        for (let i = 0; i < 12; i++) { const x = CW * (0.13 + random() * 0.74), y = CH * (0.24 + random() * 0.52); c.fillStyle = ['#d8362f', '#f6d23c', '#f2efe6', '#1f77c9'][i % 4]; c.fillRect(x, y, CW * 0.04, CH * 0.08); c.fillStyle = '#7a3b22'; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + CW * 0.02, y - CH * 0.05); c.lineTo(x + CW * 0.04 + 3, y); c.fill(); }
        c.strokeStyle = '#e8c53a'; c.lineWidth = CH * 0.03; c.strokeRect(CH * 0.015, CH * 0.015, CW - CH * 0.03, CH - CH * 0.03);
      }
      // weave, fade and dirt
      c.fillStyle = 'rgba(0,0,0,0.07)'; for (let y = 0; y < CH; y += 4) c.fillRect(0, y, CW, 1);
      if (back) {
        c.fillStyle = a.pattern === 'shag' || a.pattern === 'playmat' ? 'rgba(196,182,150,0.93)' : 'rgba(210,198,170,0.42)'; c.fillRect(0, 0, CW, CH);
        c.fillStyle = 'rgba(90,70,40,0.16)'; for (let x = 0; x < CW; x += 5) c.fillRect(x, 0, 1.5, CH); for (let y = 0; y < CH; y += 5) c.fillRect(0, y, CW, 1.5);
      } else { c.fillStyle = `rgba(190,180,160,${mood.wear * 0.3})`; c.fillRect(0, 0, CW, CH); }
      for (let i = 0; i < mood.wear * 9; i++) { c.fillStyle = `rgba(60,45,30,${0.08 + random() * 0.1})`; c.beginPath(); c.ellipse(random() * CW, random() * CH, 15 + random() * 50, 10 + random() * 30, random() * 3, 0, 7); c.fill(); }
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };
    const faceTex = paint(false), backTex = paint(true);
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.95, side: THREE.DoubleSide });

    // --- the roll, lying along x on the floor; the loose tail runs out along +z
    const lying = a.pose === 'floor' || a.pose === 'half';
    const unrolled = a.pose === 'half' ? L * mix(0.4, 0.58, random()) : a.tie === 'loose' ? (lying ? 0.5 : 0.26) : lying ? 0.2 : 0.11;
    const rolledLen = L - unrolled;
    const r = Math.sqrt(rolledLen * thick / Math.PI * 1.25 + 0.03 * 0.03);
    const roll = new THREE.Group();
    const lump = a.pattern === 'shag' ? 0.1 : 0.035;
    const geo = new THREE.CylinderGeometry(r, r, W, 40, 14);
    const pos = geo.attributes.position;
    const phase = random() * 9;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ang = Math.atan2(z, x);
      const k = 1 + lump * (Math.sin(ang * 3 + y * 5 + phase) * 0.5 + Math.sin(y * 13 + phase * 2 + ang) * 0.5) + (Math.abs(y) / W) * lump * 1.5;
      pos.setXYZ(i, x * k, y, z * k);
    }
    geo.computeVertexNormals(); geo.rotateZ(Math.PI / 2);
    const wrap = backTex.clone(); wrap.needsUpdate = true; wrap.repeat.set((2 * Math.PI * r) / L, 1); wrap.offset.x = random();
    const body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.97 }));
    body.position.y = r; body.castShadow = body.receiveShadow = true; roll.add(body);
    // spiral ends
    const spiral = (() => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
      const c = canvas.getContext('2d')!; c.fillStyle = '#c9bc9c'; c.fillRect(0, 0, 128, 128);
      const turns = Math.max(3, Math.round(r / thick * 0.8));
      c.lineWidth = 60 / turns * 0.55; c.strokeStyle = pal[0]; c.beginPath();
      for (let t = 0; t < turns * 6.283; t += 0.1) { const rr = 6 + (t / (turns * 6.283)) * 56; c.lineTo(64 + Math.cos(t) * rr, 64 + Math.sin(t) * rr); }
      c.stroke(); c.fillStyle = '#2a2018'; c.beginPath(); c.arc(64, 64, 6, 0, 7); c.fill();
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
    })();
    const capMat = new THREE.MeshStandardMaterial({ map: spiral, roughness: 0.95 });
    for (const sign of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(r * (1 + lump * 0.75), 28), capMat); cap.rotation.y = sign * Math.PI / 2; cap.position.set(sign * (W / 2 + 0.002), r, 0); roll.add(cap); }

    // the loose tail: pattern side up, with the fringe at its end
    const tail = new THREE.Group();
    const tailGeo = new THREE.PlaneGeometry(W, unrolled, 1, 8);
    tailGeo.rotateX(-Math.PI / 2); tailGeo.translate(0, 0, unrolled / 2);
    const tp = tailGeo.attributes.position, tuv = tailGeo.attributes.uv;
    for (let i = 0; i < tp.count; i++) {
      const z = tp.getZ(i), f = z / unrolled;
      tuv.setXY(i, 1 - f * (unrolled / L), tp.getX(i) / W + 0.5);
      tp.setY(i, thick + 0.009 + Math.sin(f * 9 + phase) * 0.006 * (a.pose === 'half' ? 1 : 0.3) + (a.tie === 'loose' && a.pose !== 'half' ? Math.sin(f * 3.1) * 0.03 : 0));
    }
    tailGeo.computeVertexNormals();
    const tailMesh = new THREE.Mesh(tailGeo, faceMat); tailMesh.castShadow = tailMesh.receiveShadow = true; tail.add(tailMesh);
    const under = new THREE.Mesh(new THREE.BoxGeometry(W * 0.998, thick * 0.9, unrolled), new THREE.MeshStandardMaterial({ map: backTex, roughness: 1 })); under.position.set(0, thick * 0.45, unrolled / 2); tail.add(under);
    if (fringed) {
      const n = Math.round(W / 0.022);
      const strands = new THREE.InstancedMesh(new THREE.BoxGeometry(0.007, 0.004, 1), new THREE.MeshStandardMaterial({ color: a.pattern === 'rag' ? '#cfc7b2' : '#e9e1cb', roughness: 1 }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < n; i++) {
        const len = 0.06 + random() * 0.035; e.set(0, (random() - 0.5) * 0.7, 0); q.setFromEuler(e);
        m.compose(new THREE.Vector3(-W / 2 + (i + 0.5) * W / n, thick * 0.6, unrolled + len / 2 - 0.005), q, new THREE.Vector3(1, 1, len)); strands.setMatrixAt(i, m);
      }
      strands.castShadow = true; tail.add(strands);
    }
    roll.add(tail);

    // ties
    const tiePts = a.size === 'runner' ? [-0.2, 0.2] : [-W * 0.3, W * 0.3];
    if (a.tie !== 'loose') tiePts.forEach((x, i) => {
      const col = a.tie === 'string' ? '#f1ecdf' : a.tie === 'tape' ? '#8a5a2b' : i ? '#2b2420' : mood.cheer > 0.5 ? '#b3262b' : '#5a3a22';
      const mat = s.material(col, { roughness: a.tie === 'tape' ? 0.4 : 0.8 });
      const tubeR = a.tie === 'string' ? 0.005 : 0.004;
      const band = new THREE.Mesh(new THREE.TorusGeometry(r * (1 + lump * 0.4) + tubeR, tubeR, 6, 36), mat);
      band.rotation.y = Math.PI / 2; band.position.set(x + (random() - 0.5) * 0.04, r, 0); band.scale.z = a.tie === 'string' ? 1 : a.tie === 'tape' ? 12 : 8; band.castShadow = true; roll.add(band);
      if (a.tie === 'string') for (const side of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 5, 14), mat); loop.position.set(band.position.x + side * 0.024, r * 2 + 0.012, 0.01); loop.rotation.x = -1.2; loop.scale.x = 1.4; roll.add(loop); }
      if (a.tie === 'belts') { const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.05), s.material('#c9b25a', { metalness: 0.8, roughness: 0.3 })); buckle.position.set(band.position.x, r * 2 + 0.01, 0.03); roll.add(buckle); }
    });
    // paper tag
    if (a.tag !== 'none') {
      const text = { free: 'FREE', keep: 'KEEP', mums: "MUM'S", skip: 'SKIP', price: ['£15', '£20', '£5', '£40'][Math.floor(random() * 4)] }[a.tag];
      const tag = s.label(text, 0.24, 0.13, [0, 0, 0], a.tag === 'skip' ? '#a3211c' : '#1d1d1d', '#e9dfc2');
      const holder = new THREE.Group(); holder.add(tag); holder.position.set(tiePts[1] - 0.2, r, 0); roll.add(holder);
      if (lying) { holder.rotation.x = -0.9; tag.position.set(0, r + 0.075, 0); tag.rotation.z = (random() - 0.5) * 0.3; (tag.material as THREE.Material).side = THREE.FrontSide; const twin = tag.clone(); twin.rotation.y = Math.PI; holder.add(twin); }
      else { holder.rotation.x = 0.75; holder.position.x = W * 0.12; tag.position.set(0, 0, r * (1 + lump) + 0.02); tag.rotation.z = -Math.PI / 2 + (random() - 0.5) * 0.3; }
    }

    // --- pose it
    const pivot = new THREE.Group(); roll.position.y = -r; pivot.add(roll); s.root.add(pivot);
    const settle = () => { pivot.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(pivot); pivot.position.y -= b.min.y; pivot.updateMatrixWorld(true); return new THREE.Box3().setFromObject(pivot); };
    const X = new THREE.Vector3(1, 0, 0);
    const boardMat = (hex: string) => s.material(hex, { roughness: 0.9 });
    if (a.pose === 'floor' || a.pose === 'half') {
      pivot.rotation.y = (random() - 0.5) * 0.5; settle();
    } else if (a.pose === 'upright') {
      tail.rotation.x = -Math.PI / 2 + 0.25; tail.position.set(0, r, r);
      pivot.quaternion.setFromUnitVectors(X, new THREE.Vector3(0.07 + random() * 0.05, 1, 0.04).normalize()); settle();
    } else if (a.pose === 'corner') {
      tail.rotation.x = -Math.PI / 2 + 0.2; tail.position.set(0, r, r);
      const lean = mix(0.42, 0.6, random());
      pivot.quaternion.setFromUnitVectors(X, new THREE.Vector3(-Math.sin(lean) * 0.72, Math.cos(lean), -Math.sin(lean) * 0.69).normalize());
      const b = settle();
      const wallH = Math.min(1.15, b.max.y * 0.8), wallW = Math.max(0.9, (b.max.x - b.min.x) + 0.35), t = 0.07;
      const cx = b.min.x - 0.01, cz = b.min.z - 0.01;
      const wall = boardMat(mood.warmth > 0.5 ? '#efe6d0' : '#e9e9e2'), skirt = boardMat('#f4f1e8'), floor = boardMat('#a98258');
      s.box([wallW, wallH, t], [cx + wallW / 2, wallH / 2, cz - t / 2], wall);
      s.box([t, wallH, wallW + t], [cx - t / 2, wallH / 2, cz + wallW / 2 - t / 2], wall);
      s.box([wallW, 0.12, 0.018], [cx + wallW / 2, 0.06, cz + 0.009], skirt);
      s.box([0.018, 0.12, wallW], [cx + 0.009, 0.06, cz + wallW / 2], skirt);
      for (let i = 0; i < Math.ceil(wallW / 0.14); i++) s.box([Math.min(0.132, wallW - i * 0.14), 0.02, wallW], [cx + i * 0.14 + Math.min(0.132, wallW - i * 0.14) / 2, -0.01, cz + wallW / 2], boardMat(i % 2 ? '#a98258' : '#9d7850'));
      void floor;
    } else {
      tail.rotation.x = -Math.PI / 2 + 0.2; tail.position.set(0, r, r);
      const lean = 0.6;
      pivot.quaternion.setFromUnitVectors(X, new THREE.Vector3(-Math.sin(lean), Math.cos(lean), 0.06).normalize());
      const b = settle();
      const board = boardMat('#b98d5c'), tape = boardMat('#8a5a2b');
      const d = 0.75 * W * Math.sin(lean);
      const bh = Math.max(0.16, d / Math.tan(lean) - (r * 1.08) / Math.sin(lean));
      const xb = b.max.x - r * Math.cos(lean) - d;
      const zc = (b.min.z + b.max.z) / 2;
      const layers = bh > 0.45 ? 2 : 1;
      for (let i = 0; i < layers; i++) {
        const h = bh / layers, w = 0.54 - i * 0.04;
        s.box([w, h - 0.006, 0.46], [xb - w / 2 - i * 0.02, h * i + h / 2, zc], board).rotation.y = i * 0.06;
        s.box([w + 0.004, 0.004, 0.05], [xb - w / 2 - i * 0.02, h * (i + 1) - 0.004, zc], tape).rotation.y = i * 0.06;
      }
      const b2 = s.box([0.46, 0.34, 0.4], [xb - 0.3, 0.17, zc - 0.5], board); b2.rotation.y = -0.3;
      s.box([0.47, 0.004, 0.05], [xb - 0.3, 0.342, zc - 0.5], tape).rotation.y = -0.3;
    }
    return s.finish();
  },
});
