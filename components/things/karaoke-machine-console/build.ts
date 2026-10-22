import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;

function paint(w: number, h: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const SONGS = {
  enka: 'A slow enka ballad: a moon over a winter sea, snow, a lyric about tears and a night ferry.',
  idol: 'Sugary idol pop: pink and yellow, hearts and stars, a lyric with too many exclamation marks.',
  power: 'A power ballad: a huge orange sunset over a skyline and a line about never letting go.',
  duet: 'A duet with two colour-coded lines, and only one of the parts is being sung.',
  rock: 'A shouted rock anthem: black and red, lightning bolts, everybody on the table.',
  citypop: 'Breezy city pop: teal sky, palm trees, a grid road toward a pink sun.',
} as const;
type Song = keyof typeof SONGS;

const LYRIC: Record<Song, string> = {
  enka: 'TEARS ON THE NIGHT FERRY',
  idol: 'LOVE LOVE SUGAR HEART!!',
  power: "I'LL NEVER LET YOU GO",
  duet: 'MEET ME IN GINZA TONIGHT',
  rock: 'BURN IT DOWN! YEAH!',
  citypop: 'MIDNIGHT HIGHWAY BREEZE',
};
const HILITE: Record<Song, string> = { enka: '#7fd4ff', idol: '#ff4fa0', power: '#ffd23a', duet: '#ff6fb0', rock: '#ff3b2b', citypop: '#3ff0d0' };

function backdrop(c: Ctx, w: number, h: number, song: Song, random: () => number) {
  const grad = c.createLinearGradient(0, 0, 0, h);
  const stops: Record<Song, [string, string]> = {
    enka: ['#141a4a', '#3a5a8a'], idol: ['#ff9ad0', '#ffe27a'], power: ['#4a2a7a', '#ff8a3a'],
    duet: ['#c2478f', '#3a62c8'], rock: ['#150808', '#6a1010'], citypop: ['#1aa7b8', '#ffb0c8'],
  };
  grad.addColorStop(0, stops[song][0]);
  grad.addColorStop(1, stops[song][1]);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  if (song === 'enka') {
    c.fillStyle = '#f6f0c8';
    c.beginPath(); c.arc(w * 0.76, h * 0.26, h * 0.13, 0, 7); c.fill();
    c.strokeStyle = '#cfe4ff'; c.lineWidth = h * 0.012;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      for (let x = 0; x <= w; x += 8) c.lineTo(x, h * (0.5 + i * 0.045) + Math.sin(x * 0.03 + i * 2) * h * 0.012);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) c.fillRect(random() * w, random() * h, 3, 3);
  } else if (song === 'idol') {
    for (let i = 0; i < 16; i++) {
      const x = random() * w, y = random() * h * 0.6, r = h * mix(0.03, 0.08, random());
      c.fillStyle = ['#ffffff', '#ff4fa0', '#7ae0ff', '#fff06a'][i % 4];
      c.beginPath();
      if (i % 2) {
        c.arc(x - r * 0.5, y, r * 0.55, 0, 7); c.arc(x + r * 0.5, y, r * 0.55, 0, 7);
        c.moveTo(x - r, y + r * 0.2); c.lineTo(x, y + r * 1.3); c.lineTo(x + r, y + r * 0.2);
      } else for (let k = 0; k < 10; k++) c.lineTo(x + Math.sin(k * 0.628) * r * (k % 2 ? 0.45 : 1), y - Math.cos(k * 0.628) * r * (k % 2 ? 0.45 : 1));
      c.fill();
    }
  } else if (song === 'power') {
    c.fillStyle = '#ffe07a';
    c.beginPath(); c.arc(w * 0.5, h * 0.62, h * 0.3, Math.PI, 0); c.fill();
    c.fillStyle = '#2a1840';
    for (let x = 0; x < w;) { const bw = w * mix(0.04, 0.09, random()), bh = h * mix(0.08, 0.3, random()); c.fillRect(x, h * 0.62 - bh, bw, bh + h); x += bw; }
    c.fillRect(0, h * 0.62, w, h);
  } else if (song === 'duet') {
    c.fillStyle = '#3a62c8';
    c.beginPath(); c.moveTo(w * 0.62, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w * 0.38, h); c.fill();
    for (const [x, col] of [[0.25, '#ffd0e6'], [0.75, '#cfe0ff']] as const) {
      c.fillStyle = col;
      c.beginPath(); c.arc(w * x, h * 0.26, h * 0.1, 0, 7); c.fill();
      c.beginPath(); c.ellipse(w * x, h * 0.56, h * 0.16, h * 0.18, 0, Math.PI, 0); c.fill();
    }
  } else if (song === 'rock') {
    c.strokeStyle = '#ffdf3a'; c.lineWidth = h * 0.03; c.lineJoin = 'miter';
    for (const x0 of [0.2, 0.55, 0.85]) {
      c.beginPath();
      let x = w * x0, y = 0;
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += w * (k % 2 ? 0.08 : -0.06); y += h * 0.15; c.lineTo(x, y); }
      c.stroke();
    }
    c.fillStyle = '#ff5a1a';
    for (let x = 0; x < w; x += w / 14) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + w / 28, h * mix(0.62, 0.8, random())); c.lineTo(x + w / 14, h); c.fill(); }
  } else {
    c.fillStyle = '#ff5fa2';
    c.beginPath(); c.arc(w * 0.5, h * 0.52, h * 0.2, 0, 7); c.fill();
    c.fillStyle = '#20304a'; c.fillRect(0, h * 0.56, w, h);
    c.strokeStyle = '#3ff0d0'; c.lineWidth = 2;
    for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(w * 0.5, h * 0.56); c.lineTo(w * 0.5 + i * w * 0.14, h); c.stroke(); }
    c.fillStyle = '#10202a';
    for (const x of [0.12, 0.88]) {
      c.fillRect(w * x - 4, h * 0.2, 8, h * 0.5);
      for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(w * x + Math.cos(k) * h * 0.08, h * 0.2 + Math.sin(k) * h * 0.04, h * 0.11, h * 0.025, k, 0, 7); c.fill(); }
    }
  }
}

