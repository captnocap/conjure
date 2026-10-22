import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, score } from '@conjure/kit';

type P = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const W = 8, D = 7, H = 3.1, PX = 200;
const BACK = -D / 2, LEFT = -W / 2;

const ERAS = {
  london77: '1977 London: yellowed cream tiles, municipal green stalls, ransom-note lettering in black, red, pink and acid yellow.',
  hardcore: 'Eighties hardcore: bare grey block, steel-blue stalls, black marker X marks and photocopied black-and-white flyers.',
  riotgrrrl: 'Nineties riot grrrl: pink tiles and mint paint, red stalls, hearts, stars and zine pages in red marker.',
  goth: 'Goth night: black tiles, purple walls, silver marker, bats and candle wax.',
  queer: 'Present-day queer punk: teal walls, lavender and pink stalls, rainbow stickers and kind messages.',
} as const;
const LOOK: Record<keyof typeof ERAS, {
  bg: string; tile: string; alt: string; grout: string; paint: string; stall: string; door: string; glow: string;
  inks: readonly string[]; stickers: readonly string[]; bands: readonly string[]; tags: readonly string[]; lipstick: readonly string[];
}> = {
  london77: {
    bg: '#8d887c', tile: '#e6dfc0', alt: '#22201f', grout: '#8a8168', paint: '#b7ab82', stall: '#2f5a4a', door: '#356653', glow: '#ff4fa8',
    inks: ['#15131a', '#d81e2c', '#ff3d9a', '#f2d21a'], stickers: ['#f2d21a', '#ff3d9a', '#15131a', '#f4f1e6', '#d81e2c'],
    bands: ['RATS', 'DOLE Q', 'SPIT', 'THE NITS', 'GLUE', 'BORED', 'VERMIN', 'NO FUN'], tags: ['OI!', 'JO WOZ ERE', '1977', 'SID', 'BORED', 'XXX', 'VIV'],
    lipstick: ['NO FUTURE', 'JO 4 VIV', 'U LOOK FINE'],
  },
  hardcore: {
    bg: '#7c8187', tile: '#a3a8aa', alt: '#8e9497', grout: '#62676b', paint: '#8a8f93', stall: '#3a4658', door: '#44526a', glow: '#ff5a36',
    inks: ['#111114', '#f2f2ee', '#c4122f'], stickers: ['#f2f2ee', '#111114', '#d9d9d2', '#c4122f'],
    bands: ['X', 'TEETH', 'NO WAR', 'WASP', 'SLUG', 'ZERO', 'UNIT 4', 'HALT'], tags: ['XXX', 'DIY', 'ALL AGES', 'NO', 'CREW', 'X X X', '84'],
    lipstick: ['STAY TRUE', 'XXX', 'WAKE UP'],
  },
  riotgrrrl: {
    bg: '#978c94', tile: '#f0c6cd', alt: '#f7e9ea', grout: '#b78b93', paint: '#9ccfc2', stall: '#c8323c', door: '#d6414a', glow: '#ff4fa8',
    inks: ['#c4122f', '#15131a', '#ff3d9a', '#5b2a86'], stickers: ['#ff3d9a', '#f4f1e6', '#c4122f', '#ffd23a', '#5b2a86'],
    bands: ['BRAT', 'HEX', 'KITTEN', 'SLIP', 'MOLD', 'GRRR', 'TEETH', 'DOLL'], tags: ['GRRRL', 'XO', 'START A BAND', 'SLUT?', 'ZINE', 'KAT', 'BFF'],
    lipstick: ['U LOOK FINE', 'BE LOUD', 'KAT + JEN'],
  },
  goth: {
    bg: '#6f6679', tile: '#2c2932', alt: '#3a3344', grout: '#16141a', paint: '#4b3160', stall: '#1c1a22', door: '#25222d', glow: '#b04dff',
    inks: ['#d9d6e6', '#b01a3c', '#9a6be0'], stickers: ['#d9d6e6', '#16141a', '#b01a3c', '#5b2a86'],
    bands: ['HEX', 'CRYPT', 'VEIL', 'MOTH', 'ASH', 'NOX', 'WAKE', 'RUE'], tags: ['RIP', 'BATS', 'NEVERMORE', 'XIII', 'LILITH', 'UNDEAD'],
    lipstick: ['UNDEAD', 'KISS ME', 'STAY PALE'],
  },
  queer: {
    bg: '#8a92a4', tile: '#e8e5f1', alt: '#f6c9dc', grout: '#a9a4bb', paint: '#7cc2be', stall: '#8f7be0', door: '#f08ab8', glow: '#ff4fa8',
    inks: ['#15131a', '#ff3d9a', '#5a4be0', '#11a36a', '#ff7a1a'], stickers: ['#ff3d9a', '#ffd23a', '#5ad0ff', '#7be07b', '#b98cff', '#f4f1e6', '#ff7a1a'],
    bands: ['THEY/THEM', 'SOFT', 'FERAL', 'GLITTER', 'MUTUAL AID', 'BRAT', 'MOSS', 'TRANS JOY'], tags: ['U R LOVED', 'HYDRATE', 'BE GAY', 'ACAB', 'TXT ME', 'SAFE HERE', 'XOXO'],
    lipstick: ['U LOOK FINE', 'U R LOVED', 'HOT!'],
  },
};
const HEADLINES = {
  none: '', nofuture: 'NO FUTURE', loved: 'YOU ARE LOVED', front: 'GIRLS TO THE FRONT', dead: "PUNK'S NOT DEAD", mum: 'CALL YOUR MUM', bored: 'BORED BORED BORED',
} as const;
const SLOGANS = ['NO GODS', 'NO MASTERS', 'EAT THE RICH', 'RENT IS THEFT', 'NO BORDERS', 'SMASH IT UP', 'STRIKE!', 'FREE GIGS', 'NO COPS', 'UNION NOW'];
const LYRICS = ['i was a teenage', 'nothing to do', 'in this town', 'we are the noise', 'dont wait up', 'all my friends', 'are here tonight', 'sing it louder', 'three chords', 'and the truth'];
const SLOTS: readonly (readonly [number, number])[] = [[0.5, 0.55], [2.75, 2.1], [-1.55, 2.45], [2.55, -0.9]];

const canvasOf = (w: number, h: number) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return [cv, cv.getContext('2d')!] as const; };
const mapOf = (cv: HTMLCanvasElement) => { const map = new THREE.CanvasTexture(cv); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; return map; };
const heart = (c: Ctx, x: number, y: number, r: number) => { c.beginPath(); c.moveTo(x, y + r * 0.9); c.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.1, x, y - r * 0.35); c.bezierCurveTo(x + r * 0.75, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9); };

