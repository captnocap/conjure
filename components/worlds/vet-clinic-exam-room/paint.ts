import * as THREE from 'three';

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const bars = (g: CanvasRenderingContext2D, x: number, y: number, w: number, n = 2) => { g.fillStyle = '#8b9096'; for (let i = 0; i < n; i++) g.fillRect(x, y + i * 9, w * (i ? 0.6 : 1), 4); };
const title = (g: CanvasRenderingContext2D, text: string, w: number, ink: string) => { g.fillStyle = ink; g.fillRect(0, 0, w, 64); g.fillStyle = '#ffffff'; g.font = 'bold 30px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, 34); };

export type Poster = 'breeds' | 'anatomy' | 'cats' | 'teeth';

export function poster(kind: Poster, ink: string, random: () => number) {
  return canvasTexture(384, 512, (g, w, h) => {
    g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h);
    if (kind === 'breeds') {
      title(g, 'DOG BREEDS', w, ink);
      const coats = ['#d9b377', '#3a3431', '#f1ece0', '#8a5a36', '#9a9da2', '#c9762f', '#6b4a35', '#e6d3a8'];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        const x = 64 + c * 128, y = 122 + r * 104, coat = coats[Math.floor(random() * coats.length)], ear = Math.floor(random() * 3), long = 0.7 + random() * 0.7;
        g.fillStyle = coat;
        g.beginPath(); g.ellipse(x, y, 30, 28, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(x, y + 16 * long, 15, 14 * long, 0, 0, 7); g.fill();
        for (const s of [-1, 1]) {
          g.beginPath();
          if (ear === 0) g.ellipse(x + s * 30, y + 6, 10, 26, s * 0.2, 0, 7);
          else if (ear === 1) { g.moveTo(x + s * 12, y - 22); g.lineTo(x + s * 30, y - 52); g.lineTo(x + s * 32, y - 12); }
          else g.ellipse(x + s * 26, y - 30, 12, 20, s * 0.4, 0, 7);
          g.fill();
        }
        g.fillStyle = '#141414'; g.beginPath(); g.ellipse(x, y + 22 * long, 6, 4.5, 0, 0, 7); g.fill();
        for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 12, y - 4, 3.4, 0, 7); g.fill(); }
        bars(g, x - 34, y + 46, 68, 1);
      }
    } else if (kind === 'anatomy') {
      title(g, 'CANINE ANATOMY', w, ink);
      g.save(); g.translate(0, 40);
      g.fillStyle = '#ecdcc8';
      g.beginPath(); g.ellipse(200, 190, 110, 55, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(95, 150, 34, 48, -0.6, 0, 7); g.fill();
      g.beginPath(); g.ellipse(62, 112, 38, 28, 0.2, 0, 7); g.fill();
      g.beginPath(); g.ellipse(30, 126, 24, 14, 0.2, 0, 7); g.fill();
      for (const x of [118, 150, 262, 292]) g.fillRect(x, 215, 20, 110);
      g.lineWidth = 12; g.strokeStyle = '#ecdcc8'; g.lineCap = 'round'; g.beginPath(); g.moveTo(305, 170); g.quadraticCurveTo(350, 150, 352, 100); g.stroke();
      g.strokeStyle = '#6d6a66'; g.lineWidth = 4; g.beginPath(); g.moveTo(84, 118); g.quadraticCurveTo(140, 150, 300, 162); g.quadraticCurveTo(340, 150, 348, 106); g.stroke();
      g.lineWidth = 2.5; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(140 + i * 13, 152 + i * 0.6); g.quadraticCurveTo(128 + i * 13, 200, 146 + i * 12, 226 - i * 3); g.stroke(); }
      for (const x of [128, 160, 272, 302]) { g.beginPath(); g.moveTo(x, 205); g.lineTo(x - 5, 262); g.lineTo(x + 3, 318); g.stroke(); }
      g.beginPath(); g.ellipse(60, 112, 28, 20, 0.2, 0, 7); g.stroke();
      g.fillStyle = '#d2413b'; g.beginPath(); g.ellipse(168, 196, 20, 17, 0, 0, 7); g.fill();
      g.fillStyle = '#eba0a0'; g.beginPath(); g.ellipse(196, 182, 26, 18, 0.2, 0, 7); g.fill();
      g.fillStyle = '#c98a3f'; g.beginPath(); g.ellipse(232, 200, 22, 16, -0.3, 0, 7); g.fill();
      g.fillStyle = '#8c5a8f'; g.beginPath(); g.ellipse(268, 196, 24, 20, 0, 0, 7); g.fill();
      g.strokeStyle = '#30343a'; g.lineWidth = 1.5;
      for (const [x, y, lx, ly] of [[168, 196, 40, 370], [196, 182, 150, 380], [232, 200, 250, 372], [268, 196, 330, 384], [60, 112, 60, 30]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(lx, ly); g.stroke(); bars(g, lx - 30, ly + 6, 60); }
      g.restore();
    } else if (kind === 'cats') {
      title(g, 'BODY CONDITION', w, ink);
      const tones = ['#c9453c', '#e0a030', '#4d9a58', '#e0a030', '#c9453c'];
      for (let i = 0; i < 5; i++) {
        const y = 118 + i * 82, fat = 0.45 + i * 0.3;
        g.fillStyle = tones[i]; g.fillRect(0, y - 36, 14, 72);
        g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.fillText(String(i + 1), 48, y + 2);
        g.fillStyle = '#585451';
        g.beginPath(); g.ellipse(190, y, 62, 14 + 16 * fat, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(118, y, 22, 20, 0, 0, 7); g.fill();
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(104, y + s * 10); g.lineTo(98, y + s * 28); g.lineTo(120, y + s * 18); g.fill(); }
        g.lineWidth = 9; g.strokeStyle = '#585451'; g.lineCap = 'round'; g.beginPath(); g.moveTo(250, y); g.quadraticCurveTo(290, y - 6, 300, y + 24); g.stroke();
        bars(g, 318, y - 10, 54, 3);
      }
    } else {
      title(g, 'DENTAL DISEASE', w, ink);
      for (let i = 0; i < 4; i++) {
        const y = 110 + i * 100;
        g.fillStyle = ink; g.font = 'bold 34px monospace'; g.textAlign = 'center'; g.fillText(String(i + 1), 34, y + 34);
        g.fillStyle = ['#f0a7a4', '#ea8f8a', '#dc615c', '#c23d3a'][i]; g.fillRect(64, y, 300, 36);
        for (let t = 0; t < 8; t++) {
          const x = 76 + t * 36, big = t === 2 ? 1.6 : 1;
          g.fillStyle = ['#fbf8ee', '#f3e9bf', '#e0c475', '#b98c43'][i];
          g.beginPath(); g.moveTo(x - 13, y + 26 + i * 4); g.lineTo(x + 13, y + 26 + i * 4); g.lineTo(x + 4, y + 26 + 40 * big); g.lineTo(x - 4, y + 26 + 40 * big); g.fill();
          if (i > 1) { g.fillStyle = '#7c5a2c'; g.fillRect(x - 12, y + 26 + i * 4, 24, i * 4); }
        }
      }
    }
  });
}
