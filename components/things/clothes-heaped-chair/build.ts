import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, n: number) => void;
const paint = (size: number, draw: Draw, repeat = 1) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
};

const WARDROBES = {
  black: ['#1c1c20', '#2a2a30', '#3a2a3a', '#4a1c2a', '#55555a', '#1c1c20', '#6a2a8a'],
  pastel: ['#f6c0d8', '#c0e0f6', '#fff0b0', '#d8c8f6', '#c8f0d8', '#f6f0e8', '#ffc8a8'],
  sporty: ['#d8262c', '#2c6fd8', '#f4f4f0', '#f0c82a', '#1e1e22', '#3aa85a', '#ff7a1c'],
  grunge: ['#6a3a2a', '#4a5a3a', '#8a6a3a', '#3a4a5a', '#8a2a2a', '#c8b89a', '#2a2a2c'],
  uniform: ['#1f2a4a', '#f4f4f0', '#8a8e94', '#1f2a4a', '#6a1c2a', '#dfe6ee', '#2a2a2c'],
  neon: ['#ff3ea0', '#3af0e0', '#c8ff3a', '#ff7a1c', '#8a3aff', '#1c1c20', '#ffe23a'],
} as const;

export default defineThing({
  questions: {
    chair: choice('What kind of chair is under there?', {
      swivel: 'A black office swivel chair on five castors.',
      wooden: 'A plain wooden school chair.',
      gaming: 'A tall racing-style gaming chair with coloured trim.',
      folding: 'A tubular metal folding chair.',
    }),
    story: choice('How did the pile get like this?', {
      frenzy: 'Tonight: every outfit tried on and thrown off in a panic before going out.',
      strata: 'Weeks of worn-once layers, compacted into a tall slumping tower.',
      avalanche: 'It grew until it slid: half of it has slumped off one side onto the floor.',
      effort: 'Someone tried: a roughly folded stack on the seat, though it is already leaning.',
    }),
    wardrobe: choice('Whose clothes are these?', {
      black: 'All black and dark purple, band shirts and fishnet.',
      pastel: 'Pastels: pinks, lilacs and soft knits.',
      sporty: 'Team colours, tracksuits and bright primaries.',
      grunge: 'Flannel, army green, rust and faded denim.',
      uniform: 'School uniform navy, grey and white, with one rebellious thing.',
      neon: 'Clashing neons and rave colours.',
    }),
    top: choice('What lies on the very top?', {
      hoodie: 'A big hoodie, pocket up, drawstrings trailing.',
      denim: 'A denim jacket with brass buttons.',
      blazer: 'A school blazer with a crest on the pocket.',
      band: 'A black band T-shirt with a cracked print.',
      dress: 'A sequinned party dress catching the light.',
      kit: 'A striped football shirt with a number on the back.',
    }),
    bag: choice('What bag is caught up in it?', {
      backpack: 'A backpack hooked over the corner of the chair-back.',
      satchel: 'A satchel buried in the heap, its long strap trailing to the floor.',
      duffel: 'A sports duffel dumped at the foot of the chair.',
    }),
    shoe: choice('What is the one shoe?', {
      hightop: 'A canvas high-top with trailing laces.',
      boot: 'A heavy black boot.',
      trainer: 'A chunky white trainer.',
      studs: 'A muddy football boot.',
    }),
    stray: choice('What else hangs out of the heap?', {
      belt: 'A belt, buckle swinging.',
      towel: 'A damp striped towel.',
      tie: 'A school tie, still knotted.',
      socks: 'Balled socks that rolled off onto the floor.',
      none: 'Nothing more.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const seatY = a.chair === 'gaming' ? 0.5 : 0.46, half = 0.23;
    const backTop = { swivel: 0.95, wooden: 0.86, gaming: 1.28, folding: 0.8 }[a.chair];
    const backZ = -half - 0.02;

    // ---- The chair, of which only the edges will show.
    const dark = s.material('#1c1c20', { roughness: 0.7 });
    const steel = s.material('#aeb4b8', { metalness: 0.8, roughness: 0.35 });
    if (a.chair === 'swivel' || a.chair === 'gaming') {
      const trim = s.material(a.chair === 'gaming' ? pick(['#d8262c', '#2c6fd8', '#8dff3a', '#ff3ea0']) : '#2a2a30', { roughness: 0.5 });
      for (let i = 0; i < 5; i++) {
        const t = i / 5 * 6.283 + 0.3;
        s.rod([0, 0.11, 0], [Math.sin(t) * 0.3, 0.065, Math.cos(t) * 0.3], 0.022, dark, 0.016);
        s.ball([0.028, 0.028, 0.028], [Math.sin(t) * 0.3, 0.028, Math.cos(t) * 0.3], dark, 10);
      }
      s.cylinder(0.022, 0.03, seatY - 0.14, [0, 0.07 + (seatY - 0.14) / 2, 0], steel, 12);
      s.box([half * 2, 0.07, half * 2], [0, seatY - 0.035, 0], dark);
      s.box([half * 1.8, backTop - seatY - 0.08, 0.05], [0, (backTop + seatY) / 2 + 0.04, backZ], dark);
      if (a.chair === 'gaming') { for (const side of [-1, 1]) s.box([0.05, backTop - seatY - 0.1, 0.09], [side * half * 0.95, (backTop + seatY) / 2 + 0.05, backZ + 0.02], trim); s.box([0.2, 0.12, 0.07], [0, backTop - 0.02, backZ], trim); }
      for (const side of [-1, 1]) { s.box([0.04, 0.03, 0.26], [side * (half + 0.04), seatY + 0.2, 0], dark); s.rod([side * (half + 0.04), seatY - 0.02, 0], [side * (half + 0.04), seatY + 0.19, 0], 0.012, dark); }
    } else if (a.chair === 'wooden') {
      const wood = s.material('#b98a52', { roughness: 0.6 });
      for (const x of [-1, 1]) { s.rod([x * (half - 0.02), 0, half - 0.03], [x * (half - 0.03), seatY, half - 0.04], 0.018, wood); s.rod([x * (half - 0.02), 0, -half], [x * (half - 0.03), backTop, backZ - 0.03], 0.018, wood); s.rod([x * (half - 0.02), 0.2, half - 0.03], [x * (half - 0.02), 0.2, -half], 0.01, wood); }
      s.box([half * 2, 0.03, half * 2], [0, seatY - 0.015, 0], wood);
      for (const y of [backTop - 0.06, backTop - 0.2]) s.box([half * 1.9, 0.07, 0.02], [0, y, backZ - 0.025], wood);
    } else {
      for (const x of [-1, 1]) { s.rod([x * half, 0, half], [x * half, backTop, backZ], 0.012, steel); s.rod([x * half, 0, -half], [x * half, seatY, half * 0.8], 0.012, steel); }
      s.rod([-half, backTop, backZ], [half, backTop, backZ], 0.012, steel);
      s.box([half * 1.95, 0.02, half * 1.8], [0, seatY, 0], s.material('#7a7e84', { metalness: 0.5 }));
      s.box([half * 1.95, 0.16, 0.015], [0, backTop - 0.11, backZ], s.material('#7a7e84', { metalness: 0.5 }));
    }

    // ---- The heap: a height field that cloth is laid over.
    const tall = { frenzy: 0.5, strata: 1, avalanche: 0.55, effort: 0.4 }[a.story];
    const pileH = mix(0.16, 0.5, clamp01(tall * 0.6 + mood.density * 0.5));
    const slideSide = random() < 0.5 ? -1 : 1;
    type Lump = { x: number; z: number; h: number; r: number; floor: boolean };
    const lumps: Lump[] = [{ x: (random() - 0.5) * 0.06, z: -0.06, h: pileH, r: mix(0.19, 0.24, random()), floor: false }];
    for (let i = 0; i < 3; i++) lumps.push({ x: (random() - 0.5) * 0.3, z: (random() - 0.5) * 0.3, h: pileH * mix(0.3, 0.6, random()), r: 0.1, floor: false });
    if (a.story === 'avalanche') { lumps[0].x = slideSide * 0.1; lumps.push({ x: slideSide * 0.5, z: 0.12, h: mix(0.22, 0.34, random()), r: 0.22, floor: true }, { x: slideSide * 0.36, z: 0.0, h: 0.36, r: 0.14, floor: true }); }
    if (a.story === 'frenzy') lumps.push({ x: -slideSide * 0.42, z: 0.38, h: 0.1, r: 0.18, floor: true }, { x: slideSide * 0.3, z: 0.5, h: 0.08, r: 0.15, floor: true });
    const support = (x: number, z: number) => {
      const out = Math.hypot(Math.max(0, Math.abs(x) - half - 0.03), Math.max(0, Math.abs(z) - half - 0.03));
      let mound = 0, ground = 0;
      for (const lump of lumps) {
        const bump = lump.h * Math.exp(-((x - lump.x) ** 2 + (z - lump.z) ** 2) / (2 * lump.r * lump.r));
        if (lump.floor) ground = Math.max(ground, bump); else mound = a.story === 'effort' ? Math.max(mound, lump === lumps[0] ? lump.h * 0.85 * Math.exp(-(((x - lump.x) / 0.2) ** 4 + ((z - lump.z) / 0.19) ** 4)) : 0) : mound + bump * (lump === lumps[0] ? 1 : 0.5);
      }
      return Math.max(seatY + mound - out * 2.3, ground, 0);
    };

    const palette = WARDROBES[a.wardrobe];
    const tint = (hex: string) => {
      const c = new THREE.Color(hex);
      const hsl = { h: 0, s: 0, l: 0 };
      c.getHSL(hsl);
      c.setHSL((hsl.h + (mood.warmth - 0.5) * 0.04 + 1) % 1, clamp01(hsl.s * mix(0.6, 1.15, mood.cheer)), clamp01(hsl.l * mix(1.05, 0.88, mood.wear)));
      return c;
    };
    const weave = paint(64, (ctx, n) => { ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, n, n); for (let i = 0; i < 500; i++) { const v = 200 + Math.floor(random() * 55); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(random() * n, random() * n, 2, 1); } }, 6);
    const fabrics = {
      plain: (hex: string) => new THREE.MeshStandardMaterial({ color: tint(hex), map: weave, roughness: 1, side: THREE.DoubleSide }),
      plaid: (hex: string, other: string) => new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, map: paint(64, (ctx, n) => { ctx.fillStyle = `#${tint(hex).getHexString()}`; ctx.fillRect(0, 0, n, n); ctx.fillStyle = `#${tint(other).getHexString()}`; ctx.globalAlpha = 0.6; ctx.fillRect(0, 12, n, 14); ctx.fillRect(12, 0, 14, n); ctx.globalAlpha = 0.5; ctx.fillStyle = '#111'; ctx.fillRect(0, 44, n, 5); ctx.fillRect(44, 0, 5, n); ctx.fillStyle = '#f4f0e0'; ctx.fillRect(0, 34, n, 2); ctx.fillRect(34, 0, 2, n); }, 5) }),
      stripe: (hex: string, other: string) => new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, map: paint(32, (ctx, n) => { ctx.fillStyle = `#${tint(hex).getHexString()}`; ctx.fillRect(0, 0, n, n); ctx.fillStyle = `#${tint(other).getHexString()}`; ctx.fillRect(0, 0, n, n / 2); }, 7) }),
      denim: () => new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide, map: paint(128, (ctx, n) => { ctx.fillStyle = a.wardrobe === 'black' ? '#2a2c34' : '#4a6a9c'; ctx.fillRect(0, 0, n, n); for (let i = 0; i < 2400; i++) { ctx.fillStyle = `rgba(${random() < 0.6 ? '255,255,255' : '10,20,60'},${random() * 0.2})`; ctx.fillRect(random() * n, random() * n, 1, 4); } ctx.strokeStyle = '#e8963a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(8, n); ctx.stroke(); }, 2) }),
    };
    const anyFabric = () => {
      const r = random(), c = pick(palette), d = pick(palette);
      if (a.wardrobe === 'grunge' && r < 0.4) return fabrics.plaid(c, d);
      if (r < 0.14) return fabrics.plaid(c, d);
      if (r < 0.3) return fabrics.stripe(c, d === c ? '#f4f4f0' : d);
      if (r < 0.42) return fabrics.denim();
      return fabrics.plain(c);
    };

    let layer = 0;
    // Lay a piece of cloth over the heap. `round` pulls the corners in so it does not read as a blanket.
    const lay = (cx: number, cz: number, w: number, d: number, turn: number, material: THREE.Material, round = 0.6, folds = 0.022, nx = 22, nz = 22) => {
      const g = new THREE.PlaneGeometry(w, d, nx, nz);
      const at = g.attributes.position as THREE.BufferAttribute;
      const f1 = random() * 6, f2 = random() * 6, f3 = 14 + random() * 12, lift = 0.006 + layer++ * 0.0055;
      const cos = Math.cos(turn), sin = Math.sin(turn);
      for (let i = 0; i < at.count; i++) {
        let u = at.getX(i) / (w / 2), v = at.getY(i) / (d / 2);
        const du = u * Math.sqrt(1 - v * v / 2), dv = v * Math.sqrt(1 - u * u / 2);
        const lobe = 1 + 0.12 * Math.sin(Math.atan2(v, u) * 3 + f1) * round;
        u = mix(u, du, round) * lobe; v = mix(v, dv, round) * lobe;
        const lx = u * w / 2, lz = v * d / 2;
        const x = cx + lx * cos + lz * sin, z = cz - lx * sin + lz * cos;
        const wrinkle = Math.abs(Math.sin(x * f3 + z * 9 + f1)) * Math.abs(Math.sin(z * f3 * 0.8 - x * 7 + f2)) * folds;
        at.setXYZ(i, x, support(x, z) + lift + wrinkle, z);
      }
      g.computeVertexNormals();
      return s.mesh(g, material);
    };

    const centre = lumps[0];
    const count = Math.round(mix(6, 15, clamp01(mood.density * 0.6 + tall * 0.5)));
    for (let i = 0; i < count; i++) {
      const onFloor = (a.story === 'avalanche' || a.story === 'frenzy') && random() < 0.35;
      const spot = onFloor ? pick(lumps.filter((lump) => lump.floor)) : centre;
      const spread = a.story === 'effort' ? 0.03 : onFloor ? 0.12 : 0.2;
      const size = a.story === 'effort' ? mix(0.34, 0.4, random()) : mix(0.78, 0.36, i / count) * mix(0.85, 1.1, random());
      lay(spot.x + (random() - 0.5) * spread * 2, spot.z + (random() - 0.5) * spread * 2, size, a.story === 'effort' ? 0.32 : size * mix(0.7, 1.1, random()), a.story === 'effort' ? (random() - 0.5) * 0.25 : random() * 6.28, anyFabric(), a.story === 'effort' ? 0.1 : 0.65, a.story === 'effort' ? 0.004 : 0.018);
    }
    // Jeans: two legs running off the heap and down to the floor.
    const jeans = fabrics.denim();
    const legTurn = (random() - 0.5) * 0.8 + (random() < 0.5 ? 0 : slideSide * 1.57);
    for (const side of [-1, 1]) lay(centre.x + Math.cos(legTurn) * side * 0.09 + Math.sin(legTurn) * 0.3, centre.z - Math.sin(legTurn) * side * 0.09 + Math.cos(legTurn) * 0.3, 0.17, 0.95, legTurn + side * 0.12, jeans, 0.15, 0.012, 6, 44);
    // Sleeves and odd limbs reaching out of the pile.
    for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) {
      const turn = random() * 6.28, reach = mix(0.22, 0.34, random());
      lay(centre.x + Math.sin(turn) * reach, centre.z + Math.cos(turn) * reach, 0.11, mix(0.4, 0.6, random()), turn, anyFabric(), 0.3, 0.01, 5, 30);
    }

    // The top garment, with its own face.
    const heroBase = { hoodie: pick(palette), denim: '#4a6a9c', blazer: '#1f2a4a', band: '#18181c', dress: pick(['#c8a03a', '#c83a6a', '#3a6ac8', '#b8b8c0']), kit: pick(['#d8262c', '#2c6fd8', '#1e1e22', '#3aa85a']) }[a.top];
    const heroTint = `#${tint(heroBase).getHexString()}`;
    const heroTexture = paint(256, (ctx, n) => {
      ctx.fillStyle = heroTint; ctx.fillRect(0, 0, n, n);
      if (a.top === 'hoodie') {
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(n * 0.3, n * 0.82); ctx.lineTo(n * 0.36, n * 0.58); ctx.lineTo(n * 0.64, n * 0.58); ctx.lineTo(n * 0.7, n * 0.82); ctx.closePath(); ctx.stroke();
        ctx.strokeStyle = '#f0ece0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(n * 0.45, n * 0.14); ctx.lineTo(n * 0.42, n * 0.44); ctx.moveTo(n * 0.55, n * 0.14); ctx.lineTo(n * 0.6, n * 0.4); ctx.stroke();
      } else if (a.top === 'denim') {
        for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(${random() < 0.6 ? '255,255,255' : '10,20,60'},${random() * 0.2})`; ctx.fillRect(random() * n, random() * n, 1, 4); }
        ctx.strokeStyle = '#e8963a'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]);
        for (const x of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.moveTo(n * x, n * 0.1); ctx.lineTo(n * x, n * 0.9); ctx.stroke(); }
        for (const x of [0.24, 0.58]) ctx.strokeRect(n * x, n * 0.3, n * 0.18, n * 0.16);
        ctx.setLineDash([]); ctx.fillStyle = '#d8a83a'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(n * 0.5, n * (0.18 + i * 0.16), 6, 0, 7); ctx.fill(); }
      } else if (a.top === 'blazer') {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(n * 0.5, n * 0.9); ctx.lineTo(n * 0.36, n * 0.12); ctx.moveTo(n * 0.5, n * 0.9); ctx.lineTo(n * 0.64, n * 0.12); ctx.stroke();
        ctx.fillStyle = '#d8a83a'; ctx.beginPath(); ctx.moveTo(n * 0.2, n * 0.34); ctx.lineTo(n * 0.36, n * 0.34); ctx.lineTo(n * 0.36, n * 0.48); ctx.lineTo(n * 0.28, n * 0.56); ctx.lineTo(n * 0.2, n * 0.48); ctx.fill();
        ctx.fillStyle = '#8a1c2a'; ctx.fillRect(n * 0.24, n * 0.38, n * 0.08, n * 0.08);
        ctx.fillStyle = '#d8a83a'; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(n * 0.5, n * (0.66 + i * 0.14), 7, 0, 7); ctx.fill(); }
      } else if (a.top === 'band') {
        ctx.translate(n / 2, n / 2);
        ctx.fillStyle = pick(['#d8202c', '#f4f4f0', '#ffe23a', '#8dff3a']);
        ctx.beginPath(); for (let i = 0; i < 24; i++) { const r = (i % 2 ? 0.16 : 0.34) * n, t = i / 24 * 6.283; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); } ctx.fill();
        ctx.fillStyle = '#18181c'; ctx.beginPath(); ctx.arc(0, 0, n * 0.1, 0, 7); ctx.fill();
        ctx.fillStyle = '#f4f4f0'; ctx.font = `bold ${n * 0.13}px monospace`; ctx.textAlign = 'center'; ctx.fillText(pick(['WORLD TOUR', 'NOISE', 'THE DREGS', 'STATIC']), 0, n * 0.44, n * 0.9);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < mood.wear * 240; i++) { ctx.fillStyle = '#18181c'; ctx.fillRect(random() * n, random() * n, 1 + random() * 5, 1); }
      } else if (a.top === 'dress') {
        for (let i = 0; i < 1500; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + random() * 0.7})`; ctx.beginPath(); ctx.arc(random() * n, random() * n, 1 + random() * 1.6, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = '#f4f4f0'; for (let i = 0; i < 6; i += 2) ctx.fillRect(n * i / 6, 0, n / 6, n);
        ctx.fillStyle = heroTint; ctx.fillRect(n * 0.3, n * 0.3, n * 0.4, n * 0.42);
        ctx.fillStyle = '#f4f4f0'; ctx.font = `bold ${n * 0.4}px monospace`; ctx.textAlign = 'center'; ctx.fillText(`${1 + Math.floor(random() * 23)}`, n / 2, n * 0.66, n * 0.38);
      }
    });
    const heroMaterial = new THREE.MeshStandardMaterial({ map: heroTexture, roughness: a.top === 'dress' ? 0.3 : 1, metalness: a.top === 'dress' ? 0.5 : 0, emissive: a.top === 'dress' ? '#ffffff' : '#000000', emissiveMap: a.top === 'dress' ? heroTexture : null, emissiveIntensity: a.top === 'dress' ? 0.25 : 0, side: THREE.DoubleSide });
    const heroTurn = (random() - 0.5) * 0.7;
    layer += 2;
    const heroAt: [number, number] = [centre.x + (random() - 0.5) * 0.05, centre.z + 0.1];
    lay(heroAt[0], heroAt[1], a.top === 'dress' ? 0.44 : 0.42, a.top === 'dress' ? 0.7 : 0.46, heroTurn, heroMaterial, 0.3, 0.012, 24, 28);
    const plainHero = fabrics.plain(heroBase);
    if (a.top !== 'dress' && a.top !== 'band' && a.top !== 'kit') for (const side of [-1, 1]) lay(heroAt[0] + Math.cos(heroTurn) * side * 0.3 - Math.sin(heroTurn) * 0.1, heroAt[1] - Math.sin(heroTurn) * side * 0.3 - Math.cos(heroTurn) * 0.1, 0.13, 0.5, heroTurn + side * 0.9, a.top === 'denim' ? fabrics.denim() : plainHero, 0.3, 0.01, 6, 26);
    if (a.top === 'hoodie') { const hx = heroAt[0] - Math.sin(heroTurn) * 0.3, hz = heroAt[1] - Math.cos(heroTurn) * 0.3; const hood = s.ball([0.14, 0.07, 0.15], [hx, support(hx, hz) + 0.04 + layer * 0.0055, hz], plainHero, 16); hood.rotation.y = heroTurn; }

    // Something slung over the chair-back.
    const over = anyFabric();
    {
      const width = half * mix(1.5, 1.9, random()), front = mix(0.25, 0.4, random()), back = mix(0.3, 0.5, random()), r = 0.04;
      const total = front + Math.PI * r + back, shift = (random() - 0.5) * 0.1;
      const g = new THREE.PlaneGeometry(1, 1, 12, 30);
      const at = g.attributes.position as THREE.BufferAttribute;
      const f = random() * 6;
      for (let i = 0; i < at.count; i++) {
        const u = at.getX(i), v = at.getY(i) + 0.5, d = v * total;
        let y: number, z: number;
        if (d < front) { y = backTop - (front - d); z = backZ + r + (front - d) * 0.18; }
        else if (d < front + Math.PI * r) { const t = (d - front) / r; y = backTop + Math.sin(t) * r; z = backZ + Math.cos(t) * r; }
        else { const e = d - front - Math.PI * r; y = backTop - e; z = backZ - r - e * 0.08; }
        const hang = Math.abs(y - backTop);
        z += Math.sin(u * 22 + f) * 0.012 * clamp01(hang * 5);
        at.setXYZ(i, shift + u * width * (1 + hang * 0.25) + Math.sin(y * 20 + f) * 0.006, y + 0.012 - Math.abs(u) * 0.03, z);
      }
      g.computeVertexNormals();
      s.mesh(g, over);
      for (const side of [-1, 1]) s.tube([[shift + side * width * 0.5, backTop, backZ], [shift + side * (width * 0.5 + 0.05), backTop - 0.1, backZ - 0.03], [shift + side * (width * 0.5 + 0.06 + random() * 0.04), backTop - 0.32, backZ + (random() - 0.5) * 0.1], [shift + side * (width * 0.5 + 0.05), backTop - mix(0.45, 0.58, random()), backZ + (random() - 0.5) * 0.14]], 0.042, over).scale.set(1, 1, 1);
    }

    // ---- Bag, shoe and strays.
    const bagCloth = s.material(tint(pick(['#2a3a5a', '#5a2a3a', '#2a2a2c', '#4a5a3a', '#c8a03a'])), { roughness: 0.9 });
    const strap = s.material('#1a1a1c', { roughness: 0.8 });
    if (a.bag === 'backpack') {
      const bx = slideSide * -(half + 0.02), by = backTop - 0.3, bz = backZ - 0.13;
      const pack = s.ball([0.15, 0.2, 0.1], [bx, by, bz], bagCloth, 16); pack.rotation.z = slideSide * 0.12;
      s.ball([0.1, 0.08, 0.05], [bx, by - 0.07, bz - 0.08], s.material(bagCloth.color.clone().multiplyScalar(0.75), { roughness: 0.9 }), 12);
      s.tube([[bx - 0.06, by + 0.14, bz + 0.04], [bx - 0.04, backTop + 0.03, backZ - 0.03], [bx, backTop + 0.035, backZ + 0.03], [bx + 0.03, by + 0.2, backZ + 0.07], [bx + 0.05, by + 0.02, bz + 0.07]], 0.014, strap);
    } else if (a.bag === 'satchel') {
      const sx = -slideSide * (half + 0.02);
      s.box([0.05, 0.22, 0.3], [sx * 0.96, seatY + 0.13, 0.03], bagCloth).rotation.z = slideSide * 0.2;
      s.box([0.012, 0.035, 0.04], [sx * 1.1, seatY + 0.14, 0.03], s.material('#d8a83a', { metalness: 0.9, roughness: 0.3 }));
      s.tube([[sx, seatY + 0.24, -0.1], [sx * 1.25, seatY + 0.1, -0.02], [sx * 1.4, 0.22, 0.14], [sx * 1.5, 0.012, 0.3], [sx * 1.2, 0.012, 0.46], [sx * 0.8, 0.012, 0.4]], 0.013, strap);
    } else {
      const dx = -slideSide * 0.5, dz = 0.3;
      const duffel = s.cylinder(0.13, 0.13, 0.46, [dx, 0.12, dz], bagCloth, 18); duffel.rotation.set(Math.PI / 2, 0, 0.5 * slideSide, 'YXZ'); duffel.scale.set(1, 1, 0.85);
      s.tube([[dx - 0.12, 0.2, dz - 0.08], [dx - 0.05, 0.36, dz - 0.04], [dx + 0.05, 0.3, dz + 0.02], [dx + 0.12, 0.2, dz + 0.08]], 0.012, strap);
      s.box([0.2, 0.012, 0.012], [dx, 0.245, dz], s.material('#c9cdd0', { metalness: 0.8 })).rotation.y = 0.5 * slideSide + Math.PI / 2;
    }

    {
      const shoe = new THREE.Group();
      const kind = a.shoe;
      const upperTint = { hightop: pick(['#c8202a', '#1e1e22', '#2c4aa8']), boot: '#1c1c1e', trainer: '#f0ece2', studs: pick(['#1c1c1e', '#e8e03a', '#d8262c']) }[kind];
      const soleH = { hightop: 0.025, boot: 0.04, trainer: 0.045, studs: 0.016 }[kind];
      const add = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => { const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; shoe.add(mesh); return mesh; };
      const rubber = s.material(kind === 'boot' ? '#141416' : '#ece6d6', { roughness: 0.8 });
      const upper = s.material(upperTint, { roughness: kind === 'boot' ? 0.4 : 0.95 });
      const ball = new THREE.SphereGeometry(1, 16, 10);
      add(new THREE.CylinderGeometry(0.05, 0.05, soleH, 18), rubber, 0, soleH / 2, 0, 1, 1, 2.9);
      add(ball, upper, 0, soleH + 0.035, 0.02, 0.048, 0.045, 0.13);
      add(ball, kind === 'hightop' ? rubber : upper, 0, soleH + 0.022, 0.105, 0.047, 0.03, 0.045);
      const ankle = { hightop: 0.11, boot: 0.17, trainer: 0.05, studs: 0.04 }[kind];
      add(new THREE.CylinderGeometry(0.043, 0.05, ankle, 16, 1, true), s.material(upperTint, { roughness: 0.9, side: THREE.DoubleSide }), 0, soleH + 0.05 + ankle / 2, -0.07);
      for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.05, 0.004, 0.006), s.material('#f4f0e4'), 0, soleH + 0.078 - i * 0.004, 0.0 + i * 0.022).rotation.x = 0.3;
      if (kind === 'studs') for (let i = 0; i < 6; i++) add(new THREE.CylinderGeometry(0.006, 0.008, 0.012, 8), rubber, (i % 2 ? 1 : -1) * 0.025, -0.006, -0.1 + Math.floor(i / 2) * 0.09);
      if (kind === 'trainer') add(new THREE.BoxGeometry(0.004, 0.02, 0.1), s.material(pick(['#d8262c', '#2c6fd8', '#3aa85a'])), 0.047, soleH + 0.035, 0.02);
      const tipped = random() < 0.6;
      shoe.rotation.set(0, random() * 6.28, tipped ? Math.PI / 2 : 0);
      shoe.position.set(slideSide * mix(0.3, 0.42, random()) * (a.story === 'avalanche' ? -1 : 1), tipped ? 0.05 : kind === 'studs' ? 0.012 : 0, mix(0.34, 0.48, random()));
      s.root.add(shoe);
      if (kind === 'hightop') s.tube([[shoe.position.x, 0.004, shoe.position.z], [shoe.position.x + 0.06, 0.004, shoe.position.z + 0.07], [shoe.position.x + 0.13, 0.004, shoe.position.z + 0.03], [shoe.position.x + 0.17, 0.004, shoe.position.z + 0.1]], 0.003, s.material('#f4f0e4'));
    }

    const side = -slideSide;
    if (a.stray === 'belt') {
      const leather = s.material('#3a2414', { roughness: 0.6 });
      const x = side * (half + 0.045);
      s.tube([[x * 0.6, support(x * 0.6, 0.12) + 0.09, 0.12], [x, seatY + 0.05, 0.14], [x * 1.04, seatY - 0.2, 0.15], [x * 1.02, seatY - 0.36, 0.16]], 0.011, leather).scale.set(1, 1, 1);
      s.ring(0.022, 0.005, [x * 1.02, seatY - 0.385, 0.16], s.material('#c9cdd0', { metalness: 0.9, roughness: 0.25 })).rotation.y = Math.PI / 2;
    } else if (a.stray === 'towel') {
      const towel = fabrics.stripe(pick(palette), '#f4f4f0');
      lay(side * (half + 0.02), 0.02, 0.5, 0.75, side * Math.PI / 2 + (random() - 0.5) * 0.2, towel, 0.05, 0.02, 14, 30);
    } else if (a.stray === 'tie') {
      const silk = fabrics.stripe('#6a1c2a', '#d8a83a');
      lay(side * 0.12, half + 0.12, 0.06, 0.62, (random() - 0.5) * 0.4, silk, 0.1, 0.004, 3, 30);
    } else if (a.stray === 'socks') {
      for (let i = 0; i < 3 + Math.round(mood.density * 3); i++) s.ball([0.045, 0.035, 0.05], [side * mix(0.2, 0.55, random()), 0.035, mix(0.3, 0.6, random())], fabrics.plain(pick(['#f4f4f0', '#f4f4f0', ...palette])), 10).rotation.y = random() * 3;
    }

    return s.finish({ footprint: 0.5 });
  },
});
