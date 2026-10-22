import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score, visibleBounds } from '@conjure/kit';

const COLOURS = {
  red: 'Boxcar red, the classic railway-company oxide.',
  white: 'Whitewashed boards with dark trim, bright against the sky.',
  tin: 'Sheathed in silver pressed tin that flashes in the sun.',
  grey: 'Bare weathered grey wood, paint long gone.',
  green: 'Deep co-operative green with white lettering.',
  ochre: 'Mustard-orange, a private grain company colour.',
} as const;
const BASE: Record<keyof typeof COLOURS, string> = {
  red: '#8a3423', white: '#e6e1d2', tin: '#b3babd', grey: '#8b857a', green: '#3c6649', ochre: '#c58a2e',
};
const INK: Record<keyof typeof COLOURS, string> = {
  red: '#f1ead8', white: '#2a2622', tin: '#27323a', grey: '#e4ddcc', green: '#f1ead8', ochre: '#3a2414',
};
const TOWNS = {
  plenty: 'PLENTY, a promise of abundance.',
  hope: 'HOPE, small and stubborn.',
  forget: 'FORGET, a town asking to be left behind.',
  success: 'SUCCESS, painted with a straight face.',
  paradise: 'PARADISE, far from any.',
  endurance: 'ENDURANCE, a long hard name.',
  eldorado: 'ELDORADO, gold that was only wheat.',
  blank: 'No name at all, the wall left bare.',
} as const;
const BANNERS = {
  pool: 'POOL, the farmers’ wheat pool.',
  coop: 'CO-OP, owned by the members.',
  growers: 'GRAIN GROWERS, an old company name.',
  union: 'FARMERS UNION.',
  sale: 'FOR SALE, daubed by hand.',
  none: 'Nothing but the town name.',
} as const;
const BANNER_TEXT: Record<keyof typeof BANNERS, string> = {
  pool: 'POOL', coop: 'CO-OP', growers: 'GRAIN GROWERS', union: 'FARMERS UNION', sale: 'FOR SALE', none: '',
};

const profile = (points: readonly (readonly [number, number])[], depth: number) => {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
};