function lyricLine(c: Ctx, w: number, text: string, y: number, size: number, colour: string, sung: number) {
  c.font = `bold ${size}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = size * 0.22;
  c.strokeStyle = '#101018';
  c.strokeText(text, w / 2, y, w * 0.92);
  c.fillStyle = '#ffffff';
  c.fillText(text, w / 2, y, w * 0.92);
  const width = Math.min(c.measureText(text).width, w * 0.92);
  const left = w / 2 - width / 2;
  c.save();
  c.beginPath();
  c.rect(left - 4, y - size, width * sung + 4, size * 2);
  c.clip();
  c.fillStyle = colour;
  c.fillText(text, w / 2, y, w * 0.92);
  c.restore();
  return { left, width };
}

export default defineThing({
  questions: {
    era: choice('What era is the machine from?', {
      laserdisc: '1980s: a wood-veneer cabinet with a laserdisc player, silver-faced amp and a fat CRT television on top.',
      hifi: '1990s: a black hi-fi rack with a multi-disc changer, green displays and a big black tube TV.',
      online: '2000s: a white and silver networked commander with a chunky touch-panel remote docked on top and a flat screen on a pole.',
      tablet: 'Now: a slim black unit with a glowing tablet on a gooseneck and a large thin screen edged in LED light.',
    }),
    screen: choice('What is on the screen right now?', {
      lyrics: 'Mid-song: a lyric line over a background video, part of it already coloured in.',
      score: 'The song has just ended and the machine is announcing a score.',
      idle: 'Nobody has chosen anything: an attract screen asking for a song number.',
      dead: 'A flat blue screen with a NO SIGNAL box. The party is over or never started.',
    }),
    song: choice('If a song is up, what kind is it?', SONGS),
    score: score('If it has just given a score, how good was it?', ['A humiliating 38', 'A polite 62', 'A solid 81', 'A suspicious 96', 'A perfect 100']),
    speakers: choice('What are the two speakers like?', {
      towers: 'Waist-high floor towers with exposed cones either side of the cabinet.',
      stands: 'Heavy PA boxes up on tripod stands, pointed at the room.',
      cubes: 'Small angled cubes on thin posts, the sort bolted near a ceiling.',
    }),
    onTop: choice('What has been left on or beside the unit?', {
      nothing: 'Nothing. Wiped down and waiting.',
      mic: 'A wired microphone lying on top with its cable trailing to the floor.',
      discs: 'A leaning stack of discs and cases, someone was hunting for a song.',
      glass: 'A half-finished highball with a ring of condensation.',
      coinbox: 'A coin box and a handwritten per-song price card.',
    }),
    volume: score('How loud is it turned up?', ['Barely a murmur', 'Polite', 'Party', 'Every meter in the red']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const palette = {
      laserdisc: { shell: '#7a4f2e', face: '#c9cdd0', trim: '#3a2a1c', led: '#ff5a2a', cloth: '#5a4030' },
      hifi: { shell: '#1b1d20', face: '#26282c', trim: '#0e0f11', led: '#3dff8a', cloth: '#15161a' },
      online: { shell: '#e4e6e8', face: '#b8c0c8', trim: '#5a6470', led: '#3aa8ff', cloth: '#70777f' },
      tablet: { shell: '#17181c', face: '#22242a', trim: '#0c0d10', led: '#ff4fd0', cloth: '#1c1d22' },
    }[a.era];
    const shell = s.material(palette.shell, { roughness: a.era === 'laserdisc' ? 0.7 : 0.4 });
    const face = s.material(palette.face, { metalness: a.era === 'laserdisc' || a.era === 'online' ? 0.6 : 0.2, roughness: 0.35 });
    const trim = s.material(palette.trim);
    const glow = (colour: string, power = 1) => new THREE.MeshStandardMaterial({ color: colour, emissive: colour, emissiveIntensity: power * mix(0.7, 1.5, mood.cheer), roughness: 0.4 });
    const led = glow(palette.led);
    const flat = a.era === 'online' || a.era === 'tablet';

    // Cabinet on casters.
    const W = 0.74, D = 0.46, H = flat ? 0.62 : 0.8, base = 0.07;
    for (const x of [-1, 1]) for (const z of [-1, 1]) s.ball([0.035, 0.035, 0.035], [x * (W / 2 - 0.05), 0.035, z * (D / 2 - 0.05)], trim, 10);
    s.box([W, 0.03, D], [0, base + 0.015, 0], shell);
    s.box([W, 0.03, D], [0, base + H - 0.015, 0], shell);
    for (const x of [-1, 1]) s.box([0.03, H, D], [x * (W / 2 - 0.015), base + H / 2, 0], shell);
    s.box([W - 0.04, H - 0.04, 0.02], [0, base + H / 2, -D / 2 + 0.02], trim);

    // Units stacked inside, front faces flush.
    const uw = W - 0.08, fz = D / 2 - 0.02;
    const unit = (y: number, h: number, paintFace = face) => { s.box([uw, h, D - 0.08], [0, y + h / 2, 0], trim); return s.box([uw, h - 0.012, 0.02], [0, y + h / 2, fz], paintFace); };
    const knob = (x: number, y: number, r: number, turn: number) => {
      const k = s.cylinder(r, r * 1.08, 0.03, [x, y, fz + 0.025], face, 16);
      k.rotation.x = Math.PI / 2;
      const tick = s.box([r * 0.22, r * 0.9, 0.006], [x + Math.sin(turn) * r * 0.5, y + Math.cos(turn) * r * 0.5, fz + 0.042], glow('#ffffff', 0.4));
      tick.rotation.z = -turn;
    };
    let y = base + 0.04;
    const units = flat ? 2 : 3;
    const uh = (H - 0.08 - (units - 1) * 0.015) / units;
    // Bottom: the amplifier with its echo knobs and level meter.
    unit(y, uh, a.era === 'online' ? face : s.material(a.era === 'laserdisc' ? '#b9bcbf' : palette.face, { metalness: 0.5, roughness: 0.35 }));
    const loud = a.volume;
    for (let i = 0; i < 5; i++) knob(-uw / 2 + 0.07 + i * 0.075, y + uh * 0.36, i === 0 ? 0.03 : 0.022, mix(-2.3, 2.3, i === 0 ? loud : (loud * 0.6 + random() * 0.4)));
    s.label('ECHO  ·  MIC 1  ·  MIC 2', 0.34, 0.022, [-uw / 2 + 0.2, y + uh * 0.72, fz + 0.012], a.era === 'laserdisc' || a.era === 'online' ? '#222' : '#ddd', a.era === 'laserdisc' ? '#b9bcbf' : palette.face);
    const meters: THREE.MeshStandardMaterial[] = [];
    for (let row = 0; row < 2; row++)
      for (let i = 0; i < 10; i++) {
        const lit = i / 10 < mix(0.25, 1.05, loud) * mix(0.8, 1, random());
        const colour = i > 7 ? '#ff3020' : i > 5 ? '#ffd020' : '#3dff6a';
        const m = lit ? glow(colour) : s.material('#2a2f2c');
        if (lit && i > 3) meters.push(m);
        s.box([0.017, 0.022, 0.006], [uw / 2 - 0.24 + i * 0.022, y + uh * (0.34 + row * 0.26), fz + 0.012], m);
      }
    for (const x of [0.02, 0.07]) { const j = s.cylinder(0.012, 0.012, 0.012, [x, y + uh * 0.3, fz + 0.012], trim, 12); j.rotation.x = Math.PI / 2; }
    y += uh + 0.015;
    // Middle: the song source.
    unit(y, uh);
    if (a.era === 'laserdisc') {
      s.box([uw * 0.72, 0.012, 0.3], [-0.06, y + uh * 0.6, fz + 0.1], trim);
      const disc = s.cylinder(0.15, 0.15, 0.004, [-0.06, y + uh * 0.6 + 0.009, fz + 0.1], new THREE.MeshStandardMaterial({ color: '#d8e0ea', metalness: 0.95, roughness: 0.12 }), 40);
      disc.rotation.y = random() * 3;
      s.cylinder(0.045, 0.045, 0.005, [-0.06, y + uh * 0.6 + 0.011, fz + 0.1], s.material('#c23b2a'), 20);
    } else if (a.era === 'hifi') {
      for (let i = 0; i < 5; i++) s.box([0.085, uh * 0.22, 0.008], [-uw / 2 + 0.07 + i * 0.1, y + uh * 0.68, fz + 0.012], trim);
      s.box([0.22, uh * 0.3, 0.006], [-uw / 2 + 0.16, y + uh * 0.3, fz + 0.012], glow('#1aff7a', 0.7));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) s.box([0.024, 0.02, 0.01], [uw / 2 - 0.16 + c * 0.032, y + uh * (0.22 + r * 0.2), fz + 0.013], face);
    } else {
      s.box([0.3, uh * 0.4, 0.006], [-0.1, y + uh * 0.55, fz + 0.012], glow(palette.led, 0.8));
      for (let i = 0; i < 4; i++) s.box([0.035, 0.035, 0.01], [uw / 2 - 0.2 + i * 0.05, y + uh * 0.55, fz + 0.013], i === 0 ? glow('#ff4030') : trim);
      const slot = s.box([0.26, 0.008, 0.006], [-0.1, y + uh * 0.2, fz + 0.012], trim);
      slot.castShadow = false;
    }
    y += uh + 0.015;
    if (!flat) {
      // Top: cassette deck or tuner.
      unit(y, uh);
      for (const x of [-0.17, 0.02]) {
        s.box([0.16, uh * 0.6, 0.008], [x, y + uh * 0.5, fz + 0.012], s.material('#31363a', { roughness: 0.2 }));
        for (const dx of [-0.035, 0.035]) { const reel = s.cylinder(0.018, 0.018, 0.006, [x + dx, y + uh * 0.5, fz + 0.018], s.material('#e8e4d8'), 12); reel.rotation.x = Math.PI / 2; }
      }
      for (let i = 0; i < 5; i++) s.box([0.022, 0.022, 0.012], [uw / 2 - 0.16 + i * 0.03, y + uh * 0.3, fz + 0.013], i === 1 ? glow('#ff3020') : face);
      s.box([0.1, 0.03, 0.006], [uw / 2 - 0.1, y + uh * 0.68, fz + 0.012], led);
    }
    const top = base + H;

    // The screen.
    const points = Math.round(a.score < 0.25 ? mix(38, 62, a.score * 4) : a.score < 0.5 ? mix(62, 81, a.score * 4 - 1) : a.score < 0.75 ? mix(81, 96, a.score * 4 - 2) : mix(96, 100, a.score * 4 - 3));
    const sung = mix(0.3, 0.75, random());
    let ball: { left: number; width: number; y: number } | null = null;
    const cw = flat ? 640 : 512, ch = flat ? 360 : 384;
    const picture = paint(cw, ch, (c, w, h) => {
      if (a.screen === 'dead') {
        c.fillStyle = '#1830c8'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#0c1a80'; c.fillRect(w * 0.3, h * 0.4, w * 0.4, h * 0.2);
        c.fillStyle = '#ffffff'; c.font = `bold ${h * 0.09}px monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('NO SIGNAL', w / 2, h / 2);
      } else if (a.screen === 'idle') {
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#20104a'); g.addColorStop(1, '#0a5a7a');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `bold ${h * 0.12}px sans-serif`; c.fillText('SELECT A SONG', w / 2, h * 0.3);
        c.strokeStyle = '#ffe04a'; c.lineWidth = h * 0.015; c.strokeRect(w * 0.25, h * 0.48, w * 0.5, h * 0.22);
        c.fillStyle = '#ffe04a'; c.font = `bold ${h * 0.16}px monospace`; c.fillText('- - - - -', w / 2, h * 0.6);
        c.fillStyle = '#9fd0ff'; c.font = `${h * 0.06}px sans-serif`; c.fillText('ENTER CODE FROM THE BOOK', w / 2, h * 0.84);
      } else if (a.screen === 'score') {
        c.fillStyle = '#0a1040'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) {
          c.fillStyle = i % 2 ? '#182a8a' : '#101a5a';
          c.beginPath(); c.moveTo(w / 2, h * 0.48); c.arc(w / 2, h * 0.48, w, i * Math.PI / 12, (i + 1) * Math.PI / 12); c.fill();
        }
        const tone = points >= 90 ? '#ffe04a' : points >= 70 ? '#7fffb0' : points >= 55 ? '#bfd0ff' : '#ff7a6a';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = `bold ${h * 0.5}px sans-serif`; c.lineWidth = h * 0.04; c.strokeStyle = '#000018';
        c.strokeText(String(points), w / 2, h * 0.44); c.fillStyle = tone; c.fillText(String(points), w / 2, h * 0.44);
        c.font = `bold ${h * 0.1}px sans-serif`; c.fillStyle = '#ffffff';
        c.fillText(points >= 100 ? 'PERFECT!!' : points >= 90 ? 'SUPERSTAR!' : points >= 70 ? 'NICE SINGING' : points >= 55 ? 'KEEP PRACTISING' : 'PLEASE TRY AGAIN', w / 2, h * 0.8);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = i < Math.round((points - 30) / 14) ? '#ffe04a' : '#2a3470';
          c.beginPath();
          for (let k = 0; k < 10; k++) c.lineTo(w * (0.3 + i * 0.1) + Math.sin(k * 0.628) * h * 0.045 * (k % 2 ? 0.45 : 1), h * 0.93 - Math.cos(k * 0.628) * h * 0.045 * (k % 2 ? 0.45 : 1));
          c.fill();
        }
      } else {
        backdrop(c, w, h, a.song, random);
        if (a.song === 'duet') {
          const one = lyricLine(c, w, LYRIC.duet, h * 0.7, h * 0.095, '#ff6fb0', sung);
          c.globalAlpha = 0.55;
          lyricLine(c, w, 'I WAITED, YOU NEVER CAME', h * 0.86, h * 0.095, '#5fa8ff', 0);
          c.globalAlpha = 1;
          c.fillStyle = '#ff6fb0'; c.beginPath(); c.arc(w * 0.035, h * 0.7, h * 0.03, 0, 7); c.fill();
          c.fillStyle = '#5fa8ff'; c.beginPath(); c.arc(w * 0.035, h * 0.86, h * 0.03, 0, 7); c.fill();
          ball = { ...one, y: 0.7 - 0.09 };
        } else {
          const one = lyricLine(c, w, LYRIC[a.song], h * 0.8, h * 0.115, HILITE[a.song], sung);
          ball = { ...one, y: 0.8 - 0.1 };
        }
        c.fillStyle = '#00000088'; c.fillRect(w * 0.03, h * 0.04, w * 0.2, h * 0.08);
        c.fillStyle = '#ffffff'; c.font = `bold ${h * 0.055}px monospace`; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(String(10000 + Math.floor(random() * 89999)), w * 0.045, h * 0.082);
      }
    });
    const tube = new THREE.MeshStandardMaterial({ map: picture, emissive: '#ffffff', emissiveMap: picture, emissiveIntensity: mix(0.75, 1.1, mood.cheer), roughness: 0.25 });
    let sw: number, sh: number, sy: number, sz: number;
    if (flat) {
      sw = a.era === 'tablet' ? 1.18 : 0.98; sh = sw * 9 / 16; sy = top + 0.22 + sh / 2; sz = -D / 2 + 0.07;
      s.box([0.07, sy - 0.02, 0.05], [0, (sy - 0.02) / 2 + 0.02, -D / 2 - 0.03], trim);
      s.box([0.5, 0.03, 0.34], [0, 0.015, -D / 2 - 0.06], trim);
      s.box([sw + 0.05, sh + 0.05, 0.035], [0, sy, sz - 0.02], a.era === 'tablet' ? trim : face);
      if (a.era === 'tablet') s.box([sw + 0.09, sh + 0.09, 0.012], [0, sy, sz - 0.035], glow(palette.led, 0.9));
    } else {
      sw = 0.56; sh = 0.42; sy = top + 0.05 + 0.26; sz = 0.19;
      s.box([0.68, 0.52, 0.34], [0, top + 0.26, 0.02], a.era === 'laserdisc' ? shell : trim);
      s.box([0.5, 0.4, 0.16], [0, top + 0.25, -0.2], a.era === 'laserdisc' ? shell : trim);
      s.box([0.68, 0.045, 0.02], [0, top + 0.03, 0.2], face);
      for (let i = 0; i < 4; i++) s.box([0.02, 0.014, 0.01], [0.2 + i * 0.03, top + 0.03, 0.212], i === 0 ? led : trim);
      const rabbit = s.material('#c8ccd0', { metalness: 0.8, roughness: 0.3 });
      if (a.era === 'laserdisc') for (const dx of [-1, 1]) s.rod([0, top + 0.52, -0.05], [dx * 0.22, top + 0.86, -0.1], 0.005, rabbit);
    }
    const screen = s.mesh(new THREE.PlaneGeometry(sw, sh), tube, [0, sy, sz + 0.001]);
    screen.castShadow = false;

    // The bouncing ball that leads the lyric.
    let bouncer: THREE.Mesh | null = null;
    const span = ball as { left: number; width: number; y: number } | null;
    if (span) {
      bouncer = s.ball([0.022, 0.022, 0.022], [0, 0, 0], glow('#ffffff', 1.2), 12);
      bouncer.castShadow = false;
    }
    const ballAt = (t: number) => {
      if (!bouncer || !span) return;
      const u = (span.left + span.width * (sung + 0.06 * Math.sin(t * 0.7))) / cw;
      bouncer.position.set((u - 0.5) * sw, sy + (0.5 - span.y) * sh + Math.abs(Math.sin(t * 5)) * sh * 0.09, sz + 0.03);
    };
    ballAt(random() * 6);

    // Speakers.
    const cloth = s.material(palette.cloth, { roughness: 0.95 });
    const cones: THREE.Mesh[] = [];
    const cone = (x: number, yy: number, z: number, r: number, tilt = 0, yawed = 0) => {
      const g = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.12, 8, 28), trim);
      const dish = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.45, 28, 1, true), s.material('#3a3d42', { side: THREE.DoubleSide, roughness: 0.8 }));
      dish.rotation.x = -Math.PI / 2; dish.position.z = -r * 0.2;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.3, 14, 8), s.material(a.era === 'tablet' ? palette.led : '#c9ccd0', { metalness: 0.5, roughness: 0.3 }));
      cap.position.z = -r * 0.3;
      g.add(rim, dish, cap);
      g.position.set(x, yy, z); g.rotation.set(tilt, yawed, 0);
      for (const m of [rim, dish, cap]) m.castShadow = true;
      s.root.add(g);
      cones.push(cap);
    };
    for (const side of [-1, 1]) {
      const x = side * (Math.max(W, sw) / 2 + 0.3);
      if (a.speakers === 'towers') {
        const th = flat ? 1.0 : 0.86;
        s.box([0.3, th, 0.3], [x, th / 2 + 0.02, 0.02], shell);
        s.box([0.3, 0.02, 0.3], [x, 0.01, 0.02], trim);
        s.box([0.26, th - 0.06, 0.012], [x, th / 2 + 0.02, 0.175], cloth);
        cone(x, th * 0.3, 0.185, 0.105); cone(x, th * 0.62, 0.185, 0.08); cone(x, th * 0.86, 0.185, 0.035);
      } else if (a.speakers === 'stands') {
        const py = 1.2;
        for (let k = 0; k < 3; k++) s.rod([x, 0.5, 0], [x + Math.sin(k * 2.094) * 0.3, 0.01, Math.cos(k * 2.094) * 0.3], 0.012, trim);
        s.rod([x, 0.4, 0], [x, py, 0], 0.016, face);
        const box = s.box([0.34, 0.5, 0.3], [x, py + 0.25, 0.02], trim);
        box.rotation.y = -side * 0.25;
        s.box([0.3, 0.46, 0.012], [x - side * 0.035, py + 0.25, 0.165], cloth).rotation.y = -side * 0.25;
        cone(x - side * 0.04, py + 0.17, 0.18, 0.11, 0, -side * 0.25); cone(x - side * 0.04, py + 0.38, 0.18, 0.05, 0, -side * 0.25);
      } else {
        const py = flat ? sy + 0.1 : 1.45;
        s.cylinder(0.14, 0.16, 0.03, [x, 0.015, -0.05], trim, 20);
        s.rod([x, 0.02, -0.05], [x, py, -0.05], 0.014, face);
        const box = s.box([0.22, 0.3, 0.2], [x, py + 0.06, 0], shell);
        box.rotation.set(0.3, -side * 0.3, 0);
        s.box([0.19, 0.27, 0.012], [x - side * 0.03, py + 0.03, 0.098], cloth).rotation.set(0.3, -side * 0.3, 0);
        cone(x - side * 0.033, py + 0.0, 0.112, 0.07, 0.3, -side * 0.3); cone(x - side * 0.033, py + 0.115, 0.076, 0.03, 0.3, -side * 0.3);
      }
    }

    // The song selector that lives on top.
    if (a.era === 'online') {
      const pad = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.035), s.material('#f2f2ee'));
      const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.14), glow('#58c8ff', 0.9));
      lcd.position.z = 0.019;
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 8), trim);
      pen.position.set(0.165, 0, 0);
      pad.add(body, lcd, pen);
      body.castShadow = true;
      pad.position.set(-0.17, top + 0.12, 0.08); pad.rotation.x = -0.5;
      s.root.add(pad);
      s.box([0.2, 0.05, 0.1], [-0.17, top + 0.025, 0.04], trim);
    } else if (a.era === 'tablet') {
      s.cylinder(0.07, 0.08, 0.02, [-0.2, top + 0.01, 0.08], trim, 20);
      s.tube([[-0.2, top + 0.02, 0.08], [-0.21, top + 0.16, 0.04], [-0.2, top + 0.24, 0.12]], 0.008, face);
      const tab = s.box([0.26, 0.18, 0.012], [-0.2, top + 0.25, 0.13], trim);
      tab.rotation.x = -0.45;
      const lit = s.mesh(new THREE.PlaneGeometry(0.24, 0.16), glow('#ffd8f4', 0.9), [-0.2, top + 0.253, 0.137]);
      lit.rotation.x = -0.45; lit.castShadow = false;
    }

    // What was left behind.
    const tx = flat ? 0.2 : 0, ty = flat ? top : top + 0.52, tz = flat ? 0.08 : 0.02;
    if (a.onTop === 'mic') {
      const mic = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.17, 12), s.material('#2a2c30', { metalness: 0.5 }));
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), s.material('#aeb4ba', { metalness: 0.7, roughness: 0.4 }));
      head.position.y = 0.1;
      mic.add(handle, head); handle.castShadow = head.castShadow = true;
      mic.rotation.set(0, random() * 2, Math.PI / 2); mic.position.set(tx, ty + 0.03, tz);
      s.root.add(mic);
      const side = W / 2 + 0.03;
      s.tube([[tx - 0.08, ty + 0.02, tz], [side * 0.7, ty + 0.015, tz + 0.1], [side, ty - 0.2, tz + 0.14], [side + 0.03, ty * 0.4, 0.2], [side - 0.02, 0.02, 0.28], [side - 0.2, 0.012, 0.36], [0.05, 0.012, 0.32]], 0.006, trim);
    } else if (a.onTop === 'discs') {
      const n = 5 + Math.floor(random() * 5);
      for (let i = 0; i < n; i++) {
        const lp = a.era === 'laserdisc';
        const c = s.box(lp ? [0.31, 0.008, 0.31] : [0.142, 0.01, 0.125], [tx + (random() - 0.5) * 0.03, ty + 0.006 + i * (lp ? 0.009 : 0.011), tz + (random() - 0.5) * 0.03], s.material(['#d83a5a', '#3a7ad8', '#e8c83a', '#f2f2f2', '#3ab890', '#8a4ad0'][Math.floor(random() * 6)], { roughness: 0.3 }));
        c.rotation.y = (random() - 0.5) * 0.7;
      }
      const loose = s.cylinder(0.06, 0.06, 0.002, [tx + 0.19, ty + 0.002, tz + 0.08], new THREE.MeshStandardMaterial({ color: '#dfe6f0', metalness: 0.95, roughness: 0.1 }), 28);
      loose.visible = !flat || tx + 0.25 < W / 2;
    } else if (a.onTop === 'glass') {
      s.cylinder(0.034, 0.03, 0.13, [tx, ty + 0.065, tz], new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05, depthWrite: false }), 18);
      s.cylinder(0.03, 0.027, 0.06, [tx, ty + 0.035, tz], s.material('#e0a83a', { roughness: 0.2, emissive: '#c07a10', emissiveIntensity: 0.3 }), 18);
      s.cylinder(0.05, 0.05, 0.002, [tx + 0.01, ty + 0.001, tz + 0.005], s.material('#9ab0c0', { roughness: 0.1 }), 20);
      s.rod([tx + 0.01, ty + 0.03, tz], [tx + 0.04, ty + 0.17, tz + 0.01], 0.003, s.material('#f04a5a'));
    } else if (a.onTop === 'coinbox') {
      s.box([0.14, 0.1, 0.11], [tx, ty + 0.05, tz], s.material('#8a8f94', { metalness: 0.7, roughness: 0.4 }));
      s.box([0.045, 0.006, 0.004], [tx, ty + 0.075, tz + 0.056], trim);
      s.cylinder(0.012, 0.012, 0.01, [tx + 0.04, ty + 0.035, tz + 0.058], s.material('#d0b050', { metalness: 0.8 }), 10).rotation.x = Math.PI / 2;
      const card = s.label('1 SONG ¥100', 0.2, 0.09, [tx + (flat ? 0 : 0.2), ty + 0.05, tz + (flat ? 0.14 : 0.1)], '#c8281e', '#fbf6dc');
      card.rotation.x = -0.35; card.rotation.z = (random() - 0.5) * 0.2;
    }

    // Wear: stickers, a strip of tape and a taped-on notice.
    if (mood.wear > 0.45) {
      const n = Math.round(mix(0, 6, (mood.wear - 0.45) / 0.55));
      for (let i = 0; i < n; i++) {
        const st = s.box([0.05 + random() * 0.05, 0.035 + random() * 0.03, 0.002], [(W / 2 + 0.001) * (i % 2 ? 1 : -1), base + 0.1 + random() * (H - 0.2), (random() - 0.5) * (D - 0.14)], s.material(['#f2d23a', '#e84a6a', '#4ac0e8', '#f2f2f2'][i % 4]));
        st.rotation.y = Math.PI / 2; st.rotation.x = (random() - 0.5) * 0.6;
      }
      const note = s.label(mood.wear > 0.8 ? 'MIC 2 BROKEN' : 'NO DRINKS ON TOP', 0.22, 0.05, [0.12, base + H - 0.016, fz + 0.03], '#333', '#f4eeda');
      note.rotation.z = (random() - 0.5) * 0.15;
    }

    const live = a.screen === 'lyrics' || a.screen === 'score';
    const tempo = mix(0.4, 1.6, mood.energy);
    let clock = random() * 10;
    return s.finish({
      update: (dt) => {
        clock += dt * tempo;
        ballAt(clock);
        const beat = live ? Math.abs(Math.sin(clock * 5)) : 0;
        for (const [i, m] of meters.entries()) m.emissiveIntensity = live ? 0.4 + ((Math.sin(clock * 9 + i * 1.7) + 1) / 2) * 1.2 : 0.9;
        for (const c of cones) c.scale.setScalar(1 + beat * 0.12 * a.volume);
      },
    });
  },
});
