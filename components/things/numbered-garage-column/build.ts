import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const MARKS = {
  three: 'A huge numeral 3.',
  one: 'A huge numeral 1: ground level, nearly out.',
  b2: 'B2, a basement level, deep under the street.',
  minus: 'A minus one, European style.',
  c: 'A single capital letter C, a zone rather than a floor.',
  g7: 'A row code, 7G, the kind you photograph so you can find the car again.',
  roof: 'The letter R: the roof level, open to the sky.',
} as const;
const MARK_TEXT: Record<keyof typeof MARKS, string> = { three: '3', one: '1', b2: 'B2', minus: '-1', c: 'C', g7: '7G', roof: 'R' };
const BANDS = {
  green: 'Hospital green.',
  amber: 'Amber orange.',
  blue: 'Bright blue.',
  red: 'Signal red.',
  purple: 'Purple, the colour nobody remembers.',
  yellow: 'Lemon yellow with black lettering.',
} as const;
const BAND_TINT: Record<keyof typeof BANDS, string> = { green: '#3f9a6a', amber: '#e08a2a', blue: '#2f74c4', red: '#c8402c', purple: '#7a4fa8', yellow: '#e8c93a' };

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    marking: choice('What is painted on the column?', MARKS),
    band: choice('What colour is the painted band?', BANDS),
    coverage: choice('How much of the column is painted?', {
      band: 'One broad band at head height carrying the marking.',
      half: 'The whole lower half is painted, floor to shoulder, with the marking above eye level in a panel.',
      stripes: 'A square panel for the marking between two thin stripes.',
      full: 'The entire column is painted the colour from floor to ceiling.',
    }),
    taped: choice('What is taped to the column?', {
      nothing: 'Nothing.',
      missing: 'A missing-person poster with a photocopied face.',
      cat: 'A lost cat poster with a reward.',
      notice: 'An official notice about closing times and clamping.',
      tabs: 'A hand-made flyer with tear-off phone number tabs, half of them gone.',
      remnants: 'Only the corners of old posters and yellowed tape where things used to be.',
    }),
    guards: choice('What protects the corners?', {
      rubber: 'Yellow and black rubber corner guards, scuffed by bumpers.',
      steel: 'Galvanised steel angles bolted on.',
      foam: 'Thick foam padding wrapped round the base and strapped.',
      none: 'Nothing: bare, chipped concrete corners.',
    }),
    fire: choice('What is at the fire point on its side?', {
      extinguisher: 'A red fire point sign and an extinguisher on its bracket.',
      empty: 'The sign and an empty bracket: the extinguisher is gone.',
      alarm: 'A red break-glass alarm box with conduit running up.',
      none: 'No fire point on this column.',
    }),
    camera: noul('Is a CCTV dome watching from the top of the column?'),
    scrape: noul('Has a car left a long streak of its paint along one corner?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const W = 0.62, H = 2.75, h = W / 2;
    const tint = BAND_TINT[a.band];
    const ink = a.band === 'yellow' ? '#1c1c1c' : '#f4f2ea';
    const text = MARK_TEXT[a.marking];
    const speckle = (ctx: CanvasRenderingContext2D, w: number, hgt: number, n: number, colour: string, size = 6) => {
      ctx.fillStyle = colour;
      for (let i = 0; i < n; i++) ctx.fillRect(random() * w, random() * hgt, 1 + random() * size, 1 + random() * size);
    };

    // Board-marked concrete shaft.
    const concreteMap = paint(128, 512, (ctx) => {
      ctx.fillStyle = '#b4b2a8'; ctx.fillRect(0, 0, 128, 512);
      for (let y = 0; y < 512; y += 64) { ctx.fillStyle = `rgba(60,60,55,${0.1 + random() * 0.12})`; ctx.fillRect(0, y, 128, 2); ctx.fillStyle = `rgba(255,255,255,${random() * 0.06})`; ctx.fillRect(0, y + 2, 128, 62); }
      speckle(ctx, 128, 512, 220, 'rgba(70,70,64,0.18)', 3);
      // Water staining from the slab above.
      for (let i = 0; i < 3 + mood.wear * 8; i++) { const x = random() * 128, w = 4 + random() * 14; const g = ctx.createLinearGradient(0, 0, 0, 180 + random() * 300); g.addColorStop(0, `rgba(60,52,40,${0.12 + mood.wear * 0.3})`); g.addColorStop(1, 'rgba(60,52,40,0)'); ctx.fillStyle = g; ctx.fillRect(x, 0, w, 512); }
    });
    const concrete = new THREE.MeshStandardMaterial({ map: concreteMap, roughness: 0.95 });
    const plain = s.material('#aeaca2', { roughness: 0.95 });
    const shaft = a.coverage === 'full' ? new THREE.MeshStandardMaterial({ map: concreteMap, color: new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.25), roughness: 0.85 }) : concrete;
    s.box([W, H, W], [0, H / 2, 0], shaft);
    // Flared head and a sawn-off piece of the slab it carries, with a beam stub.
    const head = s.mesh(new THREE.CylinderGeometry(W * 0.98, W * 0.708, 0.26, 4, 1), plain, [0, H - 0.13, 0]);
    head.rotation.y = Math.PI / 4;
    s.box([1.0, 0.16, 1.0], [0, H + 0.08, 0], plain);
    // Cut rebar ends where the slab was sawn away.
    const rebar = s.material('#7a4a30', { roughness: 0.9, metalness: 0.3 });
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
      s.rod([side * 0.5, H + 0.08, -0.36 + i * 0.24], [side * (0.56 + random() * 0.1), H + 0.08 + (random() - 0.5) * 0.06, -0.36 + i * 0.24], 0.012, rebar);
      s.rod([-0.36 + i * 0.24, H + 0.08, side * 0.5], [-0.36 + i * 0.24, H + 0.08 + (random() - 0.5) * 0.06, side * (0.56 + random() * 0.1)], 0.012, rebar);
    }
    // Kerb-height painted foot.
    s.box([W + 0.012, 0.16, W + 0.012], [0, 0.08, 0], s.material('#2a2c2e'));

    // Painted faces: a canvas per face so the flaking differs.
    const panelTop = a.coverage === 'half' ? 1.95 : 2.05, panelH = a.coverage === 'stripes' ? 0.54 : 0.62;
    for (let face = 0; face < 4; face++) {
      const map = paint(256, 256, (ctx) => {
        ctx.fillStyle = a.coverage === 'full' ? '#f4f2ea' : tint; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = a.coverage === 'full' ? tint : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (a.coverage === 'full') { ctx.beginPath(); ctx.arc(128, 128, 112, 0, Math.PI * 2); ctx.fillStyle = '#f4f2ea'; ctx.fill(); ctx.fillStyle = tint; }
        ctx.font = `bold ${text.length > 1 ? 150 : 210}px sans-serif`;
        ctx.fillText(text, 128, 140, 232);
        speckle(ctx, 256, 256, mood.wear * 260, '#b4b2a8', 9);
        ctx.fillStyle = 'rgba(40,40,36,0.25)';
        for (let i = 0; i < mood.wear * 10; i++) ctx.fillRect(0, random() * 256, 256, 1 + random() * 2);
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(a.coverage === 'full' ? W * 0.86 : W, a.coverage === 'full' ? W * 0.86 : panelH), new THREE.MeshStandardMaterial({ map, roughness: 0.8 }));
      panel.position.set(0, panelTop - panelH / 2, h + 0.004);
      const turn = new THREE.Group(); turn.rotation.y = face * Math.PI / 2; turn.add(panel); panel.receiveShadow = true;
      s.root.add(turn);
    }
    const bandMat = s.material(tint, { roughness: 0.8 });
    if (a.coverage === 'half') s.box([W + 0.006, 1.15, W + 0.006], [0, 0.16 + 0.575, 0], bandMat);
    if (a.coverage === 'stripes') for (const y of [panelTop + 0.1, panelTop - panelH - 0.1]) s.box([W + 0.006, 0.07, W + 0.006], [0, y, 0], bandMat);
    if (a.coverage === 'band') s.box([W + 0.006, 0.05, W + 0.006], [0, panelTop - panelH - 0.09, 0], s.material('#f1efe6'));

    // Corner guards.
    const dark = s.material('#1f2224'), steel = s.material('#b3babc', { metalness: 0.7, roughness: 0.4 });
    if (a.guards === 'rubber') {
      const hazard = paint(32, 256, (ctx) => { ctx.fillStyle = '#e8c21f'; ctx.fillRect(0, 0, 32, 256); ctx.fillStyle = '#1d1d1d'; for (let i = -1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(0, i * 40); ctx.lineTo(32, i * 40 + 22); ctx.lineTo(32, i * 40 + 42); ctx.lineTo(0, i * 40 + 20); ctx.fill(); } speckle(ctx, 32, 256, mood.wear * 60, '#3a3a36', 5); });
      const mat = new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.8 });
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.box([0.11, 0.95, 0.025], [x * (h - 0.05), 0.16 + 0.475, z * (h + 0.012)], mat);
        s.box([0.025, 0.95, 0.11], [x * (h + 0.012), 0.16 + 0.475, z * (h - 0.05)], mat);
      }
    } else if (a.guards === 'steel') {
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        s.box([0.09, 1.2, 0.012], [x * (h - 0.04), 0.76, z * (h + 0.006)], steel);
        s.box([0.012, 1.2, 0.09], [x * (h + 0.006), 0.76, z * (h - 0.04)], steel);
        for (const y of [0.3, 0.76, 1.22]) s.cylinder(0.012, 0.012, 0.01, [x * (h - 0.04), y, z * (h + 0.014)], dark, 8).rotation.x = Math.PI / 2;
      }
    } else if (a.guards === 'foam') {
      const foam = s.material(a.band === 'yellow' ? '#2b4f9a' : '#e8c21f', { roughness: 0.9 });
      const wrap = s.mesh(new THREE.BoxGeometry(W + 0.2, 1.05, W + 0.2, 1, 1, 1), foam, [0, 0.16 + 0.525, 0]);
      wrap.scale.set(1, 1, 1);
      for (const y of [0.4, 0.75, 1.1]) s.box([W + 0.21, 0.035, W + 0.21], [0, y, 0], dark);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.05, 0.05, 1.05, [x * (h + 0.07), 0.685, z * (h + 0.07)], foam, 10);
    } else {
      // Chips knocked out of the arrises, showing aggregate.
      const chip = s.material('#5f5d56', { roughness: 1 });
      for (let i = 0; i < 5 + mood.wear * 8; i++) {
        const x = random() < 0.5 ? -1 : 1, z = random() < 0.5 ? -1 : 1;
        s.mesh(new THREE.IcosahedronGeometry(0.02 + random() * 0.03, 0), chip, [x * h, 0.25 + random() * random() * 1.3, z * h]).rotation.set(random() * 3, random() * 3, 0);
      }
    }
    const out = a.guards === 'foam' ? h + 0.105 : h + 0.005;

    // Car paint scrape on the front-right corner.
    if (a.scrape) {
      const carPaint = s.material(['#b3271f', '#1f3f8a', '#e9e9e4', '#1a1a1a', '#c9a23f'][Math.floor(random() * 5)], { roughness: 0.4 });
      const y = mix(0.45, 0.7, random());
      for (let i = 0; i < 4; i++) {
        const len = mix(0.18, 0.42, random());
        s.box([len, 0.012 + random() * 0.025, 0.004], [h - len / 2 + 0.002, y + i * 0.035, out + 0.016], carPaint).rotation.z = (random() - 0.5) * 0.08;
        s.box([0.004, 0.012 + random() * 0.025, len * 0.7], [out + 0.016, y + i * 0.035, h - len * 0.35], carPaint);
      }
    }

    // Fire point on the +x face.
    if (a.fire !== 'none') {
      const red = s.material('#c8281e', { roughness: 0.45 });
      const sign = paint(128, 160, (ctx) => {
        ctx.fillStyle = '#c8281e'; ctx.fillRect(0, 0, 128, 160);
        ctx.fillStyle = '#fff'; ctx.fillRect(52, 40, 26, 66); ctx.fillRect(58, 28, 14, 14); ctx.fillRect(72, 30, 22, 6); ctx.fillRect(88, 30, 6, 30);
        ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.fire === 'alarm' ? 'FIRE ALARM' : 'FIRE POINT', 64, 142, 118);
        speckle(ctx, 128, 160, mood.wear * 40, '#8a6a60', 5);
      });
      const plate = s.mesh(new THREE.PlaneGeometry(0.3, 0.375), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), [out + 0.004, 1.72, 0]);
      plate.rotation.y = Math.PI / 2;
      if (a.fire === 'alarm') {
        s.box([0.07, 0.13, 0.13], [out + 0.035, 1.32, 0], red);
        s.box([0.01, 0.07, 0.07], [out + 0.072, 1.32, 0], s.material('#f0f0ea'));
        s.rod([out + 0.02, 1.385, 0.1], [out + 0.02, H - 0.26, 0.1], 0.012, steel);
        s.box([0.04, 0.03, 0.03], [out + 0.02, 1.38, 0.08], steel);
      } else {
        s.box([0.02, 0.08, 0.16], [out + 0.01, 1.22, 0], dark);
        s.box([0.1, 0.012, 0.03], [out + 0.05, 1.2, 0], dark);
        s.ring(0.062, 0.008, [out + 0.085, 0.72, 0], dark).rotation.x = Math.PI / 2;
        if (a.fire === 'extinguisher') {
          const x = out + 0.085;
          s.cylinder(0.062, 0.062, 0.42, [x, 0.9, 0], red, 18);
          s.ball([0.062, 0.04, 0.062], [x, 1.11, 0], red, 14);
          s.cylinder(0.062, 0.062, 0.12, [x, 0.92, 0], s.material('#f0ede0'), 18).scale.set(1.01, 1, 1.01);
          s.cylinder(0.02, 0.025, 0.07, [x, 1.17, 0], dark, 10);
          s.box([0.03, 0.02, 0.12], [x, 1.215, 0.03], dark).rotation.x = -0.25;
          s.tube([[x, 1.17, -0.03], [x + 0.03, 1.1, -0.085], [x + 0.02, 0.9, -0.08], [x, 0.78, -0.07]], 0.009, dark);
        } else {
          // Dust shadow where it hung, and a zip tie.
          s.box([0.004, 0.44, 0.13], [out + 0.004, 0.92, 0], s.material('#c9c7bc', { roughness: 1 }));
          s.rod([out + 0.03, 1.2, 0.02], [out + 0.05, 1.08, 0.04], 0.004, s.material('#f0f0ea'));
        }
      }
    }

    // Taped paper on the front face, below the marking.
    const paperAt = (map: THREE.Texture, w: number, hgt: number, x: number, y: number, tilt: number, lift = 0) => {
      const geometry = new THREE.PlaneGeometry(w, hgt, 4, 4);
      const p = geometry.attributes.position;
      // A corner peels away from the concrete.
      for (let i = 0; i < p.count; i++) { const cx = p.getX(i) / w + 0.5, cy = 0.5 - p.getY(i) / hgt; p.setZ(i, Math.max(0, cx + cy - 1.2) ** 2 * lift); }
      geometry.computeVertexNormals();
      const sheet = s.mesh(geometry, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide }), [x, y, out + 0.006]);
      sheet.rotation.z = tilt;
      const tape = s.material('#d8cf9c', { roughness: 0.6 });
      for (const sx of [-1, 1]) s.box([0.07, 0.025, 0.002], [x + sx * (w / 2 - 0.01) * Math.cos(tilt) - (hgt / 2 - 0.01) * Math.sin(tilt), y + (hgt / 2 - 0.01) * Math.cos(tilt) + sx * (w / 2 - 0.01) * Math.sin(tilt), out + 0.008], tape).rotation.z = tilt + sx * -0.7;
      return sheet;
    };
    const yellowing = (ctx: CanvasRenderingContext2D, w: number, hgt: number) => { ctx.fillStyle = `rgba(150,110,40,${mood.wear * 0.3})`; ctx.fillRect(0, 0, w, hgt); };
    const py = a.coverage === 'half' ? 1.0 : 1.08;
    if (a.taped === 'missing' || a.taped === 'cat') {
      const cat = a.taped === 'cat';
      const map = paint(256, 340, (ctx) => {
        ctx.fillStyle = '#f3f0e4'; ctx.fillRect(0, 0, 256, 340);
        ctx.fillStyle = cat ? '#c8281e' : '#111'; ctx.textAlign = 'center'; ctx.font = 'bold 50px sans-serif';
        ctx.fillText(cat ? 'LOST CAT' : 'MISSING', 128, 54, 236);
        ctx.fillStyle = '#9a9a94'; ctx.fillRect(48, 72, 160, 160);
        ctx.fillStyle = '#3a3a38';
        if (cat) { ctx.beginPath(); ctx.ellipse(128, 170, 46, 40, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(86, 150); ctx.lineTo(92, 104); ctx.lineTo(120, 136); ctx.fill(); ctx.beginPath(); ctx.moveTo(170, 150); ctx.lineTo(164, 104); ctx.lineTo(136, 136); ctx.fill(); ctx.fillStyle = '#d8d8d0'; ctx.fillRect(108, 160, 10, 6); ctx.fillRect(138, 160, 10, 6); }
        else { ctx.beginPath(); ctx.arc(128, 136, 34, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(128, 236, 62, 54, 0, Math.PI, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#222';
        for (let i = 0; i < 4; i++) ctx.fillRect(34, 250 + i * 18, 188 - (i === 3 ? 70 : random() * 30), 7);
        ctx.font = 'bold 24px sans-serif'; ctx.fillText(cat ? 'REWARD' : 'LAST SEEN LVL ' + text, 128, 332, 236);
        yellowing(ctx, 256, 340);
      });
      paperAt(map, 0.3, 0.4, (random() - 0.5) * 0.14, py, (random() - 0.5) * 0.14, mix(0.05, 0.5, mood.wear));
    } else if (a.taped === 'notice') {
      const map = paint(256, 340, (ctx) => {
        ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, 256, 340);
        ctx.fillStyle = '#1f4fa8'; ctx.fillRect(0, 0, 256, 62);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = 'bold 40px sans-serif'; ctx.fillText('NOTICE', 128, 46);
        ctx.fillStyle = '#222';
        for (let i = 0; i < 10; i++) ctx.fillRect(22, 86 + i * 20, 212 - random() * 60, 7);
        ctx.fillStyle = '#c8281e'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('GATES LOCKED 23:00', 128, 320, 236);
        yellowing(ctx, 256, 340);
      });
      const sheet = paperAt(map, 0.3, 0.4, 0, py + 0.02, 0, 0);
      s.box([0.34, 0.44, 0.008], [0, sheet.position.y, out + 0.002], steel);
    } else if (a.taped === 'tabs') {
      const gone = Array.from({ length: 8 }, () => random() < mix(0.25, 0.75, mood.density));
      const map = paint(256, 300, (ctx) => {
        ctx.fillStyle = ['#f6e58a', '#f3c9d6', '#cfe8c4', '#f3f0e4'][Math.floor(random() * 4)]; ctx.fillRect(0, 0, 256, 300);
        ctx.fillStyle = '#1d1d1d'; ctx.textAlign = 'center'; ctx.font = 'bold 34px sans-serif';
        ctx.fillText(['ROOM TO LET', 'GUITAR LESSONS', 'CAR FOR SALE', 'DID YOU SEE IT?'][Math.floor(random() * 4)], 128, 44, 236);
        for (let i = 0; i < 6; i++) ctx.fillRect(26, 70 + i * 22, 204 - random() * 70, 7);
        for (let i = 0; i < 8; i++) { ctx.fillStyle = gone[i] ? '#b4b2a8' : '#1d1d1d'; ctx.fillRect(i * 32, 216, gone[i] ? 32 : 2, 84); if (!gone[i]) for (let k = 0; k < 6; k++) ctx.fillRect(i * 32 + 12, 226 + k * 11, 9, 6); }
      });
      paperAt(map, 0.3, 0.35, (random() - 0.5) * 0.1, py, (random() - 0.5) * 0.1, 0.1);
    } else if (a.taped === 'remnants') {
      const scrap = s.material('#e6e0c8', { roughness: 0.95 }), tape = s.material('#c9b86a', { roughness: 0.6 });
      for (let i = 0; i < 7; i++) {
        const x = (random() - 0.5) * 0.46, y = py - 0.25 + random() * 0.5;
        const t = s.mesh(new THREE.CircleGeometry(0.03 + random() * 0.04, 3), i % 2 ? scrap : tape, [x, y, out + 0.006]);
        t.rotation.z = random() * 6;
        s.box([0.07, 0.022, 0.002], [x, y + 0.02, out + 0.008], tape).rotation.z = random() * 3;
      }
    }

    // CCTV dome on a bracket under the slab, with its conduit.
    let lens: THREE.Mesh | null = null;
    if (a.camera) {
      const x = -(h + 0.26), z = 0.12;
      s.box([0.32, 0.05, 0.08], [-(h + 0.14), H - 0.5, z], dark);
      s.cylinder(0.1, 0.1, 0.05, [x, H - 0.545, z], s.material('#eceee8'), 18);
      s.ball([0.09, 0.09, 0.09], [x, H - 0.58, z], s.material('#15181a', { roughness: 0.15, metalness: 0.4 }), 18);
      lens = s.ball([0.016, 0.016, 0.016], [x, H - 0.63, z + 0.066], new THREE.MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff2a1a', emissiveIntensity: 2.5 }), 8);
      s.rod([-(h + 0.012), H - 0.47, z], [-(h + 0.012), H - 0.27, z], 0.012, steel);
    }

    // Drift of leaves and grit at the foot, more with density.
    const litter = Math.round(mood.density * 14 * (0.4 + mood.wear));
    if (litter) s.scatter(new THREE.TetrahedronGeometry(1, 0), s.material('#8a6a3a', { roughness: 1 }), Array.from({ length: litter }, () => { const t = random() * Math.PI * 2, r = out + 0.06 + random() * 0.22; return { at: [Math.cos(t) * r, 0.012, Math.sin(t) * r] as const, size: 0.018 + random() * 0.03, color: ['#8a6a3a', '#6e5a3c', '#a88a4a', '#d8d4c4'][Math.floor(random() * 4)] }; }));

    return s.finish({
      footprint: 0.75,
      update: lens ? (_dt, time) => { ((lens as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(time * mix(1.5, 7, mood.energy)) > 0.6 ? 3 : 0.3; } : undefined,
    });
  },
});
