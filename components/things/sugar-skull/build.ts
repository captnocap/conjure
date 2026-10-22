import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PALETTES = {
  classic: 'White sugar with a riot of magenta, turquoise, yellow and green icing.',
  noche: 'A black skull piped in glowing neon pink, lime and electric blue.',
  rosa: 'Soft pink sugar with pastel lilac, mint and cream icing, sweet and tender.',
  oro: 'White sugar dressed only in gold and deep red, formal and churchly.',
  talavera: 'White with cobalt blue and a little yellow, like painted Puebla pottery.',
  chocolate: 'A dark chocolate skull piped in white and marigold orange.',
} as const;
const COLOURS: Record<keyof typeof PALETTES, { base: string; icing: string[]; foil: string; ink: string }> = {
  classic: { base: '#f7f2e6', icing: ['#e5257e', '#18b5b0', '#f6c21c', '#49b848', '#7a3fc0', '#f2702a'], foil: '#e02a8a', ink: '#d81f6f' },
  noche: { base: '#22202a', icing: ['#ff3fa4', '#b6ff3a', '#31c8ff', '#ffd23a', '#ff7a1f'], foil: '#35d6ff', ink: '#ff3fa4' },
  rosa: { base: '#f5c3cf', icing: ['#b79be0', '#9be0c4', '#fff4dc', '#f08aa8', '#f7d98a'], foil: '#c9a4f0', ink: '#fff4dc' },
  oro: { base: '#f6f0e2', icing: ['#d9a521', '#a81a22', '#e8c14a', '#7d1018'], foil: '#e0b02a', ink: '#a81a22' },
  talavera: { base: '#f4f3ee', icing: ['#1f46b0', '#3d6fd8', '#f2c230', '#16307a'], foil: '#2a55c8', ink: '#1f46b0' },
  chocolate: { base: '#4a2a1a', icing: ['#fff3df', '#f08a1c', '#fff3df', '#f6b637'], foil: '#f39a1f', ink: '#fff3df' },
};
const NAMES = {
  abuela: 'ABUELA, for a grandmother.',
  papa: 'PAPÁ, for a father.',
  lupita: 'LUPITA, a pet name for someone dear.',
  diego: 'DIEGO, a brother, a friend, a boy.',
  frida: 'FRIDA, an artist, a heroine.',
  tu: 'TÚ: the joke skull given to the living, with your own name on it.',
  amor: 'AMOR, for a lover.',
  blank: 'No name yet: the forehead band is left empty, waiting.',
} as const;
const NAME_TEXT: Record<keyof typeof NAMES, string> = { abuela: 'Abuela', papa: 'Papá', lupita: 'Lupita', diego: 'Diego', frida: 'Frida', tu: 'Tú', amor: 'Amor', blank: '' };

