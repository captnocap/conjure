import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type V3 = [number, number, number];

export default defineThing({
  questions: {
    outside: choice('What is seen through the porthole?', {
      stars: 'A deep field of steady stars and a pale band of galaxy.',
      planet: 'A banded planet sliding past, huge and close, half in shadow.',
      nebula: 'A glowing cloud of rose and teal gas.',
      void: 'Nothing: flat black, not one star.',
      hull: 'The ship itself, a great lit ring curving away with rows of tiny windows.',
      sun: 'A near star, molten gold, flooding the glass.',
      sealed: 'Nothing any more: the iris shutter is closed and stencilled SEALED.',
    }),
    left: choice('What was left on the seat?', {
      nothing: 'Nothing; the cushion is smooth.',
      blanket: 'A blanket folded square.',
      rumpled: 'A rumpled blanket, still holding the shape of whoever just left.',
      book: 'An open book laid face-down to keep the page.',
      stack: 'A stack of books and a mug gone cold.',
      drawing: 'A child\'s drawing taped to the glass and crayons spilled on the cushion.',
      toy: 'A stuffed bear propped up to look out of the window.',
    }),
    frame: choice('What is the porthole frame like?', {
      brass: 'Heavy riveted brass with dog-bolts, on a sea-green bulkhead.',
      composite: 'Seamless white composite with a thin line of blue light.',
      iron: 'Dark painted iron with hazard chevrons, built for a cargo deck.',
      wood: 'Clad in warm wood by someone who wanted it to feel like home.',
    }),
    cushion: choice('What is the seat upholstered in?', {
      bare: 'Nothing, bare cold metal.',
      leather: 'A cracked brown leather pad.',
      quilt: 'A patchwork quilt pad and mismatched pillows.',
      velvet: 'Moss-green velvet with two fat bolsters.',
      wool: 'Faded red wool with a striped pillow.',
    }),
    mark: choice('How has the wall beside it been marked?', {
      none: 'It has not.',
      heights: 'Generations of children\'s heights notched and named up the wall.',
      tally: 'A long tally of days scratched in groups of five.',
      prints: 'Small handprints fogged onto the glass.',
      shelf: 'A little shelf with a candle and a framed photograph.',
    }),
    lamp: noul('Is a small reading lamp lit over the seat?'),
    size: score('How big is the nook?', ['A child-sized cubby', 'A seat for one adult', 'A wide bay two people can share']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rr = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const R = mix(0.78, 1.38, a.size);
    const cy = R + 0.14;
    const D = 0.62 + R * 0.12, back = -0.16, front = back + D;
    const seatDy = -0.66 * R, seatTop = cy + seatDy, hw = Math.sqrt(R * R - seatDy * seatDy);
    const look = {
      brass: { wall: '#7fa398', frame: '#c09a44', metal: 0.8, trim: '#3a332a' },
      composite: { wall: '#dfe3e2', frame: '#f4f5f1', metal: 0.1, trim: '#5fb8ff' },
      iron: { wall: '#6f7765', frame: '#30363a', metal: 0.5, trim: '#e0a820' },
      wood: { wall: '#eee6d2', frame: '#a8743e', metal: 0, trim: '#6a4526' },
    }[a.frame];
    const wallMat = s.material(look.wall, { roughness: 0.75 });
    const frameMat = s.material(look.frame, { metalness: look.metal, roughness: a.frame === 'brass' ? 0.32 : 0.55, side: THREE.DoubleSide });
    const trim = s.material(look.trim, { roughness: 0.6 });
    const dark = s.material('#262b2e', { roughness: 0.7 });

    // Bulkhead with a round hole.
    const W = R + 0.62, top = cy + R + 0.42;
    const shape = new THREE.Shape();
    shape.moveTo(-W, 0); shape.lineTo(W, 0); shape.lineTo(W, top - 0.25); shape.lineTo(W - 0.25, top); shape.lineTo(-W + 0.25, top); shape.lineTo(-W, top - 0.25); shape.closePath();
    const hole = new THREE.Path(); hole.absarc(0, cy, R, 0, Math.PI * 2, true); shape.holes.push(hole);
    s.mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false, curveSegments: 40 }), wallMat, [0, 0, -0.24]);
    s.box([W * 2 + 0.06, 0.12, 0.3], [0, 0.06, -0.12], trim);
    s.box([W * 2 - 0.5, 0.05, 0.28], [0, top - 0.02, -0.12], trim);
    s.rod([-W + 0.12, 0.12, 0.03], [-W + 0.12, top - 0.3, 0.03], 0.025, dark);
    s.box([0.12, 0.16, 0.08], [-W + 0.12, top * 0.55, 0.04], dark);

    // The view.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const g = canvas.getContext('2d')!;
    const dot = (x: number, y: number, r: number, fill: string) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    const starfield = (n: number) => {
      for (let i = 0; i < n; i++) dot(random() * 512, random() * 512, 0.7 + Math.pow(random(), 5) * 4.5, pick(['#ffffff', '#ffffff', '#cfe0ff', '#fff0c8', mood.cheer > 0.5 ? '#ffd0e0' : '#ffffff']));
    };
    const sky = g.createLinearGradient(0, 0, 512, 512);
    sky.addColorStop(0, '#0b1230'); sky.addColorStop(1, '#04060f');
    g.fillStyle = sky; g.fillRect(0, 0, 512, 512);
    if (a.outside === 'stars') {
      g.save(); g.translate(256, 256); g.rotate(rr(-0.9, -0.3));
      const band = g.createLinearGradient(0, -90, 0, 90);
      band.addColorStop(0, 'rgba(150,170,255,0)'); band.addColorStop(0.5, 'rgba(190,200,255,0.38)'); band.addColorStop(1, 'rgba(150,170,255,0)');
      g.fillStyle = band; g.fillRect(-400, -90, 800, 180); g.restore();
      starfield(260);
    } else if (a.outside === 'planet') {
      starfield(110);
      const px = rr(150, 360), py = rr(300, 400), pr = rr(170, 240);
      g.save(); g.beginPath(); g.arc(px, py, pr, 0, 7); g.clip();
      const hues = pick([['#d9a066', '#f0d2a0', '#b8693c'], ['#6fa8d8', '#cfe6f5', '#3f6f9f'], ['#c9b7e8', '#f1e6ff', '#8a6ac0'], ['#7fbf9a', '#d8f0d8', '#3f8a6a']]);
      for (let y = py - pr; y < py + pr; y += 14) { g.fillStyle = pick(hues); g.fillRect(px - pr, y + rr(-3, 3), pr * 2, 15); }
      const shade = g.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
      shade.addColorStop(0.35, 'rgba(0,0,10,0)'); shade.addColorStop(0.8, 'rgba(0,0,10,0.9)');
      g.fillStyle = shade; g.fillRect(px - pr, py - pr, pr * 2, pr * 2); g.restore();
      dot(rr(60, 200), rr(60, 150), rr(10, 20), '#e9e4d6');
    } else if (a.outside === 'nebula') {
      for (let i = 0; i < 30; i++) {
        const x = rr(40, 470), y = rr(40, 470), r = rr(60, 150);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        const c = pick(['255,110,170', '80,210,200', '160,120,255', '255,170,110']);
        grd.addColorStop(0, `rgba(${c},0.3)`); grd.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      starfield(120);
    } else if (a.outside === 'void') {
      g.fillStyle = '#020204'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 26; g.beginPath(); g.moveTo(90, 420); g.lineTo(300, 60); g.stroke();
    } else if (a.outside === 'hull') {
      starfield(70);
      g.strokeStyle = '#8f9aa6'; g.lineWidth = 120; g.beginPath(); g.arc(600, 700, 520, 0, 7); g.stroke();
      g.strokeStyle = '#5d6772'; g.lineWidth = 8; for (const r of [462, 520, 578]) { g.beginPath(); g.arc(600, 700, r, 0, 7); g.stroke(); }
      for (let k = 0; k < 70; k++) { const ang = Math.PI + k * 0.022, r = pick([480, 500, 540, 560]); if (random() < 0.75) dot(600 + Math.cos(ang) * r, 700 + Math.sin(ang) * r, 3.4, pick(['#ffe9a8', '#ffd27a', '#fff6dc'])); }
    } else if (a.outside === 'sun') {
      const sx = rr(180, 330), sy = rr(170, 300);
      const grd = g.createRadialGradient(sx, sy, 20, sx, sy, 420);
      grd.addColorStop(0, '#fffbe0'); grd.addColorStop(0.22, '#ffd35a'); grd.addColorStop(0.5, '#f08a1e'); grd.addColorStop(1, '#3a1206');
      g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
    } else {
      g.fillStyle = '#868f92'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = '#3d4447'; g.lineWidth = 7;
      for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4 + 0.2; g.beginPath(); g.moveTo(256 + Math.cos(ang) * 30, 256 + Math.sin(ang) * 30); g.lineTo(256 + Math.cos(ang + 0.5) * 262, 256 + Math.sin(ang + 0.5) * 262); g.stroke(); }
      dot(256, 256, 30, '#3d4447');
      g.fillStyle = '#e0a820'; g.fillRect(96, 330, 320, 64);
      g.fillStyle = '#22272a'; g.font = 'bold 54px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SEALED', 256, 364);
    }
    if (a.mark === 'prints') {
      g.fillStyle = 'rgba(235,245,255,0.55)';
      for (let k = 0; k < 4; k++) { const hx = rr(150, 370), hy = rr(250, 330), sc = rr(0.8, 1.2); g.save(); g.translate(hx, hy); g.rotate(rr(-0.4, 0.4)); g.scale(sc, sc); g.beginPath(); g.ellipse(0, 0, 13, 15, 0, 0, 7); g.fill(); for (let f = 0; f < 5; f++) { g.beginPath(); g.ellipse(-14 + f * 7, -22 - (f === 0 || f === 4 ? -6 : 3), 3.2, 10, (f - 2) * 0.18, 0, 7); g.fill(); } g.restore(); }
    }
    if (a.left === 'drawing') {
      g.save(); g.translate(rr(300, 350), rr(250, 290)); g.rotate(rr(-0.15, 0.15));
      g.fillStyle = '#fbf6e6'; g.fillRect(-62, -48, 124, 96);
      g.fillStyle = '#f2c230'; g.beginPath(); g.arc(36, -22, 13, 0, 7); g.fill();
      g.fillStyle = '#5aa84a'; g.fillRect(-62, 30, 124, 18);
      g.strokeStyle = '#d0473a'; g.lineWidth = 5; g.lineCap = 'round';
      for (const [x, h] of [[-30, 34], [-4, 22]] as const) { g.beginPath(); g.arc(x, 30 - h - 8, 7, 0, 7); g.moveTo(x, 30 - h); g.lineTo(x, 28); g.moveTo(x - 9, 30 - h * 0.6); g.lineTo(x + 9, 30 - h * 0.6); g.stroke(); }
      g.fillStyle = '#7fc4d8'; g.fillRect(-66, -52, 22, 10); g.fillRect(44, -52, 22, 10);
      g.restore();
    }
    const view = new THREE.CanvasTexture(canvas);
    view.colorSpace = THREE.SRGBColorSpace;
    const glassMat = new THREE.MeshStandardMaterial({ map: view, emissiveMap: view, emissive: '#ffffff', emissiveIntensity: a.outside === 'sealed' ? 0.15 : a.outside === 'sun' ? 1.3 : 1, roughness: 0.25 });
    s.mesh(new THREE.CircleGeometry(R * 1.01, 48), glassMat, [0, cy, back - 0.02]);

    // Frame ring, reveal, bolts.
    const reveal = s.mesh(new THREE.CylinderGeometry(R, R, 0.26, 48, 1, true), frameMat, [0, cy, -0.12]);
    reveal.rotation.x = Math.PI / 2;
    const ringMesh = s.ring(R + 0.02, 0.1, [0, cy, 0.01], frameMat);
    ringMesh.scale.z = 0.7;
    if (a.frame === 'composite') s.ring(R - 0.07, 0.014, [0, cy, 0.06], new THREE.MeshStandardMaterial({ color: '#8fd0ff', emissive: '#5fb8ff', emissiveIntensity: 2 }));
    if (a.frame === 'brass' || a.frame === 'iron') for (let k = 0; k < 16; k++) { const ang = k / 16 * Math.PI * 2 + 0.2; if (Math.sin(ang) * R < seatDy + 0.25) continue; s.cylinder(0.035, 0.04, 0.07, [Math.cos(ang) * (R + 0.02), cy + Math.sin(ang) * (R + 0.02), 0.085], a.frame === 'brass' ? trim : s.material('#8e999c', { metalness: 0.7 }), 6).rotation.x = Math.PI / 2; }
    if (a.frame === 'iron') for (let k = 0; k < 7; k++) s.box([0.09, 0.2, 0.01], [-W + 0.5 + k * 0.17, 0.26, 0.006], k % 2 ? trim : dark).rotation.z = 0.5;

    // The seat: the lower segment of the circle pulled forward into the room, with curved arms.
    const a1 = Math.atan2(seatDy, -hw), a2 = Math.atan2(seatDy, hw);
    const seg = new THREE.Shape();
    seg.moveTo(-hw, seatDy); seg.absarc(0, 0, R, a1, a2, false); seg.closePath();
    const cradleMat = a.frame === 'wood' ? s.material('#8f6234', { roughness: 0.6 }) : frameMat;
    s.mesh(new THREE.ExtrudeGeometry(seg, { depth: D, bevelEnabled: false, curveSegments: 28 }), cradleMat, [0, cy, back]);
    const armTheta = Math.acos(0.2);
    const arms = s.mesh(new THREE.CylinderGeometry(R, R, D, 40, 1, true, -armTheta, armTheta * 2), cradleMat, [0, cy, back + D / 2]);
    arms.rotation.x = Math.PI / 2;
    const lip = s.mesh(new THREE.TorusGeometry(R, 0.04, 8, 40, armTheta * 2), trim, [0, cy, front]);
    lip.rotation.z = -Math.PI / 2 - armTheta;
    s.box([hw * 1.1, cy - R + 0.02, D * 0.7], [0, (cy - R + 0.02) / 2, back + D / 2 + 0.05], trim);
    s.box([hw * 0.9, 0.16, 0.3], [0, 0.08, front + 0.2], cradleMat);

    // Upholstery.
    const padY = seatTop + 0.05, zc = back + D / 2 + 0.06;
    const fabricHex = { bare: '', leather: '#7a4a2c', quilt: '#d9c7a0', velvet: '#56703f', wool: '#a8473c' }[a.cushion];
    if (a.cushion !== 'bare') {
      const fabric = s.material(fabricHex, { roughness: 0.95 });
      s.box([hw * 2 - 0.08, 0.1, D - 0.14], [0, padY, zc], fabric);
      if (a.cushion === 'quilt') {
        const patches = ['#c8553d', '#e2b23c', '#4d8fb5', '#6aa36a', '#e9a0b4', '#f1ead2'];
        const nx = Math.round(hw * 2 / 0.2), nz = 3;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if ((i + j) % 2 === 0) s.box([(hw * 2 - 0.1) / nx, 0.012, (D - 0.16) / nz], [-hw + 0.05 + (i + 0.5) * (hw * 2 - 0.1) / nx, padY + 0.05, zc - (D - 0.16) / 2 + (j + 0.5) * (D - 0.16) / nz], s.material(patches[(i * 3 + j) % patches.length]));
      }
      if (a.cushion === 'leather') for (let i = 1; i < 4; i++) s.box([0.012, 0.012, D - 0.16], [-hw + i * hw / 2, padY + 0.05, zc], s.material('#4f2f1c'));
      const pillows = a.cushion === 'velvet' ? 2 : a.cushion === 'quilt' ? 2 + Math.round(mood.density * 2) : a.cushion === 'wool' ? 1 : 0;
      for (let k = 0; k < pillows; k++) {
        const side = k % 2 ? 1 : -1, px = side * (hw - 0.2 - Math.floor(k / 2) * 0.22);
        const mat = a.cushion === 'velvet' ? fabric : s.material(pick(['#c8553d', '#e2b23c', '#4d8fb5', '#f1ead2', '#6aa36a']), { roughness: 0.95 });
        if (a.cushion === 'velvet') s.cylinder(0.12, 0.12, D - 0.2, [px, padY + 0.16, zc], mat, 14).rotation.x = Math.PI / 2;
        else { const p = s.ball([0.1, 0.2, 0.2], [px, padY + 0.24, zc - 0.05 + k * 0.03], mat, 12); p.rotation.z = side * -0.45; if (a.cushion === 'wool') for (const dz of [-0.08, 0, 0.08]) s.ball([0.104, 0.2, 0.02], [px, padY + 0.24, zc - 0.05 + dz], s.material('#f1ead2'), 10).rotation.z = side * -0.45; }
      }
    }
    const topY = a.cushion === 'bare' ? seatTop : padY + 0.05;

    // What was left.
    const ix = rr(-hw * 0.3, hw * 0.3), iz = zc + 0.04;
    if (a.left === 'blanket') {
      const hue = pick(['#4d7fa8', '#c8553d', '#6aa36a', '#d9a13c']);
      for (let k = 0; k < 4; k++) s.box([0.36 - k * 0.004, 0.035, 0.3], [ix + rr(-0.008, 0.008), topY + 0.018 + k * 0.036, iz], s.material(k % 2 ? '#f1ead2' : hue, { roughness: 0.95 }));
    } else if (a.left === 'rumpled') {
      const hue = pick(['#4d7fa8', '#c8553d', '#6aa36a', '#d9a13c']);
      const wool = s.material(hue, { roughness: 0.95 });
      s.ball([0.3, 0.07, 0.22], [ix, topY + 0.05, iz], wool, 12).rotation.y = rr(-0.5, 0.5);
      s.ball([0.16, 0.11, 0.16], [ix - 0.2, topY + 0.09, iz - 0.05], wool, 12);
      s.ball([0.14, 0.06, 0.12], [ix + 0.22, topY + 0.05, iz + 0.08], s.material('#f1ead2', { roughness: 0.95 }), 10);
      s.ball([0.17, 0.3, 0.05], [ix + 0.1, topY - 0.16, front + 0.03], wool, 12).rotation.z = rr(-0.2, 0.2);
      s.ball([0.13, 0.05, 0.16], [ix + 0.12, 0.03, front + 0.18], wool, 10);
    } else if (a.left === 'book') {
      const cover = s.material(pick(['#2f5d7a', '#8a2f3a', '#3d6a4a', '#d9a13c']));
      for (const side of [-1, 1]) { const page = s.box([0.17, 0.022, 0.24], [ix + side * 0.075, topY + 0.04, iz], cover); page.rotation.z = side * -0.45; const inner = s.box([0.16, 0.018, 0.225], [ix + side * 0.072, topY + 0.028, iz], s.material('#f4efe0')); inner.rotation.z = side * -0.45; }
    } else if (a.left === 'stack') {
      let y = topY;
      for (let k = 0, n = 3 + Math.floor(random() * 3 + mood.density * 2); k < n; k++) { const h = rr(0.03, 0.055); const b = s.box([rr(0.2, 0.26), h, rr(0.28, 0.32)], [ix + rr(-0.02, 0.02), y + h / 2, iz], s.material(pick(['#2f5d7a', '#8a2f3a', '#3d6a4a', '#d9a13c', '#e9e2cf', '#5a3d6a']))); b.rotation.y = rr(-0.3, 0.3); y += h; }
      const mx = ix + (ix > 0 ? -0.36 : 0.36);
      s.cylinder(0.05, 0.045, 0.1, [mx, topY + 0.05, iz], s.material('#f1ead2'), 14);
      s.cylinder(0.042, 0.042, 0.004, [mx, topY + 0.095, iz], s.material('#4a2f1c'), 14);
      s.ring(0.03, 0.009, [mx + 0.055, topY + 0.05, iz], s.material('#f1ead2'));
    } else if (a.left === 'drawing') {
      const crayons = ['#d0473a', '#f2c230', '#5aa84a', '#4d8fd8', '#8a5ad0', '#f28a1e'];
      for (let k = 0; k < 8; k++) { const c = s.cylinder(0.011, 0.011, 0.09, [ix + rr(-0.25, 0.25), topY + 0.012, iz + rr(-0.12, 0.14)], s.material(crayons[k % 6]), 8); c.rotation.set(Math.PI / 2, 0, rr(0, 3.14)); }
      s.box([0.24, 0.006, 0.18], [ix - 0.05, topY + 0.004, iz], s.material('#fbf6e6')).rotation.y = rr(-0.5, 0.5);
    } else if (a.left === 'toy') {
      const fur = s.material(pick(['#9a6a3e', '#c9a46a', '#e9e2cf', '#6f5a48']), { roughness: 1 });
      const bx = ix, bz = back + 0.2;
      s.ball([0.12, 0.14, 0.1], [bx, topY + 0.13, bz], fur, 14);
      s.ball([0.095, 0.09, 0.09], [bx, topY + 0.33, bz - 0.01], fur, 14);
      for (const sx of [-1, 1]) { s.ball([0.035, 0.035, 0.02], [bx + sx * 0.07, topY + 0.41, bz], fur, 8); s.ball([0.04, 0.04, 0.09], [bx + sx * 0.09, topY + 0.04, bz + 0.09], fur, 10); s.ball([0.035, 0.08, 0.035], [bx + sx * 0.13, topY + 0.17, bz - 0.03], fur, 10).rotation.z = sx * 0.5; }
      s.box([0.2, 0.03, 0.012], [bx, topY + 0.25, bz + 0.085], s.material('#c8553d'));
    }

    // Marks on the wall.
    const mx = R + 0.36;
    if (a.mark === 'heights' || a.mark === 'tally') {
      const c2 = document.createElement('canvas'); c2.width = 128; c2.height = 512;
      const d = c2.getContext('2d')!;
      d.clearRect(0, 0, 128, 512);
      d.strokeStyle = a.frame === 'iron' ? '#e9e4d2' : '#2c3134'; d.fillStyle = d.strokeStyle; d.lineWidth = 4; d.lineCap = 'round';
      if (a.mark === 'heights') {
        d.font = 'italic bold 20px "Comic Sans MS", cursive';
        for (let k = 0, n = 6 + Math.floor(mood.density * 6); k < n; k++) { const y = 500 - rr(160, 500); d.beginPath(); d.moveTo(8, y); d.lineTo(rr(40, 62), y + rr(-3, 3)); d.stroke(); d.fillText(pick(['Wren', 'Kofi', 'June', 'Bash', 'Odi', 'Tam', 'Isa', 'Mar']), 62, y + 7); }
      } else {
        for (let row = 0; row < 16; row++) for (let grp = 0; grp < 3; grp++) { if (random() < 0.08 || (row > 12 && random() < 0.6)) continue; const x = 10 + grp * 40, y = 16 + row * 31; for (let k = 0; k < 4; k++) { d.beginPath(); d.moveTo(x + k * 7, y); d.lineTo(x + k * 7 + rr(-2, 2), y + 20); d.stroke(); } d.beginPath(); d.moveTo(x - 4, y + 17); d.lineTo(x + 26, y + 3); d.stroke(); }
      }
      const tex = new THREE.CanvasTexture(c2); tex.colorSpace = THREE.SRGBColorSpace;
      s.mesh(new THREE.PlaneGeometry(0.4, 1.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, roughness: 0.9 }), [mx, 0.95, 0.004]);
    } else if (a.mark === 'shelf') {
      const sy = Math.min(1.25, top - 0.6);
      s.box([0.36, 0.025, 0.16], [mx, sy, 0.08], cradleMat);
      s.cylinder(0.022, 0.025, 0.11, [mx - 0.1, sy + 0.068, 0.09], s.material('#f1e8cf'), 10);
      s.ball([0.012, 0.024, 0.012], [mx - 0.1, sy + 0.15, 0.09], new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffae3a', emissiveIntensity: 2.4 }), 8);
      s.box([0.12, 0.15, 0.015], [mx + 0.07, sy + 0.088, 0.06], trim).rotation.x = -0.15;
      s.box([0.095, 0.12, 0.004], [mx + 0.07, sy + 0.088, 0.07], s.material('#d9cfb8')).rotation.x = -0.15;
    }

    // Reading lamp on a gooseneck.
    const lx = -R * 0.72, ly = cy + R * 0.7;
    s.cylinder(0.05, 0.05, 0.03, [lx, ly, 0.03], dark, 12).rotation.x = Math.PI / 2;
    s.tube([[lx, ly, 0.04], [lx + 0.02, ly + 0.1, 0.3], [lx + 0.18, ly + 0.02, 0.5], [lx + 0.28, ly - 0.14, 0.52]], 0.014, dark);
    const shade = s.mesh(new THREE.ConeGeometry(0.1, 0.14, 16, 1, true), s.material(a.frame === 'brass' ? '#c09a44' : '#3f6f5a', { side: THREE.DoubleSide, metalness: 0.4 }), [lx + 0.3, ly - 0.2, 0.52]);
    shade.rotation.z = -0.35;
    if (a.lamp) {
      const warm = new THREE.Color().setHSL(mix(0.14, 0.08, mood.warmth), 1, 0.7);
      s.ball([0.045, 0.045, 0.045], [lx + 0.32, ly - 0.25, 0.52], new THREE.MeshStandardMaterial({ color: warm, emissive: warm, emissiveIntensity: 2.6 }), 10);
      const beam = s.mesh(new THREE.ConeGeometry(0.55, ly - 0.25 - topY, 20, 1, true), new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide }), [lx + 0.42, (ly - 0.25 + topY) / 2, 0.45]);
      beam.castShadow = false; beam.rotation.z = 0.2;
      const pool = s.mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: 0.3, depthWrite: false }), [Math.max(-hw + 0.3, lx + 0.55), topY + 0.012, zc]);
      pool.rotation.x = -Math.PI / 2; pool.scale.y = 0.6; pool.castShadow = false;
    }

    view.center.set(0.5, 0.5);
    const drift = a.outside === 'sealed' ? 0 : mix(0.005, 0.06, mood.energy);
    return s.finish({ update: (dt) => { view.rotation += dt * drift; } });
  },
});
