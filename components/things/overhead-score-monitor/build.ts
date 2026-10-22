import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
function paint(width: number, height: number, draw: (c: Ctx, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

const SCREENS = {
  perfect: 'A perfect game in progress: an unbroken row of strike crosses and a climbing total.',
  gutters: 'A row of gutter balls: dashes and zeroes all the way across.',
  strike: 'A crude cartoon strike animation: pins exploding out of a starburst.',
  misspelled: 'A birthday welcome with the child\'s name spelled wrong in huge letters.',
  nosignal: 'A blank blue screen with a small NO SIGNAL box.',
  fault: 'A red flashing fault message telling you to call the desk.',
  ordinary: 'An ordinary middling game, spares and open frames, nobody winning much.',
} as const;
const CAST = {
  league: ['PIN PALS', 'DOT', 'EARL', 'RUTH', 'BUD'],
  kids: ['PARTY 2', 'TIMMY', 'JEN', 'KYLE', 'MOM'],
  couple: ['LANE', 'SAM', 'ALEX'],
  solo: ['OPEN', 'RAY'],
  jokes: ['TEAM', 'BUTTS', 'AAA', 'ZZZ', 'LOSER'],
} as const;

export default defineThing({
  questions: {
    screen: choice('What is the main screen showing?', SCREENS),
    other: choice('What is the second screen showing?', {
      same: 'The neighbouring lane\'s ordinary score grid.',
      off: 'Nothing: it is switched off, dark grey glass.',
      ad: 'A snack bar advert in fat yellow letters.',
      static: 'Rolling static and a torn picture.',
      nosignal: 'A blank blue no-signal screen.',
    }),
    cast: choice('Who is on the score sheet?', {
      league: 'A league team with old-fashioned first names.',
      kids: 'A children\'s birthday party and one parent.',
      couple: 'Two people on a date.',
      solo: 'One person bowling alone.',
      jokes: 'Teenagers who typed rude or lazy names.',
    }),
    housing: choice('What are the monitor cases like?', {
      beige: 'Yellowed beige plastic, office-computer coloured.',
      black: 'Matt black steel boxes with vent slots.',
      woodgrain: 'Wood-grain vinyl like a 1970s living-room television.',
      orange: 'Burnt-orange fibreglass with rounded corners.',
    }),
    mount: choice('How is it held up?', {
      truss: 'Hung from a tubular steel goalpost frame spanning the lane.',
      console: 'On a mast rising from a floor-standing scorer\'s console with a keypad.',
      post: 'Bolted to the top of a single steel pole plastered with stickers.',
    }),
    crooked: noul('Is one monitor hanging crooked on a loose bracket?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const names = CAST[a.cast];
    const FONT = 'bold 20px monospace';

    const grid = (c: Ctx, w: number, h: number, mode: 'perfect' | 'gutters' | 'ordinary', title: string) => {
      c.fillStyle = '#0c1a3a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f2c12e'; c.fillRect(0, 0, w, 30);
      c.fillStyle = '#0c1a3a'; c.font = FONT; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(title, 8, 16);
      c.textAlign = 'right'; c.fillText('LANE ' + lane, w - 8, 16);
      const players = names.slice(1), rowH = Math.min(62, (h - 40) / players.length), x0 = 76, cell = (w - x0 - 6) / 10;
      players.forEach((name, row) => {
        const y = 38 + row * rowH, current = row === 0;
        c.fillStyle = current ? '#1f3f8a' : '#12264f'; c.fillRect(2, y, w - 4, rowH - 4);
        c.fillStyle = current ? '#ffffff' : '#9fd0ff'; c.font = 'bold 17px monospace'; c.textAlign = 'left'; c.fillText(name.slice(0, 6), 6, y + rowH / 2 - 2);
        let total = 0;
        const done = mode === 'perfect' && current ? 8 : 3 + Math.floor(random() * 6);
        for (let f = 0; f < 10; f++) {
          const x = x0 + f * cell;
          c.strokeStyle = '#5f8fe0'; c.lineWidth = 1.5; c.strokeRect(x, y + 2, cell - 2, rowH - 8);
          c.strokeRect(x + cell / 2 - 1, y + 2, cell / 2 - 1, rowH / 2 - 6);
          if (f >= done) continue;
          let mark = '', points = 0;
          if (mode === 'perfect' && current) { mark = 'X'; points = 30; }
          else if (mode === 'gutters' && current) { mark = '-'; points = 0; }
          else { const roll = random(); mark = roll < 0.18 ? 'X' : roll < 0.45 ? '/' : String(Math.floor(random() * 9)); points = mark === 'X' ? 20 : mark === '/' ? 14 : Number(mark) + 2; }
          total += points;
          c.fillStyle = mark === 'X' ? '#ffe14a' : mark === '-' ? '#ff6a5a' : '#ffffff'; c.font = 'bold 15px monospace'; c.textAlign = 'center';
          c.fillText(mark, x + cell * 0.74, y + rowH * 0.25);
          if (mode === 'gutters' && current) c.fillText('-', x + cell * 0.26, y + rowH * 0.25);
          c.fillStyle = '#ffffff'; c.font = 'bold 13px monospace'; c.fillText(String(total), x + cell / 2 - 1, y + rowH * 0.68);
        }
      });
    };
    const lane = 1 + Math.floor(random() * 30);
    const WRONG = { TIMMY: 'TIMOHTY', DOT: 'DORTHY', SAM: 'SMA', RAY: 'RAYY', BUTTS: 'BUTS' } as Record<string, string>;
    const draw = (kind: string) => (c: Ctx, w: number, h: number) => {
      c.textBaseline = 'middle'; c.textAlign = 'center';
      if (kind === 'perfect' || kind === 'gutters' || kind === 'ordinary' || kind === 'same') grid(c, w, h, kind === 'same' ? 'ordinary' : kind, kind === 'same' ? 'OPEN PLAY' : names[0]);
      else if (kind === 'strike') {
        c.fillStyle = '#1b0f4a'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#ffd23f' : '#ff5a36'; c.beginPath(); c.moveTo(w / 2, h * 0.58); c.arc(w / 2, h * 0.58, w, i / 16 * 6.283, (i + 0.5) / 16 * 6.283); c.fill(); }
        c.fillStyle = '#1b0f4a'; c.beginPath(); c.arc(w / 2, h * 0.58, 52, 0, 7); c.fill();
        for (let i = 0; i < 7; i++) {
          c.save(); c.translate(w / 2 + Math.cos(i * 0.9 + 0.4) * mix(70, 120, random()), h * 0.58 + Math.sin(i * 0.9 + 0.4) * mix(50, 80, random())); c.rotate(random() * 6.28);
          c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 6, 9, 15, 0, 0, 7); c.fill(); c.beginPath(); c.arc(0, -14, 6, 0, 7); c.fill(); c.fillStyle = '#e02a2a'; c.fillRect(-5, -9, 10, 3); c.restore();
        }
        c.fillStyle = '#ffffff'; c.strokeStyle = '#b3126e'; c.lineWidth = 7; c.font = 'bold 58px sans-serif';
        c.strokeText('STRIKE!', w / 2, 40); c.fillText('STRIKE!', w / 2, 40);
      } else if (kind === 'misspelled') {
        c.fillStyle = '#5a1f8a'; c.fillRect(0, 0, w, h);
        for (let i = 0; i < 26; i++) { c.fillStyle = ['#ff5a8a', '#ffd23f', '#3fe0c8', '#ffffff'][i % 4]; c.beginPath(); c.arc(random() * w, random() * h, 3 + random() * 6, 0, 7); c.fill(); }
        const child = names[1]; const wrong = WRONG[child] ?? child.split('').reverse().join('');
        c.fillStyle = '#ffffff'; c.font = 'bold 30px sans-serif'; c.fillText('HAPPY BIRTHDAY', w / 2, 42, w - 16);
        c.fillStyle = '#ffd23f'; c.font = 'bold 66px sans-serif'; c.fillText(wrong + '!', w / 2, h * 0.55, w - 16);
        c.fillStyle = '#3fe0c8'; c.font = 'bold 22px sans-serif'; c.fillText('LANE ' + lane, w / 2, h - 30);
      } else if (kind === 'nosignal') {
        c.fillStyle = '#1430c8'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#0a1a80'; c.fillRect(w / 2 - 78, h / 2 - 20, 156, 40); c.fillStyle = '#ffffff'; c.font = 'bold 22px monospace'; c.fillText('NO SIGNAL', w / 2, h / 2 + 1);
      } else if (kind === 'fault') {
        c.fillStyle = '#b01818'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffe14a'; c.fillRect(0, 0, w, 14); c.fillRect(0, h - 14, w, 14);
        c.fillStyle = '#ffffff'; c.font = 'bold 44px monospace'; c.fillText('PIN JAM', w / 2, h * 0.36); c.font = 'bold 26px monospace'; c.fillText('CALL DESK', w / 2, h * 0.62);
        c.font = 'bold 16px monospace'; c.fillText('ERR ' + (10 + Math.floor(random() * 80)) + '  LANE ' + lane, w / 2, h * 0.8);
      } else if (kind === 'ad') {
        c.fillStyle = '#7a1a12'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.font = 'bold 50px sans-serif'; c.fillText('SNACK BAR', w / 2, 52, w - 16);
        c.fillStyle = '#ffffff'; c.font = 'bold 30px sans-serif'; c.fillText(['NACHOS $2', 'PITCHER $6', 'HOT DOGS 2 FOR 1'][Math.floor(random() * 3)], w / 2, h * 0.55, w - 16);
        c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(w / 2 - 40, h - 20); c.lineTo(w / 2, h - 66); c.lineTo(w / 2 + 40, h - 20); c.fill();
      } else if (kind === 'static') {
        for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) { const v = Math.floor(random() * 220); c.fillStyle = `rgb(${v},${v},${v + 20})`; c.fillRect(x, y, 3, 3); }
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(0, h * random() * 0.8, w, 16);
      } else { c.fillStyle = '#2a2e30'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.ellipse(w * 0.3, h * 0.3, 60, 30, -0.5, 0, 7); c.fill(); }
      // scanlines
      c.fillStyle = 'rgba(0,0,0,0.16)'; for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5);
    };

    const shell = { beige: '#d6cba6', black: '#222327', woodgrain: '#6b4526', orange: '#c8551c' }[a.housing];
    const woodMap = a.housing === 'woodgrain' ? paint(256, 128, (c, w, h) => {
      c.fillStyle = '#6b4526'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(${30 + random() * 40},${15 + random() * 20},5,0.5)`; c.lineWidth = 0.5 + random() * 2; c.beginPath(); const y = random() * h; c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 14, w * 0.6, y + (random() - 0.5) * 14, w, y + (random() - 0.5) * 8); c.stroke(); }
    }) : null;
    const caseMaterial = woodMap ? new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.6 }) : s.material(shell, { roughness: a.housing === 'orange' ? 0.3 : 0.7 });
    const bezel = s.material(a.housing === 'black' ? '#3a3c42' : '#1c1c1f', { roughness: 0.6 });
    const steel = s.material('#8e959b', { metalness: 0.75, roughness: 0.35 });
    const dark = s.material('#17181b', { roughness: 0.8 });
    const glow = mix(0.75, 1.25, mood.cheer);

    const screens: { material: THREE.MeshStandardMaterial; base: number; kind: string }[] = [];
    const monitor = (kind: string, x: number, y: number, tilt: number) => {
      const g = new THREE.Group();
      const add = (mesh: THREE.Mesh) => { mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
      const W = 0.68, H = 0.54;
      add(new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.22), caseMaterial)).position.z = -0.11;
      // tube housing tapering back
      const back = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.42, 0.34, 4, 1), caseMaterial));
      back.rotation.set(Math.PI / 2, Math.PI / 4, 0); back.scale.set(1, 1, 0.82); back.position.z = -0.38;
      back.rotation.order = 'XYZ';
      add(new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.04, 0.02), bezel)).position.z = 0.008;
      const off = kind === 'off';
      const map = paint(320, 240, draw(kind));
      const material = new THREE.MeshStandardMaterial({ map, roughness: 0.25, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: off ? 0.03 : glow });
      const glass = add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, Math.PI / 2 - 0.26, 0.52, Math.PI / 2 - 0.2, 0.4), material));
      glass.scale.set(1.12, 1.12, 1.12); glass.position.z = 0.062 - 1.12;
      screens.push({ material, base: off ? 0.03 : glow, kind });
      // knobs, a brand plate and vent slots
      for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), steel)).position.set(W / 2 - 0.06 - i * 0.04, -H / 2 + 0.022, 0.024);
      g.children.slice(-3).forEach((knob) => { knob.rotation.x = Math.PI / 2; });
      for (let i = 0; i < 6; i++) add(new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.008, 0.004), dark)).position.set(0, H / 2 + 0.001, -0.04 - i * 0.028);
      if (a.housing === 'woodgrain') add(new THREE.Mesh(new THREE.BoxGeometry(W + 0.01, 0.02, 0.23), s.material('#c9a03a', { metalness: 0.7, roughness: 0.3 }))).position.set(0, -H / 2, -0.11);
      g.position.set(x, y, 0.1); g.rotation.x = tilt; g.scale.setScalar(1.2);
      s.root.add(g);
      return g;
    };

    const Y = 2.2, tilt = 0.24;
    const left = monitor(a.screen, -0.43, Y, tilt);
    const right = monitor(a.other, 0.43, Y, tilt);
    left.rotation.y = 0.1; right.rotation.y = -0.1;
    if (a.crooked) { const loose = random() < 0.5 ? left : right; loose.rotation.z = (random() < 0.5 ? -1 : 1) * mix(0.14, 0.26, random()); loose.position.y -= 0.07; loose.rotation.x += 0.12; }
    // lane number lozenge between and above the pair
    const plate = s.label(String(lane), 0.26, 0.17, [0, Y + 0.47, 0.06], '#f6efd6', '#b3261e');
    plate.rotation.x = 0.1;
    s.box([0.3, 0.21, 0.03], [0, Y + 0.47, 0.04], dark).rotation.x = 0.1;
    // yoke the monitors hang from
    const beamY = Y + 0.6;
    s.box([1.74, 0.06, 0.08], [0, beamY, -0.1], steel);
    for (const x of [-0.43, 0.43]) { s.rod([x - 0.2, Y + 0.25, -0.05], [x - 0.2, beamY, -0.1], 0.012, steel); s.rod([x + 0.2, Y + 0.25, -0.05], [x + 0.2, beamY, -0.1], 0.012, steel); }
    // drooping cable
    const cable = s.material('#101012', { roughness: 0.9 });
    s.tube([[-0.37, Y, -0.5], [-0.2, Y - 0.12 - random() * 0.1, -0.48], [0, Y - 0.05, -0.4], [0.2, Y - 0.14 - random() * 0.1, -0.48], [0.37, Y, -0.5]], 0.008, cable);

    if (a.mount === 'truss') {
      const span = 1.25, top = beamY + 0.22;
      for (const x of [-span, span]) {
        s.rod([x, 0, -0.1], [x, top, -0.1], 0.035, steel);
        s.cylinder(0.11, 0.13, 0.04, [x, 0.02, -0.1], dark, 16);
        s.rod([x, top - 0.45, -0.1], [x - Math.sign(x) * 0.45, top, -0.1], 0.02, steel);
      }
      s.rod([-span, top, -0.1], [span, top, -0.1], 0.035, steel);
      for (const x of [-0.6, 0.6]) s.rod([x, beamY, -0.1], [x, top, -0.1], 0.016, steel);
      s.tube([[0.37, Y, -0.5], [0.9, top - 0.1, -0.2], [span, top - 0.2, -0.13], [span + 0.03, 0.9, -0.12], [span + 0.02, 0.05, -0.16]], 0.008, cable);
    } else if (a.mount === 'post') {
      s.rod([0, 0, -0.14], [0, beamY, -0.14], 0.045, steel);
      s.cylinder(0.2, 0.22, 0.03, [0, 0.015, -0.14], dark, 20);
      for (let i = 0; i < 4; i++) { const t = i / 4 * 6.283 + 0.78; s.cylinder(0.015, 0.015, 0.02, [Math.sin(t) * 0.16, 0.035, -0.14 + Math.cos(t) * 0.16], steel, 6); }
      const inks = ['#e23a2e', '#f2c12e', '#2f7fd0', '#2fa86a', '#f4f1e6'];
      for (let i = 0; i < 4 + mood.density * 6; i++) { const t = (random() - 0.5) * 1.6; const sticker = s.box([0.07 + random() * 0.04, 0.05 + random() * 0.05, 0.002], [Math.sin(t) * 0.047, mix(0.8, 1.6, random()), -0.14 + Math.cos(t) * 0.047], s.material(inks[i % 5])); sticker.rotation.set(0, t, (random() - 0.5) * 0.5); }
      s.tube([[0.37, Y, -0.5], [0.1, Y - 0.1, -0.3], [0.05, 1.6, -0.2], [0.06, 0.6, -0.2], [0.1, 0.03, -0.3]], 0.008, cable);
    } else {
      s.rod([0, 0.9, -0.2], [0, beamY, -0.14], 0.04, steel);
      const body = s.material(a.housing === 'black' ? '#3a3c42' : shell, { roughness: 0.6 });
      s.box([0.62, 0.86, 0.42], [0, 0.45, 0.0], woodMap ? caseMaterial : body);
      s.box([0.66, 0.04, 0.46], [0, 0.02, 0.0], dark);
      const keyMap = paint(256, 128, (c, w, h) => {
        c.fillStyle = '#26282d'; c.fillRect(0, 0, w, h);
        for (let r = 0; r < 4; r++) for (let k = 0; k < 9; k++) { c.fillStyle = k > 6 ? (r === 0 ? '#e23a2e' : '#f2c12e') : '#e9e4d2'; c.fillRect(10 + k * 27, 10 + r * 28, 21, 21); }
      });
      const deck = s.mesh(new THREE.BoxGeometry(0.66, 0.05, 0.4), [body, body, new THREE.MeshStandardMaterial({ map: keyMap, roughness: 0.6 }), body, body, body] as unknown as THREE.Material, [0, 0.94, 0.06]);
      deck.rotation.x = 0.32;
      s.box([0.66, 0.16, 0.05], [0, 0.93, -0.2], body);
      const lamp = s.material('#7dff8a', { emissive: '#7dff8a', emissiveIntensity: glow });
      s.box([0.05, 0.02, 0.03], [-0.22, 1.02, -0.19], lamp);
      s.box([0.05, 0.02, 0.03], [-0.14, 1.02, -0.19], s.material('#ff5a4a', { emissive: '#ff5a4a', emissiveIntensity: a.screen === 'fault' ? 1.4 : 0.15 }));
    }

    const energy = mix(0.2, 1.4, mood.energy);
    const phases = screens.map(() => random() * 10);
    return s.finish({
      update(_dt, time) {
        screens.forEach((screen, i) => {
          if (screen.kind === 'off') return;
          let level = 1 - 0.06 * energy * (0.5 + 0.5 * Math.sin(time * 37 + phases[i]));
          if (screen.kind === 'fault') level *= Math.sin(time * 5 * energy) > 0 ? 1 : 0.45;
          if (screen.kind === 'strike') level *= 0.8 + 0.2 * Math.sin(time * 9 * energy);
          if (screen.kind === 'static') level *= 0.7 + 0.3 * Math.sin(time * 61 + phases[i]);
          screen.material.emissiveIntensity = screen.base * level;
        });
      },
    });
  },
});
