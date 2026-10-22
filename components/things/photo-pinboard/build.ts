import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
const paint = (width: number, height: number, draw: Draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width); canvas.height = Math.round(height);
  draw(canvas.getContext('2d')!, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};
const CORK = '#b98a56';

export default defineThing({
  questions: {
    crowded: score('How crowded is the board?', ['A few things, carefully spaced', 'Comfortably full', 'Layered three deep, nothing of the cork left showing']),
    theme: choice('What is most of it?', {
      friends: 'Snapshots of friends pulling faces, arms round each other.',
      gigs: 'Ticket stubs, wristbands and set lists from concerts.',
      crush: 'Notes passed in class, hearts, and photobooth strips of two people.',
      team: 'Team photos, rosettes and match tickets.',
      travel: 'Postcards and train tickets from places longed for or left.',
    }),
    photos: choice('What kind of photographs are they?', {
      instant: 'Square instant photos with thick white borders.',
      prints: 'Glossy drugstore prints with an orange date stamp in the corner.',
      booth: 'Photobooth strips, four frames each.',
      mono: 'Black and white prints from the school darkroom.',
    }),
    cut: noul('Has one face been cut out of the biggest photo?'),
    arrangement: choice('How is it arranged?', {
      grid: 'In careful rows, everything square and evenly pinned.',
      collage: 'An overlapping collage at every angle.',
      drooping: 'Sliding and drooping, things hanging by one corner.',
      stripped: 'Mostly stripped: bare pins, torn corners and pale patches where things used to be.',
    }),
    keepsake: choice('What keepsake is pinned among the paper?', {
      corsage: 'A dried prom corsage, its ribbon faded.',
      rosette: 'A prize rosette with two tails.',
      bracelet: 'A braided friendship bracelet hanging in a loop.',
      flower: 'A pressed flower gone papery brown.',
      none: 'Nothing but paper.',
    }),
    frame: choice('What is the frame like?', {
      pine: 'Plain pine, straight from the stationery shop.',
      white: 'Painted white, chipped at the corners.',
      black: 'Black, with band stickers along the bottom rail.',
      pink: 'Glittery pink.',
      washi: 'Wrapped in strips of patterned tape.',
    }),
    shape: choice('What shape is the board?', {
      landscape: 'Wide.', portrait: 'Tall.', square: 'Square and small.',
    }),
    lights: noul('Is a string of fairy lights draped along the top?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const [bw, bh] = { landscape: [0.62, 0.45], portrait: [0.42, 0.58], square: [0.42, 0.42] }[a.shape];
    const fade = mood.wear;
    const board = new THREE.Group();
    s.root.add(board);
    const put = <T extends THREE.Object3D>(node: T) => { node.traverse((n) => { n.castShadow = n.receiveShadow = true; }); board.add(node); return node; };

    // Cork and frame.
    const cork = paint(256, 256, (ctx, w, h) => {
      ctx.fillStyle = CORK; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(${random() < 0.55 ? '70,40,15' : '235,200,150'},${random() * 0.35})`; ctx.beginPath(); ctx.arc(random() * w, random() * h, random() * 2.4, 0, 7); ctx.fill(); }
      if (a.arrangement === 'stripped') for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(240,215,170,0.35)'; ctx.fillRect(random() * w * 0.8, random() * h * 0.8, 40 + random() * 40, 30 + random() * 40); }
    });
    put(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.012), new THREE.MeshStandardMaterial({ map: cork, roughness: 1 })));
    const frameTint = { pine: '#d8b27a', white: '#eeeae0', black: '#232326', pink: '#f08ac0', washi: '#e8e0d0' }[a.frame];
    const frameMaterial = s.material(frameTint, { roughness: a.frame === 'pink' ? 0.3 : 0.7, metalness: a.frame === 'pink' ? 0.35 : 0 });
    const rail = 0.028;
    for (const side of [-1, 1]) {
      put(new THREE.Mesh(new THREE.BoxGeometry(bw + rail * 2, rail, 0.024), frameMaterial)).position.set(0, side * (bh / 2 + rail / 2), 0);
      put(new THREE.Mesh(new THREE.BoxGeometry(rail, bh, 0.024), frameMaterial)).position.set(side * (bw / 2 + rail / 2), 0, 0);
    }
    if (a.frame === 'washi' || a.frame === 'black') {
      const count = a.frame === 'washi' ? 22 : 5;
      for (let i = 0; i < count; i++) {
        const along = random() < 0.5 || a.frame === 'black';
        const tint = a.frame === 'washi' ? pick(['#f08ab4', '#8ad8d0', '#ffd86a', '#b89af0', '#ff9a6a', '#9ad06a']) : pick(['#f4f4f0', '#d8202c', '#ffe23a']);
        const strip = put(new THREE.Mesh(new THREE.BoxGeometry(along ? mix(0.05, 0.11, random()) : rail + 0.002, along ? rail + 0.002 : mix(0.05, 0.11, random()), 0.001), s.material(tint, { roughness: 0.6 })));
        const sideSign = a.frame === 'black' ? -1 : random() < 0.5 ? -1 : 1;
        if (along) strip.position.set((random() - 0.5) * bw, sideSign * (bh / 2 + rail / 2), 0.0126);
        else strip.position.set(sideSign * (bw / 2 + rail / 2), (random() - 0.5) * bh, 0.0126);
      }
    }

    // Paper things.
    const skins = ['#f1c9a5', '#e0ac82', '#c68a5e', '#8d5a3a', '#f6d8bc', '#a8703f'];
    const hairs = ['#2a1c14', '#5a3a1c', '#c89a3a', '#111', '#8a2a1c', '#d8c8a8', '#c83aa0'];
    const tops = ['#d8343a', '#2c6fd0', '#e8c63a', '#3aa870', '#f4f4f0', '#1e1e22', '#f08ab4', '#8a4ac8', '#ff8a2a'];
    const grey = a.photos === 'mono';
    const tone = (hex: string) => {
      const c = new THREE.Color(hex);
      if (grey) { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; c.setRGB(l, l, l); }
      c.lerp(new THREE.Color('#d8c8a0'), fade * 0.35);
      return `#${c.getHexString()}`;
    };
    const people = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number, cutIndex = -1) => {
      const scene = Math.floor(random() * 5);
      const sky = ctx.createLinearGradient(0, y, 0, y + h);
      const [c0, c1] = [['#7ab8f0', '#cfe8f8'], ['#f08a4a', '#f8d89a'], ['#1c1c2c', '#3a2a4a'], ['#8ac870', '#d8f0b0'], ['#c8b090', '#e8dcc0']][scene];
      sky.addColorStop(0, tone(c0)); sky.addColorStop(1, tone(c1));
      ctx.fillStyle = sky; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = tone(['#4a8a3a', '#6a4a3a', '#2a2a3a', '#3a7a3a', '#8a6a4a'][scene]); ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
      for (let i = 0; i < count; i++) {
        const cx = x + w * (i + 0.5 + (random() - 0.5) * 0.3) / count, r = Math.min(w / count * 0.3, h * 0.2), cy = y + h * mix(0.36, 0.5, random());
        ctx.fillStyle = tone(pick(tops));
        ctx.beginPath(); ctx.moveTo(cx - r * 1.7, y + h); ctx.quadraticCurveTo(cx - r * 1.6, cy + r * 1.1, cx, cy + r * 1.0); ctx.quadraticCurveTo(cx + r * 1.6, cy + r * 1.1, cx + r * 1.7, y + h); ctx.fill();
        if (i === cutIndex) {
          // Scissored out: a rough hole down to the cork.
          ctx.fillStyle = '#6a4a2a'; ctx.beginPath();
          for (let k = 0; k < 9; k++) { const t = k / 9 * 6.283, rr = r * mix(1.25, 1.6, random()); ctx.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr); }
          ctx.fill();
          ctx.fillStyle = CORK; ctx.beginPath();
          for (let k = 0; k < 9; k++) { const t = k / 9 * 6.283, rr = r * mix(1.1, 1.4, random()); ctx.lineTo(cx + 2 + Math.cos(t) * rr, cy + 2 + Math.sin(t) * rr); }
          ctx.fill();
          continue;
        }
        ctx.fillStyle = tone(pick(hairs)); ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 1.15, 0, 7); ctx.fill();
        if (random() < 0.5) ctx.fillRect(cx - r * 1.15, cy - r * 0.1, r * 2.3, r * 1.5);
        ctx.fillStyle = tone(pick(skins)); ctx.beginPath(); ctx.arc(cx, cy + r * 0.12, r * 0.9, 0, 7); ctx.fill();
        ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(cx - r * 0.32, cy + r * 0.05, r * 0.1, 0, 7); ctx.arc(cx + r * 0.32, cy + r * 0.05, r * 0.1, 0, 7); ctx.fill();
        ctx.strokeStyle = '#7a2a2a'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.4, 0.2, 2.94); ctx.stroke();
      }
    };
    const scribble = (ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, ink: string) => {
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); let x = x0; ctx.moveTo(x, y);
      while (x < x1) { x += 3 + random() * 5; ctx.lineTo(x, y - random() * 8); if (random() < 0.15) { x += 8; ctx.moveTo(x, y); } }
      ctx.stroke();
    };
    type Item = { w: number; h: number; draw: Draw };
    const photo = (large = false, cutIndex = -1): Item => {
      if (a.photos === 'booth' && !large) return { w: 0.042, h: 0.17, draw: (ctx, w, h) => { ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) people(ctx, w * 0.1, h * (0.02 + i * 0.245), w * 0.8, h * 0.225, random() < 0.7 ? 2 : 1); } };
      if (a.photos === 'instant') { const k = large ? 1.7 : 1; return { w: 0.088 * k, h: 0.107 * k, draw: (ctx, w, h) => { ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, w, h); people(ctx, w * 0.07, h * 0.06, w * 0.86, h * 0.72, large ? 3 : 1 + Math.floor(random() * 3), cutIndex); if (random() < 0.5) scribble(ctx, w * 0.2, w * 0.8, h * 0.92, '#2a2a6a'); } }; }
      const k = large ? 1.35 : 1, tall = !large && random() < 0.3;
      return { w: (tall ? 0.1 : 0.15) * k, h: (tall ? 0.15 : 0.1) * k, draw: (ctx, w, h) => { ctx.fillStyle = '#f6f4ec'; ctx.fillRect(0, 0, w, h); people(ctx, w * 0.03, h * 0.04, w * 0.94, h * 0.92, large ? 3 : 1 + Math.floor(random() * 4), cutIndex); if (a.photos === 'prints') { ctx.fillStyle = '#ff9a2a'; ctx.font = `bold ${h * 0.09}px monospace`; ctx.fillText(`'${pick(['87', '92', '96', '99', '03'])} ${1 + Math.floor(random() * 12)} ${1 + Math.floor(random() * 28)}`, w * 0.62, h * 0.9); } } };
    };
    const ticket = (): Item => {
      const tint = pick(['#f6d06a', '#f09a8a', '#9ad0e8', '#c8e89a', '#f4f0e0', '#e8a8d8']);
      const word = a.theme === 'travel' ? pick(['SINGLE', 'RETURN', 'PLATFORM 4', 'COACH B']) : a.theme === 'team' ? pick(['HOME END', 'CUP FINAL', 'ROW 12', 'JUNIORS']) : pick(['ADMIT ONE', 'ALL AGES', 'DOORS 7PM', 'ONE NIGHT', 'STANDING']);
      return { w: 0.125, h: 0.052, draw: (ctx, w, h) => {
        ctx.fillStyle = tint; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.strokeRect(4, 4, w - 8, h - 8);
        ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(w * 0.76, 0); ctx.lineTo(w * 0.76, h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#1c1c1c'; ctx.font = `bold ${h * 0.34}px monospace`; ctx.textAlign = 'center'; ctx.fillText(word, w * 0.39, h * 0.48, w * 0.66);
        ctx.font = `${h * 0.2}px monospace`; ctx.fillText(`No. ${1000 + Math.floor(random() * 8999)}`, w * 0.39, h * 0.8);
        ctx.save(); ctx.translate(w * 0.88, h / 2); ctx.rotate(Math.PI / 2); ctx.fillText(`${Math.floor(random() * 99)}`, 0, 4); ctx.restore();
      } };
    };
    const note = (): Item => {
      const sticky = random() < 0.5;
      const word = pick(a.theme === 'crush' ? ['call me', 'do you like me? Y / N', 'meet me after 4th', 'I ♥ U', 'S + J', 'thinking of you'] : ['BFF', 'miss u', 'best night EVER', 'never forget', 'June 14!!', 'u + me', 'LOL', 'remember this']);
      return { w: sticky ? 0.074 : 0.1, h: sticky ? 0.074 : 0.085, draw: (ctx, w, h) => {
        ctx.fillStyle = sticky ? pick(['#fff48a', '#ffb0c8', '#a8e8ff', '#c8f0a0']) : '#f6f0e0'; ctx.fillRect(0, 0, w, h);
        if (!sticky) { ctx.strokeStyle = 'rgba(110,150,200,0.6)'; for (let y = 14; y < h; y += 13) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } }
        ctx.fillStyle = pick(['#1c3aa8', '#c8206a', '#2a2a2a', '#7a3ad8']); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.min(h * 0.3, w / word.length * 1.9)}px cursive`;
        ctx.save(); ctx.translate(w / 2, h * 0.42); ctx.rotate((random() - 0.5) * 0.3); ctx.fillText(word, 0, 0, w * 0.9); ctx.restore();
        if (a.theme === 'crush') { ctx.fillStyle = '#e83a6a'; const x = w * 0.5, y = h * 0.78, r = h * 0.1; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 1.6, y, x - r * 0.6, y - r * 1.2, x, y - r * 0.3); ctx.bezierCurveTo(x + r * 0.6, y - r * 1.2, x + r * 1.6, y, x, y + r); ctx.fill(); }
        else scribble(ctx, w * 0.15, w * 0.85, h * 0.8, '#3a3a5a');
      } };
    };
    const postcard = (): Item => ({ w: 0.148, h: 0.105, draw: (ctx, w, h) => {
      const kind = Math.floor(random() * 3);
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, ['#3a9ae8', '#f07a4a', '#8a6ad8'][kind]); sky.addColorStop(0.7, ['#cfeeff', '#ffd89a', '#f0b0d0'][kind]);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff2b0'; ctx.beginPath(); ctx.arc(w * mix(0.3, 0.7, random()), h * 0.4, h * 0.14, 0, 7); ctx.fill();
      ctx.fillStyle = ['#2a6ab0', '#5a3a4a', '#3a3a6a'][kind]; ctx.beginPath(); ctx.moveTo(0, h * 0.66);
      for (let x = 0; x <= w; x += w / 8) ctx.lineTo(x, h * (kind === 0 ? 0.66 : mix(0.4, 0.7, random())));
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = `bold italic ${h * 0.17}px cursive`; ctx.fillText(pick(['Greetings!', 'Wish you were here', 'Paris', 'The Coast', 'Tokyo']), w * 0.06, h * 0.92, w * 0.88);
      ctx.strokeStyle = '#f6f4ec'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, w, h);
    } });
    const wristband = (): Item => ({ w: 0.15, h: 0.018, draw: (ctx, w, h) => { ctx.fillStyle = pick(['#ff3ea0', '#3af0e0', '#ffe23a', '#8dff3a', '#ff7a1c']); ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#111'; ctx.font = `bold ${h * 0.7}px monospace`; ctx.fillText(pick(['OVER 18  OVER 18', 'STAGE 2 · SAT', 'VOID IF REMOVED']), 6, h * 0.76); } });

    const chooser = (): Item => {
      const r = random();
      if (a.theme === 'friends') return r < 0.72 ? photo() : r < 0.87 ? note() : ticket();
      if (a.theme === 'gigs') return r < 0.5 ? ticket() : r < 0.68 ? wristband() : r < 0.88 ? photo() : note();
      if (a.theme === 'crush') return r < 0.48 ? note() : r < 0.9 ? photo() : ticket();
      if (a.theme === 'team') return r < 0.5 ? photo() : r < 0.85 ? ticket() : note();
      return r < 0.5 ? postcard() : r < 0.78 ? ticket() : r < 0.92 ? photo() : note();
    };

    const pins: { at: readonly [number, number, number]; size: number; color: string }[] = [];
    const pinTints = ['#d8262c', '#2c6fd8', '#f0c82a', '#3aa85a', '#f4f4f0', '#f04a98'];
    let layer = 0;
    const pinUp = (item: Item, x: number, y: number, turn: number, corner = false) => {
      const px = 900;
      const texture = paint(item.w * px, item.h * px, item.draw);
      const z = 0.0068 + layer++ * 0.0007;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(item.w, item.h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, side: THREE.DoubleSide }));
      // Hang from the pin, not the middle, so a turned photo swings like a real one.
      const pinLocal = new THREE.Vector2(corner ? -item.w * 0.4 : 0, item.h * 0.42);
      mesh.position.set(-pinLocal.x, -pinLocal.y, 0);
      const pivot = new THREE.Group();
      pivot.add(mesh);
      pivot.position.set(x, y, z);
      pivot.rotation.z = turn;
      put(pivot);
      mesh.castShadow = false;
      pins.push({ at: [x, y, z + 0.004], size: 0.0055, color: pick(pinTints) });
    };

    const amount = a.arrangement === 'stripped' ? Math.round(mix(2, 6, a.crowded)) : Math.round(mix(5, 34, a.crowded) + mood.density * 5);
    const cols = Math.max(2, Math.round(bw / 0.15)), rows = Math.max(2, Math.round(bh / 0.14));
    for (let i = 0; i < amount; i++) {
      const item = chooser();
      let x: number, y: number, turn: number, corner = false;
      if (a.arrangement === 'grid') {
        const cell = i % (cols * rows);
        x = ((cell % cols) + 0.5) / cols * bw - bw / 2 + (random() - 0.5) * 0.012;
        y = bh / 2 - (Math.floor(cell / cols) + 0.5) / rows * bh + item.h * 0.42 + (random() - 0.5) * 0.012;
        turn = (random() - 0.5) * 0.08;
      } else {
        x = (random() - 0.5) * (bw - 0.08);
        y = (random() - 0.5) * (bh - 0.1) + item.h * 0.3;
        turn = (random() - 0.5) * (a.arrangement === 'collage' ? 0.7 : 0.35);
        if (a.arrangement === 'drooping' && random() < 0.55) { corner = true; turn = -mix(0.4, 1.2, random()); y = Math.max(y, -bh * 0.1); }
      }
      pinUp(item, x, y, turn, corner);
    }
    if (a.arrangement === 'stripped') {
      // Lonely pins and the corners that tore off under them.
      for (let i = 0; i < 12 + mood.density * 10; i++) {
        const x = (random() - 0.5) * (bw - 0.04), y = (random() - 0.5) * (bh - 0.04);
        pins.push({ at: [x, y, 0.0105], size: 0.0055, color: pick(pinTints) });
        if (random() < 0.6) {
          const scrap = new THREE.Shape(); scrap.moveTo(-0.012, 0.006); scrap.lineTo(0.014, 0.008); scrap.lineTo(0.006 + random() * 0.01, -0.012 - random() * 0.012); scrap.lineTo(-0.008, -0.006); scrap.closePath();
          const bit = put(new THREE.Mesh(new THREE.ShapeGeometry(scrap), s.material(pick(['#f6f4ec', '#f6f4ec', '#fff48a', '#f09a8a']), { side: THREE.DoubleSide })));
          bit.position.set(x, y, 0.0068 + random() * 0.002); bit.rotation.z = random() * 6.28; bit.castShadow = false;
        }
      }
    }
    // The big photograph everything else is arranged around.
    const cutIndex = a.cut ? Math.floor(random() * 3) : -1;
    layer += 2;
    pinUp(photo(true, cutIndex), (random() - 0.5) * bw * 0.25, bh * mix(0.2, 0.32, random()) * (a.arrangement === 'stripped' ? 0.6 : 1), (random() - 0.5) * 0.16);
    if (a.cut) {
      // The cut-out itself sometimes stays on the ledge.
      const snip = put(new THREE.Mesh(new THREE.CircleGeometry(0.014, 9), s.material(pick(skins), { side: THREE.DoubleSide })));
      snip.position.set(mix(-0.1, 0.1, random()), -bh / 2 - rail - 0.012, 0.03);
      snip.rotation.set(-1.2, random(), 0);
    }

    // Keepsake, properly three-dimensional.
    const kx = (random() < 0.5 ? -1 : 1) * bw * mix(0.22, 0.34, random()), ky = -bh * mix(0.05, 0.22, random()), kz = 0.0068 + layer * 0.0007 + 0.004;
    const dusty = (hex: string) => new THREE.Color(hex).lerp(new THREE.Color('#9a7a5a'), 0.25 + fade * 0.4);
    if (a.keepsake === 'corsage') {
      const petal = s.material(dusty(pick(['#e8a8b8', '#f0e0c8', '#d86a7a', '#e8c88a'])), { roughness: 1 });
      const leaf = s.material(dusty('#5a7a3a'), { roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 3; i++) {
        const cx = kx + (i - 1) * 0.03, cy = ky + (i === 1 ? 0.018 : 0);
        for (let ring = 0; ring < 7; ring++) { const t = ring * 2.4, r = ring * 0.0032; const bud = put(new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), petal)); bud.scale.set(1, 1, 0.6); bud.position.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, kz + 0.016 - ring * 0.0015); }
      }
      for (let i = 0; i < 4; i++) { const blade = put(new THREE.Mesh(new THREE.CircleGeometry(0.02, 5), leaf)); blade.scale.set(0.5, 1.2, 1); blade.position.set(kx + (i - 1.5) * 0.028, ky - 0.012 + (i % 2) * 0.05, kz + 0.002); blade.rotation.z = (i - 1.5) * 0.7; }
      const tails = s.material(dusty(pick(['#f4f0e0', '#c8a8e0', '#e8c63a'])), { roughness: 0.8, side: THREE.DoubleSide });
      for (const side of [-1, 1]) { const tail = put(new THREE.Mesh(new THREE.PlaneGeometry(0.014, mix(0.09, 0.13, random())), tails)); tail.position.set(kx + side * 0.012, ky - 0.075, kz + 0.003); tail.rotation.z = side * 0.14; }
      pins.push({ at: [kx, ky + 0.012, kz + 0.022], size: 0.006, color: '#f4f0e8' });
    } else if (a.keepsake === 'rosette') {
      const tint = pick(['#d8262c', '#2c6fd8', '#f0c82a', '#3aa85a']);
      const pleats = paint(128, 128, (ctx, w) => { ctx.fillStyle = tint; ctx.fillRect(0, 0, w, w); for (let i = 0; i < 28; i++) { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w / 2, w / 2); ctx.lineTo(w / 2 + Math.cos(i / 28 * 6.283) * w, w / 2 + Math.sin(i / 28 * 6.283) * w); ctx.stroke(); } ctx.fillStyle = '#f6f0dc'; ctx.beginPath(); ctx.arc(w / 2, w / 2, w * 0.24, 0, 7); ctx.fill(); ctx.fillStyle = '#2a2a2a'; ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center'; ctx.fillText(pick(['1st', '2nd', '3rd', 'MVP']), w / 2, w / 2 + 12); });
      const ribbonMaterial = s.material(tint, { side: THREE.DoubleSide, roughness: 0.5 });
      for (const side of [-1, 1]) { const tail = put(new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.12), ribbonMaterial)); tail.position.set(kx + side * 0.014, ky - 0.07, kz); tail.rotation.z = side * 0.18; }
      const disc = put(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.006, 28), [ribbonMaterial, new THREE.MeshStandardMaterial({ map: pleats, roughness: 0.5 }), ribbonMaterial]));
      disc.rotation.x = Math.PI / 2; disc.position.set(kx, ky, kz + 0.004);
    } else if (a.keepsake === 'bracelet') {
      const threads = ['#d8262c', '#f0c82a', '#2c6fd8', '#3aa85a', '#f04a98'];
      for (let strand = 0; strand < 3; strand++) {
        const points: [number, number, number][] = [];
        for (let i = 0; i <= 16; i++) { const t = i / 16 * Math.PI * 2; points.push([kx + Math.sin(t) * (0.03 + strand * 0.002), ky - 0.045 + Math.cos(t) * 0.045 + strand * 0.002, kz + 0.002 + strand * 0.002]); }
        const braid = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((q) => new THREE.Vector3(...q)), true), 48, 0.0028, 6, true), s.material(threads[(strand + Math.floor(random() * 5)) % 5], { roughness: 1 }));
        put(braid);
      }
      pins.push({ at: [kx, ky, kz + 0.008], size: 0.0055, color: pick(pinTints) });
    } else if (a.keepsake === 'flower') {
      const petal = s.material(dusty(pick(['#c8a03a', '#a86a8a', '#d8d0b0'])), { roughness: 1, side: THREE.DoubleSide });
      for (let i = 0; i < 7; i++) { const blade = put(new THREE.Mesh(new THREE.CircleGeometry(0.022, 6), petal)); blade.scale.set(0.42, 1, 1); const t = i / 7 * 6.283; blade.position.set(kx + Math.sin(t) * 0.022, ky + Math.cos(t) * 0.022, kz); blade.rotation.z = -t; }
      put(new THREE.Mesh(new THREE.CircleGeometry(0.009, 10), s.material(dusty('#5a3a1c'), { side: THREE.DoubleSide }))).position.set(kx, ky, kz + 0.0006);
      const stem = put(new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.11), s.material(dusty('#5a7a3a'), { side: THREE.DoubleSide }))); stem.position.set(kx + 0.008, ky - 0.075, kz - 0.0004); stem.rotation.z = 0.15;
      const tape = put(new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.013), new THREE.MeshStandardMaterial({ color: '#f0e8c8', transparent: true, opacity: 0.75 }))); tape.position.set(kx + 0.012, ky - 0.1, kz + 0.0008); tape.rotation.z = 0.5; tape.castShadow = false;
    }

    const pinMesh = s.scatter(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.3 }), pins);
    board.add(pinMesh);

    if (a.lights) {
      const cable: [number, number, number][] = [];
      const bulbs = [];
      const n = 11;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = (t - 0.5) * (bw + 0.1), y = bh / 2 + rail + 0.006 - Math.abs(Math.sin(t * Math.PI * 3)) * 0.03 - (i === 0 || i === n ? 0.14 : 0);
        cable.push([x, y, 0.016]);
        if (i > 0 && i < n) bulbs.push({ at: [x, y - 0.012, 0.02] as const, size: 0.008, color: pick(['#fff0b0', '#ffd0a0', '#ffe8c8']) });
      }
      const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cable.map((q) => new THREE.Vector3(...q))), 60, 0.0018, 5), s.material('#2a3a2a'));
      put(wire);
      const glow = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: '#ffd890', emissiveIntensity: mix(0.6, 1.6, mood.cheer) }), bulbs);
      glow.castShadow = false;
      board.add(glow);
    }

    // Easel: two front legs in the board's plane, a ledge, and one leg behind.
    const wood = s.material('#c9a06a', { roughness: 0.7 });
    const drop = mix(0.1, 0.16, random());
    const apex = new THREE.Vector3(0, bh / 2 + rail + 0.07, -0.022);
    const leg = (to: THREE.Vector3) => {
      const direction = to.clone().sub(apex);
      const mesh = put(new THREE.Mesh(new THREE.BoxGeometry(0.022, direction.length(), 0.016), wood));
      mesh.position.copy(apex).addScaledVector(direction, 0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    };
    const feet = [-1, 1].map((side) => new THREE.Vector3(side * bw * 0.4, -bh / 2 - rail - drop, -0.022));
    feet.forEach(leg);
    put(new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, 0.018, 0.05), wood)).position.set(0, -bh / 2 - rail - 0.009, 0.004);
    const lean = mix(0.16, 0.26, random());
    board.rotation.x = -lean;
    board.updateMatrixWorld(true);
    const top = board.localToWorld(apex.clone()), foot = board.localToWorld(feet[0].clone());
    s.rod([top.x, top.y, top.z], [0, foot.y, top.z - (top.y - foot.y) * 0.5], 0.01, wood);
    return s.finish();
  },
});
