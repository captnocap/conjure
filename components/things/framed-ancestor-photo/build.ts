import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
type Ctx = CanvasRenderingContext2D;
interface Ink { bg: string; bg2: string; dark: string; mid: string; light: string; skin: string; accent: string }

const ERAS = {
  sepia: 'A stiff brown studio portrait from around 1900, in an oval vignette.',
  silver: 'A black-and-white print from the 1940s, crisp and formal.',
  faded: 'A 1970s colour snapshot gone orange and pale, with a white border.',
  glossy: 'A bright 1990s school-photo colour print against a blue backdrop.',
} as const;
const INKS: Record<keyof typeof ERAS, Ink> = {
  sepia: { bg: '#a88456', bg2: '#d8bd8a', dark: '#3a2616', mid: '#7a5a38', light: '#ead8b0', skin: '#d2b488', accent: '#8a6a44' },
  silver: { bg: '#8a8a88', bg2: '#c4c4c0', dark: '#1c1c1e', mid: '#5c5c5e', light: '#eeeeea', skin: '#cfcfca', accent: '#6c6c6e' },
  faded: { bg: '#c9b184', bg2: '#e0c99a', dark: '#5a3a2a', mid: '#b8683a', light: '#f3e6c8', skin: '#e0b088', accent: '#4f9a8a' },
  glossy: { bg: '#3f74b8', bg2: '#8ab4e0', dark: '#1e1a20', mid: '#b8262e', light: '#fbfbf6', skin: '#d99a70', accent: '#f2c230' },
};

function person(g: Ctx, ink: Ink, cx: number, cy: number, k: number, kind: 'elder' | 'soldier' | 'child' | 'bride' | 'groom', tint: boolean) {
  const cloth = kind === 'soldier' || kind === 'groom' ? ink.dark : kind === 'bride' ? ink.light : ink.mid;
  if (kind === 'bride') { g.fillStyle = ink.light; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(cx, cy - 46 * k); g.quadraticCurveTo(cx + 66 * k, cy - 10 * k, cx + 60 * k, 330); g.lineTo(cx - 60 * k, 330); g.quadraticCurveTo(cx - 66 * k, cy - 10 * k, cx, cy - 46 * k); g.fill(); g.globalAlpha = 1; }
  g.fillStyle = cloth; g.beginPath(); g.moveTo(cx - 80 * k, 330); g.quadraticCurveTo(cx - 70 * k, cy + 48 * k, cx - 18 * k, cy + 34 * k); g.lineTo(cx + 18 * k, cy + 34 * k); g.quadraticCurveTo(cx + 70 * k, cy + 48 * k, cx + 80 * k, 330); g.fill();
  g.fillStyle = ink.skin; g.fillRect(cx - 10 * k, cy + 16 * k, 20 * k, 26 * k);
  g.beginPath(); g.ellipse(cx, cy, 26 * k, 32 * k, 0, 0, 7); g.fill();
  const hair = kind === 'elder' ? ink.light : ink.dark;
  g.fillStyle = hair;
  if (kind === 'soldier') {
    g.fillStyle = ink.dark; g.fillRect(cx - 29 * k, cy - 48 * k, 58 * k, 24 * k); g.beginPath(); g.ellipse(cx, cy - 23 * k, 33 * k, 7 * k, 0, 0, 7); g.fill();
    g.fillStyle = tint ? '#d9a521' : ink.light; g.beginPath(); g.arc(cx, cy - 37 * k, 5 * k, 0, 7); g.fill();
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(cx, cy + (58 + i * 22) * k, 4 * k, 0, 7); g.fill(); }
    g.fillRect(cx - 66 * k, cy + 50 * k, 26 * k, 8 * k); g.fillRect(cx + 40 * k, cy + 50 * k, 26 * k, 8 * k);
    g.fillStyle = ink.dark; g.fillRect(cx - 12 * k, cy + 9 * k, 24 * k, 5 * k);
  } else {
    g.beginPath(); g.ellipse(cx, cy - 8 * k, 28 * k, 28 * k, 0, Math.PI, Math.PI * 2); g.fill();
    if (kind === 'elder') {
      g.beginPath(); g.arc(cx, cy - 38 * k, 12 * k, 0, 7); g.fill();
      g.fillStyle = ink.dark; g.beginPath(); g.moveTo(cx - 60 * k, cy + 52 * k); g.lineTo(cx, cy + 120 * k); g.lineTo(cx + 60 * k, cy + 52 * k); g.lineTo(cx + 22 * k, cy + 40 * k); g.lineTo(cx, cy + 70 * k); g.lineTo(cx - 22 * k, cy + 40 * k); g.fill();
      g.strokeStyle = ink.dark; g.lineWidth = 2 * k; for (const side of [-1, 1]) { g.beginPath(); g.arc(cx + side * 10 * k, cy - 1 * k, 8 * k, 0, 7); g.stroke(); }
    } else if (kind === 'child') {
      g.fillStyle = tint ? '#c8262e' : ink.accent;
      for (const side of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy - 34 * k); g.lineTo(cx + side * 30 * k, cy - 50 * k); g.lineTo(cx + side * 30 * k, cy - 20 * k); g.fill(); }
      g.fillStyle = ink.light; g.beginPath(); g.ellipse(cx, cy + 44 * k, 34 * k, 12 * k, 0, 0, 7); g.fill();
    } else if (kind === 'groom') {
      g.fillStyle = ink.light; g.beginPath(); g.moveTo(cx - 14 * k, cy + 36 * k); g.lineTo(cx, cy + 80 * k); g.lineTo(cx + 14 * k, cy + 36 * k); g.fill();
      g.fillStyle = ink.dark; g.fillRect(cx - 12 * k, cy + 9 * k, 24 * k, 5 * k); g.fillRect(cx - 4 * k, cy + 40 * k, 8 * k, 30 * k);
    } else {
      g.fillStyle = tint ? '#f08a1c' : ink.accent; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(cx + (i - 2) * 11 * k, cy - 30 * k - (2 - Math.abs(i - 2)) * 4 * k, 6 * k, 0, 7); g.fill(); }
    }
  }
  g.fillStyle = ink.dark;
  for (const side of [-1, 1]) { g.beginPath(); g.arc(cx + side * 10 * k, cy - 1 * k, 3 * k, 0, 7); g.fill(); }
  g.strokeStyle = ink.dark; g.lineWidth = 2 * k; g.beginPath(); g.arc(cx, cy + 12 * k, 8 * k, 0.25, Math.PI - 0.25); if (kind !== 'soldier' && kind !== 'groom') g.stroke();
  if (tint) { g.fillStyle = 'rgba(226,96,110,0.45)'; for (const side of [-1, 1]) { g.beginPath(); g.arc(cx + side * 16 * k, cy + 9 * k, 6 * k, 0, 7); g.fill(); } }
}

