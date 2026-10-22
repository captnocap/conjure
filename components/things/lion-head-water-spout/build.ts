import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];

function painted(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    flow: choice('How is the water running?', {
      gushing: 'A strong arc of water leaps from the jaws and churns the trough.',
      steady: 'A thin clear steady stream, the everyday trickle of a public fountain.',
      dripping: 'Nearly stopped: single drops fall from the lip.',
      dry: 'Dry. A green and brown stain runs down from the mouth where water used to fall.',
      choked: 'Dry and forgotten: the trough is full of dead leaves and the mouth is plugged with moss.',
    }),
    mask: choice('What is the lion mask made of?', {
      marble: 'White marble, crisp and bright.',
      limestone: 'Soft buff limestone, rounded by rain.',
      bronze: 'A cast bronze mask bolted to the stone.',
      terracotta: 'Moulded red terracotta.',
      basalt: 'Dark grey volcanic stone.',
    }),
    face: choice('What expression does the lion have?', {
      roaring: 'Jaws wide in a roar, fangs showing.',
      noble: 'Calm and noble, mouth barely parted, heavy brows.',
      grinning: 'A comic grotesque grin with the tongue out, the tongue being the spout.',
      worn: 'So weathered that only a vague muzzle, eye hollows and a ruff of mane remain.',
    }),
    basin: choice('What does the water fall into?', {
      trough: 'A shallow rectangular stone trough.',
      shell: 'A half-round scallop basin bracketed out from the wall.',
      sarcophagus: 'A reused Roman sarcophagus with a wavy fluted front.',
      kerb: 'A low curved kerb pool at ground level.',
      bucket: 'No basin, only a wooden bucket someone has stood under it on a drain slab.',
    }),
    wall: choice('What is the mask mounted on?', {
      slab: 'A dressed stone slab with a small pediment on top, a proper fountain.',
      brick: 'A stretch of thin Roman brickwork with a round marble plaque behind the mask.',
      stele: 'A narrow round-topped stone pillar.',
      garden: 'A rough rubble garden wall with ivy creeping over it.',
    }),
    left: choice('What has someone left at it?', {
      nothing: 'Nothing.',
      jug: 'A clay jug standing on the rim to fill.',
      cup: 'A bronze cup hanging on a chain beside the mask.',
      coins: 'Coins thrown into the basin.',
      washing: 'A wet cloth draped over the edge of the basin.',
    }),
    scale: score('How big is the mask?', ['A small face the size of a hand', 'Life size', 'A giant mask as wide as the basin']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const running = a.flow === 'gushing' || a.flow === 'steady' || a.flow === 'dripping';
    const green = Math.min(1, wear * 0.7 + (a.flow === 'choked' ? 0.5 : a.flow === 'dry' ? 0.25 : 0) + (a.wall === 'garden' ? 0.2 : 0));

    const stoneTex = (base: string, speck: string) => painted(256, (ctx, n) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = speck; ctx.globalAlpha = 0.08 + random() * 0.18; ctx.fillRect(random() * n, random() * n, 1 + random() * 3, 1 + random() * 3); }
      for (let i = 0; i < green * 40; i++) {
        const x = random() * n, y = random() * n, r = 12 + random() * 36;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const tone = random() < 0.6 ? '78,96,52' : '70,58,44';
        g.addColorStop(0, `rgba(${tone},${0.12 + green * 0.26})`); g.addColorStop(1, `rgba(${tone},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    const stone = new THREE.MeshStandardMaterial({ map: stoneTex('#d9d3c4', '#8f897c'), roughness: 0.85, side: THREE.DoubleSide });
    const maskTone = { marble: '#ece8de', limestone: '#d6c7a2', bronze: '#a9793c', terracotta: '#b9603f', basalt: '#5b5c5e' }[a.mask];
    const maskColour = new THREE.Color(maskTone).lerp(new THREE.Color(a.mask === 'bronze' ? '#4f9079' : '#7b7f5c'), green * (a.mask === 'bronze' ? 0.75 : 0.4));
    const mask = new THREE.MeshStandardMaterial({ color: maskColour, roughness: a.mask === 'bronze' ? 0.45 : mix(0.45, 0.95, wear), metalness: a.mask === 'bronze' ? 0.7 : 0 });
    const hollow = new THREE.MeshStandardMaterial({ color: new THREE.Color(maskColour).multiplyScalar(0.22), roughness: 1 });
    const bronze = s.material('#8f6a35', { metalness: 0.7, roughness: 0.5 });
    const water = new THREE.MeshStandardMaterial({ color: new THREE.Color('#8fc7cf').lerp(new THREE.Color('#7f9a66'), wear * 0.5), roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.82 });
    const mossMat = s.material('#5c7a38', { roughness: 1 });

    // Wall.
    const wallW = { slab: 1.15, brick: 1.5, stele: 0.66, garden: 1.6 }[a.wall];
    const wallH = { slab: 1.6, brick: 1.75, stele: 1.7, garden: 1.5 }[a.wall];
    const T = 0.24;
    const R = mix(0.16, 0.33, a.scale);
    const maskY = Math.min(wallH - R * 1.5, a.basin === 'kerb' || a.basin === 'bucket' ? 0.85 + R : 1.02 + R * 0.7);
    if (a.wall === 'slab') {
      s.box([wallW, wallH, T], [0, wallH / 2, -T / 2], stone);
      s.box([wallW + 0.12, 0.08, T + 0.1], [0, wallH + 0.04, -T / 2], stone);
      const gable = new THREE.Shape([new THREE.Vector2(-wallW / 2 - 0.06, 0), new THREE.Vector2(wallW / 2 + 0.06, 0), new THREE.Vector2(0, 0.28)]);
      s.mesh(new THREE.ExtrudeGeometry(gable, { depth: T + 0.1, bevelEnabled: false }), stone, [0, wallH + 0.08, -T - 0.05]);
      s.box([wallW + 0.08, 0.12, T + 0.06], [0, 0.06, -T / 2], stone);
      for (const x of [-1, 1]) s.box([0.1, wallH - 0.12, 0.04], [x * (wallW / 2 - 0.05), wallH / 2 + 0.06, 0.02], stone);
    } else if (a.wall === 'brick' || a.wall === 'garden') {
      const brick = a.wall === 'brick';
      const map = painted(512, (ctx, n) => {
        ctx.fillStyle = brick ? '#c9b9a0' : '#7d776a'; ctx.fillRect(0, 0, n, n);
        const rows = brick ? 30 : 11;
        for (let r = 0; r < rows; r++) {
          let x = -random() * 60;
          const h = n / rows;
          while (x < n) {
            const w = brick ? 70 + random() * 30 : 40 + random() * 70;
            const tone = brick ? mix(0.38, 0.52, random()) : mix(0.42, 0.7, random());
            ctx.fillStyle = brick ? `hsl(${14 + random() * 12},${42 - wear * 14}%,${tone * 100}%)` : `hsl(${40 + random() * 30},${8 + random() * 8}%,${tone * 100}%)`;
            ctx.beginPath(); ctx.roundRect(x + 2, r * h + 2 + (brick ? 0 : random() * 3), w - 4, h - 4, brick ? 1 : 7); ctx.fill();
            x += w;
          }
        }
        for (let i = 0; i < green * 30; i++) { const x = random() * n, y = random() * n, r = 20 + random() * 50; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(70,92,48,0.55)'); g.addColorStop(1, 'rgba(70,92,48,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      });
      const wallMat = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
      s.box([wallW, wallH, T], [0, wallH / 2, -T / 2], wallMat);
      if (brick) {
        s.box([wallW + 0.06, 0.07, T + 0.06], [0, wallH + 0.035, -T / 2], stone);
        const plaque = s.cylinder(R * 1.9, R * 1.9, 0.05, [0, maskY, 0.02], stone, 36); plaque.rotation.x = Math.PI / 2;
        s.ring(R * 1.9, 0.02, [0, maskY, 0.045], stone);
      } else {
        const caps = Math.round(wallW / 0.2);
        for (let i = 0; i < caps; i++) s.ball([0.12 + random() * 0.04, 0.06 + random() * 0.05, T * 0.6], [-wallW / 2 + (i + 0.5) * wallW / caps, wallH + 0.01, -T / 2], wallMat, 8);
        s.box([R * 3, R * 3.2, 0.05], [0, maskY, 0.02], stone);
      }
    } else {
      s.box([wallW, wallH - wallW / 2, T], [0, (wallH - wallW / 2) / 2, -T / 2], stone);
      const cap = s.cylinder(wallW / 2, wallW / 2, T, [0, wallH - wallW / 2, -T / 2], stone, 36); cap.rotation.x = Math.PI / 2;
      s.box([wallW + 0.1, 0.1, T + 0.1], [0, 0.05, -T / 2], stone);
    }

    // Lion mask, built round the origin and then moved to the wall.
    const lion = new Sculpture(context);
    s.root.add(lion.root);
    lion.root.position.set(0, maskY, a.wall === 'stele' ? 0 : 0.04);
    const worn = a.face === 'worn';
    const open = { roaring: 1.5, noble: 0.55, grinning: 1.0, worn: 0.7 }[a.face];
    const maneMat = mask.clone();
    maneMat.color.multiplyScalar(a.mask === 'basalt' ? 1.5 : 0.78);
    const tufts = worn ? 13 : 20;
    for (let ringNo = 0; ringNo < (worn ? 1 : 2); ringNo++) for (let i = 0; i < tufts; i++) {
      const an = (i + ringNo * 0.5) / tufts * Math.PI * 2;
      const rr = R * (ringNo ? 0.78 : 1.02) * (0.94 + random() * 0.12);
      const at: P3 = [Math.sin(an) * rr, Math.cos(an) * rr * 1.05 - R * 0.06, R * (0.1 + ringNo * 0.12)];
      const lock = worn || ringNo
        ? lion.ball([R * (worn ? 0.26 : 0.15), R * (worn ? 0.34 : 0.36), R * 0.16], at, maneMat, 10)
        : lion.cylinder(R * 0.015, R * 0.16, R * 0.62, at, maneMat, 8);
      if (!worn && !ringNo) lock.scale.z = 0.7;
      lock.rotation.z = -an + (random() - 0.5) * 0.35 + (ringNo ? 0 : 0.22);
    }
    lion.ball([R * 0.8, R * 0.86, R * 0.52], [0, 0, R * 0.2], mask, 20);
    for (const x of [-1, 1]) {
      lion.ball([R * 0.22, R * 0.22, R * 0.12], [x * R * 0.6, R * 0.74, R * 0.42], mask, 10);
      if (!worn) lion.ball([R * 0.11, R * 0.12, R * 0.06], [x * R * 0.6, R * 0.72, R * 0.52], hollow, 8);
      const brow = lion.ball([R * 0.32, R * (worn ? 0.1 : 0.15), R * 0.2], [x * R * 0.33, R * 0.34, R * 0.58], mask, 10);
      brow.rotation.z = x * (a.face === 'roaring' ? -0.45 : a.face === 'grinning' ? 0.25 : -0.2);
      lion.ball([R * 0.13, R * (worn ? 0.12 : 0.085), R * 0.06], [x * R * 0.33, R * 0.17, R * 0.64], hollow, 8);
      lion.ball([R * 0.29, R * 0.24, R * 0.26], [x * R * 0.21, -R * 0.3, R * 0.62], mask, 12);
      lion.ball([R * 0.22, R * 0.3, R * 0.2], [x * R * 0.52, -R * 0.12, R * 0.42], mask, 10);
      if (a.face === 'roaring') for (const up of [1, -1]) {
        const fang = lion.cylinder(0.001, R * 0.045, R * 0.2, [x * R * 0.17, -R * (0.6 + open * 0.13) + up * R * open * 0.1, R * 0.66], mask, 6);
        if (up > 0) fang.rotation.z = Math.PI;
      }
    }
    lion.ball([R * 0.17, R * 0.38, R * 0.26], [0, R * 0.05, R * 0.6], mask, 10);
    lion.ball([R * 0.24, R * 0.14, R * 0.14], [0, -R * 0.14, R * 0.84], worn ? mask : hollow, 10);
    lion.ball([R * 0.16, R * 0.26, R * 0.14], [0, -R * 0.98, R * 0.36], maneMat, 8);
    const mouthY = -R * (0.52 + open * 0.1);
    const grin = a.face === 'grinning' ? 1.5 : 1;
    lion.ball([R * 0.3 * grin, R * 0.17 * open, R * 0.2], [0, mouthY, R * 0.6], hollow, 12);
    lion.ball([R * 0.3 * grin * 0.92, R * 0.13, R * 0.24], [0, mouthY - R * 0.17 * open, R * 0.5], mask, 12);
    const tipZ = R * (a.face === 'grinning' ? 1.05 : 0.95);
    if (a.face === 'grinning') {
      const tongue = lion.ball([R * 0.13, R * 0.05, R * 0.3], [0, mouthY - R * 0.03, R * 0.8], mask, 10);
      tongue.rotation.x = 0.35;
    } else lion.rod([0, mouthY, R * 0.5], [0, mouthY - R * 0.02, tipZ], Math.max(0.012, R * 0.07), bronze);
    if (a.flow === 'choked') lion.ball([R * 0.2, R * 0.13, R * 0.12], [0, mouthY, R * 0.8], mossMat, 8);

    // Basin.
    const spoutY = maskY + mouthY - R * 0.03, spoutZ = lion.root.position.z + tipZ;
    let waterY = 0, waterAt: P3 = [0, 0, 0.3], rimSpot: P3 = [0.3, 0.3, 0.3], waterR = 0.2;
    const wet = running || (a.flow === 'dry' && wear < 0.4);
    const surface = (w: number, d: number, at: P3, round = false) => {
      waterY = at[1]; waterAt = at; waterR = Math.min(w, d) * 0.45;
      const fill = round ? new THREE.CircleGeometry(w / 2, 32, 0, Math.PI) : new THREE.PlaneGeometry(w, d);
      const mesh = s.mesh(fill, wet ? water : s.material(a.flow === 'choked' ? '#6a5334' : '#b9b3a2', { roughness: 1 }), [at[0], at[1] - (wet ? 0 : 0.1), round ? 0.001 : at[2]]);
      mesh.rotation.x = -Math.PI / 2; mesh.castShadow = false;
      if (round) mesh.rotation.z = Math.PI;
    };
    if (a.basin === 'trough' || a.basin === 'sarcophagus') {
      const sarc = a.basin === 'sarcophagus';
      const w = sarc ? 1.7 : Math.max(0.9, wallW * 0.85), h = sarc ? 0.6 : 0.4, d = sarc ? 0.62 : 0.5, t = 0.07;
      const frontMat = sarc ? new THREE.MeshStandardMaterial({ roughness: 0.8, map: painted(512, (ctx, n) => {
        ctx.fillStyle = '#ddd6c6'; ctx.fillRect(0, 0, n, n);
        ctx.strokeStyle = '#8d8676'; ctx.lineWidth = 5;
        for (let i = -4; i < 40; i++) { ctx.beginPath(); for (let y = 30; y <= n - 30; y += 8) { const x = i * 16 + Math.sin((y / n) * Math.PI * 2) * 26 * (i < 18 ? 1 : -1); if (y === 30) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.fillStyle = '#ddd6c6'; ctx.fillRect(n / 2 - 46, 60, 92, n - 120); ctx.strokeRect(n / 2 - 46, 60, 92, n - 120);
        ctx.fillStyle = `rgba(80,96,54,${green * 0.5})`; ctx.fillRect(0, n * 0.7, n, n * 0.3);
      }) }) : stone;
      s.box([w, h, t], [0, h / 2, 0.02 + d], frontMat);
      s.box([w, h, t], [0, h / 2, 0.02 + t / 2], stone);
      for (const x of [-1, 1]) s.box([t, h, d], [x * (w / 2 - t / 2), h / 2, 0.02 + d / 2 + t / 2], stone);
      s.box([w, 0.06, d], [0, 0.03, 0.02 + d / 2 + t / 2], stone);
      if (!sarc) s.box([w + 0.06, 0.05, d + 0.1], [0, 0.025, 0.02 + d / 2 + t / 2], stone);
      surface(w - t * 2, d - t, [0, h - 0.06, 0.02 + d / 2 + t / 2]);
      rimSpot = [w * 0.34, h, 0.02 + d];
    } else if (a.basin === 'shell') {
      const y = 0.78, r = 0.52;
      const bowl = s.mesh(new THREE.LatheGeometry([[0.001, -0.3], [0.2, -0.28], [0.75, -0.12], [1, 0], [0.95, 0.02], [0.7, -0.08], [0.2, -0.2], [0.001, -0.21]].map(([x, yy]) => new THREE.Vector2(x * r, y + yy * r)), 28, Math.PI * 1.5, Math.PI), stone);
      bowl.rotation.y = 0;
      for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (i + 0.5) / 9 * Math.PI; const rib = s.ball([0.03, r * 0.09, r * 0.5], [Math.sin(an) * r * 0.55, y - r * 0.16, Math.cos(an) * r * 0.55], stone, 8); rib.rotation.order = 'YXZ'; rib.rotation.y = an; rib.rotation.x = -0.3; }
      s.box([0.2, 0.5, 0.24], [0, y - r * 0.3 - 0.2, 0.12], stone).rotation.x = 0.35;
      surface(r * 1.76, r * 0.88, [0, y - 0.03, r * 0.4], true);
      waterR = r * 0.4;
      rimSpot = [r * 0.62, y + 0.01, r * 0.62];
    } else if (a.basin === 'kerb') {
      const r = Math.max(0.6, wallW * 0.5);
      const kerb = s.mesh(new THREE.LatheGeometry([[r - 0.14, 0], [r, 0], [r, 0.2], [r - 0.02, 0.22], [r - 0.12, 0.22], [r - 0.14, 0.2]].map(([x, yy]) => new THREE.Vector2(x, yy)), 32, Math.PI * 1.5, Math.PI), stone);
      kerb.rotation.y = 0;
      s.cylinder(r - 0.1, r - 0.1, 0.03, [0, 0.015, 0], stone, 32).scale.z = 0.001 + 1;
      surface(r * 2 - 0.26, r - 0.13, [0, 0.15, r * 0.45], true);
      waterR = r * 0.4;
      rimSpot = [r * 0.66, 0.22, r * 0.66];
    } else {
      s.box([0.8, 0.06, 0.6], [0, 0.03, 0.32], stone);
      for (let i = -2; i <= 2; i++) s.box([0.03, 0.062, 0.3], [i * 0.07, 0.031, 0.36], hollow).castShadow = false;
      const wood = s.material('#7a5a38', { roughness: 0.9, side: THREE.DoubleSide });
      const bz = Math.min(0.5, spoutZ + 0.16);
      s.lathe([[0.001, 0.07], [0.15, 0.07], [0.18, 0.4], [0.165, 0.4], [0.14, 0.09], [0.001, 0.09]], wood, [0, 0, bz]);
      for (const y of [0.13, 0.33]) s.ring(0.155 + y * 0.08, 0.008, [0, y, bz], s.material('#3a3632', { metalness: 0.5 })).rotation.x = Math.PI / 2;
      const bail = s.ring(0.17, 0.006, [0, 0.4, bz], s.material('#3a3632', { metalness: 0.5 }), Math.PI); bail.rotation.y = Math.PI / 2; bail.rotation.x = 0.9;
      waterY = 0.34; waterAt = [0, 0.34, bz]; waterR = 0.15;
      if (wet) { const disc = s.cylinder(0.165, 0.165, 0.004, [0, 0.34, bz], water, 20); disc.castShadow = false; }
      rimSpot = [0.28, 0.06, 0.42];
    }

    // Water in the air.
    const drops: THREE.Mesh[] = [];
    const ripples: THREE.Mesh[] = [];
    const fall = Math.max(0.05, spoutY - waterY);
    const reach = a.flow === 'gushing' ? Math.min(0.34, Math.max(0.12, waterAt[2] - spoutZ + 0.08)) : a.flow === 'steady' ? 0.07 : 0.01;
    if (a.flow === 'gushing' || a.flow === 'steady') {
      const pts: P3[] = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([0, spoutY - fall * t * t, spoutZ - 0.02 + reach * t]); }
      const stream = s.tube(pts, a.flow === 'gushing' ? Math.max(0.018, R * 0.07) : 0.008, water);
      stream.castShadow = false;
      const foam = s.material('#f2fbfb', { roughness: 0.6 });
      if (a.flow === 'gushing') s.scatter(new THREE.IcosahedronGeometry(1, 0), foam, Array.from({ length: 14 }, () => ({ at: [(random() - 0.5) * 0.16, waterY + 0.01 + random() * 0.03, spoutZ + reach + (random() - 0.5) * 0.14] as P3, size: 0.012 + random() * 0.016 }))).castShadow = false;
    }
    if (running) {
      const pale = new THREE.MeshBasicMaterial({ color: '#f1fbfa', transparent: true, opacity: 0.6, depthWrite: false });
      for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 36), pale); ring.rotation.x = Math.PI / 2; ring.position.set(0, waterY + 0.012, Math.min(spoutZ + reach, waterAt[2] + 0.1)); ring.userData.phase = i / 3; ring.scale.setScalar(0.04 + i * waterR * 0.3); s.root.add(ring); ripples.push(ring); }
      if (a.flow === 'dripping') for (let i = 0; i < 3; i++) { const drop = s.ball([0.012, 0.018, 0.012], [0, spoutY - fall * (i + 0.6) / 3.4, spoutZ], water, 8); drop.userData.phase = i / 3; drop.castShadow = false; drops.push(drop); }
    }
    // Stain and moss below the mouth.
    if (green > 0.25 || !running) {
      const streak = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.3, fall + R * 0.3), new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 1, map: painted(128, (ctx, n) => {
        for (let i = 0; i < 26; i++) { const x = n / 2 + (random() - 0.5) * n * 0.6, w = 3 + random() * 12; const g = ctx.createLinearGradient(0, 0, 0, n); const tone = random() < 0.6 ? '62,92,48' : '96,66,38'; g.addColorStop(0, `rgba(${tone},0.75)`); g.addColorStop(0.4 + random() * 0.6, `rgba(${tone},0)`); ctx.fillStyle = g; ctx.fillRect(x - w / 2, 0, w, n); }
      }) }));
      streak.position.set(0, spoutY - (fall + R * 0.3) / 2 + R * 0.1, a.wall === 'stele' || a.wall === 'slab' ? 0.006 : 0.05);
      s.root.add(streak);
    }
    if (green > 0.4) s.scatter(new THREE.IcosahedronGeometry(1, 0), mossMat, Array.from({ length: Math.round(green * 46) }, () => {
      const onWall = random() < 0.5;
      return { at: (onWall ? [(random() - 0.5) * wallW * 0.9, random() < 0.5 ? random() * 0.3 : wallH - random() * 0.1, 0.01 + random() * 0.02] : [waterAt[0] + (random() - 0.5) * waterR * 3.6, waterY + 0.05 + random() * 0.03, waterAt[2] + waterR * (0.9 + random() * 0.3)]) as P3, size: 0.02 + random() * 0.03, color: random() < 0.5 ? '#5f7d36' : '#7a8a3a' };
    }));
    if (a.flow === 'choked') s.scatter(new THREE.CircleGeometry(1, 5), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), Array.from({ length: 40 }, () => ({ at: [waterAt[0] + (random() - 0.5) * waterR * 3, waterY - 0.08 + random() * 0.03, waterAt[2] + (random() - 0.5) * waterR * 1.4] as P3, size: 0.03 + random() * 0.03, color: ['#8a5a2b', '#a9772f', '#5e4526', '#b08c3e'][Math.floor(random() * 4)] }))).rotation.x = 0;
    if (a.wall === 'garden') {
      const leaves: { at: P3; size: number; color: string }[] = [];
      for (let vine = 0; vine < 4; vine++) {
        let x = (vine < 2 ? -1 : 1) * wallW * (0.3 + random() * 0.18), y = vine % 2 ? wallH : 0;
        const dir = vine % 2 ? -1 : 1, path: P3[] = [];
        for (let i = 0; i < 8; i++) { path.push([x, y, 0.012]); for (let k = 0; k < 3; k++) leaves.push({ at: [x + (random() - 0.5) * 0.16, y + (random() - 0.5) * 0.12, 0.03], size: 0.035 + random() * 0.03, color: random() < 0.5 ? '#3f6b33' : '#58803a' }); x += (random() - 0.5) * 0.14; y += dir * (0.08 + random() * 0.1); }
        s.tube(path, 0.008, s.material('#4a3a26'));
      }
      s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.9 }), leaves);
    }

    // Left behind.
    if (a.left === 'jug') {
      const clay = s.material('#b5683f', { roughness: 0.8, side: THREE.DoubleSide });
      const [x, y, z] = rimSpot;
      s.lathe([[0.001, 0], [0.05, 0], [0.1, 0.1], [0.085, 0.2], [0.035, 0.25], [0.05, 0.3], [0.04, 0.3], [0.028, 0.25]], clay, [x, y, z - 0.04]);
      s.ring(0.045, 0.01, [x + 0.07, y + 0.22, z - 0.04], clay, Math.PI).rotation.z = -Math.PI / 2;
    } else if (a.left === 'cup') {
      const x = R * 1.5 + 0.1;
      s.rod([x, maskY + 0.1, 0.05], [x, maskY + 0.12, 0.09], 0.008, bronze);
      for (let i = 0; i < 9; i++) s.ring(0.014, 0.003, [x, maskY + 0.09 - i * 0.022, 0.085], bronze).rotation.y = i % 2 ? Math.PI / 2 : 0;
      const cupMat = new THREE.MeshStandardMaterial({ color: '#a9793c', metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide });
      s.lathe([[0.001, -0.1], [0.03, -0.1], [0.05, 0], [0.046, 0], [0.028, -0.09]], cupMat, [x, maskY - 0.11, 0.085]).rotation.z = 0.5;
    } else if (a.left === 'coins' && a.basin !== 'bucket') {
      s.scatter(new THREE.CylinderGeometry(1, 1, 0.16, 10), s.material('#c9a24a', { metalness: 0.8, roughness: 0.35 }), Array.from({ length: Math.round(mix(8, 34, mood.density)) }, () => ({ at: [waterAt[0] + (random() - 0.5) * waterR * 2.6, waterY - (wet ? 0.005 : 0.09), waterAt[2] + (random() - 0.5) * waterR * 1.2] as P3, size: 0.014 + random() * 0.008, color: random() < 0.35 ? '#9aa3a0' : '#d6b04e' })));
    } else if (a.left === 'washing') {
      const [x, y, z] = rimSpot;
      const cloth = s.material(mood.cheer > 0.5 ? '#c9553f' : '#8f8a7c', { roughness: 1, side: THREE.DoubleSide });
      const geo = new THREE.PlaneGeometry(0.3, 0.5, 6, 10);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = p.getY(i) / 0.5 + 0.5, u = p.getX(i); p.setXYZ(i, u, v < 0.55 ? -(0.55 - v) * 0.5 : 0.004, v < 0.55 ? 0.045 + 0.012 * Math.sin(u * 40) : 0.045 - (v - 0.55) * 0.5); }
      geo.computeVertexNormals();
      s.mesh(geo, cloth, [-x * 0.6, y + 0.006, a.basin === 'shell' || a.basin === 'kerb' ? z : z]).rotation.y = a.basin === 'shell' || a.basin === 'kerb' ? -0.75 : 0;
    }

    const pace = mix(0.25, 1.4, mood.energy);
    return s.finish({
      update: running ? (_dt, time) => {
        for (const ring of ripples) { const t = (time * pace + ring.userData.phase) % 1; ring.scale.setScalar(0.03 + t * waterR * 0.9); }
        for (const drop of drops) { const t = (time * pace + drop.userData.phase) % 1; drop.position.y = spoutY - fall * t * t; }
      } : undefined,
    });
  },
});
