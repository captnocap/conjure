import * as THREE from 'three';
import { type Placeable, Sculpture, choice, defineWorld, diorama, mix } from '@conjure/kit';

type P3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
function star(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2, reach = i % 2 ? r * 0.42 : r;
    c.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  c.closePath();
  c.fill();
}

const CANVAS = {
  'red-white': 'Broad red and white stripes: the classic big top.',
  'blue-yellow': 'Royal blue and sunflower yellow stripes, bright and southern.',
  'rose-cream': 'Sun-faded rose and cream, a tent that has toured for forty summers.',
  'green-cream': 'Bottle green and cream, an old Central European family circus.',
  midnight: 'Midnight blue canvas sewn with pale stars, a winter or night circus.',
  'plain-ochre': 'Plain waxed ochre canvas with dark seams, poor and practical.',
} as const;
const CANVAS_HUES: Record<keyof typeof CANVAS, [string, string]> = {
  'red-white': ['#b9272e', '#efe6d2'],
  'blue-yellow': ['#27489a', '#ecc445'],
  'rose-cream': ['#c98f88', '#eadfc6'],
  'green-cream': ['#25644a', '#ebe1c4'],
  midnight: ['#1f2a5e', '#27356f'],
  'plain-ochre': ['#b89a5e', '#c2a56a'],
};
const BANNERS = { cirque: 'CIRQUE', zirkus: 'ZIRKUS', circo: 'CIRCO', gala: 'GALA', last: 'LAST NIGHT', artistes: 'ARTISTES' } as const;

