import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const THEMES = {
  circus: 'Red and yellow circus sunbursts.',
  muscle: 'Blue and white with a flexing strongman.',
  rocket: 'Space-race silver and orange, the puck is a rocket to the moon.',
  devil: 'Black and flame red, the top level is hellfire.',
  candy: 'Pink and mint candy stripes.',
} as const;
const THEME_COLOURS: Record<keyof typeof THEMES, [string, string, string]> = {
  circus: ['#c9302c', '#f2c53d', '#fff6dc'], muscle: ['#2452b8', '#f3efe6', '#e23b3b'], rocket: ['#aeb6bc', '#f07a1c', '#1b2a4e'], devil: ['#232124', '#e2452a', '#f2c53d'], candy: ['#ee7fae', '#8fd9c2', '#fff6ee'],
};
const LADDERS = {
  insults: ['WEAKLING', 'NOODLE ARMS', 'TRY AGAIN', 'NOT BAD', 'TOUGH GUY', 'MUSCLE MAN', 'HERCULES'],
  farm: ['CHICK', 'PIGLET', 'FARM HAND', 'MULE', 'BULL', 'TRACTOR', 'TORNADO'],
  love: ['COLD FISH', 'SHY', 'FLIRT', 'SWEETHEART', 'HOT STUFF', 'HEARTBREAKER', 'TRUE LOVE'],
  numbers: ['100', '200', '300', '400', '500', '750', '1000'],
} as const;

