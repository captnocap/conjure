import * as THREE from 'three';
import { Sculpture, choice, defineWorld, diorama, mix, type Placeable } from '@conjure/kit';

type G = CanvasRenderingContext2D;
type P3 = [number, number, number];
function canvasOf(w: number, h: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  return canvas;
}
function textureOf(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

const W = 14, D = 10, TH = 5.2;
const HERO: [number, number] = [0.8, 0.9];
const CHECK = { red: '#c8322c', blue: '#2f5fa8', green: '#3f8a4f', yellow: '#e0a81c', black: '#2c2c30' } as const;

export default defineWorld({
  questions: {
    cloth: choice('How is the table covered?', {
      full: 'A gingham cloth over the whole table, hanging at the edges.',
      runner: 'A gingham runner down the middle, bare scrubbed pine either side.',
      half: 'The cloth folded back off one end, as if someone needed the bare wood to work on.',
      bare: 'Bare scrubbed pine; the gingham is only a folded tea towel.',
    }),
    check: choice('What colour is the gingham?', {
      red: 'Red and white, the picnic classic.',
      blue: 'Blue and white, cool and clean.',
      green: 'Green and white, like a dairy.',
      yellow: 'Yellow and white, sunny.',
      black: 'Black and white, a little severe.',
    }),
    window: choice('What kind of window is the light coming through?', {
      sash: 'A tall sash window with four big panes.',
      cottage: 'A small-paned cottage casement.',
      picture: 'One wide modern pane.',
    }),
    curtain: choice('What hangs at the window?', {
      none: 'Nothing; bare glass.',
      cafe: 'A gingham half-curtain on a brass rod across the lower panes.',
      lace: 'White lace nets.',
      drawn: 'Flowered curtains drawn back to each side.',
    }),
    outside: choice('What is outside the window?', {
      garden: 'A garden: hedge, an apple tree and washing on the line.',
      fields: 'Fields and low hills in mist.',
      rain: 'Rain, grey and steady.',
      snow: 'Snow on everything and a bare tree.',
      sea: 'The sea and a headland.',
      yard: 'A brick back yard and the neighbours’ chimneys.',
    }),
    chair: choice('What chair stands at the table?', {
      spindle: 'A plain spindle-back kitchen chair.',
      ladder: 'A ladder-back with a rush seat.',
      bentwood: 'A café bentwood chair with a hooped back.',
      painted: 'A spindle-back painted in old chipped colour.',
      stool: 'A three-legged stool.',
    }),
    moment: choice('How was the chair left?', {
      pushed: 'Pushed straight back: they got up calmly.',
      turned: 'Turned half aside, as if they stood up in a hurry.',
      tucked: 'Tucked neatly under the table: nobody has sat down yet, or everything is over.',
      fallen: 'Knocked over backwards on the floor.',
    }),
    left: choice('What was left on the chair?', {
      nothing: 'Nothing.',
      cardigan: 'A cardigan over the back.',
      cat: 'A cat asleep on the warm seat.',
      satchel: 'A school satchel.',
      apron: 'An apron hung by its strings.',
    }),
    setting: choice('What is at the place where they were sitting?', {
      laid: 'A clean plate, knife and folded napkin: laid and untouched.',
      eaten: 'A plate of crumbs, a knife askew, a crumpled napkin and a mug.',
      cleared: 'Cleared away; only crumbs and a ring from a cup.',
      note: 'A note weighted under a mug.',
    }),
    sill: choice('What is on the windowsill?', {
      geranium: 'A red geranium in a clay pot.',
      jug: 'A jug of wild flowers.',
      radio: 'An old wireless radio.',
      eggs: 'A bowl of eggs.',
      nothing: 'Nothing.',
    }),
    floor: choice('What is the kitchen floor?', {
      quarry: 'Red quarry tiles.',
      flags: 'Grey stone flags.',
      lino: 'Checked linoleum.',
      boards: 'Bare floorboards.',
    }),
    walls: choice('What are the walls like?', {
      cream: 'Cream limewashed plaster.',
      yellow: 'Buttercup yellow distemper.',
      boards: 'Painted tongue-and-groove boards in sage green.',
      paper: 'Faded sprigged wallpaper.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const wobble = (amount: number) => (random() - 0.5) * 2 * amount;
    const tableTone = new THREE.Color('#d9b98a').lerp(new THREE.Color('#b8a184'), mood.wear * 0.6);
    const { art: s, world } = diorama(context, {
      background: '#e9e5d8', floor: `#${tableTone.getHexString()}`, width: W, depth: D, maxHeight: 4.4, radius: 1.95, pitch: 33, yaw: 24,
      slots: [HERO, [-3.4, -2.3], [4.5, -1.8], [4.7, 2.7], [-5.1, 1.0]],
    });
    const key = world.keyLight!;
    for (const child of s.root.children) {
      if ((child as THREE.HemisphereLight).isHemisphereLight) (child as THREE.HemisphereLight).intensity = 1.6;
      else if ((child as THREE.DirectionalLight).isDirectionalLight && child !== key) {
        // The fill comes from the viewer's side of the room so backlit things keep their faces.
        (child as THREE.DirectionalLight).intensity = 0.8;
        child.position.set(5, 5, 10);
      }
    }
    key.intensity = 3.8;
    // The stage's environment map lights standard, Lambert and Phong materials evenly from all sides,
    // which washes out the sun patch. The big surfaces of the set use a toon material with a smooth
    // ramp instead: it shades like plain matte paint and takes only this world's own lights.
    const rampData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) rampData[i] = Math.max(0, Math.round((i / 255 * 2 - 1) * 255));
    const ramp = new THREE.DataTexture(rampData, 256, 1, THREE.RedFormat);
    ramp.minFilter = ramp.magFilter = THREE.LinearFilter;
    ramp.needsUpdate = true;
    const matte = (map: THREE.Texture, side: THREE.Side = THREE.FrontSide) => new THREE.MeshToonMaterial({ map, gradientMap: ramp, side });
    key.shadow.mapSize.set(2048, 2048);
    const check = CHECK[a.check];

    // ---- Table -------------------------------------------------------------------------------
    const pineCanvas = canvasOf(1024, 730, (g, w, h) => {
      g.fillStyle = `#${tableTone.getHexString()}`;
      g.fillRect(0, 0, w, h);
      const boards = 7, bh = h / boards;
      for (let b = 0; b < boards; b++) {
        g.fillStyle = `rgba(${random() > 0.5 ? '255,240,200' : '120,80,30'},${0.04 + random() * 0.07})`;
        g.fillRect(0, b * bh, w, bh);
        for (let i = 0; i < 26; i++) {
          g.strokeStyle = `rgba(120,80,35,${0.06 + random() * 0.12})`;
          g.lineWidth = 1 + random() * 1.5;
          const y = b * bh + random() * bh;
          g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + wobble(9), w * 0.7, y + wobble(9), w, y + wobble(5)); g.stroke();
        }
        if (random() > 0.4) { const kx = random() * w, ky = b * bh + bh * (0.3 + random() * 0.4); g.fillStyle = 'rgba(100,60,25,0.5)'; g.beginPath(); g.ellipse(kx, ky, 12, 7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = 'rgba(100,60,25,0.3)'; g.lineWidth = 2; g.beginPath(); g.ellipse(kx, ky, 26, 13, 0, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = 'rgba(70,45,20,0.55)';
        g.fillRect(0, b * bh - 1.5, w, 3);
      }
      // Years of use: pale scrubbed patches, rings and scorch marks.
      for (let i = 0; i < Math.round(mood.wear * 14); i++) {
        const x = random() * w, y = random() * h;
        if (random() > 0.5) { g.strokeStyle = 'rgba(90,60,30,0.25)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 24 + random() * 10, 0, Math.PI * 2); g.stroke(); }
        else { g.fillStyle = 'rgba(245,235,215,0.25)'; g.beginPath(); g.ellipse(x, y, 60 + random() * 80, 30 + random() * 40, random() * 3, 0, Math.PI * 2); g.fill(); }
      }
    });
    const pine = matte(textureOf(pineCanvas));
    const top = s.mesh(new THREE.PlaneGeometry(W, D), pine, [0, 0.006, 0]);
    top.rotation.x = -Math.PI / 2;
    top.castShadow = false;
    const wood = s.material(`#${tableTone.clone().multiplyScalar(0.9).getHexString()}`, { roughness: 0.8 });
    const woodDark = s.material(`#${tableTone.clone().multiplyScalar(0.72).getHexString()}`, { roughness: 0.8 });
    s.box([W - 1.2, 1.0, 0.25], [0, -0.74, D / 2 - 0.7], wood);
    s.box([W - 1.2, 1.0, 0.25], [0, -0.74, -D / 2 + 0.7], wood);
    for (const side of [-1, 1]) s.box([0.25, 1.0, D - 1.4], [side * (W / 2 - 0.7), -0.74, 0], wood);
    // A cutlery drawer in the front apron.
    s.box([3.6, 0.72, 0.08], [2.2, -0.74, D / 2 - 0.55], woodDark);
    s.ball([0.17, 0.17, 0.13], [2.2, -0.74, D / 2 - 0.42], s.material('#f2efe6', { roughness: 0.3 }), 12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = s.lathe([[0.36, 0], [0.4, -0.9], [0.3, -1.25], [0.44, -1.5], [0.42, -3.6], [0.3, -4.0], [0.36, -4.25], [0.24, -TH + 0.24], [0.3, -TH + 0.1], [0.24, -TH]].map(([r, y]) => [r, y + 0.0] as const).reverse(), wood, [sx * (W / 2 - 0.75), -0.24, sz * (D / 2 - 0.75)]);
      leg.position.y = 0;
    }

    // ---- Cloth -------------------------------------------------------------------------------
    const ginghamCanvas = canvasOf(64, 64, (g) => {
      g.fillStyle = '#f7f3e8'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = check; g.globalAlpha = 0.5;
      g.fillRect(0, 0, 32, 64); g.fillRect(0, 0, 64, 32);
    });
    const gingham = (u: number, v: number) => matte(textureOf(ginghamCanvas, u / 0.9, v / 0.9), THREE.DoubleSide);
    const skirt = (length: number, drop: number, at: P3, turn: number) => {
      const geometry = new THREE.PlaneGeometry(length, drop, Math.max(8, Math.round(length * 4)), 4);
      const position = geometry.getAttribute('position');
      const phase = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const down = 0.5 - position.getY(i) / drop;
        position.setZ(i, Math.sin(position.getX(i) * 2.3 + phase) * 0.16 * down + 0.02);
        position.setY(i, position.getY(i) + (down > 0.99 ? Math.sin(position.getX(i) * 1.1 + phase) * 0.08 : 0));
      }
      geometry.computeVertexNormals();
      const mesh = s.mesh(geometry, gingham(length, drop), [at[0], at[1] - drop / 2, at[2]]);
      mesh.rotation.y = turn;
      return mesh;
    };
    const sheet = (x0: number, x1: number, y = 0.02) => s.box([x1 - x0, 0.03, D + 0.16], [(x0 + x1) / 2, y, 0], gingham(x1 - x0, D));
    if (a.cloth === 'full') {
      sheet(-W / 2 - 0.08, W / 2 + 0.08);
      skirt(W + 0.16, 1.5, [0, 0.03, D / 2 + 0.09], 0);
      skirt(D + 0.16, 1.5, [W / 2 + 0.09, 0.03, 0], Math.PI / 2);
      skirt(D + 0.16, 1.5, [-W / 2 - 0.09, 0.03, 0], -Math.PI / 2);
    } else if (a.cloth === 'runner') {
      sheet(HERO[0] - 2.7, HERO[0] + 2.7);
      skirt(5.4, 1.9, [HERO[0], 0.03, D / 2 + 0.09], 0);
    } else if (a.cloth === 'half') {
      sheet(-2.2, W / 2 + 0.08);
      skirt(W / 2 + 2.28, 1.5, [(W / 2 + 0.08 - 2.2) / 2, 0.03, D / 2 + 0.09], 0);
      skirt(D + 0.16, 1.5, [W / 2 + 0.09, 0.03, 0], Math.PI / 2);
      // The folded-back layer and the soft roll of the fold.
      s.box([2.6, 0.04, D + 0.1], [-0.9, 0.065, 0], s.material('#f1ece0', { roughness: 1 }));
      const roll = s.cylinder(0.14, 0.14, D + 0.14, [-2.2, 0.09, 0], gingham(0.9, D), 12);
      roll.rotation.x = Math.PI / 2;
    } else {
      const towel = s.box([2.3, 0.14, 1.5], [5.4, 0.07, -4.0], gingham(2.3, 1.5));
      towel.rotation.y = 0.2 + wobble(0.2);
    }

    // ---- Room: floor, wall and window --------------------------------------------------------
    const floorCanvas = canvasOf(512, 512, (g, w, h) => {
      const n = a.floor === 'boards' ? 1 : a.floor === 'flags' ? 4 : 8;
      if (a.floor === 'boards') {
        g.fillStyle = '#9a7650'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(60,35,10,${0.05 + random() * 0.12})`; g.fillRect(i * (w / 9), 0, w / 9, h); g.fillStyle = 'rgba(40,25,10,0.6)'; g.fillRect(i * (w / 9), 0, 3, h); }
        return;
      }
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++) {
          const tone = a.floor === 'quarry' ? [168 + wobble(16), 84 + wobble(12), 60 + wobble(10)] : a.floor === 'flags' ? ((v: number) => [150 + v, 148 + v, 140 + v])(wobble(20)) : (r + c) % 2 ? [226, 220, 204] : mood.cheer > 0.5 ? [86, 130, 110] : [70, 74, 78];
          g.fillStyle = `rgb(${tone.map(Math.round).join(',')})`;
          g.fillRect(c * (w / n), r * (h / n), w / n, h / n);
        }
      if (a.floor !== 'lino') { g.strokeStyle = a.floor === 'quarry' ? '#5a4a40' : '#77756c'; g.lineWidth = 4; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * (w / n), 0); g.lineTo(i * (w / n), h); g.moveTo(0, i * (h / n)); g.lineTo(w, i * (h / n)); g.stroke(); } }
    });
    const FX0 = -7.9, FX1 = 7.9, FZ0 = -5.7, FZ1 = 9.6;
    const floorSkin = matte(textureOf(floorCanvas, a.floor === 'flags' ? 1.6 : 2, a.floor === 'flags' ? 1.6 : 2));
    s.mesh(new THREE.BoxGeometry(FX1 - FX0, 0.3, FZ1 - FZ0), floorSkin, [(FX0 + FX1) / 2, -TH - 0.15, (FZ0 + FZ1) / 2]);

    const WZ = -5.52, WTOP = 7.5, wx = -0.3, halfW = a.window === 'cottage' ? 3.0 : 3.7, Y0 = 1.3, Y1 = a.window === 'cottage' ? 5.7 : 6.6;
    const wallTint = { cream: '#efe6cf', yellow: '#f0d67a', boards: '#a9bfa0', paper: '#eadfc8' }[a.walls];
    const wallCanvas = canvasOf(256, 256, (g, w, h) => {
      g.fillStyle = wallTint; g.fillRect(0, 0, w, h);
      if (a.walls === 'boards') { g.fillStyle = 'rgba(40,60,40,0.35)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32, 0, 2.5, h); }
      else if (a.walls === 'paper') {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const x = c * 64 + (r % 2) * 32 + 16, y = r * 64 + 30;
          g.fillStyle = '#6f8f5a'; g.fillRect(x - 1, y, 2.5, 20);
          g.fillStyle = mood.cheer > 0.5 ? '#d9768a' : '#8a7fa8';
          for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 6, y + Math.sin(p * 1.26) * 6, 4.5, 0, Math.PI * 2); g.fill(); }
        }
      } else for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,255,255,${random() * 0.12})`; g.beginPath(); g.ellipse(random() * w, random() * h, 30 + random() * 40, 10 + random() * 20, random() * 3, 0, Math.PI * 2); g.fill(); }
      if (mood.wear > 0.4) for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(110,90,60,${random() * 0.12 * mood.wear})`; g.beginPath(); g.ellipse(random() * w, random() * h, 40, 60, 0, 0, Math.PI * 2); g.fill(); }
    });
    const wallBox = (x0: number, x1: number, y0: number, y1: number) =>
      s.mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.3), matte(textureOf(wallCanvas, (x1 - x0) / 3.2, (y1 - y0) / 3.2)), [(x0 + x1) / 2, (y0 + y1) / 2, WZ]);
    wallBox(FX0, wx - halfW, -TH, WTOP);
    wallBox(wx + halfW, FX1, -TH, WTOP);
    wallBox(wx - halfW, wx + halfW, -TH, Y0);
    wallBox(wx - halfW, wx + halfW, Y1, WTOP);
    const paintTint = a.walls === 'boards' ? '#f3efe2' : mood.cheer > 0.6 ? '#f6f3ea' : '#e6e2d4';
    const trim = s.material(paintTint, { roughness: 0.5 });
    const zf = WZ + 0.17;
    // Casing, sill and glazing bars. The bars are real, so they throw real shadows across the table.
    s.box([halfW * 2 + 0.7, 0.35, 0.16], [wx, Y1 + 0.17, zf], trim);
    for (const side of [-1, 1]) s.box([0.35, Y1 - Y0 + 0.2, 0.16], [wx + side * (halfW + 0.17), (Y0 + Y1) / 2, zf], trim);
    s.box([halfW * 2 + 1.1, 0.2, 1.3], [wx, Y0 - 0.1, WZ + 0.6], trim);
    const bar = 0.2;
    const cols = a.window === 'cottage' ? 4 : a.window === 'sash' ? 2 : 1, rows = a.window === 'cottage' ? 3 : a.window === 'sash' ? 2 : 1;
    for (let c = 1; c < cols; c++) s.box([bar, Y1 - Y0, 0.14], [wx - halfW + (c / cols) * halfW * 2, (Y0 + Y1) / 2, WZ], trim);
    for (let r = 1; r < rows; r++) s.box([halfW * 2, a.window === 'sash' ? bar * 1.7 : bar, 0.16], [wx, Y0 + (r / rows) * (Y1 - Y0), WZ], trim);
    for (const y of [Y0 + 0.09, Y1 - 0.09]) s.box([halfW * 2, 0.18, 0.14], [wx, y, WZ], trim);
    for (const side of [-1, 1]) s.box([0.18, Y1 - Y0, 0.14], [wx + side * (halfW - 0.09), (Y0 + Y1) / 2, WZ], trim);
    const pane = s.mesh(new THREE.PlaneGeometry(halfW * 2, Y1 - Y0), new THREE.MeshStandardMaterial({ color: '#eaf4f6', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false }), [wx, (Y0 + Y1) / 2, WZ - 0.02]);
    pane.castShadow = pane.receiveShadow = false;

    // What the window looks out on.
    const sky = new THREE.Color().setHSL(mix(0.03, 0.57, Math.sin(mood.daylight * Math.PI)), 0.55, mix(0.78, 0.84, Math.sin(mood.daylight * Math.PI)));
    const viewCanvas = canvasOf(512, 384, (g, w, h) => {
      const grey = a.outside === 'rain' || a.outside === 'snow';
      const upper = grey ? (a.outside === 'rain' ? '#aab2b8' : '#dfe3e6') : `#${sky.getHexString()}`;
      const glow = g.createLinearGradient(0, 0, 0, h);
      glow.addColorStop(0, upper);
      glow.addColorStop(0.7, grey ? upper : '#fff3dc');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);
      const hill = (y: number, amp: number, tint: string, freq: number) => {
        g.fillStyle = tint; g.beginPath(); g.moveTo(0, h);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * freq + y) * amp + Math.sin(x * freq * 2.7) * amp * 0.4);
        g.lineTo(w, h); g.fill();
      };
      const tree = (x: number, y: number, leaf: string | null) => {
        g.strokeStyle = '#5a4634'; g.lineWidth = 9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y - 80); g.stroke();
        g.lineWidth = 4;
        for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(x + 3, y - 50 - i * 5); g.lineTo(x + Math.cos(i * 0.9 + 0.4) * 60, y - 100 - Math.abs(Math.sin(i * 1.3)) * 50); g.stroke(); }
        if (leaf) for (let i = 0; i < 16; i++) { g.fillStyle = leaf; g.beginPath(); g.arc(x + wobble(60), y - 115 + wobble(40), 24 + random() * 14, 0, Math.PI * 2); g.fill(); }
      };
      if (a.outside === 'garden') {
        hill(205, 8, '#9cc08a', 0.01); hill(235, 5, '#5f9a52', 0.03); tree(120, 250, 'rgba(70,130,60,0.9)');
        g.fillStyle = '#86b866'; g.fillRect(0, 255, w, h);
        g.strokeStyle = '#6a5a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(230, 150); g.quadraticCurveTo(360, 176, 512, 150); g.stroke();
        const hues = ['#ffffff', '#f4f0e4', check, '#ffffff'];
        for (let i = 0; i < 4; i++) { g.fillStyle = hues[i]; g.fillRect(262 + i * 58, 163 + Math.sin(i + 1) * 4, 44, 60 + (i % 2) * 18); }
      } else if (a.outside === 'fields') {
        hill(170, 16, 'rgba(160,185,190,0.8)', 0.008); hill(205, 12, 'rgba(140,175,150,0.85)', 0.012); hill(245, 8, '#9dbd7a', 0.02);
        g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(0, 190, w, 46);
        g.strokeStyle = '#6b7a4a'; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(i * 130, 384); g.lineTo(i * 60 + 130, 250); g.stroke(); }
      } else if (a.outside === 'rain') {
        hill(200, 12, '#7e8c8a', 0.012); hill(250, 6, '#5f7462', 0.03);
        g.strokeStyle = 'rgba(235,240,245,0.5)'; g.lineWidth = 2;
        for (let i = 0; i < 140; i++) { const x = random() * w, y = random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 26); g.stroke(); }
      } else if (a.outside === 'snow') {
        hill(200, 12, '#eef1f3', 0.012); hill(245, 7, '#ffffff', 0.025); tree(150, 262, null);
        g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(random() * w, random() * h, 2 + random() * 2.5, 0, Math.PI * 2); g.fill(); }
      } else if (a.outside === 'sea') {
        g.fillStyle = '#5f97b0'; g.fillRect(0, 200, w, h);
        g.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 26; i++) g.fillRect(random() * w, 206 + random() * 150, 30 + random() * 40, 2.5);
        g.fillStyle = '#7f9a6a'; g.beginPath(); g.moveTo(w, 200); g.lineTo(w - 190, 200); g.quadraticCurveTo(w - 120, 140, w, 130); g.fill();
        hill(300, 6, '#d9c9a0', 0.02);
      } else {
        g.fillStyle = '#a8644c'; g.fillRect(0, 170, w, h);
        g.strokeStyle = 'rgba(240,225,210,0.5)'; g.lineWidth = 2;
        for (let r = 0; r < 14; r++) { g.beginPath(); g.moveTo(0, 170 + r * 16); g.lineTo(w, 170 + r * 16); g.stroke(); for (let c = 0; c < 14; c++) { g.beginPath(); g.moveTo(c * 40 + (r % 2) * 20, 170 + r * 16); g.lineTo(c * 40 + (r % 2) * 20, 186 + r * 16); g.stroke(); } }
        g.fillStyle = '#6a5a56'; g.fillRect(60, 60, 120, 110); g.fillRect(330, 90, 130, 80);
        g.fillStyle = '#b8694a'; for (const x of [80, 120, 350, 400]) g.fillRect(x, x < 200 ? 26 : 56, 22, 36);
      }
    });
    const viewTexture = textureOf(viewCanvas);
    const view = s.mesh(new THREE.PlaneGeometry(10.5, 6.9), new THREE.MeshBasicMaterial({ map: viewTexture }), [wx - 0.4, 3.15, WZ - 1.2]);
    view.castShadow = view.receiveShadow = false;

    // Curtains.
    const swaying: THREE.Object3D[] = [];
    if (a.curtain === 'cafe') {
      s.rod([wx - halfW - 0.1, (Y0 + Y1) / 2, zf + 0.15], [wx + halfW + 0.1, (Y0 + Y1) / 2, zf + 0.15], 0.05, s.material('#c9a544', { metalness: 0.8, roughness: 0.3 }));
      const half = skirt(halfW * 2, (Y1 - Y0) / 2 - 0.1, [wx, (Y0 + Y1) / 2, zf + 0.15], 0);
      half.castShadow = false;
      swaying.push(half);
    } else if (a.curtain === 'lace') {
      const laceCanvas = canvasOf(128, 128, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, 128, 128);
        g.fillStyle = 'rgba(255,255,255,0.95)';
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { for (let p = 0; p < 6; p++) { g.beginPath(); g.arc(c * 32 + 16 + Math.cos(p) * 8, r * 32 + 16 + Math.sin(p) * 8, 5, 0, Math.PI * 2); g.fill(); } }
      });
      for (const side of [-1, 1]) {
        const net = s.mesh(new THREE.PlaneGeometry(halfW, Y1 - Y0, 12, 1), new THREE.MeshStandardMaterial({ map: textureOf(laceCanvas, 3, 4), transparent: true, opacity: 0.8, roughness: 1, side: THREE.DoubleSide, depthWrite: false }), [wx + side * halfW / 2, (Y0 + Y1) / 2, zf + 0.12]);
        const position = net.geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 6) * 0.07);
        net.castShadow = net.receiveShadow = false;
        swaying.push(net);
      }
    } else if (a.curtain === 'drawn') {
      const floralCanvas = canvasOf(128, 128, (g) => {
        g.fillStyle = mood.cheer > 0.5 ? '#f2e2b8' : '#d9d3c0'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 9; i++) { const x = (i % 3) * 43 + 20, y = Math.floor(i / 3) * 43 + 20 + (i % 2) * 10; g.fillStyle = i % 2 ? '#c8504a' : '#d98a3c'; for (let p = 0; p < 5; p++) { g.beginPath(); g.arc(x + Math.cos(p * 1.26) * 8, y + Math.sin(p * 1.26) * 8, 6, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#5f8a4a'; g.fillRect(x + 8, y + 8, 12, 5); }
      });
      s.rod([wx - halfW - 0.9, Y1 + 0.5, zf + 0.2], [wx + halfW + 0.9, Y1 + 0.5, zf + 0.2], 0.07, s.material('#6a4a2c', { roughness: 0.6 }));
      for (const side of [-1, 1]) {
        const drape = s.mesh(new THREE.PlaneGeometry(1.5, Y1 - Y0 + 1.0, 14, 1), new THREE.MeshStandardMaterial({ map: textureOf(floralCanvas, 1.6, 4), roughness: 1, side: THREE.DoubleSide }), [wx + side * (halfW + 0.2), (Y0 + Y1) / 2 - 0.05, zf + 0.22]);
        const position = drape.geometry.getAttribute('position');
        for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) * 11) * 0.11);
        drape.geometry.computeVertexNormals();
        swaying.push(drape);
      }
    }

    // On the sill.
    const sillY = Y0, sillZ = WZ + 0.72, sx0 = wx + halfW * 0.5;
    if (a.sill === 'geranium') {
      s.lathe([[0, 0], [0.42, 0], [0.56, 0.85], [0.6, 0.85], [0.6, 1.0], [0, 1.0]], s.material('#b8623c', { roughness: 0.9 }), [sx0, sillY, sillZ]);
      const leaf = s.material('#4f8a45', { roughness: 0.8 });
      for (let i = 0; i < 12; i++) { const b = s.ball([0.3, 0.06, 0.26], [sx0 + wobble(0.55), sillY + 1.2 + random() * 0.7, sillZ + wobble(0.35)], leaf, 8); b.rotation.set(wobble(0.8), random() * 3, wobble(0.8)); }
      for (let i = 0; i < 3; i++) {
        const hx = sx0 + wobble(0.45), hy = sillY + 2.0 + random() * 0.6;
        s.rod([sx0, sillY + 1.0, sillZ], [hx, hy, sillZ], 0.03, leaf);
        s.ball([0.26, 0.22, 0.26], [hx, hy, sillZ], s.material(mood.cheer > 0.4 ? '#e0352b' : '#c86a8a', { roughness: 0.6, emissive: '#5a0a0a', emissiveIntensity: 0.3 }), 8);
      }
    } else if (a.sill === 'jug') {
      s.lathe([[0, 0], [0.3, 0], [0.42, 0.4], [0.36, 0.9], [0.24, 1.15], [0.3, 1.35]], s.material('#f3efe4', { roughness: 0.3, side: THREE.DoubleSide }), [sx0, sillY, sillZ]);
      s.ring(0.22, 0.045, [sx0 + 0.42, sillY + 0.8, sillZ], s.material('#f3efe4', { roughness: 0.3 }));
      s.ring(0.4, 0.03, [sx0, sillY + 0.45, sillZ], s.material('#2f5fa8')).rotation.x = Math.PI / 2;
      const hues = ['#f2d23c', '#ffffff', '#8a6ad0', '#e85d7a', '#f08a2c'];
      for (let i = 0; i < 9; i++) {
        const hx = sx0 + wobble(0.7), hy = sillY + 1.8 + random() * 0.9, hz = sillZ + wobble(0.3);
        s.rod([sx0, sillY + 1.2, sillZ], [hx, hy, hz], 0.022, s.material('#5f8a4a'));
        s.ball([0.14, 0.1, 0.14], [hx, hy, hz], s.material(hues[i % hues.length], { roughness: 0.7 }), 8);
      }
    } else if (a.sill === 'radio') {
      const cabinet = s.material(mood.cheer > 0.5 ? '#d8cdb0' : '#6a4a32', { roughness: 0.5 });
      s.box([2.3, 1.45, 0.8], [sx0, sillY + 0.73, sillZ], cabinet);
      s.box([1.1, 0.95, 0.04], [sx0 - 0.42, sillY + 0.75, sillZ + 0.41], s.material('#b8a070', { roughness: 1 }));
      s.cylinder(0.3, 0.3, 0.05, [sx0 + 0.62, sillY + 0.9, sillZ + 0.42], s.material('#f0e6c0', { emissive: '#f0c060', emissiveIntensity: 0.4 }), 20).rotation.x = Math.PI / 2;
      for (const dx of [0.35, 0.9]) s.cylinder(0.1, 0.1, 0.1, [sx0 + dx, sillY + 0.3, sillZ + 0.44], s.material('#2a2420'), 12).rotation.x = Math.PI / 2;
      s.rod([sx0 + 1.0, sillY + 1.45, sillZ - 0.2], [sx0 + 1.5, sillY + 3.0, sillZ - 0.3], 0.02, s.material('#c9ccce', { metalness: 0.9, roughness: 0.3 }));
    } else if (a.sill === 'eggs') {
      s.lathe([[0, 0.1], [0.3, 0.1], [0.36, 0], [0.45, 0], [0.8, 0.5], [0.84, 0.62], [0.76, 0.62], [0.42, 0.14], [0, 0.16]], s.material('#e6dcc2', { roughness: 0.5, side: THREE.DoubleSide }), [sx0, sillY, sillZ]);
      const shells = ['#c98a5a', '#e8d5b8', '#f3efe6', '#b9d6cf'];
      for (let i = 0; i < 6; i++) s.ball([0.19, 0.25, 0.19], [sx0 + Math.sin(i * 1.05) * 0.38 * (i < 5 ? 1 : 0), sillY + 0.52 + (i === 5 ? 0.22 : 0), sillZ + Math.cos(i * 1.05) * 0.38 * (i < 5 ? 1 : 0)], s.material(shells[Math.floor(random() * shells.length)], { roughness: 0.6 }), 10).rotation.set(wobble(0.8), 0, wobble(0.8));
    }

    // A clock and a calendar on the wall.
    const hour = mix(5.9, 9.4, mood.daylight) + wobble(0.2);
    const clockCanvas = canvasOf(256, 256, (g) => {
      g.fillStyle = '#f6f1e2'; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1e1e22';
      for (let i = 0; i < 12; i++) { g.save(); g.translate(128, 128); g.rotate((i / 12) * Math.PI * 2); g.fillRect(-4, -116, 8, i % 3 ? 16 : 30); g.restore(); }
      const hand = (turn: number, len: number, wide: number) => { g.save(); g.translate(128, 128); g.rotate(turn * Math.PI * 2); g.fillRect(-wide / 2, -len, wide, len + 12); g.restore(); };
      hand(hour / 12, 62, 10); hand(hour % 1, 100, 6);
    });
    const cx = wx + halfW + 2.3, cy = 5.0;
    s.cylinder(1.0, 1.0, 0.22, [cx, cy, WZ + 0.26], s.material(mood.cheer > 0.5 ? '#c8322c' : '#3a3a40', { roughness: 0.4 }), 32).rotation.x = Math.PI / 2;
    const dial = s.mesh(new THREE.CircleGeometry(0.88, 32), new THREE.MeshStandardMaterial({ map: textureOf(clockCanvas), roughness: 0.6 }), [cx, cy, WZ + 0.38]);
    dial.castShadow = false;
    const calendarCanvas = canvasOf(128, 192, (g) => {
      g.fillStyle = '#f6f1e2'; g.fillRect(0, 0, 128, 192);
      g.fillStyle = '#9cc08a'; g.fillRect(8, 8, 112, 76); g.fillStyle = '#dfeaf2'; g.fillRect(8, 8, 112, 40); g.fillStyle = '#c8504a'; g.fillRect(50, 34, 30, 30);
      g.fillStyle = '#c8322c'; g.fillRect(8, 92, 112, 14);
      g.fillStyle = '#44444a'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) g.fillRect(12 + c * 16, 114 + r * 15, 8, 7);
      g.strokeStyle = '#c8322c'; g.lineWidth = 3; g.beginPath(); g.arc(16 + Math.floor(random() * 7) * 16, 117 + Math.floor(random() * 5) * 15, 9, 0, Math.PI * 2); g.stroke();
    });
    const cal = s.mesh(new THREE.PlaneGeometry(1.5, 2.25), new THREE.MeshStandardMaterial({ map: textureOf(calendarCanvas), roughness: 0.9 }), [wx - halfW - 2.1, 4.6, WZ + 0.17]);
    cal.rotation.z = wobble(0.04);
    cal.castShadow = false;

    // ---- The chair ---------------------------------------------------------------------------
    const chair = new Sculpture(context);
    const painted = a.chair === 'painted';
    const chairTint = painted ? (mood.cheer > 0.5 ? '#6fa3b8' : '#6f8068') : a.chair === 'bentwood' ? '#5a3a24' : '#b88a55';
    const timber = chair.material(chairTint, { roughness: painted ? 0.55 : 0.7 });
    const SEAT = a.chair === 'stool' ? 2.9 : 3.1;
    let backTop = SEAT, backZ = 1.7;
    const legs = (points: readonly (readonly [number, number])[], splay: number, radius: number) => {
      for (const [x, z] of points) chair.rod([x * splay, 0, z * splay], [x, SEAT - 0.1, z], radius * 0.75, timber, radius);
    };
    if (a.chair === 'stool') {
      chair.cylinder(1.45, 1.35, 0.3, [0, SEAT, 0], timber, 24);
      legs([[0, -1.0], [0.87, 0.5], [-0.87, 0.5]], 1.45, 0.17);
    } else if (a.chair === 'bentwood') {
      chair.cylinder(1.75, 1.7, 0.2, [0, SEAT, 0], timber, 28);
      chair.cylinder(1.5, 1.5, 0.04, [0, SEAT + 0.11, 0], chair.material('#c9a870', { roughness: 0.9 }), 28);
      legs([[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]], 1.15, 0.13);
      chair.ring(1.45, 0.07, [0, SEAT * 0.45, 0], timber).rotation.x = Math.PI / 2;
      chair.tube([[-1.45, SEAT, 1.0], [-1.6, SEAT + 2.0, 1.55], [-1.0, SEAT + 3.3, 1.85], [0, SEAT + 3.7, 1.95], [1.0, SEAT + 3.3, 1.85], [1.6, SEAT + 2.0, 1.55], [1.45, SEAT, 1.0]], 0.13, timber);
      chair.tube([[-0.8, SEAT, 1.5], [-0.85, SEAT + 1.8, 1.7], [0, SEAT + 2.8, 1.85], [0.85, SEAT + 1.8, 1.7], [0.8, SEAT, 1.5]], 0.1, timber);
      backTop = SEAT + 3.7; backZ = 1.95;
    } else if (a.chair === 'ladder') {
      chair.box([3.5, 0.3, 3.3], [0, SEAT, 0], chair.material('#c9a85a', { roughness: 1 }));
      for (const [d, t] of [[3.5, 0], [3.3, Math.PI / 2]] as const) for (const side of [-1, 1]) { const rail = chair.box([d, 0.22, 0.22], [t ? side * 1.64 : 0, SEAT, t ? 0 : side * 1.54], timber); rail.rotation.y = t; }
      legs([[-1.6, -1.5], [1.6, -1.5]], 1, 0.16);
      for (const side of [-1, 1]) chair.rod([side * 1.6, 0, 1.5], [side * 1.6, SEAT + 3.6, 1.95], 0.16, timber, 0.13);
      for (let i = 0; i < 3; i++) { const y = SEAT + 1.1 + i * 1.05; const slat = chair.box([3.2, 0.5, 0.1], [0, y, 1.5 + (y / (SEAT + 3.6)) * 0.45], timber); slat.rotation.x = -0.12; }
      for (const y of [1.0, 1.9]) { chair.rod([-1.6, y, -1.5], [1.6, y, -1.5], 0.08, timber); for (const side of [-1, 1]) chair.rod([side * 1.6, y - 0.2, -1.5], [side * 1.6, y - 0.2, 1.5 + y * 0.07], 0.08, timber); }
      backTop = SEAT + 3.6; backZ = 1.95;
    } else {
      const seat = chair.box([3.7, 0.32, 3.5], [0, SEAT, 0], timber);
      seat.geometry.translate(0, 0, 0);
      legs([[-1.35, -1.25], [1.35, -1.25], [-1.35, 1.25], [1.35, 1.25]], 1.22, 0.17);
      chair.rod([-1.5, SEAT * 0.4, 0], [1.5, SEAT * 0.4, 0], 0.08, timber);
      for (const side of [-1, 1]) chair.rod([side * 1.5, SEAT * 0.4, -1.4], [side * 1.5, SEAT * 0.4, 1.4], 0.08, timber);
      for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 0.56; chair.rod([x, SEAT + 0.1, 1.5], [x * 1.12, SEAT + 3.25, 2.0], i === 0 || i === 5 ? 0.13 : 0.075, timber); }
      chair.tube([[-1.85, SEAT + 3.15, 1.9], [-1.0, SEAT + 3.35, 2.05], [0, SEAT + 3.42, 2.1], [1.0, SEAT + 3.35, 2.05], [1.85, SEAT + 3.15, 1.9]], 0.2, timber);
      backTop = SEAT + 3.4; backZ = 2.05;
    }
    const fallen = a.moment === 'fallen';
    if (!fallen) {
      if (a.left === 'cardigan') {
        const wool = chair.material(mood.cheer > 0.5 ? '#c8643c' : '#6a6f7a', { roughness: 1 });
        if (a.chair === 'stool') { chair.box([2.2, 0.35, 1.8], [0, SEAT + 0.3, 0], wool).rotation.y = 0.3; }
        else {
          chair.box([3.3, 0.5, 0.7], [0, backTop + 0.1, backZ], wool);
          chair.box([3.3, 2.3, 0.14], [0, backTop - 1.1, backZ + 0.32], wool);
          chair.box([3.1, 1.7, 0.14], [0, backTop - 0.8, backZ - 0.36], wool);
          for (const side of [-1, 1]) chair.box([0.6, 2.9, 0.16], [side * 1.75, backTop - 1.5, backZ + 0.38], wool).rotation.z = side * 0.08;
        }
      } else if (a.left === 'cat') {
        const coat = ['#d9893a', '#3a3a3e', '#a8a39a', '#f1ece0'][Math.floor(random() * 4)];
        const fur = chair.material(coat, { roughness: 1 });
        const y = SEAT + 0.2;
        chair.ball([1.15, 0.6, 0.9], [0, y + 0.55, 0.1], fur, 16);
        chair.ball([0.45, 0.4, 0.42], [-0.85, y + 0.5, -0.5], fur, 12);
        for (const side of [-1, 1]) { const ear = chair.mesh(new THREE.ConeGeometry(0.15, 0.3, 4), fur, [-0.95 + side * 0.22, y + 0.92, -0.55]); ear.rotation.z = side * -0.2; }
        chair.tube([[1.0, y + 0.3, 0.3], [1.1, y + 0.2, -0.6], [0.3, y + 0.18, -0.95], [-0.5, y + 0.2, -0.9]], 0.13, fur);
      } else if (a.left === 'satchel') {
        const leather = chair.material('#8a5a30', { roughness: 0.6 });
        const y = SEAT + 0.16;
        chair.box([2.4, 1.7, 0.8], [0.1, y + 0.85, 0.4], leather).rotation.x = -0.12;
        chair.box([2.45, 0.9, 0.84], [0.1, y + 1.35, 0.36], chair.material('#754a26', { roughness: 0.6 })).rotation.x = -0.12;
        for (const side of [-1, 1]) chair.box([0.2, 0.6, 0.06], [0.1 + side * 0.65, y + 0.8, -0.06], chair.material('#c9a544', { metalness: 0.8, roughness: 0.3 }));
        chair.tube([[-1.1, y + 1.5, 0.5], [-1.9, y + 0.6, 0.2], [-1.6, y + 0.05, -0.9], [-0.6, y + 0.03, -1.2]], 0.07, leather);
      } else if (a.left === 'apron' && a.chair !== 'stool') {
        const linen = new THREE.MeshStandardMaterial({ map: textureOf(ginghamCanvas, 3, 4), roughness: 1, side: THREE.DoubleSide });
        chair.box([2.2, 3.0, 0.08], [0.3, backTop - 1.7, backZ + 0.3], linen).rotation.z = 0.05;
        chair.rod([-0.5, backTop + 0.1, backZ], [0.3, backTop - 0.3, backZ + 0.3], 0.04, chair.material('#f1ece0'));
        chair.rod([1.1, backTop + 0.1, backZ], [0.6, backTop - 0.3, backZ + 0.3], 0.04, chair.material('#f1ece0'));
      } else if (a.left === 'apron') chair.box([2.0, 0.25, 1.6], [0, SEAT + 0.27, 0], new THREE.MeshStandardMaterial({ map: textureOf(ginghamCanvas, 3, 2), roughness: 1 }));
    }
    const chairX = -2.4;
    if (fallen) {
      chair.root.rotation.set(Math.PI / 2, 0, 0);
      const lay = new THREE.Group();
      lay.add(chair.root);
      chair.root.position.set(0, backZ + 0.2, 0);
      lay.position.set(chairX - 0.6, -TH, D / 2 + 1.2);
      lay.rotation.y = 0.35 + wobble(0.25);
      s.root.add(lay);
    } else {
      const spot = { pushed: [chairX, D / 2 + 2.2, wobble(0.08)], turned: [chairX - 0.5, D / 2 + 2.3, -0.75 + wobble(0.15)], tucked: [chairX, D / 2 - 0.2, wobble(0.03)] }[a.moment as 'pushed' | 'turned' | 'tucked'];
      chair.root.position.set(spot[0], -TH, spot[1]);
      chair.root.rotation.y = spot[2];
      s.root.add(chair.root);
    }

    // ---- The place they sat at ---------------------------------------------------------------
    const px = chairX, pz = 3.75, py = a.cloth === 'full' || (a.cloth === 'half' && false) ? 0.04 : 0.012;
    const china = s.material('#f5f2ea', { roughness: 0.28, side: THREE.DoubleSide });
    const steel = s.material('#d9dcdc', { metalness: 0.9, roughness: 0.22 });
    const plate = () => {
      s.lathe([[0, 0.06], [0.75, 0.06], [1.12, 0.17], [1.15, 0.15], [0.76, 0], [0, 0]], china, [px, py, pz]);
      s.ring(1.13, 0.014, [px, py + 0.165, pz], s.material(check, { roughness: 0.4 })).rotation.x = Math.PI / 2;
    };
    const knife = (x: number, z: number, turn: number) => {
      const blade = s.box([0.16, 0.02, 1.15], [x, py + 0.02, z - 0.4], steel);
      const handle = s.box([0.15, 0.09, 0.95], [x, py + 0.05, z + 0.6], s.material('#efe6cf', { roughness: 0.4 }));
      for (const part of [blade, handle]) { part.position.sub(new THREE.Vector3(x, 0, z)).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn).add(new THREE.Vector3(x, 0, z)); part.rotation.y = turn; }
    };
    const mug = (x: number, z: number) => {
      const glaze = s.material(mood.cheer > 0.5 ? '#e8c04a' : '#7f8f9a', { roughness: 0.3, side: THREE.DoubleSide });
      s.lathe([[0, 0.03], [0.36, 0.03], [0.4, 0.1], [0.42, 0.95], [0.38, 0.95], [0.36, 0.12], [0, 0.1]], glaze, [x, py, z]);
      s.ring(0.24, 0.06, [x + 0.56, py + 0.5, z], glaze, Math.PI * 1.1).rotation.z = -Math.PI * 0.55;
      s.cylinder(0.37, 0.37, 0.01, [x, py + 0.45 + random() * 0.3, z], new THREE.MeshStandardMaterial({ color: '#4a2c16', roughness: 0.15 }), 20);
    };
    const crumbs = (count: number, spread: number) => s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#c99a55', { roughness: 1 }), Array.from({ length: count }, () => ({
      at: [px + wobble(spread), py + 0.02, pz + wobble(spread * 0.6)] as const, size: 0.015 + random() * 0.03, color: random() > 0.5 ? '#c99a55' : '#8a5a2a',
    })));
    if (a.setting === 'laid') {
      plate();
      knife(px + 1.5, pz, 0);
      const napkin = s.box([0.9, 0.08, 1.3], [px - 1.6, py + 0.04, pz], s.material('#f6f1e2', { roughness: 1 }));
      napkin.rotation.y = wobble(0.05);
    } else if (a.setting === 'eaten') {
      plate();
      knife(px + 0.3, pz - 0.1, 0.9 + wobble(0.3));
      crumbs(Math.round(mix(30, 110, mood.density)), 1.3);
      s.ball([0.5, 0.02, 0.3], [px - 0.3, py + 0.075, pz + 0.3], new THREE.MeshStandardMaterial({ color: '#e0a02a', roughness: 0.2 }), 12).rotation.y = random() * 3;
      const napkin = s.mesh(new THREE.IcosahedronGeometry(0.5, 1), new THREE.MeshStandardMaterial({ color: '#f6f1e2', roughness: 1, flatShading: true }), [px - 1.7, py + 0.22, pz + 0.3]);
      napkin.scale.set(1.1, 0.5, 0.9);
      mug(px + 1.7, pz - 1.0);
    } else if (a.setting === 'cleared') {
      crumbs(Math.round(mix(14, 60, mood.density)), 1.4);
      const ring = s.ring(0.4, 0.035, [px + 1.4, py + 0.008, pz - 0.8], new THREE.MeshStandardMaterial({ color: '#6a4424', roughness: 0.6, transparent: true, opacity: 0.6 }));
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = false;
    } else {
      const noteCanvas = canvasOf(256, 192, (g) => {
        g.fillStyle = '#fbf7e6'; g.fillRect(0, 0, 256, 192);
        g.strokeStyle = 'rgba(90,130,200,0.5)'; for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(0, i * 28); g.lineTo(256, i * 28); g.stroke(); }
        g.fillStyle = '#1c2a55'; g.font = 'italic 34px "Brush Script MT", "Segoe Script", cursive';
        const lines = [['Back soon', 'feed the hens', 'x'], ['Gone to', 'the top field', 'love M.'], ['Your egg is', 'in the pan', 'x x'], ['Don’t wait', 'for me', '']][Math.floor(random() * 4)];
        lines.forEach((line, i) => g.fillText(line, 22, 52 + i * 50));
      });
      const note = s.mesh(new THREE.PlaneGeometry(1.7, 1.28), new THREE.MeshStandardMaterial({ map: textureOf(noteCanvas), roughness: 0.9, side: THREE.DoubleSide }), [px, py + 0.012, pz]);
      note.rotation.set(-Math.PI / 2, 0, 0.12 + wobble(0.15));
      note.castShadow = false;
      mug(px + 0.75, pz - 0.6);
    }

    // ---- Light: the sun comes in through the window and lands on the hero's place ------------
    const basePlace = world.place.bind(world);
    world.place = (items: readonly Placeable[]) => {
      basePlace(items);
      const source = new THREE.Vector3(wx + (0.5 - mood.daylight) * 5.5, (Y0 + Y1) / 2 + 0.6, WZ);
      const direction = source.sub(new THREE.Vector3(HERO[0], 0, HERO[1])).normalize();
      const span = key.shadow.camera.right / 0.6;
      key.position.copy(key.target.position).addScaledVector(direction, span * 1.5);
      key.shadow.camera.updateProjectionMatrix();
    };
    const sway = mix(0.004, 0.03, mood.energy);
    world.update = (_dt: number, time: number) => {
      swaying.forEach((cloth, index) => { cloth.rotation.x = Math.sin(time * 0.9 + index) * sway; });
    };
    return world;
  },
});
