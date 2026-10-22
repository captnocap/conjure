import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

const paint = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) => {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const PALETTES = {
  hot: ['#1a1414', '#e8342a', '#ff9a1c', '#ffe23a'],
  cool: ['#10203a', '#2c8fe8', '#3af0e0', '#f4f4f0'],
  toxic: ['#2a1440', '#8dff3a', '#ff3ea0', '#ffe23a'],
  mono: ['#151515', '#f4f4f0', '#8a8a8a', '#d8202c'],
  pastel: ['#f6d8e4', '#8ad8d0', '#ffb07a', '#b89af0'],
} as const;

const BOARDS = {
  popsicle: { length: 0.81, width: 0.205, nose: [6, 0.05], tail: [6, 0.045], wheel: 0.027 },
  fishtail: { length: 0.78, width: 0.26, nose: [3.2, 0.012], tail: [9, 0.055], wheel: 0.032 },
  banana: { length: 0.57, width: 0.15, nose: [2.6, 0], tail: [4, 0.035], wheel: 0.03 },
  pintail: { length: 1.06, width: 0.235, nose: [2.2, 0], tail: [1.5, 0], wheel: 0.036 },
} as const;

export default defineThing({
  questions: {
    board: choice('What kind of skateboard is it?', {
      popsicle: 'A modern street deck, symmetrical with a kick at both ends.',
      fishtail: 'A wide eighties pool board with a blunt nose and a big square tail.',
      banana: 'A stubby seventies plastic banana board in one bright moulded colour.',
      pintail: 'A long surf-style cruiser tapering to a point.',
    }),
    graphic: choice('What is painted on the underside of the deck?', {
      flames: 'Hot-rod flames licking down the board.',
      bolt: 'One huge lightning bolt and scattered stars.',
      eye: 'A single enormous staring eye.',
      checker: 'Checkerboard with a slash of colour.',
      sunset: 'A striped sunset with a fat round sun.',
      slime: 'Thick slime dripping from one edge.',
      blank: 'Bare wood covered in marker-pen doodles.',
    }),
    colours: choice('What colours is the graphic?', {
      hot: 'Black, red, orange and yellow.',
      cool: 'Navy, sky blue, aqua and white.',
      toxic: 'Purple, acid green and hot pink.',
      mono: 'Black and white with one hit of red.',
      pastel: 'Soft pink, mint, peach and lilac.',
    }),
    state: choice('What shape is it in?', {
      new: 'Brand new: perfect graphic, clean grip, a price sticker still on it.',
      ridden: 'Ridden all summer: scraped through the middle, grip worn pale under the feet.',
      thrashed: 'Thrashed: graphic nearly gone, tail ground down, mismatched wheels.',
      snapped: 'Snapped in two across the middle, the halves left where the trick went wrong.',
    }),
    wheels: choice('What colour are the wheels?', {
      white: 'Off-white, yellowing.', red: 'Red.', green: 'Translucent lime green.', orange: 'Orange.', black: 'Black.', blue: 'Blue.',
    }),
    kerb: choice('What is it leaning against?', {
      parking: 'A concrete car-park wheel stop, chipped at the corners.',
      painted: 'A kerb painted no-parking red, the paint ground off along the edge.',
      ledge: 'A knee-high granite ledge gone black with wax.',
      brick: 'A low brick planter wall.',
    }),
    beside: choice('What was left with it?', {
      nothing: 'Nothing.',
      shoes: 'A pair of battered skate shoes, one on its side.',
      can: 'A crushed drink can.',
      helmet: 'A scratched helmet sitting on the kerb.',
      bag: 'A slumped school backpack.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const spec = BOARDS[a.board];
    const L = spec.length, W = spec.width, T = 0.012;
    const pal = PALETTES[a.colours];
    const damage = { new: 0, ridden: 0.45, thrashed: 0.9, snapped: 0.6 }[a.state] * mix(0.7, 1.15, mood.wear);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const plastic = a.board === 'banana';

    // Underside art.
    const art = paint(768, 192, (ctx, w, h) => {
      const wood = '#d8b88a';
      ctx.fillStyle = a.graphic === 'blank' ? wood : pal[0]; ctx.fillRect(0, 0, w, h);
      if (plastic) { ctx.fillStyle = pal[1]; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 24; i++) for (let j = 0; j < 6; j++) ctx.fillRect(i * 32 + 6, j * 32 + 6, 20, 20); }
      else if (a.graphic === 'flames') {
        for (let layer = 0; layer < 3; layer++) {
          ctx.fillStyle = pal[1 + layer];
          const reach = w * (0.92 - layer * 0.2);
          ctx.beginPath(); ctx.moveTo(0, 0);
          const tongues = 5;
          for (let i = 0; i < tongues; i++) {
            const y0 = h * i / tongues, y1 = h * (i + 1) / tongues, tip = reach * mix(0.55, 1, random());
            ctx.bezierCurveTo(tip * 0.5, y0, tip * 0.6, y0 + (y1 - y0) * 0.1, tip, y0 + (y1 - y0) * mix(0.3, 0.7, random()));
            ctx.bezierCurveTo(tip * 0.5, y1 - (y1 - y0) * 0.2, reach * 0.25, y1 - (y1 - y0) * 0.3, reach * 0.14, y1);
          }
          ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
        }
      } else if (a.graphic === 'bolt') {
        ctx.fillStyle = pal[1]; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = pal[3]; ctx.strokeStyle = pal[0]; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(w * 0.12, h * 0.3); ctx.lineTo(w * 0.5, h * 0.12); ctx.lineTo(w * 0.44, h * 0.46); ctx.lineTo(w * 0.9, h * 0.5); ctx.lineTo(w * 0.42, h * 0.9); ctx.lineTo(w * 0.5, h * 0.58); ctx.lineTo(w * 0.1, h * 0.62); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal[2];
        for (let i = 0; i < 9; i++) { const x = random() * w, y = random() * h, r = 6 + random() * 9; ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.4 : r, t = k / 10 * 6.283; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } ctx.fill(); }
      } else if (a.graphic === 'eye') {
        for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 2 ? pal[0] : pal[1]; ctx.beginPath(); ctx.moveTo(w / 2, h / 2); ctx.arc(w / 2, h / 2, w, i / 16 * 6.283, (i + 1) / 16 * 6.283); ctx.fill(); }
        ctx.fillStyle = '#f6f2e6'; ctx.strokeStyle = '#111'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(w * 0.22, h / 2); ctx.quadraticCurveTo(w / 2, -h * 0.35, w * 0.78, h / 2); ctx.quadraticCurveTo(w / 2, h * 1.35, w * 0.22, h / 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.36, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.17, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2 + h * 0.12, h / 2 - h * 0.12, h * 0.06, 0, 7); ctx.fill();
      } else if (a.graphic === 'checker') {
        const n = h / 6;
        for (let i = 0; i < w / n; i++) for (let j = 0; j < 6; j++) { ctx.fillStyle = (i + j) % 2 ? pal[0] : '#f4f4f0'; ctx.fillRect(i * n, j * n, n, n); }
        ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.moveTo(w * 0.3, 0); ctx.lineTo(w * 0.5, 0); ctx.lineTo(w * 0.7, h); ctx.lineTo(w * 0.5, h); ctx.fill();
        ctx.fillStyle = pal[3]; ctx.beginPath(); ctx.moveTo(w * 0.52, 0); ctx.lineTo(w * 0.57, 0); ctx.lineTo(w * 0.77, h); ctx.lineTo(w * 0.72, h); ctx.fill();
      } else if (a.graphic === 'sunset') {
        const bands = [pal[0], pal[1], pal[2], pal[3], pal[2], pal[1]];
        bands.forEach((tint, i) => { ctx.fillStyle = tint; ctx.fillRect(w * i / bands.length, 0, w / bands.length + 1, h); });
        ctx.fillStyle = pal[3]; ctx.beginPath(); ctx.arc(w * 0.62, h / 2, h * 0.42, 0, 7); ctx.fill();
        ctx.fillStyle = pal[0]; for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.62 + h * (0.05 + i * 0.08), 0, h * (0.012 + i * 0.008), h);
      } else if (a.graphic === 'slime') {
        ctx.fillStyle = pal[1];
        ctx.beginPath(); ctx.moveTo(0, 0);
        for (let x = 0; x < w; x += 48) { const drop = h * mix(0.25, 0.95, random()); ctx.bezierCurveTo(x + 6, drop, x + 12, drop + 14, x + 24, drop); ctx.bezierCurveTo(x + 34, drop - 10, x + 40, h * 0.2, x + 48, h * 0.18); }
        ctx.lineTo(w, 0); ctx.fill();
        ctx.fillStyle = pal[2]; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 3 + random() * 8, 0, 7); ctx.fill(); }
      } else {
        ctx.strokeStyle = 'rgba(120,80,40,0.35)'; ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) { ctx.beginPath(); const y = random() * h; ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 6, w * 0.6, y - 6, w, y + 2); ctx.stroke(); }
        ctx.lineCap = 'round';
        for (let i = 0; i < 22; i++) {
          ctx.strokeStyle = pick(['#111', '#111', pal[1], '#1c3aa0']); ctx.lineWidth = 3 + random() * 3;
          const x = random() * w, y = random() * h, r = 8 + random() * 22;
          ctx.beginPath();
          const kind = Math.floor(random() * 4);
          if (kind === 0) ctx.arc(x, y, r, 0, 7);
          else if (kind === 1) { for (let k = 0; k < 11; k++) { const rr = k % 2 ? r * 0.45 : r, t = k / 10 * 6.283; ctx.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } }
          else if (kind === 2) { ctx.moveTo(x - r, y); for (let k = 0; k < 6; k++) ctx.lineTo(x - r + k * r * 0.4, y + (k % 2 ? -r * 0.5 : r * 0.5)); }
          else { ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); }
          ctx.stroke();
        }
      }
      // Scrapes: boardslides through the middle, razor wear at the ends.
      if (!plastic) {
        ctx.strokeStyle = wood; ctx.lineCap = 'round';
        const scrapes = Math.round(damage * damage * 520);
        for (let i = 0; i < scrapes; i++) {
          const middle = random() < 0.65;
          const x = middle ? w * mix(0.3, 0.7, random()) : random() < 0.5 ? w * random() * 0.1 : w * (1 - random() * 0.1);
          const y = random() * h, len = middle ? 20 + random() * 110 : 6 + random() * 30;
          ctx.globalAlpha = 0.5 + random() * 0.5; ctx.lineWidth = 1 + random() * 5 * damage;
          ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.lineTo(x + len / 2, y + (random() - 0.5) * 14); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    });
    const grip = paint(512, 128, (ctx, w, h) => {
      ctx.fillStyle = plastic ? pal[1] : '#19191b'; ctx.fillRect(0, 0, w, h);
      if (plastic) { ctx.fillStyle = 'rgba(255,255,255,0.2)'; for (let i = 0; i < 40; i++) for (let j = 0; j < 10; j++) ctx.fillRect(i * 13 + 3, j * 13 + 3, 7, 7); return; }
      for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(255,255,255,${random() * 0.14})`; ctx.fillRect(random() * w, random() * h, 1.5, 1.5); }
      for (const foot of [0.24, 0.74]) {
        const glow = ctx.createRadialGradient(w * foot, h / 2, 4, w * foot, h / 2, h * 0.75);
        glow.addColorStop(0, `rgba(170,165,155,${damage * 0.75})`); glow.addColorStop(1, 'rgba(170,165,155,0)');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      }
      if (random() < 0.5) { ctx.fillStyle = pal[1]; ctx.fillRect(w * 0.47, 0, w * 0.025, h); }
    });
    const edge = s.material(plastic ? pal[1] : '#c9a06a', { roughness: 0.6 });
    const top = new THREE.MeshStandardMaterial({ map: grip, roughness: plastic ? 0.4 : 1 });
    const bottom = new THREE.MeshStandardMaterial({ map: art, roughness: mix(0.3, 0.75, damage) });
    const deckMaterials = [edge, edge, top, bottom, edge, edge];

    const halfWidth = (x: number) => {
      const n = clamp01(Math.abs(x) / (L / 2));
      const [power] = x > 0 ? spec.nose : spec.tail;
      const taper = a.board === 'pintail' && x < 0 ? mix(1, 0.72, n) : a.board === 'fishtail' && x > 0 ? mix(1, 0.86, n) : 1;
      return (W / 2) * Math.sqrt(Math.max(0, 1 - n ** power)) * taper;
    };
    const rise = (x: number) => {
      const n = Math.abs(x) / (L / 2), kick = (x > 0 ? spec.nose : spec.tail)[1];
      return kick * THREE.MathUtils.smoothstep(n, 0.6, 1) ** 1.3;
    };
    const deckPiece = (from: number, to: number, jagFrom: boolean, jagTo: boolean) => {
      const g = new THREE.BoxGeometry(to - from, T, W, 40, 1, 8);
      const at = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
      const jag = Array.from({ length: 9 }, () => (random() - 0.5) * 0.06);
      const normal = g.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < at.count; i++) {
        const local = at.getX(i), z = at.getZ(i);
        let x = local + (from + to) / 2;
        const row = Math.round((z / W + 0.5) * 8);
        if (jagFrom && local < -(to - from) / 2 + 1e-5) x += jag[row];
        if (jagTo && local > (to - from) / 2 - 1e-5) x += jag[row];
        const zz = (z / (W / 2)) * halfWidth(x);
        at.setXYZ(i, x, at.getY(i) + rise(x) + 0.006 * (zz / (W / 2)) ** 2, zz);
        if (Math.abs(normal.getY(i)) > 0.5) uv.setX(i, x / L + 0.5);
      }
      g.computeVertexNormals();
      return g;
    };

    const truck = (x: number, into: THREE.Group, wheelTints: string[]) => {
      const steel = s.material('#b9bec2', { metalness: 0.85, roughness: 0.35 });
      const r = spec.wheel, drop = 0.03 + r * 0.55, span = Math.min(W * 0.9, 0.2);
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = true; into.add(mesh); return mesh; };
      const plate = add(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.008, 0.055), steel));
      plate.position.set(x, -T / 2 - 0.004, 0);
      const hanger = add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, drop, 10), steel));
      hanger.position.set(x, -T / 2 - drop / 2, 0);
      const axle = add(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, span, 10), steel));
      axle.rotation.x = Math.PI / 2;
      axle.position.set(x, -T / 2 - drop, 0);
      const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, span + r * 1.5, 8), steel));
      pin.rotation.x = Math.PI / 2;
      pin.position.copy(axle.position);
      [-1, 1].forEach((side, i) => {
        if (a.state === 'thrashed' && mood.wear > 0.75 && x > 0 && side > 0) return; // one wheel long gone
        const tint = wheelTints[i];
        const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 1.15, 22), new THREE.MeshStandardMaterial({ color: new THREE.Color(tint).lerp(new THREE.Color('#6a655c'), damage * 0.35), roughness: 0.45, transparent: a.wheels === 'green', opacity: a.wheels === 'green' ? 0.85 : 1 })));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, -T / 2 - drop, side * (span / 2 + r * 0.45));
        const core = add(new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.42, r * 1.18, 12), s.material('#2a2a2c')));
        core.rotation.x = Math.PI / 2;
        core.position.copy(wheel.position);
      });
    };
    const WHEEL = { white: '#ece6d2', red: '#d8262c', green: '#9af03a', orange: '#f08a1c', black: '#1e1e20', blue: '#2c6fd8' };
    const tints = () => [0, 1].map(() => (a.state === 'thrashed' && random() < 0.4 ? pick(Object.values(WHEEL)) : WHEEL[a.wheels]));
    const base = L * (a.board === 'pintail' ? 0.3 : a.board === 'banana' ? 0.28 : 0.235);

    // The standing part: built flat, then stood on its tail with the graphic facing out.
    const lean = mix(0.28, 0.4, random());
    const stand = (content: THREE.Group, twist: number) => {
      const upright = new THREE.Group();
      content.rotation.set(-Math.PI / 2, 0, 0);
      const turn = new THREE.Group();
      turn.add(content);
      turn.rotation.z = Math.PI / 2;
      upright.add(turn);
      upright.rotation.set(-lean, twist, 0, 'YXZ');
      s.root.add(upright);
      upright.updateMatrixWorld(true);
      upright.position.y -= new THREE.Box3().setFromObject(upright).min.y;
      return upright;
    };
    const flat = new THREE.Group();
    const deck = (g: THREE.BufferGeometry, into: THREE.Group) => { const mesh = new THREE.Mesh(g, deckMaterials); mesh.castShadow = mesh.receiveShadow = true; into.add(mesh); };
    const snapAt = (random() - 0.5) * 0.1;
    if (a.state === 'snapped') {
      deck(deckPiece(snapAt, L / 2, true, false), flat);
      truck(base, flat, tints());
    } else {
      deck(deckPiece(-L / 2, L / 2, false, false), flat);
      truck(base, flat, tints());
      truck(-base, flat, tints());
    }
    if (a.state === 'new') {
      const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.045), new THREE.MeshStandardMaterial({ map: paint(128, 80, (ctx, w, h) => { ctx.fillStyle = '#ffe94a'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c8202a'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.fillText(pick(['39.99', '$45', '59.00']), w / 2, 54); }), roughness: 0.5 }));
      tag.rotation.x = Math.PI / 2;
      tag.position.set(L * 0.36, -T / 2 - 0.002 + rise(L * 0.36), 0.02);
      flat.add(tag);
    }
    const standing = stand(flat, (random() - 0.5) * 0.3);
    standing.updateMatrixWorld(true);
    const stood = new THREE.Box3().setFromObject(standing);

    // The kerb it leans on.
    const kh = { parking: 0.15, painted: 0.17, ledge: 0.3, brick: 0.26 }[a.kerb];
    const kd = { parking: 0.18, painted: 0.24, ledge: 0.3, brick: 0.2 }[a.kerb];
    const kw = mix(0.6, 0.78, random());
    const reach = a.state === 'snapped' ? (L / 2 - snapAt) : L;
    const touch = Math.min(kh, reach * Math.cos(lean) * 0.9);
    const kz = stood.max.z - T - 0.035 - spec.wheel * 2 * 0 - touch * Math.tan(lean) - (a.state === 'snapped' ? 0 : spec.tail[1]) - kd / 2 - 0.045;
    const skin = paint(256, 96, (ctx, w, h) => {
      const baseTint = { parking: '#b9b6ac', painted: '#b9b6ac', ledge: '#6f7176', brick: '#9a4a36' }[a.kerb];
      ctx.fillStyle = baseTint; ctx.fillRect(0, 0, w, h);
      if (a.kerb === 'brick') {
        ctx.strokeStyle = '#d8d2c2'; ctx.lineWidth = 2;
        for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(0, j * 24); ctx.lineTo(w, j * 24); ctx.stroke(); for (let i = 0; i < 6; i++) { const x = i * 51 + (j % 2) * 25; ctx.beginPath(); ctx.moveTo(x, j * 24); ctx.lineTo(x, j * 24 + 24); ctx.stroke(); ctx.fillStyle = `rgba(0,0,0,${random() * 0.18})`; ctx.fillRect(x + 1, j * 24 + 1, 49, 22); } }
      } else for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${random() * 0.16})`; ctx.fillRect(random() * w, random() * h, 2, 2); }
      if (a.kerb === 'painted') { ctx.fillStyle = '#c8322c'; ctx.fillRect(0, 0, w, h * 0.7); }
      // Wax and grind marks along the top edge.
      for (let i = 0; i < 60 + mood.wear * 160; i++) { ctx.fillStyle = `rgba(${a.kerb === 'painted' ? '190,186,176' : '25,25,28'},${0.2 + random() * 0.5})`; ctx.fillRect(random() * w, random() * h * 0.22, 6 + random() * 40, 1 + random() * 3); }
    });
    const stone = new THREE.MeshStandardMaterial({ map: skin, roughness: a.kerb === 'ledge' ? 0.4 : 0.95 });
    const plain = s.material({ parking: '#b3b0a6', painted: '#b3b0a6', ledge: '#55575c', brick: '#8a4634' }[a.kerb], { roughness: 0.9 });
    if (a.kerb === 'parking') {
      const profile = new THREE.Shape();
      profile.moveTo(-kd / 2, 0); profile.lineTo(kd / 2, 0); profile.lineTo(kd / 2 - 0.045, kh); profile.lineTo(-kd / 2 + 0.045, kh); profile.closePath();
      const g = new THREE.ExtrudeGeometry(profile, { depth: kw, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
      g.translate(0, 0, -kw / 2);
      g.rotateY(Math.PI / 2);
      s.mesh(g, [plain, stone] as unknown as THREE.Material, [0, 0, kz]);
      for (const x of [-1, 1]) s.cylinder(0.014, 0.014, 0.02, [x * kw * 0.3, kh + 0.008, kz], s.material('#5a4a3a', { metalness: 0.6 }), 8);
    } else {
      s.box([kw, kh, kd], [0, kh / 2, kz], [plain, plain, a.kerb === 'painted' ? s.material('#c8322c') : plain, plain, stone, plain] as unknown as THREE.Material);
      if (a.kerb === 'brick') s.box([kw + 0.03, 0.04, kd + 0.04], [0, kh + 0.02, kz], s.material('#c9c4b6', { roughness: 0.95 }));
      if (a.kerb === 'ledge') s.box([kw + 0.004, 0.012, 0.03], [0, kh - 0.004, kz + kd / 2], s.material('#8a8e94', { metalness: 0.8, roughness: 0.3 }));
    }
    // A patch of the ground it stands on.
    const tarmac = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#5c5d60'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 3500; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '20,20,22' : '200,200,196'},${random() * 0.3})`; ctx.fillRect(random() * w, random() * h, 2, 2); }
      ctx.fillStyle = random() < 0.5 ? '#e8e4d2' : '#e8c63a'; ctx.globalAlpha = 0.85; ctx.fillRect(w * mix(0.12, 0.8, random()), 0, 14, h);
      ctx.globalAlpha = 1; ctx.strokeStyle = '#2a2a2c'; ctx.lineWidth = 2;
      for (let i = 0; i < mood.wear * 5; i++) { ctx.beginPath(); let x = random() * w, y = 0; ctx.moveTo(x, y); while (y < h) { x += (random() - 0.5) * 40; y += 20 + random() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    });
    const padDepth = stood.max.z - (kz - kd / 2) + 0.3;
    s.box([kw + 0.16, 0.02, padDepth], [0, -0.01, kz - kd / 2 + padDepth / 2 - 0.04], new THREE.MeshStandardMaterial({ map: tarmac, roughness: 1 }));

    const front = stood.max.z;
    if (a.state === 'snapped') {
      const lying = new THREE.Group();
      deck(deckPiece(-L / 2, snapAt, false, true), lying);
      truck(-base, lying, tints());
      lying.rotation.set(random() < 0.5 ? Math.PI : 0, mix(-0.6, 0.6, random()), 0);
      lying.position.set(mix(-0.2, 0.2, random()), 0, front + 0.1);
      s.root.add(lying);
      lying.updateMatrixWorld(true);
      lying.position.y -= new THREE.Box3().setFromObject(lying).min.y;
      const chips = [];
      for (let i = 0; i < 14; i++) chips.push({ at: [(random() - 0.5) * 0.5, 0.004, front - 0.05 + random() * 0.25] as const, size: mix(0.006, 0.02, random()) });
      s.scatter(new THREE.TetrahedronGeometry(1), s.material('#d8b88a'), chips);
    }

    const sideX = (random() < 0.5 ? -1 : 1) * mix(0.2, 0.27, random());
    if (a.beside === 'shoes') {
      const canvasTint = pick(['#1e1e20', '#a8262c', '#2a3a8a', '#1e1e20']);
      for (let i = 0; i < 2; i++) {
        const shoe = new THREE.Group();
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.28, 1, 1, 1), s.material('#e8e2d0', { roughness: 0.8 }));
        sole.position.y = 0.011;
        const upper = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), s.material(canvasTint, { roughness: 1 }));
        upper.scale.set(0.05, 0.045, 0.135);
        upper.position.set(0, 0.05, 0);
        const ankle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.06, 14, 1, true), s.material(canvasTint, { roughness: 1, side: THREE.DoubleSide }));
        ankle.position.set(0, 0.09, -0.07);
        const toe = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 8), s.material('#e8e2d0'));
        toe.scale.set(1, 0.6, 1);
        toe.position.set(0, 0.035, 0.1);
        shoe.add(sole, upper, ankle, toe);
        shoe.traverse((n) => { n.castShadow = true; });
        shoe.position.set(sideX + i * 0.14 * Math.sign(sideX), i === 1 ? 0.05 : 0, front + 0.02 + i * 0.1);
        shoe.rotation.set(0, random() * 6.28, i === 1 ? Math.PI / 2 : 0);
        s.root.add(shoe);
      }
    } else if (a.beside === 'can') {
      const can = s.cylinder(0.033, 0.033, 0.115, [sideX, 0.03, front + 0.08], s.material(pick(['#d8202c', '#2c6fd0', '#3aa870', '#e8e4da']), { metalness: 0.7, roughness: 0.3 }), 14);
      can.rotation.set(Math.PI / 2, 0, random() * 3);
      can.scale.set(1, 1, 0.8);
      s.cylinder(0.02, 0.03, 0.004, [sideX + 0.1, 0.002, front + 0.12], s.material('#3a2a1c', { transparent: true, opacity: 0.6 }), 12);
    } else if (a.beside === 'helmet') {
      const shell = s.material(pick(['#1e1e20', '#d8262c', '#f4f4f0', '#2c6fd8']), { roughness: 0.3 });
      const dome = s.mesh(new THREE.SphereGeometry(0.12, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), shell, [-sideX, kh + 0.012 + (a.kerb === 'brick' ? 0.04 : 0), kz]);
      dome.scale.set(1, 0.95, 1.15);
      dome.rotation.y = random() * 3;
      for (let i = 0; i < 3; i++) s.box([0.012, 0.01, 0.07], [-sideX + (i - 1) * 0.045, dome.position.y + 0.108, kz], s.material('#0c0c0e'));
    } else if (a.beside === 'bag') {
      const cloth = s.material(pick(['#2a3a5a', '#5a2a3a', '#2a2a2c', '#4a5a3a']), { roughness: 1 });
      const bag = s.ball([0.12, 0.15, 0.08], [sideX * 1.05, 0.13, front + 0.0], cloth, 16);
      bag.rotation.set(-0.25, random() - 0.5, 0.15);
      s.ball([0.085, 0.065, 0.04], [sideX * 1.05, 0.09, front + 0.075], s.material(cloth.color.clone().multiplyScalar(0.75), { roughness: 1 }), 12);
      s.tube([[sideX * 1.05 - 0.05, 0.24, front - 0.03], [sideX * 1.05 - 0.1, 0.14, front + 0.05], [sideX * 1.05 - 0.14, 0.01, front + 0.1], [sideX * 1.05 - 0.07, 0.01, front + 0.16]], 0.009, s.material('#1a1a1c'));
    }

    return s.finish({ footprint: kw / 2 + 0.12 });
  },
});
