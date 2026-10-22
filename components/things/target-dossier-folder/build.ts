import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type G = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (g: G, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const TABS = { subject: 'SUBJECT 7', file: 'FILE 0419', room: 'ROOM 1408', active: 'ACTIVE', closed: 'CLOSED' } as const;
const STAMPS = { confidential: 'CONFIDENTIAL', secret: 'TOP SECRET', closed: 'CASE CLOSED', urgent: 'URGENT', none: '' } as const;
const STAMP_ASKS = {
  confidential: 'CONFIDENTIAL in red block capitals.',
  secret: 'TOP SECRET in red.',
  closed: 'CASE CLOSED in red.',
  urgent: 'URGENT in red.',
  none: 'No stamp, just the typed page.',
} as const;

export default defineThing({
  questions: {
    photo: choice('What does the clipped photograph show?', {
      portrait: 'A head and shoulders, the face left blank.',
      building: 'An apartment block, one window marked.',
      car: 'A dark sedan from the side, its plate visible.',
      pair: 'Two figures walking together, taken from across a street.',
    }),
    crossed: noul('Is there a red cross through the photograph?'),
    map: choice('What is on the map?', {
      city: 'A street grid with one block circled in red.',
      coast: 'A coastline and harbour with a route drawn in.',
      plan: 'A floor plan with an X marked in one room.',
      metro: 'A metro diagram with a station ringed.',
    }),
    lies: choice('What lies on top of the papers?', {
      pen: 'A black pen, cap off.',
      magazine: 'A pistol magazine.',
      keycard: 'A hotel key card.',
      glasses: 'A pair of reading glasses, folded.',
      nothing: 'Nothing.',
    }),
    state: choice('What state is the folder in?', {
      neat: 'Squared away, every sheet aligned.',
      loose: 'Read and set down, pages a little fanned.',
      spilled: 'Spilled: pages fanned wide, one slid right off, the map half out.',
    }),
    stamp: choice('What is stamped across the top page?', STAMP_ASKS),
    tab: choice('What does the tab label say?', TABS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const mess = { neat: 0, loose: 0.4, spilled: 1 }[a.state];
    const jitter = (amount: number) => (random() - 0.5) * 2 * amount * (0.15 + mess);
    const paper = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, roughness: 0.95 });

    // ---- the folder itself -------------------------------------------------------------
    const manila = paint(512, 340, (g, w, h) => {
      g.fillStyle = '#d9bb77'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) { g.fillStyle = random() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(90,60,20,0.1)'; g.fillRect(random() * w, random() * h, 2 + random() * 3, 1); }
      if (mood.wear > 0.45) {
        g.strokeStyle = 'rgba(90,50,10,0.35)'; g.lineWidth = 7;
        g.beginPath(); g.arc(w * 0.72, h * 0.68, 46, 0, Math.PI * 2); g.stroke();
      }
      g.fillStyle = 'rgba(60,40,10,0.18)'; g.fillRect(w / 2 - 3, 0, 6, h);
    });
    const folderMat = paper(manila);
    const CW = 0.245, CD = 0.32;
    const right = new THREE.Group();
    right.rotation.y = -jitter(0.08) * (mess > 0.5 ? 1 : 0);
    s.root.add(right);
    s.box([CW, 0.004, CD], [-CW / 2 - 0.004, 0.002, 0], folderMat);
    const rightCover = s.box([CW, 0.004, CD], [CW / 2 + 0.004, 0.002, 0], folderMat);
    right.add(rightCover);
    const tabMap = paint(256, 64, (g, w, h) => {
      g.fillStyle = '#d9bb77'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#f4efe2'; g.fillRect(14, 10, w - 28, h - 20);
      g.fillStyle = '#2a2a2e'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(TABS[a.tab], w / 2, h / 2 + 1, w - 40);
    });
    const tab = s.mesh(new THREE.BoxGeometry(0.1, 0.004, 0.026), paper(tabMap), [0.18, 0.002, -CD / 2 - 0.012]);
    right.add(tab);

    // ---- the pages, fanned by the state ------------------------------------------------
    const pageMap = paint(512, 700, (g, w, h) => {
      g.fillStyle = '#f3efe3'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2b2b30'; g.font = 'bold 34px monospace'; g.textAlign = 'left';
      g.fillText('SURVEILLANCE REPORT', 44, 72);
      g.fillRect(44, 86, 300, 3);
      g.fillStyle = '#2e2e34';
      for (let line = 0; line < 22; line++) {
        const y = 118 + line * 24;
        let x = 44 + (line % 6 === 0 ? 44 : 0);
        while (x < w - 60) {
          const word = 20 + random() * 70;
          if (x + word > w - 44) break;
          g.fillRect(x, y, word, 11);
          x += word + 13;
          if (random() < 0.04) break;
        }
      }
      g.fillStyle = '#1e1e22'; g.fillRect(50, 640, 150, 2); g.fillRect(50, 660, 90, 9);
      if (a.stamp !== 'none') {
        g.save(); g.translate(w / 2, h * 0.38); g.rotate(-0.32);
        g.strokeStyle = 'rgba(200,30,30,0.9)'; g.lineWidth = 8; g.strokeRect(-215, -42, 430, 84);
        g.fillStyle = 'rgba(200,30,30,0.9)'; g.font = 'bold 66px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(STAMPS[a.stamp], 0, 2, 400);
        g.restore();
      }
    });
    const plain = paint(64, 64, (g, w, h) => { g.fillStyle = '#efeadc'; g.fillRect(0, 0, w, h); });
    const pageMat = paper(pageMap), plainMat = paper(plain);
    const pages = 1 + Math.round(mix(2, 7, mess));
    for (let i = 0; i < pages; i++) {
      const last = i === pages - 1;
      const sheet = s.mesh(new THREE.BoxGeometry(0.21, 0.0012, 0.297), last ? pageMat : plainMat, [CW / 2 + 0.004 + i * 0.012 * mess, 0.005 + i * 0.0013, 0.004 + i * 0.006 * mess]);
      sheet.rotation.y = -i * 0.05 * mess + jitter(0.03);
      right.add(sheet);
    }
    if (mess > 0.6) {
      const fallen = s.mesh(new THREE.BoxGeometry(0.21, 0.0012, 0.297), plainMat, [CW + 0.2, 0.0006, 0.12]);
      fallen.rotation.y = mix(0.3, 0.8, random());
    }

    // ---- the photograph, clipped to the left cover -------------------------------------
    const portrait = a.photo === 'portrait';
    const PW = portrait ? 0.125 : 0.175, PH = portrait ? 0.165 : 0.125;
    const photoMap = paint(portrait ? 320 : 480, portrait ? 416 : 320, (g, w, h) => {
      g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h);
      const m = 18, iw = w - m * 2, ih = h - m * 2;
      const sky = g.createLinearGradient(0, m, 0, m + ih);
      sky.addColorStop(0, a.photo === 'portrait' ? '#9aa3a8' : '#b9c3c8'); sky.addColorStop(1, a.photo === 'portrait' ? '#6c7478' : '#8d9398');
      g.fillStyle = sky; g.fillRect(m, m, iw, ih);
      g.fillStyle = '#3b3f44';
      if (a.photo === 'portrait') {
        g.fillRect(m, m + ih * 0.66, iw, ih * 0.34);
        g.fillStyle = '#4a4e52'; g.beginPath(); g.ellipse(w / 2, m + ih * 0.78, iw * 0.42, ih * 0.22, 0, Math.PI, Math.PI * 2); g.fill();
        g.fillStyle = '#d6c2a8'; g.beginPath(); g.ellipse(w / 2, m + ih * 0.4, iw * 0.2, ih * 0.22, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#2c2420'; g.beginPath(); g.ellipse(w / 2, m + ih * 0.3, iw * 0.22, ih * 0.12, 0, Math.PI, Math.PI * 2); g.fill();
      } else if (a.photo === 'building') {
        g.fillRect(m + iw * 0.2, m + ih * 0.15, iw * 0.6, ih * 0.85);
        g.fillStyle = '#2a2d31'; g.fillRect(m, m + ih * 0.85, iw, ih * 0.15);
        for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
          g.fillStyle = random() < 0.5 ? '#e8d9a0' : '#5c6166';
          g.fillRect(m + iw * (0.25 + c * 0.11), m + ih * (0.2 + r * 0.105), iw * 0.07, ih * 0.065);
        }
        g.strokeStyle = '#d42020'; g.lineWidth = 6; g.strokeRect(m + iw * 0.36 - 4, m + ih * 0.41 - 4, iw * 0.07 + 8, ih * 0.065 + 8);
      } else if (a.photo === 'car') {
        g.fillStyle = '#2a2d31'; g.fillRect(m, m + ih * 0.78, iw, ih * 0.22);
        g.fillStyle = '#1d1f24';
        g.beginPath(); g.roundRect(m + iw * 0.08, m + ih * 0.48, iw * 0.84, ih * 0.25, 12); g.fill();
        g.beginPath(); g.roundRect(m + iw * 0.28, m + ih * 0.3, iw * 0.42, ih * 0.22, 14); g.fill();
        g.fillStyle = '#9fb3bd'; g.fillRect(m + iw * 0.32, m + ih * 0.34, iw * 0.15, ih * 0.14); g.fillRect(m + iw * 0.52, m + ih * 0.34, iw * 0.15, ih * 0.14);
        g.fillStyle = '#111'; for (const x of [0.24, 0.74]) { g.beginPath(); g.arc(m + iw * x, m + ih * 0.74, ih * 0.09, 0, 7); g.fill(); }
        g.fillStyle = '#e9e4c8'; g.fillRect(m + iw * 0.82, m + ih * 0.6, iw * 0.1, ih * 0.06);
      } else {
        g.fillStyle = '#4c5257'; g.fillRect(m, m + ih * 0.7, iw, ih * 0.3);
        for (const x of [0.4, 0.58]) {
          g.fillStyle = '#2b2d33'; g.fillRect(m + iw * (x - 0.07), m + ih * 0.38, iw * 0.14, ih * 0.42);
          g.fillStyle = '#d6c2a8'; g.beginPath(); g.arc(m + iw * x, m + ih * 0.3, ih * 0.08, 0, 7); g.fill();
        }
      }
      if (a.crossed) {
        g.strokeStyle = 'rgba(205,25,25,0.9)'; g.lineWidth = 10; g.lineCap = 'round';
        g.beginPath(); g.moveTo(m + 10, m + 10); g.lineTo(w - m - 10, h - m - 10); g.moveTo(w - m - 10, m + 10); g.lineTo(m + 10, h - m - 10); g.stroke();
      }
    });
    const photo = s.mesh(new THREE.BoxGeometry(PW, 0.0015, PH), paper(photoMap), [-0.125 + jitter(0.02), 0.0055, -0.065 + jitter(0.02)]);
    photo.rotation.y = jitter(0.25) + mix(-0.05, 0.05, random());
    const clip = s.ring(0.011, 0.0012, [photo.position.x, 0.0075, photo.position.z - PH / 2 + 0.005], s.material('#c9ccd0', { metalness: 0.9, roughness: 0.3 }));
    clip.rotation.x = Math.PI / 2; clip.rotation.z = photo.rotation.y; clip.scale.set(0.7, 1.6, 1);

    // ---- the map ------------------------------------------------------------------------
    const mapMap = paint(400, 300, (g, w, h) => {
      g.fillStyle = '#efe9d6'; g.fillRect(0, 0, w, h);
      if (a.map === 'city') {
        g.fillStyle = '#d9d2bd';
        for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) g.fillRect(14 + i * 42, 12 + j * 40, 32, 30);
        g.fillStyle = '#8fb3d9'; g.beginPath(); g.moveTo(0, 240); g.quadraticCurveTo(200, 180, 400, 260); g.lineTo(400, 300); g.lineTo(0, 300); g.fill();
        g.strokeStyle = '#d42020'; g.lineWidth = 9; g.beginPath(); g.arc(200, 110, 46, 0, 7); g.stroke();
      } else if (a.map === 'coast') {
        g.fillStyle = '#9ec3df'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e7dcbd'; g.beginPath(); g.moveTo(0, 0); g.lineTo(240, 0); g.bezierCurveTo(200, 90, 300, 150, 220, 300); g.lineTo(0, 300); g.fill();
        g.fillStyle = '#c9c0a2'; g.fillRect(60, 80, 70, 50); g.fillRect(90, 180, 60, 60);
        g.setLineDash([10, 8]); g.strokeStyle = '#d42020'; g.lineWidth = 5; g.beginPath(); g.moveTo(380, 40); g.lineTo(300, 120); g.lineTo(250, 200); g.stroke(); g.setLineDash([]);
        g.beginPath(); g.arc(250, 200, 14, 0, 7); g.stroke();
      } else if (a.map === 'plan') {
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#2a2a2e'; g.lineWidth = 6; g.strokeRect(30, 30, 340, 240);
        g.beginPath(); g.moveTo(200, 30); g.lineTo(200, 150); g.moveTo(30, 150); g.lineTo(280, 150); g.moveTo(280, 150); g.lineTo(280, 270); g.stroke();
        g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(60 + i * 50, 30); g.lineTo(60 + i * 50, 40); g.stroke(); }
        g.strokeStyle = '#d42020'; g.lineWidth = 7; g.beginPath(); g.moveTo(90, 180); g.lineTo(150, 240); g.moveTo(150, 180); g.lineTo(90, 240); g.stroke();
      } else {
        g.fillStyle = '#f7f5ee'; g.fillRect(0, 0, w, h);
        const lines = ['#d42020', '#2a63c9', '#2d9c4a', '#e0a21a'];
        lines.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 8; g.beginPath(); g.moveTo(20, 60 + i * 55); g.lineTo(150 + i * 30, 60 + i * 55); g.lineTo(380, 40 + i * 70); g.stroke(); });
        g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 3;
        for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(40 + i * 25, 60 + (i % 4) * 55, 6, 0, 7); g.fill(); g.stroke(); }
        g.strokeStyle = '#d42020'; g.lineWidth = 6; g.beginPath(); g.arc(240, 170, 28, 0, 7); g.stroke();
      }
      g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    });
    const map = s.mesh(new THREE.BoxGeometry(0.2, 0.0012, 0.15), paper(mapMap), [-0.12 - mess * 0.1 + jitter(0.02), 0.0075, 0.09 + mess * 0.05 + jitter(0.02)]);
    map.rotation.y = jitter(0.3) + mess * 0.35;

    // ---- the boarding pass, dropped on the pages ---------------------------------------
    const passMap = paint(400, 160, (g, w, h) => {
      g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1f4e9a'; g.fillRect(0, 0, w, 36); g.fillRect(290, 36, 4, h - 36);
      g.fillStyle = '#fff'; g.font = 'bold 22px monospace'; g.fillText('BOARDING PASS', 14, 26);
      g.fillStyle = '#2a2a2e'; g.font = 'bold 30px monospace'; g.fillText('14A', 310, 90); g.font = '18px monospace'; g.fillText('GATE 22', 14, 70); g.fillText('SEAT 14A', 150, 70);
      g.fillStyle = '#555'; g.fillRect(14, 84, 110, 9); g.fillRect(14, 102, 160, 9); g.fillRect(14, 120, 80, 9);
      for (let x = 190; x < 280; x += 4 + Math.floor(random() * 3)) g.fillRect(x, 84, 2, 56);
    });
    const pass = s.mesh(new THREE.BoxGeometry(0.2, 0.0012, 0.082), paper(passMap), [0.13 + mess * 0.08 + jitter(0.03), 0.018, 0.09 + mess * 0.09 + jitter(0.03)]);
    pass.rotation.y = -0.2 + jitter(0.4);
    if (mess > 0.6) pass.position.y = 0.002;

    // ---- what lies on top ---------------------------------------------------------------
    const at: [number, number, number] = [0.1 + jitter(0.04), 0.02, -0.03 + jitter(0.04)];
    if (a.lies === 'pen') {
      const body = s.cylinder(0.0045, 0.0045, 0.14, at, s.material('#17171a', { roughness: 0.35 }), 10);
      body.rotation.z = Math.PI / 2; body.rotation.y = 0.5 + jitter(0.4);
      const tip = s.cylinder(0.001, 0.0045, 0.014, [at[0] - Math.cos(body.rotation.y) * 0.077, at[1], at[2] + Math.sin(body.rotation.y) * 0.077], s.material('#cfd3d6', { metalness: 0.9, roughness: 0.3 }), 10);
      tip.rotation.z = Math.PI / 2; tip.rotation.y = body.rotation.y;
      const clip = s.box([0.045, 0.002, 0.004], [at[0] + Math.cos(body.rotation.y) * 0.045, at[1] + 0.0045, at[2] - Math.sin(body.rotation.y) * 0.045], s.material('#cfd3d6', { metalness: 0.9, roughness: 0.3 }));
      clip.rotation.y = -body.rotation.y;
    } else if (a.lies === 'magazine') {
      const mag = s.box([0.025, 0.02, 0.125], [at[0], 0.014, at[2]], s.material('#33363b', { metalness: 0.65, roughness: 0.4 }));
      mag.rotation.y = 0.3 + jitter(0.5);
      const round = s.cylinder(0.0045, 0.0045, 0.02, [at[0] - Math.sin(mag.rotation.y) * 0.062, 0.016, at[2] - Math.cos(mag.rotation.y) * 0.062], s.material('#c8a24a', { metalness: 0.8, roughness: 0.3 }), 8);
      round.rotation.x = Math.PI / 2; round.rotation.z = -mag.rotation.y;
      s.box([0.027, 0.006, 0.02], [at[0] + Math.sin(mag.rotation.y) * 0.06, 0.012, at[2] + Math.cos(mag.rotation.y) * 0.06], s.material('#1d1f22')).rotation.y = mag.rotation.y;
    } else if (a.lies === 'keycard') {
      const cardMap = paint(344, 216, (g, w, h) => {
        g.fillStyle = '#f4f2ec'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#b8902e'; g.fillRect(0, 150, w, 26);
        g.fillStyle = '#2a2a2e'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.fillText('GRAND HOTEL', w / 2, 70);
        g.font = '18px monospace'; g.fillText('ROOM KEY', w / 2, 110);
        g.strokeStyle = '#2a2a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 85); g.lineTo(w - 40, 85); g.stroke();
      });
      const card = s.mesh(new THREE.BoxGeometry(0.086, 0.0015, 0.054), paper(cardMap), [at[0], 0.0195, at[2]]);
      card.rotation.y = 0.4 + jitter(0.5);
    } else if (a.lies === 'glasses') {
      const frame = s.material('#2a2320', { roughness: 0.4 });
      const g2 = new THREE.Group(); g2.position.set(at[0], 0.02, at[2]); g2.rotation.y = 0.5 + jitter(0.5); s.root.add(g2);
      for (const x of [-0.024, 0.024]) { const lens = s.ring(0.018, 0.0022, [x, 0.012, 0], frame); lens.scale.y = 0.75; g2.add(lens); }
      g2.add(s.rod([-0.006, 0.012, 0], [0.006, 0.012, 0], 0.002, frame));
      const arm = s.rod([0.04, 0.012, 0.0], [0.03, 0.005, 0.07], 0.002, frame); g2.add(arm);
      const arm2 = s.rod([-0.04, 0.012, 0.0], [-0.03, 0.005, 0.07], 0.002, frame); g2.add(arm2);
    }

    return s.finish();
  },
});
