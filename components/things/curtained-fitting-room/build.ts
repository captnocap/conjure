import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type P3 = readonly [number, number, number];

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default defineThing({
  questions: {
    fabric: choice('What is the curtain made of?', {
      floral: 'Faded floral chintz, somebody\'s old living-room curtains, roses on cream.',
      velvet: 'Heavy theatre velvet in deep red.',
      bedsheet: 'A child\'s blue bedsheet printed with yellow stars and moons.',
      ticking: 'Navy and white striped ticking, crisp and plain.',
      shower: 'A plastic shower curtain in aqua with white spots, slightly see-through.',
      blanket: 'A grey army blanket with a single red stripe, nailed up as a last resort.',
    }),
    drawn: choice('How is the curtain drawn?', {
      closed: 'Pulled fully across: somebody is in there.',
      half: 'Halfway, left as the last person stepped out.',
      open: 'Bunched right back to one side, the cubicle standing empty and exposed.',
    }),
    beneath: choice('What shows beneath the curtain?', {
      nothing: 'Nothing but floor.',
      feet: 'A pair of feet in mismatched socks, one lifted on tiptoe.',
      two: 'Two pairs of feet, a grown-up and a small child squeezed in together.',
      heap: 'A heap of discarded clothes spilling out under the hem.',
      shoes: 'A pair of shoes left neatly outside, toes pointing in.',
    }),
    over: choice('What hangs over the side wall?', {
      nothing: 'Nothing.',
      slung: 'Rejected garments slung over the top of the partition.',
      hangers: 'Clothes on hangers hooked along the outside, waiting their turn.',
    }),
    sign: choice('What does the small sign by the entrance say, if there is one?', {
      none: 'No sign.',
      limit: '3 ITEMS MAX',
      refunds: 'NO REFUNDS',
      broken: 'OUT OF ORDER',
      one: 'ONE AT A TIME',
      key: 'ASK AT TILL',
    }),
    mirror: noul('Is there a full-length mirror standing outside, beside the cubicle?'),
    build: choice('What is the cubicle built from?', {
      plywood: 'Raw plywood sheets and two-by-fours, screw heads showing.',
      painted: 'Plywood painted a pastel colour, chipped back to wood at the edges.',
      panelling: 'Dark 1970s wood-effect panelling with vertical grooves.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 1.12, D = 1.05, H = 2.02, half = W / 2, front = D / 2;

    // Walls.
    const pastel = pick(['#bcdcc8', '#f1c9d0', '#bcd3ea', '#f3e6ad', '#d8c8e8']);
    const wallMap = paint(256, 256, (ctx) => {
      if (a.build === 'panelling') {
        ctx.fillStyle = '#5b3a24'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(${i % 2 ? '30,16,8' : '130,88,52'},0.18)`; ctx.fillRect(random() * 256, 0, 1 + random() * 3, 256); }
        ctx.fillStyle = '#2a170c'; for (let x = 0; x < 256; x += 43) ctx.fillRect(x, 0, 4, 256);
      } else {
        ctx.fillStyle = '#d6b98c'; ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = 'rgba(140,100,55,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 26; i++) { const y = i * 10 + random() * 6; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + random() * 30 - 15, 170, y + random() * 30 - 15, 256, y); ctx.stroke(); }
        for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(110,72,36,0.5)'; ctx.beginPath(); ctx.ellipse(random() * 256, random() * 256, 16, 7, 0, 0, 7); ctx.stroke(); }
        if (a.build === 'painted') {
          ctx.fillStyle = pastel; ctx.globalAlpha = 0.96; ctx.fillRect(0, 0, 256, 256); ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'destination-out';
          for (let i = 0; i < 6 + mood.wear * 40; i++) { ctx.beginPath(); ctx.ellipse(random() * 256, random() < 0.6 ? 256 - random() * 40 : random() * 256, 4 + random() * 14, 3 + random() * 8, random() * 3, 0, 7); ctx.fill(); }
          ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#c9a877'; ctx.fillRect(0, 0, 256, 256); ctx.globalCompositeOperation = 'source-over';
        }
        ctx.fillStyle = `rgba(70,55,40,${0.1 + mood.wear * 0.3})`; ctx.fillRect(0, 236, 256, 20);
      }
    });
    const wall = new THREE.MeshStandardMaterial({ map: wallMap, roughness: 0.85 });
    const timber = s.material(a.build === 'panelling' ? '#3d2616' : '#c9a36c', { roughness: 0.8 });
    const steel = s.material('#c9ced2', { metalness: 0.85, roughness: mix(0.25, 0.6, mood.wear) });
    const dark = s.material('#26262a');
    s.box([W, H, 0.022], [0, H / 2, -front], wall);
    for (const sx of [-1, 1]) {
      s.box([0.022, H, D], [sx * half, H / 2, 0], wall);
      s.box([0.055, H + 0.06, 0.055], [sx * half, (H + 0.06) / 2, front], timber);
      s.box([0.05, H, 0.05], [sx * half, H / 2, -front], timber);
      if (a.build !== 'panelling') for (let i = 0; i < 5; i++) for (const z of [-front + 0.05, front - 0.06]) s.cylinder(0.008, 0.008, 0.004, [sx * (half + 0.012), 0.2 + i * 0.42, z], dark, 6).rotation.z = Math.PI / 2;
    }
    s.box([W + 0.055, 0.2, 0.03], [0, H + 0.04, front + 0.02], timber);
    const title = s.label('FITTING ROOM', W - 0.08, 0.15, [0, H + 0.04, front + 0.037], a.build === 'panelling' ? '#f3e4b8' : '#2c2a26', a.build === 'panelling' ? '#3d2616' : a.build === 'painted' ? pastel : '#ead9b4');
    title.rotation.z = (random() - 0.5) * mood.wear * 0.03;
    // Carpet offcut for a floor, a mirror, a hook and a stool inside.
    s.box([W - 0.03, 0.012, D - 0.03], [0, 0.006, 0], s.material(pick(['#7a3b3b', '#3f5a52', '#6b5a7a', '#8a7a55']), { roughness: 1 }));
    const glassy = new THREE.MeshStandardMaterial({ color: '#cfe3ee', metalness: 0.25, roughness: 0.12, emissive: '#9fb9c9', emissiveIntensity: 0.3 });
    s.box([0.46, 1.3, 0.02], [0.1, 1.05, -front + 0.022], timber);
    s.box([0.4, 1.24, 0.006], [0.1, 1.05, -front + 0.034], glassy);
    s.rod([-half + 0.011, 1.6, -0.15], [-half + 0.09, 1.63, -0.15], 0.008, steel);
    const seat = s.material('#a8743c', { roughness: 0.6 });
    s.cylinder(0.15, 0.15, 0.03, [-0.28, 0.45, -0.26], seat, 16);
    for (let i = 0; i < 3; i++) s.rod([-0.28 + Math.cos(i * 2.1) * 0.08, 0.44, -0.26 + Math.sin(i * 2.1) * 0.08], [-0.28 + Math.cos(i * 2.1) * 0.15, 0, -0.26 + Math.sin(i * 2.1) * 0.15], 0.014, seat);

    // Curtain rod, rings and curtain.
    const rodY = H - 0.14, rodZ = front + 0.045;
    s.rod([-half - 0.03, rodY, rodZ], [half + 0.03, rodY, rodZ], 0.012, steel);
    for (const sx of [-1, 1]) s.ball([0.022, 0.022, 0.022], [sx * (half + 0.035), rodY, rodZ], steel, 10);
    const side = random() < 0.5 ? -1 : 1;
    const clothWidth = { closed: W - 0.08, half: W * mix(0.42, 0.58, random()), open: mix(0.2, 0.3, random()) }[a.drawn];
    const pleats = 9, depth = { closed: 0.035, half: 0.055, open: 0.075 }[a.drawn];
    const hemY = 0.3, clothTop = rodY - 0.035, drop = clothTop - hemY;
    const map = paint(256, 256, (ctx) => {
      if (a.fabric === 'floral') {
        ctx.fillStyle = '#efe4c8'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 9; i++) { const x = (i % 3) * 86 + 40 + (Math.floor(i / 3) % 2) * 40, y = Math.floor(i / 3) * 86 + 40; ctx.fillStyle = '#5f8a4e'; ctx.beginPath(); ctx.ellipse(x - 20, y + 16, 18, 8, 0.6, 0, 7); ctx.ellipse(x + 22, y + 12, 18, 8, -0.6, 0, 7); ctx.fill(); ctx.fillStyle = i % 2 ? '#c9566e' : '#d98a9a'; for (let p = 0; p < 6; p++) { ctx.beginPath(); ctx.arc(x + Math.cos(p) * 11, y + Math.sin(p) * 11, 12, 0, 7); ctx.fill(); } ctx.fillStyle = '#8a2f48'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); }
      } else if (a.fabric === 'velvet') {
        ctx.fillStyle = '#7d1220'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = `rgba(${i % 2 ? '20,0,6' : '190,60,70'},0.16)`; ctx.fillRect(random() * 256, 0, 6 + random() * 14, 256); }
        ctx.fillStyle = '#c9a23a'; ctx.fillRect(0, 236, 256, 8);
      } else if (a.fabric === 'bedsheet') {
        ctx.fillStyle = '#3f6fc4'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 12; i++) { const x = (i % 4) * 64 + 32 + (Math.floor(i / 4) % 2) * 20, y = Math.floor(i / 4) * 85 + 42; ctx.fillStyle = i % 3 ? '#ffd83a' : '#f4f1e6'; ctx.beginPath(); if (i % 3) for (let p = 0; p < 10; p++) { const r = p % 2 ? 9 : 22; ctx.lineTo(x + Math.sin(p * 0.628) * r, y - Math.cos(p * 0.628) * r); } else { ctx.arc(x, y, 20, 0.6, 5.2); ctx.arc(x + 9, y - 3, 15, 4.8, 0.9, true); } ctx.fill(); }
      } else if (a.fabric === 'ticking') {
        ctx.fillStyle = '#f1ece0'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#28396b';
        for (let x = 0; x < 256; x += 32) { ctx.fillRect(x, 0, 12, 256); ctx.fillRect(x + 18, 0, 3, 256); }
      } else if (a.fabric === 'shower') {
        ctx.fillStyle = '#7fd0cf'; ctx.fillRect(0, 0, 256, 256); ctx.fillStyle = '#f4fbfb';
        for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.arc((i % 4) * 64 + 32 + (Math.floor(i / 4) % 2) * 32, Math.floor(i / 4) * 64 + 32, 14, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = '#7f8078'; ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${i % 2 ? '40,40,36' : '190,190,180'},0.25)`; ctx.fillRect(random() * 256, random() * 256, 3, 1.5); }
        ctx.fillStyle = '#a8322c'; ctx.fillRect(0, 200, 256, 16);
      }
      ctx.fillStyle = `rgba(80,70,50,${mood.wear * 0.3})`; ctx.fillRect(0, 0, 256, 256);
    });
    const tiled = a.fabric !== 'velvet' && a.fabric !== 'blanket';
    map.repeat.set(tiled ? 3 : 1, tiled ? 3 : 1);
    const cloth = new THREE.MeshStandardMaterial({ map, roughness: a.fabric === 'shower' ? 0.25 : 0.92, side: THREE.DoubleSide, transparent: a.fabric === 'shower', opacity: a.fabric === 'shower' ? 0.8 : 1 });
    const sheet = new THREE.PlaneGeometry(clothWidth, drop, 72, 10);
    const sag = mood.wear > 0.55 ? mix(0.08, 0.3, random()) * mood.wear : 0;
    const sp = sheet.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const u = sp.getX(i) / clothWidth + 0.5, v = 0.5 - sp.getY(i) / drop;
      const loose = Math.max(0, u - 0.82) / 0.18;
      sp.setXYZ(i, sp.getX(i) + Math.sin(v * 3 + u * 5) * 0.012 * v, sp.getY(i) - drop / 2 - sag * loose * loose * (1 - v * 0.6), Math.sin(u * pleats * Math.PI * 2) * depth * mix(0.6, 1.15, v) + Math.sin(u * 4.3 + 1) * 0.02 * v);
    }
    sheet.computeVertexNormals();
    const curtain = new THREE.Mesh(sheet, cloth);
    const centre = a.drawn === 'closed' ? 0 : side * (half - 0.04 - clothWidth / 2);
    curtain.position.set(centre, clothTop, rodZ);
    if (side < 0 && a.drawn !== 'closed') curtain.scale.x = -1;
    curtain.castShadow = curtain.receiveShadow = true;
    s.root.add(curtain);
    const rings = a.drawn === 'open' ? 9 : 11;
    for (let i = 0; i < rings; i++) {
      const t = (i + 0.5) / rings;
      if (sag && (side < 0 && a.drawn !== 'closed' ? 1 - t : t) > 0.85 && a.drawn !== 'open') continue;
      const ring = s.ring(0.022, 0.004, [centre + (t - 0.5) * clothWidth, rodY - 0.012, rodZ], steel); ring.rotation.y = Math.PI / 2;
    }
    const covered = (x: number) => Math.abs(x - centre) < clothWidth / 2;

    // What shows beneath.
    const foot = (x: number, z: number, size: number, turn: number, sock: THREE.ColorRepresentation, tiptoe = false, shoe: THREE.Material | null = null) => {
      const g = new THREE.Group();
      const skin = shoe ?? s.material(sock, { roughness: 0.95 });
      const sole = s.ball([0.045, 0.034, 0.115], [0, 0.036, 0.04], skin, 12);
      if (tiptoe) { sole.rotation.x = 0.7; sole.position.set(0, 0.075, 0.03); }
      g.add(sole);
      if (!shoe) g.add(s.cylinder(0.04, 0.036, 0.42, [0, 0.27 + (tiptoe ? 0.07 : 0), tiptoe ? -0.03 : -0.02], skin, 10), s.cylinder(0.043, 0.043, 0.03, [0, 0.2 + (tiptoe ? 0.07 : 0), tiptoe ? -0.03 : -0.02], s.material('#f1eee4'), 10));
      else g.add(s.cylinder(0.036, 0.04, 0.03, [0, 0.07, -0.03], dark, 10));
      g.position.set(x, 0.012, z); g.rotation.y = turn; g.scale.setScalar(size);
      s.root.add(g);
    };
    const socks = ['#e23b2e', '#f2c21b', '#3f6fc4', '#2f9a5a', '#f4f1e6', '#7a4fb0', '#1e1e22', '#f08ab0'];
    const standX = a.drawn === 'closed' ? (random() - 0.5) * 0.3 : centre;
    const hidden = a.drawn !== 'open' && covered(standX);
    if (a.beneath === 'feet' || a.beneath === 'two') {
      if (hidden) {
        foot(standX - 0.1, front - 0.17, 1, 0.2 + (random() - 0.5) * 0.3, pick(socks));
        foot(standX + 0.1, front - 0.2, 1, -0.25, pick(socks), true);
        if (a.beneath === 'two') { const cx = standX + (standX > 0 ? -0.33 : 0.33); foot(cx - 0.055, front - 0.13, 0.6, 0.5, pick(socks)); foot(cx + 0.055, front - 0.11, 0.6, 0.1, pick(socks)); }
      } else {
        // Nobody is in there now: only their shoes are left behind.
        const leather = s.material(pick(['#5a3a22', '#1e1e22', '#f1eee4', '#8a2f2f']), { roughness: 0.5 });
        foot(-0.1, 0.1, 1, 0.3, 0, false, leather); foot(0.12, 0.02, 1, -0.9, 0, false, leather);
        if (a.beneath === 'two') { const small = s.material(pick(['#e23b2e', '#3f6fc4', '#f08ab0']), { roughness: 0.6 }); foot(0.32, 0.24, 0.6, 0.2, 0, false, small); foot(0.2, 0.3, 0.6, 1.4, 0, false, small); }
      }
    }
    if (a.beneath === 'shoes') { const leather = s.material(pick(['#5a3a22', '#1e1e22', '#b0263a', '#e9e2cf']), { roughness: 0.45 }); foot(-0.08, front + 0.2, 1, Math.PI + 0.05, 0, false, leather); foot(0.08, front + 0.2, 1, Math.PI - 0.06, 0, false, leather); }
    const cloths = ['#c23b2e', '#2e6f9e', '#e0a52b', '#6b3fa0', '#2f7d54', '#e9e2cf', '#27324a', '#e56a9a', '#3a3a3d'];
    if (a.beneath === 'heap') {
      const count = 6 + Math.floor(random() * 3 + mood.density * 5);
      for (let i = 0; i < count; i++) {
        const lump = s.ball([mix(0.12, 0.24, random()), mix(0.03, 0.07, random()), mix(0.1, 0.18, random())], [(random() - 0.5) * 0.6, 0.04 + (i > 4 ? 0.06 : 0), front - 0.12 + random() * 0.36], s.material(pick(cloths), { roughness: 0.95 }), 10);
        lump.rotation.set((random() - 0.5) * 0.4, random() * 3, (random() - 0.5) * 0.4);
      }
      const leg = s.box([0.13, 0.02, 0.5], [0.2, 0.02, front + 0.3], s.material('#3f5f93', { roughness: 0.9 })); leg.rotation.y = 0.5;
      s.tube([[-0.3, 0.02, front + 0.12], [-0.2, 0.03, front + 0.3], [-0.32, 0.02, front + 0.42]], 0.012, s.material('#3a2416'));
    }

    // Over the side wall (the right-hand one, which faces the usual camera).
    if (a.over === 'slung') {
      const n = 2 + Math.floor(random() * 2 + mood.density * 2);
      for (let k = 0; k < n; k++) {
        const wide = mix(0.3, 0.45, random()), long = mix(0.7, 1.1, random()), inside = long * mix(0.3, 0.5, random());
        const strip = new THREE.PlaneGeometry(wide, long, 3, 22), p = strip.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const along = p.getY(i) + long / 2 - inside, across = p.getX(i), bend = 0.04, fall = Math.abs(along) - bend;
          const out = Math.abs(along) < bend ? Math.sin(along / bend * Math.PI / 2) * bend * 0.6 : Math.sign(along) * (bend * 0.6 + 0.012 + fall * 0.03);
          const y = Math.abs(along) < bend ? Math.cos(along / bend * Math.PI / 2) * 0.022 : -fall;
          p.setXYZ(i, out + Math.sin(across * 21) * 0.008, y, across);
        }
        strip.computeVertexNormals();
        const draped = s.mesh(strip, new THREE.MeshStandardMaterial({ color: pick(cloths), roughness: 0.9, side: THREE.DoubleSide }), [half, H + 0.004 + k * 0.004, -front + 0.25 + k * (D - 0.5) / n + random() * 0.08]);
        draped.rotation.x = (random() - 0.5) * 0.1;
      }
    }
    if (a.over === 'hangers') {
      const n = 3 + Math.floor(random() * 2 + mood.density * 2);
      for (let k = 0; k < n; k++) {
        const z = -front + 0.18 + k * (D - 0.36) / Math.max(1, n - 1), long = mix(0.55, 1.0, random());
        s.rod([half - 0.02, H + 0.012, z], [half + 0.03, H + 0.012, z], 0.005, steel);
        s.rod([half + 0.03, H + 0.012, z], [half + 0.035, H - 0.1, z], 0.005, steel);
        const garment = s.box([0.035, long, 0.4], [half + 0.045 + k % 2 * 0.012, H - 0.1 - long / 2, z], s.material(pick(cloths), { roughness: 0.9 }));
        garment.rotation.y = (random() - 0.5) * 0.25;
        s.box([0.04, 0.02, 0.46], [half + 0.045 + k % 2 * 0.012, H - 0.1, z], dark).rotation.y = garment.rotation.y;
      }
    }

    if (a.sign !== 'none') {
      const text = { limit: '3 ITEMS MAX', refunds: 'NO REFUNDS', broken: 'OUT OF ORDER', one: 'ONE AT A TIME', key: 'ASK AT TILL' }[a.sign];
      const x = half + 0.25;
      s.box([0.4, 0.03, 0.02], [half + 0.2, 1.63, front], timber);
      const card = s.label(text, 0.38, 0.2, [x, 1.5, front + 0.012], a.sign === 'broken' ? '#fff6e0' : '#b3202a', a.sign === 'broken' ? '#b3202a' : mood.cheer > 0.5 ? '#ffe04a' : '#f4ecd6');
      card.rotation.z = (random() - 0.5) * mix(0.03, 0.2, mood.wear);
    }
    if (a.mirror) {
      const x = -half - 0.36, z = front - 0.2;
      const frame = s.box([0.46, 1.6, 0.03], [x, 0.86, z], s.material(pick(['#e9e2cf', '#5a3a22', '#c9a23a', '#26262a']), { roughness: 0.5 }));
      const pane = s.box([0.38, 1.5, 0.008], [x, 0.86, z + 0.016], glassy);
      const lean = -mix(0.08, 0.16, random()), turn = mix(0.15, 0.45, random());
      for (const part of [frame, pane]) { part.rotation.set(lean, turn, 0, 'YXZ'); }
      pane.position.set(x + Math.sin(turn) * 0.016, 0.86, z + Math.cos(turn) * 0.016);
      s.rod([x - 0.05, 1.3, z - 0.06], [x - 0.12, 0, z - 0.42], 0.012, dark);
      if (mood.wear > 0.6) { const crack = s.box([0.006, 0.5, 0.002], [x + 0.06, 1.2, z + 0.03], s.material('#f4f8fa')); crack.rotation.set(lean, turn, 0.5, 'YXZ'); }
    }

    const rest: P3 = [curtain.rotation.x, 0, 0], rate = mix(0.4, 1.8, mood.energy), reach = mix(0.003, 0.03, mood.energy);
    return s.finish({ update: (_dt, time) => { curtain.rotation.x = rest[0] + Math.sin(time * rate) * reach; } });
  },
});
