import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, disposeTree, mix, visibleBounds } from '@conjure/kit';
import { fuse, painted, placed, strut } from './form';
import { chalkboard, headProfile, wallChart } from './art';

/** Where the cast stands: x, z, the height of the surface, and the room each thing is allowed. */
const SLOTS = [
  { x: 0, z: -0.9, y: 0.94, height: 1.2, radius: 0.56 },
  { x: -1.22, z: -0.9, y: 0.94, height: 0.7, radius: 0.33 },
  { x: 1.22, z: -0.9, y: 0.94, height: 0.7, radius: 0.33 },
  { x: 3.05, z: 0.25, y: 0.835, height: 0.75, radius: 0.33 },
  { x: -1.7, z: 1.66, y: 0.78, height: 0.62, radius: 0.3 },
  { x: 1.3, z: 1.66, y: 0.78, height: 0.62, radius: 0.3 },
] as const;

export default defineWorld({
  questions: {
    school: choice('What kind of school is this room in?', {
      medical: 'An old medical school: dark oak panelling, cream walls, brass fittings and a founder\'s portrait.',
      art: 'An art academy: pale plaster walls, pine, an easel with a charcoal head study and casts of faces on the wall.',
      rural: 'A rural high school: two-tone institutional green paint, yellow varnished pine and a hand-lettered room sign.',
    }),
    board: choice('What is on the chalkboard?', {
      head: 'A head in profile with labelled bones, half wiped away by the duster.',
      skull: 'A skull drawn from the front, with a few labels.',
      lesson: 'A lesson title and a numbered list of the muscles of expression.',
      wiped: 'Wiped clean: only ghosts of the last diagram in the chalk haze.',
      doodle: 'A student\'s goofy face with its tongue out and EXAM FRIDAY.',
    }),
    chart: choice('What does the roller wall chart show?', {
      muscles: 'The muscles of the face in red on a staring head.',
      skull: 'A skull seen from the side with its sutures.',
      eye: 'A cross-section of the eye, lens and nerve.',
      rolled: 'Nothing: it is rolled up tight on its pole.',
    }),
    corner: choice('What stands in the far corner?', {
      skeleton: 'An articulated skeleton hanging from a stand.',
      cabinet: 'A glass-fronted cabinet of specimen jars.',
      torso: 'A painted torso model with its organs showing, on a small table.',
      coat: 'A coat stand with a white lab coat and a hat.',
    }),
    left: choice('How was the room left?', {
      tidy: 'Tidy and locked up: stool tucked in, board rubber in its tray.',
      midlecture: 'Abandoned mid-lecture: a stool knocked over, papers scattered, a jacket left on a desk.',
      disused: 'Disused for years: dust sheets over the desks, a cracked window pane, litter on the floor.',
      cleaning: 'In the middle of being cleaned: a mop and bucket, stools upturned on the desks.',
    }),
    floor: choice('What is the floor?', {
      boards: 'Bare scrubbed floorboards.',
      lino: 'Checkered linoleum tiles.',
      dark: 'Boards stained almost black with a century of polish.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { root } = s;
    const { mood, random } = context;
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const disused = a.left === 'disused';
    const wear = Math.min(1, mood.wear + (disused ? 0.3 : 0));

    // ---- palette ---------------------------------------------------------------------------------------------
    const P = {
      medical: { wall: '#d6ceb6', dado: '#5f432b', wood: '#74502f', board: '#23272a', trim: '#b89443' },
      art: { wall: '#dcd9d0', dado: '#c9c4b6', wood: '#a98458', board: '#2b2d2f', trim: '#8c8a84' },
      rural: { wall: '#e0dcc4', dado: '#86a890', wood: '#b88a4c', board: '#2f4a3c', trim: '#8f6f3a' },
    }[a.school];
    const tone = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#f2c98a'), (mood.warmth - 0.5) * 0.16).lerp(new THREE.Color('#77736a'), (1 - mood.cheer) * 0.12);
    const wall = s.material(tone(P.wall), { roughness: 0.95 });
    const dado = s.material(tone(P.dado), { roughness: a.school === 'medical' ? 0.5 : 0.85 });
    const wood = s.material(tone(P.wood), { roughness: 0.55 });
    const woodDark = s.material(tone(P.wood).multiplyScalar(0.72), { roughness: 0.6 });
    const slate = s.material('#3a3f44', { roughness: 0.42 });
    const steel = s.material('#aeb4b6', { metalness: 0.7, roughness: 0.35 });
    const enamel = s.material('#eceee9', { roughness: 0.3 });
    const brass = s.material(P.trim, { metalness: a.school === 'medical' ? 0.8 : 0.3, roughness: 0.35 });
    const boneMat = s.material('#e7dfc6', { roughness: 0.6 });
    const paperMat = s.material('#efe9d6', { roughness: 0.9 });
    const dark = s.material('#24211e', { roughness: 0.8 });
    const day = 1 - Math.abs(mood.daylight - 0.5) * 1.3;

    // ---- shell: floor, two walls -------------------------------------------------------------------------------
    const floorMap = painted(1024, 1024, (ctx, w, h) => {
      if (a.floor === 'lino') {
        const light = '#cfc7ad', deep = a.school === 'rural' ? '#5d7a66' : '#4a4a48';
        for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { ctx.fillStyle = (i + j) % 2 ? light : deep; ctx.fillRect(i * 64, j * 64, 64, 64); }
      } else {
        const baseTone = new THREE.Color(a.floor === 'dark' ? '#3b2a1f' : '#a88660');
        for (let row = 0; row < 20; row++) {
          let x = -random() * 300;
          while (x < w) {
            const length = 240 + random() * 380;
            ctx.fillStyle = `#${baseTone.clone().offsetHSL(0, 0, jitter(0.045)).getHexString()}`;
            ctx.fillRect(x, row * 51.2, length - 2, 49.4);
            x += length;
          }
        }
        ctx.fillStyle = 'rgba(20,14,8,0.5)';
        for (let row = 0; row <= 20; row++) ctx.fillRect(0, row * 51.2 - 1.5, w, 3);
      }
      for (let i = 0; i < 10 + wear * 60; i++) {
        ctx.fillStyle = `rgba(40,32,22,${0.04 + random() * 0.1 * wear})`;
        ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 20 + random() * 110, 14 + random() * 60, random() * 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(240,238,225,0.16)';
      ctx.fillRect(w * 0.12, 0, w * 0.5, 34);
    });
    const ground = s.box([9.3, 0.24, 7.9], [0, -0.12, 0.65], new THREE.MeshStandardMaterial({ map: floorMap, roughness: a.floor === 'boards' ? 0.85 : 0.5 }));
    ground.castShadow = false;
    const backWall = s.box([9.3, 4.0, 0.2], [0, 2.0, -3.3], wall);
    const leftWall = s.box([0.2, 4.0, 7.9], [-4.65, 2.0, 0.65], wall);
    backWall.castShadow = leftWall.castShadow = false;
    s.box([9.1, 1.0, 0.05], [0, 0.5, -3.18], dado);
    s.box([9.1, 0.06, 0.09], [0, 1.03, -3.17], a.school === 'rural' ? woodDark : dado);
    s.box([0.05, 1.0, 7.7], [-4.53, 0.5, 0.65], dado);
    s.box([0.09, 0.06, 7.7], [-4.52, 1.03, 0.65], a.school === 'rural' ? woodDark : dado);
    // patches where paint has lifted or damp has got in
    for (let i = 0; i < Math.round(wear * 9); i++) {
      const stain = s.material(tone(P.wall).multiplyScalar(0.78 + random() * 0.14), { roughness: 1 });
      if (random() < 0.6) s.box([0.3 + random() * 0.9, 0.2 + random() * 0.7, 0.012], [-4 + random() * 8, 3.0 + random() * 0.8, -3.195], stain);
      else s.box([0.012, 0.2 + random() * 0.7, 0.3 + random() * 0.9], [-4.545, 2.9 + random() * 0.9, -2.5 + random() * 6], stain);
    }

    // ---- chalkboard, picture light, clock ---------------------------------------------------------------------------
    const boardMap = painted(1280, 512, (ctx, w, h) => chalkboard(ctx, w, h, P.board, a.board, wear, random));
    s.mesh(new THREE.PlaneGeometry(3.8, 1.5), new THREE.MeshStandardMaterial({ map: boardMap, roughness: 0.92 }), [-0.9, 2.02, -3.15]);
    for (const y of [1.25, 2.79]) s.box([3.96, 0.08, 0.07], [-0.9, y, -3.15], woodDark);
    for (const x of [-2.84, 1.04]) s.box([0.08, 1.62, 0.07], [x, 2.02, -3.15], woodDark);
    s.box([3.8, 0.03, 0.13], [-0.9, 1.2, -3.1], woodDark);
    s.box([0.16, 0.05, 0.07], [0.4 + jitter(0.3), 1.24, -3.08], s.material('#6f6a5a'));
    for (let i = 0; i < 4; i++) s.box([0.08, 0.016, 0.016], [-2.4 + random() * 2.2, 1.223, -3.07 + jitter(0.02)], s.material(pick(['#f2f0e6', '#f2f0e6', '#e9a7ad', '#f0e08c'])));
    s.box([2.6, 0.05, 0.05], [-0.9, 2.98, -3.0], brass);
    for (const x of [-1.9, 0.1]) s.rod([x, 2.98, -3.2], [x, 2.98, -3.0], 0.014, brass);
    const lampGlow = mix(1.6, 0.35, day);
    s.box([2.5, 0.02, 0.035], [-0.9, 2.952, -3.0], new THREE.MeshStandardMaterial({ color: '#fff3cf', emissive: '#ffe7a8', emissiveIntensity: lampGlow }));
    const face = painted(256, 256, (ctx, w) => {
      ctx.fillStyle = '#f1ecdc'; ctx.beginPath(); ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle = '#1d1b19';
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; ctx.lineWidth = i % 3 ? 4 : 9; ctx.beginPath(); ctx.moveTo(w / 2 + Math.sin(t) * 98, w / 2 - Math.cos(t) * 98); ctx.lineTo(w / 2 + Math.sin(t) * 116, w / 2 - Math.cos(t) * 116); ctx.stroke(); }
    });
    const clock = new THREE.Group();
    clock.position.set(-0.9, 3.42, -3.18);
    root.add(clock);
    const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 28), woodDark);
    clockRim.rotation.x = Math.PI / 2;
    const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.22, 28), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }));
    clockFace.position.z = 0.032;
    clock.add(clockRim, clockFace);
    const hand = (length: number, width: number, colour: string) => {
      const pivot = new THREE.Group();
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, length, 0.006), new THREE.MeshStandardMaterial({ color: colour }));
      mesh.position.y = length / 2 - 0.02;
      pivot.add(mesh);
      pivot.position.z = 0.04;
      clock.add(pivot);
      return pivot;
    };
    const hour = 4 + mood.daylight * 4 + random();
    hand(0.11, 0.022, '#1d1b19').rotation.z = -hour / 12 * Math.PI * 2;
    hand(0.17, 0.014, '#1d1b19').rotation.z = -(hour % 1) * Math.PI * 2;
    const second = hand(0.18, 0.006, '#a8271f');
    const stopped = disused || wear > 0.85;

    // ---- roller wall chart ---------------------------------------------------------------------------------------
    const chart = new THREE.Group();
    chart.position.set(2.62, 2.9, -3.12);
    root.add(chart);
    const chartAdd = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; chart.add(m); return m; };
    if (a.chart === 'rolled') {
      chartAdd(placed(new THREE.CylinderGeometry(0.075, 0.075, 1.12, 14), [0, -0.06, 0], [1, 1, 1], [0, 0, Math.PI / 2]), paperMat);
      chartAdd(fuse([placed(new THREE.CylinderGeometry(0.03, 0.03, 1.26, 10), [0, -0.06, 0], [1, 1, 1], [0, 0, Math.PI / 2]), strut([0.2, -0.13, 0.03], [0.2, -0.5, 0.03], 0.004), placed(new THREE.SphereGeometry(0.02, 8, 6), [0.2, -0.52, 0.03])], woodDark).geometry, woodDark);
    } else {
      const chartMap = painted(512, 768, (ctx, w, h) => wallChart(ctx, w, h, a.chart as 'muscles' | 'skull' | 'eye', wear, random));
      chartAdd(placed(new THREE.PlaneGeometry(1.08, 1.6), [0, -0.86, 0.012]), new THREE.MeshStandardMaterial({ map: chartMap, roughness: 0.9, side: THREE.DoubleSide }));
      chartAdd(fuse([placed(new THREE.CylinderGeometry(0.03, 0.03, 1.24, 10), [0, -0.05, 0.012], [1, 1, 1], [0, 0, Math.PI / 2]), placed(new THREE.CylinderGeometry(0.022, 0.022, 1.2, 10), [0, -1.67, 0.012], [1, 1, 1], [0, 0, Math.PI / 2])], woodDark).geometry, woodDark);
    }
    chartAdd(fuse([strut([-0.5, -0.05, 0], [0, 0.22, 0], 0.004), strut([0.5, -0.05, 0], [0, 0.22, 0], 0.004), placed(new THREE.SphereGeometry(0.018, 8, 6), [0, 0.22, 0])], dark).geometry, dark);
    chart.rotation.z = jitter(0.02 + wear * 0.05);

    // ---- what hangs to the left of the board -------------------------------------------------------------------------
    if (a.school === 'medical') {
      s.box([0.82, 1.04, 0.05], [-3.7, 2.5, -3.17], brass);
      const portrait = painted(256, 320, (ctx, w, h) => {
        ctx.fillStyle = '#2b2119'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1a1512'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.95, 110, 120, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c9a182'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.4, 46, 58, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8e3d6'; ctx.beginPath(); ctx.ellipse(w / 2, h * 0.58, 40, 30, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = '#e8e3d6'; ctx.fillRect(w / 2 - 14, h * 0.6, 28, 40);
      });
      s.mesh(new THREE.PlaneGeometry(0.68, 0.9), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.6 }), [-3.7, 2.5, -3.14]);
    } else if (a.school === 'art') {
      const plaster = s.material('#f1eee6', { roughness: 0.95 });
      s.box([1.2, 0.04, 0.2], [-3.7, 2.1, -3.08], wood);
      const masks: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) {
        const x = -4.1 + i * 0.4;
        masks.push(placed(new THREE.SphereGeometry(1, 16, 12), [x, 2.32 + (i % 2) * 0.5, -3.16], [0.14, 0.19, 0.1]));
        masks.push(placed(new THREE.ConeGeometry(0.03, 0.09, 6), [x, 2.3 + (i % 2) * 0.5, -3.05], [1, 1, 1], [Math.PI / 2 - 0.4, 0, 0]));
      }
      root.add(fuse(masks, plaster));
    } else {
      s.label('WASH YOUR HANDS', 1.1, 0.5, [-3.7, 2.5, -3.19], '#8d2b22', '#ebe4c8');
      s.label(`BIOLOGY · ROOM ${1 + Math.floor(random() * 9)}`, 1.5, 0.24, [2.62, 3.5, -3.19], '#23382c', '#e6dfc4');
    }

    // ---- window in the left wall, radiator beneath it ----------------------------------------------------------------
    const sky = new THREE.Color('#ffcf9a').lerp(new THREE.Color('#eaf3ff'), Math.max(0, day)).lerp(new THREE.Color('#9fb1c8'), (1 - mood.cheer) * 0.35);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.5), new THREE.MeshStandardMaterial({ color: sky, emissive: sky, emissiveIntensity: mix(0.45, 0.95, Math.max(0, day)), roughness: 0.3 }));
    pane.rotation.y = Math.PI / 2;
    pane.position.set(-4.54, 2.35, 0.3);
    root.add(pane);
    const frame: THREE.BufferGeometry[] = [];
    for (const z of [-0.5, 1.1]) frame.push(placed(new THREE.BoxGeometry(0.1, 2.7, 0.1), [-4.5, 2.35, z]));
    for (const y of [1.05, 2.3, 3.65]) frame.push(placed(new THREE.BoxGeometry(0.1, 0.1, 1.7), [-4.5, y, 0.3]));
    frame.push(placed(new THREE.BoxGeometry(0.05, 2.6, 0.05), [-4.51, 2.35, 0.3]), placed(new THREE.BoxGeometry(0.05, 0.05, 1.6), [-4.51, 2.95, 0.3]), placed(new THREE.BoxGeometry(0.05, 0.05, 1.6), [-4.51, 1.65, 0.3]));
    frame.push(placed(new THREE.BoxGeometry(0.22, 0.05, 1.8), [-4.44, 1.0, 0.3]));
    root.add(fuse(frame, a.school === 'medical' ? woodDark : s.material('#e4e0d0', { roughness: 0.6 })));
    const blind = 0.25 + random() * 0.9;
    s.box([0.02, blind, 1.52], [-4.5, 3.6 - blind / 2, 0.3], s.material(a.school === 'rural' ? '#b9c7a8' : '#d8cdaa', { roughness: 0.95 }));
    if (disused) for (let i = 0; i < 3; i++) s.rod([-4.5, 1.2 + random() * 0.4, -0.3 + random() * 1.2], [-4.5, 1.7 + random() * 0.5, -0.4 + random() * 1.4], 0.006, dark);
    const sunPatch = new THREE.BufferGeometry();
    const reach = mix(1.4, 3.4, Math.abs(mood.daylight - 0.5) * 2), skew = (mood.daylight - 0.5) * 2.4;
    sunPatch.setAttribute('position', new THREE.Float32BufferAttribute([-4.4, 0.012, -0.45, -4.4, 0.012, 1.05, -4.4 + reach, 0.012, 1.05 + skew, -4.4 + reach, 0.012, -0.45 + skew], 3));
    sunPatch.setIndex([0, 1, 2, 0, 2, 3]);
    sunPatch.computeVertexNormals();
    root.add(new THREE.Mesh(sunPatch, new THREE.MeshBasicMaterial({ color: sky, transparent: true, opacity: 0.1 + 0.2 * Math.max(0, day), depthWrite: false })));
    const fins: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i++) fins.push(placed(new THREE.BoxGeometry(0.14, 0.62, 0.07), [-4.42, 0.42, -0.25 + i * 0.1]));
    fins.push(strut([-4.42, 0.1, -0.3], [-4.42, 0.1, 1.4], 0.02), strut([-4.42, 0.1, 1.4], [-4.42, 0, 1.4], 0.02));
    root.add(fuse(fins, s.material(a.school === 'rural' ? '#c9c4a8' : '#b9b3a2', { roughness: 0.5, metalness: 0.2 })));
    // a shelf of jars and casts on the left wall
    s.box([0.24, 0.04, 1.9], [-4.42, 2.2, -2.05], wood);
    for (const z of [-2.8, -1.3]) s.box([0.2, 0.16, 0.03], [-4.44, 2.1, z], wood);
    const jars: THREE.BufferGeometry[] = [], lids: THREE.BufferGeometry[] = [];
    const jarCount = 2 + Math.round(mood.density * 5);
    for (let i = 0; i < jarCount; i++) {
      const z = -2.85 + (i + 0.5) * (1.7 / jarCount) + jitter(0.03), r = 0.06 + random() * 0.035, h = 0.16 + random() * 0.14;
      jars.push(placed(new THREE.CylinderGeometry(r, r, h, 14), [-4.42, 2.22 + h / 2, z]));
      lids.push(placed(new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.03, 12), [-4.42, 2.235 + h, z]));
    }
    root.add(fuse(jars, new THREE.MeshStandardMaterial({ color: '#d9d2a0', roughness: 0.15, emissive: '#6d6a3a', emissiveIntensity: 0.25 })), fuse(lids, dark));

    // ---- demonstration bench -------------------------------------------------------------------------------------
    s.box([3.3, 0.8, 0.86], [0, 0.48, -0.9], wood);
    s.box([3.2, 0.08, 0.8], [0, 0.04, -0.9], dark);
    s.box([3.56, 0.06, 1.06], [0, 0.91, -0.9], slate);
    for (let i = 0; i < 4; i++) {
      s.box([0.68, 0.56, 0.02], [-1.2 + i * 0.8, 0.48, -0.462], woodDark);
      s.cylinder(0.018, 0.018, 0.02, [-1.2 + i * 0.8 + 0.26, 0.5, -0.445], brass, 8).rotation.x = Math.PI / 2;
    }
    s.box([0.02, 0.56, 0.6], [1.662, 0.48, -0.9], woodDark);
    s.tube([[1.63, 0.94, -1.3], [1.63, 1.2, -1.3], [1.6, 1.27, -1.22], [1.58, 1.2, -1.14]], 0.014, brass);
    s.cylinder(0.03, 0.035, 0.03, [1.63, 0.955, -1.3], brass, 10);
    // lecturer's stool
    const stool = () => fuse([
      placed(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 18), [0, 0.64, 0]),
      ...[0, 1, 2, 3].flatMap((i) => { const t = i * Math.PI / 2 + Math.PI / 4; return [strut([Math.cos(t) * 0.12, 0.63, Math.sin(t) * 0.12], [Math.cos(t) * 0.2, 0, Math.sin(t) * 0.2], 0.016)]; }),
      placed(new THREE.TorusGeometry(0.17, 0.01, 5, 20), [0, 0.22, 0], [1, 1, 1], [Math.PI / 2, 0, 0]),
    ], woodDark);
    const mainStool = stool();
    if (a.left === 'midlecture') { mainStool.rotation.z = Math.PI / 2 - 0.08; mainStool.position.set(1.9, 0.17, -1.95 + jitter(0.2)); mainStool.rotation.y = jitter(1); }
    else mainStool.position.set(0.7 + jitter(0.3), 0, -1.95);
    root.add(mainStool);

    // ---- instrument trolley ------------------------------------------------------------------------------------------
    const tx = 3.05, tz = 0.25;
    for (const y of [0.3, 0.82]) { s.box([0.78, 0.03, 0.52], [tx, y, tz], enamel); }
    const rails: THREE.BufferGeometry[] = [];
    for (const dx of [-0.37, 0.37]) for (const dz of [-0.24, 0.24]) {
      rails.push(strut([tx + dx, 0.07, tz + dz], [tx + dx, 0.9, tz + dz], 0.013));
      rails.push(placed(new THREE.SphereGeometry(0.035, 8, 6), [tx + dx, 0.035, tz + dz]));
    }
    rails.push(strut([tx - 0.37, 0.9, tz - 0.24], [tx - 0.37, 0.9, tz + 0.24], 0.011), strut([tx - 0.37, 0.9, tz - 0.24], [tx + 0.37, 0.9, tz - 0.24], 0.011));
    root.add(fuse(rails, steel));
    s.lathe([[0, 0], [0.13, 0], [0.17, 0.07], [0.16, 0.075], [0.12, 0.012], [0, 0.012]], enamel, [tx - 0.15, 0.315, tz]);
    for (let i = 0; i < 1 + Math.round(mood.density * 3); i++) s.cylinder(0.028, 0.035, 0.12 + random() * 0.08, [tx + 0.1 + i * 0.08, 0.38, tz + jitter(0.14)], s.material(pick(['#7a4a22', '#365a7a', '#e8e4d4', '#3c5a3a']), { roughness: 0.2 }), 10);

    // ---- tiered desks stepping up toward the viewer ---------------------------------------------------------------------
    const rowWood = wood, cx = -0.7, span = 7.2;
    for (let k = 0; k < 3; k++) {
      const z0 = 1.45 + k * 1.0, py = k * 0.35;
      if (k > 0) s.box([9.1, 0.35, 4.6 - (z0 - 0.12)], [0, py - 0.175, (4.6 + z0 - 0.12) / 2], woodDark);
      s.box([span, 0.76, 0.04], [cx, py + 0.38, z0], rowWood);
      s.box([span + 0.06, 0.035, 0.44], [cx, py + 0.762, z0 + 0.21], woodDark);
      for (const x of [cx - span / 2, cx + span / 2]) s.box([0.045, 0.76, 0.9], [x, py + 0.38, z0 + 0.43], rowWood);
      s.box([span, 0.04, 0.3], [cx, py + 0.45, z0 + 0.66], woodDark);
      for (let i = 0; i < 5; i++) s.box([0.04, 0.44, 0.26], [cx - span / 2 + 0.9 + i * 1.35, py + 0.22, z0 + 0.66], rowWood);
    }
    s.box([span, 0.5, 0.04], [cx, 0.7 + 0.72, 4.42], rowWood);

    // ---- the far corner -------------------------------------------------------------------------------------------
    const corner = new THREE.Group();
    corner.position.set(3.72, 0, -2.55);
    root.add(corner);
    const cadd = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; corner.add(m); return m; };
    if (a.corner === 'skeleton') {
      const bones: THREE.BufferGeometry[] = [
        placed(new THREE.SphereGeometry(1, 16, 12), [0, 1.63, 0.01], [0.085, 0.1, 0.105]),
        placed(new THREE.BoxGeometry(0.1, 0.055, 0.09), [0, 1.535, 0.04]),
        strut([0, 1.5, -0.03], [0, 0.98, -0.03], 0.024),
        strut([-0.19, 1.45, 0], [0.19, 1.45, 0], 0.013),
        placed(new THREE.TorusGeometry(0.13, 0.03, 6, 18), [0, 0.95, 0], [1, 0.7, 0.8], [1.2, 0, 0]),
      ];
      for (let i = 0; i < 7; i++) {
        const r = 0.1 + 0.045 * Math.sin((i + 1) / 8 * Math.PI);
        bones.push(placed(new THREE.TorusGeometry(r, 0.011, 5, 18), [0, 1.42 - i * 0.052, 0.02], [1, 1, 0.72], [Math.PI / 2 - 0.25, 0, 0]));
      }
      for (const side of [-1, 1]) {
        bones.push(strut([side * 0.19, 1.44, 0], [side * 0.225, 1.14, -0.01], 0.016), strut([side * 0.225, 1.14, -0.01], [side * 0.215, 0.86, 0.04], 0.012), placed(new THREE.BoxGeometry(0.035, 0.11, 0.05), [side * 0.215, 0.79, 0.05]));
        bones.push(strut([side * 0.09, 0.93, 0], [side * 0.1, 0.52, 0.01], 0.02), strut([side * 0.1, 0.52, 0.01], [side * 0.09, 0.1, 0], 0.015), placed(new THREE.BoxGeometry(0.06, 0.03, 0.2), [side * 0.09, 0.075, 0.07]));
        bones.push(placed(new THREE.SphereGeometry(0.024, 8, 6), [side * 0.1, 0.52, 0.01]), placed(new THREE.SphereGeometry(0.02, 8, 6), [side * 0.225, 1.14, -0.01]));
      }
      const figure = cadd(fuse(bones, boneMat).geometry, boneMat);
      figure.rotation.y = -0.2 + jitter(0.25);
      cadd(fuse([placed(new THREE.CylinderGeometry(0.26, 0.3, 0.05, 20), [0, 0.025, -0.1]), strut([0, 0.05, -0.24], [0, 1.98, -0.24], 0.02), strut([0, 1.98, -0.24], [0, 1.98, 0.01], 0.015), strut([0, 1.98, 0.01], [0, 1.72, 0.01], 0.006)], dark).geometry, dark);
      const black = new THREE.MeshStandardMaterial({ color: '#17130f', roughness: 1 });
      const sockets = cadd(fuse([placed(new THREE.SphereGeometry(0.022, 8, 6), [-0.034, 1.635, 0.1]), placed(new THREE.SphereGeometry(0.022, 8, 6), [0.034, 1.635, 0.1]), placed(new THREE.SphereGeometry(0.012, 6, 5), [0, 1.595, 0.107])], black).geometry, black);
      sockets.rotation.y = figure.rotation.y;
    } else if (a.corner === 'cabinet') {
      cadd(placed(new THREE.BoxGeometry(1.3, 2.2, 0.46), [-0.1, 1.1, -0.38]), wood);
      cadd(placed(new THREE.BoxGeometry(1.14, 1.92, 0.02), [-0.1, 1.14, -0.145]), dark);
      const trimParts = [placed(new THREE.BoxGeometry(0.05, 1.96, 0.03), [-0.1, 1.14, -0.13])];
      for (let i = 0; i < 4; i++) trimParts.push(placed(new THREE.BoxGeometry(1.14, 0.03, 0.06), [-0.1, 0.22 + i * 0.48, -0.12]));
      cadd(fuse(trimParts, woodDark).geometry, woodDark);
      const fluid: THREE.BufferGeometry[] = [], things: THREE.BufferGeometry[] = [];
      for (let shelf = 0; shelf < 4; shelf++) for (let i = 0; i < 4; i++) {
        if (random() > 0.45 + mood.density * 0.5) continue;
        const x = -0.55 + i * 0.3 + jitter(0.03), r = 0.07 + random() * 0.04, h = 0.2 + random() * 0.16, y = 0.235 + shelf * 0.48;
        fluid.push(placed(new THREE.CylinderGeometry(r, r, h, 12), [x, y + h / 2, -0.09]));
        things.push(placed(new THREE.SphereGeometry(r * 0.6, 8, 6), [x, y + h * 0.4, -0.06], [1, 1.2 + random(), 0.7]));
      }
      cadd(fuse(fluid, new THREE.MeshStandardMaterial({ color: '#cfc98f', roughness: 0.12, emissive: '#77733a', emissiveIntensity: 0.35 })).geometry, new THREE.MeshStandardMaterial({ color: '#cfc98f', roughness: 0.12, emissive: '#77733a', emissiveIntensity: 0.35 }));
      cadd(fuse(things, s.material('#c9a79a')).geometry, s.material('#b98f86', { roughness: 0.5 }));
    } else if (a.corner === 'torso') {
      cadd(placed(new THREE.BoxGeometry(0.8, 0.05, 0.6), [0, 0.74, -0.1]), wood);
      cadd(fuse([-1, 1].flatMap((x) => [-1, 1].map((z) => strut([x * 0.34, 0, -0.1 + z * 0.24], [x * 0.34, 0.72, -0.1 + z * 0.24], 0.022))), woodDark).geometry, woodDark);
      const skin = s.material('#d9a98a', { roughness: 0.45 });
      const body = new THREE.LatheGeometry([[0, 0], [0.19, 0], [0.2, 0.1], [0.17, 0.26], [0.2, 0.46], [0.23, 0.58], [0.2, 0.66], [0.07, 0.7], [0.065, 0.78], [0, 0.78]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
      body.scale(1.15, 1, 0.72);
      cadd(placed(body, [0, 0.77, -0.1]), skin);
      cadd(placed(new THREE.SphereGeometry(1, 16, 10), [0, 1.14, 0.03], [0.16, 0.27, 0.05]), s.material('#5c1d1c', { roughness: 0.6 }));
      const lung = s.material('#d98c94', { roughness: 0.4 });
      cadd(fuse([placed(new THREE.SphereGeometry(1, 12, 8), [-0.075, 1.27, 0.06], [0.06, 0.11, 0.04]), placed(new THREE.SphereGeometry(1, 12, 8), [0.08, 1.27, 0.06], [0.06, 0.11, 0.04])], lung).geometry, lung);
      cadd(placed(new THREE.SphereGeometry(1, 12, 8), [0.015, 1.22, 0.085], [0.04, 0.05, 0.03]), s.material('#b3201f', { roughness: 0.35 }));
      cadd(placed(new THREE.SphereGeometry(1, 12, 8), [-0.03, 1.1, 0.075], [0.1, 0.045, 0.035]), s.material('#6f3a22', { roughness: 0.4 }));
      const gut = s.material('#e3b68f', { roughness: 0.45 });
      cadd(fuse([0, 1, 2].map((i) => placed(new THREE.TorusGeometry(0.045 + i * 0.012, 0.02, 6, 14), [jitter(0.02), 0.98 - i * 0.01, 0.07], [1.3, 1, 0.5])), gut).geometry, gut);
    } else {
      cadd(fuse([placed(new THREE.CylinderGeometry(0.24, 0.28, 0.05, 18), [0, 0.025, -0.1]), strut([0, 0.05, -0.1], [0, 1.9, -0.1], 0.022), strut([-0.2, 1.74, -0.1], [0.2, 1.86, -0.1], 0.012), strut([0, 1.8, -0.3], [0, 1.8, 0.1], 0.012)], woodDark).geometry, woodDark);
      const coat = new THREE.CylinderGeometry(0.13, 0.26, 1.15, 14, 6, true);
      const cp = coat.attributes.position;
      for (let i = 0; i < cp.count; i++) cp.setXYZ(i, cp.getX(i) * (1 + 0.1 * Math.sin(cp.getY(i) * 9 + Math.atan2(cp.getZ(i), cp.getX(i)) * 5)), cp.getY(i), cp.getZ(i) * 0.5);
      coat.computeVertexNormals();
      cadd(placed(coat, [0.16, 1.2, -0.06]), new THREE.MeshStandardMaterial({ color: tone('#ecebe4'), roughness: 0.9, side: THREE.DoubleSide }));
      cadd(fuse([placed(new THREE.CylinderGeometry(0.1, 0.11, 0.1, 16), [-0.2, 1.8, -0.1]), placed(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 18), [-0.2, 1.75, -0.1])], dark).geometry, s.material('#4a3b2c', { roughness: 0.9 }));
    }

    // ---- art school easel -------------------------------------------------------------------------------------------
    if (a.school === 'art') {
      const easel = new THREE.Group();
      easel.position.set(-3.2, 0, -1.2);
      easel.rotation.y = 0.75;
      root.add(easel);
      easel.add(fuse([strut([-0.36, 0, 0.1], [-0.05, 1.9, -0.1], 0.02), strut([0.36, 0, 0.1], [0.05, 1.9, -0.1], 0.02), strut([0, 0, -0.62], [0, 1.9, -0.1], 0.02), placed(new THREE.BoxGeometry(0.8, 0.04, 0.07), [0, 0.82, 0.06])], wood));
      const study = painted(384, 512, (ctx, w, h) => {
        ctx.fillStyle = '#e6dfcb'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(40,36,32,0.85)'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
        headProfile(ctx, w * 0.1, h * 0.06, w * 0.84, h * 0.9, random);
        ctx.strokeStyle = 'rgba(40,36,32,0.25)'; ctx.lineWidth = 3;
        for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.moveTo(w * 0.5 + i * 5, h * 0.3 + i * 6); ctx.lineTo(w * 0.62 + i * 4, h * 0.22 + i * 6); ctx.stroke(); }
      });
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.88, 0.02), new THREE.MeshStandardMaterial({ map: study, roughness: 0.9 }));
      sheet.position.set(0, 1.28, 0.03);
      sheet.rotation.x = -0.1;
      sheet.castShadow = true;
      easel.add(sheet);
    }

    // ---- how it was left ----------------------------------------------------------------------------------------------
    const sheets: THREE.BufferGeometry[] = [], books: { g: THREE.BufferGeometry; c: string }[] = [];
    const paperCount = Math.round(mood.density * 6) + (a.left === 'midlecture' ? 14 : disused ? 9 : 0);
    for (let i = 0; i < paperCount; i++) {
      const onDesk = random() < 0.45, row = 1 + Math.floor(random() * 2);
      const at: [number, number, number] = onDesk ? [-3.8 + random() * 6.2, row * 0.35 + 0.783, 1.45 + row + 0.2 + jitter(0.1)] : [-3.6 + random() * 6.6, 0.006, -0.2 + random() * 1.4];
      sheets.push(placed(new THREE.BoxGeometry(0.21, 0.003, 0.3), at, [1, 1, 1], [0, random() * 3, 0]));
    }
    if (sheets.length) root.add(fuse(sheets, s.material(disused ? '#cfc7b0' : '#f1ede0', { roughness: 0.95 })));
    const bookCount = Math.round(mood.density * 7) + (a.left === 'midlecture' ? 3 : 0);
    for (let i = 0; i < bookCount; i++) {
      const row = 1 + Math.floor(random() * 2), thick = 0.03 + random() * 0.04;
      books.push({ g: placed(new THREE.BoxGeometry(0.2, thick, 0.27), [-3.9 + random() * 6.4, row * 0.35 + 0.78 + thick / 2, 1.45 + row + 0.22], [1, 1, 1], [0, jitter(0.5), 0]), c: pick(['#6b2a25', '#27405a', '#3d5a3a', '#5a4a2a', '#2c2c30']) });
    }
    for (const colour of ['#6b2a25', '#27405a', '#3d5a3a', '#5a4a2a', '#2c2c30']) {
      const group = books.filter((b) => b.c === colour).map((b) => b.g);
      if (group.length) root.add(fuse(group, s.material(colour, { roughness: 0.7 })));
    }
    if (a.left === 'midlecture') {
      const jacket = new THREE.SphereGeometry(1, 14, 10);
      const jp = jacket.attributes.position;
      for (let i = 0; i < jp.count; i++) jp.setY(i, Math.max(-0.25, jp.getY(i)) + 0.12 * Math.sin(jp.getX(i) * 7) * Math.cos(jp.getZ(i) * 6));
      jacket.computeVertexNormals();
      s.mesh(placed(jacket, [2.45, 0.83, 1.66], [0.3, 0.09, 0.2], [0, jitter(0.5), 0]), s.material(pick(['#5a4632', '#39424d', '#6b3b33']), { roughness: 0.95 }));
      const openBook = fuse([placed(new THREE.BoxGeometry(0.2, 0.02, 0.28), [-0.105, 0, 0], [1, 1, 1], [0, 0, 0.12]), placed(new THREE.BoxGeometry(0.2, 0.02, 0.28), [0.105, 0, 0], [1, 1, 1], [0, 0, -0.12])], paperMat);
      openBook.position.set(-0.2 + jitter(0.4), 0.8, 1.66);
      openBook.rotation.y = jitter(0.3);
      root.add(openBook);
      for (let i = 0; i < 3; i++) s.box([0.07, 0.014, 0.014], [-1.6 + random() * 2.4, 0.007, -2.3 + random() * 0.5], s.material('#f2f0e6')).rotation.y = random() * 3;
    }
    if (disused) {
      const sheetMat = new THREE.MeshStandardMaterial({ color: tone('#dedad0'), roughness: 1 });
      for (const k of [1, 2]) {
        const length = 2.6 + random() * 2.6, x = -4.2 + length / 2 + random() * (7 - length);
        const g = new THREE.BoxGeometry(length, 0.5, 0.62, 18, 3, 4);
        const gp = g.attributes.position;
        for (let i = 0; i < gp.count; i++) {
          const top = gp.getY(i) > 0.2;
          gp.setXYZ(i, gp.getX(i) + (top ? 0 : jitter(0.03)), gp.getY(i) + (top ? jitter(0.035) : 0.06 * Math.sin(gp.getX(i) * 9)), gp.getZ(i) * (top ? 0.86 : 1 + 0.05 * Math.sin(gp.getX(i) * 11)));
        }
        g.computeVertexNormals();
        s.mesh(placed(g, [x, k * 0.35 + 0.57, 1.45 + k + 0.2]), sheetMat);
      }
    }
    if (a.left === 'cleaning') {
      const bx = -2.7 + jitter(0.3), bz = 0.1 + jitter(0.2);
      s.lathe([[0, 0], [0.13, 0], [0.17, 0.3], [0.18, 0.3], [0.14, 0.015], [0, 0.015]], s.material(pick(['#b8b9b4', '#b03a2e', '#c9a53a']), { metalness: 0.3, roughness: 0.4 }), [bx, 0, bz]);
      s.rod([bx + 0.04, 0.05, bz], [bx + 0.5, 1.4, bz - 0.35], 0.014, wood);
      s.ball([0.1, 0.05, 0.1], [bx + 0.04, 0.07, bz], s.material('#d8d2bd', { roughness: 1 }), 10);
      const wet = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshStandardMaterial({ color: '#8f8a7c', roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }));
      wet.rotation.x = -Math.PI / 2;
      wet.scale.set(1.3, 0.8, 1);
      wet.position.set(bx + 1.3, 0.008, bz + 0.3);
      root.add(wet);
      for (let i = 0; i < 3; i++) {
        const up = stool();
        up.rotation.x = Math.PI;
        up.position.set(-3.4 + i * 2.3 + jitter(0.4), 0.35 + 0.78 + 0.66, 2.66);
        root.add(up);
      }
    }
    

    // ---- light and camera ----------------------------------------------------------------------------------------
    root.add(new THREE.HemisphereLight(new THREE.Color('#f3f1ea').lerp(sky, 0.4), '#6f685c', mix(1.0, 1.5, Math.max(0, day))));
    const key = new THREE.DirectionalLight(new THREE.Color().setHSL(0.6 - mood.warmth * 0.5, 0.35, 0.86), mix(1.9, 2.8, Math.max(0, day)));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0003;
    root.add(key, key.target);
    const fill = new THREE.DirectionalLight('#dbe6ff', 0.5);
    fill.position.set(6, 5, 8);
    root.add(fill);
    const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 250);
    const yaw = 29 * Math.PI / 180, pitch = 27 * Math.PI / 180;
    const background = tone(P.wall).lerp(new THREE.Color('#e9e8e0'), 0.55);

    return {
      object: root, camera, background, ground, keyLight: key, capacity: SLOTS.length,
      place(items: readonly Placeable[]) {
        const boxes: THREE.Box3[] = [visibleBounds(root)];
        items.forEach((item, index) => {
          const slot = SLOTS[index % SLOTS.length];
          const scale = Math.min(slot.height / Math.max(item.height, 0.02), slot.radius / Math.max(item.radius, 0.02));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(slot.x, slot.y, slot.z);
          item.holder.rotation.y = yaw * 0.55 + (context.random() - 0.5) * 0.35;
          item.holder.updateMatrixWorld(true);
          boxes.push(visibleBounds(item.holder));
        });
        boxes[0] = visibleBounds(root);
        const bounds = boxes.reduce((sum, box) => sum.union(box), new THREE.Box3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const direction = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
        camera.position.copy(centre).addScaledVector(direction, 80);
        camera.lookAt(centre);
        camera.updateMatrixWorld(true);
        const projection = new THREE.Box2();
        for (const box of boxes)
          for (const x of [box.min.x, box.max.x])
            for (const y of [box.min.y, box.max.y])
              for (const z of [box.min.z, box.max.z]) {
                const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
                projection.expandByPoint(new THREE.Vector2(p.x, p.y));
              }
        const middle = projection.getCenter(new THREE.Vector2());
        const size = projection.getSize(new THREE.Vector2());
        const extent = Math.max(size.x, size.y) * 0.5;
        camera.translateX(middle.x);
        camera.translateY(middle.y);
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
        const span = bounds.getSize(new THREE.Vector3()).length();
        key.target.position.copy(centre);
        key.position.copy(centre).add(new THREE.Vector3(mix(-2.5, 7, mood.daylight), 9.5, 6.5).normalize().multiplyScalar(span * 1.5));
        const shadow = key.shadow.camera;
        shadow.left = shadow.bottom = -span * 0.6;
        shadow.right = shadow.top = span * 0.6;
        shadow.near = 0.1; shadow.far = span * 4;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        if (!stopped) second.rotation.z = -Math.floor(time * mix(0.6, 1.6, mood.energy)) / 60 * Math.PI * 2;
        chart.rotation.x = Math.sin(time * 0.7) * 0.012 * mood.energy;
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
  },
});
