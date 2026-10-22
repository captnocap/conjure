import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, score } from '@conjure/kit';

type P = [number, number, number];
interface Inst { p: P; e: P; s: P; c: string }

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const PALETTES = {
  carbon: { body: ['#d8bb8e', '#c9a26a', '#b98f58'], cap: ['#c9792a', '#8a5a2a', '#d9c27a', '#2f66a8'] },
  film: { body: ['#3f7fc4', '#5a9bd8', '#2f66a8'], cap: ['#e3c21c', '#e4e4da', '#c0392b', '#1d1d20'] },
  vintage: { body: ['#5a3a22', '#7a4a2a', '#3a2a1c'], cap: ['#c9a53a', '#a8322a', '#6a6a3a', '#d8cfae'] },
  candy: { body: ['#e94e4e', '#3fb0e0', '#f0c020', '#58c070', '#b070d0'], cap: ['#f0c020', '#e94e4e', '#58c070', '#3fb0e0'] },
  ceramic: { body: ['#c9a26a', '#8fa7a0'], cap: ['#e07a2a', '#d95a1a', '#3a9a5a', '#2f7a48'] },
} as const;
const BANDS = ['#1a1a1a', '#7a3b1a', '#c8261e', '#e07a1a', '#e3c21c', '#2f8a48', '#2a5fb0', '#8a4ab0', '#8a8a8a', '#f2f2ee', '#c9a53a'];
const KNOBS = ['#1c1c1e', '#3a2418', '#e6dcc0', '#a8322a', '#22324a'];
const SPOOLS = { red: '#c0342c', blue: '#2a5fa8', green: '#2f7d4f', yellow: '#dba820', black: '#222226', grey: '#8d9396' } as const;