export default defineThing({
  questions: {
    palette: choice('What colours is the skull made in?', PALETTES),
    ornament: score('How densely is it decorated?', ['A few plain piped lines', 'Swirls on cheeks and brow', 'Covered in curls, dots and flowers', 'Encrusted: no bare sugar left']),
    name: choice('Whose name is piped on the forehead?', NAMES),
    expression: choice('What expression does it wear?', {
      grin: 'A wide toothy grin curling up at the corners, delighted to be dead.',
      smirk: 'A lopsided smirk, one side lifted, in on the joke.',
      sombre: 'A downturned mouth, quietly mournful.',
      gasp: 'Jaw dropped open in a round gasp of surprise.',
      stitched: 'A straight stitched line of teeth, calm and unreadable.',
    }),
    eyes: choice('What fills the eye sockets?', {
      foil: 'Discs of shiny coloured foil ringed with icing petals.',
      marigold: 'A marigold bloom pressed into each socket.',
      hearts: 'Red heart shapes, lovesick.',
      hollow: 'Nothing: deep dark empty sockets.',
      sequin: 'One foil eye and one empty socket where the sequin fell out.',
    }),
    state: choice('What has happened to it?', {
      fresh: 'Freshly made and set upright, untouched.',
      crowned: 'Crowned with marigold blooms heaped on its head.',
      cracked: 'Cracked across the crown, with chips of sugar fallen beside it.',
      toppled: 'Tipped over onto its cheek among scattered petals.',
      bitten: 'A child has bitten a chunk out of the back of the crown.',
    }),
    doily: noul('Does it sit on a square of cut tissue paper?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = COLOURS[a.palette];
    const glow = a.palette === 'noche' ? 0.55 : mix(0.04, 0.22, mood.cheer);
    const sugar = s.material(pal.base, { roughness: 0.85 });
    const dark = s.material(a.palette === 'noche' || a.palette === 'chocolate' ? '#0a0808' : '#2a1c20', { roughness: 0.9 });
    const icing = pal.icing.map((c) => s.material(c, { roughness: 0.5, emissive: c, emissiveIntensity: glow }));
    const pick = () => Math.floor(random() * icing.length);
    const foil = s.material(pal.foil, { metalness: 0.7, roughness: 0.22, emissive: pal.foil, emissiveIntensity: 0.4 });
    const amount = Math.min(1, a.ornament * 0.85 + mood.density * 0.15);

    const C = new THREE.Vector3(0, 0.108, 0), R = new THREE.Vector3(0.066, 0.068, 0.076);
    const P = (lon: number, lat: number, lift = 0) => new THREE.Vector3(
      C.x + R.x * Math.sin(lon) * Math.cos(lat) * (1 + lift), C.y + R.y * Math.sin(lat) * (1 + lift), C.z + R.z * Math.cos(lon) * Math.cos(lat) * (1 + lift));
    const normal = (lon: number, lat: number) => new THREE.Vector3(Math.sin(lon) * Math.cos(lat) / R.x, Math.sin(lat) / R.y, Math.cos(lon) * Math.cos(lat) / R.z).normalize();
    const stick = <T extends THREE.Object3D>(mesh: T, lon: number, lat: number, lift = 0) => {
      mesh.position.copy(P(lon, lat, lift));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal(lon, lat));
      return mesh;
    };
    const arr = (v: THREE.Vector3) => v.toArray() as [number, number, number];

    // Skull mass: cranium, cheekbones, upper jaw and chin.
    s.ball([R.x, R.y, R.z], arr(C), sugar, 32);
    s.ball([0.05, 0.04, 0.05], [0, 0.05, 0.024], sugar, 24);
    for (const side of [-1, 1]) s.ball([0.02, 0.016, 0.022], [side * 0.043, 0.072, 0.04], sugar, 14);
    s.ball([0.034, 0.02, 0.034], [0, 0.022, 0.03], sugar, 18);

    // Eyes.
    const eyeLon = 0.42, eyeLat = -0.2;
    for (const side of [-1, 1]) {
      const lon = side * eyeLon;
      stick(s.ball([0.019, 0.021, 0.007], [0, 0, 0], dark, 20), lon, eyeLat, 0.005);
      const empty = a.eyes === 'hollow' || (a.eyes === 'sequin' && side === 1);
      if (!empty) {
        if (a.eyes === 'foil' || a.eyes === 'sequin') stick(s.ball([0.014, 0.015, 0.005], [0, 0, 0], foil, 16), lon, eyeLat, 0.07);
        else if (a.eyes === 'marigold') {
          const bloom = s.mesh(new THREE.IcosahedronGeometry(0.017, 1), s.material('#f28a12', { flatShading: true, emissive: '#f28a12', emissiveIntensity: 0.25 }));
          stick(bloom, lon, eyeLat, 0.06).scale.z = 0.55;
          stick(s.ball([0.006, 0.006, 0.004], [0, 0, 0], s.material('#c25a08'), 8), lon, eyeLat, 0.2);
        } else {
          const heart = new THREE.Shape();
          heart.moveTo(0, -0.016); heart.bezierCurveTo(0.03, 0.004, 0.012, 0.022, 0, 0.008); heart.bezierCurveTo(-0.012, 0.022, -0.03, 0.004, 0, -0.016);
          const mesh = s.mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.004, bevelEnabled: false }), s.material('#d8182c', { emissive: '#d8182c', emissiveIntensity: 0.35, roughness: 0.4 }));
          stick(mesh, lon, eyeLat, 0.06);
        }
      }
      // Petal ring round the socket.
      const petals = 10, colour = pal.icing[(side === 1 ? 0 : 1) % pal.icing.length], ring = [];
      for (let i = 0; i < petals; i++) {
        const ang = i / petals * Math.PI * 2;
        ring.push({ at: arr(P(lon + Math.cos(ang) * 0.38 / Math.cos(eyeLat), eyeLat + Math.sin(ang) * 0.39, 0.02)), size: 0.0062, color: a.ornament < 0.2 && i % 2 ? pal.base : colour });
      }
      s.scatter(new THREE.SphereGeometry(1, 10, 8), s.material('#ffffff', { roughness: 0.5, emissive: colour, emissiveIntensity: glow * 0.6 }), ring);
    }

    // Nose: an upturned dark heart.
    for (const side of [-1, 1]) {
      const n = s.ball([0.0065, 0.013, 0.004], [side * 0.0055, 0.071, 0.0745], dark, 12);
      n.rotation.z = side * 0.42;
    }

    // Mouth and teeth on the jaw.
    const jc = new THREE.Vector3(0, 0.05, 0.024), jr = new THREE.Vector3(0.05, 0.04, 0.05);
    const J = (lon: number, y: number, lift = 0.02) => {
      const f = Math.sqrt(Math.max(0.05, 1 - ((y - jc.y) / jr.y) ** 2)) * (1 + lift);
      return new THREE.Vector3(jr.x * Math.sin(lon) * f, y, jc.z + jr.z * Math.cos(lon) * f);
    };
    const mouth = { grin: { curve: 0.016, skew: 0, gap: 0.0025, span: 0.95 }, smirk: { curve: 0.006, skew: 0.009, gap: 0.002, span: 0.8 }, sombre: { curve: -0.013, skew: 0, gap: 0.002, span: 0.75 }, gasp: { curve: 0, skew: 0, gap: 0.02, span: 0.42 }, stitched: { curve: 0, skew: 0, gap: 0, span: 0.85 } }[a.expression];
    const teeth = a.expression === 'gasp' ? 5 : 9, toothMat = s.material(a.palette === 'chocolate' || a.palette === 'noche' ? pal.icing[0] : '#fffaf0', { roughness: 0.5, emissive: a.palette === 'noche' ? pal.icing[0] : '#000000', emissiveIntensity: glow });
    const line: [number, number, number][] = [];
    for (let i = 0; i < teeth; i++) {
      const t = i / (teeth - 1) * 2 - 1, lon = t * mouth.span;
      const y = 0.044 + mouth.curve * t * t + mouth.skew * t - (a.expression === 'sombre' ? -0.006 : 0.004);
      line.push(arr(J(lon, y, 0.035)));
      if (a.expression === 'gasp') continue;
      for (const row of a.expression === 'stitched' ? [0] : [-1, 1]) {
        const h = a.expression === 'stitched' ? 0.013 : 0.0075;
        const tooth = s.box([0.0068, h, 0.004], arr(J(lon, y + row * (h / 2 + mouth.gap / 2), 0.03)), toothMat);
        tooth.rotation.y = lon;
      }
    }
    if (a.expression === 'gasp') {
      const hole = s.ball([0.017, 0.017, 0.006], arr(J(0, 0.036, 0.0)), dark, 18);
      hole.position.z += 0.002;
      for (let i = 0; i < 10; i++) {
        const ang = i / 10 * Math.PI * 2;
        const tooth = s.box([0.006, 0.006, 0.004], [Math.cos(ang) * 0.017, 0.036 + Math.sin(ang) * 0.017, hole.position.z + 0.004 - Math.abs(Math.cos(ang)) * 0.003], toothMat);
        tooth.rotation.z = ang;
      }
    } else s.tube(line, a.expression === 'stitched' ? 0.0012 : 0.0018, dark);

    // Forehead name band.
    const text = NAME_TEXT[a.name];
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.lineCap = 'round';
    ctx.strokeStyle = pal.icing[1 % pal.icing.length]; ctx.lineWidth = 9;
    ctx.setLineDash([2, 22]);
    for (const y of [14, 146]) { ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(482, y); ctx.stroke(); }
    ctx.setLineDash([]);
    if (text) {
      ctx.fillStyle = pal.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `italic bold ${Math.min(112, 640 / text.length)}px Georgia, "Times New Roman", serif`;
      ctx.fillText(text, 256, 84, 440);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const band = s.mesh(new THREE.SphereGeometry(1, 28, 8, Math.PI / 2 - 0.62, 1.24, Math.PI / 2 - 0.78, 0.44),
      new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.35, roughness: 0.55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: glow }), arr(C));
    band.scale.set(R.x * 1.012, R.y * 1.012, R.z * 1.012);
    band.castShadow = false;

    // Piped swirls.
    const swirl = (lon0: number, lat0: number, size: number, turns: number, hand: number, mat: THREE.Material) => {
      const pts: [number, number, number][] = [], n = Math.round(turns * 12);
      const start = random() * 6;
      for (let k = 0; k <= n; k++) {
        const ang = start + hand * k / 12 * Math.PI * 2, r = size * (1 - k / (n + 3));
        const lat = lat0 + r * Math.sin(ang);
        pts.push(arr(P(lon0 + r * Math.cos(ang) / Math.max(0.3, Math.cos(lat)), lat, 0.018)));
      }
      s.tube(pts, 0.0021, mat);
    };
    const spots: [number, number, number][] = [[0.95, -0.12, 0.3], [1.25, 0.45, 0.26], [0.75, 0.85, 0.22], [1.7, 0.1, 0.3], [1.5, 0.95, 0.2], [2.2, 0.5, 0.3], [2.6, -0.05, 0.26], [0.3, 1.05, 0.16]];
    const swirls = Math.round(mix(1, spots.length, amount));
    for (let i = 0; i < swirls; i++) {
      const [lon, lat, size] = spots[i], mat = icing[pick()];
      const turns = mix(1, 2.1, amount);
      swirl(lon, lat, size, turns, 1, mat); swirl(-lon, lat, size, turns, -1, mat);
    }
    // Chin scroll and brow lines.
    const chinMat = icing[pick()];
    s.tube([-0.5, -0.25, 0, 0.25, 0.5].map((t) => arr(J(t * 1.2, 0.02 + Math.abs(t) * 0.012, 0.06))), 0.002, chinMat);
    for (const side of [-1, 1]) s.tube([0.15, 0.35, 0.6, 0.8].map((t) => arr(P(side * t, 0.36 - (t - 0.45) ** 2 * 0.6, 0.02))), 0.0022, icing[0]);

    // Dots: brow row, crown ring, cheek clusters.
    const dots: { at: [number, number, number]; size: number; color: string }[] = [];
    const tint = () => pal.icing[pick()];
    const crownRings = Math.round(mix(0, 4, amount));
    for (let ring = 0; ring < crownRings; ring++) {
      const lat = 1.25 - ring * 0.2, count = 6 + ring * 5, colour = tint();
      for (let i = 0; i < count; i++) dots.push({ at: arr(P(i / count * Math.PI * 2 + ring * 0.3, lat, 0.012)), size: 0.004, color: colour });
    }
    if (amount > 0.3) for (let i = -4; i <= 4; i++) dots.push({ at: arr(P(i * 0.16, 0.86 - Math.abs(i) * 0.03, 0.012)), size: 0.0042, color: tint() });
    const sprinkle = Math.round(mix(0, 150, Math.max(0, amount - 0.45) / 0.55));
    for (let i = 0; i < sprinkle; i++) {
      const lon = (random() - 0.5) * Math.PI * 2, lat = mix(-0.25, 1.4, random());
      if (Math.abs(lon) < 0.75 && lat < 0.85) continue;
      dots.push({ at: arr(P(lon, lat, 0.008)), size: mix(0.002, 0.0042, random()), color: tint() });
    }
    // Crown flower.
    const fl = { lon: 0, lat: 1.0 };
    for (let i = 0; i < 6; i++) dots.push({ at: arr(P(fl.lon + Math.cos(i * 1.047) * 0.2, fl.lat + Math.sin(i * 1.047) * 0.11, 0.015)), size: 0.0058, color: pal.icing[0] });
    dots.push({ at: arr(P(fl.lon, fl.lat, 0.03)), size: 0.005, color: pal.icing[2 % pal.icing.length] });
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) dots.push({ at: arr(J(side * (0.95 + i * 0.2), 0.058 - i * 0.008, 0.03)), size: 0.0036, color: pal.icing[1] });
    s.scatter(new THREE.SphereGeometry(1, 8, 6), s.material('#ffffff', { roughness: 0.5, emissive: '#ffffff', emissiveIntensity: glow * 0.25 }), dots);

    // State.
    const marigold = s.material('#e8780c', { flatShading: true, emissive: '#c84a00', emissiveIntensity: mix(0.05, 0.18, mood.cheer) });
    if (a.state === 'crowned') {
      const blooms = 5 + Math.floor(random() * 3);
      for (let i = 0; i < blooms; i++) {
        const lon = (i / blooms) * Math.PI * 2 + random() * 0.4, lat = i === 0 ? 1.5 : mix(0.95, 1.25, random());
        const bloom = s.mesh(new THREE.IcosahedronGeometry(mix(0.016, 0.023, random()), 1), marigold);
        stick(bloom, lon, lat, 0.12).scale.z = 0.7;
      }
    } else if (a.state === 'cracked') {
      const pts: [number, number, number][] = [];
      let lon = -0.5 + random() * 0.3;
      for (let k = 0; k < 9; k++) { lon += (random() - 0.35) * 0.3; pts.push(arr(P(lon, 1.45 - k * 0.11, 0.012))); }
      const crack = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0);
      s.mesh(new THREE.TubeGeometry(crack, 40, 0.0019, 5), dark);
      const branch = pts[4];
      s.rod(branch, arr(P(lon + 0.5, 1.0, 0.012)), 0.0015, dark, 0.0005);
    } else if (a.state === 'bitten') {
      for (let i = 0; i < 4; i++) {
        const bite = s.ball([0.022, 0.022, 0.012], [0, 0, 0], s.material(a.palette === 'chocolate' ? '#2a160c' : '#d9d0bd', { roughness: 1 }), 12);
        stick(bite, 2.1 + (i % 2) * 0.42 + random() * 0.1, 0.9 + Math.floor(i / 2) * 0.32, -0.04);
      }
    }

    // Everything so far is the skull itself; group it so it can tip over.
    const head = new THREE.Group();
    for (const child of [...s.root.children]) head.add(child);
    s.root.add(head);
    if (a.state === 'toppled') {
      head.rotation.set(0.25, 0.3, 1.25);
      head.position.set(-0.03, 0.062, 0);
    } else head.rotation.y = (random() - 0.5) * 0.3;

    if (a.state === 'cracked' || a.state === 'bitten') {
      const chips = 3 + Math.floor(random() * 4);
      for (let i = 0; i < chips; i++) {
        const chip = s.mesh(new THREE.TetrahedronGeometry(mix(0.005, 0.011, random())), sugar, [mix(-0.09, 0.09, random()), 0.004, mix(0.07, 0.11, random())]);
        chip.rotation.set(random() * 3, random() * 3, random() * 3);
      }
    }
    if (a.state === 'toppled' || a.state === 'crowned' || mood.density > 0.6) {
      const petals = [];
      const count = a.state === 'toppled' ? 46 : 16;
      for (let i = 0; i < count; i++) {
        const ang = random() * Math.PI * 2, r = mix(0.06, 0.13, random());
        petals.push({ at: [Math.cos(ang) * r, 0.002, Math.sin(ang) * r * 0.9 + 0.02] as [number, number, number], size: mix(0.005, 0.009, random()), color: random() > 0.5 ? '#f39216' : '#f7b322' });
      }
      const mesh = s.scatter(new THREE.SphereGeometry(1, 6, 4), s.material('#ffffff', { roughness: 0.7 }), petals);
      mesh.scale.y = 0.25;
    }

    if (a.doily) {
      const tissue = document.createElement('canvas');
      tissue.width = tissue.height = 256;
      const t = tissue.getContext('2d')!;
      t.fillStyle = pal.icing[(1 + Math.floor(random() * 3)) % pal.icing.length];
      t.fillRect(0, 0, 256, 256);
      t.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 12; i++) for (const [x, y] of [[i * 22 + 7, 0], [i * 22 + 7, 256], [0, i * 22 + 7], [256, i * 22 + 7]]) { t.beginPath(); t.arc(x, y, 8, 0, 7); t.fill(); }
      for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
        const x = 30 + i * 28, y = 30 + j * 28;
        if (Math.hypot(x - 128, y - 128) < 62) continue;
        t.beginPath();
        if ((i + j) % 2) t.arc(x, y, 6, 0, 7); else { t.moveTo(x, y - 9); t.lineTo(x + 6, y); t.lineTo(x, y + 9); t.lineTo(x - 6, y); }
        t.fill();
      }
      const map = new THREE.CanvasTexture(tissue);
      map.colorSpace = THREE.SRGBColorSpace;
      const sheet = s.mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), [0, 0.0012, 0.01]);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = (random() - 0.5) * 0.5;
      sheet.castShadow = false;
    }

    return s.finish({ footprint: 0.09 });
  },
});