export default defineWorld({
  questions: {
    era: choice('Which scene and era is it?', ERAS),
    happening: choice('What is happening in there?', {
      rush: 'Mid-gig rush: cups on every ledge, coats in a heap, boots under a locked door, wet footprints and loo roll trailing.',
      empty: 'Emptied out: everyone is at the front for the last band. One tap drips.',
      flooded: 'Flooded: a sink is overflowing, the floor is a shallow lake with paper and cups afloat.',
      cleanup: 'The morning clean-up: door propped open on grey daylight, mop bucket, wet-floor sign, bin bags.',
    }),
    walls: choice('What do the walls mostly say?', {
      stickers: 'Band stickers and gig flyers, layer on layer.',
      marker: 'Marker tags and names, scrawled everywhere a hand can reach.',
      political: 'Political slogans in block capitals.',
      hearts: 'Hearts, initials, phone numbers and declarations of love.',
      lyrics: 'Song lyrics and poetry in careful handwriting.',
      painted: 'Mostly painted over in grey patches, with a few fresh tags already back.',
    }),
    headline: choice('What is sprayed in big letters across the back wall?', {
      none: 'Nothing big, only the small stuff.',
      nofuture: 'NO FUTURE',
      loved: 'YOU ARE LOVED',
      front: 'GIRLS TO THE FRONT',
      dead: "PUNK'S NOT DEAD",
      mum: 'CALL YOUR MUM',
      bored: 'BORED BORED BORED',
    }),
    light: choice('What lights the room?', {
      caged: 'One bare bulb in a wire cage, yellow and steady.',
      tube: 'A buzzing fluorescent tube over the mirror, greenish white.',
      red: 'A red bulb in the cage, darkroom red over everything.',
      dead: 'The bulb is dead: only candles stuck on the ledge and the light under the door.',
    }),
    doors: choice('What state are the stall doors in?', {
      shut: 'All closed, at least one bolted.',
      ajar: 'A mix: one ajar, one wide open.',
      hinge: 'One hangs off a single hinge.',
      gone: 'The doors are long gone; one stall has a shower curtain instead.',
    }),
    floor: choice('What is the floor?', {
      checker: 'Black and white checkerboard tiles.',
      mosaic: 'Small pale mosaic tiles with dark grout.',
      redpaint: 'Concrete painted oxblood red, worn through in paths.',
      lino: 'Curling speckled lino.',
    }),
    mirror: score('How broken is the mirror?', ['Whole, only scratched', 'One spider-web crack', 'Shattered, with pieces missing']),
    left: choice('What has been left by the sinks?', {
      nothing: 'Nothing but soap scum.',
      cups: 'Plastic pint cups and beer cans.',
      haircut: 'A DIY haircut: clippers, a milk-crate seat, hair on the floor and dye down one sink.',
      lost: 'Lost property: a studded jacket on a hook, one boot, a tote bag.',
      flyers: 'A stack of flyers for the next gig, half of them on the floor.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const L = LOOK[a.era];
    const cleanup = a.happening === 'cleanup', rush = a.happening === 'rush', flooded = a.happening === 'flooded';
    const background = new THREE.Color(L.bg).lerp(new THREE.Color('#c9cdd0'), cleanup ? 0.45 : 0).offsetHSL(0, 0, mix(-0.03, 0.04, mood.cheer));
    const { art: s, world } = diorama(context, {
      background: `#${background.getHexString()}`, floor: '#6f6a66', width: W, depth: D, maxHeight: 2.2, radius: 1.05, pitch: 27, yaw: 36, slots: SLOTS,
    });
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
    const wear = mood.wear, dense = mood.density;

    // Dusk the stock lights down: the bulb and the door strip do the talking.
    for (const child of s.root.children) {
      if (child instanceof THREE.HemisphereLight) { child.intensity = cleanup ? 1.25 : 0.8; child.color.set(cleanup ? '#e9f0f5' : '#d6cfe6'); child.groundColor.set('#5d5560'); }
      else if (child instanceof THREE.DirectionalLight) child.intensity *= child.castShadow ? (cleanup ? 0.8 : 0.6) : 0.6;
    }

    const steel = s.material('#b4babd', { metalness: 0.8, roughness: 0.35 });
    const white = s.material('#eeeade', { roughness: 0.3 });
    const black = s.material('#1c1b20', { roughness: 0.55 });
    const stallM = s.material(L.stall, { roughness: 0.5 });
    const glow = (colour: string, strength: number) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: strength, roughness: 0.4 });
    const panel = (map: THREE.Texture, w: number, h: number, at: P, turn = 0, options: THREE.MeshStandardMaterialParameters = {}) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.7, ...options }));
      mesh.position.set(...at); mesh.rotation.y = turn; mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };

    // ---- Things people write and stick on walls.
    const ink = () => pick(L.inks);
    const sticker = (c: Ctx, x: number, y: number, size: number) => {
      c.save(); c.translate(x, y); c.rotate(jitter(0.5));
      const fill = pick(L.stickers), w = size * mix(1.2, 2.2, random()), h = size * mix(0.6, 1.1, random());
      c.fillStyle = fill;
      const round = random() < 0.3;
      c.beginPath(); if (round) c.arc(0, 0, h * 0.75, 0, 7); else c.rect(-w / 2, -h / 2, w, h); c.fill();
      c.lineWidth = Math.max(1, size * 0.07); c.strokeStyle = 'rgba(255,255,255,0.75)'; c.stroke();
      const dark = new THREE.Color(fill).getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
      c.fillStyle = dark ? '#f4f1e6' : '#15131a';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${h * 0.6}px sans-serif`;
      c.fillText(pick(L.bands), 0, 0, (round ? h * 1.3 : w) * 0.9);
      if (wear > 0.4 && random() < wear) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(-w / 2, -h / 2, w * random() * 0.5, h); }
      c.restore();
    };
    const tag = (c: Ctx, x: number, y: number, size: number) => {
      c.save(); c.translate(x, y); c.rotate(jitter(0.35));
      c.fillStyle = c.strokeStyle = ink(); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `${pick(['bold', 'italic bold', 'bold'])} ${size}px ${pick(['sans-serif', 'monospace', 'serif'])}`;
      const text = pick(L.tags);
      c.fillText(text, 0, 0);
      if (random() < 0.4) { c.lineWidth = size * 0.09; c.beginPath(); c.moveTo(-size * text.length * 0.3, size * 0.6); c.quadraticCurveTo(0, size * 0.85, size * text.length * 0.3, size * 0.55); c.stroke(); }
      c.restore();
    };
    const slogan = (c: Ctx, x: number, y: number, size: number) => {
      c.save(); c.translate(x, y); c.rotate(jitter(0.08));
      c.fillStyle = c.strokeStyle = ink(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${size * 1.2}px sans-serif`;
      const text = pick(SLOGANS);
      c.fillText(text, 0, 0);
      if (random() < 0.35) { c.lineWidth = size * 0.14; c.beginPath(); c.arc(-size * text.length * 0.42 - size, 0, size * 0.7, 0, 7); c.stroke(); c.font = `bold ${size}px sans-serif`; c.fillText('A', -size * text.length * 0.42 - size, 0); }
      c.restore();
    };
    const love = (c: Ctx, x: number, y: number, size: number) => {
      c.save(); c.translate(x, y); c.rotate(jitter(0.25));
      c.fillStyle = c.strokeStyle = ink(); c.textAlign = 'center'; c.textBaseline = 'middle';
      if (random() < 0.55) {
        c.lineWidth = size * 0.12; heart(c, 0, 0, size * 0.9); if (random() < 0.4 + mood.cheer * 0.4) { c.globalAlpha = 0.85; c.fill(); c.fillStyle = '#f4f1e6'; } else c.stroke();
        c.globalAlpha = 1; c.font = `bold ${size * 0.55}px sans-serif`;
        c.fillText(`${pick(['J', 'K', 'M', 'S', 'V', 'R', 'D'])}+${pick(['A', 'T', 'L', 'N', 'B', 'X'])}`, 0, -size * 0.05);
      } else {
        c.font = `italic bold ${size * 0.75}px serif`;
        c.fillText(pick(['CALL ME', 'for a good time', 'txt', 'ring', 'Jo ♥ u']), 0, -size * 0.5);
        c.font = `bold ${size * 0.8}px monospace`;
        c.fillText(`555-01${Math.floor(random() * 90 + 10)}`, 0, size * 0.4);
      }
      c.restore();
    };
    const lyric = (c: Ctx, x: number, y: number, size: number) => {
      c.save(); c.translate(x, y); c.rotate(jitter(0.12));
      c.fillStyle = ink(); c.textAlign = 'left'; c.textBaseline = 'middle'; c.font = `italic ${size * 0.8}px serif`;
      const first = Math.floor(random() * (LYRICS.length - 3));
      for (let k = 0; k < 3; k++) c.fillText(LYRICS[first + k], -size * 3 + k * size * 0.3, (k - 1) * size);
      c.restore();
    };
    /** Cover a region of a wall canvas with whatever this bathroom's walls say. */
    const scrawl = (c: Ctx, x0: number, y0: number, w: number, h: number, count: number, size: number) => {
      const total = Math.round(count * mix(0.35, 1.35, dense));
      if (a.walls === 'painted') {
        for (let k = 0; k < total * 0.6; k++) { c.fillStyle = pick(['rgba(140,140,138,0.9)', 'rgba(158,156,150,0.9)', 'rgba(125,128,130,0.9)']); c.fillRect(x0 + random() * w * 0.85, y0 + random() * h * 0.8, size * mix(3, 8, random()), size * mix(2, 5, random())); }
        for (let k = 0; k < total * 0.25; k++) tag(c, x0 + random() * w, y0 + random() * h, size * 1.1);
        return;
      }
      for (let k = 0; k < total; k++) {
        const x = x0 + random() * w, y = y0 + random() * h, roll = random(), big = size * mix(0.8, 1.6, random());
        if (a.walls === 'stickers') { if (roll < 0.75) sticker(c, x, y, big * 1.2); else tag(c, x, y, big); }
        else if (a.walls === 'marker') { if (roll < 0.85) tag(c, x, y, big * 1.25); else sticker(c, x, y, big); }
        else if (a.walls === 'political') { if (roll < 0.6) slogan(c, x, y, big); else if (roll < 0.8) sticker(c, x, y, big); else tag(c, x, y, big); }
        else if (a.walls === 'hearts') { if (roll < 0.75) love(c, x, y, big * 1.3); else tag(c, x, y, big); }
        else { if (roll < 0.6) lyric(c, x, y, big); else tag(c, x, y, big); }
      }
    };

    // ---- Wall surfaces: tiles to shoulder height, paint above, grime below.
    const TILE_TOP = 1.75;
    const wallArt = (metres: number, extra: (c: Ctx, w: number, h: number) => void) => {
      const [cv, c] = canvasOf(Math.round(metres * PX), Math.round(H * PX));
      const w = cv.width, h = cv.height, top = (H - TILE_TOP) * PX, size = 30;
      c.fillStyle = L.paint; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 40 + wear * 120; k++) { c.fillStyle = `rgba(${random() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + random() * 0.05})`; c.fillRect(random() * w, random() * top, 20 + random() * 160, 10 + random() * 90); }
      c.fillStyle = L.grout; c.fillRect(0, top, w, h - top);
      const base = new THREE.Color(L.tile), alt = new THREE.Color(L.alt), shade = new THREE.Color();
      for (let i = 0; i * size < w; i++) for (let j = 0; top + j * size < h; j++) {
        if (random() < wear * 0.09) continue;
        const band = j === 0 || (a.era === 'riotgrrrl' && (i + j) % 2 === 0) || (a.era === 'queer' && j === 3) || (a.era === 'goth' && random() < 0.12);
        shade.copy(band ? alt : base).offsetHSL(0, 0, jitter(0.025) - wear * 0.04);
        c.fillStyle = `#${shade.getHexString()}`;
        c.fillRect(i * size + 1.5, top + j * size + 1.5, size - 3, size - 3);
        if (random() < wear * 0.07) { c.strokeStyle = 'rgba(40,36,30,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(i * size + random() * size, top + j * size); c.lineTo(i * size + random() * size, top + (j + 1) * size); c.stroke(); }
      }
      const grime = c.createLinearGradient(0, h - 110, 0, h);
      grime.addColorStop(0, 'rgba(50,44,36,0)'); grime.addColorStop(1, `rgba(50,44,36,${0.2 + wear * 0.5})`);
      c.fillStyle = grime; c.fillRect(0, h - 110, w, 110);
      extra(c, w, h);
      return mapOf(cv);
    };

    // Back wall: stalls on the left, the door to the gig on the right, the headline above everything.
    const DOOR_X = 2.8;
    const backMap = wallArt(W, (c, w, h) => {
      scrawl(c, 20, 30, w - 40, (H - TILE_TOP) * PX - 40, 26, 22);
      scrawl(c, 680, (H - TILE_TOP) * PX, 700, 260, 14, 18);
      const text = HEADLINES[a.headline];
      if (text) {
        const colour = pick(L.inks);
        c.save();
        c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const width = Math.min(1150, c.measureText(text).width);
        c.translate(40 + width / 2 + random() * (1260 - width), 128); c.rotate(jitter(0.035));
        c.shadowColor = colour; c.shadowBlur = 16; c.fillStyle = colour;
        c.fillText(text, 0, 0, 1150); c.fillText(text, 0, 0, 1150);
        c.shadowBlur = 0; c.lineWidth = 5; c.strokeStyle = colour; c.lineCap = 'round';
        for (let k = 0; k < 9; k++) { const x = jitter(width / 2); c.beginPath(); c.moveTo(x, 40); c.lineTo(x, 40 + 20 + random() * 110); c.stroke(); }
        c.restore();
      }
    });
    s.box([W + 0.2, H, 0.2], [-0.1, H / 2, BACK - 0.1], s.material(L.paint));
    panel(backMap, W, H, [0, H / 2, BACK + 0.004]);
    // Left wall: sinks and the mirror.
    const leftMap = wallArt(D, (c, w, h) => {
      scrawl(c, 20, 20, w - 40, (H - TILE_TOP) * PX - 220, 14, 20);
      scrawl(c, 60, (H - TILE_TOP) * PX + 180, 900, 120, 10, 16);
    });
    s.box([0.2, H, D], [LEFT - 0.1, H / 2, 0], s.material(L.paint));
    panel(leftMap, D, H, [LEFT + 0.004, H / 2, 0], Math.PI / 2);
    // Cut edges of the walls.
    s.box([0.22, H + 0.04, 0.22], [LEFT - 0.1, H / 2, BACK - 0.1], s.material('#55505a'));
    // A pipe run along the top of both walls.
    s.rod([LEFT + 0.12, 2.92, BACK + 0.2], [LEFT + 0.12, 2.92, D / 2], 0.035, steel);
    s.rod([LEFT + 0.12, 2.92, BACK + 0.12], [W / 2, 2.92, BACK + 0.12], 0.035, steel);

    // ---- Floor.
    const hair = a.left === 'haircut';
    const dyeColour = pick(['#6fd41f', '#ff3d9a', '#2f6bff', '#e8d67a', '#7b2cf0']);
    {
      const FP = 128, [cv, c] = canvasOf(W * FP, D * FP);
      if (a.floor === 'checker') {
        const size = 64;
        for (let i = 0; i < W * 2; i++) for (let j = 0; j < D * 2; j++) { const l = (i + j) % 2 ? 44 + random() * 10 : 196 + random() * 16 - wear * 40; c.fillStyle = `rgb(${l},${l - 2},${l - 6})`; c.fillRect(i * size + 1, j * size + 1, size - 2, size - 2); }
      } else if (a.floor === 'mosaic') {
        c.fillStyle = '#5b574f'; c.fillRect(0, 0, cv.width, cv.height);
        const size = 16;
        for (let i = 0; i * size < cv.width; i++) for (let j = 0; j * size < cv.height; j++) {
          if (random() < wear * 0.06) continue;
          const accent = (i % 8 === 0 || j % 8 === 0) && (i + j) % 2 === 0;
          const l = accent ? 0 : 196 + random() * 22 - wear * 45;
          c.fillStyle = accent ? L.stall : `rgb(${l},${l - 3},${l - 12})`;
          c.fillRect(i * size + 1, j * size + 1, size - 2, size - 2);
        }
      } else if (a.floor === 'redpaint') {
        c.fillStyle = '#7a2a2a'; c.fillRect(0, 0, cv.width, cv.height);
        for (let k = 0; k < 60 + wear * 240; k++) { c.fillStyle = `rgba(150,146,138,${0.12 + random() * 0.3})`; c.beginPath(); c.ellipse(cv.width * (0.2 + random() * 0.7), cv.height * random(), 10 + random() * 60, 6 + random() * 30, random() * 3, 0, 7); c.fill(); }
      } else {
        c.fillStyle = '#8b9483'; c.fillRect(0, 0, cv.width, cv.height);
        for (let k = 0; k < 5000; k++) { c.fillStyle = pick(['#6f7868', '#a5ad9c', '#5d6657', '#b9b59a']); c.fillRect(random() * cv.width, random() * cv.height, 2 + random() * 3, 2 + random() * 3); }
        c.strokeStyle = '#4c5247'; c.lineWidth = 3; for (let x = 256; x < cv.width; x += 256) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + jitter(4), cv.height); c.stroke(); }
      }
      for (let k = 0; k < 20 + wear * 60; k++) { const g = c.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(40,34,28,${0.1 + wear * 0.2})`); g.addColorStop(1, 'rgba(40,34,28,0)'); c.save(); c.translate(random() * cv.width, random() * cv.height); c.scale(30 + random() * 90, 20 + random() * 60); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore(); }
      if (rush || flooded) for (let k = 0; k < 26; k++) {
        // Wet boot prints wandering from the door to the sinks.
        const t = k / 26, x = mix((DOOR_X + W / 2) * FP, 1.2 * FP, t) + jitter(40), y = mix(0.9 * FP, 4.6 * FP, t) + jitter(50);
        c.save(); c.translate(x, y); c.rotate(-0.9 + jitter(0.4)); c.fillStyle = 'rgba(20,20,26,0.28)';
        c.beginPath(); c.ellipse(0, 0, 9, 17, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, 24, 8, 8, 0, 0, 7); c.fill(); c.restore();
      }
      if (hair) for (let k = 0; k < 420; k++) {
        const x = (0.75 + jitter(0.55) + jitter(0.3)) * FP, y = (D / 2 + 0.45 + jitter(0.6) + jitter(0.35)) * FP;
        c.strokeStyle = random() < 0.6 ? dyeColour : '#1b1a20'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + jitter(10), y + jitter(10), x + jitter(14), y + jitter(14)); c.stroke();
      }
      if (a.left === 'flyers') for (let k = 0; k < 16; k++) {
        c.save(); c.translate((0.9 + random() * 1.3) * FP, (D / 2 - 0.2 + jitter(1.3)) * FP); c.rotate(random() * 6.3);
        c.fillStyle = pick(L.stickers); c.fillRect(-13, -18, 26, 36); c.fillStyle = '#15131a'; c.fillRect(-9, -13, 18, 5); c.fillRect(-9, -3, 12, 3); c.fillRect(-9, 4, 15, 3); c.restore();
      }
      const floor = panel(mapOf(cv), W, D, [0, 0.006, 0], 0, { roughness: flooded ? 0.25 : mix(0.45, 0.8, wear) });
      floor.rotation.x = -Math.PI / 2;
    }

    // ---- Toilet stalls along the back wall.
    const SX0 = LEFT + 0.05, SW = 1.08, ZF = -2.0, PIL = 0.34, DOOR_W = SW - PIL, STALL_H = 1.85, GAP = 0.25;
    const partitionZ = (BACK + ZF) / 2;
    for (let i = 1; i <= 3; i++) s.box([0.04, STALL_H, ZF - BACK], [SX0 + i * SW, GAP + STALL_H / 2, partitionZ], stallM);
    for (let i = 0; i <= 3; i++) {
      const width = i === 0 ? PIL / 2 : PIL, x = i === 0 ? SX0 + PIL / 4 : SX0 + i * SW;
      s.box([width, STALL_H, 0.04], [x, GAP + STALL_H / 2, ZF], stallM);
      s.cylinder(0.025, 0.025, GAP, [x, GAP / 2, ZF], steel, 8);
    }
    s.box([3 * SW + 0.1, 0.06, 0.07], [SX0 + 1.5 * SW, GAP + STALL_H + 0.06, ZF], steel);
    type DoorState = 'shut' | 'ajar' | 'open' | 'hinge' | 'gone' | 'curtain';
    const states: DoorState[] =
      a.doors === 'shut' ? ['shut', 'shut', 'shut'] :
      a.doors === 'ajar' ? [pick(['shut', 'ajar'] as const), 'open', 'ajar'] :
      a.doors === 'hinge' ? ['shut', 'hinge', pick(['ajar', 'shut'] as const)] :
      ['gone', 'curtain', 'gone'];
    if (a.doors !== 'gone' && random() < 0.5) states.reverse();
    const bootStall = rush ? Math.max(0, states.indexOf('shut')) : -1;
    const doorArt = (bolted: boolean) => {
      const [cv, c] = canvasOf(176, 448);
      c.fillStyle = L.door; c.fillRect(0, 0, 176, 448);
      for (let k = 0; k < 14; k++) { c.fillStyle = `rgba(0,0,0,${0.03 + random() * 0.06})`; c.fillRect(random() * 176, random() * 448, 10 + random() * 80, 6 + random() * 60); }
      scrawl(c, 14, 20, 148, 400, 26, 15);
      c.fillStyle = '#c9ced2'; c.beginPath(); c.arc(150, 215, 13, 0, 7); c.fill();
      c.fillStyle = bolted ? '#d81e2c' : '#3fae5a'; c.beginPath(); c.arc(150, 215, 7, 0, 7); c.fill();
      const grime = c.createLinearGradient(0, 380, 0, 448); grime.addColorStop(0, 'rgba(30,26,22,0)'); grime.addColorStop(1, `rgba(30,26,22,${0.15 + wear * 0.5})`);
      c.fillStyle = grime; c.fillRect(0, 380, 176, 68);
      return mapOf(cv);
    };
    states.forEach((state, i) => {
      const hingeX = SX0 + i * SW + (i === 0 ? PIL / 2 : PIL / 2), centreX = SX0 + (i + 0.5) * SW + PIL / 4;
      const width = SW - PIL * (i === 0 ? 0.75 : 1) - 0.02;
      if (state === 'curtain') {
        const [cv, c] = canvasOf(128, 256);
        const stripes = [pick(L.stickers), '#f4f1e6'];
        for (let k = 0; k < 8; k++) { c.fillStyle = stripes[k % 2]; c.fillRect(k * 16, 0, 16, 256); }
        for (let k = 0; k < 16; k++) { c.fillStyle = `rgba(0,0,0,${k % 2 ? 0.16 : 0})`; c.fillRect(k * 8, 0, 8, 256); }
        const geometry = new THREE.PlaneGeometry(width * 0.8, STALL_H - 0.1, 24, 1);
        const position = geometry.attributes.position;
        for (let k = 0; k < position.count; k++) position.setZ(k, Math.sin(position.getX(k) * 34) * 0.035);
        geometry.computeVertexNormals();
        const curtain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: mapOf(cv), side: THREE.DoubleSide, roughness: 0.6 }));
        curtain.position.set(hingeX + width * 0.42, GAP + STALL_H / 2 + 0.05, ZF + 0.03); curtain.castShadow = true;
        s.root.add(curtain);
        s.rod([hingeX - 0.05, GAP + STALL_H, ZF + 0.03], [hingeX + width + 0.05, GAP + STALL_H, ZF + 0.03], 0.012, steel);
      } else if (state !== 'gone') {
        const door = new THREE.Group();
        const slab = new THREE.Mesh(new THREE.BoxGeometry(width, STALL_H - 0.1, 0.035), stallM);
        slab.position.set(width / 2, GAP + STALL_H / 2, 0); slab.castShadow = slab.receiveShadow = true;
        const face = new THREE.Mesh(new THREE.PlaneGeometry(width, STALL_H - 0.1), new THREE.MeshStandardMaterial({ map: doorArt(state === 'shut' && (i === bootStall || random() < 0.5)), roughness: 0.6 }));
        face.position.set(width / 2, GAP + STALL_H / 2, 0.019);
        door.add(slab, face);
        door.position.set(hingeX, 0, ZF + 0.03);
        if (state === 'ajar') door.rotation.y = mix(0.35, 0.7, random());
        else if (state === 'open') door.rotation.y = mix(1.15, 1.45, random());
        else if (state === 'hinge') { door.rotation.set(0.1, -mix(0.25, 0.5, random()), -0.16); door.position.y = -0.08; door.position.z += 0.08; }
        s.root.add(door);
      }
      if (state !== 'shut') {
        // The toilet, seen through the open door.
        const tz = BACK + 0.55;
        s.lathe([[0, 0], [0.13, 0], [0.11, 0.12], [0.16, 0.3], [0.2, 0.4], [0.21, 0.42], [0.15, 0.4], [0.1, 0.3], [0, 0.28]], white, [centreX, 0, tz]).scale.set(1, 1, 1.3);
        s.box([0.46, 0.36, 0.18], [centreX, 0.62, BACK + 0.12], white);
        s.ring(0.17, 0.028, [centreX, 0.43, tz], random() < 0.5 ? black : white).rotation.x = Math.PI / 2;
        s.cylinder(0.055, 0.055, 0.11, [SX0 + (i + 1) * SW - 0.09, 0.8, BACK + 0.9], white, 12).rotation.z = Math.PI / 2;
      }
      if (i === bootStall) for (const side of [-1, 1]) {
        const bx = centreX + side * 0.12, bz = ZF - 0.16;
        s.box([0.11, 0.09, 0.3], [bx, 0.045, bz + 0.03], black); s.cylinder(0.055, 0.06, 0.22, [bx, 0.19, bz - 0.07], black, 10);
        s.box([0.115, 0.02, 0.31], [bx, 0.01, bz + 0.03], s.material(pick(['#d81e2c', '#f2d21a', '#e9e4d2'])));
      }
    });
    // Loo roll over the partitions.
    const paper = s.material('#f3f1e8', { roughness: 0.9, side: THREE.DoubleSide });
    for (let k = 0; k < Math.round((rush ? 2 : 0) + wear * 2 + dense); k++) {
      const x = SX0 + (1 + Math.floor(random() * 3)) * SW + jitter(0.03), top = GAP + STALL_H;
      s.tube([[x, top - 0.5 - random() * 0.8, ZF - 0.5], [x, top + 0.02, ZF - 0.25], [x + jitter(0.05), top + 0.03, ZF + 0.03], [x + jitter(0.1), top - 0.6, ZF + 0.07], [x + jitter(0.2), mix(0.02, 0.9, random()), ZF + 0.1 + random() * 0.3]], 0.022, paper).scale.set(1, 1, 1);
    }

    // ---- Back wall, right of the stalls: dryer, vending box, bin, and the door to the gig.
    const dryerX = -0.1;
    s.box([0.34, 0.3, 0.2], [dryerX, 1.35, BACK + 0.1], white);
    s.cylinder(0.05, 0.06, 0.08, [dryerX, 1.18, BACK + 0.16], steel, 12);
    s.label(wear > 0.5 ? 'BROKEN' : 'PUSH', 0.2, 0.07, [dryerX, 1.4, BACK + 0.203], '#c4122f', '#eeeade');
    const vendX = 0.85;
    s.box([0.5, 0.75, 0.16], [vendX, 1.45, BACK + 0.08], steel);
    for (let k = 0; k < 3; k++) s.box([0.12, 0.3, 0.02], [vendX - 0.15 + k * 0.15, 1.58, BACK + 0.165], glow(pick(L.stickers), 0.25));
    s.label(pick(['OUT OF ORDER', 'EMPTY', 'KICK HERE', '50p']), 0.4, 0.09, [vendX, 1.22, BACK + 0.163], '#15131a', '#f2d21a').rotation.z = jitter(0.12);
    const binX = 1.55;
    s.cylinder(0.24, 0.19, 0.6, [binX, 0.3, BACK + 0.32], s.material('#4a4d52', { metalness: 0.5, roughness: 0.5 }), 16);
    for (let k = 0; k < 3 + dense * 8; k++) s.ball([0.07, 0.055, 0.07], [binX + jitter(0.16) + (k > 5 ? 0.3 : 0), k > 5 ? 0.05 : 0.6 + random() * 0.1, BACK + 0.32 + jitter(0.14) + (k > 5 ? 0.25 : 0)], paper, 8);
    // The door.
    const frame = s.material('#3b3940', { roughness: 0.6 });
    s.box([0.09, 2.2, 0.1], [DOOR_X - 0.55, 1.1, BACK + 0.05], frame); s.box([0.09, 2.2, 0.1], [DOOR_X + 0.55, 1.1, BACK + 0.05], frame); s.box([1.19, 0.09, 0.1], [DOOR_X, 2.2, BACK + 0.05], frame);
    const glowColour = new THREE.Color(cleanup ? '#f3f0e4' : L.glow);
    const gigDoor = new THREE.Group();
    {
      const [cv, c] = canvasOf(208, 432);
      c.fillStyle = a.era === 'goth' ? '#201c26' : '#4a4650'; c.fillRect(0, 0, 208, 432);
      scrawl(c, 10, 20, 188, 300, 22, 16);
      c.fillStyle = '#9aa0a4'; c.fillRect(0, 360, 208, 72); c.fillRect(160, 180, 26, 60);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.05), frame);
      slab.position.set(0.5, 1.07, 0); slab.castShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshStandardMaterial({ map: mapOf(cv), roughness: 0.6 }));
      face.position.set(0.5, 1.07, 0.027);
      gigDoor.add(slab, face);
    }
    gigDoor.position.set(DOOR_X - 0.5, 0, BACK + 0.07);
    if (cleanup) {
      gigDoor.rotation.y = -1.25;
      const daylight = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.1), new THREE.MeshBasicMaterial({ color: '#eef1ea' }));
      daylight.position.set(DOOR_X, 1.07, BACK + 0.012); s.root.add(daylight);
      s.box([0.2, 0.1, 0.1], [DOOR_X + 0.42, 0.05, BACK + 0.55], s.material('#8a5a3a'));
    }
    s.root.add(gigDoor);
    const exit = s.box([0.5, 0.18, 0.06], [DOOR_X, 2.42, BACK + 0.05], glow(a.era === 'goth' ? '#b01a3c' : '#2fbf6a', cleanup ? 0.3 : 1.1));
    s.label(a.era === 'london77' ? 'WAY OUT' : 'EXIT', 0.44, 0.13, [DOOR_X, 2.42, BACK + 0.082], '#f4f1e6', a.era === 'goth' ? '#8a1230' : '#1f8f4d');
    void exit;
    // Light under the door, and its spill across the floor.
    const stripM = new THREE.MeshBasicMaterial({ color: glowColour });
    let spillM: THREE.MeshBasicMaterial | null = null, doorLight: THREE.PointLight | null = null;
    if (!cleanup) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.035, 0.03), stripM);
      strip.position.set(DOOR_X, 0.022, BACK + 0.1); s.root.add(strip);
      const [cv, c] = canvasOf(128, 256);
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(34, 0); c.lineTo(94, 0); c.lineTo(128, 256); c.lineTo(0, 256); c.fill();
      spillM = new THREE.MeshBasicMaterial({ map: mapOf(cv), color: glowColour, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
      const spill = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), spillM);
      spill.rotation.x = -Math.PI / 2; spill.position.set(DOOR_X, flooded ? 0.075 : 0.014, BACK + 1.7); s.root.add(spill);
      doorLight = new THREE.PointLight(glowColour, 8, 7, 1.2);
      doorLight.position.set(DOOR_X, 0.35, BACK + 0.7); s.root.add(doorLight);
    }

    // ---- Sinks under the mirror on the left wall.
    const SINK_Z = [-0.95, 0.5, 1.95], SINK_X = LEFT + 0.25;
    const dyedSink = hair ? 1 : -1, overflowing = flooded ? Math.floor(random() * 3) : -1;
    const water = new THREE.MeshStandardMaterial({ color: '#5f979c', roughness: 0.05, transparent: true, opacity: 0.5, depthWrite: false });
    SINK_Z.forEach((z, i) => {
      const hanging = wear > 0.7 && i === 2;
      const basin = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.removeFromParent(); basin.add(mesh); return mesh; };
      add(s.box([0.48, 0.2, 0.62], [0, 0, 0], white));
      add(s.box([0.06, 0.1, 0.62], [-0.21, 0.13, 0], white));
      const bowlColour = i === dyedSink ? dyeColour : i === overflowing ? '#6fa3a8' : new THREE.Color('#cfc9b6').lerp(new THREE.Color('#7d6f55'), wear * 0.6);
      add(s.ball([0.17, 0.05, 0.24], [0.03, 0.09, 0], s.material(bowlColour, { roughness: 0.25 }), 16));
      add(s.cylinder(0.018, 0.018, 0.14, [-0.19, 0.25, 0], steel, 8));
      add(s.rod([-0.19, 0.31, 0], [-0.06, 0.29, 0], 0.016, steel));
      if (i === dyedSink) for (let k = 0; k < 4; k++) add(s.box([0.012, 0.14 + random() * 0.08, 0.03 + random() * 0.04], [0.243, -0.02 - random() * 0.03, jitter(0.22)], s.material(dyeColour, { emissive: dyeColour, emissiveIntensity: 0.25 })));
      basin.position.set(SINK_X, 0.8, z);
      if (hanging) { basin.rotation.x = 0.28; basin.position.y -= 0.07; }
      s.root.add(basin);
      s.tube([[SINK_X, 0.7, z], [SINK_X, 0.5, z], [SINK_X - 0.08, 0.42, z], [LEFT + 0.02, 0.42, z]], 0.028, steel);
      if (i === overflowing) {
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.75), water);
        sheet.position.set(SINK_X + 0.245, 0.45, z); sheet.rotation.y = Math.PI / 2; s.root.add(sheet);
        s.rod([SINK_X - 0.06, 1.09, z], [SINK_X - 0.06, 0.9, z], 0.012, water);
      }
    });
    // Ledge and mirror.
    const MIRROR_W = 4.3, MIRROR_H = 0.95, MIRROR_Z = 0.5, MIRROR_Y = 1.78;
    s.box([0.14, 0.03, MIRROR_W + 0.2], [LEFT + 0.07, 1.24, MIRROR_Z], steel);
    {
      const MW = 1032, MH = 228, [cv, c] = canvasOf(MW, MH);
      const g = c.createLinearGradient(0, 0, MW, MH);
      g.addColorStop(0, '#c5d0d6'); g.addColorStop(0.5, '#9fb0ba'); g.addColorStop(1, '#b6c3ca');
      c.fillStyle = g; c.fillRect(0, 0, MW, MH);
      // The room, vaguely: the far wall, the door glow, the bulb.
      c.fillStyle = 'rgba(70,64,78,0.25)'; c.fillRect(0, MH * 0.55, MW, MH * 0.45);
      const spot = (x: number, y: number, r: number, colour: string) => { const q = c.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, colour); q.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = q; c.fillRect(x - r, y - r, r * 2, r * 2); };
      if (!cleanup) spot(MW * 0.78, MH * 0.8, 150, `#${glowColour.getHexString()}`);
      if (a.light !== 'dead') spot(MW * 0.45, 30, 110, a.light === 'red' ? 'rgba(255,60,50,0.9)' : 'rgba(255,246,214,0.9)');
      c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 26; for (let k = 0; k < 4; k++) { const x = random() * MW; c.beginPath(); c.moveTo(x, MH); c.lineTo(x + 160, 0); c.stroke(); }
      c.lineWidth = 1; for (let k = 0; k < 40 + wear * 160; k++) { c.strokeStyle = `rgba(255,255,255,${0.2 + random() * 0.4})`; const x = random() * MW, y = random() * MH; c.beginPath(); c.moveTo(x, y); c.lineTo(x + jitter(60), y + jitter(30)); c.stroke(); }
      // Lipstick.
      const lip = pick(['#d81e4a', '#c4122f', '#ff3d9a', '#8f1238']);
      c.save(); c.translate(MW * mix(0.25, 0.4, random()), MH * 0.48); c.rotate(jitter(0.06));
      c.fillStyle = c.strokeStyle = lip; c.font = 'italic bold 78px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineCap = 'round';
      const words = pick(L.lipstick);
      c.fillText(words, 0, 0, 430);
      c.lineWidth = 7; heart(c, 260, -10, 30); c.stroke();
      c.restore();
      for (let k = 0; k < 3 + dense * 3; k++) { c.save(); c.translate(MW * (0.55 + random() * 0.42), MH * (0.25 + random() * 0.5)); c.rotate(jitter(0.4)); c.fillStyle = lip; c.beginPath(); c.ellipse(0, -5, 16, 7, 0, Math.PI, 0); c.ellipse(0, 4, 14, 8, 0, 0, Math.PI); c.fill(); c.restore(); }
      for (let k = 0; k < 8 + dense * 14; k++) { const edge = random() < 0.5; sticker(c, edge ? random() * MW : (random() < 0.5 ? 26 : MW - 26) + jitter(20), edge ? (random() < 0.5 ? 20 : MH - 20) + jitter(10) : random() * MH, 20); }
      // Cracks and missing shards.
      if (a.mirror > 0.25) {
        const hubs = a.mirror > 0.7 ? 3 : 1;
        for (let hub = 0; hub < hubs; hub++) {
          const hx = MW * (hub === 0 ? mix(0.55, 0.75, random()) : random()), hy = MH * mix(0.3, 0.7, random());
          const spokes = 9 + Math.floor(random() * 5), ends: [number, number][] = [];
          for (let k = 0; k < spokes; k++) { const angle = (k / spokes) * 6.283 + jitter(0.2), reach = mix(90, 300, random()) * mix(0.6, 1.3, a.mirror); ends.push([hx + Math.cos(angle) * reach, hy + Math.sin(angle) * reach * 0.6]); }
          if (a.mirror > 0.7) for (let k = 0; k < spokes; k += 2 + Math.floor(random() * 2)) {
            const [ax, ay] = ends[k], [bx, by] = ends[(k + 1) % spokes];
            c.fillStyle = '#3d3a37'; c.beginPath(); c.moveTo(hx, hy); c.lineTo(mix(hx, ax, 0.8), mix(hy, ay, 0.8)); c.lineTo(mix(hx, bx, 0.8), mix(hy, by, 0.8)); c.fill();
          }
          for (const [ex, ey] of ends) { c.strokeStyle = 'rgba(30,34,40,0.85)'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(mix(hx, ex, 0.5) + jitter(12), mix(hy, ey, 0.5) + jitter(8)); c.lineTo(ex, ey); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.stroke(); }
          for (const ring of [0.3, 0.55]) { c.strokeStyle = 'rgba(30,34,40,0.6)'; c.lineWidth = 1.4; c.beginPath(); ends.forEach(([ex, ey], k) => { const x = mix(hx, ex, ring + jitter(0.06)), y = mix(hy, ey, ring + jitter(0.06)); if (k) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); c.stroke(); }
        }
      }
      const map = mapOf(cv);
      s.box([0.03, MIRROR_H + 0.06, MIRROR_W + 0.06], [LEFT + 0.02, MIRROR_Y, MIRROR_Z], steel);
      panel(map, MIRROR_W, MIRROR_H, [LEFT + 0.04, MIRROR_Y, MIRROR_Z], Math.PI / 2, { roughness: 0.18, metalness: 0.2, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.32 });
    }

    // ---- The light.
    const lampAt: P = [LEFT + 0.22, 2.62, MIRROR_Z];
    const warm = new THREE.Color().setHSL(mix(0.16, 0.08, mood.warmth), 0.85, 0.72);
    const lampColour = a.light === 'red' ? new THREE.Color('#ff2a1e') : a.light === 'tube' ? new THREE.Color('#e4ffe9') : warm;
    let lampM: THREE.MeshStandardMaterial | null = null, lamp: THREE.PointLight | null = null;
    const flames: THREE.Mesh[] = [];
    if (a.light === 'tube') {
      s.box([0.1, 0.07, 1.5], [LEFT + 0.07, 2.62, MIRROR_Z], white);
      lampM = glow('#e4ffe9', 2.2);
      s.cylinder(0.03, 0.03, 1.4, [LEFT + 0.15, 2.6, MIRROR_Z], lampM, 10).rotation.x = Math.PI / 2;
    } else {
      s.box([0.1, 0.16, 0.16], [LEFT + 0.05, lampAt[1], lampAt[2]], black);
      s.rod([LEFT + 0.06, 2.92, lampAt[2]], [LEFT + 0.06, lampAt[1], lampAt[2]], 0.015, steel);
      lampM = a.light === 'dead' ? s.material('#6d6a60', { roughness: 0.2 }) : glow(`#${lampColour.getHexString()}`, 2.6);
      s.ball([0.075, 0.095, 0.075], lampAt, lampM, 14);
      const cage = s.material('#2a2a2e', { metalness: 0.6, roughness: 0.5 });
      for (let k = 0; k < 3; k++) s.ring(0.125, 0.008, lampAt, cage).rotation.y = (k / 3) * Math.PI;
      s.ring(0.125, 0.008, lampAt, cage).rotation.x = Math.PI / 2;
      for (const dy of [-0.08, 0.08]) s.ring(0.097, 0.008, [lampAt[0], lampAt[1] + dy, lampAt[2]], cage).rotation.x = Math.PI / 2;
    }
    if (a.light !== 'dead') {
      lamp = new THREE.PointLight(lampColour, a.light === 'red' ? 16 : 13, 11, 1.1);
      lamp.position.set(lampAt[0] + 0.5, lampAt[1], lampAt[2]);
      s.root.add(lamp);
      if (a.light === 'red') for (const child of s.root.children) if (child instanceof THREE.HemisphereLight) { child.color.set('#f0b9b4'); child.intensity *= 0.9; }
    } else {
      const wax = s.material(a.era === 'goth' ? '#2a2630' : '#efe6cf', { roughness: 0.5 });
      const count = 3 + Math.round(dense * 4);
      for (let k = 0; k < count; k++) {
        const z = MIRROR_Z + mix(-1.9, 1.9, (k + random() * 0.6) / count), tall = 0.06 + random() * 0.14;
        s.cylinder(0.022, 0.026, tall, [LEFT + 0.08, 1.255 + tall / 2, z], wax, 10);
        const flame = s.ball([0.014, 0.035, 0.014], [LEFT + 0.08, 1.255 + tall + 0.04, z], new THREE.MeshBasicMaterial({ color: '#ffd27a' }), 8);
        flame.castShadow = false; flames.push(flame);
      }
      lamp = new THREE.PointLight('#ffb45a', 5, 7, 1.2);
      lamp.position.set(LEFT + 0.5, 1.5, MIRROR_Z); s.root.add(lamp);
    }

    // ---- What was left by the sinks.
    const ledgeY = 1.255, ledgeX = LEFT + 0.08;
    const cup = (x: number, y: number, z: number, fallen = false) => {
      const beer = random() < 0.45;
      const mesh = beer ? s.cylinder(0.033, 0.033, 0.12, [x, y + (fallen ? 0.033 : 0.06), z], s.material(pick(['#c4122f', '#d9b23a', '#2f6bff', '#e9e4d2']), { metalness: 0.5, roughness: 0.35 }), 10)
        : s.cylinder(0.042, 0.03, 0.12, [x, y + (fallen ? 0.04 : 0.06), z], new THREE.MeshStandardMaterial({ color: '#f1ecd9', roughness: 0.2, transparent: true, opacity: 0.8 }), 10);
      if (fallen) { mesh.rotation.z = Math.PI / 2; mesh.rotation.y = random() * 3; }
      return mesh;
    };
    const cupCount = (a.left === 'cups' ? 7 : 0) + (rush ? 5 : 0) + Math.round(dense * 4) - (a.left === 'nothing' && !rush ? 3 : 0);
    for (let k = 0; k < cupCount; k++) {
      const where = random();
      if (where < 0.5) cup(ledgeX + jitter(0.02), ledgeY, MIRROR_Z + jitter(2.0));
      else if (where < 0.75) cup(SINK_X + 0.12 + jitter(0.06), 0.9, pick(SINK_Z) + pick([-0.24, 0.24]));
      else cup(LEFT + 0.75 + random() * 0.5, flooded ? 0.04 : 0, -1.4 + random() * 3.4, true);
    }
    if (a.left === 'haircut') {
      // Milk crate seat, clippers on the ledge, a towel.
      const crate = s.material(pick(['#2f6bff', '#c4122f', '#1f8f4d']), { roughness: 0.6 });
      const cz = SINK_Z[1], cx = LEFT + 0.95;
      for (const side of [-1, 1]) { s.box([0.4, 0.3, 0.03], [cx, 0.15, cz + side * 0.185], crate); s.box([0.03, 0.3, 0.4], [cx + side * 0.185, 0.15, cz], crate); }
      s.box([0.4, 0.03, 0.4], [cx, 0.3, cz], crate);
      s.box([0.05, 0.05, 0.17], [ledgeX, ledgeY + 0.025, cz + 0.5], black); s.box([0.045, 0.012, 0.03], [ledgeX, ledgeY + 0.025, cz + 0.595], steel);
      s.box([0.1, 0.15, 0.07], [ledgeX, ledgeY + 0.075, cz - 0.4], s.material(dyeColour, { emissive: dyeColour, emissiveIntensity: 0.2 }));
      const towel = s.box([0.3, 0.02, 0.5], [cx + 0.1, 0.33, cz], s.material('#e9e4d2', { roughness: 0.95 })); towel.rotation.y = 0.3;
      for (let k = 0; k < 6; k++) { const clump = s.ring(0.03 + random() * 0.04, 0.008, [cx + 0.1 + jitter(0.5), 0.012, cz + jitter(0.5)], s.material(random() < 0.6 ? dyeColour : '#1b1a20')); clump.rotation.set(Math.PI / 2 + jitter(0.3), 0, random() * 3); }
    } else if (a.left === 'lost') {
      const hz = -1.75;
      s.rod([LEFT + 0.01, 1.7, hz], [LEFT + 0.12, 1.72, hz], 0.012, steel);
      const leather = s.material('#19181c', { roughness: 0.4 });
      const body = s.ball([0.09, 0.42, 0.26], [LEFT + 0.13, 1.33, hz], leather, 14);
      body.scale.y = 0.42;
      for (const side of [-1, 1]) s.rod([LEFT + 0.14, 1.62, hz + side * 0.2], [LEFT + 0.16, 1.05, hz + side * 0.3], 0.055, leather, 0.045);
      const studs: { at: P; size: number }[] = [];
      for (let k = 0; k < 26; k++) studs.push({ at: [LEFT + 0.215 - Math.abs(jitter(0.02)), 1.1 + random() * 0.5, hz + jitter(0.2)], size: 0.011 });
      s.scatter(new THREE.ConeGeometry(1, 1.4, 4), s.material('#d9dde0', { metalness: 0.9, roughness: 0.2 }), studs);
      s.box([0.11, 0.09, 0.3], [LEFT + 0.9, 0.045, 2.9], black).rotation.y = 0.6; s.cylinder(0.055, 0.06, 0.24, [LEFT + 0.84, 0.2, 2.82], black, 10).rotation.z = 0.2;
      const tote = s.box([0.36, 0.4, 0.08], [LEFT + 0.6, 0.2, -1.45], s.material('#e9e4d2', { roughness: 0.95 })); tote.rotation.set(-0.2, 0.9, 0);
    } else if (a.left === 'flyers') {
      const flyer = s.material(pick(L.stickers), { roughness: 0.9 });
      s.box([0.11, 0.05 + dense * 0.06, 0.16], [ledgeX, ledgeY + 0.03 + dense * 0.03, SINK_Z[1] + 0.6], flyer);
      for (let k = 0; k < 5; k++) { const sheet = s.box([0.15, 0.003, 0.21], [SINK_X + 0.05 + jitter(0.05), 0.905 + k * 0.004, SINK_Z[2] + jitter(0.1)], k % 2 ? flyer : s.material(pick(L.stickers))); sheet.rotation.y = random() * 3; }
    }
    // A soap dispenser and a dripping tap regardless.
    s.box([0.07, 0.16, 0.09], [LEFT + 0.04, 1.02, SINK_Z[0] + 0.7], s.material(pick(['#ff3d9a', '#7be07b', '#f2d21a']), { roughness: 0.3, transparent: true, opacity: 0.85 }));

    // ---- What is happening.
    if (rush) {
      const coat = [s.material('#19181c'), s.material('#2b3a2c'), s.material('#3a2630'), s.material(L.stall)];
      for (let k = 0; k < 5 + dense * 4; k++) { const lump = s.ball([0.28 + random() * 0.15, 0.1 + random() * 0.08, 0.22 + random() * 0.12], [-0.25 + jitter(0.3), 0.08 + k * 0.035, BACK + 0.45 + jitter(0.2)], pick(coat), 10); lump.rotation.y = random() * 3; }
      s.tube([[LEFT + 2.0, 0.012, ZF + 0.25], [LEFT + 2.5, 0.012, ZF + 0.7], [LEFT + 2.2, 0.012, ZF + 1.1], [LEFT + 2.9, 0.012, ZF + 1.35]], 0.03, paper).scale.y = 0.3;
    } else if (flooded) {
      const lake = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.02, D - 0.02), water);
      lake.rotation.x = -Math.PI / 2; lake.position.y = 0.06; s.root.add(lake);
      for (let k = 0; k < 9 + dense * 10; k++) {
        const x = jitter(W / 2 - 0.4), z = jitter(D / 2 - 0.4);
        if (z < ZF + 0.2 && x < -0.5) continue;
        if (random() < 0.6) { const sheet = s.box([0.16 + random() * 0.1, 0.004, 0.2 + random() * 0.1], [x, 0.064, z], random() < 0.6 ? paper : s.material(pick(L.stickers))); sheet.rotation.y = random() * 3; sheet.castShadow = false; }
        else cup(x, 0.04, z, true);
      }
      const ripples = new THREE.MeshBasicMaterial({ color: '#dff2f2', transparent: true, opacity: 0.35, depthWrite: false });
      for (let k = 0; k < 7; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 + random() * 0.35, 0.008, 4, 40), ripples); ring.rotation.x = Math.PI / 2; ring.position.set(LEFT + 0.6 + random() * 1.2, 0.063, SINK_Z[Math.max(0, overflowing)] + jitter(0.5)); s.root.add(ring); }
    } else if (cleanup) {
      const yellow = s.material('#f2c81a', { roughness: 0.45 });
      const bx = 1.35, bz = BACK + 1.15;
      s.cylinder(0.24, 0.19, 0.36, [bx, 0.2, bz], yellow, 4).rotation.y = Math.PI / 4;
      s.box([0.3, 0.14, 0.14], [bx, 0.44, bz - 0.1], yellow);
      for (const [wx, wz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) s.cylinder(0.03, 0.03, 0.03, [bx + wx, 0.02, bz + wz], black, 8).rotation.x = Math.PI / 2;
      s.rod([bx + 0.02, 0.2, bz + 0.05], [bx + 0.5, 1.55, bz - 0.75], 0.016, s.material('#b98a52'));
      s.ball([0.09, 0.07, 0.09], [bx + 0.02, 0.3, bz + 0.05], s.material('#d9d2bd', { roughness: 1 }), 10);
      // Wet floor sign.
      const sx = LEFT + 1.25, sz = -0.25;
      for (const side of [-1, 1]) { const leaf = s.box([0.3, 0.62, 0.015], [sx, 0.3, sz + side * 0.1], yellow); leaf.rotation.x = -side * 0.32; }
      const caution = s.label('WET FLOOR', 0.26, 0.09, [sx, 0.36, sz + 0.105], '#15131a', '#f2c81a'); caution.rotation.x = -0.32;
      const bag = s.material('#141418', { roughness: 0.3 });
      for (let k = 0; k < 2 + Math.round(dense * 3); k++) { s.ball([0.26 + random() * 0.08, 0.26 + random() * 0.1, 0.26], [LEFT + 0.75 + k * 0.42, 0.24, D / 2 - 0.5 + jitter(0.15)], bag, 10); s.ball([0.05, 0.08, 0.05], [LEFT + 0.75 + k * 0.42, 0.52, D / 2 - 0.5], bag, 6); }
    } else {
      // Emptied out: a drip and its puddle.
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshStandardMaterial({ color: '#2a3238', roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.3, 0.8, 1); puddle.position.set(SINK_X + 0.45, 0.012, SINK_Z[2]); s.root.add(puddle);
    }
    if (!flooded) for (let k = 0; k < Math.round(wear * 3 + (rush ? 2 : 0)); k++) {
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.2 + random() * 0.3, 20), new THREE.MeshStandardMaterial({ color: '#232a30', roughness: 0.05, transparent: true, opacity: 0.4, depthWrite: false }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1 + random(), 1, 1); puddle.position.set(jitter(W / 2 - 0.8), 0.012, ZF + 0.6 + random() * 4.4); s.root.add(puddle);
    }

    // ---- Motion: the bulb, the bass through the door.
    const energy = mood.energy, phase = random() * 9;
    const lampBase = lamp?.intensity ?? 0, emissiveBase = lampM?.emissiveIntensity ?? 0, doorBase = doorLight?.intensity ?? 0;
    const buzz = a.light === 'tube' ? mix(0.15, 0.6, Math.max(energy, wear)) : a.light === 'dead' ? 0 : mix(0, 0.35, wear * energy);
    world.update = (_dt, time) => {
      if (a.light === 'dead') {
        flames.forEach((flame, index) => { const f = Math.sin(time * (7 + energy * 12) + index * 2.1 + phase); flame.scale.set(0.014 * (1 + f * 0.15), 0.035 * (1 + f * 0.25 * (0.4 + energy)), 0.014); });
        if (lamp) lamp.intensity = lampBase * (1 + Math.sin(time * 9 + phase) * 0.08);
      } else if (buzz > 0) {
        const t = time * mix(6, 26, energy) + phase;
        const drop = Math.sin(t) * Math.sin(t * 2.3 + 1) * Math.sin(t * 0.37) > mix(0.8, 0.35, buzz) ? 0.35 : 1;
        if (lamp) lamp.intensity = lampBase * drop;
        if (lampM) lampM.emissiveIntensity = emissiveBase * drop;
      }
      if (doorLight && spillM) {
        // Kick drum through the door.
        const beat = Math.pow(Math.max(0, Math.sin(time * mix(4, 9, energy) + phase)), 6) * mix(0.1, 0.6, energy);
        doorLight.intensity = doorBase * (1 + beat);
        spillM.opacity = 0.7 * (0.85 + beat * 0.4);
      }
    };
    return world;
  },
});
