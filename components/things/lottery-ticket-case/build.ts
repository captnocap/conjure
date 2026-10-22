import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Ticket { name: string; price: string; top: string; bottom: string; ink: string; motif: string }
const THEMES = {
  gold: 'Gold bars, lucky sevens and black lettering: old-school riches.',
  green: 'Cash green, shamrocks and dollar signs.',
  pink: 'Hot pink hearts, diamonds and flamingos.',
  casino: 'Black and red casino tables, dice and spades.',
  mixed: 'Every game the state prints, a clashing patchwork.',
} as const;
const TICKETS: Record<Exclude<keyof typeof THEMES, 'mixed'>, Ticket[]> = {
  gold: [
    { name: 'GOLD RUSH', price: '$10', top: '#ffd84a', bottom: '#c98a0a', ink: '#1a1208', motif: '$' },
    { name: 'LUCKY 7s', price: '$5', top: '#fff0a0', bottom: '#e0a81c', ink: '#b3121c', motif: '7' },
    { name: 'TRIPLE BARS', price: '$2', top: '#1a1208', bottom: '#4a3208', ink: '#ffd84a', motif: '≡' },
    { name: '24 KARAT', price: '$20', top: '#f6c21a', bottom: '#8a5a08', ink: '#ffffff', motif: '★' },
  ],
  green: [
    { name: 'CASH COW', price: '$5', top: '#3fc25a', bottom: '#0f6a2a', ink: '#ffffff', motif: '$' },
    { name: 'SHAMROCK', price: '$1', top: '#d8f5b0', bottom: '#3fa83a', ink: '#0f5a1f', motif: '♣' },
    { name: 'MONEY TREE', price: '$10', top: '#0f4a24', bottom: '#062a14', ink: '#ffd84a', motif: '$' },
    { name: 'GREENBACK', price: '$2', top: '#a8e03a', bottom: '#2f9a2a', ink: '#12301a', motif: '★' },
  ],
  pink: [
    { name: 'PINK ICE', price: '$5', top: '#ff5fb4', bottom: '#c81a7a', ink: '#ffffff', motif: '♦' },
    { name: 'LOVE BUCKS', price: '$2', top: '#ffd0e6', bottom: '#ff5fa4', ink: '#b3124a', motif: '♥' },
    { name: 'FLAMINGO', price: '$3', top: '#ff8ac8', bottom: '#2ad0c8', ink: '#ffffff', motif: '♥' },
    { name: 'CHERRY BOMB', price: '$1', top: '#ff2a6a', bottom: '#7a0a3a', ink: '#fff200', motif: '●' },
  ],
  casino: [
    { name: 'BLACKJACK', price: '$5', top: '#16181c', bottom: '#3a0a0e', ink: '#ffffff', motif: '♠' },
    { name: 'HIGH ROLLER', price: '$30', top: '#b3121c', bottom: '#4a060a', ink: '#ffd84a', motif: '♦' },
    { name: 'SNAKE EYES', price: '$2', top: '#0f5a2a', bottom: '#062a14', ink: '#ffffff', motif: '●' },
    { name: 'ROULETTE', price: '$10', top: '#2a2a2e', bottom: '#b3121c', ink: '#ffd84a', motif: '7' },
  ],
};
const JACKPOT = { small: '$2 MILLION', mid: '$87 MILLION', huge: '$340 MILLION', absurd: '$1.2 BILLION', life: '$500/WK 4 LIFE', glitch: '$3_0 MI_LION' } as const;
const LED = { red: '#ff2a1c', amber: '#ffae1c', green: '#3aff5a', blue: '#3ab4ff', pink: '#ff4fc0' } as const;