function dog(g: Ctx, ink: Ink, tint: boolean) {
  g.fillStyle = ink.mid;
  g.beginPath(); g.ellipse(128, 262, 62, 80, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(128, 150, 46, 44, 0, 0, 7); g.fill();
  g.fillStyle = ink.dark;
  for (const side of [-1, 1]) { g.beginPath(); g.moveTo(128 + side * 22, 122); g.lineTo(128 + side * 58, 92); g.lineTo(128 + side * 50, 150); g.fill(); }
  g.fillStyle = ink.light; g.beginPath(); g.ellipse(128, 168, 24, 19, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 262, 26, 44, 0, 0, 7); g.fill();
  g.fillStyle = ink.dark; g.beginPath(); g.ellipse(128, 160, 9, 6.5, 0, 0, 7); g.fill();
  for (const side of [-1, 1]) { g.beginPath(); g.arc(128 + side * 18, 140, 5, 0, 7); g.fill(); }
  g.fillStyle = tint ? '#c8262e' : ink.dark; g.fillRect(90, 192, 76, 10);
  g.fillStyle = tint ? '#d9a521' : ink.light; g.beginPath(); g.arc(128, 208, 7, 0, 7); g.fill();
}

export default defineThing({
  questions: {
    backdrop: choice('What background was used for the portrait?', { studio: 'A softly shaded studio background.', curtain: 'Heavy folded studio curtains.', garden: 'Blurred garden foliage behind the sitter.', arch: 'A pale painted architectural arch.' }),
    crop: choice('How closely is the sitter framed?', { bust: 'A balanced head-and-shoulders portrait.', close: 'A close crop around the face.', wide: 'More space around the shoulders and body.', offset: 'The sitter is placed a little to one side.' }),
    printSurface: choice('What surface does the photograph have?', { glossy: 'Smooth glossy photographic paper.', matte: 'Soft matte photographic paper.', linen: 'A fine crosshatched linen surface.', stipple: 'A lightly pebbled photographic paper.' }),
    caption: choice('What is written along the bottom of the print?', { none: 'No caption.', date: 'A small handwritten date.', name: 'A short family dedication.', studio: 'The name of the photographic studio.' }),
    fasteners: choice('What small fixtures secure the portrait?', { hidden: 'The fittings are hidden behind the frame.', pins: 'Four small brass pins.', corners: 'Dark triangular photo corners.', tabs: 'Small ivory paper retaining tabs.' }),
    support: choice('What holds up the frame?', { strut: 'One narrow rear support strut.', pair: 'Two splayed rear struts.', card: 'A broad folding card kickstand.', wire: 'A simple wire easel with two back feet.' }),
    who: choice('Who is in the photograph?', {
      elder: 'A grandmother with white hair in a bun, glasses and a dark shawl.',
      soldier: 'A young man in uniform and peaked cap who did not come back.',
      child: 'A small child with a ribbon in her hair.',
      couple: 'A bride and groom on their wedding day.',
      pet: 'A much-loved dog, ears up, collar on.',
    }),
    era: choice('When was it taken?', ERAS),
    frame: choice('What kind of frame is it in?', {
      tin: 'Punched Mexican tin with scalloped edges and a rayed crest.',
      wood: 'Dark carved wood with rosettes at the corners.',
      gilt: 'An oval gilt frame with a beaded edge, grand and old.',
      plain: 'A thin black frame with a wide cream mount, modern and sober.',
      nicho: 'A painted tin shrine box with a peaked roof and little open doors.',
    }),
    draped: choice('What is draped over it?', {
      rosary: 'A rosary looped over one corner, its cross hanging in front.',
      ribbon: 'A black mourning ribbon across the corner.',
      marigolds: 'A string of marigold heads laid along the top.',
      medal: 'A medal on a striped ribbon.',
      nothing: 'Nothing: the frame stands bare.',
    }),
    state: choice('What state is the picture in?', {
      kept: 'Carefully kept and dusted, the glass whole.',
      cracked: 'The glass is cracked across the face.',
      torn: 'Part of the photo has been torn away: someone was removed.',
      tucked: 'Smaller snapshots have been tucked into the corner of the frame.',
      fallen: 'It has slipped and lies flat on its back.',
    }),
    tinted: noul('Has the photo been hand-tinted with colour on the cheeks and clothes?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const f = new Sculpture(context);
    const { mood, random } = context;
    const ink = INKS[a.era];
    const pw = 0.15, ph = 0.1875;

    // The photograph.
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 320;
    const g = canvas.getContext('2d')!;
    const grad = g.createRadialGradient(128, 130, 20, 128, 160, 220);
    grad.addColorStop(0, ink.bg2); grad.addColorStop(1, ink.bg);
    g.fillStyle = grad; g.fillRect(0, 0, 256, 320);
    if(a.backdrop==='curtain'){for(let x=0;x<256;x+=22){g.fillStyle= x%44?ink.mid:ink.bg;g.fillRect(x,0,14,320);}g.strokeStyle=ink.light;g.lineWidth=3;for(let x=0;x<256;x+=22){g.beginPath();g.moveTo(x,0);g.quadraticCurveTo(x+10,160,x,320);g.stroke();}}
    if(a.backdrop==='garden'){for(let i=0;i<60;i++){g.globalAlpha=.25+random()*.2;g.fillStyle=i%2?ink.accent:ink.bg2;g.beginPath();g.arc(random()*256,random()*320,8+random()*25,0,Math.PI*2);g.fill();}g.globalAlpha=1;}
    if(a.backdrop==='arch'){g.strokeStyle=ink.light;g.lineWidth=19;g.beginPath();g.moveTo(28,320);g.lineTo(28,130);g.arc(128,130,100,Math.PI,0);g.lineTo(228,320);g.stroke();g.lineWidth=3;g.strokeStyle=ink.mid;g.strokeRect(12,165,30,155);g.strokeRect(214,165,30,155);}
    g.save();const portraitScale=a.crop==='close'?1.28:a.crop==='wide'?.8:1;g.translate(128+(a.crop==='offset'?27:0),150);g.scale(portraitScale,portraitScale);g.translate(-128,-150);
    if (a.who === 'elder') person(g, ink, 128, 132, 1.25, 'elder', a.tinted);
    else if (a.who === 'soldier') person(g, ink, 128, 132, 1.25, 'soldier', a.tinted);
    else if (a.who === 'child') person(g, ink, 128, 168, 1.1, 'child', a.tinted);
    else if (a.who === 'couple') { person(g, ink, 80, 150, 0.85, 'bride', a.tinted); person(g, ink, 176, 136, 0.85, 'groom', a.tinted); }
    else dog(g, a.era === 'glossy' ? { ...ink, mid: '#b07a48' } : ink, a.tinted);
    g.restore();
    if (a.era === 'sepia') { g.fillStyle = ink.light; g.beginPath(); g.rect(0, 0, 256, 320); g.ellipse(128, 160, 108, 142, 0, 0, Math.PI * 2, true); g.fill('evenodd'); }
    if (a.era === 'faded') { g.strokeStyle = '#f6f0e0'; g.lineWidth = 28; g.strokeRect(0, 0, 256, 320); }
    g.fillStyle = `rgba(${a.era === 'faded' ? '240,200,150' : '236,226,204'},${0.06 + mood.wear * 0.24})`; g.fillRect(0, 0, 256, 320);
    if (mood.wear > 0.4) { g.strokeStyle = 'rgba(250,244,230,0.7)'; g.lineWidth = 2; for (let i = 0; i < Math.round(mood.wear * 5); i++) { g.beginPath(); const y = random() * 320; g.moveTo(0, y); g.lineTo(256, y + (random() - 0.5) * 40); g.stroke(); } }
    if (a.state === 'torn') {
      g.fillStyle = '#5c4c38'; g.beginPath(); g.moveTo(256, 0);
      let x = 150 + random() * 30; g.lineTo(x, 0);
      const edge: [number, number][] = [];
      for (let y = 0; y <= 320; y += 16) { x += (random() - 0.5) * 22; edge.push([x, y]); g.lineTo(x, y); }
      g.lineTo(256, 320); g.fill();
      g.strokeStyle = '#fbf7ea'; g.lineWidth = 5; g.beginPath(); edge.forEach(([ex, ey], i) => (i ? g.lineTo(ex, ey) : g.moveTo(ex, ey))); g.stroke();
    }
    if (a.state === 'cracked') {
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 3;
      const ox = 70 + random() * 110, oy = 90 + random() * 120;
      for (let i = 0; i < 7; i++) { const ang = i / 7 * 6.28 + random() * 0.5; g.beginPath(); g.moveTo(ox, oy); let px = ox, py = oy; for (let k = 0; k < 5; k++) { px += Math.cos(ang + (random() - 0.5) * 0.7) * 50; py += Math.sin(ang + (random() - 0.5) * 0.7) * 50; g.lineTo(px, py); } g.stroke(); }
    }
    if(a.caption!=='none'){g.fillStyle=ink.light;g.fillRect(0,292,256,28);g.fillStyle=ink.dark;g.font=a.caption==='studio'?'13px serif':'italic 15px serif';g.textAlign='center';g.fillText(a.caption==='date'?{sepia:'1903',silver:'1948',faded:'1976',glossy:'1994'}[a.era]:a.caption==='name'?'Siempre en casa':'Estudio del Sol',128,311);}
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const photoMat = new THREE.MeshStandardMaterial({ map, roughness: a.printSurface==='glossy'?.2:a.printSurface==='matte'?.9:.72 });
    if(a.printSurface==='linen'||a.printSurface==='stipple'){const c=document.createElement('canvas');c.width=c.height=128;const p=c.getContext('2d')!;p.fillStyle='#888';p.fillRect(0,0,128,128);p.fillStyle='#bbb';for(let x=0;x<128;x+=4)for(let y=0;y<128;y+=4){if(a.printSurface==='linen'){p.fillRect(x,y,3,1);p.fillRect(x,y,1,3);}else{p.beginPath();p.arc(x+random()*2,y+random()*2,1,0,Math.PI*2);p.fill();}}photoMat.bumpMap=new THREE.CanvasTexture(c);photoMat.bumpScale=.0007;}

    // Frame, built upright in its own space with the bottom edge on y = 0.
    let fw = pw, fh = ph, depth = 0.012, cy = 0;
    const dots: { at: V3; size: number; color?: string }[] = [];
    if (a.frame === 'tin') {
      fw = pw + 0.085; fh = ph + 0.085; cy = fh / 2 + 0.008;
      const tin = f.material('#cdd2d4', { metalness: 0.55, roughness: 0.32 });
      const shape = new THREE.Shape();
      const nx = Math.round(fw / 0.026), ny = Math.round(fh / 0.026), sx = fw / nx, sy = fh / ny;
      shape.moveTo(-fw / 2, -fh / 2);
      for (let i = 0; i < nx; i++) shape.absarc(-fw / 2 + (i + 0.5) * sx, -fh / 2, sx / 2, Math.PI, Math.PI * 2, false);
      for (let i = 0; i < ny; i++) shape.absarc(fw / 2, -fh / 2 + (i + 0.5) * sy, sy / 2, -Math.PI / 2, Math.PI / 2, false);
      for (let i = 0; i < nx; i++) shape.absarc(fw / 2 - (i + 0.5) * sx, fh / 2, sx / 2, 0, Math.PI, false);
      for (let i = 0; i < ny; i++) shape.absarc(-fw / 2, fh / 2 - (i + 0.5) * sy, sy / 2, Math.PI / 2, Math.PI * 1.5, false);
      f.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.004, bevelEnabled: false }), tin, [0, cy, 0]);
      const paintA = f.material('#c4262e', { roughness: 0.4 }), paintB = f.material('#1f8a6a', { roughness: 0.4 });
      for (const [w, h, x, y] of [[pw + 0.03, 0.012, 0, ph / 2 + 0.009], [pw + 0.03, 0.012, 0, -ph / 2 - 0.009], [0.012, ph + 0.006, pw / 2 + 0.009, 0], [0.012, ph + 0.006, -pw / 2 - 0.009, 0]]) f.box([w, h, 0.006], [x, cy + y, 0.007], Math.abs(x) > 0 ? paintB : paintA);
      const crest = f.mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.004, 24, 1, false, -Math.PI / 2, Math.PI), tin, [0, cy + fh / 2 + 0.008, 0.002]);
      crest.rotation.x = Math.PI / 2; crest.rotation.z = 0;
      for (let i = 0; i < 9; i++) { const ang = Math.PI * (i + 0.5) / 9; f.rod([Math.cos(ang) * 0.014, cy + fh / 2 + 0.01 + Math.sin(ang) * 0.014, 0.005], [Math.cos(ang) * 0.05, cy + fh / 2 + 0.01 + Math.sin(ang) * 0.05, 0.005], 0.0022, i % 2 ? paintA : paintB); }
      for (let i = 0; i < nx; i++) for (const y of [-1, 1]) dots.push({ at: [-fw / 2 + (i + 0.5) * sx, cy + y * (fh / 2 - 0.012), 0.005], size: 0.0035 });
      for (let i = 1; i < ny - 1; i++) for (const x of [-1, 1]) dots.push({ at: [x * (fw / 2 - 0.012), cy - fh / 2 + (i + 0.5) * sy, 0.005], size: 0.0035 });
      depth = 0.01;
    } else if (a.frame === 'wood') {
      const t = 0.03; fw = pw + t * 2; fh = ph + t * 2; cy = fh / 2;
      const wood = f.material('#4a2c1a', { roughness: 0.55 }), bead = f.material('#8a5a2c', { roughness: 0.5 });
      f.box([fw, t, 0.022], [0, cy + ph / 2 + t / 2, 0.006], wood); f.box([fw, t, 0.022], [0, cy - ph / 2 - t / 2, 0.006], wood);
      f.box([t, ph, 0.022], [pw / 2 + t / 2, cy, 0.006], wood); f.box([t, ph, 0.022], [-pw / 2 - t / 2, cy, 0.006], wood);
      for (const x of [-1, 1]) { f.box([0.006, ph + 0.012, 0.008], [x * (pw / 2 + 0.003), cy, 0.018], bead); f.box([pw + 0.012, 0.006, 0.008], [0, cy + x * (ph / 2 + 0.003), 0.018], bead); }
      for (const x of [-1, 1]) for (const y of [-1, 1]) { f.ball([0.013, 0.013, 0.007], [x * (pw / 2 + t / 2), cy + y * (ph / 2 + t / 2), 0.018], bead, 12); for (let p = 0; p < 6; p++) dots.push({ at: [x * (pw / 2 + t / 2) + Math.cos(p * 1.047) * 0.011, cy + y * (ph / 2 + t / 2) + Math.sin(p * 1.047) * 0.011, 0.019], size: 0.004, color: '#6a3c1c' }); }
      depth = 0.02;
    } else if (a.frame === 'gilt') {
      fw = pw + 0.05; fh = ph + 0.05; cy = fh / 2;
      const gold = f.material('#d6a83a', { metalness: 0.55, roughness: 0.3, emissive: '#6a4a08', emissiveIntensity: 0.35 });
      const ring = f.mesh(new THREE.TorusGeometry(1, 0.11, 12, 56), gold, [0, cy, 0.006]);
      ring.scale.set(pw / 2 + 0.012, ph / 2 + 0.012, 0.09);
      for (let i = 0; i < 32; i++) { const ang = i / 32 * 6.28; dots.push({ at: [Math.cos(ang) * (pw / 2 + 0.024), cy + Math.sin(ang) * (ph / 2 + 0.025), 0.01], size: 0.0042, color: '#e8c050' }); }
      f.ball([0.03, 0.014, 0.008], [0, cy + ph / 2 + 0.03, 0.008], gold, 14);
      const back = f.mesh(new THREE.CircleGeometry(1, 40), f.material('#3a2a1a'), [0, cy, -0.002]); back.scale.set(pw / 2 + 0.01, ph / 2 + 0.01, 1);
      depth = 0.016;
    } else if (a.frame === 'plain') {
      const m = 0.035, t = 0.01; fw = pw + (m + t) * 2; fh = ph + (m + t) * 2; cy = fh / 2;
      const black = f.material('#1a1a1c', { roughness: 0.4 });
      f.box([fw - t * 2, fh - t * 2, 0.003], [0, cy, 0.001], f.material('#efe8d6', { roughness: 0.9 }));
      f.box([fw, t, 0.02], [0, cy + fh / 2 - t / 2, 0.006], black); f.box([fw, t, 0.02], [0, cy - fh / 2 + t / 2, 0.006], black);
      f.box([t, fh, 0.02], [fw / 2 - t / 2, cy, 0.006], black); f.box([t, fh, 0.02], [-fw / 2 + t / 2, cy, 0.006], black);
      depth = 0.018;
    } else {
      fw = pw + 0.03; fh = ph + 0.03; cy = fh / 2;
      const hue = mood.cheer > 0.5 ? '#18a59a' : '#3a5a9a', trim = '#e5257e';
      const body = f.material(hue, { roughness: 0.45 }), pink = f.material(trim, { roughness: 0.45 });
      f.box([fw, fh, 0.004], [0, cy, -0.002], body);
      f.box([fw, 0.012, 0.035], [0, cy + fh / 2 - 0.006, 0.016], body); f.box([fw, 0.012, 0.035], [0, 0.006, 0.016], body);
      for (const x of [-1, 1]) f.box([0.012, fh, 0.035], [x * (fw / 2 - 0.006), cy, 0.016], body);
      const roof = new THREE.Shape(); roof.moveTo(-fw / 2 - 0.01, 0); roof.lineTo(fw / 2 + 0.01, 0); roof.lineTo(0, 0.07); roof.closePath();
      f.mesh(new THREE.ExtrudeGeometry(roof, { depth: 0.035, bevelEnabled: false }), pink, [0, fh, -0.002]);
      f.ball([0.012, 0.012, 0.012], [0, fh + 0.075, 0.016], f.material('#f2c230', { metalness: 0.4 }), 12);
      for (const x of [-1, 1]) {
        const door = f.box([fw / 2, fh - 0.004, 0.004], [0, 0, 0], pink);
        door.position.set(x * (fw / 2 + Math.cos(1.0) * fw / 4), cy, 0.034 + Math.sin(1.0) * fw / 4);
        door.rotation.y = -x * 1.0;
        for (let i = 0; i < 5; i++) dots.push({ at: [door.position.x + x * 0.002, cy - fh * 0.35 + i * fh * 0.175, door.position.z + 0.004], size: 0.005, color: '#f2c230' });
      }
      for (let i = 0; i < 7; i++) dots.push({ at: [(i - 3) * 0.02 * (1 - 0), fh + 0.012, 0.035], size: 0.0045, color: '#f2c230' });
      depth = 0.034;
    }
    if (dots.length) f.scatter(new THREE.SphereGeometry(1, 8, 6), f.material('#ffffff', { roughness: 0.4, metalness: 0.3 }), dots.map((d) => ({ color: '#b9bec0', ...d })));
    const photo = a.frame === 'gilt' ? f.mesh(new THREE.CircleGeometry(0.5, 48), photoMat, [0, cy, 0.004]) : f.mesh(new THREE.PlaneGeometry(1, 1), photoMat, [0, cy, 0.0048]);
    photo.scale.set(pw, ph, 1); photo.castShadow = false;
    if(a.fasteners!=='hidden')for(const x of [-1,1])for(const y of [-1,1]){
      const at:V3=[x*pw*(a.frame==='gilt'?.32:.45),cy+y*ph*(a.frame==='gilt'?.32:.45),.007];
      if(a.fasteners==='pins'){const pin=f.cylinder(.0022,.0022,.0015,at,f.material('#c7aa59',{metalness:.8,roughness:.35}),10);pin.rotation.x=Math.PI/2;}
      else if(a.fasteners==='tabs'){f.box([.014,.007,.0008],at,f.material('#f1e5c9'));}
      else{const shape=new THREE.Shape();shape.moveTo(-.008*x,.008*y);shape.lineTo(.008*x,.008*y);shape.lineTo(.008*x,-.008*y);shape.closePath();f.mesh(new THREE.ShapeGeometry(shape),f.material('#2b2927',{side:THREE.DoubleSide}),at);}
    }
    const top = a.frame === 'tin' ? cy + fh / 2 : a.frame === 'nicho' ? fh : fh;

    // Draped things, in frame space.
    const zf = depth + 0.006;
    if (a.draped === 'rosary') {
      const beadColour = ['#1c1a1e', '#6a3c1c', '#efe8d8', '#2a4a8a'][Math.floor(random() * 4)];
      const beads: { at: V3; size: number; color?: string }[] = [];
      const x0 = -fw / 2 - 0.004, x1 = fw * mix(0.05, 0.3, random()), sag = mix(0.09, 0.14, random());
      const n = 26;
      for (let i = 0; i <= n; i++) { const t = i / n, u = t * 2 - 1; beads.push({ at: [mix(x0, x1, t), top + 0.004 - sag * (1 - u * u), zf + (1 - u * u) * 0.004], size: i % 6 === 3 ? 0.0052 : 0.0038 }); }
      const mx = (x0 + x1) / 2, my = top + 0.004 - sag;
      for (let i = 1; i <= 4; i++) beads.push({ at: [mx, my - i * 0.011, zf + 0.004], size: 0.0038 });
      for (let i = 0; i < 6; i++) beads.push({ at: [x0 - 0.002, top - i * 0.011, -0.004 - i * 0.002], size: 0.0038 });
      f.scatter(new THREE.SphereGeometry(1, 8, 6), f.material(beadColour, { roughness: 0.3 }), beads);
      const silver = f.material('#c9ccd0', { metalness: 0.6, roughness: 0.3 });
      f.box([0.005, 0.034, 0.003], [mx, my - 0.068, zf + 0.004], silver); f.box([0.02, 0.005, 0.003], [mx, my - 0.06, zf + 0.004], silver);
    } else if (a.draped === 'ribbon') {
      const black = f.material('#141416', { roughness: 0.5 });
      const band = f.box([0.19, 0.024, 0.003], [fw / 2 - 0.045, top - 0.045, zf], black); band.rotation.z = -Math.PI / 4;
      for (const side of [-1, 1]) { const tail = f.box([0.02, 0.07, 0.003], [fw / 2 + 0.004 + side * 0.012, top - 0.11, zf], black); tail.rotation.z = side * 0.25; }
      f.ball([0.014, 0.012, 0.006], [fw / 2 + 0.002, top - 0.078, zf + 0.002], black, 10);
    } else if (a.draped === 'marigolds') {
      const petal = f.material('#ee7a0c', { flatShading: true, emissive: '#b84a00', emissiveIntensity: 0.15 });
      const n = Math.round(fw / 0.03);
      for (let i = 0; i <= n + 3; i++) {
        const x = i <= n ? -fw / 2 + i * fw / n : fw / 2 + 0.006, y = i <= n ? top + 0.012 + Math.sin(i / n * Math.PI) * 0.006 : top - (i - n) * 0.03;
        const bloom = f.mesh(new THREE.IcosahedronGeometry(mix(0.015, 0.019, random()), 1), petal, [x, y, 0.008]); bloom.rotation.set(random(), random(), random());
      }
    } else if (a.draped === 'medal') {
      const x = -fw / 2 + 0.03;
      f.box([0.026, 0.06, 0.003], [x, top - 0.026, zf], f.material('#8a1a26'));
      f.box([0.008, 0.06, 0.0034], [x, top - 0.026, zf], f.material('#e8e2cc'));
      const star = f.cylinder(0.02, 0.02, 0.004, [x, top - 0.072, zf], f.material('#d6a83a', { metalness: 0.6, roughness: 0.3, emissive: '#6a4a08', emissiveIntensity: 0.3 }), 5);
      star.rotation.x = Math.PI / 2;
    }
    if (a.state === 'tucked') {
      const count = 2 + Math.floor(random() * 2);
      for (let i = 0; i < count; i++) {
        const c = document.createElement('canvas'); c.width = 64; c.height = 80;
        const cg = c.getContext('2d')!;
        cg.fillStyle = '#f6f0e0'; cg.fillRect(0, 0, 64, 80);
        cg.fillStyle = [ink.bg, '#7aa0c0', '#c9a070'][i % 3]; cg.fillRect(5, 5, 54, 56);
        cg.fillStyle = ink.dark; cg.beginPath(); cg.arc(32, 28, 10, 0, 7); cg.fill(); cg.fillRect(16, 40, 32, 21);
        const m2 = new THREE.CanvasTexture(c); m2.colorSpace = THREE.SRGBColorSpace;
        const snap = f.mesh(new THREE.PlaneGeometry(0.05, 0.062), new THREE.MeshStandardMaterial({ map: m2, roughness: 0.5 }), [(i === 0 ? 1 : -1) * (pw / 2 - 0.012 - i * 0.004), cy - ph / 2 + 0.03 + i * 0.012, depth + 0.004 + i * 0.001]);
        snap.rotation.z = (random() - 0.5) * 0.7;
      }
    }

    // Stand it up, leaning back on a strut, or lay it flat.
    const supportMat=s.material('#3a2a1a',{roughness:.8});
    if(a.state==='fallen'){
      const width=a.support==='card'?.065:a.support==='pair'?.055:a.support==='wire'?.045:.015;
      f.box([width,fh*.58,.003],[0,fh*.43,-.006],supportMat);
    }
    const lean = a.state === 'fallen' ? Math.PI / 2 - 0.04 : mix(0.2, 0.3, random());
    f.root.rotation.x = -lean;
    f.root.rotation.y = a.state === 'fallen' ? (random() - 0.5) * 0.8 : 0;
    f.root.position.y = a.state === 'fallen' ? 0.012 : 0;
    s.root.add(f.root);
    f.root.updateMatrixWorld(true);f.root.position.y-=new THREE.Box3().setFromObject(f.root,true).min.y;f.root.updateMatrixWorld(true);
    if (a.state !== 'fallen') {
      const h = fh * 0.72;
      const anchor=f.root.localToWorld(new THREE.Vector3(0,h,-.004)),footZ=anchor.z-.085;
      if(a.support==='card'){
        const points=[-.028,anchor.y,anchor.z,.028,anchor.y,anchor.z,-.045,.002,footZ,.045,.002,footZ];
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex([0,2,1,1,2,3]);geometry.computeVertexNormals();const material=supportMat.clone();material.side=THREE.DoubleSide;s.mesh(geometry,material);s.box([.09,.004,.012],[0,.002,footZ],supportMat);
      }else for(const side of a.support==='strut'?[0]:[-1,1]){
        s.rod([side*.02,anchor.y,anchor.z],[side*.05,.004,footZ],a.support==='wire'?.002:.004,supportMat);
        s.box([.03,.004,.02],[side*.05,.002,footZ],supportMat);
      }
    }

    // Company on the table.
    let flame: THREE.Mesh | null = null;
    if (mood.density > 0.45) {
      const x = fw / 2 + 0.035, z = 0.07;
      s.lathe([[0,0],[.0185,0],[.0195,.016],[.0185,.016],[.0175,.0015],[0,.0015]],s.material('#cfd4d6',{metalness:.7,roughness:.3}),[x,0,z]);
      s.cylinder(0.018, 0.018, 0.003, [x, 0.015, z], s.material('#f6efdc', { emissive: '#ffb347', emissiveIntensity: 0.6 }), 18);
      flame = s.mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffc04a' }), [x, 0.03, z]);
      flame.scale.set(0.005, 0.012, 0.005); flame.castShadow = false;
    }
    if (mood.density > 0.7 || a.draped === 'marigolds') for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
      const bloom = s.mesh(new THREE.IcosahedronGeometry(0.018, 1), s.material('#ee7a0c', { flatShading: true }), [-fw / 2 - 0.02 + random() * 0.08, 0.013, 0.05 + random() * 0.06]);
      bloom.scale.y = 0.7;
    }

    const speed = mix(4, 14, mood.energy);
    return s.finish({ update: (_dt, time) => { if (flame) flame.scale.y = 0.012 * (1 + 0.22 * Math.sin(time * speed)); } });
  },
});
