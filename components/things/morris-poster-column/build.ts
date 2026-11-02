import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;

function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const KINDS = {
  cabaret: 'A red cabaret bill with a high-kicking dancer: tonight, late, loud.',
  cinema: 'A midnight-blue film poster with a projector beam and two faces close together.',
  election: 'A pale election poster with a tricolour band, a candidate and VOTEZ.',
  'lost-dog': 'A plain white home-made notice: PERDU, a drawing of a small dog, tear-off phone strips.',
  circus: 'A yellow and red circus bill with a sunburst and a star.',
  concert: 'A cream recital poster with a violin and lines of sober type.',
  aperitif: 'A deep green drinks advertisement with a golden bottle.',
  exhibition: 'A modern art exhibition poster of flat coloured shapes.',
} as const;
type Kind = keyof typeof KINDS;
const ALL = Object.keys(KINDS) as Kind[];

function title(g: G, text: string, cx: number, y: number, size: number, max: number, colour: string) {
  g.fillStyle = colour;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${Math.round(size)}px Georgia, 'Times New Roman', serif`;
  g.fillText(text, cx, y, max);
}
function lines(g: G, x: number, y: number, w: number, count: number, gap: number, colour: string, random: () => number) {
  g.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const width = w * (0.5 + random() * 0.5);
    g.fillRect(x + (w - width) / 2, y + i * gap, width, gap * 0.38);
  }
}

function poster(g: G, kind: Kind, x: number, y: number, w: number, h: number, random: () => number) {
  g.save();
  g.translate(x + w / 2, y + h / 2);
  g.rotate((random() - 0.5) * 0.035);
  g.translate(-w / 2, -h / 2);
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  const cx = w / 2;
  if (kind === 'cabaret') {
    g.fillStyle = '#c4261d'; g.fillRect(0, 0, w, h);
    title(g, 'CABARET', cx, h * 0.12, h * 0.13, w * 0.9, '#f6cf3c');
    g.fillStyle = '#16110f';
    // Skirt, body, head and one kicked leg.
    g.beginPath(); g.moveTo(cx - w * 0.34, h * 0.66); g.quadraticCurveTo(cx, h * 0.36, cx + w * 0.34, h * 0.66); g.quadraticCurveTo(cx, h * 0.74, cx - w * 0.34, h * 0.66); g.fill();
    g.fillRect(cx - w * 0.05, h * 0.3, w * 0.1, h * 0.2);
    g.beginPath(); g.arc(cx, h * 0.26, w * 0.07, 0, 7); g.fill();
    g.lineWidth = w * 0.045; g.strokeStyle = '#16110f'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx - w * 0.05, h * 0.66); g.lineTo(cx - w * 0.1, h * 0.84); g.stroke();
    g.beginPath(); g.moveTo(cx + w * 0.06, h * 0.62); g.lineTo(cx + w * 0.36, h * 0.44); g.stroke();
    g.fillStyle = '#f3e7cf';
    g.beginPath(); g.moveTo(cx - w * 0.34, h * 0.665); g.quadraticCurveTo(cx, h * 0.76, cx + w * 0.34, h * 0.665); g.quadraticCurveTo(cx, h * 0.72, cx - w * 0.34, h * 0.665); g.fill();
    title(g, 'CE SOIR', cx, h * 0.92, h * 0.07, w * 0.8, '#f3e7cf');
  } else if (kind === 'cinema') {
    g.fillStyle = '#141f3d'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(250,236,170,0.5)';
    g.beginPath(); g.moveTo(w, 0); g.lineTo(0, h * 0.42); g.lineTo(0, h * 0.75); g.closePath(); g.fill();
    g.fillStyle = '#0b1022';
    g.beginPath(); g.arc(cx - w * 0.14, h * 0.5, w * 0.17, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + w * 0.15, h * 0.46, w * 0.15, 0, 7); g.fill();
    g.fillRect(cx - w * 0.36, h * 0.62, w * 0.72, h * 0.14);
    title(g, 'CINEMA', cx, h * 0.12, h * 0.12, w * 0.9, '#f4f0e4');
    g.fillStyle = '#c62a23'; g.fillRect(0, h * 0.8, w, h * 0.12);
    title(g, 'MINUIT', cx, h * 0.86, h * 0.08, w * 0.8, '#f4f0e4');
  } else if (kind === 'election') {
    g.fillStyle = '#efeadb'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#243f8f'; g.fillRect(0, 0, w / 3, h * 0.07);
    g.fillStyle = '#c62a23'; g.fillRect(w * 2 / 3, 0, w / 3, h * 0.07);
    g.fillStyle = '#39475c';
    g.beginPath(); g.ellipse(cx, h * 0.34, w * 0.16, h * 0.12, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx, h * 0.62, w * 0.34, h * 0.16, 0, Math.PI, 0); g.fill();
    title(g, 'VOTEZ', cx, h * 0.74, h * 0.13, w * 0.9, '#243f8f');
    g.fillStyle = '#c62a23'; g.fillRect(w * 0.1, h * 0.83, w * 0.8, h * 0.035);
    lines(g, w * 0.15, h * 0.89, w * 0.7, 2, h * 0.035, '#39475c', random);
  } else if (kind === 'lost-dog') {
    g.fillStyle = '#f5f2e9'; g.fillRect(0, 0, w, h);
    title(g, 'PERDU', cx, h * 0.13, h * 0.16, w * 0.86, '#161616');
    g.fillStyle = '#8a5a2c';
    g.beginPath(); g.ellipse(cx, h * 0.5, w * 0.24, h * 0.1, 0, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + w * 0.24, h * 0.4, w * 0.11, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx + w * 0.17, h * 0.34); g.lineTo(cx + w * 0.2, h * 0.24); g.lineTo(cx + w * 0.27, h * 0.33); g.fill();
    g.fillRect(cx - w * 0.2, h * 0.55, w * 0.05, h * 0.1); g.fillRect(cx + w * 0.12, h * 0.55, w * 0.05, h * 0.1);
    g.lineWidth = w * 0.03; g.strokeStyle = '#8a5a2c'; g.beginPath(); g.moveTo(cx - w * 0.23, h * 0.47); g.lineTo(cx - w * 0.34, h * 0.36); g.stroke();
    g.fillStyle = '#161616'; g.beginPath(); g.arc(cx + w * 0.27, h * 0.385, w * 0.016, 0, 7); g.fill();
    lines(g, w * 0.12, h * 0.71, w * 0.76, 2, h * 0.045, '#333', random);
    g.strokeStyle = '#555'; g.lineWidth = 2;
    for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(w * i / 7, h * 0.84); g.lineTo(w * i / 7, h); g.stroke(); }
    g.beginPath(); g.moveTo(0, h * 0.84); g.lineTo(w, h * 0.84); g.stroke();
  } else if (kind === 'circus') {
    g.fillStyle = '#f1b91d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#cf2f22';
    for (let i = 0; i < 12; i += 2) {
      g.beginPath(); g.moveTo(cx, h * 0.52);
      g.lineTo(cx + Math.cos(i * Math.PI / 6) * w * 2, h * 0.52 + Math.sin(i * Math.PI / 6) * w * 2);
      g.lineTo(cx + Math.cos((i + 1) * Math.PI / 6) * w * 2, h * 0.52 + Math.sin((i + 1) * Math.PI / 6) * w * 2); g.fill();
    }
    g.fillStyle = '#1f3f9a'; g.beginPath();
    for (let i = 0; i < 10; i++) { const r = (i % 2 ? 0.14 : 0.32) * w; const t = i * Math.PI / 5 - Math.PI / 2; g.lineTo(cx + Math.cos(t) * r, h * 0.52 + Math.sin(t) * r); }
    g.fill();
    g.fillStyle = '#f6efdc'; g.fillRect(0, h * 0.05, w, h * 0.16);
    title(g, 'CIRQUE', cx, h * 0.135, h * 0.13, w * 0.88, '#cf2f22');
  } else if (kind === 'concert') {
    g.fillStyle = '#e9d8ae'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a2018'; g.lineWidth = 4; g.strokeRect(w * 0.06, h * 0.03, w * 0.88, h * 0.94);
    title(g, 'CONCERT', cx, h * 0.12, h * 0.1, w * 0.8, '#2a2018');
    g.fillStyle = '#7a3c18';
    g.beginPath(); g.ellipse(cx, h * 0.52, w * 0.15, h * 0.075, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx, h * 0.42, w * 0.12, h * 0.06, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2018'; g.fillRect(cx - w * 0.02, h * 0.22, w * 0.04, h * 0.26);
    lines(g, w * 0.16, h * 0.68, w * 0.68, 5, h * 0.045, '#2a2018', random);
  } else if (kind === 'aperitif') {
    g.fillStyle = '#1d6446'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9b62c';
    g.fillRect(cx - w * 0.13, h * 0.38, w * 0.26, h * 0.42);
    g.fillRect(cx - w * 0.05, h * 0.22, w * 0.1, h * 0.18);
    g.fillStyle = '#f5ecd0'; g.fillRect(cx - w * 0.1, h * 0.5, w * 0.2, h * 0.14);
    title(g, 'APERITIF', cx, h * 0.11, h * 0.1, w * 0.88, '#f5ecd0');
    title(g, 'FRAIS', cx, h * 0.91, h * 0.08, w * 0.7, '#e9b62c');
  } else {
    g.fillStyle = '#e7e2d7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2757a8'; g.fillRect(w * 0.1, h * 0.2, w * 0.45, h * 0.34);
    g.fillStyle = '#e8762a'; g.beginPath(); g.arc(w * 0.62, h * 0.5, w * 0.24, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a'; g.fillRect(w * 0.2, h * 0.6, w * 0.6, h * 0.03);
    title(g, 'EXPOSITION', cx, h * 0.1, h * 0.075, w * 0.86, '#1a1a1a');
    lines(g, w * 0.14, h * 0.76, w * 0.72, 3, h * 0.05, '#1a1a1a', random);
  }
  g.restore();
}

export default defineThing({
  questions: {
    main: choice('What does the biggest poster, facing the street, advertise?', KINDS),
    beside: choice('What is pasted beside and around it?', KINDS),
    paste: choice('What state are the posters in?', {
      fresh: 'Pasted this morning: crisp, bright, still shining with glue.',
      layered: 'Weeks of bills pasted over each other at odd angles, corners overlapping.',
      peeling: 'Peeling away in long strips that curl off the drum, older posters showing underneath.',
      stripped: 'Scraped almost bare between seasons, a few stubborn fragments left on the iron.',
    }),
    cap: choice('What crowns the column?', {
      dome: 'A hexagonal awning under a fish-scaled dome with a small finial, the classic.',
      spire: 'A taller scaled onion that rises to a sharp spike.',
      plain: 'A flat modern lid with a glowing band, the scales long gone.',
    }),
    paintwork: choice('What colour is the ironwork?', {
      green: 'Dark carriage green.',
      black: 'Near-black with a green cast.',
      oxblood: 'Deep oxblood red.',
      grey: 'Battleship grey, municipal.',
    }),
    lit: noul('Is the band under the cap lit from inside?'),
    note: noul('Has someone taped a small handwritten notice over the main poster?'),
    foot: choice('What is at the foot of the column?', {
      nothing: 'Nothing but pavement.',
      paste: 'A bill-poster\'s paste bucket, a long brush and a roll of posters.',
      scraps: 'Torn poster scraps lying where they fell.',
      dog: 'A small dog sitting and looking up at the posters.',
      pigeons: 'Two pigeons pecking about.',
    }),
    baseDetail: choice('What cast detail appears on the plinth?', { plain: 'A plain stepped plinth.', flutes: 'A ring of narrow flutes.', panels: 'Eight recessed-looking framed panels.', studs: 'Two rows of large cast studs.' }),
    drumBands: choice('What holds the edges of the poster drum?', { plain: 'Only the original bottom ring.', brass: 'Narrow brass bands at both ends.', doubled: 'Double black rings at both ends.', beaded: 'A beaded ring under the posters.' }),
    capBrackets: choice('What supports the cap overhang?', { none: 'No exposed brackets.', curved: 'Six small curved brackets.', angled: 'Six triangular iron stays.', scroll: 'Six ornamental scroll brackets.' }),
    bandPattern: choice('How is the band beneath the cap divided?', { clear: 'A continuous luminous band.', panes: 'Twelve narrow divided panes.', grille: 'A fine grille across the band.', arches: 'Six arched iron divisions.' }),
    municipalBadge: choice('What mark is on the base?', { none: 'No badge.', oval: 'A plain oval municipal badge.', numbered: 'An enamel maintenance number.', rosette: 'A cast floral rosette.' }),
    paving: choice('What pavement surrounds the column?', { bare: 'Bare pavement.', slabs: 'Large square flagstones.', radial: 'A radial ring of wedge-shaped stones.', mosaic: 'A circular cream and grey mosaic border.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const R = 0.62, Y0 = 0.45, Y1 = 3.0, H = Y1 - Y0;
    const paintColour = new THREE.Color({ green: '#1e4a35', black: '#1a2420', oxblood: '#5c1f1f', grey: '#5d666a' }[a.paintwork]);
    const iron = s.material(paintColour, { metalness: 0.3, roughness: 0.5 });
    const gold = s.material('#b9963a', { metalness: 0.6, roughness: 0.4 });

    // Base.
    s.lathe([[0.8, 0], [0.8, 0.1], [0.72, 0.16], [0.7, 0.36], [0.66, 0.42], [R + 0.01, Y0]], iron);

    // Poster drum.
    const peel = a.paste === 'peeling' ? mix(0.5, 1, mood.wear) : a.paste === 'stripped' ? 0.5 : a.paste === 'layered' ? mood.wear * 0.5 : mood.wear * 0.15;
    const others = ALL.filter((kind) => kind !== a.main && kind !== a.beside);
    const any = () => others[Math.floor(random() * others.length)];
    const W = 2048, CH = 1344;
    const drum = paint(W, CH, (g, w, h) => {
      g.fillStyle = a.paste === 'stripped' ? `#${paintColour.getHexString()}` : '#cfc6ae';
      g.fillRect(0, 0, w, h);
      const cols = 5, cw = w / cols;
      const drawCell = (kind: Kind, x: number, y: number, pw: number, ph: number) => {
        if (a.paste === 'stripped' && random() < 0.72) {
          // Paste ghosts and a few paper fragments.
          g.fillStyle = 'rgba(214,205,180,0.35)'; g.fillRect(x + 6, y + 6, pw - 12, ph - 12);
          return;
        }
        poster(g, kind, x + 5, y + 5, pw - 10, ph - 10, random);
      };
      for (let c = 0; c < cols; c++) {
        const x = c * cw;
        if (c === 2) {
          drawCell(a.main, x - cw * 0.12, h * 0.03, cw * 1.24, h * 0.66);
          drawCell(a.beside, x, h * 0.7, cw, h * 0.28);
        } else {
          const split = mix(0.38, 0.62, random());
          const near = c === 1 || c === 3;
          const top = near && random() < 0.5;
          drawCell(near && top ? a.beside : any(), x, h * 0.02, cw, h * split);
          drawCell(near && !top ? a.beside : any(), x, h * (split + 0.02), cw, h * (0.96 - split));
        }
      }
      if (a.paste === 'layered') {
        for (let i = 0; i < 9; i++) {
          const pw = cw * mix(0.4, 0.75, random()), ph = pw * mix(1.2, 1.6, random());
          g.save();
          const px = random() * w, py = random() * (h - ph);
          g.translate(px, py); g.rotate((random() - 0.5) * 0.3); g.translate(-px, -py);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px + 4, py + 6, pw, ph);
          poster(g, i % 3 === 0 ? a.beside : any(), px, py, pw, ph, random);
          g.restore();
        }
      }
      // Tears: ragged strips showing what was pasted before.
      const old = ['#b9ae93', '#9c9a8a', '#c9b48a', '#8f7f6a', '#a8b0a4', '#b0584a', '#5a6f8a'];
      const tears = Math.round(peel * 26);
      for (let i = 0; i < tears; i++) {
        const tx = random() * w, ty = random() * h * 0.8, tw = 18 + random() * 70, th = 120 + random() * 520 * peel;
        g.beginPath();
        g.moveTo(tx, ty);
        for (let k = 1; k <= 6; k++) g.lineTo(tx + tw * (0.9 + random() * 0.3), ty + th * k / 6);
        for (let k = 6; k >= 0; k--) g.lineTo(tx + (random() - 0.5) * tw * 0.4, ty + th * k / 6);
        g.closePath();
        g.fillStyle = a.paste === 'stripped' ? `#${paintColour.getHexString()}` : old[Math.floor(random() * old.length)];
        g.fill();
        g.strokeStyle = 'rgba(250,246,236,0.9)'; g.lineWidth = 5; g.stroke();
      }
      if (a.note) {
        const nx = w / 2 - 40 + (random() - 0.5) * 120, ny = h * (0.3 + random() * 0.2);
        g.save(); g.translate(nx, ny); g.rotate((random() - 0.5) * 0.25);
        g.fillStyle = '#fbf8ea'; g.fillRect(-70, -90, 140, 180);
        lines(g, -55, -65, 110, 6, 22, '#2a3f8f', random);
        g.fillStyle = 'rgba(210,200,150,0.9)'; g.fillRect(-30, -100, 60, 22);
        g.restore();
      }
      // Sun-fade and street grime.
      g.fillStyle = `rgba(205,196,172,${mood.wear * 0.3})`; g.fillRect(0, 0, w, h);
      const grime = g.createLinearGradient(0, h * 0.7, 0, h);
      grime.addColorStop(0, 'rgba(60,50,40,0)'); grime.addColorStop(1, `rgba(60,50,40,${0.1 + mood.wear * 0.4})`);
      g.fillStyle = grime; g.fillRect(0, 0, w, h);
    });
    const drumMesh = s.mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true), new THREE.MeshStandardMaterial({ map: drum, roughness: a.paste === 'fresh' ? 0.45 : 0.85 }), [0, Y0 + H / 2, 0]);
    drumMesh.rotation.y = Math.PI;
    s.cylinder(R - 0.01, R - 0.01, H, [0, Y0 + H / 2, 0], iron, 24);
    s.ring(R + 0.012, 0.02, [0, Y0 + 0.02, 0], iron).rotation.x = Math.PI / 2;

    // Curling strips standing off the drum.
    const curls = Math.round(peel * (a.paste === 'peeling' ? 11 : 4));
    const paperMat = new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: 0.9, side: THREE.DoubleSide });
    const faces = ['#c4261d', '#141f3d', '#f1b91d', '#1d6446', '#e7e2d7'];
    for (let i = 0; i < curls; i++) {
      const theta = random() * Math.PI * 2, half = (0.05 + random() * 0.08) / R, length = 0.35 + random() * 0.6;
      const yBase = Y0 + 0.3 + random() * (H - 0.9 - length * 0.3);
      const rc = length / 2.6, rows = 10;
      const positions: number[] = [], index: number[] = [];
      for (let j = 0; j <= rows; j++) {
        const phi = (j / rows) * 2.6;
        const radius = R + 0.012 + rc * (1 - Math.cos(phi)), y = yBase + rc * Math.sin(phi) * 1.6 - (j / rows) * 0.1;
        for (const side of [-1, 1]) positions.push(Math.sin(theta + side * half) * radius, y, Math.cos(theta + side * half) * radius);
        if (j < rows) index.push(j * 2, j * 2 + 1, j * 2 + 2, j * 2 + 1, j * 2 + 3, j * 2 + 2);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      const curl = paperMat.clone();
      curl.color.set(random() < 0.6 ? '#e9e2cf' : faces[Math.floor(random() * faces.length)]);
      s.mesh(geometry, curl);
    }

    // Cap.
    const glow = new THREE.MeshStandardMaterial({ color: '#f5e8bd', emissive: '#ffd98a', emissiveIntensity: a.lit ? 1.3 * mix(0.8, 1.2, mood.warmth) : 0.03, roughness: 0.5 });
    s.cylinder(R + 0.03, R + 0.03, 0.2, [0, Y1 + 0.1, 0], glow, 32);
    const scales = paint(512, 256, (g, w, h) => {
      g.fillStyle = `#${paintColour.getHexString()}`; g.fillRect(0, 0, w, h);
      const rows = 9, per = 16, sw = w / per, sh = h / rows;
      for (let r = rows; r >= 0; r--)
        for (let c = -1; c <= per; c++) {
          const x = (c + (r % 2) * 0.5) * sw, y = r * sh;
          g.beginPath(); g.arc(x + sw / 2, y, sw * 0.52, 0, Math.PI);
          g.fillStyle = `rgba(255,255,255,${0.05 + ((r + c) % 3) * 0.035})`; g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3; g.stroke();
        }
    });
    scales.wrapS = THREE.RepeatWrapping;
    const scaled = new THREE.MeshStandardMaterial({ map: scales, color: '#ffffff', metalness: 0.3, roughness: 0.5 });
    scaled.color.lerp(new THREE.Color('#9a8a70'), mood.wear * 0.25);
    const top = Y1 + 0.2;
    let peak: number;
    if (a.cap === 'plain') {
      s.lathe([[R + 0.05, top], [R + 0.16, top + 0.03], [R + 0.16, top + 0.12], [R * 0.6, top + 0.2], [0, top + 0.22]], iron);
      peak = top + 0.22;
    } else {
      const awning = s.mesh(new THREE.LatheGeometry([[R + 0.03, top], [R + 0.42, top + 0.06], [R + 0.44, top + 0.16], [R + 0.3, top + 0.22], [R + 0.08, top + 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 6), iron);
      awning.rotation.y = Math.PI / 6;
      for (let i = 0; i < 6; i++) {
        const t = i * Math.PI / 3;
        s.ball([0.06, 0.07, 0.06], [Math.sin(t) * (R + 0.42), top + 0.1, Math.cos(t) * (R + 0.42)], gold, 10);
      }
      const dome: [number, number][] = a.cap === 'dome'
        ? [[R + 0.08, 0.34], [R + 0.05, 0.5], [R - 0.06, 0.72], [R - 0.24, 0.9], [R - 0.44, 1.0], [0.1, 1.05]]
        : [[R + 0.08, 0.34], [R + 0.1, 0.55], [R - 0.02, 0.85], [R - 0.3, 1.15], [0.16, 1.4], [0.08, 1.6]];
      s.lathe(dome.map(([x, y]) => [x, top + y] as const), scaled);
      peak = top + dome[dome.length - 1][1];
      s.lathe([[0.1, 0], [0.06, 0.07], [0.12, 0.15], [0.05, 0.24], [0.025, a.cap === 'spire' ? 0.75 : 0.42], [0, a.cap === 'spire' ? 0.8 : 0.46]], a.paintwork === 'black' ? gold : iron, [0, peak, 0]);
    }

    // At the foot.
    if (a.foot === 'paste') {
      const zinc = s.material('#9aa2a3', { metalness: 0.6, roughness: 0.45 });
      s.cylinder(0.15, 0.12, 0.26, [0.75, 0.13, 0.75], zinc, 16);
      s.cylinder(0.135, 0.135, 0.02, [0.75, 0.24, 0.75], s.material('#ece6d4'), 16);
      s.ring(0.15, 0.008, [0.75, 0.3, 0.75], zinc, Math.PI);
      s.rod([0.95, 0.02, 0.9], [0.62, 1.5, 0.3], 0.018, s.material('#9a7444'));
      s.box([0.26, 0.12, 0.07], [0.61, 1.53, 0.28], s.material('#d8cfb2')).rotation.y = 0.5;
      const roll = s.cylinder(0.06, 0.06, 0.9, [-0.7, 0.06, 0.85], s.material('#e9e2cf'), 14);
      roll.rotation.z = Math.PI / 2; roll.rotation.y = 0.4;
    } else if (a.foot === 'scraps') {
      for (let i = 0; i < 7 + Math.round(mood.density * 6); i++) {
        const t = random() * Math.PI * 2, d = 0.9 + random() * 0.6;
        const scrap = s.box([0.12 + random() * 0.25, 0.012, 0.08 + random() * 0.2], [Math.sin(t) * d, 0.01 + random() * 0.03, Math.cos(t) * d], s.material(random() < 0.5 ? '#e9e2cf' : faces[Math.floor(random() * faces.length)]));
        scrap.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.5);scrap.updateMatrixWorld(true);scrap.position.y-=new THREE.Box3().setFromObject(scrap,true).min.y;
      }
    } else if (a.foot === 'dog') {
      const fur = s.material(a.main === 'lost-dog' || a.beside === 'lost-dog' ? '#8a5a2c' : '#d9d2c4', { roughness: 0.95 });
      const dx = 0.3, dz = 1.2;
      s.ball([0.13, 0.19, 0.15], [dx, 0.19, dz], fur, 14).rotation.x = 0.35;
      s.ball([0.095, 0.095, 0.11], [dx, 0.43, dz - 0.09], fur, 14);
      s.ball([0.045, 0.04, 0.07], [dx, 0.45, dz - 0.19], fur, 10);
      for (const side of [-1, 1]) {
        s.ball([0.03, 0.07, 0.04], [dx + side * 0.08, 0.5, dz - 0.05], s.material('#5e3c1c'), 8);
        s.rod([dx + side * 0.07, 0.24, dz - 0.1], [dx + side * 0.07, 0.01, dz - 0.14], 0.025, fur);
      }
      s.rod([dx, 0.08, dz + 0.12], [dx + 0.06, 0.12, dz + 0.3], 0.02, fur, 0.01);
    } else if (a.foot === 'pigeons') {
      for (let i = 0; i < 2; i++) {
        const px = -0.5 + i * 0.75 + random() * 0.2, pz = 1.05 + random() * 0.3, turn = random() * 6;
        const bird = new THREE.Group();
        const grey = s.material(i ? '#7f8894' : '#9aa0a8', { roughness: 0.8 });
        bird.add(s.ball([0.07, 0.065, 0.12], [0, 0.1, 0], grey, 12));
        bird.add(s.ball([0.04, 0.045, 0.04], [0, 0.17 - i * 0.06, 0.1], s.material('#4f6a66'), 10));
        bird.add(s.box([0.012, 0.012, 0.035], [0, 0.165 - i * 0.07, 0.15], s.material('#d9a441')));
        bird.add(s.box([0.07, 0.012, 0.1], [0, 0.1, -0.14], s.material('#5a626c')));
        for(const side of[-1,1]){bird.add(s.rod([side*.025,.06,.01],[side*.025,.006,.025],.005,s.material('#b87258')));bird.add(s.rod([side*.025-.014,.005,.04],[side*.025+.014,.005,.04],.004,s.material('#b87258')));}
        bird.position.set(px, 0, pz); bird.rotation.y = turn;
        s.root.add(bird);
      }
    }

    if(a.baseDetail==='flutes')for(let i=0;i<24;i++){const t=i*Math.PI/12;s.rod([Math.sin(t)*.705,.18,Math.cos(t)*.705],[Math.sin(t)*.705,.35,Math.cos(t)*.705],.012,gold);}
    else if(a.baseDetail==='panels')for(let i=0;i<8;i++){const t=i*Math.PI/4;const panel=s.box([.2,.16,.018],[Math.sin(t)*.707,.27,Math.cos(t)*.707],gold);panel.rotation.y=t;}
    else if(a.baseDetail==='studs')for(let i=0;i<20;i++)for(const y of[.21,.33]){const t=i*Math.PI/10;s.ball([.018,.018,.018],[Math.sin(t)*.705,y,Math.cos(t)*.705],gold,6);}
    if(a.drumBands==='brass')for(const y of[Y0+.035,Y1-.025])s.ring(R+.012,.012,[0,y,0],gold).rotation.x=Math.PI/2;
    else if(a.drumBands==='doubled')for(const y of[Y0+.04,Y0+.08,Y1-.025,Y1-.065])s.ring(R+.015,.014,[0,y,0],iron).rotation.x=Math.PI/2;
    else if(a.drumBands==='beaded')for(let i=0;i<36;i++){const t=i*Math.PI/18;s.ball([.021,.021,.021],[Math.sin(t)*.645,Y0+.025,Math.cos(t)*.645],gold,6);}
    if(a.capBrackets!=='none')for(let i=0;i<6;i++){
      const t=i*Math.PI/3,at=(r:number,y:number):[number,number,number]=>[Math.sin(t)*r,y,Math.cos(t)*r];
      if(a.capBrackets==='angled')s.rod(at(R+.015,Y1+.05),at(R+.14,top+.04),.018,iron);
      else if(a.capBrackets==='curved')s.tube([at(R+.015,Y1+.02),at(R+.13,Y1+.1),at(R+.14,top+.04)],.018,iron);
      else{s.tube([at(R+.015,Y1+.02),at(R+.17,Y1+.08),at(R+.16,Y1+.16),at(R+.08,Y1+.17),at(R+.1,Y1+.09)],.012,iron);s.rod(at(R+.16,Y1+.16),at(R+.14,top+.04),.012,iron);}
    }
    if(a.bandPattern!=='clear'){
      const n=a.bandPattern==='grille'?36:a.bandPattern==='panes'?12:6;
      for(let i=0;i<n;i++){const t=i*Math.PI*2/n;if(a.bandPattern==='arches'){const arc=s.ring(.1,.01,[Math.sin(t)*.659,Y1+.07,Math.cos(t)*.659],iron,Math.PI);arc.rotation.y=t;}else s.rod([Math.sin(t)*.66,Y1,Math.cos(t)*.66],[Math.sin(t)*.66,Y1+.2,Math.cos(t)*.66],a.bandPattern==='grille'?.007:.012,iron);}
    }
    if(a.municipalBadge==='oval')s.ball([.11,.065,.012],[0,.28,.72],gold,16);
    else if(a.municipalBadge==='numbered')s.label('PARIS  27',.22,.1,[0,.28,.722],'#e6e4da','#264f42');
    else if(a.municipalBadge==='rosette')for(let i=0;i<7;i++){const t=i*Math.PI*2/7;s.ball([.025,.025,.014],[Math.sin(t)*.06,.28+Math.cos(t)*.06,.72],gold,8);}
    if(a.paving!=='bare'){
      const stone=s.material('#b9b5aa');s.cylinder(1.9,1.9,.034,[0,-.023,0],stone,48);
      if(a.paving==='slabs')for(let x=0;x<6;x++)for(let z=0;z<6;z++){const px=-1.5+x*.6,pz=-1.5+z*.6;if(Math.hypot(px,pz)<1.6)s.box([.594,.006,.594],[px,-.003,pz],s.material((x+z)%2?'#c4c0b3':'#b3b2a9'));}
      else for(let i=0;i<(a.paving==='radial'?20:48);i++){
        const n=a.paving==='radial'?20:48,theta=i*Math.PI*2/n,g=new THREE.RingGeometry(a.paving==='radial'?.82:1.25,1.88,1,1,theta+.003,Math.PI*2/n-.006);g.rotateX(-Math.PI/2);s.mesh(g,s.material(a.paving==='mosaic'?(i%2?'#dcd1b6':'#626b65'):(i%3?'#c6c0b2':'#a8aba2')),[0,0,0]);
      }
    }

    const phase = random() * 9, flicker = mix(0.01, 0.2, mood.energy);
    return s.finish({ update: (_dt, time) => { if (a.lit) glow.emissiveIntensity = 1.3 * (1 + Math.sin(time * 9 + phase) * Math.sin(time * 1.7) * flicker); } });
  },
});
