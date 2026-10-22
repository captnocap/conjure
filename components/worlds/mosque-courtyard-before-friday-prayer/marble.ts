import * as THREE from 'three';

/** Veined marble painted on a canvas, repeating, for stools, ledges and paving. */
export function marble(random: () => number, base = '#e3e0d8', cloud = '#cfccc4', vein = 'rgba(110,108,104,0.32)', repeat = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d')!;
  c.fillStyle = base;
  c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 36; i++) {
    c.fillStyle = cloud;
    c.globalAlpha = 0.12 + random() * 0.2;
    c.beginPath();
    c.ellipse(random() * 256, random() * 256, 20 + random() * 50, 8 + random() * 24, random() * Math.PI, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = vein;
  for (let v = 0; v < 7; v++) {
    c.lineWidth = 0.8 + random() * 1.2;
    c.beginPath();
    let x = random() * 256, y = random() * 256;
    c.moveTo(x, y);
    for (let k = 0; k < 14; k++) {
      x += (random() - 0.5) * 48;
      y += (random() - 0.35) * 36;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}
