import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const PALETTES = {
  rainbow: ['#d9342b', '#ee7f1c', '#f3c71e', '#3d9c46', '#2d62c4', '#7b3fa6', '#7a4a2a', '#1f1d1d', '#ee82a8', '#63b8e6'],
  angry: ['#c2201c', '#e2571b', '#1b1919', '#7d1414', '#2d2a2e', '#3a3a3a', '#5e2a1a', '#1b1919'],
  pastel: ['#f3a3b8', '#f7c08f', '#f6e08a', '#a9dcae', '#9cc7ee', '#c9aee6', '#d9b79b', '#8f8aa6', '#f7b9cf', '#b5e3e6'],
  earth: ['#8a5a33', '#a9792f', '#c9a13b', '#6f7a3a', '#5b6770', '#6b5560', '#4a3324', '#3a3531', '#b08a6a', '#8f9a8a'],
  sea: ['#1f8a8a', '#3fb3a2', '#bfe3c2', '#2f8f5b', '#1f4fa3', '#3a3f8f', '#2a5560', '#16283a', '#7fc6dd', '#4f9fd9'],
} as const;

type Ctx = CanvasRenderingContext2D;
type XY = [number, number];

export default defineThing({
  questions: {
    drawing: choice('What does the drawing on the paper show?', {
      family: 'A family of stick figures holding hands under a sun.',
      monster: 'A huge scribbled monster with too many eyes and zigzag teeth, and one tiny person.',
      house: 'A square house with a triangle roof, a curl of chimney smoke and a lollipop tree.',
      fire: 'A house on fire: flames out of the roof and windows, black smoke, a small figure outside.',
      rocket: 'A rocket blasting off between stars toward a ringed planet.',
      rainbow: 'A fat rainbow between two clouds.',
      scribble: 'No picture, just the furious looping scribble of a very small child.',
    }),
    finished: score('How far along is the drawing?', ['Only the first few lines', 'Half done', 'Every corner coloured in']),
    palette: choice('Which crayons came in the box?', {
      rainbow: 'The full bright rainbow set.',
      angry: 'Mostly red and black, pressed hard.',
      pastel: 'Soft sugary pastels.',
      earth: 'The dull browns, ochres and greys that are always left over.',
      sea: 'Blues, teals and greens.',
    }),
    broken: score('How many of the crayons are snapped?', ['None, all whole', 'A few', 'Nearly every one snapped in two']),
    box: choice('What were the crayons kept in?', {
      spilled: 'A yellow cardboard carton lying on its back with the crayons pouring out of its mouth.',
      upright: 'A yellow carton still standing with neat rows of tips showing, only a few taken out.',
      crushed: 'A carton trodden flat, every crayon loose.',
      tin: 'An old tin can standing upright with crayons bristling out of it.',
    }),
    paper: choice('What is the drawing on?', {
      white: 'A clean sheet of white paper.',
      lined: 'A page torn from a ruled exercise book.',
      sugar: 'Coloured sugar paper from a craft pad.',
      newsprint: 'A sheet of old newspaper, drawn straight over the columns.',
    }),
    offPage: noul('Did the drawing run off the edge of the paper onto the floor?'),
    profile: choice('What shape are the wax crayons?', {
      round: 'Ordinary narrow round wax sticks.',
      hexagon: 'Six-sided crayons that resist rolling.',
      triangle: 'Triangular grip crayons with broad flat sides.',
      chunky: 'Thick round toddler crayons with large blunt tips.',
    }),
    wrappers: choice('How are the crayons wrapped?', {
      bands: 'Coloured paper sleeves with dark bands near their ends.',
      plain: 'Plain pale paper sleeves without end bands.',
      striped: 'Several narrow dark stripes cross each paper sleeve.',
      bare: 'The paper wrappers have been peeled off, exposing wax.',
    }),
    border: choice('What border was drawn around the picture?', {
      none: 'The drawing has no deliberate border.',
      frame: 'A wavering coloured rectangular frame surrounds the picture.',
      scallop: 'A row of little coloured loops borders the page.',
      boxes: 'Small alternating coloured squares make a homemade frame.',
    }),
    guide: choice('What drawing guide remains beneath the crayon marks?', {
      none: 'A blank sheet without a guide.',
      dots: 'Pale numbered dots suggest a connect-the-dots outline.',
      grid: 'A faint square drawing grid sits beneath the picture.',
      shapes: 'Lightly printed circles, squares and triangles invite colouring.',
    }),
    pages: choice('How is the drawing sheet supported?', {
      single: 'One loose drawing sheet.',
      pad: 'A thin drawing pad with a glued top edge.',
      stack: 'Several slightly offset loose sheets sit underneath.',
      clipboard: 'A small board and a spring clip hold the paper.',
    }),
    accessory: choice('Which drawing tool lies beside the crayons?', {
      sharpener: 'A wide-hole crayon sharpener with a small visible blade.',
      rubbing: 'A ridged rubbing plate waits beside the drawing.',
      eraser: 'A soft rectangular eraser with one rounded used end.',
      stencil: 'A simple open circular stencil frame.',
    }),
    leftovers: choice('What was left by the last bit of drawing?', {
      none: 'The workspace has no extra scraps.',
      wrapper: 'A peeled paper wrapper curls beside the crayon box.',
      shavings: 'Small curled wax shavings lie near the sharpener.',
      test: 'A narrow scrap of paper holds several tested colour strokes.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const jit = (range: number) => (random() - 0.5) * 2 * range;
    const pal = PALETTES[a.palette];
    const P = (index: number) => pal[index % pal.length];
    const paperColour = { white: '#f7f4ea', lined: '#f6f3e6', sugar: ['#e5c9a8', '#c9d9e6', '#cfe0c2', '#ead0d6'][Math.floor(random() * 4)], newsprint: '#dedace' }[a.paper];

    // ---- The drawing -------------------------------------------------------------------
    const W = 512, H = 360;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d')!;
    g.fillStyle = paperColour;
    g.fillRect(0, 0, W, H);
    if (a.paper === 'lined') {
      g.strokeStyle = 'rgba(90,130,200,0.45)';
      g.lineWidth = 1.5;
      for (let y = 34; y < H; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      g.strokeStyle = 'rgba(210,70,70,0.5)';
      g.beginPath(); g.moveTo(52, 0); g.lineTo(52, H); g.stroke();
    } else if (a.paper === 'newsprint') {
      g.fillStyle = 'rgba(40,40,40,0.75)';
      g.fillRect(16, 14, 300, 20);
      g.fillStyle = 'rgba(40,40,40,0.32)';
      for (let column = 0; column < 4; column++)
        for (let y = 48; y < H - 10; y += 7) g.fillRect(16 + column * 124, y, 96 + random() * 14, 3);
      g.fillStyle = 'rgba(60,60,60,0.3)';
      g.fillRect(264, 60, 232, 110);
    }
    g.strokeStyle = 'rgba(100,105,115,0.23)';
    g.fillStyle = 'rgba(100,105,115,0.4)';
    g.lineWidth = 1.5;
    if (a.guide === 'grid') {
      for (let x = 30; x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
      for (let y = 30; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    }
    if (a.guide === 'dots') for (let i = 0; i < 18; i++) {
      const t = i / 18 * Math.PI * 2, x = W / 2 + Math.cos(t) * 180, y = H / 2 + Math.sin(t) * 110;
      g.beginPath(); g.arc(x, y, 2.8, 0, Math.PI * 2); g.fill(); g.font = '11px sans-serif'; g.fillText(String(i + 1), x + 5, y - 3);
    }
    if (a.guide === 'shapes') for (let i = 0; i < 3; i++) {
      const x = 100 + i * 155;
      g.strokeRect(x - 38, 100, 76, 76);
      g.beginPath(); g.arc(x, 230, 37, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - 28, 75); g.lineTo(x, 28); g.lineTo(x + 28, 75); g.closePath(); g.stroke();
    }
    const stroke = (points: XY[], colour: string, width = 6, wobble = 2.4) => {
      g.strokeStyle = colour;
      g.lineCap = g.lineJoin = 'round';
      for (const [alpha, grow] of [[0.6, 2.1], [0.95, 1.25]]) {
        g.globalAlpha = alpha;
        g.lineWidth = width * grow;
        g.beginPath();
        points.forEach(([x, y], index) => {
          const px = x + jit(wobble), py = y + jit(wobble);
          if (index) g.lineTo(px, py); else g.moveTo(px, py);
        });
        g.stroke();
      }
      g.globalAlpha = 1;
    };
    const line = (x1: number, y1: number, x2: number, y2: number, colour: string, width = 6) => {
      const points: XY[] = [];
      for (let i = 0; i <= 5; i++) points.push([mix(x1, x2, i / 5), mix(y1, y2, i / 5)]);
      stroke(points, colour, width);
    };
    const loop = (cx: number, cy: number, rx: number, ry: number, colour: string, width = 6, from = 0, to = Math.PI * 2.25) => {
      const points: XY[] = [];
      const steps = 22;
      for (let i = 0; i <= steps; i++) {
        const angle = mix(from, to, i / steps);
        points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
      }
      stroke(points, colour, width);
    };
    /** Colouring-in: a zigzag that roughly fills an ellipse, going over the lines. */
    const fill = (cx: number, cy: number, rx: number, ry: number, colour: string, width = 7) => {
      const points: XY[] = [];
      const rows = Math.max(4, Math.round((ry * 2) / (width * 1.3)));
      for (let row = 0; row <= rows; row++) {
        const y = cy - ry + (row / rows) * ry * 2;
        const half = rx * Math.sqrt(Math.max(0.02, 1 - ((y - cy) / ry) ** 2)) * (0.92 + random() * 0.2);
        points.push(row % 2 ? [cx - half, y] : [cx + half, y]);
      }
      stroke(points, colour, width, 3.5);
    };
    const zigzag = (x1: number, x2: number, y: number, height: number, teeth: number, colour: string, width = 6) => {
      const points: XY[] = [];
      for (let i = 0; i <= teeth * 2; i++) points.push([mix(x1, x2, i / (teeth * 2)), y - (i % 2 ? height * (0.6 + random() * 0.5) : 0)]);
      stroke(points, colour, width);
    };
    const happy = mood.cheer > 0.35;
    const person = (x: number, foot: number, tall: number, colour: string, smiling: boolean, armsUp = false) => {
      const head = tall * 0.17, neck = foot - tall + head * 2, hip = foot - tall * 0.34;
      loop(x, neck - head, head, head, colour, 5);
      line(x, neck, x, hip, colour, 5);
      line(x, hip, x - tall * 0.16, foot, colour, 5);
      line(x, hip, x + tall * 0.16, foot, colour, 5);
      const reach = armsUp ? -tall * 0.2 : tall * 0.06;
      line(x, neck + tall * 0.08, x - tall * 0.24, neck + tall * 0.08 + reach, colour, 5);
      line(x, neck + tall * 0.08, x + tall * 0.24, neck + tall * 0.08 + reach, colour, 5);
      g.fillStyle = P(7);
      for (const dx of [-0.38, 0.38]) { g.beginPath(); g.arc(x + dx * head, neck - head * 1.15, 2.6, 0, Math.PI * 2); g.fill(); }
      if (smiling) loop(x, neck - head * 0.85, head * 0.45, head * 0.35, P(7), 2.5, 0.25, Math.PI - 0.25);
      else loop(x, neck - head * 0.35, head * 0.45, head * 0.3, P(7), 2.5, Math.PI + 0.3, Math.PI * 2 - 0.3);
    };
    const sun = (x: number, y: number) => {
      fill(x, y, 26, 26, P(2), 8);
      loop(x, y, 28, 28, P(2), 6);
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        line(x + Math.cos(angle) * 36, y + Math.sin(angle) * 36, x + Math.cos(angle) * 56, y + Math.sin(angle) * 56, P(2), 5);
      }
    };
    const cloud = (x: number, y: number, colour: string, rain: boolean) => {
      for (const [dx, dy, r] of [[-30, 6, 22], [0, -6, 28], [32, 6, 22]]) loop(x + dx, y + dy, r, r * 0.75, colour, 6);
      if (rain) for (let i = 0; i < 6; i++) line(x - 40 + i * 16, y + 34, x - 46 + i * 16, y + 56 + random() * 16, P(4), 4);
    };
    const houseOutline = (x: number, base: number, size: number, wall: string, roof: string) => {
      stroke([[x, base], [x, base - size], [x + size, base - size], [x + size, base], [x, base]], wall, 6);
      stroke([[x - 14, base - size], [x + size / 2, base - size * 1.62], [x + size + 14, base - size], [x - 14, base - size]], roof, 6);
    };

    const steps: (() => void)[] = [];
    if (a.drawing === 'family') {
      const apart = !happy;
      steps.push(() => person(170, 300, 190, P(4), true));
      steps.push(() => person(apart ? 440 : 262, 300, 172, P(0), happy));
      steps.push(() => { person(apart ? 236 : 340, 300, 108, P(5), true); if (!apart) { line(214, 196, 222, 190, P(7), 4); } });
      steps.push(() => { line(20, 304, 492, 304, P(3), 8); zigzag(20, 492, 318, 14, 22, P(3), 5); });
      steps.push(() => (happy ? sun(440, 62) : cloud(400, 70, P(7), true)));
      steps.push(() => { loop(86, 280, 26, 15, P(6), 6); loop(56, 262, 12, 11, P(6), 5); line(72, 292, 70, 304, P(6), 5); line(100, 292, 102, 304, P(6), 5); line(112, 276, 126, 262, P(6), 5); });
      steps.push(() => { for (let i = 0; i < 3; i++) zigzag(20, 340, 30 + i * 14, 10, 14, P(9), 7); });
    } else if (a.drawing === 'monster') {
      steps.push(() => { fill(240, 190, 150, 120, P(7), 13); loop(240, 190, 156, 126, P(7), 8); });
      steps.push(() => {
        for (const [x, y, r] of [[170, 140, 30], [250, 120, 22], [320, 150, 34]] as const) {
          g.fillStyle = paperColour;
          g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
          loop(x, y, r, r, P(0), 5);
          fill(x + jit(6), y + jit(6), r * 0.4, r * 0.4, P(0), 5);
        }
      });
      steps.push(() => {
        g.fillStyle = paperColour;
        g.beginPath(); g.ellipse(244, 236, 96, 34, 0, 0, Math.PI * 2); g.fill();
        zigzag(152, 336, 232, -30, 7, P(0), 5);
        zigzag(152, 336, 242, 30, 7, P(0), 5);
      });
      steps.push(() => { for (const side of [-1, 1]) { line(240 + side * 140, 180, 240 + side * 210, 120, P(7), 9); for (let c = -1; c <= 1; c++) line(240 + side * 210, 120, 240 + side * 226 + c * 12, 92, P(7), 5); } });
      steps.push(() => person(450, 330, 70, P(4), false, true));
      steps.push(() => { zigzag(120, 180, 80, 44, 1, P(5), 8); zigzag(300, 360, 80, 44, 1, P(5), 8); });
      steps.push(() => { for (let i = 0; i < 3; i++) zigzag(10, 500, 26 + i * 12, 12, 20, P(5), 7); line(10, 336, 500, 336, P(3), 8); });
    } else if (a.drawing === 'house' || a.drawing === 'fire') {
      const burning = a.drawing === 'fire';
      const wall = burning ? P(7) : P(0);
      steps.push(() => houseOutline(170, 300, 170, wall, burning ? P(7) : P(6)));
      steps.push(() => { stroke([[236, 300], [236, 226], [276, 226], [276, 300]], P(6), 6); for (const x of [192, 296]) { stroke([[x, 170], [x + 34, 170], [x + 34, 204], [x, 204], [x, 170]], P(4), 5); line(x + 17, 170, x + 17, 204, P(4), 3); } });
      if (burning) {
        steps.push(() => { zigzag(160, 350, 132, 96, 6, P(0), 9); zigzag(176, 336, 126, 62, 5, P(1), 8); zigzag(196, 316, 122, 34, 4, P(2), 7); });
        steps.push(() => { for (const x of [192, 296]) { zigzag(x - 4, x + 38, 176, 44, 3, P(0), 7); zigzag(x + 4, x + 30, 180, 22, 2, P(2), 6); } });
        steps.push(() => { for (const [x, y, r] of [[250, 44, 46], [316, 26, 40], [390, 40, 52], [450, 22, 36]] as const) fill(x, y, r, r * 0.6, P(7), 10); });
        steps.push(() => person(74, 304, 96, P(4), false, true));
        steps.push(() => { line(10, 306, 500, 306, P(3), 8); zigzag(120, 400, 300, 26, 9, P(1), 6); });
      } else {
        steps.push(() => { stroke([[300, 86], [300, 46], [322, 46], [322, 104]], P(0), 6); const curl: XY[] = []; for (let i = 0; i < 26; i++) curl.push([326 + i * 5 + Math.cos(i * 0.9) * 12, 34 - i * 0.6 + Math.sin(i * 0.9) * 12]); stroke(curl, P(7), 4); });
        steps.push(() => { line(8, 304, 504, 304, P(3), 8); zigzag(8, 504, 320, 14, 24, P(3), 5); });
        steps.push(() => { line(420, 300, 420, 200, P(6), 10); fill(420, 160, 46, 50, P(3), 9); loop(420, 160, 50, 54, P(3), 6); });
        steps.push(() => (happy ? sun(70, 62) : cloud(84, 66, P(7), true)));
        steps.push(() => { fill(255, 216, 78, 78, P(2), 12); for (let i = 0; i < 4; i++) { loop(40 + i * 28, 290, 7, 7, P(8), 4); line(40 + i * 28, 298, 40 + i * 28, 310, P(3), 3); } });
      }
    } else if (a.drawing === 'rocket') {
      const rocket = (draw: () => void) => { g.save(); g.translate(230, 190); g.rotate(0.5); draw(); g.restore(); };
      steps.push(() => rocket(() => { stroke([[-36, 70], [-36, -50], [0, -128], [36, -50], [36, 70], [-36, 70]], P(0), 7); }));
      steps.push(() => rocket(() => { stroke([[-36, 30], [-76, 86], [-36, 70]], P(4), 7); stroke([[36, 30], [76, 86], [36, 70]], P(4), 7); loop(0, -30, 18, 18, P(4), 6); }));
      steps.push(() => rocket(() => { zigzag(-30, 30, 74, -78, 3, P(1), 9); zigzag(-18, 18, 74, -44, 2, P(2), 7); }));
      steps.push(() => { for (let i = 0; i < 9; i++) { const x = 30 + random() * 450, y = 20 + random() * 320; if (Math.hypot(x - 230, y - 190) < 120) continue; for (let ray = 0; ray < 3; ray++) { const angle = (ray / 3) * Math.PI; line(x - Math.cos(angle) * 11, y - Math.sin(angle) * 11, x + Math.cos(angle) * 11, y + Math.sin(angle) * 11, P(2), 4); } } });
      steps.push(() => { fill(424, 70, 40, 40, P(5), 9); loop(424, 70, 42, 42, P(5), 6); loop(424, 70, 76, 16, P(1), 5); });
      steps.push(() => rocket(() => fill(0, 14, 30, 64, P(9), 10)));
      steps.push(() => { loop(250, 440, 300, 130, P(3), 9, Math.PI, Math.PI * 2); for (let i = 0; i < 3; i++) loop(60 + i * 60, 340 - i * 6, 12, 8, P(7), 4); });
    } else if (a.drawing === 'rainbow') {
      for (let band = 0; band < 6; band++) steps.push(() => loop(256, 320, 215 - band * 23, 250 - band * 26, P(band), 20, Math.PI, Math.PI * 2));
      steps.push(() => { cloud(64, 306, P(9), !happy); cloud(448, 306, P(9), false); });
      steps.push(() => (happy ? sun(450, 54) : cloud(256, 250, P(7), true)));
    } else {
      for (let pass = 0; pass < 7; pass++)
        steps.push(() => {
          const points: XY[] = [];
          let x = 80 + random() * 350, y = 70 + random() * 220, heading = random() * 6;
          for (let i = 0; i < 70; i++) {
            heading += 0.5 + random() * 0.9;
            const reach = 26 + random() * 60;
            x = Math.min(W - 16, Math.max(16, x + Math.cos(heading) * reach));
            y = Math.min(H - 16, Math.max(16, y + Math.sin(heading) * reach));
            points.push([x, y]);
          }
          stroke(points, P(pass * 3), 5 + random() * 3, 3);
        });
    }
    const done = Math.max(a.drawing === 'scribble' ? 1 : 2, Math.round(mix(0.22, 1, a.finished) * steps.length));
    steps.slice(0, done).forEach((step) => step());
    if (a.border === 'frame') stroke([[12, 12], [W - 12, 12], [W - 12, H - 12], [12, H - 12], [12, 12]], P(4), 3, 1);
    if (a.border === 'scallop') {
      for (let x = 15; x < W - 10; x += 22) { loop(x, 11, 9, 6, P(5), 2); loop(x, H - 11, 9, 6, P(5), 2); }
      for (let y = 30; y < H - 20; y += 22) { loop(11, y, 6, 9, P(5), 2); loop(W - 11, y, 6, 9, P(5), 2); }
    }
    if (a.border === 'boxes') {
      for (let x = 10, i = 0; x < W - 10; x += 18, i++) { g.fillStyle = P(i); g.fillRect(x, 7, 10, 8); g.fillRect(x, H - 15, 10, 8); }
      for (let y = 25, i = 0; y < H - 20; y += 18, i++) { g.fillStyle = P(i); g.fillRect(7, y, 8, 10); g.fillRect(W - 15, y, 8, 10); }
    }
    // Grubby fingers and spills as the scene wears.
    for (let i = 0; i < Math.round(mood.wear * 9); i++) {
      g.fillStyle = `rgba(${Math.round(120 + random() * 40)},${Math.round(90 + random() * 30)},60,${0.08 + random() * 0.12})`;
      g.beginPath();
      g.ellipse(random() * W, random() * H, 12 + random() * 40, 10 + random() * 26, random() * 3, 0, Math.PI * 2);
      g.fill();
    }
    const drawing = new THREE.CanvasTexture(canvas);
    drawing.colorSpace = THREE.SRGBColorSpace;
    drawing.anisotropy = 8;

    const sheetW = 0.3, sheetD = 0.21;
    const sheetGeometry = new THREE.PlaneGeometry(sheetW, sheetD, 16, 12);
    sheetGeometry.rotateX(-Math.PI / 2);
    const curl = mix(0.012, 0.045, mood.wear) * (0.6 + random() * 0.8);
    const corner = random() < 0.5 ? -1 : 1;
    const sheetPosition = sheetGeometry.getAttribute('position');
    for (let i = 0; i < sheetPosition.count; i++) {
      const u = (sheetPosition.getX(i) * corner) / sheetW + 0.5, v = -sheetPosition.getZ(i) / sheetD + 0.5;
      const lift = Math.max(0, u + v - 1.45) ** 2 * curl * 6;
      sheetPosition.setY(i, 0.0012 + lift + Math.sin(u * 9 + v * 5) * 0.0004);
    }
    sheetGeometry.computeVertexNormals();
    const sheet = new THREE.Group();
    const page = new THREE.Mesh(sheetGeometry, new THREE.MeshStandardMaterial({ map: drawing, roughness: 0.92, side: THREE.DoubleSide }));
    page.castShadow = page.receiveShadow = true;
    sheet.add(page);
    sheet.position.set(-0.07, 0, -0.035);
    sheet.rotation.y = jit(0.22);
    s.root.add(sheet);
    const pageCount = a.pages === 'pad' ? 7 : a.pages === 'stack' ? 4 : 1;
    const sheetLift = a.pages === 'clipboard' ? 0.007 : (pageCount - 1) * 0.0016;
    sheet.position.y = sheetLift;
    if (pageCount > 1) for (let i = 0; i < pageCount - 1; i++) {
      const backing = new THREE.Mesh(new THREE.BoxGeometry(sheetW, 0.0014, sheetD), s.material('#eee8d6'));
      backing.position.set(a.pages === 'stack' ? (i % 2 ? 0.004 : -0.003) : 0, -sheetLift + 0.0007 + i * 0.0016, a.pages === 'stack' ? (i % 2) * 0.003 : 0);
      backing.castShadow = backing.receiveShadow = true; sheet.add(backing);
    }
    if (a.pages === 'pad') {
      const glue = new THREE.Mesh(new THREE.BoxGeometry(sheetW, sheetLift, 0.003), s.material('#596b75'));
      glue.position.set(0, -sheetLift / 2, -sheetD / 2); sheet.add(glue);
    }
    if (a.pages === 'clipboard') {
      const board = new THREE.Mesh(new THREE.BoxGeometry(sheetW + 0.018, 0.007, sheetD + 0.025), s.material('#b78d56'));
      board.position.y = -0.0035; sheet.add(board);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.005, 0.018), s.material('#aeb8b5', { metalness: 0.5, roughness: 0.3 }));
      clip.position.set(0, 0.004, -sheetD / 2 + 0.007); sheet.add(clip);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.002, 6, 18, Math.PI), s.material('#707a77', { metalness: 0.4 }));
      lip.rotation.x = -Math.PI / 2; lip.position.set(0, 0.007, -sheetD / 2 + 0.008); sheet.add(lip);
    }

    if (a.offPage) {
      const marks = document.createElement('canvas');
      marks.width = 256;
      marks.height = 192;
      const m = marks.getContext('2d')!;
      m.lineCap = m.lineJoin = 'round';
      const colour = P(a.drawing === 'monster' ? 7 : a.drawing === 'rainbow' ? 4 : 0);
      for (const [alpha, width] of [[0.5, 9], [0.8, 5]]) {
        m.globalAlpha = alpha;
        m.strokeStyle = colour;
        m.lineWidth = width;
        m.beginPath();
        for (let i = 0; i < 16; i++) {
          const x = 20 + (i / 15) * 210 + jit(6), y = i % 2 ? 30 + random() * 40 : 120 + random() * 50;
          if (i) m.lineTo(x, y); else m.moveTo(x, y);
        }
        m.stroke();
      }
      const texture = new THREE.CanvasTexture(marks);
      texture.colorSpace = THREE.SRGBColorSpace;
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
      decal.rotation.x = -Math.PI / 2;
      decal.position.set(sheetW / 2 + 0.02, 0.0006 - sheetLift, sheetD / 2 - 0.05);
      decal.receiveShadow = true;
      sheet.add(decal);
    }

    // ---- Crayons: every stick is merged into one vertex-coloured mesh ------------------
    const R = a.profile === 'chunky' ? 0.009 : 0.006;
    const segments = a.profile === 'triangle' ? 3 : a.profile === 'hexagon' ? 6 : 10;
    const parts: THREE.BufferGeometry[] = [];
    const tinted = (geometry: THREE.BufferGeometry, colour: THREE.Color, matrix: THREE.Matrix4) => {
      geometry.applyMatrix4(matrix);
      const count = geometry.getAttribute('position').count;
      const colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      parts.push(geometry);
    };
    const up = new THREE.Vector3(0, 1, 0);
    const offset = (y: number) => new THREE.Matrix4().makeTranslation(0, y, 0);
    /** One stick along its own Y axis, centred, tip at +Y. `piece` is whole, the tip half or the butt half. */
    const stick = (hex: string, length: number, matrix: THREE.Matrix4, piece: 'whole' | 'tip' | 'butt', into = tinted) => {
      const wax = new THREE.Color(hex);
      const wrap = wax.clone().lerp(new THREE.Color('#f3ecdb'), 0.42);
      const band = wax.clone().multiplyScalar(0.45);
      const tip = piece === 'butt' ? 0 : 0.011;
      const blunt = mix(0.0009, 0.0034, mood.wear * (0.4 + random() * 0.6));
      into(new THREE.CylinderGeometry(R, R, length - tip, segments), wax, matrix.clone().multiply(offset(-tip / 2)));
      if (tip) into(new THREE.CylinderGeometry(blunt * (a.profile === 'chunky' ? 1.5 : 1), R * 0.94, tip, segments), wax, matrix.clone().multiply(offset(length / 2 - tip / 2)));
      const sleeve = piece === 'whole' ? length * 0.6 : piece === 'tip' ? length * 0.42 : length * 0.86;
      const sleeveAt = piece === 'whole' ? -length * 0.1 : piece === 'tip' ? -length * 0.29 : length * 0.07;
      if (a.wrappers !== 'bare') into(new THREE.CylinderGeometry(R * 1.1, R * 1.1, sleeve, segments), wrap, matrix.clone().multiply(offset(sleeveAt)));
      if (a.wrappers === 'bands') for (const end of piece === 'tip' ? [1] : [-1, 1]) into(new THREE.CylinderGeometry(R * 1.14, R * 1.14, 0.0022, segments), band, matrix.clone().multiply(offset(sleeveAt + end * (sleeve / 2 - 0.004))));
      if (a.wrappers === 'striped') for (let i = 0; i < 4; i++) into(new THREE.CylinderGeometry(R * 1.14, R * 1.14, 0.0018, segments), band, matrix.clone().multiply(offset(sleeveAt + (i / 3 - 0.5) * sleeve * 0.72)));
    };
    const along = (base: THREE.Vector3, direction: THREE.Vector3, length: number) =>
      new THREE.Matrix4().compose(base.clone().addScaledVector(direction, length / 2), new THREE.Quaternion().setFromUnitVectors(up, direction), new THREE.Vector3(1, 1, 1));
    const fullLength = () => mix(0.106, 0.066, mood.wear * random());
    let colourIndex = Math.floor(random() * pal.length);
    const nextColour = () => pal[colourIndex++ % pal.length];

    const total = Math.round(mix(8, 22, mood.density) + random() * 2);
    let held = 0;
    const holder = new THREE.Group();
    holder.position.set(0.17, 0, 0.03 + jit(0.02));
    s.root.add(holder);
    const cast = (node: THREE.Object3D) => { node.traverse((child) => { child.castShadow = child.receiveShadow = true; }); return node; };
    let mouth = new THREE.Vector3(0.1, 0, 0.1), spillHeading = Math.PI * 0.75;

    if (a.box === 'tin') {
      const tinHeight = 0.1, tinRadius = 0.042;
      const label = document.createElement('canvas');
      label.width = 256;
      label.height = 96;
      const l = label.getContext('2d')!;
      l.fillStyle = '#c9cccb';
      l.fillRect(0, 0, 256, 96);
      l.fillStyle = mood.cheer > 0.5 ? '#c93a2e' : '#3f5d7a';
      l.fillRect(0, 16, 256, 62);
      l.fillStyle = '#f4ecd2';
      for (let i = 0; i < 4; i++) { l.beginPath(); l.arc(32 + i * 64, 47, 20, 0, Math.PI * 2); l.fill(); }
      l.fillStyle = `rgba(110,70,40,${mood.wear * 0.5})`;
      for (let i = 0; i < 14; i++) l.fillRect(random() * 256, random() * 96, 6 + random() * 30, 3 + random() * 8);
      const wrap = new THREE.CanvasTexture(label);
      wrap.colorSpace = THREE.SRGBColorSpace;
      const can = new THREE.Mesh(new THREE.CylinderGeometry(tinRadius, tinRadius, tinHeight, 28, 1, true), new THREE.MeshStandardMaterial({ map: wrap, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
      can.position.y = tinHeight / 2;
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(tinRadius, tinRadius, 0.003, 28), s.material('#b9bcbb', { metalness: 0.3 }));
      floor.position.y = 0.0015;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(tinRadius, 0.0018, 6, 28), s.material('#d7d9d6', { metalness: 0.4, roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = tinHeight;
      holder.add(cast(can), cast(floor), cast(rim));
      holder.position.set(0.16, 0, -0.06);
      held = Math.min(total - 3, a.profile === 'chunky' ? 7 : 7 + Math.floor(random() * 3));
      for (let i = 0; i < held; i++) {
        const azimuth = (i / held) * Math.PI * 2 + jit(0.05), tilt = a.profile === 'chunky' ? 0.04 + random() * 0.06 : 0.07 + random() * 0.09;
        const direction = new THREE.Vector3(Math.sin(tilt) * Math.cos(azimuth), Math.cos(tilt), Math.sin(tilt) * Math.sin(azimuth));
        const footRadius = a.profile === 'chunky' ? 0.024 : 0.021;
        const foot = new THREE.Vector3(Math.cos(azimuth) * footRadius, 0.004, Math.sin(azimuth) * footRadius).add(holder.position);
        stick(nextColour(), 0.125 + random() * 0.012, along(foot, direction, 0.13), 'whole');
      }
      mouth = holder.position.clone().add(new THREE.Vector3(-0.04, 0, 0.1));
      spillHeading = Math.PI * 0.8;
    } else {
      const bw = 0.092, bh = 0.108, bd = 0.038;
      const art = document.createElement('canvas');
      art.width = 200;
      art.height = 256;
      const c = art.getContext('2d')!;
      c.fillStyle = '#f2c230';
      c.fillRect(0, 0, 200, 256);
      c.fillStyle = '#2f8a4a';
      for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(0, 150 + i * 44); c.lineTo(100, 110 + i * 44); c.lineTo(200, 150 + i * 44); c.lineTo(200, 172 + i * 44); c.lineTo(100, 132 + i * 44); c.lineTo(0, 172 + i * 44); c.fill(); }
      c.fillStyle = '#2f8a4a';
      c.beginPath(); c.ellipse(100, 62, 84, 36, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fdf6d8';
      c.font = 'bold 30px Georgia, serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('CRAYONS', 100, 64, 150);
      c.fillStyle = `rgba(120,90,50,${mood.wear * 0.35})`;
      for (let i = 0; i < 16; i++) c.fillRect(random() * 200, random() * 256, 4 + random() * 40, 2 + random() * 6);
      const artTexture = new THREE.CanvasTexture(art);
      artTexture.colorSpace = THREE.SRGBColorSpace;
      const card = s.material('#f2c230', { roughness: 0.8 });
      const printed = new THREE.MeshStandardMaterial({ map: artTexture, roughness: 0.8 });
      const inner = s.material('#4a3c24', { roughness: 1 });
      const carton = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [card, card, inner, card, printed, printed]);
      body.position.y = bh / 2;
      const flap = new THREE.Group();
      flap.position.set(0, bh, -bd / 2);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.04, 0.0012), card);
      lid.position.y = 0.02;
      const tuck = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 0.014, 0.0012), card);
      tuck.position.set(0, 0.046, 0.004);
      tuck.rotation.x = 0.6;
      flap.add(lid, tuck);
      flap.rotation.x = -0.55 - random() * 0.5;
      carton.add(body, flap);
      cast(carton);
      holder.add(carton);
      const lying = a.box !== 'upright';
      const yaw = lying ? -Math.PI * 0.72 + jit(0.25) : jit(0.35);
      holder.rotation.y = yaw;
      if (lying) {
        carton.rotation.x = -Math.PI / 2;
        carton.position.y = bd / 2;
        carton.position.z = bh / 2;
      } else holder.position.set(0.16, 0, -0.06);
      if (a.box === 'crushed') {
        carton.scale.z = 0.28;
        carton.position.y = bd * 0.14;
        carton.rotation.z = jit(0.12);
        flap.rotation.x = -1.45;
      }
      holder.updateMatrixWorld(true);
      if (a.box !== 'crushed') {
        held = a.box === 'upright' ? Math.min(total - 3, 10 + Math.floor(random() * 5)) : Math.min(total - 4, 4 + Math.floor(random() * 3));
        if (a.profile === 'chunky') held = Math.min(held, 8);
        for (let i = 0; i < held; i++) {
          const row = i % 2, column = Math.floor(i / 2);
          const slide = lying ? 0.012 + random() * 0.05 : random() * 0.006;
          const local = new THREE.Vector3(-bw / 2 + R * 1.35 + column * R * 2.2, 0.004 + slide, (row - 0.5) * R * 2.2);
          const base = local.applyMatrix4(carton.matrixWorld);
          const direction = new THREE.Vector3(jit(lying ? 0.1 : 0.02), 1, 0).normalize().transformDirection(carton.matrixWorld);
          stick(nextColour(), 0.106, along(base, direction, 0.106), 'whole');
        }
      }
      const top = new THREE.Vector3(0, bh, 0).applyMatrix4(carton.matrixWorld);
      const outward = lying ? new THREE.Vector3(0, 1, 0).transformDirection(carton.matrixWorld) : new THREE.Vector3(-0.8, 0, 0.6);
      mouth = lying ? top.addScaledVector(outward, 0.05) : holder.position.clone().add(new THREE.Vector3(-0.07, 0, 0.11));
      spillHeading = Math.atan2(outward.z, outward.x);
    }

    // Loose crayons: a fan out of the mouth, a few on the page, the rest wherever they rolled.
    const lain: { x: number; z: number; dx: number; dz: number; length: number }[] = [];
    const pointSegment = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => {
      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz)));
      return Math.hypot(px-ax-dx*t,pz-az-dz*t);
    };
    const overlaps = (x: number, z: number, dx: number, dz: number, length: number) => lain.some(other => {
      const ax=x-dx*length/2,az=z-dz*length/2,bx=x+dx*length/2,bz=z+dz*length/2;
      const cx=other.x-other.dx*other.length/2,cz=other.z-other.dz*other.length/2,ex=other.x+other.dx*other.length/2,ez=other.z+other.dz*other.length/2;
      const cross=(px:number,pz:number,qx:number,qz:number,rx:number,rz:number)=>(qx-px)*(rz-pz)-(qz-pz)*(rx-px);
      if(cross(ax,az,bx,bz,cx,cz)*cross(ax,az,bx,bz,ex,ez)<0&&cross(cx,cz,ex,ez,ax,az)*cross(cx,cz,ex,ez,bx,bz)<0)return true;
      return Math.min(pointSegment(ax,az,cx,cz,ex,ez),pointSegment(bx,bz,cx,cz,ex,ez),pointSegment(cx,cz,ax,az,bx,bz),pointSegment(ex,ez,ax,az,bx,bz))<R*2.6;
    });
    const lay = (x: number, z: number, yaw: number, lift: number, hex: string) => {
      const length = fullLength();
      const direction = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const originalX=x,originalZ=z,escape=Math.atan2(z-sheet.position.z,x-sheet.position.x)+jit(.15);
      for(let attempt=0;attempt<50&&overlaps(x,z,direction.x,direction.z,length+.018);attempt++){
        const distance=(attempt+1)*.016;
        x=originalX+Math.cos(escape)*distance;z=originalZ+Math.sin(escape)*distance;
      }
      lain.push({x,z,dx:direction.x,dz:direction.z,length:length+.018});
      const local=new THREE.Vector3(x-sheet.position.x,0,z-sheet.position.z).applyAxisAngle(up,-sheet.rotation.y);
      const onPaper=Math.abs(local.x)<sheetW/2&&Math.abs(local.z)<sheetD/2;
      lift=onPaper?sheetLift+.0016:0;
      const turn=new THREE.Quaternion().setFromUnitVectors(up,direction);
      let support=0;
      const outer=R*(a.wrappers==='bare'?1:a.wrappers==='plain'?1.1:1.14);
      for(let i=0;i<segments;i++)support=Math.max(support,-new THREE.Vector3(Math.sin(i/segments*Math.PI*2)*outer,0,Math.cos(i/segments*Math.PI*2)*outer).applyQuaternion(turn).y);
      const y = support + lift;
      const snapped = random() < mix(0, 0.92, a.broken);
      if (!snapped) return stick(hex, length, along(new THREE.Vector3(x, y, z).addScaledVector(direction, -length / 2), direction, length), 'whole');
      const cut = mix(0.35, 0.62, random()) * length;
      const kink = jit(0.7), gap = 0.004 + random() * 0.014;
      const butt = new THREE.Vector3(x, y, z).addScaledVector(direction, -cut - gap / 2);
      stick(hex, cut, along(butt, direction, cut), 'butt');
      const bent = new THREE.Vector3(Math.cos(yaw + kink), 0, Math.sin(yaw + kink));
      let tipSupport=0;const tipTurn=new THREE.Quaternion().setFromUnitVectors(up,bent);
      for(let i=0;i<segments;i++)tipSupport=Math.max(tipSupport,-new THREE.Vector3(Math.sin(i/segments*Math.PI*2)*outer,0,Math.cos(i/segments*Math.PI*2)*outer).applyQuaternion(tipTurn).y);
      const start = new THREE.Vector3(x, tipSupport + lift, z).addScaledVector(direction, gap / 2).add(new THREE.Vector3(jit(0.008), 0, jit(0.008)));
      stick(hex, length - cut, along(start, bent, length - cut), 'tip');
    };
    const loose = Math.max(3, total - held);
    for (let i = 0; i < loose; i++) {
      const where = i < 2 ? 'page' : random() < 0.6 ? 'fan' : 'far';
      if (where === 'page') {
        const local = new THREE.Vector3(jit(sheetW * 0.3), 0, jit(sheetD * 0.25) + sheetD * 0.12).applyAxisAngle(up, sheet.rotation.y).add(sheet.position);
        lay(local.x, local.z, random() * Math.PI * 2, local.y + 0.0016, nextColour());
      } else if (where === 'fan') {
        const angle = spillHeading + jit(0.7), distance = 0.02 + random() * 0.13;
        lay(mouth.x + Math.cos(angle) * distance, mouth.z + Math.sin(angle) * distance, angle + jit(0.9), 0, nextColour());
      } else {
        const angle = random() * Math.PI * 2, distance = 0.16 + random() * 0.1;
        lay(-0.02 + Math.cos(angle) * distance * 1.25, Math.sin(angle) * distance * 0.8 + 0.02, random() * Math.PI * 2, 0, nextColour());
      }
    }
    const waxMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: mix(0.45, 0.8, mood.wear) });
    const crayons = new THREE.Mesh(mergeGeometries(parts), waxMaterial);
    crayons.castShadow = crayons.receiveShadow = true;
    s.root.add(crayons);
    for (const part of parts) part.dispose();

    // One crayon is still rolling gently where it was dropped.
    const rollerParts: THREE.BufferGeometry[] = [];
    stick(nextColour(), 0.104, new THREE.Matrix4().makeRotationZ(-Math.PI / 2), 'whole', (geometry, colour, matrix) => {
      geometry.applyMatrix4(matrix);
      const count = geometry.getAttribute('position').count;
      const colours = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colour.toArray(colours, i * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
      rollerParts.push(geometry);
    });
    const track = new THREE.Group();
    track.position.set(-0.1 + jit(0.05), R * (a.profile === 'triangle' ? .5 : 1) * (a.wrappers==='bare'?1:a.wrappers==='plain'?1.1:1.14), 0.15 + jit(0.015));
    track.rotation.y = jit(0.5);
    const roller = new THREE.Mesh(mergeGeometries(rollerParts), waxMaterial);
    roller.geometry.computeBoundingBox();
    track.position.y = -roller.geometry.boundingBox!.min.y;
    roller.castShadow = roller.receiveShadow = true;
    track.add(roller);
    s.root.add(track);
    for (const part of rollerParts) part.dispose();
    const travel = a.profile === 'triangle' || a.profile === 'hexagon' ? 0 : mix(0, 0.022, mood.energy), pace = mix(0.6, 2.4, mood.energy);

    const tool = new THREE.Group(); tool.position.set(0.225, 0, -0.16); tool.rotation.y = jit(0.25); s.root.add(tool);
    const localBox = (dimensions: [number, number, number], at: [number, number, number], material: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material); mesh.position.set(...at); mesh.castShadow = mesh.receiveShadow = true; tool.add(mesh); return mesh;
    };
    if (a.accessory === 'sharpener') {
      const shell = new THREE.Shape([new THREE.Vector2(-0.024, 0), new THREE.Vector2(0.024, 0), new THREE.Vector2(0.024, 0.025), new THREE.Vector2(-0.024, 0.025)]);
      const bore = new THREE.Path(); bore.absarc(0, 0.013, 0.008, 0, Math.PI * 2, true); shell.holes.push(bore);
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shell, { depth: 0.029, bevelEnabled: false, curveSegments: 18 }), s.material('#617d81'));
      mesh.position.z = -0.0145; mesh.castShadow = mesh.receiveShadow = true; tool.add(mesh);
      localBox([0.031, 0.0015, 0.009], [0, 0.0257, 0], s.material('#bfc6c1', { metalness: 0.6, roughness: 0.25 }));
    } else if (a.accessory === 'rubbing') {
      localBox([0.065, 0.004, 0.054], [0, 0.002, 0], s.material('#bd9562'));
      for (let i = 0; i < 8; i++) localBox([0.053, 0.002, 0.002], [0, 0.005, -0.021 + i * 0.006], s.material('#d5b77d'));
    } else if (a.accessory === 'eraser') {
      localBox([0.047, 0.014, 0.026], [0, 0.007, 0], s.material('#dca8a0'));
      localBox([0.024, 0.0147, 0.0267], [0.006, 0.00735, 0], s.material('#eee8d4'));
    } else {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.017, 0.03, 32), s.material('#759b88', { side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.001; tool.add(ring);
      localBox([0.018, 0.002, 0.022], [0.032, 0.001, 0], s.material('#759b88'));
    }
    if (a.leftovers === 'wrapper') {
      const scrap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 16, 1, true, 0, Math.PI * 1.35), s.material('#e4c99b', { side: THREE.DoubleSide }));
      scrap.rotation.z = Math.PI / 2; scrap.position.set(0.18, 0.009, 0.17); s.root.add(scrap);
    }
    if (a.leftovers === 'shavings') for (let i = 0; i < 7; i++) {
      const curl = new THREE.Mesh(new THREE.TorusGeometry(0.005 + random() * 0.003, 0.0013, 5, 13, Math.PI * 1.35), s.material(P(i)));
      curl.rotation.x = -Math.PI / 2; curl.rotation.z = random() * 5; curl.position.set(0.18 + jit(0.024), 0.0015, -0.17 + jit(0.026)); s.root.add(curl);
    }
    if (a.leftovers === 'test') {
      s.box([0.072, 0.001, 0.025], [0.17, 0.0005, 0.17], s.material('#efe8d5'));
      for (let i = 0; i < 5; i++) s.box([0.003, 0.0006, 0.017], [0.145 + i * 0.012, 0.0012, 0.17], s.material(P(i))).rotation.y = 0.2;
    }

    return s.finish({
      update: (_dt, time) => {
        const shift = Math.sin(time * pace) * travel;
        roller.position.z = shift;
        roller.rotation.x = shift / (R * 1.14);
      },
    });
  },
});
