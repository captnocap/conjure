import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];

export default defineThing({
  questions: {
    basket: choice('What kind of basket is it?', {
      rattan: 'A shallow rounded-rectangle basket of woven rattan, honey coloured.',
      bamboo: 'A round open-weave bamboo basket, pale and springy.',
      plastic: 'A pale blue plastic mesh basket, the public-bath kind.',
      tray: 'A lacquered black wooden tray-box with a red inside, from a good inn.',
    }),
    robe: choice('What is the robe patterned with?', {
      indigo: 'Deep indigo scattered with white leaf shapes.',
      stripes: 'White with narrow blue stripes.',
      waves: 'Blue overlapping wave scales on white.',
      crest: 'White printed all over with the inn\'s small dark crest.',
      plum: 'Dusty rose with pale plum blossoms.',
    }),
    state: choice('How was it left?', {
      folded: 'Folded square and exact, sash coiled on top.',
      dropped: 'Dropped in a heap, a sleeve hanging over the side and the sash trailing on the floor.',
      packed: 'Folded with a rolled white towel and a little drawstring wash bag tucked beside it.',
      empty: 'Nearly empty: the robe is being worn, only the small things remain.',
    }),
    sash: choice('What colour is the sash?', {
      maroon: 'Dark maroon.',
      navy: 'Navy blue.',
      mustard: 'Mustard yellow.',
      moss: 'Grey-green.',
    }),
    sandals: choice('What footwear waits beside it?', {
      geta: 'Wooden geta on two teeth, with cloth thongs.',
      zori: 'Flat woven straw sandals.',
      slippers: 'Soft vinyl inn slippers.',
      none: 'None: they went barefoot.',
    }),
    key: choice('Is there a locker key?', {
      none: 'No key.',
      coil: 'A key on a bright coiled wrist band.',
      tag: 'A key on an elastic band with a numbered wooden tag.',
    }),
    extra: choice('What one personal thing was left on top?', {
      nothing: 'Nothing.',
      glasses: 'A pair of glasses, folded.',
      phone: 'A phone, screen lit with a message nobody is there to read.',
      ring: 'A gold ring in a small dish.',
      letter: 'A sealed letter.',
      watch: 'A wristwatch.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();
    const paint = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
      return texture;
    };

    // The basket.
    const round = a.basket === 'bamboo', tray = a.basket === 'tray';
    const AX = round ? 0.25 : 0.27, AZ = round ? 0.25 : 0.2, BH = tray ? 0.11 : round ? 0.19 : 0.17;
    const power = round ? 2 : tray ? 14 : 4.5;
    const squash = (g: THREE.BufferGeometry, ax: number, az: number, flare: number, h: number) => {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), len = Math.hypot(x, z);
        if (len < 0.3) continue;
        const dx = x / len, dz = z / len, f = 1 / (Math.abs(dx) ** power + Math.abs(dz) ** power) ** (1 / power);
        const k = 1 + flare * (pos.getY(i) / h + 0.5);
        pos.setX(i, x * f * ax * k);
        pos.setZ(i, z * f * az * k);
      }
      g.computeVertexNormals();
      return g;
    };
    const weaveTone = { rattan: '#c99a57', bamboo: '#dcc58b', plastic: '#8fc1dc', tray: '#1e1a19' }[a.basket];
    const weave = paint(256, 128, (ctx) => {
      if (tray) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 128); return; }
      if (a.basket === 'plastic') {
        ctx.clearRect(0, 0, 256, 128);
        ctx.fillStyle = '#ffffff';
        for (let x = 0; x < 256; x += 32) ctx.fillRect(x, 0, 11, 128);
        for (let y = 0; y < 128; y += 32) ctx.fillRect(0, y, 256, 11);
        return;
      }
      ctx.fillStyle = round ? 'rgba(0,0,0,0)' : '#7a5a2c';
      if (round) ctx.clearRect(0, 0, 256, 128); else ctx.fillRect(0, 0, 256, 128);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 8; x++) {
        const over = (x + y) % 2 === 0;
        ctx.fillStyle = over ? '#ffffff' : '#d9d2c2';
        if (round) { if (over) ctx.fillRect(x * 32, y * 32 + 6, 34, 18); else ctx.fillRect(x * 32 + 8, y * 32 - 2, 14, 36); }
        else { ctx.fillRect(x * 32 + (over ? 0 : 9), y * 32 + (over ? 5 : 0), over ? 32 : 14, over ? 22 : 32); ctx.strokeStyle = 'rgba(60,35,10,0.5)'; ctx.strokeRect(x * 32 + (over ? 0 : 9), y * 32 + (over ? 5 : 0), over ? 32 : 14, over ? 22 : 32); }
      }
    }, tray ? undefined : [round ? 9 : 7, round ? 3 : 2]);
    const see = a.basket === 'plastic' || round;
    const side = s.material(weaveTone, { map: weave, side: THREE.DoubleSide, roughness: a.basket === 'plastic' ? 0.4 : tray ? 0.25 : 0.8, alphaTest: see ? 0.5 : 0, transparent: false });
    const solid = s.material(weaveTone, { roughness: a.basket === 'plastic' ? 0.4 : tray ? 0.25 : 0.8 });
    const flare = tray ? 0.02 : 0.14;
    s.mesh(squash(new THREE.CylinderGeometry(1, 1, BH, 48, 1, true), AX, AZ, flare, BH), side, [0, BH / 2 + 0.01, 0]);
    if (tray) s.mesh(squash(new THREE.CylinderGeometry(0.97, 0.97, BH - 0.01, 48, 1, true), AX, AZ, flare, BH), new THREE.MeshStandardMaterial({ color: '#a8261f', roughness: 0.3, side: THREE.BackSide }), [0, BH / 2 + 0.012, 0]);
    s.mesh(squash(new THREE.CylinderGeometry(1, 1, 0.014, 48), AX, AZ, 0, 1), tray ? new THREE.MeshStandardMaterial({ color: '#a8261f', roughness: 0.3 }) : solid, [0, 0.012, 0]);
    const rim = squash(new THREE.TorusGeometry(1, 0.035, 6, 48).rotateX(Math.PI / 2), AX * (1 + flare), AZ * (1 + flare), 0, 1);
    s.mesh(rim, solid, [0, BH + 0.01, 0]).scale.y = tray ? 0.5 : 1.4;
    if (!tray) { const base = squash(new THREE.TorusGeometry(1, 0.03, 6, 48).rotateX(Math.PI / 2), AX, AZ, 0, 1); s.mesh(base, solid, [0, 0.014, 0]); }
    if (round) for (const sx of [-1, 1]) { const h = s.ring(0.06, 0.012, [sx * AX * 1.12, BH - 0.03, 0], solid, Math.PI); h.rotation.y = Math.PI / 2; }
    if (mood.wear > 0.6 && !tray && a.basket !== 'plastic') for (let i = 0; i < 6; i++) { const t = r(0, 6.3); s.rod([Math.cos(t) * AX * 1.12, BH, Math.sin(t) * AZ * 1.12], [Math.cos(t) * AX * 1.25, BH + r(0.02, 0.08), Math.sin(t) * AZ * 1.25], 0.004, solid); }

    // The robe's cloth.
    const cloth = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      map: paint(256, 256, (ctx) => {
        const ground = { indigo: '#27386b', stripes: '#f3f1ea', waves: '#f1f0ea', crest: '#f4f1e8', plum: '#c98a94' }[a.robe];
        ctx.fillStyle = ground;
        ctx.fillRect(0, 0, 256, 256);
        if (a.robe === 'indigo') { ctx.fillStyle = '#eef0f2'; for (let i = 0; i < 26; i++) { ctx.save(); ctx.translate(r(0, 256), r(0, 256)); ctx.rotate(r(0, 6.3)); ctx.beginPath(); ctx.ellipse(0, 0, 15, 5, 0, 0, 7); ctx.fill(); ctx.restore(); } }
        if (a.robe === 'stripes') { ctx.fillStyle = '#35539a'; for (let x = 6; x < 256; x += 22) ctx.fillRect(x, 0, 6, 256); }
        if (a.robe === 'waves') { ctx.strokeStyle = '#2f55a0'; ctx.lineWidth = 3; for (let y = 0; y < 9; y++) for (let x = -1; x < 6; x++) for (const k of [22, 14, 6]) { ctx.beginPath(); ctx.arc(x * 48 + (y % 2) * 24 + 24, y * 30 + 28, k, Math.PI, 0); ctx.stroke(); } }
        if (a.robe === 'crest') { ctx.fillStyle = '#2b3350'; for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const cx = x * 44 + (y % 2) * 22 + 12, cy = y * 44 + 20; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#f4f1e8'; ctx.fillRect(cx - 6, cy - 1.5, 12, 3); ctx.fillRect(cx - 1.5, cy - 6, 3, 12); ctx.fillStyle = '#2b3350'; } }
        if (a.robe === 'plum') { for (let i = 0; i < 20; i++) { const cx = r(0, 256), cy = r(0, 256); ctx.fillStyle = '#f7e3e3'; for (let p = 0; p < 5; p++) { ctx.beginPath(); ctx.arc(cx + Math.cos(p * 1.257) * 7, cy + Math.sin(p * 1.257) * 7, 5.5, 0, 7); ctx.fill(); } ctx.fillStyle = '#d7a43a'; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill(); } }
      }),
    });
    const collar = new THREE.MeshStandardMaterial({ color: a.robe === 'indigo' ? '#1b2850' : a.robe === 'plum' ? '#a86672' : '#e6e3da', roughness: 0.95 });
    const sashTone = { maroon: '#7a2331', navy: '#22305c', mustard: '#c99a2e', moss: '#6f7d5a' }[a.sash];
    const sash = new THREE.MeshStandardMaterial({ color: sashTone, roughness: 0.9 });
    const sashEdge = new THREE.MeshStandardMaterial({ color: new THREE.Color(sashTone).multiplyScalar(0.7), roughness: 0.9 });

    const RX = AX * 0.82, RZ = AZ * 0.8;
    let top = 0.03; // the height small things rest at
    const folded = () => {
      const layers = 4, h = Math.max(0.05, (BH + 0.035) / layers);
      for (let i = 0; i < layers; i++) {
        const k = 1 - i * 0.03;
        const fold = s.box([RX * 2 * k, h - 0.004, RZ * 2 * k], [r(-0.006, 0.006), 0.03 + h / 2 + i * h, r(-0.006, 0.006)], cloth);
        fold.rotation.y = r(-0.03, 0.03);
      }
      top = 0.03 + layers * h - 0.002;
      // The collar crossed left over right.
      for (const dir of [-1, 1]) { const band = s.box([0.035, 0.008, RZ * 1.5], [dir * 0.035, top + 0.004 + (dir > 0 ? 0.004 : 0), RZ * 0.25], collar); band.rotation.y = dir * 0.42; }
    };
    const coil = (at: P3) => {
      const g = new THREE.Group();
      const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.055, 22), sash);
      roll.castShadow = true;
      g.add(roll);
      for (const y of [-0.028, 0.028]) for (const rad of [0.016, 0.03, 0.044]) { const line = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.003, 4, 20), sashEdge); line.rotation.x = Math.PI / 2; line.position.y = y; g.add(line); }
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.055), sash);
      tail.position.set(0.06, -0.022, 0);
      g.add(tail);
      g.rotation.set(Math.PI / 2, 0, r(-0.4, 0.4), 'ZYX');
      g.position.set(at[0], at[1] + 0.05, at[2]);
      s.root.add(g);
    };

    if (a.state === 'folded') {
      folded();
      coil([RX * 0.45, top, -RZ * 0.35]);
    } else if (a.state === 'packed') {
      folded();
      coil([RX * 0.5, top, -RZ * 0.4]);
      const towel = s.cylinder(0.045, 0.045, RZ * 1.5, [-RX * 0.55, top + 0.045, 0], new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 1 }), 16);
      towel.rotation.x = Math.PI / 2;
      for (const z of [-1, 1]) s.ring(0.03, 0.004, [-RX * 0.55, top + 0.045, z * (RZ * 0.75 + 0.001)], new THREE.MeshStandardMaterial({ color: '#cfcabb' }));
      const pouch = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#d9604a' : '#55697c', roughness: 0.9 });
      s.ball([0.055, 0.05, 0.05], [-RX * 0.05, top + 0.045, RZ * 0.5], pouch, 12);
      s.cylinder(0.03, 0.018, 0.03, [-RX * 0.05, top + 0.1, RZ * 0.5], pouch, 10);
      s.ring(0.019, 0.004, [-RX * 0.05, top + 0.088, RZ * 0.5], new THREE.MeshStandardMaterial({ color: '#f1ece0' })).rotation.x = Math.PI / 2;
    } else if (a.state === 'dropped') {
      const lumps = 9;
      for (let i = 0; i < lumps; i++) {
        const t = (i / lumps) * 6.3 + r(-0.3, 0.3), d = i < 3 ? r(0, 0.05) : r(0.5, 0.85);
        const lump = s.ball([r(0.09, 0.13), r(0.045, 0.07), r(0.08, 0.11)], [Math.cos(t) * d * RX, BH * (i < 3 ? 0.95 : 0.72) + r(-0.01, 0.02), Math.sin(t) * d * RZ], i % 4 === 3 ? collar : cloth, 12);
        lump.rotation.set(r(-0.4, 0.4), r(0, 3), r(-0.4, 0.4));
      }
      top = BH + 0.05;
      // A sleeve over the front rim and down to the floor.
      const sx = r(-0.5, 0.2) * AX, edge = AZ * (1 + flare) + 0.012;
      s.box([0.17, 0.02, 0.1], [sx, BH + 0.035, edge - 0.04], cloth).rotation.x = 0.3;
      const hang = s.box([0.17, BH * 0.85, 0.016], [sx, BH * 0.6, edge + 0.02], cloth);
      hang.rotation.x = 0.12;
      s.box([0.17, 0.016, 0.1], [sx + 0.01, 0.01, edge + 0.085], cloth).rotation.y = r(-0.2, 0.2);
      s.box([0.012, BH * 0.85, 0.018], [sx - 0.08, BH * 0.6, edge + 0.021], collar).rotation.x = 0.12;
      // The sash, snaking out over the side and across the floor.
      const ex = AX * (1 + flare) + 0.015;
      const path: P3[] = [[0.05, BH + 0.05, -0.02], [ex * 0.8, BH + 0.06, 0.03], [ex + 0.02, BH * 0.5, 0.06], [ex + 0.08, 0.012, 0.12], [ex + 0.22, 0.012, 0.05], [ex + 0.3, 0.012, 0.2], [ex + 0.2, 0.012, 0.33]];
      const band = s.tube(path, 0.5, sash);
      band.geometry.dispose();
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      const flat = new THREE.Shape();
      flat.moveTo(-0.004, -0.028); flat.lineTo(0.004, -0.028); flat.lineTo(0.004, 0.028); flat.lineTo(-0.004, 0.028); flat.closePath();
      band.geometry = new THREE.ExtrudeGeometry(flat, { steps: 48, extrudePath: curve, bevelEnabled: false });
    } else {
      // Nearly empty: the sash's paper band and a hand towel are all that is left.
      const towel = s.box([RX * 1.1, 0.03, RZ * 1.1], [-RX * 0.2, 0.045, 0.01], new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 1 }));
      towel.rotation.y = r(-0.25, 0.25);
      top = 0.062;
    }

    // Sandals beside it on the floor.
    if (a.sandals !== 'none') {
      const fx = AX * (1 + flare) + 0.17, fz = a.state === 'dropped' ? -0.12 : 0.06;
      const neat = a.state === 'dropped' ? 0.5 : 0.06;
      for (const sideways of [-1, 1]) {
        const g = new THREE.Group();
        const add = (m: THREE.Mesh) => { m.removeFromParent(); g.add(m); return m; };
        if (a.sandals === 'geta') {
          const wood = s.material('#c8a36a', { roughness: 0.7 });
          add(s.box([0.095, 0.02, 0.235], [0, 0.058, 0], wood));
          for (const z of [-0.05, 0.055]) add(s.box([0.09, 0.048, 0.024], [0, 0.024, z], wood));
          for (const d of [-1, 1]) add(s.rod([0, 0.07, 0.065], [d * 0.04, 0.085, -0.02], 0.007, sash));
          add(s.rod([0, 0.066, 0.065], [0, 0.085, 0.045], 0.006, sash));
        } else if (a.sandals === 'zori') {
          const straw = s.material('#cdb26e', { roughness: 1 });
          const sole = add(s.cylinder(1, 1, 0.022, [0, 0.011, 0], straw, 20));
          sole.scale.set(0.05, 1, 0.12);
          for (let i = 0; i < 7; i++) add(s.box([0.09 - Math.abs(i - 3) * 0.008, 0.002, 0.006], [0, 0.023, -0.09 + i * 0.03], s.material('#a48a4c')));
          for (const d of [-1, 1]) add(s.rod([0, 0.03, 0.06], [d * 0.042, 0.04, -0.03], 0.007, sash));
        } else {
          const vinyl = s.material(mood.cheer > 0.5 ? '#3f7d5a' : '#6b4a36', { roughness: 0.45 });
          const sole = add(s.cylinder(1, 1, 0.018, [0, 0.009, 0], s.material('#d8cfb8'), 20));
          sole.scale.set(0.052, 1, 0.125);
          const cap = add(s.mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), vinyl, [0, 0.016, 0.045]));
          cap.scale.set(0.054, 0.045, 0.08);
        }
        g.position.set(fx + sideways * 0.065 + r(-neat, neat) * 0.2, 0, fz + r(-neat, neat) * 0.3);
        g.rotation.y = r(-neat, neat) * 1.5 + (a.state === 'dropped' && sideways > 0 ? 0.6 : 0);
        if (a.state === 'dropped' && sideways > 0 && a.sandals !== 'slippers' && random() < 0.6) { g.rotation.z = Math.PI / 2; g.position.y = 0.05; }
        s.root.add(g);
      }
    }

    // The small things on top.
    const kx = -RX * 0.5, kz = RZ * 0.45, ky = a.state === 'packed' ? top + 0.0 : top;
    const kAt: P3 = a.state === 'packed' ? [RX * 0.45, ky, RZ * 0.45] : [kx, ky, kz];
    if (a.key !== 'none') {
      const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.85, roughness: 0.3 });
      const bandTone = a.key === 'coil' ? (mood.cheer > 0.5 ? '#f08a1c' : '#2f8fbd') : '#3b3b3d';
      const bandMat = new THREE.MeshStandardMaterial({ color: bandTone, roughness: 0.5 });
      if (a.key === 'coil') for (let i = 0; i < 3; i++) s.ring(0.036, 0.0055, [kAt[0], kAt[1] + 0.006 + i * 0.009, kAt[2]], bandMat).rotation.x = Math.PI / 2 + r(-0.08, 0.08);
      else { const loop = s.ring(0.04, 0.004, [kAt[0], kAt[1] + 0.005, kAt[2]], bandMat); loop.rotation.x = Math.PI / 2; loop.scale.y = 0.7; }
      const key = new THREE.Group();
      const add = (m: THREE.Mesh) => { m.removeFromParent(); key.add(m); return m; };
      add(s.cylinder(0.014, 0.014, 0.004, [0, 0, 0], steel, 12));
      add(s.box([0.008, 0.004, 0.045], [0, 0, 0.034], steel));
      add(s.box([0.012, 0.004, 0.008], [0.008, 0, 0.045], steel));
      add(s.box([0.01, 0.004, 0.006], [0.007, 0, 0.033], steel));
      key.position.set(kAt[0] + 0.05, kAt[1] + 0.004, kAt[2] + 0.01);
      key.rotation.y = r(0.3, 1.4);
      s.root.add(key);
      if (a.key === 'tag') {
        const tag = s.box([0.036, 0.006, 0.058], [kAt[0] - 0.01, kAt[1] + 0.005, kAt[2] + 0.062], s.material('#d9b77a'));
        tag.rotation.y = r(-0.5, 0.5);
        const num = s.label(String(Math.floor(r(11, 99))), 0.03, 0.03, [kAt[0] - 0.01, kAt[1] + 0.0085, kAt[2] + 0.062], '#3a2a18', '#d9b77a');
        num.rotation.x = -Math.PI / 2;
        num.rotation.z = tag.rotation.y;
        num.castShadow = false;
      }
    }
    const ex = a.state === 'packed' ? RX * 0.1 : RX * 0.35, ez = a.state === 'packed' ? -RZ * 0.35 : RZ * 0.4, ey = top;
    if (a.extra === 'glasses') {
      const frame = new THREE.MeshStandardMaterial({ color: '#2a2422', roughness: 0.4 });
      const lens = new THREE.MeshStandardMaterial({ color: '#cfe6ee', roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false });
      const g = new THREE.Group();
      for (const d of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0035, 6, 20), frame);
        eye.position.set(d * 0.03, 0.028, 0);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), lens);
        glass.position.copy(eye.position);
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.004), frame);
        arm.position.set(d * 0.004, 0.03 + (d > 0 ? 0.006 : 0), -0.012 - (d > 0 ? 0.006 : 0));
        eye.castShadow = arm.castShadow = true;
        g.add(eye, glass, arm);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.004), frame);
      bridge.position.set(0, 0.034, 0);
      g.add(bridge);
      g.position.set(ex, ey, ez);
      g.rotation.set(-0.5, r(-0.4, 0.4), 0);
      s.root.add(g);
    } else if (a.extra === 'phone') {
      const g = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.009, 0.148), new THREE.MeshStandardMaterial({ color: '#17181b', roughness: 0.3, metalness: 0.4 }));
      slab.castShadow = true;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.064, 0.138), new THREE.MeshStandardMaterial({
        emissiveIntensity: mix(0.6, 1.3, mood.energy), emissive: '#ffffff',
        emissiveMap: paint(64, 128, (ctx) => { ctx.fillStyle = '#20324f'; ctx.fillRect(0, 0, 64, 128); ctx.fillStyle = '#e9eef5'; ctx.fillRect(6, 44, 52, 26); ctx.fillStyle = '#55627a'; ctx.fillRect(11, 50, 30, 4); ctx.fillRect(11, 59, 40, 4); ctx.fillStyle = '#cdd6e6'; ctx.fillRect(18, 14, 28, 8); }),
        color: '#000000',
      }));
      screen.rotation.x = -Math.PI / 2;
      screen.position.y = 0.0048;
      g.add(slab, screen);
      g.position.set(ex, ey + 0.005, ez);
      g.rotation.y = r(-0.6, 0.6);
      s.root.add(g);
    } else if (a.extra === 'ring') {
      s.lathe([[0, 0], [0.022, 0], [0.04, 0.012], [0.042, 0.014], [0.02, 0.005], [0, 0.005]], new THREE.MeshStandardMaterial({ color: '#f3f1ea', roughness: 0.3, side: THREE.DoubleSide }), [ex, ey, ez]);
      const gold = new THREE.MeshStandardMaterial({ color: '#f0c244', metalness: 0.9, roughness: 0.2, emissive: '#8a6510', emissiveIntensity: 0.6 });
      const band = s.ring(0.012, 0.0035, [ex + 0.004, ey + 0.012, ez], gold);
      band.rotation.x = Math.PI / 2 - 0.5;
    } else if (a.extra === 'letter') {
      const env = s.box([0.16, 0.004, 0.11], [ex - 0.02, ey + 0.003, ez - 0.02], new THREE.MeshStandardMaterial({ color: '#f6f1e2', roughness: 0.9 }));
      env.rotation.y = r(-0.5, 0.5);
      const flap = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.08, 0, -0.055), new THREE.Vector3(0.08, 0, -0.055), new THREE.Vector3(0, 0, 0.01)]), new THREE.MeshStandardMaterial({ color: '#e4dcc6', roughness: 0.9, side: THREE.DoubleSide }));
      flap.geometry.computeVertexNormals();
      flap.position.set(env.position.x, ey + 0.0056, env.position.z);
      flap.rotation.y = env.rotation.y;
      s.root.add(flap);
      const seal = s.cylinder(0.012, 0.012, 0.003, [env.position.x, ey + 0.007, env.position.z], new THREE.MeshStandardMaterial({ color: '#b3261e', roughness: 0.5 }), 12);
      seal.position.add(new THREE.Vector3(0, 0, 0.004).applyAxisAngle(new THREE.Vector3(0, 1, 0), env.rotation.y));
    } else if (a.extra === 'watch') {
      const strap = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.8 });
      const loop = s.ring(0.032, 0.006, [ex, ey + 0.012, ez], strap);
      loop.rotation.x = Math.PI / 2;
      loop.scale.set(1, 1.25, 2);
      s.cylinder(0.02, 0.02, 0.008, [ex, ey + 0.026, ez + 0.036], new THREE.MeshStandardMaterial({ color: '#d7d9dc', metalness: 0.9, roughness: 0.25 }), 18).rotation.x = 0.5;
      s.cylinder(0.016, 0.016, 0.009, [ex, ey + 0.0265, ez + 0.0365], new THREE.MeshStandardMaterial({ color: '#f5f3ea', roughness: 0.4 }), 18).rotation.x = 0.5;
    }

    return s.finish({ footprint: AX + 0.2 });
  },
});
