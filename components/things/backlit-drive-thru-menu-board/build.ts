import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul } from '@conjure/kit';

type V3 = [number, number, number];
type Cuisine = 'burgers' | 'chicken' | 'tacos' | 'coffee' | 'pizza';
type Era = 'seventies' | 'nineties' | 'modern' | 'indie';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const MENUS: Record<Cuisine, { names: string[]; items: [string, string][] }> = {
  burgers: { names: ['BURGER BARN', 'PATTY SHACK', 'BIG BUN', 'ROYAL BURGER'], items: [['DOUBLE BURGER', '5.49'], ['CHEESEBURGER', '3.99'], ['FRIES', '1.99'], ['MILKSHAKE', '3.49'], ['COMBO MEAL', '7.99'], ['KIDS MEAL', '4.49']] },
  chicken: { names: ['CLUCK HOUSE', 'CRISPY BIRD', 'WING STOP', 'GOLDEN HEN'], items: [['3 PC CHICKEN', '6.99'], ['TENDERS', '5.49'], ['WINGS x8', '7.49'], ['BISCUIT', '1.29'], ['FAMILY BOX', '19.99'], ['SLAW', '1.99']] },
  tacos: { names: ['TACO TIME', 'EL RAPIDO', 'TACO RANCHO', 'LA LUNA'], items: [['CRUNCHY TACO', '1.79'], ['BURRITO', '4.99'], ['NACHOS', '3.99'], ['QUESADILLA', '4.49'], ['TACO BOX', '8.99'], ['CHURROS', '1.99']] },
  coffee: { names: ['BEAN STOP', 'DRIVE BREW', 'MORNING CUP', 'JOLT'], items: [['LATTE', '4.25'], ['DRIP COFFEE', '2.25'], ['COLD BREW', '3.75'], ['BAGEL', '2.50'], ['MUFFIN', '2.95'], ['HOT COCOA', '3.50']] },
  pizza: { names: ['SLICE SHOP', 'NONNA PIE', 'PIZZA BY THE SLICE', 'CRUST'], items: [['CHEESE SLICE', '2.99'], ['PEPPERONI', '3.49'], ['2 SLICES + SODA', '6.99'], ['GARLIC KNOTS', '2.49'], ['WHOLE PIE', '14.99'], ['SODA', '1.49']] },
};
const ERAS: Record<Era, { board: string; header: string; ink: string; price: string; frame: string; headerInk: string }> = {
  seventies: { board: '#d9c7a3', header: '#c8641c', ink: '#3a2a1a', price: '#8a3a12', frame: '#6a5a44', headerInk: '#f6e3b0' },
  nineties: { board: '#f6f1e4', header: '#d6262c', ink: '#1a1a1a', price: '#d6262c', frame: '#3a3a3a', headerInk: '#ffd21f' },
  modern: { board: '#16181c', header: '#000000', ink: '#f2f2f2', price: '#f2f2f2', frame: '#1e1e22', headerInk: '#ffffff' },
  indie: { board: '#2c3a2e', header: '#2c3a2e', ink: '#f1e6c8', price: '#f3d36a', frame: '#7a5a3a', headerInk: '#f1e6c8' },
};

