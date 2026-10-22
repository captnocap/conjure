import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const PALETTES = {
  madder: { field: '#8e2a22', second: '#1f2c52', pale: '#ead9b0', accent: '#c98a2e' },
  indigo: { field: '#22386e', second: '#8e2a22', pale: '#e8dcc0', accent: '#d9a441' },
  sage: { field: '#6f8a6a', second: '#2f4a3a', pale: '#efe8d2', accent: '#b5533a' },
  saffron: { field: '#c98a2a', second: '#5a3520', pale: '#f0e2b8', accent: '#8e2a22' },
  rose: { field: '#b56a72', second: '#4a3a5a', pale: '#f1e2d6', accent: '#6f8a6a' },
} as const;

export default defineThing({
  questions: {
    design: choice('What is knotted into the rug?', {
      mihrab: 'A pointed arch niche with a little lamp hanging in it, pointing the way to pray.',
      tree: 'A tree of life, branches full of blossom.',
      guls: 'Rows of eight-sided tribal medallions, a nomad\'s weaving.',
      kilim: 'Plain flat-woven stripes and zigzags, the cheapest rug that will do.',
    }),
    colour: choice('What colour is it mostly?', {
      madder: 'Deep madder red with navy and cream.',
      indigo: 'Indigo blue with red and gold.',
      sage: 'Sage green and ivory, calm.',
      saffron: 'Saffron gold and brown.',
      rose: 'Faded rose and dusty violet.',
    }),
    state: choice('What moment is this?', {
      ready: 'Laid out square and smooth, ewer filled, slippers just stepped out of: prayer is about to begin.',
      used: 'Just used: knees and forehead have pressed the pile, beads lie where they were set down, and the ewer has been carried off to refill.',
      rolling: 'Being packed: the rug is half rolled up from one end, the road is calling.',
      abandoned: 'Left behind in a hurry: a corner flipped by the wind, sand drifting over it, a slipper on its side, the ewer tipped.',
    }),
    water: choice('What holds the washing water?', {
      brass: 'A tall brass ewer with a long curved spout.',
      clay: 'A plain clay jug with one handle.',
      copper: 'A tinned copper ewer standing in its own basin.',
      flask: 'Only a leather flask: water is too scarce to pour away.',
      stone: 'None at all: a smooth clean stone for washing with dust in the desert.',
    }),
    shoes: choice('Whose footwear is set beside it?', {
      babouche: 'A merchant\'s soft yellow leather slippers with turned-up toes.',
      embroidered: 'Small red slippers stitched with gold thread.',
      sandals: 'A pilgrim\'s worn rope sandals.',
      boots: 'A rider\'s tall felt boots, dusty from the road.',
    }),
    beside: choice('What else has been set out?', {
      nothing: 'Nothing else.',
      beads: 'A string of prayer beads.',
      book: 'A small book open on a folding wooden stand.',
      lamp: 'A little clay oil lamp, for praying before dawn.',
      staff: 'A walking staff and a tied bundle, everything the traveller owns.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const grey = new THREE.Color('#9a9184');
    const fade = mix(0.3, 0, mood.cheer) + mood.wear * 0.25;
    const tone = (hex: string) => `#${new THREE.Color(hex).lerp(grey, fade).getHexString()}`;
    const p = PALETTES[a.colour];
    const field = tone(p.field), second = tone(p.second), pale = tone(p.pale), accent = tone(p.accent);
    const W = 0.74, LEN = 1.2;

    // The rug face, painted with fringes that the alpha test cuts out.
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 832;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = tone('#efe7d0'); ctx.lineWidth = 3;
    for (let x = 6; x < 512; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (random() - 0.5) * 6, 40); ctx.moveTo(x, 832); ctx.lineTo(x + (random() - 0.5) * 6, 792); ctx.stroke(); }
    const top = 36, bottom = 796;
    ctx.fillStyle = second; ctx.fillRect(0, top, 512, bottom - top);
    ctx.fillStyle = pale; ctx.fillRect(14, top + 14, 484, bottom - top - 28);
    ctx.fillStyle = field; ctx.fillRect(26, top + 26, 460, bottom - top - 52);
    if (a.design !== 'kilim') {
      // Main border of small diamonds.
      ctx.fillStyle = second; ctx.fillRect(26, top + 26, 460, bottom - top - 52);
      for (let i = 0; i < 44; i++) {
        const along = i / 44, onSide = i % 2;
        for (const [x, y] of onSide ? [[52, top + 60 + along * (bottom - top - 120)], [460, top + 60 + along * (bottom - top - 120)]] : [[60 + along * 392, top + 52], [60 + along * 392, bottom - 52]]) {
          ctx.fillStyle = i % 4 < 2 ? pale : accent;
          ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.lineTo(x + 13, y); ctx.lineTo(x, y + 13); ctx.lineTo(x - 13, y); ctx.fill();
        }
      }
      ctx.fillStyle = pale; ctx.fillRect(76, top + 76, 360, bottom - top - 152);
      ctx.fillStyle = field; ctx.fillRect(84, top + 84, 344, bottom - top - 168);
    }
    const fx = 84, fy = top + 84, fw = 344, fh = bottom - top - 168;
    if (a.design === 'mihrab') {
      ctx.fillStyle = pale;
      ctx.beginPath(); ctx.moveTo(fx + 30, fy + fh - 30); ctx.lineTo(fx + 30, fy + 250); ctx.quadraticCurveTo(fx + 40, fy + 110, fx + fw / 2, fy + 30); ctx.quadraticCurveTo(fx + fw - 40, fy + 110, fx + fw - 30, fy + 250); ctx.lineTo(fx + fw - 30, fy + fh - 30); ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(fx + 52, fy + fh - 52); ctx.lineTo(fx + 52, fy + 260); ctx.quadraticCurveTo(fx + 62, fy + 140, fx + fw / 2, fy + 70); ctx.quadraticCurveTo(fx + fw - 62, fy + 140, fx + fw - 52, fy + 260); ctx.lineTo(fx + fw - 52, fy + fh - 52); ctx.fill();
      // Hanging lamp.
      ctx.strokeStyle = second; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(256, fy + 80); ctx.lineTo(256, fy + 190); ctx.stroke();
      ctx.fillStyle = second; ctx.beginPath(); ctx.moveTo(256, fy + 185); ctx.lineTo(296, fy + 240); ctx.lineTo(276, fy + 300); ctx.lineTo(236, fy + 300); ctx.lineTo(216, fy + 240); ctx.fill();
      ctx.fillStyle = pale; ctx.beginPath(); ctx.arc(256, fy + 250, 14, 0, 7); ctx.fill();
      ctx.fillStyle = second;
      for (const x of [fx + 110, fx + fw - 110]) { ctx.beginPath(); ctx.moveTo(x, fy + fh - 130); ctx.lineTo(x + 26, fy + fh - 100); ctx.lineTo(x, fy + fh - 70); ctx.lineTo(x - 26, fy + fh - 100); ctx.fill(); }
    } else if (a.design === 'tree') {
      ctx.strokeStyle = pale; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(256, fy + fh - 40); ctx.lineTo(256, fy + 70); ctx.stroke();
      ctx.lineWidth = 7;
      for (let i = 0; i < 6; i++) {
        const y = fy + fh - 110 - i * 78, reach = 125 - i * 12;
        for (const side of [-1, 1]) {
          ctx.strokeStyle = pale; ctx.beginPath(); ctx.moveTo(256, y); ctx.quadraticCurveTo(256 + side * reach * 0.6, y - 10, 256 + side * reach, y - 55); ctx.stroke();
          ctx.fillStyle = i % 2 ? accent : pale; ctx.beginPath(); ctx.arc(256 + side * reach, y - 60, 15, 0, 7); ctx.fill();
          ctx.fillStyle = second; ctx.beginPath(); ctx.arc(256 + side * reach, y - 60, 6, 0, 7); ctx.fill();
        }
      }
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(256, fy + 60, 20, 0, 7); ctx.fill();
      ctx.fillStyle = second; ctx.fillRect(216, fy + fh - 46, 80, 18);
    } else if (a.design === 'guls') {
      for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) {
        const cx = fx + fw * (0.27 + i * 0.46), cy = fy + fh * (0.14 + j * 0.24), r = 56;
        ctx.fillStyle = (i + j) % 2 ? pale : accent;
        ctx.beginPath(); for (let k = 0; k < 8; k++) ctx.lineTo(cx + Math.cos(k * 0.785 + 0.39) * r, cy + Math.sin(k * 0.785 + 0.39) * r); ctx.fill();
        ctx.fillStyle = second; ctx.beginPath(); for (let k = 0; k < 4; k++) ctx.lineTo(cx + Math.cos(k * 1.571) * r * 0.62, cy + Math.sin(k * 1.571) * r * 0.62); ctx.fill();
        ctx.fillStyle = field; ctx.fillRect(cx - 8, cy - 8, 16, 16);
      }
    } else {
      const bands = [second, pale, accent, field, pale, second, accent];
      let y = top;
      for (let i = 0; y < bottom; i++) {
        const h = i % 3 === 1 ? 52 : 28;
        ctx.fillStyle = bands[i % bands.length]; ctx.fillRect(0, y, 512, Math.min(h, bottom - y));
        if (i % 3 === 1 && y + h < bottom) { ctx.strokeStyle = bands[(i + 3) % bands.length]; ctx.lineWidth = 6; ctx.beginPath(); for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y + (x / 32 % 2 ? 12 : h - 12)); ctx.stroke(); }
        y += h;
      }
    }
    // Wear where knees, forehead and feet go; pressed pile if just used; sand if abandoned.
    const press = (x: number, y: number, rx: number, ry: number, style: string) => { ctx.fillStyle = style; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); };
    const bare = `rgba(190,172,140,${mix(0.05, 0.55, mood.wear)})`;
    for (const [x, y, rx, ry] of [[190, 520, 44, 56], [322, 520, 44, 56], [256, 230, 50, 36], [200, 720, 36, 44], [312, 720, 36, 44]]) press(x + (random() - 0.5) * 16, y, rx, ry, bare);
    if (a.state === 'used') { for (const x of [190, 322]) press(x, 520, 34, 46, 'rgba(20,10,5,0.38)'); press(256, 230, 34, 22, 'rgba(20,10,5,0.38)'); for (const x of [150, 362]) press(x, 300, 24, 34, 'rgba(20,10,5,0.26)'); }
    if (a.state === 'abandoned') for (let i = 0; i < 14; i++) press(random() * 512, top + random() * (bottom - top), 30 + random() * 70, 14 + random() * 26, 'rgba(217,190,140,0.6)');
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    const rugMat = new THREE.MeshStandardMaterial({ map, roughness: 1, alphaTest: 0.5, side: THREE.DoubleSide });

    const put = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const lathe = (points: [number, number][], seg = 20) => new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    const tube = (parent: THREE.Object3D, points: [number, number, number][], radius: number, material: THREE.Material) =>
      put(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q))), 20, radius, 6), material);

    // The rug itself: a rippled sheet, optionally part rolled or with a corner flipped.
    const rolled = a.state === 'rolling' ? mix(0.4, 0.55, random()) : 0;
    const geometry = new THREE.PlaneGeometry(W, LEN, 14, 28);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position');
    const ripple = mix(0.004, 0.014, mood.wear) * (a.state === 'ready' ? 0.6 : 1.3), k1 = 3 + random() * 4, k2 = 4 + random() * 5, ph = random() * 6;
    const rollR = 0.07, rollStart = LEN / 2 - rolled * LEN;
    const flip = a.state === 'abandoned' ? 0.34 + random() * 0.12 : 0, flipSide = random() < 0.5 ? -1 : 1;
    for (let i = 0; i < position.count; i++) {
      let x = position.getX(i), z = position.getZ(i);
      let y = 0.012 + (Math.sin(x * k1 * 3 + ph) * Math.cos(z * k2 + ph) + 1) * ripple;
      if (rolled && z > rollStart) {
        // Wind the near end into a tightening spiral.
        const along = z - rollStart, angle = along / rollR * 0.85, r = rollR * (1 - Math.min(0.55, along * 0.5));
        z = rollStart + Math.sin(angle) * r;
        y = 0.012 + rollR - Math.cos(angle) * r + along * 0.004;
      }
      if (flip) {
        // Fold one far corner back over the rug along a diagonal.
        const cx = flipSide * W / 2, cz = -LEN / 2, d = (flipSide * (cx - x) + (z - cz)) / Math.SQRT2;
        if (d < flip) {
          const over = flip - d;
          x += -flipSide * over * Math.SQRT2 * 0.98; z += over * Math.SQRT2 * 0.98;
          y += 0.02 + Math.sin(Math.min(1, over / 0.12) * Math.PI) * 0.03 + 0.012;
        }
      }
      position.setXYZ(i, x, y, z);
    }
    geometry.computeVertexNormals();
    put(s.root, geometry, rugMat).rotation.y = (random() - 0.5) * 0.06;
    const nearEdge = rolled ? rollStart + rollR : LEN / 2;

    // Footwear.
    const shoe = (side: number) => {
      const g = new THREE.Group();
      if (a.shoes === 'babouche' || a.shoes === 'embroidered') {
        const fancy = a.shoes === 'embroidered';
        const hide = s.material(fancy ? '#a8242a' : '#d9a83a', { roughness: 0.6 });
        const k = fancy ? 0.84 : 1;
        put(g, new THREE.SphereGeometry(1, 12, 8), s.material('#5a4030'), 0, 0.008 * k, 0).scale.set(0.045 * k, 0.008 * k, 0.125 * k);
        put(g, new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hide, 0, 0.012 * k, -0.045 * k).scale.set(0.047 * k, 0.045 * k, 0.085 * k);
        const tip = put(g, new THREE.ConeGeometry(0.014 * k, 0.05 * k, 6), hide, 0, 0.035 * k, -0.135 * k);
        tip.rotation.x = -0.9;
        put(g, new THREE.BoxGeometry(0.075 * k, 0.012, 0.07 * k), hide, 0, 0.016 * k, 0.075 * k);
        if (fancy) { const trim = put(g, new THREE.TorusGeometry(0.03 * k, 0.005, 5, 12, Math.PI), new THREE.MeshStandardMaterial({ color: '#f0c23a', emissive: '#7a5208', emissiveIntensity: 0.5, metalness: 0.5, roughness: 0.3 }), 0, 0.03 * k, 0.012 * k); trim.rotation.x = -0.6; put(g, new THREE.SphereGeometry(0.01, 6, 5), trim.material as THREE.Material, 0, 0.05 * k, -0.07 * k); }
      } else if (a.shoes === 'sandals') {
        const rope = s.material('#b89a62');
        put(g, new THREE.SphereGeometry(1, 12, 8), rope, 0, 0.009, 0).scale.set(0.048, 0.009, 0.125);
        const strap = put(g, new THREE.TorusGeometry(0.04, 0.006, 5, 12, Math.PI), s.material('#5a4030'), 0, 0.014, -0.04);
        strap.scale.y = 0.8;
        tube(g, [[0, 0.016, -0.1], [0, 0.04, -0.07], [side * 0.012, 0.045, -0.04]], 0.004, s.material('#5a4030'));
      } else {
        const felt = s.material('#6b6258', { roughness: 1 });
        put(g, new THREE.SphereGeometry(1, 12, 8), s.material('#3a2e26'), 0, 0.012, 0).scale.set(0.052, 0.012, 0.135);
        put(g, new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), felt, 0, 0.018, -0.03).scale.set(0.052, 0.06, 0.105);
        const shaft = put(g, lathe([[0.05, 0.03], [0.048, 0.2], [0.058, 0.34], [0.05, 0.345]], 12), felt, 0, 0, 0.05);
        (shaft.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        put(g, new THREE.TorusGeometry(0.057, 0.008, 5, 14), s.material('#8e2a22'), 0, 0.33, 0.05).rotation.x = Math.PI / 2;
      }
      g.scale.setScalar(1.25);
      s.root.add(g);
      return g;
    };
    const sx = W / 2 + 0.17, sz = Math.min(0.3, nearEdge - 0.2);
    for (const side of [-1, 1]) {
      const g = shoe(side);
      g.position.set(sx + side * 0.072, 0, sz + (random() - 0.5) * 0.012);
      g.rotation.y = side * -0.04 + (random() - 0.5) * 0.04;
      if (a.state === 'abandoned' && side === 1) { g.position.set(sx + 0.2 + random() * 0.15, a.shoes === 'boots' ? 0.055 : 0.04, sz + 0.25); g.rotation.set(a.shoes === 'boots' ? Math.PI / 2 : 0, random() * 3, a.shoes === 'boots' ? 0 : Math.PI / 2); }
    }

    // Water.
    const wx = -W / 2 - 0.2, wz = 0.12;
    const vessel = new THREE.Group();
    vessel.position.set(wx, 0, wz);
    const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color('#d2a238').lerp(new THREE.Color('#6f8f7a'), mood.wear * 0.35), metalness: 0.55, roughness: 0.35, emissive: '#5a3d0c', emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const gone = a.state === 'used' && a.water !== 'stone';
    if (gone) {
      // A damp ring where the ewer stood.
      s.ring(0.065, 0.012, [wx, 0.004, wz], s.material('#7a6a55')).rotation.x = Math.PI / 2;
    } else if (a.water === 'brass' || a.water === 'copper') {
      const metal = a.water === 'brass' ? brass : new THREE.MeshStandardMaterial({ color: '#b9b4a8', metalness: 0.6, roughness: 0.35, emissive: '#3a3a36', emissiveIntensity: 0.3, side: THREE.DoubleSide });
      const lift = a.water === 'copper' ? 0.02 : 0;
      if (a.water === 'copper') put(vessel, lathe([[0, 0], [0.09, 0], [0.17, 0.05], [0.185, 0.055], [0.16, 0.035], [0.08, 0.012], [0, 0.012]]), new THREE.MeshStandardMaterial({ color: '#b5683c', metalness: 0.55, roughness: 0.4, emissive: '#4a200c', emissiveIntensity: 0.3, side: THREE.DoubleSide }));
      put(vessel, lathe([[0, 0], [0.05, 0], [0.058, 0.012], [0.036, 0.035], [0.085, 0.09], [0.098, 0.15], [0.07, 0.225], [0.03, 0.275], [0.026, 0.33], [0.045, 0.36], [0.04, 0.368], [0.012, 0.385], [0.014, 0.4], [0, 0.415]]), metal, 0, lift, 0);
      tube(vessel, [[0.08, 0.12 + lift, 0], [0.15, 0.17 + lift, 0], [0.175, 0.27 + lift, 0], [0.215, 0.335 + lift, 0]], 0.011, metal);
      tube(vessel, [[-0.03, 0.345 + lift, 0], [-0.12, 0.34 + lift, 0], [-0.145, 0.22 + lift, 0], [-0.09, 0.13 + lift, 0]], 0.009, metal);
    } else if (a.water === 'clay') {
      const clay = s.material('#b3724a', { side: THREE.DoubleSide });
      put(vessel, lathe([[0, 0], [0.055, 0], [0.105, 0.08], [0.11, 0.15], [0.07, 0.24], [0.045, 0.28], [0.06, 0.31], [0.055, 0.312]]), clay);
      tube(vessel, [[-0.05, 0.29, 0], [-0.12, 0.27, 0], [-0.13, 0.18, 0], [-0.1, 0.13, 0]], 0.012, clay);
    } else if (a.water === 'flask') {
      const hide = s.material('#7a5236', { roughness: 0.7 });
      put(vessel, new THREE.SphereGeometry(1, 14, 10), hide, 0, 0.055, 0).scale.set(0.11, 0.05, 0.15);
      const neck = put(vessel, new THREE.CylinderGeometry(0.018, 0.026, 0.07, 8), hide, 0, 0.065, -0.165);
      neck.rotation.x = -1.3;
      put(vessel, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), s.material('#3a2a1e'), 0, 0.075, -0.2).rotation.x = -1.3;
      tube(vessel, [[0.05, 0.08, -0.1], [0.19, 0.012, -0.03], [0.21, 0.012, 0.12], [0.05, 0.08, 0.1]], 0.006, s.material('#3a2a1e'));
    } else {
      put(vessel, new THREE.BoxGeometry(0.22, 0.008, 0.22), s.material('#e6dcc2'), 0, 0.004, 0).rotation.y = 0.3;
      put(vessel, new THREE.SphereGeometry(1, 14, 10), s.material('#5f5a54', { roughness: 0.35 }), 0, 0.03, 0).scale.set(0.075, 0.028, 0.06);
    }
    if (a.state === 'abandoned' && !gone && a.water !== 'stone' && a.water !== 'flask') {
      vessel.rotation.set(0, random() * 3, Math.PI / 2 - 0.1);
      vessel.position.y = 0.1;
      vessel.position.x -= 0.1;
      s.cylinder(0.2, 0.2, 0.006, [wx + 0.02, 0.003, wz + 0.2], s.material('#8a765c'), 14).scale.z = 0.7;
    } else vessel.rotation.y = -0.6 + random() * 0.5;
    s.root.add(vessel);

    // What else.
    const beads = a.beside === 'beads' || a.state === 'used';
    if (beads) {
      const amber = new THREE.MeshStandardMaterial({ color: '#c8742a', roughness: 0.25, emissive: '#6a2f08', emissiveIntensity: 0.4 });
      const cx = a.state === 'used' ? 0.16 : W / 2 + 0.16, cz = a.state === 'used' ? -0.05 : -0.3, baseY = a.state === 'used' ? 0.03 : 0.012;
      const points: { at: [number, number, number]; size: number }[] = [];
      for (let i = 0; i < 33; i++) { const angle = (i / 33) * Math.PI * 2, r = 0.085 + Math.sin(angle * 3 + ph) * 0.02; points.push({ at: [cx + Math.cos(angle) * r * 1.3, baseY, cz + Math.sin(angle) * r], size: 0.011 }); }
      s.scatter(new THREE.SphereGeometry(1, 8, 6), amber, points);
      s.ball([0.016, 0.016, 0.016], [cx + 0.125, baseY, cz], amber, 8);
      s.cylinder(0.006, 0.014, 0.05, [cx + 0.16, baseY, cz], s.material('#8e2a22'), 6).rotation.z = Math.PI / 2;
    }
    if (a.beside === 'book') {
      const wood = s.material('#6a4428'), z = -LEN / 2 - 0.22;
      for (const side of [-1, 1]) {
        const board = s.box([0.3, 0.012, 0.3], [0, 0.11, z], wood);
        board.rotation.z = side * 0.75;
        const page = s.box([0.13, 0.014, 0.2], [side * 0.062, 0.2 + 0.016, z], s.material('#f0e8cf'));
        page.rotation.z = side * 0.42;
        for (let i = 0; i < 5; i++) s.box([0.09, 0.002, 0.005], [side * 0.062, 0.2 + 0.027, z - 0.07 + i * 0.034], s.material('#3a2e26')).rotation.z = side * 0.42;
      }
      s.box([0.012, 0.03, 0.21], [0, 0.185, z], s.material('#2f4a3a'));
    } else if (a.beside === 'lamp') {
      const clay = s.material('#a9603f'), x = -W / 2 - 0.16, z = -LEN / 2 + 0.12;
      s.lathe([[0, 0], [0.035, 0], [0.06, 0.02], [0.055, 0.04], [0.02, 0.05]], clay, [x, 0, z]);
      s.cylinder(0.012, 0.02, 0.06, [x + 0.065, 0.035, z], clay, 8).rotation.z = -1.2;
      s.ring(0.02, 0.006, [x - 0.065, 0.03, z], clay);
      const flame = s.ball([0.012, 0.028, 0.012], [x + 0.098, 0.07, z], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae30', emissiveIntensity: 2.2 }), 8);
      flame.castShadow = false;
    } else if (a.beside === 'staff') {
      const x = -W / 2 - 0.42;
      s.rod([x, 0.02, -LEN / 2 - 0.1], [x + 0.08, 0.02, LEN / 2 + 0.25], 0.016, s.material('#6b4a2c'), 0.012);
      s.ball([0.16, 0.11, 0.13], [x + 0.02, 0.11, -LEN / 2 + 0.1], s.material(tone('#3f5a7a')), 12);
      s.ball([0.045, 0.04, 0.045], [x + 0.02, 0.225, -LEN / 2 + 0.1], s.material(tone('#3f5a7a')), 8);
    }
    if (a.state === 'abandoned') {
      const sand = s.material('#cfae78');
      for (let i = 0; i < 3; i++) s.ball([0.16 + random() * 0.1, 0.016 + random() * 0.012, 0.1 + random() * 0.06], [(random() - 0.5) * 0.9, 0.012, (random() - 0.2) * 0.9], sand, 12);
    }
    return s.finish();
  },
});
