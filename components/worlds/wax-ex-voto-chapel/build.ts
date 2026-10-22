import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { type Placeable, Sculpture, choice, clamp01, defineWorld, diorama, mix } from '@conjure/kit';

type V3 = [number, number, number];
const W = 6, D = 5, H = 3.5, BACK = -D / 2, LEFT = -W / 2, THICK = 0.4;
const ALTAR_Z = -1.92, ALTAR_TOP = 1.0;
const NICHE = { x0: 1.62, x1: 2.58, y0: 1.25, y1: 2.5 };
/** x, z, standing height, tallest allowed, widest radius allowed, largest scale. */
const SLOTS: [number, number, number, number, number, number][] = [
  [0, ALTAR_Z, ALTAR_TOP + 0.015, 1.3, 0.52, 4.2],
  [2.3, 0.3, 0.9, 0.9, 0.4, 3.2],
  [-1.75, 0.75, 0, 1.4, 0.58, 3.4],
  [0.35, 1.35, 0, 1.1, 0.52, 3],
  [-2.4, -1.0, 0.56, 0.8, 0.36, 3],
];
const ALMS = { portugal: 'ESMOLAS', mexico: 'LIMOSNAS', bavaria: 'OPFER', cyprus: 'ELEOS' } as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
interface Inst { p: V3; s?: V3 | number; r?: V3; c?: THREE.ColorRepresentation }

