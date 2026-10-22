import * as THREE from 'three';
import { type Placeable, type World, choice, defineWorld, disposeTree, mix } from '@conjure/kit';
import { type Bit, type V3, clods, headstone, lettered, limb, many, mottled, mound, paint, put, shade, turfSlabs } from './grave';

// Standing places: x, z, tallest and widest a thing may be there. Hero first.
const SLOTS: readonly (readonly [number, number, number, number])[] = [
  [0, 2.4, 3.4, 1.35], [-3.4, -0.4, 3.6, 1.3], [3.5, -1.0, 3.8, 1.3], [-1.2, -4.4, 4.2, 1.5], [4.4, -4.2, 4.2, 1.4], [-6.2, -5.0, 4.6, 1.6],
];
const GATE_X = -4.6, BACK = -9.6, SIDE = 10.6;

export default defineWorld({
  questions: {
    tradition: choice('Whose graveyard is it?', {
      new_england: 'New England: thin dark slate stones with winged skulls, an iron fence and a timber lychgate, a white steeple beyond.',
      irish: 'Irish: tall grey Celtic crosses furred with lichen inside a dry-stone wall, a round tower on the skyline.',
      mexican: 'Mexican: brightly painted box tombs and white crosses inside an adobe wall with an arched gateway and a mission bell.',
      chinese: 'Chinese: horseshoe-shaped hillside graves with red-lettered tablets climbing a slope, a painted gate and bamboo.',
    }),
    moon: choice('What is the moon doing?', {
      full: 'A huge pale full moon sitting low on the hills.',
      harvest: 'A swollen orange harvest moon.',
      crescent: 'A thin bright crescent among the first stars.',
      clouded: 'A full moon cut into bars by long clouds.',
    }),
    fog: choice('How much ground fog is there?', {
      none: 'None: clear cold air.',
      wisps: 'A few low wisps between the stones.',
      blanket: 'A knee-deep blanket the stones stand up out of.',
      thick: 'Thick rolling banks that swallow the far graves.',
    }),
    disturbed: choice('How many graves have been disturbed?', {
      one: 'Only the one in front: the rest lie quiet, for now.',
      few: 'A few: fresh mounds here and there, a stone knocked flat.',
      half: 'About half: the ground is heaving all over.',
      all: 'Every single one: hands coming up everywhere.',
    }),
    left: choice('Did anyone leave anything on the graves today?', {
      nothing: 'Nothing: nobody has visited in years.',
      flowers: 'Fresh flowers on several graves.',
      lanterns: 'Small grave lanterns and candles, still burning.',
      both: 'Flowers and burning lanterns everywhere: it was a feast day.',
    }),
    tree: choice('What is in the bare tree?', {
      nothing: 'Nothing but branches.',
      crows: 'A row of crows.',
      owl: 'One owl with lit yellow eyes.',
      lanterns: 'Paper lanterns hung from the branches, glowing.',
    }),
    vantage: choice('Where are we standing?', {
      among: 'Among the stones at head height, a few steps back.',
      wall: 'Up on the boundary wall, looking down over the plots.',
      low: 'Crouched low in the grass, the stones looming.',
    }),
  },

  build(a, context) {
    const { mood, random } = context;
    const root = new THREE.Group();
    const wear = mood.wear;
    const hex = (c: THREE.Color) => `#${c.getHexString()}`;
    const ball = (w = 10, h = 8) => new THREE.SphereGeometry(1, w, h);
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const hill = a.tradition === 'chinese';
    const k = [random() * 6, random() * 6, random() * 6];
    const groundAt = (x: number, z: number) =>
      0.07 * Math.sin(x * 0.9 + k[0]) * Math.sin(z * 0.8 + k[1]) + 0.04 * Math.sin(x * 2.1 + z * 1.7 + k[2]) + (hill ? 0.24 : 0.04) * Math.min(12, Math.max(0, -(z + 1.5)));

    // Sky: a painted violet dusk, kept mid-tone so the scene prints.
    const warmTint = mood.warmth > 0.5 ? '#f2a36a' : '#7fa0e0';
    const skies = ['#55529a', '#8a7cc2', '#d8a0bc', '#f6cfae'].map((c, i) => shade(shade(c, warmTint, Math.abs(mood.warmth - 0.5) * 0.3), i < 2 ? '#3f3d6e' : '#b9a0b0', (1 - mood.cheer) * 0.25));
    const moonTone = a.moon === 'harvest' ? '#ffb469' : '#fff6da';
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 512;
    {
      const ctx = canvas.getContext('2d')!, w = 1024, h = 512;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, hex(skies[0])); g.addColorStop(0.45, hex(skies[1])); g.addColorStop(0.7, hex(skies[2])); g.addColorStop(0.8, hex(skies[3])); g.addColorStop(1, hex(skies[3]));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < (a.moon === 'crescent' ? 200 : 70); i++) { ctx.fillStyle = `rgba(255,255,240,${0.35 + random() * 0.6})`; ctx.fillRect(random() * w, random() * random() * h * 0.6, 1.7, 1.7); }
      const mx = w * (0.4 + random() * 0.03), my = h * 0.468, mr = a.moon === 'crescent' ? 22 : a.moon === 'harvest' ? 36 : 30;
      const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 4);
      glow.addColorStop(0, a.moon === 'harvest' ? 'rgba(255,190,120,0.55)' : 'rgba(255,246,225,0.5)'); glow.addColorStop(1, 'rgba(255,240,220,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = moonTone; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
      if (a.moon === 'crescent') { ctx.fillStyle = hex(skies[1]); ctx.beginPath(); ctx.arc(mx + 10, my - 6, mr * 0.92, 0, 7); ctx.fill(); }
      else for (let i = 0; i < 7; i++) { ctx.fillStyle = a.moon === 'harvest' ? 'rgba(200,110,60,0.25)' : 'rgba(170,170,200,0.28)'; ctx.beginPath(); ctx.arc(mx + (random() - 0.5) * mr * 1.2, my + (random() - 0.5) * mr * 1.2, mr * (0.08 + random() * 0.16), 0, 7); ctx.fill(); }
      const bars = a.moon === 'clouded' ? 16 : 7;
      for (let i = 0; i < bars; i++) {
        const near = a.moon === 'clouded' && i < 5;
        ctx.fillStyle = near ? hex(shade(skies[0], skies[1], 0.5)) : `rgba(${i % 2 ? '70,60,120' : '250,220,225'},${0.14 + random() * 0.16})`;
        ctx.beginPath(); ctx.ellipse(near ? mx + (random() - 0.5) * 120 : random() * w, near ? my + (i - 2) * mr * 0.42 : h * (0.25 + random() * 0.45), w * (0.07 + random() * 0.13), near ? 5 + random() * 5 : 3 + random() * 6, 0, 0, 7); ctx.fill();
      }
    }
    const skyTexture = new THREE.CanvasTexture(canvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(330, 165), new THREE.MeshBasicMaterial({ map: skyTexture, fog: false }));
    backdrop.position.set(0, 14, -125);
    backdrop.renderOrder = -1;
    root.add(backdrop);

    // Far silhouettes: hills, a treeline and one landmark.
    const ridge = (z: number, base: number, rise: number, step: number, colour: THREE.Color) => {
      const s = new THREE.Shape();
      s.moveTo(-110, -6); s.lineTo(-110, base);
      for (let x = -110; x < 110; x += step) { const y = base + random() * rise; s.quadraticCurveTo(x + step / 2, y + rise * 0.5, x + step, base + random() * rise * 0.4); }
      s.lineTo(110, -6); s.closePath();
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: colour }));
      mesh.position.set(0, hill ? 2.6 : 0.3, z);
      root.add(mesh);
      return mesh;
    };
    ridge(-80, 3, 4, 26, shade(skies[1], skies[2], 0.35));
    const treeTone = shade(shade(skies[0], '#2a2a48', 0.3), skies[1], 0.3);
    ridge(-42, 2.2, 2.2, 2.6, treeTone);
    {
      const s = new THREE.Shape();
      if (a.tradition === 'new_england') { s.moveTo(-5, 0); s.lineTo(-5, 6); s.lineTo(-1.5, 9); s.lineTo(-1.5, 12); s.lineTo(-0.3, 12); s.lineTo(0.9, 19); s.lineTo(2.1, 12); s.lineTo(3.3, 12); s.lineTo(3.3, 6); s.lineTo(3.3, 0); }
      else if (a.tradition === 'irish') { s.moveTo(-1.6, 0); s.lineTo(-1.3, 15); s.lineTo(0, 18.5); s.lineTo(1.3, 15); s.lineTo(1.6, 0); s.lineTo(5, 0); s.lineTo(5, 5); s.lineTo(7.5, 9); s.lineTo(8.2, 6); s.lineTo(10, 4.5); s.lineTo(10, 0); }
      else if (a.tradition === 'mexican') { s.moveTo(-6, 0); s.lineTo(-6, 7); s.lineTo(-4, 7); s.absarc(-1, 7, 3, Math.PI, 0, true); s.lineTo(2, 7); s.lineTo(4, 7); s.lineTo(4, 11); s.absarc(5.5, 11, 1.5, Math.PI, 0, true); s.lineTo(7, 0); }
      else for (let i = 0; i < 5; i++) { const w = 4.4 - i * 0.7, y = i * 3; if (i === 0) s.moveTo(-w * 0.6, 0); s.lineTo(-w * 0.6, y + 2.2); s.lineTo(-w - 0.6, y + 2.5); s.lineTo(-w * 0.5, y + 3); if (i === 4) { s.lineTo(0, y + 6); s.lineTo(w * 0.5, y + 3); } }
      if (a.tradition === 'chinese') for (let i = 4; i >= 0; i--) { const w = 4.4 - i * 0.7, y = i * 3; s.lineTo(w * 0.5, y + 3); s.lineTo(w + 0.6, y + 2.5); s.lineTo(w * 0.6, y + 2.2); s.lineTo(w * 0.6, y); }
      s.closePath();
      const mark = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: a.tradition === 'new_england' ? shade(treeTone, '#ffffff', 0.5) : shade(treeTone, skies[1], 0.2) }));
      mark.position.set(2 + random() * 7, hill ? 4.6 : 2.2, -41.5);
      mark.scale.setScalar(0.62);
      root.add(mark);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshBasicMaterial({ color: '#ffd98a' }));
      win.position.set(mark.position.x + (a.tradition === 'irish' ? 0 : 0.56), mark.position.y + (a.tradition === 'irish' ? 7.4 : 5), -41.3);
      win.scale.setScalar(0.62);
      root.add(win);
    }

    // Ground.
    const grassTone = shade(shade(mood.cheer > 0.5 ? '#6f9463' : '#62806a', '#7a7650', wear * 0.35), skies[1], 0.22);
    const groundGeo = new THREE.PlaneGeometry(120, 90, 120, 90);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, 0, -20);
    {
      const pos = groundGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, groundAt(pos.getX(i), pos.getZ(i)));
      groundGeo.computeVertexNormals();
    }
    const groundMap = mottled(random, grassTone, [{ color: '#3f5a44', count: 90, size: 0.05, alpha: 0.3 }, { color: '#a8b080', count: 50, size: 0.03, alpha: 0.25 }, { color: '#4a4a66', count: 30, size: 0.08, alpha: 0.18 }], 256);
    groundMap.repeat.set(10, 8);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: groundMap, roughness: 1 }));
    ground.receiveShadow = true;
    root.add(ground);

    // Camera first: placement keeps the view of the slots clear.
    const view = { among: [2.6, 2.3, 12.8, 40, 1.35], wall: [4.5, 5.0, 14.2, 37, 1.8], low: [1.4, 0.85, 10.8, 47, 1.8] }[a.vantage];
    const camera = new THREE.PerspectiveCamera(view[3], 1, 0.2, 400);
    camera.position.set(view[0] + (random() - 0.5) * 0.6, view[1] + groundAt(view[0], view[2]), view[2]);
    const aim = new THREE.Vector3(0.1, view[4] + (hill ? 0.5 : 0), -1.6);

    // The worn path from the gate to the grave in front.
    const pathPoints = [[GATE_X, BACK + 1], [-3.2, -6.2], [-1.9, -1.6], [-1.3, 1.2], [0, 2.4], [1.4, 5], [camera.position.x * 0.7, 10]].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
    const pathSamples = pathCurve.getPoints(60);
    {
      const positions: number[] = [], index: number[] = [];
      pathSamples.forEach((p, i) => {
        const t = pathCurve.getTangent(i / 60), nx = -t.z, nz = t.x, w = 0.42 + Math.sin(i * 0.7) * 0.08;
        for (const s of [-1, 1]) positions.push(p.x + nx * w * s, groundAt(p.x + nx * w * s, p.z + nz * w * s) + 0.025, p.z + nz * w * s);
        if (i < 60) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      const path = new THREE.Mesh(g, paint(shade('#9a8a78', skies[1], 0.25), { roughness: 1, side: THREE.DoubleSide }));
      path.receiveShadow = true;
      root.add(path);
    }
    const nearPath = (x: number, z: number, d: number) => pathSamples.some((p) => Math.hypot(p.x - x, p.z - z) < d);

    // Shared instanced bits.
    const blooms: Bit[] = [], stems: Bit[] = [], glows: Bit[] = [], frames: Bit[] = [];
    const petals = a.tradition === 'mexican' ? ['#f59a1a', '#f7b52a', '#e8641a', '#d83a7a'] : mood.cheer > 0.5 ? ['#f2c230', '#e8508a', '#f4f0e4', '#c9a0e8'] : ['#f1ece0', '#b9a8d8', '#a83a4a', '#e8e0c8'];
    const bouquet = (at: V3, spreadOut = 0.16) => {
      for (let i = 0; i < 7; i++) {
        const x = at[0] + (random() - 0.5) * spreadOut * 2, z = at[2] + (random() - 0.5) * spreadOut, y = at[1] + 0.12 + random() * 0.14;
        stems.push({ p: [x, (at[1] + y) / 2, z], s: [0.008, y - at[1], 0.008], c: '#3f6a34' });
        blooms.push({ p: [x, y, z], s: [0.055, 0.04, 0.055], c: pick(petals) });
      }
    };
    const lantern = (at: V3, size = 1) => {
      frames.push({ p: [at[0], at[1] + 0.02 * size, at[2]], s: [0.13 * size, 0.04 * size, 0.13 * size] }, { p: [at[0], at[1] + 0.27 * size, at[2]], s: [0.14 * size, 0.045 * size, 0.14 * size] }, { p: [at[0], at[1] + 0.31 * size, at[2]], s: [0.07 * size, 0.05 * size, 0.07 * size] });
      glows.push({ p: [at[0], at[1] + 0.145 * size, at[2]], s: [0.1 * size, 0.21 * size, 0.1 * size], c: a.tradition === 'chinese' ? '#ff5a3a' : random() < 0.3 ? '#ff7a5a' : '#ffd27a' });
    };

    // Stone faces.
    const stoneBase = { new_england: '#5e6672', irish: '#9a9c98', mexican: '#efe9dc', chinese: '#a8a69c' }[a.tradition];
    const stoneTone = shade(shade(stoneBase, skies[1], 0.12), '#5f6650', wear * 0.35);
    const lichen = (tone: THREE.ColorRepresentation) => mottled(random, tone, [{ color: '#4a5a34', count: Math.round(4 + wear * 50), size: 0.04, alpha: 0.35 }, { color: '#c9b458', count: Math.round(wear * 24), size: 0.025, alpha: 0.45 }, { color: '#2e2e2c', count: 24, size: 0.012, alpha: 0.35 }]);
    const stoneMat = paint('#ffffff', { roughness: 1, map: lichen(stoneTone) });
    const ink = hex(shade(stoneTone, a.tradition === 'new_england' ? '#e8e6da' : '#000000', 0.62));
    const slate = (lines: readonly string[]) => {
      const texture = lettered(['', '', ...lines], { paper: hex(stoneTone), ink, grime: wear, random });
      const ctx = (texture.image as HTMLCanvasElement).getContext('2d')!;
      ctx.strokeStyle = ctx.fillStyle = ink; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(128, 62, 24, 0, 7); ctx.stroke();
      ctx.fillRect(117, 54, 7, 9); ctx.fillRect(132, 54, 7, 9); ctx.fillRect(120, 72, 16, 4);
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(128 + s * (56 + i * 6), 58 + i * 10, 34 - i * 5, 9, s * -0.25, 0, 7); ctx.stroke(); }
      return texture;
    };
    const tablet = () => {
      const c = document.createElement('canvas');
      c.width = 96; c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = hex(stoneTone); ctx.fillRect(0, 0, 96, 256);
      ctx.strokeStyle = wear > 0.7 ? '#7a3a30' : '#c0281e'; ctx.lineWidth = 5; ctx.lineCap = 'square';
      for (let g = 0; g < 4; g++) {
        const ox = 24, oy = 14 + g * 60, n = 4 + Math.floor(random() * 3);
        ctx.strokeRect(ox + (random() < 0.5 ? 0 : 10), oy + (random() < 0.5 ? 0 : 12), 48 - (random() < 0.5 ? 0 : 20), 46 - (random() < 0.5 ? 0 : 22));
        for (let i = 0; i < n; i++) { const x = ox + random() * 48, y = oy + random() * 46; ctx.beginPath(); ctx.moveTo(x, y); if (random() < 0.55) ctx.lineTo(ox + random() * 48, y); else ctx.lineTo(x + (random() - 0.5) * 14, oy + random() * 46); ctx.stroke(); }
      }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const faces = a.tradition === 'new_england' ? [slate(['HERE LYES', 'Ye BODY OF', 'MERCY']), slate(['IN MEMORY', 'OF CAPT.', 'E. PRATT']), slate(['MEMENTO', 'MORI', '1741'])]
      : a.tradition === 'irish' ? [lettered(['ERECTED BY', 'HIS WIFE', 'R.I.P.'], { paper: hex(stoneTone), ink, grime: wear, random }), lettered(['PRAY FOR', 'THE SOUL', 'OF'], { paper: hex(stoneTone), ink, grime: wear, random })]
      : a.tradition === 'mexican' ? [lettered(['Q.E.P.D.'], { paper: '#f4efe2', ink: '#3a3a4a', random, grime: wear * 0.5 }), lettered(['FAMILIA', 'REYES'], { paper: '#f4efe2', ink: '#3a3a4a', random, grime: wear * 0.5 })]
      : [tablet(), tablet(), tablet()];

    // Graves.
    const soilBase = shade(shade('#5a4030', mood.warmth > 0.5 ? '#7a4a2c' : '#3f3a48', Math.abs(mood.warmth - 0.5) * 0.7), skies[0], 0.15);
    const soils = [hex(soilBase), hex(shade(soilBase, '#1c1512', 0.4)), hex(shade(soilBase, '#a08060', 0.3))];
    const soil = paint(soilBase, { roughness: 1 });
    const flesh = paint(shade('#9fb588', '#b8c4cc', 0.3 + random() * 0.3), { roughness: 0.8 });
    const tombPaints = ['#3fb8b0', '#f08a9a', '#f2c84a', '#f4efe2', '#4a6ad0', '#8ad070', '#e86a3a'].map((c) => shade(c, '#b0a890', wear * 0.45));
    const spots: [number, number][] = [];
    for (const z of [-7.6, -5.3, -3.0, -0.7, 1.7, 4.3]) for (let x = -9; x <= 9.01; x += 2.25) spots.push([x + (random() - 0.5) * 0.9, z + (random() - 0.5) * 0.7]);
    const clear = spots.filter(([x, z]) =>
      SLOTS.every(([sx, sz, , r]) => Math.hypot(sx - x, sz - z) > r + 1.0) && !nearPath(x, z, 1.15) && Math.hypot(x - 5.6, z + 7.9) > 1.6 && Math.hypot(x - GATE_X, z - BACK) > 2.6
      // Nothing between the camera and the grave in front.
      && !(z > 2.4 && Math.abs(x - mix(0, camera.position.x, (z - 2.4) / (camera.position.z - 2.4))) < 2.6));
    for (let i = clear.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [clear[i], clear[j]] = [clear[j], clear[i]]; }
    const graves = clear.slice(0, Math.round(mix(9, 26, mood.density)));
    const share = { one: 0, few: 0.22, half: 0.5, all: 1 }[a.disturbed];
    const offerFlowers = a.left === 'flowers' || a.left === 'both', offerLight = a.left === 'lanterns' || a.left === 'both';
    const offerShare = a.left === 'both' ? 0.75 : 0.45;
    const arms: THREE.Group[] = [];
    const clodSpots: V3[] = [];
    graves.forEach(([x, z], index) => {
      const g = new THREE.Group();
      const y = groundAt(x, z);
      g.position.set(x, y, z);
      g.rotation.y = (random() - 0.5) * 0.3;
      root.add(g);
      const risen = a.disturbed === 'few' ? index % 5 === 1 || random() < share * 0.4 : random() < share;
      const lean: V3 = [(random() - 0.6) * wear * 0.35 - (risen ? 0.25 + random() * 0.5 : 0), 0, (random() - 0.5) * (0.06 + wear * 0.4)];
      const world = (lx: number, ly: number, lz: number): V3 => { g.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3(lx, ly, lz)).toArray() as [number, number, number]; };
      let front = 0.5;
      if (a.tradition === 'new_england') {
        const h = 0.7 + random() * 0.55;
        const stone = headstone(g, random() < 0.7 ? 'shoulder' : 'round', 0.5 + random() * 0.22, h, 0.07, stoneMat, pick(faces));
        stone.position.y = -0.1; stone.rotation.set(...lean);
        if (random() < 0.4) { const foot = headstone(g, 'round', 0.3, 0.35, 0.06, stoneMat, null); foot.position.set(0, -0.05, 1.7); foot.rotation.set(lean[0] * 0.5, 0, -lean[2]); }
      } else if (a.tradition === 'irish') {
        if (random() < 0.62) {
          const h = 1.5 + random() * 1.0, w = h * 0.42;
          const cross = new THREE.Group();
          cross.rotation.set(lean[0] * 0.5, 0, lean[2] * 0.5);
          g.add(cross);
          put(cross, new THREE.BoxGeometry(w * 0.95, 0.28, 0.5), stoneMat, [0, 0.12, 0]);
          put(cross, new THREE.BoxGeometry(w * 0.7, 0.2, 0.38), stoneMat, [0, 0.35, 0]);
          const c = headstone(cross, 'cross', w, h, 0.14, stoneMat, null);
          c.position.y = 0.42;
          put(cross, new THREE.TorusGeometry(w * 0.34, w * 0.07, 6, 22), stoneMat, [0, 0.42 + h * 0.62, 0]);
        } else { const stone = headstone(g, random() < 0.5 ? 'round' : 'gothic', 0.6 + random() * 0.2, 0.9 + random() * 0.5, 0.11, stoneMat, pick(faces)); stone.position.y = -0.08; stone.rotation.set(...lean); }
      } else if (a.tradition === 'mexican') {
        const colour = pick(tombPaints), trim = pick(tombPaints);
        const body = paint(colour, { roughness: 0.9, map: lichen('#ffffff') });
        const tomb = new THREE.Group();
        tomb.rotation.set(risen ? 0 : lean[0] * 0.15, 0, lean[2] * 0.15);
        g.add(tomb);
        const tall = 0.45 + random() * 0.3;
        put(tomb, new THREE.BoxGeometry(1.0, tall, 2.0), body, [0, tall / 2, 1.05]);
        const lid = put(tomb, new THREE.BoxGeometry(1.1, 0.09, 2.1), paint(trim), [0, tall + 0.045, 1.05]);
        if (risen) { lid.position.x += 0.45; lid.rotation.set(0, 0.3, -0.35); lid.position.y -= 0.1; }
        put(tomb, new THREE.BoxGeometry(1.15, tall + 0.75, 0.28), body, [0, (tall + 0.75) / 2, -0.05]);
        put(tomb, new THREE.BoxGeometry(1.25, 0.09, 0.36), paint(trim), [0, tall + 0.79, -0.05]);
        const plate = put(tomb, new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ map: pick(faces), roughness: 0.9 }), [0, tall + 0.4, 0.095]);
        plate.castShadow = false;
        const cross = headstone(tomb, 'cross', 0.42, 0.7, 0.08, paint('#f4efe2'), null);
        cross.position.set(0, tall + 0.83, -0.05); cross.rotation.z = lean[2];
        front = 2.3;
        if (offerFlowers && random() < offerShare) for (let i = 0; i < 12; i++) blooms.push({ p: world((i / 11 - 0.5) * 1.05, tall + 0.72 - Math.sin(i / 11 * Math.PI) * 0.22, 0.11), s: 0.05, c: pick(petals) });
      } else {
        const r = 0.85 + random() * 0.35;
        mound(g, random, r * 1.05, 0.85 + random() * 0.35, r * 1.05, paint(shade(grassTone, '#4a6a44', 0.3), { roughness: 1 }), [0, -0.05, -r * 0.5], 0.12);
        const wall: Bit[] = [];
        for (let i = 0; i <= 16; i++) { const t = Math.PI * (1.1 - 1.2 * (i / 16)) + Math.PI / 2 - Math.PI * 0.5; const ang = Math.PI * (-0.1 + 1.2 * (i / 16)); const hgt = 0.4 + Math.sin(i / 16 * Math.PI) * 0.5; wall.push({ p: [Math.cos(ang) * r, hgt / 2, -Math.sin(ang) * r + r * 0.25], r: [0, ang + Math.PI / 2 + t * 0, 0], s: [0.34, hgt, 0.24] }); }
        many(g, new THREE.BoxGeometry(1, 1, 1), stoneMat, wall);
        const stone = headstone(g, 'round', 0.5, 1.1, 0.14, stoneMat, null);
        stone.position.set(0, 0, -r * 0.45); stone.rotation.set(lean[0] * 0.6, 0, lean[2] * 0.5);
        const plate = put(stone, new THREE.PlaneGeometry(0.28, 0.75), new THREE.MeshStandardMaterial({ map: pick(faces), roughness: 0.9 }), [0, 0.5, 0.092]);
        plate.castShadow = false;
        put(g, new THREE.BoxGeometry(0.7, 0.12, 0.4), stoneMat, [0, 0.06, 0.05]);
        front = 0.45;
        if (offerFlowers && random() < offerShare) for (let i = 0; i < 3; i++) blooms.push({ p: world(-0.2 + i * 0.1 + (i === 2 ? -0.15 : 0), i === 2 ? 0.25 : 0.17, 0.05), s: 0.055, c: '#f59a1a' });
      }
      if (offerFlowers && a.tradition !== 'chinese' && random() < offerShare) bouquet(world((random() - 0.5) * 0.4, a.tradition === 'mexican' ? 0.02 : 0, front * (a.tradition === 'mexican' ? 1 : 0.6)));
      if (offerLight && random() < offerShare) lantern(world((random() < 0.5 ? -1 : 1) * (0.3 + random() * 0.15), a.tradition === 'chinese' ? 0.12 : 0, a.tradition === 'mexican' ? front : a.tradition === 'chinese' ? 0.05 : 0.3), a.tradition === 'mexican' ? 1.3 : 1);
      if (risen) {
        const mz = a.tradition === 'mexican' ? 2.5 : a.tradition === 'chinese' ? 0.9 : 0.95;
        mound(g, random, 0.5 + random() * 0.2, 0.16 + random() * 0.12, 0.6 + random() * 0.25, soil, [(random() - 0.5) * 0.2, 0, mz], 0.3);
        clodSpots.push(world(0, 0.02, mz));
        if (arms.length < 9 && random() < 0.75) {
          const arm = new THREE.Group();
          const ax = a.tradition === 'mexican' && random() < 0.6 ? [-0.2, 0.5, 1.0] : [(random() - 0.5) * 0.3, 0.1, mz];
          arm.position.set(ax[0], ax[1], ax[2]);
          arm.rotation.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
          g.add(arm);
          const len = 0.3 + random() * 0.35;
          limb(arm, [0, -0.15, 0], [0, len, 0], 0.05, 0.036, flesh, 8);
          put(arm, ball(), flesh, [0, len + 0.05, 0], [0, 0, 0], [0.05, 0.06, 0.025]);
          for (let f = 0; f < 4; f++) limb(arm, [(f - 1.5) * 0.026, len + 0.09, 0], [(f - 1.5) * 0.045, len + 0.2 + random() * 0.04, 0.03 + random() * 0.05], 0.012, 0.008, flesh, 5);
          limb(arm, [-0.05, len + 0.04, 0], [-0.11, len + 0.1, 0.04], 0.013, 0.009, flesh, 5);
          arms.push(arm);
        }
      }
    });

    // The grave in front: freshly broken earth around wherever the hero stands.
    const breakout = new THREE.Group();
    breakout.position.set(SLOTS[0][0], groundAt(SLOTS[0][0], SLOTS[0][1]) + 0.01, SLOTS[0][1]);
    root.add(breakout);
    put(breakout, new THREE.CylinderGeometry(1.02, 1.1, 0.06, 28), soil, [0, 0.01, 0]);
    for (let i = 0; i < 9; i++) { const t = i / 9 * Math.PI * 2 + random() * 0.4; mound(breakout, random, 0.3 + random() * 0.14, 0.14 + random() * 0.1, 0.24 + random() * 0.1, soil, [Math.cos(t) * 0.98, 0, Math.sin(t) * 0.98], 0.3).rotation.y = -t; }
    turfSlabs(breakout, random, 8, 1.2, 0.3, paint(soils[1], { roughness: 1 }), paint(shade(grassTone, '#7aa648', 0.25)), [0, 0.02, 0], 0.9);
    clods(breakout, random, 70, 0.9, 2.0, 0.045, soils, [0, 0.02, 0]);
    {
      const bits: Bit[] = [];
      for (const at of clodSpots) for (let i = 0; i < 12; i++) { const t = random() * 6.3, d = 0.3 + random() * 0.8, s = 0.03 + random() * 0.05; bits.push({ p: [at[0] + Math.cos(t) * d, groundAt(at[0] + Math.cos(t) * d, at[2] + Math.sin(t) * d) + s * 0.3, at[2] + Math.sin(t) * d], r: [random() * 3, random() * 3, 0], s: [s, s * 0.7, s], c: pick(soils) }); }
      if (bits.length) many(root, new THREE.IcosahedronGeometry(1, 0), paint('#ffffff', { roughness: 1, flatShading: true }), bits);
    }
    // The hero's own marker, shoved aside behind the break.
    if (a.tradition !== 'chinese') {
      const own = headstone(root, a.tradition === 'irish' ? 'gothic' : a.tradition === 'mexican' ? 'cross' : 'shoulder', 0.62, 0.95, 0.09, a.tradition === 'mexican' ? paint('#f4efe2') : stoneMat, a.tradition === 'mexican' ? null : faces[0]);
      own.position.set(SLOTS[0][0] - 1.75, groundAt(-1.75, 1.4) - 0.08, SLOTS[0][1] - 1.15);
      own.rotation.set(-0.5 - random() * 0.3, 0.5, -0.2);
    }

    // Boundary and gate.
    const iron = paint(shade('#2c2a38', '#6a4a3a', wear * 0.35), { roughness: 0.7, metalness: 0.4 });
    const runs: [number, number, number, number][] = [[-SIDE, BACK, GATE_X - 1.6, BACK], [GATE_X + 1.6, BACK, SIDE, BACK], [-SIDE, BACK, -SIDE, 10], [SIDE, BACK, SIDE, 10]];
    if (a.tradition === 'new_england') {
      const pickets: Bit[] = [], tips: Bit[] = [], rails: Bit[] = [], posts: Bit[] = [], knobs: Bit[] = [];
      for (const [x0, z0, x1, z1] of runs) {
        const length = Math.hypot(x1 - x0, z1 - z0), panels = Math.round(length / 2.2), turn = Math.atan2(-(z1 - z0), x1 - x0);
        for (let p = 0; p < panels; p++) {
          const tilt = (random() - 0.5) * wear * 0.5, gone = random() < wear * 0.12;
          const at = (t: number): [number, number] => [mix(x0, x1, (p + t) / panels), mix(z0, z1, (p + t) / panels)];
          const [px, pz] = at(0);
          posts.push({ p: [px, groundAt(px, pz) + 0.85, pz], r: [0, turn, 0], s: [0.09, 1.7, 0.09] });
          knobs.push({ p: [px, groundAt(px, pz) + 1.76, pz], s: 0.075 });
          if (gone) continue;
          const [cx, cz] = at(0.5), cy = groundAt(cx, cz);
          const dy = groundAt(...at(1)) - groundAt(px, pz);
          const rx = z0 === z1 ? tilt : 0, rz = z0 === z1 ? Math.atan2(dy, 2.2) : tilt;
          for (const h of [0.3, 1.25]) rails.push({ p: [cx, cy + h + (z0 === z1 ? 0 : 0), cz], r: [z0 === z1 ? 0 : -Math.atan2(dy, 2.2) * Math.sign(z1 - z0), turn, z0 === z1 ? rz : 0], s: [length / panels, 0.035, 0.03] });
          for (let i = 1; i < 10; i++) {
            if (random() < wear * 0.14) continue;
            const [x, z] = at(i / 10), y = groundAt(px, pz) + dy * (i / 10);
            pickets.push({ p: [x, y + 0.75, z], r: [rx, 0, z0 === z1 ? 0 : rz], s: [0.014, 1.5, 0.014] });
            tips.push({ p: [x, y + 1.56, z], r: [rx, 0, z0 === z1 ? 0 : rz], s: [0.03, 0.14, 0.03] });
          }
        }
      }
      many(root, new THREE.CylinderGeometry(1, 1, 1, 5), iron, pickets);
      many(root, new THREE.ConeGeometry(1, 1, 4), iron, tips);
      many(root, new THREE.BoxGeometry(1, 1, 1), iron, rails);
      many(root, new THREE.BoxGeometry(1, 1, 1), iron, posts);
      many(root, ball(8, 6), iron, knobs);
    } else if (a.tradition === 'irish') {
      const stones: Bit[] = [];
      for (const [x0, z0, x1, z1] of runs) {
        const length = Math.hypot(x1 - x0, z1 - z0), n = Math.round(length / 0.42), turn = Math.atan2(-(z1 - z0), x1 - x0);
        for (let i = 0; i < n; i++) {
          const x = mix(x0, x1, (i + 0.5) / n), z = mix(z0, z1, (i + 0.5) / n), y = groundAt(x, z);
          const courses = random() < wear * 0.3 ? 1 + Math.floor(random() * 2) : 4;
          for (let c = 0; c < courses; c++) stones.push({ p: [x + (random() - 0.5) * 0.06, y + 0.11 + c * 0.23, z + (random() - 0.5) * 0.06], r: [(random() - 0.5) * 0.2, turn + (random() - 0.5) * 0.25, (random() - 0.5) * (c === 3 ? 1.2 : 0.2)], s: [0.4 + random() * 0.14, c === 3 ? 0.3 : 0.22, 0.42 + random() * 0.1], c: hex(shade(stoneTone, random() < 0.5 ? '#6a6a70' : '#c0bcb0', random() * 0.35)) });
        }
      }
      many(root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 1 }), stones);
    } else if (a.tradition === 'mexican') {
      const walls: Bit[] = [], caps: Bit[] = [];
      const adobe = shade('#ecdcc2', '#b89a78', wear * 0.4), trim = tombPaints[random() < 0.5 ? 0 : 4];
      for (const [x0, z0, x1, z1] of runs) {
        const length = Math.hypot(x1 - x0, z1 - z0), n = Math.round(length / 2.4), turn = Math.atan2(-(z1 - z0), x1 - x0);
        for (let i = 0; i < n; i++) {
          const x = mix(x0, x1, (i + 0.5) / n), z = mix(z0, z1, (i + 0.5) / n), y = groundAt(x, z), h = 1.35 - (random() < wear * 0.4 ? random() * 0.5 : 0);
          walls.push({ p: [x, y + h / 2 - 0.1, z], r: [0, turn, 0], s: [length / n + 0.02, h + 0.2, 0.34], c: hex(shade(adobe, '#ffffff', random() * 0.15)) });
          if (h > 1.3) caps.push({ p: [x, y + h + 0.04, z], r: [0, turn, 0], s: [length / n + 0.02, 0.1, 0.42], c: hex(trim) });
        }
      }
      many(root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 1 }), walls);
      many(root, new THREE.BoxGeometry(1, 1, 1), paint('#ffffff', { roughness: 0.9 }), caps);
    } else {
      const canes: Bit[] = [], leaves: Bit[] = [];
      for (let clump = 0; clump < 10; clump++) {
        const cx = (clump % 2 ? 1 : -1) * (9.2 + random() * 2.5), cz = -9 + random() * 15;
        for (let i = 0; i < 9; i++) {
          const x = cx + (random() - 0.5) * 1.4, z = cz + (random() - 0.5) * 1.4, h = 3.5 + random() * 3, tiltX = (random() - 0.5) * 0.2, tiltZ = (random() - 0.5) * 0.2;
          canes.push({ p: [x, groundAt(x, z) + h / 2, z], r: [tiltX, 0, tiltZ], s: [0.035, h, 0.035], c: random() < 0.5 ? '#6f8a4a' : '#8a9a52' });
          for (let l = 0; l < 4; l++) leaves.push({ p: [x - tiltZ * h * (0.3 + l * 0.08) + (random() - 0.5) * 0.5, groundAt(x, z) + h * (0.6 + l * 0.11), z + tiltX * h * 0.4 + (random() - 0.5) * 0.5], r: [random() * 3, random() * 3, random() * 3], s: [0.5, 0.12, 0.28], c: random() < 0.5 ? '#4f7a4a' : '#5f8a55' });
        }
      }
      many(root, new THREE.CylinderGeometry(1, 1, 1, 6), paint('#ffffff', { roughness: 0.6 }), canes);
      many(root, ball(6, 4), paint('#ffffff', { roughness: 0.8 }), leaves);
    }
    const gate = new THREE.Group();
    gate.position.set(GATE_X, groundAt(GATE_X, BACK), BACK);
    root.add(gate);
    if (a.tradition === 'new_england' || a.tradition === 'irish') {
      const timber = paint(shade('#5a4636', '#7a7468', wear * 0.5), { roughness: 1 });
      const tile = paint(shade(a.tradition === 'irish' ? '#5a6068' : '#6a4a40', '#55604a', wear * 0.4), { roughness: 1 });
      for (const x of [-1.4, 1.4]) for (const z of [-0.9, 0.9]) { put(gate, new THREE.BoxGeometry(0.2, 2.5, 0.2), timber, [x, 1.25, z]); limb(gate, [x, 1.8, z], [x * 0.55, 2.5, z], 0.06, 0.06, timber, 4); }
      for (const z of [-0.9, 0.9]) put(gate, new THREE.BoxGeometry(3.3, 0.2, 0.2), timber, [0, 2.55, z]);
      for (const s of [-1, 1]) put(gate, new THREE.BoxGeometry(2.25, 0.1, 2.9), tile, [s * 0.9, 3.2, 0], [0, 0, -s * 0.72]);
      put(gate, new THREE.BoxGeometry(0.14, 0.14, 3.0), timber, [0, 3.92, 0]);
      const cross = headstone(gate, 'cross', 0.34, 0.6, 0.06, timber, null);
      cross.position.set(0, 3.95, 1.35);
      const sag = wear * 0.5;
      for (const s of [-1, 1]) {
        const leaf = new THREE.Group();
        leaf.position.set(s * 1.3, 0.1, 0.9);
        leaf.rotation.set(0, s * (0.5 + random() * 0.9), s * sag * 0.2);
        gate.add(leaf);
        for (const y of [0.25, 0.95]) put(leaf, new THREE.BoxGeometry(1.2, 0.07, 0.05), timber, [-s * 0.6, y, 0]);
        for (let i = 0; i < 6; i++) put(leaf, new THREE.BoxGeometry(0.07, 1.1 + Math.sin(i / 5 * Math.PI) * 0.15, 0.03), timber, [-s * (0.1 + i * 0.2), 0.6, 0.03]);
      }
    } else if (a.tradition === 'mexican') {
      const s = new THREE.Shape();
      s.moveTo(-1.9, 0); s.lineTo(-1.9, 2.6); s.lineTo(-1.2, 2.6); s.lineTo(-1.2, 3.1); s.absarc(0, 3.1, 1.2, Math.PI, 0, true); s.lineTo(1.2, 2.6); s.lineTo(1.9, 2.6); s.lineTo(1.9, 0); s.lineTo(1.0, 0); s.lineTo(1.0, 1.7); s.absarc(0, 1.7, 1.0, 0, Math.PI, false); s.lineTo(-1.0, 0); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false, curveSegments: 12 });
      g.translate(0, -0.1, -0.25);
      put(gate, g, paint(shade('#f0e4cc', '#b89a78', wear * 0.4), { roughness: 1 }));
      put(gate, new THREE.TorusGeometry(1.0, 0.07, 6, 20, Math.PI), paint(tombPaints[0]), [0, 1.6, 0.27]);
      const bell = paint('#b08a3a', { metalness: 0.7, roughness: 0.4 });
      put(gate, new THREE.CylinderGeometry(0.1, 0.24, 0.34, 12), bell, [0, 3.35, 0.3]);
      const cross = headstone(gate, 'cross', 0.4, 0.75, 0.08, paint('#f4efe2'), null);
      cross.position.set(0, 4.15, 0);
    } else {
      const red = paint(shade('#b8322a', '#6a4a40', wear * 0.5), { roughness: 0.8 }), tile = paint(shade('#3f6a5a', '#55604a', wear * 0.4), { roughness: 0.9 });
      for (const x of [-1.5, 1.5]) { put(gate, new THREE.CylinderGeometry(0.14, 0.16, 3.4, 12), red, [x, 1.6, 0]); put(gate, new THREE.BoxGeometry(0.5, 0.3, 0.5), stoneMat, [x, 0.1, 0]); }
      put(gate, new THREE.BoxGeometry(3.7, 0.24, 0.22), red, [0, 2.75, 0]);
      put(gate, new THREE.BoxGeometry(4.0, 0.2, 0.26), red, [0, 3.25, 0]);
      const board = put(gate, new THREE.PlaneGeometry(0.5, 1.2), new THREE.MeshStandardMaterial({ map: faces[0], roughness: 0.9 }), [0, 3.0, 0.14], [0, 0, Math.PI / 2]);
      board.castShadow = false;
      put(gate, new THREE.BoxGeometry(4.6, 0.14, 1.1), tile, [0, 3.5, 0]);
      for (const sgn of [-1, 1]) { put(gate, new THREE.BoxGeometry(2.4, 0.12, 0.9), tile, [sgn * 1.05, 3.72, 0], [0, 0, sgn * 0.16]); put(gate, new THREE.BoxGeometry(0.7, 0.1, 1.0), tile, [sgn * 2.5, 3.66, 0], [0, 0, sgn * 0.5]); }
    }

    // The bare tree.
    const TREE: V3 = [5.6, groundAt(5.6, -7.9), -7.9];
    const perches: THREE.Vector3[] = [];
    {
      const bits: Bit[] = [];
      const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion(), e = new THREE.Euler();
      const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
        q.setFromUnitVectors(up, dir); e.setFromQuaternion(q);
        const end = from.clone().addScaledVector(dir, len);
        bits.push({ p: from.clone().addScaledVector(dir, len / 2).toArray() as [number, number, number], r: [e.x, e.y, e.z], s: [rad, len * 1.04, rad] });
        if (depth === 0) return;
        if (depth === 2 || depth === 3) perches.push(end.clone());
        const kids = depth > 3 ? 2 + Math.floor(random() * 2) : 2;
        for (let i = 0; i < kids; i++) {
          const d = dir.clone().add(new THREE.Vector3((random() - 0.5) * 1.5, (random() - 0.25) * 0.8, (random() - 0.5) * 1.5)).normalize();
          grow(end, d, len * (0.62 + random() * 0.2), rad * 0.62, depth - 1);
        }
      };
      grow(new THREE.Vector3(TREE[0], TREE[1] - 0.2, TREE[2]), new THREE.Vector3((random() - 0.5) * 0.25, 1, (random() - 0.5) * 0.15).normalize(), 2.6, 0.3, 5);
      const g = new THREE.CylinderGeometry(0.66, 1, 1, 7);
      many(root, g, paint(shade('#3a3340', '#5a5248', wear * 0.3), { roughness: 1 }), bits);
      for (let i = 0; i < 5; i++) { const t = i / 5 * 6.28 + random(); limb(root, [TREE[0], TREE[1] + 0.35, TREE[2]], [TREE[0] + Math.cos(t) * 1.1, TREE[1] - 0.1, TREE[2] + Math.sin(t) * 1.1], 0.16, 0.05, paint('#3a3340', { roughness: 1 }), 6); }
    }
    const birds: Bit[] = [], eyes: Bit[] = [];
    if (a.tree === 'crows') {
      const n = Math.round(mix(3, 9, mood.density));
      for (let i = 0; i < n && i < perches.length; i++) {
        const p = perches[Math.floor(random() * perches.length)], turn = random() * 6;
        birds.push({ p: [p.x, p.y + 0.14, p.z], r: [0, turn, 0.5], s: [0.2, 0.12, 0.11] }, { p: [p.x + Math.cos(turn) * 0.15, p.y + 0.27, p.z - Math.sin(turn) * 0.15], s: 0.075 }, { p: [p.x + Math.cos(turn) * 0.25, p.y + 0.26, p.z - Math.sin(turn) * 0.25], r: [0, turn, 0], s: [0.07, 0.022, 0.022] }, { p: [p.x - Math.cos(turn) * 0.22, p.y + 0.05, p.z + Math.sin(turn) * 0.22], r: [0, turn, 0.9], s: [0.14, 0.03, 0.06] });
      }
    } else if (a.tree === 'owl' && perches.length) {
      const p = perches.reduce((best, c) => (c.z > best.z ? c : best));
      birds.push({ p: [p.x, p.y + 0.24, p.z], s: [0.17, 0.26, 0.15], c: '#6a5a4a' }, { p: [p.x, p.y + 0.5, p.z + 0.02], s: [0.17, 0.14, 0.14], c: '#7a6a58' });
      for (const s of [-1, 1]) { eyes.push({ p: [p.x + s * 0.07, p.y + 0.52, p.z + 0.13], s: 0.045, c: '#ffd83a' }); birds.push({ p: [p.x + s * 0.12, p.y + 0.63, p.z], s: [0.03, 0.07, 0.03], c: '#6a5a4a' }); }
    } else if (a.tree === 'lanterns') {
      const n = Math.round(mix(4, 10, mood.density)), hues = mood.cheer > 0.5 ? ['#ffd27a', '#ff8a5a', '#ffe9a8', '#ff6a8a'] : ['#ffd27a', '#ffe9c8', '#ffb469'];
      for (let i = 0; i < n && perches.length; i++) {
        const p = perches[Math.floor(random() * perches.length)], drop = 0.4 + random() * 0.7;
        stems.push({ p: [p.x, p.y - drop / 2, p.z], s: [0.006, drop, 0.006], c: '#2a2a2a' });
        eyes.push({ p: [p.x, p.y - drop - 0.17, p.z], s: [0.17, 0.2, 0.17], c: pick(hues) });
      }
    }
    if (birds.length) many(root, ball(10, 8), paint(a.tree === 'owl' ? '#ffffff' : '#17161c', { roughness: 0.8 }), birds);

    // Weeds and long grass, thicker with neglect.
    {
      const blade = new THREE.ConeGeometry(0.5, 1, 4);
      blade.translate(0, 0.5, 0);
      const bits: Bit[] = [];
      const greens = [hex(shade(grassTone, '#3f5a44', 0.35)), hex(shade(grassTone, '#a8b080', 0.3)), hex(grassTone)];
      const n = Math.round(mix(500, 1500, mood.density) * (0.5 + wear * 0.8));
      for (let i = 0; i < n; i++) {
        const x = (random() - 0.5) * 24, z = -10 + random() * 21;
        if (nearPath(x, z, 0.55) || Math.hypot(x - SLOTS[0][0], z - SLOTS[0][1]) < 1.3) continue;
        const h = mix(0.12, 0.42, wear) * (0.5 + random());
        bits.push({ p: [x, groundAt(x, z), z], r: [(random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.6], s: [h * 0.14, h, h * 0.05], c: pick(greens) });
      }
      many(root, blade, paint('#ffffff', { roughness: 0.9 }), bits);
    }

    // Hero offerings sit by the break as well.
    if (offerLight) { lantern([SLOTS[0][0] + 1.7, groundAt(1.7, 3.2), SLOTS[0][1] + 0.9], 1.5); lantern([SLOTS[0][0] - 1.9, groundAt(-1.9, 3.4), SLOTS[0][1] + 1.2], 1.2); }
    if (offerFlowers) bouquet([SLOTS[0][0] - 1.6, groundAt(-1.6, 3.4) + 0.02, SLOTS[0][1] + 0.6], 0.25);
    if (stems.length) many(root, new THREE.CylinderGeometry(1, 1, 1, 4), paint('#ffffff'), stems);
    if (blooms.length) many(root, ball(8, 6), paint('#ffffff', { roughness: 0.6 }), blooms);
    if (frames.length) many(root, new THREE.BoxGeometry(1, 1, 1), iron, frames);
    const glowMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffb65a', emissiveIntensity: 1.5, roughness: 0.4 });
    for (const set of [glows, eyes]) if (set.length) { const m = many(root, set === glows ? new THREE.BoxGeometry(1, 1, 1) : ball(10, 8), glowMat, set); m.castShadow = false; }

    // Ground fog: soft drifting banks, kept out of the solid passes.
    const fogCount = { none: 0, wisps: 7, blanket: 16, thick: 26 }[a.fog];
    const banks: { mesh: THREE.Mesh; speed: number }[] = [];
    if (fogCount) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 64;
      const ctx = c.getContext('2d')!;
      for (let i = 0; i < 26; i++) {
        const x = 40 + random() * 176, y = 30 + random() * 16, r = 18 + random() * 22;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 64);
      }
      const mist = new THREE.CanvasTexture(c);
      const tint = shade('#efeaf8', skies[2], 0.25);
      for (let i = 0; i < fogCount; i++) {
        const deep = a.fog === 'thick' ? 1.5 : a.fog === 'blanket' ? 1.0 : 0.7;
        const z = -9 + (i / fogCount) * 17 + random(), x = (random() - 0.5) * 20, w = 7 + random() * 8, h = deep * (0.8 + random() * 0.7);
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: mist, color: tint, transparent: true, opacity: (a.fog === 'wisps' ? 0.45 : a.fog === 'thick' ? 0.62 : 0.52) * (z > 1.5 ? 0.6 : 1), depthWrite: false }));
        mesh.position.set(x, groundAt(x, z) + h * 0.42, z);
        mesh.renderOrder = 2;
        root.add(mesh);
        banks.push({ mesh, speed: (0.08 + random() * 0.22) * (i % 2 ? 1 : -1) });
      }
    }

    // Light: a cool moon key from the left, a warm afterglow rim.
    root.add(new THREE.HemisphereLight(shade(skies[1], '#ffffff', 0.5), '#6f6a62', 1.5));
    const key = new THREE.DirectionalLight(shade(moonTone, '#cfd6ff', a.moon === 'harvest' ? 0.3 : 0.6), mix(1.7, 2.2, mood.cheer));
    key.position.set(mix(-13, -7, mood.daylight), 11, 8);
    key.target.position.set(0, 0, -1);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = 0.04;
    key.shadow.bias = -0.0004;
    root.add(key, key.target);
    const rim = new THREE.DirectionalLight(skies[3], 0.7);
    rim.position.set(8, 5, -14);
    root.add(rim);

    const energy = mood.energy;
    const world: World = {
      object: root,
      camera,
      background: skies[1].clone(),
      capacity: SLOTS.length,
      ground,
      keyLight: key,
      place(items: readonly Placeable[]) {
        items.forEach((item, i) => {
          const [x, z, maxHeight, maxRadius] = SLOTS[i % SLOTS.length];
          // Real sizes, shrunk only when a thing would not fit its plot; small things are raised to be seen.
          let scale = Math.min(1, maxHeight / Math.max(item.height, 0.05), maxRadius / Math.max(item.radius, 0.05));
          const least = item.hero ? 1.5 : 1.0;
          if (item.height * scale < least) scale = Math.min(maxRadius / Math.max(item.radius, 0.05), least / Math.max(item.height, 0.05));
          item.holder.scale.setScalar(scale);
          item.holder.position.set(x, groundAt(x, z) + (i === 0 ? 0.03 : 0), z);
          item.holder.rotation.y = Math.atan2(camera.position.x - x, camera.position.z - z) * 0.75 + (context.random() - 0.5) * 0.4;
          item.holder.updateMatrixWorld(true);
          if (i === 0) breakout.scale.setScalar(Math.min(1.5, Math.max(0.75, item.radius * scale * 1.12)));
        });
        camera.lookAt(aim);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();
        const shadow = key.shadow.camera;
        shadow.left = -17; shadow.right = 17; shadow.bottom = -15; shadow.top = 15;
        shadow.near = 1; shadow.far = 60;
        shadow.updateProjectionMatrix();
      },
      update(dt, time) {
        for (const bank of banks) {
          bank.mesh.position.x += bank.speed * dt * (0.4 + energy * 2.5);
          if (bank.mesh.position.x > 14) bank.mesh.position.x = -14;
          if (bank.mesh.position.x < -14) bank.mesh.position.x = 14;
        }
        glowMat.emissiveIntensity = 1.5 + Math.sin(time * (7 + energy * 12)) * 0.2 + Math.sin(time * 17.3) * 0.12;
        arms.forEach((arm, i) => { arm.rotation.z = Math.sin(time * (1 + energy * 4) + i * 1.7) * (0.15 + energy * 0.35); });
      },
      dispose() { key.shadow.map?.dispose(); disposeTree(root); },
    };
    return world;
  },
});