function ticketArt(ticket: Ticket, scratched: 'no' | 'loser' | 'winner', random: () => number) {
  return paint(144, 192, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 192);
    g.addColorStop(0, ticket.top); g.addColorStop(1, ticket.bottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 144, 192);
    ctx.strokeStyle = ticket.ink; ctx.lineWidth = 4; ctx.strokeRect(5, 5, 134, 182);
    ctx.fillStyle = ticket.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 900 26px sans-serif'; ctx.fillText(ticket.name, 64, 28, 108);
    ctx.font = '900 40px sans-serif'; ctx.globalAlpha = 0.9;
    for (let i = 0; i < 3; i++) ctx.fillText(ticket.motif, 34 + i * 38, 68);
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(122, 24, 17, 0, 7); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.fillStyle = '#16181c'; ctx.font = '900 15px sans-serif'; ctx.fillText(ticket.price, 122, 25, 30);
    // Scratch panel: six boxes.
    for (let i = 0; i < 6; i++) {
      const x = 14 + (i % 3) * 40, y = 96 + Math.floor(i / 3) * 42;
      if (scratched === 'no') { ctx.fillStyle = '#b9bec4'; ctx.fillRect(x, y, 36, 36); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 3, y + 3, 30, 5); continue; }
      ctx.fillStyle = '#fbf8ee'; ctx.fillRect(x, y, 36, 36);
      ctx.fillStyle = '#9aa0a6'; for (let k = 0; k < 5; k++) ctx.fillRect(x + random() * 30, y + random() * 30, 7, 3);
      ctx.fillStyle = '#16181c'; ctx.font = '900 17px sans-serif';
      ctx.fillText(scratched === 'winner' && i < 3 ? '$50' : ['$1', '$5', '$20', '$50', '$1K', 'X'][Math.floor(random() * 6)], x + 18, y + 19, 32);
    }
    if (scratched === 'winner') { ctx.strokeStyle = '#e8102e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(74, 114, 66, 25, -0.05, 0, 7); ctx.stroke(); }
  });
}

