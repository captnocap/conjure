import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P3 = [number, number, number];
interface Piece { at: P3; turn?: P3; size: P3; color: THREE.ColorRepresentation }

function painted(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default defineThing({
  questions: {
    pillars: choice('What are the pillars under the floor made of?', {
      square: 'Stacks of square red bricks with fat mortar joints, the standard pila.',
      round: 'Stacks of round disc bricks like piles of coins.',
      stone: 'Single rough stone posts, a provincial shortcut.',
      pipe: 'Fat terracotta pipes stood on end and capped with a tile.',
    }),
    surface: choice('What is the floor surface on top?', {
      mosaic: 'Black and white mosaic with a geometric border.',
      marble: 'Big polished marble paving slabs.',
      signinum: 'Pink waterproof mortar speckled with crushed tile.',
      herringbone: 'Small bricks laid in a herringbone pattern.',
    }),
    cut: score('How much of the floor has been cut away?', ['Only one corner is open, a peek underneath', 'About half is open', 'Nearly all gone; a last shelf of floor clings on at the back']),
    state: choice('What is the hypocaust doing now?', {
      firing: 'In use: ember glow and hot air between the pillars, soot fresh and black.',
      cold: 'Cold but intact, as the builders left it.',
      collapsed: 'The floor has fallen in; slabs lie tilted among snapped pillars.',
      flooded: 'Groundwater stands dark and green between the pillars.',
      excavated: 'A live dig: a striped ranging pole, a bucket, a trowel and string lines.',
      museum: 'Displayed under glass walkway panels with a small label stand.',
    }),
    wall: choice('What stands at the back of the patch?', {
      none: 'Nothing above floor level; just the cut edge of the ground.',
      flues: 'A stretch of wall lined with hollow box flue tiles that carried the heat upward.',
      furnace: 'A low wall with the brick arch of the furnace mouth opening into the void.',
    }),
    debris: choice('What lies on the lower floor between the pillars?', {
      clean: 'Nothing, swept bare.',
      ash: 'Drifts of pale ash and charcoal crumbs.',
      rubble: 'Broken tile and fallen mortar.',
      bones: 'The small bones of animals that crept in and died.',
      lost: 'Things that slipped through the cracks above: coins, a hairpin, dice, a glass bead.',
    }),
    headroom: score('How tall is the void?', ['A low crawl space barely knee high', 'Waist high', 'Tall enough to stoop inside']),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const wear = mood.wear;
    const firing = a.state === 'firing';
    const soot = firing ? 0.8 : mix(0.5, 0.7, wear);
    const sp = 0.56;
    const nx = 4 + Math.round(mood.density * 2), nz = 4;
    const W = nx * sp, D = nz * sp;
    const y0 = 0.1, h = mix(0.42, 1.0, a.headroom), y1 = y0 + h;
    const tileT = 0.055, coreT = 0.16, topT = 0.035, yF = y1 + tileT + coreT + topT;
    const px = (i: number) => (i - (nx - 1) / 2) * sp, pz = (j: number) => (j - (nz - 1) / 2) * sp;
    const brickTone = () => new THREE.Color().setHSL(0.025 + random() * 0.035, 0.55, 0.38 + random() * 0.12, THREE.SRGBColorSpace);
    const sooted = (c: THREE.Color, k = soot) => c.lerp(new THREE.Color('#1b1917'), k * (0.6 + random() * 0.4));
    const instances = (geometry: THREE.BufferGeometry, material: THREE.Material, pieces: Piece[]) => {
      if (!pieces.length) return null;
      const mesh = new THREE.InstancedMesh(geometry, material, pieces.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion();
      pieces.forEach((piece, index) => {
        q.setFromEuler(new THREE.Euler(...(piece.turn ?? [0, 0, 0])));
        m.compose(new THREE.Vector3(...piece.at), q, new THREE.Vector3(...piece.size));
        mesh.setMatrixAt(index, m);
        mesh.setColorAt(index, new THREE.Color(piece.color));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };
    const matte = new THREE.MeshStandardMaterial({ roughness: 0.95 });

    // Which bays still carry floor: the back-left stays, the front-right is cut open.
    const open = mix(0.3, 1.0, a.cut);
    const covered: boolean[][] = [], fallen: boolean[][] = [];
    for (let i = 0; i < nx; i++) {
      covered.push([]); fallen.push([]);
      for (let j = 0; j < nz; j++) {
        const u = (1 - i / (nx - 1)) * 0.6 + (1 - j / (nz - 1)) * 0.6 + (random() - 0.5) * 0.16;
        const keep = u > open || (i === 0 && j === 0);
        const drops = a.state === 'collapsed' && keep && u < open + 0.3 && !(i === 0 && j === 0);
        covered[i].push(keep && !drops);
        fallen[i].push(drops);
      }
    }

    // The ground it is cut from: sub-floor and the two uncut sides.
    const earth = s.material('#6f6557', { roughness: 1 });
    const masonry = new THREE.MeshStandardMaterial({ roughness: 1, map: painted(256, (ctx, n) => {
      ctx.fillStyle = '#5d554b'; ctx.fillRect(0, 0, n, n);
      for (let r = 0; r < 12; r++) { let x = -random() * 40; while (x < n) { const w = 30 + random() * 50; ctx.fillStyle = `hsl(${25 + random() * 20},${10 + random() * 14}%,${28 + random() * 22}%)`; ctx.beginPath(); ctx.roundRect(x + 2, r * n / 12 + 2, w - 4, n / 12 - 4, 4); ctx.fill(); x += w; } }
      const g = ctx.createLinearGradient(0, 0, 0, n); g.addColorStop(0, `rgba(15,13,12,${soot})`); g.addColorStop(1, `rgba(15,13,12,${soot * 0.6})`); ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
    }) });
    const subfloor = s.box([W + 0.24, y0, D + 0.24], [-0.12, y0 / 2, -0.12], s.material(new THREE.Color('#6a6056').lerp(new THREE.Color('#141211'), soot), { roughness: 1 }));
    subfloor.receiveShadow = true;
    s.box([W + 0.24, yF - y0, 0.24], [-0.12, (yF + y0) / 2, -D / 2 - 0.12], masonry);
    s.box([0.24, yF - y0, D], [-W / 2 - 0.12, (yF + y0) / 2, 0], masonry);
    void earth;

    // Pillars.
    const bricks: Piece[] = [], loose: Piece[] = [];
    const brickH = 0.062, bw = 0.21;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const exposed = !covered[i][j];
      let frac = 1;
      if (exposed && (fallen[i][j] || random() < wear * 0.55)) frac = 0.25 + random() * 0.6;
      if (exposed && a.state === 'museum') frac = Math.max(frac, 0.7);
      const x = px(i) + (random() - 0.5) * 0.03, z = pz(j) + (random() - 0.5) * 0.03;
      if (a.pillars === 'square' || a.pillars === 'round') {
        const count = Math.max(1, Math.round(h * frac / brickH));
        const lean = exposed ? (random() - 0.5) * wear * 0.1 : 0;
        for (let k = 0; k < count; k++) {
          const wide = k === 0 || (k === count - 1 && frac === 1) ? 1.3 : 1;
          bricks.push({ at: [x + lean * k * brickH * 3, y0 + (k + 0.5) * (h * frac / count), z], turn: [0, (random() - 0.5) * 0.16, 0], size: [bw * wide, h * frac / count * 0.84, bw * wide], color: sooted(brickTone(), soot * (1 - 0.3 * k / count)) });
        }
        // mortar core showing between the bricks
        bricks.push({ at: [x, y0 + h * frac / 2, z], size: [bw * 0.9, h * frac, bw * 0.9], color: sooted(new THREE.Color('#b7ab98')) });
      } else if (a.pillars === 'stone') {
        bricks.push({ at: [x, y0 + h * frac / 2, z], turn: [0, random() * 0.5, (random() - 0.5) * 0.05], size: [bw * (0.8 + random() * 0.3), h * frac, bw * (0.8 + random() * 0.3)], color: sooted(new THREE.Color().setHSL(0.09, 0.12, 0.55 + random() * 0.12, THREE.SRGBColorSpace)) });
        if (frac === 1) bricks.push({ at: [x, y1 - 0.02, z], size: [bw * 1.4, 0.04, bw * 1.4], color: sooted(brickTone()) });
      } else {
        const segs = Math.max(1, Math.round(h * frac / 0.3));
        for (let k = 0; k < segs; k++) bricks.push({ at: [x, y0 + (k + 0.5) * (h * frac / segs), z], size: [bw * 0.95, h * frac / segs * 0.96, bw * 0.95], color: sooted(brickTone(), soot * 0.8) });
        for (let k = 1; k < segs; k++) bricks.push({ at: [x, y0 + k * (h * frac / segs), z], size: [bw * 1.08, 0.03, bw * 1.08], color: sooted(brickTone()) });
        if (frac === 1) loose.push({ at: [x, y1 - 0.02, z], size: [bw * 1.5, 0.04, bw * 1.5], color: sooted(brickTone()) });
      }
      if (frac < 1) for (let k = 0; k < 2 + random() * 4; k++) loose.push({ at: [x + (random() - 0.5) * 0.5, y0 + 0.03 + random() * 0.03, z + (random() - 0.5) * 0.5], turn: [(random() - 0.5) * 0.6, random() * 3, (random() - 0.5) * 0.5], size: [bw, brickH * 0.84, bw * (0.5 + random() * 0.5)], color: sooted(brickTone(), soot * 0.5) });
    }
    const round = a.pillars === 'round' || a.pillars === 'pipe';
    instances(round ? new THREE.CylinderGeometry(0.5, 0.5, 1, 14) : new THREE.BoxGeometry(1, 1, 1), matte, bricks);

    // The suspended floor, bay by bay, so the cut edge shows its layers.
    const topMap = painted(256, (ctx, n) => {
      if (a.surface === 'mosaic') {
        const cells = 16, c = n / cells;
        for (let x = 0; x < cells; x++) for (let y = 0; y < cells; y++) {
          const dx = Math.abs(x - 7.5), dy = Math.abs(y - 7.5), ring = Math.max(dx, dy);
          let black = ring > 6.4 && ring < 7.4 ? false : ring > 5.4 && ring < 6.6 ? (x + y) % 2 === 0 : dx + dy < 3.2 || (Math.abs(dx - dy) < 0.6 && ring < 5 && ring > 2);
          if (ring > 7.4) black = true;
          if (random() < wear * 0.22) { ctx.fillStyle = '#8f8674'; ctx.fillRect(x * c, y * c, c, c); continue; }
          ctx.fillStyle = black ? `hsl(30,6%,${12 + random() * 8}%)` : `hsl(42,22%,${80 + random() * 10}%)`;
          ctx.fillRect(x * c + 0.7, y * c + 0.7, c - 1.4, c - 1.4);
        }
      } else if (a.surface === 'marble') {
        ctx.fillStyle = '#e6e1d6'; ctx.fillRect(0, 0, n, n);
        ctx.strokeStyle = '#8d9097';
        for (let i = 0; i < 7; i++) { ctx.globalAlpha = 0.2 + random() * 0.3; ctx.lineWidth = 1 + random() * 2; ctx.beginPath(); let x = random() * n, y = 0; ctx.moveTo(x, y); while (y < n) { x += (random() - 0.5) * 50; y += 20 + random() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
        ctx.globalAlpha = 1; ctx.strokeStyle = '#7b756a'; ctx.lineWidth = 4; ctx.strokeRect(0, 0, n, n);
      } else if (a.surface === 'signinum') {
        ctx.fillStyle = '#c98f7c'; ctx.fillRect(0, 0, n, n);
        for (let i = 0; i < 500; i++) { ctx.fillStyle = random() < 0.5 ? '#efe4d2' : '#9c4a35'; ctx.fillRect(random() * n, random() * n, 2 + random() * 4, 2 + random() * 4); }
      } else {
        ctx.fillStyle = '#6a5547'; ctx.fillRect(0, 0, n, n);
        const b = n / 8;
        for (let r = -1; r < 9; r++) for (let q = -1; q < 9; q++) { ctx.fillStyle = `hsl(${12 + random() * 14},48%,${38 + random() * 14}%)`; ctx.save(); ctx.translate(q * b + (r % 2 ? b / 2 : 0), r * b); ctx.rotate(r % 2 ? Math.PI / 4 : -Math.PI / 4); ctx.fillRect(-b * 0.62, -b * 0.2, b * 1.24, b * 0.4); ctx.restore(); }
      }
      ctx.fillStyle = `rgba(90,80,62,${wear * 0.35})`; ctx.fillRect(0, 0, n, n);
    });
    const topFace = new THREE.MeshStandardMaterial({ map: topMap, roughness: a.surface === 'marble' ? mix(0.25, 0.8, wear) : 0.8 });
    const topSide = s.material(a.surface === 'herringbone' ? '#8a4f3a' : a.surface === 'signinum' ? '#c98f7c' : '#d8d2c4');
    const core = s.material('#a59c8c', { roughness: 1 });
    const tileMat = s.material(new THREE.Color('#b0603f').lerp(new THREE.Color('#1c1a18'), soot * 0.35), { roughness: 0.9 });
    const slab = (group: THREE.Object3D, i: number, j: number) => {
      const parts: [number, number, THREE.Material | THREE.Material[]][] = [[tileT, 0, tileMat], [coreT, tileT, core], [topT, tileT + coreT, [topSide, topSide, topFace, topSide, topSide, topSide]]];
      for (const [t, y, material] of parts) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(sp * (t === coreT ? 0.985 : 1), t, sp * (t === coreT ? 0.985 : 1)), material);
        mesh.position.set(px(i), y + t / 2, pz(j));
        mesh.castShadow = mesh.receiveShadow = true;
        group.add(mesh);
      }
    };
    const deck = new THREE.Group();
    deck.position.y = y1;
    s.root.add(deck);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (covered[i][j]) slab(deck, i, j);
      else if (fallen[i][j]) {
        const piece = new THREE.Group();
        slab(piece, i, j);
        const pivot = new THREE.Group();
        pivot.add(piece);
        piece.position.set(-px(i), 0, -pz(j));
        pivot.position.set(px(i) + (random() - 0.5) * 0.1, y0 + 0.12 + random() * h * 0.3, pz(j) + (random() - 0.5) * 0.1);
        pivot.rotation.set((random() - 0.5) * 1.1, random() * 0.6, (random() - 0.5) * 1.1);
        s.root.add(pivot);
      }
    }
    // A ragged lip of broken concrete along the cut.
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (!covered[i][j]) continue;
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        const ni = i + di, nj = j + dj;
        if (ni >= nx || nj >= nz || covered[ni][nj]) continue;
        for (let k = 0; k < 4; k++) loose.push({ at: [px(i) + di * sp * 0.5 + (dj ? (k / 3 - 0.5) * sp * 0.8 : random() * 0.04), y1 + tileT + coreT * (0.3 + random() * 0.5), pz(j) + dj * sp * 0.5 + (di ? (k / 3 - 0.5) * sp * 0.8 : random() * 0.04)], turn: [random(), random(), random()], size: [0.07 + random() * 0.06, 0.06 + random() * 0.05, 0.07 + random() * 0.06], color: random() < 0.3 ? '#b0603f' : '#a59c8c' });
      }
    }

    // Back wall.
    if (a.wall !== 'none') {
      const up = a.wall === 'flues' ? mix(0.9, 1.3, random()) : 0.3;
      s.box([W + 0.24, up, 0.24], [-0.12, yF + up / 2, -D / 2 - 0.12], masonry);
      if (a.wall === 'flues') {
        const tiles: Piece[] = [];
        const cols = Math.floor(W / 0.2);
        for (let c = 0; c < cols; c++) {
          const rows = Math.max(1, Math.round((up / 0.3) * (0.45 + random() * 0.55) * (1 - wear * 0.3)));
          for (let r = 0; r < rows; r++) {
            const x = -W / 2 + (c + 0.5) * (W / cols), y = yF + (r + 0.5) * 0.3;
            tiles.push({ at: [x, y, -D / 2 + 0.045], size: [W / cols * 0.94, 0.29, 0.09], color: sooted(brickTone(), 0.15) });
            if (r === rows - 1) tiles.push({ at: [x, y + 0.146, -D / 2 + 0.045], size: [W / cols * 0.6, 0.004, 0.05], color: '#161412' });
          }
        }
        instances(new THREE.BoxGeometry(1, 1, 1), matte, tiles);
        const plaster = s.box([W * 0.36, up * 0.7, 0.03], [-W / 2 + W * 0.2, yF + up * 0.38, -D / 2 + 0.105], s.material(mood.warmth > 0.5 ? '#c4553d' : '#d9d1bd', { roughness: 0.9 }));
        plaster.rotation.z = 0;
      } else {
        const ax = W / 2 - sp * 0.9, r = Math.min(0.34, h * 0.48);
        const mouth = new THREE.Shape(); mouth.moveTo(-r, 0); mouth.lineTo(-r, 0.02); mouth.absarc(0, Math.max(0.02, h * 0.5 - r * 0.5), r, Math.PI, 0, true); mouth.lineTo(r, 0);
        const glow = firing ? new THREE.Color().setHSL(mix(0.02, 0.07, mood.warmth), 1, 0.5, THREE.SRGBColorSpace) : new THREE.Color('#0f0d0c');
        const hole = s.mesh(new THREE.ShapeGeometry(mouth), new THREE.MeshStandardMaterial({ color: glow, emissive: glow, emissiveIntensity: firing ? 0.9 : 0, roughness: 1 }), [ax, y0, -D / 2 + 0.004]);
        hole.castShadow = false;
        const arch: Piece[] = [];
        for (let k = 0; k <= 10; k++) { const an = Math.PI * k / 10; arch.push({ at: [ax + Math.cos(an) * (r + 0.05), y0 + Math.max(0.02, h * 0.5 - r * 0.5) + Math.sin(an) * (r + 0.05), -D / 2 + 0.02], turn: [0, 0, an - Math.PI / 2], size: [0.085, 0.11, 0.05], color: sooted(brickTone(), soot * 0.6) }); }
        instances(new THREE.BoxGeometry(1, 1, 1), matte, arch);
      }
    }

    // What lies below.
    const floorSpot = (): P3 => {
      for (let tries = 0; tries < 20; tries++) {
        const i = Math.floor(random() * (nx - 1)), j = Math.floor(random() * (nz - 1));
        if (!covered[i + 1][j + 1] || tries > 14) return [px(i) + sp * (0.5 + (random() - 0.5) * 0.5), y0, pz(j) + sp * (0.5 + (random() - 0.5) * 0.5)];
      }
      return [0, y0, 0];
    };
    if (a.debris === 'ash' || firing) {
      for (let k = 0; k < 6; k++) { const [x, y, z] = floorSpot(); const drift = s.ball([0.14 + random() * 0.12, 0.025 + random() * 0.03, 0.12 + random() * 0.1], [x, y, z], s.material(firing && k < 3 ? '#2a2422' : '#b9b3a8', { roughness: 1 }), 10); drift.castShadow = false; }
      for (let k = 0; k < 20; k++) { const [x, y, z] = floorSpot(); loose.push({ at: [x, y + 0.012, z], turn: [random(), random(), random()], size: [0.03, 0.022, 0.025], color: '#1d1a18' }); }
    }
    if (a.debris === 'rubble' || a.state === 'collapsed') for (let k = 0; k < 26; k++) { const [x, y, z] = floorSpot(); loose.push({ at: [x, y + 0.025, z], turn: [random() * 0.6, random() * 3, random() * 0.6], size: [0.06 + random() * 0.12, 0.03 + random() * 0.04, 0.05 + random() * 0.09], color: random() < 0.5 ? brickTone() : '#b3aa9a' }); }
    if (a.debris === 'bones') {
      const bone = s.material('#e9e2cf', { roughness: 0.7 });
      for (let k = 0; k < 3; k++) {
        const [x, y, z] = floorSpot();
        s.ball([0.035, 0.028, 0.045], [x, y + 0.028, z], bone, 10);
        for (let r = 0; r < 5; r++) { const rib = s.ring(0.03, 0.004, [x + 0.05 + r * 0.02, y + 0.004, z + 0.02], bone, Math.PI); rib.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.4; }
        s.rod([x + 0.04, y + 0.008, z + 0.02], [x + 0.2, y + 0.008, z + 0.03 + (random() - 0.5) * 0.06], 0.005, bone);
      }
    }
    if (a.debris === 'lost') {
      const gold = s.material('#d6b04e', { metalness: 0.8, roughness: 0.3 });
      for (let k = 0; k < 9; k++) { const [x, y, z] = floorSpot(); s.cylinder(0.018, 0.018, 0.004, [x, y + 0.003, z], gold, 10); }
      const [x, y, z] = floorSpot();
      s.rod([x, y + 0.006, z], [x + 0.13, y + 0.006, z + 0.05], 0.004, s.material('#e9e2cf'));
      s.ball([0.012, 0.012, 0.012], [x + 0.13, y + 0.01, z + 0.05], gold, 8);
      for (let k = 0; k < 2; k++) { const [dx, dy, dz] = floorSpot(); s.box([0.025, 0.025, 0.025], [dx, dy + 0.0125, dz], s.material('#efe9d8')).rotation.y = random(); }
      const [bx, by, bz] = floorSpot(); s.ball([0.02, 0.02, 0.02], [bx, by + 0.02, bz], new THREE.MeshStandardMaterial({ color: '#2f7fb8', roughness: 0.1 }), 10);
    }
    instances(new THREE.BoxGeometry(1, 1, 1), matte, loose);

    // What it is doing now.
    const embers: THREE.Mesh[] = [];
    if (firing) {
      const hot = new THREE.Color().setHSL(mix(0.02, 0.07, mood.warmth), 1, 0.5, THREE.SRGBColorSpace);
      const glow = new THREE.MeshStandardMaterial({ color: hot, emissive: hot, emissiveIntensity: 0.6, roughness: 1 });
      s.scatter(new THREE.DodecahedronGeometry(1, 0), glow, Array.from({ length: 34 }, () => { const [x, y, z] = floorSpot(); return { at: [x, y + 0.02, z] as P3, size: 0.014 + random() * 0.02 }; })).castShadow = false;
      const haze = new THREE.MeshBasicMaterial({ color: hot, transparent: true, opacity: 0.14, depthWrite: false });
      for (let k = 0; k < 5; k++) { const [x, , z] = floorSpot(); const veil = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), haze); veil.position.set(x, y0 + h * 0.4, z); veil.scale.set(0.25, h * 0.4, 0.25); veil.userData.phase = random() * 6; s.root.add(veil); embers.push(veil); }
    }
    if (a.state === 'flooded') {
      const level = y0 + Math.min(h * 0.45, 0.22 + random() * 0.1);
      const pond = s.box([W - 0.01, 0.01, D - 0.01], [0, level, 0], new THREE.MeshStandardMaterial({ color: new THREE.Color('#44584a').lerp(new THREE.Color('#5f7a4a'), wear), roughness: 0.06, metalness: 0.3, transparent: true, opacity: 0.86 }));
      pond.castShadow = false;
      s.scatter(new THREE.CircleGeometry(1, 6), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), Array.from({ length: 18 }, () => { const [x, , z] = floorSpot(); return { at: [x, level + 0.008, z] as P3, size: 0.02 + random() * 0.03, color: random() < 0.5 ? '#6f8f3a' : '#8a7a3a' }; })).rotation.x = 0;
    }
    if (a.state === 'excavated') {
      const [x, , z] = [W / 2 - 0.2, 0, D / 2 - 0.25];
      for (let k = 0; k < 8; k++) s.cylinder(0.014, 0.014, 0.125, [x, y0 + 0.0625 + k * 0.125, z + k * 0.02], s.material(k % 2 ? '#f1ece0' : '#c2362b'), 8).rotation.x = 0.16;
      const bucketMat = s.material(mood.cheer > 0.5 ? '#e0a020' : '#2f3a40', { roughness: 0.6, side: THREE.DoubleSide });
      s.lathe([[0.001, 0], [0.1, 0], [0.13, 0.24], [0.12, 0.24], [0.095, 0.015], [0.001, 0.015]], bucketMat, [px(nx - 2) + sp / 2, y0, D / 2 - sp * 0.5]);
      const tx = px(nx - 1) - sp * 0.5, tz = pz(nz - 2) + sp * 0.5;
      s.box([0.06, 0.004, 0.12], [tx, y0 + 0.004, tz], s.material('#c9cdd0', { metalness: 0.7, roughness: 0.3 })).rotation.y = 0.6;
      s.rod([tx + 0.035, y0 + 0.012, tz + 0.05], [tx + 0.09, y0 + 0.02, tz + 0.13], 0.012, s.material('#8a5a2b'));
      const cord = s.material('#f5e9a0');
      s.rod([-W / 2, yF + 0.06, D / 2], [W / 2, yF + 0.06, D / 2], 0.004, cord);
      s.rod([W / 2, yF + 0.06, -D / 2], [W / 2, yF + 0.06, D / 2], 0.004, cord);
      for (const [cx, cz] of [[-W / 2, D / 2], [W / 2, D / 2], [W / 2, -D / 2]]) s.rod([cx, 0, cz], [cx, yF + 0.1, cz], 0.012, s.material('#8a5a2b'));
      for (let k = 0; k < 4; k++) { const i = nx - 1 - (k % 2), j = nz - 1 - Math.floor(k / 2); if (covered[i][j]) continue; const tag = s.box([0.07, 0.045, 0.004], [px(i), y0 + h * 0.3, pz(j) + bw / 2 + 0.01], s.material('#f6f3ea')); tag.castShadow = false; }
    }
    if (a.state === 'museum') {
      const glass = new THREE.MeshStandardMaterial({ color: '#bfe3e6', roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false });
      const steel = s.material('#5e666b', { metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (!covered[i][j]) { const pane = s.box([sp - 0.03, 0.025, sp - 0.03], [px(i), yF - 0.012, pz(j)], glass); pane.castShadow = false; }
      for (let i = 0; i <= nx; i++) { let far = nz; for (let j = 0; j < nz; j++) if ((i < nx && !covered[i][j]) || (i > 0 && !covered[i - 1][j])) { far = j; break; } if (far < nz) s.box([0.03, 0.05, (nz - far) * sp], [-W / 2 + i * sp, yF - 0.03, D / 2 - (nz - far) * sp / 2], steel); }
      for (let j = 0; j <= nz; j++) { let far = nx; for (let i = 0; i < nx; i++) if ((j < nz && !covered[i][j]) || (j > 0 && !covered[i][j - 1])) { far = i; break; } if (far < nx) s.box([(nx - far) * sp, 0.05, 0.03], [W / 2 - (nx - far) * sp / 2, yF - 0.03, -D / 2 + j * sp], steel); }
      for (const [cx, cz] of [[W / 2, D / 2], [W / 2, -D / 2 + sp], [-W / 2 + sp, D / 2]]) s.box([0.04, yF, 0.04], [cx, yF / 2, cz], steel);
      s.rod([W / 2 + 0.22, 0, D / 2 - 0.3], [W / 2 + 0.22, 0.85, D / 2 - 0.3], 0.014, steel);
      s.cylinder(0.11, 0.13, 0.015, [W / 2 + 0.22, 0.008, D / 2 - 0.3], steel, 16);
      const card = s.label('HYPOCAVSTVM', 0.34, 0.2, [W / 2 + 0.22, 0.9, D / 2 - 0.3], '#2b2b2b', '#f4f1e8');
      card.rotation.set(-0.7, 0.5, 0, 'YXZ');
    }
    if (wear > 0.6 && a.state !== 'museum' && !firing) {
      const weeds: { at: P3; size: number; color: string }[] = [];
      for (let k = 0; k < wear * 30; k++) { const [x, y, z] = floorSpot(); for (let b = 0; b < 3; b++) weeds.push({ at: [x + (random() - 0.5) * 0.06, y + 0.03 + b * 0.03, z + (random() - 0.5) * 0.06], size: 0.03 + random() * 0.02, color: random() < 0.5 ? '#5f7d36' : '#7f8f3a' }); }
      s.scatter(new THREE.TetrahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1 }), weeds);
    }

    const pace = mix(0.4, 2.2, mood.energy);
    return s.finish({
      update: embers.length ? (_dt, time) => { for (const veil of embers) { const k = 1 + 0.25 * Math.sin(time * pace + veil.userData.phase); veil.scale.set(0.25 * k, h * 0.4 * (2 - k), 0.25 * k); } } : undefined,
    });
  },
});
