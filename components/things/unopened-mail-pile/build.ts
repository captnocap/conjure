import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

type Kind = 'bill' | 'white' | 'brown' | 'flyer' | 'menu' | 'card';
const SIZE: Record<Kind, [number, number]> = { bill: [0.22, 0.11], white: [0.22, 0.11], brown: [0.25, 0.176], flyer: [0.21, 0.148], menu: [0.21, 0.1], card: [0.17, 0.125] };
const MIXES: Record<string, Kind[]> = {
  bills: ['bill', 'bill', 'bill', 'white', 'flyer', 'bill'],
  official: ['brown', 'brown', 'bill', 'brown', 'white'],
  junk: ['flyer', 'menu', 'flyer', 'menu', 'white', 'flyer', 'bill'],
  cards: ['card', 'card', 'card', 'white', 'card', 'flyer'],
  mixed: ['bill', 'white', 'brown', 'flyer', 'menu', 'bill', 'card'],
};

export default defineThing({
  questions: {
    size: score('How big is the pile?', ['A couple of days: five or six envelopes', 'A few weeks', 'Months of it', 'A drift deep enough to lose things in']),
    letter: choice('What has happened to the one hand-addressed letter?', {
      sealed: 'It lies on top of everything, still sealed.',
      opened: 'It has been opened, and the handwritten page lies unfolded beside its envelope.',
      torn: 'Its flap is half torn, then it was put down again.',
      buried: 'It is buried: only a corner shows from under the bills.',
      none: 'There is no personal letter at all, only the rest.',
    }),
    kind: choice('What is most of the pile?', {
      bills: 'White window envelopes from banks and utilities, stamped in red.',
      official: 'Brown government envelopes with black crests.',
      junk: 'Junk: takeaway menus, estate-agent flyers, catalogues.',
      cards: 'Coloured greetings-card envelopes nobody has opened.',
      mixed: 'A bit of everything.',
    }),
    stamp: choice('What do the red stamps say?', {
      final: 'FINAL NOTICE',
      overdue: 'OVERDUE',
      urgent: 'URGENT',
      ignore: 'DO NOT IGNORE',
      court: 'COURT SUMMONS',
    }),
    hand: choice('If there is a personal letter, what does its envelope look like?', {
      cream: 'Heavy cream paper addressed in blue fountain pen.',
      pink: 'A pink envelope with a heart sticker on the back flap.',
      airmail: 'A thin airmail envelope with a red and blue striped border.',
      crayon: 'A child’s wobbly crayon handwriting in several colours.',
      black: 'A black-bordered envelope, the kind that brings bad news.',
    }),
    where: choice('Where has it piled up?', {
      mat: 'On a coir doormat, where it fell through the letterbox.',
      table: 'On the corner of a wooden table.',
      tray: 'In and over a plastic in-tray that gave up long ago.',
      bare: 'Straight on the bare surface.',
    }),
    extra: choice('What else lies with it?', {
      keys: 'A bunch of keys dropped on top.',
      pen: 'A pen and a letter opener, laid out and never used.',
      mug: 'A mug that has left coffee rings on the envelopes.',
      bands: 'Red rubber bands from the postman.',
      card: 'A red “sorry we missed you” delivery card.',
      nothing: 'Nothing.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const sat = mix(0.6, 1.1, mood.cheer);
    const stampText = { final: 'FINAL NOTICE', overdue: 'OVERDUE', urgent: 'URGENT', ignore: 'DO NOT IGNORE', court: 'COURT SUMMONS' }[a.stamp];
    const age = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = `rgba(150,120,60,${mood.wear * 0.22})`; ctx.fillRect(0, 0, w, h);
      if (mood.wear > 0.5 && random() < 0.4) { ctx.strokeStyle = 'rgba(110,70,30,0.45)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(random() * w, random() * h, 34, 0, 7); ctx.stroke(); }
    };
    const scrawl = (ctx: CanvasRenderingContext2D, x: number, y: number, len: number, colour: string, weight = 3, wobble = 5) => {
      ctx.strokeStyle = colour; ctx.lineWidth = weight; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 1; i <= Math.floor(len / 7); i++) ctx.lineTo(x + i * 7, y + (i % 2 ? -wobble : wobble) * (0.4 + random()) + Math.sin(i * 0.7) * 2);
      ctx.stroke();
    };
    const redStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size = 30) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate((random() - 0.5) * 0.35);
      ctx.font = `bold ${size}px monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = Math.min(ctx.measureText(text).width, 300) + 18;
      ctx.strokeStyle = '#d01f1f'; ctx.lineWidth = 5; ctx.strokeRect(-tw / 2, -size * 0.75, tw, size * 1.5);
      ctx.fillStyle = '#d01f1f'; ctx.fillText(text, 0, 2, 300);
      ctx.restore();
    };
    const windowPane = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
      ctx.fillStyle = '#c9d6d9'; ctx.beginPath(); ctx.roundRect(x, y, 190, 84, 12); ctx.fill();
      ctx.fillStyle = '#3b3f46'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 16, y + 14 + i * 16, 80 + random() * 80, 6);
    };
    const frank = (ctx: CanvasRenderingContext2D, w: number) => {
      ctx.strokeStyle = '#b8342c'; ctx.lineWidth = 3; ctx.strokeRect(w - 96, 16, 76, 44);
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w - 190, 22 + i * 10); ctx.bezierCurveTo(w - 170, 14 + i * 10, w - 140, 32 + i * 10, w - 108, 22 + i * 10); ctx.stroke(); }
    };
    const painters: Record<Kind, Draw> = {
      bill: (ctx, w, h) => {
        ctx.fillStyle = '#f4f3ee'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `hsl(${pick([210, 355, 140, 265, 30])},${60 * sat}%,40%)`; ctx.fillRect(24, 22, 54, 40); ctx.fillRect(88, 30, 110, 10); ctx.fillRect(88, 48, 70, 8);
        windowPane(ctx, 30, h - 120); frank(ctx, w);
        redStamp(ctx, w - 170, h - 80, stampText, 34);
        age(ctx, w, h);
      },
      white: (ctx, w, h) => {
        ctx.fillStyle = '#f1f0ea'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `hsl(${random() * 360},${45 * sat}%,42%)`; ctx.beginPath(); ctx.arc(52, 46, 24, 0, 7); ctx.fill(); ctx.fillRect(86, 38, 120, 12);
        windowPane(ctx, 30, h - 120); frank(ctx, w);
        if (random() < 0.4) redStamp(ctx, w - 160, h - 70, pick(['IMPORTANT', 'PRIVATE', stampText]), 26);
        age(ctx, w, h);
      },
      brown: (ctx, w, h) => {
        ctx.fillStyle = '#c4a067'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(60, 58, 30, 0, 7); ctx.fill(); ctx.fillRect(100, 40, 200, 10); ctx.fillRect(100, 60, 140, 8);
        ctx.fillStyle = '#c4a067'; ctx.beginPath(); ctx.arc(60, 58, 18, 0, 7); ctx.fill(); ctx.fillStyle = '#16161a'; ctx.fillRect(52, 44, 16, 28);
        windowPane(ctx, 40, h - 150); frank(ctx, w);
        if (random() < 0.6) redStamp(ctx, w - 170, h - 90, stampText, 34);
        age(ctx, w, h);
      },
      flyer: (ctx, w, h) => {
        const hue = random() * 360;
        ctx.fillStyle = `hsl(${hue},${80 * sat}%,52%)`; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = `hsl(${(hue + 50) % 360},${90 * sat}%,62%)`; ctx.beginPath(); ctx.arc(w * 0.76, h * 0.62, h * 0.36, 0, 7); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 76px monospace'; ctx.textBaseline = 'middle';
        ctx.fillText(pick(['SALE', '2 FOR 1', 'WE BUY', 'VOTE', 'FREE!', 'SOLD', 'LOANS', '50% OFF']), 24, h * 0.3, w - 48);
        ctx.fillStyle = '#17171b'; ctx.fillRect(24, h * 0.56, w * 0.42, 14); ctx.fillRect(24, h * 0.68, w * 0.34, 10); ctx.fillRect(24, h * 0.8, w * 0.38, 10);
        age(ctx, w, h);
      },
      menu: (ctx, w, h) => {
        const hue = pick([4, 28, 48, 120]);
        ctx.fillStyle = `hsl(${hue},${82 * sat}%,46%)`; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#fff3c8'; ctx.font = 'bold 60px monospace'; ctx.textBaseline = 'middle'; ctx.fillText(pick(['PIZZA', 'KEBAB', 'CURRY', 'WOK', 'CHICKEN']), 20, 50, w * 0.55);
        ctx.fillStyle = '#fff3c8'; ctx.beginPath(); ctx.arc(w - 90, h / 2, 62, 0, 7); ctx.fill();
        ctx.fillStyle = `hsl(${hue},${82 * sat}%,40%)`; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(w - 90 + Math.cos(i) * 34, h / 2 + Math.sin(i * 2.3) * 34, 9, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#fff3c8'; for (let i = 0; i < 4; i++) ctx.fillRect(20, 98 + i * 22, 130 + random() * 90, 8);
        age(ctx, w, h);
      },
      card: (ctx, w, h) => {
        ctx.fillStyle = `hsl(${random() * 360},${50 * sat}%,${68 + random() * 12}%)`; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 3; i++) scrawl(ctx, w * 0.3, h * 0.45 + i * 34, w * 0.4 - i * 20, '#2a2f55', 4);
        ctx.fillStyle = '#b8342c'; ctx.fillRect(w - 86, 20, 60, 72); ctx.fillStyle = '#f1e0c8'; ctx.beginPath(); ctx.arc(w - 56, 52, 18, 0, 7); ctx.fill();
        age(ctx, w, h);
      },
    };
    const edge = new THREE.MeshStandardMaterial({ color: '#e6e3d8', roughness: 0.9 });
    const faceOf = (texture: THREE.Texture) => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82 });
    const sheetMaterials = (face: THREE.Material) => [edge, edge, face, edge, edge, edge];
    const multi = (mesh: THREE.Mesh, materials: THREE.Material[]) => { (mesh as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>).material = materials; return mesh; };
    const variants = new Map<Kind, THREE.Material[]>();
    const faceFor = (kind: Kind) => {
      if (!variants.has(kind)) variants.set(kind, Array.from({ length: kind === 'flyer' || kind === 'bill' ? 4 : 3 }, () => faceOf(paint(512, Math.round(512 * SIZE[kind][1] / SIZE[kind][0]), painters[kind]))));
      return pick(variants.get(kind)!);
    };

    // ----- Where it lies: a height map that every sheet settles onto -----
    const G = 80, SPAN = 1.3, cell = SPAN / G;
    const heights = new Float32Array(G * G);
    const cellOf = (v: number) => Math.min(G - 1, Math.max(0, Math.floor((v + SPAN / 2) / cell)));
    const heightAt = (x: number, z: number) => heights[cellOf(z) * G + cellOf(x)];
    const raise = (x0: number, x1: number, z0: number, z1: number, y: number) => { for (let k = cellOf(z0); k <= cellOf(z1); k++) for (let i = cellOf(x0); i <= cellOf(x1); i++) heights[k * G + i] = Math.max(heights[k * G + i], y); };
    let centreX = 0, centreZ = 0;
    if (a.where === 'mat') {
      const coir = paint(256, 160, (ctx, w, h) => {
        ctx.fillStyle = '#8a6a3c'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(60,40,15,0.5)' : 'rgba(190,150,90,0.5)'; ctx.fillRect(random() * w, random() * h, 2, 3); }
        ctx.fillStyle = `rgba(30,22,12,${mix(0.8, 0.3, mood.wear)})`; ctx.font = 'bold 54px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(pick(['WELCOME', 'HOME', 'HELLO', 'GO AWAY', 'WIPE FEET']), w / 2, h / 2, w - 30);
        ctx.strokeStyle = 'rgba(30,22,12,0.6)'; ctx.lineWidth = 8; ctx.strokeRect(8, 8, w - 16, h - 16);
      });
      const dark = new THREE.MeshStandardMaterial({ color: '#6f5530', roughness: 1 });
      multi(s.box([0.78, 0.016, 0.48], [0, 0.008, 0], dark), [dark, dark, new THREE.MeshStandardMaterial({ map: coir, roughness: 1 }), dark, dark, dark]);
      raise(-0.39, 0.39, -0.24, 0.24, 0.016);
      centreZ = -0.05;
    } else if (a.where === 'table') {
      const wood = paint(256, 256, (ctx, w, h) => {
        ctx.fillStyle = pick(['#a8794a', '#7a5334', '#c9a56c', '#5f4630']); ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i++) { ctx.strokeStyle = `rgba(40,25,10,${0.05 + random() * 0.12})`; ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); const y = random() * h; ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + (random() - 0.5) * 20, w * 0.7, y + (random() - 0.5) * 20, w, y + (random() - 0.5) * 10); ctx.stroke(); }
        if (mood.wear > 0.3) for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(240,230,210,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(random() * w, random() * h, 22, 0, 7); ctx.stroke(); }
      });
      const side = new THREE.MeshStandardMaterial({ color: '#6a4a2e', roughness: 0.7 });
      multi(s.box([0.8, 0.035, 0.56], [0, 0.0175, 0], side), [side, side, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 }), side, side, side]);
      raise(-0.4, 0.4, -0.28, 0.28, 0.035);
    } else if (a.where === 'tray') {
      const plastic = s.material(pick(['#23252a', '#6f7f8a', '#b8342c', '#2f5f8f']), { roughness: 0.5 });
      const tw = 0.36, td = 0.27, th = 0.06;
      centreX = -0.08; centreZ = -0.05;
      s.box([tw, 0.006, td], [centreX, 0.003, centreZ], plastic);
      for (const k of [-1, 1]) { s.box([0.006, th, td], [centreX + k * tw / 2, th / 2, centreZ], plastic); raise(centreX + k * tw / 2 - 0.006, centreX + k * tw / 2 + 0.006, centreZ - td / 2, centreZ + td / 2, th); }
      s.box([tw, th, 0.006], [centreX, th / 2, centreZ - td / 2], plastic);
      raise(centreX - tw / 2, centreX + tw / 2, centreZ - td / 2 - 0.006, centreZ - td / 2 + 0.006, th);
      s.box([tw, th * 0.35, 0.006], [centreX, th * 0.175, centreZ + td / 2], plastic);
      raise(centreX - tw / 2, centreX + tw / 2, centreZ + td / 2 - 0.006, centreZ + td / 2 + 0.006, th * 0.35);
      raise(centreX - tw / 2, centreX + tw / 2, centreZ - td / 2, centreZ + td / 2, 0.006);
    }

    /** Let a flat sheet come to rest on whatever is under it; returns the mesh. */
    const settle = (mesh: THREE.Mesh, x: number, z: number, yaw: number, w: number, d: number, th: number) => {
      const c = Math.cos(yaw), sn = Math.sin(yaw);
      const pts: [number, number, number][] = [];
      for (const fu of [-0.46, -0.23, 0, 0.23, 0.46]) for (const fv of [-0.44, 0, 0.44]) { const u = fu * w, v = fv * d; pts.push([u, v, heightAt(x + u * c + v * sn, z - u * sn + v * c)]); }
      let su = 0, sv = 0, suu = 0, svv = 0;
      for (const [u, v, h] of pts) { su += u * h; sv += v * h; suu += u * u; svv += v * v; }
      const slopeU = Math.max(-0.28, Math.min(0.28, su / suu * 0.7)), slopeV = Math.max(-0.28, Math.min(0.28, sv / svv * 0.7));
      // Rest on the three highest points rather than the single highest, so paper sags instead of bridging.
      const gaps = pts.map(([u, v, h]) => h - slopeU * u - slopeV * v).sort((p, q) => q - p);
      const lift = (gaps[0] + gaps[1] + gaps[2] + gaps[3]) / 4;
      const r = Math.hypot(w, d) / 2;
      for (let k = cellOf(z - r); k <= cellOf(z + r); k++) for (let i = cellOf(x - r); i <= cellOf(x + r); i++) {
        const dx = (i + 0.5) * cell - SPAN / 2 - x, dz = (k + 0.5) * cell - SPAN / 2 - z;
        const u = dx * c - dz * sn, v = dx * sn + dz * c;
        if (Math.abs(u) <= w / 2 && Math.abs(v) <= d / 2) heights[k * G + i] = Math.max(heights[k * G + i], lift + slopeU * u + slopeV * v + th);
      }
      mesh.rotation.order = 'YXZ';
      mesh.rotation.set(-Math.atan(slopeV), yaw, Math.atan(slopeU));
      mesh.position.set(x, lift + th / 2 + 0.0005, z);
      return mesh;
    };

    // ----- The slide -----
    const total = Math.round(mix(5, 64, a.size ** 1.25) + mood.density * 6);
    const spread = mix(0.07, 0.26, a.size);
    const slideDir = mix(0.5, 2.4, random());
    const slideLen = mix(0.1, 0.5, a.size) * mix(0.7, 1.3, mood.energy);
    const kinds = MIXES[a.kind];
    const geometries = new Map<string, THREE.BoxGeometry>();
    const sheetGeometry = (w: number, d: number, th: number) => { const key = `${w}|${d}|${th}`; if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, th, d)); return geometries.get(key)!; };
    const gaussian = () => (random() + random() + random() - 1.5) / 1.5;
    const drop = (kind: Kind, t: number) => {
      const [w, d] = SIZE[kind];
      const th = kind === 'flyer' || kind === 'menu' ? 0.0012 : pick([0.002, 0.003, 0.003, 0.005]);
      const x = centreX + Math.cos(slideDir) * t * slideLen + gaussian() * spread, z = centreZ + Math.sin(slideDir) * t * slideLen + gaussian() * spread * 0.8;
      const yaw = (random() - 0.5) * mix(0.9, 3.2, mood.energy * 0.6 + a.size * 0.4) + (random() < 0.2 ? Math.PI : 0);
      const mesh = multi(s.mesh(sheetGeometry(w, d, th), edge), sheetMaterials(faceFor(kind)));
      settle(mesh, x, z, yaw, w, d, th);
    };

    const handStyle = a.hand;
    const handFace = () => faceOf(paint(512, 360, (ctx, w, h) => {
      const paper = { cream: '#f3e7c6', pink: '#f4a9c0', airmail: '#eaf1f6', crayon: '#fbf7e8', black: '#f4f2ec' }[handStyle];
      ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
      if (handStyle === 'airmail') for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? '#c8302a' : '#2456a8'; const p = i * 46; ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.rect(22, 22, w - 44, h - 44); ctx.clip('evenodd'); ctx.translate(p - 400, 0); ctx.transform(1, 0, -0.6, 1, 0, 0); ctx.fillRect(0, 0, 24, h * 3); ctx.restore(); }
      if (handStyle === 'black') { ctx.strokeStyle = '#111114'; ctx.lineWidth = 26; ctx.strokeRect(13, 13, w - 26, h - 26); }
      const ink = { cream: '#1f3a9a', pink: '#7a1f4a', airmail: '#1b1c22', crayon: '#d8402c', black: '#111114' }[handStyle];
      const crayons = ['#d8402c', '#2f8fd8', '#3aa86b', '#e0a020', '#7a4fc8'];
      for (let i = 0; i < 4; i++) scrawl(ctx, 130 + i * 14, 150 + i * 46, 250 - i * 36, handStyle === 'crayon' ? crayons[i] : ink, handStyle === 'crayon' ? 12 : 6, handStyle === 'crayon' ? 14 : 8);
      ctx.fillStyle = `hsl(${random() * 360},${60 * sat}%,45%)`; ctx.fillRect(w - 110, 34, 76, 92);
      ctx.fillStyle = '#f6efe0'; ctx.fillRect(w - 102, 42, 60, 76); ctx.fillStyle = '#3a4a6a'; ctx.beginPath(); ctx.arc(w - 72, 76, 20, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(20,20,30,0.6)'; ctx.lineWidth = 3; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(w - 250, 50 + i * 12); ctx.bezierCurveTo(w - 210, 38 + i * 12, w - 170, 62 + i * 12, w - 120, 50 + i * 12); ctx.stroke(); }
      if (handStyle === 'pink') { ctx.fillStyle = '#d8203a'; ctx.beginPath(); ctx.moveTo(70, 80); ctx.bezierCurveTo(30, 40, 20, 90, 70, 120); ctx.bezierCurveTo(120, 90, 110, 40, 70, 80); ctx.fill(); }
      if (a.letter === 'torn') { ctx.fillStyle = '#b9b2a0'; ctx.beginPath(); ctx.moveTo(0, 0); for (let x = 0; x <= w * 0.62; x += 14) ctx.lineTo(x, 12 + random() * 22); ctx.lineTo(w * 0.62, 0); ctx.fill(); }
      age(ctx, w, h);
    }));
    const dropHand = (onTop: boolean) => {
      const w = 0.2, d = 0.14, th = 0.004;
      const x = centreX + Math.cos(slideDir) * (onTop ? 0.25 : 0.9) * slideLen + (random() - 0.5) * 0.04, z = centreZ + Math.sin(slideDir) * (onTop ? 0.25 : 0.9) * slideLen + (onTop ? 0.02 : 0.05);
      const yaw = (random() - 0.5) * 0.7;
      const mesh = multi(s.mesh(sheetGeometry(w, d, th), edge), sheetMaterials(handFace()));
      settle(mesh, x, z, yaw, w, d, th);
      if (a.letter === 'opened') {
        // The flap stands up and the page lies unfolded half over the envelope.
        const flap = new THREE.Shape(); flap.moveTo(-w / 2, 0); flap.lineTo(w / 2, 0); flap.lineTo(0, d * 0.55); flap.closePath();
        const f = new THREE.Mesh(new THREE.ShapeGeometry(flap), new THREE.MeshStandardMaterial({ color: { cream: '#e9dcb8', pink: '#e894ae', airmail: '#dfe8ee', crayon: '#f1ecd9', black: '#e6e3da' }[handStyle], roughness: 0.85, side: THREE.DoubleSide }));
        f.position.set(0, th / 2 + 0.001, -d / 2); f.rotation.x = -mix(0.5, 1.3, random()); f.castShadow = true; mesh.add(f);
        const page = paint(256, 360, (ctx, pw, ph) => {
          ctx.fillStyle = '#fbf8ee'; ctx.fillRect(0, 0, pw, ph);
          const ink = handStyle === 'crayon' ? '#d8402c' : handStyle === 'pink' ? '#7a1f4a' : '#1f3a9a';
          scrawl(ctx, 24, 34, 90, ink, 4);
          for (let i = 0; i < 12; i++) scrawl(ctx, 24, 70 + i * 21, i === 11 ? 80 : 190 + random() * 20, ink, 3, 4);
          scrawl(ctx, 130, 330, 80, ink, 5, 7);
          age(ctx, pw, ph);
        });
        const pw = 0.19, pl = 0.27;
        const g = new THREE.PlaneGeometry(pw, pl, 1, 3);
        g.rotateX(-Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const band = Math.round((p.getZ(i) / pl + 0.5) * 3); p.setY(i, band % 2 ? 0.018 : 0); }
        g.computeVertexNormals();
        const sheet = s.mesh(g, new THREE.MeshStandardMaterial({ map: page, roughness: 0.85, side: THREE.DoubleSide }), [0, 0, 0]);
        const sx = x + Math.cos(yaw + 0.4) * 0.17, sz = z + 0.07 + Math.sin(yaw) * 0.05;
        settle(sheet, sx, sz, yaw + 0.5 + (random() - 0.5) * 0.4, pw, pl, 0.02);
        sheet.position.y -= 0.009;
      } else if (a.letter === 'torn') {
        const sliver = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, 0.03), new THREE.MeshStandardMaterial({ color: '#fbf8ee', roughness: 0.85, side: THREE.DoubleSide }));
        sliver.position.set(-w * 0.18, th / 2 + 0.006, -d / 2 + 0.006); sliver.rotation.x = -0.9; mesh.add(sliver);
      }
    };

    const buriedAt = Math.floor(total * 0.35);
    for (let i = 0; i < total; i++) {
      if (a.letter === 'buried' && i === buriedAt) dropHand(false);
      const t = (i / Math.max(total - 1, 1)) ** 0.8 * (0.3 + random() * 0.7);
      drop(i < 2 ? kinds[i] : pick(kinds), random() < 0.75 ? t : random());
    }
    if (a.letter !== 'buried' && a.letter !== 'none') dropHand(true);

    // ----- Extras -----
    const ex = centreX - Math.cos(slideDir) * 0.05 - 0.14, ez = centreZ + 0.16;
    const restY = (x: number, z: number) => heightAt(x, z);
    if (a.extra === 'keys') {
      const brass = s.material('#c9a23a', { metalness: 0.85, roughness: 0.3 });
      const steel = s.material('#c5c9cd', { metalness: 0.9, roughness: 0.25 });
      const kx = centreX + 0.04, kz = centreZ + 0.03, y = restY(kx, kz) + 0.005;
      s.ring(0.016, 0.0016, [kx, y, kz], steel).rotation.x = Math.PI / 2 - 0.2;
      for (let i = 0; i < 3 + Math.floor(random() * 2); i++) {
        const ang = random() * 6.28, m = i % 2 ? brass : steel;
        const key = new THREE.Group(); key.position.set(kx, y, kz); key.rotation.y = ang;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.002, 12), m); head.position.x = 0.022; head.castShadow = true; key.add(head);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.002, 0.006), m); blade.position.x = 0.048; blade.castShadow = true; key.add(blade);
        s.root.add(key);
      }
      const fob = s.box([0.03, 0.006, 0.045], [kx - 0.035, y + 0.002, kz + 0.02], s.material(pick(['#d8402c', '#2f8fd8', '#3aa86b', '#17171b'])));
      fob.rotation.y = random() * 3;
    } else if (a.extra === 'pen') {
      const px = ex + 0.02, pz = ez + 0.06, y = Math.max(restY(px, pz), restY(px + 0.06, pz)) + 0.006;
      const pen = s.rod([px - 0.07, y, pz + 0.02], [px + 0.07, y, pz - 0.02], 0.005, s.material(pick(['#1f3a9a', '#17171b', '#b8342c'])));
      pen.castShadow = true;
      s.rod([px + 0.07, y, pz - 0.02], [px + 0.085, y, pz - 0.024], 0.004, s.material('#c5c9cd', { metalness: 0.8 }), 0.0008);
      const y2 = Math.max(restY(px, pz + 0.05), restY(px + 0.06, pz + 0.05)) + 0.004;
      s.box([0.13, 0.002, 0.014], [px + 0.01, y2 + 0.002, pz + 0.055], s.material('#c5c9cd', { metalness: 0.9, roughness: 0.2 })).rotation.y = 0.2;
      s.box([0.07, 0.008, 0.02], [px - 0.085, y2 + 0.004, pz + 0.075], s.material('#5a3a22')).rotation.y = 0.2;
    } else if (a.extra === 'mug') {
      const mx = centreX - Math.cos(slideDir) * 0.12, mz = centreZ - Math.sin(slideDir) * 0.1, y = restY(mx, mz);
      const tone = s.material(new THREE.Color().setHSL(random(), 0.5 * sat, 0.55));
      s.cylinder(0.042, 0.037, 0.095, [mx, y + 0.0475, mz], tone, 20);
      s.cylinder(0.036, 0.036, 0.004, [mx, y + 0.085, mz], s.material('#3a2414', { roughness: 0.15 }), 20);
      s.ring(0.027, 0.007, [mx + 0.048, y + 0.048, mz], tone);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.034, 0.04, 24), new THREE.MeshBasicMaterial({ color: '#6a4424', transparent: true, opacity: 0.55, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(mx + 0.09, restY(mx + 0.09, mz + 0.05) + 0.002, mz + 0.05); s.root.add(ring);
    } else if (a.extra === 'bands') {
      for (let i = 0; i < 4 + Math.floor(mood.density * 5); i++) {
        const bx = centreX + gaussian() * 0.22, bz = centreZ + gaussian() * 0.18 + 0.05;
        const band = s.ring(0.022 + random() * 0.008, 0.0016, [bx, restY(bx, bz) + 0.003, bz], s.material('#c8302a', { roughness: 0.6 }));
        band.rotation.set(Math.PI / 2, 0, random() * 3); band.scale.set(1, 0.5 + random() * 0.5, 1);
      }
    } else if (a.extra === 'card') {
      const tex = paint(256, 384, (ctx, w, h) => {
        ctx.fillStyle = '#d02a22'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
        ctx.fillText('SORRY', w / 2, 60); ctx.fillText('WE', w / 2, 110); ctx.fillText('MISSED', w / 2, 160); ctx.fillText('YOU', w / 2, 210);
        ctx.fillRect(24, 250, w - 48, 110); scrawl(ctx, 40, 290, 150, '#1f3a9a', 4); scrawl(ctx, 40, 330, 100, '#1f3a9a', 4);
      });
      const card = multi(s.mesh(sheetGeometry(0.1, 0.15, 0.001), edge), sheetMaterials(faceOf(tex)));
      settle(card, centreX + Math.cos(slideDir) * slideLen * 0.6 - 0.1, centreZ + Math.sin(slideDir) * slideLen * 0.6 + 0.06, (random() - 0.5) * 1.2, 0.1, 0.15, 0.001);
    }

    return s.finish();
  },
});
