import * as THREE from 'three';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix } from '@conjure/kit';
import { Batch, aged, paint } from './lib';

type V3 = [number, number, number];

const B = 7.5; // first base is at (B, -B): a compressed little-league diamond
const FENCE = 30; // outfield fence radius from home plate
const ARC = (65 * Math.PI) / 180; // the fence runs this far either side of dead centre
/** x, z, tallest, widest, and the smallest height a thing is allowed to shrink to there. Hero first. */
const SLOTS: readonly (readonly [number, number, number, number, number])[] = [
  [0, -3.4, 4.3, 2.3, 2.9], [5.8, -6.4, 3.2, 1.6, 2.1], [-5.8, -6.4, 3.2, 1.6, 2.1], [-3.3, 1.7, 1.8, 1.0, 1.25], [3.3, 1.7, 1.8, 1.0, 1.25],
];
/** A point on the field: angle from dead centre (positive toward first base) and distance from home. */
const polar = (angle: number, r: number): [number, number] => [Math.sin(angle) * r, -Math.cos(angle) * r];

const SKIES = {
  ember: 'The last of an orange and rose sunset under a violet sky, long thin clouds lit from below.',
  blue_hour: 'Blue hour: periwinkle overhead, a pale peach line on the horizon, the first stars.',
  gold: 'Golden hour, still bright: a honey sky and long shadows across the infield.',
  storm: 'Thunderheads piling up purple beyond the outfield, the air gone still before rain.',
  haze: 'Humid milky lavender haze, no edges anywhere, heat still rising off the dirt.',
} as const;
const SKY_TONES: Record<keyof typeof SKIES, [string, string, string, string]> = {
  ember: ['#6a70ad', '#b98bb0', '#f09a6a', '#ffd08a'],
  blue_hour: ['#566aa8', '#8b96cc', '#e9b3a4', '#ffd9b0'],
  gold: ['#8fb0d8', '#c9cfdc', '#f7d9a0', '#ffe9b8'],
  storm: ['#5f5c88', '#8a7fa6', '#d99a80', '#f6c48e'],
  haze: ['#9a94b4', '#c2aebd', '#eab99a', '#f8d6ac'],
};
const SPONSORS = ["HANK'S|FEED & SEED", 'FIRST STATE|BANK', 'DAIRY|DREAM', 'MILLER|MOTORS', 'VFW|POST 212', 'KOSTER|HARDWARE', "RAY'S|BARBER SHOP", 'LIONS|CLUB', 'CO-OP|GRAIN', 'PIZZA|BARN', 'DR. LOWE|DENTIST', 'WKLM|1340 AM', 'TWIST-N-|CONE', "AL'S|BODY SHOP", 'ROTARY|CLUB', 'ELM ST.|LAUNDRY'];
const BOARD_PAINT = ['#f2ead6', '#c9382c', '#234a8a', '#e8c23a', '#2f6a45', '#f2ead6', '#1d1d22', '#d9772b'];
const TOWNS = ['HARLAN', 'ELM GROVE', 'MILLBROOK', 'DELMAR', 'PRAIRIE CITY'];

