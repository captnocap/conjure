import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type V3 = readonly [number, number, number];

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function skirt(L: number, W: number, top: number, drop: number, ripple: number, phase: number) {
  const per = 2 * (L + W), n = 160, rows = 4;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = ((i % n) / n) * per;
    let x: number, z: number, nx: number, nz: number;
    if (d < L) { x = -L / 2 + d; z = W / 2; nx = 0; nz = 1; }
    else if (d < L + W) { x = L / 2; z = W / 2 - (d - L); nx = 1; nz = 0; }
    else if (d < 2 * L + W) { x = L / 2 - (d - L - W); z = -W / 2; nx = 0; nz = -1; }
    else { x = -L / 2; z = -W / 2 + (d - 2 * L - W); nx = -1; nz = 0; }
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const off = 0.006 + ripple * t * (0.5 + 0.5 * Math.sin(d * 19 + phase + Math.sin(d * 5.3) * 1.4));
      pos.push(x + nx * off, top - drop * t, z + nz * off);
    }
  }
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
    const a = i * (rows + 1) + r, b = a + rows + 1;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const OCCASIONS = {
  funeral: { wood: '#4a3022', cloth: '#1f1d22', metal: '#b89a4e', notice: 'BOOK OF CONDOLENCE' },
  church: { wood: '#6b4526', cloth: '#5b2a6e', metal: '#c9a044', notice: 'IN MEMORIAM' },
  wedding: { wood: '#e9e2d2', cloth: '#f4efe2', metal: '#d9c27a', notice: 'OUR GUESTS' },
  visitor: { wood: '#c79a5e', cloth: '#2f5a44', metal: '#9aa0a3', notice: 'VISITORS BOOK' },
  civic: { wood: '#2a2c30', cloth: '#27365a', metal: '#c8ccd0', notice: 'PLEASE SIGN' },
} as const;

