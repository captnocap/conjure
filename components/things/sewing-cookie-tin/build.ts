import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const STYLES = {
  royal: { base: '#1f3f8f', band: '#d9b24a', ink: '#f4ecd2', word: 'BUTTER COOKIES' },
  tartan: { base: '#a3262c', band: '#1d3b2a', ink: '#f2e6c4', word: 'SHORTBREAD' },
  delft: { base: '#f1efe6', band: '#2a4f9a', ink: '#2a4f9a', word: 'FINE BISCUITS' },
  festive: { base: '#1f5a3c', band: '#d9b24a', ink: '#f6e9c0', word: 'SEASONS GREETINGS' },
} as const;

const THREADS = ['#c8342f', '#e7b530', '#2f6fb3', '#2f8a57', '#f1ede2', '#1e1d21', '#d86a9c', '#7a4ea3', '#e07f2c', '#8a5a34'];
const BUTTONS = ['#f1ede2', '#e9dcc0', '#1e1d21', '#8a5a34', '#c8342f', '#2f6fb3', '#7fa58a', '#d9a5b3', '#c9a23a', '#565a63'];
const COINS = ['#c9a23a', '#b9bcc0', '#b06a3a', '#d6c27a', '#9fa3a8'];

export default defineThing({
  questions: {
    contents: choice('What is actually inside the tin?', {
      sewing: 'Thread spools, a tomato pincushion bristling with pins, a tape measure and loose buttons. No biscuits, as every grandchild learns.',
      cookies: 'Real butter cookies in white pleated paper cups, against all expectation.',
      coins: 'Saved coins heaped to the rim with a rolled wad of notes in a rubber band: the money nobody knew about.',
      buttons: 'Nothing but buttons, hundreds of them, cut from every worn-out shirt for fifty years.',
      keepsakes: 'A ribbon-tied bundle of letters, a few small photographs and a medal.',
      crumbs: 'Only empty paper cups and crumbs: someone got here first.',
    }),
    tin: choice('What does the tin look like?', {
      royal: 'Royal blue with gold bands and a ring of biscuits on the lid, the classic.',
      tartan: 'Red tartan with a dark green band, a shortbread tin from a holiday.',
      delft: 'White with a cobalt-blue windmill scene, like painted china.',
      festive: 'Deep green and gold with holly, a Christmas gift kept ever since.',
    }),
    lid: choice('Where is the lid?', {
      leaning: 'Propped upright against the back of the tin, showing its picture.',
      flat: 'Lying upside down beside the tin, bare metal inside.',
      ajar: 'Still on the tin but slid a third of the way off, a first peek.',
      under: 'Nested underneath the tin like a saucer.',
    }),
    size: choice('How big is the tin?', {
      small: 'A small tin that fits in one hand.',
      classic: 'The ordinary supermarket size.',
      family: 'A big family-size drum.',
    }),
    fill: score('How full is it?', ['A few things rattling in the bottom', 'Half full', 'Comfortably full', 'Heaped and overflowing']),
    escaped: choice('What lies on the table beside it?', {
      nothing: 'Nothing: everything is put away.',
      scatter: 'A few pieces of whatever is inside, spilled and scattered around.',
      tools: 'A pair of scissors and a thimble laid out for a job in progress.',
      note: 'A small folded handwritten note.',
    }),
    under: choice('What does it sit on?', {
      bare: 'Straight on the table.',
      doily: 'A round crocheted lace doily.',
      towel: 'A folded checked tea towel.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const style = STYLES[a.tin];
    const R = { small: 0.075, classic: 0.1, family: 0.13 }[a.size];
    const H = R * 0.6;
    const inner = R - 0.004;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const group = (parent: THREE.Object3D = s.root) => { const g = new THREE.Group(); parent.add(g); return g; };
    const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      draw(canvas.getContext('2d')!);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const rust = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      for (let i = 0; i < Math.round(mood.wear * 40); i++) {
        const x = random() * w, y = random() * h, r = 2 + random() * 14 * mood.wear;
        ctx.fillStyle = `rgba(${110 + random() * 40},${60 + random() * 25},30,${0.35 + random() * 0.4})`;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.4 + random() * 0.7), random() * 3, 0, 7); ctx.fill();
      }
      ctx.fillStyle = `rgba(120,110,95,${mood.wear * 0.25})`; ctx.fillRect(0, 0, w, h);
    };

    const gold = new THREE.MeshStandardMaterial({ color: '#d8c27c', metalness: 0.8, roughness: 0.32 + mood.wear * 0.3 });
    const steel = new THREE.MeshStandardMaterial({ color: '#cfd3d6', metalness: 0.85, roughness: 0.25 });

    // ---- what it sits on ----------------------------------------------------------------
    let base = 0;
    if (a.under === 'doily') {
      const lace = paint(512, 512, (ctx) => {
        ctx.translate(256, 256);
        ctx.strokeStyle = '#efe4c8'; ctx.fillStyle = '#efe4c8';
        ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7); ctx.fill();
        ctx.lineWidth = 7;
        for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.arc(0, 0, 165 + ring * 26, 0, 7); ctx.stroke(); }
        for (let i = 0; i < 24; i++) {
          ctx.save(); ctx.rotate((i / 24) * Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(220, 0); ctx.stroke();
          ctx.beginPath(); ctx.arc(232, 0, 20, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.arc(232, 0, 6, 0, 7); ctx.fill();
          ctx.restore();
        }
        ctx.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 16; i++) { ctx.save(); ctx.rotate((i / 16) * Math.PI * 2 + 0.1); ctx.beginPath(); ctx.ellipse(118, 0, 20, 9, 0, 0, 7); ctx.fill(); ctx.restore(); }
      });
      const doily = part(s.root, new THREE.CircleGeometry(R * 1.5, 48), new THREE.MeshStandardMaterial({ map: lace, alphaTest: 0.5, roughness: 0.95, side: THREE.DoubleSide }), 0, 0.0015, 0);
      doily.rotation.x = -Math.PI / 2; doily.castShadow = false;
      base = 0.002;
    } else if (a.under === 'towel') {
      const check = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#f3efe2'; ctx.fillRect(0, 0, 256, 256);
        const stripe = mood.cheer > 0.5 ? 'rgba(196,52,48,0.5)' : 'rgba(60,90,140,0.5)';
        ctx.fillStyle = stripe;
        for (let i = 0; i < 8; i++) { ctx.fillRect(i * 32, 0, 16, 256); ctx.fillRect(0, i * 32, 256, 16); }
      });
      const towel = part(s.root, new THREE.BoxGeometry(R * 2.9, 0.006, R * 2.3), new THREE.MeshStandardMaterial({ map: check, roughness: 0.95 }), 0, 0.003, 0);
      towel.rotation.y = mix(-0.25, 0.25, random());
      base = 0.006;
    }
    const lidH = R * 0.2;
    if (a.lid === 'under') base += lidH * 0.6;

    // ---- the tin ------------------------------------------------------------------------
    const sideArt = paint(1024, 192, (ctx) => {
      ctx.fillStyle = style.base; ctx.fillRect(0, 0, 1024, 192);
      if (a.tin === 'tartan') {
        for (let i = 0; i < 32; i++) { ctx.fillStyle = 'rgba(20,50,35,0.55)'; ctx.fillRect(i * 32, 0, 12, 192); }
        ctx.fillStyle = 'rgba(20,50,35,0.55)'; for (let j = 0; j < 6; j++) ctx.fillRect(0, j * 32 + 8, 1024, 12);
        ctx.fillStyle = 'rgba(240,220,120,0.7)'; for (let i = 0; i < 32; i++) ctx.fillRect(i * 32 + 22, 0, 2, 192);
        for (let j = 0; j < 6; j++) ctx.fillRect(0, j * 32 + 26, 1024, 2);
      }
      ctx.fillStyle = style.band; ctx.fillRect(0, 0, 1024, 20); ctx.fillRect(0, 172, 1024, 20);
      ctx.strokeStyle = style.band; ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        const x = i * 512 + 256;
        ctx.fillStyle = a.tin === 'delft' ? '#f1efe6' : style.base;
        ctx.beginPath(); ctx.ellipse(x, 96, 200, 52, 0, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = style.ink; ctx.font = 'bold 40px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(style.word, x, 98, 360);
      }
      for (let i = 0; i < 2; i++) {
        const x = i * 512;
        ctx.fillStyle = style.band;
        for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 1.047) * 20, 96 + Math.sin(p * 1.047) * 20, 12, 7, p * 1.047, 0, 7); ctx.fill(); }
        // the texture wraps, so paint the half that falls off the left edge on the right as well
        for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.ellipse(x + 1024 + Math.cos(p * 1.047) * 20, 96 + Math.sin(p * 1.047) * 20, 12, 7, p * 1.047, 0, 7); ctx.fill(); }
      }
      rust(ctx, 1024, 192);
    });
    const tin = group();
    tin.position.y = base;
    tin.rotation.y = mix(-0.5, 0.5, random());
    part(tin, new THREE.LatheGeometry([[0, 0.003], [inner, 0.003], [inner, H], [R - 0.001, H + 0.002], [R - 0.001, 0], [0, 0]].map(([x, y]) => new THREE.Vector2(x, y)), 56), gold);
    part(tin, new THREE.CylinderGeometry(R, R, H - 0.006, 56, 1, true), new THREE.MeshStandardMaterial({ map: sideArt, metalness: 0.45, roughness: 0.38 + mood.wear * 0.3 }), 0, H / 2 - 0.001, 0);
    part(tin, new THREE.TorusGeometry(R - 0.001, 0.0028, 8, 56), gold, 0, H + 0.001, 0).rotation.x = Math.PI / 2;

    // ---- lid ----------------------------------------------------------------------------
    const lidArt = paint(512, 512, (ctx) => {
      ctx.fillStyle = style.base; ctx.fillRect(0, 0, 512, 512);
      ctx.translate(256, 256);
      if (a.tin === 'tartan') {
        ctx.fillStyle = 'rgba(20,50,35,0.55)';
        for (let i = -8; i < 8; i++) { ctx.fillRect(i * 40, -256, 14, 512); ctx.fillRect(-256, i * 40, 512, 14); }
      }
      ctx.strokeStyle = style.band; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, 236, 0, 7); ctx.stroke();
      ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 214, 0, 7); ctx.stroke();
      ctx.fillStyle = a.tin === 'royal' || a.tin === 'festive' ? style.base : '#f1efe6';
      ctx.beginPath(); ctx.arc(0, 0, 150, 0, 7); ctx.fill(); ctx.lineWidth = 6; ctx.stroke();
      if (a.tin === 'royal') {
        // a ring of biscuits: swirls, pretzels and sugared rounds
        for (let i = 0; i < 8; i++) {
          const t = (i / 8) * Math.PI * 2, x = Math.cos(t) * 92, y = Math.sin(t) * 92;
          ctx.fillStyle = '#e2b25c'; ctx.beginPath(); ctx.arc(x, y, 30, 0, 7); ctx.fill();
          ctx.strokeStyle = '#b77f2e'; ctx.lineWidth = 5;
          if (i % 2) { ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(x - 8, y, 9, 0, 7); ctx.arc(x + 8, y, 9, 0, 7); ctx.stroke(); }
        }
        ctx.fillStyle = '#e2b25c'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff6da'; for (let i = 0; i < 30; i++) ctx.fillRect(-26 + random() * 52, -26 + random() * 52, 3, 3);
      } else if (a.tin === 'delft') {
        ctx.fillStyle = '#2a4f9a'; ctx.strokeStyle = '#2a4f9a';
        ctx.beginPath(); ctx.moveTo(-34, 110); ctx.lineTo(-20, -20); ctx.lineTo(20, -20); ctx.lineTo(34, 110); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-28, -20); ctx.lineTo(0, -52); ctx.lineTo(28, -20); ctx.fill();
        ctx.lineWidth = 10;
        for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(0, -30); ctx.rotate(i * Math.PI / 2 + 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(108, 0); ctx.stroke(); ctx.fillRect(34, 0, 74, 22); ctx.restore(); }
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-140, 112); ctx.lineTo(140, 112); ctx.stroke();
      } else if (a.tin === 'tartan') {
        ctx.fillStyle = '#6a3f8f'; ctx.beginPath(); ctx.arc(0, -30, 44, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#2f6a3f'; ctx.beginPath(); ctx.ellipse(0, 10, 40, 34, 0, 0, 7); ctx.fill();
        ctx.fillRect(-5, 30, 10, 80);
        ctx.beginPath(); ctx.ellipse(-40, 70, 36, 10, -0.5, 0, 7); ctx.ellipse(40, 70, 36, 10, 0.5, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#2f8a4a';
        for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * 2.094); ctx.beginPath(); ctx.ellipse(0, -62, 30, 62, 0, 0, 7); ctx.fill(); ctx.restore(); }
        ctx.fillStyle = '#d0342c'; for (const [x, y] of [[-16, -8], [16, -8], [0, 18]]) { ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.fill(); }
      }
      ctx.translate(-256, -256);
      rust(ctx, 512, 512);
    });
    const lidPaint = new THREE.MeshStandardMaterial({ map: lidArt, metalness: 0.45, roughness: 0.38 + mood.wear * 0.3 });
    const lidSide = new THREE.MeshStandardMaterial({ color: style.base, metalness: 0.45, roughness: 0.4 });
    const lid = group();
    // modelled picture-up, rim hanging down; origin at the centre of the picture face
    part(lid, new THREE.CylinderGeometry(R + 0.003, R + 0.003, 0.004, 56), [lidSide, lidPaint, gold], 0, -0.002, 0);
    part(lid, new THREE.CylinderGeometry(R + 0.003, R + 0.003, lidH, 56, 1, true), lidSide, 0, -lidH / 2, 0);
    part(lid, new THREE.CylinderGeometry(R + 0.0015, R + 0.0015, lidH, 56, 1, true), new THREE.MeshStandardMaterial({ color: '#d8c27c', metalness: 0.8, roughness: 0.35, side: THREE.BackSide }), 0, -lidH / 2, 0);
    if (a.lid === 'leaning') {
      const lean = mix(0.14, 0.3, random()), reach = R + 0.003;
      const gap = (base + H) * Math.tan(lean) + lidH * 0.2 + 0.004;
      lid.rotation.set(Math.PI / 2 + lean, Math.PI / 2 + mix(-0.5, 0.5, random()), 0);
      lid.position.set(mix(-0.25, 0.25, random()) * R, reach * Math.cos(lean), -R - gap + reach * Math.sin(lean));
    } else if (a.lid === 'flat') {
      lid.rotation.x = Math.PI;
      lid.position.set((random() < 0.5 ? -1 : 1) * (R * 1.95), a.under === 'towel' ? 0.006 : 0.0005, R * mix(-0.2, 0.7, random()));
    } else if (a.lid === 'ajar') {
      const side = mix(-0.5, 0.5, random());
      lid.position.set(side * R, base + H + lidH * 0.42, -R * mix(1.0, 1.25, random()));
      lid.rotation.set(-0.2, random() * 6, side * 0.1);
      lid.rotation.order = 'ZXY';
    } else {
      lid.rotation.x = Math.PI;
      lid.position.set(0, base - lidH * 0.6 + 0.0005, 0);
    }

    // ---- contents -----------------------------------------------------------------------
    const fill = mix(0.12, 1, a.fill);
    const overflow = a.fill > 0.85;
    const inside = group(tin);
    const spot = (limit = inner - 0.012) => { const r = Math.sqrt(random()) * limit, t = random() * Math.PI * 2; return [Math.cos(t) * r, Math.sin(t) * r] as const; };
    const discs = (colours: readonly string[], count: number, size: readonly [number, number], heap: number, floor: number, metal: number, parent: THREE.Object3D = inside, where: () => readonly [number, number] = () => spot(inner - 0.008)) => {
      const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 0.24, 14), new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: metal }), count);
      const matrix = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      for (let i = 0; i < count; i++) {
        const [x, z] = where();
        const d = Math.hypot(x, z) / inner;
        const y = floor + heap * (i / Math.max(count - 1, 1)) * (1 - d * d * 0.75);
        const r = mix(size[0], size[1], random());
        e.set((random() - 0.5) * 0.7, random() * 3, (random() - 0.5) * 0.7);
        matrix.compose(new THREE.Vector3(x, y, z), q.setFromEuler(e), new THREE.Vector3(r, r, r));
        mesh.setMatrixAt(i, matrix);
        mesh.setColorAt(i, new THREE.Color(pick(colours)));
      }
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const spool = (parent: THREE.Object3D, x: number, y: number, z: number, lying: boolean, colour = pick(THREADS)) => {
      const g = group(parent);
      const wood = new THREE.MeshStandardMaterial({ color: '#d9c39a', roughness: 0.7 });
      const k = mix(0.85, 1.25, random());
      part(g, new THREE.CylinderGeometry(0.013 * k, 0.013 * k, 0.003, 16), wood, 0, 0.0015, 0);
      part(g, new THREE.CylinderGeometry(0.013 * k, 0.013 * k, 0.003, 16), wood, 0, 0.0325 * k, 0);
      part(g, new THREE.CylinderGeometry(0.011 * k, 0.011 * k, 0.03 * k, 16), new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9 }), 0, 0.017 * k, 0);
      g.position.set(x, y, z);
      if (lying) { g.rotation.set(Math.PI / 2, 0, random() * Math.PI); g.position.y = y + 0.013 * k; }
      return g;
    };
    const cookie = (parent: THREE.Object3D, kind: number, x: number, y: number, z: number) => {
      const dough = new THREE.MeshStandardMaterial({ color: mix(0, 1, random()) > 0.5 ? '#e0b060' : '#d49c48', roughness: 0.85 });
      if (kind === 0) part(parent, new THREE.CylinderGeometry(R * 0.2, R * 0.2, 0.007, 16), dough, x, y, z);
      else if (kind === 1) part(parent, new THREE.TorusGeometry(R * 0.14, R * 0.055, 8, 18), dough, x, y, z).rotation.x = Math.PI / 2;
      else if (kind === 2) { for (const dx of [-1, 1]) part(parent, new THREE.TorusGeometry(R * 0.08, R * 0.04, 6, 14), dough, x + dx * R * 0.085, y, z).rotation.x = Math.PI / 2; }
      else part(parent, new THREE.BoxGeometry(R * 0.36, 0.007, R * 0.24), dough, x, y, z).rotation.y = random();
    };
    const cups = (withCookies: number) => {
      const paper = new THREE.MeshStandardMaterial({ color: '#f7f4ea', roughness: 0.9, side: THREE.DoubleSide });
      const places: [number, number][] = [[0, 0]];
      for (const i of [1.5, 0.5, 2.5, 5.5, 3.5, 4.5]) places.push([Math.cos(i * 1.047) * R * 0.6, Math.sin(i * 1.047) * R * 0.6]);
      if (withCookies === 1) places.reverse();
      places.forEach(([x, z], index) => {
        const cup = part(inside, new THREE.CylinderGeometry(R * 0.29, R * 0.2, H * 0.55, 18, 1, true), paper, x, 0.004 + H * 0.275, z);
        cup.rotation.y = random();
        part(inside, new THREE.CircleGeometry(R * 0.2, 18), paper, x, 0.0045, z).rotation.x = -Math.PI / 2;
        if (index >= withCookies) return;
        const stack = 2 + Math.floor(random() * 3 + a.fill * 2);
        for (let c = 0; c < stack; c++) cookie(inside, index % 4, x + (random() - 0.5) * 0.004, 0.012 + c * (index % 4 === 1 || index % 4 === 2 ? R * 0.09 : 0.0085), z + (random() - 0.5) * 0.004);
      });
    };

    if (a.contents === 'sewing') {
      part(inside, new THREE.CircleGeometry(inner, 40), new THREE.MeshStandardMaterial({ color: '#cdb98a', metalness: 0.6, roughness: 0.4 }), 0, 0.0035, 0).rotation.x = -Math.PI / 2;
      discs(BUTTONS, Math.round(mix(14, 150, fill) * (R / 0.1) ** 2), [0.005, 0.01], H * 0.3 * fill, 0.006, 0.05);
      // tomato pincushion
      const tomato = group(inside);
      const tr = R * 0.34;
      tomato.position.set(-R * 0.42, 0.004 + H * 0.25 * fill, R * 0.3);
      part(tomato, new THREE.SphereGeometry(tr, 24, 16), new THREE.MeshStandardMaterial({ color: '#cf2f2a', roughness: 0.85 }), 0, tr * 0.72, 0).scale.y = 0.74;
      const stitch = new THREE.MeshStandardMaterial({ color: '#2f7a3c', roughness: 0.8 });
      for (let i = 0; i < 3; i++) { const seam = part(tomato, new THREE.TorusGeometry(tr * 1.005, tr * 0.035, 6, 32), stitch, 0, tr * 0.72, 0); seam.scale.y = 0.74; seam.rotation.y = i * 1.047; }
      part(tomato, new THREE.ConeGeometry(tr * 0.42, tr * 0.12, 6), stitch, 0, tr * 1.47, 0);
      for (let i = 0; i < 7 + Math.floor(random() * 6); i++) {
        const t = random() * Math.PI * 2, lean = 0.2 + random() * 0.9;
        const direction = new THREE.Vector3(Math.cos(t) * Math.sin(lean), Math.cos(lean), Math.sin(t) * Math.sin(lean));
        const from = direction.clone().multiplyScalar(tr * 0.7).setY(tr * 0.72 + direction.y * tr * 0.5), to = from.clone().addScaledVector(direction, tr * 0.75);
        const pin = part(tomato, new THREE.CylinderGeometry(0.0007, 0.0007, tr * 0.75, 5), steel);
        pin.position.copy(from).add(to).multiplyScalar(0.5); pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        part(tomato, new THREE.SphereGeometry(tr * 0.085, 8, 6), new THREE.MeshStandardMaterial({ color: pick(['#f4d23a', '#f1ede2', '#2f6fb3', '#e85a9a', '#3fae6a']), roughness: 0.4 })).position.copy(to);
      }
      // spools, standing in a crescent round the back and tumbled in the middle
      const count = Math.round(mix(2, 9, fill) * (R / 0.1));
      for (let i = 0; i < count; i++) {
        const t = -0.5 - (i / Math.max(count - 1, 1)) * 2.4 + (random() - 0.5) * 0.2;
        const r = i % 3 === 2 ? R * 0.2 : R * 0.66;
        spool(inside, Math.cos(t) * r, 0.004 + H * 0.22 * fill, Math.sin(t) * r + (i % 3 === 2 ? -R * 0.1 : 0), i % 3 === 2);
      }
      // tape measure coil
      const tape = group(inside);
      tape.position.set(R * 0.45, 0.006 + H * 0.25 * fill, R * 0.42);
      const yellow = new THREE.MeshStandardMaterial({ color: '#efcf3a', roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) part(tape, new THREE.CylinderGeometry(R * (0.2 - i * 0.04), R * (0.2 - i * 0.04), 0.013, 20, 1, true), yellow, 0, 0.0065, 0);
      const tail = part(tape, new THREE.BoxGeometry(R * 0.5, 0.013, 0.0008), yellow, R * 0.25, 0.0065, R * 0.2);
      tail.rotation.y = 0.25;
      if (overflow) spool(inside, R * 0.1, H * 0.6, R * 0.55, true);
    } else if (a.contents === 'cookies') {
      cups(Math.max(1, Math.round(mix(1, 7, a.fill))));
    } else if (a.contents === 'crumbs') {
      cups(0);
      discs(['#d9a850', '#c79040', '#e6c070'], 60, [0.0015, 0.004], 0, 0.006, 0);
      if (a.fill > 0.5) cookie(inside, 0, R * 0.6, 0.012, 0);
    } else if (a.contents === 'coins') {
      const level = H * 0.85 * fill;
      part(inside, new THREE.CylinderGeometry(inner, inner, Math.max(level - 0.006, 0.002), 32), new THREE.MeshStandardMaterial({ color: '#8a7748', metalness: 0.6, roughness: 0.5 }), 0, 0.003 + Math.max(level - 0.006, 0.002) / 2, 0);
      discs(COINS, Math.round(mix(40, 260, fill) * (R / 0.1) ** 2), [0.009, 0.014], overflow ? H * 0.25 : 0.006, level, 0.85);
      // rolled notes in a rubber band
      const roll = group(inside);
      roll.position.set(R * 0.25, level + 0.018 + (overflow ? H * 0.12 : 0), -R * 0.15);
      roll.rotation.set(Math.PI / 2 - 0.15, 0, mix(-0.9, 0.9, random()));
      part(roll, new THREE.CylinderGeometry(0.015, 0.015, R * 0.75, 18), new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#8fae7f' : '#9aa59a', roughness: 0.9 }));
      part(roll, new THREE.CylinderGeometry(0.0153, 0.0153, R * 0.2, 18), new THREE.MeshStandardMaterial({ color: '#d8dccb', roughness: 0.9 }), 0, R * 0.2, 0);
      part(roll, new THREE.TorusGeometry(0.0155, 0.0016, 6, 18), new THREE.MeshStandardMaterial({ color: '#c8342f', roughness: 0.6 })).rotation.x = Math.PI / 2;
    } else if (a.contents === 'buttons') {
      const level = H * 0.85 * fill;
      part(inside, new THREE.CylinderGeometry(inner, inner, Math.max(level - 0.006, 0.002), 32), new THREE.MeshStandardMaterial({ color: '#8f8676', roughness: 0.8 }), 0, 0.003 + Math.max(level - 0.006, 0.002) / 2, 0);
      discs(BUTTONS, Math.round(mix(60, 420, fill) * (R / 0.1) ** 2), [0.005, 0.012], overflow ? H * 0.3 : 0.008, level, 0.05);
    } else {
      // letters, photographs and a medal
      const paper = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.9 });
      const letters = Math.round(mix(2, 12, fill));
      const bundle = group(inside);
      bundle.position.set(-R * 0.12, 0.005, R * 0.1); bundle.rotation.y = mix(-0.5, 0.5, random());
      for (let i = 0; i < letters; i++) part(bundle, new THREE.BoxGeometry(R * 1.15, 0.0022, R * 0.68), paper, (random() - 0.5) * 0.006, 0.0012 + i * 0.0024, (random() - 0.5) * 0.006).rotation.y = (random() - 0.5) * 0.12;
      const ribbon = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8342f' : '#4f5f86', roughness: 0.8 });
      const top = letters * 0.0024 + 0.001;
      part(bundle, new THREE.BoxGeometry(R * 1.17, top, R * 0.07), ribbon, 0, top / 2 + 0.0004, 0);
      part(bundle, new THREE.BoxGeometry(R * 0.07, top, R * 0.7), ribbon, 0, top / 2 + 0.0004, 0);
      for (const side of [-1, 1]) part(bundle, new THREE.TorusGeometry(R * 0.09, 0.0018, 6, 14), ribbon, side * R * 0.09, top + 0.002, 0).rotation.x = Math.PI / 2;
      const photos = 1 + Math.round(fill * 2);
      for (let i = 0; i < photos; i++) {
        const face = paint(128, 160, (ctx) => {
          ctx.fillStyle = '#f2ead6'; ctx.fillRect(0, 0, 128, 160);
          ctx.fillStyle = '#8a7558'; ctx.fillRect(10, 10, 108, 122);
          ctx.fillStyle = '#3d3226'; ctx.beginPath(); ctx.arc(64, 62, 22, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(64, 128, 40, 40, 0, Math.PI, 0); ctx.fill();
          if (i === 1) { ctx.beginPath(); ctx.arc(30, 84, 14, 0, 7); ctx.fill(); ctx.fillRect(16, 98, 28, 34); }
        });
        const photo = part(inside, new THREE.BoxGeometry(R * 0.5, R * 0.62, 0.001), [paper, paper, paper, paper, new THREE.MeshStandardMaterial({ map: face, roughness: 0.8 }), paper], R * (0.45 - i * 0.42), 0.004 + R * 0.26, -R * 0.62 + i * 0.004);
        photo.rotation.set(-0.5, (random() - 0.5) * 0.5, (random() - 0.5) * 0.25);
      }
      part(inside, new THREE.CylinderGeometry(R * 0.14, R * 0.14, 0.003, 20), new THREE.MeshStandardMaterial({ color: '#b98a3a', metalness: 0.8, roughness: 0.35 }), R * 0.55, 0.008, R * 0.5).rotation.x = 0.2;
      part(inside, new THREE.BoxGeometry(R * 0.2, 0.002, R * 0.3), new THREE.MeshStandardMaterial({ color: '#7a2a3a', roughness: 0.8 }), R * 0.55, 0.007, R * 0.28);
    }

    // ---- beside the tin -----------------------------------------------------------------
    const tableY = a.under === 'towel' ? 0.0065 : 0.0005;
    const front = () => { const t = mix(0.15, 1.2, random()), r = R * mix(1.2, 1.6, random()); return [Math.cos(t) * r, Math.sin(t) * r] as const; };
    if (a.escaped === 'scatter') {
      const n = 4 + Math.round(mood.density * 8);
      if (a.contents === 'coins') discs(COINS, n, [0.009, 0.014], 0, tableY + 0.002, 0.85, s.root, front);
      else if (a.contents === 'cookies' || a.contents === 'crumbs') {
        discs(['#d9a850', '#c79040', '#e6c070'], n * 4, [0.0015, 0.004], 0, tableY + 0.001, 0, s.root, front);
        const [x, z] = front();
        cookie(s.root, 0, x, tableY + 0.004, z);
      } else if (a.contents === 'keepsakes') {
        const [x, z] = front();
        const letter = part(s.root, new THREE.BoxGeometry(R * 1.1, 0.0015, R * 0.66), new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.9 }), x * 0.9, tableY + 0.001, z);
        letter.rotation.y = mix(-0.6, 0.6, random());
        part(s.root, new THREE.BoxGeometry(R * 0.16, 0.0005, R * 0.2), new THREE.MeshStandardMaterial({ color: '#b84a3a', roughness: 0.8 }), x * 0.9 + R * 0.38, tableY + 0.002, z - R * 0.16).rotation.y = letter.rotation.y;
      } else {
        discs(BUTTONS, n, [0.005, 0.011], 0, tableY + 0.0015, 0.05, s.root, front);
        if (a.contents === 'sewing') {
          // a spool that rolled away, paying out its thread
          const [x, z] = front();
          const colour = pick(THREADS);
          const runaway = spool(s.root, x, tableY, z, true, colour);
          const from = new THREE.Vector3(x, tableY + 0.002, z);
          const points: [number, number, number][] = [];
          for (let i = 0; i < 6; i++) points.push([mix(from.x, R * 0.3, i / 5) + (random() - 0.5) * 0.03, i === 5 ? base + H + 0.004 : tableY + 0.0015, mix(from.z, R * 0.85, i / 5) + (i === 5 ? 0 : (random() - 0.5) * 0.03)]);
          s.tube(points, 0.0008, new THREE.MeshStandardMaterial({ color: colour, roughness: 0.9 }));
          runaway.rotation.z = Math.atan2(points[1][0] - x, points[1][2] - z) + Math.PI / 2;
        }
      }
    } else if (a.escaped === 'tools') {
      const g = group();
      g.position.set(R * 1.0, tableY + 0.002, R * 1.0); g.rotation.y = mix(-0.8, 0.2, random());
      const handle = new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#e08a2c' : '#1e1d21', roughness: 0.5 });
      for (const side of [-1, 1]) {
        const blade = part(g, new THREE.BoxGeometry(0.075, 0.0015, 0.008), steel, 0.03, 0, 0); blade.rotation.y = side * 0.14;
        const loop = part(g, new THREE.TorusGeometry(0.013, 0.003, 6, 18), handle, -0.02, 0, side * 0.016); loop.rotation.x = Math.PI / 2;
      }
      part(g, new THREE.CylinderGeometry(0.003, 0.003, 0.003, 8), steel, 0.006, 0.001, 0);
      part(s.root, new THREE.LatheGeometry([[0.0085, 0], [0.0078, 0.014], [0.005, 0.019], [0, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)), 14), new THREE.MeshStandardMaterial({ color: '#cfd3d6', metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }), R * 0.3, tableY, R * 1.3);
    } else if (a.escaped === 'note') {
      const note = paint(256, 192, (ctx) => {
        ctx.fillStyle = '#f4efdd'; ctx.fillRect(0, 0, 256, 192);
        ctx.strokeStyle = '#3b4a7a'; ctx.lineWidth = 3;
        for (let line = 0; line < 5; line++) {
          ctx.beginPath(); ctx.moveTo(20, 34 + line * 30);
          for (let x = 20; x < (line === 4 ? 130 : 236); x += 8) ctx.lineTo(x, 34 + line * 30 + (random() - 0.5) * 9);
          ctx.stroke();
        }
      });
      const paper = new THREE.MeshStandardMaterial({ color: '#f4efdd', roughness: 0.9 });
      const sheet = part(s.root, new THREE.BoxGeometry(R * 0.95, 0.0008, R * 0.7), [paper, paper, new THREE.MeshStandardMaterial({ map: note, roughness: 0.9 }), paper, paper, paper], R * 0.8, tableY + 0.001, R * 1.3);
      sheet.rotation.y = mix(-0.5, 0.3, random());
    }

    return s.finish();
  },
});
