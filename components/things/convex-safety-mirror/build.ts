import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const SCENES = {
  empty: 'Empty parking bays curving away under strip lights. Nobody.',
  headlights: 'A pair of headlights coming round the bend, glare spreading across the glass.',
  figure: 'One dark figure standing in the middle of the lane, small and far off.',
  light: 'Only light: a blown-out white-gold glare with no detail in it at all.',
  ramp: 'A ramp spiralling down out of sight with a painted arrow.',
  exit: 'A green EXIT sign glowing over a door at the end of the row.',
  sky: 'Open sky and rooftops: it stands outdoors at a street corner.',
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d', { willReadFrequently: true })!);
  return canvas;
}
function textureOf(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    reflection: choice('What does the reflection show?', SCENES),
    shape: choice('What shape is the mirror?', {
      round: 'A big round dome, the classic.',
      wide: 'A wide rounded rectangle, like a road-junction mirror.',
      twin: 'Two round mirrors on one pole looking opposite ways down the lane.',
    }),
    rim: choice('What is the rim like?', {
      orange: 'A thick safety-orange plastic rim.',
      chevron: 'Red and white chevron border.',
      black: 'A plain black rubber edge.',
      yellow: 'Yellow, with a little peaked hood over the top.',
    }),
    pole: choice('How is the pole painted?', {
      hazard: 'Yellow and black bands.',
      candy: 'Red and white bands.',
      bare: 'Bare galvanised steel.',
      green: 'Dark green, park-keeper issue.',
    }),
    state: choice('What state is it in?', {
      clean: 'Clean and true, recently wiped.',
      cracked: 'Cracked from a thrown stone, lines radiating across the reflection.',
      askew: 'Knocked askew: the pole leans and the mirror droops toward the floor.',
      stickered: 'Stickers and a marker tag across the lower half.',
      fogged: 'Fogged and streaked with condensation runs.',
    }),
    sign: choice('What sign is fixed to the pole under the mirror?', {
      none: 'None.',
      slow: 'SLOW',
      five: 'A round 5 speed limit.',
      horn: 'SOUND HORN',
      oneway: 'A blue one-way arrow.',
      cctv: 'CCTV IN OPERATION, yellow.',
    }),
    base: choice('What does it stand in?', {
      plate: 'A bolted steel base plate.',
      tyre: 'An old tyre filled with concrete: temporary, years ago.',
      kerb: 'A small painted concrete kerb block.',
    }),
    cone: noul('Is a traffic cone leaning against its foot?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const amber = mood.warmth; // sodium amber against fluorescent green

    // The scene, drawn straight, then bent through a fisheye onto the glass.
    const straight = paint(256, 256, (ctx) => {
      const ceiling = new THREE.Color('#5c6b62').lerp(new THREE.Color('#7a6648'), amber).getStyle();
      const floor = new THREE.Color('#8a938a').lerp(new THREE.Color('#a8926a'), amber).getStyle();
      const tube = amber > 0.5 ? '#ffd9a0' : '#e6ffe0';
      const vx = 128 + (random() - 0.5) * 40, vy = 118;
      const to = (x: number, y: number, depth: number): [number, number] => [vx + (x - vx) * depth, vy + (y - vy) * depth];
      if (a.reflection === 'sky') {
        const g = ctx.createLinearGradient(0, 0, 0, 256);
        g.addColorStop(0, mood.daylight > 0.75 ? '#5a6fa8' : '#9cc4ea'); g.addColorStop(0.55, mood.daylight > 0.75 ? '#f0b98a' : '#e4eef2'); g.addColorStop(0.56, '#8e8f88'); g.addColorStop(1, '#6c6d68');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 9; i++) { const w = 18 + random() * 30, h = 30 + random() * 80, x = i * 30 - 10 + random() * 10; ctx.fillStyle = ['#b5a48f', '#8d8a94', '#a37b63', '#c8c2b4'][i % 4]; ctx.fillRect(x, 143 - h, w, h); ctx.fillStyle = '#2f3540'; for (let r = 0; r < h / 14 - 1; r++) for (let c = 0; c < w / 10 - 1; c++) ctx.fillRect(x + 4 + c * 10, 149 - h + r * 14, 5, 7); }
        ctx.strokeStyle = '#eceadf'; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(128, 256); ctx.lineTo(vx, 146); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.fillStyle = ceiling; ctx.fillRect(0, 0, 256, vy);
        ctx.fillStyle = floor; ctx.fillRect(0, vy, 256, 256 - vy);
        // Back wall, ceiling tubes, columns and bay lines receding to the vanishing point.
        ctx.fillStyle = new THREE.Color(ceiling).multiplyScalar(0.7).getStyle();
        const [bx0, by0] = to(0, 0, 0.16), [bx1, by1] = to(256, 256, 0.16);
        ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
        ctx.strokeStyle = tube; ctx.lineCap = 'round';
        for (const x of [40, 216]) for (let d = 1; d > 0.2; d *= 0.62) { const [x0, y0] = to(x, 8, d), [x1, y1] = to(x, 8, d * 0.74); ctx.lineWidth = 7 * d; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
        for (const side of [0, 256]) for (let d = 1.15; d > 0.18; d *= 0.6) {
          const [x0, y0] = to(side, 0, d), [, y1] = to(side, 256, d); const w = 26 * d;
          ctx.fillStyle = '#9d9d92'; ctx.fillRect(x0 - w / 2, y0, w, y1 - y0);
          ctx.fillStyle = amber > 0.5 ? '#3f9a6a' : '#e08a2a'; ctx.fillRect(x0 - w / 2, y0 + (y1 - y0) * 0.45, w, (y1 - y0) * 0.14);
        }
        ctx.strokeStyle = '#ecebe0';
        for (const side of [0, 256]) for (let d = 1; d > 0.2; d *= 0.8) { const [x0, y0] = to(side, 250, d), [x1, y1] = to(side + (side ? -70 : 70), 250, d); ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
        if (a.reflection === 'ramp') {
          ctx.fillStyle = '#5a5f5a'; ctx.beginPath(); ctx.moveTo(60, 256); ctx.quadraticCurveTo(110, 150, 200, 132); ctx.lineTo(214, 150); ctx.quadraticCurveTo(170, 180, 190, 256); ctx.fill();
          ctx.strokeStyle = '#e3b922'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(60, 256); ctx.quadraticCurveTo(110, 150, 200, 132); ctx.stroke();
          ctx.fillStyle = '#ecebe0'; ctx.beginPath(); ctx.moveTo(118, 236); ctx.lineTo(134, 236); ctx.lineTo(140, 196); ctx.lineTo(152, 198); ctx.lineTo(140, 168); ctx.lineTo(114, 190); ctx.lineTo(126, 194); ctx.fill();
          ctx.fillStyle = '#16191a'; ctx.fillRect(196, 96, 60, 58);
        }
        if (a.reflection === 'exit') {
          const [x, y] = to(128, 128, 0.16);
          ctx.fillStyle = '#d8d6c8'; ctx.fillRect(x - 12, y - 4, 24, 26);
          ctx.fillStyle = '#19d76a'; ctx.shadowColor = '#19ff7a'; ctx.shadowBlur = 22; ctx.fillRect(x - 17, y - 18, 34, 11); ctx.shadowBlur = 0;
          const g = ctx.createRadialGradient(x, y + 30, 2, x, y + 30, 70); g.addColorStop(0, 'rgba(40,255,130,0.4)'); g.addColorStop(1, 'rgba(40,255,130,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        }
        if (a.reflection === 'figure') {
          const [x, y] = to(128 + (random() - 0.5) * 60, 236, 0.3);
          ctx.fillStyle = 'rgba(20,22,24,0.45)'; ctx.beginPath(); ctx.ellipse(x + 12, y + 4, 22, 5, 0.1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#14171a'; ctx.beginPath(); ctx.arc(x, y - 46, 6.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x - 9, y - 38); ctx.lineTo(x + 9, y - 38); ctx.lineTo(x + 7, y); ctx.lineTo(x + 1, y); ctx.lineTo(x, y - 16); ctx.lineTo(x - 1, y); ctx.lineTo(x - 7, y); ctx.fill();
        }
        if (a.reflection === 'headlights') {
          const [x, y] = to(128 + (random() - 0.5) * 70, 200, 0.42);
          ctx.fillStyle = '#16191c'; ctx.fillRect(x - 30, y - 26, 60, 30);
          for (const dx of [-20, 20]) { const g = ctx.createRadialGradient(x + dx, y - 8, 1, x + dx, y - 8, 62); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.16, 'rgba(255,244,190,0.95)'); g.addColorStop(1, 'rgba(255,230,150,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256); }
          const g = ctx.createLinearGradient(0, y, 0, 256); g.addColorStop(0, 'rgba(255,240,180,0.55)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x + 26, y); ctx.lineTo(x + 110, 256); ctx.lineTo(x - 110, 256); ctx.fill();
        }
        if (a.reflection === 'light') {
          const g = ctx.createRadialGradient(vx, vy, 4, vx, vy, 190); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, amber > 0.5 ? '#ffe6a8' : '#f2ffe6'); g.addColorStop(1, amber > 0.5 ? '#d8a04a' : '#a8c8a0'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
        }
      }
    });
    const glassMap = (flip: boolean) => textureOf(paint(256, 256, (ctx) => {
      const source = straight.getContext('2d')!.getImageData(0, 0, 256, 256).data;
      const image = ctx.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const dx = (flip ? 255 - x : x) / 127.5 - 1, dy = y / 127.5 - 1, r = Math.hypot(dx, dy);
        // Barrel distortion: the edge of the dome looks far round the corner.
        const bend = r < 0.001 ? 1 : Math.tan(Math.min(r, 1.15) * 1.02) / Math.tan(1.02) / r * 0.62;
        const sx = THREE.MathUtils.clamp(Math.round((dx * bend + 1) * 127.5), 0, 255), sy = THREE.MathUtils.clamp(Math.round((dy * bend + 1) * 127.5), 0, 255);
        const o = (y * 256 + x) * 4, i = (sy * 256 + sx) * 4;
        const shade = 1 - Math.max(0, r - 0.72) * 0.9;
        image.data[o] = source[i] * shade; image.data[o + 1] = source[i + 1] * shade; image.data[o + 2] = source[i + 2] * shade; image.data[o + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      // The glass's own highlight.
      const g = ctx.createRadialGradient(84, 70, 2, 84, 70, 90); g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
      const grime = mood.wear * 0.5 + (a.state === 'fogged' ? 0.35 : 0);
      if (grime > 0.05) {
        const e = ctx.createRadialGradient(128, 128, 60, 128, 128, 130); e.addColorStop(0, 'rgba(150,140,120,0)'); e.addColorStop(1, `rgba(120,110,90,${grime})`); ctx.fillStyle = e; ctx.fillRect(0, 0, 256, 256);
      }
      if (a.state === 'fogged') {
        ctx.fillStyle = 'rgba(225,232,232,0.55)'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(70,80,80,0.5)'; ctx.lineCap = 'round';
        for (let i = 0; i < 16; i++) { let x = 20 + random() * 216, y = 20 + random() * 120; ctx.lineWidth = 2 + random() * 3; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (random() - 0.5) * 7; y += 10 + random() * 14; ctx.lineTo(x, y); } ctx.stroke(); }
      } else if (a.state === 'cracked') {
        const cx = 70 + random() * 110, cy = 70 + random() * 110;
        ctx.strokeStyle = 'rgba(18,20,22,0.9)';
        for (let i = 0; i < 11; i++) { const t = i / 11 * Math.PI * 2 + random() * 0.4; let x = cx, y = cy; ctx.lineWidth = 1.5 + random() * 1.5; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 7; k++) { x += Math.cos(t + (random() - 0.5) * 0.8) * 26; y += Math.sin(t + (random() - 0.5) * 0.8) * 26; ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.lineWidth = 1.2; for (const r of [20, 44, 76]) { ctx.beginPath(); for (let i = 0; i <= 11; i++) { const t = i / 11 * Math.PI * 2; ctx.lineTo(cx + Math.cos(t) * r * (0.8 + random() * 0.4), cy + Math.sin(t) * r * (0.8 + random() * 0.4)); } ctx.stroke(); }
        ctx.fillStyle = '#1b1e20'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 34, cy + 12); ctx.lineTo(cx + 18, cy + 40); ctx.fill();
      } else if (a.state === 'stickered') {
        for (let i = 0; i < 7; i++) { ctx.save(); ctx.translate(50 + random() * 156, 150 + random() * 70); ctx.rotate((random() - 0.5) * 1.2); ctx.fillStyle = ['#f2e84a', '#e2574a', '#58b6e2', '#f2f2f2', '#2a2a2a', '#5fd07a'][i % 6]; if (i % 3) ctx.fillRect(-18, -11, 36, 22); else { ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = i % 6 === 4 ? '#fff' : '#111'; ctx.fillRect(-11, -3, 22, 4); ctx.restore(); }
        ctx.strokeStyle = '#101214'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); let x = 46, y = 126; ctx.moveTo(x, y); for (let k = 0; k < 14; k++) { x += 12; y += (k % 2 ? -1 : 1) * (18 + random() * 16); ctx.lineTo(x, y); } ctx.stroke();
      }
    }));

    const rimTint = { orange: '#f0641e', chevron: '#d0281f', black: '#1b1d1f', yellow: '#e8c21f' }[a.rim];
    const rimMat = s.material(rimTint, { roughness: 0.55 });
    const dark = s.material('#1f2224'), steel = s.material('#b3babc', { metalness: 0.7, roughness: 0.4 });
    const glow = a.reflection === 'light' ? 1.1 : a.reflection === 'headlights' ? 0.85 : 0.55;
    const glasses: THREE.MeshStandardMaterial[] = [];

    const head = (flip: boolean) => {
      const g = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material) => { const m = new THREE.Mesh(geometry, material); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
      const map = glassMap(flip);
      const glass = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: glow, roughness: 0.12, metalness: 0.1 });
      glasses.push(glass);
      if (a.shape === 'wide') {
        const w = 0.98, h = 0.64;
        const dome = new THREE.PlaneGeometry(w, h, 20, 14);
        const p = dome.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, 0.11 * (1 - x * x) * (1 - y * y) + 0.02); }
        dome.computeVertexNormals();
        add(dome, glass);
        const frame = new THREE.Shape(); const r = 0.1, hw = w / 2 + 0.035, hh = h / 2 + 0.035;
        frame.moveTo(-hw + r, -hh); frame.lineTo(hw - r, -hh); frame.quadraticCurveTo(hw, -hh, hw, -hh + r); frame.lineTo(hw, hh - r); frame.quadraticCurveTo(hw, hh, hw - r, hh); frame.lineTo(-hw + r, hh); frame.quadraticCurveTo(-hw, hh, -hw, hh - r); frame.lineTo(-hw, -hh + r); frame.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
        add(new THREE.ExtrudeGeometry(frame, { depth: 0.05, bevelEnabled: false }), rimMat).position.z = -0.035;
        if (a.rim === 'chevron') for (let i = 0; i < 9; i++) for (const y of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.036, 0.008), s.material('#f1f0ea')).position.set(-w / 2 + 0.06 + i * 0.108, y * (hh - 0.018), 0.017);
      } else {
        const R = 0.42, sphere = 0.82, cap = Math.asin(R / sphere);
        const dome = new THREE.SphereGeometry(sphere, 40, 12, 0, Math.PI * 2, 0, cap);
        dome.rotateX(Math.PI / 2); dome.translate(0, 0, -sphere * Math.cos(cap) + 0.01);
        const p = dome.attributes.position, uv = dome.attributes.uv;
        for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / R * 0.5 + 0.5, p.getY(i) / R * 0.5 + 0.5);
        add(dome, glass);
        add(new THREE.TorusGeometry(R + 0.012, 0.034, 10, 48), rimMat);
        if (a.rim === 'chevron') for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; const m = add(new THREE.BoxGeometry(0.11, 0.05, 0.02), s.material('#f1f0ea')); m.position.set(Math.cos(t) * (R + 0.012), Math.sin(t) * (R + 0.012), 0.024); m.rotation.z = t + Math.PI / 2; }
        const back = add(new THREE.SphereGeometry(sphere, 24, 6, 0, Math.PI * 2, 0, cap), dark);
        back.rotation.x = -Math.PI / 2; back.scale.z = 1; back.position.z = sphere * Math.cos(cap) * 0.42 - 0.02; back.scale.set(1, 0.42, 1);
      }
      if (a.rim === 'yellow') {
        const hw = a.shape === 'wide' ? 0.56 : 0.47, top = a.shape === 'wide' ? 0.37 : 0.44;
        const hood = add(new THREE.CylinderGeometry(hw, hw, 0.2, 24, 1, true, -Math.PI * 0.26, Math.PI * 0.52), new THREE.MeshStandardMaterial({ color: rimTint, side: THREE.DoubleSide, roughness: 0.6 }));
        hood.rotation.x = Math.PI / 2; hood.rotation.y = 0; hood.rotation.set(Math.PI / 2, Math.PI, 0);
        hood.position.set(0, top - hw + 0.03, 0.07);
      }
      // Clamp bracket behind.
      add(new THREE.BoxGeometry(0.08, 0.2, 0.16), steel).position.set(0, 0, -0.13);
      return g;
    };

    // Pole.
    const height = 2.75, mirrorY = a.shape === 'wide' ? 2.36 : 2.26;
    const lean = new THREE.Group();
    s.root.add(lean);
    const bands = { hazard: ['#e8c21f', '#1d1d1d'], candy: ['#d0281f', '#f1f0ea'], bare: ['#aab1b3', '#aab1b3'], green: ['#2f5a44', '#2f5a44'] }[a.pole];
    const poleMap = textureOf(paint(8, 128, (ctx) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = bands[i % 2]; ctx.fillRect(0, i * 16, 8, 16); } ctx.fillStyle = `rgba(90,70,50,${mood.wear * 0.5})`; for (let i = 0; i < 30; i++) ctx.fillRect(random() * 8, random() * 128, 2, 2 + random() * 6); }));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, height, 16), new THREE.MeshStandardMaterial({ map: poleMap, roughness: 0.6, metalness: a.pole === 'bare' ? 0.6 : 0.1 }));
    pole.position.y = height / 2; pole.castShadow = true;
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), dark); capTop.position.y = height;
    lean.add(pole, capTop);
    const mirrors = new THREE.Group();
    mirrors.position.y = mirrorY;
    lean.add(mirrors);
    const first = head(false);
    first.position.z = 0.2;
    first.rotation.x = 0.05;
    mirrors.add(first);
    if (a.shape === 'twin') {
      // A V of two domes on a crossbar, one for each direction of the lane.
      first.scale.setScalar(0.82); first.position.set(0.4, 0, 0.12); first.rotation.y = 0.55;
      const second = head(true);
      second.scale.setScalar(0.82); second.position.set(-0.4, 0, 0.12); second.rotation.set(0.05, -0.55, 0, 'YXZ');
      mirrors.add(second);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.05), steel); bar.castShadow = true;
      mirrors.add(bar);
    } else mirrors.rotation.y = (random() - 0.5) * 0.3;

    // Sign plate under the mirror.
    if (a.sign !== 'none') {
      const y = mirrorY - 0.72;
      const plate = (canvas: HTMLCanvasElement, w: number, h: number, round = false) => {
        const m = new THREE.Mesh(round ? new THREE.CircleGeometry(w / 2, 28) : new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: textureOf(canvas), roughness: 0.6 }));
        m.position.set(0, y, 0.048); m.castShadow = true;
        const back = new THREE.Mesh(round ? new THREE.CylinderGeometry(w / 2, w / 2, 0.006, 28) : new THREE.BoxGeometry(w, h, 0.006), steel);
        if (round) back.rotation.x = Math.PI / 2;
        back.position.set(0, y, 0.044);
        lean.add(m, back);
      };
      const words = (text: string[], bg: string, ink: string, w = 256, h = 128) => paint(w, h, (ctx) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${text.length > 1 ? 44 : 80}px sans-serif`; text.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + (i - (text.length - 1) / 2) * 48, w - 28)); });
      if (a.sign === 'slow') plate(words(['SLOW'], '#e8c21f', '#151515'), 0.5, 0.25);
      else if (a.sign === 'horn') plate(words(['SOUND', 'HORN'], '#f1f0ea', '#c8281e'), 0.46, 0.23);
      else if (a.sign === 'cctv') plate(words(['CCTV IN', 'OPERATION'], '#e8c21f', '#151515'), 0.46, 0.23);
      else if (a.sign === 'five') plate(paint(128, 128, (ctx) => { ctx.fillStyle = '#c8281e'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#f4f2ea'; ctx.beginPath(); ctx.arc(64, 64, 47, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#151515'; ctx.font = 'bold 76px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('5', 64, 69); }), 0.38, 0.38, true);
      else plate(paint(256, 96, (ctx) => { ctx.fillStyle = '#1f55b0'; ctx.fillRect(0, 0, 256, 96); ctx.fillStyle = '#f4f2ea'; ctx.beginPath(); ctx.moveTo(30, 36); ctx.lineTo(170, 36); ctx.lineTo(170, 14); ctx.lineTo(232, 48); ctx.lineTo(170, 82); ctx.lineTo(170, 60); ctx.lineTo(30, 60); ctx.fill(); }), 0.52, 0.2);
    }

    // Base.
    if (a.base === 'plate') {
      s.box([0.3, 0.014, 0.3], [0, 0.007, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.018, 0.018, 0.02, [x * 0.11, 0.022, z * 0.11], dark, 6);
      for (let i = 0; i < 4; i++) { const g = s.box([0.006, 0.12, 0.09], [0, 0.07, 0], steel); g.rotation.y = i * Math.PI / 2; g.translateZ(0.075); }
    } else if (a.base === 'tyre') {
      s.ring(0.25, 0.1, [0, 0.1, 0], s.material('#1c1c1c', { roughness: 0.95 })).rotation.x = Math.PI / 2;
      s.cylinder(0.24, 0.24, 0.17, [0, 0.085, 0], s.material('#a6a59d', { roughness: 1 }), 20);
    } else {
      s.box([0.5, 0.2, 0.5], [0, 0.1, 0], s.material('#a6a59d', { roughness: 0.95 }));
      s.box([0.51, 0.1, 0.51], [0, 0.15, 0], s.material('#e8c21f', { roughness: 0.85 }));
    }
    if (a.state === 'askew') {
      lean.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.14, 0.26, random());
      lean.rotation.x = mix(-0.05, 0.1, random());
      mirrors.rotation.z = -lean.rotation.z * 0.3 + mix(0.25, 0.5, random()) * (random() < 0.5 ? -1 : 1);
      mirrors.rotation.y = mix(-0.5, 0.5, random());
      // Fragments of whatever hit it.
      const shard = s.material('#c8281e', { roughness: 0.3 });
      for (let i = 0; i < 6; i++) s.box([0.03 + random() * 0.05, 0.006, 0.02 + random() * 0.03], [(random() - 0.5) * 0.9, 0.004, 0.2 + random() * 0.5], shard).rotation.y = random() * 3;
    }
    if (a.cone) {
      const cone = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.32), dark); b.position.y = 0.015;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.55, 14), s.material('#f0641e')); c.position.y = 0.3;
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.087, 0.11, 14), s.material('#f4f2ea')); w.position.y = 0.33;
      cone.add(b, c, w); cone.traverse((n) => { n.castShadow = true; });
      cone.position.set(mix(0.3, 0.45, random()) * (random() < 0.5 ? -1 : 1), 0, mix(0.1, 0.35, random()));
      cone.rotation.y = random() * 3;
      s.root.add(cone);
    }

    const pulse = a.reflection === 'headlights' || a.reflection === 'light';
    const sway = a.state === 'askew';
    const rest = mirrors.rotation.z;
    return s.finish({
      footprint: 0.5,
      update: pulse || sway ? (_dt, time) => {
        if (pulse) for (const glass of glasses) glass.emissiveIntensity = glow * (1 + Math.sin(time * mix(0.6, 5, mood.energy)) * 0.25);
        if (sway) mirrors.rotation.z = rest + Math.sin(time * mix(0.8, 4, mood.energy)) * mix(0.004, 0.05, mood.energy);
      } : undefined,
    });
  },
});
