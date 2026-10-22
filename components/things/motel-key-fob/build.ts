import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

const NUMBERS = {
  n7: '7: a small place, one row of rooms.',
  n12: '12: the end of the row.',
  n13: '13: the unlucky one.',
  n108: '108: ground floor of a bigger motel.',
  n217: '217: upstairs, along the balcony.',
  n9: '9: easy to forget.',
} as const;

export default defineThing({
  questions: {
    fob: choice('What is the fob like?', {
      'red-diamond': 'A big red plastic diamond, the classic.',
      'teal-oval': 'A teal oval with a cream border.',
      'wooden-paddle': 'A long wooden paddle with the number burnt in, too big to pocket by accident.',
      keycard: 'A modern plastic keycard in a paper sleeve with the number handwritten on it.',
    }),
    number: choice('What is the room number?', NUMBERS),
    name: choice('How is the motel name painted on it?', {
      script: 'A looping script name, mid-century and hopeful.',
      block: 'Plain block capitals: MOTEL.',
      star: 'A name under an atomic starburst.',
      none: 'No name, only the number.',
    }),
    where: choice('Where is the key?', {
      alone: 'Lying alone, as if just put down or just found.',
      board: 'Hanging on a hook board among the other hooks, behind the front desk.',
      registration: 'Beside a filled-in registration card and a pen.',
      pair: 'Lying with a second key to the same room.',
    }),
    key: choice('What is the key itself like?', {
      brass: 'A plain brass key with a round bow.',
      steel: 'A newer steel copy with a square bow, the original was lost.',
      skeleton: 'An old long-shanked key from before the locks were changed.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const number = a.number.slice(1);
    const card = a.fob === 'keycard';
    const fobTint = { 'red-diamond': '#d42a22', 'teal-oval': '#1fa39a', 'wooden-paddle': '#b98a52', keycard: '#f1ecdc' }[a.fob];
    const inkTint = { 'red-diamond': '#fff6e0', 'teal-oval': '#fff6e0', 'wooden-paddle': '#2a1608', keycard: '#1c2a6b' }[a.fob];
    const metal = s.material(a.key === 'steel' ? '#c9ced2' : '#c9a24a', { metalness: 0.88, roughness: mix(0.2, 0.5, mood.wear) });
    const ringMat = s.material('#cfd3d6', { metalness: 0.9, roughness: 0.25 });
    const motel = { script: 'Starlite', block: 'MOTEL', star: 'ATOMIC INN', none: '' }[a.name];
    const fresh = 1 - mood.wear * 0.5;

    const outline = () => {
      const sh = new THREE.Shape();
      if (a.fob === 'red-diamond') { sh.moveTo(0, 0.012); sh.lineTo(0.036, -0.045); sh.lineTo(0, -0.105); sh.lineTo(-0.036, -0.045); sh.closePath(); }
      else if (a.fob === 'teal-oval') sh.absellipse(0, -0.04, 0.03, 0.052, 0, Math.PI * 2);
      else if (a.fob === 'wooden-paddle') { sh.moveTo(-0.012, 0.01); sh.quadraticCurveTo(0, 0.018, 0.012, 0.01); sh.lineTo(0.024, -0.12); sh.quadraticCurveTo(0, -0.15, -0.024, -0.12); sh.closePath(); }
      else { sh.moveTo(-0.031, 0.012); sh.lineTo(0.031, 0.012); sh.lineTo(0.031, -0.082); sh.lineTo(-0.031, -0.082); sh.closePath(); }
      return sh;
    };
    const faceTexture = () => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 512;
      const g = c.getContext('2d')!;
      g.fillStyle = fobTint; g.fillRect(0, 0, 256, 512);
      if (a.fob === 'wooden-paddle') for (let i = 0; i < 50; i++) { g.strokeStyle = `rgba(60,30,10,${0.08 + random() * 0.15})`; g.lineWidth = 1 + random() * 2; const x = random() * 256; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + random() * 16 - 8, 170, x + random() * 16 - 8, 340, x, 512); g.stroke(); }
      if (a.fob === 'teal-oval') { g.strokeStyle = '#fff6e0'; g.lineWidth = 12; g.beginPath(); g.ellipse(128, 256, 104, 232, 0, 0, 7); g.stroke(); }
      g.globalAlpha = fresh; g.fillStyle = inkTint; g.textAlign = 'center'; g.textBaseline = 'middle';
      const mid = a.fob === 'wooden-paddle' ? 300 : card ? 300 : 250;
      if (card) {
        g.font = 'italic bold 30px serif'; g.fillText(motel || 'Room', 128, 150);
        g.strokeStyle = inkTint; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 340); g.lineTo(196, 340); g.stroke();
        g.font = 'italic bold 96px cursive'; g.fillText(number, 128, 280, 150);
        g.font = '16px monospace'; g.fillText('CHECKOUT 11 AM', 128, 380);
      } else {
        if (a.name === 'star') { g.save(); g.translate(128, mid - 118); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.lineTo(5, -8); g.lineTo(0, i % 2 ? -22 : -34); g.lineTo(-5, -8); g.fill(); } g.restore(); }
        g.font = a.name === 'script' ? 'italic bold 34px serif' : 'bold 26px monospace';
        if (motel) g.fillText(motel, 128, mid - 74, a.fob === 'wooden-paddle' ? 86 : 110);
        g.font = `bold ${number.length > 2 ? 78 : 104}px monospace`; g.fillText(number, 128, mid, a.fob === 'wooden-paddle' ? 92 : 150);
        g.font = 'bold 13px monospace';
        ['DROP IN ANY', 'MAILBOX', 'WE GUARANTEE', 'POSTAGE'].forEach((t, i) => g.fillText(t, 128, mid + 66 + i * 16, 100 - i * 12));
      }
      g.globalAlpha = 1;
      // Thumb wear and scratches.
      for (let i = 0; i < Math.round(mood.wear * 60); i++) { g.strokeStyle = `rgba(255,255,255,${0.1 + random() * 0.2})`; g.lineWidth = 1; const x = random() * 256, y = random() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + random() * 40 - 20, y + random() * 40 - 20); g.stroke(); }
      if (mood.wear > 0.4) { const r = g.createRadialGradient(150, 300, 5, 150, 300, 80); r.addColorStop(0, `rgba(255,255,255,${mood.wear * 0.3})`); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 512); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
    };

    /** A key set built hanging from its ring: origin at the ring centre, fob and key dangling toward -y, face toward +z. */
    const keySet = (keyAngle: number, fobAngle: number) => {
      const set = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0018, 8, 32), ringMat); ring.rotation.y = 0.5; ring.castShadow = true; set.add(ring);
      // Fob.
      const fob = new THREE.Group(); fob.rotation.z = fobAngle; fob.position.y = -0.012; set.add(fob);
      const shape = outline();
      const thick = a.fob === 'wooden-paddle' ? 0.009 : card ? 0.0014 : 0.0055;
      if (!card) { const hole = new THREE.Path(); hole.absarc(0, 0, 0.004, 0, Math.PI * 2, true); shape.holes.push(hole); }
      const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: !card, bevelSize: 0.001, bevelThickness: 0.001, bevelSegments: 2 });
      const body = new THREE.Mesh(bodyGeo, s.material(fobTint, { roughness: a.fob === 'wooden-paddle' ? 0.8 : 0.35 })); body.position.z = -thick / 2; body.castShadow = true; fob.add(body);
      const faceGeo = new THREE.ShapeGeometry(shape, 24);
      faceGeo.computeBoundingBox();
      const bb = faceGeo.boundingBox!, uv = faceGeo.attributes.uv, pos = faceGeo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
      const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: 0.4 })); face.position.z = thick / 2 + 0.0012; fob.add(face);
      if (card) {
        // The plastic card half out of its sleeve.
        const pc = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.0856, 0.0008), s.material(mood.cheer > 0.5 ? '#2a6ad8' : '#30343a', { roughness: 0.25 })); pc.position.set(0.004, 0.002, -0.0012); pc.rotation.z = 0.06; pc.castShadow = true; fob.add(pc);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.01, 0.0009), s.material('#15120f')); stripe.position.set(0, 0.03, 0); pc.add(stripe);
        ring.visible = false;
        return set;
      }
      // Key.
      const key = new THREE.Group(); key.rotation.z = keyAngle; key.position.y = -0.012; set.add(key);
      const bow = new THREE.Shape();
      if (a.key === 'steel') { bow.moveTo(-0.012, 0.006); bow.lineTo(0.012, 0.006); bow.lineTo(0.012, -0.018); bow.lineTo(-0.012, -0.018); bow.closePath(); }
      else bow.absarc(0, -0.007, a.key === 'skeleton' ? 0.011 : 0.013, 0, Math.PI * 2);
      const eye = new THREE.Path(); eye.absarc(0, a.key === 'skeleton' ? -0.007 : 0, a.key === 'skeleton' ? 0.007 : 0.0035, 0, Math.PI * 2, true); bow.holes.push(eye);
      const add = (geo: THREE.BufferGeometry, x = 0, y = 0) => { const m = new THREE.Mesh(geo, metal); m.position.set(x, y, -0.001); m.castShadow = true; key.add(m); return m; };
      add(new THREE.ExtrudeGeometry(bow, { depth: 0.002, bevelEnabled: false }));
      if (a.key === 'skeleton') {
        const shank = add(new THREE.CylinderGeometry(0.0022, 0.0022, 0.06, 8), 0, -0.048); shank.position.z = 0;
        add(new THREE.BoxGeometry(0.012, 0.012, 0.002), 0.007, -0.07); add(new THREE.BoxGeometry(0.004, 0.005, 0.0021), 0.011, -0.063).material = s.material('#3a2c10');
      } else {
        const blade = new THREE.Shape(); blade.moveTo(-0.004, -0.018); blade.lineTo(0.004, -0.018);
        let y = -0.024; while (y > -0.055) { const depth = 0.001 + random() * 0.003; blade.lineTo(0.004 - depth, y); y -= 0.004; blade.lineTo(0.004, y + 0.001); }
        blade.lineTo(0.001, -0.06); blade.lineTo(-0.004, -0.056); blade.closePath();
        add(new THREE.ExtrudeGeometry(blade, { depth: 0.0018, bevelEnabled: false }));
        add(new THREE.BoxGeometry(0.0012, 0.034, 0.0022), -0.001, -0.038).material = s.material(a.key === 'steel' ? '#8f959a' : '#8a6a22', { metalness: 0.8 });
      }
      return set;
    };

    const lay = (set: THREE.Group, x: number, z: number, turn: number) => { set.rotation.set(-Math.PI / 2, 0, turn, 'YXZ'); set.rotation.y = turn; set.rotation.z = 0; set.position.set(x, 0.0045, z); s.root.add(set); return set; };
    let hung: THREE.Group | null = null;

    if (a.where === 'board') {
      const bw = 0.42, bh = 0.34, by = 0.03;
      const boardWood = s.material(mood.warmth > 0.5 ? '#7a4e2a' : '#5d5348', { roughness: 0.7 });
      s.box([bw, bh, 0.018], [0, by + bh / 2, -0.009], boardWood);
      s.box([bw + 0.03, 0.03, 0.06], [0, 0.015, -0.005], boardWood);
      s.box([bw + 0.02, 0.014, 0.024], [0, by + bh + 0.007, -0.008], s.material('#3a2a1a'));
      const nums = Object.keys(NUMBERS).map((k) => k.slice(1));
      const cols = 4, mine = Math.floor(random() * cols);
      const others = nums.filter((n) => n !== number);
      for (let row = 0; row < 2; row++) for (let col = 0; col < cols; col++) {
        const x = (col - (cols - 1) / 2) * 0.1, y = by + bh - 0.07 - row * 0.15;
        const isMine = row === 0 && col === mine;
        s.label(isMine ? number : others[(row * cols + col) % others.length], 0.045, 0.024, [x, y + 0.03, 0.001], '#2a1c10', '#d8c08a');
        s.rod([x, y, 0], [x, y, 0.016], 0.0022, ringMat); s.rod([x, y, 0.016], [x, y + 0.01, 0.018], 0.0022, ringMat);
        if (isMine) { const set = keySet(0.35 + random() * 0.2, -0.06); set.position.set(x, y - 0.012, 0.014); s.root.add(set); hung = set; }
        else if (random() < mood.density * 0.6) {
          // A neighbour's key still on its hook: someone else is out, or nobody came.
          const other = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.003), s.material(fobTint, { roughness: 0.4 })); other.position.set(x, y - 0.05, 0.012); other.rotation.z = (random() - 0.5) * 0.3; other.castShadow = true; s.root.add(other);
          s.ring(0.01, 0.001, [x, y - 0.01, 0.014], ringMat);
        }
      }
    } else {
      if (a.where === 'registration') {
        const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d')!;
        g.fillStyle = '#f3ecd6'; g.fillRect(0, 0, 512, 320);
        g.fillStyle = '#2a2a2a'; g.font = 'bold 26px monospace'; g.fillText('GUEST REGISTRATION', 20, 38);
        g.font = '16px monospace';
        ['NAME', 'ADDRESS', 'MAKE OF CAR', 'LICENSE', 'NIGHTS      ROOM'].forEach((t, i) => { g.fillText(t, 20, 84 + i * 48); g.fillRect(20, 96 + i * 48, 470, 2); });
        g.strokeStyle = '#1c2a8a'; g.lineWidth = 3;
        for (let row = 0; row < 4; row++) { g.beginPath(); let x = 150; const y = 82 + row * 48; g.moveTo(x, y); const len = 90 + random() * 220; while (x < 150 + len) { x += 6 + random() * 10; g.lineTo(x, y + (random() - 0.5) * 16); } g.stroke(); }
        g.fillStyle = '#1c2a8a'; g.font = 'italic bold 30px cursive'; g.fillText(String(1 + Math.floor(random() * 3)), 110, 280); g.fillText(number, 300, 280);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const cardMesh = s.mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), [-0.03, 0.0052, -0.04]);
        cardMesh.rotation.x = -Math.PI / 2; cardMesh.rotation.z = 0.12 + (random() - 0.5) * 0.2;
        const pen = s.cylinder(0.0045, 0.0045, 0.13, [0.02, 0.009, 0.045], s.material('#1c2a6b', { roughness: 0.3 }), 10); pen.rotation.set(Math.PI / 2, 0, 1.2 + random() * 0.5);
        const tip = s.cylinder(0.0045, 0.001, 0.014, [0, 0, 0], ringMat, 8); tip.position.set(0, 0.072, 0); pen.add(tip);
      }
      const main = keySet(1.9 + random() * 0.9, (random() - 0.5) * 0.3);
      lay(main, a.where === 'registration' ? 0.1 : 0, a.where === 'registration' ? -0.07 : -0.05, (random() - 0.5) * 0.9);
      if (a.where === 'pair') { const second = keySet(-2 - random() * 0.6, 0.2); lay(second, 0.07, -0.02, 1.2 + random() * 0.6); second.position.y += 0.005; main.position.x = -0.03; }
      else if (a.where === 'alone' && mood.density > 0.6) { for (let i = 0; i < 3; i++) s.cylinder(0.011, 0.011, 0.0018, [-0.075 + random() * 0.03, 0.005 + i * 0.0018, 0.03 + random() * 0.04], i ? ringMat : s.material('#b87333', { metalness: 0.8 }), 14); }
    }

    return s.finish({ update: (_dt, time) => { if (hung) hung.rotation.z = Math.sin(time * 1.6) * 0.1 * mood.energy; } });
  },
});