export default defineThing({
  questions: {
    stand: choice('What does the book rest on?', {
      lectern: 'A slim wooden lectern with a sloping top on a single column.',
      draped: 'A side table draped to the floor in cloth, the book propped on a low rest.',
      plinth: 'A solid block plinth with a sloping top, like a museum label stand.',
      iron: 'A slender wrought-iron stand on three curled feet.',
    }),
    occasion: choice('What kind of occasion does it look dressed for?', {
      funeral: 'A funeral: dark oak, black cloth, dull brass.',
      church: 'A church: mid-brown wood, purple cloth, polished brass.',
      wedding: 'A wedding: ivory and white with pale gold.',
      visitor: 'A visitor centre or museum: pale pine, green baize, plain steel.',
      civic: 'A town hall or embassy: black and navy with chrome, official.',
    }),
    book: choice('What kind of book is it?', {
      leather: 'A black leather volume with gilt page edges and a ribbon marker.',
      white: 'A white padded guest book with a satin ribbon.',
      ledger: 'A green cloth visitors\' ledger with red corners and ruled columns.',
      spiral: 'A cheap ring-bound notebook, bought that morning.',
    }),
    filled: score('How much has been written in it?', [
      'Nothing: the first page is blank',
      'Two or three names',
      'Half a page',
      'Page after page, nearly full',
    ]),
    pen: choice('Where is the pen?', {
      holder: 'Standing upright in its holder, waiting.',
      down: 'Lying across the open page, just put down mid-thought.',
      dangling: 'Hanging off the edge on its cord, still swinging.',
      gone: 'Gone: the cord ends in nothing.',
      quill: 'A white feather quill in an inkwell, no cord at all.',
    }),
    lamp: choice('What lights the page?', {
      banker: 'A brass banker\'s lamp with a green glass shade.',
      picture: 'A long brass picture light arching over the book.',
      candle: 'A candle in a glass.',
      anglepoise: 'A jointed desk lamp bent low over the page.',
      none: 'No lamp.',
    }),
    extra: choice('What else has been put with it?', {
      none: 'Nothing.',
      tissues: 'A box of tissues.',
      flower: 'A single flower in a bud vase.',
      photo: 'A small framed photograph.',
      cards: 'A stack of memorial cards and a collection tin.',
      notice: 'A printed notice on the front saying what the book is for.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => lo + (hi - lo) * random();
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const O = OCCASIONS[a.occasion];
    const wood = s.material(O.wood, { roughness: 0.5 });
    const cloth = s.material(O.cloth, { roughness: 0.9, side: THREE.DoubleSide });
    const metal = s.material(O.metal, { metalness: 0.5, roughness: 0.3 });
    const iron = s.material('#232326', { roughness: 0.6, metalness: 0.3 });

    // ---- stand: every kind ends in a sloping desk and somewhere flat to put a lamp ----
    const d = new Sculpture(context);
    s.root.add(d.root);
    let slots: V3[] = [];
    let tilt = 0.36, front: V3 = [0, 0.6, 0.1], frontW = 0.3;
    const DW = 0.64, DD = 0.46;
    const head = (y: number, mat: THREE.Material, thin = false) => {
      d.root.position.set(0, y, 0.04);
      d.box([DW, thin ? 0.014 : 0.03, DD], [0, thin ? -0.007 : -0.015, 0], mat);
      d.box([DW, 0.035, 0.018], [0, 0.012, DD / 2 - 0.009], mat);
      const back = y + Math.sin(tilt) * DD / 2;
      s.box([DW, thin ? 0.014 : 0.03, 0.16], [0, back + 0.005, -DD / 2 * Math.cos(tilt) - 0.035], mat);
      slots = [[-0.21, back + 0.02, -DD / 2 * Math.cos(tilt) - 0.035], [0.21, back + 0.02, -DD / 2 * Math.cos(tilt) - 0.035], [0, back + 0.02, -DD / 2 * Math.cos(tilt) - 0.035]];
      return back;
    };
    if (a.stand === 'lectern') {
      s.box([0.52, 0.05, 0.46], [0, 0.025, 0], wood);
      s.box([0.42, 0.03, 0.36], [0, 0.065, 0], wood);
      s.box([0.15, 0.98, 0.13], [0, 0.56, -0.02], wood);
      for (const side of [-1, 1]) s.box([0.012, 0.9, 0.135], [side * 0.08, 0.56, -0.02], s.material(new THREE.Color(O.wood).multiplyScalar(0.8)));
      const back = head(1.08, wood);
      s.box([0.5, back - 0.98, 0.03], [0, (back + 0.98) / 2, -0.24], wood);
      s.box([0.3, 0.05, 0.3], [0, 1.03, -0.03], wood);
      front = [0, 0.6, 0.047]; frontW = 0.13;
    } else if (a.stand === 'plinth') {
      const body = s.material(a.occasion === 'wedding' ? '#f6f3ea' : a.occasion === 'visitor' ? '#e9e4d6' : O.wood, { roughness: 0.6 });
      s.box([0.62, 1.0, 0.5], [0, 0.5, -0.02], body);
      s.box([0.66, 0.05, 0.54], [0, 0.025, -0.02], s.material('#2a2a2c'));
      const back = head(1.085, body);
      s.box([0.62, back - 1.0, 0.2], [0, (back + 1.0) / 2, -0.17], body);
      front = [0, 0.62, 0.232]; frontW = 0.46;
    } else if (a.stand === 'iron') {
      tilt = 0.5;
      for (let i = 0; i < 3; i++) {
        const t = i * 2.094 + Math.PI / 2;
        s.tube([[0, 0.3, 0], [Math.cos(t) * 0.12, 0.12, Math.sin(t) * 0.12], [Math.cos(t) * 0.27, 0.03, Math.sin(t) * 0.27], [Math.cos(t) * 0.33, 0.06, Math.sin(t) * 0.33]], 0.012, iron);
        s.ball([0.022, 0.022, 0.022], [Math.cos(t) * 0.33, 0.06, Math.sin(t) * 0.33], iron, 10);
      }
      s.cylinder(0.016, 0.02, 0.86, [0, 0.72, 0], iron, 12);
      for (const y of [0.34, 0.7, 1.08]) s.ball([0.032, 0.026, 0.032], [0, y, 0], y === 0.7 ? metal : iron, 12);
      const back = head(1.2, iron, true);
      for (const side of [-1, 1]) { const curl = s.ring(0.09, 0.008, [side * 0.1, 1.09, -0.01], iron, Math.PI * 1.3); curl.rotation.y = Math.PI / 2; curl.rotation.x = side * 0.4; }
      s.rod([0, 1.14, 0], [0, back, -0.24], 0.01, iron);
      front = [0, 0.9, 0.02]; frontW = 0;
    } else {
      tilt = 0.22;
      const TW = 1.0, TD = 0.56, T = 0.76;
      s.box([TW + 0.012, 0.016, TD + 0.012], [0, T - 0.008, 0], cloth);
      s.mesh(skirt(TW, TD, T - 0.002, T - 0.03, 0.035, rnd(0, 6)), cloth);
      if (a.occasion === 'wedding' || a.occasion === 'church') { const runner = s.box([0.5, 0.004, TD + 0.03], [0, T + 0.003, 0], s.material(a.occasion === 'wedding' ? '#fbf9f2' : '#c9a044', { roughness: 0.6 })); runner.receiveShadow = true; s.box([0.5, 0.3, 0.004], [0, T - 0.15, TD / 2 + 0.042], runner.material as THREE.Material); }
      d.root.position.set(0, T + 0.075, 0.04);
      d.box([0.5, 0.02, 0.36], [0, -0.01, 0], wood);
      d.box([0.5, 0.03, 0.016], [0, 0.008, 0.172], wood);
      s.box([0.46, 0.07, 0.03], [0, T + 0.035, -0.1], wood);
      slots = [[-0.37, T, -0.02], [0.37, T, -0.02], [0, T, -0.2]];
      front = [0, 0.42, TD / 2 + 0.05]; frontW = 0.5;
    }
    d.root.rotation.x = tilt;

    // ---- the book ----
    const f = a.filled;
    const ink = () => pick(['#1d2a6b', '#1d2a6b', '#1c1c20', '#2a2a2e', '#0f4a3a', '#6b1d2a']);
    const scribble = (ctx: CanvasRenderingContext2D, x: number, y: number, len: number) => {
      ctx.strokeStyle = ink(); ctx.lineWidth = rnd(1.6, 2.6); ctx.beginPath(); ctx.moveTo(x, y);
      const amp = rnd(3, 8);
      for (let px = 0; px < len; px += rnd(4, 9)) ctx.lineTo(x + px, y + (random() - 0.6) * amp * 2);
      ctx.stroke();
    };
    const page = (fill: number, title: boolean, ledger: boolean) => canvasTexture(256, 360, (ctx) => {
      ctx.fillStyle = a.book === 'spiral' ? '#fbfbf8' : new THREE.Color('#fbf6e6').lerp(new THREE.Color('#d9c9a0'), mood.wear * 0.5).getStyle(); ctx.fillRect(0, 0, 256, 360);
      if (title) {
        ctx.fillStyle = '#3a3630'; ctx.textAlign = 'center'; ctx.font = 'italic 22px serif';
        ctx.fillText({ funeral: 'In Memory', church: 'In Memory', wedding: 'Our Wedding', visitor: 'Visitors', civic: 'Condolences' }[a.occasion], 128, 150);
        ctx.fillRect(70, 170, 116, 2); ctx.fillRect(96, 182, 64, 2);
        return;
      }
      const lines = 13, top = 44, gap = 23;
      ctx.strokeStyle = ledger ? 'rgba(180,60,60,0.5)' : 'rgba(90,110,150,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i <= lines; i++) { ctx.beginPath(); ctx.moveTo(14, top + i * gap); ctx.lineTo(242, top + i * gap); ctx.stroke(); }
      if (ledger) for (const x of [70, 176]) { ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x, top + lines * gap); ctx.stroke(); }
      const written = Math.round(lines * fill);
      for (let i = 0; i < written; i++) {
        const y = top + i * gap + gap - 6;
        if (ledger) { scribble(ctx, 18, y, rnd(26, 44)); scribble(ctx, 76, y, rnd(50, 92)); if (random() < 0.7) scribble(ctx, 182, y, rnd(20, 54)); }
        else { scribble(ctx, 18 + rnd(0, 10), y, rnd(60, 215)); }
      }
      for (let i = 0; i < Math.round(mood.wear * 4 * fill); i++) { ctx.fillStyle = 'rgba(20,30,90,0.5)'; ctx.beginPath(); ctx.ellipse(rnd(20, 236), rnd(40, 320), rnd(2, 7), rnd(2, 5), rnd(0, 3), 0, 7); ctx.fill(); }
    });
    const cover = { leather: '#17161a', white: '#f6f3ec', ledger: '#2f5a44', spiral: '#2a4f8a' }[a.book];
    const BW = 0.44, BD = 0.3;
    d.box([BW + 0.02, 0.012, BD + 0.02], [0, 0.006, 0], d.material(cover, { roughness: a.book === 'white' ? 0.5 : 0.7 }));
    const tl = 0.006 + 0.03 * f, tr = 0.04 - 0.03 * f;
    const paper = d.material(a.book === 'leather' ? '#d9c27a' : '#f1ecdc', { roughness: 0.7, metalness: a.book === 'leather' ? 0.3 : 0 });
    const ledger = a.book === 'ledger';
    ([[-1, tl, f > 0.3 ? 1 : 0, f <= 0.3], [1, tr, f <= 0.3 ? f / 0.3 * 0.55 : ((f - 0.3) / 0.7) * 0.9 + 0.08, false]] as const).forEach(([side, th, fill, title]) => {
      d.box([BW / 2 - 0.008, th, BD], [side * (BW / 4 + 0.002), 0.012 + th / 2, 0], paper);
      const sheet = d.mesh(new THREE.PlaneGeometry(BW / 2 - 0.008, BD), new THREE.MeshStandardMaterial({ map: page(fill, title, ledger), roughness: 0.85 }), [side * (BW / 4 + 0.002), 0.0125 + th, 0]);
      sheet.rotation.x = -Math.PI / 2;
    });
    if (a.book === 'spiral') for (let i = 0; i < 9; i++) { const ring = d.ring(0.016, 0.003, [0, 0.03, -BD / 2 + 0.03 + i * 0.03], d.material('#c8ccd0', { metalness: 0.5 })); ring.rotation.y = Math.PI / 2; }
    else d.box([0.008, 0.003, BD], [0, 0.013 + Math.min(tl, tr), 0], d.material('#6b6250'));
    if (a.book === 'ledger') for (const sx of [-1, 1]) for (const sz of [-1, 1]) d.box([0.05, 0.014, 0.05], [sx * (BW / 2 - 0.012), 0.006, sz * (BD / 2 - 0.012)], d.material('#a3241f'));
    if (a.book === 'leather' || a.book === 'white') {
      const marker = d.box([0.014, 0.003, 0.14], [0.02, 0.016 + tr * 0.5, BD / 2 + 0.05], d.material(a.book === 'white' ? '#e9d9c0' : '#a3241f'));
      marker.rotation.y = rnd(-0.2, 0.2);
    }
    if (a.book === 'white') { const bow = d.ball([0.05, 0.012, 0.03], [-BW / 2 - 0.0, 0.02, -BD / 2 + 0.02], d.material('#f4e6d0', { roughness: 0.3 }), 10); bow.rotation.y = 0.6; }

    // ---- the pen on its cord ----
    const edge = (a.stand === 'draped' ? 0.5 : DW) / 2 - 0.02;
    const anchor: V3 = [edge, 0.005, -0.12];
    d.cylinder(0.012, 0.014, 0.012, [anchor[0], 0.006, anchor[2]], d.material(O.metal, { metalness: 0.5 }), 10);
    const penMat = d.material(a.occasion === 'wedding' ? '#d9c27a' : pick(['#17161a', '#1d2a6b', '#17161a']), { roughness: 0.3, metalness: 0.3 });
    const cordMat = d.material('#3a3a3e');
    let swing: THREE.Group | null = null;
    if (a.pen === 'holder') {
      const hx = edge - 0.03, hz = 0.0;
      d.cylinder(0.022, 0.028, 0.03, [hx, 0.015, hz], d.material(O.metal, { metalness: 0.5 }), 12);
      d.rod([hx, 0.02, hz], [hx + 0.02, 0.17, hz - 0.05], 0.0065, penMat, 0.004);
      d.tube([anchor, [edge + 0.05, 0.04, -0.09], [edge + 0.06, 0.02, -0.02], [hx + 0.015, 0.14, hz - 0.04]], 0.0025, cordMat);
    } else if (a.pen === 'down') {
      const px = rnd(0.04, 0.12), pz = rnd(-0.04, 0.06), turn = rnd(0.3, 1.2);
      const y = 0.012 + tr + 0.008;
      const tip: V3 = [px - Math.cos(turn) * 0.07, y, pz + Math.sin(turn) * 0.07], end: V3 = [px + Math.cos(turn) * 0.07, y, pz - Math.sin(turn) * 0.07];
      d.rod(tip, end, 0.004, penMat, 0.0065);
      d.tube([anchor, [edge - 0.02, 0.05, -0.1], [end[0] + 0.05, y + 0.03, end[2] - 0.02], end], 0.0025, cordMat);
    } else if (a.pen === 'dangling' || a.pen === 'gone') {
      swing = new THREE.Group();
      swing.position.set(edge + 0.022, 0, -0.12);
      swing.rotation.x = -tilt;
      d.root.add(swing);
      const length = a.pen === 'gone' ? rnd(0.2, 0.3) : rnd(0.3, 0.42);
      const inner = new THREE.Group(); swing.add(inner);
      const cord = d.rod([0, 0, 0], [0, -length, 0], 0.0025, cordMat); inner.add(cord);
      if (a.pen === 'dangling') inner.add(d.rod([0, -length, 0], [0, -length - 0.14, 0], 0.0065, penMat, 0.004));
      else inner.add(d.ball([0.006, 0.01, 0.006], [0, -length, 0], cordMat, 8));
      d.rod(anchor, [edge + 0.022, 0, -0.12], 0.0025, cordMat);
      swing.userData.inner = inner;
    } else {
      const [qx, qy, qz] = slots[1];
      s.lathe([[0.001, 0], [0.04, 0], [0.045, 0.03], [0.025, 0.05], [0.02, 0.065], [0.001, 0.065]], s.material('#1a1a20', { roughness: 0.15 }), [qx - 0.1, qy, qz]);
      s.rod([qx - 0.1, qy + 0.05, qz], [qx - 0.03, qy + 0.3, qz - 0.05], 0.004, s.material('#f4f1e8'));
      const vane = s.ball([0.03, 0.11, 0.006], [qx - 0.045, qy + 0.24, qz - 0.04], s.material('#fbf9f2', { roughness: 0.9 }), 10);
      vane.rotation.z = -0.27; vane.rotation.x = -0.2;
    }

    // ---- lamp ----
    const flames: THREE.Mesh[] = [];
    const warm = new THREE.Color().setHSL(mix(0.13, 0.08, mood.warmth), 0.9, 0.72);
    const glow = new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 1.6 });
    const [lx, ly, lz] = slots[0];
    if (a.lamp === 'banker') {
      s.lathe([[0.001, 0], [0.075, 0], [0.07, 0.015], [0.02, 0.03], [0.014, 0.1], [0.001, 0.1]], metal, [lx, ly, lz]);
      s.rod([lx, ly + 0.08, lz], [lx, ly + 0.25, lz + 0.02], 0.009, metal);
      const shade = s.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16, 1, false, 0, Math.PI), s.material('#1f6b4a', { roughness: 0.2, side: THREE.DoubleSide, emissive: '#0f3a26', emissiveIntensity: 0.6 }), [lx + 0.03, ly + 0.26, lz + 0.03]);
      shade.rotation.z = Math.PI / 2; shade.rotation.y = 0; shade.rotation.x = -Math.PI / 2 + 0.35;
      const bulb = s.cylinder(0.018, 0.018, 0.2, [lx + 0.03, ly + 0.262, lz + 0.035], glow, 8); bulb.rotation.z = Math.PI / 2; bulb.castShadow = false;
      s.rod([lx + 0.03, ly + 0.2, lz + 0.01], [lx + 0.03, ly + 0.13, lz + 0.01], 0.002, metal);
    } else if (a.lamp === 'picture') {
      const [cx, cy, cz] = slots[2];
      for (const side of [-1, 1]) s.tube([[cx + side * 0.12, cy, cz - 0.03], [cx + side * 0.12, cy + 0.22, cz - 0.03], [cx + side * 0.12, cy + 0.3, cz + 0.04], [cx + side * 0.12, cy + 0.3, cz + 0.16]], 0.007, metal);
      const shade = s.mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.42, 14, 1, false, 0, Math.PI), s.material(O.metal, { metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }), [cx, cy + 0.3, cz + 0.17]);
      shade.rotation.z = Math.PI / 2; shade.rotation.x = -Math.PI / 2 + 0.5;
      const bulb = s.cylinder(0.011, 0.011, 0.38, [cx, cy + 0.298, cz + 0.172], glow, 8); bulb.rotation.z = Math.PI / 2; bulb.castShadow = false;
    } else if (a.lamp === 'candle') {
      s.cylinder(0.045, 0.04, 0.012, [lx, ly + 0.006, lz], metal, 16);
      const tall = rnd(0.06, 0.14);
      s.cylinder(0.022, 0.022, tall, [lx, ly + 0.012 + tall / 2, lz], s.material('#f6f0dc'), 12);
      const glass = s.cylinder(0.042, 0.036, 0.19, [lx, ly + 0.105, lz], new THREE.MeshStandardMaterial({ color: '#eaf2f2', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }), 16); glass.castShadow = false;
      const flame = s.ball([0.01, 0.024, 0.01], [lx, ly + 0.04 + tall, lz], glow, 8); flame.castShadow = false; flames.push(flame);
    } else if (a.lamp === 'anglepoise') {
      const body = s.material(pick(['#b3241f', '#1c1c20', '#e9e2cf', '#2f5d8a']), { roughness: 0.35 });
      s.cylinder(0.07, 0.075, 0.022, [lx, ly + 0.011, lz], body, 18);
      const elbow: V3 = [lx - 0.06, ly + 0.26, lz - 0.05], headAt: V3 = [lx + 0.1, ly + 0.36, lz + 0.1];
      for (const off of [-0.012, 0.012]) { s.rod([lx + off, ly + 0.02, lz], [elbow[0] + off, elbow[1], elbow[2]], 0.005, metal); s.rod([elbow[0] + off, elbow[1], elbow[2]], [headAt[0] + off, headAt[1], headAt[2]], 0.005, metal); }
      s.ball([0.014, 0.014, 0.014], elbow, body, 8);
      const shade = s.mesh(new THREE.ConeGeometry(0.075, 0.11, 16, 1, true), s.material(body.color, { roughness: 0.35, side: THREE.DoubleSide }), [headAt[0] + 0.03, headAt[1] - 0.02, headAt[2] + 0.04]);
      shade.rotation.set(0.7, 0, -0.5);
      const bulb = s.ball([0.028, 0.028, 0.028], [headAt[0] + 0.04, headAt[1] - 0.045, headAt[2] + 0.06], glow, 10); bulb.castShadow = false;
    }
    // ---- extras ----
    const [ex, ey, ez] = a.pen === 'quill' ? [slots[1][0] + 0.04, slots[1][1], slots[1][2]] : slots[1];
    if (a.extra === 'tissues') {
      const tb = s.box([0.2, 0.075, 0.11], [ex, ey + 0.0375, ez], s.material(pick(['#cfe0ea', '#f1d9e0', '#e6e0c8', '#d5e6d2'])));
      tb.rotation.y = rnd(-0.25, 0.25);
      const tuft = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material('#ffffff', { flatShading: true }), [ex, ey + 0.095, ez]); tuft.scale.set(0.04, 0.035, 0.025); tuft.rotation.y = rnd(0, 3);
    } else if (a.extra === 'flower') {
      s.lathe([[0.001, 0], [0.028, 0], [0.036, 0.04], [0.014, 0.1], [0.012, 0.16], [0.018, 0.17], [0.001, 0.17]], s.material(pick(['#e9eef0', '#3f6f8a', '#f2ead7']), { roughness: 0.15 }), [ex, ey, ez]);
      const tip: V3 = [ex + rnd(-0.04, 0.04), ey + 0.36, ez + rnd(0, 0.04)];
      s.rod([ex, ey + 0.16, ez], tip, 0.004, s.material('#4f7a3a'));
      const bloom = s.mesh(new THREE.IcosahedronGeometry(1, 1), s.material(mood.cheer > 0.6 ? pick(['#e8432e', '#f2b632', '#e96aa0']) : pick(['#fbf9f2', '#a3122a', '#fbf9f2']), { flatShading: true }), tip);
      bloom.scale.set(0.04, 0.036, 0.04);
      const lf = s.mesh(new THREE.IcosahedronGeometry(1, 0), s.material('#5b8a41', { flatShading: true }), [ex + 0.02, ey + 0.25, ez]); lf.scale.set(0.045, 0.008, 0.02); lf.rotation.z = 0.5;
    } else if (a.extra === 'photo') {
      const portrait = canvasTexture(96, 120, (ctx) => {
        ctx.fillStyle = mood.warmth > 0.5 ? '#c9b18c' : '#aab3b8'; ctx.fillRect(0, 0, 96, 120);
        ctx.fillStyle = '#3f3c3a'; ctx.beginPath(); ctx.ellipse(48, 128, 42, 46, 0, 0, 7); ctx.fill();
        ctx.fillStyle = pick(['#d8b79a', '#b9835f', '#e8c4a6']); ctx.beginPath(); ctx.ellipse(48, 54, 20, 25, 0, 0, 7); ctx.fill();
        ctx.fillStyle = pick(['#e8e6e0', '#5b4a3c', '#2c2a28']); ctx.beginPath(); ctx.ellipse(48, 40, 22, 16, 0, Math.PI, 0); ctx.fill();
      });
      const frame = s.box([0.15, 0.19, 0.016], [ex, ey + 0.093, ez], metal); frame.rotation.x = -0.2;
      const face = s.mesh(new THREE.PlaneGeometry(0.12, 0.155), new THREE.MeshStandardMaterial({ map: portrait, roughness: 0.5 }), [ex, ey + 0.093, ez + 0.0095]); face.rotation.x = -0.2;
      s.rod([ex, ey + 0.15, ez - 0.02], [ex, ey, ez - 0.07], 0.005, iron);
    } else if (a.extra === 'cards') {
      for (let i = 0; i < Math.round(mix(4, 10, mood.density)); i++) { const c = s.box([0.075, 0.004, 0.11], [ex - 0.05 + rnd(-0.01, 0.01), ey + 0.002 + i * 0.004, ez + rnd(-0.01, 0.01)], s.material('#f8f4e8')); c.rotation.y = rnd(-0.3, 0.3); }
      s.cylinder(0.04, 0.04, 0.1, [ex + 0.06, ey + 0.05, ez], s.material(pick(['#b3241f', '#2f5d8a', '#2f5a44']), { roughness: 0.35 }), 16);
      s.cylinder(0.042, 0.042, 0.008, [ex + 0.06, ey + 0.104, ez], metal, 16);
      s.box([0.04, 0.003, 0.006], [ex + 0.06, ey + 0.109, ez], iron);
    } else if (a.extra === 'notice') {
      if (frontW > 0.2) {
        const note = s.label(O.notice, frontW * 0.84, frontW * 0.24, [front[0], front[1], front[2] + 0.004], a.occasion === 'wedding' ? '#8a6a2a' : '#22222a', '#f8f4e6');
        note.castShadow = false;
      } else {
        const [cx, cy, cz] = slots[2];
        const note = s.label(O.notice, 0.34, 0.1, [cx, cy + 0.07, cz + 0.02], a.occasion === 'wedding' ? '#8a6a2a' : '#22222a', '#f8f4e6');
        note.rotation.x = -0.25;
        s.box([0.36, 0.012, 0.05], [cx, cy + 0.006, cz], a.stand === 'iron' ? iron : wood);
      }
    }
    if (a.stand === 'lectern' && a.extra !== 'notice') { s.box([0.09, 0.09, 0.004], [0, 0.82, 0.047], metal); }

    const sway = mix(0.15, 0.5, mood.energy), flick = mix(0.08, 0.4, mood.energy);
    const inner = swing ? (swing.userData.inner as THREE.Group) : null;
    if (inner) inner.rotation.z = a.pen === 'dangling' ? sway * 0.5 : 0.04;
    return s.finish({
      update: (_dt, time) => {
        if (inner) inner.rotation.z = Math.sin(time * 2.6) * (a.pen === 'dangling' ? sway : 0.05);
        for (const flame of flames) flame.scale.y = 0.024 * (1 + Math.sin(time * 11) * flick * 0.5 + Math.sin(time * 27) * flick * 0.2);
      },
    });
  },
});