function scaleTexture(theme: keyof typeof THEMES, ladder: readonly string[], fade: number) {
  const [c1, c2, c3] = THEME_COLOURS[theme];
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const n = ladder.length;
  for (let i = 0; i < n; i++) {
    const y0 = 1024 - (i + 1) * 1024 / n, hgt = 1024 / n;
    const bg = theme === 'devil' && i === n - 1 ? c3 : i % 2 ? c1 : c2;
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, 128, hgt);
    ctx.fillStyle = new THREE.Color(bg).getHSL({ h: 0, s: 0, l: 0 }).l > 0.55 ? '#2a1d1a' : '#fff6dc';
    ctx.save();
    ctx.translate(64, y0 + hgt / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const words = ladder[i].split(' ');
    words.forEach((word, k) => {
      ctx.font = `bold ${Math.min(40, 190 / word.length)}px sans-serif`;
      ctx.fillText(word, 0, (k - (words.length - 1) / 2) * 40, 112);
    });
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, y0 + hgt - 3, 128, 3);
  }
  if (fade > 0) { ctx.fillStyle = `rgba(190,180,160,${fade * 0.45})`; ctx.fillRect(0, 0, 128, 1024); }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    theme: choice('How is the tower painted?', THEMES),
    ladder: choice('What do the levels on the scale say?', {
      insults: 'From WEAKLING up to HERCULES.',
      farm: 'County-fair animals, from CHICK up to TORNADO.',
      love: 'A love tester, from COLD FISH to TRUE LOVE.',
      numbers: 'Plain numbers up to 1000.',
    }),
    moment: choice('What is happening right now?', {
      ringing: 'The puck has just slammed the bell: every light blazing.',
      rising: 'The puck is on its way up, not going to make it.',
      waiting: 'Idle: puck at the bottom, lights chasing slowly, mallet leaning on the base.',
      dead: 'Unplugged: lights dark, mallet dropped in the grass, an OUT OF ORDER card.',
    }),
    height: score('How tall is the tower?', ['A kiddie version, head high', 'Twice a person', 'Towering over the midway']),
    topper: choice('What crowns the tower above the bell?', {
      star: 'A lit five-pointed star.',
      sunburst: 'A fan of painted rays.',
      flag: 'A small flag on a pole.',
      ball: 'A plain gold ball.',
    }),
    mallet: choice('What is the mallet like?', {
      wooden: 'A big wooden maul with a rubber face.',
      cartoon: 'An oversized red cartoon hammer.',
      sledge: 'A real steel sledgehammer.',
    }),
    prizes: noul('Is there a rack of cheap prizes hung on the side?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2, c3] = THEME_COLOURS[a.theme];
    const T = mix(2.5, 4.8, a.height), base = 0.5, towerW = 0.62;
    const ladder = LADDERS[a.ladder];
    const main = s.material(c1), trim = s.material(c2), dark = s.material('#242326');
    const steel = s.material('#b6bcc0', { metalness: 0.75, roughness: 0.3 });
    const brass = s.material('#d3a53c', { metalness: 0.85, roughness: 0.25 });
    const live = a.moment !== 'dead';

    // Base cabinet with the strike pad on a lever out front.
    s.box([1.5, 0.12, 1.3], [0, 0.06, 0.25], dark);
    s.box([1.1, base, 0.7], [0, base / 2 + 0.06, 0], main);
    s.box([1.14, 0.06, 0.74], [0, base + 0.07, 0], trim);
    const front = s.label('TEST YOUR STRENGTH', 1.0, 0.3, [0, base / 2 + 0.08, 0.352], c3, c1 === '#232124' ? '#e2452a' : c1 === '#aeb6bc' ? '#f07a1c' : c2 === '#f3efe6' ? '#e23b3b' : '#3a1d16');
    front.rotation.z = (random() - 0.5) * 0.02;
    const down = a.moment === 'rising' || a.moment === 'ringing';
    const lever = s.box([0.16, 0.05, 0.95], [0, 0.2, 0.62], steel);
    lever.rotation.x = down ? 0.12 : -0.1;
    s.box([0.3, 0.14, 0.12], [0, 0.13, 0.52], dark);
    s.cylinder(0.19, 0.19, 0.09, [0, down ? 0.2 : 0.32, 1.0], s.material('#1f1f22', { roughness: 0.95 }), 18);
    s.cylinder(0.14, 0.14, 0.095, [0, down ? 0.2 : 0.32, 1.0], s.material('#c9302c', { roughness: 0.8 }), 18);

    // Tower: a backboard carrying the painted scale, a guide wire and side rails.
    const y0 = base + 0.1;
    s.box([towerW + 0.24, T, 0.08], [0, y0 + T / 2, -0.12], main);
    const scale = s.mesh(new THREE.PlaneGeometry(towerW, T - 0.1), new THREE.MeshStandardMaterial({ map: scaleTexture(a.theme, ladder, mood.wear), roughness: 0.75 }), [0, y0 + T / 2, -0.075]);
    for (const x of [-1, 1]) s.box([0.06, T, 0.14], [x * (towerW / 2 + 0.09), y0 + T / 2, -0.09], trim);
    s.rod([0, y0, 0], [0, y0 + T - 0.05, 0], 0.012, steel);
    // Rear brace so it reads as a freestanding rig.
    for (const x of [-1, 1]) s.rod([x * 0.5, 0.1, -0.85], [x * 0.2, y0 + T * 0.62, -0.17], 0.025, steel);
    s.box([1.2, 0.08, 0.1], [0, 0.07, -0.85], dark);

    // Puck.
    const level = a.moment === 'ringing' ? 1 : a.moment === 'rising' ? mix(0.3, 0.8, random()) : 0;
    const puckY0 = y0 + 0.08, puckY1 = y0 + T - 0.3;
    const puck = new THREE.Group();
    if (a.theme === 'rocket') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 12), s.material('#f3efe6')); body.position.y = 0.1;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.12, 12), s.material('#e23b3b')); nose.position.y = 0.26;
      puck.add(body, nose);
      for (let i = 0; i < 3; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.09, 0.08), s.material('#e23b3b')); fin.position.set(Math.sin(i * 2.1) * 0.07, 0.04, Math.cos(i * 2.1) * 0.07); fin.rotation.y = i * 2.1; puck.add(fin); }
    } else {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 14), steel); body.position.y = 0.06;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.04, 14), s.material('#e23b3b')); cap.position.y = 0.14;
      puck.add(body, cap);
    }
    puck.traverse((o) => { o.castShadow = true; });
    puck.position.set(0, mix(puckY0, puckY1, level), 0);
    s.root.add(puck);

    // Bell and its bracket.
    const bellY = y0 + T;
    s.box([towerW + 0.3, 0.1, 0.24], [0, bellY + 0.02, -0.06], trim);
    const bell = s.lathe([[0, 0.2], [0.05, 0.2], [0.11, 0.17], [0.17, 0.09], [0.2, 0.02], [0.215, 0], [0.2, 0], [0.16, 0.07], [0.1, 0.14], [0, 0.16]], brass, [0, bellY - 0.26, 0.02]);
    s.cylinder(0.02, 0.02, 0.08, [0, bellY - 0.03, 0.02], steel, 8);
    if (a.moment === 'ringing') { bell.rotation.z = 0.18; bell.position.x = 0.03; }

    // Topper.
    const topY = bellY + 0.07;
    const lampMat = new THREE.MeshStandardMaterial({ color: live ? '#fff2c2' : '#8d897c', emissive: new THREE.Color().setHSL(mix(0.15, 0.08, mood.warmth), 1, 0.6), emissiveIntensity: live ? 1.2 : 0 });
    if (a.topper === 'star') {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.14 : 0.34, t = i / 10 * Math.PI * 2 + Math.PI / 2; if (i) star.lineTo(Math.cos(t) * r, Math.sin(t) * r); else star.moveTo(Math.cos(t) * r, Math.sin(t) * r); }
      const g = new THREE.ExtrudeGeometry(star, { depth: 0.06, bevelEnabled: false });
      s.mesh(g, new THREE.MeshStandardMaterial({ color: c2 === '#f3efe6' ? '#f2c53d' : c2, emissive: '#ffb400', emissiveIntensity: live ? 0.7 : 0, roughness: 0.4 }), [0, topY + 0.32, -0.1]);
    } else if (a.topper === 'sunburst') {
      for (let i = 0; i < 9; i++) {
        const t = Math.PI * (i / 8), len = i % 2 ? 0.34 : 0.5;
        const ray = s.box([0.07, len, 0.03], [Math.cos(t) * len * 0.5, topY + Math.sin(t) * len * 0.5, -0.1], i % 2 ? trim : main);
        ray.rotation.z = t - Math.PI / 2;
      }
      s.cylinder(0.14, 0.14, 0.05, [0, topY, -0.1], brass, 16).rotation.x = Math.PI / 2;
    } else if (a.topper === 'flag') {
      s.rod([0, topY, -0.1], [0, topY + 0.75, -0.1], 0.012, steel);
      const flag = new THREE.Shape(); flag.moveTo(0, 0); flag.lineTo(0.42, -0.1); flag.lineTo(0, -0.22);
      s.mesh(new THREE.ShapeGeometry(flag), new THREE.MeshStandardMaterial({ color: c2, side: THREE.DoubleSide }), [0, topY + 0.74, -0.1]).rotation.y = random() - 0.5;
    } else s.ball([0.12, 0.12, 0.12], [0, topY + 0.1, -0.08], brass);

    // Chasing lights up both rails: one material per level so they can light in turn.
    const n = ladder.length;
    const lamps: THREE.MeshStandardMaterial[] = [];
    const bulbGeo = new THREE.SphereGeometry(0.04, 8, 6);
    for (let i = 0; i < n; i++) {
      const m = lampMat.clone();
      lamps.push(m);
      for (let k = 0; k < 2; k++) {
        const y = y0 + (i + (k + 0.5) / 2) * T / n;
        for (const x of [-1, 1]) if (random() > mood.wear * 0.35) s.mesh(bulbGeo, m, [x * (towerW / 2 + 0.09), y, -0.01]).castShadow = false;
      }
    }
    const reached = Math.floor(level * n);
    const setLamps = (time: number) => {
      lamps.forEach((m, i) => {
        if (!live) m.emissiveIntensity = 0;
        else if (a.moment === 'ringing') m.emissiveIntensity = Math.floor(time * mix(3, 10, mood.energy)) % 2 ? 1.8 : 0.9;
        else if (a.moment === 'rising') m.emissiveIntensity = i <= reached ? 1.6 : 0.1;
        else m.emissiveIntensity = Math.floor(time * mix(1, 5, mood.energy)) % n === i ? 1.6 : 0.2;
      });
    };
    setLamps(0);

    // Mallet.
    const mallet = new THREE.Group();
    const handleLen = a.mallet === 'cartoon' ? 0.8 : 0.95;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, handleLen, 8), s.material(a.mallet === 'cartoon' ? '#f2c53d' : '#b08d57')); handle.position.y = handleLen / 2;
    mallet.add(handle);
    if (a.mallet === 'wooden') {
      const headM = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 14), s.material('#8c6b48')); headM.rotation.z = Math.PI / 2; headM.position.y = handleLen;
      for (const x of [-1, 1]) { const face = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 14), s.material('#1f1f22')); face.rotation.z = Math.PI / 2; face.position.set(x * 0.15, handleLen, 0); mallet.add(face); }
      mallet.add(headM);
    } else if (a.mallet === 'cartoon') {
      const headM = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.42, 16), s.material('#e23b3b', { roughness: 0.4 })); headM.rotation.z = Math.PI / 2; headM.position.y = handleLen;
      for (const x of [-1, 1]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 16), s.material('#f2c53d')); band.rotation.z = Math.PI / 2; band.position.set(x * 0.15, handleLen, 0); mallet.add(band); }
      mallet.add(headM);
    } else {
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.1), steel); headM.position.y = handleLen;
      mallet.add(headM);
    }
    mallet.traverse((o) => { o.castShadow = true; });
    if (a.moment === 'dead') { mallet.position.set(0.7 + random() * 0.3, 0.1, 0.9 + random() * 0.4); mallet.rotation.set(Math.PI / 2 - 0.08, 0, random() * 3); }
    else if (a.moment === 'waiting') { mallet.position.set(0.72, 0.02, 0.42); mallet.rotation.set(-0.12, random(), 0.22); mallet.rotation.z = 0.2; }
    else { mallet.position.set(0.02, 0.33, 1.0); mallet.rotation.set(Math.PI + 0.9, 0, (random() - 0.5) * 0.3); mallet.position.y = 0.33 + Math.cos(0.9) * handleLen; mallet.position.z = 1.0 + Math.sin(0.9) * handleLen; }
    s.root.add(mallet);

    if (a.moment === 'dead') s.label('OUT OF ORDER', 0.7, 0.24, [0.04, y0 + 0.9, -0.06], '#c9302c', '#fbf6e4').rotation.z = (random() - 0.5) * 0.3;
    if (a.moment === 'ringing') {
      // Clang lines radiating from the bell.
      const ringMat = new THREE.MeshStandardMaterial({ color: '#ffe27a', emissive: '#ffcf3a', emissiveIntensity: 1.2, transparent: true, opacity: 0.85, depthWrite: false });
      for (let i = 0; i < 6; i++) { const t = Math.PI * (0.1 + i * 0.16); s.rod([Math.cos(t) * 0.32, bellY - 0.14 + Math.sin(t) * 0.1 - 0.1, 0.12], [Math.cos(t) * 0.52, bellY - 0.14 + Math.sin(t) * 0.22 - 0.1, 0.14], 0.012, ringMat); }
    }

    // Prize rack on the side.
    if (a.prizes) {
      const px = towerW / 2 + 0.55;
      s.rod([px, 0.1, -0.1], [px, 1.9, -0.1], 0.02, steel);
      s.cylinder(0.2, 0.22, 0.05, [px, 0.09, -0.1], dark, 12);
      s.rod([px - 0.35, 1.85, -0.1], [px + 0.35, 1.85, -0.1], 0.015, steel);
      const cols = ['#e86a9a', '#62b4e8', '#9be03a', '#f2c53d', '#8a4fc0'];
      const count = 2 + Math.round(mood.density * 4);
      const pts: { at: [number, number, number]; size: number; color: string }[] = [];
      for (let i = 0; i < count; i++) {
        const x = px - 0.3 + i * 0.6 / Math.max(1, count - 1), c = cols[Math.floor(random() * cols.length)], drop = 0.12 + random() * 0.5;
        s.rod([x, 1.85, -0.1], [x, 1.85 - drop, -0.1], 0.004, dark);
        pts.push({ at: [x, 1.85 - drop - 0.08, -0.1], size: 0.085, color: c }, { at: [x, 1.85 - drop - 0.2, -0.1], size: 0.11, color: c }, { at: [x - 0.06, 1.85 - drop - 0.01, -0.1], size: 0.035, color: c }, { at: [x + 0.06, 1.85 - drop - 0.01, -0.1], size: 0.035, color: c });
      }
      s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 1 }), pts);
    }
    // Extension cord snaking away.
    if (live) s.tube([[-0.5, 0.03, -0.3], [-0.95, 0.02, -0.1], [-1.05, 0.02, 0.4], [-1.4, 0.02, 0.6]], 0.012, s.material('#e8842c'));

    return s.finish({ footprint: 1.0, update: (_dt, time) => setLamps(time) });
  },
});
