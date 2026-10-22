import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = readonly [number, number, number];
type Inst = { p: V3; r?: V3; s?: V3; c?: THREE.ColorRepresentation };

function instances(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(list.length, 1));
  mesh.count = list.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  list.forEach((it, i) => {
    const r = it.r ?? [0, 0, 0], k = it.s ?? [1, 1, 1];
    q.setFromEuler(e.set(r[0], r[1], r[2], 'YXZ'));
    m.compose(v.set(it.p[0], it.p[1], it.p[2]), q, sc.set(k[0], k[1], k[2]));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, new THREE.Color(it.c ?? '#ffffff'));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default defineThing({
  questions: {
    picture: choice('What picture did the family choose?', {
      studio: 'A formal studio portrait: head and shoulders, best clothes, a mottled grey backdrop.',
      holiday: 'A holiday snapshot blown up too large: sea and sky behind, a sun hat, colours gone slightly wrong.',
      uniform: 'A sepia photograph of them young, in uniform and a peaked cap, decades before anyone here knew them.',
      wedding: 'Their wedding photograph in black and white, the two of them side by side.',
      collage: 'A collage board crowded with dozens of overlapping snapshots from a whole life.',
      card: 'No photograph at all: a printed card with IN LOVING MEMORY, a sprig of flowers and two dates.',
    }),
    age: score('How old is the person in the picture?', ['A child', 'A young adult', 'Middle aged', 'Very old']),
    frame: choice('How is it framed?', {
      gilt: 'A heavy ornate gilt frame.',
      black: 'A thin black frame.',
      wood: 'A plain pale wooden frame.',
      silver: 'A polished silver frame.',
      none: 'Unframed, mounted on white foam board.',
    }),
    ribbon: choice('What has been put on the frame?', {
      corner: 'A black mourning ribbon across the top corner.',
      bow: 'A black bow with long tails on the top edge.',
      white: 'A white satin bow with long tails.',
      purple: 'A purple bow with long tails.',
      garland: 'A garland of marigolds draped over the top and down the sides.',
      none: 'Nothing.',
    }),
    below: choice('What has been set below it?', {
      candle: 'A single pillar candle on a small round table.',
      tealights: 'A crowd of tea lights in glass holders, on a small table and around the foot of the easel.',
      flowers: 'A tall vase of flowers standing at the foot.',
      belongings: 'Their own things: a flat cap hung on the corner of the frame, a walking stick leaned against a leg, a pair of shoes.',
      none: 'Nothing: the easel stands alone.',
    }),
    burn: score('If candles are lit, how far have they burnt?', ['Just lit, tall and clean', 'Half way', 'A guttering stub in a pool of wax', 'Gone out, a thread of smoke']),
    easel: choice('What kind of easel?', {
      wooden: 'A sturdy wooden artist\'s easel with a ledge and a centre mast.',
      metal: 'A slim black metal display tripod from the funeral director.',
      brass: 'A polished brass tripod with ball feet.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const boxes: Inst[] = [], balls: Inst[] = [], discs: Inst[] = [];
    const picBoxes: Inst[] = [], picBalls: Inst[] = [];

    // ---- easel ----
    const tilt = 0.15, H = 1.86;
    const zAt = (y: number) => 0.2 - Math.tan(tilt) * y;
    const xAt = (y: number) => 0.36 - (0.31 / H) * y;
    const legMat = { wooden: s.material(pick(['#8a5a34', '#a8743f', '#5e3d26']), { roughness: 0.55 }), metal: s.material('#1e1f22', { roughness: 0.4, metalness: 0.3 }), brass: s.material('#c9a044', { metalness: 0.6, roughness: 0.3 }) }[a.easel];
    const thick = { wooden: 0.021, metal: 0.011, brass: 0.012 }[a.easel];
    for (const side of [-1, 1]) s.rod([side * 0.36, 0, 0.2], [side * 0.05, H, zAt(H)], thick, legMat);
    s.rod([0, 0, -0.62], [0, H - 0.04, zAt(H - 0.04) - 0.01], thick, legMat);
    s.rod([-xAt(0.4), 0.4, zAt(0.4)], [xAt(0.4), 0.4, zAt(0.4)], thick * 0.85, legMat);
    s.rod([0, 0.52, zAt(0.52)], [0, 0.52, -0.62 + (0.52 / H) * 0.42], thick * 0.5, legMat);
    const ledgeY = 0.82;
    if (a.easel === 'wooden') {
      const ledge = s.box([0.74, 0.03, 0.08], [0, ledgeY, zAt(ledgeY) + 0.04], legMat); ledge.rotation.x = -tilt;
      const lip = s.box([0.74, 0.035, 0.012], [0, ledgeY + 0.022, zAt(ledgeY) + 0.082], legMat); lip.rotation.x = -tilt;
      s.rod([0, 0.4, zAt(0.4)], [0, H + 0.1, zAt(H + 0.1)], thick * 0.9, legMat);
      s.box([0.1, 0.05, 0.06], [0, H, zAt(H) + 0.01], legMat);
    } else {
      for (const side of [-1, 1]) { s.rod([side * xAt(ledgeY), ledgeY, zAt(ledgeY)], [side * xAt(ledgeY), ledgeY - 0.01, zAt(ledgeY) + 0.08], thick * 0.8, legMat); s.rod([side * xAt(ledgeY), ledgeY - 0.01, zAt(ledgeY) + 0.08], [side * xAt(ledgeY), ledgeY + 0.03, zAt(ledgeY) + 0.085], thick * 0.8, legMat); }
      s.ball([0.03, 0.03, 0.03], [0, H + 0.01, zAt(H)], legMat, 12);
      if (a.easel === 'brass') for (const p of [[-0.36, 0.02, 0.2], [0.36, 0.02, 0.2], [0, 0.02, -0.62]] as const) s.ball([0.026, 0.026, 0.026], p, legMat, 12);
    }

    // ---- the picture ----
    const wide = a.picture === 'collage';
    const PW = wide ? 0.92 : 0.52, PH = wide ? 0.66 : 0.68;
    const skin = pick(['#e8c4a6', '#d9a987', '#b9835f', '#8d5a3b', '#f0d2bb']);
    const hair = a.age < 0.2 ? pick(['#b98a4e', '#6b4a2c', '#2c2420']) : a.age < 0.5 ? pick(['#2c2420', '#5a3a22', '#8a5a2c', '#c9a15a']) : a.age < 0.8 ? pick(['#6b6560', '#5a4636', '#8c8780']) : pick(['#f0eee8', '#dcdad4', '#c9c6c0']);
    const longHair = random() < 0.5;
    const blob = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: string, rot = 0) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); };
    // A face is never drawn: only a head, hair and shoulders, soft enough that anyone can be seen in it.
    const figure = (ctx: CanvasRenderingContext2D, x: number, top: number, k: number, clothes: string, hairColour: string, long: boolean, old: boolean) => {
      if (long) blob(ctx, x, top + 84 * k, 54 * k, 70 * k, hairColour);
      blob(ctx, x, top + 250 * k, 108 * k, 110 * k, clothes);
      ctx.fillStyle = skin; ctx.fillRect(x - 17 * k, top + 100 * k, 34 * k, 50 * k);
      blob(ctx, x, top + 66 * k, 42 * k, 54 * k, skin);
      ctx.fillStyle = 'rgba(40,20,10,0.13)'; ctx.beginPath(); ctx.ellipse(x + 10 * k, top + 70 * k, 34 * k, 50 * k, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
      if (old && !long) { blob(ctx, x - 42 * k, top + 60 * k, 7 * k, 20 * k, hairColour); blob(ctx, x + 42 * k, top + 60 * k, 7 * k, 20 * k, hairColour); blob(ctx, x, top + 18 * k, 30 * k, 8 * k, hairColour); }
      else { ctx.fillStyle = hairColour; ctx.beginPath(); ctx.ellipse(x, top + 40 * k, 44 * k, 32 * k, 0, Math.PI * 0.98, Math.PI * 2.02); ctx.fill(); }
    };
    const soft = (ctx: CanvasRenderingContext2D, px: number) => { try { ctx.filter = px ? `blur(${px}px)` : 'none'; } catch { /* plain edges are fine */ } };
    const mount = a.frame === 'none' ? 10 : 26;
    const child = a.age < 0.2;
    const texture = canvasTexture(wide ? 720 : 400, wide ? 516 : 524, (ctx) => {
      const W = ctx.canvas.width, Hh = ctx.canvas.height;
      ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, W, Hh);
      ctx.save();
      ctx.beginPath(); ctx.rect(mount, mount, W - mount * 2, Hh - mount * 2); ctx.clip();
      const cx = W / 2;
      if (a.picture === 'studio') {
        const g = ctx.createRadialGradient(cx, Hh * 0.4, 30, cx, Hh * 0.5, Hh * 0.75);
        const tone = pick([['#aab4bf', '#56606c'], ['#b9ab98', '#6a5a4a'], ['#9fb0a8', '#4f5f58']]);
        g.addColorStop(0, tone[0]); g.addColorStop(1, tone[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
        soft(ctx, 14); for (let i = 0; i < 9; i++) blob(ctx, rnd(0, W), rnd(0, Hh), rnd(30, 80), rnd(30, 80), 'rgba(255,255,255,0.07)');
        soft(ctx, 2.5);
        const k = child ? 1.2 : 1.55;
        figure(ctx, cx, child ? 200 : 96, k, child ? pick(['#c8442f', '#3a6ea8', '#e3b93a']) : pick(['#2a2c33', '#3b3340', '#4a3c30', '#5a2d3a']), hair, longHair, a.age > 0.8);
        if (!child) { ctx.fillStyle = '#f2efe8'; ctx.beginPath(); ctx.moveTo(cx - 34, 96 + 222); ctx.lineTo(cx + 34, 96 + 222); ctx.lineTo(cx, 96 + 330); ctx.fill(); }
      } else if (a.picture === 'holiday') {
        ctx.fillStyle = '#8fc9ee'; ctx.fillRect(0, 0, W, Hh * 0.45);
        ctx.fillStyle = '#3f93b8'; ctx.fillRect(0, Hh * 0.45, W, Hh * 0.13);
        ctx.fillStyle = '#ead8a6'; ctx.fillRect(0, Hh * 0.58, W, Hh);
        soft(ctx, 6); blob(ctx, W * 0.8, Hh * 0.12, 34, 34, '#fff6c8'); for (let i = 0; i < 3; i++) blob(ctx, rnd(0, W), rnd(20, Hh * 0.3), rnd(40, 70), 14, 'rgba(255,255,255,0.75)');
        soft(ctx, 2.5);
        const fx = cx - 30, k = 1.15, top = child ? 200 : 150;
        figure(ctx, fx, top, k, pick(['#e8503a', '#f0c23a', '#3fa58a', '#e77fb0', '#f4f1e6']), hair, longHair, a.age > 0.8);
        blob(ctx, fx, top + 22 * k, 84 * k, 17 * k, '#ecd58a'); blob(ctx, fx, top + 6 * k, 44 * k, 24 * k, '#e3c873');
        soft(ctx, 0);
        ctx.fillStyle = 'rgba(255,240,210,0.16)'; ctx.fillRect(0, 0, W, Hh);
      } else if (a.picture === 'uniform') {
        const g = ctx.createRadialGradient(cx, Hh * 0.45, 40, cx, Hh * 0.5, Hh * 0.7);
        g.addColorStop(0, '#d2bb93'); g.addColorStop(1, '#7c6444');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
        soft(ctx, 2.5);
        const top = 120, k = 1.25;
        blob(ctx, cx, top + 250 * k, 108 * k, 110 * k, '#5b4a34');
        ctx.fillStyle = '#d9c4a0'; ctx.fillRect(cx - 17 * k, top + 100 * k, 34 * k, 50 * k);
        blob(ctx, cx, top + 66 * k, 42 * k, 54 * k, '#dcc7a3');
        ctx.fillStyle = 'rgba(60,40,20,0.2)'; ctx.beginPath(); ctx.ellipse(cx + 10 * k, top + 70 * k, 34 * k, 50 * k, 0, -Math.PI / 2, Math.PI / 2); ctx.fill();
        blob(ctx, cx, top + 14 * k, 58 * k, 24 * k, '#4a3b28'); blob(ctx, cx, top + 34 * k, 48 * k, 9 * k, '#2a2117'); blob(ctx, cx, top + 12 * k, 8 * k, 8 * k, '#d9c08a');
        for (let i = 0; i < 4; i++) blob(ctx, cx, top + (175 + i * 36) * k, 6, 6, '#d9c08a');
        ctx.strokeStyle = '#3b2e1e'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(cx - 80, top + 170 * k); ctx.lineTo(cx + 70, Hh); ctx.stroke();
        soft(ctx, 0);
      } else if (a.picture === 'wedding') {
        const g = ctx.createLinearGradient(0, 0, 0, Hh); g.addColorStop(0, '#b9b9b6'); g.addColorStop(1, '#6c6c6a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
        soft(ctx, 2.5);
        const k = 0.95, top = 150;
        const grey = (hex: string) => { const c = new THREE.Color(hex); const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; return `#${new THREE.Color(l, l, l).getHexString()}`; };
        const keepSkin = skin;
        figure(ctx, cx - 78, top - 20, k, '#232323', grey(hair), false, false);
        blob(ctx, cx + 80, top + 80, 62, 80, '#f4f4f2');
        figure(ctx, cx + 78, top + 10, k, '#eeeeec', grey(hair), true, false);
        blob(ctx, cx + 78, top + 30, 50, 34, 'rgba(250,250,248,0.85)');
        for (let i = 0; i < 9; i++) blob(ctx, cx + rnd(-20, 30), top + 270 + rnd(-22, 22), 12, 12, pick(['#f2f2f0', '#d0d0cc', '#9a9a98']));
        void keepSkin;
        soft(ctx, 0);
        ctx.fillStyle = 'rgba(128,128,128,0.35)'; ctx.globalCompositeOperation = 'saturation'; ctx.fillRect(0, 0, W, Hh); ctx.globalCompositeOperation = 'source-over';
      } else if (a.picture === 'collage') {
        ctx.fillStyle = pick(['#f4f1e6', '#b98d5a', '#2f3136', '#d9e4ea']); ctx.fillRect(0, 0, W, Hh);
        const n = Math.round(mix(12, 26, mood.density));
        for (let i = 0; i < n; i++) {
          const w = rnd(90, 150), h = w * pick([0.72, 1.3, 1]);
          ctx.save();
          ctx.translate(rnd(70, W - 70), rnd(70, Hh - 70)); ctx.rotate(rnd(-0.3, 0.3));
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
          ctx.fillStyle = '#fbfaf5'; ctx.fillRect(-w / 2, -h / 2, w, h);
          const sepia = random() < 0.3;
          ctx.fillStyle = sepia ? pick(['#b9a27c', '#8f8f8c', '#c9b796']) : pick(['#8fc3e6', '#7fae6a', '#e0c79a', '#c98a6a', '#6f7f9a', '#e6b9c6', '#f0d77a']);
          ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12 - (random() < 0.4 ? 14 : 0));
          const people = 1 + Math.floor(random() * 3);
          for (let p = 0; p < people; p++) {
            const px = (p - (people - 1) / 2) * w * 0.26, s2 = w * 0.1;
            blob(ctx, px, h * 0.28, s2 * 1.5, h * 0.24, sepia ? '#5a4a36' : pick(['#c8442f', '#2f4f7a', '#f2efe6', '#3f6a4a', '#2a2a2e', '#e3b93a']));
            blob(ctx, px, -h * 0.05, s2, s2 * 1.2, sepia ? '#d9c4a0' : skin);
            blob(ctx, px, -h * 0.05 - s2 * 0.7, s2 * 1.02, s2 * 0.7, sepia ? '#4a3b28' : pick(['#2c2420', '#8a5a2c', '#dcdad4', '#6b6560']));
          }
          blob(ctx, 0, -h / 2 + 5, 5, 5, pick(['#c8342e', '#2f6fb5', '#e3b93a']));
          ctx.restore();
        }
      } else {
        ctx.fillStyle = '#f7f2e2'; ctx.fillRect(0, 0, W, Hh);
        ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 3; ctx.strokeRect(mount + 16, mount + 16, W - mount * 2 - 32, Hh - mount * 2 - 32);
        ctx.fillStyle = '#2c2a26'; ctx.textAlign = 'center';
        ctx.font = 'italic 34px serif'; ctx.fillText('In Loving Memory', cx, 130);
        for (let i = 0; i < 7; i++) { const t = -0.9 + i * 0.3; ctx.strokeStyle = '#5b8a41'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(cx, 330); ctx.quadraticCurveTo(cx + Math.sin(t) * 40, 270, cx + Math.sin(t) * 95, 330 - Math.cos(t) * 120); ctx.stroke(); blob(ctx, cx + Math.sin(t) * 95, 330 - Math.cos(t) * 120, 15, 15, mood.cheer > 0.5 ? pick(['#e8503a', '#f0c23a', '#e77fb0']) : '#fbf9f2'); }
        const died = 2019 + Math.floor(random() * 7), born = died - Math.round(mix(6, 94, a.age));
        ctx.fillStyle = '#2c2a26'; ctx.font = 'bold 40px serif'; ctx.fillText(`${born} – ${died}`, cx, 420);
      }
      ctx.restore();
      if (a.picture !== 'card' && a.picture !== 'collage') { ctx.strokeStyle = 'rgba(60,50,40,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(mount, mount, W - mount * 2, Hh - mount * 2); }
    });

    const pic = new THREE.Group();
    pic.position.set(0, ledgeY + (a.easel === 'wooden' ? 0.02 : 0), zAt(ledgeY) + (a.easel === 'wooden' ? 0.03 : 0.04));
    pic.rotation.x = -tilt;
    pic.rotation.z = mood.wear > 0.55 ? rnd(0.02, 0.06) * (random() < 0.5 ? -1 : 1) : rnd(-0.008, 0.008);
    s.root.add(pic);
    const fw = { gilt: 0.07, black: 0.022, wood: 0.04, silver: 0.03, none: 0 }[a.frame];
    const TW = PW + fw * 2, TH = PH + fw * 2;
    const board = s.box([PW + 0.002, PH + 0.002, 0.012], [0, TH / 2, 0.008], s.material('#efece2'));
    const face = s.mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: texture, roughness: a.frame === 'none' ? 0.85 : 0.35 }), [0, TH / 2, 0.0145]);
    pic.add(board, face);
    if (fw > 0) {
      const frameMat = { gilt: s.material('#c9a23c', { metalness: 0.55, roughness: 0.35 }), black: s.material('#1b1b1d', { roughness: 0.4 }), wood: s.material('#d2b48a', { roughness: 0.6 }), silver: s.material('#d5dadc', { metalness: 0.45, roughness: 0.22 }) }[a.frame as 'gilt'];
      const deep = a.frame === 'gilt' ? 0.05 : 0.03;
      for (const side of [-1, 1]) {
        pic.add(s.box([fw, TH, deep], [side * (PW / 2 + fw / 2), TH / 2, deep / 2], frameMat));
        pic.add(s.box([TW, fw, deep], [0, TH / 2 + side * (PH / 2 + fw / 2), deep / 2], frameMat));
      }
      if (a.frame === 'gilt') {
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) pic.add(s.ball([0.05, 0.05, 0.03], [sx * (TW / 2 - 0.035), TH / 2 + sy * (TH / 2 - 0.035), deep], frameMat, 12));
        pic.add(s.ball([0.09, 0.045, 0.03], [0, TH - 0.02, deep], frameMat, 12));
        for (const side of [-1, 1]) { pic.add(s.box([0.012, PH, 0.012], [side * (PW / 2 + 0.008), TH / 2, deep + 0.004], s.material('#8a6a1c', { metalness: 0.5 }))); }
      }
    }
    const front = (fw > 0 ? (a.frame === 'gilt' ? 0.05 : 0.03) : 0.014) + 0.006;
    const ribbonColour = { corner: '#141416', bow: '#141416', white: '#f6f4ee', purple: '#5b2a7a', garland: '#f0932b', none: '#000000' }[a.ribbon];
    const tails: THREE.Object3D[] = [];
    if (a.ribbon === 'corner') {
      const band = s.box([0.36, 0.06, 0.006], [TW / 2 - 0.105, TH - 0.105, front], s.material(ribbonColour, { roughness: 0.35 }));
      band.rotation.z = -Math.PI / 4;
      pic.add(band);
    } else if (a.ribbon === 'bow' || a.ribbon === 'white' || a.ribbon === 'purple') {
      const satin = s.material(ribbonColour, { roughness: 0.3, side: THREE.DoubleSide });
      const bx = pick([-1, 1]) * (TW / 2 - 0.08), by = TH - 0.02;
      for (const side of [-1, 1]) {
        const loop = s.ball([0.085, 0.045, 0.03], [bx + side * 0.075, by + 0.015, front + 0.01], satin, 12);
        loop.rotation.z = side * 0.35; pic.add(loop);
        const pivot = new THREE.Group(); pivot.position.set(bx + side * 0.012, by, front + 0.006);
        const tail = s.box([0.05, rnd(0.3, 0.46), 0.004], [0, 0, 0], satin);
        tail.geometry.translate(0, -(tail.geometry as THREE.BoxGeometry).parameters.height / 2, 0);
        pivot.add(tail); pivot.rotation.z = side * rnd(0.12, 0.3);
        pic.add(pivot); tails.push(pivot);
      }
      pic.add(s.ball([0.03, 0.03, 0.025], [bx, by + 0.005, front + 0.02], satin, 10));
    } else if (a.ribbon === 'garland') {
      const n = 46;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), u = Math.abs(t - 0.5) * 2;
        const x = (t - 0.5) * 2 * (TW / 2 + 0.02) * Math.min(1, (1 - u) * 2.6 + 0.0) * 1 + Math.sign(t - 0.5) * (u > 0.615 ? (TW / 2 + 0.02) * (1 - Math.min(1, (1 - u) * 2.6)) : 0);
        const y = u > 0.615 ? TH - (u - 0.615) / 0.385 * TH * 0.62 : TH + 0.01 - Math.sin((u / 0.615) * Math.PI) * 0.0 - (1 - u / 0.615) * 0.05;
        picBalls.push({ p: [x, y, front + 0.012], s: [0.03, 0.03, 0.028], c: i % 3 === 0 ? '#f6c12a' : i % 3 === 1 ? '#f0932b' : '#e8641f', r: [rnd(0, 3), rnd(0, 3), 0] });
      }
    }

    // ---- what stands below ----
    const flames: THREE.Mesh[] = [];
    const lit = a.burn < 0.85;
    const flameMat = new THREE.MeshStandardMaterial({ color: '#ffd98a', emissive: '#ffae3a', emissiveIntensity: 2 });
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#8f9498', transparent: true, opacity: 0.35, depthWrite: false });
    const candle = (x: number, y: number, z: number, r: number, full: number, wax = '#f6f0dc') => {
      const h = Math.max(0.012, full * mix(1, 0.14, a.burn) * rnd(0.85, 1));
      discs.push({ p: [x, y + h / 2, z], s: [r, h, r], c: wax });
      if (a.burn > 0.4) discs.push({ p: [x, y + 0.003, z], s: [r * 1.7, 0.006, r * 1.7], c: wax });
      if (lit) {
        const flame = s.ball([r * 0.45 + 0.004, r * 0.9 + 0.012, r * 0.45 + 0.004], [x, y + h + r * 0.9 + 0.012, z], flameMat, 8);
        flame.castShadow = false; flames.push(flame);
      } else if (r > 0.02) {
        const wisp = s.tube([[x, y + h, z], [x + 0.02, y + h + 0.1, z], [x - 0.02, y + h + 0.2, z + 0.01], [x + 0.03, y + h + 0.32, z]], 0.005, smokeMat);
        wisp.castShadow = false;
      }
    };
    const tx = 0.3, tz = 0.62, th = 0.52;
    const sideTable = () => {
      const wood = s.material(pick(['#5e3d26', '#8a5a34', '#2a2422']), { roughness: 0.5 });
      s.lathe([[0.001, 0], [0.15, 0], [0.14, 0.02], [0.03, 0.06], [0.024, 0.3], [0.04, th - 0.04], [0.21, th - 0.02], [0.21, th], [0.001, th]], wood, [tx, 0, tz]);
      discs.push({ p: [tx, th + 0.002, tz], s: [0.17, 0.004, 0.17], c: '#f4f1e8' });
    };
    if (a.below === 'candle') {
      sideTable();
      candle(tx, th + 0.004, tz, 0.038, 0.24, pick(['#f6f0dc', '#f6f0dc', '#e9dcc0', '#7a2f3a']));
      discs.push({ p: [tx, th + 0.008, tz], s: [0.075, 0.008, 0.075], c: '#c9a23c' });
    } else if (a.below === 'tealights') {
      sideTable();
      const n = Math.round(mix(6, 13, mood.density));
      for (let i = 0; i < n; i++) {
        const t = rnd(0, 6.28), r = Math.sqrt(random()) * 0.15;
        const x = tx + Math.cos(t) * r, z = tz + Math.sin(t) * r;
        discs.push({ p: [x, th + 0.03, z], s: [0.028, 0.05, 0.028], c: pick(['#c8342e', '#e9eef0', '#e9eef0', '#3f6f8a', '#e3a83a']) });
        candle(x, th + 0.035, z, 0.016, 0.02);
      }
      for (let i = 0; i < Math.round(n * 0.7); i++) {
        const x = rnd(-0.45, 0.1), z = rnd(0.3, 0.7);
        discs.push({ p: [x, 0.025, z], s: [0.028, 0.05, 0.028], c: pick(['#c8342e', '#e9eef0', '#3f6f8a', '#e3a83a']) });
        candle(x, 0.03, z, 0.016, 0.02);
      }
    } else if (a.below === 'flowers') {
      const vx = -0.34, vz = 0.5;
      s.lathe([[0.001, 0], [0.09, 0], [0.11, 0.1], [0.085, 0.3], [0.06, 0.4], [0.085, 0.46], [0.001, 0.46]], s.material(pick(['#e9eef0', '#3f6f8a', '#f2ead7', '#2a2422']), { roughness: 0.2 }), [vx, 0, vz]);
      const green = s.material('#4f7a3a');
      const bright = mood.cheer > 0.55;
      for (let i = 0; i < 11; i++) {
        const t = (i / 11) * Math.PI * 2 + rnd(-0.3, 0.3), reach = rnd(0.08, 0.24), h = rnd(0.7, 1.0);
        const tip: V3 = [vx + Math.cos(t) * reach, h, vz + Math.sin(t) * reach];
        s.rod([vx, 0.42, vz], tip, 0.005, green);
        balls.push({ p: tip, s: [0.06, 0.05, 0.06], c: bright ? pick(['#e8432e', '#f2b632', '#e96aa0', '#8c5cc4']) : pick(['#fbf9f2', '#f4efdf', '#f1e3ea']), r: [rnd(0, 3), rnd(0, 3), 0] });
        if (random() < 0.7) balls.push({ p: [vx + Math.cos(t) * reach * 0.6, h - 0.2, vz + Math.sin(t) * reach * 0.6], s: [0.07, 0.014, 0.03], c: '#5b8a41', r: [0.4, t, 0.5] });
      }
    } else if (a.below === 'belongings') {
      const tweed = pick(['#6b6a4c', '#4a4e58', '#7a5a3c']);
      picBalls.push({ p: [-TW / 2 + 0.04, TH + 0.02, front + 0.03], s: [0.13, 0.04, 0.11], c: tweed, r: [0.5, 0.3, 0.25] });
      picBoxes.push({ p: [-TW / 2 + 0.03, TH - 0.03, front + 0.11], s: [0.16, 0.012, 0.07], c: tweed, r: [0.9, 0.3, 0.25] });
      const stick = s.material('#6a4424', { roughness: 0.4 });
      s.rod([0.5, 0, 0.36], [0.33, 0.9, zAt(0.9) + 0.04], 0.012, stick);
      const crook = s.ring(0.05, 0.012, [0.33, 0.9, zAt(0.9) - 0.01], stick, Math.PI); crook.rotation.y = Math.PI / 2;
      for (const side of [-1, 1]) {
        const shoe = pick(['#2a2220', '#5a3a22']);
        balls.push({ p: [-0.2 + side * 0.07, 0.035, 0.46 + side * 0.01], s: [0.05, 0.036, 0.13], c: shoe, r: [0, side * 0.12, 0] });
        balls.push({ p: [-0.2 + side * 0.07, 0.05, 0.4 + side * 0.01], s: [0.045, 0.05, 0.06], c: shoe, r: [0, side * 0.12, 0] });
      }
    }

    instances(s.root, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff'), boxes);
    instances(s.root, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { flatShading: true, roughness: 0.8 }), balls);
    instances(s.root, new THREE.CylinderGeometry(1, 1, 1, 16), s.material('#ffffff', { roughness: 0.5 }), discs);
    instances(pic, new THREE.BoxGeometry(1, 1, 1), s.material('#ffffff'), picBoxes);
    instances(pic, new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { flatShading: true, roughness: 0.8 }), picBalls);

    const flick = mix(0.08, 0.4, mood.energy);
    return s.finish({
      update: (_dt, time) => {
        flames.forEach((flame, i) => { const k = 1 + Math.sin(time * (9 + i * 1.3) + i * 2.1) * flick * 0.5 + Math.sin(time * 23 + i) * flick * 0.25; flame.scale.y = (flame.scale.x * 2.1) * k; });
        tails.forEach((tail, i) => { tail.rotation.x = Math.sin(time * 1.3 + i * 1.7) * 0.06 * mood.energy; });
      },
    });
  },
});