/** A small food picture for a menu panel: a cartoon icon in a rounded photo tile. */
function icon(ctx: CanvasRenderingContext2D, cuisine: Cuisine, index: number, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  const r = size / 2;
  const kind = (['burgers', 'chicken', 'tacos', 'coffee', 'pizza'] as Cuisine[]).includes(cuisine) ? cuisine : 'burgers';
  const which = index % 3;
  if (which === 2) {
    // A drink appears on every menu.
    ctx.fillStyle = kind === 'coffee' ? '#f3efe6' : '#e63946';
    ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.6); ctx.lineTo(r * 0.45, -r * 0.6); ctx.lineTo(r * 0.35, r * 0.7); ctx.lineTo(-r * 0.35, r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.5, -r * 0.7, r, r * 0.16);
    ctx.strokeStyle = kind === 'coffee' ? '#6b4a2a' : '#ffffff';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.7); ctx.lineTo(r * 0.3, -r * 1.05); ctx.stroke();
  } else if (kind === 'burgers' || (kind === 'chicken' && which === 1)) {
    ctx.fillStyle = '#d8a45c';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.35, r * 0.8, r * 0.42, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#6fa83c'; ctx.fillRect(-r * 0.85, -r * 0.2, r * 1.7, r * 0.16);
    ctx.fillStyle = '#5a3524'; ctx.fillRect(-r * 0.8, -r * 0.04, r * 1.6, r * 0.28);
    ctx.fillStyle = '#f0b23c'; ctx.fillRect(-r * 0.82, r * 0.16, r * 1.64, r * 0.1);
    ctx.fillStyle = '#d8a45c'; ctx.fillRect(-r * 0.8, r * 0.26, r * 1.6, r * 0.34);
    if (which === 1 && kind === 'burgers') { ctx.fillStyle = '#e63946'; ctx.fillRect(-r * 0.3, r * 0.65, r * 0.6, r * 0.5); ctx.fillStyle = '#f4d35e'; for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.22 + i * r * 0.14, r * 0.2, r * 0.07, r * 0.5); }
  } else if (kind === 'chicken') {
    ctx.fillStyle = '#c98a3c';
    ctx.beginPath(); ctx.ellipse(-r * 0.15, 0, r * 0.65, r * 0.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f3efe6'; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(r * 0.3, r * 0.3); ctx.lineTo(r * 0.75, r * 0.7); ctx.stroke();
    ctx.fillStyle = '#f3efe6'; ctx.beginPath(); ctx.arc(r * 0.8, r * 0.75, r * 0.14, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'tacos') {
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath(); ctx.arc(0, r * 0.2, r * 0.8, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6fa83c'; ctx.fillRect(-r * 0.6, -r * 0.3, r * 1.2, r * 0.18);
    ctx.fillStyle = '#8a3a2a'; ctx.fillRect(-r * 0.5, -r * 0.12, r, r * 0.18);
    ctx.fillStyle = '#e63946'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-r * 0.3 + i * r * 0.3, -r * 0.4, r * 0.1, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'coffee') {
    ctx.fillStyle = '#f3efe6';
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.3); ctx.lineTo(r * 0.5, -r * 0.3); ctx.lineTo(r * 0.4, r * 0.7); ctx.lineTo(-r * 0.4, r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9c7a52'; ctx.fillRect(-r * 0.48, r * 0.05, r * 0.96, r * 0.3);
    ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = r * 0.08;
    for (const dx of [-0.2, 0.05, 0.3]) { ctx.beginPath(); ctx.moveTo(r * dx, -r * 0.5); ctx.quadraticCurveTo(r * (dx + 0.15), -r * 0.75, r * dx, -r * 1); ctx.stroke(); }
  } else {
    ctx.fillStyle = '#e8b86a';
    ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(-r * 0.7, -r * 0.7); ctx.lineTo(r * 0.7, -r * 0.7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(0, r * 0.6); ctx.lineTo(-r * 0.55, -r * 0.55); ctx.lineTo(r * 0.55, -r * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f6e7b0'; ctx.beginPath(); ctx.moveTo(0, r * 0.45); ctx.lineTo(-r * 0.45, -r * 0.45); ctx.lineTo(r * 0.45, -r * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a02020'; for (const [px, py] of [[-0.2, -0.3], [0.2, -0.25], [0, 0.05]]) { ctx.beginPath(); ctx.arc(r * px, r * py, r * 0.11, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();
}

export default defineThing({
  questions: {
    cuisine: choice('What does the board sell?', {
      burgers: 'Burgers, fries and shakes.',
      chicken: 'Fried chicken by the piece and the bucket.',
      tacos: 'Tacos, burritos and nachos.',
      coffee: 'Coffee, lattes and bagels.',
      pizza: 'Pizza by the slice.',
    }),
    era: choice('What era is the board from?', {
      seventies: 'A 1970s board: brown and burnt orange with cream lettering.',
      nineties: 'A 1990s chain board: white panels, red and yellow header, glossy food photos.',
      modern: 'A modern black digital board with white type and bright screens.',
      indie: 'An independent hand-painted plywood sign with chalked prices.',
    }),
    panels: choice('How many panels?', {
      one: 'One tall panel.',
      two: 'Two panels side by side.',
      three: 'Three panels in a wide run.',
    }),
    state: choice('What are the lights doing?', {
      lit: 'Every panel glowing evenly.',
      'one-dark': 'One panel dead and dark.',
      flicker: 'One panel flickering and buzzing.',
      dark: 'The whole board dark: closed for the night.',
    }),
    speaker: choice('Where is the speaker?', {
      post: 'A separate short speaker post beside the board with an ORDER HERE sign.',
      inset: 'A speaker grille built into the board at car-window height.',
      none: 'No speaker: a pre-sell board further back in the lane.',
    }),
    soldout: noul('Does a red SOLD OUT sticker cover one of the items?'),
    cashonly: noul('Is a hand-written CASH ONLY sign taped to it?'),
    hood: noul('Does the board wear a rain hood?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const jitter = (amount: number) => (random() - 0.5) * amount;
    const era = ERAS[a.era];
    const menu = MENUS[a.cuisine];
    const chain = pick(menu.names);
    const panelCount = { one: 1, two: 2, three: 3 }[a.panels];
    const PW = 0.9, PH = 1.65, GAP = 0.04;
    const W = panelCount * PW + (panelCount - 1) * GAP + 0.1;
    const BOTTOM = 0.8, TOP = BOTTOM + PH;
    const frame = s.material(era.frame, { metalness: 0.5, roughness: 0.5 });
    const steel = s.material('#7a7f84', { metalness: 0.7, roughness: 0.4 });
    const concrete = s.material('#aaa69c', { roughness: 0.95 });
    const lit = a.state !== 'dark';
    const lightTint = new THREE.Color().setHSL(mix(0.58, 0.1, mood.warmth), 0.4, 0.95);

    // ---- posts, frame and the hood
    const postX = panelCount === 1 ? [0] : [-(W / 2 - 0.3), W / 2 - 0.3];
    for (const x of postX) s.box([0.09, TOP + 0.1, 0.09], [x, (TOP + 0.1) / 2, -0.08], steel);
    s.box([W, PH + 0.1, 0.14], [0, (BOTTOM + TOP) / 2, 0], frame);
    if (a.hood) {
      const hood = s.box([W + 0.2, 0.04, 0.5], [0, TOP + 0.08, 0.1], frame);
      hood.rotation.x = 0.12;
      s.box([W + 0.2, 0.08, 0.06], [0, TOP + 0.06, -0.12], frame);
    }

    // ---- the lit panels
    const soldOn = Math.floor(random() * 6);
    const deadPanel = Math.floor(random() * panelCount);
    const faces: { material: THREE.MeshStandardMaterial; base: number; flicker: boolean }[] = [];
    for (let p = 0; p < panelCount; p++) {
      const x = (p - (panelCount - 1) / 2) * (PW + GAP);
      const dead = (a.state === 'one-dark' && p === deadPanel) || !lit;
      const flicker = a.state === 'flicker' && p === deadPanel;
      const art = paint(512, 940, (ctx) => {
        ctx.fillStyle = era.board;
        ctx.fillRect(0, 0, 512, 940);
        if (a.era === 'indie') {
          ctx.strokeStyle = 'rgba(0,0,0,0.25)';
          ctx.lineWidth = 2;
          for (let y = 0; y < 940; y += 48) { ctx.beginPath(); ctx.moveTo(0, y + jitter(6)); ctx.lineTo(512, y + jitter(6)); ctx.stroke(); }
        }
        // Header with the chain name on the first panel, a category on the rest.
        ctx.fillStyle = era.header;
        ctx.fillRect(0, 0, 512, 120);
        ctx.fillStyle = era.headerInk;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${a.era === 'indie' ? 'italic ' : ''}54px sans-serif`;
        ctx.fillText(p === 0 ? chain : p === 1 ? 'COMBOS' : 'DRINKS & SIDES', 256, 60, 480);
        const rows = 6;
        for (let i = 0; i < rows; i++) {
          const y = 150 + i * 128;
          const item = menu.items[(i + p * 2) % menu.items.length];
          // A photo tile with the food icon.
          ctx.fillStyle = a.era === 'modern' ? '#2b2f36' : a.era === 'indie' ? 'rgba(255,255,255,0.08)' : '#ffffff';
          ctx.beginPath();
          ctx.roundRect(24, y, 110, 104, 10);
          ctx.fill();
          const tileColours = ['#f7e3c8', '#fbe9d2', '#f2dcc0', '#fde8e4'];
          ctx.fillStyle = a.era === 'modern' ? '#3a404a' : tileColours[i % tileColours.length];
          ctx.beginPath();
          ctx.roundRect(30, y + 6, 98, 92, 8);
          ctx.fill();
          icon(ctx, a.cuisine, i + p, 79, y + 52, 70);
          ctx.textAlign = 'left';
          ctx.fillStyle = era.ink;
          ctx.font = `700 ${a.era === 'indie' ? 'italic ' : ''}30px sans-serif`;
          ctx.fillText(item[0], 150, y + 36, 340);
          ctx.fillStyle = era.price;
          ctx.font = '900 40px sans-serif';
          ctx.fillText(`$${item[1]}`, 150, y + 80);
          if (a.era !== 'indie') { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(24, y + 118, 464, 2); }
          if (a.soldout && p === 0 && i === soldOn) {
            ctx.save();
            ctx.translate(330, y + 55);
            ctx.rotate(-0.12);
            ctx.fillStyle = '#d61f2c';
            ctx.beginPath(); ctx.roundRect(-150, -34, 300, 68, 8); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = '900 44px sans-serif';
            ctx.fillText('SOLD OUT', 0, 2);
            ctx.restore();
          }
        }
        // Grime creeps up from the bottom with wear.
        if (mood.wear > 0.3) {
          const g = ctx.createLinearGradient(0, 940, 0, 940 - 300 * mood.wear);
          g.addColorStop(0, `rgba(60,50,40,${0.35 * mood.wear})`);
          g.addColorStop(1, 'rgba(60,50,40,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 512, 940);
          ctx.fillStyle = 'rgba(40,35,30,0.5)';
          for (let i = 0; i < mood.wear * 40; i++) ctx.fillRect(random() * 512, random() * 940, 2 + random() * 6, 2 + random() * 3);
        }
      });
      // A pale board needs far less glow than a black one before it blows out to white.
      const pale = a.era === 'nineties' || a.era === 'seventies';
      const base = dead ? 0 : pale ? mix(0.1, 0.28, mood.cheer) : a.era === 'indie' ? 0.15 : mix(0.7, 1.1, mood.cheer);
      const material = new THREE.MeshStandardMaterial({ map: art, color: dead ? '#5a5a5a' : pale ? '#d4d4d0' : '#ffffff', roughness: a.era === 'modern' ? 0.2 : 0.5, emissive: lightTint, emissiveMap: art, emissiveIntensity: base });
      faces.push({ material, base, flicker });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), material);
      face.position.set(x, (BOTTOM + TOP) / 2, 0.071);
      s.root.add(face);
      if (a.era === 'nineties' || a.era === 'modern') s.box([PW + 0.03, PH + 0.03, 0.01], [x, (BOTTOM + TOP) / 2, 0.058], s.material(a.era === 'modern' ? '#0c0c0e' : '#d9d9d9'));
      if (dead && mood.wear > 0.5) {
        const crack = s.box([0.012, PH * 0.6, 0.004], [x + jitter(PW * 0.6), (BOTTOM + TOP) / 2, 0.076], s.material('#2a2a2a'));
        crack.rotation.z = jitter(0.8);
      }
    }
    // A thin lit strip under the frame: the glow of the lightbox spilling down.
    if (lit) s.box([W - 0.2, 0.02, 0.02], [0, BOTTOM - 0.06, 0.06], new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: lightTint, emissiveIntensity: 0.6 }));

    // ---- the speaker and ORDER HERE sign
    const grille = paint(128, 128, (ctx) => {
      ctx.fillStyle = '#4a4e52';
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#1a1c1e';
      for (let y = 8; y < 128; y += 12) for (let x = 8; x < 128; x += 12) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    });
    const grillePaint = new THREE.MeshStandardMaterial({ map: grille, roughness: 0.7, metalness: 0.3 });
    const orderSign = (at: V3, width: number) => {
      const sign = s.label('PLEASE ORDER HERE', width, width * 0.22, at, lit ? '#ffffff' : '#555555', lit ? era.header === '#000000' ? '#1c7ed6' : era.header : '#333333');
      if (lit) {
        const m = sign.material as THREE.MeshStandardMaterial;
        m.emissive = new THREE.Color('#ffffff');
        m.emissiveMap = m.map;
        m.emissiveIntensity = 0.45;
      }
      return sign;
    };
    if (a.speaker === 'post') {
      const px = W / 2 + 0.5, pz = 0.35;
      s.box([0.08, 1.0, 0.08], [px, 0.5, pz], steel);
      s.box([0.34, 0.4, 0.26], [px, 1.2, pz], s.material(era.frame, { metalness: 0.5, roughness: 0.5 }));
      const g = s.mesh(new THREE.PlaneGeometry(0.26, 0.26), grillePaint, [px, 1.17, pz + 0.131]);
      void g;
      orderSign([px, 1.46, pz + 0.1], 0.34).rotation.x = -0.15;
      s.box([0.34, 0.05, 0.2], [px, 1.44, pz], frame);
      s.ball([0.02, 0.02, 0.02], [px + 0.12, 1.34, pz + 0.131], new THREE.MeshStandardMaterial({ color: '#ff3030', emissive: '#ff2020', emissiveIntensity: lit ? 1.5 : 0 }), 10);
      s.cylinder(0.16, 0.18, 0.04, [px, 0.02, pz], concrete, 16);
    } else if (a.speaker === 'inset') {
      s.box([0.5, 0.5, 0.1], [W / 2 - 0.35, BOTTOM - 0.3, 0.02], frame);
      s.mesh(new THREE.PlaneGeometry(0.3, 0.3), grillePaint, [W / 2 - 0.35, BOTTOM - 0.34, 0.071]);
      orderSign([W / 2 - 0.35, BOTTOM - 0.09, 0.072], 0.44);
      s.ball([0.02, 0.02, 0.02], [W / 2 - 0.16, BOTTOM - 0.5, 0.072], new THREE.MeshStandardMaterial({ color: '#ff3030', emissive: '#ff2020', emissiveIntensity: lit ? 1.5 : 0 }), 10);
    }
    if (a.cashonly) {
      const where: V3 = a.speaker === 'post' ? [W / 2 + 0.5, 0.95, 0.35 + 0.045] : [-(W / 2 - 0.35), BOTTOM - 0.2, 0.075];
      const sign = s.label('CASH ONLY', 0.34, 0.16, where, '#1a1a1a', '#f7f1dd');
      sign.rotation.z = jitter(0.3);
      for (const dx of [-0.13, 0.13]) {
        const tape = s.box([0.06, 0.025, 0.002], [where[0] + dx, where[1] + 0.07, where[2] + 0.002], new THREE.MeshStandardMaterial({ color: '#d9d2b8', roughness: 0.4, transparent: true, opacity: 0.7 }));
        tape.rotation.z = sign.rotation.z + jitter(0.6);
      }
    }

    // ---- the kerb and the painted arrow in the lane
    const kerbW = W + 0.5 + (a.speaker === 'post' ? 0.9 : 0);
    const kerbX = a.speaker === 'post' ? 0.4 : 0;
    s.box([kerbW, 0.14, 0.3], [kerbX, 0.07, -0.08 + 0.45], concrete);
    s.box([kerbW, 0.02, 0.7], [kerbX, 0.01, -0.15], s.material('#8f8a7c', { roughness: 1 }));
    const arrowArt = paint(256, 160, (ctx) => {
      ctx.clearRect(0, 0, 256, 160);
      ctx.fillStyle = mood.wear > 0.6 ? 'rgba(240,215,70,0.55)' : '#f0d746';
      ctx.beginPath();
      ctx.moveTo(20, 60); ctx.lineTo(150, 60); ctx.lineTo(150, 20); ctx.lineTo(240, 80); ctx.lineTo(150, 140); ctx.lineTo(150, 100); ctx.lineTo(20, 100);
      ctx.closePath();
      ctx.fill();
    });
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.62), new THREE.MeshStandardMaterial({ map: arrowArt, transparent: true, roughness: 0.9, depthWrite: false }));
    arrow.rotation.set(-Math.PI / 2, 0, 0);
    arrow.position.set(kerbX, 0.002, 0.85);
    s.root.add(arrow);
    const asphalt = s.mesh(new THREE.PlaneGeometry(kerbW, 0.9), s.material('#4f5156', { roughness: 1 }), [kerbX, 0.0005, 0.85]);
    asphalt.rotation.x = -Math.PI / 2;
    if (mood.density > 0.5) {
      // Litter by the kerb.
      for (let i = 0; i < Math.round(mood.density * 5); i++) {
        const litter = s.box([0.08, 0.01, 0.06], [kerbX + jitter(kerbW * 0.8), 0.005, 0.5 + random() * 0.4], s.material(pick(['#f3eee2', '#c0392b', '#d9c9a1'])));
        litter.rotation.y = random() * 3;
      }
    }

    const energy = mood.energy;
    return s.finish({
      update(_dt, time) {
        for (const face of faces) {
          if (!face.flicker) continue;
          const n = Math.sin(time * 19) * Math.sin(time * 5.1 + 1) + Math.sin(time * 41);
          face.material.emissiveIntensity = n > 0.3 - energy * 0.6 ? face.base : face.base * 0.08;
        }
      },
    });
  },
});
