import * as THREE from 'three';
import { Sculpture, choice, clamp01, defineThing, mix, noul } from '@conjure/kit';

function paint(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
interface Item { at: [number, number, number]; size: [number, number, number]; turn?: number; tilt?: number; colour: THREE.ColorRepresentation }
function instances(geometry: THREE.BufferGeometry, material: THREE.Material, items: readonly Item[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(items.length, 1));
  mesh.count = items.length;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((item, i) => {
    q.setFromEuler(e.set(item.tilt ?? 0, item.turn ?? 0, 0));
    m.compose(new THREE.Vector3(...item.at), q, new THREE.Vector3(...item.size));
    mesh.setMatrixAt(i, m); mesh.setColorAt(i, new THREE.Color(item.colour));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
const PACKS = {
  dinners: ['#c8281e', '#1f5fb8', '#2f8a4a', '#e8a81c', '#7a2d82', '#e85a1c', '#1c8f9a'],
  icecream: ['#f2b8c8', '#f6ecd2', '#6a4630', '#9ad8c8', '#f4d86a', '#d83a5a', '#8a6ad0'],
  pizza: ['#c8281e', '#1f7a3a', '#f0e6d2', '#e8a81c', '#2a2a30', '#c8281e'],
  vegetables: ['#3f9a3a', '#7ac23a', '#e8b81c', '#f07a1c', '#2f7a5a', '#c8e06a'],
  seafood: ['#1f5fb8', '#2f9ac8', '#f2a08a', '#e8eef2', '#16407a', '#f6d0c0'],
  mixed: ['#c8281e', '#1f5fb8', '#2f8a4a', '#e8a81c', '#f2b8c8', '#7a2d82', '#f0e6d2', '#f07a1c'],
  stripped: ['#c8281e', '#1f5fb8', '#e8a81c', '#f0e6d2'],
} as const;

export default defineThing({
  questions: {
    contents: choice('What is stocked behind the glass?', {
      dinners: 'Boxed TV dinners standing in bright ranks: meatloaf, lasagne, something with gravy.',
      icecream: 'Ice cream: round tubs and pints in pastel stacks, and boxes of lollies.',
      pizza: 'Frozen pizzas, wide flat boxes leaning face out in red and green.',
      vegetables: 'Slumped bags of peas, corn and mixed vegetables in greens and yellows.',
      seafood: 'Blue boxes of fish fingers and pink bags of prawns.',
      mixed: 'A bit of everything, whatever the night crew had left on the pallet.',
      stripped: 'Almost nothing: panic-bought bare before a storm, a few unwanted boxes left.',
    }),
    glass: choice('What state is the glass in?', {
      clear: 'Clean and clear, just wiped.',
      fogged: 'Fogged with condensation, heaviest along the bottom.',
      frosted: 'Furred with white frost creeping in from the edges.',
      wiped: 'Fogged, with a clear arc where a sleeve wiped a window to look in.',
      written: 'Fogged, and somebody has drawn in it with a fingertip.',
    }),
    door: choice('How have the doors been left?', {
      shut: 'All three shut tight.',
      ajar: 'One door left a hand-width ajar, cold fog spilling down to the floor.',
      wide: 'One door standing wide open, forgotten.',
      missing: 'One door taken off its hinges for repair, the bay open to the air.',
    }),
    light: choice('How is the case lit?', {
      steady: 'Every tube steady and cold white.',
      flicker: 'One tube stuttering, about to go.',
      half: 'One bay dead and dark, the others still lit.',
      dark: 'Power cut: no light inside at all, the case a dim cabinet of shapes.',
    }),
    tags: choice('What is stuck on it?', {
      none: 'Nothing but the shelf price rails.',
      sale: 'Yellow sale tags sticking out from every shelf edge.',
      clearance: 'Red clearance starbursts stuck on the glass.',
      poster: 'A big paper offer poster taped inside one door.',
      notice: 'A hand-written OUT OF ORDER sheet taped across one door.',
    }),
    shell: choice('What is the cabinet like?', {
      white: 'White enamel with a blue stripe, a 1980s supermarket standard.',
      black: 'Matt black with slim frames and hard LED light, a modern refit.',
      steel: 'Brushed stainless steel, warehouse club plain.',
      woodgrain: 'Brown wood-grain laminate with chrome trim, straight from the 1970s.',
    }),
    leak: noul('Is meltwater pooling on the floor in front of it?'),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const W = 2.3, H = 2.08, D = 0.78, BAY = 0.74, BASE = 0.3, TOP = 1.86, FRONT = D / 2;
    const shellColour = { white: '#eceee9', black: '#26282c', steel: '#b4babc', woodgrain: '#7a5232' }[a.shell];
    const shell = s.material(shellColour, { metalness: a.shell === 'steel' ? 0.7 : 0.05, roughness: a.shell === 'steel' ? 0.38 : 0.55 });
    const frame = s.material(a.shell === 'black' ? '#15171a' : a.shell === 'woodgrain' ? '#d0d4d6' : '#8c9498', { metalness: 0.6, roughness: 0.35 });
    const dark = s.material('#1c2024');
    const power = a.light !== 'dark';
    const tint = new THREE.Color().setHSL(mix(0.58, 0.12, mood.warmth), 0.55, mix(0.86, 0.93, mood.cheer));
    const deadBay = a.light === 'half' ? Math.floor(random() * 3) : -1;
    const flickBay = a.light === 'flicker' ? Math.floor(random() * 3) : -1;
    const openBay = a.door === 'shut' ? -1 : Math.floor(random() * 3);

    // Carcass.
    const solid = (size: [number, number, number], at: [number, number, number], material: THREE.Material) => { const m = s.box(size, at, material); m.castShadow = false; return m; };
    s.box([W, H, 0.05], [0, H / 2, -FRONT + 0.025], shell);
    for (const side of [-1, 1]) solid([0.05, H, D], [side * (W / 2 - 0.025), H / 2, 0], shell);
    solid([W, H - TOP, D], [0, (H + TOP) / 2, 0], shell);
    s.box([W, BASE, D], [0, BASE / 2, 0], shell);
    s.box([W + 0.02, 0.09, D + 0.02], [0, 0.045, 0], dark);
    for (let i = 0; i < 6; i++) s.box([W * 0.86, 0.012, 0.01], [0, 0.13 + i * 0.024, FRONT + 0.002], dark);
    if (a.shell === 'white') s.box([W, 0.04, 0.006], [0, TOP + 0.03, FRONT + 0.003], s.material('#2a62c8'));
    if (a.shell === 'woodgrain') { for (let i = 0; i < 14; i++) s.box([W, 0.004, 0.004], [0, 0.11 + random() * 0.18, FRONT + 0.004], s.material('#5a3a20')); s.box([W, 0.025, 0.012], [0, TOP + 0.012, FRONT + 0.004], frame); }
    // Lit header.
    const title = { dinners: 'FROZEN MEALS', icecream: 'ICE CREAM', pizza: 'PIZZA', vegetables: 'FROZEN VEG', seafood: 'SEAFOOD', mixed: 'FROZEN FOODS', stripped: 'FROZEN FOODS' }[a.contents];
    const headerArt = paint(512, 48, (ctx) => {
      ctx.fillStyle = a.shell === 'black' ? '#101216' : a.shell === 'woodgrain' ? '#f0d8a0' : '#f4f8fa'; ctx.fillRect(0, 0, 512, 48);
      ctx.fillStyle = a.shell === 'black' ? '#bfe8ff' : a.shell === 'woodgrain' ? '#8a3a12' : '#1f4fa8';
      ctx.font = `900 30px ${a.shell === 'woodgrain' ? 'serif' : 'sans-serif'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(title, 256, 26);
      for (const x of [40, 472]) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const t = i * Math.PI / 3; ctx.moveTo(x, 24); ctx.lineTo(x + Math.cos(t) * 15, 24 + Math.sin(t) * 15); } ctx.lineWidth = 3; ctx.strokeStyle = ctx.fillStyle; ctx.stroke(); }
    });
    const headerMat = new THREE.MeshStandardMaterial({ map: headerArt, emissive: '#ffffff', emissiveMap: headerArt, emissiveIntensity: power ? 0.75 : 0.03, roughness: 0.5 });
    s.mesh(new THREE.PlaneGeometry(W * 0.8, W * 0.8 * 48 / 512), headerMat, [0, (H + TOP) / 2 + 0.01, FRONT + 0.004]).castShadow = false;

    // Interior: one glowing back panel and tube pair per bay, wire shelves across.
    const shelfY = [0.34, 0.64, 0.94, 1.24, 1.54];
    const bays: { panel: THREE.MeshStandardMaterial; tube: THREE.MeshStandardMaterial; level: number; flick: boolean }[] = [];
    for (let b = 0; b < 3; b++) {
      const x = (b - 1) * BAY;
      const level = !power || b === deadBay ? 0.02 : 1;
      const panel = new THREE.MeshStandardMaterial({ color: level > 0.5 ? '#f2f7fa' : '#1c2228', emissive: tint, emissiveIntensity: level * 0.55, roughness: 0.8 });
      const tube = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: tint, emissiveIntensity: level * 2.2, roughness: 0.3 });
      solid([BAY - 0.02, TOP - BASE, 0.01], [x, (TOP + BASE) / 2, -FRONT + 0.06], panel);
      for (const side of [-1, 1]) solid([0.018, TOP - BASE - 0.1, 0.018], [x + side * (BAY / 2 - 0.035), (TOP + BASE) / 2, FRONT - 0.07], tube);
      bays.push({ panel, tube, level, flick: b === flickBay });
    }
    const shelfMat = s.material('#dfe5e8', { metalness: 0.4, roughness: 0.4 });
    const rail = s.material(a.shell === 'woodgrain' ? '#e8c86a' : '#f4f4f0', { roughness: 0.5 });
    const shelfDark = s.material('#3a424a');
    for (const y of shelfY) { for (let b = 0; b < 3; b++) solid([BAY - 0.03, 0.016, D - 0.16], [(b - 1) * BAY, y - 0.008, -0.02], !power || b === deadBay ? shelfDark : shelfMat); solid([W - 0.1, 0.035, 0.008], [0, y - 0.018, FRONT - 0.1], rail); }
    for (const x of [-BAY / 2, BAY / 2]) s.box([0.05, TOP - BASE, 0.06], [x, (TOP + BASE) / 2, FRONT - 0.03], frame);

    // Stock.
    const stripped = a.contents === 'stripped';
    const fill = stripped ? 0.07 : clamp01(mix(0.28, 1.02, mood.density) - mood.wear * 0.12);
    const boxes: Item[] = [], labels: Item[] = [], dots: Item[] = [], tubs: Item[] = [], lids: Item[] = [], bags: Item[] = [];
    const dim = (colour: string, b: number) => { const c = new THREE.Color(colour); if (!power || b === deadBay) c.multiplyScalar(0.22).lerp(new THREE.Color('#1c242c'), 0.3); return c; };
    const palette = PACKS[a.contents];
    for (let b = 0; b < 3; b++) for (const [row, y] of shelfY.entries()) {
      const kind = a.contents === 'mixed' || stripped ? pick(['dinners', 'icecream', 'pizza', 'vegetables', 'seafood'] as const) : a.contents;
      const x0 = (b - 1) * BAY - BAY / 2 + 0.07, span = BAY - 0.14;
      const z = FRONT - 0.19;
      const brand = pick(palette), runBrand = random() < 0.6;
      if (kind === 'dinners' || kind === 'seafood') {
        const w = kind === 'dinners' ? 0.185 : 0.14, h = kind === 'dinners' ? 0.235 : 0.2, n = Math.floor(span / (w + 0.012));
        for (let i = 0; i < n; i++) {
          if (random() > fill) continue;
          const colour = dim(runBrand ? brand : pick(palette), b), x = x0 + (i + 0.5) * span / n, lean = (random() - 0.5) * 0.08 * (1 + mood.wear * 2);
          const fallen = random() < mood.wear * 0.15;
          if (fallen) { boxes.push({ at: [x, y + 0.022, z - 0.03], size: [w, 0.04, h], turn: lean * 6, colour }); continue; }
          for (let k = 0; k < 2; k++) boxes.push({ at: [x, y + h / 2, z - k * 0.05], size: [w, h, 0.042], turn: lean, colour });
          labels.push({ at: [x, y + h * 0.78, z + 0.022], size: [w * 0.86, h * 0.22, 1], turn: lean, colour: dim('#f6f2e4', b) });
          dots.push({ at: [x, y + h * 0.36, z + 0.022], size: [w * 0.36, w * 0.36, 1], turn: lean, colour: dim(pick(['#c98a4a', '#e8c86a', '#a84a2a', '#e8dcc0', '#6a9a3a']), b) });
        }
      } else if (kind === 'pizza') {
        const w = 0.27, n = 2;
        for (let i = 0; i < n; i++) {
          if (random() > fill) continue;
          const colour = dim(runBrand ? brand : pick(palette), b), x = x0 + (i + 0.5) * span / n, tilt = -0.16 - random() * 0.1;
          const depth = 1 + Math.floor(random() * 3 * fill);
          for (let k = 0; k < depth; k++) boxes.push({ at: [x, y + 0.133, z - 0.03 - k * 0.04], size: [w, w, 0.032], tilt, colour });
          dots.push({ at: [x, y + 0.136, z - 0.008], size: [w * 0.78, w * 0.78, 1], tilt, colour: dim('#e0a23a', b) });
          dots.push({ at: [x, y + 0.137, z - 0.0065], size: [w * 0.62, w * 0.62, 1], tilt, colour: dim(pick(['#c8381e', '#d85a2a', '#b8281e']), b) });
          labels.push({ at: [x, y + 0.245, z - 0.02], size: [w * 0.9, 0.035, 1], tilt, colour: dim('#f6f2e4', b) });
        }
      } else if (kind === 'icecream') {
        const n = 5;
        for (let i = 0; i < n; i++) {
          if (random() > fill) continue;
          const x = x0 + (i + 0.5) * span / n, stack = random() < 0.75 * fill ? 2 : 1;
          for (let k = 0; k < stack; k++) {
            const colour = dim(runBrand ? brand : pick(palette), b);
            tubs.push({ at: [x, y + 0.058 + k * 0.122, z], size: [0.056, 0.105, 0.056], colour });
            lids.push({ at: [x, y + 0.115 + k * 0.122, z], size: [0.06, 0.016, 0.06], colour: dim(pick(['#f6f2e4', '#2a2a30', '#c8a84a']), b) });
            labels.push({ at: [x, y + 0.06 + k * 0.122, z + 0.057], size: [0.06, 0.045, 1], colour: dim('#f6f2e4', b) });
          }
        }
      } else {
        const n = 4;
        for (let i = 0; i < n; i++) {
          if (random() > fill) continue;
          const x = x0 + (i + 0.5) * span / n, colour = dim(runBrand ? brand : pick(palette), b), slump = random();
          bags.push({ at: [x, y + mix(0.105, 0.07, slump), z - 0.03], size: [0.078, mix(0.105, 0.07, slump), 0.05 + slump * 0.03], turn: (random() - 0.5) * 0.5, tilt: -slump * 0.3, colour });
          labels.push({ at: [x, y + 0.11, z + 0.025], size: [0.085, 0.05, 1], colour: dim('#f6f2e4', b), tilt: -slump * 0.3 });
          if (random() < fill * 0.5) bags.push({ at: [x + 0.02, y + 0.05, z - 0.14], size: [0.08, 0.05, 0.07], turn: random() * 3, colour });
        }
      }
      void row;
    }
    const stockMat = () => new THREE.MeshStandardMaterial({ roughness: 0.55 });
    const put = (mesh: THREE.InstancedMesh) => { mesh.castShadow = false; mesh.receiveShadow = false; s.root.add(mesh); };
    put(instances(new THREE.BoxGeometry(1, 1, 1), stockMat(), boxes));
    put(instances(new THREE.PlaneGeometry(1, 1), stockMat(), labels));
    put(instances(new THREE.CircleGeometry(0.5, 18), stockMat(), dots));
    put(instances(new THREE.CylinderGeometry(1, 0.86, 1, 16), stockMat(), tubs));
    put(instances(new THREE.CylinderGeometry(1, 1, 1, 16), stockMat(), lids));
    put(instances(new THREE.SphereGeometry(1, 12, 8), stockMat(), bags));

    // Sale tags on the rails.
    if (a.tags === 'sale') {
      const flags: Item[] = [];
      for (let b = 0; b < 3; b++) for (const y of shelfY) for (let i = 0; i < 2; i++) if (random() < 0.75) flags.push({ at: [(b - 1) * BAY + (random() - 0.5) * 0.5, y - 0.035, FRONT - 0.09], size: [0.075, 0.06, 1], colour: random() < 0.8 ? '#ffd81c' : '#f0281c' });
      const flagMesh = instances(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ emissive: '#ffd81c', emissiveIntensity: power ? 0.25 : 0, roughness: 0.6 }), flags);
      flagMesh.castShadow = false; s.root.add(flagMesh);
    }
    // Frost crust on the shelf edges.
    const crust = (a.glass === 'frosted' ? 0.5 : 0) + mood.wear * 0.6;
    if (crust > 0.3) s.scatter(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: '#f4f9fc', roughness: 0.9 }), Array.from({ length: Math.round(crust * 46) }, () => {
      const y = pick(shelfY), edge = random() < 0.5;
      return { at: [edge ? pick([-1, 1]) * (W / 2 - 0.07 - random() * 0.04) : (random() - 0.5) * (W - 0.2), y + (edge ? random() * 0.26 : -0.03), edge ? (random() - 0.5) * 0.4 : FRONT - 0.1] as const, size: 0.015 + random() * 0.03 * crust };
    })).castShadow = false;

    // Doors.
    const fogLevel = { clear: 0, fogged: 0.6, frosted: 0.75, wiped: 0.7, written: 0.7 }[a.glass];
    const doorW = BAY - 0.012, doorH = TOP - BASE - 0.012;
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#dff2ff', transparent: true, opacity: 0.1, roughness: 0.03, depthWrite: false });
    const fogBlobs: THREE.Mesh[] = [];
    for (let b = 0; b < 3; b++) {
      if (b === openBay && a.door === 'missing') {
        for (const y of [BASE + 0.12, TOP - 0.12]) s.box([0.03, 0.07, 0.03], [(b - 1) * BAY - BAY / 2 + 0.03, y, FRONT + 0.012], frame);
        continue;
      }
      const door = new THREE.Group();
      door.position.set((b - 1) * BAY - doorW / 2, BASE + 0.006, FRONT + 0.012);
      const bar = (size: [number, number, number], at: [number, number, number], material: THREE.Material = frame) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...at); m.castShadow = true; door.add(m); return m; };
      const t = a.shell === 'black' ? 0.03 : 0.045;
      bar([doorW, t, 0.03], [doorW / 2, t / 2, 0]); bar([doorW, t, 0.03], [doorW / 2, doorH - t / 2, 0]);
      bar([t, doorH, 0.03], [t / 2, doorH / 2, 0]); bar([t, doorH, 0.03], [doorW - t / 2, doorH / 2, 0]);
      bar([0.022, 0.5, 0.022], [doorW - t - 0.03, doorH * 0.52, 0.045], a.shell === 'black' ? frame : dark);
      for (const y of [-0.22, 0.22]) bar([0.022, 0.022, 0.04], [doorW - t - 0.03, doorH * 0.52 + y, 0.025], dark);
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(doorW - t * 2, doorH - t * 2), glassMat); pane.position.set(doorW / 2, doorH / 2, 0.004); door.add(pane);
      const local = clamp01(fogLevel + mood.wear * 0.22 + (random() - 0.5) * 0.2);
      if (local > 0.08 || a.tags === 'clearance' || a.tags === 'poster' || a.tags === 'notice') {
        const mark = a.glass === 'wiped' ? (b === 1 || random() < 0.4) : a.glass === 'written' ? b === Math.floor(random() * 3) || b === 1 : false;
        const sticker = b === (openBay === 1 ? 0 : 1) || (a.tags === 'clearance' && random() < 0.6);
        const art = paint(256, 512, (ctx) => {
          ctx.clearRect(0, 0, 256, 512);
          if (local > 0.08) {
            const g = ctx.createLinearGradient(0, 0, 0, 512);
            g.addColorStop(0, `rgba(238,246,250,${local * 0.28})`); g.addColorStop(0.55, `rgba(238,246,250,${local * 0.45})`); g.addColorStop(1, `rgba(244,250,252,${Math.min(1, local * 1.1)})`);
            ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 512);
            if (a.glass === 'frosted') {
              ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.3;
              for (let i = 0; i < 150; i++) { const edge = random(), x = edge < 0.5 ? (random() < 0.5 ? random() * 60 : 256 - random() * 60) : random() * 256, y = edge < 0.5 ? random() * 512 : (random() < 0.3 ? random() * 70 : 512 - random() * 150); for (let k = 0; k < 6; k++) { const t2 = k * Math.PI / 3 + x, r = 5 + random() * 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(t2) * r, y + Math.sin(t2) * r); ctx.stroke(); } }
              const rg = ctx.createRadialGradient(128, 230, 30, 128, 256, 300); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.45, 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(255,255,255,0.8)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, 256, 512);
            } else {
              // Beads and runs of condensation.
              ctx.globalCompositeOperation = 'destination-out';
              for (let i = 0; i < 26; i++) { const x = random() * 256, y = 60 + random() * 300, len = 30 + random() * 150; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, 2.5, len); ctx.beginPath(); ctx.arc(x + 1, y + len, 4, 0, 7); ctx.fill(); }
              if (mark) {
                ctx.strokeStyle = 'rgba(0,0,0,0.95)'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                if (a.glass === 'wiped') { ctx.lineWidth = 62; ctx.beginPath(); ctx.arc(128 + (random() - 0.5) * 40, 330, 120, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.lineWidth = 50; ctx.beginPath(); ctx.arc(128, 400, 120, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
                else {
                  ctx.lineWidth = 11; const doodle = Math.floor(random() * 4); ctx.beginPath();
                  if (doodle === 0) { ctx.arc(128, 210, 62, 0, 7); ctx.moveTo(110, 190); ctx.lineTo(110, 200); ctx.moveTo(148, 190); ctx.lineTo(148, 200); ctx.moveTo(165, 222); ctx.arc(128, 222, 37, 0, Math.PI); }
                  else if (doodle === 1) { ctx.moveTo(128, 260); ctx.bezierCurveTo(30, 190, 80, 110, 128, 170); ctx.bezierCurveTo(176, 110, 226, 190, 128, 260); }
                  else if (doodle === 2) { ctx.moveTo(60, 150); ctx.lineTo(60, 250); ctx.moveTo(60, 200); ctx.lineTo(110, 200); ctx.moveTo(110, 150); ctx.lineTo(110, 250); ctx.moveTo(150, 150); ctx.lineTo(150, 250); ctx.moveTo(190, 150); ctx.lineTo(190, 215); ctx.moveTo(190, 245); ctx.lineTo(190, 250); }
                  else { ctx.moveTo(50, 160); ctx.lineTo(50, 250); ctx.lineTo(95, 250); ctx.moveTo(120, 205); ctx.arc(140, 205, 30, Math.PI, Math.PI * 3); ctx.moveTo(185, 160); ctx.lineTo(185, 250); ctx.lineTo(225, 250); }
                  ctx.stroke();
                }
              }
              ctx.globalCompositeOperation = 'source-over';
            }
          }
          if (a.tags === 'clearance' && sticker) for (let n = 0; n < 2; n++) {
            const x = 60 + random() * 136, y = 90 + random() * 330, r = 34 + random() * 12;
            ctx.fillStyle = '#e8201c'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const t2 = i * Math.PI / 12, rr = i % 2 ? r : r * 0.78; ctx.lineTo(x + Math.cos(t2) * rr, y + Math.sin(t2) * rr); } ctx.fill();
            ctx.fillStyle = '#fff4b0'; ctx.font = '900 22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(pick(['50%', 'SALE', '99¢', '-30%']), x, y);
          }
          if (a.tags === 'poster' && sticker) {
            ctx.fillStyle = '#ffe21c'; ctx.fillRect(38, 110, 180, 230); ctx.fillStyle = '#e8201c'; ctx.fillRect(38, 110, 180, 50);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.font = '900 30px sans-serif'; ctx.fillText('SPECIAL', 128, 136);
            ctx.fillStyle = '#e8201c'; ctx.font = '900 76px sans-serif'; ctx.fillText(pick(['2 FOR', '3 FOR', 'ANY 4']), 128, 222, 160); ctx.fillText(pick(['$5', '$10', '$7']), 128, 295);
          }
          if (a.tags === 'notice' && sticker) {
            ctx.save(); ctx.translate(128, 230); ctx.rotate((random() - 0.5) * 0.14); ctx.fillStyle = '#f8f6ee'; ctx.fillRect(-88, -62, 176, 124);
            ctx.fillStyle = '#20242a'; ctx.font = 'italic 900 32px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('OUT OF', 0, -22); ctx.fillText('ORDER', 0, 18);
            ctx.font = 'italic 16px sans-serif'; ctx.fillText('sorry! - mgmt', 0, 46);
            ctx.fillStyle = 'rgba(200,190,150,0.9)'; ctx.fillRect(-98, -70, 34, 14); ctx.fillRect(64, -70, 34, 14); ctx.restore();
          }
        });
        const film = new THREE.Mesh(new THREE.PlaneGeometry(doorW - t * 2, doorH - t * 2), new THREE.MeshBasicMaterial({ map: art, color: !power || b === deadBay ? '#7c8790' : '#ffffff', transparent: true, depthWrite: false }));
        film.position.set(doorW / 2, doorH / 2, 0.008); film.renderOrder = 2; door.add(film);
      }
      if (b === openBay) door.rotation.y = a.door === 'ajar' ? -0.42 - random() * 0.15 : -1.25 - random() * 0.4;
      s.root.add(door);
    }

    // Cold fog rolling out of an open bay.
    if (openBay >= 0 && power) {
      const mist = new THREE.MeshBasicMaterial({ color: '#f2f8fb', transparent: true, opacity: 0.13, depthWrite: false });
      for (let i = 0; i < 9; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mist);
        blob.position.set((openBay - 1) * BAY + (random() - 0.5) * 0.7, 0.08 + random() * 0.22, FRONT + 0.1 + random() * 0.55);
        blob.scale.set(0.22 + random() * 0.22, 0.07 + random() * 0.08, 0.2 + random() * 0.2);
        s.root.add(blob); fogBlobs.push(blob);
      }
    }
    if (a.leak) {
      const shape = new THREE.Shape(); const phase = random() * 6;
      for (let i = 0; i <= 36; i++) { const t = i / 36 * Math.PI * 2, r = 0.34 * (1 + 0.2 * Math.sin(t * 3 + phase) + 0.12 * Math.sin(t * 5)); const x = Math.cos(t) * r * 1.9, y = Math.sin(t) * r * 0.75; if (i) shape.lineTo(x, y); else shape.moveTo(x, y); }
      const pool = s.mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8fa2ac', roughness: 0.04, metalness: 0.5, transparent: true, opacity: 0.75 }), [(random() - 0.5) * 0.8, 0.004, FRONT + 0.22]);
      pool.castShadow = false;
    }

    const pace = mix(0.5, 2.4, mood.energy);
    return s.finish({
      update(_dt, time) {
        for (const [i, bay] of bays.entries()) {
          let on = 0.985 + 0.015 * Math.sin(time * 50 + i);
          if (bay.flick) { const n = Math.sin(time * 29 * pace) * Math.sin(time * 6.7 * pace + 1) + 0.5 * Math.sin(time * 1.9); on = n > 0.35 ? 0.12 : 1; }
          bay.panel.emissiveIntensity = bay.level * 0.55 * on; bay.tube.emissiveIntensity = bay.level * 2.2 * on;
        }
        fogBlobs.forEach((blob, i) => { blob.position.y += Math.sin(time * 0.6 * pace + i * 1.7) * 0.0004; blob.position.z += Math.sin(time * 0.35 * pace + i) * 0.0005; });
      },
    });
  },
});
