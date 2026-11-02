import * as THREE from 'three';
import { Sculpture, choice, defineThing, mix, noul, score } from '@conjure/kit';

const CODES = {
  red: 'Red paint, the line into the old business district.',
  blue: 'Blue paint, a western suburb line.',
  yellow: 'Yellow paint, bright as turmeric.',
  green: 'Green paint, a harbour line group.',
  white: 'White paint on dull steel, hard to read.',
  mixed: 'Every colour at once: a sorting crate where all the lines meet.',
} as const;
const CODE_HEX = { red: '#d5332a', blue: '#2f6fd0', yellow: '#f0c020', green: '#2f9a55', white: '#f4f1e8' } as const;

type V3 = [number, number, number];
interface Inst { p: V3; s?: V3; r?: V3; c?: THREE.ColorRepresentation }

export default defineThing({
  questions: {
    count: score('How many tiffins are in the crate?', ['A handful rattling at one end', 'A dozen', 'Two dozen', 'Packed tight, three dozen shoulder to shoulder']),
    tiffin: choice('What do the tiffins look like?', {
      steel: 'Bare stacked stainless tiers held by a clip and a carrying loop.',
      canister: 'Tall dull aluminium canisters with a wire bail handle hiding the tiers inside.',
      bags: 'Each one zipped into a bright cloth lunch bag with a strap.',
      mixed: 'A mix of bare steel, canisters and cloth bags, every household different.',
    }),
    colour: choice('What colour are the codes painted on the lids?', CODES),
    mark: choice('What kind of mark is the code?', {
      letters: 'Letters and numbers in three lines, station, building and floor.',
      cross: 'A bold painted cross.',
      dot: 'A fat dot inside a ring.',
      stripe: 'Two brush stripes and a dash.',
    }),
    rest: choice('What is the crate resting on?', {
      ground: 'Flat on the platform on its two runners.',
      trestle: 'Raised on a pair of wooden trestles for sorting.',
      handcart: 'Loaded across a two-wheeled wooden handcart ready to push.',
    }),
    stray: choice('Is one tiffin separated from the rest?', {
      none: 'No, every tiffin is in its row.',
      apart: 'One tiffin stands alone on the ground a step away, with a code that matches nothing else.',
      opened: 'One has been opened beside the crate, its tiers laid out with rice, dal and rotis.',
      fallen: 'One has fallen and burst, lid rolled away and rice spilt.',
    }),
    cap: choice('What has been left on top of the load?', {
      cap: 'A white Gandhi cap.',
      'cap-towel': 'A white cap and a folded checked towel.',
      nothing: 'Nothing, the carrier has taken his cap with him.',
    }),
    hooks: noul('Are extra tiffin bags hung from the iron bicycle hooks at the end?'),
    tiers: choice('If the tiffins are stacked steel, how many tiers do they have?', { varied: 'A mix of three and four tiers.', short: 'Three-tier lunch carriers.', tall: 'Five-tier family carriers.', paired: 'Compact two-tier carriers.' }),
    sideSlats: choice('What slats run along the crate sides?', { open: 'The original widely spaced rails.', third: 'An extra middle rail.', diagonal: 'Diagonal braces crossing each long side.', mesh: 'A light rectangular wire grid between the rails.' }),
    carryingGrip: choice('How are the carrying pole ends gripped?', { bare: 'Bare wooden poles.', rope: 'Rope wound around the ends.', rubber: 'Black rubber sleeves.', cloth: 'Red cloth pads tied around the ends.' }),
    cornerGuards: choice('What protects the crate corners?', { plain: 'Small original iron plates.', angles: 'Tall iron angle guards.', brass: 'Brass corner strips.', bolts: 'Heavy bolted iron strips.' }),
    routingTag: choice('How is this batch identified?', { none: 'Only the marks on individual tiffins.', slate: 'A little chalk routing slate tied to the crate.', card: 'A large cream destination card.', numbers: 'Two small numbered enamel plates.' }),
    sortingKit: choice('What sorting tools wait beside the crate?', { none: 'No extra kit.', chalk: 'A chalk box and cloth on a small wooden block.', ledger: 'A closed ledger and pencil on a low sorting board.', cord: 'A spool of cord and two bundled straps on a board.' }),
  },

  build(a, context) {
    const s = new Sculpture(context);
    const { mood, random } = context;
    const rnd = (lo: number, hi: number) => mix(lo, hi, random());
    const pick = <T,>(list: readonly T[]) => list[Math.floor(random() * list.length)];

    const L = 1.76, Wd = 0.58;
    let y0 = { ground: 0.085, trestle: 0.6, handcart: 0.74 }[a.rest];

    const wood = s.material('#a07a4c', { roughness: 0.85 });
    const darkWood = s.material('#6b4f31', { roughness: 0.9 });
    const iron = s.material('#3b3a38', { metalness: 0.6, roughness: 0.55 });
    const steelColour = new THREE.Color('#d4d8d8').lerp(new THREE.Color('#8e8f8a'), mood.wear * 0.7);
    const steel = new THREE.MeshStandardMaterial({ color: steelColour, metalness: 0.85, roughness: mix(0.22, 0.5, mood.wear) });
    const alu = new THREE.MeshStandardMaterial({ color: new THREE.Color('#b9bcb8').lerp(new THREE.Color('#84847e'), mood.wear * 0.6), metalness: 0.55, roughness: 0.55 });
    const cloth = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const white = s.material('#f3f1ea', { roughness: 0.9 });
    const rope = s.material('#b89a62', { roughness: 1 });

    const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, list: readonly Inst[]) => {
      if (!list.length) { geometry.dispose(); return null; }
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      list.forEach((it, i) => {
        q.setFromEuler(e.set(...(it.r ?? [0, 0, 0])));
        mesh.setMatrixAt(i, m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...(it.s ?? [1, 1, 1]))));
        if (it.c !== undefined) mesh.setColorAt(i, new THREE.Color(it.c));
      });
      mesh.castShadow = mesh.receiveShadow = true;
      s.root.add(mesh);
      return mesh;
    };

    // ---- the crate: a long slatted tray with carrying poles ----------------
    s.box([L, 0.03, Wd], [0, y0 - 0.015, 0], wood);
    for (let i = 0; i < 5; i++) s.box([L, 0.004, 0.006], [0, y0 + 0.001, -Wd / 2 + (i + 0.5) * Wd / 5 + 0.05], darkWood);
    for (const z of [-1, 1]) {
      s.box([L, 0.07, 0.022], [0, y0 + 0.045, z * (Wd / 2 - 0.011)], wood);
      s.box([L, 0.04, 0.022], [0, y0 + 0.19, z * (Wd / 2 - 0.011)], wood);
      for (let i = 0; i <= 8; i++) s.box([0.035, 0.21, 0.026], [-L / 2 + 0.02 + i * (L - 0.04) / 8, y0 + 0.105, z * (Wd / 2 - 0.009)], darkWood);
      // The carrying poles run past both ends so two men can lift it to their heads.
      s.rod([-L / 2 - 0.24, y0 + 0.01, z * (Wd / 2 + 0.03)], [L / 2 + 0.24, y0 + 0.01, z * (Wd / 2 + 0.03)], 0.024, darkWood);
    }
    for (const x of [-1, 1]) {
      s.box([0.024, 0.21, Wd], [x * (L / 2 - 0.012), y0 + 0.105, 0], wood);
      for (const z of [-1, 1]) s.box([0.05, 0.012, 0.05], [x * (L / 2 - 0.02), y0 + 0.2, z * (Wd / 2 - 0.02)], iron);
    }
    if (a.rest === 'ground') {
      for (const x of [-0.52, 0.52]) s.box([0.07, 0.055, Wd + 0.1], [x, 0.0275, 0], darkWood);
    } else if (a.rest === 'trestle') {
      for (const x of [-0.55, 0.55]) {
        s.box([0.08, 0.05, Wd + 0.24], [x, y0 - 0.055, 0], darkWood);
        for (const z of [-1, 1]) {
          s.rod([x, y0 - 0.08, z * 0.3], [x - 0.16, 0, z * 0.38], 0.022, wood);
          s.rod([x, y0 - 0.08, z * 0.3], [x + 0.16, 0, z * 0.38], 0.022, wood);
        }
        s.rod([x - 0.09, 0.26, -0.34], [x - 0.09, 0.26, 0.34], 0.014, wood);
      }
    } else {
      s.box([1.2, 0.05, Wd + 0.16], [0, y0 - 0.055, 0], darkWood);
      s.rod([0, 0.42, -Wd / 2 - 0.16], [0, 0.42, Wd / 2 + 0.16], 0.02, iron);
      for (const z of [-1, 1]) {
        const zz = z * (Wd / 2 + 0.16);
        s.ring(0.4, 0.028, [0, 0.42, zz], darkWood);
        s.ring(0.42, 0.012, [0, 0.42, zz], iron);
        for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; s.rod([0, 0.42, zz], [Math.cos(t) * 0.4, 0.42 + Math.sin(t) * 0.4, zz], 0.012, wood); }
        s.cylinder(0.05, 0.05, 0.07, [0, 0.42, zz], darkWood, 10).rotation.x = Math.PI / 2;
        s.box([0.05, 0.24, 0.05], [0, y0 - 0.2, z * (Wd / 2 - 0.04)], darkWood);
      }
      s.box([0.05, y0 - 0.08, 0.05], [0.55, (y0 - 0.08) / 2, 0], darkWood);
      for (const z of [-1, 1]) s.rod([-0.55, y0 - 0.06, z * 0.2], [-1.3, y0 + 0.08, z * 0.2], 0.02, wood);
      s.rod([-1.3, y0 + 0.08, -0.24], [-1.3, y0 + 0.08, 0.24], 0.02, wood);
    }

    const carrier=new THREE.Group();carrier.name='grounded-tiffin-carrier';carrier.add(...s.root.children);s.root.add(carrier);carrier.updateWorldMatrix(true,true);const carrierLift=-new THREE.Box3().setFromObject(carrier,true).min.y;carrier.position.y+=carrierLift;y0+=carrierLift;

    // ---- painted code lids -------------------------------------------------
    const palette = Object.values(CODE_HEX);
    const mainHex = a.colour === 'mixed' ? null : CODE_HEX[a.colour];
    const lidTextures: THREE.CanvasTexture[] = [];
    const letters = 'ABEKMNPRSVX';
    const lidTexture = (hex: string, second: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 96;
      const ctx = canvas.getContext('2d')!;
      const shade = Math.round(mix(238, 190, mood.wear));
      ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 3})`;
      ctx.fillRect(0, 0, 96, 96);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
      for (const r of [44, 30, 14]) { ctx.beginPath(); ctx.arc(48, 48, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = hex; ctx.strokeStyle = hex; ctx.lineCap = 'round';
      ctx.translate(48, 48); ctx.rotate(rnd(-0.5, 0.5));
      if (a.mark === 'letters') {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(pick([...letters]) + pick([...letters]), 0, -22);
        ctx.fillStyle = second;
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(String(1 + Math.floor(random() * 14)), 0, 6);
        ctx.fillStyle = hex;
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(pick([...letters]) + ' ' + (1 + Math.floor(random() * 9)), 0, 32);
      } else if (a.mark === 'cross') {
        ctx.lineWidth = 20;
        ctx.beginPath(); ctx.moveTo(-28, -28); ctx.lineTo(28, 28); ctx.moveTo(28, -28); ctx.lineTo(-28, 28); ctx.stroke();
      } else if (a.mark === 'dot') {
        ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 12; ctx.strokeStyle = second; ctx.beginPath(); ctx.arc(0, 0, 31, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.lineWidth = 17;
        ctx.beginPath(); ctx.moveTo(-32, -18); ctx.lineTo(32, -18); ctx.stroke();
        ctx.strokeStyle = second; ctx.beginPath(); ctx.moveTo(-32, 6); ctx.lineTo(32, 6); ctx.stroke();
        ctx.strokeStyle = hex; ctx.beginPath(); ctx.moveTo(-10, 30); ctx.lineTo(12, 30); ctx.stroke();
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      lidTextures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, metalness: 0.1, roughness: 0.6 });
    };
    const lidMaterials = Array.from({ length: 6 }, (_u, i) => {
      const hex = mainHex ?? palette[i % palette.length];
      return lidTexture(hex, mainHex && a.colour !== 'white' ? pick(['#1d1d1d', '#f4f1e8', hex]) : pick(palette));
    });
    const strayLid = lidTexture(a.colour === 'red' ? '#2f6fd0' : '#d5332a', '#1d1d1d');
    const lidLists: Inst[][] = lidMaterials.map(() => []);

    // ---- the tiffins -------------------------------------------------------
    const R = 0.074, pitch = 0.165, cols = 10, rows = 3;
    const bodies: Inst[] = [], grooves: Inst[] = [], clips: Inst[] = [], loops: Inst[] = [], cans: Inst[] = [], canLids: Inst[] = [], bails: Inst[] = [], bags: Inst[] = [], straps: Inst[] = [];
    const bagColours = mood.cheer > 0.5 ? ['#d8402f', '#2f7fc8', '#e9a820', '#3c9a5c', '#c2479a', '#ef7a2a'] : ['#7c3b34', '#3c5878', '#8a7240', '#4c6a55', '#5a5560', '#6e6258'];
    const kinds = ['steel', 'canister', 'bags'] as const;
    const addTiffin = (x: number, y: number, z: number, lean: V3 = [0, 0, 0], lidList: Inst[] | null = pick(lidLists)) => {
      const kind = a.tiffin === 'mixed' ? pick(kinds) : a.tiffin;
      const turn = random() * Math.PI * 2;
      let top = 0;
      if (kind === 'steel') {
        const tiers = a.tiers==='short'?3:a.tiers==='tall'?5:a.tiers==='paired'?2:random()<.55?4:3,h=tiers*.068;
        bodies.push({ p: [x, y + h / 2, z], s: [1, h, 1], r: lean });
        for (let t = 1; t < tiers; t++) grooves.push({ p: [x, y + t * 0.068, z], r: [Math.PI / 2, 0, 0] });
        for (const side of [-1, 1]) clips.push({ p: [x + Math.cos(turn) * side * (R + 0.006), y + h / 2 + 0.01, z + Math.sin(turn) * side * (R + 0.006)], s: [1, h - 0.01, 1], r: [0, -turn, 0] });
        loops.push({ p: [x, y + h + 0.012, z], r: [0, -turn, 0] });
        top = h + 0.014;
      } else if (kind === 'canister') {
        const h = rnd(0.25, 0.31);
        cans.push({ p: [x, y + h / 2, z], s: [1, h, 1] });
        canLids.push({ p: [x, y + h, z] });
        bails.push({ p: [x, y + h - 0.01, z], r: [0, -turn, 0] });
        top = h + 0.028;
      } else {
        const h = rnd(0.24, 0.3);
        bags.push({ p: [x, y + h / 2, z], s: [1, h, 1], r: [0, turn, 0], c: pick(bagColours) });
        straps.push({ p: [x, y + h - 0.005, z], r: [0, turn, 0], c: '#2b2b2b' });
        if (lidList) lidList.push({ p: [x, y + h + 0.003, z], r: [-Math.PI / 2, 0, turn], s: [0.8, 0.8, 0.8] });
        return h + 0.07;
      }
      if (lidList) lidList.push({ p: [x, y + top + 0.002, z], r: [-Math.PI / 2, 0, turn] });
      return top;
    };

    const want = Math.round(mix(5, cols * rows, a.count));
    const order: number[] = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) order.push(c * rows + r);
    // Sparse crates keep their load at one end with a few gaps; full crates are solid.
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.max(0, i - Math.floor(random() * 4));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const tops: { x: number; z: number; y: number }[] = [];
    for (const index of order.slice(0, want)) {
      const c = Math.floor(index / rows), r = index % rows;
      const x = -L / 2 + 0.135 + c * pitch + rnd(-0.006, 0.006), z = (r - 1) * pitch + rnd(-0.006, 0.006);
      const h = addTiffin(x, y0, z);
      tops.push({ x, z, y: y0 + h });
    }

    // ---- the stray ---------------------------------------------------------
    const sx = 0.35 + rnd(-0.2, 0.25), sz = Wd / 2 + 0.36;
    if (a.stray === 'apart') {
      const strayList: Inst[] = [];
      addTiffin(sx, 0, sz, [0, 0, 0], strayList);
      instanced(new THREE.CircleGeometry(R * 0.93, 20), strayLid, strayList);
    } else if (a.stray === 'opened' || a.stray === 'fallen') {
      const foods = [s.material('#f4f0e2'), s.material('#e0b23a'), s.material('#6f9a45'), s.material('#c9a66b')];
      const bowlGeo = new THREE.CylinderGeometry(R, R, 0.062, 20, 1, true);
      if (a.stray === 'opened') {
        // A cloth, the tiers in a row and the lid upturned as a plate.
        s.box([0.62, 0.006, 0.3], [sx, 0.003, sz], s.material(mood.cheer > 0.5 ? '#c9463a' : '#7a6a58', { roughness: 1 }));
        for (let t = 0; t < 4; t++) {
          const bx = sx - 0.22 + t * 0.148, bz = sz + rnd(-0.03, 0.03);
          const bowl = s.mesh(bowlGeo.clone(), steel, [bx, 0.037, bz]);
          (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
          s.cylinder(R - 0.004, R - 0.004, t === 3 ? 0.03 : 0.045, [bx, t === 3 ? 0.022 : 0.03, bz], foods[t], 18);
        }
        s.cylinder(R + 0.004, R + 0.004, 0.012, [sx + 0.1, 0.012, sz + 0.2], steel, 20);
      } else {
        const fallen = s.cylinder(R, R, 0.2, [sx, R, sz], steel, 20);
        fallen.rotation.set(0, rnd(0, 3), Math.PI / 2);
        const d = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, fallen.rotation.y, 0));
        const bowl = s.mesh(bowlGeo.clone(), steel, [sx + d.x * 0.24, 0.031, sz + d.z * 0.24]);
        (bowl.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        const lid = s.cylinder(R + 0.004, R + 0.004, 0.012, [sx - d.x * 0.3 + 0.05, R * 0.72, sz - d.z * 0.3 + 0.1], steel, 20);
        lid.rotation.set(0.9, 1, 0.2);lid.updateMatrixWorld(true);lid.position.y-=new THREE.Box3().setFromObject(lid,true).min.y;
        const grains: { at: V3; size: number }[] = [];
        for (let i = 0; i < 60; i++) { const t = random() * Math.PI * 2, r = Math.sqrt(random()) * 0.2; grains.push({ at: [sx + d.x * 0.3 + Math.cos(t) * r, 0.006, sz + d.z * 0.3 + Math.sin(t) * r * 0.7], size: rnd(0.6, 1.3) }); }
        s.scatter(new THREE.SphereGeometry(0.012, 5, 4), foods[0], grains);
        s.cylinder(0.11, 0.13, 0.004, [sx + d.x * 0.36, 0.002, sz + d.z * 0.36], foods[1], 14);
      }
      bowlGeo.dispose();
    }

    instanced(new THREE.CylinderGeometry(R, R, 1, 20), steel, bodies);
    instanced(new THREE.TorusGeometry(R + 0.001, 0.0035, 5, 20), iron, grooves);
    instanced(new THREE.BoxGeometry(0.012, 1, 0.022), steel, clips);
    instanced(new THREE.TorusGeometry(0.03, 0.005, 5, 12, Math.PI), steel, loops);
    instanced(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 1, 18), alu, cans);
    instanced(new THREE.CylinderGeometry(R * 0.7, R + 0.006, 0.028, 18), alu, canLids);
    instanced(new THREE.TorusGeometry(R + 0.002, 0.004, 5, 14, Math.PI), iron, bails);
    instanced(new THREE.CylinderGeometry(R * 0.86, R + 0.008, 1, 8), cloth, bags);
    instanced(new THREE.TorusGeometry(0.045, 0.007, 5, 12, Math.PI), cloth, straps);
    lidLists.forEach((list, i) => instanced(new THREE.CircleGeometry(R * 0.93, 20), lidMaterials[i], list));

    // ---- cap, towel, rope, hooks -------------------------------------------
    const resting = tops.length ? tops.reduce((best, t) => (Math.abs(t.x) + Math.abs(t.z) < Math.abs(best.x) + Math.abs(best.z) ? t : best)) : { x: 0, z: 0, y: y0 };
    const perch = Math.max(...tops.filter((t) => Math.hypot(t.x - resting.x, t.z - resting.z) < 0.2).map((t) => t.y), y0);
    if (a.cap !== 'nothing') {
      const lens = new THREE.Shape();
      lens.moveTo(-0.18, 0); lens.quadraticCurveTo(0, 0.1, 0.18, 0); lens.quadraticCurveTo(0, -0.1, -0.18, 0);
      const capGeo = new THREE.ExtrudeGeometry(lens, { depth: 0.085, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
      capGeo.rotateX(-Math.PI / 2);
      const cap = s.mesh(capGeo, white, [resting.x + 0.03, perch + 0.012, resting.z]);
      cap.rotation.set(rnd(-0.06, 0.06), rnd(-0.7, 0.7), rnd(-0.06, 0.06));
      const crease = s.box([0.33, 0.004, 0.006], [resting.x + 0.03, perch + 0.108, resting.z], s.material('#cfccc0'));
      crease.rotation.y = cap.rotation.y;
      if (a.cap === 'cap-towel') {
        const towel = s.box([0.3, 0.035, 0.2], [resting.x - 0.36, perch + 0.02, resting.z + 0.02], s.material(mood.cheer > 0.5 ? '#d9534a' : '#8a5a50', { roughness: 1 }));
        towel.rotation.y = rnd(-0.4, 0.4);
        for (let i = 0; i < 4; i++) { const stripe = s.box([0.012, 0.037, 0.2], [resting.x - 0.47 + i * 0.075, perch + 0.02, resting.z + 0.02], white); stripe.rotation.y = towel.rotation.y; stripe.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0); }
      }
    }
    // Two iron S-hooks off the end rail, the kind that hang a load from a bicycle.
    const hx = L / 2 + 0.03;
    for (const z of [-0.14, 0.14]) {
      s.tube([[hx - 0.05, y0 + 0.2, z], [hx - 0.01, y0 + 0.245, z], [hx + 0.04, y0 + 0.2, z], [hx + 0.045, y0 + 0.06, z], [hx + 0.09, y0 + 0.0, z], [hx + 0.14, y0 + 0.05, z]], 0.008, iron);
      if (a.hooks) {
        const colour = pick(bagColours), by = y0 - 0.2;
        if (by > 0.14) {
          s.cylinder(0.075, 0.085, 0.26, [hx + 0.1, by, z], s.material(colour, { roughness: 0.95 }), 10);
          s.rod([hx + 0.1, by + 0.13, z], [hx + 0.095, y0 + 0.01, z], 0.006, iron);
        } else {
          // On the ground the bag slumps beside the hook instead of hanging.
          const bag = s.cylinder(0.075, 0.085, 0.26, [hx + 0.26, 0.13, z * 1.6], s.material(colour, { roughness: 0.95 }), 10);
          bag.rotation.z = rnd(-0.08, 0.08);bag.updateMatrixWorld(true);bag.position.y-=new THREE.Box3().setFromObject(bag,true).min.y;
          s.ring(0.045, 0.007, [hx + 0.26, 0.27, z * 1.6], iron, Math.PI);
        }
      }
    }
    if (mood.density > 0.4) {
      // A coil of lashing rope on the end board.
      for (let i = 0; i < 4; i++) s.ring(0.09 - i * 0.006, 0.012, [-L / 2 - 0.16, y0 + 0.045 + i * 0.02, 0.02], rope).rotation.x = Math.PI / 2;
    }
    if (mood.density > 0.7 && want > 18) {
      // Lashings over a full load.
      for (const x of [-0.5, 0.5]) s.tube([[x, y0 + 0.19, -Wd / 2 - 0.01], [x, y0 + 0.31, -0.15], [x + 0.01, y0 + 0.32, 0.15], [x, y0 + 0.19, Wd / 2 + 0.01]], 0.007, rope);
    }

    if(a.sideSlats==='third')for(const z of[-1,1])s.box([L,.025,.018],[0,y0+.12,z*Wd/2],wood);
    else if(a.sideSlats==='diagonal')for(const z of[-1,1])for(const sign of[-1,1])s.rod([-L/2,y0+(sign>0?.04:.2),z*Wd/2],[L/2,y0+(sign>0?.2:.04),z*Wd/2],.01,darkWood);
    else if(a.sideSlats==='mesh')for(const z of[-1,1]){for(let i=0;i<18;i++)s.rod([-L/2+i*L/17,y0+.04,z*Wd/2],[-L/2+i*L/17,y0+.2,z*Wd/2],.003,iron);for(const y of[.08,.12,.16])s.rod([-L/2,y0+y,z*Wd/2],[L/2,y0+y,z*Wd/2],.003,iron);}
    if(a.carryingGrip!=='bare')for(const side of[-1,1])for(const z of[-1,1]){
      const x=side*(L/2+.13),zz=z*(Wd/2+.03),mat=a.carryingGrip==='rope'?rope:a.carryingGrip==='rubber'?s.material('#252b29'):s.material('#b74036');
      if(a.carryingGrip==='rope')for(let i=0;i<10;i++)s.ring(.026,.004,[x-.08+i*.018,y0+.01,zz],mat).rotation.y=Math.PI/2;
      else s.cylinder(.031,.031,.19,[x,y0+.01,zz],mat,12).rotation.z=Math.PI/2;
    }
    if(a.cornerGuards!=='plain')for(const side of[-1,1])for(const z of[-1,1]){
      const mat=a.cornerGuards==='brass'?s.material('#b79a58',{metalness:.6}):iron,x=side*(L/2-.025),zz=z*(Wd/2+.013);
      s.box([.05,.21,.014],[x,y0+.105,zz],mat);if(a.cornerGuards==='bolts')for(const y of[.04,.17])s.ball([.01,.01,.007],[x,y0+y,zz+z*.012],steel,6);
    }
    if(a.routingTag!=='none'){
      const count=a.routingTag==='numbers'?2:1,w=a.routingTag==='numbers'?.14:.3;
      for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.19;const plate=s.label(a.routingTag==='slate'?'B  12':a.routingTag==='card'?'CHURCHGATE':i?'17':'B',w,.13,[x,y0+.1,Wd/2+.03],a.routingTag==='slate'?'#e6e0c9':'#333d32',a.routingTag==='slate'?'#344c43':'#e6dcba');for(const dx of[-w*.3,w*.3])s.rod([x+dx,y0+.19,Wd/2],[x+dx,y0+.16,Wd/2+.03],.003,rope);void plate;}
    }
    if(a.sortingKit!=='none'){
      const x=-1.12,z=.72,h=a.sortingKit==='chalk'?.12:.06;s.box([.36,h,.27],[x,h/2,z],wood);
      if(a.sortingKit==='chalk'){s.box([.17,.035,.12],[x,h+.0175,z],darkWood);for(let i=0;i<5;i++)s.box([.012,.012,.09],[x-.06+i*.028,h+.041,z],white);s.box([.12,.015,.11],[x+.1,h+.0075,z+.08],s.material('#918572'));}
      else if(a.sortingKit==='ledger'){s.box([.25,.028,.2],[x,h+.014,z],s.material('#526851'));s.box([.22,.018,.19],[x,h+.014,z+.006],s.material('#d9ceb1'));s.rod([x-.11,h+.033,z-.07],[x+.1,h+.033,z+.07],.004,s.material('#c39b37'));}
      else{s.cylinder(.055,.055,.08,[x-.07,h+.04,z],rope,16);for(const dz of[-.07,.07])s.box([.1,.023,.06],[x+.08,h+.0115,z+dz],s.material('#5b5340'));}
    }

    const thing = s.finish();
    return { ...thing, dispose: () => { thing.dispose(); for (const t of lidTextures) t.dispose(); steel.dispose(); alu.dispose(); cloth.dispose(); strayLid.dispose(); for (const m of lidMaterials) m.dispose(); } };
  },
});
