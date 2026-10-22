import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { Batch } from './batch';

const SEGMENTS: Record<string, string> = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', '+': 'g+', ' ': '' };

export default defineThing({
  questions: {
    reading: choice('What does the clock read?', {
      counting: 'Counting down, minutes to go, seconds ticking away.',
      holding: 'Stopped in a planned hold, the same number for the last ten minutes.',
      zero: 'All zeros: this is the instant of liftoff.',
      plus: 'Counting up after launch: mission elapsed time.',
      scrub: 'Frozen at thirty-one seconds with a red SCRUB lamp lit. Not today.',
      dark: 'Nothing. Dark for years, digits dead.',
    }),
    display: choice('What kind of display is it?', {
      bulbs: 'Rows of amber incandescent bulbs, the classic press-site clock.',
      led: 'Sharp red seven-segment LEDs.',
      flip: 'White numerals on black split-flap cards.',
      screen: 'A modern video wall, cool blue with white numerals.',
    }),
    flag: choice('What flies from the flagpole?', {
      national: 'A national flag, stripes with a canton, in a good breeze.',
      red: 'A red banner with a gold emblem.',
      mission: 'A white mission flag with a blue roundel.',
      'half-mast': 'A flag lowered to half-mast.',
      tattered: 'The frayed remains of a flag nobody took down.',
      bare: 'Nothing: a bare pole and a slack halyard.',
    }),
    ground: choice('What does it stand on?', {
      lawn: 'A mown green lawn with a neat edge.',
      scrub: 'Sandy scrub with palmetto tufts.',
      gravel: 'A gravel pad with painted kerbstones.',
      marsh: 'Soggy ground with standing water and reeds creeping in.',
    }),
    gathered: choice('What has gathered in front of it?', {
      nobody: 'Nothing and nobody.',
      press: 'A row of press tripods and camera cases.',
      picnic: 'Folding chairs, coolers and a blanket left by spectators.',
      wreath: 'A wreath and flowers laid at its foot.',
      floodlights: 'A line of ground floodlights aimed up at the face.',
    }),
    stand: choice('How is the case mounted?', {
      legs: 'Low on two squat steel legs.',
      plinth: 'On a long concrete plinth with a bronze plaque.',
      trailer: 'On a wheeled trailer, a temporary rental.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const b = new Batch();
    const wear = a.reading === 'dark' ? Math.max(mood.wear, 0.55) : mood.wear;
    const rust = new THREE.Color('#84441f');
    const paint = (hex: string, chance = 1) => {
      const c = new THREE.Color(hex);
      if (random() < wear * 0.7 * chance) c.lerp(rust, mix(0.15, 0.8, random()) * wear);
      else c.offsetHSL(0, 0, (random() - 0.5) * 0.04);
      return c;
    };

    // Ground patch.
    const GX = 20, GZ = 14;
    const groundHex = { lawn: '#6f9a4a', scrub: '#cdbb8c', gravel: '#b3aea2', marsh: '#6f7f4c' }[a.ground];
    const ground = new THREE.Color(groundHex).lerp(new THREE.Color('#a39a62'), a.ground === 'lawn' ? wear * 0.6 : wear * 0.2);
    const pad = s.mesh(new THREE.CylinderGeometry(1, 1, 0.3, 40), s.material(ground, { roughness: 1 }), [0, 0.15, 0]);
    pad.scale.set(GX / 2, 1, GZ / 2);
    const tufts = Math.round(mix(40, 220, mood.density) * (a.ground === 'gravel' ? 0.15 + wear * 0.6 : a.ground === 'lawn' ? 0.25 + wear : 1));
    for (let i = 0; i < tufts; i++) {
      const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.95;
      const x = Math.cos(t) * r * GX / 2, z = Math.sin(t) * r * GZ / 2;
      if (Math.abs(x) < 4.6 && Math.abs(z + 1.5) < 1) continue;
      const tall = a.ground === 'marsh' ? 0.6 + random() * 1.3 : a.ground === 'scrub' ? 0.3 + random() * 0.7 : 0.15 + random() * (0.2 + wear * 0.9);
      const hue = a.ground === 'scrub' ? ['#7d8f4c', '#a39b5a', '#5f7f3a'] : a.ground === 'marsh' ? ['#7a8a42', '#a89a55', '#5c7340'] : ['#5f8a3e', '#7fa04a', '#8b9a52'];
      for (let blade = 0; blade < 3; blade++) b.rod([x, 0.3, z], [x + (random() - 0.5) * tall * 0.9, 0.3 + tall, z + (random() - 0.5) * tall * 0.9], 0.06, hue[(i + blade) % 3], 0.01, 3);
    }
    if (a.ground === 'marsh') for (let i = 0; i < 5; i++) { const t = random() * 6.3, r = 0.3 + random() * 0.55; b.cyl(1.2 + random() * 1.8, 1.2 + random() * 1.8, 0.05, [Math.cos(t) * r * GX / 2, 0.31, Math.sin(t) * r * GZ / 2 * 0.9 + 1.5], '#6f97a6', 12); }
    if (a.ground === 'gravel') for (let k = 0; k < 26; k++) { const t = (k / 26) * Math.PI * 2; b.box([1.5, 0.3, 0.45], [Math.cos(t) * (GX / 2 - 0.5), 0.4, Math.sin(t) * (GZ / 2 - 0.5)], k % 2 ? '#f0efe8' : '#e3bb25', [0, -t + Math.PI / 2, 0]); }
    if (a.ground === 'lawn') b.box([1.4, 0.06, GZ * 0.36], [-5.5, 0.32, GZ * 0.26], '#c9c4b4');

    // The case.
    const CW = 9.6, CH = 3, CD = 1;
    const lift = { legs: 1.1, plinth: 0.9, trailer: 1.5 }[a.stand];
    const cz = -1.5, cy = 0.3 + lift + CH / 2;
    const caseHex = a.display === 'screen' ? '#2b2f33' : a.display === 'flip' ? '#3b4a57' : '#e7e6df';
    b.box([CW, CH, CD], [0, cy, cz], paint(caseHex));
    b.box([CW + 0.3, 0.22, CD + 0.35], [0, cy + CH / 2 + 0.1, cz + 0.05], paint(a.display === 'screen' ? '#1d2023' : '#2f5d8c'));
    b.box([CW + 0.1, 0.16, CD + 0.1], [0, cy - CH / 2 - 0.06, cz], paint('#55595a'));
    for (let v = 0; v < 6; v++) b.box([0.9, 0.5, 0.05], [-3.5 + v * 1.4, cy - 0.7, cz - CD / 2 - 0.02], '#3a3d3e');
    b.box([1.1, 1.7, 0.06], [3.4, cy + 0.2, cz - CD / 2 - 0.03], paint('#cfcfc8'));
    if (a.stand === 'legs') for (const x of [-3, 3]) { b.box([0.9, lift, 0.7], [x, 0.3 + lift / 2, cz], paint('#55595a')); b.box([1.6, 0.2, 1.6], [x, 0.4, cz], '#aeaba0'); }
    else if (a.stand === 'plinth') { b.box([CW + 1, lift, CD + 1], [0, 0.3 + lift / 2, cz], paint('#b9b5a8', 0.3)); b.box([1.6, 0.5, 0.06], [0, 0.3 + lift * 0.55, cz + CD / 2 + 0.53], '#8a6a34'); }
    else {
      b.box([CW + 0.6, 0.3, 2], [0, 0.3 + lift - 0.2, cz], paint('#e2b521'));
      for (const x of [-3.2, 3.2]) for (const z of [-1, 1]) b.cyl(0.55, 0.55, 0.35, [x, 0.85, cz + z * 1.1], '#1e2022', 12, [Math.PI / 2, 0, 0]);
      b.rod([CW / 2 + 0.3, 1.5, cz], [CW / 2 + 2.6, 0.9, cz], 0.12, '#e2b521', 0.12, 5);
      for (const x of [-4.2, 4.2]) b.rod([x, 1.4, cz + 1], [x * 1.08, 0.3, cz + 2], 0.1, '#55595a', 0.1, 4);
    }

    // The face: digits and a status strip painted on a canvas and lit from within.
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 272;
    const ctx = canvas.getContext('2d')!;
    const lit = a.reading !== 'dark';
    const on = { bulbs: '#ffb52e', led: '#ff2a1c', flip: '#f4f2ea', screen: '#f2f8ff' }[a.display];
    const off = { bulbs: '#3a2c18', led: '#2a0f0c', flip: '#15171a', screen: '#16324f' }[a.display];
    const dead = Array.from({ length: 80 }, () => random() < (a.reading === 'dark' ? 1 : wear * 0.22));
    const base = {
      counting: 60 * Math.floor(mix(3, 58, random())) + Math.floor(random() * 60),
      holding: [20 * 60, 9 * 60, 4 * 60][Math.floor(random() * 3)],
      zero: 0, plus: Math.floor(mix(8, 600, random())), scrub: 31, dark: 0,
    }[a.reading];
    const status = { counting: 1, holding: 0, zero: 2, plus: 2, scrub: 3, dark: -1 }[a.reading];
    const draw = (seconds: number, blink: boolean) => {
      ctx.fillStyle = a.display === 'screen' ? (lit ? '#123a63' : '#0d1114') : '#0c0d0e';
      ctx.fillRect(0, 0, 1024, 272);
      const hh = Math.floor(seconds / 3600) % 100, mm = Math.floor(seconds / 60) % 60, ss = seconds % 60;
      const two = (v: number) => String(v).padStart(2, '0');
      const text = (a.reading === 'plus' ? '+' : '-') + two(hh) + ':' + two(mm) + ':' + two(ss);
      let x = 36, cell = 0;
      const w = 92, h = 150, top = 22, t = 18;
      for (const ch of text) {
        if (ch === ':') {
          ctx.fillStyle = lit && blink ? on : off;
          for (const dy of [0.32, 0.68]) { ctx.beginPath(); ctx.arc(x + 14, top + h * dy, 11, 0, 7); ctx.fill(); }
          x += 44;
          continue;
        }
        if (a.display === 'flip' || a.display === 'screen') {
          if (a.display === 'flip') { ctx.fillStyle = '#1b1d20'; ctx.fillRect(x - 4, top - 6, w + 8, h + 12); }
          ctx.fillStyle = lit ? on : a.display === 'flip' ? '#8b8a84' : off;
          ctx.font = `bold ${h * 1.12}px monospace`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (lit || a.display === 'flip') ctx.fillText(ch, x + w / 2, top + h / 2 + 8);
          if (a.display === 'flip') { ctx.fillStyle = '#0c0d0e'; ctx.fillRect(x - 4, top + h / 2 - 2, w + 8, 4); }
        } else {
          const want = SEGMENTS[ch] ?? '';
          const bars: Record<string, [number, number, number, number]> = { a: [t, 0, w - t, 0], g: [t, h / 2, w - t, h / 2], d: [t, h, w - t, h], f: [0, t, 0, h / 2 - t], b: [w, t, w, h / 2 - t], e: [0, h / 2 + t, 0, h - t], c: [w, h / 2 + t, w, h - t] };
          Object.entries(bars).forEach(([key, [x0, y0, x1, y1]], index) => {
            const glow = lit && want.includes(key) && !dead[(cell * 7 + index) % 80];
            ctx.fillStyle = ctx.strokeStyle = glow ? on : off;
            if (a.display === 'bulbs') for (let dot = 0; dot < 4; dot++) { ctx.beginPath(); ctx.arc(x + x0 + ((x1 - x0) * dot) / 3, top + y0 + ((y1 - y0) * dot) / 3, 9, 0, 7); ctx.fill(); }
            else { ctx.lineWidth = t; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + x0, top + y0); ctx.lineTo(x + x1, top + y1); ctx.stroke(); }
          });
          if (want.includes('+') && lit) { ctx.fillStyle = on; ctx.fillRect(x + w / 2 - t / 2, top + h / 2 - 34, t, 68); }
        }
        x += w + 36;
        cell++;
      }
      const words = ['HOLD', 'COUNT', 'LIFTOFF', 'SCRUB'];
      ctx.font = 'bold 40px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      words.forEach((word, index) => {
        const glow = lit && index === status && (index !== 0 || blink || true);
        ctx.fillStyle = glow ? (index === 3 ? '#ff2a1c' : index === 2 ? '#7dff6a' : '#ffd23c') : '#2a2c2e';
        ctx.fillRect(40 + index * 240, 206, 224, 50);
        ctx.fillStyle = glow ? '#111' : '#5a5d60';
        ctx.fillText(word, 152 + index * 240, 233);
      });
      if (wear > 0.5 || a.reading === 'dark') {
        ctx.strokeStyle = 'rgba(200,205,205,0.55)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(700, 0); ctx.lineTo(742, 96); ctx.lineTo(716, 150); ctx.lineTo(790, 272); ctx.moveTo(742, 96); ctx.lineTo(850, 120); ctx.stroke();
      }
    };
    draw(base, true);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const power = lit ? mix(0.75, 1.25, Math.abs(mood.daylight - 0.5) * 2) * (a.reading === 'zero' ? 1.4 : 1) : 0;
    const faceMat = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: power, roughness: 0.35 });
    const face = s.mesh(new THREE.PlaneGeometry(CW - 0.5, CH - 0.45), faceMat, [0, cy, cz + CD / 2 + 0.02]);
    face.castShadow = false;
    b.box([CW - 0.2, 0.5, 0.5], [0, cy + CH / 2 - 0.05, cz + CD / 2 + 0.25], paint(caseHex), [0.25, 0, 0]);
    if (wear > 0.6) for (let v = 0; v < 6; v++) b.rod([-CW / 2 + random() * CW, 0.3, cz + CD / 2 + 0.1], [-CW / 2 + random() * CW, 0.3 + lift + random() * CH, cz + CD / 2 + 0.06], 0.07, '#5f7f3a', 0.03, 4);

    // Flagpole.
    const px = CW / 2 + 2.4, pz = cz - 0.6, PH = 12.5;
    b.cyl(0.55, 0.7, 0.5, [px, 0.55, pz], '#aeaba0', 12);
    b.cyl(0.09, 0.16, PH, [px, 0.3 + PH / 2, pz], paint('#eceae2'), 8);
    b.ball(0.28, [px, 0.45 + PH, pz], '#d9b441', [1, 1, 1], 10);
    b.rod([px + 0.18, 1.6, pz], [px + 0.14, PH, pz], 0.025, '#d8d4c6', 0.025, 3);
    let cloth: THREE.Mesh | null = null;
    if (a.flag !== 'bare') {
      const FW = 4.4, FH = 2.6;
      const fc = document.createElement('canvas');
      fc.width = 256; fc.height = 152;
      const f = fc.getContext('2d')!;
      const design = a.flag === 'half-mast' || a.flag === 'tattered' ? 'national' : a.flag;
      if (design === 'national') {
        for (let stripe = 0; stripe < 9; stripe++) { f.fillStyle = stripe % 2 ? '#f1eee4' : '#b9302a'; f.fillRect(0, (stripe * 152) / 9, 256, 152 / 9 + 1); }
        f.fillStyle = '#27407a'; f.fillRect(0, 0, 104, 84);
        f.fillStyle = '#f1eee4'; for (let star = 0; star < 12; star++) { f.beginPath(); f.arc(16 + (star % 4) * 24, 16 + Math.floor(star / 4) * 26, 5, 0, 7); f.fill(); }
      } else if (design === 'red') {
        f.fillStyle = '#c4261d'; f.fillRect(0, 0, 256, 152);
        f.fillStyle = '#e8c33a'; f.beginPath(); f.arc(52, 46, 24, 0, 7); f.fill();
        f.fillStyle = '#c4261d'; f.beginPath(); f.arc(60, 40, 20, 0, 7); f.fill();
        f.fillStyle = '#e8c33a'; f.fillRect(84, 22, 8, 46);
      } else {
        f.fillStyle = '#f3f1e8'; f.fillRect(0, 0, 256, 152);
        f.fillStyle = '#2a5fa8'; f.beginPath(); f.arc(128, 76, 46, 0, 7); f.fill();
        f.strokeStyle = '#d8372b'; f.lineWidth = 9; f.beginPath(); f.moveTo(70, 112); f.quadraticCurveTo(128, 20, 196, 34); f.stroke();
        f.fillStyle = '#f3f1e8'; f.beginPath(); f.arc(128, 76, 9, 0, 7); f.fill();
      }
      if (a.flag === 'tattered') { f.globalCompositeOperation = 'destination-out'; for (let rip = 0; rip < 9; rip++) { f.beginPath(); f.moveTo(256, rip * 18); f.lineTo(150 + random() * 80, rip * 18 + 6 + random() * 8); f.lineTo(256, rip * 18 + 14); f.fill(); } for (let hole = 0; hole < 5; hole++) { f.beginPath(); f.arc(60 + random() * 150, random() * 152, 6 + random() * 9, 0, 7); f.fill(); } }
      const flagMap = new THREE.CanvasTexture(fc);
      flagMap.colorSpace = THREE.SRGBColorSpace;
      const geometry = new THREE.PlaneGeometry(FW, FH, 14, 4);
      geometry.translate(FW / 2, 0, 0);
      const fade = a.flag === 'tattered' ? 0.55 : 1 - wear * 0.25;
      cloth = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: flagMap, side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.5, color: new THREE.Color(fade, fade, fade * 0.97) }), [px + 0.12, 0.3 + (a.flag === 'half-mast' ? PH * 0.48 : PH - FH / 2 - 0.3), pz]);
      cloth.rotation.y = -0.5 + random() * 0.6;
      cloth.userData.rest = geometry.attributes.position.clone();
    }

    // What has gathered in front.
    if (a.gathered === 'press') {
      const rows = Math.round(mix(4, 11, mood.density));
      for (let i = 0; i < rows; i++) {
        const x = -6 + i * (12 / Math.max(1, rows - 1)) + (random() - 0.5) * 0.5, z = 4.2 + (random() - 0.5) * 1.6, top = 1.8 + random() * 0.3;
        for (let leg = 0; leg < 3; leg++) b.rod([x, top, z], [x + Math.sin(leg * 2.1) * 0.55, 0.3, z + Math.cos(leg * 2.1) * 0.55], 0.04, '#1e2022', 0.04, 4);
        b.box([0.3, 0.26, 0.5], [x, top + 0.14, z], '#1e2022');
        b.cyl(0.11, 0.14, 0.5 + random() * 0.5, [x, top + 0.14, z - 0.45], i % 3 ? '#1e2022' : '#e9e7df', 8, [Math.PI / 2, 0, 0]);
        if (random() < 0.5) b.box([0.7, 0.35, 0.45], [x + 0.6, 0.48, z + 0.5], ['#b8bcbc', '#2b2d2e', '#d9772a'][i % 3], [0, random(), 0]);
      }
    } else if (a.gathered === 'picnic') {
      b.box([2.6, 0.04, 2], [-3.5, 0.33, 4.6], '#c44a3d', [0, 0.3, 0]);
      for (let i = 0; i < 5; i++) {
        const x = -1 + i * 1.5 + (random() - 0.5) * 0.4, z = 4 + random() * 1.4, hue = ['#2f6fb0', '#e0a92e', '#3f8f5a', '#d6543f', '#7c6bb3'][i], turn = (random() - 0.5) * 0.7;
        b.within([x, 0.3, z], [0, turn + Math.PI, 0], () => {
          b.box([0.6, 0.05, 0.55], [0, 0.45, 0], hue);
          b.box([0.6, 0.6, 0.05], [0, 0.78, -0.3], hue, [-0.2, 0, 0]);
          for (const lx of [-0.28, 0.28]) { b.rod([lx, 0, 0.3], [lx, 0.9, -0.35], 0.025, '#c9c9c2', 0.025, 4); b.rod([lx, 0, -0.3], [lx, 0.5, 0.3], 0.025, '#c9c9c2', 0.025, 4); }
        });
      }
      b.box([0.8, 0.5, 0.5], [-3.2, 0.57, 4.4], '#e9e7df', [0, 0.4, 0]); b.box([0.82, 0.12, 0.52], [-3.2, 0.87, 4.4], '#2f6fb0', [0, 0.4, 0]);
      b.box([0.6, 0.4, 0.4], [6.4, 0.5, 4.9], '#d6543f', [0, -0.3, 0]);
    } else if (a.gathered === 'wreath') {
      b.within([0, 0.3, cz + CD / 2 + 0.9], [-0.35, 0, 0], () => {
        for (let k = 0; k < 18; k++) { const t = (k / 18) * Math.PI * 2; b.ball(0.2, [Math.cos(t) * 0.62, 0.75 + Math.sin(t) * 0.62, 0], k % 3 ? '#3f7a3c' : ['#f3f1e8', '#c8322b'][k % 2], [1, 1, 0.7], 6); }
        for (const x of [-0.45, 0.45]) b.rod([x, 0, -0.35], [x * 0.7, 1.3, 0], 0.03, '#3a3d3e', 0.03, 4);
        b.box([0.5, 0.16, 0.03], [0, 0.3, 0.1], '#f3f1e8');
      });
      for (let k = 0; k < 9; k++) { const x = (random() - 0.5) * 5, z = cz + CD / 2 + 1 + random() * 1.2; b.rod([x, 0.34, z], [x + 0.5, 0.36, z + (random() - 0.5) * 0.4], 0.03, '#3f7a3c', 0.03, 3); b.ball(0.11, [x + 0.52, 0.4, z], ['#c8322b', '#f3f1e8', '#e8c33a'][k % 3], [1, 1, 1], 6); }
      for (let k = 0; k < 4; k++) b.cyl(0.07, 0.07, 0.22, [-1.6 + k * 1.05, 0.41, cz + CD / 2 + 1.7], '#f3f1e8', 6);
    }
    s.root.add(b.mesh({ metalness: 0.05 }));
    if (a.gathered === 'floodlights') {
      const beam = s.material('#fff3c9', { emissive: '#ffe9a6', emissiveIntensity: lit ? 2 : 0.1 });
      for (let i = 0; i < 5; i++) { const x = -4 + i * 2; s.box([0.7, 0.35, 0.5], [x, 0.55, 2.6], s.material('#2b2d2e')).rotation.x = -0.6; s.box([0.56, 0.05, 0.36], [x, 0.67, 2.42], beam).rotation.x = -0.6; }
    }
    if (a.gathered === 'wreath') { const flame = s.material('#ffd27a', { emissive: '#ffb347', emissiveIntensity: 1.6 }); for (let k = 0; k < 4; k++) s.ball([0.045, 0.08, 0.045], [-1.6 + k * 1.05, 0.59, cz + CD / 2 + 1.7], flame, 6); }

    const energy = mix(0.4, 2.2, mood.energy);
    let shown = -1;
    const running = a.reading === 'counting' || a.reading === 'plus';
    return s.finish({
      update: (_dt, time) => {
        if (lit) {
          const tick = Math.floor(time * energy), half = Math.floor(time * energy * 2);
          const key = running ? half : a.reading === 'holding' ? half : -2;
          if (key !== shown && key !== -2) {
            shown = key;
            draw(running ? Math.max(0, base + (a.reading === 'plus' ? tick : -tick)) : base, a.reading === 'holding' ? true : half % 2 === 0);
            if (a.reading === 'holding') faceMat.emissiveIntensity = power * (half % 2 ? 0.75 : 1);
            map.needsUpdate = true;
          }
        }
        if (cloth) {
          const rest = cloth.userData.rest as THREE.BufferAttribute, live = cloth.geometry.attributes.position as THREE.BufferAttribute;
          const droop = a.flag === 'tattered' ? 0.5 : 0.18;
          for (let i = 0; i < live.count; i++) {
            const x = rest.getX(i);
            live.setZ(i, Math.sin(x * 2.2 - time * 3.5 * energy) * 0.22 * (x / 4.4));
            live.setY(i, rest.getY(i) - (x / 4.4) ** 2 * droop * (1.4 - mood.energy));
          }
          live.needsUpdate = true;
          cloth.geometry.computeVertexNormals();
        }
      },
    });
  },
});