export default defineWorld({
  questions: {
    moment: choice('What moment is it in the tent?', {
      hush: 'The hush before the act: house lights down, one spotlight pool on the sawdust, the crowd a dim presence.',
      showtime: 'Showtime in full swing: every bulb lit, bunting up, benches packed.',
      rehearsal: 'Morning rehearsal: daylight through the canvas, empty benches, work going on.',
      struck: 'After the last show: benches half dismantled and stacked, canvas bundles roped up, one work lamp left burning.',
      abandoned: 'Abandoned for years: holes in the canvas, weeds in the ring, shafts of light and nobody.',
    }),
    canvas: choice('What is the tent canvas like?', CANVAS),
    curb: choice('How is the ring curb painted?', {
      blocks: 'Alternating red and white blocks.',
      stars: 'Blue with a gold star on every section.',
      gold: 'Crimson with gilt edging, plush and grand.',
      harlequin: 'Many-coloured blocks, a different colour each, like a toy.',
      bare: 'Bare scuffed timber.',
    }),
    floor: choice('What covers the ring floor?', {
      sawdust: 'Raked pale sawdust.',
      tanbark: 'Dark red-brown tanbark and peat.',
      carpet: 'A round star-patterned ring carpet.',
      grass: 'Trampled grass, the field showing through.',
    }),
    curtain: choice('What is the artists\' entrance like?', {
      'red-velvet': 'Heavy red velvet with gold fringe, parted to a dark gap.',
      'red-closed': 'Red velvet drawn fully closed.',
      'blue-stars': 'Midnight blue velvet scattered with stars, parted.',
      'green-patched': 'Faded green plush, patched and sagging, parted.',
      'gold-lame': 'Glittering gold cloth, parted, lit from behind.',
    }),
    banner: choice('What is lettered over the entrance?', {
      cirque: 'CIRQUE', zirkus: 'ZIRKUS', circo: 'CIRCO', gala: 'GALA', last: 'LAST NIGHT', artistes: 'ARTISTES',
    }),
    rigging: choice('What hangs in the rigging between the king poles?', {
      trapeze: 'An empty trapeze, swinging slightly.',
      lamps: 'A cluster of enamel-shaded lamps at different heights.',
      hoop: 'An aerial hoop and two long silks.',
      garlands: 'Swags of coloured bulbs strung from the poles to the walls.',
      bare: 'Bare ropes and a coiled rope ladder.',
    }),
    spot: choice('What colour is the spotlight?', {
      warm: 'Warm white limelight.',
      rose: 'Rose pink, tender and theatrical.',
      blue: 'Cold moonlight blue.',
      amber: 'Deep amber, like a lantern.',
      none: 'There is no spotlight.',
    }),
    left: choice('What has been left lying in the ring?', {
      nothing: 'Nothing: the ring is freshly raked.',
      juggling: 'Juggling clubs and coloured balls.',
      petals: 'A scatter of rose petals and confetti.',
      hoofprints: 'A circle of hoofprints and a forgotten plume.',
      balloon: 'One lost balloon and a child\'s shoe.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const YAW = 18, PITCH = 26;
    const yaw = (YAW * Math.PI) / 180;
    const local = (x: number, z: number): [number, number] => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
    const RING = 4.2, CURB = 0.34, RT = 7.4, WH = 3.1, PH = 7.6, PX = 3.0, PZ = -2.5, GROUND = 7.9;
    const dark = a.moment === 'hush' || a.moment === 'struck';
    const day = a.moment === 'rehearsal' || a.moment === 'abandoned';
    const backdrop = a.moment === 'hush' ? '#6a6272' : a.moment === 'struck' ? '#70706e' : a.moment === 'showtime' ? '#8a7466' : a.moment === 'rehearsal' ? '#d9d2bf' : '#b9bdb0';

    const HANG: [number, number, number, number] = [...local(-0.1, -2.5), 3.9, 0.6];
    const slots: [number, number, number?, number?][] = [
      local(0, 0.7),
      [...local(-2.55, -1.0), 0, 0.92],
      [...local(2.55, -0.9), 0, 0.92],
      HANG,
      [...local(-2.3, 2.3), 0, 0.62],
      [...local(2.4, 2.4), 0, 0.62],
    ];
    const { art, world } = diorama(context, { background: backdrop, floor: null, width: GROUND * 2, depth: GROUND * 2, yaw: YAW, pitch: PITCH, maxHeight: 3.6, radius: 1.75, slots });
    const t = new Sculpture(context);
    t.root.rotation.y = yaw;
    art.root.add(t.root);

    // House lights: dim for the hush, full for a daylight rehearsal.
    for (const child of art.root.children) {
      const light = child as THREE.Light;
      if ((light as THREE.HemisphereLight).isHemisphereLight) light.intensity *= dark ? 0.62 : a.moment === 'showtime' ? 0.9 : 1.05;
      else if (light === world.keyLight) light.intensity *= dark ? 0.42 : a.moment === 'showtime' ? 0.75 : 1;
    }
    const shade = (hex: string, amount = 1) => new THREE.Color(hex).lerp(new THREE.Color(dark ? '#2a2633' : '#4a4640'), (dark ? 0.5 : 0.18) * amount);
    const wearAll = Math.min(1, mood.wear + (a.moment === 'abandoned' ? 0.5 : 0));
    const [hueA, hueB] = CANVAS_HUES[a.canvas];

    // Ground beyond the ring: trodden earth and grass.
    const earth = t.material(a.moment === 'abandoned' ? '#6f7550' : '#77694f', { roughness: 1 });
    const ground = t.cylinder(GROUND, GROUND, 0.24, [0, -0.12, 0], earth, 64);
    ground.castShadow = false;
    world.ground = ground;

    // Ring floor, painted with rake lines, a pool of light and whatever was left behind.
    const heroLocal: [number, number] = [0, 0.7];
    const floorHue = { sawdust: '#d9c090', tanbark: '#7c4a32', carpet: '#8c1f2b', grass: '#84905a' }[a.floor];
    const spotHue = { warm: '#fff1cf', rose: '#ffc2d0', blue: '#bcd4ff', amber: '#ffc670', none: '#ffffff' }[a.spot];
    const spotOn = a.spot !== 'none' && a.moment !== 'rehearsal' && a.moment !== 'abandoned';
    const floorMap = paint(1024, 1024, (c, w, h) => {
      const px = (m: number) => (m / (RING * 2)) * w;
      c.fillStyle = floorHue;
      c.fillRect(0, 0, w, h);
      if (a.floor === 'carpet') {
        c.fillStyle = '#d6aa3c';
        c.beginPath(); c.arc(w / 2, h / 2, w * 0.47, 0, 7); c.fill();
        c.fillStyle = floorHue;
        c.beginPath(); c.arc(w / 2, h / 2, w * 0.44, 0, 7); c.fill();
        c.fillStyle = '#d6aa3c';
        star(c, w / 2, h / 2, w * 0.36);
        c.fillStyle = '#a82a36';
        star(c, w / 2, h / 2, w * 0.2);
      } else {
        for (let i = 0; i < 2600; i++) {
          c.fillStyle = random() < 0.5 ? 'rgba(255,245,215,0.22)' : 'rgba(70,45,25,0.2)';
          c.fillRect(random() * w, random() * h, 2 + random() * 5, 2 + random() * 4);
        }
        c.strokeStyle = 'rgba(80,55,30,0.16)'; c.lineWidth = 3;
        for (let r = 0.3; r < RING; r += 0.26) { c.beginPath(); c.arc(w / 2, h / 2, px(r), 0, 7); c.stroke(); }
        if (a.floor === 'grass') for (let i = 0; i < 500; i++) { c.fillStyle = random() < 0.6 ? 'rgba(60,90,40,0.45)' : 'rgba(150,130,80,0.5)'; c.beginPath(); c.ellipse(random() * w, random() * h, 6 + random() * 26, 4 + random() * 14, random() * 3, 0, 7); c.fill(); }
      }
      // The worn track where the horses run.
      c.strokeStyle = 'rgba(60,40,25,0.2)'; c.lineWidth = px(0.7);
      c.beginPath(); c.arc(w / 2, h / 2, px(RING - 0.65), 0, 7); c.stroke();
      if (a.left === 'hoofprints') {
        c.fillStyle = 'rgba(50,32,18,0.55)';
        for (let i = 0; i < 46; i++) { const an = (i / 46) * Math.PI * 2, r = px(RING - 0.65 + (i % 2 ? 0.14 : -0.14)); c.beginPath(); c.arc(w / 2 + Math.cos(an) * r, h / 2 + Math.sin(an) * r, px(0.075), an, an + 4.2); c.lineWidth = px(0.04); c.strokeStyle = 'rgba(50,32,18,0.6)'; c.stroke(); }
      }
      if (a.left === 'petals') for (let i = 0; i < 260 + mood.density * 300; i++) {
        const an = random() * 7, r = Math.pow(random(), 0.7) * px(RING * 0.8);
        c.fillStyle = ['#b3182c', '#f3d24a', '#f4f0e6', '#e86a8a', '#58a0d8'][Math.floor(random() * 5)];
        c.beginPath(); c.ellipse(w / 2 + Math.cos(an) * r, h / 2 + Math.sin(an) * r, 3 + random() * 5, 2 + random() * 3, random() * 3, 0, 7); c.fill();
      }
      for (let i = 0; i < wearAll * 26; i++) { c.fillStyle = 'rgba(55,40,30,0.22)'; c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 70, 14 + random() * 40, random() * 3, 0, 7); c.fill(); }
      if (spotOn) {
        const sx = w / 2 + px(heroLocal[0]), sy = h / 2 + px(heroLocal[1]);
        const pool = c.createRadialGradient(sx, sy, px(0.4), sx, sy, px(2.5));
        const tint = new THREE.Color(spotHue);
        const rgb = `${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)}`;
        pool.addColorStop(0, `rgba(${rgb},0.75)`);
        pool.addColorStop(0.75, `rgba(${rgb},0.5)`);
        pool.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = pool;
        c.fillRect(0, 0, w, h);
      }
    });
    floorMap.wrapS = floorMap.wrapT = THREE.ClampToEdgeWrapping;
    const ringFloor = new THREE.Mesh(new THREE.CircleGeometry(RING, 64), new THREE.MeshStandardMaterial({ map: floorMap, roughness: 1, color: dark ? '#c9c2cc' : '#ffffff' }));
    ringFloor.rotation.x = -Math.PI / 2;
    ringFloor.position.y = 0.012;
    ringFloor.receiveShadow = true;
    t.root.add(ringFloor);

    // An annular slab from angle a0 to a1 (0 = stage right, 90 degrees = the back of the tent).
    const arcSlab = (r0: number, r1: number, a0: number, a1: number, y0: number, height: number, material: THREE.Material, segments = 20) => {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, r1, a0, a1, false);
      shape.absarc(0, 0, r0, a1, a0, true);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: segments });
      geo.rotateX(-Math.PI / 2);
      return t.mesh(geo, material, [0, y0, 0]);
    };
    const polar = (r: number, angle: number, y = 0): P3 => [Math.cos(angle) * r, y, -Math.sin(angle) * r];
    const deg = (d: number) => (d * Math.PI) / 180;

    // Ring curb in painted sections, with a gap for the ring doors at the back.
    const SECTIONS = 30;
    const curbHues = { blocks: ['#c5222b', '#f1ece0'], stars: ['#1f3f9c', '#1f3f9c'], gold: ['#8f1823', '#8f1823'], harlequin: ['#c5222b', '#f2c230', '#1f6fb0', '#2f8a56', '#f1ece0', '#7a3aa6'], bare: ['#9a7a52', '#8c6e48'] }[a.curb];
    const curbMats = curbHues.map((hue) => t.material(hue, { roughness: 0.55 + wearAll * 0.3 }));
    const gilt = t.material('#dcae3a', { metalness: 0.55, roughness: 0.4 });
    for (let i = 0; i < SECTIONS; i++) {
      const a0 = (i / SECTIONS) * Math.PI * 2 + deg(90 - 6), a1 = a0 + (Math.PI * 2) / SECTIONS;
      if (i === 0) continue;
      arcSlab(RING, RING + CURB, a0 + 0.004, a1 - 0.004, 0, 0.36, curbMats[i % curbMats.length], 3);
    }
    if (a.curb === 'gold' || a.curb === 'stars') {
      const rim = t.ring(RING + CURB / 2, 0.035, [0, 0.37, 0], gilt, Math.PI * 2 - deg(12));
      rim.rotation.set(-Math.PI / 2, 0, deg(96));
    }
    if (a.curb === 'stars') {
      const pts: { at: P3; size: number }[] = [];
      for (let i = 1; i < SECTIONS; i++) pts.push({ at: polar(RING + CURB / 2, ((i + 0.5) / SECTIONS) * Math.PI * 2 + deg(84), 0.365), size: 1 });
      const starShape = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const an = (i * Math.PI) / 5, r = i % 2 ? 0.06 : 0.14; if (i) starShape.lineTo(Math.sin(an) * r, Math.cos(an) * r); else starShape.moveTo(Math.sin(an) * r, Math.cos(an) * r); }
      const geo = new THREE.ExtrudeGeometry(starShape, { depth: 0.012, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      t.scatter(geo, gilt, pts);
    }

    // Canvas: side wall and roof share one striped cloth.
    const PAIRS = 18, TILE = 3;
    const clothMap = paint(512, 512, (c, w, h) => {
      const sw = w / (TILE * 2);
      for (let i = 0; i < TILE * 2; i++) { c.fillStyle = i % 2 ? hueB : hueA; c.fillRect(i * sw, 0, sw + 1, h); }
      if (a.canvas === 'midnight') { c.fillStyle = '#e9e2c0'; for (let i = 0; i < 46; i++) star(c, random() * w, random() * h, 5 + random() * 11); }
      if (a.canvas === 'plain-ochre') { c.strokeStyle = 'rgba(70,50,25,0.6)'; c.lineWidth = 3; for (let i = 0; i < TILE * 2; i++) { c.beginPath(); c.moveTo(i * sw, 0); c.lineTo(i * sw, h); c.stroke(); } }
      // Weather stains climbing from the hem, patches and, when derelict, holes.
      const grime = c.createLinearGradient(0, h, 0, h * 0.5);
      grime.addColorStop(0, `rgba(70,60,45,${0.15 + wearAll * 0.4})`);
      grime.addColorStop(1, 'rgba(70,60,45,0)');
      c.fillStyle = grime; c.fillRect(0, 0, w, h);
      for (let i = 0; i < wearAll * 18; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(200,190,165,0.75)' : 'rgba(110,100,85,0.6)';
        const x = random() * w, y = random() * h, pw = 18 + random() * 40, ph = 14 + random() * 34;
        c.fillRect(x, y, pw, ph);
        c.strokeStyle = 'rgba(40,30,20,0.6)'; c.lineWidth = 1.5; c.setLineDash([4, 3]); c.strokeRect(x + 2, y + 2, pw - 4, ph - 4); c.setLineDash([]);
      }
      if (a.moment === 'abandoned') {
        c.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < 6; i++) {
          const x = random() * w, y = random() * h * 0.8;
          c.beginPath();
          for (let k = 0; k < 11; k++) { const an = (k / 11) * 7, r = (k % 2 ? 12 : 30) + random() * 22; c.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r * 1.4); }
          c.fill();
        }
        c.globalCompositeOperation = 'source-over';
      }
    });
    clothMap.repeat.set(PAIRS / TILE, 1);
    const lightThrough = day ? 0.35 : a.moment === 'showtime' ? 0.16 : 0.04;
    const cloth = new THREE.MeshStandardMaterial({ map: clothMap, side: THREE.DoubleSide, roughness: 0.95, alphaTest: 0.5, color: shade('#ffffff', 0.7), emissive: '#fff2d0', emissiveMap: clothMap, emissiveIntensity: lightThrough });
    const A0 = deg(-14), A1 = deg(194);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(RT, RT, WH, 64, 1, true, A0 + Math.PI / 2, A1 - A0), cloth);
    wall.position.y = WH / 2;
    wall.receiveShadow = true;
    t.root.add(wall);
    const N = 64, ROWS = 5;
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    const roofPoint = (i: number, j: number): P3 => {
      const angle = mix(A0, A1, i / N), s = j / ROWS;
      const wx = Math.cos(angle) * RT, wz = -Math.sin(angle) * RT;
      const rx = THREE.MathUtils.clamp(wx * 0.55, -PX, PX);
      const scallop = j === 0 ? 0 : Math.sin(s * Math.PI) * (0.5 + 0.12 * Math.cos((i / N) * PAIRS * Math.PI * 2));
      return [mix(wx, rx, s), mix(WH, PH - 0.2, s) - scallop, mix(wz, PZ, s)];
    };
    for (let j = 0; j <= ROWS; j++) for (let i = 0; i <= N; i++) { positions.push(...roofPoint(i, j)); uvs.push(i / N, 1 - j / ROWS); }
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < N; i++) { const p = j * (N + 1) + i; index.push(p, p + 1, p + N + 1, p + 1, p + N + 2, p + N + 1); }
    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roofGeo.setIndex(index);
    roofGeo.computeVertexNormals();
    const roof = new THREE.Mesh(roofGeo, cloth);
    roof.receiveShadow = true;
    t.root.add(roof);
    // Valance at the eaves and the side poles that carry it.
    const poleWood = t.material(shade('#e9e1cc').getHex(), { roughness: 0.7 });
    const poleRed = t.material(shade(hueA).getHex(), { roughness: 0.7 });
    const eave = t.ring(RT - 0.02, 0.06, [0, WH, 0], t.material(shade(hueA).getHex()), A1 - A0);
    eave.rotation.set(-Math.PI / 2, 0, A0);
    for (let i = 0; i <= 12; i++) {
      const at = polar(RT - 0.08, mix(A0, A1, i / 12));
      t.cylinder(0.05, 0.05, WH, [at[0], WH / 2, at[2]], i % 2 ? poleWood : poleRed, 8);
    }
    for (const angle of [deg(18), deg(56), deg(124), deg(162)]) {
      const i = Math.round(((angle - A0) / (A1 - A0)) * N);
      const top = roofPoint(i, 2);
      t.rod([top[0] * 1.02, 0, top[2] * 1.02], top, 0.055, poleWood);
    }

    // King poles with bale rings, flags and the cable between them.
    const kingMap = paint(32, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#efe6d2' : hueA; c.fillRect(0, (i * h) / 8, w, h / 8 + 1); } });
    const kingPaint = new THREE.MeshStandardMaterial({ map: kingMap, roughness: 0.6, color: shade('#ffffff', 0.5) });
    const flags: THREE.Mesh[] = [];
    for (const x of [-PX, PX]) {
      t.cylinder(0.1, 0.13, PH + 0.9, [x, (PH + 0.9) / 2, PZ], kingPaint, 14);
      t.cylinder(0.3, 0.34, 0.1, [x, 0.05, PZ], t.material('#3a3a3e', { metalness: 0.5 }), 14);
      t.ring(0.3, 0.035, [x, PH - 0.35, PZ], gilt).rotation.x = Math.PI / 2;
      t.ball([0.11, 0.11, 0.11], [x, PH + 0.95, PZ], gilt, 10);
      const flagGeo = new THREE.BufferGeometry();
      flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.5, 0, 1.0, -0.25, 0], 3));
      flagGeo.computeVertexNormals();
      const flag = t.mesh(flagGeo, new THREE.MeshStandardMaterial({ color: x < 0 ? hueA : '#e9b930', side: THREE.DoubleSide, roughness: 0.8 }), [x, PH + 0.82, PZ]);
      flag.rotation.y = random() * 0.8;
      flags.push(flag);
      for (const [gx, gz] of [[Math.sign(x) * 2.6, 2.4], [Math.sign(x) * 3.2, -1.4]] as const) t.rod([x, PH - 0.4, PZ], [x + gx, 0, PZ + gz], 0.018, t.material('#bfae84'));
    }
    const CABLE = PH - 0.55;
    const rope = t.material('#cdbb8e', { roughness: 0.95 });
    const steel = t.material('#3a3c42', { metalness: 0.6, roughness: 0.45 });
    t.rod([-PX, CABLE, PZ], [PX, CABLE, PZ], 0.03, steel);

    // What hangs in the rigging.
    const swingers: { group: THREE.Object3D; amp: number; rate: number; phase: number; axis: 'x' | 'z' }[] = [];
    const bulbGlow = dark && a.moment === 'struck' ? 0.25 : mix(0.9, 2.4, mood.cheer) * (a.moment === 'abandoned' ? 0 : a.moment === 'rehearsal' ? 0.25 : 1);
    const bulbHues = ['#ffd27a', '#ff7a6a', '#7ac4ff', '#9be08a', '#ffb0d8'];
    const hang = (x: number, drop: number, build: (g: Sculpture) => void, amp = 0.05) => {
      const g = new Sculpture(context);
      g.rod([0, 0, 0], [0, -drop, 0], 0.016, rope);
      build(g);
      g.root.position.set(x, CABLE, PZ);
      t.root.add(g.root);
      swingers.push({ group: g.root, amp: amp * mix(0.3, 1.6, mood.energy), rate: Math.sqrt(9.8 / Math.max(drop, 0.5)), phase: random() * 6, axis: 'x' });
      g.root.rotation.x = Math.sin(swingers[swingers.length - 1].phase) * swingers[swingers.length - 1].amp;
    };
    if (a.rigging === 'trapeze') {
      for (const [x, drop] of [[-1.7, 2.0], [1.9, 1.5]] as const) hang(x, 0, (g) => {
        g.rod([-0.5, -drop, 0], [0.5, -drop, 0], 0.04, steel);
        for (const dx of [-0.5, 0.5]) { g.rod([dx * 0.8, 0, 0], [dx, -drop, 0], 0.024, rope); g.rod([dx * 0.94, -drop + 0.6, 0], [dx, -drop, 0], 0.04, t.material('#c5222b')); }
      }, 0.16);
    } else if (a.rigging === 'lamps') {
      const n = 5 + Math.floor(mood.density * 3);
      for (let i = 0; i < n; i++) {
        const drop = 0.8 + random() * 1.5;
        hang(-2.5 + (i / (n - 1)) * 5 + (random() - 0.5) * 0.3, drop, (g) => {
          g.mesh(new THREE.ConeGeometry(0.32, 0.22, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#2f5a4a', side: THREE.DoubleSide, roughness: 0.4 }), [0, -drop, 0]);
          g.ball([0.1, 0.12, 0.1], [0, -drop - 0.1, 0], new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd27a', emissiveIntensity: bulbGlow }), 10);
        }, 0.04);
      }
    } else if (a.rigging === 'hoop') {
      hang(-1.8, 1.4, (g) => { g.ring(0.5, 0.03, [0, -1.9, 0], steel); });
      const silkHue = a.canvas === 'blue-yellow' ? '#e9c445' : '#b3182c';
      for (const x of [1.4, 2.0]) hang(x, 0.2, (g) => {
        const geo = new THREE.PlaneGeometry(0.34, 3.4, 4, 12);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getY(i) * 2.2 + x) * 0.08 + Math.sin(pos.getX(i) * 16) * 0.03);
        geo.computeVertexNormals();
        g.mesh(geo, new THREE.MeshStandardMaterial({ color: silkHue, side: THREE.DoubleSide, roughness: 0.5 }), [0, -1.9, 0]);
      }, 0.03);
    } else if (a.rigging === 'garlands') {
      const pts: { at: P3; size: number; color: string }[] = [];
      const swag = (from: P3, to: P3, sag: number) => {
        const pathPts: P3[] = [];
        for (let i = 0; i <= 12; i++) { const s = i / 12; const p: P3 = [mix(from[0], to[0], s), mix(from[1], to[1], s) - Math.sin(s * Math.PI) * sag, mix(from[2], to[2], s)]; pathPts.push(p); if (i && i < 12) pts.push({ at: [p[0], p[1] - 0.09, p[2]], size: 1, color: bulbHues[Math.floor(random() * bulbHues.length)] }); }
        t.tube(pathPts, 0.012, steel).castShadow = false;
      };
      swag([-PX, CABLE, PZ], [PX, CABLE, PZ], 1.1);
      for (const x of [-1, 1]) {
        swag([x * PX, CABLE, PZ], polar(RT - 0.2, x > 0 ? deg(8) : deg(172), WH), 0.9);
        swag([x * PX, CABLE, PZ], polar(RT - 0.2, x > 0 ? deg(58) : deg(122), WH), 0.8);
      }
      const bulbs = t.scatter(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ emissive: '#ffffff', emissiveIntensity: bulbGlow * 0.35, roughness: 0.4 }), pts);
      bulbs.castShadow = false;
    } else {
      hang(-1.5, 2.6, (g) => { g.ring(0.2, 0.05, [0.2, -2.6, 0], rope).rotation.y = 0.4; }, 0.03);
      hang(2.0, 1.2, (g) => { for (let i = 0; i < 4; i++) g.ring(0.26, 0.03, [0, -1.3 - i * 0.05, 0], rope).rotation.x = Math.PI / 2 + i * 0.1; }, 0.02);
    }

    // The spotlight: a lamp on the cable, a faint beam, and a real pool of light.
    if (spotOn) {
      const [hx, hz] = heroLocal;
      const lampAt = new THREE.Vector3(1.0, CABLE - 0.25, PZ + 0.2);
      const can = t.cylinder(0.16, 0.22, 0.42, lampAt.toArray() as P3, steel, 14);
      const aim = new THREE.Vector3(hx, 0, hz).sub(lampAt);
      can.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim.clone().normalize());
      const lens = t.ball([0.17, 0.17, 0.17], lampAt.clone().addScaledVector(aim.clone().normalize(), 0.2).toArray() as P3, new THREE.MeshStandardMaterial({ color: spotHue, emissive: spotHue, emissiveIntensity: 2 }), 10);
      lens.castShadow = false;
      const length = aim.length();
      const beamGeo = new THREE.CylinderGeometry(0.2, 2.3, length, 28, 1, true);
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: spotHue, transparent: true, opacity: dark ? 0.1 : 0.05, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.copy(lampAt).addScaledVector(aim, 0.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), aim.clone().normalize());
      t.root.add(beam);
      const spot = new THREE.SpotLight(spotHue, dark ? 3.2 : 1.6, 0, 0.33, 0.55, 0);
      spot.position.copy(lampAt);
      spot.target.position.set(hx, 0.8, hz);
      t.root.add(spot, spot.target);
    }

    // Benches: stepped tiers either side of the entrance, darker the higher they climb.
    const TIERS = 4;
    const struck = a.moment === 'struck';
    const banks: [number, number][] = struck ? [[deg(112), deg(190)]] : [[deg(-10), deg(68)], [deg(112), deg(190)]];
    const seats: { at: P3; tier: number }[] = [];
    for (const [b0, b1] of banks) for (let i = 0; i < TIERS; i++) {
      const r0 = 4.95 + i * 0.56, top = 0.38 + i * 0.36;
      const fade = i / (TIERS - 1);
      arcSlab(r0, r0 + 0.56, b0, b1, 0, top, t.material(shade('#6a4a30', 0.6 + fade).getHex(), { roughness: 0.9 }), 18);
      arcSlab(r0 + 0.04, r0 + 0.4, b0 + 0.01, b1 - 0.01, top, 0.05, t.material(shade(i % 2 ? '#b98a54' : hueA, 0.5 + fade).getHex(), { roughness: 0.8 }), 18);
      const count = Math.floor(((b1 - b0) * r0) / 0.5);
      for (let k = 0; k < count; k++) seats.push({ at: polar(r0 + 0.24, mix(b0 + 0.04, b1 - 0.04, (k + 0.5) / count), top + 0.05), tier: i });
    }
    if (struck) {
      // The other bank is already down: planks stacked, trestles folded, a canvas bundle roped up.
      const plank = t.material(shade('#a37a4a').getHex());
      for (let i = 0; i < 9; i++) { const b = t.box([3.2, 0.06, 0.3], [5.6 + (random() - 0.5) * 0.2, 0.05 + i * 0.065, -2.2 + (random() - 0.5) * 0.1], plank); b.rotation.y = 1.15 + (random() - 0.5) * 0.06; }
      for (let i = 0; i < 4; i++) { const tr = t.box([0.08, 1.2, 0.9], [5.2 + i * 0.16, 0.5, -4.6], plank); tr.rotation.z = 0.25; tr.rotation.y = 0.9; }
      const bundle = t.cylinder(0.42, 0.42, 2.4, [5.9, 0.42, 0.9], t.material(shade(hueB).getHex(), { roughness: 1 }), 12);
      bundle.rotation.set(Math.PI / 2, 0, 0.3);
      for (const off of [-0.7, 0, 0.7]) { const band = t.ring(0.43, 0.025, [5.9 - Math.sin(0.3) * off * 0, 0.42, 0.9 + off], rope); band.rotation.y = 0; band.position.x += off * 0.3; }
      const lampPost: P3 = [4.9, 0, 1.9];
      t.cylinder(0.03, 0.03, 2.1, [lampPost[0], 1.05, lampPost[2]], steel, 8);
      t.cylinder(0.25, 0.3, 0.05, [lampPost[0], 0.025, lampPost[2]], steel, 12);
      t.ball([0.13, 0.16, 0.13], [lampPost[0], 2.2, lampPost[2]], new THREE.MeshStandardMaterial({ color: '#fff3c8', emissive: '#ffd27a', emissiveIntensity: 2.4 }), 10).castShadow = false;
      const work = new THREE.PointLight('#ffd9a0', 1.4, 0, 0);
      work.position.set(lampPost[0], 2.2, lampPost[2]);
      t.root.add(work);
    }

    // The crowd: dim seated shapes, more of them the fuller the night.
    const crowd = a.moment === 'showtime' ? mix(0.6, 0.98, mood.density) : a.moment === 'hush' ? mix(0.12, 0.8, mood.density) : 0;
    if (crowd > 0) {
      const bodies: { at: P3; size: number; color: string }[] = [], heads: { at: P3; size: number; color: string }[] = [];
      const coats = ['#5a4a58', '#3f4a5e', '#6a4038', '#4a5a48', '#7a6a50', '#8a3a3a', '#44405a'];
      for (const seat of seats) {
        if (random() > crowd) continue;
        const size = 0.85 + random() * 0.3;
        const fade = 0.5 + seat.tier / TIERS;
        bodies.push({ at: [seat.at[0], seat.at[1] + 0.3 * size, seat.at[2]], size, color: `#${shade(coats[Math.floor(random() * coats.length)], fade).getHexString()}` });
        heads.push({ at: [seat.at[0], seat.at[1] + 0.72 * size, seat.at[2]], size, color: `#${shade(random() < 0.5 ? '#c9a58a' : '#8a6a58', fade).getHexString()}` });
      }
      if (bodies.length) {
        t.scatter(new THREE.CapsuleGeometry(0.17, 0.3, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.95 }), bodies);
        t.scatter(new THREE.SphereGeometry(0.115, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), heads);
      }
    }

    // The artists' entrance: gilt portal, lettered pelmet, velvet curtains and a carpet run to the ring.
    const EZ = -RT + 0.95, EW = 3.0, EH = 2.7;
    const parted = a.curtain !== 'red-closed';
    const velvetHue = { 'red-velvet': '#8f1823', 'red-closed': '#8f1823', 'blue-stars': '#1c2760', 'green-patched': '#3f6a4a', 'gold-lame': '#d6aa3c' }[a.curtain];
    const curtainMap = paint(256, 512, (c, w, h) => {
      c.fillStyle = velvetHue; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 12; i++) { const g = c.createLinearGradient((i * w) / 12, 0, ((i + 1) * w) / 12, 0); g.addColorStop(0, 'rgba(0,0,0,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.28)'); c.fillStyle = g; c.fillRect((i * w) / 12, 0, w / 12, h); }
      if (a.curtain === 'blue-stars') { c.fillStyle = '#e9d68a'; for (let i = 0; i < 30; i++) star(c, random() * w, random() * h, 5 + random() * 9); }
      if (a.curtain === 'green-patched') for (let i = 0; i < 7; i++) { c.fillStyle = ['#6a7a4a', '#4a5a6a', '#7a5a4a'][i % 3]; c.fillRect(random() * w * 0.8, random() * h * 0.9, 30 + random() * 30, 26 + random() * 30); }
      if (a.curtain === 'gold-lame') { c.fillStyle = 'rgba(255,250,210,0.8)'; for (let i = 0; i < 500; i++) c.fillRect(random() * w, random() * h, 2, 2); }
      c.fillStyle = a.curtain === 'gold-lame' ? '#8f1823' : '#dcae3a';
      c.fillRect(0, h - 34, w, 12);
      for (let i = 0; i < 40; i++) c.fillRect((i * w) / 40, h - 22, w / 80, 22);
    });
    curtainMap.wrapS = curtainMap.wrapT = THREE.ClampToEdgeWrapping;
    const velvet = new THREE.MeshStandardMaterial({ map: curtainMap, side: THREE.DoubleSide, roughness: a.curtain === 'gold-lame' ? 0.35 : 0.9, metalness: a.curtain === 'gold-lame' ? 0.5 : 0, color: shade('#ffffff', 0.4), emissive: a.curtain === 'gold-lame' ? '#d6aa3c' : '#000000', emissiveIntensity: 0.25 });
    for (const side of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(EW / 2, EH, 18, 10);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const u = x / (EW / 2) + 0.5, v = y / EH + 0.5;
        // Parted curtains are gathered to a tie-back two fifths of the way up.
        const pinch = parted ? mix(1, 0.34, Math.exp(-((v - 0.42) ** 2) / 0.05)) * mix(0.72, 1, v) : 1;
        const inner = side > 0 ? u : 1 - u;
        const nx = side * (EW / 2 - (1 - inner) * (EW / 2) * pinch);
        pos.setXYZ(i, nx, y + (parted ? 0 : (random() - 0.5) * 0.01), Math.sin(u * 30) * 0.09 + 0.03);
      }
      geo.computeVertexNormals();
      t.mesh(geo, velvet, [0, EH / 2, EZ]);
      if (parted) t.ring(0.16, 0.035, [side * (EW / 2 - 0.3), EH * 0.42, EZ + 0.05], gilt).rotation.y = Math.PI / 2;
    }
    t.box([EW + 0.3, EH, 0.1], [0, EH / 2, EZ - 0.3], t.material(a.curtain === 'gold-lame' && !day ? '#5a3a1a' : '#17141a', { roughness: 1 }));
    for (const side of [-1, 1]) {
      t.cylinder(0.11, 0.13, EH, [side * (EW / 2 + 0.12), EH / 2, EZ + 0.02], gilt, 12);
      
    }
    const bannerText = BANNERS[a.banner];
    const bannerMap = paint(512, 128, (c, w, h) => {
      c.fillStyle = hueA === '#1f2a5e' ? '#1f2a5e' : '#7a1420'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e9b930'; c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#f1cf5a'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `bold ${Math.min(88, (w * 1.5) / bannerText.length)}px Georgia, serif`;
      c.fillText(bannerText, w / 2, h / 2 + 4, w - 50);
      for (let i = 0; i < wearAll * 40; i++) { c.fillStyle = 'rgba(60,45,35,0.5)'; c.fillRect(random() * w, random() * h, 3 + random() * 14, 2 + random() * 6); }
    });
    bannerMap.wrapS = bannerMap.wrapT = THREE.ClampToEdgeWrapping;
    const pelmet = t.mesh(new THREE.BoxGeometry(EW + 0.7, 0.62, 0.16), [gilt, gilt, gilt, gilt, new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.7, emissive: '#ffffff', emissiveMap: bannerMap, emissiveIntensity: dark ? 0.25 : 0.05 }), gilt] as unknown as THREE.Material, [0, EH + 0.31, EZ + 0.1]);
    pelmet.castShadow = false;
    const pelmetBulbs: { at: P3; size: number }[] = [];
    for (let i = 0; i < 13; i++) pelmetBulbs.push({ at: [-(EW + 0.6) / 2 + (i / 12) * (EW + 0.6), EH + 0.68 + Math.sin((i / 12) * Math.PI) * 0.16, EZ + 0.12], size: 1 });
    t.scatter(new THREE.SphereGeometry(0.075, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffc85a', emissiveIntensity: bulbGlow }), pelmetBulbs).castShadow = false;
    const runner = t.box([1.7, 0.02, RT - RING - 0.5], [0, 0.012, -(RT + RING) / 2 + 0.2], t.material(shade(a.curtain === 'blue-stars' ? '#1c2760' : '#8f1823', 0.4).getHex(), { roughness: 1 }));
    runner.castShadow = false;
    // Ring doors: two low painted gates standing open at the back of the curb.
    for (const side of [-1, 1]) {
      const gate = t.box([0.06, 0.5, 0.8], [side * 0.5, 0.27, -RING - 0.5], curbMats[0]);
      gate.rotation.y = side * 0.35;
    }

    // Bunting from the king poles down to the eaves, on show nights.
    const pennants: THREE.InstancedMesh[] = [];
    if (a.moment === 'showtime' || (a.moment === 'hush' && mood.cheer > 0.45) || (a.moment === 'struck' && mood.density > 0.6)) {
      const pts: { at: P3; size: number; color: string }[] = [];
      const hues = [hueA, '#e9b930', '#efe6d2', '#2f7a9a', '#c5222b'];
      const lines: [P3, P3][] = [];
      for (const x of [-1, 1]) for (const d of [x > 0 ? 30 : 150, x > 0 ? -6 : 186, 90 + x * -22]) lines.push([[x * PX, PH - 0.9, PZ], polar(RT - 0.3, deg(d), WH - 0.1)]);
      for (const [from, to] of lines) for (let i = 1; i < 14; i++) {
        const s = i / 14;
        pts.push({ at: [mix(from[0], to[0], s), mix(from[1], to[1], s) - Math.sin(s * Math.PI) * 0.7 - 0.16, mix(from[2], to[2], s)], size: 1, color: hues[Math.floor(random() * hues.length)] });
      }
      const tri = new THREE.ConeGeometry(0.13, 0.34, 3);
      tri.rotateX(Math.PI);
      const mesh = t.scatter(tri, new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), pts);
      mesh.castShadow = false;
      pennants.push(mesh);
    }

    // Things left lying in the ring, kept clear of the standing spots.
    if (a.left === 'juggling') {
      const hues = ['#c5222b', '#f2c230', '#1f6fb0', '#2f8a56', '#f1ece0'];
      for (let i = 0; i < 4 + Math.floor(mood.density * 4); i++) {
        const an = random() * 7, r = 3.0 + random() * 0.8;
        const g = new Sculpture(context);
        g.lathe([[0.001, 0], [0.03, 0.01], [0.02, 0.22], [0.06, 0.36], [0.065, 0.46], [0.03, 0.54], [0.001, 0.55]], t.material(hues[i % hues.length]));
        g.root.position.set(Math.cos(an) * r, 0.07, Math.sin(an) * r);
        g.root.rotation.set(Math.PI / 2, 0, random() * 6);
        g.root.scale.setScalar(1.5);
        t.root.add(g.root);
        t.ball([0.11, 0.11, 0.11], [Math.cos(an + 0.3) * (r - 0.3), 0.12, Math.sin(an + 0.3) * (r - 0.3)], t.material(hues[(i + 2) % hues.length]), 10);
      }
    } else if (a.left === 'hoofprints') {
      const at = polar(3.3, deg(-50), 0.04);
      const plume = t.tube([at, [at[0] + 0.2, 0.12, at[2] + 0.12], [at[0] + 0.5, 0.06, at[2] + 0.1]], 0.05, t.material('#f1ece0', { roughness: 1 }));
      plume.scale.y = 1;
      t.ball([0.12, 0.05, 0.08], [at[0] + 0.5, 0.06, at[2] + 0.1], t.material('#c5222b', { roughness: 1 }), 8);
    } else if (a.left === 'balloon') {
      const at = polar(3.2, deg(-128), 0);
      const sad = mood.cheer < 0.5;
      t.rod([at[0], 0.02, at[2]], [at[0] + 0.1, sad ? 0.5 : 1.7, at[2]], 0.008, t.material('#f1ece0'));
      t.ball([0.2, 0.24, 0.2], [at[0] + 0.1, sad ? 0.7 : 1.92, at[2]], t.material(sad ? '#5a7fb8' : '#d3262c', { roughness: 0.25 }), 14);
      t.ball([0.07, 0.045, 0.13], [at[0] + 0.6, 0.045, at[2] + 0.25], t.material('#7a3a2a'), 8).rotation.y = 0.8;
    }
    if (a.moment === 'abandoned') {
      const blade = new THREE.ConeGeometry(0.035, 0.55, 4);
      blade.translate(0, 0.27, 0);
      const pts: { at: P3; size: number; color: string }[] = [];
      for (let i = 0; i < 260; i++) {
        const an = random() * 7, r = random() < 0.6 ? RING - random() * 0.8 : RING + CURB + random() * (GROUND - RING - 0.6);
        if (r < 3.4) continue;
        pts.push({ at: [Math.cos(an) * r, 0, Math.sin(an) * r], size: 0.5 + random() * 1.2, color: random() < 0.6 ? '#6f8a44' : '#a8a45e' });
      }
      t.scatter(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), pts).castShadow = false;
      // Shafts of daylight through the torn roof.
      for (let i = 0; i < 3; i++) {
        const x = -3 + i * 2.6 + random(), z = -1.5 + random() * 2.5;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.7, 7, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6d8', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
        shaft.position.set(x + 1.2, 3.5, z);
        shaft.rotation.z = 0.35;
        t.root.add(shaft);
      }
    }

    // The hung platform that carries a fourth member of the cast up in the rigging.
    const perch = new Sculpture(context);
    perch.cylinder(1.0, 1.0, 0.08, [0, -0.04, 0], t.material(shade(hueA, 0.3).getHex()), 28);
    perch.ring(1.0, 0.035, [0, 0, 0], gilt).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const an = (i / 3) * Math.PI * 2 + 0.5; perch.rod([Math.cos(an) * 0.95, 0, Math.sin(an) * 0.95], [0, CABLE - HANG[2], 0], 0.02, rope); }
    perch.root.position.set(-0.1, HANG[2], PZ);
    perch.root.visible = false;
    t.root.add(perch.root);

    const placeCast = world.place;
    world.place = (items: readonly Placeable[]) => {
      perch.root.visible = items.length > 3;
      placeCast(items);
      // The round set fills less of the frame than its bounding box suggests: close in on it.
      const camera = world.camera as THREE.OrthographicCamera;
      const zoom = 0.8;
      camera.left *= zoom; camera.right *= zoom; camera.top *= zoom; camera.bottom *= zoom;
      camera.updateProjectionMatrix();
    };
    const lively = mix(0.2, 1.5, mood.energy);
    world.update = (_dt, time) => {
      for (const sw of swingers) sw.group.rotation.x = Math.sin(time * sw.rate * 0.6 + sw.phase) * sw.amp;
      flags.forEach((flag, i) => { flag.rotation.y = 0.4 + Math.sin(time * lively * 2 + i) * 0.5; });
    };
    return world;
  },
});
