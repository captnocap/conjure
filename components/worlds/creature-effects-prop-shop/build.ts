import * as THREE from 'three';
import { type Placeable, choice, defineWorld, diorama, mix } from '@conjure/kit';
import { Head, type HeadSpec, painted, taperTube } from './fx';

type V3 = [number, number, number];
const W = 7.2, D = 5.6, H = 3.5, BACK = -D / 2, LEFT = -W / 2;
/** x, z, standing height, tallest allowed, widest radius allowed, largest scale. */
const SLOTS: [number, number, number, number, number, number][] = [
  [0.2, 0.9, 1.02, 1.25, 0.6, 3.2],
  [-2.2, -0.6, 0.9, 1.05, 0.52, 2.6],
  [2.2, -0.4, 0.9, 1.05, 0.52, 2.6],
  [-1.3, 2.0, 0.32, 1.25, 0.5, 2.2],
  [2.0, 2.0, 0.32, 1.25, 0.5, 2.2],
];

const FILMS = {
  zombie: 'A zombie picture: rot greens and greys, gaunt head casts, a poster of a hand clawing out of a grave.',
  werewolf: 'A werewolf picture: fur browns, snouted casts, a poster of a howl against a huge yellow moon.',
  alien: 'An alien invasion picture: teal and magenta, dome-skulled casts with huge black eyes, a flying saucer poster.',
  vampire: 'A vampire picture: blood red and bone white, sharp-cheeked casts, a poster of a bat over a castle.',
  gillman: 'A swamp fish-man picture: wet greens, wide-mouthed finned casts, a poster of a webbed hand rising from water.',
} as const;
type Film = keyof typeof FILMS;

const FILM: Record<Film, { title: string; accent: string; second: string; poster: string; ink: string; spec: Partial<HeadSpec> }> = {
  zombie: { title: 'DAWN OF THE ROTTEN', accent: '#86a35c', second: '#7c7f6c', poster: '#2f4a2c', ink: '#f2e34c', spec: { jaw: 0.2, cheek: -0.9, socket: 1, nose: -0.6, brow: 0.7, lump: 0.05, lumpScale: 7 } },
  werewolf: { title: 'MOON HOWL III', accent: '#96633a', second: '#5c4630', poster: '#1f2f5c', ink: '#f6d84a', spec: { snout: 0.5, brow: 1, jaw: 0.6, nose: 0.3, socket: 0.8, cheek: 0.3 } },
  alien: { title: 'IT CAME FROM ORBIT', accent: '#58b9ae', second: '#c552a6', poster: '#5a2a78', ink: '#8df06a', spec: { crown: 1.6, jaw: 0.05, chin: 0, nose: 0, socket: 1.1, eyeSpread: 0.42, brow: 0.1, cheek: -0.3 } },
  vampire: { title: 'BLOOD COUNTESS', accent: '#b9bfae', second: '#a3262e', poster: '#a3222b', ink: '#f4ead0', spec: { jaw: 0.2, cheek: -0.5, socket: 0.8, nose: 0.8, brow: 0.9, chin: 0.7, crown: 0.3 } },
  gillman: { title: 'GILL-MAN RISES', accent: '#3f9a6c', second: '#c9b24a', poster: '#1d6f78', ink: '#f6f0c0', spec: { jaw: 0.9, cheek: 0.5, socket: 0.2, nose: 0.05, brow: 0.15, chin: 0.05, snout: 0.22, width: 1.12, eyeSpread: 0.56, eyeHeight: 0.2, mouth: 1 } },
};

const hex = (c: THREE.Color) => `#${c.getHexString()}`;
const BRIGHTS = ['#e2483c', '#f0b429', '#3f8fd0', '#52b06a', '#d868a8', '#f4f1e6', '#7a4fc0', '#ee7f2d', '#24a6a0'];

/** A one-sheet film poster. */
function poster(film: Film, random: () => number) {
  const f = FILM[film];
  return painted(256, 360, (ctx, w, h) => {
    ctx.fillStyle = f.poster; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, h * 0.55, w, h * 0.2);
    const black = '#14110f';
    if (film === 'zombie') {
      ctx.fillStyle = '#5d8a3e'; ctx.fillRect(0, 205, w, 60);
      ctx.fillStyle = black; ctx.fillRect(108, 110, 40, 120);
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(112 + i * 9, 112); ctx.rotate((i - 2) * 0.28); ctx.fillRect(-5, -52 + Math.abs(i - 2) * 8, 10, 56); ctx.restore(); }
      ctx.fillStyle = '#c9c4b0'; ctx.fillRect(30, 170, 26, 40); ctx.fillRect(196, 160, 30, 50);
    } else if (film === 'werewolf') {
      ctx.fillStyle = '#f6d84a'; ctx.beginPath(); ctx.arc(128, 105, 78, 0, 7); ctx.fill();
      ctx.fillStyle = black; ctx.beginPath();
      ctx.moveTo(70, 235); ctx.lineTo(92, 150); ctx.lineTo(84, 100); ctx.lineTo(112, 128); ctx.lineTo(176, 62); ctx.lineTo(170, 96); ctx.lineTo(196, 104); ctx.lineTo(160, 132); ctx.lineTo(176, 235); ctx.fill();
    } else if (film === 'alien') {
      ctx.fillStyle = '#c9ccd2'; ctx.beginPath(); ctx.ellipse(128, 58, 84, 18, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(128, 44, 34, 20, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = 'rgba(160,255,120,0.4)'; ctx.beginPath(); ctx.moveTo(100, 70); ctx.lineTo(156, 70); ctx.lineTo(214, 250); ctx.lineTo(42, 250); ctx.fill();
      ctx.fillStyle = '#7ed65a'; ctx.beginPath(); ctx.ellipse(128, 170, 44, 60, 0, 0, 7); ctx.fill();
      ctx.fillStyle = black;
      for (const sx of [-1, 1]) { ctx.save(); ctx.translate(128 + sx * 20, 168); ctx.rotate(sx * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, 11, 22, 0, 0, 7); ctx.fill(); ctx.restore(); }
    } else if (film === 'vampire') {
      ctx.fillStyle = '#f4ead0'; ctx.beginPath(); ctx.arc(128, 96, 62, 0, 7); ctx.fill();
      ctx.fillStyle = black; ctx.beginPath();
      ctx.moveTo(128, 80); ctx.lineTo(150, 62); ctx.lineTo(228, 70); ctx.lineTo(200, 96); ctx.lineTo(180, 90); ctx.lineTo(160, 112); ctx.lineTo(128, 104);
      ctx.lineTo(96, 112); ctx.lineTo(76, 90); ctx.lineTo(56, 96); ctx.lineTo(28, 70); ctx.lineTo(106, 62); ctx.fill();
      ctx.fillRect(60, 180, 30, 80); ctx.fillRect(100, 150, 44, 110); ctx.fillRect(156, 190, 40, 70);
      ctx.beginPath(); ctx.moveTo(96, 150); ctx.lineTo(122, 112); ctx.lineTo(148, 150); ctx.fill();
    } else {
      ctx.fillStyle = '#0f4a55'; ctx.fillRect(0, 190, w, 80);
      ctx.fillStyle = '#58c07c'; ctx.fillRect(110, 110, 36, 110);
      for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(114 + i * 10, 114); ctx.rotate((i - 1.5) * 0.36); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -66); ctx.lineTo(8, 0); ctx.fill(); ctx.restore(); }
      ctx.strokeStyle = '#d7f5f0'; ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(30 + random() * 196, 40 + random() * 150, 4 + random() * 8, 0, 7); ctx.stroke(); }
    }
    ctx.fillStyle = '#14110f'; ctx.fillRect(0, 262, w, 98);
    ctx.fillStyle = f.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const words = f.title.split(' ');
    const half = Math.ceil(words.length / 2);
    const lines = words.length > 2 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : words.length === 2 ? words : [f.title];
    lines.forEach((line, i) => {
      ctx.font = `bold ${lines.length > 1 ? 40 : 52}px sans-serif`;
      ctx.fillText(line, w / 2, 290 + i * 42 - (lines.length > 1 ? 0 : -20), w - 18);
    });
    ctx.strokeStyle = '#f2ead2'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, w - 8, h - 8);
  });
}