export default defineWorld({
  questions: {
    game: choice('What moment of the season is this?', {
      pregame: 'Before the game: dirt freshly raked, chalk lines crisp and white, nobody here yet.',
      last_inning: 'The last inning under the lights: batter\'s boxes scuffed out, the scoreboard close.',
      after: 'Just after: everyone gone home, lines trampled, paper cups in the dirt, lights still burning.',
      rainout: 'Rained out: a tarp over the mound and plate, puddles standing on the infield.',
      offseason: 'Long after the last game: weeds in the base paths, bases pulled, leaves blown against the fence.',
    }),
    sky: choice('What is the evening sky doing?', SKIES),
    lights: choice('What are the light towers doing?', {
      warming: 'Just switched on: lamps dull and rosy, still climbing toward full.',
      blazing: 'Fully on, hard and white against the dimming sky.',
      patchy: 'On, but half the lamps are dead.',
      dark: 'Off: black lamps against the sky.',
    }),
    beyond: choice('What lies beyond the outfield fence?', {
      corn: 'A sea of tall corn right up to the fence, a far barn and silo.',
      town: 'The town: treetops, roofs with lit windows, a steeple and the water tower.',
      elevator: 'Wheat stubble and a white concrete grain elevator beside the tracks.',
      woods: 'Dark woods and blue hills.',
      prairie: 'Flat empty prairie, a line of power poles walking to the horizon.',
    }),
    fence: choice('What is the outfield fence?', {
      boards: 'A plywood fence solid with hand-painted local sponsor boards.',
      chainlink: 'Chain-link with a yellow safety cap and a few banners tied on.',
      snowfence: 'A sagging run of orange plastic snow fence on steel posts.',
      none: 'No fence at all: the outfield simply ends where the crop or the weeds begin.',
    }),
    infield: choice('What is the infield like?', {
      skinned: 'All dirt, raked smooth: a skinned little-league infield.',
      grass: 'A mown grass infield with dirt base paths and a dirt mound.',
      sandlot: 'A sandlot: base paths worn bare through rough grass by years of feet.',
    }),
    scoreboard: choice('What does the scoreboard beyond left field say?', {
      tied: 'Tied in the last inning.',
      comeback: 'Home trailing by one in the bottom of the last.',
      blowout: 'A hopeless blowout, guests far ahead.',
      zeros: 'All zeros: nothing has happened yet.',
      none: 'There is no scoreboard.',
    }),
    left: choice('What has been left lying by home plate?', {
      nothing: 'Nothing.',
      bat_helmet: 'A bat and a batting helmet dropped beside the plate.',
      glove: 'A single glove with a ball in it.',
      bucket: 'A tipped bucket and a spill of practice balls.',
      rake: 'An infield rake lying across its own rake marks.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const over = a.game === 'offseason';
    const decay = Math.min(1, mood.wear * 0.7 + (over ? 0.4 : 0));
    const tones = SKY_TONES[a.sky].map((hex) => new THREE.Color(hex).lerp(new THREE.Color(mood.warmth > 0.5 ? '#f4a66c' : '#86a4e2'), Math.abs(mood.warmth - 0.5) * 0.28));
    const css = (c: THREE.Color) => `#${c.getHexString()}`;

    // ----- sky: a painted backdrop, kept mid-toned so prints read as dusk and not night -----
    const sunX = 0.5 + (mood.daylight - 0.5) * 0.22;
    const sky = paint(1024, 512, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.08, css(tones[0])); g.addColorStop(0.5, css(tones[1])); g.addColorStop(0.74, css(tones[2])); g.addColorStop(0.83, css(tones[3])); g.addColorStop(1, css(tones[3]));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * sunX, h * 0.84, 0, w * sunX, h * 0.84, w * 0.2);
      glow.addColorStop(0, a.sky === 'gold' ? 'rgba(255,244,200,0.95)' : 'rgba(255,214,150,0.7)'); glow.addColorStop(1, 'rgba(255,214,150,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      if (a.sky === 'blue_hour' || a.sky === 'ember') for (let i = 0; i < (a.sky === 'blue_hour' ? 70 : 18); i++) { ctx.fillStyle = `rgba(255,255,240,${0.4 + random() * 0.6})`; ctx.fillRect(w * (0.3 + random() * 0.4), h * (0.16 + random() * random() * 0.4), 1.6, 1.6); }
      if (a.sky === 'storm') {
        for (let i = 0; i < 110; i++) {
          const x = w * (0.3 + random() * 0.4), y = h * (0.56 + random() * 0.26), r = h * (0.02 + random() * 0.045) * (1.25 - (y / h - 0.56) * 2);
          ctx.fillStyle = `rgba(${96 + random() * 24},${86 + random() * 20},${128 + random() * 24},0.55)`;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
          ctx.fillStyle = 'rgba(250,200,170,0.16)'; ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.3, r * 0.7, 0, 7); ctx.fill();
        }
      } else if (a.sky !== 'haze') {
        const bands = a.sky === 'ember' ? 13 : 7;
        for (let i = 0; i < bands; i++) {
          const y = h * (0.46 + random() * 0.34);
          ctx.fillStyle = a.sky === 'ember' ? `rgba(${200 + random() * 55},${90 + random() * 60},${90 + random() * 40},${0.3 + random() * 0.3})` : `rgba(255,236,226,${0.18 + random() * 0.2})`;
          ctx.beginPath(); ctx.ellipse(w * (0.28 + random() * 0.44), y, w * (0.03 + random() * 0.07), h * (0.006 + random() * 0.012), 0, 0, 7); ctx.fill();
        }
      } else { ctx.fillStyle = 'rgba(236,214,214,0.35)'; ctx.fillRect(0, h * 0.55, w, h * 0.45); }
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(520, 100), new THREE.MeshBasicMaterial({ map: sky, fog: false }));
    backdrop.position.set(0, 38, -180);
    backdrop.renderOrder = -1;
    root.add(backdrop);
    const background = tones[1].clone();

    // ----- grass -----
    const rough = a.infield === 'sandlot' || over;
    const grassA = new THREE.Color().setHSL(rough ? 0.2 : 0.27, mix(0.4, 0.58, mood.cheer) * (rough ? 0.9 : 1), rough ? 0.22 : 0.25);
    const grassB = grassA.clone().offsetHSL(0.008, 0.02, 0.03);
    const turf = paint(512, 512, (ctx, w, h) => {
      ctx.fillStyle = css(grassA); ctx.fillRect(0, 0, w, h);
      if (!rough) {
        ctx.fillStyle = css(grassB);
        for (let i = 0; i < 8; i += 2) ctx.fillRect((i * w) / 8, 0, w / 8, h);
        ctx.globalAlpha = 0.45;
        for (let i = 0; i < 8; i += 2) { ctx.fillStyle = css(grassA); ctx.fillRect(0, (i * h) / 8, w, h / 8); }
        ctx.globalAlpha = 1;
      } else for (let i = 0; i < 60; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(170,150,80,0.22)' : 'rgba(60,90,40,0.25)'; ctx.beginPath(); ctx.ellipse(random() * w, random() * h, 10 + random() * 40, 6 + random() * 22, random() * 3, 0, 7); ctx.fill(); }
      for (let i = 0; i < 2600; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(255,255,220,0.07)' : 'rgba(20,40,20,0.09)'; ctx.fillRect(random() * w, random() * h, 2, 3); }
    });
    turf.wrapS = turf.wrapT = THREE.RepeatWrapping;
    turf.repeat.set(16, 16);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(512, 512), new THREE.MeshStandardMaterial({ map: turf, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -100);
    ground.receiveShadow = true;
    root.add(ground);

    // ----- dirt, chalk and bases -----
    const flat = new Batch();
    const dirt = aged(a.game === 'rainout' ? '#7e4e33' : '#a2673f', decay * 0.3, '#8d7a62');
    const dirtDark = new THREE.Color(dirt).multiplyScalar(0.86);
    const patch = (points: [number, number][], y: number, tint: THREE.ColorRepresentation) => {
      const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.rotateX(-Math.PI / 2);
      flat.add(geometry, tint, [0, y, 0]);
    };
    const disc = (x: number, z: number, r: number, y: number, tint: THREE.ColorRepresentation, squash = 1, turn = 0) => {
      const geometry = new THREE.CircleGeometry(r, 28);
      geometry.rotateX(-Math.PI / 2);
      flat.add(geometry, tint, [x, y, z], [0, turn, 0], [1, 1, squash]);
    };
    if (a.infield === 'sandlot') {
      const corners: [number, number][] = [[0, 0], [B, -B], [0, -2 * B], [-B, -B]];
      corners.forEach(([x, z], i) => {
        const [nx, nz] = corners[(i + 1) % 4];
        for (let t = 0; t <= 1.001; t += 0.09) disc(mix(x, nx, t) + (random() - 0.5) * 0.3, mix(z, nz, t) + (random() - 0.5) * 0.3, 0.55 + random() * 0.4, 0.012 + random() * 0.004, dirt, 0.8, random() * 3);
        disc(x, z, 1.5 + random() * 0.4, 0.018, dirt, 0.85, random() * 3);
      });
      disc(0, 0, 2.6, 0.02, dirt, 0.9);
      disc(0, -7.1, 1.9, 0.02, dirt, 0.9);
    } else {
      const skin: [number, number][] = [];
      for (let i = 0; i <= 28; i++) { const phi = mix(-1.31, 1.31, i / 28); skin.push([Math.sin(phi) * 12.5, -7 - Math.cos(phi) * 12.5]); }
      skin.push([-2.2, 1.2], [2.2, 1.2]);
      patch(skin.reverse(), 0.012, dirt);
      disc(0, 0, 3.3, 0.016, dirt);
      if (a.infield === 'grass') {
        patch([[0, -2.3], [-5.2, -7.5], [0, -12.7], [5.2, -7.5]], 0.02, grassB);
        disc(0, -7.1, 2.5, 0.024, dirt);
      } else if (a.game === 'pregame') for (let i = 0; i < 26; i++) { const phi = mix(-1.2, 1.2, i / 25); flat.box([0.05, 0.002, 7], [Math.sin(phi) * 8.6, 0.02, -7 - Math.cos(phi) * 8.6], dirtDark, [0, -phi, 0]); }
    }
    for (const side of [-1, 1]) disc(side * 3.3, 1.7, 1.05, 0.018, dirt);
    // Warning track under the fence.
    if (a.fence !== 'none' && a.infield !== 'sandlot') {
      const track = new THREE.RingGeometry(FENCE - 2.3, FENCE + 0.4, 48, 1, Math.PI / 2 - ARC, ARC * 2);
      track.rotateX(-Math.PI / 2);
      flat.add(track, dirt, [0, 0.012, 0]);
    }
    // The mound: a low dome with the rubber on top.
    flat.ball([2.3, 0.28, 2.3], [0, 0, -7.1], dirt, 20);
    // Puddles after rain, darker scuffs otherwise.
    if (a.game === 'rainout') for (let i = 0; i < 9; i++) { const [x, z] = polar((random() - 0.5) * 1.6, 3 + random() * 13); disc(x, z + (a.infield === 'sandlot' ? 0 : -1), 0.6 + random() * 1.1, 0.03, '#6f7f96', 0.4 + random() * 0.4, random() * 3); }
    else for (let i = 0; i < 14; i++) { const [x, z] = polar((random() - 0.5) * 1.3, 1 + random() * 5); disc(x, z, 0.25 + random() * 0.4, 0.022, dirtDark, 0.5, random() * 3); }
    flat.into(root, { roughness: 1 })!.castShadow = false;

    const chalk = new Batch();
    const white = aged('#f6f3e8', decay * 0.35, '#b8ab94');
    const keep = { pregame: 1, last_inning: 0.9, after: 0.72, rainout: 0.5, offseason: 0.16 }[a.game] * (a.infield === 'sandlot' ? 0.35 : 1);
    const line = (x0: number, z0: number, x1: number, z1: number, chance: number, width = 0.11) => {
      const length = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.round(length / 0.45)), turn = Math.atan2(x1 - x0, z1 - z0);
      for (let i = 0; i < steps; i++) {
        if (random() > chance) continue;
        const t = (i + 0.5) / steps;
        chalk.box([width * mix(0.85, 1.1, random()), 0.006, (length / steps) * 1.04], [mix(x0, x1, t), 0.034, mix(z0, z1, t)], white, [0, turn, 0]);
      }
    };
    for (const side of [-1, 1]) {
      line(side * 0.6, -0.6, side * (FENCE - 0.3) * 0.7071, -(FENCE - 0.3) * 0.7071, keep, 0.12);
      // Batter's box: the first thing to be scuffed out.
      const scuffed = a.game === 'pregame' ? 1 : keep * 0.55;
      const x0 = side * 0.5, x1 = side * 1.6;
      line(x0, -0.95, x1, -0.95, scuffed); line(x1, -0.95, x1, 0.95, scuffed); line(x1, 0.95, x0, 0.95, scuffed); line(x0, 0.95, x0, -0.95, scuffed * 0.8);
      line(side * 0.75, 1.0, side * 0.75, 2.5, keep * 0.8);
    }
    line(-0.75, 2.5, 0.75, 2.5, keep * 0.8);
    chalk.into(root, { roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.1 })!.castShadow = false;

    const set = new Batch(); // everything solid on and around the field
    const glowBits = new Batch(); // lit windows and scoreboard lamps
    const canvasWhite = aged('#f4f1e6', decay * 0.3, '#a89a80');
    const plate = new THREE.Shape([[-0.3, -0.3], [0.3, -0.3], [0.3, 0.02], [0, 0.32], [-0.3, 0.02]].map(([x, y]) => new THREE.Vector2(x, y)));
    const plateGeometry = new THREE.ExtrudeGeometry(plate, { depth: 0.03, bevelEnabled: false });
    plateGeometry.rotateX(Math.PI / 2);
    set.add(plateGeometry, canvasWhite, [0, 0.06, 0]);
    set.box([0.75, 0.06, 0.2], [0, 0.29, -7.1], canvasWhite);
    if (!over) for (const [x, z] of [[B, -B], [0, -2 * B], [-B, -B]]) set.box([0.55, 0.1, 0.55], [x, 0.06, z], canvasWhite, [0, Math.PI / 4, 0]);
    if (a.game === 'rainout') {
      const tarp = aged(mood.cheer > 0.5 ? '#2d63b8' : '#5d6b73', decay * 0.3);
      set.cyl(2.7, 2.9, 0.06, [0, 0.3, -7.1], tarp, 20);
      set.box([2.6, 0.03, 2.6], [0, 0.07, 0.1], tarp, [0, 0.2, 0]);
      for (let i = 0; i < 6; i++) { const t = (i / 6) * 6.283; set.ball([0.22, 0.09, 0.14], [Math.sin(t) * 2.5, 0.36, -7.1 + Math.cos(t) * 2.5], '#b9a67c', 8, [0, t, 0]); }
      for (const [x, z] of [[-1.2, -1.1], [1.25, -1.0], [1.2, 1.3], [-1.25, 1.25]]) set.ball([0.22, 0.09, 0.14], [x, 0.12, z], '#b9a67c', 8, [0, x, 0]);
    }

    // ----- what was left by the plate -----
    const team = new THREE.Color().setHSL([0.0, 0.6, 0.36, 0.08][Math.floor(random() * 4)], mix(0.4, 0.75, mood.cheer), 0.34);
    if (a.left === 'bat_helmet') {
      set.rod([1.9, 0.07, 1.35], [2.5, 0.09, 0.5], 0.03, '#c9a36a', 8, 0.055);
      set.ball([0.05, 0.035, 0.05], [1.88, 0.07, 1.38], '#c9a36a', 8);
      set.add(new THREE.SphereGeometry(0.21, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), team, [2.25, 0.03, 1.7], [0.2, 0.6, 0.1]);
      set.cyl(0.15, 0.15, 0.02, [2.4, 0.05, 1.83], team, 10);
    } else if (a.left === 'glove') {
      const leather = aged('#9a5a2c', decay * 0.3, '#5a4030');
      set.ball([0.2, 0.07, 0.2], [-2.0, 0.09, 0.9], leather, 12);
      for (let i = 0; i < 4; i++) { const t = -0.5 + i * 0.3; set.rod([-2.0 + Math.sin(t) * 0.15, 0.09, 0.9 - Math.cos(t) * 0.15], [-2.0 + Math.sin(t) * 0.42, 0.16, 0.9 - Math.cos(t) * 0.42], 0.045, leather, 7); }
      set.rod([-1.85, 0.09, 0.9], [-1.62, 0.14, 0.75], 0.05, leather, 7);
      set.ball([0.075, 0.075, 0.075], [-2.0, 0.19, 0.88], canvasWhite, 10);
    } else if (a.left === 'bucket') {
      set.cyl(0.19, 0.16, 0.42, [-2.1, 0.21, 0.5], '#e4e0d2', 14, [Math.PI / 2 - 0.1, 0, 0.7]);
      for (let i = 0; i < 11; i++) set.ball([0.075, 0.075, 0.075], [-1.9 + random() * 1.5 - i * 0.02, 0.09, 0.2 + random() * 1.9], canvasWhite, 8);
    } else if (a.left === 'rake') {
      set.rod([1.4, 0.08, 0.9], [2.4, 0.1, -0.85], 0.028, '#b48d58', 6);
      set.box([0.9, 0.04, 0.06], [1.4, 0.07, 0.9], '#7f8587', [0, 0.52, 0]);
      for (let i = 0; i < 9; i++) set.box([0.03, 0.004, 1.1], [1.0 + i * 0.09, 0.024, 0.2 - i * 0.05], dirtDark, [0, 0.52, 0]);
    }
    // Litter after the crowd has gone.
    const litter = a.game === 'after' ? Math.round(mix(8, 34, mood.density)) : a.game === 'last_inning' ? Math.round(mood.density * 8) : 0;
    for (let i = 0; i < litter; i++) {
      const x = (random() - 0.5) * 9, z = 2.6 - random() * 5;
      if (random() < 0.5) set.cyl(0.06, 0.045, 0.14, [x, 0.06, z], random() < 0.5 ? '#f1eee4' : '#c9382c', 8, [Math.PI / 2, 0, random() * 3]);
      else set.box([0.16, 0.012, 0.11], [x, 0.03, z], ['#e8c23a', '#f1eee4', '#d9772b'][Math.floor(random() * 3)], [0, random() * 3, (random() - 0.5) * 0.3]);
    }

    // ----- outfield fence -----
    const fenceH = { boards: 2.2, chainlink: 2.0, snowfence: 1.25, none: 0 }[a.fence];
    const boards = SPONSORS.length;
    if (a.fence !== 'none') {
      const post = a.fence === 'boards' ? aged('#7a6248', decay * 0.4, '#8d8a82') : aged('#8f9698', decay * 0.5, '#7a5a40');
      for (let i = 0; i <= boards; i++) {
        const [x, z] = polar(mix(-ARC, ARC, i / boards), FENCE + 0.06);
        set.cyl(0.07, 0.07, fenceH + 0.15, [x, (fenceH + 0.15) / 2, z], post, 6, [(random() - 0.5) * decay * 0.12, 0, (random() - 0.5) * decay * 0.12]);
        if (i < boards && a.fence !== 'snowfence') {
          const [nx, nz] = polar(mix(-ARC, ARC, (i + 1) / boards), FENCE + 0.06);
          set.rod([x, fenceH, z], [nx, fenceH, nz], a.fence === 'chainlink' ? 0.07 : 0.04, a.fence === 'chainlink' ? '#e6c22e' : post, 6);
        }
      }
      const order = SPONSORS.map((name) => ({ name, key: random() })).sort((p, q) => p.key - q.key).map((p) => p.name);
      const banners = a.fence === 'boards' ? boards : Math.round(mix(2, 7, mood.density));
      const face = paint(4096, 128, (ctx, w, h) => {
        const bw = w / boards;
        if (a.fence === 'chainlink') {
          ctx.strokeStyle = 'rgba(190,196,198,1)'; ctx.lineWidth = 2;
          for (let x = -h; x < w + h; x += 13) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + h, 0); ctx.lineTo(x, h); ctx.stroke(); }
        } else if (a.fence === 'snowfence') {
          ctx.fillStyle = '#e8722a';
          for (let y = 4; y < h; y += 20) ctx.fillRect(0, y, w, 10);
          for (let x = 0; x < w; x += 22) ctx.fillRect(x, 0, 7, h);
        }
        for (let i = 0; i < boards; i++) {
          const show = a.fence === 'boards' ? true : a.fence === 'chainlink' && (i * 7 + 3) % boards < banners;
          if (!show) continue;
          const missing = a.fence === 'boards' && random() < decay * 0.3;
          const base = missing ? '#b59a72' : BOARD_PAINT[Math.floor(random() * BOARD_PAINT.length)];
          const tint = aged(base, decay * 0.45 + (1 - mood.cheer) * 0.12, '#b7ab98');
          const inset = a.fence === 'boards' ? 3 : 26, top = a.fence === 'boards' ? 0 : 22;
          ctx.fillStyle = css(tint); ctx.fillRect(i * bw + inset, top, bw - inset * 2, h - top * 1.6);
          if (missing) continue;
          const dark = tint.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
          ctx.fillStyle = dark ? '#f6efd8' : ['#1f2a44', '#8a1f1a', '#1e4a2c'][Math.floor(random() * 3)];
          ctx.globalAlpha = mix(1, 0.55, decay);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const [first, second] = order[i].split('|');
          const size = a.fence === 'boards' ? 40 : 28, mid = top + (h - top * 1.6) / 2;
          ctx.font = `bold ${size}px 'Arial Black', Impact, Arial, sans-serif`;
          ctx.fillText(first, (i + 0.5) * bw, mid - size * 0.55, bw - inset * 2 - 16);
          ctx.fillText(second, (i + 0.5) * bw, mid + size * 0.55, bw - inset * 2 - 16);
          ctx.globalAlpha = 1;
          if (a.fence === 'boards') { ctx.strokeStyle = dark ? '#f6efd8' : '#1f2a44'; ctx.lineWidth = 3; ctx.strokeRect(i * bw + 9, 8, bw - 18, h - 16); }
        }
      });
      face.wrapS = THREE.RepeatWrapping;
      face.repeat.x = -1;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(FENCE, FENCE, fenceH, 64, 1, true, Math.PI - ARC, ARC * 2),
        new THREE.MeshStandardMaterial({ map: face, roughness: 0.85, side: THREE.DoubleSide, alphaTest: a.fence === 'boards' ? 0 : 0.5, transparent: false }),
      );
      band.position.y = fenceH / 2 + 0.06;
      band.castShadow = a.fence === 'boards';
      band.receiveShadow = true;
      root.add(band);
    }
    // Leaves and weeds along the fence when the season is over.
    if (over) for (let i = 0; i < 80; i++) { const [x, z] = polar((random() - 0.5) * 1.5, FENCE - 0.3 - random() * random() * 6); set.add(new THREE.OctahedronGeometry(1, 0), ['#b5521c', '#c98a1e', '#7a3a1a', '#d0a23a'][Math.floor(random() * 4)], [x, 0.05, z], [random() * 0.4, random() * 6, 0], [0.16, 0.012, 0.11]); }

    // ----- scoreboard beyond left field -----
    const lampsOn = a.lights !== 'dark';
    if (a.scoreboard !== 'none') {
      const board = new THREE.Group();
      const [x, z] = polar(-0.31, FENCE + 3.2);
      board.position.set(x, 0, z);
      board.rotation.y = Math.atan2(-x, -3 - z);
      const sb = new Batch();
      const postTint = aged('#6f6253', decay * 0.4, '#8d8a82');
      for (const px of [-2.6, 2.6]) sb.box([0.22, 6.2, 0.22], [px, 3.1, -0.1], postTint);
      sb.box([7.0, 3.5, 0.14], [0, 4.45, -0.02], aged('#1f4a33', decay * 0.4, '#77806e'));
      sb.box([7.2, 0.14, 0.3], [0, 6.25, 0], postTint);
      sb.into(board, { roughness: 0.85 });
      const lines = { tied: ['0102000 3', '100020  3'], comeback: ['0021010 4', '110001  3'], blowout: ['3405031 16', '000100  1'], zeros: ['0000000 0', '0000000 0'] }[a.scoreboard];
      const town = TOWNS[Math.floor(random() * TOWNS.length)];
      const faceMap = paint(768, 384, (ctx, w, h) => {
        ctx.fillStyle = css(aged('#1f4a33', decay * 0.4, '#77806e')); ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f2ead6'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
        ctx.font = "bold 46px 'Arial Black', Impact, Arial, sans-serif"; ctx.fillText(`${town} LITTLE LEAGUE`, w / 2, 44, w - 40);
        ctx.font = "bold 26px Arial, sans-serif";
        for (let i = 0; i < 7; i++) ctx.fillText(String(i + 1), 250 + i * 58, 102);
        ctx.fillText('R', 690, 102);
        ['GUEST', 'HOME'].forEach((row, r) => {
          const y = 170 + r * 110;
          ctx.textAlign = 'left'; ctx.fillStyle = '#f2ead6'; ctx.font = "bold 54px 'Arial Black', Impact, Arial, sans-serif"; ctx.fillText(row, 20, y, 190);
          ctx.textAlign = 'center';
          const [innings, runs] = lines[r].split(' ').filter(Boolean).length === 2 ? [lines[r].slice(0, 7), lines[r].slice(7).trim()] : [lines[r], ''];
          for (let i = 0; i < 7; i++) {
            const digit = innings[i] ?? ' ';
            ctx.fillStyle = '#12261b'; ctx.fillRect(224 + i * 58, y - 40, 52, 80);
            if (digit !== ' ') { ctx.fillStyle = '#f6f0d8'; ctx.fillRect(228 + i * 58, y - 36, 44, 72); ctx.fillStyle = '#181818'; ctx.font = "bold 58px Arial, sans-serif"; ctx.fillText(digit, 250 + i * 58, y + 4); }
          }
          ctx.fillStyle = '#f6f0d8'; ctx.fillRect(650, y - 40, 96, 80); ctx.fillStyle = '#a3201a'; ctx.font = "bold 62px Arial, sans-serif"; ctx.fillText(runs, 698, y + 4, 88);
        });
      });
      const faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 3.3), new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.8, emissive: '#ffffff', emissiveMap: faceMap, emissiveIntensity: lampsOn ? 0.35 : 0.08 }));
      faceMesh.position.set(0, 4.45, 0.06);
      board.add(faceMesh);
      root.add(board);
    }

    // ----- light towers -----
    const lampTint = new THREE.Color(a.lights === 'warming' ? '#ffb59c' : '#fff1cf').lerp(new THREE.Color('#dfeaff'), a.lights === 'warming' ? 0 : (1 - mood.warmth) * 0.5);
    const lampPower = { warming: 1.25, blazing: 2.8, patchy: 2.3, dark: 0 }[a.lights];
    const litMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: lampTint, emissiveIntensity: lampPower, roughness: 0.3 });
    const banks: THREE.Vector3[] = [];
    const TOWER_H = 14;
    const towers: [number, number][] = [polar(0.44, FENCE + 2.2), polar(-0.44, FENCE + 2.2)];
    for (const [x, z] of towers) {
      const tower = new THREE.Group();
      tower.position.set(x, 0, z);
      tower.rotation.y = Math.atan2(-x, -9 - z);
      tower.rotation.z = (random() - 0.5) * decay * 0.05;
      const tb = new Batch(), lit = new Batch(), dead = new Batch();
      const pole = aged('#5a4636', decay * 0.3, '#8d8a82'), steel = aged('#8f9698', decay * 0.5, '#7a5a40');
      tb.cyl(0.17, 0.3, TOWER_H, [0, TOWER_H / 2, 0], pole, 9);
      tb.box([0.9, 1.1, 0.7], [0.9, 0.55, -0.2], aged('#55695a', decay * 0.5, '#7a5a40'));
      let burning = 0;
      for (let row = 0; row < 2; row++) {
        const y = TOWER_H - 0.5 - row * 1.5;
        tb.box([6.2, 0.18, 0.18], [0, y, 0.25], steel);
        for (const side of [-1, 1]) tb.rod([side * 2.6, y, 0.25], [0, y - 1.1, 0.1], 0.05, steel, 5);
        for (let i = 0; i < 5; i++) {
          const lx = (i - 2) * 1.25, tilt = 2.05 + (random() - 0.5) * (0.1 + decay * 0.5), yaw = -lx * 0.05;
          const aim = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(tilt, yaw, 0));
          const at: V3 = [lx, y + 0.5, 0.5];
          tb.add(new THREE.CylinderGeometry(0.55, 0.2, 0.55, 12, 1, true), aged('#70777a', decay * 0.4, '#6e4a34'), at, [tilt, yaw, 0]);
          const on = a.lights !== 'dark' && random() > (a.lights === 'patchy' ? 0.5 : decay * 0.18);
          (on ? lit : dead).cyl(0.52, 0.52, 0.05, [at[0] + aim.x * 0.26, at[1] + aim.y * 0.26, at[2] + aim.z * 0.26], on ? lampTint : '#22272b', 14, [tilt, yaw, 0]);
          if (on) burning++;
        }
      }
      tb.into(tower, { roughness: 0.8, side: THREE.DoubleSide });
      const litMesh = lit.into(tower);
      if (litMesh) { (litMesh.material as THREE.Material).dispose(); litMesh.material = litMaterial; }
      dead.into(tower, { roughness: 0.2, metalness: 0.4 });
      if (burning) {
        const centre = new THREE.Vector3(0, TOWER_H - 0.8, 1.0);
        for (const [size, opacity] of [[2.4, 0.2], [4.6, 0.09]]) {
          const halo = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), new THREE.MeshBasicMaterial({ color: lampTint, transparent: true, opacity: opacity * (a.lights === 'warming' ? 0.8 : 1) * mix(0.5, 1, burning / 10), depthWrite: false }));
          halo.scale.set(size * 1.5, size, size);
          halo.position.copy(centre);
          tower.add(halo);
        }
        tower.updateMatrixWorld(true);
        banks.push(centre.clone().applyMatrix4(tower.matrixWorld));
      }
      root.add(tower);
    }

    // ----- flag beyond centre field -----
    let flag: THREE.Mesh | null = null;
    if (!over) {
      const [x, z] = polar(0.16, FENCE + 2.6);
      set.cyl(0.06, 0.09, 10.5, [x, 5.25, z], '#d9dcdc', 8);
      set.ball([0.14, 0.14, 0.14], [x, 10.55, z], '#e6c22e', 8);
      const cloth = paint(256, 144, (ctx, w, h) => {
        for (let i = 0; i < 13; i++) { ctx.fillStyle = i % 2 ? '#f3efe6' : '#b3262c'; ctx.fillRect(0, (i * h) / 13, w, h / 13 + 1); }
        ctx.fillStyle = '#273a78'; ctx.fillRect(0, 0, w * 0.42, (h * 7) / 13);
        ctx.fillStyle = '#f3efe6'; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) ctx.fillRect(8 + c * 17 + (r % 2) * 6, 7 + r * 14, 4, 4);
      });
      const geometry = new THREE.PlaneGeometry(3.0, 1.7, 8, 1);
      geometry.translate(1.5, 0, 0);
      const position = geometry.getAttribute('position');
      const calm = mood.energy < 0.25;
      for (let i = 0; i < position.count; i++) { const px = position.getX(i); position.setZ(i, Math.sin(px * 2.4) * 0.16 * px * 0.5); if (calm) position.setY(i, position.getY(i) - px * px * 0.22); }
      geometry.computeVertexNormals();
      flag = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: cloth, side: THREE.DoubleSide, roughness: 0.9 }));
      flag.position.set(x, a.game === 'rainout' ? 7.2 : 9.5, z);
      flag.rotation.y = 0.3;
      flag.castShadow = true;
      root.add(flag);
    }

    // ----- beyond the fence -----
    const R0 = FENCE + 1.2;
    const farTint = { corn: '#6c7a30', town: '#4f6e3c', elevator: '#b3944a', woods: '#3f5a38', prairie: '#a48f4c' }[a.beyond];
    const far = new THREE.RingGeometry(R0, 420, 48, 1, 0, Math.PI);
    far.rotateX(-Math.PI / 2);
    set.add(far, aged(farTint, decay * 0.2 + (1 - mood.cheer) * 0.1, '#8d8468'), [0, a.beyond === 'corn' ? 0.015 : 0.01, 0]);
    const blobs: { at: V3; scale: V3; color: THREE.Color }[] = [];
    const tree = (x: number, z: number, size: number, conifer = false) => {
      const tint = new THREE.Color().setHSL(mix(0.24, 0.34, random()), mix(0.3, 0.5, mood.cheer), mix(0.12, 0.2, random()));
      if (over && !conifer) tint.setHSL(mix(0.04, 0.13, random()), 0.55, mix(0.2, 0.3, random()));
      if (conifer) set.add(new THREE.ConeGeometry(size * 0.55, size * 2.6, 7), tint, [x, size * 1.5, z]);
      else {
        set.cyl(size * 0.09, size * 0.13, size * 1.2, [x, size * 0.6, z], '#4a3a2c', 5);
        blobs.push({ at: [x, size * 1.75, z], scale: [size * mix(0.9, 1.2, random()), size * mix(0.85, 1.1, random()), size], color: tint });
        blobs.push({ at: [x + size * 0.5, size * 1.4, z + size * 0.2], scale: [size * 0.7, size * 0.6, size * 0.7], color: tint.clone().multiplyScalar(0.9) });
      }
    };
    const waterTower = (x: number, z: number, h: number) => {
      const tank = aged('#cfd6d8', decay * 0.4, '#8f7a66');
      const r = h * 0.2;
      for (let i = 0; i < 6; i++) { const t = (i / 6) * 6.283; set.rod([x + Math.cos(t) * r * 0.95, 0, z + Math.sin(t) * r * 0.95], [x + Math.cos(t) * r * 0.75, h * 0.72, z + Math.sin(t) * r * 0.75], h * 0.011, tank, 5); const u = ((i + 1) / 6) * 6.283; set.rod([x + Math.cos(t) * r * 0.9, h * 0.25, z + Math.sin(t) * r * 0.9], [x + Math.cos(u) * r * 0.82, h * 0.5, z + Math.sin(u) * r * 0.82], h * 0.006, tank, 4); }
      set.cyl(h * 0.03, h * 0.03, h * 0.7, [x, h * 0.35, z], tank, 8);
      set.cyl(r, r, h * 0.16, [x, h * 0.78, z], tank, 20);
      set.ball([r, h * 0.07, r], [x, h * 0.7, z], tank, 20);
      set.add(new THREE.ConeGeometry(r * 1.04, h * 0.1, 20), aged('#9aa4a6', decay * 0.4, '#8f7a66'), [x, h * 0.91, z]);
      set.cyl(r * 1.06, r * 1.06, h * 0.012, [x, h * 0.7, z], '#7d8587', 20);
      const name = TOWNS[Math.floor(random() * TOWNS.length)];
      const label = paint(1024, 96, (ctx, w, hh) => {
        ctx.fillStyle = css(tank); ctx.fillRect(0, 0, w, hh);
        ctx.fillStyle = '#23324f'; ctx.globalAlpha = mix(1, 0.5, decay); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = "bold 70px 'Arial Black', Impact, Arial, sans-serif"; ctx.fillText(name, w / 2, hh / 2 + 4, w * 0.3);
      });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * 0.1, 28, 1, true), new THREE.MeshStandardMaterial({ map: label, roughness: 0.8 }));
      band.position.set(x, h * 0.79, z);
      band.rotation.y = Math.PI + Math.atan2(-x, 12 - z);
      root.add(band);
    };
    const barn = (x: number, z: number, s: number) => {
      const red = aged('#9a3327', decay * 0.4, '#8d8a82');
      set.box([8 * s, 5 * s, 6 * s], [x, 2.5 * s, z], red);
      const roof = new THREE.CylinderGeometry(0.01, 4.6 * s, 3 * s, 4, 1);
      roof.rotateY(Math.PI / 4);
      set.add(roof, '#5c5550', [x, 6.5 * s, z], [0, 0, 0], [1.25, 1, 0.95]);
      set.cyl(1.6 * s, 1.6 * s, 9 * s, [x + 6.5 * s, 4.5 * s, z], '#c9cbc6', 10);
      set.ball([1.6 * s, 1.2 * s, 1.6 * s], [x + 6.5 * s, 9 * s, z], '#aeb3b0', 10);
    };
    let corn: THREE.InstancedMesh | null = null;
    if (a.beyond === 'corn') {
      const stalks: { x: number; z: number; s: number; c: THREE.Color }[] = [];
      const gold = Math.min(1, mood.warmth * 0.5 + decay * 0.6);
      for (let row = 0; row < 15; row++) {
        const r = R0 + 0.4 + row * 1.15, count = Math.floor((ARC * 2.1 * r) / 0.85);
        for (let i = 0; i < count; i++) {
          const [x, z] = polar(mix(-ARC * 1.05, ARC * 1.05, (i + random() * 0.5) / count), r + (random() - 0.5) * 0.3);
          stalks.push({ x, z, s: mix(0.85, 1.15, random()), c: new THREE.Color().setHSL(mix(0.25, 0.13, gold * mix(0.6, 1, random())), mix(0.45, 0.6, mood.cheer), mix(0.2, 0.3, random())) });
        }
      }
      const stalk = new THREE.ConeGeometry(0.42, 2.7, 5);
      stalk.translate(0, 1.35, 0);
      corn = new THREE.InstancedMesh(stalk, new THREE.MeshStandardMaterial({ roughness: 0.95 }), stalks.length);
      const m4 = new THREE.Matrix4();
      stalks.forEach((p, i) => { m4.makeScale(p.s, p.s, p.s).setPosition(p.x, 0, p.z); corn!.setMatrixAt(i, m4); corn!.setColorAt(i, p.c); });
      corn.castShadow = false; corn.receiveShadow = true;
      root.add(corn);
      // The rest of the crop as one raised top, so it runs to the horizon.
      const sea = new THREE.RingGeometry(R0 + 16, 400, 48, 1, 0, Math.PI);
      sea.rotateX(-Math.PI / 2);
      set.add(sea, new THREE.Color().setHSL(mix(0.24, 0.14, gold), 0.48, 0.26), [0, 2.4, 0]);
      barn(-26, -150, 2.2);
      for (let i = 0; i < 7; i++) tree(-52 + i * 4 + random() * 3, -150 + random() * 6, 5 + random() * 3);
      if (random() < 0.5) waterTower(34, -170, 34);
    } else if (a.beyond === 'town') {
      waterTower(13, -74, 25);
      for (let i = 0; i < 9; i++) {
        const [x, z] = polar(mix(-0.75, 0.75, (i + random() * 0.6) / 9), R0 + 9 + random() * 14);
        const w = 6 + random() * 3, d = 5 + random() * 2, h = 3 + random() * 1.4, turn = Math.atan2(-x, -z) + (random() - 0.5) * 0.4;
        const wall = aged(['#e6e0d0', '#c9d3d6', '#e3d2a8', '#d8c2b8', '#b9c7b0'][Math.floor(random() * 5)], decay * 0.4, '#8d8a82');
        set.box([w, h, d], [x, h / 2, z], wall, [0, turn, 0]);
        const roof = new THREE.CylinderGeometry(0.01, 0.7071, 1, 4, 1);
        roof.rotateY(Math.PI / 4);
        set.add(roof, aged('#5d5560', decay * 0.3, '#7a7468'), [x, h + 1.1, z], [0, turn, 0], [w * 1.12, 2.2, d * 1.15]);
        const lit = Math.floor(mix(0.3, 2.9, random() * mix(0.4, 1, mood.cheer)));
        for (let k = 0; k < lit; k++) glowBits.box([0.9, 1.0, 0.1], [x + Math.cos(turn) * (k - 0.5) * 2.2 + Math.sin(turn) * (d / 2 + 0.05), h * 0.55, z - Math.sin(turn) * (k - 0.5) * 2.2 + Math.cos(turn) * (d / 2 + 0.05)], '#ffd98a', [0, turn, 0]);
      }
      set.box([5, 7, 9], [-22, 3.5, -62], '#ece8dc', [0, 0.3, 0]);
      set.box([2.4, 13, 2.4], [-20.6, 6.5, -58], '#ece8dc', [0, 0.3, 0]);
      set.add(new THREE.ConeGeometry(2.1, 7, 4), '#5d5560', [-20.6, 16.5, -58], [0, 0.3 + Math.PI / 4, 0]);
      for (let i = 0; i < 70; i++) { const [x, z] = polar((random() - 0.5) * 1.9, R0 + 4 + random() * random() * 50); tree(x, z, 1.7 + random() * 1.7); }
    } else if (a.beyond === 'elevator') {
      const concrete = aged('#e2dfd4', decay * 0.4, '#9a9488');
      const ex = -34, ez = -140;
      for (let i = 0; i < 5; i++) set.cyl(4.2, 4.2, 26, [ex + i * 7.6, 13, ez], concrete, 14);
      set.box([36, 5, 7], [ex + 15.2, 28.5, ez], concrete);
      set.box([7, 13, 7.4], [ex - 0.5, 32, ez], concrete);
      set.box([4, 8, 5], [ex - 8, 4, ez + 2], aged('#b9b4a6', decay * 0.4, '#9a9488'));
      for (let i = 0; i < 4; i++) set.box([12, 3.6, 3], [ex + 30 + i * 13.5, 2.6, ez + 9], aged(['#7a3a2c', '#4a5a6a', '#8a6a2c'][i % 3], decay * 0.4, '#8d8a82'));
      set.box([160, 0.5, 2.4], [0, 0.3, ez + 9], '#6c6660');
      for (let i = 0; i < 12; i++) { const [x, z] = polar((random() - 0.5) * 1.8, R0 + 14 + random() * 40); tree(x, z, 2 + random() * 2); }
      for (let i = 0; i < 40; i++) { const [x, z] = polar((random() - 0.5) * 1.7, R0 + 2 + random() * 40); set.cyl(0.8, 0.8, 0.9, [x, 0.45, z], '#d2b867', 8, [Math.PI / 2, random() * 3, 0]); }
    } else if (a.beyond === 'woods') {
      for (let i = 0; i < 170; i++) { const [x, z] = polar((random() - 0.5) * 2.0, R0 + 3 + random() * 56); tree(x, z, 2 + random() * 2.2, random() < 0.55); }
      for (const [x, z, w, h] of [[-70, -230, 110, 34], [40, -250, 150, 46], [130, -220, 90, 28], [-160, -240, 100, 30]]) set.ball([w, h, 40], [x, 0, z], new THREE.Color('#566f8a').lerp(tones[1], 0.35), 14);
    } else {
      for (let i = 0; i < 9; i++) {
        const x = -34 + i * 15, z = -46 - i * 17;
        set.cyl(0.14, 0.2, 9, [x, 4.5, z], '#5a4636', 6);
        set.box([2.6, 0.16, 0.16], [x, 8.2, z], '#5a4636', [0, 0.72, 0]);
        if (i < 8) for (const off of [-1.1, 1.1]) { const dx = Math.cos(0.72) * off, dz = -Math.sin(0.72) * off; set.rod([x + dx, 8.3, z + dz], [x + 7.5 + dx, 7.5, z - 8.5 + dz], 0.025, '#33302c', 3); set.rod([x + 7.5 + dx, 7.5, z - 8.5 + dz], [x + 15 + dx, 8.3, z - 17 + dz], 0.025, '#33302c', 3); }
      }
      barn(46, -190, 2.4);
      tree(-28, -70, 6);
      for (let i = 0; i < 60; i++) { const [x, z] = polar((random() - 0.5) * 1.8, R0 + 1 + random() * 30); set.add(new THREE.ConeGeometry(0.35, 1.1, 4), new THREE.Color().setHSL(0.14, 0.4, 0.36 + random() * 0.1), [x, 0.55, z]); }
    }
    if (blobs.length) {
      const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), blobs.length);
      const m4 = new THREE.Matrix4();
      blobs.forEach((blob, i) => { m4.makeScale(...blob.scale).setPosition(...blob.at); crowns.setMatrixAt(i, m4); crowns.setColorAt(i, blob.color); });
      crowns.castShadow = false;
      root.add(crowns);
    }

    // Weeds in the dirt as the place is let go.
    const weeds = Math.round((over ? 150 : 0) + decay * 60 + (a.infield === 'sandlot' ? 50 : 0));
    if (weeds) {
      const blade = new THREE.ConeGeometry(0.07, 0.5, 4);
      blade.translate(0, 0.25, 0);
      const patchOfWeeds = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.95 }), weeds);
      const m4 = new THREE.Matrix4();
      for (let i = 0; i < weeds; i++) {
        let [x, z] = polar((random() - 0.5) * 1.5, 1.5 + random() * 15);
        for (const [sx, sz, , sr] of SLOTS) if (Math.hypot(x - sx, z - sz) < sr * 0.7) { x += sr * 1.4 * (x < sx ? -1 : 1); z -= 0.8; }
        const size = 0.5 + random() * (over ? 1.6 : 0.9);
        m4.makeScale(size, size, size).setPosition(x, 0.01, z);
        patchOfWeeds.setMatrixAt(i, m4);
        patchOfWeeds.setColorAt(i, new THREE.Color().setHSL(mix(0.17, 0.3, random()), 0.42, mix(0.26, 0.4, random())));
      }
      patchOfWeeds.castShadow = true;
      root.add(patchOfWeeds);
    }

    set.into(root, { roughness: 0.9, side: THREE.DoubleSide });
    glowBits.into(root, { emissive: '#ffcf7a', emissiveIntensity: 1.6 });

    // ----- moths round the lamps and fireflies over the grass -----
    const dummy = new THREE.Object3D();
    const mothCount = banks.length ? Math.round(mix(30, 150, mood.density) * (banks.length / 2)) : 0;
    const orbits: { centre: THREE.Vector3; radius: number; speed: number; phase: number; tilt: number; size: number }[] = [];
    let moths: THREE.InstancedMesh | null = null;
    if (mothCount) {
      const wing = new THREE.OctahedronGeometry(1, 0);
      wing.scale(1, 0.4, 0.7);
      moths = new THREE.InstancedMesh(wing, new THREE.MeshStandardMaterial({ color: '#f4ead2', emissive: lampTint, emissiveIntensity: 0.5, roughness: 0.9 }), mothCount);
      for (let i = 0; i < mothCount; i++) orbits.push({ centre: banks[i % banks.length], radius: 0.8 + random() * random() * 4.5, speed: (random() < 0.5 ? -1 : 1) * (0.8 + random() * 2.4), phase: random() * 6.283, tilt: (random() - 0.5) * 2.6, size: 0.1 + random() * 0.1 });
      root.add(moths);
    }
    const flyCount = over || a.game === 'rainout' ? 0 : Math.round(mix(8, 46, mood.density) * mix(0.4, 1.2, mood.warmth));
    const flies: { home: THREE.Vector3; phase: number; rate: number }[] = [];
    let fireflies: THREE.InstancedMesh | null = null;
    if (flyCount) {
      fireflies = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: '#e9ff8a' }), flyCount);
      for (let i = 0; i < flyCount; i++) { const [x, z] = polar((random() - 0.5) * 1.2, 9 + random() * 20); flies.push({ home: new THREE.Vector3(x, 0.5 + random() * 2.4, z), phase: random() * 6.283, rate: 0.5 + random() }); }
      root.add(fireflies);
    }
    const animate = (time: number) => {
      if (moths) {
        orbits.forEach((orbit, i) => {
          const angle = orbit.phase + time * orbit.speed;
          dummy.position.set(Math.cos(angle) * orbit.radius, Math.sin(angle) * orbit.radius * Math.sin(orbit.tilt) * 0.6 + Math.sin(time * 1.9 + orbit.phase) * 0.3, Math.sin(angle) * orbit.radius * Math.cos(orbit.tilt)).add(orbit.centre);
          dummy.rotation.set(angle * 3, angle, time * 8 + orbit.phase);
          dummy.scale.setScalar(orbit.size);
          dummy.updateMatrix();
          moths!.setMatrixAt(i, dummy.matrix);
        });
        moths.instanceMatrix.needsUpdate = true;
      }
      if (fireflies) {
        flies.forEach((fly, i) => {
          const blink = Math.max(0, Math.sin(time * fly.rate * 1.6 + fly.phase));
          dummy.position.set(fly.home.x + Math.sin(time * 0.4 * fly.rate + fly.phase) * 1.2, fly.home.y + Math.sin(time * 0.7 + fly.phase * 2) * 0.4, fly.home.z + Math.cos(time * 0.3 * fly.rate + fly.phase) * 1.2);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(0.035 + blink * 0.075);
          dummy.updateMatrix();
          fireflies!.setMatrixAt(i, dummy.matrix);
        });
        fireflies.instanceMatrix.needsUpdate = true;
      }
    };
    animate(random() * 30);

    // ----- light: a low dusk sun from one side, sky fill, and the towers' wash from above -----
    const hemi = new THREE.HemisphereLight(tones[1].clone().lerp(new THREE.Color('#ffffff'), 0.45), new THREE.Color('#6f6a5c'), a.sky === 'gold' ? 1.2 : 1.0);
    const key = new THREE.DirectionalLight(tones[3].clone().lerp(new THREE.Color('#ffffff'), 0.35), a.sky === 'gold' ? 2.3 : a.sky === 'storm' || a.sky === 'haze' ? 1.35 : 1.75);
    const noon = 1 - Math.abs(mood.daylight - 0.5) * 2;
    key.position.set(mix(-30, 24, mood.daylight), mix(11, 20, noon), 15);
    key.target.position.set(0, 0, -5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    const wash = new THREE.DirectionalLight(lampTint, { warming: 0.3, blazing: 0.6, patchy: 0.4, dark: 0 }[a.lights]);
    wash.position.set(0, 30, -24);
    wash.target.position.set(0, 0, -4);
    root.add(hemi, key, key.target, wash, wash.target);

    // ----- camera: up in the stand behind home plate -----
    const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 600);
    camera.position.set((random() - 0.5) * 0.6, 4.4, 12);
    const aim = new THREE.Vector3(0, 1.8, -12);
    camera.lookAt(aim);

    const tempo = mix(0.25, 1.5, mood.energy);
    const sway = mix(0.03, 0.3, mood.energy);
    const flicker = a.lights === 'warming' || a.lights === 'patchy';
    const world: World = {
      object: root, camera, background, capacity: SLOTS.length, ground, keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const [x, z, maxHeight, maxRadius, minHeight] = SLOTS[i % SLOTS.length];
          const height = Math.max(item.height, 0.05), radius = Math.max(item.radius, 0.05);
          let scale = Math.min(1, maxHeight / height, maxRadius / radius);
          if (height * scale < minHeight) scale = Math.min(maxRadius / radius, minHeight / height);
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, 0.02, z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.8 + (context.random() - 0.5) * 0.5;
          item.holder.updateMatrixWorld(true);
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -20; shadow.right = 20; shadow.bottom = -20; shadow.top = 20;
        shadow.near = 1; shadow.far = 110;
        shadow.updateProjectionMatrix();
      },
      update(_dt, time) {
        animate(time * tempo);
        if (flag) flag.rotation.y = 0.3 + Math.sin(time * 1.3) * sway + Math.sin(time * 3.1) * sway * 0.3;
        if (flicker) litMaterial.emissiveIntensity = lampPower * (1 + Math.sin(time * 17) * 0.04 + (Math.sin(time * 2.3) > 0.96 ? -0.3 : 0));
      },
      dispose() { key.shadow.map?.dispose(); litMaterial.dispose(); disposeTree(root); },
    };
    return world;
  },
});
