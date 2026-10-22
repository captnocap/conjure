import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const PATTERNS = {
  'orange-floral': 'Brown and mustard quilting crowded with big orange 1970s flowers.',
  'teal-geometric': 'Teal ground scattered with pink and purple triangles and squiggles, early 1990s.',
  'scratchy-brown': 'A plain, thin, scratchy brown blanket with a satin edge. Institutional and joyless.',
  'crisp-white': 'A crisp white duvet with a grey runner across the foot. Renovated, modern, anonymous.',
} as const;

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    pattern: choice('What is the bedspread like?', PATTERNS),
    state: choice('What state is the bed in?', {
      made: 'Tightly made, corners tucked, nobody has touched it yet.',
      'one-side': 'Slept in on one side only: one corner folded back, one pillow dented.',
      stripped: 'Stripped to the striped mattress, the bedspread dumped on the floor.',
      wrecked: 'Both sides wrecked: covers twisted and dragged, pillows thrown about.',
    }),
    layout: choice('How many beds?', {
      queen: 'One queen bed, for a couple or someone alone.',
      twins: 'A pair of twin beds with a gap between, for a family or two colleagues.',
    }),
    cargo: choice('What is lying on the bed?', {
      nothing: 'Nothing at all.',
      suitcase: 'An open suitcase with clothes spilling out, packing or unpacking in a hurry.',
      map: 'An unfolded road map with a route inked on it.',
      pizza: 'An open pizza box with a few slices left.',
      swan: 'Towels folded into swans by housekeeping, a small hopeful welcome.',
    }),
    coinBox: noul('Is there a coin-operated vibrating-bed box on the headboard panel?'),
    headboard: choice('What is the padded headboard like?', {
      buttoned: 'A low rectangle of buttoned vinyl.',
      arched: 'A tall arched panel, a bit of honeymoon-suite ambition.',
      slab: 'A plain flat laminate slab with no padding left to speak of.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const twins = a.layout === 'twins';
    const bedW = twins ? 1.0 : 1.55, bedL = 2.0, gap = 0.55;
    const centres = twins ? [-(bedW + gap) / 2, (bedW + gap) / 2] : [0];
    const total = twins ? bedW * 2 + gap : bedW;
    const top = 0.56;
    const sat = mix(0.6, 1, mood.cheer);
    const tone = (hex: string) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      return '#' + c.setHSL(hsl.h, hsl.s * sat, hsl.l * mix(1, 0.86, mood.wear)).getHexString();
    };

    const spreadMap = paint(512, 512, (g, w, h) => {
      const stains = () => {
        for (let i = 0; i < Math.round(mood.wear * 9); i++) {
          g.fillStyle = `rgba(60,40,20,${0.1 + random() * 0.14})`;
          g.beginPath();
          g.ellipse(random() * w, random() * h, 20 + random() * 50, 14 + random() * 30, random() * 3, 0, 7);
          g.fill();
        }
      };
      if (a.pattern === 'orange-floral') {
        g.fillStyle = tone('#7a4a22'); g.fillRect(0, 0, w, h);
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          const cx = col * 128 + (row % 2 ? 64 : 0) + 32, cy = row * 128 + 64;
          for (const dx of [0, -w, w]) {
            g.fillStyle = tone((row + col) % 2 ? '#f08a1c' : '#f6c12e');
            for (let p = 0; p < 6; p++) { g.beginPath(); g.ellipse(cx + dx + Math.cos(p * 1.047) * 26, cy + Math.sin(p * 1.047) * 26, 22, 22, 0, 0, 7); g.fill(); }
            g.fillStyle = tone('#5b2f12'); g.beginPath(); g.arc(cx + dx, cy, 15, 0, 7); g.fill();
            g.fillStyle = tone('#6f8a2c'); g.beginPath(); g.ellipse(cx + dx + 58, cy + 58, 20, 8, 0.8, 0, 7); g.fill();
          }
        }
      } else if (a.pattern === 'teal-geometric') {
        g.fillStyle = tone('#1f8c8a'); g.fillRect(0, 0, w, h);
        const inks = ['#f25fa5', '#7b4fc9', '#f7e04a', '#12303a'];
        for (let i = 0; i < 46; i++) {
          const x = random() * w, y = random() * h, r = 18 + random() * 26, k = random() * 6.3;
          g.fillStyle = g.strokeStyle = tone(inks[i % 4]);
          g.lineWidth = 7;
          g.beginPath();
          if (i % 3 === 0) { for (let p = 0; p < 3; p++) g.lineTo(x + Math.cos(k + p * 2.094) * r, y + Math.sin(k + p * 2.094) * r); g.fill(); }
          else if (i % 3 === 1) { for (let p = 0; p < 5; p++) g.lineTo(x + p * 13 - 26, y + (p % 2 ? -12 : 12)); g.stroke(); }
          else { g.arc(x, y, r * 0.5, 0, 7); g.stroke(); }
        }
      } else if (a.pattern === 'scratchy-brown') {
        g.fillStyle = tone('#6b4e36'); g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { g.fillStyle = random() > 0.5 ? 'rgba(255,230,190,0.09)' : 'rgba(20,10,0,0.12)'; g.fillRect(random() * w, random() * h, 1 + random() * 9, 1.5); }
      } else {
        g.fillStyle = tone('#f1efe8'); g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(120,125,135,0.25)'; g.lineWidth = 3;
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 128); g.lineTo(w, i * 128); g.stroke(); }
      }
      if (a.pattern === 'orange-floral' || a.pattern === 'teal-geometric') {
        g.strokeStyle = 'rgba(20,10,5,0.3)'; g.lineWidth = 3;
        for (let i = -8; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + h, h); g.moveTo(i * 64 + h, 0); g.lineTo(i * 64, h); g.stroke(); }
      }
      stains();
    });
    const spread = new THREE.MeshStandardMaterial({ map: spreadMap, roughness: 0.9, side: THREE.DoubleSide });
    const lining = s.material(tone({ 'orange-floral': '#c9742a', 'teal-geometric': '#e6679f', 'scratchy-brown': '#c9b48a', 'crisp-white': '#d9dbe0' }[a.pattern]));
    const sheet = s.material(mix(0.5, 1, mood.wear) > 0.8 ? '#e3dccb' : '#f3f1ea', { roughness: 0.95 });
    const tick = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      map: paint(256, 256, (g, w, h) => {
        g.fillStyle = '#ebe6d8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#5f7fa8'; for (let i = 0; i < 16; i++) g.fillRect(i * 16 + 3, 0, 4, h);
        for (let i = 0; i < Math.round(1 + mood.wear * 6); i++) { g.fillStyle = `rgba(150,110,50,${0.12 + random() * 0.2})`; g.beginPath(); g.ellipse(random() * w, random() * h, 18 + random() * 40, 12 + random() * 26, random() * 3, 0, 7); g.fill(); }
      }),
    });
    const woodHue = { 'orange-floral': '#7b4a26', 'teal-geometric': '#c8a878', 'scratchy-brown': '#5d4330', 'crisp-white': '#4a4f55' }[a.pattern];
    const wood = s.material(woodHue, { roughness: 0.6 });
    const woodDark = s.material(new THREE.Color(woodHue).multiplyScalar(0.62));
    const vinyl = s.material(tone({ 'orange-floral': '#b5651d', 'teal-geometric': '#d66a9a', 'scratchy-brown': '#7d2f24', 'crisp-white': '#8f959c' }[a.pattern]), { roughness: 0.42 });
    const chrome = s.material('#d5d9dc', { metalness: 0.85, roughness: 0.25 });
    const dark = s.material('#2a2623');

    // The wall panel everything is bolted to.
    const panelW = total + 0.7, panelH = 1.32;
    s.box([panelW, panelH, 0.05], [0, panelH / 2, -bedL / 2 - 0.075], wood);
    for (let i = 1; i < Math.round(panelW / 0.16); i++) s.box([0.012, panelH, 0.004], [-panelW / 2 + i * 0.16, panelH / 2, -bedL / 2 - 0.048], woodDark);
    s.box([panelW + 0.04, 0.05, 0.08], [0, panelH + 0.025, -bedL / 2 - 0.07], woodDark);

    const jiggle: THREE.Object3D[] = [];
    const sleptBed = Math.floor(random() * centres.length);
    const sleptSide = random() > 0.5 ? 1 : -1;

    centres.forEach((cx, bedIndex) => {
      const bed = new THREE.Group();
      bed.position.x = cx;
      s.root.add(bed);
      jiggle.push(bed);
      const add = (mesh: THREE.Mesh) => { bed.add(mesh); return mesh; };
      const box = (size: readonly [number, number, number], at: readonly [number, number, number], m: THREE.Material) => add(s.box(size, at, m));

      // Plinth frame, box spring and mattress.
      box([bedW - 0.08, 0.2, bedL - 0.1], [0, 0.1, 0], woodDark);
      box([bedW, 0.14, bedL], [0, 0.27, 0], sheet);
      box([bedW, 0.2, bedL], [0, 0.44, 0], a.state === 'stripped' ? tick : sheet);
      const sag = mood.wear * 0.03;

      // Headboard.
      const hbZ = -bedL / 2 - 0.01;
      if (a.headboard === 'arched') {
        const shape = new THREE.Shape();
        shape.moveTo(-bedW / 2, 0); shape.lineTo(-bedW / 2, 0.42);
        shape.quadraticCurveTo(0, 0.95, bedW / 2, 0.42); shape.lineTo(bedW / 2, 0); shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 });
        const m = add(s.mesh(geo, vinyl, [0, 0.5, hbZ - 0.04]));
        m.castShadow = true;
      } else if (a.headboard === 'slab') {
        box([bedW + 0.06, 0.6, 0.04], [0, 0.82, hbZ - 0.02], s.material('#b89a70', { roughness: 0.35 }));
        box([bedW + 0.08, 0.03, 0.05], [0, 1.13, hbZ - 0.02], woodDark);
      } else {
        const geo = new THREE.BoxGeometry(bedW, 0.56, 0.09, 6, 3, 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) if (pos.getZ(i) > 0) { const col = Math.round((pos.getX(i) / bedW + 0.5) * 6), row = Math.round((pos.getY(i) / 0.56 + 0.5) * 3); if (col % 6 && row % 3) pos.setZ(i, 0.02); }
        geo.computeVertexNormals();
        add(s.mesh(geo, vinyl, [0, 0.84, hbZ - 0.02]));
        const buttons = [];
        for (let c = 1; c < 6; c++) for (let r = 1; r < 3; r++) buttons.push({ at: [(c / 6 - 0.5) * bedW, 0.84 + (r / 3 - 0.5) * 0.56, hbZ + 0.005] as const, size: 0.018 });
        add(s.scatter(new THREE.SphereGeometry(1, 8, 6), chrome, buttons));
      }

      // Bedspread: a displaced sheet over the top with hanging skirts.
      const rough = a.state === 'wrecked' ? 0.055 : a.state === 'one-side' ? 0.012 : 0.004 + mood.wear * 0.006;
      const bumps = Array.from({ length: 16 }, () => ({ x: (random() - 0.5) * bedW, z: (random() - 0.5) * bedL, r: 0.12 + random() * 0.22, h: random() }));
      const drape = (w: number, l: number, amp: number, mat: THREE.Material, repeat = true) => {
        const geo = new THREE.PlaneGeometry(w, l, 22, 28);
        geo.rotateX(-Math.PI / 2);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i), z = pos.getZ(i);
          let y = 0;
          for (const b of bumps) y += b.h * Math.exp(-((x - b.x) ** 2 + (z - b.z) ** 2) / (b.r * b.r));
          const edge = Math.min(1, (w / 2 - Math.abs(x)) / 0.12, (l / 2 - Math.abs(z)) / 0.12);
          pos.setY(i, y * amp * Math.max(edge, 0) - sag * Math.exp(-(x * x + z * z) / 0.3));
        }
        geo.computeVertexNormals();
        if (repeat) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 0.9, uv.getY(i) * l / 0.9); }
        return s.mesh(geo, mat);
      };

      if (a.state !== 'stripped') {
        const cover = new THREE.Group();
        bed.add(cover);
        const slept = a.state === 'one-side' && bedIndex === sleptBed;
        cover.add(drape(bedW + 0.03, bedL + 0.02, rough, spread));
        const skirtH = 0.36;
        for (const side of [-1, 1]) {
          const sk = s.box([0.02, skirtH, bedL + 0.02], [side * (bedW / 2 + 0.02), -skirtH / 2, 0], spread);
          sk.material = spread; cover.add(sk);
        }
        cover.add(s.box([bedW + 0.06, skirtH, 0.02], [0, -skirtH / 2, bedL / 2 + 0.015], spread));
        cover.position.y = top;
        if (a.state === 'wrecked') {
          cover.position.x = (random() - 0.5) * 0.3;
          cover.position.z = 0.12 + random() * 0.2;
          cover.rotation.y = (random() - 0.5) * 0.3;
          cover.rotation.z = (random() - 0.5) * 0.05;
          // A twisted rope of sheet dragged across.
          const pts: [number, number, number][] = [];
          for (let i = 0; i < 6; i++) pts.push([(i / 5 - 0.5) * bedW * 0.9, top + 0.07 + random() * 0.03, -0.5 + random() * 0.8]);
          add(s.tube(pts, 0.06, sheet));
        }
        if (a.pattern === 'crisp-white') { const r = s.box([bedW + 0.07, 0.03, 0.42], [0, 0.012, bedL / 2 - 0.35], s.material('#70767e')); cover.add(r); }
        if (a.pattern === 'scratchy-brown') { const r = s.box([bedW + 0.05, 0.012, 0.09], [0, 0.008, -bedL / 2 + 0.42], s.material('#c9a45e', { roughness: 0.3 })); cover.add(r); }
        if (slept) {
          // Folded-back triangle showing the sheet.
          const w = bedW * 0.52, l = bedL * 0.5;
          const sh = drape(w, l, 0.02, sheet, false);
          sh.position.set(sleptSide * (bedW / 2 - w / 2), top + 0.012, -bedL / 2 + l / 2 + 0.02);
          bed.add(sh);
          const fold = s.box([w * 1.15, 0.035, 0.34], [sleptSide * (bedW / 2 - w * 0.62), top + 0.035, -bedL / 2 + l + 0.05], lining);
          fold.rotation.y = -sleptSide * 0.42;
          bed.add(fold);
        }
      }

      // Pillows.
      const pillowMat = a.state === 'stripped' ? tick : sheet;
      const count = twins ? 1 : 2;
      for (let p = 0; p < count; p++) {
        const px = twins ? 0 : (p - 0.5) * 0.74;
        const pillow = s.ball([0.33, 0.065, 0.2], [px, top + 0.07, -bedL / 2 + 0.3], pillowMat, 18);
        bed.add(pillow);
        if (a.state === 'wrecked') {
          const off = random() > 0.55;
          pillow.position.set(off ? (random() > 0.5 ? 1 : -1) * (bedW / 2 + 0.3) : px + (random() - 0.5) * 0.4, off ? 0.07 : top + 0.1, off ? random() * 0.8 - 0.2 : -bedL / 2 + 0.3 + random() * 0.6);
          pillow.rotation.set((random() - 0.5) * 0.5, random() * 3, (random() - 0.5) * 0.4);
        } else if (a.state === 'stripped') {
          pillow.position.set(-0.15 + p * 0.12, top + 0.07 + p * 0.12, -bedL / 2 + 0.3);
          pillow.rotation.y = (random() - 0.5) * 0.5;
        } else if (a.state === 'one-side' && bedIndex === sleptBed && (twins || Math.sign(px) === sleptSide)) {
          pillow.scale.y = 0.045; pillow.rotation.y = (random() - 0.5) * 0.6; pillow.position.z += 0.08;
          const dent = s.ball([0.12, 0.02, 0.1], [pillow.position.x, top + 0.085, pillow.position.z], s.material('#cfcabd'), 12);
          bed.add(dent);
        }
      }
      if (a.state === 'stripped') {
        const heap = s.ball([0.5, 0.2, 0.36], [0.1 * (bedIndex ? -1 : 1), 0.16, bedL / 2 + 0.42], spread, 16);
        heap.rotation.y = random() * 3; bed.add(heap);
        const heap2 = s.ball([0.3, 0.14, 0.25], [0.35, 0.12, bedL / 2 + 0.3], sheet, 12);
        bed.add(heap2);
      }
    });

    // What lies on the bed (on the first bed, toward the foot).
    const cargo = new THREE.Group();
    cargo.position.set(centres[0] + (random() - 0.5) * 0.15, top + (a.state === 'wrecked' ? 0.06 : 0.015), 0.35);
    cargo.rotation.y = (random() - 0.5) * 0.7;
    s.root.add(cargo);
    jiggle.push(cargo);
    const put = (mesh: THREE.Mesh) => { cargo.add(mesh); return mesh; };
    if (a.cargo === 'suitcase') {
      const shell = s.material(tone(mood.warmth > 0.5 ? '#8a3b2a' : '#2f4f6b'), { roughness: 0.5 });
      put(s.box([0.66, 0.13, 0.44], [0, 0.065, 0], shell));
      put(s.box([0.6, 0.02, 0.38], [0, 0.135, 0], dark));
      const lid = put(s.box([0.66, 0.44, 0.07], [0, 0.3, -0.27], shell)); lid.rotation.x = -0.22;
      const liner = put(s.box([0.58, 0.36, 0.01], [0, 0.31, -0.225], s.material('#c9b78f'))); liner.rotation.x = -0.22;
      const cloth = ['#d9d4c8', '#3b5c8a', '#b8433a', '#e0b84a', '#4d7a55', '#f2f2f2', '#8a5a9a'];
      const n = 4 + Math.round(mood.density * 7);
      for (let i = 0; i < n; i++) {
        const inside = i < 4;
        const c = put(s.box([0.2 + random() * 0.12, 0.03 + random() * 0.03, 0.16 + random() * 0.1], inside ? [(i % 2 - 0.5) * 0.3, 0.16 + Math.floor(i / 2) * 0.03, (random() - 0.5) * 0.12] : [(random() - 0.5) * 1.1, 0.03, 0.2 + (random() - 0.5) * 0.9], s.material(tone(cloth[Math.floor(random() * cloth.length)]), { roughness: 0.95 })));
        c.rotation.y = random() * 3; c.rotation.z = (random() - 0.5) * 0.3;
      }
      const sleeve = put(s.box([0.34, 0.02, 0.1], [0.38, 0.12, 0.1], s.material('#f2f2f2'))); sleeve.rotation.z = -0.5;
    } else if (a.cargo === 'map') {
      const geo = new THREE.PlaneGeometry(0.95, 0.66, 8, 4);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) { const col = Math.round((pos.getX(i) / 0.95 + 0.5) * 8), row = Math.round((pos.getZ(i) / 0.66 + 0.5) * 4); pos.setY(i, 0.01 + (col % 2 ? 0.035 : 0) + (row % 2 ? 0.012 : 0)); }
      geo.computeVertexNormals();
      const map = paint(512, 356, (g, w, h) => {
        g.fillStyle = '#efe6c8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#bcd9c0'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(random() * w, random() * h, 40 + random() * 60, 30 + random() * 40, random() * 3, 0, 7); g.fill(); }
        g.fillStyle = '#a9cfe6'; g.beginPath(); g.ellipse(w * 0.85, h * 0.2, 90, 60, 0.4, 0, 7); g.fill();
        g.lineWidth = 3;
        for (let i = 0; i < 14; i++) { g.strokeStyle = i % 3 ? '#c9a23a' : '#3a5fa8'; g.beginPath(); let x = random() * w, y = random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (random() - 0.5) * 220; y += (random() - 0.5) * 160; g.lineTo(x, y); } g.stroke(); }
        g.strokeStyle = '#d2222d'; g.lineWidth = 8; g.beginPath(); let x = 30, y = h - 40; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += 60 + random() * 30; y -= 20 + random() * 50 - 10; g.lineTo(x, y); } g.stroke();
        g.beginPath(); g.arc(x, y, 14, 0, 7); g.stroke();
        g.strokeStyle = 'rgba(90,70,40,0.35)'; g.lineWidth = 2; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(i * w / 8, 0); g.lineTo(i * w / 8, h); g.stroke(); }
      });
      put(s.mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.9, side: THREE.DoubleSide })));
      const pen = put(s.cylinder(0.008, 0.008, 0.14, [0.3, 0.06, 0.2], s.material('#d2222d'), 8)); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.7;
    } else if (a.cargo === 'pizza') {
      const card = s.material('#e9e2d0'), red = s.material(tone('#c8372d'));
      put(s.box([0.42, 0.035, 0.42], [0, 0.018, 0], card));
      const lid = put(s.box([0.42, 0.42, 0.012], [0, 0.22, -0.27], card)); lid.rotation.x = -0.3;
      const logo = put(s.cylinder(0.12, 0.12, 0.004, [0, 0.22, -0.262], red, 20)); logo.rotation.x = Math.PI / 2 - 0.3;
      const left = 2 + Math.floor(random() * 4);
      const pie = put(s.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.014, 28, 1, false, random() * 6, left * Math.PI / 4), s.material('#e3b048', { roughness: 0.8 }), [0, 0.043, 0]));
      void pie;
      const dots = [];
      for (let i = 0; i < 14; i++) dots.push({ at: [(random() - 0.5) * 0.22, 0.052, (random() - 0.5) * 0.22] as const, size: 0.016 });
      put(s.scatter(new THREE.CylinderGeometry(1, 1, 0.3, 8), red, dots));
      const napkin = put(s.box([0.14, 0.006, 0.14], [0.34, 0.01, 0.12], s.material('#f4f1e8'))); napkin.rotation.y = 0.5;
      const can = put(s.cylinder(0.033, 0.033, 0.12, [-0.33, 0.062, 0.1], s.material(tone('#c22a2a'), { metalness: 0.5, roughness: 0.35 }), 14)); void can;
    } else if (a.cargo === 'swan') {
      const towel = s.material('#f6f4ee', { roughness: 1 });
      for (const side of twins ? [0] : [-1, 1]) {
        const g = new THREE.Group();
        const body = s.ball([0.16, 0.09, 0.11], [0, 0.085, 0], towel, 14);
        const wingA = s.ball([0.13, 0.07, 0.03], [-0.03, 0.13, 0.085], towel, 10), wingB = s.ball([0.13, 0.07, 0.03], [-0.03, 0.13, -0.085], towel, 10);
        wingA.rotation.z = wingB.rotation.z = 0.5;
        const neck = s.tube([[0.1, 0.08, 0], [0.19, 0.16, 0], [0.17, 0.3, 0], [0.11, 0.37, 0], [0.16, 0.39, 0], [0.24, 0.33, 0]], 0.028, towel);
        g.add(body, wingA, wingB, neck);
        g.position.x = side * 0.3; g.rotation.y = side === 1 ? Math.PI : side === 0 ? 0.4 : 0;
        cargo.add(g);
      }
      cargo.rotation.y *= 0.3;
      put(s.box([0.5, 0.04, 0.32], [0, 0.02, 0.32], towel));
      if (mood.cheer > 0.5) put(s.box([0.07, 0.008, 0.045], [0, 0.046, 0.3], s.material('#b8873a', { metalness: 0.4 })));
    }

    // The coin box, bolted to the panel beside the bed, with its cable to the frame.
    if (a.coinBox) {
      const bx = total / 2 + 0.17, bz = -bedL / 2 - 0.01;
      s.box([0.17, 0.24, 0.08], [bx, 0.82, bz], chrome);
      s.box([0.19, 0.03, 0.09], [bx, 0.95, bz], dark);
      s.label('25c', 0.13, 0.07, [bx, 0.87, bz + 0.042], '#f4e9c0', '#a3241c');
      s.box([0.035, 0.008, 0.01], [bx, 0.79, bz + 0.043], dark);
      s.cylinder(0.02, 0.02, 0.02, [bx, 0.74, bz + 0.045], dark, 12).rotation.x = Math.PI / 2;
      s.tube([[bx, 0.7, bz], [bx + 0.04, 0.45, bz + 0.03], [bx - 0.08, 0.2, bz + 0.1], [total / 2 - 0.05, 0.12, bz + 0.25]], 0.008, dark);
    }

    const buzz = a.coinBox ? mood.energy * mood.energy * 0.004 : 0;
    return s.finish({
      update: (_dt, time) => {
        if (!buzz) return;
        for (const [i, part] of jiggle.entries()) part.position.y += Math.sin(time * 70 + i) * buzz - (part.userData.last ?? 0), part.userData.last = Math.sin(time * 70 + i) * buzz;
      },
    });
  },
});
