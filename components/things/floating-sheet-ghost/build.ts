import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const RH = 0.135, YH = 0.92, ALPHA_MAX = 1.95, HEAD_T = 0.25, HEM_R = 0.3, HEM_Y = 0.15;
const NU = 112, NV = 60, SIZE = 1024;
const bell = (x: number) => Math.exp(-x * x);
const smooth = (x: number) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

interface Arm { phi: number; reach: number; y: number; s: number; spread: number }

export default defineThing({
  questions: {
    face: choice('What is its face?', {
      'cut-holes': 'Two eye holes cut out with scissors, black and empty behind.',
      hollows: 'Soft dark hollows for eyes and a long drooping mouth, the classic ghost.',
      crayon: 'A face drawn on in crayon by a child: round eyes and a big wobbly smile.',
      pressing: 'No holes at all: a real face pressing through the cloth from inside, nose, brow and open mouth.',
      blank: 'No face. Just the shape of a head under a sheet.',
    }),
    sheet: choice('What kind of sheet is it?', {
      plain: 'Plain white cotton.',
      ducks: 'A cot sheet printed with faded yellow ducks.',
      lace: 'Fine linen with a deep lace edge.',
      scorched: 'Scorched: the hem burnt brown and black and eaten into holes.',
      ticking: 'Blue-striped mattress ticking.',
      stars: 'A pale blue nursery sheet scattered with stars and moons.',
    }),
    pose: choice('What is the mood of its pose?', {
      shy: 'Shy: head down, hands clasped in front, half turned away.',
      'carry-me': 'Both arms raised up, asking to be carried.',
      looming: 'Looming: stretched tall, arms high and wide, leaning over you.',
      boo: 'Hands up beside its face in the middle of peek-a-boo.',
      pointing: 'One arm out straight, pointing at something behind you.',
      still: 'Hanging perfectly still, arms at its sides, just watching.',
    }),
    carries: choice('What does it hold or trail?', {
      nothing: 'Nothing but the corner of its own sheet.',
      teddy: 'A teddy bear dangling from one hand by its arm.',
      balloon: 'A balloon on a string.',
      candle: 'A lit candle in a brass chamberstick.',
      'pull-toy': 'A wooden duck on wheels, pulled along the floor on a string.',
    }),
    feet: choice('What shows beneath the hem?', {
      nothing: 'Nothing: empty air.',
      bare: 'Two small bare feet, hanging limp above the floor.',
      boots: 'A pair of little buttoned boots.',
      dripping: 'Nothing but slow drips falling into a small puddle.',
    }),
    size: choice('How big is it?', {
      toddler: 'Toddler-small and round.',
      child: 'The height of a six-year-old.',
      lanky: 'Stretched and thin, taller than a child should be.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const folds = 7 + Math.floor(random() * 4), depth = mix(0.09, 0.15, random());
    const p1 = random() * 6, p2 = random() * 6, p3 = random() * 6;

    const poseArms: Record<typeof a.pose, Arm[]> = {
      shy: [{ phi: 0.3, reach: 0.07, y: 0.5, s: 0.45, spread: 0.3 }, { phi: -0.3, reach: 0.07, y: 0.5, s: 0.45, spread: 0.3 }],
      'carry-me': [{ phi: 0.75, reach: 0.25, y: 1.0, s: 0.42, spread: 0.3 }, { phi: -0.75, reach: 0.25, y: 1.0, s: 0.42, spread: 0.3 }],
      looming: [{ phi: 1.05, reach: 0.34, y: 1.08, s: 0.45, spread: 0.32 }, { phi: -1.05, reach: 0.34, y: 1.08, s: 0.45, spread: 0.32 }],
      boo: [{ phi: 0.95, reach: 0.1, y: 0.94, s: 0.3, spread: 0.26 }, { phi: -0.95, reach: 0.1, y: 0.94, s: 0.3, spread: 0.26 }],
      pointing: [{ phi: 0.6, reach: 0.52, y: 0.8, s: 0.45, spread: 0.19 }],
      still: [],
    };
    const arms = poseArms[a.pose].slice();
    // Whatever it carries needs a hand of its own unless a posed hand is already free and low.
    const carryArm: Arm | null = a.carries === 'nothing' ? null : { phi: -1.25, reach: a.carries === 'candle' ? 0.2 : 0.13, y: a.carries === 'candle' ? 0.62 : 0.52, s: 0.45, spread: 0.24 };
    if (carryArm) {
      const clash = arms.findIndex((arm) => arm.phi < 0);
      if (clash >= 0) arms.splice(clash, 1);
      arms.push(carryArm);
    }

    const relief = (phi: number, alpha: number) =>
      a.face !== 'pressing' ? 0
        : 0.055 * bell(phi / 0.15) * bell((alpha - 1.4) / 0.2)
          - 0.03 * (bell((phi - 0.36) / 0.17) + bell((phi + 0.36) / 0.17)) * bell((alpha - 1.17) / 0.15)
          - 0.04 * bell(phi / 0.2) * bell((alpha - 1.7) / 0.1)
          + 0.018 * bell(phi / 0.55) * bell((alpha - 0.98) / 0.09)
          + 0.014 * bell(phi / 0.25) * bell((alpha - 1.9) / 0.07);
    const neckR = RH * Math.sin(ALPHA_MAX), neckY = YH + RH * Math.cos(ALPHA_MAX);
    const hemAt = (phi: number) => HEM_Y + 0.03 * Math.sin(folds * phi + p1 + 1) + 0.022 * Math.sin(3 * phi + p3);
    const baseRadius = (phi: number, t: number) => {
      const body = mix(neckR, HEM_R, Math.pow(t, 0.75)) - 0.018 * bell((t - 0.03) / 0.04);
      return body * (1 + 0.32 * Math.sin(phi) ** 2 * smooth(t / 0.2) * (1 - 0.5 * t));
    };
    const point = (u: number, v: number) => {
      const phi = (u - 0.5) * Math.PI * 2;
      if (v <= HEAD_T) {
        const alpha = v / HEAD_T * ALPHA_MAX, lift = RH + relief(phi, alpha);
        const r = lift * Math.sin(alpha);
        return new THREE.Vector3(r * Math.sin(phi), YH + lift * Math.cos(alpha), r * Math.cos(phi));
      }
      const t = (v - HEAD_T) / (1 - HEAD_T);
      let r = baseRadius(phi, t) * (1 + Math.pow(t, 1.2) * (depth * Math.sin(folds * phi + p1) + depth * 0.4 * Math.sin((folds * 2 + 1) * phi + p2)));
      let y = neckY - (neckY - hemAt(phi)) * t;
      // One corner at the back drags on the floor.
      const tail = bell((Math.abs(phi) - Math.PI) / 0.5);
      y -= tail * t * t * hemAt(phi);
      r += tail * Math.pow(t, 2.5) * 0.3;
      for (const arm of arms) {
        const across = bell(wrap(phi - arm.phi) / arm.spread);
        r += across * arm.reach * (t < arm.s ? bell((t - arm.s) / 0.2) : bell((t - arm.s) / 0.5));
        const rest = neckY - (neckY - HEM_Y) * arm.s;
        y += across * (arm.y - rest) * (t < arm.s ? bell((t - arm.s) / 0.22) : bell((t - arm.s) / 0.75)) * (1 - tail);
      }
      const flat = mix(1, 0.84, smooth(t / 0.2));
      return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi) * flat);
    };
    const handOf = (arm: Arm) => {
      const r = baseRadius(arm.phi, arm.s) + arm.reach * 0.86;
      return new THREE.Vector3(r * Math.sin(arm.phi), arm.y - 0.02, r * Math.cos(arm.phi) * 0.84);
    };

    // ---- cloth geometry ---------------------------------------------------------------
    const positions: number[] = [], uvs: number[] = [], index: number[] = [];
    for (let j = 0; j <= NV; j++)
      for (let i = 0; i <= NU; i++) {
        const u = i / NU, v = j / NV;
        const at = point(u, v);
        positions.push(at.x, at.y, at.z);
        uvs.push(u, 1 - v);
      }
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NU; i++) {
        const k = j * (NU + 1) + i;
        index.push(k, k + NU + 1, k + 1, k + 1, k + NU + 1, k + NU + 2);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index);
    geometry.computeVertexNormals();
    const normal = geometry.attributes.normal;
    for (let j = 0; j <= NV; j++) {
      const first = j * (NU + 1), last = first + NU;
      const joined = new THREE.Vector3(normal.getX(first) + normal.getX(last), normal.getY(first) + normal.getY(last), normal.getZ(first) + normal.getZ(last)).normalize();
      normal.setXYZ(first, joined.x, joined.y, joined.z);
      normal.setXYZ(last, joined.x, joined.y, joined.z);
    }

    // ---- painted cloth ----------------------------------------------------------------
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const cloth = new THREE.Color(a.sheet === 'stars' ? '#b9cde8' : a.sheet === 'ticking' ? '#e9e6dc' : '#eef0f1')
      .lerp(new THREE.Color('#f3e6cf'), mood.warmth * 0.35)
      .lerp(new THREE.Color('#aaa69a'), mood.wear * 0.4);
    ctx.fillStyle = cloth.getStyle();
    ctx.fillRect(0, 0, SIZE, SIZE);
    const top = HEAD_T * SIZE;
    if (a.sheet === 'ticking') {
      ctx.fillStyle = 'rgba(52,84,128,0.8)';
      for (let x = 0; x < SIZE; x += 32) { ctx.fillRect(x, 0, 9, SIZE); ctx.fillRect(x + 13, 0, 2, SIZE); }
    }
    if (a.sheet === 'ducks') {
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 12; col++) {
          const x = (col + (row % 2) * 0.5) * (SIZE / 12) + 20, y = top + 60 + row * 96, flip = (row + col) % 2 ? -1 : 1;
          ctx.fillStyle = `rgba(226,180,40,${mix(0.5, 0.9, random())})`;
          ctx.beginPath(); ctx.ellipse(x, y, 24, 17, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.arc(x + flip * 19, y - 20, 13, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(222,110,40,0.8)';
          ctx.beginPath(); ctx.moveTo(x + flip * 30, y - 24); ctx.lineTo(x + flip * 44, y - 19); ctx.lineTo(x + flip * 30, y - 14); ctx.fill();
          ctx.fillStyle = '#26221c';
          ctx.beginPath(); ctx.arc(x + flip * 22, y - 23, 2.5, 0, 7); ctx.fill();
        }
    }
    if (a.sheet === 'stars') {
      for (let i = 0; i < 80; i++) {
        const x = random() * SIZE, y = mix(top * 1.1, SIZE, random()), r = mix(13, 26, random());
        ctx.fillStyle = random() < 0.6 ? 'rgba(226,176,40,0.95)' : 'rgba(44,62,120,0.85)';
        ctx.beginPath();
        if (random() < 0.25) { ctx.arc(x, y, r, 0.6, 5.2); ctx.arc(x + r * 0.45, y, r * 0.8, 4.6, 1.2, true); }
        else for (let k = 0; k < 10; k++) { const angle = k * Math.PI / 5, reach = k % 2 ? r * 0.42 : r; ctx.lineTo(x + Math.sin(angle) * reach, y - Math.cos(angle) * reach); }
        ctx.fill();
      }
    }
    // Soft shading down the folds so the drape reads even in flat light.
    for (let i = 0; i < folds * 2; i++) {
      const x = (((i + 0.25) / (folds * 2)) * SIZE + p1 * 9) % SIZE;
      const shade = ctx.createLinearGradient(x - 26, 0, x + 26, 0);
      shade.addColorStop(0, 'rgba(60,70,90,0)'); shade.addColorStop(0.5, 'rgba(60,70,90,0.13)'); shade.addColorStop(1, 'rgba(60,70,90,0)');
      ctx.fillStyle = shade;
      ctx.fillRect(x - 26, top + 80, 52, SIZE);
    }
    // Grime climbing from the hem.
    const grime = ctx.createLinearGradient(0, SIZE * 0.62, 0, SIZE);
    grime.addColorStop(0, 'rgba(84,76,60,0)'); grime.addColorStop(1, `rgba(84,76,60,${mix(0.05, 0.6, mood.wear)})`);
    ctx.fillStyle = grime;
    ctx.fillRect(0, SIZE * 0.62, SIZE, SIZE * 0.38);

    const cx = SIZE / 2, eyeY = (1.2 / ALPHA_MAX) * top, eyeDx = 60, mouthY = (1.66 / ALPHA_MAX) * top;
    const cuts: [number, number][][] = [];
    const oval = (x: number, y: number, rx: number, ry: number, rough: number) =>
      Array.from({ length: 14 }, (_unused, k) => [x + Math.cos(k / 14 * 6.283) * rx * mix(1 - rough, 1 + rough, random()), y + Math.sin(k / 14 * 6.283) * ry * mix(1 - rough, 1 + rough, random())] as [number, number]);
    if (a.face === 'cut-holes') {
      cuts.push(oval(cx - eyeDx, eyeY, 30, 36, 0.14), oval(cx + eyeDx, eyeY + (random() - 0.5) * 16, 30, 36, 0.14));
      if (mood.cheer > 0.6) cuts.push(oval(cx, mouthY + 14, 44, 13, 0.2));
    }
    if (a.face === 'hollows') {
      const hollow = (x: number, y: number, rx: number, ry: number) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, 'rgba(8,10,16,1)'); g.addColorStop(0.7, 'rgba(14,18,28,0.95)'); g.addColorStop(1, 'rgba(20,26,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore();
      };
      hollow(cx - eyeDx, eyeY, 38, 50); hollow(cx + eyeDx, eyeY, 38, 50);
      hollow(cx, mouthY + 34, mix(24, 44, mood.cheer), mix(66, 30, mood.cheer));
    }
    if (a.face === 'crayon') {
      const scribble = (colour: string, draw: (wobble: () => number) => void) => {
        ctx.strokeStyle = colour; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.globalAlpha = 0.75;
        for (let pass = 0; pass < 3; pass++) draw(() => (random() - 0.5) * 7);
        ctx.globalAlpha = 1;
      };
      for (const side of [-1, 1]) {
        scribble('#2a3f9a', (w) => { ctx.beginPath(); ctx.ellipse(cx + side * eyeDx + w(), eyeY + w(), 30 + w(), 34 + w(), 0, 0, 7); ctx.stroke(); });
        scribble('#16151c', (w) => { ctx.beginPath(); ctx.arc(cx + side * eyeDx + w() + 6, eyeY + w() + 6, 9, 0, 7); ctx.stroke(); });
        scribble('#d8747c', (w) => { ctx.beginPath(); ctx.arc(cx + side * 118 + w(), mouthY - 6 + w(), 16, 0, 7); ctx.stroke(); });
      }
      const grin = mix(-30, 46, mood.cheer);
      scribble('#c6262c', (w) => { ctx.beginPath(); ctx.moveTo(cx - 84 + w(), mouthY + w()); ctx.quadraticCurveTo(cx + w(), mouthY + grin * 2 + w(), cx + 84 + w(), mouthY + w()); ctx.stroke(); });
    }
    if (a.face === 'pressing') {
      const dent = (x: number, y: number, rx: number, ry: number, strength: number) => {
        ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        g.addColorStop(0, `rgba(40,48,66,${strength})`); g.addColorStop(1, 'rgba(40,48,66,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore();
      };
      dent(cx - eyeDx, eyeY - 4, 42, 36, 0.8); dent(cx + eyeDx, eyeY - 4, 42, 36, 0.8);
      dent(cx, (1.7 / ALPHA_MAX) * top, 44, 28, 0.95);
    }
    // Hem treatments that eat into the cloth.
    if (a.sheet === 'lace') {
      const band = SIZE * 0.84;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(0, band, SIZE, SIZE - band);
      ctx.strokeStyle = 'rgba(120,128,140,0.7)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, band); ctx.lineTo(SIZE, band); ctx.stroke();
      for (let x = 16; x < SIZE; x += 32) {
        cuts.push(oval(x, band + 40, 9, 9, 0), oval(x - 16, band + 76, 6, 6, 0), oval(x + 2, band + 106, 10, 13, 0));
        ctx.beginPath(); ctx.arc(x, band + 110, 22, 0, Math.PI); ctx.stroke();
        cuts.push([[x + 16 - 9, SIZE - 46], [x + 16, SIZE - 66], [x + 16 + 9, SIZE - 46], [x + 16 + 12, SIZE], [x + 16 - 12, SIZE]]);
      }
    }
    if (a.sheet === 'scorched') {
      const burn = ctx.createLinearGradient(0, SIZE * 0.66, 0, SIZE);
      burn.addColorStop(0, 'rgba(120,70,20,0)'); burn.addColorStop(0.45, 'rgba(120,70,20,0.75)'); burn.addColorStop(0.8, 'rgba(28,20,16,0.97)'); burn.addColorStop(1, 'rgba(8,8,8,1)');
      ctx.fillStyle = burn;
      ctx.fillRect(0, SIZE * 0.66, SIZE, SIZE * 0.34);
      for (let x = 0; x < SIZE; x += 28) {
        const bite = mix(20, 120, random());
        cuts.push([[x - 20, SIZE], [x - 8, SIZE - bite * 0.5], [x + 6, SIZE - bite], [x + 20, SIZE - bite * 0.4], [x + 34, SIZE]]);
      }
      for (let i = 0; i < 9; i++) {
        const x = random() * SIZE, y = mix(SIZE * 0.5, SIZE * 0.9, random()), r = mix(12, 34, random());
        const ring = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2);
        ring.addColorStop(0, 'rgba(20,14,10,0.95)'); ring.addColorStop(0.5, 'rgba(110,64,20,0.7)'); ring.addColorStop(1, 'rgba(110,64,20,0)');
        ctx.fillStyle = ring; ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
        cuts.push(oval(x, y, r, r * 1.2, 0.3));
      }
    }
    const trace = (points: [number, number][]) => { ctx.beginPath(); points.forEach((p, k) => (k ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath(); };
    if (a.face === 'cut-holes') { ctx.strokeStyle = 'rgba(90,96,108,0.9)'; ctx.lineWidth = 6; for (const cut of cuts.slice(0, 3)) { trace(cut); ctx.stroke(); } }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    for (const cut of cuts) { trace(cut); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const sheet = new THREE.MeshStandardMaterial({ map: texture, alphaTest: 0.5, roughness: 0.95, emissive: '#8fa6c4', emissiveIntensity: mix(0.1, 0.28, mood.energy) });
    const lining = new THREE.MeshStandardMaterial({ color: '#141922', roughness: 1, side: THREE.BackSide });

    const sizes = { toddler: [1.12, 0.74], child: [1, 1], lanky: [0.9, 1.3] }[a.size];
    const stretch = a.pose === 'looming' ? 1.16 : 1;
    const figure = new THREE.Group();
    figure.scale.set(sizes[0], sizes[1] * stretch, sizes[0]);
    s.root.add(figure);
    const drape = new THREE.Mesh(geometry, sheet);
    drape.castShadow = drape.receiveShadow = true;
    const inner = new THREE.Mesh(geometry, lining);
    figure.add(drape, inner);

    const add = (parent: THREE.Object3D, geometryOf: THREE.BufferGeometry, material: THREE.Material, at: THREE.Vector3 | [number, number, number], size: [number, number, number] = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometryOf, material);
      if (Array.isArray(at)) mesh.position.set(at[0], at[1], at[2]); else mesh.position.copy(at);
      mesh.scale.set(...size);
      mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const ball = new THREE.SphereGeometry(1, 16, 12);
    const line = (parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, material: THREE.Material, radius = 0.003) => {
      const mesh = add(parent, new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 5), material, from.clone().add(to).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    };

    // ---- feet -------------------------------------------------------------------------
    const still = new THREE.Group();
    s.root.add(still);
    if (a.feet === 'bare' || a.feet === 'boots') {
      const skin = new THREE.MeshStandardMaterial({ color: a.feet === 'bare' ? '#aab6c2' : '#17151a', roughness: a.feet === 'bare' ? 0.7 : 0.35 });
      for (const side of [-1, 1]) {
        const foot = new THREE.Group();
        foot.position.set(side * 0.06, HEM_Y - 0.075 + (side > 0 ? 0.012 : 0), 0.05);
        foot.rotation.set(0.5, side * 0.2, side * 0.08);
        figure.add(foot);
        add(foot, new THREE.CylinderGeometry(0.02, 0.024, 0.16, 10), skin, [0, 0.085, -0.02]);
        add(foot, ball, skin, [0, 0, 0.012], [0.026, 0.02, 0.05]);
        if (a.feet === 'boots') {
          add(foot, new THREE.CylinderGeometry(0.029, 0.027, 0.07, 10), skin, [0, 0.035, -0.02]);
          for (let k = 0; k < 3; k++) add(foot, ball, new THREE.MeshStandardMaterial({ color: '#c9b37a', metalness: 0.7, roughness: 0.3 }), [side * 0.028, 0.02 + k * 0.02, -0.02], [0.005, 0.005, 0.005]);
        } else for (let k = 0; k < 4; k++) add(foot, ball, skin, [(k - 1.5) * 0.011, 0.002, 0.058 - Math.abs(k - 1.5) * 0.005], [0.006, 0.006, 0.008]);
      }
    }
    if (a.feet === 'dripping') {
      const water = new THREE.MeshStandardMaterial({ color: '#5c7187', roughness: 0.08, metalness: 0.2 });
      const puddle = add(still, new THREE.CylinderGeometry(1, 1, 0.006, 28), water, [0.03, 0.003, 0.04], [mix(0.16, 0.26, random()), 1, mix(0.12, 0.2, random())]);
      puddle.castShadow = false;
      for (let k = 0; k < 6; k++) add(still, ball, water, [(random() - 0.5) * 0.3, mix(0.02, HEM_Y * sizes[1], random()), (random() - 0.5) * 0.2], [0.008, 0.016, 0.008]);
    }

    // ---- what it carries --------------------------------------------------------------
    let balloon: THREE.Group | null = null;
    if (carryArm) {
      const hand = handOf(carryArm);
      const string = new THREE.MeshStandardMaterial({ color: '#d8d2c0', roughness: 1 });
      if (a.carries === 'teddy') {
        const fur = new THREE.MeshStandardMaterial({ color: '#9a6a34', roughness: 1 });
        const bear = new THREE.Group();
        bear.position.copy(hand).add(new THREE.Vector3(-0.07, -0.16, 0.03));
        bear.rotation.z = 0.5;
        figure.add(bear);
        add(bear, ball, fur, [0, 0, 0], [0.055, 0.07, 0.048]);
        add(bear, ball, fur, [0, 0.095, 0], [0.05, 0.046, 0.046]);
        add(bear, ball, new THREE.MeshStandardMaterial({ color: '#d7bd8c', roughness: 1 }), [0, 0.085, 0.04], [0.022, 0.018, 0.018]);
        for (const side of [-1, 1]) {
          add(bear, ball, fur, [side * 0.036, 0.137, 0], [0.02, 0.02, 0.01]);
          add(bear, ball, fur, [side * 0.04, -0.075, 0.012], [0.024, 0.045, 0.024]);
          add(bear, ball, new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2 }), [side * 0.02, 0.105, 0.041], [0.007, 0.007, 0.005]);
        }
        add(bear, ball, fur, [-0.06, 0.01, 0], [0.022, 0.05, 0.022]).rotation.z = -0.5;
        add(bear, ball, fur, [0.07, 0.085, 0], [0.022, 0.065, 0.022]).rotation.z = -0.95;
      }
      if (a.carries === 'balloon') {
        balloon = new THREE.Group();
        const lift = mix(0.55, 0.8, random());
        balloon.position.copy(hand);
        figure.add(balloon);
        const rubber = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(mix(0.98, 0.02, random()), mix(0.3, 0.85, mood.cheer), mix(0.3, 0.5, mood.cheer)), roughness: 0.25 });
        const sag = mood.wear > 0.6 ? 0.72 : 1;
        add(balloon, ball, rubber, [-0.08, lift + 0.16, 0], [0.14 * sag, 0.17 * sag, 0.14 * sag]);
        add(balloon, new THREE.ConeGeometry(0.018, 0.03, 8), rubber, [-0.08, lift + 0.16 - 0.175 * sag, 0]);
        line(balloon, new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.08, lift + 0.16 - 0.18 * sag, 0), string, 0.0025);
      }
      if (a.carries === 'candle') {
        const brass = new THREE.MeshStandardMaterial({ color: '#b48a3c', metalness: 0.8, roughness: 0.35 });
        const holder = new THREE.Group();
        holder.position.copy(hand).add(new THREE.Vector3(0, 0.035, 0));
        figure.add(holder);
        add(holder, new THREE.CylinderGeometry(0.065, 0.05, 0.014, 20), brass, [0, 0, 0]);
        add(holder, new THREE.TorusGeometry(0.022, 0.006, 6, 14), brass, [-0.072, 0.008, 0]);
        add(holder, new THREE.CylinderGeometry(0.02, 0.022, 0.03, 12), brass, [0, 0.02, 0]);
        add(holder, new THREE.CylinderGeometry(0.014, 0.015, mix(0.05, 0.14, 1 - mood.wear), 12), new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 0.5 }), [0, 0.035 + mix(0.05, 0.14, 1 - mood.wear) / 2, 0]);
        const flame = add(holder, ball, new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb347', emissiveIntensity: 2.4, roughness: 0.4 }), [0, 0.035 + mix(0.05, 0.14, 1 - mood.wear) + 0.028, 0], [0.012, 0.028, 0.012]);
        flame.castShadow = false;
      }
      if (a.carries === 'pull-toy') {
        const toy = new THREE.Group();
        toy.position.set(-0.52, 0, -0.18);
        toy.rotation.y = 0.5;
        still.add(toy);
        const yellow = new THREE.MeshStandardMaterial({ color: '#d9ae2e', roughness: 0.55 });
        const red = new THREE.MeshStandardMaterial({ color: '#b5352c', roughness: 0.5 });
        add(toy, new THREE.BoxGeometry(0.2, 0.02, 0.09), new THREE.MeshStandardMaterial({ color: '#4d6e8c', roughness: 0.6 }), [0, 0.05, 0]);
        for (const x of [-0.07, 0.07]) for (const z of [-0.055, 0.055]) add(toy, new THREE.CylinderGeometry(0.036, 0.036, 0.014, 16), red, [x, 0.036, z]).rotation.x = Math.PI / 2;
        add(toy, ball, yellow, [-0.01, 0.115, 0], [0.085, 0.06, 0.045]);
        add(toy, ball, yellow, [0.065, 0.185, 0], [0.042, 0.042, 0.038]);
        add(toy, new THREE.ConeGeometry(0.02, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#d9702a', roughness: 0.5 }), [0.118, 0.18, 0]).rotation.z = -Math.PI / 2;
        add(toy, new THREE.ConeGeometry(0.03, 0.06, 6), yellow, [-0.1, 0.14, 0]).rotation.z = 0.9;
        for (const z of [-1, 1]) add(toy, ball, new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.2 }), [0.08, 0.2, z * 0.034], [0.008, 0.008, 0.006]);
        const from = new THREE.Vector3(hand.x * sizes[0], hand.y * sizes[1] * stretch, hand.z * sizes[0]);
        line(still, from, new THREE.Vector3(-0.44, 0.06, -0.135), string, 0.003);
      }
    }

    // ---- pose -------------------------------------------------------------------------
    const turn = random() < 0.5 ? -1 : 1;
    if (a.pose === 'shy') figure.rotation.set(0.16, turn * 0.5, turn * 0.07);
    if (a.pose === 'looming') figure.rotation.set(0.2, 0, 0);
    if (a.pose === 'boo') figure.rotation.set(0.04, 0, turn * 0.14);
    if (a.pose === 'carry-me') figure.rotation.set(-0.1, 0, 0);
    figure.rotation.y += (random() - 0.5) * 0.2;
    // Tilting swings the trailing corner; settle the figure so that corner just touches the floor.
    s.root.updateMatrixWorld(true);
    figure.position.y -= new THREE.Box3().setFromObject(drape).min.y;

    const base = figure.position.y, tilt = figure.rotation.z, energy = mix(0.15, 1, mood.energy), phase = random() * 6;
    return s.finish({
      footprint: 0.42 * sizes[0],
      update: (_dt, time) => {
        figure.position.y = base + Math.sin(time * 1.4 + phase) * 0.022 * energy;
        figure.rotation.z = tilt + Math.sin(time * 0.9 + phase) * 0.04 * energy;
        figure.scale.x = sizes[0] * (1 + Math.sin(time * 2.3 + phase) * 0.018 * energy);
        if (balloon) balloon.rotation.z = Math.sin(time * 0.7 + phase) * 0.1 * energy;
      },
    });
  },
});
