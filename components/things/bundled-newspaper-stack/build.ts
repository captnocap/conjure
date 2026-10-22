import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type Draw = (g: CanvasRenderingContext2D, w: number, h: number) => void;
function paint(w: number, h: number, draw: Draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const MASTHEADS = ['THE DAILY POST', 'EVENING NEWS', 'THE COURIER', 'SUNDAY HERALD', 'THE GAZETTE'];
const GLOSS = ['#c8372d', '#2f6fa8', '#e2a51e', '#3c8f5a', '#8a3f97', '#e86a8b', '#222a33'];

export default defineThing({
  questions: {
    height: score('How high have the columns grown?', ['Knee high, a few weeks of papers', 'Waist high', 'Chest high', 'Over head height, a wall of print']),
    columns: choice('How many columns stand together?', {
      single: 'One lone column by itself.',
      pair: 'Two columns side by side, leaning on each other.',
      row: 'A row of three or four against a wall.',
      block: 'A deep block two rows thick, a paper bastion.',
    }),
    decades: choice('How many decades does the stack go back?', {
      months: 'Only months: every paper still pale and legible, barely yellowed.',
      decade: 'About ten years: cream at the top, straw yellow at the bottom.',
      thirty: 'Thirty years: the bottom third gone amber and brittle.',
      lifetime: 'A lifetime: the lowest bundles are brown as tobacco and fused together.',
    }),
    print: choice('What is mostly in the bundles?', {
      broadsheet: 'Broadsheet newspapers, grey columns of small type under black mastheads.',
      tabloid: 'Tabloids with red-top mastheads and shouting headlines.',
      magazines: 'Glossy magazines, bright spines and cover colours showing at the edges.',
      mixed: 'Everything together: papers, magazines, free leaflets and catalogues.',
    }),
    binding: choice('What are the bundles tied with?', {
      twine: 'Hairy brown garden twine, knotted in a cross.',
      blue: 'Bright blue polypropylene baling cord.',
      red: 'Red and white butcher string, neat as a parcel.',
      loose: 'Nothing: loose piles that were never tied, edges fanning out.',
    }),
    slump: choice('How is the stack holding up?', {
      plumb: 'Every column squared and plumb, stacked with care.',
      leaning: 'One column has started to slump sideways, a slow lean.',
      spilled: 'One column has gone over: bundles and loose sheets slid across the floor.',
    }),
    pulled: choice('Is one paper pulled out and open?', {
      none: 'No, nothing has been touched in years.',
      top: 'Yes, one lies open on top of a column, mid-read.',
      floor: 'Yes, one lies open on the floor in front, pages spread.',
    }),
    resting: choice('What has been left on top?', {
      nothing: 'Nothing at all.',
      mug: 'A cold mug of tea.',
      glasses: 'A pair of reading glasses, folded.',
      scissors: 'Scissors and a few cut-out clippings.',
      plant: 'A small pot plant using the stack as a table.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const r = (lo: number, hi: number) => lo + (hi - lo) * random();

    // Shared textures: page edges seen side-on, and a handful of front pages.
    const edges = paint(64, 128, (g, w, h) => {
      g.fillStyle = '#f2efe6';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = `rgba(60,50,35,${0.12 + random() * 0.3})`;
        g.fillRect(0, y, w, 1);
      }
      for (let i = 0; i < 9; i++) {
        g.fillStyle = `rgba(40,34,26,${0.25 + random() * 0.3})`;
        g.fillRect(0, Math.floor(random() * h), w, 1 + Math.floor(random() * 2));
      }
    });
    edges.wrapS = edges.wrapT = THREE.RepeatWrapping;
    const glossEdges = paint(64, 128, (g, w, h) => {
      for (let y = 0; y < h; ) {
        const t = 3 + Math.floor(random() * 6);
        g.fillStyle = random() < 0.45 ? '#f4f1ea' : GLOSS[Math.floor(random() * GLOSS.length)];
        g.fillRect(0, y, w, t);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(0, y + t - 1, w, 1);
        y += t;
      }
    });
    const frontPage = (redTop: boolean, name: string) => paint(192, 256, (g, w, h) => {
      g.fillStyle = '#f1eee4';
      g.fillRect(0, 0, w, h);
      g.fillStyle = redTop ? '#c7241f' : '#f1eee4';
      g.fillRect(8, 8, w - 16, 36);
      g.fillStyle = redTop ? '#ffffff' : '#15130f';
      g.font = `bold ${redTop ? 22 : 20}px serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(name, w / 2, 27, w - 24);
      g.fillStyle = '#15130f';
      g.fillRect(8, 48, w - 16, 2);
      // Headline, a photograph and columns of grey type.
      const head = redTop ? 3 : 2;
      for (let i = 0; i < head; i++) g.fillRect(10, 58 + i * (redTop ? 20 : 13), (w - 20) * (i === head - 1 ? r(0.5, 0.8) : 1), redTop ? 15 : 9);
      const top = 58 + head * (redTop ? 20 : 13) + 6;
      g.fillStyle = '#6f6c66';
      g.fillRect(10, top, 84, 66);
      g.fillStyle = '#a9a59c';
      g.fillRect(22, top + 20, 30, 46);
      g.fillStyle = '#55524c';
      g.beginPath(); g.arc(37, top + 22, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(40,38,34,0.55)';
      for (let col = 0; col < 4; col++)
        for (let y = top; y < h - 10; y += 4) {
          if (col < 2 && y < top + 72) continue;
          g.fillRect(10 + col * 44, y, 38 * (random() < 0.12 ? 0.5 : 1), 2);
        }
    });
    const cover = (tint: string) => paint(128, 168, (g, w, h) => {
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.font = 'bold 30px sans-serif';
      g.textAlign = 'center';
      g.fillText(['HOME', 'LIFE', 'TV WEEK', 'GARDEN', 'WOMAN'][Math.floor(random() * 5)], w / 2, 36, w - 14);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath(); g.ellipse(w / 2, 104, 34, 44, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe14d';
      g.fillRect(6, h - 26, 60, 8); g.fillRect(6, h - 14, 44, 6);
    });
    const papers = [0, 1, 2].map((i) => frontPage(a.print === 'tabloid' || (a.print === 'mixed' && i === 1), MASTHEADS[Math.floor(random() * MASTHEADS.length)]));
    const covers = [0, 1, 2].map(() => cover(GLOSS[Math.floor(random() * GLOSS.length)]));

    const years = { months: 0.12, decade: 0.45, thirty: 0.75, lifetime: 1 }[a.decades];
    const fresh = new THREE.Color('#ebe7db'), straw = new THREE.Color('#d8c285'), tobacco = new THREE.Color('#8e6a3a');
    const aged = (age: number) => {
      const t = Math.min(1, Math.max(0, age));
      return t < 0.55 ? fresh.clone().lerp(straw, t / 0.55) : straw.clone().lerp(tobacco, (t - 0.55) / 0.45);
    };
    const cord = a.binding === 'loose' ? null
      : s.material({ twine: '#8a6a3c', blue: '#2f7fd6', red: '#c8362e' }[a.binding], { roughness: 0.9 });
    const unit = new THREE.BoxGeometry(1, 1, 1);

    const W = 0.31, D = 0.41;
    /** One tied bundle whose base centre sits at the group origin. */
    const bundle = (h: number, age: number, glossy: boolean) => {
      const group = new THREE.Group();
      const tint = aged(age + r(-0.06, 0.06));
      if (glossy) tint.lerp(new THREE.Color('#ffffff'), 0.55);
      const side = new THREE.MeshStandardMaterial({ map: glossy ? glossEdges : edges, color: tint, roughness: glossy ? 0.5 : 0.92 });
      const spine = new THREE.MeshStandardMaterial({ color: glossy ? tint : tint.clone().multiplyScalar(0.94), roughness: 0.9 });
      const face = new THREE.MeshStandardMaterial({ map: glossy ? covers[Math.floor(random() * 3)] : papers[Math.floor(random() * 3)], color: tint, roughness: glossy ? 0.4 : 0.9 });
      const w = glossy ? W * 0.82 : W, d = glossy ? D * 0.78 : D;
      const body = new THREE.Mesh(unit, [side, glossy ? side : spine, face, spine, side, side]);
      body.scale.set(w, h, d);
      body.position.y = h / 2;
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      if (a.binding === 'loose') {
        // Untied piles fan: a couple of skewed slabs break the square edge.
        for (let i = 0; i < 2; i++) {
          const slab = new THREE.Mesh(unit, [side, spine, face, spine, side, side]);
          slab.scale.set(w, h * 0.16, d);
          slab.position.set(r(-0.025, 0.025), h * (0.3 + i * 0.5), r(-0.03, 0.03));
          slab.rotation.y = r(-0.14, 0.14);
          slab.castShadow = true;
          group.add(slab);
        }
      } else if (cord) {
        const across = new THREE.Mesh(unit, cord), along = new THREE.Mesh(unit, cord);
        across.scale.set(0.011, h + 0.008, d + 0.01);
        across.position.set(r(-0.03, 0.03), h / 2, 0);
        along.scale.set(w + 0.01, h + 0.008, 0.011);
        along.position.set(0, h / 2, r(-0.04, 0.04));
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), cord);
        knot.position.set(across.position.x, h + 0.008, along.position.z);
        for (const part of [across, along, knot]) { part.castShadow = true; group.add(part); }
      }
      return { group, w, d };
    };

    const grid: [number, number][] = {
      single: [[0, 0]],
      pair: [[-0.5, 0], [0.5, 0]],
      row: random() < 0.5 ? [[-1, 0], [0, 0], [1, 0]] : [[-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0]],
      block: [[-1, -0.5], [0, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5], [1, 0.5]],
    }[a.columns] as [number, number][];
    if (a.columns !== 'single' && mood.density > 0.75 && a.columns !== 'block') grid.push([grid[grid.length - 1][0] + 1, 0]);
    const tall = mix(0.42, 1.85, a.height);
    const failing = a.slump === 'plumb' ? -1 : Math.floor(random() * grid.length) % grid.length;
    const sway = a.slump === 'plumb' ? 0 : (random() < 0.5 ? -1 : 1);
    const tops: { x: number; y: number; z: number }[] = [];
    const loose = s.material(aged(years * 0.5), { side: THREE.DoubleSide, map: papers[0] });

    grid.forEach(([gx, gz], index) => {
      const x0 = gx * (W + 0.045) + r(-0.012, 0.012), z0 = gz * (D + 0.04) + r(-0.015, 0.015);
      // Back rows stand taller so the block reads as terraces.
      let target = tall * r(0.72, 1.04) * (gz < 0 ? 1.08 : 1) * (index === failing && a.slump === 'spilled' ? 0.45 : 1);
      target = Math.max(0.2, target);
      let y = 0, level = 0, turn = r(-0.05, 0.05);
      const side = index === failing ? (grid.length > 1 && gx >= (grid[grid.length - 1][0] + grid[0][0]) / 2 ? 1 : grid.length > 1 ? -1 : sway) : 0;
      while (y < target) {
        const h = Math.min(r(0.09, 0.2), Math.max(0.07, target - y + 0.03));
        const glossy = a.print === 'magazines' ? random() < 0.85 : a.print === 'mixed' ? random() < 0.38 : random() < 0.05;
        const from = y / Math.max(tall, 0.5);
        const age = years * mix(1, 0.08, Math.min(1, from)) + mood.wear * 0.18;
        const made = bundle(glossy ? h * 0.7 : h, age, glossy);
        const lift = y / target;
        const lean = side * (a.slump === 'leaning' ? 0.3 : 0.07) * lift * lift * target;
        made.group.position.set(x0 + lean + r(-0.012, 0.012), y, z0 + r(-0.015, 0.015));
        turn += r(-0.07, 0.07);
        made.group.rotation.y = turn + (random() < 0.12 ? Math.PI : 0);
        made.group.rotation.z = -side * (a.slump === 'leaning' ? 0.16 : 0.03) * lift;
        s.root.add(made.group);
        y += glossy ? h * 0.7 : h;
        level++;
      }
      tops.push({ x: x0 + side * (a.slump === 'leaning' ? 0.3 : 0.07) * target, y, z: z0 });

      if (index === failing && a.slump === 'spilled') {
        // The fallen half: bundles tumbled outward and sheets fanned across the floor.
        const reach = side || sway;
        const edge = (reach > 0 ? Math.max(...grid.map((g) => g[0])) : Math.min(...grid.map((g) => g[0]))) * (W + 0.045);
        for (let i = 0; i < 4; i++) {
          const made = bundle(r(0.1, 0.17), years * r(0.2, 0.6), a.print === 'magazines');
          made.group.position.set(edge + reach * (0.3 + i * 0.2 + r(0, 0.08)), i === 3 ? 0.13 : 0, z0 + r(-0.12, 0.3));
          made.group.rotation.set(i === 1 ? r(-0.25, 0.25) : 0, r(-1.2, 1.2), i === 3 ? reach * -0.5 : r(-0.06, 0.06));
          s.root.add(made.group);
        }
        for (let i = 0; i < 9; i++) {
          const sheet = s.mesh(new THREE.PlaneGeometry(W, D), loose, [edge + reach * r(0.2, 1.05), 0.004 + i * 0.003, z0 + r(0.05, 0.55)]);
          sheet.rotation.set(-Math.PI / 2, 0, r(-1.6, 1.6));
        }
      }
    });

    // A paper pulled out and left open: two leaves hinged along the fold.
    if (a.pulled !== 'none') {
      const lowest = tops.reduce((best, top) => (top.y < best.y ? top : best), tops[0]);
      const open = new THREE.Group();
      const sheetMaterial = new THREE.MeshStandardMaterial({ map: papers[1], color: aged(years * 0.35), roughness: 0.9, side: THREE.DoubleSide });
      for (const half of [-1, 1]) {
        for (let layer = 0; layer < 3; layer++) {
          const leaf = new THREE.Mesh(new THREE.PlaneGeometry(W, D), sheetMaterial);
          leaf.rotation.x = -Math.PI / 2;
          const hinge = new THREE.Group();
          leaf.position.x = half * W / 2;
          hinge.rotation.z = half * (0.1 + layer * 0.09 + r(0, 0.05));
          hinge.position.y = layer * 0.002;
          leaf.castShadow = leaf.receiveShadow = true;
          hinge.add(leaf);
          open.add(hinge);
        }
      }
      if (a.pulled === 'top') open.position.set(lowest.x, lowest.y + 0.012, lowest.z + 0.03);
      else open.position.set(r(-0.15, 0.15), 0.006, Math.max(...grid.map((g) => g[1])) * (D + 0.04) + D / 2 + 0.3);
      open.rotation.y = r(-0.35, 0.35) + (a.pulled === 'top' ? Math.PI / 2 : 0);
      s.root.add(open);
    }

    // Whatever was set down on the tallest reachable column.
    if (a.resting !== 'nothing') {
      const candidates = tops.filter((top) => top.y < 1.7);
      const lowestY = Math.min(...tops.map((t) => t.y));
      const pool = (candidates.length ? candidates : tops).filter((top) => !(a.pulled === 'top' && top.y === lowestY && tops.length > 1));
      const at = (pool.length ? pool : tops)[Math.floor(random() * (pool.length || tops.length))];
      const lift = a.pulled === 'top' && tops.length === 1 ? 0.03 : 0.012;
      const table = new THREE.Group();
      table.position.set(at.x, at.y + lift, at.z);
      table.rotation.y = r(-0.6, 0.6);
      s.root.add(table);
      const put = (mesh: THREE.Mesh) => { mesh.removeFromParent(); table.add(mesh); return mesh; };
      if (a.resting === 'mug') {
        const china = s.material(mood.cheer > 0.5 ? '#d9573f' : '#e8e4d8', { roughness: 0.35 });
        put(s.cylinder(0.04, 0.035, 0.09, [0, 0.045, 0], china, 18));
        put(s.cylinder(0.034, 0.034, 0.004, [0, 0.082, 0], s.material('#5a3a22', { roughness: 0.3 }), 18));
        const handle = put(s.ring(0.026, 0.007, [0.045, 0.045, 0], china));
        handle.scale.set(1, 1, 1);
      } else if (a.resting === 'glasses') {
        const frame = s.material('#2a2622', { roughness: 0.4 });
        for (const x of [-0.032, 0.032]) put(s.ring(0.024, 0.003, [x, 0.03, 0.05], frame));
        put(s.rod([-0.008, 0.032, 0.05], [0.008, 0.032, 0.05], 0.003, frame));
        for (const x of [-0.056, 0.056]) put(s.rod([x, 0.032, 0.05], [x * 0.9, 0.004, -0.07], 0.0025, frame));
      } else if (a.resting === 'scissors') {
        const steel = s.material('#c9cdd0', { metalness: 0.8, roughness: 0.3 });
        const grip = s.material('#d1492f', { roughness: 0.5 });
        put(s.rod([-0.01, 0.006, 0.02], [0.12, 0.006, -0.03], 0.006, steel, 0.002));
        put(s.rod([-0.01, 0.006, -0.02], [0.12, 0.006, 0.03], 0.006, steel, 0.002));
        for (const z of [-0.035, 0.035]) put(s.ring(0.02, 0.006, [-0.035, 0.006, z], grip)).rotation.x = Math.PI / 2;
        for (let i = 0; i < 3; i++) {
          const clip = put(s.mesh(new THREE.PlaneGeometry(r(0.06, 0.11), r(0.05, 0.09)), loose, [r(-0.08, 0.05), 0.003 + i * 0.002, r(-0.13, 0.13)]));
          clip.rotation.set(-Math.PI / 2, 0, r(-1, 1));
        }
      } else {
        const clay = s.material('#b5633f');
        put(s.cylinder(0.055, 0.04, 0.08, [0, 0.04, 0], clay, 16));
        const leaf = s.material(mood.wear > 0.6 ? '#8c8448' : '#4f8a4a', { side: THREE.DoubleSide });
        for (let i = 0; i < 7; i++) {
          const angle = (i / 7) * Math.PI * 2 + r(-0.3, 0.3), reach = r(0.06, 0.12);
          put(s.rod([0, 0.08, 0], [Math.cos(angle) * reach, 0.1 + r(0.02, 0.12), Math.sin(angle) * reach], 0.004, leaf, 0.014));
        }
      }
    }

    return s.finish();
  },
});
