import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { MASK_OPTIONS, board, gather, instances, paint, place, solder } from './pcb';

export default defineThing({
  questions: {
    pins: choice('How big is the chip?', {
      eight: 'Eight legs: a stubby little timer or op-amp.',
      sixteen: 'Sixteen legs: a plain logic gate, one of dozens like it.',
      twentyeight: 'Twenty-eight legs, long and narrow: a memory chip.',
      forty: 'Forty legs, long and wide: the processor, the biggest block on the board.',
    }),
    pack: choice('What is the package made of?', {
      plastic: 'Black epoxy plastic with tin legs, cheap and everywhere.',
      ceramic: 'Purple-grey ceramic with a gold lid and gold legs, early and expensive.',
      eprom: 'Tan ceramic with a round quartz window showing the silicon die.',
      white: 'White ceramic with a gold lid, military or aerospace surplus.',
    }),
    marking: choice('What is painted on it?', {
      timer: 'NE555, the most ordinary chip in the world.',
      logic: 'SN74LS00N, a row of anonymous logic.',
      cpu: 'Z80A CPU, a named brain.',
      sound: 'SID 6581, a chip people hunt for.',
      sticker: 'A paper sticker with a handwritten version number covering the top.',
      sanded: 'Nothing: the markings have been sanded off to hide what it is.',
    }),
    era: choice('What year does the date code give?', {
      seventies: '1974, in yellowed paint.',
      eighties: '1983, in crisp white paint.',
      nineties: '1991, in thin grey ink.',
      aughts: '2003, laser etched so faintly it only shows at an angle.',
    }),
    mounting: choice('How is it fixed to the board?', {
      soldered: 'Soldered straight in, permanent.',
      socket: 'Pressed into a socket so it can be swapped.',
      pried: 'Pried halfway out of its socket, one end up in the air.',
      removed: 'Pulled out and left lying on the board beside its empty socket, legs splayed.',
      lifted: 'Soldered in but with one leg bent up out of its hole, deliberately disconnected.',
      deadbug: 'Glued on its back with its legs in the air and fine wires soldered to them.',
    }),
    board: choice('What kind of board is it on?', MASK_OPTIONS),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const count = { eight: 8, sixteen: 16, twentyeight: 28, forty: 40 }[a.pins];
    const n = count / 2;
    const wide = a.pins === 'forty';
    const row = wide ? 7.62 : 3.81;
    const W = wide ? 13.6 : 6.4, L = n * 2.54 + 0.5, H = 3.5;
    const socketed = a.mounting === 'socket' || a.mounting === 'pried' || a.mounting === 'removed';
    const gold = a.pack === 'ceramic' || a.pack === 'white';
    const legMetal = s.material(gold ? '#d2ae4e' : '#c2c5c2', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const tin = s.material('#c9ccc9', { metalness: 0.85, roughness: 0.3 });
    const bodyColour = { plastic: '#1c1d20', ceramic: '#5a4a6e', eprom: '#9a8f78', white: '#e6e3da' }[a.pack];
    const body = s.material(bodyColour, { roughness: a.pack === 'plastic' ? 0.55 : 0.75 });
    const socketPlastic = s.material(random() < 0.5 ? '#15171a' : '#1f3558', { roughness: 0.7 });

    const beside = a.mounting === 'removed';
    const w = L + 11, d = row * 2 + 11 + (beside ? W + 9 : 0);
    const homeZ = beside ? -(W + 9) / 2 : 0;
    const xOf = (index: number) => (index - (n - 1) / 2) * 2.54;
    const pads: { x: number; z: number; r: number; square: boolean }[] = [];
    for (let i = 0; i < n; i++) for (const side of [-1, 1]) pads.push({ x: xOf(i), z: homeZ + side * row, r: 0.85, square: i === 0 && side === 1 });
    const ref = `U${1 + Math.floor(random() * 40)}`;
    board(s, {
      w, d, mask: a.board, random, wear: mood.wear, pads,
      outlines: [{ x: 0, z: homeZ, w: L + 1.2, d: row * 2 - 2.4 }],
      silk: [
        { text: ref, x: -L / 2 - 3.3, z: homeZ, size: 2.6, turn: -Math.PI / 2 },
        { text: '1', x: -L / 2 - 1.2, z: homeZ + row + 2.4, size: 1.8 },
        { text: wide ? 'CPU' : a.marking === 'sticker' ? 'ROM' : `IC${count}`, x: L / 2 - 4, z: homeZ + row + 2.9, size: 1.9 },
      ],
      extra: (ctx) => {
        ctx.fillStyle = '#10261a';
        for (const pad of pads) { ctx.beginPath(); ctx.arc(pad.x, pad.z, 0.38, 0, Math.PI * 2); ctx.fill(); }
      },
    });

    // The chip itself, built with its belly on y = 0.
    const year = { seventies: '7432', eighties: '8312', nineties: '9146', aughts: '0305' }[a.era];
    const ink = a.pack === 'white' || a.pack === 'eprom'
      ? { seventies: '#3b3524', eighties: '#1d1d1d', nineties: '#55524a', aughts: '#8c887c' }[a.era]
      : { seventies: '#d8c779', eighties: '#f1f1ee', nineties: '#a9aaa8', aughts: '#55585c' }[a.era];
    const part = { timer: 'NE555P', logic: 'SN74LS00N', cpu: 'Z80A CPU', sound: 'SID 6581', sticker: '', sanded: '' }[a.marking];
    const ppm = Math.min(40, 1024 / L);
    const face = paint(L * ppm, (W - 0.7) * ppm, (ctx, cw, ch) => {
      ctx.fillStyle = bodyColour;
      ctx.fillRect(0, 0, cw, ch);
      const u = ch; // one body width in pixels
      // Mould marks: the notch at pin-one end and two ejector dimples.
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.arc(0, ch / 2, u * 0.16, -Math.PI / 2, Math.PI / 2); ctx.fill();
      ctx.beginPath(); ctx.arc(u * 0.22, ch * 0.8, u * 0.07, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath(); ctx.arc(cw - u * 0.3, ch * 0.5, u * 0.14, 0, Math.PI * 2); ctx.fill();
      const lidFrom = cw * 0.3, lidTo = cw * 0.7;
      if (gold) {
        const lid = ctx.createLinearGradient(0, 0, 0, ch);
        lid.addColorStop(0, '#e9cf7a'); lid.addColorStop(0.5, '#c79f3d'); lid.addColorStop(1, '#e2c467');
        ctx.fillStyle = '#8d7a3a';
        ctx.fillRect(lidFrom - u * 0.04, ch * 0.11, lidTo - lidFrom + u * 0.08, ch * 0.78);
        ctx.fillStyle = lid;
        ctx.fillRect(lidFrom, ch * 0.15, lidTo - lidFrom, ch * 0.7);
      }
      if (a.pack === 'eprom') {
        const cx = cw / 2, cy = ch / 2, r = ch * 0.36;
        ctx.fillStyle = '#2a2622';
        ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2); ctx.fill();
        const glass = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        glass.addColorStop(0, '#8fa6b8'); glass.addColorStop(1, '#3c4652');
        ctx.fillStyle = glass;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c9b46a';
        ctx.fillRect(cx - r * 0.42, cy - r * 0.34, r * 0.84, r * 0.68);
        ctx.fillStyle = '#6c7f9c';
        ctx.fillRect(cx - r * 0.32, cy - r * 0.24, r * 0.64, r * 0.48);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = r * 0.07;
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.8, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (a.marking === 'sticker') {
        const sx = cw * 0.2, sw = cw * 0.62;
        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        ctx.rotate((random() - 0.5) * 0.08);
        ctx.fillStyle = mood.wear > 0.6 ? '#d9cfa8' : '#f3efe0';
        ctx.fillRect(sx - cw / 2, -ch * 0.36, sw, ch * 0.72);
        ctx.fillStyle = '#1f3fa0';
        ctx.font = `italic bold ${Math.min(ch * 0.36, sw / 5.5)}px cursive`;
        ctx.fillText(['v1.3', 'BASIC', 'BOOT 2', 'FIXED?', 'v0.9b'][Math.floor(random() * 5)], sx - cw / 2 + sw / 2, 0, sw * 0.9);
        ctx.restore();
      } else if (a.marking === 'sanded') {
        ctx.fillStyle = 'rgba(150,150,150,0.35)';
        ctx.fillRect(cw * 0.12, ch * 0.1, cw * 0.78, ch * 0.8);
        ctx.strokeStyle = 'rgba(210,210,210,0.35)';
        ctx.lineWidth = Math.max(1, u * 0.008);
        for (let i = 0; i < 70; i++) {
          const y = ch * (0.1 + random() * 0.8), x = cw * (0.12 + random() * 0.6);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cw * (0.05 + random() * 0.18), y + (random() - 0.5) * u * 0.05); ctx.stroke();
        }
      } else {
        // On lidded and windowed packages the print sits to either side of the lid.
        const split = gold || a.pack === 'eprom';
        ctx.fillStyle = ink;
        ctx.globalAlpha = a.era === 'aughts' ? 0.8 : 1;
        const lot = `${String.fromCharCode(65 + Math.floor(random() * 20))}${Math.floor(random() * 900 + 100)}`;
        if (split && n > 6) {
          const size = Math.min(ch * 0.26, cw * 0.24 / 5);
          ctx.font = `bold ${size}px monospace`;
          const words = part.split(' ');
          ctx.fillText(words[0], cw * 0.16 + u * 0.05, ch * 0.36, cw * 0.24);
          ctx.fillText(words[1] ?? lot, cw * 0.16 + u * 0.05, ch * 0.66, cw * 0.24);
          ctx.fillText(year, cw * 0.85, ch * 0.36, cw * 0.24);
          ctx.fillText(lot, cw * 0.85, ch * 0.66, cw * 0.24);
        } else {
          const room = cw - u * 0.5;
          const size = Math.min(ch * 0.34, room / part.length * 1.5);
          ctx.font = `bold ${size}px monospace`;
          ctx.fillText(part, u * 0.3 + room / 2, ch * 0.34, room * 0.92);
          ctx.font = `${size * 0.72}px monospace`;
          ctx.fillText(`${year} ${lot}`, u * 0.3 + room / 2, ch * 0.7, room * 0.92);
          // A maker's mark: a small ring-and-bar logo.
          ctx.lineWidth = size * 0.12;
          ctx.strokeStyle = ink;
          if (n > 6) { ctx.beginPath(); ctx.arc(u * 0.42, ch * 0.34, size * 0.3, 0.6, Math.PI * 2 - 0.6); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = `rgba(200,195,180,${mood.wear * 0.5})`;
      for (let i = 0; i < mood.wear * 500; i++) ctx.fillRect(random() * cw, random() * ch, 1 + random() * 3, 1 + random() * 2);
    });

    const lifted = a.mounting === 'lifted' ? Math.floor(n * (0.3 + random() * 0.4)) : -1;
    const bentOut = a.mounting === 'removed' || a.mounting === 'pried';
    const chip = gather(s, () => {
      const profile = new THREE.Shape();
      const half = W / 2;
      profile.moveTo(-half + 0.35, 0); profile.lineTo(half - 0.35, 0); profile.lineTo(half, 1.55); profile.lineTo(half, 1.95);
      profile.lineTo(half - 0.4, H); profile.lineTo(-half + 0.4, H); profile.lineTo(-half, 1.95); profile.lineTo(-half, 1.55); profile.closePath();
      const block = new THREE.ExtrudeGeometry(profile, { depth: L, bevelEnabled: false });
      block.translate(0, 0, -L / 2);
      block.rotateY(Math.PI / 2);
      s.mesh(block, body);
      if (a.pack === 'eprom' || a.pack === 'ceramic') s.box([L + 0.05, 0.18, W + 0.05], [0, 1.75, 0], s.material(a.pack === 'eprom' ? '#5b5547' : '#3e3350'));
      const top = s.mesh(new THREE.PlaneGeometry(L - 0.15, W - 0.85), new THREE.MeshStandardMaterial({ map: face, roughness: a.pack === 'plastic' ? 0.5 : 0.7 }), [0, H + 0.012, 0]);
      top.rotation.x = -Math.PI / 2;
      // A real notch cut into the pin-one end.
      const notch = s.cylinder(W * 0.11, W * 0.11, 0.5, [-L / 2 + 0.02, H - 0.2, 0], s.material('#0c0c0d'), 14);
      notch.scale.x = 0.9;
      const shoulders: THREE.Matrix4[] = [], drops: THREE.Matrix4[] = [], tips: THREE.Matrix4[] = [];
      const reach = row - half + 0.3;
      for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
        const x = xOf(i);
        if (i === lifted && side === 1) continue;
        const splay = bentOut ? (random() - 0.3) * 0.3 : 0;
        shoulders.push(place([x, 1.75, side * (half + reach / 2 - 0.15)], [0, 0, 0], [1.35, 0.26, reach]));
        drops.push(place([x, 0.75 - Math.abs(splay), side * (row + splay * 2)], [side * splay, 0, 0], [1.35, 2.1, 0.26]));
        tips.push(place([x + splay, -1.2, side * (row + splay * 5)], [side * splay * 2, 0, splay], [0.5, 1.9, 0.26]));
      }
      const unit = new THREE.BoxGeometry(1, 1, 1);
      instances(s, unit, legMetal, shoulders);
      instances(s, unit.clone(), legMetal, drops);
      instances(s, unit.clone(), legMetal, tips);
      if (lifted >= 0) {
        const x = xOf(lifted);
        s.box([1.35, 0.26, reach], [x, 1.75, half + reach / 2 - 0.15], legMetal);
        const bent = s.box([1.35, 2.1, 0.26], [x, 1.95, row + 1.25], legMetal);
        bent.rotation.x = 1.15;
        const tip = s.box([0.5, 1.9, 0.26], [x, 2.75, row + 3.0], legMetal);
        tip.rotation.x = 1.15;
      }
    });

    const socket = (z: number) => {
      const rails: THREE.Matrix4[] = [], legs: THREE.Matrix4[] = [], holes: THREE.Matrix4[] = [];
      for (const side of [-1, 1]) rails.push(place([0, 1.5, z + side * row], [0, 0, 0], [L + 1.4, 3, 2.3]));
      for (const end of [-1, 1]) rails.push(place([end * (L / 2 + 0.1), 1, z], [0, 0, 0], [1.2, 2, row * 2]));
      if (n > 10) rails.push(place([0, 1, z], [0, 0, 0], [1.2, 2, row * 2]));
      for (let i = 0; i < n; i++) for (const side of [-1, 1]) {
        legs.push(place([xOf(i), -0.5, z + side * row], [0, 0, 0], [0.45, 2, 0.3]));
        holes.push(place([xOf(i), 3.01, z + side * row], [0, 0, 0], [1.1, 0.04, 1]));
      }
      const unit = new THREE.BoxGeometry(1, 1, 1);
      instances(s, unit, socketPlastic, rails);
      instances(s, unit.clone(), tin, legs);
      instances(s, unit.clone(), s.material('#b99b45', { metalness: 0.8, roughness: 0.35 }), holes);
      s.cylinder(0.9, 0.9, 2.02, [-L / 2 - 0.1, 1, z], s.material('#0c0c0d'), 12);
    };

    if (socketed) socket(homeZ);
    if (a.mounting === 'soldered' || a.mounting === 'lifted') {
      chip.position.set(0, 0.7, 0);
      for (const pad of pads) if (!(a.mounting === 'lifted' && pad.z > 0 && Math.abs(pad.x - xOf(lifted)) < 0.1)) solder(s, pad.x, pad.z, tin, 0.6);
    } else if (a.mounting === 'socket') chip.position.set(0, 3.25, 0);
    else if (a.mounting === 'pried') {
      const tilt = mix(0.16, 0.3, random()) * Math.min(1, 12 / n + 0.35);
      chip.rotation.z = tilt;
      chip.position.set(-L / 2 * (1 - Math.cos(tilt)) + 0.3, 3.9 + Math.sin(tilt) * L / 2, (random() - 0.5) * 0.8);
      chip.rotation.y = (random() - 0.5) * 0.06;
    } else if (a.mounting === 'removed') {
      chip.position.set((random() - 0.5) * 4, 2.2, homeZ + row + W / 2 + 6.5);
      chip.rotation.set((random() - 0.5) * 0.12, (random() - 0.5) * 0.5, (random() - 0.5) * 0.08);
    } else {
      // Dead bug: belly up, a blob of glue underneath and enamel wires rising to the legs.
      chip.rotation.x = Math.PI;
      chip.position.set(0, H + 0.5, 0);
      chip.rotation.y = (random() - 0.5) * 0.3;
      s.ball([L * 0.42, 0.7, W * 0.6], [0, 0.25, 0], s.material('#d8cfae', { roughness: 0.3, transparent: true, opacity: 0.85 }), 16);
      const enamel = s.material('#b5542a', { metalness: 0.5, roughness: 0.4 });
      const wires = Math.min(n * 2, 3 + Math.floor(random() * 5));
      for (let k = 0; k < wires; k++) {
        const pad = pads[Math.floor(random() * pads.length)];
        const side = Math.sign(pad.z) || 1;
        const legTop: [number, number, number] = [pad.x, H + 0.5 + 2.6, -side * row];
        const away: [number, number, number] = [pad.x + (random() - 0.5) * 8, 0.1, side * (row + 4 + random() * 3)];
        s.tube([legTop, [legTop[0], legTop[1] + 1.4, legTop[2] - side * 1.5], [(legTop[0] + away[0]) / 2, 3 + random() * 3, side * (row + 2.5)], away], 0.14, enamel);
        s.ball([0.5, 0.3, 0.5], away, tin, 8);
        s.ball([0.45, 0.45, 0.45], legTop, tin, 8);
      }
    }

    // Neighbours grow with density: a decoupling capacitor, then a rank of resistors.
    if (mood.density > 0.35) {
      const cx = L / 2 + 3.2, cz = homeZ - row * 0.4;
      s.ball([1.9, 1.7, 0.75], [cx, 3.3, cz], s.material('#c98a2e', { roughness: 0.5 }), 14);
      for (const side of [-1, 1]) s.rod([cx + side * 1.27, -1.5, cz], [cx + side * 1.1, 2.2, cz], 0.18, tin);
    }
    if (mood.density > 0.65) {
      const bands = ['#7a4a22', '#c22f2f', '#e08a1e', '#e6d23a', '#2f8f4a', '#2a4fb0', '#7a3fa0'];
      const tan = s.material('#d9c79a', { roughness: 0.6 });
      for (let k = 0; k < 3; k++) {
        const z = homeZ - row - 3.4, x = -L / 2 + 2 + k * Math.min(4, (L - 4) / 2.2);
        if (Math.abs(z) > d / 2 - 1.5) break;
        const barrel = s.cylinder(0.85, 0.85, 3, [x, 1.1, z], tan, 12);
        barrel.rotation.z = Math.PI / 2; barrel.rotation.y = Math.PI / 2;
        for (let b = 0; b < 3; b++) {
          const band = s.cylinder(0.88, 0.88, 0.35, [x, 1.1, z - 1 + b * 0.75], s.material(bands[Math.floor(random() * bands.length)]), 12);
          band.rotation.x = Math.PI / 2;
        }
        barrel.rotation.set(Math.PI / 2, 0, 0);
        s.rod([x, 1.1, z - 2.3], [x, 1.1, z + 2.3], 0.16, tin);
      }
    }

    s.root.scale.setScalar(0.001);
    return s.finish();
  },
});
