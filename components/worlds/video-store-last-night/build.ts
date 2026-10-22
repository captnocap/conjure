import * as THREE from 'three';
import { choice, defineWorld, diorama, mix, noul, score } from '@conjure/kit';

type Ctx = CanvasRenderingContext2D;
const HAND = '"Comic Sans MS", "Marker Felt", "Chalkboard SE", "DejaVu Sans", sans-serif';
const BLOCK = 'Impact, "Arial Black", "DejaVu Sans Condensed", sans-serif';
const NAMES = { palace: ['VIDEO', 'PALACE'], movietime: ['MOVIE', 'TIME'], star: ['STAR', 'VIDEO'], flicks: ['FLICKS', 'RENTALS'], reel: ['REEL', 'WORLD'], corner: ['CORNER', 'VIDEO'] } as const;
const BRANDS = { blueyellow: ['#2450a8', '#f6cf2a'], redwhite: ['#c3272b', '#fbf8ee'], purpleteal: ['#5a3a94', '#3fd0c0'], greencream: ['#2f6f4c', '#f1e6c4'], orangebrown: ['#e0701f', '#5a3420'] } as const;
const BANNERS = { everything: 'EVERYTHING MUST GO', lastnight: 'LAST NIGHT', thanks: 'THANK YOU FOR 20 YEARS', seventy: '70% OFF ALL TAPES', fixtures: 'FIXTURES FOR SALE', goodbye: 'GOODBYE + GOOD LUCK' } as const;
const COVERS = ['#22222a', '#8c141c', '#f6d53a', '#3a8fe0', '#ff7fae', '#e8662a', '#b9c0c4', '#34456b', '#3cb563', '#b45ad6', '#f4f1ea', '#1f8f98'];

function paint(w: number, h: number, draw: (c: Ctx) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}
function handLine(c: Ctx, text: string, cx: number, cy: number, maxWidth: number, size: number, random: () => number, wobble = 1) {
  c.font = `bold ${size}px ${HAND}`;
  const total = c.measureText(text).width, squeeze = Math.min(1, maxWidth / total);
  let x = cx - total * squeeze / 2;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const glyph of text) {
    const advance = c.measureText(glyph).width * squeeze;
    c.save(); c.translate(x + advance / 2, cy + (random() - 0.5) * size * 0.14 * wobble); c.rotate((random() - 0.5) * 0.16 * wobble); c.scale(squeeze, 1); c.fillText(glyph, 0, 0); c.restore();
    x += advance;
  }
}

