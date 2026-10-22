import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { halo, paint, shade, skin, weather, write } from './paint';

const COLOURS = { black: '#26282a', yellow: '#e3b11b', rust: '#8a4a2a', whitecap: '#26282a', oxide: '#9c3d2c', blue: '#2b5a94' } as const;

export default defineThing({
  questions: {
    form: choice('What form is the bollard?', {
      pillar: 'A single stout pillar with a mushroom cap, the oldest kind.',
      kidney: 'A low post with a wide kidney-shaped head leaning away from the water.',
      tee: 'A tee head: a short column with a fat horizontal crossbar.',
      twin: 'Twin horns: a double bitt, two leaning posts on one base.',
      cleat: 'A giant horn cleat, two legs under one long bar with upturned ends.',
    }),
    rope: choice('What state is the mooring line in?', {
      taut: 'Looped over and bar-taut, straining up toward a ship out of frame.',
      slack: 'Looped over but slack, sagging to the quay and trailing away.',
      doubled: 'Two lines from two different vessels sharing the bollard.',
      castoff: 'Cast off: the eye has been lifted clear and the line lies in a wet heap beside it.',
      parted: 'Parted: a short frayed stump still around the bollard, the rest gone.',
      bare: 'No line at all, only the polished groove where lines have run.',
    }),
    paintwork: choice('How is it painted?', {
      black: 'Black bitumen paint, thick with old coats.',
      yellow: 'Safety yellow, so nobody trips on it at night.',
      rust: 'No paint left, bare brown iron.',
      whitecap: 'Black with a white-painted head.',
      oxide: 'Red oxide primer, never finished.',
      blue: 'Port-authority blue.',
    }),
    marking: choice('What is painted on it?', {
      number: 'A stencilled bollard number.',
      load: 'A safe working load in tonnes.',
      berth: 'A berth letter and number.',
      heart: 'A heart with two initials, daubed by somebody waiting.',
      none: 'Nothing.',
    }),
    sitter: choice('What is sitting on top of it?', {
      nothing: 'Nothing.',
      gull: 'A herring gull, watching.',
      cormorant: 'A black cormorant holding its wings out to dry.',
      mug: 'A steaming mug of tea left by a linesman.',
      jacket: 'A hi-vis jacket draped over the head.',
      cat: 'A harbour cat, loaf-shaped.',
      boot: 'A single work boot, owner unknown.',
    }),
    quay: choice('What is the quay edge made of?', {
      concrete: 'Poured concrete with a yellow painted coping.',
      granite: 'Big old granite setts, worn round.',
      timber: 'Heavy tarred timber baulks.',
      steel: 'Chequer-plate steel deck with a kerb rail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const base = COLOURS[a.paintwork];
    const wear = a.paintwork === 'rust' ? Math.max(mood.wear, 0.6) : mood.wear;
    const ironTex = (colour: string) => paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = colour; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { ctx.fillStyle = random() < 0.5 ? shade(colour, -0.18) : shade(colour, 0.08); ctx.fillRect(random() * w, random() * h, 2 + random() * 5, 2 + random() * 5); }
      weather(ctx, w, h, random, wear, a.paintwork === 'rust' ? '#3d2415' : '#8a4521');
    });
    const iron = skin(ironTex(base), { roughness: 0.55 + wear * 0.3, metalness: 0.35 });
    const cap = a.paintwork === 'whitecap' ? skin(ironTex('#e6e4da'), { roughness: 0.6 }) : iron;
    const bolt = s.material('#3a3632', { metalness: 0.6 });

    // The slab of quay it is bolted to.
    const QW = 1.9, QD = 1.6, QH = 0.22;
    const quayColour = { concrete: '#a9a79c', granite: '#8d8c88', timber: '#4a3a2c', steel: '#5f676b' }[a.quay];
    const quayTex = paint(512, 512, (ctx, w, h) => {
      ctx.fillStyle = quayColour; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? shade(quayColour, -0.14) : shade(quayColour, 0.1); ctx.fillRect(random() * w, random() * h, 2 + random() * 6, 2 + random() * 4); }
      ctx.strokeStyle = shade(quayColour, -0.45); ctx.lineWidth = 4;
      if (a.quay === 'granite') for (let y = 0; y < 5; y++) for (let x = 0; x < 4; x++) ctx.strokeRect(x * w / 3 - (y % 2) * w / 6, y * h / 5, w / 3, h / 5);
      if (a.quay === 'timber') for (let x = 0; x < 7; x++) { ctx.beginPath(); ctx.moveTo(x * w / 6, 0); ctx.lineTo(x * w / 6, h); ctx.stroke(); }
      if (a.quay === 'steel') { ctx.lineWidth = 2; for (let y = 0; y < 26; y++) for (let x = 0; x < 26; x++) { const cx = x * 20 + (y % 2) * 10, cy = y * 20; ctx.beginPath(); ctx.moveTo(cx - 5, cy + (y % 2 ? 5 : -5)); ctx.lineTo(cx + 5, cy + (y % 2 ? -5 : 5)); ctx.stroke(); } }
      if (a.quay === 'concrete') { ctx.fillStyle = '#e0b21c'; ctx.fillRect(0, h * 0.86, w, h * 0.14); ctx.fillStyle = '#1b1b1b'; for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 32, h * 0.86); ctx.lineTo(x + 64, h * 0.86); ctx.lineTo(x + 32, h); ctx.fill(); } }
      // Rust wash running from the bollard foot toward the edge.
      const g = ctx.createRadialGradient(w / 2, h * 0.5, 20, w / 2, h * 0.62, w * 0.42);
      g.addColorStop(0, `rgba(122,62,28,${0.25 + wear * 0.6})`); g.addColorStop(1, 'rgba(122,62,28,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      weather(ctx, w, h, random, mood.wear * 0.5, '#4a4038');
    });
    const quaySide = s.material(shade(quayColour, -0.2));
    const quayTop = skin(quayTex, { roughness: 0.9, metalness: a.quay === 'steel' ? 0.4 : 0 });
    s.mesh(new THREE.BoxGeometry(QW, QH, QD), [quaySide, quaySide, quayTop, quaySide, quaySide, quaySide] as unknown as THREE.Material, [0, QH / 2, 0]);
    if (a.quay === 'steel') s.box([QW, 0.12, 0.08], [0, QH + 0.06, QD / 2 - 0.04], s.material('#e3b11b'));
    if (a.quay === 'timber') for (const x of [-0.8, 0, 0.8]) s.box([0.3, 0.5, 0.3], [x, QH - 0.26, QD / 2 + 0.14], s.material('#3b2e22'));
    if (a.quay === 'concrete' || a.quay === 'granite') s.box([QW, 0.1, 0.06], [0, QH - 0.08, QD / 2 + 0.03], s.material('#4a4d4e', { metalness: 0.5 }));

    const y0 = QH;
    const single = a.form === 'pillar' || a.form === 'kidney' || a.form === 'tee';
    let topY = 0, ropeY = 0, ropeR = 0, ropeX = 0, perch = 0.25;
    if (single) {
      const r = a.form === 'tee' ? 0.2 : a.form === 'kidney' ? 0.2 : 0.24;
      const neck = a.form === 'kidney' ? 0.42 : 0.56;
      s.lathe([[0.46, 0], [0.46, 0.05], [0.36, 0.09], [r + 0.06, 0.16], [r, 0.26], [r - 0.015, neck - 0.1], [r, neck], [r + 0.03, neck + 0.04]], iron, [0, y0, 0]);
      for (let i = 0; i < 8; i++) s.cylinder(0.04, 0.04, 0.05, [Math.cos(i * 0.785 + 0.39) * 0.4, y0 + 0.07, Math.sin(i * 0.785 + 0.39) * 0.4], bolt, 6);
      if (a.form === 'pillar') {
        s.lathe([[r + 0.03, 0], [0.39, 0.06], [0.42, 0.12], [0.4, 0.19], [0.3, 0.26], [0.14, 0.3], [0, 0.31]], cap, [0, y0 + neck + 0.04, 0]);
        topY = y0 + neck + 0.35; perch = 0.2;
      } else if (a.form === 'kidney') {
        const head = s.ball([0.52, 0.15, 0.34], [0, y0 + neck + 0.14, -0.1], cap, 28);
        head.rotation.x = 0.16;
        s.ball([0.2, 0.08, 0.14], [0, y0 + neck + 0.06, 0.08], cap, 14);
        topY = y0 + neck + 0.28; perch = 0.24;
      } else {
        s.mesh(new THREE.CapsuleGeometry(0.17, 0.8, 8, 20).rotateZ(Math.PI / 2), cap, [0, y0 + neck + 0.17, 0]);
        s.cylinder(0.23, 0.2, 0.12, [0, y0 + neck + 0.04, 0], iron, 20);
        topY = y0 + neck + 0.34; perch = 0.15;
      }
      ropeY = y0 + neck - 0.08; ropeR = r + 0.055;
      if (a.marking !== 'none') {
        const text = { number: String(1 + Math.floor(random() * 140)), load: `${[50, 75, 100, 150][Math.floor(random() * 4)]}T`, berth: `${'ABCDEFG'[Math.floor(random() * 7)]}${1 + Math.floor(random() * 9)}`, heart: '', none: '' }[a.marking];
        const ink = a.paintwork === 'yellow' ? '#1b1b1b' : '#f1ede0';
        const mark = paint(256, 128, (ctx, w, h) => {
          ctx.clearRect(0, 0, w, h);
          if (a.marking === 'heart') {
            ctx.fillStyle = '#e8414f'; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.9); ctx.bezierCurveTo(w * 0.1, h * 0.5, w * 0.3, h * 0.0, w / 2, h * 0.32); ctx.bezierCurveTo(w * 0.7, h * 0.0, w * 0.9, h * 0.5, w / 2, h * 0.9); ctx.fill();
            write(ctx, `${'JMKSTDR'[Math.floor(random() * 7)]}+${'ALENCOB'[Math.floor(random() * 7)]}`, w / 2, h * 0.48, 34, '#ffffff', 'bold SIZEpx cursive');
          } else write(ctx, text, w / 2, h / 2 + 4, 104, ink, 'bold SIZEpx monospace', w * 0.92);
        });
        const band = s.mesh(new THREE.CylinderGeometry(r + 0.004, r + 0.004, 0.19, 20, 1, true, -0.75, 1.5), new THREE.MeshStandardMaterial({ map: mark, alphaTest: 0.4, roughness: 0.7 }), [0, y0 + 0.31, 0]);
        band.castShadow = false;
      }
    } else {
      const span = a.form === 'twin' ? 0.42 : 0.36;
      s.box([1.45, 0.14, 0.62], [0, y0 + 0.07, 0], iron);
      for (const x of [-0.62, 0.62]) for (const z of [-0.23, 0.23]) s.cylinder(0.04, 0.04, 0.05, [x, y0 + 0.16, z], bolt, 6);
      for (const side of [-1, 1]) {
        if (a.form === 'twin') {
          const post = s.cylinder(0.15, 0.18, 0.72, [side * (span + 0.06), y0 + 0.48, 0], iron, 20);
          post.rotation.z = -side * 0.2;
          s.ball([0.2, 0.12, 0.2], [side * (span + 0.135), y0 + 0.85, 0], cap, 18).rotation.z = -side * 0.2;
          s.mesh(new THREE.CapsuleGeometry(0.06, 0.34, 4, 10).rotateZ(Math.PI / 2), cap, [side * (span + 0.2), y0 + 0.66, 0]);
        } else s.cylinder(0.14, 0.2, 0.48, [side * span, y0 + 0.38, 0], iron, 20);
      }
      if (a.form === 'cleat') {
        s.mesh(new THREE.CapsuleGeometry(0.14, 1.3, 8, 18).rotateZ(Math.PI / 2), cap, [0, y0 + 0.66, 0]);
        for (const side of [-1, 1]) s.ball([0.17, 0.2, 0.17], [side * 0.78, y0 + 0.72, 0], cap, 14);
        topY = y0 + 0.8; perch = 0.13; ropeY = y0 + 0.36; ropeR = 0.2; ropeX = span;
      } else { topY = y0 + 0.95; perch = 0.15; ropeY = y0 + 0.5; ropeR = 0.21; ropeX = span + 0.08; }
      if (a.marking !== 'none') {
        const text = { number: String(1 + Math.floor(random() * 140)), load: `SWL ${[50, 75, 100, 150][Math.floor(random() * 4)]}T`, berth: `BERTH ${'ABCDEFG'[Math.floor(random() * 7)]}${1 + Math.floor(random() * 9)}`, heart: `♥ ${'JMKSTDR'[Math.floor(random() * 7)]}+${'ALENCOB'[Math.floor(random() * 7)]}`, none: '' }[a.marking];
        s.label(text, 0.8, 0.12, [0, y0 + 0.07, 0.312], a.marking === 'heart' ? '#e8414f' : a.paintwork === 'yellow' ? '#1b1b1b' : '#f1ede0', base).castShadow = false;
      }
    }
    const topX = a.form === 'twin' ? ropeX + 0.06 : 0;
    const topZ = a.form === 'kidney' ? -0.1 : 0;

    // The hawser.
    const ropeColours = ['#c9a86a', '#2f6fb0', '#e9e6da', '#d6741c', '#3f8f6a'];
    const ropeMat = (index: number, radius: number) => {
      const colour = new THREE.Color(ropeColours[index % ropeColours.length]).lerp(new THREE.Color('#5a5347'), wear * 0.5).getStyle();
      const tex = paint(64, 64, (ctx, w, h) => {
        ctx.fillStyle = colour; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 7;
        for (let i = -4; i < 8; i++) { ctx.beginPath(); ctx.moveTo(i * 16, 0); ctx.lineTo(i * 16 + 64, 64); ctx.stroke(); }
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(0.35 / radius, 3);
      return skin(tex, { roughness: 0.95 });
    };
    const firstRope = Math.floor(random() * ropeColours.length);
    const RR = 0.055;
    const loop = (x: number, y: number, material: THREE.Material, radius = RR, tilt = 0.12) => {
      const ring = s.mesh(new THREE.TorusGeometry(ropeR + radius * 0.6, radius, 8, 28), material, [x, y, 0]);
      ring.rotation.set(Math.PI / 2 + tilt, 0, 0);
      return ring;
    };
    const line = (points: [number, number, number][], material: THREE.Material, radius = RR) => {
      const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
      const mesh = s.mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), material);
      const map = (material as THREE.MeshStandardMaterial).map!;
      map.repeat.x = curve.getLength() * 1.6;
      return mesh;
    };
    const exit = (x: number): [number, number, number] => [x, ropeY, ropeR + 0.02];
    const fray = (at: [number, number, number], material: THREE.Material) => {
      for (let i = 0; i < 9; i++) s.rod(at, [at[0] + (random() - 0.5) * 0.3, at[1] + (random() - 0.3) * 0.25, at[2] + 0.12 + random() * 0.22], 0.012, material, 0.004);
    };
    if (a.rope === 'taut' || a.rope === 'doubled') {
      const m = ropeMat(firstRope, RR);
      loop(ropeX, ropeY, m);
      line([[ropeX + ropeR, ropeY, 0.08], [ropeX + ropeR + 0.5, ropeY + 0.3, 0.26], [ropeX + ropeR + 1.15, ropeY + 0.8, 0.5]], m);
      if (a.rope === 'doubled') {
        const m2 = ropeMat(firstRope + 1 + Math.floor(random() * 3), RR * 0.8);
        loop(single ? 0 : -ropeX, ropeY - (single ? 0.11 : 0), m2, RR * 0.8, -0.1);
        const x2 = (single ? 0 : -ropeX) - ropeR, y2 = ropeY - (single ? 0.11 : 0);
        line([[x2, y2, 0.08], [x2 - 0.45, y2 + 0.12, 0.3], [x2 - 1.0, y2 + 0.5, 0.62]], m2, RR * 0.8);
      }
    } else if (a.rope === 'slack') {
      const m = ropeMat(firstRope, RR);
      loop(ropeX, ropeY - 0.08, m, RR, 0.3);
      const e = exit(ropeX), g = y0 + RR;
      line([[e[0], e[1] - 0.1, e[2]], [e[0] + 0.1, g + 0.05, e[2] + 0.3], [e[0] + 0.45, g, e[2] + 0.42], [e[0] + 0.75, g, e[2] + 0.1], [0.85, g, -0.25], [0.88, g - 0.02, -0.7]], m);
    } else if (a.rope === 'castoff') {
      const m = ropeMat(firstRope, RR);
      const g = y0 + RR, cx = single ? 0.58 : 0.2, cz = single ? 0.25 : 0.5;
      const points: [number, number, number][] = [];
      for (let i = 0; i < 26; i++) { const t = i * 0.62, r = 0.34 - i * 0.004 + random() * 0.05; points.push([cx + Math.cos(t) * r * 0.8, g + i * 0.009 + random() * 0.01, cz + Math.sin(t) * r * 0.6]); }
      line(points, m);
      const eye = s.mesh(new THREE.TorusGeometry(0.2, RR, 8, 24), m, [cx - 0.5, g + 0.01, cz + 0.2]);
      eye.rotation.x = Math.PI / 2; eye.scale.set(1.3, 0.8, 1);
      const wet = s.cylinder(0.75, 0.75, 0.008, [cx - 0.1, y0 + 0.004, cz], new THREE.MeshStandardMaterial({ color: '#30383c', roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.55, depthWrite: false }), 20);
      wet.scale.z = 0.7; wet.castShadow = false;
    } else if (a.rope === 'parted') {
      const m = ropeMat(firstRope, RR);
      loop(ropeX, ropeY, m);
      const e = exit(ropeX), end: [number, number, number] = [e[0] + 0.1, e[1] - 0.12, e[2] + 0.5];
      line([e, [e[0] + 0.05, e[1] - 0.02, e[2] + 0.25], end], m);
      fray(end, m);
    } else {
      // Bare: a bright worn groove where the lines have run.
      const groove = s.mesh(new THREE.TorusGeometry(ropeR - 0.04, 0.018, 6, 28), s.material('#b9bcbc', { metalness: 0.85, roughness: 0.25 }), [ropeX, ropeY, 0]);
      groove.rotation.x = Math.PI / 2;
    }

    // Whatever has settled on the head.
    const seat = new THREE.Group();
    seat.position.set(topX, topY, topZ);
    seat.rotation.y = (random() - 0.5) * 1.2;
    s.root.add(seat);
    const put = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], scale: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at); mesh.scale.set(...scale);
      mesh.castShadow = mesh.receiveShadow = true;
      seat.add(mesh);
      return mesh;
    };
    const sphere = new THREE.SphereGeometry(1, 16, 10);
    let bob: THREE.Object3D | null = null;
    let steam: THREE.Mesh[] = [];
    if (a.sitter === 'gull') {
      const white = s.material('#f1f0ea'), grey = s.material('#8f979d'), yellow = s.material('#e9b21c');
      put(sphere, white, [0, 0.17, 0], [0.09, 0.085, 0.16]);
      put(sphere, grey, [0, 0.19, -0.03], [0.095, 0.06, 0.15]);
      put(sphere, s.material('#1f2123'), [0, 0.19, -0.19], [0.035, 0.02, 0.06]);
      bob = put(sphere, white, [0, 0.3, 0.11], [0.05, 0.05, 0.055]);
      put(new THREE.ConeGeometry(0.016, 0.07, 6).rotateX(Math.PI / 2), yellow, [0, 0.29, 0.19]);
      for (const x of [-0.03, 0.03]) put(new THREE.CylinderGeometry(0.006, 0.006, 0.1, 5), yellow, [x, 0.05, 0.02]);
    } else if (a.sitter === 'cormorant') {
      const black = s.material('#1c2022', { roughness: 0.5 });
      put(sphere, black, [0, 0.24, 0], [0.09, 0.2, 0.1]);
      put(new THREE.CylinderGeometry(0.03, 0.045, 0.2, 8), black, [0, 0.48, 0.03]).rotation.x = 0.3;
      bob = put(sphere, black, [0, 0.59, 0.07], [0.04, 0.04, 0.05]);
      put(new THREE.ConeGeometry(0.014, 0.1, 6).rotateX(Math.PI / 2), s.material('#c9a23a'), [0, 0.59, 0.16]);
      for (const side of [-1, 1]) {
        const wing = put(new THREE.BoxGeometry(0.34, 0.2, 0.02), black, [side * 0.22, 0.36, -0.02]);
        wing.rotation.z = side * 0.35;
        put(new THREE.BoxGeometry(0.2, 0.26, 0.02), black, [side * 0.42, 0.38, -0.02]).rotation.z = side * 0.1;
      }
      put(new THREE.BoxGeometry(0.1, 0.02, 0.16), black, [0, 0.06, -0.12]);
    } else if (a.sitter === 'mug') {
      const enamel = s.material(['#e9e6da', '#2b5a94', '#c22a22'][Math.floor(random() * 3)], { roughness: 0.3 });
      put(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), enamel, [0, 0.05, 0]);
      put(new THREE.CylinderGeometry(0.039, 0.039, 0.004, 16), s.material('#5a3518', { roughness: 0.2 }), [0, 0.098, 0]);
      put(new THREE.TorusGeometry(0.028, 0.008, 6, 12), enamel, [0.055, 0.05, 0]);
      steam = [0, 1, 2].map((i) => put(sphere, halo('#ffffff', 0.3), [0.01 * i, 0.16 + i * 0.07, 0], [0.03 + i * 0.012, 0.04, 0.03 + i * 0.012]));
      for (const puff of steam) puff.castShadow = false;
    } else if (a.sitter === 'jacket') {
      const hiVisTex = paint(128, 128, (ctx, w, h) => {
        ctx.fillStyle = random() < 0.5 ? '#f2e21c' : '#ff7a1a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#d8dcdc'; ctx.fillRect(0, h * 0.5, w, h * 0.09); ctx.fillRect(0, h * 0.68, w, h * 0.09);
      });
      const cloth = skin(hiVisTex, { roughness: 0.9, side: THREE.DoubleSide });
      const drape = put(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), cloth, [0, -0.2, 0], [perch + 0.2, 0.26, perch + 0.14]);
      drape.rotation.z = 0.08;
      put(new THREE.BoxGeometry(0.16, 0.5, 0.03), cloth, [perch + 0.12, -0.42, 0.1]).rotation.z = 0.25;
      put(new THREE.BoxGeometry(0.16, 0.42, 0.03), cloth, [-perch - 0.1, -0.38, -0.05]).rotation.z = -0.2;
    } else if (a.sitter === 'cat') {
      const fur = s.material(['#2a2623', '#c8762a', '#8a8782', '#e8e2d2'][Math.floor(random() * 4)], { roughness: 0.95 });
      put(sphere, fur, [0, 0.1, 0], [0.12, 0.1, 0.19]);
      bob = put(sphere, fur, [0, 0.19, 0.16], [0.075, 0.068, 0.07]);
      for (const x of [-0.045, 0.045]) put(new THREE.ConeGeometry(0.028, 0.06, 4), fur, [x, 0.265, 0.16]);
      const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.06, -0.17), new THREE.Vector3(0.14, 0.04, -0.14), new THREE.Vector3(0.17, 0.03, 0.02)]), 12, 0.022, 6), fur);
      tail.castShadow = true; seat.add(tail);
      for (const x of [-0.028, 0.028]) put(sphere, s.material('#d8e24a', { emissive: '#d8e24a', emissiveIntensity: 0.6 }), [x, 0.2, 0.225], [0.012, 0.012, 0.006]);
    } else if (a.sitter === 'boot') {
      const leather = s.material('#5b3d22', { roughness: 0.85 });
      put(new THREE.CylinderGeometry(0.058, 0.055, 0.2, 12), leather, [0, 0.14, -0.05]);
      put(sphere, leather, [0, 0.06, 0.05], [0.06, 0.05, 0.13]);
      put(new THREE.BoxGeometry(0.12, 0.025, 0.28), s.material('#1b1b1b'), [0, 0.0125, 0.03]);
      put(new THREE.TorusGeometry(0.056, 0.012, 6, 14).rotateX(Math.PI / 2), s.material('#e3b11b'), [0, 0.24, -0.05]);
      seat.rotation.z = 0.05;
    }

    // Clutter by density: a puddle, a spare shackle, gull droppings.
    if (mood.density > 0.5) s.ring(0.09, 0.022, [-0.75, QH + 0.022, 0.55], s.material('#7a7f82', { metalness: 0.7 })).rotation.x = Math.PI / 2;
    if (a.sitter === 'gull' || a.sitter === 'cormorant' || mood.wear > 0.7) {
      const splats = Array.from({ length: 5 + Math.floor(random() * 8) }, () => ({ at: [(random() - 0.5) * 1.5, QH + 0.003, (random() - 0.5) * 1.2] as [number, number, number], size: 0.5 + random() }));
      s.scatter(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 8), s.material('#eeeee6'), splats).castShadow = false;
    }

    return s.finish({
      footprint: 0.95,
      update: (_dt, time) => {
        if (bob) bob.rotation.y = Math.sin(time * mix(0.3, 2.2, mood.energy)) * 0.6;
        steam.forEach((puff, i) => { puff.position.y = 0.16 + ((time * 0.08 + i * 0.07) % 0.21); });
      },
    });
  },
});
