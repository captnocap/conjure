import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export default defineThing({
  questions: {
    holds: choice('What does the rack mostly hold?', {
      balls: 'Medicine balls on both tiers, small to enormous.',
      dumbbells: 'Rows of dumbbells, with a ball or two squeezed in.',
      mixed: 'Balls along the top and dumbbells underneath.',
      bare: 'Almost nothing: one ball and one odd dumbbell left on a picked-over rack.',
    }),
    made: choice('What are the weights made of?', {
      leather: 'Stitched leather in orange-peel panels, laced shut, with iron globe dumbbells.',
      rubber: 'Black ribbed rubber with the weight painted on in white, and rubber-ended dumbbells.',
      tins: 'Improvised: paint tins filled with cement, and tins set on a pipe for dumbbells.',
      canvas: 'Hand-sewn canvas stuffed with sand and rags, patched, with rusty iron dumbbells.',
    }),
    stray: choice('Has one ball left the rack?', {
      none: 'No: everything is racked.',
      rolled: 'One has rolled away across the floor.',
      split: 'One lies burst on the floor, its sand and horsehair spilling out.',
      parked: 'One sits on the floor against the leg with a towel dropped over it.',
    }),
    rope: choice('Where is the skipping rope?', {
      coiled: 'Coiled neatly on a hook at the end of the rack, handles hanging.',
      draped: 'Thrown over the top rail, both handles dangling.',
      floor: 'Dropped in a loose tangle on the floor in front.',
      none: 'There is no rope.',
    }),
    frame: choice('How is the frame finished?', {
      rust: 'Bare angle iron, welded and rusting.',
      green: 'Hammered machine green.',
      red: 'Red oxide primer that never got a top coat.',
      cream: 'Chipped hospital cream.',
      blue: 'Glossy royal blue, the club colour.',
    }),
    extra: choice('What else lives beside it?', {
      roller: 'A wooden ab-roller wheel with a dowel through it.',
      kettlebells: 'Two iron kettlebells.',
      clubs: 'A pair of turned wooden Indian clubs standing upright.',
      chalk: 'A bowl of chalk and a towel over the end rail.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const L = 1.5, Dp = 0.46, TOP = 0.66, LOW = 0.2;
    const frameCol = { rust: '#6d4a35', green: '#4f6f5c', red: '#8a3a2a', cream: '#d6ccb0', blue: '#234c9a' }[a.frame];
    const frame = s.material(frameCol, { metalness: a.frame === 'rust' ? 0.5 : 0.35, roughness: a.frame === 'blue' ? 0.35 : 0.7 });
    const iron = s.material('#2c2d2f', { metalness: 0.7, roughness: mix(0.45, 0.85, mood.wear) });
    const rusty = s.material('#5d4233', { metalness: 0.5, roughness: 0.9 });
    const wood = s.material('#a67c4d', { roughness: 0.6 });
    const cloth = s.material('#e4decd', { roughness: 1 });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // Frame: four posts, two tiers of rails, end braces, feet.
    for (const x of [-1, 1]) for (const z of [-1, 1]) {
      s.box([0.04, TOP + 0.1, 0.04], [x * L / 2, (TOP + 0.1) / 2, z * Dp / 2], frame);
      s.box([0.1, 0.012, 0.1], [x * L / 2, 0.006, z * Dp / 2], frame);
    }
    for (const x of [-1, 1]) { s.box([0.03, 0.04, Dp], [x * L / 2, TOP - 0.01, 0], frame); s.box([0.03, 0.04, Dp], [x * L / 2, LOW - 0.01, 0], frame); s.rod([x * L / 2, LOW, -Dp / 2], [x * L / 2, TOP, Dp / 2], 0.012, frame); }
    for (const y of [TOP, LOW]) for (const z of [-0.1, 0.1]) s.rod([-L / 2, y, z], [L / 2, y, z], 0.016, frame);
    s.box([L, 0.04, 0.03], [0, TOP + 0.08, -Dp / 2], frame);
    // weld blobs and chips
    for (let i = 0; i < 10; i++) s.ball([0.014, 0.01, 0.014], [pick([-1, 1]) * L / 2 + (random() - 0.5) * 0.02, pick([TOP, LOW]) + (random() - 0.5) * 0.02, pick([-0.1, 0.1])], iron, 6);

    // Ball skins.
    const leatherBase = mood.warmth > 0.5 ? ['#8b5a34', '#6f3f26', '#a36b3c', '#7a2c22'] : ['#6b4a36', '#4f3a30', '#7d5c44', '#5f2a26'];
    const ballSkin = (index: number) => {
      const weight = [2, 3, 4, 5, 6, 8, 10][index % 7];
      return new THREE.MeshStandardMaterial({
        roughness: a.made === 'rubber' ? 0.55 : 0.85,
        map: paint(512, 256, (ctx) => {
          if (a.made === 'leather') {
            const base = pick(leatherBase), alt = pick(leatherBase);
            for (let i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? base : mood.cheer > 0.5 ? alt : base; ctx.fillRect(i * 512 / 6, 0, 512 / 6 + 1, 256); }
            for (let i = 0; i < 50; i++) { ctx.fillStyle = `rgba(${random() > 0.5 ? '255,230,190' : '20,12,8'},${0.04 + random() * 0.08 * (0.5 + mood.wear)})`; ctx.beginPath(); ctx.ellipse(random() * 512, random() * 256, 8 + random() * 40, 5 + random() * 20, random() * 3, 0, 7); ctx.fill(); }
            ctx.strokeStyle = 'rgba(25,15,10,0.85)'; ctx.lineWidth = 3;
            for (let i = 0; i <= 6; i++) { const x = i * 512 / 6; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
            ctx.fillStyle = '#e4d6b0';
            for (let i = 0; i <= 6; i++) for (let y = 30; y < 230; y += 9) ctx.fillRect(i * 512 / 6 - 6, y, 12, 2.5);
            ctx.fillStyle = 'rgba(25,15,10,0.9)'; ctx.fillRect(0, 0, 512, 26); ctx.fillRect(0, 230, 512, 26);
            // the laced filling slit
            ctx.fillRect(210, 90, 8, 80); ctx.strokeStyle = '#e4d6b0'; ctx.lineWidth = 3;
            for (let y = 96; y < 166; y += 14) { ctx.beginPath(); ctx.moveTo(200, y); ctx.lineTo(228, y + 10); ctx.moveTo(228, y); ctx.lineTo(200, y + 10); ctx.stroke(); }
          } else if (a.made === 'rubber') {
            ctx.fillStyle = mood.cheer > 0.6 ? pick(['#a8322a', '#28558f', '#2f6b4a', '#1f1f21']) : '#1f1f21'; ctx.fillRect(0, 0, 512, 256);
            ctx.fillStyle = 'rgba(255,255,255,0.09)'; for (let y = 20; y < 256; y += 14) ctx.fillRect(0, y, 512, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 26; y < 256; y += 14) ctx.fillRect(0, y, 512, 3);
            ctx.fillStyle = '#e9e4d6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 74px sans-serif';
            for (const x of [128, 384]) { ctx.fillText(`${weight}`, x - 22, 128); ctx.font = 'bold 34px sans-serif'; ctx.fillText('KG', x + 34, 140); ctx.font = 'bold 74px sans-serif'; }
            for (let i = 0; i < 40 * mood.wear; i++) { ctx.fillStyle = 'rgba(190,185,175,0.18)'; ctx.fillRect(random() * 512, random() * 256, 4 + random() * 30, 2 + random() * 4); }
          } else {
            ctx.fillStyle = pick(['#b9ab87', '#a89f84', '#c4b48a']); ctx.fillRect(0, 0, 512, 256);
            for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(60,50,30,${random() * 0.12})`; ctx.fillRect(random() * 512, random() * 256, 1 + random() * 8, 1); }
            for (let i = 0; i < 3 + mood.wear * 5; i++) {
              const x = random() * 460, y = 40 + random() * 150, w = 34 + random() * 50, h = 26 + random() * 40;
              ctx.fillStyle = pick(['#6f7f8f', '#8a4a3a', '#d8cfb4', '#56634a']); ctx.fillRect(x, y, w, h);
              ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.strokeRect(x + 3, y + 3, w - 6, h - 6); ctx.setLineDash([]);
            }
            ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 3; ctx.setLineDash([9, 6]);
            for (const x of [0, 256]) { ctx.beginPath(); ctx.moveTo(x + 4, 0); ctx.lineTo(x + 4, 256); ctx.stroke(); }
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(30,25,20,0.8)'; ctx.font = 'bold 50px monospace'; ctx.textAlign = 'center'; ctx.fillText(`${weight * 2} LB`, 128, 140);
          }
        }),
      });
    };
    const tinSkin = () => {
      const colour = pick(['#c9c3b2', '#a8322a', '#2f6b8a', '#d8b12f', '#3d6b4a', '#e9e2cf']);
      return new THREE.MeshStandardMaterial({
        metalness: 0.45, roughness: 0.5,
        map: paint(256, 128, (ctx) => {
          ctx.fillStyle = '#b6bbbd'; ctx.fillRect(0, 0, 256, 128);
          ctx.fillStyle = '#f0ead8'; ctx.fillRect(0, 26, 256, 76);
          ctx.fillStyle = colour; ctx.fillRect(0, 40, 256, 44);
          ctx.fillStyle = '#1e1c1a'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; for (const x of [64, 192]) ctx.fillText('PAINT', x, 70);
          ctx.fillStyle = colour;
          for (let i = 0; i < 9; i++) { const x = random() * 256, len = 20 + random() * 80; ctx.fillRect(x, 0, 5 + random() * 8, len); ctx.beginPath(); ctx.arc(x + 4, len, 5, 0, 7); ctx.fill(); }
          for (let i = 0; i < 12 * mood.wear; i++) { ctx.fillStyle = 'rgba(110,60,30,0.5)'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 128, 3 + random() * 10, 2 + random() * 6, 0, 0, 7); ctx.fill(); }
        }),
      });
    };
    const cement = s.material('#8f8d86', { roughness: 1 });
    const useTins = a.made === 'tins';
    let skinIndex = Math.floor(random() * 7);

    const makeBall = (r: number) => {
      const g = new THREE.Group();
      if (useTins) {
        const h = r * 1.5;
        const tin = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.82, h, 24), tinSkin()); tin.castShadow = tin.receiveShadow = true; tin.rotation.y = random() * 6; g.add(tin);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.76, r * 0.76, 0.01, 20), cement); top.position.y = h / 2; g.add(top);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.006, 6, 20, Math.PI), iron); handle.position.y = h / 2 - 0.03; handle.rotation.y = random() * 3; handle.rotation.x = (random() - 0.5) * 1.6; handle.castShadow = true; g.add(handle);
        g.userData.rest = h / 2;
      } else {
        const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), ballSkin(skinIndex++)); ball.castShadow = ball.receiveShadow = true;
        ball.rotation.set(random() * 6, random() * 6, random() * 6); g.add(ball);
        g.userData.rest = r;
      }
      s.root.add(g);
      return g;
    };
    const makeDumbbell = (r: number) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const metal = a.made === 'canvas' ? rusty : iron;
      const half = r * 1.9;
      const bar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, half * 2, 10), a.made === 'tins' ? s.material('#8a9196', { metalness: 0.7, roughness: 0.4 }) : metal)); bar.rotation.x = Math.PI / 2;
      for (const d of [-1, 1]) {
        if (a.made === 'tins') { const tin = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 1.5, 18), tinSkin())); tin.rotation.x = Math.PI / 2; tin.position.z = d * half; const cap = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.92, 0.008, 16), cement)); cap.rotation.x = Math.PI / 2; cap.position.z = d * (half - r * 0.75); }
        else if (a.made === 'rubber') { const end = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.9, 6), s.material('#1c1c1e', { roughness: 0.6 }))); end.rotation.x = Math.PI / 2; end.position.z = d * half; }
        else { const globe = add(new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), metal)); globe.position.z = d * half; const collar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), metal)); collar.rotation.x = Math.PI / 2; collar.position.z = d * (half - r); }
      }
      g.userData.rest = r;
      s.root.add(g);
      return g;
    };

    const fill = a.holds === 'bare' ? 0 : mix(0.55, 1, mood.density);
    const tray = (y: number) => { s.box([L - 0.04, 0.012, 0.34], [0, y + 0.02, 0], useTins ? wood : frame); return y + 0.026; };
    const rowOfBalls = (y: number, radii: number[]) => {
      const flatY = useTins ? tray(y) : 0;
      let x = -L / 2 + 0.06;
      radii.forEach((r) => {
        x += r;
        if (random() < fill) {
          const ball = makeBall(r);
          ball.position.set(x + (random() - 0.5) * 0.01, useTins ? flatY + ball.userData.rest : y + Math.sqrt(Math.max((r + 0.016) ** 2 - 0.01, 0.0004)), (random() - 0.5) * 0.02);
        }
        x += r + 0.012;
      });
    };
    const rowOfDumbbells = (y: number, big: boolean) => {
      const flatY = tray(y);
      const count = big ? 6 : 8;
      for (let i = 0; i < count; i++) {
        if (random() > fill) continue;
        const r = (big ? 0.05 : 0.034) + i * (big ? 0.006 : 0.004);
        const d = makeDumbbell(r);
        d.position.set(-L / 2 + 0.12 + i * (L - 0.24) / (count - 1), flatY + r, (random() - 0.5) * 0.03);
        d.rotation.y = (random() - 0.5) * 0.14;
      }
    };
    const small = [0.105, 0.12, 0.135, 0.15, 0.165], large = [0.17, 0.19, 0.2, 0.12];
    const shuffle = <T,>(list: T[]) => (mood.wear > 0.55 ? list.map((v) => [random(), v] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]) : list);
    if (a.holds === 'balls') { rowOfBalls(TOP, shuffle(small)); rowOfBalls(LOW, shuffle(large)); }
    else if (a.holds === 'dumbbells') { rowOfDumbbells(TOP, false); rowOfDumbbells(LOW, true); const b = makeBall(0.16); b.position.set(L / 2 - 0.22, TOP + 0.026 + b.userData.rest, 0); }
    else if (a.holds === 'mixed') { rowOfBalls(TOP, shuffle(small)); rowOfDumbbells(LOW, true); }
    else {
      const b = makeBall(0.15); b.position.set(-L / 2 + 0.3 + random() * 0.5, useTins ? tray(TOP) + b.userData.rest : TOP + Math.sqrt((0.166) ** 2 - 0.01), 0);
      const flatY = tray(LOW); const d = makeDumbbell(0.06); d.position.set(0.1 + random() * 0.4, flatY + 0.06, 0); d.rotation.y = 0.5;
      // dust shadows where the others stood
      for (let i = 0; i < 4; i++) { const ghost = s.cylinder(0.07, 0.07, 0.002, [-L / 2 + 0.2 + i * 0.3, flatY + 0.002, 0], s.material('#1b1b1c', { roughness: 1 }), 16); ghost.scale.z = 0.5; }
    }

    // The stray.
    let roller: THREE.Object3D | null = null;
    const sx = -0.15 + random() * 0.7, sz = Dp / 2 + 0.26 + random() * 0.1;
    if (a.stray === 'rolled') { const b = makeBall(0.15); b.position.set(sx, b.userData.rest, sz + 0.08); if (useTins) { b.rotation.z = Math.PI / 2; b.position.y = 0.15 * 0.82; } roller = b; }
    else if (a.stray === 'parked') {
      const b = makeBall(0.17); b.position.set(L / 2 + 0.2, b.userData.rest, Dp / 2 + 0.02);
      const top = b.userData.rest * 2;
      s.ball([0.19, 0.03, 0.17], [L / 2 + 0.2, top, Dp / 2 + 0.02], cloth, 14);
      for (let i = 0; i < 5; i++) { const t = i / 5 * 6.283 + random(); s.box([0.12, 0.1 + random() * 0.05, 0.012], [L / 2 + 0.2 + Math.cos(t) * 0.16, top - 0.06, Dp / 2 + 0.02 + Math.sin(t) * 0.15], cloth).rotation.y = -t + Math.PI / 2; }
    } else if (a.stray === 'split') {
      const sand = s.material('#cdb98a', { roughness: 1 });
      if (useTins) { const b = makeBall(0.15); b.position.set(sx, 0.123, sz); b.rotation.set(0, random() * 3, Math.PI / 2); s.box([0.3, 0.05, 0.22], [sx + 0.26, 0.025, sz], cement).rotation.y = 0.4; for (let i = 0; i < 5; i++) s.box([0.06 + random() * 0.06, 0.04, 0.05 + random() * 0.05], [sx + 0.2 + random() * 0.3, 0.02, sz - 0.2 + random() * 0.4], cement).rotation.y = random() * 3; }
      else {
        const b = makeBall(0.16); b.position.set(sx, 0.11, sz); b.scale.set(1.1, 0.68, 1.05);
        const gash = s.ball([0.07, 0.03, 0.1], [sx + 0.12, 0.12, sz + 0.03], s.material('#17110d', { roughness: 1 }), 10); gash.rotation.z = -0.5;
        s.lathe([[0.001, 0.07], [0.08, 0.045], [0.16, 0.012], [0.21, 0]], sand, [sx + 0.26, 0, sz + 0.04]);
        const grains = Array.from({ length: 50 }, () => { const t = random() * 6.283, d = 0.16 + random() * 0.16; return { at: [sx + 0.26 + Math.cos(t) * d, 0.006, sz + 0.04 + Math.sin(t) * d * 0.8] as [number, number, number], size: 0.4 + random() * 0.9 }; });
        s.scatter(new THREE.SphereGeometry(0.012, 5, 4), sand, grains);
        for (let i = 0; i < 4; i++) s.tube([[sx + 0.1, 0.1, sz + 0.03], [sx + 0.16 + random() * 0.05, 0.07 + random() * 0.04, sz + 0.03 + (random() - 0.5) * 0.08], [sx + 0.22 + random() * 0.06, 0.05, sz + 0.03 + (random() - 0.5) * 0.14]], 0.005, s.material('#3a2c20', { roughness: 1 }));
      }
    }

    // Skipping rope.
    const ropeMat = s.material(a.made === 'rubber' ? '#1e1e20' : '#8a6a44', { roughness: 0.8 });
    const handleAt = (from: [number, number, number], to: [number, number, number]) => { s.rod(from, to, 0.016, wood, 0.012); s.ball([0.018, 0.018, 0.018], to, wood, 8); };
    if (a.rope === 'coiled') {
      const hx = -L / 2 - 0.02, hy = TOP + 0.02;
      s.rod([-L / 2, hy, 0.06], [hx - 0.07, hy, 0.06], 0.008, frame); s.rod([hx - 0.07, hy, 0.06], [hx - 0.07, hy + 0.05, 0.06], 0.008, frame);
      for (let i = 0; i < 4; i++) { const coil = s.ring(0.11 + random() * 0.015, 0.008, [hx - 0.04 - i * 0.008, hy - 0.16, 0.06 + (random() - 0.5) * 0.02], ropeMat); coil.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.2; coil.scale.y = 1.45; }
      handleAt([hx - 0.05, hy - 0.3, 0.1], [hx - 0.05, hy - 0.46, 0.11]); handleAt([hx - 0.05, hy - 0.28, 0.02], [hx - 0.06, hy - 0.44, 0.0]);
    } else if (a.rope === 'draped') {
      const x = 0.3 + random() * 0.3, y = TOP + 0.105, zb = -Dp / 2;
      s.tube([[x - 0.04, 0.3, zb - 0.05], [x - 0.02, y - 0.1, zb - 0.03], [x, y, zb], [x + 0.03, y - 0.12, zb + 0.04], [x + 0.1, 0.42, zb + 0.06], [x + 0.2, y - 0.14, zb + 0.04], [x + 0.24, y, zb], [x + 0.26, y - 0.1, zb - 0.03], [x + 0.28, 0.34, zb - 0.05]], 0.008, ropeMat);
      handleAt([x - 0.04, 0.3, zb - 0.05], [x - 0.045, 0.14, zb - 0.05]); handleAt([x + 0.28, 0.34, zb - 0.05], [x + 0.285, 0.18, zb - 0.05]);
    } else if (a.rope === 'floor') {
      const cx = -0.45 + random() * 0.2, cz = Dp / 2 + 0.24;
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 14; i++) { const t = i / 14 * Math.PI * 3.2; pts.push([cx + Math.cos(t) * (0.1 + i * 0.012) + (random() - 0.5) * 0.04, 0.009, cz + Math.sin(t * 1.3) * (0.09 + i * 0.008) + (random() - 0.5) * 0.04]); }
      s.tube(pts, 0.008, ropeMat);
      const first = pts[0], last = pts[pts.length - 1];
      handleAt(first, [first[0] - 0.14, 0.014, first[2] + 0.06]); handleAt(last, [last[0] + 0.13, 0.014, last[2] + 0.08]);
    }

    // What else lives beside it.
    const ex = L / 2 + (a.stray === 'parked' ? -0.35 : 0.22), ez = a.stray === 'parked' ? Dp / 2 + 0.3 : 0.05;
    if (a.extra === 'roller') {
      const wheel = s.cylinder(0.09, 0.09, 0.045, [ex, 0.09, ez + 0.1], wood, 28); wheel.rotation.x = Math.PI / 2;
      s.ring(0.09, 0.012, [ex, 0.09, ez + 0.1], s.material('#2a2a2c', { roughness: 0.7 }));
      const dowel = s.cylinder(0.014, 0.014, 0.42, [ex, 0.09, ez + 0.1], s.material('#7a5a38'), 10); dowel.rotation.x = Math.PI / 2;
      for (const d of [-1, 1]) { const grip = s.cylinder(0.019, 0.019, 0.1, [ex, 0.09, ez + 0.1 + d * 0.16], s.material('#3a2c22', { roughness: 0.9 }), 10); grip.rotation.x = Math.PI / 2; }
    } else if (a.extra === 'kettlebells') {
      for (let i = 0; i < 2; i++) { const r = 0.085 + i * 0.02, x = ex + i * 0.04, z = ez - 0.1 + i * 0.26; s.ball([r, r * 0.95, r], [x, r * 0.92, z], iron, 16); const handle = s.ring(r * 0.6, 0.014, [x, r * 1.75, z], iron, Math.PI); handle.rotation.y = random() * 3; s.cylinder(r * 0.5, r * 0.6, 0.012, [x, 0.006, z], iron, 12); }
    } else if (a.extra === 'clubs') {
      for (let i = 0; i < 2; i++) {
        const club = s.lathe([[0.001, 0], [0.045, 0], [0.058, 0.06], [0.06, 0.16], [0.04, 0.3], [0.02, 0.42], [0.016, 0.5], [0.024, 0.53], [0.018, 0.56], [0.001, 0.565]], s.material(i ? '#9a6a3a' : '#8a5a32', { roughness: 0.4 }), [ex + i * 0.03, 0, ez - 0.08 + i * 0.18]);
        if (i && mood.wear > 0.6) { club.rotation.z = Math.PI / 2; club.position.set(ex + 0.3, 0.06, ez + 0.2); club.rotation.y = 0.6; }
        s.ring(0.059, 0.004, [club.position.x, club.rotation.z ? -1 : 0.11, club.position.z], s.material('#2a1c12')).rotation.x = Math.PI / 2;
      }
    } else {
      s.lathe([[0.001, 0.01], [0.09, 0.01], [0.15, 0.09], [0.158, 0.09], [0.1, 0], [0.001, 0]], s.material('#7d868b', { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), [ex, 0, ez + 0.1]);
      s.ball([0.125, 0.03, 0.125], [ex, 0.062, ez + 0.1], s.material('#f4f1e8', { roughness: 1 }), 14);
      for (let i = 0; i < 12; i++) { const t = random() * 6.283, d = 0.17 + random() * 0.14; s.cylinder(0.02 + random() * 0.03, 0.03 + random() * 0.03, 0.003, [ex + Math.cos(t) * d, 0.002, ez + 0.1 + Math.sin(t) * d], s.material('#f4f1e8', { roughness: 1 }), 8); }
      const tx = L / 2;
      s.box([0.02, 0.035, 0.3], [tx, TOP + 0.022, 0], cloth); s.box([0.016, 0.34, 0.3], [tx + 0.028, TOP - 0.15, 0], cloth); s.box([0.016, 0.22, 0.3], [tx - 0.028, TOP - 0.09, 0], cloth);
      for (const z of [-0.11, 0.11]) s.box([0.018, 0.34, 0.02], [tx + 0.029, TOP - 0.15, z], s.material('#a8322a', { roughness: 1 }));
    }

    const push = mix(0, 0.05, mood.energy * mood.energy);
    const startX = roller ? roller.position.x : 0;
    return s.finish({
      update: (_dt, time) => {
        if (!roller || useTins) return;
        const offset = Math.sin(time * 1.4) * push;
        roller.position.x = startX + offset;
        roller.rotation.z = -offset / 0.15;
      },
    });
  },
});