export default defineWorld({
  questions: {
    region: choice('Where is this chapel?', {
      portugal: 'Portugal: whitewash over a dado of blue and white azulejo tiles.',
      mexico: 'Mexico: rose-pink limewash over a deep blue band, paper bunting and marigolds.',
      bavaria: 'Bavaria: cream plaster over dark wood panelling, a baroque gilt frame or two.',
      cyprus: 'Cyprus: bare honey-coloured stone blocks, hanging brass lamps and a gold icon.',
    }),
    offerings: choice('What do the offerings on the wall mostly consist of?', {
      wax: 'Wax body parts: legs, arms, heads and hearts in cream wax on ribbons.',
      tin: 'Tin and silver milagros: stamped plaques and hearts that glitter in the candlelight.',
      tablets: 'Small painted tablets, each one showing an accident or a sickbed and a saint in the corner.',
      photos: 'Photographs and letters: faces, hospital snapshots and folded notes.',
      crutches: 'Crutches and braces left behind by people who walked out without them.',
    }),
    candles: choice('How many candles are burning on the iron rack?', {
      one: 'One, alone.',
      some: 'A handful, at different heights.',
      full: 'The whole rack blazing.',
      out: 'None: all burnt down to stubs.',
    }),
    glass: choice('What colour is the light from the one small window?', {
      red: 'Ruby red.',
      blue: 'Deep blue.',
      amber: 'Amber gold.',
      green: 'Bottle green.',
      clear: 'Plain dusty white through clear panes.',
    }),
    niche: choice('What stands behind the bars of the niche?', {
      saint: 'A painted wooden saint with a gilt halo.',
      madonna: 'A dark-faced Madonna in a stiff gold dress and crown.',
      skull: 'A skull on a red cushion between two small candles.',
      monstrance: 'A gilt sunburst reliquary that glows.',
      flowers: 'Nothing but a jar of flowers and a framed photograph.',
    }),
    cloth: choice('What covers the altar ledge?', {
      lace: 'A white lace-edged cloth.',
      red: 'Red cloth with a gold fringe.',
      purple: 'Plain purple, as in Lent.',
      bare: 'Nothing: bare stone with a carved cross.',
    }),
    floor: choice('What is the floor?', {
      flags: 'Worn grey stone flags.',
      terracotta: 'Square terracotta tiles.',
      checker: 'Black and white marble, scuffed dull.',
    }),
    lately: choice('What has happened here lately?', {
      justleft: 'Someone has just left: a shawl on the kneeler, a fresh bouquet on the step.',
      feast: 'It is the feast day: garlands on the wall and petals all over the floor.',
      forgotten: 'Nobody has come for years: cobwebs, dead flowers, votives fallen to the floor.',
      tended: 'The sacristan is half way through tidying: a ladder, a bucket, a box of new candles.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const { art: s, world } = diorama(context, {
      background: '#c9b9a4', floor: '#a8a092', width: W, depth: D, maxHeight: 1, radius: 0.5, pitch: 23, yaw: 13,
      slots: SLOTS.map(([x, z]) => [x, z] as const),
    });
    const wear = mood.wear, forgotten = a.lately === 'forgotten', feast = a.lately === 'feast';
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    // Dusk: bring the stock lights down and warm them so the candles carry the room.
    s.root.traverse((node) => {
      const light = node as THREE.Light;
      if ((light as THREE.HemisphereLight).isHemisphereLight) { light.intensity = 0.86; light.color.set('#f3e6d2'); (light as THREE.HemisphereLight).groundColor.set('#6f5f50'); }
      else if ((light as THREE.DirectionalLight).isDirectionalLight) light.intensity *= light.castShadow ? 0.62 : 0.5;
    });

    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Inst[], shadow = true) => {
      if (!items.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      items.forEach((it, i) => {
        q.setFromEuler(e.set(...(it.r ?? [0, 0, 0])));
        if (typeof it.s === 'number') sc.setScalar(it.s); else sc.set(...(it.s ?? [1, 1, 1]));
        mesh.setMatrixAt(i, m.compose(v.set(...it.p), q, sc));
        if (it.c !== undefined) mesh.setColorAt(i, new THREE.Color(it.c));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = shadow; mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const stand = (build: (p: Sculpture) => void, at: V3, turn = 0) => {
      const piece = new Sculpture(context);
      build(piece);
      piece.root.position.set(...at); piece.root.rotation.y = turn;
      s.root.add(piece.root);
      return piece.root;
    };

    const pal = {
      portugal: { wall: '#cfc7b4', dado: 1.3, stone: '#b3a995', wood: '#5d4330' },
      mexico: { wall: '#c88f7c', dado: 1.0, stone: '#b7a58c', wood: '#6a4a30' },
      bavaria: { wall: '#d1c5aa', dado: 1.2, stone: '#aba291', wood: '#4f3826' },
      cyprus: { wall: '#c4aa7c', dado: 0, stone: '#bfa678', wood: '#5d452c' },
    }[a.region];
    const stone = s.material(pal.stone, { roughness: 0.95 });
    const stoneDark = s.material(new THREE.Color(pal.stone).multiplyScalar(0.78), { roughness: 0.95 });
    const wood = s.material(pal.wood, { roughness: 0.8 });
    const iron = s.material('#2b2826', { metalness: 0.5, roughness: 0.6 });
    const brass = s.material('#b8934a', { metalness: 0.75, roughness: 0.35 });
    const waxTint = new THREE.Color('#ead9b0').lerp(new THREE.Color('#c9a968'), wear * 0.6);
    const wax = new THREE.MeshStandardMaterial({ color: waxTint, roughness: 0.4, emissive: '#5a3a14', emissiveIntensity: 0.35 });
    const tin = new THREE.MeshStandardMaterial({ color: mix(0, 1, wear) > 0.6 ? '#8f8f88' : '#d5d8d6', metalness: 0.85, roughness: 0.3, emissive: '#3a3a36', emissiveIntensity: 0.5 });
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });

    // ---- Floor ----
    const floorTex = paint(960, 800, (ctx) => {
      const base = { flags: '#9c958a', terracotta: '#a8684a', checker: '#b9b4a8' }[a.floor];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 960, 800);
      if (a.floor === 'flags') {
        let y = 0;
        while (y < 800) {
          const h = 90 + random() * 60; let x = -random() * 80;
          while (x < 960) { const w = 110 + random() * 120; ctx.fillStyle = `hsl(${34 + random() * 12},${7 + random() * 8}%,${50 + random() * 12}%)`; ctx.fillRect(x + 3, y + 3, w - 6, h - 6); x += w; }
          y += h;
        }
      } else if (a.floor === 'terracotta') {
        for (let x = 0; x < 12; x++) for (let y = 0; y < 10; y++) { ctx.fillStyle = `hsl(${14 + random() * 10},${38 + random() * 14}%,${42 + random() * 12}%)`; ctx.fillRect(x * 80 + 3, y * 80 + 3, 74, 74); }
      } else {
        for (let x = 0; x < 12; x++) for (let y = 0; y < 10; y++) { ctx.fillStyle = (x + y) % 2 ? '#4a4844' : '#c9c4b6'; ctx.fillRect(x * 80 + 1, y * 80 + 1, 78, 78); }
      }
      for (let i = 0; i < 20 + wear * 60; i++) { ctx.fillStyle = `rgba(40,32,24,${0.06 + random() * 0.12})`; ctx.beginPath(); ctx.ellipse(random() * 960, random() * 800, 10 + random() * 70, 8 + random() * 40, random() * 3, 0, 7); ctx.fill(); }
      // Wax spatter under the candle rack.
      for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(240,228,196,0.8)'; ctx.beginPath(); ctx.arc(((1.4 + (random() - 0.5) * 1.3 - LEFT) / W) * 960, ((0.3 + (random() - 0.5) * 0.9 - BACK) / D) * 800, 2 + random() * 5, 0, 7); ctx.fill(); }
    });
    const groundMat = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
    groundMat.map = floorTex; groundMat.color.set('#ffffff'); groundMat.roughness = 0.85;

    // ---- Walls ----
    const PPM = 150;
    const wallTex = (metres: number, plumes: readonly number[]) => paint(Math.round(metres * PPM), Math.round(H * PPM), (ctx) => {
      const w = metres * PPM, h = H * PPM, Y = (y: number) => h - y * PPM;
      ctx.fillStyle = pal.wall; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,250,235' : '90,70,50'},0.05)`; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 80, 14 + random() * 60, 0, 0, 7); ctx.fill(); }
      if (a.region === 'cyprus') {
        ctx.strokeStyle = 'rgba(90,70,40,0.55)'; ctx.lineWidth = 3;
        for (let row = 0; row * 0.36 < H; row++) {
          ctx.beginPath(); ctx.moveTo(0, Y(row * 0.36)); ctx.lineTo(w, Y(row * 0.36)); ctx.stroke();
          for (let x = (row % 2) * 0.35 + random() * 0.1; x < metres; x += 0.6 + random() * 0.2) {
            ctx.fillStyle = `rgba(${random() < 0.5 ? '255,240,200' : '110,85,50'},${0.05 + random() * 0.1})`; ctx.fillRect(x * PPM, Y(row * 0.36 + 0.36), 0.7 * PPM, 0.36 * PPM);
            ctx.beginPath(); ctx.moveTo(x * PPM, Y(row * 0.36)); ctx.lineTo(x * PPM, Y(row * 0.36 + 0.36)); ctx.stroke();
          }
        }
      } else if (a.region === 'portugal') {
        const t = 0.1625 * PPM;
        for (let x = 0; x < w; x += t) for (let y = 0; y < 8; y++) {
          const px = x, py = Y(pal.dado) + y * t;
          ctx.fillStyle = '#e4e2d8'; ctx.fillRect(px + 1, py + 1, t - 2, t - 2);
          ctx.strokeStyle = '#2f4f9a'; ctx.fillStyle = '#2f4f9a'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(px + t / 2, py + t / 2, t * 0.26, 0, 7); ctx.stroke();
          ctx.beginPath(); ctx.arc(px + t / 2, py + t / 2, t * 0.09, 0, 7); ctx.fill();
          for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { ctx.beginPath(); ctx.arc(px + cx * t, py + cy * t, t * 0.2, 0, 7); ctx.fill(); }
        }
        ctx.fillStyle = '#2f4f9a'; ctx.fillRect(0, Y(pal.dado) - 8, w, 10);
        ctx.fillStyle = '#d8b040'; ctx.fillRect(0, Y(pal.dado) - 14, w, 5);
      } else if (a.region === 'mexico') {
        ctx.fillStyle = '#35548c'; ctx.fillRect(0, Y(pal.dado), w, pal.dado * PPM);
        ctx.fillStyle = '#e0a83a'; ctx.fillRect(0, Y(pal.dado) - 9, w, 9);
        ctx.fillStyle = '#f1e2c0'; ctx.fillRect(0, Y(pal.dado) - 15, w, 4);
      } else {
        ctx.fillStyle = '#5a4130'; ctx.fillRect(0, Y(pal.dado), w, pal.dado * PPM);
        for (let x = 0; x < w; x += 0.42 * PPM) {
          ctx.fillStyle = `rgba(${random() < 0.5 ? '30,20,10' : '140,105,70'},0.22)`; ctx.fillRect(x + 6, Y(pal.dado) + 12, 0.42 * PPM - 12, pal.dado * PPM - 24);
          ctx.strokeStyle = 'rgba(25,16,8,0.7)'; ctx.lineWidth = 3; ctx.strokeRect(x + 6, Y(pal.dado) + 12, 0.42 * PPM - 12, pal.dado * PPM - 24);
        }
        ctx.fillStyle = '#3f2c1e'; ctx.fillRect(0, Y(pal.dado) - 10, w, 12);
      }
      // Candle soot: a veil from the ceiling and a plume above every flame that ever burned here.
      const veil = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      veil.addColorStop(0, `rgba(30,24,18,${mix(0.38, 0.72, wear)})`); veil.addColorStop(1, 'rgba(30,24,18,0)');
      ctx.fillStyle = veil; ctx.fillRect(0, 0, w, h);
      for (const x of plumes) {
        ctx.save(); ctx.translate(x * PPM, Y(1.9)); ctx.scale(0.75 * PPM, 1.5 * PPM);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(26,20,15,${mix(0.3, 0.55, wear)})`); g.addColorStop(1, 'rgba(26,20,15,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < wear * 12; i++) {
        ctx.strokeStyle = 'rgba(40,30,22,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath();
        let x = random() * w, y = random() * h * 0.7; ctx.moveTo(x, y);
        for (let k = 0; k < 7; k++) { x += (random() - 0.5) * 50; y += 20 + random() * 40; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      if (wear > 0.55) for (let i = 0; i < 3; i++) {
        const x = random() * w, y = h * (0.25 + random() * 0.45), r = 30 + random() * 50;
        ctx.fillStyle = '#8a5f48'; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, random(), 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(60,40,28,0.8)'; ctx.lineWidth = 2;
        for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x - r, y + k * 13); ctx.lineTo(x + r, y + k * 13); ctx.stroke(); }
      }
    });
    const backMat = new THREE.MeshStandardMaterial({ map: wallTex(W, [1.4, -1.1, 1.1, -2.2]), roughness: 0.92 });
    const backPiece = (x0: number, x1: number, y0: number, y1: number) => {
      s.box([x1 - x0, y1 - y0, THICK], [(x0 + x1) / 2, (y0 + y1) / 2, BACK - THICK / 2], stoneDark);
      const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0), uv = g.attributes.uv as THREE.BufferAttribute;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, (mix(x0, x1, uv.getX(k)) - LEFT) / W, mix(y0, y1, uv.getY(k)) / H);
      s.mesh(g, backMat, [(x0 + x1) / 2, (y0 + y1) / 2, BACK + 0.004]);
    };
    backPiece(LEFT, NICHE.x0, 0, H); backPiece(NICHE.x1, W / 2, 0, H);
    backPiece(NICHE.x0, NICHE.x1, 0, NICHE.y0); backPiece(NICHE.x0, NICHE.x1, NICHE.y1, H);
    s.box([THICK, H, D + THICK], [LEFT - THICK / 2, H / 2, -THICK / 2], stoneDark);
    const side = s.mesh(new THREE.PlaneGeometry(D, H), new THREE.MeshStandardMaterial({ map: wallTex(D, [0.4]), roughness: 0.92 }), [LEFT + 0.004, H / 2, 0]);
    side.rotation.y = Math.PI / 2;
    s.box([W + THICK, 0.14, THICK + 0.1], [-THICK / 2, H + 0.07, BACK - THICK / 2 + 0.05], stone);
    s.box([THICK + 0.1, 0.14, D + THICK], [LEFT - THICK / 2 + 0.05, H + 0.07, -THICK / 2], stone);

    // ---- The barred niche ----
    const ncx = (NICHE.x0 + NICHE.x1) / 2, nw = NICHE.x1 - NICHE.x0, nh = NICHE.y1 - NICHE.y0;
    const recess = s.material('#4a3a30', { roughness: 1 });
    s.box([nw, nh, 0.04], [ncx, NICHE.y0 + nh / 2, BACK - THICK + 0.02], new THREE.MeshStandardMaterial({ color: '#6a4c34', emissive: '#c8742a', emissiveIntensity: a.niche === 'monstrance' ? 0.75 : 0.32, roughness: 1 }));
    for (const x of [NICHE.x0, NICHE.x1]) s.box([0.02, nh, THICK], [x + (x < ncx ? 0.01 : -0.01), NICHE.y0 + nh / 2, BACK - THICK / 2], recess);
    s.box([nw, 0.02, THICK], [ncx, NICHE.y1 - 0.01, BACK - THICK / 2], recess);
    s.box([nw + 0.3, 0.1, THICK + 0.14], [ncx, NICHE.y0 - 0.05, BACK - THICK / 2 + 0.07], stone);
    s.box([nw + 0.24, 0.12, 0.08], [ncx, NICHE.y1 + 0.06, BACK + 0.04], stone);
    for (const x of [NICHE.x0 - 0.06, NICHE.x1 + 0.06]) s.box([0.12, nh, 0.08], [x, NICHE.y0 + nh / 2, BACK + 0.04], stone);
    s.ring(nw / 2 + 0.06, 0.05, [ncx, NICHE.y1 + 0.12, BACK + 0.04], stone, Math.PI);
    const bars: Inst[] = [];
    for (let k = 0; k < 6; k++) bars.push({ p: [NICHE.x0 + (k + 0.5) * nw / 6, NICHE.y0 + nh / 2, BACK + 0.02], s: [1, nh, 1] });
    instances(new THREE.CylinderGeometry(0.014, 0.014, 1, 8), iron, bars);
    for (const y of [0.22, 0.78]) s.box([nw, 0.03, 0.012], [ncx, NICHE.y0 + nh * y, BACK + 0.03], iron);
    s.box([0.09, 0.11, 0.03], [NICHE.x1 - 0.1, NICHE.y0 + nh * 0.5, BACK + 0.045], brass);
    stand((p) => {
      if (a.niche === 'saint') {
        const robe = p.material(pick(['#2f5f9a', '#7a3a2a', '#3f7a5a']), { roughness: 0.6 });
        p.lathe([[0, 0], [0.2, 0], [0.17, 0.25], [0.12, 0.55], [0.13, 0.66], [0.06, 0.72], [0, 0.72]], robe);
        p.ball([0.085, 0.1, 0.085], [0, 0.82, 0], p.material('#d9a988'), 14);
        p.ring(0.14, 0.012, [0, 0.86, -0.04], brass);
        for (const x of [-1, 1]) p.rod([x * 0.13, 0.6, 0.02], [x * 0.05, 0.45, 0.16], 0.03, robe);
        p.rod([0.1, 0.1, 0.17], [0.1, 0.98, 0.17], 0.012, brass);
      } else if (a.niche === 'madonna') {
        const dress = paint(128, 128, (ctx) => {
          ctx.fillStyle = '#c9a03e'; ctx.fillRect(0, 0, 128, 128);
          for (let i = 0; i < 60; i++) { ctx.fillStyle = pick(['#8a2030', '#f2e2a0', '#2f5f9a']); ctx.beginPath(); ctx.arc(random() * 128, random() * 128, 2 + random() * 3, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#8a2030'; ctx.fillRect(0, 112, 128, 16);
        });
        p.mesh(new THREE.ConeGeometry(0.33, 0.78, 24), new THREE.MeshStandardMaterial({ map: dress, metalness: 0.4, roughness: 0.45, emissive: '#5a3a08', emissiveIntensity: 0.5 }), [0, 0.39, 0]);
        p.ball([0.075, 0.09, 0.075], [0, 0.82, 0], p.material('#3a2a22'), 14);
        p.cylinder(0.09, 0.07, 0.08, [0, 0.93, 0], brass, 12);
        p.ball([0.045, 0.05, 0.045], [0.09, 0.56, 0.16], p.material('#3a2a22'), 10);
        p.cylinder(0.05, 0.04, 0.04, [0.09, 0.62, 0.16], brass, 10);
      } else if (a.niche === 'skull') {
        const bone = p.material('#e2d6b8', { roughness: 0.7 });
        p.box([0.5, 0.1, 0.24], [0, 0.06, 0.02], p.material('#8a1f2a', { roughness: 0.95 }));
        p.ball([0.17, 0.16, 0.18], [0, 0.29, 0], bone, 18);
        p.box([0.2, 0.1, 0.16], [0, 0.16, 0.06], bone);
        for (const x of [-1, 1]) p.ball([0.045, 0.05, 0.03], [x * 0.065, 0.28, 0.16], p.material('#1c1612'), 10);
        p.ball([0.02, 0.035, 0.02], [0, 0.2, 0.16], p.material('#1c1612'), 8);
        for (let k = -3; k <= 3; k++) p.box([0.02, 0.035, 0.01], [k * 0.026, 0.125, 0.142], p.material('#f1ead2'));
        for (const x of [-1, 1]) {
          p.cylinder(0.022, 0.022, 0.3, [x * 0.32, 0.15, 0.05], wax, 10);
          p.ball([0.016, 0.035, 0.016], [x * 0.32, 0.34, 0.05], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb030', emissiveIntensity: 2.4 }), 8);
        }
      } else if (a.niche === 'monstrance') {
        const gilt = new THREE.MeshStandardMaterial({ color: '#f0c860', metalness: 0.7, roughness: 0.3, emissive: '#e09a20', emissiveIntensity: 0.9 });
        p.lathe([[0, 0], [0.16, 0], [0.14, 0.04], [0.03, 0.1], [0.03, 0.3], [0.06, 0.34], [0.03, 0.38], [0, 0.42]], gilt);
        p.cylinder(0.11, 0.11, 0.04, [0, 0.62, 0], gilt, 24).rotation.x = Math.PI / 2;
        p.cylinder(0.065, 0.065, 0.05, [0, 0.62, 0], new THREE.MeshStandardMaterial({ color: '#fffbe6', emissive: '#fff0b0', emissiveIntensity: 1.6 }), 20).rotation.x = Math.PI / 2;
        for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2, len = k % 2 ? 0.2 : 0.3; p.rod([Math.cos(t) * 0.1, 0.62 + Math.sin(t) * 0.1, 0], [Math.cos(t) * (0.1 + len), 0.62 + Math.sin(t) * (0.1 + len), 0], 0.016, gilt, 0.003); }
      } else {
        p.lathe([[0, 0], [0.07, 0], [0.09, 0.12], [0.06, 0.22], [0.07, 0.25]], new THREE.MeshStandardMaterial({ color: '#b9d2d0', transparent: true, opacity: 0.7, roughness: 0.1 }), [-0.14, 0, 0.02]);
        const blooms: { at: V3; size: number; color: string }[] = [];
        for (let k = 0; k < 9; k++) {
          const top: V3 = [-0.14 + (random() - 0.5) * 0.3, 0.42 + random() * 0.25, 0.02 + (random() - 0.5) * 0.14];
          p.rod([-0.14, 0.2, 0.02], top, 0.006, p.material('#4f6a3a'));
          blooms.push({ at: top, size: 0.04 + random() * 0.025, color: forgotten ? '#7a6a4a' : pick(['#f1ead2', '#e85a7a', '#f2c230', '#d8263c']) });
        }
        p.scatter(new THREE.IcosahedronGeometry(1, 1), white, blooms);
        p.box([0.24, 0.3, 0.02], [0.2, 0.16, 0], brass).rotation.x = -0.15;
        p.box([0.19, 0.25, 0.022], [0.2, 0.16, 0.004], p.material('#5a5a58')).rotation.x = -0.15;
        p.ball([0.05, 0.065, 0.01], [0.2, 0.19, 0.02], p.material('#cfc8b8'), 10);
      }
    }, [ncx, NICHE.y0, BACK - THICK / 2 - 0.02]);

    // ---- The altar ledge ----
    s.box([2.5, 0.9, 1.0], [0, 0.45, ALTAR_Z], stone);
    s.box([2.7, 0.1, 1.14], [0, 0.95, ALTAR_Z], stoneDark);
    s.box([2.9, 0.14, 1.36], [0, 0.07, ALTAR_Z + 0.1], stoneDark);
    const front = ALTAR_Z + 0.57;
    const laceTex = (tint: string) => {
      const t = paint(512, 96, (ctx) => {
        ctx.fillStyle = tint; ctx.fillRect(0, 0, 512, 60);
        for (let x = 16; x < 512; x += 32) { ctx.beginPath(); ctx.arc(x, 60, 16, 0, Math.PI); ctx.fill(); }
        ctx.globalCompositeOperation = 'destination-out';
        for (let x = 16; x < 512; x += 32) {
          ctx.beginPath(); ctx.arc(x, 62, 6, 0, 7); ctx.fill();
          for (const [dx, dy] of [[-10, 40], [10, 40], [0, 28], [-16, 16], [16, 16], [0, 10]]) { ctx.beginPath(); ctx.arc(x + dx, dy, 3.2, 0, 7); ctx.fill(); }
        }
      });
      return new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
    };
    if (a.cloth === 'bare') {
      s.box([0.1, 0.5, 0.03], [0, 0.5, front - 0.06], stoneDark); s.box([0.34, 0.1, 0.03], [0, 0.6, front - 0.06], stoneDark);
    } else {
      const tint = { lace: '#efe8d6', red: '#9a1f2c', purple: '#5a2f6a' }[a.cloth];
      const clothM = s.material(tint, { roughness: 0.95 });
      s.box([2.4, 0.014, 1.15], [0, ALTAR_TOP + 0.007, ALTAR_Z], clothM);
      const drop = a.cloth === 'lace' ? 0.12 : 0.42;
      s.box([2.4, drop, 0.012], [0, ALTAR_TOP - drop / 2, front + 0.008], clothM);
      s.mesh(new THREE.PlaneGeometry(2.4, 0.24), laceTex(a.cloth === 'lace' ? '#f4eedc' : '#d8b040'), [0, ALTAR_TOP - drop - 0.11, front + 0.012]);
      if (a.cloth === 'purple') { s.box([0.06, 0.26, 0.004], [0, ALTAR_TOP - 0.2, front + 0.016], brass); s.box([0.18, 0.06, 0.004], [0, ALTAR_TOP - 0.15, front + 0.016], brass); }
    }

    // ---- Candles: collected, then drawn as three instanced meshes ----
    const sticks: Inst[] = [], flames: Inst[] = [], halos: Inst[] = [];
    const candle = (x: number, y: number, z: number, h: number, r: number, lit: boolean) => {
      sticks.push({ p: [x, y + h / 2, z], s: [r, h, r] });
      if (lit) { flames.push({ p: [x, y + h + r * 1.9, z], s: [r * 0.85, r * 2.3, r * 0.85] }); halos.push({ p: [x, y + h + r * 1.9, z], s: r * 5 }); }
    };
    const altarLit = a.candles !== 'out' || feast;
    for (const x of [-1, 1]) {
      s.lathe([[0, 0], [0.09, 0], [0.07, 0.03], [0.02, 0.06], [0.03, 0.2], [0.018, 0.3], [0.06, 0.36], [0.065, 0.38]], brass, [x * 1.13, ALTAR_TOP + 0.014, ALTAR_Z - 0.2]);
      candle(x * 1.13, ALTAR_TOP + 0.39, ALTAR_Z - 0.2, 0.3 + random() * 0.2, 0.026, altarLit);
    }
    // Vases at the back corners of the ledge.
    const flowerHues = forgotten ? ['#7a6a4a', '#6a5a3a'] : a.region === 'mexico' ? ['#f08a1c', '#f2b020', '#e8641c'] : mood.cheer > 0.5 ? ['#f1ead2', '#e85a7a', '#f2c230', '#d8263c', '#c88ad8'] : ['#f1ead2', '#d9d2c0', '#c9a0a8'];
    const blooms: { at: V3; size: number; color: string }[] = [];
    const vase = (x: number, y: number, z: number, scale = 1) => {
      s.lathe([[0, 0], [0.05, 0], [0.085, 0.1], [0.05, 0.22], [0.065, 0.26]].map(([r, h]) => [r * scale, h * scale] as const), s.material(pick(['#3f6a8a', '#e4e2d8', '#8a4a30', '#5d7a4a']), { roughness: 0.4 }), [x, y, z]);
      const stemM = s.material(forgotten ? '#6a5a3a' : '#4f6a3a');
      for (let k = 0; k < 7; k++) {
        const top: V3 = [x + (random() - 0.5) * 0.34 * scale, y + (forgotten ? 0.3 + random() * 0.2 : 0.42 + random() * 0.3) * scale, z + (random() - 0.5) * 0.2 * scale];
        s.rod([x, y + 0.24 * scale, z], top, 0.006, stemM);
        blooms.push({ at: top, size: (0.045 + random() * 0.03) * scale, color: pick(flowerHues) });
      }
    };
    for (const x of [-1, 1]) vase(x * 0.82, ALTAR_TOP + 0.014, ALTAR_Z - 0.33);
    if (feast) for (const x of [-1.25, 1.25]) vase(x, 0.14, ALTAR_Z + 0.68, 1.5);

    // ---- The iron candle rack with its offering shelf ----
    const rackX0 = 0.85, rackX1 = 2.8, rackZ = 0.3, shelfY = 0.9;
    for (const x of [rackX0 + 0.03, 1.85, rackX1 - 0.03]) for (const z of [-0.33, 0.33]) {
      s.rod([x, 0, rackZ + z], [x, z < 0 ? 1.34 : shelfY, rackZ + z], 0.016, iron);
      s.ball([0.03, 0.012, 0.03], [x, 0.012, rackZ + z], iron, 8);
    }
    s.box([rackX1 - 1.85, 0.03, 0.7], [(rackX1 + 1.85) / 2, shelfY - 0.015, rackZ], iron);
    s.rod([rackX0, 1.34, rackZ - 0.33], [rackX1, 1.34, rackZ - 0.33], 0.012, iron);
    for (let k = 0; k < 9; k++) {
      const x = rackX0 + 0.12 + k * (rackX1 - rackX0 - 0.24) / 8;
      s.tube([[x - 0.08, 1.34, rackZ - 0.33], [x - 0.04, 1.42, rackZ - 0.33], [x, 1.34, rackZ - 0.33], [x + 0.04, 1.26, rackZ - 0.33], [x + 0.08, 1.34, rackZ - 0.33]], 0.006, iron);
    }
    for (const y of [0.3]) s.rod([rackX0, y, rackZ + 0.33], [rackX1, y, rackZ + 0.33], 0.01, iron);
    const litShare = { one: 0.04, some: 0.45, full: 1, out: 0 }[a.candles];
    let litCount = 0;
    const tiers: [number, number][] = [[-0.2, 1.1], [0.02, 0.97], [0.24, 0.84]];
    const cols = 8;
    const firstLit = Math.floor(random() * cols * 3);
    tiers.forEach(([dz, y], row) => {
      s.box([1.0, 0.025, 0.2], [rackX0 + 0.5, y - 0.0125, rackZ + dz], iron);
      s.box([1.0, 0.012, 0.16], [rackX0 + 0.5, y + 0.006, rackZ + dz], s.material('#c9b88a', { roughness: 1 }));
      for (let c = 0; c < cols; c++) {
        const index = row * cols + c, x = rackX0 + 0.07 + c * (0.86 / (cols - 1)), z = rackZ + dz + (random() - 0.5) * 0.05;
        const present = a.candles === 'full' || random() < 0.45 + mood.density * 0.5;
        if (!present && index !== firstLit) continue;
        const lit = a.candles === 'one' ? index === firstLit : a.candles !== 'out' && random() < litShare;
        const h = a.candles === 'out' ? 0.015 + random() * 0.05 : lit ? 0.08 + random() * 0.2 : 0.03 + random() * 0.24;
        candle(x, y + 0.012, z, h * 1.5, 0.021, lit);
        if (lit) litCount++;
      }
    });
    // Alms box on the end post.
    s.box([0.24, 0.3, 0.2], [rackX0 - 0.2, 0.95, rackZ + 0.2], wood);
    s.rod([rackX0 - 0.2, 0, rackZ + 0.2], [rackX0 - 0.2, 0.8, rackZ + 0.2], 0.022, iron);
    s.cylinder(0.13, 0.15, 0.03, [rackX0 - 0.2, 0.015, rackZ + 0.2], iron, 14);
    s.box([0.1, 0.012, 0.02], [rackX0 - 0.2, 1.102, rackZ + 0.2], iron);
    s.label(ALMS[a.region], 0.21, 0.07, [rackX0 - 0.2, 1.0, rackZ + 0.302], '#f1e2c0', '#3a2a1e');
    s.box([0.05, 0.07, 0.03], [rackX0 - 0.2, 0.88, rackZ + 0.31], brass);

    // ---- The offerings on the wall ----
    const legG = mergeGeometries([
      new THREE.LatheGeometry([[0, 0], [0.034, 0], [0.03, 0.05], [0.052, 0.15], [0.04, 0.22], [0.058, 0.32], [0.06, 0.4], [0, 0.4]].map(([r, y]) => new THREE.Vector2(r, y)), 10),
      new THREE.BoxGeometry(0.06, 0.04, 0.13).translate(0, 0.02, 0.04),
    ])!.translate(0, -0.4, 0.05);
    const armG = mergeGeometries([
      new THREE.LatheGeometry([[0, 0.1], [0.026, 0.1], [0.034, 0.2], [0.042, 0.34], [0, 0.34]].map(([r, y]) => new THREE.Vector2(r, y)), 10),
      new THREE.SphereGeometry(1, 10, 8).scale(0.036, 0.062, 0.018).translate(0, 0.055, 0),
    ])!.translate(0, -0.34, 0.04);
    const heartShape = new THREE.Shape();
    heartShape.moveTo(0, -0.11); heartShape.bezierCurveTo(-0.16, 0.0, -0.11, 0.12, 0, 0.05); heartShape.bezierCurveTo(0.11, 0.12, 0.16, 0.0, 0, -0.11);
    const heartG = new THREE.ExtrudeGeometry(heartShape, { depth: 0.022, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 10 }).translate(0, -0.1, 0.012);
    const headG = mergeGeometries([
      new THREE.SphereGeometry(1, 12, 10).scale(0.075, 0.095, 0.08).translate(0, -0.1, 0.06),
      new THREE.CylinderGeometry(0.035, 0.05, 0.08, 10).translate(0, -0.22, 0.05),
      new THREE.ConeGeometry(0.018, 0.045, 6).rotateX(Math.PI / 2).translate(0, -0.11, 0.14),
    ])!;
    const plaqueG = new THREE.BoxGeometry(0.16, 0.2, 0.012).translate(0, -0.1, 0.01);
    const bossG = new THREE.SphereGeometry(1, 10, 6).scale(0.03, 0.018, 0.012);
    const kinds = { leg: [] as Inst[], arm: [] as Inst[], heart: [] as Inst[], head: [] as Inst[], tinheart: [] as Inst[], plaque: [] as Inst[], boss: [] as Inst[], frame: [] as Inst[], picture: [] as Inst[], figure: [] as Inst[], photo: [] as Inst[], face: [] as Inst[], ribbon: [] as Inst[] };
    const weights: Record<typeof a.offerings, Partial<Record<'leg' | 'arm' | 'heart' | 'head' | 'tinheart' | 'plaque' | 'tablet' | 'photo', number>>> = {
      wax: { leg: 3, arm: 3, heart: 2, head: 2, plaque: 0.7, tablet: 0.7, photo: 0.4 },
      tin: { plaque: 5, tinheart: 4, leg: 0.6, tablet: 0.8, photo: 0.6 },
      tablets: { tablet: 6, heart: 1, leg: 0.8, photo: 0.6, plaque: 0.6 },
      photos: { photo: 6, tinheart: 1, plaque: 0.8, heart: 0.6, tablet: 0.6 },
      crutches: { leg: 2.5, arm: 1, tablet: 1, plaque: 0.8, photo: 0.6 },
    };
    const table = Object.entries(weights[a.offerings]) as [keyof (typeof weights)['wax'], number][];
    const total = table.reduce((sum, [, w]) => sum + w, 0);
    const draw = () => { let roll = random() * total; for (const [kind, w] of table) { roll -= w; if (roll <= 0) return kind; } return table[0][0]; };
    const ribbonHues = mood.cheer > 0.5 ? ['#d8263c', '#1f6fd0', '#f2c230', '#3f9a5a', '#e85a9a', '#f4f1e6'] : ['#8a2a30', '#3a4a6a', '#8a7a4a', '#d9d2c0', '#6a3a5a'];
    const skyHues = ['#7fa8c8', '#c9a878', '#8a3a30', '#5f8a6a', '#d9c8a0', '#3f4f7a'];
    const fill = mix(0.42, 0.97, mood.density);
    const rows = [1.62, 2.1, 2.58, 3.06], fallen: V3[] = [];
    const wz = BACK + 0.012;
    const hang = (x: number, y: number, z: number, ry: number, toward: V3) => {
      // `toward` is the wall's outward normal; ry turns the piece to face it.
      const at = (d: number): V3 => [x + toward[0] * d, y, z + toward[2] * d];
      const kind = draw(), sway = (random() - 0.5) * 0.22, drop = 0.1 + random() * 0.1;
      const hue = forgotten ? pick(['#8a7a6a', '#7a6a5a', '#9a8a70']) : pick(ribbonHues);
      const top = y + 0.26;
      kinds.ribbon.push({ p: [at(0.008)[0], top - drop / 2, at(0.008)[2]], s: [0.022, drop, 0.004], r: [0, ry, 0], c: hue });
      kinds.ribbon.push({ p: [at(0.012)[0], top - drop + 0.012, at(0.012)[2]], s: [0.075, 0.035, 0.006], r: [0, ry, 0.2], c: hue });
      const p: V3 = [at(0.01)[0], top - drop, at(0.01)[2]], r: V3 = [0, ry, sway];
      if (kind === 'leg') kinds.leg.push({ p, r, s: 1.15 + random() * 0.3 });
      else if (kind === 'arm') kinds.arm.push({ p, r, s: 1.2 + random() * 0.3 });
      else if (kind === 'heart') kinds.heart.push({ p, r, s: 1.25 + random() * 0.45 });
      else if (kind === 'head') kinds.head.push({ p, r, s: 1.15 + random() * 0.25 });
      else if (kind === 'tinheart') kinds.tinheart.push({ p, r, s: 1.15 + random() * 0.5 });
      else if (kind === 'plaque') {
        kinds.plaque.push({ p, r, s: 1.25 });
        const o = (dx: number, dy: number, d: number): V3 => [p[0] + (ry ? 0 : dx) + toward[0] * d, p[1] + dy, p[2] + (ry ? -dx : 0) + toward[2] * d];
        for (const dx of [-0.045, 0.045]) kinds.boss.push({ p: o(dx, -0.12, 0.02), r: [0, ry, 0], s: 1.25 });
      } else if (kind === 'tablet') {
        const o = (dx: number, dy: number, d: number): V3 => [p[0] + (ry ? 0 : dx) + toward[0] * d, p[1] + dy, p[2] + (ry ? -dx : 0) + toward[2] * d];
        kinds.frame.push({ p: o(0, -0.13, 0.01), s: [0.34, 0.27, 0.024], r: [0, ry, sway * 0.3], c: random() < 0.3 ? '#b8934a' : '#4a3020' });
        kinds.picture.push({ p: o(0, -0.13, 0.015), s: [0.28, 0.21, 0.024], r: [0, ry, sway * 0.3], c: pick(skyHues) });
        kinds.figure.push({ p: o(-0.04, -0.17, 0.02), s: [0.14, 0.05, 0.02], r: [0, ry, sway * 0.3], c: '#e4dcc8' });
        kinds.figure.push({ p: o(0.08, -0.08, 0.02), s: [0.06, 0.06, 0.02], r: [0, ry, sway * 0.3], c: '#f2c230' });
      } else {
        const o = (dx: number, dy: number, d: number): V3 => [p[0] + (ry ? 0 : dx) + toward[0] * d, p[1] + dy, p[2] + (ry ? -dx : 0) + toward[2] * d];
        const letter = random() < 0.3;
        kinds.photo.push({ p: o(0, -0.1, 0.006), s: [0.16, 0.2, 0.008], r: [0, ry, sway], c: letter ? '#e9dfc2' : '#efe9da' });
        if (!letter) { kinds.picture.push({ p: o(0, -0.09, 0.008), s: [0.125, 0.15, 0.008], r: [0, ry, sway], c: pick(['#5a5a58', '#6a5a48', '#4a4a4a']) }); kinds.face.push({ p: o(0, -0.09, 0.013), s: [0.035, 0.045, 0.004], r: [0, ry, 0], c: '#cfc8b8' }); }
        else for (let k = 0; k < 5; k++) kinds.figure.push({ p: o(0, -0.04 - k * 0.028, 0.011), s: [0.11, 0.006, 0.002], r: [0, ry, sway], c: '#4a4238' });
      }
    };
    const railsBack: Inst[] = [];
    for (const y of rows) {
      railsBack.push({ p: [0, y + 0.265, wz + 0.012], s: [W - 0.2, 1, 1] });
      for (let x = LEFT + 0.32; x < W / 2 - 0.15; x += 0.41) {
        const behindHero = Math.abs(x) < 1.0 && y < 2.4, inNiche = x > NICHE.x0 - 0.28 && x < NICHE.x1 + 0.28 && y < NICHE.y1 + 0.45;
        const atWindow = Math.abs(x - -2.15) < 0.62 && y > 1.7, atFrame = a.region === 'bavaria' && Math.abs(x - 1.1) < 0.42 && y > 2.4;
        if (behindHero || inNiche || atWindow || atFrame || (a.region === 'cyprus' && Math.abs(x) < 0.5 && y > 2.4 && y < 3)) continue;
        if (random() > fill) continue;
        if (forgotten && random() < 0.16) { fallen.push([x, 0, BACK + 0.2 + random() * 0.4]); continue; }
        hang(x + (random() - 0.5) * 0.08, y, wz, 0, [0, 0, 1]);
      }
    }
    // The left wall carries the overflow, clear of the window.
    for (const y of [1.62, 2.1]) for (let z = BACK + 0.45; z < D / 2 - 0.2; z += 0.4) {
      if (random() > fill * 0.85) continue;
      hang(LEFT + 0.012, y, z + (random() - 0.5) * 0.08, Math.PI / 2, [1, 0, 0]);
    }
    instances(new THREE.BoxGeometry(1, 0.014, 0.014), iron, railsBack);
    for (const y of [1.62, 2.1]) s.box([0.014, 0.014, D - 0.3], [LEFT + 0.024, y + 0.265, 0], iron);
    instances(legG, wax, kinds.leg); instances(armG, wax, kinds.arm); instances(heartG, new THREE.MeshStandardMaterial({ color: '#b8303a', roughness: 0.4, emissive: '#4a0a10', emissiveIntensity: 0.4 }), kinds.heart); instances(headG, wax, kinds.head);
    instances(heartG.clone(), tin, kinds.tinheart); instances(plaqueG, tin, kinds.plaque); instances(bossG, tin, kinds.boss);
    const unit = () => new THREE.BoxGeometry(1, 1, 1);
    instances(unit(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.2 }), kinds.frame);
    instances(unit(), white, kinds.picture); instances(unit(), white, kinds.figure); instances(unit(), white, kinds.photo);
    instances(new THREE.SphereGeometry(1, 8, 6), white, kinds.face); instances(unit(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 }), kinds.ribbon);
    for (const [x, , z] of fallen) {
      const lying = new THREE.Mesh(random() < 0.5 ? legG : armG, wax);
      lying.position.set(x, 0.05, z); lying.rotation.set(Math.PI / 2, 0, random() * 6); lying.castShadow = true;
      s.root.add(lying);
    }

    // Above the hero: a cross, or the icon in Cyprus.
    if (a.region === 'cyprus') {
      s.box([0.62, 0.8, 0.04], [0, 2.75, BACK + 0.03], brass);
      s.box([0.5, 0.68, 0.045], [0, 2.75, BACK + 0.033], new THREE.MeshStandardMaterial({ color: '#d8a830', metalness: 0.6, roughness: 0.35, emissive: '#8a5a10', emissiveIntensity: 0.5 }));
      s.ball([0.1, 0.13, 0.02], [0, 2.85, BACK + 0.06], s.material('#7a4a30'), 12);
      s.ball([0.19, 0.2, 0.02], [0, 2.62, BACK + 0.058], s.material('#7a2030'), 12);
      s.ring(0.14, 0.012, [0, 2.86, BACK + 0.062], s.material('#f2d880', { metalness: 0.7, roughness: 0.3 }));
    } else {
      const crossM = a.region === 'bavaria' ? brass : wood;
      s.box([0.09, 0.72, 0.05], [0, 2.82, BACK + 0.035], crossM); s.box([0.44, 0.09, 0.05], [0, 2.96, BACK + 0.035], crossM);
    }

    // Crutches and braces lean in the corner; many more if that is what people leave here.
    const crutchCount = a.offerings === 'crutches' ? 7 + Math.round(mood.density * 4) : mood.density > 0.45 ? 2 : 1;
    const crutchWood = s.material('#a8845a', { roughness: 0.8 });
    for (let k = 0; k < crutchCount; k++) {
      const onBack = k % 3 !== 2, len = 1.1 + random() * 0.3;
      const piece = stand((p) => {
        for (const x of [-1, 1]) p.rod([x * 0.02, 0, 0], [x * 0.09, len, 0], 0.013, crutchWood);
        p.box([0.22, 0.05, 0.05], [0, len + 0.02, 0], p.material('#5a3a2a', { roughness: 0.95 }));
        p.box([0.13, 0.03, 0.03], [0, len * 0.62, 0], crutchWood);
        p.cylinder(0.02, 0.016, 0.05, [0, 0.01, 0], p.material('#2a2622'), 8);
      }, onBack ? [-2.75 + k * 0.17 + random() * 0.05, 0, BACK + 0.38] : [LEFT + 0.38, 0, 1.2 + k * 0.12], onBack ? 0 : Math.PI / 2);
      piece.rotation.x = onBack ? -0.24 - random() * 0.06 : 0;
      piece.rotation.z = onBack ? (random() - 0.5) * 0.2 : 0.24 + random() * 0.06;
    }
    if (a.offerings === 'crutches') {
      // A leg brace and a pair of small boots at the foot of the pile.
      for (const x of [-1, 1]) s.rod([-2.2 + x * 0.05, 0.02, -1.6], [-1.75 + x * 0.05, 0.03, -1.45], 0.01, s.material('#9a9a94', { metalness: 0.7, roughness: 0.4 }));
      for (const t of [0.2, 0.6, 0.95]) s.ring(0.055, 0.012, [mix(-2.2, -1.75, t), 0.05, mix(-1.6, -1.45, t)], s.material('#6a4a30')).rotation.y = 1.25;
      for (const x of [0, 0.14]) { s.box([0.09, 0.07, 0.2], [-1.45 + x, 0.035, -1.75], s.material('#3a2a22')); s.box([0.085, 0.14, 0.09], [-1.45 + x, 0.1, -1.81], s.material('#3a2a22')); }
    }

    // ---- The window and its shaft ----
    const hue = { red: '#e0453a', blue: '#3f7fe0', amber: '#f0b040', green: '#4fb070', clear: '#f4ecd8' }[a.glass];
    const day = mix(0.55, 1, 1 - Math.abs(mood.daylight - 0.5) * 2);
    const WX = -2.15, WY = 2.55, WW = 0.72, WH = 1.0;
    const glassTex = paint(144, 200, (ctx) => {
      ctx.fillStyle = '#2a2622'; ctx.fillRect(0, 0, 144, 200);
      const base = new THREE.Color(hue);
      for (let x = -1; x < 5; x++) for (let y = -1; y < 7; y++) {
        const c = base.clone().offsetHSL((random() - 0.5) * 0.05, 0, (random() - 0.5) * 0.18);
        ctx.fillStyle = `#${c.getHexString()}`;
        const cx = x * 36 + (y % 2) * 18 + 18, cy = y * 34 + 17;
        ctx.beginPath(); ctx.moveTo(cx, cy - 15); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 15); ctx.lineTo(cx - 16, cy); ctx.fill();
      }
      ctx.fillStyle = '#2a2622'; ctx.beginPath(); ctx.arc(72, 96, 34, 0, 7); ctx.fill();
      ctx.fillStyle = a.glass === 'clear' ? '#fffbe8' : '#fff2b8'; ctx.beginPath(); ctx.arc(72, 96, 29, 0, 7); ctx.fill();
      ctx.fillStyle = `#${base.clone().offsetHSL(0, 0, -0.12).getHexString()}`; ctx.fillRect(66, 72, 12, 48); ctx.fillRect(54, 84, 36, 12);
      for (let i = 0; i < wear * 30; i++) { ctx.fillStyle = 'rgba(60,50,40,0.35)'; ctx.beginPath(); ctx.arc(random() * 144, random() * 200, 4 + random() * 12, 0, 7); ctx.fill(); }
    });
    s.mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshStandardMaterial({ map: glassTex, emissiveMap: glassTex, emissive: '#ffffff', emissiveIntensity: day * 1.25, roughness: 0.3 }), [WX, WY, BACK + 0.03]);
    for (const x of [-1, 1]) s.box([0.1, WH + 0.2, 0.1], [WX + x * (WW / 2 + 0.05), WY, BACK + 0.05], stone);
    s.box([WW + 0.3, 0.1, 0.16], [WX, WY - WH / 2 - 0.05, BACK + 0.08], stone);
    s.box([WW + 0.2, 0.1, 0.1], [WX, WY + WH / 2 + 0.05, BACK + 0.05], stone);
    s.ring(WW / 2 + 0.05, 0.05, [WX, WY + WH / 2 + 0.1, BACK + 0.05], stone, Math.PI);
    const shaftTo: V3 = [-1.3, 0.012, -0.55], sx = 0.62, sz = 0.9;
    const corners: V3[] = [
      [WX - WW / 2, WY - WH / 2, BACK + 0.07], [WX + WW / 2, WY - WH / 2, BACK + 0.07], [WX + WW / 2, WY + WH / 2, BACK + 0.07], [WX - WW / 2, WY + WH / 2, BACK + 0.07],
      [shaftTo[0] - sx, 0.012, shaftTo[2] - sz], [shaftTo[0] + sx, 0.012, shaftTo[2] - sz], [shaftTo[0] + sx, 0.012, shaftTo[2] + sz], [shaftTo[0] - sx, 0.012, shaftTo[2] + sz],
    ];
    const shaftG = new THREE.BufferGeometry();
    shaftG.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3));
    shaftG.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
    const shaftM = new THREE.MeshBasicMaterial({ color: new THREE.Color(hue).lerp(new THREE.Color('#fff4d8'), 0.35), transparent: true, opacity: 0.15 * day + 0.05, depthWrite: false, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(shaftG, shaftM);
    s.root.add(shaft);
    const pool = s.mesh(new THREE.PlaneGeometry(sx * 2.4, sz * 2.4), new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.55 * day + 0.2, depthWrite: false,
      map: paint(128, 128, (ctx) => {
        const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 62); const c = new THREE.Color(hue).lerp(new THREE.Color('#fff4d8'), 0.3);
        const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
        g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.6, `rgba(${rgb},0.75)`); g.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      }),
    }), shaftTo);
    pool.rotation.x = -Math.PI / 2; pool.castShadow = pool.receiveShadow = false;

    // ---- Kneeler before the altar, stool by the wall, hanging lamp ----
    const kneel = stand((p) => {
      p.box([1.1, 0.06, 0.34], [0, 0.14, 0.2], wood);
      p.box([1.0, 0.07, 0.26], [0, 0.2, 0.2], p.material('#7c1f2e', { roughness: 0.95 }));
      for (const x of [-1, 1]) { p.box([0.06, 0.82, 0.08], [x * 0.5, 0.41, -0.16], wood); p.box([0.06, 0.12, 0.5], [x * 0.5, 0.06, 0.05], wood); }
      p.box([1.12, 0.05, 0.24], [0, 0.84, -0.18], wood);
      p.box([1.0, 0.3, 0.03], [0, 0.62, -0.16], wood);
    }, [0.05, 0, -0.5], (random() - 0.5) * 0.12);
    const [stx, stz] = SLOTS[4];
    stand((p) => {
      p.cylinder(0.3, 0.3, 0.05, [0, 0.535, 0], wood, 20);
      for (let k = 0; k < 3; k++) p.rod([Math.cos(k * 2.09) * 0.2, 0.52, Math.sin(k * 2.09) * 0.2], [Math.cos(k * 2.09) * 0.27, 0, Math.sin(k * 2.09) * 0.27], 0.025, wood);
    }, [stx, 0, stz]);
    const lampCount = a.region === 'cyprus' ? 2 : 1;
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#d8263c', emissive: '#ff3a2a', emissiveIntensity: 1.5, roughness: 0.2 });
    const lamps: THREE.Group[] = [];
    for (let k = 0; k < lampCount; k++) {
      const lx = lampCount === 1 ? 1.08 : -1.15 + k * 2.25, ly = 2.5 + (k % 2) * 0.2;
      s.rod([lx, 3.3, BACK], [lx, 3.3, BACK + 0.62], 0.016, iron);
      s.rod([lx, 3.02, BACK], [lx, 3.3, BACK + 0.42], 0.01, iron);
      const lamp = stand((p) => {
        for (let c = 0; c < 3; c++) p.rod([0, 0, 0], [Math.cos(c * 2.09) * 0.11, -(3.3 - ly) + 0.1, Math.sin(c * 2.09) * 0.11], 0.004, brass);
        p.lathe([[0, -0.12], [0.05, -0.1], [0.13, 0], [0.12, 0.1], [0.14, 0.12]], brass, [0, -(3.3 - ly), 0]);
        p.cylinder(0.075, 0.06, 0.13, [0, -(3.3 - ly) + 0.17, 0], lampGlow, 14);
        p.ball([0.02, 0.03, 0.02], [0, -(3.3 - ly) - 0.14, 0], brass, 8);
      }, [lx, 3.3, BACK + 0.6]);
      lamps.push(lamp);
    }

    // ---- Region dressing ----
    if (a.region === 'mexico') {
      const flags: Inst[] = [];
      const hues = ['#e8306a', '#f2a020', '#2fa8c8', '#7ac840', '#a850c8', '#f2e230'];
      for (let k = 0; k < 15; k++) { const t = (k + 0.5) / 15, x = mix(LEFT + 0.2, W / 2 - 0.2, t), sag = Math.sin(t * Math.PI) * 0.22; flags.push({ p: [x, 3.3 - sag - 0.13, BACK + 0.5], s: [0.3, 0.24, 0.004], r: [0, 0, (t - 0.5) * 0.25], c: hues[k % hues.length] }); }
      instances(unit(), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide }), flags);
      s.tube([[LEFT + 0.05, 3.32, BACK + 0.5], [0, 3.08, BACK + 0.5], [W / 2 - 0.05, 3.32, BACK + 0.5]], 0.005, s.material('#e4dcc8'));
    } else if (a.region === 'bavaria') {
      s.box([0.62, 0.82, 0.05], [1.1, 2.92, BACK + 0.03], brass);
      s.box([0.5, 0.7, 0.055], [1.1, 2.92, BACK + 0.032], s.material('#3f5f7a'));
      s.ball([0.14, 0.2, 0.02], [1.1, 2.86, BACK + 0.062], s.material('#d9c8a0'), 10);
    }

    // ---- What has happened lately ----
    const petals: { at: V3; size: number; color: string }[] = [];
    if (a.lately === 'justleft') {
      const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), s.material(pick(['#3a4a6a', '#6a2a3a', '#2a2a2a']), { roughness: 1 }));
      shawl.position.set(0.25, 0.74, -0.18); shawl.castShadow = true; kneel.add(shawl);
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.012), s.material('#d9d2c0')); fringe.position.set(0.25, 0.58, -0.03); kneel.add(fringe);
      // The bouquet in paper on the altar step.
      stand((p) => {
        p.mesh(new THREE.ConeGeometry(0.11, 0.42, 12, 1, true), p.material('#e9e2cc', { side: THREE.DoubleSide }), [0, 0.06, 0]).rotation.z = Math.PI / 2;
        const heads: { at: V3; size: number; color: string }[] = [];
        for (let k = 0; k < 9; k++) heads.push({ at: [-0.2 - random() * 0.08, 0.06 + (random() - 0.5) * 0.14, (random() - 0.5) * 0.16], size: 0.04 + random() * 0.02, color: pick(flowerHues) });
        p.scatter(new THREE.IcosahedronGeometry(1, 1), white, heads);
      }, [-0.85, 0.14, ALTAR_Z + 0.68], 0.5);
      candle(0.5, ALTAR_TOP + 0.014, ALTAR_Z + 0.42, 0.34, 0.022, true);
    } else if (feast) {
      const swag = s.material('#4f7a3c', { roughness: 0.8 });
      for (let k = 0; k < 4; k++) {
        const x0 = LEFT + 0.1 + k * (W - 0.2) / 4, x1 = x0 + (W - 0.2) / 4;
        s.tube([[x0, 3.42, BACK + 0.08], [(x0 + x1) / 2, 3.12, BACK + 0.12], [x1, 3.42, BACK + 0.08]], 0.04, swag);
        for (let j = 0; j < 7; j++) { const t = (j + 0.5) / 7; blooms.push({ at: [mix(x0, x1, t), 3.42 - Math.sin(t * Math.PI) * 0.3 * 1.0 + 0.02, BACK + 0.15], size: 0.05, color: pick(flowerHues) }); }
      }
      for (let k = 0; k < 150; k++) petals.push({ at: [(random() - 0.5) * (W - 0.6), 0.008, BACK + 0.9 + random() * (D - 1.2)], size: 0.022 + random() * 0.02, color: pick(flowerHues) });
    } else if (forgotten) {
      const web = new THREE.MeshBasicMaterial({ color: '#f1efe8', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
      const corner = (at: V3, size: number, ry: number) => {
        const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(size, 0); shape.quadraticCurveTo(size * 0.25, -size * 0.25, 0, -size); shape.lineTo(0, 0);
        const m = s.mesh(new THREE.ShapeGeometry(shape), web, at); m.rotation.y = ry; m.castShadow = m.receiveShadow = false;
      };
      corner([LEFT + 0.02, H - 0.02, BACK + 0.03], 1.0, 0); corner([LEFT + 0.03, H - 0.02, BACK + 0.02], 0.9, -Math.PI / 2);
      corner([NICHE.x0, NICHE.y1, BACK + 0.05], 0.45, 0); corner([rackX0, 1.34, rackZ - 0.33], 0.5, 0);
      for (let k = 0; k < 40; k++) petals.push({ at: [(random() - 0.5) * (W - 0.6), 0.008, BACK + 0.7 + random() * 1.2], size: 0.02 + random() * 0.02, color: '#6a5a3a' });
    } else {
      stand((p) => {
        const alu = p.material('#b9bdb8', { metalness: 0.6, roughness: 0.45 });
        for (const x of [-1, 1]) { p.rod([x * 0.24, 0, 0.3], [x * 0.2, 1.7, -0.12], 0.02, alu); p.rod([x * 0.24, 0, -0.55], [x * 0.2, 1.7, -0.12], 0.018, alu); }
        for (let k = 1; k <= 5; k++) { const t = k / 6; p.box([0.44, 0.03, 0.1], [0, 1.7 * t, mix(0.3, -0.12, t)], alu); }
        p.box([0.46, 0.04, 0.24], [0, 1.72, -0.12], alu);
      }, [-0.95, 0, -1.05], 0.25);
      stand((p) => {
        p.lathe([[0, 0], [0.13, 0], [0.17, 0.3], [0.18, 0.31]], p.material('#4f6a8a', { roughness: 0.5, side: THREE.DoubleSide }));
        p.ring(0.17, 0.006, [0, 0.36, 0], iron, Math.PI).rotation.y = 0.4;
        p.box([0.34, 0.16, 0.24], [0.5, 0.08, 0.1], p.material('#b99a6a', { roughness: 0.95 }));
        for (let k = 0; k < 9; k++) p.cylinder(0.014, 0.014, 0.26, [0.36 + (k % 5) * 0.06, 0.17 + Math.floor(k / 5) * 0.028, 0.1], wax, 8).rotation.x = Math.PI / 2;
        p.rod([-0.4, 0, 0.1], [-0.52, 1.3, -0.3], 0.014, wood);
        p.box([0.3, 0.1, 0.05], [-0.4, 0.05, 0.1], p.material('#c9a44e', { roughness: 1 }));
      }, [1.25, 0, 1.75], -0.3);
    }
    if (blooms.length) s.scatter(new THREE.IcosahedronGeometry(1, 1), white, blooms);
    if (petals.length) s.scatter(new THREE.SphereGeometry(1, 6, 4).scale(1, 0.25, 0.7), white, petals).castShadow = false;
    // A busy shrine piles more on the floor by the wall.
    if (mood.density > 0.6) {
      const jars: Inst[] = [];
      for (let k = 0; k < 9; k++) { const x = 1.45 + random() * 1.3, z = BACK + 0.25 + random() * 0.5, h = 0.1 + random() * 0.14; jars.push({ p: [x, h / 2, z], s: [0.045, h, 0.045], c: pick(['#b8303a', '#e4dcc8', '#2f5f9a', '#d8a830']) }); if (a.candles !== 'out' && random() < 0.6) { flames.push({ p: [x, h + 0.02, z], s: [0.012, 0.03, 0.012] }); halos.push({ p: [x, h + 0.02, z], s: 0.07 }); } }
      instances(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, emissive: '#5a2a10', emissiveIntensity: 0.4 }), jars);
    }

    instances(new THREE.CylinderGeometry(1, 1, 1, 10), wax, sticks);
    const flameM = new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: new THREE.Color('#ffb040').lerp(new THREE.Color('#ffd890'), 1 - mood.warmth), emissiveIntensity: 2.6 });
    instances(new THREE.SphereGeometry(1, 8, 6), flameM, flames, false);
    const haloM = new THREE.MeshBasicMaterial({ color: '#ffc870', transparent: true, opacity: 0.22, depthWrite: false });
    instances(new THREE.SphereGeometry(1, 10, 8), haloM, halos, false);

    // Candlelight: one warm point at the rack, one at the altar.
    const rackLight = new THREE.PointLight('#ffa850', 0, 7, 1.6);
    rackLight.position.set(rackX0 + 0.5, 1.6, rackZ + 0.3);
    const rackPower = litCount ? 2.5 + Math.min(litCount, 22) * 0.42 : 0;
    const altarLight = new THREE.PointLight('#ffb060', 0, 6, 1.6);
    altarLight.position.set(0, 2.1, ALTAR_Z + 0.9);
    const altarPower = altarLit ? 5 : 0.8;
    s.root.add(rackLight, altarLight);
    rackLight.intensity = rackPower; altarLight.intensity = altarPower;

    // Place the cast: hero on the ledge, then the rack shelf, the floor and the stool.
    const frame = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      frame(items);
      items.forEach((item, index) => {
        const [x, z, y, tall, wide, most] = SLOTS[index % SLOTS.length];
        const scale = Math.min(tall / Math.max(item.height, 0.05), wide / Math.max(item.radius, 0.05), most);
        item.holder.scale.setScalar(scale);
        item.holder.position.set(x, y, z);
        item.holder.updateMatrixWorld(true);
      });
    };
    world.capacity = SLOTS.length;

    const speed = mix(3, 16, mood.energy), depth = mix(0.05, 0.3, mood.energy), phase = random() * 9;
    world.update = (_dt, time) => {
      const t = time * speed + phase;
      const flick = 1 + depth * Math.sin(t) * Math.sin(t * 2.3 + 1) + depth * 0.4 * Math.sin(t * 7.1);
      flameM.emissiveIntensity = 2.6 * flick;
      haloM.opacity = 0.22 * clamp01(flick);
      rackLight.intensity = rackPower * flick;
      altarLight.intensity = altarPower * (1 + depth * 0.6 * Math.sin(t * 1.7 + 2));
      shaftM.opacity = (0.15 * day + 0.05) * (1 + 0.06 * Math.sin(time * 0.4));
      lamps.forEach((lamp, k) => { lamp.rotation.z = 0.02 * (1 + mood.energy * 2) * Math.sin(time * 0.9 + k * 2); });
    };
    const disposeBase = world.dispose.bind(world);
    world.dispose = () => { shaftG.dispose(); shaftM.dispose(); disposeBase(); };
    return world;
  },
});
