import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

const SONGS = {
  heartbreak: { say: 'A slow country heartbreak ballad: cold blue and violet light.', glow: ['#3f7bff', '#9a5cff', '#59d5ff'], title: 'CRYIN\' TIME' },
  rock: { say: 'Loud classic rock that the whole bar shouts along to: hot red and amber light.', glow: ['#ff3b2a', '#ffb02e', '#ff6a1f'], title: 'BORN TO RUN' },
  soul: { say: 'A soul slow-dance number for two people at closing: rose pink and gold light.', glow: ['#ff5fa8', '#ffd060', '#ff8fd0'], title: 'AT LAST' },
  again: { say: 'The same song one regular has played all night, again: sickly green and yellow light.', glow: ['#7dff5a', '#f4ff4a', '#31e0a0'], title: 'AGAIN x9' },
  polka: { say: 'A cheerful novelty or polka tune nobody admits choosing: every colour at once.', glow: ['#ff4d4d', '#4dc3ff', '#ffe14d'], title: 'BEER BARREL' },
} as const;
const pick = <T extends Record<string, { say: string }>>(table: T) =>
  Object.fromEntries(Object.entries(table).map(([key, value]) => [key, value.say])) as { [K in keyof T]: string };

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function archShape(width: number, height: number) {
  const r = width / 2, shape = new THREE.Shape();
  shape.moveTo(-r, 0); shape.lineTo(-r, height - r); shape.absarc(0, height - r, r, Math.PI, 0, true); shape.lineTo(r, 0); shape.closePath();
  return shape;
}
function archPath(width: number, height: number, z: number, steps = 14): [number, number, number][] {
  const r = width / 2, points: [number, number, number][] = [[-r, 0.02, z], [-r, (height - r) * 0.5, z]];
  for (let i = 0; i <= steps; i++) { const t = Math.PI - (i / steps) * Math.PI; points.push([Math.cos(t) * r, height - r + Math.sin(t) * r, z]); }
  points.push([r, (height - r) * 0.5, z], [r, 0.02, z]);
  return points;
}