export default defineWorld({
  questions: {
    name: choice('What name is on the window, read backwards from inside?', {
      palace: 'VIDEO PALACE.', movietime: 'MOVIE TIME.', star: 'STAR VIDEO.', flicks: 'FLICKS RENTALS.', reel: 'REEL WORLD.', corner: 'CORNER VIDEO.',
    }),
    brand: choice('What are the shop’s colours?', {
      blueyellow: 'Chain-store blue and yellow.',
      redwhite: 'Red and white.',
      purpleteal: 'Purple and teal, straight from 1994.',
      greencream: 'Dark green and cream, an old independent.',
      orangebrown: 'Orange and brown, unchanged since the 1980s.',
    }),
    carpet: choice('What is the carpet?', {
      confetti: 'Navy with neon squiggles, triangles and dots: arcade carpet.',
      reels: 'Deep red with gold film reels and stars.',
      plain: 'Grey-blue office loop pile with gaffer-taped seams.',
      checker: 'Black and white vinyl checkerboard, scuffed.',
    }),
    emptied: score('How emptied are the wall shelves?', ['Still full', 'Gaps showing', 'Half empty', 'A few stragglers per bay', 'Bare']),
    banner: choice('What does the hand-lettered banner over the window say?', {
      everything: 'EVERYTHING MUST GO.', lastnight: 'LAST NIGHT.', thanks: 'THANK YOU FOR 20 YEARS.', seventy: '70% OFF ALL TAPES.', fixtures: 'FIXTURES FOR SALE.', goodbye: 'GOODBYE + GOOD LUCK.',
    }),
    outside: choice('What is out in the street beyond the glass?', {
      lamps: 'An empty street under sodium lamps, shop windows opposite.',
      rain: 'Rain, wet tarmac, smeared reflections.',
      snow: 'Snow falling through lamplight.',
      car: 'One car idling at the kerb with its headlights on, waiting.',
      sunset: 'The last orange light of the day over the rooftops.',
    }),
    moment: choice('What moment of the last night is it?', {
      trading: 'Still trading: every tube lit, the sale in full swing.',
      packing: 'Closing up: packing boxes stacked about, some tubes already off.',
      after: 'After the last customer: one tube left on, a chair up on the counter.',
      stripped: 'Stripped: shelving bare, a stepladder out, only the shell left.',
    }),
    neon: choice('What is in the door glass?', {
      lit: 'A neon OPEN sign, still glowing.',
      dark: 'The neon OPEN sign switched off, grey tubes.',
      card: 'A hand-turned card: SORRY, WE’RE CLOSED.',
    }),
    tv: noul('Is the corner television still playing a film to nobody?'),
  },

  build(a, context) {
    const { mood, random } = context;
    const dusk = new THREE.Color('#9d9db4').lerp(new THREE.Color('#c9b8a6'), mood.warmth * 0.5).lerp(new THREE.Color('#c8ccd6'), (1 - Math.abs(mood.daylight - 0.5) * 2) * 0.3);
    const { art: s, world } = diorama(context, {
      background: `#${dusk.getHexString()}`, floor: '#ffffff', width: 10, depth: 8.5, yaw: 31, pitch: 27, maxHeight: 2.6, radius: 1.25,
      slots: [[-0.6, 0.5], [-2.7, -2.0], [1.5, -2.1], [-2.7, 2.4], [1.4, 2.8], [4.15, 2.7, 1.05, 0.42]],
    });
    const [brand, second] = BRANDS[a.brand];
    const stripped = a.moment === 'stripped';
    const emptied = stripped ? 1 : a.emptied;

    // Carpet, painted straight onto the stage floor.
    const carpet = paint(512, 512, (c) => {
      if (a.carpet === 'confetti') {
        c.fillStyle = '#272a55'; c.fillRect(0, 0, 512, 512);
        const neon = ['#ff4fa3', '#3fe0d0', '#f9f02a', '#8a5cff', '#ff8a2a'];
        for (let i = 0; i < 60; i++) {
          const x = random() * 512, y = random() * 512, hue = neon[i % 5];
          c.save(); c.translate(x, y); c.rotate(random() * 6); c.strokeStyle = c.fillStyle = hue; c.lineWidth = 5;
          const kind = i % 4;
          if (kind === 0) { c.beginPath(); c.moveTo(-22, 0); c.bezierCurveTo(-10, -18, 0, 18, 22, 0); c.stroke(); }
          else if (kind === 1) { c.beginPath(); c.moveTo(0, -13); c.lineTo(12, 9); c.lineTo(-12, 9); c.closePath(); c.fill(); }
          else if (kind === 2) { c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); }
          else { c.beginPath(); c.moveTo(-14, -6); c.lineTo(-4, 6); c.lineTo(4, -6); c.lineTo(14, 6); c.stroke(); }
          c.restore();
        }
      } else if (a.carpet === 'reels') {
        c.fillStyle = '#7d1f26'; c.fillRect(0, 0, 512, 512);
        for (let gx = 0; gx < 4; gx++) for (let gy = 0; gy < 4; gy++) {
          const x = gx * 128 + (gy % 2 ? 64 : 0) + 32, y = gy * 128 + 64;
          c.strokeStyle = c.fillStyle = '#d9a83a'; c.lineWidth = 6;
          if ((gx + gy) % 2) { c.beginPath(); c.arc(x, y, 30, 0, 7); c.stroke(); for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.257) * 16, y + Math.sin(k * 1.257) * 16, 6, 0, 7); c.fill(); } }
          else { c.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 11 : 26, t = k / 10 * Math.PI * 2 - Math.PI / 2; c.lineTo(x + Math.cos(t) * r, y + Math.sin(t) * r); } c.fill(); }
        }
      } else if (a.carpet === 'plain') {
        c.fillStyle = '#6f7c90'; c.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${random() < 0.5 ? '40,50,70' : '170,180,200'},0.12)`; c.fillRect(random() * 512, random() * 512, 3, 3); }
        c.fillStyle = '#3a3d42'; c.fillRect(0, 250, 512, 12); c.fillRect(250, 0, 12, 512);
      } else {
        for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#e9e6dc' : '#2a2c30'; c.fillRect(x * 128, y * 128, 128, 128); }
      }
      c.fillStyle = `rgba(120,105,85,${0.08 + mood.wear * 0.3})`; c.fillRect(0, 0, 512, 512);
    }, a.carpet === 'checker' ? [5, 4.25] : [3.4, 2.9]);
    const floor = world.ground as THREE.Mesh;
    (floor.material as THREE.MeshStandardMaterial).map = carpet;
    (floor.material as THREE.MeshStandardMaterial).color.set('#ffffff');
    // The path worn from door to counter.
    const track = s.mesh(new THREE.PlaneGeometry(1.4, 6), new THREE.MeshStandardMaterial({ color: '#cfc6b2', transparent: true, opacity: 0.1 + mood.wear * 0.3, depthWrite: false }), [2.85, 0.012, -1.0]);
    track.rotation.x = -Math.PI / 2; track.castShadow = false;

    const wallTone = new THREE.Color('#ddd0b2').lerp(new THREE.Color(second), 0.12);
    const wall = s.material(wallTone), trim = s.material(brand), alu = s.material('#b3b8ba', { metalness: 0.6, roughness: 0.4 });
    const dark = s.material('#1c1d20'), card = s.material('#b58d5a', { roughness: 0.95 });
    const HT = 3.8, BZ = -4.25, LX = -5;
    // Left wall, with a brand stripe.
    s.box([0.2, HT, 8.5], [LX - 0.1, HT / 2, 0], wall);
    s.box([0.03, 0.14, 8.5], [LX + 0.015, 0.07, 0], s.material('#6f6a5f'));
    s.box([0.03, 0.22, 8.5], [LX + 0.015, 3.62, 0], trim);
    // Back wall: the shopfront. Solid piers and header around the window and door.
    const winL = -4.4, winR = 1.4, winB = 0.75, winT = 2.85, doorL = 2.1, doorR = 3.7, doorT = 2.45;
    s.box([10, HT - winT, 0.2], [0, (HT + winT) / 2, BZ - 0.1], wall);
    s.box([winR - winL, winB, 0.2], [(winL + winR) / 2, winB / 2, BZ - 0.1], wall);
    s.box([winL - LX, winT, 0.2], [(winL + LX) / 2, winT / 2, BZ - 0.1], wall);
    s.box([doorL - winR, winT, 0.2], [(doorL + winR) / 2, winT / 2, BZ - 0.1], wall);
    s.box([5 - doorR, winT, 0.2], [(5 + doorR) / 2, winT / 2, BZ - 0.1], wall);
    s.box([doorR - doorL, winT - doorT, 0.2], [(doorL + doorR) / 2, (winT + doorT) / 2, BZ - 0.1], wall);
    s.box([10, 0.22, 0.03], [0, 3.62, BZ + 0.015], trim);
    s.box([winR - winL + 0.1, 0.06, 0.3], [(winL + winR) / 2, winB, BZ - 0.02], alu);

    // The street, painted on the glass and glowing, with the shop name in reverse.
    const sky = { lamps: ['#1f2946', '#3f4a74'], rain: ['#1e2a40', '#3d4e66'], snow: ['#343e66', '#66709a'], car: ['#1c2646', '#3c4772'], sunset: ['#3a3460', '#e07a3a'] }[a.outside];
    const street = (c: Ctx, w: number, h: number, lettering: boolean) => {
      const g = c.createLinearGradient(0, 0, 0, h * 0.62);
      g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      // The terrace opposite.
      let x = -20;
      while (x < w) {
        const bw = 90 + random() * 120, bh = h * (0.3 + random() * 0.2);
        c.fillStyle = a.outside === 'sunset' ? '#2f2a44' : '#232a42'; c.fillRect(x, h * 0.62 - bh, bw, bh);
        for (let wx = x + 14; wx < x + bw - 20; wx += 30) for (let wy = h * 0.62 - bh + 14; wy < h * 0.5; wy += 34)
          if (random() < 0.35) { c.fillStyle = random() < 0.7 ? '#ffd98a' : '#9fd8ff'; c.fillRect(wx, wy, 14, 18); }
        c.fillStyle = random() < 0.5 ? 'rgba(255,220,150,0.5)' : 'rgba(120,200,255,0.35)'; c.fillRect(x + 10, h * 0.62 - 44, bw - 20, 36);
        x += bw + 4;
      }
      const road = c.createLinearGradient(0, h * 0.62, 0, h);
      road.addColorStop(0, '#39405a'); road.addColorStop(1, '#565c74');
      c.fillStyle = road; c.fillRect(0, h * 0.62, w, h * 0.38);
      c.fillStyle = '#7b8098'; c.fillRect(0, h * 0.86, w, h * 0.14);
      const lampAt = [w * 0.22, w * 0.74];
      for (const lx of lampAt) {
        const halo = c.createRadialGradient(lx, h * 0.2, 4, lx, h * 0.2, h * 0.5);
        halo.addColorStop(0, 'rgba(255,214,140,0.95)'); halo.addColorStop(0.25, 'rgba(255,190,110,0.35)'); halo.addColorStop(1, 'rgba(255,190,110,0)');
        c.fillStyle = halo; c.fillRect(lx - h * 0.5, 0, h, h);
        c.fillStyle = '#161a2a'; c.fillRect(lx - 4, h * 0.2, 8, h * 0.66); c.fillRect(lx - 30, h * 0.18, 34, 8);
        c.fillStyle = 'rgba(255,200,120,0.25)'; c.beginPath(); c.ellipse(lx, h * 0.8, 110, 26, 0, 0, 7); c.fill();
      }
      if (a.outside === 'car') {
        const cx = w * 0.48, cy = h * 0.74;
        c.fillStyle = '#1a1d2c'; c.beginPath(); c.roundRect(cx - 130, cy - 30, 260, 50, 14); c.fill(); c.beginPath(); c.roundRect(cx - 80, cy - 68, 150, 46, 16); c.fill();
        c.fillStyle = '#5f6a8c'; c.fillRect(cx - 66, cy - 60, 56, 30); c.fillRect(cx, cy - 60, 56, 30);
        c.fillStyle = '#0c0d14'; c.beginPath(); c.arc(cx - 80, cy + 22, 22, 0, 7); c.arc(cx + 82, cy + 22, 22, 0, 7); c.fill();
        const beam = c.createRadialGradient(cx - 134, cy - 6, 2, cx - 134, cy - 6, 150);
        beam.addColorStop(0, 'rgba(255,250,220,1)'); beam.addColorStop(0.2, 'rgba(255,244,200,0.5)'); beam.addColorStop(1, 'rgba(255,244,200,0)');
        c.fillStyle = beam; c.fillRect(cx - 300, cy - 160, 320, 320);
        c.fillStyle = '#ff3b30'; c.fillRect(cx + 122, cy - 16, 10, 12);
      }
      if (a.outside === 'rain') {
        c.strokeStyle = 'rgba(200,215,235,0.4)'; c.lineWidth = 2;
        for (let i = 0; i < 260; i++) { const rx = random() * w, ry = random() * h; c.beginPath(); c.moveTo(rx, ry); c.lineTo(rx - 8, ry + 30); c.stroke(); }
        for (const lx of lampAt) { c.fillStyle = 'rgba(255,200,120,0.3)'; c.fillRect(lx - 14, h * 0.64, 28, h * 0.36); }
      }
      if (a.outside === 'snow') {
        c.fillStyle = '#d9deea'; c.fillRect(0, h * 0.84, w, h * 0.16);
        for (let i = 0; i < 320; i++) { c.fillStyle = `rgba(255,255,255,${0.5 + random() * 0.5})`; c.beginPath(); c.arc(random() * w, random() * h, 1.5 + random() * 3, 0, 7); c.fill(); }
      }
      if (lettering) {
        const [l1, l2] = NAMES[a.name];
        c.save(); c.translate(w, 0); c.scale(-1, 1);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
        const arc = (text: string, y: number, size: number, fill: string) => {
          c.font = `bold ${size}px ${BLOCK}`; c.lineWidth = size * 0.12; c.strokeStyle = 'rgba(255,255,255,0.92)'; c.fillStyle = fill;
          c.strokeText(text, w / 2, y, w * 0.8); c.fillText(text, w / 2, y, w * 0.8);
        };
        arc(l1, h * 0.27, h * 0.3, brand); arc(l2, h * 0.56, h * 0.26, second === '#fbf8ee' || second === '#f1e6c4' ? brand : second);
        c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = `bold ${h * 0.07}px ${BLOCK}`; c.fillText('NEW RELEASES  *  2 FOR 1 TUESDAYS  *  GAMES', w / 2, h * 0.78, w * 0.9);
        c.fillStyle = brand; c.fillRect(w * 0.04, h * 0.9, w * 0.92, h * 0.035);
        c.restore();
        // Sale posters taped inside the glass.
        for (let i = 0; i < 3; i++) {
          c.save(); c.translate(w * (0.08 + i * 0.42) + random() * 30, h * (0.64 + random() * 0.1)); c.rotate((random() - 0.5) * 0.14);
          c.fillStyle = ['#f9f02a', '#ff5fb0', '#fbfaf2'][i]; c.fillRect(-52, -40, 104, 80);
          c.fillStyle = '#c3221c'; handLine(c, ['SALE', '$1', 'ALL GO'][i], 0, 0, 90, 40, random);
          c.restore();
        }
      }
    };
    const glow = mix(0.75, 1.0, 1 - mood.wear * 0.3);
    const windowMap = paint(1024, 284, (c) => street(c, 1024, 284, true));
    const pane = s.mesh(new THREE.PlaneGeometry(winR - winL, winT - winB), new THREE.MeshStandardMaterial({ color: '#5a5a5a', map: windowMap, emissive: '#ffffff', emissiveMap: windowMap, emissiveIntensity: glow * 0.72, roughness: 0.2 }), [(winL + winR) / 2, (winB + winT) / 2, BZ - 0.03]);
    pane.castShadow = false;
    for (const x of [winL, -2.45, -0.5, winR]) s.box([0.07, winT - winB, 0.08], [x, (winB + winT) / 2, BZ - 0.02], alu);
    s.box([winR - winL, 0.07, 0.08], [(winL + winR) / 2, winT, BZ - 0.02], alu);
    const doorMap = paint(256, 392, (c) => street(c, 256, 392, false));
    const doorPane = s.mesh(new THREE.PlaneGeometry(doorR - doorL - 0.2, doorT - 0.3), new THREE.MeshStandardMaterial({ color: '#5a5a5a', map: doorMap, emissive: '#ffffff', emissiveMap: doorMap, emissiveIntensity: glow * 0.72, roughness: 0.2 }), [(doorL + doorR) / 2, doorT / 2 + 0.1, BZ - 0.03]);
    doorPane.castShadow = false;
    for (const x of [doorL + 0.05, doorR - 0.05]) s.box([0.1, doorT, 0.08], [x, doorT / 2, BZ - 0.02], alu);
    s.box([doorR - doorL, 0.1, 0.08], [(doorL + doorR) / 2, doorT - 0.05, BZ - 0.02], alu);
    s.box([doorR - doorL, 0.26, 0.08], [(doorL + doorR) / 2, 0.13, BZ - 0.02], alu);
    s.rod([doorL + 0.2, 1.05, BZ + 0.06], [doorR - 0.2, 1.05, BZ + 0.06], 0.025, alu);
    s.box([1.3, 0.02, 0.8], [(doorL + doorR) / 2, 0.012, BZ + 0.55], s.material('#4a3a2c', { roughness: 1 }));
    s.label('2 FOR 1', 0.5, 0.2, [(winR + doorL) / 2, 1.9, BZ + 0.012], '#16171a', '#f9f02a').rotation.z = (random() - 0.5) * 0.2;
    s.label('NO REFUNDS', 0.5, 0.16, [(winR + doorL) / 2, 1.55, BZ + 0.012], '#c3221c', '#fbfaf2').rotation.z = (random() - 0.5) * 0.2;
    const flickerers: { material: THREE.MeshStandardMaterial; base: number; phase: number; amount: number }[] = [];
    if (a.neon === 'card') {
      const closed = s.label("SORRY WE'RE CLOSED", 0.7, 0.3, [(doorL + doorR) / 2, 1.7, BZ + 0.03], '#ffffff', '#c3272b');
      closed.rotation.z = (random() - 0.5) * 0.15;
    } else {
      const lit = a.neon === 'lit';
      const neonMap = paint(256, 128, (c) => {
        c.fillStyle = '#14151a'; c.fillRect(0, 0, 256, 128);
        c.lineWidth = 9; c.lineJoin = 'round'; c.strokeStyle = lit ? '#4fc8ff' : '#6b7078'; c.strokeRect(14, 14, 228, 100);
        c.font = `bold 74px ${BLOCK}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = lit ? '#ff4a4a' : '#7d8188';
        c.strokeText('OPEN', 128, 68, 200);
      });
      const material = new THREE.MeshStandardMaterial({ map: neonMap, emissive: '#ffffff', emissiveMap: neonMap, emissiveIntensity: lit ? 1.6 : 0.05 });
      s.mesh(new THREE.PlaneGeometry(0.8, 0.4), material, [(doorL + doorR) / 2, 1.75, BZ + 0.03]).castShadow = false;
      if (lit) flickerers.push({ material, base: 1.6, phase: random() * 6, amount: 0.25 });
    }

    // Banner over the window, on butcher paper.
    const bannerMap = paint(1024, 150, (c) => {
      c.fillStyle = '#f6efd8'; c.fillRect(0, 0, 1024, 150);
      c.fillStyle = ['#c3221c', '#16171a', '#1b2a6b'][Math.floor(random() * 3)];
      handLine(c, BANNERS[a.banner], 512, 78, 960, 104, random);
      c.strokeStyle = '#c3221c'; c.lineWidth = 8; c.beginPath(); c.moveTo(40, 138); c.lineTo(984, 132); c.stroke();
      c.fillStyle = `rgba(150,120,70,${mood.wear * 0.3})`; c.fillRect(0, 0, 1024, 150);
    });
    const banner = s.mesh(new THREE.PlaneGeometry(5.6, 0.82), new THREE.MeshStandardMaterial({ map: bannerMap, roughness: 0.9 }), [(winL + winR) / 2, 3.02 + 0.02, BZ + 0.04]);
    banner.position.y = 3.3; banner.rotation.z = (random() - 0.5) * 0.02;
    // A second sign swinging from the ceiling grid.
    const swing = new THREE.Group();
    swing.position.set(-0.4, 3.78, -1.6);
    s.root.add(swing);
    const swingText = a.banner === 'everything' ? 'ALL TAPES $2' : 'EVERYTHING MUST GO';
    const swingMap = paint(512, 190, (c) => { c.fillStyle = ['#f9f02a', '#ff8ac2', '#a6f23a'][Math.floor(random() * 3)]; c.fillRect(0, 0, 512, 190); c.fillStyle = '#16171a'; const words = swingText.split(' '); const half = Math.ceil(words.length / 2); handLine(c, words.slice(0, half).join(' '), 256, 58, 470, 78, random); handLine(c, words.slice(half).join(' '), 256, 136, 470, 78, random); });
    const board = s.mesh(new THREE.PlaneGeometry(1.7, 0.63), new THREE.MeshStandardMaterial({ map: swingMap, roughness: 0.9, side: THREE.DoubleSide }), [0, -0.62, 0]);
    swing.add(board);
    for (const x of [-0.7, 0.7]) swing.add(s.rod([x, 0, 0], [x, -0.32, 0], 0.004, dark));

    // Wall shelving down the left side: four genre bays, picked over.
    const bays = ['HORROR', 'COMEDY', 'ACTION', 'DRAMA'];
    const bayW = 1.88, shelfX = LX + 0.02;
    const cases: { m: THREE.Matrix4; color: THREE.Color }[] = [];
    const grey = new THREE.Color('#8f8a80');
    bays.forEach((genre, bay) => {
      const z0 = -3.95 + bay * (bayW + 0.08);
      s.box([0.36, 0.28, bayW], [shelfX + 0.18, 0.14, z0 + bayW / 2], s.material('#c9c7c0'));
      const slope = s.box([0.03, 2.0, bayW], [shelfX + 0.2, 1.25, z0 + bayW / 2], s.material('#d8d5cc'));
      slope.rotation.z = 0.12;
      for (const z of [z0, z0 + bayW]) s.box([0.38, 2.5, 0.03], [shelfX + 0.19, 1.25, z], s.material('#a9a79f'));
      const head = s.label(genre, bayW * 0.9, 0.24, [shelfX + 0.14, 2.42, z0 + bayW / 2], '#ffffff', brand);
      head.rotation.y = Math.PI / 2;
      if (random() < emptied * 0.5) { head.rotation.x = (random() - 0.5) * 0.5; head.position.y -= 0.06; }
      const keepBay = Math.max(0, 1 - emptied * (0.85 + random() * 0.3));
      for (let tier = 0; tier < 5; tier++) {
        const y = 0.36 + tier * 0.4, x = shelfX + 0.34 - tier * 0.045;
        s.box([0.1, 0.02, bayW - 0.04], [x, y - 0.01, z0 + bayW / 2], s.material('#eeeae0'));
        const rowKeep = keepBay * [1.5, 1.0, 0.7, 0.8, 1.0][tier];
        let gone = false;
        for (let z = z0 + 0.09; z < z0 + bayW - 0.09; z += 0.132) {
          const here = random() < rowKeep;
          if (here) {
            const tilt = gone && random() < 0.35 ? (random() - 0.5) * 1.0 : 0;
            cases.push({
              m: new THREE.Matrix4().makeTranslation(x - 0.012, y, z).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)).multiply(new THREE.Matrix4().makeRotationX(-0.14)).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeTranslation(0, 0.1, 0.014)).multiply(new THREE.Matrix4().makeScale(0.11, 0.19, 0.027)),
              color: new THREE.Color(COVERS[Math.floor(random() * COVERS.length)]).lerp(grey, (1 - mood.cheer) * 0.25),
            });
          }
          gone = !here;
        }
      }
    });
    const dropped = stripped ? 0 : Math.round(emptied * 8 * mix(0.5, 1.3, mood.density));
    for (let i = 0; i < dropped; i++) cases.push({
      m: new THREE.Matrix4().makeTranslation(LX + 0.6 + random() * 0.9, 0.016, -3.6 + random() * 7).multiply(new THREE.Matrix4().makeRotationY(random() * 6)).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(0.11, 0.19, 0.027)),
      color: new THREE.Color(COVERS[Math.floor(random() * COVERS.length)]),
    });
    if (cases.length) {
      const coverMap = paint(128, 224, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 128, 224);
        c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, 0, 128, 54); c.fillRect(0, 196, 128, 28);
        c.fillStyle = '#fff'; c.fillRect(14, 14, 100, 14);
        c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(64, 124, 46, 0, 7); c.fill();
      });
      const side = new THREE.MeshStandardMaterial({ color: '#e9e6de', roughness: 0.6 });
      const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), [side, side, side, side, new THREE.MeshStandardMaterial({ map: coverMap, roughness: 0.45 }), side], cases.length);
      cases.forEach((item, i) => { mesh.setMatrixAt(i, item.m); mesh.setColorAt(i, item.color); });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    }
    // Posters above the shelving, and the pale patches where others hung.
    for (let i = 0; i < 6; i++) {
      const gone = random() < 0.25 + emptied * 0.45;
      const poster = s.box([0.012, 0.62, 0.44], [LX + 0.008, 3.05, -3.4 + i * 1.32 + (random() - 0.5) * 0.2], gone ? s.material(wallTone.clone().lerp(new THREE.Color('#ffffff'), 0.45)) : s.material(COVERS[Math.floor(random() * COVERS.length)]));
      poster.position.y = 3.05; poster.rotation.x = (random() - 0.5) * 0.06;
      if (!gone) s.box([0.014, 0.12, 0.36], [LX + 0.01, 2.85, poster.position.z], s.material('#f4f1ea'));
    }

    // Counter along the cut-away side, seen from the clerk's side.
    const laminate = s.material('#d9d2bf');
    s.box([0.75, 1.0, 4.4], [4.2, 0.5, 1.7], laminate);
    s.box([0.03, 0.3, 4.4], [3.815, 0.78, 1.7], trim);
    s.box([0.9, 0.05, 4.5], [4.2, 1.025, 1.7], s.material('#4a4037'));
    s.box([0.02, 0.6, 3.9], [4.58, 0.5, 1.7], dark);
    for (let i = 0; i < 9; i++) if (random() > emptied * 0.7) s.box([0.2, 0.03 + random() * 0.09, 0.12], [4.51, 0.3 + (i % 2) * 0.3, 0.1 + i * 0.4], s.material(COVERS[Math.floor(random() * COVERS.length)]));
    // Till and its little screen.
    s.box([0.42, 0.14, 0.4], [4.15, 1.12, 0.35], s.material('#cfc9b8'));
    s.box([0.3, 0.26, 0.05], [4.15, 1.33, 0.2], s.material('#bdb7a6'));
    const till = new THREE.MeshStandardMaterial({ color: '#0f2a1a', emissive: '#49e07a', emissiveIntensity: a.moment === 'stripped' ? 0 : 0.9 });
    s.box([0.24, 0.18, 0.01], [4.15, 1.34, 0.23], till);
    s.box([0.3, 0.02, 0.3], [4.15, 1.06, -0.25], s.material('#f4f1ea'));
    if (a.moment === 'after') {
      const chair = s.material('#3a3d42', { metalness: 0.4 });
      s.box([0.42, 0.04, 0.42], [4.15, 1.08, 1.45], chair);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.rod([4.15 + x * 0.18, 1.08, 1.45 + z * 0.18], [4.15 + x * 0.2, 1.55, 1.45 + z * 0.2], 0.014, chair);
      s.box([0.42, 0.4, 0.04], [4.15, 0.86, 1.25], chair).position.set(3.77, 1.25, 1.45);
    }

    // Boxes, a ladder: what the moment has brought out.
    const boxAt = (x: number, z: number, w: number, h: number, y = 0) => {
      const box = s.box([w, h, w * 0.8], [x, y + h / 2, z], card);
      box.rotation.y = (random() - 0.5) * 0.5;
      s.box([w * 0.98, 0.006, 0.07], [x, y + h + 0.004, z], s.material('#d9c79a', { roughness: 0.4 })).rotation.y = box.rotation.y;
    };
    if (a.moment === 'packing' || stripped) {
      const count = 4 + Math.round(mood.density * 5);
      for (let i = 0; i < count; i++) {
        const againstWindow = i % 2 === 0;
        const x = againstWindow ? winL + 0.6 + random() * 5.6 : 2.9 + random() * 0.6, z = againstWindow ? BZ + 0.5 + random() * 0.25 : -3.4 + random() * 2.2;
        const h = 0.34 + random() * 0.14;
        boxAt(x, z, 0.5 + random() * 0.14, h);
        if (random() < 0.45) boxAt(x + (random() - 0.5) * 0.1, z, 0.44, 0.3, h + 0.01);
      }
    }
    if (stripped) {
      const rail = s.material('#d9a441', { metalness: 0.3 });
      for (const side of [-1, 1]) { s.rod([-3.9 + side * 0.28, 0, -3.0], [-3.9 + side * 0.2, 2.0, -3.45], 0.02, rail); s.rod([-3.9 + side * 0.3, 0, -3.95], [-3.9 + side * 0.2, 2.0, -3.45], 0.02, rail); }
      for (let i = 1; i < 6; i++) s.box([0.46, 0.03, 0.12], [-3.9, i * 0.33, -3.0 - i * 0.075], rail);
    }
    if (a.moment === 'trading' && mood.cheer > 0.45) {
      const hues = ['#e8382f', '#f6c829', '#2f7fe0', '#3cb563', '#ff8a2a'];
      for (let i = 0; i < 14; i++) {
        const t = i / 13, x = mix(winL, winR, t), sag = Math.sin(t * Math.PI) * 0.22;
        const flag = s.mesh(new THREE.ConeGeometry(0.11, 0.24, 3), s.material(hues[i % 5], { side: THREE.DoubleSide }), [x, 2.66 - sag, BZ + 0.12]);
        flag.rotation.x = Math.PI; flag.scale.z = 0.08;
      }
    }

    // Ceiling tubes on drop rods; how many still burn depends on the hour.
    const tubeColour = new THREE.Color().setHSL(mix(0.16, 0.09, mood.warmth), 0.75, 0.82);
    const lit = { trading: [1, 1, 1], packing: [1, 0, 1], after: [0, 1, 0], stripped: [1, 0, 0] }[a.moment];
    [-2.9, 0.3, 3.3].forEach((x, index) => {
      const z = index === 1 ? 1.4 : -0.6;
      s.box([0.22, 0.07, 2.6], [x, HT + 0.02, z], s.material('#e4e1d8'));
      const on = lit[index] === 1;
      const material = new THREE.MeshStandardMaterial({ color: on ? tubeColour : new THREE.Color('#b9bcc0'), emissive: tubeColour, emissiveIntensity: on ? 1.5 : 0.04 });
      for (const off of [-0.055, 0.055]) { const tube = s.cylinder(0.022, 0.022, 2.5, [x + off, HT - 0.03, z], material, 8); tube.rotation.x = Math.PI / 2; tube.castShadow = false; }
      if (on) flickerers.push({ material, base: 1.5, phase: random() * 6, amount: index === 0 && a.moment !== 'trading' ? 0.9 : 0.12 });
    });
    const lamp = new THREE.PointLight(tubeColour, mix(14, 30, lit.reduce((sum: number, v) => sum + v, 0) / 3), 16, 1.6);
    lamp.position.set(0, 3.2, 0);
    s.root.add(lamp);
    const spill = new THREE.PointLight(a.outside === 'sunset' ? '#ffb070' : '#8fa8ff', 10, 9, 1.5);
    spill.position.set(-1.5, 1.8, BZ + 1.2);
    s.root.add(spill);

    // Corner television on a wall bracket.
    s.box([0.7, 0.56, 0.6], [LX + 0.55, 3.2, BZ + 0.55], s.material('#2b2c30')).rotation.y = Math.PI / 4;
    s.rod([LX + 0.1, 3.55, BZ + 0.1], [LX + 0.5, 3.45, BZ + 0.5], 0.03, dark);
    const screenMap = paint(128, 96, (c) => {
      if (!a.tv) { c.fillStyle = '#1b2224'; c.fillRect(0, 0, 128, 96); return; }
      const g = c.createLinearGradient(0, 0, 0, 96); g.addColorStop(0, '#5a8fd8'); g.addColorStop(1, '#e8a060');
      c.fillStyle = g; c.fillRect(0, 0, 128, 96);
      c.fillStyle = '#1b1b2a'; c.beginPath(); c.arc(50, 52, 16, 0, 7); c.fill(); c.fillRect(30, 66, 40, 30); c.beginPath(); c.arc(86, 58, 13, 0, 7); c.fill(); c.fillRect(70, 70, 34, 26);
      c.fillStyle = 'rgba(255,255,255,0.15)'; for (let y = 0; y < 96; y += 4) c.fillRect(0, y, 128, 1);
    });
    const screen = new THREE.MeshStandardMaterial({ map: screenMap, emissive: '#ffffff', emissiveMap: screenMap, emissiveIntensity: a.tv ? 1.2 : 0.05 });
    const glass = s.mesh(new THREE.PlaneGeometry(0.54, 0.42), screen, [LX + 0.77, 3.2, BZ + 0.77]);
    glass.rotation.y = Math.PI / 4; glass.castShadow = false;
    if (a.tv) flickerers.push({ material: screen, base: 1.2, phase: random() * 6, amount: 0.35 });

    const speed = mix(2, 14, mood.energy), depth = mix(0.3, 1, mood.energy);
    const sway = mix(0.01, 0.07, mood.energy);
    return {
      ...world,
      update(_dt: number, time: number) {
        for (const f of flickerers) {
          const wave = Math.sin(time * speed + f.phase) * Math.sin(time * speed * 0.37 + f.phase * 2);
          f.material.emissiveIntensity = f.base * (1 - f.amount * depth * Math.max(0, wave));
        }
        swing.rotation.x = Math.sin(time * 0.9) * sway;
      },
    };
  },
});
