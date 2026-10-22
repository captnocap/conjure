import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

export default defineThing({
  questions: {
    keys: choice('How many keys are on the ring?', {
      one: 'A single front-door key.',
      pair: 'Two: a front-door key and an old long mortice key.',
      bunch: 'A full jangling bunch: doors, windows, shed, meter cupboard.',
      twosets: "Two separate rings side by side: both people's sets, returned together.",
    }),
    fob: choice('What is the fob on the ring?', {
      leather: 'A leather tab worn dark and shiny from years in a pocket.',
      agent: "A plastic letting-agent tag with the address handwritten on its paper insert.",
      brass: 'A stamped brass number disc.',
      duck: 'A small yellow rubber duck: someone tried to make this place cheerful.',
      ribbon: 'A loop of frayed red ribbon.',
      bare: 'No fob at all, just the split ring.',
    }),
    note: choice('What note has been left beside the keys?', {
      nothing: 'No note. Nothing to say.',
      thanks: 'THANK YOU, with a kiss.',
      sorry: 'SORRY.',
      address: 'A forwarding address for the post.',
      plant: 'A request to please water the plant.',
      goodbye: 'GOODBYE HOUSE, in a child’s hand.',
    }),
    checklist: choice('What state is the inventory checklist in?', {
      clean: 'Every box ticked in blue biro and signed: nothing to argue about.',
      disputed: 'Red crosses, circled items and deductions scrawled in the margin.',
      half: 'Ticked halfway down and abandoned, the pen left on it.',
      blank: 'Never filled in at all.',
    }),
    envelope: choice('Who is the envelope under the keys addressed to?', {
      landlord: 'LANDLORD, in capitals.',
      next: 'To whoever lives here next.',
      agent: 'A printed window envelope from the letting agent.',
      blank: 'Nobody: a plain sealed envelope.',
      none: 'There is no envelope.',
    }),
    surface: choice('Where have they been left?', {
      worktop: 'On the corner of the empty kitchen worktop.',
      windowsill: 'On a white windowsill in flat daylight.',
      doormat: 'On the doormat just inside the front door.',
      floorboards: 'On the bare floorboards in the middle of the room.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const put = <O extends THREE.Object3D>(o: O, x: number, y: number, z: number, parent: THREE.Object3D = s.root) => { o.position.set(x, y, z); parent.add(o); o.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = n.receiveShadow = true; }); return o; };
    const canvasOf = (w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')!, w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const scrawl = (c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, ink: string, wobble = 0.12) => {
      c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${size}px "Comic Sans MS", "Segoe Print", cursive, sans-serif`;
      const step = size * 0.66; [...text].forEach((ch, i) => { c.save(); c.translate(x + (i - (text.length - 1) / 2) * step, y + (random() - 0.5) * size * wobble); c.rotate((random() - 0.5) * wobble * 2 - 0.06); c.fillText(ch, 0, 0); c.restore(); });
    };
    const sheet = (w: number, d: number, tex: THREE.Texture, thick = 0.0006) => { const paper = new THREE.MeshStandardMaterial({ color: '#f4f1e8', roughness: 0.9 }); return new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), [paper, paper, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), paper, paper, paper]); };

    // --- surface (top at y = 0)
    if (a.surface === 'worktop') {
      const tex = canvasOf(128, 128, (c) => { c.fillStyle = mood.warmth > 0.5 ? '#c9b89a' : '#b9bcb8'; c.fillRect(0, 0, 128, 128); for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '60,55,50' : '250,250,245'},${0.15 + random() * 0.3})`; c.fillRect(random() * 128, random() * 128, 1.5, 1.5); } });
      const lam = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
      put(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.4), lam), 0, -0.0175, 0);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.012), s.material('#f1eee4', { roughness: 0.35 })), 0, 0.05, -0.194);
      for (let i = 1; i < 4; i++) put(new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.1, 0.002), s.material('#b5b2a8')), -0.23 + i * 0.115, 0.05, -0.187);
    } else if (a.surface === 'windowsill') {
      const white = s.material('#f3f1ea', { roughness: 0.5 });
      put(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.34), white), 0, -0.015, 0.02);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.06), s.material(mood.warmth > 0.5 ? '#e6dcc6' : '#dfe2e2')), 0, -0.06, -0.1);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.04, 0.04), white), 0, 0.02, -0.13);
      for (const x of [-0.215, 0, 0.215]) put(new THREE.Mesh(new THREE.BoxGeometry(x ? 0.04 : 0.022, 0.2, 0.04), white), x, 0.12, -0.13);
      put(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.19, 0.006), new THREE.MeshStandardMaterial({ color: '#cfe1ea', roughness: 0.1, emissive: new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.5, 0.75), emissiveIntensity: 0.45 })), 0, 0.125, -0.135);
    } else if (a.surface === 'doormat') {
      const boards = s.material('#a98258'), boards2 = s.material('#9a7650');
      for (let i = 0; i < 4; i++) put(new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.02, 0.42), i % 2 ? boards : boards2), -0.195 + i * 0.13, -0.026, 0);
      const tex = canvasOf(256, 160, (c, w, h) => { c.fillStyle = '#8a6a3c'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '50,35,15' : '190,160,100'},0.35)`; c.fillRect(random() * w, random() * h, 1.5, 3); } c.fillStyle = `rgba(35,25,15,${0.75 - mood.wear * 0.4})`; c.font = 'bold 44px Arial, sans-serif'; c.textAlign = 'center'; c.fillText(mood.cheer > 0.5 ? 'WELCOME' : 'HOME', w / 2, h * 0.3); c.strokeStyle = 'rgba(35,25,15,0.6)'; c.lineWidth = 5; c.strokeRect(10, 10, w - 20, h - 20); });
      const coir = s.material('#7a5c33', { roughness: 1 });
      put(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.016, 0.34), [coir, coir, new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }), coir, coir, coir]), 0, -0.008, 0);
    } else {
      const cols = ['#a98258', '#9a7650', '#b08a60'];
      for (let i = 0; i < 4; i++) { const b = put(new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.022, 0.42), s.material(cols[i % 3])), -0.18 + i * 0.12, -0.011, 0); for (const z of [-0.17, 0.17]) put(new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.001, 6), s.material('#3a2e24')), (random() - 0.5) * 0.06, 0.0112, z + (random() - 0.5) * 0.02, b); }
    }

    // --- envelope, checklist, note: a loose overlapping pile
    let top = 0.0004;
    if (a.envelope !== 'none') {
      const manila = a.envelope === 'landlord' || a.envelope === 'blank';
      const tex = canvasOf(320, 160, (c, w, h) => {
        c.fillStyle = manila ? '#c9a66b' : '#f3f0e6'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(80,60,30,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(w / 2, h * 0.55); c.lineTo(w, 0); c.stroke();
        if (a.envelope === 'landlord') scrawl(c, 'LANDLORD', w / 2, h * 0.72, 34, '#1a1a1a', 0.08);
        if (a.envelope === 'next') { scrawl(c, 'TO WHOEVER', w / 2, h * 0.62, 26, '#1d2b6b'); scrawl(c, 'LIVES HERE NEXT', w / 2, h * 0.84, 24, '#1d2b6b'); }
        if (a.envelope === 'agent') { c.fillStyle = '#dfe6e8'; c.fillRect(w * 0.1, h * 0.55, w * 0.42, h * 0.3); c.fillStyle = '#555'; for (let i = 0; i < 3; i++) c.fillRect(w * 0.13, h * (0.61 + i * 0.07), w * (0.3 - i * 0.05), 3); c.fillStyle = '#1f5f8a'; c.fillRect(w * 0.68, h * 0.62, w * 0.24, h * 0.1); }
      });
      const env = put(sheet(0.22, 0.11, tex, 0.002), -0.07, 0.001, -0.1); env.rotation.y = 0.5 + (random() - 0.5) * 0.3; top = 0.0022;
    }
    const listTex = canvasOf(256, 362, (c, w, h) => {
      c.fillStyle = '#f6f4ec'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#23303a'; c.fillRect(16, 14, w - 32, 30); c.fillStyle = '#f6f4ec'; c.font = 'bold 19px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CHECK-OUT INVENTORY', w / 2, 30);
      const rows = 12, done = a.checklist === 'blank' ? 0 : a.checklist === 'half' ? 5 + Math.floor(random() * 2) : rows;
      for (let i = 0; i < rows; i++) {
        const y = 66 + i * 21; c.strokeStyle = '#444'; c.lineWidth = 1.6; c.strokeRect(22, y - 7, 14, 14);
        c.fillStyle = '#8a8f93'; c.fillRect(46, y - 3, 60 + ((i * 37) % 70), 5); c.fillStyle = '#c3c7c9'; c.fillRect(178, y - 3, 56, 5);
        if (i < done) {
          const bad = a.checklist === 'disputed' && random() < 0.55;
          c.strokeStyle = bad ? '#c4221c' : '#1d3fa8'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
          if (bad) { c.moveTo(22, y - 7); c.lineTo(37, y + 8); c.moveTo(37, y - 7); c.lineTo(22, y + 8); c.stroke(); if (random() < 0.6) { c.lineWidth = 2; c.beginPath(); c.ellipse(80 + ((i * 37) % 70) / 2, y, 44 + ((i * 37) % 70) / 2, 9, 0, 0, 6.5); c.stroke(); c.font = 'bold 13px "Comic Sans MS", cursive, sans-serif'; c.fillStyle = '#c4221c'; c.fillText('-£' + (20 + Math.floor(random() * 18) * 10), 222, y - 1); } }
          else { c.moveTo(23, y); c.lineTo(28, y + 6); c.lineTo(40, y - 9); c.stroke(); }
        }
      }
      c.fillStyle = '#8a8f93'; c.fillRect(22, h - 34, 60, 3); c.fillRect(150, h - 34, 84, 3);
      if (a.checklist === 'clean' || a.checklist === 'disputed') { c.strokeStyle = '#1d3fa8'; c.lineWidth = 2; c.beginPath(); let x = 152; c.moveTo(x, h - 42); for (let i = 0; i < 9; i++) { x += 8; c.quadraticCurveTo(x - 6, h - 62 + random() * 26, x, h - 42 + (random() - 0.5) * 8); } c.stroke(); }
      if (a.checklist === 'disputed') { c.save(); c.translate(w * 0.62, h * 0.86); c.rotate(-0.2); scrawl(c, 'DISPUTED', 0, 0, 22, '#c4221c'); c.restore(); }
      for (let i = 0; i < mood.wear * 3; i++) { c.strokeStyle = 'rgba(120,80,40,0.35)'; c.lineWidth = 4; c.beginPath(); c.arc(random() * w, random() * h, 26, 0, 7); c.stroke(); }
    });
    const list = put(sheet(0.21, 0.297, listTex), 0.0, top + 0.0004, 0.0); list.rotation.y = -0.18 + (random() - 0.5) * 0.25;
    top += 0.001;
    if (a.note !== 'nothing') {
      const sticky = a.note === 'thanks' || a.note === 'sorry' || a.note === 'plant';
      const lines = { thanks: ['THANK', 'YOU x'], sorry: ['SORRY'], address: ['POST TO:', '14 ELM RD', 'FLAT 2'], plant: ['PLEASE', 'WATER', 'THE FERN'], goodbye: ['GOODBYE', 'HOUSE'] }[a.note];
      const tex = canvasOf(192, 192, (c, w, h) => {
        c.fillStyle = sticky ? (mood.cheer > 0.5 ? '#f6e36a' : '#f1d9e0') : '#f6f4ec'; c.fillRect(0, 0, w, h);
        if (!sticky) { c.strokeStyle = 'rgba(80,120,190,0.45)'; c.lineWidth = 1.5; for (let y = 30; y < h; y += 26) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } }
        const size = Math.min(52, (w * 1.35) / Math.max(...lines.map((l) => l.length)));
        const ink = a.note === 'goodbye' ? ['#c2262b', '#1f55b8', '#1d8a47'] : ['#1a1f3a'];
        lines.forEach((l, i) => scrawl(c, l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.15, size, ink[i % ink.length], a.note === 'goodbye' ? 0.3 : 0.12));
        if (a.note === 'goodbye') { c.fillStyle = '#c2262b'; c.beginPath(); c.arc(w * 0.78, h * 0.84, 9, 0, 7); c.arc(w * 0.87, h * 0.84, 9, 0, 7); c.fill(); c.beginPath(); c.moveTo(w * 0.73, h * 0.87); c.lineTo(w * 0.825, h * 0.96); c.lineTo(w * 0.92, h * 0.87); c.fill(); }
      });
      const size = sticky ? 0.076 : 0.11;
      const note = put(sheet(size, size, tex), 0.125, top + 0.0004, 0.125); note.rotation.y = 0.25 + (random() - 0.5) * 0.4;
      if (sticky) { note.rotation.x = 0.05; note.position.y += 0.002; }
    }
    // the pen
    const pen = new THREE.Group(); const ink = a.checklist === 'disputed' ? '#c4221c' : '#1d3fa8';
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.125, 8), new THREE.MeshStandardMaterial({ color: '#e9eef0', roughness: 0.2 })); barrel.rotation.z = Math.PI / 2; pen.add(barrel);
    const capm = new THREE.Mesh(new THREE.CylinderGeometry(0.0046, 0.0046, 0.04, 8), s.material(ink, { roughness: 0.3 })); capm.rotation.z = Math.PI / 2; capm.position.x = 0.05; pen.add(capm);
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 8), s.material('#c9a53a', { metalness: 0.7 })); nib.rotation.z = Math.PI / 2; nib.position.x = -0.069; pen.add(nib);
    put(pen, a.checklist === 'half' ? -0.07 : -0.16, top + 0.0045, a.checklist === 'half' ? 0.1 : 0.08).rotation.y = a.checklist === 'half' ? 0.5 : 1.2 + random() * 0.5;

    // --- keys
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: mix(0.25, 0.5, mood.wear) }), nickel = s.material('#c3c8cc', { metalness: 0.9, roughness: mix(0.2, 0.45, mood.wear) }), iron = s.material('#5a5650', { metalness: 0.7, roughness: 0.55 });
    const capHex = ['#c8281e', '#1f5fb8', '#2c9a57', '#e2a81c', '#7a3aa8'];
    const yale = (mat: THREE.Material, capped: boolean, len = 0.03) => {
      const g = new THREE.Group();
      const sh = new THREE.Shape(); const hw = 0.0042;
      sh.absarc(0, 0, 0.0115, -Math.PI / 2 + 0.38, Math.PI * 1.5 - 0.38, false);
      sh.lineTo(-hw, -0.014); let y = -0.014; const pts: [number, number][] = [];
      while (y > -0.012 - len) { y -= 0.0026; pts.push([hw - random() * 0.0034, y]); y -= 0.001; pts.push([hw, y]); }
      sh.lineTo(-hw, y - 0.003); sh.lineTo(hw * 0.2, y - 0.006); sh.lineTo(hw, y - 0.002); for (const p of pts.reverse()) sh.lineTo(p[0], p[1]); sh.lineTo(hw, -0.014);
      const hole = new THREE.Path(); hole.absarc(0, 0.0055, 0.0028, 0, Math.PI * 2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false, curveSegments: 10 }); geo.translate(0, -0.0055, 0); geo.rotateX(Math.PI / 2);
      g.add(new THREE.Mesh(geo, mat));
      if (capped) { const csh = new THREE.Shape(); csh.absarc(0, 0, 0.013, 0, Math.PI * 2, false); const ch = new THREE.Path(); ch.absarc(0, 0.0055, 0.0034, 0, Math.PI * 2, true); csh.holes.push(ch); const cg = new THREE.ExtrudeGeometry(csh, { depth: 0.0034, bevelEnabled: false, curveSegments: 10 }); cg.translate(0, -0.0055, -0.0007); cg.rotateX(Math.PI / 2); g.add(new THREE.Mesh(cg, s.material(capHex[Math.floor(random() * 5)], { roughness: 0.6 }))); }
      return g; // hole at the origin, blade running out along +z
    };
    const mortice = () => {
      const g = new THREE.Group();
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.0095, 0.0022, 8, 20), iron); bow.rotation.x = Math.PI / 2; bow.position.z = 0.0075; g.add(bow);
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.058, 8), iron); shank.rotation.x = Math.PI / 2; shank.position.z = 0.046; g.add(shank);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), iron); collar.rotation.x = Math.PI / 2; collar.position.z = 0.02; g.add(collar);
      const bit = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.0022, 0.013), iron); bit.position.set(0.008, 0, 0.066); g.add(bit);
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.0024, 0.004), iron); notch.position.set(0.012, 0, 0.057); g.add(notch);
      return g;
    };
    const bunch = (cx: number, cz: number, count: number, withMortice: boolean, fob: typeof a.fob, turn: number, big = 2.5) => {
      const g = new THREE.Group(); const R = 0.014;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0011, 6, 36), nickel); ring.rotation.x = Math.PI / 2 + 0.12; ring.position.y = 0.0042; g.add(ring);
      const ring2 = ring.clone(); ring2.position.y = 0.0052; ring2.rotation.y = 0.3; g.add(ring2);
      const spread = Math.min(2.9, 0.75 * count);
      for (let i = 0; i < count; i++) {
        const an = count === 1 ? 0 : -spread / 2 + (i / (count - 1)) * spread + (random() - 0.5) * 0.25;
        const key = withMortice && i === count - 1 ? mortice() : yale(i % 3 === 1 ? nickel : brass, random() < 0.3, i % 4 === 3 ? 0.018 : 0.028 + random() * 0.006);
        key.rotation.y = an; key.rotation.x = (random() - 0.5) * 0.08; key.position.set(Math.sin(an) * R, 0.0012 + i * 0.0022, Math.cos(an) * R); g.add(key);
      }
      // the fob trails off the other side
      const f = new THREE.Group(); const fa = Math.PI + (random() - 0.5) * 0.8;
      if (fob !== 'bare') { const link = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0008, 5, 14), nickel); link.rotation.x = Math.PI / 2; link.position.z = 0.006; f.add(link); }
      if (fob === 'leather') {
        const lsh = new THREE.Shape(); lsh.moveTo(-0.006, 0.01); lsh.lineTo(0.006, 0.01); lsh.lineTo(0.015, 0.03); lsh.lineTo(0.015, 0.068); lsh.absarc(0, 0.068, 0.015, 0, Math.PI, false); lsh.lineTo(-0.015, 0.03); lsh.closePath();
        const lg = new THREE.ExtrudeGeometry(lsh, { depth: 0.0035, bevelEnabled: true, bevelThickness: 0.0008, bevelSize: 0.0008, bevelSegments: 2 }); lg.rotateX(Math.PI / 2); lg.translate(0, 0.004, 0);
        f.add(new THREE.Mesh(lg, s.material(new THREE.Color('#8a4f25').lerp(new THREE.Color('#3a2414'), 0.3 + mood.wear * 0.6), { roughness: mix(0.7, 0.3, mood.wear) })));
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.002, 10), brass); stud.position.set(0, 0.0055, 0.024); f.add(stud);
      } else if (fob === 'agent') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.056), s.material(mood.cheer > 0.5 ? '#e2661d' : '#2a5ea8', { roughness: 0.4 })); body.position.set(0, 0.002, 0.042); f.add(body);
        const tag = s.label(['FLAT 3B', 'No. 14', 'TOP FLAT', '22A'][Math.floor(random() * 4)], 0.046, 0.022, [0, 0, 0], '#1a1f3a', '#f6f4ec'); tag.rotation.set(-Math.PI / 2, 0, Math.PI / 2); tag.position.set(0, 0.0043, 0.044); f.add(tag);
      } else if (fob === 'brass') {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.002, 28), brass); disc.position.set(0, 0.001, 0.031); f.add(disc);
        const num = s.label(String(1 + Math.floor(random() * 98)), 0.024, 0.02, [0, 0, 0], '#4a3610', '#c9a24a'); num.rotation.set(-Math.PI / 2, 0, Math.PI); num.position.set(0, 0.0022, 0.031); f.add(num);
      } else if (fob === 'duck') {
        const yel = s.material('#f2c318', { roughness: 0.45 });
        const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 10), yel); b1.scale.set(1, 0.85, 1.25); b1.position.set(0, 0.012, 0.034); f.add(b1);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), yel); hd.position.set(0, 0.026, 0.044); f.add(hd);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.008, 8), s.material('#e2661d')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.025, 0.055); f.add(beak);
        for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0014, 6, 6), s.material('#111')); eye.position.set(sx * 0.0045, 0.029, 0.051); f.add(eye); }
        const tailm = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.012, 8), yel); tailm.rotation.x = -1.0; tailm.position.set(0, 0.018, 0.018); f.add(tailm);
      } else if (fob === 'ribbon') {
        const red = s.material('#b3262b', { roughness: 0.9 });
        const loop = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.002, 0.008], [0.012, 0.002, 0.03], [0.02, 0.002, 0.06], [0.004, 0.002, 0.075], [-0.014, 0.002, 0.058], [-0.01, 0.002, 0.03], [0, 0.003, 0.008]].map((p) => new THREE.Vector3(...p))), 40, 0.0016, 5), red); loop.scale.y = 0.6; f.add(loop);
        for (const sx of [-1, 1]) { const end = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.0008, 0.026), red); end.position.set(sx * 0.008, 0.001, 0.088); end.rotation.y = sx * 0.4; f.add(end); }
      }
      f.rotation.y = fa; f.position.set(Math.sin(fa) * R, 0.001, Math.cos(fa) * R); g.add(f);
      g.rotation.y = turn; g.scale.setScalar(big); put(g, cx, top + 0.0006, cz); return g;
    };
    const turn = 0.4 + random() * 1.2;
    if (a.keys === 'twosets') { bunch(0.05, -0.05, 2 + Math.floor(random() * 2), true, a.fob, turn, 2.2); bunch(-0.06, 0.07, 2, false, random() < 0.5 ? 'bare' : 'ribbon', turn + 2 + random(), 2); }
    else bunch(0.0, -0.01, a.keys === 'one' ? 1 : a.keys === 'pair' ? 2 : 5 + Math.round(mood.density * 2), a.keys !== 'one', a.fob, turn);

    return s.finish();
  },
});
