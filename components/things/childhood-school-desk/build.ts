import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = readonly [number, number, number];

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    paper: choice('What is on the exam paper?', {
      blank: 'Nothing: ruled lines and a name box, untouched.',
      trailing: 'Answers that start neatly and trail off halfway down.',
      failed: 'Scribbled answers covered in red crosses and a big red F.',
      unreadable: 'Questions printed in symbols that cannot be read.',
      drawing: 'A crayon drawing of a house and a sun instead of answers.',
      lines: 'One sentence written over and over to the bottom of the page.',
    }),
    lid: score('How far is the lid lifted?', ['Shut flat', 'Lifted a crack', 'Propped half open', 'Thrown wide open, the paper left hovering where it lay']),
    inside: choice('If you look under the lid, what is inside?', {
      books: 'Exercise books, a pencil tin and an apple.',
      nest: 'A bird’s nest with three pale eggs.',
      stars: 'A piece of night sky, with stars drifting up out of it.',
      sea: 'Sea water to the brim, with a tiny boat, dripping through the bottom.',
      sand: 'Sand, pouring out underneath into a little heap.',
      homework: 'Crumpled balls of paper, crammed in and spilling onto the floor.',
      empty: 'Nothing but a pencil stub.',
    }),
    make: choice('What kind of desk is it?', {
      iron: 'Dark oak on scrolled cast-iron sides, a hundred years old.',
      steel: 'Pale plywood on grey tubular steel, mid-century.',
      painted: 'Chunky painted wood in a bright nursery colour.',
    }),
    carved: choice('What is carved into the lid?', {
      initials: 'Two initials and a year.',
      heart: 'A heart with initials through it.',
      tally: 'Tally marks counting the days.',
      help: 'The single word HELP.',
      struck: 'A name, scratched out.',
    }),
    left: choice('What has been left behind with it?', {
      satchel: 'A leather satchel hanging from the chair back.',
      blazer: 'A small blazer over the back of the chair.',
      cap: 'A paper dunce cap on the seat.',
      hourglass: 'An hourglass on the desk, nearly run out.',
      none: 'Nothing: whoever sat here is simply gone.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const nursery = ['#d8473d', '#3f78c4', '#e3b23c', '#4d9a63'][Math.floor(random() * 4)];
    const woodTint = { iron: '#6a4a30', steel: '#d2b27c', painted: nursery }[a.make];
    const wood = s.material(woodTint, { roughness: 0.55 });
    const frame = s.material({ iron: '#27282a', steel: '#8a9499', painted: nursery }[a.make], { metalness: a.make === 'painted' ? 0 : 0.6, roughness: 0.45 });
    const ink = '#2b2f55';

    // Side frames: a floor runner joining the chair and the desk, as these desks were made.
    const thick = { iron: 0.02, steel: 0.014, painted: 0.027 }[a.make];
    for (const z of [-0.28, 0.28]) {
      const run = (points: [number, number][], radius = thick) => s.tube(points.map(([x, y]) => [x, y, z] as const), radius, frame);
      run([[-0.6, 0.02], [0, 0.02], [0.52, 0.02]]);
      if (a.make === 'iron') {
        run([[-0.5, 0.02], [-0.44, 0.2], [-0.54, 0.36], [-0.5, 0.56], [-0.58, 0.77]]);
        run([[-0.16, 0.02], [-0.24, 0.16], [-0.14, 0.26], [-0.2, 0.36]]);
        run([[0.06, 0.02], [0.14, 0.2], [0.0, 0.38], [0.05, 0.54]]);
        run([[0.44, 0.02], [0.36, 0.2], [0.5, 0.38], [0.46, 0.56]]);
        s.ring(0.075, 0.012, [0.25, 0.3, z], frame);
        run([[0.1, 0.3], [0.18, 0.3]], 0.012); run([[0.32, 0.3], [0.42, 0.3]], 0.012);
      } else {
        run([[-0.5, 0.02], [-0.52, 0.36], [-0.58, 0.77]]);
        run([[-0.18, 0.02], [-0.19, 0.36]]);
        run([[0.06, 0.02], [0.05, 0.54]]);
        run([[0.44, 0.02], [0.46, 0.56]]);
        run([[-0.52, 0.36], [0.05, 0.42]]);
      }
    }
    // Seat and back.
    if (a.make === 'iron') {
      for (let i = 0; i < 4; i++) s.box([0.075, 0.02, 0.6], [-0.48 + i * 0.09, 0.37, 0], wood);
      for (let i = 0; i < 3; i++) s.box([0.018, 0.07, 0.6], [-0.535 - i * 0.02, 0.52 + i * 0.1, 0], wood).rotation.z = 0.12;
    } else {
      s.box([0.36, 0.022, 0.58], [-0.35, 0.37, 0], wood);
      s.box([0.02, 0.2, 0.58], [-0.565, 0.67, 0], wood).rotation.z = 0.14;
    }

    // The desk box: a sloping well with a fixed strip along the far edge.
    const x0 = -0.01, x1 = 0.41, yLow = 0.63, yHigh = 0.7, floorY = 0.53, slope = Math.atan2(yHigh - yLow, x1 - x0);
    s.box([x1 - x0 + 0.1, 0.016, 0.6], [(x0 + x1) / 2 + 0.05, floorY, 0], wood);
    s.box([0.016, yLow - floorY, 0.6], [x0, (yLow + floorY) / 2, 0], wood);
    s.box([0.016, yHigh - floorY, 0.6], [x1, (yHigh + floorY) / 2, 0], wood);
    s.box([0.1, yHigh - floorY, 0.6], [x1 + 0.05, (yHigh + floorY) / 2, 0], wood);
    const side = new THREE.Shape([new THREE.Vector2(x0, floorY), new THREE.Vector2(x1, floorY), new THREE.Vector2(x1, yHigh), new THREE.Vector2(x0, yLow)]);
    for (const z of [-0.3, 0.284]) s.mesh(new THREE.ExtrudeGeometry(side, { depth: 0.016, bevelEnabled: false }), wood, [0, 0, z]);
    // Inkwell and pencil groove on the strip.
    s.cylinder(0.022, 0.022, 0.012, [x1 + 0.05, yHigh + 0.004, 0.2], s.material('#e9e6dc', { roughness: 0.2 }), 14);
    s.cylinder(0.014, 0.014, 0.014, [x1 + 0.05, yHigh + 0.005, 0.2], s.material(ink), 12);
    s.box([0.02, 0.006, 0.3], [x1 + 0.05, yHigh + 0.001, -0.08], s.material(new THREE.Color(woodTint).multiplyScalar(0.6)));

    // The lid, carved.
    const letters = 'ABCDEFGHJKLMNPRSTW';
    const pick = () => letters[Math.floor(random() * letters.length)];
    const lidTop = canvasTexture(512, 360, (ctx, w, h) => {
      ctx.fillStyle = woodTint; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) { const y = random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + random() * 16 - 8, w * 0.6, y + random() * 16 - 8, w, y + random() * 10 - 5); ctx.stroke(); }
      const scar = a.make === 'iron' ? '#d9c39a' : a.make === 'steel' ? '#7a5f3a' : '#f3ead6';
      ctx.strokeStyle = scar; ctx.fillStyle = scar; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.font = 'bold 54px monospace'; ctx.textBaseline = 'middle';
      ctx.save(); ctx.translate(40, 70); ctx.rotate((random() - 0.5) * 0.2);
      if (a.carved === 'initials') { ctx.fillText(`${pick()}.${pick()}.`, 0, 0); ctx.font = 'bold 34px monospace'; ctx.fillText(`'${10 + Math.floor(random() * 89)}`, 20, 48); }
      else if (a.carved === 'heart') { ctx.beginPath(); ctx.moveTo(70, 50); ctx.bezierCurveTo(-10, 0, 20, -50, 70, -10); ctx.bezierCurveTo(120, -50, 150, 0, 70, 50); ctx.stroke(); ctx.font = 'bold 26px monospace'; ctx.fillText(`${pick()}+${pick()}`, 44, 0); }
      else if (a.carved === 'tally') { for (let g = 0; g < 4 + Math.floor(random() * 3); g++) { const gx = (g % 4) * 58, gy = Math.floor(g / 4) * 60 - 10; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(gx + k * 10, gy - 20); ctx.lineTo(gx + k * 10 + 2, gy + 20); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(gx - 6, gy + 14); ctx.lineTo(gx + 38, gy - 14); ctx.stroke(); } }
      else if (a.carved === 'help') { ctx.font = 'bold 70px monospace'; ctx.fillText('HELP', 0, 10); }
      else { ctx.fillText(`${pick()}${pick()}${pick()}${pick()}`.toLowerCase(), 0, 0); ctx.lineWidth = 8; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-10, -14 + k * 9 + random() * 8); ctx.lineTo(150, -18 + k * 9 + random() * 10); ctx.stroke(); } }
      ctx.restore();
      ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
      for (let i = 0; i < Math.round(mood.wear * 40); i++) { const x = random() * w, y = random() * h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 60 - 30, y + random() * 40 - 20); ctx.stroke(); }
      ctx.fillStyle = ink; ctx.globalAlpha = 0.7;
      for (let i = 0; i < Math.round(mood.wear * 5); i++) { ctx.beginPath(); ctx.arc(random() * w, random() * h, 5 + random() * 14, 0, 7); ctx.fill(); }
    });
    lidTop.center.set(0.5, 0.5);
    lidTop.rotation = Math.PI;
    const lidLen = Math.hypot(x1 - x0, yHigh - yLow) + 0.03;
    const open = a.lid < 0.12 ? 0 : mix(0.12, 1.25, (a.lid - 0.12) / 0.88);
    const hinge = new THREE.Group();
    hinge.position.set(x1, yHigh + 0.01, 0);
    hinge.rotation.z = slope - open;
    s.root.add(hinge);
    const lidMats = [wood, wood, new THREE.MeshStandardMaterial({ map: lidTop, roughness: 0.55 }), wood, wood, wood];
    const lid = new THREE.Mesh(new THREE.BoxGeometry(lidLen, 0.018, 0.62), lidMats);
    lid.position.set(-lidLen / 2, 0, 0);
    lid.castShadow = lid.receiveShadow = true;
    hinge.add(lid);
    for (const z of [-0.2, 0.2]) s.box([0.03, 0.008, 0.05], [x1, yHigh + 0.02, z], frame);
    if (open > 0.3) s.rod([x0 + 0.05, yLow - 0.02, 0.26], [x1 - Math.cos(open - slope) * lidLen * 0.8, yHigh + Math.sin(open - slope) * lidLen * 0.8, 0.26], 0.007, s.material('#d9c27a'));

    // The exam paper: on the lid while it lies flat enough, hovering in place once it lifts.
    const sheet = canvasTexture(256, 362, (ctx, w, h) => {
      ctx.fillStyle = '#fbf9f0'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#b9cbe0'; ctx.lineWidth = 1.5;
      for (let y = 70; y < h - 14; y += 22) { ctx.beginPath(); ctx.moveTo(14, y); ctx.lineTo(w - 14, y); ctx.stroke(); }
      ctx.strokeStyle = '#e39a9a'; ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, h); ctx.stroke();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.strokeRect(14, 12, w - 28, 36);
      ctx.fillStyle = '#222'; ctx.font = 'bold 15px monospace'; ctx.fillText('NAME:', 20, 35);
      const scribble = (y: number, to: number, colour = ink) => {
        ctx.strokeStyle = colour; ctx.lineWidth = 2.6; ctx.beginPath();
        let x = 48; ctx.moveTo(x, y);
        while (x < to) { const word = 14 + random() * 26; for (let k = 0; k < word; k += 4) ctx.lineTo(x + k, y - 3 - random() * 9 + (k % 8 ? 6 : 0)); x += word + 9; ctx.moveTo(x, y); }
        ctx.stroke();
      };
      if (a.paper === 'trailing') { for (let i = 0; i < 6; i++) scribble(68 + i * 22, mix(w - 30, 70, (i / 5) ** 2)); ctx.strokeStyle = ink; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(75, 178); ctx.bezierCurveTo(120, 185, 150, 240, 170, 330); ctx.stroke(); }
      else if (a.paper === 'failed') {
        for (let i = 0; i < 12; i++) scribble(68 + i * 22, w - 40 - random() * 80);
        ctx.strokeStyle = '#d42a20'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { const x = 60 + random() * 150, y = 80 + i * 44; ctx.beginPath(); ctx.moveTo(x - 14, y - 14); ctx.lineTo(x + 14, y + 14); ctx.moveTo(x + 14, y - 14); ctx.lineTo(x - 14, y + 14); ctx.stroke(); }
        ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(196, 62, 40, 0, 7); ctx.stroke(); ctx.fillStyle = '#d42a20'; ctx.font = 'bold 62px monospace'; ctx.fillText('F', 178, 84);
      } else if (a.paper === 'unreadable') {
        ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
        for (let row = 0; row < 12; row++) for (let col = 0; col < 8 - (row % 3) * 2; col++) {
          const x = 52 + col * 24, y = 62 + row * 22, kind = Math.floor(random() * 5);
          ctx.beginPath();
          if (kind === 0) ctx.arc(x, y, 6, 0, 7); else if (kind === 1) { ctx.moveTo(x - 6, y + 6); ctx.lineTo(x, y - 7); ctx.lineTo(x + 6, y + 6); ctx.closePath(); }
          else if (kind === 2) { ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); }
          else if (kind === 3) ctx.arc(x, y, 6, 0.5, 4); else { ctx.rect(x - 5, y - 5, 10, 10); ctx.moveTo(x - 5, y); ctx.lineTo(x + 8, y); }
          ctx.stroke();
        }
      } else if (a.paper === 'drawing') {
        ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(196, 110, 26, 0, 7); ctx.fill();
        ctx.strokeStyle = '#f2c230'; for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(196 + Math.cos(i * 0.785) * 34, 110 + Math.sin(i * 0.785) * 34); ctx.lineTo(196 + Math.cos(i * 0.785) * 48, 110 + Math.sin(i * 0.785) * 48); ctx.stroke(); }
        ctx.strokeStyle = '#c8362c'; ctx.strokeRect(60, 210, 110, 90); ctx.beginPath(); ctx.moveTo(48, 212); ctx.lineTo(115, 150); ctx.lineTo(182, 212); ctx.stroke();
        ctx.strokeStyle = '#3f78c4'; ctx.strokeRect(78, 230, 26, 26); ctx.strokeStyle = '#6b4a2a'; ctx.strokeRect(126, 250, 26, 50);
        ctx.strokeStyle = '#4d9a63'; ctx.beginPath(); ctx.moveTo(14, 318); for (let x = 14; x < w - 10; x += 12) ctx.lineTo(x, 318 + (x % 24 ? -9 : 9)); ctx.stroke();
      } else if (a.paper === 'lines') {
        const pattern = Array.from({ length: 40 }, () => random());
        ctx.strokeStyle = ink; ctx.lineWidth = 2.6;
        for (let i = 0; i < 13; i++) { const y = 68 + i * 22; ctx.beginPath(); let x = 48, n = 0; ctx.moveTo(x, y); while (x < w - 40) { const word = 14 + pattern[n++ % 40] * 26; for (let k = 0; k < word; k += 4) ctx.lineTo(x + k, y - 3 - pattern[(n + k) % 40] * 9 + (k % 8 ? 6 : 0)); x += word + 9; ctx.moveTo(x, y); } ctx.stroke(); }
      }
    });
    const paper = new THREE.Group();
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.354), new THREE.MeshStandardMaterial({ map: sheet, roughness: 0.9, side: THREE.DoubleSide }));
    page.rotation.set(-Math.PI / 2, 0, -Math.PI / 2 + (random() - 0.5) * 0.3);
    page.castShadow = page.receiveShadow = true;
    paper.add(page);
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), s.material('#e8b62c'));
    pencil.rotation.set(Math.PI / 2, 0, 0.4 + random() * 0.5); pencil.rotation.order = 'YXZ'; pencil.position.set(0.02 + random() * 0.04, 0.008, 0.22); pencil.castShadow = true;
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 6), s.material('#2b2b2b')); nib.position.y = 0.09; pencil.add(nib);
    paper.add(pencil);
    const hovering = open > 0.25;
    if (hovering) { paper.position.set((x0 + x1) / 2 - 0.02, yHigh + 0.06, -0.02); paper.rotation.z = slope * 0.5; s.root.add(paper); }
    else { paper.position.set(-lidLen / 2 - 0.01, 0.011, -0.03); hinge.add(paper); }

    // What is under the lid. Some of it escapes whether or not the lid is up.
    const inY = floorY + 0.008, mx = (x0 + x1) / 2;
    const drift: THREE.Object3D[] = [];
    if (a.inside === 'books') {
      const covers = ['#3f6a8a', '#a23b33', '#5e7d4a', '#d1a23c'];
      for (let i = 0; i < 4; i++) s.box([0.16, 0.012, 0.21], [mx - 0.07 + (random() - 0.5) * 0.02, inY + 0.006 + i * 0.012, -0.12], s.material(covers[i])).rotation.y = (random() - 0.5) * 0.3;
      s.box([0.07, 0.025, 0.2], [mx + 0.1, inY + 0.012, 0.12], s.material('#b0b5b8', { metalness: 0.7, roughness: 0.3 }));
      s.ball([0.035, 0.033, 0.035], [mx - 0.06, inY + 0.033, 0.14], s.material('#c2372f', { roughness: 0.3 }), 14);
      s.rod([mx - 0.06, inY + 0.06, 0.14], [mx - 0.055, inY + 0.08, 0.14], 0.003, s.material('#4a3320'));
    } else if (a.inside === 'nest') {
      const twig = s.material('#7b5a36', { roughness: 1 });
      for (let i = 0; i < 5; i++) { const ring = s.ring(0.085 + i * 0.012, 0.012, [mx, inY + 0.012 + i * 0.011, 0], twig); ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.2, 0, random() * 3); }
      for (let i = 0; i < 3; i++) s.ball([0.022, 0.03, 0.022], [mx + Math.cos(i * 2.1) * 0.03, inY + 0.04, Math.sin(i * 2.1) * 0.03], s.material('#bfe0e6', { roughness: 0.4 }), 12).rotation.z = 0.8;
      for (let i = 0; i < 6; i++) { const t = random() * 6.28; s.rod([mx + Math.cos(t) * 0.08, inY + 0.03, Math.sin(t) * 0.08], [mx + Math.cos(t) * 0.17, inY + 0.06 + random() * 0.05, Math.sin(t) * 0.17], 0.004, twig); }
      s.ball([0.012, 0.002, 0.05], [0.2, 0.004, 0.42], s.material('#f1ede2'), 8).rotation.y = 0.7;
    } else if (a.inside === 'stars') {
      s.box([x1 - x0 - 0.03, 0.004, 0.56], [mx, inY, 0], s.material('#141b45', { emissive: '#1a2a7a', emissiveIntensity: 0.5 }));
      const glow = new THREE.MeshStandardMaterial({ color: '#fff2b0', emissive: '#ffe27a', emissiveIntensity: 1.3 });
      const count = 6 + Math.round(a.lid * 14);
      for (let i = 0; i < count; i++) {
        const h = random(), star = s.mesh(new THREE.OctahedronGeometry(0.012 + random() * 0.014), glow, [mx + (random() - 0.5) * 0.34 + h * 0.1, inY + 0.03 + h * mix(0.12, 0.75, a.lid), (random() - 0.5) * 0.5]);
        star.castShadow = false; drift.push(star);
      }
    } else if (a.inside === 'sea') {
      const water = new THREE.MeshStandardMaterial({ color: '#3f93a8', roughness: 0.05, metalness: 0.2 });
      s.box([x1 - x0 - 0.02, 0.07, 0.565], [mx, inY + 0.035, 0], water);
      s.box([0.07, 0.018, 0.03], [mx + 0.04, inY + 0.079, 0.1], s.material('#fbf9f0')).rotation.y = 0.5;
      s.mesh(new THREE.ConeGeometry(0.018, 0.04, 4), s.material('#fbf9f0'), [mx + 0.04, inY + 0.105, 0.1]);
      for (let i = 0; i < 4; i++) { const x = x0 + 0.04 + random() * 0.34, z = (random() - 0.5) * 0.5; s.rod([x, floorY - 0.008, z], [x, floorY - 0.06 - random() * 0.12, z], 0.006, water, 0.009); }
      s.cylinder(0.2, 0.2, 0.006, [mx, 0.003, 0.02], water, 24).scale.z = 0.8;
      s.cylinder(0.08, 0.08, 0.006, [mx + 0.2, 0.003, 0.26], water, 16);
    } else if (a.inside === 'sand') {
      const sand = s.material('#e0c88e', { roughness: 1 });
      s.box([x1 - x0 - 0.02, 0.06, 0.565], [mx, inY + 0.03, 0], sand);
      s.ball([0.14, 0.04, 0.2], [mx, inY + 0.06, 0], sand, 14);
      s.rod([mx + 0.05, floorY - 0.008, 0.1], [mx + 0.05, 0.1, 0.1], 0.008, sand, 0.012);
      s.mesh(new THREE.ConeGeometry(0.17, 0.12, 20), sand, [mx + 0.05, 0.06, 0.1]);
      s.rod([mx - 0.1, inY + 0.06, 0.12], [mx - 0.16, inY + 0.19, 0.16], 0.008, s.material('#d8473d'));
      s.box([0.05, 0.06, 0.01], [mx - 0.09, inY + 0.05, 0.115], s.material('#d8473d')).rotation.z = 0.4;
    } else if (a.inside === 'homework') {
      const wad = s.material('#f3f0e4', { roughness: 1, flatShading: true });
      const lumps: { at: P3; size: number }[] = [];
      for (let i = 0; i < 16; i++) lumps.push({ at: [x0 + 0.05 + random() * 0.32, inY + 0.03 + random() * 0.06, (random() - 0.5) * 0.48], size: 0.03 + random() * 0.015 });
      for (let i = 0; i < 7 + Math.round(mood.density * 8); i++) lumps.push({ at: [-0.05 + random() * 0.6, 0.03, 0.34 + random() * 0.32], size: 0.03 + random() * 0.012 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), wad, lumps);
    } else {
      s.rod([mx - 0.05, inY + 0.006, 0.05], [mx + 0.01, inY + 0.006, 0.1], 0.006, s.material('#e8b62c'));
    }

    // Left behind.
    if (a.left === 'satchel') {
      const hide = s.material('#8a5630', { roughness: 0.7 });
      s.box([0.07, 0.2, 0.26], [-0.655, 0.52, 0.05], hide);
      s.box([0.075, 0.1, 0.27], [-0.66, 0.58, 0.05], s.material('#7a4a28', { roughness: 0.7 }));
      s.box([0.012, 0.03, 0.03], [-0.7, 0.55, 0.05], s.material('#c9a24a', { metalness: 0.8 }));
      s.tube([[-0.64, 0.62, -0.06], [-0.6, 0.79, -0.02], [-0.6, 0.79, 0.12], [-0.64, 0.62, 0.16]], 0.008, hide);
    } else if (a.left === 'blazer') {
      const cloth = s.material(mood.cheer > 0.5 ? '#2f4f8a' : '#3a3d45', { roughness: 0.95 });
      s.box([0.05, 0.3, 0.5], [-0.6, 0.63, 0], cloth).rotation.z = 0.14;
      s.box([0.1, 0.03, 0.5], [-0.585, 0.785, 0], cloth);
      for (const z of [-0.27, 0.27]) s.rod([-0.6, 0.76, z], [-0.63, 0.4, z * 1.05], 0.035, cloth, 0.03);
      s.box([0.006, 0.05, 0.05], [-0.63, 0.66, 0.14], s.material('#d6b458'));
    } else if (a.left === 'cap') {
      s.mesh(new THREE.ConeGeometry(0.085, 0.3, 20), s.material('#fbf9f0', { roughness: 0.9 }), [-0.36, 0.53, 0.03]).rotation.z = 0.08;
      s.label('D', 0.07, 0.07, [-0.36, 0.47, 0.1], '#c8362c', '#fbf9f0').rotation.x = -0.28;
    } else if (a.left === 'hourglass') {
      const hx = x1 + 0.05, hy = yHigh + 0.008, glassMat = new THREE.MeshStandardMaterial({ color: '#cfe3e6', roughness: 0.1, transparent: true, opacity: 0.55 });
      s.lathe([[0.03, 0], [0.03, 0.015], [0.005, 0.06], [0.03, 0.105], [0.03, 0.12]], glassMat, [hx, hy + 0.008, 0.02]);
      for (const y of [0.004, 0.132]) s.cylinder(0.038, 0.038, 0.008, [hx, hy + y, 0.02], frame, 16);
      s.cylinder(0.026, 0.027, 0.03, [hx, hy + 0.023, 0.02], s.material('#d9a441'), 12);
      s.rod([hx, hy + 0.04, 0.02], [hx, hy + 0.075, 0.02], 0.002, s.material('#d9a441'));
    }

    // Turned so the lid lifts away from the viewer and the well shows.
    s.root.rotation.y = Math.PI;
    return s.finish({
      update: (_dt, time) => {
        if (hovering) { paper.position.y = yHigh + 0.06 + Math.sin(time * 0.9) * mix(0.004, 0.02, mood.energy); paper.rotation.x = Math.sin(time * 0.6) * 0.05; }
        drift.forEach((star, i) => { star.rotation.y = time + i; star.position.y += Math.sin(time * 0.7 + i) * 0.0003; });
      },
    });
  },
});
