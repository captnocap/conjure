import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

const DYES = {
  green: 'Manic toxic green, the colour of a highlighter.',
  blue: 'Electric atomic blue.',
  pink: 'Hot flamingo pink.',
  bleach: 'Bleach: a pale yellow-white paste and brassy straw-yellow drips.',
  black: 'Blue-black, inky, staining everything it touches grey.',
  split: 'A split job: two clashing colours, one down each side of the basin.',
} as const;
const HEX: Record<keyof typeof DYES, [string, string]> = {
  green: ['#3fe01c', '#9df02a'],
  blue: ['#1d4dff', '#27b6ff'],
  pink: ['#ff2a9a', '#ff7ac4'],
  bleach: ['#f1e27a', '#fbf4c8'],
  black: ['#16131c', '#3a3550'],
  split: ['#ff2a9a', '#3fe01c'],
};

function paint(width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    dye: choice('What colour is the dye?', DYES),
    stage: choice('How far has the dye job got?', {
      unopened: 'Not started: the box still sealed and standing, gloves folded, only old stains in the basin.',
      mixing: 'Being mixed: box torn open, bottle out, the bowl full of fresh colour with a brush in it.',
      rinsing: 'Mid-rinse: the basin swimming with coloured water and running streaks.',
      finished: 'Done and abandoned: an empty crushed box, dregs in the bowl, stains left to set.',
      disaster: 'Gone wrong: a bottle knocked over, dye down the front, handprints up the wall and a puddle on the floor.',
    }),
    tap: choice('What is the tap doing?', {
      off: 'Shut off and dry.',
      dripping: 'A slow drip nobody can stop.',
      running: 'Left running in a steady stream.',
      blasting: 'On full, splashing over the rim.',
    }),
    plughole: choice('What is in the plughole?', {
      clear: 'Nothing, just the chrome ring.',
      hair: 'A wet clump of cut hair.',
      blocked: 'Blocked solid, so the basin has filled to the brim.',
      butts: 'Cigarette ends and a bottle cap.',
      earring: 'A lost hoop earring caught on the grate.',
    }),
    taps: choice('What kind of taps does it have?', {
      cross: 'Two old cross-head pillar taps, hot and cold.',
      push: 'One institutional push-button tap.',
      lever: 'A single bent lever mixer.',
    }),
    tiles: choice('What are the wall tiles behind it?', {
      white: 'Plain white squares gone grey in the grout.',
      mint: 'Hospital mint green.',
      checker: 'Black and white checkerboard.',
      pink: 'Dusty 1950s pink.',
      black: 'Gloss black with pale grout.',
    }),
    note: choice('What is on the wall above the basin?', {
      nothing: 'Nothing but tile.',
      sign: 'A taped-up paper sign: NO HAIR DYE IN SINK.',
      heart: 'A big heart finger-painted in dye.',
      number: 'A phone number in marker.',
      slogan: 'A dripping finger-painted NO FUTURE.',
    }),
    towel: noul('Is a ruined towel slung over the corner of the basin?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const [c1, c2] = HEX[a.dye];
    const oldStain = ['#ff2a9a', '#1d4dff', '#3fe01c', '#7a2bd0', '#e04a1a'];
    const amount = { unopened: 0.15, mixing: 0.4, rinsing: 0.9, finished: 0.65, disaster: 1 }[a.stage];
    const fresh = a.stage !== 'unopened';
    const blocked = a.plughole === 'blocked';
    const wet = a.tap === 'running' || a.tap === 'blasting';
    const pick = (x: number) => (a.dye === 'split' ? (x < 0.5 ? c1 : c2) : random() < 0.7 ? c1 : c2);

    const H = 0.86, RX = 0.24, RZ = 0.16, D = 0.17, BZ = 0.03;
    const ceramicTint = new THREE.Color('#f1efe6').lerp(new THREE.Color('#c9c2a8'), mood.wear * 0.6);
    const ceramic = new THREE.MeshStandardMaterial({ color: ceramicTint, roughness: 0.25 + mood.wear * 0.4 });
    const chrome = s.material('#d6dadb', { metalness: 0.9, roughness: 0.22 + mood.wear * 0.3 });
    const dark = s.material('#1b1a1d', { roughness: 0.7 });
    const dye1 = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.3, emissive: c1, emissiveIntensity: mix(0.08, 0.35, mood.cheer) });
    const dye2 = new THREE.MeshStandardMaterial({ color: c2, roughness: 0.3, emissive: c2, emissiveIntensity: mix(0.08, 0.35, mood.cheer) });

    // --- Tiled wall panel with splashes, cracks and whatever is written on it.
    const tileBase = { white: '#e9e7de', mint: '#a9d3bd', checker: '#ecebe4', pink: '#e5b3b6', black: '#26262b' }[a.tiles];
    const wallTexture = paint(512, 768, (g, w, h) => {
      const cols = 10, rows = 15, tw = w / cols, th = h / rows;
      g.fillStyle = a.tiles === 'black' ? '#b9b6a8' : '#8d8a7e';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const tint = new THREE.Color(a.tiles === 'checker' && (i + j) % 2 ? '#222226' : tileBase);
          tint.offsetHSL(0, 0, (random() - 0.5) * 0.06 - mood.wear * 0.05);
          if (random() < mood.wear * 0.12) tint.lerp(new THREE.Color('#7d735c'), 0.5);
          g.fillStyle = `#${tint.getHexString()}`;
          g.fillRect(i * tw + 2, j * th + 2, tw - 4, th - 4);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(i * tw + 4, j * th + 4, tw - 8, 5);
        }
      // Cracks.
      g.strokeStyle = 'rgba(30,26,22,0.8)';
      g.lineWidth = 1.6;
      for (let k = 0; k < Math.round(mood.wear * 9); k++) {
        let x = random() * w, y = random() * h;
        g.beginPath();
        g.moveTo(x, y);
        for (let n = 0; n < 7; n++) { x += (random() - 0.5) * 70; y += random() * 50; g.lineTo(x, y); }
        g.stroke();
      }
      // Grime rising from the floor.
      const grime = g.createLinearGradient(0, h, 0, h * 0.55);
      grime.addColorStop(0, `rgba(60,52,40,${0.25 + mood.wear * 0.5})`);
      grime.addColorStop(1, 'rgba(60,52,40,0)');
      g.fillStyle = grime;
      g.fillRect(0, 0, w, h);
      const sinkY = h * (1 - H / 1.5);
      // Splashes at basin height.
      const splash = (x: number, y: number, r: number, colour: string) => {
        g.fillStyle = colour;
        g.globalAlpha = 0.85;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillRect(x - r * 0.3, y, r * 0.6, r * (2 + random() * 6));
        g.globalAlpha = 1;
      };
      const count = Math.round(amount * 26) + (a.tap === 'blasting' ? 8 : 0);
      for (let k = 0; k < count; k++) {
        const u = 0.14 + random() * 0.72;
        splash(u * w, sinkY - random() * (60 + amount * 190), 3 + random() * (5 + amount * 9), fresh ? pick(u) : oldStain[Math.floor(random() * oldStain.length)]);
      }
      if (a.stage === 'disaster')
        for (const side of [0.2, 0.74]) {
          const x = (side + random() * 0.06) * w, y = sinkY - 150 - random() * 120;
          g.fillStyle = pick(side);
          g.beginPath(); g.ellipse(x, y, 20, 24, 0, 0, 7); g.fill();
          for (let f = 0; f < 5; f++) {
            g.save(); g.translate(x, y); g.rotate((f - 2) * 0.3 + (side < 0.5 ? -0.2 : 0.2));
            g.fillRect(-5, -62 + Math.abs(f - 2) * 7, 10, 42); g.restore();
          }
          g.fillRect(x - 4, y, 7, 110 + random() * 80);
        }
      const top = sinkY - 330;
      if (a.note === 'sign') {
        g.save(); g.translate(w / 2, top + 70); g.rotate(-0.04 + random() * 0.08);
        g.fillStyle = '#f3efdc'; g.fillRect(-135, -62, 270, 124);
        g.fillStyle = 'rgba(190,180,140,0.9)'; g.fillRect(-150, -74, 60, 22); g.fillRect(90, -74, 60, 22);
        g.fillStyle = '#1a1a1a'; g.textAlign = 'center'; g.font = 'bold 40px sans-serif';
        g.fillText('NO HAIR DYE', 0, -10); g.fillText('IN SINK !!', 0, 38);
        g.restore();
      } else if (a.note === 'heart') {
        g.strokeStyle = c1; g.lineWidth = 16; g.lineCap = 'round';
        g.beginPath(); g.moveTo(w / 2, top + 150);
        g.bezierCurveTo(w / 2 - 170, top + 30, w / 2 - 60, top - 50, w / 2, top + 40);
        g.bezierCurveTo(w / 2 + 60, top - 50, w / 2 + 170, top + 30, w / 2, top + 150);
        g.stroke();
        g.fillStyle = c1; g.fillRect(w / 2 - 5, top + 150, 9, 70);
      } else if (a.note === 'number') {
        g.fillStyle = a.tiles === 'black' ? '#f1f1f1' : '#15151a'; g.font = 'bold 44px monospace'; g.textAlign = 'center';
        g.save(); g.translate(w / 2, top + 60); g.rotate(-0.06);
        g.fillText('call me', 0, 0);
        g.fillText(`555-${1000 + Math.floor(random() * 8999)}`, 0, 50);
        g.restore();
      } else if (a.note === 'slogan') {
        g.fillStyle = c1; g.font = 'bold 84px sans-serif'; g.textAlign = 'center';
        g.fillText('NO', w / 2, top + 50); g.fillText('FUTURE', w / 2, top + 130);
        for (let k = 0; k < 9; k++) g.fillRect(90 + random() * 330, top + 120, 6, 30 + random() * 90);
      }
    });
    s.box([1.0, 1.5, 0.06], [0, 0.75, -0.285], s.material('#9b978a'));
    s.mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshStandardMaterial({ map: wallTexture, roughness: 0.4 }), [0, 0.75, -0.2545]);

    // --- Basin: a flat deck with an elliptical hole, a bowl hanging below it.
    const outline = new THREE.Shape();
    const hw = 0.37, back = 0.25, front = -0.25, r = 0.09;
    outline.moveTo(-hw, back);
    outline.lineTo(hw, back);
    outline.lineTo(hw, front + r);
    outline.quadraticCurveTo(hw, front, hw - r, front);
    outline.lineTo(-hw + r, front);
    outline.quadraticCurveTo(-hw, front, -hw, front + r);
    outline.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, -BZ, RX, RZ, 0, Math.PI * 2, true);
    outline.holes.push(hole);
    const deck = s.mesh(new THREE.ExtrudeGeometry(outline, { depth: 0.03, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 3, curveSegments: 40 }), ceramic, [0, H - 0.038, 0]);
    deck.rotation.x = -Math.PI / 2;
    const half = () => new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const outerTexture = paint(512, 128, (g, w, h) => {
      g.fillStyle = `#${ceramicTint.getHexString()}`; g.fillRect(0, 0, w, h);
      for (let k = 0; k < amount * 14; k++) {
        const u = 0.5 + random() * 0.5; // the front half of the bowl
        g.fillStyle = fresh ? pick((u - 0.5) * 2) : oldStain[k % 5];
        g.globalAlpha = 0.8;
        g.fillRect(u * w, 0, 3 + random() * 8, 20 + random() * 100);
      }
    });
    const outer = s.mesh(half(), new THREE.MeshStandardMaterial({ map: outerTexture, roughness: 0.3 + mood.wear * 0.4 }), [0, H - 0.03, BZ]);
    outer.scale.set(RX + 0.03, D + 0.025, RZ + 0.03);
    const innerTexture = paint(512, 256, (g, w, h) => {
      g.fillStyle = `#${ceramicTint.getHexString()}`; g.fillRect(0, 0, w, h);
      // Old rings and stains from other nights.
      for (let k = 0; k < 10 + mood.wear * 20; k++) {
        g.globalAlpha = 0.25;
        g.fillStyle = oldStain[Math.floor(random() * 5)];
        g.fillRect(random() * w, random() * h, 4 + random() * 12, 20 + random() * 90);
      }
      // Sphere u: 0.25 faces +z... split by world side instead of exact angle.
      for (let k = 0; k < 8 + amount * 60; k++) {
        const u = random();
        const side = Math.cos(u * Math.PI * 2) > 0 ? 0.2 : 0.8;
        const x = u * w, width = 4 + random() * (10 + amount * 26), y0 = random() * h * 0.5;
        const streak = g.createLinearGradient(0, y0, 0, h);
        const colour = fresh ? pick(side) : oldStain[Math.floor(random() * 5)];
        streak.addColorStop(0, colour + '00'.slice(0, 0));
        g.globalAlpha = 0.35 + amount * 0.6;
        g.fillStyle = colour;
        g.beginPath();
        g.moveTo(x - width / 2, y0); g.lineTo(x + width / 2, y0);
        g.lineTo(x + width * 0.2 + (random() - 0.5) * 20, h); g.lineTo(x - width * 0.2, h);
        g.fill();
      }
      g.globalAlpha = amount * 0.85;
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = fresh ? (a.dye === 'split' ? (Math.cos((x / w) * Math.PI * 2) > 0 ? c1 : c2) : c1) : '#b9a98a';
        g.fillRect(x, h * (0.78 - random() * 0.12 * amount), 8, h);
      }
      g.globalAlpha = 1;
      g.strokeStyle = 'rgba(40,34,28,0.7)'; g.lineWidth = 1.5;
      for (let k = 0; k < mood.wear * 5; k++) {
        let x = random() * w, y = 0;
        g.beginPath(); g.moveTo(x, y);
        for (let n = 0; n < 6; n++) { x += (random() - 0.5) * 40; y += 20 + random() * 30; g.lineTo(x, y); }
        g.stroke();
      }
    });
    const inner = s.mesh(half(), new THREE.MeshStandardMaterial({ map: innerTexture, roughness: 0.28, side: THREE.BackSide }), [0, H - 0.03, BZ]);
    inner.scale.set(RX + 0.004, D, RZ + 0.004);
    inner.castShadow = false;
    // Rim chips.
    for (let k = 0; k < Math.round(mood.wear * 6); k++) {
      const angle = random() * Math.PI * 2;
      const chip = s.mesh(new THREE.DodecahedronGeometry(0.012 + random() * 0.012, 0), s.material('#6d665a', { roughness: 0.95 }),
        random() < 0.5 ? [Math.cos(angle) * RX, H - 0.004, BZ + Math.sin(angle) * RZ] : [(random() - 0.5) * 0.6, H - 0.01, 0.245]);
      chip.rotation.set(random() * 3, random() * 3, random() * 3);
    }

    // --- Plumbing.
    s.tube([[0, H - D - 0.02, BZ], [0, 0.52, BZ], [0, 0.46, BZ - 0.06], [0, 0.52, BZ - 0.12], [0, 0.575, BZ - 0.15], [0, 0.58, -0.255]], 0.021, chrome);
    s.cylinder(0.034, 0.034, 0.03, [0, 0.52, BZ], chrome, 16);
    s.cylinder(0.045, 0.045, 0.012, [0, 0.58, -0.25], chrome, 16).rotation.x = Math.PI / 2;
    for (const x of [-0.27, 0.27]) {
      s.box([0.03, 0.2, 0.03], [x, H - 0.14, -0.235], chrome);
      s.rod([x, H - 0.045, 0.12], [x, H - 0.23, -0.23], 0.012, chrome);
    }
    const drainY = H - 0.03 - D + 0.006;
    s.cylinder(0.03, 0.03, 0.008, [0, drainY, BZ], chrome, 20);
    s.cylinder(0.02, 0.02, 0.01, [0, drainY + 0.001, BZ], dark, 16);

    // --- Taps.
    const spouts: [number, number, number][] = [];
    const crossTap = (x: number, cap: string) => {
      s.cylinder(0.02, 0.026, 0.07, [x, H + 0.035, -0.19], chrome, 14);
      s.tube([[x, H + 0.06, -0.19], [x, H + 0.085, -0.15], [x, H + 0.07, -0.105], [x, H + 0.05, -0.1]], 0.013, chrome);
      s.cylinder(0.008, 0.008, 0.05, [x, H + 0.09, -0.19], chrome, 8);
      const tilt = random() * Math.PI;
      for (const turn of [0, Math.PI / 2]) {
        const arm = s.cylinder(0.008, 0.008, 0.085, [x, H + 0.115, -0.19], chrome, 8);
        arm.rotation.set(Math.PI / 2, 0, 0); arm.rotation.z = 0; arm.rotation.y = 0;
        arm.rotation.order = 'YXZ'; arm.rotation.y = turn + tilt;
      }
      s.cylinder(0.012, 0.012, 0.008, [x, H + 0.122, -0.19], s.material(cap), 10);
      spouts.push([x, H + 0.05, -0.1]);
    };
    if (a.taps === 'cross') { crossTap(-0.17, '#b3202a'); crossTap(0.17, '#2456b8'); }
    else if (a.taps === 'push') {
      s.cylinder(0.024, 0.03, 0.09, [0, H + 0.045, -0.19], chrome, 16);
      s.cylinder(0.03, 0.03, 0.025, [0, H + 0.1, -0.19], chrome, 16);
      s.tube([[0, H + 0.07, -0.19], [0, H + 0.075, -0.12], [0, H + 0.055, -0.085]], 0.014, chrome);
      spouts.push([0, H + 0.05, -0.085]);
    } else {
      s.cylinder(0.024, 0.03, 0.06, [0, H + 0.03, -0.19], chrome, 16);
      s.tube([[0, H + 0.05, -0.19], [0, H + 0.2, -0.17], [0, H + 0.22, -0.09], [0, H + 0.15, -0.06]], 0.013, chrome);
      s.rod([0, H + 0.06, -0.19], [0.1, H + 0.1 + random() * 0.04, -0.15], 0.009, chrome);
      spouts.push([0, H + 0.15, -0.06]);
    }
    const spout = spouts[spouts.length - 1];

    // --- Water in the basin, the stream, and anything going over the edge.
    const level = blocked ? 0.022 : a.stage === 'rinsing' ? 0.085 : a.tap === 'blasting' ? 0.11 : 0;
    const waterColour = new THREE.Color(fresh ? c1 : '#9fb6b4').lerp(new THREE.Color('#bcd8dc'), fresh ? 0.25 : 0.4);
    const waterMaterial = new THREE.MeshStandardMaterial({ color: waterColour, roughness: 0.08, transparent: true, opacity: 0.86, emissive: waterColour, emissiveIntensity: 0.12 });
    let water: THREE.Mesh | null = null;
    if (level > 0) {
      const k = Math.sqrt(1 - (level / D) ** 2);
      water = s.cylinder(1, 1, 0.004, [0, H - 0.03 - level, BZ], waterMaterial, 40);
      water.scale.set(RX * k, 1, RZ * k);
      water.castShadow = false;
      if (a.dye === 'split') {
        const swirl = s.cylinder(1, 1, 0.005, [RX * k * 0.4, H - 0.029 - level, BZ], new THREE.MeshStandardMaterial({ color: c2, roughness: 0.1, transparent: true, opacity: 0.8 }), 24);
        swirl.scale.set(RX * k * 0.5, 1, RZ * k * 0.7);
      }
    }
    const streamMaterial = new THREE.MeshStandardMaterial({ color: '#cfe9f2', roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false });
    const streams: THREE.Mesh[] = [];
    const drops: THREE.Mesh[] = [];
    const floorOf = (z: number) => H - 0.03 - Math.max(level, D * Math.sqrt(Math.max(0, 1 - ((z - BZ) / RZ) ** 2)));
    if (wet) {
      const bottom = floorOf(spout[2]);
      const radius = a.tap === 'blasting' ? 0.011 : 0.006;
      streams.push(s.rod([spout[0], spout[1], spout[2]], [spout[0], bottom, spout[2]], radius, streamMaterial, radius * 0.8));
      const foam = s.cylinder(radius * 4, radius * 5, 0.006, [spout[0], bottom + 0.004, spout[2]], new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.7, depthWrite: false }), 14);
      foam.castShadow = false;
    } else if (a.tap === 'dripping') {
      drops.push(s.ball([0.007, 0.011, 0.007], [spout[0], spout[1] - 0.02, spout[2]], new THREE.MeshStandardMaterial({ color: '#d9f0f7', roughness: 0.05, transparent: true, opacity: 0.8 }), 10));
    }
    const overflow = blocked || a.stage === 'disaster' || a.tap === 'blasting';
    if (overflow) {
      const liquid = blocked || a.tap === 'blasting' ? waterMaterial : dye1;
      const n = 3 + Math.floor(random() * 5);
      for (let k = 0; k < n; k++) {
        const x = (random() - 0.5) * 0.5, length = 0.06 + random() * 0.3;
        s.rod([x, H - 0.012, 0.252], [x, H - 0.012 - length, 0.252 - Math.min(0.02, length * 0.1)], 0.007 + random() * 0.006, liquid, 0.003);
      }
      const puddle = s.cylinder(1, 1, 0.006, [(random() - 0.5) * 0.2, 0.003, 0.2], liquid, 28);
      puddle.scale.set(0.2 + random() * 0.14, 1, 0.12 + random() * 0.07);
      puddle.castShadow = false;
      for (let k = 0; k < 5; k++) {
        const blob = s.cylinder(1, 1, 0.005, [(random() - 0.5) * 0.7, 0.003, 0.05 + random() * 0.3], liquid, 12);
        blob.scale.set(0.015 + random() * 0.04, 1, 0.015 + random() * 0.04);
        blob.castShadow = false;
      }
    }

    // --- What is in the plughole.
    if (a.plughole === 'hair' || (blocked && random() < 0.7)) {
      const hair = s.material(a.dye === 'black' ? '#0e0c12' : '#2a1d16', { roughness: 0.9 });
      const tipMaterial = fresh ? dye1 : hair;
      const y = blocked ? H - 0.03 - level + 0.004 : drainY + 0.01;
      for (let k = 0; k < 14; k++) {
        const strand = s.ring(0.012 + random() * 0.03, 0.0035, [(random() - 0.5) * 0.05, y + random() * 0.012, BZ + (random() - 0.5) * 0.04], k % 4 === 0 ? tipMaterial : hair, Math.PI * (0.8 + random()));
        strand.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.9, random() * 6, random() * 6);
      }
      for (let k = 0; k < 6; k++) {
        const angle = random() * 6.3;
        s.rod([0, y, BZ], [Math.cos(angle) * 0.08, y + 0.012 + random() * 0.02, BZ + Math.sin(angle) * 0.06], 0.003, hair);
      }
    } else if (a.plughole === 'butts') {
      for (let k = 0; k < 4 + Math.floor(random() * 3); k++) {
        const angle = random() * 6.3, d = 0.02 + random() * 0.05;
        const x = Math.cos(angle) * d, z = BZ + Math.sin(angle) * d * 0.7;
        const butt = s.cylinder(0.006, 0.006, 0.035, [x, drainY + 0.012 + d * 0.15, z], s.material(k % 2 ? '#d79a4a' : '#efe9dc'), 8);
        butt.rotation.set(Math.PI / 2, 0, random() * 3);
      }
      s.cylinder(0.016, 0.016, 0.006, [0.05, drainY + 0.016, BZ + 0.03], s.material('#c8a23a', { metalness: 0.7, roughness: 0.3 }), 16);
    } else if (a.plughole === 'earring') {
      const hoop = s.ring(0.022, 0.003, [0.012, drainY + 0.012, BZ + 0.005], s.material('#e8c75a', { metalness: 0.95, roughness: 0.15, emissive: '#6b5210', emissiveIntensity: 0.5 }));
      hoop.rotation.set(Math.PI / 2 - 0.5, 0.3, 0);
    }

    // --- The kit on the rim.
    // Box of dye.
    const boxFace = paint(128, 256, (g, w, h) => {
      g.fillStyle = a.dye === 'black' ? '#3a2d55' : '#17141d'; g.fillRect(0, 0, w, h);
      g.fillStyle = c1; g.beginPath(); g.ellipse(w / 2, h * 0.42, 46, 56, 0, 0, 7); g.fill();
      if (a.dye === 'split') { g.fillStyle = c2; g.beginPath(); g.ellipse(w / 2, h * 0.42, 46, 56, 0, -Math.PI / 2, Math.PI / 2); g.fill(); }
      g.fillStyle = '#e8c7a8'; g.beginPath(); g.ellipse(w / 2, h * 0.5, 27, 36, 0, 0, 7); g.fill();
      g.fillStyle = c1; g.fillRect(w / 2 - 30, h * 0.34, 60, 14);
      g.fillStyle = '#111'; g.fillRect(w / 2 - 16, h * 0.48, 10, 4); g.fillRect(w / 2 + 6, h * 0.48, 10, 4);
      g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center';
      g.fillText(a.dye === 'bleach' ? 'BLEACH' : 'COLOUR', w / 2, 34);
      g.fillStyle = c2; g.fillRect(0, h - 44, w, 44);
      g.fillStyle = '#111'; g.font = 'bold 22px sans-serif'; g.fillText(a.dye === 'bleach' ? '30 VOL' : 'VIVID', w / 2, h - 14);
    });
    const cardboard = s.material('#2a2530');
    const faceMaterial = new THREE.MeshStandardMaterial({ map: boxFace, roughness: 0.55 });
    const kit = new THREE.Group();
    const boxMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.042), [cardboard, cardboard, cardboard, cardboard, faceMaterial, faceMaterial]);
    boxMesh.castShadow = true;
    kit.add(boxMesh);
    if (a.stage === 'unopened') {
      kit.position.set(0.25 + (random() - 0.5) * 0.04, H + 0.075, -0.19);
      kit.rotation.y = (random() - 0.5) * 0.5;
    } else {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.004, 0.04), cardboard);
      flap.position.set(0, 0.078, -0.035); flap.rotation.x = 0.6;
      kit.add(flap);
      const crushed = a.stage === 'finished' || a.stage === 'disaster';
      kit.scale.z = crushed ? 0.45 : 1;
      kit.position.set(0.27, H + 0.021 * (crushed ? 0.45 : 1), -0.17);
      kit.rotation.set(-Math.PI / 2, 0, 0.5 + random() * 1.2);
    }
    s.root.add(kit);

    // Applicator bottle.
    if (fresh) {
      const bottle = new THREE.Group();
      const plastic = s.material('#f4f2ea', { roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.09, 14), plastic);
      body.position.y = 0.045;
      const neck = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.045, 12), dye1);
      neck.position.y = 0.11;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0235, 0.0245, 0.03, 14), dye2);
      band.position.y = 0.04;
      bottle.add(body, neck, band);
      bottle.traverse((node) => { node.castShadow = true; });
      if (a.stage === 'disaster') {
        bottle.rotation.set(0, random() * 0.6 - 0.3, Math.PI / 2);
        bottle.position.set(-0.12, H + 0.024, 0.215);
        const spill = s.cylinder(1, 1, 0.005, [-0.26, H + 0.003, 0.2], dye1, 20);
        spill.scale.set(0.09, 1, 0.04);
      } else bottle.position.set(0.17 + random() * 0.03, H, -0.2);
      s.root.add(bottle);
    }

    // Bleach bowl and tint brush on the left shoulder.
    const bowlX = -0.29, bowlZ = -0.02 + random() * 0.06;
    const bowlMaterial = s.material(a.dye === 'bleach' ? '#2b2b33' : '#23232a', { roughness: 0.45, side: THREE.DoubleSide });
    s.lathe([[0.0, 0.004], [0.04, 0.004], [0.062, 0.03], [0.07, 0.062], [0.066, 0.062], [0.058, 0.032], [0.038, 0.01], [0, 0.01]], bowlMaterial, [bowlX, H, bowlZ]);
    const paste = a.dye === 'bleach' ? new THREE.MeshStandardMaterial({ color: '#dfe9f4', roughness: 0.7 }) : dye1;
    const filled = { unopened: 0, mixing: 1, rinsing: 0.5, finished: 0.2, disaster: 0.6 }[a.stage];
    if (filled > 0) {
      const mound = s.ball([0.04 + filled * 0.022, 0.008 + filled * 0.014, 0.04 + filled * 0.022], [bowlX, H + 0.014 + filled * 0.03, bowlZ], paste, 16);
      mound.castShadow = false;
      if (a.dye === 'split') s.ball([0.03, 0.012, 0.03], [bowlX + 0.025, H + 0.02 + filled * 0.03, bowlZ], dye2, 12);
    }
    const brush = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.15, 0.005), s.material('#18181c'));
    handle.position.y = 0.075;
    const bristles = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.045, 0.008), filled > 0 ? paste : s.material('#e6dfc9'));
    bristles.position.y = -0.02;
    brush.add(handle, bristles);
    brush.traverse((node) => { node.castShadow = true; });
    if (filled > 0) { brush.position.set(bowlX + 0.01, H + 0.05, bowlZ); brush.rotation.set(0.5, random() * 3, 0.75); }
    else { brush.position.set(bowlX + 0.01, H + 0.005, 0.14); brush.rotation.set(Math.PI / 2, 0, 1.2 + random() * 0.5); }
    s.root.add(brush);

    // Gloves.
    const gloveColour = ['#17171b', '#3b6ed0', '#e9d9b6', '#c22c8a'][Math.floor(random() * 4)];
    const glove = (messy: boolean) => {
      const group = new THREE.Group();
      const latex = s.material(gloveColour, { roughness: 0.5 });
      const tip = messy ? dye1 : latex;
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.014, 0.095), latex);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.07), latex);
      cuff.position.z = -0.08;
      group.add(palm, cuff);
      for (let f = 0; f < 4; f++) {
        const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.055 - Math.abs(f - 1.5) * 0.01, 4, 8), f % 2 || messy ? tip : latex);
        finger.rotation.x = Math.PI / 2 + (messy ? (random() - 0.5) * 0.7 : 0);
        finger.rotation.z = (f - 1.5) * 0.08;
        finger.position.set((f - 1.5) * 0.022, 0, 0.085);
        group.add(finger);
      }
      const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.01, 0.04, 4, 8), tip);
      thumb.rotation.set(Math.PI / 2, 0, -0.9);
      thumb.position.set(0.058, 0, 0.03);
      group.add(thumb);
      group.traverse((node) => { node.castShadow = true; });
      s.root.add(group);
      return group;
    };
    if (a.stage === 'unopened') {
      const one = glove(false); one.position.set(-0.05, H + 0.008, -0.19); one.rotation.y = Math.PI / 2;
      const two = glove(false); two.position.set(-0.05, H + 0.022, -0.185); two.rotation.y = Math.PI / 2 + 0.15;
    } else {
      const one = glove(true); one.position.set(0.29, H + 0.008, 0.08 + random() * 0.05); one.rotation.y = 0.3 + random() * 0.8;
      // The other hangs over the front edge by its cuff.
      const two = glove(true); two.position.set(-0.08 + random() * 0.2, H - 0.06, 0.262); two.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.4);
    }

    // Towel.
    if (a.towel) {
      const towelTexture = paint(128, 256, (g, w, h) => {
        g.fillStyle = '#d9d4c4'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(0,0,0,0.07)'; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
        for (let k = 0; k < 4 + amount * 12; k++) {
          g.fillStyle = fresh ? pick(random()) : oldStain[k % 5]; g.globalAlpha = 0.75;
          g.beginPath(); g.ellipse(random() * w, random() * h, 8 + random() * 26, 8 + random() * 30, random() * 3, 0, 7); g.fill();
        }
      });
      const cloth = new THREE.MeshStandardMaterial({ map: towelTexture, roughness: 0.95 });
      s.box([0.17, 0.014, 0.16], [0.26, H + 0.008, 0.17], cloth).rotation.y = 0.1;
      const hang = s.box([0.17, 0.3 + random() * 0.12, 0.014], [0.262, H - 0.15, 0.258], cloth);
      hang.rotation.z = 0.03;
      hang.position.y = H + 0.012 - (hang.geometry as THREE.BoxGeometry).parameters.height / 2;
    }

    // Clutter with density: foils, clips, a peroxide bottle, cut hair on the floor.
    const extras = Math.round(mood.density * 7);
    const foil = s.material('#d9dde0', { metalness: 0.9, roughness: 0.3 });
    for (let k = 0; k < extras; k++) {
      const piece = s.box([0.05 + random() * 0.04, 0.002, 0.03 + random() * 0.03], [-0.3 + random() * 0.6, H + 0.004 + k * 0.001, -0.2 + random() * 0.05], k % 3 === 0 ? dye2 : foil);
      piece.rotation.set((random() - 0.5) * 0.3, random() * 3, (random() - 0.5) * 0.3);
    }
    if (mood.density > 0.45) {
      s.cylinder(0.026, 0.028, 0.13, [-0.2, H + 0.065, -0.2], s.material('#7a4a22', { roughness: 0.35 }), 14);
      s.cylinder(0.012, 0.014, 0.03, [-0.2, H + 0.145, -0.2], s.material('#f1f1ec'), 10);
    }
    const snips: { at: [number, number, number]; size: number }[] = [];
    const snipCount = Math.round((a.plughole === 'hair' ? 30 : 8) * (0.3 + mood.density));
    for (let k = 0; k < snipCount; k++) snips.push({ at: [(random() - 0.5) * 0.9, 0.004, -0.15 + random() * 0.5], size: 0.5 + random() });
    if (snips.length) {
      const hairBits = s.scatter(new THREE.TorusGeometry(0.02, 0.0035, 4, 10, 2.2), s.material('#221a17'), snips);
      hairBits.rotation.x = 0; hairBits.castShadow = false;
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      snips.forEach((snip, index) => {
        e.set(Math.PI / 2, 0, random() * 6.3);
        m.compose(new THREE.Vector3(...snip.at), q.setFromEuler(e), new THREE.Vector3(snip.size, snip.size, snip.size));
        hairBits.setMatrixAt(index, m);
      });
    }

    const speed = mix(0.4, 2.2, mood.energy);
    const dropStart = spout[1] - 0.02, dropEnd = floorOf(spout[2]);
    return s.finish({
      update: (_dt, time) => {
        for (const stream of streams) stream.scale.x = stream.scale.z = 1 + Math.sin(time * 9 * speed) * 0.12;
        for (const drop of drops) {
          const phase = (time * speed * 0.6) % 1;
          drop.position.y = phase < 0.6 ? dropStart : mix(dropStart, dropEnd, ((phase - 0.6) / 0.4) ** 2);
        }
        if (water) water.position.y = H - 0.03 - level + Math.sin(time * 2 * speed) * 0.0015;
      },
    });
  },
});
