import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type P = [number, number, number];

function paint(w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default defineThing({
  questions: {
    circle: score('Which circle does the red needle point at?', [
      'The first circle: barely warm, a pleasant limbo',
      'The second or third: uncomfortable',
      'The fifth: wrath, the middle of the dial',
      'The seventh: violence, well into the red',
      'The ninth: treachery, the needle hard against the stop',
    ]),
    pipes: choice('What are the pipes doing?', {
      glowing: 'Glowing cherry red along their length, heat shimmering off them.',
      warm: 'Ordinary dull copper, warm to the touch.',
      cold: 'Stone cold and furred with white frost.',
      leaking: 'Hissing steam from a cracked joint.',
    }),
    notice: choice('What notice is on it?', {
      management: 'A typed sign: DO NOT ADJUST. MANAGEMENT.',
      comfort: 'A cheerful round sticker: COMFORT ZONE, with a smiley.',
      handwritten: 'A handwritten note taped on: IT IS FINE. STOP ASKING.',
      calibrated: 'A small engraved plate: CALIBRATED FOR YOUR SINS.',
      none: 'Nothing on it.',
    }),
    wrenched: noul('Has the dial been wrenched off the wall and left hanging by a wire?'),
    lock: noul('Is a chain and padlock wrapped around it so nobody can turn it?'),
    mount: choice('What is it mounted on?', {
      tile: 'A section of beige municipal wall tile.',
      wood: 'Dark wood-veneer office panelling.',
      concrete: 'A square concrete pillar.',
      bare: 'No wall at all: a steel plate on a stand with the pipes running straight to the floor.',
    }),
    below: choice('What do the pipes run down to?', {
      grate: 'A floor grate with orange light coming up through the slats.',
      radiator: 'A cast-iron column radiator, ticking.',
      furnace: 'A small iron furnace door with a round glowing window.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const heat = a.circle;
    const brass = s.material('#c9a24a', { metalness: 0.85, roughness: 0.3 });
    const dark = s.material('#1d1c1a', { roughness: 0.6 });
    const steel = s.material('#aeb4b8', { metalness: 0.75, roughness: 0.35 });
    const copperTint = new THREE.Color('#b0603a');
    const pipeMat = a.pipes === 'glowing'
      ? s.material('#c04a2a', { emissive: '#ff4a12', emissiveIntensity: mix(0.6, 1.6, heat), roughness: 0.4 })
      : a.pipes === 'cold' ? s.material('#cfd6d8', { roughness: 0.9 })
      : s.material(copperTint, { metalness: 0.7, roughness: 0.4 });
    const glowTint = new THREE.Color('#ff7a1a').lerp(new THREE.Color('#ffb060'), mood.warmth * 0.3);
    const glowStrength = a.pipes === 'cold' ? 0.25 : mix(0.8, 2.4, heat);

    // ---- Mount ----
    const dialY = 1.45;
    let frontZ = 0.05;
    if (a.mount === 'tile') {
      const tiles = paint(256, 640, (c, w, h) => {
        c.fillStyle = '#d6ccb0'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 44) for (let x = 0; x < w; x += 44) { c.fillStyle = `hsl(42, ${26 + random() * 10}%, ${77 + random() * 6 - mood.wear * 8}%)`; c.fillRect(x + 2, y + 2, 40, 40); }
        for (let k = 0; k < mood.wear * 14; k++) { c.fillStyle = 'rgba(60,40,20,0.22)'; c.fillRect(random() * w, h * 0.55 + random() * h * 0.45, 6 + random() * 30, 3 + random() * 12); }
        // Scorch above the pipes when the place is hot.
        const g = c.createRadialGradient(w / 2, h * 0.75, 10, w / 2, h * 0.75, 110);
        g.addColorStop(0, `rgba(40,20,10,${heat * 0.55})`); g.addColorStop(1, 'rgba(40,20,10,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      });
      const plain = s.material('#cfc5aa');
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.1), [plain, plain, plain, plain, new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.6 }), plain]);
      slab.position.set(0, 1.0, 0); slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
      s.box([0.84, 0.12, 0.13], [0, 0.06, 0], dark);
    } else if (a.mount === 'wood') {
      const veneer = paint(128, 512, (c, w, h) => {
        c.fillStyle = '#4e3220'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(${random() < 0.5 ? '20,10,5' : '120,80,50'},0.35)`; c.lineWidth = 1 + random() * 3; c.beginPath(); const x = random() * w; c.moveTo(x, 0); c.bezierCurveTo(x + 8, h / 3, x - 8, (2 * h) / 3, x + 4, h); c.stroke(); }
      });
      veneer.wrapS = veneer.wrapT = THREE.RepeatWrapping; veneer.repeat.set(2, 1);
      const wood = new THREE.MeshStandardMaterial({ map: veneer, roughness: 0.5 });
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.1), wood);
      slab.position.set(0, 1.0, 0); slab.castShadow = slab.receiveShadow = true; s.root.add(slab);
      for (let i = 1; i < 4; i++) s.box([0.012, 2.0, 0.012], [-0.4 + i * 0.2, 1.0, 0.05], s.material('#2d1a0e'));
      s.box([0.84, 0.1, 0.13], [0, 0.05, 0], s.material('#2d1a0e'));
    } else if (a.mount === 'concrete') {
      s.box([0.5, 2.2, 0.5], [0, 1.1, -0.2], s.material('#a5a29a', { roughness: 0.95 }));
      s.box([0.52, 0.4, 0.52], [0, 0.2, -0.2], s.material(new THREE.Color('#8a8578').lerp(new THREE.Color('#4a3a30'), heat * 0.6), { roughness: 1 }));
    } else {
      s.box([0.34, 0.34, 0.03], [0, dialY, 0], steel);
      for (const x of [-0.14, 0.14]) for (const y of [-0.14, 0.14]) s.cylinder(0.01, 0.01, 0.006, [x, dialY + y, 0.017], dark, 8).rotation.x = Math.PI / 2;
      frontZ = 0.015;
    }

    // ---- The dial ----
    const dial = new THREE.Group();
    const faceMap = paint(512, 512, (c, w, h) => {
      const cx = w / 2, cy = h / 2;
      c.fillStyle = '#efe4c6'; c.beginPath(); c.arc(cx, cy, w / 2, 0, 7); c.fill();
      // Nine concentric circles, drawn finer toward the centre, the inner ones reddening.
      for (let i = 1; i <= 9; i++) {
        const r = 215 - i * 19;
        c.strokeStyle = `rgba(${90 + i * 16},${40 - i * 3},${30},${0.45 + i * 0.05})`; c.lineWidth = 1.5 + i * 0.3;
        c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
      }
      // Nine marks around the rim, I to IX, from lower left round to lower right.
      c.fillStyle = '#2a1e18'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 9; i++) {
        const angle = -Math.PI * 0.75 + (i / 8) * Math.PI * 1.5 - Math.PI / 2;
        const ax = cx + Math.cos(angle) * 190, ay = cy + Math.sin(angle) * 190;
        c.strokeStyle = i > 5 ? '#b0231c' : '#2a1e18'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(cx + Math.cos(angle) * 228, cy + Math.sin(angle) * 228); c.lineTo(cx + Math.cos(angle) * 205, cy + Math.sin(angle) * 205); c.stroke();
        c.font = `bold ${i > 5 ? 34 : 30}px serif`; c.fillStyle = i > 5 ? '#b0231c' : '#2a1e18';
        c.fillText(ROMAN[i], ax, ay);
        for (let k = 1; k < 4 && i < 8; k++) { const sub = angle + (k / 4) * ((Math.PI * 1.5) / 8); c.strokeStyle = '#5a4a40'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx + Math.cos(sub) * 228, cy + Math.sin(sub) * 228); c.lineTo(cx + Math.cos(sub) * 214, cy + Math.sin(sub) * 214); c.stroke(); }
      }
      c.font = 'bold 22px serif'; c.fillStyle = '#2a1e18'; c.fillText('CIRCLES', cx, cy + 92);
      c.font = '16px serif'; c.fillText('not degrees', cx, cy + 114);
      c.font = 'bold 18px serif'; c.fillText('INFERNO & SONS', cx, cy - 86);
      if (mood.wear > 0.5) { c.fillStyle = `rgba(120,80,30,${(mood.wear - 0.5) * 0.5})`; c.beginPath(); c.arc(cx + 70, cy + 120, 60, 0, 7); c.fill(); }
    });
    const bezel = s.lathe([[0.15, 0], [0.19, 0], [0.2, 0.03], [0.185, 0.05], [0.155, 0.05], [0.15, 0.015]], brass);
    bezel.rotation.x = Math.PI / 2; bezel.position.z = 0.05;
    dial.add(bezel);
    const back = s.cylinder(0.185, 0.185, 0.05, [0, 0, 0.025], brass, 40);
    back.rotation.x = Math.PI / 2;
    dial.add(back);
    const face = s.mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshStandardMaterial({ map: faceMap, roughness: 0.6 }), [0, 0, 0.051]);
    dial.add(face);
    // The needle, from I round to IX.
    const needleAngle = Math.PI * 0.75 - heat * Math.PI * 1.5;
    const needle = new THREE.Group();
    needle.rotation.z = needleAngle;
    needle.position.z = 0.058;
    const blade = s.mesh(new THREE.BoxGeometry(0.014, 0.14, 0.004), s.material('#d81e1e', { roughness: 0.4 }), [0, 0.065, 0]);
    blade.scale.set(1, 1, 1);
    const tip = s.mesh(new THREE.ConeGeometry(0.009, 0.03, 4), s.material('#d81e1e', { roughness: 0.4 }), [0, 0.148, 0]);
    const tail = s.mesh(new THREE.BoxGeometry(0.02, 0.04, 0.004), s.material('#d81e1e', { roughness: 0.4 }), [0, -0.02, 0]);
    needle.add(blade, tip, tail);
    dial.add(needle);
    const hub = s.cylinder(0.016, 0.016, 0.02, [0, 0, 0.06], brass, 16);
    hub.rotation.x = Math.PI / 2;
    dial.add(hub);
    const glass = s.mesh(new THREE.CircleGeometry(0.15, 48), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false }), [0, 0, 0.075]);
    glass.castShadow = false;
    dial.add(glass);
    // A tiny turn knob at the bottom, which nobody is allowed to use.
    const knob = s.cylinder(0.02, 0.025, 0.04, [0, -0.2, 0.03], dark, 12);
    dial.add(knob);

    if (a.lock) {
      const chain = s.material('#777b80', { metalness: 0.8, roughness: 0.4 });
      for (let i = 0; i < 26; i++) {
        const t = (i / 26) * Math.PI * 2;
        const link = s.ring(0.014, 0.004, [Math.cos(t) * 0.2, Math.sin(t) * 0.2, 0.03 + (i % 2) * 0.012], chain);
        link.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, t);
        dial.add(link);
      }
      const lock = s.box([0.06, 0.05, 0.025], [0.12, -0.19, 0.06], brass);
      lock.rotation.z = 0.25;
      dial.add(lock);
      const shackle = s.ring(0.022, 0.005, [0.1, -0.16, 0.06], chain, Math.PI);
      shackle.rotation.z = 0.25;
      dial.add(shackle);
      dial.add(s.cylinder(0.006, 0.006, 0.004, [0.12, -0.19, 0.073], dark, 8));
    }

    if (a.wrenched) {
      // Torn off: the dial hangs upside down from one wire below its bracket, screw holes left behind.
      dial.position.set(0.05, dialY - 0.42, frontZ + 0.1);
      dial.rotation.set(0.25, 0.3, Math.PI * 0.85);
      s.rod([0, dialY, frontZ + 0.01], [0.04, dialY - 0.26, frontZ + 0.12], 0.004, s.material('#c33a2a'));
      s.rod([0.02, dialY - 0.02, frontZ + 0.01], [0.06, dialY - 0.26, frontZ + 0.1], 0.004, s.material('#2b4bb5'));
      s.cylinder(0.06, 0.06, 0.012, [0, dialY, frontZ + 0.006], dark, 24).rotation.x = Math.PI / 2;
      for (const t of [0.5, 2.1, 3.7, 5.3]) s.cylinder(0.008, 0.008, 0.006, [Math.cos(t) * 0.17, dialY + Math.sin(t) * 0.17, frontZ + 0.003], dark, 8).rotation.x = Math.PI / 2;
    } else {
      dial.position.set(0, dialY, frontZ);
    }
    s.root.add(dial);

    // ---- Notice ----
    if (a.notice !== 'none') {
      const z = frontZ + 0.012;
      if (a.notice === 'comfort') {
        const sticker = paint(256, 256, (c, w, h) => {
          c.fillStyle = '#ffd43a'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
          c.fillStyle = '#2a2a2a'; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = 'bold 36px sans-serif'; c.fillText('COMFORT', w / 2, 60); c.fillText('ZONE', w / 2, 210);
          c.strokeStyle = '#2a2a2a'; c.lineWidth = 7; c.beginPath(); c.arc(w / 2, h / 2 + 4, 44, 0, 7); c.stroke();
          c.beginPath(); c.arc(w / 2, h / 2 + 8, 28, 0.2, Math.PI - 0.2); c.stroke();
          c.fillStyle = '#2a2a2a'; for (const dx of [-16, 16]) { c.beginPath(); c.arc(w / 2 + dx, h / 2 - 8, 5, 0, 7); c.fill(); }
        });
        const disc = s.mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshStandardMaterial({ map: sticker, transparent: true, roughness: 0.6 }), [0.21, dialY + 0.18, z]);
        disc.rotation.z = (random() - 0.5) * 0.6;
        disc.castShadow = false;
      } else if (a.notice === 'management') {
        const sign = s.label('DO NOT ADJUST', 0.3, 0.07, [0, dialY + 0.31, z], '#1f1f24', '#f3eee0');
        s.label('MANAGEMENT', 0.3, 0.055, [0, dialY + 0.25, z], '#1f1f24', '#f3eee0');
        void sign;
      } else if (a.notice === 'handwritten') {
        const note = s.label('IT IS FINE. STOP ASKING.', 0.3, 0.1, [0.02, dialY + 0.3, z], '#1a3a8c', '#fff6b5');
        note.rotation.z = (random() - 0.5) * 0.3;
        for (const x of [-0.1, 0.1]) s.box([0.04, 0.02, 0.002], [0.02 + x, dialY + 0.345 - x * 0.1, z + 0.002], s.material('#d8d0b8', { transparent: true, opacity: 0.75 }));
      } else {
        s.label('CALIBRATED FOR YOUR SINS', 0.3, 0.05, [0, dialY - 0.3, z], '#3b2d12', '#c9a24a');
      }
    }

    // ---- Pipes ----
    const pipeX = [-0.07, 0.07];
    const pipeZ = frontZ + 0.06;
    const pipeTop = a.wrenched ? dialY - 0.3 : dialY - 0.2;
    const bottomY = { grate: 0.08, radiator: 0.62, furnace: 0.75 }[a.below];
    for (const x of pipeX) {
      s.cylinder(0.018, 0.018, pipeTop - bottomY, [x, (pipeTop + bottomY) / 2, pipeZ], pipeMat, 14);
      s.cylinder(0.024, 0.024, 0.04, [x, pipeTop - 0.03, pipeZ], a.pipes === 'cold' ? pipeMat : brass, 14);
      s.cylinder(0.024, 0.024, 0.04, [x, bottomY + 0.05, pipeZ], a.pipes === 'cold' ? pipeMat : brass, 14);
      // Wall clips.
      for (let y = bottomY + 0.3; y < pipeTop - 0.1; y += 0.35) { s.box([0.05, 0.02, 0.07], [x, y, pipeZ - 0.025], steel); }
    }
    if (a.pipes === 'cold') {
      const rime = new THREE.MeshStandardMaterial({ color: '#f4f8fa', roughness: 1 });
      const bumps: { at: P; size: number }[] = [];
      for (let i = 0; i < 60; i++) { const x = pipeX[i % 2]; const t = random() * Math.PI * 2; bumps.push({ at: [x + Math.cos(t) * 0.02, mix(bottomY + 0.1, pipeTop - 0.05, random()), pipeZ + Math.sin(t) * 0.02], size: 0.008 + random() * 0.012 }); }
      s.scatter(new THREE.SphereGeometry(1, 6, 5), rime, bumps);
    }
    const steamMat = new THREE.MeshStandardMaterial({ color: '#f0f0f0', transparent: true, opacity: 0.35, depthWrite: false });
    const steam: THREE.Mesh[] = [];
    if (a.pipes === 'leaking') {
      const y = mix(bottomY + 0.2, pipeTop - 0.2, random());
      const x = pipeX[Math.floor(random() * 2)];
      s.cylinder(0.026, 0.026, 0.03, [x, y, pipeZ], brass, 14);
      for (let i = 0; i < 6; i++) { const puff = s.ball([0.03 + i * 0.012, 0.03 + i * 0.012, 0.03 + i * 0.012], [x + 0.05 + i * 0.03, y + i * 0.05, pipeZ + 0.02], steamMat, 8); puff.castShadow = false; steam.push(puff); }
      s.box([0.03, 0.012, 0.002], [x + 0.02, y + 0.012, pipeZ + 0.03], s.material('#2a2a2a')).rotation.z = 0.4; // tape
    }
    const shimmer: THREE.Mesh[] = [];
    if (a.pipes === 'glowing') {
      const haze = new THREE.MeshBasicMaterial({ color: '#ff6a20', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
      for (const x of pipeX) { const h = s.cylinder(0.045, 0.045, pipeTop - bottomY, [x, (pipeTop + bottomY) / 2, pipeZ], haze, 12); h.castShadow = false; shimmer.push(h); }
    }

    // ---- Below ----
    const glowMat = new THREE.MeshStandardMaterial({ color: glowTint, emissive: glowTint, emissiveIntensity: glowStrength, roughness: 1 });
    const hazeMat = new THREE.MeshBasicMaterial({ color: glowTint, transparent: true, opacity: a.pipes === 'cold' ? 0.04 : mix(0.08, 0.22, heat), depthWrite: false, blending: THREE.AdditiveBlending });
    let pulse: THREE.MeshStandardMaterial | null = glowMat;
    if (a.below === 'grate') {
      const gz = pipeZ + 0.12;
      s.box([0.56, 0.02, 0.34], [0, 0.0, gz], s.material('#3a3a3c', { metalness: 0.5, roughness: 0.6 }));
      s.box([0.5, 0.06, 0.28], [0, -0.03, gz], glowMat);
      const slat = s.material('#2a2a2c', { metalness: 0.6, roughness: 0.5 });
      for (let i = 0; i < 9; i++) s.box([0.5, 0.025, 0.012], [0, 0.015, gz - 0.13 + i * 0.0325], slat);
      for (const x of [-0.25, 0.25]) s.box([0.012, 0.025, 0.3], [x, 0.015, gz], slat);
      const h = s.ball([0.34, 0.16, 0.24], [0, 0.03, gz], hazeMat, 12); h.castShadow = false;
      const flue = s.box([0.2, 0.02, 0.06], [0, bottomY, pipeZ], steel); void flue;
      for (const x of pipeX) s.cylinder(0.018, 0.018, 0.1, [x, bottomY, pipeZ + 0.05], pipeMat, 10).rotation.x = Math.PI / 2;
    } else if (a.below === 'radiator') {
      const iron = s.material(a.pipes === 'cold' ? '#9aa0a4' : new THREE.Color('#6c6a66').lerp(new THREE.Color('#9a4a30'), heat * 0.7), { metalness: 0.4, roughness: 0.6, emissive: '#ff3a00', emissiveIntensity: a.pipes === 'cold' ? 0 : heat * 0.35 });
      const rz = pipeZ + 0.06;
      for (let i = 0; i < 7; i++) {
        const x = -0.24 + i * 0.08;
        s.box([0.05, 0.56, 0.12], [x, 0.33, rz], iron);
        s.box([0.03, 0.56, 0.16], [x, 0.33, rz], iron);
      }
      s.box([0.56, 0.05, 0.14], [0, 0.6, rz], iron);
      s.box([0.56, 0.05, 0.14], [0, 0.08, rz], iron);
      for (const x of [-0.2, 0.2]) s.box([0.06, 0.06, 0.1], [x, 0.03, rz], dark);
      s.cylinder(0.02, 0.02, 0.04, [-0.3, 0.1, rz], brass, 10).rotation.z = Math.PI / 2; // bleed valve
      pulse = iron as THREE.MeshStandardMaterial;
      const h = s.ball([0.4, 0.3, 0.2], [0, 0.35, rz], hazeMat, 12); h.castShadow = false;
    } else {
      const fz = pipeZ + 0.1;
      const iron = s.material('#2f2d2b', { metalness: 0.5, roughness: 0.6 });
      s.box([0.6, 0.72, 0.36], [0, 0.36, fz - 0.1], iron);
      s.box([0.64, 0.06, 0.4], [0, 0.03, fz - 0.1], dark);
      const door = s.cylinder(0.2, 0.2, 0.04, [0, 0.4, fz + 0.09], iron, 32); door.rotation.x = Math.PI / 2;
      const ringMesh = s.ring(0.2, 0.015, [0, 0.4, fz + 0.11], brass); void ringMesh;
      for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; s.cylinder(0.012, 0.012, 0.01, [Math.cos(t) * 0.17, 0.4 + Math.sin(t) * 0.17, fz + 0.115], brass, 8).rotation.x = Math.PI / 2; }
      const window = s.mesh(new THREE.CircleGeometry(0.085, 32), glowMat, [0, 0.42, fz + 0.112]); window.castShadow = false;
      s.box([0.03, 0.14, 0.03], [0.24, 0.4, fz + 0.12], brass).rotation.z = 0.1; // handle
      const h = s.ball([0.14, 0.14, 0.14], [0, 0.42, fz + 0.14], hazeMat, 12); h.castShadow = false;
      for (const x of pipeX) s.cylinder(0.018, 0.018, 0.14, [x, bottomY, pipeZ + 0.06], pipeMat, 10).rotation.x = Math.PI / 2;
    }

    const rate = mix(0.5, 2.5, mood.energy);
    const phase = random() * 10;
    return s.finish({
      footprint: 0.45,
      update: (dt, time) => {
        const t = time * rate + phase;
        if (pulse) pulse.emissiveIntensity = glowStrength * (0.85 + 0.15 * Math.sin(t * 3.1) * Math.sin(t * 1.7)) * (a.below === 'radiator' ? heat * 0.4 : 1);
        needle.rotation.z = needleAngle + Math.sin(t * 4.2) * 0.02 * heat;
        for (const [i, puff] of steam.entries()) { puff.position.y += dt * 0.08 * rate; if (puff.position.y > 1.9) puff.position.y -= 0.6; puff.material = steamMat; void i; }
        for (const h of shimmer) h.scale.x = h.scale.z = 1 + Math.sin(t * 6 + h.position.x * 20) * 0.15;
      },
    });
  },
});
