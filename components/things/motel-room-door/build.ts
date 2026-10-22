import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    colour: choice('What colour is the door painted?', {
      turquoise: 'Turquoise, sun-faded, cheerful once.',
      orange: 'Burnt orange, 1970s and unapologetic.',
      beige: 'Institutional beige, repainted every few years over the chips.',
      red: 'Chipped red, the paint flaking to grey primer.',
    }),
    number: choice('What is the room number?', {
      n7: '7: a small place, one row of rooms.',
      n12: '12: the end of the row, by the ice machine.',
      n13: '13: the room they usually skip.',
      n108: '108: ground floor of a bigger chain motel.',
      n217: '217: upstairs, along the balcony.',
      n6: '6: nothing special, which is the point.',
    }),
    state: choice('How is the door?', {
      shut: 'Shut tight, a thin line of light under the sill.',
      ajar: 'Ajar, a blade of daylight slicing across the carpet.',
      kicked: 'Kicked in: the jamb splintered around the lock, the door hanging open.',
    }),
    chain: choice('What about the security chain?', {
      on: 'Fastened across, holding the door.',
      dangling: 'Unhooked and dangling from the frame.',
      broken: 'Snapped, a link on the floor.',
    }),
    hanger: choice('What hangs on the knob?', {
      dnd: 'A red DO NOT DISTURB hanger.',
      makeup: 'A green PLEASE MAKE UP ROOM hanger.',
      none: 'Nothing.',
    }),
    slid: choice('What has been slid under the door?', {
      nothing: 'Nothing.',
      bill: 'The folded bill in a white envelope, checkout is coming.',
      menus: 'A fan of bright takeaway menus.',
      note: 'A single torn note in handwriting.',
      newspaper: 'The morning newspaper, pushed halfway through.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const dw = 0.9, dh = 2.03, wallW = 1.7, wallH = 2.4, wallT = 0.13;
    const hue = { turquoise: '#2fb5ad', orange: '#c8632a', beige: '#cdbf9e', red: '#b3302a' }[a.colour];
    const number = a.number.slice(1);
    const dark = s.material('#272523');
    const brass = s.material('#c9a24a', { metalness: 0.8, roughness: mix(0.25, 0.6, mood.wear) });
    const trim = s.material('#e9e3d2');
    const wall = s.material(mood.warmth > 0.5 ? '#d6bf94' : '#c2cbc4', { roughness: 0.95 });
    const day = 1 - Math.abs(mood.daylight - 0.5) * 1.4;
    const outside = new THREE.Color().setHSL(mix(0.6, 0.08, mood.warmth), 0.6, mix(0.5, 0.88, day));
    const light = new THREE.MeshStandardMaterial({ color: outside, emissive: outside, emissiveIntensity: 1.1, roughness: 0.4 });

    // Wall slice with opening, casing, baseboard, switch.
    const sideW = (wallW - dw) / 2;
    for (const x of [-1, 1]) s.box([sideW, wallH, wallT], [x * (dw + sideW) / 2, wallH / 2, -wallT / 2], wall);
    s.box([dw, wallH - dh, wallT], [0, dh + (wallH - dh) / 2, -wallT / 2], wall);
    for (const x of [-1, 1]) { s.box([0.07, dh + 0.07, 0.03], [x * (dw / 2 + 0.035), (dh + 0.07) / 2, 0.01], trim); s.box([sideW, 0.1, 0.02], [x * (dw + sideW) / 2, 0.05, 0.008], s.material('#5a4a3a')); }
    s.box([dw + 0.14, 0.07, 0.03], [0, dh + 0.035, 0.01], trim);
    s.box([0.07, 0.11, 0.012], [dw / 2 + 0.2, 1.2, 0.006], trim); s.box([0.012, 0.03, 0.02], [dw / 2 + 0.2, 1.2 + (random() > 0.5 ? 0.01 : -0.01), 0.012], dark);
    // Carpet, sill, the world outside.
    const carpet = s.material(mood.warmth > 0.5 ? '#8a4a2c' : '#3f6866', { roughness: 1 });
    s.box([wallW, 0.02, 1.0], [0, -0.01, 0.5], carpet);
    s.box([dw, 0.02, wallT + 0.02], [0, 0.0, -wallT / 2], s.material('#8a8478', { metalness: 0.5 }));
    s.box([dw, dh, 0.01], [0, dh / 2, -wallT + 0.005], light);
    s.box([dw - 0.02, 0.012, 0.02], [0, 0.012, -0.02], light);

    // The door.
    const open = a.state === 'shut' ? 0 : a.state === 'kicked' ? 0.85 + random() * 0.3 : a.chain === 'on' ? 0.2 : 0.4 + random() * 0.25;
    const door = new THREE.Group();
    door.position.set(-dw / 2, 0, -0.035);
    door.rotation.y = -open;
    if (a.state === 'kicked') door.rotation.z = -0.035;
    s.root.add(door);
    const d = (m: THREE.Mesh) => { door.add(m); return m; };
    const skin = paint(256, 512, (g, w, h) => {
      g.fillStyle = hue; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${random() * 0.035})`; g.fillRect(random() * w, 0, 2 + random() * 10, h); }
      const chips = Math.round(mood.wear * 26) + (a.colour === 'red' ? 10 : 0);
      for (let i = 0; i < chips; i++) { g.fillStyle = random() > 0.5 ? '#9a9c98' : '#6f5a40'; const x = random() > 0.8 ? random() * w : (random() > 0.5 ? 0 : w) + (random() - 0.5) * 30, y = random() > 0.4 ? h - random() * random() * h : random() * h; g.beginPath(); for (let k = 0; k < 6; k++) g.lineTo(x + Math.cos(k) * (2 + random() * 5), y + Math.sin(k) * (2 + random() * 5)); g.fill(); }
      g.fillStyle = `rgba(30,25,20,${0.12 + mood.wear * 0.3})`;
      for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(random() * w, h - 10 - random() * 70, 10 + random() * 26, 4 + random() * 6, random(), 0, 7); g.fill(); }
      if (a.state === 'kicked') { g.fillStyle = 'rgba(20,15,10,0.55)'; g.beginPath(); g.ellipse(w * 0.66, h * 0.56, 20, 44, 0.15, 0, 7); g.fill(); g.beginPath(); g.ellipse(w * 0.66, h * 0.66, 16, 12, 0, 0, 7); g.fill(); }
    });
    const slab = new THREE.MeshStandardMaterial({ map: skin, roughness: 0.55 + mood.wear * 0.3 });
    d(s.box([dw - 0.012, dh - 0.025, 0.045], [dw / 2, dh / 2 + 0.012, 0], slab));
    for (const y of [0.25, 1.05, 1.8]) d(s.box([0.012, 0.1, 0.05], [0.004, y, 0.012], brass));
    const f = 0.024;
    // Number, peephole.
    d(s.label(number, 0.07 + number.length * 0.045, 0.1, [dw / 2, 1.8, f + 0.002], '#3a2c10', '#d2ac52'));
    d(s.cylinder(0.018, 0.018, 0.01, [dw / 2, 1.62, f], brass, 16)).rotation.x = Math.PI / 2;
    d(s.cylinder(0.008, 0.008, 0.012, [dw / 2, 1.62, f + 0.002], light, 10)).rotation.x = Math.PI / 2;
    // Framed fire-escape map and checkout notice.
    const notice = paint(256, 340, (g, w, h) => {
      g.fillStyle = '#f1ead6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8201c'; g.fillRect(0, 0, w, 40); g.fillStyle = '#fff'; g.font = 'bold 24px monospace'; g.textAlign = 'center'; g.fillText('FIRE EXIT PLAN', w / 2, 29);
      g.strokeStyle = '#2a2a2a'; g.lineWidth = 3; g.strokeRect(24, 62, 208, 60);
      for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(24 + i * 29.7, 62); g.lineTo(24 + i * 29.7, 104); g.stroke(); }
      const here = 1 + Math.floor(random() * 5);
      g.fillStyle = '#b8201c'; g.fillRect(26 + here * 29.7, 64, 27, 38);
      g.strokeStyle = '#1e8a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(38 + here * 29.7, 113); g.lineTo(222, 113); g.lineTo(222, 140); g.stroke(); g.fillStyle = '#1e8a3a'; g.beginPath(); g.moveTo(212, 138); g.lineTo(232, 138); g.lineTo(222, 154); g.fill();
      g.fillStyle = '#2a2a2a'; g.font = 'bold 15px monospace'; g.fillText('YOU ARE HERE', w / 2 - 20, 146);
      g.font = 'bold 26px monospace'; g.fillText('CHECKOUT 11 AM', w / 2, 204);
      g.font = '13px monospace'; for (let i = 0; i < 7; i++) g.fillText(['RATES SINGLE .... 29', 'DOUBLE .......... 36', 'NO PETS  NO COOKING', 'ICE AT OFFICE', 'MANAGEMENT NOT', 'RESPONSIBLE FOR', 'VALUABLES LEFT'][i], w / 2, 236 + i * 15);
      g.fillStyle = `rgba(150,120,60,${mood.wear * 0.35})`; g.fillRect(0, 0, w, h);
    });
    d(s.box([0.27, 0.35, 0.012], [dw / 2, 1.31, f + 0.004], dark));
    d(s.mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshStandardMaterial({ map: notice, roughness: 0.3 }), [dw / 2, 1.31, f + 0.0115]));
    // Deadbolt, knob, hanger.
    const lx = dw - 0.09;
    d(s.cylinder(0.035, 0.035, 0.012, [lx, 1.12, f + 0.004], brass, 20)).rotation.x = Math.PI / 2;
    const turn = d(s.box([0.05, 0.014, 0.022], [lx, 1.12, f + 0.02], brass)); turn.rotation.z = a.state === 'shut' ? 0 : Math.PI / 2;
    d(s.cylinder(0.04, 0.04, 0.008, [lx, 0.95, f + 0.003], brass, 20)).rotation.x = Math.PI / 2;
    d(s.cylinder(0.014, 0.014, 0.05, [lx, 0.95, f + 0.03], brass, 12)).rotation.x = Math.PI / 2;
    d(s.ball([0.034, 0.034, 0.026], [lx, 0.95, f + 0.065], brass, 16));
    let swing: THREE.Object3D | null = null;
    if (a.hanger !== 'none') {
      const dnd = a.hanger === 'dnd';
      const tex = paint(128, 320, (g, w, h) => {
        g.fillStyle = dnd ? '#c4261f' : '#2c8a4a'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#f4efe0'; g.fillRect(8, 110, w - 16, h - 120);
        g.fillStyle = dnd ? '#c4261f' : '#2c8a4a'; g.font = 'bold 30px monospace'; g.textAlign = 'center';
        (dnd ? ['DO', 'NOT', 'DIS-', 'TURB'] : ['PLEASE', 'MAKE', 'UP', 'ROOM']).forEach((t, i) => g.fillText(t, w / 2, 156 + i * 44, w - 22));
      });
      const shape = new THREE.Shape(); shape.moveTo(-0.05, -0.2); shape.lineTo(0.05, -0.2); shape.lineTo(0.05, 0.05); shape.lineTo(-0.05, 0.05); shape.closePath();
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.03, 0, Math.PI * 2, true); shape.holes.push(hole);
      const geo = new THREE.ShapeGeometry(shape, 16);
      const uv = geo.attributes.uv, pos = geo.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.05) / 0.1, (pos.getY(i) + 0.2) / 0.25);
      const hang = new THREE.Group(); hang.position.set(lx, 0.965, f + 0.045);
      const card = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide })); card.castShadow = true;
      card.position.y = -0.02; hang.add(card); hang.rotation.z = (random() - 0.5) * 0.25;
      door.add(hang); swing = hang;
    }
    // Chain: track on the door, anchor on the frame.
    const link = new THREE.TorusGeometry(0.011, 0.003, 6, 12);
    const chainMat = s.material('#cfd3d6', { metalness: 0.9, roughness: 0.3 });
    const links = (pts: THREE.Vector3[]) => {
      const m = new THREE.InstancedMesh(link, chainMat, pts.length);
      const q = new THREE.Quaternion(), mat = new THREE.Matrix4();
      pts.forEach((pt, i) => { const next = pts[Math.min(i + 1, pts.length - 1)], prev = pts[Math.max(i - 1, 0)]; const dir = next.clone().sub(prev).normalize(); q.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir); if (i % 2) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2)); mat.compose(pt, q, new THREE.Vector3(1.5, 1, 1)); m.setMatrixAt(i, mat); });
      m.castShadow = true; s.root.add(m);
    };
    const span = (from: THREE.Vector3, to: THREE.Vector3, sag: number) => { const n = Math.max(3, Math.round(from.distanceTo(to) / 0.024) + Math.round(sag * 30)); return Array.from({ length: n }, (_u, i) => { const t = i / (n - 1); const p = from.clone().lerp(to, t); p.y -= Math.sin(t * Math.PI) * sag; return p; }); };
    d(s.box([0.16, 0.03, 0.008], [dw - 0.12, 1.34, f + 0.003], brass));
    d(s.box([0.12, 0.008, 0.004], [dw - 0.12, 1.34, f + 0.008], dark));
    door.updateMatrixWorld(true);
    const track = door.localToWorld(new THREE.Vector3(dw - 0.07, 1.34, f + 0.012));
    const anchor = new THREE.Vector3(dw / 2 + 0.04, 1.34, 0.03);
    s.box([0.035, 0.06, 0.012], [anchor.x, anchor.y, 0.028], brass);
    if (a.chain === 'on' && a.state !== 'kicked') links(span(anchor, track, a.state === 'shut' ? 0.035 : 0.004));
    else if (a.chain === 'dangling') { links(span(anchor, anchor.clone().add(new THREE.Vector3(0.01, -0.2, 0.004)), 0)); s.cylinder(0.008, 0.008, 0.012, [anchor.x + 0.01, anchor.y - 0.21, 0.036], brass, 8).rotation.x = Math.PI / 2; }
    else {
      links(span(anchor, anchor.clone().add(new THREE.Vector3(0.006, -0.08, 0.004)), 0));
      links(span(track, track.clone().add(new THREE.Vector3(0, -0.06, 0.004)), 0));
      const fl = [0, 1, 2].map((i) => new THREE.Vector3(0.2 + i * 0.022 + random() * 0.1, 0.006, 0.3 + random() * 0.2));
      const m = new THREE.InstancedMesh(link, chainMat, fl.length); const mat = new THREE.Matrix4();
      fl.forEach((pt, i) => { mat.makeRotationX(Math.PI / 2).setPosition(pt); m.setMatrixAt(i, mat); }); s.root.add(m);
    }

    // Light spilling in: the floor the open doorway can see, bounded by the door itself.
    if (open > 0) {
      const far = 0.97, limit = dw / 2 + 0.28;
      const tan = Math.tan(open);
      const shape = new THREE.Shape();
      shape.moveTo(-dw / 2, 0);
      if ((far / tan) - dw / 2 < limit) { shape.lineTo(far / tan - dw / 2, far); shape.lineTo(limit, far); }
      else shape.lineTo(limit, (limit + dw / 2) * tan);
      shape.lineTo(dw / 2, 0);
      shape.closePath();
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(Math.PI / 2);
      const wedgeTint = outside.clone().lerp(new THREE.Color(carpet.color), 0.25);
      const wedge = s.mesh(geo, new THREE.MeshStandardMaterial({ color: wedgeTint, emissive: wedgeTint, emissiveIntensity: 0.7, roughness: 1, side: THREE.DoubleSide }), [0, 0.004, 0]);
      wedge.castShadow = false;
    }
    if (a.state === 'kicked') {
      const raw = s.material('#d9c08a', { roughness: 1, flatShading: true });
      for (let i = 0; i < 12; i++) { const len = 0.05 + random() * 0.2; const sp = s.box([0.012 + random() * 0.02, len, 0.01], [dw / 2 + 0.02 + random() * 0.04, 0.9 + random() * 0.45, 0.01 + random() * 0.03], raw); sp.rotation.set((random() - 0.5) * 0.8, 0, (random() - 0.5) * 0.9); }
      for (let i = 0; i < 9; i++) { const sp = s.box([0.01 + random() * 0.02, 0.006, 0.04 + random() * 0.14], [0.1 + random() * 0.5, 0.004, 0.1 + random() * 0.6], raw); sp.rotation.y = random() * 3; }
      const plate = s.box([0.03, 0.004, 0.07], [0.25 + random() * 0.2, 0.004, 0.45], brass); plate.rotation.y = random() * 3;
      s.box([0.05, 0.3, 0.02], [dw / 2 + 0.03, 1.05, 0.012], s.material('#3a2a1a'));
    }

    // Slid under the door.
    const sx = (random() - 0.5) * 0.4, sz = 0.06 + random() * 0.08;
    const lay = (m: THREE.Mesh, turn = (random() - 0.5) * 0.7) => { m.rotation.y = turn; return m; };
    if (a.slid === 'bill') { lay(s.box([0.23, 0.004, 0.11], [sx, 0.004, sz + 0.05], s.material('#f6f3ea'))); const flap = lay(s.box([0.1, 0.002, 0.004], [sx, 0.0065, sz + 0.05], s.material('#b8b4a8')), 0); void flap; }
    else if (a.slid === 'menus') ['#e83a2a', '#f2c81c', '#2c8a4a', '#f08a1c'].slice(0, 2 + Math.round(mood.density * 2)).forEach((c, i) => lay(s.box([0.1, 0.003, 0.22], [sx + (i - 1.5) * 0.07, 0.004 + i * 0.003, sz + 0.09 + random() * 0.04], s.material(c)), (i - 1.5) * 0.3));
    else if (a.slid === 'note') { const n = lay(s.box([0.12, 0.003, 0.09], [sx, 0.004, sz + 0.06], s.material('#f1ecdc'))); for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07 + random() * 0.03, 0.001, 0.006), s.material('#1c2a6b')); l.position.set(0, 0.002, -0.022 + i * 0.022); n.add(l); } }
    else if (a.slid === 'newspaper') { const paperTex = paint(128, 128, (g) => { g.fillStyle = '#e4e0d2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#222'; g.fillRect(8, 8, 112, 16); g.fillStyle = '#777'; g.fillRect(8, 32, 50, 40); for (let i = 0; i < 16; i++) g.fillRect(i < 8 ? 64 : 8, 34 + (i % 8) * 6 + (i < 8 ? 0 : 46), 54, 2); }); lay(s.mesh(new THREE.BoxGeometry(0.3, 0.025, 0.36), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 1 }), [sx, 0.014, sz + 0.02]), (random() - 0.5) * 0.3); }

    return s.finish({ update: (_dt, time) => { if (swing) swing.rotation.z = Math.sin(time * 1.7) * 0.12 * mood.energy + 0.04; } });
  },
});
