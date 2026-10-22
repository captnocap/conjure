import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';
import { type P3, grime, paintTexture, painted, put, write } from './lib';

const SIGNS = { snack: 'SNACK BAR', refresh: 'REFRESHMENTS', eats: 'EATS', concessions: 'CONCESSIONS' } as const;
const SCHEMES = {
  mint: { wall: '#cfe6d6', accent: '#d2392f', neon: '#ff5b4a' },
  turquoise: { wall: '#f1eee4', accent: '#27a6a4', neon: '#4fe3df' },
  mustard: { wall: '#e3c069', accent: '#6b3f22', neon: '#ffb13b' },
  pink: { wall: '#f2b8c2', accent: '#26252a', neon: '#ff6fb1' },
} as const;

export default defineThing({
  questions: {
    service: choice('What is happening at the serving hatch?', {
      open: 'Open and glowing, one clerk in a paper hat waiting for the next car door to slam.',
      rush: 'Mid-intermission rush: a crowd of kids in pyjamas and parents pressed along the counter.',
      closing: 'Last call: half the lights off, nobody behind the counter, a broom leaning by the door.',
      shuttered: 'Shuttered for the season, steel roll-down pulled and a card taped to it.',
    }),
    scheme: choice('What colours is it painted?', {
      mint: 'Mint-green block with tomato-red trim, a 1950s ice-cream parlour.',
      turquoise: 'White block with turquoise trim and aqua neon.',
      mustard: 'Mustard and chocolate brown, repainted once in 1974.',
      pink: 'Candy pink with black trim and hot-pink neon.',
    }),
    sign: choice('What does the lettering say?', {
      snack: 'SNACK BAR', refresh: 'REFRESHMENTS', eats: 'EATS', concessions: 'CONCESSIONS',
    }),
    roof: choice('What is on the roof?', {
      letters: 'The sign in tall freestanding letters on a rail.',
      cup: 'A giant striped soda cup with a straw, and the sign on the canopy edge below it.',
      festoon: 'A mast with strings of coloured bulbs running down to the canopy corners.',
      bare: 'Nothing but tar paper and a vent pipe; the sign is painted on the canopy edge.',
    }),
    special: choice('What does the menu board push hardest?', {
      hotdogs: 'Foot-long hot dogs.',
      popcorn: 'Fresh buttered popcorn.',
      pizza: 'Pizza by the slice, the new thing.',
      icecream: 'Soft-serve cones and sundaes.',
    }),
    outside: choice('What stands outside by the wall?', {
      nothing: 'Nothing.',
      barrel: 'An oil-drum trash barrel, full to the brim after the first feature.',
      table: 'A splintery picnic table.',
      gumballs: 'A row of gumball and toy-capsule machines.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const scheme = SCHEMES[a.scheme];
    const live = a.service !== 'shuttered';
    const bright = a.service === 'closing' ? 0.45 : 1;
    const worn = (colour: string, amount = 0.3) => new THREE.Color(colour).lerp(new THREE.Color('#8d8674'), mood.wear * amount);
    const BW = 7.2, BD = 4, BH = 2.7, T = 0.2, front = BD / 2;

    // Painted cinder block, two blocks by two courses, repeated across each wall.
    const blocks = paintTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = `#${worn(scheme.wall).getHexString()}`; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,55,45,0.35)'; ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w / 2, h / 2); ctx.strokeRect(w / 2, 0, w / 2, h / 2);
      ctx.strokeRect(-w / 4, h / 2, w / 2, h / 2); ctx.strokeRect(w / 4, h / 2, w / 2, h / 2); ctx.strokeRect(w * 0.75, h / 2, w / 2, h / 2);
      grime(ctx, w, h, mood.wear * 0.5, random);
    });
    blocks.wrapS = blocks.wrapT = THREE.RepeatWrapping;
    const wall = (w: number, h: number, at: P3, turned = false) => {
      const map = blocks.clone();
      map.repeat.set(w / 0.8, h / 0.4);
      map.needsUpdate = true;
      const mesh = s.box([w, h, T], at, new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
      if (turned) mesh.rotation.y = Math.PI / 2;
      return mesh;
    };
    const hx0 = -3.0, hx1 = 1.2, hy0 = 1.0, hy1 = 2.15, hw = hx1 - hx0, hc = (hx0 + hx1) / 2;
    wall(BW, BH, [0, BH / 2, -front]);
    wall(BD, BH, [-BW / 2 + T / 2, BH / 2, 0], true);
    wall(BD, BH, [BW / 2 - T / 2, BH / 2, 0], true);
    wall(BW, hy0, [0, hy0 / 2, front]);
    wall(BW, BH - hy1, [0, (BH + hy1) / 2, front]);
    wall(hx0 + BW / 2, hy1 - hy0, [(hx0 - BW / 2) / 2, (hy0 + hy1) / 2, front]);
    wall(BW / 2 - hx1, hy1 - hy0, [(hx1 + BW / 2) / 2, (hy0 + hy1) / 2, front]);
    const accent = s.material(worn(scheme.accent), { roughness: 0.6 });
    const steel = s.material(worn('#b9bdbb', 0.4), { metalness: 0.6, roughness: 0.4 });
    const dark = s.material('#26272a', { roughness: 0.8 });
    s.box([BW + 0.02, 0.16, BD + 0.02], [0, 0.82, 0], accent);
    s.box([BW - 0.4, 0.05, BD - 0.4], [0, 0.03, 0], dark);

    // Roof slab running forward into a canopy on V posts.
    const roofZ = 1.15, roofD = BD + 2.7, edge = roofZ + roofD / 2;
    s.box([BW + 0.7, 0.2, roofD], [0, BH + 0.1, roofZ], s.material(worn('#e9e6dc'), { roughness: 0.9 }));
    // Tar-and-gravel deck with patches, a grease vent and a swamp cooler, for anyone looking down on it.
    const tar = painted(BW + 0.5, roofD - 0.2, (ctx, w, h) => {
      ctx.fillStyle = '#77736a'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { ctx.fillStyle = random() < 0.5 ? 'rgba(210,205,190,0.35)' : 'rgba(40,38,34,0.3)'; ctx.fillRect(random() * w, random() * h, 2, 2); }
      for (let i = 0; i < 3 + mood.wear * 8; i++) { ctx.fillStyle = 'rgba(38,36,34,0.75)'; ctx.fillRect(random() * w * 0.9, random() * h * 0.9, w * (0.05 + random() * 0.12), h * (0.04 + random() * 0.1)); }
      ctx.strokeStyle = 'rgba(30,30,28,0.5)'; ctx.lineWidth = 2;
      for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo((i / 6) * w, 0); ctx.lineTo((i / 6) * w, h); ctx.stroke(); }
    }, { px: 384, roughness: 1 });
    tar.rotation.x = -Math.PI / 2;
    put(s.root, tar, [0, BH + 0.205, roofZ]);
    s.box([0.9, 0.5, 0.7], [2.3, BH + 0.45, -1], s.material(worn('#aab0ad', 0.5), { metalness: 0.4, roughness: 0.6 }));
    s.box([0.7, 0.3, 0.04], [2.3, BH + 0.45, -0.64], s.material('#3a3d40'));
    s.cylinder(0.14, 0.14, 0.5, [-2.4, BH + 0.45, -1.1], s.material(worn('#aab0ad', 0.5), { metalness: 0.4 }), 12);
    s.cylinder(0.26, 0.2, 0.12, [-2.4, BH + 0.75, -1.1], s.material(worn('#aab0ad', 0.5), { metalness: 0.4 }), 12);
    s.box([BW + 0.74, 0.42, 0.1], [0, BH + 0.12, edge], accent);
    for (const side of [-1, 1]) {
      s.box([0.1, 0.42, roofD], [side * (BW / 2 + 0.36), BH + 0.12, roofZ], accent);
      for (const lean of [-0.35, 0.35]) s.rod([side * (BW / 2 + 0.1), 0, edge - 0.3], [side * (BW / 2 + 0.1) + lean, BH, edge - 0.3], 0.04, steel);
    }
    // Neon trim round the canopy, dead when shuttered.
    const flick = mood.wear > 0.6 ? 0.5 : 1;
    const neon = new THREE.MeshStandardMaterial({ color: live ? scheme.neon : '#8f8f8a', emissive: scheme.neon, emissiveIntensity: live ? mix(1.1, 2.2, mood.cheer) * bright : 0 });
    const neonBroken = new THREE.MeshStandardMaterial({ color: '#9a9a94', emissive: scheme.neon, emissiveIntensity: live ? 0.25 * flick : 0 });
    for (const y of [BH - 0.02, BH + 0.26]) {
      const tube = s.mesh(new THREE.CylinderGeometry(0.03, 0.03, BW + 0.8, 8), neon, [0, y, edge + 0.07]);
      tube.rotation.z = Math.PI / 2;
      for (const side of [-1, 1]) s.mesh(new THREE.CylinderGeometry(0.03, 0.03, roofD, 8), mood.wear > 0.6 && side > 0 ? neonBroken : neon, [side * (BW / 2 + 0.43), y, roofZ]).rotation.x = Math.PI / 2;
    }
    // Fluorescent tubes under the canopy.
    const tubeLight = new THREE.MeshStandardMaterial({ color: '#f4f6ee', emissive: mood.warmth > 0.5 ? '#fff0c4' : '#e6f4ff', emissiveIntensity: live ? 1.6 * bright : 0 });
    for (const x of [-2.3, 0, 2.3]) s.box([1.3, 0.05, 0.12], [x, BH - 0.04, front + 1.2], tubeLight);

    // Inside the hatch: a lit back wall of shelves, machines and the clerk.
    const warm = mood.warmth > 0.45;
    const interior = painted(hw + 0.6, hy1 - hy0 + 0.5, (ctx, w, h) => {
      if (!live) { ctx.fillStyle = '#1a1b1e'; ctx.fillRect(0, 0, w, h); return; }
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, warm ? '#ffe2a1' : '#e9f4e6'); g.addColorStop(1, warm ? '#f0a550' : '#a9cdbf');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(90,50,20,0.55)';
      for (const y of [0.3, 0.55]) ctx.fillRect(0, h * y, w, h * 0.025);
      for (let i = 0; i < 30; i++) {
        const x = (i + random() * 0.4) / 30 * w, row = i % 2 ? 0.3 : 0.55, tall = h * (0.08 + random() * 0.1);
        ctx.fillStyle = ['#fdfaf0', '#d2392f', '#f3c744', '#fdfaf0'][Math.floor(random() * 4)];
        if (random() < 0.8) ctx.fillRect(x, h * row - tall, w * 0.018, tall);
      }
      // Popcorn machine.
      ctx.fillStyle = '#c5302a'; ctx.fillRect(w * 0.06, h * 0.52, w * 0.13, h * 0.48); ctx.fillStyle = '#fff3c8'; ctx.fillRect(w * 0.07, h * 0.56, w * 0.11, h * 0.3);
      ctx.fillStyle = '#f2c13d'; ctx.beginPath(); ctx.ellipse(w * 0.125, h * 0.86, w * 0.05, h * 0.12, 0, Math.PI, 0); ctx.fill();
      // Soda fountain.
      ctx.fillStyle = '#9aa3a3'; ctx.fillRect(w * 0.72, h * 0.62, w * 0.2, h * 0.38);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#c5302a', '#2d6fb0', '#e8a02a', '#3d8f4f'][i]; ctx.fillRect(w * (0.74 + i * 0.045), h * 0.68, w * 0.03, h * 0.14); }
      if (a.service !== 'closing') {
        const cx = w * (0.4 + random() * 0.15);
        ctx.fillStyle = '#f5f1e6'; ctx.fillRect(cx - w * 0.04, h * 0.6, w * 0.08, h * 0.4);
        ctx.fillStyle = '#d9a37d'; ctx.beginPath(); ctx.arc(cx, h * 0.5, h * 0.11, 0, 7); ctx.fill();
        ctx.fillStyle = '#f5f1e6'; ctx.beginPath(); ctx.moveTo(cx - h * 0.13, h * 0.42); ctx.lineTo(cx + h * 0.13, h * 0.42); ctx.lineTo(cx + h * 0.09, h * 0.28); ctx.lineTo(cx - h * 0.09, h * 0.28); ctx.fill();
        ctx.fillStyle = scheme.accent; ctx.fillRect(cx - h * 0.13, h * 0.4, h * 0.26, h * 0.035);
      } else { ctx.fillStyle = 'rgba(20,20,30,0.55)'; ctx.fillRect(w * 0.45, 0, w * 0.55, h); }
    }, { px: 512, glow: live ? 0.95 * bright : 0 });
    put(s.root, interior, [hc, (hy0 + hy1) / 2, front - 0.9]);
    s.box([hw + 0.2, 0.06, 0.12], [hc, hy1 + 0.03, front + 0.1], accent);
    s.box([hw + 0.4, 0.07, 0.75], [hc, hy0 + 0.035, front + 0.2], steel);
    for (const x of [hx0 + 0.3, hc, hx1 - 0.3]) s.rod([x, hy0, front + 0.5], [x, hy0 - 0.4, front + 0.1], 0.02, steel);

    if (a.service === 'shuttered') {
      const shutter = painted(hw, hy1 - hy0, (ctx, w, h) => {
        ctx.fillStyle = `#${worn('#a9adab', 0.6).getHexString()}`; ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += h / 14) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, y, w, h / 40); ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, y + h / 40, w, h / 60); }
        grime(ctx, w, h, 0.3 + mood.wear * 0.7, random, '122,74,46');
        ctx.save(); ctx.translate(w * 0.5, h * 0.5); ctx.rotate(-0.04);
        ctx.fillStyle = '#f6f1df'; ctx.fillRect(-w * 0.19, -h * 0.3, w * 0.38, h * 0.6);
        write(ctx, 'CLOSED', 0, -h * 0.13, h * 0.2, '#b02a22', { max: w * 0.34 });
        write(ctx, mood.cheer > 0.45 ? 'SEE YOU NEXT SUMMER' : 'FOR THE SEASON', 0, h * 0.12, h * 0.1, '#2b2b2b', { max: w * 0.34 });
        ctx.restore();
      }, { px: 512 });
      put(s.root, shutter, [hc, (hy0 + hy1) / 2, front + 0.03]);
      s.box([0.1, 0.14, 0.06], [hc, hy0 + 0.12, front + 0.08], s.material('#c9a13a', { metalness: 0.7, roughness: 0.4 }));
    } else {
      // Things on the counter.
      const n = Math.round(mix(3, 11, mood.density));
      for (let i = 0; i < n; i++) {
        const x = hx0 + 0.3 + random() * (hw - 0.6), z = front + 0.1 + random() * 0.35;
        if (random() < 0.5) {
          s.cylinder(0.05, 0.035, 0.14, [x, hy0 + 0.14, z], s.material('#f8f5ea'), 10);
          s.cylinder(0.051, 0.045, 0.04, [x, hy0 + 0.15, z], accent, 10);
        } else {
          const box = s.mesh(new THREE.CylinderGeometry(0.08, 0.055, 0.2, 4), s.material(random() < 0.5 ? '#d2392f' : '#f8f5ea'), [x, hy0 + 0.17, z]);
          box.rotation.y = Math.PI / 4;
          s.ball([0.075, 0.05, 0.075], [x, hy0 + 0.28, z], s.material('#f6dd8c', { roughness: 1 }), 8);
        }
      }
      s.box([0.16, 0.2, 0.14], [hx1 - 0.25, hy0 + 0.17, front + 0.25], steel);
    }

    // Letter-board menu on the pier beside the hatch.
    const special = { hotdogs: 'FOOT LONG DOGS', popcorn: 'HOT BUTTERED CORN', pizza: 'PIZZA  SLICE', icecream: 'SOFT SERVE CONES' }[a.special];
    const lines: [string, string][] = [['HOT DOG', '.25'], ['POPCORN', '.15'], ['COLA', '.10'], ['FRIES', '.20'], ['COFFEE', '.10'], ['CANDY', '.05']];
    const menu = painted(1.9, 1.5, (ctx, w, h) => {
      ctx.fillStyle = '#1f2224'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = scheme.accent === '#26252a' ? '#f2b8c2' : scheme.accent; ctx.lineWidth = w * 0.035; ctx.strokeRect(w * 0.02, h * 0.02, w * 0.96, h * 0.96);
      for (let r = 0; r < 12; r++) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(w * 0.05, h * (0.1 + r * 0.075), w * 0.9, 1); }
      const drop = (text: string) => [...text].map((glyph) => (random() < mood.wear * (live ? 0.3 : 0.75) ? ' ' : glyph)).join('');
      write(ctx, drop(live ? special : 'CLOSED'), w / 2, h * 0.15, h * 0.1, '#f3c744', { max: w * 0.86, face: 'monospace' });
      lines.forEach(([item, price], i) => {
        const y = h * (0.31 + i * 0.105);
        write(ctx, drop(item), w * 0.1, y, h * 0.075, '#f4f1e8', { align: 'left', face: 'monospace' });
        write(ctx, drop(price), w * 0.9, y, h * 0.075, '#f4f1e8', { align: 'right', face: 'monospace' });
      });
      // A fallen letter or two hanging crooked.
      for (let i = 0; i < mood.wear * 5; i++) write(ctx, 'AEOT5'[Math.floor(random() * 5)], random() * w, h * (0.3 + random() * 0.6), h * 0.075, '#f4f1e8', { tilt: random() * 3, face: 'monospace' });
    }, { px: 384, glow: live ? 0.25 * bright : 0 });
    put(s.root, menu, [(hx1 + BW / 2) / 2 + 0.05, 1.65, front + T / 2 + 0.02]);

    // The sign: on the roof, or painted on the canopy edge.
    const text = SIGNS[a.sign];
    const onRoof = a.roof === 'letters';
    const signW = onRoof ? Math.min(BW, text.length * 0.62) : Math.min(BW - 1, text.length * 0.36), signH = onRoof ? 0.95 : 0.36;
    const signMesh = painted(signW, signH, (ctx, w, h) => {
      if (onRoof) ctx.clearRect(0, 0, w, h);
      else { ctx.fillStyle = `#${worn(scheme.accent).getHexString()}`; ctx.fillRect(0, 0, w, h); }
      const gone = mood.wear > 0.7 ? Math.floor(random() * text.length) : -1;
      [...text].forEach((glyph, i) => {
        if (i === gone) return;
        write(ctx, glyph, (i + 0.5) * (w / text.length), h * 0.54, h * 0.9, onRoof ? scheme.neon : '#fbf7ea', onRoof ? { outline: '#2a1a16' } : {});
      });
    }, { px: 768, cutout: onRoof, glow: live ? (onRoof ? 0.9 : 0.35) * bright : 0 });
    if (onRoof) {
      put(s.root, signMesh, [0, BH + 0.3 + signH / 2 + 0.25, edge - 1.0]);
      s.box([signW + 0.2, 0.06, 0.06], [0, BH + 0.5, edge - 1.03], steel);
      for (let i = 0; i < 5; i++) s.rod([-signW / 2 + (i / 4) * signW, BH + 0.2, edge - 1.5], [-signW / 2 + (i / 4) * signW, BH + 0.2 + signH, edge - 1.04], 0.025, steel);
    } else put(s.root, signMesh, [0, BH + 0.12, edge + 0.056]);

    if (a.roof === 'cup') {
      const cup = put(s.root, new THREE.Group(), [BW * 0.22, BH + 0.2, 0.2]);
      const stripes = paintTexture(256, 128, (ctx, w, h) => { for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? '#fbf7ea' : scheme.accent === '#26252a' ? '#ff6fb1' : scheme.accent; ctx.fillRect((i / 12) * w, 0, w / 12 + 1, h); } grime(ctx, w, h, mood.wear * 0.6, random); });
      put(cup, new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 1.5, 24), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })), [0, 0.75, 0]);
      put(cup, new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.08, 24), s.material('#fbf7ea')), [0, 1.53, 0]);
      put(cup, new THREE.Mesh(new THREE.SphereGeometry(0.6, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), s.material('#fbf7ea', { roughness: 0.3 })), [0, 1.45, 0]);
      const straw = put(cup, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), s.material('#d2392f')), [0.18, 2.2, 0]);
      straw.rotation.z = -0.3 - mood.wear * 0.5;
    }
    if (a.roof === 'festoon') {
      const mastTop: P3 = [0, BH + 2.4, 0.3];
      s.rod([0, BH + 0.2, 0.3], mastTop, 0.035, steel);
      const colours = ['#ff5b4a', '#ffd23f', '#4fe3df', '#7be05a', '#ff8fd0'];
      const bulbs: { at: P3; size: number; color: string }[] = [];
      for (const [ex, ez] of [[-BW / 2 - 0.3, edge], [BW / 2 + 0.3, edge], [-BW / 2 - 0.3, -front], [BW / 2 + 0.3, -front]] as const) {
        const end: P3 = [ex, BH + 0.35, ez];
        const pts: P3[] = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([mix(mastTop[0], end[0], t), mix(mastTop[1], end[1], t) - Math.sin(t * Math.PI) * 0.45, mix(mastTop[2], end[2], t)]); }
        s.tube(pts, 0.008, dark);
        for (let i = 1; i < 10; i++) if (random() > mood.wear * 0.5) bulbs.push({ at: [pts[i][0], pts[i][1] - 0.07, pts[i][2]], size: 0.07, color: colours[Math.floor(random() * colours.length)] });
      }
      const lamp = s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: live ? 0.5 : 0 }), bulbs);
      lamp.castShadow = false;
    }

    // Side door.
    s.box([0.06, 2, 0.9], [BW / 2 + 0.01, 1, -0.6], accent);
    s.ball([0.04, 0.04, 0.04], [BW / 2 + 0.06, 1, -0.3], steel, 8);

    // People at the counter.
    const person = (height: number, colour: string, at: P3) => {
      const g = put(s.root, new THREE.Group(), at);
      const cloth = s.material(colour, { roughness: 0.9 });
      put(g, new THREE.Mesh(new THREE.CapsuleGeometry(height * 0.13, height * 0.5, 4, 10), cloth), [0, height * 0.42, 0]);
      put(g, new THREE.Mesh(new THREE.SphereGeometry(height * 0.1, 12, 10), s.material(['#e2b48f', '#c98f64', '#8e5d3d', '#f0cba8'][Math.floor(random() * 4)], { roughness: 0.8 })), [0, height * 0.87, 0]);
      for (const side of [-1, 1]) put(g, new THREE.Mesh(new THREE.CapsuleGeometry(height * 0.04, height * 0.28, 3, 6), cloth), [side * height * 0.16, height * 0.52, -height * 0.05]).rotation.x = random() < 0.4 ? -1.1 : -0.1;
      g.rotation.y = (random() - 0.5) * 0.7;
      return g;
    };
    if (a.service === 'rush') {
      const crowd = Math.round(mix(4, 11, mood.density));
      const pyjamas = ['#9fc4e8', '#f4b6c8', '#f6e08a', '#b6e0b0', '#d9c2f0'], adults = ['#44506a', '#7a4a3a', '#c9c2ae', '#3f6b57', '#a23b3b'];
      for (let i = 0; i < crowd; i++) {
        const kid = random() < 0.45;
        const row = i < 5 ? 0 : 1;
        person(kid ? 1.0 + random() * 0.3 : 1.6 + random() * 0.25, kid ? pyjamas[Math.floor(random() * 5)] : adults[Math.floor(random() * 5)], [hx0 + 0.4 + ((i % 5) + random() * 0.6) * (hw / 5.4), 0, front + 0.95 + row * 0.75 + random() * 0.3]);
      }
    }
    if (a.service === 'open' && mood.density > 0.4) person(1.15, '#f4b6c8', [hc + 0.6, 0, front + 0.95]);
    if (a.service === 'closing') {
      s.rod([BW / 2 - 0.5, 0, front + 0.25], [BW / 2 - 0.35, 1.5, front + 0.12], 0.018, s.material('#b08a4f'));
      s.box([0.34, 0.12, 0.06], [BW / 2 - 0.52, 0.06, front + 0.27], s.material('#c9a13a', { roughness: 1 }));
    }

    const ox = -BW / 2 - 0.9;
    if (a.outside === 'barrel') {
      s.cylinder(0.3, 0.3, 0.9, [ox, 0.45, front - 0.3], s.material(worn(mood.cheer > 0.5 ? '#3d8f4f' : '#5c6a70', 0.6), { metalness: 0.3 }), 18);
      for (const y of [0.3, 0.6]) s.ring(0.305, 0.015, [ox, y, front - 0.3], steel).rotation.x = Math.PI / 2;
      const litter = Array.from({ length: Math.round(mix(5, 22, mood.density)) }, (_unused, i) => ({ at: [ox + (random() - 0.5) * (i < 8 ? 0.4 : 1.4), i < 8 ? 0.9 + random() * 0.2 : 0.05, front - 0.3 + (random() - 0.5) * (i < 8 ? 0.4 : 1.4)] as P3, size: 0.07 + random() * 0.06, color: ['#f8f5ea', '#d2392f', '#f3c744', '#cfc8b4'][Math.floor(random() * 4)] }));
      s.scatter(new THREE.DodecahedronGeometry(1, 0), s.material('#ffffff', { roughness: 0.9 }), litter);
    }
    if (a.outside === 'table') {
      const wood = s.material(worn('#b08a5a', 0.5), { roughness: 0.9 });
      const g = put(s.root, new THREE.Group(), [ox - 0.3, 0, front + 0.6]);
      put(g, new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 1.8), wood), [0, 0.75, 0]);
      for (const side of [-1, 1]) {
        put(g, new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 1.8), wood), [side * 0.7, 0.45, 0]);
        for (const z of [-0.7, 0.7]) put(g, new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.95, 0.06), wood), [side * 0.42, 0.38, z]).rotation.z = -side * 0.55;
      }
      g.rotation.y = (random() - 0.5) * 0.6;
    }
    if (a.outside === 'gumballs') {
      for (let i = 0; i < 3; i++) {
        const z = front - 0.3 - i * 0.5;
        s.cylinder(0.03, 0.03, 0.7, [ox + 0.3, 0.35, z], steel, 8);
        s.cylinder(0.17, 0.2, 0.05, [ox + 0.3, 0.025, z], dark, 12);
        s.box([0.24, 0.22, 0.24], [ox + 0.3, 0.8, z], s.material(['#d2392f', '#2d6fb0', '#e8a02a'][i], { metalness: 0.3, roughness: 0.4 }));
        s.ball([0.17, 0.17, 0.17], [ox + 0.3, 1.05, z], s.material(['#f08bb0', '#ffe066', '#9be3a0'][i], { roughness: 0.2 }), 14);
        s.cylinder(0.08, 0.1, 0.05, [ox + 0.3, 1.23, z], s.material('#d2392f'), 12);
      }
    }
    if (mood.wear > 0.5) {
      const tufts = Array.from({ length: Math.round(mood.wear * 30) }, () => { const t = random() * 4 | 0; const x = (random() - 0.5) * (BW + 0.6), z = (random() - 0.5) * (BD + 0.6); return { at: (t === 0 ? [x, 0.1, front + 0.15] : t === 1 ? [x, 0.1, -front - 0.15] : t === 2 ? [BW / 2 + 0.15, 0.1, z] : [-BW / 2 - 0.15, 0.1, z]) as P3, size: 0.25 + random() * 0.4, color: random() < 0.5 ? '#8c8a55' : '#657c48' }; });
      s.scatter(new THREE.ConeGeometry(0.2, 1, 4), s.material('#ffffff', { roughness: 1 }), tufts);
    }

    const buzz = mix(0.01, 0.12, mood.energy) * (1 + mood.wear);
    const neonBase = neon.emissiveIntensity;
    return s.finish({
      footprint: 5,
      update: (_dt, time) => {
        if (!live) return;
        neon.emissiveIntensity = neonBase * (1 + Math.sin(time * 31) * buzz);
        neonBroken.emissiveIntensity = Math.sin(time * 13) > 0.6 ? 1.2 : 0.1;
      },
    });
  },
});