export default defineThing({
  questions: {
    container: choice('What are the parts sorted into?', {
      muffin6: 'A six-cup muffin tin, blackened from the oven.',
      muffin12: 'A big twelve-cup muffin tin.',
      egg: 'A grey pulp egg carton with the lid folded back.',
      lids: 'A scatter of jam-jar lids, one for each kind of part.',
      organiser: 'A plastic compartment box with square cells and its clear lid open.',
    }),
    sorting: score('How well sorted are they?', ['Perfectly: one kind and one colour per cup', 'Mostly sorted, a few strays', 'Roughly grouped', 'Hopelessly jumbled, every cup a mix']),
    colours: choice('What colours are the components?', {
      carbon: 'Beige and tan carbon resistors, brown and orange capacitors.',
      film: 'Blue metal-film resistors, yellow and red capacitors.',
      vintage: 'Dark brown dog-bone resistors and waxy mustard capacitors from old sets.',
      candy: 'A bright candy mix: red, blue, yellow, green, violet.',
      ceramic: 'Orange ceramic discs and green dipped drops.',
    }),
    state: choice('What is going on with the parts?', {
      tidy: 'Everything put away, nothing out of place.',
      sorting: 'Mid-sort: a heap of unsorted parts in front, tweezers laid beside it.',
      spilled: 'Knocked: a cup-full has skittered out across the bench.',
      raided: 'Raided: most cups scraped nearly empty, a few parts left in each.',
    }),
    spool: choice('What is the solder on?', {
      reel: 'A fat plastic one-pound reel.',
      cardboard: 'An old cardboard spool with a printed paper label.',
      tube: 'A little pocket dispenser tube with the wire poking out of the tip.',
      coil: 'No spool at all, just a hand-wound hank of wire.',
    }),
    spoolColour: choice('If the spool is plastic, what colour is it?', {
      red: 'Red.', blue: 'Blue.', green: 'Green.', yellow: 'Yellow.', black: 'Black.', grey: 'Grey.',
    }),
    left: score('How much solder is left?', ['A last few turns on a bare core', 'About half', 'A full fat reel']),
    tail: choice('What is the loose end of the solder doing?', {
      straight: 'Pulled out in a long straight length, ready to feed.',
      curl: 'Springing up in a loose curl.',
      tangle: 'Kinked into a bent tangle from being pulled about.',
    }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const pal = PALETTES[a.colours];
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];
    const solder = s.material('#d2d6d8', { metalness: 0.9, roughness: 0.22 });

    // ---- Cells.
    const grid = { muffin6: [3, 2, 0.086, 0.034, 0.032], muffin12: [4, 3, 0.082, 0.032, 0.03], egg: [6, 2, 0.05, 0.021, 0.034], lids: [3, 2, 0.1, 0.036, 0.011], organiser: [4, 3, 0.062, 0.027, 0.03] }[a.container];
    const [cols, rows, pitch, cr, depth] = grid;
    const W = cols * pitch + 0.02, D = rows * pitch + 0.02;
    const cells: { x: number; z: number }[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const jitter = a.container === 'lids' ? 0.022 : 0;
      cells.push({ x: (c - (cols - 1) / 2) * pitch + (random() - 0.5) * jitter, z: (r - (rows - 1) / 2) * pitch + (random() - 0.5) * jitter });
    }
    let floorY = 0.003;
    if (a.container === 'muffin6' || a.container === 'muffin12' || a.container === 'egg') {
      const egg = a.container === 'egg';
      const mat = egg ? s.material('#a7a59c', { roughness: 1, side: THREE.DoubleSide }) : s.material(mix(0.25, 0.1, mood.wear) > 0.17 ? '#4d5154' : '#33302c', { metalness: 0.65, roughness: 0.45, side: THREE.DoubleSide });
      const plate = new THREE.Shape();
      const hw = W / 2, hd = D / 2, rr = 0.012;
      plate.moveTo(-hw + rr, -hd); plate.lineTo(hw - rr, -hd); plate.quadraticCurveTo(hw, -hd, hw, -hd + rr); plate.lineTo(hw, hd - rr); plate.quadraticCurveTo(hw, hd, hw - rr, hd);
      plate.lineTo(-hw + rr, hd); plate.quadraticCurveTo(-hw, hd, -hw, hd - rr); plate.lineTo(-hw, -hd + rr); plate.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
      for (const cell of cells) { const hole = new THREE.Path(); hole.absarc(cell.x, cell.z, cr, 0, Math.PI * 2, true); plate.holes.push(hole); }
      const top = s.mesh(new THREE.ExtrudeGeometry(plate, { depth: 0.002, bevelEnabled: false, curveSegments: 20 }), mat, [0, depth + 0.004, 0]);
      top.rotation.x = Math.PI / 2;
      const cup = new THREE.LatheGeometry([[0.0001, 0], [cr * 0.74, 0], [cr, depth]].map(([x, y]) => new THREE.Vector2(x, y)), 22);
      s.scatter(cup, mat, cells.map((cell) => ({ at: [cell.x, 0.002, cell.z] as P, size: 1 })));
      floorY = 0.003;
      if (egg) {
        // Pulp peaks between the cups and the lid folded back behind.
        const peaks = [];
        for (let c = 0; c < cols - 1; c++) peaks.push({ at: [(c - (cols - 2) / 2) * pitch, depth, 0] as P, size: 1 });
        s.scatter(new THREE.ConeGeometry(0.012, 0.03, 8), mat, peaks);
        const lid = s.box([W, 0.004, D], [0, 0.03, -D - 0.012], mat);
        lid.rotation.x = 0.28;
        s.label('12 LARGE', W * 0.5, 0.03, [0, 0.036, -D - 0.012], '#3b6aa0', '#d9d6c8').rotation.x = -Math.PI / 2 + 0.28;
      } else {
        for (const side of [-1, 1]) s.box([0.012, 0.003, D * 0.5], [side * (W / 2 + 0.004), depth + 0.004, 0], mat);
      }
    } else if (a.container === 'lids') {
      const lidGeo = new THREE.LatheGeometry([[0.0001, 0.001], [cr + 0.004, 0.001], [cr + 0.006, depth], [cr + 0.004, depth], [cr + 0.002, 0.003], [0.0001, 0.003]].map(([x, y]) => new THREE.Vector2(x, y)), 26);
      const lidColours = ['#c9a53a', '#b23a32', '#d9d9d2', '#2f5f4a', '#c9a53a', '#e6dcc0'];
      s.scatter(lidGeo, s.material('#ffffff', { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide }), cells.map((cell, i) => ({ at: [cell.x, 0, cell.z] as P, size: 1, color: lidColours[i % 6] })));
      floorY = 0.004;
    } else {
      const plastic = s.material(mood.cheer > 0.5 ? '#e0a020' : '#3f6fa8', { roughness: 0.45 });
      s.box([W, 0.003, D], [0, 0.0015, 0], plastic);
      for (let i = 0; i <= cols; i++) s.box([0.002, depth, D], [-W / 2 + 0.01 + i * pitch - (i === 0 ? 0.009 : i === cols ? -0.009 : 0), depth / 2, 0], plastic);
      for (let i = 0; i <= rows; i++) s.box([W, depth, 0.002], [0, depth / 2, -D / 2 + 0.01 + i * pitch - (i === 0 ? 0.009 : i === rows ? -0.009 : 0)], plastic);
      const lid = s.box([W, 0.003, D], [0, depth + D * 0.47, -D / 2 - D * 0.17], new THREE.MeshStandardMaterial({ color: '#dfeaf0', transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false }));
      lid.rotation.x = -1.25;
      for (const x of [-W * 0.3, W * 0.3]) s.cylinder(0.004, 0.004, 0.03, [x, depth, -D / 2 - 0.002], plastic, 8).rotation.z = Math.PI / 2;
    }

    // ---- Components, batched by shape.
    const lists: Record<'body' | 'lead' | 'band' | 'disc' | 'can' | 'knob' | 'film', Inst[]> = { body: [], lead: [], band: [], disc: [], can: [], knob: [], film: [] };
    const kinds = ['resistor', 'disc', 'can', 'knob', 'film', 'resistor'] as const;
    type Kind = (typeof kinds)[number];
    const up = new THREE.Vector3(0, 1, 0);
    const drop = (kind: Kind, colour: string, x: number, y: number, z: number) => {
      const yaw = random() * Math.PI * 2;
      if (kind === 'resistor') {
        const e: P = [0, yaw, Math.PI / 2 + (random() - 0.5) * 0.5];
        const axis = up.clone().applyEuler(new THREE.Euler(...e));
        lists.body.push({ p: [x, y, z], e, s: [1, 1, 1], c: colour });
        lists.lead.push({ p: [x, y, z], e, s: [1, 1, 1], c: '#c9cdd0' });
        for (let i = 0; i < 4; i++) { const o = (i - 1.5) * 0.0052 + (i === 3 ? 0.0018 : 0); lists.band.push({ p: [x + axis.x * o, y + axis.y * o, z + axis.z * o], e, s: [1, 1, 1], c: i === 3 ? '#c9a53a' : pick(BANDS) }); }
      } else if (kind === 'disc') {
        lists.disc.push({ p: [x, y, z], e: [random() * 1.2, yaw, random() * 1.2], s: [1, 0.32, 1], c: colour });
        lists.lead.push({ p: [x, y, z], e: [0, yaw, Math.PI / 2 + 0.3], s: [1, 0.7, 1], c: '#c9cdd0' });
      } else if (kind === 'can') {
        const lying = random() < 0.6;
        lists.can.push({ p: [x, y + (lying ? 0 : 0.004), z], e: lying ? [0, yaw, Math.PI / 2] : [0, yaw, 0], s: [1, 0.8 + random() * 0.6, 1], c: colour });
      } else if (kind === 'knob') {
        lists.knob.push({ p: [x, y + 0.003, z], e: [(random() - 0.5) * 0.9, yaw, (random() - 0.5) * 0.9], s: [1, 1, 1], c: pick(KNOBS) });
      } else lists.film.push({ p: [x, y + 0.002, z], e: [random() * 0.6, yaw, random() * 1.5], s: [1, 1, 1], c: colour });
    };
    const order = cells.map((_c, i) => i).sort(() => random() - 0.5);
    const spilledCell = a.state === 'spilled' ? order[0] : -1;
    cells.forEach((cell, i) => {
      const cupKind = kinds[i % kinds.length];
      const cupColour = cupKind === 'resistor' ? pal.body[Math.floor(i / 2) % pal.body.length] : pal.cap[i % pal.cap.length];
      let count = Math.round(mix(8, 17, mood.density) * (cupKind === 'knob' ? 0.4 : 1) * (cr / 0.034) * mix(0.7, 1.2, random()));
      if (a.state === 'raided') count = Math.floor(count * (random() < 0.3 ? 0.5 : 0.12));
      if (i === spilledCell) count = Math.floor(count * 0.2);
      for (let n = 0; n < count; n++) {
        const stray = random() < a.sorting * 0.85;
        const kind = stray ? pick(kinds) : cupKind;
        const colour = stray ? (kind === 'resistor' ? pick(pal.body) : pick(pal.cap)) : cupColour;
        const t = random() * 6.28, r = Math.sqrt(random()) * cr * 0.66;
        drop(kind, colour, cell.x + Math.cos(t) * r, floorY + 0.005 + (n / count) * depth * 0.72, cell.z + Math.sin(t) * r);
      }
    });
    // Parts out on the bench in front.
    const fz = D / 2 + 0.055;
    if (a.state === 'sorting') {
      for (let n = 0; n < 34 + mood.density * 30; n++) {
        const kind = pick(kinds), t = random() * 6.28, r = Math.sqrt(random()) * 0.045;
        drop(kind, kind === 'resistor' ? pick(pal.body) : pick(pal.cap), W * 0.12 + Math.cos(t) * r, 0.004 + (1 - r / 0.045) * 0.014 * random(), fz + Math.sin(t) * r * 0.7);
      }
      const steel = s.material('#b9bec0', { metalness: 0.85, roughness: 0.25 });
      const tw = new Sculpture(context);
      tw.rod([0, 0.003, 0], [0.11, 0.004, 0.006], 0.0006, steel, 0.0028);
      tw.rod([0, 0.003, 0], [0.11, 0.004, -0.006], 0.0006, steel, 0.0028);
      tw.root.position.set(W * 0.12 - 0.13, 0, fz + 0.03);
      tw.root.rotation.y = 0.5 + random() * 0.4;
      s.root.add(tw.root);
    } else if (a.state === 'spilled') {
      const cell = cells[spilledCell];
      const kind = kinds[spilledCell % kinds.length];
      const colour = kind === 'resistor' ? pal.body[Math.floor(spilledCell / 2) % pal.body.length] : pal.cap[spilledCell % pal.cap.length];
      for (let n = 0; n < 26; n++) {
        const along = random();
        drop(kind, colour, cell.x * 0.6 + (random() - 0.5) * (0.05 + along * 0.16), 0.004, D / 2 + 0.015 + along * 0.1);
      }
    }
    const strays = Math.floor(mood.density * 6 + mood.wear * 4);
    for (let n = 0; n < strays; n++) { const kind = pick(kinds); drop(kind, kind === 'resistor' ? pick(pal.body) : pick(pal.cap), (random() - 0.5) * (W + 0.1), 0.004, (random() < 0.5 ? -1 : 1) * (D / 2 + 0.02 + random() * 0.03)); }

    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    const batch = (geometry: THREE.BufferGeometry, material: THREE.Material, list: Inst[]) => {
      if (!list.length) { geometry.dispose(); material.dispose(); return; }
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      list.forEach((item, i) => {
        dummy.position.set(...item.p); dummy.rotation.set(...item.e); dummy.scale.set(...item.s); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, tint.set(item.c));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
    };
    const white = () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
    batch(new THREE.CapsuleGeometry(0.005, 0.016, 3, 8), white(), lists.body);
    batch(new THREE.CylinderGeometry(0.0007, 0.0007, 0.052, 4), new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.8, roughness: 0.3 }), lists.lead);
    batch(new THREE.CylinderGeometry(0.0053, 0.0053, 0.0024, 8), white(), lists.band);
    batch(new THREE.SphereGeometry(0.011, 10, 6), white(), lists.disc);
    batch(new THREE.CylinderGeometry(0.008, 0.008, 0.022, 10), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.3 }), lists.can);
    batch(new THREE.CylinderGeometry(0.012, 0.015, 0.014, 14), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 }), lists.knob);
    batch(new THREE.BoxGeometry(0.02, 0.014, 0.008), white(), lists.film);

    // ---- The solder.
    const sx = -W / 2 - 0.07, sz = 0.02 + (random() - 0.5) * 0.03;
    let start: P = [sx, 0.02, sz];
    const wound = mix(0.018, 0.045, a.left);
    if (a.spool === 'reel' || a.spool === 'cardboard') {
      const card = a.spool === 'cardboard';
      const flange = card ? s.material('#b3905c', { roughness: 0.9 }) : s.material(SPOOLS[a.spoolColour], { roughness: 0.35 });
      const R = 0.05, H = 0.056;
      s.cylinder(R, R, 0.004, [sx, 0.002, sz], flange, 30);
      s.cylinder(R, R, 0.004, [sx, H - 0.002, sz], flange, 30);
      s.cylinder(0.014, 0.014, H, [sx, H / 2, sz], flange, 16);
      s.cylinder(wound, wound, H - 0.01, [sx, H / 2, sz], solder, 30);
      for (let i = 0; i < 9; i++) s.ring(wound, 0.0022, [sx, 0.008 + i * 0.005, sz], solder).rotation.x = Math.PI / 2;
      const label = paint(256, 256, (ctx) => {
        ctx.fillStyle = card ? '#ead9a8' : '#f2efe4'; ctx.beginPath(); ctx.arc(128, 128, 128, 0, 7); ctx.fill();
        ctx.strokeStyle = card ? '#a8322a' : SPOOLS[a.spoolColour]; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(128, 128, 108, 0, 7); ctx.stroke();
        ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.font = 'bold 44px monospace'; ctx.fillText('60/40', 128, 96);
        ctx.font = 'bold 24px monospace'; ctx.fillText('ROSIN CORE', 128, 176); ctx.fillText('SOLDER', 128, 204);
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(128, 128, 22, 0, 7); ctx.fill();
      });
      const disc = s.mesh(new THREE.CircleGeometry(R * 0.9, 30), new THREE.MeshStandardMaterial({ map: label, roughness: 0.85 }), [sx, H + 0.0006, sz]);
      disc.rotation.set(-Math.PI / 2, 0, random() * 6);
      start = [sx + wound * 0.7, 0.02, sz + wound * 0.7];
    } else if (a.spool === 'tube') {
      const tube = new Sculpture(context);
      tube.cylinder(0.011, 0.011, 0.085, [0, 0.011, 0], new THREE.MeshStandardMaterial({ color: '#cfe4ee', transparent: true, opacity: 0.45, roughness: 0.1 }), 16).rotation.z = Math.PI / 2;
      tube.cylinder(0.008 * (0.5 + a.left * 0.5), 0.008 * (0.5 + a.left * 0.5), 0.07 * mix(0.3, 1, a.left), [-0.005, 0.011, 0], solder, 12).rotation.z = Math.PI / 2;
      tube.cylinder(0.0115, 0.0115, 0.012, [-0.045, 0.011, 0], s.material(SPOOLS[a.spoolColour]), 16).rotation.z = Math.PI / 2;
      tube.cylinder(0.003, 0.011, 0.02, [0.052, 0.011, 0], s.material(SPOOLS[a.spoolColour]), 16).rotation.z = -Math.PI / 2;
      tube.root.position.set(sx, 0, sz);
      tube.root.rotation.y = -0.9;
      s.root.add(tube.root);
      start = [sx + Math.cos(0.9) * 0.062, 0.011, sz + Math.sin(0.9) * 0.062];
    } else {
      const turns = Math.round(mix(3, 9, a.left));
      for (let i = 0; i < turns; i++) { const ring = s.ring(0.036 + (random() - 0.5) * 0.004, 0.002, [sx + (random() - 0.5) * 0.003, 0.002 + i * 0.0034, sz + (random() - 0.5) * 0.003], solder); ring.rotation.set(Math.PI / 2 + (random() - 0.5) * 0.1, 0, 0); }
      start = [sx + 0.021, 0.004 + turns * 0.002, sz + 0.021];
    }
    const [x0, y0, z0] = start;
    const end: P[] = a.tail === 'straight'
      ? [[x0 + 0.03, 0.006, z0 + 0.03], [x0 + 0.08, 0.002, z0 + 0.065], [x0 + 0.15, 0.002, z0 + 0.085]]
      : a.tail === 'curl'
        ? [[x0 + 0.025, 0.012, z0 + 0.03], [x0 + 0.05, 0.03, z0 + 0.06], [x0 + 0.045, 0.055, z0 + 0.075], [x0 + 0.025, 0.05, z0 + 0.07], [x0 + 0.03, 0.035, z0 + 0.085]]
        : [[x0 + 0.03, 0.004, z0 + 0.02], [x0 + 0.02, 0.02, z0 + 0.06], [x0 + 0.06, 0.003, z0 + 0.05], [x0 + 0.05, 0.025, z0 + 0.09], [x0 + 0.01, 0.003, z0 + 0.085], [x0 + 0.07, 0.003, z0 + 0.11]];
    s.tube([[x0, y0, z0], ...end], 0.002, solder);
    // Snipped offcuts.
    const bits = [];
    for (let i = 0; i < 2 + Math.floor(mood.density * 6); i++) bits.push({ at: [sx + (random() - 0.3) * 0.12, 0.0015, sz + 0.06 + random() * 0.07] as P, size: 0.6 + random() });
    s.scatter(new THREE.CapsuleGeometry(0.0016, 0.012, 2, 5).rotateZ(Math.PI / 2), solder, bits);

    return s.finish();
  },
});