export default defineThing({
  questions: {
    era: choice('What era is the jukebox from?', {
      bubbler: 'A 1940s cathedral-arch jukebox in wood with bubbling coloured tubes round the arch and a fan grille.',
      chrome: 'A 1960s console in chrome and laminate, low and wide, with a slanted glass dome over a rack of 45s.',
      cd: 'A 1990s black CD jukebox: tall, a neon arch, a window of flip-page album covers and a number pad.',
      touchscreen: 'A slim modern internet jukebox, a touchscreen imposter with a fake LED arch and a card reader.',
    }),
    song: choice('What kind of song is it playing, or last played?', pick(SONGS)),
    state: choice('What is it doing right now?', {
      playing: 'Fully lit, record spinning, tubes pulsing.',
      skipping: 'Stuck: the record skips and the lights stutter.',
      idle: 'Lit low and waiting for a coin, nothing turning.',
      unplugged: 'Dark and unplugged, the cord on the floor and a handwritten note taped to the front.',
    }),
    note: choice('If a handwritten note is taped to it, what does it say?', {
      order: 'OUT OF ORDER', song: 'NO MORE B-17', ask: 'BROKEN ASK JO', rip: 'R.I.P. 1974-2024', eats: 'EATS QUARTERS',
    }),
    finish: choice('What is the cabinet finished in?', {
      walnut: 'Warm brown walnut veneer.',
      red: 'Cherry red lacquer.',
      cream: 'Nicotine-yellowed cream enamel.',
      black: 'Black with gold pinstripes.',
      teal: 'Turquoise diner laminate.',
    }),
    feet: choice('What has been left at its feet?', {
      nothing: 'Nothing, clean floor.',
      coins: 'Dropped quarters scattered on the floor.',
      crate: 'A milk crate of old 45s pulled out of it.',
      glass: 'An empty pint glass and a bottle set down by a dancer.',
    }),
    selections: score('How many of the title-strip slots still hold a card?', ['Almost all blank', 'Half filled', 'Every slot filled']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const song = SONGS[a.song];
    const on = a.state === 'unplugged' ? 0 : a.state === 'idle' ? 0.45 : 1;
    const power = on * mix(0.3, 0.62, mood.cheer);
    const cab = { walnut: '#7a4a2a', red: '#b0242a', cream: '#e3d7a8', black: '#22201f', teal: '#2f9c95' }[a.finish];
    const body = s.material(cab, { roughness: 0.45 });
    const trim = s.material(a.finish === 'black' ? '#c9a24a' : '#3a2416', { roughness: 0.5 });
    const chrome = s.material('#d9dde0', { metalness: 0.9, roughness: 0.22 });
    const dark = s.material('#17181b', { roughness: 0.7 });
    const glows: { material: THREE.MeshStandardMaterial; base: number; phase: number }[] = [];
    const glow = (color: string, base = 1.3) => {
      const material = new THREE.MeshStandardMaterial({ color: on ? color : '#6d6a62', emissive: color, emissiveIntensity: base * power, roughness: 0.3 });
      glows.push({ material, base, phase: glows.length * 1.7 });
      return material;
    };
    const strips = (cols: number, rows: number) => paint(512, 256, (ctx, w, h) => {
      ctx.fillStyle = on ? '#fff3c8' : '#8d8672'; ctx.fillRect(0, 0, w, h);
      const cw = w / cols, ch = h / rows;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const filled = random() < mix(0.12, 1, a.selections);
        ctx.fillStyle = filled ? (on ? '#fffdf2' : '#b9b4a2') : (on ? '#d8c58a' : '#77705c');
        ctx.fillRect(c * cw + 3, r * ch + 3, cw - 6, ch - 6);
        if (!filled) continue;
        ctx.fillStyle = ['#c22', '#27c', '#2a6', '#c72'][Math.floor(random() * 4)]; ctx.fillRect(c * cw + 3, r * ch + ch / 2 - 2, cw - 6, 4);
        ctx.fillStyle = '#333';
        for (const y of [0.28, 0.74]) ctx.fillRect(c * cw + 10, r * ch + ch * y - 2, (cw - 24) * (0.4 + random() * 0.6), 4);
      }
    });
    const lit = (texture: THREE.Texture, strength = 0.7) => new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: strength * on, roughness: 0.4 });
    const plane = (w: number, h: number, at: [number, number, number], material: THREE.Material, tilt = 0) => {
      const mesh = s.mesh(new THREE.PlaneGeometry(w, h), material, at); mesh.rotation.x = tilt; return mesh;
    };
    const spinners: THREE.Object3D[] = [];
    const record = (at: [number, number, number], radius: number, tilt: number) => {
      const group = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.006, 32), dark);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, 0.008, 20), s.material(song.glow[0]));
      const mark = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.5, 0.009, 0.012), s.material('#f4efe0'));
      mark.position.x = radius * 0.6;
      group.add(disc, label, mark);
      const holder = new THREE.Group();
      holder.add(group); holder.position.set(...at); holder.rotation.x = tilt;
      s.root.add(holder); spinners.push(group);
      return holder;
    };
    let front = 0.31, width = 0.82, noteY = 0.95;

    if (a.era === 'bubbler') {
      const H = 1.5, D = 0.6;
      s.box([0.9, 0.1, 0.68], [0, 0.05, 0], trim);
      s.mesh(new THREE.ExtrudeGeometry(archShape(width, H - 0.1), { depth: D, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), body, [0, 0.1, -D / 2]);
      front = D / 2 + 0.013;
      // Coloured plastic pilasters and bubble tubes following the arch.
      const band = archShape(0.74, H - 0.16); band.holes.push(new THREE.Path(archShape(0.5, H - 0.3).getPoints(24)));
      s.mesh(new THREE.ExtrudeGeometry(band, { depth: 0.02, bevelEnabled: false }), glow(song.glow[1], 0.9), [0, 0.12, front - 0.005]);
      s.tube(archPath(0.7, H - 0.2, front + 0.03), 0.026, glow(song.glow[0], 1.6)).position.y = 0.12;
      s.tube(archPath(0.54, H - 0.28, front + 0.03), 0.02, glow(song.glow[2], 1.6)).position.y = 0.12;
      for (const x of [-0.31, 0.31]) s.cylinder(0.04, 0.045, 0.08, [x, 0.16, front + 0.03], chrome, 14);
      // Record window, title strips, buttons, fan grille.
      const win = new THREE.Shape(); win.absarc(0, 0, 0.23, 0, Math.PI, false); win.closePath();
      s.mesh(new THREE.ShapeGeometry(win, 24), dark, [0, 1.06, front + 0.002]);
      record([0, 1.12, front + 0.05], 0.15, 0.95);
      s.rod([0.19, 1.1, front + 0.03], [0.07 + (a.state === 'skipping' ? 0.05 : 0), 1.16, front + 0.1], 0.008, chrome);
      plane(0.46, 0.2, [0, 0.93, front + 0.03], lit(strips(4, 5)), -0.35);
      s.box([0.5, 0.05, 0.07], [0, 0.79, front + 0.03], chrome);
      for (let i = 0; i < 10; i++) s.cylinder(0.014, 0.014, 0.02, [-0.2 + i * 0.0445, 0.82, front + 0.04], s.material(i % 2 ? '#e8e2cf' : '#c8352b'), 10);
      plane(0.44, 0.58, [0, 0.45, front + 0.003], s.material('#8a6a2c', { roughness: 0.9 }));
      for (let i = -4; i <= 4; i++) s.rod([i * 0.012, 0.18, front + 0.012], [i * 0.052, 0.73, front + 0.012], 0.008, chrome);
      s.cylinder(0.07, 0.07, 0.02, [0, 0.3, front + 0.02], glow(song.glow[0], 1.2), 20).rotation.x = Math.PI / 2;
      noteY = 0.5;
    } else if (a.era === 'chrome') {
      width = 1.0;
      s.box([width, 0.86, 0.62], [0, 0.51, 0], body);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.cylinder(0.025, 0.018, 0.08, [x * 0.42, 0.04, z * 0.24], chrome, 10);
      plane(0.86, 0.5, [0, 0.4, 0.312], s.material('#2a2c30', { metalness: 0.4 }));
      for (let i = 0; i < 21; i++) s.box([0.012, 0.5, 0.02], [-0.42 + i * 0.042, 0.4, 0.32], chrome);
      s.box([width + 0.04, 0.05, 0.66], [0, 0.94, 0], chrome);
      // Slanted control deck with title strips and push buttons.
      plane(0.9, 0.24, [0, 1.03, 0.2], lit(strips(8, 4)), -0.95);
      s.box([0.92, 0.04, 0.05], [0, 0.965, 0.315], glow(song.glow[0], 1.3));
      for (let i = 0; i < 16; i++) s.box([0.03, 0.02, 0.03], [-0.36 + i * 0.048, 0.73, 0.325], s.material(i < 8 ? '#e8e2cf' : '#c8352b'));
      s.box([0.92, 0.03, 0.02], [0, 0.69, 0.32], chrome);
      // Glass dome over a rack of standing 45s with one on the platter.
      const rack = Array.from({ length: 22 }, (_u, i) => ({ at: [-0.36 + i * 0.022, 1.14, -0.12] as [number, number, number], size: 1 }));
      const rackGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.005, 20); rackGeo.rotateZ(Math.PI / 2);
      s.scatter(rackGeo, dark, rack);
      record([0.27, 1.07, -0.05], 0.1, 0.25);
      s.rod([0.42, 1.08, 0.06], [0.33 + (a.state === 'skipping' ? 0.06 : 0), 1.09, -0.02], 0.008, chrome);
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, width - 0.04, 20, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#dff2ff', transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.05 }));
      dome.rotation.z = Math.PI / 2; dome.rotation.y = Math.PI; dome.position.set(0, 0.97, 0); dome.rotation.order = 'ZXY';
      s.root.add(dome);
      for (const x of [-1, 1]) {
        const cap = new THREE.Shape(); cap.absarc(0, 0, 0.32, 0, Math.PI, false); cap.closePath();
        const end = s.mesh(new THREE.ExtrudeGeometry(cap, { depth: 0.03, bevelEnabled: false }), chrome, [x * 0.5 - 0.015, 0.96, 0]);
        end.rotation.y = Math.PI / 2;
      }
      s.box([0.9, 0.05, 0.04], [0, 1.26, -0.2], glow(song.glow[1], 1.4));
      front = 0.33; noteY = 0.45;
    } else if (a.era === 'cd') {
      const H = 1.62, D = 0.56; width = 0.86;
      const shell = s.material(a.finish === 'walnut' ? '#3b2a20' : cab === '#22201f' ? '#1d1d22' : cab, { roughness: 0.4 });
      s.mesh(new THREE.ExtrudeGeometry(archShape(width, H), { depth: D, bevelEnabled: false }), shell, [0, 0, -D / 2]);
      front = D / 2;
      s.tube(archPath(0.76, H - 0.05, front + 0.025), 0.022, glow(song.glow[0], 1.8));
      s.tube(archPath(0.66, H - 0.1, front + 0.02), 0.012, glow(song.glow[2], 1.6));
      const covers = paint(512, 384, (ctx, w, h) => {
        ctx.fillStyle = '#0c0c10'; ctx.fillRect(0, 0, w, h);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
          if (random() > mix(0.2, 1, a.selections)) continue;
          ctx.fillStyle = `hsl(${Math.floor(random() * 360)} 65% ${35 + random() * 30}%)`; ctx.fillRect(c * 128 + 8, r * 128 + 8, 112, 112);
          ctx.fillStyle = `hsl(${Math.floor(random() * 360)} 70% 70%)`; ctx.beginPath(); ctx.arc(c * 128 + 64, r * 128 + 64, 18 + random() * 26, 0, 7); ctx.fill();
        }
      });
      plane(0.58, 0.44, [0, 1.08, front + 0.004], lit(covers, 0.8));
      const pad = paint(256, 256, (ctx) => {
        ctx.fillStyle = '#222'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#041'; ctx.fillRect(16, 12, 224, 56);
        ctx.fillStyle = on ? '#4f6' : '#052'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center'; ctx.fillText(a.state === 'skipping' ? 'Err 12' : on ? 'CD 21-07' : '', 128, 54);
        ctx.font = 'bold 30px monospace';
        '123456789*0#'.split('').forEach((k, i) => { ctx.fillStyle = '#ddd'; ctx.fillRect(28 + (i % 3) * 70, 84 + Math.floor(i / 3) * 42, 60, 34); ctx.fillStyle = '#111'; ctx.fillText(k, 58 + (i % 3) * 70, 111 + Math.floor(i / 3) * 42); });
      });
      plane(0.26, 0.26, [0.14, 0.68, front + 0.02], lit(pad, 0.5), -0.3);
      s.box([0.2, 0.12, 0.03], [-0.18, 0.7, front + 0.01], chrome); s.box([0.14, 0.012, 0.035], [-0.18, 0.71, front + 0.012], dark);
      const mesh = paint(128, 128, (ctx) => { ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#444'; for (let x = 4; x < 128; x += 8) for (let y = 4; y < 128; y += 8) { ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); } });
      plane(0.64, 0.4, [0, 0.28, front + 0.004], new THREE.MeshStandardMaterial({ map: mesh, roughness: 0.8 }));
      record([0, 1.42, front + 0.02], 0.085, Math.PI / 2).children[0].children.forEach((child, i) => { if (i === 0) (child as THREE.Mesh).material = chrome; });
      noteY = 1.05;
    } else {
      width = 0.66;
      s.box([0.72, 0.06, 0.42], [0, 0.03, 0], dark); s.box([0.3, 0.5, 0.16], [0, 0.3, -0.04], dark);
      s.mesh(new THREE.ExtrudeGeometry(archShape(width, 1.12), { depth: 0.14, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), s.material('#1b1c20', { roughness: 0.3 }), [0, 0.5, -0.07]);
      front = 0.082;
      s.tube(archPath(0.6, 1.08, front + 0.012), 0.014, glow(song.glow[0], 2)).position.y = 0.5;
      const screen = paint(384, 512, (ctx, w, h) => {
        ctx.fillStyle = on ? '#10162e' : '#08090b'; ctx.fillRect(0, 0, w, h);
        if (!on) return;
        if (a.state === 'skipping') { ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('BUFFERING', w / 2, 230); ctx.strokeStyle = '#fff'; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(w / 2, 320, 40, 0, 4.4); ctx.stroke(); return; }
        ctx.fillStyle = song.glow[0]; ctx.fillRect(0, 0, w, 70); ctx.fillStyle = '#fff'; ctx.font = 'bold 34px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.state === 'idle' ? 'TAP TO PLAY $1' : song.title, w / 2, 48);
        for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) { if (random() > mix(0.3, 1, a.selections)) continue; ctx.fillStyle = `hsl(${Math.floor(random() * 360)} 70% 55%)`; ctx.fillRect(18 + c * 120, 92 + r * 120, 106, 106); }
        ctx.fillStyle = song.glow[1]; ctx.fillRect(18, 462, 348 * (0.2 + random() * 0.7), 14);
      });
      plane(0.48, 0.64, [0, 1.14, front + 0.012], lit(screen, 0.95));
      s.box([0.12, 0.16, 0.05], [0.2, 0.7, front + 0.01], s.material('#3a3d44')); s.box([0.08, 0.008, 0.055], [0.2, 0.72, front + 0.012], glow('#39ff7a', 1.2));
      s.box([0.2, 0.08, 0.02], [-0.14, 0.68, front + 0.005], glow(song.glow[2], 1));
      noteY = 1.15;
    }

    // Marquee: what is playing.
    if (a.era !== 'touchscreen') {
      const marqueeY = a.era === 'chrome' ? 0.865 : a.era === 'cd' ? 1.36 : 1.345;
      const text = a.state === 'unplugged' ? '' : a.state === 'idle' ? 'INSERT COIN' : a.state === 'skipping' ? song.title.slice(0, 4) + '-' + song.title.slice(0, 4) + '-' : song.title;
      const m = s.label(text || ' ', a.era === 'chrome' ? 0.5 : 0.3, 0.055, [0, marqueeY, front + (a.era === 'chrome' ? 0 : 0.012)], on ? '#fff6c0' : '#55524a', on ? '#3a0d0d' : '#24211e');
      const mm = m.material as THREE.MeshStandardMaterial; mm.emissiveMap = mm.map; mm.emissive = new THREE.Color('#ffffff'); mm.emissiveIntensity = 0.6 * on;
    }
    s.box([0.035, 0.07, 0.02], [width / 2 - 0.09, a.era === 'touchscreen' ? 0.58 : 0.7, front + 0.008], chrome);

    if (a.state === 'unplugged') {
      const words = { order: 'OUT OF\nORDER', song: 'NO MORE\nB-17', ask: 'BROKEN\nASK JO', rip: 'R.I.P.\n1974-2024', eats: 'EATS\nQUARTERS' }[a.note].split('\n');
      const noteTex = paint(256, 200, (ctx) => {
        ctx.fillStyle = '#f6f0d8'; ctx.fillRect(0, 0, 256, 200);
        ctx.fillStyle = '#1d2c8a'; ctx.font = 'italic bold 50px cursive'; ctx.textAlign = 'center';
        words.forEach((word, i) => { ctx.save(); ctx.translate(128, 84 + i * 62); ctx.rotate((random() - 0.5) * 0.12); ctx.fillText(word, 0, 0, 236); ctx.restore(); });
        ctx.fillStyle = 'rgba(190,170,90,0.75)'; ctx.fillRect(88, 0, 80, 26);
      });
      const sheet = plane(0.3, 0.235, [(random() - 0.5) * 0.08, noteY, front + 0.045], new THREE.MeshStandardMaterial({ map: noteTex, roughness: 0.9, side: THREE.DoubleSide }));
      sheet.rotation.z = (random() - 0.5) * 0.3;
      const side = random() < 0.5 ? -1 : 1, cord = s.material('#1a1a1a');
      s.tube([[side * 0.3, 0.12, -0.25], [side * 0.5, 0.012, -0.1], [side * 0.62, 0.012, 0.2], [side * 0.45, 0.012, 0.42], [side * 0.25, 0.012, 0.5]], 0.008, cord);
      s.box([0.045, 0.03, 0.06], [side * 0.23, 0.015, 0.51], cord);
      for (const o of [-0.01, 0.01]) s.box([0.004, 0.012, 0.03], [side * 0.23 + o, 0.015, 0.55], chrome);
    }
    if (a.feet === 'coins') {
      const coin = new THREE.CylinderGeometry(0.012, 0.012, 0.003, 12);
      s.scatter(coin, chrome, Array.from({ length: 6 + Math.floor(random() * 8) }, () => ({ at: [(random() - 0.5) * 0.9, 0.002, front + 0.12 + random() * 0.3] as [number, number, number], size: 1 })));
    } else if (a.feet === 'crate') {
      const cx = -width / 2 - 0.24, crate = s.material('#c8452f');
      for (const [w, d, x, z] of [[0.36, 0.02, 0, 0.14], [0.36, 0.02, 0, -0.14], [0.02, 0.28, 0.17, 0], [0.02, 0.28, -0.17, 0]] as const)
        for (const y of [0.04, 0.13, 0.22]) s.box([w, 0.05, d], [cx + x, y, 0.2 + z], crate);
      for (let i = 0; i < 12; i++) s.box([0.3, 0.2 + random() * 0.04, 0.008], [cx + (random() - 0.5) * 0.02, 0.13, 0.1 + i * 0.018], s.material(`hsl(${Math.floor(random() * 360)}, 45%, 62%)`)).rotation.x = -0.12;
    } else if (a.feet === 'glass') {
      const glass = new THREE.MeshStandardMaterial({ color: '#e8f4f4', transparent: true, opacity: 0.35, roughness: 0.05 });
      s.cylinder(0.042, 0.032, 0.15, [width / 2 + 0.12, 0.075, 0.25], glass, 14);
      s.cylinder(0.03, 0.03, 0.14, [width / 2 + 0.24, 0.07, 0.18], s.material('#5a3a14', { roughness: 0.2 }), 12);
      s.cylinder(0.012, 0.028, 0.08, [width / 2 + 0.24, 0.18, 0.18], s.material('#5a3a14', { roughness: 0.2 }), 12);
    }
    if (mood.wear > 0.55 && a.era !== 'touchscreen') for (let i = 0; i < Math.round(mood.wear * 5); i++) s.box([0.05 + random() * 0.1, 0.02, 0.004], [(random() - 0.5) * (width - 0.2), 0.14 + random() * 0.5, front + 0.006], s.material('#b9a98a')).rotation.z = (random() - 0.5) * 0.6;

    const speed = mix(0.6, 5, mood.energy);
    return s.finish({
      update(dt, time) {
        const skip = a.state === 'skipping';
        if (a.state === 'playing') for (const spinner of spinners) spinner.rotation.y += dt * 4.7;
        if (skip) for (const spinner of spinners) spinner.rotation.y = Math.sin(time * 9) * 0.25;
        for (const g of glows) {
          const pulse = 0.78 + 0.22 * Math.sin(time * speed + g.phase);
          const stutter = skip && Math.sin(time * 23 + g.phase * 3) > 0.35 ? 0.25 : 1;
          g.material.emissiveIntensity = g.base * power * pulse * stutter;
        }
      },
    });
  },
});
