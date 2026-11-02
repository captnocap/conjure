import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

export default defineThing({
  questions: {
    cleaver: choice('Where is the cleaver?', {
      sunk: 'Sunk into the block at an angle, handle in the air, left mid-thought.',
      flat: 'Laid flat on the wood, blade wiped.',
      pair: 'Two of them: the heavy bone chopper sunk in, a thin slicer laid beside it.',
      hung: 'Hung on the stand by the hole in its blade; the block is bare.',
    }),
    job: choice('What state is the block in?', {
      clean: 'Scraped pale and scattered with coarse salt, ready for the morning.',
      poultry: 'Mid-job: a soy chicken half chopped into a neat row of pieces.',
      pork: 'Mid-job: a rack of ribs hacked into chunks, bone chips flying.',
      fish: 'Mid-job: a big fish head split in two, scales everywhere.',
      covered: 'Closed: a damp cloth draped over the top.',
    }),
    thick: score('How thick is the block?', ['A thin disc worn almost through', 'A hand deep', 'A solid drum', 'A massive stump as tall as it is wide']),
    wood: choice('What wood is it?', {
      pale: 'Pale yellow tamarind, almost cream where it is scraped.',
      red: 'Red-brown ironwood, dark and dense.',
      grey: 'Old grey wood split by a long crack and held with a steel hoop.',
    }),
    stand: choice('What does it sit on?', {
      tripod: 'A steel ring on three splayed legs.',
      table: 'A welded angle-iron frame with a shelf.',
      crate: 'Two stacked plastic crates.',
      log: 'Another, rougher log stood on end.',
    }),
    bucket: choice('What is the bone bucket underneath like?', {
      red: 'A red plastic bucket full of bones and trimmings.',
      tin: 'A cut-down cooking oil tin, bones sticking out.',
      empty: 'A steel pail, emptied and rinsed.',
      none: 'There is no bucket: the scraps go on the floor.',
    }),
    binding: choice('How is the chopping block reinforced?', { none: 'Only its existing hoops, if any.', iron: 'Two dark iron bands.', copper: 'Two broad copper bands with rivets.', rope: 'Three turns of thick binding rope.' }),
    bladeProfile: choice('What shape are the working cleaver blades?', { square: 'Square heavy blades.', long: 'Long narrow slicing blades.', broad: 'Extra broad rectangular choppers.', rounded: 'Blades with a rounded upper corner.' }),
    scraper: choice('What is used to scrape the block clean?', { none: 'No scraper nearby.', broad: 'A broad steel scraper on a side hook.', curved: 'A curved half-moon scraper.', brush: 'A stiff bamboo block brush.' }),
    saltDish: choice('Where is the cleaning salt kept?', { none: 'No salt dish.', enamel: 'In a small enamel cup on a shelf.', tin: 'In a lidded square tin.', bowl: 'In a dark pottery bowl with a wooden spoon.' }),
    rinseBottle: choice('What rinse container is nearby?', { none: 'No rinse container.', squeeze: 'A white squeeze bottle.', glass: 'A green bottle with a cork.', jug: 'A blue plastic jug.' }),
    sideShelf: choice('What extra surface folds out from the stand?', { none: 'No extra surface.', board: 'A small wooden preparation board.', steel: 'A steel tray on brackets.', slatted: 'A short slatted drying shelf.' }),
    footrest: choice('What foot support is fixed to the stand?', { none: 'No foot support.', bar: 'A simple low crossbar.', step: 'A broad timber step.', hoop: 'A low circular foot rail.' }),
    workMat: choice('What is under the chopping station?', { bare: 'The bare floor.', rubber: 'A rectangular ribbed rubber mat.', boards: 'A small duckboard platform.', tile: 'A square of cream kitchen tiles.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const R = 0.27, TOP = 0.86;
    const thick = mix(0.1, 0.52, a.thick);
    const base = TOP - thick;
    const dish = mix(0.008, 0.045, mood.wear) * Math.min(1, thick / 0.2);
    const tone = { pale: ['#e2c88e', '#b8935a'], red: ['#b06a48', '#6e3a26'], grey: ['#b3a892', '#7a705e'] }[a.wood];
    const steel = s.material('#b9bfc1', { metalness: 0.7, roughness: mix(0.3, 0.6, mood.wear) });
    const iron = s.material('#3a3d3f', { metalness: 0.5, roughness: 0.6 });
    const bloody = a.job === 'pork' || a.job === 'poultry' || a.job === 'fish';

    // One canvas wraps the whole lathe: v runs from the centre of the top, out, and down the side.
    const SPLIT = 5 / 8;
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    {
      const ctx = canvas.getContext('2d')!;
      const y = (v: number) => v * 512;
      ctx.fillStyle = tone[0]; ctx.fillRect(0, 0, 512, 512);
      // Growth rings.
      for (let v = 0.01; v < SPLIT; v += 0.008 + random() * 0.018) { ctx.fillStyle = `rgba(90,55,20,${0.12 + random() * 0.2})`; ctx.fillRect(0, y(v), 512, 1 + random() * 2); }
      // The worn centre is paler; with work on it, stained.
      const centre = ctx.createLinearGradient(0, y(0), 0, y(SPLIT));
      centre.addColorStop(0, bloody ? 'rgba(150,40,35,0.5)' : 'rgba(255,248,225,0.6)');
      centre.addColorStop(0.55, bloody ? 'rgba(150,50,40,0.22)' : 'rgba(255,248,225,0.3)');
      centre.addColorStop(1, 'rgba(90,60,30,0.25)');
      ctx.fillStyle = centre; ctx.fillRect(0, y(SPLIT), 512, y(0) - y(SPLIT));
      // Radial drying cracks.
      ctx.fillStyle = 'rgba(40,25,10,0.7)';
      for (let i = 0; i < 3 + Math.round(mood.wear * 6); i++) { const x = random() * 512, from = random() * 0.2; ctx.fillRect(x, y(SPLIT), 1.5 + random() * 2.5, y(from) - y(SPLIT)); }
      // Thousands of cuts.
      const cuts = Math.round(mix(200, 1400, mood.wear));
      for (let i = 0; i < cuts; i++) {
        const v = Math.pow(random(), 1.4) * SPLIT * 0.95, x = random() * 512, len = (8 + random() * 30) / Math.max(0.15, v / SPLIT);
        ctx.strokeStyle = random() < 0.6 ? 'rgba(255,245,215,0.35)' : 'rgba(70,40,15,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y(v)); ctx.lineTo(x + len * (random() - 0.5) * 2, y(v) + (random() - 0.5) * 16); ctx.stroke();
      }
      // Side: vertical grain, darker and greasy toward the top edge.
      ctx.fillStyle = tone[1]; ctx.fillRect(0, y(1), 512, y(SPLIT) - y(1));
      for (let x = 0; x < 512; x += 2) { ctx.fillStyle = `rgba(${random() < 0.5 ? '255,230,180' : '40,25,10'},${random() * 0.2})`; ctx.fillRect(x, y(1), 1 + random() * 3, y(SPLIT) - y(1)); }
      const grime = ctx.createLinearGradient(0, y(SPLIT), 0, y(0.85));
      grime.addColorStop(0, `rgba(50,25,15,${0.25 + mood.wear * 0.4})`); grime.addColorStop(1, 'rgba(50,25,15,0)');
      ctx.fillStyle = grime; ctx.fillRect(0, y(SPLIT), 512, y(0.85) - y(SPLIT));
      if (a.wood === 'grey') { ctx.fillStyle = 'rgba(20,15,10,0.85)'; ctx.fillRect(140, y(1), 5, y(0.1) - y(1)); }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const profile: [number, number][] = [[0.001, thick - dish], [R * 0.3, thick - dish * 0.9], [R * 0.6, thick - dish * 0.45], [R * 0.85, thick - dish * 0.08], [R * 0.96, thick], [R, thick - 0.012], [R * 1.01, thick * 0.5], [R * 0.99, 0.004], [0.001, 0]];
    const geometry = new THREE.LatheGeometry(profile.slice().reverse().map(([x, y]) => new THREE.Vector2(x, y)), 40);
    {
      // A trunk is never a true circle.
      const position = geometry.getAttribute('position');
      const p1 = random() * 6, p2 = random() * 6;
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i), t = Math.atan2(z, x);
        const k = 1 + 0.035 * Math.sin(t * 2 + p1) + 0.02 * Math.sin(t * 5 + p2) + (a.wood === 'grey' ? -0.05 * Math.exp(-Math.pow((t - 1.0) * 6, 2)) : 0);
        position.setX(i, x * k); position.setZ(i, z * k);
      }
      geometry.computeVertexNormals();
    }
    const block = s.mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85 }), [0, base, 0]);
    block.rotation.y = random() * 6;
    if (a.wood === 'grey' || thick > 0.3 && random() < 0.5) for (const y of thick > 0.3 ? [0.3, 0.75] : [0.5]) s.mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.03, 40, 1, true), s.material('#b9bfc1', { metalness: 0.7, roughness: 0.45, side: THREE.DoubleSide }), [0, base + thick * y, 0]);

    // Stand.
    if (a.stand === 'tripod') {
      s.ring(R * 0.92, 0.016, [0, base - 0.012, 0], iron).rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const t = (i / 3) * Math.PI * 2 + 0.5;
        s.rod([Math.cos(t) * R * 0.92, base - 0.012, Math.sin(t) * R * 0.92], [Math.cos(t) * R * 1.35, 0, Math.sin(t) * R * 1.35], 0.018, iron);
      }
      if (base > 0.4) s.ring(R * 1.14, 0.01, [0, base * 0.5, 0], iron).rotation.x = Math.PI / 2;
    } else if (a.stand === 'table') {
      const w = R * 2 + 0.06;
      s.box([w, 0.03, w], [0, base - 0.015, 0], steel);
      for (const x of [-1, 1]) for (const z of [-1, 1]) s.box([0.035, base - 0.03, 0.035], [x * (w / 2 - 0.02), (base - 0.03) / 2, z * (w / 2 - 0.02)], steel);
      if (base > 0.4) s.box([w, 0.02, w], [0, 0.14, 0], steel);
    } else if (a.stand === 'crate') {
      const n = Math.max(1, Math.round(base / 0.28)), h = base / n;
      for (let i = 0; i < n; i++) {
        const crate = s.material(pick(['#c9372c', '#2f6fb3', '#e0a52a', '#3f9a5a']), { roughness: 0.6 });
        const y = i * h + h / 2, turn = (random() - 0.5) * 0.2;
        s.box([0.62, h - 0.01, 0.46], [0, y, 0], crate).rotation.y = turn;
        for (let k = 0; k < 4; k++) { const slot = s.box([0.08, h * 0.55, 0.465], [-0.21 + k * 0.14, y, 0], s.material('#231a1a')); slot.rotation.y = turn; slot.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn); }
      }
    } else {
      const bark = s.material('#5a4630', { roughness: 1 });
      s.cylinder(R * 0.8, R * 0.95, base, [0, base / 2, 0], bark, 14);
      s.cylinder(R * 0.78, R * 0.78, 0.01, [0, base, 0], s.material('#a98a5c', { roughness: 0.9 }), 14);
      for (let i = 0; i < 4; i++) { const t = random() * 6; s.box([0.03, base * 0.8, 0.04], [Math.cos(t) * R * 0.88, base * 0.45, Math.sin(t) * R * 0.88], s.material('#48382a', { roughness: 1 })).rotation.y = -t; }
    }

    // Cleavers.
    const surface = TOP - dish * 0.6;
    const cleaver = (heavy: boolean) => {
      const g = new THREE.Group();
      const L=(heavy?.25:.22)*(a.bladeProfile==='long'?1.3:a.bladeProfile==='broad'?1.1:1),H=(heavy?.12:.085)*(a.bladeProfile==='long'?.7:a.bladeProfile==='broad'?1.35:1);
      const bladeMaterial = s.material(heavy ? '#8f9698' : '#cfd4d6', { metalness: 0.85, roughness: heavy ? 0.45 : 0.25 });
      const shape = new THREE.Shape([new THREE.Vector2(-L / 2, 0), new THREE.Vector2(L / 2, 0.006), new THREE.Vector2(L / 2, H), new THREE.Vector2(-L / 2 + 0.01, H), new THREE.Vector2(-L / 2 - 0.008, H * 0.5)]);
      if(a.bladeProfile==='rounded'){shape.curves=[];shape.moveTo(-L/2,0);shape.lineTo(L/2,.006);shape.lineTo(L/2,H*.6);shape.quadraticCurveTo(L/2,H,L/2-.06,H);shape.lineTo(-L/2+.01,H);shape.lineTo(-L/2-.008,H*.5);shape.closePath();}
      const hole = new THREE.Path(); hole.absarc(-L / 2 + 0.03, H - 0.025, 0.008, 0, Math.PI * 2, false); shape.holes.push(hole);
      const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: heavy ? 0.007 : 0.003, bevelEnabled: false }), bladeMaterial);
      blade.position.z = -0.003;
      const edge = new THREE.Mesh(new THREE.BoxGeometry(L, 0.012, 0.004), s.material('#eef1f2', { metalness: 0.9, roughness: 0.15 }));
      edge.position.set(0, 0.008, 0);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.13, 10), s.material(pick(['#5a3a22', '#3a2a1c', '#8a5a30']), { roughness: 0.7 }));
      handle.rotation.z = Math.PI / 2; handle.position.set(L / 2 + 0.065, H * 0.72, 0);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 10), steel);
      collar.rotation.z = Math.PI / 2; collar.position.set(L / 2 + 0.008, H * 0.72, 0);
      for (const m of [blade, edge, handle, collar]) { m.castShadow = true; g.add(m); }
      s.root.add(g);
      return { g, L, H };
    };
    const covered = a.job === 'covered';
    const hangAt = (g: THREE.Group, L: number, H: number, side: number) => {
      // By the hole, blade down, against the stand.
      g.rotation.set(0, Math.PI / 2 * side, Math.PI / 2);
      g.position.set(side * (R + 0.06) + (H - 0.025), Math.max(0.18, base - 0.05) + (-L / 2 + 0.03), 0.05);
      s.rod([side * (R * 0.9), Math.max(0.2, base - 0.03), 0.05], [side * (R + 0.075), Math.max(0.2, base - 0.03), 0.05], 0.006, iron);
    };
    if (a.cleaver === 'hung' || covered) { const c = cleaver(true); hangAt(c.g, c.L, c.H, 1); }
    else {
      if (a.cleaver === 'sunk' || a.cleaver === 'pair') {
        const c = cleaver(true);
        c.g.position.set(0.02 + (random() - 0.5) * 0.06, surface - 0.022, -0.04 + (random() - 0.5) * 0.05);
        c.g.rotation.set(mix(0.12, 0.35, random()), 0.5 + (random() - 0.5) * 0.7, 0.32, 'YXZ');
      }
      if (a.cleaver === 'flat' || a.cleaver === 'pair') {
        const c = cleaver(false);
        c.g.rotation.set(Math.PI / 2, 0, (random() - 0.5) * 0.5 - 0.3, 'YXZ');
        c.g.rotation.y = -0.4 + random() * 0.3;
        c.g.position.set(a.cleaver === 'pair' ? 0.06 : 0, surface + 0.01, a.cleaver === 'pair' ? 0.17 : 0.06);
      }
    }

    // The job on the block.
    const blood = s.material('#8e1a1e', { roughness: 0.3 });
    const boneMaterial = s.material('#ece2c8', { roughness: 0.7 });
    const scraps: { at: [number, number, number]; size: number; color: string }[] = [];
    const floorChip = (colours: string[], count: number) => { for (let i = 0; i < count; i++) { const t = random() * 6, r = R + 0.06 + random() * 0.24; scraps.push({ at: [Math.cos(t) * r, 0.008, Math.sin(t) * r * 0.8 + 0.1], size: 0.008 + random() * 0.012, color: pick(colours) }); } };
    if (a.job === 'clean') {
      for (let i = 0; i < 90; i++) { const t = random() * 6, r = Math.sqrt(random()) * R * 0.8; scraps.push({ at: [Math.cos(t) * r, TOP - dish * (1 - r / R) + 0.004, Math.sin(t) * r], size: 0.004 + random() * 0.004, color: '#ffffff' }); }
    } else if (a.job === 'poultry') {
      const skin = s.material('#c98a3a', { roughness: 0.3 }), meat = s.material('#f0e0c0', { roughness: 0.6 });
      for (let i = 0; i < 6; i++) {
        const x = -0.16 + i * 0.045, z = 0.1;
        s.box([0.036, 0.04, 0.11], [x, surface + 0.02, z], meat).rotation.z = 0.25;
        s.box([0.038, 0.012, 0.112], [x - 0.004, surface + 0.044, z], skin).rotation.z = 0.25;
      }
      s.ball([0.09, 0.055, 0.075], [0.13, surface + 0.045, 0.08], skin, 14);
      s.rod([0.2, surface + 0.03, 0.11], [0.26, surface + 0.06, 0.15], 0.012, skin, 0.008);
      floorChip(['#ece2c8', '#c98a3a'], 8);
    } else if (a.job === 'pork') {
      const lean = s.material('#c2504e', { roughness: 0.45 }), fat = s.material('#f3e6d6', { roughness: 0.5 });
      for (let i = 0; i < 7; i++) {
        const t = random() * 6, r = 0.06 + random() * 0.14, x = Math.cos(t) * r, z = Math.abs(Math.sin(t)) * r * 0.9 + 0.02;
        const chunk = s.box([0.06, 0.035, 0.045], [x, surface + 0.02, z], pick([lean, lean, fat]));
        chunk.rotation.y = random() * 3;
        s.rod([x - 0.035, surface + 0.022, z], [x + 0.035, surface + 0.022, z], 0.009, boneMaterial).rotation.y = chunk.rotation.y;
      }
      for (let i = 0; i < 4; i++) s.ball([0.02 + random() * 0.03, 0.003, 0.02 + random() * 0.03], [(random() - 0.5) * 0.3, surface + 0.004, (random() - 0.5) * 0.3], blood, 8);
      floorChip(['#ece2c8', '#ece2c8', '#8e1a1e', '#f3e6d6'], 22);
    } else if (a.job === 'fish') {
      const skin = s.material('#8fa0aa', { roughness: 0.25, metalness: 0.35 }), flesh = s.material('#e9a79a', { roughness: 0.5 });
      for (const side of [-1, 1]) {
        const half = s.ball([0.1, 0.05, 0.075], [side * 0.075, surface + 0.035, 0.09], skin, 14);
        half.rotation.y = side * 0.35;
        s.ball([0.09, 0.012, 0.065], [side * 0.06, surface + 0.05 - 0.03, 0.09 - side * 0.0], flesh, 12).rotation.set(0, side * 0.35, side * 0.5);
        s.ball([0.012, 0.012, 0.012], [side * 0.12, surface + 0.07, 0.115], iron, 8);
      }
      for (let i = 0; i < 70; i++) { const t = random() * 6, r = Math.sqrt(random()) * R * 0.9; scraps.push({ at: [Math.cos(t) * r, TOP - dish * (1 - r / R) + 0.004, Math.sin(t) * r], size: 0.004 + random() * 0.004, color: pick(['#dfe6ea', '#b9c3ca', '#ffffff']) }); }
      floorChip(['#dfe6ea', '#b9c3ca'], 20);
      s.ball([0.05, 0.003, 0.04], [0, surface + 0.004, 0.02], blood, 8);
    } else {
      // A cloth draped over the top, sagging at the rim.
      const cloth = s.material(pick(['#e6e0cc', '#c9d6dc', '#d9b0a8']), { roughness: 0.95, side: THREE.DoubleSide });
      const drape = new THREE.LatheGeometry([[0.001, 0.012], [R * 0.9, 0.014], [R * 1.04, 0], [R * 1.06, -0.035], [R * 1.07, -0.075]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
      const position = drape.getAttribute('position');
      for (let i = 0; i < position.count; i++) if (position.getY(i) < -0.005) { const t = Math.atan2(position.getZ(i), position.getX(i)); const k = 1 + 0.06 * Math.sin(t * 7) * (-position.getY(i) / 0.075); position.setX(i, position.getX(i) * k); position.setZ(i, position.getZ(i) * k); position.setY(i, position.getY(i) * (1 + 0.6 * Math.sin(t * 2 + 1))); }
      drape.computeVertexNormals();
      s.mesh(drape, cloth, [0, TOP, 0]);
    }
    if (scraps.length) s.scatter(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), scraps);
    // Drips down the side when busy.
    if (bloody) for (let i = 0; i < 4; i++) { const t = 0.3 + random() * 2.4; s.rod([Math.cos(t) * R * 1.02, TOP - 0.01, Math.sin(t) * R * 1.02], [Math.cos(t) * R * 1.03, TOP - 0.05 - random() * Math.min(thick * 0.6, 0.14), Math.sin(t) * R * 1.03], 0.006, blood, 0.003); }

    // A rag and a sharpening steel on the stand.
    const ragT = 2.6;
    const rag = s.box([0.12, 0.2, 0.012], [Math.cos(ragT) * (R + 0.03), Math.max(0.14, base - 0.12), Math.sin(ragT) * (R + 0.03)], s.material(pick(['#d9d2bc', '#b9c9d0', '#c9a8a0']), { roughness: 1 }));
    rag.rotation.y = -ragT + Math.PI / 2;
    if (a.cleaver !== 'hung' && !covered && base > 0.3) {
      s.rod([-(R + 0.06), base - 0.03, 0.08], [-(R + 0.07), base - 0.3, 0.08], 0.006, steel, 0.003);
      s.cylinder(0.014, 0.012, 0.09, [-(R + 0.06), base + 0.01, 0.08], s.material('#2a2c2e'), 8);
    }

    // The bone bucket.
    if (a.bucket !== 'none') {
      const under = base > 0.42 && a.stand === 'tripod';
      const bx = under ? 0.02 : R + 0.26, bz = under ? 0.02 : 0.2;
      let rim = 0.26, br = 0.15;
      if (a.bucket === 'tin') {
        const tinTexture = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d')!; ctx.fillStyle = '#e0b020'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#c21f1f'; ctx.fillRect(0, 40, 128, 50); ctx.fillStyle = '#f6efd4'; ctx.font = '900 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OIL', 64, 76); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
        s.box([0.24, 0.3, 0.24], [bx, 0.15, bz], new THREE.MeshStandardMaterial({ map: tinTexture, metalness: 0.4, roughness: 0.5 })).rotation.y = 0.3;
        s.box([0.21, 0.01, 0.21], [bx, 0.27, bz], s.material('#3a2a20')).rotation.y = 0.3;
        rim = 0.28; br = 0.09;
      } else {
        const body = a.bucket === 'red' ? s.material('#d6322c', { roughness: 0.45, side: THREE.DoubleSide }) : s.material('#c5cbcd', { metalness: 0.75, roughness: 0.35, side: THREE.DoubleSide });
        s.lathe([[0, 0.01], [0.11, 0.01], [0.15, 0.26], [0.16, 0.265], [0.15, 0.25], [0.115, 0], [0, 0]], body, [bx, 0, bz]);
        s.ring(0.155, 0.006, [bx, 0.27, bz], iron, Math.PI).rotation.set(0.5, 0, 0);
        if (a.bucket === 'empty') { const water = s.cylinder(0.12, 0.12, 0.004, [bx, 0.03, bz], s.material('#7d959c', { roughness: 0.1, metalness: 0.4 }), 16); water.castShadow = false; }
      }
      if (a.bucket !== 'empty') {
        s.cylinder(br * 0.95, br * 0.95, 0.01, [bx, rim - 0.04, bz], s.material('#7a3a34', { roughness: 0.6 }), 14);
        for (let i = 0; i < 9; i++) {
          const t = random() * 6, r = random() * br * 0.7, lean = 0.4 + random() * 0.8, length = 0.1 + random() * 0.12;
          const from: [number, number, number] = [bx + Math.cos(t) * r, rim - 0.06, bz + Math.sin(t) * r];
          const to: [number, number, number] = [from[0] + Math.cos(t) * length * Math.sin(lean) * 0.6, from[1] + length * Math.cos(lean * 0.6), from[2] + Math.sin(t) * length * Math.sin(lean) * 0.6];
          s.rod(from, to, 0.011, boneMaterial);
          s.ball([0.02, 0.016, 0.02], to, boneMaterial, 8);
        }
      }
    }

    const timber=s.material('#a48254'),dark=s.material('#454641'),rope=s.material('#bca776');
    if(a.binding!=='none')for(const fraction of a.binding==='rope'?[.25,.5,.75]:[.22,.75]) {
      const y=base+thick*fraction;
      if(a.binding==='rope')s.ring(R*1.06,.012,[0,y,0],rope).rotation.x=Math.PI/2;
      else {const mat=a.binding==='copper'?s.material('#a5734f',{metalness:.6,roughness:.4}):iron;s.mesh(new THREE.CylinderGeometry(R*1.065,R*1.065,a.binding==='copper'?.045:.025,40,1,true),mat,[0,y,0]);if(a.binding==='copper')for(let i=0;i<8;i++){const t=i*Math.PI/4;s.ball([.006,.006,.006],[Math.sin(t)*R*1.07,y,Math.cos(t)*R*1.07],steel,8);}}
    }
    if(a.scraper!=='none') {
      const x=-R-.08,y=base+.05,z=-.1;
      s.rod([-R,base+.08,z],[x,base+.08,z],.008,iron);
      if(a.scraper==='brush'){s.box([.1,.045,.07],[x,y,z],timber);for(let i=0;i<7;i++)s.rod([x+(i-3)*.012,y-.02,z],[x+(i-3)*.012,y-.08,z],.004,rope);}
      else {s.box([.13,.025,.025],[x,y+.015,z],timber);if(a.scraper==='broad')s.box([.14,.085,.006],[x,y-.04,z],steel);else s.mesh(new THREE.CircleGeometry(.07,20,0,Math.PI),steel,[x,y,z]).rotation.z=Math.PI;}
    }
    if(a.saltDish!=='none'||a.rinseBottle!=='none') {
      const x=-R-.24,z=.2,y=Math.max(.25,base*.7);
      s.box([.38,.025,.25],[x,y,z],timber);s.rod([-R,base-.02,z],[x-.15,y-.012,z],.012,iron);
      if(a.saltDish==='enamel'){s.lathe([[0,0],[.045,0],[.055,.075]],s.material('#e7e1cf'),[x-.08,y+.0125,z]);s.cylinder(.048,.048,.01,[x-.08,y+.074,z],s.material('#eee8d8'),14);}
      else if(a.saltDish==='tin'){s.box([.1,.07,.1],[x-.08,y+.0475,z],steel);s.box([.11,.015,.11],[x-.08,y+.09,z],steel);}
      else if(a.saltDish==='bowl'){s.lathe([[0,0],[.035,0],[.065,.05]],s.material('#694838'),[x-.08,y+.0125,z]);s.rod([x-.12,y+.065,z],[x+.01,y+.065,z],.006,timber);}
      if(a.rinseBottle!=='none') {
        const bx=x+.09,mat=s.material(a.rinseBottle==='glass'?'#56886a':a.rinseBottle==='jug'?'#4d8cac':'#e7e3d6');
        s.cylinder(.04,.045,.13,[bx,y+.0775,z],mat,16);s.cylinder(.018,.035,.045,[bx,y+.165,z],mat,12);
        if(a.rinseBottle==='squeeze')s.cylinder(.003,.012,.04,[bx,y+.2075,z],s.material('#b34438'),10);
        else if(a.rinseBottle==='glass')s.cylinder(.018,.018,.02,[bx,y+.1975,z],timber,10);
        else {s.ring(.032,.008,[bx+.04,y+.13,z],mat);s.box([.07,.02,.03],[bx+.015,y+.2,z],mat);}
      }
    }
    if(a.sideShelf!=='none') {
      const z=-R-.18,y=base+thick*.35;
      if(a.sideShelf==='slatted')for(let i=0;i<5;i++)s.box([.055,.025,.3],[-.12+i*.06,y,z],timber);
      else s.box([.35,.025,.3],[0,y,z],a.sideShelf==='steel'?steel:timber);
      for(const x of[-.12,.12])s.rod([x,base-.02,-R*.7],[x,y-.012,z-.12],.012,iron);
      if(a.sideShelf==='steel')for(const x of[-.17,.17])s.box([.01,.04,.3],[x,y+.0325,z],steel);
    }
    if(a.footrest==='bar'){s.rod([-.3,.14,.3],[.3,.14,.3],.02,iron);for(const x of[-.3,.3])s.rod([x,.14,.3],[x*.8,base*.45,.12],.012,iron);}
    else if(a.footrest==='step'){s.box([.55,.035,.2],[0,.145,.36],timber);for(const x of[-.22,.22])s.box([.045,.1275,.16],[x,.06375,.36],timber);}
    else if(a.footrest==='hoop'){s.ring(.37,.018,[0,.14,0],iron).rotation.x=Math.PI/2;for(let i=0;i<3;i++){const t=i*Math.PI*2/3;s.rod([Math.sin(t)*.37,.14,Math.cos(t)*.37],[Math.sin(t)*.2,base*.5,Math.cos(t)*.2],.012,iron);}}
    if(a.workMat!=='bare') {
      const mat=a.workMat==='boards'?timber:a.workMat==='rubber'?dark:s.material('#d9d2bb');
      s.box([1.65,.04,1.25],[0,-.027,.08],mat);
      if(a.workMat==='rubber')for(let i=0;i<16;i++)s.box([.008,.006,1.12],[-.75+i*.1,-.003,.08],iron);
      else if(a.workMat==='boards')for(let i=0;i<8;i++)s.box([.19,.006,1.23],[-.7+i*.2,-.003,.08],timber);
      else for(let i=0;i<6;i++)for(let j=0;j<5;j++)s.box([.268,.006,.243],[-.6875+i*.275,-.003,-.42+j*.25],s.material((i+j)%4?'#ece4cd':'#b6c1b0'));
    }

    return s.finish({ footprint: 0.55 });
  },
});
