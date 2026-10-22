import * as THREE from 'three';
import { diorama, choice, defineWorld, mix, clamp01 } from '@conjure/kit';

type P3 = [number, number, number];

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r, t = turn + (i / 10) * Math.PI * 2;
    if (i) ctx.lineTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr); else ctx.moveTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr);
  }
  ctx.closePath();
}
function texture(size: [number, number], paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = size;
  paint(canvas.getContext('2d')!, size[0], size[1]);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(...repeat); }
  return map;
}

export default defineWorld({
  questions: {
    curtain: choice('What is the stage curtain like?', {
      'red-gold': 'Deep red velvet scattered with gold stars.',
      'blue-silver': 'Royal blue with silver stars, a patriotic showbiz backdrop.',
      'purple-glitter': 'Purple with a sparkle of tiny pink and white stars.',
      'stripes': 'Broad red and white circus stripes with a few big stars.',
    }),
    drawn: choice('How are the curtains hanging?', {
      open: 'Tied back wide open at both sides of the stage.',
      half: 'Half drawn, crowding in on the performers.',
      torn: 'One side has come off its rail and lies heaped on the stage.',
      gone: 'Stripped out: bare plywood, a breaker box and cables where the backdrop was.',
    }),
    walls: choice('What are the walls like?', {
      panel: 'Cream wallpaper with pinstripes over dark wood wainscot.',
      mural: 'A purple and teal 1980s mural of squiggles, triangles and zigzags.',
      circus: 'Red and cream circus stripes above a dark red dado.',
      block: 'Painted cinderblock in mustard yellow with a red racing stripe.',
    }),
    floor: choice('What covers the floor?', {
      confetti: 'Navy arcade carpet printed with neon confetti squiggles.',
      brown: 'Worn rust-brown carpet with traffic paths.',
      checker: 'Red and white checkerboard vinyl tile.',
    }),
    sign: choice('What does the sign over the stage say?', {
      showtime: 'SHOWTIME', band: 'THE PIZZA TIME BAND', birthday: 'HAPPY BIRTHDAY', fun: 'FUN FOR ALL', next: 'NEXT SHOW 3:00',
    }),
    seating: choice('What is the seating in front of the stage?', {
      booths: 'Vinyl booths with pedestal tables along the wall.',
      long: 'A long party table with a paper cloth and benches.',
      upturned: 'Tables tipped on their sides and chairs stacked against the wall.',
    }),
    door: choice('What about the fire door at the side of the stage?', {
      propped: 'Propped open with a cinder block, grey daylight falling across the carpet.',
      closed: 'Shut, with a glowing EXIT sign above it.',
      chained: 'Chained and padlocked, the EXIT sign dark.',
    }),
    left: choice('What has been left on the floor?', {
      nothing: 'Nothing but dust.',
      party: 'Party debris: cups, cone hats, streamers and limp balloons.',
      clearing: 'Stacked chairs, cardboard boxes and a roll of carpet, mid clear-out.',
      repair: 'A stepladder, a toolbox and a cable reel, as if someone means to fix it.',
      leaks: 'Buckets under the leaks, puddles and fallen ceiling tiles.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const show = clamp01(mood.cheer * 0.75 + mood.energy * 0.55 - 0.3);
    const gloom = clamp01(mood.wear * 0.6 + (1 - mood.cheer) * 0.5);
    const stageH = 0.45;
    const slots: [number, number][] = [[0, -3.35], [-3.1, -3.5], [3.1, -3.5], [-2.9, 2.0], [3.3, 2.0], [0.2, 3.3]];
    const background = new THREE.Color('#bfc3c2').lerp(new THREE.Color('#e9dcc2'), show).getStyle();
    const { art: s, world } = diorama(context, { background, floor: '#ffffff', width: 14, depth: 11, maxHeight: 2.55, radius: 1.2, pitch: 27, yaw: 24, slots });
    const root = s.root;
    for (const child of root.children) {
      const hemi = child as THREE.HemisphereLight;
      if (hemi.isHemisphereLight) { hemi.intensity = mix(1.1, 1.5, show); hemi.color.set(show > 0.5 ? '#fff4e2' : '#e6ecf2'); }
    }
    const dull = (hex: string, amount = gloom * 0.4) => new THREE.Color(hex).lerp(new THREE.Color('#8f8c84'), amount);
    const hexOf = (hex: string, amount?: number) => `#${dull(hex, amount).getHexString()}`;
    const mat = (hex: string, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: dull(hex), roughness: 0.85, ...options });

    // Floor.
    const floorMap = texture([256, 256], (ctx, w, h) => {
      if (a.floor === 'checker') {
        ctx.fillStyle = hexOf('#ece6d8'); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = hexOf('#b8322c'); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(i * 64, j * 64, 64, 64);
      } else if (a.floor === 'brown') {
        ctx.fillStyle = hexOf('#8a4f38'); ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,190,0.07)'; ctx.fillRect(random() * w, random() * h, 2, 2); }
      } else {
        ctx.fillStyle = hexOf('#27305c'); ctx.fillRect(0, 0, w, h);
        const neon = ['#ff4fa3', '#35e0d0', '#ffd23a', '#8a5cff', '#ff7a2a'];
        ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 26; i++) {
          const x = random() * w, y = random() * h, kind = Math.floor(random() * 3);
          ctx.strokeStyle = ctx.fillStyle = hexOf(neon[i % neon.length]);
          if (kind === 0) { ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 12, y - 18, x + 20, y + 18, x + 34, y); ctx.stroke(); }
          else if (kind === 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 16, y + 4); ctx.lineTo(x + 6, y + 18); ctx.closePath(); ctx.fill(); }
          else { ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.3); ctx.fill(); }
        }
      }
    }, [7, 5.5]);
    const groundMesh = world.ground as THREE.Mesh;
    (groundMesh.material as THREE.MeshStandardMaterial).map = floorMap;
    (groundMesh.material as THREE.MeshStandardMaterial).color.set('#ffffff');
    (groundMesh.material as THREE.MeshStandardMaterial).roughness = 0.95;
    // Water stains and traffic wear on the carpet.
    const stainMat = new THREE.MeshStandardMaterial({ color: '#3a3128', transparent: true, opacity: 0.32, depthWrite: false, roughness: 1 });
    const stainCount = Math.round(gloom * 9);
    for (let i = 0; i < stainCount; i++) {
      const blot = s.mesh(new THREE.CircleGeometry(0.4 + random() * 0.9, 18), stainMat, [(random() - 0.5) * 12, 0.006 + i * 0.0006, -1.4 + random() * 6.4]);
      blot.rotation.x = -Math.PI / 2; blot.scale.y = 0.5 + random() * 0.6; blot.castShadow = false;
    }

    // Walls with their own paint and age.
    const WH = 4.4;
    const wallMap = (wide: number) => texture([1024, 512], (ctx, w, h) => {
      const dado = h * 0.74;
      if (a.walls === 'panel') {
        ctx.fillStyle = hexOf('#e6d9bb'); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = hexOf('#cdbb94'); for (let x = 0; x < w; x += 14) ctx.fillRect(x, 0, 3, dado);
        ctx.fillStyle = hexOf('#6b4a30'); ctx.fillRect(0, dado, w, h - dado);
        ctx.fillStyle = hexOf('#4f3521'); for (let x = 0; x < w; x += 46) ctx.fillRect(x, dado, 4, h - dado);
        ctx.fillStyle = hexOf('#8a6440'); ctx.fillRect(0, dado - 8, w, 14);
      } else if (a.walls === 'mural') {
        const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, hexOf('#6a3fa8')); g.addColorStop(1, hexOf('#2f9aa8'));
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const tints = ['#ff4fa3', '#ffd23a', '#35e0d0', '#f4f0e4', '#ff7a2a'];
        for (let i = 0; i < 46 * wide / 14; i++) {
          const x = random() * w, y = random() * h * 0.95, kind = i % 4;
          ctx.strokeStyle = ctx.fillStyle = hexOf(tints[i % tints.length]); ctx.lineWidth = 9; ctx.lineJoin = 'miter';
          if (kind === 0) { ctx.beginPath(); ctx.moveTo(x, y); for (let k = 1; k < 6; k++) ctx.lineTo(x + k * 22, y + (k % 2 ? 26 : 0)); ctx.stroke(); }
          else if (kind === 1) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y + 14); ctx.lineTo(x + 14, y + 52); ctx.closePath(); ctx.fill(); }
          else if (kind === 2) { ctx.beginPath(); ctx.arc(x, y, 22, 0, 6.3); ctx.stroke(); }
          else { ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y - 50, x + 60, y + 50, x + 100, y); ctx.stroke(); }
        }
        ctx.fillStyle = hexOf('#27305c'); ctx.fillRect(0, h * 0.9, w, h * 0.1);
      } else if (a.walls === 'circus') {
        const n = Math.round(wide * 2.2);
        for (let i = 0; i < n; i++) { ctx.fillStyle = hexOf(i % 2 ? '#c2352e' : '#efe6cf'); ctx.fillRect(i * w / n, 0, w / n + 1, dado); }
        ctx.fillStyle = hexOf('#7a1f22'); ctx.fillRect(0, dado, w, h - dado);
        ctx.fillStyle = hexOf('#d6a93c'); ctx.fillRect(0, dado - 6, w, 10);
      } else {
        ctx.fillStyle = hexOf('#d9b23f'); ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(80,60,20,0.35)'; ctx.lineWidth = 2;
        const bw = w / (wide * 2.4), bh = h / 22;
        for (let row = 0; row < 22; row++) for (let x = (row % 2) * bw / 2 - bw; x < w; x += bw) ctx.strokeRect(x, row * bh, bw, bh);
        ctx.fillStyle = hexOf('#c2352e'); ctx.fillRect(0, h * 0.6, w, h * 0.07);
        ctx.fillStyle = hexOf('#f2ecd8'); ctx.fillRect(0, h * 0.67, w, h * 0.015);
      }
      // Water runs down from the ceiling line, mould creeps up from the floor.
      for (let i = 0; i < gloom * 16 * wide / 14; i++) {
        const x = random() * w, len = h * (0.2 + random() * 0.7), wd = 10 + random() * 40;
        const g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, 'rgba(72,58,36,0.6)'); g.addColorStop(1, 'rgba(72,58,36,0)');
        ctx.fillStyle = g; ctx.fillRect(x, 0, wd, len);
      }
      for (let i = 0; i < gloom * 40; i++) { ctx.fillStyle = 'rgba(40,52,40,0.25)'; ctx.beginPath(); ctx.arc(random() * w, h - random() * 60, 6 + random() * 22, 0, 6.3); ctx.fill(); }
    });
    const backWall = s.box([14, WH, 0.22], [0, WH / 2, -5.4], new THREE.MeshStandardMaterial({ map: wallMap(14), roughness: 0.92 }));
    const leftWall = s.box([0.22, WH, 10.8], [-6.9, WH / 2, 0], new THREE.MeshStandardMaterial({ map: wallMap(10.8), roughness: 0.92 }));
    backWall.castShadow = leftWall.castShadow = false;
    s.box([14, 0.12, 0.26], [0, 0.06, -5.36], mat('#3a2e26'));
    s.box([0.26, 0.12, 10.8], [-6.86, 0.06, 0], mat('#3a2e26'));

    // The stage platform.
    const SW = 9.4, SD = 3.4, SZ = -3.6;
    const carpet = mat(a.floor === 'brown' ? '#5a2a2a' : '#7a2430', { roughness: 0.97 });
    s.box([SW, stageH, SD], [0, stageH / 2, SZ], mat('#3d2a22'));
    s.box([SW, 0.03, SD], [0, stageH + 0.005, SZ], carpet);
    const frontZ = SZ + SD / 2;
    const fasciaMap = texture([1024, 64], (ctx, w, h) => {
      ctx.fillStyle = hexOf('#27305c'); ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 20; i++) { ctx.fillStyle = hexOf(i % 2 ? '#f2d24a' : '#f4f0e4'); starPath(ctx, 26 + i * 51, h / 2, 15, (random() - 0.5) * 0.4); ctx.fill(); }
    });
    s.box([SW, stageH - 0.06, 0.03], [0, stageH / 2 - 0.01, frontZ + 0.016], new THREE.MeshStandardMaterial({ map: fasciaMap, roughness: 0.8 }));
    s.box([SW + 0.04, 0.05, 0.08], [0, stageH, frontZ + 0.03], mat('#c9a040', { metalness: 0.5, roughness: 0.4 }));
    s.box([1.3, 0.15, 0.7], [3.7, 0.075, frontZ + 0.35], carpet);
    s.box([1.3, 0.3, 0.35], [3.7, 0.15, frontZ + 0.175], carpet);

    // Proscenium: posts, header with the show sign, valance.
    const HY = 3.55, PX = 4.72, PZ = frontZ - 0.12;
    const frame = mat(show > 0.5 ? '#b3262e' : '#7d3236', { roughness: 0.6 });
    for (const x of [-1, 1]) s.box([0.3, HY, 0.3], [x * PX, HY / 2, PZ], frame);
    s.box([PX * 2 + 0.3, 0.5, 0.3], [0, HY + 0.1, PZ], frame);
    const signText = { showtime: 'SHOWTIME', band: 'THE PIZZA TIME BAND', birthday: 'HAPPY BIRTHDAY', fun: 'FUN FOR ALL', next: 'NEXT SHOW 3:00' }[a.sign];
    const signMap = texture([1024, 128], (ctx, w, h) => {
      ctx.fillStyle = hexOf('#1c1f3a'); ctx.fillRect(0, 0, w, h);
      const size = Math.min(92, 940 / signText.length * 1.5);
      ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const step = Math.min(size * 0.68, 940 / signText.length);
      [...signText].forEach((ch, i) => {
        const dead = random() < mood.wear * 0.3;
        ctx.fillStyle = dead ? '#4a4850' : i % 2 ? '#ffd23a' : '#ff6a4a';
        ctx.fillText(ch, w / 2 + (i - (signText.length - 1) / 2) * step, h / 2 + 4);
      });
    });
    const signMat = new THREE.MeshStandardMaterial({ map: signMap, emissive: '#ffffff', emissiveMap: signMap, emissiveIntensity: show * 1.3, roughness: 0.5 });
    const signW = Math.min(6.4, signText.length * 0.42 + 0.6);
    s.box([signW + 0.14, 0.6, 0.1], [0, HY + 0.52, PZ + 0.12], mat('#c9a040', { metalness: 0.5, roughness: 0.4 }));
    s.mesh(new THREE.PlaneGeometry(signW, 0.5), signMat, [0, HY + 0.52, PZ + 0.175]);

    const [clothA, clothB, starTint] = { 'red-gold': ['#9a1f2a', '#7d1822', '#f0cf5a'], 'blue-silver': ['#243f9a', '#1b3180', '#e6e9ee'], 'purple-glitter': ['#6a2f9a', '#56247f', '#ffb6e0'], stripes: ['#c2352e', '#efe6cf', '#f0cf5a'] }[a.curtain];
    const clothMap = texture([256, 256], (ctx, w, h) => {
      ctx.fillStyle = hexOf(clothA); ctx.fillRect(0, 0, w, h);
      if (a.curtain === 'stripes') { ctx.fillStyle = hexOf(clothB); for (let i = 0; i < 4; i += 2) ctx.fillRect(i * 64, 0, 64, h); }
      else { ctx.fillStyle = hexOf(clothB); for (let i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 12, h); }
      const count = a.curtain === 'purple-glitter' ? 46 : a.curtain === 'stripes' ? 5 : 12;
      for (let i = 0; i < count; i++) {
        ctx.fillStyle = hexOf(a.curtain === 'purple-glitter' && i % 2 ? '#f4f0e4' : starTint, gloom * 0.25);
        starPath(ctx, random() * w, random() * h, a.curtain === 'purple-glitter' ? 4 + random() * 6 : a.curtain === 'stripes' ? 26 : 12 + random() * 12, random()); ctx.fill();
      }
      for (let i = 0; i < gloom * 10; i++) { const x = random() * w; const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(40,30,22,0.5)'); g.addColorStop(1, 'rgba(40,30,22,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, 8 + random() * 18, h); }
    }, [1, 1]);
    const cloth = new THREE.MeshStandardMaterial({ map: clothMap, roughness: 0.95, side: THREE.DoubleSide });
    const drape = (w: number, h: number, at: P3, pleat = 5, droop = 0) => {
      const geometry = new THREE.PlaneGeometry(w, h, Math.max(8, Math.ceil(w * 14)), 6);
      const pos = geometry.attributes.position as THREE.BufferAttribute, uv = geometry.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / w + 0.5, v = pos.getY(i) / h + 0.5;
        uv.setXY(i, u * w / 1.7, v * h / 1.7);
        const fall = droop * (1 - u) ** 2;
        pos.setXYZ(i, pos.getX(i) + fall * 0.4 * v, pos.getY(i) - fall * h * 0.55 * v, Math.sin(u * w * pleat * 2) * 0.07 * (1.15 - v * 0.4) + fall * 0.25);
      }
      geometry.computeVertexNormals();
      return s.mesh(geometry, cloth, at);
    };
    const railY = HY - 0.2, backZ = -5.2;
    const sagging = clamp01((mood.wear - 0.45) * 2) * (1 - show);
    if (a.drawn !== 'gone') {
      drape(SW - 0.1, railY - stageH, [0, (railY + stageH) / 2, backZ], 4);
      const legW = a.drawn === 'half' ? 2.3 : 1.15;
      for (const side of [-1, 1]) {
        const torn = a.drawn === 'torn' && side === 1;
        if (torn) {
          // The fallen leg: a heap on the stage and a strip still clinging to the rail.
          for (let i = 0; i < 5; i++) { const lump = s.ball([0.5 + random() * 0.35, 0.1 + random() * 0.1, 0.3 + random() * 0.2], [side * (PX - 0.75) - random() * 0.5, stageH + 0.1, PZ - 0.5 - random() * 0.5], cloth, 12); lump.rotation.y = random() * 3; }
          const strip = drape(0.5, 1.5, [side * (PX - 0.42), railY - 0.75, PZ - 0.3], 9, 0); strip.rotation.z = 0.12;
          continue;
        }
        const leg = drape(legW, railY - stageH, [side * (PX - 0.2 - legW / 2), (railY + stageH) / 2, PZ - 0.3], a.drawn === 'half' ? 6 : 12, side === -1 ? sagging : 0);
        if (side === 1) leg.scale.x = -1;
        if (a.drawn === 'open') s.box([legW * 0.5, 0.08, 0.24], [side * (PX - 0.42), stageH + 1.25, PZ - 0.3], mat('#d6a93c', { metalness: 0.4 }));
      }
    } else {
      const ply = texture([256, 128], (ctx, w, h) => {
        ctx.fillStyle = hexOf('#b89868'); ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i++) { ctx.strokeStyle = 'rgba(90,60,30,0.25)'; ctx.beginPath(); const y = random() * h; ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + random() * 12, 170, y - random() * 12, w, y + 4); ctx.stroke(); }
        ctx.fillStyle = 'rgba(40,30,20,0.6)'; for (let i = 1; i < 4; i++) ctx.fillRect(i * 64, 0, 2, h);
      });
      s.box([SW - 0.1, railY - stageH, 0.06], [0, (railY + stageH) / 2, backZ], new THREE.MeshStandardMaterial({ map: ply, roughness: 0.9 }));
      s.box([0.5, 0.7, 0.14], [-3.4, 2.0, backZ + 0.1], mat('#6f757b', { metalness: 0.5 }));
      const cable = mat('#1c1c20');
      for (let i = 0; i < 5; i++) s.tube([[-3.4 + i * 0.06, 1.66, backZ + 0.12], [-3.2 + i * 0.4, 1.1 - i * 0.08, backZ + 0.2], [-2.0 + i * 1.3, stageH + 0.05, backZ + 0.35 + random() * 0.5], [-1 + i * 1.4, stageH + 0.03, backZ + 0.3 + random() * 0.8]], 0.014, cable);
    }
    s.rod([-PX, railY, PZ - 0.3], [PX, railY, PZ - 0.3], 0.025, mat('#2a2a2e', { metalness: 0.6 }));
    // Scalloped valance under the header.
    const scallops = 13, scallopW = (PX * 2 - 0.3) / scallops;
    const scallop = new THREE.InstancedMesh(new THREE.CircleGeometry(scallopW * 0.54, 14, Math.PI, Math.PI), cloth, scallops);
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e4 = new THREE.Euler();
    for (let i = 0; i < scallops; i++) {
      const fallen = sagging > 0.3 && i > scallops - 4;
      e4.set(0, 0, fallen ? -0.5 : 0); q4.setFromEuler(e4);
      m4.compose(new THREE.Vector3(-PX + 0.15 + (i + 0.5) * scallopW, HY - 0.14 - (fallen ? (i - scallops + 4) * 0.12 : 0), PZ + 0.16), q4, new THREE.Vector3(1, 1.25, 1));
      scallop.setMatrixAt(i, m4);
    }
    scallop.castShadow = true;
    root.add(scallop);

    // Valance and stage-edge bulbs in three chase groups plus the dead ones.
    const bulbMats = [0, 1, 2].map(() => new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffc04a', emissiveIntensity: show * 2.2, roughness: 0.4 }));
    const deadBulb = mat('#6f6a5c', { roughness: 0.5 });
    const groups: { at: P3; size: number }[][] = [[], [], [], []];
    const bulbAt = (at: P3, i: number) => groups[random() < mood.wear * 0.35 + (1 - show) * 0.12 ? 3 : i % 3].push({ at, size: 0.055 });
    for (let i = 0; i < 34; i++) bulbAt([-PX + 0.1 + i * (PX * 2 - 0.2) / 33, HY + 0.3, PZ + 0.17], i);
    for (let i = 0; i < 34; i++) bulbAt([-PX + 0.1 + i * (PX * 2 - 0.2) / 33, HY - 0.1, PZ + 0.17], i + 1);
    for (const x of [-1, 1]) for (let i = 0; i < 11; i++) bulbAt([x * PX, 0.4 + i * 0.28, PZ + 0.17], i);
    for (let i = 0; i < 30; i++) bulbAt([-SW / 2 + 0.15 + i * (SW - 0.3) / 29, stageH + 0.03, frontZ + 0.09], i + 2);
    const bulbGeometry = new THREE.SphereGeometry(1, 8, 6);
    groups.forEach((group, i) => { if (group.length) s.scatter(i === 0 ? bulbGeometry : bulbGeometry.clone(), i < 3 ? bulbMats[i] : deadBulb, group).castShadow = false; });

    // Spotlight rail out in front of the header.
    const railZ = PZ + 1.25, spotY = HY + 0.05;
    const pipe = mat('#2a2a2e', { metalness: 0.6, roughness: 0.5 });
    s.rod([-PX + 0.4, spotY, railZ], [PX - 0.4, spotY, railZ], 0.03, pipe);
    for (const x of [-1, 1]) { s.rod([x * (PX - 0.6), HY + 0.2, PZ], [x * (PX - 0.6), spotY, railZ], 0.02, pipe); s.rod([x * (PX - 0.6), HY + 0.34, PZ + 0.1], [x * (PX - 0.6), spotY, railZ], 0.012, pipe); }
    const gels = ['#ff4a3a', '#ffb02a', '#3a8cff', '#4be06a', '#ff5ac8'];
    const spots = show > 0.45;
    const beams: THREE.MeshBasicMaterial[] = [];
    gels.forEach((gel, i) => {
      const x = -3.2 + i * 1.6;
      const can = new THREE.Group();
      can.position.set(x, spotY - 0.2, railZ);
      const hanging = mood.wear > 0.55 && i === 3;
      const target = new THREE.Vector3(x * 0.55, stageH + 1.2, -3.4);
      can.lookAt(hanging ? new THREE.Vector3(x + 0.6, 0, railZ + 0.3) : target);
      if (hanging) can.position.y -= 0.35;
      const body = s.cylinder(0.13, 0.1, 0.34, [0, 0, 0], pipe, 14); body.rotation.x = Math.PI / 2;
      const on = spots && !hanging && random() > mood.wear * 0.4;
      const lens = s.cylinder(0.118, 0.118, 0.02, [0, 0, 0.175], new THREE.MeshStandardMaterial({ color: on ? gel : '#3a3d42', emissive: gel, emissiveIntensity: on ? 2.2 : 0, roughness: 0.2 }), 14); lens.rotation.x = Math.PI / 2;
      can.add(body, lens);
      root.add(can);
      s.rod([x, spotY, railZ], [x, can.position.y + 0.08, railZ], hanging ? 0.004 : 0.016, pipe);
      if (on) {
        const length = can.position.distanceTo(target);
        const beamMat = new THREE.MeshBasicMaterial({ color: gel, transparent: true, opacity: 0.17 * show, depthWrite: false, side: THREE.DoubleSide });
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.1, length, 16, 1, true), beamMat);
        beam.rotation.x = -Math.PI / 2; beam.position.z = length / 2 + 0.18;
        can.add(beam);
        beams.push(beamMat);
        const pool = s.mesh(new THREE.CircleGeometry(0.85, 20), new THREE.MeshBasicMaterial({ color: gel, transparent: true, opacity: 0.24 * show, depthWrite: false }), [target.x, stageH + 0.03 + i * 0.001, -3.4]);
        pool.rotation.x = -Math.PI / 2; pool.castShadow = false;
      }
    });

    // The one fixture that still buzzes, on the side wall.
    const tubeMat = new THREE.MeshStandardMaterial({ color: '#f4f8ff', emissive: '#dfeaff', emissiveIntensity: 2.2, roughness: 0.3 });
    s.box([0.1, 0.16, 1.5], [-6.74, 3.5, 1.2], mat('#c9ccd0', { metalness: 0.4 }));
    s.box([0.05, 0.07, 1.4], [-6.67, 3.5, 1.2], tubeMat).castShadow = false;
    const washMat = new THREE.MeshBasicMaterial({ color: '#e8f0ff', transparent: true, opacity: 0.16, depthWrite: false });
    const wash = s.mesh(new THREE.PlaneGeometry(3.4, 2.2), washMat, [-6.78, 3.3, 1.2]); wash.rotation.y = Math.PI / 2; wash.castShadow = false;
    s.box([0.1, 0.16, 1.5], [-6.74, 3.5, -2.4], mat('#c9ccd0', { metalness: 0.4 }));
    const deadTube = s.box([0.05, 0.07, 1.4], [-6.67, 3.42, -2.4], mat('#8f9498')); deadTube.rotation.x = 0.08 * mood.wear;
    // Framed mascot portraits along the side wall.
    const faces = ['#8a5a34', '#b9a6d6', '#e8c531', '#e58a3a'];
    faces.slice(0, 3).forEach((tint, i) => {
      const z = -3.2 + i * 2.2;
      if (mood.wear > 0.7 && i === 1) { s.box([0.02, 0.92, 0.72], [-6.78, 2.25, z], mat('#f2ecd8')); return; }
      const portrait = texture([128, 160], (ctx, w, h) => {
        ctx.fillStyle = hexOf(['#35b0c0', '#ff7a8a', '#6a4fc8'][i]); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = hexOf(tint);
        ctx.beginPath(); ctx.arc(34, 46, 18, 0, 6.3); ctx.arc(94, 46, 18, 0, 6.3); ctx.fill();
        if (i === 1) { ctx.fillRect(28, 4, 16, 50); ctx.fillRect(84, 4, 16, 50); }
        ctx.beginPath(); ctx.arc(64, 86, 44, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(48, 76, 9, 0, 6.3); ctx.arc(80, 76, 9, 0, 6.3); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(49, 77, 4, 0, 6.3); ctx.arc(81, 77, 4, 0, 6.3); ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(64, 92, 22, 0.3, Math.PI - 0.3); ctx.stroke();
        ctx.fillStyle = hexOf('#f2d24a'); ctx.fillRect(0, h - 22, w, 22);
      });
      const frame2 = s.box([0.05, 1.0, 0.8], [-6.77, 2.3, z], mat('#c9a040', { metalness: 0.4 }));
      const pic = s.mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [-6.74, 2.3, z]);
      pic.rotation.y = Math.PI / 2;
      const crooked = (random() - 0.5) * mood.wear * 0.5;
      frame2.rotation.x = pic.rotation.z = crooked; pic.rotation.order = 'YXZ';
    });

    // Fire door beside the stage.
    const DX = 5.85, DW = 1.05, DH = 2.15;
    s.box([DW + 0.2, DH + 0.1, 0.06], [DX, (DH + 0.1) / 2, -5.27], mat('#55585e', { metalness: 0.4 }));
    const doorLeaf = mat('#8a3a34', { metalness: 0.2, roughness: 0.6 });
    const exitOn = a.door === 'closed' || (a.door === 'propped' && show > 0.3);
    const exitMap = texture([128, 64], (ctx, w, h) => { ctx.fillStyle = exitOn ? '#f6fff4' : '#b9c0b8'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = exitOn ? '#d8201c' : '#6a3a38'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('EXIT', w / 2, h / 2 + 3); });
    const exitMat = new THREE.MeshStandardMaterial({ map: exitMap, emissive: '#ffffff', emissiveMap: exitMap, emissiveIntensity: exitOn ? 1.3 : 0 });
    s.box([0.62, 0.3, 0.1], [DX, DH + 0.42, -5.24], mat('#2a2a2e'));
    s.mesh(new THREE.PlaneGeometry(0.56, 0.24), exitMat, [DX, DH + 0.42, -5.185]);
    if (a.door === 'propped') {
      const day = new THREE.MeshStandardMaterial({ color: '#eef2f4', emissive: '#e6edf2', emissiveIntensity: 1.5 });
      s.box([DW, DH, 0.02], [DX, DH / 2, -5.26], day).castShadow = false;
      const leaf = s.box([0.05, DH, DW], [DX + DW / 2 + 0.02, DH / 2, -5.24 + DW / 2], doorLeaf); leaf.rotation.y = -0.22; leaf.position.x -= 0.1;
      s.box([0.4, 0.2, 0.2], [DX + DW / 2 - 0.32, 0.1, -4.42], mat('#9a9a94')).rotation.y = 0.3;
      const spill = new THREE.Shape(); spill.moveTo(DX - DW / 2, 5.22); spill.lineTo(DX + DW / 2, 5.22); spill.lineTo(DX - 0.4, 1.0); spill.lineTo(DX - 2.6, 1.6); spill.closePath();
      const light = s.mesh(new THREE.ShapeGeometry(spill), new THREE.MeshBasicMaterial({ color: '#f2f6f8', transparent: true, opacity: mix(0.34, 0.16, show), depthWrite: false }), [0, 0.012, 0]);
      light.rotation.x = -Math.PI / 2; light.castShadow = false;
    } else {
      s.box([DW, DH, 0.05], [DX, DH / 2, -5.23], doorLeaf);
      s.box([DW * 0.8, 0.07, 0.07], [DX, 1.05, -5.17], mat('#c9ccd0', { metalness: 0.8, roughness: 0.3 }));
      if (a.door === 'chained') {
        const chain = mat('#7d8288', { metalness: 0.8, roughness: 0.4 });
        for (let i = 0; i < 9; i++) { const link = s.mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 10), chain, [DX - 0.36 + i * 0.09, 1.05 - Math.sin(i / 8 * Math.PI) * 0.16, -5.12]); link.rotation.y = i % 2 ? Math.PI / 2 : 0; }
        s.box([0.1, 0.12, 0.05], [DX, 0.84, -5.1], mat('#c9a040', { metalness: 0.7 }));
      }
    }

    // Seating along the side wall.
    const vinyl = mat(show > 0.5 ? '#c2352e' : '#8a3a3a', { roughness: 0.5 });
    const laminate = mat('#d9cdb0', { roughness: 0.5 }), chrome = mat('#c9ccd0', { metalness: 0.8, roughness: 0.3 });
    if (a.seating === 'booths') {
      for (const z of [-0.6, 2.6]) {
        s.box([1.1, 0.05, 0.75], [-6.15, 0.74, z], laminate); s.cylinder(0.05, 0.05, 0.72, [-6.05, 0.36, z], chrome, 10); s.cylinder(0.25, 0.27, 0.03, [-6.05, 0.015, z], chrome, 16);
        for (const side of [-1, 1]) { s.box([1.15, 0.45, 0.45], [-6.2, 0.225, z + side * 0.78], vinyl); s.box([1.15, 0.7, 0.12], [-6.2, 0.75, z + side * 1.0], vinyl); }
        if (random() < 0.7) s.cylinder(0.04, 0.035, 0.11, [-6.2 + random() * 0.3, 0.82, z + (random() - 0.5) * 0.3], mat('#e23b3b'), 10);
        if (random() < 0.6) s.mesh(new THREE.ConeGeometry(0.07, 0.2, 12), mat(['#3fb6d8', '#f4d93a', '#f27aa8'][Math.floor(random() * 3)]), [-5.95, 0.865, z + (random() - 0.5) * 0.4]);
      }
    } else if (a.seating === 'long') {
      s.box([0.8, 0.05, 4.2], [-6.05, 0.72, 1.2], laminate);
      s.box([0.84, 0.3, 4.24], [-6.05, 0.6, 1.2], mat(a.floor === 'checker' ? '#f4f0e4' : '#f2e3a0', { roughness: 0.9 }));
      for (const z of [-0.6, 3.0]) for (const x of [-6.35, -5.75]) s.rod([x, 0.45, z], [x, 0, z], 0.02, chrome);
      s.box([0.3, 0.05, 4.0], [-5.35, 0.42, 1.2], laminate);
      for (const z of [-0.5, 2.9]) s.box([0.26, 0.42, 0.05], [-5.35, 0.21, z], chrome);
      for (let i = 0; i < 7; i++) {
        const z = -0.6 + i * 0.6;
        s.cylinder(0.1, 0.08, 0.012, [-6.0, 0.756, z], mat('#f6f3ea'), 14);
        if (random() < 0.6) { const hat = s.mesh(new THREE.ConeGeometry(0.06, 0.18, 12), mat(['#3fb6d8', '#f4d93a', '#f27aa8', '#3fae5a'][i % 4]), [-6.25, 0.84, z + 0.1]); if (random() < 0.4) { hat.rotation.z = 1.2; hat.position.y = 0.8; } }
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const top = s.box([0.05, 1.0, 1.6], [-6.4 + i * 0.5, 0.52, 0.2 + i * 2.2], laminate); top.rotation.z = 0.12 + random() * 0.2;
        s.rod([-6.35 + i * 0.5, 0.5, 0.2 + i * 2.2], [-5.6 + i * 0.5, 0.42, 0.2 + i * 2.2], 0.04, chrome);
        s.cylinder(0.25, 0.27, 0.03, [-5.58 + i * 0.5, 0.42, 0.2 + i * 2.2], chrome, 16).rotation.z = Math.PI / 2;
      }
      for (let i = 0; i < 6; i++) { s.box([0.42, 0.04, 0.42], [-6.35, 0.44 + i * 0.09, -2.0], vinyl); }
      for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) s.rod([-6.35 + dx, 0, -2.0 + dz], [-6.35 + dx, 0.44, -2.0 + dz], 0.012, chrome);
      s.box([0.42, 0.5, 0.04], [-6.35, 1.2, -2.2], vinyl);
    }

    // What was left on the floor.
    const bright = ['#e23b3b', '#f4d93a', '#3fae5a', '#2f8fd8', '#f27aa8', '#8a4fc8'];
    const clutter = Math.round(mix(6, 26, mood.density));
    const freeSpot = (): [number, number] => {
      for (let tries = 0; tries < 20; tries++) {
        const x = -5 + random() * 11, z = -1.3 + random() * 6.2;
        if (slots.every(([sx, sz]) => Math.hypot(x - sx, z - sz) > 1.45)) return [x, z];
      }
      return [5.8, 4.4];
    };
    if (a.left === 'party') {
      for (let i = 0; i < clutter; i++) {
        const [x, z] = freeSpot(), kind = i % 4, tint = bright[i % bright.length];
        if (kind === 0) { const cup = s.cylinder(0.04, 0.032, 0.1, [x, 0.04, z], mat(tint), 10); cup.rotation.z = Math.PI / 2; cup.rotation.y = random() * 3; }
        else if (kind === 1) { const hat = s.mesh(new THREE.ConeGeometry(0.07, 0.2, 12), mat(tint), [x, 0.07, z]); hat.rotation.set(Math.PI / 2 - 0.34, 0, 0); hat.rotation.order = 'YXZ'; hat.rotation.y = random() * 6; }
        else if (kind === 2) s.ball([0.11, show > 0.6 ? 0.13 : 0.05, 0.13], [x, show > 0.6 ? 0.13 : 0.05, z], mat(tint, { roughness: 0.4 }), 10);
        else s.tube([[x, 0.012, z], [x + 0.3, 0.012, z + 0.2 * (random() - 0.5)], [x + 0.5, 0.012, z + 0.4 * (random() - 0.5)], [x + 0.9, 0.012, z + 0.1]], 0.012, mat(tint));
      }
    } else if (a.left === 'clearing') {
      const card = mat('#b89363', { roughness: 0.95 });
      for (let i = 0; i < Math.min(9, 3 + clutter / 4); i++) { const bx = 5.2 + (i % 2) * 0.75, bz = 0.2 + Math.floor(i / 2) % 3 * 0.8; s.box([0.6, 0.45, 0.5], [bx, 0.225 + Math.floor(i / 6) * 0.46, bz], card).rotation.y = (random() - 0.5) * 0.3; }
      for (let i = 0; i < 8; i++) s.box([0.42, 0.045, 0.42], [5.9, 0.44 + i * 0.09, 3.9], vinyl);
      for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) s.rod([5.9 + dx, 0, 3.9 + dz], [5.9 + dx, 0.44, 3.9 + dz], 0.012, chrome);
      const roll = s.cylinder(0.22, 0.22, 3.2, [1.6, 0.22, 4.7], carpet, 16); roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.12;
    } else if (a.left === 'repair') {
      const alu = mat('#b9bfc2', { metalness: 0.7, roughness: 0.4 });
      const lx = 5.5, lz = 1.2;
      for (const side of [-1, 1]) { s.rod([lx + side * 0.25, 0, lz + 0.45], [lx + side * 0.18, 2.0, lz], 0.025, alu); s.rod([lx + side * 0.25, 0, lz - 0.45], [lx + side * 0.18, 2.0, lz], 0.02, alu); }
      for (let i = 1; i < 6; i++) s.rod([lx - 0.25 + i * 0.011, i * 0.33, lz + 0.45 - i * 0.075], [lx + 0.25 - i * 0.011, i * 0.33, lz + 0.45 - i * 0.075], 0.016, alu);
      s.box([0.42, 0.04, 0.2], [lx, 2.0, lz], mat('#e8a020'));
      s.box([0.5, 0.2, 0.24], [lx - 1.0, 0.1, lz + 0.9], mat('#c2352e', { metalness: 0.3 })); s.box([0.3, 0.03, 0.03], [lx - 1.0, 0.24, lz + 0.9], chrome);
      const reel = s.cylinder(0.3, 0.3, 0.26, [lx - 0.3, 0.3, lz + 2.4], mat('#3a2e26'), 18); reel.rotation.x = Math.PI / 2;
      s.tube([[lx - 0.3, 0.05, lz + 2.3], [3.6, 0.02, 2.9 + random()], [1.4, 0.02, 4.5], [-1.5, 0.02, 4.2 + random() * 0.4], [-4.6, 0.02, 4.6]], 0.016, mat('#e8a020'));
    } else if (a.left === 'leaks') {
      const puddle = new THREE.MeshStandardMaterial({ color: '#59606a', roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.6, depthWrite: false });
      for (let i = 0; i < 4; i++) {
        const [x, z] = freeSpot();
        s.cylinder(0.17, 0.13, 0.26, [x, 0.13, z], mat(['#e8c22a', '#2f6fd0', '#e8eef2', '#c2352e'][i]), 14);
        const pool = s.mesh(new THREE.CircleGeometry(0.5 + random() * 0.5, 18), puddle, [x + 0.3, 0.008, z + 0.2]); pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.6; pool.castShadow = false;
      }
      for (let i = 0; i < clutter / 3; i++) { const [x, z] = freeSpot(); const tile = s.box([0.6, 0.02, 0.6 * (0.4 + random() * 0.6)], [x, 0.012, z], mat('#d8d4c8', { roughness: 1 })); tile.rotation.y = random() * 3; }
    }
    // Dust and plaster crumbs everywhere once the place has gone quiet.
    if (gloom > 0.3) {
      const crumbs: { at: P3; size: number }[] = [];
      for (let i = 0; i < gloom * 90; i++) crumbs.push({ at: [(random() - 0.5) * 13, random() < 0.25 ? stageH + 0.03 : 0.012, random() < 0.25 ? -2.2 - random() * 2.8 : -1.6 + random() * 6.6], size: 0.02 + random() * 0.05 });
      crumbs.forEach((c) => { if (c.at[1] > 0.1 && Math.abs(c.at[0]) > SW / 2) c.at[1] = 0.012; });
      s.scatter(new THREE.BoxGeometry(1, 0.3, 0.8), mat('#cfc9bb', { roughness: 1 }), crumbs).castShadow = false;
    }
    // Balloons come back with the show.
    const bobbers: THREE.Object3D[] = [];
    if (show > 0.55) for (const x of [-1, 1]) for (let i = 0; i < 3; i++) {
      const bx = x * (PX + 0.45) + (i - 1) * 0.24, by = 2.4 + i * 0.3 + random() * 0.2, bz = PZ + 0.5 + random() * 0.2;
      const balloon = s.ball([0.18, 0.22, 0.18], [bx, by, bz], new THREE.MeshStandardMaterial({ color: bright[(i + (x > 0 ? 3 : 0)) % bright.length], roughness: 0.25 }), 14);
      s.rod([x * (PX + 0.2), 1.0, PZ + 0.3], [bx, by - 0.22, bz], 0.004, mat('#f0ece0'));
      bobbers.push(balloon);
    }

    // The cast on the stage stands on the platform, not the arcade floor.
    const place = world.place.bind(world);
    world.place = (items) => {
      place(items);
      items.forEach((item, index) => { if (index % slots.length < 3) item.holder.position.y += stageH + 0.02; });
    };
    const phase = random() * 20, buzzy = mix(0.25, 1, Math.max(mood.wear, 1 - show));
    world.update = (_dt, time) => {
      const t = time + phase;
      const step = Math.floor(t * mix(1.5, 7, mood.energy));
      bulbMats.forEach((material, i) => { material.emissiveIntensity = show * (step % 3 === i ? 2.6 : 0.9); });
      const flick = Math.sin(t * 61) * 0.06 + (Math.sin(t * 2.3) + Math.sin(t * 7.1) > 1.5 - buzzy * 0.6 ? -0.75 * buzzy : 0);
      tubeMat.emissiveIntensity = 2.2 * (1 + flick);
      washMat.opacity = 0.16 * (1 + flick);
      beams.forEach((beam, i) => { beam.opacity = 0.17 * show * (0.8 + 0.2 * Math.sin(t * 2 + i * 1.7)); });
      bobbers.forEach((balloon, i) => { balloon.rotation.z = Math.sin(t * 0.8 + i) * 0.08; });
    };
    return world;
  },
});
