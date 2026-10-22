import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PAPERS = {
  white: 'Plain white rice paper, glowing cream.',
  red: 'Lucky red.',
  saffron: 'Saffron orange, like a monk\'s robe.',
  pink: 'Blossom pink.',
  blue: 'Pale sky blue, cool around a warm flame.',
  patchwork: 'Panels of different coloured tissue glued together.',
} as const;
const PAPER_COLOURS: Record<keyof typeof PAPERS, string[]> = {
  white: ['#f6efdc'], red: ['#d8372c'], saffron: ['#f29a2a'], pink: ['#f4a9c0'], blue: ['#a9d2ee'],
  patchwork: ['#f6efdc', '#f29a2a', '#f4a9c0', '#a9d2ee', '#b9e3a0', '#d8372c'],
};

export default defineThing({
  questions: {
    shape: choice('What shape is the lantern?', {
      tulip: 'The classic khom loi: a narrow hoop swelling to a rounded dome.',
      drum: 'A straight-sided paper drum with a flat top.',
      square: 'A four-sided box lantern with flat panels.',
      diamond: 'A faceted double cone, widest at the middle.',
    }),
    paper: choice('What colour is the paper?', PAPERS),
    writing: choice('What is written or painted on the side?', {
      brave: 'A handwritten wish: let me be brave.',
      mum: 'A dedication: for Mum, with a small heart.',
      sorry: 'Two words: I\'m sorry.',
      home: 'Two words: come home.',
      heart: 'A big painted heart.',
      child: 'A child\'s crayon drawing of a house, a sun and three stick figures.',
      brush: 'A column of bold black brush-stroke calligraphy.',
      blank: 'Nothing: bare paper.',
    }),
    company: choice('Is it alone?', {
      alone: 'One lantern on its own.',
      pair: 'Two rising together, a little apart.',
      flock: 'A rising flock at staggered heights, the nearest one lowest.',
    }),
    flame: choice('How is the flame?', {
      strong: 'Strong and bright, the whole lantern glowing like a lamp.',
      steady: 'A small steady flame, a soft glow at the base.',
      guttering: 'Guttering and low: mostly dark paper with a faint flicker.',
      out: 'Gone out: dark, sagging and tipping over as it sinks.',
      caught: 'The paper has caught: one side is scorched black and eaten away by a burning edge.',
    }),
    tag: noul('Does a paper tag on a thread trail below it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const colours = PAPER_COLOURS[a.paper];
    const power = { strong: 1.25, steady: 0.75, guttering: 0.28, out: 0, caught: 1.0 }[a.flame];

    // Paper: u around with the front at u = 0.5, v from the hoop to the crown. The same painting is the glow.
    const W = 512, H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d')!;
    const panels = a.shape === 'square' ? 4 : a.shape === 'diamond' ? 6 : 8;
    // Faceted lanterns have a corner at u = 0.5, so their front is the middle of the next panel.
    const front = a.shape === 'square' ? 0.625 : a.shape === 'diamond' ? 3.5 / 6 : 0.5;
    for (let i = 0; i < panels; i++) {
      // The seam sits at the panel edge, so the front panel is centred on u = 0.5.
      g.fillStyle = colours[a.paper === 'patchwork' ? Math.floor(random() * colours.length) : 0];
      g.fillRect(i * W / panels, 0, W / panels + 1, H);
    }
    const ink = a.paper === 'red' ? '#2a120e' : '#2b2622';
    const cx = W * front, cy = H * 0.5;
    g.fillStyle = ink; g.strokeStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineCap = 'round';
    const written = (lines: string[], size: number) => {
      g.font = `italic ${size}px cursive`;
      lines.forEach((line, index) => { g.save(); g.translate(cx + (random() - 0.5) * 8, cy + (index - (lines.length - 1) / 2) * size * 1.15); g.rotate((random() - 0.5) * 0.12); g.fillText(line, 0, 0, 120); g.restore(); });
    };
    const heart = (x: number, y: number, size: number, colour: string) => {
      g.fillStyle = colour; g.beginPath(); g.moveTo(x, y + size * 0.9);
      g.bezierCurveTo(x - size * 1.5, y - size * 0.1, x - size * 0.6, y - size * 1.1, x, y - size * 0.35);
      g.bezierCurveTo(x + size * 0.6, y - size * 1.1, x + size * 1.5, y - size * 0.1, x, y + size * 0.9); g.fill(); g.fillStyle = ink;
    };
    if (a.writing === 'brave') written(['let me', 'be', 'brave'], 40);
    else if (a.writing === 'mum') { written(['for', 'Mum'], 46); heart(cx, cy + 86, 16, a.paper === 'red' ? '#f6efdc' : '#c8281e'); }
    else if (a.writing === 'sorry') written(['I\'m', 'sorry'], 44);
    else if (a.writing === 'home') written(['come', 'home'], 44);
    else if (a.writing === 'heart') heart(cx, cy, 44, a.paper === 'red' ? '#f6efdc' : '#c8281e');
    else if (a.writing === 'child') {
      g.lineWidth = 5; g.strokeStyle = '#c8281e'; g.strokeRect(cx - 44, cy, 46, 40);
      g.beginPath(); g.moveTo(cx - 50, cy); g.lineTo(cx - 21, cy - 30); g.lineTo(cx + 8, cy); g.stroke();
      g.strokeStyle = '#e8a020'; g.beginPath(); g.arc(cx + 34, cy - 60, 14, 0, 7); g.stroke();
      for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(cx + 34 + Math.cos(i * 0.785) * 19, cy - 60 + Math.sin(i * 0.785) * 19); g.lineTo(cx + 34 + Math.cos(i * 0.785) * 27, cy - 60 + Math.sin(i * 0.785) * 27); g.stroke(); }
      g.strokeStyle = '#2a4a9a'; g.lineWidth = 4;
      [[18, 30], [38, 34], [54, 22]].forEach(([dx, tall]) => { const x = cx + dx, y = cy + 40; g.beginPath(); g.arc(x, y - tall - 6, 6, 0, 7); g.moveTo(x, y - tall); g.lineTo(x, y - 12); g.lineTo(x - 7, y); g.moveTo(x, y - 12); g.lineTo(x + 7, y); g.moveTo(x - 8, y - tall + 10); g.lineTo(x + 8, y - tall + 10); g.stroke(); });
    } else if (a.writing === 'brush') {
      g.strokeStyle = '#17120f';
      for (let k = 0; k < 4; k++) {
        const y = cy - 105 + k * 68;
        for (let i = 0; i < 4 + Math.floor(random() * 3); i++) {
          g.lineWidth = 5 + random() * 9;
          const x0 = cx + (random() - 0.5) * 50, y0 = y + (random() - 0.5) * 44;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (random() - 0.5) * 50, y0 + (random() - 0.5) * 40, x0 + (random() - 0.5) * 60, y0 + (random() - 0.5) * 52); g.stroke();
        }
      }
    }
    // Glue seams and creases; the lower paper glows hotter than the crown.
    g.strokeStyle = 'rgba(60,40,20,0.3)'; g.lineWidth = 2;
    for (let i = 0; i <= panels; i++) { g.beginPath(); g.moveTo(i * W / panels, 0); g.lineTo(i * W / panels, H); g.stroke(); }
    g.lineWidth = 1;
    for (let i = 0; i < 20 + mood.wear * 90; i++) { g.strokeStyle = `rgba(60,40,20,${0.08 + random() * 0.14})`; const x = random() * W, y = random() * H; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (random() - 0.5) * 90, y + (random() - 0.5) * 90); g.stroke(); }
    g.fillStyle = 'rgba(90,60,30,0.6)'; g.fillRect(0, H - 14, W, 14);
    if (a.flame === 'caught') {
      // A ragged hole burnt out of one flank, charred around its edge.
      const hx = W * (front + (random() < 0.5 ? -0.19 : 0.19)), hy = H * 0.62;
      const blob = (scale: number) => { g.beginPath(); for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2, d = scale * (1 + 0.16 * Math.sin(t * 5 + hx) + 0.1 * Math.sin(t * 11)); g.lineTo(hx + Math.cos(t) * d * 0.7, hy + Math.sin(t) * d * 1.25); } g.fill(); };
      g.fillStyle = '#1a120c'; blob(84); g.fillStyle = '#ff7a1a'; blob(71); g.fillStyle = '#ffe9a0'; blob(66);
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; blob(62); g.globalCompositeOperation = 'source-over';
    }
    const paperMap = new THREE.CanvasTexture(canvas);
    paperMap.colorSpace = THREE.SRGBColorSpace;
    paperMap.anisotropy = 4;
    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = lightCanvas.height = 256;
    const l = lightCanvas.getContext('2d')!;
    l.drawImage(canvas, 0, 0, 256, 256);
    const fall = l.createLinearGradient(0, 256, 0, 0);
    fall.addColorStop(0, 'rgba(0,0,0,0)'); fall.addColorStop(mix(0.35, 0.9, Math.min(power, 1)), 'rgba(0,0,0,0.55)'); fall.addColorStop(1, 'rgba(0,0,0,0.8)');
    l.globalCompositeOperation = 'source-atop'; l.fillStyle = fall; l.fillRect(0, 0, 256, 256);
    const glowMap = new THREE.CanvasTexture(lightCanvas);
    glowMap.colorSpace = THREE.SRGBColorSpace;
    const dim = a.flame === 'out' ? 0.55 : 1;
    const paper = new THREE.MeshStandardMaterial({ map: paperMap, color: new THREE.Color(dim, dim, dim * 0.97), roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5, emissive: new THREE.Color().setHSL(mix(0.11, 0.07, mood.warmth), 1, 0.62), emissiveMap: glowMap, emissiveIntensity: power * 1.1 });

    const size = 0.34, tall = 0.95;
    const profile: [number, number][] = {
      tulip: [[0.5, 0], [0.56, 0.1], [0.74, 0.3], [0.92, 0.5], [1, 0.68], [0.97, 0.8], [0.84, 0.9], [0.6, 0.97], [0.3, 0.995], [0.01, 1]],
      drum: [[0.82, 0], [0.86, 0.25], [0.86, 0.75], [0.84, 0.97], [0.6, 0.995], [0.01, 1]],
      square: [[0.8, 0], [1.02, 0.5], [1.02, 0.96], [0.01, 1]],
      diamond: [[0.42, 0], [1, 0.52], [0.62, 0.86], [0.01, 1]],
    }[a.shape] as [number, number][];
    const hoop = profile[0][0] * size;
    const body = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * size, y * tall)), { tulip: 32, drum: 32, square: 4, diamond: 6 }[a.shape]);
    if (a.shape === 'square' || a.shape === 'diamond') { const flatBody = body.toNonIndexed(); flatBody.computeVertexNormals(); body.copy(flatBody as THREE.LatheGeometry); }
    const bamboo = s.material('#b99a5a', { roughness: 0.7 });
    const wax = s.material('#efe8d6');
    const flameHot = new THREE.MeshBasicMaterial({ color: '#ffd76a' });
    const halo = new THREE.MeshBasicMaterial({ color: '#ff9a2e', transparent: true, opacity: 0.35, depthWrite: false });
    const hoopGeometry = new THREE.TorusGeometry(hoop, 0.007, 6, a.shape === 'square' ? 4 : 28);
    const flameGeometry = new THREE.SphereGeometry(1, 10, 8);
    const flames: THREE.Mesh[] = [];
    const lift = a.tag ? 0.42 : 0;

    const lantern = (x: number, y: number, z: number, first: boolean) => {
      const group = new THREE.Group();
      const add = (geometry: THREE.BufferGeometry, material: THREE.Material, px = 0, py = 0, pz = 0) => { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(px, py, pz); mesh.castShadow = material !== halo; group.add(mesh); return mesh; };
      const skin = add(body, paper);
      // Lathe u = 0 faces +z; turn the seam to the back so the writing faces forward.
      skin.rotation.y = Math.PI * 2 * (1 - front);
      const ring = add(hoopGeometry, bamboo);
      ring.rotation.x = Math.PI / 2; if (a.shape === 'square') ring.rotation.z = Math.PI / 4;
      for (const turn of [0, Math.PI / 2]) { const wire = add(new THREE.CylinderGeometry(0.0025, 0.0025, hoop * 2, 5), bamboo); wire.rotation.z = Math.PI / 2; wire.rotation.y = turn + Math.PI / 4; }
      add(new THREE.BoxGeometry(0.05, 0.035, 0.05), wax, 0, 0.018, 0);
      if (power > 0) {
        const lick = add(flameGeometry, flameHot, 0, 0.04 + 0.06 * power, 0);
        lick.scale.set(0.022 + 0.014 * power, 0.03 + 0.07 * power, 0.022 + 0.014 * power);
        const bloom = add(flameGeometry, halo, 0, 0.06 + 0.06 * power, 0);
        bloom.scale.setScalar(0.07 + 0.09 * power);
        flames.push(lick, bloom);
      }
      if (a.tag && first) {
        const thread = add(new THREE.CylinderGeometry(0.0015, 0.0015, lift - 0.11, 4), s.material('#d8d2c0'), 0.02, -(lift - 0.11) / 2, hoop * 0.9);
        thread.rotation.z = 0.04;
        const card = add(new THREE.PlaneGeometry(0.06, 0.11), new THREE.MeshStandardMaterial({ color: colours[0], roughness: 0.9, side: THREE.DoubleSide }), 0.028, -lift + 0.056, hoop * 0.9);
        card.rotation.set(0.1, (random() - 0.5) * 1.2, 0.1);
        for (let i = 0; i < 4; i++) { const stroke = add(new THREE.PlaneGeometry(0.04, 0.006), new THREE.MeshStandardMaterial({ color: ink, side: THREE.DoubleSide }), 0, 0.03 - i * 0.018, 0.001); card.add(stroke); }
      }
      const dead = a.flame === 'out';
      group.rotation.set((random() - 0.5) * (dead ? 0.5 : 0.16), (random() - 0.5) * (first ? 0.5 : 2.4), dead ? (random() < 0.5 ? -1 : 1) * mix(0.55, 0.95, random()) : (random() - 0.5) * 0.16);
      if (dead) group.scale.set(1, 0.86, 0.8);
      group.position.set(x, y + (first ? lift : 0), z);
      s.root.add(group);
      return group;
    };
    lantern(0, 0, 0, true);
    if (a.company === 'pair') lantern(mix(0.55, 0.85, random()) * (random() < 0.5 ? -1 : 1), mix(0.35, 0.8, random()) + lift, -mix(0.2, 0.6, random()), false);
    if (a.company === 'flock') {
      const others = 5 + Math.round(mood.density * 7);
      for (let i = 0; i < others; i++) {
        const f = (i + 1) / others, angle = random() * Math.PI * 2;
        lantern(Math.cos(angle) * mix(0.7, 1.7, random()), lift + mix(0.4, 3.6, f) + random() * 0.3, -Math.abs(Math.sin(angle)) * mix(0.5, 1.8, random()) - f * 0.6, false);
      }
    }
    if (a.flame === 'out') {
      const smoke = new THREE.MeshBasicMaterial({ color: '#8a8a8a', transparent: true, opacity: 0.18, depthWrite: false });
      for (let i = 0; i < 4; i++) { const puff = new THREE.Mesh(flameGeometry, smoke); puff.position.set((random() - 0.5) * 0.2, lift + 0.5 + i * 0.3, (random() - 0.5) * 0.2); puff.scale.setScalar(0.08 + i * 0.05); s.root.add(puff); }
    }

    const flicker = a.flame === 'guttering' ? 0.6 : 0.12 + mood.energy * 0.2;
    const speed = mix(4, 14, mood.energy);
    const base = flames.map((flame) => flame.scale.clone());
    return s.finish({
      update: (_dt, time) => {
        const pulse = 1 + flicker * (Math.sin(time * speed) * 0.5 + Math.sin(time * speed * 2.7 + 1) * 0.3);
        flames.forEach((flame, index) => flame.scale.copy(base[index]).multiplyScalar(Math.max(0.3, pulse + Math.sin(time * 3 + index) * 0.05)));
        paper.emissiveIntensity = power * 1.1 * Math.max(0.3, 1 + (pulse - 1) * 0.5);
      },
    });
  },
});