/** A four-sided taper from one rectangle up to a smaller one: the elevator's shoulders. */
const taper = (w0: number, d0: number, w1: number, d1: number, h: number) => {
  const lo = [[-w0 / 2, 0, d0 / 2], [w0 / 2, 0, d0 / 2], [w0 / 2, 0, -d0 / 2], [-w0 / 2, 0, -d0 / 2]];
  const hi = [[-w1 / 2, h, d1 / 2], [w1 / 2, h, d1 / 2], [w1 / 2, h, -d1 / 2], [-w1 / 2, h, -d1 / 2]];
  const v: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    v.push(...lo[i], ...lo[j], ...hi[j], ...lo[i], ...hi[j], ...hi[i]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geometry.computeVertexNormals();
  return geometry;
};

export default defineThing({
  questions: {
    colour: choice('What colour is the elevator?', COLOURS),
    town: choice('What town name is painted across the side?', TOWNS),
    banner: choice('What is lettered above the town name?', BANNERS),
    legible: score('How well can the lettering still be read?', ['A ghost you have to squint for', 'Faded and streaked', 'Clear', 'Freshly painted this season']),
    state: choice('What state is the elevator in?', {
      working: 'In business: drive door open, loading spout swung out, a lamp in the office.',
      shuttered: 'Closed for good: doors nailed over with boards, spout gone, windows blind.',
      leaning: 'Abandoned and leaning out of plumb, propped with timbers, boards dropping off.',
      stripped: 'Half salvaged: the cupola reduced to a bare frame and siding torn away near the top.',
    }),
    annex: choice('What stands against its side?', {
      sloped: 'A tall crib annex with a single sloping roof leaning on the main house.',
      twin: 'A second, shorter elevator house joined on, the twin.',
      none: 'Nothing: the single tower stands alone.',
    }),
    birds: noul('Are pigeons lined along the roof?'),
    flag: noul('Is a flag flying from the cupola?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const lean = new THREE.Group();
    s.root.add(lean);
    const L = <T extends THREE.Object3D>(node: T) => { lean.add(node); return node; };
    const derelict = a.state === 'leaning' || a.state === 'stripped';
    const wear = Math.min(1, mood.wear + (derelict ? 0.3 : a.state === 'shuttered' ? 0.12 : 0));
    const tin = a.colour === 'tin';
    const base = new THREE.Color(BASE[a.colour]);
    base.lerp(new THREE.Color('#8f887b'), wear * (a.colour === 'grey' ? 0.2 : 0.45));
    base.lerp(new THREE.Color(mood.warmth > 0.5 ? '#d9a560' : '#8fa2b5'), Math.abs(mood.warmth - 0.5) * 0.18);

    const paintBoards = (ctx: CanvasRenderingContext2D, w: number, h: number, rows: number) => {
      ctx.fillStyle = `#${base.getHexString()}`;
      ctx.fillRect(0, 0, w, h);
      const step = h / rows;
      for (let i = 0; i < rows; i++) {
        const r = random();
        ctx.fillStyle = r < wear * (tin ? 0.1 : 0.28) ? `rgba(70,62,54,${0.25 + random() * 0.5})` : `rgba(${r > 0.5 ? '255,255,255' : '0,0,0'},${random() * (0.05 + wear * 0.12)})`;
        if (tin) ctx.fillRect(0, i * step, w, step);
        else {
          let x = 0;
          while (x < w) {
            const run = w * (0.15 + random() * 0.5);
            ctx.fillRect(x, i * step, run, step);
            x += run;
            ctx.fillStyle = `rgba(${random() > 0.5 ? '255,255,255' : '0,0,0'},${random() * (0.05 + wear * 0.14)})`;
          }
        }
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(0, (i + 1) * step - 1.5, w, 1.5);
      }
      if (tin) {
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        for (let x = 0; x < w; x += w / 10) ctx.fillRect(x, 0, 1.5, h);
      }
      // Rain streaks and rust run down from the eaves as it ages.
      for (let i = 0; i < wear * 26; i++) {
        const x = random() * w, len = h * (0.1 + random() * 0.5);
        const g = ctx.createLinearGradient(0, 0, 0, len);
        g.addColorStop(0, tin ? 'rgba(120,62,30,0.55)' : 'rgba(50,44,38,0.4)');
        g.addColorStop(1, 'rgba(60,50,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 3 + random() * 9, len);
      }
    };
    const siding = (height: number, width = 8) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 512;
      paintBoards(canvas.getContext('2d')!, 256, 512, Math.max(6, Math.round(height / 0.42)));
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      void width;
      return new THREE.MeshStandardMaterial({ map, roughness: tin ? 0.45 : 0.9, metalness: tin ? 0.45 : 0 });
    };
    const roofTint = new THREE.Color(tin ? '#9aa1a3' : a.colour === 'white' ? '#3d4a44' : '#4a423b').lerp(new THREE.Color('#8a5a3a'), wear * 0.4);
    const roof = new THREE.MeshStandardMaterial({ color: roofTint, roughness: 0.8, metalness: tin ? 0.4 : 0.05, side: THREE.DoubleSide });
    const trim = s.material(a.colour === 'white' ? '#3d4a44' : '#e9e3d2');
    const flat = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.93), roughness: 0.9, metalness: tin ? 0.4 : 0 });
    const dark = s.material('#1d1a17', { roughness: 1 });
    const timber = s.material('#6f5d49');
    const concrete = s.material('#a9a498');

    // Main house: crib tower, shoulders, cupola.
    const W = 9.2, D = 9, H = 19 + random() * 2.5;
    const cw = 4.4, cd = 7.4, ch = 4.2, sh = 2.6;
    L(s.box([W, H + 1.4, D], [0, (H - 1.4) / 2, 0], siding(H + 1.4)));
    L(s.box([W + 0.5, 0.5, D + 0.5], [0, 0.25, 0], concrete));
    L(s.mesh(taper(W + 0.5, D + 0.5, cw + 0.3, cd + 0.3, sh), roof, [0, H, 0]));
    const top = H + sh;
    const stripped = a.state === 'stripped';
    if (stripped) {
      for (const x of [-1, 1]) for (const z of [-1, 0, 1]) L(s.rod([x * cw / 2, top - 0.3, z * cd / 2], [x * cw / 2, top + ch, z * cd / 2], 0.11, timber));
      for (const y of [ch * 0.5, ch]) {
        for (const x of [-1, 1]) L(s.rod([x * cw / 2, top + y, -cd / 2], [x * cw / 2, top + y, cd / 2], 0.09, timber));
        for (const z of [-1, 0, 1]) L(s.rod([-cw / 2, top + y, z * cd / 2], [cw / 2, top + y, z * cd / 2], 0.09, timber));
      }
      for (const z of [-1, 0, 1]) for (const x of [-1, 1]) L(s.rod([x * cw / 2, top + ch, z * cd / 2], [0, top + ch + 1.5, z * cd / 2], 0.08, timber));
      L(s.rod([0, top + ch + 1.5, -cd / 2], [0, top + ch + 1.5, cd / 2], 0.08, timber));
      L(s.box([1.1, ch, 1.1], [0.3, top + ch / 2, 0], dark));
      // Bare crib showing where the siding was pulled off.
      for (let i = 0; i < 5; i++) {
        const pw = 1.4 + random() * 2.6, ph = 1 + random() * 2.4;
        L(s.box([pw, ph, 0.05], [(random() - 0.5) * (W - pw), H - 0.4 - ph / 2 - random() * 3.5, D / 2 + 0.035], s.material('#4f4335')));
      }
    } else {
      L(s.box([cw, ch, cd], [0, top + ch / 2, 0], siding(ch)));
      L(s.mesh(profile([[-cw / 2 - 0.35, 0], [cw / 2 + 0.35, 0], [0, 1.7]], cd + 0.7), roof, [0, top + ch, 0]));
      for (const z of [-1, 1]) for (const x of [-0.9, 0.9]) {
        L(s.box([0.75, 1, 0.06], [x, top + ch * 0.55, z * (cd / 2 + 0.02)], dark));
        L(s.box([0.9, 0.09, 0.09], [x, top + ch * 0.55 - 0.55, z * (cd / 2 + 0.04)], trim));
      }
      for (const x of [-1, 1]) L(s.box([0.06, 1, 0.75], [x * (cw / 2 + 0.02), top + ch * 0.55, 0], dark));
    }
    const peak = top + ch + (stripped ? 1.5 : 1.7);
    // Corner boards and a lightning rod.
    for (const x of [-1, 1]) for (const z of [-1, 1]) L(s.box([0.22, H, 0.22], [x * W / 2, H / 2, z * D / 2], trim));
    L(s.rod([0, peak - 0.1, 0], [0, peak + 1.6, 0], 0.035, dark));
    const vane = new THREE.Group();
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 0.03), dark);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.03), dark);
    fin.position.x = -0.6;
    vane.add(arrow, fin);
    vane.position.set(0, peak + 1.25, 0);
    vane.rotation.y = random() * 6;
    L(vane);

    // The painted face.
    const town = a.town === 'blank' ? '' : a.town.toUpperCase();
    const banner = BANNER_TEXT[a.banner];
    {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = Math.round(512 * H / W);
      const ctx = canvas.getContext('2d')!;
      const cwid = canvas.width, chei = canvas.height;
      paintBoards(ctx, cwid, chei, Math.round(H / 0.42));
      const alpha = mix(0.3, 1, a.legible) * mix(1, 0.6, wear);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = a.banner === 'sale' ? (a.colour === 'white' || a.colour === 'tin' ? '#a3271c' : '#f4efe0') : INK[a.colour];
      if (town) {
        ctx.font = `bold ${Math.min(150, (cwid * 1.5) / town.length)}px Georgia, serif`;
        ctx.fillText(town, cwid / 2, chei * 0.47, cwid * 0.9);
      }
      if (banner) {
        const words = banner.split(' ');
        ctx.font = `bold ${a.banner === 'sale' ? 'italic ' : ''}${Math.min(96, (cwid * 1.35) / Math.max(...words.map((word) => word.length)))}px ${a.banner === 'sale' ? 'cursive' : 'Arial, sans-serif'}`;
        words.forEach((word, index) => ctx.fillText(word, cwid / 2, chei * (town ? 0.2 : 0.38) + index * 96, cwid * 0.88));
        if (a.banner !== 'sale') {
          ctx.lineWidth = 7;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.strokeRect(cwid * 0.06, chei * (town ? 0.2 : 0.38) - 70, cwid * 0.88, words.length * 96 + 44);
        }
      }
      // Boards show through old paint.
      ctx.globalAlpha = mix(0.75, 0.1, a.legible);
      ctx.fillStyle = `#${base.getHexString()}`;
      const rows = Math.round(H / 0.42);
      for (let i = 0; i < rows; i++) if (random() < 0.55) ctx.fillRect(random() * cwid * 0.5, i * chei / rows, cwid * (0.2 + random() * 0.6), chei / rows * 0.8);
      ctx.globalAlpha = 1;
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = 4;
      L(s.mesh(new THREE.PlaneGeometry(W - 0.2, H), new THREE.MeshStandardMaterial({ map, roughness: tin ? 0.5 : 0.9, metalness: tin ? 0.35 : 0 }), [0, H / 2, D / 2 + 0.02]));
    }

    // Annex on the +x side.
    if (a.annex === 'sloped') {
      const aw = 6.4, ah = H * 0.72, drop = 3.4, ad = D - 0.8;
      L(s.box([aw, ah - drop + 1.4, ad], [W / 2 + aw / 2, (ah - drop - 1.4) / 2, 0], siding(ah - drop + 1.4)));
      L(s.mesh(profile([[0, ah - drop], [aw, ah - drop], [0, ah]], ad), flat, [W / 2, 0, 0]));
      L(s.mesh(profile([[-0.1, ah + 0.12], [aw + 0.5, ah - drop - 0.22], [aw + 0.5, ah - drop - 0.02], [-0.1, ah + 0.32]], ad + 0.6), roof, [W / 2, 0, 0]));
      for (const z of [-1, 1]) L(s.box([0.2, ah - drop, 0.2], [W / 2 + aw, (ah - drop) / 2, z * ad / 2], trim));
    } else if (a.annex === 'twin') {
      const tw = 7, th = H * 0.78, td = D - 1;
      const x = W / 2 + tw / 2;
      L(s.box([tw, th + 1.4, td], [x, (th - 1.4) / 2, 0], siding(th + 1.4)));
      L(s.mesh(taper(tw + 0.4, td + 0.4, 3.2, td - 2, 2), roof, [x, th, 0]));
      L(s.box([3, 2.6, td - 2.2], [x, th + 2 + 1.3, 0], siding(2.6)));
      L(s.mesh(profile([[-1.8, 0], [1.8, 0], [0, 1.2]], td - 1.6), roof, [x, th + 4.6, 0]));
      for (const z of [-1, 1]) L(s.box([0.2, th, 0.2], [x + tw / 2, th / 2, z * td / 2], trim));
    }

    // Drive shed and office on the -x side stay plumb: they were rebuilt or simply lower.
    const dw = 5.2, dh = 5.4, dd = 11.5, dx = -W / 2 - dw / 2;
    s.box([dw, dh, dd], [dx, dh / 2, 0], siding(dh));
    s.mesh(profile([[-dw / 2, dh], [dw / 2, dh], [dw / 2, dh + 1.8]], dd), flat, [dx, 0, 0]);
    s.mesh(profile([[-dw / 2 - 0.4, dh - 0.1], [dw / 2, dh + 1.82], [dw / 2, dh + 2], [-dw / 2 - 0.4, dh + 0.1]], dd + 0.7), roof, [dx, 0, 0]);
    const open = a.state === 'working';
    for (const z of [-1, 1]) {
      s.box([3.6, 4.2, 0.08], [dx, 2.1, z * (dd / 2 + 0.02)], open ? dark : siding(4.2));
      s.box([3.9, 0.22, 0.14], [dx, 4.3, z * (dd / 2 + 0.05)], trim);
      for (const x of [-1, 1]) s.box([0.2, 4.3, 0.14], [dx + x * 1.9, 2.15, z * (dd / 2 + 0.05)], trim);
      // Earth ramp up to the driveway.
      const ramp = s.mesh(profile([[0, 0], [5.5, 0], [0, 0.55]], 4.4), s.material('#9c8a69'), [dx, 0, z * (dd / 2)]);
      ramp.rotation.y = z > 0 ? -Math.PI / 2 : Math.PI / 2;
    }
    if (!open) {
      for (const [y, tilt] of [[1.4, 0.12], [2.7, -0.09], [3.5, 0.2]] as const) s.box([4.1, 0.26, 0.07], [dx, y, dd / 2 + 0.1], timber).rotation.z = tilt + (random() - 0.5) * 0.1;
    } else {
      // A slice of the lit work floor and a sack barrow in the doorway.
      s.box([3.4, 0.08, 0.5], [dx, 0.5, dd / 2 - 0.3], s.material('#b89a5e'));
      s.box([0.5, 0.9, 0.35], [dx + 1.1, 1, dd / 2 + 0.1], s.material('#c9b98f'));
    }
    const ox = dx - dw / 2 - 1.7, oz = dd / 2 - 2.2;
    s.box([3.4, 3, 3.6], [ox, 1.5, oz], siding(3));
    s.mesh(profile([[-2, 0], [2, 0], [0, 1.1]], 4.2), roof, [ox, 3, oz]);
    const glow = open ? mix(1.4, 0.25, Math.sin(mood.daylight * Math.PI)) : 0;
    const pane = s.material(open ? '#f2d58a' : '#39424a', { emissive: '#ffcf6b', emissiveIntensity: glow, roughness: 0.3 });
    s.box([1.2, 1, 0.06], [ox, 1.75, oz + 1.82], a.state === 'shuttered' ? timber : pane);
    s.box([1.4, 0.1, 0.1], [ox, 1.2, oz + 1.84], trim);
    s.box([0.9, 2, 0.06], [ox - 1.72, 1, oz], dark);
    s.cylinder(0.11, 0.11, 1.6, [ox + 0.9, 4, oz - 0.6], dark, 8);
    if (open) s.label('OFFICE', 1.5, 0.34, [ox, 2.7, oz + 1.83], INK[a.colour], `#${base.getHexString()}`);

    // Loading spout swung out toward the track behind.
    if (open) {
      const sx = a.annex === 'none' ? 0 : -1.5;
      L(s.rod([sx, H * 0.78, -D / 2], [sx, H * 0.3, -D / 2 - 4.2], 0.2, s.material('#8f9596', { metalness: 0.6, roughness: 0.4 })));
      L(s.rod([sx, H * 0.78, -D / 2 - 0.1], [sx, H * 0.86, -D / 2 - 3], 0.03, dark));
    }

    // Abandonment: props, dropped boards, weeds.
    let tilt = 0;
    if (a.state === 'leaning') {
      tilt = (random() > 0.5 ? 1 : -1) * mix(0.06, 0.12, random());
      if (a.annex !== 'none') tilt = -Math.abs(tilt);
      const side = tilt < 0 ? 1 : -1;
      const reach = (a.annex === 'sloped' ? W / 2 + 6.4 : a.annex === 'twin' ? W / 2 + 7 : W / 2) * side;
      for (const z of [-2.6, 0, 2.6]) {
        const foot = reach + side * (4.5 + random());
        L(s.rod([foot, -foot * Math.tan(tilt) * -1 * 0 - 0.3, z], [reach, 6.5 + random() * 1.5, z], 0.16, timber));
      }
      for (let i = 0; i < 9; i++) {
        const board = s.box([1.6 + random() * 2.4, 0.05, 0.22], [(random() - 0.5) * 12, 0.04 + random() * 0.08, D / 2 + 1 + random() * 3.5], timber);
        board.rotation.y = random() * Math.PI;
      }
    }
    lean.rotation.z = tilt;
    if (derelict || a.state === 'shuttered') {
      const weeds = [];
      for (let i = 0; i < 40 + wear * 50; i++) {
        const along = (random() - 0.5) * (W + 14);
        weeds.push({ at: [along - 2, 0.15 + random() * 0.25, (random() > 0.3 ? 1 : -1) * (D / 2 + 0.4 + random() * 2.2)] as const, size: 0.35 + random() * 0.6, color: random() > 0.5 ? '#a89a52' : '#7d8048' });
      }
      s.scatter(new THREE.ConeGeometry(0.4, 1.3, 5), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds);
    }
    if (a.birds) {
      const birds = [];
      const count = 7 + Math.floor(random() * 12);
      for (let i = 0; i < count; i++) {
        const onRidge = random() > 0.4 && !stripped;
        birds.push({ at: (onRidge ? [0, peak + 0.12, (random() - 0.5) * cd] : [(random() > 0.5 ? 1 : -1) * (cw / 2 + 0.3 + random() * 1.6), H + sh - 0.2 - random() * 0.2, (random() - 0.5) * cd]) as readonly [number, number, number], size: 0.9 + random() * 0.4, color: random() > 0.7 ? '#d8d6d0' : '#4b4d55' });
      }
      const flock = s.scatter(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.9 }), birds.map((bird) => bird.at[1] < peak ? { ...bird, at: [bird.at[0], H + sh * (1 - (Math.abs(bird.at[0]) - cw / 2) / ((W - cw) / 2)) + 0.15, bird.at[2]] as const } : bird));
      L(flock);
    }
    let cloth: THREE.Mesh | null = null;
    if (a.flag) {
      L(s.rod([cw / 2 - 0.3, peak - 1.2, cd / 2 - 0.3], [cw / 2 - 0.3, peak + 3.4, cd / 2 - 0.3], 0.05, trim));
      const geometry = new THREE.PlaneGeometry(2.4, 1.3, 12, 1);
      geometry.translate(1.2, 0, 0);
      cloth = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: mood.cheer > 0.5 ? '#c8372d' : '#7a6f66', side: THREE.DoubleSide, roughness: 0.9 }));
      cloth.position.set(cw / 2 - 0.3, peak + 2.7, cd / 2 - 0.3);
      cloth.castShadow = true;
      L(cloth);
    }

    const low = Math.min(0, visibleBounds(s.root).min.y);
    const flagBase = cloth ? Float32Array.from(cloth.geometry.attributes.position.array) : null;
    const thing = s.finish({
      update: (dt, time) => {
        vane.rotation.y += Math.sin(time * 0.7) * dt * mix(0.1, 1.6, mood.energy);
        if (cloth && flagBase) {
          const position = cloth.geometry.attributes.position;
          for (let i = 0; i < position.count; i++) {
            const x = flagBase[i * 3];
            position.setZ(i, Math.sin(x * 3 - time * mix(1, 9, mood.energy)) * 0.12 * x * mix(0.3, 1, mood.energy));
            position.setY(i, flagBase[i * 3 + 1] - x * mix(0.35, 0.02, mood.energy));
          }
          position.needsUpdate = true;
        }
      },
    });
    thing.object.position.y += low;
    return thing;
  },
});
