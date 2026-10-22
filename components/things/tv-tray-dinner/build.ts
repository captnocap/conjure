import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix } from '@conjure/kit';

type P3 = [number, number, number];
const MEALS = {
  salisbury: 'Salisbury steak in brown gravy with mashed potato, peas and a brownie.',
  chicken: 'Fried chicken pieces with mashed potato, corn and apple cobbler.',
  turkey: 'Sliced turkey over stuffing with gravy, peas and cranberry sauce.',
  'fish-sticks': 'Fish sticks with tater tots, corn and a square of cake, a kid’s dinner.',
  macaroni: 'A big compartment of orange macaroni and cheese with peas and a brownie.',
} as const;
const STATES = {
  sealed: 'Still under its crinkled foil lid, one corner peeled back, not started.',
  fresh: 'Uncovered and steaming, untouched.',
  half: 'Half eaten, the fork resting in it.',
  clean: 'Scraped clean down to smears of gravy.',
  cold: 'Abandoned cold, barely touched, the fork stuck upright in the potato.',
} as const;
const DRINKS = {
  milk: 'A tall glass of milk beaded with condensation.',
  'iced-tea': 'Iced tea with a lemon wedge, sweating a ring onto the tray.',
  beer: 'A can of beer.',
  cola: 'A glass bottle of cola with a straw.',
  coffee: 'A mug of coffee.',
} as const;

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
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
    meal: choice('What is the dinner?', MEALS),
    state: choice('How far has the meal got?', STATES),
    drink: choice('What is there to drink?', DRINKS),
    pattern: choice('What is printed on the tray top?', {
      woodgrain: 'Fake walnut woodgrain with a gold pinstripe.',
      floral: 'Big orange and gold daisies on cream.',
      plaid: 'Red and green tartan plaid.',
      avocado: 'Plain avocado-green enamel.',
      scene: 'A faded sunset landscape in brown and orange bands.',
    }),
    company: choice('Is anyone eating alongside?', {
      alone: 'One tray only: eating alone.',
      pair: 'Two trays set up side by side, two dinners.',
      folded: 'One tray in use and a second left folded beside it, not needed tonight.',
    }),
    extras: choice('What else is on the tray?', {
      nothing: 'Only the dinner and the drink.',
      guide: 'A TV listings magazine and a clunky remote control.',
      condiments: 'Salt, pepper and a bottle of ketchup.',
      napkin: 'A paper napkin and a prescription pill bottle.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const legTone = a.pattern === 'woodgrain' || a.pattern === 'floral' || a.pattern === 'scene' ? '#c2a04e' : a.pattern === 'plaid' ? '#2a2826' : '#d5d9da';
    const tube = new THREE.MeshStandardMaterial({ color: new THREE.Color(legTone).lerp(new THREE.Color('#7a6a52'), mood.wear * 0.4), metalness: 0.8, roughness: mix(0.25, 0.6, mood.wear) });
    const rubber = new THREE.MeshStandardMaterial({ color: '#201f1e', roughness: 0.8 });
    const foil = new THREE.MeshStandardMaterial({ color: '#d3d7d8', metalness: 0.85, roughness: 0.38 });
    const steel = new THREE.MeshStandardMaterial({ color: '#dfe2e3', metalness: 0.9, roughness: 0.22 });
    const topMap = paint(256, 184, (ctx, w, h) => {
      if (a.pattern === 'woodgrain') {
        ctx.fillStyle = '#6a4326'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) { ctx.strokeStyle = random() < 0.6 ? 'rgba(30,14,4,0.25)' : 'rgba(255,200,140,0.14)'; ctx.lineWidth = 0.5 + random() * 2; const y = random() * h; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * 0.3, y + 8, w * 0.6, y - 8, w, y + 3); ctx.stroke(); }
        ctx.strokeStyle = '#d9b860'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, w - 24, h - 24);
      } else if (a.pattern === 'floral') {
        ctx.fillStyle = '#efe4c4'; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 9; i++) {
          const x = 24 + (i % 3) * 100 + random() * 20, y = 26 + Math.floor(i / 3) * 62 + random() * 14, r = 16 + random() * 12;
          ctx.fillStyle = ['#d9772b', '#e2a62a', '#b8502a'][i % 3];
          for (let p = 0; p < 8; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * 0.785) * r * 0.7, y + Math.sin(p * 0.785) * r * 0.7, r * 0.55, r * 0.26, p * 0.785, 0, 7); ctx.fill(); }
          ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, 7); ctx.fill();
          ctx.fillStyle = '#7a8a3a'; ctx.beginPath(); ctx.ellipse(x + r * 1.3, y + r * 0.9, 10, 4, 0.6, 0, 7); ctx.fill();
        }
      } else if (a.pattern === 'plaid') {
        ctx.fillStyle = '#9f2a22'; ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 46) { ctx.fillStyle = 'rgba(20,60,34,0.75)'; ctx.fillRect(x, 0, 18, h); ctx.fillStyle = 'rgba(20,20,20,0.6)'; ctx.fillRect(x + 28, 0, 4, h); }
        for (let y = 0; y < h; y += 46) { ctx.fillStyle = 'rgba(20,60,34,0.6)'; ctx.fillRect(0, y, w, 18); ctx.fillStyle = 'rgba(240,220,120,0.7)'; ctx.fillRect(0, y + 30, w, 2); }
      } else if (a.pattern === 'avocado') {
        ctx.fillStyle = '#77803a'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#a8ad62'; ctx.lineWidth = 3; ctx.strokeRect(14, 14, w - 28, h - 28);
      } else {
        ['#e9c27a', '#e39a3c', '#c9642a', '#8f3f22', '#5a2c1c'].forEach((tone, i) => { ctx.fillStyle = tone; ctx.fillRect(0, i * h / 5, w, h / 5 + 1); });
        ctx.fillStyle = '#f3dc9a'; ctx.beginPath(); ctx.arc(w * 0.62, h * 0.42, 34, 0, 7); ctx.fill();
        ctx.fillStyle = '#3d2418'; ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, h * 0.62); ctx.lineTo(w * 0.22, h * 0.4); ctx.lineTo(w * 0.42, h * 0.66); ctx.lineTo(w * 0.6, h * 0.5); ctx.lineTo(w, h * 0.74); ctx.lineTo(w, h); ctx.fill();
      }
      // Chips and rust at the corners as it ages.
      for (let i = 0; i < mood.wear * 26; i++) { ctx.fillStyle = random() < 0.5 ? '#3a2a1e' : '#8a5a34'; const edge = random() < 0.5; ctx.beginPath(); ctx.ellipse(edge ? (random() < 0.5 ? 6 : w - 6) : random() * w, edge ? random() * h : (random() < 0.5 ? 6 : h - 6), 3 + random() * 7, 2 + random() * 5, random() * 3, 0, 7); ctx.fill(); }
    });
    const topPaint = new THREE.MeshStandardMaterial({ map: topMap, roughness: 0.4, metalness: 0.2 });
    const edgeTone = { woodgrain: '#4a2e1a', floral: '#c2a04e', plaid: '#2a2826', avocado: '#5f6a2c', scene: '#5a2c1c' }[a.pattern];
    const edge = new THREE.MeshStandardMaterial({ color: edgeTone, roughness: 0.45, metalness: 0.3 });
    const W = 0.58, D = 0.4, T = 0.645;

    const legs = (g: Sculpture, spread: number, height: number) => {
      // Two tube frames crossing in an X when seen from the end.
      for (const [dir, half] of [[1, W / 2 - 0.045], [-1, W / 2 - 0.07]] as const) {
        const z0 = -dir * spread, z1 = dir * spread * 0.86;
        for (const x of [-half, half]) g.rod([x, 0.012, z0], [x, height, z1], 0.008, tube);
        g.rod([-half, 0.014, z0], [half, 0.014, z0], 0.008, tube);
        g.rod([-half, height, z1], [half, height, z1], 0.008, tube);
        for (const x of [-half, half]) g.cylinder(0.012, 0.012, 0.03, [x, 0.02, z0], rubber, 8).rotation.x = dir * 0.5;
      }
      for (const x of [-1, 1]) g.cylinder(0.012, 0.012, 0.06, [x * (W / 2 - 0.057), height * 0.5, 0], steel, 8).rotation.z = Math.PI / 2;
    };
    const top = (g: Sculpture, y: number) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(W, 0.01, D), [edge, edge, topPaint, edge, edge, edge]);
      slab.position.set(0, y - 0.005, 0);
      slab.castShadow = slab.receiveShadow = true;
      g.root.add(slab);
      for (const z of [-1, 1]) g.box([W + 0.012, 0.022, 0.012], [0, y + 0.002, z * D / 2], edge);
      for (const x of [-1, 1]) g.box([0.012, 0.022, D + 0.012], [x * W / 2, y + 0.002, 0], edge);
    };

    const steamers: THREE.Mesh[] = [];
    const steamMat = new THREE.MeshStandardMaterial({ color: '#a9b2ba', transparent: true, opacity: 0.45, depthWrite: false, roughness: 1 });
    const food = (tone: string, dull: boolean, options: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(tone).lerp(new THREE.Color('#8a8474'), dull ? 0.38 : 0), roughness: dull ? 0.95 : 0.6, ...options });

    const setTray = (g: Sculpture, meal: keyof typeof MEALS, state: keyof typeof STATES, drink: keyof typeof DRINKS, extras: boolean) => {
      legs(g, 0.2, T - 0.012);
      top(g, T);
      const dull = state === 'cold';
      const left = state === 'clean' ? 0 : state === 'half' ? 0.5 : 1;
      // Foil tray: 26 by 20 cm, main compartment in front, three small ones behind.
      const fx = -0.075, fz = 0.05, fy = T + 0.001, fw = 0.27, fd = 0.2, fh = 0.024, big = 1.22;
      const dinner = new Sculpture(context);
      dinner.root.position.set(fx, fy, fz);
      dinner.root.rotation.y = (random() - 0.5) * 0.12;
      dinner.root.scale.setScalar(big);
      g.root.add(dinner.root);
      dinner.box([fw - 0.01, 0.004, fd - 0.01], [0, 0.002, 0], foil);
      for (const z of [-1, 1]) dinner.box([fw, fh, 0.006], [0, fh / 2, z * fd / 2], foil).rotation.x = z * 0.25;
      for (const x of [-1, 1]) dinner.box([0.006, fh, fd], [x * fw / 2, fh / 2, 0], foil).rotation.z = -x * 0.25;
      dinner.box([fw - 0.01, fh * 0.8, 0.005], [0, fh * 0.4, -0.012], foil);
      for (const x of [-1, 1]) dinner.box([0.005, fh * 0.8, fd / 2 - 0.016], [x * fw / 6, fh * 0.4, -fd / 4 - 0.008], foil);
      const mainAt: P3 = [0, 0.006, 0.042], cell = (i: number): P3 => [(i - 1) * fw / 3, 0.006, -0.056];

      if (state === 'sealed') {
        const sheet = new THREE.PlaneGeometry(fw + 0.012, fd + 0.012, 18, 14);
        const p = sheet.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), peel = Math.min(1, Math.max(0, (x + y * 1.1 - 0.06) / 0.16));
          p.setZ(i, (random() - 0.5) * 0.006 + Math.sin(peel * Math.PI * 0.5) * 0.04);
          if (peel > 0) { p.setX(i, x - peel * peel * 0.09); p.setY(i, y - peel * peel * 0.08); }
        }
        sheet.computeVertexNormals();
        const lid = dinner.mesh(sheet, new THREE.MeshStandardMaterial({ color: '#e3e6e7', metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide, flatShading: true }), [0, fh + 0.004, 0]);
        lid.rotation.x = -Math.PI / 2;
      }
      const gravy = food('#5a3216', dull, { roughness: dull ? 0.7 : 0.2 });
      {
        // Main compartment.
        if (meal === 'salisbury') {
          if (left > 0) { const patty = dinner.ball([0.055 * mix(0.55, 1, left), 0.016, 0.034], [mainAt[0] - 0.02 * left, 0.02, mainAt[2]], food('#4a2a18', dull), 14); patty.rotation.y = 0.2; if (left === 1) dinner.ball([0.04, 0.014, 0.03], [0.07, 0.019, 0.04], food('#4a2a18', dull), 12); }
          dinner.box([fw * 0.8 * mix(0.5, 1, left), 0.006, 0.066], [mainAt[0], 0.009, mainAt[2]], gravy);
        } else if (meal === 'chicken') {
          const n = Math.round(left * 3);
          for (let i = 0; i < n; i++) { const x = -0.07 + i * 0.07; dinner.ball([0.034, 0.022, 0.026], [x, 0.026, 0.04 + (i % 2) * 0.012], food('#c98a34', dull), 7).rotation.y = random() * 3; dinner.rod([x + 0.02, 0.024, 0.04], [x + 0.05, 0.03, 0.058], 0.006, food('#b87a2c', dull)); }
          for (let i = n; i < 3; i++) dinner.rod([-0.06 + i * 0.05, 0.012, 0.03], [-0.02 + i * 0.05, 0.012, 0.06], 0.004, food('#e9e0cc', false));
        } else if (meal === 'turkey') {
          dinner.ball([0.09 * mix(0.4, 1, left), 0.012, 0.03], [0, 0.014, 0.04], food('#a8793a', dull), 8);
          for (let i = 0; i < Math.round(left * 4); i++) dinner.cylinder(0.034, 0.034, 0.005, [-0.06 + i * 0.038, 0.022 + i * 0.003, 0.042], food('#e3cfa8', dull), 12).rotation.z = 0.25;
          dinner.box([0.12 * mix(0.5, 1, left), 0.004, 0.03], [0.01, 0.034 * left + 0.008, 0.046], gravy);
        } else if (meal === 'fish-sticks') {
          for (let i = 0; i < Math.round(left * 5); i++) dinner.box([0.03, 0.014, 0.075], [-0.085 + i * 0.042, 0.016, 0.042 + (random() - 0.5) * 0.01], food('#cf9238', dull)).rotation.y = (random() - 0.5) * 0.3;
          if (left < 1) for (let i = 0; i < 9; i++) dinner.box([0.006, 0.003, 0.006], [(random() - 0.5) * 0.2, 0.008, 0.02 + random() * 0.05], food('#cf9238', dull));
        } else {
          const blobs = Array.from({ length: Math.round(left * 60) + 4 }, () => ({ at: [(random() - 0.5) * fw * 0.78 * mix(0.6, 1, left), 0.012 + random() * 0.016 * left, 0.014 + random() * 0.056] as P3, size: 0.011 + random() * 0.005 }));
          dinner.scatter(new THREE.SphereGeometry(1, 6, 5), food('#eda62a', dull), blobs);
        }
        // Sides: potato or tots, vegetable, dessert.
        const tots = meal === 'fish-sticks';
        if (tots) { for (let i = 0; i < Math.round(left * 6) + 1; i++) dinner.cylinder(0.011, 0.011, 0.022, [cell(0)[0] + (random() - 0.5) * 0.045, 0.016 + (i > 3 ? 0.012 : 0), cell(0)[2] + (random() - 0.5) * 0.045], food('#c98f3a', dull), 8).rotation.set(Math.PI / 2, 0, random() * 3); }
        else if (meal !== 'macaroni') {
          const mash = dinner.ball([0.034, 0.024 * mix(0.25, 1, left), 0.034], [cell(0)[0], 0.012, cell(0)[2]], food('#f1ead2', dull), 12);
          mash.rotation.y = random();
          if (left > 0.6) dinner.box([0.014, 0.008, 0.014], [cell(0)[0], 0.035, cell(0)[2]], food('#f2cf3a', dull, { emissive: '#f2cf3a', emissiveIntensity: dull ? 0 : 0.2 })).rotation.y = 0.5;
          if (meal === 'turkey' || meal === 'salisbury') dinner.cylinder(0.014, 0.014, 0.004, [cell(0)[0], 0.012 + 0.024 * left, cell(0)[2]], gravy, 10).visible = left > 0.6 && meal === 'turkey';
        } else {
          dinner.box([0.06, 0.012, 0.06], [cell(0)[0], 0.013, cell(0)[2]], food('#e9dcb4', dull)).visible = left > 0;
        }
        const corn = meal === 'chicken' || meal === 'fish-sticks';
        const veg = Array.from({ length: Math.round(mix(4, 70, left)) }, () => ({ at: [cell(1)[0] + (random() - 0.5) * 0.062, 0.01 + random() * 0.012 * left, cell(1)[2] + (random() - 0.5) * 0.062] as P3, size: corn ? 0.0045 : 0.0055 }));
        dinner.scatter(new THREE.SphereGeometry(1, 6, 5), food(corn ? '#f0c63a' : '#6fa83a', dull), veg);
        const sweet = meal === 'chicken' ? '#c9782a' : meal === 'turkey' ? '#a8162c' : meal === 'fish-sticks' ? '#f1dfa8' : '#3d2112';
        if (left > 0 || state === 'half') {
          const dessert = dinner.box([0.058 * (state === 'half' ? 0.6 : 1), meal === 'turkey' ? 0.01 : 0.02, 0.058], [cell(2)[0], 0.016, cell(2)[2]], food(sweet, dull, { roughness: meal === 'turkey' ? 0.15 : 0.8 }));
          dessert.rotation.y = (random() - 0.5) * 0.2;
          if (meal === 'fish-sticks') dinner.box([dessert.scale.x * 0.058 * (state === 'half' ? 0.6 : 1), 0.004, 0.058], [cell(2)[0], 0.028, cell(2)[2]], food('#e88aa8', dull)).rotation.y = dessert.rotation.y;
        }
        if (state === 'clean') for (let i = 0; i < 5; i++) dinner.box([0.03 + random() * 0.05, 0.002, 0.008 + random() * 0.012], [(random() - 0.5) * 0.18, 0.007, 0.02 + random() * 0.05], gravy).rotation.y = random() * 3;
        if (state === 'fresh') for (let i = 0; i < 3; i++) {
          const x = -0.07 + i * 0.07, wave = mix(0.006, 0.03, mood.energy), points: P3[] = [];
          for (let k = 0; k <= 8; k++) points.push([x + Math.sin(k * 1.1 + i * 2) * wave * (k / 8), 0.04 + k * 0.03, 0.03 + Math.cos(k * 0.9 + i) * wave * (k / 8)]);
          const wisp = dinner.tube(points, 0.006, steamMat);
          wisp.castShadow = false;
          steamers.push(wisp);
        }
      }
      // Fork.
      const fork = new Sculpture(context);
      fork.box([0.012, 0.003, 0.11], [0, 0, 0.03], steel);
      fork.box([0.022, 0.003, 0.02], [0, 0, -0.035], steel);
      for (let i = 0; i < 4; i++) fork.box([0.003, 0.003, 0.04], [-0.009 + i * 0.006, 0, -0.062], steel);
      g.root.add(fork.root);
      fork.root.scale.setScalar(1.3);
      if (state === 'cold') { fork.root.position.set(fx - 0.11, fy + 0.11, fz - 0.068); fork.root.rotation.set(-Math.PI / 2 + 0.25, 0.4, 0); }
      else if (state === 'half') { fork.root.position.set(fx + 0.06, fy + 0.034, fz + 0.07); fork.root.rotation.set(0.28, -0.7, 0); }
      else if (state === 'clean') { fork.root.position.set(fx + 0.02, fy + 0.012, fz + 0.03); fork.root.rotation.set(0, 1.2 + random(), 0); }
      else { fork.root.position.set(fx + fw * big / 2 + 0.03, T + 0.003, 0.08); fork.root.rotation.y = (random() - 0.5) * 0.3; }

      // Drink, back right.
      const dx = 0.19, dz = -0.09, drinkY = T;
      const glass = new THREE.MeshPhysicalMaterial({ color: '#dcebef', transparent: true, opacity: 0.4, roughness: 0.05 });
      const sweat = (radius: number, height: number) => {
        const drops = Array.from({ length: 34 }, () => { const t = random() * 6.3, y = random() * height * 0.8 + 0.01; return { at: [dx + Math.cos(t) * radius, drinkY + y, dz + Math.sin(t) * radius] as P3, size: 0.002 + random() * 0.0025 }; });
        g.scatter(new THREE.SphereGeometry(1, 6, 5), new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.05 }), drops);
        g.cylinder(radius * 1.5, radius * 1.5, 0.0015, [dx + 0.004, drinkY + 0.001, dz + 0.003], new THREE.MeshStandardMaterial({ color: '#bcd3dc', roughness: 0.05, transparent: true, opacity: 0.6 }), 20);
      };
      const level = state === 'clean' ? 0.12 : state === 'half' ? 0.5 : 0.85;
      if (drink === 'milk' || drink === 'iced-tea') {
        const r = 0.034, hgt = 0.14;
        g.mesh(new THREE.CylinderGeometry(r, r * 0.86, hgt, 18, 1, true), glass, [dx, drinkY + hgt / 2, dz]);
        g.cylinder(r * 0.93, r * 0.82, hgt * level, [dx, drinkY + 0.006 + hgt * level / 2, dz], new THREE.MeshStandardMaterial({ color: drink === 'milk' ? '#f6f3ea' : '#b8691e', roughness: 0.2, emissive: drink === 'milk' ? '#f6f3ea' : '#b8691e', emissiveIntensity: 0.12 }), 18);
        if (drink === 'iced-tea') g.cylinder(0.022, 0.022, 0.006, [dx + r, drinkY + hgt, dz], new THREE.MeshStandardMaterial({ color: '#f2d43a', roughness: 0.5 }), 12).rotation.z = Math.PI / 2;
        sweat(r, hgt);
      } else if (drink === 'beer') {
        const can = paint(128, 64, (ctx, w, h) => { const tone = ['#c2202f', '#e2b23a', '#1f4a8a', '#efe9d8'][Math.floor(random() * 4)]; ctx.fillStyle = '#e6e2d4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = tone; ctx.fillRect(0, 14, w, 36); ctx.fillStyle = '#e6e2d4'; for (let x = 8; x < w; x += 64) { ctx.beginPath(); ctx.ellipse(x + 20, 32, 20, 11, 0, 0, 7); ctx.fill(); } });
        g.mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.122, 20, 1, true), new THREE.MeshStandardMaterial({ map: can, metalness: 0.5, roughness: 0.35 }), [dx, drinkY + 0.061, dz]);
        g.cylinder(0.031, 0.033, 0.004, [dx, drinkY + 0.123, dz], steel, 20);
        g.ring(0.007, 0.002, [dx + 0.012, drinkY + 0.127, dz], steel).rotation.x = Math.PI / 2;
        if (mood.density > 0.55 || state === 'clean') { const empty = g.mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.122, 20), new THREE.MeshStandardMaterial({ map: can, metalness: 0.5, roughness: 0.35 }), [dx - 0.02, drinkY + 0.033, dz + 0.16]); empty.rotation.z = Math.PI / 2; empty.rotation.y = 0.5; }
        sweat(0.034, 0.12);
      } else if (drink === 'cola') {
        g.lathe([[0, 0], [0.028, 0], [0.03, 0.02], [0.024, 0.07], [0.03, 0.11], [0.028, 0.14], [0.013, 0.19], [0.013, 0.215]], new THREE.MeshPhysicalMaterial({ color: '#a9d4c4', transparent: true, opacity: 0.5, roughness: 0.05 }), [dx, drinkY, dz]);
        g.lathe([[0, 0.004], [0.025, 0.004], [0.027, 0.02], [0.021, 0.07], [0.027, 0.11], [0.025, 0.14 * level + 0.02], [0, 0.14 * level + 0.02]], new THREE.MeshStandardMaterial({ color: '#2a140c', roughness: 0.15 }), [dx, drinkY, dz]);
        g.mesh(new THREE.CylinderGeometry(0.0305, 0.0305, 0.03, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#c2202f', roughness: 0.5 }), [dx, drinkY + 0.105, dz]);
        g.rod([dx, drinkY + 0.03, dz], [dx + 0.03, drinkY + 0.27, dz + 0.01], 0.003, new THREE.MeshStandardMaterial({ color: '#f2ede0' }));
        sweat(0.03, 0.13);
      } else {
        g.mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 18, 1, true), new THREE.MeshStandardMaterial({ color: ['#c9642a', '#e2b23a', '#efe9d8', '#6f7a32'][Math.floor(random() * 4)], roughness: 0.35, side: THREE.DoubleSide }), [dx, drinkY + 0.045, dz]);
        g.cylinder(0.036, 0.036, 0.006, [dx, drinkY + 0.003, dz], new THREE.MeshStandardMaterial({ color: '#efe9d8' }), 18);
        g.cylinder(0.037, 0.035, 0.006, [dx, drinkY + 0.09 * level, dz], new THREE.MeshStandardMaterial({ color: '#2a170e', roughness: 0.15 }), 18);
        g.ring(0.026, 0.006, [dx + 0.046, drinkY + 0.048, dz], new THREE.MeshStandardMaterial({ color: '#efe9d8', roughness: 0.35 }), Math.PI).rotation.z = -Math.PI / 2;
      }

      if (!extras) return;
      if (a.extras === 'guide') {
        const cover = paint(96, 128, (ctx, w, h) => { ctx.fillStyle = '#f1ead6'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#c2202f'; ctx.fillRect(6, 6, 44, 30); ctx.fillStyle = '#fff'; ctx.font = 'bold 24px monospace'; ctx.fillText('TV', 12, 30); ctx.fillStyle = ['#3a6a8a', '#d9772b', '#6a3a7a'][Math.floor(random() * 3)]; ctx.fillRect(6, 42, w - 12, h - 50); ctx.fillStyle = '#e9c7a0'; ctx.beginPath(); ctx.arc(w / 2, 78, 20, 0, 7); ctx.fill(); });
        const pages = new THREE.MeshStandardMaterial({ color: '#f1ead6' });
        const guide = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.008, 0.16), [pages, pages, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6 }), pages, pages, pages]);
        guide.position.set(0.22, T + 0.004, 0.1);
        guide.castShadow = true;
        g.root.add(guide);
        guide.rotation.y = -0.3 + random() * 0.3;
        const remote = g.box([0.05, 0.02, 0.13], [-0.2, T + 0.01, -0.15], new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 0.5 }));
        remote.rotation.y = 1.2;
        for (let i = 0; i < 4; i++) g.box([0.012, 0.006, 0.02], [-0.24 + i * 0.027, T + 0.022, -0.166 + i * 0.0105], steel).rotation.y = 1.2;
      } else if (a.extras === 'condiments') {
        for (const [i, tone] of ['#f1ede4', '#3a3632'].entries()) { g.lathe([[0, 0], [0.016, 0], [0.018, 0.03], [0.012, 0.045], [0, 0.045]], glass, [-0.24 + i * 0.045, T, -0.155]); g.cylinder(0.011, 0.014, 0.028, [-0.24 + i * 0.045, T + 0.016, -0.155], new THREE.MeshStandardMaterial({ color: tone }), 10); g.cylinder(0.013, 0.013, 0.012, [-0.24 + i * 0.045, T + 0.05, -0.155], steel, 10); }
        g.lathe([[0, 0], [0.026, 0], [0.028, 0.08], [0.014, 0.13], [0.014, 0.155], [0, 0.155]], new THREE.MeshStandardMaterial({ color: '#b3200f', roughness: 0.25 }), [-0.13, T, -0.14]);
        g.cylinder(0.016, 0.016, 0.02, [-0.13, T + 0.165, -0.14], new THREE.MeshStandardMaterial({ color: '#f1ede4' }), 10);
      } else if (a.extras === 'napkin') {
        g.box([0.11, 0.004, 0.11], [0.22, T + 0.002, 0.11], new THREE.MeshStandardMaterial({ color: '#f4f0e6', roughness: 1 })).rotation.y = 0.3;
        g.cylinder(0.018, 0.018, 0.05, [-0.23, T + 0.025, -0.155], new THREE.MeshPhysicalMaterial({ color: '#d9822a', transparent: true, opacity: 0.8, roughness: 0.2 }), 12);
        g.cylinder(0.019, 0.019, 0.014, [-0.23, T + 0.057, -0.155], new THREE.MeshStandardMaterial({ color: '#f4f0e6' }), 12);
        g.mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.026, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#f4f0e6' }), [-0.23, T + 0.026, -0.155]);
      }
    };

    const first = new Sculpture(context);
    s.root.add(first.root);
    setTray(first, a.meal, a.state, a.drink, true);
    if (a.company === 'pair') {
      const second = new Sculpture(context);
      second.root.position.set(W + 0.16, 0, 0.03);
      second.root.rotation.y = -0.14;
      first.root.rotation.y = 0.1;
      s.root.add(second.root);
      const states = Object.keys(STATES) as (keyof typeof STATES)[], drinks = Object.keys(DRINKS) as (keyof typeof DRINKS)[];
      setTray(second, a.meal, states[Math.floor(random() * states.length)], drinks[Math.floor(random() * drinks.length)], false);
    } else if (a.company === 'folded') {
      const spare = new Sculpture(context);
      legs(spare, 0.02, 0.78);
      const panel = new Sculpture(context);
      top(panel, 0);
      panel.root.rotation.x = Math.PI / 2 - 0.05;
      panel.root.position.set(0, 0.58, 0.035);
      spare.root.add(panel.root);
      spare.root.position.set(W * 0.5 + 0.2, 0, -0.16);
      spare.root.rotation.set(-0.13, -0.5, 0);
      s.root.add(spare.root);
    }

    const rise = mix(0.3, 1.5, mood.energy);
    return s.finish({ update: (_dt, time) => steamers.forEach((wisp, i) => { wisp.rotation.y = Math.sin(time * rise + i * 2) * 0.3; wisp.scale.y = 1 + Math.sin(time * rise * 0.7 + i) * 0.08; }) });
  },
});