export default defineWorld({
  questions: {
    film: choice('Which monster movie is the shop building right now?', FILMS),
    deadline: choice('How close is the shoot?', {
      early: 'Six weeks out: clean calendar, unhurried, coffee still hot.',
      crunch: 'Three days out: calendar full of red crosses, coffee cups collecting on every surface.',
      tomorrow: 'Tomorrow morning: an all-nighter, pizza boxes stacked up, a sleeping bag on the floor.',
      wrapped: 'The film has wrapped: bunting strung from the rafters, packed shipping crates, a party afterglow.',
    }),
    rafters: choice('What hangs from the rafters?', {
      skins: 'Empty latex body skins on hangers, hooded and limp like deflated monsters.',
      wings: 'Pairs of big scalloped bat wings hung up to dry.',
      tentacles: 'Long rubber tentacles dangling like a butcher’s window.',
      skeletons: 'Stringed skeleton marionettes, grinning and loose-limbed.',
      mixed: 'A bit of everything: a skin, a wing, a tentacle, a skeleton.',
      bare: 'Nothing but the enamel work lamps.',
    }),
    work: choice('What job is spread across the benches today?', {
      tidy: 'Nothing: swept and squared away, jars in a row, a broom against the wall.',
      casting: 'Plaster day: buckets, open two-part moulds, sacks and white puddles.',
      painting: 'Paint day: dozens of colour jars, a cardboard spray booth and an airbrush compressor.',
      fur: 'Hair day: hanks of fur over a rack and a drift of clippings on the floor.',
    }),
    corner: choice('What stands in the back corner?', {
      suit: 'A finished full-body creature suit on a stand, arms out, waiting for its performer.',
      lifecast: 'An actor in a chair having a life cast taken: head a white plaster blob with two breathing straws.',
      oven: 'The foam-latex oven, door open and glowing, a tray of moulds baking.',
      crates: 'A stack of wooden shipping crates stencilled FRAGILE.',
    }),
    radio: choice('What is playing in the shop?', {
      boombox: 'A big silver boombox on the tool chest, turned right up.',
      transistor: 'A small paint-flecked transistor radio with its aerial out.',
      tv: 'A portable TV and VCR playing an old monster movie for reference.',
      silent: 'Nothing: quiet concentration.',
    }),
    walls: choice('What are the walls?', {
      brick: 'White-painted brick, an old factory unit.',
      block: 'Cream cinder block with a turquoise stripe, a 1980s industrial estate.',
      ply: 'Warm plywood sheets, a home-built shop.',
      tin: 'Pale mint corrugated metal, a converted shed.',
    }),
    floor: choice('What is the floor under all the paint?', {
      concrete: 'Bare grey concrete.',
      checker: 'Old cream and green checker lino.',
      boards: 'Scuffed timber boards.',
      dropcloth: 'Concrete under big off-white canvas drop cloths.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const film = FILM[a.film];
    const { art: s, world } = diorama(context, {
      background: '#ebe8da', floor: '#c9c5b6', width: W, depth: D, maxHeight: 1, radius: 0.55, pitch: 24, yaw: 30,
      slots: SLOTS.map(([x, z]) => [x, z] as const),
    });
    const wear = mood.wear, dens = mood.density, grim = 1 - mood.cheer, energy = mood.energy;
    const root = s.root;
    const rnd = (lo: number, hi: number) => lo + random() * (hi - lo);
    const bright = () => BRIGHTS[Math.floor(random() * BRIGHTS.length)];
    const accent = new THREE.Color(film.accent), second = new THREE.Color(film.second);

    const wood = s.material('#b98b56'), woodDark = s.material('#7c5a38'), woodPale = s.material('#d3b98a');
    const steel = s.material('#aab2b3', { metalness: 0.5, roughness: 0.4 });
    const black = s.material('#25262a'), white = s.material('#ecebe2', { roughness: 0.9 });
    const plasterM = s.material('#e9e7dc', { roughness: 0.95 });
    const red = s.material('#c8392f', { roughness: 0.45 });
    const accentM = s.material(accent), secondM = s.material(second);
    const clayM = s.material('#8f9484');

    const inst = (geometry: THREE.BufferGeometry, material: THREE.Material, items: { p: V3; s?: V3 | number; r?: V3; c?: THREE.ColorRepresentation }[]) => {
      if (!items.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, items.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
      items.forEach((it, i) => {
        e.set(...(it.r ?? [0, 0, 0]));
        q.setFromEuler(e);
        if (typeof it.s === 'number') sc.setScalar(it.s); else sc.set(...(it.s ?? [1, 1, 1]));
        m.compose(pos.set(...it.p), q, sc);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(it.c ?? '#ffffff'));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };
    const plane = (w: number, h: number, map: THREE.Texture, at: V3, rotY = 0) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.85 }), at);
      mesh.rotation.y = rotY;
      mesh.castShadow = false;
      return mesh;
    };
    /** Adds to a pivot group instead of the root, so hung things can sway. */
    const into = (group: THREE.Group, mesh: THREE.Mesh) => { group.add(mesh); return mesh; };

    // ---------------------------------------------------------------- floor
    const floorTex = painted(1024, 1024, (ctx) => {
      const base = { concrete: '#b7b4a8', checker: '#d9d2b4', boards: '#b48f62', dropcloth: '#b1aea3' }[a.floor];
      ctx.fillStyle = base; ctx.fillRect(0, 0, 1024, 1024);
      if (a.floor === 'checker') {
        for (let x = 0; x < 14; x++) for (let y = 0; y < 12; y++) if ((x + y) % 2) { ctx.fillStyle = '#8fb39a'; ctx.fillRect(x * 73.2, y * 85.4, 73.2, 85.4); }
      } else if (a.floor === 'boards') {
        for (let y = 0; y < 22; y++) {
          ctx.fillStyle = hex(new THREE.Color('#b48f62').offsetHSL(0, 0, (random() - 0.5) * 0.09)); ctx.fillRect(0, y * 46.6, 1024, 45);
          ctx.fillStyle = 'rgba(70,45,25,0.55)'; ctx.fillRect(0, y * 46.6 + 45, 1024, 2);
          for (let i = 0; i < 3; i++) ctx.fillRect(random() * 1024, y * 46.6, 2, 45);
        }
      } else {
        for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${random() < 0.5 ? '95,95,90' : '232,230,220'},0.1)`; ctx.beginPath(); ctx.arc(random() * 1024, random() * 1024, 6 + random() * 40, 0, 7); ctx.fill(); }
        ctx.strokeStyle = 'rgba(90,88,80,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(512, 0); ctx.lineTo(512, 1024); ctx.moveTo(0, 512); ctx.lineTo(1024, 512); ctx.stroke();
        if (a.floor === 'dropcloth') {
          for (const [cx, cy, cw, ch, rot] of [[560, 640, 520, 420, 0.08], [250, 380, 380, 300, -0.12], [820, 300, 300, 330, 0.2]]) {
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
            ctx.fillStyle = '#e6dfca'; ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
            ctx.strokeStyle = 'rgba(150,140,110,0.6)'; ctx.lineWidth = 3; ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);
            for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-cw / 2 + random() * cw, -ch / 2); ctx.lineTo(-cw / 2 + random() * cw, ch / 2); ctx.strokeStyle = 'rgba(150,140,110,0.25)'; ctx.stroke(); }
            ctx.restore();
          }
        }
      }
      // Sunlight through the skylight panes.
      const lean = (mood.daylight - 0.5) * 260;
      for (let i = 0; i < 4; i++) {
        const x0 = 210 + i * 170, y0 = 330;
        ctx.fillStyle = `rgba(255,246,205,${mix(0.3, 0.14, grim)})`;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + 140, y0); ctx.lineTo(x0 + 140 + lean, y0 + 420); ctx.lineTo(x0 + lean, y0 + 420); ctx.fill();
      }
      // Years of paint.
      const drops = 90 + wear * 320 + (a.work === 'painting' ? 260 : 0);
      const palette = [...BRIGHTS, film.accent, film.second, film.accent];
      for (let i = 0; i < drops; i++) {
        const x = random() * 1024, y = random() * 1024, r = 2 + random() * random() * 20;
        ctx.fillStyle = palette[Math.floor(random() * palette.length)];
        ctx.globalAlpha = 0.6 + random() * 0.4;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        for (let j = 0; j < 4; j++) { const ang = random() * 7, d = r * (1.2 + random() * 2.2); ctx.beginPath(); ctx.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * (0.12 + random() * 0.3), 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      if (a.work === 'casting') {
        for (let i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(244,243,236,0.9)'; ctx.beginPath(); ctx.ellipse(120 + random() * 500, 150 + random() * 300, 6 + random() * 30, 5 + random() * 18, random() * 3, 0, 7); ctx.fill(); }
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(330 + i * 34, 300 + i * 46 + (i % 2) * 14, 9, 17, 0.5, 0, 7); ctx.fill(); }
      }
      // Tape marks where things stand.
      ctx.strokeStyle = '#f0c62a'; ctx.lineWidth = 7;
      for (const [x, z] of SLOTS) {
        const cx = (x - LEFT) / W * 1024, cy = (z - BACK) / D * 1024;
        for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          ctx.beginPath(); ctx.moveTo(cx + dx * 92, cy + dy * 70); ctx.lineTo(cx + dx * 92, cy + dy * 104); ctx.moveTo(cx + dx * 92, cy + dy * 104); ctx.lineTo(cx + dx * 62, cy + dy * 104); ctx.stroke();
        }
      }
    });
    const groundMat = (world.ground as THREE.Mesh).material as THREE.MeshStandardMaterial;
    groundMat.map = floorTex; groundMat.color.set('#ffffff'); groundMat.roughness = 0.85;

    // ---------------------------------------------------------------- walls
    const wallBase = new THREE.Color({ brick: '#ece8dc', block: '#ece2bf', ply: '#d9b680', tin: '#cfe3d2' }[a.walls]).lerp(new THREE.Color('#b9b7ab'), grim * 0.3);
    const wallTex = (len: number) => painted(Math.round(len * 72), Math.round(H * 72), (ctx, w, h) => {
      ctx.fillStyle = hex(wallBase); ctx.fillRect(0, 0, w, h);
      if (a.walls === 'brick') {
        for (let y = 0; y < h / 7; y++) for (let x = -1; x < w / 18; x++) {
          ctx.fillStyle = hex(wallBase.clone().offsetHSL(0, 0, (random() - 0.5) * 0.06));
          ctx.fillRect(x * 18 + (y % 2) * 9 + 1, y * 7 + 1, 16.5, 5.5);
        }
        ctx.fillStyle = 'rgba(196,84,60,0.5)';
        for (let i = 0; i < 10 + wear * 60; i++) ctx.fillRect(Math.floor(random() * w / 18) * 18 + 1, Math.floor(random() * h / 7) * 7 + 1, 16.5, 5.5);
      } else if (a.walls === 'block') {
        ctx.strokeStyle = 'rgba(150,138,100,0.55)'; ctx.lineWidth = 1.5;
        for (let y = 0; y < h / 15; y++) { ctx.beginPath(); ctx.moveTo(0, y * 15); ctx.lineTo(w, y * 15); ctx.stroke(); for (let x = 0; x < w / 30 + 1; x++) { ctx.beginPath(); ctx.moveTo(x * 30 + (y % 2) * 15, y * 15); ctx.lineTo(x * 30 + (y % 2) * 15, y * 15 + 15); ctx.stroke(); } }
        ctx.fillStyle = '#35b5b0'; ctx.fillRect(0, h - 95, w, 16); ctx.fillStyle = '#e8574d'; ctx.fillRect(0, h - 74, w, 5);
      } else if (a.walls === 'ply') {
        for (let x = 0; x < w / 88 + 1; x++) {
          ctx.fillStyle = hex(wallBase.clone().offsetHSL(0, 0, (random() - 0.5) * 0.07)); ctx.fillRect(x * 88, 0, 87, h);
          ctx.strokeStyle = 'rgba(120,80,40,0.25)'; ctx.lineWidth = 1;
          for (let i = 0; i < 9; i++) { ctx.beginPath(); const gx = x * 88 + random() * 86; ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + 12, h * 0.3, gx - 12, h * 0.6, gx + 5, h); ctx.stroke(); }
          ctx.fillStyle = 'rgba(90,60,30,0.6)'; ctx.fillRect(x * 88 + 87, 0, 1.5, h);
        }
      } else {
        for (let x = 0; x < w / 9; x++) { ctx.fillStyle = x % 2 ? 'rgba(255,255,255,0.3)' : 'rgba(70,110,90,0.22)'; ctx.fillRect(x * 9, 0, 4.5, h); }
        ctx.fillStyle = 'rgba(90,110,100,0.5)'; ctx.fillRect(0, h * 0.5, w, 2);
      }
      for (let i = 0; i < wear * 30; i++) { ctx.fillStyle = `rgba(110,95,70,${0.08 + random() * 0.12})`; ctx.fillRect(random() * w, random() * h * 0.5, 3 + random() * 8, 30 + random() * h * 0.4); }
      for (let i = 0; i < 14 + wear * 40; i++) { ctx.fillStyle = bright(); ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(random() * w, h - random() * 110, 1 + random() * 4, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    });
    const backWall = s.box([W + 0.2, H, 0.2], [-0.1, H / 2, BACK - 0.1], new THREE.MeshStandardMaterial({ map: wallTex(W), roughness: 0.92 }));
    backWall.castShadow = false;
    const leftWall = s.box([0.2, H, D], [LEFT - 0.1, H / 2, 0], new THREE.MeshStandardMaterial({ map: wallTex(D), roughness: 0.92 }));
    leftWall.castShadow = false;
    s.box([W, 0.12, 0.04], [0, 0.06, BACK + 0.02], woodDark);
    s.box([0.04, 0.12, D], [LEFT + 0.02, 0.06, 0], woodDark);

    // Sawtooth skylight leaning out over the back wall, and the rafters under it.
    const glassM = new THREE.MeshStandardMaterial({ color: '#dcefff', emissive: '#cfe9ff', emissiveIntensity: mix(0.75, 0.4, grim), roughness: 0.3 });
    const sky = s.box([W + 0.2, 0.04, 1.3], [-0.1, H + 0.36, BACK + 0.42], glassM);
    sky.rotation.x = -0.6; sky.castShadow = false;
    for (let i = 0; i <= 6; i++) { const bar = s.box([0.07, 0.07, 1.36], [LEFT + i * (W / 6) - (i === 6 ? 0.03 : 0), H + 0.38, BACK + 0.44], steel); bar.rotation.x = -0.6; bar.castShadow = false; }
    s.box([W + 0.2, 0.09, 0.09], [-0.1, H + 0.74, BACK + 0.97], steel).castShadow = false;
    const RAFT = [-2.0, -0.7];
    for (const z of RAFT) {
      s.box([W, 0.16, 0.1], [0, H - 0.08, z], woodDark).castShadow = false;
      const brace = s.box([0.08, 0.7, 0.08], [LEFT + 0.26, H - 0.36, z], woodDark); brace.rotation.z = 0.78;
    }

    // ---------------------------------------------------------------- hanging things
    const swayers: { group: THREE.Group; phase: number; amount: number }[] = [];
    const hang = (x: number, z: number, drop: number, amount = 1) => {
      const group = new THREE.Group();
      group.position.set(x, H - 0.16, z);
      root.add(group);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, drop, 5), black);
      cord.position.y = -drop / 2;
      group.add(cord);
      swayers.push({ group, phase: random() * 7, amount });
      if (amount === 1) group.scale.setScalar(1.3);
      return group;
    };
    const solid = (geometry: THREE.BufferGeometry, material: THREE.Material, at: V3 = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = true;
      return mesh;
    };
    const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff3c2', emissive: '#ffe9a0', emissiveIntensity: 1.2 });
    const enamel = s.material('#3f8f7a', { roughness: 0.35, side: THREE.DoubleSide });
    for (const x of [-1.6, 1.7]) {
      const g = hang(x, RAFT[1], 0.5, 0.5);
      into(g, solid(new THREE.ConeGeometry(0.24, 0.16, 20, 1, true), enamel, [0, -0.56, 0]));
      into(g, solid(new THREE.SphereGeometry(0.06, 10, 8), lampGlow, [0, -0.62, 0])).castShadow = false;
    }

    const skinShape = (() => {
      const half: [number, number][] = [[0, 0], [0.1, -0.02], [0.13, -0.14], [0.09, -0.26], [0.24, -0.3], [0.34, -0.42], [0.4, -0.85], [0.33, -0.9], [0.27, -0.85], [0.24, -0.5], [0.2, -0.5], [0.2, -0.8], [0.22, -1.3], [0.16, -1.38], [0.06, -1.36], [0.04, -0.85], [0, -0.82]];
      const shape = new THREE.Shape();
      half.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
      for (let i = half.length - 2; i > 0; i--) shape.lineTo(-half[i][0], half[i][1]);
      for (const sx of [-1, 1]) { const eye = new THREE.Path(); eye.absellipse(sx * 0.055, -0.11, 0.028, 0.02, 0, Math.PI * 2, false, 0); shape.holes.push(eye); }
      return shape;
    })();
    const wingShape = (() => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.quadraticCurveTo(0.45, 0.12, 0.92, -0.06);
      shape.lineTo(0.8, -0.78); shape.quadraticCurveTo(0.72, -0.5, 0.56, -0.52);
      shape.lineTo(0.48, -0.92); shape.quadraticCurveTo(0.42, -0.6, 0.3, -0.56);
      shape.lineTo(0.16, -0.86); shape.quadraticCurveTo(0.14, -0.5, 0, -0.44);
      return shape;
    })();
    const hungColour = () => accent.clone().lerp(second, random() * 0.55).offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.12);
    const hungThing = (kind: 'skins' | 'wings' | 'tentacles' | 'skeletons', x: number, z: number) => {
      if (kind === 'skins') {
        const g = hang(x, z, 0.22);
        const mat = s.material(hungColour(), { roughness: 0.5, side: THREE.DoubleSide });
        const skin = into(g, solid(new THREE.ExtrudeGeometry(skinShape, { depth: 0.03, bevelEnabled: false }), mat, [0, -0.24, -0.015]));
        skin.scale.setScalar(rnd(0.92, 1.08));
        into(g, solid(new THREE.BoxGeometry(0.52, 0.025, 0.025), wood, [0, -0.5, 0]));
        g.rotation.y = rnd(-0.5, 0.5);
      } else if (kind === 'wings') {
        const g = hang(x, z, 0.3);
        const mat = s.material(new THREE.Color('#5a3340').lerp(second, 0.35), { roughness: 0.55, side: THREE.DoubleSide });
        const bone = s.material('#d8cfb8');
        for (const sx of [-1, 1]) {
          const wing = into(g, solid(new THREE.ExtrudeGeometry(wingShape, { depth: 0.012, bevelEnabled: false }), mat, [sx * 0.03, -0.32, 0]));
          wing.scale.set(sx * 0.95, 1.25, 1); wing.rotation.z = sx * -1.05;
          const arm = into(g, solid(new THREE.CylinderGeometry(0.018, 0.026, 1.12, 6), bone, [sx * 0.5, -0.74, 0.014]));
          arm.rotation.z = sx * 0.46;
        }
        g.rotation.y = rnd(-0.35, 0.35);
      } else if (kind === 'tentacles') {
        const g = hang(x, z, 0.14);
        const n = 2 + Math.floor(random() * 2);
        for (let i = 0; i < n; i++) {
          const len = rnd(0.9, 1.45), curl = rnd(0.12, 0.3) * (random() < 0.5 ? -1 : 1), ox = (i - (n - 1) / 2) * 0.2;
          const pts: V3[] = [[ox, -0.14, 0], [ox + curl * 0.2, -0.14 - len * 0.35, 0.03], [ox - curl * 0.3, -0.14 - len * 0.7, -0.02], [ox + curl * 0.5, -0.14 - len, 0.02], [ox + curl * 1.1, -0.1 - len, 0.05], [ox + curl * 1.2, 0.02 - len, 0.04]];
          into(g, solid(taperTube(pts, (t) => mix(0.075, 0.012, t), 28, 8), s.material(hungColour(), { roughness: 0.4 })));
          const suckers = new THREE.Mesh(taperTube(pts.map(([px, py, pz]) => [px, py, pz + 0.045] as V3), (t) => mix(0.04, 0.006, t), 28, 6), s.material('#e7c7b5', { roughness: 0.5 }));
          suckers.scale.set(0.8, 1, 0.7); suckers.castShadow = true; g.add(suckers);
        }
      } else {
        const g = hang(x, z, 0.3);
        const bone = s.material('#ece6d2', { roughness: 0.7 });
        into(g, solid(new THREE.BoxGeometry(0.4, 0.025, 0.04), wood, [0, -0.3, 0]));
        into(g, solid(new THREE.SphereGeometry(0.085, 14, 10), bone, [0, -0.52, 0])).scale.set(1, 1.1, 1);
        into(g, solid(new THREE.BoxGeometry(0.1, 0.05, 0.1), bone, [0, -0.61, 0.01]));
        for (const sx of [-1, 1]) into(g, solid(new THREE.SphereGeometry(0.022, 8, 6), black, [sx * 0.035, -0.52, 0.072]));
        into(g, solid(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), bone, [0, -0.82, 0]));
        for (let i = 0; i < 4; i++) into(g, solid(new THREE.BoxGeometry(0.24 - i * 0.025, 0.022, 0.1), bone, [0, -0.7 - i * 0.06, 0]));
        into(g, solid(new THREE.BoxGeometry(0.18, 0.06, 0.08), bone, [0, -1.0, 0]));
        for (const sx of [-1, 1]) {
          const swing = rnd(-0.5, 0.5), kick = rnd(-0.3, 0.3);
          const arm = into(g, solid(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 5), bone, [sx * (0.15 + Math.abs(Math.sin(swing)) * 0.08), -0.86, 0])); arm.rotation.z = sx * (0.25 + Math.abs(swing) * 0.6);
          const leg = into(g, solid(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5), bone, [sx * 0.07 + kick * 0.2, -1.27, 0])); leg.rotation.z = kick;
          into(g, solid(new THREE.BoxGeometry(0.05, 0.025, 0.11), bone, [sx * 0.07 + kick * 0.44, -1.52, 0.03]));
        }
        g.rotation.y = rnd(-0.6, 0.6);
      }
    };
    if (a.rafters !== 'bare') {
      const spots: [number, number][] = [[2.55, RAFT[0]], [-2.9, RAFT[0]], [3.2, RAFT[1]], [-1.2, RAFT[0]], [1.7, RAFT[0]], [-3.2, RAFT[1]], [0.4, RAFT[0]]];
      const count = Math.min(spots.length, 3 + Math.round(dens * 4));
      const kinds = ['skins', 'wings', 'tentacles', 'skeletons'] as const;
      for (let i = 0; i < count; i++) hungThing(a.rafters === 'mixed' ? kinds[i % 4] : a.rafters, spots[i][0] + rnd(-0.12, 0.12), spots[i][1]);
    }
    if (a.deadline === 'wrapped') {
      const flags: { p: V3; s?: V3; r?: V3; c?: string }[] = [];
      for (let i = 0; i < 26; i++) { const t = i / 25, x = LEFT + 0.2 + t * (W - 0.5); flags.push({ p: [x, H - 0.3 - Math.sin(t * Math.PI * 3) ** 2 * 0.22, RAFT[1] + 0.07], r: [0, 0, Math.PI], c: BRIGHTS[i % BRIGHTS.length] }); }
      inst(new THREE.ConeGeometry(0.1, 0.24, 3), new THREE.MeshStandardMaterial({ roughness: 0.7 }), flags);
    }

    // ---------------------------------------------------------------- back wall: bench, pegboard, shelves
    const benchX0 = LEFT + 0.1, benchX1 = 1.25, benchZ = BACK + 0.45, benchW = benchX1 - benchX0, benchC = (benchX0 + benchX1) / 2;
    s.box([benchW, 0.07, 0.8], [benchC, 0.865, benchZ], wood);
    s.box([benchW - 0.1, 0.04, 0.7], [benchC, 0.3, benchZ], woodDark);
    for (const x of [benchX0 + 0.06, benchC, benchX1 - 0.06]) for (const z of [benchZ - 0.34, benchZ + 0.34]) s.box([0.08, 0.83, 0.08], [x, 0.415, z], woodDark);
    s.box([1.1, 0.42, 0.74], [benchX0 + 0.75, 0.6, benchZ], s.material('#5f7f8f'));
    for (let i = 0; i < 2; i++) s.box([0.5, 0.03, 0.02], [benchX0 + 0.47 + i * 0.56, 0.62, benchZ + 0.38], steel);

    const pegTex = painted(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#c59a62'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(70,45,20,0.55)';
      for (let x = 6; x < w; x += 10) for (let y = 6; y < h; y += 10) ctx.fillRect(x, y, 2, 2);
      // Painted tool outlines, the sign of a shop that puts things back.
      ctx.strokeStyle = 'rgba(250,246,230,0.75)'; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) ctx.strokeRect(14 + i * 27, 16 + (i % 2) * 8, 16, 54 + (i % 3) * 14);
    });
    plane(2.3, 1.15, pegTex, [-2.3, 1.72, BACK + 0.012]);
    const toolHandles: { p: V3; s: V3; c: string }[] = [], toolHeads: { p: V3; s: V3; c: string }[] = [];
    for (let i = 0; i < 9; i++) {
      if (random() < mix(0.15, 0.6, wear) * (a.work === 'tidy' ? 0.3 : 1)) continue;
      const x = -3.3 + (14 + i * 27 + 8) / 256 * 2.3, len = 0.24 + (i % 3) * 0.07, top = 2.14 - (i % 2) * 0.07;
      toolHandles.push({ p: [x, top - 0.12 - len / 2, BACK + 0.04], s: [0.035, len, 0.03], c: [BRIGHTS[i % 5], '#7c5a38'][i % 2] });
      toolHeads.push({ p: [x, top - 0.06, BACK + 0.045], s: [[0.13, 0.06, 0.04], [0.05, 0.13, 0.02], [0.1, 0.1, 0.02]][i % 3] as V3, c: '#aeb5b6' });
    }
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6 }), toolHandles);
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.5 }), toolHeads);

    const SIGN = { early: ['SHOOT IN 6 WEEKS', '#27372e', '#eee5cf'], crunch: ['SHOOT IN 3 DAYS', '#8a1f1a', '#f4e27a'], tomorrow: ['SHOOT TOMORROW!!', '#fff6e0', '#d2342a'], wrapped: ["THAT'S A WRAP!", '#2a2a66', '#f6c8e0'] }[a.deadline];
    const sign = s.label(SIGN[0], 2.25, 0.42, [-2.3, 2.72, BACK + 0.03], SIGN[1], SIGN[2]);
    sign.castShadow = false; sign.rotation.z = rnd(-0.03, 0.03);
    s.box([2.33, 0.5, 0.02], [-2.3, 2.72, BACK + 0.012], woodDark).castShadow = false;

    // Shelves of head casts and mould halves.
    const shelves: [number, number, number][] = [[1.72, -0.75, 1.35], [2.3, -0.75, W / 2 - 0.1], [2.88, -0.75, W / 2 - 0.1]];
    const humanGeo = new Head({ size: 1.85 }).geometry(26);
    const creatureGeo = new Head({ size: 1.9, ...film.spec }).geometry(26);
    const backing = s.box([W / 2 - 0.1 + 0.85, 1.75, 0.02], [(W / 2 - 0.1 - 0.85) / 2, 2.5, BACK + 0.012], s.material(new THREE.Color('#3f6670').lerp(new THREE.Color(film.poster), 0.25)));
    backing.castShadow = false;
    const humans: { p: V3; r: V3; c: string }[] = [], creatures: { p: V3; r: V3; c: string }[] = [], necks: { p: V3; s: V3; c: string }[] = [], moulds: { p: V3; s: V3; r: V3; c: string }[] = [], straps: { p: V3; s: V3; r: V3; c: string }[] = [];
    const plasterTone = () => hex(new THREE.Color('#ebe8dc').offsetHSL(0.02 * (random() - 0.5), 0, (random() - 0.5) * 0.08));
    shelves.forEach(([y, x0, x1], row) => {
      s.box([x1 - x0, 0.04, 0.4], [(x0 + x1) / 2, y, BACK + 0.2], woodPale);
      for (let x = x0 + 0.25; x < x1 - 0.1; x += 0.9) { const br = s.box([0.03, 0.26, 0.3], [x, y - 0.14, BACK + 0.16], steel); br.castShadow = false; }
      let x = x0 + 0.26;
      while (x < x1 - 0.2) {
        if (random() > mix(0.55, 0.97, dens)) { x += 0.3; continue; }
        const z = BACK + 0.21 + rnd(-0.03, 0.03), roll = random();
        if (roll < (row === 0 ? 0.25 : 0.42)) {
          const w = rnd(0.34, 0.46), h = rnd(0.26, 0.36), turn = rnd(-0.12, 0.12);
          moulds.push({ p: [x + w / 2 - 0.2, y + 0.02 + h / 2, z], s: [w, h, 0.3], r: [0, turn, 0], c: plasterTone() });
          straps.push({ p: [x + w / 2 - 0.2, y + 0.02 + h / 2, z], s: [w + 0.012, 0.035, 0.312], r: [0, turn, 0], c: random() < 0.5 ? '#c9952f' : '#3f6f9a' });
          x += w + 0.1;
        } else {
          const painted = random() < 0.4, monster = roll > 0.62;
          const tone = monster && painted ? hex(accent.clone().lerp(second, random() * 0.4)) : monster ? hex(new THREE.Color('#8f9484').offsetHSL(0, 0, rnd(-0.04, 0.04))) : plasterTone();
          (monster ? creatures : humans).push({ p: [x, y + 0.31, z], r: [rnd(-0.05, 0.05), rnd(-0.45, 0.45), 0], c: tone });
          necks.push({ p: [x, y + 0.07, z - 0.01], s: [0.085, 0.1, 0.085], c: tone });
          x += rnd(0.44, 0.54);
        }
      }
    });
    inst(humanGeo, new THREE.MeshStandardMaterial({ roughness: 0.9 }), humans);
    inst(creatureGeo, new THREE.MeshStandardMaterial({ roughness: 0.75 }), creatures);
    inst(new THREE.CylinderGeometry(1, 1.25, 1, 10), new THREE.MeshStandardMaterial({ roughness: 0.9 }), necks);
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), moulds);
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), straps);

    // The big clay sculpt for the film, half painted, on the back bench.
    {
      const size = 2.75, bx = 0.35, by = 0.9, bz = benchZ + 0.02;
      const head = new Head({ size, ...film.spec });
      const clay = new THREE.Color('#8f9484');
      const geo = head.geometry(44, (_p, dir) => (dir.x > 0.05 + Math.sin(dir.y * 9) * 0.06 ? accent.clone().offsetHSL(0, 0, Math.sin(dir.y * 23 + dir.z * 17) * 0.04) : clay));
      const group = new THREE.Group();
      group.position.set(bx, by + 0.17 + 0.115 * size * (film.spec.height ?? 1), bz);
      group.rotation.y = 0.35;
      root.add(group);
      group.add(solid(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 })));
      const eyeM = a.film === 'alien' ? black : s.material(a.film === 'werewolf' ? '#f0b429' : a.film === 'vampire' ? '#d2342a' : '#f1edd8', { roughness: 0.3 });
      const e = head.spec.eyeSpread, h = head.spec.eyeHeight;
      for (const sx of [-1, 1]) {
        if (a.film === 'zombie' && sx === -1) continue;
        const eye = solid(new THREE.SphereGeometry(0.014 * size, 12, 8), eyeM); eye.position.copy(head.face(sx * e, h, -0.004 * size));
        if (a.film === 'alien') eye.scale.set(1.5, 2.1, 0.8), (eye.rotation.z = sx * 0.5);
        group.add(eye);
        if (a.film !== 'alien') { const pupil = solid(new THREE.SphereGeometry(0.006 * size, 8, 6), black); pupil.position.copy(head.face(sx * e, h, 0.008 * size)); group.add(pupil); }
        if (a.film === 'werewolf' || a.film === 'vampire') {
          const ear = solid(new THREE.ConeGeometry(0.03 * size, 0.1 * size, 8), a.film === 'werewolf' ? accentM : clayM);
          ear.position.copy(head.point(new THREE.Vector3(sx * 0.75, 0.6, -0.1))).multiplyScalar(1.12); ear.rotation.z = -sx * 0.5; ear.scale.z = 0.5; group.add(ear);
          const fang = solid(new THREE.ConeGeometry(0.008 * size, 0.035 * size, 6), white); fang.position.copy(head.face(sx * 0.13, -0.5, 0.004 * size)); fang.rotation.x = Math.PI; group.add(fang);
        }
        if (a.film === 'gillman') {
          const fin = solid(new THREE.ConeGeometry(0.06 * size, 0.1 * size, 5), secondM);
          fin.position.copy(head.point(new THREE.Vector3(sx * 0.95, 0.05, -0.1))).multiplyScalar(1.1); fin.rotation.z = -sx * 1.3; fin.scale.z = 0.25; group.add(fin);
        }
      }
      s.ball([0.2, 0.12, 0.15], [bx, by + 0.1, bz], clayM, 14);
      s.cylinder(0.05, 0.07, 0.24, [bx, by + 0.16, bz], clayM, 10);
      s.box([0.5, 0.04, 0.42], [bx, by + 0.02, bz], woodPale).rotation.y = 0.35;
      const tool = s.rod([bx + 0.1, by + 0.72, bz + 0.02], [bx + 0.24, by + 0.98, bz - 0.04], 0.008, wood);
      tool.castShadow = true;
    }

    // ---------------------------------------------------------------- left wall: posters, calendar, tool chest, radio
    const others = (Object.keys(FILM) as Film[]).filter((k) => k !== a.film);
    const wallX = LEFT + 0.012;
    const hangPoster = (f: Film, z: number, y: number, size: number) => {
      const p = plane(size, size * 1.4, poster(f, random), [wallX, y, z], Math.PI / 2);
      p.rotation.z = rnd(-0.03, 0.03) * (1 + wear * 2);
    };
    hangPoster(a.film, -0.55, 2.2, 1.15);
    const second1 = others[Math.floor(random() * others.length)];
    hangPoster(second1, 0.75, 2.45, 0.78);
    if (dens > 0.25) hangPoster(others.filter((k) => k !== second1)[Math.floor(random() * 3)], 1.75, 2.3, 0.78);
    const crosses = { early: 4, crunch: 24, tomorrow: 29, wrapped: 30 }[a.deadline];
    plane(0.62, 0.8, painted(160, 200, (ctx, w, h) => {
      ctx.fillStyle = '#f6f2e4'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = film.poster; ctx.fillRect(0, 0, w, 44);
      ctx.strokeStyle = '#8f8a7c'; ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const cx = 8 + (i % 6) * 24.5, cy = 52 + Math.floor(i / 6) * 29;
        ctx.strokeStyle = '#8f8a7c'; ctx.lineWidth = 1; ctx.strokeRect(cx, cy, 22, 26);
        if (i < crosses) { ctx.strokeStyle = '#d2342a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(cx + 3, cy + 3); ctx.lineTo(cx + 19, cy + 23); ctx.moveTo(cx + 19, cy + 3); ctx.lineTo(cx + 3, cy + 23); ctx.stroke(); }
      }
      ctx.strokeStyle = '#d2342a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(8 + 5 * 24.5 + 11, 52 + 4 * 29 + 13, 16, 0, 7); ctx.stroke();
    }), [wallX, 1.75, -1.85], Math.PI / 2);

    // Red roll-around tool chest with the radio on top.
    const chestZ = 1.55, chestX = LEFT + 0.36;
    s.box([0.56, 0.86, 1.3], [chestX, 0.5, chestZ], red);
    for (let i = 0; i < 5; i++) { s.box([0.02, 0.025, 1.1], [chestX + 0.29, 0.2 + i * 0.16, chestZ], steel).castShadow = false; }
    for (const z of [chestZ - 0.5, chestZ + 0.5]) s.cylinder(0.05, 0.05, 0.05, [chestX + 0.15, 0.05, z], black, 10).rotation.z = Math.PI / 2;
    const notes: THREE.Mesh[] = [];
    const speakers: THREE.Mesh[] = [];
    let screen: THREE.MeshStandardMaterial | null = null;
    const topY = 0.93;
    if (a.radio === 'boombox') {
      s.box([0.2, 0.3, 0.78], [chestX, topY + 0.15, chestZ], s.material('#c4c8c8', { metalness: 0.5, roughness: 0.35 }));
      for (const dz of [-0.26, 0.26]) { const sp = s.cylinder(0.115, 0.115, 0.03, [chestX + 0.105, topY + 0.14, chestZ + dz], black, 20); sp.rotation.z = Math.PI / 2; speakers.push(sp); const cone = s.cylinder(0.045, 0.045, 0.036, [chestX + 0.108, topY + 0.14, chestZ + dz], steel, 14); cone.rotation.z = Math.PI / 2; }
      s.box([0.02, 0.1, 0.2], [chestX + 0.1, topY + 0.2, chestZ], s.material('#3c4046'));
      s.box([0.022, 0.03, 0.2], [chestX + 0.1, topY + 0.09, chestZ], red);
      s.tube([[chestX, topY + 0.3, chestZ - 0.32], [chestX, topY + 0.4, chestZ - 0.2], [chestX, topY + 0.4, chestZ + 0.2], [chestX, topY + 0.3, chestZ + 0.32]], 0.012, black);
      s.rod([chestX - 0.06, topY + 0.3, chestZ + 0.3], [chestX - 0.12, topY + 0.85, chestZ + 0.5], 0.006, steel);
    } else if (a.radio === 'transistor') {
      s.box([0.1, 0.2, 0.3], [chestX, topY + 0.1, chestZ], s.material('#e9b23a'));
      const sp = s.cylinder(0.07, 0.07, 0.02, [chestX + 0.052, topY + 0.1, chestZ - 0.06], black, 16); sp.rotation.z = Math.PI / 2; speakers.push(sp);
      s.box([0.012, 0.05, 0.08], [chestX + 0.052, topY + 0.14, chestZ + 0.09], white);
      s.rod([chestX, topY + 0.2, chestZ + 0.13], [chestX - 0.05, topY + 0.62, chestZ + 0.3], 0.005, steel);
    } else if (a.radio === 'tv') {
      s.box([0.34, 0.07, 0.44], [chestX, topY + 0.035, chestZ], s.material('#3c4046'));
      s.box([0.012, 0.016, 0.16], [chestX + 0.172, topY + 0.035, chestZ - 0.05], black);
      s.box([0.36, 0.34, 0.42], [chestX, topY + 0.25, chestZ], s.material('#a9532f'));
      screen = new THREE.MeshStandardMaterial({ map: painted(128, 100, (ctx, w, h) => {
        ctx.fillStyle = '#25333f'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#c9d7dc'; ctx.beginPath(); ctx.arc(96, 26, 16, 0, 7); ctx.fill();
        ctx.fillStyle = '#0d1114'; ctx.beginPath(); ctx.moveTo(18, 100); ctx.lineTo(30, 46); ctx.lineTo(24, 22); ctx.lineTo(40, 34); ctx.lineTo(56, 22); ctx.lineTo(52, 46); ctx.lineTo(70, 100); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
      }), emissive: '#bcd6e6', emissiveIntensity: 0.55, roughness: 0.3 });
      screen.emissiveMap = screen.map;
      const scr = s.mesh(new THREE.PlaneGeometry(0.3, 0.24), screen, [chestX + 0.182, topY + 0.26, chestZ + 0.03]); scr.rotation.y = Math.PI / 2; scr.castShadow = false;
      for (const dz of [-0.1, 0.1]) s.rod([chestX, topY + 0.42, chestZ], [chestX - 0.05, topY + 0.8, chestZ + dz * 3], 0.005, steel);
    } else {
      s.box([0.3, 0.05, 0.4], [chestX, topY + 0.025, chestZ], s.material('#e9e2c8')).rotation.y = 0.2;
      s.cylinder(0.04, 0.035, 0.1, [chestX + 0.05, topY + 0.05, chestZ + 0.42], white, 12);
    }
    if (a.radio === 'boombox' || a.radio === 'transistor') {
      const noteM = s.material('#2a2a66', { emissive: '#3a3ad0', emissiveIntensity: 0.5 });
      const n = a.radio === 'boombox' ? 5 : 2;
      for (let i = 0; i < n; i++) {
        const note = new THREE.Group() as unknown as THREE.Mesh;
        const headBall = solid(new THREE.SphereGeometry(0.05, 10, 8), noteM); headBall.scale.set(1, 0.75, 0.5);
        const stem = solid(new THREE.BoxGeometry(0.014, 0.17, 0.014), noteM, [0.045, 0.085, 0]);
        const flag = solid(new THREE.BoxGeometry(0.07, 0.03, 0.014), noteM, [0.075, 0.16, 0]);
        note.add(headBall, stem, flag);
        note.position.set(chestX + 0.25 + i * 0.16, topY + 0.55 + i * 0.2, chestZ - 0.25 + (i % 2) * 0.45);
        note.rotation.y = 0.5; note.userData.base = note.position.y; note.userData.phase = i * 1.3;
        root.add(note); notes.push(note);
      }
    }

    // ---------------------------------------------------------------- slot furniture
    // Hero: a sculptor's turntable stand.
    const [hx, hz] = SLOTS[0];
    s.lathe([[0, 0.9], [0.52, 0.9], [0.54, 0.93], [0.54, 1.0], [0.5, 1.02], [0, 1.02]], woodPale, [hx, 0, hz]);
    s.cylinder(0.3, 0.3, 0.04, [hx, 0.88, hz], steel, 24);
    s.cylinder(0.045, 0.06, 0.82, [hx, 0.46, hz], steel, 12);
    s.cylinder(0.09, 0.09, 0.1, [hx, 0.6, hz], black, 12);
    for (let i = 0; i < 3; i++) { const ang = i * 2.094 + 0.4; s.rod([hx, 0.2, hz], [hx + Math.cos(ang) * 0.5, 0.03, hz + Math.sin(ang) * 0.5], 0.03, steel); s.ball([0.05, 0.03, 0.05], [hx + Math.cos(ang) * 0.5, 0.03, hz + Math.sin(ang) * 0.5], black, 8); }
    // Two paint-crusted rolling work tables.
    const blobs: { p: V3; s: V3; c: string }[] = [];
    for (const [x, z] of [SLOTS[1], SLOTS[2]]) {
      s.box([1.25, 0.06, 1.0], [x, 0.87, z], woodPale);
      s.box([1.15, 0.03, 0.9], [x, 0.28, z], steel);
      for (const dx of [-0.56, 0.56]) for (const dz of [-0.44, 0.44]) { s.box([0.05, 0.8, 0.05], [x + dx, 0.47, z + dz], steel); s.ball([0.045, 0.045, 0.045], [x + dx, 0.045, z + dz], black, 8); }
      for (let i = 0; i < 8 + wear * 16; i++) { const r = rnd(0.02, 0.07); blobs.push({ p: [x + rnd(-0.58, 0.58), 0.901, z + (random() < 0.5 ? rnd(-0.47, -0.3) : rnd(0.3, 0.47))], s: [r, 0.004, r * rnd(0.6, 1.3)], c: bright() }); }
      const stuff = Math.round(dens * 3);
      for (let i = 0; i < stuff; i++) s.box([rnd(0.2, 0.35), rnd(0.12, 0.22), rnd(0.2, 0.3)], [x + rnd(-0.35, 0.35), 0.38, z + rnd(-0.25, 0.25)], s.material(i % 2 ? '#c9a878' : bright()));
    }
    inst(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ roughness: 0.4 }), blobs);
    // Two apple boxes on the floor.
    for (const [x, z] of [SLOTS[3], SLOTS[4]]) {
      const turn = rnd(-0.2, 0.2);
      const crate = s.box([1.05, 0.3, 1.05], [x, 0.16, z], wood); crate.rotation.y = turn;
      for (const dy of [0.06, 0.26]) { const band = s.box([1.07, 0.035, 1.07], [x, dy, z], woodDark); band.rotation.y = turn; }
    }

    // ---------------------------------------------------------------- today's job
    const jars: { p: V3; s: V3; c: string }[] = [], lids: { p: V3; s: V3; c: string }[] = [];
    const jar = (x: number, y: number, z: number, c: string, r = 0.045, h = 0.11) => { jars.push({ p: [x, y + h / 2, z], s: [r, h, r], c }); lids.push({ p: [x, y + h + 0.008, z], s: [r * 1.05, 0.016, r * 1.05], c: '#e8e4d6' }); };
    const benchTop = 0.9, wx0 = benchX0 + 0.25, wx1 = -0.35;
    if (a.work === 'tidy') {
      for (let i = 0; i < 7; i++) jar(wx0 + 0.3 + i * 0.13, benchTop, benchZ - 0.22, BRIGHTS[i % BRIGHTS.length]);
      s.box([0.6, 0.02, 0.24], [wx0 + 1.9, benchTop + 0.01, benchZ + 0.1], s.material('#6c7f5c'));
      for (let i = 0; i < 6; i++) s.rod([wx0 + 1.66 + i * 0.09, benchTop + 0.03, benchZ + 0.02], [wx0 + 1.66 + i * 0.09, benchTop + 0.03, benchZ + 0.2], 0.008, i % 2 ? steel : wood);
      s.rod([3.3, 0, BACK + 0.5], [3.38, 1.5, BACK + 0.12], 0.016, wood);
      s.box([0.34, 0.14, 0.06], [3.29, 0.07, BACK + 0.52], s.material('#c9a94a'));
    } else if (a.work === 'casting') {
      for (const [x, z, c] of [[wx0 + 0.3, benchZ, '#e9e7dc'], [-2.9, 0.75, '#d9d6c8'], [1.55, -1.5, '#e9e7dc']] as const) {
        const onBench = z === benchZ, y0 = onBench ? benchTop : 0;
        s.lathe([[0, 0], [0.13, 0], [0.16, 0.3], [0.17, 0.3], [0.14, 0.02]], s.material('#4f7fb0', { side: THREE.DoubleSide }), [x, y0, z]);
        s.cylinder(0.15, 0.15, 0.02, [x, y0 + 0.27, z], s.material(c, { roughness: 1 }), 16);
        s.rod([x + 0.02, y0 + 0.2, z], [x + 0.16, y0 + 0.52, z + 0.08], 0.012, wood);
      }
      // An opened two-part mould, the cavity still wet.
      for (const [dx, tilt] of [[0, 0], [0.56, 0.5]] as const) {
        const half = s.box([0.46, 0.2, 0.4], [wx0 + 1.1 + dx, benchTop + 0.1 + tilt * 0.14, benchZ + 0.02], plasterM); half.rotation.z = -tilt;
        const cav = s.ball([0.14, 0.03, 0.17], [wx0 + 1.1 + dx - tilt * 0.1, benchTop + 0.2 + tilt * 0.17, benchZ + 0.02], s.material(film.accent, { roughness: 0.3 }), 12); cav.rotation.z = -tilt;
      }
      for (let i = 0; i < 2 + Math.round(dens * 2); i++) { const sack = s.ball([0.34, 0.11, 0.22], [2.2 + (i % 2) * 0.08, 0.11 + i * 0.19, BACK + 1.25], s.material('#d9cfb2'), 12); sack.rotation.y = rnd(-0.2, 0.2); }
      for (let i = 0; i < 5; i++) { const r = rnd(0.07, 0.2); s.cylinder(r, r, 0.012, [rnd(-2.6, -0.4), 0.006, rnd(-1.9, -1.2)], white, 12).castShadow = false; }
    } else if (a.work === 'painting') {
      const n = 14 + Math.round(dens * 16);
      for (let i = 0; i < n; i++) jar(wx0 + 0.1 + random() * (wx1 - wx0 - 0.9), benchTop, benchZ + rnd(-0.3, 0.3), bright(), rnd(0.035, 0.05), rnd(0.08, 0.13));
      // Cardboard spray booth, sprayed in the film's colours.
      const card = s.material('#c8a271', { side: THREE.DoubleSide });
      const bxs = wx1 - 0.3;
      s.box([0.7, 0.6, 0.02], [bxs, benchTop + 0.3, benchZ - 0.3], card);
      const l = s.box([0.02, 0.6, 0.5], [bxs - 0.38, benchTop + 0.3, benchZ - 0.08], card); l.rotation.y = -0.3;
      const r = s.box([0.02, 0.6, 0.5], [bxs + 0.38, benchTop + 0.3, benchZ - 0.08], card); r.rotation.y = 0.3;
      s.ball([0.22, 0.2, 0.012], [bxs, benchTop + 0.32, benchZ - 0.285], s.material(film.accent, { roughness: 0.8 }), 14).castShadow = false;
      s.ball([0.1, 0.09, 0.012], [bxs + 0.14, benchTop + 0.24, benchZ - 0.28], s.material(film.second, { roughness: 0.8 }), 12).castShadow = false;
      // Compressor on the floor with a coiled hose.
      s.cylinder(0.16, 0.16, 0.55, [-0.9, 0.24, -1.55], red, 16).rotation.z = Math.PI / 2;
      s.box([0.24, 0.16, 0.2], [-0.9, 0.48, -1.55], black);
      for (const dx of [-0.2, 0.2]) s.box([0.04, 0.1, 0.3], [-0.9 + dx, 0.05, -1.55], black);
      s.ring(0.17, 0.014, [-0.35, 0.02, -1.4], s.material('#2f6fb0')).rotation.x = Math.PI / 2;
      s.ring(0.14, 0.014, [-0.33, 0.045, -1.42], s.material('#2f6fb0')).rotation.x = Math.PI / 2;
    } else {
      // Fur day: a rack of hanks, loose pelts and clippings.
      const rx = -1.0, rz = -1.5;
      for (const dx of [-0.5, 0.5]) { s.rod([rx + dx, 0, rz - 0.2], [rx + dx, 1.25, rz], 0.018, steel); s.rod([rx + dx, 0, rz + 0.2], [rx + dx, 1.25, rz], 0.018, steel); }
      s.rod([rx - 0.56, 1.25, rz], [rx + 0.56, 1.25, rz], 0.018, steel);
      const furs = ['#6b4a2f', '#2e2a28', '#c9a878', '#8a8d8f', '#a8552e', film.accent];
      for (let i = 0; i < 5; i++) {
        const c = furs[Math.floor(random() * furs.length)], len = rnd(0.5, 0.85);
        s.mesh(taperTube([[rx - 0.42 + i * 0.21, 1.27, rz], [rx - 0.42 + i * 0.21, 1.27 - len * 0.5, rz + 0.07], [rx - 0.42 + i * 0.21 + rnd(-0.04, 0.04), 1.27 - len, rz + 0.05]], (t, ang) => (0.07 - t * 0.035) * (1 + 0.25 * Math.sin(ang * 5 + t * 9)), 14, 10), s.material(c, { roughness: 1 }));
      }
      s.ball([0.34, 0.03, 0.26], [wx0 + 0.6, benchTop + 0.03, benchZ], s.material(furs[0], { roughness: 1 }), 12);
      s.ball([0.26, 0.035, 0.2], [wx0 + 1.5, benchTop + 0.035, benchZ + 0.05], s.material(furs[3], { roughness: 1 }), 12);
      s.box([0.22, 0.012, 0.06], [wx0 + 1.05, benchTop + 0.01, benchZ + 0.2], steel).rotation.y = 0.5;
      const tufts: { p: V3; s: V3; r: V3; c: string }[] = [];
      for (let i = 0; i < 60 + dens * 90; i++) { const ang = random() * 7, d = random() ** 0.7 * 0.75; tufts.push({ p: [rx + Math.cos(ang) * d, 0.02 + (0.75 - d) * 0.12 * random(), rz + 0.75 + Math.sin(ang) * d * 0.7], s: [0.05, 0.02, 0.012], r: [0, random() * 7, 0], c: furs[Math.floor(random() * furs.length)] }); }
      inst(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ roughness: 1 }), tufts);
    }
    // Ever-present bench clutter.
    for (let i = 0; i < Math.round(dens * 5); i++) jar(rnd(wx1 + 0.1, benchX1 - 0.2), benchTop, benchZ + rnd(0.2, 0.33), bright(), 0.04, rnd(0.07, 0.12));
    inst(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ roughness: 0.35 }), jars);
    inst(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ roughness: 0.6 }), lids);
    // A stool at the back bench.
    s.cylinder(0.17, 0.17, 0.05, [-1.9, 0.62, benchZ + 0.75], red, 16);
    for (let i = 0; i < 3; i++) { const ang = i * 2.094; s.rod([-1.9, 0.6, benchZ + 0.75], [-1.9 + Math.cos(ang) * 0.2, 0, benchZ + 0.75 + Math.sin(ang) * 0.2], 0.014, steel); }

    // ---------------------------------------------------------------- deadline dressing
    const cups: { p: V3; s: V3; c: string }[] = [];
    const cupCount = { early: 1, crunch: 7, tomorrow: 15, wrapped: 5 }[a.deadline];
    const cupSpots: V3[] = [[SLOTS[1][0] - 0.5, 0.9, SLOTS[1][1] + 0.42], [SLOTS[2][0] + 0.5, 0.9, SLOTS[2][1] + 0.4], [hx + 0.9, 0, hz + 0.5], [chestX + 0.1, topY, chestZ - 0.52], [benchX1 - 0.25, benchTop, benchZ + 0.3], [-1.9, 0.645, benchZ + 0.75]];
    for (let i = 0; i < cupCount; i++) {
      const spot = cupSpots[i % cupSpots.length], lap = Math.floor(i / cupSpots.length);
      cups.push({ p: [spot[0] + lap * 0.1 * (i % 2 ? 1 : -1), spot[1] + 0.05, spot[2] - lap * 0.09], s: [0.04, 0.1, 0.04], c: a.deadline === 'wrapped' ? '#e2483c' : i % 3 ? '#f4f1e6' : '#7fb6d8' });
    }
    inst(new THREE.CylinderGeometry(1, 0.78, 1, 12), new THREE.MeshStandardMaterial({ roughness: 0.6 }), cups);
    if (a.deadline === 'crunch' || a.deadline === 'tomorrow') {
      const n = a.deadline === 'tomorrow' ? 5 : 2;
      for (let i = 0; i < n; i++) { const box = s.box([0.42, 0.045, 0.42], [-2.95, 0.025 + i * 0.047, 0.55], s.material(i % 2 ? '#e9dfc4' : '#d94f3a')); box.rotation.y = rnd(-0.3, 0.3); }
    }
    if (a.deadline === 'tomorrow') {
      const bag = s.mesh(taperTube([[LEFT + 0.42, 0.1, -2.0], [LEFT + 0.44, 0.13, -1.2], [LEFT + 0.4, 0.1, -0.35]], (t) => 0.2 - t * 0.05, 14, 10), s.material('#3f6fb8', { roughness: 0.9 }));
      bag.scale.y = 0.55;
      s.ball([0.2, 0.07, 0.15], [LEFT + 0.42, 0.09, -2.18], white, 12);
      s.box([0.1, 0.14, 0.1], [LEFT + 0.75, 0.07, -2.2], s.material('#e2483c'));
    }
    if (a.deadline === 'wrapped') {
      // Balloons tied to the tool chest, a bottle on the floor.
      for (let i = 0; i < 3; i++) {
        const bx = chestX + 0.2 + i * 0.16, bz = chestZ + 0.62 + i * 0.08, top = 1.9 + i * 0.22;
        s.rod([chestX + 0.2, topY, chestZ + 0.6], [bx, top - 0.18, bz], 0.004, white).castShadow = false;
        s.ball([0.16, 0.2, 0.16], [bx, top, bz], s.material(BRIGHTS[(i * 2) % BRIGHTS.length], { roughness: 0.25 }), 14);
      }
      s.cylinder(0.02, 0.045, 0.3, [hx + 0.95, 0.15, hz + 0.35], s.material('#2f5f3a', { roughness: 0.2 }), 10);
    }

    // ---------------------------------------------------------------- back corner
    const cx = 2.55, cz = BACK + 0.75;
    if (a.corner === 'suit') {
      const skin = s.material(accent.clone().offsetHSL(0, 0.05, -0.05), { roughness: 0.55 });
      const belly = s.material(accent.clone().lerp(new THREE.Color('#e9dfb8'), 0.5));
      s.cylinder(0.3, 0.34, 0.04, [cx, 0.02, cz], steel, 20);
      s.cylinder(0.02, 0.02, 1.0, [cx, 0.5, cz - 0.16], steel, 8);
      s.ball([0.27, 0.36, 0.2], [cx, 1.2, cz], skin, 16);
      s.ball([0.19, 0.27, 0.05], [cx, 1.17, cz + 0.17], belly, 12);
      for (const sx of [-1, 1]) {
        s.mesh(taperTube([[cx + sx * 0.22, 1.45, cz], [cx + sx * 0.5, 1.4, cz + 0.08], [cx + sx * 0.62, 1.08, cz + 0.2], [cx + sx * 0.58, 0.9, cz + 0.28]], (t) => 0.085 - t * 0.03, 16, 8), skin);
        for (let i = 0; i < 3; i++) s.rod([cx + sx * 0.58, 0.9, cz + 0.28], [cx + sx * (0.52 + i * 0.05), 0.76, cz + 0.32], 0.016, secondM, 0.003);
        s.mesh(taperTube([[cx + sx * 0.13, 0.95, cz], [cx + sx * 0.17, 0.5, cz + 0.03], [cx + sx * 0.15, 0.1, cz]], (t) => 0.115 - t * 0.04, 12, 8), skin);
        s.ball([0.1, 0.05, 0.17], [cx + sx * 0.15, 0.07, cz + 0.07], skin, 10);
      }
      const head = new Head({ size: 1.7, ...film.spec });
      const hm = s.mesh(head.geometry(30), skin, [cx, 1.72, cz + 0.03]);
      const eyeM = s.material(a.film === 'alien' ? '#15161a' : '#f6e04a', { roughness: 0.3, emissive: a.film === 'alien' ? '#000000' : '#6a5a10' });
      for (const sx of [-1, 1]) { const eye = s.ball([0.03, a.film === 'alien' ? 0.05 : 0.03, 0.02], [0, 0, 0], eyeM, 10); eye.position.copy(head.face(sx * head.spec.eyeSpread, head.spec.eyeHeight, -0.004)).add(hm.position); }
      if (a.film === 'werewolf' || a.film === 'vampire') for (const sx of [-1, 1]) { const ear = s.mesh(new THREE.ConeGeometry(0.05, 0.19, 8), skin, [cx + sx * 0.13, 1.93, cz]); ear.rotation.z = -sx * 0.4; ear.scale.z = 0.5; }
      if (a.film === 'gillman') { const crest = s.mesh(new THREE.ConeGeometry(0.14, 0.22, 5), secondM, [cx, 1.95, cz - 0.02]); crest.scale.x = 0.2; }
    } else if (a.corner === 'lifecast') {
      const cloth = s.material('#e9e2c8'), jeans = s.material('#4f6f9f'), skin = s.material('#d9a585');
      s.box([0.5, 0.05, 0.5], [cx, 0.5, cz], woodDark); s.box([0.5, 0.6, 0.05], [cx, 0.8, cz - 0.25], woodDark);
      for (const dx of [-0.22, 0.22]) for (const dz of [-0.22, 0.22]) s.box([0.05, 0.5, 0.05], [cx + dx, 0.25, cz + dz], woodDark);
      s.mesh(new THREE.ConeGeometry(0.42, 0.75, 16), cloth, [cx, 1.0, cz + 0.02]);
      for (const sx of [-1, 1]) { s.box([0.16, 0.14, 0.48], [cx + sx * 0.12, 0.6, cz + 0.26], jeans); s.box([0.14, 0.52, 0.14], [cx + sx * 0.12, 0.27, cz + 0.46], jeans); s.box([0.14, 0.08, 0.26], [cx + sx * 0.12, 0.04, cz + 0.52], s.material(sx > 0 ? '#e2483c' : '#f4f1e6')); s.ball([0.05, 0.05, 0.05], [cx + sx * 0.2, 0.7, cz + 0.42], skin, 8); }
      s.ball([0.2, 0.24, 0.21], [cx, 1.55, cz + 0.02], plasterM, 16);
      s.ball([0.22, 0.07, 0.22], [cx, 1.36, cz + 0.02], plasterM, 12);
      for (const sx of [-1, 1]) s.rod([cx + sx * 0.03, 1.5, cz + 0.2], [cx + sx * 0.05, 1.47, cz + 0.36], 0.008, red);
      for (let i = 0; i < 4; i++) s.ball([0.03, 0.05, 0.02], [cx + rnd(-0.15, 0.15), 1.4 - i * 0.07, cz + 0.2 + i * 0.02], plasterM, 6);
      s.lathe([[0, 0], [0.13, 0], [0.16, 0.28], [0.14, 0.02]], s.material('#4f7fb0', { side: THREE.DoubleSide }), [cx - 0.6, 0, cz + 0.4]);
      s.cylinder(0.145, 0.145, 0.02, [cx - 0.6, 0.24, cz + 0.4], plasterM, 14);
    } else if (a.corner === 'oven') {
      const body = s.material('#9fb0a8', { metalness: 0.3, roughness: 0.5 });
      s.box([1.1, 1.6, 0.8], [cx, 0.85, cz - 0.15], body);
      s.box([0.9, 1.2, 0.02], [cx, 0.9, cz + 0.255], s.material('#f08a2a', { emissive: '#ff7a1a', emissiveIntensity: mix(0.7, 1.4, energy) }));
      for (let i = 0; i < 3; i++) { s.box([0.86, 0.02, 0.3], [cx, 0.5 + i * 0.38, cz + 0.3], steel); s.box([0.3, 0.16, 0.24], [cx - 0.2 + (i % 2) * 0.36, 0.59 + i * 0.38, cz + 0.32], plasterM); }
      const door = s.box([0.04, 1.3, 0.95], [cx + 0.55, 0.9, cz + 0.7], body); door.rotation.y = 0.25;
      s.cylinder(0.07, 0.07, 0.04, [cx - 0.35, 1.72, cz + 0.2], black, 14).rotation.x = Math.PI / 2;
      s.cylinder(0.07, 0.07, 0.04, [cx + 0.35, 1.72, cz + 0.2], red, 14).rotation.x = Math.PI / 2;
      s.cylinder(0.08, 0.08, 0.5, [cx + 0.3, 1.9, cz - 0.3], steel, 12);
    } else {
      const sizes: [number, number, number, number, number][] = [[cx, 0, 0.95, 0.7, 0.8], [cx + 0.05, 0.7, 0.8, 0.55, 0.7], [cx - 0.75, 0, 0.6, 0.5, 0.6]];
      for (const [x, y, w, h, d] of sizes) {
        s.box([w, h, d], [x, y + h / 2, cz], woodPale);
        for (const dy of [0.06, h - 0.06]) s.box([w + 0.03, 0.07, d + 0.03], [x, y + dy, cz], wood);
        const lab = s.label(y > 0 ? film.title.split(' ')[0] : 'FRAGILE', w * 0.75, h * 0.3, [x, y + h / 2, cz + d / 2 + 0.006], '#c8392f', '#d3b98a'); lab.castShadow = false;
      }
    }
    // A bin of offcuts by the bench, fuller when the shop is busy.
    s.lathe([[0, 0], [0.17, 0], [0.22, 0.5], [0.2, 0.02]], s.material('#6c7f8f', { side: THREE.DoubleSide, metalness: 0.3 }), [1.55, 0, BACK + 0.45]);
    if (dens > 0.35) for (let i = 0; i < 3; i++) s.ball([0.1, 0.07, 0.1], [1.55 + rnd(-0.08, 0.08), 0.46 + i * 0.05, BACK + 0.45 + rnd(-0.08, 0.08)], i % 2 ? accentM : white, 8);

    // ---------------------------------------------------------------- placement and life
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

    const beat = mix(1.4, 4.2, energy);
    world.update = (_dt, time) => {
      for (const { group, phase, amount } of swayers) {
        group.rotation.z = Math.sin(time * mix(0.5, 1.6, energy) + phase) * mix(0.004, 0.06, energy) * amount;
      }
      notes.forEach((note) => {
        const t = time * beat * 0.5 + note.userData.phase;
        note.position.y = note.userData.base + Math.sin(t) * 0.06 * (0.3 + energy);
        note.rotation.z = Math.sin(t * 1.3) * 0.25;
      });
      const thump = 1 + Math.max(0, Math.sin(time * beat * Math.PI)) * 0.12 * (0.2 + energy);
      for (const sp of speakers) sp.scale.set(thump, 1, thump);
      if (screen) screen.emissiveIntensity = 0.5 + Math.sin(time * 9) * Math.sin(time * 2.3) * 0.12;
    };
    return world;
  },
});