export default defineThing({
  questions: {
    theme: choice('What are the scratch tickets themed on?', THEMES),
    jackpot: choice('What does the LED jackpot sign show?', {
      small: '$2 MILLION: modest, almost reasonable.',
      mid: '$87 MILLION.',
      huge: '$340 MILLION, the kind that makes a queue.',
      absurd: '$1.2 BILLION, a number with no meaning.',
      life: '$500 a week for life.',
      glitch: 'A glitching number with dead segments.',
    }),
    led: choice('What colour is the LED sign?', { red: 'Classic red dots.', amber: 'Warm amber.', green: 'Money green.', blue: 'Cold blue.', pink: 'Hot pink.' }),
    form: choice('What shape is the case?', {
      slant: 'A slanted counter case, four columns by three rows.',
      tower: 'An upright narrow tower, two columns of four.',
      wide: 'A long low strip along the counter, six across in two rows.',
    }),
    empty: score('How many slots are empty?', ['None, every game in stock', 'One or two sold out', 'Half bare', 'Nearly all gone, two games left']),
    beside: choice('What lies on the counter next to it?', {
      losers: 'A little drift of scratched losing tickets and silver dust.',
      winner: 'One winning ticket, circled in red pen, pinned under a coin.',
      coin: 'Just a lucky coin, worn smooth.',
      pencil: 'A golf-pencil stub and a half-scratched ticket.',
      nothing: 'Nothing at all.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const themes = Object.keys(TICKETS) as (keyof typeof TICKETS)[];
    const pool: Ticket[] = a.theme === 'mixed' ? themes.flatMap((theme) => TICKETS[theme]) : TICKETS[a.theme];
    const [cols, rows, tilt] = { slant: [4, 3, 52], tower: [2, 4, 78], wide: [6, 2, 40] }[a.form];
    const cw = 0.112, ch = 0.158, tw = 0.096, th = 0.128;
    const W = cols * cw + 0.03, L = rows * ch + 0.02;
    const angle = tilt * Math.PI / 180;
    const rise = Math.sin(angle) * L, run = Math.cos(angle) * L;
    const zf = run / 2 + 0.03, zb = -run / 2 - 0.07, lip = 0.045;
    const ledColour = LED[a.led];
    const frame = s.material('#1b1c20', { roughness: 0.35, metalness: 0.3 });
    const accent = s.material(ledColour, { roughness: 0.4, emissive: ledColour, emissiveIntensity: mix(0.15, 0.6, mood.cheer) });

    // Wedge body.
    const profile = new THREE.Shape([new THREE.Vector2(zf, 0), new THREE.Vector2(zf, lip), new THREE.Vector2(zf - run, lip + rise), new THREE.Vector2(zb, lip + rise), new THREE.Vector2(zb, 0)]);
    s.mesh(new THREE.ExtrudeGeometry(profile, { depth: W, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(W / 2, 0, 0), frame);
    s.box([W + 0.02, 0.02, zf - zb + 0.02], [0, 0.01, (zf + zb) / 2], accent);

    // The slanted face: tickets, dividers, number strips, acrylic cover.
    const face = new THREE.Group();
    face.position.set(0, lip, zf);
    face.rotation.x = -(Math.PI / 2 - angle);
    s.root.add(face);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], shadow = true) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...at);
      mesh.castShadow = mesh.receiveShadow = shadow;
      face.add(mesh);
      return mesh;
    };
    const white = s.material('#eef0f2', { roughness: 0.4 });
    for (let c = 0; c <= cols; c++) add(new THREE.BoxGeometry(0.006, L, 0.026), white, [(c - cols / 2) * cw, L / 2, 0.013]);
    const emptyShare = mix(0, 0.85, a.empty) * mix(1.1, 0.85, mood.density);
    const slots = Array.from({ length: cols * rows }, (_unused, index) => index);
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const gone = new Set(slots.slice(0, Math.min(slots.length - 2, Math.round(slots.length * emptyShare))));
    const arts = new Map<Ticket, THREE.MeshStandardMaterial>();
    const artFor = (ticket: Ticket) => {
      let material = arts.get(ticket);
      if (!material) { const map = ticketArt(ticket, 'no', random); material = new THREE.MeshStandardMaterial({ map, roughness: 0.35, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: mix(0.05, 0.2, mood.cheer) }); arts.set(ticket, material); }
      return material;
    };
    const ticketGeometry = new THREE.PlaneGeometry(tw, th);
    const soldArt = paint(96, 128, (ctx) => {
      ctx.fillStyle = '#0b0c0f'; ctx.fillRect(0, 0, 96, 128);
      ctx.strokeStyle = '#2a2c32'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, 84, 116);
      ctx.save(); ctx.translate(48, 64); ctx.rotate(-0.5); ctx.fillStyle = '#f4f1e6'; ctx.fillRect(-40, -13, 80, 26);
      ctx.fillStyle = '#c8102e'; ctx.font = '900 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('SOLD OUT', 0, 1); ctx.restore();
    });
    const soldOut = new THREE.MeshStandardMaterial({ map: soldArt, roughness: 0.9 });
    const offset = Math.floor(random() * pool.length);
    for (let r = 0; r < rows; r++) {
      const numbers = paint(64 * cols, 20, (ctx) => {
        ctx.fillStyle = '#16181c'; ctx.fillRect(0, 0, 64 * cols, 20);
        ctx.fillStyle = ledColour; ctx.font = 'bold 16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (let c = 0; c < cols; c++) ctx.fillText(String((rows - 1 - r) * cols + c + 1).padStart(2, '0'), c * 64 + 32, 11);
      });
      add(new THREE.BoxGeometry(W - 0.03, 0.022, 0.026), new THREE.MeshStandardMaterial({ map: numbers, roughness: 0.5, emissive: '#ffffff', emissiveMap: numbers, emissiveIntensity: 0.5 }), [0, (r + 1) * ch - 0.001, 0.014]);
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * cw, y = r * ch + 0.01 + th / 2;
        if (gone.has(r * cols + c)) { add(ticketGeometry, soldOut, [x, y, 0.002], false); continue; }
        const ticket = pool[(r * cols + c + offset) % pool.length];
        add(ticketGeometry, artFor(ticket), [x + (random() - 0.5) * 0.004, y, 0.004 + random() * 0.003]).rotation.z = (random() - 0.5) * 0.04;
        if (r === 0 && random() < 0.45) {
          // The next ticket on the roll hangs out over the lip.
          const tail = add(ticketGeometry, artFor(ticket), [x, -th * 0.42, 0.012]);
          tail.rotation.x = 0.5 + random() * 0.4;
        }
      }
    }
    add(new THREE.BoxGeometry(W, 0.008, 0.03), white, [0, 0.004, 0.015]);
    const acrylic = new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#f2fbff').lerp(new THREE.Color('#e8d9a0'), mood.wear * 0.6), transparent: true, opacity: 0.1 + mood.wear * 0.08, roughness: 0.05, depthWrite: false });
    add(new THREE.BoxGeometry(W, L, 0.003), acrylic, [0, L / 2, 0.028], false);
    for (const x of [-1, 1]) add(new THREE.BoxGeometry(0.012, L + 0.01, 0.034), frame, [x * (W / 2 + 0.002), L / 2, 0.015]);

    // LED jackpot sign on two posts.
    const topY = lip + rise, signW = Math.max(0.3, W * 0.92), signH = 0.105, signZ = zf - run - 0.035;
    const message = JACKPOT[a.jackpot];
    const lettering = paint(384, 128, (ctx) => {
      ctx.fillStyle = '#07070a'; ctx.fillRect(0, 0, 384, 128);
      ctx.fillStyle = ledColour; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px monospace'; ctx.fillText('* JACKPOT *', 192, 24, 360);
      ctx.font = 'bold 64px monospace'; ctx.fillText(message, 192, 80, 368);
      ctx.fillStyle = '#07070a';
      for (let x = 0; x < 384; x += 5) ctx.fillRect(x, 0, 1.6, 128);
      for (let y = 0; y < 128; y += 5) ctx.fillRect(0, y, 384, 1.6);
      if (a.jackpot === 'glitch') for (let i = 0; i < 5; i++) ctx.fillRect(random() * 384, 44, 6 + random() * 26, 76);
    });
    for (const x of [-1, 1]) s.box([0.014, 0.05, 0.014], [x * signW * 0.36, topY + 0.02, signZ], frame);
    s.box([signW + 0.02, signH + 0.02, 0.05], [0, topY + 0.045 + signH / 2, signZ], frame);
    const display = new THREE.MeshStandardMaterial({ map: lettering, roughness: 0.3, emissive: '#ffffff', emissiveMap: lettering, emissiveIntensity: mix(0.9, 1.8, mood.cheer) });
    const screen = s.mesh(new THREE.PlaneGeometry(signW, signH), display, [0, topY + 0.045 + signH / 2, signZ + 0.026]);
    screen.castShadow = false;

    // What lies beside it.
    const sx = W / 2 + 0.11, sz = zf - 0.06;
    const flat = (ticket: Ticket, state: 'no' | 'loser' | 'winner', x: number, z: number, y: number) => {
      const map = ticketArt(ticket, state, random);
      const mesh = s.mesh(ticketGeometry, new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), [x, y, z]);
      mesh.rotation.set(-Math.PI / 2 + (random() - 0.5) * 0.12, 0, (random() - 0.5) * 2.2);
      return mesh;
    };
    const coin = (x: number, z: number, y: number) => {
      const metal = s.material(random() < 0.5 ? '#d9b24a' : '#c9cdd0', { metalness: 0.9, roughness: 0.3 + mood.wear * 0.3 });
      s.cylinder(0.0125, 0.0125, 0.002, [x, y + 0.001, z], metal, 20);
      s.cylinder(0.0095, 0.0095, 0.0026, [x, y + 0.0013, z], metal, 20);
    };
    if (a.beside === 'losers') {
      const count = Math.round(mix(2, 7, mood.density) + random() * 2);
      for (let i = 0; i < count; i++) flat(pick(pool), 'loser', sx + (random() - 0.5) * 0.14, sz + (random() - 0.5) * 0.2, 0.002 + i * 0.0012);
      const dust = Array.from({ length: 40 }, () => ({ at: [sx + (random() - 0.5) * 0.22, 0.001, sz + (random() - 0.5) * 0.26] as [number, number, number], size: mix(0.5, 1.4, random()) }));
      s.scatter(new THREE.BoxGeometry(0.004, 0.001, 0.002), s.material('#b9bec4', { metalness: 0.6 }), dust);
      coin(sx - 0.07, sz + 0.12, 0);
    } else if (a.beside === 'winner') {
      const win = flat(pick(pool), 'winner', sx, sz, 0.002);
      win.rotation.z = (random() - 0.5) * 0.5;
      coin(sx + 0.02, sz + 0.035, 0.003);
    } else if (a.beside === 'coin') coin(sx - 0.03, sz, 0);
    else if (a.beside === 'pencil') {
      flat(pick(pool), 'loser', sx, sz, 0.002);
      const pencil = new THREE.Group();
      const wood = s.material('#f2c81a', { roughness: 0.5 });
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.07, 6), wood);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0038, 0.012, 6), s.material('#e2c08a'));
      tip.position.y = 0.041;
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0014, 0.0045, 6), s.material('#2a2a2e'));
      lead.position.y = 0.0455;
      barrel.castShadow = tip.castShadow = true;
      pencil.add(barrel, tip, lead);
      pencil.rotation.set(Math.PI / 2, 0, 0.6 + random());
      pencil.position.set(sx + 0.03, 0.0065, sz + 0.02);
      s.root.add(pencil);
    }
    // A strip of tape or sticker for worn cases.
    if (mood.wear > 0.55) add(new THREE.PlaneGeometry(0.09, 0.03), s.material('#e6dca8', { roughness: 0.8 }), [(random() - 0.5) * W * 0.6, L * mix(0.3, 0.8, random()), 0.031], false).rotation.z = (random() - 0.5) * 0.6;

    const base = display.emissiveIntensity, pace = mix(0.4, 5, mood.energy);
    const broken = a.jackpot === 'glitch';
    return s.finish({
      update: (_dt, time) => {
        const blink = broken ? (Math.sin(time * 23) * Math.sin(time * 7.3) > 0.55 ? 0.25 : 1) : 0.88 + 0.12 * Math.sin(time * pace);
        display.emissiveIntensity = base * blink;
      },
    });
  },
});
